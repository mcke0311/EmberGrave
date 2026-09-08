#!/usr/bin/env python3
"""Build Embergrave's checked-in sprite library from authored raster sources.

This is a development tool only.  The browser loads the emitted WebP files and
manifest directly; it never executes this compiler or draws fallback artwork.
"""

from __future__ import annotations

import argparse
import ast
import json
import hashlib
import math
import re
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
DATA_JS = ROOT / "js" / "data.js"
SRC = ROOT / "assets" / "sprites_src"
OUT = ROOT / "assets" / "sprites"
MANIFEST = ROOT / "js" / "sprite_manifest.js"
COVERAGE = OUT / "coverage.json"

PLAYER_CELL = 192
PLAYER_DIRS = ("E", "SE", "S", "SW", "W", "NW", "N", "NE")
PLAYER_POSES = ("idle", "walkA", "walkB", "attackWindup", "attackImpact", "cast", "hit", "death", "dead")
PLAYER_CLASSES = ("vanguard", "emberwitch", "gravebinder", "wildkeeper", "veilranger")
PLAYER_RIG_REVISION = "grip-rig-v1"
PLAYER_RIG_ROOT = SRC / "player_rig"
PLAYER_RIG_REGISTRATION = PLAYER_RIG_ROOT / "registrations.json"
PLAYER_BODY_LANDMARKS = PLAYER_RIG_ROOT / "qa" / "body_identity_landmarks_v1.json"
PLAYER_EQUIPMENT_AUTHORSHIP = SRC / "player_rig_authored" / "equipment_authorship_v1.json"
PLAYER_BASE_EQUIPMENT_COVERAGE = SRC / "player_rig_authored" / "base_equipment_coverage_v1.json"
PLAYER_STARTER_LOADOUT_ROOT = SRC / "player_starter_loadouts"
PLAYER_STARTER_LOADOUT_AUTHORSHIP = PLAYER_STARTER_LOADOUT_ROOT / "starter_loadouts_v1.json"
GAMEPLAY_ART_ROOT = SRC / "gameplay_art"
GAMEPLAY_ART_AUTHORSHIP = GAMEPLAY_ART_ROOT / "gameplay_art_v1.json"
GAMEPLAY_ART_AUDIT = OUT / "gameplay_art_coverage.json"
GAMEPLAY_ART_VERSION = 1
GAMEPLAY_ART_SOURCE_KIND = "authored-final-aligned"
GAMEPLAY_ART_REVIEW = "visual-contact-sheet-v1"
GAMEPLAY_ART_PROVENANCE_KEYS = {"method", "source", "sourceSha256", "parameters"}
UI_SCENE_ROOT = SRC / "ui" / "scenes"
UI_SCENE_AUTHORSHIP = UI_SCENE_ROOT / "ui_scenes_v1.json"
UI_SCENE_AUDIT = OUT / "ui_scene_coverage.json"
UI_SCENE_VERSION = 1
PLAYER_MAIN_FAMILIES = (
    "sword_1h", "sword_2h", "axe_1h", "axe_2h", "mace_1h", "mace_2h",
    "dagger_1h", "spear_2h", "bow_2h", "crossbow_2h", "wand_1h", "staff_2h",
)
PLAYER_ARMOR_FAMILIES = ("light", "mail", "plate", "mythic")
PLAYER_MATERIAL_ROLES = ("metal", "wood", "leather", "cloth", "accent")
PLAYER_STARTER_EQUIPMENT = {
    "vanguard": {"mainBaseId": "shortsword", "mainFamily": "sword_1h", "chestBaseId": "quiltvest", "chestFamily": "light"},
    "emberwitch": {"mainBaseId": "gnarlwand", "mainFamily": "wand_1h", "chestBaseId": "quiltvest", "chestFamily": "light"},
    "gravebinder": {"mainBaseId": "gnarlwand", "mainFamily": "wand_1h", "chestBaseId": "quiltvest", "chestFamily": "light"},
    "wildkeeper": {"mainBaseId": "ashstaff", "mainFamily": "staff_2h", "chestBaseId": "quiltvest", "chestFamily": "light"},
    "veilranger": {"mainBaseId": "huntbow", "mainFamily": "bow_2h", "chestBaseId": "quiltvest", "chestFamily": "light"},
}

THEMES = (
    "town", "fields", "crypt", "vigil", "chapel", "forest", "monastery",
    "snowwild", "icecave", "mine", "temple", "marsh", "drowned", "desert",
    "tombs", "palace", "cathedral", "hellwild", "bastion", "throne",
)

WALL_THEMES = (
    "town", "crypt", "vigil", "chapel", "monastery", "snowwild",
    "icecave", "mine", "temple", "marsh", "drowned", "desert",
    "tombs", "palace", "cathedral", "hellwild", "bastion", "throne",
)

WALL_CONTRACT = {
    "cell": [128, 128],
    "footprint": [64, 32],
    "rise": 72,
    "anchor": [64, 112],
    "frames": 16,
}

TIER_MATERIALS = (
    "#6f5742", "#7c7e84", "#9aa0a8", "#b6bec8", "#b9a878", "#cdd6e0",
    "#8f98ac", "#aeb8cc", "#dde8f4", "#e8dfc6", "#2c2832", "#f3edd4",
    "#f6c45e", "#d2f0e2",
)

ITEM_CATEGORIES = (
    "sword", "axe", "mace", "dagger", "spear", "bow", "crossbow", "wand",
    "staff", "shield", "helm", "chest", "gloves", "boots", "belt", "ring", "amulet",
)
MISC_ICON_NAMES = ("gold", "potR", "potB", "scroll", "glyph", "charm", "cache")
ITEM_VARIANT_NAMES = (
    "jewel", "potP", "potG", "scrollB", "charm_small", "charm_large",
    "charm_grand", "cap", "quiltvest", "hauberk", "ljgloves", "warboots",
    "sash", "buckler", "flangedmace", "cudgel", "sword2h", "axe2h",
    "mace2h", "chest_leather", "helm_leather", "helm_mail", "gloves_mail", "boots_mail",
    "chest_plate", "helm_plate", "gloves_plate", "boots_plate", "hp1", "mp1",
)
ITEM_VARIANT_ALIASES = {"chest_mail": "hauberk", "gloves_leather": "ljgloves", "boots_leather": "warboots"}
TRAP_KINDS = ("barbed", "frost", "powder")
FORM_IDS = ("form_fang", "form_brute", "form_stone", "form_apex")
BACKDROP_THEMES = ("snowwild", "desert", "hellwild", "marsh", "forest", "fields", "dungeon", "default")


def ensure_dirs() -> None:
    for rel in (
        "players", "players/gear", "ui", "world/grounds", "world/hazards",
        "world/paths", "world/walls", "world/cliffs", "world/massifs",
        "world/props", "actors/monsters", "actors/npcs",
    ):
        (OUT / rel).mkdir(parents=True, exist_ok=True)


def save_webp(img: Image.Image, path: Path, quality: int = 92) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    # Method 4 keeps the full-library build practical while preserving the
    # authored alpha edges and painted detail at the requested quality.
    img.save(path, "WEBP", quality=quality, method=4, lossless=False, exact=True)


def save_lossless_webp(img: Image.Image, path: Path) -> None:
    """Pack cell-edge authored atlases without lossy cross-cell ringing."""
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, "WEBP", method=6, lossless=True, exact=True)


def rgba(path: Path) -> Image.Image:
    return Image.open(path).convert("RGBA")


def parse_art_entries(data: str) -> tuple[dict[str, dict], dict[str, dict], dict[str, dict], dict[str, dict]]:
    def block(marker: str, next_marker: str | None) -> str:
        start = data.index(marker) + len(marker)
        end = data.index(next_marker, start) if next_marker else len(data)
        return data[start:end]

    art_block = block("DATA.WORLD_SPRITE_SOURCES = {", "DATA.MONSTER_SPRITE_SOURCES = {")
    monster_block = block("DATA.MONSTER_SPRITE_SOURCES = {", "DATA.NPC_SPRITE_SOURCES = {")
    npc_block = block("DATA.NPC_SPRITE_SOURCES = {", None)
    summon_block = block("DATA.SUMMON_SPRITE_SOURCES = {", "DATA.WORLD_SPRITE_SOURCES = {")

    def entries(text: str) -> dict[str, dict]:
        found: dict[str, dict] = {}
        for line in text.splitlines():
            m = re.match(r'\s*([A-Za-z0-9_]+):\s*\{\s*src:\s*"([^"]+)"(.*)', line)
            if m:
                tail = m.group(3)
                fit = re.search(r'\bfit:\s*(\d+)', tail)
                height = re.search(r'\bheight:\s*(\d+)', tail)
                tint_key = re.search(r'\btintKey:\s*"([^"]+)"', tail)
                found[m.group(1)] = {
                    "src": m.group(2),
                    "fit": int(fit.group(1)) if fit else None,
                    "height": int(height.group(1)) if height else None,
                    "tintKey": tint_key.group(1) if tint_key else None,
                }
                continue
            a = re.match(r'\s*([A-Za-z0-9_]+):\s*\{\s*alias:\s*"([^"]+)"', line)
            if a:
                found[a.group(1)] = {"alias": a.group(2)}
        return found

    return entries(art_block), entries(monster_block), entries(npc_block), entries(summon_block)


def _reject_duplicate_json_keys(pairs: list[tuple[str, object]]) -> dict:
    result: dict = {}
    for key, value in pairs:
        if key in result:
            raise ValueError(f"duplicate JSON key {key!r}")
        result[key] = value
    return result


def _is_relative_to(path: Path, root: Path) -> bool:
    try:
        path.resolve().relative_to(root.resolve())
        return True
    except ValueError:
        return False


def assert_pack_only_compiler() -> None:
    """Reject reintroduction of pixel-manufacturing APIs into this packer."""
    source = Path(__file__).read_text(encoding="utf-8")
    tree = ast.parse(source, filename=str(Path(__file__)))
    forbidden_modules = {"random", "numpy"}
    forbidden_pil_names = {"Image" + suffix for suffix in ("Chops", "Color", "Draw", "Enhance", "Filter", "Ops")}
    forbidden_attrs = {
        "alpha_composite", "blend", "composite", "effect_noise", "fromarray", "new",
        "paste", "point", "polygon", "putalpha", "putdata", "putpixel", "resize",
        "rotate", "rounded_rectangle", "transform",
    }
    errors: list[str] = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                if alias.name.split(".")[0] in forbidden_modules:
                    errors.append(f"line {node.lineno}: forbidden procedural import {alias.name}")
        elif isinstance(node, ast.ImportFrom):
            if (node.module or "").split(".")[0] in forbidden_modules:
                errors.append(f"line {node.lineno}: forbidden procedural import {node.module}")
            if node.module == "PIL":
                for alias in node.names:
                    if alias.name in forbidden_pil_names:
                        errors.append(f"line {node.lineno}: forbidden PIL generator {alias.name}")
        elif isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute):
            if node.func.attr in forbidden_attrs:
                errors.append(f"line {node.lineno}: forbidden pixel-manufacturing call .{node.func.attr}()")
    if errors:
        raise RuntimeError("sprite compiler is not pack-only:\n  - " + "\n  - ".join(errors))


def _validate_rig_source(path: Path, class_id: str, slot: str, family: str, plane: str) -> Image.Image:
    if not path.is_file():
        raise RuntimeError(f"missing authored {class_id}/{slot}/{family}/{plane} source: {path}")
    with Image.open(path) as opened:
        if opened.format != "PNG" or opened.mode != "RGBA":
            raise RuntimeError(
                f"authored rig source must be RGBA PNG: {path} is {opened.format} {opened.mode}"
            )
        img = opened.copy()
    if img.size != (PLAYER_CELL * 8, PLAYER_CELL * 9):
        raise RuntimeError(f"authored rig source must be 1536x1728: {path} is {img.size}")
    if img.mode != "RGBA":
        raise RuntimeError(f"authored rig source must be RGBA: {path}")
    # Layer sheets must preserve the complete 8x9 contract.  Body and grip
    # sheets require every frame; split occlusion planes may intentionally be
    # empty for some directions but must contribute visible pixels overall.
    visible = []
    for row in range(9):
        for col in range(8):
            alpha = img.crop((col * PLAYER_CELL, row * PLAYER_CELL,
                              (col + 1) * PLAYER_CELL, (row + 1) * PLAYER_CELL)).getchannel("A")
            visible.append(bool(alpha.getbbox()))
    if not any(visible):
        raise RuntimeError(f"authored rig source has no visible frames: {path}")
    if slot in ("body", "unarmed") or plane == "grip":
        empty = [i for i, present in enumerate(visible) if not present]
        if empty:
            raise RuntimeError(f"authored {class_id}/{slot}/{family}/{plane} has empty frames {empty}")
    return img


def _load_base_equipment_coverage() -> dict:
    """Load the explicit, fail-closed partial player-equipment declaration.

    The declaration is intentionally separate from the provenance ledger:
    coverage chooses which reviewed families ship, while equipmentAuthorship
    binds each runtime-visible source path to its accepted bytes. An absent
    family is therefore unavailable, never aliased or procedurally filled.
    """
    if not PLAYER_BASE_EQUIPMENT_COVERAGE.is_file():
        raise RuntimeError(
            "missing declared base-equipment coverage: "
            f"{PLAYER_BASE_EQUIPMENT_COVERAGE.relative_to(ROOT).as_posix()}"
        )
    try:
        coverage = json.loads(
            PLAYER_BASE_EQUIPMENT_COVERAGE.read_text(encoding="utf-8"),
            object_pairs_hook=_reject_duplicate_json_keys,
        )
    except Exception as exc:
        raise RuntimeError(f"base-equipment coverage is malformed: {exc}") from exc
    expected_top = {
        "version", "mode", "sourceKind", "review", "root",
        "starterBaseIds", "classes",
    }
    if set(coverage) != expected_top:
        raise RuntimeError(f"base-equipment coverage keys must be {sorted(expected_top)}")
    if (
        coverage.get("version") != 1
        or coverage.get("mode") != "declared-partial-v1"
        or coverage.get("sourceKind") != "authored-final-aligned"
        or coverage.get("review") != "visual-contact-sheet-v1"
        or coverage.get("root") != "assets/sprites_src/player_rig_authored"
    ):
        raise RuntimeError("base-equipment coverage provenance contract changed")
    classes = coverage.get("classes")
    if not isinstance(classes, dict) or set(classes) != set(PLAYER_CLASSES):
        raise RuntimeError("base-equipment coverage must declare exactly the five classes")
    starter_ids = coverage.get("starterBaseIds")
    if not isinstance(starter_ids, dict) or set(starter_ids) != set(PLAYER_CLASSES):
        raise RuntimeError("base-equipment coverage must bind every class starter loadout")
    data_source = DATA_JS.read_text(encoding="utf-8")
    starter_match = re.search(
        r"DATA\.PLAYER_STARTER_LOADOUTS\s*=\s*(\{.*?\n\});",
        data_source,
        re.DOTALL,
    )
    if not starter_match:
        raise RuntimeError("DATA.PLAYER_STARTER_LOADOUTS is missing")
    runtime_starters: dict[str, dict[str, str]] = {}
    for class_id, main_id, chest_id in re.findall(
        r"([a-z]+)\s*:\s*\{\s*main\s*:\s*\"([^\"]+)\"\s*,\s*chest\s*:\s*\"([^\"]+)\"\s*\}",
        starter_match.group(1),
    ):
        runtime_starters[class_id] = {"main": main_id, "chest": chest_id}
    if set(runtime_starters) != set(PLAYER_CLASSES):
        raise RuntimeError("DATA.PLAYER_STARTER_LOADOUTS must cover exactly the five classes")
    for class_id in PLAYER_CLASSES:
        expected_starter = PLAYER_STARTER_EQUIPMENT[class_id]
        expected_ids = {
            "main": expected_starter["mainBaseId"],
            "chest": expected_starter["chestBaseId"],
        }
        if starter_ids.get(class_id) != expected_ids:
            raise RuntimeError(
                f"{class_id} starter base IDs changed: expected {expected_ids}, "
                f"found {starter_ids.get(class_id)!r}"
            )
        if runtime_starters[class_id] != expected_ids:
            raise RuntimeError(
                f"{class_id} runtime starter IDs {runtime_starters[class_id]} do not match "
                f"base equipment coverage {expected_ids}"
            )
        main_id, chest_id = expected_ids["main"], expected_ids["chest"]
        if not re.search(rf'\b{re.escape(main_id)}\s*:\s*\{{[^\n]*\bslot\s*:\s*"main"', data_source):
            raise RuntimeError(f"{class_id} starter main base {main_id!r} is absent from DATA.BASES")
        if not re.search(rf'\b{re.escape(chest_id)}\s*:\s*\{{[^\n]*\bslot\s*:\s*"chest"', data_source):
            raise RuntimeError(f"{class_id} starter chest base {chest_id!r} is absent from DATA.BASES")
        node = classes[class_id]
        expected_slots = {"unarmed", "main", "shield", "head", "chest"}
        if not isinstance(node, dict) or set(node) != {"available", "planned"}:
            raise RuntimeError(
                f"{class_id} partial coverage must contain exactly available and planned"
            )
        expected_families = {
            "unarmed": set(),
            "main": {expected_starter["mainFamily"]},
            "shield": set(),
            "head": set(),
            "chest": {expected_starter["chestFamily"]},
        }
        allowed = {
            "unarmed": {"unarmed"}, "main": set(PLAYER_MAIN_FAMILIES),
            "shield": {"shield"}, "head": set(PLAYER_ARMOR_FAMILIES),
            "chest": set(PLAYER_ARMOR_FAMILIES),
        }
        for status in ("available", "planned"):
            branch = node[status]
            if not isinstance(branch, dict) or set(branch) != expected_slots:
                raise RuntimeError(
                    f"{class_id}/{status} coverage slots must be {sorted(expected_slots)}"
                )
            for slot, family_map in branch.items():
                if not isinstance(family_map, dict):
                    raise RuntimeError(f"{class_id}/{status}/{slot} coverage must be a family map")
                unknown = set(family_map) - allowed[slot]
                if unknown:
                    raise RuntimeError(
                        f"{class_id}/{status}/{slot} declares unknown families {sorted(unknown)}"
                    )
        for slot in expected_slots:
            available = set(node["available"][slot])
            planned = set(node["planned"][slot])
            overlap = available & planned
            if overlap:
                raise RuntimeError(
                    f"{class_id}/{slot} families cannot be both available and planned: {sorted(overlap)}"
                )
            missing_starter = expected_families[slot] - (available | planned)
            if missing_starter:
                raise RuntimeError(
                    f"{class_id}/{slot} omits planned modular starter families {sorted(missing_starter)}"
                )
    return coverage


def _equipment_family_planes(slot: str) -> tuple[str, ...]:
    if slot in ("main", "shield", "unarmed"):
        return ("rear", "held", "grip", "front")
    if slot in ("head", "chest"):
        return ("rear", "worn", "front")
    raise RuntimeError(f"unsupported player-equipment slot {slot}")


def _declared_equipment_refs(source_def: dict, class_id: str, slot: str,
                             family: str) -> list[str]:
    """Validate a declared family and return only runtime-visible source refs."""
    planes = _equipment_family_planes(slot)
    expected_keys = {*planes, "masks"}
    if not isinstance(source_def, dict) or set(source_def) != expected_keys:
        raise RuntimeError(
            f"{class_id}/{slot}/{family} source definition keys must be {sorted(expected_keys)}"
        )
    masks = source_def.get("masks")
    if not isinstance(masks, dict) or not set(masks).issubset(planes):
        raise RuntimeError(f"{class_id}/{slot}/{family} masks must use declared planes only")
    refs: list[str] = []
    rendered_planes: set[str] = set()
    canonical_refs: list[tuple[str, str, str | None]] = []
    for plane in planes:
        source = source_def.get(plane)
        if source is not None and not isinstance(source, str):
            raise RuntimeError(f"{class_id}/{slot}/{family}/{plane} must be a path or null")
        plane_masks = masks.get(plane, {})
        if not isinstance(plane_masks, dict):
            raise RuntimeError(f"{class_id}/{slot}/{family}/{plane} masks must be an object")
        if plane_masks and source is not None:
            raise RuntimeError(
                f"{class_id}/{slot}/{family}/{plane} retains an unreachable base beneath "
                "replacement masks"
            )
        if plane_masks:
            rendered_planes.add(plane)
            for material, mask_source in sorted(plane_masks.items()):
                if material not in PLAYER_MATERIAL_ROLES:
                    raise RuntimeError(
                        f"unsupported mask role {material} in {class_id}/{slot}/{family}/{plane}"
                    )
                if not isinstance(mask_source, str) or not mask_source:
                    raise RuntimeError(
                        f"{class_id}/{slot}/{family}/{plane}/{material} must be a source path"
                    )
                refs.append(mask_source)
                canonical_refs.append((mask_source, plane, material))
        elif source:
            rendered_planes.add(plane)
            refs.append(source)
            canonical_refs.append((source, plane, None))
    required = {
        "unarmed": {"grip"}, "main": {"held", "grip"},
        "shield": {"held", "grip"}, "head": {"worn"}, "chest": {"worn"},
    }[slot]
    missing = sorted(required - rendered_planes)
    if missing:
        raise RuntimeError(
            f"{class_id}/{slot}/{family} is missing required runtime planes {missing}"
        )
    required_prefix = f"assets/sprites_src/player_rig_authored/{class_id}/{slot}/{family}/"
    for ref, plane, material in canonical_refs:
        normalized = Path(ref).as_posix()
        filename = f"{plane}_mask_{material}.png" if material else f"{plane}.png"
        expected = f"{required_prefix}{filename}"
        if normalized != expected:
            raise RuntimeError(
                f"{class_id}/{slot}/{family}/{plane} source must use canonical path "
                f"{expected}: {normalized}"
            )
    return refs


def _player_equipment_declaration_state(coverage: dict) -> tuple[int, list[str]]:
    available_families = 0
    planned_refs: list[str] = []
    for class_id in PLAYER_CLASSES:
        node = coverage["classes"][class_id]
        for status in ("available", "planned"):
            for slot, family_map in node[status].items():
                available_families += len(family_map) if status == "available" else 0
                for family, source_def in family_map.items():
                    refs = _declared_equipment_refs(source_def, class_id, slot, family)
                    if status == "planned":
                        planned_refs.extend(refs)
    return available_families, planned_refs


def _require_planned_equipment_absent(coverage: dict) -> int:
    available_families, planned_refs = _player_equipment_declaration_state(coverage)
    present = sorted(ref for ref in planned_refs if (ROOT / ref).is_file())
    if present:
        sample = ", ".join(present[:4])
        raise RuntimeError(
            "planned player-equipment sources are present but not promoted to available with "
            f"strict authorship records: {sample}"
        )
    return available_families


def _load_starter_loadout_authorship() -> dict:
    """Validate the immutable five-class flattened starter source ledger."""
    if not PLAYER_STARTER_LOADOUT_AUTHORSHIP.is_file():
        raise RuntimeError(
            "missing starter-loadout provenance: "
            f"{PLAYER_STARTER_LOADOUT_AUTHORSHIP.relative_to(ROOT).as_posix()}"
        )
    try:
        provenance = json.loads(
            PLAYER_STARTER_LOADOUT_AUTHORSHIP.read_text(encoding="utf-8"),
            object_pairs_hook=_reject_duplicate_json_keys,
        )
    except Exception as exc:
        raise RuntimeError(f"starter-loadout provenance is malformed: {exc}") from exc
    expected_top = {"version", "sourceKind", "review", "classes"}
    if set(provenance) != expected_top:
        raise RuntimeError(f"starter-loadout provenance keys must be {sorted(expected_top)}")
    if (
        provenance.get("version") != 1
        or provenance.get("sourceKind") != "authored-flattened-starter-loadout"
        or provenance.get("review") != "visual-contact-sheet-v1"
    ):
        raise RuntimeError("starter-loadout provenance contract changed")
    classes = provenance.get("classes")
    if not isinstance(classes, dict) or set(classes) != set(PLAYER_CLASSES):
        raise RuntimeError("starter-loadout provenance must cover exactly the five player classes")
    expected_record_keys = {
        "anchor", "frameAlphaBboxes", "frames", "method", "output", "outputSha256",
        "outputSize", "review", "source", "sourceSha256", "sourceSize",
        "microIslandMaxPixels", "microIslandComponentsRemoved", "microIslandPixelsRemoved",
    }
    for class_id in PLAYER_CLASSES:
        record = classes[class_id]
        if not isinstance(record, dict) or set(record) != expected_record_keys:
            raise RuntimeError(
                f"starter-loadout {class_id} keys must be {sorted(expected_record_keys)}"
            )
        expected_output = f"assets/sprites_src/player_starter_loadouts/{class_id}.png"
        expected_source = (
            f"assets/sprites_src/player_starter_loadouts_authored/{class_id}_starter_raw_v1.png"
        )
        if (
            record.get("anchor") != [96, 184]
            or record.get("frames") != 72
            or record.get("method") != "imagegen-authored-flat-loadout-uniform-atlas-resize-micro-island-clean-v2"
            or record.get("microIslandMaxPixels") != 8
            or not isinstance(record.get("microIslandComponentsRemoved"), int)
            or not isinstance(record.get("microIslandPixelsRemoved"), int)
            or record.get("review") != "visual-contact-sheet-v1"
            or record.get("output") != expected_output
            or record.get("outputSize") != [1536, 1728]
            or record.get("source") != expected_source
        ):
            raise RuntimeError(f"starter-loadout {class_id} provenance contract changed")
        for key in ("sourceSha256", "outputSha256"):
            if not isinstance(record.get(key), str) or not re.fullmatch(r"[0-9a-f]{64}", record[key]):
                raise RuntimeError(f"starter-loadout {class_id} has malformed {key}")
        source_path = ROOT / expected_source
        output_path = ROOT / expected_output
        if not source_path.is_file() or hashlib.sha256(source_path.read_bytes()).hexdigest() != record["sourceSha256"]:
            raise RuntimeError(f"starter-loadout authored source/hash mismatch for {class_id}")
        if not output_path.is_file() or hashlib.sha256(output_path.read_bytes()).hexdigest() != record["outputSha256"]:
            raise RuntimeError(f"starter-loadout final source/hash mismatch for {class_id}")
        with Image.open(source_path) as opened:
            if (
                opened.format != "PNG" or opened.mode not in ("RGB", "RGBA")
                or list(opened.size) != record.get("sourceSize")
            ):
                raise RuntimeError(f"starter-loadout authored source metadata mismatch for {class_id}")
        with Image.open(output_path) as opened:
            if opened.format != "PNG" or opened.mode != "RGBA" or opened.size != (1536, 1728):
                raise RuntimeError(f"starter-loadout final source must be RGBA PNG 1536x1728 for {class_id}")
            final = opened.copy()
        expected_bboxes = []
        for index in range(72):
            col, row = index % 8, index // 8
            alpha = final.crop(
                (col * 192, row * 192, (col + 1) * 192, (row + 1) * 192)
            ).getchannel("A")
            pixels = alpha.load()
            opaque = [
                (x, y) for y in range(192) for x in range(192)
                if pixels[x, y] > 8
            ]
            if not opaque:
                raise RuntimeError(f"starter-loadout {class_id} frame {index} is empty")
            xs = [point[0] for point in opaque]
            ys = [point[1] for point in opaque]
            expected_bboxes.append([min(xs), min(ys), max(xs) + 1, max(ys) + 1])
        if record.get("frameAlphaBboxes") != expected_bboxes:
            raise RuntimeError(f"starter-loadout {class_id} frame alpha bounds changed")
    return provenance


def build_player_rigs(entries: dict, maps: dict) -> dict:
    """Validate and pack pre-aligned authored rig sheets without repositioning."""
    if not PLAYER_RIG_REGISTRATION.is_file():
        raise RuntimeError(
            f"missing player-rig registration; run `python tools/author_player_rig.py --write`: {PLAYER_RIG_REGISTRATION}"
        )
    registration = json.loads(PLAYER_RIG_REGISTRATION.read_text(encoding="utf-8"))
    if registration.get("revision") != PLAYER_RIG_REVISION:
        raise RuntimeError(f"player rig revision must be {PLAYER_RIG_REVISION}")
    if registration.get("cell") != [PLAYER_CELL, PLAYER_CELL] or registration.get("atlas") != [1536, 1728]:
        raise RuntimeError("player rig registration must declare 192px cells in a 1536x1728 atlas")
    if registration.get("anchor") != [96, 184]:
        raise RuntimeError("player rig registration anchor must remain [96,184]")
    if registration.get("scaleMethod") != "class-shared-final-aligned":
        raise RuntimeError("player rig registration must use class-shared-final-aligned scaling")
    expected_identity_registration = {
        "method": "authored-final-body-landmarks-v1",
        "review": "visual-overlay-v1",
        "source": "assets/sprites_src/player_rig/qa/body_identity_landmarks_v1.json",
        "headPadding": 10,
        "chestPadding": 12,
    }
    if registration.get("bodyIdentityLandmarks") != expected_identity_registration:
        raise RuntimeError("player rig body identity landmark provenance changed")
    if registration.get("directions") != list(PLAYER_DIRS) or registration.get("poses") != list(PLAYER_POSES):
        raise RuntimeError("player rig registration direction/pose order changed")
    if registration.get("mainFamilies") != list(PLAYER_MAIN_FAMILIES):
        raise RuntimeError("player rig registration weapon family contract changed")
    if registration.get("armorFamilies") != list(PLAYER_ARMOR_FAMILIES):
        raise RuntimeError("player rig registration armor family contract changed")
    if len(registration.get("materialTiers", [])) != 14:
        raise RuntimeError("player rig registration must declare exactly 14 material tiers")
    hand_registration = registration.get("handRegistration")
    expected_hand_registration_keys = {"method", "review", "layout", "markerColors", "sources"}
    if (not isinstance(hand_registration, dict) or set(hand_registration) != expected_hand_registration_keys or
            hand_registration.get("method") != "authored-final-aligned-marker-atlases" or
            hand_registration.get("layout") != "8x9-final-aligned"):
        raise RuntimeError("player rig hand sockets must come from final-aligned authored marker atlases")
    if hand_registration.get("review") != "visual-contact-sheet-v3":
        raise RuntimeError("player rig hand sockets must use the visually reviewed v3 contact sheets")
    if hand_registration.get("markerColors") != {"main": "#ff0000", "off": "#00ffff"}:
        raise RuntimeError("player rig hand marker colors changed")
    hand_sources = hand_registration.get("sources")
    if not isinstance(hand_sources, dict) or set(hand_sources) != set(PLAYER_CLASSES):
        raise RuntimeError("player rig hand marker sources must cover exactly the five classes")

    def marker_component(points: set[tuple[int, int]], class_id: str, index: int,
                         role: str) -> tuple[list[int], list[int]]:
        if len(points) < 3:
            raise RuntimeError(f"{class_id} hand marker frame {index} has too few {role} pixels")
        remaining = set(points)
        components: list[set[tuple[int, int]]] = []
        while remaining:
            start = remaining.pop()
            component = {start}
            frontier = [start]
            while frontier:
                x, y = frontier.pop()
                for yy in range(max(0, y - 1), min(PLAYER_CELL, y + 2)):
                    for xx in range(max(0, x - 1), min(PLAYER_CELL, x + 2)):
                        candidate = (xx, yy)
                        if candidate in remaining:
                            remaining.remove(candidate)
                            component.add(candidate)
                            frontier.append(candidate)
            components.append(component)
        if len(components) != 1:
            raise RuntimeError(
                f"{class_id} hand marker frame {index} must contain exactly one connected {role} marker; "
                f"found {len(components)}"
            )
        xs = [point[0] for point in points]
        ys = [point[1] for point in points]
        grip = [round(sum(xs) / len(xs)), round(sum(ys) / len(ys))]
        x0, y0, x1, y1 = min(xs), min(ys), max(xs) + 1, max(ys) + 1
        padded_x0, padded_y0 = max(0, x0 - 4), max(0, y0 - 4)
        padded_x1, padded_y1 = min(PLAYER_CELL, x1 + 4), min(PLAYER_CELL, y1 + 4)
        return grip, [padded_x0, padded_y0, padded_x1 - padded_x0, padded_y1 - padded_y0]

    def decode_hand_markers(class_id: str) -> list[dict[str, list[int]]]:
        expected_rel = f"assets/sprites_src/player_rig/{class_id}/hand_registration.png"
        source_rel = hand_sources[class_id]
        if source_rel != expected_rel:
            raise RuntimeError(f"{class_id} hand marker source must be {expected_rel}, got {source_rel!r}")
        source = ROOT / source_rel
        if not source.is_file():
            raise RuntimeError(f"missing final-aligned hand marker source: {source_rel}")
        with Image.open(source) as opened:
            if opened.format != "PNG" or opened.mode != "RGBA" or opened.size != (1536, 1728):
                raise RuntimeError(f"{class_id} hand markers must be RGBA PNG 1536x1728")
            marker = opened.copy()
        pixels = marker.load()
        decoded = []
        for index in range(72):
            col, row = index % 8, index // 8
            roles: dict[str, set[tuple[int, int]]] = {"main": set(), "off": set()}
            for y in range(PLAYER_CELL):
                for x in range(PLAYER_CELL):
                    rgba = pixels[col * PLAYER_CELL + x, row * PLAYER_CELL + y]
                    if rgba == (0, 0, 0, 0):
                        continue
                    if rgba == (255, 0, 0, 255):
                        roles["main"].add((x, y))
                    elif rgba == (0, 255, 255, 255):
                        roles["off"].add((x, y))
                    else:
                        raise RuntimeError(
                            f"{class_id} hand marker frame {index} contains non-normative RGBA {rgba}"
                        )
            main_grip, main_roi = marker_component(roles["main"], class_id, index, "main")
            off_grip, off_roi = marker_component(roles["off"], class_id, index, "off")
            decoded.append({
                "mainGrip": main_grip, "offGrip": off_grip,
                "mainHandROI": main_roi, "offHandROI": off_roi,
            })
        return decoded

    if not PLAYER_BODY_LANDMARKS.is_file():
        raise RuntimeError(
            "missing independently reviewed body-scale landmarks: "
            f"{PLAYER_BODY_LANDMARKS.relative_to(ROOT)}"
        )
    body_landmarks = json.loads(PLAYER_BODY_LANDMARKS.read_text(encoding="utf-8"))
    expected_landmark_keys = {"version", "method", "review", "classes"}
    if set(body_landmarks) != expected_landmark_keys:
        raise RuntimeError(f"body identity landmark keys must be {sorted(expected_landmark_keys)}")
    if (body_landmarks.get("version") != 1 or
            body_landmarks.get("method") != "authored-final-body-landmarks-v1" or
            body_landmarks.get("review") != "visual-overlay-v1"):
        raise RuntimeError("body identity landmark provenance contract changed")
    landmark_classes = body_landmarks.get("classes")
    if not isinstance(landmark_classes, dict) or set(landmark_classes) != set(PLAYER_CLASSES):
        raise RuntimeError("body identity landmarks must cover exactly the five player classes")

    def point_touches(alpha: Image.Image, point: list[float]) -> bool:
        x, y = round(point[0]), round(point[1])
        for yy in range(max(0, y - 2), min(PLAYER_CELL, y + 3)):
            for xx in range(max(0, x - 2), min(PLAYER_CELL, x + 3)):
                if alpha.getpixel((xx, yy)) > 8:
                    return True
        return False

    def validate_body_landmarks(class_id: str, body_source_rel: str) -> None:
        node = landmark_classes[class_id]
        if not isinstance(node, dict) or set(node) != {"frames"}:
            raise RuntimeError(f"{class_id} body landmark node must contain only frames")
        frames = node.get("frames")
        if not isinstance(frames, list) or len(frames) != 72:
            raise RuntimeError(f"{class_id} body landmarks must contain exactly 72 frames")
        body_path = ROOT / body_source_rel
        with Image.open(body_path) as opened:
            if opened.format != "PNG" or opened.mode != "RGBA" or opened.size != (1536, 1728):
                raise RuntimeError(f"{class_id} body landmark target must be final RGBA 1536x1728 PNG")
            body = opened.copy()
        overlay_path = PLAYER_RIG_ROOT / "qa" / f"{class_id}_body_identity_landmarks_v1.png"
        if not overlay_path.is_file():
            raise RuntimeError(f"missing reviewed body landmark overlay: {overlay_path.relative_to(ROOT)}")
        with Image.open(overlay_path) as overlay:
            if overlay.format != "PNG" or overlay.mode != "RGBA" or overlay.size != (1536, 1728):
                raise RuntimeError(f"malformed reviewed body landmark overlay: {overlay_path.relative_to(ROOT)}")
        exact_frame_keys = {"index", "pose", "direction", "headLine", "torsoLine", "review"}
        idle_lengths: dict[str, dict[str, float]] = {}
        for index, frame in enumerate(frames):
            pose = PLAYER_POSES[index // 8]
            direction = PLAYER_DIRS[index % 8]
            if (not isinstance(frame, dict) or set(frame) != exact_frame_keys or
                    frame.get("index") != index or frame.get("pose") != pose or
                    frame.get("direction") != direction or
                    frame.get("review") != "authored-visual-v1"):
                raise RuntimeError(f"{class_id} body landmark frame {index} has malformed order/provenance")
            alpha = body.crop(((index % 8) * PLAYER_CELL, (index // 8) * PLAYER_CELL,
                               (index % 8 + 1) * PLAYER_CELL, (index // 8 + 1) * PLAYER_CELL)).getchannel("A")
            lengths: dict[str, float] = {}
            for key in ("headLine", "torsoLine"):
                line = frame.get(key)
                if not (isinstance(line, list) and len(line) == 2 and
                        all(isinstance(point, list) and len(point) == 2 for point in line)):
                    raise RuntimeError(f"{class_id} body landmark frame {index} has malformed {key}")
                values = [value for point in line for value in point]
                if not all(isinstance(value, (int, float)) and not isinstance(value, bool) and
                           math.isfinite(value) and 0 <= value < PLAYER_CELL for value in values):
                    raise RuntimeError(f"{class_id} body landmark frame {index} has out-of-cell {key}")
                if not all(point_touches(alpha, point) for point in line):
                    raise RuntimeError(f"{class_id} body landmark frame {index} {key} misses body alpha")
                line_length = math.dist(line[0], line[1])
                if line_length <= 0:
                    raise RuntimeError(f"{class_id} body landmark frame {index} has zero-length {key}")
                lengths[key] = line_length
            if pose == "idle":
                idle_lengths[direction] = lengths
            elif pose in {"cast", "hit", "death", "dead"}:
                for key in ("headLine", "torsoLine"):
                    ratio = lengths[key] / idle_lengths[direction][key]
                    if not .85 <= ratio <= 1.15:
                        raise RuntimeError(
                            f"{class_id}/{pose}/{direction} {key} identity ratio {ratio:.3f} is outside 0.85..1.15"
                        )

    def landmark_roi(line: list[list[float]], padding: int) -> list[int]:
        xs = [point[0] for point in line]
        ys = [point[1] for point in line]
        x0 = max(0, math.floor(min(xs)) - padding)
        y0 = max(0, math.floor(min(ys)) - padding)
        x1 = min(PLAYER_CELL, math.ceil(max(xs)) + padding + 1)
        y1 = min(PLAYER_CELL, math.ceil(max(ys)) + padding + 1)
        return [x0, y0, x1 - x0, y1 - y0]

    base_equipment_coverage = _load_base_equipment_coverage()
    available_family_count = _require_planned_equipment_absent(base_equipment_coverage)
    starter_loadout_authorship = _load_starter_loadout_authorship()
    if PLAYER_EQUIPMENT_AUTHORSHIP.is_file():
        equipment_authorship = json.loads(
            PLAYER_EQUIPMENT_AUTHORSHIP.read_text(encoding="utf-8"),
            object_pairs_hook=_reject_duplicate_json_keys,
        )
    elif available_family_count:
        raise RuntimeError(
            "available modular player equipment requires strict authored-equipment provenance: "
            f"{PLAYER_EQUIPMENT_AUTHORSHIP.relative_to(ROOT)}"
        )
    else:
        equipment_authorship = {
            "version": 1,
            "sourceKind": "authored-final-aligned",
            "review": "visual-contact-sheet-v1",
            "root": "assets/sprites_src/player_rig_authored",
            "files": {},
        }
    expected_authorship_keys = {"version", "sourceKind", "review", "root", "files"}
    if set(equipment_authorship) != expected_authorship_keys:
        raise RuntimeError(f"equipmentAuthorship v1 keys must be {sorted(expected_authorship_keys)}")
    if (equipment_authorship.get("version") != 1 or
            equipment_authorship.get("sourceKind") != "authored-final-aligned" or
            equipment_authorship.get("review") != "visual-contact-sheet-v1" or
            equipment_authorship.get("root") != "assets/sprites_src/player_rig_authored"):
        raise RuntimeError("equipmentAuthorship v1 provenance contract changed")
    authorship_files = equipment_authorship.get("files")
    if not isinstance(authorship_files, dict):
        raise RuntimeError("equipmentAuthorship v1 files must be an object")
    used_authorship_files: set[str] = set()

    def validate_equipment_authorship(source_rel: str, class_id: str, slot: str,
                                      family: str, plane: str, material: str | None) -> None:
        normalized = Path(source_rel).as_posix()
        required_prefix = f"assets/sprites_src/player_rig_authored/{class_id}/"
        if not normalized.startswith(required_prefix):
            raise RuntimeError(
                f"{class_id}/{slot}/{family}/{plane} must use checked-in authored equipment under "
                f"{required_prefix}; rejected legacy/generated source {normalized}"
            )
        expected_prefix = f"{required_prefix}{slot}/{family}/"
        if not normalized.startswith(expected_prefix):
            raise RuntimeError(
                f"authored equipment must use an exact class/slot/family path under {expected_prefix}: {normalized}"
            )
        record = authorship_files.get(normalized)
        expected_record = {
            "class": class_id, "slot": slot, "family": family,
            "plane": plane, "material": material,
        }
        if not isinstance(record, dict) or set(record) != {*expected_record, "sha256"}:
            raise RuntimeError(f"missing or malformed equipmentAuthorship descriptor for {normalized}")
        for key, value in expected_record.items():
            if record.get(key) != value:
                raise RuntimeError(
                    f"equipmentAuthorship descriptor {normalized} {key}={record.get(key)!r}, expected {value!r}"
                )
        digest = record.get("sha256")
        if not isinstance(digest, str) or not re.fullmatch(r"[0-9a-f]{64}", digest):
            raise RuntimeError(f"equipmentAuthorship {normalized} has malformed SHA-256")
        source = ROOT / normalized
        if not source.is_file():
            raise RuntimeError(f"authored equipment source is missing: {normalized}")
        actual = hashlib.sha256(source.read_bytes()).hexdigest()
        if actual != digest:
            raise RuntimeError(
                f"authored equipment hash mismatch for {normalized}: manifest {digest}, actual {actual}"
            )
        used_authorship_files.add(normalized)

    maps["players"] = {}
    maps["playerStarterLoadouts"] = {}
    maps["playerPreviews"] = {}
    maps["playerRigs"] = {}
    maps["playerEquipmentCoverage"] = {
        "version": base_equipment_coverage["version"],
        "mode": base_equipment_coverage["mode"],
        "sourceKind": base_equipment_coverage["sourceKind"],
        "starterBaseIds": base_equipment_coverage["starterBaseIds"],
        "classes": {},
    }
    authored_sources: set[Path] = set()
    referenced_ids: set[str] = set()
    coverage: dict[str, dict] = {}

    def rendered_family_ids(family_def: dict, planes: tuple[str, ...]) -> set[str]:
        ids: set[str] = set()
        for plane in planes:
            masks = family_def.get("masks", {}).get(plane, {})
            if masks:
                ids.update(masks.values())
            elif family_def.get(plane):
                ids.add(family_def[plane])
        return ids

    class_scales: dict[str, float] = {}

    def add_source(source_rel: str, class_id: str, slot: str, family: str, plane: str,
                   material: str | None = None, core: bool = False) -> str:
        if slot not in ("body", "preview"):
            validate_equipment_authorship(source_rel, class_id, slot, family, plane, material)
        source = ROOT / source_rel
        img = _validate_rig_source(source, class_id, slot, family, plane)
        suffix = f".{material}" if material else ""
        asset_id = f"player.rig.{class_id}.{slot}.{family}.{plane}{'.mask' + suffix if material else ''}"
        output = OUT / "players" / "rigs" / class_id / slot / family / f"{plane}{'_mask_' + material if material else ''}.webp"
        save_webp(img, output, 96)
        entry = atlas_entry(output, PLAYER_CELL, 8, 9, (96, 184), "core" if core else f"player:{class_id}")
        entry.update({
            "rigRevision": PLAYER_RIG_REVISION, "rigClass": class_id, "rigSlot": slot,
            "rigFamily": family, "rigPlane": plane,
            "rigScale": class_scales[class_id], "rigScaleMethod": "class-shared-final-aligned",
        })
        if material:
            entry["maskMaterial"] = material
        entries[asset_id] = entry
        authored_sources.add(source)
        referenced_ids.add(asset_id)
        return asset_id

    def add_preview(source_rel: str, class_id: str) -> str:
        source = ROOT / source_rel
        if not source.is_file():
            raise RuntimeError(f"missing flattened title preview source for {class_id}: {source}")
        with Image.open(source) as opened:
            source_format, source_mode, source_size = opened.format, opened.mode, opened.size
            if source_format != "PNG" or source_mode != "RGBA" or source_size != (PLAYER_CELL * 8, PLAYER_CELL):
                raise RuntimeError(
                    f"player preview must be authored RGBA PNG 1536x192: {source} is "
                    f"{source_format} {source_mode} {source_size}"
                )
            img = opened.copy()
        for col in range(8):
            if not img.crop((col * PLAYER_CELL, 0, (col + 1) * PLAYER_CELL, PLAYER_CELL)).getchannel("A").getbbox():
                raise RuntimeError(f"player preview {class_id} direction {col} is empty")
        asset_id = f"player.rig.{class_id}.preview.neutral.preview"
        output = OUT / "players" / "rigs" / class_id / "preview.webp"
        save_webp(img, output, 96)
        entry = atlas_entry(output, PLAYER_CELL, 8, 1, (96, 184), "core")
        entry.update({
            "rigRevision": PLAYER_RIG_REVISION, "rigClass": class_id,
            "rigSlot": "preview", "rigFamily": "neutral", "rigPlane": "preview",
            "rigScale": class_scales[class_id], "rigScaleMethod": "class-shared-final-aligned",
        })
        entries[asset_id] = entry
        authored_sources.add(source)
        referenced_ids.add(asset_id)
        return asset_id

    def add_starter_loadout(class_id: str) -> str:
        """Pack the reviewed flattened starter body+weapon+light-chest atlas."""
        record = starter_loadout_authorship["classes"][class_id]
        source_rel = f"assets/sprites_src/player_starter_loadouts/{class_id}.png"
        source = ROOT / source_rel
        img = _validate_rig_source(source, class_id, "body", "starter", "body")
        asset_id = f"player.starter.{class_id}"
        output = OUT / "players" / "starter" / f"{class_id}.webp"
        save_lossless_webp(img, output)
        entry = atlas_entry(output, PLAYER_CELL, 8, 9, (96, 184), f"player:{class_id}")
        entry.update({
            "rigRevision": PLAYER_RIG_REVISION, "rigClass": class_id,
            "rigSlot": "starter", "rigFamily": "starter", "rigPlane": "flattened",
            "rigScale": class_scales[class_id], "rigScaleMethod": "class-shared-final-aligned",
            "isolateFrameSampling": True,
            "starterBaseIds": base_equipment_coverage["starterBaseIds"][class_id],
        })
        entries[asset_id] = entry
        authored_sources.add(source)
        referenced_ids.add(asset_id)
        return asset_id

    def pack_family(source_def: dict, class_id: str, slot: str, family: str,
                    planes: tuple[str, ...], core: bool = False) -> dict:
        expected_keys = {*planes, "masks"}
        if not isinstance(source_def, dict) or set(source_def) != expected_keys:
            raise RuntimeError(
                f"{class_id}/{slot}/{family} source definition keys must be {sorted(expected_keys)}"
            )
        source_masks = source_def.get("masks")
        if not isinstance(source_masks, dict) or not set(source_masks).issubset(planes):
            raise RuntimeError(f"{class_id}/{slot}/{family} masks must be keyed only by its declared planes")
        packed: dict = {plane: None for plane in planes}
        packed["masks"] = {}
        for plane in planes:
            source = source_def.get(plane)
            if source is not None and not isinstance(source, str):
                raise RuntimeError(f"{class_id}/{slot}/{family}/{plane} source must be a path string or null")
            plane_masks = source_masks.get(plane, {})
            if not isinstance(plane_masks, dict):
                raise RuntimeError(f"{class_id}/{slot}/{family}/{plane} masks must be an object")
            if plane_masks:
                packed["masks"][plane] = {}
            elif source:
                # Runtime material masks replace the painted base for their
                # plane; the base is neither decoded nor composited. Do not
                # pack or certify unreachable artwork.
                packed[plane] = add_source(source, class_id, slot, family, plane, core=core)
            for material, mask_source in sorted(plane_masks.items()):
                if material not in PLAYER_MATERIAL_ROLES:
                    raise RuntimeError(f"unsupported rig mask role {material} in {class_id}/{slot}/{family}/{plane}")
                if not isinstance(mask_source, str) or not mask_source:
                    raise RuntimeError(f"{class_id}/{slot}/{family}/{plane}/{material} mask source must be a path")
                packed["masks"][plane][material] = add_source(
                    mask_source, class_id, slot, family, plane, material=material, core=core,
                )
        return packed

    def rendered_source_refs(source_def: dict, planes: tuple[str, ...]) -> list[str]:
        """Return exactly the source layers the runtime composites.

        A plane's authored masks replace its painted base whenever any mask is
        declared. This mirrors SpriteAssets rather than treating masks as
        additive highlights.
        """
        refs: list[str] = []
        masks = source_def.get("masks", {})
        for plane in planes:
            plane_masks = masks.get(plane, {})
            if plane_masks:
                refs.extend(plane_masks.values())
            elif source_def.get(plane):
                refs.append(source_def[plane])
        return refs

    def validate_socket_contact(source_def: dict, class_id: str, slot: str,
                                family: str, runtime_frames: list[dict],
                                object_sockets: tuple[str, ...],
                                require_object: bool = True) -> None:
        object_refs = rendered_source_refs(source_def, ("rear", "held", "front"))
        grip_refs = rendered_source_refs(source_def, ("grip",))
        if require_object and not object_refs:
            raise RuntimeError(f"{class_id}/{slot}/{family} has no runtime-visible object planes")
        if not grip_refs:
            raise RuntimeError(f"{class_id}/{slot}/{family} has no runtime-visible grip plane")

        def load_alpha(refs: list[str]) -> list[Image.Image]:
            result = []
            for source_rel in refs:
                source = ROOT / source_rel
                with Image.open(source) as opened:
                    if opened.format != "PNG" or opened.mode != "RGBA" or opened.size != (1536, 1728):
                        raise RuntimeError(f"malformed contact source {source_rel}")
                    result.append(opened.getchannel("A").copy())
            return result

        object_alpha = load_alpha(object_refs)
        grip_alpha = load_alpha(grip_refs)

        def touches(alphas: list[Image.Image], index: int, point: list[int]) -> bool:
            col, row = index % 8, index // 8
            x = col * PLAYER_CELL + point[0]
            y = row * PLAYER_CELL + point[1]
            box = (max(col * PLAYER_CELL, x - 2), max(row * PLAYER_CELL, y - 2),
                   min((col + 1) * PLAYER_CELL, x + 3), min((row + 1) * PLAYER_CELL, y + 3))
            return any(alpha.crop(box).getextrema()[1] > 8 for alpha in alphas)

        def intersects_roi(alphas: list[Image.Image], index: int, roi: list[int]) -> bool:
            col, row = index % 8, index // 8
            x, y, width, height = roi
            box = (col * PLAYER_CELL + x, row * PLAYER_CELL + y,
                   col * PLAYER_CELL + x + width, row * PLAYER_CELL + y + height)
            return any(alpha.crop(box).getextrema()[1] > 8 for alpha in alphas)

        for index, frame_meta in enumerate(runtime_frames):
            for socket in object_sockets:
                point = frame_meta[socket]
                if require_object and not touches(object_alpha, index, point):
                    raise RuntimeError(
                        f"{class_id}/{slot}/{family} runtime object pixels miss {socket} by >2px at frame {index}"
                    )
                if not touches(grip_alpha, index, point):
                    raise RuntimeError(
                        f"{class_id}/{slot}/{family} gripping-hand pixels miss {socket} by >2px at frame {index}"
                    )
                roi_key = "mainHandROI" if socket == "mainGrip" else "offHandROI"
                if not intersects_roi(grip_alpha, index, frame_meta[roi_key]):
                    raise RuntimeError(
                        f"{class_id}/{slot}/{family} gripping-hand pixels do not intersect {roi_key} at frame {index}"
                    )

    for class_id in PLAYER_CLASSES:
        cfg = registration.get("classes", {}).get(class_id)
        if not cfg:
            raise RuntimeError(f"registration is missing player class {class_id}")
        render_scale = cfg.get("renderScale")
        if (not isinstance(render_scale, (int, float)) or isinstance(render_scale, bool) or
                float(render_scale) != 1.0):
            raise RuntimeError(f"{class_id} final-aligned renderScale must be 1.0")
        class_scales[class_id] = float(render_scale)
        source_map = cfg.get("sources") or {}
        expected_source_map_keys = {"body", "preview", "unarmed", "main", "shield", "head", "chest"}
        if not isinstance(source_map, dict) or set(source_map) != expected_source_map_keys:
            raise RuntimeError(f"{class_id} source map keys must be {sorted(expected_source_map_keys)}")
        equipment_declaration = base_equipment_coverage["classes"][class_id]
        equipment_sources = equipment_declaration["available"]
        planned_sources = equipment_declaration["planned"]
        frame_meta = cfg.get("frames")
        if not isinstance(frame_meta, list) or len(frame_meta) != 72:
            raise RuntimeError(f"{class_id} registration must contain exactly 72 frames")
        decoded_hand_markers = decode_hand_markers(class_id)
        runtime_frames = []
        for index, meta in enumerate(frame_meta):
            if meta.get("index") != index:
                raise RuntimeError(f"{class_id} registration frame order mismatch at {index}")
            if meta.get("handReview") != "authored-final-aligned-v3":
                raise RuntimeError(f"{class_id} frame {index} lacks v3 final-aligned hand review provenance")
            runtime_meta = {}
            for key, length in (("mainGrip", 2), ("offGrip", 2), ("headROI", 4), ("chestROI", 4),
                                ("mainHandROI", 4), ("offHandROI", 4)):
                value = meta.get(key)
                if not isinstance(value, list) or len(value) != length or not all(isinstance(v, int) for v in value):
                    raise RuntimeError(f"{class_id} frame {index} has malformed {key}")
                if key.endswith("Grip") and not all(0 <= v < PLAYER_CELL for v in value):
                    raise RuntimeError(f"{class_id} frame {index} has out-of-cell {key}")
                if key.endswith("ROI") and (value[0] < 0 or value[1] < 0 or value[2] <= 0 or value[3] <= 0 or
                                             value[0] + value[2] > PLAYER_CELL or value[1] + value[3] > PLAYER_CELL):
                    raise RuntimeError(f"{class_id} frame {index} has out-of-cell {key}")
                runtime_meta[key] = value
            identity_frame = landmark_classes[class_id]["frames"][index]
            expected_head_roi = landmark_roi(identity_frame["headLine"], 10)
            expected_chest_roi = landmark_roi(identity_frame["torsoLine"], 12)
            if runtime_meta["headROI"] != expected_head_roi:
                raise RuntimeError(f"{class_id} frame {index} headROI does not match reviewed headLine")
            if runtime_meta["chestROI"] != expected_chest_roi:
                raise RuntimeError(f"{class_id} frame {index} chestROI does not match reviewed torsoLine")
            for key in ("mainGrip", "offGrip", "mainHandROI", "offHandROI"):
                if runtime_meta[key] != decoded_hand_markers[index][key]:
                    raise RuntimeError(
                        f"{class_id} frame {index} {key} does not match the normative final-aligned marker atlas"
                    )
            runtime_frames.append(runtime_meta)

        body_source = source_map.get("body")
        if not body_source:
            raise RuntimeError(f"{class_id} has no neutral body source")
        expected_body_source = f"assets/sprites_src/player_rig/{class_id}/body.png"
        if body_source != expected_body_source:
            raise RuntimeError(f"{class_id} neutral body source must be {expected_body_source}")
        validate_body_landmarks(class_id, body_source)
        body_id = add_source(body_source, class_id, "body", "neutral", "body")
        maps["players"][class_id] = body_id
        unarmed_source = equipment_sources["unarmed"].get("unarmed")
        unarmed = None
        if unarmed_source:
            unarmed = pack_family(unarmed_source, class_id, "unarmed", "unarmed", ("rear", "held", "grip", "front"))
            validate_socket_contact(
                unarmed_source, class_id, "unarmed", "unarmed", runtime_frames,
                ("mainGrip", "offGrip"), require_object=False,
            )
        preview_source = source_map.get("preview")
        if not preview_source:
            raise RuntimeError(f"{class_id} has no flattened title preview source")
        expected_preview_source = f"assets/sprites_src/player_rig/{class_id}/preview.png"
        if preview_source != expected_preview_source:
            raise RuntimeError(f"{class_id} title preview source must be {expected_preview_source}")
        maps["playerPreviews"][class_id] = add_preview(preview_source, class_id)
        maps["playerStarterLoadouts"][class_id] = add_starter_loadout(class_id)

        rig = {
            "revision": PLAYER_RIG_REVISION, "body": body_id, "unarmed": unarmed,
            "starterLoadout": maps["playerStarterLoadouts"][class_id],
            "coverageMode": base_equipment_coverage["mode"],
            "main": {}, "shield": {}, "head": {}, "chest": {}, "frames": runtime_frames,
        }
        for family in PLAYER_MAIN_FAMILIES:
            source_def = equipment_sources["main"].get(family)
            if not source_def:
                continue
            rig["main"][family] = pack_family(source_def, class_id, "main", family, ("rear", "held", "grip", "front"))
            sockets = ("mainGrip", "offGrip") if family.endswith("_2h") else ("mainGrip",)
            validate_socket_contact(source_def, class_id, "main", family, runtime_frames, sockets)
        shield_def = equipment_sources["shield"].get("shield")
        if shield_def:
            rig["shield"]["shield"] = pack_family(shield_def, class_id, "shield", "shield", ("rear", "held", "grip", "front"))
            validate_socket_contact(shield_def, class_id, "shield", "shield", runtime_frames, ("offGrip",))
        for slot in ("head", "chest"):
            for family in PLAYER_ARMOR_FAMILIES:
                source_def = equipment_sources[slot].get(family)
                if not source_def:
                    continue
                rig[slot][family] = pack_family(source_def, class_id, slot, family, ("rear", "worn", "front"))
        available = {
            "unarmed": ["unarmed"] if unarmed else [],
            "main": sorted(rig["main"]), "shield": sorted(rig["shield"]),
            "head": sorted(rig["head"]), "chest": sorted(rig["chest"]),
        }
        planned = {
            "unarmed": sorted(planned_sources["unarmed"]),
            "main": sorted(planned_sources["main"]),
            "shield": sorted(planned_sources["shield"]),
            "head": sorted(planned_sources["head"]),
            "chest": sorted(planned_sources["chest"]),
        }
        unavailable = {
            "unarmed": sorted({"unarmed"} - ({"unarmed"} if unarmed else set())),
            "main": sorted(set(PLAYER_MAIN_FAMILIES) - set(rig["main"])),
            "shield": sorted({"shield"} - set(rig["shield"])),
            "head": sorted(set(PLAYER_ARMOR_FAMILIES) - set(rig["head"])),
            "chest": sorted(set(PLAYER_ARMOR_FAMILIES) - set(rig["chest"])),
        }
        rig["available"] = available
        rig["planned"] = planned
        rig["unavailable"] = unavailable
        maps["playerRigs"][class_id] = rig
        maps["playerEquipmentCoverage"]["classes"][class_id] = {
            "available": available, "planned": planned, "unavailable": unavailable,
        }
        coverage[class_id] = {
            "unarmed": ["unarmed"] if unarmed else [],
            "main": sorted(rig["main"]), "shield": sorted(rig["shield"]),
            "head": sorted(rig["head"]), "chest": sorted(rig["chest"]),
            "planned": planned, "unavailable": unavailable, "frames": len(rig["frames"]),
        }

    extra_authorship = sorted(set(authorship_files) - used_authorship_files)
    if extra_authorship:
        raise RuntimeError(
            "equipmentAuthorship v1 contains unreferenced descriptors: " + ", ".join(extra_authorship[:8])
        )

    rendered_ids: set[str] = set()
    for rig in maps["playerRigs"].values():
        rendered_ids.add(rig["body"])
        rendered_ids.add(rig["starterLoadout"])
        if rig["unarmed"]:
            rendered_ids.update(rendered_family_ids(rig["unarmed"], ("rear", "held", "grip", "front")))
        for family in rig["main"].values():
            rendered_ids.update(rendered_family_ids(family, ("rear", "held", "grip", "front")))
        for family in rig["shield"].values():
            rendered_ids.update(rendered_family_ids(family, ("rear", "held", "grip", "front")))
        for slot in ("head", "chest"):
            for family in rig[slot].values():
                rendered_ids.update(rendered_family_ids(family, ("rear", "worn", "front")))

    return {
        "revision": PLAYER_RIG_REVISION,
        "classes": list(PLAYER_CLASSES), "mainFamilies": list(PLAYER_MAIN_FAMILIES),
        "armorFamilies": list(PLAYER_ARMOR_FAMILIES), "materials": list(PLAYER_MATERIAL_ROLES),
        "coverageMode": base_equipment_coverage["mode"],
        "starterBaseIds": base_equipment_coverage["starterBaseIds"],
        "availableFamilyCount": sum(
            (1 if node["unarmed"] else 0) + len(node["main"]) + len(node["shield"]) + len(node["head"]) + len(node["chest"])
            for node in maps["playerRigs"].values()
        ),
        "sourceCount": len(authored_sources), "assetCount": len(referenced_ids),
        "renderedAssetCount": len(rendered_ids), "renderedAssetIds": sorted(rendered_ids),
        "bodyIdentityLandmarkFrames": len(PLAYER_CLASSES) * len(PLAYER_POSES) * len(PLAYER_DIRS),
        "bodyIdentityLandmarkReview": "visual-overlay-v1",
        "referencedAssetIds": sorted(referenced_ids), "coverage": coverage,
    }


def _equipment_canonical_path(class_id: str, slot: str, family: str,
                              plane: str, material: str | None) -> str:
    filename = f"{plane}_mask_{material}.png" if material else f"{plane}.png"
    return (
        f"assets/sprites_src/player_rig_authored/{class_id}/"
        f"{slot}/{family}/{filename}"
    )


def audit_player_equipment_sources(class_id: str | None = None) -> dict:
    """Report the exact artist-authored equipment backlog without packing.

    Declared ``available`` coverage is the source of truth for occlusion
    planes and material roles; ``planned`` is reported but never treated as
    shippable. This audit mirrors the runtime's replacement semantics: a
    nonempty material-mask map replaces its painted base plane. A class scope
    additionally requires that class's complete 21-family equipment matrix.
    The audit does not create directories, raster files, provenance, or
    runtime outputs.
    """
    errors: list[str] = []
    if class_id is not None and class_id not in PLAYER_CLASSES:
        return {
            "version": 1, "status": "blocked", "errors": [
                f"unsupported player-equipment audit class {class_id!r}; "
                f"expected one of {list(PLAYER_CLASSES)}"
            ],
        }
    audited_classes = (class_id,) if class_id is not None else PLAYER_CLASSES
    try:
        registration = json.loads(
            PLAYER_RIG_REGISTRATION.read_text(encoding="utf-8"),
            object_pairs_hook=_reject_duplicate_json_keys,
        )
    except Exception as exc:
        return {
            "version": 1, "status": "blocked", "errors": [
                f"player equipment registration is missing or malformed: {exc}"
            ],
        }

    try:
        declared_coverage = _load_base_equipment_coverage()
    except Exception as exc:
        return {
            "version": 1, "status": "blocked", "errors": [str(exc)],
        }

    authorship: dict | None = None
    authorship_error: str | None = None
    if not PLAYER_EQUIPMENT_AUTHORSHIP.is_file():
        authorship_error = (
            "missing strict authored-equipment provenance: "
            f"{PLAYER_EQUIPMENT_AUTHORSHIP.relative_to(ROOT).as_posix()}"
        )
    else:
        try:
            authorship = json.loads(
                PLAYER_EQUIPMENT_AUTHORSHIP.read_text(encoding="utf-8"),
                object_pairs_hook=_reject_duplicate_json_keys,
            )
        except Exception as exc:
            authorship_error = f"equipmentAuthorship v1 is malformed: {exc}"

    expected_top = {"version", "sourceKind", "review", "root", "files"}
    if authorship is not None:
        if set(authorship) != expected_top:
            authorship_error = f"equipmentAuthorship v1 keys must be {sorted(expected_top)}"
        elif (
            authorship.get("version") != 1
            or authorship.get("sourceKind") != "authored-final-aligned"
            or authorship.get("review") != "visual-contact-sheet-v1"
            or authorship.get("root") != "assets/sprites_src/player_rig_authored"
            or not isinstance(authorship.get("files"), dict)
        ):
            authorship_error = "equipmentAuthorship v1 provenance contract changed"
    files = authorship.get("files", {}) if authorship is not None and not authorship_error else {}

    registration_classes = registration.get("classes")
    if not isinstance(registration_classes, dict) or set(registration_classes) != set(PLAYER_CLASSES):
        errors.append("registration must cover exactly the five player classes")
    classes = declared_coverage["classes"]

    roles: list[dict] = []
    batches: list[dict] = []
    seen_current: dict[str, list[str]] = {}
    required_by_slot = {
        "unarmed": ("grip",),
        "main": ("held", "grip"),
        "shield": ("held", "grip"),
        "head": ("worn",),
        "chest": ("worn",),
    }
    group_planes = {
        "unarmed": ("rear", "held", "grip", "front"),
        "main": ("rear", "held", "grip", "front"),
        "shield": ("rear", "held", "grip", "front"),
        "head": ("rear", "worn", "front"),
        "chest": ("rear", "worn", "front"),
    }

    planned_family_count = 0
    planned_refs: list[str] = []
    for current_class_id in audited_classes:
        class_coverage = (
            classes.get(current_class_id, {}) if isinstance(classes, dict) else {}
        )
        available_sources = class_coverage.get("available", {})
        planned_sources = class_coverage.get("planned", {})
        if not isinstance(available_sources, dict):
            errors.append(f"{current_class_id}/available coverage branch is missing")
            available_sources = {}
        if not isinstance(planned_sources, dict):
            errors.append(f"{current_class_id}/planned coverage branch is missing")
            planned_sources = {}
        groups = (
            ("unarmed", available_sources.get("unarmed")),
            ("main", available_sources.get("main")),
            ("shield", available_sources.get("shield")),
            ("head", available_sources.get("head")),
            ("chest", available_sources.get("chest")),
        )
        for slot, families in groups:
            if not isinstance(families, dict):
                errors.append(
                    f"{current_class_id}/available/{slot} family source map is missing"
                )
                continue
            for family, definition in sorted(families.items()):
                label = f"{current_class_id}/{slot}/{family}"
                if not isinstance(definition, dict):
                    errors.append(f"{label} source definition is missing")
                    continue
                planes = group_planes[slot]
                expected_keys = {*planes, "masks"}
                if set(definition) != expected_keys:
                    errors.append(f"{label} keys must be {sorted(expected_keys)}")
                    continue
                masks = definition.get("masks")
                if not isinstance(masks, dict) or not set(masks).issubset(planes):
                    errors.append(f"{label} masks must be keyed only by {list(planes)}")
                    continue
                rendered_planes: set[str] = set()
                batch_role_start = len(roles)
                for plane in planes:
                    base = definition.get(plane)
                    plane_masks = masks.get(plane, {})
                    if not isinstance(plane_masks, dict):
                        errors.append(f"{label}/{plane} masks must be an object")
                        continue
                    if plane_masks and base is not None:
                        errors.append(
                            f"{label}/{plane} retains an unreachable base beneath replacement masks"
                        )
                    rendered_refs = sorted(plane_masks.items()) if plane_masks else (
                        [(None, base)] if isinstance(base, str) and base else []
                    )
                    if rendered_refs:
                        rendered_planes.add(plane)
                    for material, current_source in rendered_refs:
                        if material is not None and material not in PLAYER_MATERIAL_ROLES:
                            errors.append(f"{label}/{plane} uses unsupported material role {material!r}")
                        canonical = _equipment_canonical_path(
                            current_class_id, slot, family, plane, material,
                        )
                        role_id = "/".join(
                            [current_class_id, slot, family, plane]
                            + ([material] if material is not None else [])
                        )
                        seen_current.setdefault(str(current_source), []).append(role_id)
                        descriptor = files.get(canonical)
                        descriptor_ok = isinstance(descriptor, dict) and descriptor == {
                            "class": current_class_id, "slot": slot, "family": family,
                            "plane": plane, "material": material,
                            "sha256": descriptor.get("sha256") if isinstance(descriptor, dict) else None,
                        }
                        canonical_path = ROOT / canonical
                        source_ok = False
                        hash_ok = False
                        decode_ok = False
                        if canonical_path.is_file():
                            source_ok = True
                            try:
                                _validate_rig_source(
                                    canonical_path, current_class_id, slot, family, plane,
                                )
                                decode_ok = True
                            except Exception:
                                decode_ok = False
                            if descriptor_ok:
                                digest = descriptor.get("sha256")
                                hash_ok = (
                                    isinstance(digest, str)
                                    and re.fullmatch(r"[0-9a-f]{64}", digest) is not None
                                    and hashlib.sha256(canonical_path.read_bytes()).hexdigest() == digest
                                )
                        roles.append({
                            "role": role_id,
                            "class": current_class_id, "slot": slot, "family": family,
                            "plane": plane, "material": material,
                            "logicalFrames": 72,
                            "canonicalSource": canonical,
                            "registeredSource": current_source,
                            "registrationCanonical": current_source == canonical,
                            "sourceExists": source_ok,
                            "sourceDecodes": decode_ok,
                            "authorshipDescriptorValid": descriptor_ok and hash_ok,
                        })
                missing_required = sorted(set(required_by_slot[slot]) - rendered_planes)
                if missing_required:
                    errors.append(f"{label} is missing required runtime planes {missing_required}")
                batches.append({
                    "class": current_class_id, "slot": slot, "family": family,
                    "logicalFrames": 72, "atlasFiles": len(roles) - batch_role_start,
                    "planes": sorted(rendered_planes),
                    "canonicalDirectory": (
                        f"assets/sprites_src/player_rig_authored/{current_class_id}/{slot}/{family}"
                    ),
                })

        for slot, families in planned_sources.items():
            if not isinstance(families, dict):
                # _load_base_equipment_coverage normally catches this first;
                # retain a local fail-closed guard for a stable audit result.
                errors.append(
                    f"{current_class_id}/planned/{slot} family source map is missing"
                )
                continue
            planned_family_count += len(families)
            for family, definition in sorted(families.items()):
                planned_refs.extend(
                    _declared_equipment_refs(
                        definition, current_class_id, slot, family,
                    )
                )

    shared_registration_refs = {
        source: role_ids for source, role_ids in sorted(seen_current.items())
        if len(role_ids) > 1
    }
    by_slot: dict[str, dict] = {}
    for slot in required_by_slot:
        slot_roles = [role for role in roles if role["slot"] == slot]
        slot_batches = [batch for batch in batches if batch["slot"] == slot]
        by_slot[slot] = {
            "familyDeliveries": len(slot_batches), "atlasFiles": len(slot_roles),
            "logicalFamilyFrames": len(slot_batches) * 72,
            "sourceLayerFrames": len(slot_roles) * 72,
        }
    by_material: dict[str, int] = {}
    for role in roles:
        material = role["material"] or "base"
        by_material[material] = by_material.get(material, 0) + 1
    equipment_batch_count = sum(1 for batch in batches if batch["slot"] != "unarmed")

    completion_missing: dict[str, dict[str, list[str]]] = {}
    if class_id is not None:
        # A class-scoped audit is the handoff gate for finishing one class
        # while the repository remains in declared-partial mode. Neutral body
        # art supplies bare hands, so unarmed is intentionally optional; all
        # actual equipment families must be promoted and proven.
        complete_equipment = {
            "main": set(PLAYER_MAIN_FAMILIES),
            "shield": {"shield"},
            "head": set(PLAYER_ARMOR_FAMILIES),
            "chest": set(PLAYER_ARMOR_FAMILIES),
        }
        available = declared_coverage["classes"][class_id]["available"]
        missing_by_slot = {
            slot: sorted(expected - set(available[slot]))
            for slot, expected in complete_equipment.items()
            if expected - set(available[slot])
        }
        if missing_by_slot:
            completion_missing[class_id] = missing_by_slot

    missing_sources = [role["canonicalSource"] for role in roles if not role["sourceExists"]]
    invalid_sources = [
        role["role"] for role in roles
        if role["sourceExists"] and not role["sourceDecodes"]
    ]
    noncanonical_refs = [role["role"] for role in roles if not role["registrationCanonical"]]
    invalid_descriptors = [role["role"] for role in roles if not role["authorshipDescriptorValid"]]
    used_canonical_sources = {role["canonicalSource"] for role in roles}
    scoped_authorship_sources = {
        source for source, descriptor in files.items()
        if (
            any(
                source.startswith(
                    f"assets/sprites_src/player_rig_authored/{audited_class_id}/"
                )
                for audited_class_id in audited_classes
            )
            or (
                isinstance(descriptor, dict)
                and descriptor.get("class") in audited_classes
            )
        )
    }
    extra_authorship_sources = sorted(scoped_authorship_sources - used_canonical_sources)
    present_planned_sources = sorted(ref for ref in planned_refs if (ROOT / ref).is_file())
    blockers = []
    # A missing ledger is valid only when the selected scope has no available
    # runtime-visible roles, exactly matching build preflight. A present but
    # malformed ledger always blocks.
    effective_authorship_error = (
        authorship_error
        if roles or PLAYER_EQUIPMENT_AUTHORSHIP.is_file()
        else None
    )
    if effective_authorship_error:
        blockers.append(effective_authorship_error)
    if noncanonical_refs:
        blockers.append(f"{len(noncanonical_refs)} registration roles are outside canonical authored paths")
    if missing_sources:
        blockers.append(f"{len(missing_sources)} canonical authored atlas files are missing")
    if invalid_sources:
        blockers.append(f"{len(invalid_sources)} canonical authored atlas files are malformed")
    if invalid_descriptors:
        blockers.append(f"{len(invalid_descriptors)} authorship descriptors/hashes are missing or invalid")
    if shared_registration_refs:
        blockers.append(
            f"{len(shared_registration_refs)} registered source paths are shared across family roles"
        )
    if extra_authorship_sources:
        blockers.append(
            f"{len(extra_authorship_sources)} selected-class authorship descriptors are unreferenced"
        )
    if present_planned_sources:
        blockers.append(
            f"{len(present_planned_sources)} planned source files exist without promotion to available"
        )
    if completion_missing:
        missing_count = sum(
            len(families)
            for missing_by_slot in completion_missing.values()
            for families in missing_by_slot.values()
        )
        blockers.append(
            f"{missing_count} required equipment families are not available in the scoped class"
        )
    blockers.extend(errors)
    return {
        "version": 1,
        "status": "ready" if not blockers else "blocked",
        "firstBuildBlocker": effective_authorship_error,
        "scope": {
            "classes": list(audited_classes),
            "branch": "available",
            "requiresCompleteEquipmentMatrix": class_id is not None,
        },
        "registration": PLAYER_RIG_REGISTRATION.relative_to(ROOT).as_posix(),
        "authorship": PLAYER_EQUIPMENT_AUTHORSHIP.relative_to(ROOT).as_posix(),
        "coverageDeclaration": PLAYER_BASE_EQUIPMENT_COVERAGE.relative_to(ROOT).as_posix(),
        "contract": {
            "cell": [192, 192], "atlas": [1536, 1728], "anchor": [96, 184],
            "directions": list(PLAYER_DIRS), "poses": list(PLAYER_POSES),
            "framesPerAtlas": 72, "sourceKind": "authored-final-aligned",
            "review": "visual-contact-sheet-v1",
            "coverageMode": declared_coverage["mode"],
            "maskSemantics": "nonempty plane masks replace the painted base",
        },
        "counts": {
            "classes": len(audited_classes),
            "declaredClasses": len(PLAYER_CLASSES),
            "equipmentFamilyDeliveries": equipment_batch_count,
            "plannedFamilyDeliveries": planned_family_count,
            "familyDeliveriesIncludingUnarmed": len(batches),
            "equipmentLogicalFrames": equipment_batch_count * 72,
            "logicalFramesIncludingUnarmed": len(batches) * 72,
            "atlasFiles": len(roles), "sourceLayerFrames": len(roles) * 72,
            "canonicalRegistrationRefs": len(roles) - len(noncanonical_refs),
            "canonicalSourcesPresent": len(roles) - len(missing_sources),
            "canonicalSourcesDecodable": len(roles) - len(missing_sources) - len(invalid_sources),
            "validAuthorshipDescriptors": len(roles) - len(invalid_descriptors),
        },
        "starterLoadouts": declared_coverage["starterBaseIds"],
        "declaredAvailability": {
            current_class_id: {
                slot: sorted(family_map)
                for slot, family_map in declared_coverage["classes"][current_class_id]["available"].items()
            }
            for current_class_id in audited_classes
        },
        "declaredPlanned": {
            current_class_id: {
                slot: sorted(family_map)
                for slot, family_map in declared_coverage["classes"][current_class_id]["planned"].items()
            }
            for current_class_id in audited_classes
        },
        "bySlot": by_slot, "byMaterial": dict(sorted(by_material.items())),
        "blockers": blockers,
        "sharedRegistrationRefs": shared_registration_refs,
        "extraAuthorshipSources": extra_authorship_sources,
        "presentPlannedSources": present_planned_sources,
        "completionMissingFamilies": completion_missing,
        "batches": batches,
        "roles": roles,
    }


def _require_player_equipment_authorship_preflight() -> None:
    """Validate declared equipment/starter gates before any pack writes."""
    coverage = _load_base_equipment_coverage()
    available_family_count = _require_planned_equipment_absent(coverage)
    _load_starter_loadout_authorship()
    if available_family_count and not PLAYER_EQUIPMENT_AUTHORSHIP.is_file():
        raise RuntimeError(
            "available modular player equipment requires strict authored-equipment provenance: "
            f"{PLAYER_EQUIPMENT_AUTHORSHIP.relative_to(ROOT).as_posix()}"
        )


def _skill_icon_keys() -> list[str]:
    keys = sorted(set(re.findall(r'icon\s*:\s*"(@[^"]+)"', DATA_JS.read_text(encoding="utf-8"))))
    return ["basic", *keys]


def _expected_gameplay_descriptors(art: dict, monsters: dict, npcs: dict, summons: dict) -> dict[str, dict]:
    descriptors: dict[str, dict] = {}

    def atlas(role: str, key: str, path: str, size: tuple[int, int], cell: tuple[int, int],
              cols: int, rows: int, anchor: tuple[int, int], bundle: str, asset_id: str) -> None:
        descriptors[f"{role}:{key}"] = {
            "sourceKind": GAMEPLAY_ART_SOURCE_KIND, "review": GAMEPLAY_ART_REVIEW,
            "path": path, "sha256": None, "role": role, "key": key,
            "provenance": None,
            "kind": "atlas", "size": list(size), "cell": list(cell),
            "cols": cols, "rows": rows, "anchor": list(anchor),
            "bundle": bundle, "assetId": asset_id,
        }

    def static(role: str, key: str, path: str, size: tuple[int, int] | None,
               anchor: tuple[int, int] | None, bundle: str, asset_id: str,
               *, display_height: int | None = None, tint_key: str | None = None) -> None:
        descriptor = {
            "sourceKind": GAMEPLAY_ART_SOURCE_KIND, "review": GAMEPLAY_ART_REVIEW,
            "path": path, "sha256": None, "role": role, "key": key,
            "provenance": None,
            "kind": "static", "size": list(size) if size else None,
            "anchor": list(anchor) if anchor else None, "bundle": bundle, "assetId": asset_id,
        }
        if display_height is not None:
            descriptor["displayHeight"] = display_height
        if tint_key is not None:
            descriptor["tintKey"] = tint_key
        descriptors[f"{role}:{key}"] = descriptor

    def authored_static(role: str, key: str, path: str, bundle: str, asset_id: str,
                        *, display_height: int | None = None, tint_key: str | None = None) -> None:
        descriptor = {
            "sourceKind": GAMEPLAY_ART_SOURCE_KIND, "review": GAMEPLAY_ART_REVIEW,
            "path": path, "sha256": None, "role": role, "key": key,
            "provenance": None,
            "kind": "static", "size": None, "anchor": None,
            "bundle": bundle, "assetId": asset_id,
        }
        if display_height is not None:
            descriptor["displayHeight"] = display_height
        if tint_key is not None:
            descriptor["tintKey"] = tint_key
        descriptors[f"{role}:{key}"] = descriptor

    for art_key in sorted(art):
        if art_key.startswith("ground_") and "src" in art[art_key]:
            key = art_key[7:]
            atlas("ground", key, f"assets/sprites_src/gameplay_art/world/grounds/{key}.png",
                  (256, 32), (64, 32), 4, 1, (32, 16), f"zone:{key}", f"world.ground.{key}")
        elif art_key.startswith("hazard_") and "src" in art[art_key]:
            key = art_key[7:]
            atlas("hazard", key, f"assets/sprites_src/gameplay_art/world/hazards/{key}.png",
                  (256, 32), (64, 32), 4, 1, (32, 16), "world", f"world.hazard.{key}")
    for key in THEMES:
        atlas("path", key, f"assets/sprites_src/gameplay_art/world/paths/{key}.png",
              (256, 128), (64, 32), 4, 4, (32, 16), "world", f"world.path.{key}")
        atlas("cliff", key, f"assets/sprites_src/gameplay_art/world/cliffs/{key}.png",
              (256, 256), (64, 128), 4, 2, (32, 0), "world", f"world.cliff.{key}")
    for key in WALL_THEMES:
        atlas("wall", key, f"assets/sprites_src/gameplay_art/world/walls/{key}.png",
              (512, 512), (128, 128), 4, 4, (64, 112), "world", f"world.wall.{key}")
    for key in TRAP_KINDS:
        static("trap", key, f"assets/sprites_src/gameplay_art/world/traps/{key}.png",
               (32, 24), (16, 18), "world", f"world.trap.{key}")
    for key in FORM_IDS:
        static("form", key, f"assets/sprites_src/gameplay_art/actors/forms/{key}.png",
               (192, 192), (96, 178), "actors", f"actor.form.{key}")
    for key in BACKDROP_THEMES:
        static("backdrop", key, f"assets/sprites_src/gameplay_art/world/backdrops/{key}.png",
               (1920, 1080), (0, 0), "world", f"world.backdrop.{key}")

    # Massifs, props, monsters, and NPCs already start from painted files, but
    # the old compiler still manufactured runtime geometry by trimming,
    # resizing, and repositioning them. They therefore move into the same
    # final-aligned source contract instead of retaining an implicit exception.
    for art_key, cfg in sorted(art.items()):
        if not isinstance(cfg, dict) or "src" not in cfg:
            continue
        if art_key.startswith("massif_"):
            key = art_key[7:]
            authored_static("massif", key, f"assets/sprites_src/gameplay_art/world/massifs/{key}.png",
                            "world", f"world.massif_{key}")
        elif art_key.startswith("prop_"):
            key = art_key[5:]
            authored_static("prop", key, f"assets/sprites_src/gameplay_art/world/props/{key}.png",
                            "world", f"world.prop.{key}")

    for namespace, defs in (("monster", monsters), ("npc", npcs)):
        for key, cfg in sorted(defs.items()):
            if "src" not in cfg:
                continue
            authored_static(namespace, key, f"assets/sprites_src/gameplay_art/actors/{namespace}s/{key}.png",
                            "actors", f"actor.{namespace}.{key}")

    for key, cfg in sorted(summons.items()):
        if "src" not in cfg:
            continue
        atlas("summon", key, f"assets/sprites_src/gameplay_art/actors/summons/{key}.png",
              (1536, 1344), (192, 192), 8, 7, (96, 186), "actors", f"actor.summon.{key}")
        descriptor = descriptors[f"summon:{key}"]
        descriptor["displayHeight"] = cfg.get("height") or 66
        if cfg.get("tintKey"):
            descriptor["tintKey"] = cfg["tintKey"]

    atlas("item-icons", "equipment", "assets/sprites_src/gameplay_art/ui/items_equipment.png",
          (1088, 896), (64, 64), 17, 14, (32, 32), "core", "ui.items.equipment")
    atlas("item-icons", "misc", "assets/sprites_src/gameplay_art/ui/items_misc.png",
          (448, 64), (64, 64), 7, 1, (32, 32), "core", "ui.items.misc")
    atlas("item-icons", "variants", "assets/sprites_src/gameplay_art/ui/items_variants.png",
          (384, 320), (64, 64), 6, 5, (32, 32), "core", "ui.items.variants")
    atlas("item-icons", "oak", "assets/sprites_src/gameplay_art/ui/items_oak.png",
          (1254, 1254), (1254, 1254), 1, 1, (627, 627), "core", "ui.items.oak")
    atlas("skill-icons", "skills", "assets/sprites_src/gameplay_art/ui/skills.png",
          (528, 396), (44, 44), 12, 9, (22, 22), "core", "ui.skills")
    return descriptors


def _read_png_descriptor(path: Path, expected_size: list[int] | None) -> tuple[Image.Image | None, str | None]:
    try:
        with Image.open(path) as opened:
            if opened.format != "PNG" or opened.mode != "RGBA":
                return None, f"must be RGBA PNG, found {opened.format} {opened.mode}"
            image = opened.copy()
    except Exception as exc:
        return None, f"is undecodable: {exc}"
    if expected_size is not None and list(image.size) != expected_size:
        return None, f"must be {expected_size[0]}x{expected_size[1]}, found {image.width}x{image.height}"
    if not image.getchannel("A").getbbox():
        return None, "contains no visible alpha"
    return image, None


def _validate_descriptor_frames(descriptor: dict, image: Image.Image) -> str | None:
    if descriptor["kind"] != "atlas":
        return None
    cw, ch = descriptor["cell"]
    missing: list[int] = []
    for index in range(descriptor["cols"] * descriptor["rows"]):
        col, row = index % descriptor["cols"], index // descriptor["cols"]
        if not image.crop((col * cw, row * ch, (col + 1) * cw, (row + 1) * ch)).getchannel("A").getbbox():
            missing.append(index)
    if missing:
        return f"has empty required frames {missing}"
    if descriptor["role"] in ("ground", "hazard"):
        for index in range(descriptor["cols"] * descriptor["rows"]):
            col, row = index % descriptor["cols"], index // descriptor["cols"]
            frame = image.crop((col * cw, row * ch, (col + 1) * cw, (row + 1) * ch))
            alpha = frame.getchannel("A")
            corners = ((cw // 2, 0), (cw - 1, ch // 2), (cw // 2, ch - 1), (0, ch // 2))
            if any(alpha.getpixel(point) <= 8 for point in corners):
                return f"frame {index} does not cover its authored 64x32 diamond footprint"
    if descriptor["role"] in ("path", "wall"):
        cw, ch = descriptor["cell"]
        if descriptor["role"] == "path":
            # Runtime neighbor deltas are N(+32,-16), E(+32,+16),
            # S(-32,+16), W(-32,-16).  Connections therefore cross the
            # midpoint of the shared isometric diamond edge—not the cardinal
            # midpoint of the rectangular 64x32 atlas cell.
            points = {1: (48, 8), 2: (48, 24), 4: (16, 24), 8: (16, 8)}
            center = (cw // 2, ch // 2)
        else:
            # Wall sockets sit on the declared 64x32 footprint whose center is
            # the [64,112] anchor; the upper 72px are the authored wall rise.
            ax, ay = descriptor["anchor"]
            points = {1: (ax, ay - 16), 2: (ax + 31, ay), 4: (ax, ay + 15), 8: (ax - 32, ay)}
            center = (ax, ay)
        adjacency_alphas: list[Image.Image] = []
        for mask in range(16):
            frame = image.crop(((mask % 4) * cw, (mask // 4) * ch,
                                (mask % 4 + 1) * cw, (mask // 4 + 1) * ch))
            alpha = frame.getchannel("A")
            adjacency_alphas.append(alpha)
            if alpha.getpixel(center) <= 8:
                return f"adjacency frame {mask} does not cover its authored center socket"
            for bit, point in points.items():
                if descriptor["role"] == "path":
                    x, y = point
                    window = [
                        alpha.getpixel((px, py)) > 8
                        for py in range(y - 2, y + 3)
                        for px in range(x - 2, x + 3)
                    ]
                    if mask & bit:
                        if not any(window):
                            return f"path frame {mask} misses connected bit {bit} near iso socket {point}"
                    elif alpha.getpixel(point) > 8:
                        return f"path frame {mask} open bit {bit} covers exact iso socket {point}"
                elif bool(mask & bit) != (alpha.getpixel(point) > 8):
                    state = "connected" if mask & bit else "open"
                    return f"adjacency frame {mask} {state} socket bit {bit} is incorrect at {point}"
        if descriptor["role"] == "path":
            # A neighbor is translated by exactly twice the local socket
            # vector. Thus equal offsets in the two reciprocal 5x5 windows
            # occupy equal world pixels and must share at least one visible
            # sample for every pair of masks that claims the connection.
            reciprocal = {1: 4, 2: 8, 4: 1, 8: 2}
            for bit, opposite in reciprocal.items():
                x, y = points[bit]
                ox, oy = points[opposite]
                for mask in range(16):
                    if not mask & bit:
                        continue
                    for neighbor_mask in range(16):
                        if not neighbor_mask & opposite:
                            continue
                        left = adjacency_alphas[mask]
                        right = adjacency_alphas[neighbor_mask]
                        if not any(
                            left.getpixel((x + dx, y + dy)) > 8
                            and right.getpixel((ox + dx, oy + dy)) > 8
                            for dy in range(-2, 3) for dx in range(-2, 3)
                        ):
                            return (
                                f"path frames {mask}/{neighbor_mask} have no reciprocal 5x5 seam overlap "
                                f"for bits {bit}/{opposite}"
                            )
    if descriptor["role"] == "wall":
        # The 72px rise is visual geometry, measured from the [64,112] root to
        # a y=40 top (±2px for antialiasing).  The 128px cell itself guarantees
        # nothing can paint below y=127 or escape into an adjacent frame.
        for mask in range(16):
            col, row = mask % 4, mask // 4
            frame = image.crop((col * 128, row * 128, (col + 1) * 128, (row + 1) * 128))
            alpha = frame.getchannel("A")
            bbox = alpha.getbbox()
            visible = [(x, y) for y in range(128) for x in range(128) if alpha.getpixel((x, y)) > 8]
            top = min((point[1] for point in visible), default=None)
            if top is None or not 38 <= top <= 42:
                return f"wall frame {mask} top must retain its 72px rise at y=40±2, found {top} ({bbox})"
            if not alpha.crop((0, 38, 128, 43)).getbbox():
                return f"wall frame {mask} has no authored alpha in its y=40 top band"
            if not alpha.crop((32, 96, 96, 128)).getbbox():
                return f"wall frame {mask} does not occupy its 64x32 footprint"
    if descriptor["role"] == "cliff":
        # Cliff frames are authored complete southwest/southeast faces rooted
        # at the tile's top corner [32,0].  The four columns are increasing
        # elevation depths.  Validate that geometry directly so an atlas
        # cannot satisfy the contract with metadata or arbitrary nonempty art.
        heights: list[int] = []
        seam_profiles: list[set[int]] = []
        for index in range(8):
            col, row = index % 4, index // 4
            frame = image.crop((col * 64, row * 128, (col + 1) * 64, (row + 1) * 128))
            alpha = frame.getchannel("A")
            visible_points = [
                (x, y) for y in range(128) for x in range(64)
                if alpha.getpixel((x, y)) > 8
            ]
            if not visible_points:
                return f"cliff frame {index} is empty"
            bbox = (
                min(x for x, _y in visible_points), min(y for _x, y in visible_points),
                max(x for x, _y in visible_points) + 1, max(y for _x, y in visible_points) + 1,
            )
            if bbox[1] > 1:
                return f"cliff frame {index} is not registered to anchor y=0: {bbox}"
            if row == 0:
                if bbox[2] > 32 or not any(alpha.getpixel((31, y)) > 8 for y in range(128)):
                    return f"cliff southwest frame {index} does not terminate at the x=32 seam: {bbox}"
                seam_xs = range(29, 32)
            elif bbox[0] < 32 or not any(alpha.getpixel((32, y)) > 8 for y in range(128)):
                return f"cliff southeast frame {index} does not start at the x=32 seam: {bbox}"
            else:
                seam_xs = range(32, 35)
            profile = {
                y for y in range(128)
                if any(alpha.getpixel((x, y)) > 8 for x in seam_xs)
            }
            if not profile or min(profile) > 1:
                return f"cliff frame {index} does not meet the top seam band"
            if set(range(min(profile), max(profile) + 1)) != profile:
                return f"cliff frame {index} has a gap in its authored seam profile"
            seam_profiles.append(profile)
            heights.append(bbox[3] - bbox[1])
        for row in range(2):
            row_heights = heights[row * 4:(row + 1) * 4]
            if any(after <= before for before, after in zip(row_heights, row_heights[1:])):
                return f"cliff row {row} depths 1-4 must increase strictly: {row_heights}"
        for depth in range(4):
            if abs(heights[depth] - heights[4 + depth]) > 6:
                return (
                    f"cliff mirrored depth {depth + 1} differs by more than 6px: "
                    f"{heights[depth]}/{heights[4 + depth]}"
                )
        for southwest in range(4):
            for southeast in range(4, 8):
                if not any(
                    left_y <= 5 and right_y <= 5 and abs(left_y - right_y) <= 1
                    for left_y in seam_profiles[southwest]
                    for right_y in seam_profiles[southeast]
                ):
                    return (
                        f"cliff frames {southwest}/{southeast} do not meet across the "
                        "opposing top seam strips"
                    )
    return None


def _load_gameplay_authorship() -> tuple[dict | None, str | None]:
    if not GAMEPLAY_ART_AUTHORSHIP.is_file():
        return None, f"missing {rel(GAMEPLAY_ART_AUTHORSHIP)}"
    try:
        payload = json.loads(GAMEPLAY_ART_AUTHORSHIP.read_text(encoding="utf-8"), object_pairs_hook=_reject_duplicate_json_keys)
    except Exception as exc:
        return None, f"malformed {rel(GAMEPLAY_ART_AUTHORSHIP)}: {exc}"
    return payload, None


def audit_gameplay_art_sources(art: dict, monsters: dict, npcs: dict, summons: dict,
                               *, write_report: bool = False) -> dict:
    expected = _expected_gameplay_descriptors(art, monsters, npcs, summons)
    payload, artifact_error = _load_gameplay_authorship()
    errors: list[str] = []
    if artifact_error:
        errors.append(artifact_error)
        actual: dict = {}
    else:
        required_top = {"version", "sourceKind", "review", "wallContract", "descriptors"}
        if set(payload) != required_top:
            errors.append(f"gameplay_art_v1 top keys must be {sorted(required_top)}, found {sorted(payload)}")
        if payload.get("version") != GAMEPLAY_ART_VERSION:
            errors.append(f"gameplay_art_v1 version must be {GAMEPLAY_ART_VERSION}")
        if payload.get("sourceKind") != GAMEPLAY_ART_SOURCE_KIND:
            errors.append(f"gameplay_art_v1 sourceKind must be {GAMEPLAY_ART_SOURCE_KIND}")
        if payload.get("review") != GAMEPLAY_ART_REVIEW:
            errors.append(f"gameplay_art_v1 review must be {GAMEPLAY_ART_REVIEW}")
        if payload.get("wallContract") != WALL_CONTRACT:
            errors.append(f"gameplay_art_v1 wallContract must be {WALL_CONTRACT}")
        actual = payload.get("descriptors") if isinstance(payload.get("descriptors"), dict) else {}
    expected_keys, actual_keys = set(expected), set(actual)
    missing_descriptors = sorted(expected_keys - actual_keys)
    extra_descriptors = sorted(actual_keys - expected_keys)
    for key in missing_descriptors:
        errors.append(f"missing gameplay descriptor {key}")
    for key in extra_descriptors:
        errors.append(f"unexpected gameplay descriptor {key}")

    valid: list[str] = []
    missing_files: list[str] = []
    invalid_files: list[str] = []
    used_paths: set[str] = set()
    for descriptor_key in sorted(expected_keys & actual_keys):
        want, got = expected[descriptor_key], actual[descriptor_key]
        required = set(want)
        if set(got) != required:
            errors.append(f"{descriptor_key}: descriptor keys must be {sorted(required)}, found {sorted(got)}")
            invalid_files.append(descriptor_key)
            continue
        descriptor_mismatch = False
        for field, value in want.items():
            if field in ("sha256", "provenance"):
                continue
            if descriptor_key.split(":", 1)[0] in ("massif", "prop", "monster", "npc") and field in ("size", "anchor"):
                continue
            if got.get(field) != value:
                errors.append(f"{descriptor_key}: {field} must be {value!r}, found {got.get(field)!r}")
                descriptor_mismatch = True
        if got.get("kind") == "static":
            size = got.get("size")
            anchor = got.get("anchor")
            if not (isinstance(size, list) and len(size) == 2 and all(isinstance(v, int) and v > 0 for v in size)):
                errors.append(f"{descriptor_key}: static size must be two positive integers")
                invalid_files.append(descriptor_key)
                continue
            if not (isinstance(anchor, list) and len(anchor) == 2 and all(isinstance(v, int) for v in anchor)
                    and 0 <= anchor[0] <= size[0] and 0 <= anchor[1] <= size[1]):
                errors.append(f"{descriptor_key}: static anchor must lie inside authored size {size}")
                invalid_files.append(descriptor_key)
                continue
        provenance = got.get("provenance")
        if not isinstance(provenance, dict) or set(provenance) != GAMEPLAY_ART_PROVENANCE_KEYS:
            errors.append(
                f"{descriptor_key}: provenance keys must be {sorted(GAMEPLAY_ART_PROVENANCE_KEYS)}"
            )
            invalid_files.append(descriptor_key)
            continue
        if not isinstance(provenance.get("method"), str) or not provenance["method"]:
            errors.append(f"{descriptor_key}: provenance method is missing")
            invalid_files.append(descriptor_key)
            continue
        origin = ROOT / str(provenance.get("source", ""))
        allowed_origins = (
            ROOT / "assets" / "world", ROOT / "assets" / "monsters",
            ROOT / "assets" / "summons", ROOT / "assets" / "act1",
            SRC / "ui", SRC / "gameplay_art_authored",
        )
        if not any(_is_relative_to(origin, root) for root in allowed_origins):
            errors.append(f"{descriptor_key}: provenance source is outside approved painted libraries")
            invalid_files.append(descriptor_key)
            continue
        if not origin.is_file():
            errors.append(f"{descriptor_key}: missing provenance source {provenance.get('source')}")
            invalid_files.append(descriptor_key)
            continue
        origin_hash = hashlib.sha256(origin.read_bytes()).hexdigest()
        if provenance.get("sourceSha256") != origin_hash:
            errors.append(f"{descriptor_key}: provenance sourceSha256 mismatch")
            invalid_files.append(descriptor_key)
            continue
        if not isinstance(provenance.get("parameters"), dict):
            errors.append(f"{descriptor_key}: provenance parameters must be an object")
            invalid_files.append(descriptor_key)
            continue
        source = ROOT / got["path"]
        try:
            source.resolve().relative_to(GAMEPLAY_ART_ROOT.resolve())
        except ValueError:
            errors.append(f"{descriptor_key}: source must stay under {rel(GAMEPLAY_ART_ROOT)}")
            invalid_files.append(descriptor_key)
            continue
        if got["path"] in used_paths:
            errors.append(f"{descriptor_key}: source path is shared: {got['path']}")
            descriptor_mismatch = True
        used_paths.add(got["path"])
        if not source.is_file():
            missing_files.append(got["path"])
            errors.append(f"{descriptor_key}: missing authored source {got['path']}")
            continue
        digest = hashlib.sha256(source.read_bytes()).hexdigest()
        if not re.fullmatch(r"[0-9a-f]{64}", str(got.get("sha256", ""))) or got["sha256"] != digest:
            errors.append(f"{descriptor_key}: sha256 mismatch for {got['path']}")
            invalid_files.append(descriptor_key)
            continue
        image, image_error = _read_png_descriptor(source, got["size"])
        if image_error:
            errors.append(f"{descriptor_key}: {image_error}")
            invalid_files.append(descriptor_key)
            continue
        frame_error = _validate_descriptor_frames(got, image)
        if frame_error:
            errors.append(f"{descriptor_key}: {frame_error}")
            invalid_files.append(descriptor_key)
            continue
        if descriptor_mismatch:
            invalid_files.append(descriptor_key)
            continue
        valid.append(descriptor_key)

    by_role = {}
    for descriptor in expected.values():
        by_role[descriptor["role"]] = by_role.get(descriptor["role"], 0) + 1
    # Even before the provenance manifest exists, enumerate every canonical
    # source path so the coverage report is a concrete authoring backlog rather
    # than 228 opaque descriptor errors.
    missing_canonical_sources = sorted(
        descriptor["path"] for key, descriptor in expected.items()
        if key in missing_descriptors and not (ROOT / descriptor["path"]).is_file()
    )
    legacy_candidates: dict[str, str] = {}
    legacy_role_dirs = {
        "ground": "world/grounds", "hazard": "world/hazards", "path": "world/paths",
        "wall": "world/walls", "cliff": "world/cliffs", "massif": "world/massifs",
        "prop": "world/props", "monster": "actors/monsters", "npc": "actors/npcs",
    }
    for key, descriptor in expected.items():
        legacy_dir = legacy_role_dirs.get(descriptor["role"])
        if legacy_dir:
            candidate = OUT / legacy_dir / f"{descriptor['key']}.webp"
        elif key == "item-icons:equipment":
            candidate = OUT / "ui" / "items_equipment.webp"
        elif key == "item-icons:misc":
            candidate = OUT / "ui" / "items_misc.webp"
        elif key == "skill-icons:skills":
            candidate = OUT / "ui" / "skills.webp"
        else:
            continue
        if candidate.is_file():
            legacy_candidates[key] = rel(candidate)
    report = {
        "version": GAMEPLAY_ART_VERSION,
        "sourceKind": GAMEPLAY_ART_SOURCE_KIND,
        "review": GAMEPLAY_ART_REVIEW,
        "authorship": rel(GAMEPLAY_ART_AUTHORSHIP),
        "wallContract": WALL_CONTRACT,
        "expectedDescriptorCount": len(expected),
        "validDescriptorCount": len(valid),
        "expectedByRole": dict(sorted(by_role.items())),
        "missingDescriptors": missing_descriptors,
        "missingCanonicalSources": missing_canonical_sources,
        "legacyGeneratedCandidatesNotAccepted": dict(sorted(legacy_candidates.items())),
        "extraDescriptors": extra_descriptors,
        "missingFiles": sorted(set(missing_files)),
        "invalidDescriptors": sorted(set(invalid_files)),
        "errors": errors,
    }
    if write_report:
        GAMEPLAY_ART_AUDIT.parent.mkdir(parents=True, exist_ok=True)
        GAMEPLAY_ART_AUDIT.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return report


def _require_gameplay_art_sources(art: dict, monsters: dict, npcs: dict, summons: dict) -> dict:
    report = audit_gameplay_art_sources(art, monsters, npcs, summons)
    if report["errors"]:
        sample = "\n  - ".join(report["errors"][:12])
        suffix = f"\n  ... and {len(report['errors']) - 12} more" if len(report["errors"]) > 12 else ""
        raise RuntimeError(
            "strict authored gameplay-art audit failed; run "
            "`python tools/build_sprite_assets.py --audit-gameplay-art`:\n  - " + sample + suffix
        )
    return json.loads(GAMEPLAY_ART_AUTHORSHIP.read_text(encoding="utf-8"))["descriptors"]


def _expected_ui_scenes() -> dict[str, dict]:
    return {
        "titleCamp": {
            "path": "assets/sprites_src/ui/scenes/title_camp.png",
            "sha256": None,
            "source": "assets/embergrave-title-bg.png",
            "sourceSha256": None,
            "method": "rgba-pass-through-v1",
            "parameters": {},
            "size": [1672, 941],
            "anchor": [0, 0],
            "bundle": "core",
            "assetId": "ui.scene.titleCamp",
        },
    }


def audit_ui_scene_sources(*, write_report: bool = False) -> dict:
    expected = _expected_ui_scenes()
    errors: list[str] = []
    if not UI_SCENE_AUTHORSHIP.is_file():
        errors.append(f"missing {rel(UI_SCENE_AUTHORSHIP)}")
        payload, actual = {}, {}
    else:
        try:
            payload = json.loads(
                UI_SCENE_AUTHORSHIP.read_text(encoding="utf-8"),
                object_pairs_hook=_reject_duplicate_json_keys,
            )
        except Exception as exc:
            errors.append(f"malformed {rel(UI_SCENE_AUTHORSHIP)}: {exc}")
            payload, actual = {}, {}
        else:
            required_top = {"version", "sourceKind", "review", "scenes"}
            if set(payload) != required_top:
                errors.append(f"ui_scenes_v1 top keys must be {sorted(required_top)}, found {sorted(payload)}")
            if payload.get("version") != UI_SCENE_VERSION:
                errors.append(f"ui_scenes_v1 version must be {UI_SCENE_VERSION}")
            if payload.get("sourceKind") != GAMEPLAY_ART_SOURCE_KIND:
                errors.append(f"ui_scenes_v1 sourceKind must be {GAMEPLAY_ART_SOURCE_KIND}")
            if payload.get("review") != GAMEPLAY_ART_REVIEW:
                errors.append(f"ui_scenes_v1 review must be {GAMEPLAY_ART_REVIEW}")
            actual = payload.get("scenes") if isinstance(payload.get("scenes"), dict) else {}

    expected_keys, actual_keys = set(expected), set(actual)
    missing = sorted(expected_keys - actual_keys)
    extra = sorted(actual_keys - expected_keys)
    errors.extend(f"missing UI scene descriptor {key}" for key in missing)
    errors.extend(f"unexpected UI scene descriptor {key}" for key in extra)
    valid: list[str] = []
    for key in sorted(expected_keys & actual_keys):
        want, got = expected[key], actual[key]
        if not isinstance(got, dict) or set(got) != set(want):
            errors.append(f"UI scene {key}: descriptor keys must be {sorted(want)}")
            continue
        mismatch = False
        for field, value in want.items():
            if field in ("sha256", "sourceSha256"):
                continue
            if got.get(field) != value:
                errors.append(f"UI scene {key}: {field} must be {value!r}, found {got.get(field)!r}")
                mismatch = True
        origin = ROOT / got["source"]
        if not origin.is_file() or got.get("sourceSha256") != hashlib.sha256(origin.read_bytes()).hexdigest():
            errors.append(f"UI scene {key}: original painted source hash mismatch")
            continue
        source = ROOT / got["path"]
        if not _is_relative_to(source, UI_SCENE_ROOT):
            errors.append(f"UI scene {key}: source must stay under {rel(UI_SCENE_ROOT)}")
            continue
        if not source.is_file():
            errors.append(f"UI scene {key}: missing authored source {got['path']}")
            continue
        if got.get("sha256") != hashlib.sha256(source.read_bytes()).hexdigest():
            errors.append(f"UI scene {key}: final source hash mismatch")
            continue
        image, image_error = _read_png_descriptor(source, got["size"])
        if image_error:
            errors.append(f"UI scene {key}: {image_error}")
            continue
        if not mismatch:
            valid.append(key)
    report = {
        "version": UI_SCENE_VERSION,
        "sourceKind": GAMEPLAY_ART_SOURCE_KIND,
        "review": GAMEPLAY_ART_REVIEW,
        "authorship": rel(UI_SCENE_AUTHORSHIP),
        "expectedSceneCount": len(expected),
        "validSceneCount": len(valid),
        "missingScenes": missing,
        "extraScenes": extra,
        "errors": errors,
    }
    if write_report:
        UI_SCENE_AUDIT.parent.mkdir(parents=True, exist_ok=True)
        UI_SCENE_AUDIT.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return report


def _require_ui_scene_sources() -> dict[str, dict]:
    report = audit_ui_scene_sources()
    if report["errors"]:
        raise RuntimeError(
            "strict authored UI-scene audit failed; run "
            "`python tools/build_sprite_assets.py --audit-ui-scenes`:\n  - "
            + "\n  - ".join(report["errors"])
        )
    return json.loads(
        UI_SCENE_AUTHORSHIP.read_text(encoding="utf-8"),
        object_pairs_hook=_reject_duplicate_json_keys,
    )["scenes"]


def _copy_final_aligned_source(descriptor: dict) -> Path:
    source = ROOT / descriptor["path"]
    target = OUT / "packed" / source.relative_to(GAMEPLAY_ART_ROOT).with_suffix(".webp")
    # Encoding is the only compiler operation. Pixel geometry, anchors, frame
    # placement, and palette are already frozen in the checked-in RGBA source.
    save_webp(rgba(source), target, 94)
    return target


def cliff_frame_fits(image: Image.Image) -> list[dict]:
    """Measure packed cliff alpha without altering any authored pixels.

    Store the former browser-side registration in the manifest so file://
    gameplay never needs getImageData on an origin-tainted sprite canvas.
    """
    if image.size != (256, 256):
        raise ValueError(f"Cliff atlas must be 256x256, got {image.size}")
    alpha = image.convert("RGBA").getchannel("A")
    pixels = alpha.load()
    fits = []

    def upper_median(values: list[int]) -> int:
        return sorted(values)[len(values) // 2]

    for index in range(8):
        sx, sy = (index % 4) * 64, (index // 4) * 128
        columns = []
        for u in range(64):
            rows = [v for v in range(128) if pixels[sx + u, sy + v] >= 192]
            if rows:
                columns.append((u, rows[0], rows[-1] - rows[0] + 1))
        if not columns:
            raise ValueError(f"Cliff frame {index} has no usable painted face")
        depth = upper_median([column[2] for column in columns])
        solid = [column for column in columns if column[2] >= depth * .8]
        if len(solid) < 8:
            raise ValueError(f"Cliff frame {index} has no usable painted face")
        lo, hi = solid[0][0] + 1, solid[-1][0]
        interior = [column for column in solid if lo <= column[0] < hi]
        mean_u = sum(column[0] for column in interior) / len(interior)
        mean_top = sum(column[1] for column in interior) / len(interior)
        slope = sum((u - mean_u) * (top - mean_top) for u, top, _ in interior) / sum(
            (u - mean_u) ** 2 for u, _, _ in interior
        )
        fits.append({
            "lo": lo, "width": hi - lo, "slope": slope,
            "top": mean_top + slope * (lo - mean_u),
            "depth": upper_median([column[2] for column in interior]),
        })
    return fits


def build_gameplay_art(descriptors: dict[str, dict], entries: dict, maps: dict,
                       monsters: dict, npcs: dict) -> None:
    maps.update({
        "grounds": {}, "hazards": {}, "paths": {}, "walls": {}, "cliffs": {}, "backdrops": {},
        "massifs": {}, "props": {}, "traps": {}, "monsters": {}, "npcs": {}, "summons": {}, "forms": {},
        "itemCategories": {name: index for index, name in enumerate(ITEM_CATEGORIES)},
        "miscIcons": {name: index for index, name in enumerate(MISC_ICON_NAMES)},
        "itemVariants": {**{name: index for index, name in enumerate(ITEM_VARIANT_NAMES)},
                         **{alias: ITEM_VARIANT_NAMES.index(name) for alias, name in ITEM_VARIANT_ALIASES.items()}},
        "skillIcons": {name: index for index, name in enumerate(_skill_icon_keys())},
    })
    resolved_actors: dict[tuple[str, str], str] = {}
    for descriptor_key, descriptor in sorted(descriptors.items()):
        output = _copy_final_aligned_source(descriptor)
        if descriptor["kind"] == "atlas":
            entry = atlas_entry(output, tuple(descriptor["cell"]), descriptor["cols"], descriptor["rows"],
                                tuple(descriptor["anchor"]), descriptor["bundle"])
        else:
            if descriptor.get("anchor") is None:
                raise RuntimeError(f"{descriptor_key}: static authored descriptor has no reviewed anchor")
            entry = static_entry(output, tuple(descriptor["anchor"]), descriptor["bundle"])
        if "displayHeight" in descriptor:
            entry["displayHeight"] = descriptor["displayHeight"]
        if "tintKey" in descriptor:
            entry["tintKey"] = descriptor["tintKey"]
        if descriptor["role"] == "cliff":
            with Image.open(output) as packed:
                entry["cliffFits"] = cliff_frame_fits(packed)
        if descriptor["role"] == "monster" or descriptor["role"] == "prop" and descriptor["key"] == "beacon":
            with Image.open(output) as packed:
                entry["hitShape"] = actor_hit_shape(packed)
        entries[descriptor["assetId"]] = entry
        role, key = descriptor["role"], descriptor["key"]
        map_name = {
            "ground": "grounds", "hazard": "hazards", "path": "paths", "wall": "walls", "backdrop": "backdrops",
            "cliff": "cliffs", "massif": "massifs", "prop": "props", "monster": "monsters",
            "trap": "traps", "form": "forms", "npc": "npcs", "summon": "summons",
        }.get(role)
        if map_name:
            maps[map_name][key] = descriptor["assetId"]
        if role in ("monster", "npc"):
            resolved_actors[(role, key)] = descriptor["assetId"]

    for role, defs in (("monster", monsters), ("npc", npcs)):
        mapping = maps[f"{role}s"]
        for key, cfg in defs.items():
            if key in mapping:
                continue
            target = cfg.get("alias")
            if target and (role, target) in resolved_actors:
                mapping[key] = resolved_actors[(role, target)]


def build_ui_scenes(descriptors: dict[str, dict], entries: dict, maps: dict) -> None:
    maps["uiScenes"] = {}
    for key, descriptor in sorted(descriptors.items()):
        source = ROOT / descriptor["path"]
        output = OUT / "packed" / "ui" / "scenes" / f"{key}.webp"
        save_webp(rgba(source), output, 94)
        entries[descriptor["assetId"]] = static_entry(
            output, tuple(descriptor["anchor"]), descriptor["bundle"],
        )
        maps["uiScenes"][key] = descriptor["assetId"]



def atlas_entry(path: Path, cell: int | tuple[int, int], cols: int, rows: int, anchor: tuple[int, int], bundle: str) -> dict:
    cw, ch = (cell, cell) if isinstance(cell, int) else cell
    return {"src": rel(path), "revision": hashlib.sha256(path.read_bytes()).hexdigest()[:12], "kind": "atlas", "cell": [cw, ch], "cols": cols, "rows": rows, "anchor": list(anchor), "bundle": bundle}


def actor_hit_shape(image: Image.Image) -> dict:
    """Pack the painted silhouette, without requiring canvas readback at runtime.

    Four-pixel cells retain narrow limbs and transparent gaps. Faint antialiasing
    is excluded from picking; the overhead bounds include all visible pixels.
    """
    alpha = image.convert("RGBA").getchannel("A")
    bounds = alpha.getbbox()
    if bounds is None:
        raise RuntimeError("Cannot create a hit shape for an empty actor")
    cell = 4
    cols, rows = math.ceil(image.width / cell), math.ceil(image.height / cell)
    bits = bytearray(math.ceil(cols * rows / 8))
    for y in range(rows):
        for x in range(cols):
            box = (x * cell, y * cell, min((x + 1) * cell, image.width), min((y + 1) * cell, image.height))
            if alpha.crop(box).getextrema()[1] >= 32:
                index = y * cols + x
                bits[index // 8] |= 1 << (index % 8)
    return {"bounds": list(bounds), "cell": cell, "cols": cols, "rows": rows, "bits": bits.hex()}


def static_entry(path: Path, anchor: tuple[int, int], bundle: str) -> dict:
    return {"src": rel(path), "revision": hashlib.sha256(path.read_bytes()).hexdigest()[:12], "kind": "static", "anchor": list(anchor), "bundle": bundle}


def rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def emit_manifest(entries: dict, maps: dict, player_rig_report: dict,
                  manifest_path: Path = MANIFEST, coverage_path: Path = COVERAGE) -> None:
    manifest = {
        "version": 1,
        "directions": list(PLAYER_DIRS),
        "poses": list(PLAYER_POSES),
        "wallHeight": 72,
        # Wall frames occupy transparent 128px cells.  The painted footprint
        # lands at y=112 and the world rise remains 72px; culling needs the
        # authored cell height, not the old over-large procedural allowance.
        "wallViewHeight": 128,
        "entries": entries,
        "maps": maps,
    }
    payload = json.dumps(manifest, indent=2, sort_keys=True)
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(
        "/* Generated by tools/build_sprite_assets.py. Do not hand-edit. */\n"
        '"use strict";\n\n'
        f"DATA.SPRITE_MANIFEST = {payload};\n",
        encoding="utf-8",
    )
    coverage = {
        "manifestVersion": manifest["version"],
        "assetCount": len(entries),
        "lookupMapCount": len(maps),
        "classes": sorted(maps["players"]),
        "forms": sorted(maps["forms"]),
        "groundZones": sorted(maps["grounds"]),
        "pathThemes": sorted(maps["paths"]),
        "wallThemes": sorted(maps["walls"]),
        "hazards": sorted(maps["hazards"]),
        "backdrops": sorted(maps["backdrops"]),
        "traps": sorted(maps["traps"]),
        "props": sorted(maps["props"]),
        "monsters": sorted(maps["monsters"]),
        "npcs": sorted(maps["npcs"]),
        "summons": sorted(maps["summons"]),
        "itemCategories": sorted(maps["itemCategories"]),
        "materialTiers": len(TIER_MATERIALS),
        "skillIcons": sorted(maps["skillIcons"]),
        "uiScenes": sorted(maps["uiScenes"]),
        "gameplayArtAuthorship": rel(GAMEPLAY_ART_AUTHORSHIP),
        "uiSceneAuthorship": rel(UI_SCENE_AUTHORSHIP),
        "directions": list(PLAYER_DIRS),
        "poses": list(PLAYER_POSES),
        "wallHeight": manifest["wallHeight"],
        "playerRigRevision": player_rig_report["revision"],
        "playerRigCoverageMode": player_rig_report["coverageMode"],
        "playerRigStarterBaseIds": player_rig_report["starterBaseIds"],
        "playerRigAvailableFamilyCount": player_rig_report["availableFamilyCount"],
        "playerRigClasses": player_rig_report["classes"],
        "playerRigMainFamilies": player_rig_report["mainFamilies"],
        "playerRigArmorFamilies": player_rig_report["armorFamilies"],
        "playerRigFrameCount": 72,
        "playerRigSourceCount": player_rig_report["sourceCount"],
        "playerRigAssetCount": player_rig_report["assetCount"],
        "playerRigRenderedAssetCount": player_rig_report["renderedAssetCount"],
        "playerRigExpectedFrames": player_rig_report["renderedAssetCount"] * 72,
        "playerRigValidatedFrames": player_rig_report["renderedAssetCount"] * 72,
        "playerRigLogicalFamilyFrames": player_rig_report["availableFamilyCount"] * 72,
        "playerRigMaterialTiers": len(TIER_MATERIALS),
        "playerRigMaterials": player_rig_report["materials"],
        "playerRigCoverage": player_rig_report["coverage"],
        "playerRigReferencedAssetIds": player_rig_report["referencedAssetIds"],
        "playerRigRenderedAssetIds": player_rig_report["renderedAssetIds"],
        "deprecatedGearMaps": False,
    }
    coverage_path.parent.mkdir(parents=True, exist_ok=True)
    coverage_path.write_text(json.dumps(coverage, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--audit-gameplay-art", action="store_true",
        help="validate checked-in non-player gameplay sources without packing or touching runtime outputs",
    )
    parser.add_argument(
        "--audit-ui-scenes", action="store_true",
        help="validate checked-in UI-scene sources without packing or touching runtime outputs",
    )
    parser.add_argument(
        "--audit-player-equipment", action="store_true",
        help="report exact authored player-equipment coverage without packing or touching outputs",
    )
    parser.add_argument(
        "--audit-player-equipment-class", choices=PLAYER_CLASSES, metavar="CLASS_ID",
        help=(
            "limit --audit-player-equipment to one class and require its complete "
            "21-family modular equipment matrix"
        ),
    )
    parser.add_argument(
        "--write-audit-report", action="store_true",
        help="with an audit mode, write its assets/sprites coverage report",
    )
    args = parser.parse_args()
    if sum(bool(value) for value in (
        args.audit_gameplay_art, args.audit_ui_scenes, args.audit_player_equipment,
    )) > 1:
        parser.error("choose only one audit mode")
    if args.audit_player_equipment_class and not args.audit_player_equipment:
        parser.error("--audit-player-equipment-class requires --audit-player-equipment")
    assert_pack_only_compiler()
    data = DATA_JS.read_text(encoding="utf-8")
    art, monsters, npcs, summons = parse_art_entries(data)
    if args.audit_gameplay_art:
        report = audit_gameplay_art_sources(
            art, monsters, npcs, summons, write_report=args.write_audit_report,
        )
        print(json.dumps(report, indent=2, sort_keys=True))
        if report["errors"]:
            raise SystemExit(1)
        return
    if args.audit_ui_scenes:
        report = audit_ui_scene_sources(write_report=args.write_audit_report)
        print(json.dumps(report, indent=2, sort_keys=True))
        if report["errors"]:
            raise SystemExit(1)
        return
    if args.audit_player_equipment:
        if args.write_audit_report:
            parser.error("--audit-player-equipment is stdout-only; remove --write-audit-report")
        report = audit_player_equipment_sources(args.audit_player_equipment_class)
        print(json.dumps(report, indent=2, sort_keys=True))
        if report["status"] != "ready":
            raise SystemExit(1)
        return
    if args.write_audit_report:
        parser.error("--write-audit-report requires --audit-gameplay-art")

    # Validate every non-player authored source before creating directories or
    # compiling the separately-gated player rig. A failed build therefore
    # cannot partially overwrite accepted assets.
    gameplay_descriptors = _require_gameplay_art_sources(art, monsters, npcs, summons)
    ui_scene_descriptors = _require_ui_scene_sources()
    _require_player_equipment_authorship_preflight()
    ensure_dirs()
    entries: dict[str, dict] = {}
    maps: dict[str, dict] = {}
    player_rig_report = build_player_rigs(entries, maps)
    build_gameplay_art(gameplay_descriptors, entries, maps, monsters, npcs)
    build_ui_scenes(ui_scene_descriptors, entries, maps)
    from import_boss_art import install as install_boss_art
    install_boss_art(entries, maps)
    from import_act2_animations import install as install_act2_animations
    install_act2_animations(entries, maps)
    from import_act3_animations import install as install_act3_animations
    install_act3_animations(entries, maps)
    from import_act4_animations import install as install_act4_animations
    install_act4_animations(entries, maps)
    from import_act5_animations import install as install_act5_animations
    install_act5_animations(entries, maps)
    emit_manifest(entries, maps, player_rig_report)
    print(f"Built {len(entries)} sprite assets and {len(maps)} lookup maps")


if __name__ == "__main__":
    main()
