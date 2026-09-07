const {chromium}=require('playwright'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true}),report={checks:[],errors:[]};
 try{
  const page=await browser.newPage({viewport:{width:1500,height:1000}});
  page.on('pageerror',e=>report.errors.push(e.message));
  for(const name of ['monster_targeting_contract','story_campaign']){
   await page.goto(`http://localhost:8741/tests/${name}.html`);
   await page.waitForFunction(()=>/PASS|FAIL/.test(document.querySelector('#result').textContent),null,{timeout:120000});
   const result=await page.locator('#result').textContent();
   if(!result.startsWith('PASS'))throw Error(result);
   report.checks.push({name,result});console.log(result);
  }
  await page.goto('http://localhost:8741/tests/boss_encounters.html');
  await page.waitForFunction(()=>window.bossQA,null,{timeout:90000});
  await page.evaluate(async()=>{await window.bossQA.setup('korvath','vanguard',1);window.bossQA.setPaused(true);});
  await page.selectOption('#sequence','fissure:0');await page.click('#preview');
  const first=await page.evaluate(()=>window.bossQA.api.Game.state.monsters.find(m=>m.encounter).encounter.attack.stepIndex);
  for(let i=0;i<5;i++)await page.click('#step');
  const second=await page.evaluate(()=>{const e=window.bossQA.api.Game.state.monsters.find(m=>m.encounter).encounter;return {step:e.attack.stepIndex,stage:e.stage};});
  if(first!==0||second.step!==1||second.stage!=='windup')throw Error('Preview/step controls did not advance the complete sequence');
  report.checks.push({name:'preview_controls',result:'PASS sequence selection, preview, and five quarter-second steps into the second warning.'});
  if(report.errors.length)throw Error(report.errors.join('\n'));report.passed=true;
 }finally{fs.writeFileSync('tests/qa/bosses/refinement_browser_regressions.json',JSON.stringify(report,null,2)+'\n');await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
