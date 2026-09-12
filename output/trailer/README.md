# EMBERGRAVE gameplay trailer

The current version is **[the Ominous Dawn cut](ominous-dawn/EMBERGRAVE-Ominous-Dawn-Trailer-40s.mp4)**. It is 40 seconds at 1920×1080, 30 fps. `preview.html` plays this version. The creator-supplied song is stored in `music/Ominous Dawn.mp3`; the edit uses 0.96–40.96 seconds, with cuts following musical accents, a final fade, and understated game sound effects. Rebuild with `python output/trailer/build_ominous_dawn.py`. Its timeline, verification, and visual review are in `ominous-dawn/`.

The original cut is preserved below.

`EMBERGRAVE-Gameplay-Trailer-40s.mp4` is the finished 40-second, 1920×1080, 30 fps first cut with H.264 video and AAC audio. `preview.html` provides a local player and download button.

The cut introduces the shattered Sunderstone, Frosthaven, all five playable classes, and encounters with Korvath, the Mire Mother, the Empty Archangel, Azram, and Vethriss. The ending uses the game title and “Begin your saga”; no release date or store claim is added.

Sources: the game's two existing cinematic clips, freshly recorded production gameplay through `tests/boss_encounters.html`, the existing “Black Rune Oath” music asset, and game sound effects. Source cinematic aspect ratios and visible watermarks are retained. Captures use temporary heroes and isolated saves with invulnerability enabled; playback is corrected for recording overhead to match normal simulation speed.

Rebuild with `python output/trailer/build_trailer.py`. The renderer uses Pillow and the local `ffmpeg.exe`. Capture with `python -m http.server 8876 --bind 127.0.0.1`, then `node output/trailer/capture.cjs`. The capture needs Playwright and Chrome. `timeline.json`, `capture-report.json`, and `verification.json` document the edit and checks; `review/final-contact-sheet.jpg` shows every shot.
