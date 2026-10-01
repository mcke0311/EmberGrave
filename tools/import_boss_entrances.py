"""Register destination-specific boss entrances from built-in image_gen sources.

Only transparent-margin cropping, uniform scaling and lossless packing are used.
Existing arena sheets and registrations remain intact.
"""
from pathlib import Path
import hashlib
import json
import shutil
import sys
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
AUTH = ROOT / 'assets/sprites_src/gameplay_art_authored/boss_entrances'
ART = ROOT / 'assets/sprites_src/gameplay_art'
digest = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()


def main():
    AUTH.mkdir(parents=True, exist_ok=True)
    if '--check' in sys.argv:
        rows = json.loads((AUTH / 'registration.json').read_text())['assets']
        for row in rows:
            for key, hash_key in [('source', 'sourceHash'), ('path', 'hash'), ('packed', 'packedHash')]:
                assert digest(ROOT / row[key]) == row[hash_key], row[key]
            with Image.open(ROOT / row['path']) as im, Image.open(ROOT / row['packed']) as packed:
                assert im.convert('RGBA').tobytes() == packed.convert('RGBA').tobytes(), row['key']
                assert im.getchannel('A').getextrema() == (0, 255), row['key']
        print('PASS: six boss entrances, provenance, alpha and lossless packing')
        return
    if not (AUTH / 'prompts.json').exists():
        generated = json.loads((ROOT / 'tmp/boss_entrances/sources.json').read_text())
        sources = []
        for row in generated['assets']:
            dest = AUTH / (row['boss'] + '.png')
            shutil.copyfile(row['path'], dest)
            sources.append(dict(boss=row['boss'], source=dest.relative_to(ROOT).as_posix(), prompt=row['prompt']))
        (AUTH / 'prompts.json').write_text(json.dumps(dict(tool='built-in image_gen', assets=sources), indent=2) + '\n')
    sources = json.loads((AUTH / 'prompts.json').read_text())['assets']
    manifest_path = ROOT / 'js/sprite_manifest.js'
    text = manifest_path.read_text(encoding='utf-8')
    manifest = json.loads(text[text.index('{'):].strip().removesuffix(';'))
    ledger_path = ART / 'gameplay_art_v1.json'
    ledger = json.loads(ledger_path.read_text())
    rows = []
    for row in sources:
        boss = row['boss']
        source = ROOT / row['source']
        im = Image.open(source).convert('RGBA')
        box = im.getchannel('A').getbbox()
        part = im.crop(box)
        scale = min(250 / part.height, 235 / part.width)
        part = part.resize((round(part.width * scale), round(part.height * scale)), Image.Resampling.LANCZOS)
        anchor = [part.width // 2, round(part.height * .9)]
        key = 'boss_entrance_' + boss
        asset_id = 'world.prop.' + key
        bundle = 'arena:' + boss
        path = ART / 'world/props' / (key + '.png')
        packed = ROOT / 'assets/sprites/packed/world/props' / (key + '.webp')
        part.save(path)
        part.save(packed, lossless=True, exact=True)
        ledger['descriptors']['prop:' + key] = dict(
            sourceKind='authored-final-aligned', review='boss-entrances-v1', role='prop', key=key,
            path=path.relative_to(ROOT).as_posix(), sha256=digest(path), kind='static',
            size=list(part.size), anchor=anchor, bundle=bundle, assetId=asset_id, lossless=True,
            provenance=dict(method='imagegen-boss-entrances-v1', source=row['source'],
                sourceSha256=digest(source), parameters=dict(box=box, uniformScale=scale,
                    importReport=AUTH.relative_to(ROOT).as_posix() + '/registration.json')))
        manifest['entries'][asset_id] = dict(src=packed.relative_to(ROOT).as_posix(),
            revision=digest(packed)[:12], kind='static', anchor=anchor, bundle=bundle)
        manifest['maps']['props'][key] = asset_id
        rows.append(dict(key=key, source=row['source'], sourceHash=digest(source), box=box, scale=scale,
            size=list(part.size), anchor=anchor, path=path.relative_to(ROOT).as_posix(), hash=digest(path),
            packed=packed.relative_to(ROOT).as_posix(), packedHash=digest(packed)))
    ledger_path.write_text(json.dumps(ledger, indent=2, sort_keys=True) + '\n')
    manifest_path.write_text(text[:text.index('{')] + json.dumps(manifest, indent=2, sort_keys=True) + ';\n', encoding='utf-8')
    data_path = ROOT / 'js/data.js'
    data = data_path.read_bytes().decode('utf-8')
    start, end = '  /* Boss destination entrance art. */', '  /* End boss destination entrance art. */'
    if start in data:
        data = data[:data.index(start)] + data[data.index(end) + len(end):].lstrip('\r\n')
    at = data.index('  /* Dedicated boss arena art. */')
    block = start + '\n' + '\n'.join(f'  prop_{r["key"]}: {{ src: "{r["path"]}", raw: true }},' for r in rows) + '\n' + end + '\n'
    data_path.write_bytes((data[:at] + block + data[at:]).encode('utf-8'))
    coverage_path = ROOT / 'assets/sprites/coverage.json'
    coverage = json.loads(coverage_path.read_text())
    coverage.update(assetCount=len(manifest['entries']), props=sorted(manifest['maps']['props']))
    coverage_path.write_text(json.dumps(coverage, indent=2, sort_keys=True) + '\n')
    (AUTH / 'registration.json').write_text(json.dumps(dict(
        method='transparent-margin crop, uniform scaling, lossless WebP', assets=rows), indent=2) + '\n')
    print('Registered six destination-specific boss entrances')


if __name__ == '__main__':
    main()
