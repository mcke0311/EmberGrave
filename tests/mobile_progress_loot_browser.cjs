const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium,webkit}=require('playwright');
const engine=process.argv.includes('--webkit')?'webkit':'chromium';
const base=process.env.GAME_REVIEW_URL||'http://127.0.0.1:8741';
const out='tmp/mobile-progress-loot';fs.mkdirSync(out,{recursive:true});
const settle=page=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
(async()=>{
 const browser=await (engine==='webkit'?webkit:chromium).launch({...(engine==='webkit'?{}:{channel:'chrome'}),headless:true});
 const page=await browser.newPage({viewport:{width:844,height:390},screen:{width:844,height:390},isMobile:true,hasTouch:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));let checks=0;const ok=(value,message)=>{assert.ok(value,message);checks++;};
 try{
  await page.addInitScript(()=>{
   const store=new Map([['embergrave_options',JSON.stringify({vol:{master:0,sfx:0,music:0}})]]);
   Object.defineProperty(window,'localStorage',{value:{get length(){return store.size},key:i=>[...store.keys()][i]??null,getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(String(k),String(v)),removeItem:k=>store.delete(k),clear:()=>store.clear()}});
   window.__manualMobile=true;
  });
  await page.route('**/js/game.js*',async route=>{
   const source=fs.readFileSync('js/game.js','utf8').replace('    requestAnimationFrame(tick);','    requestAnimationFrame(tick);\n    if(window.__manualMobile)return;')
    .replace('    init, newGame, loadGame,',`    __progressTest:{render,update,place(obj){Object.assign(state.player,obj);state.player.command=state.player.path=null;camPos=null;updateCamera(.05);render();},step(seconds){for(let t=0;t<seconds;t+=.05)update(.05);render();},project(obj,dy=-25){const cam=camera();return {x:U.isoX(obj.x,obj.y)-cam.x,y:U.isoY(obj.x,obj.y)-cam.y-surfaceLift(obj.x,obj.y,obj.surfaceId??0)+dy};},counts:()=>({particles:particles.length,floats:floats.length,novas:novas.length,bolts:bolts.length,delayed:delayed.length})},\n    init, newGame, loadGame,`);
   await route.fulfill({contentType:'text/javascript',body:source});
  });
  await page.goto(base+'/index.html?touch=1',{waitUntil:'load',timeout:120000});
  await page.waitForFunction(()=>typeof Game!=='undefined'&&document.querySelector('#titleMenu button'),null,{timeout:120000});
  // Windows WebKit has no Web Audio; this suite checks visuals and gameplay separately.
  const audioStub=await page.evaluate(()=>{if(window.AudioContext||window.webkitAudioContext)return false;for(const key of Object.keys(Sfx))if(typeof Sfx[key]==='function')Sfx[key]=()=>{};return true;});
  await page.evaluate(async()=>{await Game.newGame('Mobile progress fixture','vanguard',false);await(await import('/tests/completed_hero_fixture.mjs')).loadCompletedHero(Game);UI.hideTitle();UI.closeAll();Game.debugFlags.god=true;MobileControls.sync();});
  for(const [width,height]of [[568,240],[568,320],[667,375],[740,360],[844,390]]){
   await page.setViewportSize({width,height});await settle(page);
   const hud=await page.evaluate(()=>{
    const p=Game.state.player;p.lvl=10;p.xp=DATA.xpForLevel(p.lvl)/2;UI.refreshHUD();
    const xp=document.querySelector('#xpbar'),fill=document.querySelector('#xpfill'),r=xp.getBoundingClientRect(),v=document.querySelector('#mobileVitals').getBoundingClientRect(),z=document.querySelector('#zonelabel').getBoundingClientRect();
    return {visible:getComputedStyle(xp).display!=='none'&&getComputedStyle(xp).visibility!=='hidden',inside:r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight,below:r.top>=v.bottom,clear:r.bottom<=z.top,progress:xp.getAttribute('aria-valuenow'),fill:fill.style.width};
   });
   ok(hud.visible&&hud.inside&&hud.below&&hud.clear,width+'×'+height+': XP fits below vitals and above zone label');
   ok(hud.progress==='50'&&hud.fill==='50%',width+'×'+height+': XP fill updates');
   await page.waitForFunction(()=>Math.abs(document.querySelector('#xpfill').getBoundingClientRect().width/document.querySelector('#xpbar').getBoundingClientRect().width-.5)<.02);
  }
  ok(await page.evaluate(()=>{const p=Game.state.player;p.gainXp(DATA.xpForLevel(p.lvl)-p.xp);UI.refreshHUD();return p.lvl===11&&document.querySelector('#xpbar').getAttribute('aria-valuenow')==='0';}),'level-up resets XP progress');
  ok(await page.evaluate(()=>{const p=Game.state.player;p.lvl=DATA.MAX_LEVEL;UI.refreshHUD();return document.querySelector('#xpbar').getAttribute('aria-valuenow')==='100'&&document.querySelector('#xpbar').title==='Maximum level';}),'maximum level fills XP bar');
  await page.setViewportSize({width:390,height:844});await settle(page);ok(await page.locator('#phoneRotate').isVisible(),'portrait prompt appears');
  await page.setViewportSize({width:844,height:390});await settle(page);ok(await page.locator('#xpbar').isVisible(),'XP returns after rotation');
  await page.locator('[data-action=pack]').tap();await settle(page);ok(await page.evaluate(()=>getComputedStyle(document.querySelector('#xpbar')).visibility==='hidden'),'XP respects menu blocking');
  await page.locator('#workspaceClose').tap();await settle(page);
  await page.screenshot({path:out+'/'+engine+'-xp.png'});

  await page.evaluate(async()=>{const p=Game.state.player;p.lvl=10;p.xp=0;p.computeStats();await Game.enterMap('mines','from_wild');UI.closeAll();Game.state.monsters=[];delete Game.state.quests.q8;Game.state.quests.q7={state:'reward',count:8};MobileControls.sync();});
  for(let i=0;i<3;i++){
   const point=await page.evaluate(()=>{const npc=Game.state.npcs.find(n=>n.survivor);Game.__progressTest.place({x:npc.x+.8,y:npc.y,surfaceId:npc.surfaceId});return Game.__progressTest.project(npc);});
   await page.touchscreen.tap(point.x,point.y);
   await page.evaluate(()=>Game.__progressTest.step(.1));
   ok(await page.evaluate(n=>Game.state.quests.q8?.count===n,i+1),'trusted touch records early survivor '+(i+1));
   ok(await page.evaluate(n=>{const save=JSON.parse(localStorage.getItem(Game.listSaves()[0].slot));return save.campaignsByDifficulty[0].quests.q8.rescued.length===n;},i+1),'early survivor '+(i+1)+' saved immediately');
  }
  await page.evaluate(async()=>{Game.completeQuest('q7');const slot=Game.listSaves()[0].slot;await Game.loadGame(slot);UI.hideTitle();UI.closeAll();Game.acceptQuest('q8');});
  ok(await page.evaluate(()=>Game.state.quests.q8.count===3&&Game.state.quests.q8.state==='reward'),'reload and acceptance preserve all three rescues');
  await page.evaluate(()=>Game.completeQuest('q8'));await page.evaluate(async()=>{await Game.enterMap('mines','from_wild');Game.state.monsters=[];UI.closeAll();});
  ok(await page.evaluate(()=>!Game.state.npcs.some(n=>n.survivor)),'rescued survivors remain absent after turn-in and revisit');

  await page.addScriptTag({path:'tests/item_catalog.js'});
  const artwork=await page.evaluate(async()=>{
   const distinct=[...new Map(ItemCatalog.map(row=>[JSON.stringify(SpriteAssets.itemIconInfo(row.item)),row.item])).values()];
   for(const bundle of new Set(distinct.map(it=>DATA.SPRITE_MANIFEST.entries[SpriteAssets.itemIconInfo(it).assetId].bundle)))await SpriteAssets.loadBundle(bundle);
   const selected=[...new Map(ItemCatalog.map(row=>[row.group,row.item])).values()];let same=true,independent=true;
   for(const item of selected){const shared=SpriteAssets.itemRenderImage(item),a=SpriteAssets.itemIcon(item),b=SpriteAssets.itemIcon(item),pixels=shared.getContext('2d').getImageData(0,0,64,64).data,other=a.getContext('2d').getImageData(0,0,64,64).data;same&&=pixels.every((v,i)=>v===other[i]);independent&&=a!==b&&a!==shared;}
   if(distinct.length<258)throw Error('Not enough distinct artwork for cache eviction coverage');
   // Fill exactly one cache, touch its oldest entry, then force an eviction.
   const items=distinct.slice(0,258);for(const item of items)SpriteAssets.itemRenderImage(item);
   const images=items.slice(0,256).map(it=>SpriteAssets.itemRenderImage(it));
   const recent=SpriteAssets.itemRenderImage(items[0]);SpriteAssets.itemRenderImage(items[256]);
   const bounded=SpriteAssets.itemRenderImage(items[1])!==images[1],lru=SpriteAssets.itemRenderImage(items[0])===recent;
   return {same,independent,bounded,lru,distinct:distinct.length};
  });
  ok(artwork.same,'renderer artwork matches independent UI icons pixel for pixel');ok(artwork.independent,'menu icons remain independent nodes');ok(artwork.bounded,'artwork cache evicts after 256 entries');ok(artwork.lru,'artwork cache honors recent use');
  const performanceRows=await page.evaluate(()=>{
   const p=Game.state.player,s=Game.state,api=Game.__progressTest;s.ground=[];s.fx=[];s.monsters=[];p.hp=p.stats.maxHp;p.command=p.path=null;
   const rows=[],original=document.createElement,shared=SpriteAssets.itemRenderImage;let canvases=0;
   document.createElement=function(name,...args){if(name==='canvas')canvases++;return original.call(this,name,...args);};
   const sample=()=>{api.render();canvases=0;const values=[];for(let i=0;i<45;i++){const t=performance.now();api.render();values.push(performance.now()-t);}values.sort((a,b)=>a-b);return {medianMs:+values[22].toFixed(2),p95Ms:+values[42].toFixed(2),canvasesPerFrame:canvases/45};};
   try{
    for(const count of [0,10,50,100]){s.ground=Array.from({length:count},(_,i)=>({x:p.x+(i%10-5)*.2,y:p.y+(Math.floor(i/10)-5)*.2,item:Items.makeConsumable('hp1'),gold:0,toss:0,surfaceId:p.surfaceId??0}));SpriteAssets.itemRenderImage=SpriteAssets.itemIcon;const before=sample();SpriteAssets.itemRenderImage=shared;const after=sample();rows.push({groundItems:count,before,after});}
    return rows;
   }finally{document.createElement=original;SpriteAssets.itemRenderImage=shared;}
  });
  for(const row of performanceRows)ok(row.after.canvasesPerFrame===0,row.groundItems+' drops: warmed rendering creates no canvases');
  ok(performanceRows.at(-1).before.canvasesPerFrame===100,'benchmark exercises the previous per-frame allocation path');
  const combat=await page.evaluate(async()=>{
   await Game.enterMap('north_wild','from_camp');UI.closeAll();const s=Game.state,p=s.player,api=Game.__progressTest;s.monsters=[];s.fx=[];s.ground=[];api.place({x:p.x,y:p.y});
   const rows=[],create=document.createElement;let canvases=0;document.createElement=function(name,...args){if(name==='canvas')canvases++;return create.call(this,name,...args);};
   try{for(let batch=0;batch<4;batch++){
    for(let i=0;i<25;i++){const mon=new Monster('frost_risen',p.x+2+(i%5)*.2,p.y+(Math.floor(i/5)-2)*.2);s.monsters.push(mon);mon.die(p);}
    api.step(13.5);api.render();canvases=0;for(let i=0;i<10;i++)api.render();rows.push({kills:(batch+1)*25,ground:s.ground.length,monsters:s.monsters.length,canvases,transients:api.counts(),vfx:SkillVFX.diagnostics()});
   }return rows;}finally{document.createElement=create;}
  });
  for(const row of combat){ok(row.monsters===0&&Object.values(row.transients).every(n=>n===0)&&row.vfx.particles===0&&row.vfx.events===0,row.kills+' kills: corpses and combat effects expire');ok(row.canvases===0,row.kills+' kills: surviving loot reuses artwork');}
  ok(combat.at(-1).ground>combat[0].ground,'combat soak retains loot across successive fights');
  const elevated=await page.evaluate(async()=>{
   await Game.enterMap('shard_flats','default');UI.closeAll();const s=Game.state,api=Game.__progressTest;
   // Current maps use terraces; retain coverage of the renderer's optional second surface.
   s.map.surfaceLinks=[];const upper={...s.map,layers:null,elev:s.map.elev.map(h=>h+2)};TerrainSurface.rebuild(upper);s.map.layers={1:upper};
   s.monsters=[];s.fx=[];s.ground=[];api.place({x:s.player.x,y:s.player.y,surfaceId:1});
   s.ground=Array.from({length:25},(_,i)=>({x:s.player.x+(i%5-2)*.2,y:s.player.y+(Math.floor(i/5)-2)*.2,item:Items.makeConsumable('hp1'),gold:0,toss:0,surfaceId:1}));api.render();
   const create=document.createElement,shared=SpriteAssets.itemRenderImage;let canvases=0,reads=0;
   document.createElement=function(name,...args){if(name==='canvas')canvases++;return create.call(this,name,...args);};
   SpriteAssets.itemRenderImage=function(item){reads++;return shared(item);};
   try{for(let i=0;i<10;i++)api.render();return {canvases,reads,ground:s.ground.length};}
   finally{document.createElement=create;SpriteAssets.itemRenderImage=shared;}
  });
  ok(elevated.reads===250,'upper-floor loot uses the shared artwork renderer');ok(elevated.canvases===0,'upper-floor loot creates no canvases after warm-up');
  assert.deepEqual(errors,[]);const report={engine,audioStub,checks,artwork,performanceRows,combat,elevated,errors};
  fs.writeFileSync(out+'/'+engine+'-results.json',JSON.stringify(report,null,2));
  console.log(JSON.stringify({status:'PASS',engine,checks,performanceRows,artwork},null,2));
 }catch(error){await page.screenshot({path:out+'/'+engine+'-failure.png'});throw error;}finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
