// Inspect real wall doorways, then walk through them using mouse/touch travel.
const {chromium}=require('playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
const out='tests/qa/boss_entrances';fs.mkdirSync(out,{recursive:true});
const selected=process.argv.find(a=>a.startsWith('--width='))?.slice(8);
const widths=selected?[+selected]:[1920,3840,844];
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true}),rows=[],integration=[],errors=[];
 try{
  for(const width of widths){
   const page=await browser.newPage({viewport:{width:width+32,height:Math.round(width*9/16)+420},hasTouch:width===844,reducedMotion:width===844?'reduce':'no-preference'});
   page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()===404)errors.push('Missing '+r.url());});
   await page.goto('http://localhost:8741/tests/boss_encounters.html');
   await page.waitForFunction(()=>window.bossQA,null,{timeout:120000});
   await page.evaluate(width=>{const f=bossQA.frame;f.style.width=width+'px';f.style.height=Math.round(width*9/16)+'px';bossQA.setPaused(true);},width);
   for(const id of ['korvath','mire_mother','azram','empty_archangel','malthoron','vethriss']){
    await page.evaluate(async id=>{await bossQA.setupEntrance(id);bossQA.setPaused(true);document.getElementById('pilot').checked=false;window.doorParent=bossQA.api.Game.state.map;},id);
    const parent=await page.evaluate(()=>{
     const q=bossQA,{Game:G,U,SpriteAssets:S}=q.api,m=G.state.map,pr=m.props.find(p=>p.doorId==='boss_entry_'+m.arenaEntrance.bossId);
     const f=S.getFrame(S.maps.props[pr.visual],0),cam=G.__bossReview.camera,view=q.frame.contentWindow.document.getElementById('view'),r=view.getBoundingClientRect(),outer=q.frame.getBoundingClientRect();
     return {x:outer.left+q.frame.clientLeft+r.left+(U.isoX(pr.x,pr.y)-cam.x)*r.width/view.width,
       y:outer.top+q.frame.clientTop+r.top+(U.isoY(pr.x,pr.y)-cam.y-f.anchorY*.48)*r.height/view.height,
       wall:m.arenaEntrance.wall,door:{x:pr.x,y:pr.y},arrival:m.spawns.from_arena,zone:m.id};
    });
    await page.locator('iframe').screenshot({path:out+'/'+id+'_'+width+'_wall.png'});
    if(width===844)await page.evaluate(()=>{
     const q=bossQA,{Game:G,U,SpriteAssets:S}=q.api,m=G.state.map,p=m.props.find(p=>p.doorId==='boss_entry_'+m.arenaEntrance.bossId),f=S.getFrame(S.maps.props[p.visual],0);
     const view=q.frame.contentWindow.document.getElementById('view'),r=view.getBoundingClientRect(),cam=G.__bossReview.camera;
     G.touchTap(r.left+(U.isoX(p.x,p.y)-cam.x)*r.width/view.width,r.top+(U.isoY(p.x,p.y)-cam.y-f.anchorY*.48)*r.height/view.height);
    });else await page.mouse.click(parent.x,parent.y);
    await page.evaluate(()=>{if(bossQA.api.Game.state.player.command?.type!=='interact')throw Error('Painted arch did not queue travel');bossQA.advance(4);});
    await page.waitForFunction(id=>bossQA.api.Game.state.map.id==='arena_'+id,id,{timeout:30000});
    await page.evaluate(()=>{bossQA.setPaused(true);bossQA.api.Game.state.map.explored.fill(1);bossQA.api.Game.__bossReview.updateCamera(5);bossQA.render();});
    await page.locator('iframe').screenshot({path:out+'/'+id+'_'+width+'_vestibule.png'});
    const back=await page.evaluate(()=>{
     const q=bossQA,{Game:G,U,SpriteAssets:S}=q.api,m=G.state.map,p=m.props.find(p=>p.doorId?.startsWith('boss_return_')),f=S.getFrame(S.maps.props[p.visual],0);
     const view=q.frame.contentWindow.document.getElementById('view'),r=view.getBoundingClientRect(),outer=q.frame.getBoundingClientRect(),cam=G.__bossReview.camera;
     return {x:outer.left+q.frame.clientLeft+r.left+(U.isoX(p.x,p.y)-cam.x)*r.width/view.width,
       y:outer.top+q.frame.clientTop+r.top+(U.isoY(p.x,p.y)-cam.y-f.anchorY*.48)*r.height/view.height};
    });
    if(width===844)await page.evaluate(()=>{
     const q=bossQA,{Game:G,U,SpriteAssets:S}=q.api,m=G.state.map,p=m.props.find(p=>p.doorId?.startsWith('boss_return_')),f=S.getFrame(S.maps.props[p.visual],0);
     const view=q.frame.contentWindow.document.getElementById('view'),r=view.getBoundingClientRect(),cam=G.__bossReview.camera;
     G.touchTap(r.left+(U.isoX(p.x,p.y)-cam.x)*r.width/view.width,r.top+(U.isoY(p.x,p.y)-cam.y-f.anchorY*.48)*r.height/view.height);
    });else await page.mouse.click(back.x,back.y);
    await page.evaluate(()=>{if(bossQA.api.Game.state.player.command?.type!=='interact')throw Error('Return arch did not queue travel');bossQA.advance(4);});
    await page.waitForFunction(zone=>bossQA.api.Game.state.map.id===zone,parent.zone,{timeout:30000});
    const returned=await page.evaluate(()=>{
     const q=bossQA,{Game:G,TerrainNavigation:N}=q.api,s=G.state,p=s.player,a=s.map.spawns.from_arena;
     if(s.map!==window.doorParent)throw Error('Return did not reuse the original parent');
     if(Math.hypot(p.x-a.x,p.y-a.y)>.01||!N.clear(s.map,p.x,p.y,p.radius))throw Error('Unsafe or wrong return spawn');
     if(q.frame.contentWindow.bossErrors.length)throw Error(q.frame.contentWindow.bossErrors.join('\n'));
     return {sameParent:true,safeArrival:true};
    });
    rows.push({boss:id,width,reducedMotion:width===844,control:width===844?'touch':'mouse',...parent,...returned});
    console.log('PASS wall doorway and round trip',id,width);
   }
   if(width===844){
    const walking=await page.evaluate(async()=>{
     const q=bossQA,{Game:G,U,TerrainNavigation:N}=q.api,{player:p,state:s}=await q.setup('korvath','vanguard');
     q.setPaused(true);p.x=25;p.y=38;p.command=p.path=null;G.__bossReview.updateCamera(5);q.render();
     const goal={x:25.5,y:38.5},view=q.frame.contentWindow.document.getElementById('view'),r=view.getBoundingClientRect(),cam=G.__bossReview.camera;
     if(!s.map.bossArena.sealed||!N.segment(s.map,p.x,p.y,goal.x,goal.y,p.radius))throw Error('Sealed doorway walking fixture is invalid');
     G.touchTap(r.left+(U.isoX(goal.x,goal.y)-cam.x)*r.width/view.width,r.top+(U.isoY(goal.x,goal.y)-cam.y)*r.height/view.height);
     if(p.command?.type!=='move')throw Error('Foreground return arch captured a combat walking tap');
     return {sealedDoorPreservesWalking:true,control:'touch',width:844};
    });
    integration.push(walking);
   }
   await page.close();
  }
  assert.deepEqual(errors,[]);
  fs.writeFileSync(out+'/browser'+(selected?'_'+selected:'')+'.json',JSON.stringify({passed:true,browser:browser.version(),rows,integration,errors},null,2)+'\n');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
