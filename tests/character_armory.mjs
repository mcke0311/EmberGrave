import {createCharacterRenderer,STATES} from '../js/character3d.mjs?v=15';
import {CLASS_ANIMATIONS} from '../js/character_animation3d.mjs?v=10';
import {CLASS_STYLES,EQUIPMENT_SLOTS,resolveCharacterVisual,catalogEntries,armorFamily} from '../js/character_catalog3d.mjs';
import {ARMOR_THEMES,ARMOR_LEVELS,armorRank} from '../js/character_armor3d.mjs?v=4';
const data=window.CharacterPreviewData;
const ui=id=>document.getElementById(id),ctx=ui('stage').getContext('2d'),dx=ui('directions').getContext('2d');
const catalog=Object.fromEntries(EQUIPMENT_SLOTS.map(slot=>[slot,catalogEntries(data,slot)]));
let view,classId='emberwitch',animation='idle',paused=false,phase=0,last=0,stripDirty=true,frames=0,fpsStart=0,turnAngle=65,equip={},visual=null;
const pretty={main:'Weapon',off:'Shield',head:'Head',chest:'Chest',gloves:'Gloves',boots:'Boots',belt:'Belt',ring1:'Left ring',ring2:'Right ring',amulet:'Amulet'};
function refresh(){
  visual=resolveCharacterVisual(data,classId,equip);stripDirty=true;
  ui('name').textContent=CLASS_STYLES[classId].name;ui('classDescription').textContent=data.CLASSES[classId].desc;
  ui('animationTheme').textContent=CLASS_ANIMATIONS[classId].name+' · '+CLASS_ANIMATIONS[classId].description;
  ui('armorTheme').textContent=(visual.equipment.chest?ARMOR_LEVELS[classId][armorRank(visual.equipment.chest)]:ARMOR_THEMES[classId].name)+' · '+ARMOR_THEMES[classId].description;
  ui('play').href=`../index.html?player3d=1&class=${classId}`;
  const two=visual.equipment.main?.twoHand;ui('gear-off').disabled=!!two;
  ui('gripNote').textContent=two?'Two-handed grip · shield unavailable':'One-handed / unarmed · shield available';
  ui('status').textContent='Ready · '+(visual.equipment.main?.name||'Unarmed')+' · '+(visual.equipment.chest?.name||'Base clothing');
}
function fillSelect(slot){
  const select=ui('gear-'+slot),query=ui('search').value.trim().toLowerCase(),selected=select.value;
  select.replaceChildren(new Option('None',''));
  const groups={};for(const entry of catalog[slot]){
    if(query&&!entry.label.toLowerCase().includes(query)&&entry.id!==selected)continue;
    const group=entry.item.rarity||'base';if(!groups[group]){const g=document.createElement('optgroup');g.label=group==='base'?'Base items':group==='unique'?'Unique items':'Set items';select.add(g);groups[group]=g;}
    groups[group].append(new Option(entry.label,entry.id));
  }
  select.value=selected;
}
for(const slot of EQUIPMENT_SLOTS){
  const label=document.createElement('label');label.htmlFor='gear-'+slot;label.textContent=pretty[slot];
  const select=document.createElement('select');select.id='gear-'+slot;
  ui('equipment').append(label,select);fillSelect(slot);
  select.onchange=()=>{
    const entry=catalog[slot].find(e=>e.id===select.value);if(entry)equip[slot]={...entry.item};else delete equip[slot];
    if(slot==='main'&&data.BASES[equip.main?.baseId]?.twoHand){delete equip.off;ui('gear-off').value='';}
    refresh();
  };
}
ui('search').oninput=()=>EQUIPMENT_SLOTS.forEach(fillSelect);
function syncSelects(){for(const slot of EQUIPMENT_SLOTS){const it=equip[slot];ui('gear-'+slot).value=it?(it.uniqueId||it.setItemId||it.baseId):'';}}
function starter(){
  const ids=data.PLAYER_STARTER_LOADOUTS[classId];equip={main:{baseId:ids.main},chest:{baseId:ids.chest}};
  ui('search').value='';EQUIPMENT_SLOTS.forEach(fillSelect);syncSelects();refresh();
}
for(const [id,profile] of Object.entries(CLASS_STYLES)){
  const button=document.createElement('button');button.textContent=profile.name;button.type='button';button.setAttribute('aria-pressed',id===classId);
  button.onclick=()=>{classId=id;starter();document.querySelectorAll('#classes button').forEach(b=>b.setAttribute('aria-pressed',b===button));};ui('classes').append(button);
}
ui('starter').onclick=starter;
ui('unequip').onclick=()=>{equip={};syncSelects();refresh();};
ui('tier').oninput=()=>{ui('tierValue').textContent=ui('tier').value;};
ui('fullSet').onclick=()=>{
  const tier=+ui('tier').value,old=data.BASES[equip.main?.baseId]||data.BASES[data.PLAYER_STARTER_LOADOUTS[classId].main];
  const weapon=Object.values(data.BASES).find(b=>b.slot==='main'&&b.playerVisualFamily===old.playerVisualFamily&&b.id.endsWith('_t'+tier));
  equip={main:{baseId:weapon.id},head:{baseId:`helm_t${tier}`},chest:{baseId:`chest_t${tier}`},gloves:{baseId:`gloves_t${tier}`},boots:{baseId:`boots_t${tier}`},belt:{baseId:`belt_t${tier}`},ring1:{baseId:tier?'ring_t'+tier:'ring'},ring2:{baseId:tier?'ring_t'+tier:'ring'},amulet:{baseId:tier?'amulet_t'+tier:'amulet'}};
  if(!weapon.twoHand)equip.off={baseId:'shield_t'+tier};ui('search').value='';EQUIPMENT_SLOTS.forEach(fillSelect);syncSelects();refresh();
};
for(const state of STATES){
  const button=document.createElement('button');button.textContent=state[0].toUpperCase()+state.slice(1);button.type='button';button.setAttribute('aria-pressed',state===animation);
  button.onclick=()=>{animation=state;phase=0;stripDirty=true;document.querySelectorAll('#animations button').forEach(b=>b.setAttribute('aria-pressed',b===button));};ui('animations').append(button);
}
ui('pause').onclick=()=>{paused=!paused;ui('pause').textContent=paused?'Resume animation':'Pause animation';};
ui('scrub').oninput=()=>{phase=+ui('scrub').value;paused=true;stripDirty=true;ui('pause').textContent='Resume animation';};
ui('facing').oninput=()=>{turnAngle=+ui('facing').value;};
function background(){
  ctx.clearRect(0,0,940,690);ctx.strokeStyle='#50414f28';ctx.lineWidth=1;
  for(let i=-9;i<=9;i++){ctx.beginPath();ctx.moveTo(470+i*62-650,470-325);ctx.lineTo(470+i*62+650,470+325);ctx.stroke();ctx.beginPath();ctx.moveTo(470+i*62-650,470+325);ctx.lineTo(470+i*62+650,470-325);ctx.stroke();}
  const glow=ctx.createRadialGradient(470,380,10,470,380,270);glow.addColorStop(0,'#ab683521');glow.addColorStop(1,'#ab683500');ctx.fillStyle=glow;ctx.fillRect(180,100,580,570);
  ctx.fillStyle='#08090d99';ctx.beginPath();ctx.ellipse(475,535,231,71,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#29232b';ctx.beginPath();ctx.ellipse(470,511,208,84,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#3a333b';ctx.beginPath();ctx.ellipse(470,492,208,84,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#706057';ctx.stroke();
  ctx.strokeStyle='#a4866355';ctx.beginPath();ctx.ellipse(470,492,187,72,0,0,Math.PI*2);ctx.stroke();
  ctx.fillStyle='#c7905a';for(let i=0;i<12;i++){const a=i/12*Math.PI*2;ctx.save();ctx.translate(470+Math.cos(a)*194,492+Math.sin(a)*77);ctx.rotate(a);ctx.fillRect(-3,-1,6,2);ctx.restore();}
  ctx.save();ctx.translate(470,488);ctx.scale(1,.4);const shadow=ctx.createRadialGradient(0,0,3,0,0,90);shadow.addColorStop(0,'#08090cc0');shadow.addColorStop(1,'#08090c00');ctx.fillStyle=shadow;ctx.fillRect(-110,-110,220,220);ctx.restore();
}
function tick(ms){
  if(!view||document.hidden){last=ms;requestAnimationFrame(tick);return;}
  try{
    const dt=Math.min(.06,last?(ms-last)/1000:0);last=ms;
    if(!paused){phase+=dt*(+ui('speed').value)*(animation==='idle'?.333:animation==='walk'?1.25:.8);if(phase>1)phase=animation==='death'||animation==='dead'?1:phase%1;}
    if(ui('rotate').checked){turnAngle=(turnAngle+dt*18)%360;ui('facing').value=Math.round(turnAngle)%360;}
    const angle=(ui('rotate').checked?turnAngle:+ui('facing').value)*Math.PI/180,pose={state:animation,t:animation==='idle'?phase*3:phase,ang:angle,ex:{walkPh:phase*Math.PI*2}};
    background();ctx.save();ctx.translate(470,490);view.draw(ctx,pose,visual.equipment,{classId,scale:+ui('zoom').value});ctx.restore();
    if(stripDirty||!paused&&frames%4===0){stripDirty=false;dx.clearRect(0,0,940,146);for(let i=0;i<8;i++){dx.save();dx.translate(58+i*117.5,115);dx.fillStyle='#08080b66';dx.beginPath();dx.ellipse(0,0,19,7,0,0,Math.PI*2);dx.fill();view.draw(dx,{...pose,ang:i*Math.PI/4},visual.equipment,{classId});dx.restore();}}
    ui('scrub').value=phase;ui('timeValue').textContent=Math.round(phase*100)+'%';ui('speedValue').textContent=ui('speed').value+'×';ui('zoomValue').textContent=ui('zoom').value+'×';ui('facingValue').textContent=ui('facing').value+'°';
    ui('poseLabel').textContent=animation+' / '+(visual.equipment.main?.family.replaceAll('_',' ')||'unarmed');
    frames++;if(ms-fpsStart>1000){ui('fps').textContent=Math.round(frames*1000/(ms-fpsStart));fpsStart=ms;frames=0;}
    requestAnimationFrame(tick);
  }catch(error){ui('status').className='error';ui('status').textContent=error.message;document.body.dataset.testStatus='failed';}
}
try{view=createCharacterRenderer({size:640});starter();ui('boneCount').textContent=view.model.bones.length;document.body.dataset.testStatus='ready';requestAnimationFrame(tick);}catch(error){ui('status').textContent=error.message;document.body.dataset.testStatus='failed';}
window.addEventListener('pagehide',event=>{if(!event.persisted)view?.dispose();});
