// Run the existing frozen gameplay-equivalence suite with audio integration
// present, even when the VFX toggle is disabled. Do not regenerate its baseline.
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
const original=new URL('./skill_vfx_contract.mjs',import.meta.url);
let source=fs.readFileSync(original,'utf8');
source=source.replaceAll('import.meta.url',JSON.stringify(original.href));
if(!source.includes("'lootfilter','skill_vfx'"))throw Error('Gameplay harness changed; update the audio-module insertion before running this check.');
source=source.replace("'lootfilter','skill_vfx'","'lootfilter','skill_audio_catalog','skill_audio','skill_vfx'");
const result=spawnSync(process.execPath,['--input-type=module','-',...process.argv.slice(2)],{input:source,encoding:'utf8'});
process.stdout.write(result.stdout||'');process.stderr.write(result.stderr||'');
if(result.error)throw result.error;
process.exitCode=result.status??1;
