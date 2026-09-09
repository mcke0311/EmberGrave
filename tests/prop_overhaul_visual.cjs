const {chromium}=require('playwright'),fs=require('node:fs');
const dir='tests/qa/prop_overhaul';
const zones=['north_wild','weeping_marsh','desert_wastes','cathedral1','ash_wastes'];
const save=(name,url)=>fs.writeFileSync(dir+'/'+name,Buffer.from(url.split(',')[1],'base64'));
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding']});
 const page=await browser.newPage({viewport:{width:1960,height:1300}}),errors=[],captures=[],profiles=[];
 page.on('pageerror',e=>errors.push(e.message));
 if(process.argv.includes('--before'))for(const file of ['game','entities','mapgen'])await page.route('**/js/'+file+'.js*',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('tmp/prop_overhaul/'+file+'_before.js','utf8')}));
 try{
  await page.goto('http://127.0.0.1:8768/tests/prop_overhaul.html');await page.waitForFunction(()=>document.body.dataset.ready==='true',null,{timeout:180000});
  await page.evaluate(()=>propReview.setAuto(false));
  await page.evaluate(()=>{const q=propReview,s=q.game.state;s.seed=12345;s.mapsCache={};s.monstersByMap={};s.groundByMap={};s.map=null;});
  const widths=process.argv.includes('--4k')?[3840]:[1920];
  for(const width of widths){
   if(!process.argv.includes('--before')&&!process.argv.includes('--profile')){
    for(const [act,zone] of zones.entries()){
     const image=await page.evaluate(({width,zone,act})=>{
      const q=propReview,canvas=document.createElement('canvas');canvas.width=width;canvas.height=width*9/16;const c=canvas.getContext('2d'),scale=width/1920;
      c.scale(scale,scale);c.fillStyle=['#26343b','#25312b','#443c30','#302d39','#372923'][act];c.fillRect(0,0,1920,1080);c.fillStyle='#ecdfc8';c.font='28px Georgia';c.fillText('ACT '+(act+1)+' · Interactable prop states',50,50);
      c.font='15px system-ui';c.fillText('Ready     →     Contact     →     Used / depleted     ·     Painted art at 1.5× gameplay size',50,82);
      Object.keys(q.props.FRAMES).forEach((family,i)=>{
       const x=50+(i%5)*375,y=300+Math.floor(i/5)*400;
       c.fillStyle='#ecdfc8';c.font='22px Georgia';c.fillText(family[0].toUpperCase()+family.slice(1),x,y-190);
       for(let state=0;state<3;state++){
        const pr={type:family,seed:14,x:0,y:0,...(family==='shrine'?{interact:'shrine'}:{}),...(state?{propEffect:{at:10},...(family==='grave'?{searched:true}:['chest','strongbox'].includes(family)?{opened:true}:['barrel','crate','urn'].includes(family)?{broken:true}:{spent:family!=='shrine'})}:{})};
        const s={time:state===1?10.10:12,map:{id:zone},shrines:state&&family==='shrine'?[zone]:[]};
        c.save();c.translate(x+48+state*111,y);c.scale(1.5,1.5);q.props.draw(c,pr,s,0,0,{scale:1});q.props.drawEffects(c,pr,s,0,0,q.props.frame(pr,s),false);c.restore();
       }
      });return canvas.toDataURL('image/webp',.94);
     },{width,zone,act});const name='act'+(act+1)+'_states_'+width+'.webp';save(name,image);captures.push(name);
    }
    const extra=await page.evaluate(width=>{
     const q=propReview,c=document.createElement('canvas');c.width=width;c.height=width*9/16;const ctx=c.getContext('2d');ctx.scale(width/1920,width/1920);ctx.fillStyle='#26323a';ctx.fillRect(0,0,1920,1080);ctx.fillStyle='#ecdfc8';ctx.font='28px Georgia';ctx.fillText('Frozen remains and world events · ready / searched / exhausted',45,50);
     Object.entries(q.props.EXTRA).forEach(([family,frames],i)=>{const x=60+(i%3)*620,y=280+Math.floor(i/3)*340;ctx.fillStyle='#e5d7bd';ctx.font='22px Georgia';ctx.fillText(family.replaceAll('_',' '),x,y-140);for(let n=0;n<2;n++){ctx.save();ctx.translate(x+110+n*210,y);q.sprites.drawFrame(ctx,q.sprites.getFrame('world.props.remains_events',frames[n]),0,0,{scale:2});ctx.restore();}});return c.toDataURL('image/webp',.94);
    },width);save('remains_events_'+width+'.webp',extra);captures.push('remains_events_'+width+'.webp');
    const boards=await page.evaluate(async width=>{
     const {createCharacterRenderer}=await import('/js/character3d.mjs'),{resolveCharacterVisual}=await import('/js/character_catalog3d.mjs');
     const r=createCharacterRenderer(),out=[];for(const [id,form] of [['vanguard',null],['emberwitch',null],['gravebinder',null],['wildkeeper',null],['veilranger',null],...['form_fang','form_brute','form_stone','form_apex'].map(f=>['wildkeeper',f])]){
      const c=document.createElement('canvas');c.width=width;c.height=width*9/16;const ctx=c.getContext('2d');ctx.scale(width/1920,width/1920);ctx.fillStyle='#252d33';ctx.fillRect(0,0,1920,1080);ctx.fillStyle='#e4d3b5';ctx.font='30px Georgia';ctx.fillText((form||id)+' · Reach and search',50,65);
      const eq=resolveCharacterVisual(propReview.data,id,propReview.game.state.player.equip).equipment;
      for(const [row,state] of ['reach','search'].entries())for(const [col,t] of [0,.25,.5,.75,1].entries()){
       const x=200+col*370,y=490+row*475;ctx.save();ctx.translate(x,y);r.draw(ctx,{state,t,ang:.35,ex:{}},eq,{classId:id,form,scale:3});ctx.restore();ctx.fillStyle='#e4d3b5';ctx.font='18px system-ui';ctx.fillText(state+' '+Math.round(t*100)+'%',x-40,y+38);
      }out.push({name:form||id,url:c.toDataURL('image/webp',.94)});
     }r.dispose();return out;
    },width);
    for(const b of boards){const name='gesture_'+b.name+'_'+width+'.webp';save(name,b.url);captures.push(name);}
   }
   for(const zone of zones){
    await page.evaluate(async({zone,width,profile})=>{const q=propReview;q.win.Math.random=q.win.eval('U').rng(12345+q.win.eval('U').hash(zone));q.doc.defaultView.innerWidth=width;q.doc.defaultView.innerHeight=width*9/16;q.doc.querySelector('#view').width=width;q.doc.querySelector('#view').height=width*9/16;q.doc.defaultView.dispatchEvent(new Event('resize'));await q.travel(zone);q.setAuto(false);q.game.debugFlags.god=true;if(profile)q.placeNear(q.game.state.map.props.find(p=>p.interact==='shrine'));},{zone,width,profile:process.argv.includes('--profile')});
    if(process.argv.includes('--profile')){
     for(const mode of ['movement','combat']){
      const sample=await page.evaluate(mode=>{
       const q=propReview,s=q.game.state,p=s.player,N=q.win.eval('TerrainNavigation'),start={x:p.x,y:p.y},times=[];
       let target=s.monsters.find(m=>!m.dead&&m.surfaceId===p.surfaceId)||s.monsters.find(m=>!m.dead),attacks=0,moved=0;
       if(target){const spots=[[p.x+3,p.y],[p.x-3,p.y],[p.x,p.y+3]];const at=spots.find(([x,y])=>N.clear(s.map,x,y,.4));if(at){target.x=at[0];target.y=at[1];target.surfaceId=p.surfaceId;target.hp=target.maxHp=1e7;target.aggro=true;}}
       for(let n=0;n<270;n++){
        if(mode==='combat'&&target){p.command={type:'attack',target,skill:'basic',hold:true};}
        if(mode==='movement'&&n%45===0){const sign=n%90===0?1:-1;for(const [dx,dy] of [[sign*4,0],[0,sign*4],[-sign*4,0]])if(N.segment(s.map,p.x,p.y,start.x+dx,start.y+dy,p.radius)){p.command={type:'move',point:{x:start.x+dx,y:start.y+dy}};q.game.repath(p,start.x+dx,start.y+dy);break;}}
        const x=p.x,y=p.y,t=performance.now();q.api.update(1/60);q.api.render();const elapsed=performance.now()-t;if(n>=90)times.push(elapsed);moved+=Math.hypot(x-p.x,y-p.y);if(p.action?.state==='attack')attacks++;
       }times.sort((a,b)=>a-b);
       const terrain=q.win.eval('LevelTerrain');for(let i=0;i<30;i++)q.api.render();const first=terrain.getDiagnostics();for(let i=0;i<30;i++)q.api.render();const last=terrain.getDiagnostics();
       if(first.surfaceViewBuilds!==last.surfaceViewBuilds||first.totalBuilds!==last.totalBuilds)throw Error('Stationary terrain rebuilt');
       if(mode==='movement'&&moved<1||mode==='combat'&&attacks<10)throw Error('Benchmark did not exercise '+mode);
       return {median:times[90],p95:times[171],max:times.at(-1),moved,attackFrames:attacks,monsters:s.monsters.length,frames:times.length,seed:s.seed,terrainCacheStable:true};
      },mode);profiles.push({zone,width,mode,...sample});console.log(zone,width,mode,sample.median,sample.p95);
     }
    }else{
     for(const phase of ['ready','contact','used']){
      const image=await page.evaluate(phase=>{const q=propReview,s=q.game.state,pr=s.map.props.find(p=>p.remainsSite)||s.map.props.find(p=>p.interact==='shrine');if(phase==='contact'&&pr){q.placeNear(pr);q.game.interact(pr);q.step(pr.searchable?.34:.24);}if(phase==='used')q.step(.5);q.api.render();return q.doc.querySelector('#view').toDataURL('image/webp',.94);},phase);
      const name=zone+'_'+phase+'_'+width+'.webp';save(name,image);captures.push(name);
     }
    }
   }
  }
  const file=process.argv.includes('--profile')?'profile_'+(process.argv.includes('--before')?'before':'after')+'_'+widths[0]+'.json':'visual_'+widths[0]+'.json';
  fs.writeFileSync(dir+'/'+file,JSON.stringify({status:errors.length?'FAIL':'PASS',errors,captures,profiles},null,2)+'\n');if(errors.length)throw Error(errors.join('\n'));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
