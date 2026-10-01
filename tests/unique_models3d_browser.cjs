/* Real HTTP/WebGL coverage and a paginated inventory-art comparison review. */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'tests/qa/body_armor3d/unique-regression');fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.mp3':'audio/mpeg','.ogg':'audio/ogg','.otf':'font/otf'};
const server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  fs.readFile(file,(error,bytes)=>{if(error){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.setHeader('Cache-Control','no-store');res.end(bytes);});
});
const reviewOnly=process.argv.includes('--review-only'),contractsOnly=process.argv.includes('--contracts-only'),integrationOnly=process.argv.includes('--integration-only'),productionOnly=process.argv.includes('--production-only'),uniqueRenderOnly=process.argv.includes('--unique-render-only');
async function ready(page){await page.waitForFunction(()=>['ready','failed'].includes(document.body.dataset.testStatus),null,{timeout:120000});assert.equal(await page.locator('body').getAttribute('data-test-status'),'ready',await page.locator('#result,#status').innerText());}
async function completed(page){await page.waitForFunction(()=>['passed','failed'].includes(document.body.dataset.testStatus),null,{timeout:1200000});const text=await page.locator('#result').innerText();assert.match(text,/^PASS/);return text;}
async function armory(browser,base,name,viewport){
  const page=await browser.newPage({viewport,isMobile:name==='mobile',hasTouch:name==='mobile'});await page.goto(base+'/tests/three_character.html?unique=u_gravebite');await ready(page);
  const count=await page.locator('#uniqueModel option[value^="u_"]').count();assert.equal(count,118);
  await page.selectOption('#uniqueModel','u_gen_16_12');await page.getByRole('button',{name:'Ember Witch',exact:true}).click();
  assert.equal(await page.locator('#referenceName').innerText(),await page.evaluate(()=>CharacterPreviewData.UNIQUES.find(r=>r.id==='u_gen_16_12').name));
  const identity=await page.evaluate(()=>({id:armoryQA.visual.equipment.main.modelId,classId:armoryQA.visual.classId,overflow:document.documentElement.scrollWidth>innerWidth+1}));
  assert.equal(identity.id,'u_gen_16_12');assert.equal(identity.classId,'emberwitch');assert.equal(identity.overflow,false);
  await page.evaluate(()=>armoryQA.pose('attack',.55,90));await page.waitForTimeout(150);await page.screenshot({path:path.join(out,name+'-armory.png'),fullPage:true});
  for(const id of ['vanguard','emberwitch','gravebinder','wildkeeper','veilranger']){
    await page.evaluate(id=>{armoryQA.setClass(id);for(const key of ['u_gen_12_12','u_gen_17_7','u_gen_7_9','u_gen_6_12','u_gen_18_12','u_gen_8_12'])armoryQA.selectModel(key);armoryQA.pose('idle',0,90);},id);
    await page.waitForTimeout(150);await page.screenshot({path:path.join(out,name+'-outfit-'+id+'.png'),fullPage:true});
  }
  await page.close();return {models:count,...identity};
}
async function production(browser,base,name,viewport){
  const page=await browser.newPage({viewport,isMobile:name==='mobile',hasTouch:name==='mobile'});await page.goto(base+'/tests/unique_review.html');
  await page.waitForFunction(()=>window.uniqueQA||document.getElementById('status').textContent.startsWith('FAIL'),null,{timeout:120000});
  assert.equal(await page.evaluate(()=>!!window.uniqueQA),true,await page.locator('#status').innerText());
  const models={};
  for(const classId of ['vanguard','emberwitch','gravebinder','wildkeeper','veilranger']){
    models[classId]=await page.evaluate(async({classId,viewport})=>{
      const q=uniqueQA,win=q.frame.contentWindow,{Game:G,UI,Items:I,DATA:D}=q.api;
      q.frame.style.width=viewport.width+'px';q.frame.style.height=viewport.height+'px';q.frame.getBoundingClientRect();
      await new Promise(resolve=>setTimeout(resolve,50));win.eval('MobileShell.refresh()');win.dispatchEvent(new win.Event('resize'));
      const canvas=win.document.querySelector('canvas');if(canvas.width!==viewport.width||canvas.height!==viewport.height)throw Error('Gameplay review retained an outdated viewport');
      await G.newGame('Unique model review '+classId,classId,false);await (await import('/tests/completed_hero_fixture.mjs')).loadCompletedHero(G);UI.closeAll();
      const p=G.state.player;p.lvl=100;p.inv.items=[];
      const main={vanguard:'u_gravebite',emberwitch:'u_gen_5_11',gravebinder:'u_gen_5_5',wildkeeper:'u_gen_4_12',veilranger:'u_gen_3_11'}[classId],ids={main,head:'u_gen_7_9',chest:'u_gen_6_12',gloves:'u_gen_18_12',boots:'u_gen_8_12'};
      if(!D.BASES[D.UNIQUES.find(u=>u.id===main).base].twoHand)ids.off='u_gen_17_7';
      const equip=Object.fromEntries(Object.entries(ids).map(([slot,id])=>[slot,I.makeUnique(D.UNIQUES.find(u=>u.id===id))]));
      const prepared=await G.preparePlayerEquipment(equip);p.equip=equip;if(!G.commitPlayerEquipment(prepared))throw Error('Outfit transaction failed');p.computeStats();p.hp=p.stats.maxHp;p.mana=p.stats.maxMana;p.visAng=Math.PI/4;
      G.__uniqueReview.updateCamera(10);G.__uniqueReview.render();UI.refreshHUD();
      if(win.document.getElementById('appFatal'))throw Error(win.document.getElementById('appFatal').textContent);
      if(win.document.getElementById('phoneRotate')?.open)throw Error('Gameplay review obscured by the phone rotation gate');
      const actual=Object.fromEntries(Object.entries(ids).map(([slot])=>[slot,p._playerVisual.equipment[slot].modelId]));
      if(JSON.stringify(actual)!==JSON.stringify(ids))throw Error('Game outfit lost canonical models');return actual;
    },{classId,viewport});
    await page.locator('iframe').screenshot({path:path.join(out,name+'-game-'+classId+'.png')});
  }
  await page.evaluate(()=>{
    const q=uniqueQA,{Game:G,Items:I,UI}=q.api,p=G.state.player;
    for(const id of ['u_gravebite','u_cinder','u_gen_5_11'])I.autoPlace(p.inv,q.make(id));
    UI.togglePanel('inv');G.__uniqueReview.render();
  });
  await page.locator('iframe').screenshot({path:path.join(out,name+'-game-inventory.png')});
  await page.close();return models;
}
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;let browser;
  const report={errors:[],missing:[],gallery:[],armory:{},production:{}};
  try{
    browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}});
    page.on('pageerror',error=>report.errors.push(error.message));page.on('response',res=>{if(res.status()===404&&!res.url().endsWith('favicon.ico'))report.missing.push(res.url());});
    if(!integrationOnly&&!productionOnly){await page.goto(base+'/tests/unique_models3d_review.html');await ready(page);}
    if(!contractsOnly&&!integrationOnly&&!productionOnly&&!uniqueRenderOnly){
      const ids=[];for(let i=0;i<20;i++){
        await page.evaluate(i=>uniqueModelsQA.showPage(i),i);const visible=await page.locator('.item').evaluateAll(rows=>rows.map(row=>row.dataset.modelId));ids.push(...visible);report.gallery.push({page:i+1,ids:visible});
        await page.screenshot({path:path.join(out,'comparison-'+String(i+1).padStart(2,'0')+'.png'),fullPage:true});
      }
      assert.equal(new Set(ids).size,118);assert.equal(ids.length,118);console.log('PASS: captured all 118 front / side / back comparisons beside their inventory art.');
      for(const [name,viewport] of [['desktop',{width:1440,height:1000}],['mobile',{width:390,height:844}]])report.armory[name]=await armory(browser,base,name,viewport);
      console.log('PASS: desktop/mobile armory controls and five complete unique outfits.');
    }
    if(!contractsOnly&&!integrationOnly&&!uniqueRenderOnly){
      for(const [name,viewport] of [['desktop',{width:1440,height:1000}],['mobile',{width:844,height:390}]])report.production[name]=await production(browser,base,name,viewport);
      console.log('PASS: five complete unique outfits in actual desktop/mobile gameplay and inventory views.');
    }
    if(!reviewOnly&&!productionOnly){
      if(!integrationOnly){
        report.render=await page.evaluate(()=>uniqueModelsQA.runContract());console.log('PASS: '+report.render.frames+' unique-model WebGL frames; GPU cleanup.');
        if(uniqueRenderOnly){assert.deepEqual(report.errors,[],'Browser runtime errors');assert.deepEqual(report.missing,[],'Missing assets');return;}
        await page.goto(base+'/tests/character_armory_render_contract.html');report.ordinaryRender=await completed(page);console.log(report.ordinaryRender);
        await page.screenshot({path:path.join(out,'ordinary-render-contract.png'),fullPage:true});
      }
      await page.goto(base+'/tests/character_game_integration.html');report.integration=await completed(page);console.log(report.integration);
      await page.screenshot({path:path.join(out,'game-integration.png'),fullPage:true});
    }
    assert.deepEqual(report.errors,[],'Browser runtime errors');assert.deepEqual(report.missing,[],'Missing assets');
  }finally{
    fs.writeFileSync(path.join(out,uniqueRenderOnly?'unique-render.json':productionOnly?'production.json':integrationOnly?'integration.json':reviewOnly?'review.json':contractsOnly?'browser-contracts.json':'browser.json'),JSON.stringify(report,null,2)+'\n');if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
