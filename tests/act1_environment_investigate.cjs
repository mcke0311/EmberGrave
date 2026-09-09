const {chromium}=require('playwright');const fs=require('node:fs');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding']});
 try{const page=await browser.newPage({viewport:{width:1600,height:1050}});await page.goto('http://127.0.0.1:8755/tests/act1_environment_review.html?zone=deepfreeze_cavern&width=3840');await page.waitForFunction(()=>document.body.dataset.testStatus==='passed');
  const rows=[];for(let pair=0;pair<3;pair++)for(const version of pair%2?['after','before']:['before','after']){
   const row=await page.evaluate(async({version,pair})=>{await act1Review.load(version,'deepfreeze_cavern');return {pair,version,...await act1Review.sample('combat')};},{version,pair});
   rows.push(row);console.log(pair,version,JSON.stringify(row.cpuMs));
  }
  const mean=(version,key)=>rows.filter(r=>r.version===version).reduce((a,r)=>a+r.cpuMs[key],0)/3;
  const report={scenario:'Deepfreeze 4K combat',reason:'Initial p95 regression above 10%; three alternating pairs on a warmed browser to distinguish noise from repeatable cost.',rows,
   medianRatio:mean('after','median')/mean('before','median'),p95Ratio:mean('after','p95')/mean('before','p95')};
  fs.writeFileSync('tests/qa/act1_environment/performance_investigation.json',JSON.stringify(report,null,2)+'\n');console.log(report.medianRatio,report.p95Ratio);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
