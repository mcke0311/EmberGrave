EMBERGRAVE — Act I authored sprite sources
===========================================

This directory holds painted source images consumed by the development sprite
compiler. The browser does not load optional overrides from here and does not
fall back to Canvas art. Browser-ready outputs are committed under
assets/sprites/ and registered by js/sprite_manifest.js.

ANCHORING / SIZING
------------------
* Floor material sources are sliced and normalized to four 64x32 variants.
* Wall material sources are packed into all sixteen N/E/S/W adjacency frames.
  Runtime wall cells are transparent 128x128 images with a 64x32 footprint and
  a fixed 72-pixel rise.
* Props anchor bottom-center where they meet the ground. Use real alpha.
* Existing image names are declared in the build-time source catalog near the
  bottom of js/data.js.

BUILD AND VALIDATE
------------------
From the project root:

  python tools/build_sprite_assets.py
  python tools/validate_sprite_assets.py

Both generated atlases and the generated manifest/coverage report are committed,
so index.html continues to run without a build step.
