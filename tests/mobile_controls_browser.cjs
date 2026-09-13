// Run with python serve.py and Playwright/Chrome available. Saves are isolated.
const {chromium}=require('playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const path=require('node:path');
const {reveal}=require('./phone_page_helpers.cjs');
(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844},screen:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
    const store=new Map([['embergrave_options',JSON.stringify({vol:{master:0,sfx:0,music:0}})]]);
    Object.defineProperty(window,'localStorage',{value:{get length(){return store.size;},key:i=>[...store.keys()][i]??null,getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(String(k),String(v)),removeItem:k=>store.delete(k),clear:()=>store.clear()}});
  });
  let checks=0;const ok=(v,m)=>{checks++;assert.ok(v,m);};
  try {
    await page.goto('http://127.0.0.1:8741/index.html',{waitUntil:'load',timeout:120000});
    await page.waitForFunction(()=>document.querySelector('#titleMenu button'),null,{timeout:120000});
    ok(await page.evaluate(()=>MobileControls.enabled),'touch hardware was not detected');
    ok(await page.locator('#mobileControls').isHidden(),'controls overlay the title');
    ok(await page.locator('#phoneRotate').isVisible(),'portrait rotation gate missing');
    await page.setViewportSize({width:568,height:320});await page.waitForFunction(()=>!MobileShell.blocked);
    console.log('Landscape ready; preparing an isolated hero.');
    await page.evaluate(async()=>{await Game.newGame('Mobile QA','vanguard',false);await (await import('/tests/completed_hero_fixture.mjs')).loadCompletedHero(Game);Game.debugFlags.god=true;UI.hideTitle();UI.closeAll();});
    await page.waitForFunction(()=>Game.touchReady(),null,{timeout:120000});
    await page.evaluate(()=>{window.__touchEvents=[];for(const type of ['pointerdown','pointerup','pointercancel','lostpointercapture'])document.addEventListener(type,e=>window.__touchEvents.push({type,id:e.pointerId,target:e.target.id}),true);});
    const client=await context.newCDPSession(page);
    const points=new Map();
    async function touch(type,id,x,y){
      const ending=points.get(id);
      if(type==='touchEnd')points.delete(id);else points.set(id,{id,x,y,radiusX:3,radiusY:3,force:1});
      await client.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?(points.size?[ending]:[]):[...points.values()]});
    }
    const center=async selector=>{const r=await page.locator(selector).boundingBox();return {x:r.x+r.width/2,y:r.y+r.height/2};};
    async function bounds(label){
      const bad=await page.evaluate(()=>[...document.querySelectorAll('#mobileControls button,#mobileMoveZone,#beltBar button,#quickbar button,#hudbuttons button')].filter(el=>el.getClientRects().length).map(el=>({id:el.id||el.textContent,r:el.getBoundingClientRect()})).filter(({r})=>r.x<0||r.y<0||r.right>innerWidth+1||r.bottom>innerHeight+1||r.width<43||r.height<43).map(x=>x.id));
      ok(!bad.length,`${label} clipped or undersized controls: ${bad}`);
    }
    fs.mkdirSync(path.join(__dirname,'../tmp/mobile-controls'),{recursive:true});
    await bounds('small landscape');
    await page.screenshot({path:'tmp/mobile-controls/portrait.png'});
    console.log('Landscape geometry passed; checking trusted multitouch and panels.');
    const stick=await center('#mobileMoveZone');
    const before=await page.evaluate(()=>({x:Game.state.player.x,y:Game.state.player.y}));
    await touch('touchStart',1,stick.x,stick.y);await touch('touchMove',1,stick.x+40,stick.y);
    await page.waitForTimeout(350);
    ok(await page.evaluate(b=>Math.hypot(Game.state.player.x-b.x,Game.state.player.y-b.y)>.05,before),'trusted thumbstick touch did not move');
    const attack=await center('#mobileAttack');
    await touch('touchStart',2,attack.x,attack.y);await touch('touchEnd',2);
    ok(await page.evaluate(()=>document.querySelector('#mobileMoveZone').classList.contains('pressed')),'second finger released the stick: '+JSON.stringify(await page.evaluate(()=>window.__touchEvents)));
    const potion=await center('#beltBar button:first-child');
    const draughts=await page.evaluate(()=>{const p=Game.state.player;p.hp=p.stats.maxHp/2;return p.belt[0].count;});
    await touch('touchStart',2,potion.x,potion.y);await touch('touchEnd',2);
    ok(await page.evaluate(n=>Game.state.player.belt[0].count<n&&document.querySelector('#mobileMoveZone').classList.contains('pressed'),draughts),'drinking with a second finger failed or stopped movement: '+JSON.stringify(await page.evaluate(()=>({belt:Game.state.player.belt[0],pressed:document.querySelector('#mobileMoveZone').classList.contains('pressed'),events:window.__touchEvents}))));
    await touch('touchEnd',1);
    const stopped=await page.evaluate(()=>({x:Game.state.player.x,y:Game.state.player.y}));await page.waitForTimeout(250);
    ok(await page.evaluate(b=>Math.hypot(Game.state.player.x-b.x,Game.state.player.y-b.y)<.001,stopped),'touch release did not stop');
    await touch('touchStart',1,stick.x+40,stick.y);
    await client.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});points.clear();
    ok(await page.evaluate(()=>!Game.state.player.command?.touch),'pointercancel retained movement');
    await touch('touchStart',1,stick.x+40,stick.y);
    await page.evaluate(()=>Game.resetTouch());
    ok(await page.evaluate(()=>!document.querySelector('#mobileMoveZone').classList.contains('pressed')),'game lifecycle reset retained pointer capture');
    await touch('touchMove',1,stick.x+45,stick.y);await touch('touchEnd',1);
    ok(await page.evaluate(()=>!Game.state.player.command?.touch),'old gesture resumed after lifecycle reset');
    await page.evaluate(()=>{
      const s=Game.state,p=s.player;p.action=null;p.skillL='basic';p.stunT=0;
      const mon=new Monster('risen',p.x+.8,p.y);mon.hp=mon.maxHp=10000;mon.update=()=>{};
      s.monsters=[mon];window.__touchEnemy=mon;
    });
    await touch('touchStart',2,attack.x,attack.y);await page.waitForTimeout(900);await touch('touchEnd',2);
    ok(await page.evaluate(()=>window.__touchEnemy.hp<10000),'touch Attack did not deal real combat damage');
    await page.evaluate(()=>{Game.state.monsters=[];});
    await page.locator('#mobileQuick0').tap();
    ok(await page.locator('#skillPick').isVisible(),'Assign did not open skill picker');
    ok(await page.locator('#mobileMoveZone').isHidden(),'skill picker left movement enabled');
    await page.locator('#workspaceBack').tap();
    await page.locator('[data-action="pack"]').tap();
    ok(await page.locator('#mobileMoveZone').isHidden(),'inventory left movement enabled');
    let panel=await page.locator('#panelRight').boundingBox();ok(panel.x>=0&&panel.width<=568&&panel.height<=320,'landscape inventory does not fit');
    await page.screenshot({path:'tmp/mobile-controls/inventory.png'});
    const beltBefore=await page.evaluate(()=>Game.state.player.belt.reduce((n,b)=>n+(b?.count||0),0));
    await reveal(page.locator('#panelRight .invgrid .invitem').first());await page.locator('#panelRight .invgrid .invitem').first().tap();
    await page.screenshot({path:'tmp/mobile-controls/item-actions.png'});
    ok(await page.locator('#touchItemMenu').isVisible(),'inventory tap did not open item actions: '+errors.join('; '));
    await reveal(page.getByRole('button',{name:'Move to belt',exact:true,includeHidden:true}));await page.getByRole('button',{name:'Move to belt',exact:true,includeHidden:true}).tap();
    ok(await page.evaluate(n=>Game.state.player.belt.reduce((sum,b)=>sum+(b?.count||0),0)>n,beltBefore),'touch item action did not stock the belt');
    await page.locator('#workspaceClose').tap();
    await page.locator('[data-action="pack"]').tap();await page.locator('#workspacePrimaryTabs [data-section=skills]').tap();
    await page.screenshot({path:'tmp/mobile-controls/talents.png'});
    ok(await page.evaluate(()=>{const el=document.querySelector('#panelLeft');return el.scrollWidth<=el.clientWidth+1;}),'talent panel overflows horizontally');
    await page.locator('#workspaceClose').tap();
    await page.locator('[data-action="phone-menu"]').tap();
    ok(await page.locator('#escmenu').isVisible(),'Menu did not open');
    await reveal(page.getByRole('button',{name:'Controls',exact:true,includeHidden:true}));await page.getByRole('button',{name:'Controls',exact:true,includeHidden:true}).tap();
    ok(await page.locator('#escmenu').textContent().then(t=>t.includes('Thumbstick')),'touch instructions missing');
    await page.locator('#workspaceBack').tap();await reveal(page.getByRole('button',{name:'Resume',exact:true,includeHidden:true}));await page.getByRole('button',{name:'Resume',exact:true,includeHidden:true}).tap();
    // Rotation must release any captured touches and preserve usable geometry.
    await touch('touchStart',1,stick.x+40,stick.y);
    await page.setViewportSize({width:844,height:390});
    await client.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});points.clear();
    await page.waitForTimeout(350);
    ok(await page.evaluate(()=>!Game.state.player.command?.touch),'rotation retained movement');
    await bounds('landscape');await page.screenshot({path:'tmp/mobile-controls/landscape.png'});
    await page.locator('[data-action="pack"]').tap();await page.locator('#workspacePrimaryTabs [data-section=skills]').tap();panel=await page.locator('#panelLeft').boundingBox();
    ok(panel.y>=0&&panel.y+panel.height<=390,'landscape panel is clipped');await page.locator('#workspaceClose').tap();
    await page.setViewportSize({width:320,height:568});await page.waitForFunction(()=>MobileShell.blocked);
    ok(await page.locator('#phoneRotate').isVisible(),'portrait gate missing after rotation');
    const time=await page.evaluate(()=>Game.state.time);await page.waitForTimeout(150);
    ok(await page.evaluate(t=>Game.state.time===t,time),'solo game advanced behind portrait gate');
    await page.setViewportSize({width:568,height:320});await page.waitForFunction(()=>!MobileShell.blocked);await bounds('small landscape returned');
    const desktop=await browser.newContext({viewport:{width:1280,height:800}}),desk=await desktop.newPage();
    await desk.goto('http://127.0.0.1:8741/index.html',{waitUntil:'load',timeout:120000});
    await desk.waitForFunction(()=>document.querySelector('#titleMenu button'),null,{timeout:120000});
    ok(await desk.evaluate(()=>!MobileControls.enabled&&!document.body.classList.contains('touch-controls')),'desktop layout changed');
    await desktop.close();ok(!errors.length,`browser errors: ${errors.join('; ')}`);
    console.log(`PASS ${checks} mobile browser checks; screenshots in tmp/mobile-controls.`);
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
