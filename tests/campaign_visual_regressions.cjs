const fs=require('node:fs'),{spawnSync}=require('node:child_process');
const out='tests/qa/campaign_visual',selected=process.argv.find(a=>a.startsWith('--only='))?.split('=')[1]?.split(',');
const rows=selected?JSON.parse(fs.readFileSync(out+'/regressions.json')).rows.filter(r=>!selected.includes(r.suite)):[];
const suites=['act1_polish_contract.mjs','frontier_quest_contract.mjs','act2_visual_contract.mjs','act2_quest_contract.mjs','act3_navigation_contract.mjs','act3_quest_contract.mjs','cinders_gameplay_contract.mjs','story_campaign_contract.mjs','opening_contract.mjs','navigation_edge_contract.mjs','terrain_surface_contract.mjs','terrain_view_cache_contract.mjs','town_layout_contract.mjs','world_reference_contract.cjs'];
for(const suite of suites){
 if(selected&&!selected.includes(suite))continue;
 const r=spawnSync(process.execPath,['--preserve-symlinks','--preserve-symlinks-main','tests/'+suite],{encoding:'utf8',maxBuffer:8*1024*1024});
 fs.writeFileSync(out+'/regression_'+suite+'.txt',r.stdout+'\n'+r.stderr);
 rows.push({suite,exit:r.status,error:r.error?.message,tail:r.stdout.slice(-1600),stderr:r.stderr.slice(-3000)});
 fs.writeFileSync(out+'/regressions.json',JSON.stringify({status:rows.every(r=>r.exit===0)?'PASS':'FAIL',rows},null,2));
 console.log(r.status===0?'PASS':'FAIL',suite);
}
