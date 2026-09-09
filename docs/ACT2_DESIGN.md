# Act II: Drowned Ruins and the Silent Choir

The [latest visual overhaul](ACT2_VISUAL_OVERHAUL.md) adds continuous teal water,
mossy shores, cypress groves, Gothic piers, carved ritual floors and colored
lighting. See the [matched before/after gallery](../tests/qa/act2_visual/gallery.html)
for the current appearance; the boundary notes below describe the original kit.

## Painted boundaries (September 2026)

All five adventure areas now assemble painted boundary art from the collision
contours. Greywater Landing also uses the marsh kit along its existing perimeter;
its collision, streets, NPCs, services and departure remain unchanged.

The Weeping Marsh and Hollow Reeds use flat muddy shoreline ribbons with sparse
upright reeds. Their route shoulders vary gently without moving the route graph.
Flooded Crypts uses continuous wet Gothic masonry. Spawn Pools has squared stone
enclosures at the entrance and cistern, transitioning to organic root banks.
Choir's Ritual transitions from processional masonry into rooted galleries and
the boss basin. Existing doorway landmarks, seven/five-cell route reservations,
quest anchors, enemy quotas and flat boss floors remain authoritative.

`map.boundaries` is optional generated metadata, never saved. Revision 1 contains
`materials` (byte grid: 0 excluded/building or walkable land, 1 scenic bank/water,
2 root bank, 3 masonry), `segments` (`x`, `y`, `axis`, `length`, `side`, `kit`,
`variant`) and `shorelines` (ordered world-coordinate points). `axis=0` runs along
world X; `axis=1` along Y. `side` identifies the blocked side of the contour.
Segments span at most three tiles. Replacing the boundary record invalidates
the terrain cache and the sprite assembly. Generate a new map to change geometry.

Masonry is a solid strip on the blocked side; its water mask is cleared. Building
footprints are excluded because their existing landmark art already represents
them. Shoreline rounding stays within a quarter tile of collision contours.
Flat mud art is tangent-aligned into the existing bounded terrain view cache;
upright masonry, roots and sparse reeds are depth-sorted with actors and fade
to 24% opacity when they obscure the player. Short runs crop complete paintings
at their registered scale. No wall texture is warped into a polygonal face.

The 28-piece library contains masonry straights/alternates, corners, ends,
doorways and rubble; shoreline straights, corners and tapered ends; and rooted
bank straights, corners and transitions. Current contour assembly uses straight,
alternate and transition pieces; it retains existing large doorway landmarks
so narrow kit openings cannot obstruct the reserved travel lanes. Corner and
doorway modules are also registered for explicit authored placements.

Sources, full prompts, measured connection sockets and hashes live in
`assets/sprites_src/gameplay_art_authored/act2_boundaries/`. The importer is
`python tools/import_act2_boundaries.py` (Pillow and NumPy required). It extracts
the technical magenta matte, scales uniformly, records anchors and losslessly
packs the `a2boundary_` namespace. The general compiler honors each descriptor's
`lossless` flag, so a later full sprite build retains identical RGBA pixels.

Run `python tests/act2_boundary_baseline.py` to restore the exact pre-boundary
source snapshot, then `python tests/act2_boundary_server.py`. The six-area review
is at `http://127.0.0.1:8752/tests/act2_boundary_review.html`, using temporary
heroes and memory-only saves. It supports matched before/after landmark captures,
route/service walks, and three alternating timing pairs at 1080p and 4K.
Use `tests/act2_boundary_browser.cjs` with `?captureAll`, `?walkAll`, or
`?profile&all&bothWidths&resume`; Node needs Playwright and installed Chrome.
On the Windows sandbox, use Node's `--preserve-symlinks --preserve-symlinks-main`.

Boundary contracts and sprite validation are `tests/act2_boundary_contract.mjs`
and `tests/act2_boundary_sprites.py`. Captures and raw reports are in
`tests/qa/act2_boundaries/`; measured results are documented in
[ACT2_BOUNDARY_VALIDATION.md](ACT2_BOUNDARY_VALIDATION.md).

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

## Integrated entrances and exits

Act 2's five connections now use openings attached to their boundary footprints.
Greywater Landing and the marsh share timber causeway approaches and rooted banks;
the crypt uses a compact monastery arch; Hollow Reeds uses open reed-bank passages;
Spawn Pools uses low cistern sluices; the ritual connection uses broken ceremonial
piers. Both sides have matched source art and registered foundations. Eight generated
sources produce twelve losslessly packed modules, with prompts and registration in
`assets/sprites_src/gameplay_art_authored/act2_thresholds/`.

Optional generated `map.thresholds` records carry `act: 2`, a stable ID, opening,
approach, arrival, solid side footprints, connection anchors, and placed art parts.
Exits opt in through `thresholdId`; their target IDs and spawn keys remain intact.
Collision grids remain authoritative. Local approaches and return positions move
with their entrances, while landmark routes, quest anchors and combat arenas remain
protected. Map generation and save interfaces are unchanged.

Clicking the opening or destination label uses the same registered geometry as
the displayed passage. Nearby destinations are labelled; hover highlights the
threshold line. Travel remains click-only. Existing unregistered exits retain their
legacy markers, and portals and waypoints keep their existing behavior.

Paving and boardwalk approaches use terrain caches; upright architecture and banks
use full sprite bounds, actor depth ordering and foreground fading. The importer
and verification workflow are documented in `ACT2_THRESHOLD_VALIDATION.md`.
