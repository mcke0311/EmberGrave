const {chromium}=require('playwright');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding']});
 const page=await browser.newPage({viewport:{width:1920,height:1280},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const out='tests/qa/act3_architecture';fs.mkdirSync(out,{recursive:true});
 try{
  await page.goto('http://127.0.0.1:8743/tests/act3_review.html?zone='+ (process.env.ACT3_ZONE||'shard_flats'),{timeout:90000});
  await page.waitForFunction(()=>document.body.dataset.testStatus==='passed'||document.body.dataset.testStatus==='failed',null,{timeout:240000});
  const status=await page.locator('#status').innerText();console.log(status);
  if(status==='FAIL')throw Error(await page.locator('#error').innerText());
  const info=await page.evaluate(()=>{
   const r=act3CombatReview,g=r.game,m=g.state.map,p=g.state.player,b=m.act3.architecture.bridges[0];
   if(b){g.__act3.place(b.x+.5,b.y+.5);p.surfaceId=0;g.__act3.render();}
   return {zone:m.id,bridge:b,walls:m.act3.architecture.walls.length,errors:r.api?[]:null};
  });
  const frame=page.frames().find(f=>f.parentFrame());
  await frame.locator('#game').screenshot({path:out+'/'+info.zone+'_lower.png'}).catch(async()=>{await page.screenshot({path:out+'/'+info.zone+'_lower.png'});});
  if(info.bridge)await page.evaluate(()=>{const r=act3CombatReview;r.game.__act3.place(r.game.state.player.x,r.game.state.player.y,1);r.game.__act3.render();});
  await frame.locator('#game').screenshot({path:out+'/'+info.zone+'_upper.png'}).catch(async()=>{await page.screenshot({path:out+'/'+info.zone+'_upper.png'});});
  const traversal=info.bridge?await page.evaluate(async()=>{
    const r=act3CombatReview,g=r.game,s=g.state,m=s.map,p=s.player,b=m.act3.architecture.bridges[0],link=m.surfaceLinks[0];
    g.options.leftClickMove=true;g.__act3.place(link.x,link.y,0);s.monsters=[];
    let picked=null;
    for(let x=b.lo+2;x<b.hi-2&&!picked;x+=.5)for(let y=b.y0+1;y<b.y1-1&&!picked;y+=.5){
      const sx=r.api.U.isoX(x,y),sy=r.api.U.isoY(x,y)-r.api.TerrainSurface.heightAt(m,x,y,1)*14;
      const hit=r.api.TerrainSurface.pick(m,sx,sy,0);
      if(hit?.surfaceId===1){g.__act3.clickWorld(x,y,1);if(p.path?.some(n=>n.kind==='surface'))picked={x,y};}
    }
    if(!picked)throw Error('No exposed upper landing could be clicked');
    const companion=new r.api.Minion('floor_review',{hp:200,dmg:[1,2],speed:6,atkRate:1,range:1,sprite:'golem'},p);companion.x=link.x;companion.y=link.y;s.minions=[companion];
    for(let i=0;i<10000&&(p.path?.length||companion.surfaceId!==1);i++){s.time+=1/30;p.update(1/30);companion.update(1/30,p,m);}
    if(p.surfaceId!==1||companion.surfaceId!==1)throw Error('Live input/companion ascent failed');
    const chest=m.props.find(o=>o.surfaceId===1&&o.lootable);g.__act3.place(chest.x-1,chest.y,1);g.__act3.clickWorld(chest.x,chest.y,1);
    for(let i=0;i<200;i++){s.time+=1/30;p.update(1/30);}
    if(!chest.opened)throw Error('Upper chest was not interactable');
    const before={x:p.x,y:p.y};
    if(!g.castPortal()||!await g.usePortal()||p.surfaceId!==0)throw Error('Upper route portal did not arrive at base hub');
    if(!await g.usePortal()||g.state.map!==m||p.surfaceId!==1||Math.hypot(p.x-before.x,p.y-before.y)>.01)throw Error('Portal return lost upper surface');
    return {status:'PASS',picked,playerFloor:p.surfaceId,companionFloor:companion.surfaceId,chestOpened:chest.opened,portalRoundTrip:true};
  }):null;
  fs.writeFileSync(out+'/browser.json',JSON.stringify({info,traversal,errors},null,2));console.log(JSON.stringify({info,traversal,errors}));
  fs.writeFileSync(out+'/browser_'+info.zone+'.json',JSON.stringify({info,traversal,errors},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
