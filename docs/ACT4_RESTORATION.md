# Act IV visual restoration

All four Act IV locations now use a quieter, more readable material hierarchy.
The cathedral has fitted blue-grey stone, inset chapel aisles, smaller roundels,
and large mosaics reserved for the two main boss arenas. Cinderwatch uses worn
cobbled streets, ash, hearth light and rocky foundations; Bastion has restrained
fortress paving and continuous low bridge parapets.

The boundary renderer now splits contours where rooms meet bridges before
classifying them. Adjacent spans of the same room are joined again, keeping
coping continuous and avoiding artificial end caps. Buttresses repeat along
long walls. Directional wall shading, deeper atmospheric separation, projected
stained glass, restrained window shafts and sparse drifting dust support the
architecture. Reduced-motion preference freezes the new ambient particles.

Worn pew groups occupy available chapel side aisles. Placement checks existing
architecture, actors, story anchors, spawns, and the reserved connecting routes.
They have real collision footprints and use the existing occlusion fade. Boss
reservations, travel destinations and campaign rules are preserved.

## Original art and reproducibility

Two new paintings were made with the **built-in image_gen tool**. Original files,
the complete final prompts and registration records are saved in
`assets/sprites_src/gameplay_art_authored/act4_restoration/`:

- [Stone painting prompt](../assets/sprites_src/gameplay_art_authored/act4_restoration/source.json)
  and [original](../assets/sprites_src/gameplay_art_authored/act4_restoration/stone_source.png).
- [Pew grouping prompt](../assets/sprites_src/gameplay_art_authored/act4_restoration/pews_source.json)
  and [original](../assets/sprites_src/gameplay_art_authored/act4_restoration/pews_source.png).

`python tools/import_act4_restoration.py` repeats alpha-bound cropping, uniform
resizing, registration and lossless WebP packing. Canonical images are
`assets/sprites_src/gameplay_art/world/props/a4stone_paving.png` and
`cathedral_pews.png`; runtime copies live in `assets/sprites/packed/world/props/`.
The shared source manifest retains hashes of both original and canonical images.

## Review and validation

With `python tests/cathedral_server.py` running, open
[the comparison](http://127.0.0.1:8744/tests/act4_rebuild_review.html) or
[the playable review](http://127.0.0.1:8744/tests/cathedral_review.html).
The comparison has 15 paired scenes captured before this change and after it,
using the same preview seed, camera targets, and 1920 × 1080 canvas. Four further
3840 × 2160 views are saved in `tests/qa/act4_rebuild/`.

Validated on the final implementation:

- 400 generated maps / 3,731,000 layout assertions, including reachable objectives,
  actor clearance, reserved routes, deterministic layouts and both boss arenas.
- 33 production journey checks, including cached memory returns, rewards, completed
  objectives and the final Hell portal reveal.
- 14 real gate-opening and label-click transitions.
- 24 fresh/cached terrain pixel comparisons, including fractional camera scrolling
  and material, void and boundary invalidation.
- 306 original cathedral sprite checks, plus source hashes, anchors, registration
  and packed alpha checks for the two new assets.
- 34 nonblank scene images; all 15 comparison options, slider buttons and mobile
  page layout checked in Chrome.

In one local Chrome run, the eight 1080p movement/combat samples had median CPU
update/render times of **1.9–3.5 ms** and p95 times of **2.4–5.5 ms**. Four 4K combat
samples had medians of **2.7–5.2 ms** and p95 times of **3.4–9.0 ms**. Each sample
used 60 warm-up and 180 measured frames with verified movement or exchanged
attacks; all warm terrain caches stayed stable. These measure CPU submission
time on this machine, not GPU completion or a cross-device frame-rate guarantee.
Raw measurements are in `tests/qa/act4_rebuild/after_report.json`.

Re-run the new captures with `node tests/act4_rebuild_browser.cjs after`, the
comparison checks with `node tests/act4_rebuild_browser.cjs review`, and image
validation with `python tests/act4_restoration_sprites.py`. On this Windows host,
Node needs `--preserve-symlinks --preserve-symlinks-main` and the bundled
Playwright directory on `NODE_PATH`.
