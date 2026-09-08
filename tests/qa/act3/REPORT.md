# Act III verification

Seven areas across 30 deterministic seeds: **113,764 layout checks**, **122,004 navigation checks**, and **51 quest/travel checks** passed. All 27 assets passed 162 provenance, dimensions, alpha, anchor and manifest checks.

Campaign, boss encounters, terrain, town, navigation and Act I regressions passed; individual counts are in `regressions.json`. The boss encounter suite passed 85,616 checks.

The review captured 192 matched before/after views at 1920×1080 and 3840×2160. The before snapshot preserves the working tree at the start of this task. Sources and image-generation prompts are retained in the repository.

## Performance

Twenty-four of 26 movement/combat/resolution comparisons meet the 10% regression threshold. All 1080p workloads meet it. The two exceptions are the Shifting Wastes at 4K, investigated below; the raw benchmark deliberately retains its FAIL status for those threshold exceedances.

| Area | Mode | Canvas | Before median | After median | Change | After p95 |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| desert_wastes | moving | 1080p | 5.20 ms | 4.05 ms | -22.1% | 4.90 ms |
| desert_wastes | combat | 1080p | 5.55 ms | 5.25 ms | -5.4% | 6.35 ms |
| underground_market | moving | 1080p | 6.30 ms | 3.60 ms | -42.9% | 4.60 ms |
| underground_market | combat | 1080p | 7.95 ms | 4.30 ms | -45.9% | 5.45 ms |
| sand_tombs | moving | 1080p | 8.85 ms | 3.75 ms | -57.6% | 4.80 ms |
| sand_tombs | combat | 1080p | 7.85 ms | 4.15 ms | -47.1% | 5.25 ms |
| khal_palace | moving | 1080p | 6.05 ms | 3.20 ms | -47.1% | 4.10 ms |
| khal_palace | combat | 1080p | 7.55 ms | 3.85 ms | -49.0% | 5.10 ms |
| shard_flats | moving | 1080p | 4.70 ms | 3.50 ms | -25.5% | 4.55 ms |
| shard_flats | combat | 1080p | 5.70 ms | 4.05 ms | -28.9% | 5.20 ms |
| tomb_sanctum | moving | 1080p | 9.50 ms | 4.10 ms | -56.8% | 5.65 ms |
| tomb_sanctum | combat | 1080p | 9.65 ms | 5.65 ms | -41.5% | 6.80 ms |
| khalcamp | moving | 1080p | 2.15 ms | 2.10 ms | -2.3% | 2.95 ms |
| desert_wastes | moving | 4K | 5.55 ms | 6.15 ms | +10.8% | 8.85 ms |
| desert_wastes | combat | 4K | 6.60 ms | 7.50 ms | +13.6% | 9.85 ms |
| underground_market | moving | 4K | 21.55 ms | 5.95 ms | -72.4% | 7.70 ms |
| underground_market | combat | 4K | 25.95 ms | 6.95 ms | -73.2% | 9.00 ms |
| sand_tombs | moving | 4K | 28.60 ms | 6.15 ms | -78.5% | 8.05 ms |
| sand_tombs | combat | 4K | 27.35 ms | 7.10 ms | -74.0% | 9.00 ms |
| khal_palace | moving | 4K | 20.30 ms | 5.25 ms | -74.1% | 6.65 ms |
| khal_palace | combat | 4K | 22.95 ms | 5.30 ms | -76.9% | 6.95 ms |
| shard_flats | moving | 4K | 9.75 ms | 5.30 ms | -45.6% | 6.75 ms |
| shard_flats | combat | 4K | 20.80 ms | 5.75 ms | -72.4% | 7.65 ms |
| tomb_sanctum | moving | 4K | 24.60 ms | 6.05 ms | -75.4% | 7.85 ms |
| tomb_sanctum | combat | 4K | 22.80 ms | 7.35 ms | -67.8% | 9.55 ms |
| khalcamp | moving | 4K | 2.70 ms | 2.55 ms | -5.6% | 3.55 ms |

The repeatable 4K wastes differences are +0.60 ms while moving and +0.90 ms in combat. Component timings localize the increase to rendering (+0.60/+1.05 ms), while simulation remains equal or faster. The redesigned scenes perform no terrain rebuilds in these measured samples; warmed static caches remain stable. The highest averaged p95 in these two cases is 9.85 ms, below a 16.67 ms frame budget. Added visible scenery is a plausible contributor, but individual rendering stages were not separately isolated. This is a recorded remaining tradeoff, not a claim that every performance comparison passed. See `performance_investigation.json` and the raw per-pair samples.

Both versions use the same current engine and sprite manifest for timing. Only their map generator differs. There are two alternating pairs, 90 warmup frames and 240 sampled frames per workload, a real 3D Vanguard, the full enemy roster and verified exchanged attacks. The camp has a movement workload only.

## Validator baseline

The shared global sprite validator still reports existing retired-rig/frozen-coverage problems and unrelated concurrent work. `sprites.json` records no new Act III diagnostics. Its before/current diagnostics are retained separately rather than suppressing the global failures.

## Scope and limitations

The travel graph, story IDs, save progression, boss attacks, enemy statistics and loot rules remain unchanged by this redesign. Larger bodies are reserved when placing encounters. All five route lanes, ramp lanes, entrances, objectives, optional rewards, story guards and boss combat footprints are checked. Seven live golem routes run without the companion teleport fallback. Large companion and encounter path searches additionally cover three seeds; skeletal paths, broad authored lanes, every enemy footprint and flat-navigation equivalence cover all 30.

This is a local implementation. No deployment or save migration was performed.
