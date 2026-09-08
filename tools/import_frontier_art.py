"""Register ImageGen's reviewed frontier atlases in the authored sprite pipeline.

Mechanical preparation only: decode the authored green technical matte, crop
fixed cells, trim transparent margins, scale uniformly, and pack final pixels.
Artwork and matte boundaries are supplied by ImageGen, never painted here.
"""
from pathlib import Path
import hashlib
import json
from PIL import Image
import build_sprite_assets as compiler

ROOT = Path(__file__).resolve().parents[1]
AUTH = ROOT / 'assets/sprites_src/gameplay_art_authored/frontier'
ART = ROOT / 'assets/sprites_src/gameplay_art'
PARTS = {
    'architecture': [('watchtower', 312, 47), ('tollhouse', 334, 47), ('minehead', 358, 55),
                     ('supports', 290, 42), ('temple', 410, 65), ('memorial', 292, 43)],
    'pilgrimage': [('pilgrim_stones', 240, 32), ('shelter', 288, 40), ('summit', 364, 54),
                   ('ice_ribs', 300, 40), ('ice_arch', 330, 47), ('spring', 500, 'center')],
    'ground': [('tracks', 184, 'center'), ('paving', 280, 'center'), ('rubble', 240, 'center')],
}

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def decode_matte(image):
    """Convert ImageGen's green matte to alpha without touching white snow.

    Straight alpha is recovered from excess green. Mixed boundary pixels have
    their technical green contribution removed before uniform resampling.
    """
    image = image.convert('RGBA')
    out = []
    for red, green, blue, alpha in image.getdata():
        excess = max(0, green - max(red, blue))
        if green > 125 and excess > 95:
            out.append((red, min(green, max(red, blue)), blue, 0))
        elif excess > 15:
            coverage = 1 - min(1, excess / 190)
            out.append((red, min(green, max(red, blue)), blue, round(alpha * coverage)))
        else:
            out.append((red, green, blue, alpha))
    image.putdata(out)
    return image

def main():
    payload_path = ART / 'gameplay_art_v1.json'
    payload = json.loads(payload_path.read_text())
    descriptors = []
    qa = []
    for sheet_name, parts in PARTS.items():
        origin = AUTH / (sheet_name + '.png')
        source = Image.open(origin)
        sheet = decode_matte(source) if sheet_name != 'ground' else source.convert('RGBA')
        if sheet.getchannel('A').getextrema()[0] != 0:
            raise ValueError('Atlas has no transparent background: ' + sheet_name)
        sheet.save(AUTH / (sheet_name + '_alpha.png'))
        rows = 1 if sheet_name == 'ground' else 2
        for n, (part, width, inset) in enumerate(parts):
            x, y = n % 3, n // 3
            box = [round(x * sheet.width / 3), round(y * sheet.height / rows),
                   round((x + 1) * sheet.width / 3), round((y + 1) * sheet.height / rows)]
            cut = sheet.crop(box)
            bounds = cut.getchannel('A').point(lambda a: 255 if a > 12 else 0).getbbox()
            if not bounds:
                raise ValueError('Empty authored cell: ' + part)
            cut = cut.crop(bounds)
            image = cut.resize((width, round(cut.height * width / cut.width)), Image.Resampling.LANCZOS)
            anchor = [width // 2, image.height // 2 if inset == 'center' else image.height - inset]
            key = 'frontier_' + part
            path = ART / 'world/props' / (key + '.png')
            image.save(path)
            d = dict(sourceKind='authored-final-aligned', review='visual-contact-sheet-v1', role='prop', key=key,
                     path=path.relative_to(ROOT).as_posix(), sha256=digest(path), kind='static', size=list(image.size),
                     anchor=anchor, bundle='world', assetId='world.prop.' + key,
                     provenance=dict(method='imagegen-frontier-registration-v1', source=origin.relative_to(ROOT).as_posix(),
                                     sourceSha256=digest(origin), parameters=dict(cell=box, alphaBounds=list(bounds),
                                         width=width, baseInset=inset, technicalMatte='green' if rows == 2 else 'native-alpha')))
            payload['descriptors']['prop:' + key] = d
            descriptors.append(d)
            qa.append(dict(key=key, size=list(image.size), anchor=anchor, alphaRange=image.getchannel('A').getextrema()))
    payload_path.write_text(json.dumps(payload, indent=2, sort_keys=True) + '\n')
    path = ROOT / 'js/data.js'
    data = path.read_bytes().decode('utf-8')
    start, end = '  /* Frontier landmark library v1. */', '  /* End frontier landmark library v1. */'
    if start in data:
        suffix = data[data.index(end) + len(end):].lstrip('\r\n')
        data = data[:data.index(start)] + suffix
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
    print('Registered and packed', len(descriptors), 'frontier assets.')

if __name__ == '__main__':
    main()
