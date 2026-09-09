// Real production canvas input, through every rebuilt passage. In-memory saves.
const {chromium}=require('playwright'),fs=require('node:fs');
const out='tests/qa/act5_environment';
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1600,height:1100}}),errors=[],missing=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()===404)missing.push(r.url());});
  await page.goto('http://127.0.0.1:8879/tests/act5_environment_review.html?zone=hellgate');
  await page.waitForFunction(()=>window.cindersReview,{timeout:120000});
  const captures=[];
  for(const width of [1920,3840])for(const zone of ['hellgate','ash_wastes','cinder_bastion','throne']){
   const shots=await page.evaluate(async({zone,width})=>{
    document.querySelector('#width').value=width;const r=cindersReview;await r.load('after',zone);
    const g=r.game,m=g.state.map,cv=r.win.document.getElementById('view'),result=[];
    for(const t of m.thresholds)for(const view of ['arrival','foreground']){
     const pos=view==='arrival'?t.arrival:t.axis?{x:t.x+1,y:t.y}:{x:t.x,y:t.y-1};
     if(!r.api.TerrainSurface.supported(m,pos.x,pos.y,.36))throw Error('Unsupported review position');
     g.__cinders.place(pos.x,pos.y);g.__cinders.render();
     result.push({name:zone+'_'+t.id+'_'+width+'_'+view+'.webp',image:cv.toDataURL('image/webp',.94)});
    }
    return result;
   },{zone,width});
   for(const shot of shots){fs.writeFileSync(out+'/'+shot.name,Buffer.from(shot.image.split(',')[1],'base64'));captures.push(shot.name);}
  }
  const connections=await page.evaluate(async()=>{
   const r=cindersReview;await r.load('after','hellgate');const g=r.game,results=[];
   for(const to of ['ash_wastes','cinder_bastion','ash_wastes','throne','ash_wastes','hellgate']){
    const from=g.state.map.id,e=g.state.map.exits.find(e=>e.target===to),t=g.state.map.thresholds.find(t=>t.id===e.thresholdId);
    g.__cinders.place(t.arrival.x,t.arrival.y);g.__cinders.render();
    const cv=r.win.document.getElementById('view'),cam=g.__cinders.camera(),rect=cv.getBoundingClientRect(),o=t.opening,U=r.api.U;
    const x=U.isoX(o.x,o.y)-cam.x,y=U.isoY(o.x,o.y)-g.__cinders.surfaceLift(o.x,o.y)-cam.y-35;
    const geometry=g.__cinders.thresholdGeometry(t,e,cam);
    if(Math.abs(geometry.x-x)>.001||Math.abs(geometry.y-y-35)>.001)throw Error('Opening hit geometry ignores elevation');
    const opts={bubbles:true,button:0,clientX:rect.left+x*rect.width/cv.width,clientY:rect.top+y*rect.height/cv.height};
    cv.dispatchEvent(new r.win.MouseEvent('mousemove',opts));cv.dispatchEvent(new r.win.MouseEvent('mousedown',opts));r.win.dispatchEvent(new r.win.MouseEvent('mouseup',opts));
    let steps=0;
    for(;steps<600&&g.state.map.id!==to;steps++){
     g.__cinders.update(.05);g.__cinders.render();await new Promise(resolve=>setTimeout(resolve,15));
    }
    if(g.state.map.id!==to)throw Error('Click did not travel '+from+' -> '+to+' '+JSON.stringify({p:[g.state.player.x,g.state.player.y],command:g.state.player.command}));
    if(!r.api.TerrainNavigation.clear(g.state.map,g.state.player.x,g.state.player.y,.36))throw Error('Blocked arrival');
    results.push({from,to,status:'PASS',steps});
   }return results;
  });
  if(errors.length)throw Error(errors.join('\n'));
  const report={status:'PASS',browser:browser.version(),connections,captures,errors,missing};
  fs.writeFileSync(out+'/transitions.json',JSON.stringify(report,null,2)+'\n');console.log(report);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
