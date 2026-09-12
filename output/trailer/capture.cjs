// Capture production game rendering through the existing isolated boss review.
// No player saves or game source files are changed.
const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const out=__dirname;
fs.mkdirSync(path.join(out,'clips'),{recursive:true});
const scenes=[
 {id:'north',boss:'korvath',hero:'vanguard',phase:0,zone:'frosthaven',seconds:5},
 {id:'korvath',boss:'korvath',hero:'vanguard',phase:1,seconds:7},
 {id:'marsh',boss:'mire_mother',hero:'gravebinder',phase:1,seconds:7},
 {id:'cathedral',boss:'empty_archangel',hero:'veilranger',phase:1,seconds:7},
 {id:'inferno',boss:'vethriss',hero:'emberwitch',phase:1,seconds:8},
 {id:'wildkeeper',boss:'azram',hero:'wildkeeper',phase:1,seconds:7},
];
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding']});
 const report=fs.existsSync(path.join(out,'capture-report.json'))?JSON.parse(fs.readFileSync(path.join(out,'capture-report.json'),'utf8')):[];
 try{
  const page=await browser.newPage({viewport:{width:1500,height:1100}});
  await page.goto('http://127.0.0.1:8876/tests/boss_encounters.html');
  await page.waitForFunction(()=>window.bossQA&&!document.querySelector('#status').textContent.startsWith('Loading'),null,{timeout:120000});
  await page.evaluate(()=>{const f=document.querySelector('iframe');f.style.width='1440px';f.style.height='810px';});
  for(const scene of scenes){
   const only=process.argv.find(a=>a.startsWith('--only='))?.slice(7).split(',');
   if(only&&!only.includes(scene.id))continue;
   if(process.argv.includes('--resume')&&fs.existsSync(path.join(out,'clips',scene.id+'.webm')))continue;
   console.log('Preparing',scene.id);
   await page.evaluate(async sc=>{
    const q=window.bossQA;const loaded=await q.setup(sc.boss,sc.hero,sc.phase);q.setPaused(true);
    const g=q.api.Game;g.debugFlags.god=true;g.options.screenShake=true;g.state.map.explored.fill(1);
    const p=g.state.player;p.name='Embergrave';p.command=null;p.path=null;
    if(sc.zone){
     await g.enterMap(sc.zone,'default');q.setPaused(true);q.api.UI.closeAll();
     g.state.map.explored.fill(1);
    }else{
     const m=loaded.boss;p.command={type:'attack',target:m,skill:p.skillL,hold:true};
     // Keep the hero to the right of the boss so large silhouettes do not
     // hide the weapon and casting animations in the isometric view.
     p.x=m.x+(sc.hero==='vanguard'?1.1:3);p.y=m.y-(sc.hero==='vanguard'?1.1:2);
     if(sc.hero==='emberwitch'){
      p.skills.emberwitch_0_1=5;p.skills.emberwitch_0_4=5;p.skills.emberwitch_1_6=5;
     }
     const attack=m.encounter.config.rotations[sc.phase][1]||m.encounter.config.rotations[sc.phase][0];
     m.encounter.start(attack,p);
    }
    q.api.UI.closeAll();
    const d=q.frame.contentDocument;d.getElementById('centerMsg').classList.add('hidden');d.getElementById('msglog').replaceChildren();
    g.__bossReview.updateCamera(5);q.advance(.35,1/60);q.render();window.trailerScene=sc;
   },scene);
   await page.waitForTimeout(250);
   await page.frameLocator('iframe').locator('#view').screenshot({path:path.join(out,'review',scene.id+'-start.png')});
   const result=await page.evaluate(async sc=>{
    const q=window.bossQA,g=q.api.Game,source=q.frame.contentDocument.querySelector('#view');
    const canvas=document.createElement('canvas');canvas.width=1440;canvas.height=810;
    const ctx=canvas.getContext('2d');
    const stream=canvas.captureStream(0),track=stream.getVideoTracks()[0];
    const recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9',videoBitsPerSecond:12000000});
    const chunks=[];recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
    const done=new Promise(resolve=>recorder.onstop=resolve);recorder.start();
    let peakFx=0;
    for(let i=0;i<sc.seconds*30;i++){
     const p=g.state.player,m=g.state.monsters.find(m=>m.encounter&&!m.dead);
     if(!sc.zone&&m){
      p.mana=p.stats.maxMana;
      if(!p.command)p.command={type:'attack',target:m,skill:p.skillL,hold:true};
      if(sc.hero==='emberwitch'&&i===45)p.performSkill('emberwitch_0_4',m,{x:m.x,y:m.y});
      if(sc.hero==='emberwitch'&&i===120)p.performSkill('emberwitch_1_6',m,{x:m.x,y:m.y});
     }
     if(sc.zone){const p=g.state.player;if(i===1)p.command={type:'steer',point:{x:p.x+4,y:p.y-3}};if(i===105)p.command=null;}
     q.advance(1/30,1/60);ctx.drawImage(source,0,0,1440,810);track.requestFrame();
     peakFx=Math.max(peakFx,g.state.fx.length+g.state.projectiles.length);
     await new Promise(r=>setTimeout(r,34));
    }
    recorder.stop();await done;stream.getTracks().forEach(t=>t.stop());
    const blob=new Blob(chunks,{type:'video/webm'});
    const data=await new Promise(r=>{const reader=new FileReader();reader.onload=()=>r(reader.result.split(',')[1]);reader.readAsDataURL(blob);});
    return {data,peakFx,errors:q.frame.contentWindow.bossErrors,canvas:[source.width,source.height]};
   },scene);
   fs.writeFileSync(path.join(out,'clips',scene.id+'.webm'),Buffer.from(result.data,'base64'));
   await page.frameLocator('iframe').locator('#view').screenshot({path:path.join(out,'review',scene.id+'-end.png')});
   const {data,...metrics}=result;const old=report.findIndex(r=>r.id===scene.id);if(old>=0)report.splice(old,1);report.push({...scene,...metrics});
   fs.writeFileSync(path.join(out,'capture-report.json'),JSON.stringify(report,null,2));
   console.log('Captured',scene.id,metrics);
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
