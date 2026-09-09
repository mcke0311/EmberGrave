"""Slice generated imperial kits; uniformly register and losslessly pack art.

No painting or geometry synthesis. Each cell is a generated complete module.
Connection anchors are measured on its visible foundation, not the cell edge.
"""
from pathlib import Path
import hashlib,json,shutil
from PIL import Image
from collections import deque
import build_sprite_assets as compiler

ROOT=Path(__file__).resolve().parents[1]
AUTH=ROOT/'assets/sprites_src/gameplay_art_authored/act3_architecture'
ART=ROOT/'assets/sprites_src/gameplay_art'
GEN=Path('C:/Users/this_/.codex/generated_images/01a082a3-aabb-7643-b815-ba462d63ab76')
SHEETS=[('palace','exec-be66ad17-d2ee-4814-9341-6a5c21e2aa1f.png',4,2),('tomb','exec-74cc745d-6b4c-44c9-94fd-0dc1aae3b8b6.png',4,2),('bridge','exec-a5e27af0-5308-4da4-8b1a-7e6c04a36903.png',3,2),('rock','exec-c1f11755-1cee-419f-b0d7-52617bdff311.png',2,2)]
NAMES=['south','east','outer','inner','pillar','broken','door','buttress']
SHEETS.append(('sandstone','exec-4474d4d8-ea76-47d1-b7f3-0bfbe73c6b6a.png',4,2))
BRIDGE=['deck_east','deck_south','arch','stairs_east','stairs_south','parapet']
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()

def component_bounds(image):
    # Sheet cells can contain a few pixels from a neighboring component at the
    # gutter. Register the complete primary component, excluding those islands.
    w,h=image.size;mask=bytearray(image.getchannel('A').point(lambda a:255 if a>16 else 0).tobytes());best=(0,None)
    for i in range(w*h):
        if not mask[i]:continue
        queue=deque([i]);mask[i]=0;count=0;left=right=i%w;top=bottom=i//w
        while queue:
            k=queue.popleft();x=k%w;y=k//w;count+=1
            left=min(left,x);right=max(right,x);top=min(top,y);bottom=max(bottom,y)
            for ny in range(max(0,y-1),min(h,y+2)):
                for nx in range(max(0,x-1),min(w,x+2)):
                    j=nx+ny*w
                    if mask[j]:mask[j]=0;queue.append(j)
        if count>best[0]:best=(count,(left,top,right+1,bottom+1))
    return best[1]
def main():
    payload_path=ART/'gameplay_art_v1.json';payload=json.loads(payload_path.read_text())
    manifest_path=ROOT/'js/sprite_manifest.js';text=manifest_path.read_text();runtime=json.loads(text[text.index('{'):].strip().removesuffix(';'))
    report=[];descriptors=[]
    # Rectify only the flat painted paving into a ground material. Wall and
    # structural sprites keep their original projection and uniform scale.
    bridge_source=AUTH/'bridge.png'
    if bridge_source.exists():
        paving=Image.open(bridge_source).convert('RGBA').transform((256,128),Image.Transform.QUAD,(191,77,50,138,348,326,485,273),Image.Resampling.BICUBIC)
        paving.save(AUTH/'deckmaterial.png')
    sheets=SHEETS+([('deckmaterial','',1,1)] if (AUTH/'deckmaterial.png').exists() else [])
    for kit,filename,columns,rows in sheets:
        source=AUTH/(kit+'.png')
        if not source.exists():shutil.copy2(GEN/filename,source)
        image=Image.open(source).convert('RGBA')
        for i,name in enumerate(['east','south','outer','retaining'] if kit=='rock' else ['material'] if kit=='deckmaterial' else BRIDGE if kit=='bridge' else NAMES):
            box=(round(i%columns*image.width/columns),round(i//columns*image.height/rows),round((i%columns+1)*image.width/columns),round((i//columns+1)*image.height/rows))
            cell=image.crop(box);bounds=component_bounds(cell)
            if not bounds:raise ValueError('Empty generated module')
            cell=cell.crop(bounds)
            # Fixed art scale: long wall = three world tiles plus masonry thickness.
            width=120 if name in ('east','south','broken') else 64 if name in ('pillar','buttress') else 150
            if kit=='bridge':width=256 if name.startswith('deck') else 240 if name.startswith('stairs') else 200 if name=='arch' else 112
            if kit=='deckmaterial':width=256
            cell=cell.resize((width,round(cell.height*width/cell.width)),Image.Resampling.LANCZOS)
            key='act3_arch_'+kit+'_'+name;path=ART/'world/props'/(key+'.png');cell.save(path)
            anchor=[width//2,cell.height-8]
            d=dict(sourceKind=compiler.GAMEPLAY_ART_SOURCE_KIND,review=compiler.GAMEPLAY_ART_REVIEW,role='prop',key=key,path=path.relative_to(ROOT).as_posix(),sha256=digest(path),kind='static',size=list(cell.size),anchor=anchor,bundle='world',assetId='world.prop.'+key,provenance=dict(method='imagegen-imperial-kit-v1',source=source.relative_to(ROOT).as_posix(),sourceSha256=digest(source),parameters=dict(cell=list(box),alphaBounds=list(bounds),uniformWidth=width)))
            payload['descriptors']['prop:'+key]=d;descriptors.append(d)
            packed=compiler._copy_final_aligned_source(d)
            compiler.save_lossless_webp(cell,packed)
            runtime['entries'][d['assetId']]=compiler.static_entry(packed,tuple(anchor),'world')
            runtime['maps']['props'][key]=d['assetId'];report.append(dict(key=key,size=list(cell.size),anchor=anchor,alpha=cell.getchannel('A').getextrema()))
    payload_path.write_text(json.dumps(payload,indent=2,sort_keys=True)+'\n',newline='\n')
    manifest_path.write_text(text[:text.index('{')]+json.dumps(runtime,indent=2,sort_keys=True)+';\n',newline='\n')
    data_path=ROOT/'js/data.js';data=data_path.read_text(encoding='utf-8');start='  /* Imperial modular architecture v1. */';end='  /* End imperial modular architecture. */'
    if start in data:data=data[:data.index(start)]+data[data.index(end)+len(end):].lstrip('\n')
    at=data.index('  /* Town architecture library v2. */')
    data_path.write_text(data[:at]+start+'\n'+'\n'.join('  prop_'+d['key']+': { src: "'+d['path']+'", raw: true },' for d in descriptors)+'\n'+end+'\n'+data[at:],encoding='utf-8',newline='\n')
    coverage_path=ROOT/'assets/sprites/coverage.json';coverage=json.loads(coverage_path.read_text());coverage.update(assetCount=len(runtime['entries']),props=sorted(runtime['maps']['props']));coverage_path.write_text(json.dumps(coverage,indent=2,sort_keys=True)+'\n')
    (AUTH/'registration.json').write_text(json.dumps(report,indent=2)+'\n')
    print('Registered',len(report),'painted architecture modules')
if __name__=='__main__':main()
