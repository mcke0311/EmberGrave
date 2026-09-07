#!/usr/bin/env python3
"""Assemble and validate the authored neutral player body atlas.

This helper is deliberately *not* part of the runtime build.  It performs the
body-source work: alpha-cleans approved chroma sheets, assembles the true nine
poses, and records explicit sockets/ROIs. It never creates equipment geometry.
``build_sprite_assets.py`` only validates and packs checked-in RGBA sheets.

Normal maintenance workflow::

    python tools/author_player_rig.py --write-body

Use ``--refresh-registration`` only when a body source has intentionally been
re-authored and its hand/head/torso registration must be reviewed again.
"""

from __future__ import annotations

import argparse
import json
import math
import statistics
from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
PLAYER_INPUT = ROOT / "assets" / "sprites_src" / "players"
RIG_ROOT = ROOT / "assets" / "sprites_src" / "player_rig"
REGISTRATION = RIG_ROOT / "registrations.json"
BODY_IDENTITY_LANDMARKS = RIG_ROOT / "qa" / "body_identity_landmarks_v1.json"
HAND_REGISTRATION_NAME = "hand_registration.png"
AUTHORED_ROW_METHOD = "uniform-row-scale-final-alignment-v1"
SUPPLEMENTAL_POSES = ("cast", "hit", "death")

# Authored-row identity calibration. Each factor is one uniform transform for
# all eight directions in that class/pose. Values were chosen from reviewed
# final-body head/torso landmark overlays, never from per-frame silhouette fit.
# The final landmark artifact independently gates every direction at ±15%.
ROW_IDENTITY_SCALE_ADJUSTMENTS = {
    "vanguard": {"cast": 1.0, "hit": .80, "death": .90},
    "emberwitch": {"cast": 1.0, "hit": .72, "death": .82},
    "gravebinder": {"cast": 1.0, "hit": .68, "death": .82},
    "wildkeeper": {"cast": 1.0, "hit": .72, "death": 1.0},
    "veilranger": {"cast": .90, "hit": .75, "death": 1.0},
}

CELL = 192
COLS = 8
ROWS = 9
ATLAS_SIZE = (CELL * COLS, CELL * ROWS)
ANCHOR = (96, 184)
REVISION = "grip-rig-v1"
DIRECTIONS = ("E", "SE", "S", "SW", "W", "NW", "N", "NE")
POSES = ("idle", "walkA", "walkB", "attackWindup", "attackImpact", "cast", "hit", "death", "dead")
# Base v2 contains idle/walkA/walkB/attackWindup/attackImpact/death/dead.
# The independently authored 8x2 supplement contains cast (row 0) and the
# standing/kneeling recoil used for hit (row 1).  This ordering gives the
# runtime a visually monotonic hit -> death -> dead collapse sequence.
SOURCE_ROWS = (0, 1, 2, 3, 4, "cast", "hit", "death", 6)
CLASSES = ("vanguard", "emberwitch", "gravebinder", "wildkeeper", "veilranger")
MAIN_FAMILIES = (
    "sword_1h", "sword_2h", "axe_1h", "axe_2h", "mace_1h", "mace_2h",
    "dagger_1h", "spear_2h", "bow_2h", "crossbow_2h", "wand_1h", "staff_2h",
)
ARMOR_FAMILIES = ("light", "mail", "plate", "mythic")
MATERIAL_TIERS = (
    "#6f5742", "#7c7e84", "#9aa0a8", "#b6bec8", "#b9a878", "#cdd6e0",
    "#8f98ac", "#aeb8cc", "#dde8f4", "#e8dfc6", "#2c2832", "#f3edd4",
    "#f6c45e", "#d2f0e2",
)

def trim(img: Image.Image, threshold: int = 3) -> Image.Image:
    alpha = img.getchannel("A").point(lambda a: 255 if a > threshold else 0)
    box = alpha.getbbox()
    return img.crop(box) if box else Image.new("RGBA", (1, 1))


def contain(img: Image.Image, width: int, height: int) -> Image.Image:
    img = trim(img)
    scale = min(width / max(1, img.width), height / max(1, img.height))
    size = (max(1, round(img.width * scale)), max(1, round(img.height * scale)))
    return img.resize(size, Image.Resampling.LANCZOS)


def chroma_to_alpha(path: Path) -> Image.Image:
    """Remove the generated sheet's flat green matte and despill soft edges.

    Image authoring does not preserve an exact ``#00ff00`` value: the approved
    sheets use several dark and antialiased greens.  Measure *green dominance*
    instead of distance to one key swatch.  This is deterministic source
    cleanup only; it never changes actor geometry or repositions a frame.
    """
    rgb = Image.open(path).convert("RGB")
    source = rgb.load()
    out = Image.new("RGBA", rgb.size)
    target = out.load()
    for y in range(rgb.height):
        for x in range(rgb.width):
            r, g, b = source[x, y]
            dominance = g - max(r, b)
            ratio = g / max(1, max(r, b))
            # Broad enough to catch the dark green fields present in the v2
            # clean-body/supplement sheets while retaining muted costume pixels.
            key_strength = max((dominance - 13) / 54, (ratio - 1.13) / .92)
            key_strength = max(0.0, min(1.0, key_strength))
            a = round(255 * (1.0 - key_strength))
            if dominance >= 48 and ratio >= 1.55:
                a = 0
            elif dominance <= 13 or ratio <= 1.13:
                a = 255
            # Despill only translucent boundary pixels.
            clean_g = min(g, max(r, b) + 18) if a < 245 else g
            target[x, y] = (r, clean_g, b, a)
    return out


def source_frame(source: Image.Image, source_row: int, row_count: int, col: int) -> Image.Image:
    x0 = round(col * source.width / COLS)
    x1 = round((col + 1) * source.width / COLS)
    y0 = round(source_row * source.height / row_count)
    y1 = round((source_row + 1) * source.height / row_count)
    return source.crop((x0, y0, x1, y1))


def isolate_primary_actor(cell: Image.Image) -> tuple[Image.Image, int]:
    """Remove disconnected cross-cell debris without altering actor pixels.

    Authored contact sheets can place a few pixels from a neighboring grid
    figure across the nominal cell boundary.  A gameplay body cell contains
    exactly one connected actor, so retain that largest 8-connected alpha
    component verbatim and clear only disconnected contamination.
    """
    visible = {
        (x, y)
        for y in range(cell.height)
        for x in range(cell.width)
        if cell.getpixel((x, y))[3] > 3
    }
    if not visible:
        raise RuntimeError("authored source frame has no visible actor pixels")
    remaining = set(visible)
    components: list[set[tuple[int, int]]] = []
    while remaining:
        start = remaining.pop()
        component = {start}
        work = deque([start])
        while work:
            x, y = work.popleft()
            for yy in range(max(0, y - 1), min(cell.height, y + 2)):
                for xx in range(max(0, x - 1), min(cell.width, x + 2)):
                    point = (xx, yy)
                    if point in remaining:
                        remaining.remove(point)
                        component.add(point)
                        work.append(point)
        components.append(component)
    primary = max(components, key=len)
    cleaned = Image.new("RGBA", cell.size)
    source_pixels = cell.load()
    target_pixels = cleaned.load()
    for x, y in primary:
        target_pixels[x, y] = source_pixels[x, y]
    return cleaned, len(visible) - len(primary)


def despill_green(img: Image.Image) -> Image.Image:
    """Remove chroma-green RGB from visible pixels without changing alpha."""
    out = img.copy().convert("RGBA")
    pixels = out.load()
    for y in range(out.height):
        for x in range(out.width):
            r, g, b, alpha = pixels[x, y]
            if alpha == 0:
                pixels[x, y] = (0, 0, 0, 0)
                continue
            # These five neutral-undergear palettes contain no intentional
            # saturated green. Clamp only green excess; preserve luminance,
            # alpha, silhouettes, and the authored red/blue balance.
            neutral_green = max(r, b)
            if g > neutral_green + 6:
                g = neutral_green + 6
            pixels[x, y] = (r, g, b, alpha)
    return out


def clean_disconnected_source(path: Path, row_count: int) -> int:
    """Freeze per-cell actor-only alpha while preserving the raw chroma source."""
    source = Image.open(path).convert("RGBA")
    cleaned = Image.new("RGBA", source.size)
    removed = 0
    for source_row in range(row_count):
        y0 = round(source_row * source.height / row_count)
        for col in range(COLS):
            x0 = round(col * source.width / COLS)
            cell, count = isolate_primary_actor(source_frame(source, source_row, row_count, col))
            cleaned.alpha_composite(cell, (x0, y0))
            removed += count
    cleaned = despill_green(cleaned)
    cleaned.save(path, "PNG", compress_level=7)
    return removed


def class_body_scale(source: Image.Image) -> float:
    """Choose one base-sheet scale that leaves padding in all retained poses."""
    heights = [
        trim(source_frame(source, source_row, 7, col)).height
        for source_row in (0, 1, 2, 3, 4, 6) for col in range(COLS)
    ]
    if not heights or max(heights) <= 1:
        raise RuntimeError("approved body has no retained authored frames")
    return (CELL - 12) / max(heights)


def place_body_frame(raw: Image.Image, scale: float) -> Image.Image:
    """Scale with the shared class factor and place on the fixed root anchor."""
    raw = trim(raw)
    size = (max(1, round(raw.width * scale)), max(1, round(raw.height * scale)))
    fitted = raw.resize(size, Image.Resampling.LANCZOS)
    if fitted.width > CELL:
        raise RuntimeError(
            f"authored pose is {fitted.width}px wide at the class-wide scale; "
            "re-author with cell padding instead of per-frame shrinking"
        )
    if fitted.height > ANCHOR[1]:
        raise RuntimeError(
            f"authored pose is {fitted.height}px high at the class-wide scale; "
            "re-author with cell padding instead of per-frame shrinking"
        )
    cell = Image.new("RGBA", (CELL, CELL))
    cell.alpha_composite(fitted, ((CELL - fitted.width) // 2, ANCHOR[1] - fitted.height))
    # LANCZOS can leave a few isolated translucent matte pixels after scaling
    # a chroma-clean source. Keep the connected actor verbatim and discard
    # only those post-resample islands; no geometry is moved or manufactured.
    cleaned, _ = isolate_primary_actor(cell)
    return despill_green(cleaned)


def normalize_body_source(source: Image.Image, authored_rows: dict[str, Image.Image]) -> Image.Image:
    atlas = Image.new("RGBA", ATLAS_SIZE)
    scale = class_body_scale(source)
    for out_row, source_row in enumerate(SOURCE_ROWS):
        pose = POSES[out_row]
        if pose in SUPPLEMENTAL_POSES:
            row = authored_rows.get(pose)
            if row is None or row.mode != "RGBA" or row.size != (CELL * COLS, CELL):
                raise RuntimeError(f"missing final-aligned authored {pose} row")
            atlas.alpha_composite(row, (0, out_row * CELL))
            continue
        for col in range(COLS):
            raw = trim(source_frame(source, source_row, 7, col))
            cell = place_body_frame(raw, scale)
            atlas.alpha_composite(cell, (col * CELL, out_row * CELL))
    return atlas


def _raw_bbox(img: Image.Image) -> list[int]:
    box = img.getchannel("A").point(lambda value: 255 if value > 3 else 0).getbbox()
    if not box:
        raise RuntimeError("authored source frame has no visible pixels")
    return [box[0], box[1], box[2] - box[0], box[3] - box[1]]


def _row_source(class_id: str, pose: str) -> tuple[Path, int, int]:
    if pose in ("cast", "hit"):
        return PLAYER_INPUT / f"{class_id}_cast_death_alpha.png", (0 if pose == "cast" else 1), 2
    version = "v3" if class_id == "wildkeeper" else "v2"
    return PLAYER_INPUT / f"{class_id}_death_{version}_alpha.png", 0, 1


def authored_row_scale(class_id: str, base: Image.Image, source: Image.Image, source_row: int,
                       source_rows: int, pose: str) -> tuple[float, float]:
    """Return one scale for all directions in a supplemental authored row.

    Calibration uses class-reference pose height, not each supplemental frame.
    Collapse death is intentionally 88% of attack-impact height because the
    body is foreshortened.  Width/height limits may only reduce the row scale;
    if that would shrink identity over 20%, authoring fails closed.
    """
    base_scale = class_body_scale(base)
    reference_row = 0 if pose == "cast" else 4
    reference_height = statistics.median(
        trim(source_frame(base, reference_row, 7, col)).height * base_scale
        for col in range(COLS)
    )
    if pose == "death":
        reference_height *= .88
    raw = [trim(source_frame(source, source_row, source_rows, col)) for col in range(COLS)]
    desired = reference_height / statistics.median(cell.height for cell in raw)
    fit = min(
        (CELL - 8) / max(cell.width for cell in raw),
        (ANCHOR[1] - 4) / max(cell.height for cell in raw),
    )
    scale = min(desired, fit) * ROW_IDENTITY_SCALE_ADJUSTMENTS[class_id][pose]
    identity_delta = statistics.median(cell.height * scale for cell in raw) / reference_height - 1
    # Total bbox height is diagnostic only for collapse poses; horizontal death
    # naturally loses height while retaining head/torso pixel scale.  The QA
    # head landmark report and visual contact sheet are the identity gate.
    # Explicit reviewed landmark calibration may intentionally reduce total
    # bbox height for kneeling/recoil poses. The final head/torso landmark gate
    # is authoritative; total silhouette height is not an identity metric.
    return round(scale, 8), round(identity_delta, 8)


def align_authored_row(class_id: str, base: Image.Image, pose: str,
                       write: bool) -> tuple[Image.Image, dict]:
    source_path, source_row, source_rows = _row_source(class_id, pose)
    if not source_path.is_file():
        raise RuntimeError(f"missing alpha-clean authored {pose} source: {source_path}")
    source = Image.open(source_path).convert("RGBA")
    scale, identity_delta = authored_row_scale(class_id, base, source, source_row, source_rows, pose)
    output = RIG_ROOT / class_id / "authored_rows" / f"{pose}.png"
    row = Image.new("RGBA", (CELL * COLS, CELL))
    raw_boxes: list[list[int]] = []
    scaled_boxes: list[list[int]] = []
    clipped: list[int] = []
    for col in range(COLS):
        source_cell = source_frame(source, source_row, source_rows, col)
        source_box = _raw_bbox(source_cell)
        raw_boxes.append(source_box)
        raw = source_cell.crop((source_box[0], source_box[1], source_box[0] + source_box[2], source_box[1] + source_box[3]))
        size = (max(1, round(raw.width * scale)), max(1, round(raw.height * scale)))
        fitted = raw.resize(size, Image.Resampling.LANCZOS)
        x = (CELL - fitted.width) // 2; y = ANCHOR[1] - fitted.height
        if x <= 0 or y <= 0 or x + fitted.width >= CELL or y + fitted.height >= CELL:
            clipped.append(col)
            continue
        cell = Image.new("RGBA", (CELL, CELL)); cell.alpha_composite(fitted, (x, y))
        final_box = _raw_bbox(cell)
        scaled_boxes.append(final_box)
        row.alpha_composite(despill_green(cell), (col * CELL, 0))
    if clipped:
        raise RuntimeError(f"{class_id}/{pose} clipped final cells {clipped}")
    meta = {
        "source": source_rel(source_path), "sourceRow": source_row,
        "sourceRowScale": scale, "output": source_rel(output),
        "rawBBoxes": raw_boxes, "scaledBBoxes": scaled_boxes,
        "identityScaleMethod": "uniform-authored-row-transform",
        "scaleVariation": 0.0,
        "clipped": clipped, "identityHeightDelta": identity_delta,
    }
    row = despill_green(row)
    if write:
        output.parent.mkdir(parents=True, exist_ok=True)
        row.save(output, "PNG", compress_level=7)
    return row, meta


def write_authored_row_qa(rows: dict[str, dict[str, Image.Image]], provenance: dict[str, dict]) -> Path:
    qa_root = RIG_ROOT / "qa"
    qa_root.mkdir(parents=True, exist_ok=True)
    qa_path = qa_root / "authored_row_alignment_v1.json"
    qa = {
        "version": 1, "method": AUTHORED_ROW_METHOD,
        "sources": {
            class_id: {
                pose: {key: value for key, value in provenance[class_id][pose].items()
                       if key != "identityHeightDelta"}
                for pose in SUPPLEMENTAL_POSES
            }
            for class_id in CLASSES
        },
    }
    qa_path.write_text(json.dumps(qa, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    for class_id in CLASSES:
        contact = Image.new("RGBA", (CELL * COLS, CELL * len(SUPPLEMENTAL_POSES)), (20, 19, 23, 255))
        draw = ImageDraw.Draw(contact)
        for pose_index, pose in enumerate(SUPPLEMENTAL_POSES):
            contact.alpha_composite(rows[class_id][pose], (0, pose_index * CELL))
            for col, direction in enumerate(DIRECTIONS):
                x, y = col * CELL, pose_index * CELL
                draw.rectangle((x, y, x + CELL - 1, y + CELL - 1), outline=(76, 73, 84, 255))
                draw.text((x + 3, y + 3), f"{pose} {direction}", fill=(255, 226, 96, 255),
                          stroke_width=2, stroke_fill=(0, 0, 0, 255))
                draw.line((x + 86, y + ANCHOR[1], x + 106, y + ANCHOR[1]), fill=(255, 80, 205, 255))
        contact.save(qa_root / f"{class_id}_authored_rows_v1.png", "PNG", compress_level=7)
    return qa_path


def write_body_qa(bodies: dict[str, Image.Image]) -> Path:
    """Write body-only final-atlas QA without requiring socket metadata."""
    qa_root = RIG_ROOT / "qa"
    qa_root.mkdir(parents=True, exist_ok=True)
    report: dict[str, dict] = {}
    for class_id in CLASSES:
        atlas = bodies[class_id]
        contact = Image.new("RGBA", ATLAS_SIZE, (20, 19, 23, 255))
        draw = ImageDraw.Draw(contact)
        cells = []
        for index in range(ROWS * COLS):
            col, row = index % COLS, index // COLS
            cell = frame(atlas, index)
            box = _raw_bbox(cell)
            if box[0] <= 0 or box[1] <= 0 or box[0] + box[2] >= CELL or box[1] + box[3] >= CELL:
                raise RuntimeError(f"{class_id} body frame {index} touches cell edge: {box}")
            if box[1] + box[3] != ANCHOR[1]:
                raise RuntimeError(f"{class_id} body frame {index} root drift: {box}")
            cells.append({"index": index, "pose": POSES[row], "direction": DIRECTIONS[col], "alphaBBox": box})
            x, y = col * CELL, row * CELL
            contact.alpha_composite(cell, (x, y))
            draw.rectangle((x, y, x + CELL - 1, y + CELL - 1), outline=(76, 73, 84, 255))
            draw.text((x + 3, y + 3), f"{POSES[row]} {DIRECTIONS[col]}", fill=(255, 226, 96, 255),
                      stroke_width=2, stroke_fill=(0, 0, 0, 255))
            draw.line((x + 86, y + ANCHOR[1], x + 106, y + ANCHOR[1]), fill=(255, 80, 205, 255))
        contact.save(qa_root / f"{class_id}_body_8x9_v1.png", "PNG", compress_level=7)
        report[class_id] = {
            "source": source_rel(PLAYER_INPUT / f"{class_id}_undergear_v2_alpha.png"),
            "output": source_rel(RIG_ROOT / class_id / "body.png"),
            "baseSourceScale": round(class_body_scale(
                Image.open(PLAYER_INPUT / f"{class_id}_undergear_v2_alpha.png").convert("RGBA")
            ), 8),
            "finalRigScale": 1.0,
            "scaleMethod": "class-shared-final-aligned",
            "cells": cells,
        }
    path = qa_root / "body_8x9_alignment_v1.json"
    path.write_text(json.dumps({"version": 1, "classes": report}, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return path


def frame(atlas: Image.Image, index: int) -> Image.Image:
    col, row = index % COLS, index // COLS
    return atlas.crop((col * CELL, row * CELL, (col + 1) * CELL, (row + 1) * CELL))


def marker_component(cell: Image.Image, role: str) -> tuple[list[int], list[int]]:
    """Extract an independently authored red/cyan palm marker and ROI."""
    pixels = cell.convert("RGB")
    points = []
    for y in range(cell.height):
        for x in range(cell.width):
            r, g, b = pixels.getpixel((x, y))
            if role == "main":
                marked = r >= 220 and g <= 70 and b <= 70 and r - max(g, b) >= 150
            else:
                marked = b >= 200 and g >= 150 and r <= 70 and min(g, b) - r >= 120
            if marked:
                points.append((x, y))
    if len(points) < 3:
        raise RuntimeError(f"marker sheet is missing {role} palm annotation")
    xs, ys = zip(*points)
    cx, cy = round(sum(xs) / len(xs)), round(sum(ys) / len(ys))
    x0, y0, x1, y1 = min(xs), min(ys), max(xs) + 1, max(ys) + 1
    pad = 4
    roi = [max(0, x0 - pad), max(0, y0 - pad), min(CELL, x1 + pad) - max(0, x0 - pad),
           min(CELL, y1 + pad) - max(0, y0 - pad)]
    return [cx, cy], roi


def marker_frame(marker_atlas: Image.Image, out_index: int) -> Image.Image:
    """Read one final-aligned authored marker cell without any transformation."""
    if marker_atlas.mode != "RGBA" or marker_atlas.size != ATLAS_SIZE:
        raise RuntimeError(
            f"hand registration atlas must be final-aligned RGBA {ATLAS_SIZE}; "
            f"got {marker_atlas.mode} {marker_atlas.size}"
        )
    return frame(marker_atlas, out_index)


def landmark_roi(line: list[list[float]], padding: int) -> list[int]:
    """Convert a reviewed anatomical width line into the frozen exclusive ROI."""
    xs = [point[0] for point in line]
    ys = [point[1] for point in line]
    x0 = max(0, math.floor(min(xs)) - padding)
    y0 = max(0, math.floor(min(ys)) - padding)
    x1 = min(CELL, math.ceil(max(xs)) + padding + 1)
    y1 = min(CELL, math.ceil(max(ys)) + padding + 1)
    if x1 <= x0 or y1 <= y0:
        raise RuntimeError("authored anatomical landmark produced an empty ROI")
    return [x0, y0, x1 - x0, y1 - y0]


def register_frame(cell: Image.Image, marker_cell: Image.Image, class_id: str, index: int,
                   identity_frame: dict) -> dict:
    box = cell.getchannel("A").getbbox()
    if not box:
        raise RuntimeError(f"{class_id} frame {index} has no body pixels")
    pose_index, direction_index = index // COLS, index % COLS
    main, main_hand_roi = marker_component(marker_cell, "main")
    off, off_hand_roi = marker_component(marker_cell, "off")
    expected_identity = {
        "index": index, "pose": POSES[pose_index], "direction": DIRECTIONS[direction_index],
        "review": "authored-visual-v1",
    }
    if not isinstance(identity_frame, dict) or set(identity_frame) != {
            "index", "pose", "direction", "headLine", "torsoLine", "review"}:
        raise RuntimeError(f"{class_id} frame {index} has malformed body identity landmark metadata")
    if any(identity_frame.get(key) != value for key, value in expected_identity.items()):
        raise RuntimeError(f"{class_id} frame {index} body identity landmark order/provenance mismatch")
    head_roi = landmark_roi(identity_frame["headLine"], 10)
    chest = landmark_roi(identity_frame["torsoLine"], 12)
    return {
        "index": index, "direction": DIRECTIONS[direction_index], "pose": POSES[pose_index],
        "sourceRow": SOURCE_ROWS[pose_index], "mainGrip": main, "offGrip": off,
        "headROI": head_roi, "chestROI": chest,
        "mainHandROI": main_hand_roi, "offHandROI": off_hand_roi,
    }


"""Legacy procedural equipment authoring was removed here.

Every rear/held/grip/front/worn/mask sheet is now authored final-aligned and
checked in.  This helper has no code path capable of manufacturing, rotating,
scaling, tinting, or repositioning equipment geometry.
"""


def _removed_legacy_equipment_authoring() -> None:
    """Sentinel retained so static guards can identify the intentional removal."""
    return None


def save_png(img: Image.Image, path: Path) -> None:
    if img.mode != "RGBA" or img.size != ATLAS_SIZE:
        raise RuntimeError(f"refusing malformed authored sheet {path}: {img.mode} {img.size}")
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, "PNG", compress_level=7)


def source_rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def write_grip_review(classes: dict[str, Image.Image], registration: dict) -> None:
    """Persist reproducible annotated body sheets for all 360 reviewed sockets."""
    qa_root = RIG_ROOT / "qa"
    qa_root.mkdir(parents=True, exist_ok=True)
    legend = Image.new("RGBA", (640, 72), (20, 18, 22, 255))
    ld = ImageDraw.Draw(legend)
    ld.ellipse((18, 18, 32, 32), fill=(255, 44, 44, 255)); ld.text((40, 18), "main grip / hand ROI", fill="white")
    ld.ellipse((230, 18, 244, 32), fill=(44, 220, 255, 255)); ld.text((252, 18), "off grip / hand ROI", fill="white")
    ld.text((18, 46), "grip-rig-v1: 192px cells; E SE S SW W NW N NE; 9 poses", fill=(190, 186, 196, 255))
    legend.save(qa_root / "legend.png")
    for class_id, body in classes.items():
        sheet = body.copy(); draw = ImageDraw.Draw(sheet)
        for meta in registration["classes"][class_id]["frames"]:
            index = meta["index"]; ox, oy = index % COLS * CELL, index // COLS * CELL
            for grip_key, roi_key, color in (
                ("mainGrip", "mainHandROI", (255, 44, 44, 255)),
                ("offGrip", "offHandROI", (44, 220, 255, 255)),
            ):
                gx, gy = meta[grip_key]; rx, ry, rw, rh = meta[roi_key]
                draw.rectangle((ox + rx, oy + ry, ox + rx + rw - 1, oy + ry + rh - 1), outline=color, width=1)
                draw.ellipse((ox + gx - 3, oy + gy - 3, ox + gx + 3, oy + gy + 3), fill=color)
            draw.text((ox + 3, oy + 3), str(index), fill=(255, 255, 255, 255), stroke_width=1, stroke_fill=(0, 0, 0, 255))
        sheet.save(qa_root / f"{class_id}_grip_review.png", "PNG", compress_level=7)


def load_registration() -> dict | None:
    if not REGISTRATION.exists():
        return None
    return json.loads(REGISTRATION.read_text(encoding="utf-8"))


def validate_registration(reg: dict) -> None:
    expected_top_keys = {
        "revision", "cell", "atlas", "anchor", "scaleMethod", "directions", "poses",
        "sourceRows", "mainFamilies", "armorFamilies", "materialTiers", "authoredRows",
        "handRegistration", "bodyIdentityLandmarks", "sourceStrategy", "classes",
    }
    if set(reg) != expected_top_keys:
        raise RuntimeError(f"registration keys must be {sorted(expected_top_keys)}")
    if reg.get("revision") != REVISION:
        raise RuntimeError(f"registration revision must be {REVISION}")
    if reg.get("directions") != list(DIRECTIONS) or reg.get("poses") != list(POSES):
        raise RuntimeError("registration direction/pose contract changed")
    if reg.get("scaleMethod") != "class-shared-final-aligned":
        raise RuntimeError("registration must use class-shared-final-aligned scaling")
    if reg.get("bodyIdentityLandmarks") != {
            "method": "authored-final-body-landmarks-v1",
            "review": "visual-overlay-v1",
            "source": "assets/sprites_src/player_rig/qa/body_identity_landmarks_v1.json",
            "headPadding": 10,
            "chestPadding": 12,
    }:
        raise RuntimeError("registration body identity landmark provenance changed")
    authored_rows = reg.get("authoredRows")
    if (not isinstance(authored_rows, dict) or authored_rows.get("method") != AUTHORED_ROW_METHOD or
            authored_rows.get("poses") != list(SUPPLEMENTAL_POSES)):
        raise RuntimeError("registration has malformed uniformly aligned authored-row provenance")
    for class_id in CLASSES:
        class_reg = reg.get("classes", {}).get(class_id, {})
        render_scale = class_reg.get("renderScale")
        if (not isinstance(render_scale, (int, float)) or isinstance(render_scale, bool) or
                float(render_scale) != 1.0):
            raise RuntimeError(f"{class_id} final-aligned renderScale must be 1.0")
        frames = class_reg.get("frames")
        if not isinstance(frames, list) or len(frames) != 72:
            raise RuntimeError(f"{class_id} registration must contain exactly 72 frames")
        for i, meta in enumerate(frames):
            expected_frame_keys = {
                "index", "direction", "pose", "sourceRow", "mainGrip", "offGrip",
                "headROI", "chestROI", "mainHandROI", "offHandROI", "handReview",
            }
            if set(meta) != expected_frame_keys:
                raise RuntimeError(f"{class_id} frame {i} registration keys changed")
            if meta.get("index") != i:
                raise RuntimeError(f"{class_id} registration frame order mismatch at {i}")
            for key, n in (("mainGrip", 2), ("offGrip", 2), ("headROI", 4), ("chestROI", 4),
                           ("mainHandROI", 4), ("offHandROI", 4)):
                if not isinstance(meta.get(key), list) or len(meta[key]) != n:
                    raise RuntimeError(f"{class_id} frame {i} malformed {key}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write-body", action="store_true", help="assemble only the authored neutral body and QA; never creates equipment")
    parser.add_argument("--write-authored-rows", action="store_true", help="freeze uniformly aligned cast/hit/death rows and QA provenance")
    parser.add_argument("--refresh-registration", action="store_true", help="read reviewed final-aligned marker atlases and overwrite socket/ROI metadata")
    args = parser.parse_args()
    if not args.write_body and not args.write_authored_rows and not args.refresh_registration:
        parser.error("choose --write-body, --write-authored-rows, and/or --refresh-registration")

    bodies: dict[str, Image.Image] = {}
    marker_atlases: dict[str, Image.Image] = {}
    authored_rows_by_class: dict[str, dict[str, Image.Image]] = {}
    row_provenance: dict[str, dict] = {}
    for class_id in CLASSES:
        alpha_path = PLAYER_INPUT / f"{class_id}_undergear_v2_alpha.png"
        chroma_path = PLAYER_INPUT / f"{class_id}_undergear_v2_chroma.png"
        if alpha_path.exists():
            approved = Image.open(alpha_path).convert("RGBA")
        elif chroma_path.exists():
            approved = chroma_to_alpha(chroma_path)
        else:
            raise RuntimeError(f"missing approved neutral-undergear source: {alpha_path} (or {chroma_path})")
        authored_rows: dict[str, Image.Image] = {}
        row_provenance[class_id] = {}
        for pose in SUPPLEMENTAL_POSES:
            row, meta = align_authored_row(class_id, approved, pose, args.write_authored_rows)
            authored_rows[pose] = row
            row_provenance[class_id][pose] = meta
        authored_rows_by_class[class_id] = authored_rows
        bodies[class_id] = normalize_body_source(approved, authored_rows)
        marker_path = RIG_ROOT / class_id / HAND_REGISTRATION_NAME
        if marker_path.exists():
            marker_atlas = Image.open(marker_path).convert("RGBA")
            if marker_atlas.size != ATLAS_SIZE:
                raise RuntimeError(f"final-aligned hand marker atlas must be {ATLAS_SIZE}: {marker_path}")
            marker_atlases[class_id] = marker_atlas
        elif args.refresh_registration:
            raise RuntimeError(
                f"missing reviewed final-aligned hand marker atlas: {marker_path}; "
                "author exactly one red main and cyan off marker in every 192px cell"
            )

    if args.write_authored_rows:
        qa_path = write_authored_row_qa(authored_rows_by_class, row_provenance)
        print(f"Wrote final-aligned authored row QA: {qa_path.relative_to(ROOT)}")

    if args.write_body:
        for class_id in CLASSES:
            save_png(bodies[class_id], RIG_ROOT / class_id / "body.png")
            # The title preview is a deliberately lightweight, already
            # flattened 8x1 idle atlas. It is a verbatim crop of the accepted
            # final-aligned body; no runtime layer decode or authoring transform
            # is required on the title screen.
            preview = bodies[class_id].crop((0, 0, CELL * COLS, CELL))
            preview_path = RIG_ROOT / class_id / "preview.png"
            preview_path.parent.mkdir(parents=True, exist_ok=True)
            preview.save(preview_path, "PNG", compress_level=7)
        body_qa_path = write_body_qa(bodies)
        print(f"Wrote final-aligned neutral body QA: {body_qa_path.relative_to(ROOT)}")

    # Body/row authoring is deliberately independent of socket registration.
    # This lets reviewers accept final-aligned art before any socket metadata
    # can be updated. Registration is read or written only under its explicit
    # refresh flag.
    if not args.refresh_registration:
        if args.write_authored_rows:
            print(f"Authored {len(CLASSES) * len(SUPPLEMENTAL_POSES)} final-aligned RGBA pose rows")
        if args.write_body:
            print(f"Authored {len(CLASSES)} final-aligned 8x9 neutral body atlases")
        print("Socket registration unchanged")
        return

    reg = load_registration()
    if reg is None or args.refresh_registration:
        if not BODY_IDENTITY_LANDMARKS.is_file():
            raise RuntimeError(f"missing reviewed body identity landmarks: {BODY_IDENTITY_LANDMARKS}")
        body_identity = json.loads(BODY_IDENTITY_LANDMARKS.read_text(encoding="utf-8"))
        if (set(body_identity) != {"version", "method", "review", "classes"} or
                body_identity.get("version") != 1 or
                body_identity.get("method") != "authored-final-body-landmarks-v1" or
                body_identity.get("review") != "visual-overlay-v1" or
                set(body_identity.get("classes", {})) != set(CLASSES)):
            raise RuntimeError("malformed reviewed body identity landmark artifact")
        identity_frames = {}
        for class_id in CLASSES:
            node = body_identity["classes"][class_id]
            if not isinstance(node, dict) or set(node) != {"frames"} or len(node.get("frames", [])) != 72:
                raise RuntimeError(f"{class_id} body identity landmark coverage must be exactly 72 frames")
            identity_frames[class_id] = node["frames"]
        existing_sources = {}
        if reg is not None:
            for class_id in CLASSES:
                sources = reg.get("classes", {}).get(class_id, {}).get("sources")
                if isinstance(sources, dict):
                    existing_sources[class_id] = sources
        reg = {
            "revision": REVISION, "cell": [CELL, CELL], "atlas": list(ATLAS_SIZE), "anchor": list(ANCHOR),
            "scaleMethod": "class-shared-final-aligned",
            "directions": list(DIRECTIONS), "poses": list(POSES), "sourceRows": list(SOURCE_ROWS),
            "mainFamilies": list(MAIN_FAMILIES), "armorFamilies": list(ARMOR_FAMILIES),
            "materialTiers": list(MATERIAL_TIERS),
            "authoredRows": {
                "method": AUTHORED_ROW_METHOD, "poses": list(SUPPLEMENTAL_POSES),
                "sources": {
                    class_id: {
                        pose: {key: value for key, value in row_provenance[class_id][pose].items()
                               if key in ("source", "sourceRow", "sourceRowScale", "output")}
                        for pose in SUPPLEMENTAL_POSES
                    }
                    for class_id in CLASSES
                },
            },
            "handRegistration": {
                "method": "authored-final-aligned-marker-atlases",
                "review": "visual-contact-sheet-v3",
                "layout": "8x9-final-aligned",
                "markerColors": {"main": "#ff0000", "off": "#00ffff"},
                "sources": {class_id: source_rel(RIG_ROOT / class_id / HAND_REGISTRATION_NAME) for class_id in CLASSES},
            },
            "bodyIdentityLandmarks": {
                "method": "authored-final-body-landmarks-v1",
                "review": "visual-overlay-v1",
                "source": source_rel(BODY_IDENTITY_LANDMARKS),
                "headPadding": 10,
                "chestPadding": 12,
            },
            "sourceStrategy": "authored neutral bodies plus final-aligned checked-in equipment layers; explicit final-cell registration; pack-only runtime compiler",
            "classes": {},
        }
        for class_id in CLASSES:
            reg["classes"][class_id] = {"renderScale": 1.0, "frames": [
                {**register_frame(frame(bodies[class_id], i), marker_frame(marker_atlases[class_id], i), class_id, i,
                                  identity_frames[class_id][i]),
                 "handReview": "authored-final-aligned-v3"}
                for i in range(72)
            ], "sources": existing_sources.get(class_id, {})}

    validate_registration(reg)
    for class_id in CLASSES:
        body_path = RIG_ROOT / class_id / "body.png"
        if not body_path.is_file():
            raise RuntimeError(f"missing accepted final-aligned body atlas: {body_path}")
        reg["classes"][class_id].setdefault("sources", {})["body"] = source_rel(body_path)
        preview_path = RIG_ROOT / class_id / "preview.png"
        if not preview_path.is_file():
            raise RuntimeError(f"missing accepted flattened title preview: {preview_path}")
        reg["classes"][class_id]["sources"]["preview"] = source_rel(preview_path)
    write_grip_review(bodies, reg)
    RIG_ROOT.mkdir(parents=True, exist_ok=True)
    REGISTRATION.write_text(json.dumps(reg, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    sheet_count = sum(1 for _ in RIG_ROOT.rglob("*.png"))
    print(f"Authored {len(CLASSES)} player rigs, 360 registered frames, {sheet_count} final-aligned RGBA sheets")


if __name__ == "__main__":
    main()
