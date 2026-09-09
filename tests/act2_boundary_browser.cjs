const {chromium}=require('playwright');
const fs=require('node:fs');
const enemy=process.argv.includes('--enemies'),port=enemy?8748:8752,output=enemy?'act2_enemies':'act2_boundaries';
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:!process.argv.includes('--visible'),args:['--disable-background-timer-throttling','--disable-renderer-backgrounding']});
 try{
  for(const target of process.argv.slice(2).filter(x=>!x.startsWith('--'))){
   const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
   await page.route('**/favicon.ico',route=>route.fulfill({status:204,body:''}));
   page.on('pageerror',e=>errors.push(e.message));
   page.on('console',m=>{if(m.type()==='error')errors.push(m.text()+' '+m.location().url);});
   await page.goto('http://127.0.0.1:'+port+'/tests/'+target,{waitUntil:'load',timeout:60000});
   await page.waitForFunction(()=>window.act2ReviewDone||document.body.dataset.testStatus==='failed'||(!location.pathname.endsWith('act2_boundary_review.html')&&document.body.dataset.testStatus==='passed'),null,{timeout:1800000});
   const result=await page.evaluate(()=>({status:document.body.dataset.testStatus,text:(document.querySelector('#status')||document.querySelector('#result'))?.textContent,error:document.querySelector('#error')?.textContent}));
   result.errors=errors;result.browser=browser.version();result.headless=!process.argv.includes('--visible');
   const name=target.replace(/[^a-z0-9_-]/gi,'_');
   await page.screenshot({path:'tests/qa/'+output+'/'+name+'.png'});
   fs.writeFileSync('tests/qa/'+output+'/'+name+'.json',JSON.stringify(result,null,2)+'\n');
   console.log(target,JSON.stringify({...result,text:result.text?.split('\n')[0]}));
   if(!['passed','pass'].includes(result.status)||errors.length)process.exitCode=1;
   await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
