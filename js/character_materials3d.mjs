import * as THREE from './vendor/three/three.module.min.js';

// Small deterministic surface maps: hammered steel, leather grain, woven cloth,
// and interlocked mail. No external images or asynchronous asset loads.
const patterns=new Map();
function surfaceTexture(kind){
  if(!patterns.has(kind)){
    const size=128,bytes=new Uint8Array(size*size*4);let seed=713;
    const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const noise=random();let value=220+noise*30;
      if(kind==='metal')value=221+noise*29-(x%37===0&&y%29<18?43:0);
      if(kind==='leather')value=194+noise*50+(Math.sin(x*.7)*Math.cos(y*.6))*9;
      if(kind==='cloth')value=205+noise*23+((x%4<2)===(y%4<2)?15:-18);
      if(kind==='wood')value=205+noise*18+Math.sin(x*.55+Math.sin(y*.08)*1.4)*22;
      if(kind==='fur')value=205+noise*25+Math.sin(x*1.6+Math.sin(y*.09)*2.2)*17+Math.sin(x*3.1+y*.12)*8;
      if(kind==='stone')value=199+noise*38+Math.sin(x*.16+Math.cos(y*.21))*13+Math.cos(y*.12+x*.08)*12;
      if(kind==='mail'){
        const row=Math.floor(y/16),dx=((x+(row%2)*8)%16-8)/6,dy=(y%16-8)/6;
        const d=Math.sqrt(dx*dx+dy*dy);value=d>.64&&d<1.05?205+dy*36+noise*13:92+noise*22;
      }
      const i=(y*size+x)*4;bytes[i]=bytes[i+1]=bytes[i+2]=Math.max(0,Math.min(255,value));bytes[i+3]=255;
    }
    patterns.set(kind,bytes);
  }
  const texture=new THREE.DataTexture(patterns.get(kind),128,128);
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(kind==='mail'?2:1,kind==='mail'?2:1);
  texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;
  return texture;
}
export function surfaceMaterial(color,kind='metal',extra={}){
  const map=surfaceTexture(kind),metal=kind==='metal'||kind==='mail';
  return new THREE.MeshStandardMaterial({color,map,bumpMap:map,bumpScale:kind==='mail'?.006:metal?.0008:.0016,
    metalness:metal?.72:0,roughness:metal?.53:.91,...extra});
}
export function equipmentMaterials(item){
  const p=item.material;
  return {metal:surfaceMaterial(p.metal),edge:surfaceMaterial(new THREE.Color(p.metal).lerp(new THREE.Color('#c3c8c9'),.27), 'metal',{roughness:.36}),
    mail:surfaceMaterial(p.metal,'mail'),wood:surfaceMaterial(p.wood,'wood'),cloth:surfaceMaterial(p.cloth,'cloth'),
    leather:surfaceMaterial(p.leather,'leather'),trim:surfaceMaterial(p.trim,'metal',{metalness:.64,roughness:.58}),
    dark:surfaceMaterial('#202326','metal',{metalness:.35,roughness:.8}),
    glow:new THREE.MeshStandardMaterial({color:p.glow||p.trim,emissive:p.glow||'#000000',emissiveIntensity:p.glow?.32:0,metalness:.3,roughness:.32}),tier:item.tier};
}
export function disposeMaterials(materials){
  const textures=new Set();for(const material of materials){for(const key of ['map','bumpMap','roughnessMap','normalMap'])if(material[key])textures.add(material[key]);material.dispose();}
  textures.forEach(t=>t.dispose());
}
