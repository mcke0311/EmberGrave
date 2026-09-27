"""Import generated transparent Act I prop art without repainting pixels.

Retains generation prompts and hashes; rebuilds static lossless runtime sprites,
anchors, source descriptors, coverage, and the normal sprite build inputs.
"""
import hashlib
import json
from pathlib import Path
from PIL import Image
from import_prop_interactions import write

ROOT = Path(__file__).resolve().parents[1]
AUTH = ROOT / 'assets/sprites_src/gameplay_art_authored/act1_habitats'
ART = ROOT / 'assets/sprites_src/gameplay_art'
SPECS = {
    'shardpeak_memorial': (255, 205),
    'shardpeak_prayer_flags': (235, 225),
    'shardpeak_gatehouse': (285, 245),
    'shardpeak_windbreak': (260, 195),
    'mine_crystal': (92, 96),
    'mine_crystal_broken': (92, 42),
}

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def visible_bounds(im):
    # Generated RGBA may contain isolated almost-invisible pixels far outside
    # the silhouette. Use visible alpha for cropping, preserving source alpha.
    b = im.getchannel('A').point(lambda a: 255 if a >= 32 else 0).getbbox()
    return (max(0, b[0] - 3), max(0, b[1] - 3), min(im.width, b[2] + 3), min(im.height, b[3] + 3))

def main():
    payload_path = ART / 'gameplay_art_v1.json'
    payload = json.loads(payload_path.read_text())
    manifest_path = ROOT / 'js/sprite_manifest.js'
    text = manifest_path.read_text()
    manifest = json.loads(text[text.index('{'):].strip().removesuffix(';'))
    report = {'revision': 1, 'method': 'built-in-imagegen-alpha-crop-uniform-scale', 'sources': {}}
    crystal = Image.open(AUTH / 'mine_crystal.png')
    crystal_box = visible_bounds(crystal)
    crystal_scale = min(92 / (crystal_box[2] - crystal_box[0]), 96 / (crystal_box[3] - crystal_box[1]))
    crystal_ground = crystal_box[3] - 36
    for name, (max_width, max_height) in SPECS.items():
        source = AUTH / (name + '.png')
        original = Image.open(source)
        if original.mode != 'RGBA' or original.getchannel('A').getextrema()[0] != 0:
            raise ValueError('Generated alpha transparency required: ' + name)
        crop = visible_bounds(original)
        im = original.crop(crop)
        factor = min(max_width / im.width, max_height / im.height)
        if name.startswith('mine_crystal'):
            factor = crystal_scale
        im = im.resize((round(im.width * factor), round(im.height * factor)), Image.Resampling.LANCZOS)
        anchor = [im.width // 2, im.height - max(3, round(im.height * .045))]
        if name.startswith('mine_crystal'):
            anchor = [round((crystal.width / 2 - crop[0]) * factor), round((crystal_ground - crop[1]) * factor)]
        output = ART / 'world/props' / (name + '.png')
        packed = ROOT / 'assets/sprites/packed/world/props' / (name + '.webp')
        im.save(output)
        im.save(packed, lossless=True, exact=True)
        aid = 'world.prop.' + name
        parameters = {'crop': list(crop), 'scale': factor, 'importReport': (AUTH / 'import.json').relative_to(ROOT).as_posix()}
        payload['descriptors']['prop:' + name] = dict(sourceKind='authored-final-aligned', review='act1-habitats-v1', role='prop', key=name,
            path=output.relative_to(ROOT).as_posix(), sha256=sha(output), kind='static', size=list(im.size), anchor=anchor,
            bundle='world', assetId=aid, lossless=True, provenance=dict(method='imagegen-act1-habitats-v1',
                source=source.relative_to(ROOT).as_posix(), sourceSha256=sha(source), parameters=parameters))
        manifest['entries'][aid] = dict(src=packed.relative_to(ROOT).as_posix(), revision=sha(packed)[:12], kind='static', anchor=anchor, bundle='world')
        manifest['maps']['props'][name] = aid
        report['sources'][name] = dict(source=source.relative_to(ROOT).as_posix(), sourceHash=sha(source),
            prompt=(AUTH / (name + '.prompt.txt')).relative_to(ROOT).as_posix(), output=packed.relative_to(ROOT).as_posix(), outputHash=sha(packed),
            size=list(im.size), anchor=anchor, **parameters)
    write(payload_path, json.dumps(payload, indent=2, sort_keys=True) + '\n')
    write(manifest_path, text[:text.index('{')] + json.dumps(manifest, indent=2, sort_keys=True) + ';\n')
    write(AUTH / 'import.json', json.dumps(report, indent=2) + '\n')
    path = ROOT / 'js/data.js'
    data = path.read_text(encoding='utf-8')
    start, end = '  /* Act I habitats artwork. */', '  /* End Act I habitats artwork. */'
    if start in data:
        data = data[:data.index(start)] + data[data.index(end) + len(end):].lstrip('\n')
    at = data.index('  /* Act I landscape polish v2. */')
    block = start + '\n' + '\n'.join('  prop_' + name + ': { src: "assets/sprites_src/gameplay_art/world/props/' + name + '.png", raw: true },' for name in SPECS) + '\n' + end + '\n'
    write(path, data[:at] + block + data[at:])
    path = ROOT / 'assets/sprites/coverage.json'
    coverage = json.loads(path.read_text())
    coverage.update(assetCount=len(manifest['entries']), props=sorted(manifest['maps']['props']))
    write(path, json.dumps(coverage, indent=2, sort_keys=True) + '\n')
    print('Imported six Act I habitat and Shardpeak sprites.')

if __name__ == '__main__':
    main()
