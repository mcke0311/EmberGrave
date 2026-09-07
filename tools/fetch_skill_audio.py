"""Fetch the three approved CC0 source archives for offline sound authoring."""
from pathlib import Path
import hashlib
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'tmp' / 'skill_audio_sources'
SOURCES = {
    'impact': 'https://kenney.nl/media/pages/assets/impact-sounds/87b4ddecda-1677589768/kenney_impact-sounds.zip',
    'rpg': 'https://opengameart.org/sites/default/files/RPGsounds_Kenney.zip',
    'creatures': 'https://opengameart.org/sites/default/files/80-CC0-RPG-SFX_0.zip',
}

if __name__ == '__main__':
    DEST.mkdir(parents=True, exist_ok=True)
    for key, url in SOURCES.items():
        path = DEST / (key + '.zip')
        if not path.exists():
            request = urllib.request.Request(url, headers={'User-Agent': 'Embergrave asset authoring'})
            payload = urllib.request.urlopen(request, timeout=45).read()
            with zipfile.ZipFile(__import__('io').BytesIO(payload)) as archive:
                archive.testzip()
            path.write_bytes(payload)
        print(key, path.stat().st_size, hashlib.sha256(path.read_bytes()).hexdigest())
        with zipfile.ZipFile(path) as archive:
            print('\n'.join(archive.namelist()))
