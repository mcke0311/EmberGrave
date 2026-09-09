const {chromium}=require('playwright');
const fs=require('node:fs');
const zones=['khalcamp','desert_wastes','underground_market','sand_tombs','khal_palace','shard_flats','tomb_sanctum'];
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const page=await browser.newPage({viewport:{width:1920,height:1500},deviceScaleFactor:1}),errors=[],walks=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('http://127.0.0.1:8743/tests/act3_environment_review.html');
  await page.waitForFunction(()=>document.body.dataset.testStatus==='passed',{},{timeout:180000});
  for(const zone of zones){
   await page.evaluate(zone=>act3CombatReview.load('after',zone),zone);
   const count=await page.evaluate(()=>act3CombatReview.map.exits.length);
   for(let index=0;index<count;index++){
    await page.evaluate(zone=>act3CombatReview.load('after',zone),zone);
    const target=await page.evaluate(index=>{
     const r=act3CombatReview,g=r.game,m=g.state.map,ex=m.exits[index],t=m.thresholds.find(t=>t.id===ex.thresholdId),p=g.state.player;
     g.state.monsters=[];g.state.minions=[];
     const dx=t.approach.x-t.opening.x,dy=t.approach.y-t.opening.y,len=Math.hypot(dx,dy);
     let start;
     for(const distance of [8,6,5,4]){
      const s={x:t.approach.x+dx/len*distance,y:t.approach.y+dy/len*distance};
      if(r.api.TerrainNavigation.segment(m,s.x,s.y,t.approach.x,t.approach.y,.55)){start=s;break;}
     }
     if(!start)throw Error('No unobstructed mouse-test approach');
     g.__act3.place(start.x,start.y);
     const companion=new r.api.Minion('bone_golem',{hp:200,dmg:[1,2],speed:6,atkRate:1,range:1,sprite:'golem'},p);
     companion.x=p.x;companion.y=p.y;g.state.minions=[companion];
     g.__act3.render();
     const c=r.win.document.getElementById('view'),U=r.api.U,S=r.api.TerrainSurface;
     window.inputCase={map:m,ex,t,start,companion};
     return {x:U.isoX(t.opening.x,t.opening.y)-U.isoX(start.x,start.y)+c.width/2,
      y:U.isoY(t.opening.x,t.opening.y)-U.isoY(start.x,start.y)-(S.heightAt(m,t.opening.x,t.opening.y,0)-S.heightAt(m,start.x,start.y,0))*14+c.height/2+20,
      width:c.width,height:c.height};
    },index);
    const canvas=page.frameLocator('iframe:visible').locator('#view');
    await canvas.scrollIntoViewIfNeeded();const bounds=await canvas.boundingBox();
    const x=bounds.x+target.x/target.width*bounds.width,y=bounds.y+target.y/target.height*bounds.height;
    await page.mouse.move(x,y);
    await page.evaluate(()=>act3CombatReview.step(0));
    // Exercise the browser's real pointer events and game's bindInput handlers.
    await page.mouse.click(x,y);
    const result=await page.evaluate(async()=>{
     const r=act3CombatReview,g=r.game,{map:m,ex,t,start,companion}=inputCase,p=g.state.player;
     if(g.state.map===m&&(p.command?.type!=='interact'||p.command.obj.x!==t.approach.x||p.command.obj.y!==t.approach.y))throw Error('Mouse did not select the physical passage');
     let frames=0,distance=0,companionDistance=0,previous={x:p.x,y:p.y},buddy={x:companion.x,y:companion.y};
     while(g.state.map===m&&frames++<3000){
      g.__act3.update(1/30);
      if(g.state.map!==m)break;
      const step=Math.hypot(companion.x-buddy.x,companion.y-buddy.y);
      if(step>.5)throw Error('Companion used teleport fallback on the approach');
      companionDistance+=step;distance+=Math.hypot(p.x-previous.x,p.y-previous.y);
      previous={x:p.x,y:p.y};buddy={x:companion.x,y:companion.y};
      if(frames%30===0)await new Promise(resolve=>setTimeout(resolve,0));
     }
     for(let i=0;i<600&&g.state.map===m;i++)await new Promise(resolve=>setTimeout(resolve,10));
     if(g.state.map.id!==ex.target)throw Error('Mouse travel stalled');
     if(!g.state.minions.includes(companion)||!r.api.TerrainSurface.supported(g.state.map,companion.x,companion.y,companion.radius))throw Error('Companion did not arrive safely');
     if(distance<2||companionDistance<.2)throw Error('Approach did not exercise companion following');
     const arrival=g.state.map.spawns[ex.spawnKey];
     if(Math.hypot(p.x-arrival.x,p.y-arrival.y)>.01)throw Error('Return arrival changed');
     return {from:m.id,to:ex.target,frames,distance,companionDistance,companionArrived:true,elevation:r.api.TerrainSurface.heightAt(m,start.x,start.y,0),input:'Playwright mouse → bindInput → physical threshold'};
    });walks.push(result);console.log('Mouse travel',result.from,'→',result.to);
   }
  }
  // Create the save through the captured old runtime, then load it unchanged.
  await page.evaluate(()=>act3CombatReview.load('environment_before','khalcamp'));
  const legacy=await page.evaluate(()=>{
   const g=act3CombatReview.game;g.state.home='khalcamp';g.state.player.gold=7319;g.state.quests.q13={state:'done',count:3};g.state.flags.act3_environment_save_probe=true;g.saveGame();
   const slot=g.listSaves()[0].slot;return {slot,raw:act3Store.get(slot)};
  });
  await page.evaluate(()=>act3CombatReview.load('after','khalcamp'));
  const save=await page.evaluate(async legacy=>{
   act3Store.set(legacy.slot,legacy.raw);const g=act3CombatReview.game;await g.loadGame(legacy.slot);
   if(g.state.map.id!=='khalcamp'||!g.state.map.act3.environment||g.state.player.gold!==7319||g.state.quests.q13.state!=='done'||!g.state.flags.act3_environment_save_probe)throw Error('Pre-change save compatibility failed');
   return {version:JSON.parse(legacy.raw).v,home:g.state.home,oldSaveLoaded:true,questsAndGoldPreserved:true,newMigration:false};
  },legacy);
  const report={status:errors.length?'FAIL':'PASS',walks,save,errors};
  fs.writeFileSync('tests/qa/act3_environment/input.json',JSON.stringify(report,null,2));if(errors.length)throw Error(errors.join('\n'));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
