# Act III: The Buried Imperial City

Act III keeps its existing campaign destinations and prerequisites. Its six
adventure maps now compose sandstone courts, burial galleries and imperial
streets around named landmarks, with seeded offsets, route bends, reconnecting
branches, enemy positions and dressing. The Dig Camp retains its service and NPC
positions and gains an excavation gate, crane and paving at its departure.

| Area | Route and identity |
| --- | --- |
| Shifting Wastes | Excavation checkpoint → caravan court → crossroads → imperial forecourt. A circuit connects the market, tombs, aqueduct and mausoleum. |
| Underground Market | Sunken arcade entrance, bazaar circuit, three relay courts, stall clusters and guarded storeroom. |
| Shifting Tombs | Split pylon, burial galleries, central machinery, scholar's prison and a reconnecting reliquary. Secondary links change with the visit seed. |
| Palace of Khal-Zahir | Gilded gate, processional avenue, audience court, two side galleries and throne approach. Azram retains a flat, clear 21×21 arena. |
| Shard Flats | Fractured aqueduct, broad excavation basins, five-wide ramps to raised causeways, a lower quicksand bypass and a guarded overlook. |
| Tomb of the Chained Sovereign | Chained mausoleum, descending procession, round ossuary, reconnecting reliquary and clear Sovereign chamber. |

## Runtime contract

`MapGen.generate(zoneId, worldSeed)` dispatches Act III destinations to `genAct3`.
Map bounds remain 164×164 in the wastes, 128×128 in the dungeons and 36×34 in
the camp. The original travel graph and spawn keys are retained.

Optional `map.act3` metadata records `landmarks`, `routes`, `reserved` footprints,
`anchors.story`, `anchors.guards`, `anchors.events`, `decals`, `scenery`, `encounters` and `ground`.
`map.composition` aliases it for the shared terrain/event hooks. Act I's
quest-specific `map.frontier` behavior is retained.

Routes are carved before architecture and dressing. Main routes and ramps have
at least five clear lanes; neighboring crossings share a wider landing. Turns
remain outside ramp slopes. Architecture uses separate support footprints at entrances,
leaving the throat and arrival pads walkable. Props sit outside reserved story,
arrival, ramp and boss spaces. Gate occlusion samples a cached sprite alpha mask,
so the open passage does not fade merely because it is inside the sprite bounds.
Painted foreground architecture fades when it covers the hero.

Relay IDs, their six construct guards, Ilyan's prison and the fortress map use
explicit anchors. Saved relay completion selects active or disabled artwork.
Saved campaign flags remain authoritative after regeneration. Layouts are not
serialized, so this change requires no save migration. Enemy definitions, loot
rules and boss attack implementations are unchanged by this redesign.

Encounter placement checks the actual enemy radius, including elite scaling.
Flat Act III floors use the existing proven fast navigation path. Sampled
radius sweeps compare that path with the original slope-aware implementation;
Shard Flats and the Sovereign's tomb retain full ramp-aware checks.

Static materials and paving, mosaic, excavation-track, rubble and sand-drift
decals use the terrain renderer's existing caches. Indoor wall caps use dark
burial stone to distinguish solid boundaries from walkable floors.

## Authored assets

The 27 final assets consist of six entrance families, twelve supporting props,
five ground decals and four opaque floor materials. Sources, individual prompts,
registration and ImageGen provenance live in
`assets/sprites_src/gameplay_art_authored/act3/`.

The original source images are retained. `shards_v2.png` is the accepted rough
outcrop; the earlier ornamental variant is retained as a discarded source.
Technical matte removal, transparent trimming, uniform scaling and WebP packing
are mechanical import steps. No artwork is redrawn by the importer.

Reimport only this family with:

```sh
python tools/import_act3_art.py
```

Canonical PNGs live in `assets/sprites_src/gameplay_art/world/props/act3_*.png`;
runtime WebPs live in `assets/sprites/packed/world/props/act3_*.webp`. The importer
merges the latest authorship ledger, `DATA.ART`, runtime manifest and coverage
map, preserving unrelated working-tree assets. The four floor materials are
explicit opaque scenic exceptions in the shared sprite validator.

## Review and verification

```sh
python tests/act3_baseline.py
python tests/act3_server.py
```

Open `http://127.0.0.1:8743/tests/act3_review.html`. Choose an area, seed,
1080p/4K canvas, version and landmark. The page offers playable encounters,
walking between landmarks, a route overview and scene capture. It uses a
temporary hero and an in-memory save store; player saves are not modified.

The baseline ZIP preserves the working tree as it existed when Act III work
started, including the ongoing Act I redesign. Restoring it verifies hashes and
writes only to ignored `tmp/act3/before`, never the live game sources.

`?captureAll` records matched scene images at both resolutions. Performance uses
`?profile&all&bothWidths&resume`: both sides run the current engine and current
sprite manifest, with only the baseline/current map generator differing. This
separates layout cost from concurrent engine and enemy-art changes. It samples
two alternating pairs per workload, 90 warmup frames and 240 measured frames,
real movement and exchanged combat attacks. Camp has a movement workload only.

Run the contracts:

```sh
node tests/act3_layout_contract.mjs --record
node tests/act3_quest_contract.mjs
node tests/act3_navigation_contract.mjs
python tests/act3_sprite_contract.py
node tests/boss_encounter_contract.mjs
node tests/story_campaign_contract.mjs
node tests/navigation_contract.mjs
node tests/terrain_surface_contract.mjs
node tests/terrain_view_cache_contract.mjs
node tests/town_layout_contract.mjs
node tests/frontier_layout_contract.mjs
node tests/frontier_quest_contract.mjs
```

Results, source-vs-current global validator diagnostics, asset contact sheet,
matched captures and performance samples are in `tests/qa/act3/`. The global
sprite validator has pre-existing retired-rig/frozen-coverage errors; the Act III
sprite contract compares against the captured working tree and rejects any new
Act III diagnostic, while listing unrelated concurrent changes separately.
