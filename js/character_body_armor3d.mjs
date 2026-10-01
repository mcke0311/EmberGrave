import * as THREE from './vendor/three/three.module.min.js';
import {UNIQUE_MODELS3D} from './character_unique_catalog3d.mjs?v=body-armor-1';
import {CLASS_STYLES} from './character_catalog3d.mjs?v=body-armor-1';
import {armorRank,classMaterials} from './character_armor3d.mjs?v=body-armor-1';
import {equipmentMaterials,disposeMaterials} from './character_materials3d.mjs?v=2';
import {mesh,plate,rod,rivet,combineStatic} from './character_mesh3d.mjs?v=body-armor-1';
import {box,domedPlate} from './character_unique_mesh3d.mjs?v=body-armor-1';
import {uniqueMaterials,uniqueSurface,shadeUnique,packUniqueSurfaces} from './character_unique_surfaces3d.mjs?v=body-armor-1';

const group=name=>{const g=new THREE.Group();g.name=name;return g;};
function profile(item,id){
  if(item.modelId){const recipe=UNIQUE_MODELS3D[item.modelId];if(!recipe?.limbs)throw Error('Missing or invalid unique 3D model: '+item.modelId);return {...recipe.limbs,unique:recipe,rank:armorRank(item)};}
  const rank=armorRank(item),style={vanguard:['leather','mail','plate','heraldic'],emberwitch:['wraps','embroidered','flame','phoenix'],gravebinder:['shroud','bone','ossuary','reliquary'],wildkeeper:['hide','fang','bark','elder'],veilranger:['trail','stitched','layered','veil']}[id][rank];
  return {style,rank,surface:id==='vanguard'?(rank===1?'mail':rank===0?'leather':'cloth'):['emberwitch','gravebinder'].includes(id)?'cloth':'leather',arms:1+rank*.025,legs:1+rank*.025,cuff:.92};
}
function materials(item,id,p){
  if(p.unique){const m=uniqueMaterials(item,p.unique);if(p.surface==='mail')m.mail=uniqueSurface(item.material.metal,'mail',p.unique.refinement);return m;}
  if(id!=='vanguard')return classMaterials(item,id);
  const palette={...item.material,cloth:'#'+new THREE.Color(item.material.cloth).lerp(new THREE.Color(CLASS_STYLES[id].cloth),.55).getHexString()};
  return equipmentMaterials({...item,material:palette});
}

// Open, tapered garment tubes are authored in the original rest pose. A single
// skinned batch keeps elbow/knee seams together and avoids hidden end caps.
function garment(root,mat,start,end,radii,bindPositions,boneNames,p){
  const a=bindPositions[start],b=bindPositions[end],delta=b.clone().sub(a),length=delta.length(),q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,-1,0),delta.clone().normalize());
  const pos=[],uv=[],index=[],skinIndex=[],skinWeight=[],segments=12,rows=[0,.16,.4,.68,.87,1];
  for(let row=0;row<rows.length;row++){
    const t=rows[row],center=a.clone().lerp(b,t),radius=THREE.MathUtils.lerp(radii[0],radii[1],t)*(1+Math.sin(t*Math.PI)*(p.surface==='cloth'?.055:.025));
    const weight=THREE.MathUtils.smoothstep(t,.72,1);
    for(let j=0;j<=segments;j++){
      const angle=j/segments*Math.PI*2,fold=p.surface==='cloth'?1+Math.cos(angle*6+t*2)*.018:1;
      const v=new THREE.Vector3(Math.sin(angle)*radius*fold,0,Math.cos(angle)*radius*fold*.91).applyQuaternion(q).add(center);
      pos.push(...v.toArray());uv.push(j/segments,t*length*3);
      skinIndex.push(boneNames.indexOf(start),boneNames.indexOf(end),0,0);skinWeight.push(1-weight,weight,0,0);
    }
  }
  for(let row=0;row<rows.length-1;row++)for(let j=0;j<segments;j++){const x=row*(segments+1)+j,y=x+segments+1;index.push(x,y,x+1,x+1,y,y+1);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(skinIndex,4));g.setAttribute('skinWeight',new THREE.Float32BufferAttribute(skinWeight,4));g.setIndex(index);g.computeVertexNormals();
  mesh(root,g,mat);return {start,end,firstVertex:0,vertices:index.length};
}
function panel(parent,mat,width,top,bottom,z,style,bevel=.002){
  const points=style==='bastion'?[[-width,top],[-width*.65,top+.025],[0,top+.05],[width*.65,top+.025],[width,top],[width*.87,bottom],[0,bottom-.022],[-width*.87,bottom]]:
    ['dragon','forge','bark','elder'].includes(style)?[[-width,top],[width,top],[width*.83,bottom],[0,bottom-.031],[-width*.83,bottom]]:
    ['flame','phoenix','woven'].includes(style)?[[-width*.7,top],[0,top+.032],[width*.7,top],[width,bottom+.03],[width*.65,bottom],[0,bottom-.02],[-width*.65,bottom],[-width,bottom+.03]]:
    [[-width,top],[width,top],[width*.92,bottom],[width*.5,bottom-.013],[-width*.75,bottom-.013]];
  return domedPlate(parent,mat,points,.006,.009,[0,0,z],bevel);
}
function decorate(parent,m,p,id,kind){
  const arm=kind==='UpperArm'||kind==='Forearm',upper=kind==='UpperArm'||kind==='Thigh',w=arm?(upper?.072:.061):(upper?.082:.065),z=arm?(upper?.091:.076):(upper?.099:.077),top=upper?-.09:-.036,bottom=upper?(arm?-.218:-.315):-.245;
  const style=p.style,rank=p.rank,solid=p.unique?m.metal:id==='gravebinder'?m.bone:id==='wildkeeper'?m.bark:id==='emberwitch'?m.cloth:rank<2?m.leather:m.metal;
  const trim=p.unique?m.edge:m.trim;
  if(style==='quilt'){
    for(let row=0;row<3;row++)for(const s of [-1,1]){
      const y=top-.029-row*(upper?.052:.044),tile=box(parent,m.cloth,[s*w*.44,y,z],[w*.79,.039,.009]);tile.rotation.y=s*.18;
      rod(parent,m.trim,[s*w*.07,y+.021,z+.008],[s*w*.81,y+.021,z+.008],.0018);
    }
    for(const s of [-1,1])rod(parent,m.leather,[s*w*.95,top,z-.007],[s*w*.86,bottom+.027,z+.005],.003);
  }else if(style==='riveted'){
    panel(parent,m.leather,w,top,bottom,z,style,.0015);
    for(const s of [-1,1])for(let i=0;i<3;i++)rivet(parent,m.trim,s*w*.7,top-.025-i*.067,z+.017,.004);
    rod(parent,m.trim,[-w*.63,top-.018,z+.018],[w*.63,top-.018,z+.018],.003);
  }else if(style==='dragon'||style==='forge'){
    for(let row=0;row<(upper?3:2);row++){
      const y=top-row*(style==='forge'?.072:.062),scale=panel(parent,m.metal,w*(1-row*.085),y,y-.061,z+row*.002,style,p.unique.refinement.bevel);
      scale.rotation.y=kind==='UpperArm'?.10:0;
      rod(parent,style==='forge'?m.trim:m.edge,[-w*.76,y-.008,z+.02],[w*.76,y-.008,z+.02],.0025);
    }
    if(upper)panel(parent,m.trim,w*.23,top+.008,top-.047,z+.027,style,.001);
  }else if(style==='linked'){
    panel(parent,m.metal,w*1.04,top,bottom,z,style,.003);
    for(let i=0;i<3;i++){const y=top-.028-i*(upper?.073:.063);box(parent,m.edge,[0,y,z+.02],[w*1.9,.016,.010]);for(const s of [-1,1])rivet(parent,m.trim,s*w*.76,y,z+.029,.004);}
    for(const s of [-1,1])rod(parent,m.dark,[s*w*.91,top-.011,z+.019],[s*w*.89,bottom+.01,z+.022],.003);
  }else if(style==='cracked'){
    for(let row=0;row<3;row++){
      const y=top-row*.069;
      plate(parent,m.metal,[[-w,y],[w*.87,y+.007],[w,y-.044],[w*.22,y-.035],[-w*.12,y-.052],[-w*.9,y-.047]],.009,[0,0,z],.003);
      rod(parent,m.glow,[-w*.58,y-.015,z+.020],[w*.04,y-.032,z+.020],.002);rod(parent,m.glow,[w*.04,y-.032,z+.02],[w*.63,y-.019,z+.02],.002);
    }
  }else if(style==='woven'){
    panel(parent,m.metal,w,top,bottom,z,style,.002);
    for(let row=0;row<3;row++)for(const s of [-1,1]){
      const y=top-.025-row*.065;rod(parent,m.trim,[-w*.8,y,z+.016],[w*.8,y-.045*s,z+.019],.003);
    }
    for(const s of [-1,1])rod(parent,m.edge,[s*w*.85,top,z+.019],[s*w*.88,bottom+.023,z+.019],.003);
  }else if(style==='bastion'){
    panel(parent,m.metal,w*1.04,top,bottom,z,style,.003);
    box(parent,m.trim,[0,(top+bottom)*.5,z+.024],[.018,top-bottom+.033,.015]);
    for(const s of [-1,1]){box(parent,m.edge,[s*w*.76,(top+bottom)*.5,z+.022],[.012,top-bottom-.03,.012]);box(parent,m.trim,[s*w*.76,top-.02,z+.024],[.025,.032,.021]);}
  }else{
    // Ordinary armor inherits its class's garment and defense language.
    panel(parent,solid,w,top,bottom,z,style,rank>=2?.003:.001);
    if(id==='emberwitch'){
      for(const s of [-1,1])rod(parent,m.trim,[s*w*.6,top-.02,z+.016],[0,bottom+.04,z+.021],.0025);
      if(rank>=2)plate(parent,m.lining,[[0,top-.025],[-w*.3,top-.09],[0,bottom+.027],[w*.3,top-.09]],.004,[0,0,z+.022],0);
    }else if(id==='gravebinder'){
      for(const s of [-1,1])rod(parent,rank?m.bone:m.leather,[s*w*.45,top-.027,z+.018],[s*w*.38,bottom+.016,z+.02],rank?.008:.003);
      if(rank>=2)for(let i=0;i<3;i++)box(parent,m.bone,[0,top-.048-i*.060,z+.022],[w*1.4,.016,.014]);
    }else if(id==='wildkeeper'){
      for(let i=0;i<rank+1;i++)plate(parent,rank>=2?m.bark:m.leather,[[-w*.75,.015],[w*.75,.02],[w*.5,-.032],[0,-.054],[-w*.65,-.036]],.009,[0,top-.034-i*.048,z+.017],.002);
      for(const s of [-1,1])rivet(parent,m.bone,s*w*.65,top-.028,z+.027,.005);
    }else if(id==='veilranger'){
      for(let i=0;i<2+rank;i++)rod(parent,i%2?m.lining:m.trim,[-w*.72,top-.036-i*.033,z+.016],[w*.72,top-.048-i*.033,z+.017],.0025);
    }else{
      for(let i=0;i<rank+1;i++)box(parent,trim,[0,top-.025-i*.051,z+.019],[w*1.62,.011,.012]);
      for(const s of [-1,1])rivet(parent,m.trim,s*w*.67,top-.026,z+.029,.004);
    }
  }
  if(kind==='Thigh'){
    // The last articulated plate covers the knee while the calf stays free.
    panel(parent,solid,w*.82,-.357,-.407,z*.78,style,p.unique?.refinement.bevel||.002);
  }
}

export function createArmorLimbs(item,classId,bindPositions,boneNames){
  const p=profile(item,classId),m=materials(item,classId,p),shell=group(item.name+' / sleeves and trousers'),parts={},regions=[];
  const cloth=p.surface==='mail'?(m.mail||m.metal):m[p.surface],legMat=p.surface==='mail'?cloth:m.cloth;
  for(const side of ['L','R']){
    for(const [start,end,radii,mat] of [
      ['UpperArm','Forearm',[.091*p.arms,.067],cloth],['Forearm','Hand',[.069,.044*p.cuff],cloth],
      ['Thigh','Shin',[.096*p.legs,.071],legMat],['Shin','Foot',[.072,.048*p.cuff],legMat]
    ]){
      const before=shell.children.reduce((n,o)=>n+(o.geometry.index?.count||o.geometry.attributes.position.count),0),region=garment(shell,mat,start+side,end+side,radii,bindPositions,boneNames,p);region.firstVertex=before;regions.push(region);
      const part=group(item.name+' / '+start+side);part.userData.bodyArmorLimb=true;part.userData.modelId=item.modelId||null;
      if(start==='Forearm')part.userData.armorOverlapSlot='gloves';if(start==='Shin')part.userData.armorOverlapSlot='boots';
      decorate(part,m,p,classId,start);parts[start+side]=part;
    }
  }
  const roots=[shell,...Object.values(parts)],finish=p.unique?.refinement||{wear:.35};
  for(const r of roots)shadeUnique(r,finish);packUniqueSurfaces(roots);
  for(const r of roots){combineStatic(r);r.traverse(o=>{if(o.isMesh)o.userData.bodyArmorLimb=true;});}
  disposeMaterials(Object.values(m).filter(mat=>mat?.isMaterial));
  // Rigid defenses use one bone at weight 1; flexible garments retain blended
  // joints. Both share one draw call. Logical bone attachments remain separate
  // so slot ownership and the registry still describe each articulated piece.
  let offset=shell.children[0].geometry.attributes.position.count;const guardRanges=[];
  for(const [bone,part] of Object.entries(parts))for(const object of [...part.children])if(object.isMesh){
    const g=object.geometry,count=g.attributes.position.count,indices=new Uint16Array(count*4),weights=new Float32Array(count*4);
    for(let i=0;i<count;i++){indices[i*4]=boneNames.indexOf(bone);weights[i*4]=1;}
    g.translate(...bindPositions[bone].toArray());g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(indices,4));g.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));
    guardRanges.push({bone,slot:part.userData.armorOverlapSlot||null,first:offset,count});offset+=count;shell.add(object);
  }
  combineStatic(shell);
  const batch=shell.children.find(o=>o.isMesh);batch.removeFromParent();batch.name=item.name+' / sleeves and trousers';batch.userData.itemKey=item.key;batch.userData.modelId=item.modelId||null;batch.userData.limbRegions=regions;batch.userData.guardRanges=guardRanges;
  batch.geometry.setIndex(new THREE.BufferAttribute(new Uint16Array(Array.from({length:offset},(_,i)=>i)),1));
  batch.userData.coverageMask=0;batch.userData.coverageIndices=new Map();
  return {shell:batch,parts};
}

export function updateArmorLimbCoverage(limbs,equipment){
  if(!limbs)return;const mask=(equipment.gloves?1:0)|(equipment.boots?2:0),state=limbs.userData;if(state.coverageMask===mask)return;
  if(!state.coverageIndices.has(mask)){
    const excluded=state.guardRanges.filter(r=>r.slot==='gloves'&&(mask&1)||r.slot==='boots'&&(mask&2)),indices=[];
    for(let i=0;i<limbs.geometry.attributes.position.count;i++)if(!excluded.some(r=>i>=r.first&&i<r.first+r.count))indices.push(i);
    state.coverageIndices.set(mask,new Uint16Array(indices));
  }
  const indices=state.coverageIndices.get(mask);limbs.geometry.index.array.set(indices);limbs.geometry.index.needsUpdate=true;limbs.geometry.setDrawRange(0,indices.length);state.coverageMask=mask;
}

export function attachArmorLimbDetails(parts,limbs){
  for(const [bone,guard] of Object.entries(limbs)){
    if(bone.startsWith('UpperArm')){
      const shoulder=parts[bone],wrapper=group(shoulder.name);shoulder.userData.armorPauldron=true;wrapper.add(shoulder,guard);parts[bone]=wrapper;
    }else if(parts[bone])parts[bone].add(guard);else parts[bone]=guard;
  }
  return parts;
}
