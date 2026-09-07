import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
import {Vector3} from '../js/vendor/three/three.module.min.js';
import {createCharacter} from '../js/character3d.mjs';
import {CLASS_STYLES,resolveCharacterVisual} from '../js/character_catalog3d.mjs';
const scope={console};vm.createContext(scope);vm.runInContext(fs.readFileSync('js/utils.js','utf8')+'\n'+fs.readFileSync('js/data.js','utf8')+'\nthis.data=DATA;',scope);const data=scope.data;
let checks=0,minUpperClearance=Infinity,minForearmClearance=Infinity;
const ok=(condition,label)=>{assert.ok(condition,label);checks++;};
function checkArms(m,pose,label){
  m.animate(pose);
  // The torso envelope includes a 55 mm sleeve/bracer allowance. The proximal
  // third of the upper arm is the shoulder socket, which must meet the torso.
  for(const side of ['R','L'])for(const upper of [true,false]){
    const a=m.joints[(upper?'UpperArm':'Forearm')+side].getWorldPosition(new Vector3()),b=m.joints[(upper?'Forearm':'Hand')+side].getWorldPosition(new Vector3());
    for(let i=upper?7:0;i<=20;i++){
      const p=m.joints.Chest.worldToLocal(a.clone().lerp(b,i/20));
      const distance=Math.hypot(p.x/.285,(p.y+.06)/.225,p.z/.205);
      if(upper)minUpperClearance=Math.min(minUpperClearance,distance);else minForearmClearance=Math.min(minForearmClearance,distance);
      ok(distance>=1,label+'/'+side+(upper?' upper arm':' forearm')+' enters torso at '+i/20+' ('+distance+')');
    }
  }
}
const simple=(state,t)=>({state,t,ex:{walkPh:t*Math.PI*2}});
for(const id of Object.keys(CLASS_STYLES)){
  const m=createCharacter(id);
  for(const tier of [0,13]){
    const raw=Object.fromEntries(['head','chest','gloves','boots','belt'].map(s=>[s,{baseId:(s==='head'?'helm':s)+'_t'+tier}]));
    raw.main={baseId:Object.values(data.BASES).find(b=>b.playerVisualFamily==='bow_2h'&&b.id.endsWith('_t'+tier)).id};m.equip(resolveCharacterVisual(data,id,raw).equipment);
    for(const state of ['idle','walk','attack','cast','draw','channel','kick','hit','charge','airborne'])for(let i=0;i<=80;i++){
      m.root.rotation.y=Math.floor(i/11)*Math.PI/4;checkArms(m,simple(state,i/80),[id,tier,state,i/80].join('/'));
    }
    for(const [from,to] of [
      [simple('draw',1),simple('idle',0)],[simple('idle',0),simple('draw',1)],
      [simple('attack',.38),simple('walk',.2)],[simple('attack',.7),simple('cast',.1)],
      [simple('walk',.25),simple('attack',.15)],[simple('draw',1),simple('airborne',.25)],
      [simple('cast',.4),simple('walk',.7)]
    ])for(let i=0;i<=50;i++)checkArms(m,{...to,ex:{...to.ex,animation:{blend:{from,weight:i/50}}}},[id,tier,from.state+' to '+to.state,i/50].join('/'));
    for(let i=0;i<=80;i++)checkArms(m,{state:'attack',t:i/80,ex:{animation:{releases:[0,.28,.52,.75]}}},id+'/'+tier+'/repeated/'+i/80);
  }
  m.dispose();
}
console.log(JSON.stringify({status:'PASS',checks,minUpperClearance,minForearmClearance},null,2));
