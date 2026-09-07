import fs from 'node:fs';
import vm from 'node:vm';

export function loadPathfinding(before = false) {
  const sources = ['utils', 'navigation'].map(name => fs.readFileSync(new URL(
    before ? `fixtures/${name}_before_optimization.js` : `../js/${name}.js`, import.meta.url), 'utf8'));
  // Both implementations execute in the same realm, with separate lexical
  // bindings. This avoids charging only one side for VM context crossings.
  return vm.runInThisContext(`(() => { ${sources.join('\n')}\nreturn {U, N: TerrainNavigation, S: TerrainSurface}; })()`);
}

export function loadMapGen() {
  globalThis.document ??= {createElement: () => ({getContext: () => ({
    createImageData: (w, h) => ({data: new Uint8ClampedArray(w * h * 4)}), putImageData() {},
  })})};
  const sources = ['utils', 'data', 'data_overrides', 'sprite_manifest', 'mapgen']
    .map(name => fs.readFileSync(new URL(`../js/${name}.js`, import.meta.url), 'utf8'));
  return vm.runInThisContext(`(() => { ${sources.join('\n')}\nreturn MapGen; })()`);
}
