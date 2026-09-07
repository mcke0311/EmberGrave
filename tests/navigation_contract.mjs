import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
globalThis.document = {createElement: () => ({getContext: () => ({createImageData: (w,h) => ({data:new Uint8ClampedArray(w*h*4)}), putImageData(){}})})};
for (const f of ['utils','data','data_overrides','sprite_manifest','mapgen','navigation','items','entities']) vm.runInThisContext(fs.readFileSync(new URL('../js/'+f+'.js',import.meta.url),'utf8'));
const {TerrainNavigation:N,U,MapGen,Entity,Player,Minion} = vm.runInThisContext('({TerrainNavigation,U,MapGen,Entity,Player,Minion})');
let checks=0; const ok=(v,msg)=>{checks++;assert.ok(v,msg)};
function blank(w=12,h=8){return {w,h,blocked:new Uint8Array(w*h),elev:new Uint8Array(w*h)}}
const profile={hop:true,radius:.36,speed:4.5};
let m=blank(); for(let y=0;y<m.h;y++)for(let x=5;x<m.w;x++)m.elev[x+y*m.w]=2;
const start={x:2.5,y:4.5}, end={x:9.5,y:4.5};
let path=N.findPath(m,start,end,profile);
ok(path?.some(p=>p.kind==='hop'),'two-level ledge has no hop');
ok(N.findPath(m,start,end,{...profile,hop:false})===null,'enemy can hop');
ok(!N.segment(m,start.x,start.y,end.x,end.y),'walking smoothing crossed ledge');
let cur=start;
for(const p of path){ok(p.kind==='hop'?N.transition(m,cur.x,cur.y,p.cx,p.cy,profile)==='hop':N.segment(m,cur.x,cur.y,p.cx,p.cy),'invalid planned edge');cur={x:p.cx,y:p.cy}}
ok(N.findPath(m,end,start,profile)?.some(p=>p.kind==='hop'),'downhill hop missing');
m.elev=m.elev.map(v=>v?3:0);ok(N.findPath(m,start,end,profile)===null,'tall cliff climbed');
m.elev=m.elev.map(v=>v?1:0);ok(N.findPath(m,start,end,profile)?.every(p=>p.kind==='walk'),'gentle slope did not walk');
ok(N.findPath(m,start,end,profile).length===1,'sloped straight route not smoothed');
m=blank();m.blocked[4+3*m.w]=1;m.blocked[3+4*m.w]=1;
ok(!N.segment(m,3.5,3.5,4.5,4.5),'diagonal wall corner cut');
ok(!N.segment(m,2.5,3.5,7.5,3.5),'large frame tunneled through wall');
ok(!N.clear(m,-.1,2),'negative coordinates wrapped');
m=blank();for(let y=0;y<m.h;y++)m.blocked[5+y*m.w]=1;
ok(N.findPath(m,start,end,profile)===null,'solid obstacle jumped');
m=blank();m.elev[5+4*m.w]=2;
const point=N.groundPoint(m,U.isoX(5.5,4.5),U.isoY(5.5,4.5)-28);
ok(Math.abs(point.x-5.5)<1e-9&&Math.abs(point.y-4.5)<1e-9,'elevated click missed visible tile');
// A long snake corridor exceeds the old 2,600 expansion cap.
m=blank(100,80);m.blocked.fill(1);
for(let y=1;y<79;y+=2){for(let x=1;x<99;x++)m.blocked[x+y*m.w]=0;if(y<77)m.blocked[(y%4===1?98:1)+(y+1)*m.w]=0;}
ok(N.findPath(m,{x:1.5,y:1.5},{x:98.5,y:77.5},profile)?.length>0,'long route was capped');
// Execute the production follower through a hop; intent survives and ground height is continuous.
m=blank();for(let y=0;y<m.h;y++)for(let x=5;x<m.w;x++)m.elev[x+y*m.w]=2;
globalThis.Game={state:{map:m,time:0,monsters:[],minions:[]},dustPuff(){},finishTraversal(){},repath(e,x,y){e.path=N.findPath(m,e,{x,y},{...profile,hop:!!e.autoHop})}};
const ent=new Entity(start.x,start.y);ent.autoHop=true;ent.command={type:'move'};ent.path=N.findPath(m,ent,end,profile);
let hops=0;for(let i=0;i<800&&(ent.path?.length||ent.jumping);i++){Game.state.time+=.016;if(ent.jumping)ent.updateTraversal(.016);else {ent.moveAlong(.016,4.5,m,[]);if(ent.jumping)hops++;}}
ok(hops===1&&U.dist(ent.x,ent.y,end.x,end.y)<.02,'actor did not finish hop route');ok(ent.command.type==='move'&&ent.jumpZ===0,'hop lost intent or left visual lift');
const blockedActor=new Entity(4.5,4.5);blockedActor.autoHop=true;blockedActor.path=[{cx:5.5,cy:4.5,kind:'hop'}];m.blocked[5+4*m.w]=1;
blockedActor.moveAlong(.016,4.5,m,[]);ok(!blockedActor.jumping&&blockedActor.x===4.5,'changed landing obstacle was ignored');m.blocked[5+4*m.w]=0;
blockedActor._navRetryAt=0;blockedActor.path=[{cx:5.5,cy:4.5,kind:'hop'}];blockedActor.moveAlong(.016,4.5,m,[{x:5.5,y:4.5,radius:.36,dead:false}]);ok(!blockedActor.jumping&&blockedActor.x===4.5,'occupied landing was ignored');
ok(new Player('Test','vanguard').autoHop,'hero lacks hop capability');
const servant=new Minion('skeleton',{hp:10,dmg:[1,2],speed:4,atkRate:1,range:1},ent);ok(servant.autoHop,'companion lacks hop capability');
let longest=0;
for(const seed of [0,1,123]){
 const map=MapGen.generate('north_wild',seed),from=map.spawns.default;
 const targets=[...Object.values(map.spawns),...map.exits.map(e=>({x:(e.x0+e.x1)/2,y:(e.y0+e.y1)/2})),...map.props.filter(p=>p.interact||(p.lootable&&!p.rich)).slice(0,12)];
 for(const target of targets){const t=performance.now(),p=N.findPath(map,from,target,profile);longest=Math.max(longest,performance.now()-t);ok(p!==null,'seed '+seed+' route unreachable '+JSON.stringify(target));if(p){let prev=from;for(const w of p){ok(w.kind==='hop'?N.transition(map,prev.x,prev.y,w.cx,w.cy,profile)==='hop':N.segment(map,prev.x,prev.y,w.cx,w.cy),'seed route contains invalid transition');prev={x:w.cx,y:w.cy};}}}
}
console.log(`PASS ${checks} navigation checks; longest seeded query ${longest.toFixed(1)} ms.`);
