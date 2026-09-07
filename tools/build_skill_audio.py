"""Author the shipped skill textures from the approved CC0 archives.

Requires numpy and soundfile for this offline tool only. No synthesis, runtime
downloads, or generated gameplay randomness. Run fetch_skill_audio.py first.
"""
from pathlib import Path
import hashlib
import io
import json
import sys
import zipfile

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tmp' / 'skill_audio_deps'))
import numpy as np
import soundfile as sf

RATE = 44100
DEST = ROOT / 'assets' / 'sound-effects' / 'skills'
ARCHIVES = {name: zipfile.ZipFile(ROOT / 'tmp' / 'skill_audio_sources' / (name + '.zip'))
            for name in ['impact', 'rpg', 'creatures']}

# archive, file (three real takes), level, playback speed, lowpass Hz, offset s,
# reverse. These are recorded-material edits, not oscillator substitutes.
def layer(pack, names, gain=1, rate=1, low=8000, offset=0, reverse=False):
    return dict(pack=pack, names=names.split('|'), gain=gain, rate=rate,
                low=low, offset=offset, reverse=reverse)

def impact(family, gain=1, rate=1, low=7000, offset=0):
    return layer('impact', '|'.join('Audio/' + family + '_00%d.ogg' % i for i in range(3)), gain, rate, low, offset)

def rpg(names, *args, **kwargs):
    return layer('rpg', '|'.join('OGG/' + n + '.ogg' for n in names.split('|')), *args, **kwargs)

def creature(names, *args, **kwargs):
    return layer('creatures', '|'.join(n + '.ogg' for n in names.split('|')), *args, **kwargs)

RECIPES = {
 'cloth': [rpg('cloth1|cloth2|cloth3', .8, .9, 4000)],
 'blade': [rpg('knifeSlice|knifeSlice2|drawKnife1', .75, .82, 6200), rpg('cloth3|cloth4|cloth2', .3, 1, 3500)],
 'steel': [impact('impactMetal_medium', .7, .78, 5200), impact('impactPunch_heavy', .5, .9, 1800)],
 'shield': [impact('impactPlate_heavy', .75, .68, 4000), impact('impactSoft_heavy', .5, .75, 1600)],
 'chain': [creature('chain_01|chain_02|chain_03', .8, .78, 4700)],
 'bow': [rpg('creak1|creak2|creak3', .36, 1.35, 4000), rpg('knifeSlice2|knifeSlice|cloth1', .9, 1.22, 6000, .025)],
 'arrow': [impact('impactWood_light', .8, 1.15, 5000), impact('impactPunch_medium', .5, 1.15, 2800)],
 'stone': [creature('stones_01|stones_02|stones_03', .65, .62, 3500), impact('impactMining', .6, .68, 2500)],
 'bone': [creature('wood_01|wood_02|wood_03', .6, 1.15, 5000), impact('impactWood_light', .65, 1.3, 6500, .02)],
 'fire': [creature('spell_fire_04|spell_fire_05|spell_fire_06', .65, .73, 4900), impact('impactSoft_heavy', .35, .6, 1300)],
 'ember': [creature('spell_fire_01|spell_fire_02|spell_fire_03', .65, .86, 5300)],
 'frost': [impact('impactGlass_heavy', .65, .64, 7200), creature('stones_02|stones_03|stones_04', .25, 1.3, 5700)],
 'ice': [impact('impactGlass_light', .7, .86, 8200), impact('footstep_snow', .45, 1.15, 5500)],
 'spark': [impact('impactTin_medium', .7, 1.7, 9000), impact('impactGlass_light', .22, 1.65, 7000, .025)],
 'thunder': [impact('impactMetal_heavy', .6, .28, 1900), creature('stones_02|stones_03|stones_04', .8, .38, 1500, .045)],
 'hex': [creature('creature_misc_04|creature_misc_06|creature_misc_08', .55, .64, 2400), rpg('cloth4|cloth2|cloth3', .3, .52, 1700, .04, True)],
 'rot': [creature('creature_slime_01|creature_slime_02|creature_slime_03', .65, .83, 4200), impact('impactSoft_medium', .4, .8, 1900)],
 'shadow': [rpg('cloth4|cloth3|cloth2', .7, .5, 2300, 0, True), rpg('creak3|creak1|creak2', .2, .6, 1400, .04)],
 'growl': [creature('creature_monster_01|creature_monster_02|creature_monster_03', .75, .87, 3700)],
 'howl': [creature('creature_roar_01|creature_roar_02|creature_roar_03', .75, .85, 3400)],
 'roots': [rpg('creak1|creak2|creak3', .5, .62, 3000), creature('wood_03|wood_04|wood_05', .55, .77, 4300)],
 'wind': [rpg('cloth2|cloth3|cloth4', .8, .35, 3800), rpg('knifeSlice|knifeSlice2|cloth1', .3, .55, 2500, .08, True)],
 'blood': [impact('impactPunch_heavy', .6, .8, 2600), creature('creature_slime_02|creature_slime_03|creature_slime_04', .35, .88, 3000)],
 'breath': [creature('creature_hurt_01|creature_hurt_02|creature_misc_05', .55, .85, 2800)],
 'latch': [rpg('metalLatch|metalClick|beltHandle1', .7, .85, 5000), rpg('clothBelt|clothBelt2|cloth1', .2, 1, 3300)],
 'draw': [rpg('creak1|creak2|creak3', .6, .56, 3500)],
}
LONG = {'fire', 'thunder', 'hex', 'shadow', 'growl', 'howl', 'roots', 'wind', 'draw'}
TAIL = {'fire', 'frost', 'thunder', 'hex', 'shadow', 'howl', 'wind'}

def read_layer(spec, variant):
    name = spec['names'][variant % len(spec['names'])]
    payload = ARCHIVES[spec['pack']].read(name)
    data, sr = sf.read(io.BytesIO(payload), always_2d=True)
    x = data.mean(axis=1)
    active = np.flatnonzero(np.abs(x) > max(.0006, np.max(np.abs(x)) * .006))
    if len(active):
        x = x[max(0, active[0] - int(sr * .003)):min(len(x), active[-1] + int(sr * .035))]
    x -= x.mean()
    # Smooth, zero-phase high/low shelves avoid filter ringing and DC/sub rumble.
    freq = np.fft.rfftfreq(len(x), 1 / sr)
    low = min(spec['low'] / spec['rate'], RATE / (2 * spec['rate']) * .92)
    response = (1 / (1 + (freq / low) ** 8)) * (freq ** 2 / (freq ** 2 + (45 / spec['rate']) ** 2))
    x = np.fft.irfft(np.fft.rfft(x) * response, n=len(x))
    x = np.interp(np.arange(0, len(x), sr * spec['rate'] / RATE), np.arange(len(x)), x)
    if spec['reverse']:
        x = x[::-1].copy()
    x *= spec['gain']
    return x, dict(archive=spec['pack'], file=name, sha256=hashlib.sha256(payload).hexdigest(),
                   level=spec['gain'], playbackRate=spec['rate'], lowpass=spec['low'],
                   offset=spec['offset'], reverse=spec['reverse'])

def build():
    DEST.mkdir(parents=True, exist_ok=True)
    ledger = {'format': 'mono 44.1 kHz 16-bit PCM WAV', 'license': 'CC0-1.0',
              'processing': 'Trim silence; remove DC and sub-45 Hz; soft lowpass; constant-rate resample; layer; short reflection; RMS/peak headroom; edge fades.',
              'archives': {k: hashlib.sha256((ROOT/'tmp'/'skill_audio_sources'/(k+'.zip')).read_bytes()).hexdigest() for k in ARCHIVES}, 'clips': {}}
    for key, specs in RECIPES.items():
        for variant in range(3):
            limit = 1.8 if key in LONG else .65
            out = np.zeros(round((limit + .12) * RATE))
            sources = []
            for spec in specs:
                x, source = read_layer(spec, variant)
                start = round(spec['offset'] * RATE)
                count = min(len(x), round(limit * RATE) - start)
                out[start:start+count] += x[:count]
                sources.append(source)
            if key in TAIL:
                dry = out.copy()
                for delay, level in [(.031, .10), (.057, .045)]:
                    n = round(delay * RATE)
                    out[n:] += dry[:-n] * level
            active = np.flatnonzero(np.abs(out) > .0003)
            if not len(active):
                raise ValueError('Silent source: ' + key)
            out = out[:min(len(out), active[-1] + round(.025 * RATE))]
            fade_in, fade_out = min(132, len(out)//3), min(round(.075 * RATE), len(out)//3)
            out[:fade_in] *= np.linspace(0, 1, fade_in)
            out[-fade_out:] *= np.linspace(1, 0, fade_out)
            # Do not flatten real transients. Each clip stays below -4.4 dBFS.
            rms = np.sqrt(np.mean(out*out))
            out *= min(4, .105 / max(rms, 1e-9), .6 / max(np.max(np.abs(out)), 1e-9))
            name = f'{key}_{variant+1}.wav'
            sf.write(DEST/name, out, RATE, subtype='PCM_16')
            ledger['clips'][name] = dict(sources=sources, duration=round(len(out)/RATE, 4),
                                        peakDb=round(20*np.log10(np.max(np.abs(out))), 2),
                                        rmsDb=round(20*np.log10(np.sqrt(np.mean(out*out))), 2),
                                        sha256=hashlib.sha256((DEST/name).read_bytes()).hexdigest())
    (DEST/'sources.json').write_text(json.dumps(ledger, indent=2)+'\n', encoding='utf-8')
    for key in ['impact', 'rpg']:
        z = ARCHIVES[key]
        name = next(n for n in z.namelist() if n.lower() == 'license.txt')
        (DEST/(key+'-license.txt')).write_text(z.read(name).decode().replace('\r', ''), encoding='utf-8')
    print(f"Authored {len(ledger['clips'])} clips, {sum(f.stat().st_size for f in DEST.glob('*.wav'))/1e6:.2f} MB")

if __name__ == '__main__':
    build()
