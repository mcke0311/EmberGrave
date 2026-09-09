// Capture identical cameras and exercise real movement/combat with isolated saves.
const {chromium}=require('playwright');
const fs=require('node:fs');
const dir='tests/qa/act1_polish';
const scenes={frosthaven:['arrival','exit_0'],frosthaven_approach:['arrival','exit_0'],north_wild:['arrival','mine','watch'],mines:['arrival','haul'],shattered_temple:['procession','court','boss'],shardpeak_shrine:['summit'],deepfreeze_cavern:['gallery','boss']};
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding']});
 const errors=[],captures=[],profiles=[];fs.mkdirSync(dir,{recursive:true});
 try{
  const page=await browser.newPage({viewport:{width:1600,height:1050}});
  page.on('pageerror',e=>errors.push(e.message));
  // Preserve a comparison against the actual working tree at the start of this pass.
  await page.route('**/tests/act1_environment_review.html*',async route=>{
   const html=fs.readFileSync('tests/act1_environment_review.html','utf8').replaceAll('tmp/act1_environment/before/','tmp/act1_polish/before/');
   await route.fulfill({contentType:'text/html',body:html});
  });
  await page.goto('http://127.0.0.1:8755/tests/act1_environment_review.html?zone=north_wild');
  await page.waitForFunction(()=>window.act1Review&&document.body.dataset.testStatus==='passed',null,{timeout:120000});
  const versions=process.argv.includes('--before')?['before']:['after'];
  const selected=process.argv.find(a=>a.startsWith('--zone='))?.split('=')[1];
  const widths=process.argv.includes('--4k')?[3840]:[1920];
  for(const width of widths)for(const [zone,views] of Object.entries(scenes)){
   if(selected&&zone!==selected)continue;
   for(const version of versions){
    await page.evaluate(async({width,zone,version})=>{document.querySelector('#width').value=width;await act1Review.load(version,zone);},{width,zone,version});
    for(const view of views){
     const data=await page.evaluate(async view=>{
      document.querySelector('#view').value=view;act1Review.showView();
      await new Promise(r=>requestAnimationFrame(r));act1Review.game.__frontier.render();
      return act1Review.win.document.querySelector('#view').toDataURL('image/webp',.94);
     },view);
     const name=`${zone}_${view}_${width}_${version}.webp`;
     fs.writeFileSync(dir+'/'+name,Buffer.from(data.split(',')[1],'base64'));captures.push(name);
    }
    if(process.argv.includes('--profile')&&['north_wild','mines','shattered_temple'].includes(zone))for(const mode of ['moving','combat']){
     await page.evaluate(async({version,zone})=>act1Review.load(version,zone),{version,zone});
     const sample=await page.evaluate(mode=>act1Review.sample(mode),mode);
     profiles.push({zone,width,version,...sample});
    }
    console.log(zone,width,version,'captured');
   }
  }
  const reportPath=dir+'/review_'+versions[0]+'_'+widths[0]+'.json';
  const previous=fs.existsSync(reportPath)?JSON.parse(fs.readFileSync(reportPath)):{};
  fs.writeFileSync(reportPath,JSON.stringify({status:errors.length?'FAIL':'PASS',errors,captures,profiles:profiles.length?profiles:previous.profiles||[]},null,2)+'\n');
  if(errors.length)throw Error(errors.join('\n'));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
