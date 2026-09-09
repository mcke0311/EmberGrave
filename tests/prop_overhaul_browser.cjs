const {chromium}=require('playwright');
const fs=require('node:fs');
const dir='tests/qa/prop_overhaul';
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding']});
 const page=await browser.newPage({viewport:{width:1960,height:1260}}),errors=[];
 page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.message);});page.on('console',m=>{if(m.type()==='error')console.log('BROWSER',m.text());});
 try{
  await page.goto('http://127.0.0.1:8768/tests/prop_overhaul.html');
  await page.waitForFunction(()=>document.body.dataset.ready==='true',null,{timeout:180000});
  await page.evaluate(()=>propReview.setAuto(false));
  console.log('Ready');
  if(!process.argv.includes('--visual')){
   const report=await page.evaluate(()=>propReview.checks());report.errors.push(...errors);fs.writeFileSync(dir+'/interactions.json',JSON.stringify(report,null,2)+'\n');console.log(report);
  }
  await page.screenshot({path:dir+'/review_page.png',fullPage:true});
  if(errors.length)throw Error(errors.join('\n'));
 }catch(e){await page.screenshot({path:dir+'/failure.png',fullPage:true});console.log(await page.locator('#status').textContent());throw e;}
 finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
