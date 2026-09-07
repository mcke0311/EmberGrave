// Compare optimized graph edges against the complete swept-footprint rule.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
for(const f of ['utils','navigation'])vm.runInThisContext(fs.readFileSync(new URL('../js/'+f+'.js',import.meta.url),'utf8'));
const {U,TerrainNavigation:N,TerrainSurface:S}=vm.runInThisContext('({U,TerrainNavigation,TerrainSurface})');
const astar=U.astar;let edge,checks=0;
U.astar=(...args)=>{edge=args[10];return null;};
for(const radius of [0,.2,.36,.49,.5,.68])for(const hop of [false,true])for(const [dx,dy] of S.directions){
 const m={w:16,h:16,blocked:new Uint8Array(256),elev:new Uint8Array(256),surfaceVersion:1,ramps:[]};
 for(let y=0;y<m.h;y++)for(let x=0;x<m.w;x++){m.elev[x+y*m.w]=x<8?0:2;if((x*71+y*97)%23===0)m.blocked[x+y*m.w]=1;}
 m.ramps=[{x:5,y:5,dx,dy,width:3,length:4,low:0,high:2}];S.rebuild(m);
 m.blocked[12+12*m.w]=1; // Blocked goals are retargeted inside A*.
 const profile={radius,hop,speed:4.5};edge=null;
 // This path crosses a cliff, ensuring that findPath enters the graph search.
 let start;
 for(let y=10;y<15&&!start;y++)for(let x=1;x<5&&!start;x++)if(S.supported(m,x+.5,y+.5,radius))start={x:x+.5,y:y+.5};
 const edges=m._surfaceEdges;m._surfaceEdges=null; // Capture the A* callback, bypassing the separately tested region shortcut.
 N.findPath(m,start,{x:12.5,y:12.5},profile);m._surfaceEdges=edges;
 assert.equal(typeof edge,'function');
 for(let y=1;y<15;y++)for(let x=1;x<15;x++)for(const [ox,oy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
  const actual=edge(x,y,x+ox,y+oy,Math.hypot(ox,oy))?.kind||null;
  const expected=N.transition(m,x+.5,y+.5,x+ox+.5,y+oy+.5,profile);
  assert.equal(actual,expected,JSON.stringify({radius,hop,dx,dy,x,y,ox,oy}));checks++;
 }
}
U.astar=()=>{throw Error('Unsupported takeoff must not flood-search the map');};
const m={w:6,h:6,blocked:new Uint8Array(36),elev:new Uint8Array(36),surfaceVersion:1,ramps:[]};
m.elev[2+2*6]=3;S.rebuild(m);
assert.equal(N.findPath(m,{x:2.9,y:2.5},{x:4.5,y:4.5},{radius:.36}),null);checks++;
U.astar=astar;
const regions={w:10,h:10,blocked:new Uint8Array(100),elev:new Uint8Array(100),surfaceVersion:1,ramps:[]};
for(let y=0;y<10;y++)regions.blocked[5+y*10]=1;S.rebuild(regions);
const from={x:2.5,y:2.5},to={x:7.5,y:7.5};let searches=0;
U.astar=(...args)=>{searches++;return astar(...args);};
assert.equal(N.findPath(regions,from,to,{radius:.36}),null);
assert.equal(searches,0,'disconnected regions entered A*');checks+=2;
regions.blocked[5+4*10]=0;
assert.ok(N.findPath(regions,from,to,{radius:.36}),'destroying a blocker did not reopen its route');checks++;
regions.blocked[5+4*10]=1;
assert.equal(N.findPath(regions,from,to,{radius:.36}),null,'new blocker retained stale connectivity');checks++;
regions.blocked.fill(0);for(let y=0;y<10;y++)for(let x=5;x<10;x++)regions.elev[x+y*10]=2;S.rebuild(regions);
assert.equal(N.findPath(regions,from,to,{radius:.36}),null,'geometry rebuild retained stale connectivity');checks++;
assert.ok(N.findPath(regions,from,to,{radius:.36,hop:true}),'walking regions incorrectly rejected a hop');checks++;
regions.elev.fill(0);S.rebuild(regions);
assert.ok(N.findPath(regions,from,to,{radius:.36}),'flattened geometry retained stale connectivity');checks++;
U.astar=astar;
console.log(`PASS ${checks} navigation checks: optimized edges match swept collision for ramps, walls, cliffs, diagonals, hopping and six body radii.`);
