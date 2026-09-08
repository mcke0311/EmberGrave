# Act III enemy combat

Act III uses eleven regular enemy identities, grouped by the architecture and encounter role of each zone. Enemy IDs, base statistics, difficulty scaling, loot, quest objectives, and boss moves remain intact. Existing saves require no migration. The Dig Camp remains safe.

## Roster and definition resolution

`DATA.ACT3_ROSTERS` supplies the six adventure-zone pools and prevents the procedural roster builder from appending unrelated creatures. Random events filter this same pool by family and fall back to the local pool when the requested family is unavailable. Explicit story guards and Azram's portals retain their authored identities.

`DATA.resolveEnemy(id, zoneId)` returns an independent definition. It applies `DATA.ACT3_ENEMY_PROFILES` only in Act III, before difficulty and elite modifiers. Map generation, monster construction, and the review galleries use this resolver. A Dune Serpent or Stone Gargoyle in another act retains its catalog definition.

| Enemy | Role | Attacks |
| --- | --- | --- |
| Dune Raider | Flanker | Mace attacks, matching existing marauder art; packs of 3–5 |
| Tomb Sentinel | Defender | Sword, 25% frontal guard, physical Shield Bash |
| Dune Shade | Flanker | Telegraph an approach blink, recover, then shadow touch |
| Chained Soul | Ranged | Light bolts with visible chain links; six-tile preferred distance |
| Gilded Construct | Heavy | Fists and a light-powered Sunderstone Pulse |
| Shard Construct | Ranged | Physical crystal shards and a three-lane Crystal Fan |
| Crystal Marauder | Flanker | Fists and a committed seven-tile charge |
| Gilded Thrall | Defender | Sword, 20% frontal guard, light-powered Gilded Sweep |
| Prisoned Shade | Ranged | Shadow bolts; defensive blink to six tiles when approached |
| Dune Serpent | Flanker | Existing poisonous bite and charge, with a warning and recovery |
| Stone Gargoyle | Flanker | Claws and a marked, validated Stonefall landing |

Encounter placement uses the existing authored courts. Defenders occupy the approach, ranged groups stand behind them, flankers use side positions, and heavy constructs favor machinery and rewards. Pack budgets, arrival pads, five-tile routes, relay anchors, and boss arenas are preserved.

## Attack lifecycle

`ImperialCombat` owns the windup, release/travel, and recovery stages in simulation time. It has no delayed callbacks. Dedicated Act III animation frames follow those stages, reaching impact when damage or projectiles release. Default new specials retain a 0.75-second windup, 0.85-second recovery, seven-second cooldown, and 1.2× base damage. Crystal Fan launches three 0.5× projectiles with gaps between their lanes. Existing serpent/gargoyle damage and cooldowns are retained. Initial cooldown offsets depend on identity and position to stagger nearby attacks.

Regular enemies now communicate windup through their body poses. Their ground warning shapes and countdown labels are hidden during normal gameplay, but remain available through the debug overlay. Collision shapes, projectiles, release effects, and block feedback remain active. Azram and the Chained Sovereign retain their existing boss presentation and warnings. See [animation validation](ACT3_ANIMATION_VALIDATION.md).

Warning shapes are the damage shapes. Circles/cones check ground anchors and line of sight; fan projectiles carry their marked lane as a collision constraint. Charges sweep a locked route and may hit each hostile once inside the marked corridor. Charging and leaping validate their full footprint and terrain segment both when starting and releasing; moving obstacles stop travel. Leaps also reserve space around other monsters at takeoff. Blinks require a free, reachable destination with line of sight to their target and at least half a second of recovery. Interruption, death, and travel cancel pending attacks. Released projectiles remain bound to their originating monster and map/world and expire if either becomes invalid.

Frontal guards cover a 120-degree arc and roll once per incoming weapon attack. They are unavailable during attack/cast actions or incapacitation. A block stops damage and successful-hit effects, including poison, stealing, Quarry, Sunder, and weapon knockback. Spells, ground shockwaves, leap impacts, and damage over time bypass the guard.

Azram retains his dedicated encounter controller, phases, portal summons, and arena. The Chained Sovereign retains melee, summons, enrage, and the existing slam damage/cooldown. Its slam now has a matching visible warning; legacy delayed casts use cancellation checks.

## Review and verification

Run `python tests/act3_server.py`, then open [the Act III review page](../tests/act3_review.html). Select an enemy and use **Preview attack**, **Preview signature skill**, or **Preview death**. Previews pause at the start; **Play encounter** advances gameplay and **Step 1/60 second** advances one simulation step. **Attack ranges and cooldowns** adds diagnostic overlays. **Restore mixed encounters** reloads the ordinary zone. The review uses temporary heroes and an in-memory save store; isolated previews clear dropped items so labels do not obscure the animation.

Run these from the repository root (the Windows environment may require Node's `--preserve-symlinks --preserve-symlinks-main` flags):

```text
node tests/act3_combat_contract.mjs --record
node tests/act3_layout_contract.mjs
node tests/act3_navigation_contract.mjs
node tests/act3_quest_contract.mjs
node tests/act3_combat_browser.cjs
node tests/act3_combat_performance.cjs
```

The browser tools require Playwright and Chrome; `NODE_PATH` may point to the bundled runtime. The performance comparison uses the local pre-pass snapshot at `tmp/act3_combat/before`, restored by `tests/act3_combat_baseline.py`. It records two alternating before/after pairs, 90 warmup frames, and 240 measured frames per movement/combat workload and resolution. Absolute results depend on the machine and browser.

See [the enemy combat QA report](../tests/qa/act3/COMBAT_REPORT.md) for the measured results and captures. Existing level-design QA is retained separately in `REPORT.md`.
