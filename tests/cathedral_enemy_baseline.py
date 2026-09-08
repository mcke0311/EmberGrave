"""Restore the frozen pre-skill runtime for reproducible comparisons."""
from pathlib import Path
import zipfile

ROOT=Path(__file__).resolve().parents[1]
SNAPSHOT=ROOT/'tmp/cathedral_skills/before'
ARCHIVE=ROOT/'tests/fixtures/cathedral_enemies_before.zip'

def ensure_snapshot():
    with zipfile.ZipFile(ARCHIVE) as source:
        for member in source.infolist():
            dest=(SNAPSHOT/member.filename).resolve()
            if not dest.is_relative_to(SNAPSHOT.resolve()):
                raise ValueError('Invalid snapshot member')
            if member.is_dir():
                continue
            if not dest.exists():
                dest.parent.mkdir(parents=True,exist_ok=True)
                dest.write_bytes(source.read(member))
            elif dest.read_bytes()!=source.read(member):
                raise ValueError('Frozen baseline was modified: '+str(dest))
    return SNAPSHOT

if __name__=='__main__':
    print(ensure_snapshot())
