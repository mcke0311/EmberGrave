const {fixture}=require('./coop_runtime_fixture.cjs');
const vm=require('node:vm'),fs=require('node:fs');
const assert=require('node:assert/strict');
(async()=>{
  const baseline=fs.readFileSync('tests/fixtures/coop_codec_baseline.js','utf8').replace('const CoopCodec=','const BaselineCodec=');
  const baselineDiff=(before,after)=>{
    const changes={kind:'delta',epoch:after.epoch,zone:after.zone,seq:after.seq,base:before.seq,time:after.time,groups:{}};
    for(const key of Object.keys(after.groups)){
      const previous=new Map(before.groups[key].map(row=>[row._coopId,row])),rows=[];
      for(const row of after.groups[key]){const old=previous.get(row._coopId),fields={_coopId:row._coopId};for(const [k,v]of Object.entries(row))if(!old||JSON.stringify(old[k])!==JSON.stringify(v))fields[k]=v;
        if(old)for(const k of Object.keys(old))if(!(k in row))fields[k]=null;if(Object.keys(fields).length>1)rows.push(fields);previous.delete(row._coopId);}
      changes.groups[key]={rows,removed:[...previous.keys()]};
    }
    for(const key of ['props','campaign','vendorStock'])if(JSON.stringify(before[key])!==JSON.stringify(after[key]))changes[key]=after[key];return changes;
  };
  const results=[];
  for(const count of [2,4]){
    const f=fixture();vm.runInContext('Math.random=U.rng(7331)',f.context);
    vm.runInContext(baseline,f.context);const old=vm.runInContext('BaselineCodec',f.context),diff=vm.runInContext('CoopReplication.diff',f.context);
    await f.runtime.start({hostId:'host',hero:f.hero('Host'),seed:123});
    for(let i=1;i<count;i++)await f.runtime.receive('guest'+i,{kind:'hero',hero:f.hero('Guest'+i,['vanguard','veilranger','gravebinder','wildkeeper'][i])});
    for(const p of f.runtime.players.values()){
      const w=f.runtime.worlds.get(p.worldId),e=w.map.exits.find(e=>e.target==='north_wild');p.x=(e.x0+e.x1)/2;p.y=(e.y0+e.y1)/2;
      await f.runtime.receive(p._coopId,{kind:'command',worldId:p.worldId,generation:1,seq:1,command:{type:'travel',zone:'north_wild'}});
      const offer=f.messages.filter(m=>(m.to===p._coopId||p._coopId==='host'&&m.type==='local')&&m.payload?.kind==='prepareWorld').at(-1).payload;
      await f.runtime.receive(p._coopId,{kind:'worldReady',id:offer.id,ok:true});
      p.hp=p.stats.maxHp=100000;
    }
    const w=f.runtime.worlds.get('north_wild'),center={x:w.players[0].x,y:w.players[0].y};
    for(let frame=0;frame<60;frame++){f.runtime.tick(1/30);for(const m of f.messages.splice(0))if(['snapshot','delta'].includes(m.payload?.kind))await f.runtime.receive(m.to||'host',{kind:'snapshotAck',seq:m.payload.seq});}
    let previousOld,previousNew,oldBytes=0,newBytes=0,oldCost=0,newCost=0,samples=0;
    for(let frame=0;frame<240;frame++){
      for(const p of w.players)p.command={type:'steer',point:{x:center.x+Math.cos(frame/25)*2,y:center.y+Math.sin(frame/25)*2}};
      f.runtime.tick(1/30);
      for(const m of f.messages.splice(0))if(['snapshot','delta'].includes(m.payload?.kind))await f.runtime.receive(m.to||'host',{kind:'snapshotAck',seq:m.payload.seq});
      if(frame%2)continue;
      let t=performance.now();const a=f.Game.coop.withWorld(w,()=>old.snapshot(w,1,frame,false));const pa=previousOld?baselineDiff(previousOld,a):null;oldCost+=performance.now()-t;
      t=performance.now();const b=f.Game.coop.withWorld(w,()=>f.CoopCodec.snapshot(w,1,frame,false,w.players[0]._coopId,22));b.party=f.runtime.party();const pb=previousNew?diff(previousNew,b):null;newCost+=performance.now()-t;
      if(pa){oldBytes+=Buffer.byteLength(JSON.stringify(pa));newBytes+=Buffer.byteLength(JSON.stringify(pb));samples++;}
      previousOld=a;previousNew=b;
    }
    const reduction=1-newBytes/oldBytes,result={players:count,seed:123,warmupSeconds:2,seconds:8,samples,baselineBytes:oldBytes,currentBytes:newBytes,reductionPercent:100*reduction,baselineEncodeDiffMs:oldCost,currentEncodeDiffMs:newCost};
    console.log(JSON.stringify(result));assert.ok(reduction>=.7,'movement traffic reduction must reach 70%');results.push(result);
  }
  fs.mkdirSync('tmp/coop-qa',{recursive:true});fs.writeFileSync('tmp/coop-qa/replication-performance.json',JSON.stringify(results,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
