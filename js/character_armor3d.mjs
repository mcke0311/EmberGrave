import * as THREE from './vendor/three/three.module.min.js';
import {equipmentMaterials,surfaceMaterial} from './character_materials3d.mjs';
import {mesh,box,orb,rod,curved,plate,edge,rivet,band,wrap,combineStatic,formedPlate} from './character_mesh3d.mjs';

export const ARMOR_THEMES={
  vanguard:{name:'Legion plate',description:'Forged steel, layered defenses and heraldic shields.',cloth:'#263b52',leather:'#3a2b24',trim:'#947a4e'},
  emberwitch:{name:'Ember vestments',description:'Flame crowns, flared shoulders and long robes in ember red and gold.',cloth:'#58262d',leather:'#36232a',trim:'#b2834c',magic:'#d86b2b'},
  gravebinder:{name:'Ossuary raiment',description:'Bone crowns, skull pauldrons and ivory defenses over burial shrouds.',cloth:'#2c2935',leather:'#2a242b',trim:'#8c8371',magic:'#6c987a'},
  wildkeeper:{name:'Wildwood hides',description:'Branching antlers, broad fur mantles, bark armor and fang totems.',cloth:'#41432b',leather:'#59402b',trim:'#998052',magic:'#899054'},
  veilranger:{name:'Veil leathers',description:'Crested cowls, swept leather shoulders, layered guards and split tails.',cloth:'#29373d',leather:'#283035',trim:'#707c7e',magic:'#6994a0'}
};
export const ARMOR_LEVELS={
  vanguard:['Field plate','Reinforced plate','Veteran plate','Mythic plate'],
  emberwitch:['Ash-wanderer wraps','Flameweaver vestments','Infernal regalia','Phoenix regalia'],
  gravebinder:['Burial shroud','Bone acolyte','Ossuary guard','Death sovereign'],
  wildkeeper:['Trail hides','Fang hunter','Bark warden','Elder of the wild'],
  veilranger:['Fen leathers','Pathfinder','Nightstalker','Veilmaster']
};
const LEVEL_COLORS={
  emberwitch:[['#493a36','#684638','#897054'],['#702d32','#ae4b2d','#c39553'],['#6e2535','#241f31','#db9c4f'],['#241e2d','#a93827','#edc366']],
  gravebinder:[['#393237','#575046','#988b70'],['#39273f','#68635a','#b3a68a'],['#24202e','#929083','#c5baa0'],['#17202a','#b7b4a0','#ded2b5']],
  wildkeeper:[['#48412d','#5b4430','#887249'],['#57402c','#8a754f','#b09861'],['#34452e','#728052','#b7ae78'],['#263f35','#b3ad86','#d4c799']],
  veilranger:[['#3a3730','#574b3b','#7e7662'],['#30443e','#647361','#98a487'],['#242b43','#736582','#aaa7bc'],['#172c38','#829f9e','#c1d2cf']]
};
export function armorRank(item){const rank=['light','mail','plate','mythic'].indexOf(item?.family);return rank<0?Math.min(3,Math.floor((item?.tier||0)/4)):rank;}
export function armorPalette(item,classId){
  const theme=ARMOR_THEMES[classId],rank=armorRank(item),colors=LEVEL_COLORS[classId]?.[rank],cloth=new THREE.Color(colors?.[0]||theme.cloth);
  if(item?.namedId)cloth.lerp(new THREE.Color(item.material.cloth),.16);
  return {...item?.material,cloth:'#'+cloth.getHexString(),leather:theme.leather,trim:item?.namedId?item.material.trim:colors?.[2]||theme.trim,glow:item?.material.glow||theme.magic,contrast:colors?.[1]||theme.cloth};
}
function classMaterials(item,id){
  const rank=armorRank(item),palette=armorPalette(item,id);
  return {...equipmentMaterials({...item,material:palette}),lining:surfaceMaterial(palette.contrast,'cloth'),
    bone:surfaceMaterial(['#a08d6f','#b5a386','#cdc1a2','#e0d5bc'][rank],'leather',{roughness:.8}),
    fur:surfaceMaterial(id==='gravebinder'?'#3a373c':['#5c4d39','#806b4d','#8d8363','#b6ad8c'][rank],'cloth'),
    bark:surfaceMaterial(['#51432d','#635034','#63714a','#87966a'][rank],'wood')};
}
function group(name){const g=new THREE.Group();g.name=name;return g;}
function gem(p,m,pos,size=.025){return mesh(p,new THREE.OctahedronGeometry(size),m,pos,[.7,1.35,.55]);}
function flame(p,m,pos=[0,0,0],scale=1){
  const g=group('Flame embroidery');g.position.set(...pos);g.scale.setScalar(scale);p.add(g);
  plate(g,m.trim,[[0,-.045],[-.033,-.009],[-.026,.036],[-.009,.012],[.016,.073],[.017,.019],[.037,.026],[.03,-.012]],.005);
  gem(g,m.glow,[0,-.005,.013],.018);return g;
}
function skull(p,m,pos=[0,0,0],scale=1){
  const g=group('Bone reliquary');p.add(g);g.position.set(...pos);g.scale.setScalar(scale);
  orb(g,m.bone,[0,.012,0],[.044,.046,.029]);
  for(const s of [-1,1]){orb(g,m.dark,[s*.017,.016,.025],[.013,.014,.007]);rod(g,m.bone,[s*.024,-.021,.018],[s*.022,-.043,.018],.007);}
  for(let i=-1;i<=1;i++)box(g,m.bone,[i*.01,-.034,.024],[.007,.018,.009]);return g;
}
function fang(p,mat,a,b,r=.012){
  const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.clone().sub(start);
  const tooth=mesh(p,new THREE.ConeGeometry(r,delta.length(),6),mat,start.add(end).multiplyScalar(.5).toArray());tooth.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return tooth;
}
function fur(p,m,center,r=.09,count=11){
  orb(p,m.fur,center,[r,.042,r*.85]);
  for(let i=0;i<count;i++){
    const a=i/count*Math.PI*2,x=center[0]+Math.sin(a)*r*.86,z=center[2]+Math.cos(a)*r*.8;
    fang(p,m.fur,[x,center[1],z],[x*1.07,center[1]-.045-(i%3)*.008,z*1.05],.027);
    fang(p,m.fur,[center[0]+Math.sin(a)*r*.32,center[1]+.037,center[2]+Math.cos(a)*r*.32],[x,center[1]-.008-(i%2)*.013,z],.022);
  }
}
function leaf(p,m,pos,scale=1){const g=plate(p,m,[[0,.076],[-.033,.021],[-.028,-.025],[0,-.055],[.03,-.019],[.026,.032]],.008,pos);g.scale.setScalar(scale);return g;}
function hood(p,m,rank,pointed=false){
  const rows=[[-.15,.158,.139],[.015,.161,.135],[.14,.145,.12],[pointed?.27:.222,.023,.04]],positions=[],uv=[],indices=[],n=18;
  for(let r=0;r<rows.length;r++){const [y,rx,rz]=rows[r];for(let i=0;i<=n;i++){const a=.7+i/n*(Math.PI*2-1.4);positions.push(Math.sin(a)*rx,y,Math.cos(a)*rz-.025);uv.push(i/n,r/3);}}
  for(let r=0;r<3;r++)for(let i=0;i<n;i++){const a=r*(n+1)+i,b=a+n+1;indices.push(a,a+1,b,b,a+1,b+1);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();
  const cloth=m.cloth.clone();cloth.side=THREE.DoubleSide;mesh(p,g,cloth);
  for(const s of [-1,1])curved(p,rank>=2?m.trim:m.leather,rows.map(([y,rx,rz])=>[s*Math.sin(.7)*rx,y,Math.cos(.7)*rz-.022]),.005);
  mesh(p,new THREE.SphereGeometry(.09,12,6,0,Math.PI*2,0,Math.PI/2),m.cloth,[0,.17,-.033],[1,.75,1]);
  // Project the brow forward so the opening reads as a hood around the face.
  const outer=[[-.144,.13,.086],[-.08,.218,.057],[0,pointed?.267:.241,.048],[.08,.218,.057],[.144,.13,.086]];
  const inner=[[-.107,.115,.129],[-.054,.174,.133],[0,.193,.137],[.054,.174,.133],[.107,.115,.129]],front=[],frontUV=[],frontIndex=[];
  for(let i=0;i<5;i++){front.push(...outer[i],...inner[i]);frontUV.push(i/4,1,i/4,0);}
  for(let i=0;i<4;i++){const a=i*2;frontIndex.push(a,a+1,a+2,a+2,a+1,a+3);}
  const brim=new THREE.BufferGeometry();brim.setAttribute('position',new THREE.Float32BufferAttribute(front,3));brim.setAttribute('uv',new THREE.Float32BufferAttribute(frontUV,2));brim.setIndex(frontIndex);brim.computeVertexNormals();mesh(p,brim,cloth);curved(p,rank>=2?m.trim:m.leather,inner,.004);
}
function hangingPanel(p,m,width,length,pos,ornament){
  const g=plate(p,m.cloth,[[-width,0],[-width*1.12,-length*.82],[0,-length],[width*1.12,-length*.82],[width,0]],.004,pos,0);
  edge(g,m.trim,[[-width*.78,-.025,.008],[-width*.86,-length*.79,.008],[0,-length*.91,.008],[width*.86,-length*.79,.008],[width*.78,-.025,.008]],.0025,false);
  if(ornament)flame(g,m,[0,-length*.56,.01],.8);return g;
}

function tierArmor(parts,m,id,rank){
  if(rank===0)return;
  const chest=parts.Chest,hips=parts.Hips;
  for(const [side,s] of [['L',1],['R',-1]]){
    const arm=parts['UpperArm'+side],thigh=parts['Thigh'+side];
    if(id==='emberwitch'){
      // Layered flame-shaped fans define the veteran/phoenix silhouette.
      for(let i=0;i<rank;i++){
        const w=.13+rank*.041,h=.06+rank*.073;
        const fan=plate(arm,i%2?m.trim:m.lining,[[0,-.07],[s*w*.7,-.09],[s*w,h],[s*w*.63,h*.61],[s*w*.59,h*1.25],[s*.048,h*.49],[-s*.045,.027]],.013,[s*i*.012,-i*.037,.015-i*.034]);
        fan.rotation.y=-s*.2;edge(fan,m.trim,[[s*w*.7,-.079,.018],[s*w*.94,h*.89,.018],[s*w*.62,h*.58,.018],[s*.046,h*.46,.018]],.005,false);
      }
      const skirt=hangingPanel(hips,{...m,cloth:m.lining},.077+rank*.008,.45+rank*.085,[s*(.17+rank*.012),-.035,.13],true);skirt.rotation.z=s*.12;skirt.rotation.y=s*.3;
      if(rank>=2){gem(chest,m.glow,[s*.117,-.056,.185],.038);curved(chest,m.trim,[[s*.09,.067,.129],[s*.205,.127,.052],[s*.17,.25,-.029]],.014);}
    }else if(id==='gravebinder'){
      const skullScale=.9+rank*.4;skull(arm,m,[s*.045,.08,.086],skullScale);
      for(let i=0;i<rank+1;i++){
        curved(arm,m.bone,[[s*.017,.024-i*.041,-.025],[s*(.11+rank*.02),.032-i*.031,-.045],[s*(.16+rank*.025),.1+rank*.044-i*.036,-.08]],.018+rank*.003);
      }
      if(rank>=2){
        const rib=plate(chest,m.bone,[[s*.115,.061],[s*.22,.021],[s*.228,-.13],[s*.172,-.209],[s*.124,-.145]],.028,[0,0,.126]);rib.rotation.y=s*.12;
        for(let i=0;i<3;i++)fang(hips,m.bone,[s*(.12+i*.026),-.019,.125],[s*(.23+i*.019),-.28-rank*.026,.175],.022);
        const shroud=hangingPanel(hips,{...m,cloth:m.lining},.053,.55+rank*.023,[s*.203,-.034,.09],false);shroud.rotation.z=s*.13;
      }
      if(rank===3)for(let i=0;i<3;i++)curved(chest,m.bone,[[s*.09,.075,-.06],[s*(.14+i*.03),.16+i*.025,-.11],[s*(.20+i*.034),.30+i*.018,-.06]],.017);
    }else if(id==='wildkeeper'){
      fur(arm,m,[s*.025,.079,0],.14+rank*.035,15+rank*3);
      if(rank>=2){
        for(let i=0;i<3;i++){const bark=leaf(chest,m.bark,[s*(.035+i*.058),-.025-i*.023,.177],1.45+rank*.17);bark.rotation.z=s*(.12+i*.17);}
        curved(arm,m.bark,[[0,.04,-.045],[s*.13,.14,-.075],[s*(.21+rank*.02),.23+rank*.021,-.06]],.026);
        fang(arm,m.bark,[s*.12,.13,-.07],[s*.09,.25,-.04],.017);
        for(let i=0;i<rank;i++){const b=leaf(arm,m.lining,[s*(.09+i*.041),.07+i*.025,.059],1.05);b.rotation.z=-s*.9;}
        leaf(thigh,m.bark,[s*.023,-.18,.171],1.5+rank*.16);
      }
      const pelt=plate(hips,m.fur,[[-.081,.01],[.089,.01],[.104,-.26],[.059,-.22],[.027,-.32],[-.019,-.27],[-.061,-.35],[-.096,-.22]],.015,[s*.17,-.021,.131]);pelt.rotation.y=s*.52;
      if(rank===3)fur(chest,m,[s*.133,.071,-.065],.12,10);
    }else if(id==='veilranger'){
      // Swept layered leather, a broad cowl, and long split tails distinguish
      // the advanced ranger sets without giving them the Vanguard cuirass.
      for(let i=0;i<rank+(side==='R'?1:0);i++){
        const feather=plate(arm,i%2?m.lining:m.leather,[[-s*.063,.047],[s*.05,.064],[s*(.15+rank*.022),.11+rank*.027],[s*.132,-.021],[s*.069,-.071],[-s*.07,-.048]],.014,[s*i*.012,-i*.045,.067-i*.02]);
        edge(feather,m.trim,[[s*.05,.052,.019],[s*(.14+rank*.021),.096+rank*.027,.019],[s*.122,-.021,.019]],.004,false);
      }
      const tail=plate(hips,m.lining,[[-.059,.01],[.064,.01],[.108,-.34-rank*.08],[.031,-.48-rank*.08],[-.057,-.33]],.008,[s*.187,-.024,.002]);tail.rotation.y=s*.65;tail.rotation.z=s*.08;
      if(rank>=2){
        for(let i=0;i<3;i++)plate(chest,i%2?m.lining:m.leather,[[-.16,.025],[0,-.02],[.16,.025],[.142,-.031],[0,-.082],[-.142,-.031]],.014,[0,-.033-i*.041,.153+i*.005]);
        plate(thigh,m.leather,[[-.068,-.045],[.068,-.045],[.078,-.215],[0,-.29],[-.079,-.214]],.016,[s*.012,0,.139]);
        rod(thigh,m.trim,[-.056,-.081,.16],[.056,-.081,.16],.006);
      }
      if(rank===3){const mantle=plate(chest,m.lining,[[s*.061,.104],[s*.16,.145],[s*.28,.103],[s*.224,-.083],[s*.125,-.132]],.012,[0,0,.072]);mantle.rotation.y=-s*.25;}
    }
  }
  if(id==='emberwitch'&&rank>=2)flame(chest,m,[0,-.019,.188],1.6+rank*.13);
  if(id==='gravebinder'&&rank>=2)skull(chest,m,[0,.055,.19],1.03+rank*.08);
  if(id==='wildkeeper'&&rank>=2){skull(chest,m,[0,.054,.195],.93);for(const s of [-1,1])fang(chest,m.bone,[s*.029,.034,.208],[s*.047,-.13,.21],.017);}
}

export function createClassArmorDetails(item,id){
  if(!ARMOR_THEMES[id]||id==='vanguard')throw new Error(`Unknown themed armor: ${id}`);
  const rank=armorRank(item),m=classMaterials(item,id),parts={};
  for(const bone of ['Chest','Spine','Hips','UpperArmL','UpperArmR','ThighL','ThighR']){parts[bone]=group(`${ARMOR_THEMES[id].name} / ${bone}`);parts[bone].userData.armorTheme=id;}
  const chest=parts.Chest,spine=parts.Spine,hips=parts.Hips;
  if(id==='emberwitch'){
    // A sculpted collar and embroidered stoles, leaving the torso a cloth robe.
    mesh(chest,new THREE.CylinderGeometry(.078,.125,.13,16,1,true),m.cloth,[0,.095,0],[1,1,.82]);band(chest,m.trim,.158,.08,.009,.82);
    for(const s of [-1,1]){
      curved(chest,m.trim,[[s*.078,.055,.126],[s*.124,-.042,.154],[s*.081,-.171,.149]],.006);
      const shoulder=parts[s===1?'UpperArmL':'UpperArmR'];
      plate(shoulder,m.cloth,[[-.085,.045],[.06,.064],[.108,-.033],[.052,-.171],[-.028,-.13]],.012,[0,0,.068]);
      edge(shoulder,m.trim,[[-.076,.042,.09],[.05,.055,.09],[.097,-.029,.09],[.05,-.15,.09]],.004,false);
      if(rank>=1)flame(shoulder,m,[.027,-.045,.089],.57+rank*.1);
      hangingPanel(hips,m,.037,.5+rank*.045,[s*.103,-.016,.21],rank>=1);
    }
    flame(chest,m,[0,-.035,.174],.7+rank*.2);
    for(let i=0;i<rank+2;i++)curved(spine,m.trim,[[-.1,.006-i*.036,.126],[0,-.02-i*.036,.153],[.1,.006-i*.036,.126]],.003);
  }else if(id==='gravebinder'){
    mesh(chest,new THREE.CylinderGeometry(.09,.16,.14,12,1,true),m.cloth,[0,.079,-.012],[1,1,.8]);
    for(let i=0;i<3+rank;i++)for(const s of [-1,1]){
      const y=.025-i*.033;curved(chest,m.bone,[[s*.012,y,.178],[s*.095,y+.025,.174],[s*.183,y+.008,.124]],.006+rank*.001);
    }
    rod(chest,m.bone,[0,.07,.18],[0,-.18,.16],.011);
    skull(chest,m,[0,.076,.167],.63);
    for(const [side,s] of [['L',1],['R',-1]]){
      const shoulder=parts['UpperArm'+side];fur(shoulder,m,[0,.022,0],.106,8);
      skull(shoulder,m,[s*.038,.054,.083],.9+rank*.12);
      for(let i=0;i<rank+1;i++)fang(shoulder,m.bone,[s*.055,.044-i*.025,-.024],[s*(.14+i*.012),.1-i*.022,-.038],.014);
      hangingPanel(hips,m,.054,.48+rank*.035,[s*.11,-.008,.209],false);
      for(let i=0;i<rank+1;i++)skull(hips,m,[s*.103,-.14-i*.082,.228],.34);
    }
    for(let i=0;i<3;i++)band(spine,m.leather,-.04-i*.037,.169,.019,.84);
  }else if(id==='wildkeeper'){
    // Broad hide mantle, bark lamellae and tooth fastenings instead of steel.
    for(const [side,s] of [['L',1],['R',-1]]){
      fur(parts['UpperArm'+side],m,[s*.02,.045,0],.137+rank*.008,14);
      const hide=plate(chest,m.leather,[[s*.07,.05],[s*.22,.031],[s*.195,-.14],[s*.048,-.195],[s*.015,-.035]],.019,[0,0,.13]);
      for(let i=0;i<4;i++)rivet(chest,m.bone,s*.12,-.015-i*.035,.163,.005);
      if(rank>=1)for(let i=0;i<rank;i++){const scale=leaf(chest,m.bark,[s*(.078+i*.035),-.044-i*.02,.161],.7);scale.rotation.z=s*.3;}
      for(let i=0;i<3;i++)fang(chest,m.bone,[s*(.043+i*.026),.057,.152],[s*(.057+i*.03),-.022-i*.008,.165],.009);
      const pelt=plate(hips,m.leather,[[-.07,0],[.07,0],[.09,-.16],[.025,-.24],[-.015,-.19],[-.068,-.26],[-.094,-.13]],.012,[s*.11,-.02,.20]);pelt.rotation.z=s*.12;
    }
    leaf(chest,m.trim,[0,-.018,.18],.85);band(spine,m.leather,-.083,.18,.047,.83);
    if(rank>=2)for(const s of [-1,1])leaf(parts[s===1?'ThighL':'ThighR'],m.bark,[0,-.17,.12],1.15);
  }else if(id==='veilranger'){
    for(const s of [-1,1])curved(chest,m.leather,[[s*.18,.061,.101],[-s*.1,-.135,.154]],.024);
    for(let i=0;i<4;i++){const y=.02-i*.04;rod(spine,m.trim,[-.017,y,.148],[.017,y-.028,.148],.003);rod(spine,m.trim,[.017,y,.148],[-.017,y-.028,.148],.003);}
    // The bow shoulder stays compact; the opposite side carries layered hide.
    for(const [side,s] of [['L',1],['R',-1]]){
      const shoulder=parts['UpperArm'+side];
      for(let i=0;i<(side==='L'?1:rank+1);i++){
        plate(shoulder,m.leather,[[-.08,.025],[.074,.037],[.097,-.04],[.04,-.084],[-.077,-.062]],.012,[0,-i*.037,.056]);
        rod(shoulder,m.trim,[-.061,-.049-i*.037,.075],[.04,-.075-i*.037,.075],.003);
      }
      const flap=plate(hips,m.cloth,[[-.067,0],[.057,0],[.089,-.25],[-.021,-.32]],.005,[s*.166,-.018,.078]);flap.rotation.y=s*.55;
      for(let i=0;i<2+rank;i++)box(chest,m.leather,[s*.13,-.086-i*.024,.152],[.053,.014,.012]);
    }
    const clasp=mesh(chest,new THREE.TorusGeometry(.025,.004,5,16,Math.PI*1.5),m.trim,[0,.012,.177]);clasp.rotation.z=-.6;
    if(rank>=2)gem(chest,m.glow,[0,.003,.177],.015);
  }
  tierArmor(parts,m,id,rank);Object.values(parts).forEach(p=>combineStatic(p));return parts;
}

function tierWearable(root,m,id,rank,slot){
  if(rank===0)return;
  if(slot==='head'){
    for(const s of [-1,1]){
      if(id==='emberwitch'){
        const w=.11+rank*.036,h=.16+rank*.066;
        const crown=plate(root,m.trim,[[s*.074,.08],[s*.14,.052],[s*w,h*.72],[s*(w+.021),h],[s*.13,h*.77],[s*.097,.15]],.012,[0,0,.045]);
        crown.rotation.y=-s*.18;
        if(rank>=2)for(let i=0;i<rank;i++){
          const plume=plate(root,i%2?m.trim:m.lining,[[0,0],[s*.037,.038],[s*(.047+i*.012),.17+i*.023],[s*.008,.11],[-s*.009,.02]],.008,[s*(.087+i*.029),.12-i*.022,-.048-i*.015]);plume.rotation.y=-s*.28;
        }
      }else if(id==='gravebinder'){
        const brow=plate(root,m.bone,[[s*.012,.166],[s*.11,.198],[s*.157,.127],[s*.137,-.093],[s*.087,-.14],[s*.103,.064],[s*.055,.119]],.018,[0,0,.104]);brow.rotation.y=s*.12;
        if(rank>=2){
          curved(root,m.bone,[[s*.111,.158,-.004],[s*.205,.252,-.03],[s*.212,.35+rank*.018,-.078],[s*.153,.37+rank*.02,-.097]],.022);
          for(let i=0;i<rank;i++)fang(root,m.bone,[s*(.046+i*.035),.215-i*.004,.024],[s*(.068+i*.046),.34+(rank-i)*.033,.015],.016);
        }
      }else if(id==='wildkeeper'){
        const h=.26+rank*.095,w=.22+rank*.048;
        curved(root,m.bone,[[s*.10,.13,-.042],[s*.21,.22,-.079],[s*w,.36,-.094],[s*(w-.015),h,-.119]],.022);
        for(let i=0;i<rank+1;i++){
          const y=.235+i*.067,x=.19+i*.038;
          fang(root,m.bone,[s*x,y,-.077-i*.011],[s*(x-.06),y+.1+rank*.018,-.058],.015);
          if(rank>=2)fang(root,m.bone,[s*(x+.014),y+.025,-.09],[s*(x+.098),y+.08,-.104],.013);
        }
        if(rank>=2){const cheek=leaf(root,m.bark,[s*.139,-.027,.074],1.07);cheek.rotation.z=-s*.3;fur(root,m,[s*.119,.128,-.069],.095,10);}
      }else if(id==='veilranger'){
        const brow=plate(root,m.leather,[[s*.015,.22],[s*.10,.199],[s*.181,.14],[s*.156,-.087],[s*.099,-.156],[s*.119,.093],[s*.045,.171]],.012,[0,0,.064]);
        edge(brow,m.trim,[[s*.018,.215,.016],[s*.096,.193,.016],[s*.171,.138,.016],[s*.144,-.072,.016]],.004,false);
        if(rank>=2)for(let i=0;i<rank;i++){
          const plume=plate(root,i%2?m.leather:m.lining,[[0,-.082],[s*.025,-.067],[s*.059,.089],[s*.011,.057],[-s*.017,.026]],.009,[s*(.124+i*.023),.088-i*.037,-.083-i*.016]);plume.rotation.y=s*.35;
        }
      }
    }
    if(id==='emberwitch'&&rank>=2)flame(root,m,[0,.203,.098],1.17+rank*.18);
    if(id==='gravebinder'&&rank===3)skull(root,m,[0,.259,.117],.93);
    if(id==='wildkeeper'&&rank>=2){skull(root,m,[0,.136,.134],1.0);for(const s of [-1,1])fang(root,m.bone,[s*.027,.113,.155],[s*.046,.022,.163],.012);}
    if(id==='veilranger'&&rank===3){
      plate(root,m.lining,[[-.092,.197],[0,.335],[.092,.197],[0,.16]],.01,[0,0,.038]);
      edge(root,m.trim,[[-.084,.2,.053],[0,.325,.053],[.084,.2,.053]],.004,false);
    }
  }else if(slot==='gloves'&&rank>=2){
    for(const s of [-1,1]){
      if(id==='emberwitch'){
        plate(root,m.lining,[[s*.025,-.003],[s*.073,.062],[s*.083,.23],[s*.035,.145]],.009,[0,0,.025]);
        curved(root,m.trim,[[s*.029,.009,.053],[s*.068,.067,.044],[s*.077,.216,.038]],.005);
      }else if(id==='gravebinder'){
        curved(root,m.bone,[[s*.022,-.021,.054],[s*.056,.047,.069],[s*.062,.169,.047]],.014);
        fang(root,m.bone,[s*.046,.123,.025],[s*.084,.236,.013],.017);
      }else if(id==='wildkeeper'){
        const bark=leaf(root,m.bark,[s*.027,.045,.067],1.18);bark.rotation.z=-s*.16;
        fur(root,m,[s*.021,.145,-.009],.079+rank*.004,11);
      }else{
        const blade=plate(root,m.leather,[[s*.024,-.014],[s*.069,.046],[s*.077,.186],[s*.026,.144]],.012,[0,0,.031]);
        edge(blade,m.trim,[[s*.03,.005,.02],[s*.063,.054,.02],[s*.071,.169,.02]],.004,false);
      }
    }
    if(id==='gravebinder')skull(root,m,[0,.059,.072],.64);
    if(id==='veilranger')for(let i=0;i<3;i++)plate(root,m.lining,[[-.043,.029],[0,.005],[.043,.029],[.039,-.008],[0,-.03],[-.039,-.008]],.008,[0,.107-i*.034,.063]);
  }else if(slot==='boots'&&rank>=2){
    if(id==='emberwitch'){
      plate(root,m.lining,[[-.061,.012],[-.081,.235],[0,.386],[.081,.235],[.061,.012],[0,.056]],.011,[0,0,.044]);
      for(const s of [-1,1])curved(root,m.trim,[[s*.05,.027,.067],[s*.071,.233,.065],[0,.367,.056]],.005);
      flame(root,m,[0,.244,.069],.93);
    }else if(id==='gravebinder'){
      for(const s of [-1,1])plate(root,m.bone,[[s*.01,.04],[s*.063,.012],[s*.083,.23],[s*.05,.343],[s*.01,.28]],.018,[0,0,.053]);
      skull(root,m,[0,.28,.083],.75);fang(root,m.bone,[0,.303,.038],[0,.402,.028],.023);
    }else if(id==='wildkeeper'){
      fur(root,m,[0,.274,-.028],.109+rank*.004,15);
      for(const s of [-1,1]){const bark=leaf(root,m.bark,[s*.037,.13,.076],1.62);bark.rotation.z=s*.18;fang(root,m.bone,[s*.047,.28,.063],[s*.065,.119,.092],.012);}
    }else{
      for(let i=0;i<3;i++)plate(root,i%2?m.lining:m.leather,[[-.067,.066],[0,.091],[.067,.066],[.064,-.015],[0,-.052],[-.064,-.015]],.012,[0,.245-i*.082,.045+i*.006]);
      for(const s of [-1,1])curved(root,m.trim,[[s*.064,.28,.073],[s*.055,.166,.083],[s*.043,.05,.092]],.004);
    }
  }else if(slot==='belt'&&rank>=2){
    if(id==='emberwitch')flame(root,m,[0,.07,.181],1.35);
    if(id==='gravebinder')skull(root,m,[0,.088,.189],1.24);
    if(id==='wildkeeper')for(const s of [-1,1]){leaf(root,m.bark,[s*.127,.04,.153],1.28);fang(root,m.bone,[s*.05,.07,.184],[s*.071,-.108,.197],.021);}
    if(id==='veilranger')for(const s of [-1,1]){box(root,m.lining,[s*.167,.016,.117],[.095,.111,.017]);box(root,m.trim,[s*.167,.038,.132],[.032,.025,.009]);}
  }
}

export function createClassWearable(item,id){
  if(!ARMOR_THEMES[id]||id==='vanguard')throw new Error(`Unknown themed armor: ${id}`);
  const root=group(item.name),rank=armorRank(item),m=classMaterials(item,id);
  root.userData.itemKey=item.key;root.userData.armorTheme=id;
  if(item.slot==='head'){
    if(id==='emberwitch'){
      const crown=mesh(root,new THREE.TorusGeometry(.132,.008,6,24),m.trim,[0,.075,-.008],[1,1,.96]);crown.rotation.x=Math.PI/2;
      for(let i=-rank-1;i<=rank+1;i++){
        const angle=i*.25,x=Math.sin(angle)*.134,z=Math.cos(angle)*.13;
        const point=plate(root,m.trim,[[-.015,0],[0,.049+(rank+1-Math.abs(i))*.015],[.015,0],[0,-.028]],.005,[x,.083,z]);point.rotation.y=angle;
      }
      gem(root,m.glow,[0,.092,.142],.023+rank*.003);
      if(rank>=2)for(const s of [-1,1])curved(root,m.trim,[[s*.122,.081,.021],[s*.157,.17,-.012],[s*.13,.238,-.027]],.007);
    }else if(id==='gravebinder'){
      hood(root,m,rank,true);skull(root,m,[0,.195,.145],.48+rank*.07);
      if(rank>=1)for(const s of [-1,1]){
        curved(root,m.bone,[[s*.12,.106,.072],[s*.143,.004,.055],[s*.119,-.12,.068]],.012);
        if(rank===3)fang(root,m.bone,[s*.125,.15,-.026],[s*.192,.27,-.06],.019);
      }
    }else if(id==='wildkeeper'){
      mesh(root,new THREE.SphereGeometry(.135,12,8,0,Math.PI*2,0,Math.PI*.55),m.leather,[0,.067,-.02],[1,1.1,1]);fur(root,m,[0,.086,-.027],.137,14);
      for(const s of [-1,1]){
        const top=.24+rank*.06;
        curved(root,m.bone,[[s*.1,.13,-.026],[s*.181,.22,-.07],[s*.204,top,-.105]],.012);
        if(rank>=1)fang(root,m.bone,[s*.159,.199,-.054],[s*.102,.29,-.026],.012);
        if(rank>=2)fang(root,m.bone,[s*.191,.28,-.085],[s*.276,.34,-.1],.011);
        leaf(root,m.bark,[s*.13,.033,.051],.54);
      }
      leaf(root,m.trim,[0,.071,.123],.42);
    }else if(id==='veilranger'){
      hood(root,m,rank);plate(root,m.cloth,[[-.106,.007],[0,-.01],[.106,.007],[.09,-.076],[0,-.114],[-.09,-.076]],.012,[0,0,.112]);
      for(const s of [-1,1])for(let i=0;i<3+rank;i++)rod(root,m.leather,[s*(.095-i*.009),.026+i*.022,.093],[s*(.08-i*.009),.028+i*.022,.1],.0025);
      if(rank>=2)mesh(root,new THREE.TorusGeometry(.024,.004,5,12,Math.PI*1.5),m.trim,[0,.167,.085]).rotation.z=.5;
    }
  }else if(item.slot==='gloves'){
    orb(root,m.leather,[0,-.047,.005],[.044,.068,.042]);mesh(root,new THREE.CylinderGeometry(.052,.044,.17,12),id==='emberwitch'||id==='gravebinder'?m.cloth:m.leather,[0,.052,0]);
    if(id==='emberwitch'){
      band(root,m.trim,.117,.055,.016);band(root,m.trim,-.014,.047,.009);flame(root,m,[0,.052,.054],.42+rank*.065);
      if(rank>=2)for(const s of [-1,1])plate(root,m.trim,[[s*.037,.027],[s*.044,.137],[s*.024,.092]],.006,[0,0,.037]);
    }else if(id==='gravebinder'){
      for(let i=-1;i<=1;i++)rod(root,m.bone,[i*.025,.123,.043],[i*.018,-.069,.044],.007);
      for(let i=0;i<3+rank;i++)band(root,m.cloth,.105-i*.023,.053,.012);if(rank>=1)skull(root,m,[0,.047,.049],.4);
    }else if(id==='wildkeeper'){
      fur(root,m,[0,.127,0],.063,10);leaf(root,m.bark,[0,.021,.047],.7+rank*.06);
      for(const s of [-1,1])fang(root,m.bone,[s*.026,.103,.045],[s*.025,.051,.058],.007);
    }else{
      plate(root,m.leather,[[-.04,-.005],[.04,-.005],[.043,.112],[0,.148],[-.043,.112]],.009,[0,0,.047]);
      for(let i=0;i<4+rank;i++)rod(root,m.trim,[-.026,.018+i*.017,.06],[.027,.027+i*.017,.06],.002);
    }
  }else if(item.slot==='boots'){
    plate(root,m.leather,[[-.053,-.057],[-.06,.114],[-.032,.162],[.032,.162],[.059,.114],[.051,-.057]],.07,[0,.005,.014]).rotation.x=Math.PI/2;
    mesh(root,new THREE.CylinderGeometry(.07,.05,.29,12),id==='emberwitch'||id==='gravebinder'?m.cloth:m.leather,[0,.15,-.023]);
    if(id==='emberwitch'){
      band(root,m.trim,.265,.071,.011,.9);flame(root,m,[0,.164,.052],.58+rank*.07);
      for(const s of [-1,1])curved(root,m.trim,[[s*.04,.267,.023],[s*.032,.128,.041],[s*.028,.028,.059]],.003);
    }else if(id==='gravebinder'){
      for(let i=0;i<6+rank;i++)band(root,m.leather,.275-i*.029,.071-i*.002,.012,.86);
      for(const s of [-1,1])rod(root,m.bone,[s*.03,.274,.043],[s*.024,.039,.056],.007);
      if(rank>=2)skull(root,m,[0,.216,.057],.47);
    }else if(id==='wildkeeper'){
      fur(root,m,[0,.275,-.024],.079,11);leaf(root,m.bark,[0,.124,.054],1.12);
      band(root,m.leather,.076,.065,.026);for(const s of [-1,1])fang(root,m.bone,[s*.032,.27,.044],[s*.031,.202,.057],.008);
    }else{
      for(let i=0;i<6+rank;i++){const y=.059+i*.027;rod(root,m.trim,[-.025,y,.054],[.025,y+.02,.054],.002);rod(root,m.trim,[.025,y,.054],[-.025,y+.02,.054],.002);}
      band(root,m.leather,.285,.072,.026,.9);box(root,m.trim,[.039,.268,.026],[.019,.025,.009]);
    }
  }else if(item.slot==='belt'){
    band(root,id==='emberwitch'||id==='gravebinder'?m.cloth:m.leather,.08,.183,.094,.83);
    if(id==='emberwitch'){
      flame(root,m,[0,.075,.161],.76);hangingPanel(root,m,.041,.32,[.14,.058,.137],true);
      box(root,m.leather,[-.153,.008,.092],[.072,.11,.034]);box(root,m.trim,[-.153,.008,.114],[.008,.108,.007]);
    }else if(id==='gravebinder'){
      skull(root,m,[0,.081,.163],.86);
      for(const s of [-1,1]){curved(root,m.trim,[[s*.034,.091,.161],[s*.11,-.087,.16],[s*.177,.064,.101]],.004);skull(root,m,[s*.108,-.084,.16],.51);}
    }else if(id==='wildkeeper'){
      for(const s of [-1,1]){leaf(root,m.bark,[s*.118,.075,.123],.8);for(let i=0;i<3;i++)fang(root,m.bone,[s*(.025+i*.023),.088,.159],[s*(.032+i*.029),-.038+i*.006,.167],.01);}
    }else{
      for(const s of [-1,1]){box(root,m.leather,[s*.155,.013,.083],[.081,.12,.055]);box(root,m.trim,[s*.155,.041,.116],[.027,.019,.007]);}
      const buckle=mesh(root,new THREE.TorusGeometry(.025,.004,4,4),m.trim,[0,.08,.16],[1.3,.8,1]);buckle.rotation.z=Math.PI/4;
    }
  }else if(item.slot==='off'){
    const radius=id==='veilranger'?.185:id==='wildkeeper'?.238:.217;
    const shield=mesh(root,new THREE.CylinderGeometry(radius,radius,.038,24),id==='wildkeeper'?m.bark:id==='gravebinder'?m.dark:id==='emberwitch'?m.dark:m.leather);shield.rotation.x=Math.PI/2;
    mesh(root,new THREE.TorusGeometry(radius,.009,5,24),id==='gravebinder'?m.bone:m.trim);
    if(id==='emberwitch'){
      mesh(root,new THREE.TorusGeometry(radius*.74,.005,5,24),m.trim,[0,0,.025]);flame(root,m,[0,0,.03],1.9);
      for(let i=0;i<4+rank;i++){const a=i/(4+rank)*Math.PI*2;gem(root,m.glow,[Math.sin(a)*radius*.83,Math.cos(a)*radius*.83,.036],.012);}
    }else if(id==='gravebinder'){
      skull(root,m,[0,.065,.028],1.6);for(let i=0;i<3+rank;i++)for(const s of [-1,1])curved(root,m.bone,[[0,.016-i*.034,.029],[s*.1,.035-i*.034,.038],[s*.17,.008-i*.026,.025]],.008);
    }else if(id==='wildkeeper'){
      for(let i=-2;i<=2;i++)rod(root,m.leather,[i*.068,-.175,.024],[i*.068,.175,.024],.006);leaf(root,m.trim,[0,.016,.03],1.8);
      for(let i=0;i<8;i++){const a=i*Math.PI/4;rivet(root,m.bone,Math.sin(a)*.204,Math.cos(a)*.204,.024,.008);}
    }else{
      const crescent=mesh(root,new THREE.TorusGeometry(.078,.013,6,20,Math.PI*1.55),m.trim,[0,0,.028]);crescent.rotation.z=.6;
      for(let i=0;i<8;i++){const a=i*Math.PI/4;rivet(root,m.trim,Math.sin(a)*.161,Math.cos(a)*.161,.023,.006);}
    }
  }else if(item.slot==='amulet'){
    curved(root,m.trim,[[-.072,.145,.08],[0,.018,.178],[.072,.145,.08]],.004);
    if(id==='emberwitch')flame(root,m,[0,.006,.177],.62);
    else if(id==='gravebinder')skull(root,m,[0,.006,.177],.64);
    else if(id==='wildkeeper'){for(const s of [-1,1])fang(root,m.bone,[s*.012,.034,.181],[s*.013,-.043,.184],.012);}
    else mesh(root,new THREE.TorusGeometry(.026,.005,5,16,Math.PI*1.55),m.trim,[0,.006,.18]).rotation.z=.6;
  }else if(item.slot.startsWith('ring')){
    const ring=mesh(root,new THREE.TorusGeometry(.021,.0045,5,12),id==='gravebinder'?m.bone:m.trim,[.013,-.065,.028]);ring.rotation.y=Math.PI/2;gem(root,m.glow,[.013,-.065,.049],.01);
  }
  tierWearable(root,m,id,rank,item.slot);return combineStatic(root);
}
