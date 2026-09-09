// Run against python tests/cinders_server.py. Uses isolated in-memory saves.
const {chromium}=require('playwright'),fs=require('node:fs');
const mode=process.argv[2]||'smoke',zone=process.argv[3]||'ash_wastes',out='tests/qa/act5_environment';
fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding']});
 try{
  const context=await browser.newContext({viewport:{width:1600,height:1100}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()===404)console.error('NOT FOUND',r.url());});
  page.on('requestfailed',r=>console.error('REQUEST FAILED',r.url(),r.failure()?.errorText));
  page.on('console',m=>{if(m.type()==='error')console.error('BROWSER',m.text());});
  const params=new URLSearchParams({zone});
  if(process.argv.includes('--enemies'))params.set('enemies','');
  if(process.argv.includes('--controlled'))params.set('controlled','');
  if(process.argv.includes('--steady'))params.set('steady','');
  const pairs=process.argv.find(a=>a.startsWith('--pairs='));if(pairs)params.set('pairs',pairs.split('=')[1]);
  if(process.argv.includes('--legacy-actors'))params.set('legacyActors','');
  if(mode==='profile'){params.set('profile','');params.set('bothWidths','');if(process.argv.includes('--resume'))params.set('resume','');}
  if(mode==='capture')params.set('captureAll','');
  await page.goto('http://127.0.0.1:8879/tests/act5_environment_review.html?'+params,{waitUntil:'load',timeout:60000});
  await page.waitForFunction(()=>document.body.dataset.testStatus==='failed'||window.cindersReview,{timeout:120000});
  if(await page.locator('#error').textContent()){
   console.error(await page.evaluate(()=>{const w=document.querySelector('iframe')?.contentWindow;if(!w)return null;const s=w.eval('SpriteAssets');return [...new Set(w.eval('Game').state?.monsters.filter(m=>!m.spriteOpts.bossArt&&!s.maps.monsters[m.spriteOpts.monsterArtId]).map(m=>m.spriteOpts.monsterArtId))];}));
   throw Error(await page.locator('#error').textContent());
  }
  if(mode==='capture'||mode==='profile'){
   for(let k=0;k<240;k++){
    const progress=await page.evaluate(()=>({text:document.querySelector('#status').textContent,error:document.querySelector('#error').textContent}));
    console.log(progress.text);
    if(progress.error)throw Error(progress.error);
    if(mode==='capture'&&progress.text.startsWith('Saved ')||mode==='profile'&&progress.text.includes('performance comparison complete')){if(progress.text.startsWith('FAIL'))throw Error('Performance target exceeded; see '+(params.has('steady')?'steady_':'')+(params.has('controlled')?'controlled_':'')+'performance_'+zone+'_both.json');break;}
    if(k===239)throw Error('Review timed out');
    await page.waitForTimeout(10000);
   }
  }else{
   const reports=[];
   for(const id of ['ash_wastes','cinder_bastion','throne','hellgate']){
    const report=await page.evaluate(async id=>{
     const r=window.cindersReview;await r.load('after',id);const m=r.map,api=r.api,g=r.game;
     const art=r.win.eval('SpriteAssets');
     for(const p of m.props){const key=art.maps.props[(p.artZone||m.id)+'_'+p.type]||art.maps.props[p.type];const f=art.getFrame(key,0);if(!f.image.complete||!f.image.naturalWidth)throw Error('Undecoded sprite '+p.type);}
     const cv=r.win.document.getElementById('view');
     for(const view of ['arrival',...m.composition.landmarks.filter(n=>n.id!=='entry').map(n=>n.id)]){
      document.getElementById('view').value=view;r.showView();
      const response=await fetch('/api/cinders-review',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'smoke_'+id+'_'+view+'.webp',png:cv.toDataURL('image/webp',.93)})});if(!response.ok)throw Error('Capture failed');
     }
     const boundary=r.win.eval('CindersBoundaries'),first=boundary.getDiagnostics();
     const before=api.LevelTerrain.getDiagnostics();for(let i=0;i<30;i++)g.__cinders.render();const after=api.LevelTerrain.getDiagnostics();
     if(after.totalBuilds!==before.totalBuilds||after.surfaceViewBuilds!==before.surfaceViewBuilds||after.environmentBackdropBuilds!==before.environmentBackdropBuilds)throw Error('Warmed cache rebuilt');
     const boundaryCache=boundary.getDiagnostics();if(boundaryCache.batchBuilds!==first.batchBuilds||boundaryCache.mergedBuilds!==first.mergedBuilds)throw Error('Warmed wall batches rebuilt');
     return {zone:id,props:m.props.length,enemies:m.monsterSpawns.length,landmarks:m.composition.landmarks.length,cacheStable:true,boundaryCache};
    },id);reports.push(report);console.log(JSON.stringify(report));
   }
   // Real save/load through the production 3D player and storage lifecycle.
   const save=await page.evaluate(async()=>{
    const r=window.cindersReview,g=r.game;g.state.flags['dead_vethriss@0']=true;g.state.quests.q18={state:'reward'};
    g.state.shrines.push('cinder_bastion','throne');g.state.home='hellgate';g.saveGame();
    const slot=g.listSaves().find(s=>s.name==='Cinders review')?.slot||g.listSaves()[0].slot;await g.loadGame(slot);
    if(!g.state.flags['dead_vethriss@0']||g.state.quests.q18.state!=='reward'||!g.state.shrines.includes('throne'))throw Error('Save/load lost Act V progression');
    await g.enterMap('throne','from_wild');if(g.state.monsters.some(m=>m.defId==='vethriss'))throw Error('Saved boss respawned');
    return {status:'PASS',bossRemainsDead:true,questRetained:true,shrinesRetained:true};
   });
   fs.writeFileSync(out+'/browser.json',JSON.stringify({status:'PASS',browser:browser.version(),legacyActors:params.has('legacyActors'),reports,save,errors},null,2)+'\n');
  }
  if(errors.length)throw Error(errors.join('\n'));
  console.log('Completed '+mode+' '+zone);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

