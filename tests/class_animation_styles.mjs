import {createCharacterRenderer,STATES} from '../js/character3d.mjs?v=5';
import {CLASS_STYLES,WEAPON_FAMILIES,resolveCharacterVisual} from '../js/character_catalog3d.mjs';
import {CLASS_ANIMATIONS} from '../js/character_animation3d.mjs?v=5';
const ui=id=>document.getElementById(id),classes=Object.keys(CLASS_STYLES),data=window.AnimationData;
const signature={vanguard:'sword_1h',emberwitch:'wand_1h',gravebinder:'staff_2h',wildkeeper:'axe_2h',veilranger:'bow_2h'};
const cx=ui('live').getContext('2d'),strips={},gear={};let view,state='idle',phase=0,paused=false,last=0,dirty=true,renderedPhase=-1;
for(const s of STATES){const b=document.createElement('button');b.textContent=s[0].toUpperCase()+s.slice(1);b.dataset.state=s;b.setAttribute('aria-pressed',s===state);b.onclick=()=>{state=s;phase=0;dirty=true;document.querySelectorAll('#states button').forEach(el=>el.setAttribute('aria-pressed',el===b));};ui('states').append(b);}
for(const f of WEAPON_FAMILIES)ui('weapon').add(new Option(f.replaceAll('_',' '),f));
for(const id of classes){const h=document.createElement('h2');h.textContent=CLASS_STYLES[id].name;const p=document.createElement('p');p.className='theme';p.textContent=CLASS_ANIMATIONS[id].name+' · '+CLASS_ANIMATIONS[id].description;const c=document.createElement('canvas');c.width=1500;c.height=340;c.className='moments';c.setAttribute('aria-label',CLASS_STYLES[id].name+' animation key moments');ui('moments').append(h,p,c);strips[id]=c.getContext('2d');}
function updateGear(){
  for(const id of classes){const tier=ui('tier').value,choice=ui('weapon').value,family=choice==='signature'?signature[id]:choice,base=choice==='none'?null:Object.values(data.BASES).find(b=>b.playerVisualFamily===family&&b.id.endsWith('_t'+tier))?.id;
    const raw=Object.fromEntries(['head','chest','gloves','boots','belt'].map(s=>[s,{baseId:(s==='head'?'helm':s)+'_t'+tier}]));if(base)raw.main={baseId:base};if(id==='vanguard'&&base&&!data.BASES[base].twoHand)raw.off={baseId:'shield_t'+tier};gear[id]=resolveCharacterVisual(data,id,raw).equipment;
  }dirty=true;
}
for(const id of ['tier','weapon'])ui(id).onchange=updateGear;ui('facing').onchange=()=>{dirty=true;};
ui('pause').onclick=()=>{paused=!paused;ui('pause').textContent=paused?'Play':'Pause';};ui('timeline').oninput=()=>{phase=+ui('timeline').value;paused=true;ui('pause').textContent='Play';};
function draw(ctx,id,u,x,w,caption){
  ctx.save();ctx.translate(x+w/2,285);view.draw(ctx,{state,t:state==='idle'?u*3:u,ang:+ui('facing').value,ex:{walkPh:u*Math.PI*2}},gear[id],{classId:id,scale:2.7});ctx.restore();ctx.fillStyle='#d5c9bb';ctx.font='16px system-ui';ctx.textAlign='center';ctx.fillText(caption,x+w/2,318);
}
function tick(ms){
  const dt=Math.min(.06,last?(ms-last)/1000:0);last=ms;
  if(!document.hidden){
    if(!paused){phase+=dt*(state==='idle'?.333:state==='walk'?1.1:.68);phase=state==='dead'?1:phase>1?(state==='death'?1:phase%1):phase;}
    if(dirty||renderedPhase!==phase){
      cx.clearRect(0,0,1500,370);classes.forEach((id,i)=>draw(cx,id,phase,i*300,300,CLASS_STYLES[id].name));
      if(dirty){dirty=false;for(const id of classes){const c=strips[id],family=gear[id].main?.family,impact=state==='cast'?.55:family==='bow_2h'||family==='crossbow_2h'?.45:.5;c.clearRect(0,0,1500,340);const samples=state==='attack'||state==='cast'?[0,impact*.55,impact,impact+(1-impact)*.45,1]:state==='hit'?[0,CLASS_ANIMATIONS[id].hit[0][0],.4,.7,1]:[0,.25,.5,.75,1];samples.forEach((u,i)=>draw(c,id,u,i*300,300,Math.round(u*100)+'%'));}}
      ui('timeline').value=phase;ui('phase').textContent=Math.round(phase*100)+'%';renderedPhase=phase;
    }
  }requestAnimationFrame(tick);
}
try{view=createCharacterRenderer({size:384});updateGear();ui('result').textContent='Ready · five class animation sets · seven states · all weapon families';document.body.dataset.testStatus='ready';requestAnimationFrame(tick);}catch(e){ui('result').textContent=e.stack;document.body.dataset.testStatus='failed';}
window.addEventListener('pagehide',e=>{if(!e.persisted)view?.dispose();});
