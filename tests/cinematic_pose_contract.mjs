/* Cinematic rendering must be seekable, grounded and unable to leave gear stowed. */
import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
import {createCharacter} from '../js/character3d.mjs';
import {sampleHumanoid} from '../js/character_animation3d.mjs';
import {createWildshape} from '../js/character_forms3d.mjs';
import {CINEMATIC_CLIPS} from '../js/character_cinematic3d.mjs';
import {resolveCharacterVisual} from '../js/character_catalog3d.mjs';
const scope={console};vm.createContext(scope);vm.runInContext(fs.readFileSync('js/utils.js','utf8')+'\n'+fs.readFileSync('js/data.js','utf8')+'\nthis.DATA=DATA;',scope);
let checks=0;const check=(v,m)=>{assert.ok(v,m);checks++;};
const matrix=model=>{model.root.updateMatrixWorld(true);return Object.values(model.joints).flatMap(j=>j.matrixWorld.elements);};
const equal=(a,b)=>a.length===b.length&&a.every((v,i)=>Math.abs(v-b[i])<1e-9);
function pose(clip,u){return {state:clip==='walk'?'walk':'idle',t:1.37,ang:.6,ex:{walkPh:2.17,cinematic:{clip,u,time:4.7,travel:.23,hand:{x:.42,y:-.42,lift:54}}}};}
for(const cls of ['vanguard','emberwitch','gravebinder','veilranger','wildkeeper']){
 const model=createCharacter(cls),gear=Object.fromEntries(Object.entries(scope.DATA.PLAYER_STARTER_LOADOUTS[cls]).map(([slot,baseId])=>[slot,{baseId}])),equipment=resolveCharacterVisual(scope.DATA,cls,gear).equipment;model.equip(equipment);
 const parent=model.weapon?.parent,position=model.weapon?.position.clone(),rotation=model.weapon?.quaternion.clone();
 for(const clip of CINEMATIC_CLIPS)for(const u of [0,.38,.6,.8,1]){
  model.animate(pose(clip,u));const before=matrix(model);check(before.every(Number.isFinite),cls+'/'+clip+' finite transforms');
  model.animate(pose('recoil',.15));model.animate(pose('examine',.9));model.animate(pose(clip,u));check(equal(matrix(model),before),cls+'/'+clip+' poses do not depend on playback history');
 }
 model.animate({state:'idle',t:0,ang:.6,ex:{}});check(model.weapon.parent===parent&&model.weapon.position.distanceTo(position)<1e-9&&model.weapon.quaternion.angleTo(rotation)<1e-7,cls+' normal gear placement restored');
 // Distance-based stance: the same planted foot stays at a constant world point.
 for(const start of [.01,.07,.13,.19,.23,.69]){
  const p=d=>sampleHumanoid(cls,{state:'walk',t:0,ex:{walkPh:d/.68*Math.PI*2,cinematic:{clip:'walk',u:.5,time:1,travel:d}}},equipment);
  const a=p(start),b=p(start+.005);for(const foot of a.feet){const next=b.feet.find(f=>f.id===foot.id);if(foot.contact&&next.contact)check(Math.abs(start+foot.z*a.gait.width-(start+.005+next.z*b.gait.width))<1e-9,cls+' planted foot does not slide');}
 }
 model.dispose();
}
for(const id of ['form_fang','form_brute','form_stone','form_apex']){
 const model=createWildshape(id);for(const clip of CINEMATIC_CLIPS)for(const u of [0,.38,.6,.8,1]){
  model.animate(pose(clip,u));const before=matrix(model);check(before.every(Number.isFinite),id+'/'+clip+' finite transforms');
  model.animate(pose('strike',.6));model.animate(pose('watch',.2));model.animate(pose(clip,u));check(equal(matrix(model),before),id+'/'+clip+' independent sampling');
 }
 for(const d of [.01,.07,.13,.19,.23,.69]){
  model.animate({state:'walk',t:0,ex:{walkPh:d/.68*Math.PI*2,cinematic:{clip:'walk',u:.5,time:1,travel:d}}});const a=model.contacts.map(f=>({...f}));
  model.animate({state:'walk',t:0,ex:{walkPh:(d+.005)/.68*Math.PI*2,cinematic:{clip:'walk',u:.5,time:1,travel:d+.005}}});
  for(const foot of a){const next=model.contacts.find(f=>f.id===foot.id);if(foot.contact&&next.contact)check(Math.abs(d+foot.z-(d+.005+next.z))<1e-9,id+' planted contact does not slide');}
 }
 model.dispose();
}
console.log(`PASS ${checks} cinematic pose checks: all clips/classes/forms, history independence, finite transforms, planted feet and equipment restoration`);
