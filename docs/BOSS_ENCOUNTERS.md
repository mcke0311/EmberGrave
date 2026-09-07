# Campaign boss encounters

The six main story encounters use `js/boss_encounters.js`. Optional bosses and the
Rimebound Captain keep their existing controllers. Story prerequisites, the
Archangel/Malthoron wards, quest rewards, difficulty unlocks and ending choices
remain in the campaign system.

| Boss | Phases and combat identity |
| --- | --- |
| Korvath | Alternating committed cleaves and fissures. At 50%, two guards join once and each fissure gains a perpendicular second strike, separately warned, followed by a two-second opening. |
| Mire Mother | Targeted bile and a grasping ring. Grasp removes whole pools overlapping its inner safe circle at the start of its warning, then grants 2.25 seconds of recovery. At 55%, recovery exposes the shard for 25% more incoming damage. At 25%, bile marks two pools. Transition adds remain capped at four. |
| Azram | Chains and cleaves, with portals opening first at 60% and 30%; molten-gold cones join the last phase. Each later phase has one pair, each portal raising at most two enemies. Labels show the next spawn time and remaining charges. Destroying one interrupts him for 1.5 seconds; closing the pair grants 2.5 seconds. |
| Empty Archangel | Separated wing projectiles alternate with descent. At 50%, descent chains into a freshly warned cross at her landing position, followed by two seconds of recovery. Crossing lanes from the same strike hit each actor only once. The soul-rescue ward still applies. |
| Malthoron | At 66% and 33%, armor falls to 70% and 40% of his difficulty-scaled starting armor. Soul volleys and two knights accompany the first break; the last form alternates the beam's sweep direction and grants two seconds of recovery after it. The dashed preview follows that sweep. |
| Vethriss | Wounded Seraneth uses borrowed light. At 70%, three one-hit illusions each mark a locked shadow lane for 1.25 seconds. Killing an illusion removes its lane. Surviving lanes fire one combined weak pulse, at most one hit per actor, then disappear. Clearing all early grants a two-second opening. At 35%, remembered fissure → bile and chains → beam pairs alternate, with 2.25 seconds of final recovery. |

## Fairness and encounter lifetime

Each boss gets a flat 21 × 21 arena with a three-tile approach and nonblocking
perimeter dressing. Random spawns and world events stay out of the room. Story
objectives remain reachable; required kill rewards are placed near their boss.

Major attacks normally give a one-second warning and at least 1.25 seconds of
recovery. Bile grants 2.25 seconds. Warnings lock their target when they begin.
Ground damage tests the actor's ground anchor against the same circle, ring, cone
or lane that is drawn. Overlapping shapes from an instantaneous strike share
one hit set; beams and pools keep their explicit tick cadence.
Lunge damage sweeps only the portion actually traveled;
projectiles retain their original warning lane. Airborne companions ignore ground
hazards, and boss area attacks deal 45% collateral damage to player summons.

The controller advances on simulation time. Pause pauses every warning and
hazard. A transition cancels the previous attack. Leaving the gold arena boundary,
dying or traveling resets the living boss's health, form, scaled base stats and
afflictions. It removes all encounter-owned creatures, projectiles and pools.
Defeating the boss ends its remaining threats. Owned adds award no XP, loot or
quest progress. Mire Mother has no damaging death burst.

Sequences contain at most two steps and lock each step when its warning starts.
The HUD shows strike count, warning progress, phase thresholds, and recovery
time; exposed-shard and mechanic-interruption openings get explicit labels.
Cleave pursuit lasts at most 1.5 seconds before substituting the boss's existing
ranged signature. The substitute consumes that rotation entry. Illusion channels
are canceled with their sequence, including when a review preview replaces it.

At most three bile pools persist, each for six seconds. Living add limits are
2 / 4 / 4 / 0 / 2 / 3 in campaign order. Portals count separately from Azram's
four creatures. Summons cannot recursively spawn enemies or death explosions.

## Art and loading

There are 96 authored poses: idle, movement, windup, impact, recovery and death
for all 16 forms. Malthoron also has five separate falling armor pieces. These
are key poses with horizontal facing changes. The attack animation layer adds
continuous anticipation, recoil and recovery transforms, plus spell and impact
effects; see [Boss attack animation](BOSS_ANIMATIONS.md).
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
removes body motion and traveling decoration; impacts and warnings remain readable.

## Review and validation

Serve the repository with `python serve.py`, then open
`http://localhost:8741/tests/boss_encounters.html`. The review uses an isolated
save store and offers each boss, class, phase and pose, plus optional invulnerability.
Normal game movement, skills and potions work inside the frame. Select an attack
sequence and use **Preview sequence**, **Advance 0.25 s**, or **Resume** to inspect
both strikes and their recovery.

Run `node tests/boss_encounter_contract.mjs` for geometry, phases, caps, cleanup,
rewards, difficulty resets and 192 seeded arenas. Run
`node tests/boss_playthrough.mjs` for all 30 ordinary-equipment combat simulations.
The driver uses real player, monster, minion, projectile and effect updates;
it follows visible warnings without teleporting or disabling damage. Gravebinder
starts with an army raised from ordinary corpses, not empowered graves. Six
healing and six aether draughts form a fixed consumable budget. Automated play
checks viability and pacing, not first-time human difficulty.

Run `node tests/boss_refinement_contract.mjs` for the new sequences, interruptions,
armor changes, and complete-sequence walking escapes with real movement and body
separation. The playthrough driver now retains useful attack range after dodging,
preventing outward dodges followed by attack paths back through poison.
For a comparable baseline, run `node tests/boss_playthrough.mjs --baseline=4258cf2`
and `node tests/boss_refinement_balance.mjs`. The historical report is preserved
separately from this comparison using the same driver on both controllers.

`node tests/boss_browser_review.cjs --width=1920 --check` reviews every sequence
and all authored poses. Use `--width=3840` for 4K and `--motion` to exercise motion
enabled. Captures go to `tmp/boss_refinement/scenes/`; reports go to
`tests/qa/bosses/`. `node tests/boss_refinement_performance.cjs` compares three
alternating pairs of production-loop samples against the prior authored
controller and HUD at revision `4258cf2`, with identical gear and capped adds.
Use `--resume` to retain completed samples after a capture failure. Above-budget
cases can be reassessed with `--boss=korvath --width=1920 --seconds=12
--warmup=5000 --output-dir=tests/qa/bosses/refinement_performance_followup`.
`--summarize` combines the initial series and these longer follow-ups without
discarding the original failures.

The intended Normal pace is roughly 2–3 minutes, or 3–4 for Vethriss. There are
no forced time gates; class, build, resistances and execution produce substantial
variation. Measured results and browser performance limits are recorded in
`tests/boss_refinement_results.md`; earlier measurements are retained in
`tests/boss_encounter_results.md`.

On Windows, add `--preserve-symlinks --preserve-symlinks-main` to Node if the
sandbox prevents entry-path canonicalization.
