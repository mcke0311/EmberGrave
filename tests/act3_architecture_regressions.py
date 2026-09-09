"""Run the shared and campaign regressions; preserve concrete command results."""
from pathlib import Path
import json,subprocess,time
import sys
ROOT=Path(__file__).resolve().parents[1]
commands=[
 ['node','tests/terrain_surface_contract.mjs'],['node','tests/navigation_contract.mjs'],
 ['node','tests/gameplay_input_contract.mjs'],['node','tests/pathfinding_optimization_contract.mjs'],
 ['node','tests/skill_vfx_contract.mjs','--current-gameplay'],['node','tests/skill_vfx_contract.mjs','--layered'],
 ['node','tests/unique_powers_contract.mjs'],['node','tests/act3_layers_contract.mjs','--all-seeds'],
 ['node','tests/act3_navigation_contract.mjs'],['node','tests/act3_quest_contract.mjs'],
 ['node','tests/act3_combat_contract.mjs'],['node','tests/story_campaign_contract.mjs'],
 ['node','tests/boss_encounter_contract.mjs'],['node','tests/act2_layout_contract.mjs'],
 ['node','tests/cathedral_layout_contract.mjs'],['node','tests/cinders_layout_contract.mjs'],
 ['node','tests/frontier_layout_contract.mjs'],['python','tests/act3_architecture_sprites.py']]
quick='--quick' in sys.argv
if quick:commands=[['node','tests/terrain_surface_contract.mjs'],['node','tests/navigation_contract.mjs'],['node','tests/gameplay_input_contract.mjs'],['node','tests/skill_vfx_contract.mjs','--layered'],['node','tests/act3_layers_contract.mjs'],['node','tests/act3_combat_contract.mjs']]
out=ROOT/'tests/qa/act3_architecture';out.mkdir(parents=True,exist_ok=True);results=[]
report_path=out/('final_checks.json' if quick else 'regressions.json')
if '--retry-failed' in sys.argv:
    results=json.loads(report_path.read_text())['results']
    commands=[r['command'].split() for r in results if r['exitCode']]
for command in commands:
    start=time.monotonic();p=subprocess.run(command,cwd=ROOT,text=True,capture_output=True)
    row={'command':' '.join(command),'exitCode':p.returncode,'seconds':round(time.monotonic()-start,2),'output':p.stdout+p.stderr}
    previous=next((i for i,r in enumerate(results) if r['command']==row['command']),None)
    if previous is None:results.append(row)
    else:results[previous]=row
    report_path.write_text(json.dumps({'status':'FAIL' if any(r['exitCode'] for r in results) else 'PASS','results':results},indent=2)+'\n')
    print(('PASS' if not p.returncode else 'FAIL'),row['command'],row['seconds'],flush=True)
    if p.returncode:print(row['output'][-4000:],flush=True)
raise SystemExit(any(r['exitCode'] for r in results))
