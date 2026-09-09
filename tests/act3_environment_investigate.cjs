// Attribute flagged timings to current shared runtime vs new upright artwork.
// The omitted-art mode is diagnostic only and never counted as a gameplay pass.
const {chromium}=require('playwright'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding']});
 const page=await browser.newPage({viewport:{width:1920,height:1280}}),runs=[],errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('http://127.0.0.1:8743/tests/act3_environment_review.html?investigate=1');
  await page.waitForFunction(()=>document.body.dataset.testStatus==='passed',null,{timeout:180000});
  for(const [zone,width] of [['sand_tombs',1920],['khal_palace',3840]]){
   await page.selectOption('#width',String(width));
   for(let pair=0;pair<2;pair++)for(const version of pair?['omit_uprights','engine_before','after','environment_before']:['environment_before','after','engine_before','omit_uprights'])for(const mode of ['moving','combat']){
    await page.evaluate(async({zone,version})=>{await act3CombatReview.load(version==='omit_uprights'?'after':version,zone);act3CombatReview.win.__omitEnvironmentUprights=version==='omit_uprights';},{zone,version});
    const sample=await page.evaluate(mode=>act3CombatReview.sample(mode),mode);
    const draws=await page.evaluate(()=>{
     const r=act3CombatReview,ctx=r.win.document.getElementById('view').getContext('2d'),original=ctx.drawImage;
     let all=0,environment=0,environmentPixels=0;
     ctx.drawImage=function(...args){all++;if(/a3env_|a3passage_/.test(args[0].src||'')){environment++;environmentPixels+=(args.length===9?args[7]*args[8]:args[0].width*args[0].height);}return original.apply(this,args);};
     try{r.render();}finally{ctx.drawImage=original;}
     return {all,environment,environmentPixels};
    });
    const row={zone,width,pair,version,...sample,draws};runs.push(row);console.log(zone,width,version,mode,JSON.stringify(sample.cpuMs),JSON.stringify(draws));
    fs.writeFileSync('tests/qa/act3_environment/performance_investigation.json',JSON.stringify({status:'MEASURED',method:'Two alternating pairs. engine_before uses the current runtime with the fresh baseline map generator; omit_uprights disables only ImperialEnvironment.append for attribution.',runs,errors},null,2));
   }
  }
  if(errors.length)throw Error(errors.join('\n'));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
