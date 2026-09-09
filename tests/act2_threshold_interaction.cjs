const {chromium}=require('playwright');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],rows=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8753/tests/act2_threshold_review.html?zone=drowned_crypt&view=exit_0');
  await page.waitForFunction(()=>window.act2ReviewDone,{timeout:120000});
  for(const zone of ['weeping_marsh','drowned_crypt','hollow_reeds','spawn_pools','ritual_site','marshcamp']){
   await page.evaluate(async z=>act2AnimationReview.load('after',z),zone);
   const ids=await page.evaluate(()=>act2AnimationReview.game.state.map.thresholds.map(t=>t.id));
   for(const id of ids)for(const target of ['opening','label']){
    await page.evaluate(async z=>act2AnimationReview.load('after',z),zone);
    const row=await page.evaluate(async({id,target})=>{
     const r=act2AnimationReview,g=r.game,m=g.state.map,t=m.thresholds.find(t=>t.id===id),ex=m.exits.find(e=>e.thresholdId===id),o=t.opening;
     // Standing inside an exit remains inert until an explicit click.
     g.__act2.place(o.x,o.y);g.__act2.setMouse(-1000,-1000);
     for(let i=0;i<60;i++)g.__act2.update(1/60);
     if(g.state.map!==m)throw Error('Walking triggered travel '+id);
     let origin=t.arrival;
     if(target==='opening'){
      const angle=Math.atan2(t.arrival.y-o.y,t.arrival.x-o.x);
      const candidates=[];
      for(const distance of [10,8,6])for(const turn of [0,-.4,.4,-.8,.8]){
       const at={x:o.x+Math.cos(angle+turn)*distance,y:o.y+Math.sin(angle+turn)*distance};
       if(r.api.TerrainSurface.supported(m,at.x,at.y,.36)&&r.api.TerrainNavigation.findPath(m,at,t.approach,{radius:.36,speed:4.5}))candidates.push(at);
      }
      if(!candidates.length)throw Error('No distant click position '+id);
      origin=candidates[0];
     }
     g.__act2.place(origin.x,origin.y);g.__act2.render();
     const cam=g.__act2.camera(),x=r.api.U.isoX(o.x,o.y)-cam.x,y=r.api.U.isoY(o.x,o.y)-cam.y-(target==='label'?o.height+14:20);
     g.__act2.setMouse(x,y);g.__act2.render();
     if(g.__act2.hoveredExit()!==ex)throw Error('Hover missed '+id+'/'+target);
     const start={x:g.state.player.x,y:g.state.player.y};
     g.__act2.handleClick(false);
     const commanded=g.state.player.command?.type==='interact';
     if(!commanded&&g.state.map===m&&Math.hypot(start.x-t.approach.x,start.y-t.approach.y)>=1.8)throw Error('No approach command '+id);
     let steps=0;
     while(g.state.map===m&&steps++<600){g.__act2.update(1/30);if(steps%30===0)await new Promise(resolve=>setTimeout(resolve,0));}
     for(let wait=0;wait<100&&g.state.map===m;wait++)await new Promise(resolve=>setTimeout(resolve,20));
     if(g.state.map.id!==ex.target)throw Error('Click failed '+id+'/'+target+' at '+g.state.player.x+','+g.state.player.y);
     for(let wait=0;wait<10;wait++)await new Promise(resolve=>setTimeout(resolve,20));
     const at=g.state.player,spawn=g.state.map.spawns[ex.spawnKey];
     if(Math.hypot(at.x-spawn.x,at.y-spawn.y)>.8)throw Error('Wrong arrival '+id);
     if(!r.api.TerrainSurface.supported(g.state.map,at.x,at.y,.36))throw Error('Blocked return '+id);
     return{id,target,destination:ex.target,spawnKey:ex.spawnKey,commanded,steps,clickDistance:Math.hypot(start.x-o.x,start.y-o.y),standingDidNotTravel:true};
    },{id,target});
    rows.push(row);console.log('PASS',zone,id,target);
   }
  }
  if(errors.length)throw Error(errors.join('\n'));
  fs.writeFileSync('tests/qa/act2_thresholds/interaction.json',JSON.stringify({status:'PASS',rows,browser:browser.version()},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
