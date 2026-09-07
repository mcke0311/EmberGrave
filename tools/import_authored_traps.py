#!/usr/bin/env python3
"""Slice the reviewed ImageGen trap board into fixed runtime source sprites.

This is an explicit art-import step, not a runtime or compiler fallback.  The
three painted objects are scaled once as whole objects; no geometry is drawn,
rotated, warped, or synthesized here.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets/sprites_src/gameplay_art_authored/traps/traps_alpha_v1.png"
CHROMA = ROOT / "assets/sprites_src/gameplay_art_authored/traps/traps_chroma_v1.png"
OUT_ROOT = ROOT / "assets/sprites_src/gameplay_art/world/traps"
REPORT = ROOT / "assets/sprites_src/gameplay_art_authored/traps/import_v1.json"
KINDS = ("barbed", "frost", "powder")
CELL = (32, 24)
TARGET_MAX = (30, 20)
VISIBLE_ALPHA = 8


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write", action="store_true", help="Write the three canonical PNGs and import report.")
    args = parser.parse_args()

    with Image.open(SOURCE) as opened:
        source = opened.convert("RGBA")
    if source.size != (1717, 916):
        raise RuntimeError(f"reviewed trap board changed dimensions: {source.size}, expected (1717, 916)")

    outputs: dict[str, dict] = {}
    for column, kind in enumerate(KINDS):
        x0 = column * source.width // 3
        x1 = (column + 1) * source.width // 3
        panel = source.crop((x0, 0, x1, source.height))
        alpha = panel.getchannel("A").point(lambda value: 255 if value > VISIBLE_ALPHA else 0)
        bbox = alpha.getbbox()
        if not bbox:
            raise RuntimeError(f"trap panel {kind} is empty")
        painted = panel.crop(bbox)
        scale = min(TARGET_MAX[0] / painted.width, TARGET_MAX[1] / painted.height)
        size = (max(1, round(painted.width * scale)), max(1, round(painted.height * scale)))
        painted = painted.resize(size, Image.Resampling.LANCZOS)
        cell = Image.new("RGBA", CELL, (0, 0, 0, 0))
        position = ((CELL[0] - size[0]) // 2, 22 - size[1])
        cell.alpha_composite(painted, position)
        final_bbox = cell.getchannel("A").point(lambda value: 255 if value > VISIBLE_ALPHA else 0).getbbox()
        if not final_bbox or final_bbox[0] <= 0 or final_bbox[2] >= CELL[0] or final_bbox[1] <= 0 or final_bbox[3] >= CELL[1]:
            raise RuntimeError(f"trap {kind} lacks transparent padding: {final_bbox}")

        output = OUT_ROOT / f"{kind}.png"
        outputs[kind] = {
            "path": output.relative_to(ROOT).as_posix(),
            "sourcePanel": column,
            "sourceBBox": list(bbox),
            "uniformScale": round(scale, 8),
            "size": list(size),
            "position": list(position),
            "alphaBBox": list(final_bbox),
        }
        if args.write:
            output.parent.mkdir(parents=True, exist_ok=True)
            cell.save(output, format="PNG")
            outputs[kind]["sha256"] = digest(output)

    report = {
        "version": 1,
        "sourceKind": "imagegen-authored-chroma-board",
        "review": "visual-contact-sheet-v1",
        "operation": "whole-object-slice-and-uniform-scale",
        "chromaSource": CHROMA.relative_to(ROOT).as_posix(),
        "chromaSha256": digest(CHROMA),
        "alphaSource": SOURCE.relative_to(ROOT).as_posix(),
        "alphaSha256": digest(SOURCE),
        "cell": list(CELL),
        "anchor": [16, 18],
        "outputs": outputs,
    }
    if args.write:
        REPORT.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
