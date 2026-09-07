// Isolated browser checks. Requires Playwright (NODE_PATH may point to a bundled runtime).
const {chromium}=require('playwright');
const fs=require('node:fs');
(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding']});
  try{
    for(const target of process.argv.slice(2)){
      const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();
      page.on('pageerror',e=>console.error('PAGE ERROR',target,e.message));
      const browserMessages=[];
      page.on('console',m=>{if(m.type()==='warning'||m.type()==='error')browserMessages.push(m.text());});
      await page.goto('http://localhost:8741/tests/'+target,{waitUntil:'load',timeout:60000});
      await page.waitForFunction(()=>['passed','failed'].includes(document.body.dataset.testStatus),{},{timeout:240000});
      const result=await page.evaluate(()=>({status:document.body.dataset.testStatus,text:(document.querySelector('#status')||document.querySelector('#result')||document.querySelector('#results'))?.textContent,performance:window.perfResults}));
      result.environment={browser:browser.version(),platform:process.platform};
      if(browserMessages.length)result.browserMessages=browserMessages;
      if(result.performance){
        const name=target.replace(/[^a-z0-9_-]/gi,'_');
        fs.mkdirSync('tests/qa/act2',{recursive:true});fs.writeFileSync('tests/qa/act2/'+name+'.json',JSON.stringify(result,null,2)+'\n');
        console.log(target,JSON.stringify(result.performance.results.map(r=>({where:r.where,simulate:r.simulate,cpu:r.cpuMs,interval:r.frameIntervalMs,end:r.endPosition}))));
      }else console.log(target,JSON.stringify({...result,text:result.text?.split('\n')[0]}));
      if(process.env.BROWSER_QA_SCREENSHOTS){fs.mkdirSync('tests/qa/act2',{recursive:true});await page.screenshot({path:'tests/qa/act2/'+target.replace(/[^a-z0-9_-]/gi,'_')+'.png'});}
      if(result.status!=='passed')process.exitCode=1;
      await context.close();
    }
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
