/* Northern presentation. Combat owns the clock, movement, damage and corpses. */
'use strict';
const Act1EnemyAnimation=(()=>{
  const zones=new Set(DATA.ACT1_ZONES),clamp=v=>Math.max(0,Math.min(1,v));
  const media=window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const hiddenRadius=Object.freeze({hideRadius:true});
  const eligible=m=>!!m?.defId&&zones.has(m.combatMap?.id);
  const valid=m=>eligible(m)&&m.combatWorld===Game.state&&m.combatMap===Game.state.map;
  const colors={fire:'#ff9c42',cold:'#a7dfff',light:'#ead38b',shadow:'#b698d4',poison:'#afc977',phys:'#c7b9a4'};
  let enabled=true;
  const showsAttackRadius=m=>!eligible(m)||!!Game.debugFlags?.act1Combat;
  function element(m,kind){return (kind==='bolt'||kind==='volley'?m.def.projectile?.elem:kind==='death'?m.def.deathBurst?.elem:m.def[kind]?.elem)||
    DATA.ACT1_ANIMATIONS?.[m.defId]?.elements[kind]||m.def.meleeElem||'phys';}
  function begin(m,kind,windup=0,recovery=.25){
    if(!enabled||!valid(m))return;
    m.act1Visual={kind,start:Game.state.time,windup,recovery,action:m.action,epoch:m.castEpoch,released:false,angle:m.attackWarning?.shape?.angle??m.visAng};
  }
  function action(m){
    if(!valid(m)||!['attack','cast'].includes(m.action?.state))return;
    const a=m.action;begin(m,a.enemySkill||a.act5Kind||(m.def.projectile?'bolt':'melee'),a.dur*.55,a.dur*.45);
  }
  function deferred(m,delay){const v=m.act1Visual;if(valid(m)&&v&&v.action===m.action){v.windup=delay;v.recovery=Math.max(.12,m.action.dur-delay);}}
  function emit(m,kind,x=m.x,y=m.y){
    if(!enabled||!valid(m))return;
    // Basic weapon trails are painted in their frames; missiles already have
    // their own renderer. Avoid a second ground-level copy of those effects.
    if(kind==='melee'||kind==='bolt'||kind==='volley')return;
    const events=m.act1Events||(m.act1Events=[]);if(events.length>=8)events.shift();
    events.push({kind,x,y,surfaceId:m.surfaceId,angle:m.act1Visual?.angle??m.visAng,time:Game.state.time,color:colors[element(m,kind)]});
  }
  function release(m,v){if(!valid(m)||!v||m.act1Visual!==v||v.epoch!==m.castEpoch)return;v.released=true;v.release=Game.state.time;emit(m,v.kind);}
  function finish(m){if(!valid(m)||!m.act1Visual)return;m.act1Visual.finished=Game.state.time;if(m.act1Visual.kind==='leap')emit(m,'slam');}
  function cancel(m){m.act1Visual=null;if(m.act1Events)m.act1Events.length=0;}
  function blink(m,x,y){if(!valid(m))return;emit(m,'blink',x,y);begin(m,'blink',0,.3);release(m,m.act1Visual);}
  function summon(m){if(!valid(m))return;begin(m,'summon',0,.55);release(m,m.act1Visual);}
  function tick(m){
    if(!valid(m)){if(m.act1Visual||m.act1Events?.length)cancel(m);return;}
    if(m.act1Events)for(let i=m.act1Events.length-1;i>=0;i--)if(Game.state.time-m.act1Events[i].time>=.5)m.act1Events.splice(i,1);
  }
  function sample(m,pose){
    pose.ex.act1Animation=undefined;if(!enabled||!valid(m))return;
    const spec=DATA.ACT1_ANIMATIONS?.[m.defId];if(!spec)return;
    sampleAction(m,pose,spec);
    if(pose.ex.act1Animation||m.dead)return;
    const suffix=m.defId==='korvath'&&(m.spriteOpts.bossPhase||0)>0?'_1':'',clip=spec.rests?.['idle'+suffix];if(!clip)return;
    const walking=pose.state==='walk'&&!m.castInterrupted(),out=m._act1Animation||(m._act1Animation={});
    Object.assign(out,{id:(walking?'walk':'idle')+suffix,frame:clip.frame,index:clip.row*6+clip.frame,asset:clip.asset,
      alpha:1,scale:spec.art==='beacon'?1/(1.1*(m.spriteOpts.scale||1)):clip.scale,rest:true,
      still:m.beacon||m.castInterrupted(),clock:m.animT,walkPhase:walking?pose.ex.walkPh:null});pose.ex.act1Animation=out;
  }
  function sampleAction(m,pose,spec){
    let kind,frame;const enc=m.encounter;
    if(m.dead){
      if(m.exploded||m.corpseT<=0)return;
      kind='death';const age=Math.max(0,12-m.corpseT),burst=m.def.deathBurst?Math.max(.6,m.def.deathBurst.windup||0):0;
      frame=burst?(age<burst?Math.min(2,Math.floor(clamp(age/burst)*3)):3+Math.min(2,Math.floor(clamp((age-burst)/.3)*3))):Math.min(5,Math.floor(clamp(age/.6)*6));
    }else if(enc?.active&&enc.attack&&['windup','execute','recovery'].includes(enc.stage)){
      kind=enc.attack.id;frame=enc.stage==='windup'?Math.min(2,Math.floor(clamp(1-enc.timer/enc.attack.windup)*3)):
        enc.stage==='execute'?3:4+Math.min(1,Math.floor(clamp(1-enc.timer/enc.recoveryDuration)*2));
    }else if(!m.action&&m.beacon&&m.beaconCd>0&&m.beaconCd<=.45&&m.children.length<m.def.beaconSpawn.max&&U.dist(m.x,m.y,Game.state.player.x,Game.state.player.y)<22){
      kind='summon';frame=Math.min(2,Math.floor((1-m.beaconCd/.45)*3));
    }else if(!m.action&&m.aggro&&m.def.teleports&&m.teleCd>0&&m.teleCd<=.3&&U.dist(m.x,m.y,Game.state.player.x,Game.state.player.y)>m.def.teleports.minDist){
      kind='blink';frame=Math.min(2,Math.floor((1-m.teleCd/.3)*3));
    }else{
      const v=m.act1Visual;
      if(!v||v.epoch!==m.castEpoch||m.castInterrupted())return;
      kind=v.kind;const age=Math.max(0,Game.state.time-v.start),motion=m.charging||m.leaping||m.whirling;
      if(motion)frame=kind==='whirl'?3+Math.floor(motion.t/.12)%2:3;
      else if(v.finished!==undefined){const t=(Game.state.time-v.finished)/v.recovery;if(t>=1)return;frame=4+Math.min(1,Math.floor(clamp(t)*2));}
      else if(!v.released&&age<v.windup)frame=Math.min(2,Math.floor(clamp(age/(v.windup||1))*3));
      else {const t=(Game.state.time-(v.release??v.start+v.windup))/v.recovery;if(t>=1)return;frame=3+Math.min(2,Math.floor(clamp(t)*3));}
    }
    if(m.defId==='korvath'&&(m.spriteOpts.bossPhase||0)>0)kind+='_1';
    const clip=spec.clips[kind];if(!clip)return;
    const out=m._act1Animation||(m._act1Animation={});Object.assign(out,{id:kind,frame,index:clip.row*6+frame,asset:clip.asset,
      alpha:kind==='blink'&&!media?.matches?[1,.8,.55,.4,.75,1][frame]:1,scale:spec.art==='beacon'?1/(1.1*(m.spriteOpts.scale||1)):clip.scale,rest:false});pose.ex.act1Animation=out;
  }
  function drawGround(ctx,state,cam){
    if(!enabled)return;let budget=128;
    for(const m of state.monsters){if(!valid(m))continue;
      for(const e of m.act1Events||[]){
        const t=clamp((state.time-e.time)/.5);if(t>=1)continue;
        const x=U.isoX(e.x,e.y)-cam.x,y=U.isoY(e.x,e.y)-cam.y-(state.map.surfaceVersion?TerrainNavigation.height(state.map,e.x,e.y)*14:0);
        if(x< -200||y< -200||x>ctx.canvas.width+200||y>ctx.canvas.height+200)continue;if(--budget<0)return;
        ctx.save();LevelTerrain.clipBehind(ctx,state.map,cam,e.x,e.y,e.surfaceId);ctx.strokeStyle=e.color;ctx.fillStyle=e.color;ctx.lineWidth=2;ctx.globalAlpha=(1-t)*.75;
        const reach=media?.matches?15:10+22*t,side=Math.cos(e.angle)<0?-1:1;
        if(e.kind==='breath'){
          // Actual exhalation, never a cone boundary. Fade short ice wisps along the locked aim.
          for(let i=0;i<18;i++){const a=e.angle+(i%5-2)*.1,dist=(.3+(i/18)*4.7)*(.5+t*.5),wx=e.x+Math.cos(a)*dist,wy=e.y+Math.sin(a)*dist;
            const px=U.isoX(wx,wy)-cam.x,py=U.isoY(wx,wy)-cam.y-(state.map.surfaceVersion?TerrainNavigation.height(state.map,wx,wy)*14:0)-(m.defId==='frost_wyrm'?m.scale*52:22);
            ctx.globalAlpha=(1-t)*(.15+(i%3)*.1);ctx.beginPath();ctx.ellipse(px,py,5+i*.35,3+i*.15,0,0,Math.PI*2);ctx.fill();}
        }else if(['melee','charge','whirl'].includes(e.kind)){ctx.beginPath();ctx.ellipse(x+side*10,y-18,reach,reach*.38,side*.45,-1.6,1.3);ctx.stroke();}
        else for(let i=0;i<(media?.matches?3:6);i++){const a=i*2.399,dx=Math.cos(a)*reach,dy=Math.sin(a)*reach*.4;ctx.beginPath();ctx.moveTo(x+dx,y-12+dy);ctx.lineTo(x+dx+Math.cos(a)*4,y-18+dy-6*t);ctx.stroke();}
        ctx.restore();
      }
    }
  }
  return {eligible,valid,hasZone:id=>zones.has(id),showsAttackRadius,novaPresentation:m=>!showsAttackRadius(m)?hiddenRadius:undefined,
    begin,action,deferred,release,finish,cancel,blink,summon,tick,sample,emit,element,drawGround,get enabled(){return enabled;},set enabled(v){enabled=!!v;}};
})();
