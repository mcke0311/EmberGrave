import assert from 'node:assert/strict';
import {loadPathfinding, loadMapGen} from './pathfinding_test_helpers.mjs';

const before = loadPathfinding(true), after = loadPathfinding();
let checks = 0;
function equal(actual, expected, message) { assert.deepEqual(actual, expected, message); checks++; }

// Compare complete paths, including equal-cost tie order, retargeting, failed
// searches, expansion caps, elevation limits and custom edge kinds/costs.
for (let seed = 0; seed < 100; seed++) {
  const random = after.U.rng(seed), w = 12 + seed % 17, h = 10 + seed % 13;
  const blocked = Uint8Array.from({length: w * h}, () => random() < .24 ? 1 : 0);
  const elev = Uint8Array.from(blocked, () => Math.floor(random() * 3));
  const walk = (x, y) => x >= 0 && y >= 0 && x < w && y < h && !blocked[x + y * w];
  for (let query = 0; query < 8; query++) {
    const sx = Math.floor(random() * w), sy = Math.floor(random() * h);
    const tx = Math.floor(random() * w), ty = Math.floor(random() * h);
    blocked[sx + sy * w] = 0;
    const traversal = (x, y, nx, ny, distance) => (nx * 7 + ny * 3) % 11 === 0 ? null :
      {cost: distance + ((nx + ny) % 3) * .4, kind: nx === x || ny === y ? 'walk' : 'hop'};
    for (const options of [[w * h], [3], [0, elev, 1], [w * h, null, 1, traversal]]) {
      const args = [walk, w, h, sx, sy, tx, ty, ...options];
      equal(after.U.astar(...args), before.U.astar(...args), `A* seed ${seed}, query ${query}`);
    }
  }
  const m = {w, h, blocked, elev};
  for (const radius of [0, .2, .36, .49, .5, .68, 1.2, -.36]) {
    for (let sample = 0; sample < 50; sample++) {
      const x = random() * (w + 2) - 1, y = random() * (h + 2) - 1;
      equal(after.N.clear(m, x, y, radius), before.N.clear(m, x, y, radius), `footprint seed ${seed}`);
    }
    for (const [x, y] of [[0, 0], [w, h], [.36, .36], [w - radius, h - radius], [NaN, 1], [1, Infinity]]) {
      equal(after.N.clear(m, x, y, radius), before.N.clear(m, x, y, radius), 'boundary footprint');
    }
  }
}

// Production terrain and smoothing: reusing the same helpers must not leak
// search state between maps, profiles, or changes to blocking props.
const MapGen = loadMapGen();
for (const zone of ['north_wild', 'weeping_marsh', 'drowned_crypt']) {
  for (const seed of [1, 12345]) {
    const m = MapGen.generate(zone, seed), from = m.spawns.default;
    for (const to of Object.values(m.spawns)) {
      for (const profile of [{radius: .36, hop: false}, {radius: .36, hop: true, speed: 4.5}]) {
        equal(after.N.findPath(m, from, to, profile), before.N.findPath(m, from, to, profile), `${zone} seed ${seed}`);
      }
    }
    m.blocked.fill(0);
    const to = {x: m.w / 2 + .5, y: m.h / 2 + .5};
    equal(after.N.findPath(m, from, to), before.N.findPath(m, from, to), 'changed blockers');
  }
}
console.log(`PASS ${checks} pathfinding equivalence checks: exact routes, caps, edge kinds, footprint boundaries and production maps.`);
