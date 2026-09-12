"""Rasterize the existing Vanguard shield motif for Home Screen icons."""
from pathlib import Path
from PIL import Image, ImageDraw

dest = Path(__file__).resolve().parents[1] / "assets" / "ui" / "app"
dest.mkdir(parents=True, exist_ok=True)
im = Image.new("RGB", (1024, 1024), "#111a23")
d = ImageDraw.Draw(im)
# Shield and sword from TitleScreen's Vanguard crest, inside the maskable safe area.
shield = [(512, 210), (746, 290), (746, 542), (708, 638), (625, 724), (512, 811),
          (399, 724), (316, 638), (278, 542), (278, 290), (512, 210)]
d.polygon(shield, fill="#352b20")
d.line(shield, fill="#d9b571", width=20, joint="curve")
d.line([(512, 346), (512, 685)], fill="#f3d69a", width=22)
d.line([(415, 485), (609, 485)], fill="#f3d69a", width=22)
d.polygon([(474, 367), (512, 310), (550, 367)], fill="#f3d69a")
for size in (180, 192, 512):
    im.resize((size, size), Image.Resampling.LANCZOS).save(dest / f"icon-{size}.png")
