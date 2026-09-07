"""Register and encode the reviewed open-chest sprite without repainting pixels."""
import hashlib
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
source = ROOT / 'assets/sprites_src/gameplay_art/world/props/chest_open.png'
raw = ROOT / 'assets/world/props/chest_open.png'
packed = ROOT / 'assets/sprites/packed/world/props/chest_open.webp'
digest = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
with Image.open(source) as sprite:
    assert sprite.size == (64, 80) and sprite.mode == 'RGBA'
    sprite.save(packed, 'WEBP', quality=94, method=6)
authorship_path = ROOT / 'assets/sprites_src/gameplay_art/gameplay_art_v1.json'
authorship = json.loads(authorship_path.read_text(encoding='utf-8'))
authorship['descriptors']['prop:chest_open'] = {
    'anchor': [28, 72], 'assetId': 'world.prop.chest_open', 'bundle': 'world',
    'key': 'chest_open', 'kind': 'static', 'path': source.relative_to(ROOT).as_posix(),
    'provenance': {'method': 'imagegen-open-chest-import-v1',
        'source': raw.relative_to(ROOT).as_posix(), 'sourceSha256': digest(raw),
        'parameters': {'crop': [145, 29, 1108, 1138], 'destination': [0, 15, 64, 65],
            'canvas': [64, 80], 'resampling': 'System.Drawing HighQualityBicubic',
            'promptRecord': 'assets/world/props/chest_open.md'}},
    'review': 'visual-contact-sheet-v1', 'role': 'prop', 'sha256': digest(source),
    'size': [64, 80], 'sourceKind': 'authored-final-aligned',
}
authorship_path.write_text(json.dumps(authorship, indent=2, sort_keys=True)+'\n', encoding='utf-8')
manifest_path = ROOT / 'js/sprite_manifest.js'
text = manifest_path.read_text(encoding='utf-8')
start, end = text.index('{'), text.rindex('}')+1
manifest = json.loads(text[start:end])
manifest['entries']['world.prop.chest_open'] = {
    'anchor': [28, 72], 'bundle': 'world', 'kind': 'static', 'revision': digest(packed)[:12],
    'src': packed.relative_to(ROOT).as_posix(),
}
manifest['maps']['props']['chest_open'] = 'world.prop.chest_open'
manifest_path.write_text(text[:start]+json.dumps(manifest, indent=2, sort_keys=True)+text[end:], encoding='utf-8')
print('Registered open chest: 64x80, anchor (28,72), world bundle.')
