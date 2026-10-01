import * as THREE from './vendor/three/three.module.min.js';
import {mesh} from './character_mesh3d.mjs?v=body-armor-1';

// A chamfered box has 44 triangles. Shared ordinary boxes remain untouched.
export function box(parent,material,pos,size){
  const half=size.map(v=>v/2),bevel=Math.min(...half)*.22,vertices=[],uv=[];
  const emit=points=>{
    const a=new THREE.Vector3(...points[0]),normal=new THREE.Vector3(...points[1]).sub(a).cross(new THREE.Vector3(...points[2]).sub(a));
    const center=points.reduce((v,p)=>v.add(new THREE.Vector3(...p)),new THREE.Vector3()).divideScalar(points.length);
    if(normal.dot(center)<0)points=points.slice().reverse();
    for(let i=1;i<points.length-1;i++)for(const p of [points[0],points[i],points[i+1]]){
      vertices.push(...p);const components=normal.toArray().map(Math.abs),axis=components.indexOf(Math.max(...components)),projection=[0,1,2].filter(i=>i!==axis);
      uv.push(...projection.map(i=>(p[i]+half[i])/(size[i]||1)));
    }
  };
  for(let axis=0;axis<3;axis++)for(const sign of [-1,1]){
    const other=[0,1,2].filter(i=>i!==axis);
    emit([[-1,-1],[1,-1],[1,1],[-1,1]].map(([s,t])=>{const p=[0,0,0];p[axis]=sign*half[axis];p[other[0]]=s*(half[other[0]]-bevel);p[other[1]]=t*(half[other[1]]-bevel);return p;}));
  }
  for(let a=0;a<3;a++)for(let b=a+1;b<3;b++)for(const sa of [-1,1])for(const sb of [-1,1]){
    const c=3-a-b;
    emit([[-1,0],[-1,1],[1,1],[1,0]].map(([sc,side])=>{const p=[0,0,0];p[a]=sa*(half[a]-(side?bevel:0));p[b]=sb*(half[b]-(side?0:bevel));p[c]=sc*(half[c]-bevel);return p;}));
  }
  for(const sx of [-1,1])for(const sy of [-1,1])for(const sz of [-1,1])emit([0,1,2].map(axis=>[sx,sy,sz].map((sign,i)=>sign*(half[i]-(i===axis?0:bevel)))));
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.computeVertexNormals();
  return mesh(parent,g,material,pos);
}
export function wrap(parent,material,from,to,radius){
  // Six samples per winding, two longitudinal subdivisions and four sides are
  // enough for a physical leather cord at the current inventory/game scale.
  const turns=Math.ceil((to-from)/.027),points=[];
  for(let i=0;i<=turns*6;i++){const t=i/(turns*6),a=t*turns*Math.PI*2;points.push(new THREE.Vector3(Math.cos(a)*radius,from+(to-from)*t,Math.sin(a)*radius));}
  const curve=new THREE.CatmullRomCurve3(points);
  return mesh(parent,new THREE.TubeGeometry(curve,turns*12,.0028,4,false),material);
}
export function shell(parent,material,rows,pos=[0,0,0],segments=16){
  const p=[],uv=[],index=[];
  for(let row=0;row<rows.length;row++)for(let i=0;i<=segments;i++){
    const a=i/segments*Math.PI*2,[y,rx,rz,offset=0]=rows[row];p.push(Math.sin(a)*rx,y,Math.cos(a)*rz+offset);uv.push(i/segments,row/(rows.length-1));
  }
  for(let row=0;row<rows.length-1;row++)for(let i=0;i<segments;i++){
    const a=row*(segments+1)+i,b=a+segments+1;index.push(a,a+1,b,b,a+1,b+1);
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(index);g.computeVertexNormals();
  return mesh(parent,g,material,pos);
}
export function smoothOutline(points,amount=.16){
  // Corner cuts round the broad crescent without replacing its authored outline.
  return points.flatMap((p,i)=>{const previous=points[(i+points.length-1)%points.length],next=points[(i+1)%points.length];return [[p[0]*(1-amount)+previous[0]*amount,p[1]*(1-amount)+previous[1]*amount],[p[0]*(1-amount)+next[0]*amount,p[1]*(1-amount)+next[1]*amount]];});
}
export function domedPlate(parent,material,outline,depth=.035,bow=.035,pos=[0,0,0]){
  const vertices=[],uv=[],emit=(a,b,c)=>{for(const p of [a,b,c]){vertices.push(...p);uv.push(p[0]*2+.5,p[1]*2+.5);}};
  for(let i=0;i<outline.length;i++){
    const a=outline[i],b=outline[(i+1)%outline.length],af=[...a,depth],bf=[...b,depth],ab=[...a,0],bb=[...b,0];
    emit([0,0,depth+bow],bf,af);emit([0,0,0],ab,bb);emit(af,bf,ab);emit(ab,bf,bb);
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.computeVertexNormals();
  // Author outlines use both winding directions; orient the front consistently.
  const normal=g.attributes.normal;if(normal.getZ(0)<0){for(let i=0;i<vertices.length;i+=9){for(let j=0;j<3;j++)[vertices[i+3+j],vertices[i+6+j]]=[vertices[i+6+j],vertices[i+3+j]];const u=i/3*2;for(let j=0;j<2;j++)[uv[u+2+j],uv[u+4+j]]=[uv[u+4+j],uv[u+2+j]];}g.attributes.position.array.set(vertices);g.attributes.uv.array.set(uv);g.computeVertexNormals();}
  return mesh(parent,g,material,pos);
}
