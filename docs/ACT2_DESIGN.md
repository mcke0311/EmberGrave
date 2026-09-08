# Act II: Drowned Ruins and the Silent Choir

Act 2 now uses five authored compositions with deterministic seed variation.
The landing causeway, bell crossroads, monastery courts, reed islands, breeding
cistern and final ritual basin have distinct silhouettes and route structures.
Greywater Landing's streets, NPCs and services retain their existing layout.

| Area | Route identity | Optional discovery |
| --- | --- | --- |
| Weeping Marsh | Landing → abandoned hamlet → bell crossroads; graveyard/monastery loop; four separate destination thresholds | Lost ferry and graveyard cache |
| Flooded Crypts | Descent → cloister → ossuary → dry aisle → Choir nave; reliquary reconnects to cloister | Reliquary and votive chamber |
| Hollow Reeds | Boardwalk fork → boat graveyard or silent grove → submerged shrine | Ferryman's skiff |
| Spawn Pools | Sluice → nursery → cistern → western egg bank or eastern root sluice → brood basin | Abandoned nest |
| Choir's Ritual | Gate → choir stalls → root galleries → final threshold → Mire Mother; side gallery reconnects | Forgotten offering alcove |

## Geometry, encounters and rendering

`MapGen.generate(zoneId, worldSeed)` retains its public signature. Act 2 uses
164×164 cells in the marsh and 128×128 in the four other adventure areas. Seeds
vary landmark offsets, route bends, monster groups, weather and peripheral props.
Architectural areas have rectangular courts; organic areas have irregular banks.
Main routes reserve seven cells across their center line, and optional routes
five, leaving at least five and three usable lanes respectively after edge
clearance. All elevations are flat, so the boardwalks require no hop or ramp.

The optional `map.act2` record contains `revision`, `seed`, `identity`,
`landmarks`, `routes`, `reserved`, `anchors`, `decals`, `encounters`, `water`,
and the reserved arena when present. It is generated runtime metadata, not a
new saved-game format. Existing wall/blocked/hazard grids remain authoritative.

Scenic water has its own byte mask and blocked cells. It is not a damage hazard.
Small existing bog hazards occupy peripheral bank pockets, away from arrivals,
route centers, thresholds and boss floors. The minimap differentiates water,
dry ground, causeways and solid architecture.

Landmark foundations are solid multi-cell footprints. Doorway travel targets
sit at their clear front approaches. Tall props use the existing occlusion fade.
Water, boardwalks, paving and root mats are baked into the projected terrain
cache; changes to the water mask or decals invalidate that cache. The sprite
loader now bounds parallel image requests to avoid exhausting browser buffers
as the environment library grows.

The subsequent [enemy combat pass](ACT2_ENEMIES.md) curates local rosters and
skills while retaining population, health and XP budgets. Groups occupy
landmark courts. Entrances and shrine
arrivals have clear approach space, and events use reserved seeded anchors.
The submerged shrine always has a Choir Herald. The hatchery has one designated
Brood Mother. Her basin and the Mire Mother's 21×21 arena remain flat and clear.

## Quest and save compatibility

All zone destinations and existing spawn keys remain available. Shrine unlocks,
optional quests, per-difficulty boss deaths and the Oris quest chain retain their
existing saved records. Returning through a portal reuses its map instance.

The Ritual Heart and Vorthel occupy the reserved Choir nave. Old `q11.bossAnchor`
coordinates are relocated to that nave when its encounter is restored, preserving
`siteDestroyed`, `bossDead` and the quest state. The Mire Mother's shard is placed
inside the reserved basin; killing her early still requires the prior quest and
separate shard recovery. The arena-clearing fallback cannot erase authored Act 2
architecture after generation.

## Art sources and rebuilding

The 24 ImageGen assets comprise eight paired thresholds, eight landmarks and
eight supporting props/materials. The original PNGs, full prompts and source
registration live in `assets/sprites_src/gameplay_art_authored/act2/`.

The first native-transparency request produced an opaque checkerboard. Its
ImageGen correction and the remaining object requests use a technical magenta
matte; the importer decodes that matte to real RGBA, trims margins, scales
uniformly and registers anchors. Native alpha is preserved when available.
The water texture is intentionally opaque. Original generated pixels and hashes
are retained; the packer does not synthesize artwork.

Run `python tools/import_act2_art.py` with Pillow and NumPy available. It updates
canonical PNG descriptors, packed WebPs, the manifest, coverage and the visual
contact sheet. It only replaces entries in the `act2_` namespace.

## Review and reproduction

Run `python tests/act2_baseline.py` to verify or restore the exact captured
working-tree baseline from `tests/fixtures/act2_before.zip`. The snapshot includes
the existing uncommitted Act 1/item work; it never resets current source files.
Its manifest records individual SHA-256 hashes. Shared unchanged binary assets
are loaded from the project.

Run `python tests/act2_server.py`, then open
`http://127.0.0.1:8746/tests/act2_review.html`. The review uses temporary heroes
and an in-memory save store. It includes area, seed, landmark, before/after,
1080p/4K, playable combat, route walks, captures and profiling controls.

Node checks use `--preserve-symlinks --preserve-symlinks-main` on this Windows
sandbox. Run `tests/act2_layout_contract.mjs --record`,
`tests/act2_quest_contract.mjs`, and `python tests/act2_sprite_contract.py`.
The browser runner is `tests/act2_browser.cjs`; it requires Playwright and Chrome.
Pass `act2_review.html?walkAll`, `act2_review.html?captureAll`, or
`act2_review.html?profile&all&bothWidths&resume` as its target.

Results, matched images, artwork contact sheets and raw measurements are in
`tests/qa/act2_redesign/`. See `tests/act2_redesign_results.md` for measured limits.
