from pathlib import Path
import json, hashlib
from PIL import Image, ImageDraw
ROOT=Path(__file__).resolve().parents[1]
qa=ROOT/'tests/qa/act2_boundaries'
rows=json.loads((qa/'captures.json').read_text())['captures']
assert len(rows)==184
files=[]
for row in rows:
    path=qa/('{zone}_{width}_{version}_{view}.webp'.format(**row))
    with Image.open(path) as image:
        image.load()
        assert image.size==(row['width'],row['width']*9//16)
    files.append(dict(file=path.name,sha256=hashlib.sha256(path.read_bytes()).hexdigest()))
report=dict(status='PASS',images=len(files),files=files,recordingNote='One final-refresh artifact POST timed out and was successfully retried.')
(qa/'capture_files.json').write_text(json.dumps(report,indent=2)+'\n')
views=[('weeping_marsh','monastery'),('drowned_crypt','cloister'),('hollow_reeds','boats'),('spawn_pools','cistern'),('ritual_site','gallery'),('marshcamp','west_bank')]
sheet=Image.new('RGB',(1280,3*396),'#111a1f');d=ImageDraw.Draw(sheet)
for i,(zone,view) in enumerate(views):
    image=Image.open(qa/f'{zone}_1920_after_{view}.webp');image.thumbnail((640,360))
    x,y=i%2*640,i//2*396;sheet.paste(image,(x,y+28));d.text((x+12,y+8),zone.replace('_',' ').title(),fill='#e4d3af')
sheet.save(qa/'location_contact.jpg',quality=92)
print('Verified',len(files),'full-resolution captures')

