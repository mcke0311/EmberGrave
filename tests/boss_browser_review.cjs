// Production render/skill smoke scenes with isolated saves, plus review captures.
const {chromium}=require('playwright');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const report={browser:browser.version(),checks:[],errors:[],missing:[]};
 try{
  const page=await browser.newPage({viewport:{width:1500,height:1130},reducedMotion:'reduce'});
  page.on('pageerror',e=>report.errors.push(e.message));
  page.on('response',r=>{if(r.status()===404)report.missing.push(r.url());});
  await page.goto('http://localhost:8741/tests/boss_encounters.html');
  await page.waitForFunction(()=>window.bossQA&&!document.querySelector('#status').textContent.startsWith('Loading'),null,{timeout:90000});
  fs.mkdirSync('tests/qa/bosses/scenes',{recursive:true});
  const bosses=['korvath','mire_mother','azram','empty_archangel','malthoron','vethriss'];
  for(const id of bosses){
   for(const classId of process.argv.includes('--captures-only')?[]:['vanguard','emberwitch','gravebinder','wildkeeper','veilranger']){
    const result=await page.evaluate(async({id,classId})=>{
      const q=window.bossQA,{state:s,boss:m,player:p,loadout}=await q.setup(id,classId);q.setPaused(true);
      q.api.Game.debugFlags.god=true;
      p.command={type:'attack',target:m,skill:loadout.main,hold:true};q.advance(2);
      for(let phase=1;phase<m.encounter.config.phases.length;phase++)m.encounter.phaseChange(phase);
      for(const attack of new Set(m.encounter.config.rotations.flat())){
        m.encounter.start(attack,p);q.advance(m.encounter.attack.windup+.1);q.advance(.5);
      }
      if(q.frame.contentWindow.bossErrors.length)throw Error(q.frame.contentWindow.bossErrors.join('\n'));
      return {boss:id,class:classId,army:s.minions.filter(m=>!m.dead).length,phase:m.encounter.phase,rendered:true};
    },{id,classId});
    report.checks.push(result);
   }
   const phases=await page.evaluate(id=>window.bossQA.api.DATA.BOSS_ENCOUNTERS[id].phases.length,id);
   for(let phase=0;phase<phases;phase++){
    await page.evaluate(async({id,phase})=>{
      const q=window.bossQA,{boss:m,player:p}=await q.setup(id,'vanguard',phase);q.setPaused(true);q.api.Game.debugFlags.god=true;
      const e=m.encounter;
      if(id==='malthoron'&&phase){q.advance(.35);}
      else if(id==='azram'&&phase){e.start('portals',p);q.advance(1.1);}
      else if(id==='vethriss'&&phase===1){e.start('decoys',p);q.advance(1.1);}
      else {e.start(e.config.rotations[phase][0],p);q.advance(.45);}
      q.render();
    },{id,phase});
    await page.frameLocator('iframe').locator('#view').screenshot({path:`tests/qa/bosses/scenes/${id}_${phase}.png`});
   }
   console.log('PASS production scenes',id);
  }
  if(report.errors.length)throw Error(report.errors.join('\n'));
  report.passed=true;
 }finally{
  fs.writeFileSync('tests/qa/bosses/'+(process.argv.includes('--captures-only')?'capture_review':'browser_review')+'.json',JSON.stringify(report,null,2)+'\n');await browser.close();
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
