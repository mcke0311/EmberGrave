/* Wildkeeper shapes share the live Three.js scene and world-space foot anchor. */
import * as THREE from './vendor/three/three.module.min.js';
import {surfaceMaterial,disposeMaterials} from './character_materials3d.mjs?v=painted-1';
import {surface,tapered} from './character_painted3d.mjs?v=mantles-1';
import {formPanel} from './character_finish3d.mjs?v=mantles-1';
import {smooth,animationPhase} from './character_animation3d.mjs?v=bow-draw-1';
import {applyCinematicForm} from './character_cinematic3d.mjs';
import {gaitProfile,footPath} from './character_motion3d.mjs?v=bow-draw-1';
import {combineStatic,curved} from './character_mesh3d.mjs';

export const FORM_STYLES=Object.freeze({
  form_fang:{name:'Wolf Form',footprint:1.1,fur:'#737d79',mane:'#353f40',glow:'#c3e7b3',stride:.65},
  form_brute:{name:'Bear Form',footprint:1.5,fur:'#72543a',mane:'#3b3028',glow:'#e8bf72',stride:.36},
  form_stone:{name:'Stone Form',footprint:1.12,fur:'#777e77',mane:'#424d43',glow:'#93d9b0',stride:.26},
  form_apex:{name:'Wrath of the Wild',footprint:1.45,fur:'#434e43',mane:'#252f2c',glow:'#b7e98a',stride:.55}
});

// Horizontal sections give the face a single continuous painting between
// the cheeks, eyes and nose. The lower jaw remains on its attack hinge.
function beastHead(stone,bear) {
  const width=stone?.232:bear?.292:.214;
  const rings=stone?
    [[-.171,.47,.12,-.09,.015],[-.115,.74,.21,-.15,.12],[-.048,.93,.234,-.19,.31],
      [.037,1,.232,-.20,.51],[.099,.99,.238,-.197,.68],[.17,.94,.205,-.18,.83],[.226,.74,.14,-.155,.94],[.252,.45,.06,-.09,.985],[.255,.04,.007,-.008,1]]:
    [[-.107,.34,.31,-.065,.015],[-.079,.44,.41,-.11,.056],[-.030,.60,bear?.431:.468,-.161,.125],
      [.006,.78,bear?.37:.396,-.197,.28],[.059,.97,.287,-.213,.51],[.112,1,.218,-.22,.70],
      [.179,.93,.165,-.196,.84],[.235,.71,.109,-.153,.94],[.273,.29,.045,-.066,.985],[.277,.015,.005,-.005,1]];
  return surface(stone?16:40,rings.length-1,(u,v)=>{
    const [y,w,front,back,t]=rings[Math.round(v*(rings.length-1))],a=(u-.5)*Math.PI*2;
    const x=Math.sin(a),z=Math.cos(a);
    const muzzle=z>0?front*Math.pow(z,stone?.66:1.65):(-back)*z;
    return [width*w*x,y,muzzle,u,t];
  });
}

function quadrupedBody(bear) {
  // From the tail root across the tucked flank to the forechest. Fur strokes
  // run toward the hock on both sides, with the UV seam under the belly.
  const stations=bear?
    [[-.66,.10,.14,.03],[-.52,.29,.31,.05],[-.31,.39,.355,.035],[-.05,.42,.39,.045],[.25,.46,.45,.085],[.43,.415,.40,.10],[.58,.26,.29,.14],[.62,.11,.17,.16]]:
    [[-.59,.07,.10,.005],[-.49,.201,.225,.025],[-.34,.199,.202,.050],[-.16,.175,.183,.055],[.045,.228,.257,.045],[.27,.286,.32,.052],[.43,.246,.294,.086],[.55,.14,.19,.15]];
  return surface(32,stations.length-1,(u,v)=>{
    const [z,rx,ry,y]=stations[Math.round(v*(stations.length-1))],a=u*2*Math.PI;
    return [rx*Math.sin(a),y-ry*Math.cos(a),z,v,.025+.95*(.5-.5*Math.cos(a))];
  });
}

function lowerJaw(bear) {
  const sections=[[-.085,.029,.066,.030],[-.024,.090,.100,.026],[.057,.113,.082,.024],
    [.16,.105,.052,.022],[.244,.084,.043,.020],[.298,.066,.037,.023],[.326,.044,.025,.025],[.341,.006,.009,.030]];
  return surface(20,sections.length-1,(u,v)=>{
    const [z,w,h,lip]=sections[Math.round(v*(sections.length-1))],a=u*2*Math.PI,c=Math.cos(a);
    return [Math.sin(a)*w*(bear?1.18:.88),lip-(1+c)*h*.5,z*(bear?.92:1),
      .16+.63*v,.32+.31*(1-c)*.5];
  });
}

export function createWildshape(formId){
  const style=FORM_STYLES[formId];if(!style)throw Error('Unknown 3D Wildkeeper form: '+formId);
  const root=new THREE.Group();root.name=style.name;
  const body=new THREE.Group();root.add(body);
  const stone=formId==='form_stone',apex=formId==='form_apex',bear=formId==='form_brute',biped=stone||apex;
  const flank=(rect,extra)=>formPanel(formId,0,rect,{flatShading:stone,...extra});
  const mats={fur:flank([0,0,1,1]),mane:flank([.08,.04,.72,.89],{color:'#e1d8cb'}),
    face:formPanel(formId,3,undefined,{flatShading:stone}),paw:formPanel(formId,2),
    bone:surfaceMaterial('#c5bda0','wood'),light:flank([.53,.34,.46,.64],{color:'#f6ead4'}),
    bark:flank([.65,.09,.34,.90]),moss:flank([.02,.46,.34,.52],{color:'#98ac72'}),
    claw:surfaceMaterial('#705d46','wood',{roughness:.74}),
    dark:new THREE.MeshStandardMaterial({color:'#321e1c',roughness:.94}),
    glow:new THREE.MeshStandardMaterial({color:style.glow,emissive:style.glow,emissiveIntensity:.85})};
  const joints={},rest=new Map();
  function joint(name,parent,pos){const g=new THREE.Group();g.name=name;g.position.set(...pos);parent.add(g);joints[name]=g;rest.set(g,g.position.clone());return g;}
  function mesh(parent,name,geometry,material,pos,scale=[1,1,1]){const m=new THREE.Mesh(geometry,material);m.name=name;m.position.set(...pos);m.scale.set(...scale);parent.add(m);return m;}
  function mass(parent,name,pos,scale,mat=mats.fur,rock=stone){return mesh(parent,name,rock?new THREE.IcosahedronGeometry(1,0):new THREE.SphereGeometry(1,14,10),mat,pos,scale);}
  function rod(parent,name,a,b,r1,r2,mat=mats.bone){const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b),d=q.clone().sub(p);const m=mesh(parent,name,new THREE.CylinderGeometry(r2,r1,d.length(),7),mat,p.add(q).multiplyScalar(.5).toArray());m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return m;}
  // Flattened, swept locks overlap the body instead of projecting like spikes.
  function tuft(parent,pos,length=.14,width=.06,material=mats.mane){
    const geometry=surface(8,7,(u,v)=>{
      const a=u*Math.PI*2,r=(1-v)*(.60+.50*Math.sin(v*Math.PI));
      return [Math.sin(a)*width*r,(v-.5)*length,Math.cos(a)*width*.55*r+v*v*length*.36,.42+.18*Math.cos(a),.28+.49*(1-v)];
    });
    const m=mesh(parent,'Fur lock',geometry,material,pos);m.rotation.x=-.65;return m;
  }
  const torso=joint('Torso',body,[0,biped?1.08:bear?.78:.68,0]);
  if(biped){
    mass(torso,'Ribcage',[0,.04,0],[apex?.40:.38,.44,.26]);
    mass(torso,'Shoulder mantle',[0,.27,0],[.51,.25,.29],mats.mane);
    if(apex){
      mass(torso,'Deep breast',[0,.14,.19],[.31,.32,.16]);
      mass(torso,'Tucked waist',[0,-.27,0],[.25,.28,.19]);
    }
  }else{
    mesh(torso,'Flank and breast',quadrupedBody(bear),mats.fur,[0,0,0]);
    if(bear)mass(torso,'Winter ruff',[0,.13,.35],[.47,.43,.34],mats.mane);
  }
  const head=joint('Head',torso,[0,biped?.61:.22,biped?.055:.54]);
  mesh(head,'Painted head',beastHead(stone,bear),mats.face,[0,0,0]);
  if(stone){
    mass(head,'Mandible shale',[0,-.14,.014],[.181,.096,.153],mats.mane);
    mass(torso,'Living heart',[0,.16,.27],[.085,.14,.04],mats.glow);
    for(const sign of [-1,1]){
      for(let n=0;n<3;n++){const slab=mass(torso,'Overlapping shoulder shale',[sign*(.31+n*.08),.36-n*.06,.015],[.22,.13,.28],n===0?mats.light:mats.fur);slab.rotation.z=sign*(.18+n*.18);}
      for(let n=0;n<3;n++){const slab=mass(torso,'Rib armour',[sign*.19,.15-n*.17,.20],[.20,.11,.12],n%2?mats.fur:mats.light);slab.rotation.z=sign*-.22;}
      curved(torso,mats.bark,[[sign*.41,.47,.16],[sign*.31,.25,.28],[sign*.35,-.05,.24],[sign*.19,-.32,.16]],.027);
      curved(torso,mats.glow,[[sign*.055,.21,.29],[sign*.13,.29,.276],[sign*.20,.24,.28],[sign*.27,.31,.255]],.009);
      curved(torso,mats.glow,[[sign*.045,.05,.285],[sign*.10,-.035,.29],[sign*.075,-.12,.29]],.008);
      mass(torso,'Shoulder moss',[sign*.43,.43,.01],[.16,.047,.18],mats.moss);
      const temple=mass(head,'Temple shale',[sign*.187,.065,-.03],[.091,.11,.148],mats.light);temple.rotation.z=-sign*.24;
    }
    for(let n=0;n<4;n++)mass(torso,'Spine stone',[0,.38-n*.21,-.24],[.19,.13,.10],mats.light);
  }else{
    const jaw=joint('Jaw',head,[0,-.115,.08]);mesh(jaw,'Lower jaw',lowerJaw(bear),mats.mane,[0,0,0]);
    mass(jaw,'Gum line',[0,.026,.163],[bear?.101:.080,.009,.145],mats.dark);
    mass(jaw,'Tongue',[0,.033,.162],[bear?.061:.051,.009,.117],mats.dark);
    for(const sign of [-1,1]){
      if(bear){mass(head,'Round ear',[sign*.225,.23,-.05],[.085,.10,.06],mats.mane);mass(head,'Ear lining',[sign*.23,.24,.001],[.05,.06,.013],mats.light);}
      else {const ear=mesh(head,'Pointed ear',new THREE.ConeGeometry(.09,.29,4),mats.mane,[sign*.16,.27,-.04]);ear.scale.z=.55;ear.rotation.z=-sign*.19;
        const lining=mesh(head,'Ear lining',new THREE.ConeGeometry(.056,.20,3),mats.light,[sign*.16,.29,.001]);lining.scale.z=.18;lining.rotation.z=-sign*.19;}
      // Upper canines remain attached to the skull while the jaw opens.
      rod(head,'Upper canine',[sign*(bear?.104:.071),-.064,.277],[sign*(bear?.092:.064),-.132,.29],.013,.001);
      for(const [x,z] of [[.073,.181],[.055,.257]])
        rod(jaw,'Lower tooth',[sign*x,.027,z],[sign*(x-.006),.061,z+.008],.009,.001);
      if(bear){
        const eye=mass(head,'Amber eye',[sign*.180,.100,.161],[.016,.012,.013],mats.dark);
        eye.rotation.y=sign*.60;
        mass(head,'Eye gleam',[sign*.185,.104,.174],[.005,.0035,.003],mats.bone);
      }
      for(let n=0;n<5;n++){const fur=tuft(head,[sign*((bear?.22:.17)+n*.01),.08-n*.039,-.022],bear?.26:.16,bear?.10:.06,n%2?mats.fur:mats.light);fur.rotation.z=-sign*(2.54+n*.05);}
    }
    if(!biped){
      const tail=joint('Tail',torso,[0,.05,-.55]);
      if(bear)mass(tail,'Bear tail',[0,0,-.02],[.09,.10,.13],mats.mane);
      else {curved(tail,mats.fur,[[0,0,0],[0,-.09,-.24],[0,-.21,-.47],[0,-.17,-.65]],.09);for(let n=0;n<8;n++){const fur=tuft(tail,[0,-n*.027,-n*.079],.20,.09,n>5?mats.light:mats.mane);fur.rotation.x=-1.95;}}
    }
    if(!biped)for(const s of [-1,1])for(let n=0;n<4;n++){
      const z=.13+n*.087+(s>0?.018:0),y=(bear?.426:.318)+.023*Math.sin(n);
      const lock=tuft(torso,[s*(.071+.009*n),y,z],bear?.145:.108,bear?.077:.053,mats.fur);
      lock.rotation.x=-1.87;lock.rotation.z=s*.21;
    }
    // Overlapping fur locks break the shoulder, belly and cheek silhouettes.
    for(const sign of [-1,1])for(let row=0;row<3;row++)for(let n=0;n<5;n++){
      const x=sign*(biped?.35:bear?.38:.25),y=biped?.28-row*.16:.10-row*.12,z=biped?-.16+n*.075:-.38+n*.18;
      const fur=tuft(torso,[x,y,z],apex?.26:bear?.22:.18,apex?.09:.075,n%3===0?mats.fur:mats.mane);fur.rotation.z=-sign*(2.65+row*.08);fur.rotation.x=-.65;
    }
    for(const sign of [-1,1])for(let n=0;n<6;n++){
      const fur=tuft(torso,[sign*(.06+n*.031),biped?.15-n*.022:-.035-n*.026,biped?.29:bear?.61:.53],bear?.22:.26,.075,mats.light);fur.rotation.z=-sign*(2.7-n*.06);fur.rotation.x=-.28;
    }
  }
  if(apex){
    for(const sign of [-1,1]){
      const crown=joint('Antler'+sign,head,[sign*.14,.19,-.08]);
      const points=[[0,0,0],[sign*.19,.20,-.10],[sign*.30,.43,-.12],[sign*.28,.64,-.015]];
      mesh(crown,'Weathered antler beam',tapered(points,[.051,.039,.028,.002]),mats.bone,[0,0,0]);
      for(const [branch,radii] of [
        [[points[1],[sign*.24,.25,.08],[sign*.32,.38,.12]],[.029,.017,.001]],
        [[points[2],[sign*.40,.45,-.08],[sign*.44,.59,.01]],[.023,.013,.001]],
        [[[sign*.11,.12,-.06],[sign*.23,.15,.10],[sign*.35,.20,.12]],[.028,.017,.001]]])
        mesh(crown,'Brow tine',tapered(branch,radii),mats.bone,[0,0,0]);
      curved(torso,mats.bark,[[sign*.10,-.25,.23],[sign*.24,.01,.30],[sign*.30,.28,.27],[sign*.43,.41,.15]],.035);
      for(let n=0;n<3;n++){
        const growth=surface(10,8,(u,v)=>{
          const s=u*2-1,tip=(.035+.13*Math.sin(v*1.65)),drop=1-v;
          return [sign*(.095+n*.081+s*tip+drop*.048),.39-n*.13-drop*(.33+.041*Math.cos(s*Math.PI)),
            -.182-.093*(1-s*s)-.067*drop+n*.018,.06+n*.15+u*.28,.13+.77*v];
        });
        mesh(torso,'Overlapping elderwood',growth,mats.bark,[0,0,0]);
      }
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
      const calf=biped?.12:bear?.113:.067,ankle=biped?.095:bear?.091:.050;
      mesh(lower,'Hock',tapered([[0,.025,-.006],[0,-length*.28,.010],[0,-length*.66,.033],[0,-length+.021,.077]],
        [calf*.83,calf,ankle*.95,ankle],stone?7:12),mats.fur,[0,0,0]);
      const paw=joint('Paw'+sign+':'+n,lower,[0,-length+.025,.09]);
      const pawWidth=biped?.17:bear?.18:.10, pawLength=biped?.23:bear?.21:.15;
      mass(paw,'Heel',[0,.038,-.021],[ankle*1.10,ankle*1.17,ankle*1.30],mats.fur);
      mass(paw,'Paw',[0,0,.04],[pawWidth,biped?.10:bear?.095:.075,pawLength],mats.paw);
      for(const digit of (stone?[-1,0,1]:[-1.5,-.5,.5,1.5])){
        const x=digit*(stone?.075:bear||biped?.066:.041),z=.138-Math.abs(digit)*.010;
        mass(paw,stone?'Split stone toe':'Toe',[x,-.007,z],[bear||biped?.056:.037,.058,.083],mats.paw);
        if(!stone)mesh(paw,'Claw',tapered([[x,-.006,z+.061],[x*1.05,-.013,z+.093],[x*1.08,-.034,z+(bear?.148:.120)]],
          [bear?.016:.012,.010,.0008],7),mats.claw,[0,0,0]);
      }
      // Unwrap one continuous painted paw across the pad and its digits.
      for(const toe of paw.children.filter(o=>o.material===mats.paw)){
        const pos=toe.geometry.attributes.position,uv=toe.geometry.attributes.uv;
        for(let i=0;i<pos.count;i++){
          const x=toe.position.x+pos.getX(i)*toe.scale.x,z=toe.position.z+pos.getZ(i)*toe.scale.z;
          const y=toe.position.y+pos.getY(i)*toe.scale.y;
          uv.setXY(i,THREE.MathUtils.clamp(.5+x/(pawWidth*2.1),.01,.99),
            THREE.MathUtils.clamp(.47-(z-.04)/(pawLength*2.3)+y*2.55,.02,.98));
        }
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
    return applyCinematicForm(result,pose.ex?.cinematic,biped);
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
