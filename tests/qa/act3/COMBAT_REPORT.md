# Act III enemy combat verification

The eleven regular enemies now use the curated Act III pools and their intended combat roles. The runtime checks pass for actual hero and companion damage, elemental attacks, frontal guards, warning/recovery timing, charge collisions, blink destinations, leap landings, interruption, death, and map replacement. Both bosses retain their moves and progression.

## Contracts

| Check | Result |
| --- | ---: |
| Act III combat, including 30-seed roster and placement audit | 33,074 passed |
| Seven-area deterministic layout and reachability, 30 seeds | 113,873 passed |
| Act III navigation, 30 seeds and seven live golem routes | 122,093 passed |
| Partial/completed quests, regeneration, travel and progression | 51 passed |
| Campaign | 214 passed |
| Boss encounters / refinement | 85,616 / 267 passed |
| Shared navigation | 216 passed |
| Terrain surface / cached rendering | 10,734 / 3,980 passed |
| Town layout | 54,280 passed |
| Act I layout / quests | 118,293 / 153 passed |
| Enemy art | 842 passed |
| Skill perks / gameplay improvements | 14,698 / 763 passed |
| Weapon projectile origins | 15,368 passed |

The final 30-seed population ranges are Wastes 109–135, Market 47–57, Tombs 103–127, Palace 33–46, Shard Flats 59–74, and Sovereign's Tomb 107–126. Camp remains empty. Every generated enemy has a supported, non-overlapping footprint. Courts with four or more groups contain multiple roles. All selected identities appear across the seeds; random events stay in the local pool. The six relay guards, clear arrivals, story anchors and boss spaces remain intact. Shard Flats comfortably supports fifteen eligible kills.

Guard tests cover front/rear attacks, attack and stun exclusions, one roll per weapon packet, blocked successful-hit effects, and spell/ground bypass. Special timing is exercised at 20, 60 and 120 updates per second. Fan projectiles carry their exact visible lane as a collision constraint, including the hero and companion boundary tests. A gargoyle cancels takeoff if another monster occupies its landing footprint.

Raw results are in `combat_contract.json`, `navigation.json`, `quests.json`, and `combat_regressions.json`. The earlier level-design `REPORT.md`, `layout.json`, and `regressions.json` remain historical records of that pass.

## Gameplay presentation

The isolated production review passed with 88 actual basic/special warning and release captures at 1920×1080 and 3840×2160 and no browser errors. The gallery includes all eleven regular enemies and the Sovereign's existing slam. `combat_browser.json` records asset identity, attack phase, live projectiles, canvas dimensions and browser errors. The review also runs ordinary mixed encounters in all six adventure areas; all six exercised warnings and projectiles. Projectile visual height includes the caster's source elevation, keeping shots at hand/body height on raised floors. Per-zone timings from the final smoke run are recorded in that JSON.

Representative captures:

- [Gilded Construct pulse warning](combat_1920_gilt_construct_special_warning.webp)
- [Shard Construct fan release at 4K](combat_3840_shard_construct_special_release.webp)
- [Chained Soul hand cast](combat_1920_soul_chained_basic_release.webp)
- [Sovereign slam warning](combat_1920_chained_sovereign_special_warning.webp)

The review provides individual enemies, forced signature previews, ranges/cooldowns, zone/seed selection and mixed encounters. It uses temporary heroes and in-memory saves. Source art is reused; no new asset family or save migration is introduced by this combat pass. Existing global sprite-validator failures remain recorded separately in the level-design QA; enemy-art checks pass.

## Performance investigation

The 24-case before/after sweep met the 10% threshold in 20 cases. Its four flagged workloads were repeated with one browser animation frame between samples to avoid submitting batches of renders faster than presentation. All four met the threshold on this follow-up, including p95. The raw sweep retains `INVESTIGATE`; it has not been rewritten as an all-pass result.

| Follow-up workload | Before median | After median | Change | After p95 |
| --- | ---: | ---: | ---: | ---: |
| Wastes movement, 1080p | 8.10 ms | 6.50 ms | −19.8% | 9.30 ms |
| Palace combat, 1080p | 6.15 ms | 6.15 ms | 0.0% | 8.45 ms |
| Tombs combat, 4K | 10.75 ms | 10.65 ms | −0.9% | 14.25 ms |
| Palace combat, 4K | 7.80 ms | 7.05 ms | −9.6% | 9.05 ms |

Update medians in these follow-ups differ by 0–0.10 ms; rendering explains most variation. Earlier repeated flags in the Market, Flats and Sanctum also cleared after spreading spawn footprints and rotating roles within courts. Measurements varied appreciably between runs, so these results establish that the flagged regression did not reproduce under frame pacing, rather than proving a universal speedup.

Method: headless Chrome, actual generated rosters, verified character movement and active attacks, two alternating before/after pairs, 90 warmup and 240 measured update/render samples. `combat_performance.json` holds the full sweep; `combat_performance_paced.json` holds the four-case investigation. The final role-availability correction is covered by the paced run; the final fan-boundary and occupied-landing checks were added afterward and are covered by the gameplay capture run. These are local CPU submission timings, not GPU-present latency or a hardware-wide frame-rate guarantee. The frozen pre-pass runtime also predates concurrent shared-engine changes, so differences cannot all be attributed to this pass.

Baseline: `tests/fixtures/act3_combat_before.zip`, SHA-256 `c8e4e96e293cf27f53085e95b46cbb9708dbad967e8d4a5cd9f16ce6f3f97ff3`. Restore it with `python tests/act3_combat_baseline.py`. The earlier browser capture attempt with a transient Chrome `ERR_NO_BUFFER_SPACE` is retained in `combat_browser_network_retry.json`; the successful retry and final capture results are recorded separately.

See [the implementation notes](../../../docs/ACT3_ENEMY_COMBAT.md) for the resolver, controller and review commands.
