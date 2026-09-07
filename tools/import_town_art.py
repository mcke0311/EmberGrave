"""Import the reviewed ImageGen town sheets and pack their final-aligned sources.

Only mechanical sprite preparation: fixed cell crops, alpha-bound trimming,
uniform resizing and affine material projection. No painting or reconstruction.
The normal pack-only compiler can rebuild every emitted asset afterwards.
"""
from pathlib import Path
import json
import shutil
import hashlib
from PIL import Image
import build_sprite_assets as compiler

ROOT = Path(__file__).resolve().parents[1]
AUTH = ROOT / 'assets/sprites_src/gameplay_art_authored/towns'
ART = ROOT / 'assets/sprites_src/gameplay_art'
ZONES = ['town', 'frosthaven', 'marshcamp', 'khalcamp', 'hellgate']
PARTS = [('hall', 260, 52), ('dwelling', 186, 36), ('workshop', 210, 42),
         ('market', 204, 40), ('tower', 138, 26), ('shrine', 112, 22)]

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def main():
    AUTH.mkdir(parents=True, exist_ok=True)
    setup_path = AUTH / 'sources.json'
    if not setup_path.exists():
        setup = json.loads((ROOT / 'tmp/town_redesign/generated_sources.json').read_text())
        for key, source in setup['sources'].items():
            shutil.copy2(source, AUTH / (key + '.png'))
        setup_path.write_text(json.dumps({'method':'built-in-imagegen', 'prompts':setup['prompts']}, indent=2)+'\n')
    manifest_path = ART / 'gameplay_art_v1.json'
    payload = json.loads(manifest_path.read_text())
    updated = {}
    def record(role, key, image, anchor, origin, parameters, atlas=False):
        path = ART / 'world' / ('grounds' if role=='ground' else 'props') / (key+'.png')
        path.parent.mkdir(parents=True, exist_ok=True)
        image.save(path)
        d = dict(sourceKind='authored-final-aligned',review='visual-contact-sheet-v1',
                 role=role,key=key,path=path.relative_to(ROOT).as_posix(),sha256=digest(path),
                 kind='atlas' if atlas else 'static',size=list(image.size),anchor=list(anchor),
                 bundle=('zone:'+key) if role=='ground' else 'world',assetId='world.'+role+'.'+key,
                 provenance=dict(method='imagegen-sheet-crop-registration-v1',
                     source=origin.relative_to(ROOT).as_posix(),sourceSha256=digest(origin),parameters=parameters))
        if atlas: d.update(cell=[64,32],cols=4,rows=1)
        payload['descriptors'][role+':'+key] = d
        updated[role+':'+key] = d

    for zone in ZONES:
        origin = AUTH / (zone+'.png')
        sheet = Image.open(origin).convert('RGBA')
        for n,(part,width,foot) in enumerate(PARTS):
            col,row=n%3,n//3
            # Reviewed gutters preserve flags, boats and roof peaks that extend
            # past the requested atlas cells. Coordinates reference the source.
            columns=[0,620,1030,1536] if zone=='marshcamp' else [0,550,1010,1536]
            splits={'town':[510,486,520], 'frosthaven':[500,486,500],
                    'marshcamp':[512,444,510], 'khalcamp':[492,452,490],
                    'hellgate':[505,463,492]}[zone]
            box=[columns[col],0 if row==0 else splits[col],columns[col+1],splits[col] if row==0 else 1024]
            cut=sheet.crop(box)
            bounds=cut.getchannel('A').point(lambda a:255 if a>12 else 0).getbbox()
            cut=cut.crop(bounds)
            size=(width,round(cut.height*width/cut.width))
            image=cut.resize(size,Image.Resampling.LANCZOS)
            record('prop',zone+'_'+part,image,(width//2,max(0,image.height-foot)),origin,
                   dict(cell=box,alphaBounds=list(bounds),width=width,baseInset=foot))

    origin=AUTH/'materials.png'
    sheet=Image.open(origin).convert('RGBA')
    for n,zone in enumerate(ZONES):
        for row in [0,1]:
            box=[round(n*sheet.width/5),round(row*sheet.height/2),round((n+1)*sheet.width/5),round((row+1)*sheet.height/2)]
            square=sheet.crop(box)
            record('prop',zone+('_soil' if row else '_street'),square.resize((512,512),Image.Resampling.LANCZOS),
                   (256,256),origin,dict(cell=box,operation='unprojected-material-registration'))
            # Crop four neighboring material quarters, then map each square
            # into the exact 64x32 world diamond (pixel centers stay reciprocal).
            tiles=[]
            for q in range(4):
                x,y=q%2,q//2
                tile=square.crop((round(x*square.width/2),round(y*square.height/2),round((x+1)*square.width/2),round((y+1)*square.height/2))).resize((64,64),Image.Resampling.LANCZOS)
                # A one-pixel registration bleed covers all four tile vertices
                # and prevents hairline gaps at fractional camera positions.
                tile=tile.transform((64,32),Image.Transform.AFFINE,(64/66,64/33,32-64*32/66-64*16/33,-64/66,64/33,32),Image.Resampling.BICUBIC)
                tiles.append(tile)
            if row==1:
                atlas=Image.new('RGBA',(256,32))
                for q,tile in enumerate(tiles): atlas.paste(tile,(q*64,0))
                record('ground',zone,atlas,(32,16),origin,dict(cell=box,operation='four-quarter-isometric-projection'),True)
            else:
                record('prop',zone+'_paving',tiles[0],(32,16),origin,dict(cell=box,operation='quarter-isometric-projection'))
    origin=AUTH/'dressing.png'
    sheet=Image.open(origin).convert('RGBA')
    split=round(sheet.height*.45)
    for n,zone in enumerate(ZONES):
        for row,(part,width,foot) in enumerate([('firebowl',64,10),('verge',108,22)]):
            box=[round(n*sheet.width/5),0 if row==0 else split,round((n+1)*sheet.width/5),split if row==0 else sheet.height]
            cut=sheet.crop(box)
            bounds=cut.getchannel('A').point(lambda a:255 if a>12 else 0).getbbox()
            cut=cut.crop(bounds);image=cut.resize((width,round(cut.height*width/cut.width)),Image.Resampling.LANCZOS)
            record('prop',zone+'_'+part,image,(width//2,max(0,image.height-foot)),origin,
                   dict(cell=box,alphaBounds=list(bounds),width=width,baseInset=foot))
    origin=AUTH/'water.png'
    image=Image.open(origin).convert('RGBA').resize((512,512),Image.Resampling.LANCZOS)
    record('prop','town_marshwater',image,(256,256),origin,dict(operation='uniform-material-registration'))
    manifest_path.write_text(json.dumps(payload,indent=2,sort_keys=True)+'\n')

    # Register every new authored prop in the canonical data catalog.
    path=ROOT/'js/data.js';data=path.read_text(encoding='utf-8')
    start='  /* Town architecture library v2. */'
    end='  /* End town architecture library v2. */'
    if start in data: data=data[:data.index(start)]+data[data.index(end)+len(end)+1:]
    lines=[start]+['  prop_'+d['key']+': { src: "'+d['path']+'", raw: true },' for d in sorted(updated.values(),key=lambda d:d['key']) if d['role']=='prop']+[end]
    pos=data.index('  /* Settlement-specific architecture')
    data=data[:pos]+'\n'.join(lines)+'\n'+data[pos:]
    path.write_text(data,encoding='utf-8')

    # Use the compiler's encoder/entry constructors for an incremental pack.
    path=ROOT/'js/sprite_manifest.js';text=path.read_text();prefix=text[:text.index('{')]
    runtime=json.loads(text[text.index('{'):].strip().removesuffix(';'))
    for d in updated.values():
        packed=compiler._copy_final_aligned_source(d)
        entry=compiler.atlas_entry(packed,(64,32),4,1,tuple(d['anchor']),d['bundle']) if d['kind']=='atlas' else compiler.static_entry(packed,tuple(d['anchor']),d['bundle'])
        runtime['entries'][d['assetId']]=entry
        runtime['maps']['grounds' if d['role']=='ground' else 'props'][d['key']]=d['assetId']
    path.write_text(prefix+json.dumps(runtime,indent=2,sort_keys=True)+';\n')
    path=ROOT/'assets/sprites/coverage.json'
    coverage=json.loads(path.read_text())
    coverage.update(assetCount=len(runtime['entries']),props=sorted(runtime['maps']['props']))
    path.write_text(json.dumps(coverage,indent=2,sort_keys=True)+'\n')
    print('Imported and packed',len(updated),'town graphics. Sources and prompts:',setup_path.relative_to(ROOT))

if __name__=='__main__': main()
