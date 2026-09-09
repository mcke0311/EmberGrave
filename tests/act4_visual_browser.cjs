// Production scenes and cache checks, with isolated preview saves.
const {chromium}=require('playwright');
const fs=require('node:fs');
const phase=process.argv[2]||'after';
const root='http://127.0.0.1:8741/';
const out='tests/qa/act4_visual';
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const page=await browser.newPage({viewport:{width:1920,height:1200}}),errors=[],rows=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(root+'tests/cathedral_review.html');
  await page.waitForFunction(()=>['passed','failed'].includes(document.body.dataset.testStatus),null,{timeout:120000});
  if(await page.locator('#error').innerText())throw Error(await page.locator('#error').innerText());
  for(const zone of ['cathedral1','cathedral2','cathedral_cinderwatch','cathedral_bastion']){
   await page.evaluate(zone=>cathedralReview.load('after',zone),zone);
   const views=zone==='cathedral1'?['arrival','nave','cinderwatch','boss']:zone==='cathedral2'?['arrival','ritual_0','boss']:['arrival','memory','sanctuary'];
   for(const view of views){
    const data=await page.evaluate(view=>{const r=cathedralReview;r.showView(view);return r.win.document.getElementById('view').toDataURL('image/webp',.94);},view);
    fs.writeFileSync(`${out}/${phase}_${zone}_${view}.webp`,Buffer.from(data.split(',')[1],'base64'));
   }
   const sample=await page.evaluate(()=>cathedralReview.sample('moving'));rows.push({zone,width:1920,mode:'moving',...sample});
   console.log(phase+' '+zone+' captured; movement CPU '+JSON.stringify(sample.cpuMs));
  }
  if(phase!=='before'){
   for(const zone of ['cathedral1','cathedral2','cathedral_cinderwatch','cathedral_bastion']){
    await page.evaluate(async zone=>{document.getElementById('width').value='3840';await cathedralReview.load('after',zone);},zone);
    for(const view of ['arrival',zone.startsWith('cathedral_')?'sanctuary':'boss']){
     const data=await page.evaluate(view=>{const r=cathedralReview;r.showView(view);return r.win.document.getElementById('view').toDataURL('image/webp',.94);},view);
     fs.writeFileSync(`${out}/${phase}_${zone}_${view}_4k.webp`,Buffer.from(data.split(',')[1],'base64'));
    }
    const sample=await page.evaluate(()=>cathedralReview.sample('combat'));rows.push({zone,width:3840,mode:'combat',...sample});
    console.log('4K '+zone+' combat CPU '+JSON.stringify(sample.cpuMs));
   }
   await page.goto(root+'tests/cathedral_terrain_pixels.html');
   await page.waitForFunction(()=>['passed','failed'].includes(document.body.dataset.testStatus),null,{timeout:120000});
   const pixels=await page.evaluate(()=>cathedralPixelReport);
   fs.writeFileSync(`${out}/pixels.json`,JSON.stringify(pixels,null,2));
   if(pixels.status!=='PASS')throw Error(pixels.error);
   console.log('PASS cached/fresh terrain pixels: '+pixels.rows.length);
  }
  fs.writeFileSync(`${out}/${phase}_report.json`,JSON.stringify({status:errors.length?'FAIL':'PASS',errors,rows},null,2));
  if(errors.length)throw Error(errors.join('\n'));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
