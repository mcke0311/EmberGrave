import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
globalThis.document={createElement:()=>({getContext:()=>({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){}})})};
for(const f of ['utils','data','data_overrides','sprite_manifest','mapgen','navigation','items','entities'])vm.runInThisContext(fs.readFileSync(new URL('../js/'+f+'.js',import.meta.url),'utf8'));
const {TerrainSurface:S,TerrainNavigation:N,U,MapGen,Entity}=vm.runInThisContext('({TerrainSurface,TerrainNavigation,U,MapGen,Entity})');
let checks=0,maxWalkHeightDelta=0;
const ok=(v,m)=>{checks++;assert.ok(v,m);};
const blank=()=>({w:24,h:24,blocked:new Uint8Array(576),elev:new Uint8Array(576),surfaceVersion:1,ramps:[]});
const profile={radius:.36,hop:false,speed:4.5};
function rampMap(dx,dy){
 const m=blank(),r={x:11,y:11,dx,dy,width:3,length:4,low:0,high:2};m.ramps=[r];
 for(let y=0;y<m.h;y++)for(let x=0;x<m.w;x++)if((dx?(x+.5-r.x-(dx<0?1:0))*dx:(y+.5-r.y-(dy<0?1:0))*dy)>=r.length)m.elev[x+y*m.w]=2;
 S.rebuild(m);return {m,r,a:{x:r.x-dx+.5,y:r.y-dy+.5},b:{x:r.x+dx*r.length+.5,y:r.y+dy*r.length+.5}};
}
for(const [dx,dy] of S.directions){
 const {m,r,a,b}=rampMap(dx,dy);
 ok(N.segment(m,a.x,a.y,b.x,b.y),'ramp not continuously walkable');
 for(const hz of [30,60,120])for(const reverse of [false,true]){
  const from=reverse?b:a,to=reverse?a:b,actor=new Entity(from.x,from.y);
  globalThis.Game={state:{map:m,time:0},repath(e,x,y){e.path=N.findPath(m,e,{x,y},profile);},dustPuff(){},finishTraversal(){}};
  actor.path=N.findPath(m,actor,to,profile);
  for(let i=0;i<hz*3;i++){
   const x=actor.x,y=actor.y,h=S.heightAt(m,x,y);actor.moveAlong(1/hz,4.5,m,[]);
   const delta=Math.abs(S.heightAt(m,actor.x,actor.y)-h),moved=U.dist(x,y,actor.x,actor.y);
   maxWalkHeightDelta=Math.max(maxWalkHeightDelta,delta);
   ok(delta<=moved*.5+1e-7,'walking height popped');ok(!actor.jumping,'ramp triggered a jump');
  }
  ok(U.dist(actor.x,actor.y,to.x,to.y)<.001&&!actor.moving,'failed to arrive and stop');
 }
 const actor=new Entity(a.x,a.y);Game.state.map=m;actor.path=N.findPath(m,actor,b,profile);
 for(let i=0;i<24;i++)actor.moveAlong(1/60,4.5,m,[]);
 const stopped=S.heightAt(m,actor.x,actor.y);actor.path=null;
 for(let i=0;i<30;i++)actor.moveAlong(1/60,4.5,m,[]);
 ok(S.heightAt(m,actor.x,actor.y)===stopped,'stopped height drifted');
 actor.path=N.findPath(m,actor,a,profile);for(let i=0;i<120;i++)actor.moveAlong(1/60,4.5,m,[]);
 ok(U.dist(actor.x,actor.y,a.x,a.y)<.001,'mid-ramp reversal failed');
 for(let k=0;k<r.length;k++)for(const f of [.1,.5,.9]){
  const x=r.x+dx*k+.5+dx*(f-.5),y=r.y+dy*k+.5+dy*(f-.5),h=S.heightAt(m,x,y);
  for(const cam of [{x:0,y:0},{x:13.35,y:-27.65}]){
   const sx=U.isoX(x,y)-cam.x,sy=U.isoY(x,y)-14*h-cam.y;
   const p=N.groundPoint(m,sx+cam.x,sy+cam.y);
   ok(p&&U.dist(x,y,p.x,p.y)<1e-6,'ramp projection/picking mismatch');
  }
 }
}
let m=blank();for(let y=0;y<m.h;y++)for(let x=0;x<5;x++)m.elev[x+y*m.w]=3;S.rebuild(m);
ok(!N.segment(m,4.5,6.5,5.5,6.5),'walk crossed an exposed cliff');
ok(!S.supported(m,4.9,6.5,.36),'body can hang over cliff');
const face=S.tileGeometry(m,4,6).faces.find(f=>f.facing===0),sx=U.isoX(5,6.5),sy=U.isoY(5,6.5)-21;
ok(S.pick(m,sx,sy)?.kind==='cliff','cliff picked hidden floor');
ok(N.groundPoint(m,sx,sy)===null,'cliff face returned a walk destination');
const rim=N.groundPoint(m,sx,U.isoY(5,6.5)-42);
ok(rim&&rim.x<5&&N.height(m,rim.x,rim.y)===3,'top-rim click fell onto the lower terrace');
ok(N.groundPoint(m,-100000,-100000)===null,'off-map click has destination');
ok(S.inFront(face,10).length>=3&&S.inFront(face,20).length===0,'occlusion depth reversed');
m=blank();m.elev[10+10*m.w]=1;S.rebuild(m);
ok(!N.segment(m,9.5,10.5,10.5,9.5),'diagonal passed a cliff corner');
m=blank();for(let y=0;y<m.h;y++)for(let x=5;x<m.w;x++)m.elev[x+y*m.w]=2;S.rebuild(m);
globalThis.Game={state:{map:m,time:0},dustPuff(){},finishTraversal(){},repath(e,x,y){e.path=N.findPath(m,e,{x,y},{...profile,hop:true});}};
const hopper=new Entity(4.5,6.5);hopper.autoHop=true;hopper.path=N.findPath(m,hopper,{x:7.5,y:6.5},{...profile,hop:true});
let hops=0,previous=14*N.height(m,hopper.x,hopper.y);
for(let i=0;i<120;i++){
 Game.state.time+=1/60;
 if(hopper.jumping){hopper.updateTraversal(1/60);const z=14*N.height(m,hopper.x,hopper.y)+(hopper.jumpZ||0);ok(Math.abs(z-previous)<8,'hop height discontinuity');previous=z;}
 else{hopper.moveAlong(1/60,4.5,m,[]);if(hopper.jumping)hops++;}
}
ok(hops===1&&U.dist(hopper.x,hopper.y,7.5,6.5)<.001,'automatic hop failed');
m.blocked[5+6*m.w]=1;
ok(N.transition(m,4.5,6.5,5.5,6.5,{...profile,hop:true})===null,'hop ignored changed landing');
const seedResults=[];
// Real click, hold and jump handlers must leave intent intact when picking a
// cliff returns null. These are production function bodies, not copies.
const gameSource=fs.readFileSync(new URL('../js/game.js',import.meta.url),'utf8');
const input=vm.createContext({state:{time:1,player:{dead:false,skillL:'basic',skillR:'basic',command:{type:'move'},path:[{cx:1,cy:1}]}},
 mouse:{x:100,y:100,l:true,r:false,shift:false},performance:{now:()=>0},groundHold:null,UI:{cursorItem:null},options:{leftClickMove:true},
 DATA:{BASIC_ATTACK:{type:'melee'},SKILLS:{}},screenToWorld:()=>null,updateHover(){},
 hoverPortal:null,hoverExit:null,hoverNpc:null,hoverLabel:null,hoverProp:null,hoverMon:null,heldTarget:null,
 repath(){throw Error('invalid ground click repathed');}});
vm.runInContext(gameSource.slice(gameSource.indexOf('  function handleClick('),gameSource.indexOf('  function monsterGeometry(')),input);
vm.runInContext(gameSource.slice(gameSource.indexOf('  function tryJump('),gameSource.indexOf('  /* records the chosen ending')),input);
const intent=input.state.player.command,route=input.state.player.path;
vm.runInContext('handleClick(false);heldUpdate();tryJump();',input);
ok(input.state.player.command===intent&&input.state.player.path===route,'cliff input replaced active movement');
input.state.player.jumping={};vm.runInContext('handleClick(false);heldUpdate();',input);
ok(!input.state.player._pendingClick,'invalid airborne click was queued');
Object.assign(input,{MapGen,TerrainSurface:S,U,msg(){}});input.state.map=m;
Object.assign(input.state.player,{x:4.9,y:6.5,radius:.36,jumping:null,face(){}});
input.screenToWorld=()=>({x:6.5,y:6.5});vm.runInContext('tryJump();',input);
ok(!input.state.player.jumping,'manual jump accepted unsupported takeoff');
input.state.player.x=4.5;vm.runInContext('tryJump();',input);
ok(input.state.player.jumping?.tx===6.5&&S.supported(m,6.5,6.5,.36),'manual jump lost supported landing');
// The Vanguard leap uses the same ground interpolation while retaining its
// original peak, timing and landing attack.
const entitySource=fs.readFileSync(new URL('../js/entities.js',import.meta.url),'utf8');
const leapStart=entitySource.indexOf('    if (this.leaping) {',entitySource.indexOf('/* leap motion */'));
const leapStep=new Function('dt','Game','U','TerrainSurface','Sfx',entitySource.slice(leapStart,entitySource.indexOf('    /* dash motion */',leapStart)));
const leaper=new Entity(4.5,6.5);leaper.leaping={fx:4.5,fy:6.5,tx:6.5,ty:6.5,t:0,dur:.5,radius:2};
const leapGame={state:{map:m,monsters:[]},fx:{},addNova(){}};let lastZ=0;
for(let i=0;i<30;i++){
 leapStep.call(leaper,1/60,leapGame,U,S,{play(){}});
 const z=14*S.heightAt(m,leaper.x,leaper.y)+(leaper.jumpZ||0);
 ok(Math.abs(z-lastZ)<6,'Vanguard leap popped at a terrain boundary');lastZ=z;
}
ok(Math.abs(leaper.x-6.5)<1e-6,'Vanguard leap missed its landing');
for(const seed of [0,1,123,12345,4294967295]){
 const t=performance.now(),map=MapGen.generate('north_wild',seed),from=map.spawns.default;
 ok(map.surfaceVersion===1&&map.ramps.length>0&&map.terrainDiagnostics.raisedTiles>1000,'terraces flattened away');
 for(const r of map.ramps){
  ok(r.width>=3&&r.width%2===1&&r.length===2*(r.high-r.low),'bad ramp dimensions');
  for(let w=-Math.floor(r.width/2);w<=Math.floor(r.width/2);w++){
   const ax=r.x-r.dx+.5+(r.dy?w:0),ay=r.y-r.dy+.5+(r.dx?w:0),bx=r.x+r.dx*r.length+.5+(r.dy?w:0),by=r.y+r.dy*r.length+.5+(r.dx?w:0);
   ok(N.segment(map,ax,ay,bx,by),'generated ramp or landing is broken');
  }
 }
 const targets=[...Object.values(map.spawns),...map.exits.map(e=>({x:(e.x0+e.x1)/2,y:(e.y0+e.y1)/2})),...map.props.filter(p=>p.interact||p.lootable),...map.npcs];
 for(const target of targets){
  const route=N.findPath(map,from,target,profile);ok(route!==null,'unreachable required target '+seed+' '+JSON.stringify(target));
  let at=from;for(const p of route){ok(p.kind==='walk'&&N.segment(map,at.x,at.y,p.cx,p.cy),'route and collision disagree');at={x:p.cx,y:p.cy};}
 }
 const replay=MapGen.generate('north_wild',seed);
 ok(JSON.stringify(map.ramps)===JSON.stringify(replay.ramps)&&map.elev.every((h,i)=>h===replay.elev[i]),'terrain regeneration differs');
 seedResults.push({seed,ramps:map.ramps.length,raisedTiles:map.terrainDiagnostics.raisedTiles,targets:targets.length,ms:Math.round(performance.now()-t)});
}
for(const id of ['frosthaven','fields'])ok(!MapGen.generate(id,123).surfaceVersion,'new model leaked into '+id);
for(const id of ['mines','shattered_temple','shardpeak_shrine','deepfreeze_cavern'])ok(MapGen.generate(id,123).surfaceVersion===1,'frontier surface missing in '+id);
console.log(JSON.stringify({status:'PASS',checks,maxWalkHeightDelta,seedResults},null,2));
