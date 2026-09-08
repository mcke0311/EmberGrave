const {chromium}=require('playwright');
const fs=require('node:fs');
const mode=process.argv[2]||'capture',out='tests/qa/act4_animation';fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding']});
 const page=await browser.newPage({viewport:{width:1920,height:1300}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>errors.push(r.url()+': '+r.failure()?.errorText));
 await page.route('**/favicon.ico',r=>r.fulfill({status:204,body:''}));
 const save=(name,url)=>fs.writeFileSync(out+'/'+name,Buffer.from(url.split(',')[1],'base64'));
 try{
  await page.goto('http://127.0.0.1:8744/tests/cathedral_review.html?zone=cathedral_cinderwatch');
  await page.waitForFunction(()=>['passed','failed'].includes(document.body.dataset.testStatus),null,{timeout:180000});
  if(await page.locator('#error').innerText())throw Error(await page.locator('#error').innerText());
  if(mode==='capture'){
   const captures=[],geometry=[],mixed=[];
   for(const width of [1920,3840]){
    await page.evaluate(async width=>{document.getElementById('width').value=width;await cathedralReview.load('after','cathedral_cinderwatch');},width);
    const profiles=await page.evaluate(()=>Object.entries(cathedralReview.api.EnemySkills.profiles).map(([id,p])=>({id,skills:['basic',...Object.keys(p.skills),'death']})));
    for(const {id,skills}of profiles)for(const skill of skills)for(const facing of ['right','left']){
     const result=await page.evaluate(({id,skill,facing})=>{
      const R=cathedralReview;document.getElementById('facing').value=facing;R.demonstrate(id,skill);
      const s=R.game.state,m=s.monsters[0],S=R.win.eval('SpriteAssets'),records=[],seen=new Set();let sceneImage;
      for(let i=0;i<125;i++){
       const pose=m.pose(),a=pose.ex.act4Animation;
       if(a&&!seen.has(a.id+':'+a.frame)){
        seen.add(a.id+':'+a.frame);
        const tile=document.createElement('canvas');tile.width=320;tile.height=280;const ctx=tile.getContext('2d');
        ctx.fillStyle='#273437';ctx.fillRect(0,0,320,280);ctx.save();ctx.translate(160,240);ctx.scale(1.6,1.6);
        S.drawActor(ctx,{...m.spriteOpts,act2Tint:!m.dead?m.tint:null},pose);ctx.restore();ctx.fillStyle='#fff';ctx.font='13px sans-serif';ctx.fillText(a.id+' '+(a.frame+1),8,270);
        const g=S.actorGeometry(m.spriteOpts,pose,160,240,1.6);
        if(g.frame.id!==a.asset||g.frame.index!==a.index||![g.left,g.top,g.right,g.bottom].every(Number.isFinite))throw Error('Wrong authored geometry');
        if(g.left<0||g.right>320||g.top<0||g.bottom>260)throw Error('Pose clipped in preview: '+id+'/'+a.id+'/'+a.frame+' '+JSON.stringify([g.left,g.top,g.right,g.bottom]));
        const flash=document.createElement('canvas');flash.width=320;flash.height=280;const fc=flash.getContext('2d');fc.translate(160,240);fc.scale(1.6,1.6);S.drawActor(fc,{...m.spriteOpts,bossFlash:true},pose);
        records.push({id:a.id,frame:a.frame,stage:m.enemySkills.active?.stage,tile});
        if(a.frame===3&&!sceneImage)sceneImage=R.win.document.getElementById('view').toDataURL('image/webp',.9);
       }
       if(skill==='death'&&i>30)break;
       if(skill!=='death'&&i>0&&!m.enemySkills.active)break;
       R.step(.025);
      }
      if(!records.length)throw Error('No animation frames '+id+'/'+skill);
      const sheet=document.createElement('canvas');sheet.width=6*320;sheet.height=Math.ceil(records.length/6)*280;const c=sheet.getContext('2d');c.fillStyle='#273437';c.fillRect(0,0,sheet.width,sheet.height);
      records.forEach((r,i)=>c.drawImage(r.tile,i%6*320,Math.floor(i/6)*280));
      return{image:sheet.toDataURL('image/webp',.93),sceneImage,frames:records.map(({id,frame,stage})=>({id,frame,stage})),width:R.win.document.getElementById('view').width};
     },{id,skill,facing});
     if(result.width!==width)throw Error('Wrong canvas size');
     const name=`${width}_${id}_${skill}_${facing}.webp`;save(name,result.image);captures.push({id,skill,facing,width,file:name,frames:result.frames});
     if(result.sceneImage&&facing==='right')save(`scene_${width}_${id}_${skill}.webp`,result.sceneImage);
    }
    console.log('Captured all six profiles at '+width);
    for(const zone of ['cathedral1','cathedral2','cathedral_cinderwatch','cathedral_bastion']){
     await page.evaluate(async zone=>{const R=cathedralReview;await R.load('after',zone);R.mixed();document.getElementById('play').click();R.step(2);},zone);
     const image=await page.evaluate(()=>cathedralReview.win.document.getElementById('view').toDataURL('image/webp',.9));const file=`mixed_${width}_${zone}.webp`;save(file,image);mixed.push(file);
    }
   }
   // Native alpha bounds drive drawing, flash and picking for every packed frame.
   geometry.push(await page.evaluate(()=>{
    const R=cathedralReview,S=R.win.eval('SpriteAssets'),D=R.win.eval('DATA'),A=R.win.eval('Act4EnemyAnimation');let samples=0;
    for(const [id,seq]of Object.entries(A.sequences))for(let index=0;index<seq.length*6;index++)for(const angle of [0,Math.PI]){
     const mon=new R.api.Monster(id,10,10),pose={state:'attack',t:.5,ang:angle,ex:{act4Animation:{asset:'actor.act4.'+id,index,alpha:1}}};
     const g=S.actorGeometry(mon.spriteOpts,pose,150,180,1.6),f=S.getFrame('actor.act4.'+id,index);
     const c=document.createElement('canvas');c.width=f.sw;c.height=f.sh;const ctx=c.getContext('2d');ctx.drawImage(f.image,f.sx,f.sy,f.sw,f.sh,0,0,f.sw,f.sh);const pixels=ctx.getImageData(0,0,c.width,c.height).data;
     for(let y=0;y<f.sh;y+=3)for(let x=0;x<f.sw;x+=3)if(pixels[(y*f.sw+x)*4+3]>=128){
      const sx=g.a*x+g.c*y+g.e,sy=g.b*x+g.d*y+g.f;
      if(!S.hitTestGeometry(g,sx,sy,1))throw Error('Picking misses visible actor '+id+'/'+index);samples++;
     }
     if(S.hitTestGeometry(g,g.left-10,g.top-10))throw Error('Picking outside art');
    }
    return{frames:90,facings:2,pixelSamples:samples};
   }));
   if(errors.length)throw Error(errors.join('\n'));
   fs.writeFileSync(out+'/browser.json',JSON.stringify({status:'PASS',captures,mixed,geometry,errors},null,2)+'\n');
  }else if(mode==='lifecycle'){
   await page.emulateMedia({reducedMotion:'reduce'});
   const reduced=await page.evaluate(()=>{
    const R=cathedralReview;R.demonstrate('memory_wraith','blink');R.step(.5);
    const a=R.game.state.monsters[0].pose().ex.act4Animation;
    if(!a||a.alpha!==1)throw Error('Reduced motion adds blink fading');
    return {id:a.id,frame:a.frame,alpha:a.alpha};
   });
   await page.emulateMedia({reducedMotion:'no-preference'});
   const summoned=await page.evaluate(async()=>{
    const R=cathedralReview;await R.load('after','cathedral2');const s=R.game.state;
    s.quests.q16={state:'done'};s.quests.q17={state:'done'};
    const boss=s.monsters.find(m=>m.defId==='malthoron'),e=boss.encounter;
    R.game.__cathedral.place(boss.x+4,boss.y);e.active=true;
    const child=e.spawn('hollow_knight',boss.x+3,boss.y+1);
    if(!child||!child.enemySkills||child.bossOwner!==boss)throw Error('Production Knight summon missing');
    R.game.__cathedral.place(child.x+1.1,child.y);child.encounterGrace=0;
    for(const k in child.enemySkills.cooldowns)child.enemySkills.cooldowns[k]=99;
    child.enemySkills.fight(s.player,s.map);R.step(.34);
    const pose=child.pose().ex.act4Animation;
    if(pose?.asset!=='actor.act4.hollow_knight')throw Error('Summon lost animation');
    const result={asset:pose.asset,id:pose.id,frame:pose.frame,bossHasAct4Animation:!!boss.pose().ex.act4Animation};
    if(result.bossHasAct4Animation)throw Error('Boss uses ordinary enemy animation');
    return {...result,image:R.win.document.getElementById('view').toDataURL('image/webp',.9)};
   });
   save('summoned_knight.webp',summoned.image);delete summoned.image;
   if(errors.length)throw Error(errors.join('\n'));
   fs.writeFileSync(out+'/lifecycle.json',JSON.stringify({status:'PASS',reducedMotion:reduced,summonedKnight:summoned,errors},null,2)+'\n');
   console.log({status:'PASS',reducedMotion:reduced,summonedKnight:summoned});
  }else if(mode==='performance'){
   const rows=[];
   for(const width of [1920,3840])for(const zone of ['cathedral1','cathedral2']){
    for(let pair=0;pair<3;pair++)for(const version of pair%2?['after','animation_before']:['animation_before','after']){
     await page.evaluate(async({width,zone,version})=>{document.getElementById('width').value=width;await cathedralReview.load(version,zone);},{width,zone,version});
     const result=await page.evaluate(()=>cathedralReview.sample('combat'));rows.push({width,zone,pair,version,...result});
    }
    console.log('Compared '+zone+' at '+width);
   }
   const results=[];for(const width of [1920,3840])for(const zone of ['cathedral1','cathedral2']){
    const mean=(v,k)=>{const a=rows.filter(r=>r.width===width&&r.zone===zone&&r.version===v);return a.reduce((sum,r)=>sum+r.cpuMs[k],0)/a.length;};
    const before={median:mean('animation_before','median'),p95:mean('animation_before','p95')},after={median:mean('after','median'),p95:mean('after','p95')};results.push({width,zone,before,after,passed:after.median<=before.median*1.1&&after.p95<=before.p95*1.1});
   }
   const passed=results.every(r=>r.passed);fs.writeFileSync(out+'/performance.json',JSON.stringify({status:passed?'PASS':'FAIL',method:'Exact pre-animation runtime, three alternating pairs per zone and resolution, 60 warmup + 180 measured production combat frames, warm terrain cache checks.',results,rows,errors},null,2)+'\n');console.log(results);if(!passed)throw Error('Rendering regression >10%');
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
