#!/usr/bin/env python3
"""Seed class-local landmark annotations for mandatory human overlay review.

This is a development annotation aid, not a validator or compiler. It chooses
alpha-contacting horizontal chords near explicit pose/direction landmark
targets; reviewers must correct anatomy and may only then set review provenance.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image, ImageDraw

import author_player_rig as rig


ROOT = Path(__file__).resolve().parents[1]
TMP = ROOT / "tmp" / "player_rig_landmarks"


def runs_at(alpha: Image.Image, y: int, threshold: int = 40) -> list[tuple[int, int]]:
    points = [x for x in range(192) if alpha.getpixel((x, y)) >= threshold]
    if not points:
        return []
    runs = []
    start = last = points[0]
    for x in points[1:]:
        if x > last + 2:
            runs.append((start, last)); start = x
        last = x
    runs.append((start, last))
    return runs


def chord(alpha: Image.Image, target: tuple[int, int], width_hint: int) -> list[list[int]]:
    tx, ty = target
    candidates = []
    for y in range(max(0, ty - 12), min(192, ty + 13)):
        for x0, x1 in runs_at(alpha, y):
            width = x1 - x0
            center = (x0 + x1) / 2
            score = abs(y - ty) * 2 + abs(center - tx) + abs(width - width_hint) * .25
            candidates.append((score, x0, x1, y))
    if not candidates:
        raise RuntimeError(f"no alpha chord near {target}")
    _score, x0, x1, y = min(candidates)
    return [[x0, y], [x1, y]]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("class_id", choices=rig.CLASSES)
    args = parser.parse_args()
    class_id = args.class_id
    body = Image.open(rig.RIG_ROOT / class_id / "body.png").convert("RGBA")
    TMP.mkdir(parents=True, exist_ok=True)
    frames = []
    idle_lengths = {}
    overlay = body.copy(); draw = ImageDraw.Draw(overlay)
    for index in range(72):
        pose_index, direction_index = divmod(index, 8)
        cell = rig.frame(body, index); alpha = cell.getchannel("A")
        if pose_index <= 5:
            head = rig.STANDING_HEAD_TARGETS[direction_index]
        elif pose_index <= 7:
            head = rig.FALL_HEAD_TARGETS[direction_index]
        else:
            head = rig.DEAD_HEAD_TARGETS[direction_index]
        # Explicit body-axis targets are only a seed; all lines remain marked
        # unreviewed until a human moves them onto head and shoulder anatomy.
        torso = (head[0], min(180, head[1] + (42 if pose_index <= 5 else 34)))
        base_head = idle_lengths.get((direction_index, "head"), 26)
        base_torso = idle_lengths.get((direction_index, "torso"), 58)
        head_line = chord(alpha, head, base_head)
        torso_line = chord(alpha, torso, base_torso)
        if pose_index == 0:
            idle_lengths[(direction_index, "head")] = head_line[1][0] - head_line[0][0]
            idle_lengths[(direction_index, "torso")] = torso_line[1][0] - torso_line[0][0]
        meta = {
            "index": index, "pose": rig.POSES[pose_index], "direction": rig.DIRECTIONS[direction_index],
            "headLine": head_line, "torsoLine": torso_line, "review": "UNREVIEWED",
        }
        frames.append(meta)
        ox, oy = direction_index * 192, pose_index * 192
        for line, color in ((head_line, (0, 255, 255, 255)), (torso_line, (255, 0, 255, 255))):
            draw.line([(ox + p[0], oy + p[1]) for p in line], fill=color, width=2)
        draw.text((ox + 3, oy + 3), f"{rig.POSES[pose_index]} {rig.DIRECTIONS[direction_index]} UNREVIEWED",
                  fill=(255, 226, 96, 255), stroke_width=2, stroke_fill=(0, 0, 0, 255))
    (TMP / f"{class_id}.json").write_text(json.dumps({"classId": class_id, "frames": frames}, indent=2) + "\n", encoding="utf-8")
    overlay.save(TMP / f"{class_id}_overlay.png", "PNG", compress_level=7)
    print(f"Seeded UNREVIEWED {class_id} annotations; correct all 72 lines before approval")


if __name__ == "__main__":
    main()
