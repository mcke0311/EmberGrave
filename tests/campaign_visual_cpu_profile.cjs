// Diagnostic only: retain V8 profiles and combat images, outside acceptance runs.
const fs=require('node:fs'),{chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage({viewport:{width:1920,height:1200}});
 try{
  await page.goto('http://127.0.0.1:8741/tests/campaign_visual_review.html');
  await page.waitForFunction(()=>window.campaignReview&&document.body.dataset.testStatus==='passed',null,{timeout:180000});
  const session=await page.context().newCDPSession(page);await session.send('Profiler.enable');
  const rows=[];
  for(const version of ['before','after']){
   await page.evaluate(async version=>{document.getElementById('width').value=3840;await campaignReview.load(version,'weeping_marsh');await campaignReview.sample('combat',600);},version);
   await session.send('Profiler.start');
   const result=await page.evaluate(()=>campaignReview.sample('combat',0));
   const {profile}=await session.send('Profiler.stop');
   fs.writeFileSync('tests/qa/campaign_visual/cpu_'+version+'.cpuprofile',JSON.stringify(profile));
   const names=new Map(profile.nodes.map(n=>[n.id,n.callFrame.functionName||'(anonymous)'])),totals={};
   for(let i=0;i<profile.samples.length;i++){const name=names.get(profile.samples[i]);totals[name]=(totals[name]||0)+(profile.timeDeltas[i]||0)/1000;}
   const top=Object.entries(totals).sort((a,b)=>b[1]-a[1]).slice(0,30);
   rows.push({version,cpuMs:result.cpuMs,top});console.log(version,JSON.stringify(top.slice(0,15)));
   const image=await page.evaluate(()=>campaignReview.win.document.getElementById('view').toDataURL('image/webp',.93));
   fs.writeFileSync('tests/qa/campaign_visual/combat_'+version+'.webp',Buffer.from(image.split(',')[1],'base64'));
  }
  fs.writeFileSync('tests/qa/campaign_visual/cpu_profile.json',JSON.stringify({diagnostic:true,rows},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
