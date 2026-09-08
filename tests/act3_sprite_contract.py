"""Act III pixel/provenance checks and recorded legacy validator diagnostics."""
from pathlib import Path
import contextlib,hashlib,io,json,re,sys
from unittest.mock import patch
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools'))
import validate_sprite_assets as validator
output=ROOT/'tests/qa/act3';output.mkdir(parents=True,exist_ok=True)
manifest=validator.load_manifest();descriptors=json.loads(validator.GAMEPLAY_ART_AUTHORSHIP.read_text())['descriptors']
sources=json.loads((ROOT/'assets/sprites_src/gameplay_art_authored/act3/sources.json').read_text())
checks=0
for source in sources:
    key='act3_'+source['key'];d=descriptors['prop:'+key];p=ROOT/d['path'];original=ROOT/d['provenance']['source'];entry=manifest['entries'][d['assetId']]
    assert hashlib.sha256(p.read_bytes()).hexdigest()==d['sha256']
    assert hashlib.sha256(original.read_bytes()).hexdigest()==d['provenance']['sourceSha256']
    assert manifest['maps']['props'][key]==d['assetId'] and entry['bundle']=='world'
    with Image.open(p) as im,Image.open(ROOT/entry['src']) as packed:
        assert im.mode=='RGBA' and packed.mode in ('RGBA','RGB') and list(im.size)==list(packed.size)==d['size'],key
        packed=packed.convert('RGBA')
        assert entry['anchor']==d['anchor'] and 0<=d['anchor'][0]<im.width and 0<=d['anchor'][1]<im.height
        expected=(255,255) if source['material'] else (0,255)
        assert im.getchannel('A').getextrema()==packed.getchannel('A').getextrema()==expected
    checks+=6
assert len(sources)==27
baseline=ROOT/'tmp/act3/before';original_read=Path.read_text
def baseline_read(path,*args,**kwargs):
    try:other=baseline/path.resolve().relative_to(ROOT)
    except ValueError:return original_read(path,*args,**kwargs)
    return original_read(other if other.is_file() else path,*args,**kwargs)
results={}
for version in ['before','after']:
    stream=io.StringIO();diagnostics=[];original_add=validator.add
    def collect(errors,message):diagnostics.append(message);original_add(errors,message)
    with patch.object(sys,'argv',['validate_sprite_assets.py']),contextlib.redirect_stdout(stream),patch.object(validator,'add',collect):
        with patch.object(Path,'read_text',baseline_read if version=='before' else original_read):code=validator.main()
    (output/('sprite_diagnostics_'+version+'.txt')).write_text(stream.getvalue(),encoding='utf8')
    normalized=[re.sub(r"'prop': \d+","'prop': <count>",d) if 'role coverage mismatch' in d else d for d in diagnostics]
    results[version]={'exitCode':code,'diagnostics':normalized}
new=sorted(set(results['after']['diagnostics'])-set(results['before']['diagnostics']))
act3=[d for d in new if 'act3' in d.lower()]
assert not act3,'Act III introduced sprite errors: '+str(act3)
report={'status':'PASS','assets':27,'checks':checks,'baselineExitCode':results['before']['exitCode'],'currentExitCode':results['after']['exitCode'],'newAct3Diagnostics':act3,'otherConcurrentDiagnostics':new,'note':'Global validator has existing frozen coverage and retired rig diagnostics; before is the captured working tree. Other concurrent changes are listed separately.'}
(output/'sprites.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf8');print(json.dumps(report,indent=2))
