'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {spawn}=require('node:child_process');
const path=require('node:path');
const seedCount=Number(process.argv.find(a=>a.startsWith('--seeds='))?.split('=')[1]||100);
const selected=process.argv.find(a=>a.startsWith('--zone='))?.split('=')[1];
const ctx=vm.createContext({console,Math,performance,document:{createElement:()=>({getContext:()=>({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){}})})}});
for(const name of ['utils','data','data_overrides','boss_encounters','sprite_manifest','prop_interactions','mapgen','navigation'])vm.runInContext(fs.readFileSync('js/'+name+'.js','utf8'),ctx);
const {M,D,N,S}=vm.runInContext('({M:MapGen,D:DATA,N:TerrainNavigation,S:TerrainSurface})',ctx);
const zones=Object.values(D.ZONES).filter(z=>!z.arena&&!z.opening&&!['town','camp'].includes(z.kind)).map(z=>z.id);
const seeds=[0,1,123,12345,4294967295,...Array.from({length:Math.max(0,seedCount-5)},(_,i)=>Math.imul(i+37,2654435761)>>>0)].slice(0,seedCount);
const geometry=m=>crypto.createHash('sha256').update(Buffer.from(m.act2?.water||m.walls)).update(Buffer.from(m.elev)).update(m.void?Buffer.from(m.void):'').update(JSON.stringify(m.ramps||[])).digest('hex');
const contents=m=>crypto.createHash('sha256').update(geometry(m)).update(JSON.stringify({props:m.props,spawns:m.spawns,npcs:m.npcs,enemies:m.monsterSpawns,exits:m.exits})).digest('hex');
function feature(m){return m.frontier||m.act2||m.act3||m.cathedral||m.composition;}
function graph(m){
 const f=feature(m);if(f)return JSON.stringify((f.routes||f.connections||[]).map(r=>[r.from,r.to].sort()).sort());
 // Legacy generators expose grids. Compare coarse walking channels, never
 // floor variation, random prop identifiers or seed metadata.
 const cells=[];
 for(let y=0;y<m.h;y+=8)for(let x=0;x<m.w;x+=8){let open=0,total=0;
  for(let dy=0;dy<8&&y+dy<m.h;dy++)for(let dx=0;dx<8&&x+dx<m.w;dx++){total++;open+=!m.walls[x+dx+(y+dy)*m.w];}
  cells.push(open/total>.35?1:0);
 }return cells.join('');
}
function reachable(m){
 const p=m.spawns.default,seen=new Uint8Array(m.w*m.h),queue=[(p.x|0)+(p.y|0)*m.w];seen[queue[0]]=1;
 for(let k=0;k<queue.length;k++){const i=queue[k],x=i%m.w,y=Math.floor(i/m.w);
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,j=nx+ny*m.w;
   if(nx<0||ny<0||nx>=m.w||ny>=m.h||seen[j]||!M.canStep(m,x,y,nx,ny))continue;seen[j]=1;queue.push(j);
  }
 }return seen;
}
async function audit(zone){
 let checks=0,fallbacks=0,attempts=0;const hashes=new Set(),graphs=new Set(),positions=new Map(),times=[];
 const ok=(value,label)=>{checks++;assert.ok(value,zone+': '+label);};
 let baseline,width;
 for(const seed of seeds){
  const start=performance.now(),m=M.generate(zone,seed);times.push(performance.now()-start);width=m.w;
  const f=feature(m),seen=reachable(m),tag=seed+' ',targets=[...Object.values(m.spawns),...(f?.landmarks||f?.rooms||[]),...m.npcs,...m.monsterSpawns,
   ...m.props.filter(p=>(p.interact||p.lootable||p.storyId)&&!p.blocks),...m.exits.map(e=>({x:(e.x0+e.x1)/2,y:(e.y0+e.y1)/2})),
   ...(m.thresholds||[]).flatMap(t=>[t.approach,t.arrival].filter(Boolean))];
  for(const p of targets)ok(seen[(p.x|0)+(p.y|0)*m.w]&&N.clear(m,p.x,p.y,.36)&&(!m.surfaceVersion||S.supported(m,p.x,p.y,.36)),tag+'unreachable '+(p.id||p.type||'arrival')+' '+p.x+','+p.y);
  for(const p of Object.values(m.spawns))ok(!m.hazard[(p.x|0)+(p.y|0)*m.w],tag+'dangerous arrival');
  if(m.act2)for(let i=0;i<m.act2.water.length;i++)if(m.act2.water[i])ok(m.blocked[i]&&!m.hazard[i],tag+'scenic water must block walking');
  for(const p of m.monsterSpawns){const radius=.34*(D.ENEMIES[p.id].big||1)*(p.elite?1.18:1);ok(N.clear(m,p.x,p.y,radius)&&(!m.surfaceVersion||S.supported(m,p.x,p.y,radius)),tag+'unsupported enemy footprint '+p.id);}
  for(const route of f?.routes||f?.connections||[])for(let k=1;k<route.points.length;k++){
   const a=route.points[k-1],b=route.points[k];ok(N.segment(m,a.x,a.y,b.x,b.y,.36),tag+'blocked route '+route.from+'/'+route.to);
  }
  for(const ramp of m.ramps||[])for(let lane=-Math.floor(ramp.width/2);lane<=Math.floor(ramp.width/2);lane++){
   const a={x:ramp.x-ramp.dx+.5+(ramp.dy?lane:0),y:ramp.y-ramp.dy+.5+(ramp.dx?lane:0)},
    b={x:ramp.x+ramp.dx*ramp.length+.5+(ramp.dy?lane:0),y:ramp.y+ramp.dy*ramp.length+.5+(ramp.dx?lane:0)};
   ok(N.segment(m,a.x,a.y,b.x,b.y,.36),tag+'blocked ramp lane');
  }
  const identity=JSON.stringify({w:m.w,h:m.h,exits:m.exits.map(e=>[e.target,e.spawnKey]).sort(),spawns:Object.keys(m.spawns).sort(),story:m.props.filter(p=>p.storyId).map(p=>p.storyId).sort(),survivors:m.npcs.filter(p=>p.sid).map(p=>p.sid).sort()});
  baseline??=identity;ok(identity===baseline,tag+'progression identity changed');
  ok(m.layoutSeed===seed&&m.layoutVersion===M.layoutVersion&&m.layoutAttempts<=9,tag+'generation metadata');
  const hash=geometry(m);hashes.add(hash);graphs.add(graph(m));
  ok(contents(m)===contents(M.generate(zone,seed)),tag+'nondeterministic generation');
  fallbacks+=m.layoutFallback;attempts+=m.layoutAttempts;
  for(const p of f?.landmarks||f?.rooms||[]){const rows=positions.get(p.id)||[];rows.push(p);positions.set(p.id,rows);}
 }
 ok(hashes.size===seeds.length,'geometry repeated between seeds');
 ok(graphs.size>=Math.min(3,seeds.length),'room connections/walking channels do not vary');
 if(positions.size&&seeds.length>=20){let moved=0;for(const rows of positions.values()){
   const dx=Math.max(...rows.map(p=>p.x))-Math.min(...rows.map(p=>p.x)),dy=Math.max(...rows.map(p=>p.y))-Math.min(...rows.map(p=>p.y));
   if(Math.max(dx,dy)>width*.2)moved++;
  }ok(moved>=Math.ceil(positions.size/2),'landmarks only receive small offsets');
 }
 const sorted=times.slice().sort((a,b)=>a-b);
 const row={zone,seeds:seeds.length,checks,geometryVariants:hashes.size,graphVariants:graphs.size,fallbacks,meanAttempts:attempts/seeds.length,medianMs:+sorted[Math.floor(sorted.length/2)].toFixed(1),p95Ms:+sorted[Math.floor(sorted.length*.95)].toFixed(1)};
 console.log(JSON.stringify(row));return row;
}
if(selected){audit(selected).catch(e=>{console.error(e.stack);process.exitCode=1;});}
else{
 const pending=[...zones],rows=[];let failed=false;
 async function worker(){while(pending.length&&!failed){const zone=pending.shift();await new Promise((resolve,reject)=>{
   const child=spawn(process.execPath,['--preserve-symlinks','--preserve-symlinks-main',__filename,'--zone='+zone,'--seeds='+seedCount],{cwd:process.cwd(),stdio:['ignore','pipe','pipe']});
   let stdout='',stderr='';child.stdout.on('data',s=>stdout+=s);child.stderr.on('data',s=>stderr+=s);
   child.on('error',reject);child.on('exit',code=>{if(code){failed=true;reject(Error(zone+' '+stderr));}else{const row=JSON.parse(stdout.trim());rows.push(row);console.log('PASS '+zone+' · '+row.seeds+' seeds · '+row.graphVariants+' route configurations · '+row.fallbacks+' fallbacks');resolve();}});
  });}}
 Promise.all(Array.from({length:4},worker)).then(()=>{
   const report={status:'PASS',seedCount,zones:rows.sort((a,b)=>zones.indexOf(a.zone)-zones.indexOf(b.zone)),checks:rows.reduce((n,r)=>n+r.checks,0)};
   const dir=path.resolve('tmp/random_maps');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'contract.json'),JSON.stringify(report,null,2)+'\n');console.log('PASS '+rows.length+' areas / '+report.checks+' checks');
 }).catch(e=>{console.error(e.stack);process.exitCode=1;});
}
