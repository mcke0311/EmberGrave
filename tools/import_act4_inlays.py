"""Register the four original floor paintings; crop and pack without repainting."""
import json
from PIL import Image
import build_sprite_assets as compiler
from import_act4_environment import ROOT, ART, sha, write_text

AUTH=ROOT/'assets/sprites_src/gameplay_art_authored/act4_visual'

def main():
    source=AUTH/'floor_inlays.png'
    sheet=Image.open(source).convert('RGBA')
    payload_path=ART/'gameplay_art_v1.json'
    manifest_path=ROOT/'js/sprite_manifest.js'
    payload=json.loads(payload_path.read_text())
    text=manifest_path.read_text()
    runtime=json.loads(text[text.index('{'):].strip().removesuffix(';'))
    descriptors=[]
    for i,kit in enumerate(['pale','dark','ash','bastion']):
        key='a4v2_inlay_'+kit
        box=[i%2*sheet.width//2,i//2*sheet.height//2,(i%2+1)*sheet.width//2,(i//2+1)*sheet.height//2]
        image=sheet.crop(box).resize((768,768),Image.Resampling.LANCZOS)
        dest=ART/'world/props'/(key+'.png')
        image.save(dest)
        d=dict(sourceKind='authored-final-aligned',review='act4-visual',role='prop',key=key,
            path=dest.relative_to(ROOT).as_posix(),sha256=sha(dest),kind='static',size=[768,768],anchor=[384,384],
            bundle='world',assetId='world.prop.'+key,lossless=True,
            provenance=dict(method='imagegen-act4-inlays',source=source.relative_to(ROOT).as_posix(),
                sourceSha256=sha(source),parameters=dict(box=box,alphaMethod='opaque-material',scale=768/(box[2]-box[0]))))
        payload['descriptors']['prop:'+key]=d
        runtime['entries'][d['assetId']]=compiler.static_entry(compiler._copy_final_aligned_source(d),(384,384),'world')
        runtime['maps']['props'][key]=d['assetId']
        descriptors.append(d)
    write_text(payload_path,json.dumps(payload,indent=2,sort_keys=True)+'\n')
    write_text(manifest_path,text[:text.index('{')]+json.dumps(runtime,indent=2,sort_keys=True)+';\n')
    path=ROOT/'js/data.js'
    data=path.read_text(encoding='utf-8')
    start='  /* Act 4 floor inlays. */'
    end='  /* End Act 4 floor inlays. */'
    if start in data:
        a=data.index(start);b=data.index(end)+len(end)
        data=data[:a]+data[b:].lstrip('\n')
    at=data.index('  /* Act 4 environment library v2. */')
    block=start+'\n'+'\n'.join('  prop_'+d['key']+': { src: "'+d['path']+'", raw: true },' for d in descriptors)+'\n'+end+'\n'
    write_text(path,data[:at]+block+data[at:])
    write_text(AUTH/'registration.json',json.dumps(descriptors,indent=2)+'\n')
    path=ROOT/'assets/sprites/coverage.json'
    coverage=json.loads(path.read_text())
    coverage.update(assetCount=len(runtime['entries']),props=sorted(runtime['maps']['props']))
    write_text(path,json.dumps(coverage,indent=2,sort_keys=True)+'\n')
    print('Registered four Act IV floor inlays')

if __name__=='__main__':
    main()
