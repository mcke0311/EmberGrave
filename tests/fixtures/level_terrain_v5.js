/* Frozen pre-fix renderer: test-only performance/pixel baseline, never shipped in index.html.
   Continuous authored terrain for wilderness and dungeon floors.
   Unproject sprite materials once, blend in world coordinates, then seat each
   tile on its own elevation. Collision and cliff geometry remain authoritative. */
"use strict";
const LevelTerrain = (() => {
  const TILE=32, CHUNK=12, PAD=2, SIDE=(CHUNK+PAD*2)*TILE;
  const materials=new Map(),chunks=new Map(),mapIds=new WeakMap();let nextMapId=1;
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
    const ox=(cx*CHUNK-PAD)*TILE,oy=(cy*CHUNK-PAD)*TILE,ground=SpriteAssets.maps.props['level_ground_'+m.id];
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
  function drawTile(ctx,m,x,y,sx,sy){
    if(!mapIds.has(m))mapIds.set(m,nextMapId++);
    const cx=Math.floor(x/CHUNK),cy=Math.floor(y/CHUNK),key=mapIds.get(m)+':'+cx+':'+cy;
    let surface=chunks.get(key);
    if(!surface){surface=build(m,cx,cy);chunks.set(key,surface);while(chunks.size>40)chunks.delete(chunks.keys().next().value);}
    else {chunks.delete(key);chunks.set(key,surface);}
    const ux=(x-cx*CHUNK+PAD)*TILE,uy=(y-cy*CHUNK+PAD)*TILE;
    // Matching source/destination bleed seals fractional-camera joins while
    // preserving continuous UVs. The separate cliff pass keeps ledges sharp.
    ctx.save();ctx.transform(1,.5,-1,.5,sx,sy-16);
    ctx.drawImage(surface,ux-.5,uy-.5,33,33,-.5,-.5,33,33);ctx.restore();
  }
  return {drawTile};
})();
