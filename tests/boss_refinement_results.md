# Boss fight refinement validation

Validated September 7, 2026, in Chrome 152.0.7977.76 on Windows.

The six campaign encounters now have bounded pursuit, readable two-step
sequences, stronger portal and illusion counterplay, physical armor loss for
Malthoron, and explicit warning/recovery information. Existing artwork, arenas,
phase thresholds, boss health, campaign wards, rewards, and save formats are
retained. [Encounter details](../docs/BOSS_ENCOUNTERS.md).

## Combat and pacing

All 30 ordinary-equipment boss/class simulations win with damage enabled and
the fixed budget of six healing and six aether draughts. The same improved
movement driver also wins all 30 against the previous controller at `4258cf2`.
Loadouts and skill-point budgets match exactly between both runs.

The driver now prefers to remain within useful attack range after dodging.
Previously, ranged heroes repeatedly dodged outward and then attack-pathed back
through poison. An initial refinement run exposed this weakness with an Ember
Witch loss against Mire Mother. The fix changes test movement, not boss damage,
player defenses, equipment, or potion budgets. Both versions were rerun with
the same driver; historical results remain available for comparison.

| Boss | Historical median | Prior controller, same driver | Refined median | Change vs same driver |
| --- | ---: | ---: | ---: | ---: |
| Korvath | 125.5 s | 125.5 s | 120.9 s | −3.67% |
| Mire Mother | 127.0 s | 105.6 s | 103.8 s | −1.70% |
| Azram | 112.9 s | 109.3 s | 88.7 s | −18.85% |
| Empty Archangel | 114.8 s | 119.6 s | 121.8 s | +1.84% |
| Malthoron | 128.9 s | 128.9 s | 123.4 s | −4.27% |
| Vethriss | 212.6 s | 212.6 s | 200.8 s | −5.55% |

Every median is within 20% of the previous controller with equivalent driving.
Azram is the largest improvement: opening portals earlier particularly benefits
the Gravebinder's existing army. Relative to the historical, different-driver
report, his median is 21.43% shorter; that distinction is not hidden by the
matched comparison. These practiced simulations demonstrate viability, not
first-time human difficulty or a promise of equal completion times across builds.

Raw results: [refined playthroughs](qa/bosses/playthrough.json),
[same-driver baseline](qa/bosses/playthrough_baseline_refinement.json),
[historical playthroughs](qa/bosses/playthrough_before_refinement.json), and
[balance comparison](qa/bosses/refinement_balance.json).

## Passing checks

- 85,616 encounter assertions covering geometry, recovery, phases, summon caps,
  cleanup, rewards, difficulty resets, and 192 seeded arenas.
- 267 refinement checks, including 228 sequence steps and 170 threatened
  positions with collision-aware walking escapes after a 150 ms reaction delay.
  Coverage includes near-boss, edge, and corner positions, populated rooms,
  both memory pairs, multiple simulation step sizes, lethal strikes, portal
  interruptions, illusion cancellation, single-hit intersections, armor reset,
  and alternating beam direction.
- All 120 boss/class/viewport/motion combinations render and run their phase
  sequences without missing resources or runtime errors: 1080p and 4K, each
  with reduced motion enabled and disabled.
- 497,022 pose, hit-flash, silhouette, and allocation checks across all 96 poses.
- 242,561 monster targeting checks and 25 campaign browser checks.
- Browser controls select and preview a sequence, then advance into its second
  warning in five quarter-second steps.
- 214 story, 886 opening, 354 boss-music, and 153 gameplay input assertions.

Browser reports are in `tests/qa/bosses/refinement_browser_*.json`. Screenshots
are local review artifacts under `tmp/boss_refinement/scenes/`; historical
screenshots remain untouched. Visual inspection corrected portal countdowns
obscured by summon circles and repeated phase/attack labels. Final captures also
verify both beam directions and the exposed-shard and sealed-portal openings.

## Performance method

Run `node tests/boss_refinement_performance.cjs` with the local server running.
It compares the actual previous authored controller and HUD with this version,
using three alternating pairs of six-second production-loop samples after
two seconds of warm-up, at 1080p and 4K. Both versions use identical ordinary
Gravebinder equipment, player summons, and capped initial boss adds. The gate
is no more than 10% regression in the mean of each run's p95 CPU frame time.
The raw records also retain keyboard presentation timing and frame intervals.

This is distinct from the older generic-AI comparison in
[the earlier validation report](boss_encounter_results.md). It does not establish
a frame-latency ceiling on other hardware or under different system load.

The initial short-sample comparison exceeded the gate in five of twelve cases.
Each of those cases received the same longer reassessment: three alternating
pairs, twelve seconds per sample, and five seconds of warm-up. All initial
records remain available; the longer results do not replace them on disk.
One initial capture produced no frames and was rejected and rerun.

An Azram 4K diagnostic compared normal drawing with portal labels, changing HUD
text, or the entire boss HUD disabled. Its final normal sample was faster than
all disabled variants, so it did not isolate a repeatable rendering cost.
No visuals were removed, and disabled-visual samples do not count toward
acceptance. Results reflect observed session variability rather than a proven
cause for the initial differences.

## Performance results and remaining limitation

Eleven of twelve cases meet the target after reassessment. **The overall 10%
performance gate remains failed:** Azram at 4K measured 15.57 ms against 14.13 ms,
an increase of 10.14%. This is a small miss, but it is not rounded down or marked
as passing. No further repeat-until-pass sampling was used.

| Boss | Viewport | Initial change | Longer follow-up change | Result |
| --- | --- | ---: | ---: | --- |
| Korvath | 1080p | +14.29% | +0.59% | Pass |
| Korvath | 4K | −2.37% | — | Pass |
| Mire Mother | 1080p | +7.78% | — | Pass |
| Mire Mother | 4K | +6.67% | — | Pass |
| Azram | 1080p | +12.89% | +4.49% | Pass |
| Azram | 4K | +22.14% | +10.14% | **Fail** |
| Empty Archangel | 1080p | +3.43% | — | Pass |
| Empty Archangel | 4K | +17.37% | −2.74% | Pass |
| Malthoron | 1080p | +3.41% | — | Pass |
| Malthoron | 4K | +10.45% | +5.04% | Pass |
| Vethriss | 1080p | +3.76% | — | Pass |
| Vethriss | 4K | −6.40% | — | Pass |

The [combined performance record](qa/bosses/refinement_performance_validation.json)
includes both the original and accepted-protocol measurements for every case.
The [initial summary](qa/bosses/refinement_performance/summary.json), raw samples
in that directory, longer samples in `qa/bosses/refinement_performance_followup/`,
and the Azram diagnostic are retained. `node tests/boss_refinement_performance.cjs
--summarize` exits unsuccessfully while this miss remains.
