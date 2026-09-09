# Act III visual overhaul — September 2026

All seven Act III locations now use a coordinated material and lighting pass.
Continuous wind-rippled sand and buried paving replace the repeated rubble,
sand and road stamps. Market flagstones, cool burial slate and ivory palace
floors have their own palettes. Large worn sun and chained-eclipse mosaics
mark selected courts and boss chambers.

Four original facade paintings replace the fence-sized indoor walls. Rear
walls stand 132–148 pixels tall, while foreground cutaways retain 30 pixels
of their base courses. Wall textures follow continuous world coordinates,
with coping and solid end faces. The physical passage artwork and collision
boundaries remain authoritative. Projected wall images are cached and retain
the existing depth ordering and hero occlusion fade.

Outdoor dune paintings have wider, feathered margins; their low portions are
baked into the ground cache. Architectural contact shadows seat the landmarks.
Warm braziers and cool funerary lighting distinguish occupied market space
from burial chambers. Act III now uses its authored light colors. The Dig
Camp and wilderness share the same sand sampler beyond the map extent;
indoor maps continue into dark burial stone instead of exposing desert sky
at the edge of a large viewport.

The visual dressing consumes no layout random numbers. Lamps are nonblocking
and avoid reserved footprints, arrivals, hazards and passage approaches.
Enemy stats, loot, quest progress and travel destinations are unchanged.

## Review

Run `python tests/act3_server.py`, then open
`http://127.0.0.1:8743/tests/act3_visual_review.html`.
The comparison offers 19 matched starting/current gameplay views across all
seven locations, plus links into the playable isolated review. Fourteen
additional current 4K captures are saved in `tests/qa/act3_visual/`.
Preview heroes and saves remain in memory.

## Artwork and reproduction

Two original atlases were generated using the built-in `image_gen` tool:

- `assets/sprites_src/gameplay_art_authored/act3_visual/materials.png`
- `assets/sprites_src/gameplay_art_authored/act3_visual/walls.png`

Their exact prompts are `prompt.txt` and `walls_prompt.txt` in the same
directory. `registration.json` records source hashes, crops, scaling and
runtime registration. Ten canonical `a3visual_*.png` files live in
`assets/sprites_src/gameplay_art/world/props/`; matching lossless WebPs live
in `assets/sprites/packed/world/props/`. The additional packed art is 5.31 MB.

Reimport with `python tools/import_act3_visual.py`. It merges the current
authorship ledger, manifest, data mappings and coverage rather than rebuilding
unrelated art.

## Verification

- Act III layout: 111,233 checks across 30 seeds and seven areas.
- Navigation: 121,274 checks, including seven live companion routes.
- Act III quests: 51 checks covering relays, rescue, saved progress and travel.
- Act III combat: 33,074 checks across the twelve enemy types.
- Campaign: 214 checks, including old saves and progression.
- Twelve real mouse-driven passage transitions, companion arrivals, and a
  version-1 save loaded with its quest progress and gold preserved.
- Twenty-four fresh/scrolled ground-cache comparisons at 1080p and 4K.
  Maximum difference 2/255 on at most three channels at terrain edges.
- 708 projected-module comparisons are pixel-identical. Thirty warm Dig Camp
  frames use thirty cached ground-image draws.
- Ten assets pass source-hash, bundle, registration and exact PNG/WebP pixel
  equality checks. The comparison page's controls and 19 scene pairs pass.

`tests/act3_visual_browser.cjs after --verify` reproduces the final captures
and measures movement at 1080p and combat at 4K (movement in the camp).
Each sample has 90 warmup frames and 240 measured frames, asserts actual
movement or exchanged attacks, and verifies that warm terrain caches remain
stable. Raw results are in `tests/qa/act3_visual/after_report.json`.
These are synchronous update/render CPU timings, not GPU completion times
or a before/after performance comparison.

Additional entry points are `tests/act3_visual_assets.py`,
`tests/act3_environment_browser.cjs --pixels` and
`tests/act3_environment_input.cjs`. On this Windows installation Node requires
`--preserve-symlinks --preserve-symlinks-main`, with the bundled Playwright
package directory in `NODE_PATH`.
