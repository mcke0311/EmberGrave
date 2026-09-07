import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
import {Vector3} from '../js/vendor/three/three.module.min.js';
import {CLASS_STYLES,EQUIPMENT_SLOTS,WEAPON_FAMILIES,resolveCharacterVisual,catalogEntries} from '../js/character_catalog3d.mjs';
import {createCharacter,STATES} from '../js/character3d.mjs';
const scope={console};vm.createContext(scope);vm.runInContext(fs.readFileSync('js/utils.js','utf8')+'\n'+fs.readFileSync('js/data.js','utf8')+'\nthis.DATA=DATA;',scope);const data=scope.DATA;
let checks=0,maxGripError=0;const coverage=[],armorShapes=new Map();
const ok=(v,m)=>{assert.ok(v,m);checks++;};
const pose=(state,t)=>({state,t,ex:{walkPh:t*Math.PI*2}});
for(const classId of Object.keys(CLASS_STYLES)) {
  const model=createCharacter(classId);
  for(const slot of EQUIPMENT_SLOTS)for(const entry of catalogEntries(data,slot)) {
    const visual=resolveCharacterVisual(data,classId,{[slot]:entry.item});model.equip(visual.equipment);model.animate(pose('idle',0));
    const meshes=[];model.root.traverse(o=>{if(o.isMesh&&o.visible)meshes.push(o);});
    ok(meshes.length>0,`${classId}/${entry.id}: no meshes`);
    const item=visual.equipment[slot];
    ok(slot==='chest'?model.armor[item.family].visible:model.attachments.get(slot)?.key===item.key,`${classId}/${slot}/${entry.id}: missing attachment`);
    coverage.push(`${classId}/${slot}/${entry.id}`);
  }
  for(const family of WEAPON_FAMILIES) {
    const base=Object.values(data.BASES).find(b=>b.playerVisualFamily===family);
    const equip={main:{baseId:base.id},head:{baseId:'helm_t13'},chest:{baseId:'chest_t13'},gloves:{baseId:'gloves_t13'},boots:{baseId:'boots_t13'},belt:{baseId:'belt_t13'}};
    if(!base.twoHand)equip.off={baseId:'shield_t13'};
    model.equip(resolveCharacterVisual(data,classId,equip).equipment);
    for(const state of STATES)for(const t of [0,.25,.5,.75,.999]) {
      model.animate(pose(state,t));ok(model.bones.every(b=>b.matrixWorld.elements.every(Number.isFinite)),`${classId}/${family}/${state}: invalid skeleton`);
      if(base.twoHand){
        const support=model.weapon.localToWorld(new Vector3(...model.weapon.userData.support));
        const actual=model.supportSocket.getWorldPosition(new Vector3()),error=actual.distanceTo(support);maxGripError=Math.max(maxGripError,error);
        ok(error<.015,`${classId}/${family}/${state}/${t}: support hand detached by ${error.toFixed(4)} model units`);
        const right=new Vector3();if(family==='bow_2h')right.z=model.weapon.userData.string.geometry.attributes.position.getZ(1);
        const primary=model.weapon.localToWorld(right),primaryError=primary.distanceTo(model.rightPalm.getWorldPosition(new Vector3()));
        ok(primaryError<.015,`${classId}/${family}/${state}/${t}: primary grip detached by ${primaryError}`);
      } else ok(model.weapon.getWorldPosition(new Vector3()).distanceTo(model.socket.getWorldPosition(new Vector3()))<1e-8,'one-handed grip detached');
    }
  }
  for(const tier of [0,4,7,13]){
    const slots=['head','chest','gloves','boots','belt','off'];
    const equip=Object.fromEntries(slots.map(slot=>[slot,{baseId:(slot==='head'?'helm':slot==='off'?'shield':slot)+'_t'+tier}]));
    model.equip(resolveCharacterVisual(data,classId,equip).equipment);
    for(const slot of slots){
      let hash=2166136261;for(const root of model.attachments.get(slot).objects)root.traverse(o=>{if(o.geometry)for(const value of o.geometry.attributes.position.array){assert.ok(Number.isFinite(value));hash=Math.imul(hash^Math.round(value*1e5),16777619);}});
      const key=slot+'/'+tier;if(!armorShapes.has(key))armorShapes.set(key,new Set());armorShapes.get(key).add(hash);
    }
  }
  model.equip({});ok(!model.weapon&&model.attachments.size===0,'unequip did not clear attachments');model.dispose();
}
for(const [slot,shapes] of armorShapes)ok(shapes.size===5,slot+': classes reused the same armor geometry');
assert.throws(()=>resolveCharacterVisual(data,'vanguard',{main:{baseId:'sword2h_t0'},off:{baseId:'buckler'}}),/two-handed/);checks++;
assert.throws(()=>resolveCharacterVisual(data,'vanguard',{main:{baseId:'cap'}}),/belongs/);checks++;
assert.throws(()=>resolveCharacterVisual(data,'vanguard',{main:{baseId:'unknown'}}),/Unknown/);checks++;
console.log(JSON.stringify({status:'PASS',checks,baseItems:Object.keys(data.BASES).length,uniques:data.UNIQUES.length,setItems:data.SET_ITEMS.length,classItemCombinations:coverage.length,maxGripError},null,2));
