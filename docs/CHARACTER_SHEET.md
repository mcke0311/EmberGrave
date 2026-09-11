# Character sheet

Press **C** for one scrollable sheet. General stats remain visible at zero;
class-specific bonuses and equipped special powers appear when applicable.
Each resistance has a separate row. Stat labels and values support pointer hover
and keyboard focus, with explanatory text available to assistive technology.
Escape dismisses an open stat tooltip; scrolling or closing the panel hides it.

Basic attack and both mouse assignments have independent damage groups. Values
are non-critical, before enemy defenses, per enemy hit, projectile, pulse or
companion attack. The recent-target chance-to-hit row is separate. A full-effect
total adds the listed damage-over-time effects to one hit, assuming they last
their full duration. It never sums every projectile or pulse in a cast.

`js/character_sheet.js` owns the read models. `preview(player, skillId, state)`
returns classified skill parts with elemental ranges, timing, damage-over-time
components, unrounded totals and conditional notes. `sections(player, state)`
provides labeled stat rows and gameplay explanations. Perk resolution uses a
private cache; previews never roll randomness, cast skills or spend resources.
The UI reconciles keyed rows at most ten times a second and updates Life, Aether,
experience and recent-target hit chance immediately, preserving scroll and focus.

The adapters follow existing combat behavior, without changing balance:

- Weapon criticals affect the physical roll. Ordinary added weapon elements
  currently share the combined weapon hit's armor mitigation. Fire conversion
  moves that hit to Fire and suppresses its ordinary poison.
- Arrow coatings replace weapon poison and retain the stronger poison rate.
  Spell conversion burns follow the caller's actual burn options.
- Fields, traps, totems, channels and companions have different scaling from
  standard spells. Frost and powder trap impacts currently use physical damage;
  powder burn is separate. Scorch and Plague use their own damage handlers.
- Existing companions show their current base damage, nearby auras and rally
  bonuses, with slams separate. New-companion previews use the hero's position;
  new golems use one corpse. Sacrifice uses a full-life standard companion and
  explains life-fraction and companion-type scaling.
- Charged attacks and Doom show distinct charge variants. Rabies' full poison
  total depends on an actual target and is labeled conditional. Veil attacks show baseline weapon damage separately from Exposed, Shadow Ambush, missing-health bonuses, and Killing Mark explosions.
  Random procs and target-specific bonuses are excluded. Already active bonuses,
  including a prepared next-hit damage buff, are included without consuming them.
- Effects that merely refresh a wound are not counted as additional stacks.
  Plague's fixed tick total includes its immediate tick and expiry tick; precise
  expiry timing still follows the game update loop.
- Bonuses with no current combat consumer, such as knockback immunity, are
  described honestly rather than presented as working protection.

## Verification

Run from the repository root:

```text
node --preserve-symlinks --preserve-symlinks-main tests/character_sheet_contract.mjs
node --preserve-symlinks --preserve-symlinks-main tests/skill_perks_contract.mjs
```

The first suite covers all 107 talents and all 963 rank-5/rank-10 perk combinations,
weapon/spell roll parity, damage totals, caps, recovery and read-only behavior.

Serve the repository on `127.0.0.1:8756`, make Playwright available on `NODE_PATH`,
then run `tests/character_sheet_browser.cjs` with Node. `GAME_REVIEW_URL` can
override the server URL. Browser checks use an isolated context and temporary
heroes. Reports and screenshots are in `tests/qa/character_sheet/`.

The existing `gameplay_input_contract.mjs` has a pre-existing fixture failure:
`PropInteractions` is not loaded before `Game.updateHover` runs. This sheet change
does not alter that fixture or the gameplay code.
