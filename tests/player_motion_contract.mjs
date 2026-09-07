import assert from 'node:assert/strict';
import {Vector3} from '../js/vendor/three/three.module.min.js';
import {createCharacter} from '../js/character3d.mjs';
import {createWildshape,FORM_STYLES} from '../js/character_forms3d.mjs';
import {createAnimationController,groundPosition,motionYaw} from '../js/character_motion3d.mjs';
import {animationPhase,sampleHumanoid} from '../js/character_animation3d.mjs';
import {CLASS_STYLES} from '../js/character_catalog3d.mjs';

let checks=0,maxPlantError=0,maxTargetError=0,maxTransition=0;
const ok=(value,message)=>{checks++;assert.ok(value,message);};
const snapshot=m=>{m.root.updateMatrixWorld(true);return Object.values(m.joints).flatMap(j=>j.matrixWorld.elements);};
const makePlayer=(classId,form=null)=>({classId,x:0,y:0,visAng:Math.PI/2,animT:0,curSpeed:0,moving:false,dead:false,buffs:form?[{id:form}]:[],action:null});
const variants=[...Object.keys(CLASS_STYLES).map(id=>[id,null]),...Object.keys(FORM_STYLES).map(id=>['wildkeeper',id])];
for(const [id,form] of variants){
  const m=form?createWildshape(form):createCharacter(id),p=makePlayer(id,form),c=createAnimationController();
  let prior=new Map(),footfalls=0,previous=null;
  for(let n=0;n<480;n++){
    const dt=1/60,time=n*dt,move=time>.5&&time<3||time>4.2&&time<5.2;
    p.curSpeed=move?3.2:0;p.moving=move;p.animT=time;
    if(move){p.x+=dt*3.2/Math.SQRT2;p.y+=dt*3.2/Math.SQRT2;}
    if(time>=3.2&&time<3.9)p.action={state:'attack',t:time-3.2,dur:.7,visual:{id:1,releases:[.5]}};
    else if(time>=5.4&&time<6.1)p.action={state:'cast',t:time-5.4,dur:.7,visual:{id:2,releases:[.6]}};
    else p.action=null;
    const frame=c.update(p,dt,{onFootstep:()=>footfalls++});m.root.rotation.y=motionYaw(p.visAng);m.animate(frame);
    const origin=groundPosition(p.x,p.y),points=new Map();
    for(const f of m.contacts||frame.ex.animation.feet){
      const joint=form?m.joints['Paw'+(f.id[0]==='L'?'1':'-1')+':'+(f.id[1]||'0')]:m.joints['Foot'+f.id];
      const point=joint.getWorldPosition(new Vector3());point.x+=origin.x;point.z+=origin.z;
      const yaw=motionYaw(p.visAng),width=form?1:CLASS_STYLES[id].width;
      const worldX=origin.x+width*(Math.cos(yaw)*f.x+Math.sin(yaw)*f.z),worldZ=origin.z+width*(-Math.sin(yaw)*f.x+Math.cos(yaw)*f.z);
      const targetError=Math.hypot(point.x-worldX,point.z-worldZ);maxTargetError=Math.max(maxTargetError,targetError);
      ok(targetError<.035,`${id}/${form}/${n}/${f.id}: foot misses IK target by ${targetError}`);
      if(f.contact&&prior.get(f.id)?.contact){
        const old=prior.get(f.id),anchorShift=Math.hypot(f.worldX-old.x,f.worldZ-old.z);
        // A new cycle's heel strike changes the anchor legitimately.
        if(anchorShift<.00001){const error=Math.hypot(point.x-old.px,point.z-old.pz);maxPlantError=Math.max(maxPlantError,error);ok(error<.03,`${id}/${form}: planted foot skates ${error}`);}
      }
      points.set(f.id,{contact:f.contact,x:f.worldX,z:f.worldZ,px:point.x,pz:point.z});
    }
    prior=points;
    const state=snapshot(m);ok(state.every(Number.isFinite),`${id}/${form}: nonfinite skeleton`);
    if(previous){const d=Math.max(...state.map((v,i)=>Math.abs(v-previous[i])));maxTransition=Math.max(maxTransition,d);ok(d<1.2,`${id}/${form}/${n}: transition pop ${d}`);}
    previous=state;
    if(n%60===0){m.animate({state:'dead',t:1,ex:{}});m.animate(frame);ok(snapshot(m).every((v,i)=>Math.abs(v-state[i])<1e-7),`${id}/${form}: rendering history changed pose`);}
  }
  ok(footfalls>6&&footfalls<45,`${id}/${form}: missing or excessive footstep events ${footfalls}`);
  const before=c.frame.ex.animation.phase;c.update(p,1/60);ok(c.frame.ex.animation.phase===before,`${id}/${form}: idle gait advances`);
  p.x+=20;c.update(p,1/60);ok(!c.frame.ex.animation.blend&&c.frame.ex.animation.phase===0,`${id}/${form}: teleport retains motion`);
  m.dispose();
}

for(const release of [0,.12,.4,.45,.5,.55,.6,1]){
  ok(Math.abs(animationPhase('attack',release,'bow_2h',[release])-.4)<1e-8,'release does not map to contact '+release);
}
for(const release of [.1,.35,.7])ok(Math.abs(animationPhase('cast',release,null,[.1,.35,.7])-.4)<1e-8,'repeated release mismatch');
for(const state of ['draw','channel','charge','spin','airborne']){
  const m=createCharacter('veilranger');m.animate({state,t:.4,ex:{walkPh:1}});const saved=snapshot(m);m.animate({state:'dead',t:1});m.animate({state,t:.4,ex:{walkPh:1}});
  ok(snapshot(m).every((v,i)=>Math.abs(v-saved[i])<1e-8),state+' not deterministic');m.dispose();
}
const draw=sampleHumanoid('veilranger',{state:'draw',t:1,ex:{}},{main:{family:'bow_2h',twoHand:true}});
ok(draw.motion.arrow&&draw.motion.draw>.99,'held shot does not retain drawn arrow');
const released=sampleHumanoid('veilranger',{state:'attack',t:0,ex:{animation:{releases:[0]}}},{main:{family:'bow_2h',twoHand:true}});
ok(!released.motion.arrow,'immediate release redraws an arrow');
function frameAt(hz){const p=makePlayer('vanguard'),c=createAnimationController();c.update(p,0);for(let n=1;n<=hz*3;n++){p.x=n/hz*2;p.y=0;p.curSpeed=2;p.moving=true;p.animT=n/hz;c.update(p,1/hz);}return c.frame;}
const reference=frameAt(120);
for(const hz of [30,60]){const other=frameAt(hz);ok(Math.abs(other.ex.animation.phase-reference.ex.animation.phase)<.13,'frame rate changes gait phase');ok(Math.abs(other.ex.animation.speed-reference.ex.animation.speed)<1e-8,'frame rate changes smoothed velocity');}
// Transitions and priorities use real action identities, rather than a renderer
// clock. Exercise reversal, repeated attacks, interrupted casts and a held bow.
for(const [id,form] of variants){
  const p=makePlayer(id,form),c=createAnimationController(),m=form?createWildshape(form):createCharacter(id);
  let previous=null;
  for(let n=0;n<360;n++){
    const time=n/60;p.animT=time;p.action=null;p.drawing=null;p.siphon=null;p.jumping=null;p.charging=null;p.spinning=null;
    p.moving=n<70||n>=270&&n<300;p.curSpeed=p.moving?2:0;
    if(p.moving)p.x+=1/30;
    if(n>=35&&n<70)p.visAng+=Math.PI/35;
    if(n>=70&&n<100)p.action={state:'attack',t:(n-70)/60,dur:.5,visual:{id:1,releases:[.5]}};
    if(n>=100&&n<130)p.action={state:'attack',t:(n-100)/60,dur:.5,visual:{id:2,releases:[.45]}};
    if(n>=130&&n<160)p.drawing={t:(n-130)/60,maxDraw:.5};
    if(n>=160&&n<185)p.action={state:'attack',t:(n-160)/60,dur:.5,visual:{id:3,releases:[0]}};
    if(n>=185&&n<215)p.siphon={};
    if(n>=215&&n<245)p.jumping={t:(n-215)/60,dur:.5};
    if(n===180)p._visualReaction={kind:'hurt',direction:.8};
    if(n>=300){p.dead=true;p.action={state:'death',t:Math.min(.8,(n-300)/60),dur:.8,visual:{id:4,releases:[]}};}
    const frame=c.update(p,1/60);m.root.rotation.y=motionYaw(p.visAng);m.animate(frame);
    const positions=Object.values(m.joints).map(j=>j.getWorldPosition(new Vector3()));
    if(previous){const step=Math.max(...positions.map((v,i)=>v.distanceTo(previous[i])));const entering=[70,100,130,185,215,245,300].includes(n);ok(step<(entering?.12:.5),`${id}/${form}/${n}: action transition jumps ${step}`);}
    previous=positions;
    if(n===130)ok(frame.state==='draw','held draw state missing');
    if(n===160)ok(frame.state==='attack'&&!frame.ex.animation.blend,'immediate release blended away');
    if(n===185)ok(frame.state==='channel','channel state missing');
    if(n===215)ok(frame.state==='airborne','airborne state missing');
    if(n===300)ok(frame.state==='death','death does not take precedence');
  }
  const corpse=snapshot(m);m.animate(c.frame);ok(snapshot(m).every((v,i)=>Math.abs(v-corpse[i])<1e-8),'corpse changes between renders');
  m.dispose();
}
console.log(JSON.stringify({status:'PASS',checks,maxPlantError,maxTargetError,maxTransition},null,2));
