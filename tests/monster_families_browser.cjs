const {chromium}=require('playwright');
const fs=require('node:fs');
const out='tests/qa/monster_families';fs.mkdirSync(out,{recursive:true});
(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true});
  const errors=[],cases=[];
  try{
    const page=await browser.newPage({viewport:{width:1920,height:1400},deviceScaleFactor:1});
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:8741/tests/act1_animation_review.html');
    await page.waitForFunction(()=>window.act1Review||document.body.dataset.testStatus==='failed',null,{timeout:180000});
    const failure=await page.locator('#error').textContent();if(failure)throw Error(failure);
    for(const [zone,family] of [['north_wild','rimebound'],['north_wild','shardbound'],['north_wild','icefang'],['spawn_pools','mirebrood'],['cathedral1','hollow_order'],['ash_wastes','cinder_brood']]){
      const result=await page.evaluate(async({zone,family})=>{
        const r=act1Review;await r.game.enterMap('frosthaven','default');
        delete r.game.state.monstersByMap[zone];await r.game.enterMap(zone,'default');
        const s=r.game.state,t=s.map.ecology.territories.find(t=>t.family===family);
        if(!t)throw Error('Missing territory '+zone+'/'+family);
        s.player.x=t.x-3;s.player.y=t.y+3;s.player.hp=s.player.stats.maxHp=1e7;s.map.explored.fill(1);
        r.game.__act1Review.updateCamera(1);r.game.__act1Review.render();
        const site=s.map.props.find(p=>p.territoryId===t.id),live=s.monsters.filter(m=>t.packs.includes(m.packId));
        if(!live.length||live.some(m=>m.monsterFamily!==family||!m.familyHome))throw Error('Runtime family mismatch');
        if(site){const props=r.win.eval('PropInteractions'),frame=props.frame(site,s);if(!frame)throw Error('Missing habitat frame');}
        const before=r.win.document.getElementById('view').toDataURL('image/webp',.9);
        const initial=live.map(m=>({x:m.x,y:m.y}));
        for(let k=0;k<120;k++){s.time+=.1;for(const m of live)m.familyIdle(.1,s.map);}
        r.game.__act1Review.render();
        return {zone,family,count:live.length,site:site?.propFamily,moved:live.filter((m,i)=>Math.hypot(m.x-initial[i].x,m.y-initial[i].y)>.02).length,
          errors:r.win.act1Errors,before,after:r.win.document.getElementById('view').toDataURL('image/webp',.9)};
      },{zone,family});
      for(const phase of ['before','after']){fs.writeFileSync(`${out}/${zone}_${family}_${phase}.webp`,Buffer.from(result[phase].split(',')[1],'base64'));delete result[phase];}
      if(result.errors.length)throw Error(result.errors.join('\n'));cases.push(result);console.log('PASS',zone,family,result.count,'residents',result.moved,'moved');
    }
    if(errors.length)throw Error(errors.join('\n'));
    fs.writeFileSync(`${out}/browser.json`,JSON.stringify({cases,errors},null,2));
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
