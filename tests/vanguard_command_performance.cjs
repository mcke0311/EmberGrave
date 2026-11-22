const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const {chromium}=require('playwright');
const {openHero,workspace}=require('./vanguard_command_browser.cjs');

(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try {
    const phone=process.argv.includes('--phone');
    const viewport=phone?{width:740,height:390}:{width:1280,height:720};
    const context=await browser.newContext({viewport,screen:viewport,hasTouch:phone,isMobile:phone});
    const {page,errors}=await openHero(context,async tab=>{
      await tab.addInitScript(()=>{
        let seed=3212026;
        Math.random=()=>((seed=(Math.imul(1664525,seed)+1013904223)>>>0)/4294967296);
      });
      const source=await fs.readFile(path.join(workspace,'js/game.js'),'utf8');
      const hooks=source.replace('    init, newGame, loadGame,','    profileCompany:{update,render,updateCamera,drawActorVisual}, init, newGame, loadGame,')
        .replace(/(function tick\(t\) \{\s*requestAnimationFrame\(tick\);)/,'$1 if(window.manualCompanyFrames)return;');
      assert.ok(hooks.includes('profileCompany:{') && hooks.includes('if(window.manualCompanyFrames)return;'));
      await tab.route('**/js/game.js?*',r=>r.fulfill({contentType:'text/javascript',body:hooks}));
    });
    const result=await page.evaluate(async()=>{
      window.manualCompanyFrames=true;
      const bench=Game.profileCompany,s=Game.state,p=s.player,turn=2*Math.PI;
      const pause=()=>new Promise(resolve=>requestAnimationFrame(resolve));
      function stats(values){
        const sorted=[...values].sort((a,b)=>a-b),pct=q=>+sorted[Math.floor((sorted.length-1)*q)].toFixed(2);
        return {median:pct(.5),p95:pct(.95),total:+values.reduce((a,b)=>a+b,0).toFixed(2)};
      }
      p.lvl=24;p.attr.wil=100;p.skills={recruit_shieldguard:1,recruit_bowman:1,recruit_standard_bearer:1,shieldwall_drill:1,volley_drill:1,coordinated_assault:1};
      p.computeStats();p.mana=p.stats.maxMana;
      const guards=['recruit_shieldguard','recruit_shieldguard','recruit_bowman','recruit_bowman','recruit_standard_bearer'];
      for(const id of guards){
        p.performSkill(id,null,p);for(let i=0;i<55;i++)bench.update(1/60);
      }
      const units=p.companySoldiers();
      const nearby=(dx,dy)=>{
        const x=p.x+dx,y=p.y+dy;
        return MapGen.walkable(s.map,x,y,p.surfaceId)?{x,y}:{x:p.x+.25,y:p.y};
      };
      const foes=[];
      for(let i=0;i<6;i++){
        const at=nearby(1.2+i%3,i%2-.5),foe=new Monster('frost_risen',at.x,at.y);
        foe.surfaceId=p.surfaceId;foe.hp=foe.maxHp=1e6;s.monsters.push(foe);foes.push(foe);
      }
      p.issueFieldOrders(s.monsters.at(-1));p.performSkill('coordinated_assault',s.monsters.at(-1));
      bench.updateCamera(1);const sim=[],frames=[];
      for(let i=0;i<72;i++){
        const start=performance.now();bench.update(1/60);const drawn=performance.now();bench.render();const end=performance.now();
        sim.push(drawn-start);frames.push(end-start);
        if(i%6===5)await pause();
      }
      // Draw the full formation through previously unseen headings and poses.
      // Read a pixel to include deferred GPU work. Count allocations and WebGL submissions
      // only within soldier draws, excluding the hero and the rest of the world.
      const canvas=document.createElement('canvas');canvas.width=400;canvas.height=160;
      const ctx=canvas.getContext('2d',{willReadFrequently:true});
      let canvases=0,webglCalls=0;
      const make=document.createElement,gl=WebGL2RenderingContext.prototype;
      const methods=['drawArrays','drawElements','drawArraysInstanced','drawElementsInstanced','drawRangeElements'];
      const originals=methods.map(name=>gl[name]);
      document.createElement=function(tag,...args){if(tag==='canvas')canvases++;return make.call(this,tag,...args);};
      methods.forEach((name,i)=>{
        gl[name]=function(...args){webglCalls++;return originals[i].apply(this,args);};
      });
      const draws=[],states=['idle','walk','attack','hit','death'];
      try {
        for(const state of states)for(let facing=0;facing<8;facing++)for(let step=0;step<6;step++){
          const start=performance.now(),phase=(step+.25)/6;
          ctx.clearRect(0,0,canvas.width,canvas.height);
          units.forEach((mi,i)=>{
            const pose={state,ang:facing*turn/8,t:state==='idle'?phase*2:phase,ex:{walkPh:turn*phase,speed:3.8}};
            ctx.setTransform(1,0,0,1,45+i*72,119);bench.drawActorVisual(ctx,mi.spriteOpts,pose);
          });
          ctx.resetTransform();ctx.getImageData(45,90,1,1);draws.push(performance.now()-start);
        }
      } finally {
        document.createElement=make;
        methods.forEach((name,i)=>{gl[name]=originals[i];});
      }
      return {units:units.length,foesHit:foes.filter(m=>m.hp<m.maxHp).length,
        frames:stats(frames),simulation:stats(sim),formationDraw:stats(draws),canvases,webglCalls};
    });
    console.log(JSON.stringify(result));
    assert.deepEqual(errors,[]);assert.equal(result.units,5);assert.ok(result.foesHit>0,'the company must fight');
    if(!process.argv.includes('--baseline')){
      assert.equal(result.canvases,0,'soldier draws allocated canvases during play');
      assert.equal(result.webglCalls,0,'soldier draws invoked the 3D renderer during play');
    }
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
