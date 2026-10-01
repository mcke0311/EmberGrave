// Production campaign commits and trusted touch input, with isolated heroes/storage.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const runtime=path.join(process.env.USERPROFILE||'','.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=require(require.resolve('playwright',{paths:[__dirname,runtime]}));
const base=process.env.GAME_REVIEW_URL||'http://127.0.0.1:8741',out=path.join(__dirname,'../tmp/cinematics');
fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[];let checks=0,page;
 const ok=(value,message)=>{assert.ok(value,message);checks++;};
 async function create(options={}){
  const context=await browser.newContext({viewport:{width:1280,height:720},...options}),p=await context.newPage();
  p.on('pageerror',e=>errors.push(e.stack));
  await p.route(/\/js\/game\.js(?:\?|$)/,async route=>{
   const response=await route.fetch(),body=(await response.text()).replace('    init, newGame, loadGame,',
    '    __cineQA:{interactStory,beaconQuestKill,flush:dt=>{state.time+=dt;for(let i=delayed.length-1;i>=0;i--)if(state.time>=delayed[i].t){const fn=delayed[i].fn;delayed.splice(i,1);fn();}},input:()=>({mouse:{...mouse},touch:{...touch}})},\n    init, newGame, loadGame,');
   await route.fulfill({response,body});
  });
  await p.goto(base+'/index.html');await p.waitForSelector('#titleMenu button',{timeout:120000});
  await p.evaluate(async()=>{Sfx.setVol('master',0);await Game.newGame('Campaign Cinematic QA','vanguard',false);await (await import('/tests/completed_hero_fixture.mjs')).loadCompletedHero(Game);UI.closeAll();Game.debugFlags.god=true;});return p;
 }
 async function visit(zone){await page.evaluate(async zone=>{Cinematics.cancel('QA travel');if(Game.state.map.bossArena)Game.state.map.bossArena.sealed=false;Game.options.cinematics=false;await Game.enterMap(zone);Game.state.monsters=[];Game.state.fx=[];Game.state.projectiles=[];Game.options.cinematics=true;UI.closeAll();},zone);}
 async function scene(id){await page.waitForFunction(id=>Cinematics.state?.id===id&&Cinematics.state.ready,id,{timeout:60000});ok(await page.evaluate(()=>!Cinematics.state.fallback),id+' uses live artwork');}
 async function skip(){await page.getByRole('button',{name:'Skip scene',exact:true}).click();}
 try{
  page=await create();
  // Beacon destruction stages render-only warriors; real enemies appear once afterwards.
  await visit('north_wild');await page.evaluate(()=>{const s=Game.state;s.quests.q8b={state:'active',beacons:0};for(const a of s.map.frontier.anchors.beacons)Game.__cineQA.beaconQuestKill({defId:'beacon',beaconId:a.id,x:a.x,y:a.y});Game.__cineQA.flush(1);});
  await scene('oathsworn');ok(await page.evaluate(()=>!Game.state.monsters.some(m=>m.defId.startsWith('barb_'))),'trio combat waits');
  await skip();await page.waitForFunction(()=>Game.state.monsters.filter(m=>m.defId.startsWith('barb_')).length===3);
  await page.evaluate(()=>Cinematics.tick(100));ok(await page.evaluate(()=>Game.state.monsters.filter(m=>m.defId.startsWith('barb_')).length===3),'trio continuation runs exactly once');
  // Turn-in awards and the opened caravan route precede the ledger presentation.
  await visit('frosthaven');await page.evaluate(()=>{Game.state.quests.q9={state:'reward'};Game.completeQuest('q9');});await scene('ledger');
  const reward=await page.evaluate(()=>({gold:Game.state.player.gold,xp:Game.state.player.xp,points:Game.state.player.skillPts,inv:JSON.stringify(Game.state.player.inv)}));
  ok(await page.evaluate(()=>Game.state.quests.q9.state==='done'&&Game.state.shrines.includes('marshcamp')),'ledger follows committed quest reward and travel');
  await skip();await page.evaluate(()=>Game.completeQuest('q9'));assert.deepEqual(await page.evaluate(()=>({gold:Game.state.player.gold,xp:Game.state.player.xp,points:Game.state.player.skillPts,inv:JSON.stringify(Game.state.player.inv)})),reward);checks++;
  // Killing a boss cannot substitute for separately collecting its story object.
  for(const [zone,object,id,boss,prerequisite] of [['arena_mire_mother','mire_shard','mire_shard','mire_mother','q11'],['arena_azram','fortress_map','fortress_map','azram','q14']]){
   await visit(zone);await page.evaluate(({object,boss})=>{const s=Game.state;s.quests={};delete s.flags['dead_'+boss+'@0'];Game.__cineQA.interactStory(s.map.props.find(p=>p.storyId===object));},{object,boss});
   ok(await page.evaluate(id=>!Cinematics.state&&!Game.state.characterFlags.cinematics.unlocked[id],id),'live boss guards '+object);
   await page.evaluate(({object,boss,prerequisite})=>{const s=Game.state;s.flags['dead_'+boss+'@0']=true;s.quests[prerequisite]={state:'done'};Game.__cineQA.interactStory(s.map.props.find(p=>p.storyId===object));},{object,boss,prerequisite});await scene(id);
   ok(await page.evaluate(object=>DATA.CAMPAIGN.found(Game.state,Game.state.map.id,object),object),object+' collected before playback');
   await skip();const journal=await page.evaluate(()=>JSON.stringify(Game.state.flags.campaign));await page.evaluate(object=>Game.__cineQA.interactStory(Game.state.map.props.find(p=>p.storyId===object)),object);ok(await page.evaluate(()=>JSON.stringify(Game.state.flags.campaign))===journal,'recollection does not duplicate '+object);
  }
  await visit('sand_tombs');await page.evaluate(()=>{const s=Game.state;s.quests.q14={state:'active'};Game.__cineQA.interactStory(s.npcs.find(n=>n.storyId==='imprisoned_scholar'));});await scene('ilyan');
  ok(await page.evaluate(()=>!Game.state.npcs.some(n=>n.storyId==='imprisoned_scholar')&&DATA.CAMPAIGN.found(Game.state,'sand_tombs','imprisoned_scholar')),'Ilyan rescue committed and staged from removed NPC');await skip();
  // Wards must reject both premature arenas and introductions.
  await page.evaluate(()=>{Game.state.quests.q16={state:'active'};Game.state.quests.q17={state:'active'};});
  ok(await page.evaluate(async()=>!(await Game.enterMap('arena_empty_archangel'))),'soul ward rejects premature entry');
  ok(await page.evaluate(async()=>!(await Game.enterMap('arena_malthoron'))),'seals, sword and priests reject premature entry');
  // A valid portal waits, commits q17 once, then enters the ordinary destination.
  await page.evaluate(()=>{Game.state.quests.q16={state:'done'};Game.state.quests.q17={state:'done'};});await visit('arena_malthoron');
  await page.evaluate(()=>{const s=Game.state;s.flags['dead_malthoron@0']=true;s.quests.q17={state:'done'};delete s.characterFlags.cinematics.seen.breach;Game.__cineQA.interactStory(s.map.props.find(p=>p.storyId==='hell_portal'));});await scene('hell_portal');
  ok(await page.evaluate(()=>Game.state.map.id==='arena_malthoron'),'portal travel is deferred until the scene ends');await skip();await scene('breach');ok(await page.evaluate(()=>Game.state.map.id==='hellgate'&&Game.state.quests.q17.state==='done'),'portal resumes normal committed travel');await skip();
  // An interrupted scene keeps its unlock; loading an unchosen finale restores the choice.
  await page.evaluate(()=>{Game.state.flags['dead_vethriss@0']=true;Game.state.quests.q18={state:'reward'};Game.saveGame();window.qaSlot=Game.listSaves().find(s=>s.name==='Campaign Cinematic QA').slot;Game.saveAndQuit();});
  await page.evaluate(async()=>{await Game.loadGame(qaSlot);});ok(await page.locator('.choicebtn').count()===3,'unchosen finale restored on load');
  await page.keyboard.press('Escape');ok(await page.evaluate(()=>!Game.state.flags.ending),'Escape cannot select an ending');await page.evaluate(()=>UI.closeEsc());
  await page.getByRole('button',{name:/Seal It Away/}).click();await scene('ending_seal');
  const committed=await page.evaluate(()=>{const d=JSON.parse(localStorage.getItem(qaSlot));return {ending:d.campaignsByDifficulty[0].flags.ending,unlock:d.characterFlags.cinematics.unlocked.ending_seal,difficulty:d.unlockedDiff};});
  ok(committed.ending==='seal'&&committed.unlock&&committed.difficulty>=1,'ending and unlock saved before completion');
  await page.evaluate(()=>Game.saveAndQuit());await page.evaluate(async()=>{await Game.loadGame(qaSlot);});
  ok(await page.evaluate(()=>Game.state.flags.ending==='seal'&&Game.state.characterFlags.cinematics.unlocked.ending_seal),'selected finale survives interruption and reload');
  // The library reveals the chosen ending only; production replay never changes a save.
  await page.evaluate(()=>Cinematics.openLibrary());ok(await page.getByRole('button',{name:'Replay Seal It Away',exact:true}).count()===1,'chosen ending is replayable');
  ok(await page.getByRole('button',{name:'Replay Give It to Seraneth',exact:true}).count()===0,'unchosen ending stays locked');
  await page.getByText('Read transcript',{exact:true}).first().click();ok(await page.locator('.cine-transcript[open]').count()===1,'transcript opens');
  const save=await page.evaluate(()=>localStorage.getItem(qaSlot));await page.getByRole('button',{name:'Replay Seal It Away',exact:true}).click();await scene('ending_seal');await skip();ok(await page.evaluate(()=>localStorage.getItem(qaSlot))===save,'library replay cannot write campaign or hero');
  await page.context().close();
  // Real touch hardware and the production mobile shell, across small/large phones.
  page=await create({viewport:{width:844,height:390},screen:{width:844,height:390},hasTouch:true,isMobile:true});await page.emulateMedia({reducedMotion:'reduce'});
  ok(await page.evaluate(()=>MobileControls.enabled&&!MobileShell.blocked),'touch landscape enabled');
  const client=await page.context().newCDPSession(page),stick=await page.locator('#mobileMoveZone').boundingBox();
  await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:stick.x+stick.width/2,y:stick.y+stick.height/2,radiusX:3,radiusY:3,force:1}]});
  await page.evaluate(()=>{Cinematics.request('quieting',{replay:true});});await scene('quieting');
  ok(await page.evaluate(()=>{const i=Game.__cineQA.input(),p=Game.state.player;return !i.touch.side&&!i.touch.x&&!i.touch.y&&!i.mouse.l&&!p.command&&!p.path;}),'scene clears held thumbstick and mouse commands');
  ok(await page.locator('#mobileControls').isHidden(),'touch controls hidden during playback');
  const camera=await page.evaluate(()=>Cinematics.cameraTarget());await page.evaluate(()=>Cinematics.tick(7));assert.deepEqual(await page.evaluate(()=>Cinematics.cameraTarget()),camera);checks++;
  await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  for(const [width,height] of [[844,390],[568,320]]){
   await page.setViewportSize({width,height});await page.waitForTimeout(80);const r=await page.locator('.cine-skip').boundingBox(),c=await page.locator('.cine-caption').boundingBox();
   ok(r.width>=44&&r.height>=44&&r.x>=0&&r.y>=0&&r.x+r.width<=width&&c.y>=0&&c.y+c.height<=height,'safe readable scene controls '+width);await page.screenshot({path:out+'/touch-'+width+'.png'});
  }
  await page.getByRole('button',{name:'Skip scene',exact:true}).tap();ok(await page.evaluate(()=>!Cinematics.active&&!Game.state.player.command),'trusted skip cannot become a movement tap');
  await page.locator('#mobileControls').waitFor({state:'visible'});ok(await page.locator('#mobileControls').isVisible(),'touch controls restored');
  for(const cls of ['vanguard','emberwitch','gravebinder','veilranger','wildkeeper']){
   await page.evaluate(async cls=>{const s=Game.state,p=Game.coop.makeHero('Touch Appearance QA',cls);Object.assign(p,{x:s.player.x,y:s.player.y});await Game.coop.prepareHero(p);s.player=p;s.players=[p];Cinematics.request('ending_give',{replay:true});},cls);await scene('ending_give');
   await page.evaluate(()=>{Cinematics.tick(10);Cinematics.setPaused(true);});await page.waitForTimeout(80);ok(await page.locator('#appFatal').count()===0,'phone hero '+cls);await page.screenshot({path:out+'/phone-hero-'+cls+'.png'});await page.getByRole('button',{name:'Skip scene',exact:true}).tap();
  }
  for(const form of ['form_fang','form_brute','form_stone','form_apex']){
   await page.evaluate(form=>{Game.state.player.buffs=[{id:form,ttl:1000}];Cinematics.request('ending_seal',{replay:true});},form);await scene('ending_seal');
   await page.evaluate(()=>{Cinematics.tick(13);Cinematics.setPaused(true);});await page.waitForTimeout(80);ok(await page.locator('#appFatal').count()===0,'phone form '+form);await page.screenshot({path:out+'/phone-'+form+'.png'});await page.getByRole('button',{name:'Skip scene',exact:true}).tap();
  }
  assert.deepEqual(errors,[]);checks++;
  fs.writeFileSync(out+'/progression.json',JSON.stringify({checks,errors},null,2));console.log(`PASS ${checks} cinematic progression/touch checks: beacons, rewards, separate objects, rescue, wards, portal, save/load, ending locks, transcripts and held touch cleanup`);
 }catch(e){if(page){await page.screenshot({path:out+'/progression-failure.png'});console.error(await page.evaluate(()=>({scene:Cinematics.state,map:Game.state?.map?.id,ending:Game.state?.flags?.ending})));}throw e;}
 finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
