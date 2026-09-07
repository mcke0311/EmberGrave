# Boss attack animation validation

Validated September 7, 2026, in Chrome 152.0.7977.76 on Windows.

All six campaign bosses now animate anticipation, impact/release, and recovery
using the existing artwork, with distinct attack effects and a reduced-motion
presentation. [Implementation and review instructions](../docs/BOSS_ANIMATIONS.md).

## Combat remains identical

The pre-animation build was captured before implementation. Its 28 source files
are archived in `fixtures/boss_animation_before.json.gz` (449,897 bytes), with
per-file SHA-256 hashes. Tests restore and verify the ignored working copy;
they reject an existing snapshot whose contents differ from the archive.

- All 30 ordinary-equipment boss/class playthroughs win and match the original
  results exactly, including completion times, damage taken, hit counts,
  remaining draughts, phase durations, and equipment/skill loadouts.
- 30,492 simulation samples match the saved build's combat state: positions,
  health, armor, attack stages/timers/shapes, owned creatures, and projectiles.
  The same checks run at 120 Hz, 30 Hz, and 20 Hz, with identical gameplay RNG.
- 122,183 animation contract checks cover those samples plus cached motion,
  transform limits, effect caps, cancellation, pause sampling, visibility
  comparison, reduced motion, beam brightness at the actual damage pulse, and
  particle batching with no lost/duplicated sparks or retained render references.
- Existing encounter/refinement checks pass (85,616 and 267 checks), as do
  153 gameplay input checks.

Raw reports: [animation contract](qa/bosses/animation_contract.json),
[animated playthroughs](qa/bosses/animation_playthrough.json), and
[exact-source baseline playthroughs](qa/bosses/animation_playthrough_before.json).

## Browser and visual review

All 33 phase-specific sequences pass at 1080p and 4K with motion enabled and
reduced: 132 sequence runs, including both steps of the chained attacks.
The four runs check 1,195,688 painted silhouette pixels across both facings,
hit flashes, and animated windup/impact/recovery poses. Rendering does not advance
effect state, allocate canvases, or read pixels. No resources are missing and no
runtime errors were recorded.

The final beam-pulse synchronization change was additionally checked across
all six Malthoron and six Vethriss sequences, and their clips were refreshed.
Animation toggle, pause, single-frame stepping, and quarter-speed playback pass.
Campaign browser regression checks pass: 242,561 targeting checks and 25 story
checks, plus sequence-preview controls.

Six WebM recordings cover every boss's phase-specific attacks with a Gravebinder
army and boss adds present. Videos and stills are under `tmp/boss_animation/`;
the [recording gallery](boss_animation_clips.html) loads local recordings as blobs
so seeking works with the simple development server. Decoded video frames were
visually inspected alongside the uncompressed attack screenshots. This review
also reduced the execution overlay's fill to reveal the effects while retaining
clear danger outlines, and moved Mire Mother's shard glow to her chest.

Reports: `qa/bosses/animation_browser_*.json`,
[campaign regression report](qa/bosses/animation_browser_regressions.json), and
[recording decode/seek checks](qa/bosses/animation_clip_decode.json).

## Performance protocol

Performance uses the exact archived build, separately from the earlier refinement
comparison with revision `4258cf2`. Both versions receive identical ordinary
Gravebinder equipment, armies, boss adds, starting positions, and keyboard input.
Two warmed browser contexts alternate; only the sampled benchmark's production
loop runs. Each case uses three alternating pairs of eight-second samples after
three seconds of warm-up. The target is no more than a 10% increase in the mean
of the three p95 CPU frame times, at each resolution.

An initial four-second, single-pair Azram 4K diagnostic showed a 40% increase.
It did not repeat in the full three-pair profile (19.57 ms against 19.80 ms,
−1.18%). The profile measured p95 ground-effect time of 0.30 ms and elevated
effect drawing of 0.10 ms. No production optimization was inferred from that
variable short result. Both reports are retained as diagnostics; the full final
series is recorded separately in `qa/bosses/animation_performance.json`.

The subsequent series exceeded the target in several cases, including Korvath
at 1080p and Mire Mother at both resolutions. It was stopped to batch decorative
particles by ground tile, reducing repeated terrain-clipping passes without reducing particle
counts, changing their positions, or altering attack effects. The interrupted
series is retained in `qa/bosses/animation_performance_before_batch.json`.
All four browser review combinations were rerun after this rendering change.

The final series retains per-run CPU samples, measured parts, source hashes,
scene composition, and every passing or failing result. These are observations
on this machine and session, not frame-time guarantees for other hardware.

## Final performance results and remaining limitation

**The 10% performance target is not met: 2 of 12 cases pass, and 10 miss.**
The final series completed all 72 samples without runtime errors. Its recorded
source hashes match the current JavaScript files. No follow-up samples replace
these final results. Batching reduces clipping calls, but these measurements do
not establish an overall frame-time improvement from that change.

Times below are milliseconds: the mean of each build's three p95 CPU frame times.
Changes are calculated before rounding the displayed times.

| Boss | Viewport | Before p95 | Animated p95 | Change | Target |
| --- | --- | ---: | ---: | ---: | --- |
| Korvath | 1080p | 9.73 | 10.83 | +11.30% | **Miss** |
| Korvath | 4K | 28.40 | 36.67 | +29.11% | **Miss** |
| Mire Mother | 1080p | 8.53 | 9.20 | +7.81% | Pass |
| Mire Mother | 4K | 16.37 | 18.83 | +15.07% | **Miss** |
| Azram | 1080p | 8.60 | 9.53 | +10.85% | **Miss** |
| Azram | 4K | 14.47 | 18.03 | +24.65% | **Miss** |
| Empty Archangel | 1080p | 5.67 | 7.13 | +25.88% | **Miss** |
| Empty Archangel | 4K | 16.20 | 21.00 | +29.63% | **Miss** |
| Malthoron | 1080p | 6.90 | 7.77 | +12.56% | **Miss** |
| Malthoron | 4K | 16.97 | 20.20 | +19.06% | **Miss** |
| Vethriss | 1080p | 11.57 | 10.07 | −12.97% | Pass |
| Vethriss | 4K | 22.53 | 28.80 | +27.81% | **Miss** |

The [complete animation performance report](qa/bosses/animation_performance.json)
retains all samples and rendering profiles. These misses are additional to,
and measured separately from, the earlier refinement's Azram 4K +10.14% result
against revision `4258cf2`; see the [refinement report](boss_refinement_results.md).
Combat and browser correctness pass; performance remains a recorded limitation.
