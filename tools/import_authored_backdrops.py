#!/usr/bin/env python3
"""Freeze reviewed ImageGen scenic plates as exact runtime backdrops.

This is a one-way development import: each complete painted plate is resized
once as a whole image to the runtime viewport contract.  It never slices,
composites, redraws, or derives scenery geometry.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOT = ROOT / "assets/sprites_src/gameplay_art_authored/backdrops"
OUT_ROOT = ROOT / "assets/sprites_src/gameplay_art/world/backdrops"
REPORT = SOURCE_ROOT / "import_v1.json"
THEMES = (
    "snowwild", "desert", "hellwild", "marsh",
    "forest", "fields", "dungeon", "default",
)
SOURCE_SIZE = (1672, 941)
OUTPUT_SIZE = (1920, 1080)


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write", action="store_true", help="Write canonical PNGs and the import report.")
    args = parser.parse_args()

    outputs: dict[str, dict] = {}
    for theme in THEMES:
        source = SOURCE_ROOT / f"{theme}_raw_v1.png"
        if not source.is_file():
            raise RuntimeError(f"missing reviewed scenic plate: {source.relative_to(ROOT).as_posix()}")
        with Image.open(source) as opened:
            if opened.size != SOURCE_SIZE:
                raise RuntimeError(
                    f"{theme} source changed dimensions: {opened.size}, expected {SOURCE_SIZE}"
                )
            painted = opened.convert("RGBA")
        final = painted.resize(OUTPUT_SIZE, Image.Resampling.LANCZOS)
        if final.getchannel("A").getextrema() != (255, 255):
            raise RuntimeError(f"{theme} scenic plate must remain fully opaque")

        output = OUT_ROOT / f"{theme}.png"
        metadata = {
            "source": source.relative_to(ROOT).as_posix(),
            "sourceSha256": digest(source),
            "sourceSize": list(SOURCE_SIZE),
            "path": output.relative_to(ROOT).as_posix(),
            "size": list(OUTPUT_SIZE),
            "resampling": "LANCZOS",
        }
        if args.write:
            output.parent.mkdir(parents=True, exist_ok=True)
            final.save(output, format="PNG", compress_level=7)
            metadata["sha256"] = digest(output)
        outputs[theme] = metadata

    report = {
        "version": 1,
        "sourceKind": "imagegen-authored-scenic-plates",
        "review": "visual-contact-sheet-v1",
        "operation": "whole-image-resize-v1",
        "outputSize": list(OUTPUT_SIZE),
        "outputs": outputs,
    }
    if args.write:
        REPORT.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
