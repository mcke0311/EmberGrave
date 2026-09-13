const {assert,fs,out,settle,setup}=require('./mobile_fix_helpers.cjs');
(async()=>{
 const {browser,page,errors}=await setup({engine:'webkit'});let checks=0;const ok=(v,m)=>{checks++;assert.ok(v,m)};
 try{
  // The Windows Playwright WebKit port has no Web Audio implementation.
  // Keep this presentation regression independent of that platform limitation.
  const audioStub=await page.evaluate(()=>{if(window.AudioContext||window.webkitAudioContext)return false;for(const key of Object.keys(Sfx))if(typeof Sfx[key]==='function')Sfx[key]=()=>{};return true;});
  await page.getByRole('button',{name:'NEW HERO',exact:true}).tap();
  for(const [width,height] of [[568,240],[568,320],[667,375],[740,360],[844,390]]){
   await page.setViewportSize({width,height});await settle(page);
   for(const id of ['vanguard','emberwitch','gravebinder','wildkeeper','veilranger']){
    await page.locator('#choose-'+id).tap();
    for(const gear of ['Class regalia','Starting gear']){
     await page.getByRole('button',{name:gear,exact:true}).tap();await page.getByRole('button',{name:'Rotate hero right',exact:true}).tap();await settle(page);
     ok(await page.evaluate(()=>{const c=document.querySelector('#campCanvas'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let count=0;for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){const a=d[(y*c.width+x)*4+3];if(a>20){count++;if(x===0||y===0||x===c.width-1||y===c.height-1)return false;}}return count>100&&c.getBoundingClientRect().bottom<=document.querySelector('.hero-controls').getBoundingClientRect().top;}),`${width}/${id}/${gear}: preview fits`);
    }
   }
  }
  await page.screenshot({path:out+'/webkit-hero.png'});
  await page.evaluate(async()=>{await Game.newGame('WebKit fixture','vanguard',false);await (await import('/tests/completed_hero_fixture.mjs')).loadCompletedHero(Game);for(const n of Object.values(DATA.NPCS).filter(n=>n.role==='vendor'))Game.state.vendorStock[n.id]=Items.vendorStock(n.stock,30);});
  const vendors=await page.evaluate(()=>Object.values(DATA.NPCS).filter(n=>n.role==='vendor').map(n=>n.id));
  for(const id of vendors){
   await page.evaluate(id=>UI.openVendor(id),id);await settle(page);
   for(const category of ['All','Weapons','Armor','Jewelry','Supplies']){
    await page.locator('[data-kind=vendor] .manage-tabs').getByRole('button',{name:category,exact:true}).tap();await settle(page);
    const count=await page.locator('.shop-entry').count();
    ok(await page.evaluate(()=>document.querySelector('.shop-list').getBoundingClientRect().width>0),'category shows stock');
    if(count){await page.locator('.shop-entry').last().tap();await settle(page);ok(await page.locator('[data-kind=vendor] .manage-tabs').isHidden(),'detail hides category tabs');await page.locator('#workspaceBack').tap();await settle(page);ok(await page.locator('.shop-entry').count()===count,'Back restores full list');}
   }
  }
  for(const [width,height] of [[568,240],[568,320],[667,375],[740,360],[844,390]]){await page.setViewportSize({width,height});await page.evaluate(()=>UI.openVendor('hewn'));await settle(page);ok(await page.evaluate(()=>document.querySelector('[data-kind=vendor]').getBoundingClientRect().top>=document.querySelector('#workspaceHeader').getBoundingClientRect().bottom-.5),'header clears contents '+width);}
  await page.screenshot({path:out+'/webkit-shop.png'});assert.deepEqual(errors,[]);
  fs.writeFileSync(out+'/webkit-results.json',JSON.stringify({checks,audioStub,engine:'Playwright WebKit; not a physical Safari device',errors},null,2));console.log(`PASS ${checks} WebKit mobile regression checks`);
 }catch(e){await page.screenshot({path:out+'/webkit-failure.png'});throw e}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
