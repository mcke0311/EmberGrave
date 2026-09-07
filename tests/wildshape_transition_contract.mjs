import assert from 'node:assert/strict';
import {Box3} from '../js/vendor/three/three.module.min.js';
import {createWildshape,FORM_STYLES} from '../js/character_forms3d.mjs';
import {createCharacter} from '../js/character3d.mjs';
import {createAnimationController} from '../js/character_motion3d.mjs';
import {createWildshapeController,shiftLayers,applyShiftPose,shiftDuration} from '../js/character_wildshape3d.mjs';

let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++;};
const forms=[null,...Object.keys(FORM_STYLES)],map={},pose={state:'idle',t:0,ang:1,ex:{}};
for(const from of forms)for(const to of forms)if(from!==to){
  const c=createWildshapeController();
  ok(c.update(from,pose,.016,{map})===null,'loading a hero must not replay a transformation');
  let frame=c.update(to,pose,.016,{map});
  ok(frame.from===from&&frame.to===to&&frame.t===0,'wrong shift endpoints');
  ok(shiftLayers(frame,pose)[0].alpha===1&&shiftLayers(frame,pose)[1].alpha===0,'shift begins with original silhouette');
  const frozen=JSON.stringify(frame);
  for(let i=0;i<8;i++)shiftLayers(frame,pose);
  ok(JSON.stringify(frame)===frozen,'rendering advances simulation');
  ok(c.update(to,pose,0,{map}).t===0,'paused simulation advances shift');
  for(let i=1;i<=30;i++){
    const t=i/30,layers=shiftLayers({...frame,t},pose);
    ok(Math.abs(layers[0].alpha+layers[1].alpha-1)<1e-10,'silhouette disappears during change');
    ok(layers.every(l=>l.alpha>=0&&l.alpha<=1&&l.amount>=0&&l.amount<=1),'invalid opacity or deformation');
  }
  let elapsed=0;while(frame&&elapsed<2){frame=c.update(to,pose,1/60,{map});elapsed+=1/60;}
  ok(!frame&&elapsed>=shiftDuration(from,to)&&elapsed<shiftDuration(from,to)+.02,'transition duration drift');
  const end=shiftLayers({from,to,t:1},pose);
  ok(end[1].alpha===1&&end[1].amount===0,'shift fails to settle into live pose');
  c.update(from,pose,.01,{map});ok(c.update(from,pose,.01,{map,dead:true})===null,'death must cancel shift');
  c.update(to,pose,.01,{map});ok(c.update(to,pose,.01,{map:{}})===null,'map travel must cancel shift');
}
// Source poses must retain the correct skeleton's contacts on a rapid recast.
const player={classId:'wildkeeper',x:0,y:0,visAng:1,animT:0,buffs:[],curSpeed:0},motion=createAnimationController(),controller=createWildshapeController();
const models=new Map(forms.map(id=>[id,id?createWildshape(id):createCharacter('wildkeeper')]));
const scales=new Map([...models].map(([id,m])=>[id,m.root.scale.clone()]));
for(let n=0;n<180;n++){
  const form=n<5?null:n<10?'form_fang':n<12?'form_brute':n<14?'form_apex':n<20?null:n<65?'form_stone':n<110?'form_fang':null;
  player.buffs=form?[{id:form}]:[];player.animT=n/60;
  const current=motion.update(player,1/60),shift=controller.update(form,current,1/60,{map});
  for(const layer of shift?shiftLayers(shift,current):[{form,pose:current,amount:0,entering:true}]){
    const model=models.get(layer.form);model.root.scale.copy(scales.get(layer.form));model.animate(layer.pose);applyShiftPose(model,layer.amount,layer.entering);
    const box=new Box3().setFromObject(model.root);
    ok(Number.isFinite(box.max.y)&&box.max.y<3.3,'invalid or clipped interrupted shift');
    ok(Math.abs(box.min.y)<(layer.form?1e-6:.007),`shift loses ground anchor: frame ${n}, form ${layer.form}, amount ${layer.amount}, y ${box.min.y}`);
  }
}
for(const [id,model] of models){
  model.root.scale.copy(scales.get(id));model.animate(pose);
  const before=Object.values(model.joints).flatMap(j=>j.matrixWorld.elements);
  applyShiftPose(model,.9,true);model.root.scale.copy(scales.get(id));model.animate(pose);
  ok(Object.values(model.joints).flatMap(j=>j.matrixWorld.elements).every((v,i)=>Math.abs(v-before[i])<1e-8),'shift leaves deformation on cached model');
  model.dispose();
}
console.log(`PASS: ${checks} transformation lifecycle, interruption, grounding and pose restoration checks.`);
