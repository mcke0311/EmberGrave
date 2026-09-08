# Act 2 redesign: validation results

The five authored areas, 24 ImageGen assets, quest compatibility and isolated
comparison review are implemented. The final regression run passes all 15 suites.
The Act 2 sprite checks pass with no additional global asset diagnostics.

## Layout and progression

`act2_layout_contract.mjs` passes 2,073,777 checks over 30 deterministic seeds
for each of the five areas. It checks existing map dimensions and travel links,
return-spawn keys, reachable landmarks/objectives/enemies/exits, clear route
centers, solid architecture footprints, non-damaging scenic water, safe arrivals,
reserved boss floors, exploration loops, deterministic variation, a single Brood
Mother and at least 15 available Hollow Reeds kills.

Median comparisons use the captured working tree immediately before this work,
including its uncommitted Act 1 and item changes. Route length is measured as the
furthest reachable tile's shortest path from arrival; it is a pacing indicator,
not a measurement of a player's total completion time.

| Area | Route distance, before → after | Enemies, before → after |
| --- | ---: | ---: |
| Weeping Marsh | 239 → 209 (−12.6%) | 132 → 137 (+3.8%) |
| Flooded Crypts | 210 → 207 (−1.4%) | 95 → 96 (+1.1%) |
| Hollow Reeds | 212 → 183 (−13.7%) | 92 → 97 (+5.4%) |
| Spawn Pools | 198 → 184 (−7.1%) | 93 → 100 (+7.5%) |
| Choir's Ritual | 210 → 206 (−1.9%) | 91 → 97 (+6.6%) |

All medians are within the requested approximate 20% tolerance. The browser
review traversed all 38 authored route edges in both directions using the real
player movement code: 76 successful walks. Enemy AI was held stationary for
that traversal check. The separate populated combat profiles verify real attack
exchange. The review remains playable for subjective pacing assessment.

`act2_quest_contract.mjs` passes 103 checks: Oris's interviews, Ritual Heart and
Vorthel, duplicate Heart deaths, both optional quests, legacy/partial Vorthel
saves, the Mire Mother, early boss kills, shard recovery, Act 3 unlock, actual
death/revive, all exit destinations, portal round trips and shrine travel.

## Art and visual review

The library has eight paired threshold sprites, eight landmarks and eight
supporting props/materials. The original images, prompts, reference/source
hashes, crop bounds, uniform scale and anchors are retained. Props and decals
have real alpha; the black-water material is deliberately opaque.

The importer contact sheet and rendered entrance pairs were inspected. The
final review saved 164 matched before/after captures covering both resolutions,
arrivals and every landmark with art or an exit. Large tower and root-crown
silhouettes are complete in the artwork; normal viewport cropping occurs when
standing close to tall structures. Combat floors and doorway approaches remain
clear, and scenic water boundaries correspond to blocked terrain.

The final browser batch has no page or resource errors. Terrain pixel checks
compare the cached production floor against direct rendering: maximum error
1/255, with no interior coverage holes. The global floor-opacity check passes
36 levels and 36,230,400 pixel samples. Minimap, bounded sprite loading and
fail-hard sprite decoding checks also pass.

## CPU measurements

Chrome 152.0.7977.76, headless, on the existing review machine. Each workload uses
three alternating before/after pairs, 90 warmup frames and 240 measured frames
per run. The complete enemy roster stays loaded; walking moves the player along
a supported corridor, while combat stages twelve durable targets and verifies
player/enemy attacks. The production 3D Vanguard and cached terrain renderer are
used. The table reports the mean of the three runs' CPU p95 values in milliseconds.

| Area / workload | 1080p before → after | 4K before → after |
| --- | ---: | ---: |
| Marsh walking | 9.30 → 8.47 | 10.93 → 11.23 |
| Marsh combat | 9.60 → 10.50 | 15.13 → 14.90 |
| Crypts walking | 9.77 → 5.30 | 41.70 → 10.23 |
| Crypts combat | 12.80 → 7.90 | 59.70 → 11.40 |
| Reeds walking | 9.23 → 6.37 | 36.43 → 11.07 |
| Reeds combat | 11.17 → 7.53 | 54.33 → 13.40 |
| Pools walking | 10.60 → 7.30 | 44.03 → 11.17 |
| Pools combat | 11.40 → 8.07 | 52.70 → 15.67 |
| Ritual walking | 11.73 → 7.00 | 34.43 → 13.87 |
| Ritual combat | 11.30 → 9.87 | 45.87 → 15.87 |

Every 1080p workload meets the 16.7 ms CPU p95 target. The small regressions are
Marsh combat at 1080p (+0.90 ms) and Marsh walking at 4K (+0.30 ms). No workload
breaches the comparison threshold. Individual redesigned runs range from
4.8–11.5 ms p95 at 1080p and 8.6–18.5 ms at 4K; warm stationary terrain caches
remain stable. These measurements cover synchronous CPU update/render work,
not GPU completion or a guarantee of displayed 60 fps. Other shared-workspace
activity and headless rendering can affect timings.

## Regressions and remaining global gate

All 15 suites in `qa/act2_redesign/regressions.json` pass: Act 2 layout and quests,
navigation and edge navigation, terrain surfaces and both terrain caches,
frontier layout and quests, town layout, campaign, boss encounters, gameplay
input, death audio and zone boss music.

The 24-asset sprite contract passes 144 checks. The repository-wide sprite
validator still exits 1 for unrelated current-tree diagnostics, including opaque
materials from other libraries, historical coverage counts and retired player
rig expectations. The contract runs that validator on the same current tree
with and without Act 2 registrations and proves this library adds no diagnostics.
The complete diagnostics are retained beside the report; they were not suppressed.

## Reproduce and inspect

Run `python tests/act2_baseline.py`, then `python tests/act2_server.py` and open
`http://127.0.0.1:8746/tests/act2_review.html`. The review uses temporary heroes
and in-memory saves, with area, seed, landmark, route overview and 1080p/4K controls.
`python tests/act2_regressions.py` runs the non-browser suites. Sprite validation
requires Pillow; the art importer additionally requires NumPy.

The Playwright runner accepts `act2_review.html?walkAll`,
`act2_review.html?captureAll`, and
`act2_review.html?profile&all&bothWidths` as targets. Add `&resume` to reuse saved
profile samples with matching method revisions. Use Node's
`--preserve-symlinks --preserve-symlinks-main` flags in this Windows sandbox.

Raw measurements, layout metrics, quest results, captures and console reports
are in [qa/act2_redesign](qa/act2_redesign/). The
[entrance/landmark contact sheet](qa/act2_redesign/entrances_and_landmarks.jpg)
and [artwork contact sheet](qa/act2_redesign/art_contact_sheet.jpg) provide quick
visual references. The archived comparison source is
[fixtures/act2_before.zip](fixtures/act2_before.zip).
