"""Register the Act IV stone painting; uniform resize and lossless packing."""
from pathlib import Path
import hashlib
import json
from PIL import Image
import build_sprite_assets as compiler
from import_act2_boundaries import write_text

ROOT = Path(__file__).resolve().parents[1]
AUTH = ROOT / 'assets/sprites_src/gameplay_art_authored/act4_restoration'
ART = ROOT / 'assets/sprites_src/gameplay_art'
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()

def main():
    descriptors = []
    for key, filename, width in [('a4stone_paving','stone_source.png',512),('cathedral_pews','pews_source.png',240)]:
        source = AUTH / filename
        image = Image.open(source).convert('RGBA')
        bounds = image.getchannel('A').point(lambda a:255 if a>12 else 0).getbbox()
        image = image.crop(bounds)
        scale = width/image.width
        image = image.resize((width,round(image.height*scale)),Image.Resampling.LANCZOS)
        anchor = [width//2,round(image.height*(.68 if key=='cathedral_pews' else .5))]
        dest = ART / 'world/props' / (key + '.png')
        image.save(dest)
        descriptor = dict(sourceKind='authored-final-aligned', review='act4-restoration',
            role='prop', key=key, path=dest.relative_to(ROOT).as_posix(), sha256=sha(dest),
            kind='static', size=list(image.size), anchor=anchor, bundle='world',
            assetId='world.prop.'+key, lossless=True,
            provenance=dict(method='imagegen-act4-restoration', source=source.relative_to(ROOT).as_posix(),
                sourceSha256=sha(source), parameters=dict(alphaMethod='native-alpha' if key=='cathedral_pews' else 'opaque-material',alphaBounds=list(bounds),scale=scale)))
        descriptors.append(descriptor)
    payload_path = ART / 'gameplay_art_v1.json'
    payload = json.loads(payload_path.read_text(encoding='utf-8'))
    for descriptor in descriptors:
        payload['descriptors']['prop:'+descriptor['key']] = descriptor
    write_text(payload_path, json.dumps(payload,indent=2,sort_keys=True)+'\n')
    manifest_path = ROOT / 'js/sprite_manifest.js'
    text = manifest_path.read_text(encoding='utf-8')
    manifest = json.loads(text[text.index('{'):].strip().removesuffix(';'))
    for descriptor in descriptors:
        manifest['entries'][descriptor['assetId']] = compiler.static_entry(compiler._copy_final_aligned_source(descriptor),tuple(descriptor['anchor']),'world')
        manifest['maps']['props'][descriptor['key']] = descriptor['assetId']
    write_text(manifest_path,text[:text.index('{')]+json.dumps(manifest,indent=2,sort_keys=True)+';\n')
    data_path = ROOT / 'js/data.js'
    data = data_path.read_text(encoding='utf-8')
    for descriptor in descriptors:
        key = descriptor['key']
        if '  prop_'+key+':' not in data:
            at = data.index('  /* Act 4 floor inlays. */')
            data = data[:at]+'  prop_'+key+': { src: "'+descriptor['path']+'", raw: true },\n'+data[at:]
    write_text(data_path,data)
    coverage_path = ROOT / 'assets/sprites/coverage.json'
    coverage = json.loads(coverage_path.read_text(encoding='utf-8'))
    coverage.update(assetCount=len(manifest['entries']),props=sorted(manifest['maps']['props']))
    write_text(coverage_path,json.dumps(coverage,indent=2,sort_keys=True)+'\n')
    write_text(AUTH/'registration.json',json.dumps(descriptors,indent=2)+'\n')
    print('Registered '+', '.join(d['key'] for d in descriptors))

if __name__ == '__main__':
    main()
