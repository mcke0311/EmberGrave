// Exercise visible gate picking through production DOM input and async travel.
const {chromium}=require('playwright'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1600,height:1100}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8875/tests/cinders_review.html?zone=hellgate');
  await page.waitForFunction(()=>window.cindersReview,{timeout:120000});
  const connections=await page.evaluate(async()=>{
   const r=window.cindersReview,g=r.game,U=r.api.U,results=[];
   for(const to of ['ash_wastes','cinder_bastion','ash_wastes','throne','ash_wastes','hellgate']){
    const from=g.state.map.id,e=g.state.map.exits.find(e=>e.target===to),cx=(e.x0+e.x1)/2,cy=(e.y0+e.y1)/2;
    g.__cinders.place(cx+.5,cy+.5);g.__cinders.render();
    const cv=r.win.document.getElementById('view'),cam=g.__cinders.camera(),rect=cv.getBoundingClientRect();
    const x=U.isoX(cx,cy)-cam.x,y=U.isoY(cx,cy)-g.__cinders.surfaceLift(cx,cy)-cam.y;
    const opts={bubbles:true,button:0,clientX:rect.left+x*rect.width/cv.width,clientY:rect.top+y*rect.height/cv.height};
    cv.dispatchEvent(new r.win.MouseEvent('mousedown',opts));r.win.dispatchEvent(new r.win.MouseEvent('mouseup',opts));
    for(let k=0;k<1200&&g.state.map.id!==to;k++)await new Promise(resolve=>setTimeout(resolve,25));
    if(g.state.map.id!==to)throw Error('Click did not travel '+from+' → '+to);
    if(!r.api.TerrainNavigation.clear(g.state.map,g.state.player.x,g.state.player.y,.36))throw Error('Arrival blocked');
    results.push({from,to,status:'PASS'});
   }
   return results;
  });
  if(errors.length)throw Error(errors.join('\n'));
  const report={status:'PASS',browser:browser.version(),connections,errors};
  fs.writeFileSync('tests/qa/cinders/travel_browser.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
