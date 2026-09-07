#!/usr/bin/env python3
"""Extract reviewed hand-marker masks from the five authored overlay sheets.

The overlay sheets contain the original actors on black plus red (main hand)
and cyan (off hand) annotations.  This tool never guesses a socket.  It first
segments and orders the 56 actors in each overlay, detects marker components
globally (so a dot crossing a nominal grid edge is not split), and registers
each component to the matching approved undergear actor by body bounding-box
geometry.  Existing red/cyan costume pixels are rejected only when the aligned
approved actor contains matching pixels at the same location.

The default mode is a read-only scan.  ``--write`` is all-or-nothing: it writes
the five exact-size RGBA masks, a machine-readable review report, and QA
overlays only when every class/cell/role has exactly one unambiguous authored
component.
"""

from __future__ import annotations

import argparse
import json
import math
from collections import deque
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
PLAYER_ROOT = ROOT / "assets" / "sprites_src" / "players"
REPORT_PATH = ROOT / "assets" / "sprites" / "player_rig_hand_review.json"
QA_ROOT = ROOT / "assets" / "sprites" / "player_rig_hand_qa"
CLASSES = ("vanguard", "emberwitch", "gravebinder", "wildkeeper", "veilranger")
COLS, ROWS = 8, 7
DIRECTIONS = ("E", "SE", "S", "SW", "W", "NW", "N", "NE")
ROLES = ("main", "off")
COLORS = {"main": (255, 0, 0, 255), "off": (0, 255, 255, 255)}
MIN_MARKER_PIXELS = 3
MIN_ACTOR_PIXELS = 200
MAX_ACTOR_DISTANCE = 32.0
ART_OVERLAP_REJECT = 0.55


def is_main(r: int, g: int, b: int) -> bool:
    return r >= 220 and g <= 70 and b <= 70 and r - max(g, b) >= 150


def is_off(r: int, g: int, b: int) -> bool:
    return b >= 200 and g >= 150 and r <= 70 and min(g, b) - r >= 120


ROLE_TESTS: dict[str, Callable[[int, int, int], bool]] = {"main": is_main, "off": is_off}


@dataclass
class Component:
    ident: int
    pixels: list[tuple[int, int]]
    bbox: tuple[int, int, int, int]
    centroid: tuple[float, float]

    @property
    def area(self) -> int:
        return len(self.pixels)


def components(mask: bytearray, width: int, height: int, minimum: int) -> list[Component]:
    """Return 8-connected components, consuming a private byte mask."""
    found: list[Component] = []
    queue: deque[int] = deque()
    for start in range(width * height):
        if not mask[start]:
            continue
        mask[start] = 0
        queue.append(start)
        points: list[tuple[int, int]] = []
        x0 = x1 = start % width
        y0 = y1 = start // width
        while queue:
            pos = queue.popleft()
            x, y = pos % width, pos // width
            points.append((x, y))
            x0 = min(x0, x); x1 = max(x1, x)
            y0 = min(y0, y); y1 = max(y1, y)
            for ny in range(max(0, y - 1), min(height, y + 2)):
                base = ny * width
                for nx in range(max(0, x - 1), min(width, x + 2)):
                    nxt = base + nx
                    if mask[nxt]:
                        mask[nxt] = 0
                        queue.append(nxt)
        if len(points) >= minimum:
            sx = sum(p[0] for p in points); sy = sum(p[1] for p in points)
            found.append(Component(len(found), points, (x0, y0, x1 + 1, y1 + 1),
                                   (sx / len(points), sy / len(points))))
    return found


def decode_masks(image: Image.Image) -> tuple[bytearray, dict[str, bytearray]]:
    rgb = image.convert("RGB")
    raw = rgb.tobytes()
    count = image.width * image.height
    body = bytearray(count)
    marker = {role: bytearray(count) for role in ROLES}
    for pos in range(count):
        r, g, b = raw[pos * 3:pos * 3 + 3]
        main, off = is_main(r, g, b), is_off(r, g, b)
        marker["main"][pos] = main
        marker["off"][pos] = off
        # Black is the authored overlay background. Marker-colored pixels are
        # excluded so dots cannot merge actors or distort actor bounds.
        body[pos] = not main and not off and max(r, g, b) >= 10
    return body, marker


def ordered_actors(raw: Image.Image, body_mask: bytearray) -> list[Component]:
    actors = components(body_mask, raw.width, raw.height, MIN_ACTOR_PIXELS)
    if len(actors) != COLS * ROWS:
        raise RuntimeError(
            f"{len(actors)} actor components found in {raw.width}x{raw.height}; expected exactly {COLS * ROWS}"
        )
    # Rows are visually separated by much more than within-row centroid drift.
    # Chunking the y-sort avoids imposing nominal cell boundaries on actors.
    y_sorted = sorted(actors, key=lambda c: (c.centroid[1], c.centroid[0]))
    ordered: list[Component] = []
    for row in range(ROWS):
        band = y_sorted[row * COLS:(row + 1) * COLS]
        ordered.extend(sorted(band, key=lambda c: c.centroid[0]))
    for index, actor in enumerate(ordered):
        actor.ident = index
    return ordered


def grid_bounds(length: int, index: int, divisions: int) -> tuple[int, int]:
    return round(index * length / divisions), round((index + 1) * length / divisions)


def approved_actor_box(approved: Image.Image, index: int) -> tuple[int, int, int, int]:
    col, row = index % COLS, index // COLS
    x0, x1 = grid_bounds(approved.width, col, COLS)
    y0, y1 = grid_bounds(approved.height, row, ROWS)
    alpha = approved.getchannel("A").crop((x0, y0, x1, y1)).point(lambda a: 255 if a > 3 else 0)
    box = alpha.getbbox()
    if not box:
        raise RuntimeError(f"approved actor cell row={row} col={col} is empty")
    return x0 + box[0], y0 + box[1], x0 + box[2], y0 + box[3]


def bbox_distance(point: tuple[float, float], box: tuple[int, int, int, int]) -> float:
    x, y = point
    dx = max(box[0] - x, 0.0, x - (box[2] - 1))
    dy = max(box[1] - y, 0.0, y - (box[3] - 1))
    return math.hypot(dx, dy)


def affine_point(point: tuple[float, float], source: tuple[int, int, int, int],
                 target: tuple[int, int, int, int]) -> tuple[float, float]:
    sw, sh = max(1, source[2] - source[0]), max(1, source[3] - source[1])
    sx = (target[2] - target[0]) / sw
    sy = (target[3] - target[1]) / sh
    return target[0] + (point[0] - source[0]) * sx, target[1] + (point[1] - source[1]) * sy


def aligned_art_overlap(component: Component, role: str, source_box: tuple[int, int, int, int],
                        target_box: tuple[int, int, int, int], approved: Image.Image) -> float:
    """Fraction of component pixels with same-role approved art nearby.

    A 2px neighbourhood tolerates raster rounding and slight silhouette drift.
    This is only a rejection signal: it can identify an existing red eye/cyan
    costume pixel, but cannot manufacture or move an annotation.
    """
    pixels = approved.convert("RGB").load()
    test = ROLE_TESTS[role]
    matches = 0
    for point in component.pixels:
        tx, ty = affine_point(point, source_box, target_box)
        ix, iy = round(tx), round(ty)
        matched = False
        for yy in range(max(0, iy - 2), min(approved.height, iy + 3)):
            for xx in range(max(0, ix - 2), min(approved.width, ix + 3)):
                if test(*pixels[xx, yy]):
                    matched = True
                    break
            if matched:
                break
        matches += matched
    return matches / component.area


def mapped_marker_geometry(component: Component, source_box: tuple[int, int, int, int],
                           target_box: tuple[int, int, int, int]) -> dict:
    cx, cy = affine_point(component.centroid, source_box, target_box)
    p0 = affine_point((component.bbox[0], component.bbox[1]), source_box, target_box)
    p1 = affine_point((component.bbox[2], component.bbox[3]), source_box, target_box)
    radius_x = max(2, round(abs(p1[0] - p0[0]) / 2))
    radius_y = max(2, round(abs(p1[1] - p0[1]) / 2))
    return {"centroid": [round(cx, 3), round(cy, 3)], "radius": [radius_x, radius_y]}


def candidate_record(component: Component, actor: Component, target_box: tuple[int, int, int, int],
                     role: str, approved: Image.Image) -> dict:
    overlap = aligned_art_overlap(component, role, actor.bbox, target_box, approved)
    distance = bbox_distance(component.centroid, actor.bbox)
    geometry = mapped_marker_geometry(component, actor.bbox, target_box)
    return {
        "component": component.ident,
        "area": component.area,
        "bbox": list(component.bbox),
        "centroid": [round(component.centroid[0], 3), round(component.centroid[1], 3)],
        "actorDistance": round(distance, 3),
        "approvedSameRoleOverlap": round(overlap, 4),
        "mapped": geometry,
        "eligible": distance <= MAX_ACTOR_DISTANCE and overlap < ART_OVERLAP_REJECT,
        "rejection": (
            "too-far-from-actor" if distance > MAX_ACTOR_DISTANCE else
            "matches-approved-costume-pixels" if overlap >= ART_OVERLAP_REJECT else None
        ),
    }


def scan_class(class_id: str) -> dict:
    overlay_path = PLAYER_ROOT / f"{class_id}_hand_markers.png"
    alpha_path = PLAYER_ROOT / f"{class_id}_undergear_alpha.png"
    chroma_path = PLAYER_ROOT / f"{class_id}_undergear_chroma.png"
    if not overlay_path.exists() or not alpha_path.exists() or not chroma_path.exists():
        raise RuntimeError(f"{class_id}: missing overlay, approved alpha, or approved chroma source")
    overlay = Image.open(overlay_path).convert("RGB")
    approved = Image.open(alpha_path).convert("RGBA")
    chroma = Image.open(chroma_path)
    if approved.size != chroma.size:
        raise RuntimeError(f"{class_id}: approved alpha {approved.size} != chroma {chroma.size}")
    body_mask, marker_masks = decode_masks(overlay)
    actors = ordered_actors(overlay, body_mask)
    target_boxes = [approved_actor_box(approved, index) for index in range(COLS * ROWS)]
    role_components = {
        role: components(mask, overlay.width, overlay.height, MIN_MARKER_PIXELS)
        for role, mask in marker_masks.items()
    }

    # Associate each global component with exactly one segmented actor by
    # nearest body geometry.  This is intentionally independent of grid edges.
    assigned: dict[tuple[int, str], list[Component]] = {
        (index, role): [] for index in range(COLS * ROWS) for role in ROLES
    }
    for role in ROLES:
        for comp in role_components[role]:
            distances = [bbox_distance(comp.centroid, actor.bbox) for actor in actors]
            index = min(range(len(actors)), key=lambda i: distances[i])
            assigned[(index, role)].append(comp)

    cells = []
    ambiguities = []
    selected: dict[tuple[int, str], dict] = {}
    for index, actor in enumerate(actors):
        row, col = divmod(index, COLS)
        cell = {
            "index": index, "row": row, "col": col, "direction": DIRECTIONS[col],
            "rawActor": {"area": actor.area, "bbox": list(actor.bbox),
                         "centroid": [round(actor.centroid[0], 3), round(actor.centroid[1], 3)]},
            "approvedActorBBox": list(target_boxes[index]), "roles": {},
        }
        for role in ROLES:
            records = [candidate_record(comp, actor, target_boxes[index], role, approved)
                       for comp in assigned[(index, role)]]
            eligible = [record for record in records if record["eligible"]]
            status = "ok" if len(eligible) == 1 else "missing" if not eligible else "ambiguous"
            chosen = eligible[0] if len(eligible) == 1 else None
            cell["roles"][role] = {"status": status, "chosen": chosen, "candidates": records}
            if chosen:
                selected[(index, role)] = chosen
            else:
                ambiguities.append({
                    "class": class_id, "index": index, "row": row, "col": col,
                    "direction": DIRECTIONS[col], "role": role, "kind": status,
                    "eligibleComponents": [record["component"] for record in eligible],
                    "allCandidates": [record["component"] for record in records],
                })
        cells.append(cell)
    return {
        "class": class_id,
        "paths": {
            "overlay": overlay_path.relative_to(ROOT).as_posix(),
            "approvedAlpha": alpha_path.relative_to(ROOT).as_posix(),
            "approvedChroma": chroma_path.relative_to(ROOT).as_posix(),
            "mask": (PLAYER_ROOT / f"{class_id}_hand_marker_mask.png").relative_to(ROOT).as_posix(),
        },
        "overlaySize": list(overlay.size), "targetSize": list(approved.size),
        "actorComponents": len(actors),
        "markerComponents": {role: len(role_components[role]) for role in ROLES},
        "cells": cells, "ambiguities": ambiguities,
        "_overlay": overlay, "_approved": approved, "_actors": actors,
        "_selected": selected,
    }


def render_mask(result: dict) -> Image.Image:
    target = result["_approved"]
    mask = Image.new("RGBA", target.size)
    draw = ImageDraw.Draw(mask)
    for (index, role), chosen in result["_selected"].items():
        cx, cy = chosen["mapped"]["centroid"]
        rx, ry = chosen["mapped"]["radius"]
        col, row = index % COLS, index // COLS
        x0, x1 = grid_bounds(target.width, col, COLS)
        y0, y1 = grid_bounds(target.height, row, ROWS)
        bounds = (
            max(x0, round(cx) - rx), max(y0, round(cy) - ry),
            min(x1 - 1, round(cx) + rx), min(y1 - 1, round(cy) + ry),
        )
        if bounds[0] > bounds[2] or bounds[1] > bounds[3]:
            raise RuntimeError(f"{result['class']} cell {index} {role}: mapped marker lies outside target cell")
        draw.ellipse(bounds, fill=COLORS[role])
    return mask


def render_qa(result: dict, mask: Image.Image) -> Image.Image:
    overlay = result["_overlay"].convert("RGBA")
    approved = result["_approved"].copy()
    approved.alpha_composite(mask)
    left = overlay.copy(); ld = ImageDraw.Draw(left)
    for index, actor in enumerate(result["_actors"]):
        ld.rectangle(actor.bbox, outline=(255, 255, 255, 255), width=1)
        ld.text((actor.bbox[0] + 2, actor.bbox[1] + 2), str(index), fill=(255, 255, 255, 255))
    for cell in result["cells"]:
        for role in ROLES:
            chosen = cell["roles"][role]["chosen"]
            if chosen:
                ld.rectangle(chosen["bbox"], outline=COLORS[role], width=2)
    right = approved; rd = ImageDraw.Draw(right)
    for row in range(ROWS):
        y0, _ = grid_bounds(right.height, row, ROWS)
        rd.line((0, y0, right.width, y0), fill=(255, 255, 255, 150))
    for col in range(COLS):
        x0, _ = grid_bounds(right.width, col, COLS)
        rd.line((x0, 0, x0, right.height), fill=(255, 255, 255, 150))
    canvas = Image.new("RGBA", (left.width + right.width, max(left.height, right.height)), (25, 25, 25, 255))
    canvas.alpha_composite(left, (0, 0)); canvas.alpha_composite(right, (left.width, 0))
    return canvas


def serializable(result: dict) -> dict:
    return {key: value for key, value in result.items() if not key.startswith("_")}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write", action="store_true", help="atomically emit masks/report/QA when ambiguity count is zero")
    args = parser.parse_args()

    results = [scan_class(class_id) for class_id in CLASSES]
    ambiguities = [item for result in results for item in result["ambiguities"]]
    summary = {
        result["class"]: {
            "actors": result["actorComponents"],
            "markers": result["markerComponents"],
            "ambiguities": len(result["ambiguities"]),
        }
        for result in results
    }
    print(json.dumps({"summary": summary, "ambiguityCount": len(ambiguities),
                      "ambiguities": ambiguities}, indent=2))
    if not args.write:
        return
    if ambiguities:
        raise SystemExit(f"refusing to write: {len(ambiguities)} missing/ambiguous cell-role annotations")

    masks = {result["class"]: render_mask(result) for result in results}
    # Validate the final invariant before writing anything.
    for result in results:
        mask = masks[result["class"]]
        _, role_masks = decode_masks(mask.convert("RGB"))
        for role in ROLES:
            comps = components(role_masks[role], mask.width, mask.height, MIN_MARKER_PIXELS)
            if len(comps) != COLS * ROWS:
                raise RuntimeError(f"{result['class']} final {role} mask has {len(comps)} components, expected 56")

    QA_ROOT.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    for result in results:
        class_id = result["class"]
        masks[class_id].save(PLAYER_ROOT / f"{class_id}_hand_marker_mask.png", "PNG", compress_level=7)
        render_qa(result, masks[class_id]).save(QA_ROOT / f"{class_id}_hand_marker_qa.png", "PNG", compress_level=7)
    report = {
        "version": 1,
        "method": "independent-marker-masks",
        "status": "pass",
        "selectionRule": (
            "Globally detect 8-connected authored red/cyan components; order exactly 56 non-marker actor "
            "components by centroid rows/columns; assign each marker to its nearest actor bbox; map through "
            "that actor's bbox to the approved undergear bbox; reject only candidates that are too far or "
            "overlap same-role pixels in aligned approved art; require exactly one survivor per cell and role."
        ),
        "thresholds": {
            "minimumMarkerPixels": MIN_MARKER_PIXELS,
            "minimumActorPixels": MIN_ACTOR_PIXELS,
            "maximumActorDistance": MAX_ACTOR_DISTANCE,
            "approvedSameRoleOverlapReject": ART_OVERLAP_REJECT,
            "connectivity": 8,
        },
        "ambiguityCount": 0,
        "classes": {result["class"]: serializable(result) for result in results},
    }
    REPORT_PATH.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"wrote 5 reviewed masks, report {REPORT_PATH.relative_to(ROOT)}, and QA overlays {QA_ROOT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
