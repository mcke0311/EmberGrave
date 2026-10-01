const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const {fixture}=require('./coop_runtime_fixture.cjs');
async function session(){
  const f=fixture();Object.assign(f,vm.runInContext('({Items,ForgeRecipes,CursedEvents,TacticalElites,Echoes,CombatCast,Monster,MapGen,U})',f.context));
  await f.runtime.start({hostId:'host',hero:f.hero('Host'),seed:123,echoesUnlocked:true});
  await f.runtime.receive('guest',{kind:'hero',hero:f.hero('Guest','veilranger')});
  f.scope=(w,fn)=>f.Game.coop.withWorld(w,fn);return f;
}
async function command(f,id,c){const p=f.runtime.players.get(id);return f.runtime.receive(id,{kind:'command',seq:p.testSeq=(p.testSeq||0)+1,worldId:p.worldId,generation:p.travelGeneration,command:c});}
const messages=(f,id,kind)=>f.messages.filter(m=>(m.to===id||id==='host'&&m.type==='local')&&m.payload?.kind===kind).map(m=>m.payload);
async function arrive(f,id){const ticket=messages(f,id,'prepareWorld').at(-1);assert.ok(ticket);await f.runtime.receive(id,{kind:'worldReady',id:ticket.id,ok:true});assert.equal(f.runtime.players.get(id).worldId,ticket.zone);}

test('precision reforging preserves other properties and persists its locked slot',async()=>{
  const f=await session(),p=f.runtime.players.get('host'),w=f.runtime.worlds.get('frosthaven');
  f.scope(w,()=>{
    const it=f.Items.rollGear(40,'rare',{slot:'chest'});it.identified=true;
    const index=it.affixes.findIndex((a,i)=>f.Items.precisionPool(it,i).length);assert.ok(index>=0);
    const before=JSON.stringify(it.affixes.filter((_,i)=>i!==index)),cost=f.Items.precisionCost(it);
    assert.equal(f.Items.precisionReforge(it,index),true);
    assert.equal(JSON.stringify(it.affixes.filter((_,i)=>i!==index)),before);
    assert.ok(f.Items.precisionCost(it)>cost);
    assert.equal(f.Items.precisionReforge(it,(index+1)%it.affixes.length),false);
    const restored=f.Game.reviveItem(f.Game.serializeItem(it));assert.deepEqual(restored.precision,it.precision);
    assert.equal(f.Items.precisionReforge(restored,index),true);assert.equal(restored.precision.rolls,2);
  });
  const forge=w.map.props.find(o=>o.interact==='forge');assert.ok(forge);Object.assign(p,{x:forge.x,y:forge.y,gold:100000});
  const it=f.Items.rollGear(20,'rare',{slot:'head'});it.identified=true;
  const glyph=f.Items.makeGlyph(Object.keys(f.DATA.GLYPHS).find(k=>!f.DATA.GLYPHS[k].unique));
  p.inv.items=[];f.Items.autoPlace(p.inv,it);f.Items.autoPlace(p.inv,glyph);f.CoopCodec.register(w);
  const inventory=()=>JSON.stringify(f.CoopCodec.hero(p).inv);
  const index=it.affixes.findIndex((a,i)=>f.Items.precisionPool(it,i).length),saved=inventory(),gold=p.gold;
  f.context.saveRecords=async()=>{throw Error('Simulated disk failure');};
  await command(f,'host',{type:'craft',recipe:'precision',affixIndex:index,items:[it._coopId,glyph._coopId]});
  assert.equal(messages(f,'host','ack').at(-1).ok,false);assert.equal(p.gold,gold);assert.equal(inventory(),saved);
  f.context.saveRecords=(campaign,heroes)=>f.saves.push({campaign,heroes});await f.runtime.retrySave();
  await command(f,'host',{type:'craft',recipe:'precision',affixIndex:index,items:[it._coopId,glyph._coopId]});
  assert.equal(messages(f,'host','ack').at(-1).ok,true);assert.equal(p.inv.items.length,1);assert.equal(p.inv.items[0].precision.index,index);assert.ok(p.gold<gold);
  assert.equal(f.ForgeRecipes.evaluate([p.inv.items[0],glyph,glyph,glyph],'reweave').valid,false);
});

test('sealed caches require every defender, resume safely, and claim once',async()=>{
  const f=await session(),p=f.runtime.players.get('host'),w=f.runtime.worlds.get('north_wild');
  f.scope(w,()=>{
    const prop=w.map.props.find(f.CursedEvents.eligible)||{x:w.map.spawns.default.x,y:w.map.spawns.default.y,propId:'test-cache',interact:'event',ev:{kind:'curse',count:3,name:'Test seal'}};
    if(!w.map.props.includes(prop))w.map.props.push(prop);Object.assign(p,{x:prop.x,y:prop.y,surfaceId:prop.surfaceId||0});w.player=p;
    const gold=p.gold,count=p.inv.items.length;
    assert.equal(f.CursedEvents.start(w,prop,p),true);const key=prop.cursedKey,r=w.flags.cursedEvents[key];
    assert.equal(p.gold,gold);assert.equal(p.inv.items.length,count);assert.equal(f.CursedEvents.claim(w,prop,p),false);
    assert.equal(f.CursedEvents.start(w,prop,p),false);
    const guards=w.monsters.filter(m=>m.cursedKey===key);assert.equal(guards.length,3);
    guards[0].dead=true;f.CursedEvents.killed(w,guards[0],p);assert.equal(r.status,'active');
    guards[1].hp=Math.ceil(guards[1].maxHp*.4);f.CursedEvents.capture(w);const hp=guards[1].hp;
    w.monsters=w.monsters.filter(m=>m.cursedKey!==key);f.CursedEvents.restore(w);f.CursedEvents.restore(w);
    const remaining=w.monsters.filter(m=>m.cursedKey===key);assert.equal(remaining.length,2);assert.equal(remaining[0].hp,hp);
    for(const m of remaining){m.dead=true;f.CursedEvents.killed(w,m,p);}assert.equal(r.status,'ready');
    p.inv={w:0,h:0,items:[]};assert.equal(f.CursedEvents.claim(w,prop,p),false);assert.equal(r.status,'ready');
    p.inv=f.Items.makeGrid(10,8);assert.equal(f.CursedEvents.claim(w,prop,p),true);assert.ok(p.inv.items.length>0);
    const result=JSON.stringify(p.inv),after=p.gold;assert.equal(f.CursedEvents.claim(w,prop,p),false);f.CursedEvents.restore(w);
    assert.equal(JSON.stringify(p.inv),result);assert.equal(p.gold,after);assert.equal(r.status,'claimed');
  });
});

test('elite wards and soul links change damage only within their exact radii',async()=>{
  const f=await session(),w=f.runtime.worlds.get('north_wild');
  f.scope(w,()=>{
    const m=w.monsters.find(m=>!m.isBoss),n=w.monsters.find(n=>n!==m&&!n.isBoss);assert.ok(m&&n);
    Object.assign(m,{dead:false,x:10,y:10,surfaceId:0,packId:'a',soulPair:'pair'});Object.assign(n,{dead:false,x:13,y:10,surfaceId:0,packId:'a',soulPair:'pair',monsterFamily:m.monsterFamily});
    assert.equal(f.TacticalElites.multiplier(w,m),.65);n.x=14.01;assert.equal(f.TacticalElites.multiplier(w,m),1);
    delete m.soulPair;delete n.soulPair;n.tacticalBanner='banner';w.map.props.push({x:10,y:10,surfaceId:0,tacticalBanner:true,propId:'banner'});
    assert.equal(f.TacticalElites.multiplier(w,m),.65);m.x=15.01;assert.equal(f.TacticalElites.multiplier(w,m),1);
    m.x=10;w.map.props.at(-1).broken=true;assert.equal(f.TacticalElites.multiplier(w,m),1);
    w.map.props.at(-1).broken=false;n.dead=true;assert.equal(f.TacticalElites.multiplier(w,m),1);
    let pack;for(let i=0;i<100;i++){pack='soul-qa-'+i;if(f.U.hash(w.seed+':'+w.map.id+':'+pack)%4===1)break;}
    for(const mon of [m,n]){Object.assign(mon,{dead:false,elite:true,packId:pack,tactical:null,tacticalBanner:null,tacticalChecked:false});}
    w.monsters=[m,n];f.TacticalElites.setup(w);const pair=m.soulPair;assert.ok(pair);assert.equal(pair,n.soulPair);
    f.TacticalElites.setup(w);assert.equal(m.soulPair,pair);assert.equal(n.soulPair,pair);assert.equal(w.monsters.filter(m=>m.tactical==='soulbound').length,2);
  });
});

test('quick cast waits for recovery and cancels on stale input without speeding attacks',async()=>{
  const f=await session(),p=f.runtime.players.get('host'),w=f.runtime.worlds.get('frosthaven');
  f.scope(w,()=>{
    const id=Object.keys(f.DATA.SKILLS).find(id=>id.startsWith('vanguard')&&f.DATA.SKILLS[id].type!=='passive');p.skills[id]=1;
    let casts=0;p.performSkill=()=>{casts++;return true;};p.rejectSkillWeapon=()=>false;
    const point={x:p.x+1,y:p.y,surfaceId:p.surfaceId};p.action={dur:1,t:.5};
    assert.equal(f.CombatCast.request(p,id,point),false);p.action.t=.9;
    assert.equal(f.CombatCast.request(p,id,point),true);f.CombatCast.tick(p);assert.equal(casts,0);
    w.time+=.1;p.action=null;f.CombatCast.tick(p);assert.equal(casts,1);
    p.action={dur:1,t:.9};f.CombatCast.request(p,id,point);p._skillEpoch++;p.action=null;f.CombatCast.tick(p);assert.equal(casts,1);
    p.action={dur:1,t:.9};f.CombatCast.request(p,id,point);w.time+=.2;p.action=null;f.CombatCast.tick(p);assert.equal(casts,1);
  });
});

test('three Echo encounters, host authority, durable rewards and a fresh subsequent run',async()=>{
  const f=await session(),host=f.runtime.players.get('host'),guest=f.runtime.players.get('guest');
  host.inv=f.Items.makeGrid(10,8);guest.inv=f.Items.makeGrid(10,8);host.lvl=30;guest.lvl=2;
  await command(f,'guest',{type:'echoAction',action:'start',slot:'boots'});assert.equal(messages(f,'guest','ack').at(-1).ok,false);
  await command(f,'host',{type:'echoAction',action:'start',slot:'boots'});assert.equal(messages(f,'host','ack').at(-1).ok,true);
  for(let stage=0;stage<3;stage++){
    let w=f.runtime.worlds.get(host.worldId),r=w.flags.echoRun;assert.equal(r.cleared,stage);
    await command(f,'host',{type:'echoAction',action:'choose',curse:f.Echoes.choices(r)[0].id});assert.equal(messages(f,'host','ack').at(-1).ok,true);
    await arrive(f,'host');await arrive(f,'guest');w=f.runtime.worlds.get(host.worldId);
    assert.equal(w.map.id,f.Echoes.stages[stage][0]);assert.equal(w.monsters.filter(m=>m.isBoss&&!m.dead).length,1);assert.equal(f.runtime.echoReady(w),true);
    const boss=w.monsters.find(m=>m.isBoss&&!m.dead);assert.equal(boss.lvl,30+2*stage);
    f.scope(w,()=>{
      const e=boss.encounter,a=e.arena;
      for(const p of w.players)Object.assign(p,{x:a.cx+3,y:a.cy+2,hp:100000});
      e.update(.05,host,w.map);assert.ok(e.active&&a.sealed);
      const tick=seconds=>{for(let t=0;t<seconds;t+=.025){w.time+=.025;e.update(.025,host,w.map);}};
      if(stage===0){
        const d=a.devices.find(d=>d.arenaRole==='chargeTarget');
        Object.assign(host,{x:d.x-2.5,y:d.y});e.start('charge',host);host.y+=4;e.execute();tick(.72);
        assert.ok(d.cooldown>23&&e.stage==='recovery');assert.equal(e.recoveryDuration,3);
      }
      for(let phase=1;phase<e.config.phases.length;phase++){
        boss.takeDamage(1e9,host,{},'shadow');e.update(.025,host,w.map);
        assert.equal(e.phase,phase);assert.ok(!e.mechanic?.blocksDamage);
        if(stage===1){
          e.start('flood',host);assert.equal(e.attack.shapes.length,2);e.execute();
          e.start('grasp',host);e.execute();tick(.25);assert.ok(e.heartExposedUntil>w.time);
          const hp=boss.hp;boss.loseHealth(40);assert.equal(hp-boss.hp,50);
        }else if(stage===2){
          const souls=e.owned.filter(m=>!m.dead&&m.encounterKind==='boundSoul');assert.equal(souls.length,2);
          for(const soul of souls){assert.equal(soul.maxHp,Math.round(boss.maxHp*.03));soul.takeDamage(1e9,host,{},'shadow');}
          assert.ok(Math.abs(boss.def.armor-e.base.armor*(phase===1?.7:.4))<1e-6);
          assert.equal(e.recoveryDuration,3);
        }
      }
      boss.takeDamage(1e9,host,{},'shadow');assert.ok(boss.dead&&!a.sealed&&e.lifecycle==='victory');
    });
    r=w.flags.echoRun;assert.equal(r.phase,'reward');assert.equal(r.rewards.length,stage+1);assert.equal(host.inv.items.length,0);
    assert.equal(f.Game.reviveItem(r.rewards.at(-1)).slot,'boots');
    if(stage===0){
      await f.runtime.checkpoint();const saved=f.saves.at(-1).campaign,resumed=fixture();await resumed.runtime.start({hostId:'host',hero:saved.heroes[host.heroId],campaign:saved});
      const rr=resumed.runtime.worlds.get('frosthaven').flags.echoRun;assert.equal(rr.phase,'reward');assert.equal(rr.rewards.length,1);assert.equal(rr.cleared,1);
    }
  }
  const bonus=host.gold;await command(f,'host',{type:'echoAction',action:'claim'});assert.equal(messages(f,'host','ack').at(-1).ok,true);
  assert.equal(host.inv.items.length,3);assert.equal(host.gold-bonus,2250);assert.ok(f.runtime.worlds.get(host.worldId).flags.echoAwards[guest.heroId]);
  await arrive(f,'host');await arrive(f,'guest');await command(f,'guest',{type:'echoAction',action:'collect'});assert.equal(guest.inv.items.length,3);
  await command(f,'guest',{type:'echoAction',action:'collect'});assert.equal(messages(f,'guest','ack').at(-1).ok,false);assert.equal(guest.inv.items.length,3);
  await f.runtime.checkpoint();const campaign=f.saves.at(-1).campaign;
  const fresh=fixture();await fresh.runtime.start({hostId:'host',hero:campaign.heroes[host.heroId],campaign});
  assert.equal(fresh.runtime.players.get('host').inv.items.length,3);assert.equal(fresh.runtime.worlds.get('frosthaven').flags.echoRun.phase,'claimed');
  await command(f,'host',{type:'echoAction',action:'start',slot:'main'});await command(f,'host',{type:'echoAction',action:'choose',curse:'iron'});await arrive(f,'host');await arrive(f,'guest');
  const next=f.runtime.worlds.get('echo_north');assert.ok(next.monsters.some(m=>m.isBoss&&!m.dead));
  f.scope(next,()=>f.Echoes.fail(next));assert.equal(next.flags.echoRun.phase,'failed');assert.equal(next.flags.echoRun.rewards.length,0);
  guest.connected=false;await command(f,'host',{type:'echoAction',action:'return'});await arrive(f,'host');
  await command(f,'host',{type:'echoAction',action:'start',slot:'head'});
  assert.equal(guest.worldId,'frosthaven','An offline member cannot retain a deleted arena');
  assert.ok(f.runtime.worlds.get('frosthaven').players.includes(guest));
  guest.connected=true;await command(f,'host',{type:'echoAction',action:'choose',curse:'iron'});await arrive(f,'host');
  await command(f,'guest',{type:'echoAction',action:'resume'});assert.equal(messages(f,'guest','ack').at(-1).ok,false,'Late arrivals join the next expedition');
});

test('failed Echo persistence sends no travel tickets and restores the pending choice',async()=>{
  const f=await session();await command(f,'host',{type:'echoAction',action:'start',slot:'ring'});
  f.messages.length=0;f.context.saveRecords=async()=>{throw Error('Simulated disk failure');};
  await command(f,'host',{type:'echoAction',action:'choose',curse:'iron'});
  assert.equal(messages(f,'host','ack').at(-1).ok,false);assert.equal(messages(f,'host','prepareWorld').length,0);
  assert.equal(f.runtime.worlds.get('frosthaven').flags.echoRun.phase,'choice');assert.equal(f.runtime.players.get('host').worldId,'frosthaven');
});
