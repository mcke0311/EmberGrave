import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadPathfinding, loadMapGen} from './pathfinding_test_helpers.mjs';

const before = loadPathfinding(true), after = loadPathfinding(), MapGen = loadMapGen();
const results = [];
function measure(name, repetitions, run) {
  const result = run(after);
  assert.deepEqual(result, run(before), `${name}: result changed`);
  for (let i = 0; i < 8; i++) { run(before); run(after); }
  const times = {before: [], after: []};
  for (let sample = 0; sample < 9; sample++) {
    for (const key of sample % 2 ? ['after', 'before'] : ['before', 'after']) {
      const implementation = key === 'before' ? before : after;
      const start = performance.now();
      for (let i = 0; i < repetitions; i++) run(implementation);
      times[key].push((performance.now() - start) / repetitions);
    }
  }
  const median = values => values.toSorted((a, b) => a - b)[4];
  const oldMs = median(times.before), newMs = median(times.after);
  results.push({name, repetitions, found: result !== null && result !== false,
    waypoints: Array.isArray(result) ? result.length : undefined,
    beforeMedianMs: +oldMs.toFixed(4), afterMedianMs: +newMs.toFixed(4), reductionPercent: +(100 * (1 - newMs / oldMs)).toFixed(1)});
}

const north = MapGen.generate('north_wild', 12345);
for (const [name, x, y, tx, ty, radius] of [
  ['North recorded query 1', 111.70565945220766, 98.28090994238704, 109.6, 97.96, .2788],
  ['North recorded query 2', 103.01666666666677, 107.5, 80.5, 80.5, .34],
  ['North recorded query 3', 100.65716303951544, 105.34053531627187, 101.5, 93.1, .34],
]) measure(name, 5, ({N}) => N.findPath(north, {x, y}, {x: tx, y: ty}, {radius, hop: false, speed: 3.5}));

const w = 100, h = 80, blocked = new Uint8Array(w * h).fill(1);
for (let y = 1; y < h - 1; y += 2) {
  for (let x = 1; x < w - 1; x++) blocked[x + y * w] = 0;
  if (y < h - 3) blocked[(y % 4 === 1 ? w - 2 : 1) + (y + 1) * w] = 0;
}
const walk = (x, y) => x >= 0 && y >= 0 && x < w && y < h && !blocked[x + y * w];
measure('A* long corridor', 10, ({U}) => U.astar(walk, w, h, 1, 1, 98, 77, w * h));
measure('A* short corridor', 1000, ({U}) => U.astar(walk, w, h, 1, 1, 8, 1, w * h));
const flat = {w, h, blocked: new Uint8Array(w * h), elev: new Uint8Array(w * h)};
measure('Collision sweep, 40 tiles', 1000, ({N}) => N.segment(flat, 2.5, 2.5, 42.5, 2.5, .36));
const report = {node: process.version, platform: process.platform,
  method: 'Nine alternating batches after warmup; median CPU milliseconds per query. Both versions share a JS realm; exact result equality required. Excludes browser rendering and GPU work.', results};
fs.writeFileSync(new URL('pathfinding_optimization_performance.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
