// Exercise the normal game renderer locally, or against GAME_REVIEW_URL.
const assert = require('node:assert/strict');
const {chromium} = require('playwright');
const {openHero} = require('./vanguard_command_browser.cjs');

async function checkBanner(page) {
  await page.evaluate(() => {
    const p = Game.state.player;
    p.lvl = 24; p.attr.wil = 100;
    p.skills = {recruit_shieldguard:1, recruit_bowman:1, recruit_standard_bearer:1};
    p.computeStats(); p.mana = p.stats.maxMana;
    for (const id of Object.keys(p.skills)) p.performSkill(id,null,p);
  });
  await page.waitForFunction(() => Game.state.player.companySoldiers().length === 3);
  return page.evaluate(async () => {
    const state = Game.state, hero = state.player;
    const byRole = Object.fromEntries(hero.companySoldiers().map(u => [u.kindId,u]));
    const {shieldguard:guard, bowman:bow, standard_bearer:standard} = byRole;
    const place = (unit,dx,dy) => {
      unit.x=hero.x+dx; unit.y=hero.y+dy; unit.surfaceId=hero.surfaceId;
      unit.path=null; unit.stunT=5;
    };
    place(standard,1.5,0); place(guard,0,2); place(bow,10,0);
    const ally = new Player('Party ally','wildkeeper');
    place(ally,1.5,2);
    const pet = {owner:ally, x:hero.x+1, y:hero.y, surfaceId:hero.surfaceId};
    const other = {owner:ally, x:hero.x+1, y:hero.y, surfaceId:1};
    const duplicate = Object.create(standard);
    const group = {...state,players:[hero,ally],minions:[standard,guard,bow,pet,other,duplicate]};
    const members = () => [...SkillVFX.bannerRecipients(group)];
    const normal = members();
    const base = normal.length===6 && [standard,guard,hero,ally,pet,duplicate].every(a => normal.includes(a));
    bow.x=standard.x+standard.auraRadius; bow.y=standard.y;
    const atEdge=members().includes(bow);
    bow.x+=.01;
    const outside=!members().includes(bow);
    standard.auraPulseUntil=group.time+3;
    const pulse=members().includes(bow);
    group.time+=3;
    const expired=!members().includes(bow);
    pet.dead=true;
    const deadExcluded=!members().includes(pet);
    standard.dead=true;
    const bearerDeath=members().length===0;
    standard.dead=false;
    hero.dead=true;
    const ownerDeath=members().length===0;
    hero.dead=false; standard.auraPulseUntil=0; place(bow,10,0);

    // Observe the foot markers in an ordinary animation frame on the game canvas.
    const proto=CanvasRenderingContext2D.prototype, stroke=proto.stroke, centers=new Set();
    let bearer=false;
    proto.stroke=function(...args){
      if(this.canvas.id==='view' && ['#ffdd90','#edd08a'].includes(this.strokeStyle)){
        const transform=this.getTransform();
        centers.add(Math.round(transform.e)+','+Math.round(transform.f));
        if(this.strokeStyle==='#ffdd90')bearer=true;
      }
      return stroke.apply(this,args);
    };
    try { await new Promise(resolve=>requestAnimationFrame(resolve)); }
    finally { proto.stroke=stroke; }
    return {base,atEdge,outside,pulse,expired,deadExcluded,bearerDeath,ownerDeath,bearer,feet:centers.size};
  });
}

async function checkWoods(page) {
  return page.evaluate(() => {
    const maps=['frosthaven_approach','north_wild','shardpeak_shrine'];
    const pixels=new Map();
    for(const name of ['east','east_alt','south','south_alt']){
      const id=SpriteAssets.maps.props['a1env_north_'+name], frame=SpriteAssets.getFrame(id,0);
      const cv=document.createElement('canvas'); cv.width=frame.sw; cv.height=frame.sh;
      const ctx=cv.getContext('2d');
      ctx.drawImage(frame.image,frame.sx,frame.sy,frame.sw,frame.sh,0,0,cv.width,cv.height);
      pixels.set(id,{frame,data:ctx.getImageData(0,0,cv.width,cv.height).data});
    }
    let edges=0,passages=0,walks=0;
    for(const zone of maps)for(const seed of [1,12345,4294967295]){
      const map=MapGen.generate(zone,seed);
      const banks=Act1Environment.describe(map,SpriteAssets.getFrame).filter(b=>pixels.has(b.assetId));
      const key=(x,y)=>Math.round(2*x)+','+Math.round(2*y);
      const lookup=new Map(banks.map(bank=>[key(bank.x,bank.y),bank]));
      const marked=new Set();
      let walked=false;
      for(const s of map.act1Environment.segments){
        if(s.kit!=='north')continue;
        for(let t=0;t<s.length;t++){
          const i=s.x+(s.axis?0:t)+(s.y+(s.axis?t:0))*map.w;
          marked.add(2*i+s.axis);
        }
        const centerX=s.x+(s.axis?0:s.length/2), centerY=s.y+(s.axis?s.length/2:0);
        const bank=lookup.get(key(centerX,centerY));
        const floorX=Math.floor(centerX-(s.axis?s.side*.5:0)),floorY=Math.floor(centerY-(s.axis?0:s.side*.5));
        if(!bank || map.walls[floorX+floorY*map.w] || !map.walls[Math.floor(bank.x)+Math.floor(bank.y)*map.w])
          throw Error(zone+' has an unmarked forest boundary at '+key(centerX,centerY));
        const {frame,data}=pixels.get(bank.assetId);
        // Check the painted alpha along the actual collision edge, including both joins.
        for(let i=0;i<=10;i++){
          const offset=s.length*(i/10-.5), dx=centerX+(s.axis?0:offset)-bank.x,dy=centerY+(s.axis?offset:0)-bank.y;
          const u=Math.round(frame.anchorX+U.isoX(dx,dy)/bank.scale),v=Math.round(frame.anchorY+U.isoY(dx,dy)/bank.scale);
          if(!(data[4*(u+v*frame.sw)+3]>128))throw Error(zone+' has a gap in its painted bank at '+key(centerX,centerY));
        }
        if(!walked && s.length>=3){
          const ox=centerX-(s.axis?s.side*.7:0), oy=centerY-(s.axis?0:s.side*.7);
          walked=TerrainNavigation.segment(map,ox,oy,ox+(s.axis?0:1),oy+(s.axis?1:0),.36) &&
            !TerrainNavigation.segment(map,ox,oy,bank.x,bank.y,.36);
        }
        edges++;
      }
      if(!walked)throw Error(zone+' missing a usable path beside a closed forest edge');
      walks++;
      for(let axis=0;axis<2;axis++)for(let y=axis?0:1;y<map.h;y++)for(let x=axis?1:0;x<map.w;x++){
        const i=x+y*map.w;
        if(!!map.walls[i]===!!map.walls[i-(axis?1:map.w)] || marked.has(2*i+axis))continue;
        if(zone==='frosthaven_approach' && x>87 && y<13)continue; // Town masonry at the gate.
        const doorway=map.thresholds.some(t=>{
          const depth=t.backing?3.5:2.5,width=t.backing?6.5:4.5;
          return Math.abs(x-t.x)<(t.axis?depth:width) && Math.abs(y-t.y)<(t.axis?width:depth);
        });
        if(!doorway)throw Error(zone+' has a bare wall between trees at '+x+','+y);
      }
      for(const t of map.thresholds){
        if(!TerrainNavigation.segment(map,t.arrival.x,t.arrival.y,t.approach.x,t.approach.y,.36))
          throw Error(zone+' has a blocked doorway '+t.id);
        passages++;
      }
    }
    return {maps,edges,passages,walks};
  });
}

async function main() {
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try{
    const context=await browser.newContext({viewport:{width:1200,height:760}});
    const {page,errors}=await openHero(context);
    const banner=await checkBanner(page);
    assert.deepEqual(banner,{base:true,atEdge:true,outside:true,pulse:true,expired:true,deadExcluded:true,bearerDeath:true,ownerDeath:true,bearer:true,feet:3});
    const woods=await checkWoods(page);
    assert.ok(woods.edges>0 && woods.passages>0);
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({banner,woods}));
  } finally { await browser.close(); }
}
if(require.main===module)main().catch(error=>{console.error(error);process.exitCode=1;});
