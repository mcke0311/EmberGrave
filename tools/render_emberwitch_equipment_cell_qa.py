#!/usr/bin/env python3
"""Render immutable Emberwitch per-cell authoring guides and QA composites.

This helper never modifies equipment pixels.  It crops one exact 192x192 cell
from the accepted final body atlas, optionally draws the reviewed slot ROI on a
separate guide, and composites an exact authored equipment cell over that body
for visual inspection.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
BODY = ROOT / "assets/sprites_src/player_rig/emberwitch/body.png"
REGISTRATION = ROOT / "assets/sprites_src/player_rig/registrations.json"
FOREARM_REGISTRATION = ROOT / "assets/sprites_src/player_rig/qa/equipment_forearm_registration_v1.json"
CELL = 192
COLS = 8
FRAMES = 72
POSES = (
    "idle", "walkA", "walkB", "attackWindup", "attackImpact",
    "cast", "hit", "death", "dead",
)
DIRECTIONS = ("E", "SE", "S", "SW", "W", "NW", "N", "NE")
ROI_KEYS = {"chest": "chestROI", "head": "headROI"}


def frame_label(index: int) -> str:
    return f"{index:02d}_{POSES[index // COLS]}_{DIRECTIONS[index % COLS]}"


def exclusive_save(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        raise SystemExit(f"refusing to overwrite: {path}")
    image.save(path, "PNG", compress_level=7)


def load_body_cell(index: int) -> Image.Image:
    if not 0 <= index < FRAMES:
        raise SystemExit(f"cell index must be 0..71, found {index}")
    with Image.open(BODY) as opened:
        opened.load()
        if opened.format != "PNG" or opened.mode != "RGBA" or opened.size != (1536, 1728):
            raise SystemExit(f"accepted body atlas contract changed: {opened.format}/{opened.mode}/{opened.size}")
        col, row = index % COLS, index // COLS
        return opened.crop((col * CELL, row * CELL, (col + 1) * CELL, (row + 1) * CELL))


def load_frame(index: int) -> dict:
    document = json.loads(REGISTRATION.read_text(encoding="utf-8"))
    frames = document.get("classes", {}).get("emberwitch", {}).get("frames")
    if not isinstance(frames, list) or len(frames) != FRAMES:
        raise SystemExit("canonical Emberwitch registration must contain 72 frames")
    frame = frames[index]
    if frame.get("index") != index or frame.get("pose") != POSES[index // COLS] or frame.get("direction") != DIRECTIONS[index % COLS]:
        raise SystemExit(f"canonical registration order changed at frame {index}")
    return frame


def load_forearm_frame(index: int) -> dict:
    document = json.loads(FOREARM_REGISTRATION.read_text(encoding="utf-8"))
    frames = document.get("classes", {}).get("emberwitch", {}).get("frames")
    if not isinstance(frames, list) or len(frames) != FRAMES:
        raise SystemExit("canonical Emberwitch forearm registration must contain 72 frames")
    frame = frames[index]
    if frame.get("index") != index or frame.get("pose") != POSES[index // COLS] or frame.get("direction") != DIRECTIONS[index % COLS]:
        raise SystemExit(f"canonical forearm registration order changed at frame {index}")
    return frame


def render_guides(args: argparse.Namespace) -> None:
    body = load_body_cell(args.cell_index)
    scaled = body.resize((args.size, args.size), Image.Resampling.NEAREST)
    exclusive_save(scaled, args.body_out.resolve())
    if args.roi_out:
        frame = load_frame(args.cell_index)
        ratio = args.size / CELL
        overlay = scaled.copy()
        draw = ImageDraw.Draw(overlay)
        line = max(2, round(args.size / 192))
        if args.slot in ROI_KEYS:
            roi_key = ROI_KEYS[args.slot]
            x, y, width, height = frame[roi_key]
            box = tuple(round(value * ratio) for value in (x, y, x + width, y + height))
            draw.rectangle(box, outline=(255, 255, 0, 255), width=line)
            draw.text((box[0], max(0, box[1] - line * 3)), f"{args.slot.upper()} ART MUST INTERSECT {roi_key}", fill=(255, 255, 0, 255))
        else:
            forearm = load_forearm_frame(args.cell_index)
            hx, hy, hw, hh = frame["mainHandROI"]
            fx, fy, fw, fh = forearm["mainForearmROI"]
            gx, gy = frame["mainGrip"]
            hand_box = tuple(round(value * ratio) for value in (hx, hy, hx + hw, hy + hh))
            forearm_box = tuple(round(value * ratio) for value in (fx, fy, fx + fw, fy + fh))
            grip = (round(gx * ratio), round(gy * ratio))
            draw.rectangle(forearm_box, outline=(0, 255, 255, 255), width=line)
            draw.rectangle(hand_box, outline=(255, 0, 255, 255), width=line)
            radius = max(4, round(2 * ratio))
            draw.ellipse((grip[0] - radius, grip[1] - radius, grip[0] + radius, grip[1] + radius), fill=(255, 0, 0, 255))
            draw.text((forearm_box[0], max(0, forearm_box[1] - line * 4)), "MAIN: cyan=17x17 forearm, magenta=hand, red=grip", fill=(255, 255, 0, 255))
        exclusive_save(overlay, args.roi_out.resolve())
    print(f"PASS guide: Emberwitch {frame_label(args.cell_index)} -> {args.body_out.resolve()}")


def render_composite(args: argparse.Namespace) -> None:
    body = load_body_cell(args.cell_index)
    with Image.open(args.equipment.resolve()) as opened:
        opened.load()
        if opened.format != "PNG" or opened.mode != "RGBA" or opened.size != (CELL, CELL):
            raise SystemExit(f"equipment cell must be exact RGBA PNG 192x192, found {opened.format}/{opened.mode}/{opened.size}")
        equipment = opened.copy()
    composite = Image.alpha_composite(body, equipment)
    if args.size != CELL:
        composite = composite.resize((args.size, args.size), Image.Resampling.NEAREST)
    exclusive_save(composite, args.out.resolve())
    print(f"PASS composite: Emberwitch {frame_label(args.cell_index)} -> {args.out.resolve()}")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    guide = commands.add_parser("guide")
    guide.add_argument("--cell-index", required=True, type=int)
    guide.add_argument("--slot", choices=(*ROI_KEYS, "main"), default="chest")
    guide.add_argument("--size", type=int, default=1254)
    guide.add_argument("--body-out", required=True, type=Path)
    guide.add_argument("--roi-out", type=Path)
    composite = commands.add_parser("composite")
    composite.add_argument("--cell-index", required=True, type=int)
    composite.add_argument("--equipment", required=True, type=Path)
    composite.add_argument("--size", type=int, default=768)
    composite.add_argument("--out", required=True, type=Path)
    return parser


def main() -> int:
    args = build_parser().parse_args()
    if not 192 <= args.size <= 4096:
        raise SystemExit("size must be 192..4096")
    if args.command == "guide":
        render_guides(args)
    else:
        render_composite(args)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
