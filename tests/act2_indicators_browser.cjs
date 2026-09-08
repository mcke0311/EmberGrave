const {chromium}=require('playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const out='tests/qa/act2_indicators';
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const rows=[],crowds=[],errors=[];
 try{
  const page=await browser.newPage({viewport:{width:1920,height:1280}});
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8749/tests/act2_review.html?enemyReview&animationReview');
  await page.waitForFunction(()=>window.act2ReviewDone,null,{timeout:120000});
  const cases=[['drowned_dead','melee'],['gnarl_treant','slam'],['marsh_serpent','lunge'],['stone_gargoyle','dive'],['lure_child','blink'],['bog_bloat','rupture'],['sludge_horror','rupture'],['mire_mother','bile'],['choirmaster','requiem'],['choir_herald','summon'],['brood_mother','slam']];
  for(const width of [1920,3840])for(const reduced of [false,true]){
   await page.emulateMedia({reducedMotion:reduced?'reduce':'no-preference'});
   await page.selectOption('#width',String(width));
   for(const [id,skill] of cases)for(const variant of ['normal',...(!['mire_mother','choirmaster','choir_herald','brood_mother'].includes(id)?['elite']:[])]){
    await page.selectOption('#variant',variant);
    await page.evaluate(async({id,skill})=>{const r=window.act2AnimationReview;await r.stageEnemy(id);await r.previewAbility(skill,false);},{id,skill});
    const row=await page.evaluate(skill=>{
     const r=window.act2AnimationReview,A=r.win.eval('Act2EnemyAnimation'),C=r.win.eval('Act2EnemyCombat');
     const ctx=r.win.document.getElementById('view').getContext('2d'),m=r.enemy;
     let warningStrokes=0,impactRings=0,novas=0,hiddenNovas=0;
     const draw=C.draw,ground=A.drawGround,nova=r.game.addNova,stroke=ctx.stroke,ellipse=ctx.ellipse;
     C.draw=function(c,cam){c.stroke=function(...a){warningStrokes++;return stroke.apply(this,a);};try{return draw.call(this,c,cam);}finally{c.stroke=stroke;}};
     A.drawGround=function(c,s,cam){c.ellipse=function(...a){if(a[6]-a[5]>6)impactRings++;return ellipse.apply(this,a);};try{return ground.call(this,c,s,cam);}finally{c.ellipse=ellipse;}};
     r.game.addNova=function(...args){novas++;if(args[4]?.hideRadius)hiddenNovas++;return nova.apply(this,args);};
     const frames=new Set(),start=r.game.state.time;
     try{for(let i=0;i<75;i++){r.step(1/30);const a=m.pose().ex.act2Animation;if(a)frames.add(a.frame);}}
     finally{C.draw=draw;A.drawGround=ground;r.game.addNova=nova;}
     const paused=r.game.state.time;for(let i=0;i<3;i++)r.render();
     return {warningStrokes,impactRings,novas,hiddenNovas,frames:[...frames],boss:m.isBoss,elite:m.elite,pauseStable:paused===r.game.state.time,elapsed:paused-start,errors:r.win.__errors};
    },skill);
    assert.equal(row.elite,variant==='elite');assert(row.pauseStable);assert.equal(row.errors.length,0);
    if(!row.boss){assert.equal(row.warningStrokes,0,`${id} warning`);assert.equal(row.impactRings,0,`${id} impact ring`);assert.equal(row.novas,row.hiddenNovas,`${id} generic nova`);assert.equal(row.frames.length,6,`${id} authored animation`);}
    else if(id!=='mire_mother')assert(row.warningStrokes+row.impactRings>0,`${id} boss indicators retained`);
    rows.push({width,reduced,id,skill,variant,...row});
   }
   // Real crowded combat includes both elite and summoned creatures, with
   // normal-AI boss reinforcements independent of the Act 2 combat profile.
   const crowd=await page.evaluate(async()=>{
    const r=window.act2AnimationReview;await r.load('after','ritual_site');const s=r.game.state,a=s.map.bossArena;
    s.monsters=[];s.fx=[];s.projectiles=[];r.game.__act2.place(a.cx+2,a.cy);
    const ids=['drowned_dead','gnarl_treant','marsh_serpent','stone_gargoyle','lure_child','bog_bloat','sludge_horror','song_thrall'];
    for(let i=0;i<32;i++){
     const t=i*2.399963,rad=2+Math.floor(i/8),m=new r.api.Monster(ids[i%ids.length],a.cx+Math.cos(t)*rad,a.cy+Math.sin(t)*rad,{elite:i%3===0,minion:i%3===1,act2Profile:i%4!==0});m.aggro=true;m.hp=m.maxHp=1e5;s.monsters.push(m);
    }
    const times=[];let actionFrames=0;
    for(let i=0;i<150;i++){const t=performance.now();r.step(1/30);times.push(performance.now()-t);actionFrames+=s.monsters.filter(m=>m.action).length;if(i%15===0)await new Promise(resolve=>requestAnimationFrame(resolve));}
    times.sort((a,b)=>a-b);return {monsters:s.monsters.length,actionFrames,medianMs:times[75],p95Ms:times[142],errors:r.win.__errors};
   });
   assert(crowd.actionFrames>0);assert.equal(crowd.errors.length,0);
   await page.locator('iframe:visible').screenshot({path:`${out}/crowd_${width}_${reduced?'reduced':'normal'}.png`});
   crowds.push({width,reduced,...crowd});console.log(width,reduced,rows.length,'previews; crowd median',crowd.medianMs);
  }
  assert.equal(errors.length,0);
  fs.writeFileSync(out+'/browser.json',JSON.stringify({status:'PASS',browser:browser.version(),rows,crowds,errors},null,2)+'\n');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
