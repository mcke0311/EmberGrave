# Item identity and unique-art review

All **163 uniques** have individual painted inventory artwork: 139 equipment
items, nine charms, nine jewels and six glyphs. The 162 new designs were generated
individually with built-in ImageGen. Old Oak's Heart keeps its existing artwork.
The transparent originals, full prompts and source/prompt hashes are retained in
[the authored catalogue](../assets/sprites_src/gameplay_art_authored/items/uniques/catalog_v1.json)
and [import provenance](../assets/sprites_src/gameplay_art_authored/items/uniques/import_v1.json).

- Catalogue: **499 entries**, covering 300 bases, 139 unique equipment items,
  13 set items, eight consumables, 12 glyphs, three charm sizes, nine unique
  charms, six rolled jewel colors and nine unique jewels.
- `python tools/import_unique_item_art.py --check`: **passed**. All originals
  have real transparency; the 18 by 9 lossless WebP atlas contains 162 nonempty,
  distinct 64px frames with at least four pixels of padding. The manifest covers
  all 163 evaluated canonical IDs. Source, prompt, normalized and packed hashes
  match the provenance records.
- `node tests/item_identity_contract.mjs`: **4,094 checks passed**. Every item
  resolves to an existing, in-bounds frame. Unique save round trips, stale icon
  fields, identification and rolled item levels preserve its artwork. Missing
  known unique artwork throws the existing asset error. Unknown saved unique
  IDs retain base resolution. All **336 ordinary mappings** match their snapshot.
- Browser checks: **all 499 icons decoded and painted**, including **163
  distinct unique pixel signatures** at desktop and mobile sizes. All six unique
  catalogue pages were visually reviewed at 64px, including items sharing a
  base. Production pack, equipment, stash, held items, unidentified tooltips,
  shop and ground loot were inspected at 1366 by 900 and 390 by 844. HTTP and
  direct-file catalogue loading passed with no missing assets or runtime errors.
  Direct-file checks use image decode/painting because browser origin rules
  prohibit pixel reads from file-loaded canvases.
- Mechanics contracts passed: unique equipment **6,079**, unique powers
  **794**, unique drops **8,792** and co-op inventory **25** checks.
- Normal compiler encoding reproduced the packed atlas hash and preserved every
  normalized RGBA pixel. The compiler registered all 163 canonical references;
  its pack-only source guard also passed.

The full authored gameplay source audit still reports **476 existing environment
art errors**, with **zero unique-item-art errors**. These are recorded separately
in [the global audit](qa/unique_item_art/global_audit.json). The complete legacy
sprite suite and full sprite rebuild are not reported as passing.

The previous management review recorded 60 desktop and 59 mobile browser checks,
plus 897 management-contract checks. Those results concern the prior item and
dialogue work and were not rerun for this artwork change.

Run `npm run test:unique-art` for the focused asset, identity and browser suite.
On restricted Windows environments, individual Node commands need
`--preserve-symlinks --preserve-symlinks-main` if resolving the user directory
raises EPERM.

Review: [unique catalogue](item_catalog.html?group=uniques),
[all 163 designs](qa/unique_item_art/contact_sheet.jpg),
[identity audit](item_identity_audit.json),
[browser results](qa/unique_item_art/browser.json),
[compiler results](qa/unique_item_art/compiler.json).
