"""Validate the new material and tree alpha against their packed runtime pixels."""
from pathlib import Path
import json, hashlib
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
payload=json.loads((ROOT/'assets/sprites_src/gameplay_art/gameplay_art_v1.json').read_text())
text=(ROOT/'js/sprite_manifest.js').read_text()
manifest=json.loads(text[text.index('{'):].strip().removesuffix(';'))
assets=[d for d in payload['descriptors'].values() if d['key'].startswith('a1polish_')]
assert len(assets)==7
for d in assets:
    p=ROOT/d['path']; source=ROOT/d['provenance']['source']; e=manifest['entries'][d['assetId']]
    assert hashlib.sha256(p.read_bytes()).hexdigest()==d['sha256']
    assert hashlib.sha256(source.read_bytes()).hexdigest()==d['provenance']['sourceSha256']
    a=Image.open(p).convert('RGBA'); b=Image.open(ROOT/e['src']).convert('RGBA')
    assert a.size==b.size==tuple(d['size']) and a.tobytes()==b.tobytes()
    assert e['anchor']==d['anchor']
    assert a.getchannel('A').getextrema()==((255,255) if d['key'].endswith('_snow') else (0,255))
report={'status':'PASS','assets':7,'runtimeBytes':sum((ROOT/manifest['entries'][d['assetId']]['src']).stat().st_size for d in assets)}
(ROOT/'tests/qa/act1_polish/sprites.json').write_text(json.dumps(report,indent=2)+'\n')
print(report)
