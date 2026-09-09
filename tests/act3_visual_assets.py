"""Verify source provenance and exact production pixels for the Act III atlas."""
import hashlib
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
AUTH = ROOT / 'assets/sprites_src/gameplay_art_authored/act3_visual'
text = (ROOT / 'js/sprite_manifest.js').read_text(encoding='utf-8')
manifest = json.loads(text[text.index('{'):].strip().removesuffix(';'))
descriptors = json.loads((AUTH / 'registration.json').read_text())
assert len(descriptors) == 10
rows = []
for d in descriptors:
    source = ROOT / d['path']
    assert hashlib.sha256(source.read_bytes()).hexdigest() == d['sha256']
    provenance = d['provenance']
    assert hashlib.sha256((ROOT / provenance['source']).read_bytes()).hexdigest() == provenance['sourceSha256']
    assert manifest['maps']['props'][d['key']] == d['assetId']
    entry = manifest['entries'][d['assetId']]
    assert entry['bundle'] == 'world'
    canonical = Image.open(source).convert('RGBA')
    packed = Image.open(ROOT / entry['src']).convert('RGBA')
    assert canonical.size == tuple(d['size']) == packed.size
    assert canonical.tobytes() == packed.tobytes(), d['key']
    rows.append(dict(key=d['key'],size=list(packed.size),bytes=(ROOT / entry['src']).stat().st_size,lossless=True))
report = dict(status='PASS',assets=rows,totalPackedBytes=sum(r['bytes'] for r in rows))
out = ROOT / 'tests/qa/act3_visual/assets.json'
out.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(f"PASS: {len(rows)} authored materials; provenance, registration, bundle and exact PNG/WebP pixel equality")
