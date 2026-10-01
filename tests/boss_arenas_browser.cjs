// Real game loop, rendering, UI and travel in an isolated browser save store.
const {chromium}=require('playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
const selected=process.argv.find(x=>x.startsWith('--width='))?.slice(8),widths=selected?[+selected]:[1920,3840,844];
const onlyBoss=process.argv.find(x=>x.startsWith('--boss='))?.slice(7);
const out=process.argv.find(x=>x.startsWith('--output-dir='))?.slice(13)||'tests/qa/boss_arenas';fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-background-timer-throttling']}),report={browser:browser.version(),errors:[],encounters:[],integration:[]};
 try{
  for(const width of widths){
   const page=await browser.newPage({viewport:{width:width+32,height:Math.round(width*9/16)+350},reducedMotion:width===844?'reduce':'no-preference',hasTouch:width===844});
   page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()===404)report.errors.push('Missing '+r.url());});
   await page.goto('http://localhost:8741/tests/boss_encounters.html');await page.waitForFunction(()=>window.bossQA,null,{timeout:120000});
   await page.evaluate(width=>{const f=bossQA.frame;f.style.width=width+'px';f.style.height=Math.round(width*9/16)+'px';bossQA.setPaused(true);},width);
   for(const id of (onlyBoss?[onlyBoss]:['korvath','mire_mother','azram','empty_archangel','malthoron','vethriss'])){
    const result=await page.evaluate(async({id,width})=>{
      const q=bossQA,{Game:G,DATA:D,U}=q.api,{boss:m,player:p,state:s}=await q.setup(id,'vanguard',0,true);q.setPaused(true);G.debugFlags.god=false;
      document.getElementById('pilot').checked=true;const e=m.encounter,events=[];let phase=-1,ward=false;
      if(id==='malthoron'&&!s.map.props.find(p=>p.storyId==='hell_portal')?.hidden)throw Error('Hell portal appeared before victory');
      const capture=tag=>({tag,image:q.frame.contentWindow.document.getElementById('view').toDataURL('image/webp',.9)});
      const images=[capture('entrance')];let t=0;
      for(;t<480&&!m.dead&&!p.dead;t+=.5){q.advance(.5,.05);if(e.active&&e.phase!==phase){phase=e.phase;events.push({phase,time:t,hp:m.hp});images.push(capture('phase'+phase));}if(e.mechanic&&!ward){images.push(capture('counter'+phase));ward=true;}if(!e.mechanic)ward=false;}
      images.push(capture(m.dead?'victory':'failed'));document.getElementById('pilot').checked=false;
      if(!m.dead||p.dead)throw Error(id+' playthrough failed at '+t+' seconds');
      if(e.arena.sealed||e.attack||e.mechanic||e.owned.length||e.pools.length)throw Error('Victory cleanup failed');
      if(id==='malthoron'){const portal=s.map.props.find(p=>p.storyId==='hell_portal');if(portal.hidden||portal.visual!=='cathedral_hell_portal')throw Error('Victory must reveal the existing Hell portal artwork');}
      return {boss:id,width,reducedMotion:width===844,seconds:t,won:m.dead,hp:p.hp,healingLeft:p.belt[0]?.count||0,aetherLeft:p.belt[1]?.count||0,events,images,errors:q.frame.contentWindow.bossErrors};
    },{id,width});
    for(const shot of result.images)fs.writeFileSync(`${out}/${id}_${width}_${shot.tag}.webp`,Buffer.from(shot.image.split(',')[1],'base64'));delete result.images;
    report.encounters.push(result);report.errors.push(...result.errors);console.log('PASS full rendered encounter',id,width,result.seconds);
   }
   if(width===844){
    const touch=await page.evaluate(async()=>{
      const q=bossQA,{Game:G,U}=q.api,{boss:m,player:p}=await q.setup('azram','vanguard',1);q.setPaused(true);G.debugFlags.god=true;
      const d=m.encounter.arena.devices.find(d=>d.required);p.x=d.x;p.y=d.y+2.5;G.__bossReview.updateCamera(5);q.render();
      const cam=G.__bossReview.camera,view=q.frame.contentWindow.document.getElementById('view'),r=view.getBoundingClientRect();
      G.touchTap(r.left+(U.isoX(d.x,d.y)-cam.x)*r.width/view.width,r.top+(U.isoY(d.x,d.y)-cam.y-60)*r.height/view.height);
      const queued=p.command?.obj===d;q.advance(.7,.025);G.__bossReview.updateCamera(5);q.render();
      const nextCam=G.__bossReview.camera;
      G.touchTap(r.left+(U.isoX(d.x,d.y)-nextCam.x)*r.width/view.width,r.top+(U.isoY(d.x,d.y)-nextCam.y-60)*r.height/view.height);
      q.advance(4,.025);
      if(!queued||m.encounter.mechanic?.blocksDamage)throw Error('Two taps did not walk to, turn and reflect the marked mirror');return {touch:true,queued,counterComplete:true};
    });report.integration.push(touch);
    const combatTouch=await page.evaluate(async()=>{
      const q=bossQA,{Game:G,SpriteAssets:S,U}=q.api,checks=[];
      const tap=actor=>{
        G.__bossReview.updateCamera(5);q.render();
        const cam=G.__bossReview.camera,view=q.frame.contentWindow.document.getElementById('view'),rect=view.getBoundingClientRect();
        const g=S.actorGeometry(actor.spriteOpts,actor.pose(),U.isoX(actor.x,actor.y)-cam.x,U.isoY(actor.x,actor.y)-cam.y,1.1);
        for(let y=Math.max(1,g.top);y<Math.min(view.height-1,g.bottom);y+=5)for(let x=Math.max(1,g.left);x<Math.min(view.width-1,g.right);x+=5){
          if(!S.hitTestGeometry(g,x,y))continue;
          G.touchTap(rect.left+x*rect.width/view.width,rect.top+y*rect.height/view.height);
          if(G.state.player.command?.target===actor)return true;
        }
        return false;
      };
      let v=await q.setup('malthoron','vanguard',1);q.setPaused(true);G.debugFlags.god=true;
      const soul=v.boss.encounter.owned.find(m=>m.encounterKind==='boundSoul');
      Object.assign(v.player,{x:soul.x+.8,y:soul.y+.8,skillL:'basic'});
      const hp=soul.hp;if(!tap(soul))throw Error('Touch cannot select the bound soul');q.advance(.9,.025);
      if(soul.hp>=hp)throw Error('Touch-selected soul cannot be hit in melee');checks.push('touch selects and damages a bound soul with a basic melee attack');
      v=await q.setup('vethriss','vanguard',1);q.setPaused(true);G.debugFlags.god=true;
      const e=v.boss.encounter;e.start('decoys',v.player);e.execute();q.advance(.25,.025);
      Object.assign(v.player,{x:v.boss.x+.8,y:v.boss.y+.8,skillL:'basic'});
      if(!tap(v.boss))throw Error('Touch cannot select the real serpent');q.advance(.9,.025);
      if(e.mechanic?.kind==='illusion'||!e.counterEvents.some(c=>c.kind==='trueSerpent'))throw Error('Touch-selected basic attack did not identify the real serpent');
      checks.push('touch selects the real body and interrupts the illusion under reduced motion');
      return {touch:true,reducedMotion:true,checks};
    });report.integration.push(combatTouch);
   }
   if(width===1920){
    const integration=await page.evaluate(async()=>{
      const q=bossQA,{Game:G,DATA:D}=q.api,checks=[];const ok=(v,label)=>{if(!v)throw Error(label);checks.push(label);};
      let v=await q.setup('malthoron','vanguard',0,true);q.setPaused(true);document.getElementById('pilot').checked=false;
      await G.enterMap('cathedral2','default');let s=G.state;const parent=s.map;parent.reviewMarker='same instance';const parentMonsters=s.monsters;
      delete s.quests.q17;ok(!await G.enterMap('arena_malthoron','default'),'prerequisites checked before entry');ok(s.map===parent,'failed entry preserves parent');s.quests.q17={state:'done'};
      ok(await G.enterMap('arena_malthoron','default'),'arena loads');ok(await G.enterMap('cathedral2','from_arena',{reuseCachedMap:true}),'return opens');ok(s.map===parent&&s.monsters.length===parentMonsters.length,'Cathedral parent instance retained');
      await G.enterMap('arena_malthoron','default');const original=s.arenaParents.arena_malthoron;G.castPortal();ok(await G.usePortal(),'vestibule portal goes home');
      await G.enterMap('cathedral2','default');ok(s.map!==parent,'independent Cathedral visit shifts');
      await G.enterMap('frosthaven','default');await G.usePortal(); // return through the arena portal from its actual home
      if(s.map.id!=='arena_malthoron'){await G.enterMap(s.portal.home||s.home,'default');ok(await G.usePortal(),'return to vestibule portal');}
      await G.enterMap('cathedral2','from_arena',{reuseCachedMap:true});ok(s.map===original.map,'arena remembers original parent across regeneration');
      v=await q.setup('korvath','vanguard');q.setPaused(true);s=v.state;const p=v.player,e=v.boss.encounter;p.gold=1000;p.belt[0].count=3;
      e.pools.push({kind:'circle',x:p.x,y:p.y,radius:2,ttl:5,tick:1});e.wave(['barb_guard']);
      const frozen=JSON.stringify({time:s.time,hp:v.boss.hp,stage:e.stage,timer:e.timer,pools:e.pools});q.render();q.render();ok(JSON.stringify({time:s.time,hp:v.boss.hp,stage:e.stage,timer:e.timer,pools:e.pools})===frozen,'paused rendering preserves simulation');
      ok(!await G.enterMap('frosthaven','default'),'combat travel blocked');G.castPortal();ok(!s.portal,'combat portal blocked');
      G.onPlayerDeath();ok(G.canRetryArena(),'death offers arena retry');ok(p.gold===900&&p.belt[0].count===3,'death penalty and supplies retained');
      const loader=q.api.SpriteAssets.loadBundle;q.api.SpriteAssets.loadBundle=async()=>{throw Error('Expected arena preload failure');};
      try{ok(!await G.retryBossArena(),'failed preload preserves retry');}finally{q.api.SpriteAssets.loadBundle=loader;}
      ok(p.dead&&G.canRetryArena(),'failed retry keeps death checkpoint');ok(await G.retryBossArena(),'retry succeeds');
      ok(!p.dead&&p.hp===p.stats.maxHp&&p.mana===p.stats.maxMana,'retry restores resources');ok(p.gold===900&&p.belt[0].count===3,'retry does not refund supplies or penalty');
      ok(!e.active&&!e.mechanic&&!e.arena.sealed&&v.boss.hp===v.boss.maxHp&&e.owned.length===0&&s.projectiles.length===0,'retry clears attempt');
      G.saveGame();const slot=G.listSaves()[0].slot,raw=JSON.parse(q.frame.contentWindow.localStorage.getItem(slot));ok(!raw.bossCheckpoint&&!raw.arenaParents,'arena checkpoint remains session local');await G.loadGame(slot);ok(!G.state.map.zone.arena,'reload returns to existing hub flow');
      for(const [id,reward,parentZone]of [['mire_mother','mire_shard','ritual_site'],['azram','fortress_map','khal_palace'],['malthoron','hell_portal','cathedral2']])for(const collected of [false,true]){
        await q.setup(id,'vanguard',0,true);q.setPaused(true);s=G.state;s.flags['dead_'+id]=true;s.flags['dead_'+id+'@0']=true;
        if(collected)D.CAMPAIGN.record(s,{kind:'interact',zone:parentZone,target:reward});G.saveGame();await G.loadGame(G.listSaves()[0].slot);
        ok(await G.enterMap(D.BOSS_ARENAS[id].zone,'default'),'legacy reward arena loads');s=G.state;
        ok(!s.monsters.some(m=>m.defId===id&&!m.dead),'legacy defeated boss stays dead');const prop=s.map.props.find(p=>p.storyId===reward);ok(prop,'legacy reward remains reachable');
        if(reward!=='hell_portal')ok(!!prop.interact===!collected,'legacy collected reward stays unique');else ok(prop.interact==='story','Hell portal remains usable');
      }
      return {checks};
    });report.integration.push(integration);
   }
   await page.close();
  }
  assert.deepEqual(report.errors,[]);fs.writeFileSync(`${out}/browser${selected?'_'+selected:''}${onlyBoss?'_'+onlyBoss:''}.json`,JSON.stringify(report,null,2)+'\n');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
