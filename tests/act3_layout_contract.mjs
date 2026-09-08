import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const ctx=vm.createContext({console,Math,performance,Uint8Array,Int32Array,Uint8ClampedArray,
  document:{createElement:()=>({getContext:()=>({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){}})})}});
for(const name of ['utils','data','data_overrides','boss_encounters','mapgen','navigation'])
  vm.runInContext(fs.readFileSync(new URL('../js/'+name+'.js',import.meta.url),'utf8'),ctx);
const {MapGen:M,TerrainSurface:S,TerrainNavigation:N,DATA:D}=vm.runInContext('({MapGen,TerrainSurface,TerrainNavigation,DATA})',ctx);
const zones=['khalcamp','desert_wastes','underground_market','sand_tombs','khal_palace','shard_flats','tomb_sanctum'];
const seeds=[0,1,123,12345,4294967295,...Array.from({length:25},(_,i)=>Math.imul(i+37,2654435761)>>>0)];
let checks=0;const ok=(v,msg)=>{checks++;assert.ok(v,msg);},reports=[];
const signature=m=>crypto.createHash('sha256').update(JSON.stringify({walls:[...m.walls],floor:[...m.floor],elev:[...m.elev],ramps:m.ramps,act3:m.act3,props:m.props,spawns:m.spawns,enemies:m.monsterSpawns})).digest('hex');
for(const zone of zones){const rows=[],hashes=new Set();
 for(const seed of seeds){
  const m=M.generate(zone,seed),f=m.act3,sp=m.spawns.default,seen=new Uint8Array(m.w*m.h),queue=[(sp.x|0)+(sp.y|0)*m.w];seen[queue[0]]=1;
  for(let q=0;q<queue.length;q++){const i=queue[q],x=i%m.w,y=Math.floor(i/m.w);
   for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,j=nx+ny*m.w;
    if(nx<0||ny<0||nx>=m.w||ny>=m.h||seen[j]||m.blocked[j]||!M.canStep(m,x+.5,y+.5,nx+.5,ny+.5))continue;
    seen[j]=1;queue.push(j);
   }
  }
  const label=zone+'/'+seed;
  ok(m.w===(zone==='khalcamp'?36:zone==='desert_wastes'?164:128),label+' dimensions');
  const reachable=p=>seen[(p.x|0)+(p.y|0)*m.w]&&N.clear(m,p.x,p.y,.36);
  const targets=[...Object.values(m.spawns),...m.exits.map(e=>({x:(e.x0+e.x1)/2,y:(e.y0+e.y1)/2})),
   ...m.props.filter(p=>(p.interact||p.lootable)&&!p.blocks),...m.npcs.filter(p=>p.storyId),...f.landmarks,...Object.values(f.anchors.story),...f.anchors.events,...m.monsterSpawns];
  for(const p of targets)ok(reachable(p),label+' unreachable '+JSON.stringify(p));
  for(const p of Object.values(m.spawns))ok(!m.hazard[(p.x|0)+(p.y|0)*m.w],label+' hazardous arrival');
  for(const e of m.exits){const other=M.generate(e.target,seed);ok(!!other.spawns[e.spawnKey],label+' missing return spawn '+e.target+'/'+e.spawnKey);}
  if(zone!=='khalcamp'){
   ok(f.routes.length>=f.landmarks.length,label+' reconnecting route absent');
   ok(m.props.some(p=>p.lootable&&p.landmarkId),label+' optional reward absent');
   for(const p of m.buildings)for(const a of p.footprints||[p.footprint])for(let y=a.y0;y<a.y1;y++)for(let x=a.x0;x<a.x1;x++)ok(!!m.blocked[x+y*m.w],label+' footprint hole');
   for(const n of f.landmarks)for(let y=Math.ceil(n.combatSpace.y0);y<n.combatSpace.y1;y++)for(let x=Math.ceil(n.combatSpace.x0);x<n.combatSpace.x1;x++)ok(!m.blocked[x+y*m.w],label+'/'+n.id+' combat center blocked');
   for(const r of m.ramps){ok(r.width>=5&&r.width%2===1,label+' ramp width');for(let w=-(r.width-1)/2;w<=(r.width-1)/2;w++){
    const a={x:r.x-r.dx+.5+(r.dy?w:0),y:r.y-r.dy+.5+(r.dx?w:0)},b={x:r.x+r.dx*r.length+.5+(r.dy?w:0),y:r.y+r.dy*r.length+.5+(r.dx?w:0)};
    ok(N.segment(m,a.x,a.y,b.x,b.y,.36),label+' ramp lane obstructed');
   }}
  }
  if(m.bossArena){const a=m.bossArena;ok(a.x1-a.x0===21&&a.y1-a.y0===21,label+' arena dimensions');
   for(let y=a.y0;y<a.y1;y++)for(let x=a.x0;x<a.x1;x++)ok(!m.blocked[x+y*m.w]&&!m.hazard[x+y*m.w]&&!m.elev[x+y*m.w],label+' boss floor obstructed');
  }
  for(const obj of D.STORY_OBJECTS[zone]||[]){const p=[...m.props,...m.npcs].find(p=>p.storyId===obj.id),a=f.anchors.story[obj.id];ok(p&&p.x===a.x&&p.y===a.y,label+' story anchor '+obj.id);}
  if(zone==='underground_market')ok(m.monsterSpawns.filter(p=>p.id==='gilt_construct').length>=6,label+' missing relay guards');
  for(const [id,guards] of Object.entries(f.anchors.guards||{}))for(const [j,a] of guards.entries()){
   const p=m.monsterSpawns.find(p=>p.storyGuardId===id+'_'+j);ok(p&&p.x===a.x&&p.y===a.y,label+' explicit guard anchor');
   ok(N.clear(m,p.x,p.y,.34*(D.ENEMIES[p.id].big||1)),label+' guard footprint');
  }
  if(zone==='shard_flats')ok(m.monsterSpawns.length>=15,label+' kill quest impossible');
  const hash=signature(m);hashes.add(hash);ok(hash===signature(M.generate(zone,seed)),label+' nondeterministic');
  rows.push({seed,reachable:queue.length,enemies:m.monsterSpawns.length,ramps:m.ramps?.length||0});
 }
 if(zone!=='khalcamp')ok(hashes.size===seeds.length,zone+' seeds do not vary');reports.push({zone,seeds:rows});
}
const report={status:'PASS',checks,seedCount:seeds.length,reports};
if(process.argv.includes('--record')){fs.mkdirSync('tests/qa/act3',{recursive:true});fs.writeFileSync('tests/qa/act3/layout.json',JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({status:report.status,checks,seedCount:seeds.length,areas:reports.map(r=>({zone:r.zone,minEnemies:Math.min(...r.seeds.map(s=>s.enemies)),maxEnemies:Math.max(...r.seeds.map(s=>s.enemies))}))},null,2));
