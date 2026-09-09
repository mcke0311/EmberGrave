# Act II visual overhaul

The marsh previously appeared as a flat island on a diagonal landscape backdrop,
with densely repeated water, oversized reeds, and little separation between
environment layers. The new pass continues the water beyond the map bounds,
blends mossy banks into it, groups cypress trees along the shore, and gives the
flooded monastery stronger architectural silhouettes and warm lights.

Open the [matched before/after gallery](../tests/qa/act2_visual/gallery.html).
It contains 16 views of all five adventure areas and Greywater Landing, captured
with the same world seed and camera positions. The original captures were saved
before this pass. Final captures are also retained at 3840 × 2160.

## What changed

- Continuous teal water replaces the rough repeated surface and the visible
  landscape outside the map. The outermost water mask stays opaque, eliminating
  the diagonal seam at the edge of the level.
- Moss, leaf litter, smaller reeds, and cypress clusters replace the giant root
  stamps and clipped reed fragments on the shoreline. Shadows ground the trees.
- Gothic piers sit along the existing masonry boundaries. The Choir nave,
  collapsed cistern and Mire Mother arena receive carved stone floor inlays.
- Lanterns, colored environmental light and sparse drifting water mist add
  contrast. The lighting pass now includes Act II's existing colored lights.
- Trees and piers join the actor depth sort. Foreground trees fade to 24% when
  covering the player; entrances retain clear approach space.

`map.act2Visual` is generated presentation metadata. A separate seeded random
stream places its scenery; it never consumes the encounter random stream.
Collision, elevations, original props, enemy spawns, routes, thresholds, quest
anchors and services remain identical with this visual pass enabled or disabled.
The existing save format is unchanged. Reload the game to load the updated code.

## Art and reproduction

Five new assets were created with the built-in ImageGen tool: water, moss ground,
cypress, ceremonial floor inlay and Gothic pier. Source images and the full
[prompt set](../assets/sprites_src/gameplay_art_authored/act2_visual/prompts.json)
and [pier prompts](../assets/sprites_src/gameplay_art_authored/act2_visual/pier_prompts.json)
are retained in `assets/sprites_src/gameplay_art_authored/act2_visual/`.
The pier uses a technical magenta matte after two unsuccessful alpha requests;
the other cutouts retain generated alpha. No source artwork is painted by Python.

`python tools/import_act2_visual.py` uses Pillow and NumPy to decode that matte,
crop transparent margins, resize uniformly, register anchors and losslessly pack
the `a2visual_` namespace. It retains source hashes and registration metadata.
Packed files live in `assets/sprites/packed/world/props/a2visual_*.webp`.

## Validation

- `tests/act2_visual_contract.mjs`: **6,142 checks passed** across 30 maps,
  including exact gameplay-data equivalence, deterministic scenery, clear
  entrances, blocked terrain beneath tall scenery, traversable routes, and
  isolation from the other acts.
- Existing entrance smoke contract: **67,595 checks passed**, including travel
  apertures and reserved combat spaces.
- Existing quest contract: **103 checks passed**, including legacy/partial
  saves, boss and shard recovery, death/revive, shrine travel and portal returns.
- Existing enemy contract: **257 checks passed**.
- `tests/act2_visual_pixels.cjs`: incremental camera rendering matches fresh
  terrain at 1080p and 4K. Warm terrain and camp caches stay stable; existing wall
  source crops remain pixel equivalent. Cypress occlusion is measured separately.
- Production movement and combat were sampled in all five adventure areas at
  both resolutions. At 1080p the measured CPU frame p95 is **5.3–7.4 ms**; at 4K
  it is **4.7–6.9 ms**. These are local 240-frame samples after 90 warmup frames,
  with the full enemy population, actual hero movement, and verified exchanged
  attacks. They are not a hardware-independent FPS guarantee.

Raw reports and screenshots are in `tests/qa/act2_visual/`. Run the local review
server with `python tests/act2_threshold_server.py`, then run the browser scripts
with Playwright and Chrome available. On this Windows sandbox Node requires
`--preserve-symlinks --preserve-symlinks-main`.

```
node tests/act2_visual_contract.mjs
node tests/act2_visual_browser.cjs --profile
node tests/act2_visual_browser.cjs --4k --profile
node tests/act2_visual_pixels.cjs
```
