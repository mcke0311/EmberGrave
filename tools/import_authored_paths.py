#!/usr/bin/env python3
"""Freeze reviewed ImageGen path-adjacency boards as final runtime atlases.

The authoring source is a fixed 4x4 board.  This importer slices the exact
nominal panels and applies one shared resize to every cell; it never infers,
moves, rotates, or repairs individual path frames.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOT = ROOT / "assets/sprites_src/gameplay_art_authored/paths"
OUT_ROOT = ROOT / "assets/sprites_src/gameplay_art/world/paths"
REPORT = SOURCE_ROOT / "import_v1.json"
SOURCE_SIZE = (1254, 1254)
CELL = (64, 32)
ATLAS = (256, 128)
VISIBLE_ALPHA = 8

THEMES = (
    "town", "fields", "crypt", "vigil", "chapel", "forest", "monastery",
    "snowwild", "icecave", "mine", "temple", "marsh", "drowned", "desert",
    "tombs", "palace", "cathedral", "hellwild", "bastion", "throne",
)

# Several zones intentionally share a painted path material.  Every runtime
# theme still gets its own checked-in sprite atlas and descriptor.
MATERIALS = {
    "town": "cobblestone",
    "fields": "earth",
    "crypt": "cryptstone",
    "vigil": "cobblestone",
    "chapel": "cobblestone",
    "forest": "earth",
    "monastery": "cobblestone",
    "snowwild": "ice",
    "icecave": "ice",
    "mine": "cryptstone",
    "temple": "sandstone",
    "marsh": "earth",
    "drowned": "cryptstone",
    "desert": "sandstone",
    "tombs": "sandstone",
    "palace": "cobblestone",
    "cathedral": "cobblestone",
    "hellwild": "hellstone",
    "bastion": "hellstone",
    "throne": "hellstone",
}

SOCKETS = {1: (48, 8), 2: (48, 24), 4: (16, 24), 8: (16, 8)}
RECIPROCAL = {1: 4, 2: 8, 4: 1, 8: 2}


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def panel_bounds(col: int, row: int) -> tuple[int, int, int, int]:
    x0 = round(col * SOURCE_SIZE[0] / 4)
    y0 = round(row * SOURCE_SIZE[1] / 4)
    x1 = round((col + 1) * SOURCE_SIZE[0] / 4)
    y1 = round((row + 1) * SOURCE_SIZE[1] / 4)
    return x0, y0, x1, y1


def _socket_window(alpha: Image.Image, point: tuple[int, int]) -> list[list[bool]]:
    x, y = point
    return [
        [alpha.getpixel((x + dx, y + dy)) > VISIBLE_ALPHA for dx in range(-2, 3)]
        for dy in range(-2, 3)
    ]


def validate_atlas(atlas: Image.Image, label: str) -> list[list[int]]:
    bboxes: list[list[int]] = []
    alpha = atlas.getchannel("A")
    for mask in range(16):
        col, row = mask % 4, mask // 4
        frame = alpha.crop((col * 64, row * 32, (col + 1) * 64, (row + 1) * 32))
        bbox = frame.point(lambda value: 255 if value > VISIBLE_ALPHA else 0).getbbox()
        if not bbox:
            raise RuntimeError(f"{label} frame {mask} is empty")
        if frame.getpixel((32, 16)) <= VISIBLE_ALPHA:
            raise RuntimeError(f"{label} frame {mask} misses its center")
        for bit, point in SOCKETS.items():
            window = _socket_window(frame, point)
            if mask & bit:
                actual = any(value for row_values in window for value in row_values)
            else:
                # An absent arm must leave its exact shared-edge socket clear.
                actual = frame.getpixel(point) > VISIBLE_ALPHA
            if actual != bool(mask & bit):
                raise RuntimeError(
                    f"{label} frame {mask} socket {bit} is {actual}, expected {bool(mask & bit)}"
                )
        bboxes.append(list(bbox))

    frames = [
        alpha.crop(((mask % 4) * 64, (mask // 4) * 32,
                    (mask % 4 + 1) * 64, (mask // 4 + 1) * 32))
        for mask in range(16)
    ]
    for bit, point in SOCKETS.items():
        reciprocal = RECIPROCAL[bit]
        other_point = SOCKETS[reciprocal]
        other = frames[reciprocal]
        other_window = _socket_window(other, other_point)
        for mask, frame in enumerate(frames):
            if not mask & bit:
                continue
            window = _socket_window(frame, point)
            if not any(window[y][x] and other_window[y][x] for y in range(5) for x in range(5)):
                raise RuntimeError(
                    f"{label} frame {mask} socket {bit} has no reciprocal 5x5 seam overlap"
                )
    return bboxes


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write", action="store_true")
    args = parser.parse_args()

    material_atlases: dict[str, Image.Image] = {}
    material_meta: dict[str, dict] = {}
    for material in sorted(set(MATERIALS.values())):
        chroma = SOURCE_ROOT / f"{material}_adjacency_chroma_v1.png"
        alpha_path = SOURCE_ROOT / f"{material}_adjacency_alpha_v1.png"
        chroma = SOURCE_ROOT / f"{material}_iso_midpoint_chroma_v1.png"
        alpha_path = SOURCE_ROOT / f"{material}_iso_midpoint_alpha_v1.png"
        if not chroma.is_file() or not alpha_path.is_file():
            raise RuntimeError(f"missing reviewed {material} chroma/alpha source pair")
        with Image.open(alpha_path) as opened:
            if opened.format != "PNG" or opened.mode != "RGBA" or opened.size != SOURCE_SIZE:
                raise RuntimeError(f"{alpha_path.relative_to(ROOT)} must be RGBA PNG {SOURCE_SIZE}")
            source = opened.copy()
        atlas = Image.new("RGBA", ATLAS)
        source_boxes: list[list[int]] = []
        for index in range(16):
            bounds = panel_bounds(index % 4, index // 4)
            source_boxes.append(list(bounds))
            frame = source.crop(bounds).resize(CELL, Image.Resampling.LANCZOS)
            atlas.alpha_composite(frame, ((index % 4) * 64, (index // 4) * 32))
        bboxes = validate_atlas(atlas, material)
        material_atlases[material] = atlas
        material_meta[material] = {
            "chromaSource": chroma.relative_to(ROOT).as_posix(),
            "chromaSha256": digest(chroma),
            "alphaSource": alpha_path.relative_to(ROOT).as_posix(),
            "alphaSha256": digest(alpha_path),
            "sourcePanelBounds": source_boxes,
            "frameAlphaBBoxes": bboxes,
        }

    outputs: dict[str, dict] = {}
    for theme in THEMES:
        material = MATERIALS[theme]
        output = OUT_ROOT / f"{theme}.png"
        if args.write:
            output.parent.mkdir(parents=True, exist_ok=True)
            material_atlases[material].save(output, format="PNG", compress_level=7)
        outputs[theme] = {
            "material": material,
            "path": output.relative_to(ROOT).as_posix(),
            "sha256": digest(output) if args.write else None,
        }

    report = {
        "version": 1,
        "sourceKind": "imagegen-authored-path-adjacency",
        "review": "visual-contact-sheet-v1",
        "operation": "fixed-nominal-panel-slice-and-shared-resize-v2",
        "sourceSize": list(SOURCE_SIZE),
        "socketSemantics": {
            "N": list(SOCKETS[1]), "E": list(SOCKETS[2]),
            "S": list(SOCKETS[4]), "W": list(SOCKETS[8]),
            "windowRadius": 2,
        },
        "cell": list(CELL),
        "atlas": list(ATLAS),
        "materials": material_meta,
        "outputs": outputs,
    }
    if args.write:
        REPORT.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
