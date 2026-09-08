const {chromium}=require('playwright');
const fs=require('node:fs');
const mode=process.argv[2]||'capture';
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding']});
 const page=await browser.newPage({viewport:{width:1920,height:1300}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('http://127.0.0.1:8744/tests/cathedral_review.html',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>['passed','failed'].includes(document.body.dataset.testStatus),null,{timeout:180000});const error=await page.locator('#error').innerText();if(error)throw Error(error);
  if(mode==='capture'){
   const captures=[],sounds=[];
   for(const width of [1920,3840]){
    await page.evaluate(async width=>{document.getElementById('width').value=width;await cathedralReview.load('after','cathedral_cinderwatch');const a=cathedralReview.api;window.skillSounds=[];const play=a.Sfx.play.bind(a.Sfx);a.Sfx.play=(id,...args)=>{skillSounds.push(id);return play(id,...args);};},width);
    const profiles=await page.evaluate(()=>Object.entries(cathedralReview.api.EnemySkills.profiles).map(([id,p])=>({id,skills:[...Object.keys(p.skills),'basic']})));
    for(const {id,skills}of profiles)for(const skill of skills){
     await page.evaluate(({id,skill})=>cathedralReview.demonstrate(id,skill),{id,skill});
     for(const stage of ['warning','release']){if(stage==='release')await page.evaluate(()=>{const m=cathedralReview.game.state.monsters[0],a=m.enemySkills.active;cathedralReview.step((a?.remaining||.8)+.025);});const name=`enemy_${width}_${id}_${skill}_${stage}.webp`;await page.evaluate(name=>cathedralReview.capture(name),name);captures.push(name);}
     if(id==='choir_priest')sounds.push(...await page.evaluate(()=>skillSounds.splice(0)));
    }
    for(const zone of ['cathedral1','cathedral2','cathedral_cinderwatch','cathedral_bastion']){await page.evaluate(async zone=>{await cathedralReview.load('after',zone);cathedralReview.mixed();document.getElementById('play').click();cathedralReview.step(3);},zone);const name=`enemy_${width}_${zone}_mixed.webp`;await page.evaluate(name=>cathedralReview.capture(name),name);captures.push(name);}
    console.log('Captured enemy skills at '+width);
   }
   if(sounds.includes('bow'))throw Error('Priest bow sound');fs.writeFileSync('tests/qa/cathedral/enemy_visual_review.json',JSON.stringify({status:'PASS',captures,sounds,errors},null,2)+'\n');
  }else if(mode==='performance'){
   const rows=[];
   for(const width of [1920,3840])for(const zone of ['cathedral1','cathedral2']){
    for(let pair=0;pair<3;pair++)for(const version of pair%2?['after','skills_before']:['skills_before','after']){
     await page.evaluate(async({width,zone,version})=>{document.getElementById('width').value=width;await cathedralReview.load(version,zone);},{width,zone,version});
     const result=await page.evaluate(()=>cathedralReview.sample('combat'));rows.push({width,zone,pair,version,...result});
    }
    console.log('Compared '+zone+' at '+width);
   }
   const results=[];for(const width of [1920,3840])for(const zone of ['cathedral1','cathedral2']){const mean=(v,k)=>{const a=rows.filter(r=>r.width===width&&r.zone===zone&&r.version===v);return a.reduce((s,r)=>s+r.cpuMs[k],0)/a.length;};const before={median:mean('skills_before','median'),p95:mean('skills_before','p95')},after={median:mean('after','median'),p95:mean('after','p95')};results.push({width,zone,before,after,passed:after.median<=before.median*1.1&&after.p95<=before.p95*1.1});}
   const passed=results.every(r=>r.passed);fs.writeFileSync('tests/qa/cathedral/enemy_performance.json',JSON.stringify({status:passed?'PASS':'FAIL',method:'Three alternating pairs per zone/resolution, 60 warmup + 180 measured production combat frames. Frozen cathedral baseline immediately before enemy skills.',results,rows},null,2)+'\n');console.log(results);if(!passed)throw Error('Rendering regression >10%');
  }else if(mode==='detours'){
   const report=await page.evaluate(async()=>{const R=cathedralReview,G=R.game,rows=[];for(const parent of ['cathedral1','cathedral2']){
    await G.enterMap(parent,'default');const map=G.state.map,m=G.state.monsters.find(m=>m.enemySkills),c=m.enemySkills;G.__cathedral.place(m.x+2,m.y);c.cooldowns.cleave=0;if(!c.start('cleave',G.state.player))throw Error('Could not start detour cast');m.hp-=13;const hp=m.hp,cd=c.cooldowns.cleave;
    const exit=map.exits.find(e=>e.target.startsWith('cathedral_'));await G.enterMap(exit.target,exit.spawnKey);R.step(5);if(c.active||m.hp!==hp||c.cooldowns.cleave!==cd)throw Error('Cached health/cooldowns changed');
    const back=G.state.map.exits.find(e=>e.target===parent);await G.enterMap(parent,back.spawnKey,{reuseCachedMap:true});if(G.state.map!==map||!G.state.monsters.includes(m)||m.hp!==hp||c.active)throw Error('Return state changed');rows.push(parent+' preserved health/cooldowns and canceled pending cleave');
   }return{status:'PASS',rows};});fs.writeFileSync('tests/qa/cathedral/enemy_detours.json',JSON.stringify(report,null,2)+'\n');console.log(report);
  }
  if(errors.length)throw Error(errors.join('\n'));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
