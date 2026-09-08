"""Import reviewed native-alpha ImageGen enemies into the authored pipeline.

Only transparent-margin trimming, uniform resizing and packing are performed.
No recoloring or runtime tinting: elemental/material identity is painted in.
Run from any directory after placing the recorded PNG sources beside prompts.json.
"""
from pathlib import Path
import hashlib
import json
from PIL import Image, ImageDraw
import build_sprite_assets as compiler

ROOT = Path(__file__).resolve().parents[1]
AUTH = ROOT / 'assets/sprites_src/gameplay_art_authored/enemies'
ART = ROOT / 'assets/sprites_src/gameplay_art'
HEIGHTS = dict(wasp=43, larva=43, bone_archer=66, frost_archer=66,
    barbarian_axe=72, barbarian_spear=72, barbarian_sword=72, crystal_golem=73,
    gilded_construct=72, glacial_crawler=72, marauder_mace=66, warlord_axe=76,
    shatter_wasp=43, shard_thrall=70, drowned=66, hollow_child=55, chained_soul=72,
    frost_soldier=66, bone_dragon=74, frost_wyrm=74, ash_drake=74, ice_hound=52,
    cinder_hound=52, gilded_guard=69, frost_ooze=47, storm_skeleton=66,
    ember_skeleton=66, ember_treant=78, ember_knight=69, storm_knight=69,
    frost_brute=72, ember_brute=72, storm_brute=72, frost_imp=52, storm_imp=52,
    radiant_robed=70, ember_robed=70, frost_robed=70, frost_wraith=72, gilded_wraith=72)

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def main():
    payload_path = ART / 'gameplay_art_v1.json'
    payload = json.loads(payload_path.read_text())
    descriptors, qa = [], []
    for name, height in HEIGHTS.items():
        origin = AUTH / (name + '.png')
        if not origin.exists():
            raise ValueError('Missing authored source: ' + str(origin))
        with Image.open(origin) as opened:
            source = opened.convert('RGBA')
        alpha = source.getchannel('A')
        if alpha.getextrema()[0] != 0:
            raise ValueError('Source must have native transparency: ' + name)
        bounds = alpha.point(lambda a: 255 if a > 12 else 0).getbbox()
        cut = source.crop(bounds)
        # Packed assets are drawn at 0.5 scale. Four transparent pixels protect
        # resampling edges; the feet anchor is at the original alpha baseline.
        target_h = height * 2
        cut = cut.resize((round(cut.width * target_h / cut.height), target_h), Image.Resampling.LANCZOS)
        image = Image.new('RGBA', (cut.width + 8, cut.height + 8))
        image.paste(cut, (4, 4))
        anchor = [image.width // 2, image.height - 4]
        key = 'identity_' + name
        path = ART / 'actors/monsters' / (key + '.png')
        path.parent.mkdir(parents=True, exist_ok=True)
        image.save(path)
        d = dict(sourceKind='authored-final-aligned', review='visual-contact-sheet-v1', role='monster', key=key,
            path=path.relative_to(ROOT).as_posix(), sha256=digest(path), kind='static', size=list(image.size),
            anchor=anchor, bundle='actors', assetId='actor.monster.' + key,
            provenance=dict(method='imagegen-enemy-registration-v1', source=origin.relative_to(ROOT).as_posix(),
                sourceSha256=digest(origin), parameters=dict(alphaBounds=list(bounds), height=height, margin=4, alpha='native')))
        payload['descriptors']['monster:' + key] = d
        descriptors.append(d)
        qa.append(dict(key=key, size=list(image.size), anchor=anchor, sourceSha256=digest(origin), alphaRange=alpha.getextrema()))
    payload_path.write_text(json.dumps(payload, indent=2, sort_keys=True) + '\n')
    path = ROOT / 'js/data.js'
    data = path.read_bytes().decode('utf-8')
    start, end = '  /* Enemy identity artwork v1. */', '  /* End enemy identity artwork v1. */'
    if start in data:
        data = data[:data.index(start)] + data[data.index(end) + len(end):].lstrip('\r\n')
    lines = [start] + ['  ' + d['key'] + ': { src: "' + d['path'] + '", raw: true, height: ' + str(HEIGHTS[d['key'][9:]]) + ' },' for d in descriptors] + [end]
    at = data.index('DATA.MONSTER_SPRITE_SOURCES = {') + len('DATA.MONSTER_SPRITE_SOURCES = {')
    data = data[:at] + '\r\n' + '\r\n'.join(lines) + data[at:]
    path.write_bytes(data.encode('utf-8'))
    path = ROOT / 'js/sprite_manifest.js'
    text = path.read_text()
    runtime = json.loads(text[text.index('{'):].strip().removesuffix(';'))
    for d in descriptors:
        packed = compiler._copy_final_aligned_source(d)
        entry = compiler.static_entry(packed, tuple(d['anchor']), d['bundle'])
        with Image.open(packed) as image:
            entry['hitShape'] = compiler.actor_hit_shape(image)
        runtime['entries'][d['assetId']] = entry
        runtime['maps']['monsters'][d['key']] = d['assetId']
    path.write_text(text[:text.index('{')] + json.dumps(runtime, indent=2, sort_keys=True) + ';\n')
    path = ROOT / 'assets/sprites/coverage.json'
    coverage = json.loads(path.read_text())
    coverage.update(assetCount=len(runtime['entries']), monsters=sorted(runtime['maps']['monsters']))
    path.write_text(json.dumps(coverage, indent=2, sort_keys=True) + '\n')
    (AUTH / 'registration.json').write_text(json.dumps(qa, indent=2) + '\n')
    # Contact sheet shows packed pixels at their actual base gameplay height.
    sheet = Image.new('RGB', (800, ((len(descriptors)+4)//5)*150), '#1d2529')
    draw = ImageDraw.Draw(sheet)
    for i, d in enumerate(descriptors):
        image = Image.open(ROOT/d['path']).convert('RGBA')
        image = image.resize((image.width//2, image.height//2), Image.Resampling.LANCZOS)
        x,y = i%5*160, i//5*150
        sheet.paste(image, (x+80-image.width//2, y+109-image.height), image)
        draw.text((x+5,y+119), d['key'][9:], fill='#e0d0aa')
    target = ROOT/'tests/qa/gameplay_improvements/enemy-sources.png'
    target.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(target)
    print('Registered and packed', len(descriptors), 'enemy assets.')

if __name__ == '__main__':
    main()
