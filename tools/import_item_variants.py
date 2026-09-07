#!/usr/bin/env python3
"""Import the ImageGen item board using chroma key and uniform sprite packing.

Only source pixels are retained. Connected components keep tips and cords that
cross nominal grid boundaries; no artwork is drawn or geometrically synthesized.
Run after updating items_chroma_v1.png, then run build_sprite_assets.py.
"""
from collections import deque
import hashlib
import json
from pathlib import Path
from PIL import Image
import build_sprite_assets as build

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = ROOT / 'assets/sprites_src/gameplay_art_authored/items/items_chroma_v1.png'
OUTPUT = ROOT / 'assets/sprites_src/gameplay_art/ui/items_variants.png'
REPORT = ORIGIN.with_name('import_v1.json')


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    source = Image.open(ORIGIN).convert('RGBA')
    width, height = source.size
    pixels = list(source.getdata())
    # The generated board uses pure magenta solely as the engine's mask key.
    # Key near-magenta antialiasing too, retaining the purple potion's darker pixels.
    opaque = bytearray(width * height)
    for i, (r, g, b, a) in enumerate(pixels):
        opaque[i] = a > 16 and not (r > 150 and b > 150 and min(r, b) - g > 90)
    # Remove key spill only along the mask edge; interior purple potion pixels
    # remain protected by the glass outline. This avoids magenta sprite fringes.
    keyed = bytes(opaque)
    for i, (r, g, b, a) in enumerate(pixels):
        if not keyed[i] or min(r, b) - g <= 18:
            continue
        x, y = i % width, i // width
        near_key = any(not keyed[yy * width + xx]
                       for yy in range(max(0, y - 2), min(height, y + 3))
                       for xx in range(max(0, x - 2), min(width, x + 3)))
        if near_key:
            if min(r, b) - g > 40:
                opaque[i] = 0
            else:
                pixels[i] = (min(r, g + 12), g, min(b, g + 12), a)
    visited = bytearray(width * height)
    groups = [[] for _ in build.ITEM_VARIANT_NAMES]
    for start in range(width * height):
        if not opaque[start] or visited[start]:
            continue
        visited[start] = 1
        queue = deque([start]); component = []
        x0 = x1 = start % width; y0 = y1 = start // width
        while queue:
            i = queue.popleft(); component.append(i)
            x, y = i % width, i // width
            x0 = min(x0, x); x1 = max(x1, x); y0 = min(y0, y); y1 = max(y1, y)
            for n in ((i - 1 if x else -1), (i + 1 if x + 1 < width else -1), i - width, i + width):
                if 0 <= n < len(opaque) and opaque[n] and not visited[n]:
                    visited[n] = 1; queue.append(n)
        if len(component) < 8:
            continue
        column = min(5, int((x0 + x1) / 2 * 6 / width))
        row = min(4, int((y0 + y1) / 2 * 5 / height))
        groups[row * 6 + column].extend(component)
    atlas = Image.new('RGBA', (384, 320))
    details = {}
    for index, (name, indices) in enumerate(zip(build.ITEM_VARIANT_NAMES, groups)):
        if len(indices) < 200:
            raise RuntimeError(f'{name}: source object missing')
        xs = [i % width for i in indices]; ys = [i // width for i in indices]
        box = (min(xs), min(ys), max(xs) + 1, max(ys) + 1)
        cutout = Image.new('RGBA', (box[2] - box[0], box[3] - box[1]))
        target = cutout.load()
        for i in indices:
            target[i % width - box[0], i // width - box[1]] = pixels[i]
        scale = min(56 / cutout.width, 56 / cutout.height)
        fitted = cutout.resize((max(1, round(cutout.width * scale)), max(1, round(cutout.height * scale))), Image.Resampling.LANCZOS)
        atlas.alpha_composite(fitted, (index % 6 * 64 + (64 - fitted.width) // 2, index // 6 * 64 + (64 - fitted.height) // 2))
        details[name] = {'index': index, 'sourceBox': list(box), 'outputSize': list(fitted.size)}
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    atlas.save(OUTPUT)
    parameters = {'operation': 'chroma-key-component-slice-uniform-scale', 'columns': 6, 'rows': 5, 'cell': [64, 64], 'padding': 4, 'items': details}
    report = {'source': ORIGIN.relative_to(ROOT).as_posix(), 'sourceSha256': digest(ORIGIN), 'output': OUTPUT.relative_to(ROOT).as_posix(), 'sha256': digest(OUTPUT), 'parameters': parameters}
    REPORT.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    authorship = json.loads(build.GAMEPLAY_ART_AUTHORSHIP.read_text(encoding='utf-8'))
    descriptor = dict(authorship['descriptors']['item-icons:misc'])
    descriptor.update(key='variants', path=report['output'], sha256=report['sha256'], assetId='ui.items.variants', size=[384, 320], cols=6, rows=5)
    descriptor['provenance'] = {'method': 'imagegen-item-variants-import-v1', 'source': report['source'], 'sourceSha256': report['sourceSha256'], 'parameters': parameters}
    authorship['descriptors']['item-icons:variants'] = descriptor
    build.GAMEPLAY_ART_AUTHORSHIP.write_text(json.dumps(authorship, indent=2, sort_keys=True) + '\n', encoding='utf-8')
    print(f'Imported {len(details)} item silhouettes: {OUTPUT.relative_to(ROOT)}')


if __name__ == '__main__':
    main()
