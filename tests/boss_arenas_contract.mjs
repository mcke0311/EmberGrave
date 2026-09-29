import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fixture} from './boss_fixture.mjs';
const f=fixture(),{DATA:D,Game:G,MapGen:M,BossEncounters:B,TerrainNavigation:N}=f;
let checks=0;const ok=(v,label)=>{checks++;assert.ok(v,label);};
const ids=Object.keys(D.BOSS_ARENAS),scenes=[];
for(const id of ids)for(let seed=0;seed<32;seed++){
  const c=D.BOSS_ARENAS[id],map=M.generate(c.zone,seed),parent=M.generate(c.parentZone,seed),a=map.bossArena;
  ok(map.monsterSpawns.length===1&&map.monsterSpawns[0].id===id,id+' sole boss');
  ok(!parent.monsterSpawns.some(s=>s.id===id),id+' removed from parent');
  ok(parent.exits.some(e=>e.target===c.zone)&&map.exits.some(e=>e.target===c.parentZone&&e.reuseCachedMap),id+' round trip');
  const points=[{x:a.cx,y:a.cy},...a.devices,...map.props.filter(p=>p.storyId),...map.exits.map(e=>({x:(e.x0+e.x1)/2,y:(e.y0+e.y1)/2}))];
  for(const point of points){
    const path=N.findPath(map,map.spawns.default,point,{radius:.4,hop:false,speed:4});
    ok(path?.length,id+'/'+seed+' walking route to '+(point.deviceId||point.storyId||'boss'));
    ok(B.footprint(map,point.x,point.y,.45),id+' clear device/reward footprint');
  }
  const arrival=N.findPath(parent,parent.spawns.default,parent.spawns.from_arena,{radius:.4,hop:false,speed:4});
  ok(arrival?.length,id+'/'+seed+' reachable parent entrance');
  const before=map.monsterSpawns.length,props=map.props.length;M.placeEvents(map,{seed,difficulty:0});ok(map.monsterSpawns.length===before&&map.props.length===props,id+' no random events');
  if(!seed)scenes.push({boss:id,zone:map.id,shape:a.shape,devices:a.devices.map(d=>d.deviceId)});
}
function enter(id){const v=f.fresh(id);Object.assign(v.p,v.s.map.spawns.default);v.m.aggro=false;f.tick(v.s,.2);ok(!v.e.active,id+' safe vestibule');Object.assign(v.p,{x:v.e.arena.cx+2,y:v.e.arena.cy+2});f.tick(v.s,.1);ok(v.e.active&&v.e.arena.sealed,id+' threshold seals');return v;}
for(const id of ids){
 const {s,p,e}=f.fresh(id);Object.assign(p,s.map.spawns.default);
 const pet=new f.Minion('wolf',{hp:100,dmg:[5,8],speed:4,atkRate:1,range:1,sprite:'wolf'},p);s.minions=[pet];
 Object.assign(p,{x:e.arena.cx,y:e.arena.y1-.7});f.tick(s,.1);
 ok(e.active&&B.insideArena(e.arena,pet.x,pet.y,pet.radius)&&B.footprint(s.map,pet.x,pet.y,pet.radius),id+' prepared companion joins its owner inside the seal');
}
function counter(v){
  const {s,p,e}=v;
  for(const device of e.arena.devices.filter(d=>d.required)){
    Object.assign(p,{x:device.x,y:device.y+1.5});
    ok(e.interactDevice(device,p),'required device accepts nearby interaction');
    ok(!e.interactDevice(device,p),'same interaction cannot complete twice');
    if(e.ward){f.tick(s,.65);const attack=e.attack;ok(attack&&['charge','sunbeam'].includes(attack.id),'armed counter chooses its signature');f.tick(s,2.3);}
  }
  ok(!e.mechanic&&e.stage==='recovery','counter creates an opening');
  ok(e.recoveryDuration>=2,'counter recovery is long enough');
}
for(const id of ids)for(const dt of [1/120,1/30,.05]){
  const v=enter(id),{s,p,m,e}=v;
  const gate=e.arena.gateCells[0];ok(s.map.blocked[gate]===1,id+' seal has collision');
  p.x=e.arena.x1+4;f.tick(s,dt,dt);ok(e.active&&B.insideArena(e.arena,p.x,p.y),id+' escape cannot reset or bypass seal');
  for(let phase=1;phase<e.config.phases.length;phase++){
    m.takeDamage(1e9,p);ok(Math.abs(m.hp-m.maxHp*m.def.phases[phase-1].at)<1e-6,id+' burst clamps at threshold');
    const thresholdHp=m.hp;m.takeDamage(1e9,p);m.loseHealth(1e9);m.takeDamage(1e9,{owner:p});
    ok(m.hp===thresholdHp&&!m.dead,id+' simultaneous hits, DOT and summon damage cannot skip a pending transition');
    f.tick(s,dt,dt);ok(e.phase===phase&&!!e.mechanic,id+' phase defense starts');
    const hp=m.hp;m.takeDamage(1e9,p);m.loseHealth(1e9);ok(m.hp===hp,id+' direct and DOT damage blocked by defense');
    const d=e.arena.devices.find(d=>d.required);p.x=e.arena.cx;p.y=e.arena.cy;ok(!e.interactDevice(d,p),id+' cannot use device remotely');
    if(['korvath','azram'].includes(id)){
      p.x=d.x;p.y=d.y+1.5;ok(e.interactDevice(d,p),id+' arm failed counter');
      if(id==='korvath'){p.x=e.arena.cx+4;p.y=e.arena.cy;f.tick(s,3);ok(!!e.mechanic&&!!e.ward,id+' charge missing the ward keeps the armor');}
      e.ward.ttl=dt/2;f.tick(s,dt,dt);
      ok(e.mechanic&&!e.mechanic.armed&&!d.completed&&d.cooldown===0,id+' expired counter re-arms');
    }
    counter(v);
    f.tick(s,3.1,dt);p.x=e.arena.cx+2;p.y=e.arena.cy+2;
  }
  m.takeDamage(1e9,p);ok(m.dead&&e.lifecycle==='victory'&&!e.arena.sealed,id+' victory opens arena');
  ok(!e.attack&&!e.sequence&&!e.ward&&!e.mechanic&&e.owned.length===0&&e.pools.length===0,id+' victory clears threats');
  ok(s.flags['dead_'+id+'@0'],id+' persistent boss defeat');
}
for(const id of ids){
  const {s,p,m,e}=enter(id);m.takeDamage(1e9,p);f.tick(s,.1);e.pools.push({kind:'circle',x:p.x,y:p.y,radius:2,ttl:5,tick:1});e.wave(['drowned_dead']);
  s.bossCheckpoint={zone:s.map.id,spawn:'retry'};p.dead=true;f.tick(s,.1);
  ok(G.canRetryArena(),id+' retry offered');
  ok(!e.active&&!e.mechanic&&!e.arena.sealed&&e.pools.length===0&&e.owned.length===0&&m.hp===m.maxHp,id+' death reset');
  ok(e.arena.devices.every(d=>!d.required&&!d.completed&&d.cooldown===0),id+' device reset');
  p.hardcore=true;ok(!G.canRetryArena(),id+' no hardcore retry');
}
for(const id of ids){
 const v=enter(id),{p,e}=v,d=e.arena.devices[0];
 e.pools.push({kind:'circle',x:p.x,y:p.y,radius:1,ttl:6,tick:1});Object.assign(p,{x:d.x,y:d.y+1});
 ok(e.interactDevice(d,p),id+' optional device available');ok(e.pools.length===0,id+' optional device clears hazards');
 ok(!e.interactDevice(d,p)&&d.cooldown>0,id+' optional relief has a cooldown');
}
for(const [id,object,parent]of [['mire_mother','mire_shard','ritual_site'],['azram','fortress_map','khal_palace']]){
  const {s}=f.fresh(id);const zone=D.BOSS_ARENAS[id].zone;
  ok(D.STORY_OBJECTS[zone].some(o=>o.id===object)&&!D.STORY_OBJECTS[parent].some(o=>o.id===object),'reward moved once');
  D.CAMPAIGN.record(s,{kind:'interact',zone:parent,target:object});ok(D.CAMPAIGN.found(s,zone,object),'legacy discovery remains discovered');
  D.CAMPAIGN.record(s,{kind:'interact',zone,target:object});ok(s.flags.campaign['interact:'+parent+':'+object]===1,'revisit cannot duplicate discovery');
}
for(const id of ids){
  const {s,e,p}=enter(id);e.phase=e.config.phases.length-1;
  for(const name of new Set(e.config.rotations[e.phase])){
    e.start(name,p);ok(e.attack.windup>=1,id+'/'+name+' visible warning');
    const shapes=JSON.stringify(e.attack.shapes);p.x+=.3;f.tick(s,.2);ok(JSON.stringify(e.attack.shapes)===shapes,id+'/'+name+' locked warning');
    e.clearAttacks();e.stage='idle';
  }
}
fs.mkdirSync('tests/qa/boss_arenas',{recursive:true});
fs.writeFileSync('tests/qa/boss_arenas/contract.json',JSON.stringify({checks,arenas:192,scenes},null,2)+'\n');
console.log('PASS '+checks+' arena, device, progression and lifecycle checks');
