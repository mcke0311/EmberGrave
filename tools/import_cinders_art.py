"""Mechanically register the fourteen reviewed ImageGen Act V source sprites.

Preserves native alpha. Only trims empty margins, resizes uniformly, registers
ground anchors, and encodes the existing compiler's final-aligned WebPs.
"""
from pathlib import Path
import hashlib
import json
from PIL import Image
import build_sprite_assets as compiler

ROOT = Path(__file__).resolve().parents[1]
AUTH = ROOT / 'assets/sprites_src/gameplay_art_authored/cinders'
ART = ROOT / 'assets/sprites_src/gameplay_art'
# Width in production pixels; anchor inset from the visible front of the base.
PARTS = {
    'breach_gate': (370, 64), 'bastion_gate': (440, 65),
    'bastion_return': (360, 65), 'throne_gate': (470, 57),
    'throne_return': (360, 53), 'siege_tower': (295, 44),
    'siege_engine': (315, 43), 'impaled_monument': (305, 42),
    'furnace_forge': (365, 48), 'fallen_statue': (320, 42),
    'throne_backdrop': (470, 60), 'ash_drifts': (490, 'center'),
    'ceremonial_paving': (440, 'center'), 'chain_rubble': (285, 'center'),
}

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def main():
    missing = [name for name in PARTS if not (AUTH / (name + '.png')).exists()]
    if missing:
        raise ValueError('Missing authored originals: ' + ', '.join(missing))
    payload_path = ART / 'gameplay_art_v1.json'
    payload = json.loads(payload_path.read_text())
    descriptors, qa = [], []
    for name, (width, inset) in PARTS.items():
        origin = AUTH / (name + '.png')
        with Image.open(origin) as source:
            source = source.convert('RGBA')
            low, high = source.getchannel('A').getextrema()
            if low != 0 or high < 200:
                raise ValueError('Source needs native transparency: ' + name)
            bounds = source.getchannel('A').getbbox()
            cut = source.crop(bounds)
            image = cut.resize((width, round(cut.height * width / cut.width)), Image.Resampling.LANCZOS)
        anchor = [width // 2, image.height // 2 if inset == 'center' else image.height - inset]
        key = 'cinders_' + name
        path = ART / 'world/props' / (key + '.png')
        image.save(path)
        d = dict(sourceKind='authored-final-aligned', review='cinders-in-game-v1', role='prop', key=key,
                 path=path.relative_to(ROOT).as_posix(), sha256=digest(path), kind='static', size=list(image.size),
                 anchor=anchor, bundle='world', assetId='world.prop.' + key,
                 provenance=dict(method='imagegen-cinders-registration-v1', source=origin.relative_to(ROOT).as_posix(),
                                 sourceSha256=digest(origin), parameters=dict(alphaBounds=list(bounds), width=width,
                                     baseInset=inset, transparency='native-alpha')))
        payload['descriptors']['prop:' + key] = d
        descriptors.append(d)
        qa.append(dict(key=key, size=list(image.size), anchor=anchor, alphaRange=image.getchannel('A').getextrema()))
    payload_path.write_text(json.dumps(payload, indent=2, sort_keys=True) + '\n')
    path = ROOT / 'js/data.js'
    data = path.read_bytes().decode('utf-8')
    start, end = '  /* Cinder kingdom library v1. */', '  /* End cinder kingdom library v1. */'
    if start in data:
        data = data[:data.index(start)] + data[data.index(end) + len(end):].lstrip('\r\n')
    lines = [start] + ['  prop_' + d['key'] + ': { src: "' + d['path'] + '", raw: true },' for d in descriptors] + [end]
    at = data.index('  /* Town architecture library v2. */')
    path.write_bytes((data[:at] + '\r\n'.join(lines) + '\r\n' + data[at:]).encode('utf-8'))
    path = ROOT / 'js/sprite_manifest.js'
    text = path.read_text()
    runtime = json.loads(text[text.index('{'):].strip().removesuffix(';'))
    for d in descriptors:
        runtime['entries'][d['assetId']] = compiler.static_entry(compiler._copy_final_aligned_source(d), tuple(d['anchor']), d['bundle'])
        runtime['maps']['props'][d['key']] = d['assetId']
    path.write_text(text[:text.index('{')] + json.dumps(runtime, indent=2, sort_keys=True) + ';\n')
    path = ROOT / 'assets/sprites/coverage.json'
    coverage = json.loads(path.read_text())
    coverage.update(assetCount=len(runtime['entries']), props=sorted(runtime['maps']['props']))
    path.write_text(json.dumps(coverage, indent=2, sort_keys=True) + '\n')
    (AUTH / 'registration.json').write_text(json.dumps(qa, indent=2) + '\n')
    print('Registered and packed', len(descriptors), 'cinder kingdom assets.')

if __name__ == '__main__':
    main()
