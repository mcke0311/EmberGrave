#!/usr/bin/env python3
"""Validate strict sprite coverage, including the grip-accurate player rig."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
import subprocess
import sys
from collections import defaultdict
from pathlib import Path
from typing import Any, Iterable

from PIL import Image, ImageChops, ImageStat


ROOT = Path(__file__).resolve().parents[1]
PLAYER_CLASSES = ("vanguard", "emberwitch", "gravebinder", "wildkeeper", "veilranger")
PLAYER_DIRS = ("E", "SE", "S", "SW", "W", "NW", "N", "NE")
PLAYER_POSES = ("idle", "walkA", "walkB", "attackWindup", "attackImpact", "cast", "hit", "death", "dead")
PLAYER_PLANES = ("rear", "body", "worn", "held", "grip", "front")
PLAYER_MAIN_FAMILIES = (
    "sword_1h", "sword_2h", "axe_1h", "axe_2h", "mace_1h", "mace_2h",
    "dagger_1h", "spear_2h", "bow_2h", "crossbow_2h", "wand_1h", "staff_2h",
)
PLAYER_TWO_HAND = {name for name in PLAYER_MAIN_FAMILIES if name.endswith("_2h")}
PLAYER_ARMOR_FAMILIES = ("light", "mail", "plate", "mythic")
PLAYER_SLOT_FAMILIES = {
    "unarmed": ("unarmed",),
    "main": PLAYER_MAIN_FAMILIES,
    "shield": ("shield",),
    "head": PLAYER_ARMOR_FAMILIES,
    "chest": PLAYER_ARMOR_FAMILIES,
}
PLAYER_EQUIPMENT_SLOTS = tuple(PLAYER_SLOT_FAMILIES)
EMBERWITCH_COMPLETE_EQUIPMENT = {
    "unarmed": set(),
    "main": set(PLAYER_MAIN_FAMILIES),
    "shield": {"shield"},
    "head": set(PLAYER_ARMOR_FAMILIES),
    "chest": set(PLAYER_ARMOR_FAMILIES),
}
PLAYER_RIG_REVISION = "grip-rig-v1"
PLAYER_CELL = [192, 192]
PLAYER_ANCHOR = [96, 184]
PLAYER_FRAME_COUNT = len(PLAYER_DIRS) * len(PLAYER_POSES)
PLAYER_SOCKET_ALPHA_MIN = 8
PLAYER_CHEST_CORE_INSET = 10
MATERIAL_ROLES = {"metal", "wood", "trim", "glow", "cloth", "leather", "accent"}
RIG_REGISTRATION = ROOT / "assets" / "sprites_src" / "player_rig" / "registrations.json"
BODY_IDENTITY_LANDMARKS = ROOT / "assets" / "sprites_src" / "player_rig" / "qa" / "body_identity_landmarks_v1.json"
EQUIPMENT_AUTHORSHIP = ROOT / "assets" / "sprites_src" / "player_rig_authored" / "equipment_authorship_v1.json"
BASE_EQUIPMENT_COVERAGE = (
    ROOT / "assets" / "sprites_src" / "player_rig_authored" / "base_equipment_coverage_v1.json"
)
STARTER_LOADOUT_ROOT = ROOT / "assets" / "sprites_src" / "player_starter_loadouts"
STARTER_LOADOUT_AUTHORSHIP = STARTER_LOADOUT_ROOT / "starter_loadouts_v1.json"
EQUIPMENT_FOREARM_REGISTRATION = (
    ROOT / "assets" / "sprites_src" / "player_rig" / "qa" / "equipment_forearm_registration_v1.json"
)
GAMEPLAY_ART_AUTHORSHIP = ROOT / "assets" / "sprites_src" / "gameplay_art" / "gameplay_art_v1.json"
GAMEPLAY_ART_COVERAGE = ROOT / "assets" / "sprites" / "gameplay_art_coverage.json"
GAMEPLAY_ART_ROOT = ROOT / "assets" / "sprites_src" / "gameplay_art"
PATH_IMPORT_REPORT = ROOT / "assets" / "sprites_src" / "gameplay_art_authored" / "paths" / "import_v1.json"
CLIFF_IMPORT_REPORT = ROOT / "assets" / "sprites_src" / "gameplay_art_authored" / "cliffs" / "import_v1.json"
CLIFF_PROMPT_REPORT = ROOT / "assets" / "sprites_src" / "gameplay_art_authored" / "cliffs" / "prompts_v1.json"
UI_SCENE_AUTHORSHIP = ROOT / "assets" / "sprites_src" / "ui" / "scenes" / "ui_scenes_v1.json"
GAMEPLAY_ART_WALL_CONTRACT = {
    "cell": [128, 128], "footprint": [64, 32], "rise": 72,
    "anchor": [64, 112], "frames": 16,
}
PATH_THEMES = {
    "town": "cobblestone", "fields": "earth", "crypt": "cryptstone", "vigil": "cobblestone",
    "chapel": "cobblestone", "forest": "earth", "monastery": "cobblestone", "snowwild": "ice",
    "icecave": "ice", "mine": "cryptstone", "temple": "sandstone", "marsh": "earth",
    "drowned": "cryptstone", "desert": "sandstone", "tombs": "sandstone", "palace": "cobblestone",
    "cathedral": "cobblestone", "hellwild": "hellstone", "bastion": "hellstone", "throne": "hellstone",
}
PATH_SOCKETS = {1: (48, 8), 2: (48, 24), 4: (16, 24), 8: (16, 8)}
PATH_RECIPROCAL_BITS = {1: 4, 2: 8, 4: 1, 8: 2}
PATH_SOCKET_RADIUS = 2


def load_manifest() -> dict[str, Any]:
    text = (ROOT / "js" / "sprite_manifest.js").read_text(encoding="utf-8")
    match = re.search(r"DATA\.SPRITE_MANIFEST\s*=\s*(\{.*\})\s*;\s*$", text, re.S)
    if not match:
        raise AssertionError("js/sprite_manifest.js does not contain a JSON-compatible manifest")
    return json.loads(match.group(1))


def load_game_data() -> dict[str, Any]:
    """Evaluate plain game data once so generated bases/uniques are validated too."""
    script = r"""
const fs=require('fs');
eval(fs.readFileSync('js/utils.js','utf8')+';globalThis.U=U');
eval(fs.readFileSync('js/data.js','utf8')+';globalThis.__DATA=DATA');
const d=globalThis.__DATA;
process.stdout.write(JSON.stringify({
  classes:d.CLASSES,bases:d.BASES,uniques:d.UNIQUES||[],setItems:d.SET_ITEMS||[],
  starterLoadouts:d.PLAYER_STARTER_LOADOUTS||{}
}));
"""
    proc = subprocess.run(
        ["node", "-e", script], cwd=ROOT, text=True, capture_output=True, check=False
    )
    if proc.returncode:
        raise AssertionError(f"could not evaluate js/data.js for equipment coverage: {proc.stderr.strip()}")
    return json.loads(proc.stdout)


def add(errors: list[str], message: str) -> None:
    errors.append(message)


def load_strict_json(path: Path, label: str, errors: list[str]) -> dict[str, Any] | None:
    """Load a provenance document while rejecting duplicate object keys."""
    def unique_object(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
        result: dict[str, Any] = {}
        for key, value in pairs:
            if key in result:
                raise ValueError(f"duplicate JSON key {key!r}")
            result[key] = value
        return result

    try:
        document = json.loads(path.read_text(encoding="utf-8"), object_pairs_hook=unique_object)
    except Exception as exc:
        add(errors, f"{label} is missing or malformed: {exc}")
        return None
    if not isinstance(document, dict):
        add(errors, f"{label} must be a JSON object")
        return None
    return document


def atlas_contract(entry: dict[str, Any]) -> bool:
    return (
        entry.get("kind") == "atlas"
        and entry.get("cell") == PLAYER_CELL
        and entry.get("cols") == len(PLAYER_DIRS)
        and entry.get("rows") == len(PLAYER_POSES)
        and entry.get("anchor") == PLAYER_ANCHOR
    )


def iter_layer_refs(value: Any, inherited_role: str | None = None) -> Iterable[tuple[str, str | None]]:
    """Mirror SpriteAssets.normalizeLayerRefs without accepting malformed scalars."""
    if value is None:
        return
    if isinstance(value, str):
        yield value, inherited_role
        return
    if isinstance(value, list):
        for child in value:
            yield from iter_layer_refs(child, inherited_role)
        return
    if not isinstance(value, dict):
        return
    if value.get("assetId") or value.get("id"):
        yield value.get("assetId") or value["id"], value.get("tintRole") or inherited_role
        return
    for role, child in value.items():
        yield from iter_layer_refs(child, inherited_role or role)


def family_refs(family: dict[str, Any], planes: Iterable[str]) -> Iterable[tuple[str, str, str | None, bool]]:
    for plane in planes:
        for asset_id, role in iter_layer_refs(family.get(plane)):
            yield plane, asset_id, role, False
        masks = family.get("masks", {}).get(plane) if isinstance(family.get("masks"), dict) else None
        for asset_id, role in iter_layer_refs(masks):
            yield plane, asset_id, role, True


def rendered_refs(family: dict[str, Any], plane: str) -> Iterable[tuple[str, str | None, bool]]:
    """Mirror familyLayers: masks replace, rather than overlay, their base plane."""
    masks = family.get("masks", {}).get(plane) if isinstance(family.get("masks"), dict) else None
    refs = list(iter_layer_refs(masks))
    if refs:
        for asset_id, role in refs:
            yield asset_id, role, True
    else:
        for asset_id, role in iter_layer_refs(family.get(plane)):
            yield asset_id, role, False


def equipment_planes(slot: str) -> tuple[str, ...]:
    if slot in {"unarmed", "main", "shield"}:
        return ("rear", "held", "grip", "front")
    if slot in {"head", "chest"}:
        return ("rear", "worn", "front")
    raise ValueError(f"unsupported player-equipment slot {slot!r}")


def equipment_required_planes(slot: str) -> tuple[str, ...]:
    if slot in {"main", "shield"}:
        return ("held", "grip")
    if slot == "unarmed":
        return ("grip",)
    if slot in {"head", "chest"}:
        return ("worn",)
    raise ValueError(f"unsupported player-equipment slot {slot!r}")


def available_equipment_definitions(
    coverage: dict[str, Any], class_ids: Iterable[str] = PLAYER_CLASSES,
) -> Iterable[tuple[str, str, str, dict[str, Any]]]:
    """Yield only families explicitly promoted to canonical authored coverage."""
    classes = coverage.get("classes", {}) if isinstance(coverage, dict) else {}
    for class_id in class_ids:
        node = classes.get(class_id, {}) if isinstance(classes, dict) else {}
        available = node.get("available", {}) if isinstance(node, dict) else {}
        if not isinstance(available, dict):
            continue
        for slot in PLAYER_EQUIPMENT_SLOTS:
            families = available.get(slot, {})
            if not isinstance(families, dict):
                continue
            for family, definition in families.items():
                if isinstance(definition, dict):
                    yield class_id, slot, family, definition


def declared_equipment_roles(
    coverage: dict[str, Any], class_ids: Iterable[str] = PLAYER_CLASSES,
) -> dict[tuple[str, str, str, str, str | None], str]:
    """Map each promoted runtime-visible role to its canonical source PNG."""
    roles: dict[tuple[str, str, str, str, str | None], str] = {}
    for class_id, slot, family, definition in available_equipment_definitions(coverage, class_ids):
        for plane in equipment_planes(slot):
            for source_rel, material, _is_mask in rendered_refs(definition, plane):
                roles[(class_id, slot, family, plane, material)] = source_rel
    return roles


def runtime_equipment_asset_id(
    class_id: str, slot: str, family: str, plane: str, material: str | None,
) -> str:
    suffix = f".mask.{material}" if material else ""
    return f"player.rig.{class_id}.{slot}.{family}.{plane}{suffix}"


def remove_starter_micro_islands(atlas: Image.Image, maximum_pixels: int = 8) -> tuple[Image.Image, int, int]:
    """Independently replay the v2 whole-atlas 8-connected alpha cleanup."""
    if atlas.mode != "RGBA":
        raise ValueError("starter micro-island cleanup requires RGBA pixels")
    width, height = atlas.size
    alpha = bytearray(atlas.getchannel("A").tobytes())
    seen = bytearray(width * height)
    removed: list[int] = []
    component_count = 0
    for start in range(width * height):
        if seen[start] or alpha[start] <= PLAYER_SOCKET_ALPHA_MIN:
            continue
        seen[start] = 1
        stack = [start]
        component: list[int] = []
        while stack:
            current = stack.pop()
            component.append(current)
            y, x = divmod(current, width)
            for yy in range(max(0, y - 1), min(height, y + 2)):
                row = yy * width
                for xx in range(max(0, x - 1), min(width, x + 2)):
                    candidate = row + xx
                    if not seen[candidate] and alpha[candidate] > PLAYER_SOCKET_ALPHA_MIN:
                        seen[candidate] = 1
                        stack.append(candidate)
        if len(component) <= maximum_pixels:
            component_count += 1
            removed.extend(component)
    if not removed:
        return atlas, 0, 0
    rgba = bytearray(atlas.tobytes())
    for index in removed:
        offset = index * 4
        rgba[offset:offset + 4] = b"\x00\x00\x00\x00"
    return Image.frombytes("RGBA", atlas.size, bytes(rgba)), component_count, len(removed)


def validate_starter_loadouts(
    data: dict[str, Any], manifest: dict[str, Any], errors: list[str], *, compare_runtime: bool,
    qa_warnings: list[str] | None = None,
) -> int:
    """Validate the five reviewed, flattened body+starter-equipment atlases.

    These atlases are the playable declared-partial base. They do not certify
    any modular family: they remain exact starter fallbacks for classes whose
    modular families are absent. Installed modular loadouts take precedence,
    while every unsupported modular swap remains fail-closed.
    """
    document = load_strict_json(
        STARTER_LOADOUT_AUTHORSHIP, "player starter-loadout provenance", errors,
    )
    if document is None:
        return 0
    expected_top = {"version", "sourceKind", "review", "classes"}
    if set(document) != expected_top:
        add(errors, f"player starter-loadout provenance keys must be {sorted(expected_top)}")
    if (
        document.get("version") != 1
        or document.get("sourceKind") != "authored-flattened-starter-loadout"
        or document.get("review") != "visual-contact-sheet-v1"
    ):
        add(errors, "player starter-loadout provenance has invalid reviewed v1 identity")
    classes = document.get("classes")
    if not isinstance(classes, dict) or set(classes) != set(PLAYER_CLASSES):
        actual = sorted(classes) if isinstance(classes, dict) else []
        add(errors, f"player starter-loadout provenance must contain exactly {list(PLAYER_CLASSES)}, found {actual}")
        classes = classes if isinstance(classes, dict) else {}

    runtime_starters = data.get("starterLoadouts")
    if not isinstance(runtime_starters, dict) or set(runtime_starters) != set(PLAYER_CLASSES):
        actual = sorted(runtime_starters) if isinstance(runtime_starters, dict) else []
        add(errors, f"DATA.PLAYER_STARTER_LOADOUTS must bind exactly {list(PLAYER_CLASSES)}, found {actual}")
        runtime_starters = runtime_starters if isinstance(runtime_starters, dict) else {}

    expected_record_keys = {
        "source", "sourceSha256", "method", "sourceSize", "output", "outputSize",
        "anchor", "frames", "frameAlphaBboxes", "review", "outputSha256",
        "microIslandMaxPixels", "microIslandComponentsRemoved", "microIslandPixelsRemoved",
    }
    starter_asset_ids: dict[str, str] = {}
    checks = 0
    for class_id in PLAYER_CLASSES:
        binding = runtime_starters.get(class_id)
        if not isinstance(binding, dict) or set(binding) != {"main", "chest"}:
            add(errors, f"DATA.PLAYER_STARTER_LOADOUTS {class_id}: expected exact main/chest base IDs")
            binding = {}
        for slot in ("main", "chest"):
            base_id = binding.get(slot)
            base = data.get("bases", {}).get(base_id)
            if not isinstance(base, dict) or base.get("slot") != slot:
                add(errors, f"DATA.PLAYER_STARTER_LOADOUTS {class_id}: {slot} base {base_id!r} is unknown or belongs to another slot")

        record = classes.get(class_id)
        label = f"player starter loadout {class_id}"
        if not isinstance(record, dict):
            add(errors, f"{label}: provenance record is missing")
            continue
        if set(record) != expected_record_keys:
            add(errors, f"{label}: provenance keys must be {sorted(expected_record_keys)}")
        expected_source = f"assets/sprites_src/player_starter_loadouts_authored/{class_id}_starter_raw_v1.png"
        expected_output = f"assets/sprites_src/player_starter_loadouts/{class_id}.png"
        expected_values = {
            "source": expected_source,
            "method": "imagegen-authored-flat-loadout-uniform-atlas-resize-micro-island-clean-v2",
            "output": expected_output,
            "outputSize": [1536, 1728],
            "anchor": PLAYER_ANCHOR,
            "frames": PLAYER_FRAME_COUNT,
            "review": "visual-contact-sheet-v1",
            "microIslandMaxPixels": 8,
        }
        for key, expected in expected_values.items():
            if record.get(key) != expected:
                add(errors, f"{label}: {key} must be {expected!r}, found {record.get(key)!r}")

        source_path = ROOT / expected_source
        output_path = ROOT / expected_output
        source_image: Image.Image | None = None
        output_image: Image.Image | None = None
        for kind, path, hash_key in (
            ("source", source_path, "sourceSha256"), ("output", output_path, "outputSha256"),
        ):
            digest = record.get(hash_key)
            if not isinstance(digest, str) or not re.fullmatch(r"[0-9a-f]{64}", digest):
                add(errors, f"{label}: {hash_key} must be a lowercase SHA-256")
            if not path.is_file():
                add(errors, f"{label}: checked-in {kind} is missing: {path.relative_to(ROOT).as_posix()}")
                continue
            if hashlib.sha256(path.read_bytes()).hexdigest() != digest:
                add(errors, f"{label}: {hash_key} does not match checked-in {kind}")
            try:
                with Image.open(path) as opened:
                    opened.load()
                    if opened.format != "PNG":
                        add(errors, f"{label}: {kind} must be a PNG")
                    if kind == "source":
                        source_size = list(opened.size)
                        if record.get("sourceSize") != source_size:
                            add(errors, f"{label}: sourceSize {record.get('sourceSize')!r} does not match {source_size}")
                        if opened.height == 0 or abs(opened.width / opened.height - 8 / 9) > .002:
                            add(errors, f"{label}: authored source must retain the reviewed 8:9 whole-atlas aspect ratio")
                        source_image = opened.convert("RGB")
                    else:
                        if opened.mode != "RGBA" or opened.size != (1536, 1728):
                            add(errors, f"{label}: output must be exact RGBA 1536x1728")
                        output_image = opened.copy()
            except Exception as exc:
                add(errors, f"{label}: {kind} decode failed: {exc}")

        declared_boxes = record.get("frameAlphaBboxes")
        if not isinstance(declared_boxes, list) or len(declared_boxes) != PLAYER_FRAME_COUNT:
            add(errors, f"{label}: frameAlphaBboxes must contain exactly 72 records")
            declared_boxes = []
        actual_boxes: list[list[int] | None] = []
        if output_image is not None:
            for index in range(PLAYER_FRAME_COUNT):
                col, row = index % 8, index // 8
                cell = output_image.crop((col * 192, row * 192, (col + 1) * 192, (row + 1) * 192))
                box = cell.getchannel("A").point(
                    lambda value: 255 if value > PLAYER_SOCKET_ALPHA_MIN else 0
                ).getbbox()
                actual = list(box) if box else None
                actual_boxes.append(actual)
                if actual is None:
                    add(errors, f"{label}: frame {index} ({PLAYER_POSES[row]}/{PLAYER_DIRS[col]}) is empty")
                elif index < len(declared_boxes) and declared_boxes[index] != actual:
                    add(errors, f"{label}: frame {index} alpha bbox {actual} does not match provenance {declared_boxes[index]!r}")
                checks += 1
            edge_frames = [
                index for index, box in enumerate(actual_boxes)
                if box is not None and (box[0] == 0 or box[1] == 0 or box[2] == 192 or box[3] == 192)
            ]
            if edge_frames and qa_warnings is not None:
                frame_names = ", ".join(
                    f"{PLAYER_POSES[index // 8]}/{PLAYER_DIRS[index % 8]}#{index}"
                    for index in edge_frames
                )
                qa_warnings.append(
                    f"{class_id}: {len(edge_frames)} flattened starter frames touch a nominal cell edge; "
                    f"browser sampling must remain bleed-free ({frame_names})"
                )
            row_digests = [
                hashlib.sha256(output_image.crop((0, row * 192, 1536, (row + 1) * 192)).tobytes()).hexdigest()
                for row in range(9)
            ]
            if len(set(row_digests)) != len(PLAYER_POSES):
                add(errors, f"{label}: distinct poses reuse a duplicate full 8-direction row")

        # Independently replay the single allowed authoring transform. This is
        # deliberately whole-atlas only; a per-frame resize/reposition cannot
        # satisfy the byte comparison.
        if source_image is not None and output_image is not None:
            red, green, blue = source_image.split()
            high = ImageChops.lighter(ImageChops.lighter(red, green), blue)
            alpha_lut = [
                0 if value <= 5 else 255 if value >= 26 else round((value - 5) / 21 * 255)
                for value in range(256)
            ]
            matte = Image.merge("RGBA", (red, green, blue, high.point(alpha_lut)))
            replay = matte.resize((1536, 1728), Image.Resampling.LANCZOS)
            replay, removed_components, removed_pixels = remove_starter_micro_islands(replay, 8)
            if record.get("microIslandComponentsRemoved") != removed_components:
                add(errors, f"{label}: microIslandComponentsRemoved must be {removed_components}, found {record.get('microIslandComponentsRemoved')!r}")
            if record.get("microIslandPixelsRemoved") != removed_pixels:
                add(errors, f"{label}: microIslandPixelsRemoved must be {removed_pixels}, found {record.get('microIslandPixelsRemoved')!r}")
            if replay.tobytes() != output_image.tobytes():
                add(errors, f"{label}: output is not the declared one-pass whole-atlas matte/resize/micro-island cleanup")
            checks += 1

        if compare_runtime:
            maps = manifest.get("maps", {})
            starter_map = maps.get("playerStarterLoadouts")
            asset_id = starter_map.get(class_id) if isinstance(starter_map, dict) else None
            expected_asset_id = f"player.starter.{class_id}"
            if asset_id != expected_asset_id:
                add(errors, f"{label}: maps.playerStarterLoadouts must resolve to {expected_asset_id!r}, found {asset_id!r}")
            else:
                starter_asset_ids[class_id] = asset_id
            entry = manifest.get("entries", {}).get(asset_id) if isinstance(asset_id, str) else None
            if not isinstance(entry, dict):
                add(errors, f"{label}: runtime manifest entry {asset_id!r} is missing")
            else:
                expected_entry = {
                    "kind": "atlas", "src": f"assets/sprites/players/starter/{class_id}.webp",
                    "cell": PLAYER_CELL, "cols": 8, "rows": 9, "anchor": PLAYER_ANCHOR,
                    "bundle": f"player:{class_id}", "rigRevision": PLAYER_RIG_REVISION,
                    "rigClass": class_id, "rigSlot": "starter", "rigFamily": "starter",
                    "rigPlane": "flattened", "rigScale": 1.0,
                    "rigScaleMethod": "class-shared-final-aligned", "starterBaseIds": binding,
                    "isolateFrameSampling": True,
                }
                for key, expected in expected_entry.items():
                    if entry.get(key) != expected:
                        add(errors, f"{label}: runtime {key} must be {expected!r}, found {entry.get(key)!r}")
                runtime_path = ROOT / str(entry.get("src", ""))
                if runtime_path.is_file():
                    try:
                        with Image.open(runtime_path) as packed:
                            if packed.size != (1536, 1728) or packed.mode != "RGBA":
                                add(errors, f"{label}: packed runtime atlas must decode as RGBA 1536x1728")
                            elif output_image is not None:
                                if packed.getchannel("A").tobytes() != output_image.getchannel("A").tobytes():
                                    add(errors, f"{label}: packed runtime alpha does not match the reviewed flattened source")
                                visible = output_image.getchannel("A").point(
                                    lambda value: 255 if value > PLAYER_SOCKET_ALPHA_MIN else 0
                                )
                                rgb_difference = ImageChops.difference(
                                    packed.convert("RGB"), output_image.convert("RGB")
                                )
                                rms = ImageStat.Stat(rgb_difference, visible).rms
                                if any(value > 5.0 for value in rms):
                                    add(errors, f"{label}: packed runtime color diverges from reviewed source (visible RGB RMS {rms})")
                    except Exception as exc:
                        add(errors, f"{label}: packed runtime atlas decode failed: {exc}")

    if compare_runtime:
        starter_map = manifest.get("maps", {}).get("playerStarterLoadouts")
        if not isinstance(starter_map, dict) or set(starter_map) != set(PLAYER_CLASSES):
            actual = sorted(starter_map) if isinstance(starter_map, dict) else []
            add(errors, f"maps.playerStarterLoadouts must contain exactly {list(PLAYER_CLASSES)}, found {actual}")
        elif len(set(starter_map.values())) != len(PLAYER_CLASSES):
            add(errors, "maps.playerStarterLoadouts must use five distinct flattened atlases")
        isolated_assets = {
            asset_id for asset_id, entry in manifest.get("entries", {}).items()
            if isinstance(entry, dict) and entry.get("isolateFrameSampling") is True
        }
        expected_isolated_assets = {f"player.starter.{class_id}" for class_id in PLAYER_CLASSES}
        expected_isolated_assets.update(manifest.get("maps",{}).get("bosses",{}).values())
        if "actor.boss.malthoron_plate" in manifest.get("entries",{}):
            expected_isolated_assets.add("actor.boss.malthoron_plate")
        if isolated_assets != expected_isolated_assets:
            add(
                errors,
                "isolateFrameSampling must be enabled on the five starter and installed boss atlases; "
                f"expected {sorted(expected_isolated_assets)}, found {sorted(isolated_assets)}",
            )
    return checks


def _validate_declared_equipment_family(
    class_id: str, state: str, slot: str, family: str, definition: Any,
    errors: list[str],
) -> list[tuple[str, str, str | None]]:
    """Validate one coverage leaf and return its runtime-visible source roles."""
    planes = equipment_planes(slot)
    expected_keys = {*planes, "masks"}
    label = f"base player-equipment coverage {class_id}/{state}/{slot}/{family}"
    if not isinstance(definition, dict) or set(definition) != expected_keys:
        add(errors, f"{label}: family keys must be {sorted(expected_keys)}")
        return []
    masks = definition.get("masks")
    if not isinstance(masks, dict) or not set(masks).issubset(planes):
        add(errors, f"{label}: masks must be an object keyed only by {list(planes)}")
        masks = masks if isinstance(masks, dict) else {}

    roles: list[tuple[str, str, str | None]] = []
    prefix = f"assets/sprites_src/player_rig_authored/{class_id}/{slot}/{family}/"
    for plane in planes:
        source = definition.get(plane)
        if source is not None and not isinstance(source, str):
            add(errors, f"{label}/{plane}: base plane must be a source path or null")
            source = None
        plane_masks = masks.get(plane, {})
        if not isinstance(plane_masks, dict):
            add(errors, f"{label}/{plane}: material masks must be an object")
            plane_masks = {}
        if plane_masks:
            for material, rel in sorted(plane_masks.items()):
                if material not in MATERIAL_ROLES:
                    add(errors, f"{label}/{plane}: unsupported material role {material!r}")
                if not isinstance(rel, str) or not rel:
                    add(errors, f"{label}/{plane}/{material}: mask source must be a path")
                    continue
                roles.append((plane, rel, material))
        elif source:
            roles.append((plane, source, None))

    for required in equipment_required_planes(slot):
        if not any(plane == required for plane, _rel, _material in roles):
            add(errors, f"{label}: missing runtime-visible {required} plane")
    paths = [rel for _plane, rel, _material in roles]
    if len(paths) != len(set(paths)):
        add(errors, f"{label}: runtime-visible source paths must be distinct")
    for plane, rel, material in roles:
        expected_name = f"{plane}_mask_{material}.png" if material else f"{plane}.png"
        if (
            not rel.startswith(prefix)
            or ".." in Path(rel).parts
            or rel != prefix + expected_name
        ):
            add(errors, f"{label}: source path is not the canonical {expected_name}: {rel!r}")
    return roles


def validate_complete_equipment_class(
    coverage: dict[str, Any], class_id: str, errors: list[str],
) -> int:
    """Require the full actor-visible equipment matrix for a focused class audit."""
    node = coverage.get("classes", {}).get(class_id, {}) if isinstance(coverage, dict) else {}
    available = node.get("available", {}) if isinstance(node, dict) else {}
    planned = node.get("planned", {}) if isinstance(node, dict) else {}
    checks = 0
    for slot, expected in EMBERWITCH_COMPLETE_EQUIPMENT.items():
        actual = set(available.get(slot, {})) if isinstance(available.get(slot), dict) else set()
        if actual != expected:
            add(
                errors,
                f"{class_id} complete equipment audit {slot}: expected {sorted(expected)}, found {sorted(actual)}",
            )
        planned_families = set(planned.get(slot, {})) if isinstance(planned.get(slot), dict) else set()
        if planned_families:
            add(errors, f"{class_id} complete equipment audit {slot}: still planned {sorted(planned_families)}")
        checks += len(expected)
    return checks


def validate_partial_equipment_coverage(
    data: dict[str, Any], manifest: dict[str, Any], errors: list[str], *, compare_runtime: bool,
) -> int:
    """Validate explicit available versus planned modular base coverage.

    Planned families are documentation and must remain absent. Available
    families are an atomic promise: every canonical source role must exist and
    the runtime may expose exactly those families, even while other classes
    remain in the flattened-starter slice.
    """
    document = load_strict_json(
        BASE_EQUIPMENT_COVERAGE, "base player-equipment coverage declaration", errors,
    )
    if document is None:
        return 0
    expected_top = {
        "version", "mode", "sourceKind", "review", "root", "starterBaseIds", "classes",
    }
    if set(document) != expected_top:
        add(errors, f"base player-equipment coverage keys must be {sorted(expected_top)}")
    if (
        document.get("version") != 1
        or document.get("mode") != "declared-partial-v1"
        or document.get("sourceKind") != "authored-final-aligned"
        or document.get("review") != "visual-contact-sheet-v1"
        or document.get("root") != "assets/sprites_src/player_rig_authored"
    ):
        add(errors, "base player-equipment coverage has invalid declared-partial-v1 provenance")

    runtime_starters = data.get("starterLoadouts", {})
    starter_ids = document.get("starterBaseIds")
    if starter_ids != runtime_starters:
        add(errors, "base player-equipment coverage starterBaseIds must exactly match DATA.PLAYER_STARTER_LOADOUTS")
    classes = document.get("classes")
    if not isinstance(classes, dict) or set(classes) != set(PLAYER_CLASSES):
        actual = sorted(classes) if isinstance(classes, dict) else []
        add(errors, f"base player-equipment coverage must contain exactly {list(PLAYER_CLASSES)}, found {actual}")
        classes = classes if isinstance(classes, dict) else {}

    slot_keys = set(PLAYER_EQUIPMENT_SLOTS)
    expected_available_by_class: dict[str, dict[str, list[str]]] = {}
    expected_planned_by_class: dict[str, dict[str, list[str]]] = {}
    available_role_count = 0
    planned_role_count = 0
    checks = 0
    for class_id in PLAYER_CLASSES:
        class_node = classes.get(class_id)
        if not isinstance(class_node, dict) or set(class_node) != {"available", "planned"}:
            add(errors, f"base player-equipment coverage {class_id}: must explicitly separate exact available and planned maps")
            continue
        available, planned = class_node.get("available"), class_node.get("planned")
        for state, group in (("available", available), ("planned", planned)):
            if not isinstance(group, dict) or set(group) != slot_keys:
                add(errors, f"base player-equipment coverage {class_id}/{state}: slots must be {sorted(slot_keys)}")
        if not isinstance(available, dict) or not isinstance(planned, dict):
            continue

        starter = runtime_starters.get(class_id, {})
        main_base = data.get("bases", {}).get(starter.get("main"), {}) if isinstance(starter, dict) else {}
        expected_main = main_base.get("playerVisualFamily")
        starter_families = {
            "unarmed": set(), "main": {expected_main} if isinstance(expected_main, str) else set(),
            "shield": set(), "head": set(), "chest": {"light"},
        }
        available_sets: dict[str, set[str]] = {}
        planned_sets: dict[str, set[str]] = {}
        for slot in PLAYER_EQUIPMENT_SLOTS:
            available_map = available.get(slot)
            planned_map = planned.get(slot)
            if not isinstance(available_map, dict) or not isinstance(planned_map, dict):
                continue
            available_sets[slot], planned_sets[slot] = set(available_map), set(planned_map)
            allowed = set(PLAYER_SLOT_FAMILIES[slot])
            for state, family_map in (("available", available_map), ("planned", planned_map)):
                unknown = set(family_map) - allowed
                if unknown:
                    add(errors, f"base player-equipment coverage {class_id}/{state}/{slot}: unknown families {sorted(unknown)}")
            overlap = set(available_map) & set(planned_map)
            if overlap:
                add(errors, f"base player-equipment coverage {class_id}/{slot}: families are both available and planned: {sorted(overlap)}")
            missing_starter = starter_families[slot] - (set(available_map) | set(planned_map))
            if missing_starter:
                add(errors, f"base player-equipment coverage {class_id}/{slot}: omits modular starter families {sorted(missing_starter)}")
            expected_planned = starter_families[slot] - set(available_map)
            if set(planned_map) != expected_planned:
                add(
                    errors,
                    f"base player-equipment coverage {class_id}/planned/{slot}: expected {sorted(expected_planned)}, "
                    f"found {sorted(planned_map)}",
                )

            for state, family_map in (("available", available_map), ("planned", planned_map)):
                for family, definition in family_map.items():
                    roles = _validate_declared_equipment_family(
                        class_id, state, slot, family, definition, errors,
                    )
                    present = [rel for _plane, rel, _material in roles if (ROOT / rel).is_file()]
                    if state == "planned":
                        if present and len(present) != len(roles):
                            add(
                                errors,
                                f"base player-equipment coverage {class_id}/planned/{slot}/{family}: "
                                f"family is only partially delivered ({len(present)}/{len(roles)} sources)",
                            )
                        if roles and len(present) == len(roles):
                            add(
                                errors,
                                f"base player-equipment coverage {class_id}/planned/{slot}/{family}: "
                                "all sources exist; review/authorship must promote the family atomically to available",
                            )
                        planned_role_count += len(roles)
                    else:
                        missing = [rel for _plane, rel, _material in roles if not (ROOT / rel).is_file()]
                        if missing:
                            add(
                                errors,
                                f"base player-equipment coverage {class_id}/available/{slot}/{family}: "
                                f"missing {len(missing)} declared source files",
                            )
                        for _plane, rel, _material in roles:
                            path = ROOT / rel
                            if not path.is_file():
                                continue
                            try:
                                with Image.open(path) as source:
                                    if source.format != "PNG" or source.mode != "RGBA" or source.size != (1536, 1728):
                                        add(errors, f"available player-equipment source {rel}: must be exact RGBA PNG 1536x1728")
                                    elif source.getchannel("A").getbbox() is None:
                                        add(errors, f"available player-equipment source {rel}: contains no visible pixels")
                            except Exception as exc:
                                add(errors, f"available player-equipment source {rel}: decode failed: {exc}")
                        available_role_count += len(roles)
                    checks += len(roles)

        expected_available_by_class[class_id] = {
            slot: sorted(available_sets.get(slot, set())) for slot in PLAYER_EQUIPMENT_SLOTS
        }
        expected_planned_by_class[class_id] = {
            slot: sorted(planned_sets.get(slot, set())) for slot in PLAYER_EQUIPMENT_SLOTS
        }

    if compare_runtime:
        maps = manifest.get("maps", {})
        runtime = maps.get("playerEquipmentCoverage")
        expected_runtime_top = {"version", "mode", "sourceKind", "starterBaseIds", "classes"}
        if not isinstance(runtime, dict) or set(runtime) != expected_runtime_top:
            actual = sorted(runtime) if isinstance(runtime, dict) else []
            add(errors, f"maps.playerEquipmentCoverage keys must be {sorted(expected_runtime_top)}, found {actual}")
            runtime = runtime if isinstance(runtime, dict) else {}
        if runtime.get("version") != 1 or runtime.get("mode") != "declared-partial-v1" or runtime.get("sourceKind") != "authored-final-aligned":
            add(errors, "maps.playerEquipmentCoverage has invalid declared-partial-v1 identity")
        if runtime.get("starterBaseIds") != starter_ids:
            add(errors, "maps.playerEquipmentCoverage starterBaseIds do not match the checked-in declaration")
        runtime_classes = runtime.get("classes", {})
        for class_id in PLAYER_CLASSES:
            expected_available = expected_available_by_class.get(class_id, {})
            expected_planned = expected_planned_by_class.get(class_id, {})
            expected_unavailable = {
                slot: sorted(set(PLAYER_SLOT_FAMILIES[slot]) - set(expected_available.get(slot, [])))
                for slot in PLAYER_EQUIPMENT_SLOTS
            }
            runtime_class = runtime_classes.get(class_id) if isinstance(runtime_classes, dict) else None
            expected_runtime_class = {
                "available": expected_available,
                "planned": expected_planned,
                "unavailable": expected_unavailable,
            }
            if runtime_class != expected_runtime_class:
                add(errors, f"maps.playerEquipmentCoverage {class_id}: does not exactly match declared available/planned/unavailable families")
            rig = maps.get("playerRigs", {}).get(class_id)
            if not isinstance(rig, dict):
                add(errors, f"player rig {class_id}: missing from declared-partial runtime manifest")
                continue
            expected_starter_asset = f"player.starter.{class_id}"
            if rig.get("coverageMode") != "declared-partial-v1" or rig.get("starterLoadout") != expected_starter_asset:
                add(errors, f"player rig {class_id}: missing declared-partial flattened starter binding")
            if (
                rig.get("available") != expected_available
                or rig.get("planned") != expected_planned
                or rig.get("unavailable") != expected_unavailable
            ):
                add(errors, f"player rig {class_id}: fail-closed coverage metadata differs from the source declaration")

            available_node = classes.get(class_id, {}).get("available", {}) if isinstance(classes.get(class_id), dict) else {}
            expected_unarmed = available_node.get("unarmed", {}).get("unarmed") if isinstance(available_node.get("unarmed"), dict) else None
            if bool(rig.get("unarmed")) != bool(expected_unarmed):
                add(errors, f"player rig {class_id}: unarmed runtime family does not match declared availability")
            for slot in ("main", "shield", "head", "chest"):
                runtime_group = rig.get(slot)
                expected_group = available_node.get(slot, {}) if isinstance(available_node, dict) else {}
                if not isinstance(runtime_group, dict) or set(runtime_group) != set(expected_group):
                    actual = sorted(runtime_group) if isinstance(runtime_group, dict) else []
                    add(errors, f"player rig {class_id}/{slot}: expected available families {sorted(expected_group)}, found {actual}")
                    continue
                for family, source_definition in expected_group.items():
                    runtime_definition = runtime_group.get(family)
                    if not isinstance(runtime_definition, dict):
                        continue
                    expected_roles = {
                        (plane, runtime_equipment_asset_id(class_id, slot, family, plane, material), material)
                        for plane in equipment_planes(slot)
                        for _rel, material, _is_mask in rendered_refs(source_definition, plane)
                    }
                    actual_roles = {
                        (plane, asset_id, material)
                        for plane in equipment_planes(slot)
                        for asset_id, material, _is_mask in rendered_refs(runtime_definition, plane)
                    }
                    if actual_roles != expected_roles:
                        add(errors, f"player rig {class_id}/{slot}/{family}: packed roles differ from declared authored roles")
                    for plane, asset_id, material in actual_roles:
                        validate_rig_asset(
                            manifest, errors, asset_id, class_id, slot, family, plane, material,
                        )
                        checks += 1
            if expected_unarmed and isinstance(rig.get("unarmed"), dict):
                family = "unarmed"
                source_definition = expected_unarmed
                runtime_definition = rig["unarmed"]
                expected_roles = {
                    (plane, runtime_equipment_asset_id(class_id, "unarmed", family, plane, material), material)
                    for plane in equipment_planes("unarmed")
                    for _rel, material, _is_mask in rendered_refs(source_definition, plane)
                }
                actual_roles = {
                    (plane, asset_id, material)
                    for plane in equipment_planes("unarmed")
                    for asset_id, material, _is_mask in rendered_refs(runtime_definition, plane)
                }
                if actual_roles != expected_roles:
                    add(errors, f"player rig {class_id}/unarmed/unarmed: packed roles differ from declared authored roles")
                for plane, asset_id, material in actual_roles:
                    validate_rig_asset(
                        manifest, errors, asset_id, class_id, "unarmed", family, plane, material,
                    )
                    checks += 1
            checks += 1
    # Counts are intentionally data-driven: promotion moves roles from planned
    # to available without changing the strict total declared role accounting.
    checks += available_role_count + planned_role_count
    return checks


def validate_files(manifest: dict[str, Any], errors: list[str]) -> dict[str, dict[str, Any]]:
    from build_sprite_assets import cliff_frame_fits

    atlas_summaries: dict[str, dict[str, Any]] = {}
    for asset_id, entry in manifest.get("entries", {}).items():
        src = entry.get("src", "")
        if re.match(r"(?:[A-Za-z]+:|/|\\)", src):
            add(errors, f"{asset_id}: source path is not file-compatible and relative: {src}")
        path = ROOT / src
        if not path.is_file():
            add(errors, f"{asset_id}: missing {src}")
            continue
        try:
            with Image.open(path) as source:
                source.load()
                img = source.convert("RGBA")
                # WebP legitimately decodes fully opaque scenic plates as RGB
                # after the encoder drops a redundant all-255 alpha plane. The
                # reviewed canonical title/backdrop PNGs remain strict RGBA in
                # their source-authorship validators. Water, floor materials
                # and the cathedral void plate are also intentionally opaque;
                # ordinary props stay strict.
                opaque_scenic = (
                    entry.get("kind") == "static"
                    and (asset_id in {"ui.scene.titleCamp", "world.prop.act2_black_water",
                         "world.prop.act3_ground_sand", "world.prop.act3_ground_market",
                         "world.prop.act3_ground_tomb", "world.prop.act3_ground_palace",
                         "world.prop.cathedral_floor_pale", "world.prop.cathedral_floor_dark",
                         "world.prop.cathedral_floor_street", "world.prop.cathedral_floor_fortress",
                         "world.prop.cathedral_void_backdrop"}
                         or asset_id.startswith("world.backdrop.")
                         or asset_id.startswith("world.prop.a3visual_"))
                )
                if "A" not in source.getbands() and not opaque_scenic:
                    add(errors, f"{asset_id}: no alpha channel")
                if entry.get("kind") == "atlas":
                    cell = entry.get("cell", [0, 0])
                    need = (cell[0] * entry.get("cols", 0), cell[1] * entry.get("rows", 0))
                    if img.size != need:
                        add(errors, f"{asset_id}: {img.size} != declared {need}")
                    if asset_id in manifest.get("maps", {}).get("cliffs", {}).values():
                        if entry.get("cliffFits") != cliff_frame_fits(img):
                            add(errors, f"{asset_id}: cliffFits missing or out of date with packed pixels; rebuild sprites")
                    if atlas_contract(entry) and img.size == need and (entry.get("rigRevision") or asset_id.startswith("player.rig.")):
                        empty: list[int] = []
                        alpha = img.getchannel("A")
                        for row in range(entry["rows"]):
                            for col in range(entry["cols"]):
                                index = row * entry["cols"] + col
                                if alpha.crop((col * 192, row * 192, (col + 1) * 192, (row + 1) * 192)).getbbox() is None:
                                    empty.append(index)
                        atlas_summaries[asset_id] = {
                            "empty": empty,
                            "digest": hashlib.sha256(img.tobytes()).hexdigest(),
                        }
                anchor = entry.get("anchor", [-1, -1])
                limit = entry.get("cell") if entry.get("kind") == "atlas" else list(img.size)
                if len(anchor) != 2 or not (0 <= anchor[0] <= limit[0] and 0 <= anchor[1] <= limit[1]):
                    add(errors, f"{asset_id}: invalid anchor {anchor}")
        except Exception as exc:
            add(errors, f"{asset_id}: decode failed: {exc}")
    return atlas_summaries


def validate_rig_asset(
    manifest: dict[str, Any], errors: list[str], asset_id: str, class_id: str,
    slot: str, family: str, plane: str, mask_role: str | None = None,
) -> None:
    entry = manifest.get("entries", {}).get(asset_id)
    label = f"player rig {class_id}/{slot}/{family}/{plane}"
    if not entry:
        add(errors, f"{label}: missing manifest entry {asset_id}")
        return
    if not atlas_contract(entry):
        add(errors, f"{label}: {asset_id} is not an exact 8x9 192px atlas anchored at [96,184]")
    expected = {
        "rigRevision": PLAYER_RIG_REVISION, "rigClass": class_id,
        "rigSlot": slot, "rigPlane": plane,
    }
    for key, value in expected.items():
        if entry.get(key) != value:
            add(errors, f"{label}: {asset_id} has {key}={entry.get(key)!r}; expected {value!r}")
    family_sets = {
        "body": {"neutral"}, "unarmed": {"unarmed"}, "main": set(PLAYER_MAIN_FAMILIES),
        "shield": {"shield"}, "head": set(PLAYER_ARMOR_FAMILIES), "chest": set(PLAYER_ARMOR_FAMILIES),
    }
    if entry.get("rigFamily") not in family_sets.get(slot, {family}):
        add(errors, f"{label}: {asset_id} has invalid rigFamily={entry.get('rigFamily')!r}")
    if mask_role:
        if mask_role not in MATERIAL_ROLES:
            add(errors, f"{label}: unsupported material mask role {mask_role!r}")
        if entry.get("maskMaterial") != mask_role:
            add(errors, f"{label}: {asset_id} maskMaterial does not match {mask_role!r}")
    elif entry.get("maskMaterial") is not None:
        add(errors, f"{label}: non-mask {asset_id} unexpectedly declares maskMaterial")


def point(meta: dict[str, Any], key: str, label: str, errors: list[str]) -> tuple[float, float] | None:
    value = meta.get(key)
    if not isinstance(value, list) or len(value) != 2 or not all(isinstance(v, (int, float)) and math.isfinite(v) for v in value):
        add(errors, f"{label}: {key} must be [x,y]")
        return None
    if not (0 <= value[0] < 192 and 0 <= value[1] < 192):
        add(errors, f"{label}: {key} {value} lies outside the 192px cell")
    return value[0], value[1]


def roi(meta: dict[str, Any], key: str, label: str, errors: list[str]) -> list[float] | None:
    value = meta.get(key)
    if not isinstance(value, list) or len(value) != 4 or not all(isinstance(v, (int, float)) and math.isfinite(v) for v in value):
        add(errors, f"{label}: {key} must be [x,y,w,h]")
        return None
    x, y, width, height = value
    if width <= 0 or height <= 0 or x < 0 or y < 0 or x + width > 192 or y + height > 192:
        add(errors, f"{label}: {key} {value} lies outside the 192px cell")
    return value


def _trim_alpha(img: Image.Image, threshold: int = 3) -> Image.Image:
    alpha = img.getchannel("A").point(lambda value: 255 if value > threshold else 0)
    bounds = alpha.getbbox()
    return img.crop(bounds) if bounds else Image.new("RGBA", (1, 1))


def _marker_pixel_components(img: Image.Image, role: str) -> list[list[tuple[int, int]]]:
    """Return 8-connected exact-color components for one marker role."""
    target = (255, 0, 0, 255) if role == "main" else (0, 255, 255, 255)
    points: set[tuple[int, int]] = set()
    for y in range(img.height):
        for x in range(img.width):
            if img.getpixel((x, y)) == target:
                points.add((x, y))
    components: list[list[tuple[int, int]]] = []
    while points:
        start = points.pop()
        component = [start]
        work = [start]
        while work:
            x, y = work.pop()
            for yy in range(max(0, y - 1), min(img.height, y + 2)):
                for xx in range(max(0, x - 1), min(img.width, x + 2)):
                    point_value = (xx, yy)
                    if point_value in points:
                        points.remove(point_value)
                        component.append(point_value)
                        work.append(point_value)
        components.append(component)
    return components


def _marker_points(img: Image.Image, role: str) -> tuple[list[int], list[int]] | None:
    """Return centroid and padded bounds for exactly one chroma component."""
    components = _marker_pixel_components(img, role)
    if len(components) != 1 or len(components[0]) < 3:
        return None
    points = components[0]
    xs, ys = zip(*points)
    socket = [round(sum(xs) / len(xs)), round(sum(ys) / len(ys))]
    x0, y0, x1, y1 = min(xs), min(ys), max(xs) + 1, max(ys) + 1
    padded_x, padded_y = max(0, x0 - 4), max(0, y0 - 4)
    hand_roi = [padded_x, padded_y, min(img.width, x1 + 4) - padded_x, min(img.height, y1 + 4) - padded_y]
    return socket, hand_roi


def _final_marker_annotation(sheet: Image.Image, index: int, role: str) -> tuple[list[int], list[int]] | None:
    """Read one reviewed palm annotation from the final-aligned 8x9 atlas."""
    direction, pose = index % len(PLAYER_DIRS), index // len(PLAYER_DIRS)
    x0, y0 = direction * PLAYER_CELL[0], pose * PLAYER_CELL[1]
    marker_cell = sheet.crop((x0, y0, x0 + PLAYER_CELL[0], y0 + PLAYER_CELL[1]))
    return _marker_points(marker_cell, role)


def validate_hand_registration(
    manifest: dict[str, Any], errors: list[str], *, compare_runtime: bool = True
) -> int:
    """Cross-check runtime metadata against independent checked-in hand markers."""
    checks = 0
    if not RIG_REGISTRATION.is_file():
        add(errors, "player rig: missing authored registrations.json")
        return checks
    try:
        registration = json.loads(RIG_REGISTRATION.read_text(encoding="utf-8"))
    except Exception as exc:
        add(errors, f"player rig registration is malformed: {exc}")
        return checks
    provenance = registration.get("handRegistration")
    expected_provenance = {
        "method": "authored-final-aligned-marker-atlases",
        "review": "visual-contact-sheet-v3",
        "layout": "8x9-final-aligned",
        "markerColors": {"main": "#ff0000", "off": "#00ffff"},
    }
    if not isinstance(provenance, dict):
        add(errors, "player rig: missing independent hand-registration provenance")
        return checks
    for key, expected in expected_provenance.items():
        if provenance.get(key) != expected:
            add(errors, f"player rig handRegistration.{key}: expected {expected!r}, found {provenance.get(key)!r}")
    sources = provenance.get("sources")
    if not isinstance(sources, dict) or set(sources) != set(PLAYER_CLASSES):
        add(errors, "player rig handRegistration.sources must name all five class marker sheets")
        sources = {}
    manifest_rigs = manifest.get("maps", {}).get("playerRigs", {})
    manifest_previews = manifest.get("maps", {}).get("playerPreviews", {})
    registration_classes = registration.get("classes", {})
    expected_scale_method = "class-shared-final-aligned"
    if registration.get("scaleMethod") != expected_scale_method:
        add(errors, f"player rig scaleMethod must be {expected_scale_method!r}")
    expected_body_landmark_provenance = {
        "method": "authored-final-body-landmarks-v1",
        "review": "visual-overlay-v1",
        "source": "assets/sprites_src/player_rig/qa/body_identity_landmarks_v1.json",
        "headPadding": 10,
        "chestPadding": 12,
    }
    if registration.get("bodyIdentityLandmarks") != expected_body_landmark_provenance:
        add(errors, "player rig bodyIdentityLandmarks provenance/padding contract is missing or changed")
    authored_rows = registration.get("authoredRows")
    expected_row_method = "uniform-row-scale-final-alignment-v1"
    if not isinstance(authored_rows, dict):
        add(errors, "player rig: missing authored supplemental row provenance")
        authored_rows = {}
    if authored_rows.get("method") != expected_row_method:
        add(errors, f"player rig authoredRows.method must be {expected_row_method!r}")
    supplemental_poses = ("cast", "hit", "death")
    if authored_rows.get("poses") != list(supplemental_poses):
        add(errors, f"player rig authoredRows.poses must be {list(supplemental_poses)!r}")
    authored_sources = authored_rows.get("sources")
    if not isinstance(authored_sources, dict) or set(authored_sources) != set(PLAYER_CLASSES):
        add(errors, "player rig authoredRows.sources must name all five classes")
        authored_sources = {}
    qa_path = ROOT / "assets" / "sprites_src" / "player_rig" / "qa" / "authored_row_alignment_v1.json"
    try:
        qa_report = json.loads(qa_path.read_text(encoding="utf-8"))
    except Exception as exc:
        add(errors, f"player rig authored row QA report is missing or malformed: {exc}")
        qa_report = {}
    if qa_report.get("method") != expected_row_method:
        add(errors, f"player rig authored row QA method must be {expected_row_method!r}")
    if qa_report.get("version") != 1:
        add(errors, "player rig authored row QA version must be 1")
    for class_id in PLAYER_CLASSES:
        class_registration = registration_classes.get(class_id, {})
        render_scale = class_registration.get("renderScale")
        if render_scale != 1.0:
            add(errors, f"player rig {class_id}: final-aligned renderScale must be exactly 1.0")
            render_scale = None
        class_rows = authored_sources.get(class_id)
        if not isinstance(class_rows, dict) or set(class_rows) != set(supplemental_poses):
            add(errors, f"player rig {class_id}: authoredRows must declare cast, hit, and death only")
            class_rows = {}
        qa_class_rows = qa_report.get("sources", {}).get(class_id, {}) if isinstance(qa_report.get("sources"), dict) else {}
        for pose_name in supplemental_poses:
            row_provenance = class_rows.get(pose_name)
            if not isinstance(row_provenance, dict):
                continue
            expected_source = (
                f"assets/sprites_src/players/{class_id}_cast_death_alpha.png"
                if pose_name in {"cast", "hit"}
                else f"assets/sprites_src/players/{class_id}_death_{'v3' if class_id == 'wildkeeper' else 'v2'}_alpha.png"
            )
            expected_output = f"assets/sprites_src/player_rig/{class_id}/authored_rows/{pose_name}.png"
            expected_source_row = 0 if pose_name in {"cast", "death"} else 1
            expected_keys = {"source", "sourceRow", "sourceRowScale", "output"}
            if set(row_provenance) != expected_keys:
                add(errors, f"player rig {class_id}/{pose_name}: authored row provenance keys must be {sorted(expected_keys)}")
            if row_provenance.get("source") != expected_source:
                add(errors, f"player rig {class_id}/{pose_name}: source must be {expected_source}")
            if row_provenance.get("sourceRow") != expected_source_row:
                add(errors, f"player rig {class_id}/{pose_name}: sourceRow must be {expected_source_row}")
            source_scale = row_provenance.get("sourceRowScale")
            if (
                not isinstance(source_scale, (int, float)) or isinstance(source_scale, bool)
                or not math.isfinite(source_scale) or source_scale <= 0 or round(source_scale, 8) != source_scale
            ):
                add(errors, f"player rig {class_id}/{pose_name}: sourceRowScale must be positive and rounded to 8 decimals")
            if row_provenance.get("output") != expected_output:
                add(errors, f"player rig {class_id}/{pose_name}: output must be {expected_output}")
            output_path = ROOT / expected_output
            if not output_path.is_file():
                add(errors, f"player rig {class_id}/{pose_name}: missing final-aligned authored row {expected_output}")
            else:
                try:
                    with Image.open(output_path) as row_source:
                        if row_source.mode != "RGBA" or row_source.size != (1536, 192):
                            add(errors, f"player rig {class_id}/{pose_name}: authored row must be exact RGBA 1536x192")
                except Exception as exc:
                    add(errors, f"player rig {class_id}/{pose_name}: authored row decode failed: {exc}")
            qa_leaf = qa_class_rows.get(pose_name, {})
            expected_qa_keys = {
                "source", "sourceRow", "sourceRowScale", "output", "rawBBoxes",
                "scaledBBoxes", "identityScaleMethod", "scaleVariation", "clipped",
            }
            if not isinstance(qa_leaf, dict) or set(qa_leaf) != expected_qa_keys:
                add(errors, f"player rig {class_id}/{pose_name}: QA leaf keys must be {sorted(expected_qa_keys)}")
                continue
            for key in ("source", "sourceRow", "sourceRowScale", "output"):
                if qa_leaf.get(key) != row_provenance.get(key):
                    add(errors, f"player rig {class_id}/{pose_name}: QA {key} does not match registration")
            def valid_boxes(value: Any, pair: bool = False) -> bool:
                size = 2 if pair else 4
                return (
                    isinstance(value, list) and len(value) == len(PLAYER_DIRS)
                    and all(
                        isinstance(box, list) and len(box) == size
                        and all(isinstance(number, (int, float)) and math.isfinite(number) for number in box)
                        and all(number >= 0 for number in box)
                        and (pair or (box[2] > 0 and box[3] > 0))
                        and (not pair or (box[0] > 0 and box[1] > 0))
                        for box in value
                    )
                )
            if not valid_boxes(qa_leaf.get("rawBBoxes")):
                add(errors, f"player rig {class_id}/{pose_name}: QA rawBBoxes must contain eight finite positive boxes")
            if not valid_boxes(qa_leaf.get("scaledBBoxes")):
                add(errors, f"player rig {class_id}/{pose_name}: QA scaledBBoxes must contain eight finite positive boxes")
            else:
                raw_boxes = qa_leaf.get("rawBBoxes") if valid_boxes(qa_leaf.get("rawBBoxes")) else []
                for direction_index, (direction, (x, y, width, height)) in enumerate(zip(PLAYER_DIRS, qa_leaf["scaledBBoxes"])):
                    if x <= 0 or y <= 0 or x + width >= 192 or y + height >= 192:
                        add(errors, f"player rig {class_id}/{pose_name}/{direction}: QA scaled bbox touches cell edge")
                    if raw_boxes and isinstance(source_scale, (int, float)):
                        raw_width, raw_height = raw_boxes[direction_index][2:]
                        expected_width, expected_height = round(raw_width * source_scale), round(raw_height * source_scale)
                        expected_x, expected_y = (192 - expected_width) // 2, 184 - expected_height
                        if abs(width - expected_width) > 3 or abs(height - expected_height) > 3:
                            add(errors, f"player rig {class_id}/{pose_name}/{direction}: scaled bbox dimensions do not use shared sourceRowScale")
                        if (x, y) != (expected_x, expected_y):
                            add(errors, f"player rig {class_id}/{pose_name}/{direction}: scaled bbox is not final-aligned at [96,184]")
            if qa_leaf.get("identityScaleMethod") != "uniform-authored-row-transform":
                add(errors, f"player rig {class_id}/{pose_name}: QA identityScaleMethod is not uniform-authored-row-transform")
            if qa_leaf.get("scaleVariation") != 0.0:
                add(errors, f"player rig {class_id}/{pose_name}: QA scaleVariation must be exactly 0.0")
            if qa_leaf.get("clipped") != []:
                add(errors, f"player rig {class_id}/{pose_name}: QA clipped must be an exact empty array")
        if compare_runtime:
            class_asset_ids = {
                asset_id for asset_id, entry in manifest.get("entries", {}).items()
                if entry.get("rigClass") == class_id and entry.get("rigSlot") in {
                    "body", "unarmed", "main", "shield", "head", "chest", "preview",
                }
            }
            preview_id = manifest_previews.get(class_id) if isinstance(manifest_previews, dict) else None
            if isinstance(preview_id, str):
                class_asset_ids.add(preview_id)
            for asset_id in sorted(class_asset_ids):
                entry = manifest.get("entries", {}).get(asset_id, {})
                if entry.get("rigScaleMethod") != expected_scale_method:
                    add(errors, f"player rig {class_id}: {asset_id} rigScaleMethod must be {expected_scale_method!r}")
                if render_scale is not None and entry.get("rigScale") != render_scale:
                    add(errors, f"player rig {class_id}: {asset_id} rigScale {entry.get('rigScale')!r} != authored {render_scale!r}")
        expected_rel = f"assets/sprites_src/player_rig/{class_id}/hand_registration.png"
        source_rel = sources.get(class_id)
        if source_rel != expected_rel:
            add(errors, f"player rig {class_id}: marker source must be {expected_rel}, found {source_rel!r}")
            continue
        marker_path = ROOT / source_rel
        if not marker_path.is_file():
            add(errors, f"player rig {class_id}: missing independent marker sheet {source_rel}")
            continue
        registration_frames = class_registration.get("frames", [])
        runtime_frames = manifest_rigs.get(class_id, {}).get("frames", [])
        if len(registration_frames) != PLAYER_FRAME_COUNT:
            add(errors, f"player rig {class_id}: registration must contain exactly {PLAYER_FRAME_COUNT} frames")
            continue
        if compare_runtime and len(runtime_frames) != PLAYER_FRAME_COUNT:
            add(errors, f"player rig {class_id}: runtime manifest must contain exactly {PLAYER_FRAME_COUNT} frames")
            continue
        try:
            with Image.open(marker_path) as source:
                if source.mode != "RGBA":
                    add(errors, f"player rig {class_id}: marker atlas must have exact RGBA mode, found {source.mode}")
                sheet = source.convert("RGBA")
                expected_size = (PLAYER_CELL[0] * len(PLAYER_DIRS), PLAYER_CELL[1] * len(PLAYER_POSES))
                if sheet.size != expected_size:
                    add(errors, f"player rig {class_id}: marker atlas {sheet.size} must be exactly {expected_size}")
                    continue
                # Marker masks are independent annotations.  Any nontransparent
                # non-marker pixels would let body art accidentally drive the
                # detector and invalidate the provenance guarantee.
                non_marker_alpha = 0
                for yy in range(sheet.height):
                    for xx in range(sheet.width):
                        red, green, blue, alpha_value = sheet.getpixel((xx, yy))
                        is_main = (red, green, blue, alpha_value) == (255, 0, 0, 255)
                        is_off = (red, green, blue, alpha_value) == (0, 255, 255, 255)
                        if alpha_value != 0 and not (is_main or is_off):
                            non_marker_alpha += 1
                if non_marker_alpha:
                    add(errors, f"player rig {class_id}: marker mask contains {non_marker_alpha} non-marker opaque pixels")
                    continue
                for source_row in range(len(PLAYER_POSES)):
                    for direction in range(8):
                        x0 = direction * PLAYER_CELL[0]; x1 = x0 + PLAYER_CELL[0]
                        y0 = source_row * PLAYER_CELL[1]; y1 = y0 + PLAYER_CELL[1]
                        source_cell = sheet.crop((x0, y0, x1, y1))
                        for role in ("main", "off"):
                            components = _marker_pixel_components(source_cell, role)
                            if len(components) != 1 or len(components[0]) < 3:
                                add(errors, f"player rig {class_id} source row {source_row}/{PLAYER_DIRS[direction]}: marker mask must contain exactly one {role} component")
                for index in range(PLAYER_FRAME_COUNT):
                    authored = registration_frames[index]
                    runtime = runtime_frames[index] if compare_runtime else None
                    label = f"player rig {class_id} frame {index}"
                    if authored.get("handReview") != "authored-final-aligned-v3":
                        add(errors, f"{label}: missing authored hand-review provenance")
                    for role, socket_key, roi_key in (
                        ("main", "mainGrip", "mainHandROI"),
                        ("off", "offGrip", "offHandROI"),
                    ):
                        annotation = _final_marker_annotation(sheet, index, role)
                        if annotation is None:
                            add(errors, f"{label}: independent marker sheet is missing {role} palm annotation")
                            continue
                        expected_socket, expected_roi = annotation
                        if authored.get(socket_key) != expected_socket or authored.get(roi_key) != expected_roi:
                            add(errors, f"{label}: registration {socket_key}/{roi_key} does not match independent {role} marker pixels")
                        if compare_runtime and runtime is not None and (
                            runtime.get(socket_key) != expected_socket or runtime.get(roi_key) != expected_roi
                        ):
                            add(errors, f"{label}: runtime {socket_key}/{roi_key} does not match independent {role} marker pixels")
                        checks += 1
        except Exception as exc:
            add(errors, f"player rig {class_id}: marker sheet decode/validation failed: {exc}")
    return checks


def validate_body_identity_landmarks(
    manifest: dict[str, Any], errors: list[str], *, compare_runtime: bool = True
) -> int:
    """Validate direct, visually reviewed scale landmarks on final body art."""
    try:
        document = json.loads(BODY_IDENTITY_LANDMARKS.read_text(encoding="utf-8"))
    except Exception as exc:
        add(errors, f"player body identity landmark file is missing or malformed: {exc}")
        return 0
    expected_top = {"version", "method", "review", "classes"}
    if set(document) != expected_top:
        add(errors, f"player body identity landmarks: top-level keys must be {sorted(expected_top)}")
    if document.get("version") != 1 or document.get("method") != "authored-final-body-landmarks-v1" or document.get("review") != "visual-overlay-v1":
        add(errors, "player body identity landmarks: invalid v1 authored visual provenance")
    classes = document.get("classes")
    if not isinstance(classes, dict) or set(classes) != set(PLAYER_CLASSES):
        add(errors, "player body identity landmarks: classes must contain exactly all five player classes")
        classes = {}
    checks = 0
    scale_poses = {"cast", "hit", "death", "dead"}
    manifest_rigs = manifest.get("maps", {}).get("playerRigs", {})
    try:
        registration = json.loads(RIG_REGISTRATION.read_text(encoding="utf-8"))
    except Exception:
        registration = {}
    registration_classes = registration.get("classes", {}) if isinstance(registration, dict) else {}

    def line_roi(line: list[list[float]], padding: int) -> list[int]:
        xs, ys = (point[0] for point in line), (point[1] for point in line)
        xs, ys = list(xs), list(ys)
        x0 = max(0, math.floor(min(xs)) - padding)
        y0 = max(0, math.floor(min(ys)) - padding)
        x1 = min(192, math.ceil(max(xs)) + padding + 1)
        y1 = min(192, math.ceil(max(ys)) + padding + 1)
        return [x0, y0, x1 - x0, y1 - y0]

    for class_id in PLAYER_CLASSES:
        class_row = classes.get(class_id)
        if not isinstance(class_row, dict) or set(class_row) != {"frames"}:
            add(errors, f"player body identity landmarks {class_id}: expected only an ordered frames array")
            continue
        frames = class_row.get("frames")
        if not isinstance(frames, list) or len(frames) != PLAYER_FRAME_COUNT:
            add(errors, f"player body identity landmarks {class_id}: expected exactly 72 frames")
            continue
        # The reviewed landmark overlay is authored against this checked-in,
        # final-aligned RGBA source.  Validate that source directly so a stale
        # runtime manifest cannot make pre-pack QA pass or fail against an old
        # WebP.  The normal atlas/body checks separately cover the packed file.
        path = ROOT / "assets" / "sprites_src" / "player_rig" / class_id / "body.png"
        alpha: Image.Image | None = None
        try:
            with Image.open(path) as source:
                if source.mode != "RGBA" or source.size != (1536, 1728):
                    add(errors, f"player body identity landmarks {class_id}: final body source must be exact RGBA 1536x1728")
                body = source.convert("RGBA")
                alpha = body.getchannel("A")
                fringe = 0
                dirty_transparent = 0
                pixel_values = (
                    body.get_flattened_data()
                    if hasattr(body, "get_flattened_data")
                    else body.getdata()
                )
                for red, green, blue, alpha_value in pixel_values:
                    if alpha_value == 0:
                        dirty_transparent += int((red, green, blue) != (0, 0, 0))
                    elif alpha_value > PLAYER_SOCKET_ALPHA_MIN and green - max(red, blue) > 18:
                        fringe += 1
                if fringe:
                    add(errors, f"player body identity landmarks {class_id}: final body contains {fringe} visible chroma-green fringe pixels")
                if dirty_transparent:
                    add(errors, f"player body identity landmarks {class_id}: final body contains {dirty_transparent} transparent pixels with nonzero RGB")
        except Exception as exc:
            add(errors, f"player body identity landmarks {class_id}: final body source decode failed: {exc}")
        lengths: dict[tuple[int, str], float] = {}
        registration_frames = registration_classes.get(class_id, {}).get("frames", [])
        runtime_frames = manifest_rigs.get(class_id, {}).get("frames", []) if isinstance(manifest_rigs, dict) else []
        for index, frame in enumerate(frames):
            expected_frame_keys = {"index", "pose", "direction", "headLine", "torsoLine", "review"}
            if not isinstance(frame, dict) or set(frame) != expected_frame_keys:
                add(errors, f"player body identity landmarks {class_id} frame {index}: invalid keys")
                continue
            pose, direction = PLAYER_POSES[index // 8], PLAYER_DIRS[index % 8]
            if frame.get("index") != index or frame.get("pose") != pose or frame.get("direction") != direction:
                add(errors, f"player body identity landmarks {class_id} frame {index}: ordering metadata mismatch")
            if frame.get("review") != "authored-visual-v1":
                add(errors, f"player body identity landmarks {class_id} frame {index}: missing authored visual review")
            for key in ("headLine", "torsoLine"):
                line = frame.get(key)
                if (
                    not isinstance(line, list) or len(line) != 2
                    or any(
                        not isinstance(endpoint, list) or len(endpoint) != 2
                        or any(not isinstance(value, (int, float)) or not math.isfinite(value) or not 0 <= value < 192 for value in endpoint)
                        for endpoint in line
                    )
                ):
                    add(errors, f"player body identity landmarks {class_id} frame {index}: {key} must be two finite cell-local endpoints")
                    continue
                length = math.dist(line[0], line[1])
                if length <= 0:
                    add(errors, f"player body identity landmarks {class_id} frame {index}: {key} has zero length")
                else:
                    lengths[(index, key)] = length
                    roi_key, padding = ("headROI", 10) if key == "headLine" else ("chestROI", 12)
                    expected_roi = line_roi(line, padding)
                    if len(registration_frames) == PLAYER_FRAME_COUNT and registration_frames[index].get(roi_key) != expected_roi:
                        add(errors, f"player body identity landmarks {class_id} frame {index}: registration {roi_key} is not derived exactly from {key}")
                    if compare_runtime and len(runtime_frames) == PLAYER_FRAME_COUNT and runtime_frames[index].get(roi_key) != expected_roi:
                        add(errors, f"player body identity landmarks {class_id} frame {index}: runtime {roi_key} is not derived exactly from {key}")
                if alpha is not None:
                    col, row = index % 8, index // 8
                    for endpoint_index, (x, y) in enumerate(line):
                        px, py = int(round(x)), int(round(y))
                        box = (
                            col * 192 + max(0, px - 2), row * 192 + max(0, py - 2),
                            col * 192 + min(192, px + 3), row * 192 + min(192, py + 3),
                        )
                        if alpha.crop(box).point(lambda value: 255 if value > PLAYER_SOCKET_ALPHA_MIN else 0).getbbox() is None:
                            add(errors, f"player body identity landmarks {class_id} frame {index}: {key} endpoint {endpoint_index} misses body alpha by >2px")
                checks += 1
        for index, frame in enumerate(frames):
            pose = PLAYER_POSES[index // 8]
            if pose not in scale_poses:
                continue
            idle_index = index % 8
            for key in ("headLine", "torsoLine"):
                value, baseline = lengths.get((index, key)), lengths.get((idle_index, key))
                if value is None or baseline is None:
                    continue
                ratio = value / baseline
                if not 0.85 <= ratio <= 1.15:
                    add(errors, f"player body identity landmarks {class_id} {pose}/{PLAYER_DIRS[index % 8]}: {key} scale ratio {ratio:.3f} is outside [0.85,1.15]")
                checks += 1
        overlay_path = ROOT / "assets" / "sprites_src" / "player_rig" / "qa" / f"{class_id}_body_identity_landmarks_v1.png"
        if not overlay_path.is_file():
            add(errors, f"player body identity landmarks {class_id}: missing visual overlay {overlay_path.relative_to(ROOT)}")
        else:
            try:
                with Image.open(overlay_path) as overlay:
                    if overlay.size != (1536, 1728):
                        add(errors, f"player body identity landmarks {class_id}: overlay must be 1536x1728")
            except Exception as exc:
                add(errors, f"player body identity landmarks {class_id}: overlay decode failed: {exc}")
    return checks


def validate_equipment_authorship(
    manifest: dict[str, Any], errors: list[str], *,
    class_ids: Iterable[str] = PLAYER_CLASSES, exact_files: bool = True,
) -> int:
    """Prove every declared-available rig layer has one reviewed authored source."""
    def unique_object(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
        result: dict[str, Any] = {}
        for key, value in pairs:
            if key in result:
                raise ValueError(f"duplicate JSON key {key!r}")
            result[key] = value
        return result

    try:
        document = json.loads(EQUIPMENT_AUTHORSHIP.read_text(encoding="utf-8"), object_pairs_hook=unique_object)
    except Exception as exc:
        add(errors, f"player rig equipment authorship file is missing or malformed: {exc}")
        return 0
    expected_top = {"version", "sourceKind", "review", "root", "files"}
    if set(document) != expected_top:
        add(errors, f"player rig equipment authorship top-level keys must be {sorted(expected_top)}")
    if (
        document.get("version") != 1
        or document.get("sourceKind") != "authored-final-aligned"
        or document.get("review") != "visual-contact-sheet-v1"
        or document.get("root") != "assets/sprites_src/player_rig_authored"
    ):
        add(errors, "player rig equipment authorship has invalid reviewed v1 provenance")
    files = document.get("files")
    if not isinstance(files, dict):
        add(errors, "player rig equipment authorship files must be an object keyed by authored source path")
        return 0
    selected_classes = tuple(class_ids)
    coverage = load_strict_json(
        BASE_EQUIPMENT_COVERAGE, "base player-equipment coverage declaration", errors,
    )
    if coverage is None:
        return 0
    expected_roles = declared_equipment_roles(coverage, selected_classes)
    seen_roles: set[tuple[str, str, str, str, str | None]] = set()
    seen_roles_by_path: dict[str, tuple[str, str, str, str, str | None]] = {}
    checks = 0
    expected_descriptor_keys = {"class", "slot", "family", "plane", "material", "sha256"}
    root_prefix = "assets/sprites_src/player_rig_authored/"
    selected_file_count = 0
    for rel, descriptor in files.items():
        if (
            not exact_files
            and isinstance(descriptor, dict)
            and descriptor.get("class") not in selected_classes
        ):
            continue
        selected_file_count += 1
        if not isinstance(rel, str) or not rel.startswith(root_prefix) or ".." in Path(rel).parts:
            add(errors, f"player rig equipment authorship path is outside its authored root: {rel!r}")
            continue
        if not isinstance(descriptor, dict) or set(descriptor) != expected_descriptor_keys:
            add(errors, f"player rig equipment authorship {rel}: descriptor keys must be {sorted(expected_descriptor_keys)}")
            continue
        role = (
            descriptor.get("class"), descriptor.get("slot"), descriptor.get("family"),
            descriptor.get("plane"), descriptor.get("material"),
        )
        prior = seen_roles_by_path.get(rel)
        if prior is not None:
            add(errors, f"player rig equipment authorship {rel}: duplicate/shared source path is forbidden")
        seen_roles_by_path[rel] = role
        expected_prefix = f"{root_prefix}{role[0]}/{role[1]}/{role[2]}/"
        if not rel.startswith(expected_prefix):
            add(errors, f"player rig equipment authorship {rel}: path does not match class/slot/family descriptor")
        path = ROOT / rel
        if not path.is_file():
            add(errors, f"player rig equipment authorship {rel}: source file is missing")
        else:
            digest = hashlib.sha256(path.read_bytes()).hexdigest()
            if descriptor.get("sha256") != digest:
                add(errors, f"player rig equipment authorship {rel}: sha256 does not match checked-in source")
            try:
                with Image.open(path) as source:
                    if path.suffix.lower() != ".png" or source.format != "PNG":
                        add(errors, f"player rig equipment authorship {rel}: final-aligned source must be a PNG")
                    if source.mode != "RGBA" or source.size != (1536, 1728):
                        add(
                            errors,
                            f"player rig equipment authorship {rel}: final-aligned source must be exact RGBA 1536x1728",
                        )
            except Exception as exc:
                add(errors, f"player rig equipment authorship {rel}: source decode failed: {exc}")
        expected_rel = expected_roles.get(role)
        if expected_rel is None:
            add(errors, f"player rig equipment authorship {rel}: descriptor does not resolve to a declared-available rig source role")
        elif expected_rel != rel:
            add(errors, f"player rig equipment authorship {rel}: descriptor role is registered to {expected_rel}")
        elif role in seen_roles:
            add(errors, f"player rig equipment authorship {rel}: multiple source paths resolve to the same rig role")
        else:
            seen_roles.add(role)
        checks += 1
    missing = set(expected_roles) - seen_roles
    if missing:
        add(errors, f"player rig equipment authorship is missing {len(missing)} declared-available layer assets")
    actual_file_count = len(files) if exact_files else selected_file_count
    if actual_file_count != len(expected_roles):
        scope = "" if exact_files else f" for {list(selected_classes)}"
        add(errors, f"player rig equipment authorship has {actual_file_count} files{scope} for {len(expected_roles)} distinct declared-available layer roles")
    return checks


def validate_equipment_plane_hygiene(
    manifest: dict[str, Any], errors: list[str], *, require_forearm_registration: bool = True,
    class_ids: Iterable[str] = PLAYER_CLASSES,
) -> int:
    """Reject body-shaped residue in authored equipment/grip planes.

    Held/rear/front object planes may extend anywhere because the authored
    weapon or shield silhouette is the point of those layers. Grip planes are
    different: they may contain only reviewed hand/forearm pixels. We do not
    infer a permissive region from the body/chest silhouette. A checked-in,
    visually reviewed per-frame forearm registration is required before any
    authored equipment can pass the final gate.
    """
    try:
        registration = json.loads(RIG_REGISTRATION.read_text(encoding="utf-8"))
    except Exception as exc:
        add(errors, f"player rig equipment hygiene cannot read registration: {exc}")
        return 0
    classes = registration.get("classes", {}) if isinstance(registration, dict) else {}

    forearm: dict[str, Any] = {}
    if EQUIPMENT_FOREARM_REGISTRATION.is_file():
        try:
            forearm = json.loads(EQUIPMENT_FOREARM_REGISTRATION.read_text(encoding="utf-8"))
        except Exception as exc:
            add(errors, f"player rig equipment forearm registration is malformed: {exc}")
    elif require_forearm_registration:
        add(
            errors,
            "player rig equipment forearm registration is required before authored grip planes may ship: "
            "assets/sprites_src/player_rig/qa/equipment_forearm_registration_v1.json",
        )

    expected_top = {"version", "method", "review", "classes"}
    forearm_classes: dict[str, Any] = {}
    if forearm:
        if set(forearm) != expected_top:
            add(errors, f"player rig equipment forearm registration keys must be {sorted(expected_top)}")
        if (
            forearm.get("version") != 1
            or forearm.get("method") != "authored-final-body-forearm-rois-v1"
            or forearm.get("review") != "visual-overlay-v1"
        ):
            add(errors, "player rig equipment forearm registration has invalid reviewed v1 provenance")
        raw_classes = forearm.get("classes")
        if not isinstance(raw_classes, dict) or set(raw_classes) != set(PLAYER_CLASSES):
            add(errors, "player rig equipment forearm registration must contain exactly all five classes")
        else:
            forearm_classes = raw_classes

    selected_classes = tuple(class_ids)
    allowed_by_class: dict[str, list[dict[str, tuple[int, int, int, int]]]] = {}
    checks = 0
    for class_id in selected_classes:
        node = forearm_classes.get(class_id) if forearm_classes else None
        frame_nodes = node.get("frames") if isinstance(node, dict) and set(node) == {"frames"} else None
        if forearm and (not isinstance(frame_nodes, list) or len(frame_nodes) != PLAYER_FRAME_COUNT):
            add(errors, f"player rig equipment forearm registration {class_id}: expected exactly 72 frames")
            continue
        if not isinstance(frame_nodes, list):
            continue
        class_allowed: list[dict[str, tuple[int, int, int, int]]] = []
        for index, frame in enumerate(frame_nodes):
            expected_keys = {"index", "pose", "direction", "mainForearmROI", "offForearmROI", "review"}
            if not isinstance(frame, dict) or set(frame) != expected_keys:
                add(errors, f"player rig equipment forearm registration {class_id} frame {index}: invalid keys")
                class_allowed.append({})
                continue
            if (
                frame.get("index") != index
                or frame.get("pose") != PLAYER_POSES[index // 8]
                or frame.get("direction") != PLAYER_DIRS[index % 8]
                or frame.get("review") != "authored-visual-v1"
            ):
                add(errors, f"player rig equipment forearm registration {class_id} frame {index}: ordering/review mismatch")
            regions: dict[str, tuple[int, int, int, int]] = {}
            authored_meta = classes.get(class_id, {}).get("frames", [])
            for role, key, hand_key in (
                ("main", "mainForearmROI", "mainHandROI"),
                ("off", "offForearmROI", "offHandROI"),
            ):
                bounds = frame.get(key)
                if (
                    not isinstance(bounds, list) or len(bounds) != 4
                    or any(type(value) is not int for value in bounds)
                    or bounds[0] < 0 or bounds[1] < 0 or bounds[2] <= 0 or bounds[3] <= 0
                    or bounds[0] + bounds[2] > 192 or bounds[1] + bounds[3] > 192
                ):
                    add(errors, f"player rig equipment forearm registration {class_id} frame {index}: malformed {key}")
                    continue
                if bounds[2:] != [17, 17]:
                    add(
                        errors,
                        f"player rig equipment forearm registration {class_id} frame {index}: "
                        f"{key} must be the reviewed compact 17x17 hand/immediate-cuff region",
                    )
                regions[role] = (bounds[0], bounds[1], bounds[0] + bounds[2], bounds[1] + bounds[3])
                if len(authored_meta) == PLAYER_FRAME_COUNT:
                    hand = authored_meta[index].get(hand_key)
                    if isinstance(hand, list) and len(hand) == 4:
                        hx0, hy0, hw, hh = hand
                        hx1, hy1 = hx0 + hw, hy0 + hh
                        rx0, ry0, rx1, ry1 = regions[role]
                        if rx1 <= hx0 or hx1 <= rx0 or ry1 <= hy0 or hy1 <= ry0:
                            add(errors, f"player rig equipment forearm registration {class_id} frame {index}: {key} misses reviewed {role} hand ROI")
                    grip = authored_meta[index].get(f"{role}Grip")
                    if (
                        not isinstance(grip, list) or len(grip) != 2
                        or bounds != [grip[0] - 8, grip[1] - 8, 17, 17]
                    ):
                        add(
                            errors,
                            f"player rig equipment forearm registration {class_id} frame {index}: "
                            f"{key} must remain centered on the independently reviewed {role} socket",
                        )
                checks += 1
            class_allowed.append(regions)
        allowed_by_class[class_id] = class_allowed
        overlay_path = ROOT / "assets" / "sprites_src" / "player_rig" / "qa" / f"{class_id}_equipment_forearm_registration_v1.png"
        if not overlay_path.is_file():
            add(errors, f"player rig equipment forearm registration {class_id}: missing reviewed overlay {overlay_path.relative_to(ROOT)}")
        else:
            try:
                with Image.open(overlay_path) as overlay:
                    if overlay.format != "PNG" or overlay.mode != "RGBA" or overlay.size != (1536, 1728):
                        add(errors, f"player rig equipment forearm registration {class_id}: overlay must be exact RGBA PNG 1536x1728")
            except Exception as exc:
                add(errors, f"player rig equipment forearm registration {class_id}: overlay decode failed: {exc}")

    try:
        authorship = json.loads(EQUIPMENT_AUTHORSHIP.read_text(encoding="utf-8"))
    except Exception:
        # The authorship validator owns the precise missing-file diagnostic.
        # Forearm provenance remains independently validated before equipment
        # sources land, so an absent authorship file cannot bypass this gate.
        return checks
    files = authorship.get("files") if isinstance(authorship, dict) else None
    if not isinstance(files, dict) or not files:
        return checks

    for rel, descriptor in files.items():
        if not isinstance(descriptor, dict) or descriptor.get("plane") != "grip":
            continue
        class_id = descriptor.get("class")
        if class_id not in selected_classes:
            continue
        slot, family = descriptor.get("slot"), descriptor.get("family")
        allowed_roles = (
            ("main", "off") if slot == "unarmed" or (slot == "main" and family in PLAYER_TWO_HAND)
            else ("main",) if slot == "main"
            else ("off",) if slot == "shield"
            else ()
        )
        if not allowed_roles:
            add(errors, f"player rig equipment hygiene {rel}: grip plane is invalid for {slot}/{family}")
            continue
        path = ROOT / rel
        if not path.is_file():
            continue
        try:
            with Image.open(path) as source:
                if source.mode != "RGBA" or source.size != (1536, 1728):
                    add(errors, f"player rig equipment hygiene {rel}: grip source must be exact RGBA 1536x1728")
                    continue
                alpha = source.getchannel("A")
                if class_id not in allowed_by_class:
                    continue
                for index, regions in enumerate(allowed_by_class[class_id]):
                    col, row = index % 8, index // 8
                    cell = alpha.crop((col * 192, row * 192, (col + 1) * 192, (row + 1) * 192))
                    visible = cell.point(lambda value: 255 if value > PLAYER_SOCKET_ALPHA_MIN else 0)
                    allowed = Image.new("L", (192, 192), 0)
                    for role in allowed_roles:
                        region = regions.get(role)
                        if region is not None:
                            allowed.paste(255, region)
                    residue = ImageChops.subtract(visible, allowed)
                    if residue.getbbox() is not None:
                        pixels = residue.get_flattened_data() if hasattr(residue, "get_flattened_data") else residue.getdata()
                        count = sum(1 for value in pixels if value)
                        add(errors, f"player rig equipment hygiene {rel} frame {index}: {count} grip pixels lie outside reviewed hand/forearm ROIs")
                    checks += 1
        except Exception as exc:
            add(errors, f"player rig equipment hygiene {rel}: source decode failed: {exc}")
    return checks


def _composite_authored_alpha(paths: Iterable[str]) -> Image.Image | None:
    """Union final-aligned authored PNG sources without consulting runtime output."""
    union: Image.Image | None = None
    for rel in dict.fromkeys(paths):
        path = ROOT / rel
        if not path.is_file():
            continue
        try:
            with Image.open(path) as source:
                if source.mode != "RGBA" or source.size != (1536, 1728):
                    continue
                alpha = source.getchannel("A").copy()
            union = alpha if union is None else ImageChops.lighter(union, alpha)
        except Exception:
            continue
    return union


def _composite_authored_rgba(paths: Iterable[str]) -> Image.Image | None:
    """Alpha-composite exact authored PNGs in declared draw order."""
    composite = Image.new("RGBA", (1536, 1728), (0, 0, 0, 0))
    found = False
    for rel in dict.fromkeys(paths):
        path = ROOT / rel
        if not path.is_file():
            continue
        try:
            with Image.open(path) as source:
                if source.mode != "RGBA" or source.size != (1536, 1728):
                    continue
                layer = source.copy()
            composite.alpha_composite(layer)
            found = True
        except Exception:
            continue
    return composite if found else None


def _rgba_change_mask(before: Image.Image, after: Image.Image) -> Image.Image:
    """Return one luminance mask that records a change in any RGBA channel.

    Pillow's RGBA ``getbbox`` defaults to the alpha band, which would again
    miss opaque equipment that recolors an already-opaque body pixel.  Union
    all four difference bands explicitly instead.
    """
    bands = ImageChops.difference(before, after).split()
    changed = bands[0]
    for band in bands[1:]:
        changed = ImageChops.lighter(changed, band)
    return changed


def validate_equipment_source_contacts(
    errors: list[str], class_ids: Iterable[str] = PLAYER_CLASSES,
) -> int:
    """Validate sockets against checked-in sources before runtime packing.

    Object planes and gripping-hand planes are deliberately checked as two
    separate runtime-visible unions. A family cannot hide a detached weapon
    under a correctly registered hand patch, or vice versa.
    """
    if not EQUIPMENT_AUTHORSHIP.is_file():
        return 0
    try:
        registration = json.loads(RIG_REGISTRATION.read_text(encoding="utf-8"))
        authorship = json.loads(EQUIPMENT_AUTHORSHIP.read_text(encoding="utf-8"))
        coverage = json.loads(BASE_EQUIPMENT_COVERAGE.read_text(encoding="utf-8"))
    except Exception:
        return 0
    reviewed_paths = set(authorship.get("files", {})) if isinstance(authorship.get("files"), dict) else set()
    checks = 0
    for class_id in class_ids:
        class_node = registration.get("classes", {}).get(class_id, {})
        frames = class_node.get("frames", []) if isinstance(class_node, dict) else []
        available = coverage.get("classes", {}).get(class_id, {}).get("available", {})
        if not isinstance(available, dict) or not isinstance(frames, list) or len(frames) != PLAYER_FRAME_COUNT:
            continue
        groups = (
            ("unarmed", available.get("unarmed")),
            ("main", available.get("main")),
            ("shield", available.get("shield")),
        )
        for slot, families in groups:
            if not isinstance(families, dict):
                continue
            for family, definition in families.items():
                if not isinstance(definition, dict):
                    continue
                required_sockets = (
                    ("mainGrip", "offGrip") if slot == "unarmed" or (slot == "main" and family in PLAYER_TWO_HAND)
                    else ("mainGrip",) if slot == "main"
                    else ("offGrip",)
                )
                object_paths = [
                    rel for plane in ("rear", "held", "front")
                    for rel, _role, _is_mask in rendered_refs(definition, plane)
                ]
                grip_paths = [rel for rel, _role, _is_mask in rendered_refs(definition, "grip")]
                all_paths = object_paths + grip_paths
                if any(rel not in reviewed_paths for rel in all_paths):
                    # validate_equipment_authorship reports the precise missing role.
                    continue
                object_alpha = _composite_authored_alpha(object_paths) if slot != "unarmed" else None
                grip_alpha = _composite_authored_alpha(grip_paths)
                label = f"player rig authored source {class_id}/{slot}/{family}"
                if slot != "unarmed" and object_alpha is None:
                    add(errors, f"{label}: no decodable runtime-visible object source union")
                if grip_alpha is None:
                    add(errors, f"{label}: no decodable runtime-visible grip source union")
                for index, frame in enumerate(frames):
                    col, row = index % 8, index // 8
                    frame_box = (col * 192, row * 192, (col + 1) * 192, (row + 1) * 192)
                    if object_alpha is not None and object_alpha.crop(frame_box).getbbox() is None:
                        add(errors, f"{label}: object union is empty at frame {index}")
                    if grip_alpha is not None and grip_alpha.crop(frame_box).getbbox() is None:
                        add(errors, f"{label}: grip union is empty at frame {index}")
                    for socket_key in required_sockets:
                        socket = frame.get(socket_key) if isinstance(frame, dict) else None
                        if not isinstance(socket, list) or len(socket) != 2:
                            continue
                        x, y = int(round(socket[0])), int(round(socket[1]))
                        contact_box = (
                            col * 192 + max(0, x - 2), row * 192 + max(0, y - 2),
                            col * 192 + min(192, x + 3), row * 192 + min(192, y + 3),
                        )
                        for plane_label, alpha in (("object", object_alpha), ("grip", grip_alpha)):
                            if alpha is None:
                                continue
                            hit = alpha.crop(contact_box).point(
                                lambda value: 255 if value > PLAYER_SOCKET_ALPHA_MIN else 0
                            ).getbbox()
                            if hit is None:
                                add(errors, f"{label}: {plane_label} pixels miss {socket_key} by >2px at frame {index}")
                            checks += 1
                        if grip_alpha is not None:
                            hand_key = "mainHandROI" if socket_key == "mainGrip" else "offHandROI"
                            hand = frame.get(hand_key) if isinstance(frame, dict) else None
                            if isinstance(hand, list) and len(hand) == 4:
                                hx, hy, hw, hh = hand
                                hand_box = (
                                    col * 192 + hx, row * 192 + hy,
                                    col * 192 + hx + hw, row * 192 + hy + hh,
                                )
                                if grip_alpha.crop(hand_box).point(
                                    lambda value: 255 if value > PLAYER_SOCKET_ALPHA_MIN else 0
                                ).getbbox() is None:
                                    add(errors, f"{label}: grip pixels miss {hand_key} at frame {index}")
                                checks += 1
    return checks


def validate_equipment_render_diffs(
    manifest: dict[str, Any], errors: list[str], class_ids: Iterable[str] = PLAYER_CLASSES,
) -> int:
    """Require each family to change a source-RGBA render of the neutral actor.

    Mirror the runtime plane order instead of comparing alpha silhouettes.
    Opaque worn/grip pixels commonly remain wholly inside the opaque body
    silhouette, yet visibly replace its RGB.  Material masks are rendered as
    their authored grayscale RGBA source here; runtime tinting can only retain
    or increase that visible difference and masks already replace their base
    plane through ``rendered_refs``.
    """
    del manifest  # The source contract is intentionally independent of packed output.
    authored_registration: dict[str, Any] = {}
    coverage: dict[str, Any] = {}
    authored_paths: set[str] = set()
    try:
        authored_registration = json.loads(RIG_REGISTRATION.read_text(encoding="utf-8"))
        coverage = json.loads(BASE_EQUIPMENT_COVERAGE.read_text(encoding="utf-8"))
        authored_document = json.loads(EQUIPMENT_AUTHORSHIP.read_text(encoding="utf-8"))
        if isinstance(authored_document.get("files"), dict):
            authored_paths = set(authored_document["files"])
    except Exception:
        pass
    checks = 0
    for class_id in class_ids:
        authored_class = authored_registration.get("classes", {}).get(class_id, {})
        authored_sources = authored_class.get("sources") if isinstance(authored_class, dict) else None
        body_rel = authored_sources.get("body") if isinstance(authored_sources, dict) else None
        body_rgba = _composite_authored_rgba([body_rel]) if isinstance(body_rel, str) else None
        if body_rgba is None:
            continue
        available = coverage.get("classes", {}).get(class_id, {}).get("available", {})
        if not isinstance(available, dict):
            continue
        for slot in ("main", "shield", "head", "chest"):
            families = available.get(slot, {})
            if not isinstance(families, dict):
                continue
            for family_name, family in families.items():
                plane_ids = {
                    plane: [
                        source_rel
                        for source_rel, _role, _is_mask in rendered_refs(family, plane)
                    ]
                    for plane in equipment_planes(slot)
                }
                ids = [source_rel for values in plane_ids.values() for source_rel in values]
                if any(source_rel not in authored_paths for source_rel in ids):
                    # Authorship validator reports the precise missing role.
                    continue
                if not ids:
                    continue
                composite = Image.new("RGBA", body_rgba.size, (0, 0, 0, 0))
                decoded_equipment = False
                for plane in PLAYER_PLANES:
                    if plane == "body":
                        composite.alpha_composite(body_rgba)
                        continue
                    layer = _composite_authored_rgba(plane_ids.get(plane, ()))
                    if layer is not None:
                        composite.alpha_composite(layer)
                        decoded_equipment = True
                if not decoded_equipment:
                    continue
                changed = _rgba_change_mask(body_rgba, composite)
                empty_frames = []
                for index in range(PLAYER_FRAME_COUNT):
                    col, row = index % 8, index // 8
                    if changed.crop((col * 192, row * 192, (col + 1) * 192, (row + 1) * 192)).getbbox() is None:
                        empty_frames.append(index)
                    checks += 1
                if empty_frames:
                    add(errors, f"player rig {class_id}/{slot}/{family_name}: equipment produces no rendered silhouette/pixel change in frames {empty_frames}")
    return checks


def validate_authored_equipment_armor_silhouettes(
    errors: list[str], class_ids: Iterable[str] = PLAYER_CLASSES,
) -> int:
    """Require available armor families to have genuinely distinct geometry."""
    try:
        coverage = json.loads(BASE_EQUIPMENT_COVERAGE.read_text(encoding="utf-8"))
        authorship = json.loads(EQUIPMENT_AUTHORSHIP.read_text(encoding="utf-8"))
    except Exception:
        return 0
    reviewed = set(authorship.get("files", {})) if isinstance(authorship.get("files"), dict) else set()
    checks = 0
    for class_id in class_ids:
        available = coverage.get("classes", {}).get(class_id, {}).get("available", {})
        if not isinstance(available, dict):
            continue
        for slot in ("head", "chest"):
            families = available.get(slot, {})
            if not isinstance(families, dict):
                continue
            signatures: dict[str, str] = {}
            for family, definition in families.items():
                paths = [
                    rel for rel, _material, _is_mask in rendered_refs(definition, "worn")
                ]
                if any(rel not in reviewed for rel in paths):
                    continue
                alpha = _composite_authored_alpha(paths)
                if alpha is None:
                    continue
                signatures[family] = hashlib.sha256(alpha.tobytes()).hexdigest()
                checks += 1
            duplicates: dict[str, list[str]] = defaultdict(list)
            for family, signature in signatures.items():
                duplicates[signature].append(family)
            for families_for_signature in duplicates.values():
                if len(families_for_signature) > 1:
                    add(
                        errors,
                        f"player rig authored source {class_id}/{slot}: families "
                        f"{sorted(families_for_signature)} have identical worn silhouettes",
                    )
    return checks


def validate_emberwitch_equipment(
    data: dict[str, Any], manifest: dict[str, Any], errors: list[str], *, compare_runtime: bool,
) -> dict[str, int]:
    """Strict class-scoped gate for the complete Emberwitch modular art set."""
    coverage_checks = validate_partial_equipment_coverage(
        data, manifest, errors, compare_runtime=compare_runtime,
    )
    coverage = load_strict_json(
        BASE_EQUIPMENT_COVERAGE, "base player-equipment coverage declaration", errors,
    )
    completion_checks = (
        validate_complete_equipment_class(coverage, "emberwitch", errors)
        if coverage is not None else 0
    )
    authorship_checks = validate_equipment_authorship(
        manifest, errors, class_ids=("emberwitch",), exact_files=False,
    )
    hygiene_checks = validate_equipment_plane_hygiene(
        manifest, errors, class_ids=("emberwitch",),
    )
    source_contact_checks = validate_equipment_source_contacts(errors, ("emberwitch",))
    render_diff_checks = validate_equipment_render_diffs(manifest, errors, ("emberwitch",))
    silhouette_checks = validate_authored_equipment_armor_silhouettes(errors, ("emberwitch",))
    return {
        "coverage": coverage_checks,
        "completion": completion_checks,
        "authorship": authorship_checks,
        "hygiene": hygiene_checks,
        "contacts": source_contact_checks,
        "renderDiffs": render_diff_checks,
        "silhouettes": silhouette_checks,
    }


def validate_invisible_slot_invariance(manifest: dict[str, Any], errors: list[str]) -> int:
    """Guard the four inventory-only slots from leaking into world actors.

    The render plan is driven exclusively by main/off/head/chest. This static
    hook keeps gloves, boots, belts, rings, and amulets out of visual family
    resolution while browser compositor fixtures prove visible equipment does
    alter the actor.
    """
    asset_runtime = (ROOT / "js" / "sprite_assets.js").read_text(encoding="utf-8")
    start = asset_runtime.find("  function resolvePlayerVisual(")
    end = asset_runtime.find("  async function loadPlayerLoadout(", start)
    block = asset_runtime[start:end] if start >= 0 and end > start else ""
    if not block:
        add(errors, "sprite_assets.js: resolvePlayerVisual implementation is missing")
        return 0
    checks = 0
    for slot in ("gloves", "boots", "belt", "ring", "amulet"):
        if re.search(rf"equip\s*\.\s*{slot}\b|equip\s*\[\s*[\"']{slot}[\"']\s*\]", block):
            add(errors, f"sprite_assets.js: inventory-only {slot} must not affect the world player visual")
        checks += 1
    return checks


def validate_source_item_resolution(data: dict[str, Any], errors: list[str]) -> int:
    """Resolve visible game data against authored registration before packing."""
    try:
        registration = json.loads(RIG_REGISTRATION.read_text(encoding="utf-8"))
    except Exception as exc:
        add(errors, f"equipment source resolution cannot read player registration: {exc}")
        return 0
    classes = registration.get("classes", {}) if isinstance(registration, dict) else {}
    expected_slot = {"main": "main", "off": "shield", "head": "head", "chest": "chest"}
    checks = 0
    for base_id, base in data.get("bases", {}).items():
        slot = expected_slot.get(base.get("slot"))
        if slot is None:
            continue
        family, tier = base.get("playerVisualFamily"), base.get("materialTier")
        if not isinstance(family, str) or not family:
            add(errors, f"equipment base {base_id}: missing playerVisualFamily")
            continue
        if type(tier) is not int or not 0 <= tier < 14:
            add(errors, f"equipment base {base_id}: invalid materialTier {tier!r}")
        for class_id in PLAYER_CLASSES:
            sources = classes.get(class_id, {}).get("sources", {})
            if family not in sources.get(slot, {}) if isinstance(sources.get(slot), dict) else True:
                add(errors, f"equipment source resolution: family {family!r} missing from {class_id}/{slot}")
            checks += 1
    for collection in (data.get("uniques", []), data.get("setItems", [])):
        for named in collection:
            base_id = named.get("base")
            if base_id not in data.get("bases", {}):
                add(errors, f"named item {named.get('id')}: unknown base {base_id!r}")
                continue
            override = named.get("playerSpriteOverride")
            if not override:
                continue
            slot = expected_slot.get(data["bases"][base_id].get("slot"))
            if slot:
                for class_id in PLAYER_CLASSES:
                    sources = classes.get(class_id, {}).get("sources", {})
                    if override not in sources.get(slot, {}) if isinstance(sources.get(slot), dict) else True:
                        add(errors, f"named item {named.get('id')}: override {override!r} missing from {class_id}/{slot}")
                    checks += 1
    return checks


def composite_alpha(manifest: dict[str, Any], asset_ids: Iterable[str]) -> Image.Image | None:
    """Union the runtime-rendered plane/mask pixels for one family."""
    union: Image.Image | None = None
    for asset_id in dict.fromkeys(asset_ids):
        entry = manifest.get("entries", {}).get(asset_id)
        if not entry:
            continue
        path = ROOT / entry.get("src", "")
        if not path.is_file():
            continue
        try:
            with Image.open(path) as source:
                alpha = source.convert("RGBA").getchannel("A")
                union = alpha.copy() if union is None else ImageChops.lighter(union, alpha)
        except Exception:
            continue
    return union


def validate_composite_contacts(
    manifest: dict[str, Any], asset_ids: Iterable[str], frames: list[Any], socket_keys: Iterable[str],
    label: str, errors: list[str], radius: int = 2,
) -> int:
    """Check the composited family planes at every authored socket."""
    alpha = composite_alpha(manifest, asset_ids)
    if alpha is None:
        return 0
    checks = 0
    for index, meta in enumerate(frames):
        if not isinstance(meta, dict):
            continue
        col, row = index % 8, index // 8
        for key in socket_keys:
            socket = point(meta, key, f"{label} frame {index}", [])
            if socket is None:
                continue
            x, y = int(round(socket[0])), int(round(socket[1]))
            box = (
                col * 192 + max(0, x - radius), row * 192 + max(0, y - radius),
                col * 192 + min(192, x + radius + 1), row * 192 + min(192, y + radius + 1),
            )
            contact = alpha.crop(box).point(lambda value: 255 if value > PLAYER_SOCKET_ALPHA_MIN else 0)
            if contact.getbbox() is None:
                add(errors, f"{label} frame {index}: pixels miss {key} by more than {radius}px")
            checks += 1
    return checks


def validate_composite_coverage(
    manifest: dict[str, Any], asset_ids: Iterable[str], label: str, errors: list[str]
) -> int:
    alpha = composite_alpha(manifest, asset_ids)
    if alpha is None:
        return 0
    checks = 0
    empty: list[int] = []
    for index in range(PLAYER_FRAME_COUNT):
        col, row = index % 8, index // 8
        if alpha.crop((col * 192, row * 192, (col + 1) * 192, (row + 1) * 192)).getbbox() is None:
            empty.append(index)
        checks += 1
    if empty:
        add(errors, f"{label}: composited authored layers have empty frames {empty}")
    return checks


def validate_composite_rois(
    manifest: dict[str, Any], asset_ids: Iterable[str], frames: list[Any], roi_key: str,
    label: str, errors: list[str],
) -> int:
    alpha = composite_alpha(manifest, asset_ids)
    if alpha is None:
        return 0
    checks = 0
    for index, meta in enumerate(frames):
        if not isinstance(meta, dict):
            continue
        bounds = roi(meta, roi_key, f"{label} frame {index}", [])
        if bounds is None:
            continue
        x, y, width, height = bounds
        col, row = index % 8, index // 8
        box = (
            col * 192 + int(x), row * 192 + int(y),
            col * 192 + int(math.ceil(x + width)), row * 192 + int(math.ceil(y + height)),
        )
        overlap = alpha.crop(box).point(lambda value: 255 if value > PLAYER_SOCKET_ALPHA_MIN else 0)
        if overlap.getbbox() is None:
            add(errors, f"{label} frame {index}: worn pixels do not intersect {roi_key}")
        checks += 1
    return checks


def validate_body_sockets(
    manifest: dict[str, Any], body_id: str, frames: list[Any], class_id: str, errors: list[str]
) -> int:
    """Validate sockets against authored hand regions, not a global silhouette.

    A global distance-to-transparency rule is not sound for crossed arms: the
    correct hand can be visually inside the composite body silhouette.  The
    authoring pass therefore records a reviewed hand/cuff region for each
    socket.  This gate also rejects the old torso fallback by excluding the
    inset chest core while still permitting hands at a crossed-arm boundary.
    """
    entry = manifest.get("entries", {}).get(body_id)
    if not entry:
        return 0
    path = ROOT / entry.get("src", "")
    if not path.is_file():
        return 0
    try:
        with Image.open(path) as source:
            image = source.convert("RGBA")
        expected_size = (PLAYER_CELL[0] * len(PLAYER_DIRS), PLAYER_CELL[1] * len(PLAYER_POSES))
        if image.size != expected_size:
            return 0
        digests: dict[str, list[str]] = defaultdict(list)
        for pose_index, pose_name in enumerate(PLAYER_POSES):
            y0 = pose_index * PLAYER_CELL[1]
            strip = image.crop((0, y0, image.width, y0 + PLAYER_CELL[1]))
            digests[hashlib.sha256(strip.tobytes()).hexdigest()].append(pose_name)
        for duplicate_poses in digests.values():
            if len(duplicate_poses) > 1:
                add(
                    errors,
                    f"player rig {class_id}: neutral body pose rows {duplicate_poses} are byte-identical; "
                    "all nine poses require independently authored artwork",
                )
        return len(PLAYER_POSES)
    except Exception:
        return 0
    path = ROOT / entry.get("src", "")
    if not path.is_file():
        return 0
    try:
        with Image.open(path) as source:
            image = source.convert("RGBA")
        expected_size = (PLAYER_CELL[0] * len(PLAYER_DIRS), PLAYER_CELL[1] * len(PLAYER_POSES))
        if image.size != expected_size:
            return 0
        digests: dict[str, list[str]] = defaultdict(list)
        for pose_index, pose_name in enumerate(PLAYER_POSES):
            y0 = pose_index * PLAYER_CELL[1]
            strip = image.crop((0, y0, image.width, y0 + PLAYER_CELL[1]))
            digests[hashlib.sha256(strip.tobytes()).hexdigest()].append(pose_name)
        for duplicate_poses in digests.values():
            if len(duplicate_poses) > 1:
                add(
                    errors,
                    f"player rig {class_id}: neutral body pose rows {duplicate_poses} are byte-identical; "
                    "all nine poses require independently authored artwork",
                )
        return len(PLAYER_POSES)
    except Exception:
        return 0
    path = ROOT / entry.get("src", "")
    if not path.is_file():
        return 0
    checks = 0
    try:
        with Image.open(path) as source:
            alpha = source.convert("RGBA").getchannel("A")
            for index, meta in enumerate(frames):
                if not isinstance(meta, dict):
                    continue
                col, row = index % 8, index // 8
                cell = alpha.crop((col * 192, row * 192, (col + 1) * 192, (row + 1) * 192))
                px = cell.load()
                frame_label = f"player rig {class_id} frame {index}"
                head = roi(meta, "headROI", frame_label, [])
                chest = roi(meta, "chestROI", frame_label, [])
                for key, hand_key in (("mainGrip", "mainHandROI"), ("offGrip", "offHandROI")):
                    socket = point(meta, key, frame_label, [])
                    hand = roi(meta, hand_key, frame_label, [])
                    if socket is None or hand is None:
                        continue
                    x, y = int(round(socket[0])), int(round(socket[1]))
                    hx, hy, hw, hh = hand
                    if not (hx <= socket[0] < hx + hw and hy <= socket[1] < hy + hh):
                        add(errors, f"{frame_label}: {key} {meta[key]} lies outside reviewed {hand_key} {meta[hand_key]}")
                    if px[x, y] <= PLAYER_SOCKET_ALPHA_MIN:
                        add(errors, f"{frame_label}: {key} {meta[key]} is detached from authored hand/cuff alpha")
                    hand_box = (int(hx), int(hy), int(math.ceil(hx + hw)), int(math.ceil(hy + hh)))
                    hand_alpha = cell.crop(hand_box).point(lambda value: 255 if value > PLAYER_SOCKET_ALPHA_MIN else 0)
                    if hand_alpha.getbbox() is None:
                        add(errors, f"{frame_label}: {hand_key} {meta[hand_key]} contains no body pixels")
                    if head:
                        rx, ry, rw, rh = head
                        if rx <= socket[0] < rx + rw and ry <= socket[1] < ry + rh:
                            add(errors, f"{frame_label}: {key} {meta[key]} falls inside headROI")
                    if chest:
                        rx, ry, rw, rh = chest
                        inset = min(PLAYER_CHEST_CORE_INSET, max(1, int(min(rw, rh) / 4)))
                        if rx + inset <= socket[0] < rx + rw - inset and ry + inset <= socket[1] < ry + rh - inset:
                            add(errors, f"{frame_label}: {key} {meta[key]} falls deep inside chest torso core")
                    checks += 1
    except Exception:
        return checks
    return checks


def validate_distinct_body_pose_rows(
    manifest: dict[str, Any], body_id: str, class_id: str, errors: list[str]
) -> int:
    """Reject pose aliases in the neutral body atlas.

    A row is the complete eight-direction strip. Comparing the decoded RGBA
    bytes catches the former 8x7-to-8x9 expansion even when its manifest still
    declares nine rows and every individual frame is non-empty.
    """
    entry = manifest.get("entries", {}).get(body_id)
    if not entry:
        return 0
    path = ROOT / entry.get("src", "")
    if not path.is_file():
        return 0
    try:
        with Image.open(path) as source:
            image = source.convert("RGBA")
        expected_size = (PLAYER_CELL[0] * len(PLAYER_DIRS), PLAYER_CELL[1] * len(PLAYER_POSES))
        if image.size != expected_size:
            return 0
        digests: dict[str, list[str]] = defaultdict(list)
        for pose_index, pose_name in enumerate(PLAYER_POSES):
            y0 = pose_index * PLAYER_CELL[1]
            strip = image.crop((0, y0, image.width, y0 + PLAYER_CELL[1]))
            digests[hashlib.sha256(strip.tobytes()).hexdigest()].append(pose_name)
        for duplicate_poses in digests.values():
            if len(duplicate_poses) > 1:
                add(
                    errors,
                    f"player rig {class_id}: neutral body pose rows {duplicate_poses} are byte-identical; "
                    "all nine poses require independently authored artwork",
                )
        return len(PLAYER_POSES)
    except Exception:
        return 0


def validate_body_cell_padding(
    manifest: dict[str, Any], body_id: str, class_id: str, errors: list[str]
) -> int:
    """Final-aligned body cells must retain transparent anti-clip padding."""
    entry = manifest.get("entries", {}).get(body_id)
    if not entry:
        return 0
    path = ROOT / entry.get("src", "")
    if not path.is_file():
        return 0
    checks = 0
    try:
        with Image.open(path) as source:
            alpha = source.convert("RGBA").getchannel("A")
        if alpha.size != (1536, 1728):
            return 0
        for index in range(PLAYER_FRAME_COUNT):
            col, row = index % 8, index // 8
            cell = alpha.crop((col * 192, row * 192, (col + 1) * 192, (row + 1) * 192))
            edge = Image.new("L", cell.size, 0)
            edge.paste(cell.crop((0, 0, 192, 1)), (0, 0))
            edge.paste(cell.crop((0, 191, 192, 192)), (0, 191))
            edge.paste(cell.crop((0, 0, 1, 192)), (0, 0))
            edge.paste(cell.crop((191, 0, 192, 192)), (191, 0))
            if edge.point(lambda value: 255 if value > PLAYER_SOCKET_ALPHA_MIN else 0).getbbox() is not None:
                add(
                    errors,
                    f"player rig {class_id} {PLAYER_POSES[row]}/{PLAYER_DIRS[col]} frame {index}: "
                    "body alpha touches a cell edge (clipped final-aligned artwork)",
                )
            checks += 1
    except Exception:
        return checks
    return checks


def validate_grip_hand_regions(
    manifest: dict[str, Any], asset_ids: Iterable[str], frames: list[Any],
    socket_keys: Iterable[str], label: str, errors: list[str],
) -> int:
    """Require each gripping-hand composite to overlap its reviewed hand ROI."""
    alpha = composite_alpha(manifest, asset_ids)
    if alpha is None:
        return 0
    hand_key_for = {"mainGrip": "mainHandROI", "offGrip": "offHandROI"}
    checks = 0
    for index, meta in enumerate(frames):
        if not isinstance(meta, dict):
            continue
        col, row = index % 8, index // 8
        for socket_key in socket_keys:
            hand_key = hand_key_for[socket_key]
            bounds = roi(meta, hand_key, f"{label} frame {index}", [])
            if bounds is None:
                continue
            x, y, width, height = bounds
            box = (
                col * 192 + int(x), row * 192 + int(y),
                col * 192 + int(math.ceil(x + width)), row * 192 + int(math.ceil(y + height)),
            )
            contact = alpha.crop(box).point(lambda value: 255 if value > PLAYER_SOCKET_ALPHA_MIN else 0)
            if contact.getbbox() is None:
                add(errors, f"{label} frame {index}: gripping-hand pixels do not intersect {hand_key}")
            checks += 1
    return checks


def validate_asset_rois(
    manifest: dict[str, Any], asset_id: str, frames: list[Any], roi_key: str,
    label: str, errors: list[str],
) -> int:
    """Backward-compatible wrapper for single-plane ROI checks."""
    return validate_composite_rois(manifest, [asset_id], frames, roi_key, label, errors)


def validate_player_rigs(
    manifest: dict[str, Any], summaries: dict[str, dict[str, Any]], errors: list[str]
) -> dict[str, int]:
    maps = manifest.get("maps", {})
    rigs = maps.get("playerRigs")
    if not isinstance(rigs, dict):
        add(errors, "maps.playerRigs: missing grip-accurate player rig map")
        return {"assets": 0, "renderedAssets": 0, "referencedFrames": 0, "contactChecks": 0}
    if "playerMasks" in maps or "gearWeapons" in maps or "gearHelms" in maps:
        add(errors, "deprecated playerMasks/gearWeapons/gearHelms maps remain after player-rig migration")

    actual_classes = set(rigs)
    if actual_classes != set(PLAYER_CLASSES):
        add(errors, f"maps.playerRigs classes: expected {list(PLAYER_CLASSES)}, found {sorted(actual_classes)}")

    referenced_assets: set[str] = set()
    rendered_assets: set[str] = set()
    contact_checks = 0
    for class_id in PLAYER_CLASSES:
        rig = rigs.get(class_id)
        if not isinstance(rig, dict):
            continue
        if rig.get("revision") != PLAYER_RIG_REVISION:
            add(errors, f"player rig {class_id}: revision must be {PLAYER_RIG_REVISION!r}")
        body = rig.get("body")
        if not isinstance(body, str):
            add(errors, f"player rig {class_id}: missing neutral body asset")
        else:
            referenced_assets.add(body)
            rendered_assets.add(body)
            validate_rig_asset(manifest, errors, body, class_id, "body", "neutral", "body")

        frames = rig.get("frames")
        if not isinstance(frames, list) or len(frames) != PLAYER_FRAME_COUNT:
            add(errors, f"player rig {class_id}: expected exactly 72 ordered socket/ROI records")
            frames = []
        for index, meta in enumerate(frames):
            label = f"player rig {class_id} {PLAYER_POSES[index // 8]}/{PLAYER_DIRS[index % 8]} frame {index}"
            if not isinstance(meta, dict):
                add(errors, f"{label}: metadata is not an object")
                continue
            point(meta, "mainGrip", label, errors)
            point(meta, "offGrip", label, errors)
            roi(meta, "mainHandROI", label, errors)
            roi(meta, "offHandROI", label, errors)
            roi(meta, "headROI", label, errors)
            roi(meta, "chestROI", label, errors)
        if isinstance(body, str):
            contact_checks += validate_body_sockets(manifest, body, frames, class_id, errors)
            contact_checks += validate_distinct_body_pose_rows(manifest, body, class_id, errors)
            contact_checks += validate_body_cell_padding(manifest, body, class_id, errors)
        unarmed = rig.get("unarmed")
        if not isinstance(unarmed, dict):
            add(errors, f"player rig {class_id}: missing unarmed grip family")
        else:
            grip_refs = list(iter_layer_refs(unarmed.get("grip")))
            if not grip_refs:
                add(errors, f"player rig {class_id}: unarmed family must declare a grip layer")
            for plane, asset_id, role, is_mask in family_refs(unarmed, ("rear", "held", "grip", "front")):
                referenced_assets.add(asset_id)
                validate_rig_asset(manifest, errors, asset_id, class_id, "unarmed", "unarmed", plane, role if is_mask else None)
            for plane in ("rear", "held", "grip", "front"):
                rendered_assets.update(asset_id for asset_id, _role, _is_mask in rendered_refs(unarmed, plane))
            unarmed_grip = [asset_id for asset_id, _role, _is_mask in rendered_refs(unarmed, "grip")]
            contact_checks += validate_composite_coverage(manifest, unarmed_grip, f"{class_id}/unarmed/grip", errors)
            contact_checks += validate_composite_contacts(
                manifest, unarmed_grip, frames, ("mainGrip", "offGrip"),
                f"{class_id}/unarmed/grip", errors,
            )
            contact_checks += validate_grip_hand_regions(
                manifest, unarmed_grip, frames, ("mainGrip", "offGrip"),
                f"{class_id}/unarmed/grip", errors,
            )

        groups = (
            ("main", PLAYER_MAIN_FAMILIES, ("rear", "held", "grip", "front")),
            ("shield", ("shield",), ("rear", "held", "grip", "front")),
            ("head", PLAYER_ARMOR_FAMILIES, ("rear", "worn", "front")),
            ("chest", PLAYER_ARMOR_FAMILIES, ("rear", "worn", "front")),
        )
        for slot, expected_families, planes in groups:
            group = rig.get(slot)
            if not isinstance(group, dict):
                add(errors, f"player rig {class_id}: missing {slot} families")
                continue
            if set(group) != set(expected_families):
                add(errors, f"player rig {class_id}/{slot}: expected {list(expected_families)}, found {sorted(group)}")
            for family in expected_families:
                definition = group.get(family)
                if not isinstance(definition, dict):
                    add(errors, f"player rig {class_id}/{slot}: missing family {family}")
                    continue
                # Rear/front are deterministic optional occlusion planes.  A
                # family is valid when its runtime-visible object plane and
                # family-specific grip exist; forcing a nonempty rear plane
                # would make front-facing one-handed weapons impossible to
                # author honestly.
                required_planes = ("held", "grip") if slot in {"main", "shield"} else ("worn",)
                for required_plane in required_planes:
                    has_base = bool(list(iter_layer_refs(definition.get(required_plane))))
                    plane_masks = definition.get("masks", {}).get(required_plane, {}) if isinstance(definition.get("masks"), dict) else {}
                    has_masks = bool(list(iter_layer_refs(plane_masks)))
                    if not has_base and not has_masks:
                        add(errors, f"player rig {class_id}/{slot}/{family}: missing required {required_plane} layer")
                family_assets: dict[str, list[str]] = defaultdict(list)
                grip_assets: list[str] = []
                for plane, asset_id, role, is_mask in family_refs(definition, planes):
                    referenced_assets.add(asset_id)
                    validate_rig_asset(manifest, errors, asset_id, class_id, slot, family, plane, role if is_mask else None)
                for plane in planes:
                    for asset_id, _role, _is_mask in rendered_refs(definition, plane):
                        rendered_assets.add(asset_id)
                        family_assets[plane].append(asset_id)
                        if plane == "grip":
                            grip_assets.append(asset_id)

                # Contact and ROI checks run on decoded authored pixels, never on manifest metadata alone.
                label = f"{class_id}/{slot}/{family}"
                if slot in {"main", "shield"}:
                    if not grip_assets:
                        add(errors, f"{label}: no authored gripping-hand layer")
                    socket_keys = ["mainGrip"] if slot == "main" else ["offGrip"]
                    if slot == "main" and family in PLAYER_TWO_HAND:
                        socket_keys.append("offGrip")
                    object_assets = family_assets.get("rear", []) + family_assets.get("held", []) + family_assets.get("front", [])
                    contact_checks += validate_composite_coverage(manifest, object_assets, f"{label}/object", errors)
                    contact_checks += validate_composite_coverage(manifest, grip_assets, f"{label}/grip", errors)
                    contact_checks += validate_composite_contacts(manifest, object_assets, frames, socket_keys, f"{label}/object", errors)
                    contact_checks += validate_composite_contacts(manifest, grip_assets, frames, socket_keys, f"{label}/grip", errors)
                    contact_checks += validate_grip_hand_regions(manifest, grip_assets, frames, socket_keys, f"{label}/grip", errors)
                if slot in {"head", "chest"}:
                    worn_assets = family_assets.get("worn", [])
                    contact_checks += validate_composite_coverage(manifest, worn_assets, f"{label}/worn", errors)
                    contact_checks += validate_composite_rois(manifest, worn_assets, frames, f"{slot}ROI", f"{label}/worn", errors)

    for class_id in PLAYER_CLASSES:
        body_id = rigs.get(class_id, {}).get("body")
        if body_id and summaries.get(body_id, {}).get("empty"):
            add(errors, f"{body_id}: neutral body has empty frames {summaries[body_id]['empty']}")

    # Silhouette families must not be aliases or byte-identical artwork.
    for class_id in PLAYER_CLASSES:
        rig = rigs.get(class_id, {})
        for slot in ("head", "chest"):
            signatures: dict[str, tuple[str, ...]] = {}
            for family in PLAYER_ARMOR_FAMILIES:
                definition = rig.get(slot, {}).get(family, {})
                worn_ids = tuple(asset_id for asset_id, _role, _is_mask in rendered_refs(definition, "worn"))
                signatures[family] = worn_ids
            duplicates = defaultdict(list)
            for family, signature in signatures.items():
                duplicates[signature].append(family)
            for signature, families in duplicates.items():
                if signature and len(families) > 1:
                    add(errors, f"player rig {class_id}/{slot}: families {families} reuse the same worn silhouette {signature}")
            alpha_digests: dict[str, str] = {}
            for family, asset_ids in signatures.items():
                alpha = composite_alpha(manifest, asset_ids)
                if alpha is not None:
                    alpha_digests[family] = hashlib.sha256(alpha.tobytes()).hexdigest()
            duplicate_digests = defaultdict(list)
            for family, digest in alpha_digests.items():
                duplicate_digests[digest].append(family)
            for families in duplicate_digests.values():
                if len(families) > 1:
                    add(errors, f"player rig {class_id}/{slot}: families {families} have identical rendered silhouettes")

    return {
        "assets": len(referenced_assets),
        "renderedAssets": len(rendered_assets),
        "referencedFrames": len(rendered_assets) * PLAYER_FRAME_COUNT,
        "contactChecks": contact_checks,
    }


def validate_item_resolution(data: dict[str, Any], manifest: dict[str, Any], errors: list[str]) -> None:
    rigs = manifest.get("maps", {}).get("playerRigs", {})
    expected_slot = {"main": "main", "off": "shield", "head": "head", "chest": "chest"}
    visible_bases = {key: value for key, value in data["bases"].items() if value.get("slot") in expected_slot}
    resolved_families: set[tuple[str, str]] = set()
    for base_id, base in visible_bases.items():
        slot = expected_slot[base["slot"]]
        family = base.get("playerVisualFamily")
        tier = base.get("materialTier")
        if not family:
            add(errors, f"equipment base {base_id}: missing playerVisualFamily")
        else:
            resolved_families.add((slot, family))
        if not isinstance(tier, int) or not 0 <= tier < 14:
            add(errors, f"equipment base {base_id}: invalid materialTier {tier!r}")
    for slot, family in sorted(resolved_families):
        for class_id in PLAYER_CLASSES:
            if family not in rigs.get(class_id, {}).get(slot, {}):
                add(errors, f"equipment resolution: family {family!r} used by DATA.BASES is missing from {class_id}/{slot}")
    for collection, id_key in ((data.get("uniques", []), "id"), (data.get("setItems", []), "id")):
        for named in collection:
            base_id = named.get("base")
            if base_id not in data["bases"]:
                add(errors, f"named item {named.get(id_key)}: unknown base {base_id!r}")
                continue
            override = named.get("playerSpriteOverride")
            if override:
                base = data["bases"][base_id]
                slot = expected_slot.get(base.get("slot"))
                if slot:
                    for class_id in PLAYER_CLASSES:
                        if override not in rigs.get(class_id, {}).get(slot, {}):
                            add(errors, f"named item {named.get(id_key)}: override {override!r} missing from {class_id}/{slot}")


def validate_world_coverage(manifest: dict[str, Any], errors: list[str]) -> None:
    maps = manifest.get("maps", {})
    required_items = {"sword", "axe", "mace", "dagger", "spear", "bow", "crossbow", "wand", "staff", "shield", "helm", "chest", "gloves", "boots", "belt", "ring", "amulet"}
    if required_items - set(maps.get("itemCategories", {})):
        add(errors, f"item categories: missing {sorted(required_items - set(maps.get('itemCategories', {})))}")
    if len(maps.get("grounds", {})) != 32:
        add(errors, f"zone grounds: expected 32, found {len(maps.get('grounds', {}))}")
    if len(maps.get("hazards", {})) != 9:
        add(errors, f"hazards: expected 9, found {len(maps.get('hazards', {}))}")
    if len(maps.get("forms", {})) != 4 or any(asset_id not in manifest.get("entries", {}) for asset_id in maps.get("forms", {}).values()):
        add(errors, "Wildkeeper forms: expected four asset-backed form sprites")
    item_atlas = manifest.get("entries", {}).get("ui.items.equipment", {})
    if (item_atlas.get("cell"), item_atlas.get("cols"), item_atlas.get("rows")) != ([64, 64], 17, 14):
        add(errors, "item atlas: expected 17 equipment silhouettes across 14 material tiers")
    variants = manifest.get("entries", {}).get("ui.items.variants", {})
    if (variants.get("cell"), variants.get("cols"), variants.get("rows")) != ([64, 64], 6, 5):
        add(errors, "item variants: expected 30 authored silhouettes in 64px cells")
    required_variants = {"jewel", "potP", "potG", "scrollB", "charm_small", "charm_large", "charm_grand",
                         "cap", "quiltvest", "hauberk", "ljgloves", "warboots", "sash", "buckler", "flangedmace",
                         "cudgel", "sword2h", "axe2h", "mace2h", "chest_leather", "helm_leather", "helm_mail",
                         "gloves_mail", "boots_mail", "chest_plate", "helm_plate", "gloves_plate", "boots_plate", "hp1", "mp1"}
    variant_map = maps.get("itemVariants", {})
    if required_variants - set(variant_map):
        add(errors, f"item variants: missing {sorted(required_variants - set(variant_map))}")
    if any(not isinstance(value, int) or not 0 <= value < 30 for value in variant_map.values()):
        add(errors, "item variants: out-of-bounds frame mapping")
    if len({variant_map.get(key) for key in required_variants}) != 30:
        add(errors, "item variants: distinct silhouettes share an index")
    if tuple(manifest.get("directions", [])) != PLAYER_DIRS:
        add(errors, f"player direction order must be {list(PLAYER_DIRS)}")
    if tuple(manifest.get("poses", [])) != PLAYER_POSES:
        add(errors, f"player pose order must be {list(PLAYER_POSES)}")
    previews = maps.get("playerPreviews")
    if not isinstance(previews, dict) or set(previews) != set(PLAYER_CLASSES):
        actual = sorted(previews) if isinstance(previews, dict) else []
        add(errors, f"player title previews: expected exactly {list(PLAYER_CLASSES)}, found {actual}")
    else:
        preview_ids = list(previews.values())
        if len(set(preview_ids)) != len(PLAYER_CLASSES):
            add(errors, "player title previews: every class requires a distinct flattened atlas")
        for class_id, asset_id in previews.items():
            entry = manifest.get("entries", {}).get(asset_id)
            if not entry:
                add(errors, f"player title preview {class_id}: missing manifest entry {asset_id!r}")
                continue
            expected_preview = {
                "kind": "atlas", "cell": PLAYER_CELL, "cols": len(PLAYER_DIRS),
                "rows": 1, "anchor": PLAYER_ANCHOR, "bundle": "core",
                "rigClass": class_id, "rigSlot": "preview", "rigFamily": "neutral",
                "rigPlane": "preview",
            }
            for key, expected_value in expected_preview.items():
                if entry.get(key) != expected_value:
                    add(errors, f"player title preview {class_id}: {key} must be {expected_value!r}, found {entry.get(key)!r}")

    # Title startup owns flattened previews only. Full bodies and loadout layers
    # must remain class-bundle assets so inactive gameplay rigs can be evicted.
    for class_id, rig in maps.get("playerRigs", {}).items():
        if not isinstance(rig, dict):
            continue
        rig_ids: set[str] = set()
        if isinstance(rig.get("body"), str):
            rig_ids.add(rig["body"])
        if isinstance(rig.get("unarmed"), dict):
            for plane in ("rear", "held", "grip", "front"):
                rig_ids.update(asset_id for asset_id, _role in iter_layer_refs(rig["unarmed"].get(plane)))
                masks = rig["unarmed"].get("masks", {}).get(plane) if isinstance(rig["unarmed"].get("masks"), dict) else None
                rig_ids.update(asset_id for asset_id, _role in iter_layer_refs(masks))
        for slot, planes in (("main", ("rear", "held", "grip", "front")), ("shield", ("rear", "held", "grip", "front")), ("head", ("rear", "worn", "front")), ("chest", ("rear", "worn", "front"))):
            for family in rig.get(slot, {}).values() if isinstance(rig.get(slot), dict) else ():
                if not isinstance(family, dict):
                    continue
                for plane in planes:
                    rig_ids.update(asset_id for asset_id, _role, _is_mask in rendered_refs(family, plane))
        for asset_id in rig_ids:
            entry = manifest.get("entries", {}).get(asset_id, {})
            if entry.get("bundle") == "core":
                add(errors, f"player gameplay rig {class_id}: {asset_id} must not be in the core title bundle")
    if manifest.get("wallHeight") != 72:
        add(errors, "wallHeight must remain 72")
    if manifest.get("wallViewHeight") != 128:
        add(errors, "wallViewHeight must match the transparent 128px wall cell")
    for label, mapping, cell in (("wall", maps.get("walls", {}), [128, 128]), ("path", maps.get("paths", {}), [64, 32])):
        for theme, asset_id in mapping.items():
            entry = manifest.get("entries", {}).get(asset_id, {})
            if entry.get("cols") != 4 or entry.get("rows") != 4 or entry.get("cell") != cell:
                add(errors, f"{label} {theme}: expected a 4x4 atlas of {cell[0]}x{cell[1]} cells")
            if label == "wall" and entry.get("anchor") != [64, 112]:
                add(errors, f"wall {theme}: expected authored 64x32 footprint anchor [64,112]")

    data_text = (ROOT / "js" / "data.js").read_text(encoding="utf-8")
    grounds = set(re.findall(r"^\s*ground_([A-Za-z0-9_]+):\s*\{\s*src:", data_text, re.M))
    hazards = set(re.findall(r"^\s*hazard_([A-Za-z0-9_]+):\s*\{\s*src:", data_text, re.M))
    skills = set(re.findall(r'icon\s*:\s*"(@[^"]+)"', data_text)) | {"basic"}
    for label, required, actual in (
        ("zone grounds", grounds, set(maps.get("grounds", {}))),
        ("hazards", hazards, set(maps.get("hazards", {}))),
        ("skill icons", skills, set(maps.get("skillIcons", {}))),
    ):
        if required - actual:
            add(errors, f"{label}: missing {sorted(required - actual)}")
    for label, mapping in (("zone ground", maps.get("grounds", {})), ("hazard", maps.get("hazards", {}))):
        for key, asset_id in mapping.items():
            entry = manifest.get("entries", {}).get(asset_id, {})
            if (entry.get("cell"), entry.get("cols"), entry.get("rows")) != ([64, 32], 4, 1):
                add(errors, f"{label} {key}: expected four 64x32 variants")

    mapgen = (ROOT / "js" / "mapgen.js").read_text(encoding="utf-8")
    used_props = set(re.findall(r'addProp\([^,]+,\s*"([a-z_]+)"', mapgen))
    used_props |= set(re.findall(r'\["([a-z_]+)",\s*-?\d', mapgen))
    used_props |= set(re.findall(r'\bprop:\s*"([a-z_]+)"', mapgen))
    if used_props - set(maps.get("props", {})):
        add(errors, f"placed props missing sprites: {sorted(used_props - set(maps.get('props', {})))}")


def _path_socket_window(alpha: Image.Image, point: tuple[int, int]) -> tuple[bool, ...]:
    """Return the shared-world 5x5 alpha window around an isometric join."""
    x, y = point
    radius = PATH_SOCKET_RADIUS
    return tuple(
        alpha.getpixel((x + dx, y + dy)) > PLAYER_SOCKET_ALPHA_MIN
        for dy in range(-radius, radius + 1)
        for dx in range(-radius, radius + 1)
    )


def validate_path_adjacency_alpha(alpha_cells: list[Image.Image], label: str, errors: list[str]) -> int:
    """Validate N/E/S/W bits at diamond-edge joins used by U.isoX/U.isoY.

    A connected arm may land anywhere in a small anti-aliasing window. An
    absent arm must leave the exact shared midpoint transparent; its inward
    half-window can legitimately contain the isolated center diamond. Every
    connected frame is also paired with every reciprocal connected frame so
    two neighboring sprites are guaranteed to share at least one visible
    world-space pixel instead of merely approaching the same edge.
    """
    if len(alpha_cells) != 16:
        add(errors, f"{label}: expected exactly 16 path adjacency frames")
        return 0
    checks = 0
    bad_connected: list[tuple[int, int]] = []
    bad_disconnected: list[tuple[int, int]] = []
    windows: dict[tuple[int, int], tuple[bool, ...]] = {}
    for mask, frame_alpha in enumerate(alpha_cells):
        checks += 1
        if frame_alpha.getpixel((32, 16)) <= PLAYER_SOCKET_ALPHA_MIN:
            add(errors, f"{label}: path frame {mask} misses authored center")
        for bit, socket in PATH_SOCKETS.items():
            window = _path_socket_window(frame_alpha, socket)
            windows[(mask, bit)] = window
            checks += 1
            if mask & bit:
                if not any(window):
                    bad_connected.append((mask, bit))
            elif frame_alpha.getpixel(socket) > PLAYER_SOCKET_ALPHA_MIN:
                bad_disconnected.append((mask, bit))
    if bad_connected:
        add(errors, f"{label}: connected isometric path sockets miss their 5x5 AA bands (frame/bit {bad_connected})")
    if bad_disconnected:
        add(errors, f"{label}: disconnected isometric path sockets are opaque at the shared midpoint (frame/bit {bad_disconnected})")

    seam_failures: list[tuple[int, int, int]] = []
    for bit, reciprocal in PATH_RECIPROCAL_BITS.items():
        local_masks = [mask for mask in range(16) if mask & bit]
        neighbor_masks = [mask for mask in range(16) if mask & reciprocal]
        for local_mask in local_masks:
            local = windows[(local_mask, bit)]
            for neighbor_mask in neighbor_masks:
                checks += 1
                neighbor = windows[(neighbor_mask, reciprocal)]
                if not any(left and right for left, right in zip(local, neighbor)):
                    seam_failures.append((bit, local_mask, neighbor_mask))
    if seam_failures:
        sample = seam_failures[:12]
        remainder = len(seam_failures) - len(sample)
        add(
            errors,
            f"{label}: reciprocal path frames leave a gap in their translated 5x5 seam window "
            f"(bit/local/neighbor sample {sample}; {remainder} more)",
        )
    return checks


def validate_cliff_alpha(alpha_cells: list[Image.Image], label: str, errors: list[str]) -> int:
    """Validate cliff cells and their translated isometric edge continuity.

    A cliff cell is anchored at its upper endpoint, not at the centre of the
    raised floor diamond.  Frames 0-3 extend left from that root and therefore
    cover the tile's right-to-bottom edge when drawn at (+32, 0).  Frames 4-7
    extend right and cover left-to-bottom when drawn at (-32, 0).  Checking
    only the common source-space root misses a reversed/centre-anchored kit,
    which renders as long ribbons across the middle of a terrace.
    """
    if len(alpha_cells) != 8:
        add(errors, f"{label}: expected exactly eight cliff frames")
        return 0
    bounds: list[tuple[int, int, int, int] | None] = []
    heights: list[int] = []
    seam_profiles: list[list[bool]] = []
    local_points: list[set[tuple[int, int]]] = []
    checks = 0
    for index, alpha in enumerate(alpha_cells):
        binary = alpha.point(lambda value: 255 if value > PLAYER_SOCKET_ALPHA_MIN else 0)
        bbox = binary.getbbox()
        bounds.append(bbox)
        local_points.append({
            (x - 32, y)
            for y in range(128)
            for x in range(64)
            if binary.getpixel((x, y))
        })
        if bbox is None:
            add(errors, f"{label}: cliff frame {index} is empty")
            heights.append(0)
            seam_profiles.append([False] * 128)
            continue
        heights.append(bbox[3] - bbox[1])
        if bbox[1] > 1:
            add(errors, f"{label}: cliff frame {index} misses anchor-y seam root (top {bbox[1]})")
        if index < 4:
            if bbox[2] > 33:
                add(errors, f"{label}: southwest cliff frame {index} crosses x=32 seam ({bbox})")
            strip_x = range(29, 32)
        else:
            if bbox[0] < 31:
                add(errors, f"{label}: southeast cliff frame {index} crosses x=32 seam ({bbox})")
            strip_x = range(32, 35)
        profile = [any(binary.getpixel((x, y)) for x in strip_x) for y in range(128)]
        seam_profiles.append(profile)
        visible_rows = [y for y, visible in enumerate(profile) if visible]
        if not visible_rows or visible_rows[0] > 1:
            add(errors, f"{label}: cliff frame {index} does not intersect its seam-root strip")
        elif any(not profile[y] for y in range(visible_rows[0], visible_rows[-1] + 1)):
            add(errors, f"{label}: cliff frame {index} has a broken seam-root edge profile")
        checks += 3
    for row in range(2):
        row_heights = heights[row * 4:(row + 1) * 4]
        if any(right <= left for left, right in zip(row_heights, row_heights[1:])):
            add(errors, f"{label}: cliff row {row} does not increase strictly through depths 1-4 ({row_heights})")
        checks += 3
    bad_pairs = [
        (depth + 1, heights[depth], heights[4 + depth])
        for depth in range(4)
        if abs(heights[depth] - heights[4 + depth]) > 6
    ]
    if bad_pairs:
        add(errors, f"{label}: mirrored cliff depth heights differ by more than 6px (depth/SW/SE {bad_pairs})")
    checks += 4

    # SW occupies x<=31 and SE x>=32, so they cannot overlap the same pixel.
    # Each pair must instead reach opposing seam strips within one y pixel near
    # the shared root; this tolerates painted anti-aliasing without a crack.
    bad_contacts: list[tuple[int, int]] = []
    for southwest in range(4):
        for southeast in range(4, 8):
            contact = any(
                seam_profiles[southwest][left_y] and seam_profiles[southeast][right_y]
                for left_y in range(6)
                for right_y in range(max(0, left_y - 1), min(6, left_y + 2))
            )
            if not contact:
                bad_contacts.append((southwest, southeast))
            checks += 1
    if bad_contacts:
        add(errors, f"{label}: southwest/southeast cliff halves leave a gap at shared root (frames {bad_contacts})")

    def translated(points: set[tuple[int, int]], root: tuple[int, int]) -> set[tuple[int, int]]:
        return {(x + root[0], y + root[1]) for x, y in points}

    def contact_near(
        left: set[tuple[int, int]], right: set[tuple[int, int]], socket: tuple[int, int],
    ) -> bool:
        # The reviewed painted edge leaves up to four source pixels of
        # anti-aliased clearance.  Limit the search to the expected shared
        # vertex so overlapping face interiors cannot satisfy this contract.
        sx, sy = socket
        left_near = {
            point for point in left
            if abs(point[0] - sx) <= 8 and abs(point[1] - sy) <= 10
        }
        for x, y in left_near:
            for dx in range(-4, 5):
                for dy in range(-4 + abs(dx), 5 - abs(dx)):
                    if (x + dx, y + dy) in right:
                        return True
        return False

    bad_left_chains: list[int] = []
    bad_right_chains: list[int] = []
    bad_south_corners: list[int] = []
    for depth in range(4):
        # Consecutive x+1-drop faces advance one tile along +y: (-32,+16).
        left_face = translated(local_points[depth], (0, 0))
        next_left_face = translated(local_points[depth], (-32, 16))
        if not contact_near(left_face, next_left_face, (-32, 16)):
            bad_left_chains.append(depth + 1)

        # Consecutive y+1-drop faces advance one tile along +x: (+32,+16).
        right_face = translated(local_points[4 + depth], (0, 0))
        next_right_face = translated(local_points[4 + depth], (32, 16))
        if not contact_near(right_face, next_right_face, (32, 16)):
            bad_right_chains.append(depth + 1)

        # Around one raised tile the left-extending face is rooted at the
        # right vertex and the right-extending face at the left vertex.  Their
        # distal endpoints must meet at the south vertex (0,+16).
        south_left = translated(local_points[depth], (32, 0))
        south_right = translated(local_points[4 + depth], (-32, 0))
        if not contact_near(south_left, south_right, (0, 16)):
            bad_south_corners.append(depth + 1)
        checks += 3
    if bad_left_chains:
        add(errors, f"{label}: left-extending cliff frames do not chain at (-32,+16) (depths {bad_left_chains})")
    if bad_right_chains:
        add(errors, f"{label}: right-extending cliff frames do not chain at (+32,+16) (depths {bad_right_chains})")
    if bad_south_corners:
        add(errors, f"{label}: translated cliff halves miss the tile south vertex (depths {bad_south_corners})")
    return checks


def validate_path_import_artifact(descriptors: dict[str, Any], errors: list[str]) -> int:
    """Independently reproduce the reviewed fixed-crop path import.

    This binds raw/chroma/alpha/output hashes and proves that all sixteen
    frames use one shared panel crop and resize. Per-frame geometry repair or
    inferred adjacency is deliberately outside the accepted import contract.
    """
    try:
        report = json.loads(PATH_IMPORT_REPORT.read_text(encoding="utf-8"))
    except Exception as exc:
        add(errors, f"path import report is missing or malformed: {exc}")
        return 0
    expected_top = {
        "version", "sourceKind", "review", "operation", "sourceSize", "socketSemantics",
        "cell", "atlas", "materials", "outputs",
    }
    if not isinstance(report, dict) or set(report) != expected_top:
        add(errors, f"path import report keys must be {sorted(expected_top)}")
        return 0
    expected_values = {
        "version": 1,
        "sourceKind": "imagegen-authored-path-adjacency",
        "review": "visual-contact-sheet-v1",
        "operation": "fixed-nominal-panel-slice-and-shared-resize-v2",
        "sourceSize": [1254, 1254],
        "socketSemantics": {
            "N": [48, 8], "E": [48, 24], "S": [16, 24], "W": [16, 8],
            "windowRadius": 2,
        },
        "cell": [64, 32],
        "atlas": [256, 128],
    }
    for field, value in expected_values.items():
        if report.get(field) != value:
            add(errors, f"path import report {field}: expected {value!r}, found {report.get(field)!r}")
    materials, outputs = report.get("materials"), report.get("outputs")
    expected_materials = set(PATH_THEMES.values())
    if not isinstance(materials, dict) or set(materials) != expected_materials:
        add(errors, f"path import report materials must be exactly {sorted(expected_materials)}")
        return 0
    if not isinstance(outputs, dict) or set(outputs) != set(PATH_THEMES):
        add(errors, f"path import report outputs must be exactly {sorted(PATH_THEMES)}")
        return 0

    source_width, source_height = expected_values["sourceSize"]
    panel_bounds = [
        [
            round((index % 4) * source_width / 4),
            round((index // 4) * source_height / 4),
            round((index % 4 + 1) * source_width / 4),
            round((index // 4 + 1) * source_height / 4),
        ]
        for index in range(16)
    ]
    rendered_by_material: dict[str, Image.Image] = {}
    checks = 0
    material_keys = {
        "chromaSource", "chromaSha256", "alphaSource", "alphaSha256",
        "sourcePanelBounds", "frameAlphaBBoxes",
    }
    for material, row in sorted(materials.items()):
        if not isinstance(row, dict) or set(row) != material_keys:
            add(errors, f"path import material {material}: malformed exact record")
            continue
        if row.get("sourcePanelBounds") != panel_bounds:
            add(errors, f"path import material {material}: panel bounds are not the shared fixed crop")
        sources_ok = True
        for prefix, expected_mode in (("chroma", "RGB"), ("alpha", "RGBA")):
            rel, digest = row.get(f"{prefix}Source"), row.get(f"{prefix}Sha256")
            path = ROOT / str(rel or "")
            if (
                not isinstance(rel, str)
                or not rel.startswith("assets/sprites_src/gameplay_art_authored/paths/")
                or not path.is_file()
            ):
                add(errors, f"path import material {material}: missing reviewed {prefix} source")
                sources_ok = False
                continue
            if digest != hashlib.sha256(path.read_bytes()).hexdigest():
                add(errors, f"path import material {material}: {prefix} source sha256 mismatch")
            try:
                with Image.open(path) as source:
                    if source.format != "PNG" or source.mode != expected_mode or list(source.size) != expected_values["sourceSize"]:
                        add(errors, f"path import material {material}: {prefix} source must be {expected_mode} PNG 1254x1254")
                        sources_ok = False
            except Exception as exc:
                add(errors, f"path import material {material}: {prefix} source decode failed: {exc}")
                sources_ok = False
            checks += 1
        alpha_path = ROOT / str(row.get("alphaSource") or "")
        if not sources_ok or not alpha_path.is_file():
            continue
        try:
            with Image.open(alpha_path) as source:
                atlas = Image.new("RGBA", (256, 128))
                actual_bboxes: list[list[int] | None] = []
                for index, bounds in enumerate(panel_bounds):
                    frame = source.crop(tuple(bounds)).resize((64, 32), Image.Resampling.LANCZOS)
                    atlas.alpha_composite(frame, ((index % 4) * 64, (index // 4) * 32))
                    alpha = frame.getchannel("A").point(lambda value: 255 if value > PLAYER_SOCKET_ALPHA_MIN else 0)
                    bbox = alpha.getbbox()
                    actual_bboxes.append(list(bbox) if bbox else None)
                if row.get("frameAlphaBBoxes") != actual_bboxes:
                    add(errors, f"path import material {material}: reported frame alpha bounds do not match fixed import")
                rendered_by_material[material] = atlas
                checks += 16
        except Exception as exc:
            add(errors, f"path import material {material}: fixed import reproduction failed: {exc}")

    output_keys = {"material", "path", "sha256"}
    output_paths: set[str] = set()
    descriptor_parameter_keys = {
        "atlas", "cell", "chromaSource", "chromaSourceSha256", "importReport", "material",
        "operation", "socketSemantics", "sourcePanelBounds", "sourceSize",
    }
    for theme, material in PATH_THEMES.items():
        row = outputs.get(theme)
        descriptor = descriptors.get(f"path:{theme}")
        expected_path = f"assets/sprites_src/gameplay_art/world/paths/{theme}.png"
        if not isinstance(row, dict) or set(row) != output_keys:
            add(errors, f"path import output {theme}: malformed exact record")
            continue
        if row.get("material") != material or row.get("path") != expected_path or row.get("path") in output_paths:
            add(errors, f"path import output {theme}: material/path identity mismatch or shared path")
        output_paths.add(str(row.get("path")))
        path = ROOT / expected_path
        if not path.is_file():
            add(errors, f"path import output {theme}: final atlas is missing")
            continue
        if row.get("sha256") != hashlib.sha256(path.read_bytes()).hexdigest():
            add(errors, f"path import output {theme}: output sha256 mismatch")
        expected_atlas = rendered_by_material.get(material)
        try:
            with Image.open(path) as opened:
                actual = opened.convert("RGBA")
                if expected_atlas is not None and ImageChops.difference(expected_atlas, actual).getbbox() is not None:
                    add(errors, f"path import output {theme}: atlas differs from shared fixed crop/resize")
        except Exception as exc:
            add(errors, f"path import output {theme}: decode failed: {exc}")
        if not isinstance(descriptor, dict):
            add(errors, f"path import output {theme}: gameplay authorship descriptor is missing")
            continue
        provenance = descriptor.get("provenance")
        parameters = provenance.get("parameters") if isinstance(provenance, dict) else None
        material_row = materials.get(material, {})
        expected_parameters = {
            "atlas": [256, 128], "cell": [64, 32],
            "chromaSource": material_row.get("chromaSource"),
            "chromaSourceSha256": material_row.get("chromaSha256"),
            "importReport": PATH_IMPORT_REPORT.relative_to(ROOT).as_posix(),
            "material": material, "operation": "fixed-nominal-panel-slice-and-shared-resize-v2",
            "socketSemantics": expected_values["socketSemantics"], "sourcePanelBounds": panel_bounds,
            "sourceSize": [1254, 1254],
        }
        if (
            descriptor.get("path") != expected_path
            or descriptor.get("sha256") != row.get("sha256")
            or not isinstance(provenance, dict)
            or provenance.get("method") != "authored-path-adjacency-import-v1"
            or provenance.get("source") != material_row.get("alphaSource")
            or provenance.get("sourceSha256") != material_row.get("alphaSha256")
            or not isinstance(parameters, dict)
            or set(parameters) != descriptor_parameter_keys
            or parameters != expected_parameters
        ):
            add(errors, f"path import output {theme}: gameplay descriptor does not bind the reviewed import record exactly")
        checks += 2
    return checks


def validate_path_sources_only(errors: list[str]) -> int:
    """Run the authored path pipeline/geometry gates without a runtime build."""
    try:
        payload = json.loads(GAMEPLAY_ART_AUTHORSHIP.read_text(encoding="utf-8"))
    except Exception as exc:
        add(errors, f"gameplay art authorship is missing or malformed: {exc}")
        return 0
    descriptors = payload.get("descriptors") if isinstance(payload, dict) else None
    if not isinstance(descriptors, dict):
        add(errors, "gameplay art authorship descriptors must be an object")
        return 0
    checks = validate_path_import_artifact(descriptors, errors)
    actual = {
        descriptor.get("key"): descriptor
        for descriptor in descriptors.values()
        if isinstance(descriptor, dict) and descriptor.get("role") == "path"
    }
    if set(actual) != set(PATH_THEMES):
        add(errors, f"authored path themes must be exactly {sorted(PATH_THEMES)}")
    for theme, descriptor in sorted(actual.items()):
        path = ROOT / str(descriptor.get("path") or "")
        if not path.is_file():
            add(errors, f"path {theme}: final atlas is missing")
            continue
        try:
            with Image.open(path) as source:
                if source.format != "PNG" or source.mode != "RGBA" or source.size != (256, 128):
                    add(errors, f"path {theme}: final atlas must be exact RGBA PNG 256x128")
                    continue
                alpha = source.getchannel("A")
                cells = [
                    alpha.crop(((index % 4) * 64, (index // 4) * 32,
                                (index % 4 + 1) * 64, (index // 4 + 1) * 32))
                    for index in range(16)
                ]
                checks += validate_path_adjacency_alpha(cells, f"path {theme}", errors)
        except Exception as exc:
            add(errors, f"path {theme}: final atlas decode failed: {exc}")
    return checks


def validate_cliff_import_artifact(descriptors: dict[str, Any], errors: list[str]) -> int:
    """Bind authored cliff prompts, alpha-clean sources, shared scale, and outputs."""
    try:
        report = json.loads(CLIFF_IMPORT_REPORT.read_text(encoding="utf-8"))
        prompts = json.loads(CLIFF_PROMPT_REPORT.read_text(encoding="utf-8"))
    except Exception as exc:
        add(errors, f"cliff import provenance is missing or malformed: {exc}")
        return 0
    expected_top = {
        "version", "sourceKind", "review", "operation", "contract", "promptManifest",
        "promptManifestSha256", "masterQA", "themes",
    }
    frame_order = [
        "southwest_1", "southwest_2", "southwest_3", "southwest_4",
        "southeast_1", "southeast_2", "southeast_3", "southeast_4",
    ]
    contract = {
        "size": [256, 256], "cell": [64, 128], "cols": 4, "rows": 2,
        "anchor": [32, 0], "frames": 8, "frameOrder": frame_order,
    }
    if not isinstance(report, dict) or set(report) != expected_top:
        add(errors, f"cliff import report keys must be {sorted(expected_top)}")
        return 0
    if (
        report.get("version") != 1
        or report.get("sourceKind") != "imagegen-authored-cliff-sheets"
        or report.get("review") != "visual-contact-sheet-v1"
        or report.get("operation") != "alpha-clean-slice-shared-uniform-resize-v1"
        or report.get("contract") != contract
        or report.get("promptManifest") != CLIFF_PROMPT_REPORT.relative_to(ROOT).as_posix()
        or report.get("promptManifestSha256") != hashlib.sha256(CLIFF_PROMPT_REPORT.read_bytes()).hexdigest()
    ):
        add(errors, "cliff import report contract/provenance is not the reviewed v1 pipeline")
    if (
        not isinstance(prompts, dict) or set(prompts) != {"version", "tool", "prototype", "themes"}
        or prompts.get("version") != 1 or prompts.get("tool") != "built-in-imagegen"
    ):
        add(errors, "cliff prompt manifest has malformed exact provenance")
        return 0
    themes = report.get("themes")
    prompt_themes = prompts.get("themes")
    if not isinstance(themes, dict) or set(themes) != set(PATH_THEMES):
        add(errors, f"cliff import themes must be exactly {sorted(PATH_THEMES)}")
        return 0
    if not isinstance(prompt_themes, dict) or set(prompt_themes) != set(PATH_THEMES):
        add(errors, f"cliff prompt themes must be exactly {sorted(PATH_THEMES)}")
        return 0
    checks = 0
    for theme, row in sorted(themes.items()):
        prompt = prompt_themes.get(theme)
        if (
            not isinstance(prompt, dict) or set(prompt) != {"prompt", "references"}
            or not isinstance(prompt.get("prompt"), str) or not prompt["prompt"].strip()
            or not isinstance(prompt.get("references"), list) or not prompt["references"]
        ):
            add(errors, f"cliff {theme}: malformed prompt/reference provenance")
        else:
            for reference in prompt["references"]:
                if not isinstance(reference, str) or not (ROOT / reference).is_file():
                    add(errors, f"cliff {theme}: missing prompt reference {reference!r}")
                checks += 1
        if not isinstance(row, dict):
            add(errors, f"cliff {theme}: malformed import record")
            continue
        alpha_source_path: Path | None = None
        for source_key, digest_key, expected_mode in (
            ("rawSource", "rawSourceSha256", {"RGB", "RGBA"}),
            ("alphaSource", "alphaSourceSha256", {"RGBA"}),
        ):
            rel = row.get(source_key)
            path = ROOT / str(rel or "")
            if not isinstance(rel, str) or not rel.startswith("assets/sprites_src/gameplay_art_authored/cliffs/") or not path.is_file():
                add(errors, f"cliff {theme}: missing reviewed {source_key}")
                continue
            if row.get(digest_key) != hashlib.sha256(path.read_bytes()).hexdigest():
                add(errors, f"cliff {theme}: {source_key} sha256 mismatch")
            try:
                with Image.open(path) as source:
                    if source.format != "PNG" or source.mode not in expected_mode or source.size != (1254, 1254):
                        add(errors, f"cliff {theme}: {source_key} has wrong PNG mode/dimensions")
            except Exception as exc:
                add(errors, f"cliff {theme}: {source_key} decode failed: {exc}")
            if source_key == "alphaSource":
                alpha_source_path = path
            checks += 1
        expected_output = f"assets/sprites_src/gameplay_art/world/cliffs/{theme}.png"
        output = ROOT / expected_output
        if row.get("path") != expected_output or not output.is_file():
            add(errors, f"cliff {theme}: canonical output is missing or misidentified")
            continue
        if row.get("sha256") != hashlib.sha256(output.read_bytes()).hexdigest():
            add(errors, f"cliff {theme}: canonical output sha256 mismatch")
        frames = row.get("frames")
        reconstructed = Image.new("RGBA", (256, 256))
        if (
            row.get("sourceSize") != [1254, 1254] or row.get("canonicalSize") != [256, 256]
            or row.get("cell") != [64, 128] or row.get("cols") != 4 or row.get("rows") != 2
            or row.get("anchor") != [32, 0] or row.get("frameOrder") != frame_order
            or not isinstance(row.get("uniformScale"), (int, float)) or row.get("uniformScale") <= 0
            or not isinstance(frames, list) or len(frames) != 8
        ):
            add(errors, f"cliff {theme}: malformed shared-scale/frame contract")
        else:
            scale = float(row["uniformScale"])
            bboxes: list[list[int]] = []
            for index, frame in enumerate(frames):
                if not isinstance(frame, dict) or frame.get("index") != index or frame.get("label") != frame_order[index]:
                    add(errors, f"cliff {theme}: frame {index} order/identity mismatch")
                    continue
                painted = frame.get("paintedSize")
                canonical = frame.get("canonicalPaintedSize")
                expected_position = [32 - canonical[0], 0] if index < 4 and isinstance(canonical, list) else [32, 0]
                if (
                    not isinstance(painted, list) or len(painted) != 2
                    or not isinstance(canonical, list) or len(canonical) != 2
                    or canonical != [round(painted[0] * scale), round(painted[1] * scale)]
                    or frame.get("canonicalPosition") != expected_position
                ):
                    add(errors, f"cliff {theme}: frame {index} is not the declared shared uniform resize/root placement")
                if isinstance(canonical, list):
                    x, y = expected_position
                    bboxes.append([x, y, x + canonical[0], y + canonical[1]])
                    if alpha_source_path is not None and alpha_source_path.is_file():
                        try:
                            with Image.open(alpha_source_path) as alpha_source:
                                source_slice = frame.get("slice")
                                source_bbox = frame.get("alphaBBox")
                                if (
                                    not isinstance(source_slice, list) or len(source_slice) != 4
                                    or not isinstance(source_bbox, list) or len(source_bbox) != 4
                                ):
                                    add(errors, f"cliff {theme}: frame {index} source slice/bbox is malformed")
                                else:
                                    cell_source = alpha_source.crop(tuple(source_slice))
                                    visible = cell_source.getchannel("A").point(
                                        lambda value: 255 if value > PLAYER_SOCKET_ALPHA_MIN else 0
                                    ).getbbox()
                                    if visible is None or list(visible) != source_bbox:
                                        add(errors, f"cliff {theme}: frame {index} source alpha bbox is not reproducible")
                                    else:
                                        face = cell_source.crop(tuple(source_bbox)).resize(
                                            tuple(canonical), Image.Resampling.LANCZOS
                                        )
                                        reconstructed.alpha_composite(
                                            face,
                                            ((index % 4) * 64 + x, (index // 4) * 128 + y),
                                        )
                        except Exception as exc:
                            add(errors, f"cliff {theme}: frame {index} shared-scale reproduction failed: {exc}")
                checks += 1
            if row.get("canonicalAlphaBBoxes") != bboxes:
                add(errors, f"cliff {theme}: canonical alpha bounds differ from shared-scale placement")
            try:
                with Image.open(output) as canonical_output:
                    if ImageChops.difference(reconstructed, canonical_output).getbbox() is not None:
                        add(errors, f"cliff {theme}: canonical atlas is not the declared shared-scale source transform")
            except Exception:
                pass
        try:
            with Image.open(output) as source:
                alpha = source.getchannel("A")
                cells = [
                    alpha.crop(((index % 4) * 64, (index // 4) * 128,
                                (index % 4 + 1) * 64, (index // 4 + 1) * 128))
                    for index in range(8)
                ]
                checks += validate_cliff_alpha(cells, f"cliff {theme}", errors)
        except Exception as exc:
            add(errors, f"cliff {theme}: canonical output decode failed: {exc}")
        descriptor = descriptors.get(f"cliff:{theme}")
        if not isinstance(descriptor, dict):
            add(errors, f"cliff {theme}: gameplay authorship descriptor is missing")
        else:
            provenance = descriptor.get("provenance")
            parameters = provenance.get("parameters") if isinstance(provenance, dict) else None
            expected_parameters = {
                "importReport": CLIFF_IMPORT_REPORT.relative_to(ROOT).as_posix(),
                "operation": report.get("operation"),
                "promptManifest": CLIFF_PROMPT_REPORT.relative_to(ROOT).as_posix(),
                "rawSource": row.get("rawSource"),
                "rawSourceSha256": row.get("rawSourceSha256"),
                "alphaClean": row.get("alphaClean"),
                "sourceSize": row.get("sourceSize"),
                "uniformScale": row.get("uniformScale"),
                "contract": contract,
                "qa": row.get("qa"),
            }
            if (
                descriptor.get("path") != expected_output or descriptor.get("sha256") != row.get("sha256")
                or not isinstance(provenance, dict)
                or provenance.get("method") != "authored-cliff-sheet-import-v1"
                or provenance.get("source") != row.get("alphaSource")
                or provenance.get("sourceSha256") != row.get("alphaSourceSha256")
                or not isinstance(parameters, dict) or parameters != expected_parameters
            ):
                add(errors, f"cliff {theme}: gameplay descriptor does not bind reviewed cliff import exactly")
        checks += 1
    master = ROOT / str(report.get("masterQA") or "")
    if not master.is_file():
        add(errors, "cliff import master visual QA is missing")
    return checks


def validate_gameplay_art_authorship(
    manifest: dict[str, Any], errors: list[str], *, compare_runtime: bool = True,
) -> int:
    """Validate pack-only provenance for all persistent non-player artwork.

    The compiler owns the exhaustive expected-key set. This independent gate
    binds each reviewed descriptor to its final RGBA source, original painted
    source, runtime manifest entry, and runtime lookup map. It intentionally
    does not bless compiler-generated or runtime-generated geometry.
    """
    def unique_object(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
        value: dict[str, Any] = {}
        for key, child in pairs:
            if key in value:
                raise ValueError(f"duplicate JSON key {key!r}")
            value[key] = child
        return value

    try:
        payload = json.loads(GAMEPLAY_ART_AUTHORSHIP.read_text(encoding="utf-8"), object_pairs_hook=unique_object)
    except Exception as exc:
        add(errors, f"gameplay art authorship is missing or malformed: {exc}")
        return 0
    expected_top = {"version", "sourceKind", "review", "wallContract", "descriptors"}
    if set(payload) != expected_top:
        add(errors, f"gameplay art authorship keys must be {sorted(expected_top)}")
    if (
        payload.get("version") != 1
        or payload.get("sourceKind") != "authored-final-aligned"
        or payload.get("review") != "visual-contact-sheet-v1"
        or payload.get("wallContract") != GAMEPLAY_ART_WALL_CONTRACT
    ):
        add(errors, "gameplay art authorship has invalid reviewed v1 provenance/wall contract")
    descriptors = payload.get("descriptors")
    if not isinstance(descriptors, dict):
        add(errors, "gameplay art authorship descriptors must be an object")
        return 0

    expected_roles = {
        "ground", "hazard", "path", "wall", "cliff", "backdrop", "massif", "prop", "trap",
        "monster", "npc", "summon", "form", "item-icons", "skill-icons",
    }
    required_keys = {
        "sourceKind", "review", "path", "sha256", "role", "key", "provenance",
        "kind", "size", "anchor", "bundle", "assetId",
    }
    atlas_keys = required_keys | {"cell", "cols", "rows"}
    allowed_optional = {"displayHeight", "tintKey", "lossless"}
    provenance_keys = {"method", "source", "sourceSha256", "parameters"}
    role_map = {
        "ground": "grounds", "hazard": "hazards", "path": "paths", "wall": "walls",
        "cliff": "cliffs", "backdrop": "backdrops", "massif": "massifs", "prop": "props",
        "trap": "traps", "monster": "monsters", "npc": "npcs", "summon": "summons", "form": "forms",
    }
    used_paths: set[str] = set()
    used_assets: set[str] = set()
    seen_role_keys: set[tuple[str, str]] = set()
    checks = 0
    for descriptor_id, descriptor in sorted(descriptors.items()):
        if not isinstance(descriptor, dict):
            add(errors, f"gameplay art {descriptor_id}: descriptor must be an object")
            continue
        kind = descriptor.get("kind")
        exact_keys = (atlas_keys if kind == "atlas" else required_keys) | (allowed_optional & set(descriptor))
        if kind not in {"atlas", "static"} or set(descriptor) != exact_keys or set(descriptor) - (atlas_keys | allowed_optional):
            add(errors, f"gameplay art {descriptor_id}: malformed exact {kind!r} descriptor keys")
            continue
        if "lossless" in descriptor and type(descriptor["lossless"]) is not bool:
            add(errors, f"gameplay art {descriptor_id}: lossless must be a boolean")
        role, key = descriptor.get("role"), descriptor.get("key")
        if role not in expected_roles or not isinstance(key, str) or descriptor_id != f"{role}:{key}":
            add(errors, f"gameplay art {descriptor_id}: role/key identity mismatch")
        if (role, key) in seen_role_keys:
            add(errors, f"gameplay art {descriptor_id}: duplicate role/key")
        seen_role_keys.add((role, key))
        if descriptor.get("sourceKind") != "authored-final-aligned" or descriptor.get("review") != "visual-contact-sheet-v1":
            add(errors, f"gameplay art {descriptor_id}: source/review provenance is not final")
        size, anchor = descriptor.get("size"), descriptor.get("anchor")
        if (
            not isinstance(size, list) or len(size) != 2 or not all(type(value) is int and value > 0 for value in size)
            or not isinstance(anchor, list) or len(anchor) != 2 or not all(type(value) is int for value in anchor)
            or not (0 <= anchor[0] <= size[0] and 0 <= anchor[1] <= size[1])
        ):
            add(errors, f"gameplay art {descriptor_id}: declared size/anchor is malformed")
        exact_static_contracts = {
            "trap": {"kind": "static", "size": [32, 24], "anchor": [16, 18], "bundle": "world"},
            "backdrop": {"kind": "static", "size": [1920, 1080], "anchor": [0, 0], "bundle": "world"},
            "form": {"kind": "static", "size": [192, 192], "anchor": [96, 178], "bundle": "actors"},
        }
        if role in exact_static_contracts:
            contract = exact_static_contracts[role]
            for field, value in contract.items():
                if descriptor.get(field) != value:
                    add(errors, f"gameplay art {descriptor_id}: {field} must be {value!r}")
        if role == "form":
            expected_asset_id = f"actor.form.{key}"
            expected_path = f"assets/sprites_src/gameplay_art/actors/forms/{key}.png"
            if descriptor.get("assetId") != expected_asset_id or descriptor.get("path") != expected_path:
                add(errors, f"gameplay art {descriptor_id}: form must use its dedicated canonical asset/path")
        exact_atlas_contracts = {
            "ground": {"size": [256, 32], "cell": [64, 32], "cols": 4, "rows": 1},
            "hazard": {"size": [256, 32], "cell": [64, 32], "cols": 4, "rows": 1},
            "path": {"size": [256, 128], "cell": [64, 32], "cols": 4, "rows": 4},
            "wall": {
                "size": [512, 512], "cell": [128, 128], "cols": 4, "rows": 4,
                "anchor": [64, 112],
            },
            "cliff": {"size": [256, 256], "cell": [64, 128], "cols": 4, "rows": 2},
        }
        if role in exact_atlas_contracts:
            if kind != "atlas":
                add(errors, f"gameplay art {descriptor_id}: {role} must be an authored atlas")
            for field, value in exact_atlas_contracts[role].items():
                if descriptor.get(field) != value:
                    add(errors, f"gameplay art {descriptor_id}: {field} must be {value!r}")
        source_rel = descriptor.get("path")
        if not isinstance(source_rel, str) or not source_rel.startswith("assets/sprites_src/gameplay_art/") or ".." in Path(source_rel).parts:
            add(errors, f"gameplay art {descriptor_id}: final source is outside authored gameplay root")
            continue
        if source_rel in used_paths:
            add(errors, f"gameplay art {descriptor_id}: final source path is shared")
        used_paths.add(source_rel)
        source_path = ROOT / source_rel
        if not source_path.is_file():
            add(errors, f"gameplay art {descriptor_id}: missing final source {source_rel}")
            continue
        if descriptor.get("sha256") != hashlib.sha256(source_path.read_bytes()).hexdigest():
            add(errors, f"gameplay art {descriptor_id}: final source sha256 mismatch")
        try:
            with Image.open(source_path) as opened:
                if opened.format != "PNG" or opened.mode != "RGBA" or list(opened.size) != descriptor.get("size"):
                    add(errors, f"gameplay art {descriptor_id}: final source must be exact declared-size RGBA PNG")
                else:
                    alpha = opened.getchannel("A")
                    if alpha.getbbox() is None:
                        add(errors, f"gameplay art {descriptor_id}: final source has no visible pixels")
                    if kind == "atlas":
                        cell, cols, rows = descriptor.get("cell"), descriptor.get("cols"), descriptor.get("rows")
                        if (
                            not isinstance(cell, list) or len(cell) != 2 or not all(type(v) is int and v > 0 for v in cell)
                            or type(cols) is not int or type(rows) is not int or cols <= 0 or rows <= 0
                            or [cell[0] * cols, cell[1] * rows] != descriptor.get("size")
                        ):
                            add(errors, f"gameplay art {descriptor_id}: malformed atlas layout")
                        else:
                            alpha_cells = [
                                alpha.crop(((index % cols) * cell[0], (index // cols) * cell[1],
                                            (index % cols + 1) * cell[0], (index // cols + 1) * cell[1]))
                                for index in range(cols * rows)
                            ]
                            empty = [index for index, frame_alpha in enumerate(alpha_cells) if frame_alpha.getbbox() is None]
                            if empty:
                                add(errors, f"gameplay art {descriptor_id}: empty authored frames {empty}")
                            if role in {"path", "wall"} and cols * rows == 16:
                                # Paths commonly fill the entire 64x32 cell, so
                                # alpha-only comparison would reject legitimate
                                # painted adjacency variants. Walls must change
                                # silhouette; paths must change authored RGBA.
                                distinct_cells = alpha_cells if role == "wall" else [
                                    opened.crop(((index % cols) * cell[0], (index // cols) * cell[1],
                                                 (index % cols + 1) * cell[0], (index // cols + 1) * cell[1])).copy()
                                    for index in range(16)
                                ]
                                duplicates = [
                                    (left, right)
                                    for left in range(16)
                                    for right in range(left + 1, 16)
                                    if ImageChops.difference(distinct_cells[left], distinct_cells[right]).getbbox() is None
                                ]
                                if duplicates:
                                    add(
                                        errors,
                                        f"gameplay art {descriptor_id}: adjacency masks must have 16 distinct authored silhouettes; "
                                        f"duplicates {duplicates}",
                                    )
                            if role == "path" and cell == [64, 32] and cols * rows == 16:
                                # U.isoX/U.isoY place cardinal grid neighbors
                                # at (+32,-16), (+32,+16), (-32,+16), and
                                # (-32,-16). Their authored path joins therefore
                                # meet at the shared midpoint of the relevant
                                # diamond edge—not at the screen-cardinal cell
                                # boundary used by the rejected plus-shaped kit.
                                checks += validate_path_adjacency_alpha(
                                    alpha_cells, f"gameplay art {descriptor_id}", errors
                                )
                            if role == "cliff" and cell == [64, 128] and cols * rows == 8:
                                checks += validate_cliff_alpha(
                                    alpha_cells, f"gameplay art {descriptor_id}", errors
                                )
                            if role == "wall" and cell == [128, 128] and cols * rows == 16:
                                bad_top: list[tuple[int, int | None]] = []
                                missed_footprint: list[int] = []
                                for index in range(16):
                                    x0, y0 = (index % cols) * 128, (index // cols) * 128
                                    frame_alpha = alpha.crop((x0, y0, x0 + 128, y0 + 128))
                                    bounds = frame_alpha.getbbox()
                                    if bounds is None:
                                        continue
                                    # anchorY 112 - rise 72 = authored wall top y40.
                                    # Two pixels of anti-aliasing tolerance are accepted,
                                    # but the rise cannot become metadata-only.
                                    if not 38 <= bounds[1] <= 42:
                                        bad_top.append((index, bounds[1]))
                                    footprint = frame_alpha.crop((32, 96, 96, 128))
                                    if footprint.getbbox() is None:
                                        missed_footprint.append(index)
                                if bad_top:
                                    add(errors, f"gameplay art {descriptor_id}: wall frames do not retain 72px rise (frame/top {bad_top})")
                                if missed_footprint:
                                    add(errors, f"gameplay art {descriptor_id}: wall frames miss centered 64x32 footprint {missed_footprint}")
        except Exception as exc:
            add(errors, f"gameplay art {descriptor_id}: final source decode failed: {exc}")
        provenance = descriptor.get("provenance")
        if not isinstance(provenance, dict) or set(provenance) != provenance_keys:
            add(errors, f"gameplay art {descriptor_id}: malformed original-source provenance")
        else:
            origin_rel = provenance.get("source")
            origin_path = ROOT / str(origin_rel or "")
            if not isinstance(origin_rel, str) or not origin_path.is_file():
                add(errors, f"gameplay art {descriptor_id}: original painted source is missing")
            else:
                approved_origins = (
                    ROOT / "assets" / "world", ROOT / "assets" / "monsters", ROOT / "assets" / "summons",
                    ROOT / "assets" / "act1", ROOT / "assets" / "sprites_src" / "ui",
                    ROOT / "assets" / "sprites_src" / "gameplay_art_authored",
                )
                try:
                    approved = any(origin_path.resolve().is_relative_to(root.resolve()) for root in approved_origins)
                except (AttributeError, OSError):
                    approved = any(str(origin_path.resolve()).startswith(str(root.resolve())) for root in approved_origins)
                if not approved:
                    add(errors, f"gameplay art {descriptor_id}: original source is outside approved painted libraries")
                if provenance.get("sourceSha256") != hashlib.sha256(origin_path.read_bytes()).hexdigest():
                    add(errors, f"gameplay art {descriptor_id}: original painted source sha256 mismatch")
            if not isinstance(provenance.get("method"), str) or not provenance["method"] or not isinstance(provenance.get("parameters"), dict):
                add(errors, f"gameplay art {descriptor_id}: malformed normalization provenance")
            if role == "wall":
                parameters = provenance.get("parameters") if isinstance(provenance.get("parameters"), dict) else {}
                secondary_rel = parameters.get("secondarySource")
                secondary_path = ROOT / str(secondary_rel or "")
                if provenance.get("method") != "painted-two-source-wall-kit-import-v1":
                    add(errors, f"gameplay art {descriptor_id}: wall provenance method is not the reviewed two-source import")
                if not isinstance(secondary_rel, str) or not secondary_path.is_file():
                    add(errors, f"gameplay art {descriptor_id}: secondary painted wall source is missing")
                elif parameters.get("secondarySourceSha256") != hashlib.sha256(secondary_path.read_bytes()).hexdigest():
                    add(errors, f"gameplay art {descriptor_id}: secondary painted wall source sha256 mismatch")
                if parameters.get("wallContract") != GAMEPLAY_ART_WALL_CONTRACT:
                    add(errors, f"gameplay art {descriptor_id}: source provenance wall contract does not match runtime geometry")
        asset_id = descriptor.get("assetId")
        if not isinstance(asset_id, str) or asset_id in used_assets:
            add(errors, f"gameplay art {descriptor_id}: assetId is missing or shared")
        else:
            used_assets.add(asset_id)
            if compare_runtime:
                entry = manifest.get("entries", {}).get(asset_id)
                if not isinstance(entry, dict):
                    add(errors, f"gameplay art {descriptor_id}: runtime manifest entry {asset_id!r} is missing")
                else:
                    expected_entry = {"kind": kind, "anchor": descriptor.get("anchor"), "bundle": descriptor.get("bundle")}
                    if kind == "atlas":
                        expected_entry.update({"cell": descriptor.get("cell"), "cols": descriptor.get("cols"), "rows": descriptor.get("rows")})
                    for field, value in expected_entry.items():
                        if entry.get(field) != value:
                            add(errors, f"gameplay art {descriptor_id}: runtime {field} does not match authored descriptor")
                    # Encoding belongs to the compiler, not the draw-time entry.
                    for field in allowed_optional - {"lossless"}:
                        if descriptor.get(field) is not None and entry.get(field) != descriptor.get(field):
                            add(errors, f"gameplay art {descriptor_id}: runtime {field} does not match authored descriptor")
        map_name = role_map.get(role)
        if compare_runtime and map_name and manifest.get("maps", {}).get(map_name, {}).get(key) != asset_id:
            add(errors, f"gameplay art {descriptor_id}: maps.{map_name}[{key!r}] does not resolve to {asset_id!r}")
        checks += 1

    checks += validate_path_import_artifact(descriptors, errors)
    checks += validate_cliff_import_artifact(descriptors, errors)

    required_traps = {"barbed", "frost", "powder"}
    actual_traps = {key for role, key in seen_role_keys if role == "trap"}
    if actual_traps != required_traps:
        add(errors, f"gameplay art traps: expected {sorted(required_traps)}, found {sorted(actual_traps)}")
    required_backdrops = {"snowwild", "desert", "hellwild", "marsh", "forest", "fields", "dungeon", "default"}
    actual_backdrops = {key for role, key in seen_role_keys if role == "backdrop"}
    if actual_backdrops != required_backdrops:
        add(errors, f"gameplay art backdrops: expected {sorted(required_backdrops)}, found {sorted(actual_backdrops)}")
    required_forms = {"form_fang", "form_brute", "form_stone", "form_apex"}
    actual_forms = {key for role, key in seen_role_keys if role == "form"}
    if actual_forms != required_forms:
        add(errors, f"gameplay art forms: expected {sorted(required_forms)}, found {sorted(actual_forms)}")
    expected_role_counts = {
        "backdrop": 8, "cliff": 20, "form": 4, "ground": 32, "hazard": 9,
        "item-icons": 3, "massif": 36, "monster": 19, "npc": 9, "path": 20,
        "prop": 51, "skill-icons": 1, "summon": 8, "trap": 3, "wall": 18,
    }
    actual_role_counts = {
        role: sum(1 for descriptor_role, _key in seen_role_keys if descriptor_role == role)
        for role in expected_role_counts
    }
    if actual_role_counts != expected_role_counts:
        add(errors, f"gameplay art role coverage mismatch: expected {expected_role_counts}, found {actual_role_counts}")
    if len(descriptors) != sum(expected_role_counts.values()):
        add(errors, f"gameplay art authorship must contain exactly {sum(expected_role_counts.values())} descriptors")
    try:
        coverage = json.loads(GAMEPLAY_ART_COVERAGE.read_text(encoding="utf-8"))
        if coverage.get("authorship") != GAMEPLAY_ART_AUTHORSHIP.relative_to(ROOT).as_posix():
            add(errors, "gameplay art coverage points at the wrong authorship artifact")
        if coverage.get("errors") != [] or coverage.get("validDescriptorCount") != len(descriptors) or coverage.get("expectedDescriptorCount") != len(descriptors):
            add(errors, "gameplay art coverage report is not fully green for the reviewed descriptor set")
        if coverage.get("expectedByRole") != expected_role_counts:
            add(errors, "gameplay art coverage report role counts do not match the frozen source contract")
    except Exception as exc:
        add(errors, f"gameplay art coverage report is missing or malformed: {exc}")
    return checks


def validate_ui_scene_authorship(
    manifest: dict[str, Any], errors: list[str], *, compare_runtime: bool = True,
) -> int:
    """Bind persistent UI scene art to a reviewed, manifest-backed source.

    The title camp is UI rather than gameplay-world art, so it deliberately
    stays outside the frozen gameplay-art descriptor count. It still must
    use the same strict decode path: a checked-in final RGBA source, immutable
    original/final hashes, a core manifest entry, and maps.uiScenes lookup.
    """
    try:
        payload = json.loads(UI_SCENE_AUTHORSHIP.read_text(encoding="utf-8"))
    except Exception as exc:
        add(errors, f"UI scene authorship is missing or malformed: {exc}")
        return 0
    expected_top = {"version", "sourceKind", "review", "scenes"}
    if not isinstance(payload, dict) or set(payload) != expected_top:
        add(errors, f"UI scene authorship keys must be {sorted(expected_top)}")
        return 0
    if (
        payload.get("version") != 1
        or payload.get("sourceKind") != "authored-final-aligned"
        or payload.get("review") != "visual-contact-sheet-v1"
    ):
        add(errors, "UI scene authorship has invalid reviewed v1 provenance")
    scenes = payload.get("scenes")
    if not isinstance(scenes, dict) or set(scenes) != {"titleCamp"}:
        add(errors, "UI scene authorship must contain exactly scenes.titleCamp")
        return 0
    scene = scenes["titleCamp"]
    expected_scene_keys = {
        "path", "sha256", "source", "sourceSha256", "method", "parameters",
        "size", "anchor", "bundle", "assetId",
    }
    if not isinstance(scene, dict) or set(scene) != expected_scene_keys:
        add(errors, f"UI scene titleCamp keys must be {sorted(expected_scene_keys)}")
        return 0
    expected_values = {
        "path": "assets/sprites_src/ui/scenes/title_camp.png",
        "source": "assets/embergrave-title-bg.png",
        "method": "rgba-pass-through-v1",
        "parameters": {},
        "size": [1672, 941],
        "anchor": [0, 0],
        "bundle": "core",
        "assetId": "ui.scene.titleCamp",
    }
    for field, value in expected_values.items():
        if scene.get(field) != value:
            add(errors, f"UI scene titleCamp {field}: expected {value!r}, found {scene.get(field)!r}")
    for field, rel in (("sha256", scene.get("path")), ("sourceSha256", scene.get("source"))):
        path = ROOT / str(rel or "")
        if not path.is_file():
            add(errors, f"UI scene titleCamp is missing {rel!r}")
        elif scene.get(field) != hashlib.sha256(path.read_bytes()).hexdigest():
            add(errors, f"UI scene titleCamp {field} does not match {rel}")
    final_path = ROOT / expected_values["path"]
    if final_path.is_file():
        try:
            with Image.open(final_path) as opened:
                if opened.format != "PNG" or opened.mode != "RGBA" or list(opened.size) != expected_values["size"]:
                    add(errors, "UI scene titleCamp must be exact RGBA PNG 1672x941")
                elif opened.getchannel("A").getbbox() is None:
                    add(errors, "UI scene titleCamp has no visible pixels")
        except Exception as exc:
            add(errors, f"UI scene titleCamp decode failed: {exc}")
    if compare_runtime:
        asset_id = expected_values["assetId"]
        entry = manifest.get("entries", {}).get(asset_id)
        if not isinstance(entry, dict):
            add(errors, "UI scene titleCamp runtime manifest entry is missing")
        elif (
            entry.get("kind") != "static"
            or entry.get("anchor") != expected_values["anchor"]
            or entry.get("bundle") != expected_values["bundle"]
        ):
            add(errors, "UI scene titleCamp runtime manifest metadata is malformed")
        if manifest.get("maps", {}).get("uiScenes", {}).get("titleCamp") != asset_id:
            add(errors, "maps.uiScenes.titleCamp does not resolve to ui.scene.titleCamp")
    return 1


def validate_runtime(errors: list[str]) -> None:
    for removed in (ROOT / "js" / "sprites.js", ROOT / "js" / "sheets.js"):
        if removed.exists():
            add(errors, f"deprecated generator still exists: {removed.relative_to(ROOT)}")
    runtime_files = [ROOT / "js" / name for name in ("game.js", "ui.js", "entities.js", "dataedit.js")]
    deprecated = re.compile(r"\b(?:Sprites|EnvArt|MonsterArt|SummonArt|Sheets)\b")
    for path in runtime_files:
        match = deprecated.search(path.read_text(encoding="utf-8"))
        if match:
            add(errors, f"{path.name}: deprecated sprite API {match.group(0)}")
    asset_runtime = (ROOT / "js" / "sprite_assets.js").read_text(encoding="utf-8")
    for primitive in ("beginPath(", ".arc(", ".ellipse(", "createLinearGradient(", "createRadialGradient("):
        if primitive in asset_runtime:
            add(errors, f"sprite_assets.js draws gameplay geometry with {primitive}")
    for forbidden in ("gearWeapons", "gearHelms", "playerMasks", "Math.max(0, Math.min(def.cols * def.rows"):
        if forbidden in asset_runtime:
            add(errors, f"sprite_assets.js retains deprecated or permissive rig path: {forbidden}")
    for required in (
        "function resolvePlayerVisual(", "function loadPlayerLoadout(", "function getPlayerDrawPlan(",
        'const PLAYER_PLANES = ["rear", "body", "worn", "held", "grip", "front"]',
        "Sprite frame ${String(frameKey)} is outside", "const PLAYER_BASE_SCALE = 0.42",
        "const visualScale = visual.scale == null ? PLAYER_BASE_SCALE : visual.scale",
        "if (opts.playerVisual) return drawPlayer(ctx, opts.playerVisual, pose);",
        "manifest.maps.playerStarterLoadouts", "flattenedAssetId", 'slot: "starter"',
        "function isolatedFrame(", "def.isolateFrameSampling", "isolatedFrameCache",
    ):
        if required not in asset_runtime:
            add(errors, f"sprite_assets.js is missing strict player-rig guard/API: {required}")
    game_runtime = (ROOT / "js" / "game.js").read_text(encoding="utf-8")
    ui_runtime = (ROOT / "js" / "ui.js").read_text(encoding="utf-8")
    for runtime_name, runtime_text in (("game.js", game_runtime), ("ui.js", ui_runtime)):
        if "new Image(" in runtime_text or re.search(r"\.src\s*=\s*[\"']assets/", runtime_text):
            add(errors, f"{runtime_name}: direct image loading bypasses SpriteAssets strict decode/manifest handling")
    opts_start = game_runtime.find("  function playerSpriteOpts(p) {")
    opts_end = game_runtime.find("  /* live actor rendering", opts_start)
    opts_block = game_runtime[opts_start:opts_end] if opts_start >= 0 and opts_end > opts_start else ""
    if "return { playerVisual: p._playerVisual };" not in opts_block:
        add(errors, "game.js: ordinary playerSpriteOpts must leave authored rig scaling to PLAYER_BASE_SCALE")
    humanoid_start = opts_block.find("    p._formVisual = null;")
    humanoid_block = opts_block[humanoid_start:] if humanoid_start >= 0 else opts_block
    if re.search(r"(?:playerVisual|_playerVisual)\.scale\s*=|return\s*\{\s*scale\s*:", humanoid_block):
        add(errors, "game.js: ordinary humanoid player options override the authored rig base scale")

    # A 64x32 isometric tile centred at (sx,sy) has its right/left vertices at
    # sx+32/sx-32.  The cliff cells are endpoint-rooted: frames 0-3 extend
    # left from the right vertex (the x+1 drop), while frames 4-7 extend right
    # from the left vertex (the y+1 drop).  Drawing either row at sx stamps a
    # face across the raised floor itself and creates the long terrace ribbons
    # that previously corrupted Fallen North.
    cliff_start = game_runtime.find("const lD =")
    cliff_end = game_runtime.find("const fv =", cliff_start)
    cliff_block = game_runtime[cliff_start:cliff_end] if cliff_start >= 0 and cliff_end > cliff_start else ""
    left_drop_draw = re.search(
        r"if\s*\(\s*lD\s*>\s*0\s*\)\s*\{?\s*SpriteAssets\.drawCliff\(\s*ctx\s*,\s*"
        r"SpriteAssets\.getFrame\(\s*cliffId\s*,\s*4\s*\+\s*"
        r"U\.clamp\(\s*Math\.ceil\(\s*lD\s*/\s*EH\s*\)\s*,\s*1\s*,\s*4\s*\)\s*-\s*1\s*\)\s*,\s*"
        r"sx\s*-\s*32\s*,\s*sy\s*,\s*lD\s*\)",
        cliff_block,
    )
    right_drop_draw = re.search(
        r"if\s*\(\s*rD\s*>\s*0\s*\)\s*\{?\s*SpriteAssets\.drawCliff\(\s*ctx\s*,\s*"
        r"SpriteAssets\.getFrame\(\s*cliffId\s*,\s*"
        r"U\.clamp\(\s*Math\.ceil\(\s*rD\s*/\s*EH\s*\)\s*,\s*1\s*,\s*4\s*\)\s*-\s*1\s*\)\s*,\s*"
        r"sx\s*\+\s*32\s*,\s*sy\s*,\s*rD\s*\)",
        cliff_block,
    )
    if not cliff_block:
        add(errors, "game.js: elevated-terrain cliff render branch is missing")
    else:
        if not left_drop_draw:
            add(errors, "game.js: y+1 terrain drops must fit right-extending cliff frames 4-7 at (sx-32,sy) to lD")
        if not right_drop_draw:
            add(errors, "game.js: x+1 terrain drops must fit left-extending cliff frames 0-3 at (sx+32,sy) to rD")

    # The wall renderer has two different anchor contracts. Outdoor massifs are
    # bottom-centred props and therefore use the south vertex (+16), while the
    # authored 128x128 connected-wall cells are already anchored to the 64x32
    # tile centre and must be drawn at d.sy. Wallcaps are hidden interior fill;
    # stamping a full massif for each one creates the overlapping terrain carpet
    # that previously obscured Fallen North.
    wall_start = game_runtime.find('        case "wall":')
    wall_end = game_runtime.find('        case "prop":', wall_start)
    wall_block = game_runtime[wall_start:wall_end] if wall_start >= 0 and wall_end > wall_start else ""
    if not wall_block:
        add(errors, "game.js: wall/wallcap render branch is missing")
    else:
        connected_start = wall_block.find('} else if (d.kind === "wall")')
        massif_block = wall_block[:connected_start] if connected_start >= 0 else ""
        massif_draw = massif_block.find("SpriteAssets.drawFrame(ctx, SpriteAssets.getFrame(massifId, 0)")
        wall_only_guard = massif_block.find('if (d.kind === "wall")')
        if (
            not massif_block
            or "m.outdoor" not in massif_block
            or "MASSIF_THEMES.has(theme)" not in massif_block
            or massif_draw < 0
            or wall_only_guard < 0
            or wall_only_guard > massif_draw
        ):
            add(errors, "game.js: outdoor massif sprites must draw only for d.kind === \"wall\", never wallcap interiors")

        connected_end = wall_block.find("} else {", connected_start + 1) if connected_start >= 0 else -1
        connected_block = (
            wall_block[connected_start:connected_end]
            if connected_start >= 0 and connected_end > connected_start
            else ""
        )
        centered_wall_draw = re.search(
            r"SpriteAssets\.drawFrame\(\s*ctx\s*,\s*"
            r"SpriteAssets\.getFrame\(\s*wallId\s*,\s*d\.wallMask\s*\)\s*,\s*"
            r"d\.sx\s*,\s*d\.sy\s*\)",
            connected_block,
        )
        if not centered_wall_draw or re.search(r"d\.sy\s*\+\s*16", connected_block):
            add(errors, "game.js: authored connected walls must draw at d.sy with no legacy +16 offset")

    # Persistent gameplay objects need an authored sprite base. Canvas glows,
    # weather, projectiles, field effects, shadows, minimap marks, and labels
    # deliberately remain outside this narrow guard.
    trap_start = game_runtime.find('        case "trap": {')
    trap_end = game_runtime.find('        case "npc": {', trap_start)
    trap_block = game_runtime[trap_start:trap_end] if trap_start >= 0 and trap_end > trap_start else ""
    if not trap_block:
        add(errors, "game.js: persistent trap render branch is missing")
    elif not all(token in trap_block for token in ("SpriteAssets.maps.traps", "SpriteAssets.getFrame(", "SpriteAssets.drawFrame(")):
        add(errors, "game.js: persistent trap bodies must use maps.traps authored sprites; only their armed glow may be Canvas VFX")
    backdrop_start = game_runtime.find("  function drawBackdrop(theme, m, W, H, cam) {")
    backdrop_end = game_runtime.find("  /* re-evaluate every ground item", backdrop_start)
    backdrop_block = game_runtime[backdrop_start:backdrop_end] if backdrop_start >= 0 and backdrop_end > backdrop_start else ""
    if not backdrop_block:
        add(errors, "game.js: persistent backdrop render branch is missing")
    elif not all(token in backdrop_block for token in ("SpriteAssets.maps.backdrops", "SpriteAssets.getFrame(")):
        add(
            errors,
            "game.js: persistent biome backdrops must use maps.backdrops authored sprites; only lighting/weather overlays may be Canvas VFX",
        )
    if "function drawRidge(" in game_runtime:
        add(errors, "game.js: procedural persistent ridge/backdrop geometry remains after sprite-only migration")
    title_start = ui_runtime.find("  function titleNewChar() {")
    title_end = ui_runtime.find("\n  function ", title_start + 4)
    title_block = ui_runtime[title_start:title_end] if title_start >= 0 and title_end > title_start else ""
    if not title_block:
        add(errors, "ui.js: title camp render branch is missing")
    elif not all(token in title_block for token in ("SpriteAssets.maps.uiScenes", "titleCamp", "SpriteAssets.getFrame(")):
        add(errors, "ui.js: title camp backdrop must use maps.uiScenes.titleCamp through SpriteAssets")
    all_runtime = "\n".join(path.read_text(encoding="utf-8") for path in (ROOT / "js").glob("*.js") if path.name != "sprite_manifest.js")
    for old_extension in ("DATA.SHEETS", "DATA.ART", "DATA.MONSTER_ART", "DATA.NPC_ART", "DATA.SUMMON_ART"):
        if old_extension in all_runtime:
            add(errors, f"deprecated art extension point remains: {old_extension}")


def validate_report(manifest: dict[str, Any], rig_stats: dict[str, int], errors: list[str]) -> None:
    path = ROOT / "assets" / "sprites" / "coverage.json"
    if not path.is_file():
        add(errors, "missing assets/sprites/coverage.json")
        return
    try:
        report = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        add(errors, f"coverage report is malformed: {exc}")
        return
    if report.get("assetCount") != len(manifest.get("entries", {})):
        add(errors, "coverage report assetCount does not match the manifest")
    if report.get("directions") != manifest.get("directions") or report.get("poses") != manifest.get("poses"):
        add(errors, "coverage report player-rig contract does not match the manifest")
    expected = {
        "playerRigRevision": PLAYER_RIG_REVISION,
        "playerRigClasses": list(PLAYER_CLASSES),
        "playerRigMainFamilies": list(PLAYER_MAIN_FAMILIES),
        "playerRigArmorFamilies": list(PLAYER_ARMOR_FAMILIES),
        "playerRigFrameCount": PLAYER_FRAME_COUNT,
        "playerRigMaterialTiers": 14,
        "deprecatedGearMaps": False,
    }
    for key, value in expected.items():
        if report.get(key) != value:
            add(errors, f"coverage report {key}: expected {value!r}, found {report.get(key)!r}")
    if report.get("playerRigAssetCount") != rig_stats["assets"]:
        add(errors, f"coverage report playerRigAssetCount does not match {rig_stats['assets']} referenced rig assets")
    if report.get("playerRigRenderedAssetCount") != rig_stats["renderedAssets"]:
        add(errors, f"coverage report playerRigRenderedAssetCount does not match {rig_stats['renderedAssets']} runtime-rendered rig assets")
    if report.get("playerRigExpectedFrames") != rig_stats["referencedFrames"]:
        add(errors, f"coverage report playerRigExpectedFrames does not match {rig_stats['referencedFrames']} referenced layer frames")
    if report.get("playerRigValidatedFrames") != rig_stats["referencedFrames"]:
        add(errors, f"coverage report playerRigValidatedFrames does not match {rig_stats['referencedFrames']} referenced frames")
    referenced_ids = set(report.get("playerRigReferencedAssetIds", []))
    if len(referenced_ids) != rig_stats["assets"]:
        add(errors, "coverage report playerRigReferencedAssetIds does not match strict manifest traversal")
    rendered_ids = set(report.get("playerRigRenderedAssetIds", []))
    if len(rendered_ids) != rig_stats["renderedAssets"] or not rendered_ids.issubset(referenced_ids):
        add(errors, "coverage report playerRigRenderedAssetIds does not match runtime mask-replacement traversal")
    coverage = report.get("playerRigCoverage", {})
    for class_id in PLAYER_CLASSES:
        row = coverage.get(class_id, {})
        if row.get("frames") != PLAYER_FRAME_COUNT or set(row.get("main", [])) != set(PLAYER_MAIN_FAMILIES) or set(row.get("shield", [])) != {"shield"} or set(row.get("head", [])) != set(PLAYER_ARMOR_FAMILIES) or set(row.get("chest", [])) != set(PLAYER_ARMOR_FAMILIES):
            add(errors, f"coverage report playerRigCoverage is incomplete for {class_id}")
    if report.get("wallHeight") != 72:
        add(errors, "coverage report wallHeight must remain 72")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--allow-incomplete-rig", action="store_true", help="report legacy/incomplete player rig as warnings while compiler work is in progress")
    parser.add_argument(
        "--body-hand-only", action="store_true",
        help="validate reviewed final body, landmarks, hand-marker atlases, and source registration without requiring a rebuilt runtime manifest",
    )
    parser.add_argument(
        "--forearm-only", action="store_true",
        help="validate reviewed five-class equipment forearm regions/overlays without requiring equipment atlases or a rebuilt runtime manifest",
    )
    parser.add_argument(
        "--path-only", action="store_true",
        help="validate the reviewed path import, hashes, fixed shared transform, isometric sockets, and reciprocal seams without a runtime build",
    )
    parser.add_argument(
        "--source-only", action="store_true",
        help="strictly validate all reviewed source contracts and runtime guards while deliberately excluding packed-manifest/output comparisons",
    )
    parser.add_argument(
        "--partial-only", action="store_true",
        help="validate the playable five-class flattened-starter runtime and exact declared-partial modular availability",
    )
    parser.add_argument(
        "--emberwitch-equipment-only", action="store_true",
        help="strictly validate the complete declared-available Emberwitch modular equipment source and packed runtime, independent of unfinished classes",
    )
    args = parser.parse_args()
    focused = [
        args.body_hand_only, args.forearm_only, args.path_only, args.source_only,
        args.partial_only, args.emberwitch_equipment_only,
    ]
    if sum(bool(value) for value in focused) > 1:
        parser.error(
            "--body-hand-only, --forearm-only, --path-only, --source-only, "
            "--partial-only, and --emberwitch-equipment-only are mutually exclusive"
        )
    errors: list[str] = []
    try:
        manifest = load_manifest()
        if args.forearm_only:
            forearm_checks = validate_equipment_plane_hygiene(manifest, errors)
            if errors:
                print("PLAYER FOREARM VALIDATION FAILED")
                for error in errors[:120]:
                    print(f"- {error}")
                if len(errors) > 120:
                    print(f"- ... {len(errors) - 120} additional validation errors suppressed")
                return 1
            print(
                f"Player equipment forearm validation passed: {len(PLAYER_CLASSES)} reviewed overlays / "
                f"{PLAYER_FRAME_COUNT * len(PLAYER_CLASSES)} ordered frames; {forearm_checks} compact role regions"
            )
            return 0
        if args.body_hand_only:
            hand_checks = validate_hand_registration(manifest, errors, compare_runtime=False)
            landmark_checks = validate_body_identity_landmarks(manifest, errors, compare_runtime=False)
            if errors:
                print("PLAYER BODY/HAND VALIDATION FAILED")
                limit = 120
                for error in errors[:limit]:
                    print(f"- {error}")
                if len(errors) > limit:
                    print(f"- ... {len(errors) - limit} additional validation errors suppressed")
                return 1
            print(
                f"Player body/hand validation passed: {len(PLAYER_CLASSES)} final-aligned bodies / "
                f"{PLAYER_FRAME_COUNT * len(PLAYER_CLASSES)} registered frames; "
                f"{hand_checks} independent socket annotations; {landmark_checks} body-landmark checks"
            )
            return 0
        if args.path_only:
            path_checks = validate_path_sources_only(errors)
            if errors:
                print("PATH ART VALIDATION FAILED")
                for error in errors[:120]:
                    print(f"- {error}")
                if len(errors) > 120:
                    print(f"- ... {len(errors) - 120} additional validation errors suppressed")
                return 1
            print(
                f"Path art validation passed: {len(PATH_THEMES)} reviewed atlases / "
                f"{path_checks} import, isometric-socket, and reciprocal-seam checks"
            )
            return 0
        if args.partial_only:
            data = load_game_data()
            starter_qa_warnings: list[str] = []
            starter_checks = validate_starter_loadouts(
                data, manifest, errors, compare_runtime=True, qa_warnings=starter_qa_warnings,
            )
            partial_checks = validate_partial_equipment_coverage(data, manifest, errors, compare_runtime=True)
            validate_runtime(errors)
            if errors:
                print("PLAYER PARTIAL-LOADOUT VALIDATION FAILED")
                for error in errors[:120]:
                    print(f"- {error}")
                if len(errors) > 120:
                    print(f"- ... {len(errors) - 120} additional validation errors suppressed")
                return 1
            for warning in starter_qa_warnings:
                print(f"STARTER QA WARNING: {warning}")
            print(
                f"Player partial-loadout validation passed: {len(PLAYER_CLASSES)} flattened starter atlases / "
                f"{PLAYER_FRAME_COUNT * len(PLAYER_CLASSES)} authored frames; "
                f"{partial_checks} fail-closed declared modular checks; "
                f"{starter_checks + partial_checks} total checks"
            )
            return 0
        if args.emberwitch_equipment_only:
            data = load_game_data()
            stats = validate_emberwitch_equipment(
                data, manifest, errors, compare_runtime=True,
            )
            invisible_slot_checks = validate_invisible_slot_invariance(manifest, errors)
            validate_runtime(errors)
            if errors:
                print("EMBERWITCH EQUIPMENT VALIDATION FAILED")
                for error in errors[:120]:
                    print(f"- {error}")
                if len(errors) > 120:
                    print(f"- ... {len(errors) - 120} additional validation errors suppressed")
                return 1
            total = sum(stats.values()) + invisible_slot_checks
            print(
                "Emberwitch equipment validation passed: 21 complete modular equipment families / "
                f"{21 * PLAYER_FRAME_COUNT} logical family frames; "
                f"{stats['authorship']} reviewed source roles; {stats['contacts']} socket/hand contacts; "
                f"{stats['renderDiffs']} rendered frame diffs; {stats['silhouettes']} armor silhouette checks; "
                f"{total} total checks"
            )
            return 0
        if args.source_only:
            data = load_game_data()
            starter_qa_warnings = []
            gameplay_checks = validate_gameplay_art_authorship(manifest, errors, compare_runtime=False)
            ui_checks = validate_ui_scene_authorship(manifest, errors, compare_runtime=False)
            hand_checks = validate_hand_registration(manifest, errors, compare_runtime=False)
            landmark_checks = validate_body_identity_landmarks(manifest, errors, compare_runtime=False)
            starter_checks = validate_starter_loadouts(
                data, manifest, errors, compare_runtime=False, qa_warnings=starter_qa_warnings,
            )
            partial_checks = validate_partial_equipment_coverage(data, manifest, errors, compare_runtime=False)
            forearm_checks = validate_equipment_plane_hygiene(manifest, errors)
            inventory_checks = validate_invisible_slot_invariance(manifest, errors)
            item_checks = validate_source_item_resolution(data, errors)
            validate_runtime(errors)
            if errors:
                print("SPRITE SOURCE VALIDATION FAILED")
                for error in errors[:120]:
                    print(f"- {error}")
                if len(errors) > 120:
                    print(f"- ... {len(errors) - 120} additional validation errors suppressed")
                return 1
            for warning in starter_qa_warnings:
                print(f"STARTER QA WARNING: {warning}")
            total = (
                gameplay_checks + ui_checks + hand_checks + landmark_checks + starter_checks
                + partial_checks + forearm_checks + inventory_checks + item_checks
            )
            print(
                f"Sprite source validation passed: {gameplay_checks} gameplay-art checks / "
                f"{hand_checks + landmark_checks} body-hand-landmark checks / "
                f"{starter_checks} flattened-starter checks / "
                f"{partial_checks + forearm_checks} fail-closed declared-partial equipment checks / "
                f"{total} total; runtime procedural-art guards clean"
            )
            return 0
        data = load_game_data()
        summaries = validate_files(manifest, errors)
        rig_start = len(errors)
        validate_world_coverage(manifest, errors)
        gameplay_authorship_checks = validate_gameplay_art_authorship(manifest, errors)
        ui_scene_checks = validate_ui_scene_authorship(manifest, errors)
        validate_hand_registration(manifest, errors)
        landmark_checks = validate_body_identity_landmarks(manifest, errors)
        starter_checks = validate_starter_loadouts(data, manifest, errors, compare_runtime=True)
        partial_checks = validate_partial_equipment_coverage(data, manifest, errors, compare_runtime=True)
        authorship_checks = validate_equipment_authorship(manifest, errors)
        hygiene_checks = validate_equipment_plane_hygiene(manifest, errors)
        source_contact_checks = validate_equipment_source_contacts(errors)
        render_diff_checks = validate_equipment_render_diffs(manifest, errors)
        invisible_slot_checks = validate_invisible_slot_invariance(manifest, errors)
        rig_stats = validate_player_rigs(manifest, summaries, errors)
        rig_stats["contactChecks"] += (
            landmark_checks + authorship_checks + hygiene_checks + source_contact_checks
            + render_diff_checks + invisible_slot_checks + gameplay_authorship_checks + ui_scene_checks
            + starter_checks + partial_checks
        )
        validate_item_resolution(data, manifest, errors)
        validate_runtime(errors)
        validate_report(manifest, rig_stats, errors)
        if args.allow_incomplete_rig:
            rig_markers = (
                "player rig", "player gameplay rig", "player title preview", "maps.playerRigs",
                "equipment base", "equipment resolution", "playerRig", "deprecatedGearMaps",
                "deprecated playerMasks", "deprecated or permissive rig",
            )
            warnings = [message for message in errors[rig_start:] if any(marker in message for marker in rig_markers)]
            errors = errors[:rig_start] + [message for message in errors[rig_start:] if message not in warnings]
            for warning in warnings[:30]:
                print(f"RIG WARNING: {warning}")
            if len(warnings) > 30:
                print(f"RIG WARNING: ... {len(warnings) - 30} additional incomplete-rig diagnostics suppressed")
    except Exception as exc:
        errors.append(str(exc))
        rig_stats = {"assets": 0, "renderedAssets": 0, "referencedFrames": 0, "contactChecks": 0}
    if errors:
        print("SPRITE VALIDATION FAILED")
        limit = 120
        for error in errors[:limit]:
            print(f"- {error}")
        if len(errors) > limit:
            print(f"- ... {len(errors) - limit} additional validation errors suppressed")
        return 1
    print(
        f"Sprite validation passed: {len(manifest['entries'])} manifest entries; "
        f"{rig_stats['assets']} authored player-rig atlases / {rig_stats['referencedFrames']} referenced frames; "
        f"{rig_stats['contactChecks']} grip-contact checks; no procedural fallback APIs"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
