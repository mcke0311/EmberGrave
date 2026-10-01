/* Real-renderer direction checks. Inspector is injected only into this test page. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const runtime=path.join(process.env.USERPROFILE||'','.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=require(require.resolve('playwright',{paths:[__dirname,runtime]}));
const base=process.env.GAME_REVIEW_URL||'http://127.0.0.1:8741',out=path.join(__dirname,'../tmp/cinematics-direction');
fs.mkdirSync(out,{recursive:true});let checks=0;
const check=(condition,message)=>{assert.ok(condition,message);checks++;};
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[],shots=[],appearances=[];
 page.on('pageerror',e=>errors.push(e.stack));
 await page.route(/\/js\/cinematics\.js(?:\?|$)/,async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace('return {request,tick,cancel','return {__session:()=>session,request,tick,cancel')});});
 const settle=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 const snapshot=()=>page.evaluate(()=>{
  const s=Cinematics.__session(),g=s.stage,p=v=>({x:v.x,y:v.y,z:v.cinematicZ,alpha:v.cinematicAlpha,clip:v.cinematicClip,u:v.clipU,frame:v.cineFrame,submerge:v.submerge,pose:v.pose()});
  return {stage:g.id,world:s.world.map.id,camera:Cinematics.cameraFrame(),hero:p(g.hero),hand:g.hand,extras:g.extras.map(p),props:g.props.map(v=>({...v}))};
 });
 const campaign=()=>page.evaluate(()=>{
  const s=Game.state,p=s.player;return JSON.stringify({save:{...localStorage},time:s.time,zone:s.map.id,flags:s.flags,character:s.characterFlags,quests:s.quests,inventory:p.inv,equip:p.equip,gold:p.gold,xp:p.xp,hp:p.hp,mana:p.mana,x:p.x,y:p.y,ground:s.ground,unlocked:s.unlockedDiff,blocked:Array.from(s.map.blocked),floor:Array.from(s.map.floor),explored:Array.from(s.map.explored)});
 });
 async function start(id,context={}){
  await page.evaluate(({id,context})=>{Cinematics.cancel();Cinematics.request(id,{replay:true,...context});}, {id,context});
  await page.waitForFunction(()=>Cinematics.state?.ready,null,{timeout:60000});check(!(await page.evaluate(()=>Cinematics.state.fallback)),id+' asset preparation');
  await page.evaluate(()=>Cinematics.setPaused(true));
 }
 async function seek(t){await page.evaluate(t=>Cinematics.seek(t),t);await settle();}
 try{
  await page.goto(base+'/index.html');await page.waitForSelector('#titleMenu button',{timeout:120000});
  await page.evaluate(async()=>{Sfx.setVol('master',0);await Game.newGame('Direction QA','vanguard',false);await (await import('/tests/completed_hero_fixture.mjs')).loadCompletedHero(Game);UI.closeAll();UI.openEsc();Game.debugFlags.god=true;await document.fonts.ready;});
  const origin=await campaign(),defs=await page.evaluate(()=>CinematicScenes.all);
  check(defs.length===20,'stable 20-scene catalog');
  for(const d of defs){
   await start(d.id);check(d.shots.length>=3,d.id+' distinct shots');
   if(d.id==='core')check(await page.evaluate(()=>Cinematics.__session().stage.remains.spriteOpts.bossPhase===2),'Last Core follows the unveiled boss defeat');
   if(d.id==='vethriss')check(await page.evaluate(()=>Cinematics.__session().stage.wounded.cineFrame===7),'Wounded Warden begins with the dedicated wounded pose');
   if(d.object)check(await page.evaluate(()=>{const s=Cinematics.__session(),pr=s.world.map.props.find(p=>p.storyId===s.d.object);return !pr||CinematicPresentation.architectureAlpha(s,{kind:'prop',pr})===0;}),d.id+' staged object replaces the collected marker');
   check(d.effects.length>1&&d.effects.every(e=>Number.isFinite(e.from)&&Number.isFinite(e.to)&&e.from>=0&&e.to>e.from&&e.to<=d.duration),d.id+' authored effect intervals');
   for(let i=0;i<d.shots.length;i++){
    const shot=d.shots[i],t=Math.min((d.shots[i+1]?.at||d.duration)-.2,shot.at+1.1);await seek(t);
    const before=await snapshot(),pixels=await page.locator('#view').evaluate(c=>c.toDataURL());
    check(before.stage===(shot.stage||'main'),d.id+' correct stage '+shot.id);check(before.camera.shot===shot.id,d.id+' camera cut '+shot.id);
    check(Number.isFinite(before.camera.zoom)&&before.camera.zoom>0,d.id+' camera projection');
    await seek(d.duration-.1);await seek(t);assert.deepEqual(await snapshot(),before,d.id+' absolute pose sampling '+shot.id);checks++;
    const repeatPixels=await page.locator('#view').evaluate(c=>c.toDataURL());
    let rasterError={max:0,mean:0,severeFraction:0};
    if(repeatPixels!==pixels){
     rasterError=await page.evaluate(async({a,b})=>{const decode=async url=>{const image=new Image();image.src=url;await image.decode();const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const cx=c.getContext('2d');cx.drawImage(image,0,0);return cx.getImageData(0,0,c.width,c.height).data;};const [x,y]=await Promise.all([decode(a),decode(b)]);let max=0,total=0,severe=0;for(let i=0;i<x.length;i++){const delta=Math.abs(x[i]-y[i]);max=Math.max(max,delta);total+=delta;if(delta>16)severe++;}return {max,mean:total/x.length,severeFraction:severe/x.length};},{a:pixels,b:repeatPixels});
     if(rasterError.mean>.1||rasterError.severeFraction>.0005){fs.writeFileSync(path.join(out,'seek-before.png'),Buffer.from(pixels.split(',')[1],'base64'));fs.writeFileSync(path.join(out,'seek-after.png'),Buffer.from(repeatPixels.split(',')[1],'base64'));}
    }
    // Premultiplied cached scenery/Skia blending has tiny rounding differences.
    // Require <0.04% of the 8-bit color range on average; poses/effects are exact.
    check(rasterError.mean<=.1&&rasterError.severeFraction<=.0005,d.id+' repeatable rendered frame '+shot.id+' '+JSON.stringify(rasterError));
    await page.evaluate(()=>document.querySelector('.cine-caption').style.visibility='hidden');
    const file=d.id+'-'+i+'.png';await page.screenshot({path:path.join(out,file)});shots.push({id:d.id,t,shot:shot.id,stage:before.stage,file,rasterError});
   }
   await page.evaluate(()=>{Cinematics.cancel('direction QA');UI.openEsc();});const restored=await campaign();if(restored!==origin){fs.writeFileSync(path.join(out,'campaign-before.json'),origin);fs.writeFileSync(path.join(out,'campaign-after.json'),restored);}check(restored===origin,d.id+' replay cannot write campaign or map');
   check(await page.evaluate(()=>Cinematics.cameraFrame()===null),'camera cleanup '+d.id);
  }
  // Contacts occur twice, with the shard withdrawing between them; cues agree.
  await start('ending_destroy');await page.evaluate(()=>{window.cues=[];const cue=Sfx.cinematicCue;Sfx.cinematicCue=(id)=>{cues.push({id,t:Cinematics.state.time});return cue(id);};});
  for(const t of [10.38,12.92]){await seek(t);check((await snapshot()).props.find(p=>p.kind==='heldShard').contactWeight>.999,'purposeful shard contact '+t);}
  await seek(11.2);check((await snapshot()).props.find(p=>p.kind==='heldShard').contactWeight<.01,'shard withdraws after the first strike');
  await seek(10.30);await page.evaluate(()=>{Cinematics.setPaused(false);Cinematics.tick(.08);Cinematics.setPaused(true);});
  check((await page.evaluate(()=>cues)).filter(c=>c.id==='fracture').length===1,'fracture sound at first contact');
  await seek(13.99);await page.evaluate(()=>{Cinematics.setPaused(false);Cinematics.tick(.02);Cinematics.setPaused(true);});
  check((await page.evaluate(()=>cues)).filter(c=>c.id==='coreBreak').length===1,'break sound at the shatter marker');
  await seek(22);check((await snapshot()).props.find(p=>p.kind==='core').breakAge===8,'fragments remain after dust clears');
  await seek(19.2);const raised=(await snapshot()).hand.lift;await seek(21.8);check((await snapshot()).hand.lift<raised-8,'hero lowers the striking hand in the aftermath');
  await seek(30);check((await snapshot()).world==='frosthaven_approach','live road-home aftermath');
  check(await page.evaluate(()=>Cinematics.renderClock===Game.state.time+Cinematics.state.time),'weather uses presentation time while simulation remains frozen');
  check(await page.evaluate(()=>{const s=Cinematics.__session(),c=Cinematics.cameraFrame();return [s.stage.hero,s.stage.focus].every(p=>{const x=(U.isoX(p.x,p.y)-U.isoX(c.x,c.y))*c.zoom+innerWidth*c.anchorX;return x>innerWidth*.06&&x<innerWidth*.94;});}),'road home frames both hero and Frosthaven gate');
  check(await page.evaluate(()=>!Cinematics.seek(NaN)&&!Cinematics.seek(Infinity)),'invalid seeking is rejected');
  // Every shot of each ending can be interrupted without retaining its world/quality/camera.
  for(const d of defs.filter(d=>d.ending))for(const shot of d.shots){
   await start(d.id);await seek(shot.at+.25);await page.evaluate(()=>{Cinematics.cancel('ending shot interruption');UI.openEsc();});
   check(await campaign()===origin,d.id+' interruption at '+shot.at+' preserves campaign');
   check(await page.evaluate(()=>Cinematics.presentationWorld===null&&Cinematics.cameraFrame()===null&&!document.body.classList.contains('cine-playing')),'ending cleanup at '+shot.at);
  }
  // All classes and forms, three gear tiers, both supported play layouts.
  const choices=['vanguard','emberwitch','gravebinder','veilranger','wildkeeper','form_fang','form_brute','form_stone','form_apex'];
  for(const viewport of [{width:1280,height:720},{width:844,height:390}]){
   await page.setViewportSize(viewport);
   for(const choice of choices)for(const tier of [0,4,7]){
    await page.evaluate(async({choice,tier})=>{
     Cinematics.cancel();UI.openEsc();const cls=choice.startsWith('form_')?'wildkeeper':choice,p=Game.coop.makeHero('Appearance QA',cls);Object.assign(p,{x:Game.state.player.x,y:Game.state.player.y});
     if(tier){const weapon={vanguard:'sword',emberwitch:'wand',gravebinder:'wand',wildkeeper:'staff2h',veilranger:'bow2h'}[cls];for(const [slot,id]of Object.entries({main:weapon+'_t'+tier,head:'helm_t'+tier,chest:'chest_t'+tier,gloves:'gloves_t'+tier,boots:'boots_t'+tier,belt:'belt_t'+tier,...(cls==='vanguard'?{off:'shield_t'+tier}:{})}))p.equip[slot]=Items.fromBase(id);}
     if(choice.startsWith('form_'))p.buffs=[{id:choice,ttl:1000}];await Game.coop.prepareHero(p);Game.state.player=p;Game.state.players=[p];
    },{choice,tier});
    const saved=await campaign();await start('ending_destroy');
    for(const t of [7.5,10.38,14.6,30]){await seek(t);const frame=await snapshot();check(Number.isFinite(frame.hand.lift),'physical hand/paw anchor '+choice);}
    await seek(10.38);const file=`${viewport.width}-${choice}-gear${tier}.png`;await page.screenshot({path:path.join(out,file)});
    const skip=await page.locator('.cine-skip').boundingBox();check(skip.width>=44&&skip.height>=44&&skip.x>=0&&skip.x+skip.width<=viewport.width,'reachable Skip '+choice);
    check(await page.evaluate(()=>Cinematics.__session().stage.hero.buffs.some(b=>b.id?.startsWith('form_'))===Game.state.player.buffs.some(b=>b.id?.startsWith('form_'))),'active form retained '+choice);
    await page.evaluate(()=>{Cinematics.cancel();UI.openEsc();});check(await campaign()===saved,'appearance replay isolation '+choice);appearances.push({choice,tier,viewport,file});
   }
  }
  // Fixed reduced-motion framing retains actions and all stage changes.
  for(const d of defs){await start(d.id,{reducedMotion:true});await seek(.5);const frame=await page.evaluate(()=>Cinematics.cameraFrame());const firstStage=d.shots.find(x=>x.stage&&x.stage!=='main')?.at||d.duration;
   await seek(Math.min(firstStage-.1,d.duration*.7));const later=await page.evaluate(()=>Cinematics.cameraFrame());check(frame.x===later.x&&frame.y===later.y&&frame.zoom===later.zoom,d.id+' fixed reduced framing');
   await seek(d.duration-.1);check(!(await page.evaluate(()=>Cinematics.state.fallback)),d.id+' reduced story action');await page.evaluate(()=>Cinematics.cancel());}
  check(await page.evaluate(()=>CinematicPresentation.frameCount===64),'all authored sprite cells registered');
  assert.deepEqual(errors,[]);checks++;
  // A genuinely missing atlas exercises the caption fallback and full cleanup.
  const failure=await browser.newPage();await failure.route('**/assets/cinematics/props.webp',r=>r.fulfill({status:404,body:''}));await failure.goto(base+'/index.html');await failure.waitForSelector('#titleMenu button',{timeout:120000});
  await failure.evaluate(async()=>{Sfx.setVol('master',0);await Game.newGame('Missing art QA','vanguard',false);await (await import('/tests/completed_hero_fixture.mjs')).loadCompletedHero(Game);UI.closeAll();Cinematics.request('ending_destroy',{replay:true});});await failure.waitForFunction(()=>Cinematics.state?.fallback);
  check((await failure.locator('.cine-caption').innerText()).includes('free'),'missing new artwork preserves transcript');await failure.getByRole('button',{name:'Continue',exact:true}).click();check(await failure.evaluate(()=>!Cinematics.playing&&Cinematics.cameraFrame()===null),'missing artwork cleanup');await failure.close();
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({checks,shots,appearances,errors},null,2));console.log(`PASS ${checks} cinematic direction checks; ${shots.length} repeatable shots, 54 class/form/equipment/layout combinations, contacts, sound cues, reduced motion, all ending interruptions and real missing-art fallback`);
 }catch(e){await page.screenshot({path:path.join(out,'failure.png')});throw e;}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
