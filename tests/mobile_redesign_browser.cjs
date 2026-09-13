// Production phone flows, with isolated saves and trusted taps/scroll gestures.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {reveal}=require('./phone_page_helpers.cjs');
const base=process.env.GAME_REVIEW_URL||'http://127.0.0.1:8741';
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const context=await browser.newContext({viewport:{width:844,height:390},screen:{width:844,height:390},isMobile:true,hasTouch:true,deviceScaleFactor:1});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.stack));
 await page.addInitScript(()=>{const store=new Map([['embergrave_options',JSON.stringify({vol:{master:0,sfx:0,music:0}})]]);Object.defineProperty(window,'localStorage',{value:{get length(){return store.size;},key:i=>[...store.keys()][i]??null,getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(String(k),String(v)),removeItem:k=>store.delete(k),clear:()=>store.clear()}});});
 let checks=0;const ok=(value,message)=>{assert.ok(value,message);checks++;};
 const click=async locator=>{await reveal(locator);await locator.tap();};
 const settle=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 const out='tmp/phone-redesign';fs.mkdirSync(out,{recursive:true});
 try{
  await page.goto(base+'/index.html?touch=1',{waitUntil:'load',timeout:120000});
  await page.waitForFunction(()=>typeof Game!=='undefined'&&document.querySelector('#titleMenu button'),null,{timeout:120000});
  await page.evaluate(async()=>{
    await Game.newGame('Phone redesign','vanguard',false);await (await import('/tests/completed_hero_fixture.mjs')).loadCompletedHero(Game);Game.debugFlags.god=true;UI.hideTitle();UI.closeAll();
    const p=Game.state.player;p.lvl=35;p.skillPts=20;
    const skills=Object.values(DATA.SKILLS).filter(s=>s.cls===p.classId&&s.type!=='passive').slice(0,4);
    for(const s of skills)p.skills[s.id]=1;p.quickSlots=skills.map(s=>s.id);p.computeStats();p.hp=p.stats.maxHp;p.mana=p.stats.maxMana;
    p.inv.items=[];for(let i=0;i<16;i++){const it=Items.makeConsumable(i%2?'hp1':'idscroll',i+1);Items.autoPlace(p.inv,it);}
    const gear=Items.fromBase('shortsword');gear.identified=true;Items.autoPlace(p.inv,gear);window.__reviewGear=gear.uid;
    UI.refreshHUD();Game.state.monsters=[];
  });
  for(const [width,height] of [[568,240],[568,320],[667,375],[844,390]]){
    await page.setViewportSize({width,height});await settle();await page.evaluate(()=>MobileWorkspace.close());await settle();
    const geometry=await page.evaluate(()=>{
      const nodes=[...document.querySelectorAll('#mobileControls button,#beltBar button,#mobileMoveZone')].filter(n=>n.getClientRects().length&&getComputedStyle(n).visibility!=='hidden'),bad=[];
      for(const n of nodes){const r=n.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);if(r.left<0||r.top<0||r.right>innerWidth+1||r.bottom>innerHeight+1||r.width<43||r.height<43||!n.contains(hit))bad.push(n.id||n.getAttribute('aria-label'));}
      for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){const a=nodes[i].getBoundingClientRect(),b=nodes[j].getBoundingClientRect();if(Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1)bad.push('overlap '+(nodes[i].id||nodes[i].textContent)+' / '+(nodes[j].id||nodes[j].textContent));}
      return bad;
    });ok(!geometry.length,width+'×'+height+' HUD geometry '+geometry);
    await page.screenshot({path:out+'/game-'+width+'x'+height+'.png'});
    await page.locator('[data-action=pack]').tap();await settle();
    const time=await page.evaluate(()=>Game.state.time);await page.waitForTimeout(100);ok(await page.evaluate(t=>Game.state.time===t,time),'Pack pauses solo');
    await click(page.locator('#panelRight [data-mobile-tab=pack]'));await page.screenshot({path:out+'/pack-'+width+'x'+height+'.png'});
    await click(page.locator('#panelRight [data-mobile-tab=equipment]'));await page.screenshot({path:out+'/equipment-'+width+'x'+height+'.png'});
    await click(page.locator('#panelRight [data-mobile-tab=belt]'));ok(await page.locator('.phone-belt-card').count()===4,'four belt slots in management');
    await page.locator('#workspacePrimaryTabs [data-section=skills]').tap();await settle();
    await click(page.locator('#panelLeft .phone-loadout-tab'));ok(await page.locator('[data-loadout]').count()===5,'Attack plus four assignment slots');
    await page.screenshot({path:out+'/loadout-'+width+'x'+height+'.png'});
    await click(page.locator('[data-loadout=Q3]'));ok(await page.locator('#skillPick').isVisible(),'loadout opens picker');
    await click(page.locator('#skillPick .pickopt').first());await settle();ok(await page.locator('#skillPick').isHidden(),'assignment closes picker');
    ok(await page.evaluate(()=>document.activeElement.dataset.loadout==='Q3'),'assignment restores loadout focus');
    await click(page.locator('#discipline-0'));await click(page.locator('.talent-node').first());await settle();
    ok(await page.locator('#skillDetail').isVisible()&&await page.locator('.talent-board').isHidden(),'skill detail is an exclusive view');
    await page.screenshot({path:out+'/skill-detail-'+width+'x'+height+'.png'});await page.locator('#workspaceBack').tap();
    ok(await page.locator('.talent-board').isVisible(),'skill Back restores discipline');
    await page.locator('#workspacePrimaryTabs [data-section=quest]').tap();await click(page.locator('.qrow').first());await settle();
    ok(await page.locator('.qdetail').isVisible()&&await page.locator('.qlist').isHidden(),'quest detail is an exclusive view');await page.locator('#workspaceBack').tap();
    await page.locator('#workspacePrimaryTabs [data-section=more]').tap();await settle();await page.screenshot({path:out+'/more-'+width+'x'+height+'.png'});
    await click(page.locator('#escmenu').getByRole('button',{name:'Settings',exact:true}));await settle();await page.screenshot({path:out+'/settings-'+width+'x'+height+'.png'});
    await page.locator('#workspaceClose').tap();ok(await page.locator('#escmenu').isHidden(),'Close settings returns to game');
  }
  // Direct casts must not alter mouse assignments, including four trusted fingers in sequence.
  await page.evaluate(()=>{const p=Game.state.player;window.__casts=[];window.__bindings=[p.skillL,p.skillR];const id=Object.values(DATA.SKILLS).find(s=>s.type==='buff').id;p.skills[id]=1;p.quickSlots=[id,id,id,id];p.mana=1e6;p.performSkill=id=>{window.__casts.push(id);return true;};p.action=null;});
  for(let i=0;i<4;i++)await page.locator('#mobileQuick'+i).tap();
  ok(await page.evaluate(()=>__casts.length===4&&Game.state.player.skillL===__bindings[0]&&Game.state.player.skillR===__bindings[1]),'four trusted direct casts preserve mouse bindings');
  await page.locator('[data-action=pack]').tap();await click(page.locator('#panelRight [data-mobile-tab=pack]'));
  // Natural touch scrolling must not open an item or move the hero.
  const client=await context.newCDPSession(page),before=await page.evaluate(()=>({x:Game.state.player.x,y:Game.state.player.y}));
  await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:230,y:330,id:1}]});
  for(const y of [310,280,245,205,165]){await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:230,y,id:1}]});await page.waitForTimeout(20);}
  await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(250);
  ok(await page.locator('#touchItemMenu').count()===0,'scrolling cards does not inspect an item');
  ok(await page.evaluate(b=>Game.state.player.x===b.x&&Game.state.player.y===b.y,before),'menu scroll does not move hero');
  const scroll=await page.locator('#panelRight').evaluate(n=>n.scrollTop);ok(scroll>0,'trusted swipe scrolls inventory');
  await page.locator('#workspacePrimaryTabs [data-section=char]').tap();await page.locator('#workspacePrimaryTabs [data-section=inv]').tap();await settle();
  ok(await page.locator('#panelRight').evaluate((n,y)=>Math.abs(n.scrollTop-y)<2,scroll),'tab round trip restores scroll');
  await click(page.locator('#panelRight .invitem').last());await settle();ok(await page.locator('#touchItemMenu').isVisible(),'item details open');
  ok(!/right-click/i.test(await page.locator('#touchItemMenu').innerText()),'touch comparisons use touch instructions');
  await page.screenshot({path:out+'/item-comparison.png'});await page.locator('#workspaceBack').tap();ok(await page.locator('#touchItemMenu').count()===0,'item Back restores list');
  await page.evaluate(()=>{window.__phoneKeyCalls=0;Game.state.player.quaff=()=>__phoneKeyCalls++;});
  await page.locator('#workspaceTitle').focus();for(const key of ['1','2','3','4','F1','F2','Space','m','l','i'])await page.keyboard.press(key);
  ok(await page.evaluate(()=>__phoneKeyCalls===0&&UI.openPanels().right==='inv'&&!Game.state.player.jumping),'phone menus isolate gameplay keys');
  await page.keyboard.press('Escape');ok(await page.locator('#workspaceHeader').isHidden(),'Escape closes top-level menu');
  // Tablets keep the original paired workspace, grid inventory and touch controls.
  const tabletContext=await browser.newContext({viewport:{width:1024,height:768},screen:{width:1024,height:768},hasTouch:true,isMobile:true});
  const tablet=await tabletContext.newPage();tablet.on('pageerror',e=>errors.push(e.stack));
  await tablet.addInitScript(()=>{const store=new Map();Object.defineProperty(window,'localStorage',{value:{get length(){return store.size;},key:i=>[...store.keys()][i]??null,getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(String(k),String(v)),removeItem:k=>store.delete(k),clear:()=>store.clear()}});});
  await tablet.goto(base+'/index.html',{waitUntil:'load',timeout:120000});
  await tablet.waitForFunction(()=>typeof Game!=='undefined'&&document.querySelector('#titleMenu button'));
  await tablet.evaluate(async()=>{await Game.newGame('Tablet review','vanguard',false);await (await import('/tests/completed_hero_fixture.mjs')).loadCompletedHero(Game);UI.hideTitle();UI.openStorage();});
  await tablet.locator('#workspaceHeader').waitFor();
  ok(await tablet.evaluate(()=>!MobileShell.enabled&&MobileControls.enabled&&document.getElementById('workspaceHeader').parentElement.id==='panelWorkspace'),'tablet retains the existing workspace');
  await tablet.locator('#workspaceTabs [data-side=right]').tap();
  ok(await tablet.evaluate(()=>{const header=document.getElementById('workspaceHeader').getBoundingClientRect(),panel=document.getElementById('panelRight').getBoundingClientRect();return header.bottom<=panel.top+1&&document.querySelector('#panelRight .invgrid').style.height&&getComputedStyle(document.querySelector('#panelRight .invcell')).display!=='none'&&!document.querySelector('.phone-subtabs');}),'tablet related tabs stay above the original inventory grid');
  await tablet.screenshot({path:out+'/tablet-1024x768.png'});
  await tablet.locator('#workspaceClose').tap();ok(await tablet.locator('#workspaceHeader').isHidden(),'tablet Close remains reachable');
  await tabletContext.close();
  assert.deepEqual(errors,[]);fs.writeFileSync(out+'/report.json',JSON.stringify({status:'PASS',checks,errors},null,2));console.log('PASS '+checks+' mobile redesign interaction checks. Screenshots: '+out);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
