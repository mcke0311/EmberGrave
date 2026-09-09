"""Crop and register the original Act III material atlas without repainting it."""
import json
from PIL import Image
import build_sprite_assets as compiler
from import_act4_environment import ROOT, ART, sha, write_text

AUTH = ROOT / 'assets/sprites_src/gameplay_art_authored/act3_visual'
KEYS = ['sand', 'sandstone', 'slate', 'palace', 'sun', 'eclipse']


def main():
    source = AUTH / 'materials.png'
    sheet = Image.open(source).convert('RGBA')
    payload_path = ART / 'gameplay_art_v1.json'
    manifest_path = ROOT / 'js/sprite_manifest.js'
    payload = json.loads(payload_path.read_text())
    text = manifest_path.read_text()
    runtime = json.loads(text[text.index('{'):].strip().removesuffix(';'))
    descriptors = []
    sources = [(source, sheet, i, name, 3, 2, (768, 768)) for i, name in enumerate(KEYS)]
    walls = AUTH / 'walls.png'
    wall_sheet = Image.open(walls).convert('RGBA')
    sources += [(walls, wall_sheet, i, 'wall_' + name, 2, 2, (384, 288))
                for i, name in enumerate(['sandstone', 'tomb', 'palace', 'sovereign'])]
    for source, sheet, i, name, cols, rows, size in sources:
        key = 'a3visual_' + name
        box = [i % cols * sheet.width // cols, i // cols * sheet.height // rows,
               (i % cols + 1) * sheet.width // cols, (i // cols + 1) * sheet.height // rows]
        image = sheet.crop(box).resize(size, Image.Resampling.LANCZOS)
        anchor = (size[0] // 2, size[1] // 2)
        dest = ART / 'world/props' / (key + '.png')
        image.save(dest)
        d = dict(sourceKind='authored-final-aligned', review='act3-visual', role='prop', key=key,
                 path=dest.relative_to(ROOT).as_posix(), sha256=sha(dest), kind='static',
                 size=list(size), anchor=list(anchor), bundle='world', assetId='world.prop.' + key,
                 lossless=True, provenance=dict(method='imagegen-act3-materials',
                 source=source.relative_to(ROOT).as_posix(), sourceSha256=sha(source),
                 parameters=dict(box=box, alphaMethod='opaque-material', scale=size[0]/(box[2]-box[0]))))
        payload['descriptors']['prop:' + key] = d
        runtime['entries'][d['assetId']] = compiler.static_entry(compiler._copy_final_aligned_source(d), anchor, 'world')
        runtime['maps']['props'][key] = d['assetId']
        descriptors.append(d)
    write_text(payload_path, json.dumps(payload, indent=2, sort_keys=True) + '\n')
    write_text(manifest_path, text[:text.index('{')] + json.dumps(runtime, indent=2, sort_keys=True) + ';\n')
    path = ROOT / 'js/data.js'
    data = path.read_text(encoding='utf-8')
    start, end = '  /* Act 3 visual materials. */', '  /* End Act 3 visual materials. */'
    if start in data:
        a, b = data.index(start), data.index(end) + len(end)
        data = data[:a] + data[b:].lstrip('\n')
    at = data.index('  /* Act 4 floor inlays. */')
    block = start + '\n' + '\n'.join('  prop_' + d['key'] + ': { src: "' + d['path'] + '", raw: true },' for d in descriptors) + '\n' + end + '\n'
    write_text(path, data[:at] + block + data[at:])
    write_text(AUTH / 'registration.json', json.dumps(descriptors, indent=2) + '\n')
    path = ROOT / 'assets/sprites/coverage.json'
    coverage = json.loads(path.read_text())
    coverage.update(assetCount=len(runtime['entries']), props=sorted(runtime['maps']['props']))
    write_text(path, json.dumps(coverage, indent=2, sort_keys=True) + '\n')
    print('Registered ten Act III visual materials')


if __name__ == '__main__':
    main()
