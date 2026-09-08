# Act V: Fallen Demon Kingdoms

Act V uses authored combat courts with seeded connecting routes, room offsets,
enemy packs and environmental dressing. The Cinderfields are a battlefield of
ash, ruined siege equipment and broken imperial monuments. The Bastion has a
military circuit through mustering, furnace, battlement, command and treasury
courts. The Throne progresses through a fallen-kings gallery and guard court
to a ceremonial causeway and Vethriss's clear arena.

## Travel and combat

The existing links remain Breach → Cinderfields → Throne, with the Bastion as
an optional branch from the battlefield crossroads. The Bastion treasury has
a return passage to the entry. Combat is continuous; there are no new wave
locks. Existing zone rosters, enemy stats, pack-size rules, faction infighting,
loot and boss phase mechanics are retained. The ordinary enemy budgets are
96, 120 and 36 respectively, rounded up to complete the last pack.

Map dimensions remain 164×164 for Cinderfields and 128×128 for both interiors.
Room shoulders, the seven-wide corridors and ramps preserve five tested clear
walking lanes. Ash/lava pockets remain beside the route. Gate jambs have
separate solid footprints around a clear threshold, and the sprite's registered
ground anchor matches the travel rectangle. Arrivals remain outside that
rectangle. The Breach keeps its services, roads, residents and town footprint;
its existing exit now has a battlefield gate.

Vethriss's 21×21 arena is reserved before decoration, kept flat, and excluded
from hazards, ambient events and ordinary encounter placement. The throne
backdrop sits beyond its combat floor. The generic boss-reservation pass does
not recarve the authored arena.

## Runtime data

`MapGen.generate(zoneId, worldSeed)` is unchanged. `map.composition` records
the layout revision, landmark IDs, route points, reserved rectangles, ground
decals, staged encounters, event anchors and peripheral scenery. It also marks
whether cached terrain cliffs replace individual wall sprites and whether an
arena has already been reserved. The Breach has a small composition record for
its review viewpoints; it continues using settlement terrain.

Collision still uses the wall/blocked/elevation grids and `TerrainSurface`.
Rendering reuses architecture culling, depth sorting and hero occlusion fading.
Ground overlays are composited into `LevelTerrain` chunks and its projected view
cache; they are not repainted individually each frame. Generic event placement
uses reserved seeded anchors. Frontier and Act II metadata continue to work.

Zone IDs, return-spawn keys, shrines, q18, boss-death flags, difficulty unlocks
and all three endings remain unchanged. Saves store the world seed and campaign
records rather than generated maps, so regeneration adopts the layout without a
save-format migration. In-session portal returns use the cached map and exact
saved return coordinates.

## Art sources

Fourteen sprites were created with built-in ImageGen: five entrances, six
architectural/battlefield landmarks, and three ground overlays. Original PNGs
and the full prompt set are in
`assets/sprites_src/gameplay_art_authored/cinders/`. The first crown gate was
generated during the initial exploration and recovered from that tool output.

`python tools/import_cinders_art.py` preserves native transparency, trims empty
margins, resizes uniformly and registers reviewed ground anchors. The ground
overlays include semi-transparent foreground pixels; their original maximum
alpha is 254, which is preserved rather than forced opaque. The importer updates
the canonical authored descriptors, source hashes, packed WebPs, runtime
manifest and coverage. No procedural replacement art is used.

## Repeating the review

The actual working tree before implementation was captured once in
`tmp/cinders/before/`, including uncommitted work. The baseline manifest records
every file hash. `tests/cinders_baseline.cjs` refuses to overwrite that snapshot;
do not recapture it after applying this redesign.
The verified snapshot is also packaged in `tests/fixtures/cinders_before.zip`.
The review server restores it automatically when the temporary snapshot is absent;
the archive and original file hashes are recorded in `tests/qa/cinders/baseline.json`.

Run `python tests/cinders_server.py`, then open
`http://127.0.0.1:8875/tests/cinders_review.html`. The review has area, seed,
before/after, 1080p/4K and viewpoint selectors, playable encounters, route
overviews and capture/performance controls. It uses in-memory saves only.

The browser runner requires Playwright; `NODE_PATH` may point to the bundled
runtime's node_modules directory. On restricted Windows installations add
`--preserve-symlinks --preserve-symlinks-main` after `node`.

```text
node tests/cinders_layout_contract.mjs --record
node tests/cinders_gameplay_contract.mjs --record
python tests/cinders_sprite_contract.py
node tests/cinders_browser.cjs smoke
node tests/cinders_visual.cjs
node tests/cinders_travel_browser.cjs
node tests/cinders_browser.cjs capture
node tests/cinders_browser.cjs profile ash_wastes
node tests/cinders_browser.cjs profile cinder_bastion
node tests/cinders_browser.cjs profile throne
```

`--legacy-actors` is an explicit review-only option that uses the existing
original actor art while an independent monster-art replacement is incomplete.
It is shown in the review status and recorded in browser QA results; production
assets and gameplay data are not changed. Performance comparisons must use
the same actor-art mode for both versions.

Performance uses three alternating before/after pairs at both resolutions,
90 warmup and 240 sampled frames per moving/combat workload, the full roster,
and a real 3D Vanguard. The twelve nearest durable targets exercise the local encounter; distant packs are not pulled into its court. Moving
samples verify actual travel and both workloads check stable warmed caches.
Combat uses the nearest supported pocket outside the boss arena; the original Bastion needs a 2.5-tile radius, while the redesigned court supports 3.5. Timings measure CPU update/render submission, not completed GPU work.
Reports and screenshots are saved under `tests/qa/cinders/`.
