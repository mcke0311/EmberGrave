"""Capture the current source tree once, before the animation pass."""
from pathlib import Path
import hashlib, json, zipfile

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / 'tests/fixtures/act2_animation_before.zip'
if TARGET.exists():
    raise SystemExit('Baseline already exists; refusing to replace it.')
files = [ROOT / 'index.html', *sorted((ROOT / 'js').glob('*.js'))]
with zipfile.ZipFile(TARGET, 'x', zipfile.ZIP_DEFLATED) as archive:
    hashes = {}
    for file in files:
        data = file.read_bytes()
        name = file.relative_to(ROOT).as_posix()
        archive.writestr(name, data)
        hashes[name] = hashlib.sha256(data).hexdigest()
    archive.writestr('hashes.json', json.dumps(hashes, indent=2))
print('Captured', len(files), 'source files:', TARGET)
