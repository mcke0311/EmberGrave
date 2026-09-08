const {chromium}=require('playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
const root=process.env.GAME_REVIEW_URL||'http://127.0.0.1:8755',dest='tests/qa/gameplay_improvements';
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage({viewport:{width:1450,height:1000}});const errors=[],missing=[];
 page.on('pageerror',e=>errors.push(String(e)));page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))missing.push(r.url());});
 try{
  await page.goto(root+'/tests/enemy_art_review.html');await page.waitForFunction(()=>window.artReady||window.artError,{},{timeout:120000});assert.equal(await page.evaluate(()=>window.artError),undefined);
  const report=await page.evaluate(()=>{
   const {records,sprites,drawRecord}=artReview;let checks=0;const failures=[];const check=(v,m)=>{checks++;if(!v)failures.push(m);};
   const canvas=document.createElement('canvas');canvas.width=canvas.height=600;const ctx=canvas.getContext('2d',{willReadFrequently:true});
   for(const r of records){
    check(!!r.artId,r.id+' resolves');if(r.summon)continue;
    for(const pose of [{state:'idle',t:.8,ang:.7},{state:'walk',t:.4,ang:3.5},{state:'attack',t:.5,ang:.7}]){
     ctx.clearRect(0,0,600,600);drawRecord(ctx,r,300,430,pose);const g=r.structure?sprites.frameGeometry(sprites.getFrame(r.artId,0),300,430):sprites.actorGeometry(r.opts,pose,300,430);check(g.frame.id===r.artId,r.id+' drawing and hover use same asset');
     const px=ctx.getImageData(0,0,600,600).data;let visible=0;
     for(let y=0;y<600;y+=4)for(let x=0;x<600;x+=4)if(px[(y*600+x)*4+3]>(r.opts.bossDecoy?40:120)){visible++;check(x>=g.left-1&&x<=g.right+1&&y>=g.top-1&&y<=g.bottom+1,r.id+' visible bounds');check(sprites.hitTestGeometry(g,x+.5,y+.5,1),r.id+' alpha picking');}
     check(visible>10,r.id+' visible');
    }
   }
   return {checks,failures,records:records.map(({opts,...r})=>r),performance:artReview.benchmark()};
  });
  fs.writeFileSync(dest+'/enemy-audit.json',JSON.stringify(report.records,null,2)+'\n');delete report.records;
  report.errors=errors;report.missing=missing;report.status=report.failures.length||errors.length||missing.length?'FAIL':'PASS';
  fs.writeFileSync(dest+'/enemy-browser.json',JSON.stringify(report,null,2)+'\n');
  for(let n=0;n<14;n++){await page.evaluate(n=>artReview.renderPage(n),n);await page.screenshot({path:dest+'/enemy-roster-'+String(n+1).padStart(2,'0')+'.png',fullPage:true});}
  assert.equal(report.status,'PASS',JSON.stringify(report.failures.slice(0,10)));console.log(JSON.stringify(report));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
