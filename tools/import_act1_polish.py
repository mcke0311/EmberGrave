"""Pack the Act I snow material and six isolated nature sprites.

Only crops, uniform resizing and lossless WebP packing; keep generated alpha.
The retained source sheets and prompts make the import reproducible.
"""
from pathlib import Path
import hashlib
import json
from PIL import Image
from import_act2_boundaries import write_text

ROOT = Path(__file__).resolve().parents[1]
AUTH = ROOT / 'assets/sprites_src/gameplay_art_authored/act1_polish'
ART = ROOT / 'assets/sprites_src/gameplay_art'


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    payload_path = ART / 'gameplay_art_v1.json'
    payload = json.loads(payload_path.read_text())
    manifest_path = ROOT / 'js/sprite_manifest.js'
    text = manifest_path.read_text()
    manifest = json.loads(text[text.index('{'):].strip().removesuffix(';'))
    sheet = Image.open(AUTH / 'nature_atlas.png').convert('RGBA')
    specs = [
        ('fir', (0, 0, 412, 687), 300),
        ('firs', (412, 0, 833, 687), 285),
        ('pine', (833, 0, 1254, 687), 265),
        ('crag', (0, 688, 398, 1254), 235),
        ('boulders', (398, 688, 878, 1254), 135),
        ('standing_stone', (878, 688, 1254, 1254), 155),
    ]
    images = []
    for name, box, height in specs:
        im = sheet.crop(box)
        bounds = im.getchannel('A').getbbox()
        im = im.crop(bounds)
        im = im.resize((round(im.width * height / im.height), height), Image.Resampling.LANCZOS)
        images.append((name, im, [im.width // 2, im.height - 9], 'nature_atlas.png', {'box': box, 'bounds': bounds}))
    im = Image.open(AUTH / 'snow_material.png').convert('RGBA').resize((512, 512), Image.Resampling.LANCZOS)
    images.append(('snow', im, [256, 256], 'snow_material.png', {}))
    for name, im, anchor, source, parameters in images:
        key = 'a1polish_' + name
        dest = ART / 'world/props' / (key + '.png')
        packed = ROOT / 'assets/sprites/packed/world/props' / (key + '.webp')
        im.save(dest)
        im.save(packed, lossless=True, exact=True)
        asset_id = 'world.prop.' + key
        payload['descriptors']['prop:' + key] = dict(
            sourceKind='authored-final-aligned', review='act1-polish-v2', role='prop', key=key,
            path=dest.relative_to(ROOT).as_posix(), sha256=digest(dest), kind='static',
            size=list(im.size), anchor=anchor, bundle='world', assetId=asset_id, lossless=True,
            provenance=dict(method='imagegen-act1-polish-v2', source=(AUTH / source).relative_to(ROOT).as_posix(),
                            sourceSha256=digest(AUTH / source), parameters=parameters))
        manifest['entries'][asset_id] = dict(src=packed.relative_to(ROOT).as_posix(), revision=digest(packed)[:12],
                                             kind='static', anchor=anchor, bundle='world')
        manifest['maps']['props'][key] = asset_id
    write_text(payload_path, json.dumps(payload, indent=2, sort_keys=True) + '\n')
    write_text(manifest_path, text[:text.index('{')] + json.dumps(manifest, indent=2, sort_keys=True) + ';\n')
    path = ROOT / 'js/data.js'
    data = path.read_text(encoding='utf-8')
    start, end = '  /* Act I landscape polish v2. */', '  /* End Act I landscape polish v2. */'
    if start in data:
        data = data[:data.index(start)] + data[data.index(end) + len(end):].lstrip('\n')
    at = data.index('  /* Act 1 environment library v1. */')
    block = start + '\n' + '\n'.join('  prop_a1polish_' + name + ': { src: "assets/sprites_src/gameplay_art/world/props/a1polish_' + name + '.png", raw: true },' for name, *_ in images) + '\n' + end + '\n'
    write_text(path, data[:at] + block + data[at:])
    path = ROOT / 'assets/sprites/coverage.json'
    coverage = json.loads(path.read_text())
    coverage.update(assetCount=len(manifest['entries']), props=sorted(manifest['maps']['props']))
    write_text(path, json.dumps(coverage, indent=2, sort_keys=True) + '\n')
    print('Registered seven Act I landscape assets.')


if __name__ == '__main__':
    main()
