import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const ctx=vm.createContext({console,Math,performance,Uint8Array,Int32Array,Uint8ClampedArray,
  document:{createElement:()=>({getContext:()=>({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){}})})}});
for(const name of ['utils','data','data_overrides','boss_encounters','sprite_manifest','mapgen','navigation'])
  vm.runInContext(fs.readFileSync(new URL('../js/'+name+'.js',import.meta.url),'utf8'),ctx);
const {MapGen:M,TerrainSurface:S,TerrainNavigation:N}=vm.runInContext('({MapGen,TerrainSurface,TerrainNavigation})',ctx);
const zones=['north_wild','mines','shattered_temple','shardpeak_shrine','deepfreeze_cavern'];
const seeds=[0,1,123,12345,4294967295,...Array.from({length:25},(_,i)=>Math.imul(i+37,2654435761)>>>0)];
let checks=0;const ok=(v,msg)=>{checks++;assert.ok(v,msg);},reports=[];
const signature=m=>crypto.createHash('sha256').update(JSON.stringify({w:m.w,h:m.h,walls:[...m.walls],floor:[...m.floor],elev:[...m.elev],ramps:m.ramps,frontier:m.frontier,props:m.props,spawns:m.spawns,npcs:m.npcs,enemies:m.monsterSpawns})).digest('hex');
for(const zone of zones){
 const hashes=new Set(),rows=[];
 for(const seed of seeds){
  const m=M.generate(zone,seed),f=m.frontier,sp=m.spawns.default,seen=new Uint8Array(m.w*m.h),queue=[(sp.x|0)+(sp.y|0)*m.w];seen[queue[0]]=1;
  for(let q=0;q<queue.length;q++){
   const i=queue[q],x=i%m.w,y=Math.floor(i/m.w);
   for(const [dx,dy] of S.directions){const nx=x+dx,ny=y+dy,j=nx+ny*m.w;
    if(nx<0||ny<0||nx>=m.w||ny>=m.h||seen[j]||m.blocked[j]||!S.connected(m,x,y,nx,ny))continue;
    seen[j]=1;queue.push(j);
   }
  }
  const label=zone+'/'+seed;
  ok(m.w===(zone==='north_wild'?160:128)&&m.h===m.w,label+' dimensions');
  ok(f.routes.length>=f.landmarks.length,label+' reconnecting loop absent');
  for(const n of f.landmarks){
   ok(n.entrances.length>0,label+' landmark has no entrances');
   for(const p of n.entrances)ok(S.supported(m,p.x,p.y,.36),label+' template entrance blocked');
   const a=n.combatSpace;
   for(let y=Math.ceil(a.y0);y<a.y1;y++)for(let x=Math.ceil(a.x0);x<a.x1;x++)ok(!m.blocked[x+y*m.w],label+'/'+n.id+' central combat space blocked at '+x+','+y);
  }
  ok(m.props.some(p=>p.lootable&&p.landmarkId),label+' reward branch absent');
  const targets=[...Object.values(m.spawns),...m.exits.map(e=>({x:(e.x0+e.x1)/2,y:(e.y0+e.y1)/2})),
   ...m.props.filter(p=>p.interact||p.lootable),...m.npcs,...f.landmarks,...f.anchors.beacons,...f.anchors.events,...m.monsterSpawns];
  for(const p of targets){
   ok(seen[(p.x|0)+(p.y|0)*m.w]&&S.supported(m,p.x,p.y,.36),label+' unreachable '+JSON.stringify(p));
  }
  for(const ramp of m.ramps){
   ok(ramp.width>=3,label+' narrow ramp');
   for(let w=-Math.floor(ramp.width/2);w<=Math.floor(ramp.width/2);w++){
    const a={x:ramp.x-ramp.dx+.5+(ramp.dy?w:0),y:ramp.y-ramp.dy+.5+(ramp.dx?w:0)},
     b={x:ramp.x+ramp.dx*ramp.length+.5+(ramp.dy?w:0),y:ramp.y+ramp.dy*ramp.length+.5+(ramp.dx?w:0)};
    ok(N.segment(m,a.x,a.y,b.x,b.y,.36),label+' ramp lane obstructed');
   }
  }
  for(const p of m.buildings){const a=p.footprint;
   for(let y=a.y0;y<a.y1;y++)for(let x=a.x0;x<a.x1;x++)ok(!!m.blocked[x+y*m.w],label+' landmark footprint hole');
  }
  for(const p of f.scenery){const a=p.footprint;
   for(let y=a.y0;y<a.y1;y++)for(let x=a.x0;x<a.x1;x++)ok(!!m.walls[x+y*m.w]&&!!m.blocked[x+y*m.w],label+' scenery base is playable');
  }
  if(zone==='north_wild')ok(new Set(f.anchors.beacons.map(a=>a.id)).size===3,label+' three stable beacons');
  if(zone==='mines')ok(m.npcs.map(n=>n.sid).sort().join(',')==='mines_surv_0,mines_surv_1,mines_surv_2',label+' survivor compatibility');
  if(zone==='shardpeak_shrine')ok(m.monsterSpawns.length>=15,label+' optional quest cannot finish');
  if(zone==='deepfreeze_cavern'){
   const boss=m.monsterSpawns.find(s=>s.id==='hoarfang');ok(boss&&m.hazard[(boss.x|0)+(boss.y|0)*m.w],label+' spring not beneath Hoarfang');
  }
  if(m.bossArena){const a=m.bossArena;
   for(let y=a.y0;y<a.y1;y++)for(let x=a.x0;x<a.x1;x++)ok(!m.blocked[x+y*m.w]&&!m.hazard[x+y*m.w]&&!m.elev[x+y*m.w],label+' boss floor obstructed');
  }
  const hash=signature(m);hashes.add(hash);ok(hash===signature(M.generate(zone,seed)),label+' nondeterministic');
  rows.push({seed,reachable:queue.length,monsters:m.monsterSpawns.length,buildings:m.buildings.length,ramps:m.ramps.length});
 }
 ok(hashes.size===seeds.length,zone+' seeds do not vary');reports.push({zone,seeds:rows});
}
// Generated coordinates may change; progression identifiers and untouched areas do not.
for(const zone of ['frosthaven','frosthaven_approach','fields','weeping_marsh'])ok(!M.generate(zone,123).frontier,'composition leaked into '+zone);
const report={status:'PASS',checks,seedCount:seeds.length,reports};
if(process.argv.includes('--record')){fs.mkdirSync('tests/qa/frontier',{recursive:true});fs.writeFileSync('tests/qa/frontier/layout.json',JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({status:report.status,checks,seedCount:seeds.length,areas:reports.map(r=>({zone:r.zone,minMonsters:Math.min(...r.seeds.map(s=>s.monsters)),minBuildings:Math.min(...r.seeds.map(s=>s.buildings)),maxBuildings:Math.max(...r.seeds.map(s=>s.buildings))}))},null,2));
