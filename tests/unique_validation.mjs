import {spawnSync} from 'node:child_process';
const files=['tests/unique_powers_contract.mjs','tests/unique_drops_contract.mjs','tests/skill_perks_contract.mjs','tests/management_contract.mjs','tests/gameplay_input_contract.mjs','tests/story_campaign_contract.mjs','tests/boss_encounter_contract.mjs','tests/item_identity_contract.mjs','tools/export_unique_catalog.mjs'];
if(process.argv.includes('--browser'))files.push('tests/unique_browser_review.cjs');
const from=process.argv.find(a=>a.startsWith('--from='))?.slice(7),start=from?files.indexOf(from):0;
if(start<0)throw Error('Unknown validation start: '+from);
for(const file of files.slice(start)){const result=spawnSync(process.execPath,[file],{stdio:'inherit',cwd:new URL('..',import.meta.url)});if(result.status!==0)process.exit(result.status||1);}
console.log('PASS Unique overhaul validation.');
