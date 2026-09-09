"""Validate threshold provenance, complete component extraction and lossless packing."""
from pathlib import Path
import hashlib,json,sys
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools'))
from import_act2_art import decode
payload=json.loads((ROOT/'assets/sprites_src/gameplay_art/gameplay_art_v1.json').read_text(encoding='utf-8'))
text=(ROOT/'js/sprite_manifest.js').read_text(encoding='utf-8');manifest=json.loads(text[text.index('{'):].strip().removesuffix(';'))
descs=[d for d in payload['descriptors'].values() if d['key'].startswith('a2threshold_')]
assert len(descs)==12
checks=0
auth=ROOT/'assets/sprites_src/gameplay_art_authored/act2_thresholds'
hashes=json.loads((auth/'source_hashes.json').read_text(encoding='utf-8'))
for path,expected in hashes.items():
    assert hashlib.sha256((ROOT/path).read_bytes()).hexdigest()==expected,path+' source registry drift'
    checks+=1
prompts=json.loads((auth/'prompts.json').read_text(encoding='utf-8'))
assert prompts['method']=='built-in-imagegen' and len(prompts['assets'])==8
for item in prompts['assets']:
    assert (auth/(item['key']+'.png')).is_file() and item['prompt']
    assert all((ROOT/ref).is_file() for ref in item['references'])
    checks+=1
for d in descs:
    path=ROOT/d['path'];p=d['provenance'];origin=ROOT/p['source'];e=manifest['entries'][d['assetId']]
    assert hashlib.sha256(path.read_bytes()).hexdigest()==d['sha256']
    assert hashlib.sha256(origin.read_bytes()).hexdigest()==p['sourceSha256']
    assert manifest['maps']['props'][d['key']]==d['assetId']
    a=Image.open(path).convert('RGBA');b=Image.open(ROOT/e['src']).convert('RGBA')
    assert a.size==b.size==tuple(d['size']) and a.tobytes()==b.tobytes()
    assert a.getchannel('A').getextrema()==(0,255)
    assert e['anchor']==d['anchor'] and 0<=e['anchor'][0]<=a.width and 0<=e['anchor'][1]<=a.height
    assert not any(r>145 and bl>145 and min(r,bl)-g>100 and alpha>32 for r,g,bl,alpha in a.getdata()),d['key']+' matte leak'
    params=p['parameters'];spec=params['registration'];s=spec['connections']
    assert abs(abs(s[1][0]-s[0][0])*params['scale']-spec['span']*32)<.001
    source,_=decode(Image.open(origin))
    if 'box' in spec:source=source.crop(spec['box'])
    for box in spec.get('exclude',[]):source.paste((0,0,0,0),box)
    rebuilt=source.crop(params['bounds']).resize(a.size,Image.Resampling.LANCZOS)
    assert rebuilt.tobytes()==a.tobytes(),d['key']+' nonreproducible import'
    if 'opening' in spec:assert a.getpixel((d['anchor'][0],d['anchor'][1]-20))[3]<32,d['key']+' filled aperture'
    checks+=10
sys.path.insert(0,str(ROOT/'tools'))
import validate_sprite_assets as validator
errors=[];validator.validate_gameplay_art_authorship(manifest,errors)
errors=[e for e in errors if 'a2threshold_' in e];assert not errors,errors
report={'status':'PASS','assets':len(descs),'checks':checks,'authorshipErrors':errors}
(ROOT/'tests/qa/act2_thresholds/sprites.json').write_text(json.dumps(report,indent=2)+'\n')
print(report)
