import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
import {Vector3} from '../js/vendor/three/three.module.min.js';
import {createCharacter,STATES} from '../js/character3d.mjs';
import {CLASS_STYLES,resolveCharacterVisual} from '../js/character_catalog3d.mjs';
const scope={console};vm.createContext(scope);vm.runInContext(fs.readFileSync('js/utils.js','utf8')+'\n'+fs.readFileSync('js/data.js','utf8')+'\nthis.data=DATA;',scope);const data=scope.data;
let checks=0,maxGripError=0,minShaftClearance=Infinity,minBowSpan=Infinity;
const ok=(condition,label)=>{assert.ok(condition,label);checks++;};
const point=new Vector3(),families=['bow_2h','crossbow_2h','staff_2h','spear_2h'];
const pose=(m,state,t,animation)=>m.animate({state,t,ex:{walkPh:t*Math.PI*2,animation}});
function clearShaft(m,label){
  for(const [bone,low,high,rx,rz] of [['Hips',-.04,.16,.205,.17],['Spine',-.06,.16,.215,.18],['Chest',-.13,.10,.265,.21]]){
    for(let i=0;i<=64;i++){
      point.set(0,-.55+i/64*1.8,0);m.joints[bone].worldToLocal(m.weapon.localToWorld(point));
      if(point.y<low||point.y>high)continue;
      const clearance=Math.hypot(point.x/rx,point.z/rz);minShaftClearance=Math.min(minShaftClearance,clearance);
      ok(clearance>1.02,label+': shaft enters '+bone+' armor envelope ('+clearance+')');
    }
  }
}
for(const id of Object.keys(CLASS_STYLES)){
  const m=createCharacter(id);
  for(const family of families)for(const tier of [0,13]){
    const base=Object.values(data.BASES).find(b=>b.playerVisualFamily===family&&b.id.endsWith('_t'+tier)),raw=Object.fromEntries(['head','chest','gloves','boots','belt'].map(s=>[s,{baseId:(s==='head'?'helm':s)+'_t'+tier}]));raw.main={baseId:base.id};
    m.equip(resolveCharacterVisual(data,id,raw).equipment);
    for(const state of [...STATES,'draw','channel','charge','spin','airborne'])for(let i=0;i<=40;i++){
      const t=i/40,label=[id,family,tier,state,t].join('/');
      m.root.rotation.y=Math.floor(i/6)*Math.PI/4;pose(m,state,t);
      for(const [anchor,palm] of [[m.weapon.userData.primary,m.rightPalm],[m.weapon.userData.support,m.supportSocket]]){
        const error=m.weapon.localToWorld(point.set(...anchor)).distanceTo(palm.getWorldPosition(new Vector3()));maxGripError=Math.max(maxGripError,error);ok(error<.000001,label+': wrist detaches');
      }
      if((family==='staff_2h'||family==='spear_2h')&&!['death','dead'].includes(state))clearShaft(m,label);
    }
    m.root.rotation.y=0;
    const snapshot=()=>JSON.stringify({weapon:m.weapon.matrixWorld.toArray(),primary:m.weapon.userData.primary,string:m.weapon.userData.string?Array.from(m.weapon.userData.string.geometry.attributes.position.array):null,arrow:m.weapon.userData.arrow?.visible,arrowPosition:m.weapon.userData.arrow?.position.toArray(),limbs:m.weapon.userData.bowLimbs.map(l=>l.rotation.toArray())});
    pose(m,'idle',.37);const clean=snapshot();pose(m,'draw',1);pose(m,'attack',.70);pose(m,'dead',1);pose(m,'idle',.37);ok(snapshot()===clean,id+'/'+family+': weapon retains another render pose');
    if(family==='bow_2h'){
      pose(m,'draw',1);const span=m.root.worldToLocal(m.rightPalm.getWorldPosition(new Vector3())).distanceTo(m.root.worldToLocal(m.supportSocket.getWorldPosition(new Vector3())));minBowSpan=Math.min(minBowSpan,span);ok(span>.55,id+': bow draw is cramped');
      const string=m.weapon.userData.string.geometry.attributes.position;
      ok(Math.abs(string.getZ(1)-m.weapon.userData.primary[2])<1e-6,id+': drawing fingers miss string');
      ok(Math.abs(m.weapon.userData.arrow.position.z-.08-string.getZ(1))<1e-6,id+': arrow nock misses string');
      for(const limb of m.weapon.userData.bowLimbs){const sign=limb.userData.side,tip=new Vector3(0,sign*.53,-.27).applyEuler(limb.rotation).add(limb.position);ok(tip.distanceTo(new Vector3().fromBufferAttribute(string,sign<0?0:2))<1e-6,id+': string leaves bent bow tip');ok(Math.abs(limb.rotation.x)>.1,id+': bow limbs do not take tension');}
      const hand=m.root.worldToLocal(m.rightPalm.getWorldPosition(new Vector3())),head=m.root.worldToLocal(m.joints.Head.getWorldPosition(new Vector3()));
      ok(head.y-hand.y<.30&&head.y-hand.y>0,id+': draw anchor below the face');
      pose(m,'attack',.54);ok(m.weapon.userData.primary[2]<string.getZ(1)-.12,id+': release drags drawing hand forward with string');
    }
    if(family==='crossbow_2h'){
      pose(m,'attack',.4);const forward=m.weapon.localToWorld(new Vector3(0,0,1)).sub(m.weapon.getWorldPosition(new Vector3())).normalize();ok(forward.z>.995,id+': crossbow does not aim along facing');
      ok(m.weapon.userData.support[2]-m.weapon.userData.primary[2]>.20,id+': crossbow support is not ahead of trigger');
      pose(m,'attack',.70);ok(m.weapon.userData.primary[1]>.025,id+': recovery does not recock the string');
    }
    if(family==='bow_2h'||family==='crossbow_2h')for(const release of [0,.17,.45,.73]){
      if(release>0){pose(m,'attack',release-.00001,{releases:[release]});ok(m.weapon.userData.arrow.visible,id+'/'+family+': projectile disappears early');}
      pose(m,'attack',release,{releases:[release]});ok(!m.weapon.userData.arrow.visible,id+'/'+family+': projectile remains at release');
    }
    // Interrupt an aimed/held pose into locomotion, a cast, and death.
    for(const state of ['walk','cast','death'])for(let i=0;i<=20;i++){
      const t=i/20;pose(m,state,t*.24,{blend:{from:{state:'draw',t:1},weight:t}});
      for(const [anchor,palm] of [[m.weapon.userData.primary,m.rightPalm],[m.weapon.userData.support,m.supportSocket]])ok(m.weapon.localToWorld(point.set(...anchor)).distanceTo(palm.getWorldPosition(new Vector3()))<.000001,id+'/'+family+'/'+state+': interrupted grip detaches');
      if((family==='staff_2h'||family==='spear_2h')&&state!=='death')clearShaft(m,id+'/'+family+'/'+state+' transition');
    }
  }
  m.dispose();
}
console.log(JSON.stringify({status:'PASS',checks,maxGripError,minShaftClearance,minBowSpan},null,2));
