import * as THREE from './vendor/three/three.module.min.js';
import {FORGINGS} from './character_unique_forgings3d.mjs';

// The catalog compiler straightens each inventory painting into one padded cell.
// Only this atlas is transferred to the game. The source is shared by every slot.
const maps=new WeakMap(),waiting=new Set(),ready={value:0};
let image=null,pending=null;
export function loadUniquePainting(){
  if(!pending&&typeof Image!=='undefined'){
    const painting=new Image();
    painting.src=new URL('../assets/characters/unique-equipment.webp',import.meta.url).href;
    pending=painting.decode().then(()=>{
      image=painting;ready.value=1;
      for(const map of waiting){map.image=image;map.needsUpdate=true;}
      waiting.clear();
    })
      .catch(error=>{pending=null;throw error;});
  }
  return pending;
}
function paintingFor(renderer){
  if(!maps.has(renderer)){
    const map=new THREE.Texture();
    map.colorSpace=THREE.SRGBColorSpace;
    if(image){map.image=image;map.needsUpdate=true;}
    else {waiting.add(map);loadUniquePainting()?.catch(()=>{});}
    maps.set(renderer,map);
  }
  return maps.get(renderer);
}
export function disposeUniquePainting(renderer){
  const map=maps.get(renderer);
  if(map){waiting.delete(map);map.dispose();}
  maps.delete(renderer);
}
const cell=192, columns=12, rows=10, inset=3.5/cell;
const clamp=THREE.MathUtils.clamp;

export function paintedUniqueMaterial(material) {
  if(material.userData.uniquePainting)return material;
  const compile=material.onBeforeCompile,key=material.customProgramCacheKey();
  material.onBeforeCompile=function(shader,renderer){
    compile.call(this,shader,renderer);
    shader.uniforms.uniquePainting={value:paintingFor(renderer)};
    shader.uniforms.uniquePaintReady=ready;
    shader.vertexShader=shader.vertexShader.replace('#include <common>',
      '#include <common>\nattribute vec3 uniquePaintUv; varying vec3 vUniquePaint;')
      .replace('#include <begin_vertex>','#include <begin_vertex>\nvUniquePaint = uniquePaintUv;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',
      '#include <common>\nuniform sampler2D uniquePainting; uniform float uniquePaintReady; varying vec3 vUniquePaint;')
      .replace('#include <lights_physical_fragment>',`
        vec4 illustration = texture2D(uniquePainting, vUniquePaint.xy);
        float pigment = illustration.a * vUniquePaint.z * uniquePaintReady;
        diffuseColor.rgb = mix(diffuseColor.rgb, illustration.rgb, pigment);
        #include <lights_physical_fragment>`)
      .replace('#include <opaque_fragment>',`
        // Retain the painted highlights when the blade turns away from the key.
        outgoingLight = max(outgoingLight, illustration.rgb * pigment * 0.43);
        #include <opaque_fragment>`);
  };
  material.customProgramCacheKey=()=>key+'|unique-inventory-paint-1';
  material.userData.uniquePainting=true;
  return material;
}

function put(array,i,recipe,u,v,weight){
  const col=recipe.paintIndex%columns,row=Math.floor(recipe.paintIndex/columns);
  array[i*3]=(col+inset+clamp(u,0,1)*(1-2*inset))/columns;
  array[i*3+1]=(rows-1-row+inset+clamp(v,0,1)*(1-2*inset))/rows;
  array[i*3+2]=weight;
}

function detailWeight(material,uv,i){
  const grid=material?.userData.paintRegions;
  if(!grid)return 1;
  const x=Math.min(grid.columns-1,Math.floor(uv.getX(i)*grid.columns));
  const y=Math.min(grid.rows-1,Math.floor(uv.getY(i)*grid.rows));
  return grid.weights[y*grid.columns+x]??1;
}

// The whole suit uses the same painting in its rest pose. The skirt, breast
// and pauldrons keep their registration when their individual bones rotate.
const chestOrigins={Chest:[0,1.38],Spine:[0,1.16],Hips:[0,.94],UpperArmL:[.245,1.435],UpperArmR:[-.245,1.435]};
export function paintChestGeometry(geometry,recipe,joint,material){
  const [dx,dy]=chestOrigins[joint]||[0,0],p=geometry.attributes.position,paint=new Float32Array(p.count*3);
  for(let i=0;i<p.count;i++){
    const x=p.getX(i)+dx,y=p.getY(i)+dy,z=p.getZ(i),v=clamp((y-.80)/.735,0,1);
    const half=THREE.MathUtils.lerp(.155,.33,THREE.MathUtils.smoothstep(y,1.12,1.43));
    const u=.5+x/(2*half),front=THREE.MathUtils.smoothstep(z,-.07,.10);
    put(paint,i,recipe,u,v,(.21+.66*front)*detailWeight(material,geometry.attributes.uv,i));
  }
  geometry.setAttribute('uniquePaintUv',new THREE.BufferAttribute(paint,3));
  return geometry;
}

export function paintArmorLimbs(mesh,recipe){
  const g=mesh.geometry,p=g.attributes.position,paint=new Float32Array(p.count*3);
  const {limbRegions,guardRanges}=mesh.userData;
  function panel(first,count,bone){
    const arm=/Arm|Forearm/.test(bone),left=bone.endsWith('L');
    for(let i=first;i<first+count;i++){
      const x=Math.abs(p.getX(i)),y=p.getY(i),z=p.getZ(i);
      const v=arm?.61+.32*clamp((y-.92)/.51,0,1):.08+.32*clamp(y/.92,0,1);
      const lateral=arm?.10+.16*clamp((x-.19)/.17,0,1):.25+.17*clamp((x-.034)/.17,0,1);
      put(paint,i,recipe,left?1-lateral:lateral,v,.34+.27*THREE.MathUtils.smoothstep(z,-.065,.07));
    }
  }
  for(const region of limbRegions)panel(region.firstVertex,region.vertices,region.start);
  for(const guard of guardRanges)panel(guard.first,guard.count,guard.bone);
  g.setAttribute('uniquePaintUv',new THREE.BufferAttribute(paint,3));
  paintedUniqueMaterial(mesh.material);
}

// Find the width of the actual mesh at each height. Sampling triangle edges
// also covers long blades and shafts with no intermediate vertices.
function sections(meshes,bottom,top){
  const n=36,lo=new Float32Array(n).fill(Infinity),hi=new Float32Array(n).fill(-Infinity);
  const bucket=y=>clamp((y-bottom)/(top-bottom)*(n-1),0,n-1);
  const widen=(row,x)=>{lo[row]=Math.min(lo[row],x);hi[row]=Math.max(hi[row],x);};
  for(const {points} of meshes){
    for(let i=0;i<points.length;i+=9){
      for(let t=0;t<3;t++){
        const a=i+t*3,b=i+((t+1)%3)*3,x=points[a],y=bucket(points[a+1]),nx=points[b],ny=bucket(points[b+1]);
        widen(Math.round(y),x);
        for(let j=Math.ceil(Math.min(y,ny));j<=Math.floor(Math.max(y,ny));j++)
          if(ny!==y)widen(j,x+(nx-x)*(j-y)/(ny-y));
      }
    }
  }
  return x=>{
    const f=bucket(x),a=Math.floor(f),b=Math.ceil(f),t=f-a;
    // Real gaps between the parts of an open crown have no triangles.
    if(!Number.isFinite(lo[a]))return [lo[b],hi[b]];
    if(!Number.isFinite(lo[b]))return [lo[a],hi[a]];
    return [THREE.MathUtils.lerp(lo[a],lo[b],t),THREE.MathUtils.lerp(hi[a],hi[b],t)];
  };
}

function weaponLandmark(r){
  switch(r.category){
    case 'sword':
    case 'dagger':return [.10,FORGINGS[r.id].cut];
    case 'axe':return null;
    case 'mace':return [r.length-.12,.69];
    case 'spear':return [r.length,FORGINGS[r.id].cut];
    case 'staff':return [r.length-.04,.70];
    case 'wand':return [r.length-.06,.64];
    default:return null;
  }
}
function paintAttachment(root,r){
  const bow=r.category==='bow',cross=r.category==='crossbow',boot=r.slot==='boots';
  root.updateMatrixWorld(true);
  const inverse=root.matrixWorld.clone().invert(),matrix=new THREE.Matrix4(),p=new THREE.Vector3();
  const meshes=[],arrow=root.userData.arrow;
  let bottom=Infinity,top=-Infinity;
  root.traverse(o=>{
    if(!o.isMesh)return;
    const geometry=o.geometry,pos=geometry.attributes.position;
    paintedUniqueMaterial(o.material);
    if(o.parent===arrow){
      // The loaded projectile shares the packed material with the launcher.
      geometry.setAttribute('uniquePaintUv',new THREE.BufferAttribute(new Float32Array(pos.count*3),3));
      return;
    }
    matrix.multiplyMatrices(inverse,o.matrixWorld);
    const points=new Float32Array(pos.count*3);
    for(let i=0;i<pos.count;i++){
      p.fromBufferAttribute(pos,i).applyMatrix4(matrix);
      const x=bow?-p.z:p.x,y=cross?p.z:boot?p.y-.38*Math.max(0,p.z):p.y,z=bow?p.x:cross?p.y:p.z;
      points[i*3]=x;points[i*3+1]=y;points[i*3+2]=z;
      bottom=Math.min(bottom,y);top=Math.max(top,y);
    }
    meshes.push({geometry,points,material:o.material});
  });
  const span=Math.max(top-bottom,1e-6),section=sections(meshes,bottom,top);
  const faceAxis={mask:.75,skull:.72,rib:.69,hood:.32,flame:.39,hollow:.64,coral:.40}[r.shape];
  const mark=r.slot==='head'&&(r.shape==='mask'||r.shape==='skull')?[.029,.50]:weaponLandmark(r);
  for(const {geometry,points,material} of meshes){
    const paint=new Float32Array(points.length);
    for(let i=0;i<points.length;i+=3){
      const x=points[i],y=points[i+1],z=points[i+2],[left,right]=section(y);
      let u=r.slot==='head'? .5+Math.atan2(x,z+.008)/Math.PI :
        right-left>1e-6?(x-left)/(right-left):.5;
      let v=(y-bottom)/span;
      if(mark&&mark[0]>bottom&&mark[0]<top)
        v=y<mark[0]?mark[1]*(y-bottom)/(mark[0]-bottom):mark[1]+(1-mark[1])*(y-mark[0])/(top-mark[0]);
      if(r.slot==='head'){
        // The painted helmets are seen in three-quarter view. Register the
        // painted nose or central crown jewel with the actual sagittal plane.
        const center=.5+(faceAxis-.5)*(1-THREE.MathUtils.smoothstep(v,.70,.98));
        u=u<.5?u*2*center:center+(u-.5)*2*(1-center);
      }
      const weight=r.slot==='main'?.97:.21+.69*THREE.MathUtils.smoothstep(z,-.055,.047);
      put(paint,i/3,r,u,v,weight*detailWeight(material,geometry.attributes.uv,i/3));
    }
    geometry.setAttribute('uniquePaintUv',new THREE.BufferAttribute(paint,3));
  }
}

export function paintUniqueRoots(roots,recipe){
  for(const root of roots){
    if(recipe.slot!=='chest'){paintAttachment(root,recipe);continue;}
    root.traverse(o=>{
      if(!o.isMesh)return;
      paintChestGeometry(o.geometry,recipe,root.userData.paintJoint,o.material);
      paintedUniqueMaterial(o.material);
    });
  }
}
