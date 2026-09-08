# Act V enemy attack corrections — recorded results

Implemented all 50 shared enemy profiles, weapon-first attacks, target-correct specials, chill, lifesteal, allied healing, summon ownership/caps, interruption/map guards, and matching damage warnings. Base HP, damage, armor, XP, speed, pack sizes, factions, artwork, layouts, save fields and Vethriss’s encounter are preserved.

[Open the playable enemy review](http://127.0.0.1:8875/tests/cinders_review.html?enemies&enemy=r46_brute). Run `python tests/cinders_server.py` first. The page uses temporary saves and offers area/seed/version/enemy selection, native packs, landmark views, route overviews, ability labels and cooldowns.

## Validation

- PASS: 966 combat assertions, all 50 intended profiles and unchanged base-stat/art contracts. Both baseline bugs reproduce and are fixed: rival heal 10→50 HP, and a charge passing through its selected pet without a hit.
- PASS: all three Act 5 layouts across 30 seeds; 81,366 route, arrival, encounter, exit, reward, footprint, landmark-order and arena assertions.
- PASS: 241 Act 5 progression assertions; browser clicks through all six directed connections; real save/load retains shrines, q18 and boss death; all three Vethriss forms can be defeated and q18 reaches reward.
- PASS: navigation, terrain, opening, campaign, boss, Act 2 combat, Cathedral combat and sprite suites. The full commands and raw outputs are in [regressions.json](qa/cinders_enemies/regressions.json).
- PASS: 40 matched enemy screenshots at 1920×1080 and 3840×2160. Visual review covered elemental contact, ranged shadow volleys, slams, charge corridors, pounces, axe whirlwinds, death bursts and native hound packs. Additional boss-warning and occlusion captures were refreshed.

All regression suites pass. An Act 3 quarry-role check failed during concurrent workspace editing and was independently reproducible with Act 5 profiles removed. After the Act 3 workspace update, its 33,074 checks pass. The earlier diagnostic and failed attempt remain recorded for traceability.

## Matched encounter difficulty

600 encounters per version: 50 IDs × three seeds × Vanguard/Emberwitch × single/native midpoint pack. The default pack of two to four is used when an enemy has no explicit pack setting. Catalog randomness is seeded before roster construction. Heroes use identical level-24 ordinary equipment, legal skills, real movement/attacks, resistance, potions and damage handling.

| Pooled median | Before | After | Change |
|---|---:|---:|---:|
| Encounter duration (seconds) | 5.500 | 5.975 | +8.6% |
| Incoming damage | 441.835 | 391.775 | -11.3% |

Both pooled medians meet the ±15% target without base-stat or ability-multiplier tuning. The deterministic driver attacks through warnings and includes deaths and timeouts. Wins were 371/600 before and 379/600 after; deaths were 226 and 221. These are controlled comparisons, not a claim that every build or matchup changes by less than 15%. For example, Vanguard single-enemy medians fall from 6.75 to 5.45 seconds and 228.84 to 168.63 incoming damage. All cohort and individual outcomes are retained in [balance.json](qa/cinders_enemies/balance.json).

## CPU frame time

All 12 final comparisons meet the maximum 10% regression target for median and p95 CPU update/render submission. Three alternating pairs per area/workload/resolution, 90 warmup frames and 240 samples each: 17,280 measured frames. The real 3D hero, current actor artwork and full area roster remain present. Movement and attacks in both directions are asserted; warmed terrain caches remain stable.

| Area | Resolution | Workload | Before median / p95 ms | After median / p95 ms | Median change | p95 change |
|---|---|---|---:|---:|---:|---:|
| ash_wastes | 1920 | moving | 4.93 / 7.10 | 5.03 / 7.43 | +2.0% | +4.7% |
| ash_wastes | 1920 | combat | 6.63 / 9.00 | 6.97 / 9.83 | +5.0% | +9.3% |
| ash_wastes | 3840 | moving | 6.67 / 9.33 | 7.17 / 9.87 | +7.5% | +5.7% |
| ash_wastes | 3840 | combat | 9.20 / 11.57 | 8.17 / 10.27 | -11.2% | -11.2% |
| cinder_bastion | 1920 | moving | 6.93 / 9.70 | 6.90 / 9.97 | -0.5% | +2.7% |
| cinder_bastion | 1920 | combat | 7.97 / 11.50 | 7.60 / 11.00 | -4.6% | -4.3% |
| cinder_bastion | 3840 | moving | 9.67 / 13.83 | 9.20 / 12.47 | -4.8% | -9.9% |
| cinder_bastion | 3840 | combat | 11.00 / 15.50 | 9.77 / 12.33 | -11.2% | -20.4% |
| throne | 1920 | moving | 5.37 / 7.40 | 5.13 / 7.43 | -4.3% | +0.5% |
| throne | 1920 | combat | 6.87 / 9.10 | 5.57 / 7.17 | -18.9% | -21.2% |
| throne | 3840 | moving | 5.20 / 7.00 | 5.10 / 6.60 | -1.9% | -5.7% |
| throne | 3840 | combat | 6.20 / 7.83 | 6.03 / 7.70 | -2.7% | -1.7% |

The initial CPU regression exposed distant packs waking from rival proximity. Restoring hero-based awareness and caching projected warning vertices resolved it; the exploratory reports are retained. Timing measures CPU submission, not completed GPU work, and reflects this Windows/Chrome host. Other tasks continued changing the shared workspace, so whole-workspace timing differences cannot be attributed solely to one edit.

## Artifacts

- [CSV roster](qa/cinders_enemies/roster.csv) and [full profile/ability audit](qa/cinders_enemies/combat_contract.json).
- [Screenshot manifest and SHA-256 values](qa/cinders_enemies/capture_audit.json).
- [Summary, comparisons and source hashes](qa/cinders_enemies/summary.json).
- [Fresh baseline provenance](qa/cinders_enemies/baseline.json): separate from the previous level-design baseline.
- [Implementation notes and reproduction commands](../docs/CINDERS_ENEMIES.md). No new sprites were commissioned; existing authored art and provenance remain intact.
