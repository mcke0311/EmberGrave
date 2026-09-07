# Boss attack animation

The six campaign bosses reuse their 96 authored poses with continuous body
motion and attack-specific effects. The encounter controller still owns every
combat clock, position, projectile, damage area, phase, and recovery window.

## Presentation

`BossVFX` samples a cached `pose.ex.bossMotion` descriptor from encounter state.
The sprite renderer applies that affine transform to the artwork, prewarmed hit
flash, compiled targeting silhouette, culling bounds, and nameplate anchor.
Grounded anticipation and recoil stay within ten pixels, five degrees of tilt,
and four percent scale deformation. Archangel's descent can lift 28 pixels.

Attack effects follow the existing impact/release instant. Full damage areas
illuminate together; secondary flame and splash motion is decorative. Persistent
bile and beam effects follow the actual pool lifetimes and beam angle. Projectiles
carry only an additional presentation tag and retain their original movement.
During execution, the danger overlay uses a lighter fill so the effects remain
visible; its outline and every windup warning remain intact.

| Boss | Presentation |
| --- | --- |
| Korvath | Braced cleaves, short weapon arcs, cracked fire lanes and rising flame tongues. |
| Mire Mother | Heaving bile casts, arcing droplets, splashes and pool bubbles, erupting roots, exposed-shard glow. |
| Azram | Casting recoil, linked chains, orbiting portal runes, opening/collapse rings and molten arcs. |
| Empty Archangel | Lifted wing casts, feather-shaped light bolts, descent anticipation and landing compression, cross impacts. |
| Malthoron | Heavy armored strikes, floating later forms, trailing soul bolts and a layered sweeping beam. |
| Vethriss | Controlled light casts, serpent coiling and lunge wisps, forming/shattering illusions and shadow-tinted remembered attacks. |

Ground effects draw beneath actors; elevated effects and particles participate
in world depth sorting and terrain occlusion. Sparks sharing a ground tile use
one clipping pass, retaining their individual positions, colors and lifetimes.
Effects use geometric paths and independent deterministic noise. They never call gameplay randomness or create
canvases/read pixels while rendering.

Each encounter permits at most 24 transient effect records and 96 decorative
particles. Impact tails expire within 0.6 seconds. Reset, interruption, phase
change, defeat, and preview replacement cancel owned presentation. Simulation
pause freezes animation. Reduced motion removes body motion, lift, particles,
traveling decoration and trails while keeping poses, impacts, and hazards clear.

## Review

Serve the repository with `python serve.py` and open
`http://localhost:8741/tests/boss_encounters.html`. Select a boss, phase and attack;
choose **Preview sequence**, **Advance 1 frame**, **Advance 0.25 s**, or slower
playback. **Boss animations** toggles presentation while preserving the paused
effect timeline for comparison. The review uses an isolated save store.

The [recorded sequence gallery](../tests/boss_animation_clips.html) plays locally
generated WebM clips, one montage per boss covering all phase-specific sequences.
Clips and screenshots live in ignored `tmp/boss_animation/`; JSON results live in
`tests/qa/bosses/animation_*.json`.

## Verification

- `node tests/boss_animation_contract.mjs` compares gameplay trajectories with
  the exact pre-animation source snapshot and checks bounded transforms, effect
  lifetime, cancellation, pause sampling, reduced motion, and all 30 playthroughs.
- `node tests/boss_animation_browser.cjs --width=1920 --clips` records all
  sequences and checks moving silhouettes, both facings, hit flashes, render
  purity, no rendering-time canvases/pixel reads, and review controls. Use
  `--width=3840` and/or `--reduce` for the other review combinations.
- `node tests/boss_animation_performance.cjs` compares alternating samples on
  warmed before/after browser contexts, with one production loop active at a
  time. The baseline is the exact source snapshot at `tmp/boss_animation/before`;
  source hashes are retained in the performance report. The original source is
  archived in `tests/fixtures/boss_animation_before.json.gz`; tests restore and
  verify the working snapshot automatically. This measures the
  incremental animation cost, separately from the older boss refinement result.

The ordinary combat reports are generated with `tests/boss_playthrough.mjs`,
using `--source-directory=tmp/boss_animation/before/js` for the saved controller
and distinct `--output` paths for each build. Baseline snapshots must be taken
before implementation and never silently replaced to make a check pass.

The [validation report](../tests/boss_animation_results.md) includes all checks,
recordings, and the final performance results. Combat and browser checks pass;
the additional p95 CPU cost exceeds the 10% target in 10 of 12 measured cases.

On Windows, add `--preserve-symlinks --preserve-symlinks-main` if Node entry-path
canonicalization is blocked by the sandbox. Browser scripts use Playwright and
the installed Chrome channel.
