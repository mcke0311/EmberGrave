/* Original five-class characters. Geometry, skeleton and clips are authored here;
   Three.js is pinned in vendor/three. Coordinates: Y up, character faces +Z. */
import * as THREE from './vendor/three/three.module.min.js';
import {CLASS_STYLES,ARMOR_FAMILIES} from './character_catalog3d.mjs';
import {createWeapon,createWearable,createArmorDetails,disposeObject,rod} from './character_equipment3d.mjs?v=4';
import {surfaceMaterial,disposeMaterials} from './character_materials3d.mjs';
import {armorPalette,armorRank} from './character_armor3d.mjs?v=4';
import {CLASS_ANIMATIONS,classPoseAt,weaponMotionAt,animationPhase,smooth} from './character_animation3d.mjs?v=6';
import {createWildshape} from './character_forms3d.mjs?v=5';
export {CLASS_STYLES} from './character_catalog3d.mjs';

const TAU = Math.PI * 2;
const clamp = THREE.MathUtils.clamp;
export const ARMOR = ARMOR_FAMILIES;
export const STATES = ['idle', 'walk', 'attack', 'cast', 'kick', 'hit', 'death', 'dead'];

export function createCharacter(classId='emberwitch') {
  const profile=CLASS_STYLES[classId];if(!profile)throw new Error(`Unknown 3D class: ${classId}`);
  const root = new THREE.Group(); root.name = profile.name;
  const bones = [], joints = {}, rest = {};
  const material = (color, extra = {}) => new THREE.MeshStandardMaterial({color, roughness: .83, ...extra});
  const materials = {
    skin: material(profile.skin), hair: material(profile.hair), hairLight: material(profile.hair),
    cloth: surfaceMaterial(profile.cloth,'cloth'), lining: surfaceMaterial(profile.lining,'cloth'), dark: surfaceMaterial('#25252b','cloth'),
    leather: surfaceMaterial('#3a2b24','leather'), gold: surfaceMaterial(profile.trim,'metal',{metalness:.65,roughness:.55}),
    steel: material('#6e7d8c', {metalness:.7, roughness:.46}),
    eyes: material('#a49579'),
    ember: material(profile.magic, {emissive:profile.magic, emissiveIntensity:1.3}),
    wood: material('#4e3028')
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
  function skinGeometry(geometry, weights, mat, name) {
    const positions = geometry.getAttribute('position'); const indices = [], values = [];
    for(let i=0;i<positions.count;i++) {
      const assignments = weights(new THREE.Vector3().fromBufferAttribute(positions,i));
      for(let j=0;j<4;j++) { indices.push(assignments[j] ? bones.indexOf(joints[assignments[j][0]]) : 0); values.push(assignments[j] ? assignments[j][1] : 0); }
    }
    geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(indices,4));
    geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(values,4));
    const mesh = new THREE.SkinnedMesh(geometry,mat); mesh.name=name; mesh.frustumCulled=false;
    root.add(mesh); mesh.bind(skeleton); return mesh;
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
  const bareHands=[],baseBoots=[],hairParts=[],shoulderPadding=[];
  for(const side of ['L','R']) {
    const sign=side==='L'?1:-1;
    limb(`UpperArm${side}`,`Forearm${side}`,.086,.064,materials.cloth,`Sleeve${side}`);
    limb(`Forearm${side}`,`Hand${side}`,.066,.042,materials.leather,`Bracer${side}`);
    bareHands.push(ellipsoid(joints[`Hand${side}`],materials.skin,[0,-.046,.007],[.045,.069,.042],`HandMesh${side}`));
    limb(`Thigh${side}`,`Shin${side}`,.086,.062,materials.dark,`Leg${side}`);
    limb(`Shin${side}`,`Foot${side}`,.068,.047,materials.leather,`BootShaft${side}`);
    baseBoots.push(box(joints[`Foot${side}`],materials.leather,[0,-.035,.055],[.113,.086,.22],`Boot${side}`));
    shoulderPadding.push(ellipsoid(joints[`UpperArm${side}`],materials.cloth,[0,0,0],[.12,.09,.127]));
    mesh(joints[`Forearm${side}`],new THREE.CylinderGeometry(.069,.069,.023,10),materials.gold,[0,-.07,0]);
  }
  // Split coat panels share the hips/legs, leaving the knees free to articulate.
  const coatPanels=[];
  for(let side=0;side<8;side++) {
    const angle=side/8*TAU;
    const panel=new THREE.Group(); panel.position.set(Math.sin(angle)*.14,-.025,Math.cos(angle)*.115);panel.rotation.y=angle;hips.add(panel);
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute([-.073,0,0,.073,0,0,-.104,-.43,.13,.104,-.43,.13,-.085,-.51,.15,.085,-.51,.15],3));
    g.setAttribute('uv',new THREE.Float32BufferAttribute([0,1,1,1,0,.15,1,.15,.1,0,.9,0],2));
    g.setIndex([0,2,1,1,2,3,2,4,3,3,4,5]);g.computeVertexNormals();
    const m=materials[side<3||side>5?'cloth':'lining'].clone();m.side=THREE.DoubleSide;
    mesh(panel,g,m);panel.scale.y=profile.coat;coatPanels.push(panel);
  }
  // Belt, clasp, front seam and pendant follow the actual torso bones.
  mesh(hips,new THREE.CylinderGeometry(.171,.171,.065,14,1,true),materials.leather,[0,.079,0],[1,1,.78]);
  box(hips,materials.gold,[0,.08,.139],[.077,.05,.024]);
  const torsoTrims=[];
  for(let i=0;i<4;i++)torsoTrims.push(ellipsoid(spine,materials.gold,[0,-.016+i*.065,.15],[.017,.016,.008]));
  const pendant=mesh(chest,new THREE.OctahedronGeometry(.046),materials.ember,[0,.053,.143],[.65,1,.4]);
  mesh(neck,new THREE.CylinderGeometry(.055,.071,.11,10),materials.skin,[0,.015,0]);
  ellipsoid(head,materials.skin,[0,.045,.012],[.116,.156,.103],'Face');
  hairParts.push(ellipsoid(head,materials.hair,[0,.104,-.039],[.126,.143,.096],'HairCrown'));
  for(const sign of [-1,1]) {
    hairParts.push(ellipsoid(head,materials.hair,[sign*.102,-.012,-.026],[.046,classId==='vanguard'?.077:.187,.08]));
    hairParts.push(ellipsoid(head,materials.hairLight,[sign*.078,.11,.068],[.06,.066,.045]));
    ellipsoid(head,materials.skin,[sign*.119,.025,.006],[.028,.051,.024]);
    box(head,materials.dark,[sign*.046,.048,.105],[.037,.017,.009]);
    box(head,materials.eyes,[sign*.046,.048,.111],[.018,.009,.005]);
    const brow=box(head,materials.hair,[sign*.046,.079,.103],[.045,.011,.012]);brow.rotation.z=sign*.1;
    ellipsoid(head,materials.gold,[sign*.121,-.025,.012],[.013,.026,.012]);
  }
  ellipsoid(head,materials.skin,[0,.016,.108],[.02,.032,.028]);
  box(head,materials.cloth,[0,-.038,.105],[.035,.009,.005]);
  const headStyle=new THREE.Group();headStyle.name='ClassHeadStyle';head.add(headStyle);
  if(classId==='emberwitch'){
    const circlet=mesh(headStyle,new THREE.TorusGeometry(.115,.012,5,18),materials.gold,[0,.12,.013]);circlet.rotation.x=Math.PI/2;
    mesh(headStyle,new THREE.OctahedronGeometry(.025),materials.ember,[0,.125,.127],[.7,1,.5]);
  }
  if(classId==='vanguard'||classId==='wildkeeper'){
    const beard=mesh(head,new THREE.ConeGeometry(.092,classId==='wildkeeper'?.23:.12,7),materials.hair,[0,-.087,.054]);beard.rotation.z=Math.PI;
  }
  if(classId==='gravebinder'||classId==='veilranger'){
    mesh(headStyle,new THREE.SphereGeometry(.15,12,8,0,Math.PI*2,0,Math.PI*.65),materials.lining,[0,.073,-.032],[1,1.28,1]);
    for(const sign of [-1,1])ellipsoid(headStyle,materials.lining,[sign*.125,-.025,-.028],[.036,.16,.115]);
    if(classId==='veilranger')box(head,materials.lining,[0,-.027,.109],[.164,.07,.027]);
    else {ellipsoid(chest,materials.gold,[0,.065,.157],[.063,.059,.034]);for(const sign of [-1,1])ellipsoid(chest,materials.dark,[sign*.022,.077,.186],[.014,.019,.009]);}
  }
  if(classId==='wildkeeper')for(const sign of [-1,1]){
    rod(headStyle,materials.gold,[sign*.10,.15,0],[sign*.22,.36,-.07],.019);
    rod(headStyle,materials.gold,[sign*.22,.36,-.07],[sign*.30,.50,-.09],.013);
    rod(headStyle,materials.gold,[sign*.18,.29,-.05],[sign*.12,.43,-.02],.012);
    rod(headStyle,materials.gold,[sign*.24,.39,-.08],[sign*.34,.40,-.15],.01);
  }
  if(classId==='vanguard'||classId==='veilranger'||classId==='gravebinder'){
    const cape=mesh(chest,new THREE.CylinderGeometry(.16,.29,classId==='gravebinder'?.95:.71,10,1,true,Math.PI/2,Math.PI),materials.lining,[0,-.29,-.072]);cape.name='ClassCape';cape.material=materials.lining.clone();cape.material.side=THREE.DoubleSide;
  }
  if(classId==='veilranger'){
    const quiver=mesh(chest,new THREE.CylinderGeometry(.074,.066,.48,9),materials.leather,[-.17,-.11,-.20]);quiver.rotation.z=-.24;
    for(let i=0;i<4;i++)rod(chest,materials.wood,[-.18+i*.028,-.1,-.20],[-.10+i*.028,.31,-.20],.008);
  }
  // Socket origin is inside the right palm, so weapons cannot drift from hands.
  const socket=new THREE.Group();socket.name='WeaponSocket';socket.position.set(0,-.045,.026);joints.HandR.add(socket);
  socket.rotation.x=1.1;
  const twoHandRig=new THREE.Group();twoHandRig.name='TwoHandWeaponRig';chest.add(twoHandRig);
  const palmOffset=new THREE.Vector3(0,-.045,.026),supportSocket=new THREE.Group();supportSocket.name='SupportSocket';supportSocket.position.copy(palmOffset);joints.HandL.add(supportSocket);
  const rightPalm=new THREE.Group();rightPalm.position.copy(palmOffset);joints.HandR.add(rightPalm);
  let equipment={},equipmentKey='',weapon=null;
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
  const auraMaterial=new THREE.MeshBasicMaterial({color:'#ffa343',transparent:true,opacity:.18,depthWrite:false});
  const aura=mesh(joints.HandL,new THREE.IcosahedronGeometry(.13,1),auraMaterial,[0,-.03,.13]);aura.visible=false;

  const clips=STATES.map(state=>{
    const times=[...new Set([...Array.from({length:65},(_,i)=>i/64),.24,.5,.7,...['attack','cast','hit','death'].flatMap(s=>CLASS_ANIMATIONS[classId][s].map(k=>k[0]))])].sort((a,b)=>a-b),samples=times.map(u=>classPoseAt(classId,state,u)),tracks=[];
    for(const bone of bones) {
      const quats=[];for(const sample of samples){const e=sample.rotations[bone.name]||[0,0,0];quats.push(...new THREE.Quaternion().setFromEuler(new THREE.Euler(...e)).toArray());}
      tracks.push(new THREE.QuaternionKeyframeTrack(`${bone.name}.quaternion`,times,quats));
    }
    tracks.push(new THREE.VectorKeyframeTrack('Hips.position',times,samples.flatMap(p=>[0,p.height,0])));
    return new THREE.AnimationClip(state,1,tracks);
  });
  // Evaluate the authored curves directly. Scrubbing backwards, revisiting a
  // completed death, or rendering eight views cannot leave a mixer action frozen.
  function animate(pose) {
    const requested=pose.state==='run'?'walk':pose.state,airborne=pose.ex?.airborne&&!['death','dead'].includes(requested);
    const name=airborne?'idle':STATES.includes(requested)?requested:'idle';
    const t=name==='walk'?(((pose.ex?.walkPh??(pose.t||0)*TAU)/TAU)%1+1)%1:name==='idle'?((pose.t||0)/3%1+1)%1:clamp(pose.t||0,0,1);
    const phase=animationPhase(name,t,equipment.main?.family),body=classPoseAt(classId,name,phase),twoHand=!!equipment.main?.twoHand,category=equipment.main?.family.split('_')[0];
    for(const bone of bones){bone.position.copy(rest[bone.name]);bone.rotation.set(...(body.rotations[bone.name]||[0,0,0]));}hips.position.y=body.height;
    const motion=weaponMotionAt(classId,name,phase,equipment.main?.family,twoHand,!!equipment.off);
    for(const [joint,r] of Object.entries(motion.extra)){const b=joints[joint];b.rotation.x+=r[0];b.rotation.y+=r[1];b.rotation.z+=r[2];}
    if(motion.shield){const s=motion.shield,arm=joints.UpperArmL;arm.rotation.x=THREE.MathUtils.lerp(arm.rotation.x,s.upper[0],s.weight*.78);arm.rotation.z=THREE.MathUtils.lerp(arm.rotation.z,s.upper[2],s.weight*.78);joints.ForearmL.rotation.x=THREE.MathUtils.lerp(joints.ForearmL.rotation.x,s.fore,s.weight*.86);}
    socket.rotation.x=motion.socket;twoHandRig.position.set(...motion.position);twoHandRig.rotation.set(...motion.rotation);
    for(let i=0;i<coatPanels.length;i++){
      const angle=i/8*TAU,leg=name==='walk'?Math.sin(t*TAU+(Math.sin(angle)>0?0:Math.PI)):0;
      // Front and rear panels move away from the advancing knee. Long stoles
      // remain attached to the hips while the split cloth clears the legs.
      const kick=name==='kick'?smooth(t/.24)*(1-smooth((t-.7)/.3)):0;
      coatPanels[i].rotation.x=-(Math.max(0,leg*Math.cos(angle))*.26+Math.abs(Math.sin(t*TAU-angle))*motion.cloth+kick*Math.max(0,Math.cos(angle))*.95);
    }
    spell.visible=aura.visible=motion.spell>.005;spell.rotation.y=t*TAU*(classId==='gravebinder'?1:2);
    spell.scale.setScalar(.45+motion.spell*.65);aura.scale.setScalar(.6+motion.spell*.65);auraMaterial.opacity=motion.spell*.18;
    const color=pose.ex?.castColor||profile.magic;materials.ember.emissive.set(color);auraMaterial.color.set(color);focusMaterial.color.set(color);focusMaterial.opacity=motion.spell*.8;
    root.updateMatrixWorld(true);
    const settling=name==='dead'?1:name==='death'?smooth((t-.28)/.72):0;
    const cape=root.getObjectByName('ClassCape');if(cape){cape.scale.z=1-settling*.85;cape.position.z=-.072*(1-settling*.65);}
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
      if((category==='bow'||category==='crossbow')&&motion.power>0){
        const aim=relativeQuaternion(chest).invert().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0,0,motion.rotation[2])));
        twoHandRig.quaternion.slerp(aim,motion.power);root.updateMatrixWorld(true);
      }
      let right=new THREE.Vector3(),left=new THREE.Vector3(...weapon.userData.support);
      if(category==='bow'){
        const draw=motion.draw;
        right.z=-.08-draw*.14;
        const line=weapon.userData.string;line.geometry.attributes.position.setZ(1,right.z);line.geometry.attributes.position.needsUpdate=true;
        weapon.userData.arrow.visible=motion.arrow;weapon.userData.arrow.position.z=-draw*.14;
      }
      const q=relativeQuaternion(weapon);
      solveArm('R',root.worldToLocal(weapon.localToWorld(right)),q);
      solveArm('L',root.worldToLocal(weapon.localToWorld(left)),q);
      root.updateMatrixWorld(true);
    }
    // Pauldrons hinge over the sleeve instead of swinging through the head.
    for(const object of attachments.get('chest')?.objects||[]){if(object.parent.name.startsWith('UpperArm'))object.quaternion.copy(object.parent.quaternion).invert().slerp(neutralRotation,.32);}
    root.updateMatrixWorld(true);
    if(!airborne)groundPose(name);
  }
  const floorMatrix=new THREE.Matrix4(),inverseRoot=new THREE.Matrix4(),floorVertex=new THREE.Vector3(),neutralRotation=new THREE.Quaternion();
  function groundPose(name){
    const falling=name==='death'||name==='dead';let low=Infinity;
    inverseRoot.copy(root.matrixWorld).invert();
    function measure(o){
      if(!o.isMesh||o===spell||o===aura||!o.geometry.attributes.position)return;
      floorMatrix.multiplyMatrices(inverseRoot,o.matrixWorld);const e=floorMatrix.elements,position=o.geometry.attributes.position;
      if(!o.isSkinnedMesh){
        // Reject meshes whose entire local box lies above the current minimum.
        if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();const b=o.geometry.boundingBox;
        const bound=e[1]*(e[1]<0?b.max.x:b.min.x)+e[5]*(e[5]<0?b.max.y:b.min.y)+e[9]*(e[9]<0?b.max.z:b.min.z)+e[13];if(bound>=low)return;
        for(let i=0;i<position.count;i++)low=Math.min(low,e[1]*position.getX(i)+e[5]*position.getY(i)+e[9]*position.getZ(i)+e[13]);
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
  function solveArm(side,gripTarget,rotation){
    const upper=joints[`UpperArm${side}`],fore=joints[`Forearm${side}`],hand=joints[`Hand${side}`];
    const target=gripTarget.clone().sub(palmOffset.clone().applyQuaternion(rotation));
    const shoulder=root.worldToLocal(upper.getWorldPosition(new THREE.Vector3()));
    const l1=rest[`Forearm${side}`].length(),l2=rest[`Hand${side}`].length(),delta=target.clone().sub(shoulder);
    const distance=clamp(delta.length(),.001,l1+l2-.00001),direction=delta.normalize();
    const pole=new THREE.Vector3(side==='L'?1:-1,-.35,-.25).applyQuaternion(relativeQuaternion(chest));
    const bend=pole.addScaledVector(direction,-pole.dot(direction)).normalize();
    const along=(l1*l1-l2*l2+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,l1*l1-along*along));
    const elbow=shoulder.clone().addScaledVector(direction,along).addScaledVector(bend,height);
    const localElbow=upper.parent.worldToLocal(root.localToWorld(elbow));
    upper.quaternion.setFromUnitVectors(rest[`Forearm${side}`].clone().normalize(),localElbow.sub(upper.position).normalize());root.updateMatrixWorld(true);
    const localTarget=fore.parent.worldToLocal(root.localToWorld(target));
    fore.quaternion.setFromUnitVectors(rest[`Hand${side}`].clone().normalize(),localTarget.sub(fore.position).normalize());root.updateMatrixWorld(true);
    hand.quaternion.copy(relativeQuaternion(fore).invert().multiply(rotation));root.updateMatrixWorld(true);
  }
  function equip(next={}) {
    if(next===equipment)return;
    const key=JSON.stringify(next);if(key===equipmentKey)return;equipmentKey=key;equipment=next;
    for(const family of ARMOR_FAMILIES)armor[family].visible=next.chest?.family===family;
    if(next.chest){const chosen=armor[next.chest.family],p=next.chest.material;chosen.material.color.set(next.chest.family==='light'?p.cloth:p.metal);
      if(classId!=='vanguard')chosen.material.color.set(armorPalette(next.chest,classId).cloth);
      else if(next.chest.family==='light')chosen.material.color.lerp(new THREE.Color(profile.cloth),.55);
      else chosen.material.color.multiplyScalar(.75);
    }
    const heavy=['plate','mythic'].includes(next.chest?.family);
    coatPanels.forEach((p,i)=>{
      if(classId==='vanguard'){p.scale.y=profile.coat*(heavy?.64:next.chest?.family==='mail'?.85:1);p.visible=!heavy||(i>=2&&i<=6);}
      else {
        const rank=armorRank(next.chest),length={emberwitch:[.68,1.05,1.28,1.5],gravebinder:[.8,1.1,1.32,1.48],wildkeeper:[.45,.66,.8,.9],veilranger:[.3,.48,.76,1]};
        const palette=next.chest?armorPalette(next.chest,classId):null,contrast=rank>=1&&(i===1||i===7||classId==='veilranger'&&(i===3||i===5));
        p.scale.y=next.chest?length[classId][rank]*(classId==='veilranger'&&(i===1||i===7)?.65:1):profile.coat;
        p.scale.x=next.chest?1+rank*(classId==='emberwitch'?.09:.035):1;p.visible=classId!=='veilranger'||i!==0;
        p.children[0].material.color.set(palette?(contrast?palette.contrast:palette.cloth):(i<3||i>5?profile.cloth:profile.lining));
      }
    });
    torsoTrims.forEach(p=>p.visible=!next.chest);pendant.visible=!next.chest&&!next.amulet;
    hairParts.forEach(p=>p.visible=!next.head||classId==='emberwitch');headStyle.visible=!next.head;
    bareHands.forEach(p=>p.visible=!next.gloves);baseBoots.forEach(p=>p.visible=!next.boots);
    shoulderPadding.forEach(p=>p.visible=!next.chest);
    for(const slot of ['chest','main','off','head','gloves','boots','belt','ring1','ring2','amulet']){
      const item=next[slot],installed=attachments.get(slot);
      if(installed?.key===item?.key)continue;
      if(installed){installed.objects.forEach(disposeObject);attachments.delete(slot);}
      if(slot==='main')weapon=null;if(!item)continue;
      const objects=[];
      if(slot==='chest'){for(const [joint,object] of Object.entries(createArmorDetails(item,classId))){joints[joint].add(object);objects.push(object);}}
      else if(slot==='main'){weapon=createWeapon(item);(item.twoHand?twoHandRig:socket).add(weapon);objects.push(weapon);}
      else {
        const parents=slot==='head'?[head]:slot==='off'?[joints.HandL]:slot==='gloves'?[joints.HandL,joints.HandR]:
          slot==='boots'?[joints.FootL,joints.FootR]:slot==='belt'?[hips]:slot==='amulet'?[chest]:[slot==='ring1'?joints.HandL:joints.HandR];
        for(const parent of parents){const object=createWearable(item,classId);parent.add(object);objects.push(object);if(slot==='off'){object.position.set(.075,-.07,.03);object.rotation.x=1.05;}}
      }
      attachments.set(slot,{key:item.key,objects});
    }
    root.updateMatrixWorld(true);
  }
  root.scale.set(profile.width,profile.height,profile.width);
  equip();animate({state:'idle',t:0});
  function dispose(){skeleton.dispose();const geometries=new Set(),mats=new Set();root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)mats.add(o.material);});geometries.forEach(g=>g.dispose());disposeMaterials(mats);}
  return {root,classId,bones,joints,skeleton,socket,supportSocket,rightPalm,armor,clips,animate,equip,dispose,rest,attachments,get weapon(){return weapon;}};
}

// Game angles describe screen vectors; undo the 2:1 ground foreshortening.
export function facingYaw(screenAngle) { return Math.atan2(Math.cos(screenAngle),Math.sin(screenAngle)*2); }

export function createCharacterRenderer({size=384,classId='emberwitch',presentation=false}={}) {
  const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:false,powerPreference:'low-power'});
  renderer.setPixelRatio(1);renderer.setSize(size,size,false);renderer.setClearColor(0x000000,0);
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.04;
  const scene=new THREE.Scene(), span=presentation?3.8:5;
  const camera=new THREE.OrthographicCamera(-span/2,span/2,span/2,-span/2,.01,30);
  const target=new THREE.Vector3(0,presentation?1:.83,0);
  camera.position.set(0,target.y+(presentation?1.8:5),presentation?10:Math.sqrt(75));camera.lookAt(target);
  scene.add(new THREE.HemisphereLight('#bccbd4','#28231f',1.65));
  const key=new THREE.DirectionalLight('#f3dcc0',2.7);key.position.set(-3,5,5);scene.add(key);
  const rim=new THREE.DirectionalLight('#8eabc2',1.8);rim.position.set(3,2,-4);scene.add(rim);
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
  scene.environment=environment.texture;scene.environmentIntensity=.65;
  const models=new Map();let model=null;
  function setClass(id,form=null){const key=form||id;if(!models.has(key)){models.set(key,form?createWildshape(form):createCharacter(id));scene.add(models.get(key).root);}if(model)model.root.visible=false;model=models.get(key);model.root.visible=true;}
  setClass(classId);
  camera.updateMatrixWorld(true);
  const origin=new THREE.Vector3(0,0,0).project(camera);
  const anchor={x:(origin.x+1)*size/2,y:(1-origin.y)*size/2};
  let lost=false;const onLost=e=>{e.preventDefault();lost=true;};const onRestored=()=>{
    environment.dispose();pmrem.dispose();pmrem=new THREE.PMREMGenerator(renderer);environment=pmrem.fromScene(studio,.06,.1,20,{size:128});scene.environment=environment.texture;lost=false;
  };
  renderer.domElement.addEventListener('webglcontextlost',onLost);renderer.domElement.addEventListener('webglcontextrestored',onRestored);
  function render(pose,equipment,id=classId,form=null) {
    if(lost)throw new Error('The 3D character graphics context was lost. Reload the page to retry.');
    if(model.classId!==id||(model.formId||null)!==form)setClass(id,form);
    model.root.rotation.y=facingYaw(pose.ang||0);model.equip(equipment);model.animate(pose);renderer.render(scene,camera);
    return renderer.domElement;
  }
  function draw(ctx,pose,equipment,{scale=1,classId:id=classId,form=null}={}) {
    const canvas=render(pose,equipment,id,form);
    // Forty screen pixels per model unit matches the world and its foot anchor.
    const factor=40*span/size*scale;
    ctx.drawImage(canvas,-anchor.x*factor,-anchor.y*factor,size*factor,size*factor);
  }
  function dispose(){renderer.domElement.removeEventListener('webglcontextlost',onLost);renderer.domElement.removeEventListener('webglcontextrestored',onRestored);models.forEach(m=>m.dispose());environment.dispose();pmrem.dispose();disposeObject(studio);if(pedestal)disposeObject(pedestal);renderer.dispose();renderer.forceContextLoss();}
  return {renderer,scene,camera,get model(){return model;},setClass,anchor,render,draw,dispose,get lost(){return lost;}};
}
