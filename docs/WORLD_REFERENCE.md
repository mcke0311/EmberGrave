# Level objects reference

Run `python serve.py` from the repository and open
[Level objects](http://localhost:8741/world.html). Links are also available in
the data editor and loot reference page. The page requires HTTP because it reads
the checked-in artwork provenance metadata.

The Act I listings show jewel-bearing mine crystals, boundary wolf dens,
single-use spider nests, and Shardpeak's mountain landmarks, including their
broken states and behavior-editing references. See [Act I habitats](ACT1_HABITATS.md).

Choose a level, seed and difficulty, then click **Regenerate**. The directory
covers every entry in `DATA.ZONES`, grouped into the five acts, the opening road,
and the optional Ashen Marches. The default is Frosthaven, seed 12345, Normal.

Select a gallery image to highlight all its placements. Click a map marker or
use the instance selector for coordinates and terrain layer. Drag or zoom the
map, and use **Fit map** to reset it. Category buttons and object search filter
both the gallery and markers. Landmark labels and exit markers are optional.
Overlapping markers cycle when clicked. On narrow screens, choosing an object
scrolls to its details; **Back to gallery** returns to the list.

The detail panel separates placement/quantity, artwork, and behavior references.
Source paths open directly; function and data-key names are copyable search
anchors. **Copy change reference** includes the current level, seed, difficulty,
instance coordinates, identities, preview frame/state, and editing references.
The URL preserves the level, generation settings, filter and selected instance.

## What the numbers mean

- **Objects** counts generated props plus discrete environment artwork and
  floor decorations, including walls, trees, passages, and inlays. Shared map
  collections are not counted twice. Environmental pieces can extend past the
  playable boundary. Collision belongs to the underlying terrain.
- **Types** groups those objects by category, logical identity and resolved art.
  Two dens can share pixels but have different family or event behavior.
- **Can also appear** lists eligible random object events, with draw weights and
  whether each appears in this sample. Treasure-creature weights participate
  in the event pool, but creatures are outside the object catalogue.
- **Terrain materials** lists continuous ground and tile materials separately.
  Tile coverage can overlap; it is not a prop count. Material frames are available
  in the preview where the source is an atlas.

This is a fresh generated reference, not a saved expedition. Used-state previews
are copies. Random events are reference samples: legacy areas use a seeded
substitute for their live randomness, and skipping treasure-creature creation
can change later event draws. Actual gameplay retains its original random-call
order and actor creation. Quest conditions are described rather than simulated;
conditional story objects remain available as editing references. The cathedral
sample represents the selected area generation seed. Gameplay derives that
seed from the runtime session seed, difficulty, and area ID, and caches it for
all revisits during that session.
NPCs, monsters, transient effects, and direct editing are outside this page.

## Implementation references

| Concern | Source |
| --- | --- |
| Dashboard data and provenance | `js/world_reference.js` |
| UI, thumbnails, map and URL state | `js/world_reference_view.js`, `css/world-reference.css` |
| Shared generation and event placement | `MapGen.generate`, `MapGen.placeEvents` in `js/mapgen.js` |
| Shared prop identity and state | `PropInteractions.visualType`, `resolveVisual`, `sample` |
| Environment assembly descriptors | Each environment module's `describe(map, frameResolver)` in `js/level_terrain.js` |
| Authored art provenance | `assets/sprites_src/gameplay_art/gameplay_art_v1.json` |
| Interactive prop atlas provenance | `assets/sprites_src/gameplay_art_authored/prop_interactions/import.json` |

`await WorldReference.load()` loads provenance once. Then
`WorldReference.inspect(zoneId, {seed, difficulty})` returns the generated map,
normalized instances, gallery groups, eligible events, materials, exits,
landmarks and reference issues. In Node tests, `setProvenance(art, props)` takes
the same metadata as parsed JSON. Inspection does not boot `Game`, start a
simulation, or access character storage. Images load only when their cards
approach the viewport. No generated asset manifest needs maintaining.

## Validation

```sh
node tests/world_reference_contract.cjs
node tests/world_reference_browser.cjs
node tests/prop_overhaul_contract.mjs
node tests/monster_families_contract.mjs
node tests/story_campaign_contract.mjs
```

The contract covers every level across seeds 1, 12345, and 4294967295, repeated
generation, counts, coordinates, art states and existing source paths. A frozen
copy of the old event routine verifies random-call and actor-callback parity.
The browser runner uses Chrome and the server on port 8741 (`GAME_REVIEW_URL`
can override it); screenshots go to `tmp/world-reference`. It checks all level
switches, selection, filtering, preview states, clipboard references, bookmarks,
mobile layout, missing artwork, and unchanged storage.

The existing `terrain_view_cache_contract.mjs` currently fails before its cache
assertions because its fixture does not load `TerrainNavigation`; this is also
reproducible against the pre-dashboard map generator. The isolated monster-family
browser review verifies in-game rendering across northern, marsh, cathedral,
and infernal environments.
