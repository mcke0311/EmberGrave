const {assert,fs,base,out,settle,setup,revealBySwipe}=require('./mobile_fix_helpers.cjs');
(async()=>{
 const {browser,context,page,errors}=await setup();let checks=0;
 const ok=(v,m)=>{checks++;assert.ok(v,m)};
 try{
  await page.getByRole('button',{name:'SINGLE PLAYER',exact:true}).tap();
  const sizes=[[568,240],[568,320],[667,375],[740,360],[844,390]],classes=['vanguard','emberwitch','gravebinder','wildkeeper','veilranger'];
  for(const [width,height] of sizes){
   await page.setViewportSize({width,height});await settle(page);
   for(const id of classes){
    await page.locator('#choose-'+id).tap();
    for(const label of ['Class regalia','Starting gear']){
     await page.getByRole('button',{name:label,exact:true}).tap();
     for(let angle=0;angle<4;angle++){
      await page.getByRole('button',{name:'Rotate hero right',exact:true}).tap();await settle(page);
      const result=await page.evaluate(()=>{
       const c=document.querySelector('#campCanvas'),r=c.getBoundingClientRect(),controls=document.querySelector('.hero-controls').getBoundingClientRect();
       const data=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let minX=c.width,minY=c.height,maxX=0,maxY=0,count=0;
       for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(data[(y*c.width+x)*4+3]>20){count++;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}
       return {drawn:c.dataset.renderedClass,count,minX,minY,maxX,maxY,w:c.width,h:c.height,bottom:r.bottom,controlTop:controls.top,controlsBottom:controls.bottom};
      });
      ok(result.drawn===id&&result.count>100,`${width}/${id}/${label}: visible model`);
      ok(result.minX>0&&result.minY>0&&result.maxX<result.w-1&&result.maxY<result.h-1,`${width}/${id}: model pixels clipped`);
      ok(result.bottom<=result.controlTop&&result.controlsBottom<=height,`${width}/${id}: preview and controls overlap`);
     }
    }
   }
   await page.locator('#choose-vanguard').tap();await settle(page);await page.screenshot({path:`${out}/hero-${width}x${height}.png`});
  }
  await page.getByRole('button',{name:'Next',exact:true}).tap();await page.locator('#nameInput').fill('Mobile fixes');
  await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>MobileShell.blocked);
  await page.setViewportSize({width:844,height:390});await page.waitForFunction(()=>!MobileShell.blocked);
  ok(await page.locator('#nameInput').inputValue()==='Mobile fixes','rotation preserves identity');
  await page.evaluate(async()=>{await Game.newGame('Mobile fixes','vanguard',false);await (await import('/tests/completed_hero_fixture.mjs')).loadCompletedHero(Game);UI.closeAll();});
  await page.evaluate(()=>{UI.showTitle();const save=Game.listSaves()[0];TitleScreen.savedHeroes({saves:['vanguard','emberwitch','gravebinder','wildkeeper','veilranger'].map((id,i)=>({...save,slot:'preview-'+i,name:'Saved '+id,classId:id}))});});
  for(const [width,height] of sizes){await page.setViewportSize({width,height});await settle(page);const result=await page.evaluate(()=>{const c=document.querySelector('#campCanvas').getBoundingClientRect(),scene=document.querySelector('.selection-scene').getBoundingClientRect();return {h:c.height,bottom:scene.bottom,footer:document.querySelector('.saved-footer').getBoundingClientRect().top}});ok(result.h>30&&result.bottom<=result.footer,'saved preview fits '+width);}
  for(const id of classes){
   await page.locator('.saved-hero').filter({hasText:'Saved '+id}).tap();
   for(const gear of ['Class regalia','Equipped gear']){
    await page.getByRole('button',{name:gear,exact:true}).tap();await page.getByRole('button',{name:'Rotate hero left',exact:true}).tap();await settle(page);
    ok(await page.locator('#campCanvas').getAttribute('data-rendered-class')===id,'saved hero selection/gear/rotation '+id);
   }
  }
  await page.evaluate(()=>{UI.hideTitle();UI.closeAll();});await page.setViewportSize({width:844,height:390});
  const client=await context.newCDPSession(page);
  const vendors=await page.evaluate(()=>Object.values(DATA.NPCS).filter(n=>n.role==='vendor').map(n=>n.id));
  await page.evaluate(()=>{for(const n of Object.values(DATA.NPCS).filter(n=>n.role==='vendor'))Game.state.vendorStock[n.id]=Items.vendorStock(n.stock,30);});
  for(const id of vendors){
   await page.evaluate(id=>UI.openVendor(id),id);await settle(page);
   ok(await page.locator('[data-kind=vendor]').getAttribute('data-mobile-detail')==='false',id+' opens list');
   for(const label of ['All','Weapons','Armor','Jewelry','Supplies']){
    const tab=page.locator('[data-kind=vendor] .manage-tabs').getByRole('button',{name:label,exact:true});
    await revealBySwipe(page,client,tab);await tab.tap();await settle(page);
    const expected=await page.evaluate(({id,label})=>Game.state.vendorStock[id].filter(it=>label==='All'||(it.kind!=='gear'?'Supplies':it.slot==='main'?'Weapons':['ring','amulet'].includes(it.slot)?'Jewelry':'Armor')===label).length,{id,label});
    const rows=page.locator('[data-kind=vendor] .shop-entry');ok(await rows.count()===expected,`${id}/${label}: complete stock`);
    if(!expected){ok(await page.locator('.manage-empty').isVisible(),id+' empty category');continue;}
    await revealBySwipe(page,client,rows.last());const name=await rows.last().locator('strong').innerText();
    const position=await page.locator('[data-kind=vendor]').evaluate(n=>n.scrollTop);
    await rows.last().tap();await settle(page);
    ok(await page.locator('.shop-list').isHidden()&&await page.locator('[data-kind=vendor] .manage-tabs').isHidden(),id+' details hide browsing controls');
    ok((await page.locator('.shop-detail').innerText()).includes(name),id+' last item inspectable');
    await page.locator('#workspaceBack').tap();await settle(page);
    ok(await rows.last().isVisible(),id+' Back restores stock');
    ok(await page.locator('[data-kind=vendor]').evaluate((n,y)=>Math.abs(n.scrollTop-y)<3,position),id+' Back restores scroll');
   }
  }
  for(const [width,height] of sizes){
   await page.setViewportSize({width,height});await page.evaluate(()=>UI.openVendor('hewn'));await settle(page);
   ok(await page.evaluate(()=>{const p=document.querySelector('[data-kind=vendor]').getBoundingClientRect(),h=document.querySelector('#workspaceHeader').getBoundingClientRect();return p.top>=h.bottom-.5&&p.bottom<=innerHeight+.5}),'shop clears header '+width);
   const last=page.locator('.shop-entry').last();await revealBySwipe(page,client,last);await last.tap();await settle(page);
   ok(await page.locator('[data-kind=vendor] .manage-tabs').isHidden(),'short-screen detail tabs hidden '+width);
   await page.evaluate(()=>UI.openVendor('wenna'));await settle(page);
   ok(await page.locator('[data-kind=vendor]').getAttribute('data-mobile-detail')==='false','switching merchants resets detail '+width);
   ok(await page.locator('[data-kind=vendor]').evaluate(n=>n.scrollTop)===0,'new merchant starts at top '+width);
   await page.screenshot({path:`${out}/shop-${width}x${height}.png`});
  }
  await page.setViewportSize({width:844,height:390});
  const purchase=await page.evaluate(()=>{const p=Game.state.player;p.gold=1e6;p.inv.items=[];UI.openVendor('hewn');const it=Game.state.vendorStock.hewn[0];return {gold:p.gold,price:Items.value(it),stock:Game.state.vendorStock.hewn.length}});
  await page.locator('.shop-entry').first().tap();await settle(page);await revealBySwipe(page,client,page.locator('.shop-buy'));await page.locator('.shop-buy').tap();await settle(page);
  ok(await page.evaluate(b=>Game.state.player.gold===b.gold-b.price&&Game.state.vendorStock.hewn.length===b.stock-1&&Game.state.player.inv.items.length===1,purchase),'purchase updates gold, pack, stock');
  const sale=await page.evaluate(()=>({gold:Game.state.player.gold,price:Items.sellValue(Game.state.player.inv.items[0])}));
  await page.locator('#workspaceTabs [data-side=right]').tap();await settle(page);const item=page.locator('#panelRight .invgrid .invitem').first();await revealBySwipe(page,client,item);await item.tap();await settle(page);
  const sell=page.locator('#touchItemMenu').getByRole('button',{name:'Sell',exact:true});await revealBySwipe(page,client,sell);await sell.tap();
  ok(await page.evaluate(b=>Game.state.player.gold===b.gold+b.price&&!Game.state.player.inv.items.length,sale),'sale updates gold and pack');
  await page.evaluate(()=>{Game.state.player.gold=0;UI.openVendor('hewn')});await settle(page);await page.locator('.shop-entry').first().tap();await settle(page);
  ok(await page.locator('.shop-buy').isDisabled()&&await page.locator('.shop-buy').innerText()==='Not enough gold','insufficient gold cannot buy');
  await page.evaluate(()=>{const p=Game.state.player;p.gold=1e6;p.inv.items=[];for(let y=0;y<p.inv.h;y++)for(let x=0;x<p.inv.w;x++)Items.place(p.inv,Items.makeConsumable('idscroll',1),x,y);UI.openVendor('hewn')});await settle(page);await page.locator('.shop-entry').first().tap();await settle(page);
  ok(await page.locator('.shop-buy').isDisabled()&&await page.locator('.shop-buy').innerText()==='Pack is full','full pack cannot buy');
  ok(errors.length===0,'no browser errors: '+errors.join('; '));
  fs.writeFileSync(out+'/ui-results.json',JSON.stringify({checks,vendors,sizes,errors},null,2));console.log(`PASS ${checks} mobile fix checks, ${vendors.length} merchants; ${out}`);
 }catch(e){await page.screenshot({path:out+'/ui-failure.png'});throw e}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
