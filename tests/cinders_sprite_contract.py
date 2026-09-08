"""Verify Act V source provenance, transparency, packing and runtime registration."""
from pathlib import Path
import hashlib
import json
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
text=(ROOT/'js/sprite_manifest.js').read_text()
manifest=json.loads(text[text.index('{'):].strip().removesuffix(';'))
descriptors=json.loads((ROOT/'assets/sprites_src/gameplay_art/gameplay_art_v1.json').read_text())['descriptors']
prompts=json.loads((ROOT/'assets/sprites_src/gameplay_art_authored/cinders/prompts.json').read_text())['assets']
coverage=json.loads((ROOT/'assets/sprites/coverage.json').read_text())
checks=0
for p in prompts:
    key='cinders_'+p['key'];d=descriptors['prop:'+key];source=ROOT/d['path'];original=ROOT/d['provenance']['source']
    assert hashlib.sha256(source.read_bytes()).hexdigest()==d['sha256']
    assert hashlib.sha256(original.read_bytes()).hexdigest()==d['provenance']['sourceSha256']
    entry=manifest['entries'][d['assetId']]
    assert manifest['maps']['props'][key]==d['assetId'] and key in coverage['props']
    assert entry['bundle']=='world' and entry['anchor']==d['anchor']
    with Image.open(source) as im,Image.open(ROOT/entry['src']) as packed:
        assert im.mode==packed.mode=='RGBA'
        assert list(im.size)==list(packed.size)==d['size']
        lo,hi=im.getchannel('A').getextrema();assert lo==0 and hi>=200
        assert packed.getchannel('A').getextrema()[0]==0
        assert 0<d['anchor'][0]<im.width and 0<d['anchor'][1]<im.height
    checks+=9
assert len(prompts)==14
report={'status':'PASS','assets':len(prompts),'checks':checks,'method':'built-in ImageGen, native alpha preserved, uniform resize, final-aligned compiler encoding'}
out=ROOT/'tests/qa/cinders';out.mkdir(parents=True,exist_ok=True)
(out/'sprites.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
