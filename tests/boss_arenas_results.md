# Dedicated arena validation

All six encounters and required counters pass. The implementation preserves existing boss designs, story keys and the in-progress campaign refresh.

## Normal pacing

Five level-appropriate ordinary builds per boss; real movement and device interactions, damage enabled, six healing and six aether draughts. All 30 runs won.

| Boss | Median | Fastest–slowest |
| --- | --- | --- |
| korvath | 2:41.2 | 0:55.6–3:01.7 |
| mire_mother | 2:03.5 | 1:15.8–2:37.6 |
| azram | 2:17.1 | 1:21.8–3:19.3 |
| empty_archangel | 2:02.5 | 1:26.6–3:16.6 |
| malthoron | 2:48.5 | 1:28.0–2:58.7 |
| vethriss | 3:52.4 | 1:49.3–4:51.7 |

Targets apply to the median across five classes. The spread reflects existing class/build differences; these are automated executions, not first-time player timings. No class or loot balance was changed.

## Correctness and presentation

- 192 seeded arenas and 3500 arena, progression, threshold, device, repeatability and lifecycle checks.
- 118,201 encounter checks; 206 collision-aware walking escapes across 258 sequence steps; 148,306 animation checks across 37,017 combat frames.
- All 18 boss/viewport combinations complete with damage enabled. Desktop and 4K use normal motion; landscape phone uses reduced motion and touch emulation.
- Death and retry preserve gold penalties and consumed supplies. Failed preloads leave the retry available. Arena checkpoints are absent from saves.
- Old defeated-boss saves retain collected and uncollected Mire/fortress rewards and a usable Hell portal. Cathedral prerequisites and the exact cached parent return are checked.
- 36 existing maps preserve terrain, exploration connections and campaign scenery; 1131 existing sprite registrations are unchanged. All six changed parent maps also pass the campaign refresh contract across 30 seeds each.
- Story, Act II, Act III, Cathedral and boss-activation regressions pass.
- 24 co-op/runtime/replication tests pass, including 2–4 player arena cases. Four independent browser clients additionally verify synchronized seals, concurrent device use, reconnects, and the visible touch death-dialog retry.
- 36 generated arena sprites pass provenance, transparency and lossless-packing checks.

## Production-loop performance

Three alternating before/after pairs per boss and viewport, six seconds of sampling after two seconds of warmup. Same seed, class, gear, final phase and capped adds. Baseline is the archived initial working tree, including the campaign art refresh. No other test process ran during sampling.

| Boss | Desktop p95, before → after | 4K p95, before → after |
| --- | --- | --- |
| korvath | 5.1 → 4.3 ms | 5.6 → 4.2 ms |
| mire_mother | 4.8 → 4.5 ms | 5.5 → 4.3 ms |
| azram | 5.2 → 4.6 ms | 6.0 → 4.6 ms |
| empty_archangel | 5.2 → 4.1 ms | 5.1 → 4.2 ms |
| malthoron | 5.6 → 4.2 ms | 6.9 → 4.3 ms |
| vethriss | 4.5 → 4.4 ms | 4.7 → 4.3 ms |

All 12 cases meet the ≤10% p95 increase budget. Measured changes range from -37.68% to -2.22%. These are Chrome CPU frame costs on this machine, not physical-phone GPU or internet-latency measurements.

Reports and captures: [`tests/qa/boss_arenas/`](qa/boss_arenas/). Commands and gameplay details: [encounter guide](../docs/BOSS_ENCOUNTERS.md). The live review is available at [localhost:8741/tests/boss_encounters.html](http://localhost:8741/tests/boss_encounters.html).
