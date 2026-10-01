import * as THREE from './vendor/three/three.module.min.js';

// Unique-only painted surfaces. Each material owns one small texture used for
// both diffuse detail and bump, so disposal follows the existing equipment path.
const patterns=new Map();
function surfaceMap(kind){
  if(!patterns.has(kind)){
    const size=128,bytes=new Uint8Array(size*size*4);let seed=2917;
    const noise=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const n=noise(),broad=Math.sin(x*.091+Math.cos(y*.061)*1.7)*Math.cos(y*.075),grain=Math.sin(x*.73+y*.09);
      let value=228+n*18,tint=[1,1,1];
      if(kind==='metal'||kind==='edge'){
        const pits=n<.075?28:0,scrape=Math.pow(Math.max(0,Math.sin(x*.31+y*.067)),16);
        value=216+n*22+broad*14-pits+scrape*15;
        if(kind==='edge')value=237+n*13+broad*4;
        else tint=[1,.98,.95];
      }else if(kind==='bone'){
        value=218+n*16+broad*17+Math.sin(x*.14+Math.sin(y*.026)*2)*9;
        tint=[1,.97,.90];
      }else if(kind==='leather'){
        value=208+n*19+broad*20+grain*5-(n<.055?24:0);tint=[1,.97,.93];
      }else if(kind==='cloth'){
        value=215+n*10+broad*22+((x%4<2)===(y%4<2)?8:-11);
      }else if(kind==='wood'){
        value=204+n*17+Math.sin(x*.22+Math.sin(y*.037)*2.1)*27+grain*5;tint=[1,.96,.90];
      }else if(kind==='stone')value=208+n*26+broad*22-(n<.1?16:0);
      else if(kind==='mail'){
        const row=Math.floor(y/16),dx=((x+(row%2)*8)%16-8)/6,dy=(y%16-8)/6,d=Math.hypot(dx,dy);
        value=d>.66&&d<1.02?217+dy*25+n*12:117+n*15;
      }
      const i=(y*size+x)*4;for(let c=0;c<3;c++)bytes[i+c]=THREE.MathUtils.clamp(value*tint[c],0,255);bytes[i+3]=255;
    }
    patterns.set(kind,bytes);
  }
  const map=new THREE.DataTexture(patterns.get(kind),128,128);
  map.wrapS=map.wrapT=THREE.RepeatWrapping;map.minFilter=THREE.LinearMipmapLinearFilter;map.magFilter=THREE.LinearFilter;
  map.generateMipmaps=true;map.needsUpdate=true;return map;
}
export function uniqueSurface(color,kind,profile={},extra={}){
  const metal=kind==='metal'||kind==='edge'||kind==='mail',map=surfaceMap(kind),wear=profile.wear??.5;
  return new THREE.MeshStandardMaterial({color,map,bumpMap:map,vertexColors:true,
    bumpScale:kind==='mail'?.004:kind==='bone'?.0008:metal?.0007:.0012,
    metalness:metal?(kind==='edge'?.66:.45):0,roughness:kind==='edge'?.43:metal?.65+wear*.13:.91,...extra});
}
export function uniqueMaterials(item,recipe){
  const p=item.material,profile=recipe.refinement,solid=profile.solid;
  const metal=uniqueSurface(p.metal,solid,profile),edge=uniqueSurface(new THREE.Color(p.metal).lerp(new THREE.Color('#c6c9c3'),.22),solid==='metal'?'edge':solid,profile);
  const trim=uniqueSurface(p.trim,'metal',profile,{metalness:.51,roughness:.72});
  return {metal,edge,trim,wood:uniqueSurface(p.wood,'wood',profile),cloth:uniqueSurface(p.cloth,'cloth',profile),
    leather:uniqueSurface(p.leather,'leather',profile),dark:uniqueSurface('#25272a','metal',profile,{metalness:.24,roughness:.87}),
    bone:uniqueSurface('#c3b8a0','bone',profile),stone:uniqueSurface(p.metal,'stone',profile),
    glow:new THREE.MeshStandardMaterial({color:p.glow||p.trim,vertexColors:true,emissive:p.glow||'#000000',
      emissiveIntensity:profile.emission,metalness:.12,roughness:.64}),tier:item.tier};
}
export function shadeUnique(root,profile){
  root.traverse(object=>{
    if(!object.isMesh||!object.geometry)return;
    shadeUniqueGeometry(object.geometry,profile);
  });
}
export function shadeUniqueGeometry(g,profile){
    const p=g.attributes.position,n=g.attributes.normal;if(!p||!n)return g;
    g.computeBoundingBox();const b=g.boundingBox,span=b.max.clone().sub(b.min),colors=new Float32Array(p.count*3);
    for(let i=0;i<p.count;i++){
      const x=p.getX(i),y=p.getY(i),z=p.getZ(i),height=span.y?THREE.MathUtils.clamp((y-b.min.y)/span.y,0,1):.5;
      const grain=Math.sin(x*93+y*41+z*77)*Math.sin(x*29-y*83+z*17);
      const facing=Math.max(-.7,n.getY(i))*.075,crevice=(1-height)*.09;
      const value=THREE.MathUtils.clamp(.94+facing-crevice+grain*profile.wear*.038,.76,1.04);
      colors[i*3]=value;colors[i*3+1]=value;colors[i*3+2]=value;
    }
    g.setAttribute('color',new THREE.BufferAttribute(colors,3));
    return g;
}

export function packUniqueSurfaces(roots){
  // Bake painted colors into vertices and keep each surface's roughness and
  // metalness in a 128px atlas. Moving parts still receive independent meshes.
  const materials=[];
  for(const root of roots)root.traverse(o=>{if(o.isMesh&&!materials.includes(o.material))materials.push(o.material);});
  if(!materials.length)return;
  const size=128,columns=Math.ceil(Math.sqrt(materials.length)),rows=Math.ceil(materials.length/columns),
    color=new Uint8Array(size*size*4),physical=new Uint8Array(size*size*4),regions=new Map();
  materials.forEach((mat,i)=>{
    const x0=Math.floor(i%columns*size/columns),x1=Math.floor((i%columns+1)*size/columns),
      y0=Math.floor(Math.floor(i/columns)*size/rows),y1=Math.floor((Math.floor(i/columns)+1)*size/rows),source=mat.map?.image;
    regions.set(mat,{x0,x1,y0,y1});
    for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
      const sx=Math.round(THREE.MathUtils.clamp((x-x0-1)/(x1-x0-3),0,1)*((source?.width||1)-1)),
        sy=Math.round(THREE.MathUtils.clamp((y-y0-1)/(y1-y0-3),0,1)*((source?.height||1)-1)),to=(y*size+x)*4,from=(sy*(source?.width||1)+sx)*4;
      color.set(source?source.data.subarray(from,from+4):[255,255,255,255],to);
      const emission=mat.emissive.getHex()?mat.emissiveIntensity:0;
      physical.set([Math.round(emission*255),Math.round(mat.roughness*255),Math.round(mat.metalness*255),255],to);
    }
  });
  const texture=bytes=>{const t=new THREE.DataTexture(bytes,size,size);t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;return t;},
    map=texture(color),response=texture(physical),surface=new THREE.MeshStandardMaterial({color:'#ffffff',map,bumpMap:map,bumpScale:.0012,
      roughness:1,metalness:1,roughnessMap:response,metalnessMap:response,vertexColors:true,emissive:'#ffffff',emissiveIntensity:1});
  // The response map's red channel holds restrained emission; the other two
  // channels remain Three.js's standard roughness and metalness inputs.
  surface.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',
    'totalEmissiveRadiance *= vColor.rgb * texture2D(roughnessMap, vRoughnessMapUv).r;');};
  surface.customProgramCacheKey=()=> 'unique-surfaces-v2';
  surface.userData.uniqueSurfaceAtlas=true;
  for(const root of roots)root.traverse(o=>{
    const mat=o.material,region=regions.get(mat);if(!o.isMesh||!region)return;
    const g=o.geometry,colors=g.attributes.color,uv=g.attributes.uv;
    for(let i=0;i<colors.count;i++)colors.setXYZ(i,colors.getX(i)*mat.color.r,colors.getY(i)*mat.color.g,colors.getZ(i)*mat.color.b);
    if(uv)for(let i=0;i<uv.count;i++){
      const repeat=v=>v>0&&Math.abs(v-Math.round(v))<1e-6?1:v-Math.floor(v);
      uv.setXY(i,(region.x0+1.5+repeat(uv.getX(i))*(region.x1-region.x0-3))/size,
        (region.y0+1.5+repeat(uv.getY(i))*(region.y1-region.y0-3))/size);
    }
    o.material=surface;
  });
}
