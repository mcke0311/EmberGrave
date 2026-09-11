// Render and click every Act I dungeon/mountain entrance and its return exit.
// Uses the existing review's in-memory save store; run with the server on 8755.
const {chromium}=require('playwright');
const fs=require('node:fs');
const dir='tests/qa/act1_passages';
const passages=[['north_wild',1],['north_wild',2],['north_wild',3],['north_wild',4],
  ['mines',0],['shattered_temple',0],['shardpeak_shrine',0],['deepfreeze_cavern',0]];
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const errors=[],results=[];fs.mkdirSync(dir,{recursive:true});
 try{
  const page=await browser.newPage({viewport:{width:1600,height:1050}});
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8755/tests/act1_environment_review.html?zone=north_wild');
  await page.waitForFunction(()=>window.act1Review&&document.body.dataset.testStatus==='passed',null,{timeout:120000});
  for(const width of [1920,3840])for(const [zone,index] of passages){
   const view=await page.evaluate(async({width,zone,index})=>{
    document.querySelector('#width').value=width;await act1Review.load('after',zone);
    const r=act1Review,g=r.game,m=g.state.map,t=m.thresholds[index];
    g.state.flags.fn_temple_open=true;g.state.monsters=[];
    const start={x:t.arrival.x+(t.axis?2:0),y:t.arrival.y+(t.axis?0:2)};
    const {U,TerrainSurface:S,TerrainNavigation:N}=r.win.eval('({U,TerrainSurface,TerrainNavigation})');
    if(!S.supported(m,start.x,start.y,.36)||!N.findPath(m,start,t.approach,{radius:.36,speed:4.5}))throw Error('No clear approach: '+zone+'/'+index);
    g.__frontier.place(start.x,start.y);g.__frontier.render();
    const canvas=r.win.document.querySelector('#view'),frame=document.querySelector('iframe'),rect=frame.getBoundingClientRect(),scale=rect.width/frame.clientWidth;
    const x=U.isoX(t.x,t.y)-U.isoX(start.x,start.y)+canvas.width/2;
    const y=U.isoY(t.x,t.y)-U.isoY(start.x,start.y)+(S.heightAt(m,start.x,start.y)-S.heightAt(m,t.x,t.y))*14+canvas.height/2+20-t.opening.height-14;
    return {image:canvas.toDataURL('image/webp',.92),click:{x:rect.left+x*scale,y:rect.top+y*scale},target:m.exits[index].target,
      start,approach:t.approach,threshold:{x:t.x,y:t.y,axis:t.axis},returnKey:m.exits[index].spawnKey};
   },{width,zone,index});
   fs.writeFileSync(`${dir}/${zone}_${index}_${width}.webp`,Buffer.from(view.image.split(',')[1],'base64'));delete view.image;
   await page.mouse.move(view.click.x,view.click.y);
   await page.evaluate(()=>act1Review.game.__frontier.render());
   await page.mouse.click(view.click.x,view.click.y);
   const command=await page.evaluate(()=>{const p=act1Review.game.state.player;return {type:p.command?.type,path:p.path?.length,target:p.command?.obj};});
   if(command.type!=='interact'||!command.path)throw Error(`Door click missed ${zone}/${index}: ${JSON.stringify(command)}`);
   for(let step=0;step<50;step++){
    const current=await page.evaluate(zone=>{const g=act1Review.game;for(let j=0;j<10&&g.state.map.id===zone;j++)g.__frontier.update(.05);return g.state.map.id;},zone);
    if(current===view.target)break;
    await page.waitForTimeout(50);
   }
   const arrived=await page.evaluate(()=>{
    const r=act1Review,g=r.game,m=g.state.map,p=g.state.player,{TerrainSurface:S}=r.win.eval('({TerrainSurface})');
    g.__frontier.render();
    return {zone:m.id,supported:S.supported(m,p.x,p.y,.36),position:{x:p.x,y:p.y},errors:r.win.__errors};
   });
   if(arrived.zone!==view.target||!arrived.supported||arrived.errors.length)throw Error('Travel failed: '+JSON.stringify({zone,index,arrived}));
   const expected=await page.evaluate(key=>act1Review.game.state.map.spawns[key],view.returnKey);
   if(Math.hypot(expected.x-arrived.position.x,expected.y-arrived.position.y)>.1)throw Error('Incorrect destination spawn');
   results.push({zone,index,width,...view,arrived});console.log('PASS',zone,index,width,'->',arrived.zone);
  }
  if(errors.length)throw Error(errors.join('\n'));
  fs.writeFileSync(dir+'/browser.json',JSON.stringify({status:'PASS',errors,results},null,2)+'\n');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
