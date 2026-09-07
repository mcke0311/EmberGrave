#!/usr/bin/env python3
"""Normalize one authored ImageGen 8x9 equipment atlas without moving geometry.

This is a source-authoring helper, not the runtime compiler.  It removes an
approximately flat green matte, performs one whole-canvas resize to the final
1536x1728 atlas, and reports registration failures.  It never slices, crops,
trims, translates, rotates, flips, repairs, or separates semantic planes.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
REGISTRATION = ROOT / "assets/sprites_src/player_rig/registrations.json"
ATLAS = (1536, 1728)
CELL = 192
COLS = 8
ROWS = 9
POSES = (
    "idle", "walkA", "walkB", "attackWindup", "attackImpact",
    "cast", "hit", "death", "dead",
)
DIRECTIONS = ("E", "SE", "S", "SW", "W", "NW", "N", "NE")


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def matte_pixel(r: int, g: int, b: int, tolerance: int, dominance: int) -> tuple[int, int, int, int]:
    if max(abs(r), abs(g - 255), abs(b)) <= tolerance:
        return 0, 0, 0, 0
    if g >= 128 and g - max(r, b) >= dominance:
        alpha = max(r, b, 255 - g)
        if alpha <= 8:
            return 0, 0, 0, 0
        scale = 255 / alpha
        return (
            min(255, round(r * scale)),
            min(255, max(0, round((g - (255 - alpha)) * scale))),
            min(255, round(b * scale)),
            alpha,
        )
    return r, g, b, 255


def remove_green(source: Image.Image, tolerance: int, dominance: int) -> Image.Image:
    rgb = source.convert("RGB")
    out = Image.new("RGBA", rgb.size, (0, 0, 0, 0))
    out.putdata([matte_pixel(*pixel, tolerance, dominance) for pixel in rgb.get_flattened_data()])
    return out


def edge_pixels(alpha: Image.Image) -> int:
    width, height = alpha.size
    return sum(
        1
        for point in (
            list(alpha.crop((0, 0, width, 1)).get_flattened_data())
            + list(alpha.crop((0, height - 1, width, height)).get_flattened_data())
            + list(alpha.crop((0, 1, 1, height - 1)).get_flattened_data())
            + list(alpha.crop((width - 1, 1, width, height - 1)).get_flattened_data())
        )
        if point > 8
    )


def around(alpha: Image.Image, point: list[int], radius: int = 2) -> int:
    x, y = point
    return sum(
        1 for value in alpha.crop((max(0, x - radius), max(0, y - radius), min(CELL, x + radius + 1), min(CELL, y + radius + 1))).get_flattened_data()
        if value > 8
    )


def intersects(alpha: Image.Image, roi: list[int]) -> int:
    x, y, width, height = roi
    return sum(1 for value in alpha.crop((x, y, x + width, y + height)).get_flattened_data() if value > 8)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", required=True, type=Path)
    parser.add_argument("--out", required=True, type=Path)
    parser.add_argument("--class-id", default="emberwitch")
    parser.add_argument("--slot", required=True, choices=("main", "shield", "head", "chest"))
    parser.add_argument("--family", required=True)
    parser.add_argument("--handedness", choices=("one", "two"), default="one")
    parser.add_argument("--key-tolerance", type=int, default=18)
    parser.add_argument("--green-dominance", type=int, default=70)
    parser.add_argument("--write-rejected", action="store_true")
    args = parser.parse_args()

    source = args.source.resolve()
    out = args.out.resolve()
    with Image.open(source) as opened:
        opened.load()
        if opened.format != "PNG":
            raise SystemExit("source must be PNG")
        raw = opened.copy()
    ratio_error = abs(raw.width / raw.height - COLS / ROWS)
    if ratio_error > .002:
        raise SystemExit(f"source is not a reviewed 8:9 atlas (ratio error {ratio_error:.6f})")

    registration = json.loads(REGISTRATION.read_text(encoding="utf-8"))
    frames = registration["classes"][args.class_id]["frames"]
    if len(frames) != 72:
        raise SystemExit("registration must contain 72 frames")

    cleaned = remove_green(raw, args.key_tolerance, args.green_dominance)
    aligned = cleaned.resize(ATLAS, Image.Resampling.LANCZOS)
    frame_results = []
    errors: list[str] = []
    for index, frame in enumerate(frames):
        col, row = index % COLS, index // COLS
        cell = aligned.crop((col * CELL, row * CELL, (col + 1) * CELL, (row + 1) * CELL))
        alpha = cell.getchannel("A")
        visible = alpha.point(lambda value: 255 if value > 8 else 0).getbbox()
        edge = edge_pixels(alpha)
        required = 0
        label = ""
        if args.slot == "head":
            label = "headROI"
            required = intersects(alpha, frame[label])
        elif args.slot == "chest":
            label = "chestROI"
            required = intersects(alpha, frame[label])
        elif args.slot == "shield":
            label = "offGrip"
            required = around(alpha, frame[label])
        else:
            label = "mainGrip"
            required = around(alpha, frame[label])
            if args.handedness == "two":
                off = around(alpha, frame["offGrip"])
                if off == 0:
                    errors.append(f"frame {index} {frame['pose']}/{frame['direction']} misses offGrip")
        if not visible:
            errors.append(f"frame {index} {frame['pose']}/{frame['direction']} is empty")
        if edge:
            errors.append(f"frame {index} {frame['pose']}/{frame['direction']} touches a cell edge ({edge} pixels)")
        if required == 0:
            errors.append(f"frame {index} {frame['pose']}/{frame['direction']} misses {label}")
        frame_results.append({
            "index": index,
            "pose": frame["pose"],
            "direction": frame["direction"],
            "alphaBBox": list(visible) if visible else None,
            "edgePixels": edge,
            "requiredContact": required,
        })

    report = {
        "version": 1,
        "sourceKind": "imagegen-authored-equipment-uniform-atlas-resize-v1",
        "source": source.as_posix(),
        "sourceSha256": sha256(source),
        "sourceSize": list(raw.size),
        "output": out.as_posix(),
        "outputSize": list(ATLAS),
        "classId": args.class_id,
        "slot": args.slot,
        "family": args.family,
        "operations": ["green-matte-alpha-clean", "single-whole-atlas-lanczos-resize"],
        "forbiddenOperationsApplied": [],
        "status": "mechanical-pass-unreviewed" if not errors else "rejected",
        "errors": errors,
        "frames": frame_results,
    }
    report_path = out.with_suffix(out.suffix + ".provenance.json")
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    if not errors or args.write_rejected:
        aligned.save(out, "PNG", compress_level=7)
    print(f"{report['status'].upper()}: {len(errors)} errors; report {report_path}")
    if errors:
        for error in errors[:24]:
            print(f"ERROR: {error}")
        if len(errors) > 24:
            print(f"ERROR: ... {len(errors) - 24} more")
        raise SystemExit(2)


if __name__ == "__main__":
    main()
