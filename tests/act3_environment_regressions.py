"""Record the environment, campaign, input and shared navigation checks."""
from pathlib import Path
import json,subprocess,time
ROOT=Path(__file__).resolve().parents[1]
names=['act3_environment_contract','act3_layout_contract','act3_navigation_contract','act3_layers_contract','act3_quest_contract','act3_combat_contract','story_campaign_contract','gameplay_input_contract','navigation_contract','navigation_edge_contract','terrain_surface_contract','terrain_view_cache_contract','terrain_cache_contract']
rows=[]
for name in names:
    command=['node','--preserve-symlinks','--preserve-symlinks-main','tests/'+name+'.mjs']
    if name=='act3_layers_contract':command.append('--all-seeds')
    if name=='act3_layout_contract':command.append('--record')
    start=time.monotonic();p=subprocess.run(command,cwd=ROOT,capture_output=True,text=True,encoding='utf-8',errors='replace')
    rows.append(dict(command=command,seconds=round(time.monotonic()-start,2),exitCode=p.returncode,output=p.stdout+p.stderr))
    (ROOT/'tests/qa/act3_environment/regressions.json').write_text(json.dumps(dict(status='FAIL' if any(r['exitCode'] for r in rows) else 'PASS',results=rows),indent=2))
    print('PASS' if p.returncode==0 else 'FAIL',name,rows[-1]['seconds'],flush=True)
    if p.returncode:print(rows[-1]['output'][-3000:],flush=True)
raise SystemExit(any(r['exitCode'] for r in rows))
