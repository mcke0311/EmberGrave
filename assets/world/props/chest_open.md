# Open treasure chest

Created with the built-in imagegen tool, using `assets/sprites/world/props/chest.webp`
as the edit reference. The full generated RGBA result is `chest_open.png` beside
this file. Its alpha is retained. The registered 64×80 sprite lives at
`assets/sprites_src/gameplay_art/world/props/chest_open.png`; the runtime WebP is
encoded by `tools/register_open_chest.py`. The base is registered at (28, 72),
allowing the raised lid to extend beyond the closed chest's footprint.

Final prompt:

> Use case: precise-object-edit. Asset type: opened treasure chest sprite for an isometric dark fantasy game. Edit target: the attached closed chest. Create its OPEN and EMPTY state. Keep the same small rectangular dark weathered wooden chest, three thick tarnished grey iron straps, muted lighting from upper left, exact same isometric orientation and base footprint; the near short end is toward lower right and the long side toward lower left. Lift the rounded hinged lid fully open on its back edge, clearly reveal a dark empty interior. Lid leans back at about 105 degrees, recognizable open silhouette even at 44 pixels wide. No treasure, no glow, no text, no surroundings. Isolated on genuinely transparent background, preserve alpha. Whole chest including raised lid inside frame with transparent margins. Crisp painterly game sprite matching the reference, no floor or cast shadow.
