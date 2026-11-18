import * as THREE from './vendor/three/three.module.min.js';

const heroes = ['vanguard','emberwitch','gravebinder','wildkeeper','veilranger'];
const forms = ['form_fang','form_brute','form_stone','form_apex'];
const inset = 1.5 / 256;
const unit = value => THREE.MathUtils.clamp(value,0,1);
const full = [0,0,1,1];

async function loadAtlas(file,columns,rows) {
  const source = new THREE.Source();
  if (typeof Image !== 'undefined') {
    const image = new Image();
    image.src = new URL('../assets/characters/'+file,import.meta.url).href;
    await image.decode();
    source.data = image;
    source.needsUpdate = true;
  }
  return {source,columns,rows};
}
const [wardrobe,wildshapes] = await Promise.all([
  loadAtlas('hero-wardrobe.webp',5,10), loadAtlas('wildshape-surfaces.webp',4,4)
]);

function view(atlas) {
  const map = new THREE.Texture();
  if (atlas.source.data) map.needsUpdate = true;
  map.source = atlas.source;
  map.colorSpace = THREE.SRGBColorSpace;
  return map;
}
function crop(map,atlas,column,row,[x,y,w,h]) {
  map.offset.set((column+x+w*inset)/atlas.columns,(atlas.rows-1-row+y+h*inset)/atlas.rows);
  map.repeat.set(w*(1-2*inset)/atlas.columns,h*(1-2*inset)/atlas.rows);
}
function panel(atlas,column,row,rect,extra) {
  const map = view(atlas);
  crop(map,atlas,column,row,rect);
  const material = new THREE.MeshStandardMaterial({map,roughness:.93,side:THREE.DoubleSide,...extra});
  material.userData.paintedPanel = true;
  return material;
}
export const heroPanel = (id,row,rect=full,extra={}) => panel(wardrobe,heroes.indexOf(id),row,rect,extra);
export const formPanel = (id,row,rect=full,extra={}) => panel(wildshapes,forms.indexOf(id),row,rect,extra);
// The mythic yoke and heraldry form a single long panel in the source art.
export const hemRegion=rank=>[.01,.01,.98,rank===3?.815:rank===2?.49:.43];
export function setHemRank(material,id,rank) {
  crop(material.map,wardrobe,heroes.indexOf(id),rank,hemRegion(rank));
}

// Keep the original dye, metal response and bump/vertex shading. Each
// attachment samples its own piece of the painting within the same draw.
function addPigment(material) {
  if (material.userData.garmentPigment) return;
  const pigmentMap = view(wardrobe);
  material.addEventListener('dispose',()=>pigmentMap.dispose());
  const compile = material.onBeforeCompile, key = material.customProgramCacheKey();
  material.onBeforeCompile = function(shader,renderer) {
    compile.call(this,shader,renderer);
    shader.uniforms.garmentPainting = {value:pigmentMap};
    shader.vertexShader = shader.vertexShader.replace('#include <common>',
      '#include <common>\nattribute vec3 garmentUv; varying vec3 vGarmentUv;')
      .replace('#include <begin_vertex>','#include <begin_vertex>\nvGarmentUv = garmentUv;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>',
      '#include <common>\nuniform sampler2D garmentPainting; varying vec3 vGarmentUv;')
      .replace('#include <metalnessmap_fragment>',`#include <metalnessmap_fragment>
        vec3 pigment = texture2D(garmentPainting, vGarmentUv.xy).rgb;
        vec3 dye = diffuse / max(max(max(diffuse.r, diffuse.g), diffuse.b), 0.01);
        pigment *= mix(vec3(1.0), dye, 0.20);
        #ifdef USE_COLOR
          pigment *= mix(vec3(1.0), vColor.rgb, 0.30);
        #endif
        diffuseColor.rgb = mix(diffuseColor.rgb, pigment, vGarmentUv.z);`);
  };
  material.customProgramCacheKey = () => key+'|garment-pigment-1';
  material.userData.garmentPigment = true;
}

// The coordinates are computed once in the bind pose. Broad chest panels use
// the whole yoke, while fitted sleeves and guards take cloth from its edges.
export function paintGarment(root,id,rank,part) {
  const column=heroes.indexOf(id);
  root.traverse(object=>{
    if (!object.isMesh) return;
    const {geometry,material} = object;
    if (!material.map || material.userData.paintedPanel || (material.emissive?.getHex() && !material.userData.uniqueSurfaceAtlas)) return;
    geometry.computeBoundingBox();
    const box=geometry.boundingBox, pos=geometry.attributes.position;
    const width=Math.max(.001,box.max.x-box.min.x), height=Math.max(.001,box.max.y-box.min.y);
    const uv=new Float32Array(pos.count*3);
    const metal=material.metalness>.34;
    // Keep brass edging and pale bone proud of the dyed fabric underneath.
    const bright=Math.max(material.color.r,material.color.g,material.color.b);
    const brass=metal&&material.color.r>material.color.g*1.35;
    const strength=brass?.21:metal?.48:bright>.48?.34:.88;
    for(let i=0;i<pos.count;i++){
      const x=pos.getX(i), y=pos.getY(i), z=pos.getZ(i);
      const s=(x-box.min.x)/width, t=(y-box.min.y)/height;
      let row=rank, u=s, v=.51+.48*t, weight=strength;
      if(part==='gloves' || part==='boots') {
        const boot=part==='boots';
        if(material.userData.fittedLeather){
          row=boot?8:7;
          u=unit(.5+x/(boot?.14:.106));
          if(boot){
            const instep=.54-.48*unit((z-.021)/.138);
            v=y>.055?.54+.44*unit((y-.055)/.25):instep*(.80+.20*unit((y+.072)/.127));
          }else v=unit((y+.096)/.236);
          weight=.87;
        }else {u=.72+.26*s; v=.53+.44*t;}
      }else if(part==='belt'){u=.07+.85*s;v=.47+.13*t;}
      else if(part==='head'){u=.04+.23*s;v=.60+.35*t;}
      else if(part==='limbs'){
        u=.04+.26*unit(.5+Math.sin(x*24)*.46);
        v=.52+.45*unit((y%.40)/.40);weight=.58;
      }else if(part.startsWith('UpperArm') || part.startsWith('Thigh')){
        u=(part.endsWith('L')?.71:.025)+.25*s;v=.54+.42*t;
      }else if(part==='Hips'){u=.1+.8*s;v=.02+.42*t;}
      else if(part==='torso'){
        u=.5+x/.48;v=.51+.47*t;
      }
      uv[i*3]=(column+inset+unit(u)*(1-2*inset))/wardrobe.columns;
      uv[i*3+1]=(wardrobe.rows-1-row+inset+unit(v)*(1-2*inset))/wardrobe.rows;
      uv[i*3+2]=weight;
    }
    geometry.setAttribute('garmentUv',new THREE.BufferAttribute(uv,3));
    addPigment(material);
  });
}
