"""Validate the cathedral's authored source -> compiler -> runtime registration."""
from pathlib import Path
import hashlib
import json
import sys
from PIL import Image, ImageChops
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools'))
import build_sprite_assets as compiler
from import_cathedral_art import SHEETS
manifest_text=(ROOT/'js/sprite_manifest.js').read_text(encoding='utf-8')
manifest=json.loads(manifest_text[manifest_text.index('{'):].strip().removesuffix(';'))
payload=json.loads((ROOT/'assets/sprites_src/gameplay_art/gameplay_art_v1.json').read_text(encoding='utf-8'))
data=(ROOT/'js/data.js').read_text(encoding='utf-8')
checks=0; rows=[]
def ok(value,message):
    global checks
    checks+=1
    if not value: raise AssertionError(message)
for sheet,(_,_,parts) in SHEETS.items():
    source=ROOT/'assets/sprites_src/gameplay_art_authored/cathedral'/(sheet+'.png')
    ok(source.exists() and source.with_suffix('.prompt.txt').exists(),sheet+' provenance missing')
    for name,_,inset in parts:
        key='cathedral_'+name;d=payload['descriptors']['prop:'+key];path=ROOT/d['path'];entry=manifest['entries'][d['assetId']]
        ok(hashlib.sha256(path.read_bytes()).hexdigest()==d['sha256'],key+' source hash')
        ok(hashlib.sha256(source.read_bytes()).hexdigest()==d['provenance']['sourceSha256'],key+' original hash')
        ok(manifest['maps']['props'][key]==d['assetId'],key+' registry')
        ok('prop_'+key+':' in data,key+' data declaration')
        im=Image.open(path).convert('RGBA');runtime=Image.open(ROOT/entry['src']).convert('RGBA')
        ok(list(im.size)==d['size'],key+' dimensions');ok(entry['anchor']==d['anchor'],key+' registration anchor')
        ok(runtime.size==im.size,key+' runtime size')
        # WebP preserves the source alpha; color compression is permitted.
        ok(ImageChops.difference(runtime.getchannel('A'),im.getchannel('A')).getbbox() is None,key+' alpha changed in compilation')
        if inset not in ('material',):ok(im.getchannel('A').getextrema()[0]==0,key+' transparency')
        ok(compiler._copy_final_aligned_source(d).exists(),key+' normal compiler cannot resolve authored source')
        rows.append({'key':key,'size':im.size,'anchor':entry['anchor']})
report={'status':'PASS','checks':checks,'assets':len(rows),'rows':rows}
(ROOT/'tests/qa/cathedral/sprites.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(f'PASS {checks} cathedral sprite checks across {len(rows)} authored assets.')
