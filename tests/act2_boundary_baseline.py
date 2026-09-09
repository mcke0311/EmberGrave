"""Capture/restore the exact pre-boundary source tree without checking out files."""
from pathlib import Path
import hashlib, json, zipfile
ROOT = Path(__file__).resolve().parents[1]
archive = ROOT / 'tests/fixtures/act2_boundaries_before.zip'
dest = ROOT / 'tmp/act2_boundaries/before'
if not archive.exists():
    files = [ROOT/'index.html', *sorted((ROOT/'js').rglob('*')), *sorted((ROOT/'css').rglob('*'))]
    files = [p for p in files if p.is_file()]
    hashes = {p.relative_to(ROOT).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest() for p in files}
    with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as z:
        for p in files: z.write(p, p.relative_to(ROOT))
        z.writestr('source_hashes.json', json.dumps(hashes, indent=2))
with zipfile.ZipFile(archive) as z:
    hashes = json.loads(z.read('source_hashes.json'))
    for name in z.namelist():
        path = (dest/name).resolve()
        if not path.is_relative_to(dest.resolve()): raise ValueError(name)
        data = z.read(name)
        if name in hashes and hashlib.sha256(data).hexdigest() != hashes[name]: raise ValueError(name)
        if path.exists() and path.read_bytes() != data: raise ValueError('Baseline differs: '+name)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
print('Verified boundary baseline:', len(hashes), 'files')
