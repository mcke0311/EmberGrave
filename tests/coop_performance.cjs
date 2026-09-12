const {chromium}=require('playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const base=process.env.COOP_TEST_URL||'http://127.0.0.1:8741';
const count=Number(process.env.COOP_TEST_PLAYERS||2);
const label=process.env.COOP_PROFILE_LABEL||'current';
const hostOnly=process.env.COOP_PROFILE_HOST_ONLY==='1';
(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding']});
  const pages=[],errors=[],runs=[];
  try{
    let code;
    for(let i=0;i<count;i++){
      const context=await browser.newContext({viewport:{width:1280,height:800}}),page=await context.newPage();pages.push(page);
      if(hostOnly&&i)await page.route('**/js/game.js?*',async route=>{
        const source=fs.readFileSync('js/game.js','utf8'),needle='      render();';
        assert.equal(source.split(needle).length,2,'guest render instrumentation must match one main-loop call');
        await route.fulfill({contentType:'application/javascript',body:source.replace(needle,'      // Host-only profile: guest synchronization and presentation continue without drawing.')});
      });
      page.on('pageerror',e=>errors.push(e.message));
      await page.addInitScript(()=>{
        window.qaBytes=0;window.qaMessages=0;
        const Native=WebSocket;
        window.WebSocket=class extends Native{constructor(...args){super(...args);this.addEventListener('message',e=>{qaBytes+=e.data.length;qaMessages++;});}};
        localStorage.setItem('embergrave_options',JSON.stringify({vol:{master:0,music:0,sfx:0}}));
      });
      await page.goto(base,{waitUntil:'load',timeout:120000});
      await page.waitForFunction(()=>document.querySelector('#titleMenu button'),null,{timeout:120000});
      const hero=await page.evaluate(i=>Coop.newHero('Profile '+i,['vanguard','veilranger','gravebinder','wildkeeper'][i]),i);
      await page.evaluate(({i,id,code})=>Coop.connect(i?'join':'host',id,code),{i,id:hero.id,code});
      if(!i)code=await page.evaluate(()=>Coop.room);
      await page.waitForFunction(n=>Game.state?.players.length===n&&!Coop.loading,i+1,{timeout:90000});
      console.log('Connected',i+1);
    }
    await Promise.all(pages.map(p=>p.waitForFunction(n=>Game.state?.players.length===n&&!Coop.loading,count)));
    await pages[0].evaluate(()=>{for(const p of Game.state.players){p.hp=p.stats.maxHp=100000;}});
    for(const page of pages)await page.evaluate(()=>{
      window.qaTimes={};window.qaFrames=[];window.qaBusy=0;window.qaFramesTotal=0;window.qaMeasuring=false;
      function wrap(obj,key){const fn=obj[key];obj[key]=function(...args){if(!qaMeasuring)return fn.apply(this,args);const start=performance.now();try{return fn.apply(this,args);}finally{(qaTimes[key]||=[]).push(performance.now()-start);}};}
      for(const [obj,keys] of [[CoopCodec,['snapshot','apply']],[Game.coop,['update','presentation','refresh']],[CoopUI,['refresh']]])for(const k of keys)wrap(obj,k);
      let previous,lastActor,lastView;window.qaMotion={moving:0,simulationSteps:0,displaySteps:0};
      function frame(t){if(qaMeasuring&&previous){qaFrames.push(t-previous);qaFramesTotal++;if(Coop.busy)qaBusy++;
        const p=Game.state.player,q=Game.renderPosition?Game.renderPosition(p):p;
        if(p.moving&&lastActor&&lastView){qaMotion.moving++;if(Math.hypot(p.x-lastActor.x,p.y-lastActor.y)>1e-5)qaMotion.simulationSteps++;if(Math.hypot(q.x-lastView.x,q.y-lastView.y)>1e-5)qaMotion.displaySteps++;}
        lastActor={x:p.x,y:p.y};lastView={x:q.x,y:q.y};
      }previous=t;requestAnimationFrame(frame);}requestAnimationFrame(frame);
      window.qaStart=()=>{qaFrames=[];qaTimes={};qaBytes=qaMessages=qaBusy=qaFramesTotal=0;qaMotion={moving:0,simulationSteps:0,displaySteps:0};qaMeasuring=true;window.qaTime=Game.state.time;window.qaWall=performance.now();};
      window.qaEnd=()=>{
        qaMeasuring=false;
        const summary=a=>{a.sort((a,b)=>a-b);return {n:a.length,mean:a.reduce((s,n)=>s+n,0)/(a.length||1),p95:a[Math.floor(a.length*.95)]||0,max:a.at(-1)||0};};
        return {name:Game.state.player.name,wallSeconds:(performance.now()-qaWall)/1000,simulationSeconds:Game.state.time-qaTime,frame:summary(qaFrames),motion:qaMotion,busyFrames:qaBusy,totalFrames:qaFramesTotal,bytes:qaBytes,messages:qaMessages,costs:Object.fromEntries(Object.entries(qaTimes).map(([k,a])=>[k,summary(a)]))};
      };
    });
    async function sample(zone,phase){
      await Promise.all(pages.map(p=>p.evaluate(()=>qaStart())));
      await pages[0].waitForTimeout(8000);
      const result=await Promise.all(pages.map(p=>p.evaluate(()=>qaEnd())));runs.push({zone,phase,clients:result});console.log(JSON.stringify(runs.at(-1)));
    }
    await sample('frosthaven','idle');
    await pages[0].waitForFunction(()=>!Coop.busy&&!Coop.paused);
    assert.ok(await pages[0].evaluate(()=>Coop.requestTravel('north_wild','from_camp')));
    await Promise.all(pages.map(p=>p.waitForFunction(()=>!!CoopUI.travelId)));
    await Promise.all(pages.map(p=>p.evaluate(()=>Coop.answerTravel(true))));
    await Promise.all(pages.map(p=>p.waitForFunction(()=>Game.state?.map.id==='north_wild'&&!Coop.loading&&!Coop.paused,null,{timeout:90000})));
    await pages[0].evaluate(()=>{for(const p of Game.state.players){p.hp=p.stats.maxHp=100000;}});
    await sample('north_wild','idle');
    for(const page of pages)await page.evaluate(()=>{
      let t=0;const p=Game.state.player,x=p.x,y=p.y;
      window.qaMove=setInterval(()=>{t+=.18;Coop.submit({type:'steer',point:{x:x+Math.cos(t)*2,y:y+Math.sin(t)*2,surfaceId:0}});},100);
    });
    await sample('north_wild','moving');
    const movement=runs.at(-1).clients[0].motion;
    if(movement.moving>60)assert.ok(movement.displaySteps>=movement.moving*.95,'host movement should advance on at least 95% of displayed moving frames');
    for(const page of pages)await page.evaluate(()=>{clearInterval(qaMove);Coop.submit({type:'stop'});});
    assert.equal(errors.length,0,errors.join('\n'));
    fs.mkdirSync('tmp/coop-qa',{recursive:true});fs.writeFileSync('tmp/coop-qa/performance-'+label+'-'+count+(hostOnly?'-host-only':'')+'.json',JSON.stringify({count,label,hostOnly,runs,errors},null,2));
  }catch(error){for(const page of pages)console.error(await page.evaluate(()=>({map:Game.state?.map.id,paused:Coop.paused,loading:Coop.loading,busy:Coop.busy})).catch(()=>null));throw error;}
  finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
