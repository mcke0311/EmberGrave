"""Mechanically register the reviewed Act 2 ImageGen artwork.

The generated technical magenta matte is decoded to real RGBA; no artwork is
painted or synthesized. Native alpha, when present, is retained. Packing only
copies the final aligned pixels, exactly as the existing authored pipeline does.
"""
from pathlib import Path
import hashlib
import json
from PIL import Image, ImageDraw
import build_sprite_assets as compiler

ROOT = Path(__file__).resolve().parents[1]
AUTH = ROOT / 'assets/sprites_src/gameplay_art_authored/act2'
ART = ROOT / 'assets/sprites_src/gameplay_art'

def digest(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()

def write_source_manifest():
    specs = json.loads((AUTH / 'prompts.json').read_text())
    paths = [*sorted(AUTH.glob('*.png')), AUTH / 'prompts.json', ROOT / specs['reference']]
    sources = {p.relative_to(ROOT).as_posix(): digest(p) for p in paths}
    (AUTH / 'source_hashes.json').write_text(json.dumps(sources, indent=2) + '\n')

def decode(image):
    image = image.convert('RGBA')
    if image.getchannel('A').getextrema()[0] == 0:
        return image, 'native-alpha'
    import numpy as np
    pixels = np.array(image).astype(float)
    red, green, blue = [pixels[:, :, i] for i in range(3)]
    excess = np.minimum(red, blue) - green
    background = (red > 145) & (blue > 145) & (excess > 100)
    fringe = (excess > 25) & ~background
    pixels[background, 3] = 0
    pixels[fringe, 3] *= 1 - np.clip(excess[fringe] / 230, 0, 1)
    # Remove only the matte's chromatic contribution on mixed boundary pixels.
    pixels[fringe, 0] -= excess[fringe] * .85
    pixels[fringe, 2] -= excess[fringe] * .85
    result = Image.fromarray(np.clip(pixels, 0, 255).astype('uint8'), 'RGBA')
    if result.getchannel('A').getextrema()[0] != 0:
        raise ValueError('Missing alpha or technical matte; regenerate the background')
    return result, 'magenta-extraction-matte'

def main():
    specs = json.loads((AUTH / 'prompts.json').read_text())
    payload_path = ART / 'gameplay_art_v1.json'
    payload = json.loads(payload_path.read_text())
    path = ROOT / 'js/sprite_manifest.js'
    text = path.read_text()
    runtime = json.loads(text[text.index('{'):].strip().removesuffix(';'))
    registered = []
    for spec in specs['assets']:
        name = spec['key']
        origin = AUTH / (('monastery_out_matte' if name == 'monastery_out' else name) + '.png')
        with Image.open(origin) as source:
            if spec['inset'] == 'material':
                image, method = source.convert('RGBA'), 'opaque-material'
                bounds = (0, 0, image.width, image.height)
            else:
                image, method = decode(source)
                bounds = image.getchannel('A').point(lambda a: 255 if a > 12 else 0).getbbox()
                if not bounds:
                    raise ValueError('Empty generated sprite: ' + name)
                image = image.crop(bounds)
            width = spec['width']
            image = image.resize((width, round(image.height * width / image.width)), Image.Resampling.LANCZOS)
            anchor = [width // 2, image.height // 2 if isinstance(spec['inset'], str) else image.height - spec['inset']]
            key = 'act2_' + name
            dest = ART / 'world/props' / (key + '.png')
            image.save(dest)
        d = dict(sourceKind='authored-final-aligned', review='visual-contact-sheet-v1', role='prop', key=key,
                 path=dest.relative_to(ROOT).as_posix(), sha256=digest(dest), kind='static', size=list(image.size),
                 anchor=anchor, bundle='world', assetId='world.prop.' + key,
                 provenance=dict(method='imagegen-act2-registration-v1', source=origin.relative_to(ROOT).as_posix(),
                                 sourceSha256=digest(origin), parameters=dict(alphaMethod=method, alphaBounds=list(bounds),
                                 width=width, baseInset=spec['inset'])))
        payload['descriptors']['prop:' + key] = d
        runtime['entries'][d['assetId']] = compiler.static_entry(compiler._copy_final_aligned_source(d), tuple(anchor), 'world')
        runtime['maps']['props'][key] = d['assetId']
        registered.append(d)
    payload_path.write_text(json.dumps(payload, indent=2, sort_keys=True) + '\n')
    path.write_text(text[:text.index('{')] + json.dumps(runtime, indent=2, sort_keys=True) + ';\n')
    path = ROOT / 'js/data.js'
    text = path.read_bytes().decode('utf-8')
    start, end = '  /* Act 2 environment library v1. */', '  /* End Act 2 environment library v1. */'
    if start in text:
        text = text[:text.index(start)] + text[text.index(end) + len(end):].lstrip('\r\n')
    lines = [start] + ['  prop_' + d['key'] + ': { src: "' + d['path'] + '", raw: true },' for d in registered] + [end]
    at = text.index('  /* Town architecture library v2. */')
    path.write_bytes((text[:at] + '\r\n'.join(lines) + '\r\n' + text[at:]).encode('utf-8'))
    coverage_path = ROOT / 'assets/sprites/coverage.json'
    coverage = json.loads(coverage_path.read_text())
    coverage.update(assetCount=len(runtime['entries']), props=sorted(runtime['maps']['props']))
    coverage_path.write_text(json.dumps(coverage, indent=2, sort_keys=True) + '\n')
    (AUTH / 'registration.json').write_text(json.dumps(registered, indent=2) + '\n')
    write_source_manifest()
    # A technical QA contact sheet, not generated game art.
    sheet = Image.new('RGB', (1200, 6 * 240), '#263a3b')
    draw = ImageDraw.Draw(sheet)
    for i, d in enumerate(registered):
        image = Image.open(ROOT / d['path']).convert('RGBA')
        image.thumbnail((280, 207))
        x, y = i % 4 * 300, i // 4 * 240
        sheet.paste(image, (x + (300 - image.width) // 2, y + 209 - image.height), image)
        draw.text((x + 12, y + 218), d['key'], fill='#e4dac0')
    sheet.save(ROOT / 'tests/qa/act2_redesign/art_contact_sheet.jpg', quality=93)
    print('Registered and packed', len(registered), 'Act 2 assets.')

if __name__ == '__main__':
    main()
