const {chromium}=require('playwright'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const page=await browser.newPage({viewport:{width:1960,height:1200}}),errors=[],rows=[];
 page.on('pageerror',e=>errors.push(e.message));
 async function click(ground=false,button='left'){
  const point=await page.evaluate(ground=>{const q=propReview;return {...q.api.screenPoint(q.target,ground),width:q.doc.querySelector('#view').width,height:q.doc.querySelector('#view').height};},ground);
  const frame=page.frames().find(f=>f.parentFrame()),box=await frame.locator('#view').boundingBox();
  await page.mouse.click(box.x+point.x*box.width/point.width,box.y+point.y*box.height/point.height,{button});
 }
 try{
  await page.goto('http://127.0.0.1:8768/tests/prop_overhaul.html');await page.waitForFunction(()=>document.body.dataset.ready==='true',null,{timeout:180000});await page.evaluate(()=>propReview.setAuto(false));
  for(const [id,form] of [['vanguard',null],['emberwitch',null],['gravebinder',null],['wildkeeper',null],['veilranger',null],...['form_fang','form_brute','form_stone','form_apex'].map(f=>['wildkeeper',f])]){
   await page.evaluate(async({id,form})=>{
    const q=propReview;await q.game.newGame('Mouse review',id,false);await q.game.skipOpening();await q.travel('north_wild');q.flat();
    if(form)q.game.state.player.buffs.push({id:form,stats:{},until:q.game.state.time+100});
    q.target=q.add('frozen_remains',{propFamily:'frozen_traveler',searchable:true,interact:'search_remains'});q.api.render();
   },{id,form});
   await click();await page.evaluate(form=>{const q=propReview;q.step(.01);if(q.game.state.player.pose().state!=='search')throw Error('Mouse missed search');if(form&&q.win.eval('Player3D').drawOptions(q.game.state.player).playerVisual.form!==form)throw Error('Missing transformed hero');q.pending=q.game.state.player.action;},form);
   await click();await page.evaluate(()=>{const q=propReview;if(q.game.state.player.action!==q.pending)throw Error('Repeated real click restarted action');q.step(.30);if(q.target.searched)throw Error('Loot before contact');q.step(.04);if(!q.target.searched)throw Error('Missing search contact');q.api.render();q.step(.5);});
   // A ground click must cancel before contact through production input handling.
   for(const mode of ['movement','combat']){
    await page.evaluate(()=>{const q=propReview;q.game.state.ground=[];q.target=q.add('chest',{x:21.6,y:20.5,lootable:true});q.game.interact(q.target);q.step(.1);q.pending=q.target;q.target={type:'crate',x:17.5,y:20.5};});
    await click(true,mode==='combat'?'right':'left');await page.evaluate(()=>{const q=propReview;q.step(.5);if(q.pending.opened||q.game.state.player.action?.propInteraction)throw Error('Mouse cancellation failed');q.game.state.player.action=null;q.game.state.player.command=null;q.game.state.player.path=null;q.game.state.player.x=20.5;q.game.state.player.y=20.5;});
   }
   rows.push({class:id,form,search:true,repeatGuard:true,moveCancel:true,combatCancel:true});
  }
  for(const width of [1920,3840]){
   await page.setViewportSize({width:width+40,height:width*9/16+260});
   await page.evaluate(width=>{document.querySelector('iframe').style.height=width*9/16+'px';},width);
   const height=await page.evaluate(async width=>{
    const q=propReview,s=q.game.state;delete s.mapsCache.shardpeak_shrine;await q.travel('shardpeak_shrine');q.setAuto(false);s.monsters=[];
    q.win.innerWidth=width;q.win.innerHeight=width*9/16;q.win.dispatchEvent(new Event('resize'));
    const N=q.win.eval('TerrainNavigation');q.target=s.map.props.filter(p=>p.remainsSite).sort((a,b)=>N.height(s.map,b.x,b.y)-N.height(s.map,a.x,a.y))[0];
    q.placeNear(q.target);q.api.render();const h=N.height(s.map,q.target.x,q.target.y);if(h<=0)throw Error('Elevated review lacks raised ground');return h;
   },width);
   for(const phase of ['ready','contact','used']){
    if(phase==='contact'){await click();await page.evaluate(()=>{const q=propReview;q.step(.35);if(!q.target.searched)throw Error('Elevated click missed');});}
    if(phase==='used')await page.evaluate(()=>propReview.step(.5));
    const image=await page.evaluate(()=>{propReview.api.render();return propReview.doc.querySelector('#view').toDataURL('image/webp',.94);});fs.writeFileSync(`tests/qa/prop_overhaul/shardpeak_${phase}_${width}.webp`,Buffer.from(image.split(',')[1],'base64'));
   }
   rows.push({width,elevation:height,raisedSearch:true});
  }
  if(errors.length)throw Error(errors.join('\n'));
  const report={status:'PASS',rows,errors};fs.writeFileSync('tests/qa/prop_overhaul/mouse_input.json',JSON.stringify(report,null,2)+'\n');console.log('PASS real mouse: 9 class/form searches, repeated clicks, movement/combat cancellation, 1080p and 4K raised terrain');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
