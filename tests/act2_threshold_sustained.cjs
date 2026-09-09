const {chromium}=require('playwright');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),rows=[];
  await page.goto('http://127.0.0.1:8753/tests/act2_threshold_review.html?zone=spawn_pools&width=3840');
  await page.waitForFunction(()=>window.act2ReviewDone,{timeout:120000});
  const baseline=process.argv.includes('--ablation')?'hidden':process.argv.includes('--control')?'control':'before';
  for(const version of [baseline,'after','after',baseline]){
   const row=await page.evaluate(async version=>{
    const r=act2AnimationReview;await r.load(version==='hidden'?'after':version,'spawn_pools');
    if(version==='hidden')for(const p of r.game.state.map.props)if(p.thresholdId)p.hidden=true;
    return{version,...await r.sample('combat',{warmup:240,frames:960})};
   },version);rows.push(row);console.log(version,JSON.stringify(row.cpuMs));
  }
  const mean=(version,key)=>rows.filter(r=>r.version===version).reduce((s,r)=>s+r.cpuMs[key],0)/2;
  const before={p95:mean(baseline,'p95'),median:mean(baseline,'median')},after={p95:mean('after','p95'),median:mean('after','median')};
  const report={status:after.p95<=before.p95*1.1?'PASS':'FAIL',method:'Uninstrumented ABBA order, 240 warmup and 960 measured frames each; sustained 4K Spawn Pools combat.',before,after,regression:after.p95/before.p95-1,rows};
  report.baseline=baseline==='hidden'?'Current map with only threshold upright art hidden':baseline==='control'?'Current shared renderer with pre-threshold Act 2 generation':'Archived pre-threshold working tree';
  fs.writeFileSync('tests/qa/act2_thresholds/performance_'+(baseline==='hidden'?'ablation':baseline==='control'?'control':'sustained')+'.json',JSON.stringify(report,null,2));console.log(report.status);
  if(report.status!=='PASS')process.exitCode=1;
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
