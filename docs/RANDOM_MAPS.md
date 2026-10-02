# Session map layouts

All 30 adventure areas generate new geography when a solo hero is created or
loaded, or a new co-op party is hosted. Map instances, ordinary enemies,
containers, exploration, and temporary terrain persist during that session,
including portal returns, cathedral memories, Shifting Tombs revisits, boss
retries, and network reconnects. Towns, camps, the opening tutorial, and dedicated
boss arenas retain their authored geometry.

Difficulty tiers have separate runtime area caches. Switching tiers and returning
keeps each tier's map instances, enemies, containers, floor loot, and exploration.
These caches reset when the hero is loaded into a new session.

## Geography and safety

The campaign generators share a seeded room planner. Semantic room and quest
identities stay fixed; room positions, proportions, terrace boundaries, spanning
trees, and optional reconnecting routes vary. Dungeon entrances choose different
corners to preserve traversal distance. Required boss approaches remain attached
to their designated courts. The existing Ashen Marches generators keep their
procedural clearings and room graphs.

The planner places constrained room footprints first, then builds a connected
graph with loops. Each area keeps its existing carving and art system: natural
clearings, marsh islands and boardwalks, mine passages, imperial courts, floating
cathedral platforms, and fortress halls. Terrain, ramps, thresholds, architecture,
collision, scenery, encounters, and minimaps use those generated coordinates.
Cathedral combat spaces and gateway aprons are reserved before furniture and
encounters. Original zone destinations, objective IDs, enemy budgets, and boss
mechanics remain authoritative.

Finalized maps validate arrivals, exits, objectives, NPCs, interactions, enemy
footprints, routes, and every ramp lane. Unsafe enemy positions are moved to
nearby supported reachable ground. Generation allows eight deterministic planner
attempts, then uses the original authored composition as a checked fallback.
Generation failures and retry counts are available in the map metadata.

## Seeds and metadata

`MapGen.generate(zoneId, worldSeed)` remains deterministic for an explicit unsigned
32-bit seed. Every returned map, including hubs and arenas, carries:

| Field | Meaning |
| --- | --- |
| `layoutSeed` | Requested area generation seed |
| `layoutVersion` | Generator compatibility version, currently 1 |
| `layoutAttemptSeed` | Seed used by the successful attempt |
| `layoutAttempts` | Number of attempts, at most 9 including fallback |
| `layoutFallback` | Whether the authored fallback was used |
| `layoutDiagnostics.failures` | Previous failure reasons, present after a retry |

`U.newWorldSeed()` supplies a runtime session seed. `U.areaSeed(sessionSeed,
zoneId, difficulty)` derives stable area seeds. Saved hero `seed` fields remain
readable and retain their previous value; solo session seeds are runtime state.
Loading a hero starts a fresh session even when its legacy seed is unchanged.

The multiplayer lobby accepts an optional **World seed (hosting)**. Leaving it
blank generates a fresh seed each hosted session. Host snapshots send the
authoritative session seed, area seed, and layout version to guests. Guests
reconstruct the same geometry and reject incompatible layout versions. Co-op
build and browser/worker cache identifiers advance together to
`embergrave-coop-9`.

## Save recovery

A new session regenerates ordinary enemies, containers, exploration, and
temporary terrain. Inventory, quest actions, rescued survivors, shrine unlocks,
defeated story bosses, and earned pending rewards retain their saved progress.

Active sealed caches and unclaimed rewards survive. Saved semantic anchor IDs
are mapped to current rooms; legacy records without anchors choose a reachable
current anchor. Surviving defenders retain their health, defeated-member ledger,
and reward state while moving to safe footing. Completed ordinary caches reset
for the next session. Within a session, restoration remains idempotent and rewards
can be claimed once.

Saved co-op floor loot is decoded with its original item identities and relocated
beside the new area's safe arrival. Old grids, enemy deaths, container states, and
terrain patches are never overlaid on a rerolled map. Reconnects use the active
host's cached world instead of applying this new-session recovery.

## Validation

Run `npm run test:maps` for 100 seeds in each of the 30 areas and the session/save
contracts. Structural signatures use walkable terrain, elevation, voids, and
ramps; route signatures use room connections or walking channels. Seed fields,
floor textures, and decoration do not count as structural variation. Samples
must contain distinct geometry, multiple route configurations, and substantial
landmark movement. Reports are written under `tmp/random_maps`.

Serve the workspace with `python serve.py`, then run `npm run test:maps:browser`.
The isolated review at `tests/random_maps_review.html` uses temporary heroes and
memory-only storage. It captures all 30 areas at 1920×1080 and touch-enabled
844×390, plus two additional seeds from every act and the Ashen Marches. The
browser suite also compares movement and combat frame costs with the pre-change
generator using the same renderer and assets.

The comparison needs the pre-change snapshot described below. With no snapshot,
run `npm run test:maps:browser -- --scenes-only` for the rendered scene checks.

For paired generation timing, capture the pre-change `js` directory under
`tmp/random_maps/before/js` and run `npm run test:maps:performance` separately
from other suites. The benchmark alternates old/new ordering, warms each
generator, and measures 12 seeds per area. Worker timing excludes minimap canvas
painting; the browser checks include the rendered minimap and gameplay.

The existing layout, visual, difficulty, upgrade, and co-op contracts retain
collision, art, navigation, pacing, and persistence checks. Historical visual
contracts now compare progression identities rather than requiring unchanged
adventure coordinates; their dedicated boss-door checks account for the existing
arena overhaul.

### Verification results (2026-10-02)

- All 30 adventure areas passed 100 seeds each: 6,803,136 navigation,
  determinism, progression, and structural checks, with zero authored fallbacks.
  Every area had 100 distinct geometry signatures and 7–100 route configurations.
- Seven session/save contracts passed, including difficulty cache round trips,
  portals, cathedral and Tombs revisits, arena retries, legacy encounters,
  partial beacons, pending rewards, authoritative guest seeds, and floor loot.
- Runtime and replication checks passed together with the save contracts
  (28 tests). Co-op lobby/browser checks passed (67 checks), including an explicit
  hosting seed; network checks passed (19 checks), including map identity after
  reconnect and guest reload.
- Existing visual, layout, story, gameplay, and difficulty contracts passed.
  Marsh pacing and encounter budgets remain within their established bounds;
  cathedral combat staging, cinder arrival clearance, and full ramp lanes pass.
  All six adventure upgrade contracts also passed, including cache reward
  durability and subsequent Echo runs.
- 84 rendered scenes passed across desktop and touch phone sizes. The captures
  cover every area and three seeds in each act and the Ashen Marches.
- The defender spatial lookup produced identical terrain, props, destinations,
  and enemy positions to the unoptimized validator for five seeds in all 30
  areas. Another 100 seeds each in the Fields and first Crypt passed navigation
  and variation checks after the optimization.

The isolated desktop Chrome update/render comparison used 90 measured frames
after 30 warmup frames in six representative areas, with both movement and an
eight-enemy encounter. Mean per-scene median frame costs were 2.98 → 2.82 ms
for movement and 3.33 → 3.08 ms for combat; current per-scene p95 values ranged
from 3.1 to 6.3 ms. These are CPU timings on this machine, not portable FPS
guarantees. The same renderer and assets were used on both sides.

Paired worker generation used 12 seeds in all 30 areas. The mean of area medians
was 140.2 → 168.8 ms (about 29 ms additional generation time). The new planner
and final validation run once when an area is created; revisits use its cached
instance. Deterministic retries increase the slowest samples: the marsh's p95
was 1025 ms versus 679 ms before. Neither timing run used an authored fallback.

| Area | Previous median, ms | Current median, ms |
| --- | ---: | ---: |
| Blackbough forest | 106.7 | 178.8 |
| Fallen North wilderness | 334.5 | 376.2 |
| Weeping Marsh | 644.1 | 692.5 |
| Shifting Tombs | 66.9 | 76.0 |
| Shattered Cathedral | 35.3 | 56.5 |
| Cinderfields | 128.5 | 196.3 |

Detailed local outputs are `tmp/random_maps/contract.json`,
`tmp/random_maps/browser/report.json`, `tmp/random_maps/browser/profiles.json`,
and `tmp/random_maps/performance.json`.
