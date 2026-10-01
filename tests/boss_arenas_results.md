# Boss damage, counters and distant pressure validation

All six encounters use distinct counters and warned interception moves. Their base attack damage is exactly five times the previous value, and Korvath's oath targets recharge in 24 seconds. Azram alone requires a mirror puzzle; the five combat bosses can progress without completing a counter. Existing health, defenses, forms, thresholds, story keys, rewards and artwork are preserved.

## Normal pacing

Five level-appropriate ordinary builds per boss; real movement and combat counters, damage enabled, six healing and six aether draughts. All 30 runs won and every boss exercised pressure. Ordinary attack spacing and recovery windows were adjusted to preserve pacing at the higher damage.

| Boss | Median | Fastest–slowest |
| --- | --- | --- |
| Korvath | 2:54.9 | 0:59.9–3:35.7 |
| Mire Mother | 2:25.0 | 1:35.8–3:04.8 |
| Azram | 2:33.0 | 1:22.1–3:17.9 |
| Empty Archangel | 2:35.1 | 1:33.1–3:33.3 |
| Malthoron | 3:01.0 | 1:46.4–3:42.5 |
| Vethriss | 3:44.5 | 2:00.4–5:10.1 |

Targets apply to the median across five classes, with the existing five-second test tolerance. The spread reflects existing class/build differences; these are automated executions, not first-time player timings. Current health and defenses are unchanged. No class or equipment balance was changed.

## Correctness and presentation

- 192 seeded arenas and 6254 arena, wall entrance, walking route, progression, threshold, mirror, repeatability and lifecycle checks.
- 318 new checks cover optional-counter victories, each success/failure path, repeated targets, partial soul replacements, threshold bursts, simultaneous hits, direct damage, damage over time, companions and cleanup at 20, 30 and 120 simulation steps per second. Passive ground fields and corpse shattering cannot identify Vethriss.
- 1732 pressure checks cover raw fivefold damage through strikes, charges, projectiles, beams and pools, with difficulty/Echo multipliers and weakening; recharge boundaries, alternating targets with ordinary walking, targeting, controls, existing slow cleanses and lifecycle cleanup at three simulation rates. All 144 blind straight/circling routes encounter pressure and all 288 warned routes have collision-safe walking escapes after a 150 ms reaction delay, including corners and slowed players.
- 118,200 encounter checks; 202 collision-aware walking escapes across 264 sequence steps; 153,986 animation checks across 38,437 combat frames.
- All 18 boss/viewport combinations complete with damage enabled. Desktop and 4K use normal motion; landscape phone uses reduced motion and touch emulation. A final phone rerun also verifies basic melee taps on bound souls and the real serpent, plus two-tap mirror alignment. Identification uses solid/hollow shapes without relying on color or animation.
- All 48 phase/viewport pressure previews pass 224 rendered checks for locked warnings, pressure cues and countdowns, plus walking escapes through the production touch handler in all 16 phases. Desktop, 4K and reduced-motion touch captures are retained.
- Death and retry preserve gold penalties and consumed supplies. Failed preloads leave the retry available. Arena checkpoints are absent from saves.
- Old defeated-boss saves retain collected and uncollected Mire/fortress rewards and a usable Hell portal. Cathedral prerequisites and the exact cached parent return are checked.
- 36 existing maps preserve terrain, exploration connections and campaign scenery; 1131 existing sprite registrations are unchanged. All six changed parent maps also pass the campaign refresh contract across 30 seeds each.
- Story, Act II, Act III, Cathedral and boss-activation regressions pass.
- 30 co-op/runtime/replication tests pass, including 2–4 player arena cases and actual counters and victories in all three Echo encounters. Four independent browser clients additionally verify synchronized seals, a single authoritative charge collision, replicated target cooldowns, reconnects, and the visible touch death-dialog retry.
- The 36 existing arena sprites are reused; bound souls use existing spectral artwork.
- Six additional destination-specific entrance sprites sit against existing room walls. All 18 boss/viewport doorway previews pass real mouse or touch entry and return, with safe arrivals and exact parent reuse. The arena-side arches have matching wall framing. Source transparency, provenance and lossless packing pass. A sealed-arena touch check confirms walking input passes through the faded door; relocated remains retain their saved IDs and loot selection. All twelve additional entrance frame-cost cases pass the 10% budget (largest measured increase: 8.33%). Reports are in `tests/qa/boss_entrances/`.

## Production-loop performance

Three alternating before/after pairs per boss and viewport, six seconds of sampling after two seconds of warmup. Same seed, class, gear, final phase and capped adds. Baseline is the implementation immediately before this damage/pressure change, retained as `tests/fixtures/boss_pressure_before.json.gz`. All 77 archived sources match the measured baseline by SHA-256. No other test process ran during sampling.

The pressure scenario directly starts each new pressure move after warmup, while the baseline starts its corresponding existing attack at the same distant hero position. Damage is enabled; diagnostic player, companion and add health pools of 100,000 keep actor populations stable while allowing real control hits. Every current sample records a pressure cast. Scheduling, moving targets and ordinary health pools are covered by the separate contracts and playthroughs.

| Boss | Desktop p95, before → after | 4K p95, before → after |
| --- | --- | --- |
| Korvath | 4.8 → 4.4 ms | 4.3 → 4.4 ms |
| Mire Mother | 4.7 → 5.1 ms | 4.6 → 4.5 ms |
| Azram | 4.5 → 4.6 ms | 4.4 → 4.5 ms |
| Empty Archangel | 4.0 → 3.8 ms | 4.3 → 4.1 ms |
| Malthoron | 4.3 → 4.1 ms | 4.2 → 4.6 ms |
| Vethriss | 4.1 → 4.3 ms | 4.0 → 4.2 ms |

All 12 cases meet the ≤10% p95 increase budget. Measured changes range from -8.33% to +9.52%. These are Chrome CPU frame costs on this machine, not physical-phone GPU or internet-latency measurements.

Reports and captures: [`tests/qa/boss_arenas/`](qa/boss_arenas/), [`tests/qa/boss_variety/`](qa/boss_variety/) and [`tests/qa/boss_pressure/`](qa/boss_pressure/). Commands and gameplay details: [encounter guide](../docs/BOSS_ENCOUNTERS.md). The live review is available at [localhost:8741/tests/boss_encounters.html](http://localhost:8741/tests/boss_encounters.html).
