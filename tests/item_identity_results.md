# Item identity and dialogue review

- Catalogue: **498 entries**, covering 300 bases, 139 unique equipment items,
  13 set items, 8 consumables, 12 glyphs, 3 charm sizes, 9 unique charms,
  6 rolled jewel colors and 8 unique jewels.
- `node tests/item_identity_contract.mjs`: **2,956 checks passed**. Every entry
  resolves to an existing, in-bounds frame, never the chest fallback; JSON save
  round trips, stale icon fields, identification and rolled item levels preserve
  identity. Potion types, charm sizes, glyph/jewel colors, starter silhouettes,
  armor families and one-/two-handed weapons have distinct mappings.
- Browser catalogue: **all 498 icons decoded and painted**. Visually reviewed
  the equipment atlas, all 30 supplemental silhouettes, jewel colors, supplies,
  starter gear, item tooltips and dialogue.
- Management browser suite: **60 checks passed at 1366 × 768**, **59 at
  390 × 844**. Tests use isolated saves. The count differs because desktop
  verifies two side-by-side panel bounds and narrow screens verify stacking.
- `node tests/management_contract.mjs`: **897 checks passed**.
- Authored gameplay sprite audit: **no errors**. The imported and packed item
  atlas is RGBA, 384 × 320, with alpha ranging from 0 to 255. World/item lookup
  validation also passes.

The full legacy `validate_sprite_assets.py` suite still reports terrain alpha,
outdated NPC/prop role counts and missing character rig families outside this
change. Its item-atlas expectations were updated for the supplemental atlas;
the complete suite is not reported as passing.

On restricted Windows environments, use Node's `--preserve-symlinks
--preserve-symlinks-main` flags if resolving the user directory raises EPERM.

Review: [catalogue](item_catalog.html), [management screens](management_ui.html),
[complete audit](item_identity_audit.json),
[built-in ImageGen prompts](../assets/sprites_src/gameplay_art_authored/items/prompts.json).
