const {chromium}=require('playwright');
const fs=require('node:fs');
const out='tests/qa/act3_architecture';fs.mkdirSync(out,{recursive:true});
const zones=['khalcamp','desert_wastes','underground_market','sand_tombs','khal_palace','shard_flats','tomb_sanctum'];
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding']});
 const page=await browser.newPage({viewport:{width:1920,height:1280},deviceScaleFactor:1}),errors=[],runs=[];
 page.on('pageerror',e=>errors.push(e.message));
 async function capture(name){
  const url=await page.evaluate(()=>{const r=act3CombatReview;r.render();return r.win.document.getElementById('view').toDataURL('image/webp',.93);});
  fs.writeFileSync(out+'/'+name+'.webp',Buffer.from(url.split(',')[1],'base64'));
 }
 try{
  await page.goto('http://127.0.0.1:8743/tests/act3_review.html?zone=khal_palace',{timeout:90000});
  await page.waitForFunction(()=>window.act3CombatReview&&document.body.dataset.testStatus==='passed',null,{timeout:180000});
  for(const width of [1920,3840])for(const zone of zones){
   await page.selectOption('#width',String(width));await page.evaluate(()=>dispatchEvent(new Event('resize')));
   for(const version of ['architecture_before','after']){
    await page.evaluate(({version,zone})=>act3CombatReview.load(version,zone),{version,zone});
    await capture(`${zone}_${width}_${version}_arrival`);
    if(version==='after'){
     const bridge=await page.evaluate(()=>!!act3CombatReview.map.act3.architecture.bridges.length);
     if(bridge)for(const surfaceId of [0,1]){
      await page.evaluate(surfaceId=>{const r=act3CombatReview,b=r.map.act3.architecture.bridges[0];r.game.__act3.place(b.x+.5,b.y+.5,surfaceId);r.render();},surfaceId);
      await capture(`${zone}_${width}_${surfaceId?'upper':'lower'}`);
     }
    }
    if(!process.argv.includes('--captures-only'))for(const mode of zone==='khalcamp'?['moving']:['moving','combat']){
      await page.evaluate(({version,zone})=>act3CombatReview.load(version,zone),{version,zone});
      const result=await page.evaluate(mode=>act3CombatReview.sample(mode),mode);
      runs.push({zone,width,version,...result});
      fs.writeFileSync(out+'/performance_raw.json',JSON.stringify({runs,errors},null,2));
      console.log(zone,width,version,mode,JSON.stringify(result.cpuMs));
    }
   }
   console.log('Captured',zone,width);
  }
  const comparisons=runs.filter(r=>r.version==='after').map(after=>{
    const before=runs.find(r=>r.version==='architecture_before'&&r.zone===after.zone&&r.width===after.width&&r.mode===after.mode);
    const medianRegressionPct=100*(after.cpuMs.median/before.cpuMs.median-1),p95RegressionPct=100*(after.cpuMs.p95/before.cpuMs.p95-1);
    return {zone:after.zone,width:after.width,mode:after.mode,before:before.cpuMs,after:after.cpuMs,medianRegressionPct:+medianRegressionPct.toFixed(1),p95RegressionPct:+p95RegressionPct.toFixed(1),withinTarget:medianRegressionPct<=10.0001&&p95RegressionPct<=10.0001};
  });
  fs.writeFileSync(out+'/review.json',JSON.stringify({status:errors.length?'FAIL':comparisons.some(r=>!r.withinTarget)?'PERFORMANCE_TARGET_MISSED':'PASS',zones,widths:[1920,3840],runs:runs.length,comparisons,errors},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
