/* Act II presentation. Controllers own combat; this module never schedules damage,
   changes positions, consumes gameplay randomness, or advances time while drawing. */
'use strict';
const Act2EnemyAnimation=(()=>{
  const clamp=(v)=>Math.max(0,Math.min(1,v));
  const media=window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const sequences={drowned_dead:['melee','death'],marsh_wretch:['melee','death'],silent_cultist:['bolt','death'],
    bog_bloat:['melee','death'],marsh_serpent:['melee','lunge','death'],gnarl_treant:['melee','slam','death'],
    stone_gargoyle:['melee','dive','death'],lure_child:['melee','blink','summon','death'],song_thrall:['bolt','volley','death'],
    marsh_larvae:['melee','death'],sludge_horror:['melee','death'],blight_treant:['melee','slam','death'],
    choir_herald:['bolt','summon','death'],brood_mother:['melee','summon','slam','death'],
    choirmaster:['bolt','summon','sacrifice','requiem','death'],mire_mother:['bile','grasp','death']};
  const ritual=id=>id==='quieting_ritual'||id==='drowned_ritual';
  // Classification is independent of animation/profile eligibility: boss-owned
  // reinforcements use legacy AI but retain the normal creature presentation.
  const showsAttackRadius=m=>!m?.combatMap?.act2||!!m.isBoss||!!m.beacon||ritual(m.defId);
  const hiddenRadius=Object.freeze({hideRadius:true});
  const novaPresentation=m=>showsAttackRadius(m)?undefined:hiddenRadius;
  const eligible=m=>!!m?.combatMap?.act2&&(!!sequences[m.defId]||ritual(m.defId));
  const valid=m=>eligible(m)&&m.combatWorld===Game.state&&m.combatMap===Game.state.map;
  const colors={cold:'#a6dcf0',shadow:'#b69acb',poison:'#b1c776',phys:'#cebea0'};
  const color=m=>colors[m.def.projectile?.elem]||(['bog_bloat','marsh_wretch','marsh_larvae','marsh_serpent','sludge_horror','blight_treant','brood_mother','mire_mother'].includes(m.defId)?colors.poison:colors.phys);
  let enabled=true;
  function attach(m){if(eligible(m))m.spriteOpts.act2Art=m.defId;}
  function cancel(m){if(m.act2Visual)m.act2Visual.events.length=0;}
  function emit(m,kind,shapes=[],elem){
    if(!valid(m))return;
    const v=m.act2Visual||(m.act2Visual={events:[]});
    // Hard per-owner cap, independent of pack size and repeated multi-hit skills.
    for(const s of (shapes.length?shapes:[m]).slice(0,6)){
      if(v.events.length>=12)v.events.shift();
      v.events.push({kind,x:s.x,y:s.y,radius:s.radius||.65,angle:m.visAng||0,time:Game.state.time,dur:.5,col:colors[elem]||color(m)});
    }
  }
  function tick(m){
    if(!valid(m)){cancel(m);return;}
    const v=m.act2Visual;if(v)for(let i=v.events.length-1;i>=0;i--)if(Game.state.time-v.events[i].time>=v.events[i].dur)v.events.splice(i,1);
  }
  function deferred(m,delay){
    if(eligible(m)&&m.action&&!m.act2Combat)m.action.visualRelease=delay;
  }
  function phase(age,windup,recovery,travel=0){
    if(age<windup)return Math.min(2,Math.floor(clamp(age/(windup||1))*3));
    if(travel&&age<windup+travel)return 3;
    return 3+Math.min(2,Math.floor(clamp((age-windup-travel)/(recovery||.001))*3));
  }
  function sample(m,pose){
    const ex=pose.ex;ex.act2Animation=undefined;
    if(!enabled||!valid(m)||ritual(m.defId))return;
    let id=null,frame=0;
    const a=m.action,c=m.act2Combat,p=c?.pending,e=m.encounter;
    if(m.dead){
      id='death';
      const age=Math.max(0,12-m.corpseT),burst=c?.burst;
      if(burst)frame=Math.min(2,Math.floor(clamp(burst.age/burst.duration)*3));
      else if(c&&m.def.deathBurst){const t=age-(m.def.deathBurst.windup||.8);frame=t<0?Math.min(2,Math.floor(clamp(age/.8)*3)):3+Math.min(2,Math.floor(clamp(t/.4)*3));}
      else frame=Math.min(5,Math.floor(clamp(age/.6)*6));
    }else if(e?.active&&e.attack&&['windup','execute','recovery'].includes(e.stage)){
      id=e.attack.id;
      frame=e.stage==='windup'?Math.min(2,Math.floor(clamp(1-e.timer/e.attack.windup)*3)):
        e.stage==='execute'?3:4+Math.min(1,Math.floor(clamp(1-e.timer/e.recoveryDuration)*2));
    }else if(p&&m.action===p.action){
      id=p.id;frame=phase(p.age,p.windup,p.recovery,p.motion?.duration||0);
      if(id==='requiem'&&p.steps?.length)frame=p.steps[0].done&&!p.released?3:phase(p.age,p.steps[0].at,p.recovery,p.windup-p.steps[0].at);
      if(p.released)frame=Math.max(3,frame);
      // Dive has an authored launch, flight, and separate landing pose.
      if(id==='dive'&&p.released)frame=p.motion?.done?4+Math.min(1,Math.floor(clamp((p.age-p.windup-p.motion.duration)/p.recovery)*2)):3;
    }else if(a&&['attack','cast'].includes(a.state)&&!m.castInterrupted()){
      id=m.def.projectile?'bolt':'melee';
      const windup=a.visualRelease??a.dur*.55;
      frame=phase(a.t,windup,Math.max(.01,a.dur-windup));
    }
    const row=sequences[m.defId]?.indexOf(id);if(row==null||row<0)return;
    const out=m._act2Animation||(m._act2Animation={});
    out.id=id;out.frame=frame;out.index=row*6+frame;out.asset='actor.act2.'+m.defId+(m.defId==='mire_mother'?'_'+(m.spriteOpts.bossPhase||0):'');
    out.alpha=1;
    // Blink relocation remains instantaneous in gameplay; only the silhouette fades.
    if(id==='blink'&&!media?.matches)out.alpha=[1,.85,.55,.35,.8,1][frame];
    ex.act2Animation=out;
  }
  function drawGround(ctx,state,cam){
    if(!enabled)return;
    let budget=128;
    for(const m of state.monsters){if(!valid(m))continue;
      for(const f of m.act2Visual?.events||[]){
        const t=clamp((state.time-f.time)/f.dur);if(t>=1)continue;
        const x=U.isoX(f.x,f.y)-cam.x,y=U.isoY(f.x,f.y)-cam.y;
        if(x < -200||y < -200||x>ctx.canvas.width+200||y>ctx.canvas.height+200)continue;
        if(--budget<0)return;
        ctx.save();LevelTerrain.clipBehind(ctx,state.map,cam,f.x,f.y);
        const k=media?.matches?1:.45+t*.55,r=Math.max(7,f.radius*35)*k;
        ctx.globalAlpha=(1-t)*.7;ctx.strokeStyle=f.col;ctx.fillStyle=f.col;ctx.lineWidth=2;
        if(f.kind==='melee'||f.kind==='lunge'){
          const side=Math.cos(f.angle)<0?-1:1;
          ctx.beginPath();ctx.ellipse(x+side*12,y-16,r*.7,r*.38,side*.4,-1.7,1.2);ctx.stroke();
        }else if(f.kind==='blink'||f.kind==='summon'||f.kind==='sacrifice'){
          if(showsAttackRadius(m))for(let j=0;j<3;j++){ctx.beginPath();ctx.ellipse(x,y-j*9*(1-t),r*(1-j*.18),r*.42*(1-j*.18),0,0,Math.PI*2);ctx.stroke();}
        }else if(f.kind==='bolt'||f.kind==='volley'){
          const count=f.kind==='volley'?3:1;
          for(let j=0;j<count;j++){const a=f.angle+(j-(count-1)/2)*.4,dx=Math.cos(a)*r,dy=Math.sin(a)*r*.5;
            ctx.beginPath();ctx.moveTo(x+dx*.3,y-22+dy*.3);ctx.lineTo(x+dx,y-22+dy);ctx.stroke();}
        }else if(showsAttackRadius(m)){ctx.beginPath();ctx.ellipse(x,y,r,r*.48,0,0,Math.PI*2);ctx.stroke();}
        if(!media?.matches)for(let i=0;i<6;i++){
          const a=i*Math.PI/3+.3,px=x+Math.cos(a)*r,py=y+Math.sin(a)*r*.48;
          ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px+Math.cos(a)*4,py-5-9*Math.sin(t*Math.PI));ctx.stroke();
        }
        ctx.restore();
      }
    }
  }
  function drawRitual(ctx,m,x,y){
    if(!enabled||!valid(m)||!ritual(m.defId))return;
    const age=m.dead?Math.max(0,12-m.corpseT):0;
    const recent=m.act2Visual?.events?.at(-1),t=recent?clamp((Game.state.time-recent.time)/.5):1;
    if(!m.dead&&t>=1)return;
    ctx.save();ctx.strokeStyle='#a4cbc1';ctx.lineWidth=2;ctx.globalAlpha=m.dead?Math.max(0,1-age/.7):(1-t)*.8;
    for(let i=0;i<4;i++){const r=12+i*7+(media?.matches?0:t*8);ctx.beginPath();ctx.ellipse(x,y-i*8,r,r*.4,0,0,Math.PI*2);ctx.stroke();}
    ctx.restore();
  }
  function drawRitualRemains(ctx,m,x,y,alpha){
    if(!enabled||!valid(m)||!ritual(m.defId)||!m.dead)return false;
    const frame=SpriteAssets.getFrame(SpriteAssets.maps.props.beacon,0),t=clamp((12-m.corpseT)/.7);
    // Shatter the existing stone into registered slices. These are cosmetic
    // fragments, never monsters or additional logical corpse sources.
    for(let i=0;i<4;i++){
      ctx.save();ctx.globalAlpha=alpha;ctx.translate(x+(i-1.5)*7*t,y-8*(1-t));ctx.rotate((i-1.5)*.38*t);ctx.scale(1-t*.25,1-t*.7);
      ctx.beginPath();ctx.rect(-frame.anchorX, -frame.anchorY+i*frame.sh/4,frame.sw,frame.sh/4);ctx.clip();SpriteAssets.drawFrame(ctx,frame,0,0);ctx.restore();
    }
    drawRitual(ctx,m,x,y);return true;
  }
  return {attach,sample,tick,emit,cancel,deferred,drawGround,drawRitual,drawRitualRemains,sequences,eligible,phase,showsAttackRadius,novaPresentation,
    get enabled(){return enabled;},set enabled(value){enabled=!!value;}};
})();
