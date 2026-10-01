import {createCharacterRenderer,STATES} from '../js/character3d.mjs?v=body-armor-1';
import {resolveCharacterVisual,catalogEntries,CLASS_STYLES} from '../js/character_catalog3d.mjs?v=body-armor-1';
import {Box3,Vector3} from '../js/vendor/three/three.module.min.js';

const data=window.BodyArmorData,sprites=window.BodyArmorSprites,entries=catalogEntries(data,'chest'),ui=id=>document.getElementById(id);
const classes=Object.keys(CLASS_STYLES),angles=[Math.PI/2,0,-Math.PI/2],perPage=6;
let view,page=0,classId=classes[0];
const visual=(entry,id=classId,extra={})=>resolveCharacterVisual(data,id,{chest:entry.item,...extra});
function copy(canvas,size){const c=document.createElement('canvas');c.width=c.height=size;c.getContext('2d').drawImage(canvas,0,0,size,size);return c;}
function detail(){
  const camera=view.camera,box=new Box3(),saved=[camera.left,camera.right,camera.top,camera.bottom];
  view.model.root.traverseVisible(o=>{if(o.isMesh)box.expandByObject(o,true);});
  let x0=Infinity,x1=-Infinity,y0=Infinity,y1=-Infinity;
  for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
    const p=new Vector3(x,y,z).applyMatrix4(camera.matrixWorldInverse);x0=Math.min(x0,p.x);x1=Math.max(x1,p.x);y0=Math.min(y0,p.y);y1=Math.max(y1,p.y);
  }
  const radius=Math.max(x1-x0,y1-y0)*.58,cx=(x0+x1)/2,cy=(y0+y1)/2;
  try{camera.left=cx-radius;camera.right=cx+radius;camera.top=cy+radius;camera.bottom=cy-radius;camera.updateProjectionMatrix();view.renderer.render(view.scene,camera);return copy(view.renderer.domElement,250);}
  finally{[camera.left,camera.right,camera.top,camera.bottom]=saved;camera.updateProjectionMatrix();}
}
async function showPage(next=page,id=classId){
  page=Math.max(0,Math.min(Math.ceil(entries.length/perPage)-1,next));classId=id;ui('class').value=id;ui('catalogue').replaceChildren();
  for(const entry of entries.slice(page*perPage,(page+1)*perPage)){
    const row=document.createElement('article');row.className='item';row.dataset.armorId=entry.id;
    const heading=document.createElement('div'),title=document.createElement('h2'),kind=document.createElement('small');title.textContent=entry.item.name;kind.textContent=(entry.item.rarity||'ordinary')+' · '+CLASS_STYLES[id].name;heading.append(title,kind);row.append(heading);
    const icon=document.createElement('div');icon.className='icon';icon.append(sprites.itemIcon(entry.item,64));row.append(icon);
    for(let i=0;i<3;i++){
      const figure=document.createElement('figure'),label=document.createElement('figcaption');figure.className='view';label.textContent=['Front','Side','Back'][i];
      view.render({state:'idle',t:0,ang:angles[i],ex:{}},visual(entry,id).equipment,id);figure.append(detail(),label);row.append(figure);
    }
    const figure=document.createElement('figure'),label=document.createElement('figcaption');figure.className='body';label.textContent='Gameplay scale';figure.append(copy(view.render({state:'idle',t:0,ang:angles[0],ex:{}},visual(entry,id).equipment,id),120),label);row.append(figure);
    ui('catalogue').append(row);await new Promise(resolve=>setTimeout(resolve,0));
  }
  ui('page').textContent=`${page+1} / ${Math.ceil(entries.length/perPage)} · 27 armors`;ui('previous').disabled=page===0;ui('next').disabled=(page+1)*perPage>=entries.length;
}
async function runContract(){
  let checks=0;const ok=(v,message)=>{checks++;if(!v)throw Error(message);},report={armors:entries.length,classes:classes.length,frames:0,maxCalls:0,memory:{}};
  const render=(entry,id,pose={state:'idle',t:0,ang:angles[0],ex:{}},extra={})=>{
    const canvas=view.render(pose,visual(entry,id,extra).equipment,id);report.frames++;
    const calls=view.renderer.info.render.calls;if(calls>report.maxCalls){report.maxCalls=calls;report.peak={classId:id,armorId:entry.id,state:pose.state,t:pose.t,extra,calls};}return canvas;
  };
  window.bodyArmorReport=report;for(const id of classes){
    for(const entry of entries){
      for(const ang of angles){const canvas=render(entry,id,{state:'idle',t:0,ang,ex:{}}),c=copy(canvas,256),pixels=c.getContext('2d').getImageData(0,0,256,256).data;let ink=0,edge=0;
        for(let y=0;y<256;y++)for(let x=0;x<256;x++)if(pixels[(y*256+x)*4+3]>15){ink++;if(x<2||y<2||x>253||y>253)edge++;}
        ok(ink>150,id+'/'+entry.id+': invisible');ok(edge===0,id+'/'+entry.id+': clipped');
      }
      ok(view.model.armorLimbs?.isSkinnedMesh,id+'/'+entry.id+': missing sleeves or trousers');
      const limbs=view.model.armorLimbs,attachments=view.model.attachments.get('chest').objects.slice();
      render(entry,id);ok(view.model.armorLimbs===limbs&&attachments.every((o,i)=>o===view.model.attachments.get('chest').objects[i]),entry.id+': armor rebuilt');
      for(const state of STATES)for(const t of [0,.55,1])render(entry,id,{state,t,ang:angles[0],ex:{walkPh:t*Math.PI*2}});
      for(const slot of ['gloves','boots'])for(const pair of catalogEntries(data,slot)){
        render(entry,id,{state:'walk',t:.35,ang:angles[0],ex:{}},{[slot]:pair.item});
        ok(view.model.armorLimbs===limbs,entry.id+': cuff swap rebuilt underlayers');
        for(const object of view.model.attachments.get('chest').objects)if(object.userData.armorOverlapSlot===slot)ok(!object.visible,entry.id+': overlapping '+slot+' guard');
      }
      render(entry,id);for(const object of view.model.attachments.get('chest').objects)ok(object.visible,entry.id+': guard did not restore');
      await new Promise(resolve=>setTimeout(resolve,0));
    }
    const a=entries.find(e=>e.id==='u_cinder'),b=entries.find(e=>e.id==='u_gen_6_12');
    const outfit=entry=>render(entry,id,{state:'idle',t:0,ang:angles[0],ex:{}},{gloves:{baseId:'gloves_t13'},boots:{baseId:'boots_t13'}});
    const resources=()=>({...view.renderer.info.memory,programs:view.renderer.info.programs.length});outfit(a);outfit(b);const warm=resources();
    for(let i=0;i<20;i++)outfit(i%2?a:b);const settled=resources();
    ok(JSON.stringify(warm)===JSON.stringify(settled),id+': armor swaps leaked GPU resources');report.memory[id]={warm,settled};
    ui('result').textContent=`Checked ${CLASS_STYLES[id].name}: ${report.frames} frames…`;await new Promise(resolve=>setTimeout(resolve,0));
  }
  ok(report.maxCalls<=73,'Body armor exceeded 73 draw calls: '+JSON.stringify(report.peak));report.checks=checks;window.bodyArmorReport=report;ui('result').textContent=`PASS: ${checks} checks, ${report.frames} frames, all 135 armor/class combinations and glove/boot pairings.`;return report;
}
try{
  await sprites.loadBundle('core');view=createCharacterRenderer({size:512});
  for(const id of classes)ui('class').add(new Option(CLASS_STYLES[id].name,id));
  ui('class').onchange=()=>showPage(page,ui('class').value);ui('previous').onclick=()=>showPage(page-1);ui('next').onclick=()=>showPage(page+1);
  await showPage();ui('result').textContent='Ready · body armor on the player, beside its inventory artwork.';
  window.bodyArmorQA={showPage,runContract,entries,classes,pages:Math.ceil(entries.length/perPage),get view(){return view;}};document.body.dataset.testStatus='ready';
}catch(error){ui('result').textContent='FAIL: '+error.stack;document.body.dataset.testStatus='failed';}
window.addEventListener('pagehide',()=>view?.dispose());
