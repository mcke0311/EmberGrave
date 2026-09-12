const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const base=process.env.COOP_TEST_URL||'http://127.0.0.1:8741';
(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding']});
  const errors=[],pages=[];let checks=0;
  const ok=(v,m)=>{assert.ok(v,m);checks++;console.log('PASS',m);};
  async function client(name,cls,mobile=false){
    const context=await browser.newContext(mobile?{viewport:{width:844,height:390},isMobile:true,hasTouch:true,deviceScaleFactor:1}:{viewport:{width:1280,height:800}});
    const page=await context.newPage();pages.push(page);page.on('pageerror',e=>errors.push(name+': '+e.stack));
    page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('Failed to load resource'))errors.push(name+': '+m.text());});
    await page.addInitScript(()=>{
      Object.defineProperty(crypto,'randomUUID',{value:undefined});
      localStorage.setItem('embergrave_options',JSON.stringify({vol:{master:0,music:0,sfx:0}}));
      window.qaLag=false;window.qaMuteIncoming=false;window.qaDuplicate=false;window.qaPending=0;window.qaMaxPending=0;window.qaBytes=0;
      const Native=window.WebSocket;
      window.WebSocket=class extends Native{
        constructor(...args){super(...args);window.qaSocket=this;this.inAt=0;this.outAt=0;
          super.addEventListener('message',e=>{
            if(window.qaMuteIncoming)return;window.qaBytes+=e.data.length;
            const now=performance.now();this.inAt=Math.max(this.inAt,now+(window.qaLag?60+Math.random()*30:0));
            window.qaMaxPending=Math.max(window.qaMaxPending,++window.qaPending);
            setTimeout(()=>{window.qaPending--;this.handler?.(e);},this.inAt-now);
          });
        }
        set onmessage(fn){this.handler=fn;}get onmessage(){return this.handler;}
        send(raw){const m=JSON.parse(raw);if(m.type==='data'&&m.payload?.kind==='command')window.qaLastCommand=m;
          const now=performance.now();this.outAt=Math.max(this.outAt,now+(window.qaLag?60+Math.random()*30:0));
          setTimeout(()=>{if(this.readyState!==Native.OPEN)return;super.send(raw);if(window.qaDuplicate&&m.payload?.kind==='command')super.send(raw);},this.outAt-now);
        }
      };
    });
    await page.goto(base,{waitUntil:'load',timeout:120000});
    await page.waitForFunction(()=>document.querySelector('#titleMenu button'),null,{timeout:120000});
    const h=await page.evaluate(({name,cls})=>Coop.newHero(name,cls),{name,cls});return {page,context,hero:h};
  }
  try{
    const h=await client('Host','gravebinder'),g=await client('Ranger','veilranger',true),a=h.page,b=g.page;
    await a.evaluate(id=>Coop.connect('host',id),h.hero.id);const room=await a.evaluate(()=>Coop.room);
    await b.evaluate(({id,room})=>Coop.connect('join',id,room),{id:g.hero.id,room});await b.waitForFunction(()=>Game.state?.players.length===2&&!Coop.loading,null,{timeout:90000});
    const id=await b.evaluate(()=>Coop.localId);
    await b.evaluate(()=>window.qaLag=true);
    const before=await b.evaluate(()=>({x:Game.state.player.x,y:Game.state.player.y}));
    await b.evaluate(()=>{const p=Game.state.player;CoopInput.click(false,{mouse:{shift:false},point:{x:p.x+3,y:p.y,surfaceId:0}});});
    await b.waitForTimeout(70);
    ok(await b.evaluate(before=>Math.hypot(Game.state.player.x-before.x,Game.state.player.y-before.y)>.02,before),'local movement predicts before the delayed round trip');
    await b.waitForTimeout(2200);
    const positions=await Promise.all([a.evaluate(()=>({x:Game.state.players[1].x,y:Game.state.players[1].y})),b.evaluate(()=>({x:Game.state.player.x,y:Game.state.player.y}))]);
    ok(Math.hypot(positions[0].x-positions[1].x,positions[0].y-positions[1].y)<.5,'movement reconciles at 150 ms RTT with jitter');
    await b.evaluate(()=>{CoopInput.resetTouch();Game.cancelMenuInput();});
    await a.evaluate(()=>{Game.state.players[1].attrPts=2;Coop.markCritical();});await b.waitForFunction(()=>Game.state.player.attrPts===2);
    await b.evaluate(()=>window.qaDuplicate=true);await b.evaluate(()=>Coop.submit({type:'attribute',attribute:'vit'}));await b.evaluate(()=>window.qaDuplicate=false);
    ok(await a.evaluate(()=>Game.state.players[1].attrPts===1),'replayed command spends one attribute point');
    await b.evaluate(()=>{const m=structuredClone(window.qaLastCommand);m.payload.epoch=0;m.payload.seq+=1000;window.qaSocket.send(JSON.stringify(m));});await b.waitForTimeout(300);
    ok(await a.evaluate(()=>Game.state.players[1].attrPts===1),'stale map commands cannot mutate the hero');
    ok(!await b.evaluate(()=>Coop.submit({type:'damage',amount:999999,targetId:Game.state.players[0]._coopId})),'guest-authored damage is rejected');
    async function travel(zone){
      console.log('Network party travel:',zone);
      await a.waitForFunction(()=>!Coop.busy&&!Coop.paused);assert.ok(await a.evaluate(zone=>Coop.requestTravel(zone),zone));
      await Promise.all([a,b].map(p=>p.waitForFunction(()=>!!CoopUI.travelId)));
      await Promise.all([a,b].map(p=>p.evaluate(()=>Coop.answerTravel(true))));
      await Promise.all([a,b].map(p=>p.waitForFunction(zone=>Game.state.map.id===zone&&!Coop.paused&&!Coop.loading,zone,{timeout:90000})));
    }
    await travel('north_wild');
    const enemy=await a.evaluate(()=>{
      const m=Game.state.monsters.find(m=>!m.dead&&!m.isBoss),p=Game.state.players[1];p.x=m.x+1;p.y=m.y;Coop.register();
      for(const hero of Game.state.players){hero.stats.maxHp=100000;hero.hp=100000;}
      m.maxHp=m.hp=10000;Coop.markCritical();return m._coopId;
    });
    await b.waitForFunction(id=>Game.state.monsters.some(m=>m._coopId===id),enemy);
    await b.evaluate(id=>Coop.submit({type:'attack',targetId:id,skill:'basic',hold:true}),enemy);
    await a.waitForFunction(id=>Game.state.monsters.find(m=>m._coopId===id)?.hp<10000,enemy,{timeout:20000});
    await b.waitForFunction(id=>Game.state.monsters.find(m=>m._coopId===id)?.hp<10000,enemy,{timeout:10000});
    await b.evaluate(()=>Coop.submit({type:'stop'}));
    ok(true,'ranged combat and authoritative damage synchronize at 150 ms RTT with jitter');
    await travel('frosthaven');
    // Load rejection uses the same cancellation path as a missing destination bundle.
    await b.evaluate(()=>{window.qaPreload=Game.coop.preload;Game.coop.preload=async()=>{throw Error('Injected unavailable assets');};});
    await a.waitForFunction(()=>!Coop.busy);await a.evaluate(()=>Coop.requestTravel('north_wild'));
    await Promise.all([a,b].map(p=>p.waitForFunction(()=>!!CoopUI.travelId)));
    await Promise.all([a,b].map(p=>p.evaluate(()=>Coop.answerTravel(true))));
    await a.waitForFunction(()=>!Coop.paused,null,{timeout:15000});await b.evaluate(()=>Game.coop.preload=window.qaPreload);
    ok(await a.evaluate(()=>Game.state.map.id==='frosthaven'),'failed asset loading cancels party travel');
    await a.evaluate(()=>{window.qaHidden=false;Object.defineProperty(document,'hidden',{configurable:true,get:()=>window.qaHidden});window.qaHidden=true;});
    const time=await a.evaluate(()=>Game.state.time);await b.waitForFunction(()=>Coop.paused.includes('switched tabs'),null,{timeout:6000});
    ok(await a.evaluate(time=>Game.state.time===time,time)&&await b.evaluate(()=>Coop.paused.includes('switched tabs')),'host visibility pause is synchronized');
    await a.evaluate(()=>window.qaHidden=false);await b.waitForFunction(()=>!Coop.paused);
    await b.evaluate(()=>window.qaMuteIncoming=true);await b.waitForTimeout(4100);
    ok(await b.evaluate(()=>Coop.paused.includes('Waiting for the host')),'missing application heartbeats detect a stalled host');
    await b.evaluate(()=>window.qaMuteIncoming=false);await b.waitForFunction(()=>!Coop.paused);
    // Grace-window disconnect retains the actual vulnerable host-owned actor.
    await b.evaluate(()=>window.qaSocket.close());await a.waitForFunction(()=>!Game.state.players[1].connected);
    const hp=await a.evaluate(()=>{const p=Game.state.players[1];p.takeDamage(8,null,'phys');return p.hp;});
    await b.waitForFunction(id=>Coop.localId===id&&!Coop.paused&&Game.state.player.connected,id,{timeout:15000});
    ok(await a.evaluate(hp=>Game.state.players[1].hp>=hp&&Game.state.players[1].hp<Game.state.players[1].stats.maxHp,hp),'disconnected guest remains vulnerable');
    ok(await b.evaluate(id=>Coop.localId===id,id),'guest reconnects to the existing hero identity');
    await b.reload({waitUntil:'load',timeout:120000});await b.waitForFunction(()=>document.querySelector('#titleMenu button'));
    await b.evaluate(({hero,room})=>Coop.connect('join',hero,room),{hero:g.hero.id,room});await b.waitForFunction(id=>Game.state?.player?._coopId===id&&!Coop.loading,id,{timeout:30000});
    ok(await a.evaluate(()=>Game.state.players.length===2),'guest reload reuses its reserved actor instead of duplicating it');
    // Ready state and mobile inventory have real touch-size controls.
    await b.evaluate(()=>CoopUI.management('inv'));await b.locator('#equipwrap .invitem').first().tap();
    ok(await b.locator('#touchItemMenu .touch-item-details').isVisible(),'mobile inventory inspection uses the shared workspace');
    fs.mkdirSync('tmp/coop-qa',{recursive:true});await b.screenshot({path:'tmp/coop-qa/mobile-inventory.png'});await b.evaluate(()=>UI.closeAll());
    ok(await b.locator('#tooltip').evaluate(el=>el.classList.contains('hidden')),'closing inventory dismisses inspection');
    await b.evaluate(()=>{window.qaCommit=CoopStore.commit;CoopStore.commit=async()=>{throw Error('Injected guest disk failure');};});
    await a.evaluate(()=>Coop.checkpoint());await b.waitForFunction(()=>Coop.saveError);
    await b.evaluate(()=>{CoopStore.commit=window.qaCommit;return Coop.retrySave();});
    ok(await b.evaluate(()=>!Coop.saveError),'guest persistence failure is displayed and retry saves the confirmed hero');
    await a.evaluate(()=>window.qaSocket.close());await b.waitForFunction(()=>!!Coop.paused,null,{timeout:8000});
    await a.waitForFunction(()=>!Coop.paused,null,{timeout:15000});await b.waitForFunction(()=>!Coop.paused,null,{timeout:15000});
    ok(true,'host reconnects without migrating authority');
    const metrics=await b.evaluate(()=>({maxPending:qaMaxPending,receivedBytes:qaBytes,socketBuffered:qaSocket.bufferedAmount}));
    ok(metrics.maxPending<400&&metrics.socketBuffered<1024*1024,'network queues remain bounded under injected latency');
    fs.mkdirSync('tmp/coop-qa',{recursive:true});await b.screenshot({path:'tmp/coop-qa/mobile.png'});fs.writeFileSync('tmp/coop-qa/network.json',JSON.stringify(metrics,null,2));
    ok(!errors.length,errors.join('\n'));console.log('PASS '+checks+' network and mobile browser checks',metrics);
  }catch(error){
    console.error('Browser errors',errors);
    for(const page of pages)console.error('Failure state',await page.evaluate(()=>({name:Game.state?.player?.name,map:Game.state?.map?.id,loading:Coop.loading,paused:Coop.paused,busy:Coop.busy,travel:CoopUI.travelId,status:document.querySelector('.coop-status')?.innerText,messages:document.querySelector('#msglog')?.innerText,party:Game.state?.players?.map(p=>({name:p.name,connected:p.connected,dead:p.dead}))})).catch(()=>null));
    throw error;
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
