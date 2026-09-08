"""Capture once, or restore, the working tree before the Act 5 enemy pass."""
from pathlib import Path
import hashlib
import json
import sys
import zipfile
ROOT=Path(__file__).resolve().parents[1]
archive=ROOT/'tests/fixtures/cinders_enemies_before.zip'
dest=(ROOT/'tmp/cinders_enemies/before').resolve()
if '--capture' in sys.argv:
    if archive.exists():
        raise SystemExit('Baseline already exists; refusing to replace it.')
    paths=[ROOT/'index.html',*sorted((ROOT/'js').rglob('*')),*sorted((ROOT/'css').rglob('*'))]
    sources={p.relative_to(ROOT).as_posix():p.read_bytes() for p in paths if p.is_file()}
    hashes={n:hashlib.sha256(b).hexdigest() for n,b in sources.items()}
    with zipfile.ZipFile(archive,'x',compression=zipfile.ZIP_DEFLATED) as z:
        for n,b in sources.items():z.writestr(n,b)
        z.writestr('source_hashes.json',json.dumps(hashes,indent=2)+'\n')
with zipfile.ZipFile(archive) as z:
    hashes=json.loads(z.read('source_hashes.json'))
    for n in z.namelist():
        path=(dest/n).resolve();data=z.read(n)
        if not path.is_relative_to(dest):raise ValueError('Invalid archive path')
        if n in hashes and hashlib.sha256(data).hexdigest()!=hashes[n]:raise ValueError('Hash mismatch: '+n)
        if path.exists() and path.read_bytes()!=data:raise ValueError('Existing baseline differs: '+n)
        path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(data)
print('Captured/verified Act 5 enemy baseline:',len(hashes),'source files')

