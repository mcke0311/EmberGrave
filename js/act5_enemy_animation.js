/* Act V presentation only. The existing AI owns time, movement and damage. */
'use strict';
const Act5EnemyAnimation=(()=>{
  const zones=new Set(['ash_wastes','cinder_bastion','throne']);
  const clamp=v=>Math.max(0,Math.min(1,v));
  const media=window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const hiddenRadius=Object.freeze({hideRadius:true});
  const eligible=m=>!!m?.defId&&(!m.isBoss||(m.def?.boss==='mini'&&!!DATA.ACT5_COMBAT_PROFILES[m.defId]))&&!m.encounter&&!m.beacon&&zones.has(m.combatMap?.id);
  const valid=m=>eligible(m)&&m.combatWorld===Game.state&&m.combatMap===Game.state.map;
  const showsAttackRadius=m=>!eligible(m);
  const colors={fire:'#ff9c42',cold:'#a7dfff',light:'#ead38b',shadow:'#b698d4',poison:'#afc977',phys:'#c7b9a4'};
  let enabled=true;
  function begin(m,kind,windup=0,recovery=.25){
    if(!enabled||!valid(m))return;
    m.act5Visual={kind,start:Game.state.time,windup,recovery,action:m.action,epoch:m.castEpoch,released:false};
  }
  function action(m){
    if(!valid(m)||!['attack','cast'].includes(m.action?.state))return;
    const a=m.action;begin(m,a.act5Kind||(m.def.projectile?'bolt':'melee'),a.dur*.55,a.dur*.45);
  }
  function deferred(m,delay){
    if(!valid(m))return;
    const v=m.act5Visual;
    if(v&&v.action===m.action){v.windup=delay;v.recovery=Math.max(.12,m.action.dur-delay);}
  }
  function emit(m,kind,x=m.x,y=m.y){
    if(!enabled||!valid(m))return;
    const events=m.act5Events||(m.act5Events=[]);
    if(events.length>=8)events.shift();
    events.push({kind,x,y,angle:m.visAng,time:Game.state.time,color:colors[m.def.projectile?.elem||m.def.meleeElem||m.def.deathBurst?.elem||'phys']});
  }
  function release(m,visual){
    if(!valid(m)||!visual||m.act5Visual!==visual||visual.epoch!==m.castEpoch)return;
    visual.released=true;visual.release=Game.state.time;emit(m,visual.kind);
  }
  function finish(m){
    if(!valid(m)||!m.act5Visual)return;
    m.act5Visual.finished=Game.state.time;
    if(m.act5Visual.kind==='leap')emit(m,'slam');
  }
  function cancel(m){m.act5Visual=null;if(m.act5Events)m.act5Events.length=0;}
  function blink(m,x,y){
    if(!valid(m))return;
    emit(m,'blink',x,y);begin(m,'blink',0,.3);m.act5Visual.released=true;emit(m,'blink');
  }
  function tick(m){
    if(!valid(m)){if(m.act5Visual||m.act5Events?.length)cancel(m);return;}
    if(m.act5Events)for(let i=m.act5Events.length-1;i>=0;i--)if(Game.state.time-m.act5Events[i].time>=.5)m.act5Events.splice(i,1);
  }
  function sample(m,pose){
    pose.ex.act5Animation=undefined;
    if(!enabled||!valid(m))return;
    const entry=DATA.SPRITE_MANIFEST.entries['actor.act5.'+(m.def.artId||m.def.sprite)];
    if(!entry)return;
    let kind,frame;
    if(m.dead){
      if(m.exploded||m.corpseT<=0)return;
      kind='death';const age=Math.max(0,12-m.corpseT);
      const burst=m.def.deathBurst&&!m.act2Combat?Math.max(.6,m.def.deathBurst.windup||0):0;
      frame=burst?(age<burst?Math.min(2,Math.floor(clamp(age/burst)*3)):3+Math.min(2,Math.floor(clamp((age-burst)/.3)*3))):Math.min(5,Math.floor(clamp(age/.6)*6));
    }else{
      const v=m.act5Visual;
      if(!v||v.epoch!==m.castEpoch||m.castInterrupted())return;
      kind=v.kind;
      const age=Math.max(0,Game.state.time-v.start),motion=m.charging||m.leaping||m.whirling;
      if(motion){frame=kind==='whirl'?3+Math.floor(motion.t/.12)%2:3;}
      else if(v.finished!==undefined){
        const t=(Game.state.time-v.finished)/v.recovery;if(t>=1)return;
        frame=4+Math.min(1,Math.floor(clamp(t)*2));
      }else if(!v.released&&age<v.windup){frame=Math.min(2,Math.floor(clamp(age/(v.windup||1))*3));}
      else{
        const t=(Game.state.time-(v.release??v.start+v.windup))/v.recovery;if(t>=1)return;
        frame=3+Math.min(2,Math.floor(clamp(t)*3));
      }
    }
    const row=entry.sequences.indexOf(kind);if(row<0)return;
    const out=m._act5Animation||(m._act5Animation={});
    out.id=kind;out.frame=frame;out.index=row*6+frame;out.asset='actor.act5.'+(m.def.artId||m.def.sprite);
    out.alpha=kind==='blink'&&!media?.matches?[1,.8,.55,.4,.75,1][frame]:1;
    pose.ex.act5Animation=out;
  }
  function drawGround(ctx,state,cam){
    if(!enabled)return;let budget=128;
    for(const m of state.monsters){if(!valid(m))continue;
      for(const e of m.act5Events||[]){
        const t=clamp((state.time-e.time)/.5);if(t>=1)continue;
        const x=U.isoX(e.x,e.y)-cam.x,y=U.isoY(e.x,e.y)-cam.y-(state.map.surfaceVersion?TerrainNavigation.height(state.map,e.x,e.y)*14:0);
        if(x< -160||y< -160||x>ctx.canvas.width+160||y>ctx.canvas.height+160)continue;
        if(--budget<0)return;
        ctx.save();LevelTerrain.clipBehind(ctx,state.map,cam,e.x,e.y);
        ctx.strokeStyle=e.color;ctx.lineWidth=2;ctx.globalAlpha=(1-t)*.75;
        const reach=media?.matches?15:10+22*t,side=Math.cos(e.angle)<0?-1:1;
        if(['melee','charge','whirl'].includes(e.kind)){
          ctx.beginPath();ctx.ellipse(x+side*10,y-18,reach,reach*.38,side*.45,-1.6,1.3);ctx.stroke();
        }else{
          // Local sparks and wisps never trace a damage boundary.
          const count=media?.matches?3:6;
          for(let i=0;i<count;i++){
            const a=i*2.399,dx=Math.cos(a)*reach,dy=Math.sin(a)*reach*.4;
            ctx.beginPath();ctx.moveTo(x+dx,y-12+dy);ctx.lineTo(x+dx+Math.cos(a)*4,y-18+dy-6*t);ctx.stroke();
          }
        }
        ctx.restore();
      }
    }
  }
  return {eligible,valid,hasZone:id=>zones.has(id),hasAssets:()=>Object.values(DATA.SPRITE_MANIFEST.entries).some(e=>e.act5Art),showsAttackRadius,novaPresentation:m=>eligible(m)?hiddenRadius:undefined,
    begin,action,deferred,release,finish,cancel,blink,tick,sample,emit,drawGround,
    get enabled(){return enabled;},set enabled(v){enabled=!!v;}};
})();
