#!/usr/bin/env python3
"""Normalize player equipment registration to runtime-visible source refs.

Material masks replace their base plane in the compositor.  This one-time,
data-only migration removes unreachable base references while preserving every
family/plane schema key.  It never reads, creates, or edits raster art.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
REGISTRATION = ROOT / "assets" / "sprites_src" / "player_rig" / "registrations.json"
CLASSES = ("vanguard", "emberwitch", "gravebinder", "wildkeeper", "veilranger")
GROUP_PLANES = {
    "unarmed": ("rear", "held", "grip", "front"),
    "main": ("rear", "held", "grip", "front"),
    "shield": ("rear", "held", "grip", "front"),
    "head": ("rear", "worn", "front"),
    "chest": ("rear", "worn", "front"),
}


def normalize_family(family: dict, planes: tuple[str, ...]) -> int:
    if not isinstance(family, dict):
        raise RuntimeError("equipment family registration must be an object")
    changes = 0
    masks = family.setdefault("masks", {})
    if not isinstance(masks, dict) or not set(masks).issubset(planes):
        raise RuntimeError("equipment masks must be keyed by declared planes")
    for plane in planes:
        if plane not in family:
            family[plane] = None
            changes += 1
        plane_masks = masks.get(plane, {})
        if not isinstance(plane_masks, dict):
            raise RuntimeError(f"equipment masks.{plane} must be an object")
        if plane_masks and family[plane] is not None:
            family[plane] = None
            changes += 1
    return changes


def normalize(document: dict) -> int:
    classes = document.get("classes")
    if not isinstance(classes, dict) or set(classes) != set(CLASSES):
        raise RuntimeError("registration must contain exactly the five player classes")
    changes = 0
    for class_id in CLASSES:
        sources = classes[class_id].get("sources")
        if not isinstance(sources, dict):
            raise RuntimeError(f"{class_id} sources are missing")
        changes += normalize_family(sources.get("unarmed"), GROUP_PLANES["unarmed"])
        for slot in ("main", "shield", "head", "chest"):
            families = sources.get(slot)
            if not isinstance(families, dict):
                raise RuntimeError(f"{class_id}/{slot} families are missing")
            for family in families.values():
                changes += normalize_family(family, GROUP_PLANES[slot])
    return changes


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write", action="store_true", help="write the normalized registration")
    args = parser.parse_args()
    document = json.loads(REGISTRATION.read_text(encoding="utf-8"))
    changes = normalize(document)
    if args.write:
        REGISTRATION.write_text(
            json.dumps(document, indent=2, sort_keys=True) + "\n", encoding="utf-8",
        )
    print(
        f"{'Normalized' if args.write else 'Would normalize'} {changes} source fields; "
        "masked base planes are runtime-unreachable"
    )


if __name__ == "__main__":
    main()
