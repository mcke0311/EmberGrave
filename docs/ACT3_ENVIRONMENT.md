# Act III environments and passages

The current material, wall-height and lighting treatment is described in
[ACT3_VISUAL_PASS.md](ACT3_VISUAL_PASS.md). Its comparison page preserves the
starting appearance shown by this older environment pass.

All seven Act III locations now assemble complete painted masonry indoors and broad natural formations outdoors. Campaign identities, dimensions, the landmark graph, encounter placement, quest anchors and boss reservations remain. There are no new upper floors or save migrations.

| Location | Environment |
| --- | --- |
| Dig Camp | Low dune banks, excavation road and checkpoint integrated with the raised departure terrace. Services and collision/elevation grids are unchanged. |
| Shifting Wastes | Wider seeded sand basins and paths, rocky formations and existing buried landmarks. |
| Shard Flats | Fractured rock shelves, crystal outcrops and sand transitions; existing ramps and lower bypass retained. |
| Underground Market | Weathered sandstone walls and recessed arcade passages. |
| Shifting Tombs | Heavy funerary stone, burial niches, broken sections and sand-covered foundations. |
| Palace | Imperial masonry with restrained gold and turquoise. |
| Sovereign's Tomb | Dark funerary masonry, chains and monumental stair passages. |

## Layout, assembly and artwork

`imperialEnvironment` in `js/mapgen.js` runs after the existing Act III layout and encounter generation. Outdoor widening uses deterministic variation around the existing routes and courts, preserving reserved footprints and the Shard Flats elevation transition. Indoor changes attach passages to nearby boundaries.

`map.act3.environment` records materials, facing axes, solid sides, selected modules, endpoints, contours, foundations, natural formations and passages. Act II rendering remains separate. Masonry runs use complete three-, two- and one-tile paintings, dedicated inside/outside corners and boundary-following doorway end pieces. The renderer no longer clips long paintings into short runs or caps corners with columns. Outdoor formations are sampled along whole contours, on the blocked side, rather than restarted at each grid corner.

The 100 registered assets comprise four 16-piece masonry kits, twelve biome pieces and twenty-four passage pieces covering both sides and directions. Complete source components are cropped, uniformly scaled and registered using measured foundation sockets. Mirroring supplies matched directions where needed. Real alpha, edge matte cleanup and lossless WebP packing eliminate painted backgrounds and colored matte fringes.

Source sheets, generation prompts, revisions, hashes and registration measurements are preserved in `assets/sprites_src/gameplay_art_authored/act3_environment/`. Canonical PNGs use the `a3env_` and `a3passage_` namespaces. `tools/import_act3_environment.py` reproduces the assets and merges descriptors into the current ledger and manifest without rebuilding unrelated art. It requires Pillow and NumPy. See `tests/qa/act3_environment/asset_contact.jpg` for the full library.

Static foundations use the terrain caches. Upright art enters the actor depth list and fades when it covers the hero; empty doorway pixels are excluded from that fade. Cache identity includes environment metadata. Full-size modules use direct image draws, while scaled formations retain the existing transform sampler for identical visible pixels.

## Physical travel

All twelve directed passages use `map.thresholds` and `exit.thresholdId`. Opening, approach, trigger, destination label, foundation and attached art describe the same passage. Camp travel uses an excavation road; the Flats use an open aqueduct; indoor destinations use recessed openings or descending stairs. The old freestanding gates are removed or, in the camp, visually suppressed while retaining the established service collision layout.

Act III threshold projection includes elevation. Passage hit testing precedes decorative building bounds. Labels appear nearby or on hover with a subtle highlight, replacing generic floor rings and chevrons for these passages. Doorway joins follow actual boundary edges, including turns into the painted wings. Destination IDs, arrival keys, campaign requirements and travel rules remain intact.

## Review and reproduction

Start `python tests/act3_server.py`, then open `http://127.0.0.1:8743/tests/act3_environment_review.html`. Select a location, passage or landmark, and 1080p or 4K. **Play encounter** enables ordinary input. This review uses temporary heroes and in-memory saves.

The immutable baseline is `tests/fixtures/act3_environment_before.zip`, captured before this pass with the existing Act I and Act II work included. `python tests/act3_environment_baseline.py` restores its files to `tmp/act3_environment/before` without replacing the working tree.

```text
python tests/act3_environment_regressions.py
python tests/act3_environment_sprites.py
node tests/act3_environment_browser.cjs --pixels
node tests/act3_environment_browser.cjs --walk
node tests/act3_environment_input.cjs
node tests/act3_environment_browser.cjs --after-only
node tests/act3_environment_browser.cjs --perf-only
node tests/act3_environment_investigate.cjs
python tests/act3_environment_contacts.py
```

On the restricted Windows runtime, Node needs `--preserve-symlinks --preserve-symlinks-main`; browser scripts also need Playwright on `NODE_PATH`. Use the bundled Python runtime for NumPy-dependent asset checks.

## Validation

Reports and matched gameplay captures are in `tests/qa/act3_environment/`.

- Thirty seeds across all seven locations pass **402,493 environment checks**, including 360 passage/seed combinations, supported approaches/arrivals, boundary coverage, actual doorway edges, deterministic assembly and unchanged encounters. Eight other locations pass isolation checks with the Act III pass disabled.
- All thirteen regression suites pass: Act III layout, navigation, removed-bridge/layers, quests and combat; campaign, gameplay input, navigation edges and terrain/cache contracts. Quest checks cover relays, partial saves, scholar rescue, boss prerequisites and saved recovery. Navigation includes live golem routes without teleport fallback.
- All 100 assets pass 800 source, registration, alpha and lossless-packing checks.
- Twenty-four cached/fresh ground comparisons pass at both resolutions. The largest difference is 2/255 on at most three channels at clipped elevated-triangle antialiasing edges. Seventy-eight module comparisons are pixel-identical. Thirty warm camp frames require thirty cached image draws.
- Full-route checks pass in all twelve directions with companion routes and exact return arrivals. Six actual portal round trips retain the same map instance and exact position.
- Real Playwright mouse events pass through production input handlers for all twelve directions. Approaches exercise walking and companion following without teleport fallback; return positions and companion support are verified. A version-1 save created by the old runtime loads with home, quest progress and gold intact. See `input.json`.
- Final captures cover every landmark and passage at 1920x1080 and 3840x2160: 120 before and 120 after images. The contact-sheet script builds ten matched review sheets. Final doorway stitching and matte cleanup are included in the after captures.

## Performance investigation

The full comparison uses two alternating before/after pairs, 90 warmup frames and 240 measured frames per workload. Walking must move; combat must exchange attacks. The roster remains present and warm terrain caches must stay stable. These are CPU frame timings, not GPU completion times.

Initial results remain in `performance_initial.json` and the corresponding raw reports. Direct full-size image draws removed unnecessary per-piece transforms. The repeated full run was within the 10% target in 22 of 26 cases.

Flagged cases received two further alternating pairs, plus diagnostic runs using the current engine with the old map generator and with only the new upright art suppressed. Diagnostic scenes are excluded from acceptance. New scenes submit fewer image draws: 147 versus 189 for the measured tomb walk, and 214 versus 248 for the 4K palace walk. Omitting the art attributes about 0.75 ms median in the repeat palace walk to the upright layer; it does not explain all run-to-run variation. Neither version rebuilt warm terrain caches. Raw results are in `performance_investigation.json`.

Combining **every** full-art sample, including slower runs, leaves three cases above the requested threshold:

| Case | Before median / p95 | After median / p95 | Median / p95 change |
| --- | --- | --- | --- |
| Shifting Tombs, 1080p walking | 4.625 / 6.675 ms | 4.650 / 7.350 ms | +0.5% / +10.1% |
| Shifting Tombs, 1080p combat | 5.550 / 7.500 ms | 5.350 / 8.450 ms | -3.6% / +12.7% |
| Palace, 4K walking | 5.800 / 8.125 ms | 6.400 / 9.500 ms | +10.3% / +16.9% |

The regressions have been investigated; the 10% performance target is **not an all-case pass**. The repeat palace pair improved versus its contemporaneous baseline, while the combined record still flags its earlier slower samples. Preserve that uncertainty rather than discarding measurements. `performance_followup.json` contains all 26 comparisons. Final doorway edge stitching and fringe-only image cleanup followed the timed runs; final pixels and gameplay captures were checked afterward.
