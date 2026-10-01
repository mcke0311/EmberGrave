# Unique model refinement — revision 2

All 118 included uniques now have individually retained refinement profiles and
artwork palettes. The five classes share richer equipment geometry: forged blade
sections and guards, curved axe edges, sculpted skulls and ribs, faceted jewels,
layered shield rims, contoured helmets, rounded shoulder shells, collars and back
plates, overlapping gauntlet joints and tapered boots with shaped toe defenses.
The original inventory images and design descriptions remain the references.

Unique equipment uses procedural 128 × 128 surface maps and vertex paint for
wear and recesses. Two packed maps retain surface color/grain, roughness,
metalness and restrained emission in a single material batch per attachment.
Each moving bow limb and arrow keeps its own batch; strings, grips and projectile
anchors retain their original metadata. Shader programs and replaced geometry,
materials and textures follow the existing disposal path. Appearance keys include
the derived recipe revision; saves and item identities are unchanged.

## Measurements

| Measurement | Retained baseline | Refined |
| --- | ---: | ---: |
| Included designs | 118 | 118 |
| Item/class combinations | 590 | 590 |
| Maximum triangles per item, including pairs | 10,904 | 5,224 |
| Mean triangles per design | 3,222.2 | 2,422.7 |
| Total triangles across 118 designs | 380,219 | 285,877 |
| Reported unique render peak | 73 calls | 71 calls |
| Procedural map dimensions | 128 × 128 | 128 × 128 |

Every refined geometry signature differs from its baseline, independently of
colors, material partitions and vertex order. The maximum primary/support grip
error is `9.35e-16` world units; projectile error is `1.02e-13` screen pixels.
The refined draw-call measurement samples **every** rendered animation frame;
the baseline recorded the final sample per item. The peak is Wildkeeper casting
with Wintershot (`u_gen_3_1`) at phase 0.55. The required ceiling remains 73.

After warming two complete outfits, 20 repeated swaps per class retained exactly
the same geometry, texture and shader-program counts. These are cumulative counts
in one renderer caching the five classes, rather than per-item allocations.

| Last class warmed | Baseline geometry / textures | Refined warm = settled geometry / textures / programs |
| --- | --- | --- |
| Vanguard | 110 / 43 | 84 / 29 / 11 |
| Ember Witch | 206 / 83 | 154 / 55 / 11 |
| Gravebinder | 308 / 123 | 230 / 81 / 11 |
| Wildkeeper | 413 / 163 | 309 / 107 / 11 |
| Veil Ranger | 515 / 203 | 385 / 133 / 11 |

These measurements use local Chrome/WebGL with the existing lighting and renderer
resolution. The touch-enabled browser viewport is a layout and rendering check,
not a physical-phone performance benchmark.

## Verification

| Contract | Result |
| --- | --- |
| Registry reproduction | PASS: all 118 profiles, palettes, references and attachments |
| Unique models | PASS: 71,568 checks; all 590 combinations, paired limbs, source hashes, bounded geometry/maps/emission, distinct refinement, identification, levels and stale saved fields |
| Existing equipment snapshot | PASS: all 1,785 ordinary, set and excluded combinations retain geometry and materials |
| Catalogue | PASS: 12,532 checks / 2,375 class/item combinations |
| Animation | PASS: 68,720 checks / 50 clips |
| Projectile origins | PASS: 40,328 checks |
| Unique WebGL | PASS: 17,236 checks / 8,970 frames, attachment reuse and repeated-swap cleanup |
| Ordinary WebGL | PASS: 57,620 checks across five classes, 12 families, ten states, eight directions and six timeline samples |
| Actual game integration | PASS: 781 checks, all 590 unique combinations, preparation failure, rollback, superseded changes, save/reload, co-op, forms and legacy afterimages |
| Transformations | PASS: 2,596 checks |
| Cinematic poses | PASS: 1,331 checks; stowed equipment and restored grips |
| Unique powers, equipment and saves | PASS: 6,079 checks |
| Inventory identity and art | PASS: 4,094 checks across 499 catalogue entries |
| Unique drops | PASS: 8,792 checks |
| Co-op and inventory | PASS: 85 / 25 checks |
| Co-op replication and runtime | PASS: 21 tests |

All 118 designs were reviewed beside their actual 64 × 64 inventory images from
front, side and back in the 20 refined comparison sheets. Comparison cameras now
frame equipment directly; paired gloves and boots each receive a close-up. The
gameplay-scale player thumbnails remain alongside them. Complete outfits were
reviewed on all five classes in desktop and mobile armory views and actual game
views. The touch-enabled game review uses landscape, 844 × 390; armory controls
also retain their 390 × 844 portrait review. Inventory views were inspected.

Player bodies, animation clips, ordinary materials, balance, item IDs and save
schemas retain their existing behavior. Rings, amulets, belts, charms, jewels and
glyphs remain excluded. Known included uniques with missing models still fail
preparation; unknown saved identities retain their previous fallback.

## Evidence and reproduction

- [Per-item before/after geometry and coverage](qa/unique_models3d_refined/contract.json)
- [WebGL, GPU resources and game integration](qa/unique_models3d_refined/browser-contracts.json)
- [CPU contract results](qa/unique_models3d_refined/cpu-contracts.json)
- [Catalogue, armory and actual game review](qa/unique_models3d_refined/review.json)
- [Measurements and before/after capture hashes](qa/unique_models3d_refined/measurements.json)
- Baseline captures: `qa/unique_models3d/`; refined captures:
  `qa/unique_models3d_refined/comparison-01.png` through `comparison-20.png`,
  plus the separate desktop/mobile armory, outfits, gameplay and inventory PNGs.

Run `npm run test:unique-models`. The browser harness writes refined outputs and
supports `--review-only`, `--contracts-only`, `--unique-render-only`,
`--integration-only` and `--production-only` for focused checks. Registry-only
verification uses `python tools/author_unique_models3d.py --check`.

With `python serve.py` running, open
`http://localhost:8741/tests/unique_models3d_review.html` for the comparisons, or
`http://localhost:8741/tests/three_character.html?unique=u_gen_6_2&class=vanguard`
for the animated armory. Review saves are isolated in memory.

## Existing audit baseline

The unrelated global sprite audit still has its recorded **476 environment-art
errors** in [the earlier audit](qa/unique_item_art/global_audit.json). It was not
modified or rerun for this refinement. The focused unique-model checks pass
independently.
