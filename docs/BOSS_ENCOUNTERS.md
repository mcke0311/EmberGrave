# Campaign boss encounters

All six story bosses now occupy separate authored arena zones. Their original
character artwork, lore, form counts, health thresholds, quest keys and defeated
flags are preserved. Optional bosses and the Rimebound Captain keep their existing
controllers. Player classes and loot generation are unchanged.

| Boss / entrance | Arena and signature mechanic |
| --- | --- |
| Korvath / Shattered Temple | Bait his locked charge through either oath target, then sidestep. A collision knocks him down for three seconds; that target recharges for twenty-four seconds. Targets need no activation. A missed bait leaves normal combat running. At 50%, Oathfire retains separately warned crossing fissures. |
| Mire Mother / Choir's Ritual | Later phases flood two sectors and mark the remaining dry platform. Place bile away from your next refuge. After flood and grasp, her heart opens for four seconds with +25% incoming damage. Platforms rotate without removing walking routes; sluices are scenery. |
| Azram / Palace of Khal-Zahir | The only mandatory arena puzzle. At 60% and 30%, he returns to the throne and shields himself. Turn the marked mirror through three orientations until its visible outgoing ray points at him. Dodge the incoming sun beam; its reflection breaks the ward. Misaligned beams allow another attempt. Portals remain finite, attackable interruption targets. |
| Empty Archangel / Shattered Cathedral | Before each descent, interrupt a three-second choir channel by dealing 2% of her maximum life. Direct hits, damage over time and companions all contribute. Success cancels the descent and grants four seconds to attack. Failure leads to a locked, warned dive, followed by a warned cross below 50%. She remains damageable. Bells are scenery. |
| Malthoron / Cathedral Heart | At 66% and 33%, two bound souls replace reinforcements. Each has 3% of his scaled life. Killing one permanently removes 15% of his original armor and its extra volley lane; killing the pair grants three seconds. Armor cannot fall below 40%. Ignored souls are replaced at the next phase, preserving earned reductions. He remains damageable; braziers are scenery. |
| Vethriss / Throne of Cinders | The wounded friend becomes a serpent, then a shadow. The serpent shuffles among three decoys and gives a 1.5-second tell: a solid rune marks the real body, hollow runes mark lies. A direct basic or skill hit on the real body cancels the volley and grants three seconds. Passive damage and autonomous companions deal normal damage without identifying him. Destroying a decoy removes its lane. The shadow recalls fissure → bile, chains → wings, and the hollow beam. Shard anchors are scenery. |

## Entering, fighting and retrying

A doorway occupies each former boss location. Travel first enters a safe
vestibule, with ordinary remains for preparation and an open return route.
Crossing the combat threshold starts the encounter and seals the entrance.
Prerequisites are checked before arena travel commits. Returning uses the exact
cached parent instance, including a shifting Cathedral instance retained through
other travel routes.

Combat counters reward positioning, pressure and target selection. The five
combat bosses can be defeated without completing any counter. HUD cues identify
choir progress, the true serpent, dry platforms and charge targets. Runes retain
their solid/hollow shapes under reduced motion. Only Azram's mirrors accept
click/tap interactions; the hero walks into range and each turn advances one
orientation. A 0.25-second debounce prevents duplicate turns. Devices no longer
provide generic hazard relief.

Damage clamps at every pending health threshold, including simultaneous hits,
damage over time and summons, until the transformation is processed. Damage then
resumes automatically; only Azram's mirror wards block it. Heart bonuses apply
once at the shared health-loss boundary, including raw damage over time. Major
attacks normally warn for at least 1.25 seconds, lock their aim and have recovery windows. Floods
warn for 2.5 seconds. Warning and damage use the same shapes. The beam also shows
its sweep direction. Ground hazards leave collision-aware walking escapes;
no movement skill is required. Reduced motion retains warnings, device cues and
the Archangel's raised choir pose.

The six main bosses deal **400% more attack damage: five times the previous raw
damage**. Only their base damage ranges change; health, armor, thresholds,
difficulty multipliers, weakening, mitigation and Echo scaling retain their
existing rules. The increase covers direct strikes, swept charges, projectiles,
beams and boss-created pools. Optional bosses and the Rimebound Captain keep their
current balance. Longer ordinary recovery windows preserve the encounter pacing
with damage enabled and the existing supplies.

## Distant pressure

A connected, living player staying more than 4.5 units from the boss for three
simulation seconds becomes eligible for a pressure attack. The boss starts it at
the next idle opportunity, with a ten-second cooldown and at least one ordinary
rotation attack between pressure moves. Companions cannot trigger pressure.
Transformations, openings, mirror wards, choir channels, serpent tells and complete
flood-and-grasp sequences finish before another pressure move can begin.

| Boss | Pressure and response |
| --- | --- |
| Korvath | Oathbreaker Pursuit commits to a longer charge across the arena, ending at a warned impact circle. Sidestep the lane or bait it through a ready oath target for the normal three-second knockdown. Each collided target recharges independently for 24 seconds. |
| Mire Mother | The Pursuing Grasp catches the projected escape route between complete flood-and-grasp sequences. A damaging hit slows movement by 50% for 1.5 seconds. Change direction after the warning; the dry platform, walking route and heart opening remain available. |
| Azram | The Throne Reclaims marks the projected escape position. A damaging chain hit pulls the hero up to six units toward him over 0.35 seconds, then he recovers for 2.5 seconds. Mirror ward sequences retain priority. |
| Empty Archangel | The three-second interruptible choir precedes a descent onto the projected route. Interrupt with ordinary damage or change direction when the landing warning appears. Broken Wings retains the crossing follow-up. |
| Malthoron | Quieting Chains marks the projected route, pulls a hit hero up to six units over 0.35 seconds and grants 2.5 seconds of recovery. Bound souls and earned armor reductions retain their behavior. |
| Vethriss | The wounded friend steps onto a warned escape position; the serpent commits to a long lunge and impact circle; the shadow announces remembered Quieting Chains. The full 1.5-second illusion identification window remains available. |

Pressure circles have a 2.2-unit radius; the Archangel retains her 2.3-unit
descent. New warnings last 1.25 seconds, with Korvath's charge retaining 1.35 seconds
and the choir retaining three seconds before the landing warning. A slowed hero
gets additional warning only when needed for a walking escape. Static outlines
and `INTERCEPT`, `GRASP` or `CHAIN PULL` labels remain visible under reduced motion.

The host estimates movement from its latest 0.3 seconds of observed positions,
including steady circling, and projects to impact time with an eight-unit cap.
The warning locks when it appears. Teleports and forced movement discard motion
samples. In co-op, the longest distant exposure wins, then greater distance, then
stable player ID. Landing positions and charges stay on supported terrain; pulls
stop before walls, scenery and living actors. Controls require an actual damaging
hit and respect immunity and crowd-control reduction. Rallying Cry and Devour
Corpse retain their slow cleanse against the pursuing grasp.

Death offers **Retry at arena entrance** and **Return to town**. Retry restores
health and mana and resets boss health, form, armor, counter progress, target
cooldowns, mirrors, hazards, adds, projectiles and summons. Death penalties and
consumed supplies remain spent.
Pressure exposure, targeting history, cooldowns and owned pulls/slows also reset
on death, retry, victory and travel.
Hardcore death behavior is unchanged. Checkpoints are session-local; loading a
save continues through the existing hub flow. Victory clears encounter threats
and opens the return route.

Boss-owned adds award no XP, loot or quest progress. Their caps remain
2 / 4 / 4 / 0 / 2 / 3 in campaign order. Azram's portals have finite reinforcement
charges. Summons cannot recursively spawn enemies or death explosions. Boss area
attacks deal 14% collateral damage to companions that cannot follow player dodge
instructions. Ordinary enemy damage and companion skills are unchanged.

## Campaign and co-op compatibility

The Mire shard, fortress map and Hell portal live in their boss arenas. Their
ledger keys still resolve to the original parent zones, so old discoveries and
uncollected rewards remain valid. Defeated bosses do not respawn. Quest turn-ins,
difficulty unlocks, Cathedral objectives and ending choices retain their existing
flow. Existing exploration connections remain present.

The Act I co-op beta includes Korvath's arena. The host worker owns counters,
damage, target cooldowns, seals and hazards. Snapshots include typed counters,
progress, mirror orientations, soul armor reductions, exposure timers, locked
pressure geometry, target cues, cooldowns and active pulls/slows. Movement history
remains private to the host. The
fight waits until every connected living player already in the arena crosses
the threshold. Admission and travel
are blocked during combat. Existing participants can reconnect to the same fight.
After a wipe, retry resets the party at spaced entrance positions with full
health and mana, retaining supplies and death penalties. Later acts remain
outside the co-op beta. The three Echo encounters reuse their corresponding
combat counters. The protocol cache revision is `embergrave-coop-8`.

## Art and implementation

`DATA.BOSS_ARENAS`, keyed by boss ID, contains frozen arena definitions: stable
`arena_<bossId>` zone IDs, parent links, entrance and return anchors, boundaries
and device placements with explicit mirror, charge-target or scenery roles.
Campaign doorways use six destination-specific sprites: frozen oath sanctuary,
root-bound basin, golden sun court, ascending belfry, chained soul forge and
shattered throne. They sit against existing rear walls of the former boss rooms,
with a clear walking approach and return arrival in front. Onward Cathedral passages
retain their existing positions. The arena's return arch sits in the vestibule's
west wall, framed by existing stone or root artwork; its combat seal remains separate.
Moved vestibule remains retain their original save identities and loot selection.
`MapGen` has a dedicated arena path; its combat floor is
free of random packs, events and decorative collision. Attempt state lives in
`BossEncounters.Encounter`, separate from definitions.

Thirty-six existing authored arena sprites provide architecture, monuments, floor accents,
entrances, and inactive/active devices. Source sheets, prompts and registrations
are in `assets/sprites_src/gameplay_art_authored/boss_arenas/`.
`python tools/import_boss_arenas.py --check` validates the source/packed hashes.
The sprites use the existing pipeline and per-boss `arena:<bossId>` bundles.
The six new entrance sources and exact built-in imagegen prompts are in
`assets/sprites_src/gameplay_art_authored/boss_entrances/`.
`python tools/import_boss_entrances.py --check` validates transparent sources,
registration hashes and lossless packing. The importer only crops transparent
margins and scales uniformly. The painted arch and its destination label both
accept mouse clicks and touch taps; labels stay within the viewport. During sealed
fights, doorway picking lets walking taps pass through the faded foreground art.
Arena, boss and required summon assets preload before travel commits. Existing
boss designs and the in-progress campaign art refresh are retained.

## Review and validation

Run `python serve.py`, then open
[the encounter review](http://localhost:8741/tests/boss_encounters.html).
The review uses isolated saves and supports every boss, class, phase and pose,
entrance travel, walking to the threshold, practicing each counter, sequence
previews, death and retry. Its driver uses ordinary movement and attacks, turns
Azram's mirrors, baits charges, attacks bound souls and identifies the serpent.
**Preview distant pressure** shows each phase's interception move; for the
Archangel, advance through the choir to reach the locked landing warning.
Invulnerability is optional and off for validation runs.
**Campaign doorway** previews the selected boss's wall entrance; changing the
boss selector keeps this view. **Arena vestibule** previews its return door.
Click or tap either painted arch to exercise travel, or use **Walk through
entrance**. Opening `tests/boss_encounters.html?entrance=korvath` starts at the
campaign doorway.

The core checks are:

- `node tests/boss_arenas_contract.mjs`: 32 seeds per arena, wall backing, clear doorway aprons and return routes, device and reward routes, thresholds, repeatable counters, resets and persistent keys.
- `node tests/boss_entrances_browser.cjs`: six campaign doors and vestibules at desktop, 4K and touch/reduced-motion widths; real mouse/touch travel through the painted sprite, safe arrivals and exact cached parent returns. Captures and reports are in `tests/qa/boss_entrances/`. A sealed-arena touch check confirms foreground door art does not capture walking input.
- `node tests/boss_variety_contract.mjs`: optional-counter victories, success and failure paths, bursts, simultaneous hits, direct damage, damage over time, companions, repeated counters and cleanup at 20, 30 and 120 simulation steps per second.
- `node tests/boss_pressure_contract.mjs`: exactly fivefold raw damage across attack paths, difficulty and Echo scaling; 24-second recharge boundaries; co-op selection, scheduling, controls and cleanup; straight retreat and both circling directions in every phase at 20, 30 and 120 steps per second. Reacting after 150 ms provides collision-safe walking escapes, including edge positions and slowed heroes.
- `node tests/boss_playthrough.mjs --output=tests/qa/boss_arenas/playthrough.json`, then `node tests/boss_arenas_balance.mjs`: all 30 boss/class combinations, real movement and combat counters, damage enabled, ordinary equipment and six healing/six aether draughts. Gravebinder uses a sustainable Miasma build and one ordinary warrior. Current boss health, class balance and equipment balance are preserved.
- `node tests/boss_arenas_browser.cjs`: complete rendered encounters at 1920, 3840 and 844 pixels; phone touch and reduced motion; pause, death, retry, failed preload, save reload, legacy rewards and exact cached Cathedral returns.
- `node tests/boss_pressure_browser.cjs`: locked pressure previews for all 16 boss phases at desktop, 4K and touch/reduced-motion widths, including actual mirror reflection before Azram's previews and ordinary walking escapes through the production touch handler.
- `node --test tests/boss_arenas_coop.test.cjs`: 2–4 player authority, automatic charge counters, cooldown replication, admission, disconnects, revives, wipes and retries.
- `node tests/boss_arenas_network.cjs`: four independent touch-enabled browser clients using the production relay and worker; synchronized seals and counters, reconnects, and the visible death-dialog retry action.
- `node tests/boss_arenas_preservation.mjs`: existing terrain, routes, campaign presentation and sprite registrations against the initial working tree.
- `node tests/boss_encounter_contract.mjs`, `node tests/boss_refinement_contract.mjs`, `node tests/boss_animation_contract.mjs`: damage geometry, walking escapes, sequence interruption and bounded animation effects.
- `node tests/boss_arenas_performance.cjs --before-archive=tests/fixtures/boss_pressure_before.json.gz --output-dir=tests/qa/boss_pressure/performance --pressure`: three alternating before/after samples per boss at desktop and 4K, production loop, matched gear, final phase and capped adds. The distant target and damage-enabled diagnostic health pools exercise pressure without changing the starting actor population. Run without concurrent benchmarks. The archive preserves the implementation immediately before this damage/pressure change; `boss_variety_before.json.gz` preserves the earlier counter baseline. A local source snapshot can also be passed as `--before-directory`.
- `node tests/boss_arenas_performance.cjs --before-archive=tests/fixtures/boss_entrances_before.json.gz --output-dir=tests/qa/boss_entrances/performance --seconds=3 --warmup=1000`: three alternating samples per boss at desktop and 4K, comparing the wall entrance change with the preceding damage/pressure implementation. All twelve cases remain within the 10% budget.

Reports and captures are under `tests/qa/boss_arenas/` and
`tests/qa/boss_variety/` and `tests/qa/boss_pressure/`; the current performance summary is in
`tests/qa/boss_pressure/performance/summary.json`. [Measured results](../tests/boss_arenas_results.md)
collect the final pacing, compatibility and performance checks. The target is roughly 2–3 minutes on Normal and
3–4 minutes for Vethriss, measured by the median across five ordinary builds.
Individual classes vary; automated execution does not predict first-time human
difficulty. Browser phone checks use touch emulation. Co-op checks combine
2–4 player simulations with four independent clients on a local WebSocket relay;
they do not measure physical phones or internet latency.

On restricted Windows environments, add
`--preserve-symlinks --preserve-symlinks-main` to Node invocations.
