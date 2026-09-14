// Fixed-step capture of production renderer in an isolated, temporary save store.
// WebCodecs timestamps give exactly 30 fps without changing simulation speed.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const out=__dirname,ff=path.resolve(out,'../ffmpeg.exe');
for(const folder of ['clips','review'])fs.mkdirSync(path.join(out,folder),{recursive:true});
const scenes=[
 {id:'vanguard',boss:'korvath',hero:'vanguard',phase:1,seconds:14},
 {id:'gravebinder',boss:'mire_mother',hero:'gravebinder',phase:1,seconds:14},
 {id:'veilranger',boss:'empty_archangel',hero:'veilranger',phase:1,seconds:14},
 {id:'wildkeeper',boss:'azram',hero:'wildkeeper',phase:1,seconds:14},
 {id:'emberwitch',boss:'vethriss',hero:'emberwitch',phase:2,seconds:16},
 {id:'hollowking',boss:'malthoron',hero:'vanguard',phase:1,seconds:12},
 {id:'frosthaven',boss:'korvath',hero:'vanguard',phase:0,zone:'frosthaven',seconds:10},
 {id:'marsh',boss:'mire_mother',hero:'gravebinder',phase:0,zone:'weeping_marsh',seconds:9},
 {id:'sand',boss:'azram',hero:'wildkeeper',phase:0,zone:'khalcamp',seconds:9},
 {id:'cathedral',boss:'empty_archangel',hero:'veilranger',phase:0,zone:'cathedral1',seconds:9},
 {id:'cinders',boss:'vethriss',hero:'emberwitch',phase:0,zone:'hellgate',seconds:9}
];
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding']});
 const report=fs.existsSync(path.join(out,'capture-report.json'))?JSON.parse(fs.readFileSync(path.join(out,'capture-report.json'),'utf8')):[];
 try{
  const page=await browser.newPage({viewport:{width:1400,height:1000}});
  page.setDefaultTimeout(240000);
  await page.goto('http://127.0.0.1:8876/tests/boss_encounters.html');
  await page.waitForFunction(()=>window.bossQA,null,{timeout:180000});
  await page.evaluate(()=>{const f=document.querySelector('iframe');f.style.width='1280px';f.style.height='720px';});
  for(const sc of scenes){
   const only=process.argv.find(a=>a.startsWith('--only='))?.slice(7).split(',');
   if(only&&!only.includes(sc.id))continue;
   const target=path.join(out,'clips',sc.id+'.mp4');
   if(process.argv.includes('--resume')&&fs.existsSync(target))continue;
   console.log('Preparing '+sc.id);
   const prep=await page.evaluate(async sc=>{
    const q=window.bossQA;const loaded=await q.setup(sc.boss,sc.hero,sc.phase);q.setPaused(true);
    const g=q.api.Game;g.debugFlags.god=true;g.options.screenShake=true;g.options.dmgNumbers=false;
    const p=g.state.player;p.name='Embergrave';p.command=null;p.path=null;
    if(sc.zone){
     if(!q.api.DATA.MAPS?.[sc.zone]&&!q.api.DATA.ZONES?.[sc.zone]){
      // enterMap validates the actual map registry; aliases are resolved here.
      const ids=Object.keys(q.api.DATA).filter(k=>/MAP|ZONE/.test(k));
      window.trailerRegistry=Object.fromEntries(ids.map(k=>[k,Object.keys(q.api.DATA[k])]));
     }
     const ok=await g.enterMap(sc.zone,'default');if(!ok)throw Error('Cannot load '+sc.zone+' '+JSON.stringify(window.trailerRegistry));
     q.setPaused(true);q.api.UI.closeAll();
    }else{
     const m=loaded.boss;
     p.x=m.x+(sc.hero==='vanguard'?1.05:3);p.y=m.y-(sc.hero==='vanguard'?1.05:2);
     p.command={type:'attack',target:m,skill:p.skillL,hold:true};
     if(sc.hero==='emberwitch'){p.skills.emberwitch_0_4=5;p.skills.emberwitch_1_6=5;}
     m.encounter.start(m.encounter.config.rotations[sc.phase][1]||m.encounter.config.rotations[sc.phase][0],p);
    }
    g.state.map.explored.fill(1);q.api.UI.closeAll();
    const d=q.frame.contentDocument;d.getElementById('centerMsg').classList.add('hidden');d.getElementById('msglog').replaceChildren();
    g.__bossReview.updateCamera(5);q.advance(.4,1/60);q.render();
    return {map:g.state.map.id,player:[p.x,p.y],skills:p.skills};
   },sc);
   await page.waitForTimeout(120);
   await page.frameLocator('iframe').locator('#view').screenshot({path:path.join(out,'review',sc.id+'-start.png')});
   const result=await page.evaluate(async sc=>{
    const q=window.bossQA,g=q.api.Game,source=q.frame.contentDocument.querySelector('#view');
    const cv=document.createElement('canvas');cv.width=1280;cv.height=720;const ctx=cv.getContext('2d');
    const chunks=[];let encoderError=null;
    const encoder=new VideoEncoder({output:chunk=>{const bytes=new Uint8Array(chunk.byteLength);chunk.copyTo(bytes);chunks.push(bytes);},error:e=>encoderError=String(e)});
    encoder.configure({codec:'avc1.640028',width:1280,height:720,framerate:30,bitrate:12000000,avc:{format:'annexb'},latencyMode:'quality'});
    let peakFx=0,firstBossHp=null,lastBossHp=null,startPosition={x:g.state.player.x,y:g.state.player.y};
    for(let i=0;i<sc.seconds*30;i++){
     const p=g.state.player,m=g.state.monsters.find(m=>m.encounter&&!m.dead);
     if(!sc.zone&&m){
      if(firstBossHp===null)firstBossHp=m.hp;lastBossHp=m.hp;p.mana=p.stats.maxMana;
      if(!p.command)p.command={type:'attack',target:m,skill:p.skillL,hold:true};
      if(sc.hero==='emberwitch'&&[55,200,350].includes(i))p.performSkill('emberwitch_0_4',m,{x:m.x,y:m.y});
      if(sc.hero==='emberwitch'&&[120,285].includes(i))p.performSkill('emberwitch_1_6',m,{x:m.x,y:m.y});
     }
     if(sc.zone&&i%90===0){
      const direction=Math.floor(i/90)%4,dx=[4,3,-3,-4][direction],dy=[-3,4,4,-3][direction];
      p.command={type:'steer',point:{x:p.x+dx,y:p.y+dy}};
     }
     q.advance(1/30,1/60);ctx.drawImage(source,0,0,1280,720);
     const frame=new VideoFrame(cv,{timestamp:Math.round(i*1000000/30),duration:Math.round(1000000/30)});encoder.encode(frame,{keyFrame:i%60===0});frame.close();
     peakFx=Math.max(peakFx,g.state.fx.length+g.state.projectiles.length);
     if(i%30===29){await encoder.flush();await new Promise(r=>setTimeout(r,0));}
     if(encoderError)throw Error(encoderError);
    }
    await encoder.flush();encoder.close();
    const blob=new Blob(chunks,{type:'video/h264'});
    const data=await new Promise(r=>{const reader=new FileReader();reader.onload=()=>r(reader.result.split(',')[1]);reader.readAsDataURL(blob);});
    return {data,frames:sc.seconds*30,peakFx,firstBossHp,lastBossHp,startPosition,endPosition:{x:g.state.player.x,y:g.state.player.y},errors:q.frame.contentWindow.bossErrors,canvas:[source.width,source.height]};
   },sc);
   const raw=path.join(out,'clips',sc.id+'.h264');fs.writeFileSync(raw,Buffer.from(result.data,'base64'));
   cp.execFileSync(ff,['-hide_banner','-loglevel','error','-y','-framerate','30','-i',raw,'-c:v','copy','-movflags','+faststart',target]);
   await page.frameLocator('iframe').locator('#view').screenshot({path:path.join(out,'review',sc.id+'-end.png')});
   const {data,...metrics}=result;const old=report.findIndex(x=>x.id===sc.id);if(old>=0)report.splice(old,1);report.push({...sc,...prep,...metrics});
   fs.writeFileSync(path.join(out,'capture-report.json'),JSON.stringify(report,null,2));console.log('Captured '+sc.id+' '+JSON.stringify(metrics));
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
