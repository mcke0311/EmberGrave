const {chromium}=require('playwright');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding']});
 const runs=[];
 try{
  const page=await browser.newPage({viewport:{width:1920,height:1280}});
  await page.goto('http://127.0.0.1:8743/tests/act3_review.html?zone=khal_palace');
  await page.waitForFunction(()=>window.act3CombatReview?.game&&document.body.dataset.testStatus==='passed',null,{timeout:180000});
  for(const width of [1920,3840]){
   await page.selectOption('#width',String(width));await page.evaluate(()=>{window.dispatchEvent(new Event('resize'));const r=act3CombatReview;void r.win.document.body.offsetWidth;r.win.dispatchEvent(new r.win.Event('resize'));});
   await page.waitForFunction(width=>act3CombatReview.win.document.getElementById('view').width===width,width);
   for(let pair=0;pair<3;pair++)for(const enabled of pair%2?[true,false]:[false,true]){
    const result=await page.evaluate(({enabled,width,pair})=>{
     const r=act3CombatReview,s=r.game.state,A=r.win.eval('Act3EnemyAnimation'),ids=Object.keys(A.sequences),a=s.map.bossArena;
     A.enabled=enabled;r.win.Math.random=r.api.U.rng(7331);s.time=10;s.monsters=[];s.projectiles=[];s.ground=[];s.fx=[];s.minions=[];
     s.player.hp=s.player.stats.maxHp=1e7;r.game.__act3.place(a.cx+2,a.cy);r.game.debugFlags.act3Combat=false;
     for(let i=0;i<24;i++){
      const angle=i*2.399963,dist=1.5+Math.floor(i/8),m=new r.api.Monster(ids[i%ids.length],a.cx+Math.cos(angle)*dist,a.cy+Math.sin(angle)*dist);
      m.hp=m.maxHp=1e6;m.aggro=true;if(i>=16)m.tint='#b595dc';s.monsters.push(m);
     }
     const times=[];let frames=0,deaths=0;
     for(let i=0;i<330;i++){
      if(i===200)for(const m of s.monsters.slice(0,6))m.die(s.player);
      const start=performance.now();r.step(1/60);const elapsed=performance.now()-start;
      if(i>=90)times.push(elapsed);
      for(const m of s.monsters){const frame=m.pose().ex.act3Animation;if(frame){frames++;if(frame.id==='death')deaths++;}}
     }
     const sorted=times.sort((a,b)=>a-b),summary={median:sorted[Math.floor(sorted.length*.5)],p95:sorted[Math.floor(sorted.length*.95)]};
     const image=enabled&&pair===2?r.win.document.getElementById('view').toDataURL('image/webp',.93):null;
     return {width,pair,enabled,...summary,frames,deaths,image,errors:r.win.__errors};
    },{enabled,width,pair});
    if(result.errors.length||enabled&&(!result.frames||!result.deaths))throw Error(JSON.stringify(result));
    if(result.image)fs.writeFileSync(`tests/qa/act3_animation/crowd_${width}.webp`,Buffer.from(result.image.split(',')[1],'base64'));
    delete result.image;runs.push(result);console.log(width,pair,enabled?'animated':'static',result.median.toFixed(2),result.p95.toFixed(2));
   }
  }
  const results=[1920,3840].map(width=>{
   const mean=(enabled,key)=>runs.filter(r=>r.width===width&&r.enabled===enabled).reduce((s,r)=>s+r[key],0)/3;
   return {width,static:{median:mean(false,'median'),p95:mean(false,'p95')},animated:{median:mean(true,'median'),p95:mean(true,'p95')},medianDelta:mean(true,'median')-mean(false,'median'),p95Delta:mean(true,'p95')-mean(false,'p95')};
  });
  const report={status:'PASS',browser:browser.version(),method:'Same-engine animation enabled/disabled comparison; 24 enemies including eight tinted actors, six deaths; three alternating pairs, 90 warmup and 240 measured update/render frames. Measures incremental presentation CPU cost, not GPU presentation.',results,runs};
  fs.writeFileSync('tests/qa/act3_animation/performance.json',JSON.stringify(report,null,2));console.log(results);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
