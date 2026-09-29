# Acts I–V environment refresh

All 28 campaign locations receive deterministic painted scenery, surface accents and local lighting. The opening, five hubs, dungeons and both Act IV memories are included. The separate Ashen Marches region is excluded.

Open the [matched gallery](../tests/qa/campaign_visual/gallery.html) for 1080p, 4K and landscape-phone images, or the [isolated playable review](../tests/campaign_visual_review.html) to switch between the original and refreshed renderer. The review uses temporary in-memory saves.

## Visual changes

| Act | Treatment |
| --- | --- |
| I — Fallen North | Bent firs, irregular rocky snow banks, drift and snow-contact accents, warm settlement landmarks. Mines retain earthen wear; temples and ice caves retain their distinct stone and ice materials. |
| II — Weeping Marsh | New cypress silhouettes, drowned masonry, damp paving, reed and silt accents. Existing localized marsh mist and candlelit landmarks remain legible. |
| III — Buried City | Broken dune silhouettes, sand over foundations and paving, eroded masonry and carved relief. Warm market light contrasts with cooler tombs and turquoise palace accents. |
| IV — Shattered Cathedral | Varied rear-wall Gothic supports, broken masonry, stained-glass surface accents and clearer foundations above the void. Cinderwatch has warm memory light; the remembered Bastion has a cooler stone treatment. |
| V — Throne of Cinders | Scorched supports, basalt and ash accents, sparse embers and brighter shadow detail. The throne room retains its ceremonial floor and open arena. Authored Act V light colors now reach the renderer. |

The 30 new assets come from five built-in ImageGen source sheets. [Prompts and generation records](../assets/sprites_src/gameplay_art_authored/campaign_visual/prompts.json), original transparent sources and [crop/anchor/hash registration](../assets/sprites_src/gameplay_art_authored/campaign_visual/registration.json) are retained. Import uses the existing canonical RGBA PNG and lossless WebP paths. The packed additions total 1,878,796 bytes. [Asset contact sheet](../tests/qa/campaign_visual/asset_contact.jpg).

## Integration and compatibility

`MapGen.generate` applies `campaignVisuals` only after gameplay placement, prop preparation and family settlement. A separate seeded random stream produces immutable presentation records. Existing collision, elevation, encounter, quest, interaction, spawn and exit records are preserved. No travel API or save schema changes were made.

Floor accents and contact shadows are baked into the existing terrain material caches, clipped away from unsupported cells and hazards. Upright scenery participates in the production actor depth sort and fades when it hides the hero. Placement avoids entrances, interaction anchors, spawn points and boss arenas. The extra upright layer is capped at eight props in Act II and ten in Act V, whose existing boundaries are already dense. Static cache identity includes the visual record; animated motes never modify it. Atmosphere is capped at nine anchors and 27 motes. Existing snow and marsh effects remain authoritative.

The Level Objects reference exposes the new artwork through the normal sprite registry and environment records. Character, enemy and interface artwork is unchanged.

Act II/V actors now share the bounded occlusion-candidate cache already used in Act I. Candidate lists belong to a particular terrain geometry index, retain the original polygon order, and still run the exact per-actor visibility tests. This avoids repeatedly sorting the same nearby faces during crowds and combat.

## Verification

The source snapshot was captured before edits and retained as [campaign_visual_before.zip](../tests/fixtures/campaign_visual_before.zip), with a [SHA-256 inventory](../tests/qa/campaign_visual/baseline.json).

| Check | Evidence |
| --- | --- |
| Gameplay identity and deterministic decoration | **PASS:** 121,180 final assertions across 28 locations × 30 fixed seeds. [Report](../tests/qa/campaign_visual/contract.json). The initial 127,369-check run also verifies non-campaign exclusion. |
| New artwork | **PASS:** source/packed hashes, registration, useful alpha and exact PNG/WebP pixel equivalence for all 30 assets. |
| Matched desktop captures | **PASS:** 256 before and 256 after images; 128 views at each of 1920×1080 and 3840×2160. Includes arrivals, landmarks, arenas and exits. No browser errors. |
| Phone samples | **PASS:** 128 after images at 844×390 across all 28 locations. No browser errors. |
| Visual inspection | All 28 location contact views plus five native phone samples inspected for silhouettes, surface blending, foundations, entrance openings and combat space. |
| Foreground fade | **PASS:** actual rendered scenery alpha behind the hero is approximately 22.15% of its unobstructed alpha. |
| Occlusion-cache equivalence | **PASS:** 14,400 exact ordered clipping-command comparisons at 1080p/4K across five Act II/V areas, including camera pans, reversed queries and eviction. [Report](../tests/qa/campaign_visual/pixels_campaign_clip_cache.html.txt). |
| Travel and save compatibility | **PASS:** ten real pointer-driven transfers (one round trip per act), companion following and arrival checks. An original-build version-2 save loads with gold, quests and flags preserved. [Report](../tests/qa/campaign_visual/input.json). |
| Navigation, campaign, opening and terrain contracts | See [individual results](../tests/qa/campaign_visual/regressions.json) and inherited failures below. |
| Rendering and cache pixels | Terrain-view, marsh-boundary, Act III environment, cathedral and Act V environment fixtures pass. Strict full-redraw/strip identity has inherited differences described below. |

### Inherited test failures

Four existing contracts fail identically when run against the untouched source snapshot: Act II boss/shard recovery, Act III relay inertness, Cinders shrine attunement, and the Hellgate building footprint assertion. These are retained in the validation logs. This visual refresh does not alter the corresponding quest or layout behavior. Ten other existing suites pass, including the Level Objects reference/asset/state checks, 121,842 Act III navigation checks and the repaired surface/cache fixtures.

Older fixtures required their missing navigation/boss dependencies and touch/Path2D stubs to be restored. The Act II visual comparator also needed to normalize the new cosmetic record before hashing and preserve key ordering. These fixture repairs do not bypass gameplay assertions.

The legacy terrain-strip oracle predates several existing visual changes. A fresh full redraw versus today's strip cache shows sparse integer-camera edge differences and expected fractional-camera resampling differences. The same diagnostic was run against the captured baseline; both reach the same maximum channel difference of 74/255. The original failures and full diagnostics are retained in `pixels_terrain_strip_pixels.html.txt` and `pixels_baseline_terrain_strip_pixels.html.txt`; they are not reported as exact pixel identity. [Region-by-region comparison](../tests/qa/campaign_visual/cache_comparison.json) confirms the differences are inherited.

### Performance

The performance runner measures five representative areas, one per act, at 1080p and 4K. Each movement/combat workload uses three alternating before/after pairs, 600 warmup frames and 240 RAF-paced measured frames. It retains the full enemy roster, verifies actual movement and mutual attacks, uses the production 3D Vanguard, and checks that stationary terrain caches stay warm. Each run's median, p95, maximum, movement/attack evidence and cache counts are retained. Timings measure JavaScript update/render submission, not GPU completion.

Final results are recorded in [performance.json](../tests/qa/campaign_visual/performance.json). The acceptance target is no more than 10% regression in the mean of the three per-run medians and p95 values. Failing runs remain in the evidence directory.

The first run met the target in 18/20 workloads, with p95 regressions of 26.1% in marsh 4K combat and 10.6% in fortress 1080p combat. This prompted the smaller upright-scenery budgets. Light/scenery isolation trials, an unsuccessful mirror-cache experiment, and V8 CPU profiles are retained alongside the original results. The mirror cache was removed. Profiling identified repeated occlusion queries as a major CPU cost; the final build enables the existing candidate cache for Acts II/V. Final Act II/V measurements use 600 normally paced warmup frames; the original warmup submitted 15 frames per animation callback. Their fresh before/after pairs use the frozen baseline and final production renderer. The unchanged Acts I/III/IV retain their original paired results. Candidate source fingerprints prevent `--resume` from accepting stale runs. Later runs also retain all individual CPU and frame-interval samples.

<!-- performance-results -->

**20/20 workloads meet the 10% target.** All individual runs, including failures, are retained.

| Area | Width | Movement median / p95 | Combat median / p95 |
| --- | ---: | ---: | ---: |
| north_wild | 1920 | +3.2% / +7.7% | +0.0% / -1.2% |
| north_wild | 3840 | +1.6% / +3.4% | +0.7% / -3.2% |
| weeping_marsh | 1920 | -12.2% / -9.6% | -29.9% / -30.4% |
| weeping_marsh | 3840 | -10.5% / -6.6% | -18.2% / -19.0% |
| khal_palace | 1920 | -9.5% / -11.0% | -2.0% / +4.1% |
| khal_palace | 3840 | +1.9% / -4.4% | -0.5% / +8.2% |
| cathedral1 | 1920 | -1.1% / -2.4% | -5.1% / -6.2% |
| cathedral1 | 3840 | -5.1% / -5.7% | -1.3% / -2.2% |
| cinder_bastion | 1920 | -24.6% / -23.5% | -25.1% / -24.7% |
| cinder_bastion | 3840 | -18.5% / -22.5% | -8.4% / -15.8% |

<!-- end-performance-results -->

## Reproduce

From the repository root, restore the frozen baseline and serve the ordinary application:

```powershell
python tools/prepare_campaign_review.py --restore
python tools/prepare_campaign_review.py
python serve.py
```

Open `/tests/qa/campaign_visual/gallery.html` or `/tests/campaign_visual_review.html` on the local server. Automated browser runners expect port 8741. The review's capture buttons download files through the browser; the automated runner writes the consolidated QA directory.

```powershell
node --preserve-symlinks --preserve-symlinks-main tests/campaign_visual_contract_all.cjs
python tests/campaign_visual_sprites.py
node --preserve-symlinks --preserve-symlinks-main tests/campaign_visual_regressions.cjs
node --preserve-symlinks --preserve-symlinks-main tests/campaign_visual_pixels.cjs
node --preserve-symlinks --preserve-symlinks-main tests/campaign_visual_pixels.cjs --clip
node --preserve-symlinks --preserve-symlinks-main tests/campaign_visual_input.cjs
node --preserve-symlinks --preserve-symlinks-main tests/campaign_visual_browser.cjs before
node --preserve-symlinks --preserve-symlinks-main tests/campaign_visual_browser.cjs after
node --preserve-symlinks --preserve-symlinks-main tests/campaign_visual_browser.cjs after --phone
node --preserve-symlinks --preserve-symlinks-main tests/campaign_visual_performance.cjs --paced --resume
python tools/campaign_visual_validation_summary.py
python tools/campaign_visual_gallery.py
```

Run CPU performance measurements without other browser tests in parallel. `--resume` preserves recorded runs. To reproduce inherited contract failures, preload `tests/campaign_baseline_read.cjs` with Node's `--require` option; it redirects JavaScript source reads to the snapshot. `--strip --baseline` runs the baseline strip diagnostic.
