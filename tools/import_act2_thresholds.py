"""Import whole painted threshold assemblies with measured ground registration.

No perspective warping or painted geometry synthesis. Sources remain immutable.
"""
from pathlib import Path
import json
from PIL import Image, ImageDraw
import build_sprite_assets as compiler
from import_act2_art import decode, digest
from import_act2_boundaries import write_text

ROOT=Path(__file__).resolve().parents[1]
AUTH=ROOT/'assets/sprites_src/gameplay_art_authored/act2_thresholds'
ART=ROOT/'assets/sprites_src/gameplay_art'

def main():
    specs=json.loads((AUTH/'registration.json').read_text(encoding='utf-8'))
    payload_path=ART/'gameplay_art_v1.json'; payload=json.loads(payload_path.read_text(encoding='utf-8'))
    manifest_path=ROOT/'js/sprite_manifest.js'; text=manifest_path.read_text(encoding='utf-8')
    runtime=json.loads(text[text.index('{'):].strip().removesuffix(';'))
    descriptors=[]
    for spec in specs['assets']:
        origin=AUTH/spec['source']; pixels,method=decode(Image.open(origin))
        if 'box' in spec: pixels=pixels.crop(spec['box'])
        # A source sheet can contain a neighboring bank's stray roots inside
        # this cell. Exclusion rectangles isolate whole disconnected objects.
        for box in spec.get('exclude',[]):pixels.paste((0,0,0,0),box)
        bounds=pixels.getchannel('A').point(lambda a:255 if a>12 else 0).getbbox()
        a,b=spec['connections']; scale=spec['span']*32/(b[0]-a[0])
        im=pixels.crop(bounds);im=im.resize((round(im.width*scale),round(im.height*scale)),Image.Resampling.LANCZOS)
        anchor=[round((spec['foundation'][i]-bounds[i])*scale) for i in range(2)]
        key='a2threshold_'+spec['key']; dest=ART/'world/props'/(key+'.png');im.save(dest)
        d=dict(sourceKind='authored-final-aligned',review='visual-contact-sheet-v1',role='prop',key=key,
            path=dest.relative_to(ROOT).as_posix(),sha256=digest(dest),kind='static',size=list(im.size),anchor=anchor,
            bundle='world',assetId='world.prop.'+key,lossless=True,
            provenance=dict(method='imagegen-act2-threshold-registration-v1',source=origin.relative_to(ROOT).as_posix(),
                sourceSha256=digest(origin),parameters=dict(alphaMethod=method,bounds=list(bounds),scale=scale,registration=spec)))
        payload['descriptors']['prop:'+key]=d
        runtime['entries'][d['assetId']]=compiler.static_entry(compiler._copy_final_aligned_source(d),tuple(anchor),'world')
        runtime['maps']['props'][key]=d['assetId']; descriptors.append(d)
    write_text(payload_path,json.dumps(payload,indent=2,sort_keys=True)+'\n')
    write_text(manifest_path,text[:text.index('{')]+json.dumps(runtime,indent=2,sort_keys=True)+';\n')
    path=ROOT/'js/data.js'; data=path.read_text(encoding='utf-8')
    start,end='  /* Act 2 threshold library v1. */','  /* End Act 2 threshold library v1. */'
    if start in data: data=data[:data.index(start)]+data[data.index(end)+len(end):].lstrip('\n')
    at=data.index('  /* Town architecture library v2. */')
    block=start+'\n'+'\n'.join('  prop_'+d['key']+': { src: "'+d['path']+'", raw: true },' for d in descriptors)+'\n'+end+'\n'
    write_text(path,data[:at]+block+data[at:])
    path=ROOT/'assets/sprites/coverage.json'; coverage=json.loads(path.read_text(encoding='utf-8'))
    coverage.update(assetCount=len(runtime['entries']),props=sorted(runtime['maps']['props']))
    write_text(path,json.dumps(coverage,indent=2,sort_keys=True)+'\n')
    qa=ROOT/'tests/qa/act2_thresholds';qa.mkdir(parents=True,exist_ok=True)
    contact=Image.new('RGB',(900,((len(descriptors)+2)//3)*300),'#25302d');draw=ImageDraw.Draw(contact)
    for i,d in enumerate(descriptors):
        im=Image.open(ROOT/d['path']);im.thumbnail((290,260));x=(i%3)*300;y=(i//3)*300
        contact.paste(im,(x+(300-im.width)//2,y),im);draw.text((x+5,y+275),d['key'],fill='#ddd6be')
    contact.save(qa/'asset_contact.png')
    write_text(AUTH/'source_hashes.json',json.dumps({p.relative_to(ROOT).as_posix():digest(p) for p in sorted(AUTH.iterdir()) if p.name!='source_hashes.json'},indent=2)+'\n')
    print('Registered',len(descriptors),'painted threshold modules')

if __name__=='__main__':main()
