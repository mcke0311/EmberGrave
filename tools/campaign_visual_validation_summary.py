"""Consolidate retained QA evidence without rerunning or suppressing failures."""
from pathlib import Path
import json,hashlib

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'tests/qa/campaign_visual'
def read(name):
    path=OUT/name
    return json.loads(path.read_text()) if path.exists() else None

# Reuse the unchanged Acts I/III/IV results; replace both affected acts only
# after complete, production-renderer reruns of this exact candidate source.
revision=hashlib.sha256('\n'.join((ROOT/'js'/f'{n}.js').read_bytes().decode() for n in ['mapgen','level_terrain','game','town_terrain','sprite_manifest']).encode()).hexdigest()
updates=[read('paced/performance_'+z+'.json') for z in ['weeping_marsh','cinder_bastion']]
current=read('performance.json')
full_rerun=bool(current and current.get('sourceRevision')==revision and current.get('pacedWarmup')
    and len(current.get('comparisons',[]))==20 and not current.get('diagnostic'))
if not full_rerun and all(r and len(r['comparisons'])==4 and r.get('sourceRevision')==revision and not r.get('diagnostic') for r in updates):
    initial=read('performance_initial.json')
    unaffected=lambda r:r['zone'] not in ['weeping_marsh','cinder_bastion']
    comparisons=list(filter(unaffected,initial['comparisons']))+[c for r in updates for c in r['comparisons']]
    runs=list(filter(unaffected,initial['runs']))+[c for r in updates for c in r['runs']]
    failures=[c for r in updates for c in r['failures']]
    performance={'status':'PASS' if not failures and len(comparisons)==20 and all(c['pass'] for c in comparisons) else 'FAIL',
        'sourceRevision':revision,'method':'Three alternating before/after pairs per workload, 600 warmup and 240 RAF-paced measured frames. Warmup uses batches of 15 frames in unchanged Acts I/III/IV and one frame per callback in Acts II/V. Timings measure CPU update/render submission, not GPU completion.',
        'provenance':'Acts I/III/IV use the unchanged original painting path. Acts II/V were rerun after reducing their extra scenery counts and enabling the proven geometry candidate cache, with normal frame pacing during warmup. Both sides use fresh paired samples; before always uses the frozen original source.',
        'retainedInitialReport':'performance_initial.json','retainedExperiments':['lighting_probe','scenery_probe','optimized','paced/*_retained_*.json','cpu_profile.json'],
        'comparisons':comparisons,'failures':failures,'runs':runs}
    (OUT/'performance.json').write_text(json.dumps(performance,indent=2)+'\n')
current=read('performance.json')
if current and current.get('sourceRevision')==revision and len(current.get('comparisons',[]))==20:
    comparisons=current['comparisons']
    notes=ROOT/'docs/CAMPAIGN_VISUAL_REFRESH.md';body=notes.read_text(encoding='utf-8')
    passed=sum(c['pass'] for c in comparisons)
    table=[f'**{passed}/20 workloads meet the 10% target.** All individual runs, including failures, are retained.',
           '', '| Area | Width | Movement median / p95 | Combat median / p95 |', '| --- | ---: | ---: | ---: |']
    for zone in ['north_wild','weeping_marsh','khal_palace','cathedral1','cinder_bastion']:
        for width in [1920,3840]:
            values=[]
            for mode in ['moving','combat']:
                c=next(c for c in comparisons if c['zone']==zone and c['width']==width and c['mode']==mode)
                values.append(f'{c["medianChange"]:+.1f}% / {c["p95Change"]:+.1f}%'+(' ⚠' if not c['pass'] else ''))
            table.append(f'| {zone} | {width} | {values[0]} | {values[1]} |')
    start=body.index('<!-- performance-results -->')+len('<!-- performance-results -->')
    end=body.index('<!-- end-performance-results -->')
    notes.write_text(body[:start]+'\n\n'+'\n'.join(table)+'\n\n'+body[end:],encoding='utf-8')

def strip_diagnostics(name):
    text=(OUT/name).read_text()
    return json.loads(text[text.index('\n['):])

before=strip_diagnostics('pixels_baseline_terrain_strip_pixels.html.txt')
after=strip_diagnostics('pixels_terrain_strip_pixels.html.txt')
def key(r):return json.dumps([r['zone'],r['width'],r['cam'],r['rect']],sort_keys=True)
original={key(r):r for r in before}
rows=[]
for row in after:
    old=original.get(key(row))
    rows.append({k:row[k] for k in ['zone','width','cam','rect','largest','alpha','mean']}|{
        'baseline':{k:old[k] for k in ['largest','alpha','mean']} if old else None,
        'inherited':old is not None and row['largest']<=old['largest']+1 and row['alpha']<=old['alpha']+1 and row['mean']<=old['mean']*1.02+.002})
strip={'status':'BASELINE_DIFFERENCES' if all(r['inherited'] for r in rows) else 'INVESTIGATE',
       'method':'Strict identity diagnostics retained. Compare sparse edge/subpixel errors with the untouched baseline; allow 1 channel unit and 2% + .002 mean raster variance.',
       'beforeRegions':len(before),'afterRegions':len(after),'rows':rows}
(OUT/'cache_comparison.json').write_text(json.dumps(strip,indent=2)+'\n')

pixels=[]
for name in ['terrain_view_pixels.html','act2_boundary_pixels.html','act3_environment_pixels.html','cathedral_terrain_pixels.html','act5_environment_pixels.html']:
    result=(OUT/f'pixels_{name}.txt').read_text()
    status=json.loads(result)['status'] if result.lstrip().startswith('{') else ('PASS' if result.startswith('PASS') else 'FAIL')
    pixels.append({'file':name,'status':status,'log':f'pixels_{name}.txt'})
pixels.append({'file':'terrain_strip_pixels.html',**strip})
fade=next((r for r in (read('pixels.json') or {}).get('rows',[]) if r['file']=='campaign scenery occlusion'),None)
if fade:pixels.append(fade)
(OUT/'rendering.json').write_text(json.dumps({'checks':pixels},indent=2)+'\n')

report={'gameplay':read('contract.json'),'assets':read('assets.json'),
        'captureCounts':{n:len(read(n)['captures']) for n in ['captures_before.json','captures_after.json','captures_after_phone.json']},
        'rendering':'rendering.json','occlusionCache':read('pixels_clip.json'),'regressions':read('regressions.json'),
        'travelAndSave':read('input.json'),'performance':read('performance.json')}
(OUT/'validation.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'strip':strip['status'],'pixels':[r['status'] for r in pixels],
                  'travel':report['travelAndSave'] and report['travelAndSave']['status'],
                  'performance':report['performance'] and report['performance']['status']}))
