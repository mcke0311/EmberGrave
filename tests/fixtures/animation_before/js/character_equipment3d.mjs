import * as THREE from './vendor/three/three.module.min.js';
import {equipmentMaterials} from './character_materials3d.mjs';
export {equipmentMaterials} from './character_materials3d.mjs';
import {disposeObject,mesh,box,orb,rod,curved,plate,edge,rivet,band,wrap,combineStatic,formedPlate} from './character_mesh3d.mjs';
export {disposeObject,mesh,box,orb,rod} from './character_mesh3d.mjs';
import {createClassArmorDetails,createClassWearable} from './character_armor3d.mjs?v=4';

function blade(parent,m,start,length,width){
  // Parallel cutting edges taper into a point around a raised central ridge.
  const rows=[[start,width*.82],[start+length*.12,width],[start+length*.77,width*.72],[start+length,0]],p=[],uv=[],idx=[];
  for(const [y,w] of rows){p.push(-w,y,0,0,y,w*.27,w,y,0,0,y,-w*.27);for(let j=0;j<4;j++)uv.push(j/3,(y-start)/length);}
  for(let i=0;i<3;i++)for(let j=0;j<4;j++){const a=i*4+j,b=i*4+(j+1)%4;idx.push(a,b,a+4,b,b+4,a+4);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();mesh(parent,g,m.metal);
  for(const s of [-1,1])edge(parent,m.edge,rows.map(([y,w])=>[s*w,y,0]),.002,false);
  for(const s of [-1,1])rod(parent,m.dark,[s*width*.25,start+.07,width*.22],[s*width*.18,start+length*.65,width*.17],.002);
}
export function createWeapon(item){
  const root=new THREE.Group();root.name=item.name;root.userData.itemKey=item.key;
  const m=equipmentMaterials(item),two=item.twoHand,category=item.family.split('_')[0],ornate=item.tier>=6||!!item.namedId;
  let support=null,string=null,arrow=null;const gripLength=two?.32:.18;
  if(!['bow','crossbow'].includes(category)){
    rod(root,m.leather,[0,-gripLength,0],[0,.055,0],.022);wrap(root,m.dark,-gripLength,.04,.023);
    band(root,m.trim,-gripLength,.026,.025);band(root,m.trim,.035,.027,.025);
    mesh(root,new THREE.IcosahedronGeometry(.036,0),m.metal,[0,-gripLength-.036,0],[.9,1.15,.75]);
  }
  if(category==='sword'||category==='dagger'){
    const length=category==='dagger'?.35:two?1.02:.73,width=category==='dagger'?.033:two?.054:.042;
    blade(root,m,.09,length,width);const w=category==='dagger'?.086:two?.165:.126;
    plate(root,m.trim,[[-w,.045],[-w*.94,.09],[-.047,.125],[0,.105],[.047,.125],[w*.94,.09],[w,.045],[.042,.077],[-.042,.077]],.035,[0,0,-.018]);
    if(ornate){plate(root,m.metal,[[-.039,.08],[0,.045],[.039,.08],[.029,.17],[0,.20],[-.029,.17]],.008,[0,0,.019]);rivet(root,m.trim,0,.113,.033,.012);}
  }else if(category==='axe'){
    const y=two?.9:.54;rod(root,m.wood,[0,.02,0],[0,y+.025,0],two?.026:.021);
    plate(root,m.metal,[[.02,y-.035],[.18,y+.075],[.29,y+.055],[.31,y-.08],[.265,y-.22],[.16,y-.27],[.12,y-.10],[.02,y-.13]],.05,[0,0,-.025]);
    edge(root,m.edge,[[.29,y+.055,0],[.31,y-.08,0],[.265,y-.22,0],[.16,y-.27,0]],.009,false);
    plate(root,m.metal,[[-.025,y-.03],[-.16,y-.09],[-.2,y-.15],[-.025,y-.12]],.038,[0,0,-.019]);
    band(root,m.trim,y-.1,.044,.16);rivet(root,m.trim,.13,y-.056,.033,.012);wrap(root,m.leather,y-.36,y-.23,.029);
  }else if(category==='mace'){
    const y=two?.84:.53;rod(root,m.wood,[0,.02,0],[0,y+.07,0],.025);
    if(two){
      plate(root,m.metal,[[-.19,-.068],[-.15,-.11],[.15,-.11],[.19,-.068],[.19,.068],[.15,.11],[-.15,.11],[-.19,.068]],.15,[0,y,-.075],.009);
      for(const s of [-1,1])box(root,m.edge,[s*.165,y,0],[.019,.16,.16]);box(root,m.trim,[0,y,.085],[.042,.21,.012]);
    }else{
      band(root,m.metal,y,.065,.2);
      for(let i=0;i<6;i++){const fin=plate(root,m.metal,[[.035,-.14],[.11,-.09],[.13,.03],[.10,.12],[.035,.15]],.018,[0,y,-.009]);fin.rotation.y=i*Math.PI/3;}
    }
    for(const h of [y-.14,y+.13])band(root,m.trim,h,.052,.025);
  }else if(category==='spear'||category==='staff'){
    const y=category==='spear'?1.19:1.04;rod(root,m.wood,[0,-.55,0],[0,y,0],.023);
    for(const h of [-.49,-.28,.10,y-.11])band(root,m.trim,h,.03,.038);wrap(root,m.leather,-.27,.08,.025);
    if(category==='spear'){blade(root,m,y-.015,.33,.055);plate(root,m.metal,[[-.018,y-.1],[-.095,y-.14],[-.075,y-.06],[0,y+.01],[.075,y-.06],[.095,y-.14],[.018,y-.1]],.018,[0,0,-.009]);}
    else{
      for(const s of [-1,1])curved(root,m.trim,[[s*.021,y-.09,0],[s*.092,y+.015,0],[s*.083,y+.16,0],[s*.036,y+.225,0]],.015);
      mesh(root,new THREE.OctahedronGeometry(.067),m.glow,[0,y+.09,0],[.68,1.4,.68]);curved(root,m.leather,[[.025,y-.03,.01],[.075,y-.16,.01],[.052,y-.27,.02]],.009);
    }support=[0,-.2,0];
  }else if(category==='wand'){
    curved(root,m.wood,[[0,.03,0],[.012,.20,0],[-.014,.35,0],[0,.44,0]],.016);
    mesh(root,new THREE.OctahedronGeometry(.047),m.glow,[0,.43,0],[.58,1.5,.58]);
    for(const s of [-1,1])curved(root,m.trim,[[s*.02,.3,0],[s*.043,.4,0],[s*.02,.48,0]],.008);
  }else if(category==='bow'){
    const points=[[0,-.63,-.07],[0,-.50,.08],[0,-.23,.18],[0,0,.2],[0,.23,.18],[0,.50,.08],[0,.63,-.07]];
    curved(root,m.wood,points,.023);curved(root,m.trim,points.map(([x,y,z])=>[x-.013,y,z+.012]),.005);rod(root,m.leather,[0,-.10,.2],[0,.10,.2],.031);
    for(const s of [-1,1]){rod(root,m.metal,[0,s*.56,.033],[0,s*.635,-.074],.015);for(let i=0;i<3;i++)box(root,m.leather,[0,s*(.25+i*.031),.165-i*.008],[.055,.013,.05]);}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array([0,-.63,-.07,0,0,-.08,0,.63,-.07]),3));string=new THREE.Line(g,new THREE.LineBasicMaterial({color:'#978a70'}));root.add(string);
    arrow=new THREE.Group();root.add(arrow);rod(arrow,m.wood,[0,0,-.34],[0,0,.58],.005);
    const tip=mesh(arrow,new THREE.ConeGeometry(.018,.068,4),m.edge,[0,0,.61]);tip.rotation.x=Math.PI/2;
    for(const s of [-1,1]){const feather=plate(arrow,m.cloth,[[-.018,-.32],[.018,-.32],[.028,-.22],[0,-.24]],.002);feather.rotation.x=Math.PI/2;feather.rotation.y=s*Math.PI/3;}
    support=[0,0,.2];
  }else if(category==='crossbow'){
    plate(root,m.wood,[[-.04,-.30],[.04,-.30],[.041,.26],[.025,.32],[-.025,.32],[-.041,.26]],.07,[0,.035,.14]).rotation.x=Math.PI/2;
    box(root,m.leather,[0,-.10,-.065],[.052,.16,.065]);box(root,m.metal,[0,.024,.20],[.084,.025,.22]);
    curved(root,m.metal,[[-.37,0,.19],[-.24,0,.3],[0,0,.36],[.24,0,.3],[.37,0,.19]],.02);
    rod(root,m.leather,[-.37,0,.19],[0,0,.02],.005);rod(root,m.leather,[0,0,.02],[.37,0,.19],.005);
    rod(root,m.wood,[0,.055,0],[0,.055,.52],.006);for(const s of [-1,1])rivet(root,m.trim,s*.026,.043,.16,.009);support=[0,-.02,.26];
  }
  if(two&&!support)support=[0,-.2,0];
  if(arrow)combineStatic(arrow);
  root.userData.support=support;root.userData.category=category;root.userData.string=string;root.userData.arrow=arrow;return combineStatic(root,new Set([string,arrow]));
}

// Convex formed plates replace the inflated sphere silhouettes of the study.
function armorBand(parent,mat,y,rx,rz,height){return mesh(parent,new THREE.CylinderGeometry(1,1.03,height,16,1,true),mat,[0,y,0],[rx,1,rz]);}

export function createArmorDetails(item,classId='vanguard'){
  if(classId!=='vanguard')return createClassArmorDetails(item,classId);
  const m=equipmentMaterials(item),f=item.family,heavy=f==='plate'||f==='mythic',ornate=f==='mythic';
  const parts={};for(const key of ['Chest','Spine','Hips','UpperArmL','UpperArmR','ThighL','ThighR']){parts[key]=new THREE.Group();parts[key].name=`${item.name} / ${key}`;}
  const chest=parts.Chest,spine=parts.Spine,hips=parts.Hips,trim=ornate?m.trim:m.edge;
  if(heavy){
    for(const s of [-1,1]){
      const outline=[[s*.018,.058,.133],[s*.09,.074,.113],[s*.222,.025,.094],[s*.225,-.102,.105],[s*.16,-.192,.151],[s*.019,-.177,.173]];
      // Viewed from +Z the fan must wind counter-clockwise.
      if(s>0)outline.reverse();formedPlate(chest,m.metal,outline,[s*.11,-.052,.198],trim);
      for(const y of [-.025,-.065])rod(chest,m.trim,[s*.044,y,.194],[s*.17,y+.04,.161],.003);
      rivet(chest,m.trim,s*.20,.015,.129);rivet(chest,m.trim,s*.14,-.161,.17);
    }
    mesh(chest,new THREE.CylinderGeometry(.088,.142,.071,16,1,true),m.metal,[0,.087,0],[1,1,.82]);band(chest,trim,.119,.09,.009,.82);
    for(let i=0;i<3;i++){
      const y=.013-i*.053,rx=.173+i*.006,rz=.149;
      armorBand(spine,m.metal,y,rx,rz,.059);armorBand(spine,trim,y-.026,rx+.001,rz+.002,.007);
      for(const s of [-1,1])rivet(spine,m.trim,s*.126,y,.106,.006);
    }
  }else{
    for(const s of [-1,1]){
      curved(chest,m.leather,[[s*.18,.05,.1],[s*.155,-.05,.153],[s*.12,-.17,.148]],.016);
      curved(spine,m.trim,[[s*.13,.025,.111],[s*.13,-.08,.11],[s*.15,-.17,.099]],.003);
      for(let i=0;i<5;i++)rivet(spine,m.trim,s*.135,.015-i*.032,.12,.004);
    }
    for(let i=0;i<5;i++){const y=.011-i*.035;rod(spine,m.leather,[-.018,y,.146],[.018,y-.027,.146],.004);rod(spine,m.leather,[.018,y,.146],[-.018,y-.027,.146],.004);}
    if(f==='mail')armorBand(hips,m.mail,-.04,.18,.132,.17);
  }
  // Shoulder defenses and hanging thigh plates follow their limb bones.
  for(const [side,s] of [['L',1],['R',-1]]){
    const shoulder=parts['UpperArm'+side];
    for(let i=0;i<(heavy?3:2);i++){
      const w=(heavy?.124:.103)-i*.012,y=.02-i*.055;
      const pts=[[-w,y-.012,.084],[-w*.62,y-.05,.132],[w*.72,y-.069,.12],[w*1.14,y-.05,.035],[w*.86,y-.018,-.1],[-w*.65,y+.018,-.112]];
      const group=new THREE.Group();group.position.x=s*.018;shoulder.add(group);
      formedPlate(group,heavy?m.metal:m.leather,pts,[s*.04,y+.056,0],heavy?trim:m.leather);rivet(group,m.trim,s*w*.55,y+.004,.124,.006);
    }
    if(ornate){const crest=plate(shoulder,m.trim,[[-.026,0],[0,.083],[.026,0],[0,-.021]],.008,[s*.05,.025,.09]);crest.rotation.z=-s*.3;}
    const thigh=parts['Thigh'+side];
    plate(thigh,heavy?m.metal:m.leather,[[-.076,-.058],[-.083,-.19],[-.061,-.252],[.056,-.265],[.081,-.2],[.078,-.06]],.016,[s*.025,0,.148]);
    for(let i=0;i<3;i++)rod(thigh,heavy?trim:m.dark,[-.067+s*.025,-.09-i*.047,.169],[.068+s*.025,-.09-i*.047,.169],.004);
    for(const x of [-.057,.057])rivet(thigh,m.trim,x+s*.025,-.076,.170,.006);
  }
  const tabardMaterial=m.cloth.clone();tabardMaterial.color.lerp(new THREE.Color({vanguard:'#3d3430',emberwitch:'#572a27',gravebinder:'#35323e',wildkeeper:'#394331',veilranger:'#313b3d'}[classId]),.7);
  const tabard=plate(hips,tabardMaterial,[[-.061,-.045],[-.073,-.34],[0,-.4],[.073,-.34],[.061,-.045]],.005,[0,0,.161],0);
  edge(tabard,m.trim,[[-.054,-.1,.009],[-.063,-.329,.009],[0,-.38,.009],[.063,-.329,.009],[.054,-.1,.009]],.0025,false);
  Object.values(parts).forEach(p=>combineStatic(p));return parts;
}

export function createWearable(item,classId='vanguard'){
  if(classId!=='vanguard')return createClassWearable(item,classId);
  const root=new THREE.Group();root.name=item.name;root.userData.itemKey=item.key;
  const m=equipmentMaterials(item),f=item.family,heavy=f==='plate'||f==='mythic',ornate=f==='mythic';
  if(item.slot==='off'){
    const round=item.baseId==='buckler'||(item.tier<2&&item.baseId!=='kiteshield');
    if(round){
      const shield=mesh(root,new THREE.CylinderGeometry(.225,.225,.045,24),m.wood);shield.rotation.x=Math.PI/2;mesh(root,new THREE.TorusGeometry(.223,.011,6,24),m.metal);
      for(let i=-2;i<=2;i++){const x=i*.067,h=Math.sqrt(.215*.215-x*x);rod(root,m.dark,[x,-h,.025],[x,h,.025],.003);}
      for(let i=0;i<12;i++){const a=i*Math.PI/6;rivet(root,m.trim,Math.sin(a)*.198,Math.cos(a)*.198,.029,.007);}
    }else{
      const outline=[[-.22,.265,0],[0,.292,.065],[.22,.265,0],[.207,-.045,0],[.115,-.244,.021],[0,-.36,.049],[-.115,-.244,.021],[-.207,-.045,0]].reverse();
      formedPlate(root,m.metal,outline,[0,-.01,.082],m.trim);edge(root,m.edge,outline.map(([x,y,z])=>[x*.88,y*.91,z+.006]),.004);
      // Backing keeps the shield substantial when seen from behind.
      plate(root,m.leather,outline.map(([x,y])=>[x,y]),.017,[0,0,-.016]);
      for(const s of [-1,1])for(const y of [.218,.06,-.095])rivet(root,m.trim,s*(y<0?.16:.188),y,.021,.006);
      plate(root,m.trim,[[-.127,.14],[0,.063],[.127,.14],[.118,.104],[0,.017],[-.118,.104]],.008,[0,0,.075]);
      plate(root,m.trim,[[-.013,.22],[.013,.22],[.013,-.19],[0,-.22],[-.013,-.19]],.008,[0,0,.08]);
    }
    orb(root,m.metal,[0,0,.047],[.061,.061,.035]);
  }else if(item.slot==='head'){
    mesh(root,new THREE.SphereGeometry(.139,16,10,0,Math.PI*2,0,Math.PI*.59),f==='light'?m.leather:m.metal,[0,.07,-.008],[1,1.16,1]);
    const rim=mesh(root,new THREE.TorusGeometry(.136,.008,5,20),m.trim,[0,.062,-.008]);rim.rotation.x=Math.PI/2;
    curved(root,m.trim,[[0,.058,-.145],[0,.199,-.07],[0,.229,0],[0,.196,.093],[0,.074,.139]],.006);
    if(f!=='light')for(const s of [-1,1]){
      plate(root,m.metal,[[s*.115,.068],[s*.136,.01],[s*.119,-.093],[s*.054,-.118],[s*.06,-.025],[s*.086,.025]],.018,[0,0,.075]);rivet(root,m.trim,s*.115,.04,.107,.009);
    }
    if(heavy){
      for(const s of [-1,1]){
        const outline=[[s*.008,.038,.15],[s*.108,.025,.12],[s*.091,-.068,.125],[s*.018,-.11,.15]];if(s>0)outline.reverse();formedPlate(root,m.metal,outline,[s*.034,-.018,.177],m.edge);
        rod(root,m.dark,[s*.017,.054,.143],[s*.106,.048,.125],.008);
        for(let i=0;i<3;i++)rod(root,m.dark,[s*(.032+i*.021),-.027,.168-i*.01],[s*(.031+i*.021),-.059,.167-i*.01],.0025);
      }
      plate(root,m.trim,[[-.018,.107],[0,.145],[.018,.107],[.013,.04],[0,-.034],[-.013,.04]],.012,[0,0,.138]);
    }
    if(ornate){const crest=plate(root,m.metal,[[-.08,.15],[-.055,.247],[0,.29],[.065,.203],[.087,.13]],.014,[0,0,-.035]);crest.rotation.y=Math.PI/2;}
  }else if(item.slot==='gloves'){
    orb(root,m.leather,[0,-.047,.005],[.047,.069,.043]);mesh(root,new THREE.CylinderGeometry(.057,.046,.16,12),m.leather,[0,.05,0]);
    for(let i=0;i<(heavy?3:2);i++)plate(root,heavy?m.metal:m.leather,[[-.044,.023],[.044,.023],[.049,-.02],[0,-.031],[-.049,-.02]],.01,[0,.115-i*.048,.044]);
    for(let i=0;i<4;i++)box(root,heavy?m.metal:m.leather,[-.03+i*.02,-.045,.047],[.017,.041,.015]);
    band(root,m.trim,.104,.058,.009);for(const s of [-1,1])rivet(root,m.trim,s*.033,.04,.057,.005);
  }else if(item.slot==='boots'){
    plate(root,m.leather,[[-.062,-.02],[-.067,.123],[-.041,.167],[.041,.167],[.067,.123],[.062,-.07],[-.053,-.075]],.075,[0,.012,.015]).rotation.x=Math.PI/2;
    mesh(root,new THREE.CylinderGeometry(.077,.052,.28,12),m.leather,[0,.15,-.024]);
    if(heavy){
      formedPlate(root,m.metal,[[-.065,.275,.03],[0,.311,.045],[.065,.275,.03],[.049,.045,.046],[0,.012,.076],[-.049,.045,.046]].reverse(),[0,.169,.087],m.edge);
      for(let i=0;i<3;i++){const p=plate(root,m.metal,[[-.056,-.01],[.056,-.01],[.051,.038],[.035,.053],[-.035,.053],[-.051,.038]],.012,[0,.016-i*.009,.074+i*.037]);p.rotation.x=-Math.PI/2;}
    }
    for(const y of [.245,.068]){band(root,m.leather,y,.079,.026,.9);box(root,m.trim,[.04,y,.047],[.029,.024,.01]);}
  }else if(item.slot==='belt'){
    band(root,m.leather,.079,.183,.083,.81);
    const buckle=mesh(root,new THREE.TorusGeometry(.034,.006,4,4),m.trim,[0,.08,.153],[1.25,.85,1]);buckle.rotation.z=Math.PI/4;rod(root,m.trim,[0,.082,.16],[.034,.082,.16],.004);
    for(const s of [-1,1]){const pouch=plate(root,m.leather,[[-.032,.052],[.032,.052],[.039,-.035],[.024,-.061],[-.027,-.061],[-.039,-.035]],.052,[s*.167,.015,.063]);pouch.rotation.y=s*.55;rivet(pouch,m.trim,0,.011,.058,.006);}
  }else if(item.slot==='amulet'){
    curved(root,m.trim,[[-.072,.145,.08],[-.05,.071,.153],[0,.015,.178],[.05,.071,.153],[.072,.145,.08]],.004);
    plate(root,m.trim,[[0,.039],[.031,0],[0,-.043],[-.031,0]],.01,[0,.012,.167]);mesh(root,new THREE.OctahedronGeometry(.025),m.glow,[0,.01,.184],[.7,1.2,.4]);
  }else if(item.slot.startsWith('ring')){
    const ring=mesh(root,new THREE.TorusGeometry(.021,.0045,5,12),m.trim,[.013,-.065,.028]);ring.rotation.y=Math.PI/2;mesh(root,new THREE.OctahedronGeometry(.01),m.glow,[.013,-.065,.049]);
  }
  return combineStatic(root);
}
