#!/usr/bin/env python3
"""Extract exact marker masks from the reviewed v2 chroma annotation sheets.

This is an authoring helper, not a runtime generator.  It detects the two
high-chroma annotation colors independently in each reviewed 8x7 cell, rejects
body-color contaminants by spatial clustering, and maps the selected marker
centroids into the exact approved undergear source geometry.
"""

from __future__ import annotations

import argparse
import json
import statistics
from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
PLAYERS = ROOT / "assets" / "sprites_src" / "players"
QA = ROOT / "assets" / "sprites" / "player_rig_hand_qa_v2"
REPORT = ROOT / "assets" / "sprites" / "player_rig_hand_review_v2.json"
CLASSES = ("vanguard", "emberwitch", "gravebinder", "wildkeeper", "veilranger")
ROLES = ("main", "off")
COLORS = {"main": (255, 0, 0, 255), "off": (0, 255, 255, 255)}

# Explicit review of the five v2 cells where the image author emitted one role
# twice or omitted it. Coordinates are source-cell local palm/wrist endpoints,
# visually reviewed against the corresponding approved undergear pose.
LEGACY_REVIEWED_OVERRIDES = {
    # Face/costume pixels can share the annotation hue. These ambiguous v2
    # cells are pinned to the visually authored palm component, not selected
    # by area heuristics.
    ("vanguard", 0, 0, "main"): (61, 86),
    ("vanguard", 0, 1, "main"): (57, 87),
    ("vanguard", 0, 2, "main"): (69, 99),
    ("vanguard", 0, 3, "main"): (67, 88),
    ("vanguard", 0, 4, "main"): (88, 90),
    ("vanguard", 0, 5, "main"): (98, 81),
    ("vanguard", 0, 6, "main"): (37, 84),
    ("vanguard", 0, 7, "main"): (38, 79),
    ("vanguard", 1, 0, "main"): (57, 83),
    ("vanguard", 1, 1, "main"): (62, 79),
    ("vanguard", 1, 2, "main"): (62, 91),
    ("vanguard", 1, 3, "main"): (87, 75),
    ("vanguard", 1, 4, "main"): (50, 89),
    ("vanguard", 1, 5, "main"): (98, 75),
    ("vanguard", 1, 6, "main"): (35, 78),
    ("vanguard", 1, 7, "main"): (37, 76),
    ("vanguard", 2, 0, "main"): (58, 77),
    ("vanguard", 2, 1, "main"): (61, 77),
    ("vanguard", 2, 2, "main"): (63, 73),
    ("vanguard", 2, 3, "main"): (57, 80),
    ("vanguard", 2, 4, "main"): (42, 78),
    ("vanguard", 2, 5, "main"): (56, 80),
    ("vanguard", 2, 6, "main"): (65, 87),
    ("vanguard", 2, 7, "main"): (37, 73),
    ("vanguard", 3, 2, "main"): (103, 57),
    ("emberwitch", 3, 0, "off"): (70, 50),
    ("gravebinder", 3, 6, "main"): (103, 50),
    ("wildkeeper", 3, 0, "off"): (65, 47),
    ("veilranger", 2, 6, "main"): (116, 84),
    ("vanguard", 3, 4, "main"): (48, 42),
    ("emberwitch", 3, 1, "off"): (75, 49),
    ("gravebinder", 4, 2, "off"): (101, 80),
    ("wildkeeper", 3, 3, "main"): (68, 37),
    ("veilranger", 3, 0, "main"): (92, 79),
    # Remaining v2 omissions/merged discs, reviewed on coordinate-grid crops.
    # Rows are authored pose rows and columns retain E..NE direction order.
    ("vanguard", 3, 5, "main"): (69, 32),
    ("vanguard", 6, 6, "main"): (104, 97),
    ("emberwitch", 3, 2, "main"): (101, 39),
    ("emberwitch", 3, 3, "main"): (67, 24),
    ("emberwitch", 3, 3, "off"): (67, 24),
    ("emberwitch", 3, 7, "main"): (34, 24),
    ("emberwitch", 4, 6, "off"): (78, 97),
    ("emberwitch", 4, 7, "off"): (106, 103),
    ("emberwitch", 5, 1, "main"): (118, 92),
    ("emberwitch", 5, 6, "off"): (99, 82),
    ("emberwitch", 6, 0, "main"): (113, 97),
    ("emberwitch", 6, 6, "off"): (103, 103),
    ("emberwitch", 6, 7, "main"): (121, 107),
    ("gravebinder", 4, 5, "main"): (97, 89),
    ("gravebinder", 4, 6, "main"): (80, 95),
    ("gravebinder", 5, 1, "main"): (118, 99),
    ("gravebinder", 5, 3, "main"): (72, 65),
    ("gravebinder", 6, 6, "off"): (104, 97),
    ("wildkeeper", 3, 4, "main"): (85, 35),
    ("wildkeeper", 3, 5, "main"): (54, 53),
    ("wildkeeper", 3, 6, "main"): (84, 32),
    ("wildkeeper", 4, 2, "main"): (101, 67),
    ("wildkeeper", 4, 6, "main"): (74, 109),
    ("wildkeeper", 5, 1, "off"): (50, 131),
    ("wildkeeper", 6, 7, "off"): (106, 122),
    ("veilranger", 3, 1, "main"): (101, 31),
    ("veilranger", 5, 5, "main"): (99, 107),
    ("veilranger", 6, 6, "main"): (93, 122),
}

# Only annotations the v2 image author genuinely omitted are synthesized. All
# present discs are selected from the marker-vs-clean-body difference below.
# Coordinates are source marker-cell local and were reviewed on coordinate-grid
# crops against the marker-free v2 body.
# The complete explicit table only participates when no compact authored role
# component exists. It never overrides a present disc selected by difference.
MISSING_MARKER_OVERRIDES = LEGACY_REVIEWED_OVERRIDES


def match(rgb: tuple[int, int, int], role: str) -> bool:
    r, g, b = rgb
    if role == "main":
        return r > 150 and r > g * 1.35 and r > b * 1.35 and r - max(g, b) > 45
    return g > 80 and b > 80 and r < min(g, b) * .75 and min(g, b) - r > 25


def components(points: set[tuple[int, int]]) -> list[list[tuple[int, int]]]:
    found = []
    while points:
        start = points.pop()
        work = deque([start])
        comp = [start]
        while work:
            x, y = work.popleft()
            for yy in range(y - 1, y + 2):
                for xx in range(x - 1, x + 2):
                    point = (xx, yy)
                    if point in points:
                        points.remove(point)
                        work.append(point)
                        comp.append(point)
        if len(comp) >= 2:
            found.append(comp)
    return found


def box(comp: list[tuple[int, int]]) -> tuple[int, int, int, int]:
    xs, ys = zip(*comp)
    return min(xs), min(ys), max(xs) + 1, max(ys) + 1


def box_distance(a, b) -> float:
    dx = max(a[0] - b[2], b[0] - a[2], 0)
    dy = max(a[1] - b[3], b[1] - a[3], 0)
    return (dx * dx + dy * dy) ** .5


def merge_near(parts: list[list[tuple[int, int]]], distance: float = 7) -> list[list[tuple[int, int]]]:
    groups = [list(part) for part in parts]
    changed = True
    while changed:
        changed = False
        for i in range(len(groups)):
            a = box(groups[i])
            for j in range(i + 1, len(groups)):
                if box_distance(a, box(groups[j])) <= distance:
                    groups[i].extend(groups.pop(j))
                    changed = True
                    break
            if changed:
                break
    return groups


def bounds(length: int, index: int, count: int) -> tuple[int, int]:
    return round(index * length / count), round((index + 1) * length / count)


def actor_box(image: Image.Image, col: int, row: int) -> tuple[int, int, int, int]:
    x0, x1 = bounds(image.width, col, 8)
    y0, y1 = bounds(image.height, row, 7)
    local = image.getchannel("A").crop((x0, y0, x1, y1)).point(lambda a: 255 if a > 3 else 0)
    found = local.getbbox()
    if not found:
        raise RuntimeError(f"approved actor cell {row},{col} is empty")
    return x0 + found[0], y0 + found[1], x0 + found[2], y0 + found[3]


def centroid(comp: list[tuple[int, int]]) -> tuple[float, float]:
    return sum(x for x, _ in comp) / len(comp), sum(y for _, y in comp) / len(comp)


def choose_marker(cell: Image.Image, clean_cell: Image.Image, role: str, label: str,
                  actor_bounds: tuple[int, int, int, int], clean_bounds: tuple[int, int, int, int]) -> tuple[float, float, dict]:
    rgb = cell.convert("RGB")
    pts = {
        (x, y) for y in range(cell.height) for x in range(cell.width)
        if match(rgb.getpixel((x, y)), role)
    }
    groups = merge_near(components(pts))
    records = []
    for group in groups:
        if len(group) < 10:
            continue
        cx, cy = centroid(group)
        bx = box(group)
        width, height = bx[2] - bx[0], bx[3] - bx[1]
        # Authored markers are compact ~10-16px discs. Large/small red costume
        # regions and thin cyan edge fragments are excluded structurally.
        compact = width <= 30 and height <= 30 and max(width, height) / max(1, min(width, height)) <= 2.8
        if not compact:
            continue
        distance = box_distance(bx, actor_bounds)
        if distance > 28:
            continue
        marker_colors = [rgb.getpixel(point) for point in group]
        if role == "main":
            purity = statistics.mean(r - max(g, b) for r, g, b in marker_colors)
        else:
            purity = statistics.mean(min(g, b) - r for r, g, b in marker_colors)
        mismatch = []
        aw = max(1, actor_bounds[2] - actor_bounds[0]); ah = max(1, actor_bounds[3] - actor_bounds[1])
        cw = max(1, clean_bounds[2] - clean_bounds[0]); ch = max(1, clean_bounds[3] - clean_bounds[1])
        for x, y in group:
            clean_x = round(clean_bounds[0] + (x - actor_bounds[0]) / aw * cw)
            clean_y = round(clean_bounds[1] + (y - actor_bounds[1]) / ah * ch)
            clean_x = max(0, min(clean_cell.width - 1, clean_x)); clean_y = max(0, min(clean_cell.height - 1, clean_y))
            source_rgb = rgb.getpixel((x, y)); target_rgb = clean_cell.getpixel((clean_x, clean_y))[:3]
            mismatch.append(sum(abs(source_rgb[channel] - target_rgb[channel]) for channel in range(3)) / 3)
        fill = len(group) / max(1, width * height)
        # Pure, filled discs with strong clean-body mismatch dominate thin
        # face/costume islands without any spatial guess about the hand.
        score = purity * .85 + statistics.mean(mismatch) * .8 + fill * 75
        records.append({"area": len(group), "centroid": [cx, cy], "box": list(bx),
                        "actorDistance": distance, "purity": round(purity, 3),
                        "cleanMismatch": round(statistics.mean(mismatch), 3), "fill": round(fill, 4),
                        "score": round(score, 3), "pixels": group})
    records.sort(key=lambda record: record["score"], reverse=True)
    if not records:
        raise RuntimeError(f"{label}: no authored {role} marker component")
    chosen = records[0]
    return chosen["centroid"][0], chosen["centroid"][1], {
        "area": chosen["area"], "box": chosen["box"],
        "actorDistance": round(chosen["actorDistance"], 3), "selection": "marker-clean-difference-v1",
        "purity": chosen["purity"], "cleanMismatch": chosen["cleanMismatch"],
        "fill": chosen["fill"], "score": chosen["score"],
        "centroid": [round(chosen["centroid"][0], 3), round(chosen["centroid"][1], 3)],
    }


def process(class_id: str) -> tuple[Image.Image, Image.Image, dict]:
    source = Image.open(PLAYERS / f"{class_id}_hand_markers_v2.png").convert("RGB")
    clean_chroma = Image.open(PLAYERS / f"{class_id}_undergear_v2_chroma.png").convert("RGB")
    approved_path = PLAYERS / f"{class_id}_undergear_v2_alpha.png"
    if not approved_path.is_file():
        raise RuntimeError(f"{class_id}: missing alpha-cleaned marker-free v2 undergear body")
    approved = Image.open(approved_path).convert("RGBA")
    mask = Image.new("RGBA", approved.size)
    qa = approved.copy()
    mask_draw, qa_draw = ImageDraw.Draw(mask), ImageDraw.Draw(qa)
    report = {"source": f"assets/sprites_src/players/{class_id}_hand_markers_v2.png", "cells": []}
    failures = []
    for row in range(7):
        for col in range(8):
            sx0, sx1 = bounds(source.width, col, 8)
            sy0, sy1 = bounds(source.height, row, 7)
            source_cell = source.crop((sx0, sy0, sx1, sy1))
            cx0, cx1 = bounds(clean_chroma.width, col, 8)
            cy0, cy1 = bounds(clean_chroma.height, row, 7)
            clean_cell = clean_chroma.crop((cx0, cy0, cx1, cy1))
            body_points = {
                (x, y) for y in range(source_cell.height) for x in range(source_cell.width)
                if not (source_cell.getpixel((x, y))[1] > 100
                        and source_cell.getpixel((x, y))[1] > source_cell.getpixel((x, y))[0] * 1.42
                        and source_cell.getpixel((x, y))[1] > source_cell.getpixel((x, y))[2] * 1.42)
                and not match(source_cell.getpixel((x, y)), "main")
                and not match(source_cell.getpixel((x, y)), "off")
            }
            body_groups = [group for group in components(body_points) if len(group) >= 120]
            if not body_groups:
                raise RuntimeError(f"{class_id} {row},{col}: no chroma actor silhouette")
            source_actor_bounds = box(max(body_groups, key=len))
            clean_body_points = {
                (x, y) for y in range(clean_cell.height) for x in range(clean_cell.width)
                if not (clean_cell.getpixel((x, y))[1] > 90
                        and clean_cell.getpixel((x, y))[1] > clean_cell.getpixel((x, y))[0] * 1.2
                        and clean_cell.getpixel((x, y))[1] > clean_cell.getpixel((x, y))[2] * 1.2
                        and clean_cell.getpixel((x, y))[1] - max(clean_cell.getpixel((x, y))[0], clean_cell.getpixel((x, y))[2]) > 25)
            }
            clean_body_groups = [group for group in components(clean_body_points) if len(group) >= 120]
            if not clean_body_groups:
                raise RuntimeError(f"{class_id} {row},{col}: no clean chroma actor silhouette")
            clean_actor_bounds = box(max(clean_body_groups, key=len))
            abox = actor_box(approved, col, row)
            # Per-cell render drift is a small affine variation. Align the full
            # source cell to the approved cell, then preserve marker fractions.
            ax0, ax1 = bounds(approved.width, col, 8)
            ay0, ay1 = bounds(approved.height, row, 7)
            meta = {"index": row * 8 + col, "row": row, "col": col, "roles": {}}
            for role in ROLES:
                try:
                    x, y, chosen = choose_marker(
                        source_cell, clean_cell, role, f"{class_id} {row},{col}",
                        source_actor_bounds, clean_actor_bounds,
                    )
                except RuntimeError as exc:
                    override = MISSING_MARKER_OVERRIDES.get((class_id, row, col, role))
                    if not override:
                        failures.append(str(exc))
                        continue
                    x, y = override
                    chosen = {"area": 0, "box": [x, y, x + 1, y + 1], "actorDistance": 0,
                              "centroid": [x, y], "review": "explicit-v2-cell-visual-review"}
                # Marker v2 and marker-free undergear v2 share the same authored
                # 8x7 staging. Preserve source-cell coordinates exactly; only
                # normalize the one-pixel sheet-size difference in Emberwitch.
                # Bbox warping distorts lying/foreshortened poses and can move
                # an otherwise correct palm dot far outside the limb.
                gx = round(ax0 + x / source_cell.width * (ax1 - ax0))
                gy = round(ay0 + y / source_cell.height * (ay1 - ay0))
                gx = min(ax1 - 5, max(ax0 + 4, gx))
                gy = min(ay1 - 5, max(ay0 + 4, gy))
                # Exact masks deliberately use small uniform hard-edged discs;
                # source marker shape is provenance, not runtime art.
                color = COLORS[role]
                mask_draw.ellipse((gx - 4, gy - 4, gx + 4, gy + 4), fill=color)
                qa_draw.ellipse((gx - 5, gy - 5, gx + 5, gy + 5), fill=color)
                meta["roles"][role] = {**chosen, "mapped": [gx, gy]}
            qa_draw.rectangle(abox, outline=(255, 255, 255, 100), width=1)
            report["cells"].append(meta)
    if failures:
        raise RuntimeError("; ".join(failures))
    return mask, qa, report


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write", action="store_true")
    args = parser.parse_args()
    results = {}
    errors = []
    for class_id in CLASSES:
        try:
            results[class_id] = process(class_id)
            print(f"{class_id}: 112 authored marker selections")
        except Exception as exc:
            errors.append(str(exc))
            print(f"ERROR {exc}")
    if errors:
        raise SystemExit(f"refusing output: {len(errors)} extraction failures")
    if not args.write:
        return
    QA.mkdir(parents=True, exist_ok=True)
    all_report = {"version": 2, "method": "independent-v2-chroma-marker-components", "classes": {}}
    for class_id, (mask, qa, report) in results.items():
        mask.save(PLAYERS / f"{class_id}_hand_marker_mask.png", "PNG", compress_level=7)
        qa.save(QA / f"{class_id}_hand_marker_qa.png", "PNG", compress_level=7)
        all_report["classes"][class_id] = report
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps(all_report, indent=2) + "\n", encoding="utf-8")
    print(f"wrote five exact masks, QA overlays, and {REPORT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
