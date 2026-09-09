# Act I visual overhaul

The opening road, Frosthaven, Fallen North, Abandoned Mines, Shattered Temple,
Shardpeak Shrine and Deepfreeze Caverns share a new environment pass. The
[before/after gallery](../tests/qa/act1_polish/gallery.html) contains 15 matched
1080p scenes and links to the final 4K captures.

## Visible changes

- A new snow material replaces the dark, visibly repeating outdoor ground.
  Soft trail and forest-shadow masks blend into one continuous snowfield.
- Six new painted fir, pine, boulder and crag sprites replace rows of identical
  snow islands. Varied spacing, scale and a second row create deeper forest
  edges; alpine areas use more rock and fewer trees.
- Frosthaven now sits in a snowy wooded landscape. Its rectangular navigation
  boundary no longer appears as an island over the mountain backdrop. Defensive
  wall returns frame the city gates on the opening road and in the wilderness.
- Dungeon floors retain distinct earth, stone and blue-ice palettes. The tan
  path overlay is removed, the walking surface is more readable, and solid
  surrounding mass stays dark. Painted corner pieces close major wall joins.
- Amber fire bowls and blue cave lights punctuate long passages. Act I uses the
  existing cached colored-light masks as well as the darkness cutout.
- Return-side Frosthaven and Shardpeak gate art is mirrored onto the actual
  wall diagonal. Sprite culling and interaction bounds follow the same mirror.

Terrain stays cached. Upright scenery shares the actor depth order and fades
when it covers the hero. New bases are placed on blocked terrain or beyond the
map, so paths, ramps, quest anchors and combat spaces remain usable. Zone
lighting is copied per map without changing shared zone definitions.

## Artwork and reproduction

The built-in `image_gen` tool created the two retained source sheets:
[snow material](../assets/sprites_src/gameplay_art_authored/act1_polish/snow_material.png)
and [nature atlas](../assets/sprites_src/gameplay_art_authored/act1_polish/nature_atlas.png).
The complete final [prompt set](../assets/sprites_src/gameplay_art_authored/act1_polish/prompts.json)
is retained beside them. `python tools/import_act1_polish.py` crops and uniformly
resizes the atlas, preserves generated alpha, packs lossless WebP, and updates
the normal sprite metadata. Seven runtime assets total 513,372 bytes.

Use `python tests/act1_environment_server.py` and open
`http://127.0.0.1:8755/tests/qa/act1_polish/gallery.html`. The gallery links to the
existing playable review, which uses an in-memory save store.

`node tests/act1_polish_visual.cjs` captures the 15 current scenes.
Add `--4k` for 3840 × 2160 and `--profile` for verified movement and combat.
The retained before images came from the working tree at the start of this
pass. Re-running `--before` requires its temporary source snapshot at
`tmp/act1_polish/before`; ordinary current-scene capture does not.

## Validation

| Check | Result |
| --- | --- |
| Act I entrances, gate orientation and collision contours, 30 seeds | 227,538 checks passed |
| Frontier navigation | 94,772 checks passed |
| Frontier quests and reload scenarios | 153 checks passed |
| New scenery placement and isolated lighting, 5 seeds | 13,493 checks passed |
| Projected terrain cache | 3,991 checks passed |
| Opening sequence | 890 checks passed, including the expected failed-load retry |
| Frosthaven subset of town layout test, 4 seeds | 9,392 checks passed |
| New asset alpha, provenance and packed pixels | All 7 assets passed |
| Actual browser scenes | 15 at 1080p and 15 at 4K; no page errors |

The full five-town layout test fails at `hellgate building footprint carved`.
The identical failure reproduces against the saved source from before this
pass. Frosthaven's subset passes; the Act V failure is outside this change.

The browser profiles retain the full enemy roster and a real 3D Vanguard,
warm for 90 frames, then sample 240 frames. They verify movement, attacks from
both sides, and that a stationary warmed terrain cache does not rebuild.
These are single local runs, not a statistical performance guarantee.

| Area / workload | Before 1080p CPU median / p95 | After 1080p | After 4K |
| --- | --- | --- | --- |
| Fallen North / movement | 3.1 / 4.4 ms | 3.2 / 4.6 ms | 4.0 / 5.1 ms |
| Fallen North / combat | 3.5 / 4.3 ms | 4.2 / 5.3 ms | 5.5 / 8.6 ms |
| Mines / movement | 2.8 / 3.7 ms | 3.3 / 4.7 ms | 4.1 / 4.9 ms |
| Mines / combat | 3.8 / 5.5 ms | 4.1 / 5.5 ms | 5.1 / 5.8 ms |
| Temple / movement | 4.6 / 6.5 ms | 3.0 / 3.9 ms | 3.3 / 4.2 ms |
| Temple / combat | 5.0 / 6.8 ms | 3.5 / 4.3 ms | 5.0 / 5.6 ms |

The added forest and lights have a modest CPU cost in the North and mines.
Temple rendering is cheaper after removing its old path blending. All sampled
warm caches stayed stable. One 4K North movement frame reached 23.9 ms during
camera travel; the p95 remained 5.1 ms. Raw results are in
`tests/qa/act1_polish/review_{before,after}_{1920,3840}.json` for the runs present.
