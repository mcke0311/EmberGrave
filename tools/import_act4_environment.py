"""Register reviewed Act IV paintings. Matte extraction, crop and uniform scale only.

Source sheets and prompts remain local. Runtime packing copies canonical RGBA.
Socket anchors define the shared 64x32 world grid; short runs crop, never stretch.
"""
from pathlib import Path
import hashlib,json
from PIL import Image,ImageDraw
import build_sprite_assets as compiler
from import_act2_boundaries import write_text

ROOT=Path(__file__).resolve().parents[1]
AUTH=ROOT/'assets/sprites_src/gameplay_art_authored/act4_environment'
ART=ROOT/'assets/sprites_src/gameplay_art'
QA=ROOT/'tests/qa/act4_environment'
PARTS=['east','south','east_alt','south_alt','inner','outer','end_east','end_south',
       'broken_east','broken_south','door_east','door_south','foundation_east','foundation_south','foundation_corner','abutment']
ROWS={'pale':[0,305,577,843,1266],'dark':[0,310,585,834,1254],
      'ash':[0,320,590,875,1254],'bastion':[0,305,574,835,1261]}
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()

def decode(cell):
    import numpy as np
    cell=cell.convert('RGBA')
    if cell.getchannel('A').getextrema()[0]==0:return cell,'native-alpha'
    p=np.asarray(cell).astype(float);excess=np.minimum(p[:,:,0],p[:,:,2])-p[:,:,1]
    matte=(p[:,:,0]>145)&(p[:,:,2]>145)&(excess>100)
    fringe=(excess>25)&~matte
    alpha=np.clip(1-excess/255,0,1)
    # Unmix the known technical matte before assigning coverage; merely
    # lowering opacity leaves a pink cast on pale dust and stone edges.
    for channel in (0,2):p[:,:,channel][fringe]=(p[:,:,channel][fringe]-(1-alpha[fringe])*255)/np.maximum(.01,alpha[fringe])
    p[:,:,1][fringe]/=np.maximum(.01,alpha[fringe])
    p[:,:,3][fringe]*=alpha[fringe];p[matte,3]=0
    result=Image.fromarray(np.clip(p,0,255).astype('uint8'),'RGBA')
    if result.getchannel('A').getextrema()[0]!=0:raise ValueError('Missing transparent background or technical matte')
    return result,'magenta-matte-unmixed'

def main():
    payload_path=ART/'gameplay_art_v1.json';payload=json.loads(payload_path.read_text())
    manifest_path=ROOT/'js/sprite_manifest.js';text=manifest_path.read_text()
    runtime=json.loads(text[text.index('{'):].strip().removesuffix(';'))
    descriptors=[]
    def register(key,source,box,width,anchor_kind):
        cell=Image.open(source).crop(box)
        if anchor_kind=='material':pixels=cell.convert('RGBA');method='opaque-material'
        else:pixels,method=decode(cell)
        bounds=pixels.getchannel('A').point(lambda a:255 if a>12 else 0).getbbox()
        if not bounds:raise ValueError('Empty '+key)
        pixels=pixels.crop(bounds);scale=width/pixels.width
        pixels=pixels.resize((width,round(pixels.height*scale)),Image.Resampling.LANCZOS)
        if anchor_kind=='foundation':anchor=[width//2,round(width/4)+3]
        elif anchor_kind=='foundation_corner':anchor=[width//2,round(width/4)+8]
        elif anchor_kind in ('material','decal'):anchor=[width//2,pixels.height//2]
        elif anchor_kind=='corner':anchor=[width//2,pixels.height-10]
        else:anchor=[width//2,pixels.height-round(width/4)-5]
        dest=ART/'world/props'/(key+'.png');pixels.save(dest)
        d=dict(sourceKind='authored-final-aligned',review='act4-environment-gameplay-v1',role='prop',key=key,
               path=dest.relative_to(ROOT).as_posix(),sha256=sha(dest),kind='static',size=list(pixels.size),
               anchor=anchor,bundle='world',assetId='world.prop.'+key,lossless=True,
               provenance=dict(method='imagegen-act4-environment-v1',source=source.relative_to(ROOT).as_posix(),
                 sourceSha256=sha(source),parameters=dict(box=box,alphaBounds=list(bounds),alphaMethod=method,scale=scale,anchorKind=anchor_kind)))
        payload['descriptors']['prop:'+key]=d
        runtime['entries'][d['assetId']]=compiler.static_entry(compiler._copy_final_aligned_source(d),tuple(anchor),'world')
        runtime['maps']['props'][key]=d['assetId'];descriptors.append(d)
    for kit,rows in ROWS.items():
        source=AUTH/(kit+'_matte.png');w,h=Image.open(source).size
        for i,part in enumerate(PARTS):
            col,row=i%4,i//4;box=[round(w*col/4),rows[row],round(w*(col+1)/4),rows[row+1]]
            kind='foundation_corner' if part in ('foundation_corner','abutment') else 'foundation' if part.startswith('foundation') else 'corner' if part in ('inner','outer') else 'wall'
            width=112 if part in ('inner','outer','foundation_corner','abutment') else 224
            if part.startswith('end_'):width=112
            register('a4env_'+kit+'_'+part,source,box,width,kind)
    source=AUTH/'floors.png';w,h=Image.open(source).size
    for i,kit in enumerate(ROWS):
        register('a4env_floor_'+kit,source,[round(w*i/4)+2,2,round(w*(i+1)/4)-2,h//2-2],384,'material')
        register('a4env_transition_'+kit,source,[round(w*i/4)+2,h//2+2,round(w*(i+1)/4)-2,h-2],150,'decal')
    # Re-read shared declarations after packing, so a different act's import
    # during image processing is not replaced by our earlier file snapshot.
    own_entries={d['assetId']:runtime['entries'][d['assetId']] for d in descriptors}
    payload=json.loads(payload_path.read_text());text=manifest_path.read_text()
    runtime=json.loads(text[text.index('{'):].strip().removesuffix(';'))
    for d in descriptors:
        payload['descriptors']['prop:'+d['key']]=d
        runtime['entries'][d['assetId']]=own_entries[d['assetId']]
        runtime['maps']['props'][d['key']]=d['assetId']
    # Re-read shared declarations after packing, so a different act's import
    # during image processing is not replaced by our earlier file snapshot.
    own_entries={d['assetId']:runtime['entries'][d['assetId']] for d in descriptors}
    payload=json.loads(payload_path.read_text());text=manifest_path.read_text()
    runtime=json.loads(text[text.index('{'):].strip().removesuffix(';'))
    for d in descriptors:
        payload['descriptors']['prop:'+d['key']]=d
        runtime['entries'][d['assetId']]=own_entries[d['assetId']]
        runtime['maps']['props'][d['key']]=d['assetId']
    # Update only this library; other acts may be under active development.
    write_text(payload_path,json.dumps(payload,indent=2,sort_keys=True)+'\n')
    write_text(manifest_path,text[:text.index('{')]+json.dumps(runtime,indent=2,sort_keys=True)+';\n')
    path=ROOT/'js/data.js';data=path.read_text(encoding='utf-8')
    start,end='  /* Act 4 environment library v1. */','  /* End Act 4 environment library v1. */'
    if start in data:data=data[:data.index(start)]+data[data.index(end)+len(end):].lstrip('\n')
    at=data.index('  /* Town architecture library v2. */')
    block=start+'\n'+'\n'.join('  prop_'+d['key']+': { src: "'+d['path']+'", raw: true },' for d in descriptors)+'\n'+end+'\n'
    write_text(path,data[:at]+block+data[at:])
    path=ROOT/'assets/sprites/coverage.json';coverage=json.loads(path.read_text())
    coverage.update(assetCount=len(runtime['entries']),props=sorted(runtime['maps']['props']))
    write_text(path,json.dumps(coverage,indent=2,sort_keys=True)+'\n')
    write_text(AUTH/'registration.json',json.dumps(descriptors,indent=2)+'\n')
    write_text(AUTH/'source_hashes.json',json.dumps({p.name:sha(p) for p in sorted(AUTH.iterdir()) if p.suffix in ('.png','.json') and p.name!='source_hashes.json'},indent=2)+'\n')
    contact=Image.new('RGB',(960,((len(descriptors)+7)//8)*170),'#24232b');draw=ImageDraw.Draw(contact)
    for i,d in enumerate(descriptors):
        im=Image.open(ROOT/d['path']);im.thumbnail((116,138));x,y=i%8*120,i//8*170
        contact.paste(im,(x+(120-im.width)//2,y+4),im);draw.text((x+2,y+142),d['key'].replace('a4env_','').replace('foundation','base'),fill='#dfd6bb')
    contact.save(QA/'assets.png');print('Registered',len(descriptors),'Act IV painted assets')
if __name__=='__main__':main()
