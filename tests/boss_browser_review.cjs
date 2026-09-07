// Production render/skill smoke scenes with isolated saves, plus review captures.
const {chromium}=require('playwright');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const width=+(process.argv.find(a=>a.startsWith('--width='))?.slice(8)||1920);
 const motion=process.argv.includes('--motion')?'no-preference':'reduce';
 const report={browser:browser.version(),width,motion,checks:[],errors:[],missing:[]};
 try{
  const page=await browser.newPage({viewport:{width:width+32,height:Math.round(width*9/16)+220},reducedMotion:motion});
  page.on('pageerror',e=>report.errors.push(e.message));
  page.on('response',r=>{if(r.status()===404)report.missing.push(r.url());});
  await page.goto('http://localhost:8741/tests/boss_encounters.html');
  await page.waitForFunction(()=>window.bossQA&&!document.querySelector('#status').textContent.startsWith('Loading'),null,{timeout:90000});
  await page.evaluate(({width})=>{const frame=document.querySelector('iframe');frame.style.width=width+'px';frame.style.height=Math.round(width*9/16)+'px';},{width});
  const sceneDir=`tmp/boss_refinement/scenes/${width}_${motion}`;
  fs.mkdirSync(sceneDir,{recursive:true});
  if(process.argv.includes('--check'))report.poseChecks=await page.evaluate(()=>window.bossQA.check());
  const bosses=['korvath','mire_mother','azram','empty_archangel','malthoron','vethriss'];
  for(const id of bosses){
   for(const classId of process.argv.includes('--captures-only')?[]:['vanguard','emberwitch','gravebinder','wildkeeper','veilranger']){
    const result=await page.evaluate(async({id,classId})=>{
      const q=window.bossQA,{state:s,boss:m,player:p,loadout}=await q.setup(id,classId);q.setPaused(true);
      q.api.Game.debugFlags.god=true;
      p.command={type:'attack',target:m,skill:loadout.main,hold:true};q.advance(2);
      const steps=[];
      for(let phase=0;phase<m.encounter.config.phases.length;phase++){
       if(phase)m.encounter.phaseChange(phase);
       for(const attack of new Set(m.encounter.config.rotations[phase]))for(let variation=0;variation<(attack==='memory'?2:1);variation++){
        m.encounter.start(attack,p);
        let lastAttack=null;
        for(let t=0;t<9&&['windup','execute'].includes(m.encounter.stage);t+=.05){
          const a=m.encounter.attack;
          if(a!==lastAttack){steps.push({phase,id:a.id,step:a.stepIndex});lastAttack=a;}
          q.advance(.05);
        }
       }
      }
      if(q.frame.contentWindow.bossErrors.length)throw Error(q.frame.contentWindow.bossErrors.join('\n'));
      return {boss:id,class:classId,army:s.minions.filter(m=>!m.dead).length,phase:m.encounter.phase,rendered:true,steps};
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
    await page.frameLocator('iframe').locator('#view').screenshot({path:`${sceneDir}/${id}_${phase}.png`});
    if(phase>0&&['korvath','empty_archangel','vethriss'].includes(id)){
      await page.evaluate(({id})=>{
       const q=window.bossQA,{state:s}=q.api.Game,m=s.monsters.find(m=>m.encounter),e=m.encounter;
       e.start(id==='korvath'?'fissure':id==='empty_archangel'?'descent':e.phase===1?'decoys':'memory',s.player);
       e.execute();q.advance(e.attack.duration+.025);q.render();
      },{id});
      await page.frameLocator('iframe').locator('#view').screenshot({path:`${sceneDir}/${id}_${phase}_followup.png`});
    }
    if(id==='malthoron'&&phase===2)for(let sweep=0;sweep<2;sweep++){
      const direction=await page.evaluate(()=>{
        const q=window.bossQA,s=q.api.Game.state,m=s.monsters.find(m=>m.encounter);
        m.encounter.start('beam',s.player);m.encounter.execute();q.advance(.6);
        return m.encounter.attack.sweepDirection;
      });
      await page.frameLocator('iframe').locator('#view').screenshot({path:`${sceneDir}/malthoron_2_sweep_${direction}.png`});
    }
    if(id==='mire_mother'&&phase===1){
      await page.evaluate(()=>{const q=window.bossQA,s=q.api.Game.state,e=s.monsters.find(m=>m.encounter).encounter;e.start('grasp',s.player);e.execute();q.advance(.25);});
      await page.frameLocator('iframe').locator('#view').screenshot({path:`${sceneDir}/mire_mother_1_opening.png`});
    }
    if(id==='azram'&&phase===1){
      await page.evaluate(()=>{const q=window.bossQA,s=q.api.Game.state,e=s.monsters.find(m=>m.encounter).encounter;for(const portal of [...e.owned])if(portal.encounterKind==='portal')portal.takeDamage(1e9,s.player);q.render();});
      await page.frameLocator('iframe').locator('#view').screenshot({path:`${sceneDir}/azram_1_opening.png`});
    }
   }
   console.log('PASS production scenes',id);
  }
  if(report.errors.length||report.missing.length)throw Error([...report.errors,...report.missing].join('\n'));
  report.sceneDirectory=sceneDir;
  report.passed=true;
 }finally{
  fs.writeFileSync(`tests/qa/bosses/refinement_${process.argv.includes('--captures-only')?'capture':'browser'}_${width}_${motion}.json`,JSON.stringify(report,null,2)+'\n');await browser.close();
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
