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
  const elevAt = (m, x, y, surfaceId) => {if(m.layers)m=TerrainLayers.view(m,surfaceId);return (x < 0 || y < 0 || x >= m.w || y >= m.h) ? 0 : m.elev[idx(m, x, y)];};
  /* may an entity step from tile a to tile b? blocked-aware AND height-aware (climb/descend <=1). */
  function canStep(m, ax, ay, bx, by, surfaceId) {
    if(m.layers)m=TerrainLayers.view(m,surfaceId);
    return walkable(m,bx,by) && (m.surfaceVersion ? TerrainSurface.connected(m,Math.floor(ax),Math.floor(ay),Math.floor(bx),Math.floor(by)) : Math.abs(elevAt(m,ax|0,ay|0)-elevAt(m,bx|0,by|0))<=1);
  }
  function walkable(m, x, y, surfaceId) { if(m.layers)m=TerrainLayers.view(m,surfaceId); x |= 0; y |= 0; return x >= 0 && y >= 0 && x < m.w && y < m.h && !m.blocked[idx(m, x, y)]; }

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
        if(!m.frontier&&!m.composition)m.elev[idx(m, tx, ty)] = 0; // authored arrivals retain their connected terrace height
        if (m.walls[idx(m, tx, ty)]) continue;            // never carve actual walls open
        if (m.buildings?.some(b => (b.footprints||[b.footprint]).some(a=>a&&tx>=a.x0&&tx<a.x1&&ty>=a.y0&&ty<a.y1))) continue;
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
      if (m.void?.[x+y*m.w]) { img.data.set([13,12,23,255],i); }
      else if (m.walls[idx(m, x, y)]) { img.data[i] = 120; img.data[i + 1] = 110; img.data[i + 2] = 96; img.data[i + 3] = 255; }
      else if (m.act2) {
        const tile=x+y*m.w,color=m.act2.water[tile]?[20,43,48]:m.blocked[tile]?[98,103,94]:m.floor[tile]>=4?[105,101,79]:[57,65,55];
        img.data.set([...color,255],i);
      } else if (m.settlement) {
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
    if(zoneId==='hellgate'){
      const e=m.exits[0],x=(e.x0+e.x1)/2,y=(e.y0+e.y1)/2;
      const gate=addProp(m,'cinders_breach_gate',x,y,{blocks:false,building:true,gate:true,label:e.label,footprints:[]});
      for(const [px,py] of [[36,18],[39,11]]){
        const footprint={x0:px,y0:py,x1:px+1,y1:py+1};block(m,px,py);m.floor[idx(m,px,py)]=1;
        gate.footprints.push(footprint);m.buildings.push({type:'breach_gate',x:px,y:py,footprint,gate:true});
      }
      m.composition={revision:1,identity:'fallen-demon-kingdoms',terrainWalls:false,
        landmarks:[{id:'entry',label:'The last redoubt',...m.spawns.default},{id:'gate',label:'The battlefield gate',x:x-3,y:y+.5,exit:{x,y,target:e.target}}],
        routes:[],reserved:[],decals:[],encounters:[],anchors:{events:[]},scenery:[]};
      addLight(m,x-2,y,5,'#ff9c50');
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
  /* Act I: authored places joined by seeded routes. World geometry, quest
     anchors and art all come from this composition, before incidental dressing.
     Other acts continue to use the original generators above. */
  const FRONTIER = {
    north_wild: {size:160, outdoor:true, dark:.38, packs:29,
      nodes:[
        ['entry','The broken watch road',12,80,9,8],
        ['watch','Last Watch crossroads',42,76,13,11,'watchtower'],
        ['mine','Abandoned minehead',43,113,11,10,'minehead'],
        ['watch_beacon','The fallen watch-post',73,49,12,11,'tollhouse'],
        ['burial_beacon','The oath burial ground',94,86,13,12,'memorial'],
        ['quarry_beacon','The silent quarry',124,48,13,12,'supports'],
        ['forecourt','The temple forecourt',138,85,12,12,'temple'],
        ['caravan','The lost caravan',71,117,10,8],
        ['overlook','The northern overlook',108,18,9,8,'pilgrim_stones'],
        ['shardpeak','The pilgrim trail',73,18,9,8,'shelter'],
        ['deepfreeze','The spring road',121,119,10,9,'ice_ribs']],
      edges:[['entry','watch'],['watch','mine'],['watch','watch_beacon'],['watch_beacon','quarry_beacon'],
        ['quarry_beacon','forecourt'],['forecourt','burial_beacon'],['burial_beacon','watch'],
        ['watch_beacon','shardpeak'],['quarry_beacon','overlook'],['burial_beacon','deepfreeze']],
      branches:[['caravan',['mine','burial_beacon']]],rewards:['caravan','overlook'],
      gates:[['mine','mines','from_mines','The Abandoned Mines'],['forecourt','shattered_temple','from_temple','The Shattered Temple'],
        ['shardpeak','shardpeak_shrine','from_shardpeak','The Shardpeak Shrine'],['deepfreeze','deepfreeze_cavern','from_deepfreeze','The Deepfreeze Caverns']]},
    mines: {size:128,dark:.66,packs:22,
      nodes:[['entry','The old haul entrance',18,24,9,8,'supports'],['haul','The winding works',43,38,12,10,'minehead'],
        ['refuge_0','The lamp refuge',36,75,10,9,'shelter'],['ore','The ore staging floor',72,68,13,11,'supports'],
        ['refuge_1','The barricaded works',78,103,11,9,'tollhouse'],['deep','The deep cut',103,58,12,11,'ice_ribs'],
        ['refuge_2','The last refuge',103,94,10,10,'shelter'],['cache','The sealed pay store',65,24,8,8]],
      edges:[['entry','haul'],['haul','refuge_0'],['refuge_0','ore'],['ore','refuge_1'],['refuge_1','refuge_2'],
        ['refuge_2','deep'],['deep','ore'],['ore','haul']],branches:[['cache',['haul','ore']]],rewards:['cache'],returnKey:'from_mines'},
    shattered_temple: {size:128,dark:.58,packs:20,
      nodes:[['entry','The shattered entrance',18,25,10,9,'temple'],['procession','The processional hall',47,35,13,10,'memorial'],
        ['court','The broken memorial court',71,69,14,13,'memorial'],['vigil','The final vigil',99,62,10,9,'pilgrim_stones'],
        ['sanctuary','Korvath’s sanctuary',104,101,14,14],['reliquary','The forgotten reliquary',42,92,10,9,'temple']],
      edges:[['entry','procession'],['procession','court'],['court','vigil'],['vigil','sanctuary'],['court','sanctuary'],
        ['court','reliquary',true],['reliquary','procession',true]],branches:[],rewards:['reliquary'],returnKey:'from_temple',boss:'korvath',bossNode:'sanctuary'},
    shardpeak_shrine: {size:128,outdoor:true,dark:.34,packs:20,
      nodes:[['entry','The pilgrim steps',17,64,9,10,'pilgrim_stones'],['shelter','The last pilgrim shelter',37,65,11,10,'shelter'],
        ['windward','The windward ascent',66,32,11,10,'pilgrim_stones'],['lee','The sheltered ascent',66,91,11,10,'tollhouse'],
        ['summit','The Shardpeak Vigil',105,61,14,13,'summit'],['cache','The votive overlook',106,100,8,9,'memorial']],
      edges:[['entry','shelter'],['shelter','windward'],['shelter','lee'],['windward','summit'],['lee','summit']],
      branches:[['cache',['summit','lee']]],rewards:['cache'],returnKey:'from_shardpeak'},
    deepfreeze_cavern: {size:128,dark:.44,packs:21,
      nodes:[['entry','The frozen descent',19,24,9,9,'ice_ribs'],['gallery','The blue gallery',47,38,12,10,'ice_arch'],
        ['narrows','The ice narrows',39,77,9,10,'ice_ribs'],['basin','The lower ice basin',75,75,13,12,'ice_arch'],
        ['spring','Hoarfang’s frozen spring',103,100,14,14,'spring'],['shelf','The frost shelf',101,50,11,10,'ice_ribs'],
        ['cache','The abandoned spring stores',72,21,8,8,'shelter']],
      edges:[['entry','gallery'],['gallery','narrows'],['narrows','basin'],['basin','spring'],['spring','shelf'],['shelf','gallery']],
      branches:[['cache',['gallery','shelf']]],rewards:['cache'],returnKey:'from_deepfreeze',boss:'hoarfang',bossNode:'spring'}
  };
  function genFrontier(zoneId,seed) {
    const c=FRONTIER[zoneId],m=blank(zoneId,c.size,c.size),r=U.rng(seed^U.hash(zoneId)^0x61a17);
    m.zone={...m.zone,dark:c.dark};m.outdoor=!!c.outdoor;m.surfaceVersion=1;m.ramps=[];m.buildings=[];
    m.walls.fill(1);m.blocked.fill(1);scatterFloor(m,U.rng(seed^13));
    const f=m.frontier={revision:1,seed,identity:zoneId,terrainWalls:true,landmarks:[],routes:[],reserved:[],
      anchors:{beacons:[],events:[],survivors:[]},decals:[],scenery:[],encounters:[],arenaReserved:false};
    const nodes={};
    for(const [id,label,x,y,rx,ry,art] of c.nodes){
      const n={id,label,x:x+(id==='entry'?0:U.riR(r,-2,2))+.5,y:y+(id==='entry'?0:U.riR(r,-2,2))+.5,rx,ry,art,entrances:[]};
      n.combatSpace={x0:n.x-3,y0:n.y-3,x1:n.x+3,y1:n.y+3};
      nodes[id]=n;f.landmarks.push(n);
    }
    const inside=(x,y)=>x>=1&&y>=1&&x<m.w-1&&y<m.h-1;
    const open=(x,y,path=false)=>{if(!inside(x,y))return;const i=idx(m,x,y);setWall(m,x,y,0);if(path)m.floor[i]=4;};
    const ellipse=(n,rx=n.rx,ry=n.ry)=>{
      for(let y=Math.floor(n.y-ry-1);y<=n.y+ry+1;y++)for(let x=Math.floor(n.x-rx-1);x<=n.x+rx+1;x++){
        const a=Math.atan2((y+.5-n.y)/ry,(x+.5-n.x)/rx),edge=1+.045*Math.sin(a*5+n.x)+.035*Math.cos(a*3+n.y);
        if(((x+.5-n.x)/rx)**2+((y+.5-n.y)/ry)**2<=edge)open(x,y);
      }
    };
    for(const n of f.landmarks)ellipse(n);
    function connect(aId,bId,optional=false){
      const a=nodes[aId],b=nodes[bId],horizontalFirst=r()<.5;
      // Midpoint doglegs vary by seed but always enter the authored room centers.
      const bend=Math.round((horizontalFirst?a.x+b.x:a.y+b.y)/2)+U.riR(r,-4,4)+.5;
      const points=horizontalFirst?[{x:a.x,y:a.y},{x:bend,y:a.y},{x:bend,y:b.y},{x:b.x,y:b.y}]:
        [{x:a.x,y:a.y},{x:a.x,y:bend},{x:b.x,y:bend},{x:b.x,y:b.y}];
      const width=c.outdoor?9:7,route={from:aId,to:bId,optional,width,points};f.routes.push(route);
      for(const [n,ordered,to] of [[a,points,bId],[b,points.slice().reverse(),aId]]){
        const p=ordered.find(p=>p.x!==n.x||p.y!==n.y),dx=p.x-n.x,dy=p.y-n.y;
        const t=Math.min(1,1/Math.sqrt((dx/(n.rx-2))**2+(dy/(n.ry-2))**2));
        n.entrances.push({to,x:n.x+dx*t,y:n.y+dy*t,width});
      }
      for(let k=1;k<points.length;k++){
        const a=points[k-1],b=points[k],steps=Math.max(Math.abs(b.x-a.x),Math.abs(b.y-a.y));
        for(let t=0;t<=steps;t++){
          const x=Math.round(U.lerp(a.x,b.x,t/(steps||1))-.5),y=Math.round(U.lerp(a.y,b.y,t/(steps||1))-.5);
          const shoulder=width/2+(c.outdoor?1.5:1)*(1+Math.sin((x+y)*.23+a.x*.1));
          for(let oy=-Math.ceil(shoulder);oy<=shoulder;oy++)for(let ox=-Math.ceil(shoulder);ox<=shoulder;ox++)
            if(ox*ox+oy*oy<=shoulder**2)open(x+ox,y+oy,ox*ox+oy*oy<=6.25);
        }
      }
    }
    for(const [a,b,optional] of c.edges)connect(a,b,!!optional);
    for(const [a,choices] of c.branches)connect(U.pickR(r,choices),a,true);
    const distanceToRoutes=(x,y)=>Math.min(...f.routes.flatMap(ro=>ro.points.slice(1).map((b,i)=>{
      const a=ro.points[i],dx=b.x-a.x,dy=b.y-a.y,t=U.clamp(((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy||1),0,1);
      return Math.hypot(x-a.x-dx*t,y-a.y-dy*t);
    })));
    const entry=nodes.entry;
    if(zoneId==='north_wild'){
      for(let x=0;x<entry.x;x++)for(let y=entry.y-3|0;y<=entry.y+3;y++){
        setWall(m,x,y,0);m.floor[idx(m,x,y)]=4;
      }
      m.exits.push({x0:0,y0:entry.y-2.5,x1:1.4,y1:entry.y+2.5,target:'frosthaven',spawnKey:'from_wild',label:'Frosthaven'});
      m.spawns.from_camp={x:3.5,y:entry.y};
    }else{
      addProp(m,'stairs',entry.x-3,entry.y-1,{blocks:false});
      m.exits.push({x0:entry.x-4.4,y0:entry.y-2.6,x1:entry.x-1.6,y1:entry.y+.4,target:'north_wild',spawnKey:c.returnKey,label:'The Fallen North'});
      m.spawns.from_wild={x:entry.x,y:entry.y+1.5};
    }
    m.spawns.default={...(m.spawns.from_camp||m.spawns.from_wild)};m.spawns.portal={x:entry.x+1,y:entry.y+2};
    const shrine=zoneId==='north_wild'?nodes.watch:entry;
    addProp(m,'shrine',shrine.x+3,shrine.y+3,{blocks:false,interact:'shrine',label:'Travel Shrine'});
    addLight(m,shrine.x+3,shrine.y+3,4,'#abd5df',false);
    m.shrine={x:shrine.x+3,y:shrine.y+4.5};m.spawns.shrine={...m.shrine};
    for(const [id,target,key,label] of c.gates||[]){
      const n=nodes[id],x=n.x+3,y=n.y+2;
      m.exits.push({x0:x-1.4,y0:y-.8,x1:x+1.4,y1:y+1.2,target,spawnKey:'from_wild',label});
      m.spawns[key]={x,y:y+2.5};n.exit={x,y,target};
      addProp(m,target==='shattered_temple'?'monasterygate':'cryptdoor',x,y-1,{blocks:false});
      addLight(m,x,y,4.5,target==='shattered_temple'?'#a6cee5':'#b4becc',false);
    }
    if(c.boss){
      const n=nodes[c.bossNode];m.monsterSpawns.push({id:c.boss,x:n.x,y:n.y,boss:true});
      const a={bossId:c.boss,x0:Math.floor(n.x)-10,y0:Math.floor(n.y)-10,x1:Math.floor(n.x)+11,y1:Math.floor(n.y)+11,cx:n.x,cy:n.y};
      for(let y=a.y0;y<a.y1;y++)for(let x=a.x0;x<a.x1;x++)open(x,y);
      if(c.boss==='korvath'){m.bossArena=a;a.approach={x:n.x,y:a.y0-1.5};}
      f.reserved.push({...a,kind:'boss'});f.arenaReserved=true;
      addProp(m,'chest',n.x+6,n.y+6,{blocks:false,lootable:true,rich:true});
    }
    // Broad geological shelves replace a mountain billboard on every wall tile.
    // The two outdoor ascents have explicit five-wide continuous ramps.
    const bands=zoneId==='north_wild'?[{axis:'y',at:32,highSide:-1,low:0,high:2}]:
      zoneId==='shardpeak_shrine'?[{axis:'x',at:49,highSide:1,low:0,high:2},{axis:'x',at:87,highSide:1,low:2,high:4}]:[];
    const baseAt=(x,y)=>{
      let h=0;for(const b of bands)if(((b.axis==='x'?x:y)-b.at)*b.highSide>=0)h=b.high;return h;
    };
    for(let y=0;y<m.h;y++)for(let x=0;x<m.w;x++){
      const boundary=c.outdoor&&[[0,-1],[1,0],[0,1],[-1,0]].some(([dx,dy])=>inside(x+dx,y+dy)&&!m.walls[idx(m,x+dx,y+dy)]);
      m.elev[idx(m,x,y)]=baseAt(x,y)+(m.walls[idx(m,x,y)]?(c.outdoor?(boundary?1:3):4):0);
    }
    for(const b of bands)for(const ro of f.routes)for(let k=1;k<ro.points.length;k++){
      const a=ro.points[k-1],z=ro.points[k],axis=b.axis,other=axis==='x'?'y':'x';
      if(a[axis]===z[axis]||Math.min(a[axis],z[axis])>b.at||Math.max(a[axis],z[axis])<b.at)continue;
      const cross=Math.floor(a[other]),start=b.highSide>0?b.at-2:b.at+1;
      const ramp={x:axis==='x'?start:cross,y:axis==='y'?start:cross,dx:axis==='x'?b.highSide:0,dy:axis==='y'?b.highSide:0,width:5,length:4,low:b.low,high:b.high};
      if(m.ramps.some(r=>Math.hypot(r.x-ramp.x,r.y-ramp.y)<6))continue;
      for(let t=-1;t<=4;t++)for(let w=-2;w<=2;w++){
        const x=ramp.x+ramp.dx*t+(ramp.dy?w:0),y=ramp.y+ramp.dy*t+(ramp.dx?w:0);
        open(x,y,true);m.elev[idx(m,x,y)]=t===-1?ramp.low:t===4?ramp.high:baseAt(x,y);
      }
      m.ramps.push(ramp);
    }
    for(const a of f.reserved)for(let y=a.y0;y<a.y1;y++)for(let x=a.x0;x<a.x1;x++)m.elev[idx(m,x,y)]=0;
    if(zoneId==='deepfreeze_cavern'){
      const n=nodes.spring,code=DATA.HAZARD_BY_ID.spring;
      for(let y=n.y-4|0;y<=n.y+4;y++)for(let x=n.x-4|0;x<=n.x+4;x++)
        if(Math.hypot(x+.5-n.x,y+.5-n.y)<=3.6)setHaz(m,x,y,code);
      addLight(m,n.x,n.y,7,'#9fe8ff',false);
    }
    TerrainSurface.rebuild(m);
    const protectedPoint=(x,y,pad=0)=>Object.values(m.spawns).some(p=>Math.hypot(p.x-x,p.y-y)<3+pad)||
      f.reserved.some(a=>x>=a.x0-pad&&x<a.x1+pad&&y>=a.y0-pad&&y<a.y1+pad)||
      m.ramps.some(a=>Math.hypot(x-a.x-a.dx*2,y-a.y-a.dy*2)<6+pad);
    function architecture(n){
      if(!n.art)return;
      // Large art is behind the playable court, with a real multi-tile footprint.
      const span=['temple','minehead','spring','summit'].includes(n.art)?5:4;
      if(n.art==='spring'){
        // The spring's low rim belongs to the ground plane, not a solid object.
        f.decals.push({type:'frontier_spring',x:n.x,y:n.y,scale:1,alpha:.9});return;
      }
      let placement=null;
      for(const radius of [6,9,12])for(const [dx,dy] of [[-1,-1],[0,-1],[-1,0],[1,-1],[-1,1],[1,0],[0,1],[1,1]]){
        if(placement)break;
        const x=n.x+dx*radius,y=n.y+dy*radius,footprint={x0:Math.floor(x-span/2),y0:Math.floor(y-span/2),x1:Math.floor(x-span/2)+span,y1:Math.floor(y-span/2)+span};
        const cells=[];for(let yy=footprint.y0;yy<footprint.y1;yy++)for(let xx=footprint.x0;xx<footprint.x1;xx++)cells.push([xx,yy]);
        if(cells.every(([xx,yy])=>inside(xx,yy)&&!protectedPoint(xx+.5,yy+.5)&&distanceToRoutes(xx+.5,yy+.5)>=3&&baseAt(xx,yy)===baseAt(n.x,n.y)))placement={x,y,footprint,cells};
      }
      if(!placement)throw Error('No safe landmark footprint: '+zoneId+'/'+n.id);
      const {x,y,footprint,cells}=placement;
      for(const [xx,yy] of cells){setWall(m,xx,yy,0);block(m,xx,yy);m.elev[idx(m,xx,yy)]=baseAt(xx,yy);}
      const pr=addProp(m,n.art,x,y,{artZone:'frontier',blocks:true,footprint,building:true,landmarkId:n.id});
      m.buildings.push(pr);f.reserved.push({...footprint,kind:'architecture',landmarkId:n.id});
      n.footprint=footprint;addLight(m,x+1,y+2,c.outdoor?5:6,'#ffb775');
    }
    for(const n of f.landmarks)architecture(n);
    // A few composed rear silhouettes occupy solid scenery, away from the road.
    // Their entire bases are blocked; the courts retain clear sight lines.
    if(c.outdoor)for(const n of f.landmarks)for(const [dx,dy] of [[-14,-12],[12,-16]]){
      const x=Math.floor(n.x+dx)+.5,y=Math.floor(n.y+dy)+.5;
      const footprint={x0:Math.floor(x)-3,y0:Math.floor(y)-3,x1:Math.floor(x)+4,y1:Math.floor(y)+4};
      let solid=true;
      for(let yy=footprint.y0;yy<footprint.y1;yy++)for(let xx=footprint.x0;xx<footprint.x1;xx++)if(!inside(xx,yy)||!m.walls[idx(m,xx,yy)])solid=false;
      if(solid){f.scenery.push({x,y,variant:U.riR(r,0,5),scale:1.7,footprint});f.reserved.push({...footprint,kind:'scenery',landmarkId:n.id});}
    }
    const safe=(x,y)=>TerrainSurface.supported(m,x,y,.4)&&!protectedPoint(x,y)&&!m.props.some(p=>Math.hypot(x-p.x,y-p.y)<1.4);
    if(zoneId==='north_wild')for(const id of ['watch_beacon','burial_beacon','quarry_beacon']){
      const n=nodes[id];f.anchors.beacons.push({id,x:n.x,y:n.y});
    }
    if(zoneId==='mines')for(let i=0;i<3;i++){
      const n=nodes['refuge_'+i],p={x:n.x+3,y:n.y+2};
      m.npcs.push({id:DATA.SURVIVOR_IDS[i],...p,survivor:true,sid:'mines_surv_'+i});
      f.anchors.survivors.push({id:'mines_surv_'+i,...p});addLight(m,p.x,p.y,6,'#ffcb8a');
      addProp(m,'brazier',p.x-1,p.y+1,{blocks:false});
    }
    for(const id of c.rewards){
      const n=nodes[id];addProp(m,'chest',n.x+2,n.y+2,{blocks:false,lootable:true,rich:true,landmarkId:id});
      addLight(m,n.x+2,n.y+2,3,'#d6bc8b',false);
    }
    if(nodes.caravan){const n=nodes.caravan;addProp(m,'cart',n.x-5,n.y-4,{blocks:true});addProp(m,'crate',n.x+5,n.y-3,{breakable:true});}
    // Floor marks use authored pixels and are composed once into terrain chunks.
    for(const n of f.landmarks){
      n.elevation=baseAt(n.x,n.y);
      if(n.id!==c.bossNode)f.decals.push({type:zoneId==='mines'?'frontier_tracks':zoneId==='shattered_temple'?'frontier_paving':'frontier_rubble',x:n.x,y:n.y,scale:1.5,alpha:.72});
      if(n.id!=='entry'&&n.id!==c.bossNode&&!n.id.includes('beacon')&&safe(n.x+3,n.y-2))f.anchors.events.push({id:n.id,x:n.x+3,y:n.y-2});
      for(let j=0;j<7;j++){
        const a=r()*Math.PI*2,x=Math.floor(n.x+Math.cos(a)*(n.rx-2))+.5,y=Math.floor(n.y+Math.sin(a)*(n.ry-2))+.5;
        if(!safe(x,y)||distanceToRoutes(x,y)<3.2)continue;
        const type=zoneId==='mines'?U.pickR(r,['crate','barrel','rock']):zoneId==='shattered_temple'?U.pickR(r,['pillar','urn','grave']):U.pickR(r,['rock','deadtree','grave']);
        addProp(m,type,x,y,{blocks:false,breakable:['crate','barrel','urn'].includes(type),seed:U.riR(r,1,9999)});
      }
    }
    if(zoneId==='mines')for(const ro of f.routes)for(let k=1;k<ro.points.length;k++){
      const a=ro.points[k-1],b=ro.points[k],len=Math.hypot(b.x-a.x,b.y-a.y);
      for(let d=4;d<len;d+=4)f.decals.push({type:'frontier_tracks',x:U.lerp(a.x,b.x,d/len),y:U.lerp(a.y,b.y,d/len),scale:1,alpha:.82,turn:a.x===b.x});
    }
    const combat=f.landmarks.filter(n=>n.id!=='entry'&&n.id!==c.bossNode),ranged=m.zone.spawns.filter(id=>DATA.ENEMIES[id].projectile),melee=m.zone.spawns.filter(id=>!DATA.ENEMIES[id].projectile);
    for(let k=0;k<c.packs;k++){
      const n=combat[k%combat.length],elite=c.rewards.includes(n.id)&&k<combat.length;
      const type=U.pickR(r,k%3===1&&ranged.length?ranged:melee.length?melee:m.zone.spawns);
      const def=DATA.ENEMIES[type],count=def.pack?U.riR(r,def.pack[0],def.pack[1]):U.riR(r,2,4),anchor={x:n.x+(k%2?4:-1),y:n.y+(k%3?2:5)};
      const group={landmarkId:n.id,role:k%3===1?'ranged':'melee',elite,spawns:[]};
      for(let i=0;i<count;i++){
        let pos=null;for(let attempt=0;attempt<50&&!pos;attempt++){
          const x=Math.floor(anchor.x+U.riR(r,-3,3))+.5,y=Math.floor(anchor.y+U.riR(r,-3,3))+.5;
          if(safe(x,y)&&!f.anchors.beacons.some(b=>Math.hypot(x-b.x,y-b.y)<2)&&!f.anchors.survivors.some(b=>Math.hypot(x-b.x,y-b.y)<3))pos={x,y};
        }
        if(pos){const sp={id:type,...pos,elite:elite&&i===0,minion:elite&&i>0,landmarkId:n.id};m.monsterSpawns.push(sp);group.spawns.push(sp);}
      }
      f.encounters.push(group);
    }
    // Finalize surface after every footprint is known. Placement never relies on
    // a later nearest-walkable teleport to rescue a disconnected objective.
    bakeMinimap(m);TerrainSurface.rebuild(m);m.hasElev=m.elev.some(v=>v>0);
    m.terrainDiagnostics={ramps:m.ramps.length,raisedTiles:m.elev.reduce((n,h)=>n+(h>0),0)};
    return m;
  }
  /* Act II: stable places, seeded connective routes, and flooded negative space.
     Navigation remains in the ordinary grids; scenic water is never a hazard. */
  const ACT2 = {
    weeping_marsh:{size:164,dark:.40,outdoor:true,population:136,entryKey:'from_camp',shrine:'bell',
      nodes:[['entry','The broken landing causeway',12,86,9,9],['hamlet','The abandoned stilt hamlet',39,85,14,12,'stilt_hut'],
        ['bell','The leaning bell crossroads',67,72,14,13,'bell_tower'],['graveyard','The flooded graveyard',80,113,15,12,'ossuary'],
        ['monastery','The monastery forecourt',128,81,15,14,'cloister'],['procession','The last procession',136,128,13,13,'root_crown'],
        ['reeds','The northern reed passage',70,22,13,12,'submerged_shrine'],['pools','The drowned sluice',119,34,13,12,'nesting_roots'],
        ['wreck','The lost ferry',31,124,11,9,'boat_wreck']],
      edges:[['entry','hamlet'],['hamlet','bell'],['bell','graveyard'],['graveyard','monastery'],['monastery','bell'],
        ['monastery','procession'],['bell','reeds'],['monastery','pools'],['hamlet','wreck',true],['wreck','graveyard',true]],
      gates:[['monastery','drowned_crypt','from_drowned','monastery_out'],['reeds','hollow_reeds','from_reeds','reeds_out'],
        ['pools','spawn_pools','from_pools','sluice_out'],['procession','ritual_site','from_ritual','ritual_out']],rewards:['wreck','graveyard']},
    drowned_crypt:{size:128,dark:.52,population:96,entryKey:'from_wild',returnKey:'from_drowned',threshold:'monastery_in',shrine:'entry',stone:true,
      nodes:[['entry','The monastery descent',18,20,12,10],['cloister','The flooded cloister',52,26,15,12,'cloister'],
        ['ossuary','The drowned ossuary',39,70,14,12,'ossuary'],['aisle','The dry processional aisle',78,73,12,11,'cloister'],
        ['nave','The Choir nave',104,105,15,15,'cloister'],['reliquary','The lost reliquary',99,31,12,11,'submerged_shrine'],
        ['stores','The votive chamber',27,105,11,10,'ossuary']],
      edges:[['entry','cloister'],['cloister','ossuary'],['ossuary','aisle'],['aisle','nave'],['aisle','reliquary',true],['reliquary','cloister',true],['ossuary','stores',true]],rewards:['reliquary','stores'],ritual:'nave'},
    hollow_reeds:{size:128,dark:.43,outdoor:true,population:96,entryKey:'from_wild',returnKey:'from_reeds',threshold:'reeds_in',shrine:'entry',boards:true,
      nodes:[['entry','Beneath the reed arch',17,23,12,10],['fork','The split boardwalk',46,31,12,11,'reed_clump'],
        ['boats','The boat graveyard',30,76,15,12,'boat_wreck'],['grove','The silent grove',82,52,15,14,'nesting_roots'],
        ['island','The drowned willow island',72,99,12,12,'stilt_hut'],['shrine','The submerged shrine',106,99,14,13,'submerged_shrine'],
        ['skiff','The sunken ferryman cache',27,107,10,9,'boat_wreck']],
      edges:[['entry','fork'],['fork','boats'],['fork','grove'],['boats','island'],['island','shrine'],['grove','shrine'],['boats','skiff',true]],rewards:['skiff'],herald:'shrine'},
    spawn_pools:{size:128,dark:.49,population:99,entryKey:'from_wild',returnKey:'from_pools',threshold:'sluice_in',shrine:'entry',
      nodes:[['entry','Inside the drowned sluice',18,20,12,10],['nursery','The pale nursery',49,28,14,11,'nesting_roots'],
        ['cistern','The collapsed cistern',57,66,16,15,'cloister'],['west','The western egg banks',27,92,12,13,'nesting_roots'],
        ['east','The root sluice',100,62,13,14,'ossuary'],['brood','The Brood Mother basin',95,106,15,15,'nesting_roots'],
        ['nest','The abandoned nest',101,24,11,10,'boat_wreck']],
      edges:[['entry','nursery'],['nursery','cistern'],['cistern','west'],['west','brood'],['cistern','east'],['east','brood'],['nursery','nest',true]],rewards:['nest'],boss:'brood_mother',bossNode:'brood'},
    ritual_site:{size:128,dark:.48,population:96,entryKey:'from_wild',returnKey:'from_ritual',threshold:'ritual_in',shrine:'entry',stone:true,
      nodes:[['entry','The broken processional gate',17,20,12,10],['stalls','The drowned choir stalls',47,29,15,12,'ossuary'],
        ['gallery','The root galleries',42,74,14,13,'cloister'],['side','The silent side gallery',89,57,12,12,'nesting_roots'],
        ['threshold','The last dry threshold',78,90,12,11,'submerged_shrine'],['basin','The Mire Mother basin',107,109,15,15,'root_crown'],
        ['offering','The forgotten offerings',22,108,10,10,'submerged_shrine']],
      edges:[['entry','stalls'],['stalls','gallery'],['gallery','threshold'],['gallery','side'],['side','threshold'],['threshold','basin'],['gallery','offering',true]],rewards:['offering'],boss:'mire_mother',bossNode:'basin'}
  };
  function genAct2(zoneId,seed){
    const c=ACT2[zoneId],m=blank(zoneId,c.size,c.size),r=U.rng(seed^U.hash(zoneId)^0x2ac720);
    m.zone={...m.zone,dark:c.dark};m.outdoor=!!c.outdoor;m.rain=!!c.outdoor&&r()<.6;
    m.surfaceVersion=1;m.ramps=[];m.buildings=[];m.blocked.fill(1);
    scatterFloor(m,U.rng(seed^27));
    const f=m.act2={revision:1,seed,identity:zoneId,landmarks:[],routes:[],reserved:[],
      anchors:{events:[],story:{},ritual:null},decals:[],encounters:[],water:new Uint8Array(m.w*m.h).fill(1),arenaReserved:false};
    const nodes={},inside=(x,y)=>x>=1&&y>=1&&x<m.w-1&&y<m.h-1;
    const open=(x,y,path=false)=>{if(!inside(x,y))return;const i=idx(m,x,y);m.walls[i]=m.blocked[i]=f.water[i]=0;if(path)m.floor[i]=4;};
    for(const [id,label,x,y,rx,ry,art] of c.nodes){
      const n={id,label,x:x+(id==='entry'?0:U.riR(r,-2,2))+.5,y:y+(id==='entry'?0:U.riR(r,-2,2))+.5,rx,ry,art,entrances:[]};
      n.combatSpace={x0:n.x-4,y0:n.y-4,x1:n.x+4,y1:n.y+4};nodes[id]=n;f.landmarks.push(n);
      for(let yy=Math.floor(n.y-ry);yy<=n.y+ry;yy++)for(let xx=Math.floor(n.x-rx);xx<=n.x+rx;xx++){
        const dx=(xx+.5-n.x)/rx,dy=(yy+.5-n.y)/ry,angle=Math.atan2(dy,dx);
        const shape=c.stone?Math.max(Math.abs(dx),Math.abs(dy)):dx*dx+dy*dy;
        if(shape< (c.stone?.94:1+.08*Math.sin(angle*3+x)+.045*Math.sin(angle*7+y)))open(xx,yy);
      }
    }
    const distSeg=(x,y,a,b)=>{const dx=b.x-a.x,dy=b.y-a.y,t=U.clamp(((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy||1),0,1);return Math.hypot(x-a.x-dx*t,y-a.y-dy*t);};
    for(const [from,to,optional=false] of c.edges){
      const a=nodes[from],b=nodes[to],mid={x:Math.round((a.x+b.x)/2)+.5+U.riR(r,-3,3),y:Math.round((a.y+b.y)/2)+.5+U.riR(r,-3,3)};
      // Two short diagonals avoid the repeated right-angle hallway silhouette.
      // Architectural aisles still approach each court along its axis.
      const points=c.stone||c.boards?[{x:a.x,y:a.y},{x:a.x,y:mid.y},{x:b.x,y:mid.y},{x:b.x,y:b.y}]:[{x:a.x,y:a.y},mid,{x:b.x,y:b.y}];
      const width=optional?5:7,ro={from,to,optional,width,points};f.routes.push(ro);
      for(const [n,p,other] of [[a,points[1],to],[b,points.at(-2),from]]){
        const dx=p.x-n.x,dy=p.y-n.y,t=Math.min(1,1/Math.sqrt((dx/(n.rx-3))**2+(dy/(n.ry-3))**2||1));
        n.entrances.push({to:other,x:n.x+dx*t,y:n.y+dy*t,width});
      }
      for(let k=1;k<points.length;k++){
        const p=points[k-1],q=points[k],length=Math.hypot(q.x-p.x,q.y-p.y);
        for(let step=0;step<=Math.ceil(length*2);step++){
          const t=step/Math.max(1,Math.ceil(length*2)),x=U.lerp(p.x,q.x,t),y=U.lerp(p.y,q.y,t);
          for(let oy=-5;oy<=5;oy++)for(let ox=-5;ox<=5;ox++){
            const xx=Math.floor(x)+ox,yy=Math.floor(y)+oy,d=Math.hypot(xx+.5-x,yy+.5-y);
            if(d<=width/2+.6)open(xx,yy,d<=2.6);
          }
        }
        if(c.boards)for(let d=1;d<length;d+=3.8)f.decals.push({type:Math.abs(q.x-p.x)>Math.abs(q.y-p.y)?'act2_boardwalk_y':'act2_boardwalk_x',x:U.lerp(p.x,q.x,d/length),y:U.lerp(p.y,q.y,d/length),scale:1,alpha:1});
      }
    }
    const routeDistance=(x,y)=>Math.min(...f.routes.flatMap(ro=>ro.points.slice(1).map((b,k)=>distSeg(x,y,ro.points[k],b))));
    const reserve=(kind,p,radius=3)=>f.reserved.push({kind,x0:p.x-radius,y0:p.y-radius,x1:p.x+radius,y1:p.y+radius});
    const entry=nodes.entry;
    m.spawns[c.entryKey]={x:entry.x,y:entry.y+2};m.spawns.default={...m.spawns[c.entryKey]};m.spawns.portal={x:entry.x+2,y:entry.y+3};
    if(zoneId==='weeping_marsh'){
      for(let x=0;x<=entry.x;x++)for(let y=entry.y-3|0;y<=entry.y+3;y++){const i=idx(m,x,y);m.blocked[i]=f.water[i]=0;m.floor[i]=4;}
      m.exits.push({x0:0,y0:entry.y-2.5,x1:1.4,y1:entry.y+2.5,target:'marshcamp',spawnKey:'from_wild',label:'Greywater Landing'});
      m.spawns.from_camp={x:3.5,y:entry.y};m.spawns.default={...m.spawns.from_camp};
    }
    const shrine=nodes[c.shrine];
    addProp(m,'shrine',shrine.x+4,shrine.y+2,{blocks:false,interact:'shrine',label:'Travel Shrine'});
    m.shrine={x:shrine.x+4,y:shrine.y+3.5};m.spawns.shrine={...m.shrine};addLight(m,shrine.x+4,shrine.y+2,5,'#a7d0d5',false);
    for(const p of Object.values(m.spawns))reserve('arrival',p);
    for(const n of f.landmarks)f.reserved.push({...n.combatSpace,kind:'combat',landmarkId:n.id});
    // Boss and quest spaces are laid out before architecture. Never clear them afterwards.
    const arenaNode=nodes[c.bossNode||c.ritual];
    if(arenaNode){
      const n=arenaNode,a={bossId:c.boss||'choirmaster',x0:Math.floor(n.x)-10,y0:Math.floor(n.y)-10,x1:Math.floor(n.x)+11,y1:Math.floor(n.y)+11,cx:n.x,cy:n.y};
      for(let y=a.y0;y<a.y1;y++)for(let x=a.x0;x<a.x1;x++)open(x,y);
      f.reserved.push({...a,kind:'arena',landmarkId:n.id});f.arenaReserved=true;f.arena=a;
      if(c.boss){m.monsterSpawns.push({id:c.boss,x:n.x,y:n.y,boss:true});addProp(m,'chest',n.x+7,n.y+7,{blocks:false,lootable:true,rich:true});}
      if(c.boss==='mire_mother'){m.bossArena={...a,approach:{x:n.x-10.5,y:n.y}};f.anchors.story.mire_shard={x:n.x+2,y:n.y+2};}
      if(c.ritual)f.anchors.ritual={id:'drowned_ritual',x:n.x,y:n.y};
    }
    const protectedPoint=(x,y,pad=0)=>f.reserved.some(a=>x>=a.x0-pad&&x<a.x1+pad&&y>=a.y0-pad&&y<a.y1+pad);
    function solidArt(type,x,y,landmarkId,span=4){
      const footprint={x0:Math.floor(x-span/2),y0:Math.floor(y-span/2),x1:Math.floor(x-span/2)+span,y1:Math.floor(y-span/2)+span};
      for(let yy=footprint.y0;yy<footprint.y1;yy++)for(let xx=footprint.x0;xx<footprint.x1;xx++){
        if(!inside(xx,yy))throw Error('Act 2 architecture outside map: '+type);
        const i=idx(m,xx,yy);m.blocked[i]=1;m.walls[i]=f.water[i]=0;
      }
      const p=addProp(m,type,x,y,{artZone:'act2',blocks:true,building:true,footprint,landmarkId});m.buildings.push(p);
      f.reserved.push({...footprint,kind:'architecture',landmarkId});return p;
    }
    function threshold(n,type,target,key,returnKey){
      // The sprite's solid rear is behind the clickable front approach.
      const x=n.x-6,y=n.y-5;
      solidArt(type,x,y,n.id,4);
      const point={x:x+3,y:y+3};reserve('threshold',point,3);
      m.exits.push({x0:point.x-1.4,y0:point.y-.8,x1:point.x+1.4,y1:point.y+1.5,target,spawnKey:key,label:DATA.ZONES[target].name});
      if(returnKey){m.spawns[returnKey]={x:point.x+1.5,y:point.y+2.5};reserve('arrival',m.spawns[returnKey]);}
      n.exit={...point,target};addLight(m,point.x,point.y,6,type.includes('monastery')?'#9db9cd':'#9fbda0',false);
    }
    if(c.threshold)threshold(entry,c.threshold,'weeping_marsh',c.returnKey);
    for(const [id,target,key,type] of c.gates||[])threshold(nodes[id],type,target,'from_wild',key);
    for(const n of f.landmarks){
      if(!n.art||n.art==='reed_clump')continue;
      let spot=null;
      const span=n.art==='root_crown'?6:4;
      const offsets=[...(n===arenaNode||n.art==='root_crown'?[[-14,4],[4,-14]]:[]),...[9,12,15].flatMap(radius=>[[-1,-1],[0,-1],[-1,0],[1,-1],[-1,1],[1,0],[0,1]].map(([x,y])=>[x*radius,y*radius]))];
      for(const [dx,dy] of offsets){
        if(spot)break;const x=n.x+dx,y=n.y+dy;
        const cells=[];for(let yy=Math.floor(y-span/2);yy<Math.floor(y-span/2)+span;yy++)for(let xx=Math.floor(x-span/2);xx<Math.floor(x-span/2)+span;xx++)cells.push([xx,yy]);
        if(cells.every(([x,y])=>inside(x,y)&&!protectedPoint(x+.5,y+.5,1)&&routeDistance(x+.5,y+.5)>4))spot={x,y};
      }
      if(!spot)throw Error('No Act 2 landmark seat: '+zoneId+'/'+n.id);
      const p=solidArt(n.art,spot.x,spot.y,n.id,span);n.footprint=p.footprint;n.artPosition=spot;
      addLight(m,spot.x+2,spot.y+3,7,n.id==='hamlet'||n.id==='bell'?'#d6b185':c.stone?'#a0bac8':'#9fb79e',false);
    }
    // Paving/root mats are irregular authored decals. Basin centers remain clear.
    for(const n of f.landmarks){
      if(n!==arenaNode)f.decals.push({type:c.stone?'act2_paving':'act2_root_mat',x:n.x,y:n.y,scale:1.3,alpha:.7});
      if(c.rewards.includes(n.id))addProp(m,'chest',n.x+2,n.y+3,{blocks:false,lootable:true,rich:true,landmarkId:n.id});
      if(n.id!=='entry'&&n!==arenaNode&&!n.exit){const p={id:n.id,x:n.x+3,y:n.y-2};f.anchors.events.push(p);}
      for(let j=0;j<10;j++){
        const a=j*Math.PI/5+r()*.25,x=Math.floor(n.x+Math.cos(a)*(n.rx-1))+.5,y=Math.floor(n.y+Math.sin(a)*(n.ry-1))+.5;
        if(!inside(x|0,y|0)||protectedPoint(x,y,1)||routeDistance(x,y)<4)continue;
        const type=j%4===0?'votives':j%3===0?'water_edge':'reed_clump';
        if(type==='water_edge')f.decals.push({type:'act2_water_edge',x,y,alpha:.9,scale:1});
        else addProp(m,type,x,y,{artZone:'act2',blocks:false,landmarkId:n.id});
      }
      for(let j=0;j<3;j++){
        const x=n.x+U.riR(r,-7,7),y=n.y+U.riR(r,-7,7);
        if(!walkable(m,x,y)||protectedPoint(x,y)||routeDistance(x,y)<3.5)continue;
        addProp(m,c.stone?'urn':'barrel',x,y,{blocks:false,breakable:true});
      }
    }
    // Small existing bog hazards occupy optional bank pockets, never bridges or arenas.
    for(const n of f.landmarks)for(let j=0;j<2;j++){
      const x=Math.floor(n.x+(j?-1:1)*(n.rx-4)),y=Math.floor(n.y+n.ry-4);
      for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++)if(walkable(m,x+ox,y+oy)&&!protectedPoint(x+ox+.5,y+oy+.5,1)&&routeDistance(x+ox+.5,y+oy+.5)>4)setHaz(m,x+ox,y+oy,DATA.HAZARD_BY_ID.bog);
    }
    // Exact individual quotas, then mixed groups with bounded specialist pressure.
    const combat=f.landmarks.filter(n=>n.id!=='entry'&&n!==arenaNode),target=c.population+U.riR(r,-5,5),occupied=[];
    const quotas=DATA.ACT2_COMBAT.quotas(zoneId,target-m.monsterSpawns.length),groups=[];
    f.combatRevision=DATA.ACT2_COMBAT.revision;f.quotas=Object.fromEntries(quotas.map(q=>[q.id,q.count]));
    const take=role=>{const pool=quotas.filter(q=>q.count>0&&DATA.ACT2_COMBAT.role(q.id)===role);if(!pool.length)return null;const q=U.pickR(r,pool);q.count--;return q.id;};
    while(quotas.some(q=>q.count)){
      const ids=[];let id=take('specialist');if(id)ids.push(id);
      for(let i=0;i<2;i++){id=take('ranged');if(id)ids.push(id);}
      while(ids.length<5){id=take('melee');if(!id)break;ids.push(id);}groups.push(ids);
    }
    const fits=(x,y,radius)=>{
      for(let yy=Math.floor(y-radius);yy<=Math.floor(y+radius);yy++)for(let xx=Math.floor(x-radius);xx<=Math.floor(x+radius);xx++)if(!walkable(m,xx,yy)||m.hazard[idx(m,xx,yy)])return false;
      return !Object.values(m.spawns).some(s=>Math.hypot(s.x-x,s.y-y)<8+radius)&&
        !f.reserved.some(a=>['arena','threshold'].includes(a.kind)&&x>=a.x0-2-radius&&x<a.x1+2+radius&&y>=a.y0-2-radius&&y<a.y1+2+radius)&&
        !m.props.some(p=>Math.hypot(p.x-x,p.y-y)<radius+.8)&&!occupied.some(p=>Math.hypot(p.x-x,p.y-y)<p.radius+radius+.25);
    };
    for(let group=0;group<groups.length;group++){
      const n=combat[group%combat.length],entry=n.entrances[0]||nodes.entry,angle=Math.atan2(n.y-entry.y,n.x-entry.x),forward={x:Math.cos(angle),y:Math.sin(angle)};
      const ring=Math.floor(group/combat.length),a=ring*2.4+n.x,anchor={x:n.x+Math.cos(a)*5,y:n.y+Math.sin(a)*5};
      const encounter={id:'act2_'+group,landmarkId:n.id,role:'mixed',forward,spawns:[]};
      const ids=groups[group].sort((a,b)=>({specialist:0,ranged:1,melee:2}[DATA.ACT2_COMBAT.role(a)]-({specialist:0,ranged:1,melee:2}[DATA.ACT2_COMBAT.role(b)])));
      for(let j=0;j<ids.length;j++){
        const id=ids[j],role=DATA.ACT2_COMBAT.role(id),elite=j===0&&group===combat.findIndex(n=>c.rewards.includes(n.id)),radius=.34*(DATA.ENEMIES[id].big||1)*(elite?1.18:1),side=role==='ranged'?2:role==='melee'?-2:0;
        const ideal={x:anchor.x+forward.x*side,y:anchor.y+forward.y*side};let point=null;
        // Search the court, with support and full body clearance even for elites.
        const candidates=[];
        for(let y=Math.floor(n.y-n.ry+2);y<n.y+n.ry-2;y++)for(let x=Math.floor(n.x-n.rx+2);x<n.x+n.rx-2;x++){
          const px=x+.5,py=y+.5,depth=(px-anchor.x)*forward.x+(py-anchor.y)*forward.y;
          if(role==='ranged'&&depth<.5||role==='melee'&&depth>-.5)continue;
          if(fits(px,py,radius))candidates.push({x:px,y:py,score:Math.hypot(px-ideal.x,py-ideal.y)+r()*.35});
        }
        candidates.sort((a,b)=>a.score-b.score);point=candidates[0];
        if(!point)throw Error('Act 2 encounter has no supported seat: '+zoneId+'/'+n.id+'/'+id);
        const sp={id,x:point.x,y:point.y,landmarkId:n.id,encounterId:encounter.id,role,elite};
        m.monsterSpawns.push(sp);encounter.spawns.push(sp);occupied.push({...sp,radius});
      }
      f.encounters.push(encounter);
    }
    if(c.herald){const n=nodes[c.herald];m.monsterSpawns.push({id:'choir_herald',x:n.x,y:n.y,landmarkId:n.id});}
    bakeMinimap(m);TerrainSurface.rebuild(m);m.hasElev=false;
    return m;
  }
  /* Act III: composed imperial ruins. All coordinates use the existing map
     bounds; authored rooms reserve their circulation before any solid art. */
  const ACT3 = {
    desert_wastes:{size:164,outdoor:true,dark:.28,packs:40,ground:'sand',decal:'paving',
      nodes:[['entry','The excavation checkpoint',24,83,10,9,'checkpoint','court'],['caravan','The caravan court',43,72,12,10,'colossus','court'],
        ['crossroads','The unearthed crossroads',68,70,12,12,'crane','court'],['market','The buried arcade',62,42,11,10,'market_gate','court'],
        ['tombs','The split pylons',89,43,11,10,'tomb_gate','court'],['palace','The imperial forecourt',119,69,14,12,'palace_gate','court'],
        ['flats','The fractured aqueduct',98,99,12,10,'aqueduct_gate','basin'],['sanctum','The chained mausoleum',63,105,12,10,'mausoleum_gate','court'],
        ['overlook','The colossus overlook',36,108,10,9,'colossus','basin']],
      edges:[['entry','caravan'],['caravan','crossroads'],['crossroads','market'],['market','tombs'],['tombs','palace'],['palace','flats'],['flats','sanctum'],['sanctum','crossroads']],
      branches:[['overlook',['caravan','sanctum']]],rewards:['overlook'],
      gates:[['market','underground_market','from_market'],['tombs','sand_tombs','from_tombs'],['palace','khal_palace','from_palace'],['flats','shard_flats','from_flats'],['sanctum','tomb_sanctum','from_sanctum']]},
    underground_market:{size:128,dark:.42,packs:14,ground:'market',decal:'paving',gate:'market_gate',returnKey:'from_market',
      nodes:[['entry','The merchant descent',25,71,10,9,'market_gate','court'],['bazaar','The buried bazaar',48,67,11,11,'awning','court'],
        ['relay_0','The scales court',45,40,10,9,'stall','court'],['relay_1','The bronze exchange',78,38,11,9,'columns','court'],
        ['relay_2','The caravan arcade',84,73,11,10,'stall','court'],['stores','The sealed storeroom',58,97,10,9,'awning','court']],
      edges:[['entry','bazaar'],['bazaar','relay_0'],['relay_0','relay_1'],['relay_1','relay_2'],['relay_2','bazaar']],branches:[['stores',['bazaar','relay_2']]],rewards:['stores'],
      story:{market_relay_0:'relay_0',market_relay_1:'relay_1',market_relay_2:'relay_2'}},
    sand_tombs:{size:128,dark:.52,packs:39,ground:'tomb',decal:'rubble',gate:'tomb_gate',returnKey:'from_tombs',
      nodes:[['entry','The split pylon descent',25,70,10,9,'tomb_gate','court'],['burial','The burial galleries',47,47,10,11,'sarcophagus','gallery'],
        ['engine','The turning chamber',72,67,13,13,'mechanism','round'],['prison','Ilyan’s prison',91,38,11,10,'sarcophagus','court'],
        ['vault','The sand-filled vault',98,91,10,10,'mechanism','round'],['reliquary','The forgotten reliquary',43,95,10,9,'sarcophagus','gallery']],
      edges:[['entry','burial'],['burial','engine'],['engine','prison'],['prison','vault'],['vault','engine'],['engine','entry']],
      branches:[['reliquary',['entry','vault','burial']]],rewards:['reliquary'],story:{imprisoned_scholar:'prison'}},
    khal_palace:{size:128,dark:.40,packs:13,ground:'palace',decal:'mosaic',gate:'palace_gate',returnKey:'from_palace',boss:'azram',bossNode:'throne',
      nodes:[['entry','The imperial gate',24,73,10,10,'palace_gate','court'],['avenue','The processional avenue',46,72,12,9,'columns','gallery'],
        ['audience','The audience court',66,59,12,12,'colossus','court'],['west','The western gallery',45,36,11,9,'columns','gallery'],
        ['east','The treasury gallery',79,89,11,9,'columns','gallery'],['approach','The gilded threshold',88,58,9,10,'columns','court'],
        ['throne','Azram’s throne',100,28,14,14,'throne','court']],
      edges:[['entry','avenue'],['avenue','audience'],['audience','approach'],['approach','throne'],['avenue','west'],['west','approach'],['audience','east'],['east','approach']],
      branches:[],rewards:['east'],story:{fortress_map:'throne'}},
    shard_flats:{size:128,outdoor:true,dark:.26,packs:22,ground:'sand',decal:'sand_drift',gate:'aqueduct_gate',returnKey:'from_flats',
      nodes:[['entry','The broken aqueduct',24,68,11,10,'aqueduct_gate','basin'],['basin','The exposed shard basin',49,71,13,13,'shards','basin'],
        ['causeway','The imperial causeway',75,47,12,11,'aqueduct','basin'],['quarry','The crystal quarry',97,76,12,13,'shards','basin'],
        ['lowroad','The low sand road',68,98,12,10,'crane','basin'],['overlook','The shard overlook',92,23,10,9,'colossus','basin']],
      edges:[['entry','basin'],['basin','causeway'],['causeway','quarry'],['quarry','lowroad'],['lowroad','basin']],branches:[['overlook',['causeway','quarry']]],rewards:['overlook']},
    tomb_sanctum:{size:128,dark:.50,packs:38,ground:'tomb',decal:'mosaic',gate:'mausoleum_gate',returnKey:'from_sanctum',boss:'chained_sovereign',bossNode:'sovereign',
      nodes:[['entry','The chained descent',25,73,10,9,'mausoleum_gate','court'],['procession','The funerary procession',48,65,12,9,'sarcophagus','gallery'],
        ['ossuary','The circular ossuary',73,68,13,13,'sarcophagus','round'],['vigil','The last vigil',77,40,11,10,'columns','court'],
        ['sovereign','The sovereign’s chamber',101,26,14,14,'mausoleum_gate','round'],['reliquary','The chain reliquary',100,95,10,9,'sarcophagus','gallery']],
      edges:[['entry','procession'],['procession','ossuary'],['ossuary','vigil'],['vigil','sovereign']],branches:[['reliquary',['ossuary','vigil']]],rewards:['reliquary']}
  };
  function genAct3(zoneId,seed) {
    const c=ACT3[zoneId],m=blank(zoneId,c.size,c.size),r=U.rng(seed^U.hash(zoneId)^0x3ab17);
    m.zone={...m.zone,dark:c.dark};m.outdoor=!!c.outdoor;m.surfaceVersion=1;m.ramps=[];m.buildings=[];
    m.walls.fill(1);m.blocked.fill(1);scatterFloor(m,U.rng(seed^13));
    const f=m.composition=m.act3={revision:2,seed,identity:zoneId,terrainWalls:true,landmarks:[],routes:[],reserved:[],
      anchors:{story:{},guards:{},events:[]},decals:[],scenery:[],encounters:[],arenaReserved:true,ground:c.ground};
    const nodes={},inside=(x,y)=>x>1&&y>1&&x<m.w-2&&y<m.h-2;
    const open=(x,y,path=false)=>{if(!inside(x,y))return;setWall(m,x,y,0);if(path)m.floor[idx(m,x,y)]=4;};
    for(const [id,label,x,y,rx,ry,art,shape] of c.nodes){
      const n={id,label,x:x+(id==='entry'?0:U.riR(r,-2,2))+.5,y:y+(id==='entry'?0:U.riR(r,-2,2))+.5,rx,ry,art,shape};nodes[id]=n;f.landmarks.push(n);
      n.combatSpace={x0:n.x-3,y0:n.y-3,x1:n.x+3,y1:n.y+3};
      for(let yy=Math.floor(n.y-ry);yy<=n.y+ry;yy++)for(let xx=Math.floor(n.x-rx);xx<=n.x+rx;xx++){
        const dx=Math.abs(xx+.5-n.x)/rx,dy=Math.abs(yy+.5-n.y)/ry;
        const valid=shape==='round'?dx*dx+dy*dy<1:shape==='basin'?dx*dx+dy*dy<1+.07*Math.sin(xx*.7+yy*.3):Math.max(dx,dy)<1&&dx+dy<1.7;
        if(valid)open(xx,yy,shape==='gallery');
      }
    }
    function connect(from,to,optional=false){
      const a=nodes[from],b=nodes[to],horizontal=r()<.5;
      let bend=Math.round((horizontal?a.x+b.x:a.y+b.y)/2)+U.riR(r,-3,3)+.5;
      const crossingBand=zoneId==='shard_flats'&&!horizontal?58:zoneId==='tomb_sanctum'&&horizontal?60:null;
      // A route must finish its ramp before turning across the upper landing.
      if(crossingBand!==null&&Math.abs(bend-crossingBand)<6)bend=crossingBand+(bend<crossingBand?-6:6)+.5;
      const points=horizontal?[a,{x:bend,y:a.y},{x:bend,y:b.y},b]:[a,{x:a.x,y:bend},{x:b.x,y:bend},b];
      f.routes.push({from,to,optional,width:5,points:points.map(p=>({x:p.x,y:p.y}))});
      for(let k=1;k<points.length;k++){
        const a=points[k-1],b=points[k],steps=Math.max(Math.abs(b.x-a.x),Math.abs(b.y-a.y));
        for(let t=0;t<=steps;t++){const x=Math.floor(U.lerp(a.x,b.x,t/(steps||1))),y=Math.floor(U.lerp(a.y,b.y,t/(steps||1)));
          for(let oy=-3;oy<=3;oy++)for(let ox=-3;ox<=3;ox++)if(ox*ox+oy*oy<=12)open(x+ox,y+oy,Math.abs(ox)<=2&&Math.abs(oy)<=2);
        }
      }
    }
    for(const [a,b] of c.edges)connect(a,b);
    for(const [id,choices] of c.branches){const shuffled=choices.slice();const first=U.riR(r,0,shuffled.length-1),second=(first+1)%shuffled.length;connect(shuffled[first],id,true);connect(id,shuffled[second],true);}
    const entry=nodes.entry;
    if(zoneId==='desert_wastes'){
      for(let x=0;x<entry.x;x++)for(let y=Math.floor(entry.y)-2;y<=entry.y+2;y++){setWall(m,x,y,0);m.floor[idx(m,x,y)]=4;}
      m.exits.push({x0:0,y0:entry.y-2.5,x1:1.5,y1:entry.y+2.5,target:'khalcamp',spawnKey:'from_wild',label:'The Dig Camp'});
      m.spawns.from_camp={x:entry.x,y:entry.y+3};
    }else m.spawns.from_wild={x:entry.x,y:entry.y+3};
    m.spawns.default={...(m.spawns.from_camp||m.spawns.from_wild)};m.spawns.portal={x:entry.x+2,y:entry.y+3};
    const shrine=zoneId==='desert_wastes'?nodes.crossroads:entry;
    addProp(m,'shrine',shrine.x+5,shrine.y+4,{blocks:false,interact:'shrine',label:'Travel Shrine'});
    m.shrine={x:shrine.x+5,y:shrine.y+5.5};m.spawns.shrine={...m.shrine};addLight(m,shrine.x+5,shrine.y+4,4,'#a9d4ca',false);
    // Elevation uses the same connected surface as walking, picking and shadows.
    const band=zoneId==='shard_flats'?{axis:'y',at:58,side:-1}:zoneId==='tomb_sanctum'?{axis:'x',at:60,side:-1}:null;
    const height=(x,y)=>band&&((band.axis==='x'?x:y)-band.at)*band.side>=0?2:0;
    for(let y=0;y<m.h;y++)for(let x=0;x<m.w;x++)m.elev[idx(m,x,y)]=height(x,y)+(m.walls[idx(m,x,y)]?(c.outdoor?2:4):0);
    if(band)for(const ro of f.routes)for(let k=1;k<ro.points.length;k++){
      const a=ro.points[k-1],b=ro.points[k],axis=band.axis,other=axis==='x'?'y':'x';
      if(a[axis]===b[axis]||Math.min(a[axis],b[axis])>band.at||Math.max(a[axis],b[axis])<band.at)continue;
      const cross=Math.floor(a[other]),start=band.side>0?band.at-2:band.at+1;
      const ramp={x:axis==='x'?start:cross,y:axis==='y'?start:cross,dx:axis==='x'?band.side:0,dy:axis==='y'?band.side:0,width:5,length:4,low:0,high:2};
      if(m.ramps.some(a=>a.x===ramp.x&&a.y===ramp.y))continue;
      for(let t=-1;t<=4;t++)for(let w=-2;w<=2;w++){const x=ramp.x+ramp.dx*t+(ramp.dy?w:0),y=ramp.y+ramp.dy*t+(ramp.dx?w:0);open(x,y,true);m.elev[idx(m,x,y)]=t===-1?0:t===4?2:height(x,y);}
      m.ramps.push(ramp);
    }
    if(band){
      // Join neighboring crossings into one wider landing instead of dropping
      // a route's outer lanes or giving a surface tile two ramp owners.
      const perpendicular=band.axis==='x'?'y':'x',merged=[];
      for(const ramp of m.ramps.sort((a,b)=>a[perpendicular]-b[perpendicular])){
        const last=merged.at(-1),lo=ramp[perpendicular]-2,hi=ramp[perpendicular]+2;
        if(last&&lo<=last[perpendicular]+(last.width-1)/2+1){
          const start=last[perpendicular]-(last.width-1)/2,end=Math.max(hi,last[perpendicular]+(last.width-1)/2),center=Math.floor((start+end)/2);
          last[perpendicular]=center;last.width=2*Math.max(center-start,end-center)+1;
        }else merged.push({...ramp});
      }
      m.ramps=merged;
      for(const ramp of merged)for(let t=-1;t<=4;t++)for(let w=-(ramp.width-1)/2;w<=(ramp.width-1)/2;w++){
        const x=ramp.x+ramp.dx*t+(ramp.dy?w:0),y=ramp.y+ramp.dy*t+(ramp.dx?w:0);open(x,y,true);m.elev[idx(m,x,y)]=t===-1?0:t===4?2:height(x,y);
      }
    }
    if(c.boss){const n=nodes[c.bossNode],a={bossId:c.boss,x0:Math.floor(n.x)-10,y0:Math.floor(n.y)-10,x1:Math.floor(n.x)+11,y1:Math.floor(n.y)+11,cx:n.x,cy:n.y,approach:{x:n.x,y:n.y+12}};
      for(let y=a.y0;y<a.y1;y++)for(let x=a.x0;x<a.x1;x++){open(x,y);m.elev[idx(m,x,y)]=m.hazard[idx(m,x,y)]=0;}
      m.bossArena=a;f.reserved.push({...a,kind:'boss'});m.monsterSpawns.push({id:c.boss,x:n.x,y:n.y,boss:true});
    }
    const story=f.anchors.story;
    for(const [id,node] of Object.entries(c.story||{})){const n=nodes[node];story[id]={x:n.x,y:n.y+(id==='fortress_map'?-7:0),landmarkId:node};}
    for(const obj of DATA.STORY_OBJECTS[zoneId]||[])if(obj.guards?.length){const a=story[obj.id];f.anchors.guards[obj.id]=obj.guards.map((id,j)=>({id,x:a.x+(j%2?2:-2),y:a.y+1,storyId:obj.id}));}
    const distanceToRoutes=(x,y)=>Math.min(...f.routes.flatMap(ro=>ro.points.slice(1).map((b,i)=>{const a=ro.points[i],dx=b.x-a.x,dy=b.y-a.y,t=U.clamp(((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy||1),0,1);return Math.hypot(x-a.x-dx*t,y-a.y-dy*t);} )));
    const protectedPoint=(x,y,pad=0)=>Object.values(m.spawns).some(p=>U.dist(x,y,p.x,p.y)<3+pad)||Object.values(story).some(p=>U.dist(x,y,p.x,p.y)<4+pad)||
      f.reserved.some(a=>x>=a.x0-pad&&x<a.x1+pad&&y>=a.y0-pad&&y<a.y1+pad)||m.ramps.some(a=>U.dist(x,y,a.x+a.dx*2,a.y+a.dy*2)<6+pad);
    function building(type,x,y,footprints,landmarkId){
      for(const a of footprints)for(let yy=a.y0;yy<a.y1;yy++)for(let xx=a.x0;xx<a.x1;xx++){setWall(m,xx,yy,0);block(m,xx,yy);m.elev[idx(m,xx,yy)]=height(x,y);}
      const p=addProp(m,type,x,y,{blocks:false,artZone:'act3',building:true,footprints,landmarkId});m.buildings.push(p);
      for(const footprint of footprints)f.reserved.push({...footprint,kind:'architecture',landmarkId});return p;
    }
    function gate(n,type,target,key){
      const candidates=[{x:n.x,y:n.y-5},...Array.from({length:169},(_,i)=>({x:n.x+(i%13-6)*2,y:n.y+(Math.floor(i/13)-6)*2})).sort((a,b)=>U.dist2(a.x,a.y,n.x,n.y-5)-U.dist2(b.x,b.y,n.x,n.y-5))];
      let placement;
      for(const p of candidates){
        if(!inside(p.x,p.y)||m.walls[idx(m,p.x|0,p.y|0)]||distanceToRoutes(p.x,p.y)<2.5||protectedPoint(p.x,p.y)||height(p.x,p.y)!==height(n.x,n.y))continue;
        const x=Math.floor(p.x),y=Math.floor(p.y),footprints=[{x0:x-4,y0:y+2,x1:x-2,y1:y+4},{x0:x+2,y0:y-4,x1:x+4,y1:y-2}];
        if(footprints.some(a=>{for(let yy=a.y0;yy<a.y1;yy++)for(let xx=a.x0;xx<a.x1;xx++)if(!inside(xx,yy)||distanceToRoutes(xx+.5,yy+.5)<3.3||protectedPoint(xx+.5,yy+.5)||height(xx,yy)!==height(p.x,p.y))return true;return false;}))continue;
        placement={...p,footprints};break;
      }
      if(!placement)throw Error('Act III entrance conflicts with reserved routes: '+zoneId+'/'+n.id);
      const {x,y,footprints}=placement;
      for(let yy=(y|0)-2;yy<=(y|0)+2;yy++)for(let xx=(x|0)-2;xx<=(x|0)+2;xx++){open(xx,yy,true);m.elev[idx(m,xx,yy)]=height(x,y);}
      f.reserved.push({x0:x-1.5,y0:y-1.5,x1:x+1.5,y1:y+1.5,kind:'threshold',landmarkId:n.id});
      // Separate piers keep the open throat traversable, never a solid billboard.
      building(type,x,y,footprints,n.id);n.entrance={x,y,target};
      if(target){m.exits.push({x0:x-1.3,y0:y-1,x1:x+1.3,y1:y+1.3,target,spawnKey:key,label:DATA.ZONES[target].name});}
      addLight(m,x,y,5,'#d6b576',false);
    }
    if(zoneId==='desert_wastes')gate(entry,'checkpoint',null,null);else gate(entry,c.gate,'desert_wastes',c.returnKey);
    for(const [id,target,key] of c.gates||[]){const n=nodes[id];gate(n,n.art,target,'from_wild');m.spawns[key]={x:n.x,y:n.y-.5};}
    for(const n of f.landmarks){
      if(n.id==='entry'||n.entrance)continue;
      let pos=null;const span=n.art==='throne'?6:n.art==='colossus'?5:4;
      for(const [dx,dy] of [[-3,-9],[5,-9],[-9,0],[9,0],[0,10],[-10,-8],[10,-10],[0,-15],...Array.from({length:48},(_,i)=>{const radius=12+Math.floor(i/16)*4,angle=-Math.PI/2+(i%16)*Math.PI/8;return [Math.round(Math.cos(angle)*radius),Math.round(Math.sin(angle)*radius)];})]){
        const x=Math.floor(n.x+dx)+.5,y=Math.floor(n.y+dy)+.5,a={x0:Math.floor(x)-span/2|0,y0:Math.floor(y)-span/2|0,x1:(Math.floor(x)-span/2|0)+span,y1:(Math.floor(y)-span/2|0)+span};
        let safe=true;for(let yy=a.y0;yy<a.y1;yy++)for(let xx=a.x0;xx<a.x1;xx++)if(!inside(xx,yy)||protectedPoint(xx+.5,yy+.5)||distanceToRoutes(xx+.5,yy+.5)<3.3||height(xx,yy)!==height(x,y))safe=false;
        if(safe){pos={x,y,a};break;}
      }
      if(!pos)throw Error('Act III architecture has no footprint: '+zoneId+'/'+n.id);
      building(n.art,pos.x,pos.y,[pos.a],n.id);n.artPosition={x:pos.x,y:pos.y};addLight(m,pos.x,pos.y,5,'#d0aa74',false);
    }
    if(c.outdoor)for(const n of f.landmarks)for(const [dx,dy] of [[-14,-13],[14,-12]]){
      const x=Math.floor(n.x+dx)+.5,y=Math.floor(n.y+dy)+.5,a={x0:(x|0)-3,y0:(y|0)-3,x1:(x|0)+4,y1:(y|0)+4};
      let solid=true;for(let yy=a.y0;yy<a.y1;yy++)for(let xx=a.x0;xx<a.x1;xx++)if(!inside(xx,yy)||!m.walls[idx(m,xx,yy)]||protectedPoint(xx+.5,yy+.5))solid=false;
      if(solid){f.scenery.push({x,y,variant:U.riR(r,0,5),scale:1.5,footprint:a});f.reserved.push({...a,kind:'scenery'});}
    }
    // Market courts have actual shop clusters along their edges, leaving
    // five-wide streets and the central relay combat spaces unobstructed.
    if(zoneId==='underground_market')for(const n of f.landmarks.filter(n=>n.id!=='entry'))for(const [dx,dy] of [[-8,-7],[8,6],[-7,8]]){
      const x=n.x+dx,y=n.y+dy,a={x0:(x|0)-1,y0:(y|0)-1,x1:(x|0)+2,y1:(y|0)+2};
      let valid=true;for(let yy=a.y0;yy<a.y1;yy++)for(let xx=a.x0;xx<a.x1;xx++)if(!inside(xx,yy)||protectedPoint(xx+.5,yy+.5)||distanceToRoutes(xx+.5,yy+.5)<3.3)valid=false;
      if(valid)building(dx>0?'awning':'stall',x,y,[a],n.id);
    }
    TerrainSurface.rebuild(m);
    const safe=(x,y)=>TerrainSurface.supported(m,x,y,.4)&&!protectedPoint(x,y)&&!m.props.some(p=>U.dist(x,y,p.x,p.y)<1.5);
    if(zoneId==='shard_flats')for(const n of [nodes.basin,nodes.lowroad])for(let y=Math.floor(n.y)-6;y<n.y+7;y++)for(let x=Math.floor(n.x)-9;x<n.x+10;x++){
      if(safe(x+.5,y+.5)&&distanceToRoutes(x+.5,y+.5)>4&&U.dist(x+.5,y+.5,n.x+6,n.y+3)<4)setHaz(m,x,y,DATA.HAZARD_BY_ID.quicksand);
    }
    for(const id of c.rewards){const n=nodes[id];addProp(m,'chest',n.x+1,n.y+1,{blocks:false,lootable:true,rich:true,landmarkId:id});}
    for(const n of f.landmarks){
      n.elevation=height(n.x,n.y);f.decals.push({type:'act3_'+c.decal,x:n.x,y:n.y,scale:1.6,alpha:.9});
      if(n.id!=='entry'&&n.id!==c.bossNode&&!Object.values(story).some(p=>p.landmarkId===n.id)){
        const p={id:n.id,x:n.x-2,y:n.y+3};if(safe(p.x,p.y))f.anchors.events.push(p);
      }
      for(let k=0;k<6;k++){const angle=r()*Math.PI*2,x=Math.floor(n.x+Math.cos(angle)*(n.rx-2))+.5,y=Math.floor(n.y+Math.sin(angle)*(n.ry-2))+.5;
        if(!safe(x,y)||distanceToRoutes(x,y)<3.3)continue;
        addProp(m,k%2?'urn':'crate',x,y,{blocks:false,breakable:true,seed:U.riR(r,1,9999)});
        f.decals.push({type:'act3_'+(k%2?'sand_drift':'rubble'),x,y,scale:.8,alpha:.85});
      }
    }
    for(const ro of f.routes)for(let k=1;k<ro.points.length;k++){
      const a=ro.points[k-1],b=ro.points[k],len=U.dist(a.x,a.y,b.x,b.y);
      for(let d=5;d<len;d+=9)f.decals.push({type:'act3_'+(zoneId==='desert_wastes'&&ro.from==='entry'?'tracks':c.decal==='mosaic'?'paving':c.decal),x:U.lerp(a.x,b.x,d/len),y:U.lerp(a.y,b.y,d/len),scale:1,alpha:.7,turn:a.x===b.x});
    }
    const combat=f.landmarks.filter(n=>n.id!=='entry'&&n.id!==c.bossNode),defs=Object.fromEntries(m.zone.spawns.map(id=>[id,DATA.resolveEnemy(id,zoneId)]));
    const pools=role=>m.zone.spawns.filter(id=>defs[id].act3Combat?.role===role);
    const roles=['defender','ranged','flanker','heavy'].filter(role=>pools(role).length);
    for(let k=0;k<c.packs;k++){
      const n=combat[k%combat.length],elite=c.rewards.includes(n.id)&&k<combat.length;
      const round=Math.floor(k/combat.length);
      const preferred=pools('heavy').length&&(elite||/engine|relay|quarry/.test(n.id))&&round%3===0?'heavy':roles[(round+k%combat.length)%roles.length];
      const pool=pools(preferred),type=U.pickR(r,pool.length?pool:m.zone.spawns),def=defs[type],role=def.act3Combat?.role||'melee';
      const count=def.pack?U.riR(r,def.pack[0],def.pack[1]):U.riR(r,2,4),group={landmarkId:n.id,role,elite,spawns:[]};
      const incoming=f.routes.find(ro=>ro.to===n.id),previous=f.landmarks.find(p=>p.id===incoming?.from)||f.landmarks[0];
      const angle=Math.atan2(n.y-previous.y,n.x-previous.x),forward=role==='ranged'?3.5:role==='defender'?-2:0,side=role==='flanker'?(k%2?3.5:-3.5):0;
      const center={x:n.x+Math.cos(angle)*forward-Math.sin(angle)*side,y:n.y+Math.sin(angle)*forward+Math.cos(angle)*side};
      for(let i=0;i<count;i++){
        const radius=.34*(def.big||1)*(elite&&i===0?1.18:1);
        let p=null;for(let attempt=0;attempt<120&&!p;attempt++){const base=attempt<40?center:n,spread=attempt<40?3:6,x=Math.floor(base.x+U.riR(r,-spread,spread))+.5,y=Math.floor(base.y+U.riR(r,-spread,spread))+.5;
          if(safe(x,y)&&TerrainSurface.supported(m,x,y,radius)&&!m.hazard[idx(m,x|0,y|0)]&&U.los((xx,yy)=>walkable(m,xx,yy),x,y,n.x,n.y)&&
            m.monsterSpawns.every(o=>U.dist(x,y,o.x,o.y)>=radius+.34*(DATA.ENEMIES[o.id].big||1)*(o.elite?1.18:1)+.15))p={x,y};
        }
        if(!p)throw Error('Act III encounter placement failed: '+zoneId+'/'+n.id);
        const spawn={id:type,...p,elite:elite&&i===0,minion:elite&&i>0,landmarkId:n.id};m.monsterSpawns.push(spawn);group.spawns.push(spawn);
      }f.encounters.push(group);
    }
    bakeMinimap(m);TerrainSurface.rebuild(m);m.hasElev=m.elev.some(v=>v>0);return m;
  }
  function dressAct3Camp(m){
    const e=m.exits.find(e=>e.target==='desert_wastes'),x=(e.x0+e.x1)/2-3,y=(e.y0+e.y1)/2;
    m.composition=m.act3={revision:1,identity:m.id,landmarks:[{id:'checkpoint',label:'The excavation departure',x,y,art:'checkpoint'}],routes:[],reserved:[],anchors:{story:{},events:[]},decals:[]};
    // Town services and its existing street/collision geometry stay authoritative.
    const footprints=[{x0:30,y0:23,x1:32,y1:25},{x0:34,y0:17,x1:36,y1:19}];
    const checkpoint=addProp(m,'checkpoint',33,21,{blocks:false,artZone:'act3',building:true,footprints,landmarkId:'checkpoint'});
    for(const footprint of footprints)m.buildings.push({...checkpoint,footprints:undefined,footprint});
    for(const a of footprints)for(let yy=a.y0;yy<a.y1;yy++)for(let xx=a.x0;xx<a.x1;xx++)block(m,xx,yy);
    const tower=m.buildings.find(p=>p.type==='tower'&&p.y<20);
    if(tower){tower.type='crane';tower.artZone='act3';}
    m.act3.decals.push({type:'act3_paving',x:31,y:21,scale:1.2,alpha:.9},{type:'act3_tracks',x:34,y:21,scale:.7,alpha:.8});
    bakeMinimap(m);
    return m;
  }
  /* Act V: reserve the journey before dressing the battlefield. */
  const CINDERS = {
    ash_wastes:{size:164,outdoor:true,dark:.46,budget:96,band:65,
      nodes:[['entry','The Breach arrival',22,27,12,11,null],['siege','The broken siege line',48,35,15,12,'siege_engine'],
        ['crossing','The river of ash',70,52,13,12,'siege_tower'],['crossroads','The battlefield crossroads',91,79,15,13,'fallen_statue'],
        ['monument','The impaled court',117,104,15,14,'impaled_monument'],['forecourt','The Crown Gate',137,135,16,14,null],
        ['bastion','The Bastion gatehouse',124,48,14,13,null]],
      edges:[['entry','siege'],['siege','crossing'],['crossing','crossroads'],['crossroads','monument'],['monument','forecourt'],['crossroads','bastion']],
      gates:[['entry','breach_gate','hellgate','from_wild','from_camp','The Breach'],
        ['forecourt','throne_gate','throne','from_wild','from_throne','The Throne of Cinders'],
        ['bastion','bastion_gate','cinder_bastion','from_wild','from_bastion','The Cinder Bastion']]},
    cinder_bastion:{size:128,dark:.53,budget:120,band:58,
      nodes:[['entry','The broken gatehouse',23,29,12,11,null],['muster','The mustering court',54,25,15,12,'siege_tower'],
        ['furnace','The furnace gallery',91,33,15,12,'furnace_forge'],['battlement','The broken battlement',100,73,13,13,'siege_engine'],
        ['command','The fallen command court',78,100,16,13,'fallen_statue'],['treasury','The guarded treasury',40,86,13,13,'impaled_monument']],
      edges:[['entry','muster'],['muster','furnace'],['furnace','battlement'],['battlement','command'],['command','treasury'],['treasury','entry']],
      gates:[['entry','bastion_return','ash_wastes','from_bastion','from_wild','The Cinderfields']]},
    throne:{size:128,dark:.52,budget:36,
      nodes:[['entry','The Crown vestibule',22,23,12,11,null],['kings','The fallen kings gallery',47,40,14,12,'fallen_statue'],
        ['guard','The divided guard court',79,53,16,13,'impaled_monument'],['causeway','The ceremonial causeway',89,80,11,10,null],
        ['boss','The last throne',94,106,15,15,null]],
      edges:[['entry','kings'],['kings','guard'],['guard','causeway'],['causeway','boss']],
      gates:[['entry','throne_return','ash_wastes','from_throne','from_wild','The Cinderfields']]}
  };
  function genCinders(zoneId,seed) {
    const c=CINDERS[zoneId],m=blank(zoneId,c.size,c.size),r=U.rng(seed^U.hash(zoneId)^0xc1ade5);
    m.zone={...m.zone,dark:c.dark};m.outdoor=!!c.outdoor;m.surfaceVersion=1;m.ramps=[];m.buildings=[];
    m.walls.fill(1);m.blocked.fill(1);scatterFloor(m,U.rng(seed^13));
    const f=m.composition={revision:1,identity:'fallen-demon-kingdoms',seed,terrainWalls:true,
      landmarks:[],routes:[],reserved:[],decals:[],encounters:[],anchors:{events:[]},scenery:[],arenaReserved:false};
    const nodes={},inside=(x,y)=>x>=1&&y>=1&&x<m.w-1&&y<m.h-1;
    const open=(x,y,path=false)=>{if(!inside(x,y))return;setWall(m,x,y,0);if(path)m.floor[idx(m,x,y)]=4;};
    const baseAt=(x,y)=>c.band&&y>=c.band?2:0;
    for(const [id,label,x,y,rx,ry,art] of c.nodes){
      const n={id,label,x:x+(id==='entry'||id==='boss'?0:U.riR(r,-2,2))+.5,
        y:y+(id==='entry'||id==='boss'?0:U.riR(r,-2,2))+.5,rx,ry,art,entrances:[]};
      n.combatSpace={x0:n.x-4,y0:n.y-4,x1:n.x+4,y1:n.y+4};nodes[id]=n;f.landmarks.push(n);
      for(let yy=n.y-ry-1|0;yy<=n.y+ry+1;yy++)for(let xx=n.x-rx-1|0;xx<=n.x+rx+1;xx++){
        const dx=(xx+.5-n.x)/rx,dy=(yy+.5-n.y)/ry;
        if((c.outdoor?dx*dx+dy*dy:Math.max(Math.abs(dx),Math.abs(dy)))<=1+(c.outdoor?.05*Math.sin(xx*.5+yy*.3):0))open(xx,yy);
      }
    }
    for(const [from,to] of c.edges){
      const a=nodes[from],b=nodes[to],horizontal=Math.abs(b.x-a.x)>Math.abs(b.y-a.y);
      let bend=Math.round((horizontal?a.x+b.x:a.y+b.y)/2)+U.riR(r,-3,3)+.5;
      // A corner needs a full five-lane landing beyond the ramp's side faces.
      if(!horizontal&&c.band&&Math.abs(bend-c.band)<8)bend=c.band+(bend<c.band?-8:8)+.5;
      const points=horizontal?[a,{x:bend,y:a.y},{x:bend,y:b.y},b]:[a,{x:a.x,y:bend},{x:b.x,y:bend},b];
      f.routes.push({from,to,width:7,optional:to==='bastion'||from==='treasury',points:points.map(p=>({x:p.x,y:p.y}))});
      for(let k=1;k<points.length;k++){
        const p=points[k-1],q=points[k],steps=Math.max(Math.abs(p.x-q.x),Math.abs(p.y-q.y));
        for(let t=0;t<=steps;t++){
          const x=Math.round(U.lerp(p.x,q.x,t/(steps||1))-.5),y=Math.round(U.lerp(p.y,q.y,t/(steps||1))-.5);
          for(let oy=-4;oy<=4;oy++)for(let ox=-4;ox<=4;ox++)if(ox*ox+oy*oy<=20)open(x+ox,y+oy,ox*ox+oy*oy<=6.25);
        }
      }
      for(const [n,ps,target] of [[a,points,to],[b,points.slice().reverse(),from]]){
        const p=ps.find(p=>p.x!==n.x||p.y!==n.y),dx=p.x-n.x,dy=p.y-n.y;
        const t=Math.min(1,1/Math.sqrt((dx/(n.rx-2))**2+(dy/(n.ry-2))**2));
        n.entrances.push({to:target,x:n.x+dx*t,y:n.y+dy*t,width:7});
      }
    }
    const routeDistance=(x,y)=>Math.min(...f.routes.flatMap(ro=>ro.points.slice(1).map((b,i)=>{
      const a=ro.points[i],dx=b.x-a.x,dy=b.y-a.y,t=U.clamp(((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy||1),0,1);
      return Math.hypot(x-a.x-dx*t,y-a.y-dy*t);
    })));
    if(nodes.boss){
      const n=nodes.boss,a=m.bossArena={bossId:'vethriss',x0:n.x-10.5,y0:n.y-10.5,x1:n.x+10.5,y1:n.y+10.5,cx:n.x,cy:n.y,
        approach:{x:n.x,y:n.y-12}};
      for(let y=a.y0;y<a.y1;y++)for(let x=a.x0;x<a.x1;x++)open(x,y);
      f.reserved.push({...a,kind:'boss'});f.arenaReserved=true;
      m.monsterSpawns.push({id:'vethriss',x:n.x,y:n.y,boss:true});
    }
    for(let y=0;y<m.h;y++)for(let x=0;x<m.w;x++)m.elev[idx(m,x,y)]=baseAt(x,y)+(m.walls[idx(m,x,y)]?(c.outdoor?2:4):0);
    if(c.band)for(const ro of f.routes)for(let k=1;k<ro.points.length;k++){
      const a=ro.points[k-1],b=ro.points[k];if(a.y===b.y||Math.min(a.y,b.y)>c.band||Math.max(a.y,b.y)<c.band)continue;
      const ramp={x:a.x|0,y:c.band-2,dx:0,dy:1,width:7,length:4,low:0,high:2};
      if(m.ramps.some(p=>Math.abs(p.x-ramp.x)<8))continue;
      for(let t=-1;t<=4;t++)for(let w=-3;w<=3;w++){
        const x=ramp.x+w,y=ramp.y+t;open(x,y,true);m.elev[idx(m,x,y)]=t===-1?0:t===4?2:baseAt(x,y);
      }m.ramps.push(ramp);
    }
    const reserve=(x,y,radius,kind)=>f.reserved.push({x0:x-radius,y0:y-radius,x1:x+radius,y1:y+radius,kind});
    const protectedPoint=(x,y,pad=0)=>f.reserved.some(a=>x>=a.x0-pad&&x<a.x1+pad&&y>=a.y0-pad&&y<a.y1+pad)||
      m.ramps.some(a=>Math.abs(x-a.x)<5+pad&&y>a.y-2-pad&&y<a.y+6+pad);
    // Separate jamb footprints keep the visible opening and travel trigger clear.
    for(const [id,art,target,spawnKey,returnKey,label] of c.gates){
      const n=nodes[id];
      const offset=[[-7,-7],[7,-7],[-7,7],[7,7]].find(([dx,dy])=>[-1,1].every(side=>{
        const px=n.x+dx+side*3,py=n.y+dy-side*3;
        for(let yy=py-1.5;yy<py+.5;yy++)for(let xx=px-1.5;xx<px+.5;xx++)
          if(!inside(xx,yy)||routeDistance(xx+.5,yy+.5)<3.5)return false;
        return true;
      }));
      if(!offset)throw Error('No safe cinder doorway: '+zoneId+'/'+id);
      const x=n.x+offset[0],y=n.y+offset[1];
      for(let yy=y-5|0;yy<=y+5;yy++)for(let xx=x-5|0;xx<=x+5;xx++){open(xx,yy);m.elev[idx(m,xx,yy)]=baseAt(x,y);}
      const pr=addProp(m,art,x,y,{artZone:'cinders',blocks:false,building:true,landmarkId:id,label,gate:true});pr.footprints=[];
      for(const side of [-1,1]){
        const px=x+side*3,py=y-side*3,fp={x0:px-1.5,y0:py-1.5,x1:px+.5,y1:py+.5};
        for(let yy=fp.y0;yy<fp.y1;yy++)for(let xx=fp.x0;xx<fp.x1;xx++)block(m,xx,yy);
        pr.footprints.push(fp);m.buildings.push({type:art,x:px,y:py,footprint:fp,gate:true});
      }
      m.exits.push({x0:x-1.2,y0:y-1.2,x1:x+1.2,y1:y+1.2,target,spawnKey,label});
      m.spawns[returnKey]={x:x+3,y:y+3};n.exit={x,y,target};
      reserve(x,y,6,'gate');reserve(x+3,y+3,3,'arrival');addLight(m,x+1,y+1,6,'#ff9c50');
    }
    const entry=nodes.entry;m.spawns.default={...(m.spawns.from_camp||m.spawns.from_wild)};
    m.spawns.portal={x:entry.x+1,y:entry.y+2};reserve(m.spawns.portal.x,m.spawns.portal.y,3,'arrival');
    const shrine={x:entry.x+4,y:entry.y+3};
    addProp(m,'shrine',shrine.x,shrine.y,{blocks:false,interact:'shrine',label:'Travel Shrine'});
    m.shrine={x:shrine.x,y:shrine.y+1.5};m.spawns.shrine={...m.shrine};reserve(shrine.x,shrine.y,3,'shrine');
    addLight(m,shrine.x,shrine.y,5,'#adc3cf',false);
    function architecture(n,art=n.art,forced=null,optional=false){
      if(!art)return;let pos=forced;const span=art==='throne_backdrop'?6:4;
      for(const [dx,dy] of [[-8,-8],[9,-8],[-9,7],[8,8],[-11,-6],[6,-11]]){
        if(pos)break;const x=n.x+dx,y=n.y+dy,rad=span/2;
        if(!inside(x-rad,y-rad)||!inside(x+rad,y+rad))continue;
        let safe=true;for(let yy=y-rad|0;yy<y+rad;yy++)for(let xx=x-rad|0;xx<x+rad;xx++)
          if(protectedPoint(xx+.5,yy+.5,1)||routeDistance(xx+.5,yy+.5)<3.8||baseAt(xx,yy)!==baseAt(x,y)||
            Math.abs(xx+.5-n.x)<5&&Math.abs(yy+.5-n.y)<5)safe=false;
        if(safe)pos={x,y};
      }
      if(!pos){if(optional)return;throw Error('No safe cinder landmark: '+zoneId+'/'+n.id);}
      const {x,y}=pos,fp={x0:Math.floor(x-span/2),y0:Math.floor(y-span/2),x1:Math.floor(x-span/2)+span,y1:Math.floor(y-span/2)+span};
      for(let yy=fp.y0;yy<fp.y1;yy++)for(let xx=fp.x0;xx<fp.x1;xx++){open(xx,yy);block(m,xx,yy);m.elev[idx(m,xx,yy)]=baseAt(x,y);}
      const pr=addProp(m,art,x,y,{artZone:'cinders',blocks:true,building:true,footprint:fp,landmarkId:n.id});
      m.buildings.push(pr);f.reserved.push({...fp,kind:'architecture'});n.art=art;n.artPosition={x,y};addLight(m,x+1,y+2,6,'#ff9c50');
    }
    for(const n of f.landmarks)architecture(n);
    for(const n of f.landmarks){
      const secondary={siege:'siege_tower',crossing:'siege_engine',muster:'siege_tower',furnace:'furnace_forge',command:'fallen_statue',kings:'fallen_statue',guard:'fallen_statue'}[n.id];
      if(secondary)architecture({...n},secondary,null,true);
    }
    if(nodes.boss)architecture(nodes.boss,'throne_backdrop',{x:nodes.boss.x+7,y:nodes.boss.y-14});
    if(c.outdoor)for(const n of f.landmarks)for(const [dx,dy] of [[-16,-14],[16,-18]]){
      const x=n.x+dx,y=n.y+dy,footprint={x0:Math.floor(x)-3,y0:Math.floor(y)-3,x1:Math.floor(x)+4,y1:Math.floor(y)+4};
      let solid=true;for(let yy=footprint.y0;yy<footprint.y1;yy++)for(let xx=footprint.x0;xx<footprint.x1;xx++)
        if(!inside(xx,yy)||!m.walls[idx(m,xx,yy)])solid=false;
      if(solid)f.scenery.push({x,y,variant:U.riR(r,0,5),scale:1.5,footprint});
    }
    for(const n of f.landmarks){
      n.elevation=baseAt(n.x,n.y);
      if(n.id!=='boss')f.decals.push({type:'cinders_'+(c.outdoor?'ash_drifts':'ceremonial_paving'),x:n.x,y:n.y,scale:c.outdoor?2:1.4,alpha:c.outdoor?.8:.85});
      if(n.id!=='boss')for(let k=0;k<3;k++)f.decals.push({type:'cinders_chain_rubble',x:n.x+U.riR(r,-9,9),y:n.y+U.riR(r,-8,8),scale:.8,alpha:.72});
      // Lava is beside the fighting floor, never across the mandatory lanes.
      if(n.id!=='entry'&&n.id!=='boss'&&(c.outdoor||n.id==='furnace')){
        for(const side of [-1,1])for(let yy=n.y-9|0;yy<=n.y+9;yy++)for(let xx=n.x-12|0;xx<=n.x+12;xx++){
          const d=Math.hypot((xx+.5-n.x-side*9)/2,(yy+.5-n.y)/6);
          if(d<1&&!m.blocked[idx(m,xx,yy)]&&!protectedPoint(xx+.5,yy+.5,1)&&routeDistance(xx+.5,yy+.5)>5)setHaz(m,xx,yy,DATA.HAZARD_BY_ID.lava);
        }
      }
      addLight(m,n.x,n.y,c.outdoor?8:7,c.outdoor?'#b6a994':'#ba9b83',false);
    }
    for(const n of f.landmarks)if(n.id!=='entry'&&n.id!=='boss')for(let k=0;k<5;k++){
      const x=n.x+U.riR(r,-10,10),y=n.y+U.riR(r,-8,8),i=idx(m,x|0,y|0);
      if(m.blocked[i]||m.hazard[i]||protectedPoint(x,y,1)||routeDistance(x,y)<4||Math.hypot(x-n.x,y-n.y)<6)continue;
      addProp(m,U.pickR(r,['urn','crate','barrel']),x,y,{blocks:false,breakable:true});
    }
    TerrainSurface.rebuild(m);
    const safe=(x,y)=>inside(x,y)&&TerrainSurface.supported(m,x,y,.5)&&!m.hazard[idx(m,x|0,y|0)]&&!protectedPoint(x,y,1);
    const combat=f.landmarks.filter(n=>n.id!=='entry'&&n.id!=='boss');
    for(const n of combat){
      const candidate=[{x:n.x+4,y:n.y+2},{x:n.x-4,y:n.y+3},{x:n.x+2,y:n.y-4}].find(p=>safe(p.x,p.y));
      if(candidate)f.anchors.events.push({id:n.id,...candidate});
    }
    const reward=nodes.treasury||nodes.forecourt||nodes.causeway;
    const rewardPos=[{x:reward.x+3,y:reward.y+3},{x:reward.x-3,y:reward.y+3}].find(p=>safe(p.x,p.y));
    if(!rewardPos)throw Error('No cinder reward floor');
    addProp(m,'chest',rewardPos.x,rewardPos.y,{blocks:false,lootable:true,rich:true,landmarkId:reward.id});
    let total=0,groupIndex=0;
    while(total<c.budget){
      const n=combat[groupIndex%combat.length],role=groupIndex%3===1?'ranged':'melee';
      const roster=m.zone.spawns.filter(id=>!!DATA.ENEMIES[id].projectile===(role==='ranged'));
      const id=U.pickR(r,roster.length?roster:m.zone.spawns),def=DATA.ENEMIES[id];
      const count=def.pack?U.riR(r,...def.pack):U.riR(r,2,4),elite=n.id==='treasury'&&groupIndex<combat.length||r()<.12;
      const candidates=[];for(let y=n.y-7;y<=n.y+7;y++)for(let x=n.x-8;x<=n.x+8;x++)
        if(safe(x,y)&&!m.monsterSpawns.some(p=>Math.hypot(x-p.x,y-p.y)<.9)&&
          !m.props.some(p=>(p.interact||p.lootable)&&Math.hypot(x-p.x,y-p.y)<2))candidates.push({x,y});
      const ax=n.x+(groupIndex%2?4:-4),ay=n.y+(role==='ranged'?-3:3);
      candidates.sort((a,b)=>U.dist2(a.x,a.y,ax,ay)-U.dist2(b.x,b.y,ax,ay));
      if(candidates.length<count)throw Error('Cinder encounter space exhausted: '+zoneId+'/'+n.id);
      const group={landmarkId:n.id,role,elite,spawns:[]};
      for(let k=0;k<count;k++){const p=candidates[k],sp={id,...p,elite:elite&&k===0,minion:elite&&k>0,landmarkId:n.id};m.monsterSpawns.push(sp);group.spawns.push(sp);total++;}
      f.encounters.push(group);groupIndex++;
    }
    bakeMinimap(m);TerrainSurface.rebuild(m);m.hasElev=m.elev.some(v=>v>0);
    return m;
  }
  /* Act IV: authored memory islands with seeded room assignments and links. */
  function genCathedral(zoneId,seed) {
    const side=!!DATA.ZONES[zoneId].memoryParent,heart=zoneId==='cathedral2',bastion=zoneId==='cathedral_bastion';
    const m=blank(zoneId,side?72:112,side?72:112),r=U.rng(seed^U.hash(zoneId));
    const variant=U.riR(r,0,side?1:2),baseMaterial=side?(bastion?3:2):(heart?1:0);
    m.zone={...m.zone,dark:side?(bastion?.61:.57):(heart?.65:.57)};
    m.walls.fill(1);m.blocked.fill(1);m.void=new Uint8Array(m.w*m.h).fill(1);
    m.cathedralMaterials=new Uint8Array(m.w*m.h).fill(baseMaterial);
    const c=m.cathedral={version:1,seed,variant,rooms:[],connections:[],anchors:{},reserved:[],decals:[],
      void:m.void,baseMaterial,materials:['cathedral_floor_pale','cathedral_floor_dark','cathedral_floor_street','cathedral_floor_fortress'],arenaReserved:true};
    const nodes={},routeClearance=new Uint8Array(m.w*m.h);
    function open(x,y,mat=baseMaterial){if(x<2||y<2||x>=m.w-2||y>=m.h-2)return;const i=idx(m,x,y);m.walls[i]=m.blocked[i]=m.void[i]=0;m.floor[i]=2;m.cathedralMaterials[i]=mat;}
    function room(id,label,x,y,w,h,mat=baseMaterial){
      if(side&&variant)x=m.w-x;
      if(id!=='entry'&&id!=='sanctuary'){w+=U.riR(r,-1,1)*2;h+=U.riR(r,-1,1)*2;}
      const n={id,label,x:x+.5,y:y+.5,w,h,material:mat};nodes[id]=n;c.rooms.push(n);
      const x0=x-Math.floor(w/2),y0=y-Math.floor(h/2);
      for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++){
        if(Math.min(xx,w-1-xx)+Math.min(yy,h-1-yy)<3)continue;open(x0+xx,y0+yy,mat);
      }
      return n;
    }
    function route(a,b,width=5,via=[]){
      a=typeof a==='string'?nodes[a]:a;b=typeof b==='string'?nodes[b]:b;
      const points=[a,...via,b].map(p=>({x:Math.floor(p.x),y:Math.floor(p.y)}));
      c.connections.push({from:a.id,to:b.id,width,points});const rad=Math.floor(width/2);
      for(let j=1;j<points.length;j++){
        const {x,y}=points[j-1],t=points[j],dx=t.x-x,dy=t.y-y,steps=Math.max(Math.abs(dx),Math.abs(dy));
        for(let k=0;k<=steps;k++){const xx=Math.round(x+dx*k/Math.max(1,steps)),yy=Math.round(y+dy*k/Math.max(1,steps));
          for(let oy=-rad;oy<=rad;oy++)for(let ox=-rad;ox<=rad;ox++){
            open(xx+ox,yy+oy);if(Math.abs(ox)<=1&&Math.abs(oy)<=1)routeClearance[idx(m,xx+ox,yy+oy)]=1;
          }
        }
      }
    }
    if(!side&&!heart){
      room('entry','The broken arrival bridge',15,94,13,13);
      room('nave','The nave of borrowed memories',38+variant*3,68,27,25);
      const slots=[[22,33],[60+variant*3,22],[89,53+variant*3]];
      const memories=[['cinderwatch','Cinderwatch chapel',2],['bastion','Last Bastion chapel',3],['karrhal','Mount Karrhal chapel',0]];
      for(let i=0;i<3;i++){const [id,label,mat]=memories[i],p=slots[(i+variant)%3];room(id,label,p[0],p[1],23,23,mat);}
      room('sanctuary','Sanctuary of the Empty Archangel',85,91,29,29);
      const ordered=slots.map(p=>c.rooms.find(n=>Math.floor(n.x)===p[0]&&Math.floor(n.y)===p[1]));
      route('entry','nave',7);route('nave',ordered[0],7);route(ordered[0],ordered[1]);route(ordered[1],ordered[2]);
      route(ordered[2],'nave');route('nave','sanctuary',7);route(ordered[1],'nave',5);
      for(const [i,id] of ['cinderwatch','bastion','karrhal'].entries())c.anchors['trapped_soul_'+i]={x:nodes[id].x,y:nodes[id].y-2};
    }else if(heart){
      room('entry','The reliquary threshold',17,92,15,15);
      const slots=[[23,54],[35+variant*3,21],[84,23+variant*3]];
      for(let i=0;i<3;i++){const p=slots[(i+variant)%3];room('ritual_'+i,['The choir of silence','The sundered armory','The chamber of names'][i],p[0],p[1],23,23);}
      room('bastion','The breached procession',91,70,21,23,3);room('sanctuary','The Hollow King’s throne',60,59,29,29);
      const ordered=slots.map(p=>c.rooms.find(n=>Math.floor(n.x)===p[0]&&Math.floor(n.y)===p[1]));
      route('entry',ordered[0],7);route(ordered[0],ordered[1],7);route(ordered[1],ordered[2],7);
      route(ordered[2],'bastion',7);route('bastion','entry',5,[{x:85,y:96},{x:39,y:98}]);
      route('bastion','sanctuary',7);route(ordered[variant%2],'sanctuary',5);
      for(let i=0;i<3;i++){const n=nodes['ritual_'+i];c.anchors['quieting_seal_'+i]={x:n.x-3,y:n.y-2};c.anchors['sword_piece_'+i]={x:n.x+3,y:n.y+2};c.anchors['guard_'+i]={x:n.x-3,y:n.y+2};}
      c.anchors.hell_portal={x:nodes.sanctuary.x,y:nodes.sanctuary.y-12};
    }else{
      room('entry',bastion?'The shattered portcullis':'The ember gate',12,59,15,15);
      room('approach',bastion?'The broken defense walk':'Ashen street',15,35,19,21);
      room('memory',bastion?'The abandoned muster':'Houses without names',29,14,23,19);
      room('flank',bastion?'The barracks flank':'The remembered memorial',55,22,21,21);
      room('sanctuary',bastion?'The last defense':'The watch captain’s square',53,51,25,25);
      room('shortcut',bastion?'The fallen banner court':'The courtyard passage',30,50,13,13);
      route('entry','approach',7);route('approach','memory');route('memory','flank');route('flank','sanctuary',7);
      route('sanctuary','shortcut');route('shortcut','entry');c.encounter={id:'memory_guard',members:5};
    }
    if(!side){
      const n=nodes.sanctuary,x0=Math.floor(n.x)-10,y0=Math.floor(n.y)-10;
      const a=m.bossArena={bossId:m.zone.boss,x0,y0,x1:x0+21,y1:y0+21,cx:x0+10.5,cy:y0+10.5,approach:{x:n.x+12,y:n.y}};
      for(let y=a.y0;y<a.y1;y++)for(let x=a.x0;x<a.x1;x++)open(x,y);
      c.reserved.push({...a,kind:'boss'});m.monsterSpawns.push({id:m.zone.boss,x:a.cx,y:a.cy,boss:true});
    }
    const inArena=(x,y,pad=1)=>m.bossArena&&x>=m.bossArena.x0-pad&&x<m.bossArena.x1+pad&&y>=m.bossArena.y0-pad&&y<m.bossArena.y1+pad;
    function prop(type,x,y,options={}){return addProp(m,type,x,y,{blocks:false,...options});}
    function architecture(type,n,dx,dy,width=3,height=2){
      const x=n.x+dx,y=n.y+dy,footprint={x0:Math.floor(x-width/2),y0:Math.floor(y-height/2),x1:Math.floor(x-width/2)+width,y1:Math.floor(y-height/2)+height};
      if(c.reserved.some(a=>a.kind==='gate'&&x>=a.x0-2&&x<a.x1+2&&y>=a.y0-2&&y<a.y1+2))return;
      for(let yy=footprint.y0;yy<footprint.y1;yy++)for(let xx=footprint.x0;xx<footprint.x1;xx++)if(inArena(xx+.5,yy+.5,0)||routeClearance[idx(m,xx,yy)])return;
      for(let yy=footprint.y0;yy<footprint.y1;yy++)for(let xx=footprint.x0;xx<footprint.x1;xx++)if(xx>=0&&yy>=0&&xx<m.w&&yy<m.h)m.blocked[idx(m,xx,yy)]=1;
      const pr=prop('cathedral_'+type,x,y,{blocks:true,building:true,footprint});(m.buildings||(m.buildings=[])).push(pr);c.reserved.push({...footprint,kind:'architecture'});return pr;
    }
    function gate(n,type,target,spawnKey,returnKey,label,dx=0,dy=-4,preserve=false){
      const x=n.x+dx,y=n.y+dy;
      for(let yy=-2;yy<=4;yy++)for(let xx=-3;xx<=3;xx++)open(Math.floor(x)+xx,Math.floor(y)+yy,n.material);
      prop('cathedral_'+type,x,y,{building:true,gate:true});
      m.exits.push({x0:x-1.3,y0:y-.7,x1:x+1.3,y1:y+.7,target,spawnKey,label,reuseCachedMap:preserve});
      if(returnKey)m.spawns[returnKey]={x,y:y+3};
      c.reserved.push({x0:x-4,y0:y-3,x1:x+4,y1:y+5,kind:'gate'});
      addLight(m,x,y,7,type==='cinder_gate'?'#dea461':'#b8b5e0',false);
    }
    const entry=nodes.entry;
    if(side){gate(entry,bastion?'bastion_gate':'cinder_gate',m.zone.memoryParent,'from_'+zoneId,'default',DATA.ZONES[m.zone.memoryParent].name,0,-4,true);m.spawns.from_parent=m.spawns.default;}
    else if(heart)gate(entry,'heart_gate','cathedral1','from_cathedral2','from_cathedral1','The Shattered Cathedral');
    else gate(entry,'arrival','khalcamp','shrine','default','The Dig Camp');
    m.spawns.default=m.spawns.default||m.spawns.from_cathedral1;m.spawns.portal={x:m.spawns.default.x+1,y:m.spawns.default.y};
    if(!side){
      const n=heart?nodes.bastion:nodes.cinderwatch,child=heart?'cathedral_bastion':'cathedral_cinderwatch';
      gate(n,heart?'bastion_gate':'cinder_gate',child,'from_parent','from_'+child,DATA.ZONES[child].name,6,-5);
      if(!heart)gate(nodes.sanctuary,'heart_gate','cathedral2','from_cathedral1','from_cathedral2','The Cathedral Heart',0,-12);
      const x=entry.x-4,y=entry.y+2;prop('shrine',x,y,{interact:'shrine',label:'Travel Shrine'});m.shrine={x,y:y+1.5};m.spawns.shrine=m.shrine;addLight(m,x,y,6,'#cad7df',false);
    }
    const landmarks=side?{approach:bastion?'defenses':'houses',memory:bastion?'defenses':'houses',flank:bastion?'buttress':'memorial',sanctuary:bastion?'defenses':'memorial'}:
      heart?{ritual_0:'rose_window',ritual_1:'buttress',ritual_2:'mountain_shrine',bastion:'defenses',sanctuary:'throne'}:
      {nave:'rose_window',cinderwatch:'houses',bastion:'defenses',karrhal:'mountain_shrine',sanctuary:'rose_window'};
    for(const [id,type] of Object.entries(landmarks)){
      const n=nodes[id],left=-Math.floor(n.w/2)+3,right=Math.floor(n.w/2)-3,back=-Math.floor(n.h/2)+1;
      // Landmarks are required. Try authored perimeter sockets when a seeded
      // bridge or gateway occupies the preferred position.
      for(const [dx,dy] of [[-6,back],[left,back+1],[right,back+1],[left,-3],[right,3],[left,Math.floor(n.h/2)-2]]){
        const piece=architecture(type,n,dx,dy,4,2);if(piece){n.landmark={type:piece.type,x:piece.x,y:piece.y};break;}
      }
      if(!n.landmark)throw new Error('No cathedral landmark socket: '+zoneId+'/'+seed+'/'+id);
      if(id!=='sanctuary')architecture('column',n,-Math.floor(n.w/2)+2,2,2,2);
      addLight(m,n.x,n.y,side?10:12,n.material===2?'#d8a066':heart?'#aaa1c8':'#d4cbb4',false);
    }
    const protectedPoint=(x,y)=>inArena(x,y)||c.reserved.some(a=>x>=a.x0-1&&x<a.x1+1&&y>=a.y0-1&&y<a.y1+1)||Object.values(c.anchors).some(a=>U.dist(x,y,a.x,a.y)<4)||Object.values(m.spawns).some(a=>U.dist(x,y,a.x,a.y)<5);
    for(const n of c.rooms){
      if(n.id==='entry'||n.id==='sanctuary')continue;
      architecture('broken_arch',n,Math.floor(n.w/2)-2,-4,2,2);
      architecture('parapet',n,4,Math.floor(n.h/2)-1,3,1);
      for(let i=0;i<4;i++){const x=n.x+U.riR(r,-8,8),y=n.y+U.riR(r,-8,8);if(walkable(m,x,y)&&!protectedPoint(x,y))c.decals.push({type:'cathedral_'+(i%2?'glass':'rubble_decal'),x,y,scale:.8+r()*.5,alpha:.7});}
      for(const [dx,dy] of [[-7,6],[6,7]]){const x=n.x+dx,y=n.y+dy;if(walkable(m,x,y)&&!protectedPoint(x,y))prop('cathedral_rubble',x,y);}
    }
    function pack(n,ids,count,elite=false,encounter=null,skillProfile=null){
      for(let i=0;i<count;i++){const x=n.x+(i%3-1)*2,y=n.y+Math.floor(i/3)*2;
        const id=Array.isArray(ids)?ids[i]:ids;
        if(walkable(m,x,y)&&!inArena(x,y))m.monsterSpawns.push({id,x,y,elite:elite&&i===0,minion:elite&&i>0,cathedralEncounter:encounter,skillProfile:i===0?skillProfile:null});
      }
    }
    const K='hollow_knight',P='choir_priest',S='soul_eater',W='memory_wraith';
    if(side){
      const approaches=bastion?[[K,K,K,P,W],[K,K,P,W,W],[K,K,K,W,W]]:[[K,K,K,S,S],[K,K,S,W,W],[K,K,S,S,W]];
      for(const [i,id] of ['approach','memory','flank'].entries())pack(nodes[id],approaches[i],5);
      pack(nodes.sanctuary,bastion?[P,K,K,K,W]:[K,K,K,S,S],5,true,'memory_guard',bastion?'cathedral_priest_guardian':'cathedral_knight_guardian');
      prop('chest',nodes.sanctuary.x+4,nodes.sanctuary.y+4,{lootable:true,rich:true,encounterLock:'memory_guard',label:'The remembered cache',visual:'cathedral_reliquary',visualDone:'cathedral_reliquary_open'});
      prop('cathedral_memorial',nodes.memory.x+5,nodes.memory.y+4,{interact:'memory_lore',label:bastion?'The last watch':'A name in the ashes',lore:bastion?'The stone remembers a final defense. The banners still turn toward an enemy that no longer exists. Here, the Quieting could not erase the oath.':'A doorframe remembers the height of a child. Warmth lingers in a hearth that has been cold for years. The cathedral has kept the streets, but stolen their names.'});
    }else{
      for(const n of c.rooms){if(['entry','sanctuary'].includes(n.id))continue;pack(n,n.id.startsWith('ritual')?[K,K,K,S,W]:[K,K,P,S,W],5);if(n.id==='nave')pack({...n,x:n.x+6,y:n.y+3},K,4);}
      prop('chest',nodes.sanctuary.x+12,nodes.sanctuary.y+7,{lootable:true,rich:true,visual:'cathedral_reliquary',visualDone:'cathedral_reliquary_open'});
    }
    bakeMinimap(m);return m;
  }

  function generateLayout(zoneId, worldSeed) {
    if(['cathedral1','cathedral2','cathedral_cinderwatch','cathedral_bastion'].includes(zoneId))return genCathedral(zoneId,worldSeed);
    if (CINDERS[zoneId]) return genCinders(zoneId, worldSeed);
    if (ACT3[zoneId]) return genAct3(zoneId, worldSeed);
    if (ACT2[zoneId]) return genAct2(zoneId, worldSeed);
    if (FRONTIER[zoneId]) return genFrontier(zoneId, worldSeed);
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

      /* ===== ACT V — The Throne of Cinders ===== */
      case "hellgate": return genCamp("hellgate", worldSeed, {
        npcs: [{ id: "vael", x: 10, y: 9 }], shard: true, forge: true,
        vendors: [{ id: "sutler_smith", x: 18, y: 11 }, { id: "sutler_quarter", x: 7, y: 11 }],
        exit: { target: "ash_wastes", spawnKey: "from_camp", returnKey: "from_wild", label: "The Cinderfields" } });

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
    if (m.frontier?.arenaReserved || m.act2?.arenaReserved || m.composition?.arenaReserved || m.cathedral?.arenaReserved) return;
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
  function imperialArchitecture(m) {
    if(!m.act3)return;
    const f=m.act3;f.revision=3;f.architecture={kit:m.id==='sand_tombs'||m.id==='tomb_sanctum'?'tomb':m.id==='khal_palace'?'palace':'sandstone',walls:[],bridges:[]};
    // Separate constructed walls from the actual walking elevation. Interior
    // masonry no longer creates acres of raised, flat terrain caps.
    if(!m.outdoor&&!m.settlement)for(let i=0;i<m.w*m.h;i++)if(m.walls[i])m.elev[i]=0;
    if(m.settlement){
      // The departure road climbs onto an excavated loading terrace. Existing
      // services and the checkpoint keep their world positions and footprints.
      m.surfaceVersion=1;m.ramps=[{x:25,y:21,dx:1,dy:0,width:5,length:4,low:0,high:2}];
      for(let y=19;y<=23;y++)for(let x=25;x<m.w;x++)m.elev[x+y*m.w]=x>=29?2:0;
      f.architecture.terraces=[{id:'departure_terrace',x:30,y:21,lo:25,hi:36,y0:19,y1:24,height:2,surfaceId:0,terrace:true}];
      f.layerLandmarks=[{id:'departure_terrace',label:'The raised departure terrace',x:32.5,y:21.5,surfaceId:0}];
    }
    // Merge straight boundary edges into coherent three-tile masonry runs.
    const walls=f.architecture.walls;
    for(let axis=0;axis<2;axis++)for(let line=1;line<(axis?m.w:m.h)-(m.settlement?0:1);line++){
      let start=-1;
      const flush=end=>{if(start<0)return;for(let at=start;at<end;at+=3){const length=Math.min(3,end-at);walls.push({x:axis?line:at,y:axis?at:line,axis,length});}start=-1;};
      for(let t=1;t<(axis?m.h:m.w)-1;t++){
        const x=axis?line:t,y=axis?t:line,i=x+y*m.w,j=axis?i-1:i-m.w;
        const boundary=!!m.walls[i]!==!!m.walls[j];
        if(boundary){if(start<0)start=t;}else flush(t);
      }flush((axis?m.h:m.w)-1);
    }
    for(const wall of walls){
      const x=wall.x+(wall.axis?0:wall.length/2),y=wall.y+(wall.axis?wall.length/2:0);
      wall.kit=m.outdoor?'rock':f.architecture.kit;
      if(m.id==='desert_wastes'&&f.landmarks.some(n=>Math.hypot(x-n.x,y-n.y)<10))wall.kit='sandstone';
      wall.broken=wall.kit==='sandstone'&&!m.settlement&&!wall.axis&&wall.length===3&&(wall.x*7+wall.y*11)%13===0;
    }
    TerrainSurface.rebuild(m);
  }
  function generate(zoneId, worldSeed) {
    const m = generateLayout(zoneId, worldSeed);
    if(zoneId==='khalcamp')dressAct3Camp(m);
    reserveBossArena(m);
    const objects = DATA.STORY_OBJECTS[zoneId] || [];
    if (!objects.length) { imperialArchitecture(m); bakeMinimap(m); return m; }
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
      const authored=m.cathedral?.anchors[obj.id] || (m.act3||m.act2)?.anchors.story[obj.id];
      const point = authored || candidates.filter(p=>chosen.every(c=>U.dist(c.x,c.y,p.x,p.y)>3)&&
        (obj.requireKill||!m.bossArena||!BossEncounters.insideArena(m.bossArena,p.x,p.y)))
        .sort((a,b)=>U.dist2(a.x,a.y,(boss||target).x,(boss||target).y)-U.dist2(b.x,b.y,(boss||target).x,(boss||target).y))[0];
      if (!point) throw new Error('No reachable story placement: '+zoneId+'/'+obj.id);
      chosen.push(point);
      if (obj.npc) m.npcs.push({id:obj.npc,...point,npcArt:obj.art,displayName:obj.label,storyId:obj.id});
      else addProp(m,obj.type,point.x,point.y,{blocks:false,interact:"story",storyId:obj.id,label:obj.label,...(m.act3&&zoneId==='underground_market'?{artZone:'act3',visualType:'relay_active'}:{}),
        ...(m.cathedral?{visual:obj.id==='hell_portal'?'cathedral_hell_portal':obj.type==='shrine'?'cathedral_seal':'cathedral_reliquary',visualDone:obj.type==='shrine'?'cathedral_seal_broken':'cathedral_reliquary_open',building:obj.id==='hell_portal'}:{})});
      addLight(m,point.x,point.y,3,obj.npc?'#c0dcff':'#d8b880',false);
      for (const [j,id] of (obj.guards||[]).entries()) {
        const guard = m.act3?.anchors.guards?.[obj.id]?.[j] || m.cathedral?.anchors['guard_'+obj.id.slice(-1)] || candidates.filter(p=>U.dist(p.x,p.y,point.x,point.y)>1.5&&(!m.bossArena||!BossEncounters.insideArena(m.bossArena,p.x,p.y))).sort((a,b)=>U.dist2(a.x,a.y,point.x,point.y)-U.dist2(b.x,b.y,point.x,point.y))[j];
        if (guard) m.monsterSpawns.push({id,x:guard.x,y:guard.y,...(m.act3?{storyGuardId:obj.id+'_'+j}:{})});
      }
      if (zoneId==='underground_market' && !m.act3) {
        addProp(m,'cart',point.x+1,point.y,{blocks:false});
        addProp(m,'crate',point.x,point.y+1,{blocks:false});
      }
      if (m.cathedral && obj.npc) {
        addProp(m,'cathedral_soul_bound',point.x,point.y,{blocks:false,building:true,soulBinding:obj.id,visualDone:'cathedral_soul_free'});
      }
    }
    return m;
  }
  const generateBase=generate;
  function generateImperial(zoneId,seed){const m=generateBase(zoneId,seed);if(m.act3&&!m.act3.architecture){imperialArchitecture(m);bakeMinimap(m);}return m;}
  return { generate:generateImperial, walkable, canStep, elevAt };
})();
