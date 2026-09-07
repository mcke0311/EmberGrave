import {createCharacterRenderer,STATES} from '../js/character3d.mjs?v=15';
import {CLASS_STYLES,WEAPON_FAMILIES,resolveCharacterVisual} from '../js/character_catalog3d.mjs';
import {CLASS_ANIMATIONS} from '../js/character_animation3d.mjs?v=10';
import {FORM_STYLES} from '../js/character_forms3d.mjs?v=8';
import {createAnimationController,groundPosition,motionYaw,gaitProfile,footPath} from '../js/character_motion3d.mjs';

const ui=id=>document.getElementById(id),classes=Object.keys(CLASS_STYLES),forms=Object.keys(FORM_STYLES),ids=[...classes,...forms],data=window.AnimationData;
const signature={vanguard:'sword_1h',emberwitch:'wand_1h',gravebinder:'staff_2h',wildkeeper:'axe_2h',veilranger:'bow_2h'};
const cx=ui('live').getContext('2d'),beforeCx=ui('before').getContext('2d'),strips={},gear={},actors=new Map();
let view,beforeView,state='walk',phase=0,paused=false,last=0,dirty=true,renderedPhase=-1,sequenceTime=-1;
const name=id=>CLASS_STYLES[id]?.name||FORM_STYLES[id].name;
const states=[...STATES,'draw','channel','charge','spin','airborne','sequence'];
const durations={idle:3,walk:.75,attack:.7,cast:.85,kick:.56,hit:.22,death:.8,dead:1,draw:1.5,channel:3,charge:.75,spin:1.2,airborne:.5,sequence:12};
for(const s of states){const b=document.createElement('button');b.textContent=s==='sequence'?'Gameplay sequence':s[0].toUpperCase()+s.slice(1);b.dataset.state=s;b.setAttribute('aria-pressed',s===state);b.onclick=()=>{state=s;phase=0;dirty=true;sequenceTime=-1;document.querySelectorAll('#states button').forEach(el=>el.setAttribute('aria-pressed',el===b));};ui('states').append(b);}
for(const f of WEAPON_FAMILIES)ui('weapon').add(new Option(f.replaceAll('_',' '),f));
for(const id of ids){
  const h=document.createElement('h2');h.textContent=name(id);const p=document.createElement('p');p.className='theme';
  p.textContent=CLASS_ANIMATIONS[id]?CLASS_ANIMATIONS[id].name+' · '+CLASS_ANIMATIONS[id].description:
    {form_fang:'Quick feet · bite and lunge · expressive tail',form_brute:'Heavy four-beat walk · forepaw sweep',form_stone:'Planted steps · granite fist · deliberate collapse',form_apex:'Predatory stride · claw rake · grounded recovery'}[id];
  const c=document.createElement('canvas');c.width=1500;c.height=340;c.className='moments';c.setAttribute('aria-label',name(id)+' animation key moments');ui('moments').append(h,p,c);strips[id]=c.getContext('2d');
}
function updateGear(){
  for(const id of classes){const tier=ui('tier').value,choice=ui('weapon').value,family=choice==='signature'?signature[id]:choice,base=choice==='none'?null:Object.values(data.BASES).find(b=>b.playerVisualFamily===family&&b.id.endsWith('_t'+tier))?.id;
    const raw=Object.fromEntries(['head','chest','gloves','boots','belt'].map(s=>[s,{baseId:(s==='head'?'helm':s)+'_t'+tier}]));if(base)raw.main={baseId:base};if(id==='vanguard'&&base&&!data.BASES[base].twoHand)raw.off={baseId:'shield_t'+tier};gear[id]=resolveCharacterVisual(data,id,raw).equipment;
  }dirty=true;
}
for(const id of ['tier','weapon'])ui(id).onchange=updateGear;
for(const id of ['facing','contacts','scale'])ui(id).onchange=()=>{dirty=true;sequenceTime=-1;};
ui('compare').onchange=async()=>{
  try{if(ui('compare').checked&&!beforeView){const module=await import('./fixtures/animation_before/js/character3d.mjs');beforeView=module.createCharacterRenderer({size:384});}
    ui('before-panel').hidden=!ui('compare').checked;dirty=true;
  }catch(e){ui('result').textContent='Baseline unavailable: '+e.message;ui('compare').checked=false;}
};
function pause(){paused=true;ui('pause').textContent='Play';}
ui('pause').onclick=()=>{paused=!paused;ui('pause').textContent=paused?'Play':'Pause';};
ui('timeline').oninput=()=>{phase=+ui('timeline').value;pause();};
for(const [id,sign] of [['previous',-1],['next',1]])ui(id).onclick=()=>{pause();phase=Math.max(0,Math.min(1,phase+sign/(60*durations[state])));};

function makeActor(id){return {player:{classId:classes.includes(id)?id:'wildkeeper',x:0,y:0,visAng:+ui('facing').value,animT:0,moving:false,curSpeed:0,dead:false,buffs:forms.includes(id)?[{id}]:[],action:null},controller:createAnimationController(),distance:0};}
function stepActor(actor,time,dt){
  const p=actor.player;p.animT=time;p.action=null;p.drawing=p.siphon=p.jumping=p.spinning=p.charging=null;p.dead=false;
  const move=time>=1&&time<3||time>=4&&time<5.5||time>=9&&time<10;
  p.curSpeed=move?3.2:0;p.moving=move;
  const a=+ui('facing').value,yaw=motionYaw(a),dx=Math.sin(yaw),dz=Math.cos(yaw);
  const distance=3.2*(Math.max(0,Math.min(2,time-1))+Math.max(0,Math.min(1.5,time-4))+Math.max(0,Math.min(1,time-9)));
  p.x=(dx+dz)*distance/Math.SQRT2;p.y=(dz-dx)*distance/Math.SQRT2;actor.distance=distance;
  p.visAng=a+(time>=5&&time<6?(time-5)*.9:time>=6?.9:0);
  if(time>=3&&time<3.7)p.action={state:'attack',t:time-3,dur:.7,visual:{id:1,releases:[p.classId==='veilranger'?.45:.5]}};
  if(time>=6&&time<7){if(p.classId==='veilranger')p.drawing={t:time-6,maxDraw:1};else p.siphon={};}
  if(time>=7&&time<7.7)p.action={state:p.classId==='veilranger'?'attack':'cast',t:time-7,dur:.7,visual:{id:2,releases:[0]}};
  if(time>=8&&time<8.5)p.jumping={t:time-8,dur:.5};
  if(time>=10){p.dead=true;p.action={state:'death',t:Math.min(.8,time-10),dur:.8,visual:{id:3,releases:[]}};}
  actor.frame=actor.controller.update(p,dt);
  actor.legacy={state:p.action?.state||(p.moving?'walk':'idle'),t:p.action?p.action.t/p.action.dur:p.animT,ang:p.visAng,ex:{walkPh:distance/2.4*Math.PI*2,airborne:!!p.jumping}};
}
function sequence(time){
  if(sequenceTime<0||time<sequenceTime){actors.clear();for(const id of ids)actors.set(id,makeActor(id));sequenceTime=0;actors.forEach(a=>stepActor(a,0,0));}
  while(sequenceTime+1/60<time){sequenceTime+=1/60;actors.forEach(a=>stepActor(a,sequenceTime,1/60));}
  if(time>sequenceTime){const dt=time-sequenceTime;actors.forEach(a=>stepActor(a,time,dt));sequenceTime=time;}
}
function simplePose(id,u,old=false){
  const family=gear[id]?.main?.family,impact=state==='cast'?.55:['bow_2h','crossbow_2h'].includes(family)?.45:.5;
  const pose={state,t:state==='idle'||state==='channel'?u*3:u,ang:+ui('facing').value,ex:{walkPh:u*Math.PI*2}};
  if(!old&&(state==='attack'||state==='cast'))pose.ex.animation={releases:[impact]};
  if(state==='airborne')pose.ex.airborne=true;
  return pose;
}
function draw(ctx,id,u,x,y,w,caption,{old=false,sequenceFrame=false}={}){
  const renderer=old?beforeView:view,form=forms.includes(id)?id:null,classId=form?'wildkeeper':id,scale=+ui('scale').value;
  const actor=actors.get(id),pose=sequenceFrame?(old?actor.legacy:actor.frame):simplePose(id,u,old);
  const gait=gaitProfile(classId,form,pose.ex.animation?.speed??3),yaw=motionYaw(pose.ang),width=form?1:CLASS_STYLES[classId].width;
  const origin=sequenceFrame?groundPosition(actor.player.x,actor.player.y):state==='walk'?{x:Math.sin(yaw)*u*gait.stride,z:Math.cos(yaw)*u*gait.stride}:{x:0,z:0};
  ctx.save();ctx.beginPath();ctx.rect(x,y,w,335);ctx.clip();ctx.translate(x+w/2,y+275);
  ctx.strokeStyle='#69727024';ctx.lineWidth=1;
  const offsetX=(-origin.x*40*scale)%48,offsetY=(-origin.z*20*scale)%24;
  for(let i=-4;i<=4;i++){ctx.beginPath();ctx.moveTo(i*48+offsetX,-48);ctx.lineTo(i*48+offsetX,30);ctx.stroke();}
  for(let i=-2;i<=1;i++){ctx.beginPath();ctx.moveTo(-w/2,i*24+offsetY);ctx.lineTo(w/2,i*24+offsetY);ctx.stroke();}
  renderer.draw(ctx,pose,gear[classId]||{},{classId,form,scale});
  if(!old&&ui('contacts').checked&&!['death','dead','airborne','kick'].includes(pose.state)){
    const cycle=(pose.ex.animation?.phase??pose.ex.walkPh??0)/(Math.PI*2);
    const feet=renderer.model.contacts||pose.ex.animation?.feet||gait.feet.map(f=>pose.state==='walk'?footPath(cycle,gait,f):{...f,y:0,contact:true});
    for(const foot of feet){const sx=width*(Math.cos(yaw)*foot.x+Math.sin(yaw)*foot.z)*40*scale,sy=width*(-Math.sin(yaw)*foot.x+Math.cos(yaw)*foot.z)*20*scale;ctx.strokeStyle=foot.contact?'#86c59b':'#a18d69';ctx.beginPath();ctx.ellipse(sx,sy,4*scale,2*scale,0,0,Math.PI*2);ctx.stroke();}
  }
  ctx.restore();ctx.fillStyle='#d5c9bb';ctx.font='16px system-ui';ctx.textAlign='center';ctx.fillText(caption,x+w/2,y+320);
}
function render(){
  if(state==='sequence')sequence(phase*12);
  for(const [ctx,old] of [[cx,false],...(ui('compare').checked&&beforeView?[[beforeCx,true]]:[])]){
    ctx.clearRect(0,0,1500,740);ids.forEach((id,i)=>draw(ctx,id,phase,(i%5)*300,i<5?0:370,300,name(id),{old,sequenceFrame:state==='sequence'}));
  }
  ui('moments').hidden=state==='sequence';
  if(dirty&&state!=='sequence')for(const id of ids){const c=strips[id],family=gear[id]?.main?.family,impact=state==='cast'?.55:['bow_2h','crossbow_2h'].includes(family)?.45:.5;c.clearRect(0,0,1500,340);
    const samples=state==='attack'||state==='cast'?[0,impact*.62,impact,impact+(1-impact)*.38,1]:[0,.25,.5,.75,1];samples.forEach((u,i)=>draw(c,id,u,i*300,0,300,Math.round(u*100)+'%'));
  }
  const sample=state==='sequence'?actors.get('vanguard').frame:simplePose('vanguard',phase),markers=sample.ex.animation?.releases||[];
  ui('markers').textContent=state==='sequence'?`Sequence ${(phase*12).toFixed(1)}s / 12s · ${sample.state} · actual displacement drives grounded contacts`:
    `${state} · ${Math.round(phase*100)}%${markers.length?' · release '+markers.map(n=>Math.round(n*100)+'%').join(', '):''} · ${ids.length} rigs`;
  ui('timeline').value=phase;ui('phase').textContent=Math.round(phase*100)+'%';renderedPhase=phase;dirty=false;
}
function tick(ms){
  const dt=Math.min(.06,last?(ms-last)/1000:0);last=ms;
  if(!document.hidden){if(!paused){phase+=dt*+ui('speed').value/durations[state];if(phase>1)phase=state==='death'||state==='dead'?1:phase%1;}if(dirty||renderedPhase!==phase)render();}
  requestAnimationFrame(tick);
}
ui('export').onclick=()=>{
  const include=ui('compare').checked&&beforeView,canvas=document.createElement('canvas');canvas.width=1500;canvas.height=include?1560:800;const ctx=canvas.getContext('2d');ctx.fillStyle='#171a20';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#e4d4b9';ctx.font='24px Georgia';
  let y=0;if(include){ctx.fillText('Before · '+state,24,32);ctx.drawImage(ui('before'),0,45);y=780;}ctx.fillText('Refined · '+state+' · '+Math.round(phase*100)+'%',24,y+32);ctx.drawImage(ui('live'),0,y+45);
  // Keep the image visible as well as downloadable: embedded browsers may not
  // provide a file-download surface, but can still preview/export page assets.
  let result=ui('export-result');
  if(!result){result=document.createElement('details');result.id='export-result';result.innerHTML='<summary>Comparison image</summary><p><a>Download PNG</a></p><img style="width:100%;height:auto" alt="Exported player animation comparison">';ui('markers').after(result);}
  const url=canvas.toDataURL('image/png'),link=result.querySelector('a');
  result.querySelector('img').src=url;link.href=url;link.download='player-animation-'+state+'-'+Math.round(phase*100)+'.png';result.open=true;
};
try{view=createCharacterRenderer({size:384});updateGear();ui('result').textContent='Ready · five classes · four forms · eight base states + held actions, traversal, and gameplay sequence';document.body.dataset.testStatus='ready';requestAnimationFrame(tick);}catch(e){ui('result').textContent=e.stack;document.body.dataset.testStatus='failed';}
window.addEventListener('pagehide',e=>{if(!e.persisted){view?.dispose();beforeView?.dispose();}});
