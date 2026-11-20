/* Original five-class characters. Geometry, skeleton and clips are authored here;
   Three.js is pinned in vendor/three. Coordinates: Y up, character faces +Z. */
import * as THREE from './vendor/three/three.module.min.js';
import {CLASS_STYLES,ARMOR_FAMILIES} from './character_catalog3d.mjs?v=forged-1';
import {createWeapon,createWearable,createArmorDetails,disposeObject,rod} from './character_equipment3d.mjs?v=forged-1';
import {uniqueTorsoGeometry,uniqueTorsoMaterial,poseUniqueFlex} from './character_unique_equipment3d.mjs?v=forged-1';
import {disposeUniquePainting} from './character_unique_paint3d.mjs';
export {loadUniquePainting} from './character_unique_paint3d.mjs';
import {surfaceMaterial,disposeMaterials} from './character_materials3d.mjs?v=painted-1';
import {isStarterVest,paintedMaterial,skinMaterial,bootMaterial,bootGeometry,sculptHead,sculptHand,createSplitCoat,vestGeometry,tapered} from './character_painted3d.mjs?v=mantles-1';
import {heroPanel,setHemRank,paintGarment} from './character_finish3d.mjs?v=mantles-1';
import {createMantle} from './character_mantle3d.mjs';
import {combineStatic} from './character_mesh3d.mjs?v=body-armor-1';
import {armorPalette,armorRank} from './character_armor3d.mjs?v=mantles-1';
import {createArmorLimbs,updateArmorLimbCoverage} from './character_body_armor3d.mjs?v=forged-1';
import {CLASS_ANIMATIONS,classPoseAt,sampleHumanoid,smooth} from './character_animation3d.mjs?v=bow-draw-1';
import {createWildshape} from './character_forms3d.mjs?v=bow-draw-1';
import {shiftLayers,applyShiftPose,drawShiftEffect} from './character_wildshape3d.mjs';
export {createWildshapeController} from './character_wildshape3d.mjs';
export {createAnimationController} from './character_motion3d.mjs?v=bow-draw-1';
export {CLASS_STYLES} from './character_catalog3d.mjs?v=forged-1';

const TAU = Math.PI * 2;
const clamp = THREE.MathUtils.clamp;
export const ARMOR = ARMOR_FAMILIES;
export const STATES = ['idle', 'walk', 'attack', 'cast', 'kick', 'reach', 'search', 'hit', 'death', 'dead'];

export function createCharacter(classId='emberwitch') {
  const profile=CLASS_STYLES[classId];if(!profile)throw new Error(`Unknown 3D class: ${classId}`);
  const root = new THREE.Group(); root.name = profile.name;
  const bones = [], joints = {}, rest = {};
  const material = (color, extra = {}) => new THREE.MeshStandardMaterial({color, roughness: .83, ...extra});
  const materials = {
    skin: skinMaterial(classId),
    cloth: surfaceMaterial(profile.cloth,'cloth'), lining: surfaceMaterial(profile.lining,'cloth'), dark: surfaceMaterial('#25252b','cloth'),
    leather: surfaceMaterial('#3a2b24','leather'), gold: surfaceMaterial(profile.trim,'metal',{metalness:.65,roughness:.55}),
    ember: material(profile.magic, {emissive:profile.magic, emissiveIntensity:1.3}),
    wood: surfaceMaterial(classId==='wildkeeper'?'#a28559':'#695037','wood')
  };
  function joint(name, parent, x, y, z) {
    const bone = new THREE.Bone(); bone.name = name; bone.position.set(x,y,z);
    (parent || root).add(bone); bones.push(bone); joints[name] = bone; rest[name] = bone.position.clone(); return bone;
  }
  const hips = joint('Hips', null, 0,.94,0);
  const spine = joint('Spine', hips, 0,.22,0);
  const chest = joint('Chest', spine, 0,.22,0);
  const neck = joint('Neck', chest, 0,.16,0);
  const head = joint('Head', neck, 0,.11,0);
  for (const [side, sign] of [['L',1],['R',-1]]) {
    const arm = joint(`UpperArm${side}`, chest, sign*.245,.055,0);
    const fore = joint(`Forearm${side}`, arm, sign*.035,-.265,0);
    joint(`Hand${side}`, fore, 0,-.25,0);
    const thigh = joint(`Thigh${side}`, hips, sign*.112,-.045,0);
    const shin = joint(`Shin${side}`, thigh, 0,-.42,0);
    joint(`Foot${side}`, shin, 0,-.39,.025);
  }
  root.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(bones);
  const bindPositions = Object.fromEntries(bones.map(b => [b.name,b.getWorldPosition(new THREE.Vector3())]));
  function skinGeometry(geometry, weights, mat, name, bindMatrix) {
    const positions = geometry.getAttribute('position'); const indices = [], values = [];
    if(weights)for(let i=0;i<positions.count;i++) {
      const assignments = weights(new THREE.Vector3().fromBufferAttribute(positions,i));
      for(let j=0;j<4;j++) { indices.push(assignments[j] ? bones.indexOf(joints[assignments[j][0]]) : 0); values.push(assignments[j] ? assignments[j][1] : 0); }
    }
    if(weights){geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(indices,4));
    geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(values,4));}
    const mesh = new THREE.SkinnedMesh(geometry,mat); mesh.name=name; mesh.frustumCulled=false;
    root.add(mesh); mesh.bind(skeleton,bindMatrix); return mesh;
  }
  function rings(name, rows, mat, weight, segments=12) {
    const p=[], indices=[],uv=[];
    for(const [y,rx,rz,z=0] of rows)for(let j=0;j<=segments;j++) {
      const a=j/segments*TAU;p.push(Math.sin(a)*rx,y,Math.cos(a)*rz+z);uv.push(j/segments,(y-.85)*2);
    }
    for(let r=0;r<rows.length-1;r++)for(let j=0;j<segments;j++) {
      const a=r*(segments+1)+j,b=a+segments+1;indices.push(a,a+1,b,b,a+1,b+1);
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();
    return skinGeometry(g,weight,mat,name);
  }
  const torsoWeight = p => {
    if(p.y<1.16){const w=clamp((p.y-.95)/.21,0,1);return [['Hips',1-w],['Spine',w]];}
    const w=clamp((p.y-1.16)/.22,0,1);return [['Spine',1-w],['Chest',w]];
  };
  rings('Body',[[.88,.16,.11],[1.04,.14,.10],[1.17,.15,.105],[1.32,.215,.125],[1.43,.205,.105],[1.48,.075,.07]],materials.dark,torsoWeight);
  const armor = {
    light:rings('LightArmor',[[.97,.174,.13],[1.05,.158,.127],[1.18,.171,.133],[1.33,.231,.148],[1.43,.225,.125],[1.47,.094,.08]],surfaceMaterial(profile.cloth,'leather'),torsoWeight,20),
    mail:rings('MailArmor',[[.97,.18,.135],[1.06,.165,.134],[1.18,.181,.14],[1.33,.235,.15],[1.43,.23,.125],[1.47,.098,.085]],surfaceMaterial('#5e6467','mail'),torsoWeight,20),
    plate:rings('PlateArmor',[[.96,.175,.13],[1.05,.169,.13],[1.18,.178,.136],[1.31,.221,.151],[1.43,.22,.12],[1.48,.088,.08]],surfaceMaterial('#43484a','mail'),torsoWeight,20),
    mythic:rings('MythicArmor',[[.96,.175,.13],[1.05,.169,.13],[1.18,.178,.136],[1.31,.221,.151],[1.43,.22,.12],[1.48,.088,.08]],surfaceMaterial('#43484a','mail'),torsoWeight,20)
  };
  if(classId!=='vanguard')for(const family of ARMOR_FAMILIES){
    disposeMaterials([armor[family].material]);
    armor[family].material=surfaceMaterial(profile.cloth,['emberwitch','gravebinder'].includes(classId)?'cloth':'leather');
  }
  const fieldArmor=armor.light;
  ARMOR_FAMILIES.forEach((family,rank)=>paintGarment(armor[family],classId,rank,'torso'));
  const quiltedVest=skinGeometry(vestGeometry(classId),torsoWeight,paintedMaterial(classId,3),'QuiltedVest');
  function mesh(parent, geometry, mat, pos=[0,0,0], scale=[1,1,1], name='') {
    const m=new THREE.Mesh(geometry,mat);m.position.set(...pos);m.scale.set(...scale);m.name=name;parent.add(m);return m;
  }
  const ellipsoid=(parent,mat,pos,scale,name)=>mesh(parent,new THREE.SphereGeometry(1,12,8),mat,pos,scale,name);
  const box=(parent,mat,pos,size,name)=>mesh(parent,new THREE.BoxGeometry(...size),mat,pos,[1,1,1],name);
  function limb(start,end,r1,r2,mat,name) {
    const a=bindPositions[start],b=bindPositions[end],length=a.distanceTo(b);
    const g=new THREE.CylinderGeometry(r1,r2,length,10,5);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),a.clone().sub(b).normalize()));
    g.translate(...a.clone().add(b).multiplyScalar(.5).toArray());
    return skinGeometry(g,p=>{
      const t=clamp(p.clone().sub(a).dot(b.clone().sub(a))/(length*length),0,1);
      const w=clamp((t-.72)/.28,0,1)*.55;return [[start,1-w],[end,w]];
    },mat,name);
  }
  const bareHands=[],baseBoots=[],hairParts=[],shoulderPadding=[],baseArmorLimbs=[],baseCuffs=[];
  const bootLeather=bootMaterial(classId),hands=heroPanel(classId,6);
  for(const side of ['L','R']) {
    const sign=side==='L'?1:-1;
    baseArmorLimbs.push(limb(`UpperArm${side}`,`Forearm${side}`,.086,.064,materials.cloth,`Sleeve${side}`));
    baseArmorLimbs.push(limb(`Forearm${side}`,`Hand${side}`,.066,.042,materials.leather,`Bracer${side}`));
    bareHands.push(sculptHand(joints[`Hand${side}`],hands,side,true));
    baseArmorLimbs.push(limb(`Thigh${side}`,`Shin${side}`,.086,.062,materials.dark,`Leg${side}`));
    baseArmorLimbs.push(limb(`Shin${side}`,`Foot${side}`,.068,.047,materials.leather,`BootShaft${side}`));
    baseBoots.push(mesh(joints[`Foot${side}`],bootGeometry(),bootLeather,[0,0,0],[1,1,1],`Boot${side}`));
    shoulderPadding.push(ellipsoid(joints[`UpperArm${side}`],materials.cloth,[0,0,0],[.12,.09,.127]));
    baseCuffs.push(mesh(joints[`Forearm${side}`],new THREE.CylinderGeometry(.069,.069,.023,10),materials.gold,[0,-.07,0]));
  }
  const coat=createSplitCoat(hips,classId),coatPanels=coat.panels;
  // Belt, clasp, front seam and pendant follow the actual torso bones.
  const baseWaist=[mesh(hips,new THREE.CylinderGeometry(.171,.171,.065,14,1,true),materials.leather,[0,.079,0],[1,1,.78]),
    box(hips,materials.gold,[0,.08,.139],[.077,.05,.024])];
  const torsoTrims=[];
  for(let i=0;i<4;i++)torsoTrims.push(ellipsoid(spine,materials.gold,[0,-.016+i*.065,.15],[.017,.016,.008]));
  const pendant=mesh(chest,new THREE.OctahedronGeometry(.046),materials.ember,[0,.053,.143],[.65,1,.4]);
  mesh(neck,new THREE.CylinderGeometry(.056,.071,.142,16),materials.skin,[0,-.002,0]);
  const headStyle=new THREE.Group();headStyle.name='ClassHeadStyle';head.add(headStyle);
  sculptHead(head,classId,materials,hairParts,headStyle);
  if(classId==='emberwitch'){
    const circlet=mesh(headStyle,new THREE.TorusGeometry(.115,.012,5,18),materials.gold,[0,.12,.013]);circlet.rotation.x=Math.PI/2;
    mesh(headStyle,new THREE.OctahedronGeometry(.025),materials.ember,[0,.125,.127],[.7,1,.5]);
  }
  const mantle=createMantle(classId);chest.add(mantle.mesh);
  if(classId==='veilranger'){
    const quiver=new THREE.Group();quiver.name='Quiver';chest.add(quiver);
    quiver.position.set(-.121,-.095,-.233);quiver.rotation.z=-.40;
    mesh(quiver,new THREE.CylinderGeometry(.068,.041,.47,12),materials.leather);
    mesh(quiver,new THREE.CylinderGeometry(.073,.072,.028,12),materials.gold,[0,.218,0]);
    for(let i=0;i<4;i++){
      const x=(i-1.5)*.022,tip=.34+.027*Math.sin(i*2);
      rod(quiver,materials.wood,[x,.185,0],[x,tip+.035,0],.005);
      for(const s of [-1,1])mesh(quiver,tapered([[x,tip-.036,0],[x+s*.018,tip,.002],[x+s*.024,tip+.038,0]],[.002,.009,.001],5),materials.cloth);
    }
    combineStatic(quiver);
  }
  // Socket origin is inside the right palm, so weapons cannot drift from hands.
  const socket=new THREE.Group();socket.name='WeaponSocket';socket.position.set(0,-.045,.026);joints.HandR.add(socket);
  socket.rotation.x=1.1;
  const twoHandRig=new THREE.Group();twoHandRig.name='TwoHandWeaponRig';chest.add(twoHandRig);
  const palmOffset=new THREE.Vector3(0,-.045,.026),supportSocket=new THREE.Group();supportSocket.name='SupportSocket';supportSocket.position.copy(palmOffset);joints.HandL.add(supportSocket);
  const rightPalm=new THREE.Group();rightPalm.position.copy(palmOffset);joints.HandR.add(rightPalm);
  let equipment={},equipmentKey='',weapon=null,uniqueTorso=null,armorLimbs=null;
  const attachments=new Map();
  const spell=new THREE.Group();spell.name='ClassCastingFocus';joints.HandL.add(spell);spell.position.set(0,-.03,.13);spell.visible=false;
  const focusMaterial=new THREE.MeshBasicMaterial({color:profile.magic,transparent:true,opacity:.8,depthWrite:false});
  if(classId==='vanguard'){
    mesh(spell,new THREE.TorusGeometry(.11,.009,5,24),focusMaterial);mesh(spell,new THREE.OctahedronGeometry(.042),focusMaterial);
  }else if(classId==='emberwitch'){
    for(let i=0;i<3;i++){const flame=mesh(spell,new THREE.ConeGeometry(.033,.15-i*.025,6),focusMaterial,[(i-1)*.038,.035,0]);flame.rotation.z=(i-1)*-.25;}
  }else if(classId==='gravebinder'){
    mesh(spell,new THREE.TorusGeometry(.096,.005,4,24),focusMaterial).rotation.x=Math.PI/2;
    for(let i=0;i<3;i++)mesh(spell,new THREE.IcosahedronGeometry(.031,0),focusMaterial,[Math.sin(i*TAU/3)*.087,0,Math.cos(i*TAU/3)*.087],[.8,1.3,.8]);
  }else if(classId==='wildkeeper'){
    for(let i=0;i<5;i++){const leaf=mesh(spell,new THREE.SphereGeometry(.04,5,4),focusMaterial,[Math.sin(i*TAU/5)*.08,Math.cos(i*TAU/5)*.08,0],[.46,1.35,.2]);leaf.rotation.z=-i*TAU/5;}
  }else{
    for(let i=0;i<2;i++){const arc=mesh(spell,new THREE.TorusGeometry(.07+i*.034,.005,4,20,Math.PI*1.4),focusMaterial);arc.rotation.z=i*Math.PI;}
  }
  combineStatic(spell);
  const auraMaterial=new THREE.MeshBasicMaterial({color:'#ffa343',transparent:true,opacity:.18,depthWrite:false});
  const aura=mesh(joints.HandL,new THREE.IcosahedronGeometry(.13,1),auraMaterial,[0,-.03,.13]);aura.visible=false;

  const clips=STATES.map(state=>{
    const times=[...new Set([...Array.from({length:65},(_,i)=>i/64),.24,.5,.7,...['attack','cast','hit','death'].flatMap(s=>CLASS_ANIMATIONS[classId][s].map(k=>k[0]))])].sort((a,b)=>a-b),samples=times.map(u=>classPoseAt(classId,state,u)),tracks=[];
    for(const bone of bones) {
      const quats=[];for(const sample of samples){const e=sample.rotations[bone.name]||[0,0,0];quats.push(...new THREE.Quaternion().setFromEuler(new THREE.Euler(...e)).toArray());}
      tracks.push(new THREE.QuaternionKeyframeTrack(`${bone.name}.quaternion`,times,quats));
    }
    tracks.push(new THREE.VectorKeyframeTrack('Hips.position',times,samples.flatMap(p=>[p.offsetX,p.height,p.offsetZ])));
    return new THREE.AnimationClip(state,1,tracks);
  });
  // Evaluate the authored curves directly. Scrubbing backwards, revisiting a
  // completed death, or rendering eight views cannot leave a mixer action frozen.
  function animate(pose) {
    // Stowed gear is a presentation transform; restore it before every sample.
    for(const object of [weapon,...(attachments.get('off')?.objects||[])].filter(Boolean)){
      const home=object.userData.cinematicHome;
      if(home){home.parent.add(object);object.position.copy(home.position);object.quaternion.copy(home.rotation);}
    }
    const sample=sampleHumanoid(classId,pose,equipment),{name,time:t,phase,body,motion,feet}=sample;
    const airborne=name==='airborne',twoHand=!!equipment.main?.twoHand,category=equipment.main?.family.split('_')[0];
    applyBody(sample);
    function solveFeet(contacts,motion){
      const feet=motion.edgeRoll===undefined?contacts:contacts.map(foot=>{
        const rear=foot.id==='R',restYaw=rear?-.23:.12;
        const pivot=rear&&foot.contact?motion.heelTurn:0;
        const yaw=restYaw+.49*pivot,pitch=.38*pivot;
        // Turn the rear boot around its grounded toe while the hips rotate.
        const toe=.14,flat=toe*Math.cos(pitch);
        return {...foot,yaw,pitch:(foot.pitch||0)+pitch,
          x:foot.x+toe*Math.sin(restYaw)-flat*Math.sin(yaw),
          z:foot.z+toe*Math.cos(restYaw)-flat*Math.cos(yaw)};
      });
      // Lower the pelvis within leg reach before IK, rather than stretching knees
      // or dragging a planted foot when a stride passes beneath the character.
      for(const foot of feet){
        const pivot=thighOffset.copy(rest['Thigh'+foot.id]).applyQuaternion(hips.quaternion);
        const dx=foot.x-hips.position.x-pivot.x,dz=foot.z-hips.position.z-pivot.z;
        const reach=Math.sqrt(Math.max(0,.807*.807-dx*dx-dz*dz))-pivot.y+soleHeight(foot);
        hips.position.y=Math.min(hips.position.y,reach);
      }
      for(const foot of feet)solveLeg(foot.id,foot);
    }
    function applyBody(s){
      for(const bone of bones){bone.position.copy(rest[bone.name]);bone.rotation.set(...(s.body.rotations[bone.name]||[0,0,0]));}
      hips.position.set(s.body.offsetX,s.body.height,s.body.offsetZ);
      if(s.feet)solveFeet(s.feet,s.motion);
      if(s.from){
        const target=bones.map(b=>({position:b.position.clone(),quaternion:b.quaternion.clone()}));
        applyBody(s.from);
        bones.forEach((b,i)=>{b.position.lerp(target[i].position,s.blendWeight);b.quaternion.slerp(target[i].quaternion,s.blendWeight);});
        // Both grounded: retain today's world contacts after blending the torso.
        // Entering/leaving flight: blend the solved leg poses themselves.
        if(s.feet&&s.from.feet)solveFeet(s.feet,s.motion);
      }
    }
    if(motion.shield){const s=motion.shield,arm=joints.UpperArmL;arm.rotation.x=THREE.MathUtils.lerp(arm.rotation.x,s.upper[0],s.weight*.78);arm.rotation.z=THREE.MathUtils.lerp(arm.rotation.z,s.upper[2],s.weight*.78);joints.ForearmL.rotation.x=THREE.MathUtils.lerp(joints.ForearmL.rotation.x,s.fore,s.weight*.86);}
    socket.rotation.x=motion.socket;twoHandRig.position.set(...motion.position);
    const edged=motion.edgeRoll!==undefined;
    twoHandRig.rotation.set(...motion.rotation,edged?'YXZ':'XYZ');
    if(edged)twoHandRig.rotateY(motion.edgeRoll);
    for(let i=0;i<coatPanels.length;i++){
      const angle=i/8*TAU,leg=name==='walk'||name==='charge'?Math.sin(t*TAU+(Math.sin(angle)>0?0:Math.PI)):0;
      // Front and rear panels move away from the advancing knee. Long stoles
      // remain attached to the hips while the split cloth clears the legs.
      const kick=name==='kick'?smooth(t/.24)*(1-smooth((t-.7)/.3)):0;
      coatPanels[i].rotation.x=-(Math.max(0,leg*Math.cos(angle))*.32+Math.abs(Math.sin(t*TAU-angle-.55))*motion.cloth+kick*Math.max(0,Math.cos(angle))*.95);
      coatPanels[i].rotation.z=(pose.ex?.animation?.secondary||0)*Math.sin(angle)*.5;
    }
    spell.visible=aura.visible=motion.spell>.005;spell.rotation.y=t*TAU*(classId==='gravebinder'?1:2);
    spell.scale.setScalar(.45+motion.spell*.65);aura.scale.setScalar(.6+motion.spell*.65);auraMaterial.opacity=motion.spell*.18;
    const color=pose.ex?.castColor||profile.magic;materials.ember.emissive.set(color);auraMaterial.color.set(color);focusMaterial.color.set(color);focusMaterial.opacity=motion.spell*.8;
    root.updateMatrixWorld(true);
    if(twoHand&&motion.rootSpace){
      const location=new THREE.Vector3(...motion.position);
      location.x+=hips.position.x;location.z+=hips.position.z;
      location.y+=root.worldToLocal(chest.getWorldPosition(new THREE.Vector3())).y;
      if(motion.bowAim>0){
        // Register the drawn string to the near cheek on the posed head. Each
        // bow supplies its own string travel and nocking point.
        const ranged=weapon.userData.ranged,travel=ranged?.drawDistance??.30;
        const nock=new THREE.Vector3(...(ranged?.handRest||[0,0,-.08]));
        nock.z-=travel*(.55+.45*motion.handDraw);
        const cheek=root.worldToLocal(head.localToWorld(new THREE.Vector3(-.171,-.077,.107)));
        location.lerp(cheek.sub(nock.applyQuaternion(twoHandRig.quaternion)),motion.bowAim);
      }
      twoHandRig.position.lerp(chest.worldToLocal(root.localToWorld(location)),motion.rootWeight);
      twoHandRig.quaternion.slerp(relativeQuaternion(chest).invert().multiply(twoHandRig.quaternion),motion.rootWeight);
      root.updateMatrixWorld(true);
    }
    const settling=name==='dead'?1:name==='death'?smooth((t-.28)/.72):0;
    const secondary=pose.ex?.animation?.secondary||0,falling=name==='death'||name==='dead';
    for(let i=0;i<sample.drape.length;i++)mantle.mesh.morphTargetInfluences[i]=sample.drape[i];
    bareHands[0].children[0].morphTargetInfluences[0]=motion.palmL;
    bareHands[1].children[0].morphTargetInfluences[0]=motion.palmR;
    hairParts.forEach((part,i)=>{part.rotation.z=falling?0:secondary*.10+Math.sin(t*TAU-.6+i*.3)*motion.cloth*.035;});
    if(settling){
      const yaw={vanguard:.22,emberwitch:.65,gravebinder:-.12,wildkeeper:-.58,veilranger:.35}[classId];
      const flat=new THREE.Quaternion().setFromEuler(category==='bow'?new THREE.Euler(0,yaw,Math.PI/2):category==='crossbow'?new THREE.Euler(0,yaw,0):new THREE.Euler(Math.PI/2,yaw,0));
      if(twoHand){
        const q=relativeQuaternion(chest).invert().multiply(flat);twoHandRig.quaternion.slerp(q,settling);
        const middle=new THREE.Vector3(...weapon.userData.support);if(category==='bow')middle.z-=.08;
        middle.multiplyScalar(.5).applyQuaternion(twoHandRig.quaternion);
        twoHandRig.position.lerp(new THREE.Vector3(0,-.15,.12).sub(middle),settling);
      }
      else if(weapon){const q=relativeQuaternion(joints.ForearmR).invert().multiply(flat).multiply(socket.quaternion.clone().invert());joints.HandR.quaternion.slerp(q,settling);}
      if(equipment.off){const shield=attachments.get('off').objects[0],q=relativeQuaternion(joints.ForearmL).invert().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI/2,yaw,0))).multiply(shield.quaternion.clone().invert());joints.HandL.quaternion.slerp(q,settling);}
      root.updateMatrixWorld(true);
    }
    if(twoHand&&weapon){
      if(!motion.rootSpace&&(category==='bow'||category==='crossbow')&&motion.power>0){
        const aim=relativeQuaternion(chest).invert().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0,0,motion.rotation[2])));
        twoHandRig.quaternion.slerp(aim,motion.power);root.updateMatrixWorld(true);
      }
      let right=new THREE.Vector3(...weapon.userData.primary),left=new THREE.Vector3(...weapon.userData.support);
      if(category==='bow'){
        const ranged=weapon.userData.ranged,rest=ranged?.handRest||[0,0,-.08],travel=ranged?.drawDistance??.30;
        right.set(rest[0]-.040*motion.bowFollow,rest[1]-.120*motion.bowFollow,rest[2]-motion.handDraw*travel);weapon.userData.primary=right.toArray();
        const line=weapon.userData.string;line.geometry.attributes.position.setZ(1,(ranged?.stringRest??-.08)-motion.draw*travel);line.geometry.attributes.position.needsUpdate=true;
        if(!weapon.userData.flexRig)for(const limb of weapon.userData.bowLimbs){const sign=limb.userData.side;limb.rotation.x=-sign*(limb.userData.flex??.11)*motion.draw;const tip=new THREE.Vector3(...(limb.userData.tip||[0,sign*.53,-.27])).applyEuler(limb.rotation).add(limb.position);line.geometry.attributes.position.setXYZ(sign<0?0:2,...tip.toArray());}
        weapon.userData.arrow.visible=motion.arrow;weapon.userData.arrow.position.z=-motion.draw*travel;
      }else if(category==='crossbow'){
        const ranged=weapon.userData.ranged,rest=ranged?.handRest||[0,-.07,-.065],travel=ranged?.drawDistance??.17;
        weapon.userData.string.geometry.attributes.position.setZ(1,(ranged?.stringRest??.19)-motion.draw*travel);weapon.userData.string.geometry.attributes.position.needsUpdate=true;
        weapon.userData.arrow.visible=motion.arrow;
        right.set(rest[0]+(ranged?.reloadSide??.032)*motion.reload,rest[1]+(ranged?.reloadLift??.125)*motion.reload,rest[2]+((ranged?.reloadAdvance??.255)-motion.draw*travel)*motion.reload);
        weapon.userData.primary=right.toArray();
      }
      if(weapon.userData.flexRig)poseUniqueFlex(weapon,motion.draw,name==='attack'||name==='release'?phase:0);
      const q=relativeQuaternion(weapon);
      const grip=(side)=>q.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(...(motion['grip'+side]||[0,0,0]))));
      const rightGrip=grip('R'),leftGrip=grip('L');
      if(edged){
        alignHiltHand('R',right,rightGrip,q,motion.poleR);
        alignHiltHand('L',left,leftGrip,q,motion.poleL);
      }
      if(motion.rootSpace){
        // Keep both wrists inside the physical arm reach, including transitions
        // into a fall. Translate the shared weapon, never stretch either arm.
        const origin=root.worldToLocal(weapon.getWorldPosition(new THREE.Vector3())),start=origin.clone();
        const limits=[['R',right,rightGrip],['L',left,leftGrip]].map(([side,point,orientation])=>({
          center:root.worldToLocal(joints['UpperArm'+side].getWorldPosition(new THREE.Vector3())).add(palmOffset.clone().applyQuaternion(orientation)).sub(point.clone().applyQuaternion(q)),
          radius:rest['Forearm'+side].length()+rest['Hand'+side].length()-.004
        }));
        for(let i=0;i<8;i++){let changed=false;for(const {center,radius} of limits){const delta=origin.clone().sub(center),distance=delta.length();if(distance>radius){origin.addScaledVector(delta,(radius-distance)/distance);changed=true;}}if(!changed)break;}
        if(origin.distanceToSquared(start)>1e-14){twoHandRig.position.copy(chest.worldToLocal(root.localToWorld(origin)));twoHandRig.updateWorldMatrix(false,true);}
      }
      solveArm('R',root.worldToLocal(weapon.localToWorld(right)),rightGrip,motion.poleR,category==='bow');
      solveArm('L',root.worldToLocal(weapon.localToWorld(left)),leftGrip,motion.poleL,category==='bow');
      root.updateMatrixWorld(true);
    }
    const film=pose.ex?.cinematic;
    if(film&&sample.cinematic?.stow){
      for(const object of [weapon,...(attachments.get('off')?.objects||[])].filter(Boolean)){
        object.userData.cinematicHome||={parent:object.parent,position:object.position.clone(),rotation:object.quaternion.clone()};
        chest.add(object);object.position.set(object===weapon ? .13 : -.16,.04,-.19);object.rotation.set(.15,0,object===weapon?-.55:.25);
      }
      root.updateMatrixWorld(true);
      if(film.hand){
        const pixels=44,target=new THREE.Vector3((film.hand.x-film.hand.y)*32/pixels,film.hand.lift/(Math.sqrt(3)/2*pixels),(film.hand.x+film.hand.y)*32/pixels);
        solveArm('R',root.worldToLocal(target),new THREE.Quaternion(),[-1,-.1,-.4]);
      }
      if(['examine','offer','ward'].includes(film.clip))solveArm('L',new THREE.Vector3(-.20,1.06,.38),new THREE.Quaternion(),[1,-.2,-.3]);
    }
    // Pauldrons hinge over the sleeve instead of swinging through the head.
    for(const object of attachments.get('chest')?.objects||[])object.traverse(part=>{if(part.userData.armorPauldron)part.quaternion.copy(object.parent.quaternion).invert().slerp(neutralRotation,.32);});
    root.updateMatrixWorld(true);
    if(!airborne)groundPose(name);
  }
  function soleHeight(foot){return .084+Math.abs(Math.sin(foot.pitch||0))*.12+(foot.y||0);}
  const thighOffset=new THREE.Vector3(),legTarget=new THREE.Vector3(),legDirection=new THREE.Vector3(),kneeBend=new THREE.Vector3(),kneePoint=new THREE.Vector3();
  const legInverse=new THREE.Quaternion(),legChain=new THREE.Quaternion(),footRotation=new THREE.Quaternion(),footEuler=new THREE.Euler();
  const down=new THREE.Vector3(0,-1,0);
  function solveLeg(side,foot){
    const thigh=joints['Thigh'+side],shin=joints['Shin'+side],ankle=joints['Foot'+side];
    legInverse.copy(hips.quaternion).invert();
    legTarget.set(foot.x,soleHeight(foot),foot.z).sub(hips.position).applyQuaternion(legInverse).sub(thigh.position);
    const l1=.42,l2=rest['Foot'+side].length(),distance=clamp(legTarget.length(),.1,l1+l2-.00001);
    legDirection.copy(legTarget).normalize();kneeBend.set(0,0,1).addScaledVector(legDirection,-legDirection.z).normalize();
    const along=(l1*l1-l2*l2+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,l1*l1-along*along));
    kneePoint.copy(legDirection).multiplyScalar(along).addScaledVector(kneeBend,height);
    thigh.quaternion.setFromUnitVectors(down,legDirection.copy(kneePoint).normalize());
    legInverse.copy(thigh.quaternion).invert();legDirection.copy(legTarget).sub(kneePoint).applyQuaternion(legInverse).normalize();
    shin.quaternion.setFromUnitVectors(rest['Foot'+side].clone().normalize(),legDirection);
    legChain.copy(hips.quaternion).multiply(thigh.quaternion).multiply(shin.quaternion).invert();
    footRotation.setFromEuler(footEuler.set(foot.pitch||0,foot.yaw||0,0,'YXZ'));ankle.quaternion.copy(legChain).multiply(footRotation);
  }
  // Keep the sole on the foot and the tall cuff on the shin. Use the original
  // bind pose even when the player equips boots in the middle of a stride.
  const bootParts=new WeakMap();
  function fitBoot(boot,side){
    const foot=joints['Foot'+side],shin=joints['Shin'+side],footIndex=bones.indexOf(foot),shinIndex=bones.indexOf(shin);
    const ankleBind=new THREE.Matrix4().setPosition(bindPositions[foot.name]),vertex=new THREE.Vector3(),pieces=[];
    boot.updateMatrixWorld(true);boot.traverse(o=>{if(o.isMesh)pieces.push(o);});
    for(const part of pieces){
      const g=part.geometry,positions=g.attributes.position;
      const indices=new Uint16Array(positions.count*4),weights=new Float32Array(positions.count*4);
      let hasCuff=false;
      for(let i=0;i<positions.count;i++){
        vertex.fromBufferAttribute(positions,i).applyMatrix4(part.matrixWorld);
        const bend=smooth((vertex.y-.035-.40*Math.max(0,vertex.z-.015))/.075);
        indices[i*4]=footIndex;indices[i*4+1]=shinIndex;
        weights[i*4]=1-bend;weights[i*4+1]=bend;if(bend>0)hasCuff=true;
      }
      if(!hasCuff)continue;
      g.setAttribute('skinIndex',new THREE.BufferAttribute(indices,4));g.setAttribute('skinWeight',new THREE.BufferAttribute(weights,4));
      const fitted=new THREE.SkinnedMesh(g,part.material);
      fitted.name=part.name;fitted.userData=part.userData;fitted.frustumCulled=false;
      fitted.position.copy(part.position);fitted.quaternion.copy(part.quaternion);fitted.scale.copy(part.scale);
      const bind=ankleBind.clone().multiply(part.matrixWorld);
      fitted.bind(skeleton,bind);bootParts.set(fitted,{shin,fromBind:skeleton.boneInverses[shinIndex].clone().multiply(bind)});
      const parent=part.parent,index=parent.children.indexOf(part);
      part.removeFromParent();parent.add(fitted);
      // Retain the authored ordering of the boot's material batches.
      parent.children.pop();parent.children.splice(index,0,fitted);
    }
  }
  const floorMatrix=new THREE.Matrix4(),shinFloor=new THREE.Matrix4(),inverseRoot=new THREE.Matrix4(),floorVertex=new THREE.Vector3(),neutralRotation=new THREE.Quaternion();
  function lowestBoxY(e,b){
    return e[1]*(e[1]<0?b.max.x:b.min.x)+e[5]*(e[5]<0?b.max.y:b.min.y)+e[9]*(e[9]<0?b.max.z:b.min.z)+e[13];
  }
  function groundPose(name){
    const falling=name==='death'||name==='dead';let low=Infinity;
    inverseRoot.copy(root.matrixWorld).invert();
    function measure(o){
      if(!o.isMesh||o===spell||o===aura||!o.geometry.attributes.position)return;
      floorMatrix.multiplyMatrices(inverseRoot,o.matrixWorld);const e=floorMatrix.elements,position=o.geometry.attributes.position;
      const boot=bootParts.get(o);
      if(boot||!o.isSkinnedMesh&&!o.morphTargetInfluences){
        if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();const b=o.geometry.boundingBox;
        if(boot){
          // A two-bone blend is bounded by its endpoint transforms. The same
          // weights used by the GPU give exact floor contact, even in a fall.
          const s=shinFloor.multiplyMatrices(inverseRoot,boot.shin.matrixWorld).multiply(boot.fromBind).elements;
          if(Math.min(lowestBoxY(e,b),lowestBoxY(s,b))>=low)return;
          const weights=o.geometry.attributes.skinWeight;
          for(let i=0;i<position.count;i++){
            const x=position.getX(i),y=position.getY(i),z=position.getZ(i);
            const sole=e[1]*x+e[5]*y+e[9]*z+e[13],cuff=s[1]*x+s[5]*y+s[9]*z+s[13];
            low=Math.min(low,sole+(cuff-sole)*weights.getY(i));
          }
        }else{
          if(lowestBoxY(e,b)>=low)return;
          for(let i=0;i<position.count;i++)low=Math.min(low,e[1]*position.getX(i)+e[5]*position.getY(i)+e[9]*position.getZ(i)+e[13]);
        }
      }else{
        for(let i=0;i<position.count;i++){o.getVertexPosition(i,floorVertex);low=Math.min(low,floorVertex.applyMatrix4(floorMatrix).y);}
      }
    }
    if(falling)root.traverseVisible(measure);
    else{
      baseBoots.filter(o=>o.visible).forEach(measure);
      attachments.get('boots')?.objects.forEach(o=>o.traverseVisible(measure));
    }
    if(Number.isFinite(low)){hips.position.y+=.006-low;root.updateMatrixWorld(true);}
  }
  function relativeQuaternion(object){return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().copy(root.matrixWorld).invert().multiply(object.matrixWorld));}
  function elbowPosition(side,shoulder,target,pole){
    const l1=rest[`Forearm${side}`].length(),l2=rest[`Hand${side}`].length(),delta=target.clone().sub(shoulder);
    const distance=clamp(delta.length(),.001,l1+l2-.00001),direction=delta.normalize();
    const bend=pole.clone().addScaledVector(direction,-pole.dot(direction)).normalize();
    const along=(l1*l1-l2*l2+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,l1*l1-along*along));
    return shoulder.clone().addScaledVector(direction,along).addScaledVector(bend,height);
  }
  function alignHiltHand(side,localGrip,rotation,weaponRotation,poleDirection){
    const palm=root.worldToLocal(weapon.localToWorld(localGrip.clone()));
    const shoulder=root.worldToLocal(joints['UpperArm'+side].getWorldPosition(new THREE.Vector3()));
    const pole=new THREE.Vector3(...poleDirection).applyQuaternion(relativeQuaternion(chest));
    const shaft=new THREE.Vector3(0,side==='R'?1:-1,0).applyQuaternion(weaponRotation);
    // Let each closed hand turn around the hilt with its forearm. Two short
    // iterations also account for the offset from the wrist to the palm.
    for(let i=0;i<2;i++){
      const wrist=palm.clone().sub(palmOffset.clone().applyQuaternion(rotation));
      const up=elbowPosition(side,shoulder,wrist,pole).sub(wrist).normalize();
      up.addScaledVector(shaft,-.25*up.dot(shaft)).normalize();
      const across=pole.clone().cross(wrist.clone().sub(shoulder)).projectOnPlane(up).normalize();
      const normal=across.clone().cross(up);
      // A nearly end-on handle has no reliable projected twist. The elbow
      // plane supplies a continuous rest frame through that part of the cut.
      const twist=1.45*Math.atan2(normal.dot(shaft),1.25+across.dot(shaft));
      across.multiplyScalar(Math.cos(twist)).addScaledVector(normal,Math.sin(twist));
      rotation.setFromRotationMatrix(new THREE.Matrix4().makeBasis(across,up,normal.crossVectors(across,up)));
    }
  }
  function solveArm(side,gripTarget,rotation,poleDirection,facingSpace=false){
    const upper=joints[`UpperArm${side}`],fore=joints[`Forearm${side}`],hand=joints[`Hand${side}`];
    const target=gripTarget.clone().sub(palmOffset.clone().applyQuaternion(rotation));
    const shoulder=root.worldToLocal(upper.getWorldPosition(new THREE.Vector3()));
    const pole=new THREE.Vector3(...(poleDirection||[side==='L'?1:-1,-.35,-.25]));
    if(!facingSpace)pole.applyQuaternion(relativeQuaternion(chest));
    const elbow=elbowPosition(side,shoulder,target,pole);
    const localElbow=upper.parent.worldToLocal(root.localToWorld(elbow));
    upper.quaternion.setFromUnitVectors(rest[`Forearm${side}`].clone().normalize(),localElbow.sub(upper.position).normalize());upper.updateWorldMatrix(false,true);
    const localTarget=fore.parent.worldToLocal(root.localToWorld(target));
    fore.quaternion.setFromUnitVectors(rest[`Hand${side}`].clone().normalize(),localTarget.sub(fore.position).normalize());fore.updateWorldMatrix(false,true);
    hand.quaternion.copy(relativeQuaternion(fore).invert().multiply(rotation));hand.updateWorldMatrix(false,true);
  }
  function equip(next={}) {
    if(next===equipment)return;
    const key=JSON.stringify(next);if(key===equipmentKey)return;equipmentKey=key;equipment=next;
    const bespokeChest=!!next.chest?.modelId;
    const starter=isStarterVest(next.chest);
    fieldArmor.visible=quiltedVest.visible=false;
    armor.light=starter?quiltedVest:fieldArmor;
    if(armorLimbs?.userData.itemKey!==next.chest?.key&&armorLimbs){disposeObject(armorLimbs);armorLimbs=null;}
    if(uniqueTorso?.userData.itemKey!==next.chest?.key){
      if(uniqueTorso){disposeObject(uniqueTorso);uniqueTorso=null;}
      // Equipment geometry is authored in the original body rest pose. Passing
      // its bind matrix preserves the shared skeleton's inverses during swaps.
      if(bespokeChest){uniqueTorso=skinGeometry(uniqueTorsoGeometry(next.chest),torsoWeight,uniqueTorsoMaterial(next.chest),next.chest.name,new THREE.Matrix4());uniqueTorso.userData.itemKey=next.chest.key;uniqueTorso.userData.modelId=next.chest.modelId;}
    }
    for(const family of ARMOR_FAMILIES)armor[family].visible=!bespokeChest&&next.chest?.family===family;
    const rank=armorRank(next.chest);
    mantle.fit(rank,bespokeChest);
    if(next.chest&&!bespokeChest&&!starter){const chosen=armor[next.chest.family],p=next.chest.material;chosen.material.color.set(next.chest.family==='light'?p.cloth:p.metal);
      if(classId!=='vanguard')chosen.material.color.set(armorPalette(next.chest,classId).cloth);
      else if(next.chest.family==='light')chosen.material.color.lerp(new THREE.Color(profile.cloth),.55);
      else chosen.material.color.multiplyScalar(.75);
    }
    const heavy=['plate','mythic'].includes(next.chest?.family);
    setHemRank(coat.material,classId,rank);
    const palette=next.chest&&!bespokeChest&&!starter&&classId!=='vanguard'?armorPalette(next.chest,classId):null;
    const dye=new THREE.Color();
    coatPanels.forEach((p,i)=>{
      if(bespokeChest){p.visible=false;return;}
      p.scale.set(1,1,1);
      if(classId==='vanguard'){p.scale.y=profile.coat*(heavy?.64:next.chest?.family==='mail'?.85:1);p.visible=!heavy||(i>=2&&i<=6);}
      else {
        const length={emberwitch:[.68,1.05,1.28,1.5],gravebinder:[.8,1.1,1.32,1.48],wildkeeper:[.45,.66,.8,.9],veilranger:[.3,.48,.76,1]};
        const contrast=rank>=1&&(i===1||i===7||classId==='veilranger'&&(i===3||i===5));
        p.scale.y=next.chest?length[classId][rank]*(classId==='veilranger'&&(i===1||i===7)?.65:1):profile.coat;
        p.scale.x=next.chest?1+rank*(classId==='emberwitch'?.09:.035):1;p.visible=classId!=='veilranger'||i!==0;
        dye.set(0xffffff);
        if(palette)dye.lerp(new THREE.Color(contrast?palette.contrast:palette.cloth),.32);
        coat.tint(i,dye);
        if(starter)p.scale.y={emberwitch:1.37,gravebinder:1.18,wildkeeper:.71,veilranger:.67}[classId];
      }
      if(!p.visible)p.scale.setScalar(0);
    });
    coat.fit();
    torsoTrims.forEach(p=>p.visible=!next.chest);pendant.visible=!next.chest&&!next.amulet;
    headStyle.visible=!next.head;
    bareHands.forEach(p=>p.visible=!next.gloves);baseBoots.forEach(p=>p.visible=!next.boots);
    baseCuffs.forEach(p=>p.visible=!next.gloves);baseWaist.forEach(p=>p.visible=!next.belt);
    shoulderPadding.forEach(p=>p.visible=!next.chest);
    baseArmorLimbs.forEach(p=>p.visible=!next.chest);
    for(const slot of ['chest','main','off','head','gloves','boots','belt','ring1','ring2','amulet']){
      const item=next[slot],installed=attachments.get(slot);
      if(installed?.key===item?.key)continue;
      if(installed){installed.objects.forEach(disposeObject);attachments.delete(slot);}
      if(slot==='main')weapon=null;if(!item)continue;
      const objects=[];
      if(slot==='chest'){
        const limbs=createArmorLimbs(item,classId,bindPositions,bones.map(b=>b.name));
        armorLimbs=skinGeometry(limbs.shell.geometry,null,limbs.shell.material,limbs.shell.name,new THREE.Matrix4());armorLimbs.userData={...limbs.shell.userData};
        for(const [joint,object] of Object.entries(createArmorDetails(item,classId,limbs.parts))){joints[joint].add(object);objects.push(object);}
      }
      else if(slot==='main'){weapon=createWeapon(item);(item.twoHand?twoHandRig:socket).add(weapon);objects.push(weapon);}
      else {
        const parents=slot==='head'?[head]:slot==='off'?[joints.HandL]:slot==='gloves'?[joints.HandL,joints.HandR]:
          slot==='boots'?[joints.FootL,joints.FootR]:slot==='belt'?[hips]:slot==='amulet'?[chest]:[slot==='ring1'?joints.HandL:joints.HandR];
        for(const parent of parents){
          const side=parent.name.endsWith('R')?'R':'L',object=createWearable(item,classId,side);
          if(slot==='boots')fitBoot(object,side);
          parent.add(object);objects.push(object);
          if(slot==='off'){object.position.set(...(object.userData.attachment?.position||[.075,-.07,.03]));object.rotation.set(...(object.userData.attachment?.rotation||[1.05,0,0]));}
        }
      }
      attachments.set(slot,{key:item.key,objects});
    }
    for(const object of attachments.get('chest')?.objects||[])if(object.userData.armorOverlapSlot)object.visible=!next[object.userData.armorOverlapSlot];
    updateArmorLimbCoverage(armorLimbs,next);
    root.updateMatrixWorld(true);
    const hooded=classId==='gravebinder'||classId==='veilranger';
    let hair=hooded?'':'Hair';
    if(next.head){
      if(next.head.modelId)hair=attachments.get('head')?.objects[0]?.userData.openHelmet?'Hair':'';
      else if(classId==='wildkeeper'||classId==='vanguard'&&armorRank(next.head)<2)hair='HairAtNape';
      else hair=classId==='emberwitch'?'Hair':'';
    }
    hairParts.forEach(part=>part.visible=part.name===hair);
  }
  root.scale.set(profile.width,profile.height,profile.width);
  equip();animate({state:'idle',t:0});
  function dispose(){skeleton.dispose();coat.skeleton.dispose();const geometries=new Set(),mats=new Set();root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)mats.add(o.material);});geometries.forEach(g=>g.dispose());disposeMaterials(mats);}
  return {root,classId,bones,joints,skeleton,socket,supportSocket,rightPalm,armor,clips,animate,equip,dispose,rest,attachments,get weapon(){return weapon;},get uniqueTorso(){return uniqueTorso;},get armorLimbs(){return armorLimbs;}};
}

// Game angles describe screen vectors; undo the 2:1 ground foreshortening.
export function facingYaw(screenAngle) { return Math.atan2(Math.cos(screenAngle),Math.sin(screenAngle)*2); }

// Convert the animated weapon socket to tile offsets and screen-pixel height.
// The gameplay camera looks down 30 degrees; actor drawing uses 40 px/unit.
export function weaponProjectileOrigin(model,scale=1) {
  const weapon=model.weapon,point=weapon?.userData.projectileSocket;
  if(!point)return null;
  const world=weapon.localToWorld(new THREE.Vector3(...point)),pixels=40*scale;
  return {x:(world.x+world.z)*pixels/64,y:(world.z-world.x)*pixels/64,lift:world.y*Math.sqrt(3)/2*pixels};
}

export function createCharacterRenderer({size=384,classId='emberwitch',presentation=false,cinematic=false}={}) {
  const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:false,powerPreference:'low-power'});
  renderer.setPixelRatio(1);renderer.setSize(size,size,false);renderer.setClearColor(0x000000,0);
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.13;
  const scene=new THREE.Scene(), span=presentation?3.8:5;
  const camera=new THREE.OrthographicCamera(-span/2,span/2,span/2,-span/2,.01,30);
  const target=new THREE.Vector3(0,presentation?1:.83,0);
  camera.position.set(0,target.y+(presentation?1.8:5),presentation?10:Math.sqrt(75));camera.lookAt(target);
  const ambient=new THREE.HemisphereLight('#d5e0ed','#675649',cinematic?1.05:1.38);scene.add(ambient);
  const key=new THREE.DirectionalLight('#ffe5c9',3.1);key.position.set(-3.5,4,4);scene.add(key);
  const rim=new THREE.DirectionalLight('#b9d6eb',2.0);rim.position.set(2.6,3,-4);scene.add(rim);
  if(cinematic){const fill=new THREE.DirectionalLight('#cbd5e0',.7);fill.position.set(4,3,5);scene.add(fill);key.position.set(-3,5,2);}
  const filmLight=cinematic?new THREE.PointLight('#ffdda3',0,8,1):null;if(filmLight)scene.add(filmLight);
  // The selection portrait has a physical floor, visible from its lower camera.
  // The world renderer retains its existing terrain and foot anchor.
  let pedestal=null;
  if(presentation){
    pedestal=new THREE.Group();
    const stone=new THREE.MeshStandardMaterial({color:'#252d32',roughness:.92,metalness:.15});
    const brass=new THREE.MeshStandardMaterial({color:'#796747',roughness:.52,metalness:.7});
    const base=new THREE.Mesh(new THREE.CylinderGeometry(.97,1.05,.13,64),stone);base.position.y=-.075;pedestal.add(base);
    for(const radius of [.82,.95]){const ring=new THREE.Mesh(new THREE.TorusGeometry(radius,.009,5,64),brass);ring.rotation.x=Math.PI/2;ring.position.y=-.007;pedestal.add(ring);}
    for(let i=0;i<16;i++){const mark=new THREE.Mesh(new THREE.BoxGeometry(.012,.008,.045),brass);const a=i*Math.PI/8;mark.position.set(Math.sin(a)*.887,-.005,Math.cos(a)*.887);mark.rotation.y=a;pedestal.add(mark);}
    scene.add(pedestal);
  }
  // Broad reflected light distinguishes forged steel from painted plastic.
  // This tiny studio environment is generated locally and stays off-camera.
  const studio=new THREE.Scene();
  const room=new THREE.Mesh(new THREE.BoxGeometry(12,10,12),new THREE.MeshBasicMaterial({color:'#596269',side:THREE.BackSide}));studio.add(room);
  for(const [position,dimensions,color] of [
    [[-4,2,2],[.1,5,3],new THREE.Color(2.3,2.05,1.7)],
    [[4,1,-3],[.1,4,2],new THREE.Color(1.1,1.5,1.9)],
    [[0,4,0],[4,.1,3],new THREE.Color(1.1,1.15,1.2)]
  ]){const card=new THREE.Mesh(new THREE.BoxGeometry(...dimensions),new THREE.MeshBasicMaterial({color}));card.position.set(...position);studio.add(card);}
  let pmrem=new THREE.PMREMGenerator(renderer);
  let environment=pmrem.fromScene(studio,.06,.1,20,{size:128});
  scene.environment=environment.texture;scene.environmentIntensity=.64;
  const regionByTheme={snowwild:'north',icecave:'north',mine:'mine',temple:'mine',marsh:'marsh',drowned:'marsh',crypt:'marsh',vigil:'marsh',
    desert:'sand',tombs:'sand',palace:'sand',cathedral:'cathedral',hellwild:'cinder',bastion:'cinder',throne:'cinder'};
  const lightPalettes={
    north:['#daecff','#667186','#ffead4','#c1dbff'],mine:['#bdcbd6','#4a3730','#ffc080','#93c9de'],
    marsh:['#c7d6be','#394c40','#f2dab1','#a0c8bd'],sand:['#f5dcb2','#79604b','#ffe3b7','#b9c2e1'],
    cathedral:['#d7d4e7','#4e455c','#ebd6bc','#b6b4ec'],cinder:['#dabeb5','#52333c','#ffbc86','#c3a0af'],
    default:['#d5e0ed','#675649','#ffe5c9','#b9d6eb']
  };
  let regionKey=null;
  function setRegion(zone){
    if(presentation)return;
    const region=regionByTheme[zone?.theme]||'default';
    if(regionKey===region)return;regionKey=region;
    const [sky,ground,sun,edge]=lightPalettes[region];
    ambient.color.set(sky);ambient.groundColor.set(ground);key.color.set(sun);rim.color.set(edge);
    key.intensity=cinematic?3.45:2.75;rim.intensity=cinematic?1.85:1.55;
  }
  const models=new Map(),baseScales=new WeakMap();let model=null;
  function refineFilmGeometry(body){
    // Subdivide the remaining spherical ornaments for the close camera.
    body.root.traverse(o=>{const g=o.geometry;
      if(!o.isMesh||o.isSkinnedMesh||g.type!=='SphereGeometry'||g.parameters.widthSegments>=24)return;
      const p=g.parameters;o.geometry=new THREE.SphereGeometry(p.radius,24,16,p.phiStart,p.phiLength,p.thetaStart,p.thetaLength);g.dispose();
    });
  }
  function setClass(id,form=null){const key=form||id;if(!models.has(key)){const next=form?createWildshape(form):createCharacter(id);if(cinematic)refineFilmGeometry(next);models.set(key,next);baseScales.set(next,next.root.scale.clone());scene.add(next.root);}if(model)model.root.visible=false;model=models.get(key);model.root.visible=true;}
  setClass(classId);
  camera.updateMatrixWorld(true);
  const origin=new THREE.Vector3(0,0,0).project(camera);
  const anchor={x:(origin.x+1)*size/2,y:(1-origin.y)*size/2};
  let lost=false;const onLost=e=>{e.preventDefault();lost=true;};const onRestored=()=>{
    environment.dispose();pmrem.dispose();pmrem=new THREE.PMREMGenerator(renderer);environment=pmrem.fromScene(studio,.06,.1,20,{size:128});scene.environment=environment.texture;lost=false;
  };
  renderer.domElement.addEventListener('webglcontextlost',onLost);renderer.domElement.addEventListener('webglcontextrestored',onRestored);
  function prepare(pose,equipment,id=classId,form=null) {
    if(lost)throw new Error('The 3D character graphics context was lost. Reload the page to retry.');
    if(model.classId!==id||(model.formId||null)!==form)setClass(id,form);
    model.root.scale.copy(baseScales.get(model));
    model.root.rotation.y=facingYaw(pose.ang||0);model.equip(equipment);model.animate(pose);
    if(pose.ex?.shiftBody)applyShiftPose(model,pose.ex.shiftBody.amount,pose.ex.shiftBody.entering);
  }
  function projectileOrigin(pose,equipment,{scale=1,classId:id=classId,form=null}={}) {
    prepare(pose,equipment,id,form);
    return weaponProjectileOrigin(model,scale);
  }
  function effectAnchors(pose,equipment,{scale=1,classId:id=classId,form=null}={}) {
    prepare(pose,equipment,id,form);
    const project=(object,local=[0,0,0])=>{
      if(!object)return null;
      const v=object.localToWorld(new THREE.Vector3(...local)),pixels=40*scale;
      return {x:(v.x+v.z)*pixels/64,y:(v.z-v.x)*pixels/64,lift:v.y*Math.sqrt(3)/2*pixels};
    };
    const hand=model.formId&&model.joints?.Forearm1?project(model.joints.Forearm1,[0,-.36,.075]):project(model.rightPalm||model.joints?.HandR||model.joints?.['Paw1:0']);
    const cat=model.weapon?.userData.category,two=equipment.main?.twoHand;
    const tip={sword:two?1.11:.82,dagger:.44,axe:two?.9:.54,mace:two?.84:.6,spear:1.52,staff:1.17,wand:.5}[cat]||.5;
    return {hand,leftHand:project(model.joints?.HandL||model.joints?.['Paw-1:0']),head:project(model.joints?.Head),weapon:project(model.weapon,model.weapon?.userData.projectileSocket||[0,tip,0])||hand};
  }
  function render(pose,equipment,id=classId,form=null) {
    if(filmLight){const light=pose.ex?.cinematic?.light;filmLight.intensity=light?.intensity||0;if(light)filmLight.position.set((light.x-light.y)*32/44,light.lift/(Math.sqrt(3)/2*44),(light.x+light.y)*32/44);}
    prepare(pose,equipment,id,form);renderer.render(scene,camera);
    return renderer.domElement;
  }
  function presentationBounds() {
    // This is only requested by menu previews after rendering. Ignore hidden gear
    // and effects, and include the pedestal when fitting the portrait rectangle.
    const box=new THREE.Box3(),part=new THREE.Box3();
    for(const root of [model.root,pedestal].filter(Boolean))root.traverseVisible(object=>{
      if(!object.isMesh)return;
      if(!object.geometry.boundingBox)object.geometry.computeBoundingBox();
      part.copy(object.geometry.boundingBox).applyMatrix4(object.matrixWorld);box.union(part);
    });
    let x0=size,y0=size,x1=0,y1=0;
    for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
      const v=new THREE.Vector3(x,y,z).project(camera),px=(v.x+1)*size/2,py=(1-v.y)*size/2;
      x0=Math.min(x0,px);x1=Math.max(x1,px);y0=Math.min(y0,py);y1=Math.max(y1,py);
    }
    const pad=Math.max(x1-x0,y1-y0)*.06;
    x0=Math.max(0,x0-pad);y0=Math.max(0,y0-pad);x1=Math.min(size,x1+pad);y1=Math.min(size,y1+pad);
    return {x:x0,y:y0,width:x1-x0,height:y1-y0};
  }
  function draw(ctx,pose,equipment,{scale=1,classId:id=classId,form=null}={}) {
    // Forty screen pixels per model unit matches the world and its foot anchor.
    const factor=40*span/size*scale;
    const shift=id==='wildkeeper'&&!['death','dead'].includes(pose.state)?pose.ex?.wildshape:null;
    if(shift){
      drawShiftEffect(ctx,shift,scale,false);
      for(const layer of shiftLayers(shift,pose))if(layer.alpha>0){
        const frame={...layer.pose,ang:pose.ang,ex:{...layer.pose.ex,shiftBody:{amount:layer.amount,entering:layer.entering}}};
        const canvas=render(frame,equipment,id,layer.form);
        ctx.save();ctx.globalAlpha*=layer.alpha;ctx.drawImage(canvas,-anchor.x*factor,-anchor.y*factor,size*factor,size*factor);ctx.restore();
      }
      drawShiftEffect(ctx,shift,scale,true);
    }else{
      const canvas=render(pose,equipment,id,form);
      ctx.drawImage(canvas,-anchor.x*factor,-anchor.y*factor,size*factor,size*factor);
    }
  }
  function setResolution(value){
    const next=Math.max(192,Math.min(cinematic?768:384,Math.round(value)));if(presentation||next===size)return;
    size=next;renderer.setSize(size,size,false);anchor.x=(origin.x+1)*size/2;anchor.y=(1-origin.y)*size/2;
  }
  function dispose(){renderer.domElement.removeEventListener('webglcontextlost',onLost);renderer.domElement.removeEventListener('webglcontextrestored',onRestored);models.forEach(m=>m.dispose());disposeUniquePainting(renderer);environment.dispose();pmrem.dispose();disposeObject(studio);if(pedestal)disposeObject(pedestal);renderer.dispose();renderer.forceContextLoss();}
  return {setRegion,setResolution,renderer,scene,camera,get model(){return model;},setClass,anchor,render,presentationBounds,draw,projectileOrigin,effectAnchors,dispose,get lost(){return lost;}};
}
