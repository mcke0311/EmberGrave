const {chromium}=require('playwright');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding']});
 const rows=[],errors=[],zones=process.argv.find(a=>a.startsWith('--zone='))?.split('=')[1].split(',')||['desert_wastes','underground_market','sand_tombs','khal_palace','shard_flats','tomb_sanctum'];
 const widths=process.argv.find(a=>a.startsWith('--width='))?.split('=')[1].split(',').map(Number)||[1920,3840];
 const selected=process.argv.find(a=>a.startsWith('--cases='))?.split('=')[1].split(','),paced=process.argv.includes('--paced');
 const tasks=widths.flatMap(width=>zones.flatMap(zone=>['moving','combat'].map(mode=>({width,zone,mode})))).filter(t=>!selected||selected.includes(`${t.zone}:${t.width}:${t.mode}`));
 try{
  const page=await browser.newPage({viewport:{width:1920,height:1280}});page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8743/tests/act3_review.html?zone=khal_palace',{waitUntil:'load',timeout:60000});
  await page.waitForFunction(()=>window.act3CombatReview?.game&&document.body.dataset.testStatus==='passed',null,{timeout:180000});
  for(const {width,zone,mode} of tasks)for(let pair=0;pair<2;pair++)for(const version of pair%2?['after','combat_before']:['combat_before','after']){
   await page.selectOption('#width',String(width));await page.evaluate(({version,zone})=>act3CombatReview.load(version,zone),{version,zone});
   const row=await page.evaluate(async({width,zone,mode,version,pair,paced})=>{
    const r=act3CombatReview,s=r.game.state,center=mode==='moving'?s.map.spawns.default:s.map.act3.landmarks.find(n=>n.id!=='entry'),p=s.player;
    r.game.debugFlags.act3Combat=false;r.game.__act3.place(center.x,center.y);p.hp=p.stats.maxHp=1e7;
    let pathEnds=null,toward=1;
    if(mode==='moving'){
     for(const [dx,dy] of [[6,0],[-6,0],[0,6],[0,-6]])if(!pathEnds&&r.api.TerrainNavigation.segment(s.map,p.x,p.y,p.x+dx,p.y+dy,p.radius))pathEnds=[{x:p.x,y:p.y},{x:p.x+dx,y:p.y+dy}];
     if(!pathEnds)throw Error('Missing movement lane '+zone);
     for(const m of s.monsters){m.aggro=false;m.def.sight=0;}
    }
    for(const m of s.monsters)m.hp=m.maxHp=1e7;
    const cpu=[],update=[],render=[];let distance=0,attackFrames=0,last={x:p.x,y:p.y};
    for(let i=0;i<330;i++){
     if(pathEnds&&(!p.path?.length||Math.hypot(p.x-pathEnds[toward].x,p.y-pathEnds[toward].y)<.5)){
      if(Math.hypot(p.x-pathEnds[toward].x,p.y-pathEnds[toward].y)<.5)toward=1-toward;
      r.game.repath(p,pathEnds[toward].x,pathEnds[toward].y);p.command={type:'move'};
     }
     const a=performance.now();r.game.__act3.update(1/60);r.game.__act3.updateCamera(1/60);const b=performance.now();r.render();const c=performance.now();
     if(i>=90){cpu.push(c-a);update.push(b-a);render.push(c-b);}
     distance+=Math.hypot(p.x-last.x,p.y-last.y);last={x:p.x,y:p.y};attackFrames+=s.monsters.filter(m=>['attack','cast'].includes(m.action?.state)).length;
     if(paced)await new Promise(resolve=>requestAnimationFrame(resolve));else if(i%30===0)await new Promise(resolve=>setTimeout(resolve,0));
    }
    const stats=v=>{v.sort((a,b)=>a-b);return{median:v[120],p95:v[228]};};
    if(mode==='moving'&&distance<5)throw Error('Inactive movement workload '+zone);
    if(mode==='combat'&&attackFrames<1)throw Error('Inactive combat workload '+zone);
    return{width,zone,mode,version,pair,cpu:stats(cpu),update:stats(update),render:stats(render),distance,attackFrames,monsters:s.monsters.length};
   },{width,zone,mode,version,pair,paced});rows.push(row);
   if(rows.length%8===0)console.log('Measured',rows.length,'workloads');
  }
  const comparisons=[];
  for(const {width,zone,mode} of tasks){
   const average=(version,key,stat)=>{const matches=rows.filter(r=>r.width===width&&r.zone===zone&&r.mode===mode&&r.version===version);return matches.reduce((n,r)=>n+r[key][stat],0)/matches.length;};
   const before={median:average('combat_before','cpu','median'),p95:average('combat_before','cpu','p95')},after={median:average('after','cpu','median'),p95:average('after','cpu','p95')};
   comparisons.push({width,zone,mode,before,after,change:after.median/before.median-1,passed:after.median<=before.median*1.1&&after.p95<=before.p95*1.1});
  }
  const report={status:errors.length?'FAIL':comparisons.every(r=>r.passed)?'PASS':'INVESTIGATE',browser:browser.version(),method:'Headless Chrome, two alternating pairs, 90 warmup plus 240 measured updates/renders at 60 Hz; actual map rosters and character movement; immutable local pre-pass runtime snapshot.',paced,rows,comparisons,errors};
  const name=paced?'combat_performance_paced.json':zones.length===6&&widths.length===2?'combat_performance.json':'combat_performance_'+zones.join('_')+'_'+widths.join('_')+'.json';
  fs.writeFileSync('tests/qa/act3/'+name,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,comparisons,errors},null,2));if(errors.length)process.exitCode=1;
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
