# Final-aligned player equipment authoring

This directory accepts only finished, hand-authored player-equipment layers.
The runtime/compiler contract is deliberately strict: code may validate and
pack the pixels, but it may never move or manufacture equipment geometry.

## Base equipment coverage

The runtime may ship a strict, explicitly partial visual catalog while the
complete 105-family set is still being authored. The checked-in declaration
`base_equipment_coverage_v1.json` is the only list of families the compiler is
allowed to pack. Omitted families are deliberately unavailable: equipping one
fails before the inventory/equipment transaction commits, and the actor keeps
its previous decoded appearance. They are never aliased to another weapon or
drawn procedurally.

The first playable vertical slice binds the actual new-game loadouts:

| Class | Main item / family | Chest item / family |
|---|---|---|
| Vanguard | Shortsword / `sword_1h` | Quilted Vest / `light` |
| Emberwitch | Gnarled Wand / `wand_1h` | Quilted Vest / `light` |
| Gravebinder | Gnarled Wand / `wand_1h` | Quilted Vest / `light` |
| Wildkeeper | Ash Staff / `staff_2h` | Quilted Vest / `light` |
| Veilranger | Hunting Bow / `bow_2h` | Quilted Vest / `light` |

The accepted neutral bodies already contain their bare hands, so partial mode
draws only the body when no main-hand item is equipped; it does not require a
redundant unarmed overlay. With optional occlusion planes omitted, this base
set is exactly 15 atlases: five weapon held material-mask atlases, five
family-specific weapon grip atlases, and five light-chest worn material-mask
atlases. Each remains a complete authored 72-frame atlas. The masks preserve
the existing 14-tier authored-mask tint contract; they replace their painted
base plane rather than layering over it. A future exhaustive/full coverage
mode may still declare a separately reviewed unarmed overlay if desired.

Run `python tools/build_sprite_assets.py --audit-player-equipment` to see the
declared set, missing canonical files, and provenance status without packing
or mutating runtime outputs. Adding coverage is a data change: add an accepted
canonical family definition to the declaration, then re-run visual review and
the authorship writer. Never add a fallback family.

## Frozen rig contract

- Cell: RGBA PNG, exactly `192x192`.
- Atlas: RGBA PNG, exactly `1536x1728` (`8` columns x `9` rows).
- Root anchor: `[96,184]`; it never changes between equipment states.
- Direction columns: `E, SE, S, SW, W, NW, N, NE`.
- Pose rows: `idle, walkA, walkB, attackWindup, attackImpact, cast, hit, death, dead`.
- Every weapon/shield keeps its authored object and gripping hand visible in
  hit, death, and dead. No frame may be substituted or clamped.
- `held.png` and family-specific `grip.png` are mandatory for every weapon and
  shield family. `rear.png` and `front.png` are optional authored occlusion
  planes. Armor requires `worn.png`; `rear.png` and `front.png` are optional.
- Material masks are optional grayscale RGBA atlases named
  `<plane>_mask_<role>.png`, where role is `metal`, `wood`, `leather`, `cloth`,
  or `accent`. Their alpha union must exactly cover the corresponding base
  plane's runtime-visible silhouette.
- A grip atlas belongs to one exact class/slot/family. Sharing a generic hand
  atlas between weapon families is forbidden.

Canonical destinations are:

```text
assets/sprites_src/player_rig_authored/<class>/<slot>/<family>/held.png
assets/sprites_src/player_rig_authored/<class>/<slot>/<family>/grip.png
assets/sprites_src/player_rig_authored/<class>/<slot>/<family>/rear.png      # optional
assets/sprites_src/player_rig_authored/<class>/<slot>/<family>/front.png     # optional
assets/sprites_src/player_rig_authored/<class>/<slot>/<family>/worn.png      # armor
```

## Artist workflow (no repositioning in code)

Create a new delivery scaffold:

```text
python tools/import_authored_player_equipment.py scaffold --class-id vanguard --slot main --family sword_1h --out tmp/vanguard_sword_1h_delivery
```

The scaffold contains 72 transparent final-size files for every mandatory
plane and 72 `guides/` images made from the accepted body atlas. Open each guide
as a locked reference layer in the painting application, paint/paste already
authored pixels into the matching transparent `cells/<plane>/` file, and export
that file at its existing `192x192` size. Never crop to content. Never use an
editor command that changes the canvas, anchor, or layer position. The guides
must be hidden on export: body pixels and registration marks do not belong in
an equipment plane.

For a one-handed weapon, put the weapon object on `held` and only its authored
gripping hand/minimum forearm on `grip`. For a two-handed family, both hands
must be authored in that family's `grip` plane and both must meet the weapon.
Directional occlusion belongs in explicit `rear`, `held`, and `front` pixels;
the importer does not guess it.

An artist may instead export complete plane atlases. Change the matching entry
in `delivery.json` from `{"cells":"cells/held"}` to
`{"atlas":"held.png"}`. Complete atlas inputs are copied byte-for-byte.

## Manual forearm annotation

Grip-plane hygiene uses reviewed per-frame forearm rectangles; it never derives
a permissive region from body or equipment pixels. If the canonical file
`assets/sprites_src/player_rig/qa/equipment_forearm_registration_v1.json`
does not yet exist, fill the scaffold's `forearm_rois.fragment.json` by visual
inspection against the final body guides. Each rectangle is cell-local
`[x,y,width,height]`, must intersect the canonical hand ROI, and must tightly
contain only the appropriate hand/minimum forearm. After an independent overlay
review, set the document review to `visual-overlay-v1` and each frame review to
`authored-visual-v1`. Do not calculate these rectangles from old masks or from
the new equipment art. Generate the draft overlay without granting review:

```text
python tools/import_authored_player_equipment.py forearm-overlay --class-id vanguard --annotation tmp/vanguard_sword_1h_delivery/forearm_rois.fragment.json --out tmp/vanguard_sword_1h_delivery/forearm_overlay.png
```

The overlay command validates the 72 manual rectangles and renders them over
the accepted body, canonical hand ROIs, and sockets. It never infers or edits a
rectangle and never changes review fields.

## Mechanical gate

Run the read-only check before import:

```text
python tools/import_authored_player_equipment.py check --delivery tmp/vanguard_sword_1h_delivery --forearm-registration tmp/vanguard_sword_1h_delivery/forearm_rois.fragment.json --qa-dir tmp/vanguard_sword_1h_qa --report tmp/vanguard_sword_1h_report.json
```

The check blocks:

- wrong PNG mode/dimensions, missing/extra/misnamed cells, and wrong frame order;
- empty mandatory frames or alpha touching a cell edge;
- weapon/shield object or gripping-hand pixels farther than two source pixels
  from a canonical socket;
- gripping hands that miss the canonical hand ROI;
- grip pixels outside independently reviewed forearm ROIs;
- armor that misses its canonical head/chest ROI;
- malformed masks, non-grayscale mask pixels, mask pixels outside the base
  plane, or missing mask coverage.

`composite.png` and `contact_overlay.png` are QA-only exact-position
composites. A passing mechanical report is not visual approval.

Import only after the check passes:

```text
python tools/import_authored_player_equipment.py import --delivery tmp/vanguard_sword_1h_delivery --forearm-registration tmp/vanguard_sword_1h_delivery/forearm_rois.fragment.json --qa-dir tmp/vanguard_sword_1h_qa --report tmp/vanguard_sword_1h_report.json
```

Import is atomic and refuses to overwrite an existing canonical family.
It does not update registrations, certify authorship, invoke the sprite build,
or modify the runtime manifest. After all 72 frames and isolated planes receive
independent visual acceptance, the integration owner updates the canonical
source map and runs `tools/write_equipment_authorship.py
--visual-review-complete`. Only then may the normal compiler/validator run.

## Explicitly forbidden importer behavior

The importer has no operation for trimming, centering, resizing, translating,
rotating, flipping, frame clamping, socket inference, body-mask extraction, or
automatic plane splitting. If an authored pixel misses its final target, the
delivery is rejected and the artist fixes the source cell.
