#!/usr/bin/env python3
"""Freeze four reviewed Wildkeeper form paintings as runtime sprites."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOT = ROOT / "assets/sprites_src/gameplay_art_authored/forms"
OUT_ROOT = ROOT / "assets/sprites_src/gameplay_art/actors/forms"
REPORT = SOURCE_ROOT / "import_v1.json"
FORMS = ("form_fang", "form_brute", "form_stone", "form_apex")
SOURCE_SIZE = (1254, 1254)
OUTPUT_SIZE = (192, 192)
ANCHOR = (96, 178)
VISIBLE_ALPHA = 8
MAX_FIT = (184, 174)


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write", action="store_true", help="Write canonical PNGs and the import report.")
    args = parser.parse_args()

    outputs: dict[str, dict] = {}
    for form_id in FORMS:
        chroma = SOURCE_ROOT / f"{form_id}_chroma_v1.png"
        source = SOURCE_ROOT / f"{form_id}_alpha_v1.png"
        if not chroma.is_file() or not source.is_file():
            raise RuntimeError(f"missing reviewed {form_id} chroma/alpha source pair")
        with Image.open(source) as opened:
            if opened.format != "PNG" or opened.mode != "RGBA" or opened.size != SOURCE_SIZE:
                raise RuntimeError(f"{form_id} alpha source must be RGBA PNG {SOURCE_SIZE}")
            painted = opened.copy()
        alpha = painted.getchannel("A").point(lambda value: 255 if value > VISIBLE_ALPHA else 0)
        bbox = alpha.getbbox()
        if not bbox:
            raise RuntimeError(f"{form_id} has no visible subject")
        painted = painted.crop(bbox)
        scale = min(MAX_FIT[0] / painted.width, MAX_FIT[1] / painted.height)
        size = (max(1, round(painted.width * scale)), max(1, round(painted.height * scale)))
        painted = painted.resize(size, Image.Resampling.LANCZOS)
        cell = Image.new("RGBA", OUTPUT_SIZE)
        position = ((OUTPUT_SIZE[0] - size[0]) // 2, ANCHOR[1] - size[1])
        cell.alpha_composite(painted, position)
        final_bbox = cell.getchannel("A").point(lambda value: 255 if value > VISIBLE_ALPHA else 0).getbbox()
        if (not final_bbox or final_bbox[0] <= 0 or final_bbox[2] >= OUTPUT_SIZE[0] or
                final_bbox[1] <= 0 or final_bbox[3] >= OUTPUT_SIZE[1]):
            raise RuntimeError(f"{form_id} lacks transparent padding: {final_bbox}")
        output = OUT_ROOT / f"{form_id}.png"
        metadata = {
            "chromaSource": chroma.relative_to(ROOT).as_posix(),
            "chromaSha256": digest(chroma),
            "alphaSource": source.relative_to(ROOT).as_posix(),
            "alphaSha256": digest(source),
            "sourceBBox": list(bbox),
            "uniformScale": round(scale, 8),
            "size": list(size),
            "position": list(position),
            "alphaBBox": list(final_bbox),
            "path": output.relative_to(ROOT).as_posix(),
        }
        if args.write:
            output.parent.mkdir(parents=True, exist_ok=True)
            cell.save(output, format="PNG", compress_level=7)
            metadata["sha256"] = digest(output)
        outputs[form_id] = metadata

    report = {
        "version": 1,
        "sourceKind": "imagegen-authored-chroma-forms",
        "review": "visual-contact-sheet-v1",
        "operation": "whole-object-alpha-clean-and-uniform-scale-v1",
        "cell": list(OUTPUT_SIZE),
        "anchor": list(ANCHOR),
        "outputs": outputs,
    }
    if args.write:
        REPORT.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
