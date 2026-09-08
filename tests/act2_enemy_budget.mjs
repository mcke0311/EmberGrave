import fs from 'node:fs';
import assert from 'node:assert/strict';
import {fixture} from './boss_fixture.mjs';
const zones=['weeping_marsh','drowned_crypt','hollow_reeds','spawn_pools','ritual_site'];
const seeds=[0,1,123,12345,4294967295,...Array.from({length:25},(_,i)=>Math.imul(i+37,2654435761)>>>0)];
const median=a=>a.toSorted((a,b)=>a-b)[Math.floor(a.length/2)];
const out='tests/qa/act2_enemies';fs.mkdirSync(out,{recursive:true});
const versions={before:fixture({sourceDirectory:'tmp/act2_enemies/before/js',dataSeed:7331}),after:fixture({dataSeed:7331})},rows=[];
for(const zone of zones){const samples={};
 for(const [version,f] of Object.entries(versions)){
  samples[version]=[];
  for(const seed of seeds){
   const p=new f.Player('Budget','vanguard'),s=f.Game.__bossTest.freshState(p,seed);s.map=f.MapGen.generate(zone,seed);f.Game.__bossTest.setState(s);f.ctx.Math.random=f.U.rng(seed+7331);
   const row={seed,count:0,hp:0,xp:0,damage:0};
   for(const sp of s.map.monsterSpawns){if(f.DATA.ENEMIES[sp.id].boss)continue;const m=new f.Monster(sp.id,sp.x,sp.y,{elite:sp.elite});row.count++;row.hp+=m.maxHp;row.xp+=m.def.xp;row.damage+=((m.def.dmg[0]+m.def.dmg[1])/2*2.2*(m.def.dmgMult||1)+(m.def.poison||0))*m.def.atkRate;
    if(version==='after'){assert(f.DATA.ACT2_COMBAT.pools[zone][sp.id]);assert(f.TerrainNavigation.clear(s.map,m.x,m.y,m.radius),zone+'/'+seed+' body footprint');assert(Object.values(s.map.spawns).every(p=>f.U.dist(p.x,p.y,m.x,m.y)>=8),'quiet arrival');}
   }
   if(version==='after'){
    for(const [id,count] of Object.entries(s.map.act2.quotas))assert.equal(s.map.monsterSpawns.filter(p=>p.id===id).length,count,'exact quota');
    for(const g of s.map.act2.encounters){assert(g.spawns.filter(p=>p.role==='ranged').length<=2);assert(g.spawns.filter(p=>p.role==='specialist').length<=1);const depth=p=>p.x*g.forward.x+p.y*g.forward.y,r=g.spawns.filter(p=>p.role==='ranged'),m=g.spawns.filter(p=>p.role==='melee');if(r.length&&m.length)assert(Math.min(...r.map(depth))>Math.max(...m.map(depth)),'shooters behind melee');}
    if(zone==='hollow_reeds')assert(row.count>=15);
   }
   samples[version].push(row);
  }
 }
 const before={},after={},ratio={};for(const key of ['count','hp','xp','damage']){before[key]=median(samples.before.map(r=>r[key]));after[key]=median(samples.after.map(r=>r[key]));ratio[key]=after[key]/before[key];}
 const calibration=Object.fromEntries(['hp','damage','xp'].map(k=>[k,+(versions.after.DATA.ACT2_COMBAT.balance[zone][k]*before[k]/after[k]).toFixed(5)]));
 rows.push({zone,before,after,ratio,calibration,samples});console.log(JSON.stringify({zone,before,after,ratio,calibration}));
}
const passed=rows.every(r=>r.ratio.count>=.9&&r.ratio.count<=1.1&&r.ratio.hp>=.85&&r.ratio.hp<=1.15&&r.ratio.xp>=.85&&r.ratio.xp<=1.15);
fs.writeFileSync(out+'/budgets.json',JSON.stringify({status:passed?'PASS':'FAIL',dataSeed:7331,seedCount:30,rows},null,2)+'\n');assert(passed,'population, health and XP budgets');
