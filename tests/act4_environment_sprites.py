"""Source provenance, matte removal, anchors and pixel-preserving packing."""
from pathlib import Path
import json,hashlib,sys
from PIL import Image,ImageChops
ROOT=Path(__file__).resolve().parents[1]
AUTH=ROOT/'assets/sprites_src/gameplay_art_authored/act4_environment'
manifest_text=(ROOT/'js/sprite_manifest.js').read_text()
manifest=json.loads(manifest_text[manifest_text.index('{'):].strip().removesuffix(';'))
rows=json.loads((AUTH/'registration.json').read_text());checks=0
def ok(v,label):
    global checks
    checks+=1
    if not v:raise AssertionError(label)
ok(len(rows)==72,'Expected four complete 16-piece kits, four floors and four transition patches')
for d in rows:
    key=d['assetId'];p=ROOT/d['path'];im=Image.open(p).convert('RGBA');entry=manifest['entries'][key]
    ok(hashlib.sha256(p.read_bytes()).hexdigest()==d['sha256'],key+' canonical hash')
    source=ROOT/d['provenance']['source']
    ok(hashlib.sha256(source.read_bytes()).hexdigest()==d['provenance']['sourceSha256'],key+' source hash')
    ok(im.size==tuple(d['size']),key+' dimensions')
    ok(0<=d['anchor'][0]<im.width and 0<=d['anchor'][1]<im.height,key+' anchor')
    packed=Image.open(ROOT/entry['src']).convert('RGBA')
    ok(packed.size==im.size and ImageChops.difference(packed,im).getbbox() is None,key+' packed pixels')
    ok(manifest['maps']['props'][d['key']]==key,key+' registration')
    if 'floor_' not in d['key']:
        ok(im.getchannel('A').getextrema()==(0,255),key+' real alpha')
        visible=list(im.getdata());ok(not any(a>200 and min(r,b)-g>95 for r,g,b,a in visible),key+' technical matte leaked')
report={'status':'PASS','assets':len(rows),'checks':checks}
(ROOT/'tests/qa/act4_environment/sprites.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report))
