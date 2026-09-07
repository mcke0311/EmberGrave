# Boss encounter validation

Verified September 7, 2026. Browser: Chrome 152.0.7977.76 on Windows.

## Combat and progression

All 30 deterministic ordinary-equipment simulations won with damage enabled and a fixed budget of six healing and six aether draughts. Each uses the boss's level, legal skill points, common equipment, real combat updates, and movement away from visible warnings. Summon builds begin with ordinary, unempowered companions. These are practiced automated runs, not estimates of first-time player difficulty.

| Boss | Vanguard | Emberwitch | Gravebinder | Wildkeeper | Veil Ranger | Median |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| korvath | 170.4s | 64.4s | 143.0s | 106.7s | 125.5s | 125.5s |
| mire_mother | 127.0s | 203.9s | 67.0s | 83.0s | 138.6s | 127.0s |
| azram | 173.5s | 90.1s | 112.9s | 76.5s | 128.2s | 112.9s |
| empty_archangel | 181.9s | 142.1s | 76.9s | 83.7s | 114.8s | 114.8s |
| malthoron | 168.9s | 187.5s | 128.9s | 106.7s | 121.1s | 128.9s |
| vethriss | 212.6s | 250.5s | 216.7s | 146.3s | 179.8s | 212.6s |

Build differences remain substantial; fire damage is especially effective against Korvath, while Mire Mother takes the Emberwitch longer. There are no hidden duration gates or class-specific boss health multipliers. Raw inputs, phase timing, damage and consumable use are in [playthrough.json](qa/bosses/playthrough.json).

## Passing checks

- 85,617 encounter assertions, including 192 generated arenas (32 seeds per boss), damage geometry, foot escape routes, phase cancellation, summon limits, finite portals, retreat/death/travel cleanup, duplicate reward prevention and three difficulty resets.
- 497,038 browser checks for all 96 poses and hit flashes, both horizontal facings, painted-pixel picking, transparent margins and zero canvas allocation during boss drawing.
- All 30 boss/class combinations rendered and executed their attack patterns in the production browser with reduced motion enabled. No missing resources or runtime errors in [browser_review.json](qa/bosses/browser_review.json).
- 242,561 general monster targeting checks, including every enemy definition, elite scale, overhead bars, overlap picking and first-click targeting.
- 214 campaign contract checks; 886 opening checks; 354 zone/boss music checks; 25 campaign browser checks; corrupt-sprite decode rejection.
- Authored source and packed hashes, manifest mappings, transparent padding, 96 poses and five separate armor parts pass `tools/import_boss_art.py --check`.

Visual captures for all 16 forms are in [qa/bosses/scenes](qa/bosses/scenes). Review corrected the boss/zone title overlap, phase text obscuring combat, portal sprite routing, dim boss silhouettes and clipped tall-form hit flashes.

## Performance

The comparison uses the production animation loop at 1920 × 1080 and
3840 × 2160, seed 12345, ordinary Gravebinder equipment, the current build's
summon cap and the boss's maximum allowed add count. Vethriss starts with its
sustained beam signature. Each mode has three six-second samples, alternating
order, after a 1.2-second warm-up. Trusted Shift key events use Chrome Event
Timing. The table averages each run's p95 CPU frame time.

The baseline runs the existing generic boss AI with the **same new arena, art,
equipment and initial entities**. It isolates controller/attack workload; it is
not a historical benchmark of the entire game before the overhaul.

| Boss | Resolution | Generic AI p95 | New p95 | Change | Max key presentation |
| --- | --- | ---: | ---: | ---: | ---: |
| korvath | 1080p | 6.50 ms | 5.97 ms | -8.21% | 67.3 ms |
| korvath | 4K | 20.83 ms | 18.27 ms | -12.32% | 106.4 ms |
| mire_mother | 1080p | 5.27 ms | 5.00 ms | -5.06% | 70.0 ms |
| mire_mother | 4K | 11.27 ms | 10.87 ms | -3.55% | 65.6 ms |
| azram | 1080p | 5.43 ms | 5.50 ms | +1.23% | 69.2 ms |
| azram | 4K | 12.50 ms | 13.00 ms | +4.00% | 61.2 ms |
| empty_archangel | 1080p | 4.70 ms | 4.63 ms | -1.42% | 69.9 ms |
| empty_archangel | 4K | 11.10 ms | 10.70 ms | -3.60% | 64.5 ms |
| malthoron | 1080p | 5.57 ms | 5.17 ms | -7.19% | 69.2 ms |
| malthoron | 4K | 12.13 ms | 11.33 ms | -6.59% | 64.8 ms |
| vethriss | 1080p | 6.60 ms | 6.20 ms | -6.06% | 68.5 ms |
| vethriss | 4K | 15.43 ms | 15.13 ms | -1.94% | 61.7 ms |

All twelve comparisons meet the 10% CPU-regression budget. Two of 1,428
recorded keyboard events exceeded 100 ms presentation delay, both in the
initial Korvath 4K series described below.

Korvath's initial 4K series contained two keyboard presentation delays of
100.3 and 106.4 ms. The corresponding enemy update costs were approximately
0.1 ms; the excess time was in rendering, including one 51.4 ms player-renderer
call. A separate three-run follow-up used a five-second warm-up and twelve-second
samples: maximum new-controller presentation delay was 72 ms, with no events
above 100 ms; average p95 CPU cost was 18.23 ms versus 20.77 ms for generic AI.
Both series are retained. These results do not guarantee a latency ceiling on
other machines or under different GPU load. The original short-series latency
gate remains flagged by the summary script because those two spikes occurred.

Raw results: [performance_summary.json](qa/bosses/performance_summary.json),
[per-run timing](qa/bosses/performance), and
[longer warm-up follow-up](qa/bosses/korvath_warmup_followup.json).

## Existing wider audit limitations

The all-project sprite validator is not clean: it also audits unfinished modular
player artwork, opaque ground images and older renderer source patterns. Its
partial-player mode still flags existing geometry/3D-renderer guard assumptions.
The new boss assets pass their dedicated strict hash, alpha, padding, manifest,
picking and browser checks. The shared validator's isolation allowlist and the
manifest coverage count were updated for the added boss atlases.
