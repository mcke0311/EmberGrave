'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const base=process.env.GAME_REVIEW_URL||'http://127.0.0.1:8741',output='tmp/random_maps/browser';fs.mkdirSync(output,{recursive:true});
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true}),context=await browser.newContext({viewport:{width:1920,height:1450}}),page=await context.newPage(),errors=[],rows=[],profiles=[];
 page.on('pageerror',e=>errors.push(e.stack));
 try{
  await page.goto(base+'/tests/random_maps_review.html',{waitUntil:'load',timeout:120000});await page.waitForFunction(()=>window.__reviewReady||window.__reviewError,null,{timeout:120000});assert.equal(await page.evaluate(()=>window.__reviewError),undefined);
  const zones=await page.evaluate(()=>[...document.querySelector('#zone').options].map(o=>o.value));assert.equal(zones.length,30);
  const widths=process.argv.includes('--phone-only')?[844]:[1920,844];
  let phone=page;
  if(!process.argv.includes('--profiles-only')){
   const mobile=await browser.newContext({viewport:{width:844,height:390},screen:{width:844,height:390},isMobile:true,hasTouch:true,deviceScaleFactor:1});phone=await mobile.newPage();phone.on('pageerror',e=>errors.push(e.stack));
   await phone.goto(base+'/tests/random_maps_review.html',{waitUntil:'load',timeout:120000});await phone.addStyleTag({content:'header,#overview{display:none}'});await phone.waitForFunction(()=>window.__reviewReady||window.__reviewError,null,{timeout:120000});assert.equal(await phone.evaluate(()=>window.__reviewError),undefined);
  }
  for(const zone of process.argv.includes('--profiles-only')?[]:zones)for(const width of widths){
   const target=width===844?phone:page,row=await target.evaluate(({zone,width})=>randomMapsQA.load(zone,12345,width),{zone,width});assert.ok(row.enemies>0,zone+' empty encounter');rows.push(row);
   assert.equal(await target.evaluate(()=>randomMapsQA.state.map.id),zone);assert.equal(await target.evaluate(()=>randomMapsQA.api.UI.cinematicActive()),false);
   if(width===844)assert.ok(await target.locator('iframe').contentFrame().locator('body.phone-layout').count());
   assert.equal(await target.locator('iframe').contentFrame().locator('#view').evaluate(c=>c.width),width,'canvas resolution '+zone);
   assert.equal(await target.locator('iframe').contentFrame().locator('#view').evaluate(c=>c.height),width===844?390:1080,'canvas height '+zone);
   await target.locator('iframe').contentFrame().locator('#view').screenshot({path:output+'/'+zone+'_'+width+'_12345.png'});
   if(width===1920)await target.locator('#overview').screenshot({path:output+'/'+zone+'_overview_12345.png'});
  }
  const acts=['forest','north_wild','weeping_marsh','sand_tombs','cathedral1','ash_wastes'];
  for(const zone of process.argv.includes('--profiles-only')?[]:acts)for(const seed of [1,4294967295])for(const width of widths){
   const target=width===844?phone:page;rows.push(await target.evaluate(a=>randomMapsQA.load(a.zone,a.seed,a.width),{zone,seed,width}));await target.evaluate(()=>randomMapsQA.view(2));
   await target.locator('iframe').contentFrame().locator('#view').screenshot({path:output+'/'+zone+'_'+width+'_'+seed+'.png'});
   if(width===1920)await target.locator('#overview').screenshot({path:output+'/'+zone+'_overview_'+seed+'.png'});
  }
  for(const zone of process.argv.includes('--scenes-only')?[]:acts)for(const version of ['before','current'])for(const mode of ['moving','combat']){
   await page.evaluate(a=>randomMapsQA.load(a.zone,12345,1920,a.version),{zone,version});const profile=await page.evaluate(mode=>randomMapsQA.profile(mode),mode);assert.ok(Number.isFinite(profile.p95Ms));if(mode==='moving')assert.ok(profile.distance>.1,zone+' movement profile stalled');profiles.push({zone,version,...profile});
  }
  let reportRows=rows;if(process.argv.includes('--phone-only')&&fs.existsSync(output+'/report.json'))reportRows=[...JSON.parse(fs.readFileSync(output+'/report.json','utf8')).rows.filter(r=>r.width===1920),...rows];
  assert.deepEqual(errors,[]);fs.writeFileSync(output+'/'+(process.argv.includes('--profiles-only')?'profiles.json':'report.json'),JSON.stringify({status:'PASS',scenes:reportRows.length,rows:reportRows,profiles},null,2)+'\n');console.log('PASS '+rows.length+' desktop/phone scenes; '+profiles.length+' movement/combat comparisons');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
