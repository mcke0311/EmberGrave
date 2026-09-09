"""Register complete ImageGen boundary modules; never synthesize wall faces.

Measured endpoints set scale and anchor. Packing preserves canonical RGBA pixels.
Sources and prompts are local, so rebuilding never depends on generated_images.
"""
from pathlib import Path
import hashlib, json
from PIL import Image, ImageDraw
import build_sprite_assets as compiler
from import_act2_art import decode

ROOT = Path(__file__).resolve().parents[1]
AUTH = ROOT/'assets/sprites_src/gameplay_art_authored/act2_boundaries'
ART = ROOT/'assets/sprites_src/gameplay_art'
def digest(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def write_text(path,text):
    if path.exists() and path.read_text(encoding='utf-8')==text:return
    # Avoid truncating a file being read by the local review server on Windows.
    temp=path.with_name(path.name+'.boundary-tmp')
    newline='\r\n' if path.exists() and b'\r\n' in path.read_bytes() else '\n'
    temp.write_bytes(text.replace('\n',newline).encode('utf-8'))
    temp.replace(path)

def main():
    specs = json.loads((AUTH/'registration.json').read_text())
    payload_path = ART/'gameplay_art_v1.json'
    payload = json.loads(payload_path.read_text())
    manifest_path = ROOT/'js/sprite_manifest.js'
    text = manifest_path.read_text()
    runtime = json.loads(text[text.index('{'):].strip().removesuffix(';'))
    descriptors = []
    for kit in specs['kits']:
        source = AUTH/kit['source']
        sheet, alpha_method = decode(Image.open(source))
        for spec in kit['modules']:
            origin=AUTH/spec['source'] if 'source' in spec else source
            pixels,method=decode(Image.open(origin)) if origin!=source else (sheet,alpha_method)
            cell = pixels.crop(tuple(spec['box']))
            bounds = cell.getchannel('A').point(lambda a:255 if a>12 else 0).getbbox()
            if not bounds: raise ValueError('Empty module '+spec['name'])
            # Endpoints are measured in the source cell. Both projected axes
            # span 32px horizontally per world tile; keep all scaling uniform.
            start, end = spec['sockets']
            scale = spec.get('span',3)*32/abs(end[0]-start[0])
            image = cell.crop(bounds)
            image = image.resize((round(image.width*scale),round(image.height*scale)),Image.Resampling.LANCZOS)
            center = spec.get('anchor',[(start[0]+end[0])/2,(start[1]+end[1])/2])
            anchor = [round((center[i]-bounds[i])*scale) for i in range(2)]
            key = 'a2boundary_'+kit['key']+'_'+spec['name']
            dest = ART/'world/props'/(key+'.png');image.save(dest)
            d = dict(sourceKind='authored-final-aligned',review='visual-contact-sheet-v1',role='prop',key=key,
                path=dest.relative_to(ROOT).as_posix(),sha256=digest(dest),kind='static',size=list(image.size),
                anchor=anchor,bundle='world',assetId='world.prop.'+key,lossless=True,
                provenance=dict(method='imagegen-act2-boundary-registration-v1',source=origin.relative_to(ROOT).as_posix(),
                    sourceSha256=digest(origin),parameters=dict(alphaMethod=method,box=spec['box'],bounds=list(bounds),
                    sockets=spec['sockets'],scale=scale,span=spec.get('span',3))))
            payload['descriptors']['prop:'+key]=d
            packed=compiler._copy_final_aligned_source(d)
            runtime['entries'][d['assetId']]=compiler.static_entry(packed,tuple(anchor),'world')
            runtime['maps']['props'][key]=d['assetId'];descriptors.append(d)
    write_text(payload_path,json.dumps(payload,indent=2,sort_keys=True)+'\n')
    write_text(manifest_path,text[:text.index('{')]+json.dumps(runtime,indent=2,sort_keys=True)+';\n')
    path=ROOT/'js/data.js';data=path.read_bytes().decode('utf-8')
    start,end='  /* Act 2 boundary library v1. */','  /* End Act 2 boundary library v1. */'
    if start in data:data=data[:data.index(start)]+data[data.index(end)+len(end):].lstrip('\r\n')
    at=data.index('  /* Town architecture library v2. */')
    block=start+'\r\n'+'\r\n'.join('  prop_'+d['key']+': { src: "'+d['path']+'", raw: true },' for d in descriptors)+'\r\n'+end+'\r\n'
    encoded=(data[:at]+block+data[at:]).encode('utf-8')
    if path.read_bytes()!=encoded:
        temp=path.with_name(path.name+'.boundary-tmp');temp.write_bytes(encoded);temp.replace(path)
    coverage_path=ROOT/'assets/sprites/coverage.json';coverage=json.loads(coverage_path.read_text())
    coverage.update(assetCount=len(runtime['entries']),props=sorted(runtime['maps']['props']))
    write_text(coverage_path,json.dumps(coverage,indent=2,sort_keys=True)+'\n')
    qa=ROOT/'tests/qa/act2_boundaries';qa.mkdir(parents=True,exist_ok=True)
    contact=Image.new('RGB',(800,((len(descriptors)+3)//4)*180),'#232b29');draw=ImageDraw.Draw(contact)
    for i,d in enumerate(descriptors):
        im=Image.open(ROOT/d['path']);im.thumbnail((190,145))
        x,y=(i%4)*200,(i//4)*180;contact.paste(im,(x+(200-im.width)//2,y),im)
        draw.text((x+4,y+150),d['key'].replace('a2boundary_',''),fill='#ddd6be')
    contact.save(qa/'asset_contact.png')
    write_text(AUTH/'source_hashes.json',json.dumps({p.relative_to(ROOT).as_posix():digest(p) for p in sorted(AUTH.iterdir()) if p.suffix in ('.png','.json','.txt') and p.name!='source_hashes.json'},indent=2)+'\n')
    print('Registered',len(descriptors),'complete painted boundary modules')
if __name__=='__main__':main()
