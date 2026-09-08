# Act IV — Cathedral of Memories

The two main cathedral levels now use authored memory islands and seeded
connections instead of the shared crypt halls. Each 112×112 map has three
arrangements; room dimensions, memory placement, routes and dressing vary by
seed. Traversable islands sit above an authored dimensional backdrop with
blocked void between them. Five- and seven-tile bridges connect the islands.

The Shattered Cathedral has an arrival bridge, a nave, Cinderwatch, Last Bastion
and Mount Karrhal chapels, and the Empty Archangel's sanctuary. The existing
three soul IDs belong to their matching memory chapels. The Cathedral Heart has
an outer procession ring, three ritual rooms containing the existing seals,
priests and sword pieces, and Malthoron's central throne platform. Both boss
floors retain the encounter system's flat, unobstructed 21×21 reservation.

## Optional memories

| Zone | Entrance | Encounter and return |
|---|---|---|
| Cinderwatch Remembered (`cathedral_cinderwatch`) | Burned gate at the Cinderwatch chapel | A horseshoe street, ruined homes, memorial square and courtyard shortcut. Three five-enemy approach packs, then an elite Hollow Knight and four escorts. |
| The Last Bastion’s Echo (`cathedral_bastion`) | Breached gate on the Heart's outer ring | Defensive courtyard, flanking barracks and a return court. Three five-enemy approach packs, then an elite Choir Priest and four escorts. |

Each 72×72 side map has two mirrored arrangements and an environmental lore
interaction. The target first-play detour is 4–6 minutes; this is a pacing target,
not a forced timer. The rich cache stays locked until all five encounter members
die. It uses the normal rich-chest loot roll and opens only once per map instance.
There are no additional journal requirements or unique reward tables.

Returns through a side-zone gate request the existing cached parent map. Enemy
objects, dropped items, explored tiles and opened chests remain intact. A normal
entry into either main cathedral generates a new arrangement and invalidates
that parent's side-map, enemy and ground-item caches. The existing town-portal
return behavior remains available. Saves still retain campaign progress and
reload at the existing home location; map instances are not newly serialized.

## Art and rendering

Thirty installed raster assets cover five gateways, six architectural modules,
six landmarks, six story-object states, four floor materials, two decals and a
dimensional backdrop. Built-in ImageGen originals and exact prompts are retained
in `assets/sprites_src/gameplay_art_authored/cathedral/`. The materials sheet's
unused preview decals are superseded by the separate transparent decal source.

Run `python tools/import_cathedral_art.py` to repeat the mechanical import. It
crops declared cells, trims transparent margins, scales uniformly, preserves
native alpha, and registers sources with the existing sprite compiler. Runtime
assets live in `assets/sprites/packed/world/props/cathedral_*.webp`; the importer
updates only this library's declarations in the shared data, source manifest,
runtime manifest and coverage report. The normal compiler resolves the same
authored descriptors. No generated image is referenced outside the workspace.

Map metadata records room roles, connections, objective anchors, reservations,
decals, materials and void cells. Void remains blocked in the existing collision
grids and is excluded from floor and masonry painting. Exposed foundations use
authored pixels clipped to the actual boundary faces. Material changes and void
changes invalidate the projected terrain cache. Tall architecture uses the
existing hero-occlusion fade. Story appearances are independent of their original
interaction identities: freed bindings, broken seals and emptied reliquaries
keep their saved completion state. The Hell aperture becomes visible after
Malthoron dies; its existing campaign prerequisites still control travel.

## Review and verification

Run `python tests/cathedral_server.py` and open
`http://127.0.0.1:8744/tests/cathedral_review.html`. Select a zone, seed, arrangement
via seed, landmark, 1080p/4K canvas, or playable encounter. The page uses a temporary
hero and an in-memory save store. Captures and performance reports are saved to
`tests/qa/cathedral/`. The optional Before control uses the local snapshot in
`tmp/cathedral/before/`, captured before this implementation; that ignored
snapshot is not needed to play or review the redesigned zones.

Architecture views bring the tall room landmarks into view without changing
their in-game scale. The final portal art preview reveals only its appearance;
the production journey check separately verifies its boss-defeat reveal.

- `node tests/cathedral_layout_contract.mjs --record`: 100 seeds per zone,
  routes, actor clearance, objective anchors, arrivals, blocked void, reservations,
  deterministic generation and arrangement coverage.
- `python tests/cathedral_sprite_contract.py`: original/source hashes, alpha,
  packed assets, anchors, declarations and normal compiler resolution.
- `node tests/cathedral_browser.cjs journey`: actual production transitions,
  cached parent and child state, encounter-locked rewards, and final portal reveal.
- `node tests/cathedral_browser.cjs pixels`: full-vs-cached floor comparisons,
  integer/fractional scrolling, and material/void cache invalidation.
- `node tests/cathedral_browser.cjs capture`: every landmark at 1080p and 4K.
- `node tests/cathedral_browser.cjs profile [zone] [width]`: three alternating
  before/after pairs for production movement and combat, with real 3D heroes,
  verified attack exchanges, warm-up, and stable-cache checks.
- `node tests/cathedral_browser.cjs verify-performance`: final-scene samples
  against those saved baselines after landmark-placement refinements.

On this Windows environment, Node entry paths require
`--preserve-symlinks --preserve-symlinks-main`; browser scripts also need the
bundled Playwright packages on `NODE_PATH`. Existing campaign, boss, navigation,
terrain-cache and frontier contracts remain part of the regression pass.

The general partial-loadout sprite validator reports four pre-existing runtime
guard failures concerning procedural geometry, player scaling, cliff-branch
detection and title rendering. `python tests/cathedral_runtime_audit.py` compares
those diagnostics with the pre-change snapshot: this pass introduces none.
Cathedral source and packed-art checks are independently strict.

## Recorded results

- **400 maps / 3,268,737 checks:** all four zones, 100 seeds each, with every
  required landmark present, reachable anchors, valid returns, completely clear
  entrance aprons, continuous three-tile lanes and clear arenas.
- **214 campaign checks**, **85,616 boss checks**, **75,272 navigation-edge
  checks**, **3,980 terrain-cache checks** and **10,734 terrain-surface checks** pass.
- **33 production journey checks** and **24 terrain pixel comparisons** pass.
  Completed artwork survives regeneration; caches pay once; optional returns
  preserve the original map, enemies, exploration and dropped loot.
- **98 scene captures** cover entrances, room layouts, architectural landmarks,
  both arenas and side-zone loops at 1080p and 4K.
- **306 cathedral sprite checks across 30 assets** pass. The affected Act 1
  layout, quest and navigation contracts pass (118,293 / 153 / 94,772 checks).
  All 105 Act 1 asset checks pass, but its full shared-workspace sprite gate
  remains red because of unrelated Cinders provenance and monster/item role
  coverage differences. See `tests/qa/cathedral/frontier_sprite_regression.txt`.

Final median CPU frame times in headless Chrome, including production update
and rendering, compared with the saved three-pair pre-change baseline:

| Level / resolution | Movement before → after | Combat before → after |
|---|---:|---:|
| Shattered Cathedral / 1080p | 9.90 → 3.50 ms | 8.90 → 4.30 ms |
| Cathedral Heart / 1080p | 11.70 → 3.60 ms | 9.83 → 4.90 ms |
| Shattered Cathedral / 4K | 30.63 → 4.70 ms | 20.87 → 5.20 ms |
| Cathedral Heart / 4K | 23.57 → 3.70 ms | 17.40 → 4.70 ms |

All eight final workloads also pass the 95th-percentile 10% regression limit.
These are local CPU workload measurements, not a guarantee of display FPS on
other hardware. Raw samples, 1080p/4K scene captures and diagnostics are retained
in `tests/qa/cathedral/`. The 4–6 minute detour duration remains a first-play pacing
target rather than a measured human playtest result.

The subsequent [Act IV enemy skills implementation](CATHEDRAL_ENEMY_SKILLS.md)
documents the authored combat profiles, mixed encounters and isolated skill review.
