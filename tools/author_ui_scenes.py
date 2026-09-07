#!/usr/bin/env python3
"""Freeze existing painted UI scenes into checked-in RGBA sprite sources."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image

import build_sprite_assets as build


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "embergrave-title-bg.png"
OUTPUT = build.UI_SCENE_ROOT / "title_camp.png"


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write", action="store_true", help="write the canonical PNG and authorship JSON")
    args = parser.parse_args()
    if not SOURCE.is_file():
        raise RuntimeError(f"missing painted title scene: {SOURCE}")
    with Image.open(SOURCE) as opened:
        if opened.format != "PNG" or opened.size != (1672, 941) or opened.mode not in ("RGB", "RGBA"):
            raise RuntimeError(
                f"title scene must be PNG RGB/RGBA 1672x941, found {opened.format} {opened.mode} {opened.size}"
            )
        image = opened.convert("RGBA")
    if args.write:
        OUTPUT.parent.mkdir(parents=True, exist_ok=True)
        image.save(OUTPUT, "PNG", compress_level=7)
        descriptor = {
            "path": OUTPUT.relative_to(ROOT).as_posix(),
            "sha256": digest(OUTPUT),
            "source": SOURCE.relative_to(ROOT).as_posix(),
            "sourceSha256": digest(SOURCE),
            "method": "rgba-pass-through-v1",
            "parameters": {},
            "size": [1672, 941],
            "anchor": [0, 0],
            "bundle": "core",
            "assetId": "ui.scene.titleCamp",
        }
        payload = {
            "version": build.UI_SCENE_VERSION,
            "sourceKind": build.GAMEPLAY_ART_SOURCE_KIND,
            "review": build.GAMEPLAY_ART_REVIEW,
            "scenes": {"titleCamp": descriptor},
        }
        build.UI_SCENE_AUTHORSHIP.write_text(
            json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8",
        )
    elif not OUTPUT.is_file():
        raise RuntimeError(f"missing canonical UI scene; run {Path(__file__).name} --write")
    print(f"{'Wrote' if args.write else 'Validated'} titleCamp RGBA sprite source")


if __name__ == "__main__":
    main()
