/* Wildkeeper shapes share the live Three.js scene and world-space foot anchor. */
import * as THREE from './vendor/three/three.module.min.js';
import {surfaceMaterial,disposeMaterials} from './character_materials3d.mjs';
import {smooth,animationPhase} from './character_animation3d.mjs?v=10';
import {gaitProfile,footPath} from './character_motion3d.mjs';
import {combineStatic,curved} from './character_mesh3d.mjs';

export const FORM_STYLES=Object.freeze({
  form_fang:{name:'Wolf Form',footprint:1.1,fur:'#737d79',mane:'#353f40',glow:'#c3e7b3',stride:.65},
  form_brute:{name:'Bear Form',footprint:1.5,fur:'#72543a',mane:'#3b3028',glow:'#e8bf72',stride:.36},
  form_stone:{name:'Stone Form',footprint:1.12,fur:'#777e77',mane:'#424d43',glow:'#93d9b0',stride:.26},
  form_apex:{name:'Wrath of the Wild',footprint:1.45,fur:'#434e43',mane:'#252f2c',glow:'#b7e98a',stride:.55}
});

export function createWildshape(formId){
  const style=FORM_STYLES[formId];if(!style)throw Error('Unknown 3D Wildkeeper form: '+formId);
  const root=new THREE.Group();root.name=style.name;
  const body=new THREE.Group();root.add(body);
  const stone=formId==='form_stone',apex=formId==='form_apex',bear=formId==='form_brute',biped=stone||apex;
  const mats={fur:surfaceMaterial(style.fur,stone?'stone':'fur',{metalness:0,roughness:.97,flatShading:stone}),
    mane:surfaceMaterial(style.mane,stone?'stone':'fur'),bone:surfaceMaterial('#c5bda0','wood'),
    light:surfaceMaterial(stone?'#989b87':bear?'#b39565':apex?'#8a9880':'#b4bca7',stone?'stone':'fur'),
    bark:surfaceMaterial('#504b36','wood'),moss:surfaceMaterial('#596b3d','cloth'),
    dark:new THREE.MeshStandardMaterial({color:'#171b18',roughness:.75}),
    glow:new THREE.MeshStandardMaterial({color:style.glow,emissive:style.glow,emissiveIntensity:.85})};
  const joints={},rest=new Map();
  function joint(name,parent,pos){const g=new THREE.Group();g.name=name;g.position.set(...pos);parent.add(g);joints[name]=g;rest.set(g,g.position.clone());return g;}
  function mesh(parent,name,geometry,material,pos,scale=[1,1,1]){const m=new THREE.Mesh(geometry,material);m.name=name;m.position.set(...pos);m.scale.set(...scale);parent.add(m);return m;}
  function mass(parent,name,pos,scale,mat=mats.fur,rock=stone){return mesh(parent,name,rock?new THREE.IcosahedronGeometry(1,0):new THREE.SphereGeometry(1,14,10),mat,pos,scale);}
  function rod(parent,name,a,b,r1,r2,mat=mats.bone){const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b),d=q.clone().sub(p);const m=mesh(parent,name,new THREE.CylinderGeometry(r2,r1,d.length(),7),mat,p.add(q).multiplyScalar(.5).toArray());m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return m;}
  // Flattened, swept locks overlap the body instead of projecting like spikes.
  function tuft(parent,pos,length=.14,width=.06,material=mats.mane){
    const geometry=new THREE.ConeGeometry(width,length,5);
    const a=geometry.attributes.position;for(let i=0;i<a.count;i++){const y=a.getY(i);a.setXYZ(i,a.getX(i),y,a.getZ(i)*.36+Math.pow((y/length)+.5,2)*length*.23);}geometry.computeVertexNormals();
    const m=mesh(parent,'Fur lock',geometry,material,pos);m.rotation.x=-.65;return m;
  }
  const torso=joint('Torso',body,[0,biped?1.08:bear?.78:.68,0]);
  mass(torso,'Ribcage',[0,.04,0],biped?[apex?.40:.38,.44,.26]:bear?[.46,.43,.68]:[.245,.28,.55]);
  mass(torso,'Shoulder mantle',[0,biped?.27:.10,biped?0:.32],biped?[.51,.25,.29]:bear?[.49,.45,.43]:[.32,.34,.32],mats.mane);
  if(!stone){
    mass(torso,'Deep breast',[0,biped?.14:-.10,biped?.19:.32],biped?[.31,.32,.16]:bear?[.35,.32,.34]:[.23,.28,.29],mats.fur);
    mass(torso,'Tucked waist',[0,biped?-.27:-.03,biped?0:-.31],biped?[.25,.28,.19]:bear?[.36,.32,.37]:[.20,.21,.33]);
  }
  const head=joint('Head',torso,[0,biped?.61:.22,biped?.055:.54]);
  if(stone){
    mass(head,'Stone brow',[0,.04,0],[.23,.25,.20]);
    mass(head,'Stone jaw',[0,-.11,.08],[.19,.13,.17],mats.mane);
    mass(torso,'Living heart',[0,.16,.27],[.085,.14,.04],mats.glow);
    for(const sign of [-1,1]){
      for(let n=0;n<3;n++){const slab=mass(torso,'Overlapping shoulder shale',[sign*(.31+n*.08),.36-n*.06,.015],[.22,.13,.28],n===0?mats.light:mats.fur);slab.rotation.z=sign*(.18+n*.18);}
      for(let n=0;n<3;n++){const slab=mass(torso,'Rib armour',[sign*.19,.15-n*.17,.20],[.20,.11,.12],n%2?mats.fur:mats.light);slab.rotation.z=sign*-.22;}
      curved(torso,mats.bark,[[sign*.41,.47,.16],[sign*.31,.25,.28],[sign*.35,-.05,.24],[sign*.19,-.32,.16]],.027);
      curved(torso,mats.glow,[[sign*.055,.21,.29],[sign*.13,.29,.276],[sign*.20,.24,.28],[sign*.27,.31,.255]],.009);
      curved(torso,mats.glow,[[sign*.045,.05,.285],[sign*.10,-.035,.29],[sign*.075,-.12,.29]],.008);
      mass(torso,'Shoulder moss',[sign*.43,.43,.01],[.16,.047,.18],mats.moss);
      mass(head,'Heavy brow ridge',[sign*.12,.105,.15],[.14,.065,.10],mats.light);
      rod(head,'Carved cheek',[sign*.17,.04,.18],[sign*.13,-.13,.20],.035,.028,mats.light);
    }
    for(let n=0;n<4;n++)mass(torso,'Spine stone',[0,.38-n*.21,-.24],[.19,.13,.10],mats.light);
  }else{
    mass(head,'Skull',[0,.04,0],bear?[.29,.245,.25]:[.21,.245,.22]);
    mass(head,'Muzzle bridge',[0,-.012,.20],bear?[.19,.125,.21]:[.12,.11,.27],mats.fur);
    mass(head,'Muzzle tip',[0,-.065,bear?.32:.34],bear?[.16,.085,.12]:[.115,.074,.15],mats.light);
    mass(head,'Nose',[0,-.015,bear?.415:.455],[bear?.095:.075,.047,.038],mats.dark);
    const jaw=joint('Jaw',head,[0,-.115,.08]);mass(jaw,'Lower jaw',[0,-.005,.17],[bear?.15:.105,.046,bear?.21:.24],mats.light);
    mass(jaw,'Mouth interior',[0,.028,.16],[bear?.14:.096,.017,.205],mats.dark);
    for(const sign of [-1,1]){
      if(bear){mass(head,'Round ear',[sign*.225,.23,-.05],[.085,.10,.06],mats.mane);mass(head,'Ear lining',[sign*.23,.24,.001],[.05,.06,.013],mats.light);}
      else {const ear=mesh(head,'Pointed ear',new THREE.ConeGeometry(.09,.29,4),mats.mane,[sign*.16,.27,-.04]);ear.scale.z=.55;ear.rotation.z=-sign*.19;
        const lining=mesh(head,'Ear lining',new THREE.ConeGeometry(.056,.20,3),mats.light,[sign*.16,.29,.001]);lining.scale.z=.18;lining.rotation.z=-sign*.19;}
      // Upper canines remain attached to the skull while the jaw opens.
      rod(head,'Upper canine',[sign*.105,-.074,.27],[sign*.095,-.16,.29],.022,0);
      for(const z of [.20,.32])rod(jaw,'Lower tooth',[sign*.087,.018,z],[sign*.079,.064,z+.008],.014,0);
      const brow=mass(head,'Predatory brow',[sign*(bear?.17:.135),.115,.14],[bear?.13:.11,.055,.095],mats.mane);brow.rotation.z=sign*.20;
      for(let n=0;n<5;n++){const fur=tuft(head,[sign*(.17+n*.016),.04-n*.055,-.015],bear?.17:.23,.075,n%2?mats.fur:mats.light);fur.rotation.z=-sign*2.65;}
    }
    if(!biped){
      const tail=joint('Tail',torso,[0,.05,-.55]);
      if(bear)mass(tail,'Bear tail',[0,0,-.02],[.09,.10,.13],mats.mane);
      else {curved(tail,mats.fur,[[0,0,0],[0,-.09,-.24],[0,-.21,-.47],[0,-.17,-.65]],.09);for(let n=0;n<8;n++){const fur=tuft(tail,[0,-n*.027,-n*.079],.20,.09,n>5?mats.light:mats.mane);fur.rotation.x=-1.95;}}
    }
    if(!biped)for(let n=0;n<9;n++){const fur=tuft(torso,[0,bear?.40:.285,-.4+n*.105],.20,.115);fur.rotation.x=-1.75;}
    // Overlapping fur locks break the shoulder, belly and cheek silhouettes.
    for(const sign of [-1,1])for(let row=0;row<3;row++)for(let n=0;n<5;n++){
      const x=sign*(biped?.35:bear?.38:.25),y=biped?.28-row*.16:.10-row*.12,z=biped?-.16+n*.075:-.38+n*.18;
      const fur=tuft(torso,[x,y,z],apex?.26:bear?.22:.18,apex?.09:.075,n%3===0?mats.fur:mats.mane);fur.rotation.z=-sign*(2.65+row*.08);fur.rotation.x=-.65;
    }
    for(const sign of [-1,1])for(let n=0;n<6;n++){
      const fur=tuft(torso,[sign*(.06+n*.031),biped?.15-n*.022:-.035-n*.026,biped?.29:bear?.61:.53],bear?.22:.26,.075,mats.light);fur.rotation.z=-sign*(2.7-n*.06);fur.rotation.x=-.28;
    }
  }
  for(const sign of [-1,1]){
    mass(head,'Eye socket',[sign*(stone?.12:bear?.18:.15),.061,stone?.20:.185],[.051,.034,.038],mats.dark);
    const eye=mass(head,'Living eye',[sign*(stone?.12:bear?.18:.15),.065,stone?.23:.216],[.032,.013,.016],mats.glow);eye.rotation.z=sign*.16;
  }
  if(apex){
    for(const sign of [-1,1]){
      const crown=joint('Antler'+sign,head,[sign*.14,.19,-.08]);
      const points=[[0,0,0],[sign*.19,.20,-.10],[sign*.30,.43,-.12],[sign*.28,.64,-.015]];
      for(let n=0;n<points.length-1;n++)rod(crown,'Antler beam',points[n],points[n+1],.045-n*.01,.035-n*.013);
      rod(crown,'Antler tine',points[1],[sign*.32,.38,.12],.025,0);rod(crown,'Antler tine',points[2],[sign*.44,.59,.01],.020,0);
      rod(crown,'Lower crown tine',[sign*.11,.12,-.06],[sign*.35,.20,.12],.028,0);
      curved(torso,mats.bark,[[sign*.10,-.25,.23],[sign*.24,.01,.30],[sign*.30,.28,.27],[sign*.43,.41,.15]],.035);
      for(let n=0;n<3;n++)rod(torso,'Mantle thorn',[sign*(.33+n*.09),.35-n*.05,0],[sign*(.42+n*.12),.52-n*.02,-.10],.055,.005);
    }
    mass(torso,'Grove sigil',[0,.23,.33],[.055,.11,.026],mats.glow);
    for(const sign of [-1,1])curved(torso,mats.glow,[[sign*.04,.18,.329],[sign*.12,.12,.321],[sign*.14,.02,.292]],.008);
  }
  const limbs=[];
  for(const sign of [-1,1]){
    const count=biped?1:2;
    for(let n=0;n<count;n++){
      const front=n===0,x=sign*(biped?.23:bear?.28:.20),z=biped?0:front?.39:-.40;
      const upper=joint('Leg'+sign+':'+n,body,[x,biped?.79:bear?.73:.63,z]);
      const length=biped?.38:bear?.31:.26;
      mass(upper,'Haunch',[0,-length*.35,0],biped?[.18,.29,.19]:[bear?.17:.10,length*.75,.14]);
      const lower=joint('Shin'+sign+':'+n,upper,[0,-length,-.035]);
      rod(lower,'Lower leg',[0,0,0],[0,-length+.03,.075],biped?.12:bear?.11:.065,biped?.095:bear?.095:.052,mats.fur);
      const paw=joint('Paw'+sign+':'+n,lower,[0,-length+.025,.09]);
      mass(paw,'Paw',[0,0,.04],biped?[.17,.10,.23]:bear?[.16,.095,.20]:[.10,.075,.15],mats.mane);
      for(let c=-1;c<=1;c++){
        mass(paw,stone?'Split stone toe':'Toe',[c*(bear||biped?.075:.048),-.007,.13],[bear||biped?.062:.039,.058,.085],mats.fur);
        if(!stone)rod(paw,'Claw',[c*(bear||biped?.075:.048),-.015,.19],[c*(bear||biped?.08:.05),-.038,bear?.31:.26],bear?.025:.017,0);
      }
      limbs.push({upper,lower,paw,id:(sign>0?'L':'R')+(biped?'':n),phase:((sign>0)==front)?0:Math.PI,sign,front});
    }
    if(biped){
      const arm=joint('Arm'+sign,torso,[sign*.46,.23,0]);
      mass(arm,'Upper arm',[sign*.035,-.15,0],stone?[.20,.25,.21]:[.16,.27,.17]);
      const fore=joint('Forearm'+sign,arm,[sign*.06,-.36,.01]);
      mass(fore,'Forearm',[0,-.16,.02],stone?[.18,.24,.19]:[.14,.25,.17],mats.mane);
      mass(fore,stone?'Granite fist':'Clawed hand',[0,-.36,.075],stone?[.23,.20,.22]:[.16,.13,.18]);
      if(stone){
        for(let n=0;n<3;n++){const slab=mass(fore,'Forearm shale',[sign*.035,-.03-n*.14,.105],[.21,.105,.14],n%2?mats.fur:mats.light);slab.rotation.z=sign*-.15;}
        curved(fore,mats.glow,[[sign*.05,-.02,.21],[sign*.015,-.12,.22],[sign*.08,-.20,.22],[sign*.04,-.29,.25]],.009);
        for(let n=-1;n<=1;n++)mass(fore,'Granite knuckle',[n*.11,-.38,.22],[.068,.105,.071],mats.light);
      }
      if(apex)for(let n=-1;n<=1;n++)rod(fore,'Rending claw',[n*.07,-.40,.15],[n*.085,-.54,.23],.033,0);
      if(apex)for(let n=0;n<5;n++){const fur=tuft(fore,[sign*.13,-n*.07,-.035],.18,.06);fur.rotation.z=-sign*2.4;}
    }
  }
  // Merge only rigid pieces under each joint. Silhouette detail adds triangles,
  // not a draw call per lock, claw, root or plate; animated joints stay intact.
  const moving=new Set(Object.values(joints));
  for(const j of moving)combineStatic(j,new Set([...moving].filter(other=>other!==j)));
  const bounds=new THREE.Box3();
  const direction=new THREE.Vector3(),bend=new THREE.Vector3(),knee=new THREE.Vector3(),target=new THREE.Vector3();
  const inverse=new THREE.Quaternion(),chain=new THREE.Quaternion(),pitchRotation=new THREE.Quaternion(),xAxis=new THREE.Vector3(1,0,0);
  const legRest=new Map(limbs.map(l=>[l,{a:rest.get(l.lower).clone(),b:rest.get(l.paw).clone()}]));
  function sample(pose,depth=0){
    const context=pose.ex?.animation,requested=pose.state==='run'?'walk':pose.state||'idle';
    const state=pose.ex?.airborne&&!['death','dead'].includes(requested)?'airborne':requested,dead=state==='dead'||state==='death';
    const t=Math.max(0,Math.min(1,pose.t||0)),cycle=context?.phase??pose.ex?.walkPh??(pose.t||0)*Math.PI*2;
    const gait=gaitProfile('wildkeeper',formId,context?.speed??pose.ex?.speed??3),rot={},pos={},bodyRot=[0,0,0],bodyPos=[0,0,0];
    const set=(name,x=0,y=0,z=0)=>{rot[name]=[x,y,z];};
    const add=(name,x=0,y=0,z=0)=>{const r=rot[name]||(rot[name]=[0,0,0]);r[0]+=x;r[1]+=y;r[2]+=z;};
    const shift=(name,x,y,z)=>{pos[name]=[x,y,z];};
    const idle=(pose.t||0)*Math.PI*2/3,breath=state==='idle'?Math.sin(idle)*.008:0;
    set('Head',state==='idle'?Math.sin(idle)*.023:0);
    if(joints.Tail)set('Tail',0,state==='idle'?Math.sin(idle)*.085:['walk','charge'].includes(state)?Math.sin(cycle-.55)*.13:0);
    let contacts=context?.feet?.map(f=>({...f}))||gait.feet.map(f=>['walk','charge'].includes(state)?footPath(cycle/(Math.PI*2),gait,f):{...f,y:0,pitch:0,contact:true});
    if(state==='walk'||state==='charge'){
      const stride=Math.sin(cycle),bounce=Math.cos(cycle*2);
      set('Torso',(bear?.035:stone?.06:.045)+(state==='charge'?.16:0),stride*(biped?.045:.02),stride*(bear?.05:.025));
      shift('Torso',0,bounce*(bear?.018:.012),0);set('Head',-bounce*.025,-stride*.025,-stride*.018);
      if(biped)for(const sign of [-1,1])set('Arm'+sign,-Math.sin(cycle+(sign>0?0:Math.PI))*(stone?.20:.40),0,sign*.035);
    }
    if(['attack','cast','hit','spin','channel','draw'].includes(state)){
      const source=state==='channel'?'cast':state==='spin'||state==='draw'?'attack':state;
      const phase=state==='channel'?.43:state==='spin'?.46:state==='draw'?.30:animationPhase(source,t,null,context?.releases);
      const gather=smooth(phase/.22)*(1-smooth((phase-.22)/.18)),drive=smooth((phase-.22)/.18)*(1-smooth((phase-.64)/.36));
      const pulse=source==='hit'?Math.sin(Math.PI*smooth(t))*Math.exp(-t*2):Math.max(gather,drive);
      if(source==='hit'){set('Torso',-.18*pulse,0,(stone?-.06:.1)*pulse);set('Head',-.16*pulse);}
      else if(source==='cast'){
        set('Torso',.10*gather-.13*drive,0,0);set('Head',.10*gather-(bear?.34:.24)*drive);
        shift('Torso',0,-.06*gather+.015*drive,0);
        if(biped)for(const sign of [-1,1]){set('Arm'+sign,-.45*gather-1.35*drive,sign*.1*drive,sign*(stone?.26:.48)*drive);set('Forearm'+sign,-.55*gather-.25*drive);}
        if(joints.Jaw)set('Jaw',.48*drive);
      }else if(biped){
        set('Torso',-.10*gather+.18*drive,-.26*gather+.32*drive,-.035*drive);set('Head',.05*gather-.12*drive,.12*gather-.15*drive);
        set('Arm1',-(stone?1.2:.85)*gather-(stone?.95:.6)*drive,-.2*gather+.45*drive,.16*gather+.34*drive);
        set('Forearm1',-.70*gather+.13*drive);set('Arm-1',-.18*gather+.18*drive,0,-.18*drive);
        shift('Torso',0,-.06*drive,.035*drive);
        if(joints.Jaw)set('Jaw',.38*drive);
      }else if(bear){
        set('Torso',-.08*gather+.13*drive,-.13*gather+.20*drive,-.10*drive);
        set('Head',-.12*drive,-.1*drive);set('Jaw',.36*drive);
        const paw=contacts.find(f=>f.id==='L0');if(paw){paw.y+=.20*gather+.14*drive;paw.z+=.12*drive;paw.contact=pulse<.01;}
      }else{
        set('Torso',-.06*gather+.14*drive,0,0);shift('Torso',0,-.045*drive,-.035*gather+.16*drive);
        set('Head',-.08*gather+.20*drive);set('Jaw',.52*gather+.18*drive);set('Tail',.12*gather-.16*drive,0,0);
      }
    }
    if(state==='kick'){
      const chamber=smooth(t/.24)*(1-smooth((t-.5)/.5)),drive=smooth((t-.24)/.26)*(1-smooth((t-.5)/.5));
      const leg=biped?limbs[1]:limbs.find(l=>l.front);
      set(leg.upper.name,-chamber*.95-drive*.45);set(leg.lower.name,chamber*1.3-drive*1.15);set(leg.paw.name,chamber*-.35+drive*1.6);
      set('Torso',-drive*.12);set('Head',drive*.10);
      const foot=contacts.find(f=>f.id===leg.id);foot.y+=(biped?.5:.24)*drive+.16*chamber;foot.z+=(biped?.6:.27)*drive;foot.contact=drive+chamber<.001;
    }
    if(state==='reach'||state==='search'){
      const w=smooth(t/.38)*(1-smooth((t-.6)/.4)),search=state==='search';
      set('Torso',(search?.25:.12)*w);set('Head',(search?.32:.16)*w);
      shift('Torso',0,-(search?.06:.025)*w,.035*w);
      if(biped){set('Arm1',-.95*w,0,.18*w);set('Forearm1',-.35*w);}
      else {const paw=contacts.find(f=>f.id==='L0');if(paw){paw.y+=.12*w;paw.z+=.19*w;paw.contact=w<.001;}}
    }
    if(state==='airborne'){
      const tuck=Math.sin(t*Math.PI);set('Torso',.10*tuck);set('Head',-.12*tuck);
      for(const leg of limbs){set(leg.upper.name,-.45*tuck);set(leg.lower.name,.85*tuck);set(leg.paw.name,-.2*tuck);}
      if(biped)for(const sign of [-1,1])set('Arm'+sign,-.4*tuck,0,sign*.15*tuck);
      contacts=null;
    }
    if(dead){
      // Knees yield first; the heavy body then falls, contacts the floor, settles.
      const u=state==='dead'?1:t,collapse=smooth((u-.14)/.72),settle=smooth((u-.86)/.14),side=stone?-1:1;
      bodyRot[2]=side*(Math.PI/2*collapse+.035*Math.sin(settle*Math.PI));
      bodyPos[0]=side*(apex?1.1:stone?.95:.45)*collapse;
      bodyPos[1]=-.08*Math.sin(Math.PI*u);
      set('Head',.2*collapse);set('Torso',.13*Math.sin(Math.PI*u),0,0);
      for(const leg of limbs){set(leg.upper.name,-.3*collapse-.12*Math.sin(Math.PI*u));set(leg.lower.name,.6*collapse);}
      if(joints.Jaw)set('Jaw',.22*collapse);
      if(biped)for(const sign of [-1,1]){set('Arm'+sign,.16*collapse,0,sign*.16*collapse);set('Forearm'+sign,-.23*collapse);}
      contacts=null;
    }
    if(context&&!dead){
      add('Torso',(context.lean||0)*.7,0,-(context.turn||0)*.01);add('Head',-(context.lean||0)*.45,(context.turn||0)*.012);
      if(joints.Tail)add('Tail',-(context.secondary||0)*.2,-(context.secondary||0)*.6);
      bodyPos[1]-=(context.landing||0)*(biped?.095:.055);
      const hit=context.reaction;if(hit)add('Torso',-.10*Math.cos(hit.direction)*hit.weight,0,.09*Math.sin(hit.direction)*hit.weight);
    }
    const result={rot,pos,bodyRot,bodyPos,breath,contacts,state,gait};
    const transition=context?.blend;
    if(transition&&transition.weight<1&&depth<6){
      const old=sample(transition.from,depth+1),w=transition.weight;
      result.from=old;result.blendWeight=w;
      if(contacts&&old.contacts)for(const foot of contacts){
        const previous=old.contacts.find(f=>f.id===foot.id);if(!previous||foot.contact&&previous.contact)continue;
        for(const key of ['x','y','z','pitch'])foot[key]=(previous[key]||0)+((foot[key]||0)-(previous[key]||0))*w;
        foot.contact=foot.contact&&previous.contact;
      }
    }
    return result;
  }
  let evaluatedContacts=null;
  function animate(pose={}){
    const p=sample(pose);
    evaluatedContacts=p.contacts;
    root.position.y=0;applyPose(p);
    function applyPose(s){
      for(const [j,pos] of rest){j.position.copy(pos);j.rotation.set(...(s.rot[j.name]||[0,0,0]));const offset=s.pos[j.name];if(offset)j.position.add(target.set(...offset));}
      torso.scale.set(1,1+s.breath,1);body.rotation.set(...s.bodyRot);body.position.set(...s.bodyPos);
      if(s.contacts)solveContacts(s.contacts);
      if(s.from){
        const saved=[...rest.keys()].map(j=>({j,position:j.position.clone(),quaternion:j.quaternion.clone()}));
        const bodyPosition=body.position.clone(),bodyRotation=body.quaternion.clone(),scale=torso.scale.y;
        applyPose(s.from);
        saved.forEach(({j,position,quaternion})=>{j.position.lerp(position,s.blendWeight);j.quaternion.slerp(quaternion,s.blendWeight);});
        body.position.lerp(bodyPosition,s.blendWeight);body.quaternion.slerp(bodyRotation,s.blendWeight);torso.scale.y+=(scale-torso.scale.y)*s.blendWeight;
        if(s.contacts&&s.from.contacts)solveContacts(s.contacts);
      }
    }
    function solveContacts(contacts){
      // Solve paws in body space. The four feet retain independent support phases.
      for(const leg of limbs){
        const foot=contacts.find(f=>f.id===leg.id);if(!foot)continue;
        const r=legRest.get(leg),length=r.a.length()+r.b.length()-.003;
        const dx=foot.x-leg.upper.position.x,dz=foot.z-leg.upper.position.z;
        const y=(biped?.10:bear?.095:.075)+foot.y;
        body.position.y=Math.min(body.position.y,Math.sqrt(Math.max(.04,length*length-dx*dx-dz*dz))+y-leg.upper.position.y-.01);
      }
      for(const leg of limbs){
        const foot=contacts.find(f=>f.id===leg.id);if(!foot)continue;
        const r=legRest.get(leg),l1=r.a.length(),l2=r.b.length();
        target.set(foot.x,(biped?.10:bear?.095:.075)+foot.y,foot.z).sub(body.position).sub(leg.upper.position);
        const distance=Math.min(l1+l2-.00001,Math.max(.08,target.length()));direction.copy(target).normalize();
        bend.set(0,0,leg.front||biped?1:-1).addScaledVector(direction,-direction.z*(leg.front||biped?1:-1)).normalize();
        const along=(l1*l1-l2*l2+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,l1*l1-along*along));
        knee.copy(direction).multiplyScalar(along).addScaledVector(bend,height);
        leg.upper.quaternion.setFromUnitVectors(r.a.clone().normalize(),direction.copy(knee).normalize());
        inverse.copy(leg.upper.quaternion).invert();direction.copy(target).sub(knee).applyQuaternion(inverse).normalize();
        leg.lower.quaternion.setFromUnitVectors(r.b.clone().normalize(),direction);
        chain.copy(leg.upper.quaternion).multiply(leg.lower.quaternion).invert();pitchRotation.setFromAxisAngle(xAxis,foot.pitch||0);leg.paw.quaternion.copy(chain).multiply(pitchRotation);
      }
    }
    root.updateMatrixWorld(true);
    function groundWeight(s){const own=s.state==='airborne'?0:1;return s.from?groundWeight(s.from)*(1-s.blendWeight)+own*s.blendWeight:own;}
    const support=groundWeight(p);
    if(support>0){
      bounds.setFromObject(root);
      root.position.y=-bounds.min.y*support;root.updateMatrixWorld(true);
    }
  }
  function dispose(){const geometries=new Set();root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);});geometries.forEach(g=>g.dispose());disposeMaterials(Object.values(mats));}
  animate({state:'idle',t:0});
  return {root,classId:'wildkeeper',formId,joints,animate,equip(){},dispose,get contacts(){return evaluatedContacts;}};
}
