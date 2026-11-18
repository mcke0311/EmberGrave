import * as THREE from './vendor/three/three.module.min.js';
import {mesh, orb, combineStatic} from './character_mesh3d.mjs?v=body-armor-1';
import {heroPanel} from './character_finish3d.mjs';

// Rows hold faces, chest swatches, outer garments and wraparound vests. The image is
// decoded before the first frame. CPU-only rig tools need only the geometry.
const source = new THREE.Source();
if (typeof Image !== 'undefined') {
  const sheet = new Image();
  sheet.src = new URL('assets/characters/hero-surfaces.webp', new URL('../', import.meta.url)).href;
  await sheet.decode();
  source.data = sheet;
  source.needsUpdate = true;
}
const classes = ['vanguard', 'emberwitch', 'gravebinder', 'wildkeeper', 'veilranger'];
const atlasRows = 4;
const cuts = {
  vanguard:   {jaw:1.10, cheek:1.01, hair:.064, shoulder:.128, hem:.072, vest:.14},
  emberwitch: {jaw:.84,  cheek:.93,  hair:.24,  shoulder:.104, hem:.090, vest:.19},
  gravebinder:{jaw:.88,  cheek:.96,  hair:.12,  shoulder:.106, hem:.080, vest:.23},
  wildkeeper: {jaw:1.06, cheek:1.04, hair:.17,  shoulder:.139, hem:.098, vest:.16},
  veilranger: {jaw:.87,  cheek:.94,  hair:.14,  shoulder:.101, hem:.066, vest:.21}
};
const tau = Math.PI * 2;
const clamp = THREE.MathUtils.clamp;

export function isStarterVest(item) {
  return item?.baseId === 'quiltvest' && !item.namedId && item.family === 'light';
}

export function paintedMaterial(id, row) {
  const tile = 256, inset = 1.5 / tile;
  const map = new THREE.Texture();
  // Mark the new view for initialization before attaching the immutable
  // source. An outfit swap can then reuse the atlas already on the GPU.
  if (source.data) map.needsUpdate = true;
  map.source = source;
  map.colorSpace = THREE.SRGBColorSpace;
  map.offset.set((classes.indexOf(id) + inset) / 5, (atlasRows - 1 - row + inset) / atlasRows);
  map.repeat.set((1 - 2 * inset) / 5, (1 - 2 * inset) / atlasRows);
  return new THREE.MeshStandardMaterial({map, roughness:row === 0 ? .91 : .96, side:THREE.DoubleSide});
}

function swatch(id,row,x,y,w,h) {
  const material=paintedMaterial(id,row),map=material.map;
  map.offset.x+=map.repeat.x*x;map.offset.y+=map.repeat.y*y;
  map.repeat.x*=w;map.repeat.y*=h;
  return material;
}
export const skinMaterial=id=>heroPanel(id,5,[.10,.09,.15,.22]);
export const bootMaterial=id=>heroPanel(id,8,[.02,.01,.96,.96],{vertexColors:true});

// A shared UV grid lets the face, folds and stitching follow their silhouettes.
export function surface(columns, rows, sample) {
  const positions = [], uv = [], triangles = [];
  for (let j = 0; j <= rows; j++) {
    for (let i = 0; i <= columns; i++) {
      const u = i / columns, v = j / rows;
      const [x,y,z,s=u,t=v] = sample(u,v);
      positions.push(x,y,z); uv.push(s,t);
      if (i < columns && j < rows) {
        const a = j * (columns + 1) + i, b = a + columns + 1;
        triangles.push(a,a+1,b, b,a+1,b+1);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions,3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv,2));
  g.setIndex(triangles); g.computeVertexNormals();
  return g;
}

function faceGeometry(id) {
  const cut = cuts[id];
  // Chin, jaw angle, mouth, nose, cheekbone, brow, forehead, crown.
  const rings = [[-.104,.034,.066,.029],[-.083,.066,.086,.023],[-.052,.090,.096,.017],
    [-.027,.099,.101,.012],[.003,.105,.101,.011],[.025,.111,.104,.008],
    [.054,.114,.102,.006],[.078,.115,.101,.003],[.105,.116,.104,-.001],
    [.145,.111,.099,-.005],[.170,.091,.086,-.009],[.193,.050,.058,-.010],[.201,.005,.009,-.010]];
  return surface(40,rings.length-1,(u,v) => {
    const [y,rx,rz,offset] = rings[Math.round(v*(rings.length-1))];
    const a = (u-.5)*tau, side = Math.sin(a), front = Math.cos(a);
    const width = rx * THREE.MathUtils.lerp(cut.jaw, cut.cheek, clamp((y+.08)/.115,0,1));
    const x = width * side, mask = Math.max(0,front);
    const bump = (cx,cy,wx,wy) => Math.exp(-(((Math.abs(x)-cx)/wx)**2 + ((y-cy)/wy)**2));
    const sculpt = .030*bump(0,.014,.025,.022) + .022*bump(0,.040,.017,.042)
      + .010*bump(.050,.026,.032,.020) - .010*bump(.049,.060,.025,.012)
      + .009*bump(.045,.078,.034,.015) + .010*bump(0,-.030,.041,.013);
    // Match the front painting to the cheekbones, then unwrap past the ears
    // to the painted hairline at the center back.
    const projected = .5+Math.asin(clamp(x/.123,-1,1))/tau;
    const s = THREE.MathUtils.lerp(u,projected,clamp((front-.10)/.45,0,1));
    const t = .087 + (y+.104)/.305*.90;
    return [x,y,offset + front*rz + sculpt*mask,s,t];
  });
}

// Taper a swept section along the centerline. Used for locks, fingers, antler
// tines and weapon carving, all of which finish at a visible point.
export function tapered(points, radii, sides=8) {
  const centers = points.map(p=>new THREE.Vector3(...p));
  const curve = new THREE.CatmullRomCurve3(centers);
  const steps = (points.length-1)*4, frames = curve.computeFrenetFrames(steps,false);
  return surface(sides,steps,(u,v) => {
    const i = Math.round(v*steps), a = u*tau, span = v*(radii.length-1);
    const k = Math.min(Math.floor(span),radii.length-2), r = THREE.MathUtils.lerp(radii[k],radii[k+1],span-k);
    const p = curve.getPointAt(v).addScaledVector(frames.normals[i],r*Math.cos(a))
      .addScaledVector(frames.binormals[i],r*Math.sin(a));
    return [p.x,p.y,p.z,u,v];
  });
}

export function sculptHead(head, id, materials, hairParts, headStyle) {
  mesh(head,faceGeometry(id),heroPanel(id,9),[0,0,0],[1,1,1],'Face');
  const cut = cuts[id], hair = new THREE.Group(), hairPaint=heroPanel(id,4);
  hair.name='Hair';head.add(hair);hairParts.push(hair);
  const cap = surface(32,10,(u,v) => {
    const a = (u-.5)*tau, front = (Math.cos(a)+1)/2;
    const sideburn=Math.exp(-((Math.abs(a)-1.56)**2)/.115);
    const edge = -.064 + .208*front**2 + .092*sideburn - .017*Math.sin(3*a+.45)*front
      +.006*Math.sin(a*9+.6)+.004*Math.cos(a*17);
    const y=edge+(.216-edge)*v;
    const ring = Math.sqrt(Math.max(.0001,1-(Math.max(0,y-.108)/.108)**2))*(1+.026*Math.cos(11*a+v*2));
    return [.126*ring*Math.sin(a),y,-.010+.119*ring*Math.cos(a),.5-.48*Math.sin(a),.14+.84*v];
  });
  mesh(hair,cap,hairPaint);
  for (let i=0;i<11;i++) {
    const center=(.30+i*.14)*Math.PI;
    const lock=surface(5,8,(u,v)=>{
      const width=.035+.28*Math.sin(v*1.48),a=center+(u-.5)*width+.14*(1-v)*Math.sin(i+1.2);
      const earCut=Math.exp(-((Math.abs(Math.cos(center))/.28)**2));
      const tip=THREE.MathUtils.lerp(-cut.hair*(.70+.24*Math.cos(i*2.5))+.026,.085,earCut);
      const y=.113*v+tip*(1-v);
      const radius=.122+.009*Math.sin(u*Math.PI)+.013*Math.sin(v*Math.PI)-.016*(1-v)**3;
      return [Math.sin(a)*radius,y,Math.cos(a)*radius*.91-.021,.5-.43*Math.sin(a)+.035*(u-.5),.02+.64*v];
    });
    mesh(hair,lock,hairPaint);
  }
  combineStatic(hair);
  const nape=new THREE.Group();nape.name='HairAtNape';head.add(nape);hairParts.push(nape);
  mesh(nape,surface(24,5,(u,v)=>{
    const a=(.39+1.22*u)*Math.PI,edge=-.056-.25*cut.hair+.012*Math.cos(11*a);
    const r=.115+.004*Math.sin(v*Math.PI);
    return [r*Math.sin(a),edge+(.077-edge)*v,-.012+r*Math.cos(a),.5-.47*Math.sin(a),.02+.57*v];
  }),hairPaint);
  const ears = new THREE.Group(); head.add(ears);
  const earPaint=heroPanel(id,5);
  for (const s of [-1,1]) {
    mesh(ears,surface(20,10,(u,v)=>{
      const a=(u-.5)*tau, h=Math.sin(v*Math.PI), earZ=Math.sin(a)*h;
      const rim=.006*Math.sin(2*Math.PI*v)*Math.cos(a)*h;
      return [s*(.111+.023*Math.cos(a)*h+rim),-.014+.086*v,-.002+earZ*.028-.009*v,
        .52-.30*earZ,.09+.80*v];
    }),earPaint);
  }
  combineStatic(ears);

  if (id==='gravebinder' || id==='veilranger') {
    const deep = id==='gravebinder';
    const hood = surface(32,12,(u,v) => {
      const a=(u-.5)*tau, front=Math.max(0,Math.cos(a));
      const edge=-.146+.271*front**2.4,y=edge+(.242-edge)*v;
      const swell=Math.sqrt(Math.max(.0001,1-(Math.max(0,y-.112)/.13)**2));
      const fold=(1+.046*Math.cos(8*a+v))*swell;
      return [Math.sin(a)*.148*fold,y,Math.cos(a)*.16*fold-.015-(deep?.073:.052)*v*v*(1-.75*front),.5+.46*Math.sin(a),v];
    });
    const fabric=swatch(id,2,.14,.56,.24,.38);
    mesh(headStyle,hood,fabric);
    if (!deep) {
      const mask=surface(16,4,(u,v)=>{
        const a=(u-.5)*Math.PI;
        return [Math.sin(a)*.115,-.078+v*.093+Math.cos(a)*.013,Math.cos(a)*(.116+.006*Math.sin(v*Math.PI))+.004];
      });
      mesh(headStyle,mask,fabric);
    }
  }
  if (id==='wildkeeper') {
    for (const s of [-1,1]) {
      const tine=(points,radii)=>mesh(headStyle,tapered(points.map(([x,y,z])=>[s*x,y,z]),radii),materials.wood);
      tine([[.090,.146,.0],[.145,.228,-.023],[.232,.302,-.062],[.29,.409,-.095],[.269,.494,-.126]],[.031,.028,.022,.014,.001]);
      tine([[.155,.24,-.032],[.144,.321,.006],[.112,.373,.033]],[.018,.012,.001]);
      tine([[.227,.299,-.060],[.289,.332,-.021],[.335,.384,.005]],[.018,.012,.001]);
      tine([[.272,.386,-.087],[.231,.420,-.059],[.218,.465,-.063]],[.014,.010,.001]);
    }
    combineStatic(headStyle);
  }
}

export function sculptHand(parent, mat, side) {
  const s=side==='L'?1:-1, hand=new THREE.Group();
  hand.name='HandMesh'+side; parent.add(hand);
  orb(hand,mat,[0,-.035,.003],[.037,.044,.029]);
  for(let i=0;i<4;i++) {
    const x=s*(i-1.5)*.015, length=.083-Math.abs(i-1)*.006;
    mesh(hand,tapered([[x,-.045,.007],[x,-.064,.019],[x,-length,.014],[x,-length-.004,.001]],
      [.011,.011,.009,.002],6),mat);
  }
  mesh(hand,tapered([[-s*.023,-.024,.002],[-s*.041,-.043,.026],[-s*.033,-.064,.033]], [.017,.013,.005]),mat);
  combineStatic(hand);
  const g=hand.children.find(o=>o.isMesh).geometry,pos=g.attributes.position,uv=g.attributes.uv;
  for(let i=0;i<pos.count;i++)
    uv.setXY(i,clamp(.5+s*pos.getX(i)/.092,.025,.975),clamp((pos.getY(i)+.094)/.104,.02,.98));
  return hand;
}

export function bootGeometry() {
  // The flat outsole, curved vamp and raised tongue meet the shin underlayer.
  const rows=[[-.078,.048,.141,-.061],[-.067,.055,.148,-.065],[-.056,.055,.148,-.065],
    [-.033,.053,.138,-.063],[-.016,.050,.108,-.060],[.013,.046,.055,-.056],
    [.054,.051,.043,-.058],[.066,.053,.044,-.058]];
  const g=surface(20,rows.length-1,(u,v)=>{
    const [y,rx,toe,heel]=rows[Math.round(v*(rows.length-1))],a=(u-.5)*tau,z=Math.cos(a);
    const x=rx*Math.sin(a), fore=(toe+heel)*.5+z*(toe-heel)*.5;
    return [x,y,fore,.5+x/.122,clamp(.28+v*.69-.24*Math.max(0,z)*(1-v),.02,.98)];
  });
  const tones=[],pos=g.attributes.position;
  for(let i=0;i<pos.count;i++){
    const y=pos.getY(i),value=y<-.065?.33:y<-.054?.66:y>.053?.78:1;
    tones.push(value,value*.96,value*.9);
  }
  g.setAttribute('color',new THREE.Float32BufferAttribute(tones,3));
  return g;
}

export function coatGeometry(id,index) {
  const cut=cuts[id], skew=(index%2?1:-1), robe=id==='emberwitch'||id==='gravebinder';
  return surface(6,7,(u,v)=>{
    const drop=1-v, w=.067+drop*cut.hem*.55;
    const fold=Math.cos((u*2.1+.21*drop)*Math.PI);
    return [(u-.5)*2*w+skew*drop*drop*.022,-drop*(.49+(robe?.085:.045)*(1-Math.abs(u-.44)*1.5)),
      drop*(.103+.042*drop)+.015*fold*(.4+drop),u,v];
  });
}

// One rigid weight per moving hem preserves its original pivot, including
// nonuniform rank scaling. All eight panels share a single material and draw.
export function createSplitCoat(hips,id) {
  const panels=[],ranges=[],positions=[],normals=[],uv=[],joints=[],weights=[],indices=[];
  for(let i=0;i<8;i++){
    const angle=i*tau/8,pivot=new THREE.Bone();
    pivot.name='CoatPanel'+i;
    pivot.position.set(Math.sin(angle)*.14,-.025,Math.cos(angle)*.115);
    pivot.rotation.y=angle;hips.add(pivot);panels.push(pivot);pivot.updateMatrix();
    const part=coatGeometry(id,i).applyMatrix4(pivot.matrix);
    const first=positions.length/3,count=part.attributes.position.count;
    ranges.push({first,count,start:indices.length,indices:part.index.count});
    positions.push(...part.attributes.position.array);normals.push(...part.attributes.normal.array);
    for(let j=0;j<count;j++){
      const t=part.attributes.uv.getY(j);
      uv.push(((i+2)%4+part.attributes.uv.getX(j))/4,id==='vanguard'||id==='gravebinder'?.66+.32*t:t);
      joints.push(i,0,0,0);weights.push(1,0,0,0);
    }
    for(const index of part.index.array)indices.push(first+index);
    part.dispose();
  }
  const g=new THREE.BufferGeometry(), colors=new THREE.BufferAttribute(new Float32Array(positions.length).fill(1),3);
  g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  g.setAttribute('color',colors);g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(joints,4));
  g.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));g.setIndex(indices);
  const material=heroPanel(id,0,undefined,{vertexColors:true});
  const cloth=new THREE.SkinnedMesh(g,material);cloth.name='SplitCoat';cloth.frustumCulled=false;
  hips.add(cloth);hips.updateWorldMatrix(true,true);cloth.bind(new THREE.Skeleton(panels));
  let lastMask=-1;
  function tint(index,color) {
    const {first,count}=ranges[index];
    for(let j=first;j<first+count;j++)colors.setXYZ(j,color.r,color.g,color.b);
    colors.needsUpdate=true;
  }
  function fit() {
    const mask=panels.reduce((bits,p,i)=>bits|(p.visible?1<<i:0),0);
    if(mask===lastMask)return;
    lastMask=mask;cloth.visible=!!mask;
    let count=0;
    panels.forEach((p,i)=>{
      if(!p.visible)return;
      const r=ranges[i];
      for(let j=r.start;j<r.start+r.indices;j++)g.index.array[count++]=indices[j];
    });
    g.index.needsUpdate=true;g.setDrawRange(0,count);
  }
  return {panels,material,tint,fit,skeleton:cloth.skeleton};
}

export function capeGeometry(id) {
  const length=id==='gravebinder'?.96:id==='veilranger'?.61:.78;
  return surface(30,12,(u,v)=>{
    const a=(.40+u*1.20)*Math.PI, drop=1-v;
    const pleat=Math.cos(u*tau*4.5+drop*.65)*(.004+drop*.016);
    const hem=.037*Math.cos(u*tau*2.5)+.031*Math.sin(u*tau)
      -(id==='veilranger'?.21*Math.max(0,1-Math.abs(u-.5)*7):0);
    return [Math.sin(a)*(.205+drop*.052+pleat),.357-drop*(length+hem*drop),
      Math.cos(a)*(.077+.104*drop+pleat)-drop*.064,1-u,v];
  });
}

export function vestGeometry(id) {
  const cut=cuts[id], profile=[[.95,.172,.126],[1.012,.178,.129],[1.096,.159,.129],
    [1.19,.177,.139],[1.278,.213,.148],[1.37,.222,.145],[1.424,.211,.122],[1.482,.079,.076]];
  return surface(32,profile.length-1,(u,v)=>{
    const [y,rx,rz]=profile[Math.round(v*(profile.length-1))];
    const a=(u-.5)*tau,x=Math.sin(a),z=Math.cos(a), front=Math.max(0,z);
    const t=(y-.95)/.532;
    const padding=.004*Math.cos(a*10+t*8)*Math.sin(t*Math.PI);
    return [(rx+padding)*x,y-(1-v)**4*(.028+cut.vest*.35*front**4),
      (rz+padding)*z+.005, u, t];
  });
}

export function starterShoulders(item,id) {
  const parts={}, fabric=paintedMaterial(id,1), cut=cuts[id];
  const collar=new THREE.Group(); collar.name=item.name+' / collar';parts.Chest=collar;
  mesh(collar,surface(24,4,(u,v)=>{
    const a=u*tau,r=.118-v*.045,front=(Math.cos(a)+1)/2;
    return [r*Math.sin(a),.065+v*(.098-front*.033),r*Math.cos(a)*.84,u,.69+v*.29];
  }),fabric);
  for(const [side,s] of [['L',1],['R',-1]]) {
    const part=new THREE.Group(); part.name=item.name+' / '+side+' shoulder';
    const cap=surface(20,6,(u,v)=>{
      const a=u*tau, outward=(1+s*Math.sin(a))/2, size=cut.shoulder;
      const radius=Math.max(.006,Math.sqrt(1-v*v));
      return [Math.sin(a)*size*radius+s*.012,
        .074*v-(1-v)*(.015+cut.vest*.53*outward),Math.cos(a)*size*radius,
        .18+u*.64,.15+v*.72];
    });
    mesh(part,cap,fabric); parts['UpperArm'+side]=part;
  }
  return parts;
}

// Starter sleeves, breeches and cuffs use one skinned draw. Map cloth to the
// edges of its class's quilt, and wrist/ankle bindings to the hide swatch.
export function paintStarterLimbs(roots,id,materials) {
  const batch=paintedMaterial(id,1);
  batch.map.offset.set(0,0);batch.map.repeat.set(1,1);batch.vertexColors=true;
  for(const root of roots)root.traverse(o=>{
    if(!o.isMesh)return;
    const hide=o.material===materials.leather,trim=o.material===materials.trim;
    const column=hide||trim?3:classes.indexOf(id),uv=o.geometry.attributes.uv;
    for(let i=0;i<uv.count;i++){
      const u=clamp(uv.getX(i),0,1),v=clamp(uv.getY(i),0,1);
      const s=hide?.02+u*.34:trim?.47+u*.07:.035+u*.27;
      const t=hide?.03+v*.30:trim?.57+v*.055:.27+v*.55;
      uv.setXY(i,(column+s)/5,(atlasRows-2+t)/atlasRows);
      if(hide){
        const colors=o.geometry.attributes.color;
        colors.setXYZ(i,colors.getX(i)*.66,colors.getY(i)*.68,colors.getZ(i)*.67);
      }
    }
    o.material=batch;
  });
}
