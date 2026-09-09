"""Verify Act V provenance, runtime pixels, anchors, and complete source crops."""
from pathlib import Path
import json,hashlib
from PIL import Image,ImageChops
ROOT=Path(__file__).resolve().parents[1]
AUTH=ROOT/'assets/sprites_src/gameplay_art_authored/act5_environment'
payload=json.loads((ROOT/'assets/sprites_src/gameplay_art/gameplay_art_v1.json').read_text())
raw=(ROOT/'js/sprite_manifest.js').read_text();manifest=json.loads(raw[raw.index('{'):].strip().removesuffix(';'))
checks=0
def ok(v,msg):
 global checks
 checks+=1
 assert v,msg
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
for kit in json.loads((AUTH/'registration.json').read_text())['kits']:
 for spec in kit['modules']:
  key='a5env_'+kit['key']+'_'+spec['name'];d=payload['descriptors']['prop:'+key];entry=manifest['entries'][d['assetId']]
  ok(manifest['maps']['props'][key]==d['assetId'],key+' missing mapping')
  ok(digest(ROOT/d['path'])==d['sha256'],key+' source changed')
  ok(digest(ROOT/d['provenance']['source'])==d['provenance']['sourceSha256'],key+' original changed')
  src=Image.open(ROOT/d['path']).convert('RGBA');packed=Image.open(ROOT/entry['src']).convert('RGBA')
  ok(src.size==packed.size,key+' packed dimensions')
  ok(ImageChops.difference(src,packed).getbbox() is None,key+' packed pixels differ')
  ok(entry['anchor']==d['anchor'],key+' shifted anchor')
  ok(src.getchannel('A').getextrema()[0]==0,key+' missing alpha')
  cell=Image.open(AUTH/kit['source']).crop(spec['box']).convert('RGBA');a=cell.getchannel('A')
  # No opaque silhouette may be cut by a technical sheet boundary.
  ok(a.crop((0,0,cell.width,1)).getextrema()[1]<200,key+' clipped top')
  ok(a.crop((0,cell.height-1,cell.width,cell.height)).getextrema()[1]<200,key+' clipped bottom')
report=dict(status='PASS',checks=checks,modules=60)
(ROOT/'tests/qa/act5_environment/sprites.json').write_text(json.dumps(report,indent=2)+'\n');print(report)
