# Skill sound sources

The skill audio is an Embergrave-specific edit and mix of CC0 source effects.
The original game names, setting, and skill designs remain original; these sound
recordings are third-party source material. No attribution is required by CC0,
but their creators and exact sources are retained here.

| Pack | Creator | Source and license |
| --- | --- | --- |
| Impact Sounds 1.0 | Kenney | https://kenney.nl/assets/impact-sounds — CC0; supplied `impact-license.txt` |
| 50 RPG sound effects | Kenney Vleugels | https://opengameart.org/content/50-rpg-sound-effects — CC0; supplied `rpg-license.txt` |
| 80 CC0 RPG SFX | rubberduck | https://opengameart.org/content/80-cc0-rpg-sfx — CC0 as stated on the creator's submission |

CC0 dedication: https://creativecommons.org/publicdomain/zero/1.0/

`sources.json` records every source archive hash, selected file hash, cut's
layering recipe, processing settings, duration, output peak/RMS, and output hash.
The original archives are downloaded to `tmp/skill_audio_sources` by
`tools/fetch_skill_audio.py`. Only the selected processed cuts ship with the game.

`tools/build_skill_audio.py` authors 26 textures with three source takes each.
It trims silence, removes DC and very low rumble, filters harsh upper frequencies,
changes playback rate at a constant ratio, combines recorded layers, adds short
reflections where appropriate, preserves transient headroom, and fades cut edges.
The authoring tool adds no oscillators, generated white noise, musical intervals,
or sweeping pitch envelopes.

The two supplied click/death MP3s in the parent folder are preserved separately.
