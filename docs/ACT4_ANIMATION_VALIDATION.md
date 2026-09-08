# Act IV animation validation

Implemented four painted sprite atlases containing **90 distinct frames across
15 sequences**. Hollow Knights, Choir Priests, Soul Eaters, Memory Wraiths,
Oathbound/Echoing guardians and Malthoron's summoned Knights use the new art in
all four cathedral zones. Other acts and boss animation selection stay separate.

## Presentation

The animation sampler reads the existing EnemySkills stage, remaining duration
and multi-step index. Basic attacks record their actual windup duration when
started. Rendering never advances simulation or consumes gameplay randomness.
The guardian's first cleave remains visible for 120 ms of its existing second
windup; the Wraith reforms during the first 100 ms of its existing strike windup.
Neither changes damage timing. Death plays for the existing 0.6 seconds, holds
its final frame and uses the existing 12-second corpse lifetime and final fade.

Enemy ground warning shapes, skill labels and cast bars are removed. Internal
warning geometry still owns targeting and attack concurrency, including boss
priority. Weapon trails and spell accents are authored in the poses; existing
projectiles and successful healing/impact effects remain visible. Reduced motion
avoids the additional blink opacity modulation. Boss cues remain unchanged.

## Art and reproduction

The built-in **image_gen** tool generated the poses from the actual game sprites.
Its transparency retries supplied genuine RGBA cutouts; no Python background
removal was performed. Original generations are preserved under
`assets/act4_animations/source/`, selected transparent outputs under `alpha/`,
and shipped WebP atlases under `packed/`. All generation and transparency prompts,
references and original output locations are retained in `generated.json`.
`import.json` records source/output hashes, anchors, sequence order and scale.
The four shipped atlases total approximately 1.64 MB.

The packer requires Pillow. It separates frames, preserves generated alpha,
registers feet, applies one scale per actor (including fallen remains), packs
lossless atlases, and compiles the same alpha-derived masks used by picking.
It is registered with the main sprite build and supports:

```powershell
python -X utf8 tools/import_act4_animations.py
python -X utf8 tools/import_act4_animations.py --check
python -X utf8 tests/cathedral_server.py
```

Open `http://127.0.0.1:8744/tests/cathedral_review.html`. Select any of the six
profiles, an attack/skill or death, and a facing. Use Show animation, Advance
0.1 s, Advance 1 frame, or Play encounter. The Before enemy animations option
loads the immutable working-tree snapshot captured before this update; the
review server restores it without replacing existing files. Review saves remain
isolated from the player's saves.

## Results

- **36,882 animation checks** and **19,950 matched simulation samples** against
  the exact pre-change runtime at 30, 60 and 120 Hz. All 90 frames exercised.
  Comparisons include health, positions, cooldowns, damage, healing, drain,
  projectiles, loot, corpse timers and quests.
- Cancellation covers stun, freeze, fear, pull, beckon, flee, player death and
  map departure. Death interrupts each signature action. Corpse destruction and
  expiration clear the authored pose.
- **76 runtime contact sheets**, covering all six profiles and every attack,
  skill and death in both facings at 1080p/4K, plus eight mixed-zone captures.
  All four atlas sheets were visually inspected for intact silhouettes and
  clean backgrounds. Guardian cleaves, Wraith steps and live healing/mixed
  encounters were also visually checked in runtime captures.
- **138,920 visible-pixel picking samples** across 90 frames and two facings;
  authored frame identity, bounds, elite tint and hit-flash rendering checked.
  Browser captures reported no page or failed-request errors.
- Browser lifecycle checks confirm reduced motion, a Knight spawned through
  Malthoron's production encounter, and unchanged boss animation selection.
  Both parent/side-zone detours preserve health/cooldowns and cancel casts.
- **215 cathedral ability checks** and **17,005 Act IV boss compatibility
  samples** passed. Act 2 animation regression: 22,694 checks / 17,730 matched
  samples. Act 3 animation regression: 15,194 checks / 14,960 matched samples;
  shared Act 3 combat contract: 33,074 checks.

Three alternating performance pairs per main cathedral zone and resolution,
using the frozen pre-animation runtime and 60 warmup + 180 measured production
combat frames per run, passed the 10% median/p95 budget. Warm terrain caches
remained stable.

| Zone / canvas | Median before → after | p95 before → after |
| --- | --- | --- |
| Cathedral 1 / 1080p | 1.967 → 1.967 ms | 2.867 → 2.600 ms |
| Cathedral 2 / 1080p | 2.100 → 1.900 ms | 3.000 → 2.700 ms |
| Cathedral 1 / 4K | 2.067 → 2.000 ms | 2.700 → 2.600 ms |
| Cathedral 2 / 4K | 2.167 → 2.133 ms | 2.533 → 2.567 ms |

Reports and captures: `tests/qa/act4_animation/`. Detour report:
`tests/qa/cathedral/enemy_detours.json`. Reproduction:

```powershell
node --preserve-symlinks --preserve-symlinks-main tests/act4_animation_contract.mjs
node --preserve-symlinks --preserve-symlinks-main tests/act4_animation_browser.cjs capture
node --preserve-symlinks --preserve-symlinks-main tests/act4_animation_browser.cjs lifecycle
node --preserve-symlinks --preserve-symlinks-main tests/act4_animation_browser.cjs performance
node --preserve-symlinks --preserve-symlinks-main tests/cathedral_enemy_browser.cjs detours
```

Browser scripts require Playwright and Chrome. On this workstation the bundled
Node packages were supplied through NODE_PATH; no project dependency or package
installation was needed. Snapshot capture refuses to overwrite its archive.
