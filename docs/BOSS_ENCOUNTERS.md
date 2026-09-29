# Campaign boss encounters

All six story bosses now occupy separate authored arena zones. Their original
character artwork, lore, form counts, health thresholds, quest keys and defeated
flags are preserved. Optional bosses and the Rimebound Captain keep their existing
controllers. Player classes and loot generation are unchanged.

| Boss / entrance | Arena and required counter |
| --- | --- |
| Korvath / Shattered Temple | Octagonal frozen sanctuary with two ward braziers. Cleaves, committed charges and fissures. At 50%, light the marked brazier, then stand beyond its blue ward to bait the next charge through it. A missed charge leaves the armor intact; the brazier becomes available again. Final fissures have a separately warned crossing strike. |
| Mire Mother / Choir's Ritual | Circular drowned basin with three platforms and broad connecting paths. Bile, grasping roots and rotating flood sectors. At 55% and 25%, turn the marked sluice to drain the surge and expose her heart. Later phases increase flood frequency without removing walking routes. |
| Azram / Palace of Khal-Zahir | Long gilded court with sun mirrors and molten channels. Chain lanes, finite portal reinforcements and gold sweeps. At 60% and 30%, turn the marked mirror; his next sun beam reflects into the throne ward. Destroying a portal interrupts him; closing its pair grants a longer opening. |
| Empty Archangel / Shattered Cathedral | Cruciform bell sanctuary over the void. Wing volleys and locked descents. At 50%, ring the marked bell to interrupt the protected choir. Final-phase descents lead into a separately warned crossing attack. Soul rescues remain in the parent Cathedral. |
| Malthoron / Cathedral Heart | Circular soul-forge with chained armor monuments and three soul braziers. Heavy attacks develop into soul volleys and sweeping beams. At 66% and 33%, extinguish two marked braziers. Each completed counter drops armor and grants an extended opening. Quieting objectives remain in the parent level. |
| Vethriss / Throne of Cinders | Broad shattered dais with three shard anchors and changing atmosphere. Wounded Seraneth, serpent and shadow forms remain. At 70% and 35%, activate the marked anchor. The last form cycles fissure → bile, chains → wing lanes, and a sweeping hollow beam. |

## Entering, fighting and retrying

A doorway occupies each former boss location. Travel first enters a safe
vestibule, with ordinary remains for preparation and an open return route.
Crossing the combat threshold starts the encounter and seals the entrance.
Prerequisites are checked before arena travel commits. Returning uses the exact
cached parent instance, including a shifting Cathedral instance retained through
other travel routes.

During a protected phase the HUD gives one short instruction and the required
device has a highlighted ring and label. Off-screen labels point toward it.
Use the existing click/tap controls; the character walks into interaction range.
Devices cannot be destroyed or consumed. Outside required counters they provide
hazard relief or interruption on cooldown. Successful required counters create a
labeled three-second damage opening.

Damage clamps at every pending health threshold, including simultaneous hits,
damage over time and summons. Protected phases accept no damage. Major attacks
warn for at least one second, lock their aim and have recovery windows. Floods
warn for 2.5 seconds. Warning and damage use the same shapes. The beam also shows
its sweep direction. Ground hazards leave collision-aware walking escapes;
no movement skill is required. Reduced motion retains warnings, device cues and
the Archangel's protected raised pose.

Death offers **Retry at arena entrance** and **Return to town**. Retry restores
health and mana and resets boss health, form, armor, devices, hazards, adds,
projectiles and summons. Death penalties and consumed supplies remain spent.
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

The Act I co-op beta includes Korvath's arena. The host worker owns device
activation, damage, seals and hazards. The fight waits until every connected
living player already in the arena crosses the threshold. Admission and travel
are blocked during combat. Existing participants can reconnect to the same fight.
After a wipe, retry resets the party at spaced entrance positions with full
health and mana, retaining supplies and death penalties. Later acts remain
outside the co-op beta. The protocol cache revision is `embergrave-coop-4`.

## Art and implementation

`DATA.BOSS_ARENAS`, keyed by boss ID, contains frozen arena definitions: stable
`arena_<bossId>` zone IDs, parent links, entrance and return anchors, boundaries
and device placements. `MapGen` has a dedicated arena path; its combat floor is
free of random packs, events and decorative collision. Attempt state lives in
`BossEncounters.Encounter`, separate from definitions.

Thirty-six new ImageGen sprites provide architecture, monuments, floor accents,
entrances, and inactive/active devices. Source sheets, prompts and registrations
are in `assets/sprites_src/gameplay_art_authored/boss_arenas/`.
`python tools/import_boss_arenas.py --check` validates the source/packed hashes.
The sprites use the existing pipeline and per-boss `arena:<bossId>` bundles.
Arena, boss and required summon assets preload before travel commits. Existing
boss designs and the in-progress campaign art refresh are retained.

## Review and validation

Run `python serve.py`, then open
[the encounter review](http://localhost:8741/tests/boss_encounters.html).
The review uses isolated saves and supports every boss, class, phase and pose,
entrance travel, walking to the threshold or marked device, required-counter
state, sequence previews, death and retry. It includes an optional movement and
interaction driver. Invulnerability is optional and off for validation runs.

The core checks are:

- `node tests/boss_arenas_contract.mjs`: 32 seeds per arena, entrances, device and reward routes, thresholds, repeatable counters, resets and persistent keys.
- `node tests/boss_playthrough.mjs --output=tests/qa/boss_arenas/playthrough.json`, then `node tests/boss_arenas_balance.mjs`: all 30 boss/class combinations, real movement and device interactions, damage enabled, ordinary equipment and six healing/six aether draughts. Gravebinder uses a sustainable Miasma build and one ordinary warrior.
- `node tests/boss_arenas_browser.cjs`: complete rendered encounters at 1920, 3840 and 844 pixels; phone touch and reduced motion; pause, death, retry, failed preload, save reload, legacy rewards and exact cached Cathedral returns.
- `node --test tests/boss_arenas_coop.test.cjs`: 2–4 player authority, concurrent devices, replication, admission, disconnects, revives, wipes and retries.
- `node tests/boss_arenas_network.cjs`: four independent touch-enabled browser clients using the production relay and worker; synchronized seals and counters, reconnects, and the visible death-dialog retry action.
- `node tests/boss_arenas_preservation.mjs`: existing terrain, routes, campaign presentation and sprite registrations against the initial working tree.
- `node tests/boss_encounter_contract.mjs`, `node tests/boss_refinement_contract.mjs`, `node tests/boss_animation_contract.mjs`: damage geometry, walking escapes, sequence interruption and bounded animation effects.
- `node tests/boss_arenas_performance.cjs --resume`: three alternating before/after samples per boss at desktop and 4K, production loop, matched gear, final phase and capped adds. Run without concurrent benchmarks. The compressed initial working-tree snapshot is retained in `tests/fixtures/boss_arenas_before.json.gz`.

Reports and captures are under `tests/qa/boss_arenas/`; the performance summary is
in `performance/summary.json`. [Measured results](../tests/boss_arenas_results.md)
collect the final pacing, compatibility and performance checks. The target is roughly 2–3 minutes on Normal and
3–4 minutes for Vethriss, measured by the median across five ordinary builds.
Individual classes vary; automated execution does not predict first-time human
difficulty. Browser phone checks use touch emulation. Co-op checks combine
2–4 player simulations with four independent clients on a local WebSocket relay;
they do not measure physical phones or internet latency.

On restricted Windows environments, add
`--preserve-symlinks --preserve-symlinks-main` to Node invocations.
