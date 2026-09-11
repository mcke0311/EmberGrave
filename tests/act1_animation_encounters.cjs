const {chromium}=require('playwright');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1920,height:1390}});
  await page.goto('http://127.0.0.1:8741/tests/act1_animation_review.html');
  await page.waitForFunction(()=>window.act1Review||document.body.dataset.testStatus==='failed',null,{timeout:180000});
  const error=await page.locator('#error').textContent();if(error)throw Error(error);
  const cases=[];
  for(const [id,kind,wanted]of [['frost_wyrm','breath',['breath','slam','melee']],['beacon','summon',['summon']],['korvath','cleave',['cleave','fissure']],['korvath','cleave_1',['cleave_1','fissure_1']]]){
   await page.selectOption('#enemy',id);await page.selectOption('#action',kind);
   const result=await page.evaluate(async()=>{
    const r=act1Review;await r.encounter();r.playing=false;
    const m=r.mon,p=r.game.state.player,frames={},captures={};p.hp=p.stats.maxHp=1e7;
    // Keep the hero in reach so the same actual enemy exercises both its
    // ranged special and contact attack without requiring manual input.
    for(let i=0;i<1800;i++){
     if(m.defId==='frost_wyrm'&&i===1200){p.x=m.x+1;p.y=m.y;}
     r.simulate(1/60);const a=m.pose().ex.act1Animation;if(!a)continue;
     (frames[a.id]??=[]).includes(a.frame)||frames[a.id].push(a.frame);
     if(a.frame===3&&!captures[a.id])captures[a.id]=r.win.document.getElementById('view').toDataURL('image/webp',.9);
    }
    return {id:m.defId,frames,captures,errors:r.win.act1Errors,phase:m.spriteOpts.bossPhase};
   });
   if(result.errors.length||wanted.some(k=>!result.frames[k]?.includes(3)))throw Error(JSON.stringify({...result,captures:undefined}));
   for(const [action,data]of Object.entries(result.captures))fs.writeFileSync(`tests/qa/act1_animation/actual_${id}_${action}.webp`,Buffer.from(data.split(',')[1],'base64'));
   delete result.captures;cases.push(result);console.log('PASS actual encounter',id,kind,result.frames);
  }
  fs.writeFileSync('tests/qa/act1_animation/encounters.json',JSON.stringify(cases,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
