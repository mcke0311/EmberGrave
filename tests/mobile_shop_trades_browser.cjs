const {assert,fs,out,setup,settle,revealBySwipe}=require('./mobile_fix_helpers.cjs');
(async()=>{
 const {browser,context,page,errors}=await setup();let checks=0;const trades=[];
 try{
  await page.evaluate(async()=>{await Game.newGame('Shop trade fixture','vanguard',false);await (await import('/tests/completed_hero_fixture.mjs')).loadCompletedHero(Game);for(const n of Object.values(DATA.NPCS).filter(n=>n.role==='vendor'))Game.state.vendorStock[n.id]=Items.vendorStock(n.stock,30);});
  const client=await context.newCDPSession(page),vendors=await page.evaluate(()=>Object.values(DATA.NPCS).filter(n=>n.role==='vendor').map(n=>n.id));
  for(const id of vendors)for(const category of ['All','Weapons','Armor','Jewelry','Supplies']){
   await page.evaluate(id=>{Game.state.player.gold=1e6;Game.state.player.inv.items=[];UI.openVendor(id)},id);await settle(page);
   await page.locator('[data-kind=vendor] .manage-tabs').getByRole('button',{name:category,exact:true}).tap();await settle(page);
   const items=page.locator('.shop-entry');if(!await items.count())continue;
   const last=items.last();await revealBySwipe(page,client,last);await last.tap();await settle(page);
   const before=await page.evaluate(({id,category})=>{const stock=Game.state.vendorStock[id],it=stock.filter(it=>category==='All'||(it.kind!=='gear'?'Supplies':it.slot==='main'?'Weapons':['ring','amulet'].includes(it.slot)?'Jewelry':'Armor')===category).at(-1);return {gold:Game.state.player.gold,baseId:it.baseId,kind:it.kind,price:Items.value(it),stock:stock.length};},{id,category});
   await revealBySwipe(page,client,page.locator('.shop-buy'));await page.locator('.shop-buy').tap();await settle(page);
   assert.ok(await page.evaluate(({id,b})=>{const s=Game.state,p=s.player;return p.gold===b.gold-b.price&&p.inv.items.length===1&&p.inv.items[0].baseId===b.baseId&&s.vendorStock[id].length===b.stock-(b.kind==='consumable'?0:1)},{id,b:before}),id+'/'+category+' purchase');checks++;
   assert.equal(await page.locator('[data-kind=vendor]').getAttribute('data-mobile-detail'),'false','purchase returns to browsing');checks++;
   const sale=await page.evaluate(()=>({gold:Game.state.player.gold,price:Items.sellValue(Game.state.player.inv.items[0])}));
   await page.locator('#workspaceTabs [data-side=right]').tap();await settle(page);const item=page.locator('#panelRight .invgrid .invitem').first();await revealBySwipe(page,client,item);await item.tap();await settle(page);
   const sell=page.locator('#touchItemMenu').getByRole('button',{name:'Sell',exact:true});await revealBySwipe(page,client,sell);await sell.tap();
   assert.ok(await page.evaluate(b=>Game.state.player.gold===b.gold+b.price&&!Game.state.player.inv.items.length,sale),id+'/'+category+' sale');checks++;trades.push({id,category,kind:before.kind});
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(out+'/shop-trade-results.json',JSON.stringify({checks,trades,errors},null,2));console.log(`PASS ${checks} purchase/sale checks across ${trades.length} merchant categories`);
 }catch(e){await page.screenshot({path:out+'/shop-trades-failure.png'});throw e}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
