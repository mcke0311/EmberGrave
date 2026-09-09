import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const ctx=vm.createContext({console,Math,performance,Uint8Array,Int32Array,Uint8ClampedArray,
 document:{createElement:()=>({getContext:()=>({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){}})})}});
for(const name of ['utils','data','data_overrides','boss_encounters','sprite_manifest','mapgen','navigation'])
 vm.runInContext(fs.readFileSync(new URL('../js/'+name+'.js',import.meta.url),'utf8'),ctx);
const {MapGen:M,TerrainSurface:S,TerrainNavigation:N}=vm.runInContext('({MapGen,TerrainSurface,TerrainNavigation})',ctx);
const seeds=[0,1,123,12345,4294967295,...Array.from({length:25},(_,i)=>Math.imul(i+37,2654435761)>>>0)];
let checks=0;const ok=(v,msg)=>{checks++;assert.ok(v,msg);},reports=[];
const hash=m=>crypto.createHash('sha256').update(JSON.stringify({floor:[...m.floor],walls:[...m.walls],blocked:[...m.blocked],elev:[...m.elev],hazard:[...m.hazard],props:m.props,spawns:m.spawns,exits:m.exits,composition:m.composition,enemies:m.monsterSpawns})).digest('hex');
for(const [zone,budget] of [['ash_wastes',96],['cinder_bastion',120],['throne',36]]){
 const hashes=new Set(),rows=[];
 for(const seed of seeds){
  const m=M.generate(zone,seed),f=m.composition,sp=m.spawns.default,label=zone+'/'+seed;
  const seen=new Uint8Array(m.w*m.h),queue=[(sp.x|0)+(sp.y|0)*m.w];seen[queue[0]]=1;
  for(let k=0;k<queue.length;k++){
   const i=queue[k],x=i%m.w,y=Math.floor(i/m.w);
   for(const [dx,dy] of S.directions){const nx=x+dx,ny=y+dy,j=nx+ny*m.w;
    if(nx<0||ny<0||nx>=m.w||ny>=m.h||seen[j]||m.blocked[j]||m.hazard[j]||!S.connected(m,x,y,nx,ny))continue;
    seen[j]=1;queue.push(j);
   }
  }
  ok(m.w===(zone==='ash_wastes'?164:128)&&m.w===m.h,label+' dimensions');
  const order={ash_wastes:['entry','siege','crossing','crossroads','monument','forecourt','bastion'],cinder_bastion:['entry','muster','furnace','battlement','command','treasury'],throne:['entry','kings','guard','causeway','boss']}[zone];
  ok(JSON.stringify(f.landmarks.map(n=>n.id))===JSON.stringify(order),label+' landmark order changed');
  for(const p of Object.values(m.spawns)){
   ok(S.supported(m,p.x,p.y,1),label+' arrival has no walking pocket');
   ok(m.monsterSpawns.every(n=>Math.hypot(n.x-p.x,n.y-p.y)>=3.5),label+' arrival has an immediate enemy');
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)ok(!m.hazard[(p.x+dx|0)+(p.y+dy|0)*m.w],label+' arrival hazard');
  }
  const count=m.monsterSpawns.filter(p=>!p.boss).length;ok(count>=budget&&count<=budget+4,label+' encounter budget');
  const targets=[...Object.values(m.spawns),...m.exits.map(e=>({x:(e.x0+e.x1)/2,y:(e.y0+e.y1)/2})),...m.props.filter(p=>p.interact||p.lootable),...f.landmarks,...f.anchors.events,...m.monsterSpawns];
  if(m.bossArena)targets.push(m.bossArena.approach);
  for(const p of targets)ok(seen[(p.x|0)+(p.y|0)*m.w]&&S.supported(m,p.x,p.y,.36),label+' unreachable '+JSON.stringify(p));
  for(const n of f.landmarks){const a=n.combatSpace;for(let y=Math.ceil(a.y0);y<a.y1;y++)for(let x=Math.ceil(a.x0);x<a.x1;x++)ok(!m.blocked[x+y*m.w]&&!m.hazard[x+y*m.w],label+'/'+n.id+' combat obstruction '+x+','+y);}
  for(const ro of f.routes)for(let i=1;i<ro.points.length;i++){
   const a=ro.points[i-1],b=ro.points[i],vertical=a.x===b.x;
   for(let lane=-2;lane<=2;lane++){
    const ax=a.x+(vertical?lane:0),ay=a.y+(vertical?0:lane),bx=b.x+(vertical?lane:0),by=b.y+(vertical?0:lane);
    ok(N.segment(m,ax,ay,bx,by,.36),label+' route lane obstructed '+ro.from+'→'+ro.to+'/'+lane);
   }
  }
  for(const ramp of m.ramps){ok(ramp.width>=5,label+' narrow ramp');for(let w=-2;w<=2;w++)ok(N.segment(m,ramp.x+w+.5,ramp.y-.5,ramp.x+w+.5,ramp.y+ramp.length+.5,.36),label+' blocked ramp');}
  for(const b of m.buildings){const a=b.footprint;for(let y=a.y0;y<a.y1;y++)for(let x=a.x0;x<a.x1;x++)ok(!!m.blocked[x+y*m.w],label+' footprint hole');}
  for(const e of m.exits){const t=m.thresholds.find(t=>t.id===e.thresholdId),g=m.props.find(p=>p.gate&&p.thresholdId===e.thresholdId);ok(g&&g.footprints.length===2&&t,label+' unregistered gate');ok(N.segment(m,t.arrival.x,t.arrival.y,t.opening.x,t.opening.y,.36),label+' blocked threshold');}
  if(m.bossArena){const a=m.bossArena;ok(a.x1-a.x0===21&&a.y1-a.y0===21,label+' boss arena dimensions');for(let y=a.y0;y<a.y1;y++)for(let x=a.x0;x<a.x1;x++)ok(!m.blocked[x+y*m.w]&&!m.hazard[x+y*m.w]&&!m.elev[x+y*m.w],label+' boss floor obstructed');}
  const signature=hash(m);hashes.add(signature);ok(signature===hash(M.generate(zone,seed)),label+' nondeterministic');
  rows.push({seed,reachable:queue.length,enemies:count,ramps:m.ramps.length,landmarks:f.landmarks.length});
 }
 ok(hashes.size===seeds.length,zone+' seeds do not vary');reports.push({zone,seeds:rows});
}
const report={status:'PASS',checks,seedCount:seeds.length,reports};
if(process.argv.includes('--record')){fs.mkdirSync('tests/qa/cinders',{recursive:true});fs.writeFileSync('tests/qa/cinders/layout.json',JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({status:'PASS',checks,seedCount:seeds.length,zones:reports.map(r=>r.zone)},null,2));
