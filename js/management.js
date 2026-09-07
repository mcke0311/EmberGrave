/* Pure recipe eligibility shared by the forge preview and its transaction. */
"use strict";
const ForgeRecipes = (() => {
  const recipes = [
    {id:"glyph", name:"Reforge a glyph", needs:"3 identical glyphs", outcome:"A random different glyph. The offering is consumed."},
    {id:"temper", name:"Temper equipment", needs:"1 common weapon or armor + 1 glyph", outcome:"The equipment gains random enhanced powers. The glyph is consumed."},
    {id:"reweave", name:"Reweave a rare", needs:"1 identified rare item + 3 glyphs", outcome:"The rare item's powers are rolled again. All three glyphs are consumed."},
    {id:"potion", name:"Distill draughts", needs:"3 matching lesser or greater Life / Aether draughts", outcome:"One stronger draught. Unused quantities are returned."},
  ];
  function evaluate(slots, id) {
    const items = slots.filter(Boolean), glyphs = items.filter(i=>i.kind === "glyph"), gear = items.filter(i=>i.kind === "gear");
    const pots = items.filter(i=>i.kind === "consumable" && DATA.CONSUMABLES[i.baseId]?.belt);
    const total = pots.reduce((n,i)=>n+i.count,0), upgrade = {hp1:"hp2",mp1:"mp2",hp2:"rejuv",mp2:"rejuv"}[pots[0]?.baseId];
    const conditions = {
      glyph: [[glyphs.length === 3,"Three glyphs"],[glyphs.length > 0 && glyphs.every(g=>g.glyph === glyphs[0].glyph),"Matching glyphs"],[items.length === 3 && glyphs.length === 3,"Only the required materials"]],
      temper: [[gear.length === 1 && gear[0].rarity === "common","One common equipment item"],[glyphs.length === 1,"One glyph"],[items.length === 2 && gear.length === 1 && glyphs.length === 1,"Only the required materials"]],
      reweave: [[gear.length === 1 && gear[0].rarity === "rare" && gear[0].identified,"One identified rare item"],[glyphs.length === 3,"Three glyphs"],[items.length === 4 && gear.length === 1 && glyphs.length === 3,"Only the required materials"]],
      potion: [[total >= 3,"At least three draughts"],[pots.length > 0 && pots.every(i=>i.baseId === pots[0].baseId),"Matching draughts"],[!!upgrade,"A stronger recipe exists"],[items.length === pots.length,"Only draughts in the offering"]],
    };
    const requirements = conditions[id] || [];
    return {valid: requirements.length > 0 && requirements.every(r=>r[0]), requirements, items, glyphs, gear, pots, total, upgrade};
  }
  return {recipes, evaluate};
})();
