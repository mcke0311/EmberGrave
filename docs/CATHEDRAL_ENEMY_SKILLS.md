# Act IV enemy combat

The four cathedral zones use `EnemySkills` for Hollow Knights, Choir Priests,
Soul Eaters and Memory Wraiths. Other zones retain their existing behavior.
The two optional cache guardians receive explicit profile IDs; Malthoron's
summoned Knights receive the ordinary Knight profile automatically.

| Profile | Signature | Cooldown / warning / recovery |
| --- | --- | --- |
| Hollow Knight | Guarded Cleave: locked 100° cone, 2.4 tiles, 1.25× physical; frontal physical damage reduced 30% during brace | 6 / 0.8 / 0.9 s |
| Choir Priest | Mending Litany: 30 HP to one eligible ally within 6 tiles and line of sight | 8 / 0.9 / 0.35 s |
| Soul Eater | Hunting Rush: up to 5 tiles along a swept collision path, one physical hit | 7 / 0.65 / 0.8 s |
| Memory Wraith | Remembered Step: marked clear landing, then a separately warned 90° cone of radius 1.8; 0.9× shadow | 7 / 0.8 + 0.4 / 0.8 s |
| Oathbound Hollow Knight | Two committed 0.8× sweeps; separately warned second sweep | 8 / 0.8 + 0.7 / 1.3 s |
| Echoing Choir Priest | Priest kit plus Quieting Chorus: locked circle of radius 2.2, 0.65× shadow | 10 / 1 / 1.1 s |

Soul Bolt is violet, shadow damage, at 0.8× the previous projectile damage.
Wraith ordinary attacks deal 0.8× shadow damage. Wraith and Chorus slows refresh
at 20% for 1.25 seconds and respect crowd-control reduction. There are no new
silences, stuns or displacement effects against the player.

Bites heal the Soul Eater for 15% of actual health lost, capped at 5% of its
maximum health. Absorption, blocking, dodging and overkill cannot inflate the
drain. Healing prevention applies to both drain and Litany. Litany excludes
Priests, bosses, the caster, dead/full-health targets and blocked sight lines;
it revalidates on release and reserves recipients against duplicate casts.

One action owns windup, release and recovery. Ordinary attack cooldowns include
the legacy animation time, preserving their previous cadence. Stun, freeze,
fear, death, player death and map departure cancel pending effects. All timing
uses simulation time, without delayed callbacks. Cached detours keep the same
enemy objects, health and remaining cooldowns; canceled actions never resume.

At most two nearby signature actions coexist, with a boss windup taking one
slot. Boss priority, locked targeting geometry, rush collision and blink clearance
remain unchanged. Ordinary enemy ground warnings, floating skill names and cast
bars are removed. Four authored sprite atlases now provide attack, skill and death
poses, including the Oathbound return sweep and the Wraith's reappearance strike.
Priest casting retains magical sounds without the bow sound. Boss presentation
is unchanged. See [Act IV animation validation](ACT4_ANIMATION_VALIDATION.md).

Main groups contain two Knights, a Priest, an Eater and a Wraith. Ritual groups
replace their Priest with a Knight because their objective Priest supplies
support. Optional approaches follow the specified progressive mixtures. The
Cinderwatch finale contains its elite Knight, two Knights and two Eaters; the
Bastion finale contains its elite Priest, three Knights and one Wraith. Every
finale member retains the existing cache encounter tag. Guardian health, XP,
elite loot rules and escort multipliers remain unchanged. Oathbound and Echoing
replace random elite modifiers only for those two guardians.

Malthoron's label is **Quieting Chains**, with ivory/violet effects. Its light
damage, geometry and timing remain intact; Azram retains Chains of Khal-Zahir.
Campaign IDs, wards, rewards, save behavior and `MapGen.generate(zoneId, seed)`
are unchanged.

## Review and reproduction

Run `python tests/cathedral_server.py`, then open
`http://127.0.0.1:8744/tests/cathedral_review.html`. Select a zone, seed and
1080p/4K canvas. Enemy, skill, death and facing controls create an isolated demonstration;
advance by 0.1 seconds or one frame to inspect windup, release and recovery, or play the
mixed encounter. Sound and invulnerability are explicit controls. Browser
saves use an isolated in-memory store.

`tests/fixtures/cathedral_enemies_before.zip` retains the exact runtime captured
before this work. `tests/cathedral_enemy_baseline.py` restores missing snapshot
files without overwriting the current game. The review's “Before enemy skills”
option uses this snapshot; “Before redesign” is the earlier layout comparison.

Validation commands (use Node's `--preserve-symlinks --preserve-symlinks-main`
flags on this Windows workspace):

- `tests/cathedral_enemy_contract.mjs`: production abilities, collisions,
  targeting, cancellation, healing, guard, warning budget, and 100 seeds in each
  zone, including sampled bridges, entrances and arena edges.
- `tests/cathedral_enemy_balance.mjs`: 80 matched encounters per version using
  identical new rosters on old AI versus new skills. A level-20 melee probe
  commits to targets, moves through production collision, and uses real damage,
  accuracy, block and armor. Health pressure is measured with a large player HP
  pool; it is a repeatable benchmark, not a human difficulty rating.
- `tests/cathedral_enemy_balance.mjs --historical`: retains the full historical
  composition comparison, including procedural enemies and homogeneous Priests.
- `tests/cathedral_boss_compatibility.mjs`: old/current boss rotations on the
  same current geometry, across both bosses, every phase and three frame rates.
- `tests/cathedral_enemy_browser.cjs capture|detours|performance`: production
  browser captures, cached skill-state round trips and alternating performance
  comparisons. Requires Playwright and the local review server.

Results are retained under `tests/qa/cathedral/enemy_*.json` and `.webp`.

## Accepted balance scope

The user explicitly chose to retain the specified mixtures and health after
reviewing the historical comparison. The old main generator also selected
tougher procedural creatures from expanded level pools, and the old Bastion
finale had five mutually healing Priests. Consequently the full historical
composition comparison falls outside ±15%; its results remain visible in
`enemy_balance_historical.json`. Health and the requested counts were not
increased to imitate that older composition.

The comparison that isolates the new skills passes: aggregate pressure +2.19%,
completion time +0.03%. Each of the four representative encounter groups stays
within 4% for both metrics. All 160 runs finish successfully.

## Validation record

- 214 campaign checks; 85,616 boss encounter checks; 267 boss refinement checks.
- 17,005 matched Act IV boss compatibility samples.
- 400 layouts / 3,268,737 layout checks.
- Over 3.5 million enemy checks, including roughly 130,000 rush paths and
  121,000 blink destinations across 400 seeded maps.
- 216 navigation checks and 75,272 collision edge checks.
- 3,980 terrain-cache checks and 10,734 terrain-surface checks.
- 14,698 skill-perk checks and 1,991 unique-power checks.
- 5,373 current-gameplay audio/VFX checks over 963 skill/rank/perk scenarios.
- 153 Act 1 quest checks and 94,772 Act 1 navigation checks.
- 32,513 Act 3 shared-combat checks; 306 cathedral sprite checks.
- 33 browser journey checks plus enemy health/cooldown round trips for both
  parents. Optional caches unlock only after all five guardians die and pay once.
- 60 warning/release and mixed-encounter captures at 1080p and 4K, with sound
  dispatch checked against actual casting. Visual review confirms floor warnings
  remain legible over the painted cathedral materials.
- Three alternating performance pairs for each main zone and resolution pass
  the 10% budget for median and 95th-percentile CPU frame time. The largest
  median increase is 3.6%; the largest 95th-percentile increase is 7.4%. See
  `enemy_performance.json` for full measurements and warm-cache checks.

The older global `boss_animation_contract.mjs` absolute-coordinate comparison
still fails because its frozen pre-redesign Korvath arena is at a different
location. Its baseline was not changed. The focused Act IV comparison above
uses identical maps to verify actual boss mechanics. The frozen historical
skill-audio gameplay comparison also predates intentional shared player changes;
its existing `--current-gameplay` mode passes the current gameplay/VFX invariant.
The shared harness now loads the production `BossEncounters` geometry dependency
used by ordinary area attacks; no frozen comparison data was regenerated.
