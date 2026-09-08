const {chromium}=require('playwright'),fs=require('node:fs');
const out='tests/qa/cinders_enemies';fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding']});
 try{
  const page=await browser.newPage({viewport:{width:1600,height:1100}}),errors=[],captures=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8875/tests/cinders_review.html?enemies',{waitUntil:'load',timeout:60000});
  await page.waitForFunction(()=>window.cindersReview||document.body.dataset.testStatus==='failed',{timeout:120000});
  if(await page.locator('#error').textContent())throw Error(await page.locator('#error').textContent());
  for(const width of [1920,3840])for(const version of ['before','after']){
   await page.evaluate(async({width,version})=>{document.getElementById('width').value=width;await cindersReview.load(version,'ash_wastes');},{width,version});
   for(const [id,kind,distance]of [['r46_brute','slam',2],['r55_knight','charge',5],['r53_imp','leap',4],['r84_warlord','whirl',3],['r56_wraith','slam',2],['r70_knight','melee',1.3],['r74_robed','volley',7],['bone_dragon','ranged',7],['r58_imp','deathBurst',2]]){
    const info=await page.evaluate(async({id,kind,distance,version})=>{
     const r=cindersReview,ms=await r.stageEnemy(id,'single'),m=ms[0],g=r.game,p=g.state.player;
     g.__cinders.place(m.x+distance,m.y);m.aggro=true;m.attackCd=kind==='melee'||kind==='ranged'?0:100;
     for(const k of ['slam','charge','leap','whirl','volley','summon','heal','tele','throw'])m[k+'Cd']=k===kind?0:100;
     if(kind==='deathBurst')m.die(p);else for(let i=0;i<(['ranged','volley'].includes(kind)?34:12);i++)g.__cinders.update(1/60);
     g.__cinders.render();const warning=g.state.fx.find(x=>x.type==='enemywarning');
     if(version==='after'&&['slam','charge','leap','whirl','deathBurst'].includes(kind)&&!warning)throw Error(id+' missing '+kind+' warning');
     return {id,kind,warning:warning?{shape:warning.shape,duration:warning.maxTtl}:null,role:m.def.role,element:m.def.meleeElem||m.def.projectile?.elem||'physical',png:r.win.document.getElementById('view').toDataURL('image/png')};
    },{id,kind,distance,version});
    const name=`${width}_${version}_${id}_${kind}.png`;fs.writeFileSync(out+'/'+name,Buffer.from(info.png.split(',')[1],'base64'));delete info.png;captures.push({width,version,file:name,...info});
   }
   // Native pack staging remains within the real authored court.
   const pack=await page.evaluate(async()=>{const r=cindersReview,ms=await r.stageEnemy('cinder_hound','pack');for(let i=0;i<90;i++)r.game.__cinders.update(1/60);r.game.__cinders.render();return{count:ms.length,supported:ms.every(m=>r.api.TerrainSurface.supported(r.map,m.x,m.y,m.radius)),png:r.win.document.getElementById('view').toDataURL('image/png')};});
   if(pack.count!==4||!pack.supported)throw Error('Pack staging failed');
   const name=`${width}_${version}_cinder_hound_pack.png`;fs.writeFileSync(out+'/'+name,Buffer.from(pack.png.split(',')[1],'base64'));captures.push({width,version,file:name,id:'cinder_hound',kind:'pack',count:pack.count});
   console.log('Captured',width,version);
  }
  if(errors.length)throw Error(errors.join('\n'));
  fs.writeFileSync(out+'/visual.json',JSON.stringify({status:'PASS',browser:browser.version(),captures,errors},null,2)+'\n');
  console.log('PASS',captures.length,'enemy captures');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
