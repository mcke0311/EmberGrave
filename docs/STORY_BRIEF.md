# Campaign story contract

This is the campaign’s story reference, adapted from the supplied Act I ending
and Acts II–V brief. Keep the game’s original names, as explicitly chosen by the
user. New quests, dialogue, cinematics and art should preserve these beats.

| Brief name | Game name |
|---|---|
| Worldstone / fragments | Sunderstone / Embershards |
| Sanctuary | The Waking World |
| Deckard Cain / Horadrim | Archivist Edran Vael / the Archivists |
| Baal | The Render |
| Tyrael | Warden-Aspect Seraneth |
| Belial | Vethriss, the Veiled Lord |
| Tristram / Pandemonium Fortress / Mount Arreat | Cinderwatch / the Last Bastion / Mount Karrhal |

Act titles, the Silent Choir, Khal-Zahir, the Mire Mother, Azram, the Empty
Archangel and Malthoron retain their existing names. The Ashen Marches remains
an optional region; it is not an extra numbered act.

## Required campaign beats and implementation

The opening is playable: **The Last Warm Wall** starts on a fixed, snowy approach
to Frosthaven. Bryn calls the hero toward shelter; a fallen guard rises beside an
Embershard. At a wrecked caravan the hero defeats three risen and rescues Mara
and Iven, who follow with Bryn toward the wall. Two more risen guard the approach.
The watch's supply cache contains two healing draughts. Beyond it, **the Rimebound
Captain**, an undead officer who can no longer end his watch, bars the courtyard.
His frost slams mark their exact damage radius for 1.1 seconds and leave a
1.25-second recovery window. At half health he moves faster and slams more often;
two risen answer him at 50% health and another two at 25%, with at most two living
reinforcements. His defeat releases the gate and ends any surviving summons.
The travelers appear safely beside the hearth after the rescue. Seraneth's
first response at the hearth is "The light spared you. It did not spare them."
The first campaign quest remains **The Light That Lied**, with its existing
eight wilderness kills and rewards. The prologue's kills do not count toward it.
Earlier history remains in optional conversations rather than an opening crawl.

The encounter uses installed art and soundtrack, nonblocking captions, and
movement/attack/healing hints. Its first-play pacing target is 6–7 minutes, with
no enforced waits. Companions cannot be attacked or block the hero; they shelter
outside the final fights, and town entry never waits on their pathfinding.
`flags.opening` version 2 stores checkpoints, rescue and supply progress, boss
health and phase, finite reinforcement waves and defeated enemies, along with
uncollected opening loot. Version 1 saves retain their stage: saves at gate combat
bypass the rescue but meet the captain, and an already-cleared gate stays open.
Completed or legacy heroes do not replay. Skip, normal death followed by
return to town, or early travel ends staging; hardcore death remains permanent.
Older saves without this record continue loading at their home town.

Review or play with isolated saves at `tests/opening.html`. Its walkthrough
uses actual starter equipment, movement and combat for every class, plus optional
Gravebinder and Wildkeeper summon walkthroughs. Scene controls inspect the rescue,
escort, supplies, captain, second phase, frost warning and hearth arrival. Run
`node --preserve-symlinks --preserve-symlinks-main tests/opening_contract.mjs`
for checkpoints, reachability, skipping, old saves and failed-transition checks.

| Act | Required story | Playable implementation |
|---|---|---|
| I ending | Someone harvests fragments and transports them south. | Korvath’s transport ledger explicitly confirms harvesting and the route to the Weeping Marsh in `q9`’s conclusion. |
| II | Fragments awaken buried spirits. The Quieting takes speech, dreams and fear; people calmly enter the swamp and disappear. | `q10` requires three separate conversations in Greywater Landing: Sella’s lost voice, Olli’s missing dreams and Ysra’s account of the disappearances. Sella uses written testimony and has no spoken voice. |
| II | Enter flooded crypts under an abandoned monastery and hunt the Silent Choir. | The monastery entrance leads to flooded crypts. `q11` requires destroying the Drowned Ritual Heart and defeating High Choirmaster Vorthel. |
| II boss and ending | The Mire Mother comprises the marsh’s consumed bodies and guards a fragment in her chest. Recover it before the cult transports it onward; discover a gateway under an ancient city. | `q12` requires the Choir quest, the boss kill and a separate shard recovery. Her remains carry plans for the gateway beneath Khal-Zahir. Killing her early cannot skip Oris’s quest chain. |
| III | Earthquakes uncover a buried desert city erased after its rulers contacted Hell. Shards restart machines and impossible passages. | Edran provides this history from the Dig Camp. `q13` leads into an accessible underground market, with three relays and six specifically identified Gilded Constructs to disable/destroy. |
| III | Explore shifting tombs, free an imprisoned scholar, and enter the undead king’s palace. | The tomb layout regenerates on entry. `q14` requires finding and freeing Scholar Ilyan; ordinary kills cannot substitute. The scholar’s rescue leads to the palace. |
| III returning scholar | The town scholar recognizes links to the ancient antagonist’s forgotten experiments. | Edran connects the symbols to the Render’s forgotten Sunderstone experiments; Ilyan confirms the palace inscriptions. |
| III boss and ending | Azram is an undead king fused to a fragment, with gold plates and chained souls. He summons enemies from earlier areas through portals. His map reveals Malthoron’s suspended cathedral. | Azram’s combat summons earlier enemies after a health threshold. `q15` requires the scholar quest, the boss kill and collecting the fortress map at the throne. |
| IV | A dimensional gothic fortress changes every level and incorporates shard-touched memories. | Both cathedral levels use seeded authored rooms and bridges over blocked void. Cinderwatch, Last Bastion and Karrhal chapels hold the original souls. The Heart pairs seals, priests and sword pieces around its procession ring. Dedicated gothic artwork and two optional memory zones accompany the layouts; detour returns preserve the parent instance, while normal visits regenerate it. See [Cathedral of Memories](CATHEDRAL_DESIGN.md). |
| IV | Rescue souls, break Quieting seals, find the shattered sword and confront demonic Choir priests. | `q16` requires three soul rescues and the Empty Archangel. `q17` requires that quest, three separate seals, three sword pieces, three Choir priests and Malthoron. Progress survives regenerated maps. |
| IV midpoint | A soulless false angel, made from discarded Warden armor and corrupted stone, uses the Warden’s voice. | The Empty Archangel’s briefing and combat dialogue establish this identity. Rescue the souls to break its ward. |
| IV boss and ending | Malthoron sheds human armor, revealing darkness and screaming souls. His destruction collapses the shards into a portal into Hell; someone else guided him. | Health phases announce the armor shedding and change the final silhouette to a wraith. Complete the cathedral objectives and use the shard portal to enter the Breach; the turn-in establishes the hidden master. |
| V | A bleak Hell made from fallen demon kingdoms, with ash rivers, impaled fields, ruins and rival enemies. Stop a permanent bridge into the mortal world. | The Cinderfields, Cinder Bastion and Throne form the route; quest text states the setting and threat. Hell enemies now have rival factions, enabling the existing melee infighting system. |
| V twist | The Lord of Lies used Malthoron solely to gather fragments, intending to create a controllable core and manipulate kingdoms internally. | Both the final quest and Vethriss’s confrontation explicitly state this motive. |
| V final fight | A wounded friend asks for the shards, becomes a fast serpent with illusions, then a towering shadow copying previous act bosses. | Vethriss starts with authored wounded-Seraneth poses, a wounded display name and a surrender appeal. Health thresholds change the silhouette to serpent and then a towering shadow. The serpent creates translucent illusions; the shadow reuses Korvath’s fissure, the Mire Mother’s bile, Azram’s chains and Malthoron’s beam. |
| V choice | Destroy: permanently unstable barrier. Seal: eventual guardian corruption. Give to the Warden: the Warden returns visibly changed. | All three distinct endings are selectable and saved. Choosing an ending also claims the finale and unlocks the next difficulty. Reloading after the final kill restores an unchosen ending prompt. |

## Boss art and encounters

The six main bosses now have 96 authored combat poses across 16 forms. Mire
Mother's victims and chest fragment, Azram's gold plates and chained souls, the
Empty Archangel's hollow Warden armor and Malthoron's exposed screaming souls
appear in the sprites. Five separate armor pieces fall during Malthoron's
transitions. Their arena, warning, recovery, summon and retreat rules are described
in [the encounter guide](BOSS_ENCOUNTERS.md). The shard and map recoveries remain
separate interactive story actions after the kill.

## Remaining environment and cinematic art

These broader story visuals remain outside the boss encounter pass:

- Dedicated rivers of ash and fields of impaled demons. Existing Hell terrain
  still uses its lava/scorch materials and shared ruins.
- Authored cinematic depictions of villagers disappearing and Seraneth’s
  visibly altered return. These beats currently appear in dialogue/ending text.

## Regression checks

- `tests/story_campaign_contract.mjs`: production quest events, duplicate
  prevention, specific kill targets, early boss recovery, mandatory story
  prerequisites, soul/seal wards (including damage over time), saved progress,
  legacy completed quests and earned rewards, seeded objective reachability, required installed
  art, market travel links, Hell faction targeting, actual phase changes,
  copied boss attacks and all three ending records.
- `tests/story_campaign.html`: an isolated browser hero/save store checks the
  NPC dialogue UI, playable objectives, portal transition, loaded/rendered
  scenes, final silhouettes and ending choices. Its controls provide review
  scenes without modifying a real saved hero.

Run the Node check with `node tests/story_campaign_contract.mjs`. If a Windows
sandbox blocks Node’s entry-path canonicalization, use
`node --preserve-symlinks --preserve-symlinks-main tests/story_campaign_contract.mjs`.
Serve the game and open `tests/story_campaign.html` for browser QA.
