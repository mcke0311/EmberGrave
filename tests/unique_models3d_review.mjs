import {createCharacterRenderer,STATES} from '../js/character3d.mjs?v=body-armor-1';
import {resolveCharacterVisual,CLASS_STYLES} from '../js/character_catalog3d.mjs?v=body-armor-1';
import {UNIQUE_MODELS3D} from '../js/character_unique_catalog3d.mjs?v=body-armor-1';
import {Box3,Vector3} from '../js/vendor/three/three.module.min.js';

const data=window.ModelReviewData,sprites=window.ModelReviewSprites,recipes=Object.values(UNIQUE_MODELS3D),ui=id=>document.getElementById(id);
let view,page=0,classId='vanguard',checks=0;
const perPage=6,front=Math.PI/2,angles=[front,0,-front];
const raw=r=>({baseId:r.baseId,uniqueId:r.id,name:r.name,rarity:'unique'});
const visual=(r,id=classId)=>resolveCharacterVisual(data,id,{[r.slot]:raw(r)});
function roots(model,slot){return [...(model.attachments.get(slot)?.objects||[]),...(slot==='chest'?[model.uniqueTorso,model.armorLimbs]:[])].filter(Boolean);}
function copy(canvas,width,height=width){const result=document.createElement('canvas');result.width=width;result.height=height;result.getContext('2d').drawImage(canvas,0,0,width,height);return result;}
function cropEquipment(r){
  const equipment=roots(view.model,r.slot),paired=['gloves','boots'].includes(r.category),
    panels=paired?equipment.map(root=>[root]):[equipment],camera=view.camera,canvas=document.createElement('canvas');canvas.width=250;canvas.height=220;
  for(let panel=0;panel<panels.length;panel++){
    const box=new Box3(),selected=new Set(),saved=[camera.left,camera.right,camera.top,camera.bottom],visibility=[],width=250/panels.length,aspect=width/220;
    for(const root of panels[panel]){box.expandByObject(root,true);root.traverse(object=>selected.add(object));}
    let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
    for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
      const p=new Vector3(x,y,z).applyMatrix4(camera.matrixWorldInverse);x0=Math.min(x0,p.x);x1=Math.max(x1,p.x);y0=Math.min(y0,p.y);y1=Math.max(y1,p.y);
    }
    const radius=Math.max((x1-x0)/aspect,y1-y0,.03)*.59,cx=(x0+x1)/2,cy=(y0+y1)/2;
    try{
      camera.left=cx-radius*aspect;camera.right=cx+radius*aspect;camera.top=cy+radius;camera.bottom=cy-radius;camera.updateProjectionMatrix();
      view.model.root.traverse(object=>{if((object.isMesh||object.isLine)&&!selected.has(object)){visibility.push([object,object.visible]);object.visible=false;}});
      view.renderer.render(view.scene,camera);canvas.getContext('2d').drawImage(view.renderer.domElement,panel*width,0,width,220);
    }finally{
      [camera.left,camera.right,camera.top,camera.bottom]=saved;camera.updateProjectionMatrix();for(const [object,visible] of visibility)object.visible=visible;
    }
  }
  return canvas;
}
async function showPage(next=page,id=classId){
  page=Math.max(0,Math.min(Math.ceil(recipes.length/perPage)-1,next));classId=id;ui('class').value=id;
  ui('catalogue').replaceChildren();
  for(const r of recipes.slice(page*perPage,(page+1)*perPage)){
    const row=document.createElement('article');row.className='item';row.dataset.modelId=r.id;
    const heading=document.createElement('div'),title=document.createElement('h2'),category=document.createElement('small'),link=document.createElement('a');title.textContent=r.name;category.textContent=r.category+' · '+CLASS_STYLES[id].name;
    link.href='tests/three_character.html?unique='+r.id+'&class='+id;link.textContent='Animate this model →';link.style.cssText='display:block;font-size:11px;margin-top:10px';heading.append(title,category,link);row.append(heading);
    const icon=document.createElement('div');icon.className='icon';icon.append(sprites.itemIcon(raw(r),64));row.append(icon);
    for(let i=0;i<3;i++){
      view.render({state:'idle',t:0,ang:angles[i],ex:{}},visual(r,id).equipment,id);
      const figure=document.createElement('figure');figure.className='view';const label=document.createElement('figcaption');label.textContent=['Front','Side','Back'][i];figure.append(cropEquipment(r),label);row.append(figure);
    }
    const figure=document.createElement('figure');figure.className='body';const label=document.createElement('figcaption');label.textContent='On the player';figure.append(copy(view.render({state:'idle',t:0,ang:front,ex:{}},visual(r,id).equipment,id),120),label);row.append(figure);
    ui('catalogue').append(row);await new Promise(resolve=>setTimeout(resolve,0));
  }
  ui('page').textContent=`${page+1} / ${Math.ceil(recipes.length/perPage)} · 118 items`;ui('previous').disabled=page===0;ui('next').disabled=(page+1)*perPage>=recipes.length;
}
function pixels(canvas){const c=copy(canvas,256),p=c.getContext('2d').getImageData(0,0,256,256).data;let visible=0,edge=0;for(let y=0;y<256;y++)for(let x=0;x<256;x++)if(p[(y*256+x)*4+3]>15){visible++;if(x<2||y<2||x>253||y>253)edge++;}return {visible,edge};}
async function runContract(){
  checks=0;const report={models:recipes.length,classes:5,frames:0,checks:0,memory:{},maxCalls:0},ok=(v,m)=>{checks++;if(!v)throw Error(m);};
  const render=(pose,equipment,id)=>{
    const canvas=view.render(pose,equipment,id),calls=view.renderer.info.render.calls;
    if(calls>report.maxCalls){report.maxCalls=calls;report.peak={classId:id,models:Object.values(equipment).filter(Boolean).map(item=>item.modelId).filter(Boolean),state:pose.state,t:pose.t,calls};}
    return canvas;
  };
  window.uniqueModelsReport=report;
  for(const id of Object.keys(CLASS_STYLES)){
    for(const r of recipes){
      const v=visual(r,id);for(const angle of angles){
        const s=pixels(render({state:'idle',t:.5,ang:angle,ex:{}},v.equipment,id));report.frames++;ok(s.visible>150,id+'/'+r.id+': invisible');ok(s.edge===0,id+'/'+r.id+': clipped inventory-sized render');
      }
      const before=roots(view.model,r.slot);view.render({state:'idle',t:0,ang:front,ex:{}},visual(r,id).equipment,id);
      ok(roots(view.model,r.slot).every((object,i)=>object===before[i]),r.id+': unchanged attachment rebuilt');
      for(const state of STATES){
        const s=pixels(render({state,t:.55,ang:front,ex:{walkPh:.55*Math.PI*2}},v.equipment,id));report.frames++;ok(s.visible>100,id+'/'+r.id+'/'+state+': invisible');ok(s.edge===0,id+'/'+r.id+'/'+state+': clipped animation');
      }
      if(['bow','crossbow'].includes(r.category))for(const state of ['attack','reload','draw','release'])for(const t of [0,.25,.5,.75,1]){
        render({state,t,ang:0,ex:{animation:{hold:state==='draw',releases:state==='release'?[t]:[]}}},v.equipment,id);report.frames++;
        ok(view.model.weapon.userData.string.geometry.attributes.position.array.every(Number.isFinite),r.id+': invalid animated string');
      }
      report.maxCalls=Math.max(report.maxCalls,view.renderer.info.render.calls);
      await new Promise(resolve=>setTimeout(resolve,0));
    }
    const outfit=variant=>resolveCharacterVisual(data,id,Object.fromEntries([variant?'u_gen_12_12':'u_widow',variant?'u_gen_17_7':'u_oath',variant?'u_gen_7_9':'u_crown',variant?'u_gen_6_12':'u_cinder',variant?'u_gen_18_12':'u_gen_18_0',variant?'u_gen_8_12':'u_stride'].map(key=>[UNIQUE_MODELS3D[key].slot,raw(UNIQUE_MODELS3D[key])]))).equipment;
    const swap=equipment=>view.render({state:'idle',t:0,ang:front,ex:{}},equipment,id);
    const resources=()=>({...view.renderer.info.memory,programs:view.renderer.info.programs.length});
    swap(outfit(false));swap(outfit(true));const warm=resources();
    for(let i=0;i<20;i++)swap(outfit(i%2===1));
    const settled=resources();ok(settled.geometries===warm.geometries&&settled.textures===warm.textures&&settled.programs===warm.programs,id+': repeated swaps leaked GPU resources');report.memory[id]={warm,settled};
    ui('result').textContent=`Checked ${id}: ${report.frames} rendered frames…`;await new Promise(resolve=>setTimeout(resolve,0));
  }
  ok(report.maxCalls<=73,'Unique render matrix exceeded 73 draw calls: '+JSON.stringify(report.peak));
  report.checks=checks;ui('result').textContent='PASS: '+report.frames+' rendered frames; all 118 models on all five classes, animations, attachment reuse and GPU cleanup.';window.uniqueModelsReport=report;return report;
}
try{
  await sprites.loadBundle('core');view=createCharacterRenderer({size:512});
  for(const [id,profile] of Object.entries(CLASS_STYLES))ui('class').add(new Option(profile.name,id));
  ui('class').onchange=()=>showPage(page,ui('class').value);ui('previous').onclick=()=>showPage(page-1);ui('next').onclick=()=>showPage(page+1);
  await showPage();ui('result').textContent='Ready · front, side and back comparisons. Inventory art is shown at its actual 64 × 64 size.';
  window.uniqueModelsQA={showPage,runContract,ids:recipes.map(r=>r.id),get view(){return view;},get recipes(){return recipes;}};document.body.dataset.testStatus='ready';
}catch(error){ui('result').textContent='FAIL: '+error.stack;document.body.dataset.testStatus='failed';}
window.addEventListener('pagehide',()=>view?.dispose());
