const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {reveal}=require('./phone_page_helpers.cjs');
const {createRelay}=require('../server/relay.cjs');
const {installWorkerBridge,hostState,waitHostState}=require('./coop_browser_helpers.cjs');
const base=process.env.COOP_TEST_URL||'http://127.0.0.1:8741';
(async()=>{
  const relay=createRelay();await new Promise(r=>relay.server.listen(0,'127.0.0.1',r));const relayUrl='ws://127.0.0.1:'+relay.server.address().port+'/ws';
  const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding']});
  const errors=[];let checks=0;
  const ok=(v,m)=>{assert.ok(v,m);checks++;console.log('PASS',m);};
  fs.mkdirSync('tmp/coop-ui-qa',{recursive:true});
  async function client(mobile){
    const context=await browser.newContext(mobile?{viewport:{width:568,height:320},screen:{width:568,height:320},isMobile:true,hasTouch:true,deviceScaleFactor:1}:{viewport:{width:1366,height:900}});
    await installWorkerBridge(context);await context.addInitScript(url=>window.COOP_CONFIG={relayUrl:url},relayUrl);
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.stack));
    await page.addInitScript(()=>localStorage.setItem('embergrave_options',JSON.stringify({vol:{master:0,music:0,sfx:0}})));
    await page.goto(base,{waitUntil:'load',timeout:120000});await page.waitForFunction(()=>document.querySelector('#titleMenu button'),null,{timeout:120000});return {context,page};
  }
  try{
    const host=await client(false),guest=await client(true),a=host.page,b=guest.page;
    const press=async name=>{const el=b.getByRole('button',{name,exact:true,includeHidden:true});await reveal(el);await el.click();};
    await b.evaluate(()=>localStorage.setItem('embergrave_save_sentinel','{"name":"Solo sentinel"}'));
    const soloBefore=await b.evaluate(()=>localStorage.getItem('embergrave_save_sentinel'));
    await press('MULTIPLAYER');
    await b.locator('#choose-vanguard').waitFor({timeout:30000});
    ok(await b.locator('.class-choice').count()===5,'multiplayer uses all five shared class cards');
    ok(await b.locator('#hcBox').count()===0,'co-op creation omits unsupported Hardcore');
    for(const id of ['vanguard','emberwitch','gravebinder','wildkeeper','veilranger']){
      await b.locator('#choose-'+id).click();await b.waitForFunction(id=>document.querySelector('#campCanvas')?.dataset.renderedClass===id,id,{timeout:30000});
      ok(await b.locator('#choose-'+id).getAttribute('aria-selected')==='true',id+' selection and live preview agree');
    }
    await b.getByRole('button',{name:'Next',exact:true}).click();
    ok(await b.locator('#nameInput').getAttribute('maxlength')==='24','co-op retains the 24-character name limit');
    for(const name of ['', '   ']){
      await b.locator('#nameInput').fill(name);
      if(name)await b.locator('#nameInput').press('Enter');else await press('CREATE CO-OP HERO');
      ok(await b.evaluate(async()=>!(await CoopStore.heroes()).length&&!document.querySelector('.coop-dialog')&&document.activeElement.id==='nameInput'),'blank co-op name keeps focus in creation without saving a hero');
      ok(await b.locator('#heroNameError').isVisible()&&await b.locator('#heroNameError').textContent()==='Enter a character name.','blank co-op name displays required-name feedback');
    }
    await b.locator('#nameInput').fill('  Shared screen ranger  ');
    ok(await b.locator('#heroNameError').isHidden(),'correcting co-op name clears feedback');
    await press('CREATE CO-OP HERO');
    await b.waitForSelector('#coopRoom',{state:'attached'});await reveal(b.locator('#coopRoom'));await b.locator('#coopRoom').fill('ABC123');await press('← Back to heroes');
    ok(await b.evaluate(async()=>(await CoopStore.heroes())[0].name==='Shared screen ranger'),'co-op saves the trimmed typed name');
    ok(await b.locator('.saved-hero').count()===1,'new multiplayer hero appears in the shared saved roster');
    ok(await b.locator('#campCanvas').getAttribute('aria-label').then(x=>x?.includes('equipped gear')),'saved hero previews equipped gear');
    await press('HOST OR JOIN');
    ok(await b.locator('#coopRoom').inputValue()==='ABC123','Back navigation retains room input');
    await press('Join by code');await b.waitForFunction(()=>!Coop.active&&document.querySelector('.coop-dialog')?.getAttribute('aria-busy')!=='true');
    ok(await b.locator('.coop-status').textContent().then(t=>t.length>0)&&await b.getByRole('button',{name:'Join by code',exact:true}).isEnabled(),'failed connection keeps the hero and allows retry');
    await b.screenshot({path:'tmp/coop-ui-qa/lobby.png'});
    await press('← Back to heroes');
    const id=await b.evaluate(async()=>(await CoopStore.heroes())[0].id);
    const h=await a.evaluate(()=>Coop.newHero('Host','vanguard'));
    await a.evaluate(id=>Coop.connect('host',id),h.id);const room=await a.evaluate(()=>Coop.room);
    await press('HOST OR JOIN');await reveal(b.locator('#coopRoom'));await b.locator('#coopRoom').fill(room);await press('Join by code');
    await b.waitForFunction(()=>Game.state?.players.length===2&&!Coop.loading,null,{timeout:90000});
    await b.locator('#partyRoster').waitFor({state:'visible',timeout:90000});
    await b.evaluate(()=>CoopUI.close());await a.evaluate(()=>CoopUI.close());await b.waitForFunction(()=>Game.touchReady());
    const netId=await b.evaluate(()=>Coop.localId);
    ok(await b.evaluate(()=>localStorage.getItem('embergrave_save_sentinel'))===soloBefore,'co-op creation and joining leave solo saves untouched');
    const hostItem=await a.evaluate(()=>Game.state.player.inv.items[0]._coopId);
    const ownBefore=await Promise.all([a.evaluate(()=>JSON.stringify(CoopCodec.hero(Game.state.player).inv)),b.evaluate(()=>JSON.stringify(CoopCodec.hero(Game.state.player).inv))]);
    ok(!await b.evaluate(itemId=>Game.submitCommand({type:'carry',itemId}),hostItem),'a guest cannot carry an item owned by the host');
    ok(await a.evaluate(()=>JSON.stringify(CoopCodec.hero(Game.state.player).inv))===ownBefore[0]&&await b.evaluate(()=>JSON.stringify(CoopCodec.hero(Game.state.player).inv))===ownBefore[1],'rejected cross-player action leaves both personal inventories unchanged');
    await b.evaluate(()=>CoopInput.touchMove(1,0));
    await waitHostState(a,netId=>Game.state.players.find(p=>p._coopId===netId).command?.type==='steer',netId);
    await b.locator('[data-action=pack]').tap();
    await waitHostState(a,netId=>!Game.state.players.find(p=>p._coopId===netId).command,netId);
    ok(true,'opening a mobile menu cancels the host-owned movement command');
    ok(await b.locator('#panelRight .invgrid .invitem').count()>0,'guest inventory uses the single-player grid');
    await reveal(b.locator('#inventorySearch'));await b.locator('#inventorySearch').fill('draught');
    const item=await b.evaluate(()=>Game.state.player.inv.items.find(i=>i.belt)._coopId);
    await b.locator('#inventorySearch').blur();await reveal(b.locator('#panelRight .invgrid [data-item-id="'+item+'"]'));await b.locator('#panelRight .invgrid [data-item-id="'+item+'"]').tap();await press('Carry');
    await b.waitForFunction(id=>Game.state.player.management?.carried?._coopId===id,item);
    const carriedAtHost=await hostState(a,({netId,item})=>Game.state.players.find(p=>p._coopId===netId).management.carried._coopId===item,{netId,item});
    ok(carriedAtHost,'guest carrying is committed by the host');
    const ownAfter=await a.evaluate(()=>JSON.stringify(CoopCodec.hero(Game.state.player).inv));if(ownAfter!==ownBefore[0])console.log('Inventory difference',ownBefore[0],ownAfter);ok(ownAfter===ownBefore[0],'guest item actions leave the host inventory unchanged');
    await b.evaluate(()=>InventoryActions.submit({type:'place',itemId:Game.state.player.management.carried._coopId,to:'inv',x:8,y:3,targetId:null}));
    await b.waitForFunction(id=>Game.state.player.inv.items.find(i=>i._coopId===id)?.gx===8,item);
    ok(await b.locator('#inventorySearch').inputValue()==='draught','authoritative refresh preserves search');
    await b.locator('#workspaceClose').tap();
    const close=async()=>{await b.evaluate(()=>UI.closeAll());await b.waitForFunction(()=>!UI.anyOpen());};
    for(const [width,height] of [[568,240],[568,320],[844,390]]){
      await b.setViewportSize({width,height});await b.waitForTimeout(200);
      ok(await b.locator('#coopHUD').isHidden(),'party roster does not obscure gameplay at '+width+'×'+height);
      await b.locator('[data-action=phone-menu]').tap();const party=b.locator('#escmenu').getByRole('button',{name:'Party',exact:true});await reveal(party);await party.tap();
      await b.locator('.coop-dialog[open]').waitFor();await b.locator('#mobileControls').waitFor({state:'hidden'});
      ok(await b.locator('.coop-dialog[open]').isVisible()&&await b.locator('#mobileControls').isHidden(),'Party opens an exclusive menu at '+width+'×'+height);
      await press('Close');
      // Position the host-owned guest at the real strongbox for access validation.
      await hostState(a,netId=>{const p=Game.state.players.find(p=>p._coopId===netId),o=Game.state.map.props.find(o=>o.interact==='storage');p.x=o.x;p.y=o.y;p.surfaceId=o.surfaceId||0;p.command=null;},netId);
      await b.evaluate(()=>UI.openStorage());
      ok(await b.locator('#workspaceTabs button').count()===2,'storage and pack use tabs at '+width+'×'+height);
      await b.locator('#workspaceTabs [data-side=right]').click();
      await b.waitForFunction(()=>!!document.querySelector('#workspaceClose'));
      const layout=await b.evaluate(()=>{
        const visible=el=>!!el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden';
        const panels=[...document.querySelectorAll('#panelWorkspace .panel')].filter(visible);
        const r=panels[0].getBoundingClientRect();
        const button=document.getElementById('workspaceClose'),br=button.getBoundingClientRect();
        const hit=document.elementFromPoint(br.x+br.width/2,br.y+br.height/2);
        return {count:panels.length,fits:r.x>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1&&r.top>=0,hit:button.contains(hit),targets:[...document.querySelectorAll('#workspaceHeader button:not([hidden])')].every(b=>b.offsetHeight>=44)};
      });
      ok(layout.count===1&&layout.fits&&layout.hit&&layout.targets,'one reachable workspace with unobscured navigation at '+width+'×'+height+' '+JSON.stringify(layout));
      await b.screenshot({path:`tmp/coop-ui-qa/inventory-${width}x${height}.png`});await close();
      for(const panel of ['char','skills','quest']){
        await b.evaluate(panel=>UI.togglePanel(panel),panel);
        await b.locator('#workspaceHeader').waitFor();
        ok(await b.locator('#workspaceHeader').isVisible()&&await b.locator('#mobileControls').isHidden(),panel+' occupies the menu workspace at '+width+'×'+height);
        await b.locator('#workspaceClose').click();
      }
      await b.evaluate(()=>UI.openForge());await b.locator('#workspaceTabs [data-side=right]').click();
      ok(await b.locator('#panelRight .invgrid .invitem').count()>0&&await b.locator('#panelCenter').isHidden(),'forge and pack switch without overlap at '+width+'×'+height);await close();
      await b.evaluate(()=>UI.openSettings());ok(await b.locator('#escmenu').isVisible()&&await b.locator('#mobileControls').isHidden(),'settings hides gameplay controls at '+width+'×'+height);await b.evaluate(()=>UI.closeEsc());
    }
    // Closing while carrying recovers items, including after a failed host commit.
    await b.evaluate(()=>UI.togglePanel('inv'));const carried=await b.evaluate(item=>InventoryActions.submit({type:'carry',itemId:item}),item);
    ok(carried,'guest can carry before rollback test');await b.waitForFunction(id=>Game.state.player.management?.carried?._coopId===id,item);
    await hostState(a,()=>{window.realCommit=CoopStore.commit;CoopStore.commit=async()=>{throw Error('Injected inventory save failure');};});
    const failed=await b.evaluate(()=>InventoryActions.submit({type:'place',itemId:Game.state.player.management.carried._coopId,to:'inv',x:7,y:3,targetId:null}));
    ok(!failed,'failed host save rejects placement');
    await b.waitForFunction(id=>Game.state.player.management?.carried?._coopId===id,item);
    ok(await b.evaluate(id=>!Game.state.player.inv.items.some(i=>i._coopId===id),item),'rollback retains exactly one carried item');
    await hostState(a,()=>{CoopStore.commit=window.realCommit;});await a.evaluate(()=>Coop.retrySave());await b.waitForFunction(()=>!Coop.paused);
    await close();await b.waitForFunction(()=>!Game.state.player.management.carried);
    const record=await b.evaluate(id=>CoopStore.read('heroes',id),id);
    ok(!record.management.carried&&record.inv.some(i=>i.netId===item),'closing commits returned items to guest storage');
    await b.evaluate(itemId=>InventoryActions.submit({type:'carry',itemId}),item);
    await b.reload({waitUntil:'load',timeout:120000});await b.waitForFunction(()=>document.querySelector('#titleMenu button'));
    await b.evaluate(({id,room})=>Coop.connect('join',id,room),{id,room});
    await b.waitForFunction(item=>Game.state?.player?.management?.carried?._coopId===item&&!Coop.loading,item);
    ok(await a.evaluate(id=>Game.state.players.filter(p=>p.heroId===id).length===1,id),'reloading with a carried item restores the same personal hero');
    await b.evaluate(()=>UI.togglePanel('inv'));await b.locator('#workspaceClose').click();await b.waitForFunction(()=>!Game.state.player.management.carried);
    ok(await b.evaluate(id=>Game.state.player.inv.items.filter(it=>it._coopId===id).length===1,item),'recovered carried item returns exactly once');
    // Both clients contend for one real vendor item; only one payment may commit.
    const sale=await hostState(a,netId=>{
      const npc=Game.state.npcs.find(n=>Game.canTradeWith(n)),it=Items.fromBase('shortsword');it.identified=true;
      Game.state.vendorStock[npc.id]=[it];for(const p of Game.state.players){p.x=npc.x;p.y=npc.y;p.surfaceId=npc.surfaceId||0;p.gold=500;}
      CoopCodec.register(Game.state);return {type:'buy',npcId:npc.id,itemId:it._coopId};
    },netId);
    await b.waitForFunction(id=>Object.values(Game.state.vendorStock).flat().some(it=>it._coopId===id),sale.itemId);
    const purchases=await Promise.all([a.evaluate(c=>Game.submitCommand(c),sale),b.evaluate(c=>Game.submitCommand(c),sale)]);
    ok(purchases.filter(Boolean).length===1,'a concurrent vendor purchase commits exactly one winner');
    ok(await hostState(a,id=>Game.state.players.reduce((n,p)=>n+p.inv.items.filter(i=>i._coopId===id).length,0)===1,sale.itemId),'contested vendor item has exactly one owner');
    await a.evaluate(()=>UI.openStorage());
    ok(await a.locator('#panelLeft .invgrid').isVisible()&&await a.locator('#panelRight .invgrid').isVisible()&&await a.locator('#coopHUD').isHidden(),'desktop preserves paired storage and inventory without party HUD overlap');
    await a.screenshot({path:'tmp/coop-ui-qa/desktop.png'});
    await a.evaluate(()=>Coop.leave());await b.waitForFunction(()=>!Coop.active);
    // Deletion includes only the selected hero's owned campaigns and preserves other heroes.
    await b.evaluate(async()=>{const h=await Coop.newHero('Delete me','vanguard');await CoopStore.commit({id:'delete_campaign',ownerHeroId:h.id,name:'Owned test campaign',heroes:{}},[]);await CoopUI.open();});
    let confirmation='';b.once('dialog',async d=>{confirmation=d.message();await d.accept();});
    await press('Delete Delete me');
    await b.waitForFunction(async()=>!(await CoopStore.heroes()).some(h=>h.name==='Delete me'));
    ok(confirmation.includes('Owned test campaign')&&await b.evaluate(async()=>!(await CoopStore.campaigns()).some(c=>c.id==='delete_campaign')),'deletion confirms and removes the owned campaign');
    ok(await b.evaluate(id=>CoopStore.read('heroes',id).then(Boolean),id),'deleting another hero preserves the selected co-op hero');
    ok(!errors.length,'no browser runtime errors: '+errors.join('\n'));
    console.log(`PASS ${checks} shared character, inventory, mobile layout and save rollback browser checks`);
  }finally{await browser.close();await relay.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
