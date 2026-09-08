"""Aggregate the three recorded browser pairs without rerunning their workloads."""
from pathlib import Path
import json

ROOT=Path(__file__).resolve().parent/'qa/act2_enemies'
zones=['weeping_marsh','drowned_crypt','hollow_reeds','spawn_pools','ritual_site']
results=[]
for width in [1920,3840]:
    for zone in zones:
        for mode in ['moving','combat']:
            row={'width':width,'zone':zone,'mode':mode}
            for version in ['before','after']:
                samples=[json.loads((ROOT/f'profile_{zone}_{width}_{pair}_{version}_{mode}.json').read_text()) for pair in range(3)]
                assert all(s['methodRevision']==101 and s['warmCacheStable'] for s in samples)
                assert all(s['distance']>=4 if mode=='moving' else s['attackFrames']>0 and s['enemyAttackFrames']>0 for s in samples)
                row[version]={key:sum(s['cpuMs'][key] for s in samples)/3 for key in ['median','p95']}
            row['passed']=(width!=1920 or row['after']['p95']<16.7) and row['after']['p95']<=max(16.7,row['before']['p95']*1.15)
            results.append(row)
report={'status':'PASS' if all(r['passed'] for r in results) else 'FAIL',
        'baseline':'working-tree-before-act2-enemies',
        'method':'Three alternating before/after pairs, 90 warmup and 240 sampled frames per workload, full roster retained, twelve durable targets, verified attack exchange, real 3D Vanguard, cached terrain. CPU update and render time, not GPU or presentation latency. Crypts repeated after the final dive collision check; the original full run is retained in performance_initial_all_both.json.',
        'browser':'Chrome 152.0.7977.76, headless, Windows review machine',
        'results':results}
(ROOT/'performance_all_both.json').write_text(json.dumps(report,indent=2)+'\n')
for r in results:
    print(f"{r['width']} {r['zone']} {r['mode']}: {r['before']['p95']:.2f} -> {r['after']['p95']:.2f} ms p95")
assert report['status']=='PASS'
