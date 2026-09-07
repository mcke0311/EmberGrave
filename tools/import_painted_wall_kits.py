#!/usr/bin/env python3
"""Author 16-frame wall atlases from the documented two-image painted kits.

This is a one-time development authoring/import step.  It may alpha-clean,
uniformly normalize, mask, and composite the checked-in painted originals under
``assets/world/walls``.  Runtime packing remains pixel-pass-through only.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

import build_sprite_assets as build


ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOT = ROOT / "assets" / "world" / "walls"
AUTHOR_ROOT = build.SRC / "gameplay_art_authored" / "walls"
OUTPUT_ROOT = build.GAMEPLAY_ART_ROOT / "world" / "walls"
REPORT = AUTHOR_ROOT / "import_v1.json"
QA_ROOT = build.GAMEPLAY_ART_ROOT / "qa" / "walls"
QA_MASTER = build.GAMEPLAY_ART_ROOT / "qa" / "wall_painted_sources_v1.png"
SOCKETS = {1: (64, 96), 2: (95, 112), 4: (64, 127), 8: (32, 112)}
DIRECTION_LABELS = ("isolated", "N", "E", "NE", "S", "NS", "ES", "NES",
                    "W", "NW", "EW", "NEW", "SW", "NSW", "ESW", "NESW")


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def relative(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def trim_visible(image: Image.Image) -> Image.Image:
    alpha = image.getchannel("A")
    bounds = alpha.point(lambda value: 255 if value > 8 else 0).getbbox()
    if bounds is None:
        raise RuntimeError("painted wall source contains no visible alpha")
    return image.crop(bounds)


def uniform_fit(image: Image.Image, max_size: tuple[int, int]) -> Image.Image:
    scale = min(max_size[0] / image.width, max_size[1] / image.height)
    size = (max(1, round(image.width * scale)), max(1, round(image.height * scale)))
    return image.resize(size, Image.Resampling.LANCZOS)


def painted_texture(image: Image.Image) -> Image.Image:
    """Normalize painted pixels for directional masks, without synthesizing color."""
    cropped = trim_visible(image)
    return cropped.resize((128, 88), Image.Resampling.LANCZOS)


def center_pillar(image: Image.Image) -> Image.Image:
    """Crop the painted cell's central post without distorting its proportions."""
    cropped = trim_visible(image)
    crop_width = min(cropped.width, max(1, round(cropped.height * 0.52)))
    x0 = (cropped.width - crop_width) // 2
    pillar = cropped.crop((x0, 0, x0 + crop_width, cropped.height))
    return uniform_fit(pillar, (48, 88))


def branch_mask(bit: int) -> Image.Image:
    mask = Image.new("L", (128, 128), 0)
    draw = ImageDraw.Draw(mask)
    polygons = {
        # Each authored face meets the shared [64,112] root and its exact
        # isometric footprint socket.  The cell painting covers the join.
        1: [(28, 72), (64, 40), (100, 72), (76, 101), (64, 114), (52, 101)],
        2: [(58, 44), (76, 51), (105, 88), (102, 113), (95, 120), (60, 103)],
        4: [(45, 69), (64, 51), (83, 69), (78, 113), (64, 128), (50, 113)],
        8: [(70, 44), (52, 51), (23, 88), (26, 113), (33, 120), (68, 103)],
    }
    draw.polygon(polygons[bit], fill=255)
    return mask


def paste_masked(target: Image.Image, texture: Image.Image, mask: Image.Image) -> None:
    layer = Image.new("RGBA", target.size, (0, 0, 0, 0))
    layer.paste(texture, (0, 40), mask.crop((0, 40, 128, 128)))
    target.alpha_composite(layer)


def source_patch(texture: Image.Image, center: tuple[int, int], radius: int = 2) -> Image.Image:
    """Copy painted pixels into a tiny socket patch; never manufacture color."""
    x, y = center
    sample_x = max(0, min(texture.width - 1, x))
    sample_y = max(0, min(texture.height - 1, y - 40))
    color = texture.getpixel((sample_x, sample_y))
    if color[3] <= 8:
        # Find the nearest visible painted pixel deterministically.
        candidates = [
            (abs(px - sample_x) + abs(py - sample_y), texture.getpixel((px, py)))
            for py in range(texture.height) for px in range(texture.width)
            if texture.getpixel((px, py))[3] > 8
        ]
        if not candidates:
            raise RuntimeError("normalized wall texture contains no visible pixels")
        color = min(candidates, key=lambda item: item[0])[1]
    patch = Image.new("RGBA", (radius * 2 + 1, radius * 2 + 1), color)
    return patch


def build_frame(mask_value: int, wall_source: Image.Image, cell_source: Image.Image) -> Image.Image:
    wall_texture = painted_texture(wall_source)
    cell_texture = painted_texture(cell_source)
    frame = Image.new("RGBA", (128, 128), (0, 0, 0, 0))

    # Rear faces first, then the authored corner/cell mass, then foreground
    # faces. This is a frozen authoring-plane decision, not runtime guessing.
    for bit in (1, 8):
        if mask_value & bit:
            paste_masked(frame, wall_texture if bit == 8 else cell_texture, branch_mask(bit))

    cell = center_pillar(cell_source)
    cell_x = 64 - cell.width // 2
    frame.alpha_composite(cell, (cell_x, 128 - cell.height))

    for bit in (2, 4):
        if mask_value & bit:
            paste_masked(frame, wall_texture if bit == 2 else cell_texture, branch_mask(bit))

    # The precise socket pixels are part of the authored adjacency contract.
    # Clear absent endpoints and restore present endpoints from painted pixels.
    for bit, (x, y) in SOCKETS.items():
        if mask_value & bit:
            patch = source_patch(wall_texture if bit in (2, 8) else cell_texture, (x, y))
            frame.alpha_composite(patch, (x - 2, y - 2))
        else:
            for py in range(max(0, y - 2), min(128, y + 3)):
                for px in range(max(0, x - 2), min(128, x + 3)):
                    frame.putpixel((px, py), (0, 0, 0, 0))
    return frame


def validate_atlas(theme: str, atlas: Image.Image) -> list[dict]:
    frames: list[dict] = []
    seen_hashes: set[str] = set()
    for index in range(16):
        x0, y0 = (index % 4) * 128, (index // 4) * 128
        frame = atlas.crop((x0, y0, x0 + 128, y0 + 128))
        alpha = frame.getchannel("A")
        visible = [(x, y) for y in range(128) for x in range(128) if alpha.getpixel((x, y)) > 8]
        if not visible:
            raise RuntimeError(f"{theme} wall frame {index} is empty")
        top = min(y for _x, y in visible)
        if not 38 <= top <= 42:
            raise RuntimeError(f"{theme} wall frame {index} top {top} violates 72px rise")
        if alpha.crop((32, 96, 96, 128)).getbbox() is None:
            raise RuntimeError(f"{theme} wall frame {index} misses its 64x32 footprint")
        if alpha.getpixel((64, 112)) <= 8:
            raise RuntimeError(f"{theme} wall frame {index} misses its center socket")
        for bit, point in SOCKETS.items():
            actual = alpha.getpixel(point) > 8
            if actual != bool(index & bit):
                raise RuntimeError(f"{theme} wall frame {index} has wrong bit {bit} socket {point}")
        frame_hash = hashlib.sha256(frame.tobytes()).hexdigest()
        if frame_hash in seen_hashes:
            raise RuntimeError(f"{theme} wall frame {index} duplicates another adjacency frame")
        seen_hashes.add(frame_hash)
        bbox = alpha.getbbox()
        frames.append({"index": index, "label": DIRECTION_LABELS[index], "alphaBBox": list(bbox), "top": top})
    return frames


def build_atlas(theme: str) -> tuple[Image.Image, list[dict], Path, Path]:
    wall_path = SOURCE_ROOT / f"{theme}.webp"
    cell_path = SOURCE_ROOT / f"{theme}-cell.webp"
    if not wall_path.is_file() or not cell_path.is_file():
        raise RuntimeError(f"missing documented painted wall kit for {theme}")
    with Image.open(wall_path) as opened:
        wall = opened.convert("RGBA")
    with Image.open(cell_path) as opened:
        cell = opened.convert("RGBA")
    atlas = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
    for index in range(16):
        atlas.alpha_composite(build_frame(index, wall, cell), ((index % 4) * 128, (index // 4) * 128))
    return atlas, validate_atlas(theme, atlas), wall_path, cell_path


def qa_sheet(theme: str, atlas: Image.Image, output: Path) -> None:
    scale = 1
    label_h = 24
    sheet = Image.new("RGBA", (4 * 128 * scale, 4 * (128 * scale + label_h)), (14, 12, 11, 255))
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()
    for index in range(16):
        x, row = (index % 4) * 128, index // 4
        y = row * (128 + label_h)
        sheet.alpha_composite(atlas.crop(((index % 4) * 128, row * 128,
                                          (index % 4 + 1) * 128, (row + 1) * 128)), (x, y))
        draw.text((x + 4, y + 130), f"{index:02d} {DIRECTION_LABELS[index]}", fill=(235, 226, 205, 255), font=font)
    output.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output, "PNG", compress_level=7)


def master_sheet(theme_atlases: list[tuple[str, Image.Image]], output: Path) -> None:
    thumb = 256
    label_h = 24
    cols = 3
    rows = (len(theme_atlases) + cols - 1) // cols
    sheet = Image.new("RGBA", (cols * thumb, rows * (thumb + label_h)), (14, 12, 11, 255))
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()
    for index, (theme, atlas) in enumerate(theme_atlases):
        x, y = (index % cols) * thumb, (index // cols) * (thumb + label_h)
        sheet.alpha_composite(atlas.resize((thumb, thumb), Image.Resampling.NEAREST), (x, y))
        draw.text((x + 4, y + thumb + 4), theme, fill=(235, 226, 205, 255), font=font)
    output.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output, "PNG", compress_level=7)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write", action="store_true", help="write canonical atlases, QA, and import report")
    parser.add_argument("--theme", choices=build.WALL_THEMES, help="limit development preview to one theme")
    args = parser.parse_args()
    themes = (args.theme,) if args.theme else build.WALL_THEMES
    records: dict[str, dict] = {}
    atlases: list[tuple[str, Image.Image]] = []
    for theme in themes:
        atlas, frames, wall_path, cell_path = build_atlas(theme)
        output = OUTPUT_ROOT / f"{theme}.png"
        qa_path = QA_ROOT / f"{theme}_wall_adjacency_v1.png"
        if args.write:
            output.parent.mkdir(parents=True, exist_ok=True)
            atlas.save(output, "PNG", compress_level=7)
            qa_sheet(theme, atlas, qa_path)
        records[theme] = {
            "wallSource": relative(wall_path), "wallSourceSha256": digest(wall_path),
            "cellSource": relative(cell_path), "cellSourceSha256": digest(cell_path),
            "path": relative(output), "sha256": digest(output) if output.is_file() and args.write else None,
            "qa": relative(qa_path), "frames": frames,
        }
        atlases.append((theme, atlas))
    if args.write and not args.theme:
        master_sheet(atlases, QA_MASTER)
        payload = {
            "version": 1,
            "sourceKind": "painted-two-source-wall-kits",
            "review": build.GAMEPLAY_ART_REVIEW,
            "operation": "painted-two-source-16-mask-composite-v1",
            "wallContract": build.WALL_CONTRACT,
            "masterQA": relative(QA_MASTER),
            "themes": records,
        }
        REPORT.parent.mkdir(parents=True, exist_ok=True)
        REPORT.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(f"{'Wrote' if args.write else 'Validated'} {len(themes)} painted wall kits")


if __name__ == "__main__":
    main()
