"""Verify retained paintings, uniform registration, packed pixels and audit deltas."""
from pathlib import Path
import contextlib,hashlib,io,json,re,subprocess,sys
from unittest.mock import patch
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools'))
import validate_sprite_assets as validator
out=ROOT/'tests/qa/act3_architecture';out.mkdir(parents=True,exist_ok=True)
auth=ROOT/'assets/sprites_src/gameplay_art_authored/act3_architecture'
descriptors=json.loads(validator.GAMEPLAY_ART_AUTHORSHIP.read_text())['descriptors']
manifest=validator.load_manifest();registered=json.loads((auth/'registration.json').read_text())
assert len(registered)==len({r['key'] for r in registered})==35
sheet=Image.new('RGB',(1400,1000),'#24282a');draw=ImageDraw.Draw(sheet)
checks=0
for i,row in enumerate(registered):
    key=row['key'];d=descriptors['prop:'+key];entry=manifest['entries'][d['assetId']]
    assert hashlib.sha256((ROOT/d['path']).read_bytes()).hexdigest()==d['sha256']
    assert hashlib.sha256((ROOT/d['provenance']['source']).read_bytes()).hexdigest()==d['provenance']['sourceSha256']
    assert manifest['maps']['props'][key]==d['assetId'] and entry['bundle']=='world'
    with Image.open(ROOT/d['path']) as im,Image.open(ROOT/entry['src']) as packed:
        assert list(im.size)==d['size']==list(packed.size) and im.mode=='RGBA'
        assert list(entry['anchor'])==d['anchor']==row['anchor']
        # Lossless WebP may discard RGB beneath zero alpha. Compare premultiplied pixels.
        a=Image.new('RGBA',im.size);a.alpha_composite(im)
        b=Image.new('RGBA',im.size);b.alpha_composite(packed.convert('RGBA'))
        assert a.tobytes()==b.tobytes(),key
        w,h=d['provenance']['parameters']['alphaBounds'][2:]
        x,y=d['provenance']['parameters']['alphaBounds'][:2]
        assert abs(im.height-im.width*(h-y)/(w-x))<=.51,key+' was stretched'
        thumb=im.copy();thumb.thumbnail((180,165));px=i%7*200;py=i//7*200
        sheet.paste(thumb,(px+100-thumb.width//2,py+165-thumb.height),thumb)
        draw.text((px+7,py+176),key.removeprefix('act3_arch_'),fill='#eee2c8')
    checks+=7
sheet.save(out/'painted_kits.jpg',quality=93)
# Compare the validator to the fresh, clean checkout captured for this task.
baseline=ROOT/'tmp/act3_architecture/before'
for relative in ['assets/sprites_src/gameplay_art/gameplay_art_v1.json','assets/sprites/coverage.json']:
    dest=baseline/relative;dest.parent.mkdir(parents=True,exist_ok=True)
    if not dest.exists():dest.write_bytes(subprocess.check_output(['git','show','HEAD:'+relative],cwd=ROOT))
original_read=Path.read_text
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
    (out/('sprite_diagnostics_'+version+'.txt')).write_text(stream.getvalue(),encoding='utf8')
    results[version]={'exitCode':code,'diagnostics':[re.sub(r"'prop': \d+","'prop': <count>",d) if 'role coverage mismatch' in d else d for d in diagnostics]}
new=sorted(set(results['after']['diagnostics'])-set(results['before']['diagnostics']))
assert not new,'New sprite validator failures: '+str(new)
report={'status':'PASS','assets':len(registered),'checks':checks,'newDiagnostics':new,'baselineExitCode':results['before']['exitCode'],'currentExitCode':results['after']['exitCode'],'note':'Existing global validator failures retained in paired diagnostic files.'}
(out/'sprites.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
