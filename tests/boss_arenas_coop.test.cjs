const test=require('node:test'),assert=require('node:assert/strict'),{fixture}=require('./coop_runtime_fixture.cjs');
async function command(f,p,c){p.testSeq=(p.testSeq||0)+1;await f.runtime.receive(p._coopId,{kind:'command',seq:p.testSeq,worldId:p.worldId,generation:p.travelGeneration,command:c});return f.messages.findLast(m=>m.payload?.kind==='ack'&&m.payload.seq===p.testSeq&&(m.to===p._coopId||p._coopId==='host'&&m.type==='local'))?.payload;}
async function travel(f,p,zone){const w=f.runtime.worlds.get(p.worldId),e=w.map.exits.find(e=>e.target===zone);assert.ok(e);Object.assign(p,{x:(e.x0+e.x1)/2,y:(e.y0+e.y1)/2});const ack=await command(f,p,{type:'travel',zone});assert.ok(ack.ok,ack.message);const t=f.messages.findLast(m=>m.payload?.kind==='prepareWorld'&&(m.to===p._coopId||p._coopId==='host'&&m.type==='local')).payload;await f.runtime.receive(p._coopId,{kind:'worldReady',id:t.id,ok:true});assert.equal(p.worldId,zone);}
for(const count of [2,3,4])test(count+' player Korvath admission, counters, replication, revive, reconnect and wipe retry',async()=>{
  const f=fixture();await f.runtime.start({hostId:'host',hero:f.hero('Host'),seed:123});
  for(let i=1;i<count;i++)await f.runtime.receive('p'+i,{kind:'hero',hero:f.hero('Guest'+i)});
  const heroes=[...f.runtime.players.values()];assert.equal(heroes.length,count);f.runtime.worlds.get('frosthaven').flags.fn_temple_open=true;f.Game.firstSightCutscene=()=>{};
  for(const p of heroes)for(const zone of ['north_wild','shattered_temple','arena_korvath'])await travel(f,p,zone);
  const w=f.runtime.worlds.get('arena_korvath'),m=w.monsters.find(m=>m.defId==='korvath'),e=m.encounter,a=e.arena;
  const scope=fn=>f.Game.coop.withWorld(w,fn),tick=n=>{for(let t=0;t<n;t+=1/30)f.runtime.tick(1/30);};
  for(const p of heroes){p.stats.maxHp=p.hp=10000;p.command=p.path=null;}
  Object.assign(heroes[0],{x:a.cx+3,y:a.cy+2});tick(.2);assert.equal(e.active,false,'wait for everyone already admitted '+JSON.stringify(w.players.map(p=>({id:p._coopId,x:p.x,y:p.y,connected:p.connected,dead:p.dead})))+' arena '+JSON.stringify(a.entrance));
  for(const [i,p]of heroes.entries())Object.assign(p,{x:a.cx+3,y:a.cy+2+i});tick(.1);assert.ok(e.active&&a.sealed);
  assert.ok(a.gateCells.every(i=>w.map.blocked[i]===1));
  assert.equal((await command(f,heroes[0],{type:'travel',zone:'shattered_temple'})).ok,false);
  assert.equal((await command(f,heroes[0],{type:'castPortal'})).ok,false);
  scope(()=>m.takeDamage(1e9,heroes[0]));tick(.1);assert.equal(m.hp,m.maxHp*.5);assert.ok(e.mechanic);
  const d=a.devices.find(d=>d.required);for(const [i,p]of heroes.entries())Object.assign(p,{x:d.x,y:d.y+1+i*.1});
  const results=await Promise.all(heroes.map(p=>command(f,p,{type:'interact',targetId:d._coopId})));
  assert.ok(results.every(r=>r.ok));assert.ok(e.ward&&e.mechanic.armed);const ward=e.ward;
  tick(.1);assert.equal(e.ward,ward,'one counter owns concurrent interactions');
  const snap=scope(()=>f.CoopCodec.snapshot(w,1,999,true,heroes[0]._coopId));
  const display={...w,...Object.fromEntries(f.CoopCodec.groups.map(k=>[k,[]])),map:{...w.map,bossArena:{...a},props:[],blocked:w.map.blocked.slice(),walls:w.map.walls.slice(),hazard:w.map.hazard.slice()}};
  f.CoopCodec.apply(display,snap,heroes[0]._coopId);assert.ok(display.map.bossArena.sealed);assert.ok(display.map.bossArena.devices.some(d=>d.required&&d.completed));
  const replica=display.monsters.find(m=>m.defId==='korvath');assert.ok(replica.encounter.mechanic.armed&&replica.encounter.ward);assert.equal(replica.encounter.arena,display.map.bossArena);
  tick(3);assert.equal(e.mechanic,null);assert.equal(e.stage,'recovery');assert.ok(e.recoveryDuration>=2);
  // Existing participants resume the same actor and boss health after reconnect.
  const hp=m.hp,guest=heroes[1];f.runtime.roster(heroes.map(p=>({id:p._coopId,connected:p!==guest})));tick(.2);
  f.runtime.roster(heroes.map(p=>({id:p._coopId,connected:true})));await f.runtime.receive(guest._coopId,{kind:'hero',hero:f.hero('Guest1')});assert.equal(f.runtime.players.get(guest._coopId),guest);assert.equal(m.hp,hp);assert.ok(e.active);
  f.runtime.roster(heroes.map(p=>({id:p._coopId,connected:false})));tick(.2);
  assert.ok(e.active&&a.sealed);assert.equal(m.hp,hp,'temporary disconnects never reset a live encounter');
  f.runtime.roster(heroes.map(p=>({id:p._coopId,connected:true})));
  if(count<4){await f.runtime.receive('late',{kind:'hero',hero:f.hero('Late')});const late=f.runtime.players.get('late');await travel(f,late,'north_wild');await travel(f,late,'shattered_temple');const entrance=f.runtime.worlds.get(late.worldId).map.exits.find(x=>x.target==='arena_korvath');Object.assign(late,{x:entrance.x0,y:entrance.y0});assert.equal((await command(f,late,{type:'travel',zone:'arena_korvath'})).ok,false);}
  scope(()=>f.runtime.died(guest));Object.assign(heroes[0],{x:guest.x+1,y:guest.y});e.clearAttacks();e.clearOwned();e.recover(10);
  await command(f,heroes[0],{type:'revive',targetId:guest._coopId});tick(3.2);assert.equal(guest.dead,false);assert.ok(e.active);
  const belts=heroes.map(p=>JSON.stringify(p.belt));for(const p of heroes)scope(()=>f.runtime.died(p));tick(.1);
  assert.equal(e.active,false);assert.equal(e.mechanic,null);assert.equal(m.hp,m.maxHp);assert.equal(a.sealed,false);
  for(const key of ['projectiles','minions','traps','fx'])w[key].push({owner:heroes[0],fromPlayer:true});
  assert.equal((await command(f,heroes[0],{type:'retryArena'})).ok,true);
  assert.ok(['projectiles','minions','traps','fx'].every(key=>w[key].length===0),'retry clears every party-owned threat and summon');
  assert.ok(heroes.every(p=>!p.dead&&p.hp===p.stats.maxHp&&p.mana===p.stats.maxMana&&p.y>a.y1));
  assert.deepEqual(heroes.map(p=>JSON.stringify(p.belt)),belts);assert.equal(new Set(heroes.map(p=>p.x+','+p.y)).size,count);
  assert.ok(a.devices.every(d=>!d.required&&!d.completed&&d.cooldown===0));assert.equal(e.owned.length+e.pools.length,0);
  for(const [i,p]of heroes.entries())Object.assign(p,{x:a.cx+3,y:a.cy+2+i});tick(.1);assert.ok(e.active);
  await f.runtime.checkpoint();const saved=structuredClone(f.saves.at(-1).campaign),restore=fixture();await restore.runtime.start({hostId:'host',hero:f.hero('Host'),campaign:saved});
  assert.equal(restore.runtime.players.get('host').worldId,'frosthaven');const restored=restore.runtime.worlds.get('arena_korvath');assert.equal(restored.map.bossArena.sealed,false);assert.ok(restored.map.bossArena.devices.every(d=>!d.required&&!d.completed));
});
