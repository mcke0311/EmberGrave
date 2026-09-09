# Act IV visual pass — September 2026

The Shattered Cathedral, Cathedral Heart, Cinderwatch Remembered and Last
Bastion's Echo now have distinct worn stone inlays, bordered procession paths,
warm lamps, cool light from the rose windows, architectural contact shadows,
lower foreground coping and deeper, darker floating foundations. Long rear
walls have additional buttress divisions. Exposed rock accents are less frequent
and vary in scale, removing the repeated bright fringe around the islands.

Four original floor paintings were created with the built-in image tool. The
source atlas, exact prompt and crop/packing provenance are in
`assets/sprites_src/gameplay_art_authored/act4_visual/`. Rebuild with
`python tools/import_act4_inlays.py`. Canonical PNGs and lossless runtime WebPs
are registered in the existing sprite manifests and world bundle. Soft margins
are applied at runtime to blend the inlays into the surrounding stone.

The existing light renderer discarded all cathedral light colors except its
single fire color. Act IV now uses cached colored masks. Fire lamps avoid
reserved architecture, objective positions, arenas and central routes. No
layout random numbers are consumed by this dressing pass.

Floor decoration and contact shadows use the terrain cache. Foundation faces
are rasterized once in world coordinates. This fixes a viewport-dependent
clipping difference present in the starting renderer, so island edges retain
the same pixels when moving between fresh rendering and cached scroll strips.

## Review

Run `python serve.py` and open
`http://127.0.0.1:8741/tests/act4_visual_review.html` for 13 before/after scene
pairs and links into the playable review. Eight additional 4K captures are in
`tests/qa/act4_visual/`. All captures use the production renderer and isolated
preview saves.

`tests/act4_visual_browser.cjs after` captures all four areas at 1080p and 4K,
samples movement/combat, and runs the existing terrain pixel comparisons.
On this Windows installation, Node needs `--preserve-symlinks
--preserve-symlinks-main` and the bundled Playwright package directory in
`NODE_PATH`.

## Verified

- 400 seeded maps, 3,723,812 layout checks: routes, entrances, objectives,
  deterministic placement, enemy access and clear boss arenas.
- 24 fresh/cached terrain pixel comparisons, including fractional camera
  movement and terrain/boundary invalidation.
- 14 opening/label input transitions and 33 production journey checks,
  including memory returns, one-time rewards and the final portal reveal.
- 214 campaign checks and 17,005 Act IV boss compatibility samples.
- Four new assets decoded through the production world bundle; their source
  and packed pixels verified equal.

Single-run CPU samples, recorded in `tests/qa/act4_visual/after_report.json`:
1080p movement medians 2.2–2.6 ms, p95 2.8–4.0 ms; 4K combat medians
3.0–4.4 ms, p95 3.9–6.4 ms. These measure synchronous update/render CPU time,
not end-to-end display latency or a cross-machine frame-rate guarantee. The
starting 1080p movement medians were 2.1–2.7 ms, p95 2.7–3.9 ms.
