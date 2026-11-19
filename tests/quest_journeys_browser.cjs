const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const {chromium}=require('playwright');

const cases=[
  ['q1','town','fields'],['q5','town','forest'],['opt_north_1','frosthaven','shardpeak_shrine'],
  ['opt_marsh_1','marshcamp','hollow_reeds'],['opt_desert_1','khalcamp','shard_flats']
];
const root=path.resolve(__dirname,'..'),out=path.join(root,'tmp','quest-journeys');
const hook=`__questReview:{
  step(seconds){for(let t=0;t<seconds;t+=.05)update(.05);updateCamera(.05);render();},
  walkTo(point){
    const p=state.player;p.command={type:'move',point};repath(p,point.x,point.y);
    for(let i=0;i<2000&&p.command;i++)update(.05);
    if(Math.hypot(p.x-point.x,p.y-point.y)>2)throw Error('Could not walk the pilgrim route');
  },
  object(id){return state.map.props.find(o=>o.journeySite===id)||state.monsters.find(m=>m.journeyActor===id&&!m.dead);},
  aim(id){
    const o=this.object(id),p=state.player;if(!o)throw Error('Missing target '+id);
    const at=MapGen.recoveryPoint(state.map,{x:o.x+.8,y:o.y+.3},.36);
    Object.assign(p,at);p.command=p.path=null;camPos=null;updateCamera(.05);render();
    const cam=camera(),sx=U.isoX(o.x,o.y)-cam.x,sy=U.isoY(o.x,o.y)-cam.y-elevLift(o.x,o.y);
    const rect=canvas.getBoundingClientRect();
    for(const dy of [-30,-42,-15,-56,-6,-72,0])for(const dx of [0,8,-8,18,-18]){
      mouse.x=sx+dx;mouse.y=sy+dy;updateHover();
      if(hoverProp===o||hoverMon===o)return {x:rect.left+mouse.x*rect.width/canvas.width,y:rect.top+mouse.y*rect.height/canvas.height};
    }
    throw Error('Target cannot be picked '+id);
  }
},\n    init, newGame, loadGame,`;

async function review(browser,phone){
  const device=phone?'phone':'desktop',viewport=phone?{width:844,height:390}:{width:1440,height:900};
  const ctx=await browser.newContext({viewport,hasTouch:phone,isMobile:phone,reducedMotion:'reduce',serviceWorkers:'block'});
  const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);
  try{
    // Serve real production assets from the checkout; no local server, user saves or network required.
    await page.route('**/*',async route=>{
      const url=new URL(route.request().url()),file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
      if(url.hostname!=='embergrave.test'||!file.startsWith(root+path.sep))return route.abort();
      try{
        if(file===path.join(root,'js','game.js')){
          const src=(await fs.readFile(file,'utf8')).replace('    init, newGame, loadGame,',hook)
            .replace('    requestAnimationFrame(tick);','    requestAnimationFrame(tick); if(window.__manualQuest)return;');
          return await route.fulfill({body:src,contentType:'text/javascript'});
        }
        await route.fulfill({path:file});
      }catch{await route.fulfill({status:404,body:''});}
    });
    await page.addInitScript(()=>{window.__manualQuest=true;localStorage.setItem('embergrave_options',JSON.stringify({vol:{master:0,sfx:0,music:0}}));});
    await page.goto('http://embergrave.test/index.html?touch='+(phone?1:0),{waitUntil:'load',timeout:120000});
    await page.waitForFunction(()=>document.querySelector('#titleMenu button'),null,{timeout:90000});
    await page.evaluate(async seed=>{
      const seeds=U.rng(seed);
      U.newWorldSeed=()=>Math.floor(seeds()*4294967296);Math.random=U.rng(seed+1);
      await Game.newGame('Quest review','vanguard',false);
      await(await import('/tests/completed_hero_fixture.mjs')).loadCompletedHero(Game);
      Game.options.cinematics=false;Game.options.leftClickMove=false;UI.hideTitle();UI.closeAll();
    },phone?1774:4919);
    const choose=async locator=>phone?locator.tap():locator.click();
    const input=async id=>{
      const pt=await page.evaluate(id=>Game.__questReview.aim(id),id);
      if(phone)await page.touchscreen.tap(pt.x,pt.y);else await page.mouse.click(pt.x,pt.y);
      await page.evaluate(()=>Game.__questReview.step(.9));
    };
    const fight=async actor=>{
      for(let turn=0;turn<90;turn++){
        const alive=await page.evaluate(id=>{
          const p=Game.state.player;
          if(p.dead)throw Error('Hero fell while fighting '+id);
          if(p.hp<p.stats.maxHp*.7&&!p.healPool)p.quaff(0);
          return !!Game.__questReview.object(id);
        },actor);if(!alive)return;
        await input(actor);
      }
      const info=await page.evaluate(id=>{const p=Game.state.player,m=Game.__questReview.object(id);return {hero:p.hp,level:p.lvl,dead:p.dead,position:[p.x,p.y],target:m&&[m.hp,m.maxHp,m.x,m.y],command:p.command?.type,weapon:p.equip.main?.name,action:p.action?.state,paused:Game.state.paused};},actor);
      throw Error('Combat did not resolve '+actor+' '+JSON.stringify(info));
    };
    for(const [qid,camp,zone] of cases.filter(c=>!process.env.QUEST_CASE||c[0]===process.env.QUEST_CASE)){
      const townDialog=async claim=>{
        const name=await page.evaluate(async({qid,camp,claim})=>{
          UI.closeAll();await Game.enterMap(camp,'default');UI.closeAll();
          const s=Game.state,q=DATA.QUESTS.find(q=>q.id===qid);
          if(!claim)s.quests[qid]={state:'offered'};
          if(q.giver==='board')UI.openBoard();else UI.openDialog(s.npcs.find(n=>n.id===q.giver));
          return q.name;
        },{qid,camp,claim});
        const opt=page.locator('.dlgopt').filter({hasText:name}).first();await choose(opt);
        if(!claim&&qid!=='q5')await choose(page.getByRole('button',{name:/Take the task/}));
      };
      await townDialog(false);
      await page.evaluate(async({zone,qid})=>{
        await Game.enterMap(zone,'default');UI.closeAll();
        const s=Game.state,p=s.player,level=s.map.zone.lvl;
        while(p.lvl<level)p.gainXp(DATA.xpForLevel(p.lvl));
        // Equip ordinary level-appropriate gear and spend only earned attribute points.
        for(const slot of ['main','off','chest','head','gloves','boots','belt']){
          const bases=Object.values(DATA.BASES).filter(b=>b.slot===slot&&b.ilvl<=level&&(slot!=='main'||b.cat==='sword'));
          if(bases.length)p.equip[slot]=Items.fromBase(bases.sort((a,b)=>b.ilvl-a.ilvl)[0].id);
        }
        for(const attr of ['str','vit','dex']){const n=Math.floor(p.attrPts/(attr==='str'?2:attr==='vit'?1.5:1));p.attr[attr]+=n;p.attrPts-=n;}
        p.belt[0]={id:level>=5?'hp2':'hp1',count:4};p.computeStats();p.hp=p.stats.maxHp;p.mana=p.stats.maxMana;
        // Isolate the quest encounter from roaming packs for repeatable input and camera captures.
        s.monsters=s.monsters.filter(m=>m.journeyActor);s.ground=[];MobileControls.sync();
        if(Game.pinnedQuest())Game.pinQuest(null);
        if(qid==='opt_north_1'){
          const map=s.map,from=map.props.find(p=>p.journeySite==='shelter'),to=map.props.find(p=>p.journeySite==='summit');
          const via=map.frontier.landmarks.find(n=>n.id===(MobileShell.enabled?'lee':'windward'));
          if(!TerrainNavigation.findPath(map,from,via,{radius:.36})||!TerrainNavigation.findPath(map,via,to,{radius:.36}))throw Error('Blocked branch');
        }
      },{zone,qid});
      if(qid==='q1'){
        await input('watch_bell');
        for(let i=0;i<6;i++)await fight('bell_risen_'+i);
      }else if(qid==='q5')await input('heart_roots');
      else if(qid==='opt_north_1'){
        await input('shelter');
        if(phone)await page.evaluate(()=>MobileWorkspace.open('quest'));else await page.keyboard.press('q');
        await choose(page.locator('.qtab').first());await choose(page.locator('.qrow').filter({hasText:'The Shardpeak Vigil'}));
        await choose(page.getByRole('button',{name:'Pin quest',exact:true}));
        if(phone)await choose(page.locator('#workspaceClose'));else await page.keyboard.press('q');
        await page.evaluate(()=>UI.refreshHUD());assert.ok(await page.locator('#questTracker').isVisible());
        await choose(page.locator('#questTracker'));await page.locator('.qdetail').waitFor({state:'visible'});
        assert.match(await page.locator('.qdetail').innerText(),/Carry the ember/);
        assert.equal(await page.locator('#centerMsg').isVisible(),false,'world banners leave the journal clear');
        await page.screenshot({path:path.join(out,device+'-journal.png')});
        await choose(page.getByRole('button',{name:'Unpin quest',exact:true}));
        if(phone)await choose(page.locator('#workspaceClose'));else await page.keyboard.press('q');
        await page.evaluate(()=>{
          const m=Game.state.map,n=m.frontier.landmarks.find(n=>n.id===(MobileShell.enabled?'lee':'windward'));
          const via=MapGen.recoveryPoint(m,n,.36),summit=m.props.find(p=>p.journeySite==='summit');
          Game.__questReview.walkTo(via);Game.__questReview.walkTo(summit);
        });
        await input('summit');
      }else if(qid==='opt_marsh_1')await fight('shrine_herald');
      else {if(phone)await fight('quarry_left');await fight('quarry_captain');}
      const state=await page.evaluate(id=>Game.state.quests[id]?.state,qid);
      assert.equal(state,'reward',device+' '+qid+' ready');
      await page.screenshot({path:path.join(out,device+'-'+qid+'.png')});
      await townDialog(true);
      const receipt=await page.evaluate(id=>Game.state.quests[id].receipt,qid);
      assert.ok(receipt.some(v=>v.endsWith(' XP'))&&receipt.some(v=>v.endsWith(' gold')),qid+' receipt');
      await page.locator('#questReceipt').waitFor({state:'visible'});assert.match(await page.locator('#questReceipt').innerText(),/gold/);
      if(qid==='q5'){
        await page.evaluate(()=>UI.openBoard());assert.match(await page.locator('.written-testimony').innerText(),/fasten that clasp/);
        await page.evaluate(()=>UI.closeAll());
      }
      console.log('PASS '+device+' '+qid);
    }
    assert.deepEqual(errors,[]);
  }finally{await ctx.close();}
}
(async()=>{
  await fs.mkdir(out,{recursive:true});const browser=await chromium.launch({channel:'chrome',headless:true});
  try{for(const phone of [false,true])await review(browser,phone);}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
