# Act I: Ruined Frontier

The five northern adventures now start from an authored composition in `MapGen`.
The watch road, mine refuges, temple courts, pilgrimage terraces, and frozen spring
have stable identities. Seeds change their offsets, connecting doglegs, branch
attachments, encounter choices, and secondary dressing.

## Composition

`MapGen.generate(zoneId, worldSeed)` and all zone dimensions are unchanged.
This composition is selected only for the five Act I adventure IDs; it does not
replace Frosthaven, the playable opening, or the other acts' generators.

| Area | Structure | Optional reward |
| --- | --- | --- |
| Fallen North | Last Watch crossroads; watch-post, burial-ground and quarry beacon loop; minehead and temple forecourt | Caravan cache and northern overlook |
| Abandoned Mines | Main haul route and return circuit through three named refuge pockets | Sealed pay store |
| Shattered Temple | Entrance, processional hall, memorial court, final vigil and sanctuary | Reliquary route rejoins the procession/court |
| Shardpeak Shrine | Two reconnecting ascents across broad terraces | Votive overlook |
| Deepfreeze Caverns | Galleries and narrowed links open into the spring basin; shelf returns to the gallery | Abandoned spring stores |

The composition reserves rooms, routes, arrivals, ramps, boss arenas and solid
landmark footprints before placing encounters and incidental content. Corridor
centers are five tiles wide, within wider irregular shoulders. Outdoor ramps have
five usable lanes. The map's peripheral cells stay solid scenery. A few larger
mountain silhouettes sit on fully blocked bases, away from the playable road.

Encounter packs retain the existing zone rosters, pack-size rules, stats and loot.
Their budget is staged in courts with quiet travel between them. Ranged groups
have accessible open flanks; optional rewards receive an elite guard. Shardpeak
always exceeds the existing fifteen-kill requirement.

## Map metadata

The optional `map.frontier` object contains:

- `revision`, `seed`, and `identity` for composition identity.
- `landmarks`: stable IDs, labels, centers, room extents, entrances, clear combat space, art, elevation and solid footprints.
- `routes`: endpoint IDs, optional-branch flag, width and connecting points.
- `reserved`: arrivals are also represented by `map.spawns`; reserved rectangles describe architecture, scenery and boss space.
- `anchors.beacons`, `anchors.survivors`, and `anchors.events`: stable placements consumed by quest/event systems.
- `encounters`: staged group roles, landmark IDs and their generated spawns.
- `decals`: static rail, paving, rubble and spring artwork baked into terrain chunks.
- `scenery`: sparse peripheral silhouettes on solid bases.

The existing wall/elevation/blocked grids remain authoritative for collision and
navigation. Tall architecture uses the existing occlusion fade and full collision
footprints. The temple's boss arena is reserved first; the historical arena-clearing
pass therefore cannot erase the surrounding temple composition. Hoarfang retains
the original spring hazard code and radius.

For the three flat indoor frontier maps, surface rebuilding proves that every
walkable floor tile has the same height and that there are no ramps. Navigation
can then omit redundant height and connected-edge work while retaining occupied
body-cell and diagonal-corner collision checks. Adding a ramp or rebuilding after
a height change invalidates that shortcut. Outdoor ascents use the existing
ramp-aware path. The navigation equivalence contract compares both paths across
thirty seeds, seven body radii, dynamic blockers, and edited heights.

## Save compatibility

Zone IDs, exit destinations, return-spawn keys, shrines, and `mines_surv_0` through
`mines_surv_2` remain stable. Regenerating a map adopts the new layout. Quest,
rescue, shrine and boss records stay in the existing save format.

The beacon quest adds `destroyedBeaconIds` while continuing to store `beacons`.
Count-only saves deterministically credit watch-post, burial-ground, then quarry.
Three credited beacons restore the Oathsworn even when an old record lacks
`trioSpawned`. New encounters record `trioLandmarkId`; legacy coordinates are
checked for supported, reachable terrain and repaired to a beacon clearing when
necessary. Duplicate beacon deaths cannot add credit twice.

## Artwork and rebuilding

Fifteen transparent sprites were generated with built-in ImageGen using the
existing Frosthaven artwork as a reference. Original sheets, prompts, source
hashes, and placement registration live in
`assets/sprites_src/gameplay_art_authored/frontier/`.

`python tools/import_frontier_art.py` performs fixed-cell slicing, technical green
matte removal for the two architecture sheets, native-alpha import for ground
dressing, uniform resizing, anchor registration and the existing pack-only
compiler operation. It adds canonical descriptors, runtime WebPs, manifest lookup
entries, and world-bundle coverage. It does not regenerate the source artwork.

## Review and checks

Run from the repository root:

```powershell
node --preserve-symlinks --preserve-symlinks-main tests/frontier_baseline.cjs
python tests/frontier_server.py
```

Open `http://127.0.0.1:8741/tests/frontier_review.html`. It provides area, seed,
version, 1080p/4K canvas size, landmark viewpoints, a route overview and playable
encounters. Its heroes and saves exist only in an in-memory store. The baseline
helper restores pre-redesign sources into ignored `tmp/frontier/before`, without
changing the working source tree.

`?captureAll` records matched landmark and arrival images for both versions at
both resolutions. Images are high-quality WebP to keep 4K recording requests
small. `?profile&all&bothWidths` runs three alternating before/after pairs per
area and resolution, with moving and combat workloads, ninety warmup frames and
240 sampled frames. Movement uses a clear 8–12 tile travel segment, away from
initial packs and exits, and must cover at least four tiles while sampled. Combat
uses the nearest open pocket with twelve durable targets, including a close melee
target, and must exchange hero and enemy attacks. Samples retain the full enemy
roster and use the real 3D Vanguard. A separate stationary render sequence checks warmed cache stability.
Times measure synchronous update, camera and render submission, not GPU completion.
Add `&resume` to reuse all completed rows with the matching workload revision,
including any failing timings. Remove it to record a fresh full run.

```powershell
node --preserve-symlinks --preserve-symlinks-main tests/frontier_layout_contract.mjs --record
node --preserve-symlinks --preserve-symlinks-main tests/frontier_quest_contract.mjs --record
node --preserve-symlinks --preserve-symlinks-main tests/frontier_navigation_contract.mjs --record
python tests/frontier_sprite_contract.py --assets-only
python tests/frontier_sprite_contract.py
```

The layout contract checks all five areas across thirty deterministic seeds. The
quest contract includes the first-act chain, both optional quests, beacon orders,
duplicate deaths, count-only saves, partial rescue saves, actual death/revive and
re-entry, shrine retention and completed bosses. The sprite contract checks the
new artwork and compares the complete legacy validator diagnostics with the
recorded pre-redesign commit. That older global gate has existing opaque-material,
frozen descriptor-count, and retired player-rig coverage failures. The report also
records additional diagnostics from other edits in the shared workspace; it never
leaves an old passing result behind when that comparison fails.

See `tests/frontier_results.md` and `tests/qa/frontier/` for recorded results.
