# Fallen North cache verification — 2026-09-05

The fixed 40-chunk cache was rebuilding the entire visible terrain every frame at the Fallen North center at 1440p and at both tested locations at 4K. The frame-aware cache eliminates these warmed stationary rebuilds while preserving the rendered terrain pixels.

## Measured browser results

Windows, Codex in-app browser, Chromium 152. Deterministic map seed 12345. These are **synchronous full render submission times**, including terrain, props, lighting, HUD and the live 3D Vanguard. The test pauses simulation and removes monsters only in its isolated game instance. These numbers do not measure GPU completion or total gameplay FPS.

Each location has one warm-up frame, then 8 baseline samples and 300 fixed samples. Baseline samples are deliberately limited because repeated terrain construction is expensive. Small differences in non-thrashing views should not be treated as reliable speedups; scheduling and garbage collection affect these short measurements.

| Viewport | Location | Visible chunks | Before median / p95, ms | After median / p95, ms | Before builds per frame | After builds over 300 frames |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| 1920×1080 | Entrance | 16 | 6.5 / 11.1 | 3.8 / 5.9 | 0 | 0 |
| 1920×1080 | Center | 31 | 8.9 / 10.9 | 7.7 / 13.9 | 0 | 0 |
| 2560×1440 | Entrance | 25 | 8.3 / 18.8 | 8.1 / 16.0 | 0 | 0 |
| 2560×1440 | Center | 49 | 97.4 / 122.2 | 13.4 / 24.6 | 49 | 0 |
| 3840×2160 | Entrance | 47 | 88.7 / 138.7 | 13.6 / 24.9 | 47 | 0 |
| 3840×2160 | Center | 97 | 171.4 / 653.4 | 27.1 / 51.9 | 97 | 0 |

Moving tests use the same 24 positions for both renderers, starting at the center and advancing 0.75 x / 0.5 y tiles per sample. Fixed samples also repeat each position to verify that newly encountered chunks remain cached; these extra validation frames are excluded from the timing table.

| Viewport | Before median / p95, ms | After median / p95, ms | Before chunk builds | After chunk builds |
| --- | ---: | ---: | ---: | ---: |
| 1920×1080 | 8.7 / 16.1 | 7.6 / 14.0 | 12 | 12 |
| 2560×1440 | 95.9 / 242.5 | 13.4 / 25.4 | 1,164 | 12 |
| 3840×2160 | 321.8 / 386.5 | 43.4 / 62.1 | 2,154 | 12 |

The 4K moving workload still takes substantial render time. This patch resolves the measured cache defect; it does not establish a particular gameplay frame rate or claim to resolve other bottlenecks.

## Verification

- `node tests/terrain_cache_contract.mjs`: **16,400 checks passed**. Uses the real map generator with deterministic canvas stubs and three seeds. Six entrance/center views per seed each remain warm for 300 frames, including 49- and 97-chunk views. Covers walking, retracing, resizing, map identity changes, material reuse, memory bounds, oldest-unused eviction, once-per-frame recency, late wall caps and immutable diagnostics. Stub timings are not used as performance evidence.
- `tests/terrain_cache_benchmark.html`: **4,056 checks passed** in the browser. Six 300-frame stationary views, matching moving routes, full-render map changes and dungeon wall-cap rendering. Real before/after floor and cliff pixels match exactly for both Fallen North and the mines: **zero differing pixels out of 1,600,000 per scene**, including a fractional camera offset.
- `tests/terrain_render_contract.html`: **25,121 checks passed** for terrain and cliff geometry/seams, rendering four scenes through the production floor pass.
- `tests/level_blending.html`: **124,444 checks passed** across all 27 wilderness and dungeon maps, including ground coverage, camera stability and unchanged gameplay geometry.
- `tests/character_game_integration.html`: **150 checks passed**, including all five classes, four transformations, equipment transactions, legacy saves/URLs, save/reload, mandatory 3D rendering and WebGL failure handling.
- `tests/level_runtime.html`: **all 27 non-town levels entered and rendered** in the running game without runtime errors.
- `tests/town_redesign.html`: **6,623 checks passed** across all five towns and 46 distinct residents, verifying compatibility of the updated fixture lifecycle.
- Visual review in the live fixture confirmed blended snow/path transitions, raised terrain/cliffs, intact dungeon wall caps, and a visible 3D Vanguard in the Fallen North and mines.

All browser game fixtures use temporary in-memory save stores. No player saves are read or modified.

## Reproduction and diagnostics

With the local server running, open `http://localhost:8741/tests/terrain_cache_benchmark.html` and keep the tab visible until it reports PASS. The fixture compares the current renderer with the frozen test-only `tests/fixtures/level_terrain_v5.js`; the baseline is never loaded by the game. Its review buttons show the current Fallen North and dungeon scenes.

`LevelTerrain.getDiagnostics()` returns a frozen snapshot. `chunkBuilds`, `cacheHits`, `tileDraws`, `buildMs`, `evictions` and `visibleChunks` describe the current or most recently completed frame. Cache hits count tile accesses. `retainedChunks` and `capacity` describe the cache; the completed-frame capacity is `max(40, visibleChunks + 12)`. `totalBuilds`, `totalBuildMs`, `frame` and `mapChanges` are lifetime counters. `frameOpen` indicates whether the terrain lifecycle is active. Reading diagnostics does not reset or mutate anything.
