import fs from 'node:fs';
import assert from 'node:assert/strict';
import {fixture} from './boss_fixture.mjs';
const f=fixture({gameExports:['setupBeaconQuest','setupRitualQuest']}),{Game:G,MapGen:M,Player,Monster,DATA:D,TerrainNavigation:N,U}=f;
const covered=new Map();let checks=0;
function state(map,seed){const p=new Player('Boss activation','vanguard'),s=G.__bossTest.freshState(p,seed);s.map=map;s.quests={q16:{state:'done'},q17:{state:'done'}};s.player.x=map.spawns.default.x;s.player.y=map.spawns.default.y;G.__bossTest.setState(s);return s;}
function audit(s,mon){
 const m=s.map,p=s.player,a=mon.encounter?.arena;
 let approach=null,path=null;
 for(const r of [5,3,7,1.5])for(let k=0;k<16&&!approach;k++){
  const point={x:mon.x+Math.cos(k*Math.PI/8)*r,y:mon.y+Math.sin(k*Math.PI/8)*r};
  if(a&&!f.BossEncounters.insideArena(a,point.x,point.y,p.radius))continue;
  if(!N.clear(m,point.x,point.y,p.radius)||!U.los((x,y)=>M.walkable(m,x,y),point.x,point.y,mon.x,mon.y))continue;
  const candidate=N.findPath(m,m.spawns.default,point,{radius:p.radius,hop:false,speed:p.stats.moveSpeed});
  if(candidate?.length){approach=point;path=candidate;}
 }
 assert.ok(approach,`${m.id}/${mon.defId}/${s.seed}: no walkable route into engagement range`);checks++;
 Object.assign(p,approach);s.monsters=[mon];mon.aggro=false;
 for(let t=0;t<.25;t+=.05)mon.update(.05,p,m);
 assert.ok(mon.aggro||mon.encounter?.active,`${m.id}/${mon.defId}: arrival does not engage`);checks++;
 const key=m.id+'/'+mon.defId;if(!covered.has(key))covered.set(key,{zone:m.id,id:mon.defId,seed:s.seed,approach,pathNodes:path.length});
}
for(const seed of [0,1,123,4294967295,320040388]){
 for(const zone of Object.values(D.ZONES)){
  if(zone.id==='frosthaven_approach')continue;
  const map=M.generate(zone.id,seed),s=state(map,seed);
  for(const sp of map.monsterSpawns.filter(sp=>D.ENEMIES[sp.id]?.boss))audit(s,new Monster(sp.id,sp.x,sp.y));
 }
 const north=state(M.generate('north_wild',seed),seed);north.quests.q8b={state:'active',beacons:3,trioSpawned:true,trioKilled:[]};
 G.__bossTest.setupBeaconQuest(north.map);const trio=[...north.monsters];assert.equal(trio.length,3);checks++;
 for(const mon of trio)audit(north,mon);
 const q=D.QUESTS.find(q=>q.id==='q11'),ritual=state(M.generate(q.zone,seed),seed);ritual.quests.q11={state:'active',siteDestroyed:true,bossDead:false};
 G.__bossTest.setupRitualQuest(ritual.map);assert.ok(ritual.monsters.some(m=>m.defId===q.boss));checks++;
 for(const mon of [...ritual.monsters])audit(ritual,mon);
}
const missing=Object.keys(D.ENEMIES).filter(id=>D.ENEMIES[id].boss&&id!=='frost_watch_captain'&&![...covered.values()].some(row=>row.id===id));
// These legacy miniboss definitions are deliberately excluded by familyPools
// from both authored populations and random events. There is no live trigger.
assert.deepEqual(missing,['bone_dragon','flesh_engine','infernal_warlord']);checks++;
for(const zone of Object.values(D.ZONES))for(const pool of Object.values(D.familyPools(zone.id)))for(const id of missing){assert.ok(!pool.includes(id));checks++;}
fs.mkdirSync('tmp/mobile-fixes',{recursive:true});fs.writeFileSync('tmp/mobile-fixes/boss-activation.json',JSON.stringify({checks,seeds:[0,1,123,4294967295,320040388],encounters:[...covered.values()],unusedDefinitions:missing},null,2));
console.log(`PASS ${checks} boss activation checks across ${covered.size} zone/encounter combinations`);
