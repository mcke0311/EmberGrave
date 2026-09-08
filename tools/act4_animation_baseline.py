"""Capture or restore the exact pre-animation Act IV runtime, without replacing files."""
from pathlib import Path
import hashlib
import json
import sys
import zipfile

ROOT = Path(__file__).resolve().parents[1]
ARCHIVE = ROOT / 'tests/fixtures/act4_animation_before.zip'

def restore():
    target = ROOT / 'tmp/act4_animation/before'
    with zipfile.ZipFile(ARCHIVE) as archive:
        for name, digest in json.loads(archive.read('hashes.json')).items():
            data = archive.read(name)
            assert hashlib.sha256(data).hexdigest() == digest, name
            path = target / name
            if path.exists():
                assert path.read_bytes() == data, 'Baseline changed: ' + name
            else:
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(data)
    return target

if __name__ == '__main__':
    if '--restore' in sys.argv:
        print(restore())
    else:
        if ARCHIVE.exists():
            raise SystemExit('Baseline already exists; refusing replacement')
        files = [ROOT / 'index.html', *sorted((ROOT / 'js').rglob('*.js')),
                 *sorted((ROOT / 'js').rglob('*.mjs')), *sorted((ROOT / 'css').glob('*.css'))]
        with zipfile.ZipFile(ARCHIVE, 'w', zipfile.ZIP_DEFLATED) as archive:
            hashes = {}
            for path in files:
                name = path.relative_to(ROOT).as_posix()
                data = path.read_bytes()
                archive.writestr(name, data)
                hashes[name] = hashlib.sha256(data).hexdigest()
            archive.writestr('hashes.json', json.dumps(hashes, indent=2))
        print(ARCHIVE)
