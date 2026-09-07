/* Shared ground traversal. Gameplay routes, smoothing and collision use the same rules. */
"use strict";
const TerrainNavigation = (() => {
  const HOP_DURATION = 0.42, HOP_COOLDOWN = 0.65;
  const height = (m, x, y) => m.surfaceVersion ? TerrainSurface.heightAt(m,x,y) : m.elev?.[Math.floor(x) + Math.floor(y) * m.w] || 0;
  function clear(m, x, y, radius = 0) {
    if (!Number.isFinite(x + y)) return false;
    for (const dx of [-radius, radius]) for (const dy of [-radius, radius]) {
      const tx = Math.floor(x + dx), ty = Math.floor(y + dy);
      if (tx < 0 || ty < 0 || tx >= m.w || ty >= m.h || m.blocked[tx + ty * m.w]) return false;
    }
    return true;
  }
  function step(m, ax, ay, bx, by, maxRise = 1) {
    const x = Math.floor(ax), y = Math.floor(ay), nx = Math.floor(bx), ny = Math.floor(by);
    if(m.surfaceVersion&&maxRise===1) {
      return clear(m,bx,by)&&TerrainSurface.connected(m,x,y,nx,ny)&&
        (x===nx||y===ny||(clear(m,nx+.5,y+.5)&&clear(m,x+.5,ny+.5)));
    }
    if (!clear(m, bx, by) || Math.abs(height(m, ax, ay) - height(m, bx, by)) > maxRise) return false;
    if (x !== nx && y !== ny) {
      // Both sides of a diagonal must offer clearance and a legal elevation transition.
      for (const [cx, cy] of [[nx, y], [x, ny]])
        if (!clear(m, cx + .5, cy + .5) || Math.abs(height(m, cx, cy) - height(m, ax, ay)) > maxRise || Math.abs(height(m, cx, cy) - height(m, bx, by)) > maxRise) return false;
    }
    return true;
  }
  function segment(m, ax, ay, bx, by, radius = .36, maxRise = 1) {
    if(!Number.isFinite(ax+ay+bx+by))return false;
    if(m.surfaceVersion&&maxRise===1&&!TerrainSurface.supported(m,ax,ay,radius))return false;
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / .12));
    let px = ax, py = ay;
    for (let i = 1; i <= n; i++) {
      const x = ax + (bx - ax) * i / n, y = ay + (by - ay) * i / n;
      if (!clear(m, x, y, radius) || !step(m, px, py, x, y, maxRise)) return false;
      if(m.surfaceVersion&&maxRise===1&&!TerrainSurface.supported(m,x,y,radius))return false;
      px = x; py = y;
    }
    return true;
  }
  function transition(m, ax, ay, bx, by, profile = {}) {
    const r = profile.radius ?? .36;
    if (segment(m, ax, ay, bx, by, r)) return "walk";
    if (profile.hop && Math.hypot(bx - ax, by - ay) <= Math.SQRT2 + .01 && Math.abs(height(m, ax, ay) - height(m, bx, by)) === 2 && clear(m, ax, ay, r) && (!m.surfaceVersion||(TerrainSurface.supported(m,ax,ay,r)&&TerrainSurface.supported(m,bx,by,r))) && segment(m, ax, ay, bx, by, r, 2)) return "hop";
    return null;
  }
  function smooth(m, from, points, radius) {
    const out = []; let current = from, i = 0;
    while (i < points.length) {
      if (points[i].kind === "hop") { out.push(points[i]); current = points[i++]; continue; }
      let end = i;
      while (end + 1 < points.length && points[end + 1].kind !== "hop") end++;
      let j = end;
      while (j > i && !segment(m, current.cx, current.cy, points[j].cx, points[j].cy, radius)) j--;
      if(!segment(m,current.cx,current.cy,points[j].cx,points[j].cy,radius))return null;
      out.push(points[j]); current = points[j]; i = j + 1;
    }
    return out;
  }
  function findPath(m, from, to, profile = {}) {
    if(!from||!to||!Number.isFinite(from.x+from.y+to.x+to.y))return null;
    const r = profile.radius ?? .36, speed = Math.max(.1, profile.speed || 4.5);
    if (segment(m, from.x, from.y, to.x, to.y, r)) return [{cx: to.x, cy: to.y, kind: "walk"}];
    const walk = (x, y) => clear(m, x + .5, y + .5, r);
    const path = U.astar(walk, m.w, m.h, from.x, from.y, to.x, to.y, m.w * m.h, null, 1, (x, y, nx, ny, distance) => {
      const kind = transition(m, x + .5, y + .5, nx + .5, ny + .5, profile);
      return kind && {kind, cost: kind === "hop" ? Math.max(distance, speed * HOP_COOLDOWN) + .001 : distance};
    });
    if (!path) return null;
    const points = path.map(p => ({cx: p.x + .5, cy: p.y + .5, kind: p.kind || "walk"}));
    // Connect the actual fractional position to the graph. Smoothing may skip
    // this center only when the entire shortcut is legal for the actor's body.
    if(points.length)points.unshift({cx:Math.floor(from.x)+.5,cy:Math.floor(from.y)+.5,kind:'walk'});
    const result = smooth(m, {cx: from.x, cy: from.y}, points, r);
    if(!result)return null;
    const last = result.at(-1);
    if (last && last.kind === "walk" && Math.floor(last.cx) === Math.floor(to.x) && Math.floor(last.cy) === Math.floor(to.y) && segment(m, last.cx, last.cy, to.x, to.y, r)) result.push({cx: to.x, cy: to.y, kind: "walk"});
    return result;
  }
  function groundPoint(m, sx, sy, lift = 14) {
    if(m.surfaceVersion) {
      const hit=TerrainSurface.pick(m,sx,sy);
      if(hit?.kind!=='ground'||m.blocked[hit.tx+hit.ty*m.w])return null;
      // A top-rim vertex belongs to the picked face, even if floor(x/y)
      // would otherwise put that exact boundary coordinate on the lower tile.
      const epsilon=1e-6;
      return {x:U.clamp(hit.x,hit.tx+epsilon,hit.tx+1-epsilon),y:U.clamp(hit.y,hit.ty+epsilon,hit.ty+1-epsilon)};
    }
    let max = m._navMaxHeight;
    if (max === undefined) { max = 0; for (const v of m.elev || []) max = Math.max(max, v); m._navMaxHeight = max; }
    // Test frontmost elevated floor first, matching the floor painter's ordering.
    for (let h = max; h >= 0; h--) {
      const x = U.unisoX(sx, sy + h * lift), y = U.unisoY(sx, sy + h * lift);
      if (x >= 0 && y >= 0 && x < m.w && y < m.h && height(m, x, y) === h) return {x, y};
    }
    return {x: U.unisoX(sx, sy), y: U.unisoY(sx, sy)};
  }
  return {clear, height, step, segment, transition, findPath, groundPoint, HOP_DURATION, HOP_COOLDOWN};
})();
