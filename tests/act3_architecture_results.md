# Act III painted architecture

The bridge prototype has been scrapped at the user's request. Generated areas no longer contain its decks, piers, carved approach corridors, upper floors, stair links or upper chests. Painted walls, existing ground routes and the Dig Camp departure terrace remain. Open the review with `?zone=khal_palace&view=avenue` to see the current palace.

`node tests/act3_layers_contract.mjs --all-seeds` now checks that all seven areas retain their walls and have no orphan upper surfaces, links or objects. Generic layered skill tests remain available independently.

The following records describe the withdrawn bridge prototype. Its captures and performance figures are historical and do not validate the current bridge-free build.

Current bridge-removal validation: all seven areas passed 30-seed layout (113,873 assertions), navigation (122,093 assertions, including seven live companion routes), and removal checks (24,557 assertions). Palace and Shard Flats browser captures at 1080p and 4K completed without browser errors; see `qa/act3_architecture/bridge_removal.json` and `bridge_removed_*.png`.

## Historical prototype record

The playable review is `http://127.0.0.1:8743/tests/act3_review.html`. Start it with `python tests/act3_server.py`. Select an area, then **Upper imperial crossing** or **Beneath the imperial crossing**, and press **Play encounter**. Normal clicking routes through the landings. The review uses an isolated in-memory save store.

If the local comparison snapshot is absent, recreate the recorded pre-change revision with `python tests/act3_architecture_baseline.py`. This does not change the working tree or branch.

All seven areas use painted architectural boundaries. Dig Camp has a raised departure terrace; each adventure area has an independent upper gallery, connected at two ground landings, with a lower passage beneath its central span. The original dimensions, campaign identities, encounters and quest landmarks remain. Crossings are deterministically placed around reserved landmarks, routes, arrivals and enemy footprints.

## Art

35 registered pieces cover palace, funerary stone, weathered sandstone, geological cliffs and bridges. The source sheets, prompts, and registration metadata are retained in `assets/sprites_src/gameplay_art_authored/act3_architecture/`. Run `python tools/import_act3_architecture.py` to reproduce the registered PNGs and lossless WebP packing. The importer uses the existing manifest/descriptor pipeline. It crops and uniformly scales complete painted modules. Only the flat paving material is rectified; wall paintings are not stretched into terrain faces.

The renderer joins three-tile wall runs, crops short terminal runs and caps masonry corners with columns. Geological boundaries use rock pieces; exposed ruins use weathered masonry. Decks are cached static paintings, separately sorted between lower and upper actors. Decks, rails, upper objects and foreground masonry fade when they conceal the player's current route. The full library retains additional doorway, corner, broken wall, buttress, arch and stair variants for further authored composition.

## Surface contract

- Surface `0` is the existing base grid. The opt-in `map.layers[1]` has its own support, blockers, heights, ramps and geometry. Piers block the lower floor outside the protected lanes.
- `surfaceId` travels with actors, path nodes, commands, loot, traps, projectiles, timed effects and portal return positions. An omitted identity means the base surface.
- Pathfinding connects floors only through `surfaceLinks`. Each local path is smoothed on its own floor. Co-located actors never change floors automatically.
- Skills and delayed releases execute in a synchronous surface scope. Combat collections, damage, propagation, collision and interactions remain on that floor. Pursuers and companions use stairs while status effects, cooldowns and expiry continue.
- Picking prefers the current floor where both are exposed; an exposed upper landing can be selected from below. The minimap and map overlay label the active floor and subdue the other route.
- Campaign saves still restore at their home hub. Portal round trips preserve the cached map and upper return position; quests and inventory schemas are unchanged.

## Verification

`python tests/act3_architecture_regressions.py` records commands and their complete outputs in `qa/act3_architecture/regressions.json`. The 30-seed Act III layout check is `node tests/act3_layout_contract.mjs`. The expanded layered contract covers both floors, walking-only companion widths, valid stair edges, return routing, overlap collisions, loot, interactions, ground fields, existing afflictions, stun and summon expiry.

`node tests/skill_vfx_contract.mjs --layered` casts all 963 skill/rank/perk scenarios against upper-floor targets with live and dead actors directly underneath. It checks health, status changes, corpse use, movement-skill floor identity and summon placement, with VFX both enabled and disabled. The current-gameplay mode also preserves the existing non-layered checks; historical snapshots from before intentional gameplay changes are not rewritten.

`node tests/act3_architecture_browser.cjs` exercises the real picker and click handler, companion ascent, upper chest interaction, and an actual portal round trip. `ACT3_ZONE` selects another area. `node tests/act3_architecture_review.cjs` captures all seven areas at 1080p and 4K and compares warmed movement/combat timing against the fresh pre-change snapshot in `tmp/act3_architecture/before`.

The paired images and raw timing measurements are in `qa/act3_architecture/`. `review.json` reports performance separately from browser errors and flags any scene outside the 10% median/p95 target. The sprite audit checks 35 source hashes, dimensions, anchors, uniform scaling, packed pixels and validator deltas. Existing global sprite-validator diagnostics are retained in paired files; no new diagnostics are accepted.

## Measured result

The full regression run passed all 18 suites; the separate Act III layout check passed 114,053 assertions across seven areas and 30 seeds. The final targeted checks are recorded in `qa/act3_architecture/final_checks.json`.

All 52 browser timing samples completed without browser errors. The 10% performance target is **not met**: 5 of 26 paired scene/mode comparisons satisfy both median and p95 limits. The median relative increase across pairs is 22.35%. Current median update-plus-render time ranges from 2.0 to 10.5 ms, with the largest p95 at 12.9 ms. These are warmed Chrome measurements on this machine, not a hardware-independent frame-rate guarantee. Additional performance work remains before this target can be signed off.
