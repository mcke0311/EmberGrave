"""Reproducible travel and quest cues from the checked-in CC0 material cuts.

Requires NumPy. Uses stdlib PCM decoding; no downloads or audio codec packages.
The source ledger links each material to its original archive and license.
"""
from pathlib import Path
import hashlib
import json
import wave
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'assets/sound-effects/skills'
DEST = ROOT / 'assets/sound-effects/interactions'
RATE = 44100
# Material, offset seconds, playback rate, gain, reverse, lowpass Hz.
RECIPES = {
    'portalOpen': [('wind', 0, .85, .6, True, 4600), ('shadow', .08, .7, .35, False, 2400), ('ice', .36, .65, .16, False, 5500)],
    'teleportTravel': [('wind', 0, 1.15, .7, True, 5300), ('wind', .20, .8, .8, False, 6000), ('thunder', .30, .65, .36, False, 1600), ('frost', .33, .85, .16, False, 5900)],
    'questAccepted': [('cloth', 0, .8, .65, False, 3600), ('latch', .08, .7, .42, False, 4200), ('ice', .12, .7, .17, False, 5200)],
    'questReady': [('latch', 0, 1.1, .26, False, 4200), ('frost', .04, 1.2, .26, False, 6200)],
    'questCompleted': [('cloth', 0, .85, .32, False, 3300), ('chain', .02, .8, .25, False, 3400), ('frost', .10, .65, .32, False, 5600), ('ice', .23, .82, .28, False, 5600), ('ice', .39, 1.05, .26, False, 6200), ('wind', .13, .9, .16, False, 2200)],
    'questProgress': [('cloth', 0, 1, .4, False, 3200), ('latch', .05, 1.2, .20, False, 4300)],
}
LENGTH = dict(portalOpen=1.05, teleportTravel=1.45, questAccepted=.65, questReady=.5, questCompleted=1.4, questProgress=.38)

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def build():
    DEST.mkdir(parents=True, exist_ok=True)
    source_ledger = json.loads((SOURCE/'sources.json').read_text())
    ledger = {'format': 'mono 44.1 kHz 16-bit PCM WAV', 'license': 'CC0-1.0',
              'sourceLedger': 'assets/sound-effects/skills/sources.json', 'clips': {}}
    for name, recipe in RECIPES.items():
        out = np.zeros(round(LENGTH[name]*RATE))
        sources = []
        for material, offset, rate, level, reverse, cutoff in recipe:
            path=SOURCE/(material+'_1.wav')
            with wave.open(str(path), 'rb') as f:
                assert f.getsampwidth()==2 and f.getnchannels()==1 and f.getframerate()==RATE
                x=np.frombuffer(f.readframes(f.getnframes()), '<i2').astype(float)/32768
            x=np.interp(np.arange(0,len(x),rate),np.arange(len(x)),x)
            if reverse: x=x[::-1].copy()
            x-=x.mean()
            freq=np.fft.rfftfreq(len(x),1/RATE)
            x=np.fft.irfft(np.fft.rfft(x)*(freq**2/(freq**2+45**2))/(1+(freq/cutoff)**8),n=len(x))
            start=round(offset*RATE);count=min(len(x),len(out)-start)
            out[start:start+count]+=x[:count]*level
            sources.append(dict(file=path.relative_to(ROOT).as_posix(),sha256=sha(path),
                                originalSources=source_ledger['clips'][path.name]['sources'],
                                offset=offset,rate=rate,gain=level,reverse=reverse,lowpass=cutoff))
        dry=out.copy()
        for delay,gain in [(.043,.13),(.087,.07),(.151,.035)]:
            n=round(delay*RATE);out[n:]+=dry[:-n]*gain
        out[:220]*=np.linspace(0,1,220)
        n=min(round(.13*RATE),len(out)//3);out[-n:]*=np.linspace(1,0,n)
        out*=min(.48/max(np.max(np.abs(out)),1e-9),.07/max(np.sqrt(np.mean(out*out)),1e-9))
        path=DEST/(name+'.wav')
        with wave.open(str(path),'wb') as f:
            f.setnchannels(1);f.setsampwidth(2);f.setframerate(RATE);f.writeframes(np.round(out*32767).astype('<i2').tobytes())
        ledger['clips'][path.name]=dict(duration=len(out)/RATE,peakDb=float(20*np.log10(np.max(np.abs(out)))),
            rmsDb=float(20*np.log10(np.sqrt(np.mean(out*out)))),sha256=sha(path),sources=sources)
    (DEST/'sources.json').write_text(json.dumps(ledger,indent=2)+'\n')
    (DEST/'CREDITS.md').write_text('# Travel and quest sounds\n\nOriginal Embergrave mixes of CC0 material recordings by Kenney and rubberduck.\n'
        'See [original sources and licenses](../skills/CREDITS.md). The source hashes, exact recipes, and output measurements are retained in `sources.json`.\n\n'
        'Rebuild with `python tools/build_interaction_audio.py` using NumPy. No network access is required.\n')
    print('Authored',len(RECIPES),'travel and quest cues.')

if __name__=='__main__': build()
