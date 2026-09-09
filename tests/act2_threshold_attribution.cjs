const {chromium}=require('playwright');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),rows=[];
  await page.goto('http://127.0.0.1:8753/tests/act2_threshold_review.html?zone=spawn_pools&width=3840');
  await page.waitForFunction(()=>window.act2ReviewDone,{timeout:120000});
  for(const version of ['before','after','after','before']){
   const row=await page.evaluate(async version=>{
    const r=act2AnimationReview;await r.load(version,'spawn_pools');
    const hooks=r.game.__act2,old={},stats={},draws={};
    for(const name of ['update','render']){
     old[name]=hooks[name];stats[name]=[];
     hooks[name]=function(...args){const t=performance.now();try{return old[name](...args);}finally{stats[name].push(performance.now()-t);}};
    }
    const proto=r.win.CanvasRenderingContext2D.prototype,draw=proto.drawImage;
    proto.drawImage=function(im,...args){
     const key=im.src?.split('/').pop()?.split('?')[0]||'canvas',s=draws[key]??={calls:0,ms:0};
     const t=performance.now();try{return draw.call(this,im,...args);}finally{s.calls++;s.ms+=performance.now()-t;}
    };
    let sample;
    try{sample=await r.sample('combat');}finally{Object.assign(hooks,old);proto.drawImage=draw;}
    const summary=a=>{a.sort((a,b)=>a-b);return{median:a[Math.floor(a.length*.5)],p95:a[Math.floor(a.length*.95)],sum:a.reduce((a,b)=>a+b,0),calls:a.length};};
    return{version,sample,stages:Object.fromEntries(Object.entries(stats).map(([k,v])=>[k,summary(v)])),draws:Object.entries(draws).sort((a,b)=>b[1].ms-a[1].ms).slice(0,20)};
   },version);
   rows.push(row);console.log(version,JSON.stringify(row.stages));
  }
  fs.writeFileSync('tests/qa/act2_thresholds/performance_attribution.json',JSON.stringify({method:'Diagnostic instrumentation, not acceptance timing; ABBA order, 4K Spawn Pools combat.',rows},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
