# Animated world props

The five acts now have coordinated painted shrine, chest, strongbox, grave,
altar, well, pillar, barrel, crate and urn artwork. Each family retains an
attuned, open, searched, depleted or broken appearance after use. Ambush sites
use distinct barrow, den, nest, ritual, infernal sigil and camp silhouettes.
Town facilities and authored story landmarks retain their recognizable art and
receive gesture and activation feedback.

`js/prop_interactions.js` owns presentation, placement, gesture timing, anchored
geometry and contact commits. Map generation, picking, rendering and the existing
interaction entry point all use it. Animation uses the simulation clock and
separate cosmetic particles; it never invalidates the terrain cache or invokes
damage-producing novas.

| Action | Duration | Contact |
| --- | ---: | ---: |
| Reach | 0.45 s | 0.225 s |
| Search | 0.65 s | 0.325 s |
| Kick | 0.56 s | 0.28 s |
| Town panel | 0.35 s | 0.35 s |

Movement, combat, stun, death, removal, loss of reach or travel cancels a pending
interaction. Before contact this grants nothing. A committed result survives
cancellation. Repeated clicks cannot restart the same action. All five human
rigs and four Wildkeeper forms support reaching/searching; the sprite renderer
has compatible poses. Existing equipment attachment remains intact.

## Searchable remains

Eight clothed frozen bodies are placed deterministically beside these Act I
landmarks. Placement searches nearby supported ground without carving terrain,
using generation RNG, blocking a route, or occupying a ramp approach, entrance,
reserved quest space or boss arena.

| Map | Landmark | Design |
| --- | --- | --- |
| Fallen North | Watch | Watch soldier |
| Fallen North | Caravan | Bundled traveler |
| Mines | Deep cut | Miner |
| Shattered Temple | Vigil | Watch soldier |
| Shardpeak Shrine | Shelter | Bundled traveler |
| Shardpeak Shrine | Windward ascent | Watch soldier |
| Deepfreeze Cavern | Gallery | Miner |
| Deepfreeze Cavern | Shelf | Bundled traveler |

Each body grants one existing barrel-tier loot roll and cannot trigger an
ambush. Up to three ordinary graves per adventure map are deterministically
searchable; story and event graves are excluded. `searched` and `corpseConsumed`
are independent. Gravebinder corpse creation remains synchronous and produces
one empowered corpse on the correct terrain layer, before or after looting.

Prop use persists in the existing expedition map cache. Shrine attunement and
story completion continue to use existing saved campaign state. There is no
full-world save format or migration.

## Artwork and rebuild

Six transparent PNG source sheets and their full imagegen prompts are retained in
`assets/sprites_src/gameplay_art_authored/prop_interactions/`. The reproducible
import crops connected alpha silhouettes, applies one scale per family and
aligns all states to a shared ground anchor. It packs 144 cells into six lossless
WebP atlases (1,091,724 bytes total) with per-frame hit bounds and source/output
hashes in `import.json`.

```sh
python tools/import_prop_interactions.py
python tests/prop_overhaul_sprites.py
```

The regular `tools/build_sprite_assets.py` pipeline installs these entries and
checks source/output hashes. No image generation is needed to rebuild them.

## Review and validation

Serve the repository, then open `tests/qa/prop_overhaul/gallery.html` for the
1080p/4K state boards, all nine hero gesture boards, native campaign captures,
and raised Shardpeak terrain. `tests/prop_overhaul.html` provides an isolated
playable character, zone switching, replay and the interaction check runner.
It uses memory storage and never touches the player's saved characters.

```sh
node tests/prop_overhaul_contract.mjs
node tests/prop_overhaul_browser.cjs
node tests/prop_overhaul_input.cjs
node tests/prop_overhaul_visual.cjs
node tests/prop_overhaul_visual.cjs --4k
node tests/prop_overhaul_visual.cjs --profile
node tests/prop_overhaul_visual.cjs --profile --4k
node tests/character_animation3d_contract.mjs
node tests/character_forms3d_contract.mjs
node tests/player_weapon_pose_contract.mjs
node tests/navigation_contract.mjs
node tests/frontier_quest_contract.mjs
node tests/story_campaign_contract.mjs
node tests/terrain_view_cache_contract.mjs
```

Browser scripts use Playwright with installed Chrome and the local review server
at port 8768. JSON evidence and image captures are under
`tests/qa/prop_overhaul/`. Placement checks cover 20 seeds, determinism, eight
bodies, the grave cap, supported reachable ground, and ramp clearance. Browser
checks cover contact timing, single rewards, cancellation, spent states, corpse
and loot consumption in either order, town panels and real cached map revisits.

Performance samples exercise movement and combat with enemies active in five
seeded maps, at 1920×1080 and 3840×2160. They measure synchronous update/render
work after warm-up, not end-to-end display latency. Stationary renders also
assert unchanged terrain chunk and surface-view build counters. The `--before`
option reads the starting game/entities/mapgen copies in `tmp/prop_overhaul/`;
retain those copies to repeat the exact local comparison. Absolute timing varies
with browser/GPU load; before/after JSON reports record the measured values.

The final local run measured median update/render work of 2.6–5.0 ms at 1080p
and 3.9–9.6 ms at 4K; the highest p95 samples were 6.5 ms and 12.1 ms respectively.
Matched starting-file medians were 1.7–4.1 ms and 2.9–9.2 ms. The richer prop
pass therefore has a measurable cost (roughly 0.4–1.3 ms per sampled 1080p
scenario and 0.4–1.9 ms at 4K). All sampled stationary terrain counters remained
stable. These are local headless Chrome measurements, not a display-FPS claim.

Two older validation suites have pre-existing failures reproduced against the
starting files: `player_animation_timing_contract.mjs` asks a Vanguard to accept
a Ranger weapon-restricted skill; `validate_sprite_assets.py --partial-only`
has five stale source/manifest expectations involving enemy atlas isolation,
gameplay geometry, player options, elevated cliffs and the title camp branch.
The new prop sprite checks and the relevant animation, weapon, navigation,
campaign and terrain-cache contracts pass independently.
