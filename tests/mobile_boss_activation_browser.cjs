const {assert,fs,out,setup,touchDriver}=require('./mobile_fix_helpers.cjs');
(async()=>{
 const {browser,context,page,errors}=await setup({manual:true}),results=[];
 try{
  await page.evaluate(async()=>{await Game.newGame('Touch boss audit','vanguard',false);await (await import('/tests/completed_hero_fixture.mjs')).loadCompletedHero(Game);Game.debugFlags.god=true;for(let i=1;i<=5;i++)Game.state.flags['seen_act'+i]=true;for(const id of Object.keys(DATA.ENEMIES))Game.state.characterFlags['sawCine_'+id]=true;Game.state.quests.q16={state:'done'};Game.state.quests.q17={state:'done'};});
  const d=await touchDriver(page,context);
  const cases=JSON.parse(fs.readFileSync(out+'/boss-activation.json','utf8')).encounters;
  for(const {zone,id,seed,approach} of cases){
   await d.release();
   const target=await page.evaluate(async({zone,id,seed,approach})=>{
    UI.closeAll();UI.closeEsc();Game.state.seed=seed;Game.state.mapsCache={};
    if(['barb_axe','barb_pole','barb_sword'].includes(id))Game.state.quests.q8b={state:'active',beacons:3,trioSpawned:true,trioKilled:[]};
    if(id==='choirmaster')Game.state.quests.q11={state:'active',siteDestroyed:true,bossDead:false};
    // Prepare the fixture at an existing point on the arrival-to-boss route.
    // The engagement itself uses only touch movement from this point onward.
    await Game.enterMap(zone,'default');
    const s=Game.state,mon=s.monsters.find(m=>m.defId===id&&!m.dead);
    if(!mon)throw Error('Missing spawned boss '+zone+'/'+id);
    const p=s.player,route=TerrainNavigation.findPath(s.map,s.map.spawns.default,approach,{radius:p.radius,hop:false,speed:p.stats.moveSpeed});
    if(!route?.length)throw Error('No production approach '+zone+'/'+id);
    const samples=[];let prev=s.map.spawns.default;
    for(const point of route){const dx=point.cx-prev.x,dy=point.cy-prev.y,n=Math.ceil(Math.hypot(dx,dy));for(let k=1;k<=n;k++)samples.push({x:prev.x+dx*k/n,y:prev.y+dy*k/n});prev={x:point.cx,y:point.cy};}
    const point=samples.reverse().find(point=>Math.hypot(point.x-mon.x,point.y-mon.y)>(mon.def.sight||18)+2)||s.map.spawns.default;
    await Game.enterMap(zone,'default',{arrivalPosition:point,reuseCachedMap:true});
    // Scripted encounter construction creates fresh instances on travel.
    const current=s.monsters.find(m=>m.defId===id&&!m.dead);s.monsters=[current];
    return {x:current.x,y:current.y,id};
   },{zone,id,seed,approach});
   await d.step(.05);
   let engaged=false;
   for(let n=0;n<500;n++){
    engaged=await page.evaluate(()=>{const m=Game.state.monsters[0];return !!(m.aggro||m.encounter?.active)});
    if(engaged)break;
    await d.approach(target,2);await d.step(.05);
   }
   await d.release();assert.ok(engaged,zone+'/'+id+' did not engage through touch movement');
   await d.step(2);
   const result=await page.evaluate(()=>{const m=Game.state.monsters[0];return {zone:Game.state.map.id,id:m.defId,aggro:m.aggro,active:m.encounter?.active,stage:m.encounter?.stage,bossBar:Game.state.bossBar?.defId,position:{x:Game.state.player.x,y:Game.state.player.y}}});
   assert.ok(result.aggro||result.active);results.push(result);console.log('engaged',zone,id);
   if(['korvath','mire_mother','azram','empty_archangel','malthoron','vethriss'].includes(id))await page.screenshot({path:out+'/boss-'+id+'.png'});
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(out+'/boss-touch-results.json',JSON.stringify({results,input:'trusted Chrome touch events on production navigation; isolated approach fixtures',errors},null,2));console.log(`PASS ${results.length} mobile boss activations`);
 }catch(e){await page.screenshot({path:out+'/boss-failure.png'});throw e}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
