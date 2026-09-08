# Act III enemy animation validation

Implemented: 11 regular enemy identities, 31 sequences, 186 distinct frames.

## Behavior

- Basic attacks, signature skills, and deaths use dedicated painted frames.
- Frame selection reads `ImperialCombat` windup, travel, and recovery clocks.
  Charge holds its committed motion pose; Stonefall has separate flight and
  landing poses. Blink uses its actual relocation and recovery timing.
- Death plays once over 0.6 seconds and holds final remains. Existing corpse
  lifetime, final fade, loot, experience, quest events, and corpse consumption
  remain controlled by gameplay.
- Regular-enemy warning shapes and countdowns are hidden in normal gameplay;
  the diagnostic overlay still displays them. Block feedback, projectiles,
  release effects, and all collision geometry remain intact.
- Eligibility is restricted to the eleven Act III identities in Act III maps,
  including summoned copies. Azram, the Chained Sovereign, other-act summoned
  identities, and the same creatures outside Act III retain their presentation.

## Assets and integration

Original ImageGen sources, replacement generations, reference paths, prompts,
and SHA-256 hashes are retained under `assets/act3_animations`. The user approved
local Python cleanup into separate alpha copies. Two colored backdrops were
replaced using ImageGen; overlapping mace/chain/shard sheets were regenerated
with wider gutters and restrained hand effects. All final packed sheets have
real transparent alpha. Source files are never overwritten by cleanup.

The importer registers complete silhouettes on their feet/root bases with one
scale per character, expands atlas storage for extended poses, and removes
detached neighboring-frame specks. The sprite builder reinstalls the validated
entries. Act III loads its own actor bundle on entry; unloaded animation art
falls back to the existing sprite. Drawing, picking, elite tint, hit flash, and
screen bounds share the selected frame and transform.

The 11 lossless WebP atlases total **3.60 MiB**. Trimmed normal/flash pixel bounds
total approximately **20.65 MiB**, excluding padding, atlas decoding, and caches.
No gameplay timers, randomness, save formats, or enemy statistics were added.

## Results

| Verification | Result |
| --- | --- |
| Seeded pre-change combat equality | PASS: 14,960 samples at 120, 30, and 20 Hz |
| Animation, cancellation, corpse, isolation, and warning contracts | PASS: 15,194 checks including the sampled pause checks |
| Atlas integrity | PASS: 11 atlases, 186 distinct frames, alpha, padding, anchors, masks, hashes |
| Browser playback | PASS: 124 cases, all six frames observed; 1080p/4K, reduced motion on/off |
| Raster and picking geometry | PASS: 1,116 checks, both facings, normal/elite/hit flash; loading fallback |
| Existing Act III combat | PASS: 33,074 checks |
| Existing Act III navigation | PASS: 122,093 checks |
| Existing Act III layout | PASS: 113,873 checks |
| Existing Act III quests | PASS: 51 checks |

The animation baseline is the working tree captured before this task's runtime
edits in `tests/fixtures/act3_animation_before.zip`, with hashes verified before
restoration. Existing and concurrent unrelated workspace changes were preserved.

Crowded-combat comparison in Chrome 152: 24 enemies, eight tinted actors, six
deaths; three alternating animation-enabled/disabled pairs, 90 warmup frames
and 240 measured frames per run. Values measure main-thread update/render CPU,
not GPU presentation. Both sides use the same current engine and hidden warnings.

| Canvas | Static median / p95 | Animated median / p95 |
| --- | --- | --- |
| 1920×1080 | 2.90 / 4.17 ms | 2.57 / 3.43 ms |
| 3840×2160 | 3.93 / 6.27 ms | 3.23 / 4.70 ms |

This run showed no incremental CPU regression; timings include machine noise.
Full reports, contact sheets, animated previews, and gameplay captures are in
`tests/qa/act3_animation`.

## Reproduce and review

Run `python tests/act3_server.py` and open
[the Act III review page](http://127.0.0.1:8743/tests/act3_review.html?zone=khal_palace).
Select a regular enemy, then **Preview attack**, **Preview signature skill**, or
**Preview death**. Use **Play encounter** or **Step 1/60 second**. Isolated previews
clear dropped items so labels do not obscure the actors; real gameplay loot is
unchanged.

```text
python tools/clean_act3_animation_alpha.py
python tools/import_act3_animations.py
python tools/import_act3_animations.py --check
node tests/act3_animation_contract.mjs
node tests/act3_animation_browser.cjs
node tests/act3_animation_performance.cjs
```

Cleanup requires Pillow and NumPy; packing requires Pillow. Browser checks need
Playwright and Chrome. On this Windows host, use the bundled Python runtime,
set `NODE_PATH` to the bundled Node packages, and pass Node
`--preserve-symlinks --preserve-symlinks-main` when needed.
