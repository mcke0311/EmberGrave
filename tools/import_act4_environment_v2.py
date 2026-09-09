"""Reviewed continuous-wall and surface paintings; crop, alpha extraction, uniform scale."""
from pathlib import Path
import json,hashlib
from PIL import Image
import build_sprite_assets as compiler
from import_act4_environment import decode,write_text,ROOT,ART,AUTH,sha

def main():
    descriptors=[];entries={}
    def register(key,source,box,width,anchor=None,opaque=False):
        image=Image.open(source).crop(box)
        image,method=(image.convert('RGBA'),'opaque-material') if opaque else decode(image)
        bounds=image.getchannel('A').point(lambda a:255 if a>12 else 0).getbbox()
        if opaque:bounds=(0,0,image.width,image.height)
        image=image.crop(bounds);scale=width/image.width
        image=image.resize((width,round(image.height*scale)),Image.Resampling.LANCZOS)
        anchor=[round((anchor[0]-box[0]-bounds[0])*scale),round((anchor[1]-box[1]-bounds[1])*scale)] if anchor else [width//2,image.height//2]
        dest=ART/'world/props'/(key+'.png');image.save(dest)
        d=dict(sourceKind='authored-final-aligned',review='act4-environment-v2',role='prop',key=key,path=dest.relative_to(ROOT).as_posix(),sha256=sha(dest),kind='static',size=list(image.size),anchor=anchor,bundle='world',assetId='world.prop.'+key,lossless=True,provenance=dict(method='imagegen-act4-environment-v2',source=source.relative_to(ROOT).as_posix(),sourceSha256=sha(source),parameters=dict(box=box,alphaBounds=list(bounds),alphaMethod=method,scale=scale)))
        entries[d['assetId']]=compiler.static_entry(compiler._copy_final_aligned_source(d),tuple(anchor),'world');descriptors.append(d)
    source=AUTH/'retry_cliff.png';w,h=Image.open(source).size
    rows=[0,268,542,789,h]
    for i,kit in enumerate(['pale','dark','ash','bastion']):
        register('a4v2_cliff_'+kit,source,[0,rows[i]+3,w,rows[i+1]-3],1024,opaque=True)
    source=AUTH/'retry_floor.png';w,h=Image.open(source).size
    for i,kit in enumerate(['pale','dark','ash','bastion']):
        register('a4v2_floor_'+kit,source,[i%2*w//2+3,i//2*h//2+3,(i%2+1)*w//2-3,(i//2+1)*h//2-3],512,opaque=True)
    source=AUTH/'retry_planes.png';w,h=Image.open(source).size
    for i,kit in enumerate(['pale','dark','ash','bastion']):
        rows=[0,278,543,777,h]
        register('a4v2_wall_'+kit,source,[0,rows[i]+3,w,rows[i+1]-3],1024,opaque=True)
    source=AUTH/'retry_doors.png';w,h=Image.open(source).size
    for i,kit in enumerate(['pale','dark','ash','bastion']):
        register('a4v2_door_'+kit,source,[i%2*w//2,i//2*h//2,(i%2+1)*w//2,(i//2+1)*h//2],400)
    source=AUTH/'retry_accents_matte.png';w,h=Image.open(source).size
    for i,kit in enumerate(['pale','dark','ash','bastion']):
        register('a4v2_pier_'+kit,source,[i*w//4,0,(i+1)*w//4,h//2],112)
        register('a4v2_crag_'+kit,source,[i*w//4,h//2,(i+1)*w//4,h],224)
    source=AUTH/'retry_accents_matte.png';w,h=Image.open(source).size
    for i,kit in enumerate(['pale','dark','ash','bastion']):
        register('a4v2_pier_'+kit,source,[i*w//4,0,(i+1)*w//4,h//2],112)
        register('a4v2_crag_'+kit,source,[i*w//4,h//2,(i+1)*w//4,h],224)
    payload_path=ART/'gameplay_art_v1.json';manifest_path=ROOT/'js/sprite_manifest.js'
    payload=json.loads(payload_path.read_text());text=manifest_path.read_text();runtime=json.loads(text[text.index('{'):].strip().removesuffix(';'))
    for d in descriptors:
        payload['descriptors']['prop:'+d['key']]=d;runtime['entries'][d['assetId']]=entries[d['assetId']];runtime['maps']['props'][d['key']]=d['assetId']
    write_text(payload_path,json.dumps(payload,indent=2,sort_keys=True)+'\n');write_text(manifest_path,text[:text.index('{')]+json.dumps(runtime,indent=2,sort_keys=True)+';\n')
    path=ROOT/'js/data.js';data=path.read_text(encoding='utf-8');start='  /* Act 4 environment library v2. */';end='  /* End Act 4 environment library v2. */'
    if start in data:data=data[:data.index(start)]+data[data.index(end)+len(end):].lstrip('\n')
    at=data.index('  /* Act 4 environment library v1. */');block=start+'\n'+'\n'.join('  prop_'+d['key']+': { src: "'+d['path']+'", raw: true },' for d in descriptors)+'\n'+end+'\n'
    write_text(path,data[:at]+block+data[at:]);write_text(AUTH/'registration_v2.json',json.dumps(descriptors,indent=2)+'\n')
    path=ROOT/'assets/sprites/coverage.json';coverage=json.loads(path.read_text());coverage.update(assetCount=len(runtime['entries']),props=sorted(runtime['maps']['props']));write_text(path,json.dumps(coverage,indent=2,sort_keys=True)+'\n')
    print('Registered',len(descriptors),'continuous environment assets')
if __name__=='__main__':main()
