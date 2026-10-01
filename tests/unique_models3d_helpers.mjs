import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {Vector3} from '../js/vendor/three/three.module.min.js';

export function modelTestData() {
  const scope=vm.createContext({console});
  for(const name of ['utils','data','data_overrides','unique_powers','items','sprite_manifest'])
    vm.runInContext(fs.readFileSync(new URL('../js/'+name+'.js',import.meta.url),'utf8'),scope);
  return vm.runInContext('({data:DATA,items:Items,manifest:DATA.SPRITE_MANIFEST})',scope);
}

export function equipmentRoots(model,slot,item,{legacyChest=false}={}) {
  const roots=[...(model.attachments.get(slot)?.objects||[])].map(root=>legacyChest?(root.children.find(o=>o.userData.armorPauldron)||root):root);
  if(slot==='chest')roots.push(model.uniqueTorso||model.armor[item.family]);
  if(slot==='chest'&&!legacyChest)roots.push(model.armorLimbs);
  return roots.filter(Boolean);
}

export function meshSignature(roots,materials=false,{excludeBodyArmorLimbs=false}={}) {
  const digest=crypto.createHash('sha256'),shape=[];let vertices=0,triangles=0;
  for(const root of roots)root.traverseVisible(object=>{
    if(!object.geometry||excludeBodyArmorLimbs&&object.userData.bodyArmorLimb)return;
    const geometry=object.geometry;
    if(!materials){
      // Ignore material partitions, vertex ordering, UVs and colors. Compare
      // actual triangles in attachment space, including mirrored pairs.
      root.updateWorldMatrix(true,true);const inverse=root.matrixWorld.clone().invert(),matrix=inverse.multiply(object.matrixWorld),position=geometry.attributes.position,index=geometry.index;
      const count=index?.count||position.count,point=new Vector3();
      for(let i=0;i<count;i+=3){const triangle=[];for(let j=0;j<3;j++){
        point.fromBufferAttribute(position,index?index.getX(i+j):i+j).applyMatrix4(matrix).multiply(root.scale);
        triangle.push(point.toArray().map(value=>Math.round(value*1e6)).join(','));
      }shape.push(triangle.sort().join('/'));}
      vertices+=position.count;triangles+=count/3;return;
    }
    for(const name of ['position','normal','uv','color']){
      const a=geometry.attributes[name]?.array;if(a)digest.update(Buffer.from(a.buffer,a.byteOffset,a.byteLength));
    }
    if(geometry.index){const a=geometry.index.array;digest.update(Buffer.from(a.buffer,a.byteOffset,a.byteLength));}
    digest.update(JSON.stringify([object.position.toArray(),object.quaternion.toArray(),object.scale.toArray()]));
    if(materials)for(const m of [].concat(object.material||[])){
      digest.update(JSON.stringify({color:m.color?.getHex(),emissive:m.emissive?.getHex(),intensity:m.emissiveIntensity,metalness:m.metalness,roughness:m.roughness,side:m.side}));
      if(m.vertexColors){digest.update('vertex-colors');for(const name of ['map','roughnessMap']){const map=m[name]?.image;if(map?.data)digest.update(Buffer.from(map.data.buffer,map.data.byteOffset,map.data.byteLength));}}
    }
    vertices+=geometry.attributes.position.count;
    triangles+=(geometry.index?.count||geometry.attributes.position.count)/3;
  });
  if(!materials)digest.update(shape.sort().join(';'));
  return {hash:digest.digest('hex'),vertices,triangles};
}
