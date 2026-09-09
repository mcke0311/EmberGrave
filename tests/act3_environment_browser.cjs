const {chromium}=require('playwright');
const fs=require('node:fs');
const out='tests/qa/act3_environment';fs.mkdirSync(out,{recursive:true});
const zones=['khalcamp','desert_wastes','underground_market','sand_tombs','khal_palace','shard_flats','tomb_sanctum'];
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding']});
 const page=await browser.newPage({viewport:{width:1920,height:1280},deviceScaleFactor:1}),errors=[],captures=[],runs=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  if(process.argv.includes('--pixels')){
   await page.goto('http://127.0.0.1:8743/tests/act3_environment_pixels.html',{timeout:90000});
   await page.waitForFunction(()=>['passed','failed'].includes(document.body.dataset.testStatus),null,{timeout:240000});
   const report=await page.evaluate(()=>window.environmentResult||{status:'FAIL',error:document.getElementById('result').textContent});
   fs.writeFileSync(out+'/pixels.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));if(report.status!=='PASS')throw Error(report.error);return;
  }
  await page.goto('http://127.0.0.1:8743/tests/act3_environment_review.html?zone='+ (process.env.ACT3_ZONE||'underground_market'),{timeout:90000});
  await page.waitForFunction(()=>document.body.dataset.testStatus==='passed'||document.body.dataset.testStatus==='failed',null,{timeout:180000});
  if(await page.locator('#error').innerText())throw Error(await page.locator('#error').innerText());
  const selected=process.env.ACT3_ZONE?[process.env.ACT3_ZONE]:zones;
  if(process.argv.includes('--walk')){
   const walks=[],portals=[];
   for(const zone of selected){
    await page.evaluate(zone=>act3CombatReview.load('after',zone),zone);
    const count=await page.evaluate(()=>act3CombatReview.map.exits.length);
    for(let index=0;index<count;index++){
     await page.evaluate(zone=>act3CombatReview.load('after',zone),zone);
     const walk=await page.evaluate(async index=>{
      const r=act3CombatReview,g=r.game,m=g.state.map,ex=m.exits[index],t=m.thresholds.find(t=>t.id===ex.thresholdId),p=g.state.player;
      g.state.monsters=[];g.state.minions=[];g.__act3.place(m.spawns.default.x,m.spawns.default.y);
      const companion=new r.api.Minion('environment_review',{hp:200,dmg:[1,2],speed:6,atkRate:1,range:1,sprite:'golem'},p);
      companion.x=p.x;companion.y=p.y;companion.path=r.api.TerrainNavigation.findPath(m,companion,t.approach,{radius:companion.radius,speed:6,hop:false});
      if(!companion.path)throw Error('No companion passage route');
      for(let frame=0;frame<12000&&companion.path?.length;frame++)companion.moveAlong(1/30,6,m,[]);
      if(Math.hypot(companion.x-t.approach.x,companion.y-t.approach.y)>.8)throw Error('Companion stalled');
      g.__act3.clickWorld(t.opening.x,t.opening.y);
      if(g.state.map===m&&(p.command?.type!=='interact'||typeof p.command.run!=='function'||p.command.obj.x!==t.approach.x||p.command.obj.y!==t.approach.y))throw Error('Passage click was intercepted by scenery: '+m.id+'/'+ex.target);
      let frames=0;
      while(g.state.map===m&&frames++<15000){g.__act3.update(1/30);if(frames%30===0)await new Promise(resolve=>setTimeout(resolve,0));}
      for(let k=0;k<500&&g.state.map===m;k++)await new Promise(resolve=>setTimeout(resolve,10));
      if(g.state.map.id!==ex.target)throw Error('Travel did not reach '+ex.target);
      const arrival=g.state.map.spawns[ex.spawnKey];
      if(!r.api.TerrainSurface.supported(g.state.map,p.x,p.y,.36))throw Error('Unsupported destination arrival');
      return {from:m.id,to:ex.target,frames,companion:true,arrivalKey:ex.spawnKey,arrivalDistance:Math.hypot(p.x-arrival.x,p.y-arrival.y)};
     },index);
     walks.push(walk);console.log('Walked',walk.from,'→',walk.to);
    }
    if(zone!=='khalcamp'){
     await page.evaluate(zone=>act3CombatReview.load('after',zone),zone);
     const portal=await page.evaluate(async()=>{
      const g=act3CombatReview.game,m=g.state.map,p=g.state.player,point={x:p.x,y:p.y};g.state.monsters=[];
      if(!g.castPortal()||!await g.usePortal())throw Error('Portal departure failed');
      const home=g.state.map.id;if(!await g.usePortal()||g.state.map!==m||Math.hypot(p.x-point.x,p.y-point.y)>.01)throw Error('Portal return lost the map or position');
      return {zone:m.id,home,exactMap:true,exactPosition:true};
     });portals.push(portal);
    }
   }
   fs.writeFileSync(out+'/walks.json',JSON.stringify({status:'PASS',walks,portals,errors},null,2));return;
  }
  for(const width of process.argv.includes('--quick')?[1920]:[1920,3840])for(const zone of selected){
   await page.selectOption('#width',String(width));await page.evaluate(()=>dispatchEvent(new Event('resize')));
   for(const pair of process.argv.includes('--perf-only')?[0,1]:[0])for(const version of process.argv.includes('--quick')||process.argv.includes('--after-only')?['after']:pair%2?['after','environment_before']:['environment_before','after']){
    await page.evaluate(({version,zone})=>act3CombatReview.load(version,zone),{version,zone});
    const views=await page.evaluate(()=>['arrival',...act3CombatReview.map.act3.landmarks.map(n=>n.id),...act3CombatReview.map.exits.map((_,i)=>'passage_'+i)]);
    for(const view of process.argv.includes('--perf-only')?[]:process.argv.includes('--quick')?['arrival','passage_0']:views){
     const image=await page.evaluate(view=>{
      const r=act3CombatReview,m=r.map;
      const ex=view.startsWith('passage_')?m.exits[+view.split('_')[1]]:null;
      const th=ex&&m.thresholds?.find(t=>t.id===ex.thresholdId);
      const p=ex?(th?.approach||{x:(ex.x0+ex.x1)/2+2,y:(ex.y0+ex.y1)/2+2}):view==='arrival'?m.spawns.default:m.act3.landmarks.find(n=>n.id===view);
      r.game.__act3.place(p.x,p.y);r.render();
      return r.win.document.getElementById('view').toDataURL('image/webp',.94);
     },view);
     const name=`${zone}_${width}_${version}_${view}.webp`;fs.writeFileSync(out+'/'+name,Buffer.from(image.split(',')[1],'base64'));captures.push(name);
    }
    console.log('Captured',zone,width,version);
    if(process.argv.includes('--performance')||process.argv.includes('--perf-only'))for(const mode of zone==='khalcamp'?['moving']:['moving','combat']){
     await page.evaluate(({version,zone})=>act3CombatReview.load(version,zone),{version,zone});
     const sample=await page.evaluate(mode=>act3CombatReview.sample(mode),mode);runs.push({width,zone,version,pair,...sample});
     console.log('Profiled',zone,width,version,mode,JSON.stringify(sample.cpuMs));
     fs.writeFileSync(out+'/performance_raw.json',JSON.stringify({runs,errors},null,2));
    }
   }
  }
  const result={status:errors.length?'FAIL':'PASS',captures,errors,runs};fs.writeFileSync(out+(process.argv.includes('--perf-only')?'/performance_browser.json':'/browser.json'),JSON.stringify(result,null,2));
  if(runs.length){
   const mean=values=>values.reduce((n,v)=>n+v,0)/values.length;
   const comparisons=[];
   for(const zone of selected)for(const width of [1920,3840])for(const mode of zone==='khalcamp'?['moving']:['moving','combat']){
    const a=runs.filter(r=>r.zone===zone&&r.width===width&&r.mode===mode&&r.version==='after'),b=runs.filter(r=>r.zone===zone&&r.width===width&&r.mode===mode&&r.version==='environment_before');
    if(!a.length||!b.length)continue;
    const before={median:mean(b.map(r=>r.cpuMs.median)),p95:mean(b.map(r=>r.cpuMs.p95))},after={median:mean(a.map(r=>r.cpuMs.median)),p95:mean(a.map(r=>r.cpuMs.p95))};
    const medianPct=(after.median/before.median-1)*100,p95Pct=(after.p95/before.p95-1)*100;
    comparisons.push({zone,width,mode,pairs:a.length,before,after,medianPct,p95Pct,withinTarget:medianPct<=10&&p95Pct<=10});
   }
   fs.writeFileSync(out+'/performance.json',JSON.stringify({status:comparisons.every(r=>r.withinTarget)?'PASS':'INVESTIGATE',comparisons,errors},null,2));
  }
  if(errors.length)throw Error(errors.join('\n'));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
