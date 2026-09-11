const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
const runtime=path.join(process.env.USERPROFILE||'', '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=require(require.resolve('playwright',{paths:[runtime,__dirname]}));
const dest=process.env.LOOT_QA_DIR||'tests/qa/loot_data';fs.mkdirSync(dest,{recursive:true});
(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true});
  const context=await browser.newContext({viewport:{width:1536,height:1000},acceptDownloads:true}),page=await context.newPage();
  const errors=[];page.on('pageerror',e=>{errors.push(String(e));console.error(e);});let checks=0;
  const ok=(v,m)=>{checks++;assert.ok(v,m);};
  try{
    await page.goto((process.env.GAME_REVIEW_URL||'http://127.0.0.1:8741')+'/loot.html');await page.waitForSelector('#items .item-link',{timeout:10000});
    ok((await page.locator('#summary').innerText()).includes('494'),'full catalogue');
    ok((await page.locator('#detail').innerText()).includes('First Beat'),'default full brown power');
    await page.locator('#level').fill('5');
    ok((await page.locator('#itemHeaders').innerText()).toLowerCase().includes('nightmare'),'difficulty columns visible');
    ok((await page.locator('#itemHeaders').innerText()).includes('Lv 65'),'Torment source level includes +60');
    ok(await page.locator('#locations .location').first().locator('.difficulty-grid>div').count()===3,'same location shows all three difficulties');
    await page.locator('#difficulty').selectOption('1');
    ok((await page.locator('#scenario').innerText()).includes('Sorting and eligibility use Nightmare'),'difficulty controls scenario');
    ok((await page.locator('#detail h3').allTextContents()).some(t=>t.includes('Nightmare')&&t.includes('35')),'difficulty applies effective source level');
    await page.locator('#eligible').check();
    ok(await page.locator('#items [data-difficulty="1"].zero').count()===0,'eligibility uses Nightmare chance');
    await page.locator('#eligible').uncheck();await page.locator('#difficulty').selectOption('0');
    ok((await page.locator('#detail .source-card').nth(2).innerText()).includes('%'),'source probabilities');
    await page.locator('#sort').selectOption('chance');await page.screenshot({path:dest+'/items-desktop.png',fullPage:true});
    await page.locator('#search').fill('The Falling Crown');ok(await page.locator('#items .item-link').count()===1,'search power text');
    ok((await page.locator('#detail').innerText()).includes('The Falling Crown'),'filtered item details follow selection');
    await page.locator('#search').fill('not-a-real-item-8713');ok((await page.locator('#items').innerText()).includes('No matching'),'empty state');
    await page.locator('#search').fill('');await page.locator('#kind').selectOption('all');await page.locator('#eligible').check();
    ok(await page.locator('#items td:nth-child(3).zero').count()===0,'eligible filter excludes zero odds');
    await page.locator('#next').click();ok((await page.locator('#page').innerText()).includes('Page 2'),'pagination');
    await page.locator('#kind').selectOption('uniqueAll');await page.locator('#eligible').uncheck();await page.locator('#level').fill('20');await page.locator('#mf').fill('100');
    await page.locator('#difficulty').selectOption('2');ok((await page.locator('#locations').innerText()).includes('Lv'),'location difficulty');
    const downloadPromise=page.waitForEvent('download');await page.locator('#export').click();const download=await downloadPromise;await download.saveAs(dest+'/items.csv');
    ok(fs.readFileSync(dest+'/items.csv','utf8').includes('Where to find (Torment)'),'CSV includes locations and scenario');
    ok(fs.readFileSync(dest+'/items.csv','utf8').includes('Nightmare chance %'),'CSV includes difficulty comparison');
    ok(fs.readFileSync(dest+'/items.csv','utf8').includes('Vanguard only.'),'CSV includes class-focused power');
    for(const stat of ['Summon Damage','Summon Life'])ok(fs.readFileSync(dest+'/items.csv','utf8').includes(stat),'CSV includes '+stat);
    await page.locator('#affixesTab').click();ok(await page.locator('#affixesView').isVisible(),'affix view');
    for(const elem of ['Fire','Cold','Lightning','Poison','Shadow','Earth']){
      await page.locator('#affixSearch').fill('Kindled '+elem);
      ok(await page.locator('#affixes tr').count()===1,'percentage family '+elem);
      ok((await page.locator('#affixes').innerText()).includes('% '+elem+' Damage'),'percentage description '+elem);
    }
    for(const stat of ['Summon Damage','Summon Life']){
      await page.locator('#affixSearch').fill(stat);
      ok(await page.locator('#affixes tr').count()===6,'six tiers for '+stat);
      ok((await page.locator('#affixes').innerText()).includes('main, head, gloves'),'summon affix equipment slots');
    }
    await page.locator('#affixSearch').fill('Jagged');ok(await page.locator('#affixes tr').count()===1,'affix search');
    await page.locator('#affixSearch').fill('');await page.locator('#affixEligible').check();
    ok(await page.locator('#affixes td:nth-child(6).zero').count()===0,'eligible affix filter');
    await page.screenshot({path:dest+'/affixes-desktop.png',fullPage:true});
    await page.locator('#affixBase').selectOption('charm');ok((await page.locator('#affixRules').innerText()).includes('0.55'),'charm scaling explained');
    await page.locator('#affixBase').selectOption('jewel');ok((await page.locator('#affixRules').innerText()).includes('0.70'),'jewel scaling explained');
    await page.locator('#affixesTab').focus();await page.keyboard.press('ArrowLeft');ok(await page.locator('#itemsView').isVisible(),'keyboard tabs');
    await page.setViewportSize({width:390,height:844});await page.screenshot({path:dest+'/items-mobile.png',fullPage:true});
    ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile document fits viewport');
    await page.locator('#affixesTab').click();ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile affix document fits viewport');
    ok(await page.evaluate(()=>localStorage.length===0),'viewer does not write saves');
    ok(errors.length===0,'no page errors: '+errors.join(';'));
    fs.writeFileSync(dest+'/browser.json',JSON.stringify({status:'PASS',checks,errors},null,2));console.log(JSON.stringify({status:'PASS',checks,errors}));
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
