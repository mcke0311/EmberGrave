/* =========================================================================
   EMBERGRAVE — mapgen.js
   Map construction. The town is hand-laid; wilderness and crypt levels are
   procedurally assembled from a per-character world seed, so layouts are
   deterministic for a given hero but differ between heroes.
   ========================================================================= */
"use strict";

const MapGen = (() => {

  /* World scale: explorable maps (wilds / fields / forest / crypts) are this many times
     bigger per side, so 4× the play area at SIZE_MUL=2. Hand-laid hubs (town/camps) are
     unaffected. Content density is scaled per generator from AREA_MUL so big maps stay full. */
  const SIZE_MUL = 2;
  const AREA_MUL = SIZE_MUL * SIZE_MUL;                 // prop/decor density multiplier (×4)
  const MOB_MUL = Math.min(AREA_MUL, 2.75);             // monster density (capped for perf on huge maps)
  const sz = n => Math.round(n * SIZE_MUL);             // scale a base dimension
  const dn = (n, mul) => Math.max(1, Math.round(n * (mul === undefined ? AREA_MUL : mul)));  // scale a count

  function blank(zoneId, w, h) {
    const zone = DATA.ZONES[zoneId];
    return {
      id: zoneId, zone, w, h,
      floor: new Uint8Array(w * h),
      walls: new Uint8Array(w * h),      // 1 = solid wall block
      blocked: new Uint8Array(w * h),    // walls + blocking props
      hazard: new Uint8Array(w * h),     // terrain-hazard code per tile (0=none -> DATA.HAZARDS). NEVER serialized.
      elev: new Uint8Array(w * h),       // terrain HEIGHT per tile (0=ground). NEVER serialized.
      explored: new Uint8Array(w * h),
      props: [], npcs: [], monsterSpawns: [], exits: [], lights: [], chimneys: [],
      spawns: {}, shrine: null, rain: false,
      minimapBase: null,
    };
  }
  const idx = (m, x, y) => x + y * m.w;
  function setWall(m, x, y, v) { if (x < 0 || y < 0 || x >= m.w || y >= m.h) return; m.walls[idx(m, x, y)] = v; m.blocked[idx(m, x, y)] = v; }
  function isWall(m, x, y) { return x < 0 || y < 0 || x >= m.w || y >= m.h ? 1 : m.walls[idx(m, x, y)]; }
  function block(m, x, y) { if (x >= 0 && y >= 0 && x < m.w && y < m.h) m.blocked[idx(m, x, y)] = 1; }
  function setHaz(m, x, y, code) { if (x >= 0 && y >= 0 && x < m.w && y < m.h) m.hazard[idx(m, x, y)] = code; }
  function setElev(m, x, y, v) { if (x >= 0 && y >= 0 && x < m.w && y < m.h) m.elev[idx(m, x, y)] = v; }
  const elevAt = (m, x, y) => (x < 0 || y < 0 || x >= m.w || y >= m.h) ? 0 : m.elev[idx(m, x, y)];
  /* may an entity step from tile a to tile b? blocked-aware AND height-aware (climb/descend <=1). */
  function canStep(m, ax, ay, bx, by) {
    return walkable(m,bx,by) && (m.surfaceVersion ? TerrainSurface.connected(m,Math.floor(ax),Math.floor(ay),Math.floor(bx),Math.floor(by)) : Math.abs(elevAt(m,ax|0,ay|0)-elevAt(m,bx|0,by|0))<=1);
  }
  function walkable(m, x, y) { x |= 0; y |= 0; return x >= 0 && y >= 0 && x < m.w && y < m.h && !m.blocked[idx(m, x, y)]; }

  function addProp(m, type, x, y, opts) {
    const p = Object.assign({ type, x, y, seed: ((x * 31 + y * 17) | 0), blocks: true }, opts || {});
    m.props.push(p);
    if (p.blocks) block(m, x | 0, y | 0);
    return p;
  }
  function addLight(m, x, y, r, color, flicker) { m.lights.push({ x, y, r, color: color || "#ff9c50", flicker: flicker !== false }); }

  /* keep every arrival/spawn tile (and its neighbors) free of TRAPPING decor,
     so a randomly-placed brazier/urn can never box the player in on entry.
     Interactables (shrines, forge, storage, the board) are MEANT to sit beside
     spawns — never remove them, and never carve their tile open (so the player
     stands next to them and clicks, rather than walking onto them). */
  function clearSpawns(m) {
    const pts = Object.values(m.spawns || {});
    if (m.shrine) pts.push(m.shrine);
    for (const sp of pts) {
      if (!sp) continue;
      for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
        const tx = (sp.x | 0) + ox, ty = (sp.y | 0) + oy;
        if (tx < 0 || ty < 0 || tx >= m.w || ty >= m.h) continue;
        m.hazard[idx(m, tx, ty)] = 0;                     // never strand an arrival tile on a hazard
        m.elev[idx(m, tx, ty)] = 0;                       // keep arrival tiles flat & reachable
        if (m.walls[idx(m, tx, ty)]) continue;            // never carve actual walls open
        if (m.buildings?.some(b => tx >= b.footprint.x0 && tx < b.footprint.x1 && ty >= b.footprint.y0 && ty < b.footprint.y1)) continue;
        let interactable = false;
        for (let i = m.props.length - 1; i >= 0; i--) {
          const pr = m.props[i];
          if ((pr.x | 0) !== tx || (pr.y | 0) !== ty || !pr.blocks) continue;
          if (pr.interact) { interactable = true; continue; }  // KEEP shrine/forge/storage/board
          m.props.splice(i, 1);                                // clear incidental decor only
        }
        if (!interactable) m.blocked[idx(m, tx, ty)] = 0;       // leave interactable tiles solid
      }
    }
  }

  function bakeMinimap(m) {
    clearSpawns(m);   // ensure no spawn tile is blocked before we finalize the map
    const c = document.createElement("canvas");
    c.width = m.w; c.height = m.h;
    const ctx = c.getContext("2d");
    const img = ctx.createImageData(m.w, m.h);
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      const i = idx(m, x, y) * 4;
      if (m.walls[idx(m, x, y)]) { img.data[i] = 120; img.data[i + 1] = 110; img.data[i + 2] = 96; img.data[i + 3] = 255; }
      else if (m.settlement) {
        const tile=x+y*m.w, color=m.blocked[tile]?[112,101,84]:m.floor[tile]===5?[116,110,91]:m.settlementWater?.[tile]?[33,67,66]:[47,50,43];
        img.data.set([...color,255],i);
      } else {
        const e = m.elev ? m.elev[idx(m, x, y)] : 0;   // higher terraces read brighter on the map
        img.data[i] = 42 + e * 24; img.data[i + 1] = 40 + e * 22; img.data[i + 2] = 36 + e * 17; img.data[i + 3] = 220;
      }
    }
    ctx.putImageData(img, 0, 0);
    m.minimapBase = c;
  }
  function scatterFloor(m, r) {
    for (let i = 0; i < m.floor.length; i++) m.floor[i] = (r() * 4) | 0;
  }
  /* carve a wandering walkable trail between two points, painting a visible tan
     path (floor=4) along its centre so it reads as a road to the objective.
     OUTDOOR-ONLY (genFields/genWilds callers); genCrypt uses its own carveCorr. */
  function carveTrail(m, r, x0, y0, x1, y1) {
    let px = x0 | 0, py = y0 | 0;
    const tx = U.clamp(x1 | 0, 2, m.w - 3), ty = U.clamp(y1 | 0, 2, m.h - 3);
    let guard = 0;
    while ((px !== tx || py !== ty) && guard++ < 900) {
      for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) setWall(m, px + ox, py + oy, 0);
      if (!m.walls[idx(m, px, py)]) m.floor[idx(m, px, py)] = 4;   // visible tan path
      const dx = Math.sign(tx - px), dy = Math.sign(ty - py);
      if (dx !== 0 && (dy === 0 || r() < 0.5)) px += dx;
      else if (dy !== 0) py += dy;
      px = U.clamp(px, 2, m.w - 3); py = U.clamp(py, 2, m.h - 3);
    }
    if (!m.walls[idx(m, tx, ty)]) m.floor[idx(m, tx, ty)] = 4;     // paint the terminus too
  }
  /* sizeable open pockets sealed behind dense terrain get a trail carved back to known
     ground (wall-level connectivity; elevation ramps are the elevation carver's job) */
  function connectPockets(m, r, sx, sy, minSize) {
    sx |= 0; sy |= 0;
    if (!walkable(m, sx, sy)) return;
    const seen = new Uint8Array(m.w * m.h), st = [[sx, sy]];
    seen[idx(m, sx, sy)] = 1;
    while (st.length) {
      const c = st.pop();
      for (const d of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = c[0] + d[0], ny = c[1] + d[1];
        if (nx < 1 || ny < 1 || nx >= m.w - 1 || ny >= m.h - 1 || seen[idx(m, nx, ny)] || m.blocked[idx(m, nx, ny)]) continue;
        seen[idx(m, nx, ny)] = 1; st.push([nx, ny]);
      }
    }
    const done = new Uint8Array(m.w * m.h);
    for (let y = 1; y < m.h - 1; y++) for (let x = 1; x < m.w - 1; x++) {
      const i = idx(m, x, y);
      if (seen[i] || done[i] || m.blocked[i]) continue;
      const st2 = [[x, y]]; done[i] = 1; let n = 0, cx = 0, cy = 0;
      while (st2.length) {
        const c = st2.pop(); n++; cx += c[0]; cy += c[1];
        for (const d of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = c[0] + d[0], ny = c[1] + d[1], j = idx(m, nx, ny);
          if (nx < 1 || ny < 1 || nx >= m.w - 1 || ny >= m.h - 1 || done[j] || seen[j] || m.blocked[j]) continue;
          done[j] = 1; st2.push([nx, ny]);
        }
      }
      if (n < (minSize || 30)) continue;
      /* trail from the pocket's centroid to the nearest already-reached tile */
      const px = cx / n, py = cy / n;
      let bx = sx, by = sy, bd = 1e9;
      for (let ty = 1; ty < m.h - 1; ty += 2) for (let tx = 1; tx < m.w - 1; tx += 2) {
        if (!seen[idx(m, tx, ty)]) continue;
        const dd = U.dist2(tx, ty, px, py);
        if (dd < bd) { bd = dd; bx = tx; by = ty; }
      }
      carveTrail(m, r, px, py, bx, by);
    }
  }

  /* ---- biome terrain hazards (walkable-but-dangerous tiles; never walls, never the road) ----
     paints into m.hazard. Connectivity-safe: only walkable, non-road tiles are touched. */
  function paintHazBlob(m, r, cx, cy, rad, code, scorchCode) {
    for (let y = (cy - rad - 1) | 0; y <= cy + rad + 1; y++)
      for (let x = (cx - rad - 1) | 0; x <= cx + rad + 1; x++) {
        if (!walkable(m, x, y)) continue;            // never on walls/blocked
        if (m.floor[idx(m, x, y)] >= 4) continue;    // keep the road safe
        const d = U.dist(x, y, cx, cy);
        if (d < rad * (0.6 + r() * 0.4)) setHaz(m, x, y, code);
        else if (scorchCode && d < rad + 1.2 && !m.hazard[idx(m, x, y)]) setHaz(m, x, y, scorchCode);
      }
  }
  function carveHazClumps(m, r, code, blobs, radR, scorch) {
    for (let c = 0; c < blobs; c++)
      paintHazBlob(m, r, 6 + r() * (m.w - 12), 6 + r() * (m.h - 12), radR[0] + r() * (radR[1] - radR[0]), code, scorch);
  }
  function carveHazBasin(m, r, code, scorch) {            // one large central field
    paintHazBlob(m, r, m.w * (0.4 + r() * 0.2), m.h * (0.4 + r() * 0.2), Math.min(m.w, m.h) * (0.18 + r() * 0.07), code, scorch);
  }
  function carveHazVeins(m, r, code) {                    // 2-3 drifting diagonal channels
    const n = 2 + (r() * 2 | 0);
    for (let v = 0; v < n; v++) {
      const horiz = r() < 0.5, len = horiz ? m.w : m.h, drift = (r() - 0.5) * 0.5;
      let p = 4 + r() * ((horiz ? m.h : m.w) - 8);
      for (let t = 2; t < len - 2; t++, p += drift)
        for (let w = -1; w <= 1; w++) {
          const x = horiz ? t : ((p + w) | 0), y = horiz ? ((p + w) | 0) : t;
          if (walkable(m, x, y) && m.floor[idx(m, x, y)] < 4) setHaz(m, x, y, code);
        }
    }
  }

  /* ---- terrain ELEVATION v2: coherent terraced LANDFORMS from smooth value-noise —
     broad plateaus / flat-top mesas / bog hummocks with REAL cliffs (Δ>1 blocks steps),
     then deliberately-carved stepped ramps so every terrace is foot-reachable.
     Roads, spawn yards and massif feet always stay at grade. ---- */
  function nearSpawn(m, x, y) {
    const pts = Object.values(m.spawns || {}); if (m.shrine) pts.push(m.shrine);
    for (const sp of pts) if (sp && Math.abs((sp.x | 0) - x) <= 3 && Math.abs((sp.y | 0) - y) <= 3) return true;
    return false;
  }
  /* smooth deterministic 2D field in [0,1) — bilinear-interpolated random lattice */
  function valueNoise(r, w, h, cell) {
    const gw = Math.ceil(w / cell) + 2, gh = Math.ceil(h / cell) + 2;
    const g = new Float32Array(gw * gh);
    for (let i = 0; i < g.length; i++) g[i] = r();
    const sm = t => t * t * (3 - 2 * t);
    return (x, y) => {
      const fx = x / cell, fy = y / cell, ix = fx | 0, iy = fy | 0;
      const tx = sm(fx - ix), ty = sm(fy - iy);
      const a = g[ix + iy * gw], b = g[ix + 1 + iy * gw], c = g[ix + (iy + 1) * gw], d = g[ix + 1 + (iy + 1) * gw];
      return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
    };
  }
  /* BFS of every tile the player can FOOT-reach (walkable + |Δelev|<=1 per step) */
  function footReach(m, sx, sy) {
    const seen = new Uint8Array(m.w * m.h);
    sx |= 0; sy |= 0;
    if (!walkable(m, sx, sy)) return seen;
    const st = [[sx, sy]];
    seen[idx(m, sx, sy)] = 1;
    while (st.length) {
      const c = st.pop();
      for (const d of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = c[0] + d[0], ny = c[1] + d[1];
        if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h || seen[idx(m, nx, ny)]) continue;
        if (canStep(m, c[0], c[1], nx, ny)) { seen[idx(m, nx, ny)] = 1; st.push([nx, ny]); }
      }
    }
    return seen;
  }
  function elevConnected(m) {       // can the player foot-reach every exit/shrine/spawn from the default spawn?
    const sp = m.spawns && m.spawns.default; if (!sp) return true;
    const seen = footReach(m, sp.x, sp.y);
    const targets = [];
    if (m.shrine) targets.push(m.shrine);
    for (const k in (m.spawns || {})) targets.push(m.spawns[k]);
    for (const e of (m.exits || [])) targets.push({ x: (e.x0 + e.x1) / 2, y: (e.y0 + e.y1) / 2 });
    for (const t of targets) {
      if (!t || isNaN(t.x)) continue;
      const tx = U.clamp(t.x | 0, 0, m.w - 1), ty = U.clamp(t.y | 0, 0, m.h - 1);
      let ok = false;
      for (let oy = -2; oy <= 2 && !ok; oy++) for (let ox = -2; ox <= 2; ox++)
        if (seen[idx(m, U.clamp(tx + ox, 0, m.w - 1), U.clamp(ty + oy, 0, m.h - 1))]) ok = true;
      if (!ok) return false;
    }
    return true;
  }
  /* cut stepped, path-tinted ramps into terrace edges until the whole map is foot-reachable.
     Leaves at most a small remainder (jump-only shelves — see the treasure drop below). */
  function carveRamps(m, r) {
    const sp = m.spawns && m.spawns.default; if (!sp) return;
    for (let attempt = 0; attempt < 40; attempt++) {
      const seen = footReach(m, sp.x, sp.y);
      const edges = [];
      for (let y = 1; y < m.h - 1; y++) for (let x = 1; x < m.w - 1; x++) {
        if (!seen[idx(m, x, y)]) continue;
        for (const d of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + d[0], ny = y + d[1];
          if (walkable(m, nx, ny) && !seen[idx(m, nx, ny)] && !nearSpawn(m, nx, ny) &&
              Math.abs(elevAt(m, x, y) - elevAt(m, nx, ny)) > 1) edges.push([x, y, d[0], d[1]]);
        }
      }
      if (!edges.length) break;
      const [x0, y0, dx, dy] = edges[(r() * edges.length) | 0];
      const e0 = elevAt(m, x0, y0), e1 = elevAt(m, x0 + dx, y0 + dy);
      const s = Math.sign(e1 - e0), rise = Math.abs(e1 - e0);
      /* grade a 3-wide stepped cut climbing one level per tile, tinted as a trail */
      for (let k = 1; k <= rise; k++) {
        for (let w = -1; w <= 1; w++) {
          const tx = x0 + dx * k + (dy !== 0 ? w : 0), ty = y0 + dy * k + (dx !== 0 ? w : 0);
          if (tx < 1 || ty < 1 || tx >= m.w - 1 || ty >= m.h - 1) continue;
          if (m.walls[idx(m, tx, ty)] || nearSpawn(m, tx, ty)) continue;
          setElev(m, tx, ty, Math.max(0, e0 + s * k));
          if (w === 0) m.floor[idx(m, tx, ty)] = 4;   // the ramp reads as a climbing trail
        }
      }
    }
  }
  function carveElevation(m, r, cfg) {
    const maxH = cfg.maxH || 2;
    const style = cfg.style || "shelves";
    const cell = cfg.cell || Math.max(8, Math.round(Math.min(m.w, m.h) / 7));
    const n = valueNoise(r, m.w, m.h, cell);
    const protectedTile = (x, y) => m.floor[idx(m, x, y)] >= 4 || nearSpawn(m, x, y);
    /* 1. broad terraces straight from the noise field (continents of height, not pimples) */
    for (let y = 1; y < m.h - 1; y++) for (let x = 1; x < m.w - 1; x++) {
      if (m.walls[idx(m, x, y)] || protectedTile(x, y)) continue;
      let v = n(x, y);
      if (style === "mesa" && v < 0.62) v = 0;       // flats dominate; what rises is a mesa
      if (style === "hummock" && v < 0.68) v = 0;    // low wet ground with raised hummocks
      let e = Math.min(maxH, Math.floor(v * (maxH + 1.35)));
      if (style === "mesa" && e > 0) e = maxH;       // sheer flat-topped mesas
      if (e > 0) setElev(m, x, y, e);
    }
    /* 2. de-speckle: majority filter twice so terrace edges are clean lines */
    for (let pass = 0; pass < 2; pass++) {
      const src = m.elev.slice();
      for (let y = 1; y < m.h - 1; y++) for (let x = 1; x < m.w - 1; x++) {
        if (m.walls[idx(m, x, y)] || protectedTile(x, y)) continue;
        const cnt = {};
        for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) { const v = src[idx(m, x + ox, y + oy)]; cnt[v] = (cnt[v] || 0) + 1; }
        let best = src[idx(m, x, y)], bn = 0;
        for (const k in cnt) if (cnt[k] > bn) { bn = cnt[k]; best = +k; }
        m.elev[idx(m, x, y)] = best;
      }
    }
    /* 3. massif feet stay at grade (walls never float against cliffs) */
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      if (!m.walls[idx(m, x, y)]) continue;
      for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) setElev(m, x + ox, y + oy, 0);
    }
    if(m.id==='north_wild') {
      buildTerraceRamps(m);
      m.hasElev=m.elev.some(v=>v>0);
      return;
    }
    /* 4. carve stepped ramps until the terraces are foot-connected */
    carveRamps(m, r);
    /* 5. any surviving pocket is jump-only bonus ground — drop a treasure chest on the biggest one */
    const sp = m.spawns && m.spawns.default;
    if (sp) {
      const seen = footReach(m, sp.x, sp.y);
      let bestPocket = null, bestN = 0, comp = new Int32Array(m.w * m.h).fill(-1), nComp = 0;
      for (let y = 1; y < m.h - 1; y++) for (let x = 1; x < m.w - 1; x++) {
        const i = idx(m, x, y);
        if (seen[i] || !walkable(m, x, y) || comp[i] >= 0) continue;
        const st = [[x, y]]; comp[i] = nComp; let count = 0; let cx = 0, cy = 0;
        while (st.length) {
          const c = st.pop(); count++; cx += c[0]; cy += c[1];
          for (const d of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = c[0] + d[0], ny = c[1] + d[1], j = idx(m, nx, ny);
            if (nx < 1 || ny < 1 || nx >= m.w - 1 || ny >= m.h - 1 || comp[j] >= 0 || seen[j] || !walkable(m, nx, ny)) continue;
            comp[j] = nComp; st.push([nx, ny]);
          }
        }
        if (count > bestN && count >= 8 && count <= 120) { bestN = count; bestPocket = { x: cx / count, y: cy / count }; }
        nComp++;
      }
      if (bestPocket) addProp(m, "chest", bestPocket.x, bestPocket.y, { lootable: true, rich: true });
    }
    if (!elevConnected(m)) m.elev.fill(0);   // absolute safety: never soft-lock — fall back to flat
    m.hasElev = m.elev.some(v => v > 0);
  }

  function buildTerraceRamps(m) {
    clearSpawns(m);
    m.surfaceVersion=1;m.ramps=[];
    const protectedCells=new Uint8Array(m.w*m.h);
    for(let y=0;y<m.h;y++)for(let x=0;x<m.w;x++) {
      const i=idx(m,x,y);
      if(m.floor[i]>=4||nearSpawn(m,x,y)||m.props.some(p=>(p.interact||p.lootable)&&Math.abs(p.x-x-.5)<2&&Math.abs(p.y-y-.5)<2)) {
        protectedCells[i]=1;m.elev[i]=0;
      }
    }
    TerrainSurface.rebuild(m);
    const rampLandings=new Uint8Array(m.w*m.h);
    const cells=(r,landings=false)=>{
      const out=[];
      for(let k=landings?-1:0;k<(landings?r.length+1:r.length);k++)for(let w=-1;w<=1;w++)
        out.push({x:r.x+r.dx*k+(r.dy?w:0),y:r.y+r.dy*k+(r.dx?w:0),k});
      return out;
    };
    const valid=r=>cells(r,true).every(({x,y,k})=>{
      if(x<1||y<1||x>=m.w-1||y>=m.h-1)return false;
      const i=idx(m,x,y);
      if(m.blocked[i]||m._rampTiles[i]>=0)return false;
      if(k===-1)return m.elev[i]===r.low;
      if(k===r.length)return m.elev[i]===r.high;
      return !protectedCells[i]&&!rampLandings[i]&&m.elev[i]>=r.low&&m.elev[i]<=r.high;
    });
    const candidates=[];
    for(let y=2;y<m.h-2;y++)for(let x=2;x<m.w-2;x++) {
      if(m.blocked[idx(m,x,y)])continue;
      const low=m.elev[idx(m,x,y)];
      for(const [dx,dy] of TerrainSurface.directions)for(let high=low+1;high<=3;high++) {
        const ramp={x:x+dx,y:y+dy,dx,dy,width:3,length:2*(high-low),low,high};
        if(valid(ramp))candidates.push(ramp);
      }
    }
    // Short connections first; row/direction order supplies deterministic ties.
    candidates.sort((a,b)=>a.length-b.length);
    const sp=m.spawns.default;
    const physical=new Uint8Array(m.w*m.h),open=[idx(m,sp.x|0,sp.y|0)];physical[open[0]]=1;
    for(let q=0;q<open.length;q++)for(const [dx,dy] of TerrainSurface.directions) {
      const x=open[q]%m.w+dx,y=Math.floor(open[q]/m.w)+dy,i=idx(m,x,y);
      if(x>=0&&y>=0&&x<m.w&&y<m.h&&!m.blocked[i]&&!physical[i]){physical[i]=1;open.push(i);}
    }
    let reach=footReach(m,sp.x,sp.y);
    for(;;) {
      const r=candidates.find(r=>{
        const a=idx(m,r.x-r.dx,r.y-r.dy),b=idx(m,r.x+r.dx*r.length,r.y+r.dy*r.length);
        return !!reach[a]!==!!reach[b]&&valid(r);
      });
      if(!r)break;
      TerrainSurface.addRamp(m,r);
      for(const {x,y,k} of cells(r,true))if(k===-1||k===r.length)rampLandings[idx(m,x,y)]=1;
      for(const {x,y} of cells(r)) {m.floor[idx(m,x,y)]=4;m.hazard[idx(m,x,y)]=0;}
      reach=footReach(m,sp.x,sp.y);
    }
    // Ordinary pockets without room for a safe ramp return to grade. If a
    // zero-height basin is enclosed by a reachable terrace, cut a short access
    // trail to reachable grade. No walls, props or protected roads are moved.
    for(let pass=0;pass<m.w*m.h;pass++) {
      let changed=false;
      for(let i=0;i<m.elev.length;i++)if(!reach[i]&&!m.blocked[i]&&m.elev[i]) {m.elev[i]=0;changed=true;}
      const retained=m.ramps.filter(r=>cells(r,true).every(({x,y,k})=>k!==-1&&k!==r.length||m.elev[idx(m,x,y)]===(k===-1?r.low:r.high)));
      if(retained.length!==m.ramps.length){m.ramps=retained;changed=true;}
      if(changed){TerrainSurface.rebuild(m);reach=footReach(m,sp.x,sp.y);}
      const stranded=physical.findIndex((v,i)=>v&&!reach[i]);
      if(stranded<0)break;
      const queue=[stranded],prev=new Int32Array(m.w*m.h).fill(-1);prev[stranded]=stranded;
      let end=-1;
      for(let q=0;q<queue.length;q++) {
        const i=queue[q],x=i%m.w,y=Math.floor(i/m.w);
        if(reach[i]&&m.elev[i]===0&&m._rampTiles[i]<0){end=i;break;}
        for(const [dx,dy] of TerrainSurface.directions) {
          const nx=x+dx,ny=y+dy,j=idx(m,nx,ny);
          if(nx<0||ny<0||nx>=m.w||ny>=m.h||m.blocked[j]||prev[j]>=0)continue;
          prev[j]=i;queue.push(j);
        }
      }
      if(end<0)throw Error('Disconnected wilderness floor at '+stranded);
      const cut=new Set();
      for(let i=end;;i=prev[i]){cut.add(i);m.elev[i]=0;m.floor[i]=4;m.hazard[i]=0;if(i===stranded)break;}
      // A cut touching a ramp or either landing removes the complete ramp.
      m.ramps=m.ramps.filter(r=>!cells(r,true).some(({x,y})=>cut.has(idx(m,x,y))));
      TerrainSurface.rebuild(m);reach=footReach(m,sp.x,sp.y);
    }
    m.terrainDiagnostics={ramps:m.ramps.length,raisedTiles:m.elev.reduce((n,h)=>n+(h>0),0)};
  }

  /* ---- landform FEATURES the wilds archetypes compose ---- */
  /* a winding hazard river crossing the whole map edge-to-edge (roads stay dry) */
  function carveRivers(m, r, cfg) {
    const code = DATA.HAZARD_BY_ID[cfg.haz]; if (!code) return;
    const scorch = cfg.scorch ? DATA.HAZARD_BY_ID.scorch : 0;
    const W = cfg.width || 2;
    for (let v = 0; v < (cfg.n || 3); v++) {
      const horiz = r() < 0.5;
      let x = horiz ? 2 : 6 + r() * (m.w - 12);
      let y = horiz ? 6 + r() * (m.h - 12) : 2;
      let guard = 0;
      while (guard++ < (m.w + m.h) * 2 && x >= 2 && y >= 2 && x < m.w - 2 && y < m.h - 2) {
        for (let oy = -W - 1; oy <= W + 1; oy++) for (let ox = -W - 1; ox <= W + 1; ox++) {
          const tx = (x + ox) | 0, ty = (y + oy) | 0;
          if (!walkable(m, tx, ty) || m.floor[idx(m, tx, ty)] >= 4) continue;
          const dd = Math.hypot(ox, oy);
          if (dd <= W * 0.85) setHaz(m, tx, ty, code);
          else if (scorch && dd <= W + 1 && !m.hazard[idx(m, tx, ty)]) setHaz(m, tx, ty, scorch);
        }
        if (horiz) { x += 1; y += (r() - 0.5) * 1.7; } else { y += 1; x += (r() - 0.5) * 1.7; }
      }
    }
  }
  /* a ring-walled volcanic crater with two entrances and a molten heart */
  function carveCrater(m, r, near) {
    const angDist = (a, b) => { let d = Math.abs(a - b) % (Math.PI * 2); return d > Math.PI ? Math.PI * 2 - d : d; };
    const cx = U.clamp((near.x + U.riR(r, -18, -8)) | 0, 12, m.w - 12), cy = U.clamp((near.y + U.riR(r, 8, 18)) | 0, 12, m.h - 12);
    const rad = 6 + r() * 3, gapA = r() * Math.PI * 2;
    for (let a = 0; a < Math.PI * 2; a += 0.04) {
      if (Math.min(angDist(a, gapA), angDist(a, gapA + Math.PI)) < 0.55) continue;   // two gateways
      const wx = (cx + Math.cos(a) * rad) | 0, wy = (cy + Math.sin(a) * rad) | 0;
      if (m.floor[idx(m, wx, wy)] < 4) setWall(m, wx, wy, 1);
    }
    const lava = DATA.HAZARD_BY_ID.lava, scorch = DATA.HAZARD_BY_ID.scorch;
    for (let y = (cy - rad) | 0; y <= cy + rad; y++) for (let x = (cx - rad) | 0; x <= cx + rad; x++) {
      if (!walkable(m, x, y) || m.floor[idx(m, x, y)] >= 4) continue;
      const d = U.dist(x, y, cx, cy);
      if (d < rad * 0.45) setHaz(m, x, y, lava);
      else if (d < rad * 0.75 && scorch) setHaz(m, x, y, scorch);
    }
    addProp(m, "embershard", cx, cy - rad * 0.85, { blocks: true });
    addLight(m, cx, cy, 6, "#ff5040", false);
  }
  /* small hand-shaped SETPIECES scattered off the road so exploring finds real places */
  function placePOIs(m, r, road, entry, n) {
    const kinds = ["stone_ring", "lost_caravan", "old_watch", "bone_garden"];
    for (let i = kinds.length - 1; i > 0; i--) { const j = (r() * (i + 1)) | 0; const t = kinds[i]; kinds[i] = kinds[j]; kinds[j] = t; }
    for (let p = 0; p < Math.min(n, kinds.length); p++) {
      const rp = road[Math.min(road.length - 1, ((0.18 + 0.64 * r()) * road.length) | 0)] || { x: m.w / 2, y: m.h / 2 };
      const px = U.clamp((rp.x + U.riR(r, -18, 18)) | 0, 8, m.w - 9), py = U.clamp((rp.y + U.riR(r, 10, 20) * (p % 2 ? 1 : -1)) | 0, 8, m.h - 9);
      if (U.dist(px, py, entry.x, entry.y) < 12) continue;
      for (let oy = -3; oy <= 3; oy++) for (let ox = -3; ox <= 3; ox++) setWall(m, px + ox, py + oy, 0);
      carveTrail(m, r, rp.x, rp.y, px, py);
      const kind = kinds[p];
      if (kind === "stone_ring") {
        for (let a = 0; a < 8; a++) addProp(m, "rock", px + Math.cos(a / 8 * Math.PI * 2) * 2.6, py + Math.sin(a / 8 * Math.PI * 2) * 2.6, { seed: (r() * 9999) | 0 });
        addProp(m, "embershard", px, py, { blocks: true }); addLight(m, px, py, 4.5, "#ff5040", false);
      } else if (kind === "lost_caravan") {
        addProp(m, "cart", px, py); addProp(m, "hay", px + 1.6, py + 0.8, { blocks: false });
        addProp(m, "crate", px - 1.5, py + 1, { breakable: true }); addProp(m, "barrel", px + 1.2, py - 1.2, { breakable: true });
        addProp(m, "chest", px - 0.6, py - 1.6, { lootable: true });
      } else if (kind === "old_watch") {
        for (const [ox, oy] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) addProp(m, "pillar", px + ox, py + oy);
        addProp(m, "brazier", px, py - 1, { light: true }); addLight(m, px, py - 1, 4.5, "#ff9c50");
        addProp(m, "chest", px + 0.6, py + 1, { lootable: true });
      } else {   /* bone_garden */
        for (let a = 0; a < 6; a++) addProp(m, "grave", px + Math.cos(a / 6 * Math.PI * 2) * 2.4, py + Math.sin(a / 6 * Math.PI * 2) * 2.4, { seed: (r() * 9999) | 0 });
        addProp(m, "deadtree", px, py, { seed: (r() * 9999) | 0 });
        for (let u = 0; u < 3; u++) addProp(m, "urn", px + U.riR(r, -2, 2), py + U.riR(r, -2, 2), { breakable: true });
      }
    }
  }

  /* one call per generator: per-seed hazard macro + (for big outdoor maps) terrain elevation */
  function biomeApply(m, r) {
    const bio = DATA.BIOMES && DATA.BIOMES[m.zone.theme];
    if (!bio) return;
    if (bio.hazard) {
      const hz = bio.hazard, code = DATA.HAZARD_BY_ID[hz.id];
      if (code) {
        const scorch = hz.scorchRing ? DATA.HAZARD_BY_ID.scorch : 0;
        const macro = U.pickR(r, bio.macro || ["plain"]);
        m._macro = macro;
        if (macro === "basin") carveHazBasin(m, r, code, scorch);
        else if (macro === "ravine") carveHazVeins(m, r, code);
        else if (macro === "cluster") carveHazClumps(m, r, code, (hz.blobs || 3) * 2, [Math.max(1, hz.rad[0] - 1), Math.max(1, hz.rad[1] - 1)], scorch);
        else carveHazClumps(m, r, code, hz.blobs || 3, hz.rad || [2, 4], scorch);
      }
    }
    /* terraced terrain only on big open maps — never inside 30-tile camps/hubs */
    if (bio.elev && m.w >= 50) carveElevation(m, r, bio.elev);
  }

  /* =====================================================================
     TOWN — Cinderwatch (hand-laid)
     ===================================================================== */
  /* Hand-authored districts. Coordinates are world tiles, not screen pixels.
     Architecture, routes and service approaches share this one layout. */
  const SETTLEMENTS = {
    town: {
      size:[44,36], gate:19, color:'#d99a3a', identity:'The market borough',
      courts:[[21.5,19.5,5.7,4.1]],
      roads:[[2.6,[[5,19],[12,18.2],[21,20],[31,19.5],[43.7,19]]],[1.8,[[21,10],[20,13],[20,17]]],[1.65,[[8.5,14],[10,18],[10.5,23],[14,26.5],[20,26],[22,22]]],[1.6,[[21,21],[25,24.5],[31,26.5],[34,23]]],[1.7,[[28,19],[28.3,15.5],[30.5,13.5]]]],
      buildings:[['hall',21,8],['workshop',8,11],['market',31,11],['dwelling',7,24],['dwelling',13,30],['dwelling',31,29],['dwelling',36,7],['tower',40,14],['tower',40,24]],
      shrine:[26,24], storage:[23,25], forge:[9,14], caravan:[34,23], board:[34,17], fire:[18,16], well:[24,15],
      spawn:[21.5,20.5], portal:[27.5,27],
      npcs:[['vessa',32,20.5],['korrin',10.5,14.5],['maesa',9,27],['brom',39,17],['lysa',29,15],['pip',26,17],['hask',33,24]],
      folk:[['villager_refugee',17,20],['villager_child',24,21],['villager_smith',7,15],['villager_soldier',36,20],['villager_fisher',12,24]],
      decor:[['woodpile',6,13],['woodpile',11,29],['marketgoods',29,13],['barrel',33,12],['hay',36,24],['tree',5,30],['tree',35,30],['tree',5,6],['tree',27,5]],
      fireBowls:[[15,14],[29,22]], dressing:[[12,16],[27,13],[17,28],[34,21],[10,26],[24,29]],
    },
    frosthaven: {
      size:[36,30], gate:17, color:'#8fd8ff', identity:'The hearth square',
      courts:[[18.5,17.5,4.6,3.2]],
      roads:[[2.4,[[5,17],[12,16.8],[18,18.1],[26,17.3],[35.7,17]]],[1.9,[[18,10],[17,13],[18,18],[19.5,22],[18,26.5]]],[1.65,[[8,14],[10,17],[10,22],[15,24],[23,24],[27,22]]],[1.7,[[26,13],[26,16],[25,18]]]],
      buildings:[['hall',18,7],['workshop',7,11],['market',27,10],['dwelling',7,23],['dwelling',28,25],['dwelling',7,5],['tower',32,12],['tower',32,22]],
      shrine:[18,23], storage:[15,23], forge:[8,14], caravan:[29,20], fire:[20,14], well:[23,20],
      spawn:[18.5,18.5], portal:[21,25.5], shard:[5,26],
      npcs:[['sera',16,11],['bryn',24,16],['hewn',9.5,14.5],['wenna',26,13]],
      folk:[['villager_refugee',14,19],['villager_refugee',20,20],['villager_child',17,15],['villager_soldier',30,17],['villager_smith',6,15]],
      decor:[['woodpile',4,12],['woodpile',6,25],['woodpile',29,27],['marketgoods',29,12],['deadtree',4,19],['deadtree',25,5],['rock',3,26]],
      fireBowls:[[12.5,13],[24.5,21]], dressing:[[11,11],[23,12],[27,20],[13,26],[22,27],[4,21]],
    },
    marshcamp: {
      size:[42,30], gate:14, color:'#61b4a1', identity:'The reedbank boardwalks',
      courts:[[18.8,14.2,3.5,2.4],[20,23,2.3,1.9]],
      roads:[[2.2,[[5,14],[12,14],[18,14.4],[26,13.8],[33,14.5],[41.7,14]]],[1.9,[[19,9],[18.6,12],[19,16],[20,22],[20,25.5]]],[1.8,[[10,14],[10,19],[12,23],[18,24],[24,24],[30,22.5],[31,17],[31,14]]]],
      buildings:[['hall',18,6],['dwelling',7,8],['market',29,8],['workshop',34,20],['dwelling',6,21],['dwelling',27,27],['tower',38,9],['tower',38,20]],
      shrine:[20,22], storage:[17,23], forge:[33,23], caravan:[35,16.5], fire:[22,12], well:[13,16],
      spawn:[19.5,15.5], portal:[23.5,24.5], shard:[5,26],
      water:[[3,11,8,17],[12,18,16,22],[24,17,28,22],[34,4,39,7]],
      npcs:[['oris',17,10],['sutler_smith',31,22],['sutler_quarter',27,11]],
      folk:[['villager_fisher',10,19],['villager_fisher',25,14],['villager_child',19,18],['villager_refugee',21,17],['villager_refugee',12,24]],
      decor:[['fishnet',6,10],['fishnet',7,23],['fishnet',29,25],['marketgoods',29,11],['barrel',35,23],['deadtree',4,4],['deadtree',12,27]],
      fireBowls:[[14.5,11],[23.5,17.5]], dressing:[[8,16],[13,19],[16,20],[25,19],[28,21],[33,11],[35,7],[7,26]],
    },
    khalcamp: {
      size:[36,34], gate:21, color:'#d6b265', identity:'The expedition courtyard',
      courts:[[19.5,20,4.7,3.6],[17,13.5,5.8,1.5]],
      roads:[[2.4,[[11,21],[18,21.4],[25,20.3],[35.7,21]]],[1.7,[[11,11],[13,13],[18,14],[21,17],[20,21]]],[1.8,[[25,12],[24,16],[25,21],[25,27]]],[1.6,[[10,16],[11,21],[12,26],[18,28],[24,27]]]],
      buildings:[['hall',10,8],['market',25,9],['workshop',29,27],['dwelling',5,18],['dwelling',18,30],['dwelling',30,5],['tower',32,16],['tower',32,25]],
      shrine:[10,25], storage:[12,27], forge:[26,27], caravan:[28,19], fire:[20,18], well:[20,22],
      spawn:[17.5,21.5], portal:[14,25.5], shard:[5,29],
      npcs:[['edran',12,12],['sutler_smith',26,25],['sutler_quarter',23,12]],
      folk:[['villager_digger',15,14],['villager_digger',25,22],['villager_smith',24,27],['villager_soldier',30,22],['villager_child',17,24]],
      decor:[['scaffold',6,6],['scaffold',5,28],['scaffold',28,30],['marketgoods',27,12],['urn',8,11],['urn',23,11],['crate',29,29],['rock',7,30]],
      fireBowls:[[14,16],[25,24]], dressing:[[8,14],[13,18],[23,15],[28,23],[10,29],[21,28]],
    },
    hellgate: {
      size:[40,30], gate:15, color:'#d86946', identity:'The last redoubt',
      courts:[[20.5,15.5,4.9,3.2]],
      roads:[[2.8,[[6,15],[13,14.7],[21,16],[29,15.5],[39.7,15]]],[1.8,[[11,10],[12,13],[12,17],[13,21],[19,22],[26,21],[29,18],[29,11]]]],
      buildings:[['hall',11,7],['market',29,7],['workshop',29,24],['dwelling',6,23],['dwelling',21,25],['dwelling',21,5],['tower',35,10],['tower',35,21]],
      shrine:[12,22], storage:[15,23], forge:[26,23], caravan:[32,18], fire:[20,12], well:[23,19],
      spawn:[20.5,16.5], portal:[17,24.5], shard:[5,27],
      npcs:[['vael',13,11],['sutler_smith',27,21],['sutler_quarter',27,10]],
      folk:[['villager_soldier',16,15],['villager_soldier',30,15],['villager_refugee',17,20],['villager_smith',25,24],['villager_refugee',10,25]],
      decor:[['crate',28,26],['crate',32,25],['barrel',29,10],['marketgoods',31,10],['woodpile',6,25],['rock',3,8],['rock',37,26]],
      fireBowls:[[15,11],[27,19]], dressing:[[8,12],[15,18],[26,11],[33,17],[17,25],[28,27]],
    },
  };

  function settlementCurve(controls) {
    const points=[];
    for(let n=0;n<controls.length-1;n++) {
      const a=controls[Math.max(0,n-1)],b=controls[n],c=controls[n+1],d=controls[Math.min(controls.length-1,n+2)];
      for(let k=0;k<16;k++) {
        const t=k/16,t2=t*t,t3=t2*t;
        const sample=i=>.5*((2*b[i])+(-a[i]+c[i])*t+(2*a[i]-5*b[i]+4*c[i]-d[i])*t2+(-a[i]+3*b[i]-3*c[i]+d[i])*t3);
        points.push({x:sample(0),y:sample(1)});
      }
    }
    const last=controls[controls.length-1];points.push({x:last[0],y:last[1]});return points;
  }
  function settlementOutline(cx,cy,rx,ry,phase) {
    return Array.from({length:80},(_,i)=>{
      const a=i/80*Math.PI*2,wear=1+.055*Math.sin(a*3+phase)+.035*Math.cos(a*5-phase);
      return {x:cx+Math.cos(a)*rx*wear,y:cy+Math.sin(a)*ry*wear};
    });
  }
  function settlementContains(points,x,y) {
    let inside=false;
    for(let i=0,j=points.length-1;i<points.length;j=i++) {
      const a=points[i],b=points[j];
      if((a.y>y)!==(b.y>y)&&x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)inside=!inside;
    }
    return inside;
  }
  function genSettlement(zoneId, seed, cfg) {
    const c=SETTLEMENTS[zoneId], m=blank(zoneId,...c.size);
    const phase=U.hash(zoneId)%31;
    m.settlement={revision:3,identity:c.identity,color:c.color,
      routes:c.roads.map(([width,controls])=>({width,points:settlementCurve(controls)})),
      courts:c.courts.map(p=>settlementOutline(...p,phase)),
      pools:(c.water||[]).map(([x0,y0,x1,y1],i)=>settlementOutline((x0+x1)/2,(y0+y1)/2,(x1-x0+1)/2,(y1-y0+1)/2,phase+i))};
    m.buildings=[];
    scatterFloor(m,U.rng(seed ^ U.hash(zoneId)));
    // A single boundary course leaves room for districts and a wide gate.
    for(let x=0;x<m.w;x++) { setWall(m,x,0,1);setWall(m,x,m.h-1,1); }
    for(let y=0;y<m.h;y++) { setWall(m,0,y,1);setWall(m,m.w-1,y,1); }
    for(let y=c.gate-2;y<=c.gate+2;y++) setWall(m,m.w-1,y,0);
    const pave=(x,y)=>{if(x>=1&&y>=1&&x<m.w&&y<m.h-1&&!m.walls[idx(m,x,y)])m.floor[idx(m,x,y)]=5;};
    for(let y=1;y<m.h-1;y++)for(let x=1;x<m.w;x++){
      if(m.settlement.courts.some(poly=>settlementContains(poly,x+.5,y+.5)))pave(x,y);
      for(const {points,width} of m.settlement.routes) {
        if(points.some((a,n)=>{
          if(!n)return false;const b=points[n-1],dx=b.x-a.x,dy=b.y-a.y;
          const t=U.clamp(((x+.5-a.x)*dx+(y+.5-a.y)*dy)/(dx*dx+dy*dy||1),0,1);
          return Math.hypot(x+.5-a.x-dx*t,y+.5-a.y-dy*t)<=width/2+.08;
        })){pave(x,y);break;}
      }
    }
    function building(type,x,y,interact) {
      const span=type==='hall'?4:(type==='tower'||type==='shrine')?2:3;
      const x0=Math.floor(x-span/2),y0=Math.floor(y-span/2);
      const footprint={x0,y0,x1:x0+span,y1:y0+span};
      for(let yy=y0;yy<y0+span;yy++)for(let xx=x0;xx<x0+span;xx++){
        block(m,xx,yy);m.floor[idx(m,xx,yy)]=1;
      }
      const pr=addProp(m,type,x,y,{blocks:true,footprint,building:true,...(interact?{interact,interactionRange:2,label:'Travel Shrine'}:{})});
      m.buildings.push(pr);
      addLight(m,x-.4,y+1.1,type==='hall'?4.5:3,c.color);
      return pr;
    }
    for(const b of c.buildings)building(...b);
    building('shrine',...c.shrine,'shrine');
    m.shrine={x:c.shrine[0]+.5,y:c.shrine[1]+2.5};
    m.spawns.shrine={...m.shrine};
    for(const [key,type,label] of [['storage','strongbox','Strongbox'],['forge','forge','Forge Altar'],['caravan','cart','Caravan'],['board','board','Notice Board']]) {
      if(c[key])addProp(m,type,...c[key],{interact:key,label});
    }
    addProp(m,'firebowl',...c.fire,{light:true});addLight(m,...c.fire,6,'#ffab60');
    addLight(m,...c.forge,4,'#ff8545');addLight(m,...c.shrine,4,'#8fd8ff',false);
    addProp(m,'well',...c.well);
    if(c.shard){addProp(m,'embershard',...c.shard);addLight(m,...c.shard,3.5,'#ff7050',false);}
    for(const [index,[id,x,y]] of [...c.npcs,...c.folk].entries()){
      const resident=DATA.TOWN_RESIDENTS[zoneId][index];
      if(!resident||resident.id!==id)throw new Error('Missing town resident: '+zoneId+'/'+index);
      m.npcs.push({id,x,y,npcArt:resident.art,displayName:/^(villager_|sutler_)/.test(id)?resident.name:DATA.NPCS[id].name});
    }
    for(const [type,x,y] of c.decor)if(!m.blocked[idx(m,x|0,y|0)]&&m.floor[idx(m,x|0,y|0)]<5)
      addProp(m,type,x,y,{blocks:['tree','deadtree','rock','crate','barrel'].includes(type)});
    for(const [x,y] of c.fireBowls){addProp(m,'firebowl',x,y);addLight(m,x,y,3.2,'#ffb26a');}
    for(const [x,y] of c.dressing)if(!m.blocked[idx(m,x|0,y|0)])addProp(m,'verge',x,y,{blocks:false});
    // Clear, named arrivals survive existing save files and all act links.
    m.spawns.default={x:c.spawn[0],y:c.spawn[1]};m.spawns.portal={x:c.portal[0],y:c.portal[1]};
    const exit=cfg.exit;
    m.exits.push({x0:m.w-1.2,y0:c.gate-2.5,x1:m.w,y1:c.gate+2.5,target:exit.target,spawnKey:exit.spawnKey,label:exit.label});
    m.spawns[exit.returnKey]={x:m.w-3.5,y:c.gate+.5};
    // Short door/service approaches attach to the existing road network via
    // walkable tiles. They never tunnel through a building or decorate a gate.
    const approaches=[...Object.values(m.spawns),
      ...m.buildings.map(b=>({x:b.x+.5,y:b.footprint.y1+.5})),
      ...m.props.filter(p=>p.interact&&!p.building).map(p=>({x:p.x+.5,y:p.y+1.5}))];
    function connectApproach(point,connected) {
      const sx=point.x|0,sy=point.y|0,start=idx(m,sx,sy);
      if(!walkable(m,sx,sy))throw Error(zoneId+': blocked service approach '+sx+','+sy);
      const prev=new Int32Array(m.w*m.h).fill(-1),queue=[start];prev[start]=start;
      let found=-1;
      for(let q=0;q<queue.length;q++){
        const i=queue[q],x=i%m.w,y=(i/m.w)|0;
        if(m.floor[i]===5&&(!connected||connected.has(i))){found=i;break;}
        for(const [dx,dy] of [[0,1],[1,0],[-1,0],[0,-1]]){
          const nx=x+dx,ny=y+dy,ni=idx(m,nx,ny);
          if(walkable(m,nx,ny)&&prev[ni]===-1){prev[ni]=i;queue.push(ni);}
        }
      }
      if(found<0)throw Error(zoneId+': disconnected approach');
      const controls=[];
      for(let i=found;;i=prev[i]){m.floor[i]=5;controls.push([i%m.w+.5,Math.floor(i/m.w)+.5]);if(i===start)break;}
      if(controls.length>1)m.settlement.routes.push({width:1.15,points:settlementCurve(controls)});
    }
    for(const point of approaches)connectApproach(point);
    // A forge or a building corner may split a narrow curved road's tile mask.
    // Join such components around the obstacle, and draw that same short detour.
    function roadReach() {
      const start=idx(m,m.spawns.default.x|0,m.spawns.default.y|0),seen=new Set([start]),queue=[start];
      for(let q=0;q<queue.length;q++)for(const i of [queue[q]-1,queue[q]+1,queue[q]-m.w,queue[q]+m.w])
        if(m.floor[i]===5&&!m.blocked[i]&&!seen.has(i)){seen.add(i);queue.push(i);}
      return seen;
    }
    for(let joined=0;joined<30;joined++) {
      const connected=roadReach();let gap=-1;
      for(let i=0;i<m.floor.length;i++)if(m.floor[i]===5&&!m.blocked[i]&&!connected.has(i)){gap=i;break;}
      if(gap<0)break;
      connectApproach({x:gap%m.w+.5,y:Math.floor(gap/m.w)+.5},connected);
    }
    // Recessed shallow-water scenery is separate from combat hazards.
    if(c.water){
      m.settlementWater=new Uint8Array(m.w*m.h);
      for(let y=1;y<m.h-1;y++)for(let x=1;x<m.w-1;x++)
        if(!m.blocked[idx(m,x,y)]&&m.floor[idx(m,x,y)]!==5&&m.settlement.pools.some(poly=>settlementContains(poly,x+.5,y+.5)))m.settlementWater[idx(m,x,y)]=1;
    }
    bakeMinimap(m);
    return m;
  }

  function genTown(seed) {
    return genSettlement('town',seed,{exit:{target:'fields',spawnKey:'from_town',returnKey:'from_fields',label:'The Ashen Fields'}});
  }


  /* =====================================================================
     WILDERNESS — The Ashen Fields (procedural)
     ===================================================================== */
  function genFields(seed) {
    const m = blank("fields", sz(86), sz(86));
    m.outdoor = true;   // walls render as grassy boulder/hillock massifs
    const r = U.rng(seed ^ 0xF1E1D5);
    scatterFloor(m, U.rng(seed ^ 99));
    m.rain = r() < 0.4;

    /* border forest ring */
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      const edge = Math.min(x, y, m.w - 1 - x, m.h - 1 - y);
      if (edge < 2 || (edge < 4 && r() < 0.55)) setWall(m, x, y, 1);
    }
    /* abandoned FARMLAND: gapped hedgerow lines divide the fields into paddocks,
       with a few small woods — reads as tilled country gone to ruin, not random noise */
    for (let i = 1; i <= 4; i++) {
      const y = (i * m.h / 5 + U.riR(r, -3, 3)) | 0;
      const g1 = 8 + r() * (m.w - 16), g2 = 8 + r() * (m.w - 16);
      for (let x = 3; x < m.w - 3; x++)
        if (Math.abs(x - g1) > 3 && Math.abs(x - g2) > 3 && r() < 0.9) setWall(m, x, y, 1);
    }
    for (let i = 1; i <= 3; i++) {
      const x = (i * m.w / 4 + U.riR(r, -3, 3)) | 0;
      const g1 = 8 + r() * (m.h - 16), g2 = 8 + r() * (m.h - 16);
      for (let y = 3; y < m.h - 3; y++)
        if (Math.abs(y - g1) > 3 && Math.abs(y - g2) > 3 && r() < 0.9) setWall(m, x, y, 1);
    }
    for (let c = 0; c < dn(10); c++) {   // small copses in the corners of paddocks
      const cx = 6 + r() * (m.w - 12), cy = 6 + r() * (m.h - 12), rad = 2 + r() * 3.5;
      for (let y = cy - rad | 0; y <= cy + rad; y++) for (let x = cx - rad | 0; x <= cx + rad; x++) {
        if (U.dist(x, y, cx, cy) < rad * (0.6 + r() * 0.5)) setWall(m, x, y, 1);
      }
    }
    /* entry on west edge, crypt on far east */
    const entry = { x: 4, y: 38 + (r() * 10 | 0) };
    const cryptAt = { x: m.w - 8, y: 8 + (r() * (m.h - 20) | 0) };
    /* carve a winding road between them (guarantees connectivity) */
    let px = entry.x, py = entry.y;
    const road = [];
    while (U.dist(px, py, cryptAt.x, cryptAt.y) > 2) {
      road.push({ x: px, y: py });
      for (let oy = -2; oy <= 2; oy++) for (let ox = -2; ox <= 2; ox++)
        if (ox * ox + oy * oy <= 5) setWall(m, (px + ox) | 0, (py + oy) | 0, 0);
      const dx = Math.sign(cryptAt.x - px), dy = Math.sign(cryptAt.y - py);
      if (r() < 0.65) px += dx; else if (r() < 0.5) py += dy; else { px += (r() < 0.5 ? 1 : -1); py += (r() < 0.5 ? 1 : -1); }
      px = U.clamp(px, 3, m.w - 4); py = U.clamp(py, 3, m.h - 4);
    }
    /* mark road tiles with a dirt floor variant */
    for (const p of road) { const i = idx(m, p.x | 0, p.y | 0); m.floor[i] = 4; }

    /* clear entry/crypt yards */
    for (let oy = -3; oy <= 3; oy++) for (let ox = -3; ox <= 3; ox++) {
      setWall(m, entry.x + ox, entry.y + oy, 0);
      setWall(m, cryptAt.x + ox, cryptAt.y + oy, 0);
    }
    /* west exit back to town */
    for (let y = entry.y - 2; y <= entry.y + 2; y++) { setWall(m, 0, y, 0); setWall(m, 1, y, 0); setWall(m, 2, y, 0); }
    m.exits.push({ x0: 0, y0: entry.y - 2.5, x1: 1.4, y1: entry.y + 2.5, target: "town", spawnKey: "from_fields", label: "Cinderwatch" });
    m.spawns.from_town = { x: 3.5, y: entry.y };
    m.spawns.default = m.spawns.from_town;
    m.spawns.portal = { x: 4.5, y: entry.y + 1 };

    /* crypt entrance */
    addProp(m, "cryptdoor", cryptAt.x, cryptAt.y - 0.6, { blocks: true });
    m.exits.push({ x0: cryptAt.x - 1.4, y0: cryptAt.y - 0.4, x1: cryptAt.x + 1.4, y1: cryptAt.y + 1.4, target: "crypt1", spawnKey: "from_fields", label: "The Sunken Crypt" });
    addProp(m, "grave", cryptAt.x - 2.5, cryptAt.y + 1.5); addProp(m, "grave", cryptAt.x + 2.4, cryptAt.y + 1.2);
    addProp(m, "deadtree", cryptAt.x + 3.4, cryptAt.y - 1.6);
    addLight(m, cryptAt.x, cryptAt.y, 4, "#7090c0", false);
    m.spawns.from_crypt1 = { x: cryptAt.x, y: cryptAt.y + 2.2 };

    /* travel shrine near the middle of the road */
    const mid = road[(road.length / 2) | 0] || { x: m.w / 2, y: m.h / 2 };
    for (let oy = -2; oy <= 2; oy++) for (let ox = -2; ox <= 2; ox++) setWall(m, mid.x + ox | 0, mid.y + oy | 0, 0);
    addProp(m, "shrine", mid.x + 0.5, mid.y - 1, { interact: "shrine", label: "Travel Shrine" });
    addLight(m, mid.x + 0.5, mid.y - 1, 3.5, "#8fd8ff");
    m.shrine = { x: mid.x + 0.5, y: mid.y + 0.4 };
    m.spawns.shrine = { x: mid.x + 0.5, y: mid.y + 0.6 };

    /* the Ruined Chapel waits in the south */
    const chapelAt = { x: 16 + (r() * (m.w - 32) | 0), y: m.h - 9 };
    carveTrail(m, r, mid.x, mid.y, chapelAt.x, chapelAt.y);
    for (let oy = -3; oy <= 3; oy++) for (let ox = -3; ox <= 3; ox++) setWall(m, chapelAt.x + ox, chapelAt.y + oy, 0);
    addProp(m, "chapelruin", chapelAt.x, chapelAt.y - 0.6, { blocks: true });
    m.exits.push({ x0: chapelAt.x - 1.4, y0: chapelAt.y - 0.4, x1: chapelAt.x + 1.4, y1: chapelAt.y + 1.4, target: "chapel", spawnKey: "from_fields", label: "The Ruined Chapel" });
    addLight(m, chapelAt.x, chapelAt.y, 4, "#9080c0", false);
    addProp(m, "grave", chapelAt.x - 2.6, chapelAt.y + 1.4); addProp(m, "deadtree", chapelAt.x + 2.8, chapelAt.y + 1.0);
    m.spawns.from_chapel = { x: chapelAt.x, y: chapelAt.y + 2.2 };

    /* the north road into the Blackbough */
    const forestAt = { x: 16 + (r() * (m.w - 32) | 0), y: 5 };
    carveTrail(m, r, mid.x, mid.y, forestAt.x, forestAt.y);
    for (let oy = -2; oy <= 3; oy++) for (let ox = -3; ox <= 3; ox++) setWall(m, forestAt.x + ox, forestAt.y + oy, 0);
    for (let x = forestAt.x - 2; x <= forestAt.x + 2; x++) for (let y = 0; y <= 4; y++) setWall(m, x, y, 0);
    m.exits.push({ x0: forestAt.x - 2.5, y0: 0, x1: forestAt.x + 2.5, y1: 1.4, target: "forest", spawnKey: "from_fields", label: "The Blackbough" });
    m.spawns.from_forest = { x: forestAt.x, y: 3.5 };

    /* hand-shaped places worth finding (ruined farmsteads and the like) */
    placePOIs(m, r, road, entry, 2);
    /* decorative props */
    for (let i = 0; i < dn(90); i++) {
      const x = 4 + r() * (m.w - 8), y = 4 + r() * (m.h - 8);
      if (!walkable(m, x, y) || U.dist(x, y, entry.x, entry.y) < 6) continue;
      const t = r();
      if (t < 0.42) addProp(m, "tree", x, y, { seed: (r() * 9999) | 0 });
      else if (t < 0.62) addProp(m, "deadtree", x, y, { seed: (r() * 9999) | 0 });
      else if (t < 0.8) addProp(m, "rock", x, y, { seed: (r() * 9999) | 0 });
      else addProp(m, "grave", x, y, { seed: (r() * 9999) | 0 });
    }
    /* breakables */
    for (let i = 0; i < dn(26); i++) {
      const x = 5 + r() * (m.w - 10), y = 5 + r() * (m.h - 10);
      if (!walkable(m, x, y)) continue;
      addProp(m, r() < 0.6 ? "barrel" : (r() < 0.5 ? "crate" : "urn"), x, y, { breakable: true, seed: (r() * 9999) | 0 });
    }
    /* a lootable chest somewhere off the road */
    for (let tries = 0; tries < 40; tries++) {
      const x = 10 + r() * (m.w - 20), y = 10 + r() * (m.h - 20);
      if (walkable(m, x, y) && U.dist(x, y, entry.x, entry.y) > 25) { addProp(m, "chest", x, y, { lootable: true }); break; }
    }

    /* monster camps */
    const zone = m.zone;
    for (let c = 0; c < dn(13, MOB_MUL); c++) {
      const cx = 8 + r() * (m.w - 16), cy = 8 + r() * (m.h - 16);
      if (U.dist(cx, cy, entry.x, entry.y) < 14 || !walkable(m, cx, cy)) continue;
      const eid = U.pickR(r, zone.spawns);
      const def = DATA.ENEMIES[eid]; if (!def) continue;
      const count = def.pack ? U.riR(r, def.pack[0], def.pack[1]) : U.riR(r, 2, 4);
      const elite = r() < 0.16;
      for (let i = 0; i < count; i++) {
        m.monsterSpawns.push({ id: eid, x: cx + (r() - 0.5) * 4, y: cy + (r() - 0.5) * 4, elite: elite && i === 0, minion: elite && i > 0 });
      }
      if (eid === "cult_acolyte") { addProp(m, "brazier", cx + 1, cy + 1, { light: true }); addLight(m, cx + 1, cy + 1, 4, "#ff9c50"); }
    }
    connectPockets(m, r, entry.x, entry.y, 40);   // no paddock stays sealed behind hedges
    biomeApply(m, r);
    bakeMinimap(m);
    return m;
  }

  /* =====================================================================
     ACT CAMPS — small fortified hubs (shrine, storage, fire, tents, folk)
     ===================================================================== */
  function genCamp(zoneId, seed, cfg) { return genSettlement(zoneId, seed, cfg); }

  /* A fixed first journey: the road, cover and encounter clearings must agree
     across checkpoints. Only surface wear varies with the hero's world seed. */
  function genOpening(seed) {
    const m = blank("frosthaven_approach", 102, 84);
    m.outdoor = true;
    scatterFloor(m, U.rng(seed ^ 7129));
    const road = [[9,73],[32,71],[58,74],[81,65],[90,55],[70,46],[48,48],[25,43],[10,32],[24,18],[49,22],[76,16],[88,7]];
    const distance = (x,y) => Math.min(...road.slice(1).map((b,i) => {
      const a=road[i],dx=b[0]-a[0],dy=b[1]-a[1];
      const t=U.clamp(((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy),0,1);
      return Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy);
    }));
    for(let y=0;y<m.h;y++)for(let x=0;x<m.w;x++) {
      const d=distance(x+.5,y+.5);
      const clearing = [[14,73,7],[28,42,8.5],[73,20,7],[87,14,11]].some(([cx,cy,r])=>Math.hypot(x+.5-cx,y+.5-cy)<r);
      if((d>4 && !clearing) || x<2 || y<2 || x>=m.w-2 || y>=m.h-2)setWall(m,x,y,1);
      else if(d<1.65)m.floor[idx(m,x,y)]=5;
    }
    m.spawns={default:{x:9.5,y:73.5},awakening:{x:77.5,y:66.5},rescue:{x:35.5,y:43.5},
      escort:{x:28.5,y:42.5},combat:{x:68.5,y:17.5},provision:{x:78.5,y:18.5},boss:{x:83.5,y:17.5},gate:{x:88.5,y:11.5}};
    m.opening={road,guard:{x:81.5,y:64.5},shard:{x:83,y:66},cover:{x:76.5,y:68},secondCover:{x:73,y:19},
      rescue:{x:28,y:42},rescueEnemies:[{x:31,y:39},{x:26,y:38},{x:23,y:42}],
      travelers:[{x:27,y:45},{x:29,y:45}],rescueCover:{x:34,y:45},
      shelter:[{x:74,y:20},{x:73,y:21},{x:72,y:20}],cache:{x:78,y:21},
      captain:{x:91,y:10},bossTrigger:{x:86,y:15},reinforcements:[{x:92,y:18},{x:84,y:7}],
      pair:[{x:80.5,y:12.5},{x:83.5,y:10.5}],gate:{x:94.5,y:6.5},brynGate:{x:90,y:11}};
    m.npcs=[{id:"bryn",x:14.5,y:72,npcArt:"resident_frosthaven_1"},
      {id:"opening_mara",x:27,y:45,npcArt:"resident_frosthaven_4"},
      {id:"opening_iven",x:29,y:45,npcArt:"resident_frosthaven_5"}];
    addProp(m,"cart",7.5,71,{blocks:true});
    addProp(m,"woodpile",9,70.5,{blocks:true});
    addProp(m,"brazier",12,75,{blocks:true,extinguished:true});
    for(const [type,x,y] of [["cart",17,69],["crate",18,71],["crate",6,76],["woodpile",16,77],
      ["grave",23,71],["deadtree",22,77],["brazier",37,69],["crate",40,73],
      ["cart",25,46],["cart",31,47],["woodpile",24,44],["crate",32,46],["crate",25,36],
      ["grave",20,40],["deadtree",35,38],["brazier",29,46],["grave",57,23],
      ["woodpile",70,21],["crate",71,23],["grave",80,24],["grave",94,20],["grave",94,17]])
      addProp(m,type,x,y,{blocks:true,...(type==="brazier"?{extinguished:true}:{})});
    addProp(m,"crate",78,21,{blocks:true,interact:"opening_supply",label:"Watch supplies — two healing draughts"});
    addProp(m,"embershard",83,66,{blocks:true});
    addLight(m,83,66,2.6,"#be735d",false);
    // Three visual chapters along the continuous trail: abandoned watch posts,
    // the shard-struck burial ground, then the warm lights of the refuge.
    for(const [type,x,y] of [["crate",7,74],["deadtree",31,74],["rock",48,71],
      ["cart",59,71],["woodpile",62,70],["grave",78,64],["grave",79,62],["grave",85,65],
      ["rock",92,56],["deadtree",72,43],["grave",51,45],["grave",48,45],["grave",45,45],
      ["deadtree",8,30],["rock",22,16],["deadtree",47,25],
      ["grave",66,15],["rock",75,13]])
      addProp(m,type,x,y,{blocks:true});
    // Town architecture uses its installed art, without treating this road as a hub.
    for(const [type,x,y] of [["tower",91,3],["tower",98,8],["firebowl",92,5],["firebowl",96,9],["firebowl",75,23]]) {
      addProp(m,type,x,y,{artZone:"frosthaven",blocks:true});
      if(type==="firebowl")addLight(m,x,y,4,"#ffb56a");
    }
    // A short paved neck joins the courtyard to the gate between its towers.
    for(let y=5;y<=9;y++)for(let x=93;x<=96;x++){setWall(m,x,y,0);m.floor[idx(m,x,y)]=5;}
    for(const p of m.props)if(p.blocks)block(m,p.x|0,p.y|0);
    m.exits.push({x0:93,y0:5,x1:96,y1:8,target:"frosthaven",spawnKey:"from_wild",label:"Frosthaven — clear the road",openingGate:true});
    clearSpawns(m);
    bakeMinimap(m);
    return m;
  }

  /* =====================================================================
     ACT WILDS — generic procedural wilderness for the later acts
     ===================================================================== */
  function genWilds(zoneId, seed, cfg) {
    const m = blank(zoneId, sz(cfg.size || 84), sz(cfg.size || 84));
    m.outdoor = true;   // walls render as thematic massifs (mountains/rock/spires)
    const r = U.rng(seed ^ U.hash(zoneId));
    scatterFloor(m, U.rng(seed ^ 13));
    m.rain = r() < (cfg.rainCh || 0);
    /* ---- per-zone ARCHETYPE: each act's wilderness is a different LANDFORM, not a recolour.
       Terrain walls + signature features + elevation style all follow the archetype. ---- */
    const ARCHS = {
      broken:         { blobMul: 1.0,  radK: 1.0,  clearings: 3, canyons: 1 },  // classic scattered badlands
      tundra_shelves: { blobMul: 0.55, radK: 1.25, clearings: 2, canyons: 0 },  // open highland; terraced snow shelves dominate
      fen_channels:   { blobMul: 0.35, radK: 0.85, clearings: 4, canyons: 0, rivers: { n: 4, haz: "bog", width: 2 } },       // flat drowned fen veined by bog channels
      dune_mesas:     { blobMul: 0.30, radK: 1.15, clearings: 1, canyons: 0, rivers: { n: 2, haz: "quicksand", width: 2 } }, // huge open flats; sheer flat-top mesas
      cinder_rifts:   { blobMul: 1.35, radK: 1.1,  clearings: 1, canyons: 2, rivers: { n: 3, haz: "lava", width: 2, scorch: true }, crater: true }, // dense hellscape split by lava rifts
    };
    const layout = ARCHS[cfg.arch] || ARCHS.broken;
    m._arch = cfg.arch || "broken";
    /* border + blobs */
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      const edge = Math.min(x, y, m.w - 1 - x, m.h - 1 - y);
      if (edge < 2 || (edge < 4 && r() < 0.55)) setWall(m, x, y, 1);
    }
    for (let c = 0; c < dn((cfg.blobs || 30) * layout.blobMul); c++) {
      const cx = 6 + r() * (m.w - 12), cy = 6 + r() * (m.h - 12), rad = (2 + r() * 5) * layout.radK;
      for (let y = cy - rad | 0; y <= cy + rad; y++) for (let x = cx - rad | 0; x <= cx + rad; x++)
        if (U.dist(x, y, cx, cy) < rad * (0.6 + r() * 0.5)) setWall(m, x, y, 1);
    }
    /* gouge open clearings (rooms of clear ground) so the map has landmarks, not uniform noise */
    for (let c = 0; c < layout.clearings; c++) {
      const cx = 10 + r() * (m.w - 20), cy = 10 + r() * (m.h - 20), rad = 4 + r() * 5;
      for (let y = cy - rad | 0; y <= cy + rad; y++) for (let x = cx - rad | 0; x <= cx + rad; x++)
        if (U.dist(x, y, cx, cy) < rad) setWall(m, x, y, 0);
    }
    /* west entry back to camp; far gate east */
    const entry = { x: 4, y: (m.h / 2 | 0) + U.riR(r, -8, 8) };
    const gateAt = { x: m.w - 8, y: 8 + (r() * (m.h - 20) | 0) };
    let px = entry.x, py = entry.y, guard = 0;
    const road = [];
    while (U.dist(px, py, gateAt.x, gateAt.y) > 2 && guard++ < 2500) {
      road.push({ x: px, y: py });
      for (let oy = -2; oy <= 2; oy++) for (let ox = -2; ox <= 2; ox++)
        if (ox * ox + oy * oy <= 5) setWall(m, (px + ox) | 0, (py + oy) | 0, 0);
      const dx = Math.sign(gateAt.x - px), dy = Math.sign(gateAt.y - py);
      if (dx !== 0 && (dy === 0 || r() < 0.6)) px += dx;
      else if (dy !== 0) py += dy;
      else px += (r() < 0.5 ? 1 : -1);
      px = U.clamp(px, 3, m.w - 4); py = U.clamp(py, 3, m.h - 4);
    }
    for (const p of road) m.floor[(p.x | 0) + (p.y | 0) * m.w] = 4;
    /* extra carved canyons/gaps for exploration variety (the road already guarantees the critical path) */
    for (let c = 0; c < layout.canyons; c++)
      carveTrail(m, r, 6 + r() * (m.w - 12), 6 + r() * (m.h - 12), 6 + r() * (m.w - 12), 6 + r() * (m.h - 12));
    for (let oy = -3; oy <= 3; oy++) for (let ox = -3; ox <= 3; ox++) {
      setWall(m, entry.x + ox, entry.y + oy, 0);
      setWall(m, gateAt.x + ox, gateAt.y + oy, 0);
    }
    for (let y = entry.y - 2; y <= entry.y + 2; y++) for (let x = 0; x < 3; x++) setWall(m, x, y, 0);
    m.exits.push({ x0: 0, y0: entry.y - 2.5, x1: 1.4, y1: entry.y + 2.5, target: cfg.back.target, spawnKey: cfg.back.spawnKey, label: cfg.back.label });
    m.spawns[cfg.entryKey] = { x: 3.5, y: entry.y };
    m.spawns.default = m.spawns[cfg.entryKey];
    m.spawns.portal = { x: 4.5, y: entry.y + 1 };
    /* main gate (act boss path) */
    addProp(m, cfg.gate.prop, gateAt.x, gateAt.y - 0.6, { blocks: true });
    m.exits.push({ x0: gateAt.x - 1.6, y0: gateAt.y - 0.4, x1: gateAt.x + 1.6, y1: gateAt.y + 1.5, target: cfg.gate.target, spawnKey: cfg.gate.spawnKey, label: cfg.gate.label });
    addLight(m, gateAt.x, gateAt.y, 4.5, cfg.gate.glow || "#d0a060", false);
    m.spawns[cfg.gate.returnKey] = { x: gateAt.x, y: gateAt.y + 2.4 };
    /* optional side dungeons off the road (cfg.side + any cfg.sides[] — e.g. optional quest areas) */
    const sideList = [cfg.side].concat(cfg.sides || []).filter(Boolean);
    sideList.forEach((side, si) => {
      const frac = U.clamp(0.35 + si * 0.2, 0.2, 0.85);
      const midRoad = road[Math.min(road.length - 1, (road.length * frac) | 0)] || { x: m.w / 2, y: m.h / 2 };
      const sgn = (si % 2 === 0) ? 1 : -1;
      const sideAt = { x: U.clamp(midRoad.x + U.riR(r, -12, 12), 8, m.w - 9), y: U.clamp(midRoad.y + U.riR(r, 9, 18) * sgn, 8, m.h - 9) };
      carveTrail(m, r, midRoad.x, midRoad.y, sideAt.x, sideAt.y);
      for (let oy = -3; oy <= 3; oy++) for (let ox = -3; ox <= 3; ox++) setWall(m, sideAt.x + ox, sideAt.y + oy, 0);
      addProp(m, side.prop, sideAt.x, sideAt.y - 0.6, { blocks: true });
      m.exits.push({ x0: sideAt.x - 1.4, y0: sideAt.y - 0.4, x1: sideAt.x + 1.4, y1: sideAt.y + 1.4, target: side.target, spawnKey: side.spawnKey, label: side.label });
      addLight(m, sideAt.x, sideAt.y, 4, side.glow || "#9080c0", false);
      m.spawns[side.returnKey] = { x: sideAt.x, y: sideAt.y + 2.2 };
    });
    /* travel shrine mid-road */
    const mid = road[(road.length / 2) | 0] || { x: m.w / 2, y: m.h / 2 };
    for (let oy = -2; oy <= 2; oy++) for (let ox = -2; ox <= 2; ox++) setWall(m, mid.x + ox | 0, mid.y + oy | 0, 0);
    addProp(m, "shrine", mid.x + 0.5, mid.y - 1, { interact: "shrine", label: "Travel Shrine" });
    addLight(m, mid.x + 0.5, mid.y - 1, 3.5, "#8fd8ff");
    m.shrine = { x: mid.x + 0.5, y: mid.y + 0.4 };
    m.spawns.shrine = { x: mid.x + 0.5, y: mid.y + 0.6 };
    /* ---- archetype signature features (rivers, craters), then scrub roads dry ---- */
    if (layout.rivers) carveRivers(m, r, layout.rivers);
    if (layout.crater) carveCrater(m, r, gateAt);
    for (let i = 0; i < m.floor.length; i++) if (m.floor[i] >= 4) m.hazard[i] = 0;   // roads & ramps stay hazard-free
    /* ---- hand-shaped places worth finding, linked to the road by trails ---- */
    placePOIs(m, r, road, entry, 2 + (r() < 0.5 ? 1 : 0));
    /* ---- CLUSTERED decoration: groves / boneyards / rockfields, not uniform confetti ---- */
    const decor = cfg.decor || ["deadtree", "rock"];
    const dClusters = [];
    for (let c = 0; c < 8; c++) dClusters.push({ x: 8 + r() * (m.w - 16), y: 8 + r() * (m.h - 16), t: U.pickR(r, decor), rad: 4 + r() * 4 });
    for (let i = 0; i < dn(cfg.decorCount || 100); i++) {
      let x, y, t;
      if (r() < 0.62) {   // most decor gathers into themed clusters -> readable landmarks
        const cl = U.pickR(r, dClusters); const a = r() * Math.PI * 2, d = r() * cl.rad;
        x = cl.x + Math.cos(a) * d; y = cl.y + Math.sin(a) * d; t = cl.t;
      } else { x = 4 + r() * (m.w - 8); y = 4 + r() * (m.h - 8); t = U.pickR(r, decor); }
      if (!walkable(m, x, y) || U.dist(x, y, entry.x, entry.y) < 6) continue;
      addProp(m, t, x, y, { seed: (r() * 9999) | 0 });
    }
    /* fallen embershards smoulder in the dark */
    for (let i = 0; i < dn(cfg.shards || 3); i++) {
      const x = 8 + r() * (m.w - 16), y = 8 + r() * (m.h - 16);
      if (!walkable(m, x, y)) continue;
      addProp(m, "embershard", x, y, { blocks: true });
      addLight(m, x, y, 4.5, "#ff5040", false);
    }
    for (let i = 0; i < dn(cfg.breakables || 18); i++) {
      const x = 5 + r() * (m.w - 10), y = 5 + r() * (m.h - 10);
      if (!walkable(m, x, y)) continue;
      addProp(m, r() < 0.5 ? "urn" : (r() < 0.5 ? "barrel" : "crate"), x, y, { breakable: true, seed: (r() * 9999) | 0 });
    }
    for (let tries = 0; tries < 40; tries++) {
      const x = 10 + r() * (m.w - 20), y = 10 + r() * (m.h - 20);
      if (walkable(m, x, y) && U.dist(x, y, entry.x, entry.y) > 26) { addProp(m, "chest", x, y, { lootable: true }); break; }
    }
    /* packs */
    const zone = m.zone;
    for (let c = 0; c < dn(cfg.camps || 15, MOB_MUL); c++) {
      const cx = 8 + r() * (m.w - 16), cy = 8 + r() * (m.h - 16);
      if (U.dist(cx, cy, entry.x, entry.y) < 13 || !walkable(m, cx, cy)) continue;
      const eid = U.pickR(r, zone.spawns);
      const def = DATA.ENEMIES[eid]; if (!def) continue;
      const count = def.pack ? U.riR(r, def.pack[0], def.pack[1]) : U.riR(r, 2, 4);
      const elite = r() < 0.2;
      for (let i = 0; i < count; i++) {
        m.monsterSpawns.push({ id: eid, x: cx + (r() - 0.5) * 4, y: cy + (r() - 0.5) * 4, elite: elite && i === 0, minion: elite && i > 0 });
      }
    }
    connectPockets(m, r, entry.x, entry.y, 40);   // dense archetypes never seal off ground
    biomeApply(m, r);
    bakeMinimap(m);
    return m;
  }

  /* =====================================================================
     WILDERNESS — The Blackbough (corrupted forest, procedural)
     ===================================================================== */
  function genForest(seed) {
    const m = blank("forest", sz(90), sz(90));
    m.outdoor = true;   // walls render as dense tree-thicket massifs
    const r = U.rng(seed ^ 0xB1ACB);
    scatterFloor(m, U.rng(seed ^ 41));
    m.rain = r() < 0.55;

    /* heavy border + MUCH denser woods — the Blackbough is a wall of trees ... */
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      const edge = Math.min(x, y, m.w - 1 - x, m.h - 1 - y);
      if (edge < 2 || (edge < 5 && r() < 0.6)) setWall(m, x, y, 1);
    }
    for (let c = 0; c < dn(60); c++) {
      const cx = 6 + r() * (m.w - 12), cy = 6 + r() * (m.h - 12), rad = 2.5 + r() * 5.5;
      for (let y = cy - rad | 0; y <= cy + rad; y++) for (let x = cx - rad | 0; x <= cx + rad; x++) {
        if (U.dist(x, y, cx, cy) < rad * (0.6 + r() * 0.5)) setWall(m, x, y, 1);
      }
    }
    /* ... broken by a winding CHAIN OF GLADES — the forest reads as rooms, not noise */
    const glades = [];
    let gx = m.w * (0.3 + r() * 0.4), gy = m.h - 14;
    for (let g = 0; g < 7; g++) {
      const rad = 4.5 + r() * 3.5;
      for (let y = (gy - rad) | 0; y <= gy + rad; y++) for (let x = (gx - rad) | 0; x <= gx + rad; x++)
        if (x > 2 && y > 2 && x < m.w - 3 && y < m.h - 3 && U.dist(x, y, gx, gy) < rad) setWall(m, x, y, 0);
      glades.push({ x: gx, y: gy, rad });
      if (g > 0) carveTrail(m, r, glades[g - 1].x, glades[g - 1].y, gx, gy);
      gx = U.clamp(gx + U.riR(r, -16, 16), 10, m.w - 10);
      gy = U.clamp(gy - U.riR(r, 9, 14), 8, m.h - 8);
    }
    /* the HEARTWOOD: one glade holds a ring of old trees around a buried shard */
    const heart = glades[2 + (r() * (glades.length - 2) | 0)];
    for (let a = 0; a < 7; a++) addProp(m, "tree", heart.x + Math.cos(a / 7 * Math.PI * 2) * (heart.rad - 1.2), heart.y + Math.sin(a / 7 * Math.PI * 2) * (heart.rad - 1.2), { seed: (r() * 9999) | 0 });
    addProp(m, "embershard", heart.x, heart.y, { blocks: true });
    addLight(m, heart.x, heart.y, 5, "#7fd8c0", false);
    /* south entry (back to the fields), monastery gate far north */
    const entry = { x: 30 + (r() * 30 | 0), y: m.h - 5 };
    const gateAt = { x: 20 + (r() * (m.w - 40) | 0), y: 8 };
    let px = entry.x, py = entry.y;
    const road = [];
    let guard = 0;
    while (U.dist(px, py, gateAt.x, gateAt.y) > 2 && guard++ < 2500) {
      road.push({ x: px, y: py });
      for (let oy = -2; oy <= 2; oy++) for (let ox = -2; ox <= 2; ox++)
        if (ox * ox + oy * oy <= 5) setWall(m, (px + ox) | 0, (py + oy) | 0, 0);
      const dx = Math.sign(gateAt.x - px), dy = Math.sign(gateAt.y - py);
      if (r() < 0.6 && dy !== 0) py += dy;
      else if (dx !== 0 && r() < 0.75) px += dx;
      else { px += (r() < 0.5 ? 1 : -1); if (dy !== 0) py += dy; }
      px = U.clamp(px, 3, m.w - 4); py = U.clamp(py, 3, m.h - 4);
    }
    for (const p of road) m.floor[(p.x | 0) + (p.y | 0) * m.w] = 4;
    for (let oy = -3; oy <= 3; oy++) for (let ox = -3; ox <= 3; ox++) {
      setWall(m, entry.x + ox, entry.y + oy, 0);
      setWall(m, gateAt.x + ox, gateAt.y + oy, 0);
    }
    /* south edge back to the fields */
    for (let x = entry.x - 2; x <= entry.x + 2; x++) for (let y = m.h - 4; y < m.h; y++) setWall(m, x, y, 0);
    m.exits.push({ x0: entry.x - 2.5, y0: m.h - 1.4, x1: entry.x + 2.5, y1: m.h, target: "fields", spawnKey: "from_forest", label: "The Ashen Fields" });
    m.spawns.from_fields = { x: entry.x, y: m.h - 4.5 };
    m.spawns.default = m.spawns.from_fields;
    m.spawns.portal = { x: entry.x + 1, y: m.h - 5.5 };

    /* the Greymonastery gate */
    addProp(m, "monasterygate", gateAt.x, gateAt.y - 0.6, { blocks: true });
    m.exits.push({ x0: gateAt.x - 1.6, y0: gateAt.y - 0.4, x1: gateAt.x + 1.6, y1: gateAt.y + 1.5, target: "monastery1", spawnKey: "from_forest", label: "The Greymonastery" });
    addLight(m, gateAt.x, gateAt.y, 4.5, "#d0a060", false);
    m.spawns.from_monastery = { x: gateAt.x, y: gateAt.y + 2.4 };

    /* travel shrine mid-road */
    const mid = road[(road.length / 2) | 0] || { x: m.w / 2, y: m.h / 2 };
    for (let oy = -2; oy <= 2; oy++) for (let ox = -2; ox <= 2; ox++) setWall(m, mid.x + ox | 0, mid.y + oy | 0, 0);
    addProp(m, "shrine", mid.x + 0.5, mid.y - 1, { interact: "shrine", label: "Travel Shrine" });
    addLight(m, mid.x + 0.5, mid.y - 1, 3.5, "#8fd8ff");
    m.shrine = { x: mid.x + 0.5, y: mid.y + 0.4 };
    m.spawns.shrine = { x: mid.x + 0.5, y: mid.y + 0.6 };

    /* black trees everywhere, the occasional grave of someone unlucky */
    for (let i = 0; i < dn(120); i++) {
      const x = 4 + r() * (m.w - 8), y = 4 + r() * (m.h - 8);
      if (!walkable(m, x, y) || U.dist(x, y, entry.x, entry.y) < 6) continue;
      const t = r();
      if (t < 0.55) addProp(m, "tree", x, y, { seed: (r() * 9999) | 0 });
      else if (t < 0.8) addProp(m, "deadtree", x, y, { seed: (r() * 9999) | 0 });
      else if (t < 0.93) addProp(m, "rock", x, y, { seed: (r() * 9999) | 0 });
      else addProp(m, "grave", x, y, { seed: (r() * 9999) | 0 });
    }
    for (let i = 0; i < dn(16); i++) {
      const x = 5 + r() * (m.w - 10), y = 5 + r() * (m.h - 10);
      if (!walkable(m, x, y)) continue;
      addProp(m, r() < 0.5 ? "urn" : "crate", x, y, { breakable: true, seed: (r() * 9999) | 0 });
    }
    for (let tries = 0; tries < 40; tries++) {
      const x = 10 + r() * (m.w - 20), y = 10 + r() * (m.h - 20);
      if (walkable(m, x, y) && U.dist(x, y, entry.x, entry.y) > 28) { addProp(m, "chest", x, y, { lootable: true }); break; }
    }
    /* hunting packs */
    const zone = m.zone;
    for (let c = 0; c < dn(16, MOB_MUL); c++) {
      const cx = 8 + r() * (m.w - 16), cy = 8 + r() * (m.h - 16);
      if (U.dist(cx, cy, entry.x, entry.y) < 13 || !walkable(m, cx, cy)) continue;
      const eid = U.pickR(r, zone.spawns);
      const def = DATA.ENEMIES[eid]; if (!def) continue;
      const count = def.pack ? U.riR(r, def.pack[0], def.pack[1]) : U.riR(r, 2, 4);
      const elite = r() < 0.2;
      for (let i = 0; i < count; i++) {
        m.monsterSpawns.push({ id: eid, x: cx + (r() - 0.5) * 4, y: cy + (r() - 0.5) * 4, elite: elite && i === 0, minion: elite && i > 0 });
      }
    }
    connectPockets(m, r, entry.x, entry.y, 30);   // the thicket never seals a glade away
    biomeApply(m, r);
    bakeMinimap(m);
    return m;
  }

  /* =====================================================================
     DUNGEONS — Sunken Crypt levels (rooms + corridors)
     ===================================================================== */
  function genCrypt(zoneId, seed, opts) {
    const m = blank(zoneId, sz(64), sz(64));
    const r = U.rng(seed ^ U.hash(zoneId));
    scatterFloor(m, U.rng(seed ^ 7));
    m.walls.fill(1); m.blocked.fill(1);

    /* ---- per-zone dungeon ARCHETYPE: crypts are winding catacombs, temples are pillared
       great halls, mines are organic caverns, drowned places are flooded galleries.
       Every archetype produces the same rooms[] contract the shared content code uses. ---- */
    const arch = opts.arch || "rooms";
    m._arch = arch;
    const rooms = [];
    const wet = [];                                   // corridor water-line tiles (flooded arch)
    const carveRect = (x, y, w, h) => { for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) { const i = idx(m, U.clamp(xx, 1, m.w - 2), U.clamp(yy, 1, m.h - 2)); m.walls[i] = 0; m.blocked[i] = 0; } };
    const placeRooms = (cap, lo, hi, gap) => {
      for (let tries = 0; tries < dn(240, 2.2) && rooms.length < cap; tries++) {
        const w = U.riR(r, lo, hi), h = U.riR(r, lo, hi);
        const x = U.riR(r, 2, m.w - w - 3), y = U.riR(r, 2, m.h - h - 3);
        let ok = true;
        for (const o of rooms) if (x < o.x + o.w + gap && o.x < x + w + gap && y < o.y + o.h + gap && o.y < y + h + gap) { ok = false; break; }
        if (!ok) continue;
        rooms.push({ x, y, w, h, cx: x + w / 2, cy: y + h / 2 });
      }
      for (const ro of rooms) carveRect(ro.x, ro.y, ro.w, ro.h);
    };
    /* straight L-corridor of a given width; optionally records its centre line (for water) */
    const carveCorr = (a, b, wide, rec) => {
      let x = a.cx | 0, y = a.cy | 0;
      const tx = b.cx | 0, ty = b.cy | 0;
      const horizFirst = r() < 0.5;
      const carve = (x, y) => {
        for (let oy = 0; oy <= wide; oy++) for (let ox = 0; ox <= wide; ox++) { const i = idx(m, U.clamp(x + ox, 1, m.w - 2), U.clamp(y + oy, 1, m.h - 2)); m.walls[i] = 0; m.blocked[i] = 0; }
        if (rec) rec.push(idx(m, U.clamp(x + (wide >> 1), 1, m.w - 2), U.clamp(y + (wide >> 1), 1, m.h - 2)));
      };
      if (horizFirst) { while (x !== tx) { carve(x, y); x += Math.sign(tx - x); } while (y !== ty) { carve(x, y); y += Math.sign(ty - y); } }
      else { while (y !== ty) { carve(x, y); y += Math.sign(ty - y); } while (x !== tx) { carve(x, y); x += Math.sign(tx - x); } }
      carve(tx, ty);
    };
    /* narrow wandering passage (catacombs) — turns pure-greedy after a while so it
       ALWAYS reaches the far room (a broken chain here once sealed off whole dungeons) */
    const carveWinding = (a, b) => {
      let x = a.cx | 0, y = a.cy | 0; const tx = b.cx | 0, ty = b.cy | 0; let guard = 0;
      const open = (x, y) => { const i = idx(m, U.clamp(x, 1, m.w - 2), U.clamp(y, 1, m.h - 2)); m.walls[i] = 0; m.blocked[i] = 0; };
      while ((x !== tx || y !== ty) && guard++ < 2000) {
        open(x, y);
        const dx = Math.sign(tx - x), dy = Math.sign(ty - y);
        if (guard < 300 && r() < 0.22 && guard > 2) { if (r() < 0.5) x += r() < 0.5 ? 1 : -1; else y += r() < 0.5 ? 1 : -1; }
        else if (dx !== 0 && (dy === 0 || r() < 0.5)) x += dx;
        else if (dy !== 0) y += dy;
        x = U.clamp(x, 2, m.w - 3); y = U.clamp(y, 2, m.h - 3);
      }
      open(tx, ty);
    };
    if (arch === "cavern") {
      /* organic cave: cellular automata, keep the single largest cavity */
      const cells = new Uint8Array(m.w * m.h).fill(1);
      for (let y = 2; y < m.h - 2; y++) for (let x = 2; x < m.w - 2; x++) cells[idx(m, x, y)] = r() < 0.46 ? 1 : 0;
      for (let it = 0; it < 4; it++) {
        const nx2 = cells.slice();
        for (let y = 2; y < m.h - 2; y++) for (let x = 2; x < m.w - 2; x++) {
          let n9 = 0;
          for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) n9 += cells[idx(m, x + ox, y + oy)];
          nx2[idx(m, x, y)] = n9 >= 5 ? 1 : 0;
        }
        cells.set(nx2);
      }
      const comp = new Int32Array(m.w * m.h).fill(-1); let big = -1, bigN = 0, nc = 0;
      for (let i = 0; i < cells.length; i++) {
        if (cells[i] || comp[i] >= 0) continue;
        let cnt = 0; const st = [i]; comp[i] = nc;
        while (st.length) {
          const j = st.pop(); cnt++;
          const jx = j % m.w, jy = (j / m.w) | 0;
          for (const d of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const kx = jx + d[0], ky = jy + d[1];
            if (kx < 0 || ky < 0 || kx >= m.w || ky >= m.h) continue;
            const k = idx(m, kx, ky);
            if (!cells[k] && comp[k] < 0) { comp[k] = nc; st.push(k); }
          }
        }
        if (cnt > bigN) { bigN = cnt; big = nc; }
        nc++;
      }
      for (let i = 0; i < cells.length; i++) { const w2 = (cells[i] || comp[i] !== big) ? 1 : 0; m.walls[i] = w2; m.blocked[i] = w2; }
      /* pocket anchors act as the "rooms"; each gets a small guaranteed clearing */
      const openIdx = []; for (let i = 0; i < cells.length; i++) if (!m.walls[i]) openIdx.push(i);
      if (openIdx.length > 40) {
        const anchors = [openIdx[(r() * openIdx.length) | 0]];
        while (anchors.length < 10) {
          let best = -1, bd = -1;
          for (let t = 0; t < 60; t++) {   // sampled farthest-point spread
            const cand = openIdx[(r() * openIdx.length) | 0];
            const cx2 = cand % m.w, cy2 = (cand / m.w) | 0;
            let mind = 1e9;
            for (const a of anchors) mind = Math.min(mind, U.dist2(cx2, cy2, a % m.w, (a / m.w) | 0));
            if (mind > bd) { bd = mind; best = cand; }
          }
          if (best < 0 || bd < 100) break;
          anchors.push(best);
        }
        for (const a of anchors) {
          const ax = a % m.w, ay = (a / m.w) | 0;
          for (let oy = -2; oy <= 2; oy++) for (let ox = -2; ox <= 2; ox++)
            if (Math.hypot(ox, oy) <= 2.5) { const i = idx(m, U.clamp(ax + ox, 1, m.w - 2), U.clamp(ay + oy, 1, m.h - 2)); m.walls[i] = 0; m.blocked[i] = 0; }
          rooms.push({ x: ax - 3, y: ay - 3, w: 6, h: 6, cx: ax, cy: ay });
        }
        rooms.sort((a, b) => a.cx + a.cy - b.cx - b.cy);
      }
    } else if (arch === "halls") {
      /* few, GRAND pillared chambers joined by wide galleries */
      placeRooms(6 + (r() * 2 | 0), 11, 17, 3);
      rooms.sort((a, b) => a.cx + a.cy - b.cx - b.cy);
      for (let i = 1; i < rooms.length; i++) carveCorr(rooms[i - 1], rooms[i], 2);
      if (rooms.length > 3) carveCorr(rooms[0], rooms[rooms.length - 1], 2);
    } else if (arch === "catacombs") {
      /* many small burial cells threaded by narrow winding passages */
      placeRooms(dn(13, Math.min(MOB_MUL, 2.2)), 4, 8, 2);
      rooms.sort((a, b) => a.cx + a.cy - b.cx - b.cy);
      for (let i = 1; i < rooms.length; i++) carveWinding(rooms[i - 1], rooms[i]);
      for (let i = 0; i < 4 && rooms.length > 4; i++) carveWinding(U.pickR(r, rooms), U.pickR(r, rooms));
    } else if (arch === "flooded") {
      /* halls half-swallowed by water: wide galleries with a drowned centre line */
      placeRooms(dn(10, Math.min(MOB_MUL, 2.2)), 6, 12, 2);
      rooms.sort((a, b) => a.cx + a.cy - b.cx - b.cy);
      for (let i = 1; i < rooms.length; i++) carveCorr(rooms[i - 1], rooms[i], 2, wet);
      for (let i = 0; i < dn(2, 2) && rooms.length > 4; i++) carveCorr(U.pickR(r, rooms), U.pickR(r, rooms), 2, wet);
      const wcode = DATA.HAZARD_BY_ID.bog;
      if (wcode) for (const wi of wet) if (!m.walls[wi]) m.hazard[wi] = wcode;
    } else {
      /* classic rooms + corridors */
      placeRooms(dn(11, Math.min(MOB_MUL, 2.2)), 6, 13, 2);
      rooms.sort((a, b) => a.cx + a.cy - b.cx - b.cy);
      for (let i = 1; i < rooms.length; i++) carveCorr(rooms[i - 1], rooms[i], 1);
      for (let i = 0; i < dn(2, 2) && rooms.length > 4; i++) carveCorr(U.pickR(r, rooms), U.pickR(r, rooms), 1);
    }
    if (!rooms.length) {   // absolute fallback: never generate an empty dungeon
      placeRooms(dn(11, Math.min(MOB_MUL, 2.2)), 6, 13, 2);
      rooms.sort((a, b) => a.cx + a.cy - b.cx - b.cy);
      for (let i = 1; i < rooms.length; i++) carveCorr(rooms[i - 1], rooms[i], 1);
    }

    /* connectivity REPAIR: any room the corridors failed to link gets a direct
       deterministic gallery back to the first room (no dungeon can ever seal off) */
    {
      const seen = new Uint8Array(m.w * m.h), st = [[rooms[0].cx | 0, rooms[0].cy | 0]];
      if (walkable(m, rooms[0].cx, rooms[0].cy)) seen[idx(m, rooms[0].cx | 0, rooms[0].cy | 0)] = 1;
      while (st.length) {
        const c = st.pop();
        for (const d of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = c[0] + d[0], ny = c[1] + d[1];
          if (nx < 1 || ny < 1 || nx >= m.w - 1 || ny >= m.h - 1 || seen[idx(m, nx, ny)] || m.blocked[idx(m, nx, ny)]) continue;
          seen[idx(m, nx, ny)] = 1; st.push([nx, ny]);
        }
      }
      for (const ro of rooms) if (!seen[idx(m, ro.cx | 0, ro.cy | 0)]) carveCorr(ro, rooms[0], arch === "halls" || arch === "flooded" ? 2 : 1);
    }
    /* entrance room = first; boss room = farthest from it */
    const start = rooms[0];
    let far = rooms[1], fd = 0;
    for (const ro of rooms.slice(1)) { const d = U.dist2(start.cx, start.cy, ro.cx, ro.cy); if (d > fd) { fd = d; far = ro; } }
    /* the entry chamber is always roomy: a tiny catacomb cell once let the stairs +
       shrine props plug its only 1-wide mouths and seal off the whole dungeon */
    carveRect((start.cx - 3) | 0, (start.cy - 3) | 0, 7, 7);

    /* entrance: stairs up */
    addProp(m, "stairs", start.cx, start.cy - 1.2, { blocks: true });
    m.exits.push({ x0: start.cx - 1.4, y0: start.cy - 1.6, x1: start.cx + 1.4, y1: start.cy + 0.4, target: opts.upTarget, spawnKey: opts.upSpawnKey, label: opts.upLabel });
    m.spawns[opts.entryKey] = { x: start.cx, y: start.cy + 1.6 };
    m.spawns.default = m.spawns[opts.entryKey];
    m.spawns.portal = { x: start.cx + 1.5, y: start.cy + 1.5 };
    addLight(m, start.cx, start.cy, 4, "#8fb0d8", false);

    /* boss/down room contents */
    if (opts.downTarget) {
      addProp(m, "stairs", far.cx, far.cy - 1.2, { blocks: true });
      m.exits.push({ x0: far.cx - 1.4, y0: far.cy - 1.6, x1: far.cx + 1.4, y1: far.cy + 0.4, target: opts.downTarget, spawnKey: opts.downSpawnKey, label: opts.downLabel });
    }
    if (opts.bossId) {
      m.monsterSpawns.push({ id: opts.bossId, x: far.cx + (opts.downTarget ? 2 : 0), y: far.cy + 2, boss: true });
      addProp(m, "chest", far.cx - 2, far.cy + 2.5, { lootable: true, rich: true });
    }
    /* a giant frozen spring fills the boss room floor — the boss hunches over it */
    if (opts.springRoom) {
      const sc = DATA.HAZARD_BY_ID.spring, sr = 3.6;
      for (let yy = (far.cy | 0) - 4; yy <= (far.cy | 0) + 4; yy++)
        for (let xx = (far.cx | 0) - 4; xx <= (far.cx | 0) + 4; xx++) {
          if (xx < 1 || yy < 1 || xx >= m.w - 1 || yy >= m.h - 1) continue;
          if (m.blocked[idx(m, xx, yy)]) continue;                 // only open floor
          if (U.dist(xx + 0.5, yy + 0.5, far.cx, far.cy) <= sr) setHaz(m, xx, yy, sc);
        }
      addLight(m, far.cx, far.cy, 5, "#9fe8ff", false);            // the spring's cold glow
    }
    if (opts.shrineInBossRoom) {
      addProp(m, "shrine", far.cx + 3, far.cy - 1, { interact: "shrine", label: "Travel Shrine" });
      addLight(m, far.cx + 3, far.cy - 1, 3.5, "#8fd8ff");
      m.shrine = { x: far.cx + 3, y: far.cy + 0.4 };
      m.spawns.shrine = { x: far.cx + 3, y: far.cy + 0.6 };
    }
    if (opts.entryShrine) {
      addProp(m, "shrine", start.cx + 2.5, start.cy + 1.8, { interact: "shrine", label: "Travel Shrine" });
      addLight(m, start.cx + 2.5, start.cy + 1.8, 3.5, "#8fd8ff");
      m.shrine = { x: start.cx + 2.5, y: start.cy + 3 };
      /* arrive at the guaranteed-clear entry tile, not past the room wall */
      m.spawns.shrine = { x: m.spawns[opts.entryKey].x, y: m.spawns[opts.entryKey].y };
    }

    /* trapped survivors to rescue — scattered through the non-entrance rooms */
    if (opts.survivors) {
      const pool = rooms.filter(ro => ro !== start);
      for (let i = 0; i < opts.survivors; i++) {
        const ro = pool[i % pool.length] || start;
        const sx2 = ro.x + 1 + r() * (ro.w - 2), sy2 = ro.y + 1 + r() * (ro.h - 2);
        const did = DATA.SURVIVOR_IDS[i % DATA.SURVIVOR_IDS.length];
        m.npcs.push({ id: did, x: sx2, y: sy2, survivor: true, sid: m.id + "_surv_" + i });
        addLight(m, sx2, sy2, 2.6, "#ffe0a0", true);   // a faint lantern marks each one
      }
    }
    /* injected named spawns (seal wardens and the like) */
    if (opts.extraSpawns) {
      for (const es of opts.extraSpawns) {
        for (let i = 0; i < es.count; i++) {
          const ro = rooms[1 + ((r() * (rooms.length - 1)) | 0)] || rooms[0];
          m.monsterSpawns.push({ id: es.id, x: ro.x + 1 + r() * (ro.w - 2), y: ro.y + 1 + r() * (ro.h - 2) });
        }
      }
    }
    /* room dressing + monsters — flavoured by the dungeon archetype */
    const zone = m.zone;
    for (const ro of rooms) {
      const isStart = ro === start, isBossR = ro === far;
      if (arch === "halls" && ro.w >= 11 && ro.h >= 9) {
        /* twin colonnades + a woven carpet running the hall's length */
        for (let px2 = ro.x + 2; px2 <= ro.x + ro.w - 3; px2 += 3) {
          addProp(m, "pillar", px2 + 0.5, ro.y + 1.5); addProp(m, "pillar", px2 + 0.5, ro.y + ro.h - 1.5);
        }
        for (let yy = (ro.cy - 1) | 0; yy <= (ro.cy + 1) | 0; yy++)
          for (let xx = ro.x + 1; xx < ro.x + ro.w - 1; xx++) if (!m.walls[idx(m, xx, yy)]) m.floor[idx(m, xx, yy)] = 2;
      } else if (arch !== "cavern" && ro.w >= 9 && ro.h >= 9) {
        addProp(m, "pillar", ro.x + 2.5, ro.y + 2.5); addProp(m, "pillar", ro.x + ro.w - 2.5, ro.y + 2.5);
        addProp(m, "pillar", ro.x + 2.5, ro.y + ro.h - 2.5); addProp(m, "pillar", ro.x + ro.w - 2.5, ro.y + ro.h - 2.5);
      }
      if (arch === "cavern") {
        /* stalagmites + the occasional glowing shard instead of masonry */
        for (let i2 = 0, n2 = U.riR(r, 2, 5); i2 < n2; i2++) {
          const x = ro.cx + U.riR(r, -4, 4), y = ro.cy + U.riR(r, -4, 4);
          if (walkable(m, x, y) && U.dist(x, y, ro.cx, ro.cy) > 1.8) addProp(m, "rock", x, y, { seed: (r() * 9999) | 0 });
        }
        if (r() < 0.3) {
          const sx3 = ro.cx + U.riR(r, -3, 3), sy3 = ro.cy + U.riR(r, -3, 3);
          if (walkable(m, sx3, sy3) && U.dist(sx3, sy3, ro.cx, ro.cy) > 1.8) { addProp(m, "embershard", sx3, sy3, { blocks: true }); addLight(m, sx3, sy3, 4, "#7fd8c0", false); }
        }
      }
      /* count open neighbours — dressing must never plug a narrow corridor mouth */
      const openNb = (x, y) => { let n2 = 0; for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) { if (!ox && !oy) continue; if (walkable(m, (x | 0) + ox, (y | 0) + oy)) n2++; } return n2; };
      if (arch === "catacombs" && !isStart && r() < 0.5) {
        /* burial niches: a grave row along one wall (kept clear of doorways) */
        const gy = r() < 0.5 ? ro.y + 1 : ro.y + ro.h - 1.5;
        for (let gx2 = ro.x + 1.5; gx2 < ro.x + ro.w - 1; gx2 += 1.7) if (walkable(m, gx2, gy) && openNb(gx2, gy) >= 5) addProp(m, "grave", gx2, gy, { seed: (r() * 9999) | 0 });
      }
      if (arch === "flooded" && !isStart) {
        /* standing water pools the room's heart (walkable but slow — wade or skirt it) */
        const pr2 = Math.min(ro.w, ro.h) / 2 - 1.8, wcode = DATA.HAZARD_BY_ID.bog;
        if (pr2 >= 1 && wcode) for (let yy = ro.y; yy < ro.y + ro.h; yy++) for (let xx = ro.x; xx < ro.x + ro.w; xx++)
          if (!m.walls[idx(m, xx, yy)] && U.dist(xx + 0.5, yy + 0.5, ro.cx, ro.cy) < pr2) setHaz(m, xx, yy, wcode);
      }
      /* braziers — sparse light */
      if (r() < (arch === "cavern" ? 0.45 : 0.75)) { const bx = ro.x + 1.5 + r() * (ro.w - 3), by = ro.y + 1.5 + r() * (ro.h - 3); addProp(m, "brazier", bx, by, { light: true }); addLight(m, bx, by, 4.5, "#ff9c50"); }
      /* urns and graves (never where they could plug a passage) */
      for (let i = 0, n = U.riR(r, 1, 4); i < n; i++) {
        const x = ro.x + 1 + r() * (ro.w - 2), y = ro.y + 1 + r() * (ro.h - 2);
        if (!walkable(m, x, y) || openNb(x, y) < 5) continue;
        addProp(m, r() < 0.6 ? "urn" : "grave", x, y, { breakable: r() < 0.6, seed: (r() * 9999) | 0 });
      }
      if (isStart) continue;
      /* monsters — big halls & sparse caverns pack more per room to keep density even */
      const packs = isBossR ? 1 : (arch === "halls" || arch === "cavern" ? U.riR(r, 2, 3) : U.riR(r, 1, 2));
      for (let p = 0; p < packs; p++) {
        const eid = U.pickR(r, zone.spawns);
        const def = DATA.ENEMIES[eid]; if (!def) continue;
        const count = def.pack ? U.riR(r, def.pack[0], def.pack[1]) : U.riR(r, 2, 4);
        const elite = !isBossR && r() < 0.2;
        for (let i = 0; i < count; i++) {
          const x = ro.x + 1 + r() * (ro.w - 2), y = ro.y + 1 + r() * (ro.h - 2);
          m.monsterSpawns.push({ id: eid, x, y, elite: elite && i === 0, minion: elite && i > 0 });
        }
      }
    }
    /* prop-seal safety: if any dressing still walled off part of the dungeon, delete the
       offending blockers on the reachable frontier until everything opens up again */
    for (let sweep = 0; sweep < 4; sweep++) {
      const sp2 = m.spawns.default; if (!sp2) break;
      const seen2 = new Uint8Array(m.w * m.h), st2 = [[sp2.x | 0, sp2.y | 0]];
      if (!walkable(m, sp2.x, sp2.y)) break;
      seen2[idx(m, sp2.x | 0, sp2.y | 0)] = 1;
      while (st2.length) {
        const c = st2.pop();
        for (const d of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = c[0] + d[0], ny = c[1] + d[1];
          if (nx < 1 || ny < 1 || nx >= m.w - 1 || ny >= m.h - 1 || seen2[idx(m, nx, ny)] || m.blocked[idx(m, nx, ny)]) continue;
          seen2[idx(m, nx, ny)] = 1; st2.push([nx, ny]);
        }
      }
      let removed = false;
      for (let i = m.props.length - 1; i >= 0; i--) {
        const pr = m.props[i];
        if (!pr.blocks || pr.interact || pr.type === "stairs") continue;
        const px2 = pr.x | 0, py2 = pr.y | 0;
        let touchIn = false, touchOut = false;
        for (const d of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const j = idx(m, px2 + d[0], py2 + d[1]);
          if (px2 + d[0] < 1 || py2 + d[1] < 1 || px2 + d[0] >= m.w - 1 || py2 + d[1] >= m.h - 1 || m.blocked[j]) continue;
          if (seen2[j]) touchIn = true; else touchOut = true;
        }
        if (touchIn && touchOut) { m.props.splice(i, 1); m.blocked[idx(m, px2, py2)] = m.walls[idx(m, px2, py2)]; removed = true; }
      }
      if (!removed) break;
    }
    biomeApply(m, r);
    bakeMinimap(m);
    return m;
  }

  /* =====================================================================
     public API
     ===================================================================== */
  function generateLayout(zoneId, worldSeed) {
    switch (zoneId) {
      case "frosthaven_approach": return genOpening(worldSeed);
      case "town": return genTown(worldSeed);
      case "fields": return genFields(worldSeed);
      case "crypt1": return genCrypt("crypt1", worldSeed, {
        arch: "catacombs",
        upTarget: "fields", upSpawnKey: "from_crypt1", upLabel: "The Ashen Fields", entryKey: "from_fields",
        downTarget: "crypt2", downSpawnKey: "from_crypt1", downLabel: "The Vigil",
        bossId: "gravecaller",
      });
      case "crypt2": return genCrypt("crypt2", worldSeed, {
        arch: "catacombs",
        upTarget: "crypt1", upSpawnKey: "from_crypt2", upLabel: "The Hollows", entryKey: "from_crypt1",
        bossId: "morthul", shrineInBossRoom: false,
      });
      case "chapel": return genCrypt("chapel", worldSeed, {
        arch: "halls",
        upTarget: "fields", upSpawnKey: "from_chapel", upLabel: "The Ashen Fields", entryKey: "from_fields",
        bossId: "vicar",
      });
      case "forest": return genForest(worldSeed);
      case "monastery1": return genCrypt("monastery1", worldSeed, {
        arch: "halls",
        upTarget: "forest", upSpawnKey: "from_monastery", upLabel: "The Blackbough", entryKey: "from_forest",
        downTarget: "monastery2", downSpawnKey: "from_monastery1", downLabel: "The Sanctum",
      });
      case "monastery2": return genCrypt("monastery2", worldSeed, {
        arch: "halls",
        upTarget: "monastery1", upSpawnKey: "from_monastery2", upLabel: "The Cloister", entryKey: "from_monastery1",
        bossId: "vellath", entryShrine: true,
      });

      /* ===== ACT II — The Fallen North ===== */
      case "frosthaven": return genCamp("frosthaven", worldSeed, {
        npcs: [{ id: "sera", x: 11, y: 13 }, { id: "bryn", x: 16, y: 13 }], shard: true, forge: true,
        vendors: [{ id: "hewn", x: 18, y: 11 }, { id: "wenna", x: 7, y: 11 }],
        exit: { target: "north_wild", spawnKey: "from_camp", returnKey: "from_wild", label: "The Fallen North" } });
      case "north_wild": return genWilds("north_wild", worldSeed, { size: 80, rainCh: 0, arch: "tundra_shelves",
        decor: ["deadtree", "rock", "grave"], shards: 4, camps: 16,
        entryKey: "from_camp", back: { target: "frosthaven", spawnKey: "from_wild", label: "Frosthaven" },
        gate: { prop: "monasterygate", target: "shattered_temple", spawnKey: "from_wild", returnKey: "from_temple", label: "The Shattered Temple", glow: "#9fd0ff" },
        side: { prop: "cryptdoor", target: "mines", spawnKey: "from_wild", returnKey: "from_mines", label: "The Abandoned Mines" },
        sides: [
          { prop: "cryptdoor", target: "shardpeak_shrine", spawnKey: "from_wild", returnKey: "from_shardpeak", label: "The Shardpeak Shrine", glow: "#bfe0ff" },
          { prop: "cryptdoor", target: "deepfreeze_cavern", spawnKey: "from_wild", returnKey: "from_deepfreeze", label: "The Deepfreeze Caverns", glow: "#9fe8ff" } ] });
      case "mines": return genCrypt("mines", worldSeed, {
        arch: "cavern",
        upTarget: "north_wild", upSpawnKey: "from_mines", upLabel: "The Fallen North", entryKey: "from_wild", entryShrine: true,
        survivors: 3 });
      case "shattered_temple": return genCrypt("shattered_temple", worldSeed, {
        arch: "halls",
        upTarget: "north_wild", upSpawnKey: "from_temple", upLabel: "The Fallen North", entryKey: "from_wild",
        bossId: "korvath", entryShrine: true });

      /* ===== ACT II — The Weeping Marsh ===== */
      case "marshcamp": return genCamp("marshcamp", worldSeed, {
        npcs: [{ id: "oris", x: 10, y: 9 }], shard: true, forge: true,
        vendors: [{ id: "sutler_smith", x: 18, y: 11 }, { id: "sutler_quarter", x: 7, y: 11 }],
        exit: { target: "weeping_marsh", spawnKey: "from_camp", returnKey: "from_wild", label: "The Weeping Marsh" } });
      case "weeping_marsh": return genWilds("weeping_marsh", worldSeed, { size: 82, rainCh: 0.6, arch: "fen_channels",
        decor: ["deadtree", "rock", "grave"], shards: 4, camps: 17,
        entryKey: "from_camp", back: { target: "marshcamp", spawnKey: "from_wild", label: "Greywater Landing" },
        gate: { prop: "chapelruin", target: "ritual_site", spawnKey: "from_wild", returnKey: "from_ritual", label: "The Choir's Ritual", glow: "#a0d8ff" },
        side: { prop: "chapelruin", target: "drowned_crypt", spawnKey: "from_wild", returnKey: "from_drowned", label: "Abandoned Monastery — Flooded Crypts" },
        sides: [
          { prop: "cryptdoor", target: "hollow_reeds", spawnKey: "from_wild", returnKey: "from_reeds", label: "The Hollow Reeds", glow: "#8ac8ff" },
          { prop: "cryptdoor", target: "spawn_pools", spawnKey: "from_wild", returnKey: "from_pools", label: "The Spawn Pools", glow: "#90c060" } ] });
      case "drowned_crypt": return genCrypt("drowned_crypt", worldSeed, {
        arch: "flooded",
        upTarget: "weeping_marsh", upSpawnKey: "from_drowned", upLabel: "The Weeping Marsh", entryKey: "from_wild", entryShrine: true });
      case "ritual_site": return genCrypt("ritual_site", worldSeed, {
        arch: "flooded",
        upTarget: "weeping_marsh", upSpawnKey: "from_ritual", upLabel: "The Weeping Marsh", entryKey: "from_wild",
        bossId: "mire_mother", entryShrine: true });

      /* ===== ACT III — The City Beneath the Sand ===== */
      case "khalcamp": return genCamp("khalcamp", worldSeed, {
        npcs: [{ id: "edran", x: 10, y: 9 }], shard: true, forge: true,
        vendors: [{ id: "sutler_smith", x: 18, y: 11 }, { id: "sutler_quarter", x: 7, y: 11 }],
        exit: { target: "desert_wastes", spawnKey: "from_camp", returnKey: "from_wild", label: "The Shifting Wastes" } });
      case "desert_wastes": return genWilds("desert_wastes", worldSeed, { size: 82, rainCh: 0, arch: "dune_mesas",
        decor: ["rock", "grave"], shards: 4, camps: 17,
        entryKey: "from_camp", back: { target: "khalcamp", spawnKey: "from_wild", label: "The Dig Camp" },
        gate: { prop: "monasterygate", target: "khal_palace", spawnKey: "from_wild", returnKey: "from_palace", label: "Palace of Khal-Zahir", glow: "#ffce70" },
        side: { prop: "cryptdoor", target: "sand_tombs", spawnKey: "from_wild", returnKey: "from_tombs", label: "The Shifting Tombs" },
        sides: [
          { prop: "cryptdoor", target: "underground_market", spawnKey: "from_wild", returnKey: "from_market", label: "Underground Market", glow: "#ffd040" },
          { prop: "cryptdoor", target: "shard_flats", spawnKey: "from_wild", returnKey: "from_flats", label: "The Shard Flats", glow: "#ffd040" },
          { prop: "cryptdoor", target: "tomb_sanctum", spawnKey: "from_wild", returnKey: "from_sanctum", label: "Tomb of the Chained", glow: "#ffb040" } ] });
      case "sand_tombs": return genCrypt("sand_tombs", worldSeed, {
        arch: "catacombs",
        upTarget: "desert_wastes", upSpawnKey: "from_tombs", upLabel: "The Shifting Wastes", entryKey: "from_wild", entryShrine: true });
      case "underground_market": return genCrypt("underground_market", worldSeed, {
        arch: "halls",
        upTarget: "desert_wastes", upSpawnKey: "from_market", upLabel: "The Shifting Wastes", entryKey: "from_wild", entryShrine: true });
      case "khal_palace": return genCrypt("khal_palace", worldSeed, {
        arch: "halls",
        upTarget: "desert_wastes", upSpawnKey: "from_palace", upLabel: "The Shifting Wastes", entryKey: "from_wild",
        bossId: "azram", entryShrine: true });

      /* ===== ACT IV — The Shattered Cathedral (shifting) ===== */
      case "cathedral1": return genCrypt("cathedral1", worldSeed, {
        arch: "halls",
        upTarget: "khalcamp", upSpawnKey: "shrine", upLabel: "The Dig Camp", entryKey: "default",
        downTarget: "cathedral2", downSpawnKey: "from_cathedral1", downLabel: "The Cathedral Heart",
        bossId: "empty_archangel", entryShrine: true });
      case "cathedral2": return genCrypt("cathedral2", worldSeed, {
        arch: "halls",
        upTarget: "cathedral1", upSpawnKey: "from_cathedral2", upLabel: "The Shattered Cathedral", entryKey: "from_cathedral1",
        bossId: "malthoron", entryShrine: true });

      /* ===== ACT V — The Throne of Cinders ===== */
      case "hellgate": return genCamp("hellgate", worldSeed, {
        npcs: [{ id: "vael", x: 10, y: 9 }], shard: true, forge: true,
        vendors: [{ id: "sutler_smith", x: 18, y: 11 }, { id: "sutler_quarter", x: 7, y: 11 }],
        exit: { target: "ash_wastes", spawnKey: "from_camp", returnKey: "from_wild", label: "The Cinderfields" } });
      case "ash_wastes": return genWilds("ash_wastes", worldSeed, { size: 82, rainCh: 0, arch: "cinder_rifts",
        decor: ["deadtree", "rock"], shards: 5, camps: 18,
        entryKey: "from_camp", back: { target: "hellgate", spawnKey: "from_wild", label: "The Breach" },
        gate: { prop: "monasterygate", target: "throne", spawnKey: "from_wild", returnKey: "from_throne", label: "The Throne of Cinders", glow: "#ff6030" },
        side: { prop: "cryptdoor", target: "cinder_bastion", spawnKey: "from_wild", returnKey: "from_bastion", label: "The Cinder Bastion" } });
      case "cinder_bastion": return genCrypt("cinder_bastion", worldSeed, {
        arch: "catacombs",
        upTarget: "ash_wastes", upSpawnKey: "from_bastion", upLabel: "The Cinderfields", entryKey: "from_wild", entryShrine: true });
      case "throne": return genCrypt("throne", worldSeed, {
        arch: "halls",
        upTarget: "ash_wastes", upSpawnKey: "from_throne", upLabel: "The Cinderfields", entryKey: "from_wild",
        bossId: "vethriss", entryShrine: true });

      /* ===== OPTIONAL SIDE-QUEST SUB-ZONES (Acts I–III) ===== */
      case "shardpeak_shrine": return genCrypt("shardpeak_shrine", worldSeed, {
        arch: "cavern",
        upTarget: "north_wild", upSpawnKey: "from_shardpeak", upLabel: "The Fallen North", entryKey: "from_wild", entryShrine: true });
      case "deepfreeze_cavern": return genCrypt("deepfreeze_cavern", worldSeed, {
        arch: "cavern",
        upTarget: "north_wild", upSpawnKey: "from_deepfreeze", upLabel: "The Fallen North", entryKey: "from_wild", entryShrine: true,
        bossId: "hoarfang", springRoom: true });
      case "hollow_reeds": return genCrypt("hollow_reeds", worldSeed, {
        arch: "flooded",
        upTarget: "weeping_marsh", upSpawnKey: "from_reeds", upLabel: "The Weeping Marsh", entryKey: "from_wild", entryShrine: true });
      case "spawn_pools": return genCrypt("spawn_pools", worldSeed, {
        arch: "flooded",
        upTarget: "weeping_marsh", upSpawnKey: "from_pools", upLabel: "The Weeping Marsh", entryKey: "from_wild", bossId: "brood_mother", entryShrine: true });
      case "shard_flats": return genCrypt("shard_flats", worldSeed, {
        arch: "cavern",
        upTarget: "desert_wastes", upSpawnKey: "from_flats", upLabel: "The Shifting Wastes", entryKey: "from_wild", entryShrine: true });
      case "tomb_sanctum": return genCrypt("tomb_sanctum", worldSeed, {
        arch: "catacombs",
        upTarget: "desert_wastes", upSpawnKey: "from_sanctum", upLabel: "The Shifting Wastes", entryKey: "from_wild", bossId: "chained_sovereign", entryShrine: true });
    }
    throw new Error("unknown zone " + zoneId);
  }

  function reserveBossArena(m) {
    const id=m.zone.boss;
    if(typeof BossEncounters==="undefined"||!BossEncounters.definitions[id])return;
    const boss=m.monsterSpawns.find(s=>s.id===id);if(!boss)return;
    const x0=U.clamp(Math.floor(boss.x)-10,3,m.w-24),y0=U.clamp(Math.floor(boss.y)-10,3,m.h-24);
    const a=m.bossArena={bossId:id,x0,y0,x1:x0+21,y1:y0+21,cx:x0+10.5,cy:y0+10.5};
    const inside=(x,y,pad=0)=>x>=a.x0-pad&&x<a.x1+pad&&y>=a.y0-pad&&y<a.y1+pad;
    // Connect the room by a three-wide gallery to existing traversable floor.
    let approach=null,dist=Infinity;
    for(let y=2;y<m.h-2;y++)for(let x=2;x<m.w-2;x++)if(!inside(x+.5,y+.5,2)&&walkable(m,x+.5,y+.5)){
      const d=U.dist2(x+.5,y+.5,a.cx,a.cy);if(d<dist){dist=d;approach={x:x+.5,y:y+.5};}
    }
    const carved=new Set();
    const clear=(x,y)=>{if(x<1||y<1||x>=m.w-1||y>=m.h-1)return;const i=idx(m,x,y);carved.add(i);m.walls[i]=m.blocked[i]=m.hazard[i]=m.elev[i]=0;m.floor[i]=2;};
    for(let y=y0;y<a.y1;y++)for(let x=x0;x<a.x1;x++)clear(x,y);
    if(approach){
      let x=approach.x|0,y=approach.y|0;
      const carve=()=>{for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++)clear(x+ox,y+oy);};
      while(x!==(a.cx|0)){carve();x+=Math.sign((a.cx|0)-x);}while(y!==(a.cy|0)){carve();y+=Math.sign((a.cy|0)-y);}carve();
      a.approach=approach;
    }
    // Persistent interactables stay available; ordinary dressing cannot fill the room.
    m.props=m.props.filter(p=>!carved.has(idx(m,p.x|0,p.y|0))||p.interact||p.lootable||p.type==="stairs");
    for(const p of m.props)if(carved.has(idx(m,p.x|0,p.y|0))){p.blocks=false;m.blocked[idx(m,p.x|0,p.y|0)]=0;}
    const decor={korvath:"rock",mire_mother:"deadtree",azram:"pillar",empty_archangel:"pillar",malthoron:"grave",vethriss:"rock"}[id];
    for(const [x,y] of [[a.x0+.5,a.y0+.5],[a.x1-.5,a.y0+.5],[a.x0+.5,a.y1-.5],[a.x1-.5,a.y1-.5]])addProp(m,decor,x,y,{blocks:false});
    m.monsterSpawns=m.monsterSpawns.filter(s=>s===boss||!inside(s.x,s.y,2));boss.x=a.cx;boss.y=a.cy;
    // Preserve the shared terrain collision contract after flattening the room.
    if(m.surfaceVersion){m.ramps=m.ramps.filter(r=>!inside(r.x,r.y,3));TerrainSurface.rebuild(m);}
    m.hasElev=m.elev.some(v=>v>0);bakeMinimap(m);
  }
  function generate(zoneId, worldSeed) {
    const m = generateLayout(zoneId, worldSeed);
    reserveBossArena(m);
    const objects = DATA.STORY_OBJECTS[zoneId] || [];
    if (!objects.length) return m;
    // All objectives go on ground reachable from the entrance after dressing.
    const start = m.spawns.default, seen = new Set(), queue = [[start.x|0,start.y|0]];
    for (let i=0;i<queue.length;i++) {
      const [x,y] = queue[i], k=x+y*m.w;
      if (seen.has(k) || !walkable(m,x+.5,y+.5)) continue;
      seen.add(k);
      for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const nx=x+dx,ny=y+dy;
        if (nx>0&&ny>0&&nx<m.w-1&&ny<m.h-1&&!seen.has(nx+ny*m.w)&&canStep(m,x+.5,y+.5,nx+.5,ny+.5)) queue.push([nx,ny]);
      }
    }
    const candidates = [...seen].map(k=>({x:k%m.w+.5,y:Math.floor(k/m.w)+.5})).filter(p=>
      U.dist(p.x,p.y,start.x,start.y)>7 &&
      !m.props.some(pr=>U.dist(pr.x,pr.y,p.x,p.y)<1.8) &&
      [[1,0],[-1,0],[0,1],[0,-1]].every(([dx,dy])=>walkable(m,p.x+dx,p.y+dy)));
    const chosen = [];
    for (const [i,obj] of objects.entries()) {
      const boss = obj.requireKill && m.monsterSpawns.find(sp=>sp.id===obj.requireKill);
      const frac=(i+1)/(objects.length+1), target={x:start.x+(m.w-2-start.x)*frac,y:start.y+(m.h-2-start.y)*frac};
      const point = candidates.filter(p=>chosen.every(c=>U.dist(c.x,c.y,p.x,p.y)>3)&&
        (obj.requireKill||!m.bossArena||!BossEncounters.insideArena(m.bossArena,p.x,p.y)))
        .sort((a,b)=>U.dist2(a.x,a.y,(boss||target).x,(boss||target).y)-U.dist2(b.x,b.y,(boss||target).x,(boss||target).y))[0];
      if (!point) throw new Error('No reachable story placement: '+zoneId+'/'+obj.id);
      chosen.push(point);
      if (obj.npc) m.npcs.push({id:obj.npc,...point,npcArt:obj.art,displayName:obj.label,storyId:obj.id});
      else addProp(m,obj.type,point.x,point.y,{blocks:false,interact:"story",storyId:obj.id,label:obj.label});
      addLight(m,point.x,point.y,3,obj.npc?'#c0dcff':'#d8b880',false);
      for (const [j,id] of (obj.guards||[]).entries()) {
        const guard = candidates.filter(p=>U.dist(p.x,p.y,point.x,point.y)>1.5&&(!m.bossArena||!BossEncounters.insideArena(m.bossArena,p.x,p.y))).sort((a,b)=>U.dist2(a.x,a.y,point.x,point.y)-U.dist2(b.x,b.y,point.x,point.y))[j];
        if (guard) m.monsterSpawns.push({id,x:guard.x,y:guard.y});
      }
      if (zoneId==='underground_market') {
        addProp(m,'cart',point.x+1,point.y,{blocks:false});
        addProp(m,'crate',point.x,point.y+1,{blocks:false});
      }
      if (zoneId.startsWith('cathedral') && i<3) {
        // Remembered village graves, fortress columns and mountain stone.
        const types=['grave','pillar','rock'];
        addProp(m,types[i],point.x+1,point.y,{blocks:false});
        addProp(m,types[i],point.x,point.y+1,{blocks:false});
      }
    }
    return m;
  }
  return { generate, walkable, canStep, elevAt };
})();
