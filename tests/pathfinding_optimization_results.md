# Pathfinding optimization — 2026-09-07

The navigation hot paths now do less bookkeeping and allocate fewer temporary
objects. A* stores each tile's score, parent, traversal kind and closed flag in
one map instead of three maps and a set. Heap swaps use local variables; ordinary
edges no longer create cost objects. Collision sweeps calculate footprint corners
directly, and walking-region validation compares blocker bytes in a direct loop.
Blocking props are still checked on every relevant query, so destroying a prop
immediately makes its newly available routes usable.

Neighbor order, equal-cost heap ordering, expansion caps, goal retargeting, edge
costs, hop kinds and path smoothing remain equivalent to the preserved baseline.
The game entry point increments the two changed scripts' cache versions.

## Measurements

Windows, Node v22.11.0. Nine alternating batches after warmup, reporting median
CPU milliseconds per query. Each workload requires exact result equality before
timing. Both implementations execute in the same JavaScript realm; terrain,
inputs and query profiles are shared. The first three workloads replay recorded
queries on the current `north_wild` map with seed 12345.

| Workload | Before | After | Reduction |
| --- | ---: | ---: | ---: |
| Disconnected North query | 0.1703 ms | 0.0179 ms | 89.5% |
| North route, 57 waypoints | 19.3864 ms | 12.2262 ms | 36.9% |
| North route, 44 waypoints | 15.1727 ms | 9.4511 ms | 37.7% |
| A* corridor, 3,859 tiles | 1.3228 ms | 0.9281 ms | 29.8% |
| A* corridor, 7 tiles | 0.0024 ms | 0.0021 ms | 15.3% |
| Collision sweep, 40 tiles | 0.0310 ms | 0.0162 ms | 47.6% |

These are focused CPU benchmarks, not browser FPS or a guarantee for every map.
Very short queries are sensitive to timing noise. Raw results are in
[pathfinding_optimization_performance.json](pathfinding_optimization_performance.json).

## Verification

- `pathfinding_optimization_contract.mjs`: 48,086 exact baseline comparisons,
  including 100 seeded obstacle grids, weighted traversal, failed searches,
  expansion caps, footprint boundaries, six production maps and changed blockers.
- `navigation_edge_contract.mjs`: 75,272 edge and invalidation checks.
- `navigation_contract.mjs`: 991 route and actor movement checks.
- `terrain_surface_contract.mjs`: 14,654 terrain, ramp and route checks.
- `town_layout_contract.mjs`: 54,256 town path and collision checks.
- `gameplay_input_contract.mjs`: 153 input, movement, hazard and combat checks.
- Syntax checks pass for both changed runtime scripts.
- Headless Chrome passed the isolated North walking fixture: 600 simulated
  frames, 104 monsters, 25.94 tiles walked over collision-checked terrain, visible
  game canvas and in-memory saves. Synchronous update/render time was 5.6 ms
  median and 9.9 ms p95. This was a smoke test, not a controlled before/after FPS
  comparison; the maximum animation-frame interval was 449.4 ms. Raw browser
  results are in [the walking run](qa/act2/game_performance_html_zone_north_wild_phase_moving_optimization_1.json).
  The browser log also contains a resource 404 and WebGL shader precision
  warnings, retained in that report; the gameplay fixture completed successfully.

## Reproduction

```sh
node --preserve-symlinks --preserve-symlinks-main tests/pathfinding_optimization_contract.mjs
node --preserve-symlinks --preserve-symlinks-main tests/pathfinding_optimization_benchmark.mjs
```

For the browser smoke test, run `python serve.py`, then open
`tests/game_performance.html?zone=north_wild&phase=moving`. The existing
`tests/run_browser_checks.cjs` also runs this fixture when Playwright and Chrome
are available. The Node flags above accommodate this Windows environment's
restricted parent-directory realpath lookups.
