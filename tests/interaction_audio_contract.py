"""Recorded-source provenance, PCM bounds and reproducible recipe verification."""
from pathlib import Path
import sys,json,wave,hashlib,tempfile
import numpy as np
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools'))
import build_interaction_audio as recipe
folder=ROOT/'assets/sound-effects/interactions'
ledger=json.loads((folder/'sources.json').read_text());checks=0
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def check(v,m):
    global checks
    checks+=1
    assert v,m
check(set(ledger['clips'])=={n+'.wav' for n in recipe.RECIPES},'six runtime cues')
with tempfile.TemporaryDirectory(prefix='embergrave-audio-') as out:
    recipe.DEST=Path(out);recipe.build()
    for name,d in ledger['clips'].items():
        p=folder/name
        check(sha(p)==d['sha256']==sha(Path(out)/name),name+' reproducible hash')
        for source in d['sources']:check(sha(ROOT/source['file'])==source['sha256'],name+' recorded source provenance')
        with wave.open(str(p),'rb') as w:
            check(w.getnchannels()==1 and w.getsampwidth()==2 and w.getframerate()==44100,name+' PCM format')
            x=np.frombuffer(w.readframes(w.getnframes()),'<i2')/32768
        check(.2<len(x)/44100<3,name+' duration')
        check(.01<np.sqrt(np.mean(x*x))<.09,name+' restrained loudness')
        check(np.max(np.abs(x))<.49,name+' headroom')
        check(abs(x[0])<.001 and abs(x[-1])<.001,name+' click-free ends')
print(f'PASS {checks} interaction audio checks: six reproducible recorded cues, source hashes, PCM, level and fades.')
