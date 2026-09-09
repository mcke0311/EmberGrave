"""Build technical contact sheets and the scene index from production captures."""
from pathlib import Path
from PIL import Image,ImageDraw
import json
ROOT=Path(__file__).resolve().parents[1];QA=ROOT/'tests/qa/act4_environment'
zones=['cathedral1','cathedral2','cathedral_cinderwatch','cathedral_bastion'];scenes=[]
for zone in zones:
    for width in (1920,3840):
        paths=sorted(QA.glob(f'after_{zone}_{width}_*.webp'))
        sheet=Image.new('RGB',(1800,((len(paths)+2)//3)*364),'#171821');draw=ImageDraw.Draw(sheet)
        for i,p in enumerate(paths):
            image=Image.open(p);assert image.size==(width,width*9//16),p.name
            view=p.stem.removeprefix(f'after_{zone}_{width}_')
            before=QA/f'before_{zone}_{width}_{view}.webp';assert before.exists(),before
            image.thumbnail((600,338));x,y=i%3*600,i//3*364;sheet.paste(image,(x,y));draw.text((x+8,y+342),view,fill='#ddd4bb')
            scenes.append({'zone':zone,'width':width,'view':view,'before':before.name,'after':p.name})
        sheet.save(QA/f'contact_{zone}_{width}.jpg',quality=92)
(QA/'scenes.json').write_text(json.dumps(scenes,indent=2)+'\n')
print('Indexed',len(scenes),'before/after production scenes')
