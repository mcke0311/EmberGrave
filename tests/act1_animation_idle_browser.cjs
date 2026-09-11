const {chromium}=require('playwright');const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});const cases=[];
 try{
  const page=await browser.newPage({viewport:{width:1920,height:1390}});
  await page.goto('http://127.0.0.1:8741/tests/act1_animation_review.html');
  await page.waitForFunction(()=>window.act1Review||document.body.dataset.testStatus==='failed',null,{timeout:180000});
  const error=await page.locator('#error').textContent();if(error)throw Error(error);
  const ids=await page.evaluate(()=>Object.keys(act1Review.api.DATA.ACT1_ANIMATIONS));
  for(const width of [1920,3840])for(const reduced of [false,true]){
   await page.emulateMedia({reducedMotion:reduced?'reduce':'no-preference'});await page.selectOption('#width',String(width));
   for(const id of ids)for(const phase of id==='korvath'?[0,1]:[0])for(const facing of [0,Math.PI]){
    const result=await page.evaluate(({id,phase,facing,reduced})=>{
     const r=act1Review,suffix=phase?'_1':'',spec=r.api.DATA.ACT1_ANIMATIONS[id],rest=spec.rests['idle'+suffix];
     const m=r.preview(id,'idle'+suffix,facing),assets=r.api.SpriteAssets;
     m.animT=0;const original=assets.actorGeometry(m.spriteOpts,m.pose(),0,0,1.1),frame=original.frame;
     if(frame.id!==rest.asset||frame.index!==rest.row*6+rest.frame)throw Error(id+' wrong resting identity');
     r.step(.5);const breathe=assets.actorGeometry(m.spriteOpts,m.pose(),0,0,1.1);
     if(reduced&&(breathe.a!==original.a||breathe.d!==original.d||breathe.f!==original.f))throw Error(id+' reduced rest moved');
     const ground=g=>[g.a*g.frame.anchorX+g.c*g.frame.anchorY+g.e,g.b*g.frame.anchorX+g.d*g.frame.anchorY+g.f];
     if(ground(original).some((v,i)=>Math.abs(v-ground(breathe)[i])>1e-7))throw Error(id+' breathing moved the feet');
     const capture=['frost_wyrm','frost_risen','frost_archer','barb_sword','korvath','beacon'].includes(id)&&facing===0&&!reduced?r.win.document.getElementById('view').toDataURL('image/webp',.9):null;
     m.moving=true;m.curSpeed=2;r.step(.3);if(!m.pose().ex.act1Animation.id.startsWith('walk'))throw Error(id+' missing matching walk');
     if(assets.actorGeometry(m.spriteOpts,m.pose(),0,0,1.1).frame.id!==frame.id)throw Error(id+' walking changed artwork');
     m.moving=false;const kind=id==='korvath'?'cleave':spec.sequences[0];m.startAction('attack',1.2,{enemySkill:kind});r.api.Act1EnemyAnimation.deferred(m,.6);r.step(.61);r.step(1);
     if(!m.pose().ex.act1Animation.rest)throw Error(id+' recovery did not return to matching idle');
     m.flashT=.1;m.tint='#b595dc';r.render();m.flashT=0;r.render();m.tint=null;
     const a=JSON.stringify(m.pose().ex.act1Animation);r.render();if(a!==JSON.stringify(m.pose().ex.act1Animation))throw Error(id+' pause changed pose');
     if(r.win.act1Errors.length)throw Error(r.win.act1Errors.join('\n'));
     return {asset:frame.id,index:frame.index,capture};
    },{id,phase,facing,reduced});
    if(result.capture)fs.writeFileSync(`tests/qa/act1_animation/idle_${id}_${phase}_${width}.webp`,Buffer.from(result.capture.split(',')[1],'base64'));
    delete result.capture;cases.push({id,phase,facing,width,reduced,...result});
   }
   console.log('PASS',width,reduced?'reduced':'normal');
  }
  fs.writeFileSync('tests/qa/act1_animation/idle.json',JSON.stringify({cases,errors:[]},null,2));console.log('PASS',cases.length,'idle/walk/attack/recovery identity cases');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
