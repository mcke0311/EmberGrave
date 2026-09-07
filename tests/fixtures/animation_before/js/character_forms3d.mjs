/* Wildkeeper shapes share the live Three.js scene and world-space foot anchor. */
import * as THREE from './vendor/three/three.module.min.js';
import {surfaceMaterial,disposeMaterials} from './character_materials3d.mjs';
import {smooth,animationPhase} from './character_animation3d.mjs?v=6';

export const FORM_STYLES=Object.freeze({
  form_fang:{name:'Wolf Form',footprint:1.1,fur:'#53534a',mane:'#34392e',glow:'#c5d787',stride:.65},
  form_brute:{name:'Bear Form',footprint:1.5,fur:'#594331',mane:'#322b23',glow:'#c8ad71',stride:.36},
  form_stone:{name:'Stone Form',footprint:1.12,fur:'#72756b',mane:'#404b3b',glow:'#83ce83',stride:.26},
  form_apex:{name:'Wrath of the Wild',footprint:1.45,fur:'#353e30',mane:'#232b22',glow:'#a4e96c',stride:.55}
});

export function createWildshape(formId){
  const style=FORM_STYLES[formId];if(!style)throw Error('Unknown 3D Wildkeeper form: '+formId);
  const root=new THREE.Group();root.name=style.name;
  const body=new THREE.Group();root.add(body);
  const stone=formId==='form_stone',apex=formId==='form_apex',bear=formId==='form_brute',biped=stone||apex;
  const mats={fur:surfaceMaterial(style.fur,stone?'metal':'cloth',{metalness:0,roughness:.97,flatShading:stone}),
    mane:surfaceMaterial(style.mane,'leather'),bone:surfaceMaterial('#b6aa87','wood'),
    dark:new THREE.MeshStandardMaterial({color:'#171b18',roughness:.75}),
    glow:new THREE.MeshStandardMaterial({color:style.glow,emissive:style.glow,emissiveIntensity:.85})};
  const joints={},rest=new Map();
  function joint(name,parent,pos){const g=new THREE.Group();g.name=name;g.position.set(...pos);parent.add(g);joints[name]=g;rest.set(g,g.position.clone());return g;}
  function mesh(parent,name,geometry,material,pos,scale=[1,1,1]){const m=new THREE.Mesh(geometry,material);m.name=name;m.position.set(...pos);m.scale.set(...scale);parent.add(m);return m;}
  function mass(parent,name,pos,scale,mat=mats.fur,rock=stone){return mesh(parent,name,rock?new THREE.IcosahedronGeometry(1,0):new THREE.SphereGeometry(1,14,10),mat,pos,scale);}
  function rod(parent,name,a,b,r1,r2,mat=mats.bone){const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b),d=q.clone().sub(p);const m=mesh(parent,name,new THREE.CylinderGeometry(r2,r1,d.length(),7),mat,p.add(q).multiplyScalar(.5).toArray());m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return m;}
  function tuft(parent,pos,length=.14,width=.06){const m=mesh(parent,'Fur tuft',new THREE.ConeGeometry(width,length,5),mats.mane,pos);m.rotation.x=-.65;return m;}
  const torso=joint('Torso',body,[0,biped?1.08:bear?.78:.68,0]);
  mass(torso,'Ribcage',[0,.04,0],biped?[.38,.44,.23]:bear?[.42,.42,.68]:[.26,.26,.56]);
  mass(torso,'Shoulder mantle',[0,biped?.27:.10,biped?0:.32],biped?[.50,.24,.27]:bear?[.45,.40,.40]:[.31,.32,.31],mats.mane);
  const head=joint('Head',torso,[0,biped?.61:.22,biped?.055:.54]);
  if(stone){
    mass(head,'Stone brow',[0,.04,0],[.22,.25,.19]);
    mass(head,'Stone jaw',[0,-.11,.08],[.19,.13,.17],mats.mane);
    mass(torso,'Living heart',[0,.16,.25],[.10,.16,.07],mats.glow);
    for(const sign of [-1,1]){
      for(let n=0;n<3;n++)mass(torso,'Layered granite',[sign*(.32+n*.07),.32-n*.02,0],[.18,.17,.21]);
      rod(torso,'Root binding',[sign*.36,.4,.2],[sign*.22,-.25,.22],.02,.018,mats.mane);
    }
  }else{
    mass(head,'Skull',[0,.04,0],bear?[.25,.23,.24]:[.205,.24,.20]);
    mass(head,'Muzzle',[0,-.045,.19],bear?[.18,.13,.20]:[.13,.11,.25],mats.mane);
    mass(head,'Nose',[0,-.015,bear?.36:.40],[.085,.062,.065],mats.dark);
    const jaw=joint('Jaw',head,[0,-.115,.08]);mass(jaw,'Lower jaw',[0,0,.12],[.11,.05,.21],mats.mane);
    for(const sign of [-1,1]){
      if(bear)mass(head,'Round ear',[sign*.19,.21,-.05],[.09,.095,.045],mats.mane);
      else {const ear=mesh(head,'Pointed ear',new THREE.ConeGeometry(.10,.28,4),mats.mane,[sign*.15,.25,-.035]);ear.rotation.z=-sign*.17;}
      for(const z of [.20,.30])rod(jaw,'Fang',[sign*.087,.015,z],[sign*.075,.08,z+.008],.018,0);
      for(let n=0;n<4;n++){const fur=tuft(head,[sign*(.15+n*.023),-.04-n*.055,-.04],.18,.075);fur.rotation.z=-sign*2.1;}
    }
    if(!biped){
      const tail=joint('Tail',torso,[0,.05,-.55]);
      if(bear)mass(tail,'Bear tail',[0,0,-.02],[.09,.10,.13],mats.mane);
      else {rod(tail,'Tail',[0,0,0],[0,-.20,-.58],.115,.035,mats.mane);for(let n=0;n<5;n++)tuft(tail,[0,-n*.038,-n*.10],.15,.065);}
    }
    for(let n=0;n<7;n++)tuft(torso,[0,.31,-.4+n*.13],.18,.095);
    // Overlapping fur locks break the shoulder, belly and cheek silhouettes.
    for(const sign of [-1,1])for(let row=0;row<3;row++)for(let n=0;n<5;n++){
      const x=sign*(biped?.35:bear?.38:.25),y=biped?.28-row*.16:.10-row*.12,z=biped?-.16+n*.075:-.38+n*.18;
      const fur=tuft(torso,[x,y,z],apex?.22:bear?.16:.14,apex?.075:.052);fur.rotation.z=-sign*(2.1+row*.15);fur.rotation.x=-.3;
    }
  }
  for(const sign of [-1,1])mass(head,'Living eye',[sign*(stone?.12:.145),.065,stone?.177:.14],[.035,.022,.025],mats.glow);
  if(apex){
    for(const sign of [-1,1]){
      const crown=joint('Antler'+sign,head,[sign*.14,.19,-.08]);
      const points=[[0,0,0],[sign*.16,.25,-.10],[sign*.25,.48,-.08],[sign*.20,.65,.02]];
      for(let n=0;n<points.length-1;n++)rod(crown,'Antler beam',points[n],points[n+1],.045-n*.01,.035-n*.013);
      rod(crown,'Antler tine',points[1],[sign*.32,.38,.12],.025,0);rod(crown,'Antler tine',points[2],[sign*.44,.59,.01],.020,0);
    }
    mass(torso,'Grove sigil',[0,.23,.27],[.07,.13,.035],mats.glow);
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
      for(let c=-1;c<=1;c++)rod(paw,'Claw',[c*.045,-.015,.16],[c*.05,-.025,.25],.025,0);
      limbs.push({upper,lower,paw,phase:((sign>0)==front)?0:Math.PI,sign,front});
    }
    if(biped){
      const arm=joint('Arm'+sign,torso,[sign*.46,.23,0]);
      mass(arm,'Upper arm',[sign*.035,-.15,0],stone?[.20,.25,.21]:[.16,.27,.17]);
      const fore=joint('Forearm'+sign,arm,[sign*.06,-.36,.01]);
      mass(fore,'Forearm',[0,-.16,.02],stone?[.18,.24,.19]:[.14,.25,.17],mats.mane);
      mass(fore,stone?'Granite fist':'Clawed hand',[0,-.36,.075],stone?[.23,.20,.22]:[.16,.13,.18]);
      if(apex)for(let n=-1;n<=1;n++)rod(fore,'Rending claw',[n*.07,-.40,.15],[n*.085,-.54,.23],.033,0);
      if(apex)for(let n=0;n<5;n++){const fur=tuft(fore,[sign*.13,-n*.07,-.035],.18,.06);fur.rotation.z=-sign*2.4;}
    }
  }
  const bounds=new THREE.Box3();
  function animate(pose={}){
    for(const [j,pos] of rest){j.position.copy(pos);j.rotation.set(0,0,0);}body.rotation.set(0,0,0);body.position.set(0,0,0);root.position.y=0;
    const state=pose.state==='run'?'walk':pose.state||'idle',dead=state==='dead'||state==='death';
    const t=Math.max(0,Math.min(1,pose.t||0)),cycle=pose.ex?.walkPh??(pose.t||0)*Math.PI*2;
    const idleCycle=(pose.t||0)*Math.PI*2/3,breath=state==='idle'?Math.sin(idleCycle)*.009:0;
    torso.scale.set(1,1+breath,1);head.rotation.x=state==='idle'?Math.sin(idleCycle)*.025:0;
    if(joints.Tail)joints.Tail.rotation.y=state==='idle'?Math.sin(idleCycle)*.12:state==='walk'?Math.sin(cycle)*.15:0;
    if(state==='walk'&&!pose.ex?.airborne){
      for(const leg of limbs){const s=Math.sin(cycle+leg.phase);leg.upper.rotation.x=s*style.stride;leg.lower.rotation.x=Math.max(0,-s)*style.stride*.7;leg.paw.rotation.x=-leg.upper.rotation.x-leg.lower.rotation.x;}
      torso.rotation.z=Math.sin(cycle)*.025;torso.position.y+=Math.cos(cycle*2)*.015;
      for(const sign of [-1,1])if(joints['Arm'+sign])joints['Arm'+sign].rotation.x=-Math.sin(cycle+(sign>0?0:Math.PI))*.32;
    }
    if(state==='attack'||state==='cast'||state==='hit'){
      const phase=animationPhase(state,t,null),peak=state==='hit'?.18:.4;
      const pulse=phase<peak?smooth(phase/peak):1-smooth((phase-peak)/(1-peak)),strike=pulse;
      torso.rotation.x=(state==='hit'?-.16:state==='cast'?-.12:.18)*pulse;head.rotation.x+=(state==='hit'?-.20:-.30)*pulse;
      if(joints.Jaw)joints.Jaw.rotation.x=pulse*.45;
      if(biped)for(const sign of [-1,1]){joints['Arm'+sign].rotation.x=(state==='cast'?-1.65:sign>0?-1.2:.35)*pulse;joints['Forearm'+sign].rotation.x=-.5*pulse;}
      else {torso.position.z+=(state==='attack'?.23:0)*strike;for(const leg of limbs)if(leg.front)leg.upper.rotation.x=-pulse*(bear?.6:.4);}
    }
    if(state==='kick'&&!pose.ex?.airborne){
      const chamber=smooth(t/.24)*(1-smooth((t-.5)/.5)),drive=smooth((t-.24)/.26)*(1-smooth((t-.5)/.5));
      const leg=biped?limbs[1]:limbs.find(l=>l.front);
      leg.upper.rotation.x=-chamber*.95-drive*.45;leg.lower.rotation.x=chamber*1.3-drive*1.15;
      leg.paw.rotation.x=-leg.upper.rotation.x-leg.lower.rotation.x;
      torso.rotation.x=-drive*.12;head.rotation.x=drive*.10;
    }
    if(dead){const collapse=state==='dead'?1:smooth(t),side=stone?-1:1;body.rotation.z=side*Math.PI/2*collapse;body.position.x=side*(apex?1.1:stone?.95:.45)*collapse;head.rotation.x=.2*collapse;for(const leg of limbs){leg.upper.rotation.x=-.3*collapse;leg.lower.rotation.x=.6*collapse;}if(joints.Jaw)joints.Jaw.rotation.x=.22*collapse;}
    root.updateMatrixWorld(true);bounds.setFromObject(root);root.position.y=-bounds.min.y;root.updateMatrixWorld(true);
  }
  function dispose(){const geometries=new Set();root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);});geometries.forEach(g=>g.dispose());disposeMaterials(Object.values(mats));}
  animate({state:'idle',t:0});
  return {root,classId:'wildkeeper',formId,joints,animate,equip(){},dispose};
}
