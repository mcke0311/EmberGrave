/* Painted world props. Simulation owns interaction clocks; drawing is read-only.
   Loot and corpse consumption are independent, expedition-local capabilities. */
const PropInteractions = (() => {
  const clamp=x=>Math.max(0,Math.min(1,x));
  const COLORS=['#c5e9f5','#b0c8ac','#e5c48c','#c8bfe8','#f0a066'];
  const glows=new Map(),spriteFrames=new Map();
  function glow(color){
    if(glows.has(color))return glows.get(color);
    const canvas=document.createElement('canvas');canvas.width=canvas.height=64;
    const ctx=canvas.getContext('2d'),g=ctx.createRadialGradient(32,32,0,32,32,32);
    g.addColorStop(0,color);g.addColorStop(.28,color+'99');g.addColorStop(1,color+'00');
    ctx.fillStyle=g;ctx.fillRect(0,0,64,64);glows.set(color,canvas);return canvas;
  }
  const FRAMES={shrine:[0,1],chest:[2,3,4],grave:[5,6,7],strongbox:[8,9,10],altar:[11,12],well:[13,14],pillar:[15,16],barrel:[17,18],crate:[19,20],urn:[21,22]};
  const EVENTS={undead:'barrow',beast:'den',insect:'nest',cultist:'ritual',demon:'sigil',barbarian:'camp'};
  const EXTRA={frozen_soldier:[0,1],frozen_traveler:[2,3],frozen_miner:[4,5],barrow:[6,7],den:[8,9],nest:[10,11],ritual:[12,13],sigil:[14,15],camp:[16,17]};
  const BODY_SITES={north_wild:[['watch','soldier'],['caravan','traveler']],mines:[['deep','miner']],shattered_temple:[['vigil','soldier']],shardpeak_shrine:[['shelter','traveler'],['windward','soldier']],deepfreeze_cavern:[['gallery','miner'],['shelf','traveler']]};
  function act(map){
    if(['frosthaven_approach','shardpeak_shrine','deepfreeze_cavern'].includes(map.id))return 1;
    if(['hollow_reeds','spawn_pools'].includes(map.id))return 2;
    return DATA.ACTS.find(a=>a.zones.includes(map.id))?.id||4;
  }
  function family(pr){
    if(pr.propFamily)return pr.propFamily;
    if(pr.ev?.kind==='ambush')return EVENTS[pr.ev.fam]||'barrow';
    if(pr.ev&&pr.type==='shrine')return pr.ev.kind==='buff'?'shrine':'altar';
    return pr.type;
  }
  function themed(pr){
    // Authored landmarks, town buildings and story silhouettes retain their art.
    return !pr.building&&!pr.storyId&&!pr.visual&&!pr.visualType&&!pr.artZone&&!pr.gate&&!!(FRAMES[family(pr)]||EXTRA[family(pr)]);
  }
  function terminal(pr,state){
    if(pr.type==='grave'&&pr.corpseConsumed)return 2;
    if(pr.broken||pr.searched||pr.spent||pr.opened||pr.completed)return 1;
    if(pr.interact==='shrine'&&state.shrines?.includes(state.map.id))return 1;
    return 0;
  }
  function sample(pr,state){
    const f=family(pr),frames=f==='shrine'&&pr.ev?[1,0]:FRAMES[f]||EXTRA[f];
    if(!frames||!themed(pr))return null;
    const ended=terminal(pr,state),age=state.time-(pr.propEffect?.at??-100);
    let index=ended?(frames.length===3&&f!=='grave'?2:Math.min(ended,frames.length-1)):0;
    if(ended&&frames.length===3&&f!=='grave'&&age<.18)index=1;
    const id=EXTRA[f]?'world.props.remains_events':'world.props.act'+act(state.map);
    return {id,index:frames[index],family:f,age,ended};
  }
  function sprite(id,index){
    const key=id+':'+index;if(spriteFrames.has(key))return spriteFrames.get(key);
    const raw=SpriteAssets.getFrame(id,index),b=DATA.SPRITE_MANIFEST.entries[id].hitShapes[index].bounds;
    const cropped={...raw,sx:raw.sx+b[0],sy:raw.sy+b[1],sw:b[2]-b[0],sh:b[3]-b[1],anchorX:raw.anchorX-b[0],anchorY:raw.anchorY-b[1],propCrop:true};
    spriteFrames.set(key,cropped);return cropped;
  }
  function frame(pr,state){const s=sample(pr,state);return s?sprite(s.id,s.index):null;}
  function bounds(frame,x,y,flip=false){
    if(frame.propCrop)return {x:x-(flip?frame.sw-frame.anchorX:frame.anchorX),y:y-frame.anchorY,w:frame.sw,h:frame.sh};
    const def=DATA.SPRITE_MANIFEST.entries[frame.id],shape=def.hitShapes?.[frame.index];
    const b=shape?.bounds||[0,0,frame.sw,frame.sh];
    return {x:x+(flip?frame.anchorX-b[2]:b[0]-frame.anchorX),y:y+b[1]-frame.anchorY,w:b[2]-b[0],h:b[3]-b[1]};
  }
  function prepare(map,seed){
    if(map.propsPrepared)return map;
    map.propsPrepared=true;
    const hub=['town','camp'].includes(map.zone.kind)||map.zone.opening;
    const graves=map.props.filter(p=>p.type==='grave'&&!p.storyId&&!p.event&&!p.ev&&!p.interact&&!p.breakable&&!p.building);
    if(!hub){
      graves.sort((a,b)=>((a.seed^seed)>>>0)-((b.seed^seed)>>>0));
      for(const p of graves.slice(0,3))Object.assign(p,{searchable:true,interact:'search_remains',label:'Disturbed Grave'});
    }
    for(const [site,kind] of BODY_SITES[map.id]||[]){
      const n=map.frontier?.landmarks.find(n=>n.id===site);
      if(!n)throw Error('Missing frozen remains landmark '+map.id+'/'+site);
      let point=null;
      // Search beside the landmark, never carve a tile or consume generation RNG.
      for(let r=4;r<=9&&!point;r++)for(let k=0;k<16&&!point;k++){
        const a=(k+((seed>>>0)%16))*Math.PI/8,x=Math.floor(n.x+Math.cos(a)*r)+.5,y=Math.floor(n.y+Math.sin(a)*r)+.5;
        if(!TerrainNavigation.clear(map,x,y,.5)||map.props.some(p=>Math.hypot(p.x-x,p.y-y)<2.5))continue;
        if(Object.values(map.spawns).some(p=>Math.hypot(p.x-x,p.y-y)<5)||map.exits.some(e=>x>e.x0-3&&x<e.x1+3&&y>e.y0-3&&y<e.y1+3))continue;
        if(map.frontier.reserved?.some(b=>x>b.x0-1&&x<b.x1+1&&y>b.y0-1&&y<b.y1+1))continue;
        if(nearRamp(map,x,y))continue;
        if(map.bossArena&&typeof BossEncounters!=='undefined'&&BossEncounters.insideArena(map.bossArena,x,y,-3))continue;
        point={x,y};
      }
      if(!point)throw Error('No safe frozen remains position '+map.id+'/'+site);
      map.props.push({type:'frozen_remains',propFamily:'frozen_'+kind,...point,blocks:false,searchable:true,interact:'search_remains',label:{soldier:'Frozen Watch Soldier',traveler:'Frozen Traveler',miner:'Frozen Miner'}[kind],seed:U.hash(map.id+site)^seed,remainsSite:site});
    }
    return map;
  }
  function nearRamp(map,x,y){
    return map.ramps?.some(r=>{
      if(Number.isFinite(r.x0))return x>r.x0-1&&x<r.x1+1&&y>r.y0-1&&y<r.y1+1;
      const dx=x-r.x,dy=y-r.y,along=dx*r.dx+dy*r.dy,across=Math.abs(dx*r.dy-dy*r.dx);
      return along>-2&&along<(r.length||4)+2&&across<(r.width||4)/2+1;
    })||false;
  }
  function profile(pr){
    if(pr.isNpc||pr.def||pr.survivor||pr.gate||pr.interact==='opening_supply')return null;
    if(pr.searchable&&!pr.searched)return {state:'search',duration:.65,contact:.325};
    if(pr.breakable&&!pr.broken)return {state:'kick',duration:.56,contact:.28};
    if(['storage','forge','board','caravan'].includes(pr.interact))return {state:'reach',duration:.35,contact:.35};
    if(pr.interact||pr.lootable)return {state:'reach',duration:.45,contact:.225};
    return null;
  }
  function reachable(state,pr,p=state.player){
    const m=state.map;
    return TerrainLayers.same(p,pr)&&Math.hypot(p.x-pr.x,p.y-pr.y)<(pr.interactionRange||1.6)&&
      Math.abs(TerrainNavigation.height(m,p.x,p.y,p.surfaceId)-TerrainNavigation.height(m,pr.x,pr.y,pr.surfaceId))<=1&&
      U.los((x,y)=>(x===(pr.x|0)&&y===(pr.y|0))||MapGen.walkable(m,x,y,p.surfaceId),p.x,p.y,pr.x,pr.y);
  }
  function begin(state,pr,commit,p=state.player){
    const spec=profile(pr);
    if(!spec||!state.map.props.includes(pr)||p.dead||p.action||p.stunT>0||p.jumping||p.leaping||p.charging||p.dashing||p.spinning||!reachable(state,pr,p))return false;
    p.path=null;p.command=null;p.moving=false;p.curSpeed=0;p.face(pr.x,pr.y);p.visAng=p.angT;
    p.startAction(spec.state,spec.duration);p.action.visual.releases=[spec.contact/spec.duration];
    p.action.propInteraction={prop:pr,map:state.map,at:state.time,contact:spec.contact,commit,done:false};
    if(spec.state==='kick')Sfx.play('swing');
    return true;
  }
  function cancel(state,p=state?.player){if(p?.action?.propInteraction){p.action=null;return true;}return false;}
  function update(state,p=state.player){
    const a=p.action,work=a?.propInteraction;
    if(!work)return;
    if(work.map!==state.map||p.dead||p.stunT>0||p.jumping||p.leaping||p.charging||p.dashing||p.spinning||p.command||!state.map.props.includes(work.prop)||(!work.done&&!profile(work.prop))||!reachable(state,work.prop,p)){cancel(state,p);return;}
    if(!work.done&&state.time-work.at+1e-8>=work.contact){
      work.done=true;
      const accepted=TerrainLayers.scope(state.map,p,()=>work.commit());
      if(accepted!==false)effect(work.prop,state,'use');
    }
  }
  function effect(pr,state,kind){pr.propEffect={at:state.time,kind};}
  function freeTile(map,pr){
    const surface=TerrainLayers.view(map,pr.surfaceId??0),x=pr.x|0,y=pr.y|0;
    pr.blocks=false;
    surface.blocked[x+y*map.w]=surface.walls[x+y*map.w]||map.props.some(p=>p!==pr&&p.blocks&&TerrainLayers.same(p,pr)&&
      ((p.x|0)===x&&(p.y|0)===y||p.footprint&&x>=p.footprint.x0&&x<p.footprint.x1&&y>=p.footprint.y0&&y<p.footprint.y1))?1:0;
  }
  function sound(pr){return family(pr).startsWith('frozen_')?'propIce':pr.type==='grave'||pr.type==='pillar'?'propStone':pr.type==='urn'?'propCeramic':pr.type==='barrel'||pr.type==='crate'?'barrel':'chest';}
  function draw(ctx,pr,state,x,y,options){
    const s=sample(pr,state);if(!s)return false;
    const frames=s.family==='shrine'&&pr.ev?[1,0]:FRAMES[s.family]||EXTRA[s.family],t=clamp(s.age/.32),current=sprite(s.id,s.index);
    if(s.ended&&s.age>=0&&s.age<.32&&frames.length===2){
      SpriteAssets.drawFrame(ctx,sprite(s.id,frames[0]),x,y,options);
      ctx.save();
      if(s.family==='shrine'&&!pr.spent){ctx.beginPath();ctx.rect(x-80,y-152*t,160,160*t+8);ctx.clip();}
      SpriteAssets.drawFrame(ctx,current,x,y,{...options,alpha:(options.alpha??1)*t});ctx.restore();
    }else{
      const settle=pr.broken&&s.age<.4?Math.sin(s.age*28)*2*(1-clamp(s.age/.4)):0;
      SpriteAssets.drawFrame(ctx,current,x+settle,y,options);
    }
    return true;
  }
  function drawEffects(ctx,pr,state,x,y,frame,hover){
    const f=family(pr),age=state.time-(pr.propEffect?.at??-100),pulse=clamp(1-age/.65);
    const ready=!!(pr.interact||pr.lootable||pr.breakable),magic=['shrine','altar','pillar','ritual','sigil'].includes(f);
    if(!pulse&&!magic&&!(hover&&ready))return;
    const color=pr.interact==='forge'?'#ffb05c':COLORS[act(state.map)-1];
    ctx.save();
    if(hover&&ready){ctx.strokeStyle='#e5d4ad';ctx.lineWidth=1;ctx.globalAlpha=.8;ctx.beginPath();ctx.ellipse(x,y+1,23,10,0,0,Math.PI*2);ctx.stroke();}
    if(magic&&(!pr.spent||pulse>0)){
      ctx.globalCompositeOperation='lighter';ctx.globalAlpha=pulse*.28+(pr.spent?0:.045+.02*Math.sin(state.time*2+(pr.seed||0)));
      const radius=22+pulse*17;ctx.drawImage(glow(color),x-radius,y-34-radius,radius*2,radius*2);
    }
    if(pulse>0){
      ctx.globalCompositeOperation='source-over';
      const icy=f.startsWith('frozen_'),debris=pr.broken||pr.searched||pr.corpseConsumed;
      for(let i=0;i<9;i++){
        const angle=i*2.399+(pr.seed||0),distance=(1-pulse)*(debris?30:19),rise=Math.sin((1-pulse)*Math.PI)*(debris?15:27);
        ctx.globalAlpha=pulse*.7;ctx.fillStyle=icy?'#d8edf0':magic?color:pr.type==='urn'?'#b2a388':'#9c8c75';
        ctx.fillRect(x+Math.cos(angle)*distance,y-7+Math.sin(angle)*distance*.45-rise,icy?3:2,2);
      }
    }
    ctx.restore();
  }
  return {act,family,themed,terminal,sample,frame,bounds,prepare,nearRamp,profile,reachable,begin,cancel,update,effect,freeTile,sound,draw,drawEffects,FRAMES,EXTRA,BODY_SITES};
})();
