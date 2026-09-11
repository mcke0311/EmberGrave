const {chromium}=require('playwright');const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding']});const pages={},runs=[];
 try{
  for(const version of ['before','after']){
   const page=pages[version]=await browser.newPage({viewport:{width:1920,height:1390}});
   await page.goto('http://127.0.0.1:8756/tests/act1_animation_review.html'+(version==='before'?'?baseline=1':''));
   await page.waitForFunction(()=>window.act1Review||document.body.dataset.testStatus==='failed',null,{timeout:180000});const error=await page.locator('#error').textContent();if(error)throw Error(version+' '+error);
  }
  for(const width of [1920,3840]){
   for(const page of Object.values(pages)){await page.selectOption('#width',String(width));await page.waitForFunction(w=>act1Review.win.document.getElementById('view').width===w,width);}
   for(let pair=0;pair<3;pair++)for(const version of pair%2?['after','before']:['before','after']){
    const result=await pages[version].evaluate(({width,pair,version})=>{
     const r=act1Review,s=r.game.state,p=s.player;r.playing=false;r.game.__act1Review.clear();r.win.Math.random=r.api.U.rng(7331);s.time=10;s.monsters=[];s.projectiles=[];s.minions=[];s.ground=[];s.fx=[];p.hp=p.stats.maxHp=1e7;p.stats.block=p.stats.dodge=0;p.tryBlock=()=>false;
     const ids=['frost_risen','frost_archer','ice_lurker','shard_thrall','barb_guard','shard_sentinel','rimebound_guardian','shatter_wasp','glacial_crawler','r9_skeleton','r11_human','frost_wyrm'];
     for(let i=0;i<24;i++){const a=i*2.399963,dist=1.5+Math.floor(i/8),m=new r.api.Monster(ids[i%ids.length],p.x+Math.cos(a)*dist,p.y+Math.sin(a)*dist);m.hp=m.maxHp=1e6;m.aggro=true;if(i>=16)m.tint='#b595dc';s.monsters.push(m);}
     let animated=0,deaths=0;const times=[];
     for(let i=0;i<330;i++){if(i===200)for(const m of s.monsters.slice(0,6))m.die(p);const start=performance.now();r.simulate(1/60);const ms=performance.now()-start;if(i>=90)times.push(ms);
      for(const m of s.monsters){const a=m.pose().ex.act1Animation;if(a){animated++;if(a.id==='death')deaths++;}}
     }
     times.sort((a,b)=>a-b);return {width,pair,version,median:times[Math.floor(times.length*.5)],p95:times[Math.floor(times.length*.95)],animated,deaths,errors:r.win.act1Errors};
    },{width,pair,version});
    if(result.errors.length)throw Error(JSON.stringify(result));runs.push(result);console.log(width,pair,version,result.median.toFixed(2),result.p95.toFixed(2));
   }
  }
  const results=[1920,3840].map(width=>{const median=(version,key)=>runs.filter(r=>r.width===width&&r.version===version).map(r=>r[key]).sort((a,b)=>a-b)[1];const before=median('before','p95'),after=median('after','p95');return {width,beforeP95:before,afterP95:after,p95ChangePercent:(after/before-1)*100,withinTarget:after<=before*1.1};});
  const report={method:'Exact pre-pass workspace JS snapshot versus current code; three alternating pairs; 24 enemies, eight tinted, six deaths; 90 warmup and 240 measured update/render frames. CPU submission timing, not display latency.',browser:browser.version(),results,runs};fs.writeFileSync('tests/qa/act1_animation/performance.json',JSON.stringify(report,null,2));console.log(results);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
