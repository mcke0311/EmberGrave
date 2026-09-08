const {chromium}=require('playwright');
const fs=require('node:fs');
const out='tests/qa/act2_animation';
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const errors=[],rows=[];
 try{
  const page=await browser.newPage({viewport:{width:1920,height:1280}});page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8749/tests/act2_review.html?enemyReview&animationReview&enemy=lure_child');
  await page.waitForFunction(()=>window.act2ReviewDone,null,{timeout:120000});
  const failure=await page.locator('#error').textContent();if(failure)throw Error(failure);
  for(const width of [1920,3840])for(const reduced of [false,true]){
   await page.emulateMedia({reducedMotion:reduced?'reduce':'no-preference'});
   await page.selectOption('#width',String(width));
   const roster=await page.evaluate(()=>Object.keys(window.act2AnimationReview.win.eval('Act2EnemyAnimation').sequences));
   for(const id of [...roster,'quieting_ritual','drowned_ritual'])for(const phase of id==='mire_mother'?[0,1,2]:[0]){
    await page.selectOption('#phase',String(phase));
    await page.evaluate(id=>window.act2AnimationReview.stageEnemy(id),id);
    const skills=await page.locator('#ability option').evaluateAll(a=>a.map(o=>o.value).filter(v=>v!=='natural'));
    for(const skill of [...skills,'death']){
     await page.evaluate(async({id,skill})=>{const r=window.act2AnimationReview;await r.stageEnemy(id);await r.previewAbility(skill,false);},{id,skill});
     const result=await page.evaluate((skill)=>{
      const r=window.act2AnimationReview,frames=new Set(),times=[];
      const m=r.enemy,p=m.act2Combat?.pending,e=m.encounter,duration=skill==='death'||skill==='rupture'?1.5:p?p.windup+p.recovery+(p.motion?.duration||0)+.05:e?.attack?e.attack.windup+e.attack.duration+e.attack.recovery+.05:2.5;
      const first=m.pose().ex.act2Animation;if(first)frames.add(first.frame);
      for(let i=0;i<Math.ceil(duration*30);i++){const t=performance.now();r.step(1/30);times.push(performance.now()-t);const a=r.enemy.pose().ex.act2Animation;if(a)frames.add(a.frame);}
      const time=r.game.state.time,pose=JSON.stringify(r.enemy.pose().ex.act2Animation);for(let i=0;i<5;i++)r.render();
      return {frames:[...frames],pauseStable:r.game.state.time===time&&pose===JSON.stringify(r.enemy.pose().ex.act2Animation),errors:r.win.__errors,times};
     },skill);
     if(!result.pauseStable||result.errors.length)throw Error(JSON.stringify(result));
     if(!id.includes('ritual')&&result.frames.length!==6)throw Error(`${id} ${skill} phase ${phase}: missing frames ${result.frames}`);
     const sorted=result.times.sort((a,b)=>a-b);delete result.times;
     rows.push({width,reduced,id,phase,skill,...result,cpuMedian:sorted[Math.floor(sorted.length*.5)],cpuP95:sorted[Math.floor(sorted.length*.95)]});
     if(skill==='death'&&!reduced)await page.screenshot({path:`${out}/${id}_${phase}_death_${width}.png`});
    }
    console.log(width,reduced?'reduced':'full',id,phase,'PASS');
   }
  }
  const report={status:errors.length?'FAIL':'PASS',browser:browser.version(),rows,errors};fs.writeFileSync(out+'/browser.json',JSON.stringify(report,null,2));console.log(JSON.stringify({status:report.status,cases:rows.length,errors}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
