// Prove the flat-floor shortcut matches the original swept surface contract.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {fixture} from './boss_fixture.mjs';
const {MapGen:M,TerrainNavigation:N,U,ctx}=fixture(),S=vm.runInContext('TerrainSurface',ctx);
let checks=0;
const ok=(v,msg)=>{checks++;assert.ok(v,msg);};
for(const zone of ['mines','shattered_temple','deepfreeze_cavern'])for(let seed=0;seed<30;seed++){
 const m=M.generate(zone,Math.imul(seed+1,2654435761)>>>0),random=U.rng(seed+811);
 ok(m._surfaceFlatHeight===0,zone+' flat floor not recognized');
 const cells=[];for(let i=0;i<m.w*m.h;i++)if(!m.walls[i])cells.push(i);
 for(let sample=0;sample<150;sample++){
  const i=cells[Math.floor(random()*cells.length)],x=i%m.w+random(),y=Math.floor(i/m.w)+random(),
   tx=x+(random()-.5)*12,ty=y+(random()-.5)*12;
  for(const radius of [0,.01,.18,.36,.48,.75,1.1]){
   const actual=N.segment(m,x,y,tx,ty,radius),support=S.supported(m,x,y,radius);
   m._surfaceFlatHeight=null;
   const expected=N.segment(m,x,y,tx,ty,radius),oldSupport=S.supported(m,x,y,radius);
   m._surfaceFlatHeight=0;
   ok(actual===expected&&support===oldSupport,zone+' swept footprint changed for radius '+radius);
  }
 }
 // Props may be destroyed; edits to elevation require the existing rebuild.
 const n=m.frontier.landmarks[1],i=(n.x|0)+(n.y|0)*m.w;
 m.blocked[i]=1;ok(!N.segment(m,n.x,n.y,n.x+.1,n.y,.36),'dynamic blocker ignored');m.blocked[i]=0;
 m.elev[i]=2;S.rebuild(m);ok(m._surfaceFlatHeight===null,'height edit retained flat shortcut');
}
for(const zone of ['north_wild','shardpeak_shrine'])ok(M.generate(zone,123)._surfaceFlatHeight===null,'ascent uses flat shortcut');
const report={status:'PASS',checks,seeds:30,areas:3,radii:7,scope:'Optimized sweeps equal ramp-aware sweeps; blockers, height edits and outdoor ascents retain their rules.'};
if(process.argv.includes('--record'))fs.writeFileSync('tests/qa/frontier/navigation.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
