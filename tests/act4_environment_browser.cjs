// Current-workspace before/after review; production renderer, isolated saves.
const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const phase=process.argv[2]||'after';
const qa='tests/qa/act4_environment';
const zones=['cathedral1','cathedral2','cathedral_cinderwatch','cathedral_bastion'];
if(phase==='compare'){
 const before=JSON.parse(fs.readFileSync(path.join(qa,'before_performance.json'))).rows;
 const after=JSON.parse(fs.readFileSync(path.join(qa,'after_performance.json'))).rows;
 const rows=after.map(a=>{const b=before.find(b=>b.zone===a.zone&&b.width===a.width&&b.mode===a.mode);if(!b)throw Error('Missing baseline');
  return {zone:a.zone,width:a.width,mode:a.mode,before:b.cpuMs,after:a.cpuMs,passed:['median','p95'].every(k=>a.cpuMs[k]<=b.cpuMs[k]*1.1)};});
 const passed=rows.length===16&&rows.every(r=>r.passed),report={status:passed?'PASS':'FAIL',method:'Three production samples per zone/resolution/workload, 60 warm-up and 180 measured frames; current-workspace baseline; median and p95 limit 10%.',rows};
 fs.writeFileSync(path.join(qa,'performance.json'),JSON.stringify(report,null,2)+'\n');console.log(report.status+' '+rows.length+' performance comparisons');process.exit(passed?0:1);
}
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding']});
 const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[],rows=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')console.error(m.text());});
 if(phase==='before')await page.route('**/tests/cathedral_review.html',async route=>{
  const response=await route.fetch();let html=await response.text();
  html=html.replace("const prefix=version===", "const prefix=version==='after'?'tmp/act4_environment/before/':version===");
  await route.fulfill({response,body:html});
 });
 try{
  if(phase==='review'){
   await page.goto('http://127.0.0.1:8744/tests/act4_environment_review.html');
   await page.waitForFunction(()=>document.getElementById('status').textContent.startsWith('PASS'));
   for(const zone of zones)for(const width of [1920,3840]){
    await page.selectOption('#zone',zone);await page.selectOption('#width',String(width));
    await page.evaluate(async width=>{for(const id of ['before','after']){const img=document.getElementById(id);await img.decode();if(img.naturalWidth!==width)throw Error('Incorrect scene resolution');}},width);
   }
   console.log('PASS review page: all four locations at both resolutions');return;
  }
  await page.goto('http://127.0.0.1:8744/tests/cathedral_review.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>['passed','failed'].includes(document.body.dataset.testStatus),null,{timeout:180000});
  if(await page.locator('#error').innerText())throw Error(await page.locator('#error').innerText()+'\n'+await page.evaluate(()=>[...document.querySelectorAll('iframe')].map(f=>f.contentDocument.getElementById('appFatalDetail')?.textContent).join('\n')));
  if(phase==='interaction'){
   const checks=[];
   for(const zone of zones){
    await page.evaluate(zone=>cathedralReview.load('after',zone),zone);
    const targets=await page.evaluate(()=>cathedralReview.map.exits.map(e=>e.target));
    for(const target of targets)for(const click of ['opening','label']){
     await page.evaluate(zone=>cathedralReview.load('after',zone),zone);
     await page.evaluate(({target,click})=>{
      const r=cathedralReview,G=r.game,m=G.state.map,e=m.exits.find(e=>e.target===target),t=m.thresholds.find(t=>t.id===e.thresholdId),p=t.approach;
      G.__cathedral.place(p.x,p.y);G.__cathedral.render();
      const canvas=r.win.document.getElementById('view'),rect=canvas.getBoundingClientRect(),U=r.api.U;
      const sx=U.isoX(t.opening.x,t.opening.y)-U.isoX(p.x,p.y)+canvas.width/2;
      const sy=U.isoY(t.opening.x,t.opening.y)-U.isoY(p.x,p.y)+canvas.height/2+20-(click==='label'?t.opening.height+20:60);
      const opts={clientX:rect.left+sx*rect.width/canvas.width,clientY:rect.top+sy*rect.height/canvas.height,button:0,bubbles:true};
      canvas.dispatchEvent(new r.win.MouseEvent('mousemove',opts));canvas.dispatchEvent(new r.win.MouseEvent('mousedown',opts));
      r.win.dispatchEvent(new r.win.MouseEvent('mouseup',opts));
     },{target,click});
     await page.waitForFunction(target=>cathedralReview.game.state.map.id===target,target,{timeout:30000});
     checks.push({zone,target,click});
    }
   }
   fs.writeFileSync(path.join(qa,'interaction.json'),JSON.stringify({status:'PASS',checks},null,2)+'\n');console.log('PASS '+checks.length+' real opening/label click transitions');return;
  }
  for(const width of phase==='pilot'?[1920]:[1920,3840])for(const zone of zones){
   await page.evaluate(async({width,zone})=>{document.getElementById('width').value=width;await cathedralReview.load('after',zone);},{width,zone});
   const views=await page.locator('#view option').evaluateAll(os=>os.map(o=>o.value).filter(v=>v!=='center'));
   for(const view of views){
    const data=await page.evaluate(view=>{const r=cathedralReview;r.showView(view);return r.win.document.querySelector('canvas').toDataURL('image/webp',.92);},view);
    fs.writeFileSync(path.join(qa,`${phase}_${zone}_${width}_${view.replaceAll(':','_')}.webp`),Buffer.from(data.split(',')[1],'base64'));
   }
   // Include every passage even when it is away from the room's camera anchor.
   const exits=await page.evaluate(()=>cathedralReview.map.exits.map(e=>({x:(e.x0+e.x1)/2,y:(e.y0+e.y1)/2,target:e.target})));
   for(const e of exits){
    const data=await page.evaluate(e=>{const r=cathedralReview;r.game.__cathedral.place(e.x,e.y+3);r.game.__cathedral.render();return r.win.document.querySelector('canvas').toDataURL('image/webp',.92);},e);
    fs.writeFileSync(path.join(qa,`${phase}_${zone}_${width}_exit_${e.target}.webp`),Buffer.from(data.split(',')[1],'base64'));
   }
   for(const mode of phase==='pilot'?[]:['moving','combat']){
    const samples=[];
    for(let i=0;i<3;i++){
     await page.evaluate(async({zone})=>cathedralReview.load('after',zone),{zone});
     samples.push(await page.evaluate(mode=>cathedralReview.sample(mode),mode));
    }
    const cpuMs=Object.fromEntries(['median','p95'].map(k=>[k,samples.reduce((n,s)=>n+s.cpuMs[k],0)/samples.length]));
    rows.push({zone,width,mode,cpuMs,samples});
   }
   console.log(phase+' '+zone+' '+width+' captured and profiled');
  }
  fs.writeFileSync(path.join(qa,phase+'_performance.json'),JSON.stringify({rows,errors},null,2)+'\n');
  if(errors.length)throw Error(errors.join('\n'));
 }finally{await browser.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
