const {chromium}=require('playwright');
const fs=require('node:fs');
const out='tests/qa/act3_animation';fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding']});
 const errors=[],cases=[];
 try{
  const page=await browser.newPage({viewport:{width:1920,height:1280},deviceScaleFactor:1});
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8743/tests/act3_review.html?zone=khal_palace');
  await page.waitForFunction(()=>window.act3CombatReview?.game&&document.body.dataset.testStatus==='passed',null,{timeout:180000});
  const roster=await page.evaluate(()=>Object.entries(act3CombatReview.win.eval('Act3EnemyAnimation').sequences));
  for(const width of [1920,3840])for(const reduced of [false,true]){
   await page.emulateMedia({reducedMotion:reduced?'reduce':'no-preference'});
   await page.selectOption('#width',String(width));await page.evaluate(()=>window.dispatchEvent(new Event('resize')));
   await page.evaluate(()=>{const r=act3CombatReview;void r.win.document.body.offsetWidth;r.win.dispatchEvent(new r.win.Event('resize'));});
   await page.waitForFunction(width=>act3CombatReview.win.document.getElementById('view').width===width,width);
   for(const [id,sequences] of roster)for(const skill of sequences){
    const result=await page.evaluate(({id,skill,reduced})=>{
     const r=act3CombatReview,kind=skill==='death'?'death':['melee','bolt'].includes(skill)?'attack':'skill';
     const m=r.previewAnimation(kind,id),frames=new Set(),a=m.imperialCombat.active;
     m.attackCd=100;m.imperialCombat.cooldown=100;
     const duration=kind==='death'?1:a.windup+a.recovery+(skill==='charge'?1:skill==='leap'?.55:0)+.1;
     let capture=null;
     for(let i=0;i<Math.ceil(duration*60);i++){
      const frame=m.pose().ex.act3Animation;if(frame)frames.add(frame.frame);
      if(!reduced&&!capture&&frame?.frame===(kind==='death'?5:3))capture=r.win.document.getElementById('view').toDataURL('image/webp',.92);
      r.step(1/60);
     }
     const time=r.game.state.time,pose=JSON.stringify(m.pose().ex.act3Animation);for(let i=0;i<3;i++)r.render();
     const c=r.win.document.getElementById('view');
     return {frames:[...frames].sort(),pauseStable:time===r.game.state.time&&pose===JSON.stringify(m.pose().ex.act3Animation),width:c.width,height:c.height,errors:r.win.__errors,reviewError:document.getElementById('error').textContent,capture};
    },{id,skill,reduced});
    if(result.frames.join()!=='0,1,2,3,4,5'||!result.pauseStable||result.errors.length||result.reviewError||result.width!==width)throw Error(id+' '+skill+' '+JSON.stringify({...result,capture:undefined}));
    if(result.capture)fs.writeFileSync(`${out}/${id}_${skill}_${width}.webp`,Buffer.from(result.capture.split(',')[1],'base64'));
    delete result.capture;cases.push({id,skill,width,reduced,...result});
   }
   console.log(width,reduced?'reduced motion':'full motion','all 31 sequences PASS');
  }
  // Raster, flash, tint and picking use the same frame and affine transform.
  const geometry=await page.evaluate(()=>{
   const r=act3CombatReview,{SpriteAssets:S,DATA:D}=r.win.eval('({SpriteAssets,DATA})'),canvas=r.win.document.createElement('canvas');canvas.width=canvas.height=512;
   const ctx=canvas.getContext('2d',{willReadFrequently:true});let checks=0;
   for(const [asset,d] of Object.entries(D.SPRITE_MANIFEST.entries).filter(([,d])=>d.act3Art))for(let index=0;index<d.cols*d.rows;index++)for(const flip of [false,true]){
    const opts={scale:1},pose={ang:flip?Math.PI:0,ex:{act3Animation:{asset,index,alpha:1}}},g=S.actorGeometry(opts,pose,256,256,1);
    for(const mode of ['normal','flash','elite']){
     ctx.clearRect(0,0,512,512);ctx.save();ctx.translate(256,256);S.drawActor(ctx,{...opts,bossFlash:mode==='flash',act2Tint:mode==='elite'?'#b595dc':undefined},pose);ctx.restore();
     const data=ctx.getImageData(0,0,512,512).data;let count=0,hit=false;
     for(let y=0;y<512;y++)for(let x=0;x<512;x++)if(data[(x+y*512)*4+3]>96){
      count++;if(x<g.left-2||x>g.right+2||y<g.top-2||y>g.bottom+2)throw Error(asset+' frame '+index+' geometry clips');
      if(S.hitTestGeometry(g,x,y))hit=true;
     }
     if(!count||!hit)throw Error(asset+' invisible/unpickable frame '+index);checks++;
    }
   }
   const m=r.previewAnimation('attack','sand_raider'),pose=m.pose(),entry=D.SPRITE_MANIFEST.entries[pose.ex.act3Animation.asset],src=entry.src;
   entry.src='qa-unloaded-animation.webp';try{S.drawActor(ctx,m.spriteOpts,pose);S.actorGeometry(m.spriteOpts,pose);}finally{entry.src=src;}
   return {checks,fallback:true,status:'PASS'};
  });
  fs.writeFileSync(out+'/geometry.json',JSON.stringify(geometry,null,2));
  const report={status:errors.length?'FAIL':'PASS',browser:browser.version(),cases,geometry,errors};
  fs.writeFileSync(out+'/browser.json',JSON.stringify(report,null,2));console.log({status:report.status,cases:cases.length,geometry,errors});
  if(errors.length)throw Error(errors.join('\n'));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
