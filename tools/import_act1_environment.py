"""Register complete painted Act I modules with measured ground sockets.

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
AUTH = ROOT/'assets/sprites_src/gameplay_art_authored/act1_environment'
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
            # Atlas neighbors occasionally cross a gutter by a few pixels.
            # Reject disconnected border scraps, retaining the complete module.
            import numpy as np
            pixels=np.array(cell);remaining=pixels[:,:,3]>12;components=[]
            for py,px in np.argwhere(remaining):
                if not remaining[py,px]:continue
                queue=[(int(px),int(py))];remaining[py,px]=False
                for x,y in queue:
                    for xx,yy in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):
                        if 0<=xx<cell.width and 0<=yy<cell.height and remaining[yy,xx]:
                            remaining[yy,xx]=False;queue.append((xx,yy))
                components.append(queue)
            largest=max(map(len,components),default=1)
            for component in components:
                if len(component)>=largest*.025:continue
                if any(x<18 or x>cell.width-18 or y<8 or y>cell.height-8 for x,y in component):
                    for x,y in component:pixels[y,x,3]=0
            cell=Image.fromarray(pixels)
            bounds=cell.getchannel('A').point(lambda a:255 if a>12 else 0).getbbox()
            if not bounds: raise ValueError(spec['name'])
            a,b=spec['sockets']; scale=spec['span']*32/abs(b[0]-a[0])
            im=cell.crop(bounds); im=im.resize((round(im.width*scale),round(im.height*scale)),Image.Resampling.LANCZOS)
            center=spec.get('anchor',[(a[0]+b[0])/2,(a[1]+b[1])/2])
            anchor=[round((center[i]-bounds[i])*scale) for i in range(2)]
            key='a1env_'+kit['key']+'_'+spec['name']
            dest=ART/'world/props'/(key+'.png'); im.save(dest)
            d=dict(sourceKind='authored-final-aligned',review='visual-contact-sheet-v1',role='prop',key=key,
                path=dest.relative_to(ROOT).as_posix(),sha256=digest(dest),kind='static',size=list(im.size),
                anchor=anchor,bundle='world',assetId='world.prop.'+key,lossless=True,
                provenance=dict(method='imagegen-act1-environment-registration-v1',source=origin.relative_to(ROOT).as_posix(),
                    sourceSha256=digest(origin),parameters=dict(alphaMethod=method,box=spec['box'],bounds=list(bounds),
                    sockets=spec['sockets'],scale=scale,span=spec['span'],footprint=spec.get('footprint'))))
            payload['descriptors']['prop:'+key]=d
            runtime['entries'][d['assetId']]=compiler.static_entry(compiler._copy_final_aligned_source(d),tuple(anchor),'world')
            runtime['maps']['props'][key]=d['assetId']; descriptors.append(d)
    write_text(payload_path,json.dumps(payload,indent=2,sort_keys=True)+'\n')
    write_text(manifest_path,text[:text.index('{')]+json.dumps(runtime,indent=2,sort_keys=True)+';\n')
    path=ROOT/'js/data.js'; data=path.read_text(encoding='utf-8')
    start,end='  /* Act 1 environment library v1. */','  /* End Act 1 environment library v1. */'
    if start in data:data=data[:data.index(start)]+data[data.index(end)+len(end):].lstrip('\n')
    at=data.index('  /* Town architecture library v2. */')
    block=start+'\n'+'\n'.join('  prop_'+d['key']+': { src: "'+d['path']+'", raw: true },' for d in descriptors)+'\n'+end+'\n'
    write_text(path,data[:at]+block+data[at:])
    path=ROOT/'assets/sprites/coverage.json'; coverage=json.loads(path.read_text())
    coverage.update(assetCount=len(runtime['entries']),props=sorted(runtime['maps']['props']))
    write_text(path,json.dumps(coverage,indent=2,sort_keys=True)+'\n')
    qa=ROOT/'tests/qa/act1_environment';qa.mkdir(parents=True,exist_ok=True)
    contact=Image.new('RGB',(960,((len(descriptors)+3)//4)*230),'#263038');draw=ImageDraw.Draw(contact)
    for i,d in enumerate(descriptors):
        im=Image.open(ROOT/d['path']);im.thumbnail((230,195));x,y=i%4*240,i//4*230
        contact.paste(im,(x+(240-im.width)//2,y),im);draw.text((x+5,y+205),d['key'],fill='#dcd7cc')
    contact.save(qa/'asset_contact.png')
    write_text(AUTH/'source_hashes.json',json.dumps({p.name:digest(p) for p in AUTH.iterdir() if p.suffix in ('.png','.json','.txt') and p.name!='source_hashes.json'},indent=2)+'\n')
    print('Registered',len(descriptors),'Act I environment modules')
if __name__=='__main__':main()
