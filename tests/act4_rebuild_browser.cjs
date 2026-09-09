// Visual regression captures use production rendering and isolated preview saves.
const {chromium}=require('playwright');
const fs=require('node:fs');
const phase=process.argv[2]||'after',out='tests/qa/act4_rebuild';
const scenes={cathedral1:['arrival','nave','cinderwatch','karrhal','boss'],cathedral2:['arrival','ritual_0','ritual_1','boss'],cathedral_cinderwatch:['arrival','memory','sanctuary'],cathedral_bastion:['arrival','memory','sanctuary']};
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[],rows=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  if(phase==='review'){
   await page.goto('http://127.0.0.1:8744/tests/act4_rebuild_review.html');
   await page.waitForFunction(()=>document.body.dataset.ready==='true');
   const options=await page.locator('#scene option').evaluateAll(os=>os.map(o=>o.value));
   for(const value of options){
    await page.selectOption('#scene',value);
    await page.evaluate(async()=>{for(const id of ['before','after']){const im=document.getElementById(id);await im.decode();if(im.naturalWidth!==1920||im.naturalHeight!==1080)throw Error('Invalid review image');}});
   }
   for(const [id,value] of [['old',0],['new',100],['compare',50]]){
    await page.click('#'+id);if(await page.locator('#wipe').inputValue()!==String(value))throw Error('Broken comparison control');
   }
   await page.setViewportSize({width:390,height:844});
   if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Mobile horizontal overflow');
   if(errors.length)throw Error(errors.join('\n'));
   console.log('PASS 15 paired scenes, comparison controls and mobile review');return;
  }
  await page.goto('http://127.0.0.1:8744/tests/cathedral_review.html');
  await page.waitForFunction(()=>['passed','failed'].includes(document.body.dataset.testStatus),null,{timeout:120000});
  if(await page.locator('#error').innerText())throw Error(await page.locator('#error').innerText());
  for(const [zone,views] of phase==='wide'?[]:Object.entries(scenes)){
   await page.evaluate(zone=>cathedralReview.load('after',zone),zone);
   for(const view of views){
    const data=await page.evaluate(view=>{const r=cathedralReview;r.showView(view);return r.win.document.getElementById('view').toDataURL('image/webp',.94);},view);
    fs.writeFileSync(`${out}/${phase}_${zone}_${view}.webp`,Buffer.from(data.split(',')[1],'base64'));
   }
   if(!phase.startsWith('pilot'))for(const mode of ['moving','combat']){
    await page.evaluate(zone=>cathedralReview.load('after',zone),zone);
    rows.push({zone,width:1920,...await page.evaluate(mode=>cathedralReview.sample(mode),mode)});
   }
   console.log(phase+' '+zone+' captured');
  }
  if(phase==='after'||phase==='wide'){
   for(const zone of Object.keys(scenes)){
    await page.evaluate(async zone=>{document.getElementById('width').value='3840';await cathedralReview.load('after',zone);cathedralReview.showView(zone.startsWith('cathedral_')?'memory':'boss');},zone);
    const data=await page.evaluate(zone=>{const r=cathedralReview;r.showView(zone.startsWith('cathedral_')?'memory':'boss');return r.win.document.getElementById('view').toDataURL('image/webp',.94);},zone);
    fs.writeFileSync(`${out}/after_${zone}_4k.webp`,Buffer.from(data.split(',')[1],'base64'));
    if(phase==='after')rows.push({zone,width:3840,...await page.evaluate(()=>cathedralReview.sample('combat'))});
   }
  }
  fs.writeFileSync(`${out}/${phase}_report.json`,JSON.stringify({status:errors.length?'FAIL':'PASS',errors,rows},null,2)+'\n');
  if(errors.length)throw Error(errors.join('\n'));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
