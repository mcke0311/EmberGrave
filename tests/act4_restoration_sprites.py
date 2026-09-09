"""Verify new paintings survive registration/packing and scene captures are usable."""
from pathlib import Path
import hashlib
import json
from PIL import Image, ImageChops, ImageStat

ROOT=Path(__file__).resolve().parents[1]
AUTH=ROOT/'assets/sprites_src/gameplay_art_authored/act4_restoration'
QA=ROOT/'tests/qa/act4_rebuild'
text=(ROOT/'js/sprite_manifest.js').read_text(encoding='utf-8')
manifest=json.loads(text[text.index('{'):].strip().removesuffix(';'))
payload=json.loads((ROOT/'assets/sprites_src/gameplay_art/gameplay_art_v1.json').read_text(encoding='utf-8'))
data=(ROOT/'js/data.js').read_text(encoding='utf-8')
rows=[]
for d in json.loads((AUTH/'registration.json').read_text()):
    key=d['key'];entry=manifest['entries'][d['assetId']]
    assert payload['descriptors']['prop:'+key]==d
    assert manifest['maps']['props'][key]==d['assetId']
    assert 'prop_'+key+':' in data
    assert entry['anchor']==d['anchor']
    for path,digest in [(d['path'],d['sha256']),(d['provenance']['source'],d['provenance']['sourceSha256'])]:
        assert hashlib.sha256((ROOT/path).read_bytes()).hexdigest()==digest
    source=Image.open(ROOT/d['path']).convert('RGBA');packed=Image.open(ROOT/entry['src']).convert('RGBA')
    assert list(source.size)==list(packed.size)==d['size']
    assert ImageChops.difference(source.getchannel('A'),packed.getchannel('A')).getbbox() is None
    if key=='cathedral_pews':
        assert source.getchannel('A').getextrema()[0]==0
        assert 0<d['anchor'][0]<source.width and 0<d['anchor'][1]<source.height
    rows.append({'key':key,'size':d['size'],'anchor':d['anchor'],'sourceHashAndAlpha':'PASS'})
scenes=[]
for path in sorted([*QA.glob('before_*.webp'),*QA.glob('after_*.webp')]):
    image=Image.open(path).convert('RGB');expected=(3840,2160) if path.stem.endswith('_4k') else (1920,1080)
    assert image.size==expected,path.name
    image.thumbnail((160,90));stats=ImageStat.Stat(image)
    assert sum(stats.mean)/3>5 and max(stats.stddev)>8,'Blank scene: '+path.name
    scenes.append(path.name)
assert len(scenes)==34,'Missing paired / 4K captures'
report={'status':'PASS','assets':rows,'nonblankScenes':len(scenes)}
(QA/'assets_and_captures.json').write_text(json.dumps(report,indent=2)+'\n')
print('PASS 2 authored assets and 34 nonblank production captures')
