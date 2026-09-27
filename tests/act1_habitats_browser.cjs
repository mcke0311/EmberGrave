const {chromium}=require('playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
const dir='tests/qa/act1_habitats';fs.mkdirSync(dir,{recursive:true});
(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true});
  const page=await browser.newPage({viewport:{width:1960,height:1340}}),errors=[],captures=[],checks=[];
  page.on('pageerror',e=>errors.push(e.message));
  const save=async name=>{const url=await page.evaluate(()=>{propReview.api.render();return propReview.doc.querySelector('#view').toDataURL('image/webp',.94);});fs.writeFileSync(dir+'/'+name,Buffer.from(url.split(',')[1],'base64'));captures.push(name);};
  try{
    await page.goto('http://127.0.0.1:8768/tests/prop_overhaul.html');
    await page.waitForFunction(()=>document.body.dataset.ready==='true',null,{timeout:180000});
    await page.evaluate(()=>{const q=propReview;q.setAuto(false);q.game.state.seed=123;q.game.state.mapsCache={};q.game.state.monstersByMap={};q.game.state.groundByMap={};q.game.state.map=null;});
    for(const width of [1920,3840]){
      await page.setViewportSize({width:width+40,height:width*9/16+260});
      await page.evaluate(width=>{const q=propReview;document.querySelector('iframe').style.height=width*9/16+'px';q.win.innerWidth=width;q.win.innerHeight=width*9/16;q.win.dispatchEvent(new Event('resize'));},width);
      await page.evaluate(async()=>{const q=propReview;await q.travel('shardpeak_shrine');q.setAuto(false);q.game.state.monsters=[];q.game.state.npcs=[];});
      for(const type of ['memorial','prayer_flags','gatehouse','windbreak']){
        await page.evaluate(type=>{const q=propReview,s=q.game.state,pr=s.map.props.find(p=>p.artZone==='shardpeak'&&p.type===type);if(!pr)throw Error('Missing mountain landmark '+type);q.api.setCamera(pr.x,pr.y);q.api.render();},type);
        await save('shardpeak_'+type+'_'+width+'.webp');
      }
      await page.evaluate(async()=>{const q=propReview;await q.travel('mines');q.setAuto(false);const s=q.game.state;s.monsters=[];s.npcs=[];q.target=s.map.props.find(p=>p.behavior==='crystal');q.placeNear(q.target);});
      await save('crystal_ready_'+width+'.webp');
      await page.evaluate(()=>{const q=propReview;q.game.interact(q.target);q.step(.29);if(!q.target.broken)throw Error('Crystal contact did not break');q.step(.5);});
      await save('crystal_broken_'+width+'.webp');
      await page.evaluate(async()=>{
        const q=propReview,s=q.game.state;delete s.mapsCache.north_wild;delete s.monstersByMap.north_wild;
        await q.travel('north_wild');q.setAuto(false);s.monsters=[];s.npcs=[];
        q.target=s.map.props.find(p=>p.behavior==='wolf_den');q.placeNear(q.target);s.player.stats.maxHp=s.player.hp=1e6;
      });
      await save('den_boundary_'+width+'.webp');
      await page.evaluate(()=>{const q=propReview;q.step(6.05);if(q.game.state.monsters.filter(m=>m.denId===q.target.propId).length!==1)throw Error('Real boundary den failed to spawn a wolf');});
      await save('den_wolf_'+width+'.webp');
      // A native pointer click in the enlarged silhouette, outside the original
      // sprite rectangle, must still pick the den and begin the kick.
      const point=await page.evaluate(async()=>{
        const q=propReview;await q.travel('north_wild');q.setAuto(false);q.flat();
        q.target=q.add('family_site',{behavior:'wolf_den',propFamily:'den',propId:'browser:den',label:'Wolf Den',breakable:true,displayScale:1.75,spawnCooldown:6});
        const p=q.game.state.player;p.stats.maxHp=p.hp=1e6;q.api.render();
        const ground=q.api.screenPoint(q.target,true),frame=q.api.propSpriteFrame(q.target),b=q.props.bounds(frame,ground.x,ground.y,false,q.props.scale(q.target));
        const old=q.props.bounds(frame,ground.x,ground.y),x=b.x+b.w*.1,y=b.y+b.h*.72;
        if(x>=old.x)throw Error('QA click must be outside unscaled hit bounds');
        return {x,y,width:q.doc.querySelector('#view').width,height:q.doc.querySelector('#view').height};
      });
      await save('den_ready_'+width+'.webp');
      const frame=page.frames().find(f=>f.parentFrame()),box=await frame.locator('#view').boundingBox();
      await page.mouse.click(box.x+point.x*box.width/point.width,box.y+point.y*box.height/point.height);
      await page.evaluate(()=>{const q=propReview;q.step(.01);if(!q.game.state.player.action?.propInteraction)throw Error('Enlarged den pointer missed');q.step(.29);if(!q.target.broken)throw Error('Den kick did not commit');q.step(.5);});
      await save('den_broken_'+width+'.webp');
      await page.evaluate(()=>{
        const q=propReview;q.flat();q.target=q.add('grave',{behavior:'spider_nest',propFamily:'nest',propId:'browser:nest',breakable:true,label:'Spider Nest',ev:q.data.EVENTS.find(e=>e.id==='ev_amb4')});
        const random=q.win.Math.random;let first=true;q.win.Math.random=()=>{if(first){first=false;return .1;}return random();};
        try{q.game.breakProp(q.target);}finally{q.win.Math.random=random;}
        if(q.game.state.monsters.length!==1||q.game.state.monsters[0].defId!=='crypt_widow')throw Error('Nest failed to produce one spider');q.step(.5);q.api.render();
      });
      await save('nest_spider_'+width+'.webp');checks.push({width,enlargedPointer:true,crystalContact:true,spiderRendered:true});
      console.log('PASS habitat artwork and interactions at',width);
    }
    assert.deepEqual(errors,[]);assert.deepEqual(await page.evaluate(()=>propReview.errors),[]);
    fs.writeFileSync(dir+'/browser.json',JSON.stringify({status:'PASS',checks,errors,captures},null,2)+'\n');
    fs.writeFileSync(dir+'/gallery.html','<!doctype html><meta charset="utf-8"><title>Act I habitat review</title><style>body{background:#172028;color:#eee;font:16px system-ui;margin:24px}img{width:100%;max-width:1200px}figure{margin:24px 0}</style><h1>Act I habitats and Shardpeak</h1>'+captures.map(name=>'<figure><figcaption>'+name+'</figcaption><a href="'+name+'"><img loading="lazy" src="'+name+'"></a></figure>').join(''));
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
