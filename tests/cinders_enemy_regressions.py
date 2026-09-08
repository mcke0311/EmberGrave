"""Record the shared gameplay checks used by the Act 5 attack review."""
from pathlib import Path
import json
import subprocess
ROOT=Path(__file__).resolve().parents[1]
names=['cinders_enemy_contract','cinders_layout_contract','cinders_gameplay_contract','story_campaign_contract','boss_encounter_contract','boss_refinement_contract','opening_contract','navigation_contract','navigation_edge_contract','terrain_surface_contract','terrain_view_cache_contract','frontier_navigation_contract','act2_enemy_contract','act3_combat_contract','cathedral_enemy_contract']
rows=[]
for name in names:
    result=subprocess.run(['node','--preserve-symlinks','--preserve-symlinks-main',f'tests/{name}.mjs'],cwd=ROOT,capture_output=True,text=True,encoding='utf-8',errors='replace')
    rows.append({'test':name,'status':'PASS' if result.returncode==0 else 'FAIL','exitCode':result.returncode,'output':result.stdout,'stderr':result.stderr})
    print(rows[-1]['status'],name,flush=True)
for name in ['cinders_sprite_contract','enemy_art_contract']:
    result=subprocess.run(['python',f'tests/{name}.py'],cwd=ROOT,capture_output=True,text=True,encoding='utf-8',errors='replace')
    rows.append({'test':name,'status':'PASS' if result.returncode==0 else 'FAIL','exitCode':result.returncode,'output':result.stdout,'stderr':result.stderr})
    print(rows[-1]['status'],name,flush=True)
report={'status':'PASS' if all(r['status']=='PASS' for r in rows) else 'FAIL','tests':rows}
(ROOT/'tests/qa/cinders_enemies/regressions.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
raise SystemExit(0 if report['status']=='PASS' else 1)
