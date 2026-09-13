const {assert,fs,out,setup,touchDriver}=require('./mobile_fix_helpers.cjs');
(async()=>{
 const {browser,context,page,errors}=await setup({manual:true});
 try{
  await page.evaluate(async()=>{await Game.newGame('Courtyard route fixture','vanguard',false);Object.assign(Game.state.flags.opening,{stage:'provision',rescued:true,defeated:['guard','rescue0','rescue1','rescue2','gate0','gate1']});Game.saveGame();await Game.loadGame(Game.listSaves()[0].slot);Game.debugFlags.god=true;});
  const d=await touchDriver(page,context),route=[];
  // The old point trigger at (86,15), radius 3, missed this east-edge gate route.
  for(const target of [{x:94.5,y:21.5},{x:94.5,y:6.5}]){
   let arrived=false;
   for(let n=0;n<1200;n++){
    const p=await page.evaluate(()=>({x:Game.state.player.x,y:Game.state.player.y,stage:Game.state.flags.opening.stage}));route.push(p);
    if(await d.approach(target,.6)){arrived=true;break;}
   }
   assert.ok(arrived,'touch route reaches '+JSON.stringify(target));
  }
  await d.release();
  assert.ok(route.every(p=>Math.hypot(p.x-86,p.y-15)>3),'regression route must miss the old point trigger');
  const result=await page.evaluate(async()=>{const s=Game.state;const gate=await Game.enterMap('frosthaven','from_wild',{openingMode:'gate'});return {gate,map:s.map.id,stage:s.flags.opening.stage,supply:s.flags.opening.supply,captains:s.monsters.filter(m=>m.openingId==='captain').length}});
  assert.equal(result.captains,1);assert.equal(result.gate,false);assert.equal(result.map,'frosthaven_approach');assert.equal(result.supply,false);
  await d.walk({x:94.5,y:21.5},.8);await d.walk({x:94.5,y:6.5},.8);await d.release();
  assert.equal(await page.evaluate(()=>Game.state.monsters.filter(m=>m.openingId==='captain').length),1);
  assert.deepEqual(errors,[]);await page.screenshot({path:out+'/captain-east-gate.png'});
  fs.writeFileSync(out+'/captain-route-results.json',JSON.stringify({checks:9,result,route,errors},null,2));console.log('PASS 9 captain touch route checks; optional supplies and duplicate prevention');
 }catch(e){await page.screenshot({path:out+'/captain-route-failure.png'});throw e}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
