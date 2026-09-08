/* Production-renderer visual QA. Uses the Cinders review's temporary saves. */
const fs=require('node:fs'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const catalog=JSON.parse(fs.readFileSync('assets/act5_animations/catalog.json','utf8'));
const out='tests/qa/act5_animation';fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding']});
 const errors=[],samples=[],captures=[];
 try{
  const page=await browser.newPage({viewport:{width:1600,height:1050}});page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8875/tests/cinders_review.html?enemies',{waitUntil:'load',timeout:60000});
  await page.waitForFunction(()=>window.cindersReview||document.body.dataset.testStatus==='failed',{timeout:120000});
  assert.equal(await page.locator('#error').textContent(),'');
  for(const width of [1920,3840]){
   await page.evaluate(async width=>{document.getElementById('width').value=width;await cindersReview.load('after','ash_wastes');document.getElementById('cooldowns').checked=false;},width);
   for(const [id,spec]of Object.entries(catalog.roster)){
    const result=await page.evaluate(async({id,kinds,width})=>{
     const r=cindersReview,[m]=await r.stageEnemy(id,'single'),A=r.win.eval('Act5EnemyAnimation'),S=r.win.eval('SpriteAssets');
     const checks=[];
     for(const kind of kinds)for(let frame=0;frame<6;frame++){
      const a=r.sampleAnimation(kind,frame);if(!a||a.id!==kind||a.frame!==frame)throw Error(id+' '+kind+' '+frame+' wrong pose: '+JSON.stringify(a));
      const geometry=S.actorGeometry(m.spriteOpts,m.pose());if(!geometry?.frame?.id.startsWith('actor.act5.'))throw Error(id+' fallback renderer');
      checks.push({kind,frame,asset:a.asset});
     }
     if(A.showsAttackRadius(m))throw Error(id+' visible attack indicators');
     // Capture the actual gameplay canvas at the final death pose.
     r.sampleAnimation('death',5);
     const canvas=r.win.document.getElementById('view'),cam=r.game.__cinders.camera(),U=r.api.U;
     const x=U.isoX(m.x,m.y)-cam.x,y=U.isoY(m.x,m.y)-cam.y-r.game.__cinders.surfaceLift(m.x,m.y);
     const crop=document.createElement('canvas');crop.width=480;crop.height=360;
     crop.getContext('2d').drawImage(canvas,x-240,y-240,480,360,0,0,480,360);
     return {checks,png:crop.toDataURL('image/png'),errors:r.win.__errors};
    },{id,kinds:spec.sequences,width});
    assert.deepEqual(result.errors,[]);samples.push({width,id,checks:result.checks});
    const name=`${width}_${id}_death.png`;fs.writeFileSync(out+'/'+name,Buffer.from(result.png.split(',')[1],'base64'));captures.push(name);
   }
   for(const id of ['cinder_hound','r55_knight','r84_warlord','flesh_engine']){
    const result=await page.evaluate(async id=>{
     const r=cindersReview,ms=await r.stageEnemy(id,'pack');r.readySpecials();
     for(let i=0;i<90;i++)r.game.__cinders.update(1/60);
     r.game.__cinders.render();return {count:ms.length,png:r.win.document.getElementById('view').toDataURL('image/png'),errors:r.win.__errors};
    },id);
    assert.deepEqual(result.errors,[]);assert.ok(result.count>0);
    const name=`${width}_${id}_pack.png`;fs.writeFileSync(out+'/'+name,Buffer.from(result.png.split(',')[1],'base64'));captures.push(name);
   }
   console.log('PASS all Act 5 frames and packs at',width);
  }
  const scope=await page.evaluate(async()=>{
   const r=cindersReview;await r.load('after','throne');const A=r.win.eval('Act5EnemyAnimation'),boss=r.game.state.monsters.find(m=>m.defId==='vethriss');
   if(!boss||A.eligible(boss)||!A.showsAttackRadius(boss))throw Error('Vethriss presentation changed');
   return {vethrissExcluded:true,indicatorsPreserved:true,errors:r.win.__errors};
  });assert.deepEqual(scope.errors,[]);assert.deepEqual(errors,[]);
  fs.writeFileSync(out+'/browser.json',JSON.stringify({status:'PASS',browser:browser.version(),samples,captures,scope,errors},null,2)+'\n');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
