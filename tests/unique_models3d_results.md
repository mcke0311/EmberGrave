# Bespoke unique equipment models — verification

Implemented 118 individually authored volumetric equipment designs: 81 weapons,
seven shields, seven helmets, eight chest pieces, seven glove pairs and eight
boot pairs. All five classes use the shared models, body fitting and animation.
Rings, amulets, belts, charms, jewels and glyphs retain their existing behavior.

The canonical-ID registry retains each inventory reference, original PNG hash,
design description, silhouette, ornament, palette and attachment metadata.
`modelId` is derived during visual resolution; saves, balance and equipment rules
are unchanged. Models remain visible before identification. Static ornaments are
batched; unchanged attachments are reused; replaced GPU resources are disposed.

## Results

| Contract | Result | Coverage |
| --- | --- | --- |
| Retained registry reproducibility | PASS | All 118 recipes, palettes, attachments and inventory references |
| Unique model contract | PASS, 68,687 checks | 590 item/class combinations; exact live coverage; source hashes; distinct triangles independent of colors, material partitions and vertex ordering; paired limbs; identification, levels and stale fields; missing-model errors; cinematic stowing |
| Ordinary model snapshot | PASS, 1,785 combinations | Geometry and materials match the snapshot taken before this change for bases, sets and excluded uniques |
| Extended catalogue | PASS, 12,532 checks | 300 bases, 139 equipment uniques, 13 sets; 2,375 class/item combinations |
| Animation | PASS, 68,720 checks | 50 class clips; continuity, scrubbing, ground contact and grips |
| Projectile origins | PASS, 40,328 checks | All 13 unique bows/crossbows on five classes; release timing, directions and elevations; ordinary ranged weapons |
| Unique WebGL rendering | PASS, 17,235 checks / 8,970 frames | All 118 designs on all five classes, three views, ten states, ranged drawing/release/reload, attachment reuse and repeated-swap GPU cleanup |
| Existing WebGL rendering | PASS, 57,620 checks | Five classes, 12 families, ten states, eight directions, six timeline samples and full armor |
| Actual game integration | PASS, 781 checks | All 590 combinations; failed/superseded preparation; rollback; co-op restoration; five unique save/reload outfits; transformations; legacy afterimages; mandatory HTTP/WebGL startup |
| Transformations | PASS, 2,596 checks | Four forms, transitions and equipped recovery |
| Cinematic poses | PASS, 1,331 checks | Equipment handling and restored grips |
| Unique equipment powers/saves | PASS, 6,079 checks | Existing 139 powers, save migration, equipment gating and combat contracts |
| Co-op / co-op inventory | PASS, 85 / 25 checks | Existing co-op identity and inventory contracts |
| Co-op replication/runtime | PASS, 21 tests | Existing replication and runtime suites |

Maximum measured primary/support grip error was `9.35e-16` world units in the
unique contract. Maximum projectile-origin error was `1.02e-13` screen pixels.
The largest unique attachment contained 10,904 triangles. The unique WebGL run
peaked at 73 draw calls; warmed and settled geometry/texture counts matched
after 20 complete-outfit swaps for each class. These measurements are from the
local Chrome/WebGL test renderer, not a mobile device performance benchmark.

## Visual review

All 118 items were inspected beside their approved 64 × 64 inventory art from
front, side and back in the 20 retained comparison sheets. Complete outfits were
inspected on all five classes in the armory and actual game, on desktop and a
touch-enabled phone viewport. The game review uses landscape (844 × 390), as
required by the existing phone shell; armory controls were reviewed in portrait
(390 × 844). Inventory views and class switching were also checked.

Review fixes included preserving the original shared skeleton bind matrices
when equipping a chest while animated, fitting vertebra ornamentation to bow
limbs, and hiding hair beneath closed helmets while keeping open crowns open.

The catalogue's stale bow assertion now follows the animated primary-hand
anchor. The integration fixture exercises the retained legacy After-Image
dispatcher directly because After-Image is no longer a learnable talent. The
existing render page's result label now reports its actual ten tested states;
the earlier retained JSON still contains its old “eight states” label.

## Evidence and reproduction

- [Canonical geometry and coverage report](qa/unique_models3d/contract.json)
- [WebGL and existing render report](qa/unique_models3d/browser-contracts.json)
- [Successful game integration report](qa/unique_models3d/integration.json)
- [Comparison pages and armory controls](qa/unique_models3d/review.json)
- [Desktop and touch-phone game outfits](qa/unique_models3d/production.json)
- Screenshots: `qa/unique_models3d/comparison-01.png` through
  `comparison-20.png`, plus `desktop-*` and `mobile-*` armory/game views.

Run `npm run test:unique-models`. Registry-only verification is
`python tools/author_unique_models3d.py --check`.

With `python serve.py` running, open
`http://localhost:8741/tests/three_character.html?unique=u_gravebite` for the
interactive armory, or `http://localhost:8741/tests/unique_models3d_review.html`
for the full front/side/back catalogue. The browser harness serves its own
temporary HTTP endpoint and uses isolated in-memory game saves.

## Existing audit baseline

The unrelated global sprite audit already reports **476 environment-art
errors**, retained in [the earlier audit](qa/unique_item_art/global_audit.json).
That audit was not changed or rerun for the 3D models. The focused 3D contracts
above pass independently; no environment-art fixes are claimed here.
