# Campaign boss encounters

The six main story encounters use `js/boss_encounters.js`. Optional bosses and the
Rimebound Captain keep their existing controllers. Story prerequisites, the
Archangel/Malthoron wards, quest rewards, difficulty unlocks and ending choices
remain in the campaign system.

| Boss | Phases and combat identity |
| --- | --- |
| Korvath | Committed axe cleave and a locked fissure lane. At 50%, oathfire changes his appearance, two guards join once, and fissures gain a separately warned second strike. |
| Mire Mother | Targeted bile and a grasping ring with safe ground inside and outside. At 55%, her exposed shard takes 25% more damage during recovery. At 25%, bile marks two pools. Two drowned join at each transition, with four living adds maximum. |
| Azram | Parallel chain lanes, two destructible portals at 60%, and molten-gold cones at 30%. Each later phase gets one portal pair; each portal can raise two earlier-area enemies, within a four-add cap. Destroying a portal stops its future spawns and opens recovery. |
| Empty Archangel | Five slow, separated wing projectiles and a targeted descent. At 50%, her wings unfold and crossed lanes join the rotation. The soul-rescue ward still applies. |
| Malthoron | Armored cleaves and chains; at 66%, broken plates reveal screaming souls, volleys and two knights. At 33%, the unbound form uses a slowly rotating beam with a cue showing its next direction. Falling armor is cosmetic. |
| Vethriss | Wounded Seraneth uses borrowed light. At 70%, the serpent lunges down a locked lane and creates three translucent, one-hit illusions. At 35%, the shadow reuses the actual fissure, bile, chain and beam attack builders from earlier bosses. |

## Fairness and encounter lifetime

Each boss gets a flat 21 × 21 arena with a three-tile approach and nonblocking
perimeter dressing. Random spawns and world events stay out of the room. Story
objectives remain reachable; required kill rewards are placed near their boss.

Major attacks normally give a one-second warning and at least 1.25 seconds of
recovery. Bile grants 2.25 seconds. Warnings lock their target when they begin.
Ground damage tests the actor's ground anchor against the same circle, ring, cone
or lane that is drawn. Lunge damage sweeps only the portion actually traveled;
projectiles retain their original warning lane. Airborne companions ignore ground
hazards, and boss area attacks deal 45% collateral damage to player summons.

The controller advances on simulation time. Pause pauses every warning and
hazard. A transition cancels the previous attack. Leaving the gold arena boundary,
dying or traveling resets the living boss's health, form, scaled base stats and
afflictions. It removes all encounter-owned creatures, projectiles and pools.
Defeating the boss ends its remaining threats. Owned adds award no XP, loot or
quest progress. Mire Mother has no damaging death burst.

At most three bile pools persist, each for six seconds. Living add limits are
2 / 4 / 4 / 0 / 2 / 3 in campaign order. Portals count separately from Azram's
four creatures. Summons cannot recursively spawn enemies or death explosions.

## Art and loading

There are 96 authored poses: idle, movement, windup, impact, recovery and death
for all 16 forms. Malthoron also has five separate falling armor pieces. These
are key poses with horizontal facing changes, not full directional animation.
Vethriss's real serpent remains opaque; its illusions are translucent.

Original generated PNGs, prompts and source locations are recorded in
`assets/bosses/sources.json`. `tools/import_boss_art.py` extracts alpha-connected
cutouts, registers each pose to a ground anchor, packs lossless WebP atlases and
compiles per-pose targeting masks. It does not paint or synthesize poses. Source
and packed hashes are recorded in `assets/bosses/import.json`; the main sprite
compiler preserves these entries. `--check` verifies the installed sources.

Zone entry loads and decodes only the relevant boss bundle before committing the
map. Every pose and hit flash is prepared before play, so a first strike
does not allocate a canvas, clip a tall form in an ordinary actor buffer, or
sample an adjacent pose. Drawing and pointer
picking share the same transform and compiled silhouette. Reduced-motion mode
removes the small idle/walk bob; warnings remain static and readable.

## Review and validation

Serve the repository with `python serve.py`, then open
`http://localhost:8741/tests/boss_encounters.html`. The review uses an isolated
save store and offers each boss, class, phase and pose, plus optional invulnerability.
Normal game movement, skills and potions work inside the frame.

Run `node tests/boss_encounter_contract.mjs` for geometry, phases, caps, cleanup,
rewards, difficulty resets and 192 seeded arenas. Run
`node tests/boss_playthrough.mjs` for all 30 ordinary-equipment combat simulations.
The driver uses real player, monster, minion, projectile and effect updates;
it follows visible warnings without teleporting or disabling damage. Gravebinder
starts with an army raised from ordinary corpses, not empowered graves. Six
healing and six aether draughts form a fixed consumable budget. Automated play
checks viability and pacing, not first-time human difficulty.

The intended Normal pace is roughly 2–3 minutes, or 3–4 for Vethriss. There are
no forced time gates; class, build, resistances and execution produce substantial
variation. Measured results and browser performance limits are recorded in
`tests/boss_encounter_results.md`.

On Windows, add `--preserve-symlinks --preserve-symlinks-main` to Node if the
sandbox prevents entry-path canonicalization.
