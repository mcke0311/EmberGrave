/* Authored terrain materials composited along continuous town routes.
   Masks describe geography; every visible surface comes from sprite pixels.
   Surfaces are cached at world resolution, so blending costs no per-frame work. */
"use strict";
const TownTerrain = (() => {
  const SCALE = 32;
  const cache = new Map(), patterns = new Map();
  function canvas(w,h) {
    const c=document.createElement('canvas');c.width=w;c.height=h;return c;
  }
  function material(key, size) {
    if(patterns.has(key))return patterns.get(key);
    const f=SpriteAssets.getFrame(SpriteAssets.maps.props[key],0);
    // Reflected copies join the original painted texture without a hard seam.
    const c=canvas(size*2,size*2),ctx=c.getContext('2d');
    for(let y=0;y<2;y++)for(let x=0;x<2;x++){
      ctx.save();ctx.translate(x?size*2:0,y?size*2:0);ctx.scale(x?-1:1,y?-1:1);
      ctx.drawImage(f.image,f.sx,f.sy,f.sw,f.sh,0,0,size,size);ctx.restore();
    }
    patterns.set(key,c);return c;
  }
  function trace(ctx,points,closed=false) {
    ctx.beginPath();ctx.moveTo(points[0].x*SCALE,points[0].y*SCALE);
    for(let i=1;i<points.length;i++)ctx.lineTo(points[i].x*SCALE,points[i].y*SCALE);
    if(closed)ctx.closePath();
  }
  function routeMask(m,w,h) {
    const c=canvas(w,h),ctx=c.getContext('2d');
    ctx.fillStyle=ctx.strokeStyle='#fff';ctx.lineCap=ctx.lineJoin='round';
    // Soft shoulders transition across several pixels, independent of tile edges.
    ctx.filter=`blur(${m.id==='marshcamp'?4:10}px)`;
    for(const route of m.settlement.routes){ctx.lineWidth=route.width*SCALE;trace(ctx,route.points);ctx.stroke();}
    for(const court of m.settlement.courts){trace(ctx,court,true);ctx.fill();}
    return c;
  }
  function layer(ctx,texture,mask,opacity=1) {
    const c=canvas(mask.width,mask.height),g=c.getContext('2d');
    g.fillStyle=g.createPattern(texture,'repeat');g.fillRect(0,0,c.width,c.height);
    g.globalCompositeOperation='destination-in';g.drawImage(mask,0,0);
    ctx.save();ctx.globalAlpha=opacity;ctx.drawImage(c,0,0);ctx.restore();
  }
  function build(m) {
    const w=m.w*SCALE,h=m.h*SCALE;
    const surface=canvas(w,h),ctx=surface.getContext('2d');
    ctx.fillStyle=ctx.createPattern(m.act3?.environment?LevelTerrain.imperialMaterial('a3visual_sand'):material(m.id==='frosthaven'&&m.act1Environment?'a1polish_snow':m.id+'_soil',512),'repeat');ctx.fillRect(0,0,w,h);
    if(m.settlement.pools.length){
      const mask=canvas(w,h),g=mask.getContext('2d');g.fillStyle='#fff';g.filter='blur(17px)';
      for(const pool of m.settlement.pools){trace(g,pool,true);g.fill();}
      layer(ctx,material('town_marshwater',384),mask,.87);
    }
    layer(ctx,m.act3?.environment?LevelTerrain.imperialMaterial('a3visual_sandstone'):material(m.id+'_street',256),routeMask(m,w,h),m.id==='marshcamp'?.98:.9);
    if(m.act3?.environment)ImperialEnvironment.decorateFloor(ctx,m,0,0,Math.max(w,h),SCALE,LevelTerrain.imperialMaterial);
    for(const d of m.thresholdDecals||m.act3?.decals||[]){
      if(m.act3?.environment&&d.type.startsWith('act3_'))continue;
      const f=SpriteAssets.getFrame(SpriteAssets.maps.props[d.type],0),s=d.scale||1;
      ctx.save();ctx.setTransform(.5,-.5,1,1,d.x*SCALE,d.y*SCALE);ctx.scale(s,s);ctx.globalAlpha=d.alpha??1;
      ctx.drawImage(f.image,f.sx,f.sy,f.sw,f.sh,-f.anchorX,-f.anchorY,f.sw,f.sh);ctx.restore();
    }
    // Project one continuous surface into the same 32x16 world coordinate system.
    const margin=m.act5Environment?192:0;
    const projected=canvas((m.w+m.h)*32+4+margin*2,(m.w+m.h)*16+4+margin*2),g=projected.getContext('2d');
    g.setTransform(1,.5,-1,.5,m.h*32+2+margin,2+margin);g.drawImage(surface,0,0);
    g.setTransform(1,0,0,1,0,0);
    if(m.boundaries)Act2Boundaries.drawGround(g,m,{x:-m.h*32-2,y:-2},()=>true);
    if(m.act1Environment)Act1Environment.drawGround(g,m,{x:-m.h*32-2-margin,y:-2-margin},()=>true);
    if(m.act3?.environment)ImperialEnvironment.drawGround(g,m,{x:-m.h*32-2-margin,y:-2-margin},()=>true);
    if(m.act5Environment)CindersBoundaries.drawGround(g,m,{x:-m.h*32-2-margin,y:-2-margin},()=>true);
    return {canvas:projected,x:-m.h*32-2-margin,y:-2-margin,boundaries:m.boundaries,imperialEnvironment:m.act3?.environment,act5Environment:m.act5Environment,act1Environment:m.act1Environment};
  }
  function draw(ctx,m,cam) {
    let entry=cache.get(m);
    if(!entry||entry.act1Environment!==m.act1Environment||entry.imperialEnvironment!==m.act3?.environment||entry.boundaries!==m.boundaries||entry.act5Environment!==m.act5Environment){if(entry){entry.canvas.width=0;entry.canvas.height=0;}entry=build(m);cache.set(m,entry);while(cache.size>2)cache.delete(cache.keys().next().value);}
    else {cache.delete(m);cache.set(m,entry);}
    if(m.act1Environment){
      // The town sits in a snowfield; its rectangular navigation grid is not
      // an island floating above the distant mountain backdrop.
      ctx.save();ctx.transform(1,.5,-1,.5,-cam.x,-cam.y);
      ctx.fillStyle=ctx.createPattern(material('a1polish_snow',512),'repeat');
      ctx.fillRect(-8192,-8192,m.w*SCALE+16384,m.h*SCALE+16384);ctx.restore();
    }
    ctx.drawImage(entry.canvas,entry.x-cam.x,entry.y-cam.y);
  }
  return {draw};
})();
