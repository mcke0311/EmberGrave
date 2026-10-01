"""Encode original generated cinematic atlases without resizing or altering pixels."""
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1] / "assets" / "cinematics"
for source in sorted((root / "source").glob("*.png")):
    with Image.open(source) as image:
        assert image.mode == "RGBA", f"Missing transparency: {source}"
        destination = root / (source.stem + ".webp")
        image.save(destination, lossless=True, method=6)
        print(destination.relative_to(root.parent.parent))
