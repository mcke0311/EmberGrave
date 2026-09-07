# Floor background coverage — 2026-09-05

The floor pass skipped indoor wall cells and only drew the elevated surface of
raised cells. Transparent wall and cliff edges could therefore reveal the
screen-space backdrop. The production renderer now draws ground beneath these
cells first, using the same cached level materials. Flat open tiles still draw
once. Collision, elevation, hazards and map generation are unchanged.

Verified in the Codex in-app browser:

- `floor_opacity.html`: **33,211,200 pixel samples passed** across all 33 level
  material sets and four camera offsets. Dungeon/wilderness fixtures include
  solid wall blocks and raised outdoor plateaus; all five towns use generated
  maps. No background exposure remained. Geometry arrays were unchanged.
- `floor_opacity.html?baseline=1`: the frozen old production floor pass exposed
  background in **4,662,684 samples across 28 level material sets**, demonstrating
  that the coverage check detects the original defect. This expected failure is
  a test-only baseline, never loaded by the game.
- `level_blending.html`: **129,053 checks passed** across all 28 generated
  wilderness/dungeon maps for coverage, camera stability and geometry.
- `terrain_render_contract.html`: **25,121 checks passed**, including cliff seam
  and height checks and four scenes rendered through the production floor pass.
- `terrain_cache_contract.mjs`: **16,400 checks passed** with deterministic canvas
  stubs, covering cache lifecycle and retention. This is not an FPS benchmark.
- `level_runtime.html`: all **28 non-town levels** entered and rendered in the
  running game. Visual checks in the mines and Fallen North confirmed ground
  beneath wall bases and raised ledges. These fixtures use isolated saves.
- `js/game.js` passed Node's syntax check.

Open the HTML fixtures through the local server. The opacity review includes a
level selector, a camera-pan replay and a checkerboard beneath the canvas that
highlights any uncovered area.
