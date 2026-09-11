const {chromium}=require('playwright');
const fs=require('node:fs');
const out='tests/qa/act1_animation';
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding']});
 const errors=[],cases=[];
 try{
  const page=await browser.newPage({viewport:{width:1920,height:1390},deviceScaleFactor:1});page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8741/tests/act1_animation_review.html');
  await page.waitForFunction(()=>window.act1Review||document.body.dataset.testStatus==='failed',null,{timeout:180000});
  const problem=await page.locator('#error').textContent();if(problem)throw Error(problem);
  const roster=await page.evaluate(()=>Object.entries(act1Review.api.DATA.ACT1_ANIMATIONS).filter(([id])=>!location.search.includes('none')));
  for(const width of [1920,3840])for(const reduced of [false,true]){
   if(process.argv.includes('--partial')&&reduced)continue;
   await page.emulateMedia({reducedMotion:reduced?'reduce':'no-preference'});await page.selectOption('#width',String(width));
   await page.waitForFunction(w=>act1Review.win.document.getElementById('view').width===w,width);
   for(const [id,spec]of roster){if(process.argv.includes('--partial')&&id!=='frost_wyrm')continue;
    for(const kind of spec.sequences)for(const facing of [0,Math.PI]){
     if(process.argv.includes('--available')&&!spec.clips[kind])continue;
     const wantCapture=!reduced&&facing===0&&['frost_wyrm','frost_archer','frost_risen','hoarfang','barb_axe','barb_pole','barb_sword','korvath','beacon'].includes(id);
     const r=await page.evaluate(({id,kind,facing,wantCapture})=>{
      const r=act1Review,m=r.preview(id,kind,facing),frames=new Set();let capture=null;
      const times=kind.startsWith('death')?(m.def.deathBurst?[.01,.23,.45,.63,.75,.87]:[.01,.11,.21,.31,.41,.51]):[.01,.23,.45,.61,.84,1.07];let last=0;
      for(const t of times){r.step(t-last);last=t;const a=m.pose().ex.act1Animation;if(a){frames.add(a.frame);if(wantCapture&&a.frame=== (kind.startsWith('death')?5:3)&&!capture)capture=r.win.document.getElementById('view').toDataURL('image/webp',.9);}}
      const time=r.game.state.time,a=JSON.stringify(m.pose().ex.act1Animation);r.render();r.render();
      const assets=r.api.SpriteAssets,g=assets.actorGeometry(m.spriteOpts,m.pose(),0,0,1.1),sh=g.shape;
      if(!(g.right>g.left&&g.bottom>g.top)||!sh)throw Error('Empty picking geometry '+id);
      let bit=0;while(bit<sh.cols*sh.rows&&!(parseInt(sh.bits.slice((bit>>3)*2,(bit>>3)*2+2),16)&1<<(bit&7)))bit++;
      // Edge cells can extend beyond the tight alpha bounds. Test the part of
      // the occupied cell inside those bounds, as the production broad phase does.
      const cx=bit%sh.cols*sh.cell,cy=Math.floor(bit/sh.cols)*sh.cell;
      const x=(Math.max(cx,sh.bounds[0])+Math.min(cx+sh.cell,sh.bounds[2]))/2,y=(Math.max(cy,sh.bounds[1])+Math.min(cy+sh.cell,sh.bounds[3]))/2;
      if(!assets.hitTestGeometry(g,g.a*x+g.c*y+g.e,g.b*x+g.d*y+g.f)||assets.hitTestGeometry(g,g.left-2,g.top-2))throw Error('Picking mask mismatch '+id+' '+kind);
      m.flashT=.1;r.render();m.flashT=0;m.tint='#b595dc';r.render();m.tint=null;
      return {frames:[...frames].sort(),stable:r.game.state.time===time&&JSON.stringify(m.pose().ex.act1Animation)===a,capture,errors:r.win.act1Errors};
     },{id,kind,facing,wantCapture});
     if(r.frames.join()!=='0,1,2,3,4,5'||!r.stable||r.errors.length)throw Error(id+' '+kind+' '+JSON.stringify({...r,capture:undefined}));
     if(!reduced&&facing===0&&['frost_wyrm','frost_archer','frost_risen','hoarfang','barb_axe','barb_pole','barb_sword','korvath','beacon'].includes(id)&&r.capture)fs.writeFileSync(`${out}/${id}_${kind}_${width}.webp`,Buffer.from(r.capture.split(',')[1],'base64'));
     delete r.capture;cases.push({id,kind,width,reduced,facing,...r});
    }
   }
   console.log(width,reduced?'reduced':'full','PASS');
  }
  if(errors.length)throw Error(errors.join('\n'));fs.writeFileSync(`${out}/browser.json`,JSON.stringify({cases,errors},null,2));console.log('PASS',cases.length,'rendered animation/facing/resolution cases');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
