import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const context=vm.createContext({console,Math,performance,Uint8Array,Int32Array,Uint8ClampedArray,
  document:{createElement:()=>({getContext:()=>({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){}})})}});
for(const name of ['utils','data','data_overrides','boss_encounters','sprite_manifest','mapgen','navigation'])
  vm.runInContext(fs.readFileSync(new URL('../js/'+name+'.js',import.meta.url),'utf8'),context);
const {MapGen:M,TerrainNavigation:N,DATA:D}=vm.runInContext('({MapGen,TerrainNavigation,DATA})',context);
const zones=['cathedral1','cathedral2','cathedral_cinderwatch','cathedral_bastion'];
const seeds=[0,1,12345,4294967295,...Array.from({length:96},(_,i)=>Math.imul(i+37,2654435761)>>>0)];
let checks=0;const ok=(value,message)=>{checks++;assert.ok(value,message);};const reports=[];
const signature=m=>crypto.createHash('sha256').update(JSON.stringify({c:m.cathedral,props:m.props,spawns:m.spawns,monsters:m.monsterSpawns,blocked:[...m.blocked]})).digest('hex');
for(const zone of zones){
  const variants=new Set(),hashes=new Set(),rows=[];
  for(const seed of seeds){
    const m=M.generate(zone,seed),label=zone+'/'+seed,c=m.cathedral,sp=m.spawns.default;
    ok(m.w===(D.ZONES[zone].memoryParent?72:112)&&m.h===m.w,label+' dimensions');
    const seen=new Uint8Array(m.w*m.h),queue=[(sp.x|0)+(sp.y|0)*m.w];seen[queue[0]]=1;
    for(let q=0;q<queue.length;q++){
      const k=queue[q],x=k%m.w,y=Math.floor(k/m.w);
      for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+dx,yy=y+dy,j=xx+yy*m.w;
        if(xx<0||yy<0||xx>=m.w||yy>=m.h||seen[j]||!M.canStep(m,x+.5,y+.5,xx+.5,yy+.5))continue;seen[j]=1;queue.push(j);
      }
    }
    for(let k=0;k<m.void.length;k++)if(m.void[k])ok(m.blocked[k]&&m.walls[k],label+' traversable void');
    const targets=[...c.rooms,...Object.values(m.spawns),...Object.values(c.anchors),...m.monsterSpawns,
      ...m.props.filter(p=>p.interact||p.lootable),...m.npcs,...m.exits.map(e=>({x:(e.x0+e.x1)/2,y:(e.y0+e.y1)/2}))];
    for(const p of targets){ok(seen[(p.x|0)+(p.y|0)*m.w],label+' unreachable '+JSON.stringify(p));ok(N.clear(m,p.x,p.y,.36),label+' insufficient actor clearance '+JSON.stringify(p));}
    ok(c.connections.length>=c.rooms.length,label+' no loop');
    const landmarkRooms=zone==='cathedral1'?['nave','cinderwatch','bastion','karrhal','sanctuary']:zone==='cathedral2'?['ritual_0','ritual_1','ritual_2','bastion','sanctuary']:['approach','memory','flank','sanctuary'];
    for(const id of landmarkRooms){const n=c.rooms.find(n=>n.id===id);ok(n.landmark&&m.props.some(p=>p.type===n.landmark.type&&p.x===n.landmark.x&&p.y===n.landmark.y),label+' missing landmark '+id);}
    for(const connection of c.connections){
      ok(connection.width>=3,label+' narrow bridge');
      for(let j=1;j<connection.points.length;j++){
        const a=connection.points[j-1],b=connection.points[j],steps=Math.max(Math.abs(b.x-a.x),Math.abs(b.y-a.y));
        for(let k=0;k<=steps;k++){
          const x=Math.round(a.x+(b.x-a.x)*k/Math.max(1,steps)),y=Math.round(a.y+(b.y-a.y)*k/Math.max(1,steps));
          for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)ok(!m.blocked[x+dx+(y+dy)*m.w],label+' obstructed three-tile route '+connection.from+'/'+connection.to);
        }
      }
    }
    for(const exit of m.exits){
      const th=m.thresholds.find(t=>t.id===exit.thresholdId);ok(th,label+' missing passage geometry');
      const gx=Math.floor(th.opening.x),gy=Math.floor(th.opening.y);
      for(let dy=-2;dy<=4;dy++)for(let dx=-1;dx<=1;dx++)ok(!m.blocked[gx+dx+(gy+dy)*m.w],label+' blocked passage');
      for(const p of [th.approach,th.arrival])ok(N.clear(m,p.x,p.y,.36)&&seen[(p.x|0)+(p.y|0)*m.w],label+' inaccessible passage approach');
      for(const f of th.footprints)for(let y=f.y0;y<f.y1;y++)for(let x=f.x0;x<f.x1;x++)ok(m.blocked[x+y*m.w],label+' passage flank has no collision');
      const destination=M.generate(exit.target,seed);ok(destination.spawns[exit.spawnKey],label+' unresolved travel spawn '+exit.target+'/'+exit.spawnKey);
      const spawn=Object.values(m.spawns).find(p=>Math.abs(p.x-(exit.x0+exit.x1)/2)<.1&&p.y>exit.y1);
      ok(spawn,label+' missing safe return apron');
    }
    const env=c.environment;ok(env?.segments.length>0,label+' no painted boundary');
    for(const s of env.segments){
      ok(s.length>0&&s.length<=6,label+' invalid boundary span');
      for(let t=0;t<s.length;t++){
        const x=s.x+(s.axis?0:t),y=s.y+(s.axis?t:0),a=m.void[x+y*m.w],b=m.void[x-(s.axis?1:0)+(y-(s.axis?0:1))*m.w];
        ok(a!==b,label+' boundary does not follow void contour');
      }
      if(s.kit==='ash'||s.role==='bridge')ok(!s.wall,label+' outdoor edge enclosed by wall');
    }
    if(m.bossArena){const a=m.bossArena;ok(a.x1-a.x0===21&&a.y1-a.y0===21,label+' boss size');
      for(let y=a.y0;y<a.y1;y++)for(let x=a.x0;x<a.x1;x++)ok(!m.blocked[x+y*m.w]&&!m.void[x+y*m.w]&&!m.elev[x+y*m.w]&&!m.hazard[x+y*m.w],label+' obstructed arena');
    }else{ok(m.monsterSpawns.length===20,label+' staged encounter population');ok(m.monsterSpawns.filter(p=>p.cathedralEncounter==='memory_guard').length===5,label+' cache guardians');}
    for(const p of m.buildings||[]){const a=p.footprint;for(let y=a.y0;y<a.y1;y++)for(let x=a.x0;x<a.x1;x++)ok(m.blocked[x+y*m.w],label+' architectural footprint hole');}
    for(const obj of D.STORY_OBJECTS[zone]||[])ok(c.anchors[obj.id],label+' missing authored objective '+obj.id);
    const hash=signature(m);ok(hash===signature(M.generate(zone,seed)),label+' non-deterministic');variants.add(c.variant);hashes.add(hash);
    rows.push({seed,variant:c.variant,reachable:queue.length,enemies:m.monsterSpawns.length});
  }
  ok(variants.size===(D.ZONES[zone].memoryParent?2:3),zone+' missing arrangement');ok(hashes.size===seeds.length,zone+' seed variation');reports.push({zone,rows});
}
const report={status:'PASS',checks,seedsPerZone:100,zones:reports};
if(process.argv.includes('--record'))fs.writeFileSync(new URL('./qa/cathedral/layout.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:'PASS',checks,seedsPerZone:100,zones},null,2));
