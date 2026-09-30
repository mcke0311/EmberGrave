// Four real clients, a local relay, and the production authoritative worker.
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createRelay}=require('../server/relay.cjs');
const {installWorkerBridge,hostState}=require('./coop_browser_helpers.cjs');
const out=path.resolve(__dirname,'../tmp/upgrades-qa');fs.mkdirSync(out,{recursive:true});
(async()=>{
  const relay=createRelay();await new Promise(resolve=>relay.server.listen(0,'127.0.0.1',resolve));
  const relayUrl='ws://127.0.0.1:'+relay.server.address().port+'/ws';
  const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding']}),pages=[],errors=[];
  try{
    for(let i=0;i<4;i++){
      const context=await browser.newContext(i===3?{viewport:{width:844,height:390},isMobile:true,hasTouch:true,reducedMotion:'reduce'}:{viewport:{width:1366,height:900}});
      await installWorkerBridge(context);await context.addInitScript(url=>{window.COOP_CONFIG={relayUrl:url};localStorage.setItem('embergrave_options',JSON.stringify({vol:{master:0,music:0,sfx:0}}));},relayUrl);
      const page=await context.newPage();page.on('pageerror',e=>errors.push(e.stack));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});pages.push(page);
      await page.goto((process.env.GAME_REVIEW_URL||'http://127.0.0.1:8741')+'/index.html');await page.waitForSelector('#titleMenu button',{timeout:120000});
    }
    const host=pages[0],code=await host.evaluate(async()=>{const h=await Coop.newHero('Echo leader','emberwitch');return Coop.connect('host',h.id,null,null,{name:'Echo QA',seed:123});});
    await host.waitForFunction(()=>Coop.workerHost&&Game.state?.players.length===1&&!Coop.loading,null,{timeout:90000});
    for(let i=1;i<4;i++){
      await pages[i].evaluate(async({code,i})=>{const h=await Coop.newHero('Echo ally '+i,['','vanguard','gravebinder','wildkeeper'][i]);await Coop.connect('join',h.id,code);},{code,i});
      await pages[i].waitForFunction(n=>Game.state?.players.length===n&&!Coop.loading,i+1,{timeout:90000});
    }
    for(const page of pages)await page.evaluate(()=>CoopUI.close());
    await hostState(host,()=>{Game.state.flags.echoesUnlocked=true;for(const p of Game.state.players){p.lvl=30;p.computeStats();p.hp=p.stats.maxHp;p.mana=p.stats.maxMana;p.inv.items=[];}Game.debugFlags.god=true;});
    await host.waitForFunction(()=>Game.state.flags.echoesUnlocked);
    await host.evaluate(()=>UpgradeUI.echoes());await host.getByLabel('Desired equipment category').selectOption('boots');await host.getByRole('button',{name:'Begin an expedition',exact:true}).click();
    await host.getByRole('button',{name:/Iron Memory/}).waitFor();await host.getByRole('button',{name:/Iron Memory/}).click();
    for(const [stage,zone,attack]of [[0,'echo_north','fissure'],[1,'echo_marsh','bile'],[2,'echo_cathedral','chains']]){
      await Promise.all(pages.map(page=>page.waitForFunction(zone=>Game.state?.map?.id===zone&&!Coop.loading,zone,{timeout:90000})));
      await hostState(host,({attack})=>{
        const s=Game.state,m=s.monsters.find(m=>m.isBoss&&!m.dead),e=m.encounter;
        s.players.forEach((p,i)=>{Game.coop.resetActor(p,{x:e.arena.cx+1+i,y:e.arena.cy+2,surfaceId:0});p.hp=p.stats.maxHp;p.mana=p.stats.maxMana;});
        e.prepare(s.player,s.map);e.start(attack,s.player);e.timer=e.attack.windup=8;
        const id=Object.values(DATA.SKILLS).find(sk=>sk.cls==='emberwitch'&&sk.type==='groundfield').id;
        s.player.skills[id]=1;s.player.performSkill(id,null,{x:e.arena.cx+2,y:e.arena.cy+2,surfaceId:0});
        return {players:s.players.length,warning:e.attack.shapes.length};
      },{attack});
      await host.waitForTimeout(600);
      for(const i of [0,3])await pages[i].screenshot({path:path.join(out,zone+'-coop-'+(i===3?'phone-reduced':'desktop')+'.png')});
      await hostState(host,()=>{const m=Game.state.monsters.find(m=>m.isBoss&&!m.dead);m.encounter.phase=m.def.phases?.length||0;m.encounter.mechanic=null;m.hp=0;m.die(Game.state.player);if(!m.dead)throw Error('QA boss victory failed');});
      await host.getByRole('button',{name:/Claim .* and return/}).waitFor({timeout:15000});
      if(stage<2){await host.getByRole('button',{name:stage===0?/Unquiet Wrath/:/Restless Steps/}).click();}
    }
    await host.getByRole('button',{name:'Claim 3 items and return',exact:true}).click();
    await Promise.all(pages.map(page=>page.waitForFunction(()=>Game.state?.map?.id==='frosthaven'&&!Coop.loading,null,{timeout:90000})));
    assert.equal(await host.evaluate(()=>Game.state.player.inv.items.filter(it=>it.slot==='boots').length),3);
    for(const page of pages.slice(1)){
      await page.evaluate(()=>UpgradeUI.echoes());await page.getByRole('button',{name:'Collect your stored Echo reward',exact:true}).click();
      await page.waitForFunction(()=>Game.state.player.inv.items.filter(it=>it.slot==='boots').length===3);await page.evaluate(()=>UpgradeUI.close());
    }
    assert.deepEqual(errors,[]);console.log('PASS four-client Echo entry, three victories, host decisions, targeted individual rewards, and crowded desktop/phone combat');
  }finally{fs.writeFileSync(path.join(out,'coop-errors.json'),JSON.stringify(errors,null,2));await browser.close();await relay.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
