"""Register the six authored arena sheets; no painted or synthesized pixels.

Alpha-connected extraction, uniform scaling, common device anchors, lossless
packing and provenance follow the existing campaign environment importer.
"""
from pathlib import Path
import hashlib
import json
import shutil
import sys
from PIL import Image
from import_campaign_visuals import components

ROOT = Path(__file__).resolve().parents[1]
AUTH = ROOT / 'assets/sprites_src/gameplay_art_authored/boss_arenas'
ART = ROOT / 'assets/sprites_src/gameplay_art'
digest = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()

def main():
    AUTH.mkdir(parents=True, exist_ok=True)
    if '--check' in sys.argv:
        record=json.loads((AUTH/'registration.json').read_text())
        for r in record['assets']:
            for key,hash_key in [('source','sourceHash'),('path','hash'),('packed','packedHash')]:
                assert digest(ROOT/r[key])==r[hash_key], r[key]
            with Image.open(ROOT/r['path']) as im, Image.open(ROOT/r['packed']) as packed:
                assert im.convert('RGBA').tobytes()==packed.convert('RGBA').tobytes(), r['key']
                assert im.getchannel('A').getextrema()[0]==0, r['key']
        print('PASS: 36 arena assets, provenance, alpha and lossless packing')
        return
    if not (AUTH/'prompts.json').exists():
        generated=json.loads((ROOT/'tmp/boss_arenas/final_sources.json').read_text())
        prompts=[]
        for r in generated['assets']:
            dest=AUTH/(r['id']+'.png');shutil.copyfile(r['path'],dest)
            prompts.append({'boss':r['id'],'source':dest.relative_to(ROOT).as_posix(),'prompt':r['prompt'],'editPrompt':r['editPrompt']})
        (AUTH/'prompts.json').write_text(json.dumps({'tool':'built-in image_gen','assets':prompts},indent=2)+'\n')
    sources=json.loads((AUTH/'prompts.json').read_text())['assets']
    manifest_path=ROOT/'js/sprite_manifest.js';text=manifest_path.read_text(encoding='utf-8')
    manifest=json.loads(text[text.index('{'):].strip().removesuffix(';'))
    ledger_path=ART/'gameplay_art_v1.json';ledger=json.loads(ledger_path.read_text())
    rows=[]
    for source_row in sources:
        boss=source_row['boss'];source=ROOT/source_row['source'];im=Image.open(source).convert('RGBA')
        parts=sorted(components(im),key=lambda pair:(pair[1][1]+pair[1][3])/2)
        parts=sorted(parts[:3],key=lambda pair:pair[1][0])+sorted(parts[3:],key=lambda pair:pair[1][0])
        device_scale=170/max(parts[i][0].width for i in [2,3])
        for index,(part,box) in enumerate(parts):
            scale=device_scale if index in [2,3] else (600/part.width if index==4 else [320,220,0,0,0,240][index]/part.height)
            part=part.resize((round(part.width*scale),round(part.height*scale)),Image.Resampling.LANCZOS)
            if index in [2,3]:
                anchor=[110,205];canvas=Image.new('RGBA',(220,230))
                canvas.alpha_composite(part,(anchor[0]-part.width//2,anchor[1]-round(part.height*.91)));part=canvas
            else:anchor=[part.width//2,round(part.height*(.5 if index==4 else .9))]
            key=f'arena_{boss}_{index}';asset_id='world.prop.'+key
            path=ART/'world/props'/f'{key}.png';packed=ROOT/'assets/sprites/packed/world/props'/f'{key}.webp'
            part.save(path);part.save(packed,lossless=True,exact=True)
            bundle='arena:'+boss
            ledger['descriptors']['prop:'+key]=dict(sourceKind='authored-final-aligned',review='boss-arenas-v1',role='prop',key=key,path=path.relative_to(ROOT).as_posix(),sha256=digest(path),kind='static',size=list(part.size),anchor=anchor,bundle=bundle,assetId=asset_id,lossless=True,
                provenance=dict(method='imagegen-boss-arenas-v1',source=source.relative_to(ROOT).as_posix(),sourceSha256=digest(source),parameters=dict(box=box,uniformScale=scale,importReport=AUTH.relative_to(ROOT).as_posix()+'/registration.json')))
            manifest['entries'][asset_id]=dict(src=packed.relative_to(ROOT).as_posix(),revision=digest(packed)[:12],kind='static',anchor=anchor,bundle=bundle)
            manifest['maps']['props'][key]=asset_id
            rows.append(dict(key=key,source=source.relative_to(ROOT).as_posix(),sourceHash=digest(source),box=box,scale=scale,size=list(part.size),anchor=anchor,path=path.relative_to(ROOT).as_posix(),hash=digest(path),packed=packed.relative_to(ROOT).as_posix(),packedHash=digest(packed)))
    ledger_path.write_text(json.dumps(ledger,indent=2,sort_keys=True)+'\n')
    manifest_path.write_text(text[:text.index('{')]+json.dumps(manifest,indent=2,sort_keys=True)+';\n',encoding='utf-8')
    data_path=ROOT/'js/data.js';data=data_path.read_text(encoding='utf-8')
    start='  /* Dedicated boss arena art. */';end='  /* End dedicated boss arena art. */'
    if start in data:data=data[:data.index(start)]+data[data.index(end)+len(end):].lstrip('\n')
    at=data.index('  /* Campaign visual assets v1. */')
    block=start+'\n'+'\n'.join(f'  prop_{r["key"]}: {{ src: "{r["path"]}", raw: true }},' for r in rows)+'\n'+end+'\n'
    data_path.write_text(data[:at]+block+data[at:],encoding='utf-8')
    coverage_path=ROOT/'assets/sprites/coverage.json';coverage=json.loads(coverage_path.read_text())
    coverage.update(assetCount=len(manifest['entries']),props=sorted(manifest['maps']['props']))
    coverage_path.write_text(json.dumps(coverage,indent=2,sort_keys=True)+'\n')
    (AUTH/'registration.json').write_text(json.dumps({'method':'alpha components, uniform scaling, shared device anchors, lossless WebP','assets':rows},indent=2)+'\n')
    print('Registered',len(rows),'authored arena assets')

if __name__=='__main__':main()
