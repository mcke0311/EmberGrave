import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {Vector3} from '../js/vendor/three/three.module.min.js';
import {UNIQUE_MODELS3D,UNIQUE_MODEL_SLOTS} from '../js/character_unique_catalog3d.mjs';
import {CLASS_STYLES,EQUIPMENT_SLOTS,catalogEntries,resolveCharacterVisual} from '../js/character_catalog3d.mjs';
import {createCharacter,STATES,weaponProjectileOrigin} from '../js/character3d.mjs';
import {modelTestData,equipmentRoots,meshSignature} from './unique_models3d_helpers.mjs';

const {data,items,manifest}=modelTestData(),snapshot=JSON.parse(fs.readFileSync(new URL('fixtures/ordinary_models3d_before.json',import.meta.url),'utf8'));
const before=JSON.parse(fs.readFileSync(new URL('qa/unique_models3d/contract.json',import.meta.url),'utf8')),
  originalRecipes=JSON.parse(fs.readFileSync(new URL('fixtures/unique_models3d_v1_recipes.json',import.meta.url),'utf8'));
const included=data.UNIQUES.filter(def=>UNIQUE_MODEL_SLOTS.includes(data.BASES[def.base].slot));
let checks=0,maxGripError=0,ordinary=0,maxTriangles=0;
const ok=(value,message)=>{checks++;assert.ok(value,message);};
assert.deepEqual(Object.keys(UNIQUE_MODELS3D).sort(),Array.from(included,d=>d.id).sort());checks++;
ok(included.length===118,'wrong unique model scope');
const report={models:{},counts:{},ordinaryCombinations:0};
for(const def of included){
  const r=UNIQUE_MODELS3D[def.id];ok(Object.isFrozen(r)&&Object.isFrozen(r.material)&&Object.isFrozen(r.attachment),def.id+': mutable recipe');
  ok(r.revision===(r.slot==='chest'?3:2)&&Object.isFrozen(r.refinement)&&r.refinement.detail&&r.refinement.wear>=0&&r.refinement.wear<=1,def.id+': missing authored refinement');
  const original=originalRecipes[def.id].attachment,retained={...r.attachment,parents:r.attachment.parents.filter(p=>original.parents.includes(p))};
  assert.deepEqual(retained,original,def.id+': refinement moved an attachment anchor');checks++;
  if(r.slot==='chest')ok(Object.isFrozen(r.limbs)&&r.limbs.style&&r.limbs.surface,def.id+': missing limb profile');
  ok(r.baseId===def.base&&r.slot===data.BASES[def.base].slot,def.id+': wrong attachment');
  const art=manifest.maps.uniqueItemIcons[def.id],asset=manifest.entries[r.reference.assetId];
  ok(art?.assetId===r.reference.assetId&&art.index===r.reference.index&&asset&&r.reference.index>=0&&r.reference.index<asset.cols*asset.rows,def.id+': invalid inventory-art reference');
  ok(crypto.createHash('sha256').update(fs.readFileSync(new URL('../'+r.reference.source,import.meta.url))).digest('hex')===r.reference.sha256,def.id+': inventory reference changed');
  report.counts[r.category]=(report.counts[r.category]||0)+1;
}
for(const classId of Object.keys(CLASS_STYLES)){
  const model=createCharacter(classId),signatures=new Set(),bindPose=model.skeleton.boneInverses.map(matrix=>matrix.elements.slice());
  for(const slot of EQUIPMENT_SLOTS)for(const entry of catalogEntries(data,slot)){
    if(entry.item.uniqueId&&UNIQUE_MODEL_SLOTS.includes(slot))continue;
    const key=classId+'/'+slot+'/'+entry.id,visual=resolveCharacterVisual(data,classId,{[slot]:entry.item});
    model.equip(visual.equipment);model.animate({state:'idle',t:0,ex:{}});
    assert.deepEqual(model.skeleton.boneInverses.map(matrix=>matrix.elements),bindPose,key+': armor rebound the shared skeleton');checks++;
    assert.deepEqual(meshSignature(equipmentRoots(model,slot,visual.equipment[slot],{legacyChest:slot==='chest'}),true,{excludeBodyArmorLimbs:slot==='chest'}),snapshot[key],key+': existing model changed');checks++;ordinary++;
    ok(!visual.equipment[slot].modelId,key+': excluded model became bespoke');
  }
  for(const def of included){
    const slot=data.BASES[def.base].slot,item=items.makeUnique(def);
    const visual=resolveCharacterVisual(data,classId,{[slot]:item}),resolved=visual.equipment[slot];
    ok(resolved.modelId===def.id,def.id+': canonical unique model ignored');
    model.equip(visual.equipment);model.animate({state:'idle',t:0,ex:{}});
    assert.deepEqual(model.skeleton.boneInverses.map(matrix=>matrix.elements),bindPose,classId+'/'+def.id+': armor rebound the shared skeleton');checks++;
    const roots=equipmentRoots(model,slot,resolved),sig=meshSignature(roots),palette=meshSignature(roots,true);
    assert.deepEqual(model.attachments.get(slot).objects.map(object=>object.parent.name).sort(),[...UNIQUE_MODELS3D[def.id].attachment.parents].sort(),def.id+': registry attachment differs from the rig');checks++;
    ok(sig.vertices>25&&sig.triangles>10,def.id+': empty or flat model');
    ok(!signatures.has(sig.hash),classId+'/'+def.id+': duplicate geometry');signatures.add(sig.hash);
    maxTriangles=Math.max(maxTriangles,sig.triangles);
    ok(sig.triangles<=10904,def.id+': exceeded the retained geometry budget');
    ok(sig.hash!==before.models[classId+'/'+def.id].geometry,def.id+': geometry was not refined');
    ok(resolved.modelRevision===UNIQUE_MODELS3D[def.id].revision&&resolved.key.includes('"modelRevision":'+resolved.modelRevision),def.id+': recipe revision missing from appearance key');
    for(const root of roots)root.traverse(o=>{
      if(o.geometry)for(const a of Object.values(o.geometry.attributes))ok(Array.from(a.array).every(Number.isFinite),def.id+': invalid geometry');
      if(o.isMesh){ok(o.geometry.attributes.color?.count===o.geometry.attributes.position.count,def.id+': vertex shading lost during batching');
        for(const mat of [].concat(o.material)){
          ok(mat.vertexColors,def.id+': material ignores vertex shading');
          for(const key of ['map','bumpMap','roughnessMap','metalnessMap'])if(mat[key])ok(mat[key].image.width===128&&mat[key].image.height===128,def.id+': texture budget changed');
          if(mat.userData.uniqueSurfaceAtlas){
            ok(mat.roughnessMap===mat.metalnessMap&&mat.bumpMap===mat.map,def.id+': redundant surface texture');
            const response=mat.roughnessMap.image.data;
            ok(response.every((value,i)=>i%4!==0||value<=Math.round(UNIQUE_MODELS3D[def.id].refinement.emission*255)),def.id+': emissive finish exceeds authored strength');
          }
        }
      }
    });
    if(slot==='chest')ok(model.uniqueTorso&&Object.values(model.armor).every(o=>!o.visible),def.id+': generic torso hides unique armor');
    if(slot==='gloves'||slot==='boots'){
      const pair=model.attachments.get(slot).objects;ok(pair.length===2&&pair[0].parent!==pair[1].parent,def.id+': missing paired limb');
      ok(pair[1].scale.x===-1,def.id+': missing mirrored pair');
    }
    const changed=resolveCharacterVisual(data,classId,{[slot]:{...JSON.parse(JSON.stringify(item)),identified:false,ilvl:99,materialTier:13,icon:'cache',modelId:'stale-model',playerVisualFamily:'invalid-stale-family'}});
    model.equip(changed.equipment);model.animate({state:'idle',t:0,ex:{}});
    assert.deepEqual(meshSignature(equipmentRoots(model,slot,changed.equipment[slot]),true),palette,def.id+': save fields replace model');checks++;
    const ordinaryVisual=resolveCharacterVisual(data,classId,{[slot]:items.fromBase(def.base)});
    model.equip(ordinaryVisual.equipment);
    ok(meshSignature(equipmentRoots(model,slot,ordinaryVisual.equipment[slot])).hash!==sig.hash,def.id+': base geometry reused');
    model.equip(visual.equipment);
    for(const state of STATES)for(const t of [0,.25,.5,.75,1]){
      model.animate({state,t,ang:.9,ex:{walkPh:t*Math.PI*2}});
      ok(model.bones.every(b=>b.matrixWorld.elements.every(Number.isFinite)),def.id+'/'+state+': invalid pose');
      if(resolved.twoHand){
        const primary=model.weapon.localToWorld(new Vector3(...model.weapon.userData.primary)),support=model.weapon.localToWorld(new Vector3(...model.weapon.userData.support));
        const a=primary.distanceTo(model.rightPalm.getWorldPosition(new Vector3())),b=support.distanceTo(model.supportSocket.getWorldPosition(new Vector3()));
        maxGripError=Math.max(maxGripError,a,b);ok(a<.015&&b<.015,def.id+'/'+state+'/'+t+': detached grip');
      }
      if(['bow_2h','crossbow_2h'].includes(resolved.family))ok(Object.values(weaponProjectileOrigin(model)).every(Number.isFinite),def.id+': invalid projectile anchor');
    }
    const stowables=[model.weapon,...(model.attachments.get('off')?.objects||[])].filter(Boolean),homes=stowables.map(object=>({parent:object.parent,position:object.position.clone(),rotation:object.quaternion.clone()}));
    for(const clip of ['examine','offer','ward']){
      model.animate({state:'idle',t:0,ex:{cinematic:{clip,u:.6,time:2}}});
      ok(model.bones.every(bone=>bone.matrixWorld.elements.every(Number.isFinite)),def.id+': invalid cinematic pose');
      model.animate({state:'idle',t:0,ex:{}});
      ok(stowables.every((object,i)=>object.parent===homes[i].parent&&object.position.distanceTo(homes[i].position)<1e-9&&object.quaternion.angleTo(homes[i].rotation)<1e-7),def.id+': cinematic left equipment stowed');
    }
    report.models[classId+'/'+def.id]={geometry:sig.hash,triangles:sig.triangles,beforeTriangles:before.models[classId+'/'+def.id].triangles,modelId:resolved.modelId,revision:resolved.modelRevision};
  }
  model.equip({});ok(!model.weapon&&!model.uniqueTorso&&!model.armorLimbs&&model.attachments.size===0,classId+': unequip leaked attachments');model.dispose();
}
ok(ordinary===Object.keys(snapshot).length,'ordinary regression coverage changed');
const missing={...included[0],id:'u_known_missing_model'};data.UNIQUES.push(missing);
assert.throws(()=>resolveCharacterVisual(data,'vanguard',{main:items.makeUnique(missing)}),/Missing or invalid unique 3D model/);checks++;data.UNIQUES.pop();
const unknown=resolveCharacterVisual(data,'vanguard',{main:{baseId:'handaxe',uniqueId:'unknown-legacy-unique'}});
ok(!unknown.equipment.main.modelId,'unknown legacy identity stopped using base model');
report.ordinaryCombinations=ordinary;report.checks=checks;report.maxGripError=maxGripError;report.maxEquipmentTriangles=maxTriangles;
fs.mkdirSync(new URL('qa/body_armor3d/',import.meta.url),{recursive:true});
fs.writeFileSync(new URL('qa/body_armor3d/unique-models.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:'PASS',checks,uniqueModels:included.length,classUniqueCombinations:included.length*5,ordinaryCombinations:ordinary,maxGripError,maxEquipmentTriangles:maxTriangles},null,2));
