const {assert,fs,out,setup,touchDriver}=require('./mobile_fix_helpers.cjs');
(async()=>{
 const {browser,context,page,errors}=await setup({manual:true}),results=[];
 try{
  // Exercise the documented failed-video fallback after the final beacon too.
  await page.route('**/cine_oathsworn.mp4',route=>route.abort());
  await page.evaluate(async()=>{await Game.newGame('Scripted touch fixture','vanguard',false);await (await import('/tests/completed_hero_fixture.mjs')).loadCompletedHero(Game);Game.debugFlags.god=true;const p=Game.state.player;p.lvl=30;p.equip.main=Items.fromBase('sword_t7');p.computeStats();});
  const d=await touchDriver(page,context);
  for(const type of ['oathsworn','ritual']){
   const target=await page.evaluate(async type=>{
    UI.closeAll();UI.closeEsc();Game.state.mapsCache={};Game.state.seed=320040388;
    const zone=type==='oathsworn'?'north_wild':'drowned_crypt';
    if(type==='oathsworn'){Game.state.quests.q8b={state:'active',beacons:0};delete Game.state.flags.fn_temple_open;}
    else Game.state.quests.q11={state:'active',siteDestroyed:false,bossDead:false};
    await Game.enterMap(zone,'default');const s=Game.state;
    if(type==='oathsworn'){const q=s.quests.q8b;q.destroyedBeaconIds=s.monsters.filter(m=>m.beacon).slice(0,2).map(m=>m.beaconId);q.beacons=2;Game.__mobileTest.setupBeaconQuest(s.map);}
    const mon=s.monsters.find(m=>type==='oathsworn'?m.beacon:m.defId===DATA.QUESTS.find(q=>q.id==='q11').target);
    if(!mon)throw Error('Missing quest target '+type);
    const path=TerrainNavigation.findPath(s.map,s.map.spawns.default,mon,{radius:s.player.radius,hop:false});
    const point=[...path].reverse().find(p=>Math.hypot(p.cx-mon.x,p.cy-mon.y)>6)||path[0];
    await Game.enterMap(zone,'default',{arrivalPosition:{x:point.cx,y:point.cy},reuseCachedMap:true});
    s.monsters=s.monsters.filter(m=>type==='oathsworn'?m.beacon:m.defId===mon.defId);
    return {x:mon.x,y:mon.y,id:mon.defId};
   },type);
   await d.step(.05);await d.walk(target,1.4);await d.attack();
   let spawned=[];
   for(let n=0;n<600;n++){
    await d.step(.5);
    const state=await page.evaluate(()=>({ids:Game.state.monsters.filter(m=>['barb_axe','barb_pole','barb_sword','choirmaster'].includes(m.defId)).map(m=>m.defId),cinematic:UI.cinematicActive()}));
    if(state.ids.length){spawned=state.ids;break;}
    if(state.cinematic)await page.waitForTimeout(100);
   }
   await d.release();assert.equal(spawned.length,type==='oathsworn'?3:1,type+' touch kill triggers boss');
   assert.equal(new Set(spawned).size,spawned.length);await d.step(3);
   assert.equal(await page.evaluate(()=>Game.state.monsters.filter(m=>['barb_axe','barb_pole','barb_sword','choirmaster'].includes(m.defId)).length),spawned.length,'no duplicate delayed spawn');
   results.push({type,spawned});console.log('spawned',type,spawned);
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(out+'/scripted-touch-results.json',JSON.stringify({checks:7,results,errors},null,2));console.log('PASS 7 scripted boss touch checks');
 }catch(e){console.error(await page.evaluate(()=>({quests:Game.state.quests,p:{x:Game.state.player.x,y:Game.state.player.y,command:Game.state.player.command},monsters:Game.state.monsters.map(m=>({id:m.defId,hp:m.hp,dead:m.dead,x:m.x,y:m.y})),cinematic:UI.cinematicActive(),time:Game.state.time})));await page.screenshot({path:out+'/scripted-failure.png'});throw e}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
