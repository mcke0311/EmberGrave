EMBERGRAVE — sprite asset workflow
==================================

The browser renders persistent gameplay artwork only from checked-in sprite
files declared in js/sprite_manifest.js. There is no runtime art generation and
no image fallback. Missing, malformed, or undecodable required assets block play
with the failing asset id and path.

SOURCE AND RUNTIME FILES
------------------------
* Authored/generated raster sources: assets/sprites_src/ and the painted asset
  libraries under assets/world/, assets/monsters/, assets/summons/, and assets/act1/.
* Browser-ready atlases: assets/sprites/.
* Runtime registry: js/sprite_manifest.js.
* Coverage report: assets/sprites/coverage.json.

PLAYER RIG
----------
Player atlases use 192x192 cells. Columns are E, SE, S, SW, W, NW, N, NE.
Rows are idle, walk A, walk B, attack windup, attack impact, cast, hit, death,
and dead. Neutral bodies and every equipment plane share the exact 1536x1728
layout, [96,184] anchor, and grip-rig-v1 registration. Player-rig sources live in
assets/sprites_src/player_rig/; registrations.json declares 72 main/off-hand
sockets plus head/chest ROIs for each of the five classes.

BUILD AND VALIDATE
------------------
Run these development-only commands from the project root:

  (requires Python 3 and Pillow)

  python tools/author_player_rig.py --write
  python tools/build_sprite_assets.py
  python tools/validate_sprite_assets.py

The player-rig authoring helper is run only when approved rig art or registration
changes. It bakes placement into checked-in RGBA sheets. The normal compiler
strictly validates and packs those sheets without repositioning their pixels,
then rewrites the manifest and coverage report. Commit every emitted file; the
shipped game has no build step.

ADDING OR CHANGING ART
----------------------
1. Add the authored transparent source to the appropriate source directory.
2. Add or adjust its build-time source declaration in js/data.js.
3. Extend tools/build_sprite_assets.py when a new asset category or frame layout
   is required.
4. Rebuild and run the validator.
5. Confirm index.html works both from file:// and through a local HTTP server.

Runtime code must request frames through SpriteAssets. Do not add Canvas geometry
as a missing-art substitute.
