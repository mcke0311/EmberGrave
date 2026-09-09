"""Register complete painted Act V modules with measured ground sockets.

Only matte extraction, cropping, uniform scaling and pixel-preserving packing.
Source artwork and prompts are retained alongside the registration.
"""
from pathlib import Path
import hashlib, json
from PIL import Image, ImageDraw
import build_sprite_assets as compiler
from import_act2_art import decode
from import_act2_boundaries import write_text

ROOT = Path(__file__).resolve().parents[1]
AUTH = ROOT/'assets/sprites_src/gameplay_art_authored/act5_environment'
ART = ROOT/'assets/sprites_src/gameplay_art'
def digest(p): return hashlib.sha256(p.read_bytes()).hexdigest()

def main():
    specs=json.loads((AUTH/'registration.json').read_text())
    payload_path=ART/'gameplay_art_v1.json'
    payload=json.loads(payload_path.read_text())
    manifest_path=ROOT/'js/sprite_manifest.js'
    text=manifest_path.read_text()
    runtime=json.loads(text[text.index('{'):].strip().removesuffix(';'))
    descriptors=[]
    for kit in specs['kits']:
        origin=AUTH/kit['source']; sheet,method=decode(Image.open(origin))
        for spec in kit['modules']:
            cell=sheet.crop(spec['box'])
            bounds=cell.getchannel('A').point(lambda a:255 if a>12 else 0).getbbox()
            if not bounds: raise ValueError(spec['name'])
            a,b=spec['sockets']; scale=spec['span']*32/abs(b[0]-a[0])
            im=cell.crop(bounds); im=im.resize((round(im.width*scale),round(im.height*scale)),Image.Resampling.LANCZOS)
            center=spec.get('anchor',[(a[0]+b[0])/2,(a[1]+b[1])/2])
            anchor=[round((center[i]-bounds[i])*scale) for i in range(2)]
            key='a5env_'+kit['key']+'_'+spec['name']
            dest=ART/'world/props'/(key+'.png'); im.save(dest)
            d=dict(sourceKind='authored-final-aligned',review='visual-contact-sheet-v1',role='prop',key=key,
                path=dest.relative_to(ROOT).as_posix(),sha256=digest(dest),kind='static',size=list(im.size),
                anchor=anchor,bundle='world',assetId='world.prop.'+key,lossless=True,
                provenance=dict(method='imagegen-act5-environment-registration-v1',source=origin.relative_to(ROOT).as_posix(),
                    sourceSha256=digest(origin),parameters=dict(alphaMethod=method,box=spec['box'],bounds=list(bounds),
                    sockets=spec['sockets'],scale=scale,span=spec['span'],footprint=spec.get('footprint'))))
            payload['descriptors']['prop:'+key]=d
            runtime['entries'][d['assetId']]=compiler.static_entry(compiler._copy_final_aligned_source(d),tuple(anchor),'world')
            runtime['maps']['props'][key]=d['assetId']; descriptors.append(d)
    # Other act importers may be working in the shared tree. Re-read immediately
    # before registration and merge only this kit's keys, never an old snapshot.
    latest_payload=json.loads(payload_path.read_text())
    latest_text=manifest_path.read_text()
    latest_runtime=json.loads(latest_text[latest_text.index('{'):].strip().removesuffix(';'))
    for d in descriptors:
        latest_payload['descriptors']['prop:'+d['key']]=d
        latest_runtime['entries'][d['assetId']]=runtime['entries'][d['assetId']]
        latest_runtime['maps']['props'][d['key']]=d['assetId']
    payload,runtime=latest_payload,latest_runtime
    write_text(payload_path,json.dumps(payload,indent=2,sort_keys=True)+'\n')
    write_text(manifest_path,latest_text[:latest_text.index('{')]+json.dumps(runtime,indent=2,sort_keys=True)+';\n')
    path=ROOT/'js/data.js'; data=path.read_text(encoding='utf-8')
    start,end='  /* Act 5 environment library v1. */','  /* End Act 5 environment library v1. */'
    if start in data:data=data[:data.index(start)]+data[data.index(end)+len(end):].lstrip('\n')
    at=data.index('  /* Town architecture library v2. */')
    block=start+'\n'+'\n'.join('  prop_'+d['key']+': { src: "'+d['path']+'", raw: true },' for d in descriptors)+'\n'+end+'\n'
    write_text(path,data[:at]+block+data[at:])
    path=ROOT/'assets/sprites/coverage.json'; coverage=json.loads(path.read_text())
    coverage.update(assetCount=len(runtime['entries']),props=sorted(runtime['maps']['props']))
    write_text(path,json.dumps(coverage,indent=2,sort_keys=True)+'\n')
    qa=ROOT/'tests/qa/act5_environment';qa.mkdir(parents=True,exist_ok=True)
    contact=Image.new('RGB',(960,((len(descriptors)+3)//4)*230),'#263038');draw=ImageDraw.Draw(contact)
    for i,d in enumerate(descriptors):
        im=Image.open(ROOT/d['path']);im.thumbnail((230,195));x,y=i%4*240,i//4*230
        contact.paste(im,(x+(240-im.width)//2,y),im);draw.text((x+5,y+205),d['key'],fill='#dcd7cc')
    contact.save(qa/'asset_contact.png')
    write_text(AUTH/'source_hashes.json',json.dumps({p.name:digest(p) for p in AUTH.iterdir() if p.suffix in ('.png','.json') and p.name!='source_hashes.json'},indent=2)+'\n')
    print('Registered',len(descriptors),'Act V environment modules')
if __name__=='__main__':main()
