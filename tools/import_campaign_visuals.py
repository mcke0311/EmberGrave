"""Mechanically isolate authored alpha components, scale uniformly, and pack.

No pixels are painted or recolored. The six largest disconnected components
identify each sheet's six objects; detached chips follow the closest object.
"""
from pathlib import Path
from collections import deque
import hashlib
import json
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
AUTH=ROOT/'assets/sprites_src/gameplay_art_authored/campaign_visual'
ART=ROOT/'assets/sprites_src/gameplay_art'

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def components(image):
    width,height=image.size
    # Near-invisible alpha (1/255) can bridge separate atlas objects. Ignore it
    # for segmentation; retain original alpha on every selected visible pixel.
    pixels=bytearray(image.getchannel('A').point(lambda a:a if a>=12 else 0).tobytes())
    groups=[]
    for index in range(len(pixels)):
        if not pixels[index]:
            continue
        pixels[index]=0
        pending=deque([index]); group=[]
        while pending:
            at=pending.popleft(); group.append(at)
            x=at%width
            for near in ([at-1] if x else [])+([at+1] if x+1<width else [])+([at-width] if at>=width else [])+([at+width] if at+width<len(pixels) else []):
                if pixels[near]:
                    pixels[near]=0;pending.append(near)
        groups.append(group)
    groups.sort(key=len,reverse=True)
    centers=[(sum(p%width for p in g)/len(g),sum(p//width for p in g)/len(g)) for g in groups[:6]]
    # Row membership is based on center height, then columns within each row.
    order=sorted(range(6),key=lambda i:centers[i][1])
    order=sum([sorted(order[i:i+2],key=lambda j:centers[j][0]) for i in range(0,6,2)],[])
    buckets=[groups[i][:] for i in order]
    centers=[centers[i] for i in order]
    for group in groups[6:]:
        x=sum(p%width for p in group)/len(group);y=sum(p//width for p in group)/len(group)
        closest=min(range(6),key=lambda i:(x-centers[i][0])**2+(y-centers[i][1])**2)
        buckets[closest].extend(group)
    original=image.getchannel('A').tobytes()
    for group in buckets:
        alpha=bytearray(width*height)
        for p in group:alpha[p]=original[p]
        mask=Image.frombytes('L',image.size,bytes(alpha));box=mask.getbbox()
        result=image.copy();result.putalpha(mask)
        yield result.crop(box),list(box)

def main():
    manifest_path=ROOT/'js/sprite_manifest.js';text=manifest_path.read_text()
    manifest=json.loads(text[text.index('{'):].strip().removesuffix(';'))
    ledger_path=ART/'gameplay_art_v1.json';ledger=json.loads(ledger_path.read_text())
    rows=[]
    # Final dimensions are chosen for the existing world scale, not sheet cells.
    target={1:[('h',300),('h',285),('w',260),('h',195)],2:[('h',310),('h',280),('h',175),('h',195)],3:[('w',360),('w',360),('h',180),('h',190)],4:[('h',200),('h',195),('w',260),('h',180)],5:[('w',285),('w',290),('h',190),('h',165)]}
    for act in range(1,6):
        source=AUTH/f'act{act}.png'
        image=Image.open(source).convert('RGBA')
        for index,(im,box) in enumerate(components(image)):
            axis,size=target[act][index] if index<4 else ('w',340)
            scale=size/(im.width if axis=='w' else im.height)
            im=im.resize((round(im.width*scale),round(im.height*scale)),Image.Resampling.LANCZOS)
            anchor=[im.width//2,round(im.height*(.88 if index<4 else .5))]
            key=f'a{act}refresh_{index}';asset_id='world.prop.'+key
            path=ART/'world/props'/f'{key}.png';packed=ROOT/'assets/sprites/packed/world/props'/f'{key}.webp'
            im.save(path);im.save(packed,lossless=True,exact=True)
            parameters={'box':box,'uniformScale':scale,'component':index,'importReport':AUTH.relative_to(ROOT).as_posix()+'/registration.json'}
            ledger['descriptors']['prop:'+key]=dict(sourceKind='authored-final-aligned',review='campaign-visual-v1',role='prop',key=key,path=path.relative_to(ROOT).as_posix(),sha256=digest(path),kind='static',size=list(im.size),anchor=anchor,bundle='world',assetId=asset_id,lossless=True,provenance=dict(method='imagegen-campaign-visual-v1',source=source.relative_to(ROOT).as_posix(),sourceSha256=digest(source),parameters=parameters))
            manifest['entries'][asset_id]=dict(src=packed.relative_to(ROOT).as_posix(),revision=digest(packed)[:12],kind='static',anchor=anchor,bundle='world')
            manifest['maps']['props'][key]=asset_id
            rows.append(dict(key=key,source=source.relative_to(ROOT).as_posix(),sourceHash=digest(source),box=box,size=list(im.size),anchor=anchor,path=path.relative_to(ROOT).as_posix(),packed=packed.relative_to(ROOT).as_posix(),packedHash=digest(packed)))
        print('Imported act',act,flush=True)
    ledger_path.write_text(json.dumps(ledger,indent=2,sort_keys=True)+'\n')
    manifest_path.write_text(text[:text.index('{')]+json.dumps(manifest,indent=2,sort_keys=True)+';\n')
    data_path=ROOT/'js/data.js';data=data_path.read_text(encoding='utf-8')
    start='  /* Campaign visual assets v1. */';end='  /* End campaign visual assets v1. */'
    if start in data:data=data[:data.index(start)]+data[data.index(end)+len(end):].lstrip('\n')
    at=data.index('  /* Act I landscape polish v2. */')
    block=start+'\n'+'\n'.join(f'  prop_{r["key"]}: {{ src: "{r["path"]}", raw: true }},' for r in rows)+'\n'+end+'\n'
    data_path.write_text(data[:at]+block+data[at:],encoding='utf-8')
    coverage_path=ROOT/'assets/sprites/coverage.json';coverage=json.loads(coverage_path.read_text())
    coverage.update(assetCount=len(manifest['entries']),props=sorted(manifest['maps']['props']))
    coverage_path.write_text(json.dumps(coverage,indent=2,sort_keys=True)+'\n')
    (AUTH/'registration.json').write_text(json.dumps({'method':'alpha-connected-components, uniform scaling, lossless WebP','assets':rows},indent=2)+'\n')
    print('Registered',len(rows),'assets.')

if __name__=='__main__':main()
