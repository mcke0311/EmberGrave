const {chromium}=require('playwright');const fs=require('node:fs');
const zones=['frosthaven_approach','frosthaven','north_wild','mines','shattered_temple','shardpeak_shrine','deepfreeze_cavern'];
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});const errors=[],captures=[];
 try{const page=await browser.newPage({viewport:{width:1600,height:1050}});page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8755/tests/act1_environment_review.html?zone=mines');await page.waitForFunction(()=>document.body.dataset.testStatus==='passed');
  for(const width of [1920,3840])for(const zone of zones)for(const version of ['before','after']){
   const views=await page.evaluate(async({width,zone,version})=>{document.querySelector('#width').value=width;await act1Review.load(version,zone);return ['arrival',...Array.from(document.querySelector('#view').options).map(o=>o.value).filter(x=>x.startsWith('exit_'))];},{width,zone,version});
   for(const view of views){const name=zone+'_'+width+'_'+version+'_'+view+'.webp';
    await page.evaluate(async({view,name})=>{document.querySelector('#view').value=view;act1Review.showView();await act1Review.capture(name);},{view,name});captures.push({zone,width,version,view,name});
   }
   console.log(zone,width,version,views.length+' views');
  }
  fs.writeFileSync('tests/qa/act1_environment/captures.json',JSON.stringify({status:errors.length?'FAIL':'PASS',errors,captures},null,2)+'\n');if(errors.length)throw Error(errors.join('\n'));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
