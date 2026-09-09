"""Register the retained ImageGen sources using crop, uniform resize and lossless packing."""
from pathlib import Path
import hashlib
import json
from PIL import Image
from import_act2_boundaries import write_text
from import_act2_art import decode

ROOT = Path(__file__).resolve().parents[1]
AUTH = ROOT / 'assets/sprites_src/gameplay_art_authored/act2_visual'
ART = ROOT / 'assets/sprites_src/gameplay_art'

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def main():
    payload_path = ART / 'gameplay_art_v1.json'
    payload = json.loads(payload_path.read_text())
    manifest_path = ROOT / 'js/sprite_manifest.js'
    text = manifest_path.read_text()
    manifest = json.loads(text[text.index('{'):].strip().removesuffix(';'))
    records = []
    for name in ['water', 'moss', 'cypress', 'seal', 'pier']:
        source = AUTH / (name + '.png')
        im = Image.open(source).convert('RGBA')
        if name == 'pier':
            im, _ = decode(im)
        if name in ['cypress', 'seal', 'pier']:
            assert im.getchannel('A').getextrema()[0] == 0, 'Real alpha required'
            bounds = im.getchannel('A').getbbox()
            im = im.crop(bounds)
            scale = 360 / im.height if name == 'cypress' else 186 / im.height if name == 'pier' else 960 / im.width
            im = im.resize((round(im.width * scale), round(im.height * scale)), Image.Resampling.LANCZOS)
        else:
            bounds = None
            im = im.resize((768, 768), Image.Resampling.LANCZOS)
        anchor = [im.width // 2, im.height - 16 if name == 'cypress' else im.height - 8 if name == 'pier' else im.height // 2]
        key = 'a2visual_' + name
        dest = ART / 'world/props' / (key + '.png')
        packed = ROOT / 'assets/sprites/packed/world/props' / (key + '.webp')
        im.save(dest)
        im.save(packed, lossless=True, exact=True)
        asset_id = 'world.prop.' + key
        provenance = dict(method='imagegen-act2-visual', source=source.relative_to(ROOT).as_posix(), sourceSha256=digest(source), crop=bounds)
        payload['descriptors']['prop:' + key] = dict(sourceKind='authored-final-aligned', review='act2-visual-v1', role='prop', key=key,
            path=dest.relative_to(ROOT).as_posix(), sha256=digest(dest), kind='static', size=list(im.size), anchor=anchor,
            bundle='world', assetId=asset_id, lossless=True, provenance=provenance)
        manifest['entries'][asset_id] = dict(src=packed.relative_to(ROOT).as_posix(), revision=digest(packed)[:12], kind='static', anchor=anchor, bundle='world')
        manifest['maps']['props'][key] = asset_id
        records.append(dict(name=name, size=list(im.size), anchor=anchor, **provenance))
    write_text(payload_path, json.dumps(payload, indent=2, sort_keys=True) + '\n')
    write_text(manifest_path, text[:text.index('{')] + json.dumps(manifest, indent=2, sort_keys=True) + ';\n')
    path = ROOT / 'js/data.js'
    data = path.read_text(encoding='utf-8')
    start, end = '  /* Act II visual materials v1. */', '  /* End Act II visual materials v1. */'
    if start in data:
        data = data[:data.index(start)] + data[data.index(end) + len(end):].lstrip('\n')
    at = data.index('  /* Act I landscape polish v2. */')
    block = start + '\n' + '\n'.join('  prop_a2visual_' + r['name'] + ': { src: "assets/sprites_src/gameplay_art/world/props/a2visual_' + r['name'] + '.png", raw: true },' for r in records) + '\n' + end + '\n'
    write_text(path, data[:at] + block + data[at:])
    path = ROOT / 'assets/sprites/coverage.json'
    coverage = json.loads(path.read_text())
    coverage.update(assetCount=len(manifest['entries']), props=sorted(manifest['maps']['props']))
    write_text(path, json.dumps(coverage, indent=2, sort_keys=True) + '\n')
    write_text(AUTH / 'registration.json', json.dumps(records, indent=2) + '\n')
    print('Registered five Act II visual assets.')

if __name__ == '__main__':
    main()
