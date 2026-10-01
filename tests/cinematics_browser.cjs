/* Real renderer, hero models, terrain, input and production scene lifecycles. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const runtime=path.join(process.env.USERPROFILE||'','.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=require(require.resolve('playwright',{paths:[__dirname,runtime]}));
const base=process.env.GAME_REVIEW_URL||'http://127.0.0.1:8741',out=path.join(__dirname,'../tmp/cinematics');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[],httpErrors=[],results=[];
 let checks=0,page;
 try{
  const context=await browser.newContext({viewport:{width:1280,height:720}});page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.stack));page.on('response',r=>{if(r.status()>=400&&!r.url().includes('favicon'))httpErrors.push(r.url()+' '+r.status());});
  await page.goto(base+'/index.html');await page.waitForSelector('#titleMenu button',{timeout:120000});
  await page.evaluate(async()=>{Sfx.setVol('master',0);await Game.newGame('Cinematic QA','vanguard',false);await (await import('/tests/completed_hero_fixture.mjs')).loadCompletedHero(Game);UI.closeAll();Game.debugFlags.god=true;});
  await page.evaluate(()=>Cinematics.openLibrary());
  const baseline=await page.evaluate(()=>({saves:JSON.stringify({...localStorage}),flags:JSON.stringify(Game.state.flags),quests:JSON.stringify(Game.state.quests),map:Game.state.map.id,time:Game.state.time,hp:Game.state.player.hp,mana:Game.state.player.mana}));
  const scenes=await page.evaluate(()=>CinematicScenes.all.map(d=>({id:d.id,duration:d.duration})));
  assert.equal(scenes.length,20);checks++;
  for(const d of scenes){
   await page.evaluate(id=>{window.sceneResult=null;Cinematics.request(id,{replay:true}).then(r=>sceneResult=r);},d.id);
   await page.waitForFunction(()=>Cinematics.state?.ready,{timeout:60000});
   const state=await page.evaluate(()=>Cinematics.state);assert.equal(state.fallback,false,d.id+': '+state.error);checks++;
   await page.evaluate(duration=>{Cinematics.tick(duration*.4);Cinematics.setPaused(true);},d.duration);
   await page.waitForTimeout(120);assert.equal(await page.locator('#appFatal').count(),0,d.id+' fatal');checks++;
   await page.screenshot({path:out+'/'+d.id+'.png'});
   const during=await page.evaluate(()=>({time:Game.state.time,hp:Game.state.player.hp,mana:Game.state.player.mana,map:Game.state.map.id}));
   assert.deepEqual(during,{time:baseline.time,hp:baseline.hp,mana:baseline.mana,map:baseline.map});checks++;
   await page.getByRole('button',{name:'Skip scene',exact:true}).click();await page.waitForFunction(()=>sceneResult!==null);assert.equal(await page.evaluate(()=>sceneResult),'skipped');checks++;
   assert.equal(await page.evaluate(()=>document.body.classList.contains('cine-playing')),false);checks++;
   const after=await page.evaluate(()=>({saves:JSON.stringify({...localStorage}),flags:JSON.stringify(Game.state.flags),quests:JSON.stringify(Game.state.quests)}));
   assert.equal(after.saves,baseline.saves);assert.equal(after.flags,baseline.flags);assert.equal(after.quests,baseline.quests);checks+=3;results.push({id:d.id,ready:true,fallback:false});
  }
  // Natural completion and duplicate requests cannot run a continuation twice.
  await page.evaluate(()=>{window.completions=0;Cinematics.request('korvath',{replay:true}).then(()=>completions++);});await page.waitForFunction(()=>Cinematics.state?.ready);
  assert.equal(await page.evaluate(()=>Cinematics.request('azram',{replay:true})), 'cancelled');checks++;
  await page.evaluate(()=>Cinematics.tick(100));await page.waitForFunction(()=>completions===1);checks++;
  // Presentation failures carry the entire transcript and still release the game.
  await page.evaluate(()=>{Cinematics.request('mire_shard',{replay:true,missingAsset:true});});await page.waitForFunction(()=>Cinematics.state?.fallback);
  assert.ok((await page.locator('.cine-caption').innerText()).includes('Khal-Zahir'));await page.getByRole('button',{name:'Continue',exact:true}).click();checks++;
  // Actual boss activation waits for its introduction, then obeys the arena lifecycle.
  await page.evaluate(async()=>{Game.options.cinematics=false;await Game.enterMap('arena_korvath');Game.options.cinematics=true;const s=Game.state,a=s.map.bossArena;s.player.x=a.cx+2;s.player.y=a.cy+5;s.player.hp=s.player.stats.maxHp;});
  await page.waitForFunction(()=>Cinematics.state?.id==='korvath'&&Cinematics.state.ready);
  assert.equal(await page.evaluate(()=>Game.state.monsters.find(m=>m.defId==='korvath').encounter.active),false);checks++;
  const frozen=await page.evaluate(()=>Game.state.time);await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>Game.state.time),frozen);checks++;
  await page.keyboard.press('Escape');await page.waitForFunction(()=>Game.state.monsters.find(m=>m.defId==='korvath').encounter.active);checks++;
  assert.equal(await page.evaluate(()=>Game.state.characterFlags.cinematics.seen.korvath),true);checks++;
  // Every class and each Wildkeeper form uses the same live hero renderer.
  for(const cls of ['vanguard','emberwitch','gravebinder','veilranger','wildkeeper']){
   await page.evaluate(async cls=>{Cinematics.cancel();if(Game.state.map.bossArena)Game.state.map.bossArena.sealed=false;await Game.enterMap('frosthaven');const p=Game.coop.makeHero('Appearance QA',cls);await Game.coop.prepareHero(p);Object.assign(p,{x:Game.state.player.x,y:Game.state.player.y});Game.state.player=p;Game.state.players=[p];Cinematics.request('ending_destroy',{replay:true});},cls);
   await page.waitForFunction(()=>Cinematics.state?.ready);await page.evaluate(()=>{Cinematics.tick(10);Cinematics.setPaused(true);});await page.waitForTimeout(80);
   assert.equal(await page.evaluate(()=>Cinematics.state.fallback),false);assert.equal(await page.locator('#appFatal').count(),0);checks+=2;await page.screenshot({path:out+'/hero-'+cls+'.png'});await page.keyboard.press('Escape');
  }
  for(const form of ['form_fang','form_brute','form_stone','form_apex']){
   await page.evaluate(form=>{Game.state.player.buffs=[{id:form,ttl:1000}];Cinematics.request('ending_seal',{replay:true});},form);await page.waitForFunction(()=>Cinematics.state?.ready);await page.evaluate(()=>{Cinematics.tick(13);Cinematics.setPaused(true);});await page.waitForTimeout(80);assert.equal(await page.evaluate(()=>Cinematics.state.fallback),false);checks++;await page.screenshot({path:out+'/'+form+'.png'});await page.keyboard.press('Escape');
  }
  // Touch layout, fixed reduced-motion framing, keyboard focus and durable endings.
  await page.setViewportSize({width:844,height:390});await page.emulateMedia({reducedMotion:'reduce'});
  await page.evaluate(()=>{Game.state.player.buffs=[];Cinematics.request('quieting',{replay:true});});await page.waitForFunction(()=>Cinematics.state?.ready);await page.waitForTimeout(250);
  const fixed=await page.evaluate(()=>Cinematics.cameraTarget());await page.evaluate(()=>Cinematics.tick(7));assert.deepEqual(await page.evaluate(()=>Cinematics.cameraTarget()),fixed);checks++;
  const skip=await page.locator('.cine-skip').boundingBox();assert.ok(skip.width>=44&&skip.height>=44&&skip.x>=0&&skip.x+skip.width<=844);checks++;await page.screenshot({path:out+'/phone-quieting.png'});await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.classList.contains('cine-skip')),true);checks++;await page.keyboard.press('Escape');
  await page.evaluate(()=>{Game.state.flags['dead_vethriss@0']=true;Game.state.quests.q18={state:'reward'};UI.openFinalChoice();});
  await page.getByRole('button',{name:/Give It to Seraneth/}).click();
  assert.equal(await page.evaluate(()=>Game.state.flags.ending),'give');assert.ok(await page.evaluate(()=>Game.state.unlockedDiff>=1));checks+=2;
  await page.keyboard.press('Escape');await page.getByRole('button',{name:'Return to title',exact:true}).waitFor();checks++;
  assert.equal(await page.evaluate(()=>Game.state.characterFlags.cinematics.unlocked.ending_destroy),undefined);checks++;
  assert.deepEqual(errors,[]);assert.deepEqual(httpErrors,[]);checks+=2;
  fs.writeFileSync(out+'/results.json',JSON.stringify({checks,results,errors,httpErrors},null,2));console.log(`PASS ${checks} cinematic browser checks; 20 scenes, five classes, forms, pause, replay isolation, skip, fallback, phone and ending durability`);
 }catch(e){if(page){await page.screenshot({path:out+'/failure.png'});console.error(await page.evaluate(()=>({cine:typeof Cinematics!=='undefined'?Cinematics.state:null,fatal:document.querySelector('#appFatalDetail')?.textContent})));}throw e;}
 finally{fs.writeFileSync(out+'/errors.json',JSON.stringify({errors,httpErrors},null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
