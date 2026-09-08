from pathlib import Path
import contextlib
import hashlib
import io
import json
import re
import sys
from unittest.mock import patch
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools'))
import validate_sprite_assets as validator
output=ROOT/'tests/qa/act2_redesign'
manifest=validator.load_manifest()
auth_path=ROOT/'assets/sprites_src/gameplay_art/gameplay_art_v1.json'
payload=json.loads(auth_path.read_text())
descs=[d for k,d in payload['descriptors'].items() if k.startswith('prop:act2_')]
assert len(descs)==24
checks=0
for d in descs:
 source=ROOT/d['path'];origin=ROOT/d['provenance']['source'];entry=manifest['entries'][d['assetId']]
 assert hashlib.sha256(source.read_bytes()).hexdigest()==d['sha256']
 assert hashlib.sha256(origin.read_bytes()).hexdigest()==d['provenance']['sourceSha256']
 assert manifest['maps']['props'][d['key']]==d['assetId']
 with Image.open(source) as image,Image.open(ROOT/entry['src']) as packed:
  assert image.mode=='RGBA' and list(image.size)==list(packed.size)==d['size'] and entry['anchor']==d['anchor']
  if d['key']!='act2_black_water':
   assert image.getchannel('A').getextrema()==packed.getchannel('A').getextrema()==(0,255)
  else: assert image.getchannel('A').getextrema()==(255,255)
 checks+=6
# Concurrent act work may change the global gate. Isolate this library's effect
# by comparing the same current tree with and without its 24 registrations.
without=json.loads(json.dumps(manifest))
for d in descs:
 without['entries'].pop(d['assetId']);without['maps']['props'].pop(d['key'])
old_payload=json.loads(json.dumps(payload))
for d in descs:old_payload['descriptors'].pop('prop:'+d['key'])
data=(ROOT/'js/data.js').read_text(encoding='utf8')
old_data=re.sub(r'  /\* Act 2 environment library v1\. \*/.*?  /\* End Act 2 environment library v1\. \*/\s*','',data,flags=re.S)
raw_manifest=(ROOT/'js/sprite_manifest.js').read_text(encoding='utf8')
overlay={str(auth_path.resolve()):json.dumps(old_payload),str((ROOT/'js/data.js').resolve()):old_data,
 str((ROOT/'js/sprite_manifest.js').resolve()):raw_manifest[:raw_manifest.index('{')]+json.dumps(without)+';'}
original=Path.read_text
def baseline_read(path,*args,**kwargs):return overlay.get(str(path.resolve()),None) or original(path,*args,**kwargs)
results={}
original_add=validator.add
for version in ['without_act2','with_act2']:
 stream=io.StringIO();diagnostics=[]
 def collect(errors,message):
  diagnostics.append(message);original_add(errors,message)
 with patch.object(Path,'read_text',baseline_read if version=='without_act2' else original),patch.object(validator,'add',collect),patch.object(sys,'argv',['validate_sprite_assets.py']),contextlib.redirect_stdout(stream):
  code=validator.main()
 text=stream.getvalue();(output/('sprites_'+version+'.txt')).write_text(text,encoding='utf8')
 # A frozen historical coverage gate reports actual prop totals in its message.
 normalized=[re.sub(r"'prop': \d+","'prop': <count>",line) if 'role coverage mismatch' in line else line for line in diagnostics]
 (output/('sprite_diagnostics_'+version+'.json')).write_text(json.dumps(normalized,indent=2)+'\n')
 results[version]={'code':code,'diagnostics':normalized}
additional=set(results['with_act2']['diagnostics'])-set(results['without_act2']['diagnostics'])
assert not additional,'Act 2 adds global sprite diagnostics: '+repr(additional)
report={'status':'PASS','assets':24,'checks':checks,'noAdditionalAct2Diagnostics':True,'globalGateExitCode':results['with_act2']['code']}
(output/'sprites.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
