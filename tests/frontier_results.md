# Ruined Frontier implementation review

Implemented the five Act I compositions, fifteen authored landmark/ground sprites,
seeded connecting routes and staged encounters, reserved objectives and boss space,
and compatible beacon/save migration. Existing workspace changes were preserved.

## Validation

| Check | Result |
| --- | --- |
| Five areas × 30 deterministic seeds | PASS — 118,293 layout checks |
| Flat-floor navigation equivalence | PASS — 94,772 checks, 30 seeds and seven body radii |
| First-act chain, both optional quests, beacon orders, legacy saves, death/re-entry | PASS — 153 checks |
| Terrain surface | PASS — 10,734 checks |
| Navigation edges | PASS — 75,272 checks |
| Terrain view cache | PASS — 3,970 checks |
| Terrain chunk cache | PASS — 16,407 checks |
| Boss encounters | PASS — 85,616 checks |
| Playable opening | PASS — 886 checks (includes an intentional failed-load fixture) |
| Story campaign | PASS — 214 checks |
| Live adventure loading/rendering | PASS — all 31 current non-town scenes; baseline had 29 |
| Frontier sprite provenance, transparency, sizing, anchors and registration | PASS — 105 checks across 15 sprites |
| Matched visual captures | PASS — 156 images at 1920×1080 and 3840×2160 |
| Performance and warmed cache stability | PASS — all 20 comparisons, 120 workload rows |

Recorded contract output: [regressions.json](qa/frontier/regressions.json).
The live scene test visits and renders each scene; quest and boss behavior are
covered separately by the contracts and the playable encounter profiles.

The layout contract checks repeatability and variation, connected objectives and
rewards, reconnecting loops, optional branches, clear arrivals and combat centers,
five-wide ramps, full landmark collision footprints and reserved arenas.
Shardpeak had at least 52 enemies across these seeds, above its 15-kill objective.

## Performance

Baseline source commit: `b036a3bae9be7cd656ed76d8a472f6b212aacf42`.
Three alternating before/after pairs per area, resolution and workload; 90 warmup
frames and 240 sampled frames per row. The full roster remains present. Movement
uses a clear 8–12 tile travel segment and must cover at least four tiles. Combat
stages twelve durable targets in an open pocket and verifies hero/enemy attacks.
The hero uses the production 3D Vanguard. Each row separately verifies stable
warmed terrain caches. Resume reused all rows with the expected method revision,
including failures; no timing samples were discarded based on their costs.

Values are mean-of-three median/p95 **milliseconds for synchronous update, camera
and render submission**. They do not measure asynchronous GPU completion or
promise equivalent results on other hardware. Both after values must be within
110% of the corresponding baseline; all comparisons passed.

| Area | Canvas | Workload | Before median / p95 | After median / p95 |
| --- | --- | --- | --- | --- |
| Fallen North | 1080p | Moving | 3.47 / 4.53 | 3.03 / 4.27 |
| Fallen North | 1080p | Combat | 5.70 / 7.03 | 4.13 / 6.20 |
| Abandoned Mines | 1080p | Moving | 4.20 / 6.43 | 4.07 / 5.67 |
| Abandoned Mines | 1080p | Combat | 4.47 / 6.20 | 4.00 / 5.50 |
| Shattered Temple | 1080p | Moving | 7.03 / 9.40 | 3.90 / 6.93 |
| Shattered Temple | 1080p | Combat | 7.37 / 11.60 | 4.40 / 6.33 |
| Shardpeak Shrine | 1080p | Moving | 5.20 / 7.23 | 3.17 / 4.77 |
| Shardpeak Shrine | 1080p | Combat | 5.33 / 7.83 | 4.43 / 6.40 |
| Deepfreeze Caverns | 1080p | Moving | 5.50 / 7.47 | 3.67 / 4.73 |
| Deepfreeze Caverns | 1080p | Combat | 6.50 / 9.50 | 5.20 / 7.07 |
| Fallen North | 4K | Moving | 10.13 / 15.53 | 6.67 / 10.27 |
| Fallen North | 4K | Combat | 12.87 / 15.73 | 9.60 / 13.70 |
| Abandoned Mines | 4K | Moving | 14.83 / 23.67 | 9.23 / 14.47 |
| Abandoned Mines | 4K | Combat | 19.17 / 31.37 | 9.87 / 16.17 |
| Shattered Temple | 4K | Moving | 23.90 / 33.57 | 5.97 / 7.67 |
| Shattered Temple | 4K | Combat | 26.27 / 33.93 | 9.53 / 12.57 |
| Shardpeak Shrine | 4K | Moving | 17.50 / 23.03 | 6.17 / 8.43 |
| Shardpeak Shrine | 4K | Combat | 14.07 / 21.33 | 6.43 / 8.63 |
| Deepfreeze Caverns | 4K | Moving | 12.20 / 19.27 | 8.10 / 10.80 |
| Deepfreeze Caverns | 4K | Combat | 18.00 / 22.33 | 11.23 / 14.80 |

Raw comparisons: [performance_all_both.json](qa/frontier/performance_all_both.json).
The flat indoor floors now skip redundant slope checks only after a rebuild
proves continuous equal elevation; body occupancy and diagonal corners remain
checked. Ramps, edited heights and outdoor terraces retain the original rules.

## Visual review

The watchtower, mine machinery, memorial court, pilgrimage shrine and frozen
spring have distinct silhouettes. Roads, haul tracks, rubble edges and warm refuge
lights cue the routes. Large art has grounded, solid footprints outside the combat
centers. The spring is ground dressing and leaves Hoarfang's hazard readable.
The underlying tile-based cliff edges remain angular.

| Area | Matched 1080p views | Final 4K view |
| --- | --- | --- |
| Fallen North | [Before](qa/frontier/north_wild_1920_before_watch.webp) · [After](qa/frontier/north_wild_1920_after_watch.webp) | [4K](qa/frontier/north_wild_3840_after_watch.webp) |
| Abandoned Mines | [Before](qa/frontier/mines_1920_before_haul.webp) · [After](qa/frontier/mines_1920_after_haul.webp) | [4K](qa/frontier/mines_3840_after_haul.webp) |
| Shattered Temple | [Before](qa/frontier/shattered_temple_1920_before_court.webp) · [After](qa/frontier/shattered_temple_1920_after_court.webp) | [4K](qa/frontier/shattered_temple_3840_after_court.webp) |
| Shardpeak Shrine | [Before](qa/frontier/shardpeak_shrine_1920_before_summit.webp) · [After](qa/frontier/shardpeak_shrine_1920_after_summit.webp) | [4K](qa/frontier/shardpeak_shrine_3840_after_summit.webp) |
| Deepfreeze Caverns | [Before](qa/frontier/deepfreeze_cavern_1920_before_spring.webp) · [After](qa/frontier/deepfreeze_cavern_1920_after_spring.webp) | [4K](qa/frontier/deepfreeze_cavern_3840_after_spring.webp) |

Captures are high-quality WebP and ignored by Git to keep generated media out of
the source diff. The full set remains locally available and reproducible through
[frontier_review.html](frontier_review.html). The review provides seed/area/version
selection, landmark viewpoints, a route overview and playable encounters using
isolated in-memory saves. See [the design notes](../docs/FRONTIER_DESIGN.md) for
server, capture and profiling commands.

## Shared-workspace sprite gate

The full strict sprite validator exits 1: 287 baseline diagnostics and
310 diagnostics in the recorded shared workspace. The frontier-only checks
pass. The complete comparison intentionally fails and lists every added/removed
diagnostic in [sprites.json](qa/frontier/sprites.json).

Baseline failures include opaque terrain/material alpha checks, frozen descriptor
counts and retired player-rig coverage. Additional diagnostics in this run concern
Act III/cathedral opaque ground assets, cinders provenance, and the separately
changed item-icon count. Those changes are outside this frontier implementation.
The validator was not relaxed to hide them.

A final fresh load also found newly registered enemy identity IDs whose atlases
were not yet present in the shared manifest. The runtime now resolves the existing
family sprite until the optional identity entry is available. Registered identity
art still takes precedence. This preserves the concurrent enemy artwork work and
keeps the frontier review playable.

The captures and profiles represent the working sources at recording time; other
work in the shared workspace continued afterward. Results are local QA evidence,
not an assertion that the unrelated sprite gate or every later edit is clean.
