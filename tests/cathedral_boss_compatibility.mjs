import fs from 'node:fs';
import assert from 'node:assert/strict';
import {fixture} from './boss_fixture.mjs';
import {ensureSnapshot} from './boss_arenas_baseline.cjs';
const old=fixture({sourceDirectory:ensureSnapshot(),dataSeed:7331}),current=fixture({dataSeed:7331});
let checks=0;const ok=(v,label)=>{checks++;assert.ok(v,label);};
// Attack patterns intentionally changed. Preserve campaign gates, form metadata,
// phase thresholds, scaled armor breaks, and a usable reset at every timestep.
for(const id of ['empty_archangel','malthoron']){
 const a=old.DATA.ENEMIES[id],b=current.DATA.ENEMIES[id];
 assert.equal(JSON.stringify(b.phases),JSON.stringify(a.phases),'existing forms, thresholds and lore');checks++;
 for(const dt of [1/120,1/30,.05])for(const difficulty of [0,1,2]){
  const {s,p,m,e}=current.fresh(id,12345,'vanguard',difficulty),quest=id==='empty_archangel'?'q16':'q17';
  delete s.quests[quest];ok(current.Game.bossWard(m),'prerequisite ward remains');
  const hp=m.hp;m.takeDamage(1e9,p);ok(m.hp===hp,'prerequisite blocks damage');s.quests[quest]={state:'done'};
  current.tick(s,.1,dt);ok(e.active&&e.arena.sealed,'threshold activates arena');
  for(let phase=1;phase<e.config.phases.length;phase++){
   m.takeDamage(1e9,p);current.tick(s,dt,dt);ok(e.phase===phase&&!e.mechanic?.blocksDamage,'threshold changes form without a device gate');
   const held=m.hp;m.takeDamage(1,p,null,'shadow');m.loseHealth(1);ok(m.hp<held,'combat form accepts direct and DoT damage');
   if(id==='malthoron')ok(m.def.armor===e.base.armor*(phase===1?1:.7),'armor remains chained');
   if(id==='malthoron')for(const soul of [...e.owned])soul.takeDamage(1e9,p);
   else{e.start('descent',p);m.loseHealth(e.mechanic.goal);}
   ok(!e.mechanic&&e.stage==='recovery'&&e.recoveryDuration>=2,'combat counter opens damage window');
   if(id==='malthoron')ok(m.def.armor===e.base.armor*(phase===1?.7:.4),'counter drops scaled armor');
   for(let t=0;t<10;t+=dt){current.tick(s,dt,dt);ok(Number.isFinite(m.x+m.y+m.hp+e.timer),'valid ongoing encounter');}
  }
  e.reset();ok(m.hp===m.maxHp&&e.phase===0&&m.def.armor===e.base.armor&&!e.arena.sealed,'complete retry reset');
 }
}
fs.writeFileSync('tests/qa/cathedral/enemy_boss_compatibility.json',JSON.stringify({status:'PASS',checks,method:'Existing Act IV story prerequisites, lore and thresholds; optional combat counters, difficulty-scaled armor, combat and retry at 120/30/20 Hz.'},null,2)+'\n');
console.log('PASS '+checks+' Act IV boss compatibility checks');
