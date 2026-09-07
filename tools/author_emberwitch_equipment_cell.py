#!/usr/bin/env python3
"""Author and assemble exact final-aligned Emberwitch equipment cells.

The ``author`` command accepts one *square* chroma-key PNG and one explicit
0..71 rig cell.  Its complete geometry policy is deliberately tiny:

* clean the chroma key across the complete square; and
* uniformly resize that complete square to 192x192.

It never crops, translates, rotates, trims, flips, detects a subject, infers a
socket, or otherwise repositions artwork.  The result is rejected unless its
padding and the slot-specific registration contact are already correct.

``review`` records a human visual review without changing the PNG.  ``assemble``
requires all 72 exact cells to be reviewed, hash-matched, and still valid, then
places their decoded pixel bytes on the frozen 8x9 grid.  Assembly performs no
image transform and verifies every atlas cell byte-for-byte after PNG encoding.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

from PIL import Image, ImageChops


ROOT = Path(__file__).resolve().parents[1]
REGISTRATION = ROOT / "assets" / "sprites_src" / "player_rig" / "registrations.json"
FOREARM_REGISTRATION = (
    ROOT
    / "assets"
    / "sprites_src"
    / "player_rig"
    / "qa"
    / "equipment_forearm_registration_v1.json"
)

CLASS_ID = "emberwitch"
RIG_REVISION = "grip-rig-v1"
CELL = 192
COLS = 8
ROWS = 9
FRAME_COUNT = COLS * ROWS
ATLAS_SIZE = (CELL * COLS, CELL * ROWS)
ANCHOR = [96, 184]
ALPHA_MIN = 8
PADDING = 1
DIRECTIONS = ("E", "SE", "S", "SW", "W", "NW", "N", "NE")
POSES = (
    "idle",
    "walkA",
    "walkB",
    "attackWindup",
    "attackImpact",
    "cast",
    "hit",
    "death",
    "dead",
)
MAIN_FAMILIES = (
    "sword_1h",
    "sword_2h",
    "axe_1h",
    "axe_2h",
    "mace_1h",
    "mace_2h",
    "dagger_1h",
    "spear_2h",
    "bow_2h",
    "crossbow_2h",
    "wand_1h",
    "staff_2h",
)
ARMOR_FAMILIES = ("light", "mail", "plate", "mythic")
SLOT_FAMILIES = {
    "main": MAIN_FAMILIES,
    "shield": ("shield",),
    "head": ARMOR_FAMILIES,
    "chest": ARMOR_FAMILIES,
    "unarmed": ("unarmed",),
}
SLOT_PLANES = {
    "main": ("rear", "held", "grip", "front"),
    "shield": ("rear", "held", "grip", "front"),
    "head": ("rear", "worn", "front"),
    "chest": ("rear", "worn", "front"),
    "unarmed": ("rear", "held", "grip", "front"),
}
REQUIRED_PLANES = {
    "main": ("held", "grip"),
    "shield": ("held", "grip"),
    "head": ("worn",),
    "chest": ("worn",),
    "unarmed": ("grip",),
}
MATERIAL_ROLES = ("metal", "wood", "leather", "cloth", "accent")


class CellError(RuntimeError):
    """The immutable final-cell contract was violated."""


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def sha256_file(path: Path) -> str:
    return sha256_bytes(path.read_bytes())


def pixel_data(image: Image.Image):
    """Return Pillow pixel data without the Pillow 14 ``getdata`` warning."""

    if hasattr(image, "get_flattened_data"):
        return image.get_flattened_data()
    return image.getdata()


def write_json_exclusive(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = (json.dumps(value, indent=2, sort_keys=True) + "\n").encode("utf-8")
    try:
        with path.open("xb") as output:
            output.write(payload)
    except FileExistsError as exc:
        raise CellError(f"refusing to overwrite existing file: {path}") from exc


def rewrite_json(path: Path, value: Any) -> None:
    temporary = path.with_name(f".{path.name}.tmp-{os.getpid()}")
    if temporary.exists():
        raise CellError(f"temporary review path already exists: {temporary}")
    temporary.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    os.replace(temporary, path)


def read_json(path: Path, label: str) -> dict[str, Any]:
    if not path.is_file():
        raise CellError(f"{label} is missing: {path}")
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        raise CellError(f"{label} is malformed: {path}: {exc}") from exc
    if not isinstance(value, dict):
        raise CellError(f"{label} must be a JSON object: {path}")
    return value


def frame_name(index: int, suffix: str = ".png") -> str:
    return f"{index:02d}_{POSES[index // COLS]}_{DIRECTIONS[index % COLS]}{suffix}"


def require_index(index: int) -> None:
    if not 0 <= index < FRAME_COUNT:
        raise CellError(f"cell index must be in 0..71, found {index}")


def require_target(slot: str, family: str, plane: str, material_role: str | None) -> None:
    if slot not in SLOT_FAMILIES:
        raise CellError(f"unsupported slot {slot!r}; expected one of {list(SLOT_FAMILIES)}")
    if family not in SLOT_FAMILIES[slot]:
        raise CellError(
            f"unsupported {slot} family {family!r}; expected one of {list(SLOT_FAMILIES[slot])}"
        )
    if plane not in SLOT_PLANES[slot]:
        raise CellError(f"unsupported {slot} plane {plane!r}; expected one of {list(SLOT_PLANES[slot])}")
    if material_role is not None and material_role not in MATERIAL_ROLES:
        raise CellError(
            f"unsupported material role {material_role!r}; expected one of {list(MATERIAL_ROLES)}"
        )


def artifact_key(plane: str, material_role: str | None) -> str:
    return plane if material_role is None else f"{plane}_mask_{material_role}"


def registration_frames() -> list[dict[str, Any]]:
    document = read_json(REGISTRATION, "canonical player registration")
    if document.get("revision") != RIG_REVISION:
        raise CellError(
            f"canonical registration revision is {document.get('revision')!r}, expected {RIG_REVISION!r}"
        )
    if document.get("directions") != list(DIRECTIONS) or document.get("poses") != list(POSES):
        raise CellError("canonical registration direction/pose order changed")
    node = document.get("classes", {}).get(CLASS_ID)
    frames = node.get("frames") if isinstance(node, dict) else None
    if not isinstance(frames, list) or len(frames) != FRAME_COUNT:
        raise CellError(f"canonical {CLASS_ID} registration must contain exactly 72 frames")
    for index, frame in enumerate(frames):
        if (
            not isinstance(frame, dict)
            or frame.get("index") != index
            or frame.get("pose") != POSES[index // COLS]
            or frame.get("direction") != DIRECTIONS[index % COLS]
            or frame.get("handReview") != "authored-final-aligned-v3"
        ):
            raise CellError(f"canonical {CLASS_ID} frame {index} is not frozen final-aligned v3 data")
        for key, length in (
            ("mainGrip", 2),
            ("offGrip", 2),
            ("mainHandROI", 4),
            ("offHandROI", 4),
            ("headROI", 4),
            ("chestROI", 4),
        ):
            value = frame.get(key)
            if not isinstance(value, list) or len(value) != length or any(type(v) is not int for v in value):
                raise CellError(f"canonical {CLASS_ID} frame {index} has malformed {key}")
    return frames


def forearm_frames() -> list[dict[str, Any]]:
    document = read_json(FOREARM_REGISTRATION, "reviewed forearm registration")
    if (
        document.get("version") != 1
        or document.get("method") != "authored-final-body-forearm-rois-v1"
        or document.get("review") != "visual-overlay-v1"
    ):
        raise CellError("reviewed forearm registration has invalid production provenance")
    node = document.get("classes", {}).get(CLASS_ID)
    frames = node.get("frames") if isinstance(node, dict) else None
    if not isinstance(frames, list) or len(frames) != FRAME_COUNT:
        raise CellError(f"reviewed forearm registration for {CLASS_ID} must have 72 frames")
    for index, frame in enumerate(frames):
        if (
            not isinstance(frame, dict)
            or frame.get("index") != index
            or frame.get("pose") != POSES[index // COLS]
            or frame.get("direction") != DIRECTIONS[index % COLS]
            or frame.get("review") != "authored-visual-v1"
        ):
            raise CellError(f"reviewed forearm registration frame {index} is not accepted")
        for key in ("mainForearmROI", "offForearmROI"):
            roi = frame.get(key)
            if not valid_roi(roi):
                raise CellError(f"reviewed forearm registration frame {index} has malformed {key}")
    return frames


def registration_sha256() -> dict[str, str]:
    return {
        "playerRegistration": sha256_file(REGISTRATION),
        "forearmRegistration": sha256_file(FOREARM_REGISTRATION),
    }


def open_square_png(path: Path) -> tuple[Image.Image, dict[str, Any]]:
    if not path.is_file():
        raise CellError(f"source PNG is missing: {path}")
    try:
        with Image.open(path) as opened:
            opened.load()
            if opened.format != "PNG":
                raise CellError(f"source must be PNG, found {opened.format}: {path}")
            if opened.mode not in {"RGB", "RGBA"}:
                raise CellError(f"source must be RGB or RGBA, found {opened.mode}: {path}")
            if opened.width != opened.height:
                raise CellError(
                    f"source must be a complete square (no crop is permitted), found {opened.width}x{opened.height}"
                )
            if not 192 <= opened.width <= 4096:
                raise CellError(f"source square must be 192..4096px, found {opened.width}px")
            metadata = {"format": opened.format, "mode": opened.mode, "size": [opened.width, opened.height]}
            return opened.convert("RGBA"), metadata
    except CellError:
        raise
    except Exception as exc:
        raise CellError(f"source cannot be decoded as PNG: {path}: {exc}") from exc


def open_exact_cell(path: Path, label: str = "cell") -> Image.Image:
    if not path.is_file():
        raise CellError(f"{label} is missing: {path}")
    try:
        with Image.open(path) as opened:
            opened.load()
            if opened.format != "PNG" or opened.mode != "RGBA" or opened.size != (CELL, CELL):
                raise CellError(
                    f"{label} must be exact RGBA PNG {CELL}x{CELL}, found "
                    f"{opened.format}/{opened.mode}/{opened.width}x{opened.height}: {path}"
                )
            return opened.copy()
    except CellError:
        raise
    except Exception as exc:
        raise CellError(f"{label} cannot be decoded: {path}: {exc}") from exc


def parse_hex_color(value: str) -> tuple[int, int, int]:
    cleaned = value.removeprefix("#")
    if len(cleaned) != 6:
        raise argparse.ArgumentTypeError("chroma key must be six hexadecimal digits, e.g. 00ff00")
    try:
        return tuple(int(cleaned[offset : offset + 2], 16) for offset in (0, 2, 4))  # type: ignore[return-value]
    except ValueError as exc:
        raise argparse.ArgumentTypeError("chroma key must contain only hexadecimal digits") from exc


def clean_chroma_whole_square(
    source: Image.Image,
    key: tuple[int, int, int],
    tolerance: int,
    feather: int,
) -> Image.Image:
    """Clean a chroma key without making any content-derived geometry decision."""

    if not 0 <= tolerance <= 255:
        raise CellError(f"chroma tolerance must be 0..255, found {tolerance}")
    if not 0 <= feather <= 255:
        raise CellError(f"chroma feather must be 0..255, found {feather}")
    outer = tolerance + feather
    key_r, key_g, key_b = key
    cleaned: list[tuple[int, int, int, int]] = []
    for red, green, blue, source_alpha in pixel_data(source):
        distance = math.sqrt(
            (red - key_r) * (red - key_r)
            + (green - key_g) * (green - key_g)
            + (blue - key_b) * (blue - key_b)
        )
        if distance <= tolerance:
            alpha = 0
            red_out = green_out = blue_out = 0
        elif feather and distance < outer:
            fraction = (distance - tolerance) / feather
            alpha = round(source_alpha * fraction)
            # Suppress key-channel spill only inside the chroma feather band.
            red_out, green_out, blue_out = red, green, blue
            if key_g > key_r and key_g > key_b:
                neutral_green = max(red, blue)
                green_out = round(neutral_green + (green - neutral_green) * fraction)
            elif key_r > key_g and key_r > key_b:
                neutral_red = max(green, blue)
                red_out = round(neutral_red + (red - neutral_red) * fraction)
            elif key_b > key_r and key_b > key_g:
                neutral_blue = max(red, green)
                blue_out = round(neutral_blue + (blue - neutral_blue) * fraction)
        else:
            red_out, green_out, blue_out, alpha = red, green, blue, source_alpha
        cleaned.append((red_out, green_out, blue_out, alpha))
    result = Image.new("RGBA", source.size, (0, 0, 0, 0))
    result.putdata(cleaned)
    return result


def resize_complete_square(source: Image.Image) -> Image.Image:
    result = source.resize((CELL, CELL), Image.Resampling.LANCZOS)
    # Canonicalize fully transparent/validator-invisible chroma fringe.  This is
    # alpha cleanup, not a geometry operation; no visible pixel is repositioned.
    pixels: list[tuple[int, int, int, int]] = []
    for red, green, blue, alpha in pixel_data(result):
        if alpha <= ALPHA_MIN:
            pixels.append((0, 0, 0, 0))
        else:
            pixels.append((red, green, blue, alpha))
    result.putdata(pixels)
    return result


def visible_alpha(image: Image.Image) -> Image.Image:
    return image.getchannel("A").point(lambda value: 255 if value > ALPHA_MIN else 0)


def valid_roi(value: Any) -> bool:
    return (
        isinstance(value, list)
        and len(value) == 4
        and all(type(item) is int for item in value)
        and value[0] >= 0
        and value[1] >= 0
        and value[2] > 0
        and value[3] > 0
        and value[0] + value[2] <= CELL
        and value[1] + value[3] <= CELL
    )


def touches(alpha: Image.Image, point: list[int], radius: int = 2) -> bool:
    x, y = point
    box = (max(0, x - radius), max(0, y - radius), min(CELL, x + radius + 1), min(CELL, y + radius + 1))
    return alpha.crop(box).getbbox() is not None


def intersects(alpha: Image.Image, roi: list[int]) -> bool:
    x, y, width, height = roi
    return alpha.crop((x, y, x + width, y + height)).getbbox() is not None


def visible_count(alpha: Image.Image) -> int:
    return sum(1 for value in pixel_data(alpha) if value)


def edge_count(alpha: Image.Image) -> int:
    count = 0
    pixels = alpha.load()
    for offset in range(CELL):
        count += bool(pixels[offset, 0])
        count += bool(pixels[offset, CELL - 1])
    for offset in range(1, CELL - 1):
        count += bool(pixels[0, offset])
        count += bool(pixels[CELL - 1, offset])
    return count


def roles_for(slot: str, family: str) -> tuple[str, ...]:
    if slot == "main":
        return ("main", "off") if family.endswith("_2h") else ("main",)
    if slot == "shield":
        return ("off",)
    if slot == "unarmed":
        return ("main", "off")
    return ()


def validate_cell(
    image: Image.Image,
    *,
    slot: str,
    family: str,
    plane: str,
    material_role: str | None,
    index: int,
    declared_empty: bool,
) -> dict[str, Any]:
    require_target(slot, family, plane, material_role)
    require_index(index)
    alpha = visible_alpha(image)
    count = visible_count(alpha)
    edge_pixels = edge_count(alpha)
    errors: list[str] = []
    if edge_pixels:
        errors.append(
            f"visible pixels touch the exact 1px cell perimeter ({edge_pixels} perimeter pixels)"
        )
    if declared_empty:
        if plane in REQUIRED_PLANES[slot] and material_role is None:
            errors.append(f"required base plane {slot}/{plane} cannot be declared empty")
        if count:
            errors.append(f"cell was declared empty but contains {count} visible pixels")
    elif not count:
        errors.append("cell contains no visible authored pixels")

    grayscale = None
    if material_role is not None and count:
        grayscale = True
        for red, green, blue, alpha_value in pixel_data(image):
            if alpha_value > ALPHA_MIN and not (red == green == blue):
                grayscale = False
                errors.append("material-mask cell contains non-grayscale visible pixels")
                break

    frames = registration_frames()
    frame = frames[index]
    contact_checks: list[dict[str, Any]] = []
    contact_policy = "not-applicable"
    # A material role is one part of a plane-wide mask union, so an individual
    # role cannot be required to carry the socket/ROI contact by itself.
    if count and material_role is None and slot in {"head", "chest"}:
        roi_key = "headROI" if slot == "head" else "chestROI"
        passed = intersects(alpha, frame[roi_key])
        contact_policy = f"intersect-{roi_key}"
        contact_checks.append({"kind": "roi", "name": roi_key, "value": frame[roi_key], "pass": passed})
        if not passed:
            errors.append(f"{plane} pixels miss canonical {roi_key} {frame[roi_key]}")
    elif count and material_role is None and slot in {"main", "shield", "unarmed"}:
        # Rear/front are occlusion fragments and are allowed to be disconnected;
        # the mandatory held/grip plane owns socket contact.
        if plane in {"held", "grip"}:
            contact_policy = "grip-within-2px"
            for role in roles_for(slot, family):
                grip_key = f"{role}Grip"
                passed = touches(alpha, frame[grip_key])
                contact_checks.append(
                    {"kind": "socket", "name": grip_key, "value": frame[grip_key], "radius": 2, "pass": passed}
                )
                if not passed:
                    errors.append(f"{plane} pixels miss canonical {grip_key} {frame[grip_key]} by >2px")
                if plane == "grip":
                    roi_key = f"{role}HandROI"
                    roi_passed = intersects(alpha, frame[roi_key])
                    contact_checks.append(
                        {"kind": "roi", "name": roi_key, "value": frame[roi_key], "pass": roi_passed}
                    )
                    if not roi_passed:
                        errors.append(f"grip pixels miss canonical {roi_key} {frame[roi_key]}")
            if plane == "grip":
                forearms = forearm_frames()
                allowed = Image.new("L", (CELL, CELL), 0)
                for role in roles_for(slot, family):
                    x, y, width, height = forearms[index][f"{role}ForearmROI"]
                    allowed.paste(255, (x, y, x + width, y + height))
                residue = ImageChops.subtract(alpha, allowed)
                residue_count = visible_count(residue)
                contact_checks.append(
                    {"kind": "forearm-hygiene", "visiblePixelsOutsideReviewedRois": residue_count, "pass": not residue_count}
                )
                if residue_count:
                    errors.append(f"grip has {residue_count} visible pixels outside reviewed forearm ROI(s)")
        else:
            contact_policy = "not-applicable-occlusion-fragment"
    elif material_role is not None:
        contact_policy = "deferred-to-complete-material-mask-union"
    elif declared_empty:
        contact_policy = "not-applicable-declared-empty"

    return {
        "status": "pass" if not errors else "fail",
        "visiblePixels": count,
        "declaredEmpty": declared_empty,
        "padding": {
            "requiredTransparentPerimeterPx": PADDING,
            "visiblePerimeterPixels": edge_pixels,
            "pass": edge_pixels == 0,
        },
        "contact": {"policy": contact_policy, "checks": contact_checks},
        "grayscaleMask": grayscale,
        "errors": errors,
    }


def cell_paths(
    output_root: Path,
    plane: str,
    material_role: str | None,
    index: int,
) -> tuple[Path, Path]:
    key = artifact_key(plane, material_role)
    return (
        output_root / "cells" / key / frame_name(index),
        output_root / "provenance" / key / frame_name(index, ".json"),
    )


def save_png_exclusive(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        raise CellError(f"refusing to overwrite existing cell: {path}")
    temporary = path.with_name(f".{path.name}.tmp-{os.getpid()}")
    image.save(temporary, "PNG", compress_level=7)
    try:
        os.link(temporary, path)
    except FileExistsError as exc:
        raise CellError(f"refusing to overwrite existing cell: {path}") from exc
    finally:
        temporary.unlink(missing_ok=True)


def author_cell(args: argparse.Namespace) -> tuple[Path, Path]:
    require_target(args.slot, args.family, args.plane, args.material_role)
    require_index(args.cell_index)
    source_path = args.source.resolve()
    output_root = args.out_root.resolve()
    cell_path, provenance_path = cell_paths(
        output_root, args.plane, args.material_role, args.cell_index
    )
    if cell_path.exists() or provenance_path.exists():
        raise CellError(
            "refusing partial/complete overwrite; both target paths must be absent: "
            f"{cell_path}, {provenance_path}"
        )
    source, source_metadata = open_square_png(source_path)
    cleaned = clean_chroma_whole_square(source, args.chroma_key, args.chroma_tolerance, args.chroma_feather)
    final = resize_complete_square(cleaned)
    validation = validate_cell(
        final,
        slot=args.slot,
        family=args.family,
        plane=args.plane,
        material_role=args.material_role,
        index=args.cell_index,
        declared_empty=args.declared_empty,
    )
    if validation["status"] != "pass":
        preview = "\n".join(f"  - {item}" for item in validation["errors"])
        raise CellError(f"final cell failed strict registration validation:\n{preview}")

    save_png_exclusive(final, cell_path)
    checked = open_exact_cell(cell_path, "written cell")
    if checked.tobytes() != final.tobytes():
        cell_path.unlink(missing_ok=True)
        raise AssertionError(f"PNG encoding changed decoded cell pixels: {cell_path}")

    frame = registration_frames()[args.cell_index]
    source_size = source_metadata["size"][0]
    provenance = {
        "version": 1,
        "artifact": "emberwitch-equipment-final-cell-v1",
        "classId": CLASS_ID,
        "rigRevision": RIG_REVISION,
        "slot": args.slot,
        "family": args.family,
        "plane": args.plane,
        "materialRole": args.material_role,
        "target": {
            "index": args.cell_index,
            "pose": frame["pose"],
            "direction": frame["direction"],
            "cell": [CELL, CELL],
            "anchor": ANCHOR,
        },
        "source": {
            "path": str(source_path),
            "sha256": sha256_file(source_path),
            **source_metadata,
        },
        "chroma": {
            "keyRgb": list(args.chroma_key),
            "euclideanTolerance": args.chroma_tolerance,
            "feather": args.chroma_feather,
            "alphaFloor": ALPHA_MIN,
        },
        "uniformWholeSquareScale": CELL / source_size,
        "operationsApplied": [
            "decode-complete-square-png",
            "whole-square-chroma-cleanup",
            "uniform-whole-square-resize-to-192",
            "transparent-rgb-canonicalization",
            "strict-registration-validation",
        ],
        "geometryTransformsApplied": {
            "uniformWholeSquareResize": True,
            "crop": False,
            "translate": False,
            "rotate": False,
            "trim": False,
            "flip": False,
            "subjectDetection": False,
            "socketInference": False,
            "snap": False,
        },
        "registrations": registration_sha256(),
        "output": {
            "path": str(cell_path),
            "format": "PNG",
            "mode": "RGBA",
            "size": [CELL, CELL],
            "sha256": sha256_file(cell_path),
            "pixelSha256": sha256_bytes(checked.tobytes()),
        },
        "validation": validation,
        "review": {"status": "pending-visual-review", "reviewer": None, "reviewedAt": None, "note": None},
    }
    try:
        write_json_exclusive(provenance_path, provenance)
    except Exception:
        cell_path.unlink(missing_ok=True)
        raise
    print(
        f"PASS author: {args.slot}/{args.family}/{artifact_key(args.plane, args.material_role)} "
        f"cell {args.cell_index} {frame['pose']}/{frame['direction']}"
    )
    print(f"Cell: {cell_path}")
    print(f"Provenance (visual review pending): {provenance_path}")
    return cell_path, provenance_path


def verify_provenance_target(
    provenance: dict[str, Any],
    *,
    slot: str,
    family: str,
    plane: str,
    material_role: str | None,
    index: int,
    cell_path: Path,
) -> Image.Image:
    if provenance.get("version") != 1:
        raise CellError(f"provenance version is not 1 for frame {index}")
    expected = {
        "artifact": "emberwitch-equipment-final-cell-v1",
        "classId": CLASS_ID,
        "rigRevision": RIG_REVISION,
        "slot": slot,
        "family": family,
        "plane": plane,
        "materialRole": material_role,
    }
    for key, value in expected.items():
        if provenance.get(key) != value:
            raise CellError(f"provenance {key} is {provenance.get(key)!r}, expected {value!r}")
    expected_operations = [
        "decode-complete-square-png",
        "whole-square-chroma-cleanup",
        "uniform-whole-square-resize-to-192",
        "transparent-rgb-canonicalization",
        "strict-registration-validation",
    ]
    if provenance.get("operationsApplied") != expected_operations:
        raise CellError(f"allowed-operation record changed for frame {index}")
    expected_geometry = {
        "uniformWholeSquareResize": True,
        "crop": False,
        "translate": False,
        "rotate": False,
        "trim": False,
        "flip": False,
        "subjectDetection": False,
        "socketInference": False,
        "snap": False,
    }
    if provenance.get("geometryTransformsApplied") != expected_geometry:
        raise CellError(f"forbidden-geometry record changed for frame {index}")
    target = provenance.get("target")
    frame = registration_frames()[index]
    expected_target = {
        "index": index,
        "pose": frame["pose"],
        "direction": frame["direction"],
        "cell": [CELL, CELL],
        "anchor": ANCHOR,
    }
    if target != expected_target:
        raise CellError(f"provenance target changed for frame {index}")
    if provenance.get("registrations") != registration_sha256():
        raise CellError(f"registration hashes changed since frame {index} was authored")
    if provenance.get("validation", {}).get("status") != "pass":
        raise CellError(f"provenance validation is not passing for frame {index}")
    output = provenance.get("output")
    image = open_exact_cell(cell_path, f"cell {index}")
    if not isinstance(output, dict):
        raise CellError(f"provenance output is malformed for frame {index}")
    expected_output_identity = {
        "path": str(cell_path),
        "format": "PNG",
        "mode": "RGBA",
        "size": [CELL, CELL],
    }
    for key, value in expected_output_identity.items():
        if output.get(key) != value:
            raise CellError(f"provenance output {key} changed for frame {index}")
    if output.get("sha256") != sha256_file(cell_path):
        raise CellError(f"cell file hash drifted after authoring: {cell_path}")
    if output.get("pixelSha256") != sha256_bytes(image.tobytes()):
        raise CellError(f"cell pixel hash drifted after authoring: {cell_path}")
    validation = validate_cell(
        image,
        slot=slot,
        family=family,
        plane=plane,
        material_role=material_role,
        index=index,
        declared_empty=bool(provenance.get("validation", {}).get("declaredEmpty")),
    )
    if validation["status"] != "pass":
        raise CellError(f"cell {index} no longer passes current registration validation: {validation['errors']}")
    if provenance.get("validation") != validation:
        raise CellError(f"recorded validation evidence changed or is stale for frame {index}")
    return image


def review_cell(args: argparse.Namespace) -> None:
    if not args.visual_review_complete:
        raise CellError("review requires the explicit --visual-review-complete assertion")
    if not args.reviewer.strip():
        raise CellError("reviewer must be non-empty")
    require_target(args.slot, args.family, args.plane, args.material_role)
    require_index(args.cell_index)
    root = args.out_root.resolve()
    cell_path, provenance_path = cell_paths(root, args.plane, args.material_role, args.cell_index)
    provenance = read_json(provenance_path, "cell provenance")
    verify_provenance_target(
        provenance,
        slot=args.slot,
        family=args.family,
        plane=args.plane,
        material_role=args.material_role,
        index=args.cell_index,
        cell_path=cell_path,
    )
    review = provenance.get("review")
    if not isinstance(review, dict) or review.get("status") != "pending-visual-review":
        raise CellError(f"cell is not pending visual review: {provenance_path}")
    provenance["review"] = {
        "status": "visual-reviewed",
        "reviewer": args.reviewer.strip(),
        "reviewedAt": datetime.now(timezone.utc).isoformat(),
        "note": args.note,
        "cellSha256AtReview": sha256_file(cell_path),
        "pixelSha256AtReview": sha256_bytes(open_exact_cell(cell_path).tobytes()),
    }
    rewrite_json(provenance_path, provenance)
    print(f"PASS review: cell {args.cell_index} marked visual-reviewed by {args.reviewer.strip()}")
    print(f"PNG unchanged: {cell_path}")


def exact_names(directory: Path) -> set[str]:
    if not directory.is_dir():
        raise CellError(f"required directory is missing: {directory}")
    return {entry.name for entry in directory.iterdir() if entry.is_file()}


def assemble(args: argparse.Namespace) -> tuple[Path, Path]:
    require_target(args.slot, args.family, args.plane, args.material_role)
    root = args.out_root.resolve()
    key = artifact_key(args.plane, args.material_role)
    cells_dir = root / "cells" / key
    provenance_dir = root / "provenance" / key
    expected_cells = {frame_name(index) for index in range(FRAME_COUNT)}
    expected_provenance = {frame_name(index, ".json") for index in range(FRAME_COUNT)}
    actual_cells = exact_names(cells_dir)
    actual_provenance = exact_names(provenance_dir)
    if actual_cells != expected_cells:
        missing = sorted(expected_cells - actual_cells)
        extra = sorted(actual_cells - expected_cells)
        raise CellError(f"cells directory must contain exactly 72 frozen names; missing={missing[:5]} extra={extra[:5]}")
    if actual_provenance != expected_provenance:
        missing = sorted(expected_provenance - actual_provenance)
        extra = sorted(actual_provenance - expected_provenance)
        raise CellError(
            f"provenance directory must contain exactly 72 frozen names; missing={missing[:5]} extra={extra[:5]}"
        )

    atlas_path = args.out.resolve()
    atlas_provenance_path = (
        args.provenance_out.resolve()
        if args.provenance_out
        else atlas_path.with_name(atlas_path.stem + ".provenance.json")
    )
    if atlas_path.exists() or atlas_provenance_path.exists():
        raise CellError(
            f"refusing atlas overwrite; both output paths must be absent: {atlas_path}, {atlas_provenance_path}"
        )

    atlas = Image.new("RGBA", ATLAS_SIZE, (0, 0, 0, 0))
    cells: list[Image.Image] = []
    entries: list[dict[str, Any]] = []
    for index in range(FRAME_COUNT):
        cell_path = cells_dir / frame_name(index)
        provenance_path = provenance_dir / frame_name(index, ".json")
        provenance = read_json(provenance_path, f"cell {index} provenance")
        cell = verify_provenance_target(
            provenance,
            slot=args.slot,
            family=args.family,
            plane=args.plane,
            material_role=args.material_role,
            index=index,
            cell_path=cell_path,
        )
        review = provenance.get("review")
        if not isinstance(review, dict) or review.get("status") != "visual-reviewed":
            raise CellError(f"cell {index} has not completed visual review")
        if review.get("cellSha256AtReview") != sha256_file(cell_path):
            raise CellError(f"cell {index} file bytes changed after visual review")
        if review.get("pixelSha256AtReview") != sha256_bytes(cell.tobytes()):
            raise CellError(f"cell {index} pixels changed after visual review")
        col, row = index % COLS, index // COLS
        atlas.paste(cell, (col * CELL, row * CELL))
        cells.append(cell)
        entries.append(
            {
                "index": index,
                "pose": POSES[row],
                "direction": DIRECTIONS[col],
                "cellSha256": sha256_file(cell_path),
                "pixelSha256": sha256_bytes(cell.tobytes()),
                "provenanceSha256": sha256_file(provenance_path),
                "reviewer": review.get("reviewer"),
                "reviewedAt": review.get("reviewedAt"),
            }
        )

    atlas_path.parent.mkdir(parents=True, exist_ok=True)
    temporary = atlas_path.with_name(f".{atlas_path.name}.tmp-{os.getpid()}")
    atlas.save(temporary, "PNG", compress_level=7)
    try:
        os.link(temporary, atlas_path)
    except FileExistsError as exc:
        raise CellError(f"refusing to overwrite atlas: {atlas_path}") from exc
    finally:
        temporary.unlink(missing_ok=True)

    try:
        with Image.open(atlas_path) as opened:
            opened.load()
            if opened.format != "PNG" or opened.mode != "RGBA" or opened.size != ATLAS_SIZE:
                raise AssertionError("encoded atlas layout changed")
            checked = opened.copy()
        for index, source in enumerate(cells):
            col, row = index % COLS, index // COLS
            rebuilt = checked.crop((col * CELL, row * CELL, (col + 1) * CELL, (row + 1) * CELL))
            if rebuilt.tobytes() != source.tobytes():
                raise AssertionError(f"fixed-grid assembly changed decoded pixel bytes in cell {index}")

        atlas_provenance = {
            "version": 1,
            "artifact": "emberwitch-equipment-final-atlas-v1",
            "classId": CLASS_ID,
            "rigRevision": RIG_REVISION,
            "slot": args.slot,
            "family": args.family,
            "plane": args.plane,
            "materialRole": args.material_role,
            "layout": {
                "cell": [CELL, CELL],
                "atlas": list(ATLAS_SIZE),
                "anchor": ANCHOR,
                "directions": list(DIRECTIONS),
                "poses": list(POSES),
                "frames": FRAME_COUNT,
            },
            "sourceKind": "72-reviewed-final-cells-fixed-index-pixel-byte-assembly",
            "operationsApplied": ["decode-exact-cells", "fixed-index-pixel-byte-assembly", "pixel-byte-equality-check"],
            "geometryTransformsApplied": {
                "scale": False,
                "crop": False,
                "translate": False,
                "rotate": False,
                "trim": False,
                "flip": False,
                "socketInference": False,
                "snap": False,
            },
            "registrations": registration_sha256(),
            "atlas": {
                "path": str(atlas_path),
                "sha256": sha256_file(atlas_path),
                "pixelSha256": sha256_bytes(checked.tobytes()),
            },
            "cells": entries,
        }
        write_json_exclusive(atlas_provenance_path, atlas_provenance)
    except Exception:
        atlas_path.unlink(missing_ok=True)
        raise

    print(
        f"PASS assemble: {args.slot}/{args.family}/{key}: 72 reviewed exact cells -> "
        f"{ATLAS_SIZE[0]}x{ATLAS_SIZE[1]} atlas; no transforms"
    )
    print(f"Atlas: {atlas_path}")
    print(f"Atlas provenance: {atlas_provenance_path}")
    return atlas_path, atlas_provenance_path


def add_target_arguments(parser: argparse.ArgumentParser, *, include_index: bool) -> None:
    parser.add_argument("--slot", required=True, choices=tuple(SLOT_FAMILIES))
    parser.add_argument("--family", required=True)
    parser.add_argument("--plane", required=True, choices=("rear", "held", "grip", "front", "worn"))
    parser.add_argument("--material-role", choices=MATERIAL_ROLES)
    if include_index:
        parser.add_argument("--cell-index", required=True, type=int)
    parser.add_argument("--out-root", required=True, type=Path)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)

    author = commands.add_parser("author", help="clean and uniformly resize one complete square into one exact cell")
    add_target_arguments(author, include_index=True)
    author.add_argument("--source", required=True, type=Path)
    author.add_argument("--chroma-key", type=parse_hex_color, default=(0, 255, 0))
    author.add_argument("--chroma-tolerance", type=int, default=42)
    author.add_argument("--chroma-feather", type=int, default=30)
    author.add_argument(
        "--declared-empty",
        action="store_true",
        help="accept only an actually empty optional-plane/material-mask cell",
    )

    review = commands.add_parser("review", help="record visual review without changing cell pixels")
    add_target_arguments(review, include_index=True)
    review.add_argument("--reviewer", required=True)
    review.add_argument("--note")
    review.add_argument("--visual-review-complete", action="store_true")

    assembly = commands.add_parser("assemble", help="assemble exactly 72 reviewed cells without transforms")
    add_target_arguments(assembly, include_index=False)
    assembly.add_argument("--out", required=True, type=Path)
    assembly.add_argument("--provenance-out", type=Path)
    return parser


def main(argv: Iterable[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        if args.command == "author":
            author_cell(args)
        elif args.command == "review":
            review_cell(args)
        else:
            assemble(args)
    except CellError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
