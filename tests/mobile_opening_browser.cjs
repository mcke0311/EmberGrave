const {assert,fs,out,setup,touchDriver}=require('./mobile_fix_helpers.cjs');
(async()=>{
 const {browser,context,page,errors}=await setup({manual:true});let checks=0;const stages=[];
 try{
  await page.getByRole('button',{name:'SINGLE PLAYER',exact:true}).tap();await page.getByRole('button',{name:'Next',exact:true}).tap();
  await page.locator('#nameInput').fill('Touch opening');await page.getByRole('button',{name:'ENTER THE MARCHES',exact:true}).tap();
  await page.waitForFunction(()=>Game.state?.map?.id==='frosthaven_approach');
  // God mode isolates input/progression from bot survival. Damage, boss health,
  // movement speed, combat cooldowns, stage logic and rewards remain production.
  await page.evaluate(()=>Game.debugFlags.god=true);
  const d=await touchDriver(page,context);await d.step(.1);
  assert.equal(await page.locator('.opening-skip').count(),0);assert.equal(await page.evaluate(()=>typeof Game.skipOpening),'undefined');checks+=2;
  const initial=await page.evaluate(async()=>{const map=Game.state.map.id;const portal=Game.castPortal(),travel=await Game.travelToShrine('town');return {portal,travel,map:Game.state.map.id,initial:map,stage:Game.state.flags.opening.stage}});
  assert.ok(!initial.portal&&!initial.travel&&initial.map===initial.initial&&initial.stage==='arrival');checks++;
  let lastStage='',bossPhase=false,supply=false;
  for(let n=0;n<8000;n++){
   const state=await page.evaluate(()=>{
    const s=Game.state,p=s.player,sc=s.map.opening;
    const enemies=s.monsters.filter(m=>!m.dead&&m.openingId).sort((a,b)=>Number(!a.openingId.startsWith('retinue'))-Number(!b.openingId.startsWith('retinue'))||Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y));
    const m=enemies[0],npc=s.npcs.find(n=>n.id===(s.flags.opening.stage==='hearth'?'sera':'opening_mara'));
    return {stage:s.flags.opening.stage,map:s.map.id,time:s.time,p:{x:p.x,y:p.y,hp:p.hp},enemy:m?{x:m.x,y:m.y,id:m.openingId,hp:m.hp,phase:m.phaseIdx,distance:Math.hypot(m.x-p.x,m.y-p.y)}:null,sc,npc:npc?{x:npc.x,y:npc.y}:null,supply:s.flags.opening.supply,waves:s.flags.opening.waves};
   });
   if(state.stage!==lastStage){lastStage=state.stage;stages.push({stage:lastStage,time:+state.time.toFixed(2)});console.log(lastStage,Math.round(state.time),state.p);await page.screenshot({path:`${out}/opening-${lastStage}.png`});}
   if(state.stage==='done')break;
   if(state.enemy?.phase===1)bossPhase=true;
   if(state.supply)supply=true;
   if(state.enemy){
    if(state.enemy.distance>1.45){await d.approach(state.enemy,1.4);}
    else {await d.attack();await d.step(.8);}
   }else if(['awakening','guard','rescue','combat','bossIntro','boss'].includes(state.stage)){await d.release();await d.step(.3);}
   else if(state.stage==='arrival')await d.approach(state.sc.guard,1);
   else if(state.stage==='road')await d.approach(state.sc.rescue,1);
   else if(state.stage==='escort')await d.approach(state.sc.pair[0],1);
   else if(state.stage==='rescueTalk'||state.stage==='hearth'){
    if(await d.approach(state.npc,2.2)){await d.tapWorld(state.npc,-30);await d.step(.6);}
   }else if(state.stage==='provision'){
    if(!state.supply){if(await d.approach(state.sc.cache,2.2)){await d.tapWorld(state.sc.cache,-20);await d.step(1);}}
    else await d.approach({x:93.5,y:15.5},1);
   }else if(state.stage==='gate'){
    if(await d.approach(state.sc.gate,2.5)){await d.tapWorld(state.sc.gate,-8);await page.waitForFunction(()=>Game.state.map.id==='frosthaven',null,{timeout:15000});}
   }
   if(n%150===0)console.log('touch progress',n,state.stage,Math.round(state.time));
  }
  await d.release();
  const result=await page.evaluate(()=>({stage:Game.state.flags.opening.stage,map:Game.state.map.id,defeated:Game.state.flags.opening.defeated,waves:Game.state.flags.opening.waves,skip:typeof Game.skipOpening}));
  assert.equal(result.stage,'done','complete opening through touch');assert.equal(result.map,'frosthaven');assert.ok(result.defeated.includes('captain'));assert.ok(bossPhase,'captain reaches phase two');assert.equal(result.waves.length,2);checks+=5;
  assert.deepEqual(errors,[]);checks++;
  fs.writeFileSync(out+'/opening-results.json',JSON.stringify({checks,stages,result,supplyCollected:supply,godMode:true,clock:'production update at 50 ms, manually advanced',input:'trusted Chrome touch events; no position or stage assignments',errors},null,2));
  console.log(`PASS ${checks} mobile opening checks through ${stages.length} stages`);
 }catch(e){await page.screenshot({path:out+'/opening-failure.png'});console.error(await page.evaluate(()=>({stage:Game.state?.flags.opening?.stage,p:{x:Game.state?.player.x,y:Game.state?.player.y},command:Game.state?.player.command?.type,errors:document.querySelector('#appFatalDetail')?.textContent})));throw e}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
