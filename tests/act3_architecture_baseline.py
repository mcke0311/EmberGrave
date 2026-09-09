"""Reconstruct the recorded pre-architecture code without touching the checkout."""
from pathlib import Path
import json,subprocess
ROOT=Path(__file__).resolve().parents[1]
meta=json.loads((ROOT/'tests/qa/act3_architecture/baseline.json').read_text())
dest=(ROOT/meta['snapshot']).resolve();dest.relative_to(ROOT)
paths=['js','css','index.html','assets/sprites_src/gameplay_art/gameplay_art_v1.json','assets/sprites/coverage.json']
files=subprocess.check_output(['git','ls-tree','-r','--name-only',meta['sourceCommit'],'--',*paths],cwd=ROOT,text=True).splitlines()
for name in files:
    target=(dest/name).resolve();target.relative_to(dest)
    if target.is_file():continue
    target.parent.mkdir(parents=True,exist_ok=True)
    target.write_bytes(subprocess.check_output(['git','show',meta['sourceCommit']+':'+name],cwd=ROOT))
print('Baseline available:',dest)
