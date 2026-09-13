// Uses a fresh browser context and an in-memory hero; never loads a user save.
const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
const runtime=path.join(process.env.USERPROFILE||'', '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=require(require.resolve('playwright',{paths:[runtime,__dirname]}));
const root=process.env.GAME_REVIEW_URL||'http://127.0.0.1:8756',dest='tests/qa/character_sheet';
fs.mkdirSync(dest,{recursive:true});
(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true}),context=await browser.newContext({viewport:{width:1366,height:900}}),page=await context.newPage();
  const report={checks:0,errors:[],missing:[]},ok=(v,m)=>{report.checks++;assert.ok(v,m);};
  page.on('pageerror',e=>report.errors.push(String(e)));
  page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))report.missing.push(r.url());});
  const row=id=>page.locator(`[data-stat-id="${id}"]`), read=id=>row(id).locator('.v').innerText();
  try{
    await page.goto(root+'/index.html');await page.waitForSelector('#titleMenu button',{timeout:90000});
    await page.evaluate(async()=>{
      Sfx.setVol('master',0);await Game.newGame('Character Sheet Review','veilranger',false);await (await import('/tests/completed_hero_fixture.mjs')).loadCompletedHero(Game);
      Game.debugFlags.god=true;Game.state.monsters=[];UI.closeAll();
      const p=Game.state.player;p.lvl=20;p.attrPts=2;
      p.equip.main.affixes.push({stat:'fireDmg',val:10},{stat:'coldDmg',val:15},{stat:'lightDmg',val:22},{stat:'poisonDmg',val:18},{stat:'fireDmgPct',val:50},{stat:'poisonDmgPct',val:40});
      p.skills.veilranger_0_2=5;
      const trap=Object.values(DATA.SKILLS).find(s=>s.cls==='veilranger'&&s.type==='trap'&&s.trapKind==='powder');p.skills[trap.id]=3;
      p.skillL='veilranger_0_2';p.skillR=trap.id;p.computeStats();UI.togglePanel('char');
    });
    await page.waitForSelector('#characterSheet');
    ok(await page.evaluate(()=>{const p=Game.state.player;p.hp-=7;UI.refreshHUD();return document.querySelector('[data-stat-id=life] .v').textContent.startsWith(Math.ceil(p.hp)+' /');}),'Life refresh remains synchronous');
    ok(await page.locator('[data-damage-slot]').count()===3,'basic, LMB and RMB groups');
    for(const id of ['resFire','resCold','resLight','resPoison'])ok(await row(id).count()===1,id+' individual row');
    for(const id of ['fireDmgPct','coldDmgPct','lightDmgPct','poisonDmgPct','shadowDmgPct','earthDmgPct'])ok(await row(id).count()===1,id+' individual bonus row');
    ok(await read('fireDmgPct')==='+50%'&&await read('poisonDmgPct')==='+40%','live elemental equipment totals');
    for(const id of ['critDmg','manaSteal','lifeSteal','lifeRegen','companionUpkeep','netMana','magicReduceFlat','dmgReduceFlat'])ok(await row(id).count()===1,id+' included');
    ok(await read('manaSteal')==='0%','zero stats visible');
    ok(await page.locator('[data-row-key="damage-basic-0-poison"] .v').innerText()==='0','poison shown separately from immediate damage');
    ok(await page.locator('[data-row-key="damage-basic-0-effect-total"]').count()===1,'full effect total');
    ok(await page.locator('[data-row-key="damage-left-1-part"]').innerText().then(t=>t.includes('Full draw')),'charge variants');
    const helpRows=await page.locator('.character-stat').evaluateAll(nodes=>nodes.every(n=>n.dataset.help&&n.getAttribute('tabindex')==='0'&&document.getElementById(n.getAttribute('aria-describedby'))?.textContent));
    ok(helpRows,'all stats have keyboard-accessible help');
    await row('str').hover();await page.waitForFunction(()=>!document.getElementById('tooltip').classList.contains('hidden'));
    ok((await page.locator('#tooltip').innerText()).includes('Each point adds 1 percentage point'),'attribute hover explains gameplay');
    await page.screenshot({path:dest+'/attributes-hover-desktop.png'});
    await page.mouse.move(850,250);ok(await page.locator('#tooltip').evaluate(n=>n.classList.contains('hidden')),'mouseleave hides help');
    const before=await read('str');await row('str').getByRole('button',{name:'Increase Strength'}).click();
    ok(Number(await read('str'))===Number(before)+1,'attribute allocation');
    await row('str').getByRole('button',{name:'Increase Strength'}).click();ok(await row('str').getByRole('button').isDisabled(),'last point disables existing button');
    const strength=await page.evaluate(()=>Game.state.player.attr.str);await row('str').getByRole('button').press('Enter').catch(()=>{});
    ok(await page.evaluate(()=>Game.state.player.attr.str)===strength,'cannot spend unavailable point');
    await row('resFire').focus();await page.waitForFunction(()=>!document.getElementById('tooltip').classList.contains('hidden')&&document.getElementById('tooltip').textContent.includes('caps at 75%'));
    ok((await page.locator('#tooltip').innerText()).includes('Negative resistance'),'keyboard resistance help');
    await page.screenshot({path:dest+'/resistance-focus-desktop.png'});
    await page.evaluate(()=>{window.sheetFocusNode=document.activeElement;window.sheetScroll=document.getElementById('panelLeft').scrollTop;const p=Game.state.player;p.buffs.push({id:'sheet_test',label:'Resistance Test',emoji:'✦',stats:{resAll:100},until:Game.state.time+20});p.computeStats();UI.refreshBuffs();});
    await page.waitForFunction(()=>document.querySelector('[data-stat-id=resFire] .v').textContent==='75%');
    ok(await page.evaluate(()=>document.activeElement===window.sheetFocusNode),'buff update preserves focus node');
    ok(await page.evaluate(()=>Math.abs(document.getElementById('panelLeft').scrollTop-window.sheetScroll)<2),'buff update preserves scroll');
    ok((await page.locator('#tooltip').innerText()).includes('75%'),'open tooltip updates current value');
    await page.evaluate(()=>{const p=Game.state.player;p.buffs=p.buffs.filter(b=>b.id!=='sheet_test');p.computeStats();});
    await page.waitForFunction(()=>document.querySelector('[data-stat-id=resFire] .v').textContent!=='75%');ok(true,'buff expiration updates without rebuild');
    await row('resCold').focus();await row('resFire').focus();await page.waitForFunction(()=>!document.getElementById('tooltip').classList.contains('hidden'));
    await page.keyboard.press('Escape');ok(await page.locator('#tooltip').evaluate(n=>n.classList.contains('hidden')),'Escape dismisses focused tooltip');
    ok(await page.locator('#characterSheet').count()===1,'first Escape leaves character sheet open');
    await row('resCold').focus();await page.waitForFunction(()=>!document.getElementById('tooltip').classList.contains('hidden'));
    await page.evaluate(()=>document.getElementById('panelLeft').scrollTop+=40);await page.waitForTimeout(120);
    ok(await page.locator('#tooltip').evaluate(n=>n.classList.contains('hidden')),'scroll dismisses tooltip');
    await page.evaluate(()=>{const p=Game.state.player;p.skillR='basic';});
    await page.waitForFunction(()=>document.querySelector('[data-damage-slot=right]').dataset.skill==='basic');ok(true,'skill assignment updates while open');
    await page.evaluate(()=>{const p=Game.state.player;p.equip.main.affixes.push({stat:'manaSteal',val:7});p.computeStats();});
    await page.waitForFunction(()=>document.querySelector('[data-stat-id=manaSteal] .v').textContent==='7%');ok(true,'equipment updates live');
    await page.evaluate(()=>{const p=Game.state.player;p.lastTarget={def:{def:100,name:'Training Target'},lvl:20,type:'undead',name:'Training Target',dead:false};});
    await page.waitForFunction(()=>document.getElementById('statHit').textContent.includes('Training Target'));ok(true,'recent target hit chance updates');
    await page.evaluate(()=>Game.state.player.lastTarget.dead=true);await page.waitForFunction(()=>document.getElementById('statHit').textContent.includes('no recent target'));ok(true,'dead target cleared');
    await page.locator('[data-row-key="damage-basic"]').scrollIntoViewIfNeeded();await page.mouse.move(850,250);await page.screenshot({path:dest+'/damage-desktop.png'});
    for(const [width,height] of [[640,900],[390,844],[1920,1080]]){
      await page.setViewportSize({width,height});await row('critDmg').focus();await page.waitForTimeout(150);
      ok(await page.locator('#panelLeft').evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&el.scrollWidth<=el.clientWidth;}),'panel fits '+width);
      ok(await page.locator('#tooltip').evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight;}),'tooltip fits '+width);
      await page.screenshot({path:dest+'/critical-help-'+width+'.png'});
    }
    await row('life').focus();await page.waitForFunction(()=>!document.getElementById('tooltip').classList.contains('hidden'));
    ok(await page.evaluate(()=>{UI.showItemTooltip(Items.makeConsumable('hp1'),650,400);const tip=document.getElementById('tooltip'),before=tip.textContent;Game.state.player.hp-=1;UI.refreshHUD();return tip.textContent===before&&!tip.classList.contains('character-tooltip');}),'item tooltip takes ownership from stat help');
    await page.evaluate(()=>UI.showSkillTooltip('basic',650,400));
    ok((await page.locator('#tooltip').innerText()).includes('A standard attack'),'skill tooltip still works');
    await page.evaluate(()=>UI.closeAll());ok(await page.locator('#tooltip').evaluate(n=>n.classList.contains('hidden')),'closing panel dismisses tooltip');
    await page.evaluate(()=>UI.togglePanel('char'));ok(await page.locator('#characterSheet').count()===1,'reopen works');
    // Runtime coverage in the actual browser, including class-only sections.
    for(const cls of ['vanguard','emberwitch','gravebinder','wildkeeper']){
      await page.evaluate(cls=>{const p=new Player('Preview '+cls,cls);p.lvl=20;for(const s of Object.values(DATA.SKILLS).filter(s=>s.cls===cls))p.skills[s.id]=10;p.computeStats();p.tempo=3;const ids=Object.keys(p.skills).filter(id=>DATA.SKILLS[id].type!=='passive');p.skillL=ids[0];p.skillR=ids.at(-1);Game.state.player=p;UI.renderIfOpen('char');},cls);
      ok(await page.locator('#characterSheet .hero-identity').innerText()==='Preview '+cls,'class switch '+cls);
    }
    report.meanSheetRenderMs=await page.evaluate(()=>{const start=performance.now();for(let i=0;i<25;i++)UI.renderIfOpen('char');return Math.round((performance.now()-start)/25*100)/100;});
    ok(!report.errors.length,'no browser errors: '+report.errors.join('; '));ok(!report.missing.length,'no missing assets');report.status='PASS';
  }finally{fs.writeFileSync(dest+'/browser.json',JSON.stringify(report,null,2)+'\n');await browser.close();}
  console.log(JSON.stringify(report));
})().catch(e=>{console.error(e);process.exitCode=1;});
