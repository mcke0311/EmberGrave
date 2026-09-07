# Gameplay fixes and Act 2 verification

Enemy health bars now appear on hover or for three seconds after damage, including
damage over time. The large encounter boss bar remains visible. Monsters ignore
map hazards; hero/companion hazards and player combat fields/traps retain their
effects. Ground clicks retain routing, while a 150 ms hold becomes direct steering
with collision and wall sliding, ending on release.

Legacy floors now share the projected, scrolling terrain cache used by the
Fallen North. Floor foundations, stepped cliffs and drawing order are preserved;
walls and actors remain in the normal depth-sorted pass. Terrain-grid changes
invalidate both material chunks and projected pixels. The minimap uses an alpha
mask and skips unchanged exploration states, eliminating periodic canvas readbacks.

## Measurements

Windows, headless Chrome, seed 12345, live 3D Vanguard and isolated in-memory saves.
Each walking sample runs 600 simulation frames at 1/60 second, paced by actual
animation frames. The camera follows real collision-checked player movement.
Enemy definitions and simulation randomness are seeded before the measured route.
CPU numbers measure synchronous update/render submission, including instrumentation;
frame intervals also include browser scheduling and presentation costs.

The final fixture waits for game initialization and verifies that the title overlay
is hidden. Screenshots confirm the visible game canvas. Earlier diagnostic runs
are retained under `qa/act2/diagnostic_runs/`; they are superseded by the visible
runs below. The uncached comparison uses the same new gameplay and minimap logic,
so it measures the projected floor cache's benefit, not the entire pre-change game.

| Visible walking workload | CPU median | CPU p95 | CPU maximum | Frame interval median / p95 |
| --- | ---: | ---: | ---: | ---: |
| Marsh, 1080p, uncached floor | 11.3 ms | 15.8 ms | 37.5 ms | 16.7 / 21.8 ms |
| Marsh, 1080p, cached floor | 3.7 ms | 4.9 ms | 21.8 ms | 16.7 / 16.9 ms |
| Marsh, 4K, cached floor | 6.0 ms | 9.1 ms | 73.8 ms | 16.7 / 17.0 ms |
| Greywater Landing, 1080p | 3.4 ms | 4.7 ms | 13.7 ms | 16.7 / 16.8 ms |
| Flooded Crypts, 1080p | 7.7 ms | 11.6 ms | 27.3 ms | 16.7 / 17.8 ms |
| Choir's Ritual, 1080p, clear route | 6.7 ms | 8.2 ms | 28.2 ms | 16.7 / 17.1 ms |
| Hollow Reeds, 1080p | 7.2 ms | 11.5 ms | 30.7 ms | 16.7 / 18.2 ms |
| Spawn Pools, 1080p | 8.6 ms | 12.3 ms | 60.8 ms | 16.7 / 18.1 ms |

All six Act 2 walking workloads meet the 16.7 ms CPU p95 target on this machine.
The marsh cache comparison reduces CPU median by 67% and p95 by 69%. The ritual
walking fixture temporarily removes monsters because the generated pack crowds
the narrow corridor; the hero walks 38.5 tiles over real terrain. Other walking
fixtures keep generated enemies. A separate ritual combat profile retains them.
That populated ritual combat run measured 7.8 ms median / 10.2 ms p95. A full
visible marsh replay measured 5.1 ms p95 at entry and center, 5.2 ms while walking,
and 5.0 ms with nearby enemies active.

Occasional hitches remain. Terrain scrolling/new material chunks can still exceed
one frame, and the visible 4K route had a 274.2 ms maximum animation-frame interval
outside its typical submission cost. These results do not establish a guaranteed
frame-rate floor or hitch-free 4K. The previous periodic minimap readback was also
identified in profiles (up to 30.9 ms in an intermediate run) and removed.

Raw measurements and screenshots are in [qa/act2](qa/act2/).
The [visible marsh screenshot](qa/act2/game_performance_html_zone_weeping_marsh_phase_moving_visible_1.png)
shows the cached terrain, live player, enemies and minimap.

## Regression checks

- `gameplay_input_contract.mjs`: 153 checks for click/hold timing, gesture ownership,
  both move-only settings, turning, blocked cursor destinations, wall sliding,
  raised cliffs, ramps, interruption and manual jumping. Active steering requests
  no paths. Covers every map hazard against ordinary enemies, elites and bosses,
  no passive XP/loot, player/companion hazards, combat fields, traps and DoT timers.
- `monster_targeting_contract.html`: 242,557 checks, including fresh/expired/revealed
  overhead bars, hover, death, placement, resistance nameplates and the boss bar.
- `terrain_view_cache_contract.mjs`: 3,970 checks for legacy and raised floors,
  warm frames, scrolling, 1080p/1440p/4K resizing, map/geometry/grid invalidation,
  unchanged collision data and released backing stores.
- `terrain_cache_contract.mjs`: 16,407 material-cache checks.
- `legacy_terrain_pixels.html`: 25 Act 2 views compare against the preserved
  pre-cache floor pass. No holes; maximum channel difference 2/255, including
  fractional cameras and incremental scrolling.
- `terrain_view_pixels.html`: raised-terrain cache pixel comparisons pass.
- `terrain_render_contract.html`: 34,562 geometry/render/occlusion checks pass.
- `floor_opacity.html`: 34 levels and 34,217,600 pixel samples; zero exposed
  background samples, including dungeon foundations and walls.
- `minimap_mask_contract.html`: 974,784 channel comparisons match exactly, covering
  reveal/hide, unchanged frames, map replacement, resizing and zero rebuild readbacks.
- Navigation: 75,272 edge checks, 14,654 surface checks and 991 route checks pass.
- Gameplay compatibility: 85 death, 886 opening, 214 campaign/save, 14,698 skill-perk
  and 6,348 VFX/combat checks pass. No save schema or combat-balance migration.

## Reproduction

Serve the game with `python serve.py`, then open
`tests/game_performance.html?zone=weeping_marsh`. The default runs entry, center,
walking and nearby-enemy scenarios. Use any Act 2 zone ID, `&wide=1` for 4K,
`&uncached=1` for the floor comparison, or `&phase=moving` for just the walking
sample. `&clearRoute=1` removes monsters only during that walking sample.

The Node contracts run directly with Node. The browser runner requires Playwright
and Chrome: `node tests/run_browser_checks.cjs minimap_mask_contract.html`.
Set `NODE_PATH` to the bundled runtime's package directory when using that runtime.
On this Windows sandbox, Node needed `--preserve-symlinks --preserve-symlinks-main`
to avoid a restricted parent-directory realpath lookup. Browser tests never read
or modify the user's saved heroes.
