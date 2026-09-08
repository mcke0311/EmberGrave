import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {fixture} from './boss_fixture.mjs';
const f=fixture(),{Game:G,MapGen:M,TerrainNavigation:N,Player,Minion,Monster,U}=f,S=vm.runInContext('TerrainSurface',f.ctx);
let checks=0,walked=0;const ok=(v,msg)=>{checks++;assert.ok(v,msg);};
const zones=['khalcamp','desert_wastes','underground_market','sand_tombs','khal_palace','shard_flats','tomb_sanctum'];
function route(m,a,b,radius,label){
 const path=N.findPath(m,a,b,{radius,speed:4.5,hop:false});ok(path,label+' missing route');
 let at=a;for(const p of path){ok(p.kind==='walk'&&N.segment(m,at.x,at.y,p.cx,p.cy,radius),label+' illegal segment');at={x:p.cx,y:p.cy};}
 ok(Math.hypot(at.x-b.x,at.y-b.y)<.75,label+' endpoint');return path;
}
for(const zone of zones)for(let i=0;i<30;i++){
 const seed=i===0?12345:Math.imul(i+37,2654435761)>>>0,m=M.generate(zone,seed),a=m.spawns.default,label=zone+'/'+seed;
 const owner=new Player('Traversal QA','vanguard'),s=G.__bossTest.freshState(owner,seed);s.map=m;G.__bossTest.setState(s);
 if(m.surfaceVersion&&!(m.ramps||[]).length){
  ok(m._surfaceFlatHeight===0,label+' flat floor not recognized');
  const random=U.rng(seed^943),cells=[];for(let k=0;k<m.w*m.h;k++)if(!m.blocked[k])cells.push(k);
  for(let sample=0;sample<100;sample++){
   const k=cells[Math.floor(random()*cells.length)],x=k%m.w+random(),y=Math.floor(k/m.w)+random(),tx=x+(random()-.5)*12,ty=y+(random()-.5)*12;
   for(const radius of [0,.18,.36,.55,.8,1.1]){
    const segment=N.segment(m,x,y,tx,ty,radius),support=S.supported(m,x,y,radius);m._surfaceFlatHeight=null;
    const original=N.segment(m,x,y,tx,ty,radius),originalSupport=S.supported(m,x,y,radius);m._surfaceFlatHeight=0;
    ok(segment===original&&support===originalSupport,label+' flat optimization changed collision');
   }
  }
 }
 // Walking-only companion profiles prove the ramps work without a hop or a
 // companion's distant-owner teleport concealing a broken connection.
 for(const n of m.act3.landmarks)for(const radius of i<3?[.3,.55]:[.3])route(m,a,n,radius,label+'/'+n.id+'/'+radius);
 for(const r of m.act3.routes)for(let j=1;j<r.points.length;j++){
  const a=r.points[j-1],b=r.points[j],length=Math.hypot(b.x-a.x,b.y-a.y);
  ok(N.segment(m,a.x,a.y,b.x,b.y,.55),label+' broad companion lane '+r.from+'/'+r.to);
  if(length)for(const lane of [-2,-1,0,1,2]){const x=(b.y-a.y)/length*lane,y=(a.x-b.x)/length*lane;ok(N.segment(m,a.x+x,a.y+y,b.x+x,b.y+y,.36),label+' five-wide route '+r.from+'/'+r.to);}
 }
 const groups=new Map();for(const p of m.monsterSpawns)if(p.landmarkId&&!groups.has(p.landmarkId))groups.set(p.landmarkId,p);
 if(i<3)for(const [id,p] of groups){const n=m.act3.landmarks.find(n=>n.id===id),enemy=new Monster(p.id,p.x,p.y,p);route(m,p,n,enemy.radius,label+'/enemy/'+id);}
 for(const p of m.monsterSpawns){const enemy=new Monster(p.id,p.x,p.y,p);ok(N.clear(m,p.x,p.y,enemy.radius)&&(!m.surfaceVersion||S.supported(m,p.x,p.y,enemy.radius)),label+' enemy footprint '+p.id);}
 if(i===0){
  const goal=m.act3.landmarks.at(-1),companion=new Minion('bone_golem',{sprite:'golem',hp:1000,dmg:1,speed:5,atkRate:1,range:1},owner);
  companion.x=a.x;companion.y=a.y;companion.path=route(m,a,goal,companion.radius,label+'/live golem');
  for(let frame=0;frame<18000&&companion.path?.length;frame++){s.time+=1/30;companion.moveAlong(1/30,5,m,[]);ok(N.clear(m,companion.x,companion.y,companion.radius),label+' companion intersected architecture');}
  ok(Math.hypot(companion.x-goal.x,companion.y-goal.y)<.75,label+' companion stalled');walked++;
 }
}
const report={status:'PASS',checks,seeds:30,areas:7,liveCompanionRoutes:walked,coverage:'Thirty seeds: skeletal routes, golem-width authored lanes, every enemy footprint, flat-sweep equivalence. Three seeds: complete golem and encounter paths. Seven live golem routes without teleport fallback.'};
fs.writeFileSync('tests/qa/act3/navigation.json',JSON.stringify(report,null,2)+'\n');console.log(report);
