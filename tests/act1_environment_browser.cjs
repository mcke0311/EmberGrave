const {chromium}=require('playwright');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding']});
 try{
  for(const target of process.argv.slice(2)){
   const page=await browser.newPage({viewport:{width:1600,height:1050}}),errors=[];
   await page.route('**/favicon.ico',r=>r.fulfill({status:204,body:''}));
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:8755/tests/act1_environment_review.html?'+target,{timeout:60000});
   await page.waitForFunction(()=>document.body.dataset.testStatus==='passed'||document.body.dataset.testStatus==='failed',null,{timeout:180000});
   const result=await page.evaluate(()=>({status:document.body.dataset.testStatus,error:document.querySelector('#error').textContent,statusText:document.querySelector('#status').textContent}));
   if(result.status==='passed'){
    const data=await page.evaluate(()=>act1Review.win.document.querySelector('canvas').toDataURL('image/png'));
    fs.writeFileSync('tests/qa/act1_environment/'+target.replace(/[^a-z0-9]/gi,'_')+'.png',Buffer.from(data.split(',')[1],'base64'));
   }
   result.errors=errors;console.log(target,JSON.stringify(result));
   if(result.status!=='passed'||errors.length)process.exitCode=1;
   await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
