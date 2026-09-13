from pathlib import Path
from PIL import Image,ImageDraw
import json,math
from urllib.parse import urlparse
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'tmp/mobile-fixes';OUT.mkdir(parents=True,exist_ok=True)
checks=0
sizes={'favicon-16.png':16,'favicon-32.png':32,'icon-180.png':180,'icon-192.png':192,'icon-512.png':512,'icon-maskable-192.png':192,'icon-maskable-512.png':512}
for name,size in sizes.items():
 im=Image.open(ROOT/'assets/ui/app'/name).convert('RGB')
 assert im.size==(size,size),name;checks+=1
 gold=[(x,y) for y in range(size) for x in range(size) if (lambda p:p[0]>100 and p[0]>p[2]*1.2)(im.getpixel((x,y)))]
 assert len(gold)>size*size*.035,name+' readable gold strokes';checks+=1
 if 'maskable' in name:
  assert max(math.hypot(x+.5-size/2,y+.5-size/2) for x,y in gold)<=size*.4,name+' crest safe area';checks+=1
ico=Image.open(ROOT/'favicon.ico');assert ico.ico.sizes()=={(16,16),(32,32),(48,48)};checks+=1
manifest=json.loads((ROOT/'manifest.webmanifest').read_text(encoding='utf-8'))
assert {row.get('purpose') for row in manifest['icons']}=={'any','maskable'};checks+=1
for row in manifest['icons']:
 url=urlparse(row['src']);assert not url.scheme and not url.path.startswith('/');checks+=1
 im=Image.open(ROOT/url.path);assert row['sizes']==f'{im.width}x{im.height}';checks+=1
for page in ['index.html','loot.html','support.html','editor.html']:
 source=(ROOT/page).read_text(encoding='utf-8')
 for asset in ['favicon.ico','assets/ui/app/favicon-16.png','assets/ui/app/favicon-32.png']:
  assert asset in source,page+' links '+asset;checks+=1
assert 'assets/ui/app/icon-180.png?v=2' in (ROOT/'index.html').read_text(encoding='utf-8');checks+=1
sheet=Image.new('RGB',(720,250),'#eeeeee');d=ImageDraw.Draw(sheet)
for x,size in [(20,16),(80,32),(160,48)]:
 im=ico.ico.getimage((size,size)).convert('RGB');sheet.paste(im,(x,40));d.text((x,10),f'{size}px',fill='black')
base=Image.open(ROOT/'assets/ui/app/icon-maskable-512.png').resize((180,180))
for i,shape in enumerate(['circle','rounded','square']):
 mask=Image.new('L',(180,180));md=ImageDraw.Draw(mask)
 if shape=='circle':md.ellipse((0,0,179,179),fill=255)
 elif shape=='rounded':md.rounded_rectangle((0,0,179,179),radius=42,fill=255)
 else:md.rectangle((0,0,179,179),fill=255)
 x=220+i*160;display=base.resize((145,145));sheet.paste(display,(x,40),mask.resize((145,145)));d.text((x,10),shape,fill='black')
sheet.save(OUT/'icon-review.png')
(OUT/'icon-results.json').write_text(json.dumps({'checks':checks,'sizes':sizes,'ico':[16,32,48],'maskableSafeRadius':.4},indent=2))
print(f'PASS {checks} app icon checks; preview {OUT / "icon-review.png"}')
