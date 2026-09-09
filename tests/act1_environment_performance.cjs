const {chromium}=require('playwright');const fs=require('node:fs');
const dir='tests/qa/act1_environment',zones=['north_wild','mines','shattered_temple','shardpeak_shrine','deepfreeze_cavern'];
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding']});
 const rows=[];
 try{
  const page=await browser.newPage({viewport:{width:1600,height:1050}});await page.route('**/favicon.ico',r=>r.fulfill({status:204,body:''}));
  await page.goto('http://127.0.0.1:8755/tests/act1_environment_review.html?zone=mines');
  await page.waitForFunction(()=>window.act1Review&&document.body.dataset.testStatus==='passed');
  for(const width of [1920,3840])for(const zone of zones)for(const version of ['before','after'])for(const mode of ['moving','combat']){
   const file=dir+'/perf_'+zone+'_'+width+'_'+version+'_'+mode+'.json';
   if(process.argv.includes('--resume')&&fs.existsSync(file)){rows.push(JSON.parse(fs.readFileSync(file)));continue;}
   const row=await page.evaluate(async({width,zone,version,mode})=>{
    document.querySelector('#width').value=width;await act1Review.load(version,zone);return {width,zone,version,...await act1Review.sample(mode)};
   },{width,zone,version,mode});
   fs.writeFileSync(file,JSON.stringify(row,null,2)+'\n');rows.push(row);console.log(zone,width,version,mode,JSON.stringify(row.cpuMs));
  }
  const comparisons=[];
  for(const width of [1920,3840])for(const zone of zones)for(const mode of ['moving','combat']){
   const a=rows.find(r=>r.width===width&&r.zone===zone&&r.mode===mode&&r.version==='after'),b=rows.find(r=>r.width===width&&r.zone===zone&&r.mode===mode&&r.version==='before');
   comparisons.push({zone,width,mode,before:b.cpuMs,after:a.cpuMs,medianRatio:a.cpuMs.median/b.cpuMs.median,p95Ratio:a.cpuMs.p95/b.cpuMs.p95});
  }
  fs.writeFileSync(dir+'/performance.json',JSON.stringify({method:'Fresh source archive; 90 warmup, 240 measured frames; full roster; movement and exchanged combat; real 3D Vanguard. One initial pair per scenario; investigate ratios above 1.10.',comparisons},null,2)+'\n');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
