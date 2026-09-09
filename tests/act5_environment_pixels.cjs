const {chromium}=require('playwright'),fs=require('node:fs');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage();await page.goto('http://127.0.0.1:8879/tests/act5_environment_pixels.html');
 await page.waitForFunction(()=>window.report,{timeout:180000});const r=await page.evaluate(()=>window.report);
 fs.writeFileSync('tests/qa/act5_environment/pixels.json',JSON.stringify(r,null,2)+'\n');console.log(r.status,r.scenes||r.error);if(r.status!=='PASS')process.exitCode=1;
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
