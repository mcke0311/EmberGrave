#!/usr/bin/env python3
"""Diagnostic for second-pass chroma hand annotations (no writes)."""

from collections import deque
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PLAYERS = ROOT / "assets" / "sprites_src" / "players"
CLASSES = ("vanguard", "emberwitch", "gravebinder", "wildkeeper", "veilranger")


def role_match(rgb, role):
    r, g, b = rgb
    if role == "main":
        return r > 155 and r > g * 1.4 and r > b * 1.4 and r - max(g, b) > 55
    return g > 85 and b > 85 and r < min(g, b) * .68 and min(g, b) - r > 35


def component_pixels(image, test, minimum=2):
    width, height = image.size
    rgb = image.convert("RGB")
    points = {
        (x, y) for y in range(height) for x in range(width)
        if test(rgb.getpixel((x, y)))
    }
    out = []
    while points:
        start = points.pop()
        work = deque([start])
        found = [start]
        while work:
            x, y = work.popleft()
            for yy in range(max(0, y - 1), min(height, y + 2)):
                for xx in range(max(0, x - 1), min(width, x + 2)):
                    point = (xx, yy)
                    if point in points:
                        points.remove(point)
                        work.append(point)
                        found.append(point)
        if len(found) >= minimum:
            out.append(found)
    return out


def bbox(points):
    xs, ys = zip(*points)
    return min(xs), min(ys), max(xs) + 1, max(ys) + 1


def box_distance(a, b):
    dx = max(a[0] - b[2], b[0] - a[2], 0)
    dy = max(a[1] - b[3], b[1] - a[3], 0)
    return (dx * dx + dy * dy) ** .5


def merge_near(parts, distance):
    groups = [list(part) for part in parts]
    changed = True
    while changed:
        changed = False
        for i in range(len(groups)):
            ibox = bbox(groups[i])
            for j in range(i + 1, len(groups)):
                if box_distance(ibox, bbox(groups[j])) <= distance:
                    groups[i].extend(groups.pop(j))
                    changed = True
                    break
            if changed:
                break
    return groups


def is_green(rgb):
    r, g, b = rgb
    return g > 100 and g > r * 1.42 and g > b * 1.42 and g - max(r, b) > 45


def main():
    for class_id in CLASSES:
        image = Image.open(PLAYERS / f"{class_id}_hand_markers_v2.png").convert("RGB")
        bodies = component_pixels(
            image,
            lambda rgb: not is_green(rgb) and not role_match(rgb, "main") and not role_match(rgb, "off")
            and max(rgb) > 8,
            180,
        )
        print(f"{class_id}: bodies={len(bodies)}")
        for role in ("main", "off"):
            parts = component_pixels(image, lambda rgb, role=role: role_match(rgb, role), 2)
            for distance in (2, 4, 6, 8, 10, 12):
                groups = merge_near(parts, distance)
                likely = [g for g in groups if len(g) >= 55]
                print(
                    f"  {role} d={distance}: parts={len(parts)} groups={len(groups)} "
                    f"likely={len(likely)} areas={min(map(len, likely), default=0)}..{max(map(len, likely), default=0)}"
                )


if __name__ == "__main__":
    main()
