/* =========================================================================
   EMBERGRAVE — utils.js
   Seeded RNG, math helpers, A* pathfinding, line of sight.
   Loaded first; everything hangs off the global `U`.
   ========================================================================= */
"use strict";

const U = {

  /* ---- seeded RNG (mulberry32). Returns a function in [0,1). ---- */
  rng(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  },
  /* hash a string to a 32-bit int (for deriving sub-seeds) */
  hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  },

  /* ---- convenience randoms (non-deterministic gameplay flavor uses Math.random) ---- */
  ri(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); },          // int in [a,b]
  rf(a, b) { return a + Math.random() * (b - a); },
  pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; },
  pickR(r, arr) { return arr[Math.floor(r() * arr.length)]; },               // seeded pick
  riR(r, a, b) { return a + Math.floor(r() * (b - a + 1)); },
  chance(p) { return Math.random() < p; },
  /* weighted pick: arr of [item, weight] */
  wpick(arr, r) {
    const rand = r ? r() : Math.random();
    let total = 0; for (const e of arr) total += e[1];
    let acc = 0;
    for (const e of arr) { acc += e[1]; if (rand * total < acc) return e[0]; }
    return arr[arr.length - 1][0];
  },

  clamp(v, a, b) { return v < a ? a : (v > b ? b : v); },
  lerp(a, b, t) { return a + (b - a) * t; },
  dist(ax, ay, bx, by) { const dx = bx - ax, dy = by - ay; return Math.sqrt(dx * dx + dy * dy); },
  dist2(ax, ay, bx, by) { const dx = bx - ax, dy = by - ay; return dx * dx + dy * dy; },
  angTo(ax, ay, bx, by) { return Math.atan2(by - ay, bx - ax); },

  /* ---- isometric transforms (world tiles -> screen px) ---- */
  TW: 64, TH: 32,
  isoX(x, y) { return (x - y) * 32; },
  isoY(x, y) { return (x + y) * 16; },
  /* screen px (world-relative, before camera) -> world coords */
  unisoX(sx, sy) { return (sx / 32 + sy / 16) / 2; },
  unisoY(sx, sy) { return (sy / 16 - sx / 32) / 2; },

  /* facing direction index 0..7 from a SCREEN-space vector */
  dirFrom(dx, dy) {
    if (dx === 0 && dy === 0) return 0;
    const a = Math.atan2(dy, dx);
    return ((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8;
  },
  /* shortest-arc angle interpolation */
  angLerp(a, b, k) {
    let d = b - a;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return a + d * k;
  },
  /* unit world-space vector matching a screen-space angle */
  screenVecToWorld(a) {
    const sx = Math.cos(a), sy = Math.sin(a);
    let wx = U.unisoX(sx, sy), wy = U.unisoY(sx, sy);
    const l = Math.hypot(wx, wy) || 1;
    return [wx / l, wy / l];
  },

  /* =====================================================================
     A* pathfinding on a walkability grid.
     grid: function (x, y) -> truthy if walkable. w,h bounds.
     Returns array of {x, y} tile coords (excluding start) or null.
     8-directional with corner-cut prevention; capped expansion.
     ===================================================================== */
  astar(walk, w, h, sx, sy, tx, ty, maxExpand, elev, maxStep, traversal) {
    sx |= 0; sy |= 0; tx |= 0; ty |= 0;
    const ms = maxStep == null ? 1 : maxStep;   // max climbable height step when `elev` is supplied
    if (sx === tx && sy === ty) return [];
    if (!walk(tx, ty)) {
      // retarget to nearest walkable neighbor of the goal
      let best = null, bd = 1e9;
      for (let r = 1; r <= 3 && !best; r++)
        for (let oy = -r; oy <= r; oy++) for (let ox = -r; ox <= r; ox++) {
          const nx = tx + ox, ny = ty + oy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h || !walk(nx, ny)) continue;
          const d = ox * ox + oy * oy;
          if (d < bd) { bd = d; best = { x: nx, y: ny }; }
        }
      if (!best) return null;
      tx = best.x; ty = best.y;
      if (sx === tx && sy === ty) return [];
    }
    maxExpand = maxExpand || 2600;
    const open = new MinHeap();
    // Keep each tile's search state together: neighbor expansion needs one
    // lookup instead of separate score, parent, edge-kind and closed tables.
    const nodes = new Map();
    const key = (x, y) => x + y * w;
    const hcost = (x, y) => { const dx = Math.abs(x - tx), dy = Math.abs(y - ty); return (dx + dy) + (-0.586) * Math.min(dx, dy); };
    const startKey = key(sx, sy);
    nodes.set(startKey, { g: 0, parent: undefined, kind: undefined, closed: false });
    open.push({ x: sx, y: sy, f: hcost(sx, sy) });
    const DIRS = [[1,0,1],[-1,0,1],[0,1,1],[0,-1,1],[1,1,1.414],[1,-1,1.414],[-1,1,1.414],[-1,-1,1.414]];
    let expand = 0;
    while (open.size() > 0 && expand < maxExpand) {
      const cur = open.pop(), ck = key(cur.x, cur.y);
      const current = nodes.get(ck);
      if (current.closed) continue;
      current.closed = true; expand++;
      if (cur.x === tx && cur.y === ty) {
        const path = []; let k = key(tx, ty);
        let cx = tx, cy = ty;
        while (k !== startKey) {
          const node = nodes.get(k);
          path.push(traversal ? { x: cx, y: cy, kind: node.kind } : { x: cx, y: cy });
          const p = node.parent; if (p === undefined) break;
          cx = p % w; cy = (p / w) | 0; k = p;
        }
        path.reverse(); return path;
      }
      const cg = current.g;
      for (const d of DIRS) {
        const nx = cur.x + d[0], ny = cur.y + d[1];
        if (nx < 0 || ny < 0 || nx >= w || ny >= h || !walk(nx, ny)) continue;
        if (d[0] !== 0 && d[1] !== 0 && (!walk(cur.x + d[0], cur.y) || !walk(cur.x, cur.y + d[1]))) continue; // no corner cutting
        if (elev && Math.abs(elev[nx + ny * w] - elev[cur.x + cur.y * w]) > ms) continue;   // can't path up/down a cliff
        const edge = traversal && traversal(cur.x, cur.y, nx, ny, d[2]);
        if (traversal && !edge) continue;
        const ng = cg + (traversal ? edge.cost : d[2]);
        const nk = key(nx, ny);
        const node = nodes.get(nk);
        if (node && node.g <= ng) continue;
        if (node) { node.g = ng; node.parent = ck; node.kind = edge?.kind; }
        else nodes.set(nk, { g: ng, parent: ck, kind: edge?.kind, closed: false });
        open.push({ x: nx, y: ny, f: ng + hcost(nx, ny) });
      }
    }
    return null;
  },

  /* tile-grid line of sight (supercover walk) */
  los(walk, x0, y0, x1, y1) {
    let dx = x1 - x0, dy = y1 - y0;
    const steps = Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) * 2) + 1;
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      if (!walk((x0 + dx * t) | 0, (y0 + dy * t) | 0)) return false;
    }
    return true;
  },

  /* smooth a tile path with LOS shortcuts */
  smoothPath(walk, sx, sy, path) {
    if (!path || path.length < 2) return path;
    const out = []; let cx = sx, cy = sy, i = 0;
    while (i < path.length) {
      let j = path.length - 1;
      for (; j > i; j--) if (U.los(walk, cx, cy, path[j].x + 0.5, path[j].y + 0.5)) break;
      out.push(path[j]); cx = path[j].x + 0.5; cy = path[j].y + 0.5; i = j + 1;
    }
    return out;
  },

  /* roman numerals for skill ranks / tiers */
  roman(n) { return ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"][n] || n; },

  fmt(n) { return n >= 10000 ? (n / 1000).toFixed(1) + "k" : "" + Math.floor(n); },
};

/* small binary min-heap keyed on .f — used by A* */
class MinHeap {
  constructor() { this.a = []; }
  size() { return this.a.length; }
  push(n) {
    const a = this.a; a.push(n);
    let i = a.length - 1;
    while (i > 0) { const p = (i - 1) >> 1; if (a[p].f <= a[i].f) break; const swap = a[p]; a[p] = a[i]; a[i] = swap; i = p; }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last; let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1; let m = i;
        if (l < a.length && a[l].f < a[m].f) m = l;
        if (r < a.length && a[r].f < a[m].f) m = r;
        if (m === i) break; const swap = a[m]; a[m] = a[i]; a[i] = swap; i = m;
      }
    }
    return top;
  }
}

/* Geometry shared by the terraced wilderness, navigation and pointer picking.
   Heights on opposite sides of a cliff deliberately have separate vertices.
   Kept with the common math so map generators and standalone reviews use it too. */
const TerrainSurface = (() => {
  const LIFT = 14, EPS = 1e-7;
  const directions = [[1,0],[-1,0],[0,1],[0,-1]];
  const inside = (m,x,y) => x>=0 && y>=0 && x<m.w && y<m.h;
  function tileHeight(m,tx,ty,x,y) {
    if (!inside(m,tx,ty)) return 0;
    const i=tx+ty*m.w, ramp=m.ramps?.[m._rampTiles?.[i]];
    if (!ramp) return m.elev?.[i] || 0;
    const t=ramp.dx ? (x-ramp.x-(ramp.dx<0?1:0))*ramp.dx : (y-ramp.y-(ramp.dy<0?1:0))*ramp.dy;
    return ramp.low+(ramp.high-ramp.low)*U.clamp(t/ramp.length,0,1);
  }
  const heightAt = (m,x,y) => tileHeight(m,Math.floor(x),Math.floor(y),x,y);
  function edgeMatches(m,x,y,nx,ny) {
    if (!inside(m,x,y) || !inside(m,nx,ny)) return false;
    if((m._rampTiles?.[x+y*m.w]??-1)<0&&(m._rampTiles?.[nx+ny*m.w]??-1)<0)return (m.elev?.[x+y*m.w]||0)===(m.elev?.[nx+ny*m.w]||0);
    const a=x!==nx ? [Math.max(x,nx),y] : [x,Math.max(y,ny)];
    const b=x!==nx ? [a[0],a[1]+1] : [a[0]+1,a[1]];
    return [a,b].every(([wx,wy])=>Math.abs(tileHeight(m,x,y,wx,wy)-tileHeight(m,nx,ny,wx,wy))<EPS);
  }
  function rebuild(m) {
    m._rampTiles=new Int32Array(m.w*m.h).fill(-1);
    for (const [i,r] of (m.ramps||[]).entries()) for(let k=0;k<r.length;k++) for(let w=-Math.floor((r.width||3)/2);w<=Math.floor((r.width||3)/2);w++) {
      const x=r.x+r.dx*k+(r.dy?w:0),y=r.y+r.dy*k+(r.dx?w:0);
      if (!inside(m,x,y) || m._rampTiles[x+y*m.w]>=0) throw Error('Overlapping or out-of-bounds terrain ramp');
      m._rampTiles[x+y*m.w]=i;
    }
    m._surfaceEdges=new Uint8Array(m.w*m.h);
    for(let y=0;y<m.h;y++) for(let x=0;x<m.w;x++) for(let d=0;d<4;d++) {
      const [dx,dy]=directions[d];
      if(edgeMatches(m,x,y,x+dx,y+dy))m._surfaceEdges[x+y*m.w]|=1<<d;
    }
    m._surfaceGeometry=new Map();
    // The authored cave floors are continuous planes; their raised wall caps
    // are never traversable. Prove this on rebuild so sweeps can omit slope
    // checks, while still testing every occupied cell of the actor's body.
    m._surfaceFlatHeight=null;
    if((m.frontier||m.act3)&&!(m.ramps||[]).length){
      let flat;
      for(let i=0;i<m.w*m.h;i++)if(!m.walls[i]){
        const h=m.elev[i];if(flat===undefined)flat=h;else if(flat!==h){flat=null;break;}
      }
      m._surfaceFlatHeight=flat??null;
    }
    m._navMaxHeight=0;
    for(const h of m.elev||[])m._navMaxHeight=Math.max(m._navMaxHeight,h);
    for(const r of m.ramps||[])m._navMaxHeight=Math.max(m._navMaxHeight,r.high);
  }
  function addRamp(m,r) {
    m._surfaceFlatHeight=null;
    const i=m.ramps.length;m.ramps.push(r);
    const changed=new Set();
    for(let k=0;k<r.length;k++)for(let w=-Math.floor((r.width||3)/2);w<=Math.floor((r.width||3)/2);w++) {
      const x=r.x+r.dx*k+(r.dy?w:0),y=r.y+r.dy*k+(r.dx?w:0);
      m._rampTiles[x+y*m.w]=i;changed.add(x+y*m.w);
      for(const [dx,dy] of directions)if(inside(m,x+dx,y+dy))changed.add(x+dx+(y+dy)*m.w);
    }
    for(const key of changed) {
      const x=key%m.w,y=Math.floor(key/m.w);m._surfaceEdges[key]=0;
      for(let d=0;d<4;d++){const [dx,dy]=directions[d];if(edgeMatches(m,x,y,x+dx,y+dy))m._surfaceEdges[key]|=1<<d;}
    }
    // Geometry identity also invalidates the renderer's projected floor cache.
    m._surfaceGeometry=new Map();m._navMaxHeight=Math.max(m._navMaxHeight,r.high);
  }
  function connected(m,x,y,nx,ny) {
    if(!inside(m,x,y)||!inside(m,nx,ny))return false;
    if(x===nx&&y===ny)return true;
    const dx=nx-x,dy=ny-y;
    if(Math.abs(dx)>1||Math.abs(dy)>1)return false;
    if(dx&&dy)return connected(m,x,y,nx,y)&&connected(m,x,y,x,ny)&&connected(m,nx,y,nx,ny)&&connected(m,x,ny,nx,ny);
    const d=dx?dx>0?0:1:dy>0?2:3;
    return m._surfaceEdges ? !!(m._surfaceEdges[x+y*m.w]&(1<<d)) : edgeMatches(m,x,y,nx,ny);
  }
  function supported(m,x,y,radius=0) {
    if(!Number.isFinite(x+y))return false;
    const x0=Math.floor(x-radius),x1=Math.floor(x+radius),y0=Math.floor(y-radius),y1=Math.floor(y+radius);
    if(!inside(m,x0,y0)||!inside(m,x1,y1))return false;
    for(let ty=y0;ty<=y1;ty++)for(let tx=x0;tx<=x1;tx++) {
      if(m.blocked?.[tx+ty*m.w])return false;
      if(m._surfaceFlatHeight==null){
        if(tx<x1&&!connected(m,tx,ty,tx+1,ty))return false;
        if(ty<y1&&!connected(m,tx,ty,tx,ty+1))return false;
      }
    }
    return true;
  }
  function vertex(x,y,z) {return {x,y,z,sx:U.isoX(x,y),sy:U.isoY(x,y)-z*LIFT,d:x+y};}
  function polygon(points,kind,tx,ty) {
    return {points,kind,tx,ty,left:Math.min(...points.map(p=>p.sx)),right:Math.max(...points.map(p=>p.sx)),top:Math.min(...points.map(p=>p.sy)),bottom:Math.max(...points.map(p=>p.sy))};
  }
  function tileGeometry(m,x,y) {
    const key=x+y*m.w,cache=m._surfaceGeometry;
    if(cache?.has(key))return cache.get(key);
    const corners=[[x,y],[x+1,y],[x+1,y+1],[x,y+1]];
    const top=polygon(corners.map(([wx,wy])=>vertex(wx,wy,tileHeight(m,x,y,wx,wy))),'ground',x,y),faces=[];
    // Only south/east-facing walls can face this camera. Trim crossing slopes
    // at their zero-height intersection instead of stretching a rectangular wall.
    for(const [a,b,nx,ny,facing] of [[corners[1],corners[2],x+1,y,0],[corners[3],corners[2],x,y+1,4]]) {
      let ends=[a,b].map(([wx,wy])=>({x:wx,y:wy,hi:tileHeight(m,x,y,wx,wy),lo:tileHeight(m,nx,ny,wx,wy)}));
      let [p,q]=ends,dp=p.hi-p.lo,dq=q.hi-q.lo;
      if(dp<=EPS&&dq<=EPS)continue;
      if(dp<0||dq<0) {
        const t=dp/(dp-dq),v={x:U.lerp(p.x,q.x,t),y:U.lerp(p.y,q.y,t),hi:U.lerp(p.hi,q.hi,t),lo:U.lerp(p.lo,q.lo,t)};
        if(dp<0)p=v;else q=v;
      }
      const face=polygon([vertex(p.x,p.y,p.hi),vertex(q.x,q.y,q.hi),vertex(q.x,q.y,q.lo),vertex(p.x,p.y,p.lo)],'cliff',x,y);
      face.facing=facing;faces.push(face);
    }
    const result={top,faces};cache?.set(key,result);return result;
  }
  function sample(poly,sx,sy) {
    if(sx<poly.left-EPS||sx>poly.right+EPS||sy<poly.top-EPS||sy>poly.bottom+EPS)return null;
    const a=poly.points[0];
    for(let i=1;i<poly.points.length-1;i++) {
      const b=poly.points[i],c=poly.points[i+1],den=(b.sy-c.sy)*(a.sx-c.sx)+(c.sx-b.sx)*(a.sy-c.sy);
      if(Math.abs(den)<EPS)continue;
      const u=((b.sy-c.sy)*(sx-c.sx)+(c.sx-b.sx)*(sy-c.sy))/den;
      const v=((c.sy-a.sy)*(sx-c.sx)+(a.sx-c.sx)*(sy-c.sy))/den,w=1-u-v;
      if(u>=-EPS&&v>=-EPS&&w>=-EPS)return {x:u*a.x+v*b.x+w*c.x,y:u*a.y+v*b.y+w*c.y,z:u*a.z+v*b.z+w*c.z,depth:u*a.d+v*b.d+w*c.d,kind:poly.kind,tx:poly.tx,ty:poly.ty};
    }
    return null;
  }
  function pick(m,sx,sy) {
    if(!Number.isFinite(sx+sy))return null;
    const bx=U.unisoX(sx,sy),by=U.unisoY(sx,sy),pad=(m._navMaxHeight||0)*LIFT/32;
    let hit=null;
    for(let y=Math.max(0,Math.floor(by)-1);y<=Math.min(m.h-1,Math.floor(by+pad)+1);y++)
      for(let x=Math.max(0,Math.floor(bx)-1);x<=Math.min(m.w-1,Math.floor(bx+pad)+1);x++) {
        const g=tileGeometry(m,x,y);
        for(const poly of [...g.faces,g.top]) {
          const p=sample(poly,sx,sy);
          if(p&&(!hit||p.depth>hit.depth+EPS||(Math.abs(p.depth-hit.depth)<EPS&&p.kind==='ground')))hit=p;
        }
      }
    return hit;
  }
  // Clip to terrain in front of a billboard's world depth. Used for visual
  // occlusion and tests; interpolation preserves the projected surface plane.
  function inFront(poly,depth) {
    const out=[],points=poly.points;
    for(let i=0;i<points.length;i++) {
      const a=points[i],b=points[(i+1)%points.length],ia=a.d>depth+EPS,ib=b.d>depth+EPS;
      if(ia)out.push(a);
      if(ia!==ib){const t=(depth+EPS-a.d)/(b.d-a.d);out.push({sx:U.lerp(a.sx,b.sx,t),sy:U.lerp(a.sy,b.sy,t)});}
    }
    return out;
  }
  return {LIFT,directions,heightAt,tileHeight,rebuild,addRamp,connected,supported,tileGeometry,sample,pick,inFront};
})();

{
  const {heightAt,tileHeight,supported,connected,tileGeometry}=TerrainSurface;
  // Keep these hot queries monomorphic; rest-argument wrappers allocate in
  // every collision sample and prevent the small terrain routines inlining.
  TerrainSurface.heightAt=(m,x,y,id)=>heightAt(m.layers?TerrainLayers.view(m,id):m,x,y);
  TerrainSurface.tileHeight=(m,x,y,wx,wy,id)=>tileHeight(m.layers?TerrainLayers.view(m,id):m,x,y,wx,wy);
  TerrainSurface.supported=(m,x,y,r,id)=>supported(m.layers?TerrainLayers.view(m,id):m,x,y,r);
  TerrainSurface.connected=(m,x,y,nx,ny,id)=>connected(m.layers?TerrainLayers.view(m,id):m,x,y,nx,ny);
  TerrainSurface.tileGeometry=(m,x,y,id)=>tileGeometry(m.layers?TerrainLayers.view(m,id):m,x,y);
}
{
  const original=TerrainSurface.pick;
  TerrainSurface.pick=function(m,sx,sy,preferred=0){
    if(!m.layers)return original(m,sx,sy);
    const hits=[];
    for(const surfaceId of [0,1]){
      const v=TerrainLayers.view(m,surfaceId),hit=original(v,sx,sy);
      if(hit?.kind==='ground'&&!v.blocked[hit.tx+hit.ty*m.w])hits.push({...hit,surfaceId});
    }
    return hits.find(h=>h.surfaceId===preferred)||hits.sort((a,b)=>b.depth-a.depth)[0]||null;
  };
}

/* Optional second walking surface. A view reuses the established terrain math;
   each floor owns its blockers, ramps and geometry. Scope is synchronous and
   restored even when an effect throws. Delayed effects capture their own ID. */
const TerrainLayers = (() => {
  let active = null;
  const id = p => p?.surfaceId ?? 0;
  const current = m => active?.map === m ? active.surfaceId : 0;
  function view(m, surfaceId = current(m)) {
    return surfaceId && m.layers ? m.layers[surfaceId] || m : m;
  }
  function scope(m, owner, fn) {
    if (!m?.layers) return fn();
    const previous = active; active = {map:m,surfaceId:typeof owner==='number'?owner:id(owner),targets:new WeakMap()};
    try { return fn(); } finally { active = previous; }
  }
  function same(a,b) { return id(a) === id(b); }
  function affects(m,target,source) {
    return !m?.layers || id(target) === (active?.map===m ? active.surfaceId : id(source));
  }
  function targets(list,owner) {
    if (!active && !owner) return list;
    const surfaceId=owner?id(owner):active.surfaceId;
    const cached=!owner&&active.targets.get(list);
    if(cached&&cached.length===list.length)return cached.items;
    const items=list.filter(p=>id(p)===surfaceId);
    if(!owner)active.targets.set(list,{length:list.length,items});
    return items;
  }
  function connectAt(m,x,y,from,to,radius=.36) {
    return (m.surfaceLinks||[]).some(p=>((p.from===from&&p.to===to)||(p.from===to&&p.to===from))&&
      Math.hypot(x-p.x,y-p.y)<.08&&TerrainSurface.supported(view(m,from),x,y,radius)&&TerrainSurface.supported(view(m,to),x,y,radius));
  }
  return {id,current,view,scope,same,affects,targets,connectAt};
})();
