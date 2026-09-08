"""Restore the captured pre-Act-2 working tree into ignored review storage.

The archive includes the uncommitted Act 1/item work present when Act 2 began.
It does not check out a Git revision or touch the working source files.
"""
from pathlib import Path
import hashlib
import json
import zipfile
ROOT=Path(__file__).resolve().parents[1]
archive=ROOT/'tests/fixtures/act2_before.zip'
dest=(ROOT/'tmp/act2/before').resolve()
with zipfile.ZipFile(archive) as z:
    hashes=json.loads(z.read('source_hashes.json'))
    for name in z.namelist():
        path=(dest/name).resolve()
        if not path.is_relative_to(dest):
            raise ValueError('Invalid baseline archive member')
        data=z.read(name)
        if name in hashes and hashlib.sha256(data).hexdigest()!=hashes[name]:
            raise ValueError('Baseline source hash mismatch: '+name)
        if path.exists():
            if path.read_bytes()!=data:
                raise ValueError('Existing baseline differs; preserve it: '+str(path))
            continue
        path.parent.mkdir(parents=True,exist_ok=True)
        path.write_bytes(data)
print('Verified/restored pre-Act-2 working snapshot:',len(hashes),'files')
