// Animated silhouette checks and real canvas recordings, with isolated saves.
const {chromium}=require('playwright'),fs=require('node:fs');
const width=+(process.argv.find(a=>a.startsWith('--width='))?.slice(8)||1920),reduce=process.argv.includes('--reduce');
const clips=process.argv.includes('--clips'),selected=process.argv.find(a=>a.startsWith('--boss='))?.slice(7);
const tag=`${width}_${reduce?'reduce':'motion'}${selected?'_'+selected:''}`,dir=`tmp/boss_animation/${tag}`;
fs.mkdirSync(dir,{recursive:true});
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true}),report={browser:browser.version(),width,reducedMotion:reduce,sequences:[],errors:[],missing:[],clips:[]};
 try{
  const page=await browser.newPage({viewport:{width:width+32,height:Math.round(width*9/16)+250},reducedMotion:reduce?'reduce':'no-preference'});
  page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()===404)report.missing.push(r.url());});
  await page.goto('http://localhost:8741/tests/boss_encounters.html');
  await page.waitForFunction(()=>window.bossQA&&!document.querySelector('#status').textContent.startsWith('Loading'),null,{timeout:90000});
  await page.evaluate(width=>{const f=document.querySelector('iframe');f.style.width=width+'px';f.style.height=Math.round(width*9/16)+'px';},width);
  await page.evaluate(()=>{
   const q=window.bossQA,w=q.frame.contentWindow,cv=w.document.createElement('canvas');cv.width=cv.height=800;
   const c=cv.getContext('2d',{willReadFrequently:true});
   window.checkAnimatedPose=()=>{
    const m=q.api.Game.state.monsters.find(m=>m.encounter),s=q.api.SpriteAssets;let pixels=0;
    for(const angle of [0,Math.PI])for(const flash of [false,true]){
     const pose={...m.pose(),ang:angle},opts={...m.spriteOpts,bossFlash:flash},g=s.actorGeometry(opts,pose,400,740);
     if(g.left<0||g.top<0||g.right>800||g.bottom>800)throw Error('Animated silhouette clipped in review scratch');
     c.clearRect(0,0,800,800);c.save();c.translate(400,740);
     const create=w.document.createElement;w.document.createElement=()=>{throw Error('Canvas allocated during animated pose');};
     try{s.drawActor(c,opts,pose);}finally{w.document.createElement=create;c.restore();}
     const rgba=c.getImageData(0,0,800,800).data;
     for(let y=Math.max(0,Math.floor(g.top));y<g.bottom;y+=4)for(let x=Math.max(0,Math.floor(g.left));x<g.right;x+=4){
      if(rgba[(x+y*800)*4+3]<100)continue;
      if(!s.hitTestGeometry(g,x+.5,y+.5,1))throw Error('Animated painted pixel cannot be selected');pixels++;
     }
     if(s.hitTestGeometry(g,g.left-15,g.top-15,2))throw Error('Animated transparent margin selectable');
    }
    const e=m.encounter,before=JSON.stringify(e.visual),create=w.document.createElement,read=c.getImageData;
    w.document.createElement=()=>{throw Error('Canvas allocated during effects');};c.getImageData=()=>{throw Error('Pixel read during effects');};
    try{const draws=[],cam={x:q.api.U.isoX(m.x,m.y)-400,y:q.api.U.isoY(m.x,m.y)-500};q.api.BossVFX.drawGround(c,q.api.Game.state,cam);q.api.BossVFX.appendDraws(draws,q.api.Game.state,cam,1e6,1e6);
      for(const d of draws)q.api.BossVFX.drawItem(c,d,cam);for(const p of q.api.Game.state.projectiles)q.api.BossVFX.drawProjectile(c,p,cam);
    }finally{w.document.createElement=create;c.getImageData=read;}
    if(JSON.stringify(e.visual)!==before)throw Error('Rendering advanced effect state');return pixels;
   };
  });
  let pixels=0;
  const bosses=selected?[selected]:await page.evaluate(()=>Object.keys(window.bossQA.api.DATA.BOSS_ENCOUNTERS));
  for(const id of bosses){
   const cases=await page.evaluate(id=>{const e=window.bossQA.api.DATA.BOSS_ENCOUNTERS[id];return e.rotations.flatMap((r,phase)=>[...new Set(r)].flatMap(attack=>(attack==='memory'?[0,1]:[0]).map(variation=>({id,phase,attack,variation}))));},id);
   let recorded=false;
   for(const item of cases){
    await page.evaluate(async({id,phase,attack,variation})=>{
     const q=window.bossQA,{boss:m,player:p}=await q.setup(id,'gravebinder',phase);q.setPaused(true);q.api.Game.debugFlags.god=true;
     m.takeDamage=()=>0;const e=m.encounter;e.clearOwned();for(let i=0;i<e.config.cap;i++)e.spawn('drowned_dead',m.x-3+i*1.5,m.y+3);
     e.memoryIndex=variation;e.start(attack,p);q.render();
    },item);
    if(clips&&!recorded){
     await page.evaluate(()=>{
      const canvas=window.bossQA.frame.contentDocument.querySelector('#view'),stream=canvas.captureStream(0);
      const recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp8',videoBitsPerSecond:3000000});
      window.clip={recorder,stream,chunks:[],track:stream.getVideoTracks()[0]};recorder.ondataavailable=e=>{if(e.data.size)clip.chunks.push(e.data);};recorder.start();
     });recorded=true;
    }
    const checks=await page.evaluate(async({clips})=>{
     const q=window.bossQA,m=q.api.Game.state.monsters.find(m=>m.encounter),e=m.encounter,seen=new Set(),steps=[];
     let pixels=0,frames=0,recovery=0;
     for(let t=0;t<10;t+=1/15){
      q.advance(1/15,1/60);frames++;
      const key=e.attack?.stepIndex+'_'+e.stage;
      if(!seen.has(key)){seen.add(key);steps.push({step:e.attack?.stepIndex,attack:e.attack?.id,stage:e.stage});}
      const p=e.stage==='windup'?1-e.timer/e.attack.windup:e.stage==='execute'?e.attack.age/e.attack.duration:1-e.timer/e.recoveryDuration;
      if(p>=.45&&!seen.has(key+'_pose')){pixels+=window.checkAnimatedPose();seen.add(key+'_pose');}
      const d=q.api.BossVFX.diagnostics(e);if(d.events>24||d.particles>96)throw Error('Effect cap exceeded');
      if(clips){clip.track.requestFrame();await new Promise(r=>setTimeout(r,67));}
      if(e.stage==='recovery'){recovery+=1/15;if(recovery>=.8)break;}
     }
     return {steps,pixels,frames,diagnostics:q.api.BossVFX.diagnostics(e)};
    },{clips});
    pixels+=checks.pixels;report.sequences.push({...item,...checks});
    await page.evaluate(({attack,variation})=>{const q=window.bossQA,e=q.api.Game.state.monsters.find(m=>m.encounter).encounter;e.memoryIndex=variation;e.start(attack,q.api.Game.state.player);q.advance(.8);},item);
    await page.frameLocator('iframe').locator('#view').screenshot({path:`${dir}/${id}_${item.phase}_${item.attack}_${item.variation}_windup.png`});
    await page.evaluate(()=>{const q=window.bossQA,e=q.api.Game.state.monsters.find(m=>m.encounter).encounter;e.execute();q.advance(.08);});
    await page.frameLocator('iframe').locator('#view').screenshot({path:`${dir}/${id}_${item.phase}_${item.attack}_${item.variation}_impact.png`});
   }
   if(recorded){
    const video=await page.evaluate(async()=>{
     await new Promise(resolve=>{clip.recorder.onstop=resolve;clip.recorder.stop();});clip.stream.getTracks().forEach(t=>t.stop());
     const blob=new Blob(clip.chunks,{type:'video/webm'});return await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.readAsDataURL(blob);});
    });
    fs.writeFileSync(`${dir}/${id}.webm`,Buffer.from(video,'base64'));report.clips.push(`${dir}/${id}.webm`);
   }
   console.log('PASS animated sequences',id,cases.length);
  }
  if(!selected){
   await page.evaluate(async()=>{const q=window.bossQA;await q.setup('korvath','vanguard',1);q.setPaused(true);});
   await page.selectOption('#sequence','fissure:0');await page.click('#preview');
   await page.click('#frameStep');
   const before=await page.evaluate(()=>window.bossQA.api.Game.state.time);await page.waitForTimeout(80);
   if(before!==await page.evaluate(()=>window.bossQA.api.Game.state.time))throw Error('Frame stepping did not pause');
   await page.uncheck('#animations');
   if(await page.evaluate(()=>window.bossQA.api.BossVFX.enabled))throw Error('Animation toggle failed');
   await page.check('#animations');await page.selectOption('#speed','0.25');await page.click('#pause');await page.waitForTimeout(400);await page.click('#pause');
   const elapsed=await page.evaluate(()=>window.bossQA.api.Game.state.time)-before;
   if(elapsed<.025||elapsed>.22)throw Error('Quarter-speed playback failed: '+elapsed);report.controls=true;
  }
  if(report.errors.length||report.missing.length)throw Error([...report.errors,...report.missing].join('\n'));
  report.paintedPixelChecks=pixels;report.passed=true;
 }finally{fs.writeFileSync(`tests/qa/bosses/animation_browser_${tag}.json`,JSON.stringify(report,null,2)+'\n');await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
