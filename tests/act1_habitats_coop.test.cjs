const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {fixture}=require('./coop_runtime_fixture.cjs');
async function command(f,id,command){const p=f.runtime.players.get(id);p.testSeq=(p.testSeq||0)+1;return f.runtime.receive(id,{kind:'command',seq:p.testSeq,worldId:p.worldId,generation:p.travelGeneration,command});}
async function travel(f,id,zone){
  const p=f.runtime.players.get(id),w=f.runtime.worlds.get(p.worldId),exit=w.map.exits.find(e=>e.target===zone);
  assert.ok(exit);Object.assign(p,{x:(exit.x0+exit.x1)/2,y:(exit.y0+exit.y1)/2,surfaceId:exit.surfaceId||0});
  await command(f,id,{type:'travel',zone});
  const offered=f.messages.filter(m=>(m.to===id||id==='host'&&m.type==='local')&&m.payload?.kind==='prepareWorld').at(-1)?.payload;
  assert.ok(offered);await f.runtime.receive(id,{kind:'worldReady',id:offered.id,ok:true});assert.equal(p.worldId,zone);
}
function approach(f,w,p,prop){
  const {P,N}=vm.runInContext('({P:PropInteractions,N:TerrainNavigation})',f.context);
  for(let k=0;k<24;k++){
    const angle=k*Math.PI/12,x=prop.x+Math.cos(angle)*1.2,y=prop.y+Math.sin(angle)*1.2;
    if(!N.clear(w.map,x,y,p.radius))continue;
    Object.assign(p,{x,y,surfaceId:prop.surfaceId||0});if(P.reachable(w,prop,p))return;
  }
  throw Error('No valid approach');
}
test('authoritative dens spawn once, survive recovery, and stop after a committed kick',async()=>{
  const f=fixture(),hero=f.hero('HabitatHost');await f.runtime.start({hostId:'host',hero,seed:123});await travel(f,'host','north_wild');
  const w=f.runtime.worlds.get('north_wild'),p=f.runtime.players.get('host'),den=w.map.props.find(p=>p.behavior==='wolf_den');
  w.monsters=[];approach(f,w,p,den);p.stats.maxHp=p.hp=1e6;
  for(let i=0;i<179;i++)f.runtime.tick(1/30);
  assert.equal(w.monsters.length,0);f.runtime.tick(1/30);assert.equal(w.monsters.length,1);
  const wolf=w.monsters[0];assert.equal(wolf.denId,den.propId);assert.equal(wolf.name,'Icefang Wolf');
  const snapshot=f.Game.coop.withWorld(w,()=>f.CoopCodec.snapshot(w,1,1,true,p._coopId));
  assert.equal(snapshot.groups.monsters.length,1);assert.equal(snapshot.props.find(row=>row.propId===den.propId).spawnCooldown,undefined);
  const spawned=wolf._coopId;assert.ok(spawned);wolf.hp=5;
  await f.runtime.checkpoint();const saved=structuredClone(f.saves.at(-1).campaign);
  // A changed prop array order must not cross-wire saved consumption state.
  saved.areas.north_wild.props.reverse();
  const r=fixture();await r.runtime.start({hostId:'resumed',hero,campaign:saved});
  const restored=r.runtime.worlds.get('north_wild'),restoredDen=restored.map.props.find(p=>p.propId===den.propId);
  assert.equal(restoredDen.spawnCooldown,den.spawnCooldown);
  assert.equal(restored.monsters.filter(m=>m._coopId===spawned).length,1);assert.equal(restored.monsters.find(m=>m._coopId===spawned).hp,5);
  // Commit through the actual interaction gesture; the internal transaction saves it.
  approach(f,w,p,den);await command(f,'host',{type:'interact',targetId:den._coopId});
  assert.ok(p.action?.propInteraction);
  for(let i=0;i<10;i++){f.runtime.tick(1/30);await new Promise(resolve=>setImmediate(resolve));}
  await f.runtime.checkpoint();assert.ok(den.broken);const count=w.monsters.length;
  for(let i=0;i<200;i++)f.runtime.tick(1/30);
  assert.equal(w.monsters.length,count);assert.equal(w.ground.length,0);
  await command(f,'host',{type:'interact',targetId:den._coopId});assert.equal(w.monsters.length,count);
  const done=fixture();await done.runtime.start({hostId:'finished',hero,campaign:structuredClone(f.saves.at(-1).campaign)});
  assert.ok(done.runtime.worlds.get('north_wild').map.props.find(p=>p.propId===den.propId).broken);
});

test('two heroes cannot claim a crystal reward twice',async()=>{
  const f=fixture();await f.runtime.start({hostId:'host',hero:f.hero('CrystalHost'),seed:123});
  await f.runtime.receive('guest',{kind:'hero',hero:f.hero('CrystalGuest')});
  for(const id of ['host','guest']){await travel(f,id,'north_wild');await travel(f,id,'mines');}
  const w=f.runtime.worlds.get('mines'),crystal=w.map.props.find(p=>p.behavior==='crystal');w.monsters=[];
  for(const p of w.players)approach(f,w,p,crystal);
  vm.runInContext('Math.random=()=>.05',f.context);
  for(const id of ['host','guest'])await command(f,id,{type:'interact',targetId:crystal._coopId});
  for(let i=0;i<12;i++){f.runtime.tick(1/30);await new Promise(resolve=>setImmediate(resolve));}
  await f.runtime.checkpoint();assert.ok(crystal.broken);assert.equal(w.ground.length,1);assert.equal(w.ground[0].item.kind,'jewel');
  for(const id of ['host','guest'])await command(f,id,{type:'interact',targetId:crystal._coopId});
  assert.equal(w.ground.length,1);
});
