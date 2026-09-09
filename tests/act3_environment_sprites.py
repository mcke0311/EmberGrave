from pathlib import Path
import hashlib,json
from PIL import Image
import numpy as np
ROOT=Path(__file__).resolve().parents[1]
auth=ROOT/'assets/sprites_src/gameplay_art_authored/act3_environment'
payload=json.loads((ROOT/'assets/sprites_src/gameplay_art/gameplay_art_v1.json').read_text())
text=(ROOT/'js/sprite_manifest.js').read_text();manifest=json.loads(text[text.index('{'):].strip().removesuffix(';'))
rows=json.loads((auth/'registration.json').read_text());checks=0
for row in rows:
 d=payload['descriptors']['prop:'+row['key']];entry=manifest['entries'][d['assetId']];source=ROOT/d['provenance']['source']
 assert hashlib.sha256(source.read_bytes()).hexdigest()==d['provenance']['sourceSha256'];checks+=1
 assert hashlib.sha256((ROOT/d['path']).read_bytes()).hexdigest()==d['sha256'];checks+=1
 with Image.open(ROOT/d['path']) as im,Image.open(ROOT/entry['src']) as packed:
  assert im.mode=='RGBA' and im.size==packed.size and list(im.size)==row['size'];checks+=1
  assert list(entry['anchor'])==d['anchor']==row['anchor'];checks+=1
  a=Image.new('RGBA',im.size);a.alpha_composite(im);b=Image.new('RGBA',im.size);b.alpha_composite(packed.convert('RGBA'))
  assert a.tobytes()==b.tobytes(),row['key'];checks+=1
  assert im.getchannel('A').getextrema()==(0,255);checks+=1
  box=row['box'];assert abs(im.width-(box[2]-box[0])*row['scale'])<=.51 and abs(im.height-(box[3]-box[1])*row['scale'])<=.51;checks+=1
  p=np.array(im).astype(int);matte=(p[:,:,0]>175)&(p[:,:,2]>175)&(p[:,:,1]<80)&(p[:,:,3]>100)
  assert not matte.any(),row['key']+' magenta matte leak';checks+=1
report={'status':'PASS','assets':len(rows),'checks':checks,'method':'Native or decoded alpha; complete modules uniformly registered and losslessly packed.'}
(ROOT/'tests/qa/act3_environment/sprites.json').write_text(json.dumps(report,indent=2));print(report)
