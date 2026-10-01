/* Film staging and art. All coordinates, poses and effects are absolute-time samples. */
'use strict';
const CinematicPresentation=(()=>{
  const TAU=Math.PI*2,clamp=x=>Math.max(0,Math.min(1,x)),smooth=x=>{x=clamp(x);return x*x*(3-2*x);},lerp=(a,b,t)=>a+(b-a)*t;
  const noise=(i)=>{const v=Math.sin(i*73.19+17.1)*43758.54;return v-Math.floor(v);};
  const effect=(s,kind)=>s.d.effects.find(e=>e.kind===kind);
  const progress=(s,kind,offset=0)=>{const e=effect(s,kind);return e?smooth((s.time-e.from-offset)/(e.to-e.from)):0;};
  const activeEffect=(s,kind)=>{const e=effect(s,kind);return !!e&&s.time>=e.from&&s.time<e.to;};
  const contact=(s,id,fallback)=>s.d.contacts.find(c=>c.id===id)?.at??fallback;
  const images=new Map(),frames=new Map();
  const assets={props:{url:'assets/cinematics/props.webp',cols:4,rows:4,rects:[
    [0,0,.25,.245],[.25,0,.25,.245],[.5,0,.25,.245],[.75,0,.25,.245],
    [0,.246,.25,.206],[.25,.244,.25,.224],[.5,.244,.25,.236],[.75,.24,.25,.228],
    [0,.452,.25,.26],[.25,.47,.25,.22],[.5,.47,.25,.229],[.75,.50,.25,.205],
    [0,.712,.25,.288],[.25,.69,.25,.31],[.5,.70,.25,.3],[.75,.715,.25,.285]]},
    warden:{url:'assets/cinematics/warden.webp',cols:4,rows:2},people:{url:'assets/cinematics/people.webp',cols:4,rows:4},walkers:{url:'assets/cinematics/walkers.webp',cols:4,rows:3},warriors:{url:'assets/cinematics/warriors.webp',cols:4,rows:3}};
  async function loadArt(){
    await Promise.all(Object.entries(assets).map(async([name,def])=>{
      if(images.has(name))return images.get(name);
      const pending=new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>{register(name,img,def);resolve(img);};img.onerror=()=>reject(Error('Missing cinematic artwork: '+def.url));img.src=def.url;});
      images.set(name,pending);try{await pending;}catch(e){images.delete(name);throw e;}
    }));
  }
  function register(name,img,def){
    const cv=document.createElement('canvas');cv.width=img.width;cv.height=img.height;
    const cx=cv.getContext('2d',{willReadFrequently:true});cx.drawImage(img,0,0);
    const pixels=cx.getImageData(0,0,img.width,img.height).data,cw=img.width/def.cols,ch=img.height/def.rows;
    // Figure silhouettes may extend beyond a grid cell. Register connected figures
    // once at preload, retaining their feet and excluding neighboring cloaks/weapons.
    const parts=name==='props'?null:figureParts(pixels,img.width,img.height);
    for(let i=0;i<def.cols*def.rows;i++){
      const rect=def.rects?.[i],ox=Math.round(rect?rect[0]*img.width:i%def.cols*cw),oy=Math.round(rect?rect[1]*img.height:Math.floor(i/def.cols)*ch),ex=Math.round(rect?(rect[0]+rect[2])*img.width:ox+cw),ey=Math.round(rect?(rect[1]+rect[3])*img.height:oy+ch);
      if(parts){
        const counts=new Map();for(let y=oy;y<ey;y++)for(let x=ox;x<ex;x++){const id=parts.labels[x+y*img.width];if(id)counts.set(id,(counts.get(id)||0)+1);}
        const id=[...counts].sort((a,b)=>b[1]-a[1])[0]?.[0],box=parts.boxes[id];if(!box)throw Error('Empty cinematic figure '+name+':'+i);
        const cut=document.createElement('canvas');cut.width=box.x1-box.x0+1;cut.height=box.y1-box.y0+1;
        const cc=cut.getContext('2d'),data=cc.createImageData(cut.width,cut.height);
        for(let y=0;y<cut.height;y++)for(let x=0;x<cut.width;x++){const src=(x+box.x0+(y+box.y0)*img.width),dst=(x+y*cut.width)*4;if(parts.labels[src]===id||pixels[src*4+3]<24)for(let n=0;n<4;n++)data.data[dst+n]=pixels[src*4+n];}
        cc.putImageData(data,0,0);frames.set(name+':'+i,{image:cut,x:0,y:0,w:cut.width,h:cut.height});continue;
      }
      let x0=ex,y0=ey,x1=ox,y1=oy;
      for(let y=oy;y<ey;y++)for(let x=ox;x<ex;x++)if(pixels[(x+y*img.width)*4+3]>24){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
      if(x1<=x0||y1<=y0)throw Error('Empty cinematic atlas cell '+name+':'+i);
      frames.set(name+':'+i,{image:img,x:x0,y:y0,w:x1-x0+1,h:y1-y0+1});
    }
  }
  function figureParts(pixels,w,h){
    const labels=new Int32Array(w*h),stack=new Int32Array(w*h),boxes=[null];
    for(let at=0;at<labels.length;at++){
      if(labels[at]||pixels[at*4+3]<=24)continue;const id=boxes.length,box={x0:w,y0:h,x1:0,y1:0};boxes.push(box);let size=1;stack[0]=at;labels[at]=id;
      while(size){const p=stack[--size],x=p%w,y=Math.floor(p/w);box.x0=Math.min(box.x0,x);box.y0=Math.min(box.y0,y);box.x1=Math.max(box.x1,x);box.y1=Math.max(box.y1,y);
        for(const n of [x>0?p-1:-1,x<w-1?p+1:-1,y>0?p-w:-1,y<h-1?p+w:-1])if(n>=0&&!labels[n]&&pixels[n*4+3]>24){labels[n]=id;stack[size++]=n;}
      }
    }
    return {labels,boxes};
  }
  function art(ctx,name,index,x,y,height,alpha=1,feet=false,rotation=0){
    if(alpha<=0)return;const f=frames.get(name+':'+index);if(!f)throw Error('Unloaded cinematic frame '+name+':'+index);
    const w=f.w/f.h*height;ctx.save();ctx.globalAlpha*=clamp(alpha);ctx.translate(x,y);if(rotation)ctx.rotate(rotation);
    ctx.drawImage(f.image,f.x,f.y,f.w,f.h,-w/2,feet?-height:-height/2,w,height);ctx.restore();
  }
  const pt=(o,z=0)=>({x:o.x,y:o.y,surfaceId:o.surfaceId||0,lift:z});
  const facing=(dx,dy)=>Math.atan2(U.isoY(dx,dy),U.isoX(dx,dy));
  function safe(m,x,y,surfaceId=0){
    for(let r=0;r<8;r++)for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){
      if(Math.max(Math.abs(dx),Math.abs(dy))!==r)continue;
      if(MapGen.walkable(m,Math.floor(x)+dx,Math.floor(y)+dy))return {x:Math.floor(x)+dx+.5,y:Math.floor(y)+dy+.5,surfaceId};
    }
    return pt(m.spawns.default);
  }
  function actor(s,source){
    const v=Object.create(source);Object.assign(v,{x:source.x,y:source.y,surfaceId:source.surfaceId||0,action:null,command:null,path:null,
      flashT:0,jumpZ:0,moving:false,cinematicView:true,cinematicAlpha:1,cinematicZ:0,cinematicClip:'watch',clipU:0});
    if(source.spriteOpts)v.spriteOpts={...source.spriteOpts};
    const base=source.pose?source.pose():{state:'idle',t:0,ang:0,ex:{}};
    const ex={...base.ex};for(const k of ['animation','wildshape','bossMotion','act2Animation','act3Animation','act4Animation','act5Animation'])delete ex[k];
    if(source.isBoss)delete ex.act1Animation;
    v.pose=()=>{
      const e={...ex,walkPh:v.moving?v.walkPhase:undefined,cinematic:source.classId?{clip:v.cinematicClip,u:v.clipU,time:s.time,travel:v.cinematicTravel,hand:v.handTarget,light:v.cinematicLight}:undefined};
      if(e.act1Animation)e.act1Animation={...e.act1Animation,clock:s.time,walkPhase:v.moving?s.time*5:null};
      return {state:v.moving?'walk':v.dead?'dead':'idle',t:v.moving?s.time:v.dead?1:s.time,ang:v.visAng||0,ex:e};
    };
    s.views.set(source,v);return v;
  }
  function npc(s,g,name,sheet,index,pos){
    const source={...pos,name,visAng:0,spriteOpts:{kind:'human'},pose:()=>({state:'idle',t:0,ang:0,ex:{}})};
    const v=actor(s,source);v.cineArt=sheet;v.cineFrame=index;v.artHeight=92;g.extras.push(v);return v;
  }
  function prop(g,kind,pos,extra={}){const p={kind,...pt(pos),alpha:1,...extra};g.props.push(p);return p;}
  function landmark(m,pattern,fallback){
    return m.props.filter(p=>!p.hidden&&pattern.test([p.visual,p.type,p.id,p.art].filter(Boolean).join(' ')))
      .sort((a,b)=>Math.hypot(a.x-fallback.x,a.y-fallback.y)-Math.hypot(b.x-fallback.x,b.y-fallback.y))[0]||fallback;
  }
  function buildStage(s,world,id){
    const d=s.d,m=world.map,g={id,world,extras:[],props:[],named:{},visible:new Set(),islands:[]};
    const hero=actor(s,world.player);g.hero=hero;g.visible.add(world.player);
    let focus=id==='main'?(s.replay?null:s.context.subject)||(d.boss&&world.monsters.find(a=>a.defId===d.boss))||(d.object&&m.props.find(a=>a.storyId===d.object))||(d.object&&world.npcs.find(a=>a.storyId===d.object)):null;
    if(d.id==='ledger'&&id==='main')focus=world.npcs.find(n=>n.id==='sera')||focus;
    if(d.id==='oathsworn')focus=s.context.anchor||world.quests.q8b?.trioAnchor||m.frontier?.anchors.beacons?.[0]||focus;
    focus=focus||m.bossArena&&{x:m.bossArena.cx,y:m.bossArena.cy}||{x:hero.x+1.5,y:hero.y-1.5};
    g.focus=pt(focus);g.named.focus=g.focus;
    if(d.visual==='excavation'||d.visual==='breach')g.focus=pt(landmark(m,d.visual==='excavation'?/crane|excavat|mechanism/:/gate|fort|tower/,focus));
    if(focus.pose&&(!focus.spriteOpts?.npcArt||d.boss)){g.focusActor=actor(s,focus);g.visible.add(focus);if(!world.monsters.includes(focus)&&!world.npcs.includes(focus))g.extras.push(g.focusActor);}
    // A compact acting space is chosen on existing floor; only the render proxy moves.
    const mark=safe(m,g.focus.x-.5,g.focus.y+.5,hero.surfaceId),start=safe(m,mark.x-1,mark.y+1,hero.surfaceId);
    Object.assign(hero,start);g.named.heroStart=pt(start);g.named.heroMark=pt(mark);
    if(id==='main'&&['ledger','rescue','shard','map','seal','give','core'].includes(d.visual))Object.assign(hero,mark);
    g.named.vista=pt(landmark(m,/tower|colossus|gate|crane|palace/,g.focus));
    g.named.defenses=pt(landmark(m,/pillar|ruin|wall|barricade/,g.focus));
    g.named.waystone=pt(m.props.find(p=>p.type==='shrine')||g.focus,28);
    g.named.mechanism=pt(landmark(m,/mechanism|relay|machine|crane/,g.focus),35);
    g.named.gateway=pt(landmark(m,/gateway|gate|portal|entrance/,g.focus),55);
    g.named.core={x:mark.x+.42,y:mark.y-.42,surfaceId:mark.surfaceId,lift:36};
    g.named.document={x:mark.x+.2,y:mark.y-.2,surfaceId:mark.surfaceId,lift:48};
    g.named.contact={...g.named.core};g.named.remains={...g.focus,lift:20};
    const fallen=d.bossDead||({shard:'mire_mother',map:'azram',portal:'malthoron'}[d.visual]);
    if(id==='main'&&fallen){
      const remains=actor(s,focus.pose&&focus.defId===fallen?focus:Game.cinematicActor(fallen,g.focus,world));
      g.visible.delete(focus);g.focusActor=null;remains.dead=true;remains.corpseT=99;remains.spriteOpts.bossPose='death';remains.cinematicDepth=hero.x+hero.y-.8;
      if(fallen==='vethriss'){remains.spriteOpts.bossPhase=2;remains.spriteOpts.kind='wraith';delete remains.spriteOpts.npcArt;remains.name='Vethriss, Unveiled';}
      g.extras.push(remains);g.remains=remains;g.named.remains={...pt(remains),lift:20};
    }
    if(id==='home'){
      const gate=m.opening?.gate||landmark(m,/gate|wall/,m.spawns.default),road=safe(m,gate.x-7,gate.y+7);
      Object.assign(hero,road);g.named.heroStart=pt(road);g.named.heroMark=pt(safe(m,gate.x-2,gate.y+2));g.named.focus=pt(gate);g.focus=pt(gate);
    }else if(id==='vault'){
      g.focus=pt(safe(m,hero.x+1,hero.y-1));g.named.vault={...g.focus,lift:30};
      prop(g,'reliquary',g.focus,{closed:true});
      const pos=safe(m,g.focus.x+1.8,g.focus.y+.25);
      g.guardian=npc(s,g,'The guardian','warriors',10,pos);g.guardian.cineSilhouette=true;g.named.guardian={...pos,lift:55};
      hero.cinematicAlpha=0;
    }else{
      if(['destroy','seal','give','core','portal','shard'].includes(d.visual))g.core=prop(g,'core',g.named.core,{height:d.visual==='give'?22:d.visual==='shard'?23:42});
      if(d.visual==='destroy')g.held=prop(g,'heldShard',g.named.core,{height:34});
      if(['ledger','map','shard'].includes(d.visual))g.document=prop(g,'document',g.named.document,{frame:d.visual==='ledger'?4:d.visual==='map'?5:6,height:d.visual==='ledger'?32:d.visual==='map'?42:34});
      if(d.visual==='ledger'||d.visual==='give'){
        const pos=d.visual==='ledger'?g.focus:{x:mark.x+1.6,y:mark.y-.4};
        g.warden=npc(s,g,'Seraneth','warden',0,pos);g.named.warden=g.warden;g.named.wardenEyes={...pos,lift:78};
        g.named.pair={x:(hero.x+pos.x)/2,y:(hero.y+pos.y)/2,lift:40};
        g.named.shadow={x:pos.x-1,y:pos.y+1,lift:0};
        if(d.visual==='give'){g.gateway=prop(g,'gateway',{x:pos.x+.2,y:pos.y-.2,lift:0},{height:130});}
      }
      if(d.id==='vethriss'){
        // The combat sprite is scaled for boss readability. Its human disguise
        // uses Seraneth's wounded/appealing poses at character scale in this scene.
        g.visible.delete(focus);g.wounded=npc(s,g,'Seraneth, Wounded','warden',7,g.focus);g.focusActor=g.wounded;
        g.named.woundedFace={...g.focus,lift:54};g.named.woundedHands={...g.focus,lift:57};
      }
      if(d.visual==='rescue'){
        g.scholar=npc(s,g,'Ilyan','people',0,g.focus);g.binding=prop(g,'binding',g.focus,{height:48,lift:32});
        g.named.contact={...g.focus,lift:35};g.named.inscription={x:g.focus.x+1,y:g.focus.y-1,lift:35};
        prop(g,'inscription',g.named.inscription,{height:65});
      }
      if(d.visual==='quieting'){
        let best=null,dist=Infinity;const water=m.act2?.water;
        if(water)for(let i=0;i<water.length;i++)if(water[i]){
          const x=i%m.w,y=Math.floor(i/m.w),q={x:x+.5,y:y+.5},distance=Math.hypot(q.x-world.player.x,q.y-world.player.y);
          if(distance>=dist||!MapGen.walkable(m,q.x-3,q.y+3))continue;
          let open=x>0&&y>0&&x<m.w-1&&y<m.h-1;
          for(let dy=-1;dy<=1&&open;dy++)for(let dx=-1;dx<=1;dx++)if(!water[x+dx+(y+dy)*m.w]){open=false;break;}
          if(open){best=q;dist=distance;}
        }
        g.named.water=pt(best||g.focus);g.focus=g.named.water;g.named.pair={x:g.focus.x-1,y:g.focus.y+1,lift:35};
        Object.assign(hero,safe(m,g.focus.x-4,g.focus.y+4));g.walkers=[];
        for(let i=0;i<3;i++){
          const start=safe(m,g.focus.x-3.3+i*1.25,g.focus.y+3.3+i*.2),v=npc(s,g,'The Quieted','walkers',i*4,start);
          v.walkStart=start;v.walkEnd={x:g.focus.x+i*.75,y:g.focus.y-i*.45};v.row=i;g.walkers.push(v);g.named['walker'+i]=v;
        }
      }
      if(d.visual==='rise'){
        prop(g,'beaconRuin',g.focus,{height:84});
        g.warriors=[];
        for(const [i,type]of ['barb_axe','barb_pole','barb_sword'].entries()){
          const pos=safe(m,g.focus.x+Math.cos(i*2.1)*2.2,g.focus.y+Math.sin(i*2.1)*2.2),v=npc(s,g,'The Oathsworn','warriors',i*4,pos);v.row=i;
          g.warriors.push(v);g.named['warrior'+i]=v;
        }
        prop(g,'debris',g.focus,{height:52});
      }
      if(d.visual==='assembly'){
        const rooms=m.cathedral?.rooms||[];
        for(const r of rooms){const q={id:r.id,x:r.cx??r.x,y:r.cy??r.y,lift:0,w:r.w,h:r.h};if(r.id!=='entry'&&Number.isFinite(q.x)&&Number.isFinite(q.y))g.islands.push(q);}
        g.islands.sort((a,b)=>Math.hypot(a.x-hero.x,a.y-hero.y)-Math.hypot(b.x-hero.x,b.y-hero.y));
        g.named.island0=g.islands[0]||pt(g.focus);g.named.island1=g.islands[1]||g.named.island0;g.named.vista=g.named.island1;
      }
      if(d.visual==='excavation'){prop(g,'inscription',g.focus,{height:88,lift:20});prop(g,'medallion',g.named.mechanism,{height:58});g.gateway=prop(g,'gateway',g.named.gateway,{height:115});}
      if(d.visual==='portal')g.gateway=prop(g,'gateway',g.named.core,{height:145,lift:-14});
      if(d.visual==='map')g.projection=prop(g,'projection',{...g.named.document,lift:105},{height:75});
      if(d.visual==='breach'){
        const site=m.composition?.landmarks?.find(l=>l.id==='siege')||g.named.vista,battle=safe(m,site.x-3,site.y+3);g.named.battle={...battle,lift:35};g.rivals=[];
        if(id==='outlook'){
          hero.cinematicAlpha=0;g.named.vista=pt(site,45);
          for(let i=0;i<8;i++){const pos=safe(m,battle.x+(i%4)*1.25,battle.y+Math.floor(i/4)*3),v=actor(s,Game.cinematicActor(i<4?'ash_fiend':'cinder_hound',pos,world));g.extras.push(v);g.rivals.push(v);}
        }
      }
    }
    g.reducedFrame={x:(hero.x+g.focus.x)/2,y:(hero.y+g.focus.y)/2,lift:35};
    for(const v of [hero,g.focusActor,...g.extras].filter(Boolean)){v.base=pt(v);const aim=v===hero&&['destroy','seal','core','shard','map'].includes(d.visual)?g.named.core:g.focus;v.baseAngle=facing(aim.x-v.x,aim.y-v.y);v.visAng=v.baseAngle;}
    g.named.focus=g.focus;return g;
  }
  async function prepare(s){
    const stages=new Map();s.stages=stages;
    const worlds=[{id:'main',world:s.world}];
    await loadArt();
    for(const def of s.d.stages.filter(d=>d.id!=='main')){
      if(s.disposed||s.fallback)return;const world=await Game.cinematicWorld({...s.d,zone:def.zone,boss:null,object:null,visual:'vignette'});
      await SpriteAssets.loadBundle('zone:'+(world.map.zone.artZone||def.zone));await SpriteAssets.loadBundle('zone:'+def.zone);
      worlds.push({id:def.id,world});
    }
    if(s.d.visual==='portal'){
      const peek=await Game.cinematicWorld({...s.d,zone:'hellgate',boss:null,object:null,visual:'vignette'});
      await SpriteAssets.loadBundle('zone:hellgate');await SpriteAssets.loadBundle('zone:'+(peek.map.zone.artZone||'hellgate'));
      s.portalImage=Game.cinematicSnapshot?.(peek);
    }
    if(s.disposed||s.fallback)return;for(const {id,world}of worlds)stages.set(id,buildStage(s,world,id));
    update(s);
  }
  function shotAt(s){return [...s.d.shots].reverse().find(k=>k.at<=s.time)||s.d.shots[0];}
  function handTarget(g,clip,u){
    const h=g.hero,core=g.named.core;
    let target={x:core.x-h.x,y:core.y-h.y,lift:core.lift+31};
    if(clip==='strike'){
      const k=smooth((u-.38)/.22)*(1-smooth((u-.7)/.25));
      target={x:lerp(-.15,target.x,k),y:lerp(.15,target.y,k),lift:lerp(91,target.lift,k)};
    }else if(['grasp','kneel','extract','unbind'].includes(clip))target={x:target.x*.7,y:target.y*.7,lift:clip==='extract'?lerp(27,58,smooth(u)):37};
    else if(clip==='examine')target={x:.23,y:-.23,lift:50};
    else if(clip==='offer')target={x:.42,y:-.42,lift:54};
    else if(clip==='withdraw')target={x:lerp(.42,.05,smooth(u)),y:lerp(-.42,-.05,smooth(u)),lift:lerp(54,35,smooth(u))};
    else if(clip==='recoil')target={x:.25,y:-.25,lift:lerp(81,65,smooth(u))};
    else if(clip==='recover')target={x:lerp(.25,.1,smooth(u)),y:lerp(-.25,-.1,smooth(u)),lift:lerp(65,30,smooth(u))};
    else if(clip==='ward'){const angle=u*TAU*2;target={x:target.x+Math.cos(angle)*.34,y:target.y+Math.sin(angle)*.34,lift:45+Math.sin(angle)*5};}
    return target;
  }
  function update(s){
    const shot=shotAt(s),g=s.stages.get(shot.stage||'main');if(!g)return;
    if(s.shot!==shot&&typeof LevelTerrain!=='undefined')LevelTerrain.resetView?.();
    s.stage=g;s.shot=shot;s.hero=g.hero;s.focus=g.focus;s.focusActor=g.focusActor;s.props=g.props;s.extras=g.extras;s.world=g.world;
    const t=s.time,d=s.d;
    for(const v of [g.hero,g.focusActor,...g.extras].filter(Boolean)){Object.assign(v,v.base);v.visAng=v.baseAngle;v.cinematicAlpha=1;v.cinematicZ=0;v.cinematicClip='watch';v.clipU=0;v.moving=false;v.walkPhase=0;v.cinematicTravel=0;v.handTarget=null;}
    if(g.id==='vault'||g.id==='outlook')g.hero.cinematicAlpha=0;
    for(const track of d.actors){
      if((track.stage||'main')!==g.id||t<track.from)continue;
      const v=track.target==='hero'?g.hero:g.focusActor;if(!v)continue;
      const u=clamp((t-track.from)/(track.to-track.from));
      if(track.path){const from=g.named[track.path[0]],to=g.named[track.path[1]],k=smooth(u);v.x=lerp(from.x,to.x,k);v.y=lerp(from.y,to.y,k);v.cinematicTravel=Math.hypot(to.x-from.x,to.y-from.y)*Math.SQRT2*32/44*k;v.walkPhase=v.cinematicTravel/.68*TAU;if(t<track.to)v.visAng=facing(to.x-from.x,to.y-from.y);}
      if(t<track.to){v.cinematicClip=track.clip;v.clipU=u;v.moving=track.clip==='walk';}
    }
    const h=g.hero;h.handTarget=handTarget(g,h.cinematicClip,h.clipU);
    h.cinematicLight={x:g.named.core.x-h.x,y:g.named.core.y-h.y,lift:42,intensity:['destroy','seal','give','core','shard'].includes(d.visual)?d.visual==='destroy'&&t>=contact(s,'shatter',14)?7*(1-progress(s,'coreIllumination')):.65:0};
    if(g.focusActor?.spriteOpts?.bossArt){
      const v=g.focusActor;v.spriteOpts.bossPose=v.cinematicClip==='watch'?'idle':v.cinematicClip==='awaken'?'recovery':'windup';
      if(d.boss==='azram')v.spriteOpts.bossPose=t<5?'recovery':t<7.2?'windup':'idle';
      if(d.boss==='empty_archangel')v.spriteOpts.bossPose=t<1.3?'death':t<3.5?'recovery':'idle';
      if(v.cinematicClip==='rise')v.cinematicZ=s.reduced?0:-30*(1-progress(s,'armorRise'));
    }
    if(g.warden){
      const v=g.warden;v.cineFrame=d.visual==='ledger'?(t<3?2:t<13?1:0):(t<5?0:t<11.5?2:t<16?3:t<22?4:t<25?5:6);
      if(d.visual==='give'){v.cinematicAlpha=smooth(t/1.5)*(1-smooth((t-25)/3));v.x+=s.reduced?0:smooth((t-22)/6)*.6;v.y-=s.reduced?0:smooth((t-22)/6)*.6;}
      g.named.wardenEyes={...pt(v),lift:78};g.named.shadow={x:v.base.x+1.1,y:v.base.y-1.1,lift:0};
    }
    if(d.id==='vethriss')g.named.shadow={x:g.focus.x+1.1,y:g.focus.y-1.1,lift:0};
    if(g.wounded){g.wounded.cineFrame=t<5||t>=10?7:2;g.wounded.x-=smooth((t-5)/3)*.12;g.wounded.y+=smooth((t-5)/3)*.12;}
    if(g.scholar)g.scholar.cineFrame=t<2?0:t<4?1:t<6.5?2:3;
    for(const [i,v]of (g.walkers||[]).entries()){
      const u=progress(s,'quietWalk',i*1.7);v.x=lerp(v.walkStart.x,v.walkEnd.x,u);v.y=lerp(v.walkStart.y,v.walkEnd.y,u);
      v.submerge=smooth((u-.55)/.45);v.cineFrame=v.row*4+(u>0&&u<1?(Math.floor(t*3)%2?1:2):0);v.cinematicAlpha=v.submerge>=1?0:1;
    }
    for(const [i,v]of (g.warriors||[]).entries()){
      const u=progress(s,'awakening',i*2);v.cinematicAlpha=u;v.cinematicZ=s.reduced?0:-28*(1-u);
      v.visAng=facing(h.x-v.x,h.y-v.y);v.cinematicClip=u<1?'kneel':'raise';v.clipU=u;
      v.cineFrame=i*4+(u<.3?0:u<.8?1:t<7?2:3);
    }
    for(const [i,v]of (g.rivals||[]).entries()){
      const lane=i%4,phase=(t+lane*.37)%2.4/2.4,enemy=g.rivals[(i+4)%8].base;
      v.y+=(i<4?1:-1)*1.1*smooth(phase/.38)*(1-smooth((phase-.62)/.38));
      v.visAng=facing(enemy.x-v.x,enemy.y-v.y);
      v.pose=()=>({state:i>=4&&phase>.47&&phase<.62?'hit':phase<.62?'attack':'idle',t:clamp(phase/.62),ang:v.visAng,ex:{}});
    }
    if(g.id==='home')g.named.homeVista={x:(h.x+g.focus.x)/2,y:(h.y+g.focus.y)/2,lift:55};
    const hand=Player3D.cinematicAnchors?.(h,h.pose(),1.1)?.hand;
    g.hand=hand?{x:h.x+hand.x,y:h.y+hand.y,lift:hand.lift,surfaceId:h.surfaceId}:{x:h.x+.25,y:h.y-.25,lift:53,surfaceId:h.surfaceId};
    if(g.held){Object.assign(g.held,g.hand);g.held.alpha=t>=7&&t<14?1:0;g.held.striking=h.cinematicClip==='strike';g.held.contactWeight=g.held.striking?smooth((h.clipU-.38)/.22)*(1-smooth((h.clipU-.7)/.25)):0;g.held.tip=g.named.core;}
    if(g.core){
      Object.assign(g.core,g.named.core);g.core.alpha=1;g.core.cracks=d.visual==='destroy'?(t>=contact(s,'strike2',12.92)?.45+.55*progress(s,'secondFracture'):t>=contact(s,'strike1',10.38)?.18+.27*progress(s,'firstFracture'):0):0;
      const broken=contact(s,'shatter',14);g.core.breakAge=d.visual==='destroy'&&t>=broken?t-broken:null;g.core.assembly=d.visual==='core'?progress(s,'coreAssembly'):d.visual==='portal'?1-progress(s,'convergence'):1;
      if(d.visual==='shard'){const k=progress(s,'extraction');g.core.x=lerp(g.focus.x,g.hand.x,k);g.core.y=lerp(g.focus.y,g.hand.y,k);g.core.lift=lerp(24,g.hand.lift,k);g.core.alpha=1-smooth((t-8)/1);}
      if(d.visual==='seal'){g.core.alpha=1-progress(s,'concealCore');g.core.lift=36-25*progress(s,'concealCore');}
      if(d.visual==='give'){
        const wh={x:g.warden.x-.27,y:g.warden.y+.27,lift:60},k=progress(s,'transfer');
        g.core.x=lerp(g.hand.x,wh.x,k);g.core.y=lerp(g.hand.y,wh.y,k);g.core.lift=lerp(g.hand.lift,wh.lift,k);g.core.alpha=g.warden.cinematicAlpha*(1-smooth((t-11.5)/.35));
      }
    }
    if(g.document){
      Object.assign(g.document,g.hand);g.document.alpha=d.visual==='shard'?progress(s,'plansReveal'):1;
      if(d.visual==='ledger'){
        const hand={x:g.warden.x-.18,y:g.warden.y+.18,lift:64},k=progress(s,'ledgerTransfer');
        for(const axis of ['x','y','lift'])g.document[axis]=lerp(g.hand[axis],hand[axis],k);
        // The examining pose includes the book. Keep the detail anchor on its pages.
        g.document.alpha=Math.min(1,1-smooth((t-3)/.4)+smooth((t-4)/.7)*(1-smooth((t-12.7)/.3)));
        g.document.height=lerp(32,22,smooth((t-3)/1));
      }
      if(d.visual==='map'){g.document.alpha=progress(s,'mapReveal');g.document.unfold=progress(s,'mapUnfold');}
      if(d.visual==='shard')g.document.unfold=progress(s,'plansUnfold');
      g.named.document={...g.document};
    }
    if(g.binding)g.binding.alpha=1-progress(s,'bindingBreak');
    if(g.gateway){g.gateway.alpha=d.visual==='portal'||d.visual==='excavation'?progress(s,'gateway'):1-smooth((t-26)/2);g.gateway.aperture=d.visual==='give'?1-progress(s,'portalCollapse'):1;}
    if(g.projection){Object.assign(g.projection,{x:g.document.x,y:g.document.y,lift:g.document.lift+55});g.projection.alpha=progress(s,'projection')*(1-progress(s,'projectionFade'));g.named.projection={...g.projection};}
    g.named.pair=g.named.pair||{x:(h.x+g.focus.x)/2,y:(h.y+g.focus.y)/2,lift:40};
    g.named.contact=d.visual==='give'?{...g.core}:d.visual==='rescue'?{...g.focus,lift:34}:{...g.named.core};
    if(s.heading)s.heading.style.opacity=String(1-smooth((t-2)/1));
  }
  function target(g,name){
    if(name==='hero')return g.hero;
    if(name.startsWith('boss')&&g.focusActor){
      let height=160;try{const geom=SpriteAssets.actorGeometry(g.focusActor.spriteOpts,g.focusActor.pose(),0,0,1.1);height=geom.bottom-geom.top;}catch{}
      return {...pt(g.focusActor),lift:height*(name==='bossFace'?.83:name==='bossChest'?.57:.25)};
    }
    return g.named[name]||g.focus;
  }
  function camera(s){
    if(!s.stage)return null;const shot=s.shot,g=s.stage,next=s.d.shots.find(k=>k.at>shot.at),u=smooth((s.time-shot.at)/((next?.at||s.d.duration)-shot.at));
    let q=target(g,shot.target),zoom=lerp(shot.zoom,shot.endZoom??shot.zoom,u);
    if(s.reduced){q=g.reducedFrame;zoom=1.85;}
    else if(shot.pan)q={...q,x:q.x+shot.pan.x*u,y:q.y+shot.pan.y*u};
    const mobile=innerHeight<500||innerWidth<900;
    if(mobile)zoom*=Math.max(.52,Math.min(.86,innerHeight/660));
    return {x:q.x,y:q.y,surfaceId:q.surfaceId||0,zoom,lift:s.reduced?35:(q.lift||0)+(shot.lift||0),anchorX:.5,anchorY:mobile?.48:.50,shot:shot.id,stage:g.id};
  }
  const screen=(q,cam)=>({x:U.isoX(q.x,q.y)-cam.x,y:U.isoY(q.x,q.y)-cam.y-(q.lift||0)});
  function append(s,draws,cam){
    const g=s.stage;if(!g)return;
    for(const v of g.extras){const p=screen(v,cam);draws.push({kind:'cinematicActor',d:v.cinematicDepth??v.x+v.y,sx:p.x,sy:p.y,actor:v});}
    for(const p of g.props){if(p.alpha<=0)continue;const q=screen(p,cam);draws.push({kind:'cinematicProp',d:p.x+p.y+(p.kind==='gateway'?-2:.1),sx:q.x,sy:q.y,pr:p});}
  }
  function drawActor(s,ctx,v,x,y){
    if(!v.cineArt)return false;
    ctx.save();ctx.globalAlpha*=v.cinematicAlpha;
    ctx.fillStyle='#03040a';ctx.globalAlpha*=.3*(1-(v.submerge||0));ctx.beginPath();ctx.ellipse(x,y+2,16,6,0,0,TAU);ctx.fill();ctx.globalAlpha=v.cinematicAlpha;
    if(v.submerge){ctx.beginPath();ctx.rect(x-65,y-v.artHeight-10,130,v.artHeight+10);ctx.clip();}
    const f=frames.get(v.cineArt+':'+v.cineFrame),standing=frames.get(v.cineArt+':'+(v.cineArt==='people'?2:v.cineArt==='warriors'?Math.floor(v.cineFrame/4)*4+2:0));
    if(v.cineSilhouette)ctx.filter='brightness(.18) saturate(.35)';
    art(ctx,v.cineArt,v.cineFrame,x,y+(v.submerge||0)*v.artHeight,v.artHeight*(['people','warriors'].includes(v.cineArt)||v.cineArt==='warden'&&v.cineFrame===7?f.h/standing.h:1),1,true);
    if(s.d.visual==='give'&&v===s.stage.warden&&s.time>=16){const k=smooth((s.time-16)/1.2);glow(ctx,x-2,y-79,6,'#ffdca455',k*.5);ctx.globalAlpha*=k;ctx.fillStyle='#ffe9b7';ctx.fillRect(x-3,y-80,.8,.8);ctx.fillRect(x-.5,y-80,.8,.8);}
    ctx.restore();return true;
  }
  function drawProp(s,ctx,d){
    const p=d.pr,g=s.stage,t=s.time,x=d.sx,y=d.sy;ctx.save();
    if(p.kind==='core'){
      if(p.breakAge!==null&&p.breakAge!==undefined){
        const age=p.breakAge;
        ctx.filter='brightness('+lerp(1,.62,progress(s,'cooling'))+') saturate('+lerp(1,.3,progress(s,'cooling'))+')';
        for(let i=0;i<9;i++){
          const angle=i*2.399,land=smooth(age/1.4),distance=18+land*(30+noise(i)*38),z=Math.max(0,Math.sin(Math.min(1,age/1.4)*Math.PI)*(28+noise(i+2)*32));
          art(ctx,'props',3,x+Math.cos(angle)*distance,y+36+Math.sin(angle)*distance*.42-z,9+noise(i+9)*12,1,false,angle+land*1.3);
        }
      }else{
        const k=p.assembly??1;
        if(k<1)for(let i=0;i<8;i++){const ang=i*2.399,r=68*(1-k);art(ctx,'props',3,x+Math.cos(ang)*r,y+Math.sin(ang)*r*.5,18,k===0?.8:1,false,ang);}
        if(k>=1&&!s.reduced){
          for(let i=0;i<5;i++){const a=i*TAU/5,b=(i+1)*TAU/5,r=p.height;ctx.save();ctx.translate(Math.cos(a+.6)*Math.sin(t*2.1+i)*.65,Math.sin(a+.6)*Math.sin(t*2.1+i)*.4);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r);ctx.lineTo(x+Math.cos(b)*r,y+Math.sin(b)*r);ctx.closePath();ctx.clip();art(ctx,'props',0,x,y,p.height,p.alpha);ctx.restore();}
        }else art(ctx,'props',0,x,y,p.height,k*p.alpha);
        if(p.cracks)art(ctx,'props',1,x,y,p.height,p.cracks*.95);
      }
    }else if(p.kind==='heldShard'){
      const f=frames.get('props:2'),tip=screen(p.tip,{x:U.isoX(p.x,p.y)-x,y:U.isoY(p.x,p.y)-p.lift-y});
      const dx=tip.x-x,dy=tip.y-y,k=p.contactWeight||0,length=lerp(34,Math.hypot(dx,dy),k);
      const angle=p.striking?Math.atan2(dy,dx)-1.6*(1-k):-.9,scale=length/Math.hypot(f.w*.76,f.h*.76);
      ctx.translate(x,y);ctx.rotate(angle-Math.atan2(-f.h,f.w));ctx.globalAlpha*=p.alpha;
      ctx.drawImage(f.image,f.x,f.y,f.w,f.h,-f.w*.12*scale,-f.h*.88*scale,f.w*scale,f.h*scale);
    }
    else if(p.kind==='beaconRuin'){
      const k=progress(s,'beaconCollapse');if(k<1){ctx.globalAlpha*=1-k;ctx.translate(x,y);ctx.rotate(s.reduced?0:k*.22);ctx.scale(1,1-k*.35);SpriteAssets.drawFrame(ctx,SpriteAssets.getFrame(SpriteAssets.maps.props.beacon,0),0,0);}
    }
    else if(p.kind==='document'){
      if(p.unfold!==undefined){ctx.translate(x,y);ctx.scale(.18+.82*p.unfold,1);ctx.translate(-x,-y);}
      art(ctx,'props',p.frame,x,y,p.height,p.alpha);
      if(s.d.visual==='ledger'&&t>=6){ctx.strokeStyle='#8f311c';ctx.lineWidth=1.1;ctx.setLineDash([2,2]);ctx.beginPath();ctx.moveTo(x-8,y-6);ctx.lineTo(x+4,y+1);ctx.lineTo(x+1,y+7*progress(s,'southernRoute'));ctx.stroke();ctx.setLineDash([]);ctx.font='4px Georgia';ctx.fillStyle='#39291f';ctx.fillText('SOUTH',x+3,y+10);}
    }else if(p.kind==='reliquary')art(ctx,'props',p.closed?9:8,x,y-(p.lift||0),85,p.alpha);
    else if(p.kind==='binding')art(ctx,'props',10,x,y,48,p.alpha);
    else if(p.kind==='debris')art(ctx,'props',11,x,y,p.height,p.alpha);
    else if(p.kind==='medallion')art(ctx,'props',7,x,y,p.height,p.alpha,false,s.reduced?0:t*.35);
    else if(p.kind==='inscription')art(ctx,'props',14,x,y,p.height,p.alpha);
    else if(p.kind==='projection')art(ctx,'props',13,x,y,p.height,p.alpha*.75);
    else if(p.kind==='gateway'){
      if(p.aperture!==undefined){ctx.translate(x,y);ctx.scale(.06+.94*p.aperture,1);ctx.translate(-x,-y);}
      ctx.save();ctx.globalAlpha*=p.alpha;ctx.beginPath();ctx.ellipse(x,y-p.height*.42,p.height*.26,p.height*.43,0,0,TAU);ctx.clip();
      if(s.portalImage)ctx.drawImage(s.portalImage,x-p.height*.6,y-p.height,p.height*1.2,p.height*1.1);
      else{const grad=ctx.createLinearGradient(x,y-p.height,x,y);grad.addColorStop(0,'#100e18');grad.addColorStop(1,'#a94620');ctx.fillStyle=grad;ctx.fillRect(x-p.height,y-p.height,p.height*2,p.height);}
      ctx.restore();art(ctx,'props',12,x,y-p.height*.42,p.height,p.alpha);
      if(s.portalImage){ctx.save();ctx.globalAlpha*=p.alpha;ctx.beginPath();ctx.ellipse(x,y-p.height*.42,p.height*.15,p.height*.32,0,0,TAU);ctx.clip();ctx.drawImage(s.portalImage,x-p.height*.6,y-p.height,p.height*1.2,p.height*1.1);ctx.restore();}
    }
    ctx.restore();
  }
  function glow(ctx,x,y,r,color,alpha){
    if(alpha<=0)return;const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'#00000000');ctx.save();ctx.globalAlpha=alpha;ctx.globalCompositeOperation='lighter';ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);ctx.restore();
  }
  function ribbon(ctx,points,width,color){
    ctx.beginPath();
    for(const side of [1,-1])for(let n=0;n<points.length;n++){
      const i=side===1?n:points.length-1-n,p=points[i],a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy)||1,w=width*(1-i/points.length*.87);
      const x=p.x-dy/length*w*side,y=p.y+dx/length*w*side;
      n===0&&side===1?ctx.moveTo(x,y):ctx.lineTo(x,y);
    }
    ctx.closePath();ctx.fillStyle=color;ctx.fill();
  }
  function crack(ctx,x,y,index,k,age){
    const angle=index*2.399,r=150*k*(.65+noise(index)*.6),points=[{x,y}];
    for(let j=1;j<=8;j++){const d=r*j/8,off=(noise(index*11+j)-.5)*17;points.push({x:x+Math.cos(angle)*d+off,y:y+Math.sin(angle)*d*.43+off*.3});}
    ribbon(ctx,points,2.3,'#312423');ribbon(ctx,points,1.25,'#0b080b');
    ctx.save();ctx.globalAlpha=.68*(1-smooth((age-3)/10)*.7);ribbon(ctx,points,.35,'#ddb687');ctx.restore();
    for(const j of [3,6]){const p=points[j],turn=angle+(noise(index+j)>.5?1:-1)*.7,len=r*(.15+noise(index*4+j)*.1),branch=[p,{x:p.x+Math.cos(turn)*len*.45,y:p.y+Math.sin(turn)*len*.2},{x:p.x+Math.cos(turn)*len,y:p.y+Math.sin(turn)*len*.43}];ribbon(ctx,branch,.7,'#160f13');}
  }
  function tornSky(ctx,W,H,t,reduced){
    // A cloud shelf establishes the depth of the scar above the live road.
    const haze=ctx.createLinearGradient(0,0,0,H*.43);haze.addColorStop(0,'#151c2aee');haze.addColorStop(.45,'#354456aa');haze.addColorStop(1,'#75829200');ctx.fillStyle=haze;ctx.fillRect(0,0,W,H*.43);
    for(let i=0;i<7;i++){const x=W*(i/6+.025*Math.sin(i*2.7)),y=H*(.07+noise(i+410)*.07),r=W*.19,cloud=ctx.createRadialGradient(x,y,0,x,y,r);cloud.addColorStop(0,'#afbdce33');cloud.addColorStop(1,'#b6bdcb00');ctx.fillStyle=cloud;ctx.fillRect(x-r,y-r,r*2,r*2);}
    const points=[];for(let i=0;i<35;i++){const u=i/34;points.push({x:W*(.13+.73*u),y:H*(.16+.017*Math.sin(u*10)+.006*(noise(i+900)-.5))+(reduced?0:Math.sin(t*.15+u*2)*.4)});}
    ctx.save();ctx.lineJoin='round';ctx.lineCap='round';ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));
    for(const [width,color]of [[H*.035,'#84789512'],[H*.018,'#b6aac21c'],[H*.008,'#bfc5d650']]){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}
    // A torn opening has separate, irregular edges and visible depth inside it.
    // Both ends taper into the cloud; it must read as a wound rather than a line.
    const edges=[[],[]];
    points.forEach((p,i)=>{const u=i/(points.length-1),a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1;
      for(let side=0;side<2;side++){const w=H*(.007+.009*noise(i+side*61+1210))*Math.pow(Math.sin(u*Math.PI),.45)*(side?1:-1);edges[side].push({x:p.x-dy/len*w,y:p.y+dx/len*w});}
    });
    ctx.beginPath();[...edges[0],...edges[1].slice().reverse()].forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();
    const depth=ctx.createLinearGradient(0,H*.14,0,H*.19);depth.addColorStop(0,'#382640');depth.addColorStop(.5,'#050710');depth.addColorStop(1,'#252438');ctx.fillStyle=depth;ctx.fill();
    ctx.save();ctx.clip();for(let i=0;i<18;i++){const p=points[2+i*29/18|0];ctx.fillStyle='#c8b9d655';ctx.fillRect(p.x,p.y+(noise(i+1320)-.5)*H*.012,1.1,1.1);}ctx.restore();
    for(const edge of edges){ctx.beginPath();edge.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.strokeStyle='#d1c6db88';ctx.lineWidth=H*.0014;ctx.stroke();}
    for(let i=5;i<30;i+=7){const p=points[i],dir=i%2?1:-1,branch=[p,{x:p.x+W*.008,y:p.y+H*.018*dir},{x:p.x-W*.012,y:p.y+H*.032*dir},{x:p.x-W*.006,y:p.y+H*.056*dir}];ribbon(ctx,branch,H*.0019,'#191529aa');}
    ctx.restore();
  }
  function ground(s,ctx,cam){
    const g=s.stage;if(!g)return;const t=s.time,visual=s.d.visual,q=screen(g.named.core,cam),f=screen(g.focus,cam);
    ctx.save();
    if(g.id==='main'&&visual==='destroy'&&t>=contact(s,'shatter',14)){for(let i=0;i<7;i++)crack(ctx,q.x,q.y+36,i,progress(s,'fissures'),g.core.breakAge);}
    if(g.id==='main'&&visual==='seal'){
      const k=progress(s,'wardTrace');ctx.strokeStyle='#e3d4a1';ctx.lineWidth=1.4;ctx.globalAlpha=.7;
      for(let i=0;i<3;i++){ctx.beginPath();ctx.ellipse(q.x,q.y+36,32+i*17,16+i*8.5,0,0,TAU*k);ctx.stroke();}
      for(let i=0;i<8;i++){const a=i*TAU/8;art(ctx,'props',7,q.x+Math.cos(a)*66,q.y+36+Math.sin(a)*33,10,smooth((t-5-i*.5)/2));}
    }
    if(g.id==='vault'){
      const v=screen(g.guardian,cam),k=progress(s,'encroachingShadow');ctx.fillStyle='#100719';ctx.globalAlpha=.65*k;ctx.beginPath();ctx.moveTo(f.x,f.y);ctx.quadraticCurveTo(v.x-26,v.y+12,v.x,v.y+4);ctx.quadraticCurveTo(v.x-7,v.y-3,f.x,f.y);ctx.fill();
    }
    if(visual==='give'||s.d.id==='vethriss'){
      const v=g.warden||g.focusActor;if(v){const p=screen(visual==='give'?v.base:v,cam),k=progress(s,'unevenShadow');ctx.save();ctx.translate(p.x-4+(s.reduced?0:Math.sin(t*.6)*4),p.y+5);ctx.transform(1,0,-1.1,.27,0,0);ctx.filter='brightness(0)';ctx.globalAlpha=.6*k;
        if(v.cineArt)art(ctx,'warden',0,0,0,100,1,true);else SpriteAssets.drawActor(ctx,v.spriteOpts,v.pose());ctx.restore();}
    }
    if(visual==='quieting'){
      const p=screen(g.named.water,cam),water=ctx.createRadialGradient(p.x,p.y,8,p.x,p.y,105);water.addColorStop(0,'#010709fa');water.addColorStop(.7,'#020b10db');water.addColorStop(1,'#071b2400');
      ctx.save();ctx.translate(p.x,p.y);ctx.scale(1,.5);ctx.fillStyle=water;ctx.translate(-p.x,-p.y);ctx.fillRect(p.x-106,p.y-106,212,212);ctx.restore();
      for(const v of g.walkers){if(v.submerge<=0||v.submerge>=1)continue;const p=screen(v,cam);ctx.strokeStyle='#6c969055';ctx.lineWidth=.8;ctx.beginPath();ctx.ellipse(p.x,p.y,18,5,0,0,TAU);ctx.stroke();}
    }
    if(visual==='rescue'&&t>=1.8)for(let i=0;i<3;i++)art(ctx,'props',10,f.x+(i-1)*18,f.y+4,15,smooth((t-1.8)/.3),false,i*.8);
    ctx.restore();
  }
  function atmosphere(s,ctx,cam,W,H){
    const g=s.stage;if(!g)return;const t=s.time,d=s.d,q=screen(g.named.core,cam);ctx.save();
    if(g.id==='main'&&['destroy','core','seal','give','shard','portal'].includes(d.visual)){
      const breakFade=d.visual==='destroy'?1-smooth((t-14)/2):1;
      glow(ctx,q.x,q.y,90,'#f6c47766',.6*breakFade);
      if(d.visual==='destroy'&&activeEffect(s,'coreRelease')){
        const age=t-effect(s,'coreRelease').from;glow(ctx,q.x,q.y,40+age*110,'#ffe8b888',(1-smooth(age/3))*(s.reduced?.12:.8));
        ctx.strokeStyle='#edd6a577';ctx.lineWidth=2*(1-smooth(age/2));if(!s.reduced&&age<2){ctx.beginPath();ctx.ellipse(q.x,q.y+36,age*145,age*72,0,0,TAU);ctx.stroke();}
      }
    }
    if(g.id==='main'&&d.visual==='seal'&&t>=13)art(ctx,'props',t<17?8:9,q.x,q.y+30,80,progress(s,'enclosure'));
    if(d.boss&&g.focusActor){
      const chest=target(g,'bossChest'),p=screen(chest,cam);
      if(d.boss==='korvath'){
        glow(ctx,p.x,p.y,80,'#e99c5266',progress(s,'oathfire'));
        if(!s.reduced&&progress(s,'oathfire')>0)for(let i=0;i<9;i++){const rise=(t*16+i*7)%50;ctx.fillStyle='#eec288';ctx.globalAlpha=.4*(1-rise/50)*progress(s,'oathfire');ctx.fillRect(p.x+(noise(i)-.5)*42,p.y-rise,1.2,2.6);}
      }
      if(['mire_mother','azram','malthoron'].includes(d.boss)){
        const n=d.boss==='azram'?3:2;
        for(let i=0;i<n;i++){const x=p.x+(i-(n-1)/2)*25,y=p.y+Math.sin(t*.8+i)*3;art(ctx,'props',15,x,y,25,.2+progress(s,'souls')*.35);}
        glow(ctx,p.x,p.y,45,d.boss==='mire_mother'?'#b5ce9c44':'#cbbfee44',d.boss==='mire_mother'?.32+progress(s,'chestPulse')*.38*(.8+.2*Math.sin(t*3)):.7);
        if(d.boss==='azram'){ctx.strokeStyle='#c9aa7277';ctx.lineWidth=1.3;const sag=lerp(35,12,progress(s,'chains'));for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(p.x+(i-1)*25,p.y);ctx.quadraticCurveTo(p.x+(i-1)*38,p.y+sag,p.x+(i-1)*49,p.y+45);ctx.stroke();}}
      }
    }
    if(d.id==='ledger'&&t>=14){const p=screen(g.named.waystone,cam);glow(ctx,p.x,p.y,65,'#a2dacf55',progress(s,'waystone'));}
    if(!s.reduced&&activeEffect(s,'dust')){
      const origin=d.visual==='destroy'?q:screen(g.focus,cam),count=innerWidth<900?22:48;
      for(let i=0;i<count;i++){const age=d.visual==='destroy'?t-14:(t+i*.31)%6,k=clamp(age/7),x=origin.x+(noise(i)-.5)*(100+k*180),y=origin.y-20-noise(i+60)*80+k*90;ctx.fillStyle=d.visual==='breach'?'#cd8656':'#c4b9a0';ctx.globalAlpha=.32*(1-k);ctx.fillRect(x,y,1+noise(i+4)*2,1+noise(i+9)*2);}
    }
    if(g.id==='home')tornSky(ctx,W,H,t,s.reduced);
    if(g.id==='vault'){ctx.fillStyle='#0b092833';ctx.fillRect(0,0,W,H);}
    if(g.rivals?.length&&!s.reduced&&activeEffect(s,'distantConflict'))for(let i=0;i<4;i++){
      const a=g.rivals[i],b=g.rivals[i+4],phase=(t+i*.37)%2.4/2.4,hit=clamp(1-Math.abs(phase-.49)/.1),p=screen({x:(a.x+b.x)/2,y:(a.y+b.y)/2,lift:30},cam);
      glow(ctx,p.x,p.y,24,i%2?'#c1aff577':'#e88f4477',hit*.7);
      if(hit>0)for(let j=0;j<4;j++){const angle=noise(i*4+j)*TAU,r=(1-hit)*18;ctx.fillStyle=i%2?'#c6bae3':'#efb370';ctx.globalAlpha=hit*.65;ctx.fillRect(p.x+Math.cos(angle)*r,p.y+Math.sin(angle)*r*.7,1,2);}
      ctx.globalAlpha=1;
    }
    // Transitions and exposure are short and leave the acting area readable.
    const shotAge=t-s.shot.at,fade=s.reduced?0:Math.max(1-smooth(t/.45),1-smooth(shotAge/.16));
    if(fade>0){ctx.fillStyle='#05080c';ctx.globalAlpha=fade;ctx.fillRect(0,0,W,H);}ctx.restore();
  }
  function hide(s,e){return !!s.stage&&!s.stage.visible.has(e);}
  function architectureAlpha(s,d){
    const g=s.stage;if(!g)return 1;
    // The collected marker is replaced by the hand-held prop or staged portal.
    // Suppress its original draw only; the campaign object remains untouched.
    if(g.id==='main'&&s.d.object&&d.kind==='prop'&&d.pr?.storyId===s.d.object)return 0;
    if(['mon','npc','player','cinematicActor','cinematicProp','minion'].includes(d.kind))return 1;
    let alpha=1;
    if(s.d.visual==='assembly'&&!s.reduced){
      const p=d.pr||d.sc||d.payload||d;
      const q=Number.isFinite(p.x)?p:Number.isFinite(d.wx)?{x:U.unisoX(d.wx,d.wy),y:U.unisoY(d.wx,d.wy)}:null;
      if(q&&Math.hypot(q.x-g.hero.x,q.y-g.hero.y)>8){let index=0,best=Infinity;g.islands.forEach((r,i)=>{const dist=Math.hypot(r.x-q.x,r.y-q.y);if(dist<best){best=dist;index=i;}});alpha=progress(s,'islands',index*1.8);}
    }
    // Open foreground facades instead of letting a tower cover the acting space.
    if(/wall|cap|prop|scenery|building|pillar|landmark|support|rail|corner/i.test(d.kind)){
      const c=camera(s),camX=U.isoX(c.x,c.y)-innerWidth/c.zoom*.5;
      const subjects=[g.hero,g.focusActor,g.warden,g.scholar,g.guardian,...(g.walkers||[]),...(g.warriors||[]),...g.props.filter(p=>['core','document','projection'].includes(p.kind))].filter(Boolean);
      if(subjects.some(v=>d.d>v.x+v.y+.35&&Math.abs(d.sx-(U.isoX(v.x,v.y)-camX))<85&&Math.abs(d.d-v.x-v.y)<8))alpha*=.12;
    }
    return alpha;
  }
  function terrain(s,ctx,m,cam,draw){
    const g=s.stage;
    if(s.d.visual!=='assembly'||s.reduced||!m.cathedral||s.time>=18){draw();return;}
    function polygon(points){ctx.beginPath();points.forEach((p,i)=>{const x=U.isoX(p.x,p.y)-cam.x,y=U.isoY(p.x,p.y)-cam.y;i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.closePath();ctx.clip();}
    for(const room of m.cathedral.rooms){
      const index=g.islands.findIndex(r=>r.id===room.id),k=room.id==='entry'?1:progress(s,'islands',Math.max(0,index)*1.8);if(k<=0)continue;
      const x=room.x,y=room.y,w=room.w/2+1.5,h=room.h/2+1.5;
      ctx.save();polygon([{x:x-w,y:y-h},{x:x+w,y:y-h},{x:x+w,y:y+h},{x:x-w,y:y+h}]);ctx.globalAlpha*=k;ctx.translate(0,(1-k)*30);draw();ctx.restore();
    }
    for(const [i,link]of m.cathedral.connections.entries()){
      const k=progress(s,'bridges',i*.7),points=link.points||[];if(k<=0||points.length<2)continue;
      for(let n=1;n<points.length;n++){
        const a=points[n-1],b=points[n],dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1,r=(link.width||5)/2+1;
        const end={x:lerp(a.x,b.x,k),y:lerp(a.y,b.y,k)},ox=-dy/len*r,oy=dx/len*r;
        ctx.save();polygon([{x:a.x+ox,y:a.y+oy},{x:end.x+ox,y:end.y+oy},{x:end.x-ox,y:end.y-oy},{x:a.x-ox,y:a.y-oy}]);draw();ctx.restore();
      }
    }
  }
  return {prepare,update,camera,append,drawActor,drawProp,ground,atmosphere,hide,architectureAlpha,terrain,loadArt,
    get assets(){return assets;},get frameCount(){return frames.size;}};
})();
