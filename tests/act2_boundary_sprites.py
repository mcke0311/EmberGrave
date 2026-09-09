"""Boundary-source provenance, alpha, footprint registration and packed pixels."""
from pathlib import Path
import hashlib,json,sys
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
payload=json.loads((ROOT/'assets/sprites_src/gameplay_art/gameplay_art_v1.json').read_text())
text=(ROOT/'js/sprite_manifest.js').read_text();manifest=json.loads(text[text.index('{'):].strip().removesuffix(';'))
descs=[d for d in payload['descriptors'].values() if d['key'].startswith('a2boundary_')]
assert len(descs)==28
checks=0
for d in descs:
    path=ROOT/d['path'];p=d['provenance'];origin=ROOT/p['source'];e=manifest['entries'][d['assetId']]
    assert hashlib.sha256(path.read_bytes()).hexdigest()==d['sha256']
    assert hashlib.sha256(origin.read_bytes()).hexdigest()==p['sourceSha256']
    assert manifest['maps']['props'][d['key']]==d['assetId']
    a=Image.open(path).convert('RGBA');b=Image.open(ROOT/e['src']).convert('RGBA')
    assert a.size==b.size==tuple(d['size']) and a.tobytes()==b.tobytes()
    assert a.getchannel('A').getextrema()==(0,255)
    assert e['anchor']==d['anchor'] and 0<=e['anchor'][0]<=a.width and 0<=e['anchor'][1]<=a.height
    assert not any(r>145 and bl>145 and min(r,bl)-g>100 and alpha>32 for r,g,bl,alpha in a.getdata()),d['key']+' matte leak'
    params=p['parameters'];s=params['sockets'];assert abs(abs(s[1][0]-s[0][0])*params['scale']-params['span']*32)<.001
    checks+=8
sys.path.insert(0,str(ROOT/'tools'))
import validate_sprite_assets as validator
errors=[]
validator.validate_gameplay_art_authorship(manifest,errors)
boundary_errors=[e for e in errors if 'a2boundary_' in e]
assert not boundary_errors,boundary_errors
report={'status':'PASS','assets':len(descs),'checks':checks,'boundaryAuthorshipErrors':boundary_errors}
(ROOT/'tests/qa/act2_boundaries/sprites.json').write_text(json.dumps(report,indent=2)+'\n')
print(report)
