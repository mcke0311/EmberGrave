"""Build compact review sheets from the matched, unmodified game captures."""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parent/'qa/act3_environment'
locations=[('khalcamp','checkpoint'),('desert_wastes','crossroads'),
 ('shard_flats','quarry'),('underground_market','bazaar'),('sand_tombs','burial'),
 ('khal_palace','avenue'),('tomb_sanctum','ossuary')]
passages=[('khalcamp',0),*[('desert_wastes',i) for i in range(6)],
 *[(z,0) for z in ['underground_market','sand_tombs','khal_palace','shard_flats','tomb_sanctum']]]

def sheets(name,views,width=1920):
    for page,start in enumerate(range(0,len(views),4),1):
        rows=views[start:start+4]
        result=Image.new('RGB',(1280,len(rows)*386),'#171d20')
        draw=ImageDraw.Draw(result)
        for row,(zone,view) in enumerate(rows):
            for col,version in enumerate(['environment_before','after']):
                path=ROOT/f'{zone}_{width}_{version}_{view}.webp'
                with Image.open(path) as im:
                    result.paste(im.resize((640,360),Image.Resampling.LANCZOS),(col*640,row*386+26))
                draw.text((col*640+8,row*386+6),f'{zone} / {view} / {"BEFORE" if col==0 else "AFTER"}',fill='#eed9b0')
        result.save(ROOT/f'{name}_{width}_{page}.jpg',quality=93)

for width in [1920,3840]:
    sheets('locations',locations,width)
    sheets('passages',[(z,f'passage_{i}') for z,i in passages],width)
print('Wrote ten matched location and passage contact sheets')
