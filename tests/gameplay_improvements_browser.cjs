// Isolated browser checks. Set NODE_PATH to the runtime's node_modules if needed.
const {chromium}=require('playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
const root=process.env.GAME_REVIEW_URL||'http://127.0.0.1:8755',dest='tests/qa/gameplay_improvements';
fs.mkdirSync(dest,{recursive:true});
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage({viewport:{width:1366,height:900}});
 const report={errors:[],missing:[],checks:0};const ok=(v,m)=>{report.checks++;assert.ok(v,m);};
 page.on('pageerror',e=>report.errors.push(String(e)));page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))report.missing.push(r.url());});
 try{
  await page.goto(root+'/index.html');await page.waitForSelector('#titleMenu button',{timeout:90000});
  await page.evaluate(async()=>{Sfx.setVol('master',0);await Game.newGame('Waystone Review','wildkeeper',false);await (await import('/tests/completed_hero_fixture.mjs')).loadCompletedHero(Game);UI.closeAll();Game.debugFlags.god=true;Game.state.monsters=[];Game.state.shrines.push('north_wild');UI.openShrine();});
  ok(await page.locator('.wp-tab').count()===5,'five campaign act tabs');
  ok(await page.locator('.wp-tab[aria-selected=true]').innerText()==='Act I','current act selected');
  ok(await page.locator('.wp-travel').isDisabled(),'current location cannot travel');
  await page.getByRole('button',{name:'The Abandoned Mines, Not attuned',exact:true}).click();
  ok(await page.locator('.wp-travel').isDisabled(),'locked destination cannot travel');
  await page.getByRole('button',{name:'The Fallen North, Attuned',exact:true}).click();
  ok(await page.locator('.wp-travel').isEnabled(),'attuned travel enabled');
  await page.screenshot({path:dest+'/waypoints-desktop.png'});
  await page.getByRole('tab',{name:'Act I',exact:true}).focus();await page.keyboard.press('ArrowRight');
  ok(await page.locator('.wp-tab[aria-selected=true]').innerText()==='Act II','keyboard changes acts');
  await page.keyboard.press('Home');ok(await page.locator('.wp-tab[aria-selected=true]').innerText()==='Act I','Home selects first act');
  await page.setViewportSize({width:640,height:900});await page.screenshot({path:dest+'/waypoints-narrow.png'});
  const fits=await page.locator('.waypoint-panel').evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth;});ok(fits,'narrow menu fits viewport');
  await page.setViewportSize({width:1366,height:900});await page.getByRole('button',{name:'The Fallen North, Attuned',exact:true}).click();
  await page.route('**/assets/sprites/packed/**',route=>route.continue());
  // Defer/fail the real loader without changing the travel implementation.
  await page.evaluate(()=>{window.realBundleLoader=SpriteAssets.loadBundle;SpriteAssets.loadBundle=async()=>{throw Error('review load failure');};});
  await page.locator('.wp-travel').click();await page.waitForFunction(()=>document.querySelector('.wp-status')?.textContent.includes('Try again'));
  ok(await page.evaluate(()=>Game.state.map.id)==='frosthaven','failure retains source');
  await page.evaluate(()=>{SpriteAssets.loadBundle=window.realBundleLoader;});await page.locator('.wp-travel').click();
  await page.waitForFunction(()=>Game.state.map.id==='north_wild'&&document.getElementById('panelCenter').classList.contains('hidden'));
  ok(true,'successful travel closes panel');
  await page.evaluate(async()=>{await Game.enterMap('frosthaven','default');UI.closeAll();const n=Game.state.npcs.find(n=>n.id==='hewn');if(n){Game.state.player.x=n.x+1;Game.state.player.y=n.y+1;}});
  await page.screenshot({path:dest+'/vendor-markers.png'});
  await page.evaluate(()=>{UI.openShrine();});await page.keyboard.press('Escape');ok(await page.locator('#panelCenter').evaluate(el=>el.classList.contains('hidden')),'Escape closes menu');
  await page.evaluate(()=>{const p=Game.state.player;p.skills.call_wolf=1;p.computeStats();p.mana=p.stats.maxMana;const m=new Minion('wolf',{hp:100,dmg:[1,2],speed:3,atkRate:1,range:1,sprite:'wolf'},p);m.sourceSkill='call_wolf';Game.state.minions.push(m);});
  await page.waitForFunction(()=>document.getElementById('companionUpkeep')?.textContent==='−1/s companions');
  for(const width of [1366,640]){
   await page.setViewportSize({width,height:900});
   ok(await page.locator('#companionUpkeep').evaluate(el=>{const r=el.getBoundingClientRect(),foot=el.parentElement.querySelector('.orb-foot').getBoundingClientRect();return !el.hidden&&r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight&&r.bottom<=foot.top;}),'companion upkeep visible without overlapping aether label at '+width);
   await page.screenshot({path:dest+'/companion-upkeep-'+width+'.png'});
  }
  await page.setViewportSize({width:1366,height:900});
  let releaseAudio;const audioGate=new Promise(r=>releaseAudio=r);let audioRequests=0;
  await page.route('**/interactions/*.wav',async route=>{audioRequests++;await audioGate;await route.continue();});
  await page.goto(root+'/tests/interaction_audio_review.html');await page.click('#enable');
  await page.evaluate(()=>{Sfx.play('questCompleted');Sfx.loadInteractionSounds();});
  ok(await page.evaluate(()=>Sfx.interactionStats.voices===0),'undecoded events are dropped');releaseAudio();
  await page.waitForFunction(()=>Sfx.interactionStats.loaded===6);
  ok(await page.evaluate(()=>Sfx.interactionStats.voices===0),'loading does not replay stale events');
  await page.evaluate(()=>Sfx.loadInteractionSounds());ok(audioRequests===6,'one fetch/decode per cue');
  ok(await page.locator('#state').innerText()==='6 cues ready','all audio decoded');
  await page.evaluate(()=>{for(let i=0;i<10;i++)Sfx.play('teleportTravel');});
  ok(await page.evaluate(()=>Sfx.interactionStats.voices)<=2,'rapid cues bounded');
  await page.evaluate(()=>Sfx.setVol('sfx',0));const voices=await page.evaluate(()=>Sfx.interactionStats.voices);await page.evaluate(()=>Sfx.play('questCompleted'));
  ok(await page.evaluate(()=>Sfx.interactionStats.voices)<=voices,'muted cue does not start');
  await page.screenshot({path:dest+'/audio-studio.png'});
  ok(!report.errors.length,'no browser errors: '+report.errors.join(';'));ok(!report.missing.length,'no missing assets');report.status='PASS';
 }finally{fs.writeFileSync(dest+'/browser.json',JSON.stringify(report,null,2)+'\n');await browser.close();}
 console.log(JSON.stringify(report));
})().catch(e=>{console.error(e);process.exitCode=1;});
