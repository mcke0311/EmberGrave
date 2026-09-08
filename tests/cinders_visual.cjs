// Production renderer checks, with temporary heroes and in-memory saves.
const {chromium}=require('playwright'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1600,height:1100}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8875/tests/cinders_review.html?zone=throne');
  await page.waitForFunction(()=>window.cindersReview,{timeout:120000});
  const report=await page.evaluate(async()=>{
   const r=window.cindersReview,shots=[],fading=[];
   async function shot(name){
    r.game.__cinders.render();const cv=r.win.document.getElementById('view');
    const res=await fetch('/api/cinders-review',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:name+'.webp',png:cv.toDataURL('image/webp',.94)})});
    if(!res.ok)throw Error('Capture failed');shots.push(name+'.webp');
   }
   for(const width of [1920,3840]){
    document.getElementById('width').value=width;await r.load('after','throne');
    document.getElementById('view').value='boss';r.showView();
    const g=r.game,p=g.state.player,b=g.state.monsters.find(m=>m.defId==='vethriss'),e=b.encounter;
    for(const [phase,attack] of [[0,'cleave'],[1,'lunge'],[2,'memory']]){
     e.active=true;if(phase)e.phaseChange(phase);e.start(attack,p);e.timer=e.attack.windup*.5;e.setArt();
     if(e.stage!=='windup'||!e.attack.shapes.length)throw Error('Boss warning missing');
     await shot(`throne_${width}_warning_phase${phase+1}`);
    }
   }
   for(const zone of ['ash_wastes','cinder_bastion','throne','hellgate']){
    document.getElementById('width').value=1920;await r.load('after',zone);
    const a=r.win.eval('SpriteAssets'),draw=a.drawFrame,N=r.api.TerrainNavigation,U=r.api.U;
    const props=r.map.props.filter(p=>p.building&&(p.artZone==='cinders'||p.type==='cinders_breach_gate'));
    for(const pr of props){
     const id=a.maps.props[(pr.artZone||zone)+'_'+pr.type]||a.maps.props[pr.type],f=a.getFrame(id,0);
     let behind=null;
     for(let d=2;d<10&&!behind;d+=.5)for(const side of [-2,0,2]){
      const p={x:pr.x-d+side,y:pr.y-d-side},dx=U.isoX(p.x,p.y)-U.isoX(pr.x,pr.y),dy=U.isoY(p.x,p.y)-U.isoY(pr.x,pr.y)-24;
      if(N.clear(r.map,p.x,p.y,.36)&&Math.abs(dx)<f.sw*.42&&dy>-f.anchorY&&dy<0){behind=p;break;}
     }
     // Scenery backed by solid peripheral terrain cannot occlude a walking hero.
     if(!behind){fading.push({zone,type:pr.type,behind:'inaccessible terrain'});continue;}
     const alphas=[];a.drawFrame=function(ctx,frame,x,y,opts){if(frame.image===f.image&&frame.sx===f.sx&&frame.sy===f.sy)alphas.push(opts?.alpha);return draw.apply(this,arguments);};
     try{r.game.__cinders.place(behind.x,behind.y);r.game.__cinders.render();}finally{a.drawFrame=draw;}
     if(!alphas.includes(.4))throw Error('Architecture did not fade '+pr.type+': '+alphas);
     fading.push({zone,type:pr.type,alpha:.4});
     if(pr.gate)await shot(`${zone}_${pr.type}_hero_behind`);
    }
   }
   await r.load('after','throne');document.getElementById('view').value='boss';r.showView();
   const g=r.game,p=g.state.player,b=g.state.monsters.find(m=>m.defId==='vethriss');g.state.quests.q18={state:'active'};
   for(let i=0;i<3;i++){b.takeDamage(1e9,p);g.__cinders.update(1/60);}
   if(!b.dead||!g.state.flags['dead_vethriss@0'])throw Error('Vethriss defeat failed');
   return {status:'PASS',fading,shots,defeat:{bossDead:b.dead,flag:g.state.flags['dead_vethriss@0'],q18:g.state.quests.q18.state}};
  });
  if(errors.length)throw Error(errors.join('\n'));
  fs.writeFileSync('tests/qa/cinders/visual.json',JSON.stringify({...report,browser:browser.version()},null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
