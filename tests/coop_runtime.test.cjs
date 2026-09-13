const test=require('node:test');
const assert=require('node:assert/strict');
const {fixture}=require('./coop_runtime_fixture.cjs');
test('worker boot, persistent admission and independent world simulation without a DOM',async()=>{
  const f=fixture();await f.runtime.start({hostId:'host',hero:f.hero('Host'),seed:123});
  await f.runtime.receive('guest',{kind:'hero',hero:f.hero('Guest','veilranger')});
  assert.equal(f.runtime.players.size,2);assert.equal(f.runtime.worlds.size,6);
  f.runtime.tick(1/30);
  assert.ok(f.messages.some(m=>m.type==='local'&&m.payload.kind==='snapshot'));
  assert.ok(f.saves.at(-1).campaign.schemaVersion===2);
});

async function session(){const f=fixture();await f.runtime.start({hostId:'host',hero:f.hero('Host'),seed:123});await f.runtime.receive('guest',{kind:'hero',hero:f.hero('Guest','veilranger')});return f;}
async function command(f,id,command){const p=f.runtime.players.get(id);p.testSeq=(p.testSeq||0)+1;return f.runtime.receive(id,{kind:'command',seq:p.testSeq,worldId:p.worldId,generation:p.travelGeneration,command});}
function prepared(f,id){return f.messages.filter(m=>(m.to===id||id==='host'&&m.type==='local')&&m.payload?.kind==='prepareWorld').at(-1)?.payload;}
async function travel(f,id,zone){const p=f.runtime.players.get(id),w=f.runtime.worlds.get(p.worldId),exit=w.map.exits.find(e=>e.target===zone);assert.ok(exit,'exit exists');p.x=(exit.x0+exit.x1)/2;p.y=(exit.y0+exit.y1)/2;p.surfaceId=exit.surfaceId||0;await command(f,id,{type:'travel',zone});const m=prepared(f,id);assert.ok(m,'destination offered');await f.runtime.receive(id,{kind:'worldReady',id:m.id,ok:true});assert.equal(p.worldId,zone);}
test('guests travel independently, new guests join in town, and remote worlds keep ticking',async()=>{
  const f=await session();await travel(f,'guest','north_wild');
  const town=f.runtime.worlds.get('frosthaven'),wild=f.runtime.worlds.get('north_wild');
  assert.equal(town.players.length,1);assert.equal(wild.players.length,1);
  for(let i=0;i<10;i++)f.runtime.tick(1/30);
  assert.ok(town.time>0&&wild.time>0);assert.equal(f.runtime.players.get('host').worldId,'frosthaven');
  await f.runtime.receive('third',{kind:'hero',hero:f.hero('Third')});assert.equal(f.runtime.players.get('third').worldId,'frosthaven');
  const guestUpdates=f.messages.filter(m=>m.to==='guest'&&['snapshot','delta'].includes(m.payload?.kind));
  assert.equal(guestUpdates.at(-1).payload.zone,'north_wild');
  assert.equal(guestUpdates.findLast(m=>m.payload.kind==='snapshot').payload.groups.players.length,1);
});
test('teleport channels, preserves resources, and rejects replay or combat',async()=>{
  const f=await session();await travel(f,'guest','north_wild');
  const p=f.runtime.players.get('guest'),host=f.runtime.players.get('host'),w=f.runtime.worlds.get('north_wild');w.monsters=[];p.hp=61;p.mana=17;
  await command(f,'guest',{type:'teleportToPlayer',targetId:'host'});
  for(let i=0;i<91;i++)f.runtime.tick(1/30);
  const offer=prepared(f,'guest');assert.equal(offer.zone,'frosthaven');
  await f.runtime.receive('guest',{kind:'worldReady',id:offer.id,ok:true});assert.equal(p.worldId,'frosthaven');assert.ok(p.teleportUntil>0);assert.ok(p.hp>=61);
  const generation=p.travelGeneration;await f.runtime.receive('guest',{kind:'worldReady',id:offer.id,ok:true});assert.equal(p.travelGeneration,generation);
  host.combatUntil=999;await command(f,'guest',{type:'teleportToPlayer',targetId:'host'});
  assert.equal(f.messages.at(-1).payload.ok,false);
});
test('failed preload and stale world commands cannot move or duplicate a hero',async()=>{
  const f=await session(),p=f.runtime.players.get('guest'),w=f.runtime.worlds.get('frosthaven'),exit=w.map.exits.find(e=>e.target==='north_wild');Object.assign(p,{x:(exit.x0+exit.x1)/2,y:(exit.y0+exit.y1)/2});
  await command(f,'guest',{type:'travel',zone:'north_wild'});const offer=prepared(f,'guest');
  await f.runtime.receive('guest',{kind:'worldReady',id:offer.id,ok:false});assert.equal(p.worldId,'frosthaven');
  await travel(f,'guest','north_wild');const x=p.x;
  await f.runtime.receive('guest',{kind:'command',seq:500,worldId:'frosthaven',generation:1,command:{type:'steer',point:{x:100,y:100}}});
  assert.equal(p.x,x);assert.equal(p.command,null);
});

test('a delayed inventory commit leaves another occupied world running and failed changes roll back',async()=>{
  const f=await session();await travel(f,'guest','north_wild');
  const p=f.runtime.players.get('host'),town=f.runtime.worlds.get('frosthaven'),wild=f.runtime.worlds.get('north_wild');
  p.attrPts=2;const before=p.attr.vit;let release;
  f.context.saveRecords=()=>new Promise(resolve=>release=resolve);
  const saving=command(f,'host',{type:'attribute',attribute:'vit'});
  await new Promise(r=>setImmediate(r));assert.ok(town._busy);
  for(let i=0;i<15;i++)f.runtime.tick(1/30);
  assert.ok(wild.time>.4);release();await saving;assert.equal(p.attr.vit,before+1);assert.equal(p.attrPts,1);
  f.context.saveRecords=async()=>{throw Error('Injected disk failure');};
  await command(f,'host',{type:'attribute',attribute:'vit'});
  assert.equal(p.attr.vit,before+1);assert.equal(p.attrPts,1);assert.equal(town._busy,false);
  f.context.saveRecords=async()=>{};await f.runtime.retrySave();f.runtime.tick(1/30);assert.ok(town.time>0);
});

test('rejected ownership and failed saves retain every item identity',async()=>{
  const f=await session(),host=f.runtime.players.get('host'),guest=f.runtime.players.get('guest');
  const before=[host,guest].map(p=>JSON.stringify(f.CoopCodec.hero(p).inv));
  await command(f,'guest',{type:'carry',itemId:host.inv.items[0]._coopId});
  assert.equal(f.messages.at(-1).payload.ok,false);
  assert.deepEqual([host,guest].map(p=>JSON.stringify(f.CoopCodec.hero(p).inv)),before);
  f.context.saveRecords=async()=>{throw Error('Disk failure');};
  await command(f,'guest',{type:'carry',itemId:guest.inv.items[0]._coopId});
  assert.equal(f.messages.at(-1).payload.ok,false);
  assert.deepEqual([host,guest].map(p=>JSON.stringify(f.CoopCodec.hero(p).inv)),before);
});

test('duplicate economic requests wait for the original durable acknowledgment',async()=>{
  const f=await session(),p=f.runtime.players.get('guest');p.attrPts=2;
  let release;f.context.saveRecords=()=>new Promise(resolve=>release=resolve);
  const message={kind:'command',worldId:p.worldId,generation:p.travelGeneration,seq:1,command:{type:'attribute',attribute:'vit'}};
  const operation=f.runtime.receive('guest',message);await new Promise(r=>setImmediate(r));f.messages.length=0;
  await f.runtime.receive('guest',message);assert.equal(f.messages.filter(m=>m.payload?.kind==='ack').length,0);
  release();await operation;assert.equal(p.attrPts,1);assert.equal(f.messages.at(-1).payload.ok,true);
  await f.runtime.receive('guest',message);assert.equal(f.messages.at(-1).payload.ok,true);assert.equal(p.attrPts,1);
});

test('guest quest control remains rejected after independent travel and dormant areas stop ticking',async()=>{
  const f=await session();await travel(f,'guest','north_wild');
  await command(f,'guest',{type:'acceptQuest',questId:f.DATA.QUESTS.find(q=>q.zone==='north_wild').id});
  assert.match(f.messages.at(-1).payload.message,/host manages/);
  const town=f.runtime.worlds.get('frosthaven');await travel(f,'host','north_wild');const at=town.time;
  f.runtime.tick(1/30);assert.equal(town.players.length,0);assert.equal(town.time,at);
});

test('snapshot windows isolate a slow recipient and resync targets only that recipient',async()=>{
  const f=await session();f.messages.length=0;
  for(let i=0;i<60;i++){
    f.runtime.tick(1/30);
    for(const m of f.messages.filter(m=>m.type==='local'&&['snapshot','delta'].includes(m.payload?.kind)))await f.runtime.receive('host',{kind:'snapshotAck',seq:m.payload.seq});
  }
  const hostCount=f.messages.filter(m=>m.type==='local'&&m.payload?.kind==='delta').length;
  const guestCount=f.messages.filter(m=>m.to==='guest'&&m.payload?.kind==='delta').length;
  assert.ok(hostCount>20);assert.ok(guestCount<=4);
  f.messages.length=0;await f.runtime.receive('guest',{kind:'resync'});
  assert.equal(f.messages.filter(m=>m.payload?.kind==='snapshot').length,1);assert.equal(f.messages[0].to,'guest');
  const w=f.runtime.worlds.get('frosthaven'),a=f.Game.coop.withWorld(w,()=>f.CoopCodec.snapshot(w,1,999,false,'host',24,'cache-test')),b=f.Game.coop.withWorld(w,()=>f.CoopCodec.snapshot(w,1,1000,false,'guest',24,'cache-test'));
  assert.equal(a.groups.players[0],b.groups.players[0],'a publication reuses immutable actor records');assert.equal(a.props,b.props);
  a.campaign.portal={mapId:'mines'};assert.notEqual(a.campaign.portal,b.campaign.portal,'personal portals do not share a mutable projection');
  w.players[0].hp-=1;const next=f.Game.coop.withWorld(w,()=>f.CoopCodec.snapshot(w,1,1001,false,'guest',24,'next-publication'));
  assert.notEqual(next.groups.players[0],a.groups.players[0]);assert.notEqual(next.groups.players[0].hp,a.groups.players[0].hp);

});

test('a full resync snaps prediction and clears samples without recreating unchanged inventory on movement',async()=>{
  const f=await session(),w=f.runtime.worlds.get('frosthaven'),snap=f.Game.coop.withWorld(w,()=>f.CoopCodec.snapshot(w,1,1,true,'guest'));
  const copy={map:{id:'frosthaven',props:[]},vendorStock:{}};
  for(const group of f.CoopCodec.groups)copy[group]=[];
  f.CoopCodec.apply(copy,snap,'guest');const x=copy.player.x;copy.player.x+=2;copy.player._netSamples=[{x:999,y:999,time:100}];
  f.CoopCodec.apply(copy,snap,'guest');assert.equal(copy.player.x,x);assert.equal(copy.player._netSamples.length,0);
  const inv=copy.player.inv,next=structuredClone(snap);next.seq=2;next.groups.players.find(p=>p._coopId==='guest').x+=1;
  const rep=require('node:vm').runInContext('CoopReplication',f.context),patch=rep.diff(snap,next);
  f.CoopCodec.apply(copy,rep.merge(snap,patch),'guest',patch);assert.equal(copy.player.inv,inv);assert.equal(copy.player.x,x+1);
});

test('teleport interruption, loading revalidation, disconnected targets and unsafe arrivals',async()=>{
  const f=await session(),p=f.runtime.players.get('guest'),host=f.runtime.players.get('host'),town=f.runtime.worlds.get('frosthaven');
  await command(f,'guest',{type:'teleportToPlayer',targetId:'host'});
  await command(f,'guest',{type:'steer',point:{x:p.x+2,y:p.y}});
  for(let i=0;i<100;i++)f.runtime.tick(1/30);
  assert.equal(prepared(f,'guest'),undefined,'movement cancels the channel');
  await command(f,'guest',{type:'stop'});
  await command(f,'guest',{type:'teleportToPlayer',targetId:'host'});
  for(let i=0;i<100;i++)f.runtime.tick(1/30);
  const ticket=prepared(f,'guest'),generation=p.travelGeneration;
  assert.ok(ticket);
  host.combatUntil=999;
  await f.runtime.receive('guest',{kind:'worldReady',id:ticket.id,ok:true});
  assert.equal(p.travelGeneration,generation,'combat while loading cancels arrival');
  host.combatUntil=0;host.connected=false;
  await command(f,'guest',{type:'teleportToPlayer',targetId:'host'});
  assert.equal(f.messages.at(-1).payload.ok,false);
  host.connected=true;
  await command(f,'guest',{type:'teleportToPlayer',targetId:'host'});
  for(let i=0;i<100;i++)f.runtime.tick(1/30);
  town.map.hazard.fill(1);
  await f.runtime.receive('guest',{kind:'worldReady',id:prepared(f,'guest').id,ok:true});
  assert.equal(p.travelGeneration,generation,'hazardous arrival is rejected');
  assert.equal(p.teleportUntil||0,0,'failed arrival never charges cooldown');
});

test('transfers preserve remaining buffs and companions and invalidate source callbacks',async()=>{
  const f=await session();await travel(f,'guest','north_wild');
  const p=f.runtime.players.get('guest'),wild=f.runtime.worlds.get('north_wild'),town=f.runtime.worlds.get('frosthaven');
  wild.monsters=[];wild.time=80;town.time=5;
  p.buffs.push({id:'transfer_buff',stats:{},until:90});p.skillCd.test=88;p.tempoUntil=86;p.hp=61;p.mana=19;
  const hp=p.hp,mana=p.mana,inv=p.inv;
  let delayed=false;
  f.Game.coop.withWorld(wild,()=>p.afterSkillDelay(.1,()=>delayed=true));
  const mi=f.Game.coop.withWorld(wild,()=>new f.Minion('skeleton',{hp:100,dmg:[1,2],speed:4,atkRate:1,range:1},p));mi.buffUntil=87;mi._coopId='companion';wild.minions.push(mi);
  const Monster=require('node:vm').runInContext('Monster',f.context),target=f.Game.coop.withWorld(wild,()=>new Monster('frost_risen',mi.x+.2,mi.y));target.hp=target.maxHp=10000;target.def.dmg=[0,0];wild.monsters=[target];mi.isArcher=true;mi.range=8;mi.attackCd=0;
  f.Game.coop.withWorld(wild,()=>mi.update(1/30,p,wild.map));assert.ok(wild._delayed.length>=2,'a companion attack release is queued');

  await travel(f,'guest','frosthaven');
  assert.equal(p.buffs.find(b=>b.id==='transfer_buff').until,15);
  assert.equal(p.skillCd.test,13);assert.equal(p.tempoUntil,11);assert.equal(mi.buffUntil,12);
  assert.equal(p.hp,hp);assert.equal(p.mana,mana);assert.equal(p.inv,inv);
  assert.ok(town.minions.includes(mi));assert.equal(wild.minions.length,0);
  await travel(f,'host','north_wild');wild.monsters=[];
  for(let i=0;i<10;i++)f.runtime.tick(1/30);
  assert.equal(delayed,false,'old skill callbacks cannot fire in another area');assert.equal(wild.projectiles.length,0,'transferred companions cannot release attacks into their former world');
});

test('personal portals, individual death penalties, and revival stay area scoped',async()=>{
  const f=await session();await travel(f,'guest','north_wild');
  const p=f.runtime.players.get('guest'),host=f.runtime.players.get('host'),wild=f.runtime.worlds.get('north_wild');wild.monsters=[];
  await command(f,'guest',{type:'portal'});
  await command(f,'host',{type:'usePortal'});assert.equal(f.messages.at(-1).payload.ok,false);
  await command(f,'guest',{type:'usePortal'});
  await f.runtime.receive('guest',{kind:'worldReady',id:prepared(f,'guest').id,ok:true});assert.equal(p.worldId,'frosthaven');
  await command(f,'guest',{type:'usePortal'});
  await f.runtime.receive('guest',{kind:'worldReady',id:prepared(f,'guest').id,ok:true});assert.equal(p.worldId,'north_wild');
  p.gold=100;f.runtime.died(p);f.runtime.died(p);assert.equal(p.gold,90);
  await command(f,'host',{type:'revive',targetId:'guest'});assert.equal(f.messages.at(-1).payload.ok,false);
  await command(f,'guest',{type:'respawn'});
  await f.runtime.receive('guest',{kind:'worldReady',id:prepared(f,'guest').id,ok:true});
  assert.equal(p.worldId,'frosthaven');assert.equal(p.dead,false);assert.equal(p.gold,90);assert.equal(host.worldId,'frosthaven');
});

test('occupied disconnected worlds keep ticking, background pauses and dormant clocks are retained',async()=>{
  const f=await session();await travel(f,'guest','north_wild');const wild=f.runtime.worlds.get('north_wild');wild.monsters=[];
  f.runtime.roster([{id:'host',connected:true},{id:'guest',connected:false}]);
  f.runtime.tick(1/30);assert.ok(wild.time>0);
  const time=wild.time;f.runtime.setStatus({hidden:true});f.runtime.tick(1/30);assert.equal(wild.time,time);
  f.runtime.setStatus({hidden:false});await f.runtime.depart('guest');
  for(let i=0;i<100;i++)f.runtime.tick(1/30);assert.equal(wild.time,time);
  await travel(f,'host','north_wild');f.runtime.tick(1/30);assert.ok(Math.abs(wild.time-time-1/30)<1e-8);
});

test('four worlds share the full Act I campaign, area cinematics, reward ledger and migrated saves',async()=>{
  const f=await session();
  await f.runtime.receive('third',{kind:'hero',hero:f.hero('Third','gravebinder')});
  await f.runtime.receive('fourth',{kind:'hero',hero:f.hero('Fourth','wildkeeper')});
  const town=f.runtime.worlds.get('frosthaven'),host=f.runtime.players.get('host');
  for(const p of f.runtime.players.values()){p.attr.vit=1000;p.computeStats();p.hp=p.stats.maxHp;}
  await travel(f,'guest','north_wild');
  await travel(f,'third','north_wild');await travel(f,'third','mines');
  await travel(f,'fourth','north_wild');await travel(f,'fourth','shardpeak_shrine');
  assert.equal(new Set([...f.runtime.players.values()].map(p=>p.worldId)).size,4);
  const wild=f.runtime.worlds.get('north_wild'),mines=f.runtime.worlds.get('mines');
  f.Game.coop.withWorld(wild,()=>{for(const m of wild.monsters.filter(m=>!m.dead&&!m.isBoss).slice(0,8))m.die(wild.players[0]);});
  assert.equal(town.quests.q7.state,'reward');
  async function quest(id,complete=false){
    const q=f.DATA.QUESTS.find(q=>q.id===id),giver=town.npcs.find(n=>n.id===q.giver);
    assert.ok(giver,'giver '+q.giver+' exists');Object.assign(host,{x:giver.x,y:giver.y,surfaceId:giver.surfaceId||0});
    await command(f,'host',{type:complete?'completeQuest':'acceptQuest',questId:id});
    assert.equal(f.messages.at(-1).payload.ok,true,(complete?'complete ':'accept ')+id);
  }
  await quest('q7',true);await quest('q8');
  for(const n of mines.npcs.filter(n=>n.survivor)){
    Object.assign(mines.players[0],{x:n.x,y:n.y,surfaceId:n.surfaceId||0});
    await command(f,'third',{type:'interact',targetId:n._coopId});
  }
  assert.equal(town.quests.q8.state,'reward');await quest('q8',true);await quest('q8b');
  assert.equal(wild.monsters.filter(m=>m.beacon&&!m.dead).length,3,'accepting in town updates the occupied wilds');
  f.Game.coop.withWorld(wild,()=>{for(const m of wild.monsters.filter(m=>m.beacon&&!m.dead))m.die(wild.players[0]);});
  for(let i=0;i<20;i++)f.runtime.tick(1/30);
  assert.ok(wild._cinematic,'Oathsworn cinematic has an area callback');
  const at=wild.time,elsewhere=mines.time;
  f.runtime.tick(1/30);assert.equal(wild.time,at);assert.ok(mines.time>elsewhere);
  await f.runtime.receive('guest',{kind:'cinematicDone',id:wild._cinematic.id});
  const trio=wild.monsters.filter(m=>['barb_axe','barb_pole','barb_sword'].includes(m.defId)&&!m.dead);
  assert.equal(trio.length,3);f.Game.coop.withWorld(wild,()=>trio.forEach(m=>m.die(wild.players[0])));
  assert.ok(town.flags.fn_temple_open);await quest('q8b',true);await quest('q9');
  await travel(f,'guest','shattered_temple');const temple=f.runtime.worlds.get('shattered_temple');
  f.Game.coop.withWorld(temple,()=>{const boss=temple.monsters.find(m=>m.defId==='korvath'),p=temple.players[0];p.x=boss.x+1;p.y=boss.y;boss.takeDamage(1e8,p,{},'phys');});
  assert.equal(town.quests.q9.state,'reward');await quest('q9',true);
  assert.equal(town.quests.q9.coopRewarded.length,4);
  assert.ok(town.flags.coopComplete);const gold=[...f.runtime.players.values()].map(p=>p.gold);
  await command(f,'host',{type:'completeQuest',questId:'q9'});assert.equal(f.messages.at(-1).payload.ok,false);
  assert.deepEqual([...f.runtime.players.values()].map(p=>p.gold),gold);
  await f.runtime.checkpoint();const saved=structuredClone(f.saves.at(-1).campaign);delete saved.schemaVersion;
  const restored=fixture();await restored.runtime.start({hostId:'resumed',hero:f.hero('Host'),campaign:saved});
  assert.equal(restored.runtime.players.get('resumed').worldId,'frosthaven');
  assert.equal(restored.runtime.worlds.get('frosthaven').quests.q9.coopRewarded.length,4);
  assert.ok(restored.saves.at(-1).campaign.schemaVersion===2);
});

test('admission during host transfer or boss combat never pauses another occupied world',async()=>{
  const f=await session();await travel(f,'guest','north_wild');
  const host=f.runtime.players.get('host'),town=f.runtime.worlds.get('frosthaven'),wild=f.runtime.worlds.get('north_wild'),exit=town.map.exits.find(e=>e.target==='north_wild');
  Object.assign(host,{x:(exit.x0+exit.x1)/2,y:(exit.y0+exit.y1)/2});
  await command(f,'host',{type:'travel',zone:'north_wild'});const transfer=prepared(f,'host');
  let release;f.context.saveRecords=()=>new Promise(resolve=>release=resolve);
  const admission=f.runtime.receive('third',{kind:'hero',hero:f.hero('Third')});
  await new Promise(r=>setImmediate(r));const at=wild.time;
  for(let i=0;i<10;i++)f.runtime.tick(1/30);assert.ok(wild.time>at);assert.equal(host.worldId,'frosthaven');
  release();await admission;f.context.saveRecords=async()=>{};
  await f.runtime.receive('host',{kind:'worldReady',id:transfer.id,ok:true});assert.equal(host.worldId,'north_wild');
  const Monster=require('node:vm').runInContext('Monster',f.context),boss=f.Game.coop.withWorld(wild,()=>new Monster('korvath',host.x+5,host.y));wild.monsters.push(boss);boss.encounter.active=true;
  await f.runtime.receive('fourth',{kind:'hero',hero:f.hero('Fourth')});
  assert.equal(f.runtime.players.get('fourth').worldId,'frosthaven');assert.equal(f.runtime.players.size,4);
  const guest=f.runtime.players.get('guest');f.runtime.died(guest);
  await command(f,'guest',{type:'respawn'});await f.runtime.receive('guest',{kind:'worldReady',id:prepared(f,'guest').id,ok:true});
  assert.equal(guest.worldId,'frosthaven');assert.equal(guest.dead,false);assert.equal(host.worldId,'north_wild');
});

test('departed participants receive a saved quest reward once on readmission',async()=>{
  const f=await session(),town=f.runtime.worlds.get('frosthaven'),host=f.runtime.players.get('host'),guest=f.runtime.players.get('guest'),hero=f.hero('Guest','veilranger');
  f.runtime.trackParticipants();const gold=guest.gold;await f.runtime.depart('guest');
  town.quests.q7.state='reward';const q=f.DATA.QUESTS.find(q=>q.id==='q7'),giver=town.npcs.find(n=>n.id===q.giver);
  Object.assign(host,{x:giver.x,y:giver.y});await command(f,'host',{type:'completeQuest',questId:'q7'});assert.equal(f.messages.at(-1).payload.ok,true);
  await f.runtime.receive('returned',{kind:'hero',hero});const rewarded=f.runtime.players.get('returned').gold;assert.ok(rewarded>gold);
  await f.runtime.depart('returned');await f.runtime.receive('again',{kind:'hero',hero});assert.equal(f.runtime.players.get('again').gold,rewarded);
});

test('shared quest commits stage rewards while other areas keep combat and progression on save failure',async()=>{
  const f=await session();await travel(f,'guest','north_wild');
  const town=f.runtime.worlds.get('frosthaven'),wild=f.runtime.worlds.get('north_wild'),host=f.runtime.players.get('host'),guest=f.runtime.players.get('guest');
  guest.lvl=100;guest.computeStats();guest.hp=guest.stats.maxHp;guest.command=guest.path=null;
  f.runtime.trackParticipants();town.quests.q7.state='reward';const giver=town.npcs.find(n=>n.id===f.DATA.QUESTS.find(q=>q.id==='q7').giver);Object.assign(host,{x:giver.x,y:giver.y});
  const gold=guest.gold,enemy=wild.monsters.find(m=>!m.dead&&!m.isBoss);wild.monsters=[enemy];
  let reject;f.context.saveRecords=()=>new Promise((resolve,no)=>reject=no);
  const failed=command(f,'host',{type:'completeQuest',questId:'q7'});await new Promise(r=>setImmediate(r));
  assert.equal(guest.gold,gold,'uncommitted rewards are not live');assert.equal(wild.quests.q7.state,'reward');
  const at=wild.time;f.Game.coop.withWorld(wild,()=>enemy.die(guest));wild.flags.concurrentDiscovery=true;
  for(let i=0;i<15;i++)f.runtime.tick(1/30);assert.ok(wild.time>at);const hp=guest.hp,xp=guest.xp;
  reject(Error('Disk failure'));await failed;
  assert.equal(enemy.dead,true);assert.equal(guest.hp,hp);assert.equal(guest.xp,xp);assert.equal(guest.gold,gold);assert.ok(wild.flags.concurrentDiscovery);assert.equal(town.quests.q7.state,'reward');
  f.context.saveRecords=async()=>{};await f.runtime.retrySave();
  let release;f.context.saveRecords=()=>new Promise(resolve=>release=resolve);
  const success=command(f,'host',{type:'completeQuest',questId:'q7'});await new Promise(r=>setImmediate(r));
  assert.equal(guest.gold,gold);guest.hp-=7;const hurt=guest.hp;wild.flags.secondDiscovery=true;
  release();await success;
  assert.ok(guest.gold>gold);assert.equal(guest.hp,hurt,'committing rewards does not restore old health');assert.ok(wild.flags.secondDiscovery);assert.equal(wild.quests.q7.state,'done');
});

test('broken prop collision replicates as a cell patch and survives campaign recovery',async()=>{
  const f=await session();await travel(f,'guest','north_wild');const w=f.runtime.worlds.get('north_wild'),p=w.players[0],vm=require('node:vm'),R=vm.runInContext('CoopReplication',f.context),props=vm.runInContext('PropInteractions',f.context);
  const prop=w.map.props.find(pr=>pr.blocks&&(pr.surfaceId||0)===0&&!pr.footprint);assert.ok(prop);const index=(prop.x|0)+(prop.y|0)*w.map.w;w.map.walls[index]=0;w.map.blocked[index]=1;
  const before=f.Game.coop.withWorld(w,()=>f.CoopCodec.snapshot(w,1,1,true,p._coopId));
  const display={...w,...Object.fromEntries(f.CoopCodec.groups.map(k=>[k,[]])),map:{...w.map,props:[],blocked:w.map.blocked.slice(),walls:w.map.walls.slice(),hazard:w.map.hazard.slice()}};
  f.CoopCodec.apply(display,before,p._coopId);assert.equal(display.map.blocked[index],1);
  f.Game.coop.withWorld(w,()=>props.freeTile(w.map,prop));
  const after=f.Game.coop.withWorld(w,()=>f.CoopCodec.snapshot(w,1,2,false,p._coopId)),delta=R.diff(before,after);
  assert.equal(Object.keys(delta.terrainEdits).length,1);assert.equal(delta.terrain,undefined);
  f.CoopCodec.apply(display,R.merge(before,delta),p._coopId,delta);assert.equal(display.map.blocked[index],0);
  await f.runtime.checkpoint();const restored=fixture();await restored.runtime.start({hostId:'resumed',hero:f.hero('Host'),campaign:structuredClone(f.saves.at(-1).campaign)});
  assert.equal(restored.runtime.worlds.get('north_wild').map.blocked[index],0);
});
