# Player death audio — 2026-09-06

## Manual return to town and music on death

Player death now immediately calls `Sfx.stopMusic()`, which pauses recorded
tracks, cancels their crossfade and stops synthetic ambience. The death recording
still plays through the effects bus. Normal-mode death shows a persistent native
modal dialog with **Back to Town** instead of scheduling a 2.5-second respawn.
Escape cannot dismiss it, and gameplay shortcuts are ignored while dead.

The button starts one guarded map transition. The hero revives with full life and
aether only once town assets are ready, before the town autosave and soundtrack.
Failed asset loading keeps the hero dead and offers a retry; hardcore resurrection
remains disabled.

Verified on `http://localhost:8741`:

- **85** logic checks passed, including music-stop calls for normal and hardcore
  death, the persistent dialog request and the existing enemy-buzz regression.
- **81** browser checks passed: music stopped immediately and stayed stopped on
  input, six enemies remained quiet during a 30-second simulated wait, no automatic
  teleport, real button click, duplicate-click guard, life/aether restored, town
  music resumed, second death, failed town loading and successful retry.
- The served HTML, game v36, UI v21 and stylesheet v6 matched disk byte for byte
  with no-store headers. Classic scripts passed syntax checks.

## Follow-up: repeated enemy alerts caused the remaining buzz

`Monster.update()` cleared aggro when the player was dead, then immediately
reacquired that same player through line of sight. This replayed the monster's
synthetic alert on every frame. The previous checks used an empty room and
therefore missed the ongoing enemy AI loop; lowering the MP3 volume did not fix it.

The new regression reproduced **210 `vox_bone` calls from one enemy across 210
updates** before the fix. Aggro acquisition now requires a living player.
The original death recording and its existing playback settings are unchanged.

`player_death_sound_contract.mjs` now passes **70 checks**, covering seven real
enemy types (bone, beast, human, brute, metal, insect and boss), 210 updates while
dead, and reacquisition after revival. The browser interaction fixture now keeps
six nearby enemies updating for 2.3 seconds after lethal damage and checks for
both noise-buffer starts and oscillator starts, rather than checking only the
instant of death.

The browser fixture passed **56 checks** on `http://localhost:8741`, including
zero noise or oscillator starts during the six-enemy death interval and the
actual respawn transition. Served HTML and `entities.js?v=16` were byte-for-byte
equal to disk with no-store headers. A fresh game tab was opened at
`http://localhost:8741/?update=enemy-death-buzz-fix`.

## Earlier playback changes

Fatal damage previously played the synthetic `playerHurt` buzz immediately before
the recorded death voice. The owner's death also called every companion's noisy
death routine simultaneously. Both overlays are now suppressed for player death;
surviving hits and independently killed companions retain their normal sounds.

The supplied death recording remains unchanged. Its measured duration is 6.6935 s,
longer than the 2.5 s respawn delay. Playback now uses a dedicated gain of 0.4,
a 25 ms entrance fade, a 120 ms natural ending fade and an 80 ms interruption fade.
Map entry, quitting and the hardcore game-over transition stop the voice, so it
cannot continue over a living hero or the title screen.

Verified against the running no-cache server at `http://localhost:8741`:

- `player_death_sound_contract.mjs`: **35 checks passed**, using real lethal
  damage with 0, 1 and 12 mixed companions in normal and hardcore modes. Exactly
  one death sound is requested, companion animations remain, and repeat death
  notifications are silent. Nonfatal hits and ordinary companion deaths still
  make their own sounds.
- `death_sound.html`: **15 checks passed** with the real decoded MP3 and production
  Web Audio routing. Offline output peak fell from **0.926870 to 0.370748**; RMS
  fell from **0.114265 to 0.045706** (approximately **−7.96 dB**). Soft start/end,
  faded stopping, replacing a voice, routing and mute behavior passed. Automated
  audible output is practically muted; optional preview controls are provided.
- `prop_interactions.html`: **51 checks passed**, now including actual lethal
  damage with no synthetic noise and the real respawn transition ending the
  recorded voice. Chest and kick regressions remain green. Saves are isolated.
- Modified classic scripts passed Node syntax checks. Served HTML points to
  audio v9, entities v15 and game v35, and responses carry no-store headers.
