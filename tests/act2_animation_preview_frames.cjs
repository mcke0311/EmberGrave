const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1920,height:1080}});
  for(const width of [1920,3840]){
   await page.setContent(`<style>body{margin:0;background:#101919}video{width:1920px;height:1080px}</style><video muted preload="auto" src="http://127.0.0.1:8749/tests/qa/act2_animation/crowded_combat_${width}.webm"></video>`);
   await page.locator('video').evaluate(v=>new Promise((resolve,reject)=>{v.onloadeddata=resolve;v.onerror=()=>reject(Error('Recording failed to decode'));if(v.readyState>=2)resolve();}));
   for(const time of [1,3.5,5.5]){
    await page.locator('video').evaluate((v,t)=>new Promise(resolve=>{v.onseeked=resolve;v.currentTime=t;}),time);
    await page.screenshot({path:`tests/qa/act2_animation/recording_${width}_${time}.png`});
   }
   console.log(width,'recording decoded and inspected at 1, 3.5 and 5.5 seconds');
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
