// Presentation only: shifting never delays stats, damage, input or cooldowns.
import * as THREE from './vendor/three/three.module.min.js';
import {ease} from './character_motion3d.mjs';

const durations={form_fang:.84,form_brute:1.0,form_stone:1.12,form_apex:1.08};
const colors={form_fang:['#b6d7c6','#dfeccc'],form_brute:['#c9a36a','#efcf92'],form_stone:['#80baa2','#c2e8ca'],form_apex:['#a0ce70','#e1efaa']};
export const shiftDuration=(from,to)=>durations[to||from]||.9;
const copyPose=p=>({...p,ex:{...p?.ex,wildshape:null}});

export function createWildshapeController(){
  let initialized=false,lastForm=null,lastPose=null,lastMap=null,active=null;
  return {
    update(form,pose,dt,{map=null,dead=false}={}){
      if(!initialized||map!==lastMap||dead){initialized=true;active=null;}
      else if(form!==lastForm){
        // A second shift starts with whichever silhouette was actually dominant.
        const from=active?(active.elapsed/active.duration<.46?active.from:active.to):lastForm;
        const source=active&&from===active.from?active.pose:lastPose||pose;
        active=from===form?null:{from,to:form,elapsed:0,duration:shiftDuration(from,form),pose:copyPose(source)};
      }else if(active){
        active.elapsed+=Math.max(0,Math.min(.1,dt||0));
        if(active.elapsed>=active.duration)active=null;
      }
      lastMap=map;lastForm=form;lastPose=copyPose(pose);
      return active?{from:active.from,to:active.to,t:active.elapsed/active.duration,pose:active.pose}:null;
    }
  };
}

// The source gathers into a low, compact silhouette; the destination unfolds
// into a howl/roar, then yields smoothly to the current movement/combat pose.
export function shiftLayers(shift,pose){
  const t=Math.max(0,Math.min(1,shift.t)),reveal=ease((t-.27)/.36);
  return [
    {form:shift.from,alpha:1-reveal,amount:ease(t/.50),entering:false,pose:shift.pose||pose},
    {form:shift.to,alpha:reveal,amount:1-ease((t-.43)/.57),entering:true,pose}
  ];
}

const bounds=new THREE.Box3();
export function applyShiftPose(model,amount,entering){
  if(amount<=0)return;
  const j=model.joints,biped=!model.formId||model.formId==='form_stone'||model.formId==='form_apex';
  const torso=j.Torso||j.Spine,head=j.Head;
  if(torso){torso.rotation.x+=(entering?-.16:.27)*amount;torso.rotation.y+=(entering?-.11:.14)*amount;}
  if(head)head.rotation.x+=(entering?-.24:.24)*amount;
  if(j.Jaw)j.Jaw.rotation.x+=entering?.48*amount:0;
  // Human hands have already been solved onto the equipped weapon. Fold the
  // spine as a unit; independently rotating those arms would break the grip.
  if(biped&&model.formId)for(const sign of [-1,1]){
    const arm=j['Arm'+sign];
    if(arm){arm.rotation.x-=(entering?.8:.35)*amount;arm.rotation.z+=sign*(entering?.38:-.12)*amount;}
  }
  model.root.scale.x*=1+(entering?-.18:.13)*amount;model.root.scale.y*=1-(entering?.30:.26)*amount;model.root.scale.z*=1+(entering?-.14:.10)*amount;
  model.root.updateMatrixWorld(true);
  // Human soles already sit just above the floor. Keep their foot anchor;
  // equipment and the cached bounds of a skinned mesh are not floor contacts.
  if(model.formId){bounds.setFromObject(model.root);model.root.position.y-=bounds.min.y;model.root.updateMatrixWorld(true);}
}

export function drawShiftEffect(ctx,shift,scale=1,front=false){
  const t=Math.max(0,Math.min(1,shift.t)),envelope=Math.sin(Math.PI*t);
  if(envelope<=0)return;
  const [leaf,light]=colors[shift.to||shift.from]||colors.form_apex;
  const alpha=ctx.globalAlpha;ctx.save();ctx.scale(scale,scale);ctx.globalAlpha*=envelope;
  if(!front){
    const radius=18+38*ease(t/.72);
    const halo=ctx.createRadialGradient(0,-5,2,0,-5,radius);
    halo.addColorStop(0,light+'32');halo.addColorStop(.50,leaf+'1c');halo.addColorStop(1,leaf+'00');
    ctx.fillStyle=halo;ctx.save();ctx.scale(1,.48);ctx.beginPath();ctx.arc(0,-5,radius,0,Math.PI*2);ctx.fill();ctx.restore();
    ctx.strokeStyle=leaf;ctx.lineWidth=1.1;
    for(let ring=0;ring<2;ring++){
      const r=radius-ring*8;ctx.globalAlpha=alpha*envelope*(ring?.22:.5);ctx.beginPath();ctx.ellipse(0,0,r,r*.43,0,t*2+ring,Math.PI*1.7+t*2+ring);ctx.stroke();
    }
    for(let n=0;n<10;n++){
      const a=n*Math.PI/5+t*.5,r=radius-4,x=Math.cos(a)*r,y=Math.sin(a)*r*.43;
      ctx.beginPath();ctx.moveTo(x-2,y-2);ctx.lineTo(x,y+2);ctx.lineTo(x+2,y-2);ctx.stroke();
    }
  }else{
    // Two broken spirals carry leaves upward; keep the face and center readable.
    for(let n=0;n<18;n++){
      const u=(n/18+t*.85)%1,a=n*2.399+t*5.4,r=18+Math.sin(Math.PI*u)*16;
      const x=Math.cos(a)*r,y=-u*89+Math.sin(a)*r*.32;
      ctx.globalAlpha=alpha*envelope*Math.sin(Math.PI*u)*.82;ctx.fillStyle=n%3?leaf:light;
      ctx.save();ctx.translate(x,y);ctx.rotate(a+t*2);ctx.beginPath();
      if((shift.to||shift.from)==='form_stone'){ctx.moveTo(-2,-2);ctx.lineTo(2,-3);ctx.lineTo(3,1);ctx.lineTo(-1,3);}
      else{ctx.moveTo(-3,0);ctx.quadraticCurveTo(0,-3.5,4,0);ctx.quadraticCurveTo(0,2.2,-3,0);}
      ctx.closePath();ctx.fill();ctx.restore();
    }
    const flare=Math.exp(-Math.pow((t-.46)/.14,2));
    ctx.globalAlpha=alpha*envelope*flare*.45;
    const glow=ctx.createRadialGradient(0,-29,0,0,-29,35);
    glow.addColorStop(0,light+'b0');glow.addColorStop(.32,leaf+'55');glow.addColorStop(1,leaf+'00');
    ctx.fillStyle=glow;ctx.fillRect(-35,-64,70,70);
  }
  ctx.restore();
}
