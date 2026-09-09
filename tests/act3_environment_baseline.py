"""Capture/restore the actual working source before the Act III environment pass."""
from pathlib import Path
import hashlib, json, zipfile

ROOT = Path(__file__).resolve().parents[1]
ARCHIVE = ROOT/'tests/fixtures/act3_environment_before.zip'
DEST = ROOT/'tmp/act3_environment/before'
if not ARCHIVE.exists():
    paths = [ROOT/'index.html', *sorted((ROOT/'js').rglob('*')), *sorted((ROOT/'css').rglob('*'))]
    paths = [p for p in paths if p.is_file()]
    hashes = {p.relative_to(ROOT).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest() for p in paths}
    with zipfile.ZipFile(ARCHIVE, 'x', zipfile.ZIP_DEFLATED) as archive:
        for p in paths:
            archive.write(p, p.relative_to(ROOT).as_posix())
        archive.writestr('source_hashes.json', json.dumps(hashes, indent=2))
with zipfile.ZipFile(ARCHIVE) as archive:
    hashes = json.loads(archive.read('source_hashes.json'))
    for name, digest in hashes.items():
        path = (DEST/name).resolve()
        if not path.is_relative_to(DEST.resolve()):
            raise ValueError(name)
        data = archive.read(name)
        if hashlib.sha256(data).hexdigest() != digest:
            raise ValueError('Invalid baseline: '+name)
        if path.exists() and path.read_bytes() != data:
            raise ValueError('Preserve different existing baseline: '+name)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
print('Verified fresh environment baseline:', len(hashes), 'files')
