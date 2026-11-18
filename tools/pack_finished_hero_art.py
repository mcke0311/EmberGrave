"""Pack the three painted source grids for the live humanoid and form rigs."""
import argparse
from math import sin, pi
from pathlib import Path
from PIL import Image

SIZE = 256
ROOT = Path(__file__).resolve().parents[1] / "assets/characters"
SOURCES = ROOT.parent / "sprites_src/painted_heroes"


def grid(path, columns, rows):
    with Image.open(path) as image:
        return image.convert("RGB").resize((columns * SIZE, rows * SIZE), Image.Resampling.LANCZOS)


def tile(sheet, col, row):
    return sheet.crop((col * SIZE, row * SIZE, (col + 1) * SIZE, (row + 1) * SIZE))


def column(image, u):
    x = max(0, min(SIZE - 1, round(u * (SIZE - 1))))
    return image.crop((x, 0, x + 1, SIZE))


def ramp(value):
    t = max(0, min(1, value))
    return t * t * (3 - 2 * t)


def head_wrap(face, side, nape, human):
    # Front at the center; the seam is at the center back. Preserve the
    # original front portrait and dissolve the painted temples into the nape.
    result = Image.new("RGB", (SIZE, SIZE))
    for x in range(SIZE):
        a = 2 * pi * ((x + .5) / SIZE - .5)
        front = column(face, .5 + .49 * sin(a))
        # On a profile the longitude keeps advancing from cheek to occiput.
        # A planar projection here would stretch one strip across the temple.
        profile = max(0, min(1, (abs(a) - .78) / 1.57))
        flank = column(side, .035 + .31 * profile if human else .94 - .88 * profile)
        back = column(nape, .5 - .48 * sin(a))
        c = Image.blend(front, flank, ramp((abs(a) - .86) / .56))
        c = Image.blend(c, back, ramp((abs(a) - 1.72) / .65))
        result.paste(c, (x, 0))
    return result


def save_atlas(image, name):
    target = ROOT / name
    temporary = target.with_suffix(".tmp")
    image.save(temporary, format="WEBP", quality=93, method=6)
    temporary.replace(target)


if __name__ == "__main__":
    args = argparse.ArgumentParser(description=__doc__)
    for name in ["wardrobe", "details", "forms"]:
        args.add_argument(name, type=Path, nargs="?", default=SOURCES / f"{name}.webp")
    src = args.parse_args()
    clothes, details, beasts = grid(src.wardrobe, 5, 4), grid(src.details, 5, 5), grid(src.forms, 4, 3)
    people = Image.new("RGB", (5 * SIZE, 10 * SIZE))
    people.paste(clothes, (0, 0))
    people.paste(details, (0, 4 * SIZE))
    with Image.open(ROOT / "hero-surfaces.webp") as original:
        for col in range(5):
            panel = head_wrap(tile(original, col, 0), tile(details, col, 1), tile(details, col, 0), True)
            people.paste(panel, (col * SIZE, 9 * SIZE))
    animals = Image.new("RGB", (4 * SIZE, 4 * SIZE))
    animals.paste(beasts)
    for col in range(4):
        flank = tile(beasts, col, 0)
        animals.paste(head_wrap(tile(beasts, col, 1), flank, flank, False), (col * SIZE, 3 * SIZE))
    save_atlas(people, "hero-wardrobe.webp")
    save_atlas(animals, "wildshape-surfaces.webp")
