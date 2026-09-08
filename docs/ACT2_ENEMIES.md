# Act II enemy attacks and skills

Act 2 uses explicit local rosters and instance-owned combat profiles. Existing
enemy IDs, illustrations, quests, rewards and save records remain in use.
`MapGen.generate(zoneId, worldSeed)` has the same signature. The earlier
[Drowned Ruins compositions](ACT2_DESIGN.md) supply its encounter courts.

## Roles and placement

| Enemy | Combat role |
| --- | --- |
| The Drowned | Slow unarmed physical frontline |
| Bog Bloat | Heavy poison melee; visible corpse swelling and a 0.8 s rupture warning |
| Marsh Wretch / Larvae | Fast venomous bites / fragile melee swarm with the existing small poison bonus |
| Marsh Serpent | Poison bite; a locked straight lunge with a 0.7 s warning and recovery |
| Silent Choirman | Cold casting pose, frost sound and bolt; unblocked hits slow 20% for 0.75 s, subject to the target's existing control resistance |
| Song Thrall | Cold bolts and a three-bolt fan every 6 s; no additional slow |
| Hollow Child | Warned flank blink with recovery; two Wretches every 9 s, at most four living |
| Stone Gargoyle | Claws and a marked dive with a 0.8 s warning, 0.55 s flight and 1 s recovery |
| Gnarl / Blight Treant | Branch strikes and marked root slams; physical / poison identity |
| Sludge Horror | Poison contact, a warned corpse rupture, then one generation of two smaller offspring |

`DATA.ACT2_COMBAT.pools` contains the approved percentages. Largest-remainder
rounding produces exact individual quotas for the existing seeded population.
Mixed groups contain at most two shooters and one treant, gargoyle or Hollow
Child. Shooters occupy the rear of their court approach; melee enemies occupy
the front. Placement checks the full scaled body, including elites, and reserves
eight tiles plus body clearance around every arrival. Events use these same
local identities, group limits and supported spawn checks.

## Minibosses and ownership

Choir Herald keeps shadow bolts and two Thralls every 11 s, capped at four.
Brood Mother keeps venomous melee and three Larvae every 9 s, capped at six;
her basin slam has a 1 s warning and 1 s recovery.

Vorthel keeps shadow bolts and three summons every 8 s, capped at six. His
sacrifice holds and marks at most two of his own living summons for 0.9 s;
ordinary nearby enemies cannot be consumed. Dissonant Requiem uses shadow
presentation with the original five marks, 2.2-tile radius, 1.35 s warning,
0.18 s stagger and 12 s cooldown. All five marks share a hit set, so one cast
can damage each target only once.

`summonOwner` is separate from campaign `bossOwner`. Owned creatures cannot
summon recursively. Killing one normally runs the existing reward and quest
path; owner death removes survivors without invoking cleanup rewards or death
bursts. Sludge offspring are independent after their parent's death and cannot
split again. Ritual Heart keeps its pool, cap and progression behavior.

Mire Mother and all creatures created by her encounter controller bypass these
profiles. Her phases, bile, grasping ring, recovery and reinforcement controller
are unchanged by this pass.

## Runtime and balance

`js/act2_enemy_combat.js` owns pending attacks, cooldowns, warning geometry and
summon cleanup per monster. It profiles cloned definitions before difficulty
and elite scaling. Shared enemy definitions and other acts do not receive these
overrides. Warnings use the same world shapes as damage checks; movement uses
the production terrain support and segment checks. Windups cancel on control
interruption, death or travel. Released projectiles retain their normal lifetime.

Fixed zone multipliers were first derived from 30-seed baseline health, XP and
basic damage budgets, then adjusted using matched combat simulations to account
for casting and recovery time. Relative strengths within a zone are retained.
Population medians match exactly, HP medians differ by at most 11.9%, and XP
medians by less than 0.2%. See the [validation report](../tests/act2_enemy_results.md)
for measured pressure, duration, performance and test limitations.

## Playable review and reproduction

Run these from the repository root:

```text
python tests/act2_enemy_baseline.py
python tests/act2_enemy_server.py
```

Open `http://127.0.0.1:8748/tests/act2_review.html?enemyReview`.
Choose an area, seed, player class, enemy, ability and 1080p or 4K canvas.
Stage and preview a single enemy, or restore the populated area and play.
The temporary review hero uses invulnerability for inspection; actual balance
tests use the ordinary equipment in `tests/boss_loadouts.js`. The review stores
saves in memory and does not use the player's local saves.

The version selector compares against `tests/fixtures/act2_enemies_before.zip`,
a separate snapshot captured before this enemy pass. Its 50 source files have
SHA-256 records; restoration validates them and capture refuses replacement.
Both browser versions use the current shared art library. The older layout
snapshot remains available through the original review without `enemyReview`.

```text
node tests/act2_enemy_contract.mjs
node tests/act2_enemy_budget.mjs
node tests/act2_enemy_playthrough.mjs
node tests/act2_enemy_playthrough.mjs --pressure
python tests/act2_regressions.py
```

On restricted Windows runtimes, add `--preserve-symlinks --preserve-symlinks-main`
after `node`. Browser automation uses `tests/act2_browser.cjs --enemies` with
`act2_review.html?enemyReview&qaEnemies` or
`act2_review.html?enemyReview&profile&all&bothWidths&resume`. Reports and images
are written under `tests/qa/act2_enemies/`.
