import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

for (const file of ['js/utils.js','js/data.js','js/items.js','js/sprite_manifest.js','js/sprite_assets.js','tests/item_catalog.js']) {
  vm.runInThisContext(fs.readFileSync(new URL('../'+file, import.meta.url), 'utf8'), { filename:file });
}
const { D, I, S, rows } = vm.runInThisContext('({D:DATA,I:Items,S:SpriteAssets,rows:ItemCatalog})');
let checks = 0;
const ok = (value, message) => { checks++; assert.ok(value, message); };
const info = it => S.itemIconInfo(it);
const signature = it => JSON.stringify(info(it));
const report = [];
for (const {group,key,item} of rows) {
  const art = info(item), asset = D.SPRITE_MANIFEST.entries[art.assetId];
  ok(asset && fs.existsSync(new URL('../'+asset.src,import.meta.url)), `${key}: missing asset`);
  ok(Number.isInteger(art.index) && art.index >= 0 && art.index < asset.cols * asset.rows, `${key}: frame out of bounds`);
  ok(!(art.assetId === 'ui.items.misc' && art.index === S.maps.miscIcons.cache), `${key}: chest fallback`);
  ok(signature(JSON.parse(JSON.stringify(item))) === signature(item), `${key}: save round trip changed art`);
  ok(signature({...item,icon:'cache'}) === signature(item), `${key}: stale icon overrides identity`);
  if (item.kind === 'gear') {
    ok(signature({...item,ilvl:99,identified:!item.identified,rarity:'rare'}) === signature(item), `${key}: affix level/identification changed base art`);
  }
  report.push({group,key,name:item.name,base:item.baseName,...art});
}
for (const pair of [['cap','warhelm'],['quiltvest','hauberk'],['buckler','kiteshield'],['cudgel','flangedmace'],['sword_t3','sword2h_t3'],['axe_t3','axe2h_t3'],['mace_t3','mace2h_t3'],['chest_t1','chest_t4'],['chest_t4','chest_t5']]) {
  ok(signature(I.fromBase(pair[0])) !== signature(I.fromBase(pair[1])), `${pair.join('/')}: silhouettes collapsed`);
}
ok(new Set(Object.keys(D.CONSUMABLES).map(id=>signature(I.makeConsumable(id)))).size === Object.keys(D.CONSUMABLES).length, 'consumable identities collapsed');
ok(new Set(Object.keys(D.CHARM_BASES).map(id=>signature(I.makeCharm(id,1,{})))).size === 3, 'charm sizes collapsed');
ok(new Set(D.UNIQUE_JEWELS.map(def=>signature(I.makeUniqueJewel(def)))).size === D.UNIQUE_JEWELS.length, 'unique jewel colors collapsed');
ok(new Set(Object.keys(D.GLYPHS).map(id=>signature(I.makeGlyph(id)))).size === Object.keys(D.GLYPHS).length, 'glyph colors collapsed');
assert.throws(()=>info({baseId:'missing-test-item',icon:'missing-test-icon'}),/No item artwork/);checks++;
const counts = Object.fromEntries([...new Set(rows.map(row=>row.group))].map(group=>[group,rows.filter(row=>row.group === group).length]));
fs.writeFileSync(new URL('item_identity_audit.json',import.meta.url),JSON.stringify({checks,counts,items:report},null,2)+'\n');
console.log(`PASS: ${checks} checks across ${rows.length} catalogue entries. ${JSON.stringify(counts)}`);
