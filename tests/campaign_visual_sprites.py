from pathlib import Path
import hashlib,json
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[1]
auth=ROOT/'assets/sprites_src/gameplay_art_authored/campaign_visual'
rows=json.loads((auth/'registration.json').read_text())['assets']
sheet=Image.new('RGB',(1500,1100),'#242b30');draw=ImageDraw.Draw(sheet)
for i,r in enumerate(rows):
    source=ROOT/r['source'];png=Image.open(ROOT/r['path']).convert('RGBA');webp=Image.open(ROOT/r['packed']).convert('RGBA')
    assert hashlib.sha256(source.read_bytes()).hexdigest()==r['sourceHash']
    assert hashlib.sha256((ROOT/r['packed']).read_bytes()).hexdigest()==r['packedHash']
    assert png.size==webp.size and png.tobytes()==webp.tobytes()
    low,high=png.getchannel('A').getextrema()
    assert low==0 and high>=250
    assert png.size==tuple(r['size'])
    thumb=png.copy();thumb.thumbnail((220,170))
    x=(i%6)*250+(250-thumb.width)//2;y=(i//6)*220+20
    sheet.paste(thumb,(x,y),thumb);draw.text(((i%6)*250+12,(i//6)*220+200),r['key'],fill='white')
sheet.save(ROOT/'tests/qa/campaign_visual/asset_contact.jpg',quality=92)
(ROOT/'tests/qa/campaign_visual/assets.json').write_text(json.dumps({'status':'PASS','assets':len(rows),'packedBytes':sum((ROOT/r['packed']).stat().st_size for r in rows)},indent=2)+'\n')
print('PASS: 30 source hashes, alpha, dimensions, and lossless PNG/WebP pairs')
