const {chromium}=require('playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
const out='tests/qa/boss_pressure/cues';fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true}),report={checks:0,cases:[],errors:[]};
 try{
  for(const width of [1920,3840,844]){
   const page=await browser.newPage({viewport:{width:width+32,height:Math.round(width*9/16)+400},hasTouch:width===844,reducedMotion:width===844?'reduce':'no-preference'});
   page.on('pageerror',e=>report.errors.push(e.message));
   await page.goto('http://localhost:8741/tests/boss_encounters.html');await page.waitForFunction(()=>window.bossQA,null,{timeout:120000});
   const phases=await page.evaluate(()=>Object.fromEntries(Object.entries(bossQA.api.DATA.BOSS_ENCOUNTERS).map(([id,d])=>[id,d.phases.length])));
   for(const [id,count]of Object.entries(phases))for(let phase=0;phase<count;phase++){
    const result=await page.evaluate(async({id,phase,width})=>{
     const q=bossQA,{Game:G}=q.api,{boss:m,player:p,state:s}=await q.setup(id,'vanguard',phase);q.setPaused(true);
     q.frame.style.width=width+'px';q.frame.style.height=Math.round(width*9/16)+'px';
     const e=m.encounter;G.debugFlags.god=false;
     if(e.mechanic?.blocksDamage){
      const d=e.arena.devices.find(d=>d.required);p.x=d.x;p.y=d.y;
      while(d.orientation!==2){G.interact(d,p);q.advance(.26);}
      p.y+=3;e.start('sunbeam',p);q.advance(1.5);
      if(e.mechanic?.blocksDamage)throw Error('Mirror did not reflect');
     }
     document.getElementById('pressure').click();
     for(let t=0;e.attack?.id==='choir'&&t<4;t+=.05)q.advance(.05);
     if(!e.attack?.pressure||e.stage!=='windup')throw Error(`${id} phase ${phase}: pressure warning absent (${e.attack?.id}, ${e.stage})`);
     const shapes=JSON.stringify(e.attack.shapes);p.command={type:'move'};G.repath(p,p.x-3,p.y+2);q.advance(.2);q.render();
     if(JSON.stringify(e.attack.shapes)!==shapes)throw Error('Pressure warning retargeted');
     const result={id,phase,width,attack:e.attack.id,label:e.statusText(),cooldown:e.pressure.cooldown,shapes:e.attack.shapes,damage:m.def.dmg,image:q.frame.contentWindow.document.getElementById('view').toDataURL('image/webp',.9)};
     if(width===844){
      e.clearOwned();s.projectiles=[];p.command=p.path=null;
      const {U,BossEncounters:B,TerrainNavigation:N}=q.api,view=q.frame.contentWindow.document.getElementById('view'),cam=G.__bossReview.camera,r=view.getBoundingClientRect();
      let destination=null;
      for(let i=0;i<32&&!destination;i++){
       const point={x:p.x+Math.cos(i*Math.PI/16)*3.3,y:p.y+Math.sin(i*Math.PI/16)*3.3};
       const x=r.left+(U.isoX(point.x,point.y)-cam.x)*r.width/view.width,y=r.top+(U.isoY(point.x,point.y)-cam.y)*r.height/view.height;
       if(x<30||x>r.right-30||y<150||y>r.bottom-40||e.attack.shapes.some(sh=>B.contains(sh,point.x,point.y)))continue;
       if(!B.insideArena(e.arena,point.x,point.y,p.radius)||!B.footprint(s.map,point.x,point.y,p.radius)||!N.segment(s.map,p.x,p.y,point.x,point.y,p.radius,1,p.surfaceId))continue;
       destination={x,y};
      }
      if(!destination)throw Error(`${id} has no visible touch escape`);
      G.touchTap(destination.x,destination.y);if(p.command?.type!=='move')throw Error(`${id}: touch did not queue ordinary walking`);
      const hp=p.hp,attack=e.attack;
      for(let t=0;t<3&&e.attack===attack&&['windup','execute'].includes(e.stage);t+=.025)q.advance(.025);
      if(p.hp<hp-.01)throw Error(`${id}: touch walking failed to dodge pressure`);
      result.touchEscape=true;
     }
     return result;
    },{id,phase,width});
    assert.ok(result.cooldown>0&&result.cooldown<=10);report.checks+=4+(result.touchEscape?2:0);
    fs.writeFileSync(`${out}/${id}_${phase}_${width}.webp`,Buffer.from(result.image.split(',')[1],'base64'));delete result.image;report.cases.push(result);
   }
   await page.close();console.log('PASS pressure cues',width);
  }
  assert.equal(report.errors.length,0,report.errors.join('\n'));report.passed=true;
  fs.writeFileSync(`${out}/summary.json`,JSON.stringify(report,null,2)+'\n');console.log('PASS',report.checks,'rendered pressure checks');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
