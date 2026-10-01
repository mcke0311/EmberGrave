// Four independent browser clients using the production worker and local relay.
const {chromium}=require('playwright'),{createRelay}=require('../server/relay.cjs');
const {installWorkerBridge,hostState,waitHostState}=require('./coop_browser_helpers.cjs');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const out=process.argv.find(v=>v.startsWith('--output-dir='))?.slice(13)||'tests/qa/boss_arenas';
fs.mkdirSync(out,{recursive:true});
(async()=>{
 const relay=createRelay();await new Promise(r=>relay.server.listen(0,'127.0.0.1',r));
 const relayUrl='ws://127.0.0.1:'+relay.server.address().port+'/ws';
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding']});
 const pages=[],ids=[],errors=[],checks=[];let room;
 const ok=(v,label)=>{assert.ok(v,label);checks.push(label);console.log('PASS',label);};
 try{
  for(let i=0;i<4;i++){
   const context=await browser.newContext({viewport:{width:844,height:475},hasTouch:true});await installWorkerBridge(context);
   await context.addInitScript(url=>{window.COOP_CONFIG={relayUrl:url};localStorage.setItem('embergrave_options',JSON.stringify({vol:{master:0,music:0,sfx:0}}));const Native=WebSocket;window.WebSocket=class extends Native{constructor(...args){super(...args);window.arenaSocket=this;}};},relayUrl);
   const page=await context.newPage();pages.push(page);page.on('pageerror',e=>errors.push(e.stack));
   await page.goto('http://127.0.0.1:8741',{waitUntil:'load',timeout:120000});await page.waitForFunction(()=>document.querySelector('#titleMenu button'),null,{timeout:120000});
   await page.evaluate(async({i,room})=>{const hero=await Coop.newHero('Arena '+i,'vanguard');await Coop.connect(i?'join':'host',hero.id,room,null,{seed:123});},{i,room});
   await page.waitForFunction(()=>Game.state?.map&&!Coop.loading,null,{timeout:90000});
   if(!i)room=await page.evaluate(()=>Coop.room);ids.push(await page.evaluate(()=>Coop.localId));await page.evaluate(()=>CoopUI.close());
  }
  const host=pages[0];
  await hostState(host,()=>{Game.state.flags.fn_temple_open=true;Game.firstSightCutscene=()=>{};for(const w of Coop.worlds.values())if(!w.map.zone.arena)w.monsters=[];});
  for(const [i,page]of pages.entries())for(const zone of ['north_wild','shattered_temple','arena_korvath']){
   await hostState(host,({id,zone})=>{const p=Coop.players.get(id),w=Coop.worlds.get(p.worldId),exit=w.map.exits.find(e=>e.target===zone);p.x=(exit.x0+exit.x1)/2;p.y=(exit.y0+exit.y1)/2;p.command=p.path=null;p.hp=p.stats.maxHp=100000;Coop.receive(id,{kind:'resync'});},{id:ids[i],zone});
   ok(await page.evaluate(zone=>Coop.requestTravel(zone),zone),`client ${i+1} travels to ${zone}`);
   await page.waitForFunction(zone=>Game.state.map.id===zone&&!Coop.loading,zone,{timeout:90000});
  }
  await hostState(host,()=>{const w=Game.state,a=w.map.bossArena;for(const p of w.players)p.hp=p.stats.maxHp=100000;Game.coop.resetActor(w.players[0],{x:a.cx+3,y:a.cy+2});});
  await host.waitForTimeout(200);ok(await hostState(host,()=>!Game.state.monsters.find(m=>m.defId==='korvath').encounter.active),'threshold waits for the admitted party');
  await hostState(host,()=>{const w=Game.state,a=w.map.bossArena;w.players.forEach((p,i)=>Game.coop.resetActor(p,{x:a.cx+3,y:a.cy+2+i}));});
  for(const page of pages)await page.waitForFunction(()=>Game.state.map.bossArena.sealed);
  ok(!await pages[1].evaluate(()=>Coop.requestTravel('shattered_temple')),'guest cannot travel through the combat seal');
  await hostState(host,()=>{const w=Game.state,m=w.monsters.find(m=>m.defId==='korvath');m.takeDamage(1e9,w.player);});
  await waitHostState(host,()=>Game.state.monsters.find(m=>m.defId==='korvath').encounter.phase===1);
  await hostState(host,()=>{
    const w=Game.state,m=w.monsters.find(m=>m.defId==='korvath'),d=w.map.bossArena.devices.find(d=>d.arenaRole==='chargeTarget');
    Game.coop.resetActor(w.players[0],{x:d.x-2.5,y:d.y});m.encounter.start('charge',w.players[0]);
    for(const p of w.players)Coop.receive(p._coopId,{kind:'resync'});
  });
  await host.waitForFunction(()=>Game.state.monsters.find(m=>m.defId==='korvath').encounter.attack?.id==='charge');
  ok(await host.evaluate(()=>Coop.submit({type:'move',point:{x:Game.state.player.x,y:Game.state.player.y+4}})),'host client sidesteps the locked charge through an unactivated target');
  for(const page of pages)await page.waitForFunction(()=>Game.state.map.bossArena.devices.some(d=>d.arenaRole==='chargeTarget'&&d.cooldown>0));
  ok(await hostState(host,()=>Game.state.monsters.find(m=>m.defId==='korvath').encounter.counterEvents.filter(c=>c.kind==='charge').length===1),'four clients observe one authoritative charge counter');
  await pages[1].screenshot({path:path.join(out,'coop_4_counter.png')});
  await waitHostState(host,()=>{const e=Game.state.monsters.find(m=>m.defId==='korvath').encounter;return !e.mechanic?.blocksDamage&&e.stage==='recovery';});
  ok(await hostState(host,()=>Game.state.monsters.find(m=>m.defId==='korvath').hp===Game.state.monsters.find(m=>m.defId==='korvath').maxHp*.5),'network counter preserves the exact phase threshold');
  const hp=await hostState(host,()=>Game.state.monsters.find(m=>m.defId==='korvath').hp);
  await pages[3].evaluate(()=>arenaSocket.close());
  await waitHostState(host,id=>Coop.players.get(id)?.connected===false,ids[3]);
  await waitHostState(host,id=>Coop.players.get(id)?.connected===true,ids[3],30000);
  ok(await hostState(host,hp=>{const m=Game.state.monsters.find(m=>m.defId==='korvath');return m.hp===hp&&m.encounter.active;},hp),'reconnecting browser retains the current encounter');
  await hostState(host,()=>{for(const p of Game.state.players)Coop.died(p);});
  for(const page of pages)await page.waitForFunction(()=>Game.state.player.dead&&!Game.state.map.bossArena.sealed);
  await pages[1].waitForFunction(()=>document.getElementById('deathScreen').open);
  await pages[1].screenshot({path:path.join(out,'coop_4_death.png')});
  await pages[1].getByRole('button',{name:'Retry at arena entrance',exact:true}).click();
  for(const page of pages)await page.waitForFunction(()=>!Game.state.player.dead&&Game.state.player.y>Game.state.map.bossArena.y1);
  for(const page of pages)await page.waitForFunction(()=>!document.getElementById('deathScreen').open);
  await pages[1].screenshot({path:path.join(out,'coop_4_retry.png')});
  ok(await hostState(host,()=>{const w=Game.state,m=w.monsters.find(m=>m.defId==='korvath');return m.hp===m.maxHp&&!m.encounter.active&&w.map.bossArena.devices.every(d=>!d.required&&!d.completed)&&['projectiles','minions','traps','fx'].every(k=>!w[k].length);}), 'guest retry button resets the full party and attempt');
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'network.json'),JSON.stringify({passed:true,players:4,transport:'Production WebSocket relay and worker on localhost, independent Chrome contexts',checks,errors},null,2)+'\n');
 }finally{await browser.close();await relay.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
