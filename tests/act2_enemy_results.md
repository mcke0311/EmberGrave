# Act 2 enemy combat: validation results

The five zones use the approved local rosters, role placement, attacks, summon
caps and instance-local balance profiles. Existing assets and save formats are
retained. See [the implementation and playable review guide](../docs/ACT2_ENEMIES.md).

## Baseline and population

The separate `fixtures/act2_enemies_before.zip` snapshot contains 50 source
files and their SHA-256 records. It captures the working tree immediately before
the enemy pass, including the prior Act 2 layout implementation and existing
uncommitted work. Both comparison versions use the same deterministic data
initialization seed (7331). Map seeds include 0, 1, 123, 12345, 4294967295 and
25 multiplicatively spaced seeds.

`act2_enemy_budget.mjs` passes all five areas across 30 seeds each. It verifies
exact individual quotas, local IDs, safe arrivals, full body support including
elites, rear shooter placement, specialist limits and at least 15 ordinary
Hollow Reeds kills. Existing layout checks also cover connected routes,
objectives, exits and architectural reservations.

| Area | Regular count before → after | HP before → after | XP before → after |
| --- | ---: | ---: | ---: |
| Weeping Marsh | 137 → 137 | 20,754 → 20,767 | 20,918 → 20,945 |
| Flooded Crypts | 96 → 96 | 14,880 → 14,876 | 15,522 → 15,544 |
| Hollow Reeds | 96 → 96 | 15,237 → 15,998 | 15,212 → 15,186 |
| Spawn Pools | 99 → 99 | 17,300 → 17,309 | 17,452 → 17,443 |
| Choir's Ritual | 96 → 96 | 17,031 → 19,059 | 17,725 → 17,731 |

These are medians of individual-spawn totals, excluding bosses. HP differs by
at most 11.9%, XP by less than 0.2%, and population medians are unchanged.
Fixed damage multipliers include compensation for time spent casting and
recovering; theoretical attack damage per second alone understated that cost.
Raw data: [budgets.json](qa/act2_enemies/budgets.json).

## Matched combat

The simulation compares five classes × five zones × five seeds, before and
after: 250 ordinary fights and 250 durability diagnostics. Each six-enemy court
sample is drawn at evenly spaced positions from the full regular roster, with
a deterministic seed offset. Both versions use the same supported staging
pattern, ordinary level-matched equipment, legal skills, six healing and six
aether draughts, 50 ms simulation steps and 150 ms decisions. The driver uses
basic class skills, companions and visible warning avoidance. It does not model
expert projectile kiting, every possible build, or the authored pack's exact
formation. These are repeatable balance indicators, not human playtest results.

The durability diagnostic preserves ordinary defenses and records real incoming
hits, then restores player health so an early death cannot masquerade as a short
clear time. Companions still take damage and can die. It is not counted as an
ordinary victory test.

| Area | Duration before → after | Change | Incoming damage before → after | Change |
| --- | ---: | ---: | ---: | ---: |
| Weeping Marsh | 19.85 → 20.50 s | +3.3% | 881 → 956 | +8.5% |
| Flooded Crypts | 21.50 → 22.15 s | +3.0% | 1,031 → 1,013 | −1.8% |
| Hollow Reeds | 22.40 → 21.00 s | −6.3% | 824 → 779 | −5.5% |
| Spawn Pools | 24.55 → 25.85 s | +5.3% | 1,288 → 1,175 | −8.7% |
| Choir's Ritual | 25.50 → 21.85 s | −14.3% | 1,300 → 1,326 | +2.0% |

These zone medians meet the approximate 20% duration and incoming damage
targets. Two baseline Spawn Pools diagnostics reach the 150 s limit; the other
123 baseline and all 125 current diagnostics clear. Ordinary fights preserve
real deaths and consumables: 26/125 baseline wins and 23/125 current wins. That
low win rate reflects this deliberately limited six-enemy driver and warrants
subjective review with the playable controls; death times are not presented as
clear times. Per-class, per-seed outcomes, equipment and skills are retained in
[ordinary fights](qa/act2_enemies/playthrough.json) and
[durability diagnostics](qa/act2_enemies/playthrough_pressure.json).

## Skills and compatibility

The attack contract passes 257 checks covering every retained regular and miniboss identity against
players and companions: real attack release and damage, matching weapons,
unblocked cold slows and control resistance, fan count, released projectile
lifetime, control interruption, summon ownership and caps, ordinary kill
rewards, reward-free cleanup, sacrifice ownership, staggered Requiem marks with
shared hit tracking, corpse swelling and splitting, warning boundaries,
supported blink/dive/lunge finishes, dynamic collision and event groups.

All 15 shared regression suites pass: Act 2 layout and quests, navigation and
navigation edges, terrain surface and both terrain caches, frontier layout and
quests, town layout, story campaign, campaign bosses, gameplay input, player
death audio and boss music. The Act 2 quest contract covers both optional
quests, partial Vorthel saves, Ritual Heart progression, early Mire Mother
kills, shard recovery, death/re-entry, portals and shrine travel.

The five-class Mire Mother replay is exactly identical before and after this
pass, including duration, incoming damage, phases and remaining consumables.
Four classes clear. The existing Gravebinder driver times out at 480 s in both
versions with less than 0.5% boss HP remaining; this is retained as a baseline
limitation rather than counted as a pass. The campaign boss contract passes,
and an explicit check verifies that Mire Mother reinforcements receive no
Act 2 profile. [Before replay](qa/act2_enemies/mire_mother_before.json) ·
[Current replay](qa/act2_enemies/mire_mother_playthrough.json).

## Browser review and performance

The isolated review produced 62 ability captures across 1080p and 4K with no
browser errors. The warning contact sheet was inspected for readable shapes,
color and unobstructed combat space. The review provides single-enemy ability
previews and restored populated zones, plus the existing route overview and
before/after selector. [Contact sheet](qa/act2_enemies/ability_contact_sheet.jpg).

The final browser regressions pass 593,601 targeting checks, the moving terrain
cache pixel comparison, and 25 Act 2 cached-versus-direct terrain views. One
initial terrain run encountered Chrome `ERR_NO_BUFFER_SPACE` while loading an
existing sprite; the isolated rerun passed without errors, and the original
failure report is retained. The 144 checks for the 24 Act 2 environment sprites
pass. The global asset gate still reports existing alpha/coverage diagnostics;
this work adds none and does not add or replace enemy art.

Performance uses Chrome 152.0.7977.76 in headless mode on the Windows review
machine. Each workload has three alternating before/after pairs, 90 warmup
frames and 240 sampled frames. The full zone population remains loaded. Walking
samples verify actual movement; combat samples stage twelve durable enemies and
verify real attack exchange. The real 3D Vanguard and production terrain cache
are active. The Crypts pairs were repeated after the final dive collision check;
the original full run is retained separately.

| Area | 1080p walking p95 | 1080p combat p95 | 4K walking p95 | 4K combat p95 |
| --- | ---: | ---: | ---: | ---: |
| Weeping Marsh | 5.10 ms | 7.90 ms | 9.57 ms | 13.87 ms |
| Flooded Crypts | 5.90 ms | 7.90 ms | 6.60 ms | 10.57 ms |
| Hollow Reeds | 7.17 ms | 9.33 ms | 8.23 ms | 9.40 ms |
| Spawn Pools | 8.03 ms | 9.40 ms | 7.37 ms | 9.00 ms |
| Choir's Ritual | 8.50 ms | 8.60 ms | 6.57 ms | 8.37 ms |

Values are the mean of the three CPU p95 measurements, covering synchronous
simulation and rendering work. All 1080p workloads meet the 16.7 ms target, and
the 4K averages also remain below it. Warm stationary views produce no terrain
cache rebuilds. CPU time is distinct from GPU and display latency; frame
intervals and individual peaks remain in the raw reports.

Measured regressions are retained explicitly: 1080p combat increased by about
1.4–2.2 ms in the marsh, crypts, reeds and pools (18–32%), and Spawn Pools walking
increased by 1.8 ms (29%). The repeated 4K Crypts combat sample increased by
2.3 ms (27%). Other 4K workloads mostly improved or changed by less than 1 ms.
These comparisons use the complete captured working tree and current tree;
concurrent shared runtime changes and machine scheduling also affect them, so
they do not isolate the cost of the Act 2 controller alone. All changes remain
within the requested CPU budget. [Paired results](qa/act2_enemies/performance_all_both.json)
and [initial full run](qa/act2_enemies/performance_initial_all_both.json).
