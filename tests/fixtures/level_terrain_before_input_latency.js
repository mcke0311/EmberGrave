/* Continuous authored terrain for wilderness and dungeon floors.
   Unproject sprite materials once, blend in world coordinates, then seat each
   tile on its own elevation. Collision and cliff geometry remain authoritative. */
"use strict";
const LevelTerrain = (() => {
  const TILE=32, CHUNK=12, PAD=2, SIDE=(CHUNK+PAD*2)*TILE;
  const materials=new Map(),chunks=new Map(),visible=new Set();
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
  const TERRAIN_GRIDS=['floor','walls','elev','hazard'];
  let terrainSnapshot=null;
  let surfaceView=null,surfaceViewBuilds=0,surfaceViewHits=0;
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
        surfaceVersion:m.surfaceVersion,geometry:m._surfaceGeometry,outdoor:m.outdoor,
        grids:TERRAIN_GRIDS.map(k=>m[k]?.slice())};
    }
    visible.clear();surfacePolygons=[];surfaceIndex=null;frameOpen=true;frame++;
    tileDraws=cacheHits=chunkBuilds=buildMs=evictions=0;capacity=MIN_CAPACITY;
  }
  function sameTerrain(m){
    const s=terrainSnapshot;
    if(!s||s.map!==m||s.id!==m.id||s.w!==m.w||s.h!==m.h||s.theme!==m.zone?.theme||s.art!==m.zone?.artZone||
       s.surfaceVersion!==m.surfaceVersion||s.geometry!==m._surfaceGeometry||s.outdoor!==m.outdoor)return false;
    for(let k=0;k<TERRAIN_GRIDS.length;k++){
      const a=s.grids[k],b=m[TERRAIN_GRIDS[k]];
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
      surfaceViewBuilds,surfaceViewHits,surfaceViewPixels:surfaceView?surfaceView.image.width*surfaceView.image.height:0});
  }
  function releaseSurfaceView(){if(surfaceView){surfaceView.image.width=surfaceView.image.height=0;surfaceView=null;}}
  function canvas(w,h=w){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
  function material(id,index=0,trail=false,raw=false){
    const key=id+':'+index+':'+trail;if(materials.has(key))return materials.get(key);
    if(raw){
      const f=SpriteAssets.getFrame(id,0),size=320,overlap=64,period=size-overlap;
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
  function cellsMask(m,cx,cy,test,blur){
    const c=canvas(SIDE),g=c.getContext('2d');g.fillStyle='#fff';
    for(let y=-PAD;y<CHUNK+PAD;y++)for(let x=-PAD;x<CHUNK+PAD;x++){
      const wx=cx*CHUNK+x,wy=cy*CHUNK+y;
      if(wx>=0&&wy>=0&&wx<m.w&&wy<m.h&&test(wx+wy*m.w))g.fillRect((x+PAD)*TILE,(y+PAD)*TILE,TILE,TILE);
    }
    // Filter the union once; blurring individual cells leaves a darker grid
    // where their translucent edges meet inside a path or hazard pool.
    const soft=canvas(SIDE),p=soft.getContext('2d');p.filter='blur('+blur+'px)';p.drawImage(c,0,0);return soft;
  }
  function build(m,cx,cy){
    const surface=canvas(SIDE),g=surface.getContext('2d');
    const ox=(cx*CHUNK-PAD)*TILE,oy=(cy*CHUNK-PAD)*TILE,ground=SpriteAssets.maps.props['level_ground_'+(m.zone.artZone||m.id)];
    fill(g,material(ground,0,false,true),ox,oy);
    // Overlapping soft patches break repetition without drawing a tile grid.
    for(let variant=1;variant<4;variant++){
      const mask=canvas(SIDE),p=mask.getContext('2d');
      for(let y=Math.floor(oy/192)-1;y<=Math.ceil((oy+SIDE)/192)+1;y++)for(let x=Math.floor(ox/192)-1;x<=Math.ceil((ox+SIDE)/192)+1;x++){
        if(1+Math.floor(noise(x,y,71)*3)!==variant)continue;
        const px=x*192+noise(x,y,13)*80-ox,py=y*192+noise(x,y,29)*80-oy,r=110+noise(x,y,47)*55;
        const grad=p.createRadialGradient(px,py,0,px,py,r);grad.addColorStop(0,'rgba(255,255,255,.72)');grad.addColorStop(1,'rgba(255,255,255,0)');
        p.fillStyle=grad;p.fillRect(px-r,py-r,r*2,r*2);
      }
      masked(g,material(ground,variant,false,true),mask,ox,oy,1);
    }
    const path=SpriteAssets.maps.paths[m.zone.theme];
    if(path){const mask=cellsMask(m,cx,cy,i=>m.floor[i]>=4&&!m.walls[i],9);masked(g,material(path,15,true),mask,ox,oy,.86);}
    const hazards=new Set();
    for(let y=Math.max(0,cy*CHUNK-PAD);y<Math.min(m.h,(cy+1)*CHUNK+PAD);y++)for(let x=Math.max(0,cx*CHUNK-PAD);x<Math.min(m.w,(cx+1)*CHUNK+PAD);x++)if(m.hazard?.[x+y*m.w])hazards.add(m.hazard[x+y*m.w]);
    for(const code of hazards){const def=DATA.HAZARDS[code],id=def&&SpriteAssets.maps.props['level_hazard_'+def.id];if(!id)continue;
      masked(g,material(id,0,false,true),cellsMask(m,cx,cy,i=>!m.walls[i]&&m.hazard[i]===code,6),ox,oy,.92);
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
  function drawSurfaceTile(ctx,m,x,y,cam){
    const {surface,ux,uy}=tileTexture(m,x,y),[a,b,,d]=TerrainSurface.tileGeometry(m,x,y).top.points;
    ctx.save();
    ctx.transform((b.sx-a.sx)/TILE,(b.sy-a.sy)/TILE,(d.sx-a.sx)/TILE,(d.sy-a.sy)/TILE,a.sx-cam.x,a.sy-cam.y);
    ctx.drawImage(surface,ux-.5,uy-.5,33,33,-.5,-.5,33,33);
    ctx.restore();
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
  function drawSurface(ctx,m,cam,x0,x1,y0,y1,inView,cacheView=false,damage=null){
    if(cacheView){drawSurfaceView(ctx,m,cam);return;}
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
  }
  // Historical stepped floors retain their exact foundation/cliff paint order.
  function drawFloor(ctx,m,cam,tx0,tx1,ty0,ty1,inView,cacheView=true,damage=null){
    if(cacheView){drawSurfaceView(ctx,m,cam,true);return;}
    const theme=m.zone.theme,ev=m.elev,EH=14;
    const massifTerrain=m.outdoor&&MASSIF_THEMES.has(theme);
    if(damage){
      const visible=inView;
      inView=(sx,sy)=>visible(sx,sy)&&damage.some(r=>sx+34>r.x&&sx-34<r.x+r.w&&sy+EH*6+18>r.y&&sy-EH*6-18<r.y+r.h);
    }
    /* Solid ground must continue underneath walls and raised terrain. Wall
       and cliff sprites have transparent edges; without this foundation those
       edges expose the screen-space backdrop instead of the level's floor.
       Draw foundations first so they cannot cover a neighboring raised face. */
    for (let y = ty0; !m.settlement && !m.surfaceVersion && y <= ty1; y++) {
      for (let x = tx0; x <= tx1; x++) {
        const i = x + y * m.w;
        // Flat open ground and outdoor wall caps already get a floor below.
        if (!(ev && ev[i]) && (!m.walls[i] || massifTerrain)) continue;
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
      g.save();
      if(damage){g.beginPath();for(const r of damage)g.rect(r.x,r.y,r.w,r.h);g.clip();}
      if(legacy)drawFloor(g,m,origin,x0,x1,y0,y1,inView,false,damage);
      else drawSurface(g,m,origin,x0,x1,y0,y1,inView,false,damage);
      g.restore();
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
  function clipBehind(ctx,m,cam,x,y){
    if(!m.surfaceVersion)return;
    const sx=U.isoX(x,y),sy=U.isoY(x,y)-TerrainSurface.heightAt(m,x,y)*14,h=TerrainSurface.heightAt(m,x,y);
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
  return Object.freeze({beginFrame,drawTile,drawSurfaceTile,drawSurface,drawFloor,clipBehind,endFrame,getDiagnostics});
})();
