"""Register painted Act III modules using measured foundation endpoints.

Only technical matte extraction, complete-component cropping, uniform scaling,
direction registration and lossless packing happen here. Source sheets remain
immutable. No terrain faces or replacement paintings are synthesized.
"""
from pathlib import Path
import hashlib, json
import numpy as np
from collections import deque
from PIL import Image, ImageOps, ImageDraw, ImageFilter
import build_sprite_assets as compiler
from import_act2_art import decode as decode_matte

ROOT=Path(__file__).resolve().parents[1]
AUTH=ROOT/'assets/sprites_src/gameplay_art_authored/act3_environment'
ART=ROOT/'assets/sprites_src/gameplay_art'
QA=ROOT/'tests/qa/act3_environment'
PARTS=['east','south','east_alt','south_alt','east_1','south_1','east_2','south_2','outer','inner','end_east','end_south','broken_east','broken_south','foundation','paving']
FAMILIES=['market','tomb','palace','sovereign','aqueduct','road']

def decode(image):
    image,method=decode_matte(image)
    pixels=np.asarray(image).astype(float)
    excess=np.minimum(pixels[:,:,0],pixels[:,:,2])-pixels[:,:,1]
    backdrop=(pixels[:,:,0]>145)&(pixels[:,:,2]>145)&(excess>100)
    pixels[backdrop,3]=0
    alpha=Image.fromarray(pixels[:,:,3].astype('uint8'))
    edge=np.asarray(alpha.filter(ImageFilter.MinFilter(13)))<200
    fringe=edge&(excess>12)&(pixels[:,:,3]>0)
    pixels[fringe,0]-=excess[fringe];pixels[fringe,2]-=excess[fringe]
    pixels[fringe,3]*=1-np.clip(excess[fringe]/150,0,1)
    # A magenta matte blended into warm sand can leave a rose edge even when
    # blue is only slightly above green. Despill that narrow edge toward the
    # adjacent sand hue; preserve neutral stone and turquoise ornament.
    rose=edge&(pixels[:,:,0]>pixels[:,:,1]*1.25)&(pixels[:,:,2]>pixels[:,:,1]*.85)&(pixels[:,:,3]>0)
    spill=np.maximum(0,pixels[:,:,2]-pixels[:,:,1]*.65)
    pixels[rose,0]-=spill[rose];pixels[rose,2]-=spill[rose]
    return Image.fromarray(np.clip(pixels,0,255).astype('uint8'),'RGBA'),method+'-edge-dematted'

def digest(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def write_bytes(path,data):
    if path.exists() and path.read_bytes()==data:return
    temp=path.with_name(path.name+'.a3-tmp');temp.write_bytes(data);temp.replace(path)
def write(path,value):
    data=(json.dumps(value,indent=2,sort_keys=True)+'\n').encode()
    write_bytes(path,data)

def components(image,count,columns):
    w,h=image.size;mask=bytearray(image.getchannel('A').point(lambda x:255 if x>48 else 0).tobytes());found=[]
    for i in range(w*h):
        if not mask[i]:continue
        queue=deque([i]);mask[i]=0;size=0;left=right=i%w;top=bottom=i//w
        while queue:
            j=queue.popleft();x=j%w;y=j//w;size+=1
            left=min(left,x);right=max(right,x);top=min(top,y);bottom=max(bottom,y)
            for k in [j-1 if x else -1,j+1 if x<w-1 else -1,j-w if y else -1,j+w if y<h-1 else -1]:
                if k>=0 and mask[k]:mask[k]=0;queue.append(k)
        if size>250:found.append((size,[max(0,left-3),max(0,top-3),min(w,right+4),min(h,bottom+4)]))
    found.sort(reverse=True)
    if len(found)<count:raise ValueError('Incomplete sheet: '+str(len(found)))
    boxes=[b for _,b in found[:count]]
    boxes.sort(key=lambda b:(b[1]+b[3])/2)
    return [b for r in range(0,count,columns) for b in sorted(boxes[r:r+columns],key=lambda b:b[0])]

def bottom(a,x):
    ys=np.where(a[:,max(0,min(a.shape[1]-1,round(x)))]>80)[0]
    return int(ys[-1]) if len(ys) else a.shape[0]-1

def main():
    AUTH.mkdir(parents=True,exist_ok=True);QA.mkdir(parents=True,exist_ok=True)
    specs=json.loads((AUTH/'sources.json').read_text())
    payload_path=ART/'gameplay_art_v1.json';payload=json.loads(payload_path.read_text())
    manifest_path=ROOT/'js/sprite_manifest.js';text=manifest_path.read_text();prefix=text[:text.index('{')]
    runtime=json.loads(text[text.index('{'):].strip().removesuffix(';'))
    descriptors=[];registration=[]
    for key,source in specs.items():
        path=AUTH/source['file'];im,method=decode(Image.open(path))
        biome=key=='biome';passage=key.startswith('passages_');count=12 if biome else 6 if passage else 16
        boxes=components(im,count,3 if passage else 4)
        low=None
        if biome and source.get('duneFile'):
            lowPath=AUTH/source['duneFile'];low,lowMethod=decode(Image.open(lowPath));lowBoxes=components(low,12,4)
        for i,box in enumerate(boxes):
            origin=path;alphaMethod=method
            if low is not None and i<4:box=lowBoxes[i];cell=low.crop(box);origin=lowPath;alphaMethod=lowMethod
            else:cell=im.crop(box)
            a=np.asarray(cell)[:,:,3]
            if passage:
                names=[FAMILIES[i]+'_'+('in' if key.endswith('_in') else 'out')+'_east',FAMILIES[i]+'_'+('in' if key.endswith('_in') else 'out')+'_south']
                # The opening is measured separately from the wide attached wings.
                width=380 if FAMILIES[i] not in ['road','aqueduct'] else 340
                scale=width/cell.width;sockets=[[cell.width*.30,cell.height*.72],[cell.width*.72,cell.height*.93]]
            elif biome:
                names=[['dune','rock','shard'][i//4]+'_'+['east','south','east_alt','south_alt'][i%4]]
                scale=270/cell.width;sockets=[[cell.width*.08,bottom(a,cell.width*.08)],[cell.width*.92,bottom(a,cell.width*.92)]]
            else:
                names=[key+'_'+PARTS[i]]
                span=1 if i in [4,5,10,11] else 2 if i in [6,7,8,9] else 3
                sockets=[[cell.width*.08,bottom(a,cell.width*.08)-4],[cell.width*.94,bottom(a,cell.width*.94)-4]]
                scale=span*32/abs(sockets[1][0]-sockets[0][0])
                if i>=14:scale=150/cell.width
            for name in names:
                desired=-1 if name.endswith(('south','south_alt','south_1','south_2')) else 1
                slope=bottom(a,cell.width*.8)-bottom(a,cell.width*.2)
                flip=desired*slope<0 and (passage or biome or i not in [8,9,14,15])
                if passage:flip=desired<0
                image=ImageOps.mirror(cell) if flip else cell
                image=image.resize((round(cell.width*scale),round(cell.height*scale)),Image.Resampling.LANCZOS)
                if passage:
                    ax,ay=([.51,.63] if key.endswith('_out') else [.49,.65])
                    if FAMILIES[i] in ['road','aqueduct']:ax,ay=.5,.67
                    anchor=[round(image.width*(1-ax if flip else ax)),round(image.height*ay)]
                elif biome:anchor=[image.width//2,round(image.height*.76)]
                else:anchor=[round((sockets[0][0]+sockets[1][0])*scale/2),round((sockets[0][1]+sockets[1][1])*scale/2)]
                if not passage and not biome and i in [8,9]:anchor=[image.width//2,round((bottom(a,cell.width*.5)-4)*scale)]
                if flip and not passage and not biome:anchor[0]=image.width-anchor[0]
                if not passage and not biome and i>=14:anchor=[image.width//2,image.height//2]
                asset='a3passage_'+name if passage else 'a3env_'+name
                dest=ART/'world/props'/(asset+'.png');image.save(dest)
                d=dict(sourceKind='authored-final-aligned',review='visual-contact-sheet-v1',role='prop',key=asset,
                    path=dest.relative_to(ROOT).as_posix(),sha256=digest(dest),kind='static',size=list(image.size),anchor=anchor,
                    bundle='world',assetId='world.prop.'+asset,lossless=True,
                    provenance=dict(method='imagegen-act3-environment-v1',source=origin.relative_to(ROOT).as_posix(),sourceSha256=digest(origin),
                        parameters=dict(alphaMethod=alphaMethod,box=box,sockets=sockets,uniformScale=scale,mirror=flip)))
                payload['descriptors']['prop:'+asset]=d;packed=compiler._copy_final_aligned_source(d)
                runtime['entries'][d['assetId']]=compiler.static_entry(packed,tuple(anchor),'world');runtime['maps']['props'][asset]=d['assetId']
                descriptors.append(d);registration.append(dict(key=asset,box=box,sockets=sockets,scale=scale,mirror=flip,anchor=anchor,size=list(image.size)))
    write(payload_path,payload)
    write_bytes(manifest_path,(prefix+json.dumps(runtime,indent=2,sort_keys=True)+';\n').encode())
    data_path=ROOT/'js/data.js';data=data_path.read_text(encoding='utf-8')
    start='  /* Act III connected environment v1. */';end='  /* End Act III connected environment. */'
    if start in data:data=data[:data.index(start)]+data[data.index(end)+len(end):]
    at=data.index('  /* Town architecture library v2. */')
    block=start+'\n'+'\n'.join('  prop_'+d['key']+': { src: "'+d['path']+'", raw: true },' for d in descriptors)+'\n'+end+'\n'
    write_bytes(data_path,(data[:at]+block+data[at:]).encode())
    coverage_path=ROOT/'assets/sprites/coverage.json';coverage=json.loads(coverage_path.read_text());coverage.update(assetCount=len(runtime['entries']),props=sorted(runtime['maps']['props']));write(coverage_path,coverage)
    write(AUTH/'registration.json',registration)
    contact=Image.new('RGB',(1200,((len(descriptors)+5)//6)*190),'#292925');g=ImageDraw.Draw(contact)
    for i,d in enumerate(descriptors):
        image=Image.open(ROOT/d['path']);image.thumbnail((190,155));x=i%6*200;y=i//6*190
        contact.paste(image,(x+(200-image.width)//2,y+155-image.height),image);g.text((x+4,y+162),d['key'].replace('a3env_','').replace('a3passage_',''),fill='#e8d3ab')
    contact.save(QA/'asset_contact.jpg',quality=94)
    print('Registered',len(descriptors),'complete painted environment modules')
if __name__=='__main__':main()
