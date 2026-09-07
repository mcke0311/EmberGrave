/* Original Ember Witch prototype. Geometry, skeleton and clips are authored here;
   Three.js is pinned in vendor/three. Coordinates: Y up, character faces +Z. */
import * as THREE from './vendor/three/three.module.min.js';

const TAU = Math.PI * 2;
const clamp = THREE.MathUtils.clamp;
export const ARMOR = ['light', 'mail'];
export const STATES = ['idle', 'walk', 'attack', 'cast', 'hit', 'death', 'dead'];

export function createEmberWitch() {
  const root = new THREE.Group(); root.name = 'EmberWitch';
  const bones = [], joints = {}, rest = {};
  const material = (color, extra = {}) => new THREE.MeshStandardMaterial({color, roughness: .83, ...extra});
  const materials = {
    skin: material('#c79e89'), hair: material('#372727'), hairLight: material('#604033'),
    cloth: material('#642c36'), lining: material('#361e30'), dark: material('#25252f'),
    leather: material('#51382f'), gold: material('#be8851', {metalness:.65, roughness:.4}),
    steel: material('#6e7d8c', {metalness:.7, roughness:.46}),
    eyes: material('#eed6a1', {emissive:'#e99339', emissiveIntensity:.65}),
    ember: material('#ffb256', {emissive:'#ff590e', emissiveIntensity:2}),
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
    const p=[], indices=[];
    for(const [y,rx,rz,z=0] of rows)for(let j=0;j<=segments;j++) {
      const a=j/segments*TAU;p.push(Math.sin(a)*rx,y,Math.cos(a)*rz+z);
    }
    for(let r=0;r<rows.length-1;r++)for(let j=0;j<segments;j++) {
      const a=r*(segments+1)+j,b=a+segments+1;indices.push(a,a+1,b,b,a+1,b+1);
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(indices);g.computeVertexNormals();
    return skinGeometry(g,weight,mat,name);
  }
  const torsoWeight = p => {
    if(p.y<1.16){const w=clamp((p.y-.95)/.21,0,1);return [['Hips',1-w],['Spine',w]];}
    const w=clamp((p.y-1.16)/.22,0,1);return [['Spine',1-w],['Chest',w]];
  };
  rings('Body',[[.88,.16,.11],[1.04,.14,.10],[1.17,.15,.105],[1.32,.215,.125],[1.43,.205,.105],[1.48,.075,.07]],materials.dark,torsoWeight);
  const armor = {
    light:rings('QuiltedVest',[[.97,.174,.13],[1.05,.158,.127],[1.18,.171,.133],[1.33,.231,.148],[1.43,.225,.125],[1.47,.094,.08]],materials.cloth,torsoWeight),
    mail:rings('CinderMail',[[.97,.18,.135],[1.06,.165,.134],[1.18,.181,.14],[1.33,.24,.16],[1.43,.24,.135],[1.47,.098,.085]],materials.steel,torsoWeight)
  };
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
  for(const side of ['L','R']) {
    const sign=side==='L'?1:-1;
    limb(`UpperArm${side}`,`Forearm${side}`,.086,.064,materials.cloth,`Sleeve${side}`);
    limb(`Forearm${side}`,`Hand${side}`,.066,.042,materials.leather,`Bracer${side}`);
    ellipsoid(joints[`Hand${side}`],materials.skin,[0,-.046,.007],[.045,.069,.042],`HandMesh${side}`);
    limb(`Thigh${side}`,`Shin${side}`,.086,.062,materials.dark,`Leg${side}`);
    limb(`Shin${side}`,`Foot${side}`,.068,.047,materials.leather,`BootShaft${side}`);
    box(joints[`Foot${side}`],materials.leather,[0,-.035,.055],[.113,.086,.22],`Boot${side}`);
    ellipsoid(joints[`UpperArm${side}`],materials.cloth,[0,0,0],[.12,.09,.127]);
    mesh(joints[`Forearm${side}`],new THREE.CylinderGeometry(.069,.069,.023,10),materials.gold,[0,-.07,0]);
    const plate=ellipsoid(joints[`UpperArm${side}`],materials.steel,[sign*.008,.027,0],[.137,.07,.143],`Pauldron${side}`);
    armor[`shoulder${side}`]=plate;
  }
  // Split coat panels share the hips/legs, leaving the knees free to articulate.
  const coatPanels=[];
  for(let side=0;side<8;side++) {
    const angle=side/8*TAU;
    const panel=new THREE.Group(); panel.position.set(Math.sin(angle)*.14,-.025,Math.cos(angle)*.115);panel.rotation.y=angle;hips.add(panel);
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute([-.073,0,0,.073,0,0,-.104,-.43,.13,.104,-.43,.13,-.085,-.51,.15,.085,-.51,.15],3));
    g.setIndex([0,2,1,1,2,3,2,4,3,3,4,5]);g.computeVertexNormals();
    const m=materials[side<3||side>5?'cloth':'lining'].clone();m.side=THREE.DoubleSide;
    mesh(panel,g,m);coatPanels.push(panel);
  }
  // Belt, clasp, front seam and pendant follow the actual torso bones.
  mesh(hips,new THREE.CylinderGeometry(.171,.171,.065,14,1,true),materials.leather,[0,.079,0],[1,1,.78]);
  box(hips,materials.gold,[0,.08,.139],[.077,.05,.024]);
  for(let i=0;i<4;i++)ellipsoid(spine,materials.gold,[0,-.016+i*.065,.15],[.017,.016,.008]);
  const pendant=mesh(chest,new THREE.OctahedronGeometry(.046),materials.ember,[0,.053,.143],[.65,1,.4]);
  mesh(neck,new THREE.CylinderGeometry(.055,.071,.11,10),materials.skin,[0,.015,0]);
  ellipsoid(head,materials.skin,[0,.045,.012],[.116,.156,.103],'Face');
  ellipsoid(head,materials.hair,[0,.104,-.039],[.126,.143,.096],'HairCrown');
  for(const sign of [-1,1]) {
    ellipsoid(head,materials.hair,[sign*.102,-.012,-.026],[.046,.187,.08]);
    ellipsoid(head,materials.hairLight,[sign*.078,.11,.068],[.06,.066,.045]);
    ellipsoid(head,materials.skin,[sign*.119,.025,.006],[.028,.051,.024]);
    box(head,materials.dark,[sign*.046,.048,.105],[.037,.017,.009]);
    box(head,materials.eyes,[sign*.046,.048,.111],[.018,.009,.005]);
    const brow=box(head,materials.hair,[sign*.046,.079,.103],[.045,.011,.012]);brow.rotation.z=sign*.1;
    ellipsoid(head,materials.gold,[sign*.121,-.025,.012],[.013,.026,.012]);
  }
  ellipsoid(head,materials.skin,[0,.016,.108],[.02,.032,.028]);
  box(head,materials.cloth,[0,-.038,.105],[.035,.009,.005]);
  const circlet=mesh(head,new THREE.TorusGeometry(.115,.012,5,18),materials.gold,[0,.12,.013]);circlet.rotation.x=Math.PI/2;
  mesh(head,new THREE.OctahedronGeometry(.025),materials.ember,[0,.125,.127],[.7,1,.5]);
  // Socket origin is inside the right palm, so weapons cannot drift from hands.
  const socket=new THREE.Group();socket.name='WeaponSocket';socket.position.set(0,-.045,.026);joints.HandR.add(socket);
  socket.rotation.x=1.1;
  const wand=new THREE.Group();wand.name='GnarledWand';socket.add(wand);
  mesh(wand,new THREE.CylinderGeometry(.019,.013,.44,7),materials.wood,[0,.16,0]);
  for(const y of [.02,.08,.27])mesh(wand,new THREE.CylinderGeometry(.026,.026,.018,8),materials.gold,[0,y,0]);
  const ember=mesh(wand,new THREE.OctahedronGeometry(.063),materials.ember,[0,.435,0],[.65,1.5,.65]);
  for(const sign of [-1,1]) {
    const prong=mesh(wand,new THREE.ConeGeometry(.023,.15,5),materials.gold,[sign*.041,.382,0]);prong.rotation.z=sign*-.3;
  }
  const spell=mesh(joints.HandL,new THREE.IcosahedronGeometry(.09,1),materials.ember,[0,-.03,.13]);spell.visible=false;
  const auraMaterial=new THREE.MeshBasicMaterial({color:'#ffa343',transparent:true,opacity:.18,depthWrite:false});
  const aura=mesh(joints.HandL,new THREE.IcosahedronGeometry(.13,1),auraMaterial,[0,-.03,.13]);aura.visible=false;

  function poseAt(state,u) {
    const rotations={};const set=(name,x=0,y=0,z=0)=>{rotations[name]=[x,y,z];};
    const breath=Math.sin(u*TAU);
    let height=.94;
    set('UpperArmL',-.08,0,.09);set('UpperArmR',-.14,0,-.09);set('ForearmL',-.1);set('ForearmR',-.3);
    set('Spine',.025+breath*.012);set('Head',0,0,breath*.012);
    if(state==='walk') {
      const s=Math.sin(u*TAU),c=Math.cos(u*TAU);height+=.019*(1-Math.cos(u*TAU*2));
      set('ThighL',s*.54);set('ThighR',-s*.54);
      set('ShinL',Math.max(0,-s)*.85);set('ShinR',Math.max(0,s)*.85);
      set('FootL',-Math.max(0,-s)*.4);set('FootR',-Math.max(0,s)*.4);
      set('UpperArmL',-s*.36,0,.09);set('UpperArmR',s*.29-.16,0,-.09);
      set('Spine',.06,c*.035,0);set('Chest',0,-c*.065,0);
    } else if(state==='cast'||state==='attack') {
      const wind=Math.sin(clamp(u/.45,0,1)*Math.PI/2), release=clamp((u-.45)/.2,0,1);
      const recovery=1-clamp((u-.72)/.28,0,1),power=wind*recovery;
      set('UpperArmR',(-.85-release*.65)*power,.15*power,-.23*power);
      set('ForearmR',(-.95+release*.7)*power-.3);
      set('UpperArmL',-1.0*power,-.25*power,.4*power);
      set('ForearmL',-.35*power-.1);set('Spine',(-.09+release*.19)*power);
      set('Chest',0,(-.22+release*.38)*power,0);set('Head',.08*power);
    } else if(state==='hit') {
      const hit=Math.sin(u*Math.PI);set('Spine',-.24*hit);set('Head',-.18*hit);set('UpperArmL',-.4*hit,0,.3*hit);height-=hit*.06;
    } else if(state==='death'||state==='dead') {
      const f=state==='dead'?1:u*u*(3-2*u);height=.94-.77*f;
      set('Hips',-Math.PI/2*f,0,.14*f);set('Spine',.13*f);set('Head',.22*f);
      set('UpperArmL',-.2,0,.55*f);set('UpperArmR',-.28,0,-.65*f);set('ThighL',.1*f);set('ThighR',-.18*f);set('ShinR',.35*f);
    }
    return {rotations,height};
  }
  const clips=STATES.map(state=>{
    const times=Array.from({length:33},(_,i)=>i/32),samples=times.map(u=>poseAt(state,u)),tracks=[];
    for(const bone of bones) {
      const quats=[];for(const sample of samples){const e=sample.rotations[bone.name]||[0,0,0];quats.push(...new THREE.Quaternion().setFromEuler(new THREE.Euler(...e)).toArray());}
      tracks.push(new THREE.QuaternionKeyframeTrack(`${bone.name}.quaternion`,times,quats));
    }
    tracks.push(new THREE.VectorKeyframeTrack('Hips.position',times,samples.flatMap(p=>[0,p.height,0])));
    return new THREE.AnimationClip(state,1,tracks);
  });
  const mixer=new THREE.AnimationMixer(root),actions=Object.fromEntries(clips.map(clip=>{
    const a=mixer.clipAction(clip);a.setLoop(THREE.LoopOnce,1);a.clampWhenFinished=true;return [clip.name,a];
  }));
  let current='';
  function animate(pose) {
    const state=pose.ex?.airborne?'idle':(pose.state==='run'?'walk':pose.state);
    const name=actions[state]?state:'idle';
    const t=name==='walk'?((pose.ex?.walkPh||0)/TAU%1+1)%1:name==='idle'?((pose.t||0)/3%1+1)%1:clamp(pose.t||0,0,.999999);
    if(current!==name){mixer.stopAllAction();actions[name].reset().play();current=name;}
    mixer.setTime(t);
    for(let i=0;i<coatPanels.length;i++)coatPanels[i].rotation.x=name==='walk'?Math.sin(t*TAU+(i<4?0:Math.PI))*.11:0;
    const casting=(name==='cast'||name==='attack')&&t>.12&&t<.8;
    spell.visible=aura.visible=casting;spell.rotation.y=t*TAU*2;
    aura.scale.setScalar(1+Math.sin(t*Math.PI)*.35);
    const color=pose.ex?.castColor||'#ff8b32';materials.ember.emissive.set(color);auraMaterial.color.set(color);
    ember.scale.y=1.5+(casting?Math.sin(t*Math.PI)*.6:0);
    root.updateMatrixWorld(true);
  }
  function equip({chest='light',main=true,head:helmet=false}={}) {
    armor.light.visible=chest==='light';armor.mail.visible=chest==='mail';
    armor.shoulderL.visible=armor.shoulderR.visible=chest==='mail';
    wand.visible=!!main;circlet.visible=!!helmet;
  }
  equip();animate({state:'idle',t:0});
  function dispose(){mixer.stopAllAction();mixer.uncacheRoot(root);skeleton.dispose();const geometries=new Set(),mats=new Set();root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)mats.add(o.material);});geometries.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());}
  return {root,bones,joints,skeleton,socket,wand,armor,clips,animate,equip,dispose,rest};
}

// Game angles describe screen vectors; undo the 2:1 ground foreshortening.
export function facingYaw(screenAngle) { return Math.atan2(Math.cos(screenAngle),Math.sin(screenAngle)*2); }

export function createCharacterRenderer({size=384}={}) {
  const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:false,powerPreference:'low-power'});
  renderer.setPixelRatio(1);renderer.setSize(size,size,false);renderer.setClearColor(0x000000,0);
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.28;
  const scene=new THREE.Scene(), span=3.15;
  const camera=new THREE.OrthographicCamera(-span/2,span/2,span/2,-span/2,.01,30);
  const target=new THREE.Vector3(0,.72,0);camera.position.set(0,.72+5,Math.sqrt(75));camera.lookAt(target);
  scene.add(new THREE.HemisphereLight('#c4d6f0','#3d2935',2.35));
  const key=new THREE.DirectionalLight('#ffdab1',3.2);key.position.set(-3,5,5);scene.add(key);
  const rim=new THREE.DirectionalLight('#849ddd',2.4);rim.position.set(3,2,-4);scene.add(rim);
  const model=createEmberWitch();scene.add(model.root);
  camera.updateMatrixWorld(true);
  const origin=new THREE.Vector3(0,0,0).project(camera);
  const anchor={x:(origin.x+1)*size/2,y:(1-origin.y)*size/2};
  let lost=false;const onLost=e=>{e.preventDefault();lost=true;};const onRestored=()=>{lost=false;};
  renderer.domElement.addEventListener('webglcontextlost',onLost);renderer.domElement.addEventListener('webglcontextrestored',onRestored);
  function render(pose,equipment) {
    if(lost)throw new Error('The 3D character graphics context was lost. Reload the page to retry.');
    model.root.rotation.y=facingYaw(pose.ang||0);model.equip(equipment);model.animate(pose);renderer.render(scene,camera);
    return renderer.domElement;
  }
  function draw(ctx,pose,equipment,{scale=1}={}) {
    const canvas=render(pose,equipment);
    // 40 screen pixels / model unit makes the 1.9-unit character fit the sprite cast.
    const factor=40*span/size*scale;
    ctx.drawImage(canvas,-anchor.x*factor,-anchor.y*factor,size*factor,size*factor);
  }
  function dispose(){renderer.domElement.removeEventListener('webglcontextlost',onLost);renderer.domElement.removeEventListener('webglcontextrestored',onRestored);model.dispose();renderer.dispose();renderer.forceContextLoss();}
  return {renderer,scene,camera,model,anchor,render,draw,dispose,get lost(){return lost;}};
}
