"""Pack the model renders produced by bake_vanguard_soldiers.cjs and register their atlases."""
import argparse
import io
import json
import sys
from pathlib import Path

from PIL import Image
from import_prop_interactions import sha, write

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "assets/sprites/packed/actors/summons"
# Authored cell width, height and foot pivot. Off-center the bearer to fit the
# fallen banner. Even its complete sheet fits a 2048-pixel mobile texture.
CELLS = {"shieldguard": (102, 104, 51, 84), "bowman": (94, 98, 47, 78),
         "standard_bearer": (122, 136, 42, 116)}
COLS, ROWS = 16, 15
RAW_W, RAW_H = 192, 160
FOOT_X, FOOT_Y = 96, 134


def pack(sheet, role):
    if sheet.size != (COLS * RAW_W, ROWS * RAW_H):
        raise ValueError(f"Unexpected {role} source size {sheet.size}")
    width, height, anchor_x, anchor_y = CELLS[role]
    left, top = FOOT_X - anchor_x, FOOT_Y - anchor_y
    area = (left, top, left + width, top + height)
    atlas = Image.new("RGBA", (COLS * width, ROWS * height))
    for i in range(COLS * ROWS):
        x, y = i % COLS * RAW_W, i // COLS * RAW_H
        cell = sheet.crop((x, y, x + RAW_W, y + RAW_H))
        bounds = cell.getchannel("A").getbbox()
        # Two transparent pixels on every edge keep filtered samples inside the cell.
        if (not bounds or bounds[0] < left + 2 or bounds[1] < top + 2
                or bounds[2] > area[2] - 2 or bounds[3] > area[3] - 2):
            raise ValueError(f"Empty or clipped {role} frame {i}: {bounds}")
        atlas.paste(cell.crop(area), (i % COLS * width, i // COLS * height))
    dest = OUTPUT / f"{role}.webp"
    dest.parent.mkdir(parents=True, exist_ok=True)
    atlas.save(dest, lossless=True, exact=True, method=4)
    print(f"{role}: {width} x {height} cells, {dest.stat().st_size:,} bytes")


def install(entries, maps):
    for role, (width, height, anchor_x, anchor_y) in CELLS.items():
        file = OUTPUT / f"{role}.webp"
        with Image.open(file) as image:
            if image.size != (width * COLS, height * ROWS):
                raise ValueError(f"Rebake the {role} atlas for its current cell dimensions")
        key = f"actor.summon.{role}"
        entries[key] = dict(src=file.relative_to(ROOT).as_posix(), revision=sha(file)[:12],
                            kind="atlas", cell=[width, height], cols=COLS, rows=ROWS,
                            anchor=[anchor_x, anchor_y], bundle="actors")
        maps["summons"][role] = key


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pack", choices=CELLS)
    args = parser.parse_args()
    if args.pack:
        with Image.open(io.BytesIO(sys.stdin.buffer.read())) as source:
            pack(source.convert("RGBA"), args.pack)
    else:
        path = ROOT / "js/sprite_manifest.js"
        text = path.read_text(encoding="utf-8")
        at = text.index("{")
        manifest = json.loads(text[at:].strip().removesuffix(";"))
        install(manifest["entries"], manifest["maps"])
        write(path, text[:at] + json.dumps(manifest, indent=2, sort_keys=True) + ";\n")
        coverage = ROOT / "assets/sprites/coverage.json"
        report = json.loads(coverage.read_text())
        report["assetCount"] = len(manifest["entries"])
        report["summons"] = sorted(manifest["maps"]["summons"])
        write(coverage, json.dumps(report, indent=2) + "\n")
