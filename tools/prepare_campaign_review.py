"""Retain the starting source and build a common isolated campaign review."""
from pathlib import Path
import hashlib
import json
import zipfile

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'tmp/campaign_visual/before'
ZONES = [
    ['frosthaven_approach', 'frosthaven', 'north_wild', 'mines', 'shattered_temple', 'shardpeak_shrine', 'deepfreeze_cavern'],
    ['marshcamp', 'weeping_marsh', 'drowned_crypt', 'hollow_reeds', 'spawn_pools', 'ritual_site'],
    ['khalcamp', 'desert_wastes', 'shard_flats', 'underground_market', 'sand_tombs', 'khal_palace', 'tomb_sanctum'],
    ['cathedral1', 'cathedral2', 'cathedral_cinderwatch', 'cathedral_bastion'],
    ['hellgate', 'ash_wastes', 'cinder_bastion', 'throne'],
]

def main():
    archive = ROOT / 'tests/fixtures/campaign_visual_before.zip'
    if not archive.exists():
        records = {}
        with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as out:
            for p in sorted(BASE.rglob('*')):
                if p.is_file():
                    name = p.relative_to(BASE).as_posix()
                    out.write(p, name)
                    records[name] = hashlib.sha256(p.read_bytes()).hexdigest()
        (ROOT / 'tests/qa/campaign_visual/baseline.json').write_text(json.dumps(records, indent=2)+'\n')
    page = (ROOT / 'tests/act1_environment_review.html').read_text(encoding='utf-8')
    start = page.index('<select id="zone">')
    end = page.index('</select>', start)
    page = page[:start] + '<select id="zone">' + ''.join(f'<option value="{z}">Act {i+1} · {z.replace("_", " ")}</option>' for i, zones in enumerate(ZONES) for z in zones) + page[end:]
    page = page.replace('The Fallen North — frontier review', 'Campaign environment review')
    page = page.replace('Act I · Painted landscapes and passages', 'Acts I–V · Environment refresh')
    page = page.replace('Seven Act I areas with painted environment assemblies.', 'All 28 campaign areas with matched starting and refreshed environments.')
    page = page.replace('tmp/act1_environment/before/', 'tmp/campaign_visual/before/')
    page = page.replace('<option value="1920">1080p</option>', '<option value="1920">1080p</option><option value="844">Phone landscape</option>')
    page = page.replace('height=Math.round(width*9/16)', 'height=width===844?390:Math.round(width*9/16)')
    page = page.replace('reference.frontier??={landmarks:', 'reference.frontier??={landmarks:reference.act3?.landmarks||reference.act2?.landmarks||reference.cathedral?.rooms||reference.composition?.landmarks||')
    page = page.replace("let start=nearest(reference.frontier.landmarks[1]),travel=null;", "let start=nearest(reference.frontier.landmarks[1]||map.spawns.default),travel=null;")
    page = page.replace('window.act1Review=', 'window.campaignReview=')
    page = page.replace('({Game,UI,Sfx,TerrainNavigation', '({Game,UI,Sfx,MapGen,TerrainNavigation')
    page = page.replace("get api(){return api}", "get api(){return api}")
    page = page.replace("node tests/frontier_baseline.cjs", "python tools/prepare_campaign_review.py --restore")
    page = page.replace("get map(){return map}", "pointFor, get map(){return map}")
    page = page.replace("async function sample(mode){", "async function sample(mode, warmup=90, pacedWarmup=false){")
    page = page.replace('i<90;i++', 'i<warmup;i++')
    page = page.replace('if(i%15===0)await raf();', 'if(pacedWarmup||i%15===0)await raf();')
    page = page.replace('return{mode,position:start,', 'return{mode,cpuSamplesMs:times,frameSamplesMs:intervals,position:start,')
    page = page.replace('tests/qa/act1_environment', 'tests/qa/campaign_visual')
    # The review uses the ordinary static server; downloads need no write API.
    begin = page.index('async function record(')
    end = page.index('async function capture(', begin)
    page = page[:begin] + '''async function record(name,body){
 const blob=body.png?await (await fetch(body.png)).blob():new Blob([JSON.stringify(body.report,null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
''' + page[end:]
    page = page.replace('Scene image saved in tests/qa/campaign_visual.', 'Scene image downloaded.')
    page = page.replace('qa/act1_environment/', 'qa/campaign_visual/')
    page = page.replace('tests/fixtures/act1_environment_before.zip', 'tests/fixtures/campaign_visual_before.zip')
    (ROOT / 'tests/campaign_visual_review.html').write_text(page, encoding='utf-8')
    (ROOT / 'tests/qa/campaign_visual/zones.json').write_text(json.dumps(ZONES, indent=2)+'\n')
    print('Campaign baseline and isolated review ready.')

if __name__ == '__main__':
    import sys
    if '--restore' in sys.argv:
        with zipfile.ZipFile(ROOT / 'tests/fixtures/campaign_visual_before.zip') as source:
            source.extractall(BASE)
    else:
        main()
