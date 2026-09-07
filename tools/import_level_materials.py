"""Register full-resolution existing painted materials for continuous terrain.
This imports the original pixels; no terrain art is generated or reconstructed.
"""
from pathlib import Path
import json
import hashlib
from PIL import Image
import build_sprite_assets as compiler

ROOT=Path(__file__).resolve().parents[1]
ART=ROOT/'assets/sprites_src/gameplay_art'

def main():
    path=ART/'gameplay_art_v1.json';payload=json.loads(path.read_text());updated=[]
    for tag,d in list(payload['descriptors'].items()):
        if d['role'] not in ('ground','hazard') or d['key'] in ('town','frosthaven','marshcamp','khalcamp','hellgate'):
            continue
        source=ROOT/d['provenance']['source']
        key='level_'+d['role']+'_'+d['key'];dest=ART/'world/props'/(key+'.png')
        image=Image.open(source).convert('RGBA');image.save(dest)
        descriptor=dict(sourceKind='authored-final-aligned',review='visual-contact-sheet-v1',role='prop',key=key,
            path=dest.relative_to(ROOT).as_posix(),sha256=hashlib.sha256(dest.read_bytes()).hexdigest(),kind='static',size=list(image.size),
            anchor=[0,0],bundle='world',assetId='world.prop.'+key,
            provenance=dict(method='painted-material-full-resolution-registration-v1',source=source.relative_to(ROOT).as_posix(),
                sourceSha256=hashlib.sha256(source.read_bytes()).hexdigest(),parameters=dict(operation='lossless-format-registration')))
        payload['descriptors']['prop:'+key]=descriptor;updated.append(descriptor)
    path.write_text(json.dumps(payload,indent=2,sort_keys=True)+'\n')
    path=ROOT/'js/data.js';data=path.read_text(encoding='utf-8')
    start,end='  /* Continuous level materials. */','  /* End continuous level materials. */'
    if start in data:data=data[:data.index(start)]+data[data.index(end)+len(end)+1:]
    lines=[start]+['  prop_'+d['key']+': { src: "'+d['path']+'", raw: true },' for d in updated]+[end]
    pos=data.index('  /* Town architecture library v2. */');data=data[:pos]+'\n'.join(lines)+'\n'+data[pos:]
    path.write_text(data,encoding='utf-8')
    path=ROOT/'js/sprite_manifest.js';text=path.read_text();prefix=text[:text.index('{')]
    runtime=json.loads(text[text.index('{'):].strip().removesuffix(';'))
    for d in updated:
        runtime['entries'][d['assetId']]=compiler.static_entry(compiler._copy_final_aligned_source(d),tuple(d['anchor']),d['bundle'])
        runtime['maps']['props'][d['key']]=d['assetId']
    path.write_text(prefix+json.dumps(runtime,indent=2,sort_keys=True)+';\n')
    path=ROOT/'assets/sprites/coverage.json';coverage=json.loads(path.read_text());coverage.update(assetCount=len(runtime['entries']),props=sorted(runtime['maps']['props']));path.write_text(json.dumps(coverage,indent=2,sort_keys=True)+'\n')
    print('Registered',len(updated),'full-resolution painted ground and hazard materials.')

if __name__=='__main__':main()
