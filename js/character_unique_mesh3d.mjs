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
// Loft closed cutting profiles through a ridged cross-section. Intersecting all
// contours at each height preserves forked tips, saw teeth and pierced axe heads.
export function forging(parent,material,profile,height,base,depth,ridge=.48){
  const crossings=[],levels=new Set(),vertices=[],uv=[];
  for(const loop of profile.loops)for(let i=0;i<loop.length;i++){
    const [x,y]=loop[i],[u,v]=loop[(i+1)%loop.length];
    levels.add(y);
    if(y!==v)crossings.push({low:Math.min(y,v),high:Math.max(y,v),at:h=>x+(u-x)*(h-y)/(v-y)});
  }
  const triangle=(a,b,c)=>{
    if((a[0]===b[0]&&a[1]===b[1]&&a[2]===b[2])||(a[0]===c[0]&&a[1]===c[1]&&a[2]===c[2])||(b[0]===c[0]&&b[1]===c[1]&&b[2]===c[2]))return;
    for(const [x,y,z] of [a,b,c]){vertices.push(x,y,z);uv.push(.5+x/height,(y-base)/height);}
  };
  function section(left,right,y,face){
    const span=(right-left)*height,thickness=Math.min(depth,span*.21);
    return [[0,0],[.16,.59],[ridge,1],[.82,.52],[1,0]].map(([t,z])=>
      [(left+(right-left)*t)*height,base+y*height,face*z*thickness]);
  }
  function end(front,back,up){
    for(let j=0;j<front.length-1;j++){
      const a=front[j],b=front[j+1],c=back[j],d=back[j+1];
      if(up){triangle(a,b,c);triangle(c,b,d);}else{triangle(a,c,b);triangle(c,d,b);}
    }
  }
  const ys=[...levels].sort((a,b)=>a-b);
  let previous=[];
  for(let i=1;i<ys.length;i++){
    const low=ys[i-1],high=ys[i],mid=(low+high)*.5;
    const cuts=crossings.filter(e=>e.low<mid&&e.high>mid).sort((a,b)=>a.at(mid)-b.at(mid));
    const upper=[],lower=[];
    for(let j=0;j+1<cuts.length;j+=2){
      const l=cuts[j],r=cuts[j+1];
      const bottom=[section(l.at(low),r.at(low),low,1),section(l.at(low),r.at(low),low,-1)];
      const top=[section(l.at(high),r.at(high),high,1),section(l.at(high),r.at(high),high,-1)];
      for(let face=0;face<2;face++)for(let k=0;k<4;k++){
        const a=bottom[face][k],b=bottom[face][k+1],c=top[face][k],d=top[face][k+1];
        if(face===0){triangle(a,b,c);triangle(c,b,d);}else{triangle(a,c,b);triangle(c,d,b);}
      }
      lower.push(bottom);upper.push(top);
    }
    // Horizontal shelves and branches can change the cross-section abruptly.
    // Close those transitions, leaving ordinary continuous sections welded.
    const matches=(a,b)=>Math.abs(a[0][0][0]-b[0][0][0])<1e-6&&Math.abs(a[0][4][0]-b[0][4][0])<1e-6;
    for(const ring of previous)if(!lower.some(next=>matches(next,ring)))end(...ring,true);
    for(const ring of lower)if(!previous.some(last=>matches(last,ring)))end(...ring,false);
    previous=upper;
  }
  for(const ring of previous)end(...ring,true);
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.computeVertexNormals();
  return mesh(parent,g,material);
}

// Lenticular limbs taper in both dimensions and keep the original flex pivot
// and nock position. A flat belly meets two planes on the back of the bow.
export function bowLimb(parent,material,points,width){
  const path=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
  const p=[],uv=[],indices=[],section=[[-.80,-.36],[.80,-.36],[1,.03],[.38,.58],[-.38,.58],[-1,.03]];
  for(let i=0;i<=12;i++){
    const t=i/12,c=path.getPoint(t),tangent=path.getTangent(t);
    const broad=width*(1.18+.46*Math.sin(Math.PI*t)-.92*t),deep=width*(.86-.55*t);
    const perp=new THREE.Vector3(0,-tangent.z,tangent.y).multiplyScalar(Math.sign(points.at(-1)[1]));
    for(let j=0;j<=section.length;j++){
      const [a,b]=section[j%section.length];p.push(c.x+a*broad,c.y+b*deep*perp.y,c.z+b*deep*perp.z);uv.push(j/section.length,t);
      if(i&&j){const n=i*(section.length+1)+j;
        if(points.at(-1)[1]>0)indices.push(n-8,n-1,n-7,n-7,n-1,n);else indices.push(n-8,n-7,n-1,n-7,n,n-1);}
    }
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  g.setIndex(indices);g.computeVertexNormals();return mesh(parent,g,material);
}

export function shieldFace(parent,material,outline,depth,bow){
  const area=outline.reduce((sum,[x,y],i)=>{const [u,v]=outline[(i+1)%outline.length];return sum+x*v-u*y;},0);
  const rim=area>0?outline:outline.slice().reverse(),n=rim.length,p=[0,0,depth+bow],uv=[.5,.5],indices=[];
  for(let row=1;row<=4;row++)for(let i=0;i<n;i++){
    const t=row/4,[x,y]=rim[i],a=1+(row-1)*n+i,b=1+(row-1)*n+(i+1)%n;
    p.push(x*t,y*t,depth+bow*(1-t*t));uv.push(.5+x*t,.5+y*t);
    if(row===1)indices.push(0,a,b);else indices.push(a-n,a,b,b,b-n,a-n);
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  g.setIndex(indices);g.computeVertexNormals();return mesh(parent,g,material);
}

// A visor is one swept plate from temple to temple. Its lower edge rises
// above the ear hinges and the two eye slots are real openings in the steel.
export function visor(parent,material,width,style){
  const p=[],uv=[],indices=[],segments=32,hood=style==='hood'||style==='flame';
  const heights=[0,.29,.54,.61,.69,.78,1];
  for(let j=0;j<heights.length;j++)for(let i=0;i<=segments;i++){
    const a=(i/segments-.5)*Math.PI*1.26,t=heights[j],f=Math.max(0,Math.cos(a)),c=Math.abs(Math.sin(a));
    const low=hood?.056-.14*Math.pow(c,3):-.111+.045*c+.047*Math.max(0,-Math.cos(a));
    const high=.104+.012*c,y=low+(high-low)*t;
    const rx=width*(.87+.13*t+.065*Math.sin(t*Math.PI));
    const facial=hood?.011:.022*Math.max(0,1-Math.abs(a)*1.6)*Math.sin(Math.PI*t);
    const rz=width*(.90+.14*Math.sin(Math.PI*t)-.04*(1-t)),nose=style==='skull'?.010:0;
    p.push(Math.sin(a)*rx,y,Math.cos(a)*rz-.008+facial+f*nose);uv.push(i/segments,t);
    if(j&&i){
      const angle=Math.abs((i-.5)/segments-.5)*Math.PI*1.26;
      if(!hood&&j===4&&angle>.16&&angle<(style==='skull'?.83:.69))continue;
      const n=j*(segments+1)+i;indices.push(n-segments-2,n-segments-1,n-1,n-1,n-segments-1,n);
    }
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  g.setIndex(indices);g.computeVertexNormals();return mesh(parent,g,material);
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
