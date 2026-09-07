# The Last Warm Wall — version 2 verification

Verified on September 6, 2026 using isolated in-memory heroes and saves.

- Opening contract: **886 checks passed** covering route and prop collision,
  installed artwork, both travelers, cache collection, every checkpoint,
  captain health/phase restoration, finite waves, partial defeats, duplicate
  rewards, version 1 migration, skip, failed loads, death and early travel.
- Frost slam checks verify the 1.1-second warning, exact world-space damage
  boundary, 1.25-second recovery, cancellation after death/skip/travel, and
  reduced-motion shake suppression. Existing bosses keep their old slam behavior.
- Browser walkthrough: **41,165 checks passed** across five classes using actual
  movement, AI, starter equipment, basic attacks, healing draughts and movement
  out of marked frost circles. No god mode, damage overrides or awarded equipment.

| Class | Direct route through combat | Captain encounter | Life afterward |
|---|---:|---:|---:|
| Vanguard | 169.1 s | 94.3 s | 108 / 154 |
| Ember Witch | 275.9 s | 184.4 s | 35 / 118 |
| Gravebinder | 270.3 s | 180.9 s | 100 / 140 |
| Veil Ranger | 164.2 s | 88.1 s | 94 / 132 |
| Wildkeeper | 148.9 s | 71.1 s | 119 / 152 |

- Companion walkthrough: **10,707 checks passed** with an earned starting skill
  point spent on Raise Dead or Call of the Wolf. Gravebinder completed the route
  in 122.3 seconds (captain 42.5 s, 84/140 life); Wildkeeper in 145.0 seconds
  (captain 70.5 s, 125/152 life). These use actual corpse consumption and summons.
- Campaign contract: **214 checks passed**.
- Town layout: **54,256 checks passed**.
- Zone/boss music: **354 checks passed**.
- Player death/audio: **85 checks passed**.

These are accelerated simulation times along an efficient route, before walking
through town and talking to Seraneth. They do not establish first-time human
play duration. The intended 6–7 minute prologue and 90–120 second boss are pacing
targets, not enforced durations: basic-only casters take longer against the captain,
while summons shorten the fight substantially. No unlocked ability is required.

Review with `tests/opening.html`: individual controls show arrival, awakening,
rescue, escort, gate, supplies, captain, phase two, frost warning and hearth.
Visual review covered the opening, awakening, rescue, escort, supply stop, boss
warning, reinforcement phase and hearth at both supported sizes.
Use Pause scene to inspect an encounter and the size controls for 1280 × 720 or
960 × 600. The warning control freezes mid-windup for inspection. The compact
boss bar leaves room for the minimap, objectives remain beneath it, and captions
sit above the HUD. The review owns temporary saves; real saved heroes are untouched.

Run the Node checks on this Windows workspace with:

```text
node --preserve-symlinks --preserve-symlinks-main tests/opening_contract.mjs
node --preserve-symlinks --preserve-symlinks-main tests/story_campaign_contract.mjs
node --preserve-symlinks --preserve-symlinks-main tests/town_layout_contract.mjs
node --preserve-symlinks --preserve-symlinks-main tests/zone_boss_music_contract.mjs
node --preserve-symlinks --preserve-symlinks-main tests/player_death_sound_contract.mjs
```
