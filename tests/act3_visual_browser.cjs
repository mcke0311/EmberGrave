// Capture production Act III scenes using the review's isolated hero/save store.
const {chromium}=require('playwright');
const fs=require('node:fs');
const phase=process.argv[2]||'after';
const out='tests/qa/act3_visual';
const scenes={khalcamp:['arrival','checkpoint'],desert_wastes:['arrival','caravan','crossroads','palace'],underground_market:['arrival','bazaar'],sand_tombs:['arrival','engine','prison'],khal_palace:['arrival','audience','boss'],shard_flats:['arrival','overlook'],tomb_sanctum:['arrival','ossuary','boss']};
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 if(phase==='before'&&fs.existsSync(out+'/before_report.json'))throw Error('The starting captures are immutable. Choose a different phase name.');
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const page=await browser.newPage({viewport:{width:1920,height:1280}}),errors=[],captures=[],samples=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('http://127.0.0.1:8743/tests/act3_environment_review.html');
  await page.waitForFunction(()=>['passed','failed'].includes(document.body.dataset.testStatus),null,{timeout:180000});
  if(await page.locator('#error').innerText())throw Error(await page.locator('#error').innerText());
  for(const [zone,requested] of Object.entries(scenes)){
   await page.evaluate(zone=>act3CombatReview.load('after',zone),zone);
   const available=await page.locator('#view option').evaluateAll(xs=>xs.map(x=>x.value));
   console.log(zone+' views: '+available.join(', '));
   const views=requested.filter(v=>available.includes(v));
   for(const view of views){
    await page.selectOption('#view',view);
    const data=await page.evaluate(()=>{const r=act3CombatReview;r.render();return r.win.document.getElementById('view').toDataURL('image/webp',.95);});
    const name=`${phase}_${zone}_${view}.webp`;
    fs.writeFileSync(out+'/'+name,Buffer.from(data.split(',')[1],'base64'));captures.push({zone,view,name});
   }
   if(process.argv.includes('--verify')){
    samples.push({zone,width:1920,...await page.evaluate(()=>act3CombatReview.sample('moving'))});
    await page.evaluate(async zone=>{document.getElementById('width').value='3840';await act3CombatReview.load('after',zone);},zone);
    for(const view of ['arrival',views.at(-1)]){
     await page.selectOption('#view',view);
     const data=await page.evaluate(()=>{const r=act3CombatReview;r.render();return r.win.document.getElementById('view').toDataURL('image/webp',.95);});
     const name=`${phase}_${zone}_${view}_4k.webp`;fs.writeFileSync(out+'/'+name,Buffer.from(data.split(',')[1],'base64'));captures.push({zone,view,width:3840,name});
    }
    samples.push({zone,width:3840,...await page.evaluate(mode=>act3CombatReview.sample(mode),zone==='khalcamp'?'moving':'combat')});
    console.log(zone+' performance: '+JSON.stringify(samples.slice(-2).map(s=>({width:s.width,cpuMs:s.cpuMs}))));
    await page.evaluate(()=>{document.getElementById('width').value='1920';dispatchEvent(new Event('resize'));});
   }
  }
  fs.writeFileSync(out+'/'+phase+'_report.json',JSON.stringify({status:errors.length?'FAIL':'PASS',errors,captures,samples},null,2));
  if(errors.length)throw Error(errors.join('\n'));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
