const fs=require('node:fs'),{chromium}=require('playwright');
const baseline=process.argv.includes('--baseline');
const files=(process.argv.includes('--clip')?['campaign_clip_cache.html']:['terrain_view_pixels.html','terrain_strip_pixels.html','act2_boundary_pixels.html','act3_environment_pixels.html','cathedral_terrain_pixels.html','act5_environment_pixels.html']).filter(f=>!process.argv.includes('--strip')||f==='terrain_strip_pixels.html');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage(),rows=[];
 try{
  // Some older fixtures POST reports to their dedicated review server.
  await page.route('**/api/act2-review',route=>route.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'}));
  // Legacy pixel fixtures predate map generation's family-navigation dependency.
  await page.route('**/tests/*.html',async route=>{
   const file=new URL(route.request().url()).pathname.split('/').at(-1);let source=fs.readFileSync('tests/'+file,'utf8');
   if(!source.includes('js/navigation.js'))source=source.replace(/(<script src="js\/mapgen[^\"]*"><\/script>)/,'$1<script src="js/navigation.js"></script>');
   if(!source.includes('js/boss_encounters.js'))source=source.replace(/(<script src="js\/mapgen[^\"]*"><\/script>)/,'<script src="js/boss_encounters.js"></script>$1');
   if(file==='terrain_strip_pixels.html'){
    // The archived input-latency renderer predates several visual overhauls.
    // Compare today's full redraw to today's incremental strip cache instead.
    source=source.replace('tests/fixtures/level_terrain_before_input_latency.js','js/level_terrain.js')
      .replace('height+96,true);','height+96,renderer!==before);')
      .replace('match the previous renderer','match a fresh full redraw')
      .replace('let channels=0,views=0,maxError=0;', 'let channels=0,views=0,maxError=0; const diagnostics=[];')
      .replace('if(largest>3||total/old.length>.01)throw Error(JSON.stringify({zone,width,cam,rect,largest,alpha,mean:total/old.length,worst}));', 'if(largest>3||total/old.length>.01)diagnostics.push({zone,width,cam,rect,largest,alpha,mean:total/old.length,worst});')
      .replace("document.body.dataset.testStatus='passed';", "if(diagnostics.length)out.textContent=out.textContent.replace(/^PASS/,'STRICT IDENTITY DIAGNOSTIC').replace('match a fresh full redraw.','have the differences listed below.'); out.textContent+='\\n'+JSON.stringify(diagnostics,null,2); document.body.dataset.testStatus=diagnostics.length?'failed':'passed';");
    if(baseline)source=source.replaceAll('src="js/','src="tmp/campaign_visual/before/js/').replace("fetch('js/level_terrain.js')", "fetch('tmp/campaign_visual/before/js/level_terrain.js')");
   }
   await route.fulfill({contentType:'text/html',body:source});
  });
  for(const file of files){
   try{
    await page.goto('http://127.0.0.1:8741/tests/'+file);
    await page.waitForFunction(()=>['passed','failed'].includes(document.body.dataset.testStatus),null,{timeout:240000});
    const result=await page.locator('pre').first().innerText(),status=await page.evaluate(()=>document.body.dataset.testStatus);
    fs.writeFileSync('tests/qa/campaign_visual/pixels_'+(baseline?'baseline_':'')+file+'.txt',result);rows.push({file,status});console.log(status,file);
   }catch(e){rows.push({file,status:'failed',error:String(e)});console.log('failed',file,String(e));}
  }
  // Test the new scenery's actual alpha fade, independently of its shape.
  const fade=baseline?{status:'passed',skipped:true}:await page.evaluate(()=>{
   const m=MapGen.generate('ash_wastes',12345),draws=[];CampaignEnvironment.append(draws,m,{x:0,y:0},{x:0,y:0},1e6,1e6);
   const source=draws[0];if(!source)throw Error('No new scenery to test');
   const c=document.createElement('canvas');c.width=c.height=512;const g=c.getContext('2d',{willReadFrequently:true});
   const d={...source,sx:256,sy:440,hx:256,hy:410};
   const sample=p=>{g.clearRect(0,0,512,512);CampaignEnvironment.draw(g,d,p);const a=g.getImageData(0,0,512,512).data;let n=0;for(let i=3;i<a.length;i+=4)n+=a[i];return n;};
   const front=sample({x:source.x+3,y:source.y+3}),behind=sample({x:source.x-3,y:source.y-3}),ratio=behind/front;
   if(ratio<.20||ratio>.24)throw Error('Wrong scenery fade: '+ratio);return {status:'passed',ratio};
  });
  rows.push({file:'campaign scenery occlusion',...fade});
  fs.writeFileSync('tests/qa/campaign_visual/pixels'+(baseline?'_baseline':'')+(process.argv.includes('--clip')?'_clip':process.argv.includes('--strip')?'_strip':'')+'.json',JSON.stringify({status:rows.every(r=>r.status==='passed')?'PASS':'FAIL',rows},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
