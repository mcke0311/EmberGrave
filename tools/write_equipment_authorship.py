#!/usr/bin/env python3
"""Write strict SHA-256 provenance for accepted authored player equipment.

This helper never creates or changes art. It reads the explicit ``available``
coverage branch, requires exact final-authored class/slot/family paths, and
hashes those files.
Reviewers must pass ``--visual-review-complete`` only after accepting every
family contact sheet; otherwise it fails closed.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
REGISTRATION = ROOT / "assets" / "sprites_src" / "player_rig" / "registrations.json"
AUTHORED_ROOT = ROOT / "assets" / "sprites_src" / "player_rig_authored"
COVERAGE = AUTHORED_ROOT / "base_equipment_coverage_v1.json"
OUT = AUTHORED_ROOT / "equipment_authorship_v1.json"
CLASSES = ("vanguard", "emberwitch", "gravebinder", "wildkeeper", "veilranger")
MAIN = ("sword_1h", "sword_2h", "axe_1h", "axe_2h", "mace_1h", "mace_2h",
        "dagger_1h", "spear_2h", "bow_2h", "crossbow_2h", "wand_1h", "staff_2h")
ARMOR = ("light", "mail", "plate", "mythic")
SLOTS = ("unarmed", "main", "shield", "head", "chest")


def add(files: dict, source: str, class_id: str, slot: str, family: str,
        plane: str, material: str | None) -> None:
    prefix = f"assets/sprites_src/player_rig_authored/{class_id}/{slot}/{family}/"
    filename = f"{plane}_mask_{material}.png" if material else f"{plane}.png"
    expected = f"{prefix}{filename}"
    if source != expected:
        raise RuntimeError(
            f"rejected noncanonical authored source: {source}; expected {expected}"
        )
    path = ROOT / source
    if not path.is_file():
        raise RuntimeError(f"missing authored equipment source: {source}")
    descriptor = {
        "class": class_id, "slot": slot, "family": family,
        "plane": plane, "material": material,
        "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
    }
    if source in files and files[source] != descriptor:
        raise RuntimeError(f"shared source is forbidden across family/plane roles: {source}")
    files[source] = descriptor


def family(files: dict, node: dict, class_id: str, slot: str, family_id: str,
           planes: tuple[str, ...]) -> None:
    expected_keys = {*planes, "masks"}
    if not isinstance(node, dict) or set(node) != expected_keys:
        raise RuntimeError(
            f"{class_id}/{slot}/{family_id} source definition keys must be "
            f"{sorted(expected_keys)}"
        )
    masks_by_plane = node.get("masks")
    if not isinstance(masks_by_plane, dict) or not set(masks_by_plane).issubset(planes):
        raise RuntimeError(
            f"{class_id}/{slot}/{family_id} masks must use declared planes only"
        )
    rendered_planes = set()
    for plane in planes:
        base = node.get(plane)
        if base is not None and not isinstance(base, str):
            raise RuntimeError(
                f"{class_id}/{slot}/{family_id}/{plane} must be a path or null"
            )
        masks = masks_by_plane.get(plane, {})
        if not isinstance(masks, dict):
            raise RuntimeError(
                f"{class_id}/{slot}/{family_id}/{plane} masks must be an object"
            )
        if masks and base is not None:
            raise RuntimeError(
                f"{class_id}/{slot}/{family_id}/{plane} retains an unreachable base "
                "beneath replacement masks"
            )
        if masks:
            # Masks replace, rather than augment, their painted base plane at
            # runtime. Certify exactly the sources the compositor can render.
            rendered_planes.add(plane)
        elif base:
            rendered_planes.add(plane)
            add(files, base, class_id, slot, family_id, plane, None)
        for material, source in sorted(masks.items()):
            if material not in ("metal", "wood", "leather", "cloth", "accent"):
                raise RuntimeError(
                    f"unsupported mask role {material} in "
                    f"{class_id}/{slot}/{family_id}/{plane}"
                )
            if not isinstance(source, str) or not source:
                raise RuntimeError(
                    f"{class_id}/{slot}/{family_id}/{plane}/{material} must be a source path"
                )
            add(files, source, class_id, slot, family_id, plane, material)
    required = {
        "unarmed": {"grip"}, "main": {"held", "grip"},
        "shield": {"held", "grip"}, "head": {"worn"}, "chest": {"worn"},
    }[slot]
    missing = sorted(required - rendered_planes)
    if missing:
        raise RuntimeError(
            f"{class_id}/{slot}/{family_id} is missing required runtime planes {missing}"
        )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--visual-review-complete", action="store_true")
    args = parser.parse_args()
    if not args.visual_review_complete:
        raise RuntimeError("refusing to certify equipment before visual contact-sheet review")
    reg = json.loads(REGISTRATION.read_text(encoding="utf-8"))
    coverage = json.loads(COVERAGE.read_text(encoding="utf-8"))
    if (
        coverage.get("version") != 1
        or coverage.get("mode") != "declared-partial-v1"
        or coverage.get("sourceKind") != "authored-final-aligned"
        or coverage.get("review") != "visual-contact-sheet-v1"
        or coverage.get("root") != "assets/sprites_src/player_rig_authored"
        or set(coverage.get("classes", {})) != set(CLASSES)
    ):
        raise RuntimeError("base equipment coverage declaration is malformed or incomplete")
    files = {}
    for class_id in CLASSES:
        # Registration still owns body/sockets and may retain the full future
        # family catalog. Coverage is the sole declaration of equipment art
        # currently available to the runtime; certify neither omitted nor
        # legacy/generated families.
        if class_id not in reg.get("classes", {}):
            raise RuntimeError(f"registration is missing class {class_id}")
        class_coverage = coverage["classes"][class_id]
        if not isinstance(class_coverage, dict) or set(class_coverage) != {"available", "planned"}:
            raise RuntimeError(
                f"{class_id} partial coverage must contain exactly available and planned"
            )
        for status in ("available", "planned"):
            branch = class_coverage[status]
            if not isinstance(branch, dict) or set(branch) != set(SLOTS):
                raise RuntimeError(
                    f"{class_id}/{status} coverage slots must be {sorted(SLOTS)}"
                )
            for slot in SLOTS:
                if not isinstance(branch[slot], dict):
                    raise RuntimeError(
                        f"{class_id}/{status}/{slot} coverage must be a family map"
                    )
                allowed = {
                    "unarmed": {"unarmed"}, "main": set(MAIN),
                    "shield": {"shield"}, "head": set(ARMOR), "chest": set(ARMOR),
                }[slot]
                unknown = set(branch[slot]) - allowed
                if unknown:
                    raise RuntimeError(
                        f"{class_id}/{status}/{slot} declares unknown families "
                        f"{sorted(unknown)}"
                    )
        for slot in SLOTS:
            overlap = set(class_coverage["available"][slot]) & set(
                class_coverage["planned"][slot]
            )
            if overlap:
                raise RuntimeError(
                    f"{class_id}/{slot} families cannot be both available and planned: "
                    f"{sorted(overlap)}"
                )
        # Only reviewed, promoted families are eligible for provenance.  The
        # planned branch is a backlog and must never be certified implicitly.
        sources = class_coverage["available"]
        if sources["unarmed"].get("unarmed"):
            family(files, sources["unarmed"]["unarmed"], class_id, "unarmed", "unarmed", ("rear", "held", "grip", "front"))
        for family_id, node in sorted(sources["main"].items()):
            if family_id not in MAIN:
                raise RuntimeError(f"unsupported declared main family {class_id}/{family_id}")
            family(files, node, class_id, "main", family_id, ("rear", "held", "grip", "front"))
        for family_id, node in sorted(sources["shield"].items()):
            if family_id != "shield":
                raise RuntimeError(f"unsupported declared shield family {class_id}/{family_id}")
            family(files, node, class_id, "shield", family_id, ("rear", "held", "grip", "front"))
        for slot in ("head", "chest"):
            for family_id, node in sorted(sources[slot].items()):
                if family_id not in ARMOR:
                    raise RuntimeError(f"unsupported declared {slot} family {class_id}/{family_id}")
                family(files, node, class_id, slot, family_id, ("rear", "worn", "front"))
    AUTHORED_ROOT.mkdir(parents=True, exist_ok=True)
    artifact = {
        "version": 1, "sourceKind": "authored-final-aligned",
        "review": "visual-contact-sheet-v1",
        "root": "assets/sprites_src/player_rig_authored", "files": files,
    }
    OUT.write_text(json.dumps(artifact, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(f"Certified {len(files)} authored equipment files: {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
