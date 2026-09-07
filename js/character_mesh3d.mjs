import * as THREE from './vendor/three/three.module.min.js';
import {disposeMaterials} from './character_materials3d.mjs';

export function disposeObject(root){
  const geometries=new Set(),materials=new Set();root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);});
  geometries.forEach(g=>g.dispose());disposeMaterials(materials);root.removeFromParent();
}
export function mesh(parent,geometry,material,position=[0,0,0],scale=[1,1,1],name=''){
  const m=new THREE.Mesh(geometry,material);m.position.set(...position);m.scale.set(...scale);m.name=name;parent.add(m);return m;
}
export const box=(p,m,pos,size,name)=>mesh(p,new THREE.BoxGeometry(...size),m,pos,[1,1,1],name);
export const orb=(p,m,pos,size,name)=>mesh(p,new THREE.SphereGeometry(1,12,8),m,pos,size,name);
export function rod(parent,material,a,b,radius=.012){
  const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),delta=bv.clone().sub(av);
  const m=mesh(parent,new THREE.CylinderGeometry(radius,radius,delta.length(),8),material,av.add(bv).multiplyScalar(.5).toArray());
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return m;
}
export function curved(parent,mat,points,radius=.01){
  const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
  return mesh(parent,new THREE.TubeGeometry(curve,Math.max(16,points.length*3),radius,5,false),mat);
}
export function plate(parent,mat,points,depth=.012,pos=[0,0,0],bevel=.003){
  const shape=new THREE.Shape();points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();
  return mesh(parent,new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:bevel>0,bevelSegments:1,steps:1,bevelSize:bevel,bevelThickness:bevel}),mat,pos);
}
export function edge(parent,mat,points,r=.004,closed=true){
  const p=closed?[...points,points[0]]:points;for(let i=0;i<p.length-1;i++)rod(parent,mat,p[i],p[i+1],r);
}
export function rivet(parent,mat,x,y,z,r=.007){return mesh(parent,new THREE.SphereGeometry(r,6,4),mat,[x,y,z],[1,1,.48]);}
export function band(parent,mat,y,r,h,zScale=1){return mesh(parent,new THREE.CylinderGeometry(r,r*.98,h,16,1,true),mat,[0,y,0],[1,1,zScale]);}
export function wrap(parent,mat,from,to,r){
  const points=[],turns=Math.ceil((to-from)/.023);
  for(let i=0;i<=turns*8;i++){const t=i/(turns*8),a=t*turns*Math.PI*2;points.push([Math.cos(a)*r,from+(to-from)*t,Math.sin(a)*r]);}
  curved(parent,mat,points,.003);
}
export function combineStatic(root,skip=new Set()){
  // Rivets and seams share draw calls with their material; moving bow parts
  // stay separate. The attachment still follows its original skeleton bone.
  root.updateMatrixWorld(true);const inverse=root.matrixWorld.clone().invert(),groups=new Map();
  function collect(node){if(skip.has(node))return;if(node.isMesh){if(!groups.has(node.material))groups.set(node.material,[]);groups.get(node.material).push(node);}for(const child of node.children)collect(child);}
  collect(root);
  for(const [material,meshes] of groups){
    const geometries=meshes.map(m=>{const g=m.geometry.clone().applyMatrix4(inverse.clone().multiply(m.matrixWorld));if(!g.index)return g;const expanded=g.toNonIndexed();g.dispose();return expanded;});
    const count=geometries.reduce((n,g)=>n+g.attributes.position.count,0),result=new THREE.BufferGeometry();
    for(const [name,size] of [['position',3],['normal',3],['uv',2]]){
      const array=new Float32Array(count*size);let offset=0;for(const g of geometries){if(g.attributes[name])array.set(g.attributes[name].array,offset);offset+=g.attributes.position.count*size;}result.setAttribute(name,new THREE.BufferAttribute(array,size));
    }
    for(const old of meshes){old.geometry.dispose();old.removeFromParent();}geometries.forEach(g=>g.dispose());mesh(root,result,material);
  }
  return root;
}
export function formedPlate(parent,mat,outline,center,trim){
  const p=[...center,...outline.flat()],uv=[.5,.5],idx=[];
  outline.forEach(([x,y],i)=>{uv.push(x*3+.5,y*3+.5);idx.push(0,i+1,(i+1)%outline.length+1);});
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
  const result=mesh(parent,g,mat);if(trim)edge(parent,trim,outline,.004);return result;
}
