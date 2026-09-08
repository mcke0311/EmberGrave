import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const zones=['weeping_marsh','drowned_crypt','hollow_reeds','spawn_pools','ritual_site'];
const seeds=[0,1,123,12345,4294967295,...Array.from({length:25},(_,i)=>Math.imul(i+37,2654435761)>>>0)];
function fixture(prefix='../'){
 const ctx=vm.createContext({console,Math,performance,Uint8Array,Int32Array,Uint8ClampedArray,document:{createElement:()=>({getContext:()=>({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){}})})}});
 for(const n of ['utils','data','data_overrides','boss_encounters','sprite_manifest','mapgen','navigation'])vm.runInContext(fs.readFileSync(new URL(prefix+'js/'+n+'.js',import.meta.url),'utf8'),ctx);
 return vm.runInContext('({M:MapGen,S:TerrainSurface,N:TerrainNavigation})',ctx);
}
const {M,S,N}=fixture(),before=fixture('../tmp/act2/before/');
let checks=0;const ok=(v,msg)=>{checks++;assert.ok(v,msg);};
function reach(m,sp=m.spawns.default,api={M,S}){
 const distances=new Int32Array(m.w*m.h).fill(-1),queue=[(sp.x|0)+(sp.y|0)*m.w];distances[queue[0]]=0;
 for(let q=0;q<queue.length;q++){const i=queue[q],x=i%m.w,y=Math.floor(i/m.w);for(const [dx,dy] of [[0,1],[1,0],[-1,0],[0,-1]]){
  const nx=x+dx,ny=y+dy,j=nx+ny*m.w;if(nx<0||ny<0||nx>=m.w||ny>=m.h||distances[j]>=0||!api.M.canStep(m,x,y,nx,ny))continue;distances[j]=distances[i]+1;queue.push(j);
 }}return{distances,reachable:queue.length,furthest:Math.max(...distances)};
}
const signature=m=>crypto.createHash('sha256').update(JSON.stringify({walls:[...m.walls],blocked:[...m.blocked],water:[...m.act2.water],composition:m.act2,props:m.props,spawns:m.spawns,enemies:m.monsterSpawns})).digest('hex');
const reports=[];
for(const zone of zones){
 const rows=[],hashes=new Set();
 for(const seed of seeds){
  const m=M.generate(zone,seed),f=m.act2,label=zone+'/'+seed,{distances,reachable,furthest}=reach(m),b=before.M.generate(zone,seed),br=reach(b,b.spawns.default,before);
  ok(m.w===b.w&&m.h===b.h,label+' dimensions');
  ok(JSON.stringify(m.exits.map(e=>[e.target,e.spawnKey]).sort())===JSON.stringify(b.exits.map(e=>[e.target,e.spawnKey]).sort()),label+' travel links');
  for(const key of Object.keys(b.spawns))ok(m.spawns[key],label+' missing old spawn key '+key);
  const targets=[...Object.values(m.spawns),...m.exits.map(e=>({x:(e.x0+e.x1)/2,y:(e.y0+e.y1)/2})),...f.landmarks,
    ...m.props.filter(p=>p.interact||p.lootable),...m.monsterSpawns,...f.anchors.events,...Object.values(f.anchors.story),...(f.anchors.ritual?[f.anchors.ritual]:[])];
  for(const p of targets)ok(distances[(p.x|0)+(p.y|0)*m.w]>=0&&S.supported(m,p.x,p.y,.36),label+' unreachable '+JSON.stringify(p));
  for(const ro of f.routes){
   ok(ro.width>=5,label+' route too narrow');
   for(let i=1;i<ro.points.length;i++){const a=ro.points[i-1],b=ro.points[i];ok(N.segment(m,a.x,a.y,b.x,b.y,.36),label+' route center blocked '+ro.from+'/'+ro.to);}
  }
  for(const p of m.buildings){const a=p.footprint;for(let y=a.y0;y<a.y1;y++)for(let x=a.x0;x<a.x1;x++)ok(m.blocked[x+y*m.w]&&!f.water[x+y*m.w],label+' architecture footprint');}
  for(let i=0;i<f.water.length;i++)if(f.water[i])ok(m.blocked[i]&&!m.hazard[i],label+' scenic water traversable or damaging');
  for(const sp of Object.values(m.spawns))ok(!m.hazard[(sp.x|0)+(sp.y|0)*m.w],label+' dangerous arrival');
  if(f.arena){const a=f.arena;for(let y=a.y0;y<a.y1;y++)for(let x=a.x0;x<a.x1;x++)ok(!m.blocked[x+y*m.w]&&!m.hazard[x+y*m.w]&&!m.elev[x+y*m.w],label+' arena obstruction');}
  if(zone==='hollow_reeds')ok(m.monsterSpawns.length>=15&&m.monsterSpawns.some(s=>s.id==='choir_herald'&&s.landmarkId==='shrine'),label+' Songless staging');
  if(zone==='spawn_pools')ok(m.monsterSpawns.filter(s=>s.id==='brood_mother').length===1,label+' duplicate Brood Mother');
  ok(f.routes.length>=f.landmarks.length,label+' no exploration loop');
  const hash=signature(m);hashes.add(hash);ok(hash===signature(M.generate(zone,seed)),label+' nondeterministic');
  rows.push({seed,reachable,furthest,enemies:m.monsterSpawns.length,before:{reachable:br.reachable,furthest:br.furthest,enemies:b.monsterSpawns.length}});
 }
 ok(hashes.size===seeds.length,zone+' no seed variation');
 const median=a=>a.toSorted((a,b)=>a-b)[Math.floor(a.length/2)],metrics={};
 for(const key of ['furthest','enemies']){const old=median(rows.map(r=>r.before[key])),now=median(rows.map(r=>r[key]));metrics[key]={before:old,after:now,ratio:now/old};ok(now>=old*.8&&now<=old*1.2,zone+' pacing budget '+key);}
 reports.push({zone,metrics,seeds:rows});
}
for(const zone of ['frosthaven','marshcamp','north_wild','mines','shattered_temple','khalcamp','sand_tombs'])ok(!M.generate(zone,123).act2,'Act 2 leaked into '+zone);
const report={status:'PASS',checks,seedCount:seeds.length,reports};
if(process.argv.includes('--record'))fs.writeFileSync(new URL('qa/act2_redesign/layout.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:'PASS',checks,seedCount:seeds.length,areas:reports.map(r=>({zone:r.zone,...r.metrics}))},null,2));
