"""Mechanically isolate and register reviewed transparent ImageGen residents.

Connected alpha islands preserve weapons crossing the sheet's nominal gutters.
Only cutout isolation, uniform resizing and foot-anchor registration happen here.
"""
from pathlib import Path
import hashlib
import json
from PIL import Image, ImageFilter, ImageChops
import build_sprite_assets as compiler

ROOT = Path(__file__).resolve().parents[1]
AUTH = ROOT / 'assets/sprites_src/gameplay_art_authored/residents'
ART = ROOT / 'assets/sprites_src/gameplay_art'

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def cutouts(sheet, count):
    w, h = sheet.size
    bits = bytearray(sheet.getchannel('A').point(lambda a: 255 if a > 30 else 0).tobytes())
    islands = []
    for i, value in enumerate(bits):
        if not value:
            continue
        queue = [i]
        bits[i] = 0
        for at in queue:
            x = at % w
            for to in (at-w, at+w, at-1 if x else -1, at+1 if x<w-1 else -1):
                if 0 <= to < len(bits) and bits[to]:
                    bits[to] = 0
                    queue.append(to)
        if len(queue) < 500:
            continue
        xs, ys = [at % w for at in queue], [at // w for at in queue]
        box = (max(0,min(xs)-3), max(0,min(ys)-3), min(w,max(xs)+4), min(h,max(ys)+4))
        cw, ch = box[2]-box[0], box[3]-box[1]
        pixels = bytearray(cw*ch)
        for at in queue:
            pixels[at % w-box[0]+(at//w-box[1])*cw] = 255
        # Retain source antialiasing while excluding adjacent residents.
        mask = Image.frombytes('L', (cw,ch), bytes(pixels)).filter(ImageFilter.MaxFilter(7))
        cut = sheet.crop(box)
        cut.putalpha(ImageChops.darker(cut.getchannel('A'),mask))
        row = min((count+3)//4-1, int((box[1]+box[3])/2/h*((count+3)//4)))
        col = min(3, int((box[0]+box[2])/2/w*4))
        islands.append((row*4+col,cut,box))
    assert len(islands) == count, (len(islands), count)
    islands.sort(key=lambda a:a[0])
    assert [n for n,_,_ in islands] == list(range(count))
    return islands

def main():
    setup = json.loads((AUTH/'sources.json').read_text())
    path = ART/'gameplay_art_v1.json'
    payload = json.loads(path.read_text())
    updated = []
    for zone, roster in setup['rosters'].items():
        origin = AUTH/(zone+'.png')
        for n, cut, box in cutouts(Image.open(origin).convert('RGBA'), len(roster)):
            resident = roster[n]
            small = resident['id'] in ('pip','villager_child')
            height = 94 if small else 136
            image = cut.resize((round(cut.width*height/cut.height),height),Image.Resampling.LANCZOS)
            alpha = image.getchannel('A')
            feet = [(x,a) for y in range(height-13,height-3) for x in range(image.width) if (a:=alpha.getpixel((x,y)))>80]
            anchor = [round(sum(x*a for x,a in feet)/sum(a for _,a in feet)),height-3]
            key = resident['art']
            dest = ART/'actors/npcs'/(key+'.png')
            image.save(dest)
            d = dict(sourceKind='authored-final-aligned',review='visual-contact-sheet-v1',role='npc',key=key,
                path=dest.relative_to(ROOT).as_posix(),sha256=digest(dest),kind='static',size=list(image.size),
                anchor=anchor,bundle='actors',assetId='actor.npc.'+key,
                provenance=dict(method='imagegen-alpha-island-registration-v1',source=origin.relative_to(ROOT).as_posix(),
                    sourceSha256=digest(origin),parameters=dict(island=n,bounds=box,alphaThreshold=30,edgeBleed=3,height=height)))
            payload['descriptors']['npc:'+key] = d
            updated.append(d)
    path.write_text(json.dumps(payload,indent=2,sort_keys=True)+'\n')

    path = ROOT/'js/data.js'
    data = path.read_text(encoding='utf-8')
    start, end = '/* Unique town residents. */', '/* End unique town residents. */'
    if start in data:
        data = data[:data.index(start)]+data[data.index(end)+len(end)+1:]
    roster = {z:[{k:r[k] for k in ('id','art','name')} for r in rows] for z,rows in setup['rosters'].items()}
    block = start+'\nDATA.TOWN_RESIDENTS = '+json.dumps(roster,indent=2)+';\n'+end+'\n'
    pos = data.index('/* Painted NPC occupations.') if '/* Painted NPC occupations.' in data else data.index('/* Unique settlement portraits')
    data = data[:pos]+block+data[pos:]
    data = data.replace('/* Painted NPC occupations. Named characters alias one of nine silhouettes;\n   the strict sprite manifest keeps the aliases explicit and auditable. */',
        '/* Unique settlement portraits plus occupation defaults for world encounters. */')
    marker = '  /* Resident portraits. */'
    stop = '  /* End resident portraits. */'
    if marker in data:
        data = data[:data.index(marker)]+data[data.index(stop)+len(stop)+1:]
    entries = '\n'.join('  '+d['key']+': { src: "'+d['path']+'", height: '+str(round(d['size'][1]/2))+' },' for d in updated)
    data = data.replace('DATA.NPC_SPRITE_SOURCES = {','DATA.NPC_SPRITE_SOURCES = {\n'+marker+'\n'+entries+'\n'+stop)
    path.write_text(data,encoding='utf-8')

    path = ROOT/'js/sprite_manifest.js'
    text = path.read_text(); prefix = text[:text.index('{')]
    runtime = json.loads(text[text.index('{'):].strip().removesuffix(';'))
    for d in updated:
        packed = compiler._copy_final_aligned_source(d)
        runtime['entries'][d['assetId']] = compiler.static_entry(packed,tuple(d['anchor']),d['bundle'])
        runtime['maps']['npcs'][d['key']] = d['assetId']
    path.write_text(prefix+json.dumps(runtime,indent=2,sort_keys=True)+';\n')
    path = ROOT/'assets/sprites/coverage.json'
    coverage = json.loads(path.read_text())
    coverage.update(assetCount=len(runtime['entries']),npcs=sorted(runtime['maps']['npcs']))
    path.write_text(json.dumps(coverage,indent=2,sort_keys=True)+'\n')
    print('Imported and packed',len(updated),'unique residents. Prompts:',AUTH/'sources.json')

if __name__ == '__main__':
    main()
