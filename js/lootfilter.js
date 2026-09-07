/* =========================================================================
   EMBERGRAVE — lootfilter.js
   A complete, display-only loot filter. It NEVER changes drop rates or the
   items themselves — it only decides how a dropped item is presented.

   Architecture (deliberately separated so each concern is testable on its own):
     1. itemProps()   — extract the filterable facts from a ground entry
     2. OPS / matchCond / matchRule — pure rule-evaluation logic
     3. PRESETS       — Show All / Standard / Strict / Endgame rule sets
     4. isProtected() — items that must never be auto-hidden
     5. evaluate()    — props → final display result (hide/colour/glow/beam/…)
     6. config + persistence (localStorage)  +  a small CRUD API for the UI

   PERFORMANCE: nothing here runs per-frame. game.js calls evaluate() once when
   an item drops (cached on gi.filt) and re-runs it for all ground items only
   when the active filter changes (LootFilter.bumpVersion / Game.refreshLoot).
   ========================================================================= */
"use strict";

const LootFilter = (() => {
  const SAVE_KEY = "embergrave_lootfilter";

  /* rarity ordinals mirror Items.RARITY_ORDER: common0 enhanced1 rare2 set3 unique4 */
  const RAR = (it) => (Items.RARITY_ORDER[it.rarity] || 0);
  const RARCOL = (r) => ["#cfcfcf", "#7a96ff", "#e8d060", "#58d878", "#d8924a"][r] || "#cfcfcf";

  /* ---------------------------------------------------------------- 1. item facts */
  /* Turn a ground entry {x,y,gold?|item?} into a flat, comparable property bag.
     Computed ONCE per drop; combat/loot code never re-derives this per frame. */
  function itemProps(gi) {
    if (gi.gold) {
      return { kind: "gold", name: "Gold", type: "gold", slot: "", rarity: 0, reqLvl: 0,
        power: 0, phys: 0, dmg: 0, armor: 0, value: gi.gold, mods: 0, modList: [],
        sockets: 0, craft: 0, quest: false, unique: false, legendary: false, marked: false, currency: true };
    }
    const it = gi.item, kind = it.kind;
    /* derived weapon / armour numbers include affix multipliers (display-only estimate) */
    let phys = 0, armor = 0;
    if (it.dmg) { let pct = 0, flat = 0, hiF = 0; for (const a of (it.affixes || [])) { if (a.stat === "dmgPct") pct += a.val; else if (a.stat === "dmgFlat") flat += a.val; else if (a.stat === "maxDmg") hiF += a.val; } phys = Math.floor(it.dmg[1] * (1 + pct / 100)) + flat + hiF; }
    if (it.armor) { let pct = 0, flat = 0; for (const a of (it.affixes || [])) { if (a.stat === "armorPct") pct += a.val; else if (a.stat === "armor") flat += a.val; } armor = Math.floor(it.armor * (1 + pct / 100)) + flat; }
    const r = RAR(it);
    const isSock = kind === "glyph" || kind === "jewel";           // socketables = crafting fodder
    return {
      kind,
      name: (it.identified ? it.name : it.baseName) || it.name || "",
      type: it.cat || kind,                                        // sword/axe/helm/… or glyph/charm/jewel/consumable
      slot: it.slot || "",
      rarity: r,
      reqLvl: (Items.effReqLvl ? Items.effReqLvl(it) : (it.reqLvl || 1)),
      power: it.ilvl || 1,
      phys, dmg: phys, armor,
      value: Items.value(it),
      mods: (it.affixes || []).length,
      modList: it.affixes || [],
      sockets: (it.sockets || []).length,
      craft: isSock ? 3 : (kind === "charm" ? 2 : ((it.sockets || []).length)),
      quest: !!it.quest,
      unique: it.rarity === "unique",
      legendary: it.rarity === "set",                              // EMBERGRAVE "sets" fill the legendary tier
      marked: !!it.marked,
      currency: kind === "consumable" && /scroll|tp|idscroll/.test(it.baseId || ""),
    };
  }

  /* ---------------------------------------------------------------- 2. conditions */
  const OPS = {
    ">=": (a, b) => a >= b, "<=": (a, b) => a <= b, ">": (a, b) => a > b, "<": (a, b) => a < b,
    "==": (a, b) => a == b, "!=": (a, b) => a != b,
    contains: (a, b) => String(a).toLowerCase().includes(String(b).toLowerCase()),
  };
  /* resolve a condition value that may reference the player level, e.g. "player", "player-10" */
  function resolveVal(v, player) {
    if (typeof v === "string") {
      const m = v.match(/^player\s*([-+]\s*\d+)?$/i);
      if (m) return (player ? player.lvl : 1) + (m[1] ? +m[1].replace(/\s/g, "") : 0);
      if (/^\d+$/.test(v)) return +v;
    }
    return v;
  }
  /* a single condition against the property bag */
  function matchCond(c, P, player) {
    switch (c.prop) {
      case "hasMod":   // value = affix stat key; optional c.min on the value
        return P.modList.some(a => a.stat === c.value && (c.min == null || a.val >= c.min));
      case "skill": {  // value = "any" | classId  → +to skills affixes
        const re = c.value === "any" ? /^skill(All|Class_|Tree_)/ : new RegExp("^skill(Class|Tree)_" + c.value);
        return P.modList.some(a => re.test(a.stat));
      }
      case "quest":     return !!P.quest === (c.value !== false);
      case "unique":    return !!P.unique === (c.value !== false);
      case "legendary": return !!P.legendary === (c.value !== false);
      case "name": case "type": case "slot":
        return (OPS[c.op] || OPS["=="])(P[c.prop], c.value);
      default: {       // numeric props
        const op = OPS[c.op] || OPS[">="];
        return op(P[c.prop] || 0, resolveVal(c.value, player));
      }
    }
  }
  /* a rule matches when its conditions satisfy its AND/OR logic.
     A rule with NO conditions is a catch-all (matches everything). */
  function matchRule(rule, P, player) {
    if (!rule.enabled) return false;
    const cs = rule.conditions || [];
    if (!cs.length) return true;
    const test = c => matchCond(c, P, player);
    return rule.logic === "OR" ? cs.some(test) : cs.every(test);
  }

  /* ---------------------------------------------------------------- 4. protected */
  /* These can never be auto-hidden (override any hide rule). */
  function isProtected(P) {
    return P.quest || P.unique || P.legendary || P.marked || P.currency
      || (P.kind === "glyph" && P.unique)      // unique glyphs = exceptional craft mats
      || (P.kind === "jewel" && P.unique);
  }

  /* ---------------------------------------------------------------- base display */
  /* What a SHOWN item looks like before any custom rule overrides it. */
  function baseDisplay(P) {
    const d = { hide: false, color: P.kind === "gold" ? "#d8b860" : RARCOL(P.rarity), size: 1, glow: null, beam: null, minimap: null, sound: null, rule: "" };
    if (P.unique) { d.glow = "#d8924a"; d.beam = "#d8924a"; d.minimap = "#ffb060"; d.sound = "dropUnique"; d.size = 1.15; }
    else if (P.legendary) { d.glow = "#58d878"; d.beam = "#58d878"; d.minimap = "#7dffa0"; d.sound = "dropUnique"; d.size = 1.1; }
    else if (P.rarity >= 2) { d.minimap = "#e8d060"; }    // rare → minimap dot
    return d;
  }

  /* ---------------------------------------------------------------- 3. presets */
  /* Presets are ordered rule lists. Rules are evaluated top→bottom; the FIRST
     match decides the display (its action is merged over the base display).
     `hide:true` actions are ignored for protected items (see evaluate). */
  const A_HIDE = { hide: true };
  const PRESETS = {
    showall: { name: "Show All", rules: [] },   // no rules → everything shown via base display

    standard: { name: "Standard", rules: [
      { name: "Keep good rarity", enabled: true, logic: "OR", conditions: [{ prop: "rarity", op: ">=", value: 2 }], action: {} },
      { name: "Keep socketables & charms", enabled: true, logic: "OR", conditions: [{ prop: "type", op: "==", value: "glyph" }, { prop: "type", op: "==", value: "jewel" }, { prop: "type", op: "==", value: "charm" }], action: {} },
      { name: "Keep socketed gear", enabled: true, logic: "AND", conditions: [{ prop: "sockets", op: ">=", value: 1 }], action: {} },
      { name: "Hide weak commons", enabled: true, logic: "AND", conditions: [{ prop: "rarity", op: "<=", value: 0 }], action: A_HIDE },
    ] },

    strict: { name: "Strict", rules: [
      { name: "Hide common & magic", enabled: true, logic: "AND", conditions: [{ prop: "rarity", op: "<=", value: 1 }, { prop: "sockets", op: "<", value: 2 }, { prop: "type", op: "!=", value: "glyph" }, { prop: "type", op: "!=", value: "jewel" }], action: A_HIDE },
      { name: "Highlight rares", enabled: true, logic: "AND", conditions: [{ prop: "rarity", op: "==", value: 2 }], action: { glow: "#e8d060", minimap: "#e8d060" } },
    ] },

    endgame: { name: "Endgame", rules: [
      { name: "Keep set & unique", enabled: true, logic: "OR", conditions: [{ prop: "rarity", op: ">=", value: 3 }], action: { beam: "#d8924a" } },
      { name: "Keep powerful rares (4+ mods)", enabled: true, logic: "AND", conditions: [{ prop: "rarity", op: ">=", value: 2 }, { prop: "mods", op: ">=", value: 4 }], action: { glow: "#e8d060", minimap: "#e8d060" } },
      { name: "Keep rare craft mats", enabled: true, logic: "OR", conditions: [{ prop: "type", op: "==", value: "jewel" }, { prop: "craft", op: ">=", value: 3 }], action: {} },
      { name: "Hide everything else", enabled: true, logic: "OR", conditions: [{ prop: "rarity", op: ">=", value: 0 }], action: A_HIDE },
    ] },
  };

  /* ---------------------------------------------------------------- config + state */
  let version = 1;                 // bumped whenever the active filter changes (game re-evals ground)
  const config = {
    preset: "standard",            // one of PRESETS keys, or "custom"
    rules: [],                     // editable rules (used when preset === "custom")
    enabled: true,                 // master on/off
    revealKey: "alt",              // hold to temporarily reveal hidden items (faded)
  };
  let revealing = false;           // live state of the temp-reveal key

  function activeRules() {
    if (!config.enabled) return [];
    if (config.preset === "custom") return config.rules;
    return (PRESETS[config.preset] || PRESETS.showall).rules;
  }

  /* ---------------------------------------------------------------- 5. evaluate */
  /* The one public entry point loot rendering uses. Returns a display result;
     callers cache it on the ground entry and only re-call on change. */
  function evaluate(gi, player) {
    const P = gi._props || (gi._props = itemProps(gi));
    const d = baseDisplay(P);
    for (const rule of activeRules()) {
      if (matchRule(rule, P, player)) {
        const a = rule.action || {};
        if (a.hide) d.hide = true;
        if (a.color) d.color = a.color;
        if (a.size != null) d.size = a.size;
        if (a.glow !== undefined) d.glow = a.glow;
        if (a.beam !== undefined) d.beam = a.beam;
        if (a.minimap !== undefined) d.minimap = a.minimap;
        if (a.sound !== undefined) d.sound = a.sound;
        d.rule = rule.name || "";
        break;                      // first matching rule wins
      }
    }
    d.protected = isProtected(P);
    if (d.protected) d.hide = false;          // protected items are never auto-hidden
    return d;
  }

  /* ---------------------------------------------------------------- persistence */
  function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify({ preset: config.preset, rules: config.rules, enabled: config.enabled, revealKey: config.revealKey })); } catch (e) {} }
  function load() {
    try {
      const o = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
      if (o) { config.preset = o.preset || "standard"; config.rules = o.rules || []; config.enabled = o.enabled !== false; config.revealKey = o.revealKey || "alt"; }
    } catch (e) {}
  }

  /* ---------------------------------------------------------------- 6. CRUD API (for the UI) */
  const uid = () => "r" + (Math.random() * 1e9 | 0).toString(36);
  function bump() { version++; save(); }
  /* switching to a custom rule set seeds it from the current preset so edits start from something sensible */
  function ensureCustom() {
    if (config.preset !== "custom") { config.rules = JSON.parse(JSON.stringify((PRESETS[config.preset] || PRESETS.showall).rules)); config.preset = "custom"; }
    config.rules.forEach(r => { if (!r.id) r.id = uid(); });
  }
  return {
    PRESETS, OPS,
    /* read */
    get config() { return config; },
    get version() { return version; },
    get revealing() { return revealing; },
    presetList: () => Object.keys(PRESETS).map(k => ({ key: k, name: PRESETS[k].name })),
    itemProps, isProtected, evaluate,
    /* lifecycle */
    init() { load(); config.rules.forEach(r => { if (!r.id) r.id = uid(); }); },
    bumpVersion: bump,
    setReveal(on) { revealing = !!on; },
    /* preset / master toggle */
    setPreset(key) { if (key === "custom") ensureCustom(); else config.preset = key; bump(); },
    setEnabled(on) { config.enabled = !!on; bump(); },
    setRevealKey(k) { config.revealKey = (k || "alt").toLowerCase(); save(); },
    /* rules (these auto-switch to a custom set) */
    rules: () => config.preset === "custom" ? config.rules : (PRESETS[config.preset] || PRESETS.showall).rules,
    addRule(r) { ensureCustom(); config.rules.push(Object.assign({ id: uid(), name: "New Rule", enabled: true, logic: "AND", conditions: [], action: {} }, r || {})); bump(); },
    editRule(id, patch) { ensureCustom(); const r = config.rules.find(x => x.id === id); if (r) Object.assign(r, patch); bump(); },
    deleteRule(id) { ensureCustom(); config.rules = config.rules.filter(x => x.id !== id); bump(); },
    duplicateRule(id) { ensureCustom(); const i = config.rules.findIndex(x => x.id === id); if (i >= 0) { const c = JSON.parse(JSON.stringify(config.rules[i])); c.id = uid(); c.name += " (copy)"; config.rules.splice(i + 1, 0, c); } bump(); },
    moveRule(id, dir) { ensureCustom(); const i = config.rules.findIndex(x => x.id === id), j = i + dir; if (i >= 0 && j >= 0 && j < config.rules.length) { const t = config.rules[i]; config.rules[i] = config.rules[j]; config.rules[j] = t; } bump(); },
    reset() { config.preset = "standard"; config.rules = []; config.enabled = true; bump(); },
    /* import / export (plain JSON the player can copy out / paste in) */
    exportJSON() { return JSON.stringify({ preset: config.preset, rules: config.rules, enabled: config.enabled, revealKey: config.revealKey }, null, 2); },
    importJSON(txt) { try { const o = JSON.parse(txt); config.preset = o.preset || "custom"; config.rules = o.rules || []; config.enabled = o.enabled !== false; config.revealKey = o.revealKey || "alt"; config.rules.forEach(r => { if (!r.id) r.id = uid(); }); bump(); return true; } catch (e) { return false; } },
  };
})();
