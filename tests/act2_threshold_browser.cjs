const {chromium}=require('playwright');
const fs=require('node:fs');
const out='tests/qa/act2_thresholds';fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8753/tests/act2_threshold_review.html?zone=drowned_crypt&view=entry');
  await page.waitForFunction(()=>window.act2ReviewDone,{timeout:120000});
  const status=await page.evaluate(()=>({status:document.body.dataset.testStatus,error:document.querySelector('#error').textContent}));
  if(status.status!=='passed')throw Error(JSON.stringify(status));
  const captures=[],clicks=[];
  for(const width of (process.argv.includes('--all')?[1920,3840]:[1920]))for(const zone of ['drowned_crypt','hollow_reeds','weeping_marsh','spawn_pools','ritual_site','marshcamp']){
   await page.evaluate(w=>document.querySelector('#width').value=w,width);
   await page.evaluate(async z=>{await act2AnimationReview.load('after',z);},zone);
   const thresholds=await page.evaluate(()=>act2AnimationReview.game.state.map.thresholds);
   for(const version of (process.argv.includes('--all')?['before','after']:['after'])){
    await page.evaluate(async v=>act2AnimationReview.load(v,document.querySelector('#zone').value),version);
    for(const t of thresholds)for(const view of (process.argv.includes('--all')?['arrival','hover','foreground','combat']:['arrival'])){
     if(zone==='marshcamp'&&view==='combat')continue;
     const data=await page.evaluate(async({t,version,view})=>{
      const r=act2AnimationReview,g=r.game,s=g.state,m=s.map,N=r.api.TerrainNavigation;
      const after=version==='after',ex=after?m.exits.find(e=>e.thresholdId===t.id):m.exits.find(e=>e.target===(t.id==='landing_causeway'?(m.id==='marshcamp'?'weeping_marsh':'marshcamp'):t.type.endsWith('_in')?'weeping_marsh':({monastery_out:'drowned_crypt',reeds_out:'hollow_reeds',sluice_out:'spawn_pools',ritual_out:'ritual_site'})[t.type]));
      const o=after?t.opening:{x:(ex.x0+ex.x1)/2,y:(ex.y0+ex.y1)/2,height:50};
      let pos=after?{...t.arrival}:{x:o.x+1.5,y:o.y+2.5};
      if(view==='foreground')pos={x:o.x,y:o.y-.5};
      if(!r.api.TerrainSurface.supported(m,pos.x,pos.y,.36))pos={x:(ex.x0+ex.x1)/2,y:(ex.y0+ex.y1)/2};
      g.__act2.place(pos.x,pos.y);g.__act2.setMouse(-1000,-1000);s.time=10;
      if(view==='combat'){
       const a=after?t.approach:o;pos={x:a.x,y:a.y+3};
       if(r.api.TerrainSurface.supported(m,pos.x,pos.y,.36))g.__act2.place(pos.x,pos.y);
       const ids=s.monsters.filter(a=>!a.beacon&&!a.encounter&&!a.isBoss&&!a.dead).slice(0,4);
       ids.forEach((mon,i)=>{const q={x:g.state.player.x+(i%2?2:-2),y:g.state.player.y+2+Math.floor(i/2)};if(r.api.TerrainSurface.supported(m,q.x,q.y,.36)){Object.assign(mon,q);mon.aggro=true;mon.hp=mon.maxHp=100000;}});
       if(ids.length)s.player.command={type:'attack',target:ids[0],skill:'basic',hold:true};
       for(let i=0;i<45;i++){g.__act2.update(1/60);g.__act2.updateCamera(1/60);}
      }
      if(view==='hover'){const c=g.__act2.camera();g.__act2.setMouse(r.api.U.isoX(o.x,o.y)-c.x,r.api.U.isoY(o.x,o.y)-c.y-20);}
      g.__act2.render();
      return{image:r.win.document.querySelector('#view').toDataURL('image/webp',.95),hover:g.__act2.hoveredExit()?.target,position:{x:s.player.x,y:s.player.y},errors:r.win.__errors};
     },{t,version,view});
     if(data.errors.length)throw Error(data.errors.join('\n'));
     const name=`${zone}_${t.type}_${width}_${version}_${view}.webp`;
     fs.writeFileSync(out+'/'+name,Buffer.from(data.image.split(',')[1],'base64'));captures.push({zone,type:t.type,width,version,view,name,hover:data.hover,position:data.position});
    }
   }
   console.log('Captured',zone,width);
  }
  fs.writeFileSync(out+'/captures.json',JSON.stringify({status:'PASS',captures},null,2));
  if(errors.length)throw Error(errors.join('\n'));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
