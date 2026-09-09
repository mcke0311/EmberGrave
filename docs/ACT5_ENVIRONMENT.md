# Act V: painted boundaries and connected passages

The Breach, Cinderfields, Cinder Bastion and Throne of Cinders now use a dedicated
painted environment system. Natural ash slopes and basalt outcrops replace the
old raised boundary slab outdoors. The Breach keeps short defenses beside its
departure gate; its wider perimeter blends into ash and rock. The Bastion uses
heavy fortress masonry, and the Throne uses recessed ceremonial panels.

All six travel endpoints have complete open arches, connected side piers,
approach paving and a visible continuation through the opening. Exit clicks,
labels, collision, approach points and safe return spawns share the threshold
record. The existing zone IDs, travel graph, route network, services, encounter
budgets and exact seeded enemy placements, shrines, quests, endings and the
reserved boss arena are retained. Local
entrance pockets are reshaped; existing saves need no format migration.

## Artwork and rebuilding

Built-in ImageGen produced the four coordinated kit sheets and a revised natural
terrain sheet. Original images, exact prompts, source hashes and reviewed crop /
socket registration are in
`assets/sprites_src/gameplay_art_authored/act5_environment/`.
The first natural kit is retained as an iteration record; its narrow ridges were
replaced because they read as fences in gameplay.

Sixty registered module keys cover straight variants, ends, broken sections,
corners, posts, open arches and ground blends. Registration accounts for the
actual directions and irregular cell boundaries in the generated sheets. A few
keys intentionally share a complete source module: incomplete or wrongly facing
variants are never stretched or used as substitutes for a correct direction.

`python tools/import_act5_environment.py` imports the checked-in registration,
preserves native transparency, crops and scales uniformly, and writes canonical
PNGs, lossless packed WebPs, descriptors, data registrations and coverage.
It re-reads shared registries before merging only Act V keys, to preserve other
ongoing imports. The regular sprite compiler consumes these canonical sources.
`tools/register_act5_environment.py` documents the initial measured registration;
normal rebuilds use the saved registration directly.

## Runtime

`map.act5Environment` records materials, fixed-scale boundary runs, turns,
ground blends and peripheral formations. Genuine terraces and ramps retain their
elevation; only blocked cells' artificial boundary height is removed. Indoor
solid mass receives a soft cached shadow so it reads separately from the floor.
World-anchored material continues beyond map extents: ash outdoors and shaded
substructure indoors. The old screen-space lava vista no longer makes the
locations appear to float. Outdoor destination gates have short matching returns.

`CindersBoundaries` composites low slopes and ground blends into the existing
terrain caches. Tall formations and walls share the actor depth list. Static
wall groups are split wherever their painted horizontal bounds are disjoint.
They are cached only when no scene drawable needs to interleave with them
and no member needs hero fading. Otherwise their original individual depth order
is used. Consecutive opaque walls between actors can share a second cached
image; fading walls remain separate. The caches are bounded at 12 million and
24 million pixels respectively, retaining the current
frame's working set. Indoor background material uses a separate camera cache;
its pixels match direct rendering exactly in sixteen pan/resize comparisons.
Replacing environment metadata invalidates cached ground.

The existing `map.thresholds` interface is reused with `act: 5`, opening axis,
approach, arrival, side footprints and connection points. Act V opening hit
geometry follows terrain elevation. `MapGen.generate` and save APIs are unchanged.

## Review and validation

Start `python tests/act5_environment_server.py`, then open
[the playable comparison](http://127.0.0.1:8879/tests/act5_environment_review.html).
It offers before/after views, all four locations, seeds, 1080p/4K captures and
temporary invulnerable play using in-memory saves. The fresh baseline is
`tests/fixtures/act5_environment_before.zip`; older Cinders baselines are untouched.

Repeat the checks:

```text
python tests/act5_environment_sprites.py
node tests/act5_environment_contract.mjs
node tests/cinders_layout_contract.mjs
node tests/cinders_gameplay_contract.mjs
node tests/terrain_view_cache_contract.mjs
node tests/terrain_surface_contract.mjs
node tests/navigation_edge_contract.mjs
node tests/act5_environment_pixels.cjs
node tests/act5_environment_transitions.cjs
node tests/act5_environment_browser.cjs smoke
node tests/act5_environment_browser.cjs capture
node tests/act5_environment_browser.cjs profile hellgate --steady
node tests/act5_environment_browser.cjs profile ash_wastes --steady
node tests/act5_environment_browser.cjs profile cinder_bastion --steady --pairs=6
node tests/act5_environment_browser.cjs profile throne --steady
```

Browser runners require Playwright and Chrome. On this restricted Windows host,
Node also needs `--preserve-symlinks --preserve-symlinks-main`, and `NODE_PATH` can
point to the bundled runtime's `node_modules` directory.

Results and screenshots are in `tests/qa/act5_environment/`. Performance uses three
alternating before/after pairs (six for the final Bastion series) and 240 measured frames per
movement/combat workload at both resolutions. The initial series warms 90
frames; the separate steady-state series warms 600 frames. Both use production actors and the
full roster. Movement lanes and combat pockets must be supported by both maps;
the Breach is measured for movement only. Measurements cover CPU update/render submission, not completed GPU
work. The baseline is the working tree at the start of this task, so concurrent
changes in shared code may also affect whole-workspace comparisons.

## Reviewed captures

[Open the comparison gallery](../tests/qa/act5_environment/gallery.html) for
selected before/after scenes and all six openings. Eighty matched gameplay
captures cover the four areas at 1080p and 4K; twenty-four additional endpoint
views cover arrivals and foreground occlusion. Reviews included long runs,
turns, both ramp bands, services, the arena and every destination aperture.

The art was iterated to replace fence-like natural ridges with broad slopes,
remove incomplete gate crops, close masonry joints, clear walkable apertures,
and eliminate visible map-edge slab rims and floating departure paving.

## Validation results

- Act V layout: 1,423,685 assertions across 30 seeds, four areas and 180 endpoints.
- Existing Cinders layout: 82,566 assertions, including route clearance and the
  exact flat 21×21 boss arena.
- Gameplay: 241 travel, shrine, portal, revival, saved progression and ending checks.
- Navigation and terrain: 75,272 navigation checks, 10,728 terrain checks and
  3,991 cache checks.
- Artwork: 540 checks over 60 registered module keys.
- Rendering: 28 wall-cache comparisons and 16 exact indoor-background comparisons.
- Browser: all six connections clicked successfully; no missing resources or
  uncaught errors in that run. Save/load retains boss, quest and shrine progress.

The full shared sprite validator also ran. It currently fails on artwork outside
this kit, including unfinished Act IV provenance and opaque material alpha
checks. Its output is retained in
`tests/qa/act5_environment/shared_sprite_validation_final.txt` (the earlier run is
also retained); these unrelated
concurrent assets were not rewritten or marked reviewed by this overhaul.

## Final performance comparison

All fourteen movement/combat and resolution combinations meet the 10% median
and p95 CPU submission target in the final 600-frame-warm-up series. Values
are means of per-run statistics, not pooled-frame percentiles. Negative changes
mean lower CPU time. Three pairs were used for each location except Bastion.
Its first three pairs were marginally over the p95 target; all of those samples
were retained and three additional alternating pairs were included. The original
three-pair aggregate is saved separately. Initial 90-frame and controlled-runtime
experiments are also retained, including failures; this result does not claim
that those earlier runs or cold-cache performance passed.

| Location | Resolution | Workload | Median change | p95 change |
|---|---|---|---:|---:|
| The Breach | 1080p | Movement | -2.7% | +1.0% |
| The Breach | 4K | Movement | -7.3% | +1.8% |
| The Cinderfields | 1080p | Movement | +0.0% | +3.0% |
| The Cinderfields | 1080p | Combat | +0.0% | -5.0% |
| The Cinderfields | 4K | Movement | +0.8% | +6.6% |
| The Cinderfields | 4K | Combat | +3.9% | +4.5% |
| The Cinder Bastion | 1080p | Movement | -3.7% | -15.4% |
| The Cinder Bastion | 1080p | Combat | -5.0% | -2.7% |
| The Cinder Bastion | 4K | Movement | +5.3% | +2.0% |
| The Cinder Bastion | 4K | Combat | -2.5% | -3.1% |
| The Throne of Cinders | 1080p | Movement | +6.9% | +9.2% |
| The Throne of Cinders | 1080p | Combat | +0.9% | -1.4% |
| The Throne of Cinders | 4K | Movement | +2.1% | +5.7% |
| The Throne of Cinders | 4K | Combat | -4.7% | -3.8% |

See `tests/qa/act5_environment/validation.json` for report links and the source
hashes at delivery. The reviewed [final overview](../tests/qa/act5_environment/final_overview.jpg)
shows one refreshed gameplay view per location.
