/* Shared complete catalogue for visual review and the item-art regression. */
const ItemCatalog = (() => {
  const rows = [];
  const add = (group, key, item) => rows.push({ group, key, item });
  for (const id of Object.keys(DATA.BASES)) add("Base equipment", id, Items.fromBase(id));
  for (const def of DATA.UNIQUES) add("Unique equipment", def.id, Items.makeUnique(def));
  for (const def of DATA.SET_ITEMS) add("Set equipment", def.id, Items.makeSetItem(def));
  for (const id of Object.keys(DATA.CONSUMABLES)) add("Supplies", id, Items.makeConsumable(id));
  for (const id of Object.keys(DATA.GLYPHS)) add("Glyphs", id, Items.makeGlyph(id));
  for (const id of Object.keys(DATA.CHARM_BASES)) add("Charms", id, Items.makeCharm(id, 1, { name: DATA.CHARM_BASES[id].name }));
  for (const def of DATA.UNIQUE_CHARMS) add("Unique charms", def.id, Items.makeUniqueCharm(def));
  for (const [i, color] of ["#d04040", "#40a0d0", "#d0c040", "#40c060", "#b060d0", "#e08840"].entries()) add("Jewels", "jewel_" + i, Items.makeJewel(1, { name:"Jewel", jcol:color }));
  for (const def of DATA.UNIQUE_JEWELS) add("Unique jewels", def.id, Items.makeUniqueJewel(def));
  return rows;
})();
