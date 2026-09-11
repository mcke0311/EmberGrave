/* Combat presentation only. No damage, gameplay RNG, timers, or save data.
   Coordinates are tiles plus pixel lift; every emitter advances in update. */
'use strict';
const SkillVFX = (() => {
  const TAU=Math.PI*2, clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
  const palettes={
    steel:['#e1f1f3','#8daebc','#344952'], gold:['#fff0c9','#d0aa62','#594526'],
    fire:['#fff0b3','#f89736','#852910'], frost:['#e8ffff','#78bdd7','#24485e'],
    storm:['#f7f0ff','#b6a5ed','#494477'], bone:['#f0e7cd','#b6ad91','#514b3b'],
    hex:['#eed6ff','#ac7aca','#382344'], poison:['#deedb0','#88ac51','#344421'],
    shadow:['#c6bcd9','#736789','#252333'], earth:['#e8ce9b','#aa8555','#483b2c'],
    blood:['#ffd1b5','#b75949','#49241f'], nature:['#d9edc2','#89ac77','#354d37'],
  };
  // Explicit semantic coverage; IDs match DATA, including historical aliases.
  const assignments=`
vanguard_0_0 steel slash
vanguard_0_1 steel finish
vanguard_0_2 steel parry
vanguard_0_3 steel passive:weapon
vanguard_0_4 blood stance
vanguard_0_5 steel bulwark
vanguard_0_6 blood execute
vanguard_1_0 gold shout
terrifying_bellow hex fear
vanguard_1_2 gold banner
vanguard_1_3 steel passive:defense
vanguard_1_4 earth roar
vanguard_1_5 gold standard
vanguard_2_0 earth charge
vanguard_2_1 steel grapple
vanguard_2_2 steel axe
vanguard_2_3 earth passive:movement
ground_slam earth fissure
vanguard_2_5 steel bash
vanguard_2_6 earth leap
emberwitch_0_0 fire ember
emberwitch_0_1 fire cinders
emberwitch_0_2 fire passive:fire
emberwitch_0_3 fire wall
emberwitch_0_4 fire meteor
emberwitch_0_5 fire pyre
emberwitch_0_6 fire inferno
emberwitch_1_0 frost shard
emberwitch_1_1 frost nova
emberwitch_1_2 frost passive:frozen
emberwitch_1_3 frost lance
emberwitch_1_4 frost frostchain
rimeguard frost rimeward
emberwitch_1_6 frost glacier
spark storm sparks
stormshell storm stormward
emberwitch_2_2 storm lightning
emberwitch_2_3 storm orb
emberwitch_2_4 storm arcblink
emberwitch_2_5 storm static
emberwitch_2_6 storm overload
raise_dead bone skeleton
raise_plaguemage poison mage
gravebinder_0_2 bone golem
gravebinder_0_3 bone passive:minion
gravebinder_0_4 bone bonearmor
gravebinder_0_5 bone bonespear
dread_muster bone muster
gravebinder_0_7 fire sacrifice
mark_of_frailty hex frailty
withering_hex poison wither
gravebinder_1_2 hex doom
gravebinder_1_3 hex beckon
gravebinder_1_4 hex passive:curse
gravebinder_1_5 hex siphon
gravebinder_1_6 hex passive:kill
gravebinder_1_7 hex reap
venom_spit poison venom
gravebinder_2_1 poison seed
gravebinder_2_2 poison miasma
gravebinder_2_3 poison passive:corpse
gravebinder_2_4 bone devour
corpse_burst poison corpse
gravebinder_2_6 bone cadaver
gravebinder_2_7 poison outbreak
veilranger_0_0 gold arrow
veilranger_0_1 gold volley
veilranger_0_2 gold draw
veilranger_0_3 gold passive:weapon
veilranger_0_4 steel ricochet
veilranger_0_5 blood passive:weapon
veilranger_0_6 steel rain
veilranger_1_0 steel barbed
veilranger_1_1 steel passive:trap
veilranger_1_2 frost frosttrap
veilranger_1_3 steel dragnet
veilranger_1_4 steel caltrop
veilranger_1_5 fire powder
veilranger_1_6 blood passive:trap
veilranger_2_0 shadow blink
veilranger_2_1 shadow umbral
veilranger_2_2 shadow passive:movement
veilranger_2_3 shadow dusk
veilranger_2_4 blood mark
veilranger_2_5 shadow flurry
veilranger_2_6 shadow deathblow
call_wolf nature wolf
thornback_boar earth boar
wildkeeper_0_2 storm hawk
wildkeeper_0_3 earth bear
kinship nature passive:minion
feral_howl nature howl
wildkeeper_0_6 nature ent
wildkeeper_1_0 storm totem
totem_mastery storm passive:totem
ground_fissure earth fissure
wildkeeper_1_3 storm cyclone
wildkeeper_1_4 nature passive:totem
wildkeeper_1_5 earth quake
wildkeeper_1_6 storm tempest
fangform nature fangform
stoneform earth bearform
wildkeeper_2_2 earth stoneform
primal_surge fire passive:primal
rabies poison rabies
fire_claw fire claw
wildkeeper_2_6 fire apexform`;
  const hash=s=>{let n=2166136261;for(const c of s)n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;};
  const recipes=Object.fromEntries(assignments.trim().split('\n').map(line=>{
    const [id,material,motif]=line.split(' '),[shape,trigger]=motif.split(':');
    return [id,Object.freeze({id,material,motif:shape,trigger:trigger||null,seed:hash(id)})];
  }));
  recipes.basic=Object.freeze({id:'basic',material:'steel',motif:'slash',seed:17});Object.freeze(recipes);
  const LIMITS=Object.freeze({particles:520,events:96,trail:12,ghosts:12});
  let enabled=true,world=null,now=0,sequence=0,randomState=0x5a17c9,source=null;
  let events=[],particles=[],ghosts=[],tracked=new WeakMap(),actors=new WeakMap(),projectiles=new WeakMap();
  let dropped=0,peakParticles=0,peakEvents=0,externalParticles=0;
  const stamps=new Map();
  const random=()=>{randomState^=randomState<<13;randomState^=randomState>>>17;randomState^=randomState<<5;return (randomState>>>0)/4294967296;};
  const noise=(seed,i=0)=>{const v=Math.sin(seed*.013+i*127.1)*43758.5453;return v-Math.floor(v);};
  const get=id=>recipes[id]||null;
  function reset(){events=[];particles=[];ghosts=[];tracked=new WeakMap();actors=new WeakMap();projectiles=new WeakMap();world=null;source=null;now=0;sequence=0;randomState=0x5a17c9;dropped=peakParticles=peakEvents=0;}
  function scope(owner,id,fn){
    const state=typeof Game!=='undefined'?Game.state:null;
    if(!world&&state?.map){world={map:state.map,player:state.player,minions:state.minions};now=state.time;}
    const prev=source;source=id&&get(id)?{owner,id,recipe:get(id)}:null;try{return fn();}finally{source=prev;}
  }
  function context(owner){
    if(source)return source;
    const id=owner?._castingSkillId;
    return id&&get(id)?{owner,id,recipe:get(id)}:null;
  }
  const value=(sk,key,rk,fallback)=>typeof sk?.[key]==='function'?sk[key](rk):fallback;
  const terrain=(x,y,surfaceId)=>world?.map&&typeof TerrainNavigation!=='undefined'?TerrainNavigation.height(world.map,x,y,surfaceId)*14:0;
  const at=(entity,lift=0)=>({x:entity.x,y:entity.y,surfaceId:entity.surfaceId??0,z:terrain(entity.x,entity.y,entity.surfaceId)+(entity.jumpZ||0)+lift});
  function sampleAnchors(p){
    const a=actors.get(p)||{},time=typeof Game!=='undefined'?Game.state.time:now;
    // A fan releases several projectiles at one marker. Solve that pose once.
    if(a.sampleTime!==time||a.sampleAction!==p.action){
      a.anchors=typeof Player3D!=='undefined'?Player3D.effectAnchors?.(p,1.1):null;
      a.sampleTime=time;a.sampleAction=p.action;actors.set(p,a);
    }
    return a.anchors;
  }
  function anchor(p,name='hand'){
    const a=actors.get(p)?.anchors?.[name];
    if(a)return {x:p.x+a.x,y:p.y+a.y,z:terrain(p.x,p.y,p.surfaceId)+(p.jumpZ||0)+a.lift};
    const [dx,dy]=U.screenVecToWorld(p.visAng||0);
    return {x:p.x+dx*.35,y:p.y+dy*.35,z:terrain(p.x,p.y,p.surfaceId)+(p.jumpZ||0)+(name==='weapon'?23:30)};
  }
  function push(kind,recipe,point,extra={}){
    if(!enabled||!recipe||!Number.isFinite(point.x+point.y))return null;
    if(events.length>=LIMITS.events){dropped++;return null;}
    const event={surfaceId:point.surfaceId??(typeof TerrainLayers!=='undefined'?TerrainLayers.current(world?.map):0),kind,recipe,x:point.x,y:point.y,z:point.z??terrain(point.x,point.y),t:0,dur:.5,seed:++sequence,radius:1,...extra};
    events.push(event);peakEvents=Math.max(peakEvents,events.length);return event;
  }
  function burst(recipe,point,count=12,force=1){
    if(!enabled||!recipe)return;
    const cap=Math.max(0,Math.min(LIMITS.particles,700-externalParticles));
    const density=particles.length>cap*.65?.5:1;
    for(let i=0;i<Math.ceil(count*density);i++){
      if(particles.length>=cap){dropped++;break;}
      const a=random()*TAU,s=(.35+random()*2)*force,dur=.3+random()*.5;
      particles.push({surfaceId:point.surfaceId??(typeof TerrainLayers!=='undefined'?TerrainLayers.current(world?.map):0),x:point.x,y:point.y,z:point.z??terrain(point.x,point.y)+12,vx:Math.cos(a)*s,vy:Math.sin(a)*s,vz:12+random()*32,ground:terrain(point.x,point.y),t:0,dur,size:1.2+random()*3,angle:random()*TAU,spin:(random()-.5)*9,recipe,seed:sequence++});
    }
    peakParticles=Math.max(peakParticles,particles.length);
  }
  function passive(p,trigger,point){
    if(!enabled||!p?.skills)return;
    const a=actors.get(p)||{};if((a.passiveUntil||0)>now)return;
    const list=Object.keys(p.skills).map(get).filter(r=>r?.trigger===trigger&&p.skills[r.id]>0);
    if(!list.length)return;
    a.passiveUntil=now+.22;actors.set(p,a);
    for(const r of list.slice(0,2))burst(r,point,3,.45);
  }
  function activate(p,sk,target,point,before){
    if(!enabled||!sk||sk.type==='passive')return;
    const r=get(sk.id);if(!r)return;
    const rk=Math.max(1,p.effRank(sk.id)),aim=target||point||p;
    const a=actors.get(p)||{};a.recipe=r;a.aim={x:aim.x,y:aim.y};a.rank=rk;a.action=p.action;a.released=false;a.trail=[];actors.set(p,a);
    for(const key of ['siphon','drawing','charging','leaping','spinning','dashing'])if(p[key])p[key].sourceSkill=sk.id;
    if(p.action&&p.action!==before.action){
      const first=p.action.visual?.releases?.[0]??0;
      if(first>0)push('prepare',r,anchor(p),{owner:p,action:p.action,dur:Math.max(.08,first*p.action.dur),radius:.55});
      else if(!['charge_shot'].includes(sk.type))release(p,sk.id);
    }else if(!p.drawing&&!p.charging&&!p.leaping)push('sigil',r,at(p),{dur:.65,radius:.85});
    if(['blink','arcblink','afterimage'].includes(sk.type)){
      push('veil',r,before,{dur:.6,radius:1});push('veil',r,at(p),{dur:.55,radius:1});
      burst(r,before,16);burst(r,at(p,18),12);captureGhost(p,before);
    }
    if(sk.type==='form'){push('rise',r,at(p),{dur:.8,radius:1.2});burst(r,at(p,15),22);}
    if(sk.type==='dragnet')push('netcast',r,at(aim),{owner:p,action:p.action,fromX:p.x,fromY:p.y,tx:aim.x,ty:aim.y,dur:.4,radius:sk.radius(rk)});
    if(sk.type==='grapple'){const end=before.aim||aim;beam(before.x,before.y,end.x,end.y,r,{chain:true,dur:.42});}
    if(['deathmark','doom','plague_seed','taunt_curse'].includes(sk.type))push('sigil',r,at(aim,36),{dur:.7,radius:.65});
    if(['minionbuff','sacrifice'].includes(sk.type))for(const mi of world?.minions||[])if(!mi.dead)push('rise',r,at(mi),{dur:.6,radius:.7});
    if(sk.type==='devour')beam(aim.x,aim.y,p.x,p.y,r,{siphon:true});
    if(sk.type==='groundfield'||sk.type==='corpse'||sk.type==='corpse_launch')passive(p,'corpse',at(aim,12));
  }
  function release(p,id){
    if(!enabled||p.dead)return;
    const r=get(id);if(!r)return;
    const sk=p.resolveSkill?.(id)||DATA.SKILLS[id],rk=Math.max(1,p.effRank(id));
    const melee=['combo','combo_finish','execute','bash','rabies','fireclaw','sweep','dusk_cleave'].includes(sk?.type)||((id==='basic'||sk?.type==='melee')&&!p.stats.ranged);
    sampleAnchors(p);
    const a=actors.get(p)||{};a.released=true;a.trail=[];a.trailUntil=melee?now+.25:0;actors.set(p,a);
    if(melee){
      push('slash',r,at(p,18),{owner:p,angle:p.visAng||0,radius:value(sk,'range',rk,p.stats.range||1.5),dur:sk?.type==='execute'?.36:.24,heavy:['combo_finish','execute','bash','dusk_cleave'].includes(sk?.type)});
    }else if(!['charge','leap','form'].includes(sk?.type))push('flash',r,anchor(p),{dur:.19,radius:r.motif==='draw'?1.2:.65});
  }
  function hit(p,target,elem,critical=false){
    if(!enabled)return;
    const c=context(p),r=c?.recipe||get('basic'),point=at(target,18);
    // Multiple damage ticks still execute; only their decorative sparks coalesce.
    const prior=tracked.get(target)||{};
    if((prior.hitUntil||0)<=now){
      prior.hitUntil=now+.045;tracked.set(target,prior);
      push('impact',r,point,{dur:critical?.38:.26,radius:critical?1.3:.8,angle:p.visAng||0});
      burst(r,point,critical?15:8,critical?1.5:1);
    }
    passive(p,elem==='fire'?'fire':elem==='cold'&&target.frozen>now?'frozen':'weapon',point);
    if(target.dead&&(target.curseFrailty||target.curseWither||target.doom||target.killMark))passive(p,'kill',point);
  }
  function area(x,y,radius,owner,presentation){
    const c=context(owner||world?.player);if(!enabled||!c)return false;
    const r=c.recipe;
    if(!presentation?.hideRadius)push('wave',r,{x,y},{radius,dur:r.material==='earth'?.75:.55});
    burst(r,{x,y,z:terrain(x,y)+8},Math.min(24,8+radius*3),Math.min(2,radius*.6));
    if(['frailty','wither','doom','beckon'].includes(r.motif))passive(c.owner,'curse',{x,y,z:terrain(x,y)+20});
    return true;
  }
  function beam(x0,y0,x1,y1,recipe=null,extra={}){
    const c=context(world?.player),r=recipe||c?.recipe;if(!enabled||!r)return false;
    push('beam',r,{x:x0,y:y0,z:terrain(x0,y0)+24},{tx:x1,ty:y1,tz:terrain(x1,y1)+18,dur:extra.chain?.3:r.motif==='siphon'?.24:.3,...extra});return true;
  }
  function transfer(owner,id,from,to){
    const r=get(id);if(!enabled||!r)return;
    beam(from.x,from.y,to.x,to.y,r,{gather:r.material==='bone',z:terrain(from.x,from.y)+3,tz:terrain(to.x,to.y)+30,dur:.65});
    burst(r,at(from,10),6,.5);
  }
  function registerProjectile(pr,owner){
    if(!pr.fromPlayer&&pr.minionDmg===undefined)return;
    const c=context(owner);if(c){pr.sourceSkill=c.id;pr.visualOwner=c.owner||owner;}
    if(!enabled||!get(pr.sourceSkill))return;
    let origin={x:pr.x,y:pr.y,z:pr.kind==='arrow'?pr.lift:terrain(pr.x,pr.y,pr.surfaceId)+pr.lift};
    if(pr.fromPlayer&&pr.kind!=='arrow'&&owner){
      const anchors=sampleAnchors(owner);
      const hand=anchors?.hand;if(hand)origin={x:owner.x+hand.x,y:owner.y+hand.y,z:terrain(owner.x,owner.y)+(owner.jumpZ||0)+hand.lift};
    }
    projectiles.set(pr,{recipe:get(pr.sourceSkill),points:[],timer:0,origin,dx:origin.x-pr.x,dy:origin.y-pr.y,last:origin});
  }
  function projectilePoint(pr,a=projectiles.get(pr)){
    const k=1-clamp(pr.travelled/.9);
    return {x:pr.x+(a?.dx||0)*k,y:pr.y+(a?.dy||0)*k,z:a?.origin?.z??pr.lift};
  }
  function projectileContact(pr,kind){
    const r=get(pr.sourceSkill);if(!enabled||!r)return;
    const point=projectilePoint(pr);
    push('impact',r,point,{dur:.22,radius:kind==='bounce'?.6:.8});burst(r,point,kind==='bounce'?5:8);
  }
  function captureGhost(p,point){
    if(ghosts.length>=LIMITS.ghosts)return;
    // Snapshot only on a blink. Copying a WebGL canvas every frame would force
    // a GPU synchronization even for skills that never use an afterimage.
    const frame=typeof Player3D!=='undefined'?Player3D.effectImage?.(p):null;if(!frame)return;
    ghosts.push({...point,...frame,t:0,dur:.36});
  }
  function update(dt,state,legacyParticleCount=0){
    if(!enabled)return;
    if(world&&(world.map!==state.map||world.player!==state.player)){reset();for(const mi of state.minions)tracked.set(mi,{});}
    world={map:state.map,player:state.player,minions:state.minions};now=state.time;externalParticles=legacyParticleCount;
    if(state.player?.dead){reset();return;}
    dt=clamp(dt,0,.1);
    for(const e of events)e.t+=dt;
    events=events.filter(e=>e.t<e.dur&&(!e.action||e.owner.action===e.action)&&!e.owner?.dead);
    for(const pa of particles){pa.t+=dt;pa.x+=pa.vx*dt;pa.y+=pa.vy*dt;pa.z=Math.max(pa.ground,pa.z+pa.vz*dt);pa.vz-=80*dt;pa.angle+=pa.spin*dt;}
    particles=particles.filter(p=>p.t<p.dur);
    const room=Math.max(0,Math.min(LIMITS.particles,700-legacyParticleCount));if(particles.length>room){dropped+=particles.length-room;particles.splice(0,particles.length-room);}
    for(const g of ghosts)g.t+=dt;ghosts=ghosts.filter(g=>g.t<g.dur);
    for(const pr of state.projectiles){
      if(!get(pr.sourceSkill))continue;
      let a=projectiles.get(pr);if(!a){a={recipe:get(pr.sourceSkill),points:[],timer:0};projectiles.set(pr,a);}
      const point=projectilePoint(pr,a),prev=a.last||point;
      for(let sample=1/45-a.timer;sample<=dt;sample+=1/45){const u=dt?sample/dt:1;a.points.push({x:prev.x+(point.x-prev.x)*u,y:prev.y+(point.y-prev.y)*u,z:prev.z+(point.z-prev.z)*u});if(a.points.length>LIMITS.trail)a.points.shift();}
      a.timer=(a.timer+dt)%(1/45);a.last=point;
    }
    const p=state.player;if(!p)return;let a=actors.get(p)||{};actors.set(p,a);
    const active=p.charging||p.leaping||p.dashing||p.spinning;
    if(a.recipe&&(a.trailUntil>now||p.action===a.action||p.drawing||active||p.siphon)){
      if((a.trailUntil>now||p.drawing||!a.released)&&(a.anchorAt||0)<=now){sampleAnchors(p);a.anchorAt=now+1/30;}
      if(a.trailUntil>now){a.trail.push(anchor(p,'weapon'));if(a.trail.length>8)a.trail.shift();}
    }
    a.emit=(a.emit||0)+dt;
    if(a.emit>=.07){
      a.emit%=.07;
      if(active&&a.recipe){burst(a.recipe,at(p,4),2,.5);if(a.recipe.material==='shadow')captureGhost(p,at(p));}
      if(p.moving)passive(p,'movement',at(p,2));
    }
    // Births and persistent state are read here, not guessed from skill names.
    for(const mi of state.minions){
      if(mi.dead||!get(mi.sourceSkill))continue;
      if(!tracked.has(mi)){tracked.set(mi,{});push('rise',get(mi.sourceSkill),at(mi),{dur:.8,radius:.8});burst(get(mi.sourceSkill),at(mi,12),14);passive(p,'minion',at(mi,20));}
    }
    for(const f of state.fx){
      if(f.type==='totem'&&get(f.sourceSkill)&&!tracked.has(f)){tracked.set(f,{});passive(p,'totem',at(f,30));}
    }
  }

  // Small cached gradients make layered glows inexpensive (no per-particle blur).
  function stamp(material,dark=false){
    const key=material+(dark?'dark':'light');if(stamps.has(key))return stamps.get(key);
    const canvas=document.createElement('canvas');canvas.width=canvas.height=64;
    const c=canvas.getContext('2d'),col=palettes[material],g=c.createRadialGradient(32,32,0,32,32,32);
    g.addColorStop(0,dark?col[2]:col[0]);g.addColorStop(.18,dark?col[2]:col[1]);g.addColorStop(.52,col[1]+'70');g.addColorStop(1,col[2]+'00');
    c.fillStyle=g;c.fillRect(0,0,64,64);stamps.set(key,canvas);return canvas;
  }
  function glow(c,r,x,y,w,h=w,alpha=.45){c.save();c.globalAlpha*=alpha;c.globalCompositeOperation='lighter';c.drawImage(stamp(r.material),x-w/2,y-h/2,w,h);c.restore();}
  const project=(p,cam)=>[U.isoX(p.x,p.y)-cam.x,U.isoY(p.x,p.y)-cam.y-(p.z??terrain(p.x,p.y,p.surfaceId))];
  function line(c,points,color,width=1,alpha=1){if(points.length<2)return;c.save();c.globalAlpha*=alpha;c.strokeStyle=color;c.lineWidth=width;c.lineJoin='round';c.lineCap='round';c.beginPath();c.moveTo(...points[0]);for(let i=1;i<points.length;i++)c.lineTo(...points[i]);c.stroke();c.restore();}
  function shard(c,x,y,size,angle,col,bone=false){
    c.save();c.translate(x,y);c.rotate(angle);c.fillStyle=col[1];c.beginPath();c.moveTo(size*2,0);c.lineTo(-size,-size*.65);c.lineTo(-size*.5,size*.65);c.closePath();c.fill();
    c.fillStyle=col[0];c.beginPath();c.moveTo(size*2,0);c.lineTo(-size,-size*.65);c.lineTo(-size*.3,0);c.closePath();c.fill();
    if(bone){c.fillStyle=col[1];for(const yy of [-.5,.5]){c.beginPath();c.arc(-size,size*yy,size*.55,0,TAU);c.fill();}}c.restore();
  }
  function flameStamp(index){
    const key='flame'+index;if(stamps.has(key))return stamps.get(key);
    const canvas=document.createElement('canvas');canvas.width=64;canvas.height=96;
    const ctx=canvas.getContext('2d'),pixels=ctx.createImageData(64,96);
    const smooth=t=>t*t*(3-2*t),lerp=(a,b,t)=>a+(b-a)*t;
    const cloud=(x,y)=>{const ix=Math.floor(x),iy=Math.floor(y),u=smooth(x-ix),v=smooth(y-iy);return lerp(lerp(noise(ix+iy*71+index*9),noise(ix+1+iy*71+index*9),u),lerp(noise(ix+(iy+1)*71+index*9),noise(ix+1+(iy+1)*71+index*9),u),v);};
    for(let y=0;y<96;y++)for(let x=0;x<64;x++){
      const up=1-y/96,n=cloud(x*.13,y*.085)+cloud(x*.3,y*.17)*.4;
      const sway=Math.sin(up*7+index)*up*8+Math.sin(up*15+index*2)*up*3;
      const width=(1-up)*17+2,edge=1-Math.abs(x-32-sway)/width;
      const heat=clamp(edge*.85+(n-.65)*.65-up*.32),alpha=clamp(heat*2.5)*clamp((1-up)*7)*clamp((96-y)/5);
      const core=clamp(heat*1.35),i=(x+y*64)*4;
      pixels.data[i]=255;pixels.data[i+1]=Math.round(65+core*185);pixels.data[i+2]=Math.round(10+Math.pow(core,2.8)*200);pixels.data[i+3]=Math.round(alpha*230);
    }
    ctx.putImageData(pixels,0,0);stamps.set(key,canvas);return canvas;
  }
  function flame(c,r,x,y,h,seed,t){
    if(h<1)return;const frame=(Math.floor(t*12)+Math.floor(seed))%12,w=h*.7;
    c.drawImage(flameStamp(frame),x-w/2,y-h,w,h+3);
  }
  function rune(c,r,x,y,radius,t,alpha=1){
    const col=palettes[r.material];c.save();c.translate(x,y);c.scale(1,.52);c.globalAlpha*=alpha;
    c.strokeStyle=col[1];c.lineWidth=1.2;c.beginPath();c.arc(0,0,radius,0,TAU);c.stroke();
    const n=5+r.seed%4;
    for(let i=0;i<n;i++){const a=i*TAU/n+t*.16,rr=radius*.8;c.save();c.rotate(a);line(c,[[rr-3,-3],[rr,2],[rr+4,-4]],col[0],1,.8);c.restore();}
    c.restore();
  }
  function ribbon(c,points,r,width=5,alpha=1){
    const col=palettes[r.material];for(let i=1;i<points.length;i++){const k=i/(points.length-1);line(c,[points[i-1],points[i]],col[1],Math.max(.3,width*k),alpha*k*.5);line(c,[points[i-1],points[i]],col[0],Math.max(.25,width*k*.22),alpha*k*.85);}
  }
  function lightning(c,r,x0,y0,x1,y1,seed,t,width=2){
    const dx=x1-x0,dy=y1-y0,length=Math.hypot(dx,dy)||1,n=Math.max(3,Math.min(18,Math.ceil(length/18))),points=[];
    for(let i=0;i<=n;i++){const k=i/n,off=i&&i<n?(noise(seed+Math.floor(t*22)*31,i)-.5)*15:0;points.push([x0+dx*k-dy/length*off,y0+dy*k+dx/length*off]);}
    line(c,points,palettes[r.material][1],width*3,.18);line(c,points,palettes[r.material][1],width,.85);line(c,points,palettes[r.material][0],width*.4,1);
    for(let i=2;i<n;i+=4){const p=points[i],side=noise(seed,i)>.5?1:-1;line(c,[p,[p[0]+dx/n-dy/length*side*9,p[1]+dy/n+dx/length*side*9],[p[0]+dx/n*2-dy/length*side*18,p[1]+dy/n*2+dx/length*side*18]],palettes[r.material][1],.7,.5);}
  }
  function netMesh(c,x,y,radius,alpha=1){
    c.save();c.translate(x,y);c.scale(1,.5);c.globalAlpha*=alpha;
    c.beginPath();c.arc(0,0,radius,0,TAU);c.clip();
    for(let i=-radius*2;i<=radius*2;i+=Math.max(7,radius/5)){
      line(c,[[i-radius,-radius],[i+radius,radius]],'#e4d6ac',1.5,.85);
      line(c,[[i-radius,radius],[i+radius,-radius]],'#b69c6b',1.5,.85);
    }
    c.restore();c.save();c.strokeStyle='#e4d6ac';c.lineWidth=2;c.globalAlpha*=alpha;c.beginPath();c.ellipse(x,y,radius,radius*.5,0,0,TAU);c.stroke();c.restore();
  }
  function drawEvent(c,e,cam){
    const r=e.recipe,col=palettes[r.material],k=clamp(e.t/e.dur),fade=Math.pow(1-k,1.3),[x,y]=project(e,cam),rad=e.radius*32;
    c.save();c.globalAlpha*=fade;
    if(e.kind==='beam'&&e.veilBlade){
      const [tx,ty]=project({x:e.tx,y:e.ty,z:e.tz,surfaceId:e.surfaceId},cam),u=Math.min(1,k*2);
      line(c,[[x,y],[tx,ty]],col[1],2,fade*.65);shard(c,x+(tx-x)*u,y+(ty-y)*u,7,Math.atan2(ty-y,tx-x),col);
    }else if(e.kind==='netcast'){
      const [fx,fy]=project({x:e.fromX,y:e.fromY,z:terrain(e.fromX,e.fromY)+24},cam);
      const u=k*k,px=fx+(x-fx)*u,py=fy+(y-fy)*u-Math.sin(k*Math.PI)*48;
      c.globalAlpha=1;netMesh(c,px,py,12+rad*k*.75,.85);
    }else if(e.kind==='prepare'){
      const [hx,hy]=project(anchor(e.owner),cam);glow(c,r,hx,hy,24+36*k,24+36*k,.45);
      for(let i=0;i<5;i++){const a=i*TAU/5+e.t*3,rr=22*(1-k)+3;shard(c,hx+Math.cos(a)*rr,hy+Math.sin(a)*rr*.7,1.8,a,col,r.material==='bone');}
    }else if(e.kind==='slash'){
      const reach=Math.min(110,rad+12),angle=e.angle,span=e.heavy?2.4:1.65,start=angle-span*.65+k*span*.45;
      const points=[];for(let i=0;i<=18;i++){const a=start+i/18*span;points.push([x+Math.cos(a)*reach,y+Math.sin(a)*reach*.58]);}
      ribbon(c,points,r,e.heavy?11:7,.95);
      if(e.heavy){const inner=points.map(p=>[x+(p[0]-x)*.74,y+(p[1]-y)*.74+7]);ribbon(c,inner,r,4,.6);}
    }else if(e.kind==='fissure'){
      const [ex,ey]=project({x:e.tx,y:e.ty,z:terrain(e.tx,e.ty)},cam),dx=ex-x,dy=ey-y,n=12;
      const pts=[];for(let i=0;i<=n;i++){const u=i/n,off=(noise(e.seed,i)-.5)*e.radius*18;pts.push([x+dx*u+off,y+dy*u+off*.5]);}
      line(c,pts,col[2],7,.9);line(c,pts,col[1],2,.7);
      for(let i=1;i<n;i++){const p=pts[i],h=(12+noise(e.seed,i)*23)*Math.sin(clamp(k*2-i/n*.7)*Math.PI);shard(c,p[0],p[1]-h*.5,Math.max(1,h*.3),-Math.PI/2,col);line(c,[p,[p[0]+(i%2?1:-1)*15,p[1]+9]],col[2],2,.8);}
    }else if(e.kind==='wave'){
      const rr=Math.max(4,rad*(1-Math.pow(1-k,3)));
      glow(c,r,x,y,rr*2.3,rr*.9,.17);
      const n=Math.min(30,Math.max(12,Math.round(e.radius*6)));
      c.strokeStyle=col[1];c.lineWidth=2;c.beginPath();c.ellipse(x,y,rr,rr*.5,0,0,TAU);c.stroke();
      for(let i=0;i<n;i++){
        const a=i*TAU/n,px=x+Math.cos(a)*rr,py=y+Math.sin(a)*rr*.5,s=3+noise(e.seed,i)*5;
        if(r.material==='fire')flame(c,r,px,py,(12+s*3)*(1-k*.6),i,now);
        else if(['frost','earth','bone','steel'].includes(r.material))shard(c,px,py-s*.6,s*(1-k*.55),a-Math.PI/2,col,r.material==='bone');
        else if(r.material==='storm'&&i%3===0)lightning(c,r,x+Math.cos(a)*rr*.72,y+Math.sin(a)*rr*.36,px,py-8,e.seed+i,now,.8);
        else {c.fillStyle=col[1];c.globalAlpha=fade*.22;c.beginPath();c.ellipse(px,py,8+s,4+s*.3,0,0,TAU);c.fill();c.globalAlpha=fade;}
      }
    }else if(e.kind==='beam'){
      const [ex,ey]=project({x:e.tx,y:e.ty,z:e.tz},cam);
      if(e.chain||r.motif==='grapple'){
        const dx=ex-x,dy=ey-y,n=Math.min(40,Math.ceil(Math.hypot(dx,dy)/7)),angle=Math.atan2(dy,dx);
        for(let i=0;i<=n;i++){const u=i/n;c.save();c.translate(x+dx*u,y+dy*u+Math.sin(u*Math.PI)*8*(1-k));c.rotate(angle);c.strokeStyle=i%2?col[1]:col[0];c.lineWidth=1.3;c.beginPath();c.ellipse(0,0,4,i%2?1:2.5,0,0,TAU);c.stroke();c.restore();}
      }else if(r.material==='storm'||r.motif==='frostchain')lightning(c,r,x,y,ex,ey,e.seed,now,2);
      else{
        const pts=[];for(let i=0;i<=22;i++){const u=i/22,off=Math.sin(u*TAU*2-now*15)*5*Math.sin(u*Math.PI);pts.push([x+(ex-x)*u,y+(ey-y)*u+off]);}
        ribbon(c,pts,r,6,.8);
        for(let i=0;i<6;i++){const u=(i/6+e.t*1.8)%1,px=x+(ex-x)*u,py=y+(ey-y)*u;if(e.gather)shard(c,px,py,3,i+e.t*6,col,true);else glow(c,r,px,py,10,8,.5);}
      }
    }else if(e.kind==='rise'||e.kind==='veil'){
      rune(c,r,x,y,rad*(.7+k*.4),now,.6);glow(c,r,x,y-20,rad*2,75,.24);
      for(let i=0;i<9;i++){const a=i*TAU/9+k*2,rr=rad*(e.kind==='rise'?1-k*.7:1+k*.5);shard(c,x+Math.cos(a)*rr,y+Math.sin(a)*rr*.45-k*42,2+noise(e.seed,i)*3,a,col,r.material==='bone');}
    }else if(e.kind==='sigil')rune(c,r,x,y,rad*(.8+k*.3),now,.85);
    else if(e.kind==='impact'||e.kind==='flash'){
      const size=(e.kind==='flash'?22:36)*e.radius;glow(c,r,x,y,size*(1+k),size*(1+k),.7);
      if(r.material==='fire'){for(let i=0;i<3;i++)flame(c,r,x+(i-1)*6,y+5,size*(.6+noise(e.seed,i)*.4)*(1-k*.5),i,now);}
      else if(r.material==='poison'||r.material==='shadow'){
        for(let i=0;i<5;i++){const a=i*TAU/5,rr=k*size*.4;c.fillStyle=col[1];c.globalAlpha=fade*.5;c.beginPath();c.ellipse(x+Math.cos(a)*rr,y+Math.sin(a)*rr*.5,3+size*.09,2+size*.055,0,0,TAU);c.fill();}
      }else for(let i=0;i<5;i++){const a=i*TAU/5+e.seed,rr=5+k*size*.4;line(c,[[x+Math.cos(a)*rr*.35,y+Math.sin(a)*rr*.35],[x+Math.cos(a)*rr,y+Math.sin(a)*rr]],col[0],1.2,.85);}
    }
    c.restore();
  }
  function drawProjectile(c,pr,cam){
    if(!enabled)return false;const r=get(pr.sourceSkill);if(!r)return false;
    const col=palettes[r.material],a=projectiles.get(pr),[x,y]=project(projectilePoint(pr,a),cam),angle=Math.atan2(U.isoY(pr.vx,pr.vy),U.isoX(pr.vx,pr.vy));
    c.save();const pts=(a?.points||[]).map(p=>project(p,cam));
    const arrow=pr.kind==='arrow',wide=['draw','skewer','lance','bonespear'].includes(r.motif);
    ribbon(c,pts,r,arrow?(wide?4:2):r.material==='fire'?11:6,.85);
    if(!arrow)glow(c,r,x,y,pr.kind==='cadaver'?30:r.material==='fire'?48:32,undefined,.6);
    if(pr.veilCast){
      const heavy=r.motif==='deathblow';shard(c,x,y,heavy?13:8,angle,col);
      if(heavy)shard(c,x-Math.cos(angle)*14,y-Math.sin(angle)*14,6,angle,col);
    }else if(r.material==='storm'&&!arrow){
      const dx=Math.cos(angle)*17,dy=Math.sin(angle)*17;lightning(c,r,x-dx,y-dy,x+dx*.4,y+dy*.4,r.seed,now,1.8);
    }else if(r.material==='fire'&&!arrow){
      c.save();c.translate(x,y);c.rotate(angle+Math.PI/2);flame(c,r,0,9,29,r.seed,now);c.restore();
      for(let i=0;i<Math.min(4,pts.length);i++){const p=pts[Math.max(0,pts.length-2-i*2)];if(p)glow(c,r,p[0],p[1],8,8,.6-i*.1);}
    }else if(pr.boomerang){
      c.translate(x,y);c.rotate(pr.travelled*2);line(c,[[0,-10],[0,10]],'#806746',3);c.fillStyle=col[1];c.beginPath();c.moveTo(-1,-9);c.quadraticCurveTo(13,-15,10,-2);c.lineTo(0,-3);c.fill();line(c,[[3,-10],[10,-8],[10,-3]],col[0],1.3);
    }else if(arrow){
      const len=wide?22:15,dx=Math.cos(angle),dy=Math.sin(angle);line(c,[[x-dx*len,y-dy*len],[x+dx*5,y+dy*5]],'#6d5740',2.6);line(c,[[x-dx*len,y-dy*len],[x+dx*5,y+dy*5]],col[0],.8);shard(c,x+dx*6,y+dy*6,3,angle,col);
      for(const s of [-1,1])line(c,[[x-dx*(len-3),y-dy*(len-3)],[x-dx*(len+2)-dy*3*s,y-dy*(len+2)+dx*3*s]],col[1],1.2);
    }else if(r.material==='frost'||r.material==='bone'){shard(c,x,y,wide?8:5,angle,col,r.material==='bone');if(wide){shard(c,x-Math.cos(angle)*10,y-Math.sin(angle)*10,4,angle,col,r.material==='bone');}}
    else {c.fillStyle=col[1];c.beginPath();c.ellipse(x,y,6,4,angle,0,TAU);c.fill();c.fillStyle=col[0];c.beginPath();c.arc(x-1,y-1,2,0,TAU);c.fill();}
    c.restore();return true;
  }
  function fieldRecipe(f){return get(f.sourceSkill||f.skillId);}
  function drawField(c,f,cam,ground){
    const r=fieldRecipe(f);if(!r||!enabled)return false;
    const col=palettes[r.material],[x,y]=project({x:f.x,y:f.y,z:terrain(f.x,f.y,f.surfaceId)},cam),rad=(f.radius||1)*32;
    const life=Math.min(1,(f.ttl??1)/.55),seed=r.seed;
    c.save();c.globalAlpha*=life;
    if(ground){
      if(['groundfield','rain','outbreak','totem','banner','meteorfall','cyclone'].includes(f.type)){
        const rr=f.type==='outbreak'?(f.r||.1)*32:rad;
        glow(c,r,x,y,rr*2.25,rr*1.05,.16);
        if(!['cyclone','meteorfall'].includes(f.type)){
          c.strokeStyle=col[1];c.globalAlpha*=.45;c.lineWidth=1.3;c.beginPath();c.ellipse(x,y,rr,rr*.5,0,0,TAU);c.stroke();c.globalAlpha=life;
          for(let i=0;i<16;i++){const a=i*TAU/16;line(c,[[x+Math.cos(a)*(rr-3),y+Math.sin(a)*(rr-3)*.5],[x+Math.cos(a)*(rr+2),y+Math.sin(a)*(rr+2)*.5]],col[0],1,.35);}
        }
      }
    }else if(f.type==='dragnet'){
      const k=clamp(1-f.ttl/f.maxTtl);netMesh(c,x,y,rad*(1-.8*k),1-k);
    }else if(f.type==='groundfield'){
      const n=Math.min(32,Math.max(10,Math.round((f.radius||2)*7)));
      for(let i=0;i<n;i++){
        const a=i*2.39996,rr=Math.sqrt((i+.5)/n)*rad*.91,px=x+Math.cos(a)*rr,py=y+Math.sin(a)*rr*.5,q=noise(seed,i),phase=now*(.7+q*.3)+q*TAU;
        if(f.fieldKind==='inferno')flame(c,r,px,py,18+q*23+Math.sin(phase*7)*4,i,now);
        else if(f.fieldKind==='glacier'){shard(c,px,py-(7+q*12),6+q*9,-Math.PI/2+(q-.5)*.5,col);if(i%4===0)glow(c,r,px,py,28,13,.22);}
        else if(f.fieldKind==='static'){if(i%3===Math.floor(now*5)%3)lightning(c,r,px,py,px+(q-.5)*24,py-10-q*20,seed+i,now,1);}
        else if(f.fieldKind==='caltrop'){for(let j=0;j<3;j++)line(c,[[px-5,py+2],[px,py-6],[px+4,py+3]],col[j],1.1,.9);}
        else if(f.fieldKind==='quake'){const h=3+Math.max(0,Math.sin(phase*3))*12;shard(c,px,py-h,5+q*8,-Math.PI/2,col);line(c,[[px-10,py+4],[px-3,py],[px+5,py+2],[px+12,py-4]],col[2],2,.7);}
        else { // smoke and miasma leave silhouettes visible through moving wisps.
          const w=24+q*24;c.globalAlpha=life*(f.fieldKind==='smoke'?.23:.17);c.drawImage(stamp(r.material,true),px-w/2+Math.sin(phase)*8,py-w*.45-Math.sin(phase*.7)*5,w,w*.7);
          if(f.fieldKind!=='smoke'&&i%4===0){c.strokeStyle=col[1];c.lineWidth=1;c.beginPath();c.arc(px,py-8-(phase%1)*9,2+q*2,0,TAU);c.stroke();}c.globalAlpha=life;
        }
      }
    }else if(f.type==='firewall'){
      const [ex,ey]=project({x:f.x1,y:f.y1,z:terrain(f.x1,f.y1,f.surfaceId)},cam),[sx,sy]=project({x:f.x0,y:f.y0,z:terrain(f.x0,f.y0,f.surfaceId)},cam),n=Math.min(38,Math.ceil(Math.hypot(ex-sx,ey-sy)/9));
      line(c,[[sx,sy],[ex,ey]],col[2],9,.8);
      for(let i=0;i<=n;i++){const u=i/n,px=sx+(ex-sx)*u,py=sy+(ey-sy)*u;flame(c,r,px,py,34+Math.sin(now*9+i*1.8)*9+noise(seed,i)*9,i,now);}
    }else if(f.type==='pyre'){
      const k=clamp(1-f.ttl/f.maxTtl),rise=Math.sin(k*Math.PI);
      glow(c,r,x,y-25,rad*2,90,.35*rise);
      for(let i=0;i<9;i++){const a=i*2.39996,rr=rad*(.15+noise(seed,i)*.55);flame(c,r,x+Math.cos(a)*rr,y+Math.sin(a)*rr*.5,(35+noise(seed,i)*45)*rise,i,now);}
      flame(c,r,x,y,110*rise,seed,now);
    }else if(f.type==='rain'){
      for(let i=0;i<12;i++){
        const a=i*2.39996,rr=Math.sqrt((i+.5)/12)*rad*.92,px=x+Math.cos(a)*rr,py=y+Math.sin(a)*rr*.5,t=(now*2.1+noise(seed,i))%1,h=(1-t)*125;
        line(c,[[px-8,py-h-22],[px,py-h]],col[1],1.2,.3+t*.5);shard(c,px,py-h,2,1.22,col);if(t>.88)glow(c,r,px,py,15,6,.3);
      }
    }else if(f.type==='tripwire'){
      const start=project({x:f.x0,y:f.y0,z:terrain(f.x0,f.y0,f.surfaceId)+2},cam),end=project({x:f.x1,y:f.y1,z:terrain(f.x1,f.y1,f.surfaceId)+2},cam);
      line(c,[start,end],f.sprung?'#804637':col[1],1.5,.85);
      for(const p of [start,end]){shard(c,p[0],p[1],4,-Math.PI/2,col);glow(c,r,p[0],p[1],12,7,.25);}
    }else if(f.type==='totem'||f.type==='banner'){
      line(c,[[x,y],[x,y-45]],'#322c25',7);line(c,[[x-1,y],[x-1,y-44]],'#998260',2);
      if(f.type==='banner'){
        c.fillStyle=r.motif==='standard'?'#70532b':'#725140';c.beginPath();c.moveTo(x+2,y-44);for(let i=0;i<=8;i++){const u=i/8;c.lineTo(x+2+u*26,y-44+u*5+Math.sin(now*4-u*3)*u*3);}c.lineTo(x+25,y-19);c.lineTo(x+2,y-24);c.fill();
        line(c,[[x+8,y-35],[x+13,y-39],[x+18,y-34],[x+13,y-28],[x+8,y-35]],col[1],1.3);glow(c,r,x,y-40,35,50,.18);
      }else{
        shard(c,x,y-42,8,-Math.PI/2,col);for(const s of [-1,1]){line(c,[[x,y-32],[x+s*12,y-38],[x+s*15,y-48]],'#857151',3);shard(c,x+s*15,y-48,3,-Math.PI/2,col);}
        glow(c,r,x,y-44,36,45,.5);if(Math.sin(now*7)>0)lightning(c,r,x-13,y-43,x+13,y-43,seed,now,.9);
      }
      rune(c,r,x,y,22,now,.35);
    }else if(f.type==='cyclone'){
      if(f.orb){
        glow(c,r,x,y-22,70,70,.55);c.strokeStyle=col[1];c.lineWidth=1.5;
        for(let i=0;i<3;i++){c.beginPath();c.ellipse(x,y-22,14,5+i*4,now+i,0,TAU);c.stroke();}lightning(c,r,x-12,y-25,x+12,y-17,seed,now,1.5);
      }else{
        const h=70+(f.radius||1)*12;
        for(let band=0;band<8;band++){const u=band/7,rr=rad*(.15+u*.42),yy=y-u*h,sway=Math.sin(now*5-u*4)*7;c.strokeStyle=col[1];c.lineWidth=4+u*3;c.globalAlpha=life*(.12+u*.04);c.beginPath();c.ellipse(x+sway,yy,rr,rr*.34,0,now*6+u*3,now*6+u*3+Math.PI*1.65);c.stroke();c.globalAlpha=life*.7;for(let j=0;j<2;j++){const a=now*8+u*5+j*Math.PI;shard(c,x+sway+Math.cos(a)*rr,yy+Math.sin(a)*rr*.34,1.8+u*2,a,col);}}
      }
    }else if(f.type==='meteorfall'){
      const k=clamp(1-f.ttl/f.maxTtl),fall=250*(1-k),px=x-46*(1-k),py=y-fall;
      rune(c,r,x,y,rad,now,.3+k*.3);glow(c,r,px,py,70,90,.5);
      c.save();c.translate(px,py);c.rotate(-.18);flame(c,r,0,10,60+30*k,seed,now);c.restore();
      shard(c,px,py,10+(f.radius||2)*2,now*2,palettes.earth);glow(c,r,px,py+3,32,25,.9);
    }else if(f.type==='outbreak'){
      const rr=(f.r||.1)*32;for(let i=0;i<22;i++){const a=i*TAU/22;glow(c,r,x+Math.cos(a)*rr,y+Math.sin(a)*rr*.5-4,18,14,.45);}
    }else if(f.type==='wisp')glow(c,r,x,y-20,32,40,.65);
    c.restore();return true;
  }
  function drawTrap(c,tr,cam){
    const r=fieldRecipe(tr);if(!enabled||!r)return false;
    const [x,y]=project({x:tr.x,y:tr.y,z:terrain(tr.x,tr.y,tr.surfaceId)},cam),col=palettes[r.material],armed=tr.armT<=0;
    c.save();c.globalAlpha=armed?1:.55;glow(c,r,x,y,32,15,armed?.25:.1);
    c.strokeStyle='#74685a';c.lineWidth=2.5;c.beginPath();c.ellipse(x,y,12,6,0,0,TAU);c.stroke();
    for(let i=0;i<8;i++){const a=i*TAU/8;shard(c,x+Math.cos(a)*11,y+Math.sin(a)*5,3,-Math.PI/2+Math.cos(a)*.5,col);}
    if(r.motif==='powder'){c.fillStyle='#594732';c.fillRect(x-5,y-5,10,6);line(c,[[x+3,y-6],[x+7,y-9],[x+9,y-8]],col[1],1.5);glow(c,r,x+9,y-8,12,12,.6);}
    else if(r.motif==='frosttrap')shard(c,x,y-3,5,-Math.PI/2,col);
    else line(c,[[x-5,y],[x,y-3],[x+5,y]],col[0],1.3);
    if(armed)rune(c,r,x,y,17,now,.3);c.restore();return true;
  }
  function drawActor(c,p,cam){
    if(!enabled||p.dead)return;const a=actors.get(p),[x,y]=project(at(p),cam);
    if(a?.trailUntil>now&&a.trail?.length>1)ribbon(c,a.trail.map(t=>project(t,cam)),a.recipe,6,clamp((a.trailUntil-now)/.25));
    if(p.drawing){const r=get(p.drawing.sourceSkill);if(r){const k=clamp(p.drawing.t/p.drawing.maxDraw),[hx,hy]=project(anchor(p,'weapon'),cam);glow(c,r,hx,hy,20+k*32,20+k*32,.25+k*.3);for(let i=0;i<3;i++){const ang=i*TAU/3+now*2,rr=16*(1-k)+5;shard(c,hx+Math.cos(ang)*rr,hy+Math.sin(ang)*rr,2,ang,palettes[r.material]);}}}
    if(p.shadowAmbushUntil>now){const col=palettes.shadow;for(const sign of [-1,1]){shard(c,x+sign*19,y-26,5,sign*.4,col);line(c,[[x+sign*13,y-17],[x+sign*20,y-26],[x+sign*13,y-35]],col[0],1.5,.8);}}
    const wards=p.buffs?.filter(b=>b.sourceSkill&&get(b.sourceSkill)&&(!b.until||b.until>now))||[];
    if(p.boneWard?.hp>0&&p.boneWard.until>now)wards.unshift({sourceSkill:'gravebinder_0_4',until:p.boneWard.until});
    // Buff refresh may recreate objects every tick; presentation follows duration.
    for(const [i,b] of wards.slice(0,3).entries()){
      const r=get(b.sourceSkill),fade=Math.min(1,(b.until-now)/.5),col=palettes[r.material];c.save();c.globalAlpha*=Number.isFinite(fade)?clamp(fade):1;
      if(['bonearmor','rimeward','stormward','bulwark','parry'].includes(r.motif)){
        for(let j=0;j<3;j++){const a=now*.65+j*TAU/3;shard(c,x+Math.cos(a)*20,y-23+Math.sin(a)*8,3,a-Math.PI/2,col,r.material==='bone');}
      }else{const ang=now*.5+i*2;line(c,[[x+Math.cos(ang)*14,y+Math.sin(ang)*7-2],[x+Math.cos(ang+.4)*14,y+Math.sin(ang+.4)*7-2]],col[1],1.6,.45);}
      c.restore();
    }
  }
  function drawStatus(c,m,cam){
    if(!enabled||m.dead)return;
    const [x,y]=project(at(m,34),cam);let r=null;
    if(m.killMark&&m.killMark.until>now)r=get('veilranger_2_4');
    else if(m.doom&&m.doom.until>now)r=get('gravebinder_1_2');
    else if(m.curseFrailty&&m.curseFrailty.until>now)r=get('mark_of_frailty');
    else if(m.curseWither&&m.curseWither.until>now)r=get('withering_hex');
    if(r){const col=palettes[r.material];c.save();c.globalAlpha=.7;line(c,[[x-5,y-8],[x,y-12],[x+5,y-8],[x,y+1],[x-5,y-8]],col[1],1.3);line(c,[[x,y-14],[x,y+3]],col[0],.8);c.restore();}
    if(m.veilExposedUntil>now){const col=palettes.shadow;line(c,[[x-12,y-7],[x-17,y],[x-12,y+7]],col[0],2);line(c,[[x+12,y-7],[x+17,y],[x+12,y+7]],col[0],2);line(c,[[x-4,y-4],[x+4,y+4]],col[1],2);line(c,[[x+4,y-4],[x-4,y+4]],col[1],2);}
    if(m.snarePull||m.snareRootUntil>now){
      const [nx,ny]=project(at(m,2),cam);netMesh(c,nx,ny,Math.max(17,m.radius*40),.75);
      line(c,[[nx-12,ny-2],[nx-8,ny-20],[nx+8,ny-20],[nx+12,ny-2]],'#e4d6ac',1,.75);
    }
    if((m.plague&&m.plague.until>now)||(m.rabies&&m.rabies.until>now)){
      const col=palettes.poison;c.save();c.globalAlpha=.45;
      for(let i=0;i<3;i++){const a=now+i*TAU/3,rr=13+Math.sin(now*2+i)*3;c.strokeStyle=col[1];c.lineWidth=1;c.beginPath();c.arc(x+Math.cos(a)*rr,y+24+Math.sin(a)*5,2,0,TAU);c.stroke();}c.restore();
    }
  }
  const groundEvent=e=>['wave','fissure','sigil'].includes(e.kind);
  const visible=(p,cam,w,h,margin=120)=>{const [x,y]=project(p,cam);return x>-margin&&y>-margin&&x<w+margin&&y<h+margin;};
  function drawGround(c,state,cam,surfaceId=0){
    if(!enabled||state.player?.dead)return;
    for(const mi of state.minions){
      if(mi.dead || (mi.surfaceId??0)!==surfaceId || !mi.auraRadius || !Object.keys(mi.auraStats||{}).length)continue;
      const r=get(mi.sourceSkill); if(!r || !visible(mi,cam,c.canvas.width,c.canvas.height,mi.auraRadius*64))continue;
      const [x,y]=project(at(mi),cam);
      c.save();LevelTerrain.clipBehind(c,state.map,cam,mi.x,mi.y,mi.surfaceId);
      rune(c,r,x,y,mi.auraRadius*32*Math.SQRT2,now,.3);c.restore();
    }
    for(const e of events)if((e.surfaceId??0)===surfaceId&&groundEvent(e)&&visible(e,cam,c.canvas.width,c.canvas.height,e.radius*64+150)){c.save();LevelTerrain.clipBehind(c,state.map,cam,e.x,e.y,e.surfaceId);drawEvent(c,e,cam);c.restore();}
    for(const f of state.fx){
      if((f.surfaceId??0)!==surfaceId)continue;
      const p={x:f.x??f.x0,y:f.y??f.y0,surfaceId:f.surfaceId};
      if(!fieldRecipe(f)||f.type==='slamwarning'||!visible(p,cam,c.canvas.width,c.canvas.height,(f.len||f.radius||2)*64+150))continue;
      c.save();LevelTerrain.clipBehind(c,state.map,cam,p.x,p.y,p.surfaceId);
      if(f.type==='fissure')drawEvent(c,{...p,z:terrain(p.x,p.y,p.surfaceId),kind:'fissure',recipe:fieldRecipe(f),tx:f.x0+Math.cos(f.ang)*f.len,ty:f.y0+Math.sin(f.ang)*f.len,t:f.maxTtl-f.ttl,dur:f.maxTtl,radius:f.visualWidth||1.5,seed:f.seed},cam);
      else drawField(c,f,cam,true);c.restore();
    }
  }
  function appendDraws(draws,state,cam,w,h){
    if(!enabled||state.player?.dead)return;
    const add=(x,y,payload)=>draws.push({d:x+y+.015,kind:'skillvfx',x,y,payload});
    for(const e of events)if(!groundEvent(e)&&visible(e,cam,w,h,200))add(e.x,e.y,{event:e});
    for(const f of state.fx)if(fieldRecipe(f)&&f.type!=='slamwarning'&&visible(f,cam,w,h,(f.radius||2)*64+260))add(f.x,f.y,{field:f});
    // Particles share clipping and depth per tile instead of hundreds of terrain queries.
    const groups=new Map();for(const p of particles){if(!visible(p,cam,w,h,24))continue;const key=(p.surfaceId??0)+':'+Math.floor(p.x)+','+Math.floor(p.y);let group=groups.get(key);if(!group){group=[];groups.set(key,group);}group.push(p);}
    for(const group of groups.values())add(group[0].x,group[0].y,{particles:group});
    for(const g of ghosts)if(visible(g,cam,w,h,140))add(g.x,g.y,{ghost:g});
  }
  function drawItem(c,item,cam){
    const {event,field,particles:group,ghost}=item.payload;
    if(event)drawEvent(c,event,cam);
    if(field)drawField(c,field,cam,false);
    if(group)for(const p of group){const [x,y]=project(p,cam),k=1-p.t/p.dur,r=p.recipe,col=palettes[r.material];c.save();c.globalAlpha*=k;
      if(['frost','bone','earth','steel','nature'].includes(r.material))shard(c,x,y,p.size*k,p.angle,col,r.material==='bone');
      else{line(c,[[x-p.vx*1.6,y-p.vy*.8+p.vz*.035],[x,y]],col[1],p.size*k*.65,.8);c.fillStyle=col[0];c.fillRect(x-1,y-1,1.6,1.6);}
      c.restore();}
    if(ghost){const [x,y]=project(ghost,cam);c.save();c.globalAlpha*=.22*(1-ghost.t/ghost.dur);c.drawImage(ghost.image,x-ghost.ax,y-ghost.ay,ghost.width,ghost.height);c.restore();}
  }
  function drawLights(c,state,cam){
    if(!enabled)return;
    let count=0;for(const e of events){if(!['impact','flash','wave'].includes(e.kind)||++count>16||!visible(e,cam,c.canvas.width,c.canvas.height))continue;
      c.save();LevelTerrain.clipBehind(c,state.map,cam,e.x,e.y,e.surfaceId);const [x,y]=project(e,cam);glow(c,e.recipe,x,y,Math.min(120,35+e.radius*20),30+e.radius*8,.14*(1-e.t/e.dur));c.restore();}
  }
  function diagnostics(){return {enabled,recipes:Object.keys(recipes).length-1,particles:particles.length,events:events.length,ghosts:ghosts.length,peakParticles,peakEvents,dropped,limits:LIMITS};}
  const hasStatus=m=>enabled&&!m.dead&&!!(m.veilExposedUntil>now||m.snarePull||m.snareRootUntil>now||m.killMark||m.doom||m.curseFrailty||m.curseWither||m.plague||m.rabies);
  return Object.freeze({recipes,palettes,scope,context,activate,release,hit,area,beam,transfer,passive,registerProjectile,projectileContact,update,reset,drawGround,appendDraws,drawItem,drawProjectile,drawTrap,drawActor,drawStatus,drawLights,diagnostics,
    hasStatus,get enabled(){return enabled;},setEnabled(v){enabled=!!v;reset();},isStyled:o=>enabled&&!!fieldRecipe(o)});
})();
