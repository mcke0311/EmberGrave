"""Mechanically register reviewed ImageGen cathedral sources; preserve native alpha.

Only fixed-cell cropping, transparent-margin trimming and uniform scaling occur.
The original source images and prompts remain alongside registration metadata.
"""
from pathlib import Path
import hashlib
import json
from PIL import Image, ImageDraw
import build_sprite_assets as compiler

ROOT = Path(__file__).resolve().parents[1]
AUTH = ROOT / 'assets/sprites_src/gameplay_art_authored/cathedral'
ART = ROOT / 'assets/sprites_src/gameplay_art'
# Widths are runtime pixels; anchors are a base inset except for flat surfaces.
SHEETS = {
    'void_backdrop': (1, 1, [('void_backdrop',1672,'material')]),
    'arrival': (1, 1, [('arrival', 430, 65)]),
    'heart_gate': (1, 1, [('heart_gate', 414, 56)]),
    'cinder_gate': (1, 1, [('cinder_gate', 390, 49)]),
    'bastion_gate': (1, 1, [('bastion_gate', 438, 62)]),
    'hell_portal': (1, 1, [('hell_portal', 300, 42)]),
    'architecture': (3, 2, [('broken_arch',240,34),('buttress',230,32),('column',130,20),('parapet',196,25),('rubble',142,20),('foundation',66,'foundation')]),
    'landmarks': (3, 2, [('rose_window',430,57),('houses',358,48),('defenses',380,50),('mountain_shrine',334,49),('throne',340,49),('memorial',226,32)]),
    'story': (3, 2, [('soul_bound',170,24),('soul_free',170,24),('seal',144,22),('seal_broken',144,22),('reliquary',116,18),('reliquary_open',116,18)]),
    'materials': (3, 2, [('floor_pale',384,'material'),('floor_dark',384,'material'),('floor_street',384,'material'),('floor_fortress',384,'material')]),
    'decals': (2, 1, [('glass',200,'center'),('rubble_decal',218,'center')]),
}

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def main():
    payload_path = ART / 'gameplay_art_v1.json'
    payload = json.loads(payload_path.read_text(encoding='utf-8'))
    descriptors, qa, thumbnails = [], [], []
    for sheet, (cols, rows, parts) in SHEETS.items():
        origin = AUTH / (sheet + '.png')
        source = Image.open(origin).convert('RGBA')
        for i, (name, width, inset) in enumerate(parts):
            x, y = i % cols, i // cols
            box = [round(x*source.width/cols),round(y*source.height/rows),round((x+1)*source.width/cols),round((y+1)*source.height/rows)]
            cut = source.crop(box)
            if inset == 'material':
                # Material cells are continuous opaque ground, not cutouts.
                cut = cut.convert('RGB').convert('RGBA')
                bounds = [0, 0, cut.width, cut.height]
            else:
                alpha = cut.getchannel('A')
                if alpha.getextrema()[0] != 0:
                    raise ValueError('Source lacks native transparent background: '+name)
                bounds = alpha.point(lambda a: 255 if a>12 else 0).getbbox()
                if not bounds:
                    raise ValueError('Empty source: '+name)
                cut = cut.crop(bounds)
            final = cut.resize((width,round(cut.height*width/cut.width)),Image.Resampling.LANCZOS)
            anchor = [width//2, final.height//2 if inset in ('center','material') else round(width/4) if inset=='foundation' else final.height-inset]
            key='cathedral_'+name
            dest=ART / 'world/props' / (key+'.png')
            final.save(dest)
            d=dict(sourceKind='authored-final-aligned',review='visual-contact-sheet-v1',role='prop',key=key,
                   path=dest.relative_to(ROOT).as_posix(),sha256=sha(dest),kind='static',size=list(final.size),
                   anchor=anchor,bundle='world',assetId='world.prop.'+key,
                   provenance=dict(method='imagegen-cathedral-registration-v1',source=origin.relative_to(ROOT).as_posix(),sourceSha256=sha(origin),
                       parameters=dict(cell=box,alphaBounds=list(bounds),width=width,anchor=anchor,nativeAlpha=True)))
            payload['descriptors']['prop:'+key]=d
            descriptors.append(d)
            qa.append(dict(key=key,size=list(final.size),anchor=anchor,alphaRange=final.getchannel('A').getextrema()))
            thumbnails.append((key,final))
    payload_path.write_text(json.dumps(payload,indent=2,sort_keys=True)+'\n',encoding='utf-8')
    path=ROOT/'js/data.js'; data=path.read_bytes().decode('utf-8')
    start,end='  /* Cathedral memory library v1. */','  /* End cathedral memory library v1. */'
    if start in data:
        at=data.index(start); finish=data.index(end)+len(end)
        data=data[:at]+data[finish:].lstrip('\r\n')
    lines=[start]+['  prop_'+d['key']+': { src: "'+d['path']+'", raw: true },' for d in descriptors]+[end]
    at=data.index('  /* Town architecture library v2. */')
    path.write_bytes((data[:at]+'\r\n'.join(lines)+'\r\n'+data[at:]).encode('utf-8'))
    path=ROOT/'js/sprite_manifest.js'; text=path.read_text(encoding='utf-8'); prefix=text[:text.index('{')]
    runtime=json.loads(text[text.index('{'):].strip().removesuffix(';'))
    for d in descriptors:
        runtime['entries'][d['assetId']]=compiler.static_entry(compiler._copy_final_aligned_source(d),tuple(d['anchor']),d['bundle'])
        runtime['maps']['props'][d['key']]=d['assetId']
    path.write_text(prefix+json.dumps(runtime,indent=2,sort_keys=True)+';\n',encoding='utf-8')
    path=ROOT/'assets/sprites/coverage.json'; coverage=json.loads(path.read_text(encoding='utf-8'))
    coverage.update(assetCount=len(runtime['entries']),props=sorted(runtime['maps']['props']))
    path.write_text(json.dumps(coverage,indent=2,sort_keys=True)+'\n',encoding='utf-8')
    (AUTH/'registration.json').write_text(json.dumps(qa,indent=2)+'\n',encoding='utf-8')
    # QA contact sheet only: the production pixels above are never repainted.
    contact=Image.new('RGB',(1200,240*((len(thumbnails)+4)//5)),(31,35,43)); draw=ImageDraw.Draw(contact)
    for i,(name,im) in enumerate(thumbnails):
        im=im.copy(); im.thumbnail((224,208)); x=(i%5)*240;y=(i//5)*240
        contact.paste(im,(x+(240-im.width)//2,y+8+(208-im.height)//2),im)
        draw.text((x+7,y+222),name,fill=(220,216,197))
    contact.save(ROOT/'tests/qa/cathedral/assets.jpg',quality=93)
    print('Registered',len(descriptors),'cathedral assets with original alpha.')

if __name__=='__main__':
    main()
