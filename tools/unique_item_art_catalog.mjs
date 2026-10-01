/* Evaluated inventory-art identities, including additions in unique_powers.js. */
import fs from 'node:fs';
import vm from 'node:vm';
import { pathToFileURL } from 'node:url';

export function uniqueArtCatalog() {
  const scope = vm.createContext({ console, Math, Set, Map });
  for (const file of ['utils', 'data', 'unique_powers']) {
    vm.runInContext(fs.readFileSync(new URL('../js/' + file + '.js', import.meta.url), 'utf8'), scope);
  }
  const { D, Q } = vm.runInContext('({D:DATA,Q:UniquePowers})', scope);
  const groups = [
    ['equipment', D.UNIQUES], ['charm', D.UNIQUE_CHARMS],
    ['jewel', D.UNIQUE_JEWELS], ['glyph', Object.values(D.GLYPHS).filter(d => d.unique)],
  ];
  const rows = groups.flatMap(([group, defs]) => defs.map(def => {
    const base = D.BASES[def.base], power = Q.catalog[def.id];
    return {
      id: def.id, name: def.name, group, baseId: def.base || null,
      type: base ? base.name : group === 'charm' ? def.size + ' charm' : group,
      category: base?.icon || group, twoHand: !!base?.twoHand,
      flavor: def.flavor || '', palette: def.art || (def.jcol || def.color ? { accent: def.jcol || def.color } : {}),
      powers: power.powers.map(p => Q.describe(power, p)),
    };
  }));
  if (new Set(rows.map(row => row.id)).size !== rows.length) throw Error('Duplicate unique artwork identity');
  return rows;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  process.stdout.write(JSON.stringify(uniqueArtCatalog(), null, 2) + '\n');
}
