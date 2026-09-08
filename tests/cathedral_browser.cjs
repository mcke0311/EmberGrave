// Run with the bundled Playwright NODE_PATH and python tests/cathedral_server.py.
const {chromium}=require('playwright');
const fs=require('node:fs');
const mode=process.argv[2]||'capture';
const zones=['cathedral1','cathedral2','cathedral_cinderwatch','cathedral_bastion'];
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding']});
 const page=await browser.newPage({viewport:{width:1440,height:1100}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('http://127.0.0.1:8744/tests/cathedral_review.html',{waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForFunction(()=>['passed','failed'].includes(document.body.dataset.testStatus),null,{timeout:180000});
  const fatal=await page.locator('#error').innerText();if(fatal)throw Error(fatal);
  if(mode==='pixels'){
   await page.goto('http://127.0.0.1:8744/tests/cathedral_terrain_pixels.html',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>!!window.cathedralPixelReport,null,{timeout:120000});
   const report=await page.evaluate(()=>cathedralPixelReport);fs.writeFileSync('tests/qa/cathedral/terrain_pixels.json',JSON.stringify(report,null,2)+'\n');
   if(report.status!=='PASS')throw Error(report.error);console.log('PASS '+report.rows.length+' terrain pixel comparisons');
  }else if(mode==='capture'){
   const captures=[];
   for(const width of [1920,3840])for(const zone of zones){
    await page.evaluate(async({zone,width})=>{document.getElementById('width').value=width;await cathedralReview.load('after',zone);},{zone,width});
    const views=await page.locator('#view option').evaluateAll(os=>os.map(o=>o.value).filter(v=>v!=='center'));
    for(const view of views){await page.evaluate(async view=>{cathedralReview.showView(view);await cathedralReview.capture();},view);captures.push({width,zone,view});}
    console.log('Captured '+zone+' at '+width);
   }
   fs.writeFileSync('tests/qa/cathedral/captures.json',JSON.stringify({status:'PASS',captures,errors},null,2)+'\n');
  }else if(mode==='journey'){
   const report=await page.evaluate(async()=>{
    const R=cathedralReview,G=R.game,D=R.win.eval('DATA'),results=[];const ok=(v,m)=>{if(!v)throw Error(m);results.push(m);};
    for(const parent of ['cathedral1','cathedral2']){
     await G.enterMap(parent,'default');const original=G.state.map,child=parent==='cathedral1'?'cathedral_cinderwatch':'cathedral_bastion';
     const ex=original.exits.find(e=>e.target===child),roster=G.state.monsters;
     const objective=parent==='cathedral1'?'trapped_soul_0':'quieting_seal_0';
     D.CAMPAIGN.record(G.state,{kind:'interact',zone:parent,target:objective});G.__cathedral.syncStoryObjects();
     ok(original.props.some(p=>(p.soulBinding===objective||p.storyId===objective)&&p.completed),parent+' completed artwork follows original objective ledger');
     const ground={gold:37,x:G.state.player.x,y:G.state.player.y};G.state.ground.push(ground);original.explored[0]=1;
     await G.enterMap(child,ex.spawnKey);const memory=G.state.map,cache=memory.props.find(p=>p.encounterLock);const n=G.state.ground.length;
     ok(memory.cathedral.seed===original.cathedral.seed,child+' seed follows parent instance');
     G.interact(cache);ok(cache.lootable&&G.state.ground.length===n,child+' cache stays locked while guardians live');
     for(const mon of [...G.state.monsters].filter(m=>m.cathedralEncounter))mon.die(G.state.player);
     G.interact(cache);ok(!cache.lootable&&cache.opened,child+' defeated guardians unlock cache');const paid=G.state.ground.length;
     G.interact(cache);ok(G.state.ground.length===paid,child+' cache pays once');
     const back=memory.exits.find(e=>e.target===parent);ok(back.reuseCachedMap,child+' return uses cached parent');
     await G.enterMap(parent,back.spawnKey,{reuseCachedMap:back.reuseCachedMap});
     ok(G.state.map===original,parent+' identity preserved');ok(G.state.monsters.length===roster.length&&G.state.monsters.every((m,i)=>m===roster[i]),parent+' enemies preserved');
     ok(G.state.ground.includes(ground)&&original.explored[0]===1,parent+' loot and exploration preserved');
     ok(Math.hypot(G.state.player.x-original.spawns[back.spawnKey].x,G.state.player.y-original.spawns[back.spawnKey].y)<.1,parent+' return arrives at memory gate');
     await G.enterMap(child,ex.spawnKey);ok(G.state.map===memory&&!cache.lootable,child+' repeated detour preserves opened cache');
     await G.enterMap(parent,'default');ok(G.state.map!==original,parent+' normal entry regenerates');ok(!G.state.mapsCache[child]&&!G.state.monstersByMap[child]&&!G.state.groundByMap[child],child+' stale side instance invalidated');
     ok(G.state.map.props.some(p=>(p.soulBinding===objective||p.storyId===objective)&&p.completed),parent+' completed artwork survives regeneration');
     const freshSeed=G.state.map.cathedral.seed;await G.enterMap(child,ex.spawnKey);ok(G.state.map!==memory&&G.state.map.cathedral.seed===freshSeed&&freshSeed!==memory.cathedral.seed,child+' new parent produces fresh seeded memory');
    }
    await G.enterMap('cathedral2','default');const portal=G.state.map.props.find(p=>p.storyId==='hell_portal');ok(portal.hidden,'Hell portal hidden before Malthoron');
    G.state.quests.q16={state:'done'};G.state.quests.q17={state:'done'};const boss=G.state.monsters.find(m=>m.defId==='malthoron');G.__cathedral.place(boss.x+3,boss.y+2);boss.die(G.state.player);ok(boss.dead,'Malthoron defeated inside arena');
    ok(!portal.hidden,'Hell portal revealed after Malthoron');
    try{R.game.__cathedral.render();}catch(e){throw Error(e.message+' '+JSON.stringify(G.state.monsters.map(m=>({id:m.defId,opts:m.spriteOpts,dead:m.dead}))));}
    return{status:'PASS',checks:results.length,results};
   });fs.writeFileSync('tests/qa/cathedral/journey.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
  }else if(mode==='verify-performance'){
   const rows=[];
   for(const width of [1920,3840])for(const zone of zones.slice(0,2)){
    const baseline=JSON.parse(fs.readFileSync(`tests/qa/cathedral/performance_${zone}_${width}.json`,'utf8'));
    for(const mode of ['moving','combat']){
     await page.evaluate(async({zone,width})=>{document.getElementById('width').value=width;await cathedralReview.load('after',zone);},{zone,width});
     const sample=await page.evaluate(mode=>cathedralReview.sample(mode),mode),before=baseline.results.find(r=>r.mode===mode).before;
     const passed=sample.cpuMs.median<=before.median*1.1&&sample.cpuMs.p95<=before.p95*1.1;
     rows.push({zone,width,mode,before,after:sample.cpuMs,passed});console.log(JSON.stringify(rows.at(-1)));
    }
   }
   const passed=rows.every(r=>r.passed);fs.writeFileSync('tests/qa/cathedral/final_performance.json',JSON.stringify({status:passed?'PASS':'FAIL',method:'Final-scene movement/combat samples compared with the three-pair saved baseline after landmark placement refinements.',rows},null,2)+'\n');
   if(!passed)throw Error('Final scenery exceeds the 10% rendering budget');
  }else if(mode==='profile'){
   const wantedZone=process.argv[3],wantedWidth=+process.argv[4];
   for(const width of wantedWidth?[wantedWidth]:[1920,3840])for(const zone of wantedZone?[wantedZone]:zones.slice(0,2)){
    await page.evaluate(async({zone,width})=>{document.getElementById('width').value=width;await cathedralReview.load('after',zone);},{zone,width});
    const report=await page.evaluate(()=>cathedralReview.profile());console.log(JSON.stringify(report));
   }
  }
  if(errors.length)throw Error(errors.join('\n'));
 }finally{await browser.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
