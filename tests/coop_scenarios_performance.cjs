// Repeatable authority/serialization measurements, not physical-device FPS claims.
const {fixture}=require('./coop_runtime_fixture.cjs');
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const summary=samples=>{const a=samples.slice().sort((a,b)=>a-b);return {samples:a.length,mean:a.reduce((a,b)=>a+b,0)/a.length,p95:a[Math.floor(a.length*.95)],max:a.at(-1)};};
const output=[];let fieldBytes={};
async function travel(f,id,zone){
  const p=f.runtime.players.get(id),w=f.runtime.worlds.get(p.worldId),e=w.map.exits.find(e=>e.target===zone);
  assert.ok(e,'exit '+w.worldId+' -> '+zone);Object.assign(p,{x:(e.x0+e.x1)/2,y:(e.y0+e.y1)/2,surfaceId:e.surfaceId||0});
  await f.runtime.receive(id,{kind:'command',seq:p.testSeq=(p.testSeq||0)+1,worldId:p.worldId,generation:p.travelGeneration,command:{type:'travel',zone}});
  const ticket=f.messages.findLast(m=>(m.to===id||id==='host'&&m.type==='local')&&m.payload?.kind==='prepareWorld').payload;
  await f.runtime.receive(id,{kind:'worldReady',id:ticket.id,ok:true});assert.equal(p.worldId,zone);
}
async function drain(f){
  let bytes=0;
  for(const m of f.messages.splice(0)){
    if(m.payload)bytes+=Buffer.byteLength(JSON.stringify(m.payload));
    if(m.payload?.kind==='delta')for(const [group,change]of Object.entries(m.payload.groups))for(const row of change.rows)for(const [key,value]of Object.entries(row)){const name=group+'.'+key;fieldBytes[name]=(fieldBytes[name]||0)+Buffer.byteLength(JSON.stringify(value));}
    if(['snapshot','delta'].includes(m.payload?.kind))await f.runtime.receive(m.to||'host',{kind:'snapshotAck',seq:m.payload.seq});
    if(m.payload?.type==='cinematic')await f.runtime.receive(m.to||'host',{kind:'cinematicDone',id:m.payload.id});
  }
  return bytes;
}
(async()=>{
  for(const count of [2,4])for(const scenario of ['town','movement','dense-combat','summons','joining','separate-areas']){
    const f=fixture();vm.runInContext('Math.random=U.rng(7331)',f.context);
    await f.runtime.start({hostId:'host',hero:f.hero('Host'),seed:123});
    const join=async i=>f.runtime.receive('guest'+i,{kind:'hero',hero:f.hero('Guest'+i,['vanguard','veilranger','gravebinder','wildkeeper'][i])});
    for(let i=1;i<count-(scenario==='joining'?1:0);i++)await join(i);
    if(!['town','joining'].includes(scenario))for(const p of f.runtime.players.values())await travel(f,p._coopId,'north_wild');
    if(scenario==='separate-areas'){
      await travel(f,'guest1','mines');
      if(count===4){await travel(f,'guest2','shardpeak_shrine');await travel(f,'guest3','deepfreeze_cavern');}
    }
    if(['dense-combat','summons'].includes(scenario)){
      const w=f.runtime.worlds.get('north_wild'),p=w.players[0];
      f.Game.coop.withWorld(w,()=>{
        w.monsters=[];
        const Monster=vm.runInContext('Monster',f.context);
        for(let i=0;i<32;i++){const m=new Monster(i%2?'frost_archer':'frost_risen',p.x+Math.cos(i)*3,p.y+Math.sin(i)*3);m.hp=m.maxHp=100000;m._coopScaled=true;m.aggro=true;w.monsters.push(m);}
        if(scenario==='summons')for(const owner of w.players)for(let i=0;i<4;i++)w.minions.push(new f.Minion('skeleton',{hp:10000,dmg:[1,2],speed:4,atkRate:1.2,range:1},owner));
        f.CoopCodec.register(w);
      });
    }
    for(const p of f.runtime.players.values()){p.attr.vit=10000;p.computeStats();p.hp=p.stats.maxHp;p.anchor={x:p.x,y:p.y};}
    for(let i=0;i<60;i++){f.runtime.tick(1/30);await drain(f);}
    f.runtime.metrics.simulationSamples=[];f.runtime.metrics.snapshotSamples=[];f.runtime.metrics.saveSamples=[];f.runtime.metrics.saveCaptureSamples=[];
    let bytes=0,joinMs=null;fieldBytes={};
    for(let frame=0;frame<180;frame++){
      if(scenario==='joining'&&frame===60){const start=performance.now();await join(count-1);joinMs=performance.now()-start;}
      if(scenario==='movement')for(const p of f.runtime.players.values())p.command={type:'steer',point:{x:p.anchor.x+Math.cos(frame/20)*2,y:p.anchor.y+Math.sin(frame/20)*2}};
      f.runtime.tick(1/30);bytes+=await drain(f);
    }
    const report={players:count,scenario,seed:123,warmupSeconds:2,seconds:6,allRecipientsBytes:bytes,joinMs,
      largestFields:Object.fromEntries(Object.entries(fieldBytes).sort((a,b)=>b[1]-a[1]).slice(0,8)),simulationMs:summary(f.runtime.metrics.simulationSamples),snapshotMs:summary(f.runtime.metrics.snapshotSamples),saveMs:summary(f.runtime.metrics.saveSamples),saveCaptureMs:summary(f.runtime.metrics.saveCaptureSamples),maxPendingCommands:f.runtime.metrics.maxPendingCommands};
    assert.ok(report.maxPendingCommands<=128);output.push(report);console.log(JSON.stringify(report));
  }
  fs.mkdirSync('tmp/coop-qa',{recursive:true});fs.writeFileSync('tmp/coop-qa/scenarios-performance.json',JSON.stringify(output,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
