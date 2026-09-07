// Exercise the production cache with real generated maps and deterministic canvas stubs.
// Timing belongs to terrain_cache_benchmark.html; these checks verify cache behavior.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const noop=()=>{},gradient={addColorStop:noop};
const context=new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),createLinearGradient:()=>gradient,createRadialGradient:()=>gradient,createPattern:()=>({})},{get:(o,k)=>k in o?o[k]:noop});
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>context})};
for(const file of ['utils','data','data_overrides','sprite_manifest','mapgen'])vm.runInThisContext(fs.readFileSync(new URL('../js/'+file+'.js',import.meta.url),'utf8'));
const data=vm.runInThisContext('({U,DATA,MapGen})');let frameReads=0;
globalThis.SpriteAssets={maps:data.DATA.SPRITE_MANIFEST.maps,getFrame:()=>{frameReads++;return {image:{},sx:0,sy:0,sw:512,sh:512};}};
vm.runInThisContext(fs.readFileSync(new URL('../js/level_terrain.js',import.meta.url),'utf8'));
const terrain=vm.runInThisContext('LevelTerrain');let checks=0;
const ok=(v,msg)=>{checks++;assert.ok(v,msg);};
function tiles(m,W,H,p){
  const cam={x:data.U.isoX(p.x,p.y)-W/2,y:data.U.isoY(p.x,p.y)-H/2-20},out=[];
  for(let y=0;y<m.h;y++)for(let x=0;x<m.w;x++){
    const sx=data.U.isoX(x+.5,y+.5)-cam.x,sy=data.U.isoY(x+.5,y+.5)-cam.y-m.elev[x+y*m.w]*14;
    if(sx>-96&&sx<W+96&&sy>-224&&sy<H+96)out.push([x,y,sx,sy]);
  }
  return out;
}
function draw(m,cells){terrain.beginFrame(m);try{for(const cell of cells)terrain.drawTile(context,m,...cell);}finally{terrain.endFrame();}return terrain.getDiagnostics();}
const summaries=[];
for(const seed of [12345,1,4294967295]){
  const m=data.MapGen.generate('north_wild',seed);
  for(const [W,H] of [[1920,1080],[2560,1440],[3840,2160]])for(const [where,p] of [['entry',m.spawns.from_camp],['center',{x:m.w/2,y:m.h/2}]]){
    const cells=tiles(m,W,H,p),warm=draw(m,cells);let builds=0;
    for(let i=0;i<300;i++){
      const d=draw(m,cells);builds+=d.chunkBuilds;
      ok(d.chunkBuilds===0,`${seed}/${W}/${where}: stationary cache rebuilt on frame ${i}`);
      ok(d.retainedChunks>=d.visibleChunks&&d.retainedChunks<=Math.max(40,d.visibleChunks+12),'cache outside memory budget');
      ok(d.cacheHits===d.tileDraws&&d.buildMs===0,'warm frame has inconsistent diagnostics');
    }
    if(seed===12345)summaries.push({viewport:`${W}x${H}`,where,visibleChunks:warm.visibleChunks,warmFrames:300,rebuilds:builds});
  }
  // Travel in both axes, crossing chunk boundaries; the current frame can never evict itself.
  for(let step=0;step<28;step++){
    const p={x:72+step*.75,y:75+step*.5},cells=tiles(m,2560,1440,p),first=draw(m,cells),second=draw(m,cells);
    ok(first.chunkBuilds<=first.visibleChunks,'chunk rebuilt twice within a walking frame');
    ok(second.chunkBuilds===0,'newly visible walking chunks were evicted');
  }
  const a=tiles(m,2560,1440,{x:80,y:80}),b=tiles(m,2560,1440,{x:81,y:80});draw(m,a);draw(m,b);
  ok(draw(m,a).chunkBuilds===0,'short retrace lost recently visible terrain');
  // Large -> small -> large viewport must retain its entire current working set each time.
  for(const [W,H] of [[3840,2160],[1280,720],[2560,1440],[3840,2160]]){
    const cells=tiles(m,W,H,{x:80,y:80});draw(m,cells);ok(draw(m,cells).chunkBuilds===0,'resize churn');
  }
  const sameId=data.MapGen.generate('north_wild',seed+1),reads=frameReads;
  terrain.beginFrame(sameId);ok(terrain.getDiagnostics().retainedChunks===0,'map change kept stale surfaces');terrain.endFrame();
  draw(sameId,tiles(sameId,1920,1080,{x:80,y:80}));ok(frameReads===reads,'map change discarded reusable materials');
}
// Simulate the ordering of floor and later dungeon roof-cap passes in one frame.
const dungeon=data.MapGen.generate('mines',12345),early=[],late=[];
for(let y=0;y<dungeon.h;y+=12)for(let x=0;x<dungeon.w;x+=12)(early.length<45?early:late).push([x,y,0,0]);
terrain.beginFrame(dungeon);for(const cell of early)terrain.drawTile(context,dungeon,...cell);
for(const cell of late)terrain.drawTile(context,dungeon,...cell);
ok(terrain.getDiagnostics().evictions===0,'terrain evicted before the wall-cap pass finished');
const total=terrain.getDiagnostics().chunkBuilds;for(const cell of early)terrain.drawTile(context,dungeon,...cell);
ok(terrain.getDiagnostics().chunkBuilds===total,'wall caps evicted earlier floor chunks');terrain.endFrame();
ok(draw(dungeon,[...early,...late]).chunkBuilds===0,'late wall caps did not remain cached');
const stats=terrain.getDiagnostics();ok(Object.isFrozen(stats),'diagnostics are mutable');
try{stats.chunkBuilds=100;}catch{}ok(terrain.getDiagnostics().chunkBuilds===0,'diagnostics mutate live state');
// At 45 visible chunks the budget is 57. A one-chunk overflow must evict
// only the oldest unused entry; later tile draws must not refresh it again.
const lruMap=data.MapGen.generate('north_wild',24680),columns=Math.ceil(lruMap.w/12);
const cell=n=>[(n%columns)*12,Math.floor(n/columns)*12,0,0];
draw(lruMap,Array.from({length:45},(_,i)=>cell(i)));
const refresh=draw(lruMap,[cell(1),cell(0),cell(1),...Array.from({length:43},(_,i)=>cell(i+2))]);
ok(refresh.chunkBuilds===0,'recency-only frame built surfaces');
// Of the unused entries 0..12, entry 1 was touched first, despite its later
// duplicate tile. This is the entry that must leave the cache first.
const overflow=draw(lruMap,Array.from({length:45},(_,i)=>cell(i+13)));
ok(overflow.evictions===1&&overflow.retainedChunks===57,'unused chunk reserve is not bounded');
terrain.beginFrame(lruMap);terrain.drawTile(context,lruMap,...cell(0));
ok(terrain.getDiagnostics().chunkBuilds===0,'newer unused chunk was evicted first');
terrain.drawTile(context,lruMap,...cell(1));
ok(terrain.getDiagnostics().chunkBuilds===1,'duplicate tile updated per-frame chunk recency');terrain.endFrame();
assert.throws(()=>terrain.drawTile(context,dungeon,0,0,0,0),/beginFrame/);checks++;
terrain.beginFrame(dungeon);assert.throws(()=>terrain.beginFrame(dungeon),/End the terrain frame/);checks++;terrain.endFrame();
// The sloped-surface renderer shares the material cache and frame retention.
SpriteAssets.drawCliffPolygon=()=>{};
for(let frame=0;frame<8;frame++){
 terrain.beginFrame(lruMap);
 terrain.drawSurface(context,lruMap,{x:0,y:0},30,54,30,54,()=>true);
 terrain.endFrame();
 if(frame)ok(terrain.getDiagnostics().chunkBuilds===0,'sloped surfaces rebuild a stationary material chunk');
}
console.log(JSON.stringify({status:'PASS',checks,stationary:summaries,coverage:'Three seeds; walking, retracing, resizing, map identity, memory budget, materials retained, late wall caps, read-only diagnostics.'},null,2));
