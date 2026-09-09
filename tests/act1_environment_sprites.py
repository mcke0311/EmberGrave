"""Source provenance, clean alpha, registration, and exact packed pixels."""
from pathlib import Path
import hashlib,json
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
payload=json.loads((ROOT/'assets/sprites_src/gameplay_art/gameplay_art_v1.json').read_text())
text=(ROOT/'js/sprite_manifest.js').read_text();manifest=json.loads(text[text.index('{'):].strip().removesuffix(';'))
ds=[d for d in payload['descriptors'].values() if d['key'].startswith('a1env_')]
assert len(ds)==60
for d in ds:
 p=ROOT/d['path'];source=ROOT/d['provenance']['source'];e=manifest['entries'][d['assetId']]
 assert hashlib.sha256(p.read_bytes()).hexdigest()==d['sha256']
 assert hashlib.sha256(source.read_bytes()).hexdigest()==d['provenance']['sourceSha256']
 assert manifest['maps']['props'][d['key']]==d['assetId']
 a=Image.open(p).convert('RGBA');b=Image.open(ROOT/e['src']).convert('RGBA')
 assert a.size==b.size==tuple(d['size']) and a.tobytes()==b.tobytes()
 assert a.getchannel('A').getextrema()==(0,255)
 assert e['anchor']==d['anchor'] and all(0<=v<=limit for v,limit in zip(e['anchor'],a.size))
 assert not any(r>145 and bl>145 and min(r,bl)-g>100 and alpha>32 for r,g,bl,alpha in a.getdata())
 params=d['provenance']['parameters'];s=params['sockets'];assert abs(abs(s[1][0]-s[0][0])*params['scale']-params['span']*32)<.001
report={'status':'PASS','assets':len(ds),'checks':len(ds)*8}
(ROOT/'tests/qa/act1_environment/sprites.json').write_text(json.dumps(report,indent=2)+'\n');print(report)
