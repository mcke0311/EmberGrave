const {chromium}=require('playwright');
const fs=require('node:fs');
const out='tests/qa/act2_animation';
async function prepare(page,width,version,mode){
 await page.selectOption('#width',String(width));
 await page.evaluate(async({version,mode})=>{
  const r=window.act2AnimationReview;await r.load(version,'ritual_site');const s=r.game.state,a=s.map.bossArena;
  s.monsters=[];s.projectiles=[];s.fx=[];s.ground=[];r.game.__act2.place(a.cx+2,a.cy);s.time=10;
  const ids=['drowned_dead','marsh_wretch','silent_cultist','bog_bloat','marsh_serpent','gnarl_treant','stone_gargoyle','lure_child','song_thrall','marsh_larvae','sludge_horror','blight_treant','choir_herald','brood_mother','choirmaster'];
  if(mode==='boss'){const m=new r.api.Monster('mire_mother',a.cx,a.cy);m.aggro=true;s.monsters.push(m);}
  for(let i=0;i<(mode==='boss'?6:24);i++){
   const theta=i*2.399963,radius=3+Math.floor(i/8),x=a.cx+Math.cos(theta)*radius,y=a.cy+Math.sin(theta)*radius;
   const m=new r.api.Monster(ids[i%ids.length],x,y,{...(i>=15?{minion:true}:{}),act2Profile:mode!=='boss'});m.aggro=true;m.hp=m.maxHp=100000;
   if(i>=15){m.tint='#b595dc';m.elite=true;}s.monsters.push(m);
  }
  s.player.path=null;s.player.command=null;r.pause();r.render();
 },{version,mode});
}
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding']});
 const runs=[];
 try{
  const page=await browser.newPage({viewport:{width:1920,height:1280}});
  await page.goto('http://127.0.0.1:8749/tests/act2_review.html?enemyReview&animationReview');await page.waitForFunction(()=>window.act2ReviewDone,null,{timeout:120000});
  for(const width of [1920,3840])for(const mode of ['crowd','boss'])for(let pair=0;pair<3;pair++)for(const version of pair%2?['after','before']:['before','after']){
   await prepare(page,width,version,mode);
   const result=await page.evaluate(async()=>{
    const r=window.act2AnimationReview,raf=()=>new Promise(resolve=>requestAnimationFrame(resolve));
    for(let i=0;i<90;i++){r.step(1/60);if(i%15===0)await raf();}
    const times=[];let actionFrames=0;
    for(let i=0;i<240;i++){const t=performance.now();r.step(1/60);times.push(performance.now()-t);actionFrames+=r.game.state.monsters.filter(m=>m.action||m.encounter?.attack).length;if(i%10===0)await raf();}
    times.sort((a,b)=>a-b);return {median:times[120],p95:times[228],actionFrames,monsters:r.game.state.monsters.length,canvas:[r.win.document.getElementById('view').width,r.win.document.getElementById('view').height],layoutWarnings:r.win.__layoutWarnings?.length||0,errors:r.win.__errors};
   });
   if(result.errors.length||!result.actionFrames)throw Error(JSON.stringify(result));runs.push({width,mode,pair,version,...result});console.log(width,mode,pair,version,result.median.toFixed(2),result.p95.toFixed(2));
  }
  const results=[];
  for(const width of [1920,3840])for(const mode of ['crowd','boss']){
   const average=(version,key)=>{const rows=runs.filter(r=>r.width===width&&r.mode===mode&&r.version===version);return rows.reduce((s,r)=>s+r[key],0)/rows.length;};
   const before={median:average('before','median'),p95:average('before','p95')},after={median:average('after','median'),p95:average('after','p95')};results.push({width,mode,before,after,incrementalMedianMs:after.median-before.median,incrementalP95Ms:after.p95-before.p95});
  }
  fs.writeFileSync(out+'/performance.json',JSON.stringify({status:'MEASURED',browser:browser.version(),method:'Headless Chrome on this machine; full production canvas update/render; three alternating pairs; 90 warmup and 240 samples; 24-enemy crowded combat and Mire Mother plus six legacy-AI reinforcements. Main-thread CPU time, not GPU frame latency.',results,runs},null,2));
  // Record actual production gameplay at both resolutions, scaled to a
  // convenient 1080p video. The simulation and recorder run in real time.
  for(const width of [1920,3840]){
   await prepare(page,width,'after','crowd');
   const video=await page.evaluate(async()=>{
    const r=window.act2AnimationReview,canvas=document.createElement('canvas');canvas.width=1920;canvas.height=1080;const ctx=canvas.getContext('2d'),source=r.win.document.getElementById('view');
    const recorder=new MediaRecorder(canvas.captureStream(30),{mimeType:'video/webm;codecs=vp9',videoBitsPerSecond:5000000}),chunks=[];
    recorder.ondataavailable=e=>chunks.push(e.data);const done=new Promise(resolve=>recorder.onstop=resolve);recorder.start();
    for(let i=0;i<180;i++){if(i===90)for(const m of r.game.state.monsters.slice(0,6))if(!m.dead)m.die(r.game.state.player);r.step(1/30);ctx.drawImage(source,0,0,1920,1080);await new Promise(resolve=>setTimeout(resolve,1000/30));}
    recorder.stop();await done;const bytes=new Uint8Array(await new Blob(chunks).arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=16384)binary+=String.fromCharCode(...bytes.subarray(i,i+16384));return btoa(binary);
   });fs.writeFileSync(`${out}/crowded_combat_${width}.webm`,Buffer.from(video,'base64'));
  }
  console.log('Performance comparison and gameplay recordings saved');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
