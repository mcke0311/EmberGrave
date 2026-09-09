import assert from 'node:assert/strict';
import {Box3} from '../js/vendor/three/three.module.min.js';
import {createWildshape,FORM_STYLES} from '../js/character_forms3d.mjs';
let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++;};
for(const id of Object.keys(FORM_STYLES)){
  const model=createWildshape(id),bounds=new Box3();
  function pose(state,t){model.animate({state,t,ex:{walkPh:t*Math.PI*2}});return Object.values(model.joints).flatMap(j=>j.matrixWorld.elements);}
  for(const state of ['idle','walk','attack','cast','kick','reach','search','hit','death','dead']){
    const saved=pose(state,.37);pose('dead',1);pose('attack',.7);const restored=pose(state,.37);ok(saved.every((v,i)=>Math.abs(v-restored[i])<1e-8),id+'/'+state+' history-dependent pose');
    for(let n=0;n<=20;n++){
      const matrices=pose(state,n/20);ok(matrices.every(Number.isFinite),id+'/'+state+' invalid joint');
      bounds.setFromObject(model.root);ok(Math.abs(bounds.min.y)<1e-6,id+'/'+state+' floating or sunken feet');
      ok(bounds.max.y<3&&bounds.max.x-bounds.min.x<3.2&&bounds.max.z-bounds.min.z<3.2,id+'/'+state+' outside character frame');
    }
  }
  const death=pose('death',1),dead=pose('dead',.2);ok(death.every((v,i)=>Math.abs(v-dead[i])<1e-8),id+' corpse changed after death');
  for(const [state,end] of [['idle',3],['walk',1],['attack',1],['cast',1],['kick',1],['reach',1],['search',1],['hit',1]]){
    const start=pose(state,0),finish=pose(state,end);ok(start.every((v,i)=>Math.abs(v-finish[i])<1e-8),id+'/'+state+' animation seam');
  }
  model.dispose();
}
console.log('PASS: '+checks+' Wildkeeper shape, animation, grounding and bounds checks.');
