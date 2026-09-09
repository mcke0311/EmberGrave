const {chromium}=require('playwright');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const page=await browser.newPage();
  await page.goto('http://127.0.0.1:8753/tests/act2_boundary_pixels.html');
  await page.waitForFunction(()=>['passed','failed'].includes(document.body.dataset.testStatus),null,{timeout:180000});
  const result=await page.locator('#result').innerText();
  fs.writeFileSync('tests/qa/act2_visual/pixels.txt',result+'\n');
  if(await page.evaluate(()=>document.body.dataset.testStatus)!=='passed')throw Error(result);
  const occlusion=await page.evaluate(()=>{
   const m=MapGen.generate('weeping_marsh',12345),draws=[],cam={x:0,y:0};
   Act2Boundaries.append(draws,m,cam,{x:0,y:0},100000,100000);
   const item=draws.find(d=>d.tree);if(!item)throw Error('No cypress in scene');
   const c=document.createElement('canvas');c.width=c.height=512;
   const g=c.getContext('2d',{willReadFrequently:true}),d={...item,sx:256,sy:440,centerX:256,hx:256,hy:400};
   const sample=p=>{g.clearRect(0,0,512,512);Act2Boundaries.draw(g,d,p);const a=g.getImageData(0,0,512,512).data;let sum=0;for(let i=3;i<a.length;i+=4)sum+=a[i];return sum;};
   const front=sample({x:item.x+2,y:item.y+2}),behind=sample({x:item.x-2,y:item.y-2}),ratio=behind/front;
   if(front===0||ratio<.22||ratio>.26)throw Error('Tree did not fade over player: '+ratio);
   return{status:'PASS',treeFadeRatio:ratio};
  });
  fs.writeFileSync('tests/qa/act2_visual/occlusion.json',JSON.stringify(occlusion,null,2)+'\n');
  console.log('PASS cached/fresh terrain pixels at 1080p and 4K, stable warm caches, camp caching and wall crops');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
