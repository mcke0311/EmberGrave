#!/usr/bin/env python3
"""Apply a manually reviewed class landmark-line table to a seeded fragment."""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
TMP = ROOT / "tmp" / "player_rig_landmarks"


def snap_endpoint(alpha: Image.Image, point: list[int], other: list[int]) -> list[int]:
    """Snap a reviewed width endpoint to nearest alpha without changing axis."""
    x, y = point
    candidates = []
    # Keep the reviewer-authored landmark axis and search a small neighborhood;
    # direction toward the other endpoint breaks equal-distance ties.
    toward = 1 if other[0] > x else -1
    for yy in range(max(0, y - 5), min(192, y + 6)):
        for xx in range(max(0, x - 8), min(192, x + 9)):
            if alpha.getpixel((xx, yy)) > 8:
                score = abs(xx - x) + abs(yy - y) * 1.5 - toward * (xx - x) * .01
                candidates.append((score, xx, yy))
    if not candidates:
        return point
    _score, xx, yy = min(candidates)
    return [xx, yy]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("class_id")
    args = parser.parse_args()
    path = TMP / f"{args.class_id}.json"
    review_path = TMP / f"{args.class_id}_review_lines.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    reviewed = json.loads(review_path.read_text(encoding="utf-8"))
    for frame in data["frames"]:
        pose, direction = frame["pose"], frame["direction"]
        if pose in reviewed:
            head, torso = reviewed[pose][direction]
            frame["headLine"] = [head[:2], head[2:]]
            frame["torsoLine"] = [torso[:2], torso[2:]]
        body = Image.open(ROOT / "assets" / "sprites_src" / "player_rig" / args.class_id / "body.png").convert("RGBA")
        index = frame["index"]
        alpha = body.crop(((index % 8) * 192, (index // 8) * 192, (index % 8 + 1) * 192, (index // 8 + 1) * 192)).getchannel("A")
        for key in ("headLine", "torsoLine"):
            left, right = frame[key]
            frame[key] = [snap_endpoint(alpha, left, right), snap_endpoint(alpha, right, left)]
        frame["review"] = "authored-visual-v1"
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    body = Image.open(ROOT / "assets" / "sprites_src" / "player_rig" / args.class_id / "body.png").convert("RGBA")
    overlay = body.copy(); draw = ImageDraw.Draw(overlay); idle = {}
    for frame in data["frames"]:
        index = frame["index"]; ox, oy = index % 8 * 192, index // 8 * 192
        values = {}
        for key, color in (("headLine", (0, 255, 255, 255)), ("torsoLine", (255, 0, 255, 255))):
            line = frame[key]; values[key] = math.dist(*line)
            draw.line([(ox + p[0], oy + p[1]) for p in line], fill=color, width=2)
            for p in line:
                draw.ellipse((ox + p[0] - 2, oy + p[1] - 2, ox + p[0] + 2, oy + p[1] + 2), fill=color)
        if frame["pose"] == "idle":
            idle[frame["direction"]] = values
        label = f'{frame["pose"]} {frame["direction"]}'
        if frame["pose"] in ("cast", "hit", "death", "dead"):
            base = idle[frame["direction"]]
            label += f' h{values["headLine"] / base["headLine"]:.2f} t{values["torsoLine"] / base["torsoLine"]:.2f}'
        draw.text((ox + 3, oy + 3), label, fill=(255, 226, 96, 255), stroke_width=2, stroke_fill=(0, 0, 0, 255))
    overlay.save(TMP / f"{args.class_id}_overlay.png", "PNG", compress_level=7)
    print(path)


if __name__ == "__main__":
    main()
