import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fixture} from './boss_fixture.mjs';
execFileSync('python',['tests/cathedral_enemy_baseline.py'],{stdio:'pipe'});
// Compare controller mechanics on identical current geometry. The older global
// animation fixture contains pre-redesign maps, so its absolute positions differ.
const old=fixture({dataSeed:7331,bossSource:fs.readFileSync('tmp/cathedral_skills/before/js/boss_encounters.js','utf8')}),current=fixture({dataSeed:7331});
const snapshot=({m,e})=>JSON.parse(JSON.stringify({x:m.x,y:m.y,hp:m.hp,armor:m.def.armor,phase:e.phase,stage:e.stage,timer:e.timer,rotation:e.rotation,
 attack:e.attack&&{id:e.attack.id,shapes:e.attack.shapes,windup:e.attack.windup,recovery:e.attack.recovery,mult:e.attack.mult,elem:e.attack.elem,duration:e.attack.duration,step:e.attack.stepIndex},cap:e.config.cap}));
let checks=0;
for(const id of ['empty_archangel','malthoron'])for(let phase=0;phase<current.DATA.BOSS_ENCOUNTERS[id].phases.length;phase++)for(const dt of [1/120,1/30,.05]){
 const a=old.fresh(id,12345),b=current.fresh(id,12345);a.e.active=b.e.active=true;
 for(let i=1;i<=phase;i++){a.e.phaseChange(i);b.e.phaseChange(i);}
 for(let t=0;t<20;t+=dt){old.tick(a.s,dt,dt);current.tick(b.s,dt,dt);assert.deepEqual(snapshot(a),snapshot(b),`${id}/${phase} mechanics at ${t}`);checks++;}
}
fs.writeFileSync('tests/qa/cathedral/enemy_boss_compatibility.json',JSON.stringify({status:'PASS',checks,method:'Both Act IV bosses, every phase, 20 seconds at 120/30/20 Hz; old and current boss controllers on identical current maps. Compare geometry, damage multipliers, elements, timing, recovery, armor, rotation and summon caps. Summoned Knight behavior intentionally uses new profiles.'},null,2)+'\n');console.log('PASS '+checks+' Act IV boss compatibility samples');
