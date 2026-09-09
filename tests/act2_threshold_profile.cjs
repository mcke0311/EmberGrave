const {chromium}=require('playwright');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const query=process.argv[2]||'profile&all&bothWidths&clean&resume';
  await page.goto('http://127.0.0.1:8753/tests/act2_threshold_review.html?'+query,{timeout:60000});
  let done=false,last='';
  while(!done){
   const state=await page.evaluate(()=>({done:window.act2ReviewDone,status:document.querySelector('#status').textContent,error:document.querySelector('#error').textContent}));
   if(state.status!==last){console.log(state.status);last=state.status;}
   if(state.error)throw Error(state.error);
   done=state.done;
   if(!done)await new Promise(resolve=>setTimeout(resolve,15000));
  }
  const result=await page.evaluate(()=>({status:document.body.dataset.testStatus,report:document.querySelector('#report').textContent}));
  fs.writeFileSync('tests/qa/act2_thresholds/profile_runner.json',JSON.stringify({...result,errors,browser:browser.version()},null,2));
  console.log(result.status);
  if(result.status!=='pass'||errors.length)process.exitCode=1;
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
