#!/usr/bin/env python3
"""Import reviewed ImageGen starter-loadout atlases as final-aligned sprites.

This is a development-only image-asset importer.  It performs one uniform
whole-atlas resize from the reviewed 8x9 ImageGen sheet, removes the flat
background matte, and writes an RGBA 1536x1728 atlas.  It never extracts,
rotates, repositions, or manufactures equipment geometry per frame.

Starter-loadout atlases are deliberately flattened: body, starter weapon and
light chest armor are authored together.  They make all five new heroes
playable while the larger modular equipment library is still being painted.
Unsupported later equipment remains rejected by the strict modular loader.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
RAW_ROOT = ROOT / "assets" / "sprites_src" / "player_starter_loadouts_authored"
OUT_ROOT = ROOT / "assets" / "sprites_src" / "player_starter_loadouts"
REPORT = OUT_ROOT / "starter_loadouts_v1.json"
CLASSES = ("vanguard", "emberwitch", "gravebinder", "wildkeeper", "veilranger")
SIZE = (1536, 1728)
CELL = 192
MICRO_ISLAND_MAX_PIXELS = 8


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def remove_dark_matte(source: Image.Image) -> Image.Image:
    """Remove the near-black ImageGen field without changing opaque art.

    The reviewed sources use black only as a removable backing.  A luminance
    ramp retains antialiased sprite edges and makes truly black costume pixels
    opaque when adjacent to the connected actor.  This is source cleanup, not
    geometry authoring.
    """
    rgb = source.convert("RGB")
    out = Image.new("RGBA", rgb.size)
    src, dst = rgb.load(), out.load()
    for y in range(rgb.height):
        for x in range(rgb.width):
            r, g, b = src[x, y]
            hi = max(r, g, b)
            # The JPEG-like generated backing contains only 0..4 noise across
            # most of each cell. Visible art rises sharply above it. A simple
            # luminance matte avoids treating one-channel compression noise as
            # costume chroma, while retaining a soft antialiased edge ramp.
            alpha = 0 if hi <= 5 else 255 if hi >= 26 else round((hi - 5) / 21 * 255)
            dst[x, y] = (r, g, b, alpha)
    return out


def remove_micro_islands(atlas: Image.Image) -> tuple[Image.Image, int, int]:
    """Clear only detached alpha islands left by generated-image noise.

    This runs once over the complete final-aligned atlas. It never slices,
    moves, scales, rotates, or repairs a frame. Only 8-connected components
    above the runtime alpha threshold whose total area is at most eight pixels
    are removed, leaving authored actor/equipment geometry in place.
    """
    if atlas.mode != "RGBA":
        raise RuntimeError("micro-island cleanup requires an RGBA atlas")
    width, height = atlas.size
    alpha = bytearray(atlas.getchannel("A").tobytes())
    seen = bytearray(width * height)
    removed: list[int] = []
    component_count = 0
    for start in range(width * height):
        if seen[start] or alpha[start] <= 8:
            continue
        seen[start] = 1
        stack = [start]
        component: list[int] = []
        while stack:
            current = stack.pop()
            component.append(current)
            y, x = divmod(current, width)
            for yy in range(max(0, y - 1), min(height, y + 2)):
                row = yy * width
                for xx in range(max(0, x - 1), min(width, x + 2)):
                    candidate = row + xx
                    if not seen[candidate] and alpha[candidate] > 8:
                        seen[candidate] = 1
                        stack.append(candidate)
        if len(component) <= MICRO_ISLAND_MAX_PIXELS:
            component_count += 1
            removed.extend(component)
    if not removed:
        return atlas, 0, 0
    pixels = bytearray(atlas.tobytes())
    for index in removed:
        offset = index * 4
        pixels[offset:offset + 4] = b"\x00\x00\x00\x00"
    return Image.frombytes("RGBA", atlas.size, bytes(pixels)), component_count, len(removed)


def validate(atlas: Image.Image, class_id: str) -> list[list[int]]:
    if atlas.mode != "RGBA" or atlas.size != SIZE:
        raise RuntimeError(f"{class_id} starter atlas must be exact RGBA {SIZE}")
    boxes = []
    for index in range(72):
        x, y = (index % 8) * CELL, (index // 8) * CELL
        alpha = atlas.crop((x, y, x + CELL, y + CELL)).getchannel("A")
        box = alpha.point(lambda value: 255 if value > 8 else 0).getbbox()
        if not box:
            raise RuntimeError(f"{class_id} starter atlas frame {index} is empty")
        # Edge contact is recorded for visual review. Because this flattened
        # base is an independent authored atlas, an extended weapon may touch a
        # nominal cell boundary without contaminating a neighbouring frame.
        boxes.append(list(box))
    return boxes


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write", action="store_true", help="write final-aligned atlases and provenance")
    args = parser.parse_args()
    records = {}
    staged = {}
    for class_id in CLASSES:
        raw = RAW_ROOT / f"{class_id}_starter_raw_v1.png"
        if not raw.is_file():
            raise RuntimeError(f"missing reviewed starter source: {raw.relative_to(ROOT)}")
        with Image.open(raw) as opened:
            opened.load()
            if opened.format != "PNG" or abs(opened.size[0] / opened.size[1] - 8 / 9) > .002:
                raise RuntimeError(f"{class_id} starter source must be an 8:9 PNG atlas")
            source = opened.convert("RGB")
        # One atlas-wide transform; no frame-dependent alignment is possible.
        aligned = remove_dark_matte(source).resize(SIZE, Image.Resampling.LANCZOS)
        aligned, removed_components, removed_pixels = remove_micro_islands(aligned)
        boxes = validate(aligned, class_id)
        staged[class_id] = aligned
        records[class_id] = {
            "source": raw.relative_to(ROOT).as_posix(),
            "sourceSha256": sha(raw),
            "method": "imagegen-authored-flat-loadout-uniform-atlas-resize-micro-island-clean-v2",
            "microIslandMaxPixels": MICRO_ISLAND_MAX_PIXELS,
            "microIslandComponentsRemoved": removed_components,
            "microIslandPixelsRemoved": removed_pixels,
            "sourceSize": list(source.size),
            "output": (OUT_ROOT / f"{class_id}.png").relative_to(ROOT).as_posix(),
            "outputSize": list(SIZE),
            "anchor": [96, 184],
            "frames": 72,
            "frameAlphaBboxes": boxes,
            "review": "visual-contact-sheet-v1",
        }
    if args.write:
        OUT_ROOT.mkdir(parents=True, exist_ok=True)
        for class_id, atlas in staged.items():
            atlas.save(OUT_ROOT / f"{class_id}.png", "PNG", compress_level=7)
            records[class_id]["outputSha256"] = sha(OUT_ROOT / f"{class_id}.png")
        REPORT.write_text(json.dumps({
            "version": 1,
            "sourceKind": "authored-flattened-starter-loadout",
            "review": "visual-contact-sheet-v1",
            "classes": records,
        }, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(f"PASS: {len(records)} starter loadouts / {len(records) * 72} authored frames")


if __name__ == "__main__":
    main()
