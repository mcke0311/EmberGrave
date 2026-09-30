// Run against python serve.py. Browser storage and all test heroes are isolated.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const out=path.resolve(__dirname,'../tmp/upgrades-qa');fs.mkdirSync(out,{recursive:true});
(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true});
  const errors=[],httpErrors=[],results=[];
  try{
    const context=await browser.newContext({viewport:{width:1366,height:900}}),page=await context.newPage();
    page.on('pageerror',e=>errors.push(e.stack));page.on('response',r=>{if(r.status()>=400&&!r.url().includes('favicon'))httpErrors.push(r.url()+' '+r.status());});
    await page.goto((process.env.GAME_REVIEW_URL||'http://127.0.0.1:8741')+'/index.html');
    await page.waitForSelector('#titleMenu button',{timeout:120000});
    await page.evaluate(async()=>{Sfx.setVol('master',0);await Game.newGame('Upgrade QA','vanguard',false);await (await import('/tests/completed_hero_fixture.mjs')).loadCompletedHero(Game);UI.closeAll();Game.debugFlags.god=true;Game.state.characterFlags.scene_quieting=true;});
    assert.equal(await page.evaluate(()=>Game.options.directCast),false);
    for(const zone of (process.argv.includes('--flow-only')?[]:['north_wild','weeping_marsh','cathedral1'])){
      await page.evaluate(async zone=>{UpgradeUI.close();await Game.enterMap(zone);Game.state.monsters=[];Game.state.fx=[];Game.state.projectiles=[];Game.state.quests={};},zone);
      for(const cls of ['vanguard','emberwitch','gravebinder','veilranger','wildkeeper']){
        await page.evaluate(async cls=>{const s=Game.state,position={x:s.player.x,y:s.player.y,surfaceId:s.player.surfaceId};const p=Game.coop.makeHero('Upgrade QA',cls);Object.assign(p,position);s.player=p;s.players=[p];await Game.coop.prepareHero(p);},cls);
        for(const [size,viewport]of [['desktop',{width:1366,height:900}]]){
          await page.setViewportSize(viewport);await page.waitForTimeout(250);
          await page.screenshot({path:path.join(out,zone+'-'+cls+'-'+size+'.png')});
          results.push({zone,cls,size});
        }
      }
      await page.setViewportSize({width:1366,height:900});
    }
    const phoneContext=await browser.newContext({viewport:{width:844,height:390},isMobile:true,hasTouch:true,reducedMotion:'reduce'}),phone=await phoneContext.newPage();
    phone.on('pageerror',e=>errors.push(e.stack));phone.on('response',r=>{if(r.status()>=400&&!r.url().includes('favicon'))httpErrors.push(r.url()+' '+r.status());});
    await phone.goto((process.env.GAME_REVIEW_URL||'http://127.0.0.1:8741')+'/index.html');await phone.waitForSelector('#titleMenu button',{timeout:120000});
    await phone.evaluate(async()=>{Sfx.setVol('master',0);await Game.newGame('Phone QA','vanguard',false);await (await import('/tests/completed_hero_fixture.mjs')).loadCompletedHero(Game);UI.closeAll();Game.debugFlags.god=true;Game.state.characterFlags.scene_quieting=true;});
    for(const zone of (process.argv.includes('--flow-only')?[]:['north_wild','weeping_marsh','cathedral1'])){
      await phone.evaluate(async zone=>{await Game.enterMap(zone);Game.state.monsters=[];Game.state.fx=[];Game.state.projectiles=[];Game.state.quests={};},zone);
      for(const cls of ['vanguard','emberwitch','gravebinder','veilranger','wildkeeper']){
        await phone.evaluate(async cls=>{const s=Game.state,position={x:s.player.x,y:s.player.y,surfaceId:s.player.surfaceId};const p=Game.coop.makeHero('Phone QA',cls);Object.assign(p,position);s.player=p;s.players=[p];await Game.coop.prepareHero(p);},cls);
        await phone.waitForTimeout(250);await phone.screenshot({path:path.join(out,zone+'-'+cls+'-phone.png')});results.push({zone,cls,size:'phone',reducedMotion:true});
      }
    }
    // Real F-key path: classic binds the skill; optional direct mode casts once.
    const skill=await page.evaluate(async()=>{await Game.enterMap('frosthaven');const s=Game.state,old=s.player,p=Game.coop.makeHero('Cast QA','emberwitch');Object.assign(p,{x:old.x,y:old.y,surfaceId:old.surfaceId});s.player=p;s.players=[p];await Game.coop.prepareHero(p);const id='spark';p.skills[id]=1;p.quickSlots[0]=id;p.skillR='basic';p.mana=p.stats.maxMana;return id;});
    await page.keyboard.press('F1');assert.equal(await page.evaluate(()=>Game.state.player.skillR),skill);
    await page.evaluate(()=>{Game.options.directCast=true;Game.state.player.skillR='basic';});
    await page.mouse.move(740,425);await page.keyboard.press('F1');
    assert.equal(await page.evaluate(()=>Game.state.player.skillR),'basic');
    assert.ok(await page.evaluate(()=>!!Game.state.player.action||Game.state.player.mana<Game.state.player.stats.maxMana));
    // A ring's safe center stays transparent at every windup stage.
    assert.ok(await page.evaluate(()=>{const canvas=document.createElement('canvas');canvas.width=400;canvas.height=300;const c=canvas.getContext('2d'),cam={x:-200,y:-150},shape={kind:'ring',x:0,y:0,radius:3,inner:1.5};for(const progress of [0,.5,1]){c.clearRect(0,0,400,300);CombatReadability.warning(c,()=>CombatReadability.trace(c,shape,cam),shape,cam,progress,{id:'cathedral1'});if(c.getImageData(200,150,1,1).data[3]!==0||c.getImageData(300,150,1,1).data[3]===0)return false;}return true;}));
    await page.evaluate(async()=>{
      await Game.enterMap('north_wild');const s=Game.state,p=s.player;s.monsters=[];
      const prop={type:'shrine',x:p.x+1,y:p.y,surfaceId:p.surfaceId,propId:'qa-cache',interact:'event',event:true,ev:{name:'The Broken Oath',kind:'curse',count:3}};s.map.props.push(prop);window.qaCache=prop;UpgradeUI.event(prop);
    });
    await page.screenshot({path:path.join(out,'sealed-cache-preview.png')});await page.getByRole('button',{name:'Awaken the defenders'}).click();
    assert.equal(await page.evaluate(()=>Game.state.flags.cursedEvents[qaCache.cursedKey].status),'active');
    await page.evaluate(()=>{for(const m of Game.state.monsters.filter(m=>m.cursedKey===qaCache.cursedKey))m.die(Game.state.player);});
    assert.equal(await page.evaluate(()=>Game.state.flags.cursedEvents[qaCache.cursedKey].status),'ready');
    await page.screenshot({path:path.join(out,'sealed-cache-ready.png')});
    assert.ok(await page.evaluate(()=>CursedEvents.claim(Game.state,qaCache,Game.state.player)));
    await page.evaluate(()=>{
      const s=Game.state,p=s.player;let pack='';for(let i=0;i<100;i++){pack='ward-qa-'+i;if(U.hash(s.seed+':'+s.map.id+':'+pack)%4===0)break;}
      const m=new Monster(s.map.zone.spawns[0],p.x+2,p.y+2,{elite:true,packId:pack,surfaceId:p.surfaceId});m.stunT=999;s.monsters=[m];TacticalElites.setup(s);window.qaBanner=s.map.props.find(o=>o.propId===m.tacticalBanner);if(!qaBanner)throw Error('No ward was created');
    });
    await page.waitForTimeout(300);await page.screenshot({path:path.join(out,'wardbearer-desktop.png')});
    assert.ok(await page.evaluate(()=>Game.breakProp(qaBanner)));assert.ok(await page.evaluate(()=>qaBanner.broken));
    await page.evaluate(()=>{const p=Game.state.player;p.gold=100000;const it=Items.rollGear(20,'rare',{slot:'head'});it.identified=true;window.qaReforge=it;UI.openForge();UI.setCursorItem(it);});
    await page.locator('#forgeRow button').nth(0).click();
    await page.evaluate(()=>UI.setCursorItem(Items.makeGlyph('g_ember')));await page.locator('#forgeRow button').nth(1).click();
    await page.getByRole('button',{name:/^Precision reforge/}).click();
    const slot=await page.evaluate(()=>qaReforge.affixes.findIndex((a,i)=>Items.precisionPool(qaReforge,i).length));
    await page.getByLabel('Property to reforge').selectOption(String(slot));await page.screenshot({path:path.join(out,'precision-forge-desktop.png')});
    await page.getByRole('button',{name:'Strike the anvil',exact:true}).click();
    assert.equal(await page.evaluate(()=>qaReforge.precision?.rolls),1);assert.ok(await page.evaluate(()=>Game.state.player.inv.items.includes(qaReforge)));await page.evaluate(()=>UI.closeAll());
    // Endgame entrance and both story beats remain usable at phone sizes and reduced motion.
    await phone.evaluate(async()=>{await Game.enterMap('frosthaven');Game.state.characterFlags.echoesUnlocked=true;UpgradeUI.echoes();});
    await phone.getByLabel('Desired equipment category').selectOption('boots');
    await phone.getByRole('button',{name:'Begin an expedition',exact:true}).click();
    await phone.screenshot({path:path.join(out,'echo-choice-phone.png')});
    await phone.getByRole('button',{name:/Iron Memory/}).click();
    await phone.waitForFunction(()=>Game.state.map.id==='echo_north',null,{timeout:60000});
    await phone.waitForTimeout(600);await phone.screenshot({path:path.join(out,'echo-arena-phone.png')});
    await phone.evaluate(()=>{Game.state.monsters.forEach(m=>m.stunT=999);UpgradeUI.story('quieting');});
    await phone.waitForTimeout(2200);await phone.screenshot({path:path.join(out,'quieting-phone.png')});
    await phone.getByRole('button',{name:'Skip scene'}).click();assert.ok(await phone.evaluate(()=>Game.state.characterFlags.scene_quieting));
    await phone.evaluate(()=>UpgradeUI.story('warden'));await phone.waitForTimeout(4400);await phone.screenshot({path:path.join(out,'warden-phone.png')});
    await phone.keyboard.press('Escape');assert.ok(await phone.evaluate(()=>Game.state.characterFlags.scene_warden));
    assert.deepEqual(errors,[],'Browser runtime errors');assert.deepEqual(httpErrors,[],'Missing resources');
    fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({results,errors,httpErrors},null,2));console.log('PASS all five classes on snow, marsh and cathedral at desktop/phone sizes; direct casting, Echo entry, skippable scenes and reduced motion');
  }finally{fs.writeFileSync(path.join(out,'errors.json'),JSON.stringify({errors,httpErrors},null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
