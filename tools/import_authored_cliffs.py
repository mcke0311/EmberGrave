#!/usr/bin/env python3
"""Import reviewed ImageGen cliff sheets into the canonical runtime atlases.

Each theme starts as one complete 4x2 painted sheet on a removable chroma
background.  Chroma removal is performed with the installed ImageGen helper
before this tool runs.  This importer then validates the whole reviewed sheet,
slices its eight cells, applies one shared scale to every complete painted
face, and packs those faces into the exact runtime layout.  It never draws,
masks, stretches, or repairs cliff geometry per frame.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

import build_sprite_assets as build


ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOT = build.SRC / "gameplay_art_authored" / "cliffs"
OUTPUT_ROOT = build.GAMEPLAY_ART_ROOT / "world" / "cliffs"
QA_ROOT = build.GAMEPLAY_ART_ROOT / "qa" / "cliffs"
QA_MASTER = build.GAMEPLAY_ART_ROOT / "qa" / "cliff_authored_sources_v1.png"
REPORT = SOURCE_ROOT / "import_v1.json"
PROMPTS = SOURCE_ROOT / "prompts_v1.json"

SOURCE_SIZE = (1254, 1254)
ATLAS_SIZE = (256, 256)
CELL_SIZE = (64, 128)
COLS = 4
ROWS = 2
ANCHOR = (32, 0)
FRAME_ORDER = (
    "southwest_1", "southwest_2", "southwest_3", "southwest_4",
    "southeast_1", "southeast_2", "southeast_3", "southeast_4",
)
ALPHA_THRESHOLD = 8
MIN_SOURCE_MARGIN = 12
TARGET_FACE_WIDTH = 32
MAX_ROW_PAIR_HEIGHT_DELTA = 6


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def relative(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def cell_bounds(width: int, height: int, index: int) -> tuple[int, int, int, int]:
    col, row = index % COLS, index // COLS
    x0 = round(col * width / COLS)
    x1 = round((col + 1) * width / COLS)
    y0 = round(row * height / ROWS)
    y1 = round((row + 1) * height / ROWS)
    return x0, y0, x1, y1


def visible_bbox(image: Image.Image) -> tuple[int, int, int, int] | None:
    return image.getchannel("A").point(
        lambda value: 255 if value > ALPHA_THRESHOLD else 0,
    ).getbbox()


def visible_component_ratio(image: Image.Image) -> float:
    """Return the share of visible pixels in the largest 8-connected component."""
    alpha = image.getchannel("A")
    width, height = image.size
    visible = bytearray(
        1 if value > ALPHA_THRESHOLD else 0 for value in alpha.get_flattened_data()
    )
    total = sum(visible)
    if not total:
        return 0.0
    largest = 0
    for seed in range(width * height):
        if not visible[seed]:
            continue
        visible[seed] = 0
        stack = [seed]
        count = 0
        while stack:
            current = stack.pop()
            count += 1
            x, y = current % width, current // width
            for ny in range(max(0, y - 1), min(height, y + 2)):
                for nx in range(max(0, x - 1), min(width, x + 2)):
                    neighbor = nx + ny * width
                    if visible[neighbor]:
                        visible[neighbor] = 0
                        stack.append(neighbor)
        largest = max(largest, count)
    return largest / total


def inspect_source(theme: str, alpha_source: Path) -> tuple[list[dict], list[Image.Image]]:
    with Image.open(alpha_source) as opened:
        if opened.format != "PNG" or opened.mode != "RGBA" or opened.size != SOURCE_SIZE:
            raise RuntimeError(
                f"{theme} alpha source must be exact RGBA PNG {SOURCE_SIZE[0]}x{SOURCE_SIZE[1]}"
            )
        source = opened.copy()
    alpha = source.getchannel("A")
    if alpha.getextrema() != (0, 255):
        raise RuntimeError(f"{theme} alpha source must contain both transparent and opaque pixels")
    corners = ((0, 0), (source.width - 1, 0), (0, source.height - 1),
               (source.width - 1, source.height - 1))
    if any(alpha.getpixel(point) != 0 for point in corners):
        raise RuntimeError(f"{theme} alpha source corners are not transparent")

    metrics: list[dict] = []
    cropped: list[Image.Image] = []
    widths: list[int] = []
    heights: list[int] = []
    for index, label in enumerate(FRAME_ORDER):
        bounds = cell_bounds(source.width, source.height, index)
        cell = source.crop(bounds)
        bbox = visible_bbox(cell)
        if bbox is None:
            raise RuntimeError(f"{theme} frame {index} ({label}) is empty")
        margins = [bbox[0], bbox[1], cell.width - bbox[2], cell.height - bbox[3]]
        if min(margins) < MIN_SOURCE_MARGIN:
            raise RuntimeError(
                f"{theme} frame {index} ({label}) approaches/crosses its cell boundary: {margins}"
            )
        face = cell.crop(bbox)
        component_ratio = visible_component_ratio(face)
        if component_ratio < 0.985:
            raise RuntimeError(
                f"{theme} frame {index} ({label}) is fragmented; largest component is "
                f"{component_ratio:.3%}"
            )
        key_like = sum(
            1 for red, green, blue, value in face.get_flattened_data()
            if value > ALPHA_THRESHOLD and red > 230 and blue > 230 and green < 50
        )
        if key_like:
            raise RuntimeError(f"{theme} frame {index} retains {key_like} visible magenta pixels")
        width, height = face.size
        widths.append(width)
        heights.append(height)
        cropped.append(face)
        metrics.append({
            "index": index, "label": label, "slice": list(bounds),
            "sourceCellSize": list(cell.size), "alphaBBox": list(bbox),
            "sourceMargins": margins, "paintedSize": [width, height],
            "largestComponentRatio": round(component_ratio, 6),
        })

    if max(widths) / min(widths) > 1.08:
        raise RuntimeError(f"{theme} face widths drift by more than 8%: {widths}")
    for row in range(ROWS):
        row_heights = heights[row * COLS:(row + 1) * COLS]
        if any(next_height <= height for height, next_height in zip(row_heights, row_heights[1:])):
            raise RuntimeError(f"{theme} row {row} does not increase strictly 1-4: {row_heights}")
        if row_heights[-1] < row_heights[0] * 2.35:
            raise RuntimeError(f"{theme} row {row} depth progression is too weak: {row_heights}")
    for depth in range(COLS):
        left, right = heights[depth], heights[COLS + depth]
        if abs(left - right) / max(left, right) > 0.14:
            raise RuntimeError(
                f"{theme} mirrored depth {depth + 1} differs by more than 14%: {left}, {right}"
            )
    return metrics, cropped


def canonical_atlas(theme: str, faces: list[Image.Image], metrics: list[dict]) -> tuple[Image.Image, float]:
    max_width = max(face.width for face in faces)
    scale = TARGET_FACE_WIDTH / max_width
    max_scaled_height = max(round(face.height * scale) for face in faces)
    if max_scaled_height > CELL_SIZE[1]:
        raise RuntimeError(
            f"{theme} shared width scale would exceed the canonical cell height: {max_scaled_height}"
        )
    atlas = Image.new("RGBA", ATLAS_SIZE, (0, 0, 0, 0))
    for index, face in enumerate(faces):
        size = (max(1, round(face.width * scale)), max(1, round(face.height * scale)))
        painted = face.resize(size, Image.Resampling.LANCZOS)
        # Both row directions meet at the exact [32,0] seam root.  Only whole
        # painted sprites move; no pixels are masked, warped, or redrawn.
        x = ANCHOR[0] - painted.width if index < COLS else ANCHOR[0]
        y = ANCHOR[1]
        if x < 0 or x + painted.width > CELL_SIZE[0] or y + painted.height > CELL_SIZE[1]:
            raise RuntimeError(f"{theme} frame {index} cannot fit the canonical cell at shared scale")
        cell_x = (index % COLS) * CELL_SIZE[0]
        cell_y = (index // COLS) * CELL_SIZE[1]
        atlas.alpha_composite(painted, (cell_x + x, cell_y + y))
        metrics[index]["canonicalPosition"] = [x, y]
        metrics[index]["canonicalPaintedSize"] = list(size)
    return atlas, scale


def validate_canonical(theme: str, atlas: Image.Image) -> list[list[int]]:
    if atlas.mode != "RGBA" or atlas.size != ATLAS_SIZE:
        raise RuntimeError(f"{theme} canonical atlas is not exact RGBA 256x256")
    bboxes: list[list[int]] = []
    heights: list[int] = []
    for index, label in enumerate(FRAME_ORDER):
        x0 = (index % COLS) * CELL_SIZE[0]
        y0 = (index // COLS) * CELL_SIZE[1]
        frame = atlas.crop((x0, y0, x0 + CELL_SIZE[0], y0 + CELL_SIZE[1]))
        bbox = visible_bbox(frame)
        if bbox is None:
            raise RuntimeError(f"{theme} canonical frame {index} ({label}) is empty")
        if bbox[1] > 1:
            raise RuntimeError(f"{theme} canonical frame {index} is not registered to anchor y=0: {bbox}")
        if index < COLS:
            if bbox[0] < 0 or bbox[2] > ANCHOR[0] + 1:
                raise RuntimeError(f"{theme} southwest frame {index} crosses the seam root: {bbox}")
        elif bbox[0] < ANCHOR[0] - 1 or bbox[2] > CELL_SIZE[0]:
            raise RuntimeError(f"{theme} southeast frame {index} crosses the seam root: {bbox}")
        bboxes.append(list(bbox))
        heights.append(bbox[3] - bbox[1])
    for row in range(ROWS):
        row_heights = heights[row * COLS:(row + 1) * COLS]
        if any(next_height <= height for height, next_height in zip(row_heights, row_heights[1:])):
            raise RuntimeError(f"{theme} canonical row {row} lost monotonic depth: {row_heights}")
    for depth in range(COLS):
        if abs(heights[depth] - heights[COLS + depth]) > MAX_ROW_PAIR_HEIGHT_DELTA:
            raise RuntimeError(
                f"{theme} canonical mirrored depth {depth + 1} differs by more than "
                f"{MAX_ROW_PAIR_HEIGHT_DELTA}px"
            )
    return bboxes


def qa_sheet(theme: str, atlas: Image.Image, output: Path) -> None:
    scale = 4
    label_height = 22
    sheet = Image.new(
        "RGBA", (COLS * CELL_SIZE[0] * scale, ROWS * (CELL_SIZE[1] * scale + label_height)),
        (17, 15, 14, 255),
    )
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()
    for index, label in enumerate(FRAME_ORDER):
        col, row = index % COLS, index // COLS
        source_box = (col * CELL_SIZE[0], row * CELL_SIZE[1],
                      (col + 1) * CELL_SIZE[0], (row + 1) * CELL_SIZE[1])
        frame = atlas.crop(source_box).resize(
            (CELL_SIZE[0] * scale, CELL_SIZE[1] * scale), Image.Resampling.NEAREST,
        )
        x = col * CELL_SIZE[0] * scale
        y = row * (CELL_SIZE[1] * scale + label_height)
        sheet.alpha_composite(frame, (x, y))
        draw.line((x + ANCHOR[0] * scale, y, x + ANCHOR[0] * scale, y + 12), fill=(255, 196, 70, 255), width=1)
        draw.text((x + 4, y + CELL_SIZE[1] * scale + 4), label, fill=(236, 226, 207, 255), font=font)
    output.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output, "PNG", compress_level=7)


def master_sheet(atlases: list[tuple[str, Image.Image]], output: Path) -> None:
    thumb = 256
    label_height = 22
    cols = 4
    rows = (len(atlases) + cols - 1) // cols
    sheet = Image.new("RGBA", (cols * thumb, rows * (thumb + label_height)), (17, 15, 14, 255))
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()
    for index, (theme, atlas) in enumerate(atlases):
        x = (index % cols) * thumb
        y = (index // cols) * (thumb + label_height)
        sheet.alpha_composite(atlas, (x, y))
        draw.text((x + 4, y + thumb + 4), theme, fill=(236, 226, 207, 255), font=font)
    output.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output, "PNG", compress_level=7)


def verify_prompt_manifest(themes: tuple[str, ...]) -> tuple[dict, str]:
    if not PROMPTS.is_file():
        raise RuntimeError(f"missing cliff prompt provenance: {relative(PROMPTS)}")
    prompts = json.loads(PROMPTS.read_text(encoding="utf-8"))
    if set(prompts) != {"version", "tool", "prototype", "themes"}:
        raise RuntimeError("cliff prompt provenance has unexpected keys")
    if prompts.get("version") != 1 or prompts.get("tool") != "built-in-imagegen":
        raise RuntimeError("cliff prompt provenance version/tool changed")
    records = prompts.get("themes")
    if not isinstance(records, dict):
        raise RuntimeError("cliff prompt provenance themes must be an object")
    for theme in themes:
        record = records.get(theme)
        if not isinstance(record, dict) or set(record) != {"prompt", "references"}:
            raise RuntimeError(f"cliff prompt provenance is missing {theme}")
        if not isinstance(record["prompt"], str) or not record["prompt"].strip():
            raise RuntimeError(f"cliff prompt provenance has no final prompt for {theme}")
        if not isinstance(record["references"], list) or not record["references"]:
            raise RuntimeError(f"cliff prompt provenance has no references for {theme}")
        for reference in record["references"]:
            path = ROOT / reference
            if not path.is_file():
                raise RuntimeError(f"cliff prompt reference is missing for {theme}: {reference}")
    return prompts, digest(PROMPTS)


def import_theme(theme: str, *, write: bool) -> tuple[dict, Image.Image]:
    raw_source = SOURCE_ROOT / f"{theme}_raw_v1.png"
    alpha_source = SOURCE_ROOT / f"{theme}_alpha_v1.png"
    if not raw_source.is_file() or not alpha_source.is_file():
        raise RuntimeError(f"missing reviewed raw/alpha cliff sheet for {theme}")
    with Image.open(raw_source) as opened:
        if opened.format != "PNG" or opened.size != SOURCE_SIZE or opened.mode not in ("RGB", "RGBA"):
            raise RuntimeError(f"{theme} raw source must be PNG {SOURCE_SIZE[0]}x{SOURCE_SIZE[1]}")
        raw = opened.convert("RGB")
    corners = (raw.getpixel((0, 0)), raw.getpixel((raw.width - 1, 0)),
               raw.getpixel((0, raw.height - 1)), raw.getpixel((raw.width - 1, raw.height - 1)))
    # ImageGen's flat magenta is mildly color-managed/compressed across edits;
    # validate the chroma family the removal helper actually keys, not one
    # literal RGB triplet.  Every corner must still be saturated magenta with
    # closely paired red/blue channels and a clearly suppressed green channel.
    if any(
        red < 205 or blue < 205 or green > 80
        or abs(red - blue) > 28
        or min(red, blue) - green < 150
        for red, green, blue in corners
    ):
        raise RuntimeError(f"{theme} raw source does not retain a flat magenta chroma border")

    frames, faces = inspect_source(theme, alpha_source)
    atlas, scale = canonical_atlas(theme, faces, frames)
    canonical_bboxes = validate_canonical(theme, atlas)
    output = OUTPUT_ROOT / f"{theme}.png"
    qa = QA_ROOT / f"{theme}_cliff_faces_v1.png"
    if write:
        output.parent.mkdir(parents=True, exist_ok=True)
        atlas.save(output, "PNG", compress_level=7)
        qa_sheet(theme, atlas, qa)
    record = {
        "rawSource": relative(raw_source), "rawSourceSha256": digest(raw_source),
        "alphaSource": relative(alpha_source), "alphaSourceSha256": digest(alpha_source),
        "alphaClean": {
            "tool": "imagegen/remove_chroma_key.py", "autoKey": "border",
            "softMatte": True, "transparentThreshold": 12,
            "opaqueThreshold": 220, "despill": True,
        },
        "sourceSize": list(SOURCE_SIZE), "path": relative(output),
        "sha256": digest(output) if output.is_file() and write else None,
        "qa": relative(qa), "uniformScale": scale,
        "canonicalSize": list(ATLAS_SIZE), "cell": list(CELL_SIZE),
        "cols": COLS, "rows": ROWS, "anchor": list(ANCHOR),
        "frameOrder": list(FRAME_ORDER), "frames": frames,
        "canonicalAlphaBBoxes": canonical_bboxes,
    }
    return record, atlas


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write", action="store_true", help="write canonical PNGs, QA, and full report")
    parser.add_argument("--theme", choices=build.THEMES, help="limit validation/import to one prototype theme")
    args = parser.parse_args()
    themes = (args.theme,) if args.theme else build.THEMES
    _prompts, prompt_hash = verify_prompt_manifest(themes)
    records: dict[str, dict] = {}
    atlases: list[tuple[str, Image.Image]] = []
    for theme in themes:
        record, atlas = import_theme(theme, write=args.write)
        records[theme] = record
        atlases.append((theme, atlas))

    if args.write and not args.theme:
        master_sheet(atlases, QA_MASTER)
        payload = {
            "version": 1, "sourceKind": "imagegen-authored-cliff-sheets",
            "review": build.GAMEPLAY_ART_REVIEW,
            "operation": "alpha-clean-slice-shared-uniform-resize-v1",
            "contract": {
                "size": list(ATLAS_SIZE), "cell": list(CELL_SIZE),
                "cols": COLS, "rows": ROWS, "anchor": list(ANCHOR),
                "frames": len(FRAME_ORDER), "frameOrder": list(FRAME_ORDER),
            },
            "promptManifest": relative(PROMPTS), "promptManifestSha256": prompt_hash,
            "masterQA": relative(QA_MASTER), "themes": records,
        }
        REPORT.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(f"{'Wrote' if args.write else 'Validated'} {len(themes)} authored cliff sheet(s)")


if __name__ == "__main__":
    main()
