import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
globalThis.document={createElement:()=>({getContext:()=>({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){}})})};
for(const file of ['utils','data','data_overrides','sprite_manifest','mapgen'])vm.runInThisContext(fs.readFileSync(new URL('../js/'+file+'.js',import.meta.url),'utf8'));
const {MapGen,U,DATA}=vm.runInThisContext('({MapGen,U,DATA})');
const towns=['town','frosthaven','marshcamp','khalcamp','hellgate'];let checks=0;
const ok=(v,msg)=>{checks++;assert.ok(v,msg)};
for(const seed of [0,1,123,4294967295])for(const id of towns){
 const m=MapGen.generate(id,seed),walk=(x,y)=>MapGen.walkable(m,x,y);
 const start=m.spawns.default,visited=new Set(),queue=[[start.x|0,start.y|0]];
 for(let k=0;k<queue.length;k++){const [x,y]=queue[k],i=x+y*m.w;if(visited.has(i))continue;visited.add(i);for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]])if(walk(x+dx,y+dy)&&!visited.has(x+dx+(y+dy)*m.w))queue.push([x+dx,y+dy]);}
 ok(m.settlement.revision===3,id+' revision');
 ok(!m.props.some(p=>p.type==='lantern'),id+' old lantern remains');
 ok(m.settlement.routes.every(r=>r.points.length>2&&r.width>0),id+' invalid curved route');
 ok(m.settlement.courts.every(poly=>poly.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y))),id+' invalid court geometry');
 for(const bowl of m.props.filter(p=>p.type==='firebowl'))ok(m.blocked[(bowl.x|0)+(bowl.y|0)*m.w],id+' fire bowl has no collision');
 const roadQueue=[(start.x|0)+(start.y|0)*m.w],roads=new Set(roadQueue);
 for(let q=0;q<roadQueue.length;q++)for(const ni of [roadQueue[q]-1,roadQueue[q]+1,roadQueue[q]-m.w,roadQueue[q]+m.w])if(m.floor[ni]===5&&!m.blocked[ni]&&!roads.has(ni)){roads.add(ni);roadQueue.push(ni)}
 for(let i=0;i<m.w*m.h;i++){
   if(!m.blocked[i])ok(visited.has(i),id+' isolated walkable tile '+i);
   if(m.floor[i]===5&&!m.blocked[i])ok(roads.has(i),id+' disconnected road '+i);
   ok(!m.hazard[i],id+' unsafe town terrain');
 }
 for(const [name,p] of Object.entries(m.spawns)){ok(walk(p.x,p.y),id+' blocked spawn '+name);ok(m.floor[(p.x|0)+(p.y|0)*m.w]===5,id+' unpaved arrival '+name);}
 for(const b of m.buildings)for(let y=b.footprint.y0;y<b.footprint.y1;y++)for(let x=b.footprint.x0;x<b.footprint.x1;x++)ok(!walk(x,y)&&m.floor[x+y*m.w]!==5,id+' building footprint carved');
 for(const p of [...m.npcs,...m.props.filter(p=>p.interact)]){
   const path=U.astar(walk,m.w,m.h,start.x,start.y,p.x,p.y);ok(path!==null,id+' no path to '+(p.id||p.interact));
   const end=path.at(-1)||{x:start.x|0,y:start.y|0};ok(Math.hypot(end.x+.5-p.x,end.y+.5-p.y)<1.6,id+' interaction out of reach '+(p.id||p.interact));
 }
 for(const ex of m.exits){ok(U.astar(walk,m.w,m.h,start.x,start.y,(ex.x0+ex.x1)/2,(ex.y0+ex.y1)/2)!==null,id+' gate blocked');const dest=MapGen.generate(ex.target,seed);ok(dest.spawns[ex.spawnKey],id+' exit arrival key missing');ok(dest.exits.some(e=>e.target===id&&m.spawns[e.spawnKey]),id+' return connection missing');}
 for(const p of m.props){const key=DATA.SPRITE_MANIFEST.maps.props[id+'_'+p.type]||DATA.SPRITE_MANIFEST.maps.props[p.type];ok(key&&DATA.SPRITE_MANIFEST.entries[key],id+' missing art '+p.type);}
 for(const n of m.npcs)ok(DATA.NPCS[n.id],id+' missing NPC '+n.id);
}
console.log(`PASS ${checks} checks across five towns and four world seeds: paths, collisions, interactions, arrivals, return links and art.`);
