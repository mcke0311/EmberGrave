/* Boss presentation only. Simulation time, bounded effects, independent noise.
   No gameplay RNG, damage, collision, callbacks, canvas allocation or pixel reads. */
'use strict';
const BossVFX=(()=>{
  const TAU=Math.PI*2,clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
  const motionPreference=window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const LIMITS=Object.freeze({events:24,particles:96});
  const recipes=Object.freeze({
    cleave:'steel',fissure:'fire',bile:'poison',grasp:'poison',chains:'gold',portals:'gold',gold:'fire',
    wings:'light',descent:'light',cross:'light',souls:'shadow',beam:'shadow',light:'light',lunge:'shadow',decoys:'shadow',echoes:'shadow',
  });
  const colors={steel:['#fff0c9','#bf9670'],fire:['#ffe8a6','#ec803d'],poison:['#e8efb8','#91b657'],
    gold:['#fff0c3','#d7ad64'],light:['#fff6e8','#c5b9ef'],shadow:['#e5d6ff','#9981c2']};
  let enabled=true;
  const particleGroups=new WeakMap();
  const reduced=()=>!!motionPreference?.matches;
  const noise=(seed,n)=>{const x=Math.sin(seed*19.13+n*73.31)*43758.5453;return x-Math.floor(x);};
  const palette=a=>a?.remembered?['#dcf3e9','#8fa9b8']:a?.quieting?colors.light:colors[recipes[a?.id]||'shadow'];
  const visual=e=>e.visual||(e.visual={time:0,serial:0,events:[],particles:[],peakEvents:0,peakParticles:0,trailAt:0});
  function cancel(e){
    if(e.visual){e.visual.events.length=0;e.visual.particles.length=0;e.visual.trailAt=0;}
    const cache=particleGroups.get(e);if(cache){cache.keys.clear();for(const group of cache.groups)group.particles.length=0;}
  }
  function begin(e){
    const v=visual(e),a=e.attack;
    if(!a)return;
    a.visual={x:e.mon.x,y:e.mon.y,angle:a.shapes[0]?.angle??Math.atan2(e.world.player.y-e.mon.y,e.world.player.x-e.mon.x),seed:++v.serial};
  }
  function push(e,event){
    const v=visual(e);
    if(v.events.length>=LIMITS.events)v.events.shift();
    v.events.push({t:0,dur:.5,seed:++v.serial,...event});v.peakEvents=Math.max(v.peakEvents,v.events.length);
  }
  function burst(e,x,y,col,count=12){
    if(reduced())return;
    const v=visual(e),seed=++v.serial;
    for(let i=0;i<count&&v.particles.length<LIMITS.particles;i++){
      const a=noise(seed,i)*TAU,s=.5+noise(seed,i+40)*2;
      v.particles.push({x,y,z:7,vx:Math.cos(a)*s,vy:Math.sin(a)*s,vz:23+noise(seed,i+80)*24,
        t:0,dur:.35+noise(seed,i+120)*.2,size:1.5+noise(seed,i+160)*1.6,col});
    }
    v.peakParticles=Math.max(v.peakParticles,v.particles.length);
  }
  function impact(e){
    if(!e.active||!e.attack)return;
    const a=e.attack,[bright,col]=palette(a),origin=a.visual||e.mon;
    if(!['beam','lunge'].includes(a.id))push(e,{kind:a.id,x:e.mon.x,y:e.mon.y,shapes:a.shapes.map(s=>({...s})),bright,col,dur:.5,angle:origin.angle||0});
    if(!['beam','lunge','decoys'].includes(a.id)){
      const spots=['bile','descent','portals'].includes(a.id)?a.shapes:[e.mon];
      for(const s of spots)burst(e,s.x,s.y,col,a.id==='portals'?8:12);
    }
    if(a.id==='decoys')for(const m of e.owned)if(!m.dead&&m.encounterKind==='decoy')m.bossVisualBirth=visual(e).time;
  }
  function ownedDeath(e,m){
    if(!e.active||!['portal','decoy'].includes(m.encounterKind))return;
    const col=m.encounterKind==='portal'?'#d7ad64':'#a1cfc4';
    push(e,{kind:'collapse',x:m.x,y:m.y,bright:'#eef2d8',col,shapes:[{kind:'circle',x:m.x,y:m.y,radius:1}],dur:.45});
    burst(e,m.x,m.y,col,16);
  }
  function update(e,dt){
    const v=visual(e);v.time+=dt;
    for(let i=v.events.length-1;i>=0;i--){const f=v.events[i];f.t+=dt;if(f.t>=f.dur)v.events.splice(i,1);}
    for(let i=v.particles.length-1;i>=0;i--){const p=v.particles[i];p.t+=dt;if(p.t>=p.dur||reduced()){v.particles.splice(i,1);continue;}
      p.x+=p.vx*dt;p.y+=p.vy*dt;p.z=Math.max(0,p.z+p.vz*dt);p.vz-=100*dt;
    }
    if(e.stage==='execute'&&e.attack?.id==='lunge'&&!reduced()&&v.time>=v.trailAt){
      v.trailAt=v.time+.07;push(e,{kind:'trail',x:e.mon.x,y:e.mon.y,angle:e.attack.shapes[0].angle,col:'#9ea3c6',dur:.24,shapes:[]});
    }
  }
  // Called by Entity.pose; reuse its cached descriptor for rendering and picking.
  function sampleActor(m,out){
    out.x=out.y=out.rot=0;out.sx=out.sy=out.alpha=1;
    if(!enabled||reduced()||m.dead)return out;
    const e=m.encounter||m.bossOwner?.encounter;
    if(!e?.active)return out;
    const a=e.attack;
    if(m.encounterKind==='decoy'){
      const p=clamp(((e.visual?.time||0)-(m.bossVisualBirth||0))/.22);
      out.alpha=.35+.65*p;out.y=-5*(1-p);return out;
    }
    if(!a||!['windup','execute','recovery'].includes(e.stage)||
      m.spriteOpts.bossPose!==({windup:'windup',execute:'impact',recovery:'recovery'})[e.stage])return out;
    const angle=a.visual?.angle??a.shapes[0]?.angle??0,ix=Math.cos(angle)-Math.sin(angle),iy=(Math.cos(angle)+Math.sin(angle))*.5;
    const len=Math.hypot(ix,iy)||1,dx=ix/len,dy=iy/len,sign=dx<0?-1:1;
    const p=clamp(e.stage==='windup'?1-e.timer/a.windup:e.stage==='execute'?a.age/a.duration:1-e.timer/e.recoveryDuration);
    const ease=p*p*(3-2*p),id=a.id,heavy=['cleave','fissure','grasp','gold','lunge'].includes(id);
    let advance=0,lift=0,tilt=0,squash=0;
    if(e.stage==='windup'){
      advance=-(heavy?7:4)*ease;tilt=-(heavy?.065:.035)*ease;squash=(heavy?.035:.02)*ease;
      if(id==='descent'){advance=0;lift=28*ease;tilt=.035*ease;squash=-.025*ease;}
      if(id==='wings'){lift=5*ease;advance=-3*ease;}
      if(id==='bile'){advance=-4*ease;squash=-.03*ease;lift=2*ease;}
    }else if(e.stage==='execute'){
      const k=(1-p)*(1-p);advance=(heavy?8:4)*k;tilt=(heavy?.08:.035)*k;squash=-(heavy?.025:.015)*k;
      if(id==='descent'){advance=0;squash=.04*k;}
      if(id==='lunge'){advance=0;tilt=.055*Math.sin(p*Math.PI);squash=-.03*Math.sin(p*Math.PI);}
      if(id==='beam'){advance=-3;tilt=-.02;squash=0;}
    }else{const k=Math.sin(p*Math.PI)*Math.exp(-p*5);advance=-2*k;tilt=-.025*k;squash=.012*k;}
    if(m.defId==='malthoron'&&e.phase>0&&id!=='descent'){lift+=2*Math.sin(p*Math.PI);tilt*=.7;}
    out.x=dx*advance;out.y=dy*advance-lift;out.rot=clamp(tilt*sign,-Math.PI/36,Math.PI/36);
    out.sx=1+clamp(squash,-.04,.04);out.sy=1-clamp(squash,-.04,.04);return out;
  }
  const px=(x,y,cam)=>U.isoX(x,y)-cam.x,py=(x,y,cam)=>U.isoY(x,y)-cam.y;
  function path(ctx,s,cam){
    const point=(x,y,first=false)=>first?ctx.moveTo(px(x,y,cam),py(x,y,cam)):ctx.lineTo(px(x,y,cam),py(x,y,cam));
    ctx.beginPath();
    if(s.kind==='line'){
      const c=Math.cos(s.angle),n=Math.sin(s.angle),w=s.width/2;
      point(s.x-n*w,s.y+c*w,true);point(s.x+c*s.length-n*w,s.y+n*s.length+c*w);
      point(s.x+c*s.length+n*w,s.y+n*s.length-c*w);point(s.x+n*w,s.y-c*w);ctx.closePath();return;
    }
    const start=s.kind==='cone'?s.angle-s.arc/2:0,end=s.kind==='cone'?s.angle+s.arc/2:TAU;
    if(s.kind==='cone')point(s.x,s.y,true);
    for(let i=0;i<=32;i++){const a=start+(end-start)*i/32;point(s.x+Math.cos(a)*s.radius,s.y+Math.sin(a)*s.radius,i===0&&s.kind!=='cone');}ctx.closePath();
    if(s.kind==='ring'){for(let i=0;i<=32;i++){const a=TAU-i*TAU/32;point(s.x+Math.cos(a)*s.inner,s.y+Math.sin(a)*s.inner,i===0);}ctx.closePath();}
  }
  function line(ctx,x,y,angle,length,cam,lift=0){
    ctx.beginPath();ctx.moveTo(px(x,y,cam),py(x,y,cam)-lift);
    ctx.lineTo(px(x+Math.cos(angle)*length,y+Math.sin(angle)*length,cam),py(x+Math.cos(angle)*length,y+Math.sin(angle)*length,cam)-lift);ctx.stroke();
  }
  function ring(ctx,x,y,r,cam,lift=0){ctx.beginPath();ctx.ellipse(px(x,y,cam),py(x,y,cam)-lift,r*32,r*16,0,0,TAU);ctx.stroke();}
  function area(ctx,s,cam,col,alpha){ctx.fillStyle=col;ctx.globalAlpha=alpha;path(ctx,s,cam);ctx.fill();}
  function groundStrike(ctx,f,cam){
    const k=1-clamp(f.t/f.dur),p=1-k;
    for(const s of f.shapes||[]){
      // The whole footprint lights immediately, even when secondary accents move.
      area(ctx,s,cam,f.bright,.2*k);ctx.strokeStyle=f.col;ctx.lineWidth=2;ctx.globalAlpha=.75*k;path(ctx,s,cam);ctx.stroke();
      if(reduced())continue;
      ctx.save();path(ctx,s,cam);ctx.clip();ctx.strokeStyle=f.bright;ctx.globalAlpha=.85*k;
      if(['fissure','chains','light','cross','echoes'].includes(f.kind)&&s.kind==='line'){
        const c=Math.cos(s.angle),n=Math.sin(s.angle);
        if(f.kind==='chains'){
          // All links appear at impact; a short tightening motion follows.
          for(let i=0;i<Math.ceil(s.length/.55);i++){
            const t=i*.55+.12*p,x=s.x+c*t,y=s.y+n*t;
            ctx.beginPath();ctx.ellipse(px(x,y,cam),py(x,y,cam),7,3.5,Math.atan2(c+n,2*(c-n)),0,TAU);ctx.stroke();
          }
        }else{
          ctx.lineWidth=f.kind==='fissure'?3:2;ctx.beginPath();
          for(let i=0;i<=18;i++){
            const t=s.length*i/18,j=(noise(f.seed,i)-.5)*s.width*.65,x=s.x+c*t-n*j,y=s.y+n*t+c*j;
            if(i===0)ctx.moveTo(px(x,y,cam),py(x,y,cam));else ctx.lineTo(px(x,y,cam),py(x,y,cam));
          }ctx.stroke();
          if(f.kind==='fissure'){ctx.globalAlpha=.3*k;ctx.lineWidth=9;ctx.stroke();}
        }
      }else if(s.kind==='cone'){
        for(let i=0;i<3;i++){const r=s.radius*(.55+i*.17+.12*p);ctx.beginPath();
          for(let j=0;j<=16;j++){const a=s.angle-s.arc/2+s.arc*j/16,x=s.x+Math.cos(a)*r,y=s.y+Math.sin(a)*r;
            if(j===0)ctx.moveTo(px(x,y,cam),py(x,y,cam));else ctx.lineTo(px(x,y,cam),py(x,y,cam));}ctx.stroke();}
      }else if(s.kind==='circle'||s.kind==='ring'){
        ring(ctx,s.x,s.y,s.radius*(.7+.3*p),cam);if(s.inner)ring(ctx,s.x,s.y,s.inner+.2*p,cam);
      }
      ctx.restore();
    }
  }
  function drawGround(ctx,world,cam){
    if(!enabled)return;
    ctx.save();
    for(const m of world.monsters){const e=m.encounter;if(!e?.active||m.dead)continue;
      for(const f of e.visual?.events||[])if(f.kind!=='trail')groundStrike(ctx,f,cam);
      for(const pool of e.pools){
        const t=pool.ttl;ctx.strokeStyle='#bbd589';ctx.lineWidth=1;ctx.globalAlpha=.35;
        for(let i=0;i<(reduced()?1:3);i++){const a=i*TAU/3,rad=.15+(reduced()?.2:((6-t)*.8+i*.31)%1)*.32;
          ring(ctx,pool.x+Math.cos(a)*.65,pool.y+Math.sin(a)*.65,rad,cam);}
      }
      const a=e.attack;
      if(e.stage==='execute'&&a?.id==='beam')for(const s of a.shapes){
        const [bright,col]=palette(a),pulse=reduced()?1:.8+.2*Math.pow(clamp(a.tick/.45),4);
        area(ctx,s,cam,col,.2);ctx.globalAlpha=.9*pulse;ctx.strokeStyle=bright;ctx.lineWidth=4;
        line(ctx,s.x,s.y,s.angle,s.length,cam);ctx.strokeStyle=col;ctx.lineWidth=11;ctx.globalAlpha=.32;ctx.stroke();
      }
      for(const portal of e.owned)if(!portal.dead&&portal.encounterKind==='portal'){
        const t=e.visual?.time||0;ctx.strokeStyle='#e4c484';ctx.lineWidth=1.5;ctx.globalAlpha=.6;
        ring(ctx,portal.x,portal.y,.9,cam);ring(ctx,portal.x,portal.y,.67,cam);
        if(!reduced())for(let i=0;i<3;i++){const a=t*.9+i*TAU/3;ctx.fillStyle='#fff0c3';ctx.beginPath();ctx.arc(px(portal.x+Math.cos(a)*.85,portal.y+Math.sin(a)*.85,cam),py(portal.x+Math.cos(a)*.85,portal.y+Math.sin(a)*.85,cam),2,0,TAU);ctx.fill();}
      }
    }ctx.restore();
  }
  // Elevated wisps and impact details participate in ordinary world depth sorting.
  function appendDraws(draws,world,cam,w,h){
    if(!enabled)return;
    for(const m of world.monsters){const e=m.encounter;if(!e?.active||m.dead)continue;
      const add=(item,x,y)=>{const sx=px(x,y,cam),sy=py(x,y,cam);if(sx<-250||sx>w+250||sy<-250||sy>h+250)return;
        draws.push({kind:'bossvfx',d:x+y+.002,x,y,e,...item});};
      if((e.stage==='windup'&&e.attack)||m.defId==='mire_mother'&&e.phase>0&&e.stage==='recovery')add({actor:m},m.x,m.y);
      for(const f of e.visual?.events||[])add({effect:f},f.x,f.y);
      // One terrain clip per occupied ground tile, rather than per spark.
      // Cache only rendering scratch; encounter state remains read-only here.
      let cache=particleGroups.get(e);
      if(!cache){cache={keys:new Map(),groups:[]};particleGroups.set(e,cache);}
      cache.keys.clear();let used=0;
      for(const p of e.visual?.particles||[]){
        const x=Math.floor(p.x),y=Math.floor(p.y),key=x+':'+y;let group=cache.keys.get(key);
        if(!group){group=cache.groups[used]||(cache.groups[used]={particles:[]});used++;group.particles.length=0;group.x=x+.5;group.y=y+.5;cache.keys.set(key,group);}
        group.particles.push(p);
      }
      for(let i=0;i<used;i++){const group=cache.groups[i];add({particles:group.particles},group.x,group.y);}
      for(let i=used;i<cache.groups.length;i++)cache.groups[i].particles.length=0;
    }
  }
  function drawItem(ctx,d,cam){
    if(!enabled)return;
    ctx.save();
    if(d.particles)for(const p of d.particles){ctx.globalAlpha=(1-p.t/p.dur)*.8;ctx.fillStyle=p.col;
      const x=px(p.x,p.y,cam),y=py(p.x,p.y,cam)-p.z;ctx.fillRect(x-p.size/2,y-p.size/2,p.size,p.size);
    }else if(d.actor){
      const m=d.actor,e=d.e,a=e.attack,p=a?clamp(1-e.timer/a.windup):0;
      const g=SpriteAssets.actorGeometry(m.spriteOpts,m.pose(),px(m.x,m.y,cam),py(m.x,m.y,cam),1.1);
      const x=(g.left+g.right)/2,y=g.top+(g.bottom-g.top)*(m.defId==='mire_mother'&&e.stage==='recovery'?.33:.55);
      const [bright,col]=palette(a);ctx.strokeStyle=col;ctx.fillStyle=bright;ctx.lineWidth=1.5;
      if(m.defId==='mire_mother'&&e.stage==='recovery'){
        ctx.globalAlpha=.7;ctx.fillStyle='#e6f5ba';ctx.beginPath();ctx.moveTo(x,y-8);ctx.lineTo(x+4,y);ctx.lineTo(x,y+8);ctx.lineTo(x-4,y);ctx.closePath();ctx.fill();
        ctx.globalAlpha=.25;ctx.strokeStyle='#b9d778';ctx.beginPath();ctx.ellipse(x,y,11,18,0,0,TAU);ctx.stroke();
      }else if(a?.id==='bile'){
        for(const s of a.shapes){
          const t=reduced()?1:p,tx=px(s.x,s.y,cam),ty=py(s.x,s.y,cam);
          const bx=x+(tx-x)*t,by=y+(ty-y)*t-(reduced()?0:65*Math.sin(t*Math.PI));
          ctx.globalAlpha=.35+.45*p;ctx.fillStyle='#b4cc79';ctx.beginPath();ctx.ellipse(bx,by,5+2*p,7+3*p,0,0,TAU);ctx.fill();
        }
      }else{
        ctx.globalAlpha=.25+.4*p;const r=5+7*p;
        ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.stroke();ctx.globalAlpha=.65*p;ctx.beginPath();ctx.arc(x,y,3,0,TAU);ctx.fill();
      }
    }else if(d.effect){
      const f=d.effect,p=clamp(f.t/f.dur),k=1-p,x=px(f.x,f.y,cam),y=py(f.x,f.y,cam);
      ctx.strokeStyle=f.col;ctx.fillStyle=f.bright||f.col;ctx.lineWidth=2;ctx.globalAlpha=.65*k;
      if(f.kind==='trail'&&!reduced()){
        line(ctx,f.x,f.y,f.angle+Math.PI,.65,cam,18);ctx.lineWidth=7;ctx.globalAlpha=.14*k;ctx.stroke();
      }else if(f.kind==='grasp'&&!reduced()){
        const s=f.shapes[0];if(s)for(let i=0;i<14;i++){
          const a=i*TAU/14,r=s.inner+.4+(i%3)*.55,rx=px(s.x+Math.cos(a)*r,s.y+Math.sin(a)*r,cam),ry=py(s.x+Math.cos(a)*r,s.y+Math.sin(a)*r,cam);
          const lift=18*Math.sin(Math.PI*Math.min(1,p*1.5));ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(rx-6,ry);ctx.quadraticCurveTo(rx-7,ry-lift,rx+4,ry-lift-5);ctx.stroke();
        }
      }else if(f.kind==='fissure'&&!reduced()){
        for(const s of f.shapes)for(let i=0;i<13;i++){
          const t=(i+.3)*s.length/13,rx=px(s.x+Math.cos(s.angle)*t,s.y+Math.sin(s.angle)*t,cam),ry=py(s.x+Math.cos(s.angle)*t,s.y+Math.sin(s.angle)*t,cam);
          const h=(10+noise(f.seed,i)*14)*k;ctx.fillStyle=i%2?f.col:f.bright;ctx.globalAlpha=.7*k;
          ctx.beginPath();ctx.moveTo(rx-4,ry);ctx.quadraticCurveTo(rx-5,ry-h*.5,rx+2,ry-h);ctx.quadraticCurveTo(rx,ry-h*.4,rx+5,ry);ctx.closePath();ctx.fill();
        }
      }else if(['descent','portals','collapse','decoys'].includes(f.kind)){
        for(const s of f.shapes.length?f.shapes:[f]){
          const lift=reduced()?8:f.kind==='collapse'?24*(1-p):28*p;
          ring(ctx,s.x,s.y,(f.kind==='collapse'?1-p:.5+.5*p),cam,lift);
        }
      }else if(['cleave','gold'].includes(f.kind)&&!reduced()){
        ctx.beginPath();ctx.ellipse(x,y-34,35,16,-.4,Math.PI*(.2+p*.2),Math.PI*(1.2+p*.2));ctx.stroke();
      }
    }
    ctx.restore();
  }
  function drawProjectile(ctx,p,cam){
    if(!enabled||!p.bossVisual)return false;
    const [bright,col]=palette(p.bossVisual),x=px(p.x,p.y,cam),y=py(p.x,p.y,cam)-p.lift;
    const angle=Math.atan2(U.isoY(p.vx,p.vy),U.isoX(p.vx,p.vy));
    ctx.save();ctx.translate(x,y);ctx.rotate(angle);
    if(!reduced()){
      ctx.strokeStyle=col;ctx.lineWidth=3;ctx.globalAlpha=.5;ctx.beginPath();ctx.moveTo(-4,0);ctx.quadraticCurveTo(-13,3*Math.sin(p.travelled*3),-23,0);ctx.stroke();
    }
    ctx.globalAlpha=.95;ctx.fillStyle=bright;
    if(p.bossVisual.id==='wings'){
      ctx.beginPath();ctx.moveTo(10,0);ctx.quadraticCurveTo(-3,-7,-7,-1);ctx.lineTo(-13,3);ctx.quadraticCurveTo(0,5,10,0);ctx.fill();
    }else{ctx.beginPath();ctx.ellipse(0,0,7,4,0,0,TAU);ctx.fill();ctx.fillStyle=col;ctx.fillRect(-3,-1,2,2);}
    ctx.restore();return true;
  }
  // Review visibility switch: retain the timeline for an exact paused comparison.
  function setEnabled(value){enabled=!!value;}
  function diagnostics(e){const v=e.visual;return {events:v?.events.length||0,particles:v?.particles.length||0,peakEvents:v?.peakEvents||0,peakParticles:v?.peakParticles||0};}
  return {LIMITS,recipes,begin,impact,ownedDeath,update,cancel,sampleActor,drawGround,appendDraws,drawItem,drawProjectile,setEnabled,diagnostics,get enabled(){return enabled;}};
})();
