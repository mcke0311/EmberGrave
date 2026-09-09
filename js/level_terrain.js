/* Continuous authored terrain for wilderness and dungeon floors.
   Unproject sprite materials once, blend in world coordinates, then seat each
   tile on its own elevation. Collision and cliff geometry remain authoritative. */
"use strict";
const LevelTerrain = (() => {
  const TILE=32, CHUNK=12, PAD=2, SIDE=(CHUNK+PAD*2)*TILE;
  const materials=new Map(),decalFrames=new Map(),chunks=new Map(),visible=new Set();
  const MIN_CAPACITY=40, RECENT_CHUNKS=12;
  let currentMap=null,chunkColumns=0,frameOpen=false,frame=0;
  let tileDraws=0,cacheHits=0,chunkBuilds=0,buildMs=0,evictions=0,capacity=MIN_CAPACITY;
  let totalBuilds=0,totalBuildMs=0,mapChanges=0;
  let surfacePolygons=[],surfaceIndex=null;
  const POLYGON_CELL=128;
  // The terraced floor is static. Keep its projected pixels, including cliffs
  // and rear rims, instead of resubmitting thousands of clipped tiles per tick.
  // Overscan lets the camera move normally without rebuilding the image.
  const VIEW_PAD=192;
  const MASSIF_THEMES=new Set(['snowwild','marsh','desert','hellwild','fields','forest']);
  const TERRAIN_GRIDS=['floor','walls','elev','hazard','scenicWater','void','cathedralMaterials'];
  const terrainGrid=(m,k)=>k==='scenicWater'?m.act2?.water:m[k];
  const terrainDecals=m=>m.cathedral?.decals||m.composition?.decals||m.act2?.decals||m.frontier?.decals||[];
  let terrainSnapshot=null;
  let surfaceView=null,surfaceViewBuilds=0,surfaceViewHits=0;
  let surfacePatch=null;
  const rearRimCache=new WeakMap();
  function release(key){const surface=chunks.get(key);chunks.delete(key);surface.width=surface.height=0;}
  function beginFrame(m){
    if(frameOpen)throw new Error('End the terrain frame before beginning another.');
    if(m!==currentMap){
      for(const key of chunks.keys())release(key);
      releaseSurfaceView();
      currentMap=m;chunkColumns=Math.ceil(m.w/CHUNK);mapChanges++;
    }
    // Terrain editing and fixtures can mutate byte grids in place. Compare
    // content so both the material chunks and projected pixels stay coherent.
    if(!sameTerrain(m)){
      for(const key of chunks.keys())release(key);
      releaseSurfaceView();
      chunkColumns=Math.ceil(m.w/CHUNK);
      terrainSnapshot={map:m,id:m.id,w:m.w,h:m.h,theme:m.zone?.theme,art:m.zone?.artZone,
        surfaceVersion:m.surfaceVersion,geometry:m._surfaceGeometry,outdoor:m.outdoor,decals:JSON.stringify(terrainDecals(m)),
        cathedralEnvironment:m.cathedral?.environment,cathedralRevision:m.cathedral?.environment?.revision,
        act2Visual:m.act2Visual,boundaries:m.boundaries,act5Environment:m.act5Environment,imperialEnvironment:m.act3?.environment,grids:TERRAIN_GRIDS.map(k=>terrainGrid(m,k)?.slice())};
    }
    terrainSnapshot.act1Environment=m.act1Environment;
    visible.clear();surfacePolygons=[];surfaceIndex=null;frameOpen=true;frame++;
    tileDraws=cacheHits=chunkBuilds=buildMs=evictions=0;capacity=MIN_CAPACITY;
  }
  function sameTerrain(m){
    const s=terrainSnapshot;
    if(s&&(s.act1Environment!==m.act1Environment||s.act2Visual!==m.act2Visual))return false;
    if(s&&(s.cathedralEnvironment!==m.cathedral?.environment||s.cathedralRevision!==m.cathedral?.environment?.revision))return false;
    if(!s||s.boundaries!==m.boundaries||s.act5Environment!==m.act5Environment||s.imperialEnvironment!==m.act3?.environment||s.map!==m||s.id!==m.id||s.w!==m.w||s.h!==m.h||s.theme!==m.zone?.theme||s.art!==m.zone?.artZone||
       s.surfaceVersion!==m.surfaceVersion||s.geometry!==m._surfaceGeometry||s.outdoor!==m.outdoor||s.decals!==JSON.stringify(terrainDecals(m)))return false;
    for(let k=0;k<TERRAIN_GRIDS.length;k++){
      const a=s.grids[k],b=terrainGrid(m,TERRAIN_GRIDS[k]);
      if(a?.length!==b?.length)return false;
      if(a)for(let i=0;i<a.length;i++)if(a[i]!==b[i])return false;
    }
    return true;
  }
  function endFrame(){
    if(!frameOpen)return;
    // A fixed limit can be smaller than the viewport. Pin the entire frame's
    // working set, including later wall-cap draws, before evicting anything.
    capacity=Math.max(MIN_CAPACITY,visible.size+RECENT_CHUNKS);
    for(const key of chunks.keys()){
      if(chunks.size<=capacity)break;
      if(!visible.has(key)){release(key);evictions++;}
    }
    frameOpen=false;
  }
  function getDiagnostics(){
    // Immutable snapshot of the current/last frame. Build time is synchronous
    // canvas construction time, not GPU completion or total gameplay time.
    return Object.freeze({frame,mapId:currentMap?.id??null,frameOpen,tileDraws,cacheHits,chunkBuilds,buildMs,
      visibleChunks:visible.size,retainedChunks:chunks.size,capacity,evictions,totalBuilds,totalBuildMs,mapChanges,
      environmentBackdropBuilds,surfaceViewBuilds,surfaceViewHits,surfaceViewPixels:surfaceView?surfaceView.image.width*surfaceView.image.height:0});
  }
  function releaseSurfaceView(){
    if(surfaceView){surfaceView.image.width=surfaceView.image.height=0;surfaceView=null;}
    if(surfacePatch){surfacePatch.width=surfacePatch.height=0;surfacePatch=null;}
  }
  function canvas(w,h=w){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
  function material(id,index=0,trail=false,raw=false){
    const key=id+':'+index+':'+trail;if(materials.has(key))return materials.get(key);
    if(raw){
      const f=SpriteAssets.getFrame(id,0),size=id?.endsWith('.a3visual_sand')?768:id?.includes('a3visual_')?384:id?.includes('a2visual_')?768:id?.includes('a4v2_floor_')?384:320,overlap=size===768?128:64,period=size-overlap;
      const tile=canvas(size),t=tile.getContext('2d');
      t.translate(size/2,size/2);t.rotate(index*Math.PI/2);
      t.drawImage(f.image,f.sx,f.sy,f.sw,f.sh,-size/2,-size/2,size,size);t.resetTransform();
      // Overlap the source edges with complementary weights. This closes the
      // repeat in both axes without mirrored rocks, roots or snow patterns.
      const mask=canvas(size),p=mask.getContext('2d');
      for(const vertical of [false,true]){
        const ramp=p.createLinearGradient(0,0,vertical?0:size,vertical?size:0);
        ramp.addColorStop(0,'rgba(255,255,255,0)');ramp.addColorStop(overlap/size,'white');
        ramp.addColorStop(1-overlap/size,'white');ramp.addColorStop(1,'rgba(255,255,255,0)');
        p.globalCompositeOperation=vertical?'destination-in':'source-over';p.fillStyle=ramp;p.fillRect(0,0,size,size);
      }
      t.globalCompositeOperation='destination-in';t.drawImage(mask,0,0);
      const pattern=canvas(period),g=pattern.getContext('2d');g.globalCompositeOperation='lighter';
      for(let y=-1;y<=1;y++)for(let x=-1;x<=1;x++)g.drawImage(tile,x*period-overlap/2,y*period-overlap/2);
      materials.set(key,pattern);return pattern;
    }
    const f=SpriteAssets.getFrame(id,index),flat=canvas(64),g=flat.getContext('2d');
    g.setTransform(1,-1,2,2,-32,32);g.drawImage(f.image,f.sx,f.sy,f.sw,f.sh,0,0,64,32);
    // Crop inside the painted footprint so its old tile rim cannot repeat.
    const inset=trail?25:5,cut=flat.width-inset*2,size=trail?64:96;
    const pattern=canvas(size*2),p=pattern.getContext('2d');
    for(let y=0;y<2;y++)for(let x=0;x<2;x++){
      p.save();p.translate(x?size*2:0,y?size*2:0);p.scale(x?-1:1,y?-1:1);
      p.drawImage(flat,inset,inset,cut,cut,0,0,size,size);p.restore();
    }
    materials.set(key,pattern);return pattern;
  }
  function noise(x,y,salt){let h=Math.imul(x,73856093)^Math.imul(y,19349663)^Math.imul(salt,83492791);h=Math.imul(h^(h>>>16),0x45d9f3b);h=Math.imul(h^(h>>>16),0x45d9f3b);return ((h^(h>>>16))>>>0)/4294967295;}
  function fill(g,texture,ox,oy){
    g.save();g.translate(-ox,-oy);g.fillStyle=g.createPattern(texture,'repeat');g.fillRect(ox,oy,SIDE,SIDE);g.restore();
  }
  function masked(g,texture,mask,ox,oy,alpha){
    const layer=canvas(SIDE),p=layer.getContext('2d');fill(p,texture,ox,oy);
    p.globalCompositeOperation='destination-in';p.drawImage(mask,0,0);
    g.save();g.globalAlpha=alpha;g.drawImage(layer,0,0);g.restore();
  }
  function cellsMask(m,cx,cy,test,blur,outside=false){
    const c=canvas(SIDE),g=c.getContext('2d');g.fillStyle='#fff';
    for(let y=-PAD;y<CHUNK+PAD;y++)for(let x=-PAD;x<CHUNK+PAD;x++){
      const wx=cx*CHUNK+x,wy=cy*CHUNK+y;
      if(wx>=0&&wy>=0&&wx<m.w&&wy<m.h?test(wx+wy*m.w):outside)g.fillRect((x+PAD)*TILE,(y+PAD)*TILE,TILE,TILE);
    }
    // Filter the union once; blurring individual cells leaves a darker grid
    // where their translucent edges meet inside a path or hazard pool.
    const soft=canvas(SIDE),p=soft.getContext('2d');p.filter='blur('+blur+'px)';p.drawImage(c,0,0);return soft;
  }
  function build(m,cx,cy){
    const surface=canvas(SIDE),g=surface.getContext('2d');
    const ox=(cx*CHUNK-PAD)*TILE,oy=(cy*CHUNK-PAD)*TILE,ground=SpriteAssets.maps.props[m.act3?.environment?ImperialEnvironment.materialKey(m):m.act2Visual&&(m.outdoor||m.id==='spawn_pools')?'a2visual_moss':m.act1Environment&&m.outdoor?'a1polish_snow':m.cathedral?m.cathedral.materials[m.cathedral.baseMaterial]:m.act3?.ground?'act3_ground_'+m.act3.ground:'level_ground_'+(m.zone.artZone||m.id)];
    fill(g,material(ground,0,false,true),ox,oy);
    // Overlapping soft patches break repetition without drawing a tile grid.
    for(let variant=1;variant<(m.act3?.environment||m.act2Visual||m.act1Environment&&m.outdoor?1:4);variant++){
      const mask=canvas(SIDE),p=mask.getContext('2d');
      for(let y=Math.floor(oy/192)-1;y<=Math.ceil((oy+SIDE)/192)+1;y++)for(let x=Math.floor(ox/192)-1;x<=Math.ceil((ox+SIDE)/192)+1;x++){
        if(1+Math.floor(noise(x,y,71)*3)!==variant)continue;
        const px=x*192+noise(x,y,13)*80-ox,py=y*192+noise(x,y,29)*80-oy,r=110+noise(x,y,47)*55;
        const grad=p.createRadialGradient(px,py,0,px,py,r);grad.addColorStop(0,'rgba(255,255,255,.72)');grad.addColorStop(1,'rgba(255,255,255,0)');
        p.fillStyle=grad;p.fillRect(px-r,py-r,r*2,r*2);
      }
      masked(g,material(ground,variant,false,true),mask,ox,oy,1);
    }
    if(m.cathedral)for(let mat=0;mat<4;mat++){
      if(mat===m.cathedral.baseMaterial)continue;
      const mask=cellsMask(m,cx,cy,i=>m.cathedralMaterials[i]===mat&&!m.void[i],12);
      masked(g,material(SpriteAssets.maps.props[m.cathedral.materials[mat]],0,false,true),mask,ox,oy,1);
    }
    if(m.act1Environment&&m.outdoor){
      // Soft forest shade is a continuous mass, not a snow island per prop.
      const mask=cellsMask(m,cx,cy,i=>!!m.walls[i],36);
      const shade=canvas(SIDE),p=shade.getContext('2d');p.fillStyle='#334c61';p.fillRect(0,0,SIDE,SIDE);
      p.globalCompositeOperation='destination-in';p.drawImage(mask,0,0);g.save();g.globalAlpha=.23;g.drawImage(shade,0,0);g.restore();
      const road=cellsMask(m,cx,cy,i=>m.floor[i]>=4&&!m.walls[i],24);
      masked(g,material(SpriteAssets.maps.props.frosthaven_street,0,false,true),road,ox,oy,.36);
    }
    const path=!m.act3?.environment&&!m.cathedral&&!m.act1Environment&&SpriteAssets.maps.paths[m.zone.theme];
    if(path){
      const mask=cellsMask(m,cx,cy,i=>m.floor[i]>=4&&!m.walls[i]&&!m.act2?.water[i],m.composition||m.frontier||m.act2?18:9);
      const road=m.frontier&&m.id==='north_wild'?SpriteAssets.maps.props.frosthaven_street:null;
      masked(g,road?material(road,0,false,true):material(path,15,true),mask,ox,oy,m.composition||m.frontier||m.act2?.48:.86);
    }
    if(m.act3?.environment){
      ImperialEnvironment.decorateFloor(g,m,ox,oy,SIDE,TILE,key=>material(SpriteAssets.maps.props[key],0,false,true));
      // Shade the union, so adjacent masonry sections do not stack shadows.
      const shadow=canvas(SIDE),p=shadow.getContext('2d');p.fillStyle=m.outdoor?'#42372e':'#10191e';p.fillRect(0,0,SIDE,SIDE);
      p.globalCompositeOperation='destination-in';p.drawImage(cellsMask(m,cx,cy,i=>!!m.walls[i],m.outdoor?38:18),-9,-9);
      g.save();g.globalAlpha=m.outdoor?.24:.52;g.drawImage(shadow,0,0);g.restore();
    }
    if(m.act3&&!m.outdoor&&!m.settlement){
      // Buried masonry reads as solid surrounding mass, distinct from streets.
      const cap=canvas(SIDE),p=cap.getContext('2d');
      fill(p,material(SpriteAssets.maps.props[m.act3.environment?'a3visual_slate':'act3_ground_tomb'],0,false,true),ox,oy);
      p.fillStyle='rgba(9,15,20,.83)';p.fillRect(0,0,SIDE,SIDE);
      p.globalCompositeOperation='destination-in';p.drawImage(cellsMask(m,cx,cy,i=>!!m.walls[i],1),0,0);
      g.drawImage(cap,0,0);
    }
    if(m.act1Environment&&!m.outdoor&&!m.settlement){
      // Lift the midtones of the walking surface, leaving the buried mass dark.
      g.save();g.globalCompositeOperation='screen';g.fillStyle=m.id==='mines'?'rgba(98,76,51,.20)':m.id==='deepfreeze_cavern'?'rgba(65,130,158,.15)':'rgba(99,115,132,.17)';g.fillRect(0,0,SIDE,SIDE);g.restore();
      const cap=canvas(SIDE),p=cap.getContext('2d');p.fillStyle='#080d12';p.fillRect(0,0,SIDE,SIDE);
      p.globalCompositeOperation='destination-in';p.drawImage(cellsMask(m,cx,cy,i=>!!m.walls[i],10),0,0);
      g.save();g.globalAlpha=.90;g.drawImage(cap,0,0);g.restore();
    }
    if(m.act5Environment&&!m.act5Environment.outdoor){
      const shade=canvas(SIDE),p=shade.getContext('2d');
      p.fillStyle='rgba(9,8,10,.66)';p.fillRect(0,0,SIDE,SIDE);
      p.globalCompositeOperation='destination-in';p.drawImage(cellsMask(m,cx,cy,i=>!!m.walls[i],12),0,0);
      g.drawImage(shade,0,0);
    }
    if(m.act2){
      const water=SpriteAssets.maps.props[m.act2Visual?'a2visual_water':'act2_black_water'];
      const mask=cellsMask(m,cx,cy,i=>!!m.act2.water[i],m.act2Visual?12:5,!!m.act2Visual);
      masked(g,material(water,0,false,true),mask,ox,oy,1);
      if(m.act2Visual){
        // Wet stone has readable midtones; the surrounding flooded mass is
        // darker. Both use exactly the same UVs as the viewport continuation.
        const shade=canvas(SIDE),p=shade.getContext('2d');
        p.fillStyle=m.outdoor?'rgba(7,24,28,.22)':'rgba(4,12,16,.64)';p.fillRect(0,0,SIDE,SIDE);
        p.globalCompositeOperation='destination-in';p.drawImage(mask,0,0);g.drawImage(shade,0,0);
        if(!m.outdoor){
          const cap=canvas(SIDE),q=cap.getContext('2d');q.fillStyle='#10191c';q.fillRect(0,0,SIDE,SIDE);
          q.globalCompositeOperation='destination-in';q.drawImage(cellsMask(m,cx,cy,i=>!!m.walls[i],7),0,0);g.drawImage(cap,0,0);
        }
      }
    }
    const hazards=new Set();
    for(let y=Math.max(0,cy*CHUNK-PAD);y<Math.min(m.h,(cy+1)*CHUNK+PAD);y++)for(let x=Math.max(0,cx*CHUNK-PAD);x<Math.min(m.w,(cx+1)*CHUNK+PAD);x++)if(m.hazard?.[x+y*m.w])hazards.add(m.hazard[x+y*m.w]);
    for(const code of hazards){const def=DATA.HAZARDS[code],id=def&&SpriteAssets.maps.props['level_hazard_'+def.id];if(!id)continue;
      masked(g,material(id,0,false,true),cellsMask(m,cx,cy,i=>!m.walls[i]&&m.hazard[i]===code,6),ox,oy,.92);
    }
    if(m.cathedral?.environment)CathedralEnvironment.decorateFloor(g,m,ox,oy,SIDE,TILE);
    for(const d of terrainDecals(m)){
      if(m.act3?.environment&&d.type.startsWith('act3_'))continue;
      const x=d.x*TILE-ox,y=d.y*TILE-oy;
      const reach=d.type==='a2visual_seal'?1000:384;
      if(x<-reach||y<-reach||x>SIDE+reach||y>SIDE+reach)continue;
      const id=SpriteAssets.maps.props[d.type];
      if(!decalFrames.has(id))decalFrames.set(id,SpriteAssets.getFrame(id,0));
      const f=decalFrames.get(id),s=d.scale||1;
      g.save();g.setTransform(.5,-.5,1,1,x,y);g.scale(d.turn?-s:s,s);g.globalAlpha=d.alpha??1;
      g.drawImage(f.image,f.sx,f.sy,f.sw,f.sh,-f.anchorX,-f.anchorY,f.sw,f.sh);g.restore();
    }
    return surface;
  }
  function tileTexture(m,x,y){
    if(!frameOpen||m!==currentMap)throw new Error('Call LevelTerrain.beginFrame(map) before drawing its tiles.');
    const cx=Math.floor(x/CHUNK),cy=Math.floor(y/CHUNK),key=cx+cy*chunkColumns;
    tileDraws++;
    let surface=chunks.get(key);
    if(!surface){
      const start=performance.now();surface=build(m,cx,cy);const elapsed=performance.now()-start;
      chunks.set(key,surface);chunkBuilds++;totalBuilds++;buildMs+=elapsed;totalBuildMs+=elapsed;
    }else{
      cacheHits++;
      // Repeated tiles in one chunk must not churn Map insertion order.
      if(!visible.has(key)){chunks.delete(key);chunks.set(key,surface);}
    }
    visible.add(key);
    const ux=(x-cx*CHUNK+PAD)*TILE,uy=(y-cy*CHUNK+PAD)*TILE;
    return {surface,ux,uy};
  }
  function drawTile(ctx,m,x,y,sx,sy){
    const {surface,ux,uy}=tileTexture(m,x,y);
    // Matching source/destination bleed seals fractional-camera joins while
    // preserving continuous UVs. The separate cliff pass keeps ledges sharp.
    ctx.save();ctx.transform(1,.5,-1,.5,sx,sy-16);
    ctx.drawImage(surface,ux-.5,uy-.5,33,33,-.5,-.5,33,33);ctx.restore();
  }
  function drawSurfaceTile(ctx,m,x,y,cam,geometryMap=m){
    const {surface,ux,uy}=tileTexture(m,x,y),[a,b,,d]=TerrainSurface.tileGeometry(geometryMap,x,y).top.points;
    ctx.save();
    ctx.transform((b.sx-a.sx)/TILE,(b.sy-a.sy)/TILE,(d.sx-a.sx)/TILE,(d.sy-a.sy)/TILE,a.sx-cam.x,a.sy-cam.y);
    ctx.drawImage(surface,ux-.5,uy-.5,33,33,-.5,-.5,33,33);
    ctx.restore();
  }
  let environmentBackdrop=null,environmentBackdropBuilds=0;
  function drawEnvironmentBackdrop(ctx,m,cam,W,H){
    if(!m.act2Visual&&(m.act5Environment?.outdoor||m.act5Environment?.uncachedBackdrop)){paintEnvironmentBackdrop(ctx,m,cam,W,H);return;}
    const pad=256,key=(m.zone.artZone||m.id)+':'+W+':'+H;
    let b=environmentBackdrop;
    if(!b||b.key!==key||cam.x<b.x||cam.y<b.y||cam.x+W>b.x+b.image.width||cam.y+H>b.y+b.image.height){
      if(b)b.image.width=b.image.height=0;
      const image=canvas(W+pad*2,H+pad*2),x=Math.floor(cam.x)-pad,y=Math.floor(cam.y)-pad;
      paintEnvironmentBackdrop(image.getContext('2d'),m,{x,y},image.width,image.height);
      b=environmentBackdrop={key,image,x,y};environmentBackdropBuilds++;
    }
    ctx.drawImage(b.image,b.x-cam.x,b.y-cam.y);
  }
  function paintEnvironmentBackdrop(ctx,m,cam,W,H){
    const id=SpriteAssets.maps.props[m.act3?.environment?(m.act3.environment.outdoor?'a3visual_sand':'a3visual_slate'):m.act2Visual?'a2visual_water':m.settlement?m.id+'_soil':'level_ground_'+(m.zone.artZone||m.id)];
    const texture=material(id,0,false,true),x=cam.x/2+cam.y,y=cam.y-cam.x/2;
    ctx.save();ctx.transform(1,.5,-1,.5,-cam.x,-cam.y);
    ctx.fillStyle=ctx.createPattern(texture,'repeat');
    ctx.fillRect(x-2,y-W/2-2,W/2+H+4,W/2+H+4);ctx.restore();
    if(m.act3?.environment&&!m.act3.environment.outdoor){ctx.save();ctx.fillStyle='rgba(9,15,20,.83)';ctx.fillRect(0,0,W,H);ctx.restore();}
    else if(m.act2Visual){ctx.save();ctx.fillStyle=m.act2Visual.outdoor?'rgba(7,24,28,.22)':'rgba(4,12,16,.64)';ctx.fillRect(0,0,W,H);ctx.restore();}
    else if(!m.act3?.environment&&!m.act5Environment?.outdoor){ctx.save();ctx.fillStyle='rgba(9,8,10,.66)';ctx.fillRect(0,0,W,H);ctx.restore();}
  }
  function rearRims(m,x,y,geometry){
    if(rearRimCache.has(geometry))return rearRimCache.get(geometry);
    const rims=[],corners=geometry.top.points;
    // The camera cannot see these vertical faces. Expose a little rock on the
    // upper surface so the silhouette still reads as a drop into lower ground.
    for(const [a,b,nx,ny,ix,iy,facing] of [[corners[0],corners[3],x-1,y,1,0,0],[corners[0],corners[1],x,y-1,0,1,4]]){
      if(nx<0||ny<0)continue;
      const da=a.z-TerrainSurface.tileHeight(m,nx,ny,a.x,a.y),db=b.z-TerrainSurface.tileHeight(m,nx,ny,b.x,b.y);
      if(Math.max(da,db)<=1e-7)continue;
      let from=0,to=1;
      if(da<0)from=da/(da-db);else if(db<0)to=da/(da-db);
      const point=(t,width)=>{
        const fade=U.clamp(U.lerp(da,db,t)*2,0,1);
        const wx=U.lerp(a.x,b.x,t)+ix*width*fade,wy=U.lerp(a.y,b.y,t)+iy*width*fade;
        return {sx:U.isoX(wx,wy),sy:U.isoY(wx,wy)-TerrainSurface.tileHeight(m,x,y,wx,wy)*TerrainSurface.LIFT};
      };
      const outer=[point(from,0),point(to,0)],inner=[],shadow=[];
      for(let j=0;j<=6;j++){
        const t=U.lerp(from,to,j/6),wx=U.lerp(a.x,b.x,t),wy=U.lerp(a.y,b.y,t);
        const width=.16+.055*noise(Math.round(wx*24),Math.round(wy*24),91+facing);
        inner.push(point(t,width));shadow.push(point(t,width+.065));
      }
      rims.push({outer,inner,shadow,texture:[...outer,point(to,.23),point(from,.23)],facing});
    }
    rearRimCache.set(geometry,rims);return rims;
  }
  function drawRearRims(ctx,m,x,y,geometry,cam,cliffId){
    const rims=rearRims(m,x,y,geometry);if(!rims.length)return;
    const path=(points,close=false)=>{
      ctx.beginPath();ctx.moveTo(points[0].sx-cam.x,points[0].sy-cam.y);
      for(let i=1;i<points.length;i++)ctx.lineTo(points[i].sx-cam.x,points[i].sy-cam.y);
      if(close)ctx.closePath();
    };
    ctx.save();path(geometry.top.points,true);ctx.clip();ctx.lineJoin='round';
    for(const rim of rims){
      path([...rim.outer,...rim.shadow.slice().reverse()],true);ctx.fillStyle='rgba(8,18,27,.38)';ctx.fill();
      ctx.save();path([...rim.outer,...rim.inner.slice().reverse()],true);ctx.fillStyle='#263943';ctx.fill();ctx.clip();
      ctx.globalAlpha=.65;
      SpriteAssets.drawCliffPolygon(ctx,SpriteAssets.getFrame(cliffId,rim.facing+2),rim.texture,cam);
      ctx.restore();
      path(rim.outer);ctx.strokeStyle='rgba(7,16,24,.9)';ctx.lineWidth=1.5;ctx.stroke();
      path(rim.inner);ctx.strokeStyle='rgba(210,228,238,.68)';ctx.lineWidth=1;ctx.stroke();
    }
    ctx.restore();
  }
  // Scenic snow continues past the playable map bounds. The apron has no
  // navigation surface; it prevents an outdoor road looking like a floating tile.
  function drawAct1Apron(ctx,m,cam,inView,damage){
    if(!m.act1Environment||!m.outdoor||(damage&&damage.length===0))return;
    // Continue world UVs outside the map. Clamping to its last tile repeated
    // one diagonal slice and made the apron look like corrugated cardboard.
    ctx.save();
    if(damage){ctx.beginPath();for(const r of damage)ctx.rect(r.x,r.y,r.w,r.h);ctx.clip();}
    ctx.transform(1,.5,-1,.5,-cam.x,-cam.y);
    ctx.beginPath();ctx.rect(-8192,-8192,m.w*TILE+16384,m.h*TILE+16384);ctx.rect(0,0,m.w*TILE,m.h*TILE);ctx.clip('evenodd');
    ctx.fillStyle=ctx.createPattern(material(SpriteAssets.maps.props.a1polish_snow,0,false,true),'repeat');
    ctx.fillRect(-8192,-8192,m.w*TILE+16384,m.h*TILE+16384);ctx.restore();
  }
  function drawSurface(ctx,m,cam,x0,x1,y0,y1,inView,cacheView=false,damage=null){
    if(cacheView){drawSurfaceView(ctx,m,cam);return;}
    drawAct1Apron(ctx,m,cam,inView,damage);
    surfaceIndex=null;
    const tiles=[];
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++) {
      const sx=U.isoX(x+.5,y+.5)-cam.x,sy=U.isoY(x+.5,y+.5)-cam.y;
      if(!inView(sx,sy-TerrainSurface.heightAt(m,x+.5,y+.5)*14))continue;
      const geometry=TerrainSurface.tileGeometry(m,x,y);
      const paint=!damage||damage.some(r=>sx+34>r.x&&sx-34<r.x+r.w&&sy+18>r.y&&
        sy-(m._navMaxHeight??6)*TerrainSurface.LIFT-18<r.y+r.h);
      tiles.push({x,y,geometry,paint});
      // Backdrop-proof foundation is drawn before all elevated surfaces.
      if(paint&&geometry.top.points.some(p=>p.z>0))drawTile(ctx,m,x,y,sx,sy);
    }
    tiles.sort((a,b)=>a.x+a.y-b.x-b.y||a.y-b.y);
    const cliffId=SpriteAssets.maps.cliffs[m.zone.theme]||SpriteAssets.maps.cliffs.fields;
    for(const {x,y,geometry:g,paint} of tiles) {
      for(const face of g.faces) {
        // A map extent is not a landscape cliff. The ash biome continues
        // beyond it; retain every interior terrace and its actual drop.
        if(m.act5Environment?.outdoor&&m.walls[x+y*m.w]&&(x===m.w-1||y===m.h-1))continue;
        if(paint){
          const max=Math.max(...face.points.map(p=>p.z)),min=Math.min(...face.points.map(p=>p.z));
          const frame=SpriteAssets.getFrame(cliffId,face.facing+U.clamp(Math.ceil(max-min),1,4)-1);
          SpriteAssets.drawCliffPolygon(ctx,frame,face.points,cam);
        }
        surfacePolygons.push(face);
      }
      if(paint){drawSurfaceTile(ctx,m,x,y,cam);drawRearRims(ctx,m,x,y,g,cam,cliffId);}
      surfacePolygons.push(g.top);
    }
    if(m.boundaries)Act2Boundaries.drawGround(ctx,m,cam,inView,damage);
    if(m.act3?.environment)ImperialEnvironment.drawGround(ctx,m,cam,inView,damage);
    if(m.act1Environment)Act1Environment.drawGround(ctx,m,cam,inView,damage);
    if(m.act5Environment)CindersBoundaries.drawGround(ctx,m,cam,inView,damage);
  }
  // Historical stepped floors retain their exact foundation/cliff paint order.
  function drawFloor(ctx,m,cam,tx0,tx1,ty0,ty1,inView,cacheView=true,damage=null){
    if(cacheView){drawSurfaceView(ctx,m,cam,true);return;}
    drawAct1Apron(ctx,m,cam,inView,damage);
    const theme=m.zone.theme,ev=m.elev,EH=14;
    const massifTerrain=m.outdoor&&MASSIF_THEMES.has(theme);
    if(damage){
      const visible=inView;
      inView=(sx,sy)=>visible(sx,sy)&&damage.some(r=>sx+34>r.x&&sx-34<r.x+r.w&&sy+EH*6+18>r.y&&sy-EH*6-18<r.y+r.h);
    }
    if(m.cathedral?.environment)CathedralEnvironment.drawGround(ctx,m,cam,inView,damage);
    else if(m.cathedral){
      const f=SpriteAssets.getFrame(SpriteAssets.maps.props.cathedral_foundation,0);
      // Clip authored foundations to the actual exposed faces. Back corners of
      // a complete block must not protrude through a neighboring floor tile.
      for(let y=ty0;y<=ty1;y++)for(let x=tx0;x<=tx1;x++){
        const i=x+y*m.w;if(m.void[i]||!(m.void[i+1]||m.void[i+m.w]))continue;
        const sx=U.isoX(x+.5,y+.5)-cam.x,sy=U.isoY(x+.5,y+.5)-cam.y;if(!inView(sx,sy))continue;
        ctx.save();ctx.beginPath();
        if(m.void[i+m.w]){ctx.moveTo(sx-32,sy);ctx.lineTo(sx,sy+16);ctx.lineTo(sx,sy+52);ctx.lineTo(sx-32,sy+36);ctx.closePath();}
        if(m.void[i+1]){ctx.moveTo(sx,sy+16);ctx.lineTo(sx+32,sy);ctx.lineTo(sx+32,sy+36);ctx.lineTo(sx,sy+52);ctx.closePath();}
        ctx.clip();SpriteAssets.drawFrame(ctx,f,sx,sy);ctx.restore();
      }
    }
    if(m.cathedral?.environment?.contours){
      ctx.save();CathedralEnvironment.clipFloor(ctx,m,cam);
      for(let y=ty0;y<=ty1;y++)for(let x=tx0;x<=tx1;x++){
        if(!m.cathedral.environment.surface[x+y*m.w])continue;
        const sx=U.isoX(x+.5,y+.5)-cam.x,sy=U.isoY(x+.5,y+.5)-cam.y;
        if(inView(sx,sy))drawTile(ctx,m,x,y,sx,sy);
      }
      ctx.restore();CathedralEnvironment.drawRim(ctx,m,cam,inView,damage);return;
    }
    /* Solid ground must continue underneath walls and raised terrain. Wall
       and cliff sprites have transparent edges; without this foundation those
       edges expose the screen-space backdrop instead of the level's floor.
       Draw foundations first so they cannot cover a neighboring raised face. */
    for (let y = ty0; !m.settlement && !m.surfaceVersion && y <= ty1; y++) {
      for (let x = tx0; x <= tx1; x++) {
        const i = x + y * m.w;
        // Flat open ground and outdoor wall caps already get a floor below.
        if (m.void?.[i] || (!(ev && ev[i]) && (!m.walls[i] || massifTerrain))) continue;
        const sx = U.isoX(x + 0.5, y + 0.5) - cam.x;
        const sy = U.isoY(x + 0.5, y + 0.5) - cam.y;
        if (inView(sx, sy)) drawTile(ctx,m,x,y,sx,sy);
      }
    }
    for (let y = ty0; !m.settlement && !m.surfaceVersion && y <= ty1; y++) {
      for (let x = tx0; x <= tx1; x++) {
        const i = x + y * m.w;
        const blocked = !!m.walls[i];
        /* Outdoor wall blobs are authored as snow/rock terrain topped by sparse
           boundary massifs. Keep a ground cap beneath every blocked tile so the
           culled interior cannot expose backdrop-colored diamond holes. */
        if (blocked && !massifTerrain) continue;
        const sx = U.isoX(x + 0.5, y + 0.5) - cam.x;
        const eh = (ev ? ev[i] : 0) * EH, sy = U.isoY(x + 0.5, y + 0.5) - cam.y - eh;
        if (!inView(sx, sy)) continue;
        if (eh) {
          const lD = (ev[i] - (y + 1 < m.h ? ev[i + m.w] : 0)) * EH;   // left/SW face
          const rD = (ev[i] - (x + 1 < m.w ? ev[i + 1] : 0)) * EH;     // right/SE face
          const cliffId = SpriteAssets.maps.cliffs[theme] || SpriteAssets.maps.cliffs.fields;
          /* Cliff cells are half-diamond faces rooted at their upper corner,
             while (sx,sy) is the raised tile center.  Seat the y+1/SW face on
             the tile's left vertex and the x+1/SE face on its right vertex;
             drawing both at center creates the detached wavy ribbons that cut
             across Fallen North plateaus. */
          if (lD > 0) SpriteAssets.drawCliff(ctx,
            SpriteAssets.getFrame(cliffId, 4 + U.clamp(Math.ceil(lD / EH), 1, 4) - 1), sx - 32, sy, lD);
          if (rD > 0) {
            SpriteAssets.drawCliff(ctx,
              SpriteAssets.getFrame(cliffId, U.clamp(Math.ceil(rD / EH), 1, 4) - 1), sx + 32, sy, rD);
          }
        }
        drawTile(ctx,m,x,y,sx,sy);
      }
    }
    if(m.act1Environment)Act1Environment.drawGround(ctx,m,cam,inView,damage);
  }
  function drawSurfaceView(ctx,m,cam,legacy=false){
    const w=ctx.canvas.width,h=ctx.canvas.height;
    let entry=surfaceView;
    const compatible=entry&&entry.map===m&&entry.geometry===m._surfaceGeometry&&entry.legacy===legacy&&entry.w===w&&entry.h===h;
    if(!compatible||
       cam.x<entry.x||cam.y<entry.y||cam.x+w>entry.x+entry.image.width||cam.y+h>entry.y+entry.image.height){
      if(!compatible)releaseSurfaceView();
      const image=compatible?entry.image:canvas(w+VIEW_PAD*2,h+VIEW_PAD*2),g=image.getContext('2d');
      const origin={x:Math.floor(cam.x)-VIEW_PAD,y:Math.floor(cam.y)-VIEW_PAD};
      let damage=null;
      if(compatible){
        const dx=entry.x-origin.x,dy=entry.y-origin.y;
        if(Math.abs(dx)<image.width&&Math.abs(dy)<image.height){
          // Canvas self-copy snapshots the old pixels before moving them.
          // Integer offsets retain their sharpness; copy also clears the newly
          // exposed area. Repaint that area in the usual terrain depth order.
          g.globalCompositeOperation='copy';g.drawImage(image,dx,dy);g.globalCompositeOperation='source-over';
          damage=[];
          if(dx)damage.push({x:dx>0?0:image.width+dx,y:0,w:Math.abs(dx),h:image.height});
          if(dy)damage.push({x:0,y:dy>0?0:image.height+dy,w:image.width,h:Math.abs(dy)});
        }else g.clearRect(0,0,image.width,image.height);
      }
      const margin=96,pad=margin+SpriteAssets.WALL_VIEW_H+TerrainSurface.LIFT*6;
      const u0=(origin.x-margin)/32,u1=(origin.x+image.width+margin)/32;
      const v0=(origin.y-pad)/16,v1=(origin.y+image.height+pad)/16;
      const x0=Math.max(0,Math.floor((u0+v0)/2)-2),x1=Math.min(m.w-1,Math.ceil((u1+v1)/2)+2);
      const y0=Math.max(0,Math.floor((v0-u1)/2)-2),y1=Math.min(m.h-1,Math.ceil((v1-u0)/2)+2);
      const inView=(sx,sy)=>sx>-margin&&sx<image.width+margin&&sy>-margin-SpriteAssets.WALL_VIEW_H&&sy<image.height+margin;
      surfacePolygons=[];
      if(damage){
        // Keep the expensive tile/cliff raster work on a narrow surface. A
        // viewport-sized canvas with a damage clip still made Chrome's GPU
        // rasterizer stall for hundreds of milliseconds on 4K scrolls.
        for(const r of damage){
          const border=2,pw=r.w+border*2,ph=r.h+border*2;
          const patch=surfacePatch||(surfacePatch=canvas(pw,ph));
          if(patch.width!==pw)patch.width=pw;
          if(patch.height!==ph)patch.height=ph;
          const p=patch.getContext('2d');
          p.clearRect(0,0,pw,ph);
          const visible=(sx,sy)=>sx>r.x-border-margin&&sx<r.x+pw+margin&&
            sy>r.y-border-margin-SpriteAssets.WALL_VIEW_H&&sy<r.y+ph+margin;
          const patchDamage=[{x:r.x-border,y:r.y-border,w:pw,h:ph}];
          // Preserve the original camera arithmetic for cliff triangles;
          // changing their local coordinates introduces raster rounding drift.
          p.save();p.translate(border-r.x,border-r.y);
          if(legacy)drawFloor(p,m,origin,x0,x1,y0,y1,visible,false,patchDamage);
          else drawSurface(p,m,origin,x0,x1,y0,y1,visible,false,patchDamage);
          p.restore();
          // Replace, rather than blend, so transparent map edges and the
          // overlap of horizontal/vertical strips retain canonical alpha.
          g.clearRect(r.x,r.y,r.w,r.h);
          g.drawImage(patch,border,border,r.w,r.h,r.x,r.y,r.w,r.h);
        }
        // Occlusion needs all visible geometry, including unchanged pixels.
        // An empty damage list gathers that geometry without submitting art.
        surfacePolygons=[];
        if(!legacy)drawSurface(g,m,origin,x0,x1,y0,y1,inView,false,[]);
      }else{
        if(legacy)drawFloor(g,m,origin,x0,x1,y0,y1,inView,false);
        else drawSurface(g,m,origin,x0,x1,y0,y1,inView,false);
      }
      entry=surfaceView={image,map:m,geometry:m._surfaceGeometry,legacy,w,h,...origin,polygons:surfacePolygons,index:indexPolygons(surfacePolygons)};
      surfaceViewBuilds++;
    }else surfaceViewHits++;
    surfacePolygons=entry.polygons;
    surfaceIndex=entry.index;
    ctx.drawImage(entry.image,entry.x-cam.x,entry.y-cam.y);
  }
  function indexPolygons(polygons){
    const cells=new Map();
    for(let i=0;i<polygons.length;i++){
      const p=polygons[i];
      for(let y=Math.floor(p.top/POLYGON_CELL);y<=Math.floor(p.bottom/POLYGON_CELL);y++)
        for(let x=Math.floor(p.left/POLYGON_CELL);x<=Math.floor(p.right/POLYGON_CELL);x++){
          const key=x+':'+y;let list=cells.get(key);if(!list)cells.set(key,list=[]);list.push(i);
        }
    }
    return {cells,seen:new Uint32Array(polygons.length),stamp:0};
  }
  function nearbyPolygons(sx,sy){
    if(!surfaceIndex)return surfacePolygons;
    const index=surfaceIndex,ids=[];
    if(++index.stamp===0xffffffff){index.seen.fill(0);index.stamp=1;}
    for(let y=Math.floor((sy-252)/POLYGON_CELL);y<=Math.floor((sy+68)/POLYGON_CELL);y++)
      for(let x=Math.floor((sx-160)/POLYGON_CELL);x<=Math.floor((sx+160)/POLYGON_CELL);x++){
        for(const id of index.cells.get(x+':'+y)||[]){
          if(index.seen[id]===index.stamp)continue;index.seen[id]=index.stamp;ids.push(id);
        }
      }
    // Retain the original clipping order and apply each polygon only once,
    // even when it straddles multiple spatial cells.
    ids.sort((a,b)=>a-b);return ids.map(id=>surfacePolygons[id]);
  }
  function clipBehind(ctx,m,cam,x,y,surfaceId=0){
    if(!m.surfaceVersion)return;
    const sx=U.isoX(x,y),sy=U.isoY(x,y)-TerrainSurface.heightAt(m,x,y,surfaceId)*14,h=TerrainSurface.heightAt(m,x,y,surfaceId);
    for(const poly of nearbyPolygons(sx,sy)) {
      if(poly.right<sx-160||poly.left>sx+160||poly.bottom<sy-252||poly.top>sy+68||!poly.points.some(p=>p.z>h+1e-7))continue;
      if(poly.kind==='ground'&&poly.tx===Math.floor(x)&&poly.ty===Math.floor(y))continue;
      const points=TerrainSurface.inFront(poly,x+y);
      if(points.length<3)continue;
      // Intersect complements individually: overlapping faces must stay hidden,
      // whereas one combined even-odd path would expose their intersections.
      ctx.beginPath();ctx.rect(0,0,ctx.canvas.width,ctx.canvas.height);
      ctx.moveTo(points[0].sx-cam.x,points[0].sy-cam.y);
      for(let i=1;i<points.length;i++)ctx.lineTo(points[i].sx-cam.x,points[i].sy-cam.y);
      ctx.closePath();ctx.clip('evenodd');
    }
  }
  const imperialMaterial=key=>material(SpriteAssets.maps.props[key],0,false,true);
  return Object.freeze({beginFrame,drawTile,drawSurfaceTile,drawEnvironmentBackdrop,drawSurface,drawFloor,clipBehind,endFrame,getDiagnostics,imperialMaterial});
})();

/* Complete painted Act I sections follow collision contours. */
const Act1Environment=(()=>{
  const cache=new WeakMap();
  const frame=(kit,part)=>SpriteAssets.getFrame(SpriteAssets.maps.props['a1env_'+kit+'_'+part],0);
  const nature=part=>SpriteAssets.getFrame(SpriteAssets.maps.props['a1polish_'+part],0);
  let shadow;
  function contactShadow(){
    if(shadow)return shadow;
    const image=document.createElement('canvas');image.width=192;image.height=80;
    const g=image.getContext('2d');g.scale(1,.4167);
    const gradient=g.createRadialGradient(96,96,4,96,96,96);gradient.addColorStop(0,'rgba(12,27,40,.32)');gradient.addColorStop(1,'rgba(12,27,40,0)');
    g.fillStyle=gradient;g.fillRect(0,0,192,192);
    return shadow={image,sx:0,sy:0,sw:192,sh:80,anchorX:96,anchorY:40};
  }
  function assembly(m){
    const env=m.act1Environment;let saved=cache.get(env);if(saved)return saved;
    const walls=[],ground=[];
    for(const s of [...env.segments,...(env.facades||[])]){
      if(s.kit==='north')continue;
      const x=s.x+(s.axis?0:s.length/2),y=s.y+(s.axis?s.length/2:0),direction=s.axis?'south':'east';
      const short=s.length<=3&&!['north','ice'].includes(s.kit),span=short?3:s.kit==='north'?4:6;
      const part=short?'end_'+direction:direction+(s.variant===1?'_alt':'');
      const f=frame(s.kit,part),fx=s.x+(s.axis?0:span/2),fy=s.y+(s.axis?span/2:0);
      const cx=U.isoX(x,y),cy=U.isoY(x,y)-s.height*14;
      walls.push({kind:'act1Boundary',d:x+y+.01,x,y,s,f,wx:U.isoX(fx,fy),wy:U.isoY(fx,fy)-s.height*14,cx,cy});
      if(s.length>=3)ground.push({f:frame(s.kit,'ground'),x:cx,y:cy,scale:.48});
    }
    for(const c of env.corners)if(c.kit!=='north'){
      const adjacent=env.segments.filter(s=>s.kit===c.kit&&((s.x===c.x&&s.y===c.y)||(s.x+(s.axis?0:s.length)===c.x&&s.y+(s.axis?s.length:0)===c.y)));
      if(adjacent.filter(s=>s.length>=3).length<2)continue;
      const x=U.isoX(c.x,c.y),y=U.isoY(c.x,c.y)-c.height*14;
      walls.push({kind:'act1Boundary',d:c.x+c.y+.04,x:c.x,y:c.y,s:{kit:c.kit,length:3},f:frame(c.kit,'outer'),wx:x,wy:y,cx:x,cy:y,scale:.78});
    }
    for(const c of env.natural){
      const f=nature(c.part),scale=c.scale;
      walls.push({kind:'act1Boundary',d:c.x+c.y,x:c.x,y:c.y,s:{kit:'north',length:5},f,
        wx:U.isoX(c.x,c.y),wy:U.isoY(c.x,c.y)-c.height*14,cx:U.isoX(c.x,c.y),cy:U.isoY(c.x,c.y)-c.height*14,scale});
      ground.push({f:contactShadow(),x:U.isoX(c.x,c.y)+15,y:U.isoY(c.x,c.y)-c.height*14,scale});
    }
    for(const c of env.dressing){
      if(c.part==='inner')continue;
      const f=c.part==='lamp'?SpriteAssets.getFrame(SpriteAssets.maps.props.frosthaven_firebowl,0):nature(c.part),scale=c.scale;
      const x=U.isoX(c.x,c.y),y=U.isoY(c.x,c.y)-c.height*14;
      walls.push({kind:'act1Boundary',d:c.x+c.y+.05,x:c.x,y:c.y,s:{kit:env.kit,length:2},f,wx:x,wy:y,cx:x,cy:y,scale});
      ground.push({f:contactShadow(),x,y,scale:.7});
    }
    walls.sort((a,b)=>a.d-b.d);saved={walls,ground};cache.set(env,saved);return saved;
  }
  function drawGround(ctx,m,cam,inView,damage=null){
    if(damage&&damage.length===0)return;
    for(const d of assembly(m).ground){
      const x=d.x-cam.x,y=d.y-cam.y;
      if(!inView(x,y))continue;
      if(damage&&!damage.some(r=>x+130>r.x&&x-130<r.x+r.w&&y+100>r.y&&y-100<r.y+r.h))continue;
      const f=d.f,s=d.scale;
      ctx.drawImage(f.image,f.sx,f.sy,f.sw,f.sh,x-f.anchorX*s,y-f.anchorY*s,f.sw*s,f.sh*s);
    }
  }
  function append(draws,m,cam,player,W,H){
    const hx=U.isoX(player.x,player.y)-cam.x,hy=U.isoY(player.x,player.y)-cam.y-TerrainSurface.heightAt(m,player.x,player.y)*14;
    for(const d of assembly(m).walls){
      d.sx=d.wx-cam.x;d.sy=d.wy-cam.y;d.centerX=d.cx-cam.x;d.hx=hx;d.hy=hy;
      const f=d.f,s=d.scale||1;
      if(d.sx-f.anchorX*s>W||d.sx+(f.sw-f.anchorX)*s<0||d.sy-f.anchorY*s>H||d.sy+(f.sh-f.anchorY)*s<0)continue;
      draws.push(d);
    }
  }
  function draw(ctx,d,player){
    const {f,s,sx,sy}=d,alpha=ctx.globalAlpha,scale=d.scale||1;
    if(player.x+player.y<d.d+.5&&Math.abs(d.hx-d.centerX)<s.length*16+24&&d.hy>sy-f.anchorY*scale-14&&d.hy<sy+24)ctx.globalAlpha=alpha*.22;
    if(d.scale)ctx.drawImage(f.image,f.sx,f.sy,f.sw,f.sh,sx-f.anchorX*scale,sy-f.anchorY*scale,f.sw*scale,f.sh*scale);
    else{
      const left=Math.max(0,d.centerX-sx-s.length*16-9+f.anchorX),right=Math.min(f.sw,d.centerX-sx+s.length*16+9+f.anchorX);
      if(right>left)ctx.drawImage(f.image,f.sx+left,f.sy,right-left,f.sh,sx-f.anchorX+left,sy-f.anchorY,right-left,f.sh);
    }
    ctx.globalAlpha=alpha;
  }
  return Object.freeze({drawGround,append,draw});
})();

/* Act II uses complete painted modules along classified collision contours.
   Ground lips are painted into LevelTerrain's cached surface. Upright modules
   share the actor draw list and fade without changing their solid footprint. */
const Act2Boundaries=(()=>{
  const cache=new WeakMap();
  let contact=null,mist=null,glow=null;
  function softSprite(color,w,h){
    const image=document.createElement('canvas');image.width=w;image.height=h;
    const g=image.getContext('2d');g.scale(w/2,h/2);
    const ramp=g.createRadialGradient(1,1,0,1,1,1);ramp.addColorStop(0,color);ramp.addColorStop(1,'transparent');
    g.fillStyle=ramp;g.fillRect(0,0,2,2);return image;
  }
  function assembly(m){
    let saved=cache.get(m.boundaries);if(saved&&saved.visual===m.act2Visual)return saved;
    saved=m.boundaries.segments.map(s=>{
      const kit=s.kit;
      const direction=s.axis?'south':'east';
      // Some generated alternates include taller reeds; keep the low mud lip
      // on the terrain layer and retain complete pieces at the visible scale.
      const part=kit==='masonry'&&s.variant===4&&s.length===3&&!s.axis&&m.id!=='drowned_crypt'?'broken_east':
        kit==='root'&&s.variant===4?'end_'+direction:direction+(s.variant===1||kit==='shore'&&s.axis?'_alt':'');
      const key=kit+'_'+part;
      const f=SpriteAssets.getFrame(SpriteAssets.maps.props['a2boundary_'+key],0);
      const x=s.x+(s.axis?0:s.length/2),y=s.y+(s.axis?s.length/2:0);
      const fx=s.x+(s.axis?0:1.5),fy=s.y+(s.axis?1.5:0);
      // A long return wall can have its midpoint in front of the doorway even
      // though its painted face belongs behind the arch. Seat that joint first.
      const joint=m.thresholds?.find(t=>t.act===2&&!t.opening.axis&&Math.abs(x-t.opening.x)<7&&y<t.opening.y+2&&y>t.opening.y-6);
      const depth=joint?Math.min(x+y+.02,joint.opening.x+joint.opening.y-.1):x+y+.02;
      return {kind:'act2Boundary',d:depth,x,y,s,f,wx:U.isoX(fx,fy),wy:U.isoY(fx,fy),cx:U.isoX(x,y),cy:U.isoY(x,y)};
    });
    saved.sort((a,b)=>a.d-b.d);
    saved.banks=[];
    const f=SpriteAssets.getFrame(SpriteAssets.maps.props.a2boundary_shore_east,0);
    for(const points of m.boundaries.shorelines)for(let i=1;i<points.length;i++){
      const a=points[i-1],b=points[i],ax=U.isoX(a.x,a.y),ay=U.isoY(a.x,a.y),bx=U.isoX(b.x,b.y),by=U.isoY(b.x,b.y);
      saved.banks.push({x:(ax+bx)/2,y:(ay+by)/2,length:Math.hypot(bx-ax,by-ay),angle:Math.atan2(by-ay,bx-ax),f});
    }
    // Sparse, upright growth sits on the blocked side, not on the walking lane.
    for(const s of m.boundaries.segments)if(!m.act2Visual&&s.kit==='shore'&&s.length>=2&&((s.x*7+s.y*13)%11===0)){
      const x=s.x+(s.axis?s.side*.7:s.length/2),y=s.y+(s.axis?s.length/2:s.side*.7);
      const f=SpriteAssets.getFrame(SpriteAssets.maps.props.act2_reed_clump,0),scale=.32+((s.x+s.y)%3)*.06;
      saved.push({kind:'act2Boundary',d:x+y,x,y,s:{...s,kit:'growth'},f,scale,wx:U.isoX(x,y),wy:U.isoY(x,y),cx:U.isoX(x,y),cy:U.isoY(x,y)});
    }
    for(const d of m.act2Visual?.dressing||[]){
      const f=SpriteAssets.getFrame(SpriteAssets.maps.props[d.type],0);
      saved.push({kind:'act2Boundary',d:d.x+d.y,x:d.x,y:d.y,s:{kit:'dressing',length:d.type==='a2visual_cypress'?5:1},f,scale:d.scale,flip:d.flip,tree:d.type==='a2visual_cypress',
        wx:U.isoX(d.x,d.y),wy:U.isoY(d.x,d.y),cx:U.isoX(d.x,d.y),cy:U.isoY(d.x,d.y)});
    }
    saved.visual=m.act2Visual;cache.set(m.boundaries,saved);return saved;
  }
  function paint(ctx,d){
    const {s,f,sx,sy}=d;
    if(d.scale){SpriteAssets.drawFrame(ctx,f,sx,sy,{scale:d.scale,flip:d.flip});return;}
    // These static sprites need only a rectangular source crop. Submit that
    // rectangle directly instead of saving/translating/clipping for every wall.
    const left=Math.max(0,d.centerX-sx-s.length*16-6+f.anchorX);
    const right=Math.min(f.sw,d.centerX-sx+s.length*16+6+f.anchorX),width=right-left,height=Math.min(f.sh,f.anchorY+40);
    if(width>0)ctx.drawImage(f.image,f.sx+left,f.sy,width,height,sx-f.anchorX+left,sy-f.anchorY,width,height);
  }
  function drawGround(ctx,m,cam,inView,damage=null){
    if(damage&&damage.length===0)return;
    if(m.act2Visual){
      ctx.save();
      if(damage){ctx.beginPath();for(const r of damage)ctx.rect(r.x,r.y,r.w,r.h);ctx.clip();}
      ctx.translate(-cam.x,-cam.y);
      // The shoreline is the soft union of land and water in the material
      // chunks. Keep that edge free of repeated props or a grid-shaped outline.
      contact||=softSprite('rgba(2,9,11,.65)',192,80);
      for(const d of assembly(m)){
        if(d.s.kit==='shore'||![-192,0,192].some(dx=>[-64,0,64].some(dy=>inView(d.cx-cam.x+dx,d.cy-cam.y+dy))))continue;
        const scale=d.tree?d.scale*1.6:d.s.kit==='masonry'?.7:.5;
        // Integer registration preserves identical resampling when a narrow
        // camera strip is rasterized into its temporary surface.
        ctx.drawImage(contact,Math.round(d.cx-90*scale),Math.round(d.cy-25*scale),Math.round(192*scale),Math.round(80*scale));
      }
      ctx.restore();return;
    }
    for(const d of assembly(m).banks){
      const x=d.x-cam.x,y=d.y-cam.y;
      if(!inView(x,y))continue;
      if(damage&&!damage.some(r=>x+80>r.x&&x-80<r.x+r.w&&y+80>r.y&&y-80<r.y+r.h))continue;
      ctx.save();ctx.translate(x,y);ctx.rotate(d.angle);ctx.beginPath();ctx.rect(-d.length/2-1,-24,d.length+2,48);ctx.clip();
      // Rotate the flat decal to the contour tangent, without deforming it.
      ctx.rotate(-Math.atan2(221,278));ctx.globalAlpha=.76;SpriteAssets.drawFrame(ctx,d.f,0,0);ctx.restore();
    }
  }
  function append(draws,m,cam,player,W,H){
    for(const d of assembly(m)){
      if(d.s.kit==='shore')continue;
      d.sx=d.wx-cam.x;d.sy=d.wy-cam.y;d.centerX=d.cx-cam.x;
      const f=d.f,scale=d.scale||1;
      if(d.sx-f.anchorX*scale>W||d.sx+(f.sw-f.anchorX)*scale<0||d.sy-f.anchorY*scale>H||d.sy+(f.sh-f.anchorY)*scale<0)continue;
      d.hx=U.isoX(player.x,player.y)-cam.x;d.hy=U.isoY(player.x,player.y)-cam.y;
      draws.push(d);
    }
  }
  function draw(ctx,d,player){
    const alpha=ctx.globalAlpha;
    if(player.x+player.y<d.d+.5&&Math.abs(d.hx-d.centerX)<(d.tree?d.f.sw*d.scale*.4:d.s.length*16+22)&&d.hy>d.sy-d.f.anchorY*(d.scale||1)-12&&d.hy<d.sy+20)ctx.globalAlpha=alpha*.24;
    paint(ctx,d);ctx.globalAlpha=alpha;
  }
  function atmosphere(ctx,m,cam,W,H,time){
    if(!m.act2Visual)return;
    mist||=softSprite('rgba(139,183,179,.14)',384,96);
    glow||=softSprite('rgba(255,186,94,.55)',128,128);
    ctx.save();
    const x0=Math.floor((cam.x/64+cam.y/32)/8)*8,y0=Math.floor((cam.y/32-(cam.x+W)/64)/8)*8;
    const count=Math.ceil((W/64+H/32)/8)+3;
    // A few world-anchored wisps drift over water. No screen-locked fog sheet.
    for(let y=y0;y<y0+count*8;y+=8)for(let x=x0;x<x0+count*8;x+=8){
      if(x<0||y<0||x>=m.w||y>=m.h||!m.act2?.water[x+y*m.w]||((x*7+y*13)%24!==0))continue;
      const sx=U.isoX(x,y)-cam.x+Math.sin(time*.11+x)*38,sy=U.isoY(x,y)-cam.y;
      if(sx<-300||sy<-100||sx>W+300||sy>H+100)continue;
      ctx.drawImage(mist,sx-260,sy-58,520,116);
    }
    ctx.globalCompositeOperation='screen';
    for(const l of m.act2Visual.lamps){
      const x=U.isoX(l.x,l.y)-cam.x,y=U.isoY(l.x,l.y)-cam.y-22;
      if(x<-80||x>W+80||y<-80||y>H+80)continue;
      ctx.globalAlpha=.68+Math.sin(time*3+l.x)*.08;ctx.drawImage(glow,x-48,y-48,96,96);
    }
    ctx.restore();
  }
  return Object.freeze({drawGround,append,draw,atmosphere});
})();

/* Painted masonry is depth-sorted with actors. Decks are separate surfaces,
   never solid cliff columns, so the route beneath stays visible and usable. */
const ImperialArchitecture=(()=>{
  const frame=key=>SpriteAssets.getFrame(SpriteAssets.maps.props['act3_arch_'+key],0);
  const planes=new WeakMap(),assemblies=new WeakMap();
  function assembly(m){
    const key=m._surfaceGeometry;
    let cached=assemblies.get(key);if(cached)return cached;
    const art=m.act3.architecture;
    const walls=(m.act3.environment?[]:art.walls).map(wall=>{
      const x=wall.x+(wall.axis?0:wall.length/2),y=wall.y+(wall.axis?wall.length/2:0);
      const a=TerrainSurface.heightAt(m,wall.x-.01,wall.y-.01,0),b=TerrainSurface.heightAt(m,wall.x+.01,wall.y+.01,0);
      return {kind:'imperialWall',d:x+y,wx:U.isoX(x,y),wy:U.isoY(x,y)-Math.min(a,b)*14,wall,kit:wall.kit||(m.outdoor?'rock':art.kit)};
    });
    const sockets=new Map();
    for(const d of walls)if(d.kit!=='rock'){
      const w=d.wall;
      for(const [x,y] of [[w.x,w.y],[w.x+(w.axis?0:w.length),w.y+(w.axis?w.length:0)]]){
        const key=x+':'+y;let n=sockets.get(key);
        if(!n)sockets.set(key,n={x,y,kit:d.kit,axes:new Set()});n.axes.add(w.axis);
      }
    }
    for(const n of sockets.values())if(n.axes.size===2){
      const z=Math.min(...[-.01,.01].flatMap(dx=>[-.01,.01].map(dy=>TerrainSurface.heightAt(m,n.x+dx,n.y+dy,0))));
      walls.push({kind:'imperialCap',d:n.x+n.y+.01,wx:U.isoX(n.x,n.y),wy:U.isoY(n.x,n.y)-z*14,kit:n.kit,wall:{length:1}});
    }
    const bridges=[...art.bridges,...(art.terraces||[])].map(bridge=>{
      const v=bridge.terrace?m:m.layers[1],rails=[],supports=[];
      for(const x of bridge.terrace?[]:[bridge.x-4.5,bridge.x+6.5])for(const y of [bridge.y0+.5,bridge.y1-.5])
        supports.push({kind:'imperialSupport',d:x+y,x,y,wx:U.isoX(x,y),wy:U.isoY(x,y)});
      for(let x=bridge.lo+1.5;x<bridge.hi-1.5;x+=1.5)for(const y of [bridge.y0,bridge.y1]){
        const z=TerrainSurface.heightAt(v,x,Math.min(bridge.y1-.01,Math.max(bridge.y0+.01,y)));
        rails.push({kind:'imperialRail',d:x+y,x,y,wx:U.isoX(x,y),wy:U.isoY(x,y)-z*14});
      }
      return {bridge,rails,supports};
    });
    cached={walls,bridges};assemblies.set(key,cached);return cached;
  }
  function plane(m,bridge){
    const v=bridge.terrace?m:m.layers[1],key=v._surfaceGeometry;
    let cached=planes.get(key);if(cached)return cached;
    const cells=[];let left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity;
    for(let y=bridge.y0;y<bridge.y1;y++)for(let x=bridge.lo;x<bridge.hi;x++){
      const g=TerrainSurface.tileGeometry(v,x,y);cells.push({kind:'imperialDeck',x,y,g,bridge,under:false});
      for(const p of g.top.points){left=Math.min(left,p.sx);right=Math.max(right,p.sx);top=Math.min(top,p.sy);bottom=Math.max(bottom,p.sy+8);}
    }
    left=Math.floor(left)-2;top=Math.floor(top)-2;
    const image=document.createElement('canvas');image.width=Math.ceil(right-left)+4;image.height=Math.ceil(bottom-top)+4;
    const ctx=image.getContext('2d'),cam={x:left,y:top};
    cells.sort((a,b)=>a.x+a.y-b.x-b.y);for(const cell of cells)draw(ctx,cell,m,cam,{});
    cached={image,left,top};planes.set(key,cached);return cached;
  }
  function append(draws,m,cam,player,W,H){
    const art=assembly(m);
    const hx=U.isoX(player.x,player.y)-cam.x,hy=U.isoY(player.x,player.y)-cam.y-TerrainSurface.heightAt(m,player.x,player.y,player.surfaceId)*14;
    for(const d of art.walls){
      const {wall}=d,sx=d.wx-cam.x,sy=d.wy-cam.y;
      if(sx< -180||sx>W+180||sy< -50||sy>H+180)continue;
      d.sx=sx;d.sy=sy;d.hx=hx;d.hy=hy;draws.push(d);
    }
    for(const {bridge,rails,supports} of art.bridges){
      const under=!bridge.terrace&&player.surfaceId!==1&&player.x>=bridge.lo&&player.x<bridge.hi&&player.y>bridge.y0-2&&player.y<bridge.y1+2;
      const cached=plane(m,bridge);
      if(cached.left-cam.x<W&&cached.left-cam.x+cached.image.width>0&&cached.top-cam.y<H&&cached.top-cam.y+cached.image.height>0)
        draws.push({kind:'imperialPlane',d:bridge.terrace?-Infinity:bridge.x+bridge.y,plane:cached,under,bridge});
      for(const list of [supports,rails])for(const d of list){
        d.sx=d.wx-cam.x;d.sy=d.wy-cam.y;d.under=under;
        if(d.sx>-100&&d.sx<W+100&&d.sy>-60&&d.sy<H+160)draws.push(d);
      }
    }
  }
  function draw(ctx,d,m,cam,player){
    ctx.save();
    if(d.kind==='imperialPlane'){
      if(d.under)ctx.globalAlpha=.18;
      ctx.drawImage(d.plane.image,d.plane.left-cam.x,d.plane.top-cam.y);
    }else if(d.kind==='imperialWall'){
      const w=d.wall,f=frame(d.kit+'_'+(w.broken?'broken':w.axis?'south':'east'));
      if(Math.abs(d.hx-d.sx)<w.length*32+24&&d.hy>d.sy-f.sh&&d.hy<d.sy+30&&player.x+player.y<d.d+1)ctx.globalAlpha=.24;
      // Crop short end runs; preserve the painting's scale and masonry size.
      const fullX=w.x+(w.axis?0:1.5),fullY=w.y+(w.axis?1.5:0),sx=U.isoX(fullX,fullY)-cam.x;
      const sy=d.sy+(3-w.length)*8;
      if(w.length<3){ctx.beginPath();ctx.rect(d.sx-w.length*16-9,d.sy-200,w.length*32+18,240);ctx.clip();}
      SpriteAssets.drawFrame(ctx,f,sx,sy+16);
    }else if(d.kind==='imperialCap'){
      if(Math.abs(d.hx-d.sx)<30&&d.hy>d.sy-75&&d.hy<d.sy+25&&player.x+player.y<d.d+1)ctx.globalAlpha=.24;
      SpriteAssets.drawFrame(ctx,frame(d.kit+'_pillar'),d.sx,d.sy+10,{scale:.55});
    }else if(d.kind==='imperialRail'){
      if(d.under)ctx.globalAlpha=.18;
      SpriteAssets.drawFrame(ctx,frame('bridge_parapet'),d.sx,d.sy+5,{scale:.55});
    }else if(d.kind==='imperialSupport'){
      const f=frame(m.act3.architecture.kit+'_pillar'),scale=112/(f.sh-8);
      SpriteAssets.drawFrame(ctx,f,d.sx,d.sy,{scale});
    }else{
      const v=d.bridge.terrace?m:m.layers[1],g=d.g,under=d.under;
      if(under)ctx.globalAlpha=.18;
      // Only the slab fascia is solid; nothing fills the space beneath it.
      const cliff=SpriteAssets.maps.cliffs[m.zone.theme]||SpriteAssets.maps.cliffs.fields;
      for(const [a,b,facing] of [[g.top.points[1],g.top.points[2],0],[g.top.points[3],g.top.points[2],4]]){
        const points=[a,b,{...b,sy:b.sy+7,z:b.z-.5},{...a,sy:a.sy+7,z:a.z-.5}];
        SpriteAssets.drawCliffPolygon(ctx,SpriteAssets.getFrame(cliff,facing),points,cam);
      }
      const f=frame('deckmaterial_material'),[a,b,,c]=g.top.points;
      ctx.transform((b.sx-a.sx)/64,(b.sy-a.sy)/64,(c.sx-a.sx)/64,(c.sy-a.sy)/64,a.sx-cam.x,a.sy-cam.y);
      ctx.drawImage(f.image,f.sx+(d.x%4)*64,f.sy+(d.y%2)*64,64,64,-.3,-.3,64.6,64.6);
    }
    ctx.restore();
  }
  return {append,draw};
})();

/* Act III's connected paintings use registered foundations, never stretched
   terrain faces. Assemblies are immutable and cached by environment identity. */
const ImperialEnvironment=(()=>{
  const cache=new WeakMap(),textures=new Map(),wallFrames=new Map(),softFrames=new Map();
  function materialKey(m){return 'a3visual_'+(m.outdoor||m.settlement?'sand':m.id==='khal_palace'?'palace':m.id==='underground_market'?'sandstone':'slate');}
  function texture(key,soft=false){
    const id=key+':'+soft;if(textures.has(id))return textures.get(id);
    const f=SpriteAssets.getFrame(SpriteAssets.maps.props['a3visual_'+key],0);
    const image=document.createElement('canvas');image.width=f.sw;image.height=f.sh;
    const g=image.getContext('2d');g.drawImage(f.image,f.sx,f.sy,f.sw,f.sh,0,0,f.sw,f.sh);
    if(soft){
      // Only the outer paving margin fades; the actual inlay remains intact.
      g.globalCompositeOperation='destination-in';
      const mask=g.createRadialGradient(f.sw/2,f.sh/2,f.sw*.42,f.sw/2,f.sh/2,f.sw*.51);
      mask.addColorStop(0,'white');mask.addColorStop(1,'transparent');g.fillStyle=mask;g.fillRect(0,0,f.sw,f.sh);
    }
    textures.set(id,image);return image;
  }
  function decorateFloor(g,m,ox,oy,size,tile,material){
    const outdoor=m.outdoor||!!m.settlement,palace=m.id==='khal_palace',tomb=!outdoor&&m.id!=='underground_market'&&!palace;
    const routes=m.settlement?.routes||m.act3.routes;
    g.save();g.translate(-ox,-oy);
    // Quiet, large-scale variation leaves silhouettes and attack cues readable.
    for(let y=Math.floor(oy/384)-1;y<=Math.ceil((oy+size)/384);y++)for(let x=Math.floor(ox/384)-1;x<=Math.ceil((ox+size)/384);x++){
      const px=x*384+Math.sin(y*3.7+x)*120,py=y*384+Math.cos(x*2.3-y)*110,r=280;
      const light=g.createRadialGradient(px,py,0,px,py,r);
      light.addColorStop(0,outdoor?'rgba(234,206,159,.19)':'rgba(11,23,29,.15)');light.addColorStop(1,'transparent');
      g.fillStyle=light;g.fillRect(px-r,py-r,r*2,r*2);
    }
    const path=new Path2D();
    for(const ro of routes)ro.points.forEach((p,i)=>i?path.lineTo(p.x*tile,p.y*tile):path.moveTo(p.x*tile,p.y*tile));
    g.lineJoin='round';g.lineCap='round';
    if(outdoor){
      // One continuous buried road replaces repeated isolated paving stamps.
      const layer=document.createElement('canvas');layer.width=layer.height=size;const p=layer.getContext('2d');
      p.translate(-ox,-oy);p.lineJoin=p.lineCap='round';p.lineWidth=3.5*tile;p.strokeStyle='white';p.filter='blur(7px)';p.stroke(path);
      p.filter='none';p.globalCompositeOperation='source-in';p.fillStyle=p.createPattern(material('a3visual_sandstone'),'repeat');p.fillRect(ox,oy,size,size);
      g.save();g.globalAlpha=.76;g.drawImage(layer,ox,oy);g.restore();
    }else{
      const colors=tomb?['rgba(4,10,15,.6)','rgba(136,117,77,.48)','rgba(13,24,29,.65)']:['rgba(47,38,26,.42)','rgba(181,145,82,.64)','rgba(29,70,72,.62)'];
      for(const [i,w] of [3.9,3.73,3.54].entries()){g.lineWidth=w*tile;g.strokeStyle=colors[i];g.stroke(path);}
      g.lineWidth=3.25*tile;g.strokeStyle=g.createPattern(material(tomb?'a3visual_slate':'a3visual_sandstone'),'repeat');g.stroke(path);
    }
    for(const n of m.act3.landmarks){
      const x=n.x*tile,y=n.y*tile,span=Math.min(n.rx||6,n.ry||6)*tile*(outdoor?1.18:1.40);
      if(x+span<ox||x-span>ox+size||y+span<oy||y-span>oy+size)continue;
      const heroInlay=palace&&['audience','throne'].includes(n.id)||m.id==='tomb_sanctum'&&['ossuary','sovereign'].includes(n.id)||m.id==='sand_tombs'&&n.id==='engine'||m.id==='desert_wastes'&&['caravan','palace'].includes(n.id)||m.id==='underground_market'&&n.id==='bazaar';
      if(heroInlay){const tex=texture(tomb?'eclipse':'sun',true);g.drawImage(tex,x-span/2,y-span/2,span,span);}
      // Wind-blown sand collects along the edges, never as a tile per urn.
      if(!palace){
        const r=(outdoor?5:3)*tile,px=x-(n.rx||5)*tile*.65,py=y+(n.ry||5)*tile*.64;
        const drift=g.createRadialGradient(px,py,0,px,py,r);drift.addColorStop(0,outdoor?'rgba(223,189,135,.18)':'rgba(180,145,94,.18)');drift.addColorStop(1,'transparent');
        g.fillStyle=drift;g.fillRect(px-r,py-r,r*2,r*2);
      }
    }
    for(const p of m.props){
      if(p.hidden||!p.building&&!p.imperialLamp)continue;
      const x=(p.x+1)*tile,y=(p.y+1.2)*tile,r=(p.building?4.3:1.4)*tile;
      if(x+r<ox||x-r>ox+size||y+r<oy||y-r>oy+size)continue;
      const shade=g.createRadialGradient(x,y,0,x,y,r);shade.addColorStop(0,'rgba(10,17,23,.43)');shade.addColorStop(.4,'rgba(17,23,29,.22)');shade.addColorStop(1,'transparent');
      g.fillStyle=shade;g.fillRect(x-r,y-r,r*2,r*2);
    }
    g.restore();
  }
  function wallFrame(s){
    const span=s.length*32,slope=s.axis?-.5:.5,front=s.side>0,fullHeight=s.material==='palace'?148:132,height=front?30:fullHeight;
    const uv=((s.axis?-s.y-s.length:s.x)*32%384+384)%384;
    const key=[s.material,s.axis,front,span,uv,s.end0,s.end1].join(':');if(wallFrames.has(key))return wallFrames.get(key);
    const image=document.createElement('canvas');image.width=span+20;image.height=height+span/2+20;
    const g=image.getContext('2d'),base=height+10+Math.max(0,-slope*span),tx=(s.axis?-8:8)*(front?-1:1),ty=front?8:-8;
    g.transform(1,slope,0,1,10,base);
    g.save();g.beginPath();g.rect(-.5,-height,span+1,height);g.clip();
    const tex=texture('wall_'+s.material),renderHeight=fullHeight;
    // The same UV phase follows each uninterrupted world axis. Foreground
    // cutaways retain only the solid base courses, not squashed whole arches.
    for(let x=-uv;x<span;x+=384)g.drawImage(tex,x,-renderHeight,384,renderHeight);
    g.restore();
    g.fillStyle=s.axis?'rgba(15,27,34,.16)':'rgba(232,194,126,.045)';g.fillRect(-.5,-height,span+1,height);
    const top={sandstone:'#a18b69',tomb:'#746854',palace:'#bbb095',sovereign:'#535d60'}[s.material];
    for(const [end,x] of [[s.end0,0],[s.end1,span]])if(end){
      g.beginPath();g.moveTo(x,-height);g.lineTo(x+tx,-height+ty);g.lineTo(x+tx,ty);g.lineTo(x,0);g.closePath();g.fillStyle=s.material==='palace'?'#777160':s.material==='sovereign'?'#29343a':'#605441';g.fill();
    }
    g.beginPath();g.moveTo(0,-height);g.lineTo(span,-height);g.lineTo(span+tx,-height+ty);g.lineTo(tx,-height+ty);g.closePath();g.fillStyle=top;g.fill();
    g.strokeStyle='rgba(225,213,176,.28)';g.lineWidth=1;g.stroke();
    g.fillStyle='rgba(9,16,20,.5)';g.fillRect(-.5,-3,span+1,3);
    const f={image,sx:0,sy:0,sw:image.width,sh:image.height,anchorX:10+span/2,anchorY:base+slope*span/2,id:SpriteAssets.maps.props['a3visual_wall_'+s.material],visualKey:key};
    wallFrames.set(key,f);if(wallFrames.size>512)wallFrames.delete(wallFrames.keys().next().value);return f;
  }
  function softNatural(f,dune){
    const key=f.id+':'+dune;if(softFrames.has(key))return softFrames.get(key);
    const image=document.createElement('canvas');image.width=f.sw;image.height=f.sh;const g=image.getContext('2d');
    g.drawImage(f.image,f.sx,f.sy,f.sw,f.sh,0,0,f.sw,f.sh);g.globalCompositeOperation='destination-in';
    if(dune){g.save();g.scale(f.sw,f.sh);const mask=g.createRadialGradient(.5,.43,.2,.5,.43,.55);mask.addColorStop(0,'white');mask.addColorStop(1,'transparent');g.fillStyle=mask;g.fillRect(0,0,1,1);g.restore();}
    else{const mask=g.createLinearGradient(0,f.sh*.65,0,f.sh);mask.addColorStop(0,'white');mask.addColorStop(1,'transparent');g.fillStyle=mask;g.fillRect(0,0,f.sw,f.sh);}
    const result={...f,image,sx:0,sy:0};softFrames.set(key,result);return result;
  }
  function assembly(m){
    const e=m.act3.environment;let result=cache.get(e);if(result)return result;
    const parts=[],ground=[];
    const add=(list,asset,x,y,extra={})=>{
      const f=SpriteAssets.getFrame(SpriteAssets.maps.props[asset],0);
      const z=TerrainSurface.heightAt(m,Math.max(0,Math.min(m.w-.01,x)),Math.max(0,Math.min(m.h-.01,y)),0);
      list.push({kind:'imperialEnvironment',asset,f,x,y,d:x+y,wx:U.isoX(x,y),wy:U.isoY(x,y)-z*14,...extra});
    };
    const joints=new Map();
    for(const s of e.segments)for(const p of s.connections){const k=p.x+':'+p.y;if(!joints.has(k))joints.set(k,[]);joints.get(k).push(s);}
    for(const s of e.segments){
      const x=s.x+(s.axis?0:s.length/2),y=s.y+(s.axis?s.length/2:0);
      if(e.outdoor){
        continue;
      }else{
        const ends=s.connections.map(p=>(joints.get(p.x+':'+p.y)||[]).every(v=>v===s||v.side!==s.side));
        add(parts,'a3visual_wall_'+s.material,x,y,{span:s.length,f:wallFrame({...s,end0:ends[s.axis?1:0],end1:ends[s.axis?0:1]}),wall:true});
      }
    }
    for(const [i,p] of (e.natural||[]).entries()){
      const dune=p.material==='dune';if(dune&&i%3===1)continue;
      const asset='a3env_'+p.material+'_'+p.part,f=softNatural(SpriteAssets.getFrame(SpriteAssets.maps.props[asset],0),dune);
      add(dune?ground:parts,asset,p.x,p.y,{natural:true,span:5,scale:p.scale*(dune?1.7:1.04),f});
    }
    for(const t of e.passages){
      for(const p of t.parts||[])add(parts,p.asset,p.x,p.y,{span:p.span,doorJoin:true});
      const o=t.opening,asset='a3passage_'+t.family+'_'+(t.interior?'in':'out')+'_'+(o.axis?'south':'east');
      add(parts,asset,o.x,o.y,{span:o.halfWidth*2,passage:t});
    }
    for(const f of e.foundations)add(ground,f.asset,f.x,f.y,{scale:f.scale*.75});
    result={parts,ground};cache.set(e,result);return result;
  }
  function drawGround(ctx,m,cam,inView,damage=null){
    if(damage&&damage.length===0)return;
    for(const d of assembly(m).ground){
      const x=d.wx-cam.x,y=d.wy-cam.y;
      const f=d.f,s=d.scale||1;
      const left=x-f.anchorX*s,top=y-f.anchorY*s;
      // Damage patches translate world-view coordinates onto a narrow canvas.
      // Their explicit rectangle, rather than canvas width, owns the culling.
      if(!damage&&(left>ctx.canvas.width||left+f.sw*s<0||top>ctx.canvas.height||top+f.sh*s<0))continue;
      if(damage&&!damage.some(r=>left+f.sw*s>r.x&&left<r.x+r.w&&top+f.sh*s>r.y&&top<r.y+r.h))continue;
      if(s===1)ctx.drawImage(f.image,f.sx,f.sy,f.sw,f.sh,x-f.anchorX,y-f.anchorY,f.sw,f.sh);
      else SpriteAssets.drawFrame(ctx,f,x,y,{scale:s});
    }
  }
  function append(draws,m,cam,player,W,H){
    const hx=U.isoX(player.x,player.y)-cam.x,hy=U.isoY(player.x,player.y)-cam.y-TerrainSurface.heightAt(m,player.x,player.y,0)*14;
    for(const d of assembly(m).parts){
      const scale=d.scale||1,f=d.f;d.sx=d.wx-cam.x;d.sy=d.wy-cam.y;
      if(d.sx-f.anchorX*scale>W||d.sx+(f.sw-f.anchorX)*scale<0||d.sy-f.anchorY*scale>H||d.sy+(f.sh-f.anchorY)*scale<0)continue;
      d.hx=hx;d.hy=hy;draws.push(d);
    }
  }
  function draw(ctx,d,player){
    const alpha=ctx.globalAlpha;
    const covered=player.x+player.y<d.d+.3&&Math.abs(d.hx-d.sx)<d.span*16+12&&d.hy>d.sy-d.f.anchorY&&d.hy<d.sy+18;
    // Passage openings are empty pixels; only their jambs/lintel conceal actors.
    const open=d.passage&&Math.abs(d.hx-d.sx)<d.passage.opening.halfWidth*19&&d.hy>d.sy-65;
    if(covered&&!open)ctx.globalAlpha=alpha*.25;
    const f=d.f,s=d.scale||1;
    if(s===1)ctx.drawImage(f.image,f.sx,f.sy,f.sw,f.sh,d.sx-f.anchorX,d.sy-f.anchorY,f.sw,f.sh);
    else SpriteAssets.drawFrame(ctx,f,d.sx,d.sy,{scale:s});
    ctx.globalAlpha=alpha;
  }
  return Object.freeze({materialKey,decorateFloor,drawGround,append,draw});
})();
/* Complete painted Act V modules. Assembly is cached by map metadata; only
   visible upright pieces enter the actor depth list. No stretched wall faces. */
const CindersBoundaries=(()=>{
  const cache=new WeakMap();
  const batchImages=new Map();let batchPixels=0,batchFrame=0,batchBuilds=0,lastBatches=0,lastIndividuals=0;
  const MAX_BATCH_PIXELS=12_000_000;
  const frame=(kit,part)=>SpriteAssets.getFrame(SpriteAssets.maps.props['a5env_'+kit+'_'+part],0);
  function assembly(m){
    const env=m.act5Environment;let saved=cache.get(env);if(saved)return saved;
    const walls=[],ground=[];
    function piece(s,part,x,y,span,scale=1,crop=0){
      const f=frame(s.kit,part),wx=U.isoX(x,y),wy=U.isoY(x,y)-(s.height||0)*14;
      walls.push({kind:'act5Boundary',d:x+y+.02,x,y,f,wx,wy,scale,span,crop,kit:s.kit});
    }
    const naturalPlaced=[];
    for(const s of env.segments){
      const dir=s.axis?'south':'east',natural=s.kit==='biome',short=s.length<=3&&!natural;
      if(natural){
        const x=s.x+(s.axis?s.side*.65:s.length/2),y=s.y+(s.axis?s.length/2:s.side*.65);
        if(naturalPlaced.some(p=>Math.hypot(x-p.x,y-p.y)<2.8))continue;
        naturalPlaced.push({x,y});
        const part=s.variant===2?'broken_'+dir:s.variant%2?dir+'_alt':dir;
        // Broad, low slopes belong to the cached terrain. Only the taller
        // boulder clusters below need per-frame depth sorting and fading.
        ground.push({f:frame(s.kit,part),x:U.isoX(x,y),y:U.isoY(x,y)-s.height*14,scale:.95+(s.variant%3)*.08});
        continue;
      }
      const span=short?3:natural?4:6;
      const part=short?'end_'+dir:s.variant===2?'broken_'+dir:s.variant===1?dir+'_alt':dir;
      // A cropped remainder stays rooted at the original module's socket.
      const x=s.x+(s.axis?0:span/2),y=s.y+(s.axis?span/2:0);
      const f=frame(s.kit,part),cx=U.isoX(s.x+(s.axis?0:s.length/2),s.y+(s.axis?s.length/2:0));
      piece(s,part,x,y,s.length,1,s.length<span?{center:cx,width:s.length*32+14}:0);
    }
    for(const c of env.corners){
      // Natural turns are covered by their broad bank ends. Masonry uses a
      // compact authored joint, preventing double-width overlapping L wings.
      if(c.kit==='biome')continue;
      piece(c,'pillar',c.x,c.y,1.4,.9);
    }
    for(const s of env.dressing)piece(s,s.part,s.x,s.y,3,s.scale);
    for(const d of env.ground)ground.push({f:frame(d.kit,'ground'),x:U.isoX(d.x,d.y),y:U.isoY(d.x,d.y)-(d.height||0)*14,scale:d.scale});
    walls.sort((a,b)=>a.d-b.d);
    const depthBands=new Map(),bands=[];
    for(const d of walls){const key=Math.floor(d.d/6);if(!depthBands.has(key))depthBands.set(key,[]);depthBands.get(key).push(d);}
    for(const members of depthBands.values()){
      // Separate horizontally disjoint wall groups. A single image spanning
      // opposite sides of a room wastes memory and makes an actor standing in
      // the empty middle unnecessarily disable caching for both walls.
      const bounds=members.map(d=>{
        const f=d.f,s=d.scale;
        let left=d.wx-f.anchorX*s,right=left+f.sw*s;
        if(d.crop){left=Math.max(left,d.crop.center-d.crop.width/2);right=Math.min(right,d.crop.center+d.crop.width/2);}
        return {d,left,right,top:d.wy-f.anchorY*s,bottom:d.wy+(f.sh-f.anchorY)*s};
      }).sort((a,b)=>a.left-b.left);
      let b;
      for(const a of bounds){
        if(!b||a.left>b.right+1){b={kind:'act5Boundary',batch:true,members:[],left:a.left,top:a.top,right:a.right,bottom:a.bottom,min:a.d.d,max:a.d.d};bands.push(b);}
        b.members.push(a.d);b.left=Math.min(b.left,a.left);b.right=Math.max(b.right,a.right);b.top=Math.min(b.top,a.top);b.bottom=Math.max(b.bottom,a.bottom);b.min=Math.min(b.min,a.d.d);b.max=Math.max(b.max,a.d.d);
      }
    }
    for(const b of bands){b.members.sort((a,b)=>a.d-b.d);b.left=Math.floor(b.left);b.top=Math.floor(b.top);b.right=Math.ceil(b.right);b.bottom=Math.ceil(b.bottom);b.d=b.max;}
    saved={walls,ground,bands};cache.set(env,saved);return saved;
  }
  function drawGround(ctx,m,cam,inView,damage=null){
    if(damage&&damage.length===0)return;
    for(const d of assembly(m).ground){
      const x=d.x-cam.x,y=d.y-cam.y,f=d.f,s=d.scale;
      const left=x-f.anchorX*s,top=y-f.anchorY*s,w=f.sw*s,h=f.sh*s;
      if(!inView(x,y))continue;
      if(damage&&!damage.some(r=>left+w>r.x&&left<r.x+r.w&&top+h>r.y&&top<r.y+r.h))continue;
      ctx.drawImage(f.image,f.sx,f.sy,f.sw,f.sh,left,top,w,h);
    }
  }
  function append(draws,m,cam,player,W,H){
    const frameId=++batchFrame;
    lastBatches=lastIndividuals=0;
    const hx=U.isoX(player.x,player.y)-cam.x,hy=U.isoY(player.x,player.y)-cam.y-TerrainSurface.heightAt(m,player.x,player.y,player.surfaceId)*14;
    const scene=draws.slice(),art=assembly(m);
    function individual(d){
      const f=d.f,s=d.scale;d.sx=d.wx-cam.x;d.sy=d.wy-cam.y;d.hx=hx;d.hy=hy;
      if(d.sx-f.anchorX*s>W||d.sx+(f.sw-f.anchorX)*s<0||d.sy-f.anchorY*s>H||d.sy+(f.sh-f.anchorY)*s<0)return;
      d.cropX=d.crop?d.crop.center-cam.x:0;draws.push(d);lastIndividuals++;
    }
    for(const b of art.bands){
      if(b.right<cam.x||b.left>cam.x+W||b.bottom<cam.y||b.top>cam.y+H)continue;
      // A band is flattened only if no other drawable must interleave with
      // it, and no member needs hero fading. Dynamic bands retain exact sorting.
      const interleaves=m.act5Environment.unbatched||scene.some(d=>d.d>=b.min&&d.d<=b.max&&
        (!Number.isFinite(d.sx)||d.sx+cam.x>b.left-260&&d.sx+cam.x<b.right+260));
      const fades=b.members.some(d=>player.x+player.y<d.d+.5&&Math.abs(hx-(d.crop?d.crop.center:d.wx)+cam.x)<d.span*16+22&&hy>d.wy-cam.y-d.f.anchorY*d.scale&&hy<d.wy-cam.y+22);
      if(interleaves||fades||b.members.length<2){for(const d of b.members)individual(d);continue;}
      b.frame=frameId;
      b.sx=b.left-cam.x;b.sy=b.top-cam.y;draws.push(b);lastBatches++;
    }
  }
  function raster(b){
    if(!b.image){
      const image=document.createElement('canvas');image.width=b.right-b.left;image.height=b.bottom-b.top;const ctx=image.getContext('2d');
      for(const d of b.members)draw(ctx,{...d,sx:d.wx-b.left,sy:d.wy-b.top,cropX:d.crop?d.crop.center-b.left:0},null);
      b.image=image;batchPixels+=image.width*image.height;batchBuilds++;
    }
    batchImages.delete(b);batchImages.set(b,true);
    while(batchPixels>MAX_BATCH_PIXELS&&batchImages.size>1){const old=batchImages.keys().next().value;if(old.frame===batchFrame)break;batchImages.delete(old);batchPixels-=old.image.width*old.image.height;old.image.width=old.image.height=0;old.image=null;}
    return b.image;
  }
  const mergedImages=new Map(),renderIds=new WeakMap();let nextRenderId=0,mergedPixels=0,mergedBuilds=0;
  function merge(draws,m,cam,player){
    if(m.act5Environment.outdoor||m.act5Environment.unbatched)return;
    const result=[],run=[];
    const flush=()=>{
      if(run.length<3){result.push(...run);run.length=0;return;}
      const key=run.map(d=>{if(!renderIds.has(d))renderIds.set(d,++nextRenderId);return renderIds.get(d);}).join(',');
      let b=mergedImages.get(key);
      if(!b){
        const raw=run.flatMap(d=>d.batch?d.members:[d]);
        let left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity;
        for(const d of raw){const f=d.f,s=d.scale;let l=d.wx-f.anchorX*s,r=l+f.sw*s;if(d.crop){l=Math.max(l,d.crop.center-d.crop.width/2);r=Math.min(r,d.crop.center+d.crop.width/2);}left=Math.min(left,l);right=Math.max(right,r);top=Math.min(top,d.wy-f.anchorY*s);bottom=Math.max(bottom,d.wy+(f.sh-f.anchorY)*s);}
        left=Math.floor(left);top=Math.floor(top);right=Math.ceil(right);bottom=Math.ceil(bottom);
        if((right-left)*(bottom-top)>3_000_000){result.push(...run);run.length=0;return;}
        const image=document.createElement('canvas');image.width=right-left;image.height=bottom-top;const ctx=image.getContext('2d');
        for(const d of raw)draw(ctx,{...d,sx:d.wx-left,sy:d.wy-top,cropX:d.crop?d.crop.center-left:0},null);
        b={kind:'act5Boundary',batch:true,merged:true,image,left,top,d:run[run.length-1].d};mergedPixels+=image.width*image.height;mergedBuilds++;
      }
      b.frame=batchFrame;mergedImages.delete(key);mergedImages.set(key,b);
      while(mergedPixels>24_000_000&&mergedImages.size>1){const oldKey=mergedImages.keys().next().value,old=mergedImages.get(oldKey);if(old.frame===batchFrame)break;mergedImages.delete(oldKey);mergedPixels-=old.image.width*old.image.height;old.image.width=old.image.height=0;}
      b.sx=b.left-cam.x;b.sy=b.top-cam.y;result.push(b);run.length=0;
    };
    for(const d of draws){
      const fading=d.kind==='act5Boundary'&&!d.batch&&player.x+player.y<d.d+.5&&Math.abs(d.hx-(d.crop?d.cropX:d.sx))<d.span*16+22&&d.hy>d.sy-d.f.anchorY*d.scale&&d.hy<d.sy+22;
      if(d.kind==='act5Boundary'&&!fading)run.push(d);else{flush();result.push(d);}
    }
    flush();draws.splice(0,draws.length,...result);
  }
  function draw(ctx,d,player){
    if(d.batch){ctx.drawImage(d.merged?d.image:raster(d),d.sx,d.sy);return;}
    const {f,scale:s,sx,sy}=d,alpha=ctx.globalAlpha;
    if(player&&player.x+player.y<d.d+.5&&Math.abs(d.hx-(d.crop?d.cropX:sx))<d.span*16+22&&d.hy>sy-f.anchorY*s&&d.hy<sy+22)ctx.globalAlpha=alpha*(d.kit==='biome'?.45:.24);
    if(d.crop){
      const left=Math.max(0,d.cropX-d.crop.width/2-sx+f.anchorX),right=Math.min(f.sw,d.cropX+d.crop.width/2-sx+f.anchorX);
      if(right>left)ctx.drawImage(f.image,f.sx+left,f.sy,right-left,f.sh,sx-f.anchorX+left,sy-f.anchorY,right-left,f.sh);
    }else ctx.drawImage(f.image,f.sx,f.sy,f.sw,f.sh,sx-f.anchorX*s,sy-f.anchorY*s,f.sw*s,f.sh*s);
    ctx.globalAlpha=alpha;
  }
  return Object.freeze({drawGround,append,merge,draw,getDiagnostics:()=>({batchPixels,batchBuilds,mergedPixels,mergedBuilds,lastBatches,lastIndividuals})});
})();

/* Act IV painted assemblies. Collision remains in the map's floor/void grids.
   Immutable boundary records are shared by the terrain cache and actor layer. */
const CathedralEnvironment=(()=>{
  const cache=new WeakMap(),textures=new Map();
  const kits=['pale','dark','ash','bastion'];
  const hash=(x,y,s=0)=>{let h=Math.imul(x,374761393)^Math.imul(y,668265263)^s;h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967295;};
  const frame=key=>SpriteAssets.getFrame(SpriteAssets.maps.props['a4v2_'+key],0);
  function texture(key){
    if(textures.has(key))return textures.get(key);
    const stone=key.startsWith('floor_')&&key!=='floor_ash';
    const f=stone?SpriteAssets.getFrame(SpriteAssets.maps.props.a4stone_paving,0):frame(key==='street'?'floor_pale':key),c=document.createElement('canvas');c.width=stone||key==='street'?320:f.sw;c.height=stone||key==='street'?320:f.sh;
    const g=c.getContext('2d');g.drawImage(f.image,f.sx,f.sy,f.sw,f.sh,0,0,c.width,c.height);
    if(stone){
      g.globalCompositeOperation='source-atop';g.fillStyle=key==='floor_dark'?'rgba(25,25,42,.48)':key==='floor_bastion'?'rgba(32,47,62,.22)':'rgba(84,116,132,.08)';g.fillRect(0,0,c.width,c.height);
    }
    if(key.startsWith('cliff_')||key.startsWith('crag_')){
      g.globalCompositeOperation='source-atop';g.fillStyle='rgba(12,17,29,.42)';g.fillRect(0,0,c.width,c.height);
    }
    if(key.startsWith('inlay_')){
      // Feather the technical square into the room's continuous paving.
      g.globalCompositeOperation='destination-in';
      for(const vertical of [false,true]){
        const fade=g.createLinearGradient(0,0,vertical?0:c.width,vertical?c.height:0);
        fade.addColorStop(0,'transparent');fade.addColorStop(.07,'white');fade.addColorStop(.93,'white');fade.addColorStop(1,'transparent');
        g.fillStyle=fade;g.fillRect(0,0,c.width,c.height);
      }
    }
    textures.set(key,c);return c;
  }
  function decorateFloor(g,m,ox,oy,size,tile){
    const c=m.cathedral;
    g.save();g.translate(-ox,-oy);
    g.fillStyle=c.baseMaterial===2?'rgba(64,37,23,.12)':'rgba(24,35,48,.08)';g.fillRect(ox,oy,size,size);
    // Bridges are paved decks. Mask their processional strip out of chambers,
    // so connecting routes cannot cut black lines through a room's composition.
    g.save();g.beginPath();g.rect(ox,oy,size,size);
    for(const n of c.rooms)g.rect((n.x-n.w/2+1)*tile,(n.y-n.h/2+1)*tile,(n.w-2)*tile,(n.h-2)*tile);
    g.clip('evenodd');g.lineJoin='round';g.lineCap='round';
    for(const link of c.connections){
      const path=new Path2D();link.points.forEach((p,i)=>{const x=(p.x+.5)*tile,y=(p.y+.5)*tile;if(i)path.lineTo(x,y);else path.moveTo(x,y);});
      const ash=c.baseMaterial===2,width=(link.width-1.2)*tile;
      g.strokeStyle=ash?'rgba(95,74,54,.38)':'rgba(174,159,126,.48)';g.lineWidth=width;g.stroke(path);
      g.strokeStyle=g.createPattern(texture(ash?'street':'floor_'+kits[c.baseMaterial]),'repeat');g.lineWidth=width-(ash?9:14);g.globalAlpha=ash?.44:.86;g.stroke(path);g.globalAlpha=1;
    }
    g.restore();
    if(c.baseMaterial===2){
      // The remembered town has a continuous street through its courts.
      g.lineJoin='round';g.lineCap='round';
      for(const link of c.connections){
        const path=new Path2D();link.points.forEach((p,i)=>i?path.lineTo((p.x+.5)*tile,(p.y+.5)*tile):path.moveTo((p.x+.5)*tile,(p.y+.5)*tile));
        g.strokeStyle=g.createPattern(texture('street'),'repeat');
        for(const [width,alpha] of [[5.5,.09],[4.5,.16],[3.5,.32]]){g.lineWidth=width*tile;g.globalAlpha=alpha;g.stroke(path);}g.globalAlpha=1;
      }
    }
    for(const n of c.rooms){
      const x=n.x*tile,y=n.y*tile,w=(n.w-3)*tile,h=(n.h-3)*tile,kit=kits[n.material],ash=kit==='ash';
      if(x+w/2<ox||x-w/2>ox+size||y+h/2<oy||y-h/2>oy+size)continue;
      if(!ash){
        // Broad painted slabs and a continuous perimeter course give the room
        // an architectural scale, with a single world-space texture origin.
        g.save();g.beginPath();g.rect(x-w/2,y-h/2,w,h);g.clip();
        g.fillStyle=g.createPattern(texture('floor_'+kit),'repeat');g.fillRect(x-w/2,y-h/2,w,h);
        for(const [inset,width,color] of [[3,6,'rgba(13,24,33,.48)'],[10,3,'rgba(174,155,111,.45)'],[17,6,'rgba(23,40,53,.45)'],[24,1.5,'rgba(185,172,135,.35)']]){
          g.strokeStyle=color;g.lineWidth=width;g.strokeRect(x-w/2+inset,y-h/2+inset,w-inset*2,h-inset*2);
        }
        // A longitudinal aisle belongs to the chapel, independent of bridges.
        const aisle=(n.id==='nave'?3.8:2.5)*tile;
        g.fillStyle=kit==='dark'?'rgba(92,34,45,.25)':kit==='bastion'?'rgba(27,55,76,.25)':'rgba(32,66,82,.18)';
        g.fillRect(x-aisle/2,y-h/2+26,aisle,h-52);
        g.strokeStyle='rgba(186,154,94,.40)';g.lineWidth=2;
        for(const side of [-1,1]){g.beginPath();g.moveTo(x+side*aisle/2,y-h/2+26);g.lineTo(x+side*aisle/2,y+h/2-26);g.stroke();}
        g.restore();
      }else{
        // Cinderwatch is a burned street: soot and cobbled remnants, with no
        // repeated cathedral carpet under every ruined house.
        g.save();const wash=g.createRadialGradient(x,y,40,x,y,w*.56);
        wash.addColorStop(0,'rgba(105,72,46,.20)');wash.addColorStop(.6,'rgba(45,30,25,.16)');wash.addColorStop(1,'rgba(19,16,17,0)');
        g.fillStyle=wash;g.fillRect(x-w/2,y-h/2,w,h);
        // Low remnants of house foundations seat the burned architecture.
        const landmark=n.landmark;
        if(landmark?.type==='cathedral_houses'){
          const hx=landmark.x*tile,hy=(landmark.y+1)*tile;
          g.fillStyle=g.createPattern(texture('street'),'repeat');g.globalAlpha=.50;g.fillRect(hx-3*tile,hy-2*tile,6*tile,4*tile);g.globalAlpha=1;
          g.strokeStyle='rgba(27,21,18,.45)';g.lineWidth=3;g.strokeRect(hx-3*tile,hy-2*tile,6*tile,4*tile);
        }
        g.restore();
      }
      // Reserve the large mosaic for the actual boss arena. Smaller chapel
      // roundels leave clear stone between combatants and room boundaries.
      const medallion=!ash&&(n.id==='sanctuary'||n.id==='nave'||n.id.startsWith('ritual')||n.id==='karrhal')||ash&&(n.id==='flank'||n.id==='sanctuary');
      if(medallion){
        const diameter=(n.id==='sanctuary'&&!m.zone.memoryParent?15:n.id==='nave'?10:7)*tile,r=diameter/2,tex=texture('inlay_'+kit);
        g.save();g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.clip();
        g.drawImage(tex,tex.width*.09,tex.height*.09,tex.width*.82,tex.height*.82,x-r,y-r,diameter,diameter);g.restore();
        g.strokeStyle='rgba(20,27,32,.8)';g.lineWidth=6;g.beginPath();g.arc(x,y,r+3,0,Math.PI*2);g.stroke();
        g.strokeStyle='rgba(186,160,107,.62)';g.lineWidth=2;g.beginPath();g.arc(x,y,r+5,0,Math.PI*2);g.stroke();
      }
      // Broken mortar and stone dust collect by the perimeter, leaving the
      // central aisle readable. These details are baked only once per chunk.
      for(let i=0;i<26;i++){
        const side=i%4,a=hash(i,n.x|0,c.seed),b=hash(i,n.y|0,79);
        const px=x+(side<2?(side?1:-1)*(w/2-25-a*34):(a-.5)*(w-60));
        const py=y+(side>=2?(side===3?1:-1)*(h/2-25-b*34):(b-.5)*(h-60));
        if(px<ox-30||px>ox+size+30||py<oy-30||py>oy+size+30)continue;
        g.save();g.translate(px,py);g.rotate(a*6.28);g.fillStyle=ash?'rgba(17,14,13,.38)':'rgba(15,22,28,.24)';
        g.beginPath();g.ellipse(0,0,10+a*13,4+b*5,0,0,Math.PI*2);g.fill();
        for(let j=0;j<3;j++){
          const xx=(j-1)*9,yy=j%2*6;g.fillStyle=ash?'#665e50':'#737d80';
          g.beginPath();g.moveTo(xx,yy);g.lineTo(xx+4+a*6,yy-3);g.lineTo(xx+7,yy+3+b*4);g.lineTo(xx-2,yy+3);g.closePath();g.globalAlpha=.38;g.fill();
        }g.restore();
      }
      // Coloured lancets fall across the paving from the actual rose window.
      if(n.landmark?.type==='cathedral_rose_window'){
        const lx=(n.landmark.x+3)*tile,ly=(n.landmark.y+6)*tile,r=tile*8;
        const wash=g.createRadialGradient(lx,ly,0,lx,ly,r);wash.addColorStop(0,'rgba(93,159,195,.28)');wash.addColorStop(1,'rgba(51,97,155,0)');
        g.fillStyle=wash;g.fillRect(lx-r,ly-r,r*2,r*2);
        g.save();g.translate(lx,ly);g.rotate(-.24);
        for(let i=-3;i<=3;i++){
          const height=260-Math.abs(i)*24;g.fillStyle=['rgba(192,87,66,.15)','rgba(73,157,207,.20)','rgba(207,162,72,.13)'][(i+3)%3];
          g.beginPath();g.moveTo(i*29-11,90);g.lineTo(i*29-11,90-height+20);g.quadraticCurveTo(i*29,70-height,i*29+11,90-height+20);g.lineTo(i*29+11,90);g.closePath();g.fill();
        }g.restore();
      }
    }
    g.restore();
  }
  function assembly(m){
    const b=m.cathedral.environment;let saved=cache.get(b);
    if(saved&&saved.revision===b.revision)return saved;
    const floor=new Path2D(),faces=[],walls=[],crags=[],piers=new Set();
    const kits=['pale','dark','ash','bastion'];
    for(const contour of b.contours||[]){
      // A simplified edge can cross a chamber and its bridge. Split at room
      // bounds before classifying; one midpoint cannot describe the whole run.
      const divided=[];
      for(let i=0;i<contour.length;i++){
        const a=contour[i],z=contour[(i+1)%contour.length],cuts=[0,1];
        for(const n of m.cathedral.rooms)for(const axis of ['x','y']){
          const delta=z[axis]-a[axis];if(Math.abs(delta)<.001)continue;
          const half=(axis==='x'?n.w:n.h)/2+.6;
          for(const side of [-1,1]){const t=(n[axis]+side*half-a[axis])/delta;if(t>.001&&t<.999)cuts.push(t);}
        }
        const ordered=[...new Set(cuts)].sort((a,b)=>a-b);
        for(const t of ordered.slice(0,-1))divided.push({x:U.lerp(a.x,z.x,t),y:U.lerp(a.y,z.y,t)});
      }
      // Discard artificial cuts whose neighboring spans have the same room.
      // This preserves continuous coping and avoids end caps in straight walls.
      const roomAt=(a,z)=>m.cathedral.rooms.find(n=>Math.abs((a.x+z.x)/2-n.x)<n.w/2+.6&&Math.abs((a.y+z.y)/2-n.y)<n.h/2+.6)?.id;
      const joined=divided.filter((p,i)=>{
        const a=divided[(i+divided.length-1)%divided.length],z=divided[(i+1)%divided.length];
        return Math.abs((p.x-a.x)*(z.y-p.y)-(p.y-a.y)*(z.x-p.x))>.001||roomAt(a,p)!==roomAt(p,z);
      });
      const points=joined.map(p=>({...p,sx:U.isoX(p.x,p.y),sy:U.isoY(p.x,p.y)}));
      floor.moveTo(points[0].sx,points[0].sy);
      for(const p of points.slice(1))floor.lineTo(p.sx,p.sy);floor.closePath();
      for(let i=0;i<points.length;i++){
        const a=points[i],z=points[(i+1)%points.length],mx=(a.x+z.x)/2,my=(a.y+z.y)/2;
        const room=m.cathedral.rooms.find(n=>Math.abs(mx-n.x)<n.w/2+.6&&Math.abs(my-n.y)<n.h/2+.6);
        const kit=kits[room?.material??m.cathedral.baseMaterial],span=Math.abs(z.sx-a.sx);
        if(span<1)continue;
        const left=a.sx<z.sx?a:z,right=a.sx<z.sx?z:a;
        const slope=(right.sy-left.sy)/span,base={kit,left,right,span,slope};
        if(z.sx<a.sx){
          faces.push(base);
          if(span>110)for(let u=55;u<span-30;u+=kit==='ash'?135:410){crags.push({kit,x:left.sx+u,y:left.sy+u*slope,scale:(kit==='ash'?.70:.38)+.1*Math.sin(left.sx+u)});}
        }
        if(kit==='ash')continue;
        const front=z.sx<a.sx;
        const full=!!room&&!front&&Math.abs(slope)<=.75&&span>=50;
        if(full)for(const p of [left,right,...Array.from({length:Math.max(0,Math.ceil(span/290)-1)},(_,j)=>{
          const t=(j+1)/Math.ceil(span/290);return{x:U.lerp(left.x,right.x,t),y:U.lerp(left.y,right.y,t),sx:U.lerp(left.sx,right.sx,t),sy:U.lerp(left.sy,right.sy,t)};
        })]){
          const key=Math.round(p.sx/20)+':'+Math.round(p.sy/20);
          if(piers.has(key)||m.thresholds?.some(th=>Math.abs(p.x-th.opening.x)<8&&Math.abs(p.y-th.opening.y)<5))continue;
          piers.add(key);const f=frame('pier_'+kit);
          walls.push({kind:'cathedralWall',kit,wx:p.sx-f.sw/2,wy:p.sy,d:p.x+p.y+.08,span:f.sw,slope:0,height:f.sh,f,pier:true});
        }
        // The near edge is a low plinth. Complete rear walls use identical
        // world-space UVs across depth-sorted spans, including trimmed corners.
        for(let start=0;start<span;start+=128){
          const width=Math.min(128,span-start),t=(start+width/2)/span;
          const x=left.x+(right.x-left.x)*t,y=left.y+(right.y-left.y)*t;
          if(m.thresholds?.some(th=>Math.abs(x-th.opening.x)<7&&Math.abs(y-th.opening.y)<4))continue;
          walls.push({kind:'cathedralWall',kit,wx:left.sx+start,wy:left.sy+start*slope,
            d:x+y+.02,span:width,slope,uv:left.sx+start,height:full?frame('wall_'+kit).sh:room?18:front?22:32,front:!full,end:start+width>=span,bridge:!room});
        }
      }
    }
    for(const th of m.thresholds||[]){
      const x=th.opening.x,y=th.opening.y;
      if(th.environmentDoor){
        const f=frame('door_'+th.kit);
        walls.push({kind:'cathedralWall',kit:th.kit,wx:U.isoX(x,y)-f.sw/2,wy:U.isoY(x,y)-f.sw/4,
          d:x+y,span:f.sw,slope:.5,door:true,height:f.sh,f,uv:0});
      }
      // Return walls connect the threshold's solid flanks to the chamber.
      // Their footprint follows the reserved apron, never the center passage.
      const kit=th.kit||kits[m.cathedral.baseMaterial];
      for(const side of [-1,1]){
        const xx=x+side*6,yy=y,span=3*32;
        walls.push({kind:'cathedralWall',kit,wx:U.isoX(xx,yy),wy:U.isoY(xx,yy),
          d:xx+yy-1.5,span,slope:-.5,uv:xx*32,height:frame('wall_'+kit).sh,front:false,end:true});
      }
    }
    faces.sort((a,b)=>a.left.sy+a.right.sy-b.left.sy-b.right.sy);
    saved={revision:b.revision,floor,faces,walls,crags};cache.set(b,saved);return saved;
  }
  function clipFloor(ctx,m,cam){ctx.translate(-cam.x,-cam.y);ctx.clip(assembly(m).floor);ctx.translate(cam.x,cam.y);}
  function depth(x,y){return 204+31*Math.sin(x*.013+y*.008)+19*Math.sin(x*.029-y*.012);}
  function foundation(d){
    if(d.image)return d;
    const {left:a,right:z,span,slope,kit}=d;
    d.ix=Math.floor(a.sx)-1;d.iy=Math.floor(Math.min(a.sy,z.sy))-2;
    const image=d.image=document.createElement('canvas');image.width=Math.ceil(span)+3;image.height=Math.ceil(Math.max(a.sy,z.sy)+260)-d.iy;
    const ctx=image.getContext('2d');ctx.transform(1,slope,0,1,a.sx-d.ix,a.sy-d.iy);
    ctx.beginPath();ctx.moveTo(-.5,-2);ctx.lineTo(span+.5,-2);
    for(let t=span;t>0;t-=48)ctx.lineTo(t,depth(a.sx+t,a.sy+t*slope));ctx.lineTo(0,depth(a.sx,a.sy));ctx.closePath();ctx.clip();
    const tex=texture('cliff_'+kit),uv=((a.sx%tex.width)+tex.width)%tex.width;
    ctx.translate(-uv,0);ctx.fillStyle=ctx.createPattern(tex,'repeat');ctx.fillRect(uv-1,-2,span+2,260);ctx.translate(uv,0);
    const shade=ctx.createLinearGradient(0,0,0,255);shade.addColorStop(0,'rgba(9,18,29,.10)');shade.addColorStop(.45,'rgba(13,27,42,.30)');shade.addColorStop(1,'rgba(9,13,24,.96)');ctx.fillStyle=shade;ctx.fillRect(-1,-1,span+2,262);
    return d;
  }
  function drawGround(ctx,m,cam,inView,damage=null){
    if(damage&&damage.length===0)return;
    for(const d of assembly(m).faces){
      const {left:a,right:z,span,slope,kit}=d,x=a.sx-cam.x,y=a.sy-cam.y;
      const top=Math.min(y,y+span*slope),bottom=Math.max(y,y+span*slope)+260;
      if(!damage&&(x>ctx.canvas.width+256||x+span<-256||top>ctx.canvas.height+512||bottom<-256))continue;
      if(damage&&!damage.some(r=>x+span>r.x&&x<r.x+r.w&&bottom>r.y&&top<r.y+r.h))continue;
      // Rasterize each face in world coordinates once. Viewport clipping must
      // not change its antialiasing as cached terrain scrolls past the edge.
      foundation(d);ctx.drawImage(d.image,d.ix-cam.x,d.iy-cam.y);
    }
    for(const p of assembly(m).crags){
      const f=frame('crag_'+p.kit),s=p.scale,x=p.x-cam.x-f.sw*s/2,y=p.y-cam.y-45;
      if(damage&&!damage.some(r=>x+f.sw*s>r.x&&x<r.x+r.w&&y+f.sh*s>r.y&&y<r.y+r.h))continue;
      if(!damage&&(x>ctx.canvas.width||x+f.sw*s<0||y>ctx.canvas.height||y+f.sh*s<0))continue;
      ctx.drawImage(texture('crag_'+p.kit),x,y,f.sw*s,f.sh*s);
    }
  }
  function drawRim(ctx,m,cam,inView,damage=null){
    ctx.save();ctx.translate(-cam.x,-cam.y);const path=assembly(m).floor;
    ctx.clip(path);
    // Contact shadows tie upright pieces to the surface; cached with terrain.
    for(const d of assembly(m).walls){
      if(d.front||d.pier||d.door)continue;
      const x=d.wx-cam.x,y=Math.min(d.wy,d.wy+d.span*d.slope)-cam.y,h=Math.abs(d.span*d.slope)+82;
      if(damage?!damage.some(r=>x+d.span>r.x&&x<r.x+r.w&&y+h>r.y&&y<r.y+r.h):x>ctx.canvas.width||x+d.span<0||y>ctx.canvas.height||y+h<0)continue;
      ctx.save();ctx.transform(1,d.slope,0,1,d.wx,d.wy);
      const shade=ctx.createLinearGradient(0,0,0,82);shade.addColorStop(0,'rgba(6,12,22,.58)');shade.addColorStop(.22,'rgba(6,12,22,.31)');shade.addColorStop(1,'rgba(6,12,22,0)');
      ctx.fillStyle=shade;ctx.fillRect(0,0,d.span,82);ctx.restore();
    }
    ctx.strokeStyle='rgba(13,19,29,.44)';ctx.lineWidth=m.cathedral.baseMaterial===2?3:7;ctx.stroke(path);
    ctx.strokeStyle='rgba(171,179,176,.27)';ctx.lineWidth=1.4;ctx.stroke(path);ctx.restore();
    for(const th of m.thresholds||[]){
      if(!th.environmentDoor)continue;
      const {x,y}=th.opening;ctx.save();ctx.transform(32,16,-32,16,U.isoX(x,y)-cam.x,U.isoY(x,y)-cam.y);
      const shade=ctx.createLinearGradient(0,-3,0,2);shade.addColorStop(0,'rgba(7,8,14,.98)');shade.addColorStop(.5,'rgba(7,8,14,.72)');shade.addColorStop(1,'rgba(7,8,14,0)');
      ctx.fillStyle=shade;ctx.fillRect(-1.6,-3,3.2,5);ctx.restore();
    }
  }
  function append(draws,m,cam,player,W,H){
    for(const d of assembly(m).walls){
      d.sx=d.wx-cam.x;d.sy=d.wy-cam.y;
      if(d.sx>W||d.sx+d.span<0||Math.min(d.sy,d.sy+d.span*d.slope)-d.height>H||Math.max(d.sy,d.sy+d.span*d.slope)<0)continue;
      draws.push(d);
    }
  }
  function draw(ctx,d,p){
    const px=U.isoX(p.x,p.y),py=U.isoY(p.x,p.y);
    ctx.save();
    const local=px-d.wx,baseY=d.wy+local*d.slope;
    if(p.x+p.y<d.d+.5&&local>-24&&local<d.span+24&&py>baseY-d.height-20&&py<baseY+20)ctx.globalAlpha*=.24;
    ctx.transform(1,d.slope,0,1,d.sx,d.sy);
    if(d.door||d.pier){const f=d.f;ctx.drawImage(f.image,f.sx,f.sy,f.sw,f.sh,0,-f.sh+(d.pier?16:0),f.sw,f.sh);}
    else{
      const tex=texture('wall_'+d.kit),uv=((d.uv%tex.width)+tex.width)%tex.width;
      ctx.save();ctx.beginPath();ctx.rect(-.5,-d.height,d.span+1,d.height);ctx.clip();ctx.translate(-uv,-tex.height);
      ctx.fillStyle=ctx.createPattern(tex,'repeat');ctx.fillRect(uv-.5,tex.height-d.height,d.span+1,d.height);ctx.restore();
      // Directional light gives the two wall orientations different values.
      ctx.fillStyle=d.slope<0?'rgba(89,125,146,.10)':'rgba(7,14,25,.17)';ctx.fillRect(0,-d.height,d.span,d.height);
      // A narrow coping has actual thickness; its two shared edges meet at
      // corner sockets rather than revealing a cut bitmap rectangle.
      const tx=d.slope>0?-10:10,ty=d.front?-8:8;
      ctx.beginPath();ctx.moveTo(0,-d.height);ctx.lineTo(d.span,-d.height);ctx.lineTo(d.span+tx,-d.height+ty);ctx.lineTo(tx,-d.height+ty);ctx.closePath();
      ctx.fillStyle=d.front?'#57616a':'#79848c';ctx.fill();ctx.strokeStyle='rgba(201,207,198,.35)';ctx.lineWidth=1;ctx.stroke();
      if(d.end){ctx.beginPath();ctx.moveTo(d.span,-d.height);ctx.lineTo(d.span+tx,-d.height+ty);ctx.lineTo(d.span+tx,ty);ctx.lineTo(d.span,0);ctx.closePath();ctx.fillStyle='#393831';ctx.fill();}
      ctx.fillStyle='rgba(12,13,20,.32)';ctx.fillRect(-.5,-3,d.span+1,3);
      if(d.bridge){
        ctx.strokeStyle='rgba(10,19,27,.55)';ctx.lineWidth=1;
        const offset=((d.uv%48)+48)%48;
        for(let x=48-offset;x<d.span;x+=48){ctx.beginPath();ctx.moveTo(x,-d.height);ctx.lineTo(x,0);ctx.stroke();}
      }
    }
    ctx.restore();
  }
  const backdropCache=new WeakMap(),hazeCache=new Map();
  const reducedMotion=typeof window!=='undefined'?window.matchMedia?.('(prefers-reduced-motion: reduce)'):null;
  function haze(color){
    if(hazeCache.has(color))return hazeCache.get(color);
    const image=document.createElement('canvas');image.width=256;image.height=128;
    const g=image.getContext('2d');g.scale(1,.5);
    const glow=g.createRadialGradient(128,128,0,128,128,128);
    glow.addColorStop(0,color+'55');glow.addColorStop(.35,color+'28');glow.addColorStop(1,color+'00');
    g.fillStyle=glow;g.fillRect(0,0,256,256);hazeCache.set(color,image);return image;
  }
  function drawBackdrop(ctx,m,cam,W,H){
    let saved=backdropCache.get(m);
    if(!saved||saved.w!==W||saved.h!==H){
      // Cache the distant painting and colour atmosphere at the view size;
      // only the gentle parallax offset is sampled during gameplay.
      if(saved)saved.image.width=saved.image.height=0;
      const image=document.createElement('canvas');image.width=W+160;image.height=H+100;
      const g=image.getContext('2d'),f=SpriteAssets.getFrame(SpriteAssets.maps.props.cathedral_void_backdrop),scale=Math.max(image.width/f.sw,image.height/f.sh);
      g.drawImage(f.image,f.sx,f.sy,f.sw,f.sh,(image.width-f.sw*scale)/2,(image.height-f.sh*scale)/2,f.sw*scale,f.sh*scale);
      g.globalCompositeOperation='screen';
      const ash=m.cathedral.baseMaterial===2,color=ash?'#986141':m.id==='cathedral2'?'#685b96':'#567d9e';
      g.drawImage(haze(color),-image.width*.3,image.height*.25,image.width*1.6,image.height);
      g.globalCompositeOperation='source-over';
      const shade=g.createLinearGradient(0,0,0,image.height);shade.addColorStop(0,'rgba(5,11,21,0)');shade.addColorStop(1,'rgba(5,11,21,.3)');g.fillStyle=shade;g.fillRect(0,0,image.width,image.height);
      saved={w:W,h:H,image};backdropCache.set(m,saved);
    }
    ctx.drawImage(saved.image,-80-Math.sin(cam.x*.0003)*55,-50-Math.sin(cam.y*.0003)*30);
  }
  function atmosphere(ctx,m,cam,W,H,time){
    const c=m.cathedral,ash=c.baseMaterial===2,t=reducedMotion?.matches?0:time;
    ctx.save();ctx.globalCompositeOperation='screen';
    for(const n of c.rooms){
      const l=n.landmark;if(!l)continue;
      const x=U.isoX(l.x,l.y)-cam.x,y=U.isoY(l.x,l.y)-cam.y;
      if(x<-500||x>W+300||y<-200||y>H+500)continue;
      if(l.type==='cathedral_rose_window'){
        // Broad, low-opacity shafts originate at the window, with bright
        // patches already baked on the ground beneath them.
        ctx.save();ctx.translate(x,y);const ray=ctx.createLinearGradient(0,-200,100,200);
        ray.addColorStop(0,'rgba(111,174,225,0)');ray.addColorStop(.25,'rgba(134,188,225,.10)');ray.addColorStop(1,'rgba(117,175,210,0)');ctx.fillStyle=ray;
        for(const offset of [-35,0,35]){ctx.beginPath();ctx.moveTo(offset-8,-220);ctx.lineTo(offset+12,-220);ctx.lineTo(offset+170,160);ctx.lineTo(offset+80,160);ctx.closePath();ctx.fill();}ctx.restore();
      }else if(l.type==='cathedral_houses'){
        ctx.globalAlpha=.40;ctx.drawImage(haze('#e28f49'),x-155,y-60,310,140);ctx.globalAlpha=1;
      }
    }
    // Sparse drifting ash / stone dust is world-anchored, never a screen-space
    // rain curtain. Reduced-motion preference freezes only this ambient layer.
    const cell=170;
    for(let gy=Math.floor((cam.y-80)/cell);gy<(cam.y+H+80)/cell;gy++)for(let gx=Math.floor((cam.x-80)/cell);gx<(cam.x+W+80)/cell;gx++){
      const r=hash(gx,gy,c.seed);if(r<.38)continue;
      const x=gx*cell+hash(gx,gy,53)*cell+Math.sin(t*.27+r*30)*14-cam.x;
      const y=gy*cell+((hash(gx,gy,97)*cell-t*(ash?7:2))%cell+cell)%cell-cam.y;
      const alpha=(.16+Math.sin(t*.5+r*30)*.07)*(ash?1:.65);
      ctx.fillStyle=ash?`rgba(236,169,103,${alpha})`:`rgba(163,199,219,${alpha})`;
      ctx.fillRect(x,y,r>.85?2:1,r>.8?2:1);
    }
    ctx.restore();
  }
  return Object.freeze({decorateFloor,drawGround,clipFloor,drawRim,append,draw,drawBackdrop,atmosphere});
})();
