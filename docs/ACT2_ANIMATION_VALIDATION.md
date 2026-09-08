# Act 2 enemy animation validation

Status: **implemented and validated**.

The full roster has 52 sequences / 312 distinct authored frames in 18 lossless
transparent atlases: 15 enemy identities plus three Mire Mother phases. Every
basic attack, specialist skill and death sequence in the presentation catalog has
six frames. Ritual structures use summoning pulses and staged stone destruction.
Idle/walking art and mirrored facing remain in use.

## Artwork and integration

- The original image generations and references are preserved. Sixteen source
  sheets contained baked checkerboards; the user approved local Python cleanup.
  Separate RGBA outputs, parameters and SHA-256 provenance are recorded.
- Complete-silhouette extraction prevents limbs crossing the generator's approximate
  cell boundaries from becoming fragments in adjacent frames. Touching Mire Mother
  root trails receive explicit ownership. The ground anchor follows feet/root bases.
- Atlas storage expands for long casts and raised arms rather than shrinking the
  standing body. A uniform source scale preserves relative collapse sizes.
- The presentation catalog samples the existing simulation clocks and actual
  release flags. Requiem releases on its first staggered impact; dive landing,
  blink relocation, rupture and splitting retain their combat timing.
- Artwork eligibility is independent of Act 2 combat-profile eligibility. Mire
  Mother's reinforcements receive animation without acquiring different AI.
- Drawing, hit flashes, silhouettes, culling and overhead geometry share the
  selected frame and transform. Elite tint uses the same frame without clipping
  against the former fixed-size scratch canvas.
- Cosmetic effects consume no gameplay randomness, freeze while paused, respect
  reduced motion and clear on cancellation/travel. Events are capped at 12 per
  owner and 128 visible events per draw; elite tint cache is capped at 96 frames.
- Actor atlases load on entering Act 2, with Mire Mother art in her encounter
  bundle. Prewarmed normal/flash buffers trim empty padding (about 46.6 MiB for
  all 312 frames); packed atlases total 7.62 MiB.

No damage, cooldown, collision, reward, summon-cap or save-format changes were
introduced. Existing unrelated working-tree changes were preserved.

## Verification

| Check | Result | Scope |
| --- | --- | --- |
| Seeded baseline equality | PASS | 17,730 samples / 22,694 assertions at 120, 30 and 20 Hz |
| Specialist baseline cases | PASS | Requiem, sacrifice, summoning, cleanup, rupture, splitting, loot and Mire Mother death/quests |
| Existing Act 2 combat suite | PASS | 257 checks |
| Existing Act 2 quest suite | PASS | 103 checks, including saved ritual progress, shard, death/revive and travel |
| Atlas completeness | PASS | 18 atlases, 312 frames, six distinct images per sequence, alpha, padding, source/output hashes, anchors and masks |
| Full-roster browser playback | PASS | 236 cases at 1920x1080 / 3840x2160, reduced motion on/off, all six frames observed, pause stable |
| Raster/geometry comparison | PASS | 1,872 checks: every frame in both facings, normal, elite tint and hit flash |
| Recorded playback | PASS | 1080p and 4K-source crowded combat, including deaths; recordings decoded and sampled at three times |

Contact sheets and sequences were visually inspected; extracted-frame registration
issues found during review were corrected before the final validation. The browser
suite also exercises both ritual structures and all three Mire Mother phases.

The immutable baseline is `tests/fixtures/act2_animation_before.zip`, captured from
the working tree before animation changes, with verified source hashes. Unchanged
3D ES modules/vendor files are shared companions for the browser comparison.
The isolated review records the browser's benign ResizeObserver layout notices
separately when switching iframe resolutions; game errors remain fatal.

## Incremental frame cost

Main-thread update/render milliseconds in headless Chrome 152 on this machine.
Three alternating before/after pairs per workload, with 90 warmup frames and 240
measured frames per run. These measurements exclude GPU presentation latency and
are not a guarantee for other hardware.

| Resolution / workload | Before median | After median | Median delta | Before p95 | After p95 |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1080p / 24-enemy crowd | 2.87 | 2.67 | -0.20 | 3.70 | 3.57 |
| 1080p / Mire Mother + six adds | 1.30 | 1.63 | +0.33 | 1.97 | 2.23 |
| 4K / 24-enemy crowd | 3.10 | 3.37 | +0.27 | 3.93 | 4.17 |
| 4K / Mire Mother + six adds | 1.53 | 1.60 | +0.07 | 2.07 | 2.10 |

The small differences include run-to-run timing variation. Full measurements,
canvas dimensions and action-frame counts are in `performance.json`.

## Review and delivery

Run `python tests/act2_animation_server.py` and open
`http://127.0.0.1:8749/tests/act2_review.html?enemyReview&animationReview`.
The review uses temporary heroes and an in-memory save store. It provides natural
combat, individual skills, pause, frame stepping, half/quarter speed, death
previews, mirrored facing, Mire phase selection and a baseline selector.

- Generation prompts/references/original hashes: `assets/act2_animations/generated.json`
- Cleanup provenance: `assets/act2_animations/alpha_cleanup.json`
- Installed atlas metadata and hashes: `assets/act2_animations/import.json`
- All 52 animated WebP previews: `tests/qa/act2_animation/previews/`
- In-game recordings: `tests/qa/act2_animation/crowded_combat_1920.webm` and
  `crowded_combat_3840.webm` (4K source scaled to 1080p for viewing)
- Raw reports: `tests/qa/act2_animation/{contract,browser,geometry,performance}.json`

Reproduce with `tools/import_act2_animations.py --check`,
`tests/act2_animation_contract.mjs`, `tests/act2_animation_browser.cjs`,
`tests/act2_animation_geometry.cjs` and `tests/act2_animation_performance.cjs`.
In this Windows environment Node needs `--preserve-symlinks
--preserve-symlinks-main`; browser scripts require Playwright on `NODE_PATH`.
