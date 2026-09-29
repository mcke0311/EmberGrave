// Retain every run's timing distribution summary. Do not filter slow frames or failing pairs.
const fs=require('node:fs'),crypto=require('node:crypto'),{chromium}=require('playwright');
const sourceRevision=crypto.createHash('sha256').update(['mapgen','level_terrain','game','town_terrain','sprite_manifest'].map(n=>fs.readFileSync('js/'+n+'.js','utf8')).join('\n')).digest('hex');
const zones=['north_wild','weeping_marsh','khal_palace','cathedral1','cinder_bastion'];
const chosen=process.argv.find(x=>x.startsWith('--zone='))?.split('=')[1];
const label=process.argv.find(x=>x.startsWith('--label='))?.split('=')[1];
if(label&&!/^[a-z0-9_]+$/.test(label))throw Error('Invalid evidence directory label');
const out='tests/qa/campaign_visual'+(label?'/'+label:''),runs=[],failures=[];
fs.mkdirSync(out,{recursive:true});
const widths=process.argv.includes('--1080')?[1920]:process.argv.includes('--4k')?[3840]:[1920,3840];
const modes=process.argv.includes('--combat')?['combat']:['moving','combat'];
const pairCount=+(process.argv.find(x=>x.startsWith('--pairs='))?.split('=')[1]||3);
const pacedWarmup=process.argv.includes('--paced');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding']});
 const page=await browser.newPage({viewport:{width:1920,height:1200}});
 try{
  await page.goto('http://127.0.0.1:8741/tests/campaign_visual_review.html');
  await page.waitForFunction(()=>window.campaignReview&&document.body.dataset.testStatus==='passed',null,{timeout:180000});
  for(const zone of chosen?[chosen]:zones)for(const width of widths)for(let pair=0;pair<pairCount;pair++)for(const version of pair%2?['after','before']:['before','after'])for(const mode of modes){
   const file=`${out}/profile_${zone}_${width}_${pair}_${version}_${mode}.json`;
   if(fs.existsSync(file)){
    const previous=JSON.parse(fs.readFileSync(file));
    if(process.argv.includes('--resume')&&previous.sourceRevision===sourceRevision&&!!previous.pacedWarmup===pacedWarmup){runs.push(previous);continue;}
    fs.copyFileSync(file,file.replace('.json','_retained_'+(previous.sourceRevision?.slice(0,12)||'initial')+'.json'));
   }
   try{
    await page.evaluate(async({width,zone,version})=>{document.getElementById('width').value=width;await campaignReview.load(version,zone);},{width,zone,version});
    if(version==='after'&&process.argv.includes('--no-added-lights'))await page.evaluate(()=>{
     const m=campaignReview.map,n=Math.min(8,m.campaignVisual.scenery.length);
     if(n)m.lights=m.lights.slice(0,-n);
    });
    if(version==='after'&&process.argv.includes('--no-added-scenery'))await page.evaluate(()=>{
     const m=campaignReview.map;m.campaignVisual={...m.campaignVisual,scenery:[]};
    });
    if(process.argv.includes('--preheat')&&pair===0)await page.evaluate(mode=>campaignReview.sample(mode,600),mode);
    const result=await page.evaluate(({mode,pacedWarmup})=>campaignReview.sample(mode,600,pacedWarmup),{mode,pacedWarmup});
    const row={zone,width,pair,version,sourceRevision,pacedWarmup,...result};runs.push(row);fs.writeFileSync(file,JSON.stringify(row,null,2));
    console.log(zone,width,pair,version,mode,JSON.stringify(result.cpuMs));
   }catch(e){failures.push({zone,width,pair,version,mode,error:String(e)});console.log('FAILED sample',zone,width,pair,version,mode,String(e));}
  }
  const comparisons=[];
  for(const zone of chosen?[chosen]:zones)for(const width of widths)for(const mode of modes){
   const selected=version=>runs.filter(r=>r.zone===zone&&r.width===width&&r.mode===mode&&r.version===version);
   const mean=(version,stat)=>{const a=selected(version);return a.reduce((s,r)=>s+r.cpuMs[stat],0)/a.length;};
   const before={median:mean('before','median'),p95:mean('before','p95')},after={median:mean('after','median'),p95:mean('after','p95')};
   comparisons.push({zone,width,mode,before,after,medianChange:(after.median/before.median-1)*100,p95Change:(after.p95/before.p95-1)*100,pass:selected('before').length===pairCount&&selected('after').length===pairCount&&after.median<=before.median*1.1&&after.p95<=before.p95*1.1});
  }
  const report={status:!failures.length&&comparisons.every(r=>r.pass)?'PASS':'FAIL',sourceRevision,pacedWarmup,method:`${pairCount} alternating before/after pairs, 600 ${pacedWarmup?'RAF-paced':'burst-paced'} warmup frames, 240 RAF-paced measured frames; real hero movement and attack exchange, full enemy roster, stable stationary terrain cache. CPU submission time, not GPU completion.`,diagnostic:process.argv.filter(a=>a.startsWith('--no-added')).join(',')||null,preheated:process.argv.includes('--preheat'),comparisons,failures,runs};
  const reportFile=`${out}/performance${chosen?'_'+chosen:''}.json`;
  if(fs.existsSync(reportFile)){
   const previous=JSON.parse(fs.readFileSync(reportFile));
   fs.copyFileSync(reportFile,reportFile.replace('.json','_retained_'+(previous.sourceRevision?.slice(0,12)||'initial')+'.json'));
  }
  fs.writeFileSync(reportFile,JSON.stringify(report,null,2));console.log(report.status,comparisons.length+' comparisons');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
