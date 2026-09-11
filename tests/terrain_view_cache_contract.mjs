// Cache lifetime and camera travel regressions. Canvas stubs verify work counts,
// never performance timings; real pixels are checked by the browser fixture.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const noop=()=>{},gradient={addColorStop:noop};
let allocated=[];
globalThis.document={createElement(){
 const canvas={width:0,height:0};allocated.push(canvas);
 const context=new Proxy({canvas,createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),
  createLinearGradient:()=>gradient,createRadialGradient:()=>gradient,createPattern:()=>({})},
  {get:(o,k)=>k in o?o[k]:noop});canvas.getContext=()=>context;return canvas;
}};
for(const f of ['utils','data','data_overrides','sprite_manifest','mapgen'])vm.runInThisContext(fs.readFileSync(new URL('../js/'+f+'.js',import.meta.url),'utf8'));
const {U,DATA,MapGen,TerrainSurface:S}=vm.runInThisContext('({U,DATA,MapGen,TerrainSurface})');
globalThis.SpriteAssets={WALL_VIEW_H:128,maps:DATA.SPRITE_MANIFEST.maps,getFrame:()=>({image:{},sx:0,sy:0,sw:512,sh:512,anchorX:256,anchorY:256}),drawFrame:noop,drawCliffPolygon:noop,drawCliff:noop};
vm.runInThisContext(fs.readFileSync(new URL('../js/level_terrain.js',import.meta.url),'utf8'));
const T=vm.runInThisContext('LevelTerrain');let checks=0;const ok=(v,msg)=>{checks++;assert.ok(v,msg);};
const c=document.createElement('canvas'),ctx=c.getContext('2d'),map=MapGen.generate('north_wild',12345);
function render(m,cam){T.beginFrame(m);try{T.drawSurface(ctx,m,cam,0,m.w-1,0,m.h-1,()=>true,true);}finally{T.endFrame();}return T.getDiagnostics();}
for(const [w,h] of [[1920,1080],[2560,1440],[3840,2160]]){
 c.width=w;c.height=h;const cam={x:-w/2+.35,y:2560-h/2+.65};
 const cold=render(map,cam),projected=allocated.findLast(a=>a.width===w+384&&a.height===h+384);
 ok(cold.surfaceViewPixels===(w+384)*(h+384),'unexpected projected canvas memory');
 for(let i=0;i<300;i++){
  const d=render(map,{x:cam.x+i*.2,y:cam.y+i*.3});
  ok(d.surfaceViewBuilds===cold.surfaceViewBuilds,'small camera movement repainted the terrain');
  ok(d.tileDraws===0&&d.chunkBuilds===0,'cached terrain resubmitted tiles');
  ok(d.surfaceViewPixels===cold.surfaceViewPixels,'cache grew while moving');
 }
 const moved=render(map,{x:cam.x+500,y:cam.y+300});
 ok(moved.surfaceViewBuilds===cold.surfaceViewBuilds+1,'crossing overscan did not replace the image');
 ok(projected.width===w+384&&projected.height===h+384,'camera scrolling reallocated the projected canvas');
 const rebuilt=S.tileGeometry(map,80,80);S.rebuild(map);
 ok(S.tileGeometry(map,80,80)!==rebuilt,'geometry revision was not replaced');
 const changed=render(map,{x:cam.x+500,y:cam.y+300});
 ok(changed.surfaceViewBuilds===moved.surfaceViewBuilds+1,'geometry rebuild reused stale pixels');
 ok(projected.width===0&&projected.height===0,'obsolete geometry canvas backing store was not released');
}
const prior=T.getDiagnostics(),replacement=MapGen.generate('north_wild',1);
ok(render(replacement,{x:0,y:2000}).surfaceViewBuilds===prior.surfaceViewBuilds+1,'same-id replacement map reused stale pixels');
T.beginFrame(MapGen.generate('mines',12345));
ok(T.getDiagnostics().surfaceViewPixels===0,'leaving the terraced map retained its canvas');T.endFrame();
// Incremental ramp authoring must also create a new geometry identity.
const blank={w:16,h:16,blocked:new Uint8Array(256),elev:new Uint8Array(256),surfaceVersion:1,ramps:[]};
S.rebuild(blank);const geometry=blank._surfaceGeometry;
S.addRamp(blank,{x:3,y:5,dx:1,dy:0,width:3,length:4,low:0,high:2});
ok(blank._surfaceGeometry!==geometry,'adding a ramp did not invalidate cached ground');
// The spatial lookup must issue exactly the same clipping commands, in the
// same order, as scanning every polygon (including cell-boundary positions).
c.width=1920;c.height=1080;let trace=null;
for(const name of ['beginPath','rect','moveTo','lineTo','closePath','clip'])ctx[name]=(...args)=>{if(trace)trace.push([name,...args]);};
const actors=[[79.5,79.5],[80.49,80.5],[81.5,86.5],[83.5,82.5]];
// Use an explicit ledge: these viewpoints no longer sit beside artificial
// boundary cliffs after the Act I landscape change.
for(let y=80;y<=85;y++)for(let x=79;x<=84;x++)map.elev[x+y*map.w]=3;
S.rebuild(map);
for(const cam of [{x:-960,y:2000},{x:-960.35,y:2000.65}]){
 const commands=[];
 for(const cached of [false,true]){
  T.beginFrame(map);T.drawSurface(ctx,map,cam,0,map.w-1,0,map.h-1,()=>true,cached);
  const batch=[];
  for(const [x,y] of actors){trace=[];T.clipBehind(ctx,map,cam,x,y);const first=trace;trace=[];T.clipBehind(ctx,map,cam,x,y);assert.deepEqual(trace,first,'warm northern candidate cache changed occlusion');checks++;batch.push(trace);trace=null;}
  T.endFrame();commands.push(batch);
 }
 assert.deepEqual(commands[1],commands[0],'indexed occlusion changed clipping paths or their order');checks++;
 ok(commands[0].some(a=>a.length>0),'occlusion comparison did not clip any foreground geometry');
}
// Legacy Act 2 floors share the same bounded view lifecycle, without converting
// their gameplay surface or including depth-sorted walls in the floor image.
function legacy(m,cam){T.beginFrame(m);try{T.drawFloor(ctx,m,cam,0,m.w-1,0,m.h-1,()=>true,true);}finally{T.endFrame();}return T.getDiagnostics();}
for(const zone of ['weeping_marsh','drowned_crypt','ritual_site','hollow_reeds','spawn_pools']){
 const m=MapGen.generate(zone,12345),original=JSON.stringify([m.surfaceVersion,m.ramps,...['elev','walls','floor','hazard','blocked'].map(k=>Array.from(m[k]))]);
 for(const [w,h] of [[1920,1080],[3840,2160]]){
  c.width=w;c.height=h;const cam={x:-w/2+.35,y:m.h*16-h/2+.65},cold=legacy(m,cam);
  for(let i=0;i<120;i++){const warm=legacy(m,{x:cam.x+i*.2,y:cam.y+i*.3});ok(!warm.tileDraws&&!warm.chunkBuilds&&warm.surfaceViewBuilds===cold.surfaceViewBuilds,zone+' warm floor rebuilt');}
  const scroll=legacy(m,{x:cam.x+450,y:cam.y-300});ok(scroll.surfaceViewBuilds===cold.surfaceViewBuilds+1,zone+' did not scroll its view');
  ok(scroll.surfaceViewPixels===(w+384)*(h+384),zone+' grew unbounded view memory');
 }
 ok(original===JSON.stringify([m.surfaceVersion,m.ramps,...['elev','walls','floor','hazard','blocked'].map(k=>Array.from(m[k]))]),zone+' rendering changed gameplay terrain');
 const cam={x:0,y:1000};
 for(const channel of ['floor','hazard','elev','walls']){
  const before=legacy(m,cam),i=10+10*m.w,old=m[channel][i];m[channel][i]=old===1?0:1;
  const after=legacy(m,cam);ok(after.surfaceViewBuilds===before.surfaceViewBuilds+1,zone+' stale '+channel+' grid');m[channel][i]=old;
 }
 if(m.act2){
  const cold=render(m,cam),index=10+10*m.w;m.act2.water[index]^=1;
  ok(render(m,cam).surfaceViewBuilds===cold.surfaceViewBuilds+1,zone+' stale scenic water');m.act2.water[index]^=1;
  const stable=render(m,cam);m.act2.decals[0].x+=1;
  ok(render(m,cam).surfaceViewBuilds===stable.surfaceViewBuilds+1,zone+' stale Act 2 decal');
  const boundaryView=render(m,cam);m.boundaries={...m.boundaries};
  ok(render(m,cam).surfaceViewBuilds===boundaryView.surfaceViewBuilds+1,zone+' stale replaced boundary assembly');
 }
}
for(const zone of ['ash_wastes','cinder_bastion','throne']){
 const m=MapGen.generate(zone,12345),cam={x:0,y:1000},cold=render(m,cam);
 ok(render(m,cam).surfaceViewBuilds===cold.surfaceViewBuilds,zone+' rebuilt warm Act V slopes');
 m.act5Environment={...m.act5Environment};
 ok(render(m,cam).surfaceViewBuilds===cold.surfaceViewBuilds+1,zone+' retained stale painted boundary ground');
}
console.log(`PASS ${checks} projected terrain cache checks: raised and legacy floors, movement, resizing, grid/geometry changes, map identity, and released backing stores.`);
