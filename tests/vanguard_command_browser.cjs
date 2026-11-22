// Serve workspace assets to an isolated browser context, or point GAME_REVIEW_URL at a running game.
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs/promises');
const {chromium} = require('playwright');
const root = process.env.GAME_REVIEW_URL || 'http://127.0.0.1:8741';

async function openHero(context) {
  if (!process.env.GAME_REVIEW_URL) {
    const workspace=path.resolve(__dirname,'..');
    await context.route(root+'/**',async route=>{
      const pathname=decodeURIComponent(new URL(route.request().url()).pathname);
      const file=path.resolve(workspace,'.'+pathname);
      if (!file.startsWith(workspace+path.sep)) return route.fulfill({status:403});
      try { await fs.access(file); await route.fulfill({path:file}); }
      catch { await route.fulfill({status:404}); }
    });
  }
  const page=await context.newPage();
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(root+'/index.html');
  await page.waitForSelector('#titleMenu button',{timeout:120000});
  await page.evaluate(async()=>{
    Sfx.setVol('master',0);
    await Game.newGame('Company QA','vanguard',false);
    await (await import('/tests/completed_hero_fixture.mjs')).loadCompletedHero(Game);
    UI.hideTitle();UI.closeAll();Game.debugFlags.god=true;
  });
  return {page,errors};
}

(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try {
    const desktop=await browser.newContext({viewport:{width:1366,height:900}});
    const {page,errors}=await openHero(desktop);
    await page.keyboard.press('t');
    assert.equal(await page.locator('.arms-paths .talent-node').count(),14);
    const lanes=await page.locator('.arms-paths > section').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().left));
    assert.ok(lanes[1]>lanes[0]);
    await page.locator('#discipline-2').click();
    await page.locator('[data-learn-skill="recruit_shieldguard"]').click();
    assert.deepEqual(await page.evaluate(()=>Array.from(Game.state.player.quickSlots).slice(0,2)),['recruit_shieldguard','field_orders']);
    await page.evaluate(()=>{UI.closeAll();Game.options.directCast=true;});
    await page.mouse.move(680,355);await page.keyboard.press('F1');
    await page.waitForFunction(()=>Game.state.player.companySoldiers().length===1);
    await page.keyboard.press('F2');
    await page.waitForFunction(()=>Game.state.player.companyOrderUntil>Game.state.time);
    await page.evaluate(()=>{const p=Game.state.player;p.skillR='field_orders';p.clearCompanyOrders();});
    await page.mouse.click(660,350,{button:'right'});
    await page.waitForFunction(()=>Game.state.player.companyOrderUntil>Game.state.time);
    // Load a saved pre-merge Assault build using its original item, skill and perk keys.
    const restored=await page.evaluate(async()=>{
      Game.state.player.equip.chest.affixes.push({stat:'skillTree_vanguard_2',val:2});Game.saveGame();
      const slot=Game.listSaves().find(h=>h.name==='Company QA').slot, record=JSON.parse(localStorage.getItem(slot));
      record.skills={vanguard_2_0:5};record.skillPerks={vanguard_2_0:{5:'vanguard_2_0_r5_1'}};
      record.quickSlots=['vanguard_2_0',null,null,null];record.skillR='vanguard_2_0';
      localStorage.setItem(slot,JSON.stringify(record));await Game.loadGame(slot);
      const p=Game.state.player;return [p.effRank('vanguard_2_0'),p.quickSlots[0],p.skillR,p.skillPerks.vanguard_2_0[5],p.canBindSkill('field_orders')];
    });
    assert.deepEqual(restored,[7,'vanguard_2_0','vanguard_2_0','vanguard_2_0_r5_1',false]);
    if(process.env.VANGUARD_TREE_PREVIEW) {
      await page.evaluate(()=>{
        const p=Game.state.player;p.lvl=24;p.skillPts=9;
        Object.assign(p.skills,{recruit_shieldguard:1,recruit_bowman:1,recruit_standard_bearer:5,shieldwall_drill:1,volley_drill:1,field_logistics:1});
        p.chooseSkillPerk('recruit_standard_bearer',5,DATA.SKILL_PERKS.recruit_standard_bearer[5][0].id);
        UI.closeAll();UI.togglePanel('skills');
      });
      await page.locator('#discipline-2').click();
      await page.locator('.talent-node[data-skill="recruit_standard_bearer"]').click();
      await page.locator('#centerMsg').waitFor({state:'hidden'});
      await page.locator('#panelLeft').screenshot({path:process.env.VANGUARD_TREE_PREVIEW});
      for(const [i,branch] of ['arms','warcries'].entries()){
        await page.locator('#discipline-'+i).click();
        await page.locator('.talent-node').first().click();
        await page.locator('#panelLeft').screenshot({path:path.join(path.dirname(process.env.VANGUARD_TREE_PREVIEW),'vanguard-'+branch+'.png')});
      }
    }
    assert.deepEqual(errors,[]);await desktop.close();

    const phone=await browser.newContext({viewport:{width:740,height:390},screen:{width:740,height:390},hasTouch:true,isMobile:true,deviceScaleFactor:1});
    const mobile=await openHero(phone), tab=mobile.page;
    await tab.evaluate(()=>{UI.togglePanel('skills');});
    await tab.locator('#discipline-0').tap();
    const tops=await tab.locator('.arms-paths > section').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().top));
    assert.ok(tops[1]>tops[0]);
    await tab.evaluate(()=>{
      UI.closeAll();const p=Game.state.player;p.skills={recruit_shieldguard:1,recruit_bowman:1,recruit_standard_bearer:1};
      p.quickSlots=['field_orders',null,null,null];p.computeStats();p.mana=p.stats.maxMana;
      for(const id of Object.keys(p.skills))p.performSkill(id,null,p);
      UI.refreshHUD();
    });
    await tab.waitForFunction(()=>Game.state.player.companySoldiers().length===3);
    const looks=await tab.evaluate(()=>Game.state.player.companySoldiers().map(unit=>{
      const canvas=document.createElement('canvas');canvas.width=144;canvas.height=144;
      const ctx=canvas.getContext('2d');ctx.translate(72,118);
      Player3D.drawSoldier(ctx,unit.companyRole,{ang:1,state:'idle',t:.1,ex:{}});
      const pixels=ctx.getImageData(0,0,144,144).data;
      return {role:unit.companyRole,opaque:pixels.filter((v,i)=>i%4===3&&v>127).length,frame:canvas.toDataURL()};
    }));
    assert.ok(looks.every(l=>l.opaque>150));assert.equal(new Set(looks.map(l=>l.frame)).size,3);
    await tab.evaluate(()=>{
      const s=Game.state,p=s.player,m=new Monster('frost_risen',p.x+2,p.y);
      m.surfaceId=p.surfaceId;m.hp=m.maxHp=10000;m.update=()=>{};s.monsters.push(m);
    });
    await tab.evaluate(()=>UI.togglePanel('skills'));
    await tab.locator('.phone-loadout-tab').tap();
    assert.match(await tab.locator('[data-loadout="Q0"]').textContent(),/Field Orders/);
    await tab.evaluate(()=>UI.closeAll());
    const button=tab.locator('#mobileQuick0');
    await button.tap();
    await tab.waitForFunction(()=>!!Game.state.player.companyFocus);
    const box=await button.boundingBox(), cdp=await phone.newCDPSession(tab);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2}]});
    await tab.waitForFunction(()=>!Game.state.player.companyFocus && Game.state.player.companyOrderUntil>Game.state.time);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    assert.equal(await tab.evaluate(()=>Game.state.player.companyFocus),null);
    assert.deepEqual(mobile.errors,[]);await phone.close();
    console.log('PASS desktop and phone talent layouts, recruitment, 3D soldiers, mouse, F-key and touch orders, and legacy save loading.');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
