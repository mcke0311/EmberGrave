"""Check every new enemy source through the production packing helpers."""
from pathlib import Path
import sys, json, hashlib
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools'))
import import_enemy_art as authored
import build_sprite_assets as compiler
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
text=(ROOT/'js/sprite_manifest.js').read_text()
manifest=json.loads(text[text.index('{'):].strip().removesuffix(';'))
payload=json.loads((ROOT/'assets/sprites_src/gameplay_art/gameplay_art_v1.json').read_text())
coverage=json.loads((ROOT/'assets/sprites/coverage.json').read_text())
checks=0;packed_bytes=0
expected=compiler._expected_gameplay_descriptors(*compiler.parse_art_entries((ROOT/'js/data.js').read_text(encoding='utf-8')))
def check(ok,msg):
    global checks
    checks+=1
    assert ok,msg
for name,height in authored.HEIGHTS.items():
    key='identity_'+name;d=payload['descriptors']['monster:'+key]
    want=expected['monster:'+key]
    check(set(d)==set(want),name+' production descriptor schema')
    for field,value in want.items():
        if field not in ('size','anchor','sha256','provenance'):check(d[field]==value,name+' production '+field)
    source=ROOT/d['provenance']['source'];final=ROOT/d['path']
    check(sha(source)==d['provenance']['sourceSha256'],name+' original hash')
    check(sha(final)==d['sha256'],name+' final source hash')
    check(d['sourceKind']==compiler.GAMEPLAY_ART_SOURCE_KIND and d['review']==compiler.GAMEPLAY_ART_REVIEW,name+' reviewed source')
    check(manifest['maps']['monsters'][key]==d['assetId'],name+' art resolver')
    entry=manifest['entries'][d['assetId']];packed=ROOT/entry['src'];packed_bytes+=packed.stat().st_size
    check(entry['revision']==sha(packed)[:12],name+' runtime revision')
    check(entry['bundle']=='actors' and key in coverage['monsters'],name+' bundle coverage')
    check(entry['anchor']==d['anchor'],name+' packed anchor')
    with Image.open(source) as im:check(im.mode=='RGBA' and im.getchannel('A').getextrema()[0]==0,name+' native transparent source')
    with Image.open(final) as im:
        check(list(im.size)==d['size'] and im.height==height*2+8,name+' gameplay scale')
        check(im.getpixel((0,0))[3]==0,name+' transparent border')
    with Image.open(packed) as im:
        check(im.mode=='RGBA',name+' packed alpha')
        check(entry['hitShape']==compiler.actor_hit_shape(im),name+' actual packed picking mask')
check(len(authored.HEIGHTS)==40,'all commissioned assets registered')
check(packed_bytes<2_000_000,'runtime enemy asset budget')
print(f'PASS {checks} enemy import checks, 40 sources, {packed_bytes:,} packed bytes.')
