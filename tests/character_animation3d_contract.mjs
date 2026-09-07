import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
import {Vector3} from '../js/vendor/three/three.module.min.js';
import {createCharacter,STATES} from '../js/character3d.mjs';
import {CLASS_STYLES,WEAPON_FAMILIES,resolveCharacterVisual} from '../js/character_catalog3d.mjs';
const scope={console};vm.createContext(scope);vm.runInContext(fs.readFileSync('js/utils.js','utf8')+'\n'+fs.readFileSync('js/data.js','utf8')+'\nthis.DATA=DATA;',scope);
const data=scope.DATA,ok=(v,m)=>{assert.ok(v,m);checks++;};let checks=0,maxGripError=0,maxStep=0,maxStepCase='',maxDeadChestHeight=0;
const clipSets=Object.fromEntries(STATES.map(s=>[s,new Set()]));
const at=(m,state,t)=>{m.animate({state,t:state==='idle'?t*3:t,ex:{walkPh:t*Math.PI*2}});return m.bones.flatMap(b=>[...b.position.toArray(),...b.quaternion.toArray()]);};
const difference=(a,b)=>Math.max(...a.map((x,i)=>Math.abs(x-b[i])));
for(const id of Object.keys(CLASS_STYLES)){
  const model=createCharacter(id);
  for(const clip of model.clips)clipSets[clip.name].add(JSON.stringify(clip.tracks.map(t=>Array.from(t.values))));
  for(const family of [null,...WEAPON_FAMILIES]){
    const base=family?Object.values(data.BASES).find(b=>b.playerVisualFamily===family&&b.id.endsWith('_t13')):null;
    const gear=Object.fromEntries(['head','chest','gloves','boots','belt'].map(s=>[s,{baseId:(s==='head'?'helm':s)+'_t13'}]));if(base)gear.main={baseId:base.id};if(base&&!base.twoHand)gear.off={baseId:'shield_t13'};
    model.equip(resolveCharacterVisual(data,id,gear).equipment);const idle=at(model,'idle',0),label=id+'/'+family;
    for(const state of ['attack','cast','kick','hit']){ok(difference(at(model,state,0),idle)<1e-7,label+'/'+state+': start snaps from idle');ok(difference(at(model,state,1),idle)<1e-7,label+'/'+state+': recovery snaps to idle');}
    at(model,'kick',.5);const kickingFoot=model.joints.FootR.getWorldPosition(new Vector3()),supportFoot=model.joints.FootL.getWorldPosition(new Vector3());
    ok(kickingFoot.z-supportFoot.z>.55&&kickingFoot.y-supportFoot.y>.35,label+': kick does not extend the boot toward the object');
    ok(difference(at(model,'idle',0),at(model,'idle',1))<1e-7,label+': idle seam');ok(difference(at(model,'walk',0),at(model,'walk',1))<1e-7,label+': gait seam');
    ok(difference(at(model,'death',1),at(model,'dead',.2))<1e-7,label+': death does not match dead');
    let floor=Infinity;const point=new Vector3();model.root.traverseVisible(o=>{if(o.isMesh)for(let i=0;i<o.geometry.attributes.position.count;i++){o.getVertexPosition(i,point).applyMatrix4(o.matrixWorld);floor=Math.min(floor,point.y);}});
    ok(floor>=-.003&&floor<.015,label+': corpse clips through or floats above ground');
    const chestHeight=model.joints.Chest.getWorldPosition(point).y;maxDeadChestHeight=Math.max(maxDeadChestHeight,chestHeight);ok(chestHeight<.75,label+': equipment props up the fallen torso');
    ok(!model.root.getObjectByName('ClassCastingFocus').visible,label+': casting effect persists after death');
    if(base){const axes=family==='crossbow_2h'?[[1,0,0],[0,0,1]]:family==='bow_2h'?[[0,1,0],[0,0,1]]:[[0,1,0]],origin=model.weapon.getWorldPosition(new Vector3());for(const axis of axes)ok(Math.abs(model.weapon.localToWorld(new Vector3(...axis)).y-origin.y)<.0001,label+': fallen weapon is not flat');}
    for(const state of STATES){
      const saved=at(model,state,.37);at(model,'dead',1);at(model,'attack',.75);ok(difference(saved,at(model,state,.37))<1e-7,label+'/'+state+': history-dependent pose');
      let previous=null;
      for(let i=0;i<=40;i++){
        const t=i/40;at(model,state,t);const positions=model.bones.map(b=>b.getWorldPosition(new Vector3()));
        ok(positions.every(p=>p.toArray().every(Number.isFinite)),label+'/'+state+': invalid pose');
        if(previous){const step=Math.max(...positions.map((p,j)=>p.distanceTo(previous[j])));if(step>maxStep){maxStep=step;maxStepCase=label+'/'+state+'/'+t;}ok(step<.32,label+'/'+state+'/'+t+': abrupt bone motion '+step);}
        previous=positions;
        if(base?.twoHand){
          const primary=new Vector3(...model.weapon.userData.primary);
          const a=model.weapon.localToWorld(primary).distanceTo(model.rightPalm.getWorldPosition(new Vector3())),b=model.weapon.localToWorld(new Vector3(...model.weapon.userData.support)).distanceTo(model.supportSocket.getWorldPosition(new Vector3()));maxGripError=Math.max(maxGripError,a,b);ok(a<.015&&b<.015,label+'/'+state+'/'+t+': detached grip');
        }
      }
    }
    if(family==='bow_2h'){at(model,'attack',.44);ok(model.weapon.userData.arrow.visible,label+': arrow released too early');at(model,'attack',.46);ok(!model.weapon.userData.arrow.visible,label+': arrow not released');at(model,'idle',0);ok(model.weapon.userData.arrow.visible,label+': arrow not restored');}
  }
  model.dispose();
}
for(const state of STATES)ok(clipSets[state].size===5,state+': classes share a clip');
console.log(JSON.stringify({status:'PASS',checks,distinctClips:STATES.length*5,maxGripError,maxStep,maxStepCase,maxDeadChestHeight},null,2));
