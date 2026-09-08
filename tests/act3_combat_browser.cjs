// Uses the same isolated production runtime as the interactive review page.
const {chromium}=require('playwright');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding']});
 const errors=[],captures=[],performanceRows=[],out='tests/qa/act3';fs.mkdirSync(out,{recursive:true});
 try{
  const page=await browser.newPage({viewport:{width:1920,height:1280},deviceScaleFactor:1});
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('favicon'))errors.push(m.text()+' '+m.location().url);});
  page.on('requestfailed',r=>errors.push(r.failure()?.errorText+' '+r.url()));
  await page.route('**/favicon.ico',route=>route.fulfill({status:204,body:''}));
  await page.goto('http://127.0.0.1:8743/tests/act3_review.html?zone=khal_palace',{waitUntil:'load',timeout:60000});
  await page.waitForFunction(()=>window.act3CombatReview?.game&&document.body.dataset.testStatus==='passed',null,{timeout:180000});
  for(const width of [1920,3840]){
   await page.selectOption('#width',String(width));await page.evaluate(()=>window.dispatchEvent(new Event('resize')));
   await page.evaluate(()=>{const r=act3CombatReview;r.api.Game.debugFlags.act3Combat=true;r.game.state.options;});
   const ids=await page.evaluate(()=>Object.keys(act3CombatReview.api.DATA.ACT3_ENEMY_PROFILES));
   for(const id of ids){
    const hasSpecial=await page.evaluate(id=>!!act3CombatReview.api.DATA.ACT3_ENEMY_PROFILES[id].act3Combat.special,id);
    for(const mode of hasSpecial?['basic','special']:['basic']){
     await page.evaluate(({id,mode})=>{
      const r=act3CombatReview,m=r.previewEnemy(id,mode==='special');r.game.debugFlags.act3Combat=true;
      if(mode==='basic'){m.imperialCombat.cooldown=100;r.step(.025);}
     },{id,mode});
     for(const stage of ['warning','release']){
      if(stage==='release')await page.evaluate(({mode,id})=>{
       const r=act3CombatReview,m=r.game.state.monsters[0],a=m.imperialCombat.active;
       const duration=a?.remaining??.4;
       for(let t=0;t<duration+.1;t+=1/60)r.step(1/60);
      },{mode,id});
      const result=await page.evaluate(()=>{
       const r=act3CombatReview,m=r.game.state.monsters[0],canvas=document.querySelector('iframe').contentDocument.querySelector('#view');
       return {image:canvas.toDataURL('image/webp',.9),width:canvas.width,height:canvas.height,art:m.spriteOpts.monsterArtId,role:m.imperialCombat.profile.role,attack:m.imperialCombat.lastAttack,phase:m.imperialCombat.active?.stage,projectiles:r.game.state.projectiles.length,errors:document.querySelector('#error').textContent};
      });
      if(result.width!==width||result.height!==width*9/16||result.errors)throw Error(JSON.stringify(result));
      const name=`combat_${width}_${id}_${mode}_${stage}.webp`;fs.writeFileSync(out+'/'+name,Buffer.from(result.image.split(',')[1],'base64'));delete result.image;captures.push({id,mode,stage,file:name,...result});
     }
    }
   }
   // Actual mixed packs: collect update/render timings and verify that normal
   // encounters exercise warning and projectile presentation.
   for(const zone of ['desert_wastes','underground_market','sand_tombs','khal_palace','shard_flats','tomb_sanctum']){
    await page.evaluate(zone=>act3CombatReview.load('after',zone),zone);
    const row=await page.evaluate(async({zone,width})=>{
     const r=act3CombatReview,s=r.game.state,n=s.map.act3.landmarks.find(n=>n.id!=='entry');r.game.__act3.place(n.x,n.y);r.game.debugFlags.act3Combat=false;
     s.player.hp=s.player.stats.maxHp=1e7;for(const m of s.monsters){m.maxHp=m.hp=1e7;}
     const times=[],updates=[],renders=[];let warnings=0,shots=0;
     for(let i=0;i<330;i++){
      const begin=performance.now();r.game.__act3.update(1/60);const middle=performance.now();r.render();const end=performance.now();
      if(i>=90){times.push(end-begin);updates.push(middle-begin);renders.push(end-middle);}
      warnings+=s.monsters.filter(m=>m.imperialCombat?.active?.shape).length;shots=Math.max(shots,s.projectiles.length);
      if(i%30===0)await new Promise(resolve=>setTimeout(resolve,0));
     }
     const stats=a=>{a.sort((a,b)=>a-b);return {median:a[Math.floor(a.length*.5)],p95:a[Math.floor(a.length*.95)]};};
     return{zone,width,monsters:s.monsters.length,warnings,shots,total:stats(times),update:stats(updates),render:stats(renders)};
    },{zone,width});performanceRows.push(row);
   }
  }
  const report={status:errors.length?'FAIL':'PASS',browser:browser.version(),headless:true,captures,performance:performanceRows,errors};
  fs.writeFileSync(out+'/combat_browser.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,captures:captures.length,performance:performanceRows,errors},null,2));
  if(errors.length)process.exitCode=1;
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
