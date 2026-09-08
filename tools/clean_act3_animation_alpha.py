"""User-authorized separate alpha copies; never change the ImageGen originals."""
from pathlib import Path
import json, hashlib
import numpy as np
from PIL import Image, ImageFilter

ROOT=Path(__file__).resolve().parents[1]
CONFIG=ROOT/'assets/act3_animations/generated.json'
def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def main():
    config=json.loads(CONFIG.read_text());reports=[]
    for spec in config['enemies']:
        source=ROOT/spec.get('matteSource',spec['source']);im=Image.open(source).convert('RGBA')
        rgb=np.asarray(im)[:,:,:3].astype(float)
        floor={'sand_raider':115,'tomb_guard':185,'soul_chained':128,'shard_construct':185,'crystal_marauder':180,'dune_serpent':180,'stone_gargoyle':138}.get(spec['id'],230)
        floor=spec.get('neutralMinChannel',floor)
        low=rgb.min(axis=2);chroma=rgb.max(axis=2)-low
        background=(low>=floor)&(chroma<=24)
        if im.getchannel('A').getextrema()[0]==0:
            result=im;method='native-alpha'
        else:
            alpha=Image.fromarray(np.where(background,0,255).astype('uint8')).filter(ImageFilter.GaussianBlur(.28))
            result=im.copy();result.putalpha(alpha);method='neutral-matte'
        output=ROOT/'assets/act3_animations/alpha'/(spec['id']+'.png');output.parent.mkdir(parents=True,exist_ok=True);result.save(output)
        spec['alphaSource']=output.relative_to(ROOT).as_posix()
        reports.append({'id':spec['id'],'input':source.relative_to(ROOT).as_posix(),'inputHash':digest(source),'output':spec['alphaSource'],'outputHash':digest(output),'method':method,'neutralMinChannel':floor,'neutralChromaMax':24,'transparentFraction':round(float(background.mean()),4)})
        print(spec['id'],method,round(float(background.mean())*100,1),'% background')
    CONFIG.write_text(json.dumps(config,indent=2)+'\n')
    (ROOT/'assets/act3_animations/alpha_cleanup.json').write_text(json.dumps({'authorization':'User explicitly approved local Python cleanup of separate copies','images':reports},indent=2)+'\n')
if __name__=='__main__':main()
