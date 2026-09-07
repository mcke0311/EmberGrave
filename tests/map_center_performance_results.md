# Map-center stuttering — 2026-09-06

Two costs were reproduced in the Fallen North:

- The raised-ground renderer repainted the complete visible floor, cliffs, and
  rear rims each frame, although its source material chunks were already cached.
- Enemies repeatedly searched most of the 160 × 160 map when a nearby cliff or
  blocked destination made their target unreachable. Several searches could
  run in one simulation tick.

The renderer now retains one projected floor canvas, with a 192-pixel margin on
each side. It scrolls existing pixels at integer offsets and paints only exposed
strips. It rebuilds after map/geometry changes or viewport resizing and releases
the obsolete canvas backing store. Actor occlusion still uses the actual terrain
polygons, indexed in 128-pixel spatial cells so each actor checks nearby terrain.
Candidate polygons retain the original clipping order, with duplicates removed.
Fractional camera movement filters the completed raster once.

Navigation uses equivalent shared-edge checks for adjacent centers when the
actor is narrower than one tile. Large bodies, jumps, and path smoothing retain
the swept-footprint checks. A cached connectivity map rejects unreachable
walking goals, including A*'s retargeted blocked destinations. Its blocker
snapshot is checked on each nontrivial query, so destroyed props reopen routes.

## Measurements

The initial Windows in-app browser reproduction used seed 12345, a 1920 × 1080
game canvas, the live 3D Vanguard, and all 104 generated monsters. At the map
center with simulation enabled, synchronous update/render time was **32.8 ms
median, 111.7 ms p95, and 230.3 ms maximum** over 120 frames. The terrain pass
alone was 24.4 ms median. The hero was stationary and no enemies had aggro in
that particular center sample; it is not a combat frame-rate claim.

After terrain caching, the same stationary workload measured **6.8 ms median,
11.2 ms p95, and 13.8 ms maximum**. The camera stress route then exposed the
separate AI bottleneck. Later changes add incremental image scrolling and the
unreachable-goal shortcut; final route measurements are recorded below.

1080p browser run with terrain scrolling and navigation fixes (before the final
spatial lookup optimization):

| Workload | CPU median | CPU p95 | CPU maximum | Frame-interval median / p95 |
| --- | ---: | ---: | ---: | ---: |
| Entry, simulation enabled (120 frames) | 3.7 ms | 7.9 ms | 11.6 ms | 16.7 / 16.9 ms |
| Center, simulation enabled (120 frames) | 6.2 ms | 9.5 ms | 10.6 ms | 16.7 / 17.2 ms |
| Camera stress route (360 frames) | 7.1 ms | 15.9 ms | 93.8 ms | 16.7 / 21.0 ms |
| Aggressive nearby enemies (120 frames) | 6.1 ms | 10.9 ms | 16.3 ms | 16.7 / 17.1 ms |

The moving route recentered the terrain image four times; the most expensive
terrain update was 34.6 ms. Occasional outliers remain: the moving CPU maximum
was 93.8 ms, and the combat fixture had one 266.9 ms animation-frame interval
outside its measured update/render work. This is a substantial reduction in
the reproduced bottlenecks, not a claim that all scheduling/loading hitches
are eliminated. Enemy wandering and browser scheduling vary between runs.

Final 3840 × 2160 run, including the spatial lookup:

| Workload | CPU median | CPU p95 | CPU maximum | Frame-interval median / p95 |
| --- | ---: | ---: | ---: | ---: |
| Entry, simulation enabled | 6.6 ms | 12.2 ms | 372.3 ms | 17.6 / 18.1 ms |
| Center, simulation enabled | 21.0 ms | 25.7 ms | 31.8 ms | 22.5 / 27.2 ms |
| Camera stress route | 17.3 ms | 32.2 ms | 223.0 ms | 18.9 / 38.7 ms |
| Aggressive nearby enemies | 14.3 ms | 29.1 ms | 32.5 ms | 16.5 / 31.4 ms |

The final 4K terrain scroll update peaked at 62.3 ms. Large-window rendering
still costs appreciably more than 1080p, with occasional browser scheduling and
loading outliers; this change does not establish hitch-free 4K or a 60-FPS floor.
The same fixture before the spatial lookup measured 24.3 ms median / 44.2 ms
p95 on the moving route. Short samples and varying enemy behavior make that
an indicative comparison, not a controlled universal speedup.

`node tests/navigation_performance.mjs` replays eight slow queries against the
preserved original pathfinder, with five alternating samples per query. Every
returned waypoint, including null results, matches exactly. Failed searches
that took **174–211 ms** now take **0.19–0.21 ms**. The three successful long
routes took **40–80 ms before and 11–19 ms after**. Full measurements are in
`navigation_performance.json`. These are Node CPU times, not browser FPS.

## Verification

- `terrain_view_cache_contract.mjs`: 2,725 checks for scrolling, 1080p/1440p/4K
  resizing, geometry/map invalidation, released/reused canvas backing stores,
  and exact equality of indexed versus full-scan clipping commands.
- `terrain_cache_contract.mjs`: 16,407 material-cache checks.
- `navigation_edge_contract.mjs`: 75,272 checks against swept collision for
  walls, cliffs, ramps, diagonal movement, hopping, six body radii, and blocker
  changes.
- `navigation_contract.mjs`: 991 movement and long-route checks.
- `terrain_surface_contract.mjs`: 14,654 checks, including required destinations
  on five seeds and continuous ramp/jump height.
- `terrain_view_pixels.html`: five stationary/panning/scrolling comparisons;
  no interior opacity holes. Cached pixels differ from a fresh translated world
  raster by at most 2/255 per channel. At integer camera positions the original
  renderer also differs by at most 2/255. Fractional-camera filtering changes
  fine edge/texture pixels (mean absolute channel difference 2.4434/255 in the
  tested fractional view); this is intentional resampling, not exact pixel
  equality with the per-tile renderer.
- `terrain_render_contract.html`: 34,562 checks, including 1,860 hidden and
  7,580 visible actor pixels with both direct and cached terrain.
- Syntax checks pass for all four changed runtime scripts.

Browser fixtures use temporary heroes and an in-memory save store. No player
saves are read or written. Performance timings include profiling overhead and
measure synchronous CPU submission separately from animation-frame intervals;
they do not measure GPU completion or guarantee a minimum gameplay frame rate.

Open `tests/game_performance.html` to repeat the center, synthetic camera route,
and active-enemy workloads. Use `?wide=1` for a 3840 × 2160 game canvas or
`?uncached=1` to compare complete terrain repainting with current navigation.
The moving case advances the camera/hero through prescribed coordinates and
can cross blocked ground; it is a rendering/pathfinding stress test, while the
separate navigation contracts verify legal walking.
