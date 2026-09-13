"""Generate browser and Home Screen icons from the existing gold shield crest."""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "assets" / "ui" / "app"
BACKGROUND = "#111a23"


def crest(maskable=False, small=False):
    im = Image.new("RGB", (1024, 1024), BACKGROUND)
    d = ImageDraw.Draw(im)
    # Opaque edges; the maskable crest fits the central circle of radius 40%.
    scale = 1 if maskable else 1.25
    def points(coords):
        return [(round(512+(x-512)*scale), round(512+(y-512)*scale)) for x, y in coords]
    shield = [(512,210),(746,290),(746,542),(708,638),(625,724),(512,811),
              (399,724),(316,638),(278,542),(278,290),(512,210)]
    d.polygon(points(shield), fill="#352b20")
    d.line(points(shield), fill="#d9b571", width=38 if small else 24, joint="curve")
    d.line(points([(512,346),(512,685)]), fill="#f3d69a", width=42 if small else 28)
    d.line(points([(415,485),(609,485)]), fill="#f3d69a", width=42 if small else 28)
    d.polygon(points([(474,367),(512,310),(550,367)]), fill="#f3d69a")
    return im


def main():
    DEST.mkdir(parents=True, exist_ok=True)
    regular, maskable, tiny = crest(), crest(maskable=True), crest(small=True)
    for size in (180,192,512):
        regular.resize((size,size), Image.Resampling.LANCZOS).save(DEST / f"icon-{size}.png")
    for size in (192,512):
        maskable.resize((size,size), Image.Resampling.LANCZOS).save(DEST / f"icon-maskable-{size}.png")
    for size in (16,32):
        tiny.resize((size,size), Image.Resampling.LANCZOS).save(DEST / f"favicon-{size}.png")
    tiny.save(ROOT / "favicon.ico", sizes=[(16,16),(32,32),(48,48)])
    print("Generated shield favicons and app icons.")


if __name__ == "__main__":
    main()
