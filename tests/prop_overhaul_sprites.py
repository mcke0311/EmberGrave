"""Check generated alpha, aligned states, provenance and runtime atlas coverage."""
import json,hashlib,sys
from pathlib import Path
from PIL import Image,ImageChops
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'tools'))
from import_prop_interactions import install
report=json.loads((ROOT/'assets/sprites_src/gameplay_art_authored/prop_interactions/import.json').read_text());checks=0
def ok(value,label):
 global checks;checks+=1
 if not value:raise AssertionError(label)
ok(len(report['entries'])==6,'six required atlases')
entries={};install(entries,{})
for aid,e in entries.items():
 src=report['sources'][aid];im=Image.open(ROOT/e['src']).convert('RGBA');original=Image.open(ROOT/src['source'])
 ok(original.mode=='RGBA' and original.getchannel('A').getextrema()[0]==0,aid+' source transparency')
 ok(im.size==(640,960),aid+' atlas dimensions');ok(e['anchor']==[80,152],aid+' ground anchor')
 for i in range(24):
  cell=im.crop((i%4*160,i//4*160,i%4*160+160,i//4*160+160));alpha=cell.getchannel('A');bbox=alpha.getbbox()
  ok(bool(bbox),aid+'/'+str(i)+' empty frame');ok(bbox[0]>0 and bbox[1]>0 and bbox[2]<160 and bbox[3]<160,aid+'/'+str(i)+' clipped sprite')
  b=e['hitShapes'][i]['bounds'];ok(b[0]>=0 and b[1]>=0 and b[2]<=160 and b[3]<=160,aid+' hit bounds')
  ok(alpha.histogram()[0]>160*160*.2,aid+' rectangular background')
 for a,b in ([(0,1),(2,4),(5,6),(6,7),(8,10),(11,12),(13,14),(15,16),(17,18),(19,20),(21,22)] if aid!='world.props.remains_events' else [(i,i+1) for i in range(0,24,2)]):
  def tile(i):return im.crop((i%4*160,i//4*160,i%4*160+160,i//4*160+160))
  ok(ImageChops.difference(tile(a),tile(b)).getbbox() is not None,aid+' identical terminal frames')
  ok(e['hitShapes'][a]['bounds'][3]==e['hitShapes'][b]['bounds'][3],aid+' ground anchor drift')
print('PASS',checks,'prop alpha, frame, anchor and provenance checks')
(ROOT/'tests/qa/prop_overhaul/sprites.json').write_text(json.dumps({'status':'PASS','checks':checks,'atlases':list(entries)},indent=2)+'\n')
