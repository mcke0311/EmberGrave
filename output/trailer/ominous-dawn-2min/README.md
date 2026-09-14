# EMBERGRAVE — Ominous Dawn

The finished trailer is **EMBERGRAVE-Ominous-Dawn-Trailer-2min.mp4**: exactly 2:00, 1920 × 1080, 30 fps, H.264 video and stereo AAC audio. Open `preview.html` to watch it locally.

The soundtrack uses the supplied **Ominous Dawn.mp3**, continuously from 0:00 to 2:00, with an ending fade and a few quiet effects from the game. The mix is normalized in two passes to -16 LUFS with a -1.5 dBTP target ceiling.

The edit combines the project's existing cinematics with newly captured gameplay from all five classes and the five campaign regions. Captures use the game's isolated boss-review fixture with a temporary save store, invulnerability, and restored casting mana. Movement, combat timing, damage, and the simulation run at normal speed. WebCodecs assigns fixed 30-fps timestamps, so capture overhead does not slow down the footage. No player saves or production game files were changed.

The sequence opens on the Sunderstone and Frosthaven, introduces the five classes, travels through the campaign, and finishes with a faster boss montage and the game title. It makes no release-date or storefront claims.

Files for further editing:

- `timeline.json`: frame-exact cut list with source files and in points.
- `capture.cjs`: gameplay capture script; expects the game at `http://127.0.0.1:8876`.
- `build.py`: graphics, video assembly, music mix, export, and verification; run with `--resume` to reuse existing segments.
- `clips/`: captured 1280 × 720 gameplay sources, presented at 1080p in the final edit.
- `music/Ominous Dawn.mp3`: an unchanged copy of the supplied song.
- `verification.json`: duration, encoding, decode, loudness, source hash, and black-frame checks.
- `review/contact-sheet.jpg`: sampled views of all 20 shots.
- `poster.jpg`: trailer thumbnail.

Rebuilding requires Python with Pillow, Node with Playwright and Chrome, and the existing `../ffmpeg.exe`. No external publishing is involved.
