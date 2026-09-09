// Diagnostic timings only; instrumentation is never used for acceptance profiles.
const {chromium}=require('playwright'),fs=require('node:fs');
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await b.newPage({viewport:{width:1600,height:1100}});
 await page.route('**/js/game.js',async route=>{
  const response=await route.fetch();let source=await response.text();
  source='window.envTimings={};function envMeasure(key,fn){const at=performance.now();const v=fn();const r=window.envTimings[key]??={ms:0,calls:0};r.ms+=performance.now()-at;r.calls++;return v;}\n'+source;
  const calls={backdrop:'drawBackdrop(m.zone.theme, m, W, H, cam)',terrain:'LevelTerrain.drawSurface(ctx,m,cam,tx0,tx1,ty0,ty1,inView,true)',append:'CindersBoundaries.append(draws,m,cam,p,W,H)',walls:'CindersBoundaries.draw(ctx,d,p)'};
  for(const [key,call]of Object.entries(calls))source=source.replace(call+';',`envMeasure('${key}',()=>${call});`);
  await route.fulfill({response,body:source});
 });
 await page.goto('http://127.0.0.1:8879/tests/act5_environment_review.html?zone='+(process.argv[2]||'cinder_bastion'));
 await page.waitForFunction(()=>window.cindersReview,{timeout:120000});const rows=[];
 for(const version of ['before','after'])rows.push(await page.evaluate(async version=>{
  const r=cindersReview;await r.load(version);r.win.envTimings={};
  const report=await r.sample('moving');return {version,report,timings:r.win.envTimings,boundary:version==='after'?r.win.eval('CindersBoundaries').getDiagnostics():null};
 },version));
 fs.writeFileSync('tests/qa/act5_environment/components.json',JSON.stringify(rows,null,2));console.log(rows);
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
