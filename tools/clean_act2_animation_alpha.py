"""Remove painted neutral checkerboards, with user-authorized local processing.

Original ImageGen PNGs are immutable inputs. The output is a separate RGBA PNG;
parameters and input/output hashes are recorded for reproducibility. No network
or model is used. Run with the bundled Python runtime (Pillow and NumPy).
"""
from pathlib import Path
import hashlib
import json
import numpy as np
from PIL import Image, ImageFilter

ROOT=Path(__file__).resolve().parents[1]
CONFIG=ROOT/'assets/act2_animations/generated.json'

def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()

def main():
    config=json.loads(CONFIG.read_text());reports=[]
    for spec in config['enemies']:
        path=ROOT/spec['source'];source=Image.open(path)
        if source.mode=='RGBA' and source.getchannel('A').getextrema()[0]==0:continue
        rgb=np.asarray(source.convert('RGB')).astype(np.float32)
        low=rgb.min(axis=2);chroma=rgb.max(axis=2)-low
        # Dark checkerboards occur only on frost/larva sheets. Their neutral
        # backdrop is distinct from the saturated frost and ochre body colors.
        floor=112 if spec['id'] in ['silent_cultist','song_thrall','marsh_larvae'] else 166 if spec['id']=='mire_mother_1' else 182
        background=(low>=floor)&(chroma<=24)
        alpha=Image.fromarray(np.where(background,0,255).astype('uint8'),'L')
        # A tiny edge filter becomes a smooth subpixel boundary when packed.
        alpha=alpha.filter(ImageFilter.GaussianBlur(.28))
        result=source.convert('RGBA');result.putalpha(alpha)
        output=ROOT/'assets/act2_animations/alpha'/(spec['id']+'.png');output.parent.mkdir(parents=True,exist_ok=True);result.save(output)
        spec['alphaSource']=output.relative_to(ROOT).as_posix()
        reports.append({'id':spec['id'],'source':spec['source'],'sourceHash':digest(path),'output':spec['alphaSource'],'outputHash':digest(output),'neutralChromaMax':24,'neutralMinChannel':floor,'transparentFraction':round(float(background.mean()),5)})
        print(spec['id'],round(float(background.mean())*100,1),'% background',flush=True)
    CONFIG.write_text(json.dumps(config,indent=2)+'\n')
    (ROOT/'assets/act2_animations/alpha_cleanup.json').write_text(json.dumps({'version':1,'authorization':'User explicitly approved local Python image editing','method':'neutral-checker-matte-v1','images':reports},indent=2)+'\n')

if __name__=='__main__':main()
