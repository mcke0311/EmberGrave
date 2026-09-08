"""Pack approved transparent Act 3 sequences; originals remain unchanged.

Input must have real alpha. Opaque/checkerboard generations are rejected rather
than accidentally shipped as rectangular sprites. Use --only for staged imports.
"""
import argparse
import hashlib
import json
from pathlib import Path
from collections import deque
from PIL import Image, ImageDraw, ImageFilter, ImageChops

ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / 'assets/act3_animations/generated.json'
REPORT = ROOT / 'assets/act3_animations/import.json'
MANIFEST = ROOT / 'js/sprite_manifest.js'

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def cutouts(image, rows, split_touching=False):
    # Own complete connected silhouettes instead of cutting feet/extended hands
    # at the generator's approximate grid lines. Preserve antialiased edges.
    w,h=image.size;alpha=image.getchannel('A');binary=bytearray(alpha.point(lambda a:255 if a>=96 else 0).tobytes())
    masks=[bytearray(w*h) for _ in range(rows*6)]
    for seed in range(w*h):
        if not binary[seed]:continue
        binary[seed]=0;queue=deque([seed]);pixels=[];sx=sy=0
        while queue:
            k=queue.popleft();pixels.append(k);x,y=k%w,k//w;sx+=x;sy+=y
            for n in (k-1 if x else -1,k+1 if x+1<w else -1,k-w,k+w):
                if 0<=n<w*h and binary[n]:binary[n]=0;queue.append(n)
        if len(pixels)<8:continue
        col=min(5,int(sx/len(pixels)/(w/6)));row=min(rows-1,int(sy/len(pixels)/(h/rows)))
        counts={}
        for k in pixels:
            bucket=min(rows-1,int((k//w)/(h/rows)))*6+min(5,int((k%w)/(w/6)))
            counts[bucket]=counts.get(bucket,0)+1
        substantial=[b for b,count in counts.items() if count>len(pixels)*.24]
        # A few generated spell trails touch the next complete character.
        # Split only components containing substantial bodies in two cells.
        split=split_touching and len(substantial)>1 and len({b//6 for b in substantial})==1
        for k in pixels:
            owner=min(substantial,key=lambda b:abs((b%6+.5)*w/6-k%w)) if split else row*6+col
            masks[owner][k]=255
    result=[]
    for mask in masks:
        owned=Image.frombytes('L',(w,h),bytes(mask)).filter(ImageFilter.MaxFilter(7))
        frame=image.copy();frame.putalpha(ImageChops.multiply(alpha,owned));box=frame.getbbox()
        if not box:raise ValueError('Missing complete silhouette')
        frame=frame.crop(box)
        # Retain the complete body and nearby debris. Discard detached wisps
        # from adjacent cells and neutral specks left by source compression.
        fw,fh=frame.size;binary=bytearray(frame.getchannel('A').point(lambda a:255 if a>=96 else 0).tobytes());parts=[]
        for seed in range(fw*fh):
            if not binary[seed]:continue
            binary[seed]=0;queue=deque([seed]);pixels=[]
            while queue:
                k=queue.popleft();pixels.append(k);x,y=k%fw,k//fw
                for n in (k-1 if x else -1,k+1 if x+1<fw else -1,k-fw,k+fw):
                    if 0<=n<fw*fh and binary[n]:binary[n]=0;queue.append(n)
            xs=[k%fw for k in pixels];ys=[k//fw for k in pixels]
            parts.append((pixels,(min(xs),min(ys),max(xs),max(ys))))
        parts.sort(key=lambda p:len(p[0]),reverse=True);main=parts[0][1];selected=bytearray(fw*fh)
        for pixels,b in parts:
            dx=max(0,main[0]-b[2],b[0]-main[2]);dy=max(0,main[1]-b[3],b[1]-main[3])
            if len(pixels)>=12 and (dx*dx+dy*dy)**.5<=w/6*.055:
                for k in pixels:selected[k]=255
        mask=Image.frombytes('L',(fw,fh),bytes(selected)).filter(ImageFilter.MaxFilter(5))
        frame.putalpha(ImageChops.multiply(frame.getchannel('A'),mask))
        result.append(frame.crop(frame.getbbox()))
    return result

def install(entries, maps):
    if not REPORT.exists(): return
    report = json.loads(REPORT.read_text())
    for spec in report['actors'].values():
        for key in ['source', 'output']:
            if digest(ROOT / spec[key]) != spec[key+'Hash']:
                raise ValueError('Act 3 art changed; rerun importer: '+spec[key])
    entries.update(report['entries'])

def pack(spec):
    from build_sprite_assets import actor_hit_shape
    source = ROOT / spec.get('alphaSource', spec['source'])
    image = Image.open(source)
    if image.mode != 'RGBA' or image.getchannel('A').getextrema()[0] != 0:
        raise ValueError(spec['id']+': source requires real transparent alpha')
    rows = len(spec['sequences']); w, h = image.size
    frames = cutouts(image, rows, True)
    bounds = [frame.getchannel('A').getbbox() for frame in frames]
    if not all(bounds): raise ValueError(spec['id']+': missing frame')
    reference = Image.open(ROOT / spec['reference'])
    box = reference.getbbox()
    target_height = box[3]-box[1]
    cell_h=256
    ground_y=cell_h-20
    scale = target_height/(bounds[0][3]-bounds[0][1])
    roots=[]
    for frame,box in zip(frames,bounds):
        alpha=frame.getchannel('A');strip=alpha.crop((0,max(0,frame.height-max(4,frame.height//12)),frame.width,frame.height))
        # Register on the feet/root base, not the bounding box of a long spell.
        weights=[sum(strip.getpixel((x,y)) for y in range(strip.height)) for x in range(strip.width)]
        total=sum(weights);roots.append(sum(x*v for x,v in enumerate(weights))/total if total else frame.width/2)
    # One scale for every pose, including small collapsed remains.
    # Expand storage for raised arms and long spell trails instead of shrinking
    # the actor when it switches from its existing idle to an authored action.
    cell_w=max(320,32*int((2*max(max(root,frame.width-root) for root,frame in zip(roots,frames))*scale+24+31)//32))
    cell_h=max(cell_h,32*int((max(frame.height for frame in frames)*scale+32+31)//32))
    ground_x=cell_w//2;ground_y=cell_h-20
    packed=[];anchors=[]
    for frame, box, root in zip(frames,bounds,roots):
        body=frame.crop(box);body=body.resize((max(1,round(body.width*scale)),max(1,round(body.height*scale))),Image.Resampling.LANCZOS)
        cell=Image.new('RGBA',(cell_w,cell_h));x=ground_x-round(root*scale);y=ground_y-body.height
        cell.alpha_composite(body,(x,y));packed.append(cell);anchors.append([ground_x,ground_y])
    atlas=Image.new('RGBA',(cell_w*6,cell_h*rows))
    for i,cell in enumerate(packed):atlas.alpha_composite(cell,((i%6)*cell_w,(i//6)*cell_h))
    output=ROOT/'assets/act3_animations/packed'/ (spec['id']+'.webp');output.parent.mkdir(parents=True,exist_ok=True)
    atlas.save(output,'WEBP',lossless=True,method=6)
    preview=ROOT/'tests/qa/act3_animation/previews';preview.mkdir(parents=True,exist_ok=True)
    review=Image.new('RGBA',atlas.size,'#273437');review.alpha_composite(atlas)
    draw=ImageDraw.Draw(review)
    for i in range(len(packed)):draw.text(((i%6)*cell_w+8,(i//6)*cell_h+cell_h-16),f"{spec['sequences'][i//6]} {i%6+1}",fill='white')
    review.convert('RGB').save(preview/(spec['id']+'.jpg'),quality=94)
    for row,name in enumerate(spec['sequences']):
        playback=[]
        for frame in packed[row*6:(row+1)*6]:
            c=Image.new('RGBA',frame.size,'#273437');c.alpha_composite(frame);playback.append(c)
        playback[0].save(preview/(spec['id']+'_'+name+'.webp'),save_all=True,append_images=playback[1:],duration=[180,180,180,140,160,700 if name=='death' else 240],loop=0,lossless=True)
    entry={'kind':'atlas','src':output.relative_to(ROOT).as_posix(),'revision':digest(output)[:12], 'cell':[cell_w,cell_h],'cols':6,'rows':rows,'anchor':[ground_x,ground_y],'anchors':anchors,'bundle':'actors:act3','act3Art':True,'isolateFrameSampling':True,'hitShapes':[actor_hit_shape(f) for f in packed]}
    report={'source':source.relative_to(ROOT).as_posix(),'sourceHash':digest(source),'output':entry['src'],'outputHash':digest(output),'frames':len(packed),'sequences':spec['sequences'],'sourceBounds':bounds,'scale':scale}
    return entry,report

def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--only',nargs='+');parser.add_argument('--check',action='store_true');parser.add_argument('--install-only',action='store_true');args=parser.parse_args()
    if args.check:
        entries={};install(entries,{})
        config=json.loads(CONFIG.read_text());expected={"actor.act3."+e['id'] for e in config['enemies']}
        assert set(entries)==expected,'Incomplete Act 3 atlas roster'
        for spec in config['enemies']:
            assert digest(ROOT/spec['source'])==spec['sourceHash'],'Original generation changed: '+spec['id']
        manifest=json.loads(MANIFEST.read_text().split('DATA.SPRITE_MANIFEST = ',1)[1].strip().removesuffix(';'))
        for key,entry in entries.items():
            assert entry==manifest['entries'][key],key
            image=Image.open(ROOT/entry['src']);assert image.mode=='RGBA'
            assert len(entry['anchors'])==entry['rows']*6 and len(entry['hitShapes'])==entry['rows']*6,key
            distinct=[]
            for n in range(entry['rows']*6):
                w,h=entry['cell'];cell=image.crop((n%6*w,n//6*h,n%6*w+w,n//6*h+h));bounds=cell.getbbox()
                assert bounds and bounds[0]>0 and bounds[1]>0 and bounds[2]<w and bounds[3]<h,key
                assert entry['hitShapes'][n]['bounds']==list(bounds),key+' mask'
                distinct.append(hashlib.sha256(cell.tobytes()).hexdigest())
                if n%6==5:assert len(set(distinct[-6:]))==6,key+' repeated authored frames'
        print('PASS:',len(entries),'atlases; source hashes, alpha, padding, anchors and targeting masks');return
    config=json.loads(CONFIG.read_text());report=json.loads(REPORT.read_text()) if REPORT.exists() else {'version':1,'actors':{},'entries':{}}
    for spec in config['enemies']:
        if args.install_only:continue
        if args.only and spec['id'] not in args.only:continue
        print('Packing',spec['id'],flush=True)
        entry,actor=pack(spec);report['entries']['actor.act3.'+spec['id']]=entry;report['actors'][spec['id']]=actor
    REPORT.write_text(json.dumps(report,indent=2)+'\n')
    manifest=json.loads(MANIFEST.read_text().split('DATA.SPRITE_MANIFEST = ',1)[1].strip().removesuffix(';'));install(manifest['entries'],manifest['maps'])
    MANIFEST.write_text('/* Generated by tools/build_sprite_assets.py. Do not hand-edit. */\n"use strict";\n\nDATA.SPRITE_MANIFEST = '+json.dumps(manifest,indent=2,sort_keys=True)+';\n')
    coverage_path=ROOT/'assets/sprites/coverage.json';coverage=json.loads(coverage_path.read_text());coverage['assetCount']=len(manifest['entries']);coverage_path.write_text(json.dumps(coverage,indent=2)+'\n')
    print('Packed',sum(a['frames'] for a in report['actors'].values()),'authored frames')

if __name__=='__main__':main()
