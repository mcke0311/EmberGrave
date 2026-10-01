import fs from 'node:fs';
import assert from 'node:assert/strict';
import {Vector3,Quaternion} from '../js/vendor/three/three.module.min.js';
import {createCharacter,STATES} from '../js/character3d.mjs';
import {CLASS_STYLES,catalogEntries,resolveCharacterVisual} from '../js/character_catalog3d.mjs';
import {modelTestData,equipmentRoots,meshSignature} from './unique_models3d_helpers.mjs';

const {data,items}=modelTestData(),entries=catalogEntries(data,'chest'),classes=Object.keys(CLASS_STYLES);
const baseline=JSON.parse(fs.readFileSync(new URL('fixtures/body_armor3d_before.json',import.meta.url),'utf8'));
const pose=(state='idle',t=0)=>({state,t,ang:.8,ex:{walkPh:t*Math.PI*2}}),report={armors:entries.length,classes:classes.length,combinations:0,pairings:0,models:{},maxTriangles:0};
let checks=0;const ok=(value,message)=>{checks++;assert.ok(value,message);};
assert.equal(entries.length,27);checks++;
assert.deepEqual(entries.reduce((n,e)=>{const kind=e.item.uniqueId?'unique':e.item.setItemId?'set':'ordinary';n[kind]++;return n;},{ordinary:0,set:0,unique:0}),{ordinary:16,set:3,unique:8});checks++;
const resolve=(id,e,extra={})=>resolveCharacterVisual(data,id,{chest:e.item,...extra});
for(const id of classes){
  const model=createCharacter(id),probe=createCharacter(id),body=[];model.root.traverse(o=>{if(/^(Sleeve|Bracer|Leg|BootShaft)[LR]$/.test(o.name))body.push(o);});
  const originalBody=meshSignature(body,true),bindPose=model.skeleton.boneInverses.map(m=>m.elements.slice()),uniqueShapes=new Set();
  ok(body.length===8,id+': default limbs missing');
  for(const e of entries){
    const v=resolve(id,e),chest=v.equipment.chest,key=id+'/'+e.id;model.equip(v.equipment);model.animate(pose());report.combinations++;
    ok(chest.bodyArmorRevision===1&&chest.key.includes('"bodyArmorRevision":1'),key+': missing armor cache revision');
    ok(model.armorLimbs?.isSkinnedMesh&&model.armorLimbs.skeleton===model.skeleton,key+': armor not bound to shared rig');
    ok(body.every(o=>!o.visible),key+': default limbs show through armor');
    const legacy=equipmentRoots(model,'chest',chest,{legacyChest:true});
    assert.deepEqual(meshSignature(legacy,false,{excludeBodyArmorLimbs:true}),baseline.models[key].geometry,key+': original torso/shoulder geometry changed');checks++;
    assert.deepEqual(meshSignature(legacy,true,{excludeBodyArmorLimbs:true}),baseline.models[key].palette,key+': original torso/shoulder palette changed');checks++;
    const roots=equipmentRoots(model,'chest',chest),signature=meshSignature(roots),palette=meshSignature(roots,true),limbs=model.armorLimbs,parts=model.attachments.get('chest').objects.slice(),g=limbs.geometry;
    const regions=limbs.userData.limbRegions;
    assert.deepEqual(regions.map(r=>r.start).sort(),['UpperArmL','UpperArmR','ForearmL','ForearmR','ThighL','ThighR','ShinL','ShinR'].sort());checks++;
    ok(g.attributes.skinIndex.count===g.attributes.position.count&&g.attributes.skinWeight.count===g.attributes.position.count,key+': batching dropped skinning');
    for(let i=0;i<g.attributes.skinWeight.count;i++){
      const weights=Array.from({length:4},(_,j)=>g.attributes.skinWeight.array[i*4+j]),sum=weights.reduce((a,b)=>a+b,0);
      ok(weights.every(w=>w>=0&&w<=1)&&Math.abs(sum-1)<1e-6,key+': invalid skin weights');
    }
    for(const region of regions){
      const end=model.bones.findIndex(b=>b.name===region.end);let anchored=0;
      for(let i=region.firstVertex;i<region.firstVertex+region.vertices;i++)if(g.attributes.skinIndex.getY(i)===end&&g.attributes.skinWeight.getY(i)>.999)anchored++;
      ok(anchored>=12,key+'/'+region.start+': joint seam lost its end anchor');
    }
    for(const range of limbs.userData.guardRanges){
      const bone=model.bones.findIndex(b=>b.name===range.bone);
      for(let i=range.first;i<range.first+range.count;i++)ok(g.attributes.skinIndex.getX(i)===bone&&g.attributes.skinWeight.getX(i)===1,key+': rigid defense bends across a joint');
    }
    if(e.item.uniqueId){ok(chest.modelRevision===3,key+': unique revision not bumped');ok(!uniqueShapes.has(signature.hash),key+': duplicate unique geometry');uniqueShapes.add(signature.hash);ok(signature.triangles<=10904,key+': triangle budget exceeded');}
    for(const state of STATES)for(const t of [0,.25,.55,1]){
      model.animate(pose(state,t));
      assert.deepEqual(model.skeleton.boneInverses.map(m=>m.elements),bindPose,key+': equipment rebound skeleton');checks++;
      for(const r of regions){const vertex=new Vector3();limbs.getVertexPosition(r.firstVertex,vertex);ok(vertex.toArray().every(Number.isFinite),key+'/'+state+': invalid animated garment');}
      for(const object of parts)if(object.parent.name.startsWith('UpperArm')){
        ok(object.quaternion.angleTo(new Quaternion())<1e-7,key+': shoulder correction rotated arm defenses');
        ok(object.children.some(child=>child.userData.armorPauldron),key+': missing independent shoulder hinge');
      }
    }
    model.equip(resolve(id,e).equipment);ok(model.armorLimbs===limbs&&parts.every((p,i)=>p===model.attachments.get('chest').objects[i]),key+': unchanged chest rebuilt');
    for(const slot of ['gloves','boots'])for(const entry of catalogEntries(data,slot)){
      const raw={[slot]:entry.item},pair=resolve(id,e,raw);model.equip(pair.equipment);model.animate(pose('walk',.35));report.pairings++;
      ok(model.armorLimbs===limbs&&parts.every((p,i)=>p===model.attachments.get('chest').objects[i]),key+': glove/boot rebuilt armor');
      const owned=parts.filter(p=>p.userData.armorOverlapSlot===slot);ok(owned.length===2&&owned.every(p=>!p.visible),key+': overlapping '+slot+' guards');
      const hidden=limbs.userData.guardRanges.filter(r=>r.slot===slot).reduce((n,r)=>n+r.count,0);
      ok(g.drawRange.count===g.attributes.position.count-hidden,key+': overlapped guards still submit triangles');
      const wearing=meshSignature(equipmentRoots(model,slot,pair.equipment[slot]),true);probe.equip(resolveCharacterVisual(data,id,raw).equipment);
      assert.deepEqual(meshSignature(equipmentRoots(probe,slot,pair.equipment[slot]),true),wearing,key+': chest replaced '+slot+' geometry');checks++;
    }
    model.equip(v.equipment);model.animate(pose());ok(model.attachments.get('chest').objects.every(p=>p.visible),key+': unequipped cuffs retained hidden guards');
    // Canonical uniques derive their entire outfit despite stale saved visuals.
    if(e.item.uniqueId){
      const item=items.makeUnique(data.UNIQUES.find(r=>r.id===e.id));
      const stale={...JSON.parse(JSON.stringify(item)),identified:false,ilvl:99,materialTier:13,icon:'stale',modelId:'stale',playerVisualFamily:'stale',bodyArmorRevision:0};
      model.equip(resolveCharacterVisual(data,id,{chest:stale}).equipment);model.animate(pose());
      assert.deepEqual(meshSignature(equipmentRoots(model,'chest',chest),true),palette,key+': saved fields changed armor');checks++;
    }
    report.models[key]={triangles:signature.triangles,beforeTriangles:baseline.models[key].geometry.triangles,geometry:signature.hash,beforeGeometry:baseline.models[key].geometry.hash,revision:chest.modelRevision||chest.bodyArmorRevision};report.maxTriangles=Math.max(report.maxTriangles,signature.triangles);
    model.equip({});ok(!model.armorLimbs&&!model.uniqueTorso&&model.attachments.size===0,key+': armor remained after unequip');
    ok(body.every(o=>o.visible),key+': removing chest retained hidden default limbs');
    assert.deepEqual(meshSignature(body,true),originalBody,key+': armor mutated default materials or geometry');checks++;
  }
  model.dispose();probe.dispose();
}
report.checks=checks;fs.mkdirSync(new URL('qa/body_armor3d/',import.meta.url),{recursive:true});fs.writeFileSync(new URL('qa/body_armor3d/contract.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:'PASS',checks,armors:entries.length,combinations:report.combinations,pairings:report.pairings,maxArmorTriangles:report.maxTriangles},null,2));
