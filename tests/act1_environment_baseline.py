"""Restore the frozen source baseline without changing the working tree."""
from pathlib import Path
import zipfile
ROOT=Path(__file__).resolve().parents[1]
dest=(ROOT/'tmp/act1_environment/before').resolve()
with zipfile.ZipFile(ROOT/'tests/fixtures/act1_environment_before.zip') as archive:
    for name in archive.namelist():
        target=(dest/name).resolve()
        if not target.is_relative_to(dest):raise ValueError(name)
        data=archive.read(name)
        if target.exists() and target.read_bytes()!=data:raise ValueError('Baseline changed: '+name)
        target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
print('Verified isolated Act I baseline')
