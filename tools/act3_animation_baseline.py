"""Capture the working tree before Act III animation changes, once."""
from pathlib import Path
import hashlib, json, zipfile
root=Path(__file__).resolve().parents[1]
output=root/'tests/fixtures/act3_animation_before.zip'
if output.exists():
    raise SystemExit('Baseline already exists; refusing replacement')
files=[root/'index.html', *sorted((root/'js').glob('*.js'))]
with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED) as archive:
    hashes={}
    for path in files:
        name=path.relative_to(root).as_posix();data=path.read_bytes()
        archive.writestr(name,data);hashes[name]=hashlib.sha256(data).hexdigest()
    archive.writestr('hashes.json',json.dumps(hashes,indent=2))
print(output)
