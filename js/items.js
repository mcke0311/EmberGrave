/* =========================================================================
   EMBERGRAVE — items.js
   Randomized loot generation (affixes, rares, uniques), item naming and
   valuation, grid-inventory placement logic, equipment rules, drop tables.
   ========================================================================= */
"use strict";

const Items = (() => {
  let uidCounter = 1;
  const RARITY_ORDER = { common: 0, enhanced: 1, rare: 2, set: 3, unique: 4, glyph: 1 };
  const RARITY_COLOR = { common: "#cfcfcf", enhanced: "#7a96ff", rare: "#e8d060", set: "#58d878", unique: "#d8924a", glyph: "#7fd8c0" };

  /* --------------------------------------------------------- creation */
  function fromBase(baseId) {
    const b = DATA.BASES[baseId];
    const it = {
      uid: uidCounter++, kind: "gear", baseId, rarity: "common",
      name: b.name, baseName: b.name, ilvl: b.ilvl, w: b.w, h: b.h,
      slot: b.slot, cat: b.cat, icon: b.icon, twoHand: !!b.twoHand, ranged: !!b.ranged,
      playerVisualFamily: b.playerVisualFamily, materialTier: b.materialTier,
      playerSpriteOverride: b.playerSpriteOverride,
      affixes: [], identified: true, reqLvl: Math.max(1, b.ilvl - 1),
    };
    if (b.dmg) it.dmg = [b.dmg[0], b.dmg[1]];
    if (b.speed) it.speed = b.speed;
    if (b.armor) it.armor = b.armor;
    if (b.block) it.block = b.block;
    if (b.reach) it.reach = b.reach;
    return it;
  }

  function makeGlyph(id) {
    const g = DATA.GLYPHS[id];
    return {
      uid: uidCounter++, kind: "glyph", baseId: id, glyph: id, rarity: g.unique ? "unique" : "glyph",
      name: g.name, baseName: g.name, w: 1, h: 1, icon: "glyph", identified: true,
      affixes: [], flavor: g.flavor, reqLvl: 1, ilvl: 1,
    };
  }

  function makeConsumable(id, count) {
    const c = DATA.CONSUMABLES[id];
    return {
      uid: uidCounter++, kind: "consumable", baseId: id, rarity: "common",
      name: c.name, baseName: c.name, w: c.w, h: c.h, icon: c.icon, identified: true,
      count: count || 1, maxStack: 10, belt: !!c.belt, flavor: c.flavor, reqLvl: 1, ilvl: c.ilvl || 1,
    };
  }

  /* charm: a passive item that grants its affixes while carried in the pack.
     preset (used on save-load) supplies fixed affixes/name instead of rolling. */
  function makeCharm(size, ilvl, preset) {
    const b = DATA.CHARM_BASES[size] || DATA.CHARM_BASES.small;
    ilvl = Math.max(1, ilvl || 1);
    const it = {
      uid: uidCounter++, kind: "charm", baseId: "charm_" + b.id, charmSize: b.id, rarity: "enhanced",
      name: b.name, baseName: b.name, w: b.w, h: b.h, icon: "charm", affixes: [], identified: true,
      ilvl, reqLvl: Math.max(1, Math.floor(ilvl * 0.55)),
    };
    if (preset) {
      it.affixes = preset.affixes || [];
      if (preset.name) it.name = preset.name;
      if (preset.rarity) it.rarity = preset.rarity;
      if (preset.identified != null) it.identified = preset.identified;
      if (preset.uniqueId) it.uniqueId = preset.uniqueId;
      if (preset.flavor) it.flavor = preset.flavor;
      return it;
    }
    const used = new Set();
    let pre = null, suf = null, rolls = 0;
    for (let i = 0; i < b.maxAff * 5 && rolls < b.maxAff; i++) {
      const a = rollAffix("charm", null, ilvl, used);
      if (!a) break;
      used.add(a.group);
      for (const m of a.mods) it.affixes.push({ stat: m.stat, val: Math.max(1, Math.round(m.val * b.mult)) });
      rolls++;
      if (a.kind === "p") { if (!pre) pre = a.tierName; } else if (!suf) suf = a.tierName;
    }
    it.name = (pre ? pre + " " : "") + b.name + (suf ? " " + suf : "");
    return it;
  }

  /* jewel: a rolled socketable that drops into any open socket and applies on either side.
     preset (save-load) supplies fixed affixes/name/colour instead of rolling. */
  const JEWEL_COLS = ["#d04040", "#40a0d0", "#d0c040", "#40c060", "#b060d0", "#e08840"];
  function makeJewel(ilvl, preset) {
    ilvl = Math.max(1, ilvl || 1);
    const it = {
      uid: uidCounter++, kind: "jewel", baseId: "jewel", rarity: "enhanced",
      name: "Jewel", baseName: "Jewel", w: 1, h: 1, icon: "jewel", affixes: [], identified: true,
      ilvl, reqLvl: Math.max(1, Math.floor(ilvl * 0.5)), jcol: U.pick(JEWEL_COLS),
    };
    if (preset) {
      it.affixes = preset.affixes || [];
      if (preset.name) it.name = preset.name;
      if (preset.jcol) it.jcol = preset.jcol;
      if (preset.rarity) it.rarity = preset.rarity;
      if (preset.uniqueId) it.uniqueId = preset.uniqueId;
      if (preset.flavor) it.flavor = preset.flavor;
      return it;
    }
    const used = new Set();
    let pre = null, suf = null, n = U.ri(1, 2);
    for (let i = 0; i < n * 5 && it.affixes.length < n; i++) {
      const a = rollAffix("jewel", null, ilvl, used);
      if (!a) break;
      used.add(a.group);
      for (const m of a.mods) it.affixes.push({ stat: m.stat, val: Math.max(1, Math.round(m.val * 0.7)) });
      if (a.kind === "p") { if (!pre) pre = a.tierName; } else if (!suf) suf = a.tierName;
    }
    it.name = (pre ? pre + " " : "") + "Jewel" + (suf ? " " + suf : "");
    return it;
  }

  /* named, hand-tuned unique socketables (rarity "unique") */
  function statsToAffixes(stats) { return Object.entries(stats || {}).map(([stat, val]) => ({ stat, val })); }
  function makeUniqueCharm(def) {
    return makeCharm(def.size, def.ilvl, { affixes: statsToAffixes(def.stats), name: def.name, rarity: "unique", identified: true, uniqueId: def.id, flavor: def.flavor });
  }
  function makeUniqueJewel(def) {
    return makeJewel(def.ilvl, { affixes: (def.affixes || []).map(a => ({ stat: a.stat, val: a.val })), name: def.name, jcol: def.jcol, rarity: "unique", uniqueId: def.id, flavor: def.flavor });
  }

  /* socket-grant tiers (Mechanic's / Artisan's / Jeweler's), gated by item level
     and capped by the base's socket capacity — modeled after the D2 prefix table. */
  const SOCKET_TIERS = [
    { ilvl: 55, n: [4, 4], name: "Jeweler's" },
    { ilvl: 33, n: [3, 3], name: "Artisan's" },
    { ilvl: 10, n: [1, 2], name: "Mechanic's" },
  ];
  function socketTierFor(ilvl) { return SOCKET_TIERS.find(t => ilvl >= t.ilvl) || null; }

  /* pick an affix appropriate to slot/category/ilvl.
     Supports: per-slot allowlists, optional `cats` (item.cat) restriction,
     `group` de-duplication, multi-stat tiers (`mods`), and `perLevel` scaling. */
  function rollAffix(slot, cat, ilvl, usedGroups) {
    const pool = DATA.AFFIXES.filter(a => {
      if (usedGroups.has(a.group || a.stat)) return false;
      if (!a.tiers.some(t => t.ilvl <= ilvl)) return false;
      if (slot === "charm") return !!a.stat && DATA.CHARM_STATS.has(a.stat);   // charms draw from a curated stat set, ignore slot/cat
      if (slot === "jewel") return !!a.stat && DATA.JEWEL_STATS.has(a.stat);   // jewels likewise draw from their own set
      return (a.slots.includes("any") || a.slots.includes(slot)) && (!a.cats || a.cats.includes(cat));
    });
    if (!pool.length) return null;
    /* weighted pick: most affixes weight 1; rarer ones (e.g. skill affixes) carry a lower weight */
    let a = pool[pool.length - 1];
    const tot = pool.reduce((s, x) => s + (x.weight || 1), 0);
    let r = Math.random() * tot;
    for (const x of pool) { r -= (x.weight || 1); if (r <= 0) { a = x; break; } }
    const tiers = a.tiers.filter(t => t.ilvl <= ilvl);
    /* bias toward the highest available tier */
    const t = Math.random() < 0.6 ? tiers[tiers.length - 1] : U.pick(tiers);
    if (a.proc) return { group: a.group, kind: a.kind, tierName: t.name,
      proc: { chance: t.chance, trigger: t.trigger, elem: t.elem, dmg: [t.lo, t.hi], radius: t.radius, label: t.label } };
    const mods = t.mods
      ? t.mods.map(m => ({ stat: m.stat, val: U.ri(m.min, m.max) }))
      : [{ stat: a.stat, val: U.ri(t.min, t.max) }];
    return { group: a.group || a.stat, kind: a.kind, tierName: t.name, mods, perLevel: !!a.perLevel };
  }

  /* (re)roll affixes + name onto an existing gear item for its rarity */
  function rollAffixesOnto(it, rarity) {
    const b = DATA.BASES[it.baseId];
    it.rarity = rarity;
    it.affixes = [];
    it.procs = [];
    if (rarity === "common") { it.name = b.name; return it; }
    const nAff = rarity === "enhanced" ? U.ri(1, 2) : U.ri(3, 5);
    const used = new Set();
    let pre = 0, suf = 0, rolls = 0, preName = null, sufName = null;
    for (let i = 0; i < nAff * 4 && rolls < nAff; i++) {
      const a = rollAffix(b.slot, b.cat, it.ilvl, used);
      if (!a) break;
      if (a.kind === "p" && pre >= 3) continue;
      if (a.kind === "s" && suf >= 3) continue;
      used.add(a.group);
      if (a.proc) { it.procs.push(a.proc); }
      else for (const m of a.mods) {
        const af = { stat: m.stat, val: m.val };
        if (a.perLevel) af.perLevel = true;
        it.affixes.push(af);
      }
      rolls++;
      if (a.kind === "p") { pre++; if (!preName) preName = a.tierName; }
      else { suf++; if (!sufName) sufName = a.tierName; }
    }
    if (rarity === "enhanced") {
      /* a socket grant (Mechanic's/Artisan's/...) fills the prefix slot if none rolled */
      const pfx = preName || it.socketTierName || null;
      it.name = (pfx ? pfx + " " : "") + b.name + (sufName ? " " + sufName : "");
      it.identified = true;
    } else {
      it.name = U.pick(DATA.RARE_PRE) + " " + U.pick(DATA.RARE_SUF);
      it.identified = false;
    }
    it.reqLvl = Math.max(Math.max(1, b.ilvl - 1), Math.floor(it.ilvl * 0.8));
    return it;
  }

  function rollGear(ilvl, rarity, opts) {
    opts = opts || {};
    /* choose a base near the target ilvl: prefer a band so high-level heroes get
       high-tier bases, but never empty */
    const slotOk = b => !opts.slot || b.slot === opts.slot;
    const lowBand = Math.max(0, ilvl - Math.max(8, ilvl * 0.45));
    let bases = Object.values(DATA.BASES).filter(b => b.ilvl <= ilvl + 1 && b.ilvl >= lowBand && slotOk(b));
    if (bases.length < 3) bases = Object.values(DATA.BASES).filter(b => b.ilvl <= ilvl + 1 && slotOk(b));
    const b = U.pick(bases.length ? bases : Object.values(DATA.BASES).filter(slotOk));
    if (rarity === "common" && b.noCommon) rarity = "enhanced";

    if (rarity === "set") {
      const cands = DATA.SET_ITEMS.filter(s => s.ilvl <= ilvl + 2);
      if (cands.length) return makeSetItem(U.pick(cands));
      rarity = "rare";
    }
    if (rarity === "unique") {
      const eligible = DATA.UNIQUES.filter(u => u.ilvl <= ilvl + 2 && slotOk(DATA.BASES[u.base]));
      let cands = eligible.filter(u => u.ilvl >= lowBand);
      if (!cands.length && eligible.length) {
        const highest = Math.max(...eligible.map(u => u.ilvl));
        cands = eligible.filter(u => u.ilvl === highest);
      }
      if (cands.length) return makeUnique(U.pick(cands));
      rarity = "rare";
    }
    const it = fromBase(b.id);
    it.ilvl = Math.max(b.ilvl, ilvl);
    /* sockets: gated by item level — Mechanic's(≥10, 1-2) / Artisan's(≥33, 3) /
       Jeweler's(≥55, 4) — capped by the base's socket capacity */
    if (b.maxSockets && rarity !== "unique" && rarity !== "set" && Math.random() < 0.45) {
      const tier = socketTierFor(it.ilvl);
      if (tier) {
        const n = Math.min(b.maxSockets, U.ri(tier.n[0], tier.n[1]));
        if (n > 0) { it.sockets = Array(n).fill(null); it.socketTierName = tier.name; }
      }
    }
    return rollAffixesOnto(it, rarity);
  }

  function makeUnique(u) {
    const it = fromBase(u.base);
    it.rarity = "unique"; it.uniqueId = u.id; it.name = u.name;
    it.ilvl = Math.max(it.ilvl, u.ilvl);
    it.flavor = u.flavor;
    for (const [stat, val] of Object.entries(u.stats)) it.affixes.push({ stat, val });
    it.identified = false;
    it.reqLvl = Math.max(1, u.ilvl - 1);
    return it;
  }

  function makeSetItem(def) {
    const it = fromBase(def.base);
    it.rarity = "set"; it.setItemId = def.id; it.setId = def.set; it.name = def.name;
    it.ilvl = Math.max(it.ilvl, def.ilvl);
    for (const [stat, val] of Object.entries(def.stats)) it.affixes.push({ stat, val });
    it.identified = false;
    it.reqLvl = Math.max(1, def.ilvl - 1);
    return it;
  }

  /* --------------------------------------------------------- drops */
  function uniqueMultiplier(mf) {
    mf = Number.isFinite(mf) ? Math.max(0,mf) : 0;
    return 1 + (150 * mf / (150 + mf)) / 100;
  }
  function eligibleSocketables(mlvl) {
    const glyphLevels = { g_venom:12, g_aegis:16, g_doom:20, g_wraith:24, g_void:28, g_titan:36 };
    return [
      (DATA.UNIQUE_CHARMS || []).filter(d => d.ilvl <= mlvl + 2).map(d => () => makeUniqueCharm(d)),
      (DATA.UNIQUE_JEWELS || []).filter(d => d.ilvl <= mlvl + 2).map(d => () => makeUniqueJewel(d)),
      Object.values(DATA.GLYPHS).filter(d => d.unique && (d.dropLevel || glyphLevels[d.id]) <= mlvl + 2).map(d => () => makeGlyph(d.id)),
    ].filter(group => group.length);
  }
  function rollGlyph(ilvl, mf = 0, uniqueChance = 0.05) {
    const levels = { g_venom:12, g_aegis:16, g_doom:20, g_wraith:24, g_void:28, g_titan:36 };
    const uniques = Object.values(DATA.GLYPHS).filter(g => g.unique && (g.dropLevel || levels[g.id]) <= ilvl + 2);
    const regular = Object.values(DATA.GLYPHS).filter(g => !g.unique);
    const pool = uniques.length && Math.random() < uniqueChance * uniqueMultiplier(mf) ? uniques : regular;
    return makeGlyph(U.pick(pool).id);
  }
  function reforgeGlyph(glyph) {
    const unique = !!DATA.GLYPHS[glyph.glyph]?.unique;
    return makeGlyph(U.pick(Object.keys(DATA.GLYPHS).filter(id => id !== glyph.glyph && !!DATA.GLYPHS[id].unique === unique)));
  }
  function rollRarity(source, mf) {
    mf = Number.isFinite(mf) ? Math.max(0,mf) : 0;
    const base = DATA.RARITY_WEIGHTS[source] || DATA.RARITY_WEIGHTS.normal;
    const unique = base.find(([k]) => k === "unique")?.[1] || 0;
    if (Math.random() < unique / 100 * uniqueMultiplier(mf)) return "unique";
    const weights = base.filter(([k]) => k !== "unique").map(([k, w]) => {
      if (k === "rare") w *= 1 + (mf || 0) / 100;
      if (k === "enhanced") w *= 1 + (mf || 0) / 250;
      return [k, w];
    });
    return U.wpick(weights);
  }

  // Shared with the read-only loot data view.
  const DROP_CONFIG = {
      normal: { itemCh: 0.22, potCh: 0.13, goldCh: 0.3, goldMul: 1, n: 1 },
      elite:  { itemCh: 0.9,  potCh: 0.35, goldCh: 0.8, goldMul: 2.2, n: 2 },
      boss:   { itemCh: 1,    potCh: 0.8,  goldCh: 1,   goldMul: 6, n: 4 },
      chest:  { itemCh: 0.85, potCh: 0.4,  goldCh: 0.9, goldMul: 2.5, n: 2 },
      barrel: { itemCh: 0.07, potCh: 0.1,  goldCh: 0.22, goldMul: 0.6, n: 1 },
    };
  /* returns an array of drop entries: {item} or {gold} */
  function rollDrops(mlvl, source, mf, goldFind) {
    const out = [];
    const cfg = DROP_CONFIG[source] || { itemCh: 0.2, potCh: 0.1, goldCh: 0.3, goldMul: 1, n: 1 };
    const lootSource = source === "chest" || source === "barrel" ? (source === "chest" ? "elite" : "normal") : source;
    for (let i = 0; i < cfg.n; i++) {
      if (Math.random() < cfg.itemCh) {
        out.push({ item: rollGear(Math.max(1, mlvl + U.ri(-1, 1)), rollRarity(lootSource, mf)) });
      }
    }
    if (Math.random() < cfg.potCh) {
      const pool = mlvl >= 5 ? ["hp2", "mp2", "hp2", "rejuv"] : ["hp1", "mp1", "hp1"];
      out.push({ item: makeConsumable(U.pick(pool)) });
    }
    if (Math.random() < 0.06) out.push({ item: makeConsumable(Math.random() < 0.5 ? "tp" : "idscroll") });
    /* glyphs: rarer socketables from tougher sources (regular glyphs only — uniques below) */
    const glyphCh = { elite: 0.12, boss: 0.4, chest: 0.14 }[source] || 0.015;
    if (Math.random() < glyphCh) {
      const reg = Object.keys(DATA.GLYPHS).filter(k => !DATA.GLYPHS[k].unique);
      out.push({ item: makeGlyph(U.pick(reg)) });
    }
    /* charms: passive pack items, rarer from tougher sources */
    const charmCh = { elite: 0.10, boss: 0.35, chest: 0.10 }[source] || 0.012;
    if (Math.random() < charmCh) out.push({ item: makeCharm(U.wpick([["small", 6], ["large", 3], ["grand", 1.4]]), Math.max(1, mlvl + U.ri(-1, 2))) });
    /* jewels: rolled socketables, rarest of the socketables */
    const jewelCh = { elite: 0.05, boss: 0.22, chest: 0.06 }[source] || 0.006;
    if (Math.random() < jewelCh) out.push({ item: makeJewel(Math.max(1, mlvl + U.ri(-1, 2))) });
    const uSockCh = (DATA.UNIQUE_SOCKET_CHANCE[source] ?? DATA.UNIQUE_SOCKET_CHANCE.normal) * uniqueMultiplier(mf);
    if (Math.random() < uSockCh) {
      const groups = eligibleSocketables(mlvl);
      if (groups.length) out.push({ item: U.pick(U.pick(groups))() });
    }
    if (Math.random() < cfg.goldCh) {
      out.push({ gold: Math.max(1, Math.floor((U.ri(4, 14) + mlvl * U.ri(2, 5)) * cfg.goldMul * (1 + (goldFind || 0) / 100))) });
    }
    return out;
  }

  /* --------------------------------------------------------- value */
  function value(it) {
    if (it.kind === "consumable") return (DATA.CONSUMABLES[it.baseId].value || 10) * (it.count || 1);
    const uMul = it.rarity === "unique" ? 3 : 1;   // unique socketables are worth far more
    if (it.kind === "glyph") return it.rarity === "unique" ? 450 : 120;
    if (it.kind === "charm") return (50 + it.ilvl * 5 + (it.affixes || []).reduce((s, a) => s + a.val * 2, 0)) * uMul;
    if (it.kind === "jewel") return (90 + it.ilvl * 4 + (it.affixes || []).reduce((s, a) => s + a.val * 4, 0)) * uMul;
    let v = 12 + it.ilvl * 9;
    const mul = { common: 1, enhanced: 2.4, rare: 4.5, set: 6, unique: 7 }[it.rarity] || 1;
    v *= mul;
    for (const a of it.affixes) v += a.val * 3;
    if (it.procs) v += it.procs.length * 80;
    if (it.sockets) v += it.sockets.length * 20 + it.sockets.filter(Boolean).length * 90;
    return Math.floor(v);
  }
  const sellValue = it => Math.max(1, Math.floor(value(it) * 0.25));

  /* --------------------------------------------------------- text */
  function statLines(it, viewer = typeof Game !== "undefined" ? Game.state?.player : null) {
    const lines = [];
    if (it.dmg) {
      let lo = it.dmg[0], hi = it.dmg[1];
      let pct = 0, flat = 0;
      for (const a of it.affixes) { if (a.perLevel) continue; if (a.stat === "dmgPct") pct += a.val; if (a.stat === "dmgFlat") flat += a.val; }
      lo = Math.floor(lo * (1 + pct / 100)) + flat; hi = Math.floor(hi * (1 + pct / 100)) + flat;
      lines.push({ t: `Damage: ${lo} – ${hi}`, c: "head" });
      lines.push({ t: `Base Speed: ${it.speed.toFixed(2)}`, c: "base" });
    }
    if (it.armor) {
      let ar = it.armor, pct = 0, flat = 0;
      for (const a of it.affixes) { if (a.perLevel) continue; if (a.stat === "armorPct") pct += a.val; if (a.stat === "armor") flat += a.val; }
      lines.push({ t: `Armor: ${Math.floor(ar * (1 + pct / 100)) + flat}`, c: "head" });
    }
    if (it.block) lines.push({ t: `Block Chance: ${it.block}%`, c: "head" });
    if (it.twoHand) lines.push({ t: "Two-Handed", c: "base" });
    if (!it.identified) { lines.push({ t: "Unidentified", c: "reqbad" }); return lines; }
    if (typeof UniquePowers !== "undefined") lines.push(...UniquePowers.lines(it, undefined, viewer));
    for (const a of (it.affixes || [])) {
      // weapon dmg% / armor% are folded into the Damage/Armor headers above — but only when the
      // item HAS that base stat (charms & jewels show these lines normally)
      if (!a.perLevel && ((it.dmg && (a.stat === "dmgPct" || a.stat === "dmgFlat")) || (it.armor && (a.stat === "armorPct" || a.stat === "armor")))) continue;
      const fn = DATA.STAT_TEXT[a.stat];
      if (fn) lines.push({ t: fn(a.val) + (a.perLevel ? " per Level" : ""), c: "mod" });
    }
    for (const p of (it.procs || [])) {
      lines.push({ t: `${p.chance}% chance on ${p.trigger === "strike" ? "striking" : "being struck"} to unleash ${p.label}`, c: "mod" });
    }
    /* sockets + inserted glyphs */
    if (it.sockets) {
      const wpnSide = it.slot === "main";
      for (const gid of it.sockets) {
        if (!gid) { lines.push({ t: "◇ Empty Socket", c: "base" }); continue; }
        if (typeof gid === "object" && gid.jewel) {            // a seated jewel
          const jt = (gid.affixes || []).map(a => DATA.STAT_TEXT[a.stat] ? DATA.STAT_TEXT[a.stat](a.val) : "").filter(Boolean).join(", ");
          lines.push({ t: `◆ ${gid.name || "Jewel"}: ${jt}`, c: "glyph" });
          if (typeof UniquePowers !== "undefined") lines.push(...UniquePowers.lines(gid));
          continue;
        }
        const g = DATA.GLYPHS[gid];
        if (!g) { lines.push({ t: "◇ Empty Socket", c: "base" }); continue; }
        const eff = wpnSide ? g.wpn : g.arm;
        const effTxt = Object.entries(eff).map(([k, v]) => DATA.STAT_TEXT[k] ? DATA.STAT_TEXT[k](v) : "").join(", ");
        lines.push({ t: `◆ ${g.name}: ${effTxt}`, c: "glyph" });
        if (typeof UniquePowers !== "undefined") lines.push(...UniquePowers.lines(gid, wpnSide ? "wpn" : "arm"));
      }
    }
    /* set membership + bonuses (active lines lit when enough pieces are worn) */
    if (it.setId && DATA.SETS[it.setId]) {
      const set = DATA.SETS[it.setId];
      let worn = 0;
      const p = (typeof Game !== "undefined" && Game.state) ? Game.state.player : null;
      if (p) for (const s of Object.values(p.equip)) if (s && s.setId === it.setId) worn++;
      lines.push({ t: `${set.name}${worn ? ` (${worn} worn)` : ""}`, c: "set" });
      for (const [n, bonus] of Object.entries(set.bonuses)) {
        const txt = Object.entries(bonus).map(([k, v]) => DATA.STAT_TEXT[k] ? DATA.STAT_TEXT[k](v) : "").join(", ");
        lines.push({ t: `(${n} pieces) ${txt}`, c: worn >= +n ? "set" : "base" });
      }
      const others = DATA.SET_ITEMS.filter(s => s.set === it.setId && s.id !== it.setItemId).map(s => s.name);
      lines.push({ t: "Companions: " + others.join(" · "), c: "base" });
    }
    /* a completed named combination */
    if (it.combo) {
      const c = DATA.GLYPH_COMBOS.find(x => x.id === it.combo);
      if (c) {
        lines.push({ t: `★ ${c.name}: ` + Object.entries(c.stats).map(([k, v]) => DATA.STAT_TEXT[k] ? DATA.STAT_TEXT[k](v) : "").join(", "), c: "unique" });
        if (c.flavor) lines.push({ t: `“${c.flavor}”`, c: "flavor" });
      }
    }
    /* glyph item itself: show both modes */
    if (it.kind === "glyph") {
      const g = DATA.GLYPHS[it.glyph];
      lines.push({ t: "In weapons: " + Object.entries(g.wpn).map(([k, v]) => DATA.STAT_TEXT[k](v)).join(", "), c: "glyph" });
      lines.push({ t: "In armor: " + Object.entries(g.arm).map(([k, v]) => DATA.STAT_TEXT[k](v)).join(", "), c: "glyph" });
      lines.push({ t: "Pick up on cursor, click a socketed item", c: "base" });
    }
    return lines;
  }

  /* --------------------------------------------------------- grids */
  function makeGrid(w, h) { return { w, h, items: [] }; }
  function fits(grid, it, gx, gy, ignore) {
    if (gx < 0 || gy < 0 || gx + it.w > grid.w || gy + it.h > grid.h) return false;
    for (const o of grid.items) {
      if (o === ignore || o === it) continue;
      if (gx < o.gx + o.w && o.gx < gx + it.w && gy < o.gy + o.h && o.gy < gy + it.h) return false;
    }
    return true;
  }
  function canAutoPlace(grid, item) {
    const trial = {w: grid.w, h: grid.h, items: grid.items.map(i => ({...i}))};
    return autoPlace(trial, {...item});
  }
  function tidy(grid) {
    const trial = makeGrid(grid.w, grid.h);
    const ordered = grid.items.map((item, index) => ({item, index})).sort((a,b) => b.item.w*b.item.h-a.item.w*a.item.h || Math.max(b.item.w,b.item.h)-Math.max(a.item.w,a.item.h) || a.index-b.index);
    const positions = [];
    for (const {item} of ordered) {
      let found = null;
      for (let y=0; y<=grid.h-item.h && !found; y++) for (let x=0; x<=grid.w-item.w; x++) if (fits(trial,item,x,y)) {found={x,y};break;}
      if (!found) return false;
      place(trial,{...item},found.x,found.y); positions.push({item,...found});
    }
    for (const {item,x,y} of positions) {item.gx=x;item.gy=y;}
    return true;
  }
  function itemAt(grid, gx, gy) {
    for (const o of grid.items)
      if (gx >= o.gx && gx < o.gx + o.w && gy >= o.gy && gy < o.gy + o.h) return o;
    return null;
  }
  function place(grid, it, gx, gy) { it.gx = gx; it.gy = gy; grid.items.push(it); }
  function remove(grid, it) { const i = grid.items.indexOf(it); if (i >= 0) grid.items.splice(i, 1); }
  function autoPlace(grid, it) {
    /* merge into an existing stack first */
    if (it.kind === "consumable") {
      for (const o of grid.items) {
        if (o.kind === "consumable" && o.baseId === it.baseId && o.count < o.maxStack) {
          const space = o.maxStack - o.count, take = Math.min(space, it.count);
          o.count += take; it.count -= take;
          if (it.count <= 0) return true;
        }
      }
    }
    for (let y = 0; y <= grid.h - it.h; y++)
      for (let x = 0; x <= grid.w - it.w; x++)
        if (fits(grid, it, x, y)) { place(grid, it, x, y); return true; }
    return false;
  }

  /* --------------------------------------------------------- equip */
  const EQUIP_SLOTS = ["head", "chest", "gloves", "boots", "belt", "main", "off", "amulet", "ring1", "ring2"];
  function slotFor(it) {
    if (it.slot === "ring") return ["ring1", "ring2"];
    return [it.slot];
  }
  /* effective level requirement after any "Requirements -X%" affix on the item */
  function effReqLvl(it) {
    let rr = 0;
    if (it.affixes) for (const a of it.affixes) if (a.stat === "reqReduce") rr += a.val;
    return Math.max(1, Math.round((it.reqLvl || 1) * (1 - Math.min(80, rr) / 100)));
  }
  function canEquip(player, it) {
    return it.kind === "gear" && it.identified && player.lvl >= effReqLvl(it);
  }

  /* --------------------------------------------------------- vendors */
  function vendorStock(kind, plvl) {
    const items = [];
    if (kind === "arms") {
      for (let i = 0; i < 9; i++) {
        const rar = Math.random() < 0.3 ? "enhanced" : "common";
        const it = rollGear(Math.max(1, plvl + U.ri(-1, 1)), rar);
        it.identified = true;
        items.push(it);
      }
    } else { /* herbs */
      items.push(makeConsumable("hp1", 5), makeConsumable("mp1", 5), makeConsumable("tp", 3), makeConsumable("idscroll", 3));
      if (plvl >= 4) items.push(makeConsumable("hp2", 3), makeConsumable("mp2", 3));
      if (Math.random() < 0.5) items.push(makeConsumable("rejuv", 1));
      for (let i = 0; i < 3; i++) {
        const it = rollGear(Math.max(1, plvl), Math.random() < 0.4 ? "enhanced" : "common", { slot: U.pick(["ring", "amulet", "main"]) });
        it.identified = true;
        items.push(it);
      }
    }
    return items;
  }

  /* ordered glyph combinations create named works */
  function comboFor(item) {
    if (!item.sockets || item.sockets.includes(null)) return null;
    const side = item.slot === "main" ? "wpn" : "arm";
    for (const c of DATA.GLYPH_COMBOS) {
      if (c.side !== side) continue;
      if (c.glyphs.length !== item.sockets.length) continue;
      if (c.glyphs.every((g, i) => item.sockets[i] === g)) return c;
    }
    return null;
  }
  /* try to seat a glyph OR jewel in an item; returns {combo} on success, false otherwise */
  function socketGlyph(item, gem) {
    if (!item || item.kind !== "gear" || !item.sockets || !item.identified) return false;
    const i = item.sockets.indexOf(null);
    if (i < 0) return false;
    if (gem.kind === "jewel") {                 // jewels store their rolled affixes in the socket cell
      item.sockets[i] = { jewel: true, affixes: gem.affixes.map(a => ({...a})), name: gem.name, jcol: gem.jcol,
        ...(gem.uniqueId ? { uniqueId: gem.uniqueId, rarity: "unique" } : {}) };
      return { combo: null };
    }
    item.sockets[i] = gem.glyph;
    const c = comboFor(item);
    if (c && item.combo !== c.id) {
      item.combo = c.id;
      item.name = c.name + " " + item.baseName;
    }
    return { combo: c || null };
  }

  return {
    RARITY_COLOR, RARITY_ORDER, DROP_CONFIG,
    fromBase, makeConsumable, makeUnique, makeSetItem, makeGlyph, makeCharm, makeJewel, makeUniqueCharm, makeUniqueJewel, rollGear, rollDrops, rollRarity,
    uniqueMultiplier, rollGlyph, reforgeGlyph, eligibleSocketables,
    rollAffixesOnto, socketGlyph,
    value, sellValue, statLines,
    makeGrid, fits, itemAt, place, remove, autoPlace, canAutoPlace, tidy,
    EQUIP_SLOTS, slotFor, canEquip, effReqLvl, vendorStock,
  };
})();
