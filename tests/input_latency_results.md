# Keyboard presentation delay — 2026-09-07

Terrain cache updates caused the large presentation stalls in this reproduction.
Enemy AI contributed to ordinary frame cost, but removing all enemies did not
remove the stalls. This is a reproduction of the reported symptom; the original
key, zone and viewport were not supplied.

The reported 0 ms processing / 205 ms presentation split means the key handler
was quick and the subsequent frame was late. Animation-frame callbacks and
rendering can contribute after the handler completes; the split alone does not
identify enemies as the cause. See [Chrome's INP breakdown](https://developer.chrome.com/docs/performance/insights/inp-breakdown).

## Evidence

The isolated browser fixture uses the actual game animation loop, trusted Shift
key events, an in-memory save store, seed 12345, the live 3D Vanguard, and 104
generated monsters in `north_wild`. Nearby enemies are aggressive while the hero
follows a real route. Measurements include diagnostic overhead.

- At 4K, the original terrain pass produced a 384 ms keydown event with 356.9 ms
  presentation delay. Enemy updates in its expensive frame took 0.7 ms; rendering
  took 153 ms. With every enemy removed, presentation still reached 242.9 ms.
  [Initial 4K isolation](qa/input_latency/north_wild_3840_Shift.json).
- Chrome tracing recorded a 295.4 ms GPU task during a terrain cache scroll,
  including 172.2 ms raster deserialization and 121.8 ms raster flushing.
- Disabling terrain drawing while retaining enemies eliminated the long
  animation frames in a nine-second diagnostic sample. Disabling enemy drawing,
  occlusion, or the player model did not eliminate the stalls.
  [Rendering isolation and trace summaries](qa/input_latency/render_isolation_3840.json).

The original cache scrolled its large projected image, then repainted exposed
strips directly onto that image under a damage clip. At 4K, the clipped raster
commands still caused expensive work against the large canvas.

## Change

`js/level_terrain.js` now renders each exposed strip on a small reusable canvas,
then copies the finished strip into the projected terrain image. It retains a
two-pixel border, the original camera arithmetic and painting order. Overlapping
strips replace their pixels so alpha does not accumulate. The complete geometry
list remains available for foreground occlusion. Travel, resizing and geometry
changes release the patch canvas together with the old terrain view.

`index.html` advances the terrain script cache version to 14. Diagnostic switches
exist only in the test's intercepted script, not in the shipped game.

## Before/after verification

Headless Chrome 152.0.7977.76 on Windows, 3840 × 2160. Both samples use the same
seed, route and active enemy population. The baseline sample lasted 12 seconds;
the final sample lasted 16 seconds. These observed maxima are not latency bounds.

| Measurement | Previous terrain | Final terrain |
| --- | ---: | ---: |
| Maximum keyboard presentation delay | 159.7 ms | 62.6 ms |
| Maximum animation-frame interval | 233.1 ms | 72.1 ms |
| Maximum keyboard event duration | 160 ms | 72 ms |
| Recorded keyboard entries (keydown/keyup) | 76 | 100 |

[Baseline sample](qa/input_latency/strip_before_3840.json),
[final 4K sample](qa/input_latency/final_after_3840.json).

The final 1080p check ran 586 frames with enemies active: no long animation
frames, a 36.1 ms maximum frame interval, and 64 ms maximum keyboard presentation
delay. [Final 1080p sample](qa/input_latency/final_after_1920.json).

Some synchronous hitches remain: the final 4K update/render maximum was 87.4 ms,
including terrain material construction. This change reduces the reproduced
presentation stall; it does not establish hitch-free 4K or a 60 FPS floor.
The original 384 ms event was captured in a different diagnostic run; it should
not be presented as a controlled 384-to-72 ms benchmark.

Regression checks:

- `terrain_strip_pixels.html`: 24 terrain views and 188,006,400 channel
  comparisons; maximum difference 2/255. Covers raised and legacy terrain,
  scrolling in both axes, reversing, overlapping strips, 1080p/4K and fractional
  cameras. The mean error limit remains 0.01/255 per channel.
- `terrain_view_pixels.html`: canonical raised-ground raster comparisons.
- `legacy_terrain_pixels.html`: 25 Act 2 views against the original floor pass.
- `terrain_render_contract.html`: 34,562 terrain and occlusion checks.
- `terrain_view_cache_contract.mjs`: 3,970 cache lifecycle checks.
- `terrain_cache_contract.mjs`: 16,407 material cache checks.

## Reproduction

Run `python serve.py`. With Playwright and Chrome available:

```sh
node --preserve-symlinks --preserve-symlinks-main tests/input_latency.cjs --width=3840 --seconds=16 --modes=normal
node --preserve-symlinks --preserve-symlinks-main tests/input_latency.cjs --width=3840 --seconds=16 --modes=normal --terrain=before --output=tests/qa/input_latency/baseline.json
node --preserve-symlinks --preserve-symlinks-main tests/run_browser_checks.cjs terrain_strip_pixels.html
```

Use `--zone=weeping_marsh` or `--key=m` to reproduce another location or key.
Default isolation modes compare normal rendering, paused enemy AI, hidden enemy
art, and removed enemies. Additional diagnostic modes are `no-occlusion`,
`no-terrain`, `no-player`, and `no-hud`. `--trace=1` retains Chrome traces under
`tmp/input_latency/`; summaries and bounded slow-frame records go into the JSON
report under `tests/qa/input_latency/`.
