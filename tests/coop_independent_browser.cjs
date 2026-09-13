const {chromium}=require('playwright');
const {createRelay}=require('../server/relay.cjs');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
  const relay=createRelay();await new Promise(r=>relay.server.listen(0,'127.0.0.1',r));
  const url='ws://127.0.0.1:'+relay.server.address().port+'/ws';
  const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding']});
  const errors=[],pages=[],count=Number(process.env.COOP_TEST_PLAYERS||2);
  try{
    for(let i=0;i<count;i++){
      const context=await browser.newContext({viewport:{width:844,height:390},isMobile:true,hasTouch:true});
      await context.route('**/js/coop_worker.js*',async route=>{
        const source=fs.readFileSync('js/coop_worker.js','utf8');
        await route.fulfill({contentType:'text/javascript',body:source+`
          const normalMessage=self.onmessage;
          self.onmessage=async e=>{const m=e.data;if(m.type!=='qa')return normalMessage(e);try{const value=await new Function('arg',m.source)(m.arg);postMessage({type:'qaReply',id:m.id,value});}catch(e){postMessage({type:'qaReply',id:m.id,error:e.stack});}};
        `});
      });
      const page=await context.newPage();pages.push(page);page.on('pageerror',e=>{errors.push(e.stack);console.error(e.stack);});
      page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('Failed to load resource')){errors.push(m.text());console.error(m.text());}});
      await page.addInitScript(url=>{
        window.qaLagMs=0;window.qaNetworkPending=0;window.qaNetworkMax=0;
        const NativeSocket=WebSocket;window.WebSocket=class extends NativeSocket{
          constructor(...args){super(...args);window.qaSocket=this;this.inAt=this.outAt=0;super.addEventListener('message',e=>{const now=performance.now();this.inAt=Math.max(this.inAt,now+qaLagMs/2);qaNetworkMax=Math.max(qaNetworkMax,++qaNetworkPending);setTimeout(()=>{qaNetworkPending--;this.handler?.(e);},this.inAt-now);});}
          close(...args){setTimeout(()=>super.close(...args),Math.max(0,this.outAt-performance.now())+1);}
          set onmessage(fn){this.handler=fn;}get onmessage(){return this.handler;}
          send(raw){const now=performance.now();this.outAt=Math.max(this.outAt,now+qaLagMs/2);setTimeout(()=>{if(this.readyState===1)super.send(raw);},this.outAt-now);}
        };
        const NativeWorker=Worker;window.Worker=class extends NativeWorker{constructor(...args){super(...args);window.qaWorker=this;}};
        let qaId=0;window.qaHost=(source,arg)=>new Promise((resolve,reject)=>{const id=++qaId;const receive=e=>{if(e.data.type!=='qaReply'||e.data.id!==id)return;qaWorker.removeEventListener('message',receive);e.data.error?reject(Error(e.data.error)):resolve(e.data.value);};qaWorker.addEventListener('message',receive);qaWorker.postMessage({type:'qa',id,source,arg});});
        window.COOP_CONFIG={relayUrl:url};localStorage.setItem('embergrave_options',JSON.stringify({vol:{master:0,music:0,sfx:0}}));},url);
      await page.goto(process.env.COOP_TEST_URL||'http://127.0.0.1:8741',{waitUntil:'load',timeout:120000});
      await page.waitForFunction(()=>typeof Coop!=='undefined'&&document.querySelector('#titleMenu button'),null,{timeout:120000});
    }
    const [host,guest]=pages;
    const code=await host.evaluate(async()=>{const h=await Coop.newHero('Worker host','vanguard');return Coop.connect('host',h.id,null,null,{name:'Independent QA',seed:123});});
    await host.waitForFunction(()=>Coop.workerHost&&Game.state?.players.length===1&&!Coop.loading,null,{timeout:90000});
    console.log('Host worker ready');
    assert.ok((await guest.evaluate(()=>Coop.listRooms())).some(r=>r.name==='Independent QA'));
    await guest.evaluate(async code=>{const h=await Coop.newHero('Guest','veilranger');await Coop.connect('join',h.id,code);},code);
    await guest.waitForFunction(()=>Game.state?.players.length===2&&!Coop.loading,null,{timeout:90000});
    console.log('Guest joined');
    await guest.evaluate(()=>CoopUI.close());await host.evaluate(()=>CoopUI.close());
    assert.equal(await guest.evaluate(()=>Game.state.map.id),'frosthaven');
    await guest.evaluate(ms=>window.qaLagMs=ms,Number(process.env.COOP_TEST_LAG_MS||150));
    const before=await guest.evaluate(()=>Game.state.player.x);
    await guest.evaluate(()=>{const p=Game.state.player;CoopInput.click(false,{mouse:{shift:false},point:{x:p.x+2,y:p.y,surfaceId:0}});});
    await guest.waitForTimeout(1500);
    assert.ok(await guest.evaluate(x=>Math.abs(Game.state.player.x-x)>.2,before));
    const responseStart=await guest.evaluate(()=>CoopInput.responseTimes.length);
    for(let trial=0;trial<20;trial++){
      await guest.evaluate(()=>Coop.submit({type:'stop'}));
      await guest.waitForFunction(()=>!Game.state.player.moving);
      await guest.evaluate(trial=>{const p=Game.state.player;CoopInput.click(false,{mouse:{shift:false},point:{x:p.x+(trial%2?-.7:.7),y:p.y,surfaceId:p.surfaceId}});},trial);
      await guest.waitForTimeout(400);
    }
    const responseSamples=await guest.evaluate(start=>CoopInput.responseTimes.slice(start),responseStart);
    assert.equal(responseSamples.length,20,'twenty standstill-to-movement response samples');
    const responseP95=responseSamples.slice().sort((a,b)=>a-b)[19];assert.ok(responseP95<100,'instrumented local movement responds below 100 ms');
    console.log('Instrumented movement response p95:',responseP95);
    const guestId=await guest.evaluate(()=>Coop.localId),hostId=await host.evaluate(()=>Coop.localId);
    const qa=(source,arg)=>host.evaluate(({source,arg})=>qaHost(source,arg),{source,arg});
    async function travel(page,id,zone){
      await page.evaluate(()=>CoopUI.close());
      await qa(`const p=Coop.players.get(arg.id),w=Coop.worlds.get(p.worldId),e=w.map.exits.find(e=>e.target===arg.zone);if(!e)throw Error('Missing exit');p.x=(e.x0+e.x1)/2;p.y=(e.y0+e.y1)/2;p.command=p.path=null;Coop.receive(arg.id,{kind:'resync'});return true;`,{id,zone});
      await page.waitForTimeout(250);assert.equal(await page.evaluate(zone=>Coop.requestTravel(zone),zone),true);
      await page.waitForFunction(zone=>Game.state?.map?.id===zone&&!Coop.loading,zone,{timeout:90000});
    }
    await travel(guest,guestId,'north_wild');
    assert.equal(await host.evaluate(()=>Game.state.map.id),'frosthaven');
    await host.waitForFunction(()=>Game.state.players.length===1&&Coop.party.length===2);
    console.log('Guest explores independently');
    await travel(host,hostId,'north_wild');
    for(let i=2;i<count;i++){
      await pages[i].evaluate(async({code,i})=>{const h=await Coop.newHero('Arrival '+i,i===2?'gravebinder':'wildkeeper');await Coop.connect('join',h.id,code);},{code,i});
      await pages[i].waitForFunction(()=>Game.state?.map?.id==='frosthaven'&&!Coop.loading,null,{timeout:90000});
    }
    await qa(`for(const w of Coop.worlds.values())w.monsters=[];for(const p of Coop.players.values()){p.combatUntil=0;p.command=p.path=null;p.hp=p.stats.maxHp;}return true;`);
    await guest.evaluate(()=>Coop.submit({type:'stop'}));await guest.waitForTimeout(200);
    assert.equal(await guest.evaluate(id=>Coop.teleportToPlayer(id),hostId),true);
    const generation=await guest.evaluate(()=>Game.state.player.travelGeneration);
    await guest.waitForFunction(g=>Game.state.player.travelGeneration>g,generation,{timeout:10000});
    console.log('Teleport channel completed');
    await guest.evaluate(()=>CoopUI.party());assert.equal(await guest.getByRole('button',{name:'Teleport to player'}).count(),count-1);
    fs.mkdirSync('tmp/coop-qa',{recursive:true});await guest.screenshot({path:'tmp/coop-qa/independent-party-'+count+'.png'});await guest.evaluate(()=>CoopUI.close());
    const enemy=await qa(`const p=Coop.players.get(arg),w=Coop.worlds.get(p.worldId);return Game.coop.withWorld(w,()=>{const m=new Monster('frost_risen',p.x+2,p.y);m.hp=m.maxHp=10000;m._coopScaled=true;m.aggro=true;w.monsters.push(m);Coop.register();for(const h of w.players){h.hp=h.stats.maxHp=100000;}return m._coopId;});`,guestId);
    await guest.waitForFunction(id=>Game.state.monsters.some(m=>m._coopId===id),enemy,{timeout:10000});
    await guest.evaluate(id=>Coop.submit({type:'attack',targetId:id,skill:'basic',hold:true}),enemy);
    await guest.waitForFunction(id=>Game.state.monsters.find(m=>m._coopId===id)?.hp<10000,enemy,{timeout:15000});
    console.log('Worker-authoritative ranged combat rendered');
    await Promise.all([host,guest].map(page=>page.evaluate(()=>Game.coop.preload('shattered_temple'))));
    const bossId=await qa(`const p=Coop.players.get(arg),w=Coop.worlds.get(p.worldId);return Game.coop.withWorld(w,()=>{w.monsters=[];const m=new Monster('korvath',p.x+2,p.y);m.def.cutscene=null;m.aggro=true;w.monsters.push(m);Coop.register();m.encounter.active=true;m.encounter.start('cleave',p);return m._coopId;});`,guestId);
    await guest.waitForFunction(id=>Game.state.monsters.find(m=>m._coopId===id)?.encounter?.attack?.shapes.length,bossId,{timeout:10000});
    await guest.waitForTimeout(500);assert.equal(await guest.evaluate(()=>Coop.active),true);console.log('Boss warnings and encounter HUD rendered');
    await qa(`for(const w of Coop.worlds.values())w.monsters=[];return true;`);

    await guest.evaluate(()=>Coop.submit({type:'stop'}));
    await guest.evaluate(()=>qaSocket.close());
    await guest.waitForFunction(()=>Coop.paused.includes('Reconnecting'),null,{timeout:8000});
    await guest.waitForFunction(()=>!Coop.paused&&Game.state.player.connected,null,{timeout:15000});
    assert.equal(await guest.evaluate(()=>Coop.localId),guestId);console.log('Guest resumed in its current area');
    const timing=await guest.evaluate(async()=>({...(await Coop.diagnostics()),networkMax:qaNetworkMax}));
    assert.ok(timing.networkMax<400);const frames=timing.frames.slice(-240).sort((a,b)=>a-b);console.log(JSON.stringify({players:count,lag:Number(process.env.COOP_TEST_LAG_MS||150),frameP95:frames[Math.floor(frames.length*.95)],networkMax:timing.networkMax}));
    const hostTiming=await host.evaluate(()=>Coop.diagnostics());
    fs.writeFileSync('tmp/coop-qa/browser-'+count+'.json',JSON.stringify({players:count,rttMs:Number(process.env.COOP_TEST_LAG_MS||150),environment:'Desktop Chrome touch emulation; not physical Pixel 7a',browserVersion:browser.version(),viewport:{width:844,height:390},frameP95:frames[Math.floor(frames.length*.95)],responseSamples,responseP95,networkMax:timing.networkMax,host:hostTiming,guest:timing},null,2));
    await host.evaluate(()=>Coop.checkpoint());
    const saved=await host.evaluate(async()=>{const c=(await CoopStore.campaigns())[0];return {id:c.id,heroId:c.ownerHeroId};});
    await qa(`Coop.tick=()=>{throw Error('Injected worker failure');};return true;`);
    await host.waitForFunction(()=>!Coop.active&&!Coop.workerHost&&document.querySelector('#titleMenu button'),null,{timeout:10000});
    await guest.waitForFunction(()=>!Coop.active,null,{timeout:10000});
    assert.ok(!(await host.evaluate(()=>Coop.listRooms())).some(r=>r.code===code),'failed worker room removed');
    await host.evaluate(saved=>Coop.connect('host',saved.heroId,null,saved.id),saved);
    await host.waitForFunction(()=>Coop.workerHost&&!Coop.loading&&Game.state?.map.id==='frosthaven',null,{timeout:90000});
    console.log('Worker failure ended the room; saved campaign recovered in Frosthaven');
    assert.equal(errors.length,0);
    console.log('PASS worker hosting, independent areas, late joins, teleport, combat ('+count+' players)');
    fs.mkdirSync('tmp/coop-qa',{recursive:true});await guest.screenshot({path:'tmp/coop-qa/independent-mobile.png'});
  }finally{await browser.close();await relay.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
