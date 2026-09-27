"""Validate generated alpha, hashes, runtime mappings and aligned crystal states."""
import hashlib
import json
from pathlib import Path
from PIL import Image
ROOT = Path(__file__).resolve().parents[1]
report = json.loads((ROOT / 'assets/sprites_src/gameplay_art_authored/act1_habitats/import.json').read_text())
payload = json.loads((ROOT / 'assets/sprites_src/gameplay_art/gameplay_art_v1.json').read_text())
text = (ROOT / 'js/sprite_manifest.js').read_text()
manifest = json.loads(text[text.index('{'):].strip().removesuffix(';'))
sha = lambda path: hashlib.sha256(path.read_bytes()).hexdigest()
assert len(report['sources']) == 6
for name, row in report['sources'].items():
    source, output = ROOT / row['source'], ROOT / row['output']
    assert sha(source) == row['sourceHash'] and sha(output) == row['outputHash'], name
    assert (ROOT / row['prompt']).read_text().strip(), name
    original, packed = Image.open(source), Image.open(output)
    assert original.mode == packed.mode == 'RGBA', name
    assert original.getchannel('A').getextrema()[0] == packed.getchannel('A').getextrema()[0] == 0, name
    descriptor = payload['descriptors']['prop:' + name]
    assert sha(ROOT / descriptor['path']) == descriptor['sha256'], name
    assert list(packed.size) == descriptor['size'] == row['size'], name
    entry = manifest['entries'][descriptor['assetId']]
    assert entry['anchor'] == row['anchor'] == descriptor['anchor'], name
    assert all(0 <= p <= n for p, n in zip(row['anchor'], row['size'])), name
    assert entry['src'] == row['output'], name
ready, broken = (report['sources'][key] for key in ['mine_crystal', 'mine_crystal_broken'])
assert ready['scale'] == broken['scale']
for axis in [0, 1]:
    ground = lambda row: row['crop'][axis] + row['anchor'][axis] / row['scale']
    assert abs(ground(ready) - ground(broken)) <= 1 / ready['scale']
assert broken['size'][1] < ready['size'][1] * .7
print('PASS six transparent sprites, hashes, prompts, mappings and crystal anchors')
