"""Restore the pre-combat-pass source snapshot for isolated performance review."""
from pathlib import Path
import hashlib
import sys
import zipfile

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / 'tmp/act3_combat/before'
ARCHIVE = ROOT / 'tests/fixtures/act3_combat_before.zip'
HASH = ARCHIVE.with_suffix('.sha256')

if '--capture' in sys.argv:
    if ARCHIVE.exists():
        raise SystemExit('The recorded baseline already exists; it is immutable.')
    with zipfile.ZipFile(ARCHIVE, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for source in sorted(TARGET.rglob('*')):
            if source.is_file():
                archive.writestr(source.relative_to(TARGET).as_posix(), source.read_bytes())
    HASH.write_text(hashlib.sha256(ARCHIVE.read_bytes()).hexdigest()+'\n', encoding='ascii')
else:
    if hashlib.sha256(ARCHIVE.read_bytes()).hexdigest() != HASH.read_text().strip():
        raise SystemExit('Baseline checksum mismatch.')
    target = TARGET.resolve()
    with zipfile.ZipFile(ARCHIVE) as archive:
        for entry in archive.infolist():
            destination = (target / entry.filename).resolve()
            if not destination.is_relative_to(target):
                raise SystemExit('Invalid baseline path.')
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_bytes(archive.read(entry))
print('Verified Act III combat baseline:', ARCHIVE.name)
