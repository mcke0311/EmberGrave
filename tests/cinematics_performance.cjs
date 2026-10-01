/* RAF-paced CPU submission, same renderer/world and authored camera path.
   Ordinary mode includes normal zoom and the same-projection control. No FPS claim. */
const fs=require('node:fs'),path=require('node:path');
const runtime=path.join(process.env.USERPROFILE||'','.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=require(require.resolve('playwright',{paths:[__dirname,runtime]}));
const base=process.env.GAME_REVIEW_URL||'http://127.0.0.1:8741',out=path.join(__dirname,'../tmp/cinematics');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage(),runs=[],errors=[];
 page.on('pageerror',e=>errors.push(e.stack));
 try{
  await page.addInitScript(()=>{window.profileRAF=window.requestAnimationFrame.bind(window);window.requestAnimationFrame=()=>0;});
  await page.route(/\/js\/game\.js(?:\?|$)/,async route=>{
   const response=await route.fetch();let body=await response.text();
   body=body.replace('  function camera() {','  let profileProjection=null;\n  function camera() {\n    if(profileProjection)return profileProjection;');
   body=body.replace('    init, newGame, loadGame,',`    __cineProfile:{frame:(world,p)=>{const before=state,oldCam=camPos;try{state=world;const z=p.zoom||1;profileProjection={zoom:z,x:U.isoX(p.x,p.y)-canvas.width/z*(p.anchorX||.5),y:U.isoY(p.x,p.y)-surfaceLift(p.x,p.y,p.surfaceId)-(p.lift||0)-canvas.height/z*(p.anchorY||.5)};render();}finally{state=before;camPos=oldCam;profileProjection=null;}}},\n    init, newGame, loadGame,`);
   await route.fulfill({response,body});
  });
  await page.route(/\/js\/cinematics\.js(?:\?|$)/,async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace('return {request,tick,cancel','return {__session:()=>session,request,tick,cancel')});});
  await page.goto(base+'/index.html');await page.waitForSelector('#titleMenu button',{timeout:120000});
  await page.evaluate(async()=>{Sfx.setVol('master',0);await Game.newGame('Cinematic performance QA','vanguard',false);await (await import('/tests/completed_hero_fixture.mjs')).loadCompletedHero(Game);UI.closeAll();});
  const cases=[{id:'ending_destroy',at:9.5,span:3,label:'contact close shot'},{id:'ending_destroy',at:14.1,span:3,label:'shatter peak'},{id:'cathedral',at:4.2,span:3,label:'island assembly'},{id:'breach',at:9.2,span:3,label:'distant conflict'}];
  for(const viewport of [{width:844,height:390},{width:1920,height:1080},{width:3840,height:2160}])for(const scenario of cases){
   await page.setViewportSize(viewport);
   for(let pair=0;pair<2;pair++)for(const mode of pair%2?['cinematic','ordinary-projection','ordinary']:['ordinary','ordinary-projection','cinematic']){
    await page.evaluate(id=>{Cinematics.request(id,{replay:true});},scenario.id);
    await page.waitForFunction(()=>Cinematics.state?.ready,null,{polling:50,timeout:60000});
    if(await page.evaluate(()=>Cinematics.state.fallback))throw Error(scenario.id+' could not prepare');
    const result=await page.evaluate(async({mode,scenario})=>{
     const points=[],worlds=[],next=()=>new Promise(profileRAF),count=90;
     for(let i=0;i<count;i++){Cinematics.seek(scenario.at+scenario.span*i/(count-1));points.push(Cinematics.cameraFrame());worlds.push(Cinematics.presentationWorld);}
     const world=worlds[0],hero=Cinematics.__session().stage.hero;
     if(mode!=='cinematic'){Object.assign(world.player,{x:hero.x,y:hero.y,cinematicAlpha:hero.cinematicAlpha});Cinematics.cancel('ordinary control');}
     const step=scenario.span/(count-1);
     const draw=(i,warm=false)=>{const p=points[i];if(mode==='cinematic'){if(warm)Cinematics.seek(scenario.at+step*i);else if(i)Cinematics.tick(step);}Game.__cineProfile.frame(world,mode==='ordinary'?{...p,zoom:1,lift:20}:p);};
     // Warm the same map, scene assets, models and camera span in every mode.
     for(let i=0;i<45;i++){draw(i*2,true);await next();}
     if(mode==='cinematic')Cinematics.seek(scenario.at);else LevelTerrain.resetView();
     const samples=[];for(let i=0;i<count;i++){const start=performance.now();draw(i);samples.push(performance.now()-start);await next();}
     Cinematics.cancel('profile complete');const sorted=[...samples].sort((a,b)=>a-b),at=q=>sorted[Math.floor(q*(sorted.length-1))];return {median:at(.5),p95:at(.95),max:at(1),samples};
    },{mode,scenario});
    runs.push({viewport,scenario:scenario.label,id:scenario.id,mode,pair,...result});console.log(viewport.width,scenario.label,pair,mode,JSON.stringify({median:result.median,p95:result.p95}));
   }
  }
  const comparisons=[];
  for(const width of [844,1920,3840])for(const scenario of cases){
   const mean=(mode,stat)=>{const rows=runs.filter(r=>r.viewport.width===width&&r.scenario===scenario.label&&r.mode===mode);return rows.reduce((s,r)=>s+r[stat],0)/rows.length;};
   comparisons.push({width,scenario:scenario.label,...Object.fromEntries(['ordinary','ordinary-projection','cinematic'].map(mode=>[mode,{median:mean(mode,'median'),p95:mean(mode,'p95')}]))});
  }
  fs.writeFileSync(out+'/performance.json',JSON.stringify({method:'Two alternating pairs at 844×390, 1080p and 4K. 45 warmup and 90 measured RAF-paced frames over each authored 3-second camera path. Same maps, equipped hero positions and camera points: ordinary renderer at zoom 1, ordinary renderer at the matching cinematic projection, and directed presentation. CPU submission milliseconds, including cinematic evaluation, excluding asset loading. Does not measure GPU completion/device FPS.',comparisons,runs,errors},null,2));
  if(errors.length)throw Error(errors.join('\n'));console.log('PASS 12 ordinary/projection/cinematic performance comparisons; tmp/cinematics/performance.json');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
