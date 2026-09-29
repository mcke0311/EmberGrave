const {chromium}=require('playwright');
const fs=require('node:fs');
const pairs=[['north_wild','mines'],['weeping_marsh','drowned_crypt'],['desert_wastes','underground_market'],['cathedral1','cathedral_cinderwatch'],['ash_wastes','cinder_bastion']];
const chosen=process.argv.find(a=>a.startsWith('--zone='))?.split('=')[1];
const zones=chosen?[chosen]:pairs.flat();
const version=process.argv.includes('--baseline')?'before':'after';
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const page=await browser.newPage({viewport:{width:1920,height:1500},deviceScaleFactor:1}),errors=[],walks=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('http://127.0.0.1:8741/tests/campaign_visual_review.html');
  await page.waitForFunction(()=>document.body.dataset.testStatus==='passed',{},{timeout:180000});
  for(const zone of zones){
   await page.evaluate(({zone,version})=>campaignReview.load(version,zone),{zone,version});
   const count=await page.evaluate(()=>campaignReview.map.exits.length);
   for(let index=0;index<count;index++){
    if(!await page.evaluate(({index,zone,pairs})=>pairs.some(p=>p.includes(zone)&&p.includes(campaignReview.map.exits[index].target)),{index,zone,pairs}))continue;
    await page.evaluate(({zone,version})=>campaignReview.load(version,zone),{zone,version});
    const target=await page.evaluate(index=>{
     const r=campaignReview,g=r.game,m=g.state.map,ex=m.exits[index],t=m.thresholds.find(t=>t.id===ex.thresholdId),p=g.state.player;
     g.state.monsters=[];g.state.minions=[];
     const dx=t.approach.x-t.opening.x,dy=t.approach.y-t.opening.y,len=Math.hypot(dx,dy);
     let start;
     search:for(const distance of [8,6,5,4,3])for(const angle of [0,Math.PI/4,-Math.PI/4,Math.PI/2,-Math.PI/2,Math.PI]){
      const ux=dx/len,uy=dy/len,s={x:t.approach.x+(ux*Math.cos(angle)-uy*Math.sin(angle))*distance,y:t.approach.y+(ux*Math.sin(angle)+uy*Math.cos(angle))*distance};
      if(r.api.TerrainNavigation.segment(m,s.x,s.y,t.approach.x,t.approach.y,.36)){start=s;break search;}
     }
     if(!start)throw Error('No unobstructed mouse-test approach: '+m.id+' to '+ex.target);
     g.__frontier.place(start.x,start.y);
     const companion=new r.api.Minion('bone_golem',{hp:200,dmg:[1,2],speed:6,atkRate:1,range:1,sprite:'golem'},p);
     companion.x=p.x;companion.y=p.y;g.state.minions=[companion];
     g.__frontier.render();
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
    await page.evaluate(()=>campaignReview.game.__frontier.update(0));
    // Exercise the browser's real pointer events and game's bindInput handlers.
    await page.mouse.click(x,y);
    const result=await page.evaluate(async()=>{
     const r=campaignReview,g=r.game,{map:m,ex,t,start,companion}=inputCase,p=g.state.player;
     if(g.state.map===m&&(p.command?.type!=='interact'||p.command.obj.x!==t.approach.x||p.command.obj.y!==t.approach.y))throw Error('Mouse did not select the physical passage');
     let frames=0,distance=0,companionDistance=0,previous={x:p.x,y:p.y},buddy={x:companion.x,y:companion.y};
     while(g.state.map===m&&frames++<3000){
      g.__frontier.update(1/30);
      if(g.state.map!==m)break;
      const step=Math.hypot(companion.x-buddy.x,companion.y-buddy.y);
      if(step>.5)throw Error('Companion used teleport fallback on the approach');
      companionDistance+=step;distance+=Math.hypot(p.x-previous.x,p.y-previous.y);
      previous={x:p.x,y:p.y};buddy={x:companion.x,y:companion.y};
      if(frames%30===0)await new Promise(resolve=>setTimeout(resolve,0));
     }
     for(let i=0;i<600&&g.state.map===m;i++)await new Promise(resolve=>setTimeout(resolve,10));
     if(g.state.map.id!==ex.target)throw Error('Mouse travel stalled: '+JSON.stringify({from:m.id,to:ex.target,player:{x:p.x,y:p.y,command:p.command?.type},approach:t.approach}));
     // Surface maps check the actor's complete footprint; older maps use the
     // same point-walkability arrival contract as production enterMap.
     const companionSupported=g.state.map.surfaceVersion?r.api.TerrainSurface.supported(g.state.map,companion.x,companion.y,companion.radius):r.api.MapGen.walkable(g.state.map,companion.x,companion.y);
     if(!g.state.minions.includes(companion)||!companionSupported)throw Error('Companion did not arrive safely: '+JSON.stringify({from:m.id,to:ex.target,inParty:g.state.minions.includes(companion),supported:companionSupported,x:companion.x,y:companion.y,radius:companion.radius,surfaceVersion:g.state.map.surfaceVersion}));
     if(distance<2||companionDistance<.2)throw Error('Approach did not exercise companion following');
     const arrival=g.state.map.spawns[ex.spawnKey];
     if(Math.hypot(p.x-arrival.x,p.y-arrival.y)>.01)throw Error('Return arrival changed');
     return {from:m.id,to:ex.target,frames,distance,companionDistance,companionArrived:true,arrivalCheck:g.state.map.surfaceVersion?'full footprint':'legacy point walkability',elevation:r.api.TerrainSurface.heightAt(m,start.x,start.y,0),input:'Playwright mouse → bindInput → physical threshold'};
    });walks.push(result);console.log('Mouse travel',result.from,'→',result.to);
   }
  }
  // Create the save through the captured old runtime, then load it unchanged.
  await page.evaluate(()=>campaignReview.load('before','khalcamp'));
  const legacy=await page.evaluate(()=>{
   const g=campaignReview.game;g.state.home='khalcamp';g.state.player.gold=7319;g.state.quests.q13={state:'done',count:3};g.state.flags.campaign_visual_save_probe=true;g.saveGame();
   const slot=g.listSaves()[0].slot;return {slot,raw:frontierStore.get(slot)};
  });
  await page.evaluate(()=>campaignReview.load('after','khalcamp'));
  const save=await page.evaluate(async legacy=>{
   frontierStore.set(legacy.slot,legacy.raw);const g=campaignReview.game;await g.loadGame(legacy.slot);
   if(g.state.map.id!=='khalcamp'||!g.state.map.campaignVisual||g.state.player.gold!==7319||g.state.quests.q13.state!=='done'||!g.state.flags.campaign_visual_save_probe)throw Error('Pre-change save compatibility failed');
   return {version:JSON.parse(legacy.raw).v,home:g.state.home,oldSaveLoaded:true,questsAndGoldPreserved:true,newMigration:false};
  },legacy);
  const report={status:errors.length?'FAIL':'PASS',walks,save,errors};
  fs.writeFileSync('tests/qa/campaign_visual/input.json',JSON.stringify(report,null,2));if(errors.length)throw Error(errors.join('\n'));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
