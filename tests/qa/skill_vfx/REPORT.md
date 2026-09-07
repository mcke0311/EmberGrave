# Skill VFX validation — 6 September 2026

All **91 active skills and 16 passives** have explicit presentation assignments.
The live review completed all 107 skills without runtime errors. Five class
contact sheets were visually inspected, along with the representative motion
sequences and a dark crypt preview. Heroes use their real starter equipment.

The current game supports 3D players and sprite companions. All four Wildkeeper
forms were exercised; the removed legacy sprite-player renderer was not restored.
Facing-relative fallback effects are exercised in the isolated drawing contract.

## Combat and rendering checks

| Check | Result |
| --- | --- |
| VFX contract | 6,348 checks passed; 963 skill/rank/perk scenarios |
| Original combat snapshots | All 963 matched the frozen original |
| Effects enabled versus disabled | Identical tested combat state and gameplay RNG consumption |
| Long-running actors | Twelve 12-second scenarios matched original and disabled effects |
| Skill perks | 14,698 checks, including 819 combat casts and save round trips |
| Animation release timing | 105 checks |
| Projectile origins | 15,368 checks; maximum projection error approximately 1.02e-13 pixels |
| Character animation | 55,188 checks |
| Wildshape transitions | 2,045 checks |
| Wildkeeper forms | 2,076 checks |
| Terrain renderer | 34,562 checks; 1,860 occluded and 7,580 visible actor pixels verified |

The VFX tests cover accepted and rejected casts, delayed hits, charged shots,
channels, cancellation, traps, companions, affliction propagation, detonations,
buff duration, respec, map cleanup, particle limits and drawing purity. The
long-running scenarios use live monsters and companions. Cosmetic areas leave
props intact; the existing gameplay nova still destroys them. No gameplay
balance, sound, character art, icon, talent UI or save-format changes were made.

## Performance

Measured serially in the Codex in-app browser on the same Windows machine
(AMD64 Family 25, Model 33). These are synchronous update/render CPU submission
times, not GPU completion times. Raw reports also include frame intervals and
maximum samples. Background/browser scheduling still causes normal variation.

The paired spell fixture uses identical seeded randomness, rank-10 Fan of
Cinders, Inferno, Glacier and Chain Lightning, with 420 frames per phase and
359 recorded samples after warmup. It retains real cast durations and cooldowns.

| Spell spam | Effects off median / p95 | Effects on median / p95 | Added p95 |
| --- | ---: | ---: | ---: |
| 1920 × 1080 | 7.3 / 14.2 ms | 8.7 / 16.9 ms | **2.7 ms** |
| 3840 × 2160 | 22.0 / 42.2 ms | 22.4 / 48.7 ms | **6.5 ms** |

The requested **≤3 ms additional p95 at 1080p** was met in this paired run.
Peak decorative load was 200 particles and 25 events, without dropped effects.
Earlier 1080p iterations added 7.9 ms and 5.5 ms; removing per-frame WebGL canvas
copies and sharing release-pose samples brought the measured overhead down.

The existing seed-12345 map fixture was also run with frozen original code and
the current implementation. Values below include active enemies and its existing
instrumentation. Rendering-only rows are retained in the raw JSON.

| Map workload | Original 1080p p95 | New 1080p p95 | Original 4K p95 | New 4K p95 |
| --- | ---: | ---: | ---: | ---: |
| Entry | 6.1 ms | 6.3 ms | 10.8 ms | 10.2 ms |
| Center | 8.1 ms | 7.7 ms | 21.7 ms | 19.6 ms |
| Moving | 13.3 ms | 15.6 ms | 28.2 ms | 30.1 ms |
| Combat | 9.9 ms | 9.7 ms | 22.1 ms | 33.4 ms |

The 1080p map comparisons added at most 2.3 ms at p95. **4K remains substantially
more expensive**, including an 11.3 ms increase in the map-combat sample. The
map fixture contains live pathfinding and records slow paths in its JSON; its
before/after runs are separate sessions rather than deterministic paired actor
replays. The results do not establish a 60 fps guarantee at 4K.

Raw data: [1080p spells](benchmark_1080p.json), [4K spells](benchmark_4k.json),
[original map](map_before.json), [updated map](map_after.json),
[original 4K map](map_before_4k.json), [updated 4K map](map_after_4k.json).

## Visual evidence

Each class sheet includes all its skills plus four frames of a representative
sequence at 0.18, 0.40, 0.68 and 1.12 seconds. Short projectile and impact effects
are best inspected with quarter-speed replay in the atelier; a contact sheet
captures only one point in each skill's animation.

| Class | Before | After | Sequence |
| --- | --- | --- | --- |
| Vanguard | [Original](before_vanguard.png) | [Updated](after_vanguard.png) | Sunder Combo |
| Ember Witch | [Original](before_emberwitch.png) | [Updated](after_emberwitch.png) | Meteor |
| Gravebinder | [Original](before_gravebinder.png) | [Updated](after_gravebinder.png) | Bone Golem |
| Veil Ranger | [Original](before_veilranger.png) | [Updated](after_veilranger.png) | Arrowfall |
| Wildkeeper | [Original](before_wildkeeper.png) | [Updated](after_wildkeeper.png) | Cyclone |

[Live review and replay](../../skill_vfx_review.html) ·
[Coverage records](coverage.json) · [Original records](before_coverage.json) ·
[Implementation and reproduction guide](../../../docs/SKILL_VFX.md)
