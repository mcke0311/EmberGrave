// Simulation-owned motion. Rendering consumes snapshots and never advances them.
// Ground units use the same 40 px/model unit and 1.1 actor scale as the game.
import {CLASS_STYLES} from './character_catalog3d.mjs';

const TAU=Math.PI*2,unit=32/44;
export const saturate=x=>Math.max(0,Math.min(1,x));
export const ease=x=>{x=saturate(x);return x*x*(3-2*x);};
const mix=(a,b,t)=>a+(b-a)*t;
const angle=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
export const groundPosition=(x,y)=>({x:(x-y)*unit,z:(x+y)*unit});
export const motionYaw=a=>Math.atan2(Math.cos(a),Math.sin(a)*2);

export function gaitProfile(classId,form=null,speed=3){
  const run=ease((speed-1.7)/2.8),profile=CLASS_STYLES[classId]||CLASS_STYLES.vanguard;
  if(form){
    const bear=form==='form_brute',wolf=form==='form_fang',quad=bear||wolf;
    return {width:1,height:1,quad,stride:quad?(bear?mix(.9,1.45,run):mix(.95,1.7,run)):form==='form_stone'?mix(1.15,1.65,run):mix(1.3,1.95,run),
      stance:quad?(bear?mix(.67,.44,run):mix(.62,.32,run)):mix(.62,.44,run),lift:bear?.10:wolf?.14:.17,run,
      feet:quad?[{id:'L0',x:bear?.28:.20,z:.39,offset:0},{id:'R0',x:bear?-.28:-.20,z:.39,offset:.5},
        {id:'L1',x:bear?.28:.20,z:-.40,offset:bear?.25:.5},{id:'R1',x:bear?-.28:-.20,z:-.40,offset:bear?.75:0}]:
        [{id:'L',x:.23,z:0,offset:0},{id:'R',x:-.23,z:0,offset:.5}]};
  }
  const character={vanguard:[1,.14],emberwitch:[.96,.16],gravebinder:[.85,.09],wildkeeper:[1.02,.17],veilranger:[.98,.15]}[classId]||[1,.14];
  return {width:profile.width,height:profile.height,quad:false,stride:mix(1.22,1.9,run)*character[0]*profile.width,
    stance:mix(.62,.43,run),lift:character[1],run,feet:[{id:'L',x:.112,z:.025,offset:0},{id:'R',x:-.112,z:.025,offset:.5}]};
}

// Canonical local foot paths used by scrubbable previews and contact overlays.
export function footPath(phase,gait,foot){
  const p=((phase+foot.offset)%1+1)%1,stance=p<gait.stance;
  const travel=gait.stride/gait.width*gait.stance,half=travel*.5;
  const u=stance?p/gait.stance:(p-gait.stance)/(1-gait.stance);
  return {id:foot.id,x:foot.x,z:foot.z+(stance?mix(half,-half,u):mix(-half,half,ease(u))),
    y:stance?0:Math.sin(Math.PI*u)**2*gait.lift,contact:stance,
    pitch:stance?mix(-.12,.18,ease(u)):mix(.18,-.12,ease(u))};
}

export function createAnimationController(){
  let previous=null,formKey=null,mapKey=null,feet=new Map(),phase=0,time=0,smoothedSpeed=0,lean=0,turn=0,secondary=0;
  let frame=null,transition=null,lastKey='',airborne=false,landingAge=10,lastReaction=null,reactionAge=10,settlingId=null;
  function reset(){previous=null;frame=null;feet.clear();transition=null;lastKey='';phase=0;smoothedSpeed=lean=turn=secondary=0;airborne=false;landingAge=reactionAge=10;settlingId=null;}
  function update(player,dt,{map=null,onFootstep=null,clock=null}={}){
    dt=Math.max(0,Math.min(.1,dt||0));time+=dt;
    const form=player.buffs?.find(b=>b?.id?.startsWith('form_'))?.id||null,position=groundPosition(player.x,player.y),yaw=motionYaw(player.visAng||0);
    const displacement=previous?Math.hypot(position.x-previous.x,position.z-previous.z):0;
    if(form!==formKey||map!==mapKey||displacement>Math.max(1.1,(player.curSpeed||0)*dt*2.2)){reset();formKey=form;mapKey=map;}
    const travel=previous?Math.hypot(position.x-previous.x,position.z-previous.z):0;
    const air=!!(player.jumping||player.leaping||player.jumpZ>0),dead=!!player.dead;
    const speed=previous&&dt>0&&!air&&!dead?travel/dt:0,oldSpeed=smoothedSpeed;
    smoothedSpeed=mix(smoothedSpeed,speed,1-Math.exp(-dt*14));
    const yawDelta=previous?angle(previous.yaw,yaw):0;
    turn=mix(turn,dt?Math.max(-6,Math.min(6,yawDelta/dt)):0,1-Math.exp(-dt*16));
    lean=mix(lean,Math.max(-.14,Math.min(.16,(smoothedSpeed-oldSpeed)*.045/Math.max(dt,.008))),1-Math.exp(-dt*10));
    secondary=mix(secondary,lean+turn*.018,1-Math.exp(-dt*7));
    const gait=gaitProfile(player.classId,form,smoothedSpeed),moving=speed>.025;
    const pivot=!moving&&!air&&!dead&&Math.abs(yawDelta)>.003;
    const previousPhase=phase;
    if(!air&&!dead)phase+=(travel+(pivot?Math.abs(yawDelta)*.24:0))/gait.stride;
    const action=player.action,traversal=player.leaping||player.jumping;
    let state=dead?'death':action?.state|| (moving?'walk':'idle');
    const actionTime=clock!==null&&Number.isFinite(action?.visual?.startedAt)?Math.max(0,clock-action.visual.startedAt):action?.t;
    let t=action?Math.min(1,actionTime/action.dur):state==='walk'?0:player.animT||time;
    let held=null;
    if(!dead){
      if(air){state='airborne';t=traversal?Math.min(1,traversal.t/traversal.dur):.5;}
      else if(player.spinning){state='spin';t=player.spinning.t/player.spinning.dur;}
      else if(player.charging||player.dashing){state='charge';t=player.charging?player.charging.t/player.charging.dur:0;}
      else if(player.drawing){state='draw';t=saturate(player.drawing.t/player.drawing.maxDraw);held=player.drawing;}
      else if(player.siphon){state='channel';t=time;held=player.siphon;}
    }
    if(airborne&&!air)landingAge=0;else landingAge+=dt;airborne=air;
    if(player._visualReaction!==lastReaction){lastReaction=player._visualReaction;reactionAge=0;}else reactionAge+=dt;
    const active=state==='walk'||state==='charge'||pivot,contacts=[];
    let maySettle=state==='idle'&&!active&&!air&&!settlingId&&[...feet.values()].every(f=>f.contact);
    for(const foot of gait.feet){
      const path=footPath(phase,gait,foot),old=feet.get(foot.id);
      const localToGround=(x,z)=>({x:position.x+gait.width*(Math.cos(yaw)*x+Math.sin(yaw)*z),z:position.z+gait.width*(-Math.sin(yaw)*x+Math.cos(yaw)*z)});
      let contact=active?path.contact:!air;
      const previousP=((previousPhase+foot.offset)%1+1)%1,nowP=((phase+foot.offset)%1+1)%1;
      const touchdown=active&&contact&&(!old?.contact||nowP<previousP);
      let point;
      if(!old)point=localToGround(foot.x,foot.z);
      else if(contact&&!touchdown)point={x:old.x,z:old.z};
      else if(contact)point=localToGround(path.x,path.z);
      else {
        const start=old?.start||old||localToGround(foot.x,foot.z),u=(nowP-gait.stance)/(1-gait.stance);
        const end=localToGround(foot.x,foot.z+gait.stride/gait.width*gait.stance*.5);
        point={x:mix(start.x,end.x,ease(u)),z:mix(start.z,end.z,ease(u))};
      }
      // During a stop finish a lifted step over 100 ms, without sliding a support foot.
      let lift=active?path.y:0,settle=old?.settle||null;
      if(old&&active&&!contact)lift=Math.min(lift,old.y+dt*1.8);
      if(old&&!active&&!air&&old.y>.0001){const f=1-Math.exp(-dt*38);point={x:old.x,z:old.z};lift=mix(old.y,0,f);contact=lift<.003;}
      const neutral=localToGround(foot.x,foot.z);
      if(maySettle&&old&&Math.hypot(old.x-neutral.x,old.z-neutral.z)>.12){settle={from:{x:old.x,z:old.z},to:neutral,age:0};settlingId=foot.id;maySettle=false;}
      if(settle&&!active&&!air){
        settle={...settle,age:settle.age+dt};const u=Math.min(1,settle.age/.16);
        point={x:mix(settle.from.x,settle.to.x,ease(u)),z:mix(settle.from.z,settle.to.z,ease(u))};lift=Math.sin(Math.PI*u)*.065;contact=u>=1;
        if(contact){settle=null;settlingId=null;}
      }else if(active||air){settle=null;if(settlingId===foot.id)settlingId=null;}
      if(air){point=localToGround(foot.x,foot.z);lift=0;contact=false;}
      const maxReach=gait.quad?.48:.66*gait.width;
      const hip=localToGround(foot.x,foot.z),reach=Math.hypot(point.x-hip.x,point.z-hip.z);
      if(reach>maxReach){const k=maxReach/reach;point={x:hip.x+(point.x-hip.x)*k,z:hip.z+(point.z-hip.z)*k};}
      const dx=point.x-position.x,dz=point.z-position.z;
      contacts.push({id:foot.id,x:(dx*Math.cos(yaw)-dz*Math.sin(yaw))/gait.width,z:(dx*Math.sin(yaw)+dz*Math.cos(yaw))/gait.width,
        y:lift,pitch:active?path.pitch:0,contact,worldX:point.x,worldZ:point.z});
      feet.set(foot.id,{...point,y:lift,contact,settle,start:contact?null:old?.contact?{x:old.x,z:old.z}:old?.start});
      if(touchdown&&moving&&!air&&!dead&&previous)onFootstep?.(foot.id);
    }
    const key=state+':'+(['attack','cast','kick','hit','death'].includes(state)?action?.visual?.id||0:held?state:form||'');
    if(frame&&key!==lastKey){
      const end=action?.visual?.releases?.[0];
      const duration=state==='death'?.10:['attack','cast','kick'].includes(state)?Math.min(.09,Math.max(0,(end??.4)*(action?.dur||.4)*.65)):.14;
      transition=duration>0?{from:frame,age:0,duration}:null;
    }else if(transition){transition.age+=dt;if(transition.age>=transition.duration)transition=null;}
    const releases=action?.visual?.releases?.slice()||null;
    const context={phase:phase*TAU,speed:smoothedSpeed,run:gait.run,locomotion:ease(smoothedSpeed/.7),turn,lean,secondary,
      feet:contacts,landing:1-ease(landingAge/.18),releases,actionId:action?.visual?.id||0,style:action?.visual?.style||null,
      reaction:!dead&&reactionAge<.22&&lastReaction?{...lastReaction,weight:Math.sin(Math.PI*saturate(reactionAge/.22))*(1-reactionAge/.22)}:null,
      blend:transition?{from:transition.from,weight:ease(transition.age/transition.duration)}:null};
    frame={state,t,ang:player.visAng||0,ex:{airborne:air,walkPh:phase*TAU,speed:smoothedSpeed,castColor:action?.castColor,animation:context}};
    previous={...position,yaw};lastKey=key;return frame;
  }
  return {update,reset,get frame(){return frame;}};
}
