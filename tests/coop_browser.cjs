const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const base=process.env.COOP_TEST_URL||'http://127.0.0.1:8741';
const partySize=Number(process.env.COOP_TEST_PLAYERS||4);
assert.ok([2,4].includes(partySize),'COOP_TEST_PLAYERS must be 2 or 4');
(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding']});
  const pages=[],errors=[];let checks=0;
  const ok=(value,message)=>{assert.ok(value,message);checks++;};
  async function player(name,cls){
    const context=await browser.newContext({viewport:{width:1280,height:800}}),page=await context.newPage();
    page.on('pageerror',e=>{errors.push(name+': '+e.stack);console.log('PAGE ERROR',name,e.message);});
    page.on('console',m=>{if(m.type()==='error'){console.log('CONSOLE',name,m.text().slice(0,1500));if(!m.text().includes('Failed to load resource')){errors.push(name+': '+m.text());page.evaluate(()=>({active:Coop.active,loading:Coop.loading,map:Game.state?.map?.id,props:Game.state?.map?.props.filter(pr=>{const type=((pr.completed||pr.opened)&&pr.visualDone)||pr.visual||pr.visualType||pr.type;return !SpriteAssets.maps.props[(pr.artZone||Game.state.map.id)+'_'+type]&&!SpriteAssets.maps.props[type];})})).then(r=>console.log('Render diagnostics',name,JSON.stringify(r).slice(0,3000))).catch(()=>{});}}});
    await page.addInitScript(()=>localStorage.setItem('embergrave_options',JSON.stringify({vol:{master:0,music:0,sfx:0}})));
    await page.goto(base+'/index.html',{waitUntil:'load',timeout:120000});
    await page.waitForFunction(()=>document.querySelector('#titleMenu button'),null,{timeout:120000});
    const hero=await page.evaluate(async({name,cls})=>Coop.newHero(name,cls),{name,cls});
    pages.push(page);return {page,hero};
  }
  try{
    console.log('Loading host…');const a=await player('Host','vanguard');
    await a.page.evaluate(id=>Coop.connect('host',id),a.hero.id);
    console.log('Host in room',await a.page.evaluate(()=>({room:Coop.room,map:Game.state.map.id,paused:Coop.paused})));
    const code=await a.page.evaluate(()=>Coop.room);
    console.log('Loading guest…');const b=await player('Guest','emberwitch');
    await b.page.evaluate(({id,code})=>Coop.connect('join',id,code),{id:b.hero.id,code});
    await b.page.waitForFunction(()=>Game.state?.players.length===2&&!Coop.loading,null,{timeout:90000});
    ok(await a.page.evaluate(()=>Game.state.players.length===2),'host has both heroes');
    ok(await b.page.evaluate(()=>Game.state.player.name==='Guest'),'guest owns its camera and hero');
    console.log('Two-player synchronization passed.');
    const from=await b.page.evaluate(()=>({x:Game.state.player.x,y:Game.state.player.y}));
    await b.page.evaluate(()=>{const p=Game.state.player;return Coop.submit({type:'move',point:{x:p.x+2,y:p.y,surfaceId:0}});});
    await b.page.waitForTimeout(1600);
    const positions=await Promise.all([a.page.evaluate(()=>Game.state.players.map(p=>({name:p.name,x:p.x,y:p.y}))),b.page.evaluate(()=>Game.state.players.map(p=>({name:p.name,x:p.x,y:p.y})))]);
    console.log('Positions',positions);
    ok(Math.hypot(positions[0][1].x-from.x,positions[0][1].y-from.y)>.2,'guest movement reaches host');
    ok(Math.hypot(positions[0][1].x-positions[1][1].x,positions[0][1].y-positions[1][1].y)<.8,'guest converges to host position');
    console.log('Campaign party size:',partySize);
    for(const [name,cls] of [['Summoner','gravebinder'],['Warden','wildkeeper']].slice(0,partySize-2)){
      const c=await player(name,cls);await c.page.evaluate(({id,code})=>Coop.connect('join',id,code),{id:c.hero.id,code});
      await c.page.waitForFunction(()=>Game.state?.players.length>=3&&!Coop.loading,null,{timeout:90000});
    }
    await Promise.all(pages.map(page=>page.waitForFunction(size=>Game.state?.players.length===size,partySize,{timeout:30000})));
    ok(true,partySize+' isolated browsers share one party');
    const shared=await a.page.evaluate(()=>{
      const p=Game.state.player;for(const hero of Game.state.players){hero.x=p.x;hero.y=p.y;hero.command=null;hero.path=null;}
      Game.coop.drop(Items.fromBase('shortsword'),p);const g=Game.state.ground.at(-1);g.x=p.x;g.y=p.y;Coop.register();Coop.markCritical();return g._coopId;
    });
    await b.page.waitForFunction(id=>Game.state.ground.some(g=>g._coopId===id),shared);
    await Promise.all([a.page,b.page].map(page=>page.evaluate(id=>Coop.submit({type:'pickup',targetId:id}),shared)));
    const own=await a.page.evaluate(()=>Game.state.players.map(p=>p.inv.items.filter(it=>it.baseId==='shortsword').length));
    ok(own.reduce((a,b)=>a+b,0)===1,'contested pickup has one owner across clients');
    await b.page.evaluate(()=>CoopUI.management('inv'));await b.page.waitForTimeout(150);
    ok(await b.page.locator('#panelRight .invgrid').isVisible(),'co-op inventory uses the shared grid');await b.page.evaluate(()=>UI.closeAll());
    await a.page.evaluate(()=>{Coop.died(Game.state.players[1]);});
    await b.page.waitForFunction(()=>Game.state.player.dead);
    await a.page.evaluate(()=>Coop.submit({type:'revive',targetId:Game.state.players[1]._coopId}));
    await a.page.evaluate(()=>Coop.submit({type:'move',point:{x:Game.state.player.x+.5,y:Game.state.player.y,surfaceId:0}}));
    await a.page.waitForTimeout(150);
    ok(await a.page.evaluate(()=>!Game.state.player.reviveTarget&&Game.state.players[1].dead),'movement interrupts revival');
    await a.page.evaluate(()=>Coop.submit({type:'revive',targetId:Game.state.players[1]._coopId}));
    await a.page.evaluate(()=>Game.state.player.takeDamage(3,null,'phys'));await a.page.waitForTimeout(150);
    ok(await a.page.evaluate(()=>!Game.state.player.reviveTarget&&Game.state.players[1].dead),'incoming damage interrupts revival');
    await a.page.evaluate(()=>Coop.submit({type:'revive',targetId:Game.state.players[1]._coopId}));
    await b.page.waitForFunction(()=>!Game.state.player.dead,null,{timeout:12000});
    ok(true,'teammate revival synchronizes to the fallen guest');
    await a.page.evaluate(()=>Coop.requestTravel('north_wild','from_camp'));
    await Promise.all(pages.map(page=>page.waitForFunction(()=>!!CoopUI.travelId)));
    await b.page.evaluate(()=>Coop.answerTravel(false));
    await a.page.waitForFunction(()=>!Coop.paused);ok(await a.page.evaluate(()=>Game.state.map.id==='frosthaven'),'declined travel keeps party in town');
    async function travel(zone,spawn='default'){
      console.log('Party travel:',zone);await a.page.waitForFunction(()=>!Coop.busy&&!Coop.paused);
      assert.ok(await a.page.evaluate(({zone,spawn})=>Coop.requestTravel(zone,spawn),{zone,spawn}),'travel requested');
      await Promise.all(pages.map(page=>page.waitForFunction(()=>!!CoopUI.travelId)));
      await Promise.all(pages.map(page=>page.evaluate(()=>Coop.answerTravel(true))));
      await Promise.all(pages.map(page=>page.waitForFunction(zone=>Game.state?.map?.id===zone&&!Coop.loading&&!Coop.paused,zone,{timeout:120000})));
    }
    await travel('north_wild','from_camp');
    ok(await a.page.evaluate(size=>Game.state.map._coopSize===size,partySize),'party health scaling is fixed at area creation');
    await a.page.evaluate(()=>{for(const p of Game.state.players){p.stats.maxHp=100000;p.hp=100000;}});
    await a.page.waitForTimeout(800);
    ok(await b.page.evaluate(()=>Game.state.monsters.length>0),'guests receive the adventure enemies');
    for(const zone of ['mines','shardpeak_shrine','deepfreeze_cavern','frosthaven'])await travel(zone);
    // Exercise objective/reward handlers with durable heroes after the live revival checks.
    await a.page.evaluate(()=>{for(const p of Game.state.players){p.attr.vit=1000;p.computeStats();p.dead=false;p.action=null;p.hp=p.stats.maxHp;p.mana=p.stats.maxMana;}});
    // Combat is accelerated below so random packs cannot derail a rescue fixture.
    async function quest(id,complete=false){
      await a.page.waitForFunction(()=>!Coop.busy&&!Coop.paused);
      const result=await a.page.evaluate(async({id,complete})=>{
        const q=DATA.QUESTS.find(q=>q.id===id),n=Game.state.npcs.find(n=>n.id===q.giver);if(!n)throw Error('Missing giver '+q.giver);
        Game.state.player.x=n.x;Game.state.player.y=n.y;
        return Coop.submit({type:complete?'completeQuest':'acceptQuest',questId:id});
      },{id,complete});ok(result,(complete?'turn in ':'accept ')+id);
    }
    await travel('north_wild');
    await a.page.evaluate(()=>{for(const m of Game.state.monsters.filter(m=>!m.dead&&!m.isBoss).slice(0,8))m.die(Game.state.players[1]);});
    await a.page.waitForFunction(()=>Game.state.quests.q7.state==='reward');
    await travel('frosthaven');await quest('q7',true);await quest('q8');
    await travel('mines');
    const survivors=await a.page.evaluate(()=>Game.state.npcs.filter(n=>n.survivor).map(n=>n._coopId));
    for(const id of survivors){
      await a.page.evaluate(id=>{const n=Game.state.npcs.find(n=>n._coopId===id),p=Game.state.players[1];p.x=n.x;p.y=n.y;},id);
      await b.page.evaluate(id=>Coop.submit({type:'interact',targetId:id}),id);
    }
    await a.page.waitForFunction(()=>Game.state.quests.q8.state==='reward');
    ok(true,'guest rescues collectively advance the campaign');await travel('frosthaven');await quest('q8',true);await quest('q8b');
    // Click the ordinary cinematic skip affordance in each independent client.
    for(const page of pages)await page.evaluate(()=>{window.qaSkip=setInterval(()=>document.querySelector('#cinematic:not(.hidden)')?.click(),400);});
    await travel('north_wild');
    await a.page.evaluate(()=>{for(const m of Game.state.monsters.filter(m=>m.beacon&&!m.dead))m.die(Game.state.players[Math.min(2,Game.state.players.length-1)]);});
    await a.page.waitForFunction(()=>Game.state.monsters.some(m=>['barb_axe','barb_pole','barb_sword'].includes(m.defId)),null,{timeout:20000});
    await a.page.waitForFunction(()=>!Coop.paused&&!UI.cinematicActive(),null,{timeout:25000});
    await a.page.evaluate(()=>{const trio=Game.state.monsters.filter(m=>['barb_axe','barb_pole','barb_sword'].includes(m.defId)&&!m.dead);if(trio.length!==3)throw Error('Expected three Oathsworn, got '+trio.map(m=>m.defId));for(const m of trio)m.die(Game.state.players.at(-1));});
    await a.page.waitForFunction(()=>Game.state.flags.fn_temple_open);ok(true,'beacons and Oathsworn unlock the temple');
    await travel('frosthaven');await quest('q8b',true);await quest('q9');await travel('shattered_temple');
    await a.page.evaluate(()=>{const boss=Game.state.monsters.find(m=>m.defId==='korvath');for(const p of Game.state.players){p.x=boss.x+1;p.y=boss.y;p.stats.maxHp=100000;p.hp=100000;}boss.encounter.prepare(Game.state.players[1],Game.state.map);});
    await a.page.waitForFunction(()=>!Coop.paused&&!UI.cinematicActive(),null,{timeout:25000});
    await a.page.evaluate(()=>{const boss=Game.state.monsters.find(m=>m.defId==='korvath');boss.takeDamage(1e8,Game.state.players[1],{},'phys');});
    await a.page.waitForFunction(()=>Game.state.quests.q9.state==='reward',null,{timeout:15000});
    await travel('frosthaven');await quest('q9',true);
    await Promise.all(pages.map(page=>page.waitForFunction(()=>Game.state.flags.coopComplete)));
    ok(await a.page.evaluate(size=>Game.state.quests.q9.coopRewarded.length===size,partySize),'all participating heroes receive Korvath rewards once');
    ok(!await a.page.evaluate(()=>Coop.submit({type:'completeQuest',questId:'q9'})),'a repeated quest reward command is rejected');
    const campaignId=await a.page.evaluate(async()=>{await Coop.checkpoint();return (await CoopStore.campaigns())[0].id;});
    const earned=await b.page.evaluate(async()=>({gold:Game.state.player.gold,record:(await CoopStore.heroes())[0]}));
    ok(earned.record.gold===earned.gold,'guest persists the host-confirmed reward');
    const output=partySize===4?'tmp/coop-qa':'tmp/coop-qa/two-player';
    fs.mkdirSync(output,{recursive:true});await a.page.screenshot({path:output+'/host.png'});await b.page.screenshot({path:output+'/guest.png'});
    // Deliberately reject a commit and verify the economic transaction rolls back.
    await a.page.waitForFunction(()=>!Coop.busy);
    const failure=await a.page.evaluate(async()=>{
      const p=Game.state.player;Game.coop.drop(Items.fromBase('shortsword'),p);const g=Game.state.ground.at(-1);g.x=p.x;g.y=p.y;Coop.register();
      const count=p.inv.items.length,real=CoopStore.commit;CoopStore.commit=async()=>{throw Error('Injected disk failure');};
      try{const result=await Coop.submit({type:'pickup',targetId:g._coopId});return {result,present:Game.state.ground.some(x=>x._coopId===g._coopId),unchanged:p.inv.items.length===count,paused:Coop.paused};}finally{CoopStore.commit=real;}
    });ok(!failure.result&&failure.present&&failure.unchanged&&failure.paused==='Save failed','failed save restores the shared item and pauses play');
    await a.page.evaluate(()=>Coop.retrySave());
    await travel('north_wild');
    const wipe=await a.page.evaluate(()=>Game.state.players.map(p=>{const gold=p.gold;Coop.died(p);Coop.died(p);return {id:p.heroId,expected:gold-Math.floor(gold*.1)};}));
    await Promise.all(pages.map(page=>page.waitForFunction(()=>Game.state?.map.id==='frosthaven'&&!Coop.loading&&!Coop.paused&&Game.state.players.every(p=>!p.dead),null,{timeout:30000})));
    ok(await a.page.evaluate(wipe=>wipe.every(row=>Game.state.players.find(p=>p.heroId===row.id).gold===row.expected),wipe),'a full wipe returns the party to town with one gold penalty per fall');
    await a.page.evaluate(()=>Coop.leave());
    await Promise.all(pages.slice(1).map(page=>page.waitForFunction(()=>!Coop.active)));
    await a.page.evaluate(({hero,campaignId})=>Coop.connect('host',hero,'',campaignId),{hero:a.hero.id,campaignId});
    ok(await a.page.evaluate(size=>Game.state.map.id==='frosthaven'&&Game.state.flags.coopComplete&&Game.state.quests.q9.coopRewarded.length===size,partySize),'saved campaign resumes in Frosthaven with its completion and reward ledger');
    await a.page.screenshot({path:output+'/resumed-campaign.png'});
    ok(!errors.length,errors.join('\n'));console.log('PASS '+checks+' co-op browser checks');
  }catch(error){
    for(const page of pages)console.error('Failure state',await page.evaluate(()=>({name:Game.state?.player?.name,map:Game.state?.map?.id,loading:Coop.loading,paused:Coop.paused,busy:Coop.busy,travel:CoopUI.travelId,party:Game.state?.players?.map(p=>({name:p.name,connected:p.connected,dead:p.dead})),messages:Game.state?.messages})).catch(()=>null));
    throw error;
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
