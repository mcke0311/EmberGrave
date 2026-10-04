// Phone inventory flow through trusted taps; isolated saves on both engines.
const {assert,fs,settle,setup}=require('./mobile_fix_helpers.cjs');
const {reveal}=require('./phone_page_helpers.cjs');
const engine=process.argv.includes('--webkit')?'webkit':'chromium',out='tmp/mobile-inventory/'+engine;
fs.mkdirSync(out,{recursive:true});
(async()=>{
 const {browser,page,errors}=await setup({engine});let checks=0;
 const ok=(v,m)=>{assert.ok(v,m);checks++;};
 const tap=async selector=>{const target=page.locator(selector);await reveal(target);await target.tap();await settle(page);};
 const fixture=async()=>{await page.evaluate(()=>{
   UI.closeAll();const p=Game.state.player;p.lvl=70;p.inv=Items.makeGrid(10,4);p.equip={};p.belt=[null,null,null,null];p.management={carried:null,offer:[null,null,null,null]};
   const ring=Object.keys(DATA.BASES).find(id=>DATA.BASES[id].slot==='ring');
   const a=Items.fromBase(ring),b=Items.fromBase(ring),incoming=Items.fromBase(ring);a.name='Ash band';b.name='Dusk band';incoming.name='Ember seal';incoming.affixes=[{stat:'vit',val:7},{stat:'resFire',val:12}];
   p.equip.ring1=a;p.equip.ring2=b;p.equip.main=Items.fromBase('shortsword');p.equip.off=Items.fromBase(Object.keys(DATA.BASES).find(id=>DATA.BASES[id].slot==='off'));
   Items.autoPlace(p.inv,incoming);for(let i=0;i<24;i++){const it=Items.fromBase(ring);it.name='Travel band '+i;Items.autoPlace(p.inv,it);}
   p.computeStats();p.hp=p.stats.maxHp;p.mana=p.stats.maxMana;window.__incoming=incoming.uid;window.__rings=[a.uid,b.uid];UI.managementStatus('');UI.refreshHUD();MobileWorkspace.open('inv');
 });await settle(page);await page.locator('#panelRight [data-mobile-tab=pack]').tap();await page.locator('#inventorySearch').fill('');await page.locator('#inventorySearch').blur();await page.evaluate(()=>{for(const el of document.querySelectorAll('[data-phone-scroll]'))el.scrollTop=0;});};
 try{
   await page.evaluate(()=>{if(!window.AudioContext&&!window.webkitAudioContext)for(const key of Object.keys(Sfx))if(typeof Sfx[key]==='function')Sfx[key]=()=>{};});
   await page.evaluate(async()=>{await Game.newGame('Inventory review','vanguard',false);await (await import('/tests/completed_hero_fixture.mjs')).loadCompletedHero(Game);Game.debugFlags.god=true;Game.state.monsters=[];UI.hideTitle();UI.closeAll();});
   for(const [width,height] of [[568,240],[568,320],[667,375],[740,360],[844,390]]){
     await page.setViewportSize({width,height});await fixture();await settle(page);
     const geometry=await page.evaluate(()=>{
       const rect=selector=>document.querySelector(selector).getBoundingClientRect(),header=rect('#workspaceHeader'),gear=rect('.phone-gear-scroll'),bag=rect('.phone-bag-scroll'),first=rect('.phone-bag-scroll .invitem');
       return {compact:header.height<=49,panes:gear.right<bag.left&&gear.height>60&&bag.height>=64,first:first.top>=bag.top&&first.bottom<=bag.bottom+1,arrival:getComputedStyle(document.querySelector('#centerMsg')).visibility==='hidden',font:getComputedStyle(document.querySelector('#inventorySearch')).fontFamily};
     });
     ok(geometry.compact,width+' compact single-row header');ok(geometry.panes,width+' independent gear and bag panes');ok(geometry.first,width+' first item is fully visible');ok(geometry.arrival,'arrival message stays behind menu');ok(/Exocet|game/i.test(geometry.font),'gothic font is preserved');
     ok((await page.locator('#equipwrap').innerText()).includes('Main hand')&&(await page.locator('#equipwrap').innerText()).includes('Shortsword'),'slot and equipped name are visible');
     await page.screenshot({path:out+'/bag-'+width+'x'+height+'.png'});
     await page.locator('#inventorySearch').fill('Ember');await page.locator('#inventorySearch').blur();await settle(page);
     const snapshot=await page.evaluate(()=>JSON.stringify([Game.state.player.equip,Game.state.player.inv,Game.state.player.buffs,Game.state.player.hp,Game.state.player.mana]));
     await tap('.phone-bag-scroll [data-item-id="'+await page.evaluate(()=>__incoming)+'"]');
     ok(await page.locator('[data-item-primary]').isDisabled(),'both occupied rings require an explicit replacement');
     await page.locator('[data-replace-slot=ring2]').tap();await settle(page);
     ok(await page.locator('[data-item-primary]').innerText()==='Replace Ring II','primary action names selected slot');
     ok((await page.locator('.comparison-profile').first().innerText()).includes('Dusk band'),'current selected ring is shown');
     ok(await page.locator('.comparison-stats tbody tr').count()===8,'damage, defense, resources and resistances compare in aligned rows');
     ok(await page.evaluate(()=>{const [a,b]=[...document.querySelectorAll('.comparison-profile')].map(n=>n.getBoundingClientRect());const button=document.querySelector('[data-item-primary]').getBoundingClientRect(),body=document.querySelector('.phone-item-scroll').getBoundingClientRect();return Math.abs(a.top-b.top)<1&&a.right<b.left&&a.bottom<=body.bottom+1&&button.top>=0&&button.bottom<=innerHeight&&button.height>=44;}),'comparison stays side by side with both identities and a reachable action');
     ok(await page.evaluate(()=>document.activeElement.dataset.replaceSlot==='ring2'),'ring selection keeps keyboard focus');
     ok(await page.evaluate(()=>JSON.stringify([Game.state.player.equip,Game.state.player.inv,Game.state.player.buffs,Game.state.player.hp,Game.state.player.mana]))===snapshot,'opening and choosing a preview does not change hero');
     await page.screenshot({path:out+'/comparison-'+width+'x'+height+'.png'});
     await page.locator('.comparison-properties summary').scrollIntoViewIfNeeded();await page.locator('.comparison-properties summary').tap();ok(await page.locator('.comparison-full .touch-item-details').count()===2,'full properties remain available for both items');
     const primary=await page.locator('[data-item-primary]').boundingBox();ok(primary.y+primary.height<=height,'primary remains pinned while full properties scroll');
     await page.locator('#workspaceBack').tap();await settle(page);ok(await page.locator('#inventorySearch').inputValue()==='Ember','Back preserves bag search');
     ok(await page.evaluate(()=>document.activeElement.dataset.itemId===String(__incoming)),'Back restores selected item focus');
     await tap('.phone-bag-scroll [data-item-id="'+await page.evaluate(()=>__incoming)+'"]');await page.locator('[data-replace-slot=ring2]').tap();await page.locator('[data-item-primary]').tap();
     await page.waitForFunction(()=>!document.querySelector('#touchItemMenu'));
     ok(await page.evaluate(()=>{const p=Game.state.player;return p.equip.ring1.uid===__rings[0]&&p.equip.ring2.uid===__incoming&&p.inv.items.some(it=>it.uid===__rings[1]);}),'equip replaces only Ring II and returns its old item to bag');
     ok((await page.locator('.inventory-status').innerText()).includes('applied'),'success feedback is inside inventory');
     await tap('#panelRight [data-mobile-tab=belt]');ok(await page.locator('.phone-gear-scroll').isVisible()&&await page.locator('.phone-belt-card').count()===4,'belt management retains equipment');
   }
   await fixture();await page.locator('.phone-bag-scroll').evaluate(el=>el.scrollTop=200);const bagPosition=await page.locator('.phone-bag-scroll').evaluate(el=>el.scrollTop);
   await tap('#panelRight [data-mobile-tab=belt]');ok(await page.locator('.pack-toolbar').isHidden(),'belt omits bag-only search and tidy controls');
   await tap('#panelRight [data-mobile-tab=pack]');ok(await page.locator('.phone-bag-scroll').evaluate((el,y)=>Math.abs(el.scrollTop-y)<2,bagPosition),'Bag/Belt round trip preserves bag scroll');
   // A full bag rejects a two-hand swap and names both displaced items.
   await fixture();await page.evaluate(()=>{const p=Game.state.player,it=Items.fromBase(Object.keys(DATA.BASES).find(id=>DATA.BASES[id].twoHand));p.inv=Items.makeGrid(it.w,it.h);Items.place(p.inv,it,0,0);window.__incoming=it.uid;UI.renderIfOpen('inv');});await settle(page);
   await tap('.phone-bag-scroll [data-item-id="'+await page.evaluate(()=>__incoming)+'"]');
   ok(await page.locator('[data-item-primary]').isDisabled(),'full bag swap is blocked before equip');ok(/Main hand.*Off hand/.test(await page.locator('.comparison-displaced').innerText()),'two-hand preview lists every displaced item');ok(/Make room/.test(await page.locator('.comparison-warning').innerText()),'blocked swap explains how to proceed');
   await page.locator('#workspaceBack').tap();
   // Co-op presentation uses the real pending handler with an isolated command boundary.
   await fixture();await page.evaluate(()=>{
     window.__activeDescriptor=Object.getOwnPropertyDescriptor(Coop,'active');Object.defineProperty(Coop,'active',{configurable:true,get:()=>true});window.__submit=Coop.submit;window.__calls=[];
     for(const [slot,it] of Object.entries(Game.state.player.equip))it._coopId='equipped_'+slot;for(const it of Game.state.player.inv.items)it._coopId='item_'+it.uid;
     Coop.submit=c=>new Promise((resolve,reject)=>{__calls.push(c);window.__reject=reject;});UI.refreshManagement(true);
   });await settle(page);
   await tap('.phone-bag-scroll [data-item-id="item_'+await page.evaluate(()=>__incoming)+'"]');await page.locator('[data-replace-slot=ring1]').tap();
   await page.locator('.comparison-properties summary').scrollIntoViewIfNeeded();await page.locator('.comparison-properties summary').tap();
   await page.evaluate(()=>{Game.state.player.equip.ring1.name='Changed ring';UI.refreshManagement(true);});await settle(page);
   ok((await page.locator('.comparison-profile').first().innerText()).includes('Changed ring'),'co-op updates refresh the displayed comparison');
   ok(await page.locator('.comparison-properties').evaluate(el=>el.open),'live comparison refresh retains expanded properties');
   const lifeBefore=await page.locator('.comparison-stats tbody tr').nth(2).innerText();
   await page.evaluate(()=>{Game.state.player.buffs.push({id:'comparison-fixture',stats:{vit:10},until:1e6});UI.refreshManagement();});
   ok(await page.locator('.comparison-stats tbody tr').nth(2).innerText()!==lifeBefore,'buff-only snapshot updates refresh comparison without inventory changes');
   await page.locator('[data-item-primary]').tap();ok(await page.locator('[data-item-primary]').isDisabled(),'pending swap disables repeated taps');
   ok(await page.evaluate(()=>__calls.length===1&&__calls[0].slot==='ring1'&&__calls[0].expectedEquipment.ring1==='equipped_ring1'),'co-op submits explicit reviewed slot and loadout');
   await page.evaluate(()=>__reject(Error('Equipment changed. Review the comparison again.')));await page.waitForFunction(()=>!document.querySelector('#touchItemMenu').classList.contains('item-pending'));
   ok(/Equipment changed/.test(await page.locator('.item-status').innerText()),'co-op rejection stays visible in detail');ok(await page.locator('[data-item-primary]').isEnabled(),'failed action can be retried');
   await page.evaluate(()=>{Object.defineProperty(Coop,'active',__activeDescriptor);Coop.submit=__submit;});await page.locator('#workspaceBack').tap();
   // Identification is a separate step; failed requests and art loads stay reviewable.
   await fixture();await page.evaluate(()=>{Game.state.player.inv.items.find(it=>it.uid===__incoming).identified=false;UI.refreshGrids();});await settle(page);
   await tap('.phone-bag-scroll [data-item-id="'+await page.evaluate(()=>__incoming)+'"]');await page.locator('[data-item-primary]').tap();
   ok(/Scroll of Insight/.test(await page.locator('.item-status').innerText()),'identification failure remains inside item details');
   await page.evaluate(()=>{Items.autoPlace(Game.state.player.inv,Items.makeConsumable('idscroll',1));UI.refreshGrids();});await page.locator('[data-item-primary]').tap();await settle(page);
   ok(await page.locator('#touchItemMenu').isVisible()&&await page.locator('[data-item-primary]').isDisabled(),'identifying stays in comparison and still requires a ring choice');
   ok(await page.evaluate(()=>Game.state.player.inv.items.find(it=>it.uid===__incoming).identified&&Game.state.player.equip.ring1.uid===__rings[0]),'identification does not equip automatically');
   await page.locator('[data-replace-slot=ring1]').tap();
   await page.evaluate(()=>{window.__prepare=Game.preparePlayerEquipment;Game.preparePlayerEquipment=async()=>{throw Error('Fixture asset failure');};window.__unchanged=JSON.stringify([Game.state.player.inv,Game.state.player.equip]);});
   await page.locator('[data-item-primary]').tap();await page.waitForFunction(()=>!document.querySelector('#touchItemMenu').classList.contains('item-pending'));
   ok(/Equipment art unavailable/.test(await page.locator('.item-status').innerText()),'equipment load failure appears inside comparison');
   ok(await page.evaluate(()=>__unchanged===JSON.stringify([Game.state.player.inv,Game.state.player.equip])),'failed equipment art preparation does not move gear');
   await page.evaluate(()=>{Game.preparePlayerEquipment=next=>new Promise(resolve=>{window.__continue=()=>__prepare(next).then(resolve);});});
   await page.locator('[data-item-primary]').tap();await page.evaluate(()=>{const p=Game.state.player;p.equip.ring2={...p.equip.ring2,name:'Changed during load'};__continue();});
   await page.waitForFunction(()=>!document.querySelector('#touchItemMenu').classList.contains('item-pending'));
   ok(/Equipment changed/.test(await page.locator('.item-status').innerText()),'solo asynchronous preparation rejects a changed loadout');
   ok(await page.evaluate(()=>Game.state.player.inv.items.some(it=>it.uid===__incoming)&&Game.state.player.equip.ring1.uid===__rings[0]),'stale solo swap retains selected and equipped rings');
   await page.evaluate(()=>Game.preparePlayerEquipment=__prepare);await page.locator('#workspaceBack').tap();
   // Carry remains accessible through the secondary action menu and can be placed.
   await fixture();await tap('.phone-bag-scroll [data-item-id="'+await page.evaluate(()=>__incoming)+'"]');await page.locator('.item-secondary summary').tap();await page.locator('.item-secondary').getByRole('button',{name:'Carry',exact:true}).tap();await settle(page);
   await tap('.phone-place-carried');ok(await page.locator('.phone-place-carried').count()===0,'carried gear can be placed back into bag');
   assert.deepEqual(errors,[]);fs.writeFileSync(out+'/report.json',JSON.stringify({status:'PASS',engine,checks,errors},null,2));console.log(`PASS ${checks} ${engine} phone inventory and comparison checks. Screenshots: ${out}`);
 }catch(e){await page.screenshot({path:out+'/failure.png'});throw e;}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
