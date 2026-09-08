// Diagnose the unrelated Act III court-role assertion without changing the workspace.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {fixture} from './boss_fixture.mjs';
const dir='tmp/cinders_enemies/act3_isolation/js';fs.mkdirSync(dir,{recursive:true});
for(const entry of fs.readdirSync('js',{withFileTypes:true}))if(entry.isFile()&&entry.name.endsWith('.js'))fs.copyFileSync('js/'+entry.name,dir+'/'+entry.name);
const original=fs.readFileSync(dir+'/data.js','utf8'),stripped=original.replace(/\/\* Shared Act 5 roles[\s\S]*?(?=\/\* Art identity)/,'');
assert.notEqual(original,stripped);fs.writeFileSync(dir+'/data.js',stripped);
const current=fixture({dataSeed:518}),without=fixture({sourceDirectory:dir,dataSeed:518}),failures=[];
for(let i=0;i<30;i++){
 const seed=i*7331,a=current.MapGen.generate('shard_flats',seed),b=without.MapGen.generate('shard_flats',seed);
 assert.equal(JSON.stringify(a.monsterSpawns),JSON.stringify(b.monsterSpawns));
 for(const n of a.act3.landmarks){const groups=a.act3.encounters.filter(e=>e.landmarkId===n.id),roles=[...new Set(groups.map(e=>e.role))];if(groups.length>=4&&roles.length<2)failures.push({seed,landmark:n.id,groups:groups.length,roles});}
}
const report={status:failures.length?'UNRELATED_FAILURE':'PASS',comparison:'All 30 Act III Shard Flats spawn lists are byte-identical with the Act 5 profile table removed. No Act III production files were edited for this diagnostic.',sameWithoutAct5Profiles:true,failures,mapgenSha256:crypto.createHash('sha256').update(fs.readFileSync('js/mapgen.js')).digest('hex')};
fs.writeFileSync('tests/qa/cinders_enemies/act3_isolation.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
