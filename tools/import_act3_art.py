"""Mechanically register the reviewed ImageGen Act III sources; never draw art.

Native alpha is retained. ImageGen's neutral checker/green technical matte is
decoded when the source does not carry alpha. Trim, uniform scale, anchor, pack.
"""
from pathlib import Path
import hashlib
import json
import shutil
from PIL import Image
import build_sprite_assets as compiler

ROOT = Path(__file__).resolve().parents[1]
AUTH = ROOT / 'assets/sprites_src/gameplay_art_authored/act3'
ART = ROOT / 'assets/sprites_src/gameplay_art'

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def alpha_source(image, material):
    im = image.convert('RGBA')
    if material or im.getchannel('A').getextrema()[0] == 0:
        return im, 'opaque-material' if material else 'native-alpha'
    corners = [im.getpixel(p) for p in [(0,0),(im.width-1,0),(0,im.height-1),(im.width-1,im.height-1)]]
    green = sum(g > max(r,b)+70 for r,g,b,a in corners) >= 2
    pixels = []
    for r,g,b,a in im.getdata():
        if green:
            excess = max(0,g-max(r,b))
            coverage = 1-min(1,max(0,excess-12)/90)
            pixels.append((r,min(g,max(r,b)+12) if excess>12 else g,b,round(a*coverage)))
        else:
            low,high=min(r,g,b),max(r,g,b)
            # The sprite palette is sandstone/bronze. Only neutral technical
            # whites are removed; warm limestone highlights retain coverage.
            coverage = 1-min(1,max(0,low-190)/34) if high-low<28 else 1
            pixels.append((r,g,b,round(a*coverage)))
    im.putdata(pixels)
    return im, 'green-matte' if green else 'neutral-technical-matte'

def main():
    sources=json.loads((AUTH/'sources.json').read_text(encoding='utf8'))
    payload_path=ART/'gameplay_art_v1.json'
    payload=json.loads(payload_path.read_text(encoding='utf8'))
    descriptors=[];registration=[]
    for item in sources:
        key=item['key'];origin=AUTH/item.get('sourceFile',key+'.png')
        if not origin.exists():
            shutil.copy2(item['generatedPath'],origin)
        im,matte=alpha_source(Image.open(origin),item.get('material',False))
        bounds=im.getchannel('A').point(lambda a:255 if a>16 else 0).getbbox()
        if not bounds:raise ValueError('Empty sprite: '+key)
        cut=im.crop(bounds);width=item['width']
        final=cut.resize((width,round(cut.height*width/cut.width)),Image.Resampling.LANCZOS)
        anchor=[width//2,final.height//2 if item['inset']=='center' else final.height-item['inset']]
        name='act3_'+key;path=ART/'world/props'/(name+'.png');final.save(path)
        d=dict(sourceKind='authored-final-aligned',review='visual-contact-sheet-v1',role='prop',key=name,
               path=path.relative_to(ROOT).as_posix(),sha256=digest(path),kind='static',size=list(final.size),anchor=anchor,
               bundle='world',assetId='world.prop.'+name,
               provenance=dict(method='imagegen-act3-registration-v1',source=origin.relative_to(ROOT).as_posix(),sourceSha256=digest(origin),
                               parameters=dict(alphaBounds=list(bounds),width=width,baseInset=item['inset'],technicalMatte=matte)))
        payload['descriptors']['prop:'+name]=d;descriptors.append(d)
        registration.append(dict(key=name,size=list(final.size),anchor=anchor,alphaRange=final.getchannel('A').getextrema(),matte=matte))
    payload=json.loads(payload_path.read_text(encoding='utf8'))
    for d in descriptors:payload['descriptors']['prop:'+d['key']]=d
    payload_path.write_text(json.dumps(payload,indent=2,sort_keys=True)+'\n',encoding='utf8')
    path=ROOT/'js/data.js';data=path.read_text(encoding='utf8')
    start,end='  /* Act III imperial art v1. */','  /* End Act III imperial art v1. */'
    if start in data:data=data[:data.index(start)]+data[data.index(end)+len(end):].lstrip('\n')
    lines=[start]+['  prop_'+d['key']+': { src: "'+d['path']+'", raw: true },' for d in descriptors]+[end]
    at=data.index('  /* Town architecture library v2. */')
    path.write_text(data[:at]+'\n'.join(lines)+'\n'+data[at:],encoding='utf8')
    path=ROOT/'js/sprite_manifest.js';text=path.read_text(encoding='utf8')
    runtime=json.loads(text[text.index('{'):].strip().removesuffix(';'))
    for d in descriptors:
        runtime['entries'][d['assetId']]=compiler.static_entry(compiler._copy_final_aligned_source(d),tuple(d['anchor']),d['bundle'])
        runtime['maps']['props'][d['key']]=d['assetId']
    path.write_text(text[:text.index('{')]+json.dumps(runtime,indent=2,sort_keys=True)+';\n',encoding='utf8')
    path=ROOT/'assets/sprites/coverage.json';coverage=json.loads(path.read_text(encoding='utf8'))
    coverage.update(assetCount=len(runtime['entries']),props=sorted(runtime['maps']['props']))
    path.write_text(json.dumps(coverage,indent=2,sort_keys=True)+'\n',encoding='utf8')
    (AUTH/'registration.json').write_text(json.dumps(registration,indent=2)+'\n',encoding='utf8')
    print('Registered and packed',len(descriptors),'Act III assets.')

if __name__=='__main__':main()
