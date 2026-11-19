"""Pack the two painted states of each quest landmark around a shared foot."""
import json
from pathlib import Path

from PIL import Image
from import_prop_interactions import sha, write

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets/sprites_src/gameplay_art_authored/quest_journeys/landmarks.png"
OUTPUT = ROOT / "assets/sprites/packed/world/props/quest_landmarks.webp"
ASSET = "world.props.quest_landmarks"


def install(entries, maps):
    sheet = Image.open(SOURCE).convert("RGBA")
    columns = [0, 389, 734, 1040, 1388, 1774]
    cuts = [435, 435, 408, 435, 435]
    heights = [100, 64, 108, 90, 98]
    atlas = Image.new("RGBA", (640, 256))
    shapes = [None] * 10
    for col, height in enumerate(heights):
        pair = []
        for top, bottom in [(0, cuts[col]), (cuts[col], sheet.height)]:
            cell = sheet.crop((columns[col], top, columns[col + 1], bottom))
            pair.append(cell.crop(cell.getchannel("A").getbbox()))
        scale = min(height / max(im.height for im in pair), 118 / max(im.width for im in pair))
        for row, im in enumerate(pair):
            im = im.resize((round(im.width * scale), round(im.height * scale)), Image.Resampling.LANCZOS)
            x, y = 64 - im.width // 2, 121 - im.height
            atlas.alpha_composite(im, (col * 128 + x, row * 128 + y))
            shapes[row * 5 + col] = {"bounds": [x, y, x + im.width, y + im.height]}
    atlas.save(OUTPUT, lossless=True, exact=True)
    entries[ASSET] = dict(src=OUTPUT.relative_to(ROOT).as_posix(), revision=sha(OUTPUT)[:12], kind="atlas", cell=[128, 128],
                          cols=5, rows=2, anchor=[64, 117], bundle="world", hitShapes=shapes)
    maps["props"]["quest_landmark"] = ASSET


if __name__ == "__main__":
    path = ROOT / "js/sprite_manifest.js"
    text = path.read_text(encoding="utf-8")
    at = text.index("{")
    manifest = json.loads(text[at:].strip().removesuffix(";"))
    install(manifest["entries"], manifest["maps"])
    write(path, text[:at] + json.dumps(manifest, indent=2, sort_keys=True) + ";\n")
    coverage = ROOT / "assets/sprites/coverage.json"
    report = json.loads(coverage.read_text())
    report["assetCount"] = len(manifest["entries"])
    write(coverage, json.dumps(report, indent=2) + "\n")
