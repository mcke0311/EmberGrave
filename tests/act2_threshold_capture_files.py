"""Validate full-resolution endpoint captures and build a review contact sheet."""
from pathlib import Path
import json,hashlib
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[1];QA=ROOT/'tests/qa/act2_thresholds'
rows=json.loads((QA/'captures.json').read_text())['captures']
assert len(rows)==156,len(rows)
names=set();hashes={}
for row in rows:
    p=QA/row['name'];im=Image.open(p);im.load()
    assert im.size==(row['width'],round(row['width']*9/16)),row['name']
    assert row['name'] not in names;names.add(row['name'])
    hashes[row['name']]=hashlib.sha256(p.read_bytes()).hexdigest()
    if row['view']=='hover' and row['version']=='after':assert row.get('hover'),row['name']+' hover missing'
pairs=sorted(set((r['zone'],r['type']) for r in rows));assert len(pairs)==10
for group in range(2):
    contact=Image.new('RGB',(1200,5*350),'#172324');draw=ImageDraw.Draw(contact)
    for i,(zone,kind) in enumerate(pairs[group*5:group*5+5]):
        for col,version in enumerate(['before','after']):
            row=next(r for r in rows if r['zone']==zone and r['type']==kind and r['width']==1920 and r['view']=='arrival' and r['version']==version)
            im=Image.open(QA/row['name']);im=im.crop((490,140,1490,670));im.thumbnail((590,312))
            contact.paste(im,(col*600,i*350+24));draw.text((col*600+5,i*350+4),zone+' / '+kind+' / '+version,fill='#e4d3af')
    contact.save(QA/f'entrance_comparison_{group+1}.jpg',quality=92)
(QA/'capture_validation.json').write_text(json.dumps({'status':'PASS','captures':len(rows),'endpoints':10,'widths':[1920,3840],'sha256':hashes},indent=2)+'\n')
print('PASS: 156 captures, ten endpoints, both resolutions')
