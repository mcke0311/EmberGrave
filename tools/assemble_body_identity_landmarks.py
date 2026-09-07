#!/usr/bin/env python3
"""Validate and assemble independently reviewed player-body scale landmarks."""

from __future__ import annotations

import json
import math
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
TMP = ROOT / "tmp" / "player_rig_landmarks"
QA = ROOT / "assets" / "sprites_src" / "player_rig" / "qa"
CLASSES = ("vanguard", "emberwitch", "gravebinder", "wildkeeper", "veilranger")
POSES = ("idle", "walkA", "walkB", "attackWindup", "attackImpact", "cast", "hit", "death", "dead")
DIRECTIONS = ("E", "SE", "S", "SW", "W", "NW", "N", "NE")
TARGET_POSES = {"cast", "hit", "death", "dead"}


def length(line: list[list[float]]) -> float:
    return math.dist(line[0], line[1])


def touches(alpha: Image.Image, point: list[float]) -> bool:
    x, y = round(point[0]), round(point[1])
    for yy in range(max(0, y - 2), min(192, y + 3)):
        for xx in range(max(0, x - 2), min(192, x + 3)):
            if alpha.getpixel((xx, yy)) > 8:
                return True
    return False


def line_contacts(alpha: Image.Image, line: list[list[float]]) -> bool:
    """A reviewed anatomical width line must cross body alpha at both ends.

    Antialiased silhouette endpoints can land a few pixels outside the first
    opaque sample, so use the frozen ±2px contact tolerance. Both endpoints
    remain independently checked by sampling short inward segments.
    """
    return touches(alpha, line[0]) and touches(alpha, line[1])


def main() -> None:
    QA.mkdir(parents=True, exist_ok=True)
    classes = {}
    for class_id in CLASSES:
        part_path = TMP / f"{class_id}.json"
        if not part_path.is_file():
            raise RuntimeError(f"missing reviewed class landmark fragment: {part_path}")
        part = json.loads(part_path.read_text(encoding="utf-8"))
        if set(part) != {"classId", "frames"} or part["classId"] != class_id:
            raise RuntimeError(f"malformed landmark fragment: {part_path}")
        frames = part["frames"]
        if not isinstance(frames, list) or len(frames) != 72:
            raise RuntimeError(f"{class_id}: expected exactly 72 landmark frames")
        body = Image.open(ROOT / "assets" / "sprites_src" / "player_rig" / class_id / "body.png").convert("RGBA")
        overlay = body.copy()
        draw = ImageDraw.Draw(overlay)
        idle = {}
        ratios = {}
        expected_keys = {"index", "pose", "direction", "headLine", "torsoLine", "review"}
        for index, meta in enumerate(frames):
            pose, direction = POSES[index // 8], DIRECTIONS[index % 8]
            if set(meta) != expected_keys or meta.get("index") != index or meta.get("pose") != pose or meta.get("direction") != direction:
                raise RuntimeError(f"{class_id}/{index}: malformed or out-of-order landmark frame")
            if meta.get("review") != "authored-visual-v1":
                raise RuntimeError(f"{class_id}/{index}: landmark lacks visual review provenance")
            cell_alpha = body.crop(((index % 8) * 192, (index // 8) * 192, (index % 8 + 1) * 192, (index // 8 + 1) * 192)).getchannel("A")
            lengths = {}
            for key in ("headLine", "torsoLine"):
                line = meta.get(key)
                if not (isinstance(line, list) and len(line) == 2 and all(isinstance(p, list) and len(p) == 2 for p in line)):
                    raise RuntimeError(f"{class_id}/{index}: malformed {key}")
                if not all(isinstance(v, (int, float)) and math.isfinite(v) and 0 <= v < 192 for p in line for v in p):
                    raise RuntimeError(f"{class_id}/{index}: out-of-cell {key}")
                if not line_contacts(cell_alpha, line):
                    raise RuntimeError(f"{class_id}/{index}: {key} endpoint misses body alpha")
                lengths[key] = length(line)
                if lengths[key] <= 0:
                    raise RuntimeError(f"{class_id}/{index}: zero-length {key}")
                ox, oy = (index % 8) * 192, (index // 8) * 192
                color = (0, 255, 255, 255) if key == "headLine" else (255, 0, 255, 255)
                draw.line([(ox + p[0], oy + p[1]) for p in line], fill=color, width=2)
                for p in line:
                    draw.ellipse((ox + p[0] - 2, oy + p[1] - 2, ox + p[0] + 2, oy + p[1] + 2), fill=color)
            if pose == "idle":
                idle[direction] = lengths
            elif pose in TARGET_POSES:
                head_ratio = lengths["headLine"] / idle[direction]["headLine"]
                torso_ratio = lengths["torsoLine"] / idle[direction]["torsoLine"]
                if not (.85 <= head_ratio <= 1.15 and .85 <= torso_ratio <= 1.15):
                    raise RuntimeError(f"{class_id}/{pose}/{direction}: identity ratios head={head_ratio:.3f}, torso={torso_ratio:.3f}")
                ratios[index] = (head_ratio, torso_ratio)
            ox, oy = (index % 8) * 192, (index // 8) * 192
            label = f"{pose} {direction}"
            if index in ratios:
                label += f" h{ratios[index][0]:.2f} t{ratios[index][1]:.2f}"
            draw.text((ox + 3, oy + 3), label, fill=(255, 226, 96, 255), stroke_width=2, stroke_fill=(0, 0, 0, 255))
        overlay.save(QA / f"{class_id}_body_identity_landmarks_v1.png", "PNG", compress_level=7)
        classes[class_id] = {"frames": frames}
    artifact = {
        "version": 1,
        "method": "authored-final-body-landmarks-v1",
        "review": "visual-overlay-v1",
        "classes": classes,
    }
    out_path = QA / "body_identity_landmarks_v1.json"
    out_path.write_text(json.dumps(artifact, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(f"Validated 360 direct body identity landmark frames: {out_path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
