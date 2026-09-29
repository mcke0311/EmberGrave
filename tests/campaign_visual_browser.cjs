// Production renderer; temporary hero and in-memory storage inherited from review.
const fs=require('node:fs'),{chromium}=require('playwright');
const zones=JSON.parse(fs.readFileSync('tests/qa/campaign_visual/zones.json')).flat();
const out='tests/qa/campaign_visual',phase=process.argv[2]||'after';
const selected=process.argv.find(x=>x.startsWith('--zone='))?.split('=')[1];
const selectedZones=selected?selected.split(','):zones;
if(selectedZones.some(z=>!zones.includes(z)))throw Error('Unknown campaign area');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding']});
 const page=await browser.newPage({viewport:{width:1920,height:1200}}),errors=[],captures=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('http://127.0.0.1:8741/tests/campaign_visual_review.html');
  await page.waitForFunction(()=>window.campaignReview&&['passed','failed'].includes(document.body.dataset.testStatus),null,{timeout:180000});
  if(await page.locator('#error').innerText())throw Error(await page.locator('#error').innerText());
  const widths=process.argv.includes('--phone')?[844]:process.argv.includes('--1080')?[1920]:[1920,3840];
  for(const zone of selectedZones)for(const width of widths){
   await page.evaluate(async({zone,width,phase})=>{document.getElementById('width').value=width;await campaignReview.load(phase,zone);},{zone,width,phase});
   const views=await page.evaluate(()=>{
    const opts=[...document.querySelector('#view').options].map(x=>x.value);
    const desired=['arrival',...opts.filter(x=>!['arrival','center','entry','gate'].includes(x)&&!x.startsWith('exit_')).slice(0,2)];
    if(opts.includes('boss'))desired.push('boss');
    desired.push(...opts.filter(x=>x.startsWith('exit_')));
    return [...new Set(desired)];
   });
   for(const view of views){
    const data=await page.evaluate(view=>{document.getElementById('view').value=view;campaignReview.showView();campaignReview.game.state.time=10;campaignReview.game.__frontier.render();return campaignReview.win.document.getElementById('view').toDataURL('image/webp',.91);},view);
    const name=`${phase}_${zone}_${view}_${width}.webp`;
    fs.writeFileSync(out+'/'+name,Buffer.from(data.split(',')[1],'base64'));captures.push({zone,view,width,name});
   }
   console.log(phase,zone,width,views.length+' scenes');
  }
  fs.writeFileSync(`${out}/captures_${phase}${selected?selectedZones.length===1?'_'+selected:'_subset':''}${widths[0]===844?'_phone':''}.json`,JSON.stringify({errors,captures},null,2));
  if(errors.length)throw Error(errors.join('\n'));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
