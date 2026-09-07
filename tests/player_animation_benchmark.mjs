import fs from 'node:fs';
import vm from 'node:vm';
import {performance} from 'node:perf_hooks';
import {createCharacter} from '../js/character3d.mjs';
import {createWildshape} from '../js/character_forms3d.mjs';
import {createCharacter as beforeCharacter} from './fixtures/animation_before/js/character3d.mjs';
import {createWildshape as beforeForm} from './fixtures/animation_before/js/character_forms3d.mjs';
import {createAnimationController} from '../js/character_motion3d.mjs';
import {resolveCharacterVisual,CLASS_STYLES} from '../js/character_catalog3d.mjs';

const scope=vm.createContext({console});vm.runInContext(fs.readFileSync('js/utils.js','utf8')+'\n'+fs.readFileSync('js/data.js','utf8')+'\nthis.DATA=DATA',scope);
const ids=[...Object.keys(CLASS_STYLES),'form_fang','form_brute','form_stone','form_apex'];
const weapons=['sword_t7','wand_t7','staff2h_t7','axe2h_t7','bow2h_t7'];
const create=(before)=>ids.map((id,i)=>{
  const model=i<5?(before?beforeCharacter:createCharacter)(id):(before?beforeForm:createWildshape)(id);
  if(i<5){const raw=Object.fromEntries(['chest','head','gloves','boots','belt'].map(s=>[s,{baseId:(s==='head'?'helm':s)+'_t7'}]));raw.main={baseId:weapons[i]};if(i===0)raw.off={baseId:'shield_t7'};model.equip(resolveCharacterVisual(scope.DATA,id,raw).equipment);}
  return model;
});
const before=create(true),after=create(false),phases=Array.from({length:120},(_,i)=>i/120);
const inputs=ids.map(()=>[]),controllers=ids.map(()=>createAnimationController());
const frames=ids.map((id,i)=>{
  const p={classId:i<5?id:'wildkeeper',x:0,y:0,visAng:1.22,animT:0,curSpeed:3.2,buffs:i<5?[]:[{id}],dead:false},controller=createAnimationController();
  return phases.map((t,n)=>{p.animT=n/60;if(n<65){p.x+=3.2/60;p.moving=true;p.action=null;}else {p.moving=false;p.curSpeed=0;p.action={state:n<95?'attack':'cast',t:(n<95?n-65:n-95)/60,dur:.5,visual:{id:n<95?1:2,releases:[.5]}};}inputs[i].push({...p});return controller.update(p,1/60);});
});
const legacy=frames.map(list=>list.map(p=>({state:p.state,t:p.t,ang:p.ang,ex:{walkPh:p.ex.walkPh}})));
function batch(models,poses){const times=[],refined=models===after;if(refined)controllers.forEach(c=>c.reset());for(let n=0;n<120;n++){const start=performance.now();for(let i=0;i<models.length;i++)models[i].animate(refined?controllers[i].update(inputs[i][n],1/60):poses[i][n]);times.push(performance.now()-start);}return times;}
for(let i=0;i<3;i++){batch(before,legacy);batch(after,frames);}
const old=[],next=[];
for(let i=0;i<9;i++){if(i%2){next.push(...batch(after,frames));old.push(...batch(before,legacy));}else{old.push(...batch(before,legacy));next.push(...batch(after,frames));}}
function stats(a){a.sort((a,b)=>a-b);return {medianMs:a[Math.floor(a.length*.5)],p95Ms:a[Math.floor(a.length*.95)]};}
const baseline=stats(old),refined=stats(next);
const result={baseline,refined,p95ChangePercent:(refined.p95Ms/baseline.p95Ms-1)*100,method:'Nine equipped rigs per batch, 120 frames, three warmups, nine alternating runs; includes controller updates and skeleton evaluation; excludes GPU rendering, same process.'};
before.concat(after).forEach(m=>m.dispose());
console.log(JSON.stringify(result,null,2));
if(process.argv.includes('--write'))fs.writeFileSync('tests/player_animation_performance.json',JSON.stringify(result,null,2)+'\n');
