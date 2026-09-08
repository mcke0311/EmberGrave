"""Run the Act 2 and shared regression contracts, retaining each full result."""
from pathlib import Path
import json
import subprocess
import sys
ROOT=Path(__file__).resolve().parents[1]
checks=[('act2_layout_contract.mjs',['--record']),('act2_quest_contract.mjs',[]),
 ('navigation_contract.mjs',[]),('navigation_edge_contract.mjs',[]),('terrain_surface_contract.mjs',[]),
 ('terrain_view_cache_contract.mjs',[]),('terrain_cache_contract.mjs',[]),('frontier_layout_contract.mjs',[]),
 ('frontier_quest_contract.mjs',[]),('town_layout_contract.mjs',[]),('story_campaign_contract.mjs',[]),
 ('boss_encounter_contract.mjs',[]),('gameplay_input_contract.mjs',[]),('player_death_sound_contract.mjs',[]),
 ('zone_boss_music_contract.mjs',[])]
rows=[]
for name,args in checks:
 try:
  result=subprocess.run(['node','--preserve-symlinks','--preserve-symlinks-main','tests/'+name,*args],cwd=ROOT,capture_output=True,text=True,encoding='utf8',errors='replace',timeout=240)
  row={'test':name,'exitCode':result.returncode,'stdout':result.stdout,'stderr':result.stderr}
 except subprocess.TimeoutExpired as e:row={'test':name,'exitCode':124,'stdout':str(e.stdout),'stderr':'Timed out after 240 seconds'}
 rows.append(row);print(('PASS' if row['exitCode']==0 else 'FAIL')+' '+name,flush=True)
 (ROOT/'tests/qa/act2_redesign/regressions.json').write_text(json.dumps({'status':'PASS' if all(r['exitCode']==0 for r in rows) else 'FAIL','tests':rows},indent=2)+'\n',encoding='utf8')
sys.exit(0 if all(r['exitCode']==0 for r in rows) else 1)
