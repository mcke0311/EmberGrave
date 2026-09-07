# Authored sprite-generation prompts

The source PNGs in this directory were created with the built-in ImageGen tool.
The development compiler performs deterministic alpha cleanup, cell normalization,
pose aliasing, and WebP atlas packing; the browser never invokes image generation.

## Five player body sheets

The same layout prompt was used for Vanguard, Ember Witch, Gravebinder,
Wildkeeper, and Veil Ranger, with the class paragraph changed as shown below:

> Create a production-ready dark-fantasy isometric action-RPG character sprite
> sheet on a perfectly flat solid chroma-green (#00ff00) background. Exact grid:
> eight equal columns ordered E, SE, S, SW, W, NW, N, NE and nine equal rows
> ordered idle, walk A, walk B, attack windup, attack impact, cast, hit, death,
> dead. Keep one full character centered in every cell, identical scale and foot
> anchor, with generous padding and no overlap, labels, grid lines, shadows, glow,
> scenery, or UI. Painterly late-1990s dark-fantasy game sprite aesthetic,
> readable silhouette, consistent isometric camera and lighting.

Class paragraphs:

- Vanguard: rugged male border-legion line-breaker in dark steel plate and muted
  blue cloth, broad sword and heavy kite shield.
- Ember Witch: formidable female battlemage in layered charcoal robes and dark
  leather armor, ember-red sash, staff or wand, restrained orange fire accents.
- Gravebinder: gaunt male necromancer in weathered black and deep violet robes,
  bone charms, hooked ritual staff, cold green necromantic accents.
- Wildkeeper: rugged female wilderness warrior in moss-green and brown leather,
  fur mantle, antler and leaf details, short spear or nature focus.
- Veil Ranger: lean female hooded scout in charcoal and muted purple leather,
  recurved bow and compact quiver, stealthy silhouette.

ImageGen returned seven authored action rows for these sheets. The compiler maps
them into the required nine-row runtime rig, aliasing authored windup/cast and
death/dead poses while retaining the exact runtime contract.

## Neutral-undergear player sheets

The five original class sheets above were supplied to the built-in ImageGen
tool as edit targets, one class at a time.  This was the final production prompt
shape (with the class name substituted):

> Use case: identity-preserve. Asset type: neutral-undergear game character
> sprite sheet. Input image: the existing [CLASS] player sprite sheet, edit
> target and exact pose/layout reference. Replace only baked weapons, shields,
> helmets, and outer armor with fitted dark quilted undergear, simple trousers,
> boots, and bare/gloved gripping hands. Preserve the character's face, build,
> class palette, all eight directions, all seven source action rows, isometric
> camera, character scale, per-cell pose, and foot registration. Perfectly flat
> uniform #00ff00 chroma background; no shadows, gradients, scenery, grid lines,
> text, watermark, loose props, weapons, shields, helmets, or outer armor.

ImageGen outputs are checked in as
`assets/sprites_src/players/<class>_undergear_chroma.png`. The imagegen skill's
`remove_chroma_key.py` helper produced the reviewed
`<class>_undergear_alpha.png` files. `tools/author_player_rig.py` then performs
the one-time 8x7-to-8x9 body normalization and uses explicit, persisted
per-class/per-frame socket registration to produce final-aligned 1536x1728 RGBA
layer sheets in `assets/sprites_src/player_rig/`.

The equipment layers reuse the already-authored painted silhouettes from the
item atlas. The authoring helper bakes their class/frame registration into the
checked-in layer pixels. `tools/build_sprite_assets.py` validates and WebP-packs
those final sheets verbatim; it is not allowed to position, rotate, scale, or
manufacture player equipment geometry.

## Item atlas

> Create a production-ready 6-column by 4-row atlas of 24 isolated dark-fantasy
> inventory sprites on perfectly flat #00ff00. Equal square cells, one object per
> cell, centered, consistent scale, no overlap, labels, grid lines, shadows, glow,
> particles, hands, or scenery. Painterly late-1990s action-RPG inventory style.
> Row-major order: sword, axe, mace, dagger, spear, bow; crossbow, wand, staff,
> shield, helm, chest armor; gloves, boots, belt, ring, amulet, red potion; blue
> potion, scroll, angular glyph stone, charm/talisman, gold coin pile, loot bag.

## Skill atlas

> Create an atlas of 108 distinct dark-fantasy action-RPG skill icons on perfectly
> flat #00ff00. Exact rectangular grid, equal square cells, one centered readable
> glyph per cell, consistent scale and padding, no overlap, labels, text, grid
> lines, scenery, UI borders, gradients, or cast shadows. Painterly engraved-icon
> style using steel, bone, ember orange, ice blue, poison green, storm violet,
> earth ochre, blood red, and holy gold. Include varied weapon strikes, shields,
> war cries, flames, frost, lightning, bone, skulls, poison, curses, nature,
> animals, traps, arrows, stealth, healing, movement, summoning, and utility.
