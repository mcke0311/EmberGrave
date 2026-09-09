// Matched production canvases; review heroes use memory-only saves.
const {chromium}=require('playwright');
const fs=require('node:fs');
const phase=process.argv.includes('--before')?'before':'after';
const dir='tests/qa/act2_visual';
const scenes={weeping_marsh:['arrival','hamlet','bell','monastery'],drowned_crypt:['arrival','cloister','nave'],hollow_reeds:['fork','boats','grove'],spawn_pools:['cistern','brood'],ritual_site:['stalls','gallery','boss'],marshcamp:['arrival']};
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding']});
 const page=await browser.newPage({viewport:{width:1600,height:1050}}),errors=[],captures=[],profiles=[];
 fs.mkdirSync(dir,{recursive:true});page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('http://127.0.0.1:8753/tests/act2_threshold_review.html');
  await page.waitForFunction(()=>window.act2ReviewDone,null,{timeout:120000});
  if(await page.locator('#error').innerText())throw Error(await page.locator('#error').innerText());
  for(const [zone,views] of Object.entries(scenes)){
   if(process.argv.some(a=>a.startsWith('--zone='))&&!process.argv.includes('--zone='+zone))continue;
   const width=process.argv.includes('--4k')?3840:1920;
   await page.evaluate(async({zone,width})=>{document.querySelector('#width').value=width;await act2AnimationReview.load('after',zone);},{zone,width});
   for(const view of views){
    const data=await page.evaluate(async view=>{
     const r=act2AnimationReview;document.querySelector('#view').value=view;document.querySelector('#view').dispatchEvent(new Event('change'));
     await new Promise(resolve=>requestAnimationFrame(resolve));r.game.state.time=10;r.render();
     return{image:r.win.document.querySelector('#view').toDataURL('image/webp',.94),errors:r.win.__errors};
    },view);
    if(data.errors.length)throw Error(data.errors.join('\n'));
    const name=`${zone}_${view}_${width}_${phase}.webp`;fs.writeFileSync(dir+'/'+name,Buffer.from(data.image.split(',')[1],'base64'));captures.push(name);
   }
   if(process.argv.includes('--profile')&&zone!=='marshcamp'){
    for(const mode of ['moving','combat']){
     await page.evaluate(zone=>act2AnimationReview.load('after',zone),zone);
     profiles.push({zone,width,...await page.evaluate(mode=>act2AnimationReview.sample(mode),mode)});
    }
   }
   console.log(zone,phase,'captured');
  }
  const reportPath=dir+`/report_${phase}${process.argv.includes('--4k')?'_4k':''}.json`;
  const previous=fs.existsSync(reportPath)?JSON.parse(fs.readFileSync(reportPath,'utf8')):{};
  fs.writeFileSync(reportPath,JSON.stringify({status:errors.length?'FAIL':'PASS',errors,captures,profiles:profiles.length?profiles:previous.profiles||[]},null,2)+'\n');
  if(errors.length)throw Error(errors.join('\n'));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
