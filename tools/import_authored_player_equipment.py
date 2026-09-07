#!/usr/bin/env python3
"""Scaffold, audit, and import final-aligned authored player equipment.

This tool has one intentionally narrow job: move already-authored equipment
pixels into the canonical source tree without ever aligning the art in code.
It contains no trim, contain, resize, rotate, translate, flip, socket inference,
or frame-clamping operation.

Artist deliveries may contain either complete RGBA 1536x1728 plane atlases or
72 RGBA 192x192 cells.  Atlas inputs are copied byte-for-byte.  Cell inputs are
placed only at their declared fixed row/column and verified pixel-for-pixel
after PNG encoding.  Contact or layout mistakes fail closed.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import sys
import tempfile
from collections import deque
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from PIL import Image, ImageChops, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
RIG_ROOT = ROOT / "assets" / "sprites_src" / "player_rig"
REGISTRATION = RIG_ROOT / "registrations.json"
FOREARM_REGISTRATION = RIG_ROOT / "qa" / "equipment_forearm_registration_v1.json"
AUTHORED_ROOT = ROOT / "assets" / "sprites_src" / "player_rig_authored"

CELL = 192
COLS = 8
ROWS = 9
ATLAS_SIZE = (CELL * COLS, CELL * ROWS)
ANCHOR = [96, 184]
RIG_REVISION = "grip-rig-v1"
ALPHA_MIN = 8
DIRECTIONS = ("E", "SE", "S", "SW", "W", "NW", "N", "NE")
POSES = (
    "idle", "walkA", "walkB", "attackWindup", "attackImpact",
    "cast", "hit", "death", "dead",
)
CLASSES = ("vanguard", "emberwitch", "gravebinder", "wildkeeper", "veilranger")
MAIN_FAMILIES = (
    "sword_1h", "sword_2h", "axe_1h", "axe_2h", "mace_1h", "mace_2h",
    "dagger_1h", "spear_2h", "bow_2h", "crossbow_2h", "wand_1h", "staff_2h",
)
ARMOR_FAMILIES = ("light", "mail", "plate", "mythic")
MATERIAL_ROLES = ("metal", "wood", "leather", "cloth", "accent")
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


class ContractError(RuntimeError):
    """A delivery violated the immutable final-cell authoring contract."""


@dataclass
class PlaneSource:
    image: Image.Image
    source_kind: str
    source_paths: tuple[Path, ...]
    source_sha256: str
    pixel_sha256: str


@dataclass
class Delivery:
    root: Path
    descriptor_path: Path
    descriptor: dict[str, Any]
    class_id: str
    slot: str
    family: str
    frames: list[dict[str, Any]]
    planes: dict[str, PlaneSource]
    masks: dict[str, dict[str, PlaneSource]]
    forearms: list[dict[str, Any]] | None


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def sha256_file(path: Path) -> str:
    return sha256_bytes(path.read_bytes())


def frame_name(index: int) -> str:
    return f"{index:02d}_{POSES[index // COLS]}_{DIRECTIONS[index % COLS]}.png"


def require_target(class_id: str, slot: str, family: str) -> None:
    if class_id not in CLASSES:
        raise ContractError(f"unsupported class {class_id!r}; expected one of {list(CLASSES)}")
    if slot not in SLOT_FAMILIES:
        raise ContractError(f"unsupported slot {slot!r}; expected one of {list(SLOT_FAMILIES)}")
    if family not in SLOT_FAMILIES[slot]:
        raise ContractError(
            f"unsupported {slot} family {family!r}; expected one of {list(SLOT_FAMILIES[slot])}"
        )


def inside(base: Path, relative: str, label: str) -> Path:
    if not isinstance(relative, str) or not relative:
        raise ContractError(f"{label} must be a non-empty delivery-relative path")
    candidate = Path(relative)
    if candidate.is_absolute():
        raise ContractError(f"{label} must be delivery-relative, not absolute: {relative}")
    root = base.resolve()
    resolved = (base / candidate).resolve()
    try:
        resolved.relative_to(root)
    except ValueError as exc:
        raise ContractError(f"{label} escapes the delivery directory: {relative}") from exc
    return resolved


def open_exact_png(path: Path, size: tuple[int, int], label: str) -> Image.Image:
    if not path.is_file():
        raise ContractError(f"{label} is missing: {path}")
    try:
        with Image.open(path) as opened:
            opened.load()
            if opened.format != "PNG":
                raise ContractError(f"{label} must be PNG, found {opened.format}: {path}")
            if opened.mode != "RGBA":
                raise ContractError(f"{label} must be exact RGBA, found {opened.mode}: {path}")
            if opened.size != size:
                raise ContractError(f"{label} must be {size[0]}x{size[1]}, found {opened.size}: {path}")
            return opened.copy()
    except ContractError:
        raise
    except Exception as exc:
        raise ContractError(f"{label} cannot be decoded as PNG: {path}: {exc}") from exc


def load_plane_source(delivery_root: Path, node: Any, label: str) -> PlaneSource:
    if not isinstance(node, dict) or set(node) not in ({"atlas"}, {"cells"}):
        raise ContractError(f"{label} must be exactly {{'atlas': path}} or {{'cells': directory}}")
    if "atlas" in node:
        path = inside(delivery_root, node["atlas"], f"{label}.atlas")
        image = open_exact_png(path, ATLAS_SIZE, label)
        return PlaneSource(
            image=image,
            source_kind="verbatim-atlas",
            source_paths=(path,),
            source_sha256=sha256_file(path),
            pixel_sha256=sha256_bytes(image.tobytes()),
        )

    directory = inside(delivery_root, node["cells"], f"{label}.cells")
    if not directory.is_dir():
        raise ContractError(f"{label}.cells directory is missing: {directory}")
    expected = {frame_name(index) for index in range(COLS * ROWS)}
    actual = {path.name for path in directory.iterdir() if path.is_file()}
    missing = sorted(expected - actual)
    extra = sorted(actual - expected)
    if missing or extra:
        detail = []
        if missing:
            detail.append(f"missing {len(missing)} cells ({', '.join(missing[:5])})")
        if extra:
            detail.append(f"unexpected files ({', '.join(extra[:5])})")
        raise ContractError(f"{label} must contain exactly the 72 frozen frame names: {'; '.join(detail)}")

    atlas = Image.new("RGBA", ATLAS_SIZE, (0, 0, 0, 0))
    paths: list[Path] = []
    digest = hashlib.sha256()
    cells: list[Image.Image] = []
    for index in range(COLS * ROWS):
        path = directory / frame_name(index)
        cell = open_exact_png(path, (CELL, CELL), f"{label} frame {index}")
        col, row = index % COLS, index // COLS
        # Fixed grid placement only. No content-derived transform is possible.
        atlas.paste(cell, (col * CELL, row * CELL))
        paths.append(path)
        cells.append(cell)
        digest.update(path.name.encode("utf-8"))
        digest.update(bytes.fromhex(sha256_file(path)))
    for index, source in enumerate(cells):
        col, row = index % COLS, index // COLS
        rebuilt = atlas.crop((col * CELL, row * CELL, (col + 1) * CELL, (row + 1) * CELL))
        if rebuilt.tobytes() != source.tobytes():
            raise AssertionError(f"internal fixed-grid assembly changed {label} frame {index}")
    return PlaneSource(
        image=atlas,
        source_kind="fixed-grid-72-cells",
        source_paths=tuple(paths),
        source_sha256=digest.hexdigest(),
        pixel_sha256=sha256_bytes(atlas.tobytes()),
    )


def registration_frames(class_id: str) -> list[dict[str, Any]]:
    try:
        registration = json.loads(REGISTRATION.read_text(encoding="utf-8"))
    except Exception as exc:
        raise ContractError(f"cannot read canonical player registration {REGISTRATION}: {exc}") from exc
    if registration.get("revision") != RIG_REVISION:
        raise ContractError(
            f"canonical registration revision is {registration.get('revision')!r}, expected {RIG_REVISION!r}"
        )
    if registration.get("directions") != list(DIRECTIONS) or registration.get("poses") != list(POSES):
        raise ContractError("canonical registration direction/pose order changed")
    node = registration.get("classes", {}).get(class_id)
    frames = node.get("frames") if isinstance(node, dict) else None
    if not isinstance(frames, list) or len(frames) != COLS * ROWS:
        raise ContractError(f"canonical registration for {class_id} must contain exactly 72 frames")
    required = ("mainGrip", "offGrip", "mainHandROI", "offHandROI", "headROI", "chestROI")
    for index, frame in enumerate(frames):
        if (
            not isinstance(frame, dict)
            or frame.get("index") != index
            or frame.get("pose") != POSES[index // COLS]
            or frame.get("direction") != DIRECTIONS[index % COLS]
            or frame.get("handReview") != "authored-final-aligned-v3"
        ):
            raise ContractError(f"canonical {class_id} frame {index} is not frozen final-aligned v3 data")
        for key in required:
            value = frame.get(key)
            length = 2 if key.endswith("Grip") else 4
            if not isinstance(value, list) or len(value) != length or any(type(item) is not int for item in value):
                raise ContractError(f"canonical {class_id} frame {index} has malformed {key}")
    return frames


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


def rois_intersect(first: list[int], second: list[int]) -> bool:
    ax0, ay0, aw, ah = first
    bx0, by0, bw, bh = second
    return not (ax0 + aw <= bx0 or bx0 + bw <= ax0 or ay0 + ah <= by0 or by0 + bh <= ay0)


def parse_forearms(
    path: Path, class_id: str, frames: list[dict[str, Any]], *, require_review: bool,
) -> list[dict[str, Any]]:
    if not path.is_file():
        raise ContractError(
            "reviewed forearm annotation is required for grip-plane hygiene; missing " + str(path)
        )
    try:
        document = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        raise ContractError(f"cannot read forearm annotation {path}: {exc}") from exc

    if "classes" in document:
        if (
            document.get("version") != 1
            or document.get("method") != "authored-final-body-forearm-rois-v1"
        ):
            raise ContractError(f"forearm annotation {path} has invalid production v1 provenance")
        if require_review and document.get("review") != "visual-overlay-v1":
            raise ContractError(f"forearm annotation {path} lacks visual-overlay-v1 review")
        node = document.get("classes", {}).get(class_id)
        authored = node.get("frames") if isinstance(node, dict) else None
    else:
        if (
            document.get("version") != 1
            or document.get("method") != "authored-final-body-forearm-rois-v1"
            or document.get("classId") != class_id
        ):
            raise ContractError(f"forearm fragment {path} has invalid class-specific v1 provenance")
        if require_review and document.get("review") != "visual-overlay-v1":
            raise ContractError(f"forearm fragment {path} lacks visual-overlay-v1 review")
        authored = document.get("frames")
    if not isinstance(authored, list) or len(authored) != COLS * ROWS:
        raise ContractError(f"forearm annotation for {class_id} must contain exactly 72 frames")
    for index, node in enumerate(authored):
        expected_keys = {
            "index", "pose", "direction", "mainForearmROI", "offForearmROI", "review",
        }
        if not isinstance(node, dict) or set(node) != expected_keys:
            raise ContractError(f"forearm annotation {class_id} frame {index} has invalid keys")
        if (
            node["index"] != index
            or node["pose"] != POSES[index // COLS]
            or node["direction"] != DIRECTIONS[index % COLS]
        ):
            raise ContractError(f"forearm annotation {class_id} frame {index} ordering mismatch")
        if require_review and node["review"] != "authored-visual-v1":
            raise ContractError(
                f"forearm annotation {class_id} frame {index} lacks authored-visual-v1 review"
            )
        for role in ("main", "off"):
            roi = node[f"{role}ForearmROI"]
            if not valid_roi(roi):
                raise ContractError(f"forearm annotation {class_id} frame {index} has malformed {role}ForearmROI")
            if not rois_intersect(roi, frames[index][f"{role}HandROI"]):
                raise ContractError(
                    f"forearm annotation {class_id} frame {index} {role}ForearmROI misses canonical {role}HandROI"
                )
    return authored


def load_forearms(path: Path, class_id: str, frames: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return parse_forearms(path, class_id, frames, require_review=True)


def load_descriptor(delivery_root: Path) -> tuple[Path, dict[str, Any]]:
    path = delivery_root / "delivery.json"
    if not path.is_file():
        raise ContractError(f"delivery descriptor is missing: {path}")
    try:
        descriptor = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        raise ContractError(f"delivery descriptor is malformed: {path}: {exc}") from exc
    expected = {
        "version", "rigRevision", "classId", "slot", "family", "cell", "atlas",
        "anchor", "directions", "poses", "planes", "masks",
    }
    if not isinstance(descriptor, dict) or set(descriptor) != expected:
        raise ContractError(f"delivery.json keys must be exactly {sorted(expected)}")
    if descriptor.get("version") != 1 or descriptor.get("rigRevision") != RIG_REVISION:
        raise ContractError("delivery must declare version 1 and rigRevision 'grip-rig-v1'")
    if (
        descriptor.get("cell") != [CELL, CELL]
        or descriptor.get("atlas") != list(ATLAS_SIZE)
        or descriptor.get("anchor") != ANCHOR
        or descriptor.get("directions") != list(DIRECTIONS)
        or descriptor.get("poses") != list(POSES)
    ):
        raise ContractError("delivery final-cell layout must be exact 192px / 8x9 / anchor [96,184]")
    return path, descriptor


def load_delivery(delivery_root: Path, forearm_path: Path | None) -> Delivery:
    delivery_root = delivery_root.resolve()
    descriptor_path, descriptor = load_descriptor(delivery_root)
    class_id = descriptor["classId"]
    slot = descriptor["slot"]
    family = descriptor["family"]
    require_target(class_id, slot, family)
    frames = registration_frames(class_id)
    expected_planes = set(SLOT_PLANES[slot])
    plane_nodes = descriptor.get("planes")
    if not isinstance(plane_nodes, dict) or set(plane_nodes) != expected_planes:
        raise ContractError(f"{slot} planes must be exactly {sorted(expected_planes)} (use null for absent optional planes)")
    for plane in REQUIRED_PLANES[slot]:
        if plane_nodes.get(plane) is None:
            raise ContractError(f"{class_id}/{slot}/{family} is missing mandatory authored {plane}.png")

    planes: dict[str, PlaneSource] = {}
    for plane in SLOT_PLANES[slot]:
        node = plane_nodes[plane]
        if node is not None:
            planes[plane] = load_plane_source(delivery_root, node, f"{class_id}/{slot}/{family}/{plane}")

    mask_nodes = descriptor.get("masks")
    if not isinstance(mask_nodes, dict) or not set(mask_nodes).issubset(expected_planes):
        raise ContractError(f"masks may be keyed only by {sorted(expected_planes)}")
    masks: dict[str, dict[str, PlaneSource]] = {}
    for plane, roles in mask_nodes.items():
        if plane not in planes:
            raise ContractError(f"{plane} material masks require an authored base {plane}.png")
        if not isinstance(roles, dict) or not roles:
            raise ContractError(f"{plane} masks must be a non-empty material-role object")
        if not set(roles).issubset(MATERIAL_ROLES):
            raise ContractError(
                f"{plane} mask roles {sorted(roles)} are not a subset of {list(MATERIAL_ROLES)}"
            )
        masks[plane] = {
            role: load_plane_source(delivery_root, node, f"{class_id}/{slot}/{family}/{plane}_mask_{role}")
            for role, node in sorted(roles.items())
        }

    forearms = None
    if slot in {"main", "shield", "unarmed"}:
        forearms = load_forearms((forearm_path or FOREARM_REGISTRATION).resolve(), class_id, frames)
    return Delivery(
        root=delivery_root,
        descriptor_path=descriptor_path,
        descriptor=descriptor,
        class_id=class_id,
        slot=slot,
        family=family,
        frames=frames,
        planes=planes,
        masks=masks,
        forearms=forearms,
    )


def threshold_alpha(source: PlaneSource) -> Image.Image:
    return source.image.getchannel("A").point(lambda value: 255 if value > ALPHA_MIN else 0)


def union_alpha(sources: list[PlaneSource]) -> Image.Image:
    result = Image.new("L", ATLAS_SIZE, 0)
    for source in sources:
        result = ImageChops.lighter(result, threshold_alpha(source))
    return result


def effective_sources(delivery: Delivery, plane: str) -> list[PlaneSource]:
    roles = delivery.masks.get(plane)
    if roles:
        return list(roles.values())
    source = delivery.planes.get(plane)
    return [source] if source else []


def cell_box(index: int) -> tuple[int, int, int, int]:
    col, row = index % COLS, index // COLS
    return (col * CELL, row * CELL, (col + 1) * CELL, (row + 1) * CELL)


def cell_visible(alpha: Image.Image, index: int) -> bool:
    return alpha.crop(cell_box(index)).getbbox() is not None


def touches(alpha: Image.Image, index: int, point: list[int]) -> bool:
    col, row = index % COLS, index // COLS
    x = col * CELL + point[0]
    y = row * CELL + point[1]
    box = (
        max(col * CELL, x - 2), max(row * CELL, y - 2),
        min((col + 1) * CELL, x + 3), min((row + 1) * CELL, y + 3),
    )
    return alpha.crop(box).getbbox() is not None


def intersects(alpha: Image.Image, index: int, roi: list[int]) -> bool:
    col, row = index % COLS, index // COLS
    x, y, width, height = roi
    box = (col * CELL + x, row * CELL + y, col * CELL + x + width, row * CELL + y + height)
    return alpha.crop(box).getbbox() is not None


def edge_visible(alpha: Image.Image, index: int) -> bool:
    cell = alpha.crop(cell_box(index))
    edge = Image.new("L", (CELL, CELL), 0)
    edge.paste(cell.crop((0, 0, CELL, 1)), (0, 0))
    edge.paste(cell.crop((0, CELL - 1, CELL, CELL)), (0, CELL - 1))
    edge.paste(cell.crop((0, 0, 1, CELL)), (0, 0))
    edge.paste(cell.crop((CELL - 1, 0, CELL, CELL)), (CELL - 1, 0))
    return edge.getbbox() is not None


def rgba_visible_count(source: PlaneSource) -> int:
    alpha = source.image.getchannel("A")
    values = alpha.get_flattened_data() if hasattr(alpha, "get_flattened_data") else alpha.getdata()
    return sum(1 for value in values if value > ALPHA_MIN)


def validate_delivery(delivery: Delivery) -> dict[str, Any]:
    errors: list[str] = []
    checks = {
        "decodedSources": 0,
        "frameCoverage": 0,
        "edgePadding": 0,
        "socketContacts": 0,
        "handRoiContacts": 0,
        "forearmHygiene": 0,
        "armorRoiContacts": 0,
        "maskPixels": 0,
    }

    all_sources: list[tuple[str, PlaneSource]] = []
    for plane, source in delivery.planes.items():
        all_sources.append((plane, source))
    for plane, roles in delivery.masks.items():
        for role, source in roles.items():
            all_sources.append((f"{plane}_mask_{role}", source))

    for label, source in all_sources:
        checks["decodedSources"] += 1
        alpha = threshold_alpha(source)
        for index in range(COLS * ROWS):
            checks["edgePadding"] += 1
            if edge_visible(alpha, index):
                errors.append(f"{label} frame {index} {POSES[index // COLS]}/{DIRECTIONS[index % COLS]} touches a cell edge")
        if "_mask_" in label:
            for red, green, blue, alpha_value in source.image.getdata():
                if alpha_value > ALPHA_MIN:
                    checks["maskPixels"] += 1
                    if red != green or green != blue:
                        errors.append(f"{label} contains non-grayscale visible pixels")
                        break

    for plane, roles in delivery.masks.items():
        base = threshold_alpha(delivery.planes[plane])
        combined = union_alpha(list(roles.values()))
        outside = ImageChops.subtract(combined, base)
        missing = ImageChops.subtract(base, combined)
        if outside.getbbox() is not None:
            errors.append(f"{plane} material masks contain visible pixels outside authored {plane}.png")
        if missing.getbbox() is not None:
            errors.append(f"{plane} material masks do not cover the complete runtime-visible {plane}.png silhouette")

    required = REQUIRED_PLANES[delivery.slot]
    for plane in required:
        alpha = union_alpha(effective_sources(delivery, plane))
        for index in range(COLS * ROWS):
            checks["frameCoverage"] += 1
            if not cell_visible(alpha, index):
                errors.append(f"mandatory {plane} frame {index} {POSES[index // COLS]}/{DIRECTIONS[index % COLS]} is empty")

    if delivery.slot in {"main", "shield", "unarmed"}:
        object_sources = [
            source
            for plane in ("rear", "held", "front")
            for source in effective_sources(delivery, plane)
        ]
        object_alpha = union_alpha(object_sources) if object_sources else Image.new("L", ATLAS_SIZE, 0)
        grip_alpha = union_alpha(effective_sources(delivery, "grip"))
        if delivery.slot == "main":
            roles = ("main", "off") if delivery.family.endswith("_2h") else ("main",)
        elif delivery.slot == "shield":
            roles = ("off",)
        else:
            roles = ("main", "off")
        require_object = delivery.slot != "unarmed"
        assert delivery.forearms is not None
        for index, frame in enumerate(delivery.frames):
            for role in roles:
                socket = frame[f"{role}Grip"]
                if require_object:
                    checks["socketContacts"] += 1
                    if not touches(object_alpha, index, socket):
                        errors.append(
                            f"object pixels miss canonical {role}Grip {socket} by >2px in frame {index} "
                            f"{POSES[index // COLS]}/{DIRECTIONS[index % COLS]}"
                        )
                checks["socketContacts"] += 1
                if not touches(grip_alpha, index, socket):
                    errors.append(
                        f"grip pixels miss canonical {role}Grip {socket} by >2px in frame {index} "
                        f"{POSES[index // COLS]}/{DIRECTIONS[index % COLS]}"
                    )
                checks["handRoiContacts"] += 1
                if not intersects(grip_alpha, index, frame[f"{role}HandROI"]):
                    errors.append(f"grip pixels miss canonical {role}HandROI in frame {index}")

            col, row = index % COLS, index // COLS
            grip_cell = grip_alpha.crop(cell_box(index))
            allowed = Image.new("L", (CELL, CELL), 0)
            for role in roles:
                x, y, width, height = delivery.forearms[index][f"{role}ForearmROI"]
                allowed.paste(255, (x, y, x + width, y + height))
            residue = ImageChops.subtract(grip_cell, allowed)
            checks["forearmHygiene"] += 1
            if residue.getbbox() is not None:
                count = sum(1 for value in residue.getdata() if value)
                errors.append(f"grip frame {index} has {count} visible pixels outside reviewed forearm ROI(s)")

    if delivery.slot in {"head", "chest"}:
        worn = union_alpha(effective_sources(delivery, "worn"))
        roi_key = f"{delivery.slot}ROI"
        for index, frame in enumerate(delivery.frames):
            checks["armorRoiContacts"] += 1
            if not intersects(worn, index, frame[roi_key]):
                errors.append(f"worn pixels miss canonical {roi_key} in frame {index}")

    report = {
        "version": 1,
        "status": "pass" if not errors else "fail",
        "sourceKind": "authored-final-192-cells-no-geometry-transform",
        "rigRevision": RIG_REVISION,
        "class": delivery.class_id,
        "slot": delivery.slot,
        "family": delivery.family,
        "layout": {
            "cell": [CELL, CELL], "atlas": list(ATLAS_SIZE), "anchor": ANCHOR,
            "directions": list(DIRECTIONS), "poses": list(POSES), "frames": COLS * ROWS,
        },
        "operationsApplied": ["decode", "fixed-index-cell-assembly", "contact-validation", "pixel-equality-check"],
        "geometryTransformsApplied": {
            "translate": False, "rotate": False, "scale": False, "flip": False,
            "trim": False, "clampFrame": False, "inferSocket": False, "splitPlanes": False,
        },
        "forbiddenOperations": [
            "translate", "rotate", "scale", "flip", "trim", "clamp-frame",
            "infer-socket", "split-planes", "extract-body-mask",
        ],
        "sources": {
            label: {
                "sourceKind": source.source_kind,
                "sourceSha256": source.source_sha256,
                "pixelSha256": source.pixel_sha256,
                "visiblePixels": rgba_visible_count(source),
            }
            for label, source in all_sources
        },
        "checks": checks,
        "errors": errors,
    }
    return report


def composite_qa(delivery: Delivery, output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    body = open_exact_png(RIG_ROOT / delivery.class_id / "body.png", ATLAS_SIZE, "canonical body")
    composite = Image.new("RGBA", ATLAS_SIZE, (0, 0, 0, 0))
    order = ("rear", "body", "worn", "held", "grip", "front")
    for plane in order:
        if plane == "body":
            composite.alpha_composite(body)
            continue
        source = delivery.planes.get(plane)
        if source:
            # QA shows the authored base colors. Contact checks use the same
            # effective mask-replacement semantics as runtime.
            composite.alpha_composite(source.image)
    composite.save(output_dir / "composite.png", "PNG", compress_level=7)

    overlay = composite.copy()
    draw = ImageDraw.Draw(overlay)
    for index, frame in enumerate(delivery.frames):
        col, row = index % COLS, index // COLS
        ox, oy = col * CELL, row * CELL
        for role, color in (("main", (255, 64, 64, 255)), ("off", (64, 220, 255, 255))):
            gx, gy = frame[f"{role}Grip"]
            draw.line((ox + gx - 4, oy + gy, ox + gx + 4, oy + gy), fill=color, width=1)
            draw.line((ox + gx, oy + gy - 4, ox + gx, oy + gy + 4), fill=color, width=1)
            hx, hy, hw, hh = frame[f"{role}HandROI"]
            draw.rectangle((ox + hx, oy + hy, ox + hx + hw - 1, oy + hy + hh - 1), outline=color, width=1)
            if delivery.forearms:
                fx, fy, fw, fh = delivery.forearms[index][f"{role}ForearmROI"]
                draw.rectangle((ox + fx, oy + fy, ox + fx + fw - 1, oy + fy + fh - 1), outline=color, width=1)
        roi_key = "headROI" if delivery.slot == "head" else "chestROI" if delivery.slot == "chest" else None
        if roi_key:
            x, y, width, height = frame[roi_key]
            draw.rectangle((ox + x, oy + y, ox + x + width - 1, oy + y + height - 1), outline=(255, 230, 80, 255), width=1)
        draw.text((ox + 3, oy + 3), f"{index} {POSES[row]}/{DIRECTIONS[col]}", fill=(255, 255, 255, 255))
    overlay.save(output_dir / "contact_overlay.png", "PNG", compress_level=7)


def destination_files(delivery: Delivery) -> dict[str, PlaneSource]:
    result = {f"{plane}.png": source for plane, source in delivery.planes.items()}
    for plane, roles in delivery.masks.items():
        for role, source in roles.items():
            result[f"{plane}_mask_{role}.png"] = source
    return result


def write_source(source: PlaneSource, output: Path) -> None:
    if source.source_kind == "verbatim-atlas":
        shutil.copyfile(source.source_paths[0], output)
        if sha256_file(output) != source.source_sha256:
            raise AssertionError(f"byte-for-byte atlas copy changed {output}")
    else:
        source.image.save(output, "PNG", compress_level=7)
    checked = open_exact_png(output, ATLAS_SIZE, f"imported {output.name}")
    if sha256_bytes(checked.tobytes()) != source.pixel_sha256:
        raise AssertionError(f"import changed decoded pixels in {output}")


def import_delivery(delivery: Delivery, report: dict[str, Any]) -> Path:
    if report["status"] != "pass":
        raise ContractError("refusing import because contact/layout validation failed")
    destination = AUTHORED_ROOT / delivery.class_id / delivery.slot / delivery.family
    if destination.exists():
        raise ContractError(
            f"canonical family already exists; importer never overwrites reviewed art: {destination}"
        )
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = Path(tempfile.mkdtemp(prefix=f".{delivery.family}.import-", dir=destination.parent))
    try:
        for name, source in destination_files(delivery).items():
            write_source(source, temporary / name)
        os.replace(temporary, destination)
    except Exception:
        if temporary.exists():
            shutil.rmtree(temporary)
        raise
    return destination


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def scaffold(class_id: str, slot: str, family: str, output: Path) -> None:
    require_target(class_id, slot, family)
    output = output.resolve()
    if output.exists():
        raise ContractError(f"scaffold output already exists; refusing overwrite: {output}")
    output.mkdir(parents=True)
    frames = registration_frames(class_id)
    planes = {plane: None for plane in SLOT_PLANES[slot]}
    for plane in REQUIRED_PLANES[slot]:
        planes[plane] = {"cells": f"cells/{plane}"}
        directory = output / "cells" / plane
        directory.mkdir(parents=True)
        for index in range(COLS * ROWS):
            Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0)).save(directory / frame_name(index), "PNG")
    descriptor = {
        "version": 1,
        "rigRevision": RIG_REVISION,
        "classId": class_id,
        "slot": slot,
        "family": family,
        "cell": [CELL, CELL],
        "atlas": list(ATLAS_SIZE),
        "anchor": ANCHOR,
        "directions": list(DIRECTIONS),
        "poses": list(POSES),
        "planes": planes,
        "masks": {},
    }
    write_json(output / "delivery.json", descriptor)

    body = open_exact_png(RIG_ROOT / class_id / "body.png", ATLAS_SIZE, "canonical body")
    guides = output / "guides"
    guides.mkdir()
    for index, frame in enumerate(frames):
        guide = body.crop(cell_box(index))
        draw = ImageDraw.Draw(guide)
        for role, color in (("main", (255, 64, 64, 255)), ("off", (64, 220, 255, 255))):
            gx, gy = frame[f"{role}Grip"]
            draw.line((gx - 5, gy, gx + 5, gy), fill=color, width=1)
            draw.line((gx, gy - 5, gx, gy + 5), fill=color, width=1)
            x, y, width, height = frame[f"{role}HandROI"]
            draw.rectangle((x, y, x + width - 1, y + height - 1), outline=color, width=1)
        roi_key = "headROI" if slot == "head" else "chestROI" if slot == "chest" else None
        if roi_key:
            x, y, width, height = frame[roi_key]
            draw.rectangle((x, y, x + width - 1, y + height - 1), outline=(255, 230, 80, 255), width=1)
        draw.text((3, 3), f"{index} {POSES[index // COLS]}/{DIRECTIONS[index % COLS]}", fill=(255, 255, 255, 255))
        guide.save(guides / frame_name(index), "PNG", compress_level=7)

    if slot in {"main", "shield", "unarmed"}:
        fragment = {
            "version": 1,
            "method": "authored-final-body-forearm-rois-v1",
            "review": "TODO-visual-overlay-v1",
            "classId": class_id,
            "frames": [
                {
                    "index": index,
                    "pose": POSES[index // COLS],
                    "direction": DIRECTIONS[index % COLS],
                    "mainForearmROI": None,
                    "offForearmROI": None,
                    "review": "TODO-authored-visual-v1",
                }
                for index in range(COLS * ROWS)
            ],
        }
        write_json(output / "forearm_rois.fragment.json", fragment)
    print(f"Created immutable 72-cell authoring scaffold: {output}")
    print("Draw only in cells/<plane>/; guides/ are reference-only and must never be exported into a plane.")


def render_forearm_overlay(class_id: str, annotation: Path, output: Path) -> None:
    frames = registration_frames(class_id)
    authored = parse_forearms(annotation.resolve(), class_id, frames, require_review=False)
    body = open_exact_png(RIG_ROOT / class_id / "body.png", ATLAS_SIZE, "canonical body")
    overlay = body.copy()
    draw = ImageDraw.Draw(overlay, "RGBA")
    for index, (frame, forearm) in enumerate(zip(frames, authored)):
        col, row = index % COLS, index // COLS
        ox, oy = col * CELL, row * CELL
        draw.rectangle((ox, oy, ox + CELL - 1, oy + CELL - 1), outline=(90, 90, 90, 180), width=1)
        for role, color in (("main", (255, 64, 64, 255)), ("off", (64, 220, 255, 255))):
            gx, gy = frame[f"{role}Grip"]
            draw.line((ox + gx - 5, oy + gy, ox + gx + 5, oy + gy), fill=color, width=1)
            draw.line((ox + gx, oy + gy - 5, ox + gx, oy + gy + 5), fill=color, width=1)
            hx, hy, hw, hh = frame[f"{role}HandROI"]
            draw.rectangle((ox + hx, oy + hy, ox + hx + hw - 1, oy + hy + hh - 1), outline=color, width=1)
            fx, fy, fw, fh = forearm[f"{role}ForearmROI"]
            translucent = (color[0], color[1], color[2], 48)
            draw.rectangle((ox + fx, oy + fy, ox + fx + fw - 1, oy + fy + fh - 1), fill=translucent, outline=color, width=1)
        draw.text((ox + 3, oy + 3), f"{index} {POSES[row]}/{DIRECTIONS[col]}", fill=(255, 255, 255, 255))
    output = output.resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    overlay.save(output, "PNG", compress_level=7)
    print(f"Wrote read-only forearm review overlay: {output}")
    print("This does not mark the annotation reviewed; a human reviewer must inspect all 72 cells.")


def run_check(args: argparse.Namespace, should_import: bool) -> None:
    delivery = load_delivery(args.delivery, args.forearm_registration)
    report = validate_delivery(delivery)
    if args.qa_dir:
        composite_qa(delivery, args.qa_dir.resolve())
    if args.report:
        write_json(args.report.resolve(), report)
    if report["status"] != "pass":
        messages = report["errors"]
        preview = "\n".join(f"  - {message}" for message in messages[:40])
        suffix = f"\n  ... {len(messages) - 40} more" if len(messages) > 40 else ""
        raise ContractError(f"delivery failed {len(messages)} checks:\n{preview}{suffix}")
    destination = None
    if should_import:
        destination = import_delivery(delivery, report)
    print(
        f"PASS: {delivery.class_id}/{delivery.slot}/{delivery.family}: "
        f"72 exact final cells; {sum(report['checks'].values())} checks; no geometry transforms"
    )
    if destination:
        print(f"Imported atomically without overwrite: {destination}")
        print("Not certified or packed. Complete visual contact-sheet review before authorship hashing/build.")


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser(description=__doc__)
    commands = result.add_subparsers(dest="command", required=True)
    scaffold_parser = commands.add_parser("scaffold", help="create exact final-cell blank planes and body guides")
    scaffold_parser.add_argument("--class-id", required=True, choices=CLASSES)
    scaffold_parser.add_argument("--slot", required=True, choices=tuple(SLOT_FAMILIES))
    scaffold_parser.add_argument("--family", required=True)
    scaffold_parser.add_argument("--out", required=True, type=Path)
    overlay_parser = commands.add_parser(
        "forearm-overlay", help="render manual forearm rectangles over the immutable accepted body",
    )
    overlay_parser.add_argument("--class-id", required=True, choices=CLASSES)
    overlay_parser.add_argument("--annotation", required=True, type=Path)
    overlay_parser.add_argument("--out", required=True, type=Path)
    for name in ("check", "import"):
        command = commands.add_parser(name, help=f"{name} a final-aligned artist delivery")
        command.add_argument("--delivery", required=True, type=Path)
        command.add_argument("--forearm-registration", type=Path)
        command.add_argument("--qa-dir", type=Path)
        command.add_argument("--report", type=Path)
    return result


def main() -> None:
    args = parser().parse_args()
    try:
        if args.command == "scaffold":
            scaffold(args.class_id, args.slot, args.family, args.out)
        elif args.command == "forearm-overlay":
            render_forearm_overlay(args.class_id, args.annotation, args.out)
        else:
            run_check(args, should_import=args.command == "import")
    except ContractError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise SystemExit(2) from exc


if __name__ == "__main__":
    main()
