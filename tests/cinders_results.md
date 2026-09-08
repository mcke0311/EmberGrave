# Act V: Fallen Demon Kingdoms — recorded results

Implemented the three authored gauntlets, the Breach exit approach, and all 14 ImageGen sprites. Existing campaign links, spawn keys, shrines, q18, boss phases, endings and save format are retained.

[Open the playable review](http://127.0.0.1:8875/tests/cinders_review.html?zone=ash_wastes&view=bastion). Start it with `python tests/cinders_server.py`; the server restores the verified baseline archive when needed. The page provides area/seed selectors, landmark views, route overviews, before/after scenes, 1080p/4K capture, and a temporary invulnerable hero.

## Verification

- **PASS — 81,369 layout assertions**, all three maps across 30 seeds. Determinism, seed variation, landmark order, connected walking routes, five clear corridor/ramp lanes, all enemies/rewards/exits reachable without mandatory hazard damage, safe arrival pockets, solid architecture footprints and the flat 21×21 arena.
- **PASS — 241 progression assertions:** bidirectional connections, shrine attunement/travel, exact town-portal returns, death/revival, serialized progress, persistent boss defeat and all three endings.
- **PASS — browser input and persistence:** actual clicks through all six directed gate connections; real save/load retains shrines, q18 and boss flags; defeating all three Vethriss forms sets the death flag and moves q18 to reward.
- **PASS — sprite/visual review:** 14 source assets and 126 pipeline assertions; native transparency, packed WebPs, anchors, manifest, coverage and provenance. Hero occlusion fading was observed on 23 reachable architecture views; two siege towers are backed by inaccessible terrain. All three boss warning forms were captured at both resolutions.
- **PASS — existing regressions:** navigation, navigation edges, terrain surfaces, terrain caching, projected-view caching, Frontier navigation, campaign, boss encounters, boss refinements and all town layouts. Raw outputs are in [regressions.json](qa/cinders/regressions.json).
- **PASS — 80 matched before/after images**, exact 1920×1080 and 3840×2160 dimensions, decoded and hashed in [capture_audit.json](qa/cinders/capture_audit.json). Twelve additional warning/occlusion screenshots and 20 smoke views are included.

## CPU frame time

All 12 final movement/combat comparisons meet the maximum 10% median and p95 regression target. The largest measured increase is **5.2% median / 8.2% p95**, both in Cinderfields movement at 1080p. Values below are milliseconds, reported as median / p95.

| Area | Resolution | Workload | Before | After | Median change | p95 change |
|---|---|---|---:|---:|---:|---:|
| Cinderfields | 1080p | moving | 5.13 / 7.33 | 5.40 / 7.93 | +5.2% | +8.2% |
| Cinderfields | 1080p | combat | 5.87 / 8.63 | 6.07 / 8.83 | +3.4% | +2.3% |
| Cinderfields | 4K | moving | 6.43 / 8.60 | 5.13 / 7.50 | -20.2% | -12.8% |
| Cinderfields | 4K | combat | 6.77 / 8.63 | 6.20 / 8.03 | -8.4% | -6.9% |
| Cinder Bastion | 1080p | moving | 8.00 / 11.27 | 5.87 / 8.60 | -26.7% | -23.7% |
| Cinder Bastion | 1080p | combat | 9.57 / 12.87 | 6.63 / 10.57 | -30.7% | -17.9% |
| Cinder Bastion | 4K | moving | 16.43 / 23.10 | 7.83 / 10.20 | -52.3% | -55.8% |
| Cinder Bastion | 4K | combat | 25.50 / 36.67 | 8.20 / 10.67 | -67.8% | -70.9% |
| Throne of Cinders | 1080p | moving | 6.70 / 9.20 | 3.33 / 4.83 | -50.2% | -47.5% |
| Throne of Cinders | 1080p | combat | 8.23 / 12.13 | 4.23 / 5.93 | -48.6% | -51.1% |
| Throne of Cinders | 4K | moving | 22.00 / 33.27 | 4.53 / 6.87 | -79.4% | -79.4% |
| Throne of Cinders | 4K | combat | 28.73 / 49.10 | 6.00 / 8.70 | -79.1% | -82.3% |

Chrome 152.0.7977.76 on this Windows host, headless, seed 12345, real 3D Vanguard. Three alternating before/after pairs per workload and resolution; 90 warmup and 240 sampled frames per run, 17,280 total sampled frames. The full roster is retained. Combat uses the nearest twelve durable targets, with verified attacks in both directions. The original Bastion needs a 2.5-tile supported pocket; the new court supports 3.5. All warmed terrain views remained cached.

Timings measure CPU update and render submission, not completed GPU work. The baseline is the actual working tree captured at 2026-09-08 02:01:35 UTC, including its pre-existing uncommitted work. Other workspace improvements continued during implementation, so these whole-workspace comparisons do not isolate the cost of each individual change or predict other hardware.

Exploratory Cinderfields reports are retained separately. Their combat setup pulled distant packs into occupied courts, and an early run used original actor art during a concurrent sprite import. Final reports use the nearest local targets and current production actor art. The initial Bastion attempt stopped before measuring combat because the original layout had no 3.5-tile pocket; the final report uses its valid tighter pocket. No production enemy stats, AI, factions, loot or boss rules were changed to pass the benchmark.

## Review files and art provenance

- [Implementation and repeat commands](../docs/CINDERS_DESIGN.md)
- [Playable review source](cinders_review.html)
- [Machine-readable summary](qa/cinders/summary.json)
- [Full ImageGen prompts](../assets/sprites_src/gameplay_art_authored/cinders/prompts.json)
- [Registered image sizes and anchors](../assets/sprites_src/gameplay_art_authored/cinders/registration.json)
- [Baseline manifest and archive hash](qa/cinders/baseline.json)
- [Baseline archive](fixtures/cinders_before.zip)
- [Cinderfields performance](qa/cinders/performance_ash_wastes_both.json), [Bastion performance](qa/cinders/performance_cinder_bastion_both.json), [Throne performance](qa/cinders/performance_throne_both.json)

## Selected scenes

| Scene | Before | After | After at 4K |
|---|---|---|---|
| Breach departure | [1080p](qa/cinders/hellgate_1920_before_gate.webp) | [1080p](qa/cinders/hellgate_1920_after_gate.webp) | [4K](qa/cinders/hellgate_3840_after_gate.webp) |
| Bastion gatehouse | [1080p](qa/cinders/ash_wastes_1920_before_bastion.webp) | [1080p](qa/cinders/ash_wastes_1920_after_bastion.webp) | [4K](qa/cinders/ash_wastes_3840_after_bastion.webp) |
| Crown gate | [1080p](qa/cinders/ash_wastes_1920_before_forecourt.webp) | [1080p](qa/cinders/ash_wastes_1920_after_forecourt.webp) | [4K](qa/cinders/ash_wastes_3840_after_forecourt.webp) |
| Furnace gallery | [1080p](qa/cinders/cinder_bastion_1920_before_furnace.webp) | [1080p](qa/cinders/cinder_bastion_1920_after_furnace.webp) | [4K](qa/cinders/cinder_bastion_3840_after_furnace.webp) |
| Vethriss arena | [1080p](qa/cinders/throne_1920_before_boss.webp) | [1080p](qa/cinders/throne_1920_after_boss.webp) | [4K](qa/cinders/throne_3840_after_boss.webp) |

[Vethriss warning, 1080p](qa/cinders/throne_1920_warning_phase3.webp) · [Vethriss warning, 4K](qa/cinders/throne_3840_warning_phase3.webp)
