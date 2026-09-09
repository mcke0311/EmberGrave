"""Reproducibly crop generated alpha art, align states, and pack prop atlases."""
import hashlib,json
from collections import deque
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
AUTH=ROOT/'assets/sprites_src/gameplay_art_authored/prop_interactions'
REPORT=AUTH/'import.json'
CELL=160
ANCHOR=[80,152]
GROUPS=[([0,1],78),([2,3,4],66),([5,6,7],66),([8,9,10],64),([11,12],76),([13,14],76),([15,16],66),([17,18],48),([19,20],54),([21,22],42),([23],44)]
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def write(path,text):
    if path.exists() and path.read_text(encoding='utf-8')==text:return
    temp=path.with_name(path.name+'.props-tmp');newline='\r\n' if path.exists() and b'\r\n' in path.read_bytes() else '\n'
    temp.write_bytes(text.replace('\n',newline).encode('utf-8'));temp.replace(path)
def extract(im):
    # Complete components own their cells, including silhouettes crossing grid lines.
    if im.mode!='RGBA' or im.getchannel('A').getextrema()[0]!=0:raise ValueError('Source needs generated alpha transparency')
    w,h=im.size;pixels=bytearray(im.getchannel('A').point(lambda a:255 if a>=32 else 0).tobytes());boxes=[None]*24
    for seed in range(w*h):
        if not pixels[seed]:continue
        pixels[seed]=0;q=deque([seed]);count=sx=sy=0;x0=w;y0=h;x1=y1=0
        while q:
            k=q.popleft();x=k%w;y=k//w;count+=1;sx+=x;sy+=y;x0=min(x0,x);x1=max(x1,x);y0=min(y0,y);y1=max(y1,y)
            for n in (k-1 if x else -1,k+1 if x+1<w else -1,k-w,k+w):
                if 0<=n<w*h and pixels[n]:pixels[n]=0;q.append(n)
        if count<10:continue
        idx=min(5,int(sy/count/(h/6)))*4+min(3,int(sx/count/(w/4)));b=boxes[idx]
        boxes[idx]=[min(b[0],x0),min(b[1],y0),max(b[2],x1+1),max(b[3],y1+1)] if b else [x0,y0,x1+1,y1+1]
    out=[]
    for idx,b in enumerate(boxes):
        if not b:raise ValueError('Missing silhouette '+str(idx))
        b=[max(0,b[0]-3),max(0,b[1]-3),min(w,b[2]+3),min(h,b[3]+3)]
        if b[2]-b[0]>w*.30 or b[3]-b[1]>h*.22:raise ValueError('Touching cells at '+str(idx))
        out.append((im.crop(b),b))
    return out
def pack(name):
    src=AUTH/(name+'.png');parts=extract(Image.open(src));scales={}
    groups=GROUPS if name.startswith('act') else [([i,i+1],82 if i<6 else 92) for i in range(0,24,2)]
    for indices,width in groups:
        scale=min(width/max(parts[i][0].width for i in indices),132/max(parts[i][0].height for i in indices))
        for i in indices:scales[i]=scale
    atlas=Image.new('RGBA',(CELL*4,CELL*6));bounds=[];crops=[]
    for i,(im,box) in enumerate(parts):
        im=im.resize((max(1,round(im.width*scales[i])),max(1,round(im.height*scales[i]))),Image.Resampling.LANCZOS)
        x=ANCHOR[0]-im.width//2;y=ANCHOR[1]-im.height+3
        atlas.alpha_composite(im,((i%4)*CELL+x,(i//4)*CELL+y));bounds.append({'bounds':[x,y,x+im.width,y+im.height]});crops.append(box)
    output=ROOT/'assets/sprites/packed/world/props'/('interactive_'+name+'.webp');atlas.save(output,lossless=True,exact=True)
    return 'world.props.'+name,dict(src=output.relative_to(ROOT).as_posix(),revision=sha(output)[:12],kind='atlas',cell=[CELL,CELL],cols=4,rows=6,anchor=ANCHOR,bundle='world',hitShapes=bounds,propArt=True),dict(source=src.relative_to(ROOT).as_posix(),sourceHash=sha(src),output=output.relative_to(ROOT).as_posix(),outputHash=sha(output),crops=crops)
def install(entries,maps):
    if not REPORT.exists():return
    report=json.loads(REPORT.read_text())
    for a in report['sources'].values():
        if sha(ROOT/a['source'])!=a['sourceHash'] or sha(ROOT/a['output'])!=a['outputHash']:raise ValueError('Prop art changed; run import_prop_interactions.py')
    entries.update(report['entries'])
def main():
    report={'revision':1,'method':'built-in-imagegen-alpha-crop-uniform-scale','entries':{},'sources':{}}
    for name in ['act1','act2','act3','act4','act5','remains_events']:
        if not (AUTH/(name+'.png')).exists():continue
        aid,entry,source=pack(name);report['entries'][aid]=entry;report['sources'][aid]=source
    write(REPORT,json.dumps(report,indent=2)+'\n')
    path=ROOT/'js/sprite_manifest.js';text=path.read_text();at=text.index('{');manifest=json.loads(text[at:].strip().removesuffix(';'));install(manifest['entries'],manifest['maps'])
    write(path,text[:at]+json.dumps(manifest,indent=2,sort_keys=True)+';\n')
    path=ROOT/'assets/sprites/coverage.json';coverage=json.loads(path.read_text());coverage['assetCount']=len(manifest['entries']);coverage['propAnimationAtlases']=list(report['entries']);write(path,json.dumps(coverage,indent=2,sort_keys=True)+'\n')
    print('Packed',len(report['entries']),'prop atlases;',sum((ROOT/a['output']).stat().st_size for a in report['sources'].values()),'bytes')
if __name__=='__main__':main()
