// Run: node tests/three_character_contract.mjs (no browser or npm install needed).
import assert from 'node:assert/strict';
import {createEmberWitch,facingYaw,STATES} from '../js/emberwitch3d.mjs';
import {Vector3} from '../js/vendor/three/three.module.min.js';
const model=createEmberWitch();let checks=0;
function ok(value,message){assert.ok(value,message);checks++;}
const pose=(state,t,angle=0)=>({state,t,ang:angle,ex:{walkPh:t*Math.PI*2}});
const handLocal=model.socket.position.clone();
for(const state of STATES)for(const t of [0,.125,.25,.5,.75,.999999]) {
  model.animate(pose(state,t));
  ok(model.bones.every(b=>b.matrixWorld.elements.every(Number.isFinite)),`${state}/${t}: invalid bone transform`);
  const handPoint=model.joints.HandR.localToWorld(handLocal.clone());
  ok(handPoint.distanceTo(model.socket.getWorldPosition(new Vector3()))<1e-9,`${state}/${t}: detached weapon grip`);
  const wandPoint=model.wand.getWorldPosition(new Vector3());
  ok(handPoint.distanceTo(wandPoint)<1e-9,`${state}/${t}: weapon drifted from socket`);
}
for(const armor of ['light','mail',null]) {
  model.equip({chest:armor,main:false});
  ok(model.armor.light.visible===(armor==='light')&&model.armor.mail.visible===(armor==='mail'),'armor visibility does not match selection');
  ok(!model.wand.visible,'unequipping wand leaves a visible weapon');
}
model.equip({chest:'mail',main:true});ok(model.wand.visible,'wand failed to re-equip');
model.root.traverse(mesh=>{
  if(!mesh.isSkinnedMesh)return;
  ok(mesh.skeleton===model.skeleton,`${mesh.name}: equipment uses a different skeleton`);
  const w=mesh.geometry.getAttribute('skinWeight'),indices=mesh.geometry.getAttribute('skinIndex');
  for(let i=0;i<w.count;i++) {
    assert.ok(Math.abs(w.getX(i)+w.getY(i)+w.getZ(i)+w.getW(i)-1)<1e-6,`${mesh.name}: invalid weight sum`);
    assert.ok(indices.getX(i)<model.bones.length&&indices.getY(i)<model.bones.length,`${mesh.name}: invalid bone index`);
  }
  checks++;
});
model.animate(pose('walk',.25));const a=model.joints.FootL.getWorldPosition(new Vector3());const b=model.joints.FootR.getWorldPosition(new Vector3());
model.animate(pose('walk',.75));const c=model.joints.FootL.getWorldPosition(new Vector3());const d=model.joints.FootR.getWorldPosition(new Vector3());
ok((a.z-b.z)*(c.z-d.z)<0,'the same foot leads in both half strides');
model.animate(pose('walk',0));const start=model.bones.flatMap(b=>b.matrixWorld.elements);
model.animate(pose('walk',1));const end=model.bones.flatMap(b=>b.matrixWorld.elements);
ok(start.every((v,i)=>Math.abs(v-end[i])<1e-8),'walk does not loop exactly');
model.animate(pose('dead',0));const deadA=model.joints.Head.getWorldPosition(new Vector3());
model.animate(pose('dead',.99));ok(deadA.distanceTo(model.joints.Head.getWorldPosition(new Vector3()))<1e-8,'corpse changes pose over time');
for(let i=0;i<16;i++) {
  const ang=i*Math.PI/8,yaw=facingYaw(ang);
  const projected=Math.atan2(Math.cos(yaw)*.5,Math.sin(yaw));
  ok(Math.abs(Math.atan2(Math.sin(projected-ang),Math.cos(projected-ang)))<1e-8,'3D facing disagrees with screen-space movement');
}
model.dispose();console.log(`PASS: ${checks} skeleton, grip, equipment, walk, corpse, and facing checks.`);
