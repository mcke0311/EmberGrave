# Game font

`exocet.otf` is the existing local Exocet Blizzard Mixed Caps OT Medium font,
copied unchanged from `Downloads/D2RLAN_CoreFiles/D2RLAN/D2R/Exocet.otf`.
Its embedded copyright is Emigre Inc., 1991, designed by Jonathan Barnbrook.
The original copyright and license metadata remain in the font file.

`css/fonts.css` exposes it as `Exocet` and defines `--font-game` for all UI
styles. Canvas text uses the same family; startup loads it before the game
measures or draws world labels. Georgia and the generic serif family cover
symbols outside the font's character set and font-loading failures.
