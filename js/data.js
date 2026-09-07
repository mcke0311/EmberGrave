/* =========================================================================
   EMBERGRAVE — data.js
   All game content as plain data: classes, skills, item bases, affixes,
   uniques, enemies, elite modifiers, quests, NPC dialogue, map metadata.
   Everything here is original IP. Systems read this; they never hardcode it.
   ========================================================================= */
"use strict";

const DATA = {};

/* New-game equipment is also the minimum strict authored player-art slice.
   Keeping these IDs in data lets the compiler and runtime bind the same five
   starter loadouts without duplicating class-condition heuristics. */
DATA.PLAYER_STARTER_LOADOUTS = {
  vanguard:    { main: "shortsword", chest: "quiltvest" },
  emberwitch:  { main: "gnarlwand",  chest: "quiltvest" },
  gravebinder: { main: "gnarlwand",  chest: "quiltvest" },
  wildkeeper:  { main: "ashstaff",   chest: "quiltvest" },
  veilranger:  { main: "huntbow",    chest: "quiltvest" },
};

/* =====================  CLASSES  ===================== */
DATA.CLASSES = {
  vanguard: {
    id: "vanguard", name: "Vanguard", playable: true,
    desc: "A heavily armed line-breaker of the old border legions. Masters steel, war-shouts, and brutal assaults.",
    baseStats: { str: 25, dex: 18, vit: 24, wil: 10 },
    baseHp: 52, baseMana: 16,
    /* plated line-breaker: steel armor, gold trim, blue tabard + glowing crystal sigil, red cape */
    palette: { skin: "#caa183", armor: "#8f9ca5", trim: "#caa44a", cloth: "#1a2430", hair: "#2c2018", eye: "#9ee7ff" },
    spriteStyle: "vanguard",
    weapon: "sword",
    trees: ["Arms", "Warcries", "Assault"],
  },
  emberwitch: {
    id: "emberwitch", name: "Ember Witch", playable: true,
    desc: "An exiled elementalist who bargains with flame, frost and storm. Fragile, and rarely in reach long enough for it to matter.",
    baseStats: { str: 10, dex: 16, vit: 18, wil: 33 },
    baseHp: 40, baseMana: 38,
    /* charred ember-cultist: near-black gold-embroidered robes, ashen cracked face, red eyes */
    palette: { robe: "#1b1820", armor: "#1b1820", trim: "#b8923c", skin: "#7c7a74", cloth: "#100e12", hair: "#15110d", eye: "#ff3422" },
    spriteStyle: "ember",
    weapon: "wand",
    trees: ["Cinder", "Rime", "Tempest"],
  },
  gravebinder: {
    id: "gravebinder", name: "Gravebinder", playable: true,
    desc: "A forbidden necrotheurge who raises the dead, hexes the living, and wastes no corpse. The Marches gave him plenty to work with.",
    baseStats: { str: 14, dex: 14, vit: 22, wil: 26 },
    baseHp: 46, baseMana: 30,
    /* hooded necrotheurge: dark violet gold-trimmed robe, pale hair, deathlight-green eyes */
    palette: { robe: "#241a32", armor: "#241a32", trim: "#c7b06a", skin: "#b89078", cloth: "#140f1c", hair: "#cfcabf", eye: "#62ff9a" },
    spriteStyle: "necro",
    weapon: "wand",
    trees: ["Bonecraft", "Hex", "Rot"],
  },
  wildkeeper: {
    id: "wildkeeper", name: "Wildkeeper", playable: true,
    desc: "A warden of the deep groves who never walks alone. Beast-caller, storm-singer, and — when the green anger takes him — something with considerably more teeth.",
    baseStats: { str: 20, dex: 16, vit: 24, wil: 20 },
    baseHp: 50, baseMana: 26,
    /* antlered druid: mossy robe, brown leather, bark shoulders, green leaf-magic + eyes */
    palette: { skin: "#c89a78", armor: "#33401d", trim: "#7fa85a", cloth: "#3a2a16", hair: "#4a3420", eye: "#7dff81" },
    spriteStyle: "wild",
    weapon: "staff",
    trees: ["Wildkin", "Stormcall", "Wildshape"],
  },
  veilranger: {
    id: "veilranger", name: "Veil Ranger", playable: true,
    desc: "A ghost-quiet huntress of the border fens. Arrows that don't miss, snares that don't forgive, and a talent for not being there.",
    baseStats: { str: 14, dex: 30, vit: 20, wil: 16 },
    baseHp: 46, baseMana: 24,
    /* hooded masked assassin: black leather, purple trim, dark cloak, glowing blue eyes */
    palette: { skin: "#c8a088", armor: "#20212b", trim: "#7a52b0", cloth: "#14151e", hair: "#2a2230", eye: "#7fcaff" },
    spriteStyle: "veil",
    weapon: "bow",
    trees: ["Precision", "Snares", "Veil"],
  },
};

/* =====================  VANGUARD SKILLS  =====================
   type: melee | sweep | spin | dash | leap | nova | buff | passive
   Values are functions of rank (rk >= 1). Synergy: bonus per rank in another skill. */
DATA.SKILLS = {};
DATA.TREE_NAMES = ["Arms", "Warcries", "Assault"]; /* legacy fallback; classes carry their own tree names */
DATA.BASIC_ATTACK = { id: "basic", name: "Attack", type: "melee", icon: "basic", mana: () => 0, dmgMult: () => 1, desc: () => "A standard attack with your equipped weapon." };

/* =====================  FIVE CLASS SKILL KITS  =====================
   The curated kits below contain 107 talents across 15 disciplines. Archetype
   makers provide the fields consumed by combat; later rows unlock at higher
   character levels and link to prerequisites. Every invested rank costs one
   talent point. skill_perks.js adds choices at invested ranks 5 and 10. */
(function buildSkills() {
  const pct = m => Math.round(m * 100);
  const scale = (st, rk) => { const o = {}; for (const k in st) o[k] = Math.round(st[k] * rk); return o; };
  const statList = st => Object.entries(st).filter(([, v]) => v !== 0).map(([k, v]) => DATA.STAT_TEXT[k] ? DATA.STAT_TEXT[k](v) : `+${v} ${k}`).join(", ");
  const R = (lo, hi) => `${Math.round(lo)}–${Math.round(hi)}`;
  /* dmg helpers: weapon% from base/grow; flat roll from lo/loG/hi/hiG */
  const wM = s => rk => s.base + (s.grow || 0) * rk;
  const dR = s => rk => [s.lo + (s.loG || 0) * rk, s.hi + (s.hiG || 0) * rk];
  const gv = (b, g) => rk => b + (g || 0) * rk;

  /* ---- archetype makers: each turns a compact spec into the fields its
     performSkill case reads, plus desc(rk). ---- */
  const A = {
    /* generic weapon / spell shapes (reused across classes) */
    melee: s => ({ type: "melee", mana: gv(s.mana || 1, 0), dmgMult: wM(s), arBonus: gv(0, s.ar || 12), quarryOnHit: s.quarryOnHit,
      desc: rk => `A precise strike for ${pct(s.base + (s.grow || 0) * rk)}% weapon damage${s.quarryOnHit ? ", marking the target" : ""}.` }),
    sweep: s => ({ type: "sweep", mana: gv(s.mana || 3, 0), dmgMult: wM(s), arc: gv(s.arc || 2.6, 0), range: gv(s.range || 2.2, 0),
      desc: rk => `Sweep all foes in an arc for ${pct(s.base + (s.grow || 0) * rk)}% weapon damage.` }),
    spin: s => ({ type: "spin", mana: gv(s.mana || 6, 0), dmgMult: wM(s), dur: gv(s.dur || 1.8, 0), radius: gv(s.rad || 2.2, 0),
      desc: rk => `Whirl through everything nearby for ${pct(s.base + (s.grow || 0) * rk)}% weapon damage repeatedly.` }),
    leap: s => ({ type: "leap", mana: gv(s.mana || 8, 0), dmgMult: wM(s), radius: gv(s.rad || 2.6, 0), leapRange: gv(s.range || 8, 0),
      desc: rk => `Leap and crash down for ${pct(s.base + (s.grow || 0) * rk)}% weapon damage, stunning and knocking back nearby foes.` }),
    wfan: s => ({ type: "wfan", mana: gv(s.mana || 4, 0), count: rk => (s.count || 3) + Math.floor(rk / 4), spread: gv(s.spread || 0.5, 0), dmgMult: wM(s), quarryOnHit: s.quarryOnHit,
      desc: rk => `Loose ${(s.count || 3) + Math.floor(rk / 4)} arrows, each ${pct(s.base + (s.grow || 0) * rk)}% weapon damage${s.quarryOnHit ? "; each can mark" : ""}.` }),
    wpierce: s => ({ type: "wpierce", mana: gv(s.mana || 6, 0), dmgMult: wM(s), desc: rk => `One arrow pierces the whole line for ${pct(s.base + (s.grow || 0) * rk)}% weapon damage each.` }),
    passive: s => ({ type: "passive", pStats: rk => scale(s.stats || {}, rk), desc: rk => `Passive: ${statList(scale(s.stats || {}, rk)) || "a hidden art"}.${s.note ? " " + s.note : ""}` }),
    buff: s => ({ type: "buff", mana: gv(s.mana || 5, 0), retal: s.retal ? gv(s.retal, s.retalG || 1) : undefined,
      buff: rk => ({ id: s.id, label: s.label, emoji: s.emoji || "✦", dur: (s.dur || 25) + (s.durG || 5) * rk, stats: scale(s.stats || {}, rk) }),
      desc: rk => `For ${(s.dur || 25) + (s.durG || 5) * rk}s: ${statList(scale(s.stats || {}, rk))}${s.retal ? `; melee attackers take ${s.retal + (s.retalG || 1) * rk} cold + chill` : ""}.` }),
    projectile: s => ({ type: "projectile", mana: gv(s.mana || 2, 0), elem: s.el, proj: s.proj || "shardbolt", projSpeed: s.spd || 11, sound: s.sound || "firebolt",
      dmg: dR(s), burn: s.el === "fire" ? gv(1, 0.4) : undefined, chill: s.el === "cold" ? gv(2, 0) : undefined, pdot: s.pdot ? gv(s.pdot, s.pdotG || 0) : undefined, drain: s.drain ? gv(0.4, 0) : undefined,
      scorch: s.scorch ? gv(s.scorch, s.scorchG || 0) : undefined, buildStatic: s.buildStatic,
      desc: rk => `Hurl ${s.el || "a bolt"} for ${R(s.lo + (s.loG || 0) * rk, s.hi + (s.hiG || 0) * rk)} damage${s.scorch ? ", stacking Scorch" : ""}${s.drain ? ", draining 40% as life" : ""}.` }),
    fan: s => ({ type: "fan", mana: rk => (s.mana || 4) + Math.floor(rk / 3), elem: s.el, proj: s.proj || "shardbolt", projSpeed: s.spd || 10, sound: s.sound || "firebolt",
      count: rk => (s.count || 3) + Math.floor(rk / (s.countEvery || 4)), spread: gv(s.spread || 0.6, 0), scatter: s.scatter, wander: s.wander, projTtl: s.projTtl ? gv(s.projTtl, 0) : undefined, dmg: dR(s),
      scorch: s.scorch ? gv(s.scorch, s.scorchG || 0) : undefined, buildStatic: s.buildStatic, burn: s.el === "fire" ? gv(1, 0.4) : undefined,
      desc: rk => `Loose ${(s.count || 3) + Math.floor(rk / (s.countEvery || 4))} ${s.el} bolts, each ${R(s.lo + (s.loG || 0) * rk, s.hi + (s.hiG || 0) * rk)}${s.buildStatic ? "; each hit builds Static" : ""}.` }),
    pierce: s => ({ type: "pierce", mana: gv(s.mana || 7, 0), elem: s.el, proj: "lance", projSpeed: 13, sound: s.sound || "frost", dmg: dR(s), chill: s.el === "cold" ? gv(2.5, 0) : undefined,
      desc: rk => `Drive a spike through everything in line for ${R(s.lo + (s.loG || 0) * rk, s.hi + (s.hiG || 0) * rk)} ${s.el} damage.` }),
    chain: s => ({ type: "chain", mana: gv(s.mana || 5, 0), elem: s.el, proj: s.proj || "shardbolt", projSpeed: s.spd || 11, sound: s.sound || "firebolt", jumps: rk => (s.jumps || 2) + Math.floor(rk / 3), dmg: dR(s), chill: s.el === "cold" ? gv(2, 0) : undefined,
      desc: rk => `A bolt that leaps between ${1 + (s.jumps || 2)} foes for ${R(s.lo + (s.loG || 0) * rk, s.hi + (s.hiG || 0) * rk)} ${s.el} each.` }),
    lightning: s => ({ type: "lightning", mana: gv(s.mana || 5, 0), elem: "light", sound: "zap", jumps: rk => (s.jumps || 2) + Math.floor(rk / 3), dmg: dR(s),
      desc: rk => `An instant fork of lightning through ${1 + (s.jumps || 2) + Math.floor(rk / 3)} foes for ${R(s.lo + (s.loG || 0) * rk, s.hi + (s.hiG || 0) * rk)} each.` }),
    meteor: s => ({ type: "meteor", mana: gv(s.mana || 12, 0), elem: s.el, castRange: gv(9, 0), radius: gv(s.rad || 2.8, 0.07), delay: gv(s.delay || 0.7, 0), dmg: dR(s), burn: s.el === "fire" ? gv(2, 1) : undefined, stun: s.stun ? gv(s.stun, 0) : undefined,
      desc: rk => `Mark a point; a strike falls for ${R(s.lo + (s.loG || 0) * rk, s.hi + (s.hiG || 0) * rk)} ${s.el} damage in ${((s.rad || 2.8) + 0.07 * rk).toFixed(1)}y.` }),
    blast: s => ({ type: "blast", mana: gv(s.mana || 8, 0), elem: s.el, sound: "blast", castRange: gv(9, 0), radius: gv(s.rad || 2.2, 0.08), dmg: dR(s), burn: s.el === "fire" ? gv(2, 1) : undefined, pdot: s.el === "poison" ? gv(5, 2) : undefined,
      desc: rk => `Detonate ${s.el} at a point: ${R(s.lo + (s.loG || 0) * rk, s.hi + (s.hiG || 0) * rk)} in ${((s.rad || 2.2) + 0.08 * rk).toFixed(1)}y.` }),
    spellnova: s => ({ type: "spellnova", mana: gv(s.mana || 7, 0), elem: s.el, sound: s.el === "cold" ? "frost" : "zap", radius: gv(s.rad || 3, 0.12), dmg: dR(s), slowPct: s.el === "cold" ? gv(50, 0) : undefined, slowDur: s.el === "cold" ? gv(2.5, 0) : undefined,
      desc: rk => `A ring of ${s.el}: ${R(s.lo + (s.loG || 0) * rk, s.hi + (s.hiG || 0) * rk)} in ${((s.rad || 3) + 0.12 * rk).toFixed(1)}y.` }),
    curse: s => ({ type: "curse", mana: gv(s.mana || 4, 0), curse: s.curse, radius: gv(s.rad || 2.6, 0.1), dur: gv(s.dur || 8, 1), pct: gv(s.pct || 20, s.pctG || 4), slowPct: s.slow ? gv(s.slow, s.slowG || 2) : undefined,
      desc: rk => s.curse === "frailty" ? `Hex foes: +${(s.pct || 20) + (s.pctG || 4) * rk}% damage taken for ${(s.dur || 8) + rk}s.` : `Hex foes: ${(s.slow || 0) + (s.slowG || 2) * rk}% slower and ${(s.pct || 15) + (s.pctG || 3) * rk}% weaker for ${(s.dur || 8) + rk}s.` }),
    corpse: s => ({ type: "corpse", mana: gv(s.mana || 8, 0), elem: s.el || "poison", castRange: gv(9, 0), radius: gv(s.rad || 2.3, 0.07), dmg: dR(s),
      desc: rk => `Detonate a nearby corpse for ${R(s.lo + (s.loG || 0) * rk, s.hi + (s.hiG || 0) * rk)} damage.` }),
    summon: s => ({ type: "summon", mana: gv(s.mana || 6, 0), minion: s.minion, needsCorpse: s.corpse, castRange: gv(9, 0), cap: rk => (s.cap || 1) + Math.floor(rk / (s.capEvery || 5)),
      minionStats: rk => ({ hp: s.mhp + (s.mhpG || 0) * rk, dmg: [s.mlo + (s.mloG != null ? s.mloG : 1) * rk, s.mhi + (s.mhiG != null ? s.mhiG : 2) * rk], speed: s.mspeed || 3.2, atkRate: s.matk || 1.0, range: s.ranged ? (s.mrange || 7) : 0.9, projectile: s.ranged ? (s.proj || "venom") : undefined, sprite: s.sprite, name: s.mname, taunt: s.taunt, slamStun: s.slamStun, pdot: s.mpdot, untargetable: s.untargetable, groundImmune: s.groundImmune }),
      desc: rk => `Raise up to ${(s.cap || 1) + Math.floor(rk / (s.capEvery || 5))} ${s.label || "servants"} — ${s.mhp + (s.mhpG || 0) * rk} life, ${Math.round(s.mlo + (s.mloG != null ? s.mloG : 1) * rk)}–${Math.round(s.mhi + (s.mhiG != null ? s.mhiG : 2) * rk)} damage${s.corpse ? ", consuming a corpse" : ""}.` }),
    minionbuff: s => ({ type: "minionbuff", mana: gv(s.mana || 9, 0), dur: gv(s.dur || 10, 1), dmgBuff: gv(s.dmgBuff || 25, s.dmgBuffG || 5), heal: gv(s.heal || 100, s.healG || 0), cd: s.cd ? gv(s.cd, 0) : undefined,
      desc: rk => `Heal your servants ${(s.heal || 100) + (s.healG || 0) * rk}% and enrage them: +${(s.dmgBuff || 25) + (s.dmgBuffG || 5) * rk}% damage for ${(s.dur || 10) + rk}s.${s.cd ? ` (${s.cd}s cooldown)` : ""}` }),
    fireclaw: s => ({ type: "fireclaw", mana: gv(s.mana || 12, 0), requiresForm: true, cd: gv(s.cd || 1.5, 0), dmg: dR(s), dmgBoost: gv(s.dmgPct || 12, s.dmgPctG || 6), dur: gv(s.dur || 8, s.durG || 1), waveRange: gv(s.range || 5, 0), explosions: rk => (s.booms || 3) + Math.floor(rk / 5), boomRadius: gv(s.boomRad || 1.9, 0), meleeMult: gv(s.melee || 1.3, s.meleeG || 0.05),
      desc: rk => `Only while shapeshifted. Claw your target for ${pct((s.melee || 1.3) + (s.meleeG || 0.05) * rk)}% weapon damage, then ${(s.booms || 3) + Math.floor(rk / 5)} fire explosions ripple outward one after another (each ${R(s.lo + (s.loG || 0) * rk, s.hi + (s.hiG || 0) * rk)}, and they stack); for ${(s.dur || 8) + (s.durG || 1) * rk}s ALL your damage becomes Fire and deals +${(s.dmgPct || 12) + (s.dmgPctG || 6) * rk}%.` }),
    trap: s => ({ type: "trap", mana: gv(s.mana || 4, 0), trapKind: s.trapKind || "barbed", castRange: gv(7, 0), dmg: dR(s), radius: gv(s.rad || 1.8, 0), slowPct: s.slow ? gv(s.slow, 0) : undefined, slowDur: s.slow ? gv(s.slowDur || 2.5, 0) : undefined, burn: s.el === "fire" ? gv(2, 1) : undefined, elem: s.el,
      desc: rk => `Plant a snare: ${R(s.lo + (s.loG || 0) * rk, s.hi + (s.hiG || 0) * rk)} ${s.el || ""} damage${s.slow ? `, ${s.slow}% slow` : ""} when sprung.` }),
    blink: s => ({ type: "blink", mana: gv(s.mana || 4, 0), blinkRange: gv(s.range || 5, 0.4), desc: rk => `Slip through shadow up to ${((s.range || 5) + 0.4 * rk).toFixed(1)}y away.` }),
    form: s => ({ type: "form", mana: gv(s.mana || 8, 0), form: s.form, dur: gv(s.dur || 18, s.durG || 2), formStats: rk => scale(s.stats || {}, rk),
      desc: rk => `Take ${s.label || ({ fang: "wolf", brute: "bear", stone: "stone guardian", apex: "primal apex" })[s.form]} shape for ${(s.dur || 18) + (s.durG || 2) * rk}s: ${statList(scale(s.stats || {}, rk))}. Re-cast to revert.` }),
    rabies: s => ({ type: "rabies", mana: gv(s.mana || 6, 0), dmgMult: wM(s), poisonDps: gv(s.pdps || 6, s.pdpsG || 2), dur: gv(s.dur || 8, 0), cloudRad: gv(s.cloudRad || 2.4, 0),
      desc: rk => `A rabid bite: ${pct(s.base + (s.grow || 0) * rk)}% weapon damage, then poison dealing HALF the bite's damage per second over ${s.dur || 8}s. A poisoned foe that dies bursts into a contagious cloud that infects the rest.` }),

    /* ===== Vanguard ===== */
    combo: s => ({ type: "combo", mana: gv(s.mana || 2, 0), dmgMult: wM(s), desc: rk => `${pct(s.base + (s.grow || 0) * rk)}% weapon damage; builds +1 Tempo (cap 3).` }),
    combo_finish: s => ({ type: "combo_finish", mana: gv(s.mana || 6, 0), dmgMult: wM(s), arc: gv(s.arc || 2.4, 0), range: gv(s.range || 2.3, 0), shredDur: gv(s.shredDur || 6, 0),
      desc: rk => `Spend all Tempo: a fan of cleaves (up to ${pct((s.base + (s.grow || 0) * rk) * 1.65)}% weapon damage) that shreds armor (+phys taken).` }),
    execute: s => ({ type: "execute", mana: gv(s.mana || 8, 0), base: wM(s), missingHpBonus: gv(s.miss || 2.5, 0), baseThresh: gv(s.thresh || 0.15, 0.01), cd: gv(s.cd || 6, 0),
      desc: rk => `Overhead: ${pct(s.base + (s.grow || 0) * rk)}% +up to ${pct(s.miss || 2.5)}% from missing HP; instant-kills non-bosses below ${Math.round((s.thresh || 0.15 + 0.01 * rk) * 100)}%. Spends Tempo; kills refund it.` }),
    shout: s => ({ type: "shout", mana: gv(s.mana || 4, 0), healPct: gv(s.healPct || 12, s.healG || 1.2), runPct: gv(s.runPct || 20, s.runG || 1), rallyDur: gv(s.rallyDur || 4, 0), radius: gv(s.radius || 5, 0),
      desc: rk => `Heal ${Math.round((s.healPct || 12) + (s.healG || 1.2) * rk)}% life, cleanse slows, +${Math.round((s.runPct || 20) + (s.runG || 1) * rk)}% move for ${s.rallyDur || 4}s; heals nearby minions.` }),
    fear: s => ({ type: "fear", mana: gv(s.mana || 7, 0), radius: gv(s.radius || 4, s.radG || 0.2), dur: gv(s.dur || 2.5, s.durG || 0.2),
      desc: rk => `Foes within ${((s.radius || 4) + (s.radG || 0.2) * rk).toFixed(1)}y flee for ${((s.dur || 2.5) + (s.durG || 0.2) * rk).toFixed(1)}s (bosses slowed).` }),
    combat_stance: s => ({ type: "combat_stance", mana: gv(s.mana || 4, 0), stanceId: s.stanceId, stats: rk => scale(s.stats || {}, rk), rootArmor: s.rootArmor ? gv(s.rootArmor, 0) : undefined,
      desc: rk => `Toggle: ${statList(scale(s.stats || {}, rk))}.${s.stanceId === "berserk" ? " Builds Tempo faster but exposes you." : s.stanceId === "bulwark" ? " Hardens further while you hold ground." : ""}` }),
    parry_stance: s => ({ type: "parry_stance", mana: gv(s.mana || 4, 0), stanceId: "riposte", riposteMult: wM(s), stunDur: gv(s.stun || 0.8, 0), drainPerSec: gv(s.drain || 3, 0),
      desc: rk => `Toggle: parry the next melee blow and counter for ${pct(s.base + (s.grow || 0) * rk)}% weapon damage + stun. Drains aether.` }),
    charge: s => ({ type: "charge", mana: gv(s.mana || 4, 0), chargeRange: gv(s.range || 7, s.rangeG || 0.3), mult: wM(s), width: gv(s.width || 1.3, 0), kbForce: gv(s.kb || 1.5, 0), stunDur: gv(s.stun || 0.8, 0),
      desc: rk => `Barrel ${((s.range || 7) + (s.rangeG || 0.3) * rk).toFixed(0)}y in a lane, ${pct(s.base + (s.grow || 0) * rk)}% weapon damage + knock-aside; first foe stunned.` }),
    grapple: s => ({ type: "grapple", mana: gv(s.mana || 5, 0), grappleRange: gv(s.range || 8, s.rangeG || 0.3), stunDur: gv(s.stun || 1.0, s.stunG || 0.06), mult: wM(s),
      desc: rk => `Yank a foe to you (stun + ${pct(s.base + (s.grow || 0) * rk)}% weapon damage); vs bosses, pull yourself to them.` }),
    thrown: s => ({ type: "thrown", mana: gv(s.mana || 3, 0), throwRange: gv(s.range || 8, s.rangeG || 0.3), mult: wM(s), count: rk => (s.count || 1) + Math.floor(rk / 4),
      desc: rk => `Hurl ${(s.count || 1) + Math.floor(rk / 4)} spinning blade(s) that pierce out and back, ${pct(s.base + (s.grow || 0) * rk)}% weapon damage per pass.` }),
    shockwave: s => ({ type: "shockwave", mana: gv(s.mana || 6, 0), range: gv(s.range || 7, s.rangeG || 0), waveWidth: gv(s.width || 1.5, 0), stun: gv(s.stun || 1.0, s.stunG || 0), mult: s.base ? wM(s) : undefined, elem: s.el, dmg: s.lo !== undefined ? dR(s) : undefined,
      desc: rk => `A crack races ${(s.range || 7) + (s.rangeG || 0) * rk}y outward, erupting on every foe it crosses${s.base ? ` for ${pct(s.base + (s.grow || 0) * rk)}% weapon damage` : ` for ${R(s.lo + (s.loG || 0) * rk, s.hi + (s.hiG || 0) * rk)} earth`} + stun.` }),
    bash: s => ({ type: "bash", mana: gv(s.mana || 5, 0), arc: gv(s.arc || 2.0, 0), range: gv(s.range || 2.3, 0), dmgMult: wM(s), knockback: gv(s.kb || 3, 0),
      desc: rk => `Shield-bash cone: ${pct(s.base + (s.grow || 0) * rk)}% weapon damage + heavy knockback (longer stun on a wall).` }),
    banner: s => ({ type: "banner", mana: gv(s.mana || 6, 0), radius: gv(s.radius || 4, 0), dur: gv(s.dur || 30, 0), allyDmg: gv(s.allyDmg || 12, s.allyDmgG || 1), allyIas: gv(s.allyIas || 8, s.allyIasG || 0.6), enemyDmg: gv(s.enemyDmg || 12, s.enemyDmgG || 0.8),
      desc: rk => `Plant a banner: allies inside +${Math.round((s.allyDmg || 12) + (s.allyDmgG || 1) * rk)}% damage & +${Math.round((s.allyIas || 8) + (s.allyIasG || 0.6) * rk)}% attack speed; enemies deal less.` }),
    banner_ultimate: s => ({ type: "banner_ultimate", mana: gv(s.mana || 12, 0), radius: gv(s.radius || 5, 0), dur: gv(s.dur || 20, 0), allyDmg: gv(s.allyDmg || 14, 1), allyIas: gv(s.allyIas || 10, 0.6), enemyDmg: gv(s.enemyDmg || 10, 0.6), heal: gv(s.heal || 4, 0),
      desc: rk => `A standard that pulses ${s.heal || 4}%/s healing + a damage aura and floods fear-immunity to allies who stand in it.` }),
    warshout_debuff: s => ({ type: "warshout_debuff", mana: gv(s.mana || 7, 0), radius: gv(s.radius || 5, s.radG || 0.2),
      desc: rk => `A no-damage roar: foes within ${((s.radius || 5) + (s.radG || 0.2) * rk).toFixed(1)}y are armor-shredded, slowed, and weakened.` }),

    /* ===== Ember Witch ===== */
    firewall: s => ({ type: "firewall", mana: gv(s.mana || 9, 0), castRange: gv(8, 0), len: gv(s.len || 4, s.lenG || 0.3), dmg: dR(s), dur: gv(s.dur || 5, s.durG || 0.3),
      desc: rk => `Lay a burning line that sears anything crossing it for ${R(s.lo + (s.loG || 0) * rk, s.hi + (s.hiG || 0) * rk)} every 0.4s it stands in the flames, lasting ${((s.dur || 5) + (s.durG || 0.3) * rk).toFixed(1)}s.` }),
    pyreblast: s => ({ type: "pyreblast", mana: gv(s.mana || 10, 0), castRange: gv(9, 0), radius: gv(s.rad || 2.2, 0.05), dmg: dR(s), perStack: gv(s.perStack || 5, s.perStackG || 2),
      desc: rk => `Detonate a spot: ${R(s.lo + (s.loG || 0) * rk, s.hi + (s.hiG || 0) * rk)} fire +${Math.round((s.perStack || 5) + (s.perStackG || 2) * rk)} per Scorch stack consumed. Each stack consumed has a ${Math.round((0.10 + 0.02 * rk) * 100)}% chance to erupt a second Pyre here.` }),
    freezenova: s => ({ type: "freezenova", mana: gv(s.mana || 8, 0), radius: gv(s.rad || 3, 0.1), dmg: dR(s), freeze: gv(s.freeze || 1.5, s.freezeG || 0.1),
      desc: rk => `An ice ring: ${R(s.lo + (s.loG || 0) * rk, s.hi + (s.hiG || 0) * rk)} cold + a true FREEZE for ${((s.freeze || 1.5) + (s.freezeG || 0.1) * rk).toFixed(1)}s.` }),
    balllightning: s => ({ type: "balllightning", mana: gv(s.mana || 10, 0), dmg: dR(s), dur: gv(s.dur || 4, s.durG || 0.2),
      desc: rk => `A drifting plasma orb that discharges arcs (${R(s.lo + (s.loG || 0) * rk, s.hi + (s.hiG || 0) * rk)}) for ${((s.dur || 4) + (s.durG || 0.2) * rk).toFixed(1)}s.` }),
    arcblink: s => ({ type: "arcblink", mana: gv(s.mana || 8, 0), blinkRange: gv(s.range || 7, 0.2), radius: gv(s.rad || 2.4, 0), dmg: dR(s),
      desc: rk => `Blink up to ${((s.range || 7) + 0.2 * rk).toFixed(1)}y; on arrival a static burst zaps for ${R(s.lo + (s.loG || 0) * rk, s.hi + (s.hiG || 0) * rk)} nearby.` }),
    overloadnuke: s => ({ type: "overloadnuke", mana: gv(s.mana || 16, 0), radius: gv(s.rad || 4, 0.1), dmg: dR(s), perStatic: gv(s.perStatic || 3, s.perStaticG || 1),
      desc: rk => `Dump all Static: ${R(s.lo + (s.loG || 0) * rk, s.hi + (s.hiG || 0) * rk)} +${Math.round((s.perStatic || 3) + (s.perStaticG || 1) * rk)} per Static, with a stun.` }),
    groundfield: s => ({ type: "groundfield", mana: gv(s.mana || 12, 0), fieldKind: s.fieldKind, castRange: gv(9, 0), radius: gv(s.rad || 3, s.radG || 0.1), dur: gv(s.dur || 6, s.durG || 0.3), tickEvery: gv(s.tick || 0.5, 0), dmg: s.lo !== undefined ? dR(s) : undefined,
      slowPct: s.slow ? gv(s.slow, 0) : undefined, selfDodge: s.selfDodge ? gv(s.selfDodge, 0) : undefined, weakenPct: s.weaken ? gv(s.weaken, s.weakenG || 0) : undefined, heal: s.heal ? gv(s.heal, 0) : undefined,
      desc: rk => `${s.fdesc || "A persistent field"} in ${((s.rad || 3) + (s.radG || 0.1) * rk).toFixed(1)}y for ${((s.dur || 6) + (s.durG || 0.3) * rk).toFixed(1)}s${s.lo !== undefined ? `, dealing ${R(s.lo + (s.loG || 0) * rk, s.hi + (s.hiG || 0) * rk)} every ${(s.tick || 0.5).toFixed(1)}s` : ""}.` }),

    /* ===== Gravebinder ===== */
    ward: s => ({ type: "ward", mana: gv(s.mana || 10, 0), shield: gv(s.shield || 40, s.shieldG || 18), dur: gv(s.dur || 12, 0), retal: gv(s.retal || 4, s.retalG || 2),
      desc: rk => `A bone shield absorbing ${Math.round((s.shield || 40) + (s.shieldG || 18) * rk)} damage for ${s.dur || 12}s; melee attackers are gored and slowed.` }),
    sacrifice: s => ({ type: "sacrifice", mana: gv(s.mana || 22, 0), mode: s.mode || "all", dmg: s.lo !== undefined ? dR(s) : undefined, radius: gv(s.rad || 2.6, 0), castRange: gv(s.castRange || 9, 0), healPct: gv(s.healPct || 18, s.healG || 3), fieldRadius: gv(s.fieldRadius || 2.6, 0), fieldTtl: gv(s.fieldTtl || 6, 0), fieldHeal: gv(s.fieldHeal || 3, 0),
      desc: rk => s.mode === "one" ? `Sacrifice a beast to heal ${Math.round((s.healPct || 18) + (s.healG || 3) * rk)}% to you & the pack and leave a regrowth field.` : `Detonate ALL minions: each bursts (${R(s.lo + (s.loG || 0) * rk, s.hi + (s.hiG || 0) * rk)} × life%) and leaves a corpse.` }),
    siphon_beam: s => ({ type: "siphon_beam", mana: gv(s.mana || 10, 0), tickDmg: gv(s.tickDmg || 4, s.tickG || 2), drain: gv(s.drain || 0.35, 0), maxChannel: gv(s.maxChannel || 4, 0), tickRate: gv(s.tickRate || 0.25, 0), manaPerSec: gv(s.manaPerSec || 2, 0),
      desc: rk => `Channel a life-tether: ${Math.round((s.tickDmg || 4) + (s.tickG || 2) * rk)}/tick (ramping), healing a share; follows and re-acquires.` }),
    doom: s => ({ type: "doom", mana: gv(s.mana || 9, 0), timer: gv(s.timer || 4, s.timerG || 0.2), dmgLo: gv(s.lo || 22, s.loG || 8), dmgHi: gv(s.hi || 36, s.hiG || 12), radius: gv(s.rad || 3, 0),
      desc: rk => `Brand a foe with a ${((s.timer || 4) + (s.timerG || 0.2) * rk).toFixed(1)}s death-timer; on expiry/death it detonates ${R(s.lo || 22, s.hi || 36)} nearby.` }),
    taunt_curse: s => ({ type: "taunt_curse", mana: gv(s.mana || 7, 0), radius: gv(s.rad || 3, 0.1), dur: gv(s.dur || 4, s.durG || 0.3),
      desc: rk => `Cursed foes within ${((s.rad || 3) + 0.1 * rk).toFixed(1)}y stampede to a mark, ignoring you, for ${((s.dur || 4) + (s.durG || 0.3) * rk).toFixed(1)}s.` }),
    plague_seed: s => ({ type: "plague_seed", mana: gv(s.mana || 6, 0), dur: gv(s.dur || 6, 1), tick: gv(s.tick || 4, s.tickG || 2), spreadRange: gv(s.spread || 3.5, 0), burstRange: gv(s.burst || 2.5, 0),
      desc: rk => `Infect a foe: ${Math.round((s.tick || 4) + (s.tickG || 2) * rk)} poison/s for ${(s.dur || 6) + rk}s; leaps to the healthy and bursts on death.` }),
    devour: s => ({ type: "devour", mana: gv(s.mana || 5, 0), healPct: gv(s.healPct || 14, s.healG || 2),
      desc: rk => `Consume the nearest corpse: heal ${Math.round((s.healPct || 14) + (s.healG || 2) * rk)}% life, cleanse poison/slow; minions heal too.` }),
    corpse_launch: s => ({ type: "corpse_launch", mana: gv(s.mana || 7, 0), castRange: gv(9, 0), dmg: dR(s), knockback: gv(s.kb || 2, 0), sprayRadius: gv(s.spray || 1.6, 0), projSpeed: gv(s.spd || 11, 0),
      desc: rk => `Hurl a corpse: ${R(s.lo + (s.loG || 0) * rk, s.hi + (s.hiG || 0) * rk)} poison + knockback, and it lands as a fresh corpse.` }),
    reap: s => ({ type: "reap", mana: gv(s.mana || 20, 0), arc: gv(s.arc || 2.6, 0), radius: gv(s.rad || 3.4, 0), dmg: dR(s), bonusVsCursed: gv(s.bonus || 60, 0), reapHeal: gv(s.reapHeal || 3, 1),
      desc: rk => `A scythe arc: ${R(s.lo + (s.loG || 0) * rk, s.hi + (s.hiG || 0) * rk)} shadow, +${s.bonus || 60}% vs cursed; detonates Doom and reaps life per cursed hit.` }),
    outbreak: s => ({ type: "outbreak", mana: gv(s.mana || 24, 0), maxR: gv(s.maxR || 9, 0), dur: gv(s.dur || 1.2, 0), tick: gv(s.tick || 5, s.tickG || 2), corpseDmg: gv(s.corpseDmg || 16, s.corpseG || 6),
      desc: rk => `A ring expands to ${s.maxR || 9}y: infects every foe with Contagion and ruptures every corpse it passes.` }),
    summon_golem: s => ({ type: "summon_golem", mana: gv(s.mana || 14, 0), gatherRadius: gv(s.gather || 5, 0), maxCorpses: rk => (s.maxCorpses || 3) + Math.floor(rk / 5), growHp: gv(s.growHp || 40, 0), growDmg: gv(s.growDmg || 4, 0), tauntRadius: gv(s.taunt || 4, 0), slamDmg: dR(s),
      desc: rk => `Stitch corpses into a Bone Golem — re-cast on nearby corpses to feed & grow it (bigger, tougher, harder slam). Max stitches ${(s.maxCorpses || 3) + Math.floor(rk / 5)} (+1 per 5 ranks); each cast needs a corpse.` }),

    /* ===== Veil Ranger ===== */
    charge_shot: s => ({ type: "charge_shot", mana: gv(s.mana || 5, 0), maxDraw: gv(s.maxDraw || 1.1, 0), dmgMin: wMpct(s, "min"), dmgMax: wMpct(s, "max"), quarryBonus: gv(s.quarryBonus || 20, 0),
      desc: rk => `Hold to draw: ${pct(s.min)}%–${pct((s.max || 3.2) + (s.maxG || 0) * rk)}% weapon damage, deep pierce at full; consumes Quarry for bonus.` }),
    ricochet: s => ({ type: "ricochet", mana: gv(s.mana || 6, 0), dmgMult: wM(s), bounces: rk => (s.bounces || 3) + Math.floor(rk / 2),
      desc: rk => `An arrow that bounces between ${(s.bounces || 3) + Math.floor(rk / 2)} foes (−12%/bounce) and ricochets off walls.` }),
    rain: s => ({ type: "rain", mana: gv(s.mana || 12, 0), castRange: gv(9, 0), radius: gv(s.rad || 3, s.radG || 0.06), dur: gv(s.dur || 4, s.durG || 0.2), dmgMult: wM(s),
      desc: rk => `Rain arrows over ${((s.rad || 3) + (s.radG || 0.06) * rk).toFixed(1)}y for ${((s.dur || 4) + (s.durG || 0.2) * rk).toFixed(1)}s (${pct(s.base + (s.grow || 0) * rk)}%/tick); +25% on Quarry.` }),
    tripwire: s => ({ type: "tripwire", mana: gv(s.mana || 6, 0), length: gv(s.len || 4, s.lenG || 0.2), dmg: dR(s), bleed: gv(s.bleed || 4, s.bleedG || 0.8), root: gv(s.root || 0.8, 0), ttl: gv(s.ttl || 20, 0),
      desc: rk => `String a wire: the first crosser is rooted and every foe on it bleeds (${R(s.lo + (s.loG || 0) * rk, s.hi + (s.hiG || 0) * rk)}).` }),
    decoy: s => ({ type: "decoy", mana: gv(s.mana || 8, 0), hp: gv(s.hp || 40, s.hpG || 18), taunt: gv(s.taunt || 5, s.tauntG || 0.2), lifetime: gv(s.life || 8, s.lifeG || 0.4),
      desc: rk => `A clockwork lure (${Math.round((s.hp || 40) + (s.hpG || 18) * rk)} HP) taunts foes for ${Math.round((s.life || 8) + (s.lifeG || 0.4) * rk)}s, then scatters caltrops.` }),
    afterimage: s => ({ type: "afterimage", mana: gv(s.mana || 6, 0), range: gv(s.range || 4.5, 0), hp: gv(s.hp || 30, 0), taunt: gv(s.taunt || 5, 0), lifetime: gv(s.life || 2.5, 0),
      desc: rk => `Roll ${(s.range || 4.5).toFixed(1)}y and leave an after-image that draws fire for ${(s.life || 2.5).toFixed(1)}s.` }),
    weapon_coat: s => ({ type: "weapon_coat", mana: gv(s.mana || 5, 0), dur: gv(s.dur || 14, s.durG || 0.8), pdot: gv(s.pdot || 3, s.pdotG || 1),
      desc: rk => `For ${Math.round((s.dur || 14) + (s.durG || 0.8) * rk)}s, every arrow inflicts a stacking ${Math.round((s.pdot || 3) + (s.pdotG || 1) * rk)} poison DoT.` }),
    deathmark: s => ({ type: "deathmark", mana: gv(s.mana || 7, 0), dur: gv(s.dur || 5, s.durG || 0.3), amp: gv(s.amp || 20, s.ampG || 2), detDmg: gv(s.detDmg || 12, s.detG || 6),
      desc: rk => `Mark a foe: +${Math.round((s.amp || 20) + (s.ampG || 2) * rk)}% damage taken; on death/expiry it detonates and spreads a half-mark.` }),
    detonate_dots: s => ({ type: "detonate_dots", mana: gv(s.mana || 14, 0), dotMult: gv(s.dotMult || 3, s.dotG || 0.2), perQuarry: gv(s.perQuarry || 15, 0), markBonus: gv(s.markBonus || 60, s.markG || 6),
      desc: rk => `Detonate all wounds on screen: ${(s.dotMult || 3).toFixed(1)}× remaining DoT + bonuses per Quarry/Killing-Mark, then consume them.` }),

    /* ===== Wildkeeper ===== */
    totem: s => ({ type: "totem", mana: gv(s.mana || 8, 0), totemKind: s.totemKind || "storm", castRange: gv(9, 0), cap: rk => (s.cap || 1) + Math.floor(rk / (s.capEvery || 6)), ttl: gv(s.ttl || 14, s.ttlG || 0), radius: gv(s.rad || 4.5, 0), zapCd: gv(s.zapCd || 1.1, 0), dmg: dR(s), pulseCd: gv(s.pulseCd || 1.4, 0), wispCd: gv(s.wispCd || 3, 0),
      desc: rk => s.totemKind === "tempest" ? `A totem that pulses an expanding storm ring (${R(s.lo + (s.loG || 0) * rk, s.hi + (s.hiG || 0) * rk)}) and spawns spark-wisps.` : `Plant a totem (cap ${(s.cap || 1) + Math.floor(rk / (s.capEvery || 6))}) that auto-zaps the nearest foe for ${R(s.lo + (s.loG || 0) * rk, s.hi + (s.hiG || 0) * rk)}.` }),
    roamaoe: s => ({ type: "roamaoe", mana: gv(s.mana || 16, 0), ttl: gv(s.ttl || 6, s.ttlG || 0.2), radius: gv(s.rad || 2.4, 0), tickCd: gv(s.tick || 0.4, 0), drift: gv(s.drift || 2.5, 0), dmg: dR(s), pull: gv(s.pull || 1.5, 0),
      desc: rk => `Loose a tornado that wanders toward foes, dragging them in and grinding ${R(s.lo + (s.loG || 0) * rk, s.hi + (s.hiG || 0) * rk)}/tick for ${((s.ttl || 6) + (s.ttlG || 0.2) * rk).toFixed(1)}s.` }),
  };
  /* charge_shot helper: min is fixed %, max scales */
  function wMpct(s, which) { return which === "min" ? gv(s.min, 0) : gv(s.max || 3.2, s.maxG || 0); }

  /* ====================  THE FIVE KITS  ====================
     Each entry: {nm, tag, row, pre(prereq name), icon, fl, +params}. id auto = cls_tree_idx
     (load-bearing ids overridden where the engine reads them). cols auto-laid by row. */
  const K = {
    vanguard: [
      [ /* Arms — Tempo combo */
        { nm: "Tempo Strike", tag: "combo", row: 0, icon: "@steel/sword", base: 1.10, grow: 0.05, mana: 2, fl: "One clean blow, and the rhythm begins." },
        { nm: "Sunder Combo", tag: "combo_finish", row: 1, pre: "Tempo Strike", icon: "@steel/cleave", base: 1.0, grow: 0.065, arc: 2.4, range: 2.3, shredDur: 6, mana: 6, fl: "Spend the rhythm all at once." },
        { nm: "Riposte Stance", tag: "parry_stance", row: 1, pre: "Tempo Strike", icon: "@steel/crescent", base: 1.8, grow: 0.1, stun: 0.8, drain: 3, fl: "Invite the blow. Answer it." },
        { nm: "Weapon Mastery", tag: "passive", row: 2, pre: "Sunder Combo", icon: "@steel/hand", stats: { arPct: 10 }, tempoCapBonus: 0, fl: "Steel remembers a steady hand." },
        { nm: "Berserker Stance", tag: "combat_stance", row: 2, pre: "Riposte Stance", icon: "@blood/fist", stanceId: "berserk", stats: { ias: 18, lifeSteal: 6, dmgTakenPct: 12 }, fl: "No guard. Only forward." },
        { nm: "Bulwark Stance", tag: "combat_stance", row: 2, pre: "Riposte Stance", icon: "@steel/shield", stanceId: "bulwark", stats: { dmgReducePct: 18, block: 12, immovable: 1 }, rootArmor: 0.3, fl: "Be the wall." },
        { nm: "Headtaker", tag: "execute", row: 3, pre: "Weapon Mastery", icon: "@blood/axe", base: 2.0, miss: 2.5, thresh: 0.15, cd: 6, mana: 8, fl: "Some necks are invitations." },
      ],
      [ /* Warcries */
        { nm: "Rallying Cry", tag: "shout", row: 0, icon: "@holy/wing", healPct: 12, healG: 1.2, runPct: 20, rallyDur: 4, radius: 5, mana: 4, fl: "Up. We are not finished." },
        { id: "terrifying_bellow", nm: "Terrifying Bellow", tag: "fear", row: 1, pre: "Rallying Cry", icon: "@shadow/skull", radius: 4, radG: 0.2, dur: 2.5, durG: 0.2, mana: 7, fl: "Even the dead remember fear." },
        { nm: "War Banner", tag: "banner", row: 1, pre: "Rallying Cry", icon: "@phys/banner", radius: 4, allyDmg: 12, allyDmgG: 1, allyIas: 8, enemyDmg: 12, dur: 30, mana: 6, fl: "Hold this ground, or die at a known coordinate." },
        { nm: "Iron Will", tag: "passive", row: 2, pre: "Terrifying Bellow", icon: "@steel/rune", stats: { ccReduce: 5 }, fl: "The body breaks after the mind does." },
        { nm: "Sundering Roar", tag: "warshout_debuff", row: 2, pre: "War Banner", icon: "@phys/wave", radius: 5, radG: 0.2, mana: 7, fl: "A word that pries armor loose." },
        { nm: "Standard of the Last Stand", tag: "banner_ultimate", row: 3, pre: "Iron Will", icon: "@holy/cross", radius: 5, dur: 20, heal: 4, mana: 12, fl: "Where it stands, no one falls alone." },
      ],
      [ /* Assault */
        { nm: "Bull Charge", tag: "charge", row: 0, icon: "@phys/shield", base: 1.1, grow: 0.05, range: 7, rangeG: 0.3, width: 1.3, kb: 1.5, stun: 0.8, mana: 4, fl: "A door, and you are the ram." },
        { nm: "Harpoon Chain", tag: "grapple", row: 1, pre: "Bull Charge", icon: "@steel/chainlink", base: 0.8, grow: 0.04, range: 8, rangeG: 0.3, stun: 1.0, stunG: 0.06, mana: 5, fl: "Come here." },
        { nm: "Returning Axe", tag: "thrown", row: 1, pre: "Bull Charge", icon: "@steel/axe", base: 0.9, grow: 0.05, range: 8, rangeG: 0.3, count: 1, mana: 3, fl: "It always comes back. So does he." },
        { nm: "Fleet of Foot", tag: "passive", row: 2, pre: "Harpoon Chain", icon: "@light/wing", stats: { frw: 3 }, fl: "March fast, strike faster." },
        { id: "ground_slam", nm: "Seismic Slam", tag: "shockwave", row: 2, pre: "Returning Axe", icon: "@earth/spike", base: 0.9, grow: 0.06, range: 6, rangeG: 0.3, width: 1.6, stun: 1.0, stunG: 0.06, mana: 6, fl: "The ground forgives nothing." },
        { nm: "Shield Breaker", tag: "bash", row: 2, pre: "Returning Axe", icon: "@steel/burst", base: 0.8, grow: 0.05, arc: 2.0, range: 2.3, kb: 3, mana: 5, fl: "Make space. Violently." },
        { nm: "Skyfall Leap", tag: "leap", row: 3, pre: "Fleet of Foot", icon: "@earth/comet", base: 1.3, grow: 0.15, rad: 2.6, range: 8, mana: 8, fl: "Death from a modest height." },
      ],
    ],
    emberwitch: [
      [ /* Cinder — Scorch */
        { nm: "Emberbolt", tag: "projectile", row: 0, icon: "@fire/spark", el: "fire", proj: "firebolt", lo: 4, loG: 2, hi: 8, hiG: 3, scorch: 1.2, scorchG: 0.4, mana: 2, fl: "Every fire remembers being a spark." },
        { nm: "Fan of Cinders", tag: "fan", row: 1, pre: "Emberbolt", icon: "@fire/burst", el: "fire", proj: "firebolt", lo: 2, loG: 1, hi: 5, hiG: 2, count: 3, scorch: 1.0, mana: 4, fl: "Crowd control, the old way." },
        { nm: "Heat Haze", tag: "passive", row: 1, pre: "Emberbolt", icon: "@fire/flame", stats: { spellPct: 4, scorchPct: 10, scorchSpread: 1 }, fl: "The air itself starts to char." },
        { nm: "Wall of Fire", tag: "firewall", row: 2, pre: "Fan of Cinders", icon: "@fire/beam", len: 4, lenG: 0.3, lo: 5, loG: 2, hi: 9, hiG: 3, dur: 5, durG: 0.3, mana: 9, fl: "A line the fire will not cross back over." },
        { nm: "Meteor", tag: "meteor", row: 2, pre: "Heat Haze", icon: "@fire/meteor", el: "fire", lo: 16, loG: 7, hi: 28, hiG: 9, rad: 2.8, stun: 0.6, mana: 12, fl: "She points; the sky apologizes." },
        { nm: "Pyre", tag: "pyreblast", row: 3, pre: "Wall of Fire", icon: "@fire/column", lo: 8, loG: 4, hi: 14, hiG: 6, rad: 2.2, perStack: 5, perStackG: 2, mana: 10, fl: "Collect on every debt of heat at once." },
        { nm: "Inferno", tag: "groundfield", row: 3, pre: "Meteor", icon: "@fire/nova", fieldKind: "inferno", rad: 3, radG: 0.1, lo: 6, loG: 2, hi: 11, hiG: 3, dur: 6, durG: 0.4, tick: 0.4, mana: 18, fdesc: "A roaring disc of flame that rains fire" },
      ],
      [ /* Rime — freeze/shatter */
        { nm: "Frost Shard", tag: "projectile", row: 0, icon: "@cold/shard", el: "cold", proj: "frostshard", lo: 2, loG: 2, hi: 5, hiG: 2, mana: 2, fl: "Cold is patient." },
        { nm: "Frost Nova", tag: "freezenova", row: 1, pre: "Frost Shard", icon: "@cold/snowflake", lo: 3, loG: 2, hi: 7, hiG: 2, rad: 3, freeze: 1.5, freezeG: 0.1, mana: 8, fl: "Stillness, enforced." },
        { nm: "Brittle Bones", tag: "passive", row: 1, pre: "Frost Shard", icon: "@cold/crack", stats: { coldVsFrozenPct: 15, shatterRank: 1 }, fl: "Frozen things keep so poorly." },
        { nm: "Ice Lance", tag: "pierce", row: 2, pre: "Frost Nova", icon: "@cold/lance", el: "cold", lo: 9, loG: 5, hi: 16, hiG: 6, mana: 7, fl: "One spear, one straight answer." },
        { nm: "Frostbite", tag: "chain", row: 2, pre: "Brittle Bones", icon: "@cold/chainlink", el: "cold", proj: "frostshard", lo: 5, loG: 3, hi: 11, hiG: 4, jumps: 2, mana: 6, fl: "Cold leaps between the warm." },
        { nm: "Rimeguard", tag: "buff", row: 3, pre: "Ice Lance", icon: "@cold/rings", id: "rimeguard", label: "Rimeguard", emoji: "❄", stats: { armorPct: 10, resCold: 2 }, retal: 3, retalG: 1, dur: 30, mana: 6, fl: "A coat of weaponized winter." },
        { nm: "Glacier", tag: "groundfield", row: 3, pre: "Frostbite", icon: "@cold/orb", fieldKind: "glacier", rad: 3.2, radG: 0.1, lo: 5, loG: 2, hi: 9, hiG: 2, slow: 60, dur: 6, durG: 0.3, tick: 0.5, mana: 18, fdesc: "A slow-prison of ice that freezes lingerers" },
      ],
      [ /* Tempest — Static */
        { id: "spark", nm: "Spark", tag: "fan", row: 0, icon: "@light/spark", el: "light", proj: "spark", lo: 1, loG: 4, hi: 7, hiG: 4, count: 3, countEvery: 2, spread: 0.55, wander: 11, spd: 8, projTtl: 1.0, buildStatic: true, mana: 2, fl: "A fistful of bolts, snaking every which way." },
        { id: "stormshell", nm: "Stormshell", tag: "buff", row: 1, pre: "Spark", icon: "@light/rings", id: "stormshell", label: "Stormshell", emoji: "⚡", stats: { fcr: 10, lightDmg: 4, frw: 5 }, dur: 30, mana: 5, fl: "Thunder, worn close." },
        { nm: "Chain Lightning", tag: "lightning", row: 1, pre: "Spark", icon: "@light/bolt", lo: 4, loG: 3, hi: 10, hiG: 4, jumps: 2, mana: 5, fl: "It never strikes the same fool once." },
        { nm: "Ball Lightning", tag: "balllightning", row: 2, pre: "Stormshell", icon: "@light/orb", lo: 5, loG: 3, hi: 11, hiG: 4, dur: 4, mana: 10, fl: "It drifts. It judges. It discharges." },
        { nm: "Arc Teleport", tag: "arcblink", row: 2, pre: "Chain Lightning", icon: "@light/streak", range: 7, rad: 2.4, lo: 6, loG: 2, hi: 12, hiG: 3, mana: 8, fl: "An exit that is also an entrance." },
        { nm: "Static Field", tag: "groundfield", row: 3, pre: "Ball Lightning", icon: "@light/coil", fieldKind: "static", rad: 3.2, radG: 0.1, lo: 4, loG: 2, hi: 9, hiG: 3, dur: 8, durG: 0.4, tick: 0.4, mana: 14, fdesc: "A humming field that auto-zaps (scaling with Static)" },
        { nm: "Overload", tag: "overloadnuke", row: 3, pre: "Arc Teleport", icon: "@light/star", lo: 14, loG: 5, hi: 24, hiG: 7, rad: 4, perStatic: 3, mana: 16, fl: "Spend it all. Spend it now." },
      ],
    ],
    gravebinder: [
      [ /* Bonecraft */
        { id: "raise_dead", nm: "Raise Dead", tag: "summon", row: 0, icon: "@bone/skull", minion: "skel_warrior", corpse: true, label: "skeletal warriors", cap: 2, capEvery: 3, mhp: 72, mhpG: 14, mlo: 4, mhi: 8, mloG: 2, mhiG: 4, mname: "Skeletal Warrior", mana: 6, fl: "Up, and to work." },
        { id: "raise_plaguemage", nm: "Raise Plague Mage", tag: "summon", row: 1, pre: "Raise Dead", icon: "@poison/droplet", minion: "skel_mage", corpse: true, ranged: true, proj: "venom", label: "plague mages", cap: 1, capEvery: 4, mhp: 28, mhpG: 10, mlo: 2, mhi: 5, mpdot: 4, mname: "Skeletal Plague Mage", mana: 8, fl: "A backline of bile." },
        { nm: "Bone Golem", tag: "summon_golem", row: 1, pre: "Raise Dead", icon: "@bone/colossus", gather: 5, maxCorpses: 3, growHp: 40, maxTier: 3, taunt: 4, lo: 10, loG: 4, hi: 18, hiG: 6, mana: 14, fl: "Many were buried. One stands." },
        { nm: "Marrow Pact", tag: "passive", row: 2, pre: "Bone Golem", icon: "@bone/heart", stats: { minionHpPct: 10, minionThorns: 2 }, fl: "What you raise, you armor." },
        { nm: "Bone Armor", tag: "ward", row: 2, pre: "Bone Golem", icon: "@bone/rings", shield: 40, shieldG: 18, dur: 12, retal: 4, retalG: 2, mana: 10, fl: "Wear the dead like a coat." },
        { nm: "Bone Spear", tag: "pierce", row: 3, pre: "Marrow Pact", icon: "@bone/spear", el: "shadow", lo: 7, loG: 4, hi: 14, hiG: 6, mana: 7, fl: "Sharpened from someone who won't miss it." },
        { id: "dread_muster", nm: "Dread Muster", tag: "minionbuff", row: 3, pre: "Bone Golem", icon: "@bone/banner", heal: 9, healG: 1, dmgBuff: 25, dmgBuffG: 5, dur: 10, mana: 18, fl: "Stand. Rage. Obey." },
        { nm: "Sacrificial Pyre", tag: "sacrifice", row: 3, pre: "Dread Muster", icon: "@bone/burst", mode: "all", lo: 14, loG: 6, hi: 24, hiG: 8, rad: 2.6, mana: 22, fl: "The army, spent as one wave." },
      ],
      [ /* Hex */
        { id: "mark_of_frailty", nm: "Mark of Frailty", tag: "curse", row: 0, icon: "@shadow/eye", curse: "frailty", pct: 20, pctG: 5, rad: 2.6, dur: 8, mana: 4, fl: "Every armor has a seam." },
        { id: "withering_hex", nm: "Withering Hex", tag: "curse", row: 1, pre: "Mark of Frailty", icon: "@shadow/crescent", curse: "wither", pct: 15, pctG: 3, slow: 25, slowG: 2, rad: 2.6, dur: 8, mana: 5, fl: "Rot takes the strong first." },
        { nm: "Doom", tag: "doom", row: 1, pre: "Mark of Frailty", icon: "@shadow/hourglass", timer: 4, timerG: 0.2, lo: 22, loG: 8, hi: 36, hiG: 12, rad: 3, mana: 9, fl: "A countdown, scrawled on a soul." },
        { nm: "Hex of Beckoning", tag: "taunt_curse", row: 2, pre: "Doom", icon: "@shadow/vortex", rad: 3, dur: 4, durG: 0.3, mana: 7, fl: "Come. All of you. Here." },
        { nm: "Grave Whispers", tag: "passive", row: 2, pre: "Doom", icon: "@shadow/spiral", stats: { spellPct: 5, curseDurPct: 8, curseRadiusPct: 5, curseSpread: 1 }, fl: "The dead gossip. Their hexes travel." },
        { nm: "Soul Siphon", tag: "siphon_beam", row: 3, pre: "Withering Hex", icon: "@blood/beam", tickDmg: 4, tickG: 2, drain: 0.35, maxChannel: 4, mana: 10, fl: "A straw, and a long, slow drink." },
        { nm: "Soul Harvest", tag: "passive", row: 3, pre: "Soul Siphon", icon: "@blood/heart", stats: { soulCharge: 4 }, fl: "Every ending feeds the next spell." },
        { nm: "Reaping", tag: "reap", row: 3, pre: "Hex of Beckoning", icon: "@shadow/scythe", lo: 10, loG: 5, hi: 18, hiG: 7, arc: 2.6, rad: 3.4, bonus: 60, reapHeal: 3, mana: 20, fl: "Cash in the whole ledger of hexes." },
      ],
      [ /* Rot */
        { id: "venom_spit", nm: "Venom Spit", tag: "projectile", row: 0, icon: "@poison/spore", el: "poison", proj: "venom", lo: 1, loG: 1, hi: 3, hiG: 1, pdot: 4, pdotG: 2, mana: 2, fl: "Unhygienic. Effective." },
        { nm: "Contagion", tag: "plague_seed", row: 1, pre: "Venom Spit", icon: "@poison/skull", tick: 4, tickG: 2, dur: 6, spread: 3.5, burst: 2.5, mana: 6, fl: "It spreads the way bad news does." },
        { nm: "Miasma", tag: "groundfield", row: 1, pre: "Venom Spit", icon: "@poison/cloud", fieldKind: "miasma", rad: 2.4, radG: 0.08, lo: 6, loG: 3, hi: 6, hiG: 3, slow: 20, dur: 5, durG: 0.3, tick: 0.5, mana: 7, fdesc: "A poison fog that ticks + slows" },
        { nm: "Carrion Bloom", tag: "passive", row: 2, pre: "Contagion", icon: "@poison/leaf", stats: { poisonDotPct: 6, plagueSpreadPct: 8 }, fl: "From every death, more death." },
        { nm: "Devour Corpse", tag: "devour", row: 2, pre: "Contagion", icon: "@poison/heart", healPct: 14, healG: 2, mana: 5, fl: "Waste nothing. Especially not the dying." },
        { id: "corpse_burst", nm: "Corpse Burst", tag: "corpse", row: 3, pre: "Miasma", icon: "@poison/burst", el: "poison", lo: 12, loG: 6, hi: 20, hiG: 8, rad: 2.3, mana: 8, fl: "A soldier's last duty, conscripted." },
        { nm: "Corpse Spear", tag: "corpse_launch", row: 3, pre: "Corpse Burst", icon: "@bone/lance", lo: 10, loG: 5, hi: 18, hiG: 7, kb: 2, spray: 1.6, mana: 7, fl: "Relocate the dead, violently." },
        { nm: "Outbreak", tag: "outbreak", row: 3, pre: "Corpse Spear", icon: "@poison/wave", maxR: 9, dur: 1.2, tick: 5, tickG: 2, corpseDmg: 16, corpseG: 6, mana: 24, fl: "The whole tree, in one growing ring." },
      ],
    ],
    veilranger: [
      [ /* Precision — Quarry */
        { nm: "Aimed Shot", tag: "melee", row: 0, icon: "@phys/arrow", base: 1.3, grow: 0.14, ar: 25, quarryOnHit: true, mana: 2, fl: "Breathe out. Loose between heartbeats." },
        { nm: "Split Volley", tag: "wfan", row: 1, pre: "Aimed Shot", icon: "@phys/fan", base: 0.65, grow: 0.07, count: 3, spread: 0.5, quarryOnHit: true, mana: 4, fl: "Why pick one?" },
        { nm: "Drawn Shot", tag: "charge_shot", row: 1, pre: "Aimed Shot", icon: "@phys/bow", min: 0.6, max: 3.2, maxDraw: 1.1, quarryBonus: 20, mana: 5, fl: "Patience, then violence." },
        { nm: "Eagle Eye", tag: "passive", row: 2, pre: "Split Volley", icon: "@light/eye", stats: { critChance: 2, critDmg: 12, projRange: 6 }, fl: "She counts feathers at half a league." },
        { nm: "Ricochet Shard", tag: "ricochet", row: 2, pre: "Drawn Shot", icon: "@steel/zigzag", base: 1.1, grow: 0.12, bounces: 3, mana: 6, fl: "Around the corner, into the throat." },
        { nm: "Skewering Bolt", tag: "wpierce", row: 3, pre: "Eagle Eye", icon: "@phys/spear", base: 1.2, grow: 0.15, mana: 6, fl: "One arrow, several invoices." },
        { nm: "Arrowfall", tag: "rain", row: 3, pre: "Ricochet Shard", icon: "@phys/rune", base: 0.28, grow: 0.012, rad: 3, radG: 0.06, dur: 4, durG: 0.2, mana: 12, fl: "Sky, briefly made of arrows." },
      ],
      [ /* Snares */
        { nm: "Barbed Trap", tag: "trap", row: 0, icon: "@steel/fang", trapKind: "barbed", lo: 6, loG: 3, hi: 10, hiG: 4, rad: 1.6, slow: 30, slowDur: 2.5, mana: 4, fl: "The fen keeps what steps wrong." },
        { nm: "Tinker's Eye", tag: "passive", row: 1, pre: "Barbed Trap", icon: "@steel/rune", stats: { trapPct: 12 }, fl: "Springs, teeth, and spite." },
        { nm: "Frostbite Trap", tag: "trap", row: 1, pre: "Barbed Trap", icon: "@cold/snowflake", trapKind: "frost", el: "cold", lo: 5, loG: 3, hi: 9, hiG: 4, rad: 2.2, slow: 55, slowDur: 3, mana: 5, fl: "Bottled winter, badly corked." },
        { nm: "Tripwire", tag: "tripwire", row: 2, pre: "Frostbite Trap", icon: "@steel/net", len: 4, lenG: 0.2, lo: 10, loG: 5, hi: 16, hiG: 6, bleed: 4, bleedG: 0.8, root: 0.8, mana: 6, fl: "A wall, not a point." },
        { nm: "Caltrop Field", tag: "groundfield", row: 2, pre: "Tinker's Eye", icon: "@steel/burst", fieldKind: "caltrop", rad: 2.4, radG: 0.06, lo: 5, loG: 2, hi: 8, hiG: 3, slow: 40, dur: 6, durG: 0.3, tick: 0.4, mana: 7, fdesc: "A carpet of caltrops: bleed + slow while inside" },
        { nm: "Powder Trap", tag: "trap", row: 3, pre: "Tripwire", icon: "@fire/comet", trapKind: "powder", el: "fire", lo: 14, loG: 6, hi: 24, hiG: 8, rad: 2.6, mana: 7, fl: "Step. Boom. No repeat business." },
        { nm: "Snare Decoy", tag: "decoy", row: 3, pre: "Caltrop Field", icon: "@steel/totem", hp: 40, hpG: 18, taunt: 5, life: 8, lifeG: 0.4, mana: 8, fl: "A lure with terrible aim and great timing." },
      ],
      [ /* Veil */
        { nm: "Shadowstep", tag: "blink", row: 0, icon: "@shadow/crescent", range: 5, mana: 4, fl: "She was here. Briefly." },
        { nm: "Smoke Bomb", tag: "groundfield", row: 1, pre: "Shadowstep", icon: "@shadow/cloud", fieldKind: "smoke", rad: 2.8, radG: 0.06, dur: 5, durG: 0.3, selfDodge: 30, tick: 0.4, mana: 6, fdesc: "A cloud that blinds foes & shrouds you" },
        { nm: "Quickening", tag: "passive", row: 1, pre: "Shadowstep", icon: "@light/wing", stats: { frw: 2, ias: 3, dodge: 1 }, fl: "Slow rangers are a contradiction." },
        { nm: "Serrated Arrows", tag: "weapon_coat", row: 2, pre: "Quickening", icon: "@poison/droplet", dur: 14, durG: 0.8, pdot: 3, pdotG: 1, mana: 5, fl: "Every shot leaves a grudge." },
        { nm: "Killing Mark", tag: "deathmark", row: 2, pre: "Smoke Bomb", icon: "@shadow/eye", dur: 5, durG: 0.3, amp: 20, ampG: 2, detDmg: 12, detG: 6, mana: 7, fl: "She decides who is already dead." },
        { nm: "After-Image", tag: "afterimage", row: 3, pre: "Serrated Arrows", icon: "@shadow/twin", range: 4.5, hp: 30, taunt: 5, life: 2.5, mana: 6, fl: "Strike the echo, not the archer." },
        { nm: "Hemorrhage", tag: "detonate_dots", row: 3, pre: "Killing Mark", icon: "@blood/burst", dotMult: 3, dotG: 0.2, perQuarry: 15, markBonus: 60, markG: 6, mana: 14, fl: "Open every wound at once." },
      ],
    ],
    wildkeeper: [
      [ /* Wildkin — pack */
        { id: "call_wolf", nm: "Call of the Wolf", tag: "summon", row: 0, icon: "@nature/fang", minion: "wolf", label: "wolves", cap: 1, capEvery: 4, mhp: 26, mhpG: 8, mlo: 3, mhi: 6, mspeed: 3.8, matk: 1.3, sprite: "wolf", mname: "Grey Companion", mana: 7, fl: "An understanding, not a leash." },
        { id: "thornback_boar", nm: "Thornback Boar", tag: "summon", row: 1, pre: "Call of the Wolf", icon: "@earth/spike", minion: "boar", label: "boars", cap: 1, mhp: 60, mhpG: 16, mlo: 4, mhi: 8, mspeed: 2.6, matk: 0.9, sprite: "boar", taunt: 5, mname: "Thornback Boar", mana: 10, fl: "Stubborn as a landslide." },
        { nm: "Spirit Hawk", tag: "summon", row: 1, pre: "Call of the Wolf", icon: "@nature/wing", minion: "hawk", label: "hawks", cap: 1, mhp: 18, mhpG: 5, mlo: 4, mhi: 8, mspeed: 4.2, matk: 0.7, ranged: true, proj: "arrow", mrange: 6, sprite: "hawk", mname: "Spirit Hawk", untargetable: true, groundImmune: true, mana: 9, fl: "It never lands where you look — only AoE can clip it." },
        { nm: "Guardian Bear", tag: "summon", row: 2, pre: "Thornback Boar", icon: "@earth/paw", minion: "bear", label: "bears", cap: 1, mhp: 110, mhpG: 24, mlo: 8, mhi: 14, mspeed: 2.4, matk: 0.8, sprite: "bear", taunt: 5, slamStun: 0.6, mname: "Guardian Bear", mana: 14, fl: "A wall that loves you." },
        { id: "kinship", nm: "Kindred Bond", tag: "passive", row: 2, pre: "Spirit Hawk", icon: "@nature/heart", stats: { pShare: 8, pManaPerBeast: 0.4 }, fl: "The pack carries what you cannot." },
        { id: "feral_howl", nm: "Feral Howl", tag: "minionbuff", row: 3, pre: "Guardian Bear", icon: "@nature/crescent", heal: 100, dmgBuff: 20, dmgBuffG: 5, dur: 10, cd: 11, mana: 9, fl: "Every hackle within a league stands up." },
        { nm: "Blood of the Pack", tag: "sacrifice", row: 3, pre: "Kindred Bond", icon: "@blood/spiral", mode: "one", healPct: 18, healG: 3, castRange: 9, fieldRadius: 2.6, fieldTtl: 6, fieldHeal: 3, mana: 6, fl: "One gives, so the rest may run." },
      ],
      [ /* Stormcall — totems/weather */
        { nm: "Storm Totem", tag: "totem", row: 0, icon: "@light/totem", totemKind: "storm", cap: 2, capEvery: 6, ttl: 14, rad: 4.5, zapCd: 1.1, lo: 4, loG: 2, hi: 9, hiG: 3, mana: 8, fl: "Storm comes from the ground here." },
        { id: "totem_mastery", nm: "Totem Mastery", tag: "passive", row: 1, pre: "Storm Totem", icon: "@earth/rune", stats: { totemRate: 10 }, note: "+1 maximum totem for every 10 ranks invested.", fl: "Teach the stone your tempo." },
        { id: "ground_fissure", nm: "Fissure", tag: "shockwave", row: 1, pre: "Storm Totem", icon: "@earth/crack", el: "earth", lo: 6, loG: 3, hi: 11, hiG: 4, range: 7, rangeG: 0.2, width: 1.4, stun: 0.4, mana: 10, fl: "The earth opens a sentence." },
        { nm: "Cyclone", tag: "roamaoe", row: 2, pre: "Fissure", icon: "@light/vortex", ttl: 6, ttlG: 0.2, rad: 2.4, tick: 0.4, drift: 2.5, lo: 5, loG: 2, hi: 9, hiG: 3, pull: 1.5, mana: 16, fl: "It hunts the crowd for you." },
        { nm: "Sky-Sap", tag: "passive", row: 2, pre: "Totem Mastery", icon: "@arcane/droplet", stats: { manaRegen: 10 }, fl: "The sky pays its debts in sips." },
        { nm: "Earthquake", tag: "groundfield", row: 3, pre: "Cyclone", icon: "@earth/burst", fieldKind: "quake", rad: 3.2, radG: 0.05, lo: 4, loG: 2, hi: 8, hiG: 3, slow: 25, dur: 5, tick: 0.4, mana: 18, fdesc: "Broken ground that erupts at random + slows" },
        { nm: "Tempest Totem", tag: "totem", row: 3, pre: "Sky-Sap", icon: "@light/rings", totemKind: "tempest", cap: 1, ttl: 12, rad: 5, lo: 8, loG: 3, hi: 15, hiG: 4, pulseCd: 1.4, wispCd: 3, mana: 22, fl: "It rules a whole field in slow waves." },
      ],
      [ /* Wildshape — forms */
        { id: "fangform", nm: "Wolf Form", tag: "form", row: 0, icon: "@blood/fang", form: "fang", dur: 20, durG: 3, stats: { dmgPct: 20, frw: 15, lifeSteal: 2 }, fl: "Borrow the teeth. Return them later." },
        { id: "stoneform", nm: "Bear Form", tag: "form", row: 1, pre: "Wolf Form", icon: "@earth/claw", form: "brute", dur: 18, durG: 2, stats: { hpPct: 25, armorPct: 50, ccReduce: 40 }, fl: "A brawler's patience, with claws." },
        { nm: "Stone Form", tag: "form", row: 1, pre: "Wolf Form", icon: "@earth/shield", form: "stone", dur: 15, durG: 2, stats: { armorPct: 120, resAll: 6, immovable: 1 }, fl: "Mountains are very patient animals." },
        { id: "primal_surge", nm: "Primal Surge", tag: "passive", row: 2, pre: "Bear Form", icon: "@fire/burst", stats: { primalProc: 1 }, fl: "Some blows carry the whole wild — and a gout of flame — with them." },
        { id: "rabies", nm: "Rabies", tag: "rabies", row: 2, pre: "Stone Form", icon: "@poison/fang", base: 1.1, grow: 0.12, pdps: 6, pdpsG: 2, dur: 8, cloudRad: 2.4, mana: 7, fl: "One bite, and it spreads itself." },
        { id: "fire_claw", nm: "Fire Claw", tag: "fireclaw", row: 3, pre: "Primal Surge", icon: "@fire/claw", lo: 8, loG: 4, hi: 14, hiG: 6, dmgPct: 12, dmgPctG: 6, dur: 8, durG: 1, range: 5, mana: 12, fl: "Only a beast can wield the fire this freely." },
        { nm: "Wrath of the Wild", tag: "form", row: 3, pre: "Rabies", icon: "@earth/star", form: "apex", dur: 12, durG: 2, stats: { dmgPct: 40, hpPct: 20, frw: 10, ccReduce: 60 }, mana: 22, fl: "The thing the forest whispers about." },
      ],
    ],
  };

  /* ---- assemble: auto-lay columns by row, resolve prereqs by name ---- */
  const COLS = { 1: [1], 2: [0, 2], 3: [0, 1, 2], 4: [0, 1, 2, 1] };
  const REQ = [1, 6, 14, 24];
  for (const cls in K) {
    const nameToId = {};
    K[cls].forEach((specs, tree) => {
      specs.forEach((s, i) => { s._id = s.id || `${cls}_${tree}_${i}`; nameToId[s.nm] = s._id; });
    });
    K[cls].forEach((specs, tree) => {
      /* bucket by row to assign columns */
      const byRow = {};
      specs.forEach(s => { (byRow[s.row] = byRow[s.row] || []).push(s); });
      for (const row in byRow) { const arr = byRow[row], cols = COLS[arr.length] || [0, 1, 2]; arr.forEach((s, j) => { s._col = cols[j % cols.length]; }); }
      specs.forEach(s => {
        const made = A[s.tag](s);
        const sk = Object.assign({
          id: s._id, name: s.nm, cls, tree, pos: [s._col, s.row],
          reqLvl: s.reqLvl || REQ[s.row] || 1, prereq: s.pre ? nameToId[s.pre] : undefined,
          maxRank: 10, icon: s.icon, flavor: s.fl || "", synergy: s.synergy,
        }, made);
        DATA.SKILLS[s._id] = sk;
      });
    });
  }
  /* element presets for elemental projectile/fan damage seeds (overridden by explicit lo/hi) */
})();

/* =====================  ITEM BASES  =====================
   w,h grid size. twoHand weapons block the off hand.  */
DATA.BASES = {
  /* weapons: dmg [min,max], speed = attacks/sec multiplier base */
  shortsword:  { id:"shortsword", name:"Shortsword",  slot:"main", cat:"sword",  w:1,h:3, dmg:[2,7],  speed:1.15, ilvl:1, icon:"sword" },
  broadsword:  { id:"broadsword", name:"Broadsword",  slot:"main", cat:"sword",  w:2,h:3, dmg:[5,12], speed:1.0,  ilvl:4, icon:"sword" },
  handaxe:     { id:"handaxe",    name:"Hand Axe",    slot:"main", cat:"axe",    w:1,h:3, dmg:[3,9],  speed:1.0,  ilvl:1, icon:"axe" },
  waraxe:      { id:"waraxe",     name:"War Axe",     slot:"main", cat:"axe",    w:2,h:3, dmg:[7,15], speed:0.85, ilvl:5, icon:"axe" },
  cudgel:      { id:"cudgel",     name:"Cudgel",      slot:"main", cat:"mace",   w:1,h:3, dmg:[3,8],  speed:1.05, ilvl:1, icon:"mace" },
  flangedmace: { id:"flangedmace",name:"Flanged Mace",slot:"main", cat:"mace",   w:1,h:3, dmg:[6,13], speed:0.95, ilvl:5, icon:"mace" },
  dirk:        { id:"dirk",       name:"Dirk",        slot:"main", cat:"dagger", w:1,h:2, dmg:[1,5],  speed:1.35, ilvl:1, icon:"dagger" },
  boarspear:   { id:"boarspear",  name:"Boar Spear",  slot:"main", cat:"spear",  w:1,h:4, dmg:[4,13], speed:0.9,  ilvl:3, icon:"spear", twoHand:true, reach:0.5 },
  huntbow:     { id:"huntbow",    name:"Hunting Bow", slot:"main", cat:"bow",    w:2,h:3, dmg:[2,8],  speed:1.1,  ilvl:2, icon:"bow", twoHand:true, ranged:true },
  gnarlwand:   { id:"gnarlwand",  name:"Gnarled Wand",slot:"main", cat:"wand",   w:1,h:2, dmg:[1,4],  speed:1.2,  ilvl:1, icon:"wand" },
  ashstaff:    { id:"ashstaff",   name:"Ash Staff",   slot:"main", cat:"staff",  w:1,h:4, dmg:[3,10], speed:0.95, ilvl:2, icon:"staff", twoHand:true },
  /* shields: block %, armor */
  buckler:     { id:"buckler",    name:"Wooden Buckler", slot:"off", cat:"shield", w:2,h:2, armor:4,  block:12, ilvl:1, icon:"shield" },
  kiteshield:  { id:"kiteshield", name:"Kite Shield",    slot:"off", cat:"shield", w:2,h:3, armor:10, block:20, ilvl:4, icon:"shield" },
  /* armor */
  cap:         { id:"cap",        name:"Leather Cap",   slot:"head",  cat:"helm",  w:2,h:2, armor:3,  ilvl:1, icon:"helm" },
  warhelm:     { id:"warhelm",    name:"War Helm",      slot:"head",  cat:"helm",  w:2,h:2, armor:8,  ilvl:5, icon:"helm" },
  quiltvest:   { id:"quiltvest",  name:"Quilted Vest",  slot:"chest", cat:"chest", w:2,h:3, armor:6,  ilvl:1, icon:"chest" },
  hauberk:     { id:"hauberk",    name:"Mail Hauberk",  slot:"chest", cat:"chest", w:2,h:3, armor:14, ilvl:5, icon:"chest" },
  ljgloves:    { id:"ljgloves",   name:"Leather Gloves",slot:"gloves",cat:"gloves",w:2,h:2, armor:2,  ilvl:1, icon:"gloves" },
  warboots:    { id:"warboots",   name:"Hard Boots",    slot:"boots", cat:"boots", w:2,h:2, armor:3,  ilvl:1, icon:"boots" },
  sash:        { id:"sash",       name:"Worn Sash",     slot:"belt",  cat:"belt",  w:2,h:1, armor:1,  ilvl:1, icon:"belt" },
  /* jewelry */
  ring:        { id:"ring",       name:"Ring",   slot:"ring",   cat:"ring",   w:1,h:1, ilvl:1, icon:"ring",   noCommon:true },
  amulet:      { id:"amulet",     name:"Amulet", slot:"amulet", cat:"amulet", w:1,h:1, ilvl:2, icon:"amulet", noCommon:true },
};

/* socket capacity by slot/size (jewelry, gloves, boots, belts: none).
   Large two-handers and body armor allow 4 (so Jeweler's can grant its full 4). */
for (const b of Object.values(DATA.BASES)) {
  if (b.slot === "main") b.maxSockets = (b.twoHand && b.w * b.h >= 8) ? 4 : (b.w * b.h >= 6 ? 3 : (b.h >= 3 ? 2 : 1));
  else if (b.slot === "chest") b.maxSockets = 4;
  else if (b.slot === "off") b.maxSockets = 3;
  else if (b.slot === "head") b.maxSockets = 3;
}

/* consumables & currency-adjacent */
DATA.CONSUMABLES = {
  hp1: { id:"hp1", name:"Minor Healing Draught", w:1,h:1, icon:"potR", belt:true, healPct:0.40, value:25, ilvl:1 },
  hp2: { id:"hp2", name:"Healing Draught",       w:1,h:1, icon:"potR", belt:true, healPct:0.60, value:70, ilvl:5 },
  mp1: { id:"mp1", name:"Minor Aether Draught",  w:1,h:1, icon:"potB", belt:true, manaPct:0.80, value:25, ilvl:1 },
  mp2: { id:"mp2", name:"Aether Draught",        w:1,h:1, icon:"potB", belt:true, manaPct:1.00, value:70, ilvl:5 },
  rejuv:{ id:"rejuv", name:"Cinder Tonic",       w:1,h:1, icon:"potP", belt:true, rejuv:0.35, value:160, ilvl:3,
          flavor:"Restores body and spirit at once." },
  tp:  { id:"tp",  name:"Scroll of Passage",     w:1,h:1, icon:"scroll", value:40, ilvl:1,
         flavor:"Tears a brief doorway home to Cinderwatch." },
  idscroll: { id:"idscroll", name:"Scroll of Insight", w:1,h:1, icon:"scrollB", value:30, ilvl:1,
         flavor:"Reveals the nature of unidentified relics." },
  respec: { id:"respec", name:"Ashen Tonic", w:1,h:1, icon:"potG", value:0, ilvl:1, respec:true,
         flavor:"Unlearns all talents, returning the points. One swallow, one second chance." },
};

/* =====================  AFFIXES  =====================
   kind: p = prefix, s = suffix. stat keys are summed by computeStats.
   tiers: [maxIlvlOfTier..] each tier {ilvl, min, max, name} */
DATA.AFFIXES = [
  /* ---------- PREFIXES (weapon offense) ---------- */
  { stat:"dmgPct", kind:"p", slots:["main"], group:"dmgPct", tiers:[
      {ilvl:1,min:10,max:20,name:"Jagged"}, {ilvl:5,min:21,max:30,name:"Deadly"}, {ilvl:8,min:31,max:40,name:"Vicious"},
      {ilvl:14,min:41,max:50,name:"Brutal"}, {ilvl:20,min:51,max:65,name:"Massive"}, {ilvl:26,min:66,max:80,name:"Savage"},
      {ilvl:32,min:81,max:100,name:"Merciless"}, {ilvl:41,min:101,max:150,name:"Ferocious"}, {ilvl:51,min:151,max:200,name:"Cruel"} ] },
  { stat:"dmgFlat", kind:"p", slots:["main"], group:"dmgFlat", tiers:[
      {ilvl:1,min:1,max:3,name:"Honed"}, {ilvl:6,min:3,max:6,name:"Tempered"}, {ilvl:20,min:6,max:11,name:"Masterwork"} ] },
  { stat:"maxDmg", kind:"p", slots:["main"], group:"maxDmg", tiers:[
      {ilvl:7,min:3,max:4,name:"Gored"}, {ilvl:14,min:5,max:7,name:"Carnage"}, {ilvl:25,min:8,max:12,name:"Slaughtering"},
      {ilvl:35,min:13,max:20,name:"Butchering"}, {ilvl:45,min:21,max:32,name:"Eviscerating"} ] },
  { stat:"minDmg", kind:"p", slots:["main"], group:"minDmg", tiers:[
      {ilvl:1,min:1,max:2,name:"Worthy"}, {ilvl:12,min:3,max:4,name:"Measured"}, {ilvl:24,min:5,max:8,name:"Excellent"}, {ilvl:48,min:9,max:14,name:"Peerless"} ] },
  { stat:"ar", kind:"p", slots:["main","ring","amulet","gloves"], group:"ar", tiers:[
      {ilvl:1,min:10,max:20,name:"Bronze"}, {ilvl:4,min:21,max:40,name:"Iron"}, {ilvl:8,min:41,max:60,name:"Steel"},
      {ilvl:12,min:61,max:80,name:"Silver"}, {ilvl:17,min:81,max:100,name:"Gold"}, {ilvl:22,min:101,max:120,name:"Platinum"},
      {ilvl:27,min:121,max:160,name:"Meteoric"}, {ilvl:32,min:161,max:240,name:"Strange"}, {ilvl:37,min:241,max:320,name:"Weird"} ] },
  { kind:"p", slots:["main"], group:"arED", tiers:[
      {ilvl:5,name:"Sharp",     mods:[{stat:"ar",min:10,max:20},{stat:"dmgPct",min:10,max:20}]},
      {ilvl:12,name:"Fine",     mods:[{stat:"ar",min:21,max:40},{stat:"dmgPct",min:21,max:30}]},
      {ilvl:19,name:"Warrior's",mods:[{stat:"ar",min:41,max:60},{stat:"dmgPct",min:31,max:40}]},
      {ilvl:27,name:"Soldier's",mods:[{stat:"ar",min:61,max:80},{stat:"dmgPct",min:41,max:50}]},
      {ilvl:38,name:"Knight's", mods:[{stat:"ar",min:81,max:100},{stat:"dmgPct",min:51,max:65}]},
      {ilvl:47,name:"Lord's",   mods:[{stat:"ar",min:101,max:120},{stat:"dmgPct",min:66,max:80}]},
      {ilvl:56,name:"King's",   mods:[{stat:"ar",min:121,max:150},{stat:"dmgPct",min:81,max:100}]} ] },
  { kind:"p", slots:["main"], group:"vsUndead", tiers:[
      {ilvl:1,name:"Consecrated", mods:[{stat:"dmgUndead",min:25,max:75},{stat:"arUndead",min:25,max:75}]},
      {ilvl:15,name:"Pure",       mods:[{stat:"dmgUndead",min:76,max:125},{stat:"arUndead",min:76,max:175}]},
      {ilvl:25,name:"Sacred",     mods:[{stat:"dmgUndead",min:126,max:200},{stat:"arUndead",min:175,max:250}]},
      {ilvl:35,name:"Hallowed",   mods:[{stat:"dmgUndead",min:201,max:275},{stat:"arUndead",min:251,max:325}]},
      {ilvl:45,name:"Divine",     mods:[{stat:"dmgUndead",min:276,max:350},{stat:"arUndead",min:326,max:450}]} ] },
  { kind:"p", slots:["main"], group:"vsDemon", tiers:[
      {ilvl:3,name:"Lunar",     mods:[{stat:"dmgDemon",min:10,max:25},{stat:"arDemon",min:25,max:50}]},
      {ilvl:15,name:"Arcadian", mods:[{stat:"dmgDemon",min:26,max:50},{stat:"arDemon",min:51,max:100}]},
      {ilvl:25,name:"Unearthly",mods:[{stat:"dmgDemon",min:51,max:100},{stat:"arDemon",min:101,max:150}]},
      {ilvl:35,name:"Astral",   mods:[{stat:"dmgDemon",min:101,max:150},{stat:"arDemon",min:151,max:200}]},
      {ilvl:45,name:"Elysian",  mods:[{stat:"dmgDemon",min:151,max:250},{stat:"arDemon",min:201,max:300}]} ] },
  /* ---------- PREFIXES (elemental weapon damage) ---------- */
  { stat:"fireDmg", kind:"p", slots:["main","ring","amulet"], group:"fireDmg", tiers:[
      {ilvl:2,min:3,max:6,name:"Smoldering"}, {ilvl:8,min:7,max:14,name:"Smoking"}, {ilvl:16,min:15,max:28,name:"Flaming"},
      {ilvl:25,min:29,max:50,name:"Blazing"}, {ilvl:40,min:51,max:90,name:"Condensing"} ] },
  { stat:"coldDmg", kind:"p", slots:["main","ring","amulet"], group:"coldDmg", tiers:[
      {ilvl:2,min:2,max:5,name:"Chilling"}, {ilvl:8,min:6,max:12,name:"Frigid"}, {ilvl:16,min:13,max:24,name:"Glacial"},
      {ilvl:25,min:25,max:45,name:"Hibernal"}, {ilvl:40,min:46,max:80,name:"Boreal"} ] },
  { stat:"lightDmg", kind:"p", slots:["main","ring","amulet"], group:"lightDmg", tiers:[
      {ilvl:2,min:5,max:11,name:"Static"}, {ilvl:8,min:12,max:26,name:"Glowing"}, {ilvl:16,min:27,max:58,name:"Arcing"},
      {ilvl:25,min:59,max:120,name:"Shocking"}, {ilvl:40,min:121,max:240,name:"Storming"} ] },
  { stat:"poisonDmg", kind:"p", slots:["main","ring","amulet"], group:"poisonDmg", tiers:[
      {ilvl:3,min:6,max:15,name:"Septic"}, {ilvl:10,min:16,max:40,name:"Foul"}, {ilvl:20,min:41,max:90,name:"Corrosive"},
      {ilvl:35,min:91,max:160,name:"Toxic"}, {ilvl:50,min:161,max:275,name:"Pestilent"} ] },
  /* ---------- PREFIXES (defense) ---------- */
  { stat:"armorPct", kind:"p", slots:["chest","head","off","gloves","boots","belt"], group:"armorPct", tiers:[
      {ilvl:1,min:10,max:30,name:"Sturdy"}, {ilvl:9,min:31,max:40,name:"Strong"}, {ilvl:19,min:41,max:50,name:"Glorious"},
      {ilvl:25,min:51,max:65,name:"Blessed"}, {ilvl:31,min:66,max:80,name:"Saintly"}, {ilvl:36,min:81,max:100,name:"Holy"}, {ilvl:45,min:101,max:160,name:"Godly"} ] },
  { stat:"armor", kind:"p", slots:["chest","head","off","gloves","boots","belt","ring","amulet"], group:"armorFlat", tiers:[
      {ilvl:1,min:2,max:5,name:"Studded"}, {ilvl:6,min:6,max:14,name:"Plated"}, {ilvl:20,min:15,max:30,name:"Reinforced"}, {ilvl:40,min:31,max:60,name:"Bulwark"} ] },
  /* ---------- PREFIXES (utility) ---------- */
  { stat:"skillAll", kind:"p", slots:["head","amulet"], group:"skillAll", tiers:[ {ilvl:30,min:1,max:1,name:"Adept's"}, {ilvl:60,min:2,max:2,name:"Magus'"} ] },
  { stat:"lightRadius", kind:"p", slots:["head","amulet","ring","chest"], group:"lightRadius", tiers:[
      {ilvl:1,min:1,max:1,name:"Glimmering"}, {ilvl:6,min:2,max:2,name:"Lucent"}, {ilvl:15,min:3,max:3,name:"Radiant"} ] },
  { stat:"knockback", kind:"p", slots:["main"], cats:["sword","axe","mace","dagger","spear"], group:"knockback", tiers:[ {ilvl:8,min:1,max:1,name:"Heavy"} ] },
  { stat:"preventHeal", kind:"p", slots:["main"], cats:["sword","axe","mace","dagger","spear"], group:"preventHeal", tiers:[ {ilvl:9,min:1,max:1,name:"Vile"} ] },
  /* ---------- SUFFIXES (attributes & sustain) ---------- */
  { stat:"hp", kind:"s", slots:["any"], group:"hp", tiers:[
      {ilvl:1,min:5,max:15,name:"of the Fox"}, {ilvl:5,min:16,max:30,name:"of the Wolf"}, {ilvl:9,min:31,max:50,name:"of the Bear"},
      {ilvl:20,min:51,max:75,name:"of the Tiger"}, {ilvl:30,min:76,max:110,name:"of the Mammoth"}, {ilvl:45,min:111,max:160,name:"of the Colossus"} ] },
  { stat:"hpPct", kind:"s", slots:["chest","belt","amulet"], group:"hpPct", tiers:[ {ilvl:20,min:3,max:6,name:"of Vigor"}, {ilvl:45,min:7,max:12,name:"of Heart"} ] },
  { stat:"mana", kind:"s", slots:["any"], group:"mana", tiers:[
      {ilvl:1,min:5,max:12,name:"of Embers"}, {ilvl:6,min:13,max:25,name:"of the Deep Well"}, {ilvl:20,min:26,max:45,name:"of the Wyrm"}, {ilvl:37,min:46,max:75,name:"of the Leviathan"} ] },
  { stat:"str", kind:"s", slots:["any"], group:"str", tiers:[
      {ilvl:1,min:1,max:3,name:"of the Ox"}, {ilvl:6,min:4,max:7,name:"of the Mountain"}, {ilvl:20,min:8,max:14,name:"of the Titan"}, {ilvl:40,min:15,max:25,name:"of Atlas"} ] },
  { stat:"dex", kind:"s", slots:["any"], group:"dex", tiers:[
      {ilvl:1,min:1,max:3,name:"of the Hare"}, {ilvl:6,min:4,max:7,name:"of the Hawk"}, {ilvl:20,min:8,max:14,name:"of the Lynx"}, {ilvl:40,min:15,max:25,name:"of the Falcon"} ] },
  { stat:"vit", kind:"s", slots:["any"], group:"vit", tiers:[
      {ilvl:1,min:1,max:3,name:"of Marrow"}, {ilvl:6,min:4,max:7,name:"of Old Roots"}, {ilvl:20,min:8,max:14,name:"of the Yew"}, {ilvl:40,min:15,max:25,name:"of the World-Tree"} ] },
  { stat:"wil", kind:"s", slots:["any"], group:"wil", tiers:[
      {ilvl:1,min:1,max:3,name:"of Candlelight"}, {ilvl:6,min:4,max:7,name:"of the Vigil"}, {ilvl:20,min:8,max:14,name:"of the Oracle"}, {ilvl:40,min:15,max:25,name:"of the Empyrean"} ] },
  { stat:"lifeRegen", kind:"s", slots:["any"], group:"lifeRegen", tiers:[
      {ilvl:1,min:2,max:4,name:"of Regeneration"}, {ilvl:17,min:5,max:8,name:"of Regrowth"}, {ilvl:38,min:9,max:14,name:"of Revivification"} ] },
  { stat:"manaRegen", kind:"s", slots:["any"], group:"manaRegen", tiers:[ {ilvl:2,min:15,max:30,name:"of Whispers"}, {ilvl:20,min:31,max:60,name:"of Meditation"} ] },
  { stat:"lifeSteal", kind:"s", slots:["main","ring","amulet"], group:"lifeSteal", tiers:[
      {ilvl:4,min:2,max:4,name:"of the Leech"}, {ilvl:20,min:5,max:7,name:"of the Locust"}, {ilvl:45,min:8,max:9,name:"of the Lamprey"} ] },
  { stat:"manaSteal", kind:"s", slots:["main","ring","amulet"], group:"manaSteal", tiers:[
      {ilvl:5,min:2,max:4,name:"of the Bat"}, {ilvl:21,min:5,max:7,name:"of the Wraith"}, {ilvl:45,min:8,max:9,name:"of the Vampire"} ] },
  { stat:"manaAfterKill", kind:"s", slots:["main","ring","amulet"], group:"manaAfterKill", tiers:[ {ilvl:3,min:1,max:1,name:"of Triumph"}, {ilvl:17,min:2,max:5,name:"of Victory"} ] },
  { stat:"dmgToMana", kind:"s", slots:["amulet","off","chest"], group:"dmgToMana", tiers:[ {ilvl:9,min:7,max:12,name:"of the Vulpine"}, {ilvl:30,min:13,max:20,name:"of Reservoir"} ] },
  /* ---------- SUFFIXES (speed) ---------- */
  { stat:"ias", kind:"s", slots:["main","gloves","ring","amulet"], group:"ias", tiers:[
      {ilvl:2,min:5,max:10,name:"of Readiness"}, {ilvl:7,min:11,max:20,name:"of Alacrity"}, {ilvl:20,min:21,max:30,name:"of Swiftness"}, {ilvl:40,min:31,max:40,name:"of Quickness"} ] },
  { stat:"fcr", kind:"s", slots:["main"], cats:["wand","staff"], group:"fcr", tiers:[ {ilvl:2,min:5,max:10,name:"of Quick Words"}, {ilvl:20,min:11,max:20,name:"of the Magus"} ] },
  { stat:"fcr", kind:"s", slots:["amulet","ring","head"], group:"fcr", tiers:[ {ilvl:2,min:5,max:10,name:"of Quick Words"}, {ilvl:20,min:11,max:20,name:"of the Magus"} ] },
  { stat:"frw", kind:"s", slots:["boots"], group:"frw", tiers:[
      {ilvl:1,min:5,max:10,name:"of Pacing"}, {ilvl:12,min:11,max:20,name:"of Haste"}, {ilvl:25,min:21,max:30,name:"of Speed"}, {ilvl:40,min:31,max:40,name:"of Acceleration"} ] },
  /* ---------- SUFFIXES (resistance) ---------- */
  { stat:"resFire", kind:"s", slots:["any"], group:"resFire", tiers:[ {ilvl:1,min:8,max:18,name:"of Ash"}, {ilvl:6,min:19,max:30,name:"of the Kiln"}, {ilvl:25,min:31,max:40,name:"of the Pyre"} ] },
  { stat:"resCold", kind:"s", slots:["any"], group:"resCold", tiers:[ {ilvl:1,min:8,max:18,name:"of Wool"}, {ilvl:6,min:19,max:30,name:"of the Hearth"}, {ilvl:25,min:31,max:40,name:"of the Tundra"} ] },
  { stat:"resLight", kind:"s", slots:["any"], group:"resLight", tiers:[ {ilvl:1,min:8,max:18,name:"of Grounding"}, {ilvl:6,min:19,max:30,name:"of Insulation"}, {ilvl:25,min:31,max:40,name:"of the Tempest"} ] },
  { stat:"resPoison", kind:"s", slots:["any"], group:"resPoison", tiers:[ {ilvl:1,min:8,max:18,name:"of Cleansing"}, {ilvl:6,min:19,max:30,name:"of Antivenom"}, {ilvl:25,min:31,max:40,name:"of Purity"} ] },
  { stat:"resAll", kind:"s", slots:["amulet","off","chest","ring"], group:"resAll", tiers:[
      {ilvl:5,min:4,max:10,name:"of Warding"}, {ilvl:18,min:11,max:15,name:"of the Rainbow"}, {ilvl:34,min:16,max:20,name:"of the Prism"}, {ilvl:50,min:21,max:30,name:"of the Chroma"} ] },
  /* ---------- SUFFIXES (defense & mitigation) ---------- */
  { stat:"dmgReduceFlat", kind:"s", slots:["chest","off","amulet","ring","head","belt"], group:"dmgReduceFlat", tiers:[
      {ilvl:7,min:1,max:2,name:"of Health"}, {ilvl:18,min:3,max:4,name:"of Protection"}, {ilvl:32,min:5,max:8,name:"of Absorption"}, {ilvl:45,min:9,max:15,name:"of Life Everlasting"} ] },
  { stat:"magicReduceFlat", kind:"s", slots:["chest","off","amulet","ring","head"], group:"magicReduceFlat", tiers:[
      {ilvl:7,min:1,max:2,name:"of the Sentinel"}, {ilvl:26,min:3,max:4,name:"of Guarding"}, {ilvl:42,min:5,max:8,name:"of Negation"} ] },
  { stat:"thorns", kind:"s", slots:["chest","off","belt","head"], group:"thorns", tiers:[
      {ilvl:1,min:1,max:3,name:"of Thorns"}, {ilvl:14,min:4,max:8,name:"of Spikes"}, {ilvl:25,min:9,max:16,name:"of Razors"}, {ilvl:40,min:17,max:30,name:"of Blades"} ] },
  { stat:"block", kind:"s", slots:["off"], group:"block", tiers:[ {ilvl:1,min:5,max:10,name:"of Blocking"}, {ilvl:11,min:11,max:20,name:"of Deflecting"} ] },
  { stat:"dodge", kind:"s", slots:["boots","gloves","off","chest"], group:"dodge", tiers:[ {ilvl:6,min:3,max:8,name:"of Evasion"}, {ilvl:25,min:9,max:15,name:"of the Phantom"} ] },
  { stat:"ccReduce", kind:"s", slots:["belt","boots","amulet","off"], group:"ccReduce", tiers:[ {ilvl:3,min:10,max:25,name:"of Resolve"}, {ilvl:18,min:26,max:40,name:"of Steadfastness"} ] },
  { stat:"reqReduce", kind:"s", slots:["chest","off","main"], group:"reqReduce", tiers:[ {ilvl:15,min:20,max:20,name:"of Ease"}, {ilvl:25,min:30,max:30,name:"of Simplicity"} ] },
  /* ---------- SUFFIXES (offense utility) ---------- */
  { stat:"critChance", kind:"s", slots:["main","gloves","ring","amulet"], group:"critChance", tiers:[ {ilvl:3,min:2,max:5,name:"of Ruin"}, {ilvl:20,min:6,max:10,name:"of Devastation"} ] },
  { stat:"critDmg", kind:"s", slots:["main","gloves","amulet"], group:"critDmg", tiers:[ {ilvl:6,min:10,max:25,name:"of Wounding"}, {ilvl:25,min:26,max:50,name:"of Mutilation"} ] },
  { stat:"arPct", kind:"s", slots:["head","amulet"], group:"arPct", tiers:[ {ilvl:10,min:10,max:25,name:"of Aiming"}, {ilvl:25,min:26,max:50,name:"of the Marksman"} ] },
  { stat:"spellPct", kind:"s", slots:["main"], cats:["wand","staff"], group:"spellPct", tiers:[ {ilvl:5,min:5,max:12,name:"of Focus"}, {ilvl:25,min:13,max:25,name:"of the Archmage"} ] },
  { stat:"spellPct", kind:"s", slots:["amulet","head"], group:"spellPct", tiers:[ {ilvl:5,min:5,max:12,name:"of Focus"}, {ilvl:25,min:13,max:25,name:"of the Archmage"} ] },
  { stat:"monsterFlee", kind:"s", slots:["main"], group:"monsterFlee", tiers:[ {ilvl:10,min:12,max:25,name:"of Fright"}, {ilvl:16,min:26,max:50,name:"of Terror"}, {ilvl:24,min:51,max:100,name:"of Routing"} ] },
  /* ---------- SUFFIXES (find) ---------- */
  { stat:"mf", kind:"s", slots:["any"], group:"mf", tiers:[ {ilvl:2,min:5,max:15,name:"of Fortune"}, {ilvl:7,min:16,max:30,name:"of Plunder"}, {ilvl:26,min:31,max:45,name:"of Avarice"} ] },
  { stat:"goldFind", kind:"s", slots:["any"], group:"goldFind", tiers:[ {ilvl:1,min:10,max:30,name:"of Greed"}, {ilvl:17,min:31,max:80,name:"of Wealth"} ] },
  /* ---------- per-character-level affixes (value scales by hero level) ---------- */
  { stat:"ar",    kind:"p", slots:["main","amulet"],          group:"arPerLvl",   perLevel:true, weight:0.4, tiers:[ {ilvl:25,min:2,max:3,name:"Hawk-Eyed"} ] },
  { stat:"hp",    kind:"s", slots:["chest","belt","amulet"],  group:"hpPerLvl",   perLevel:true, weight:0.4, tiers:[ {ilvl:25,min:1,max:1,name:"of the Centaur"} ] },
  { stat:"armor", kind:"s", slots:["chest"],                  group:"defPerLvl",  perLevel:true, weight:0.4, tiers:[ {ilvl:25,min:2,max:3,name:"of the Faithful"} ] },
  { stat:"mana",  kind:"p", slots:["head","amulet"],          group:"manaPerLvl", perLevel:true, weight:0.4, tiers:[ {ilvl:25,min:1,max:1,name:"Mnemonic"} ] },
  /* ---------- chance-to-cast procs (self-contained elemental novas) ---------- */
  { kind:"s", proc:true, slots:["main","gloves"], group:"procStrikeFire", weight:0.4, tiers:[
      {ilvl:6,  name:"of Cinders",  chance:8,  trigger:"strike", elem:"fire",  lo:8,  hi:18, radius:2.0, label:"a burst of cinders"},
      {ilvl:20, name:"of Embers",   chance:10, trigger:"strike", elem:"fire",  lo:20, hi:45, radius:2.4, label:"a burst of cinders"},
      {ilvl:40, name:"of the Pyre", chance:12, trigger:"strike", elem:"fire",  lo:46, hi:90, radius:2.8, label:"a burst of cinders"} ] },
  { kind:"s", proc:true, slots:["main","gloves"], group:"procStrikeLight", weight:0.35, tiers:[
      {ilvl:12, name:"of Sparks", chance:8,  trigger:"strike", elem:"light", lo:1, hi:30, radius:2.4, label:"a nova of sparks"},
      {ilvl:30, name:"of the Storm", chance:10, trigger:"strike", elem:"light", lo:1, hi:80, radius:3.0, label:"a nova of sparks"} ] },
  { kind:"s", proc:true, slots:["chest","head","off","amulet","ring"], group:"procStruckCold", weight:0.4, tiers:[
      {ilvl:10, name:"of Frostward",  chance:10, trigger:"struck", elem:"cold", lo:6,  hi:14, radius:2.6, label:"a frost nova"},
      {ilvl:28, name:"of the Glacier", chance:12, trigger:"struck", elem:"cold", lo:15, hi:40, radius:3.0, label:"a frost nova"} ] },
  { kind:"s", proc:true, slots:["chest","head","off","amulet","ring"], group:"procStruckFire", weight:0.3, tiers:[
      {ilvl:18, name:"of Retribution", chance:8,  trigger:"struck", elem:"fire", lo:14, hi:36, radius:2.8, label:"a nova of wrath"},
      {ilvl:40, name:"of Vengeance",   chance:10, trigger:"struck", elem:"fire", lo:37, hi:80, radius:3.2, label:"a nova of wrath"} ] },
];
/* +to class skills and +to tree skills (D2 skill affixes), one set per class — rolled on
   amulets & circlets/helms at a reduced weight so they don't swamp the prefix pool */
(function addSkillAffixes() {
  const ADJ = { vanguard: ["Legionary's", "Warlord's"], emberwitch: ["Witch's", "Archmage's"],
    gravebinder: ["Binder's", "Necrarch's"], wildkeeper: ["Warden's", "Primarch's"], veilranger: ["Stalker's", "Pathfinder's"] };
  for (const cId in DATA.CLASSES) {
    const c = DATA.CLASSES[cId], adj = ADJ[cId] || [c.name + "'s", "Grand " + c.name + "'s"];
    DATA.AFFIXES.push({ stat: "skillClass_" + cId, kind: "p", slots: ["amulet", "head"], group: "skillClass_" + cId, weight: 0.18,
      tiers: [ { ilvl: 30, min: 1, max: 1, name: adj[0] }, { ilvl: 60, min: 2, max: 2, name: adj[1] } ] });
    (c.trees || []).forEach((tn, ti) => {
      DATA.AFFIXES.push({ stat: "skillTree_" + cId + "_" + ti, kind: "p", slots: ["amulet", "head"], group: "skillTree_" + cId + "_" + ti, weight: 0.12,
        tiers: [ { ilvl: 20, min: 1, max: 1, name: tn }, { ilvl: 40, min: 2, max: 2, name: tn }, { ilvl: 60, min: 3, max: 3, name: tn } ] });
    });
  }
})();

/* =====================  CHARMS  =====================
   Charms grant their affixes passively while carried in the pack (not the stash).
   Bigger charms take more grid space but roll more/stronger affixes. */
DATA.CHARM_BASES = {
  small: { id: "small", name: "Small Charm", w: 1, h: 1, maxAff: 1, mult: 0.55 },
  large: { id: "large", name: "Large Charm", w: 1, h: 2, maxAff: 2, mult: 0.70 },
  grand: { id: "grand", name: "Grand Charm", w: 1, h: 3, maxAff: 3, mult: 0.85 },
};
/* which affix stats may appear on charms (flat/attribute/utility — not %ED or %defense) */
DATA.CHARM_STATS = new Set([
  "hp", "mana", "str", "dex", "vit", "wil", "lifeRegen", "manaRegen",
  "resFire", "resCold", "resLight", "resPoison", "resAll",
  "ar", "minDmg", "maxDmg", "fireDmg", "coldDmg", "lightDmg", "poisonDmg",
  "mf", "goldFind", "frw",
]);

/* =====================  JEWELS  =====================
   Jewels are rolled socketables that drop into ANY open socket (weapon or armor)
   and apply their affixes on either side. Premium — they may roll the stronger
   combat stats glyphs/charms cannot. */
DATA.JEWEL_STATS = new Set([
  "dmgPct", "ar", "minDmg", "maxDmg", "fireDmg", "coldDmg", "lightDmg", "poisonDmg",
  "resFire", "resCold", "resLight", "resPoison", "resAll",
  "hp", "mana", "str", "dex", "vit", "wil", "ias", "mf", "goldFind",
  "lifeSteal", "manaSteal", "critChance", "dmgReduceFlat",
]);

/* =====================  UNIQUE SOCKETABLES  =====================
   Named, hand-tuned charms & jewels (rarity "unique"). Rare drops. */
DATA.UNIQUE_CHARMS = [
  { id: "uc_thief",    name: "Cutpurse Charm",    size: "small", ilvl: 12, stats: { mf: 12, goldFind: 30 }, flavor: "Luck, bottled and slightly used." },
  { id: "uc_ember",    name: "Emberheart Charm",  size: "small", ilvl: 20, stats: { fireDmg: 14, resFire: 14 }, flavor: "A coal that refuses to cool." },
  { id: "uc_quick",    name: "Hare's Charm",      size: "small", ilvl: 26, stats: { frw: 9, dex: 6 }, flavor: "Found, fittingly, very fast." },
  { id: "uc_mystic",   name: "Mystic Orbcharm",   size: "large", ilvl: 38, stats: { spellPct: 16, mana: 40, manaRegen: 25 }, flavor: "It hums the note between thoughts." },
  { id: "uc_grave",    name: "Gravewarden Charm", size: "large", ilvl: 40, stats: { hp: 45, resAll: 10, lifeRegen: 4 }, flavor: "The dead keep their distance." },
  { id: "uc_vampire",  name: "Sanguine Charm",    size: "large", ilvl: 50, stats: { lifeSteal: 5, manaSteal: 4, hp: 35 }, flavor: "It feeds so you don't have to." },
  { id: "uc_hunt",     name: "Huntress Talisman", size: "grand", ilvl: 45, stats: { dmgPct: 24, ar: 120, ias: 8 }, flavor: "Every shot already knows where it lands." },
  { id: "uc_warlord",  name: "Warlord's Sigil",   size: "grand", ilvl: 55, stats: { dmgPct: 28, str: 18, ccReduce: 20 }, flavor: "Carried by the last one standing." },
  { id: "uc_wyrm",     name: "Wyrmscale Charm",   size: "grand", ilvl: 62, stats: { resAll: 18, hp: 55, dmgReduceFlat: 6 }, flavor: "Shed by something far older than you." },
];
DATA.UNIQUE_JEWELS = [
  { id: "uj_rainbow", name: "Prismfire Jewel",   ilvl: 22, jcol: "#c060d0", affixes: [{ stat: "resAll", val: 12 }, { stat: "hp", val: 25 }], flavor: "All colours, one promise." },
  { id: "uj_rage",    name: "Jewel of Rage",     ilvl: 28, jcol: "#d04040", affixes: [{ stat: "dmgPct", val: 35 }, { stat: "ias", val: 10 }], flavor: "It wants you to swing." },
  { id: "uj_frost",   name: "Heartfrost Jewel",  ilvl: 34, jcol: "#40a0d0", affixes: [{ stat: "coldDmg", val: 30 }, { stat: "resCold", val: 20 }], flavor: "Cold enough to bite back." },
  { id: "uj_ward",    name: "Wardstone Jewel",   ilvl: 40, jcol: "#60c060", affixes: [{ stat: "dmgReduceFlat", val: 6 }, { stat: "resAll", val: 10 }], flavor: "A small, stubborn shield." },
  { id: "uj_leech",   name: "Bloodthirst Jewel", ilvl: 46, jcol: "#a02030", affixes: [{ stat: "lifeSteal", val: 5 }, { stat: "dmgPct", val: 24 }], flavor: "Drink deep." },
  { id: "uj_storm",   name: "Stormshard Jewel",  ilvl: 52, jcol: "#e0c040", affixes: [{ stat: "lightDmg", val: 40 }, { stat: "ias", val: 8 }], flavor: "It remembers a thunderhead." },
  { id: "uj_titan",   name: "Titanfall Jewel",   ilvl: 56, jcol: "#d08040", affixes: [{ stat: "maxDmg", val: 18 }, { stat: "str", val: 15 }], flavor: "Heavy with intent." },
  { id: "uj_seer",    name: "Seer's Jewel",      ilvl: 62, jcol: "#8060e0", affixes: [{ stat: "spellPct", val: 25 }, { stat: "mana", val: 40 }], flavor: "It looks back." },
];

/* human-readable lines for each stat key */
DATA.STAT_TEXT = {
  dmgPct: v => `+${v}% Damage`, dmgFlat: v => `+${v} Damage`,
  fireDmg: v => `Adds ${Math.ceil(v*.6)}-${v} Fire Damage`, coldDmg: v => `Adds ${Math.ceil(v*.6)}-${v} Cold Damage`,
  lightDmg: v => `Adds 1-${v} Lightning Damage`, poisonDmg: v => `Adds ${v} Poison Damage over 3s`,
  armorPct: v => `+${v}% Armor`, armor: v => `+${v} Armor`,
  hp: v => `+${v} to Life`, mana: v => `+${v} to Aether`,
  str: v => `+${v} Strength`, dex: v => `+${v} Dexterity`, vit: v => `+${v} Vitality`, wil: v => `+${v} Willpower`,
  ias: v => `+${v}% Attack Speed`, fcr: v => `+${v}% Cast Speed`, frw: v => `+${v}% Movement Speed`,
  lifeSteal: v => `${v}% Life Stolen per Hit`, manaRegen: v => `+${v}% Aether Regeneration`,
  resFire: v => `Fire Resist +${v}%`, resCold: v => `Cold Resist +${v}%`, resLight: v => `Lightning Resist +${v}%`,
  resPoison: v => `Poison Resist +${v}%`, resAll: v => `All Resistances +${v}%`,
  critChance: v => `+${v}% Critical Strike Chance`, critDmg: v => `+${v}% Critical Damage`,
  ar: v => `+${v} Attack Rating`, arPct: v => `+${v}% Attack Rating`,
  mf: v => `+${v}% Better Chance of Rare Loot`, goldFind: v => `+${v}% Gold Found`,
  dmgUndead: v => `+${v}% Damage to Undead`, skillAll: v => `+${v} to All Talents`,
  ccReduce: v => `${v}% Reduced Slow/Stun Duration`, hpPct: v => `+${v}% Maximum Life`,
  block: v => `+${v}% Block Chance`, thorns: v => `Attackers take ${v} Damage`,
  primalProc: v => `${v}% chance on hit to deal double Physical damage and erupt in Fire`,
  dmgToFire: () => `All your damage becomes Fire`, dodge: v => `+${v}% Evasion`, ias2: v => `+${v}% Attack Speed`,
  immovable: () => `Cannot be knocked back`, resAllPct: v => `All Resistances +${v}%`, spellPct: v => `+${v}% Spell Power`,
  totemRate: v => `+${v}% Totem Attack Speed`,
  dmgTakenPct: v => `${v}% more Damage Taken`, dmgReducePct: v => `${v}% Damage Reduction`,
  scorchPct: v => `+${v}% Scorch Damage`, scorchSpread: () => "Scorched enemies spread Scorch when killed",
  coldVsFrozenPct: v => `+${v}% Cold Damage against Frozen Enemies`, shatterRank: v => `Frozen enemies shatter on death for ${6 + 3 * v} Cold Damage`,
  minionHpPct: v => `+${v}% Minion Life`, minionThorns: v => `Minion attackers take ${v} Damage`,
  curseDurPct: v => `+${v}% Curse Duration`, curseRadiusPct: v => `+${v}% Curse Radius`, curseSpread: () => "Curses spread to a nearby enemy on death",
  soulCharge: v => `Cursed kills grant +${v}% Spell Power for 5s (stacks up to 5 times)`,
  poisonDotPct: v => `+${v}% Poison Damage over Time`, plagueSpreadPct: v => `+${v}% Plague Spread`,
  projRange: v => `+${v} Projectile Range`, trapPct: v => `+${v}% Trap Damage`,
  pShare: v => `The pack absorbs ${Math.min(50, v)}% of your incoming damage`, pManaPerBeast: v => `Regenerate ${v} Aether per second per living beast`,
  /* D2-style affixes */
  minDmg: v => `+${v} to Minimum Damage`, maxDmg: v => `+${v} to Maximum Damage`,
  manaSteal: v => `${v}% Aether Stolen per Hit`,
  lifeRegen: v => `Replenish Life +${v}`,
  manaAfterKill: v => `+${v} Aether after each Kill`,
  dmgToMana: v => `${v}% of Damage Taken goes to Aether`,
  dmgReduceFlat: v => `Physical Damage Reduced by ${v}`,
  magicReduceFlat: v => `Elemental Damage Reduced by ${v}`,
  dmgDemon: v => `+${v}% Damage to Demons`,
  arUndead: v => `+${v} Attack Rating vs. Undead`,
  arDemon: v => `+${v} Attack Rating vs. Demons`,
  knockback: () => `Knockback`,
  monsterFlee: v => `Hit Causes Monster to Flee ${v}%`,
  preventHeal: () => `Prevent Monster Heal`,
  reqReduce: v => `Requirements -${v}%`,
  lifeOnDeath: v => `+${v} Life after each Kill`,
  lightRadius: v => `+${v} to Light Radius`,
  dodge: v => `+${v}% Evasion`,
  hpPct: v => `+${v}% Maximum Life`,
};
/* +to class / +to tree skill affixes get auto-generated render lines */
for (const cId in DATA.CLASSES) {
  const c = DATA.CLASSES[cId];
  DATA.STAT_TEXT["skillClass_" + cId] = v => `+${v} to ${c.name} Talents`;
  (c.trees || []).forEach((tn, ti) => {
    DATA.STAT_TEXT["skillTree_" + cId + "_" + ti] = v => `+${v} to ${tn} Talents`;
  });
}

/* =====================  GLYPHS (socketables)  =====================
   Effect depends on where the glyph sits: weapons (wpn) vs armor/shields (arm). */
DATA.GLYPHS = {
  g_ember:   { id: "g_ember",   name: "Glyph of Embers",  color: "#ff9040", wpn: { fireDmg: 6 },  arm: { resFire: 12 },
               flavor: "Warm to the touch, like a banked coal." },
  g_rime:    { id: "g_rime",    name: "Glyph of Rime",    color: "#9fd8ff", wpn: { coldDmg: 5 },  arm: { resCold: 12 },
               flavor: "It never quite thaws." },
  g_storm:   { id: "g_storm",   name: "Glyph of Storms",  color: "#f0e080", wpn: { lightDmg: 9 }, arm: { resLight: 12 },
               flavor: "Hums faintly before rain." },
  g_blood:   { id: "g_blood",   name: "Glyph of Blood",   color: "#d04040", wpn: { lifeSteal: 3 }, arm: { hp: 18 },
               flavor: "Carved by someone who paid for it." },
  g_stone:   { id: "g_stone",   name: "Glyph of Stone",   color: "#b0a890", wpn: { arPct: 25, dmgPct: 8 }, arm: { armorPct: 20 },
               flavor: "Mountains keep their promises." },
  g_fortune: { id: "g_fortune", name: "Glyph of Fortune", color: "#7fd8c0", wpn: { mf: 10 }, arm: { goldFind: 25, mf: 6 },
               flavor: "Lucky for somebody. Possibly you." },
  /* unique glyphs — rare, stronger, dual-purpose (rarity "unique" in makeGlyph) */
  g_doom:   { id: "g_doom",   name: "Doomglyph",   unique: true, color: "#ff5050", wpn: { dmgPct: 25, fireDmg: 12 }, arm: { resAll: 12, hp: 25 },
               flavor: "Cut from a stone that had seen the end of things." },
  g_void:   { id: "g_void",   name: "Voidglyph",   unique: true, color: "#a060e0", wpn: { spellPct: 20, manaSteal: 4 }, arm: { mana: 40, fcr: 8 },
               flavor: "It drinks the light around it." },
  g_titan:  { id: "g_titan",  name: "Titanglyph",  unique: true, color: "#e0a040", wpn: { maxDmg: 14, str: 12 }, arm: { armorPct: 30, str: 10 },
               flavor: "Forged for hands larger than yours." },
  g_wraith: { id: "g_wraith", name: "Wraithglyph", unique: true, color: "#80d0c0", wpn: { lifeSteal: 5, critChance: 5 }, arm: { frw: 12, dodge: 8 },
               flavor: "Half here, and the better half." },
  g_aegis:  { id: "g_aegis",  name: "Aegisglyph",  unique: true, color: "#f0e090", wpn: { dmgUndead: 60, ar: 80 }, arm: { resAll: 15, dmgReduceFlat: 4 },
               flavor: "Blessed against the things that don't stay buried." },
  g_venom:  { id: "g_venom",  name: "Venomglyph",  unique: true, color: "#90e040", wpn: { poisonDmg: 30, ias: 8 }, arm: { resPoison: 30, hp: 20 },
               flavor: "Weeps a single green bead when the moon is wrong." },
};

/* =====================  TIERED BASE EXPANSION (lv1–100)  =====================
   Procedurally builds a deep ladder of weapon & armor bases so the loot roller
   spans the whole 1–100 range. Combined with the affix pool this yields many
   thousands of distinct generated items. Hand-authored bases above are kept
   (uniques/sets/starter kit reference them by id). */
(function expandBases() {
  const TI = [1, 4, 8, 13, 19, 26, 34, 43, 52, 61, 70, 80, 90, 99];   // ilvl ladder (14 tiers)
  const WQ = ["Rusted", "Iron", "Honed", "Steel", "Soldier's", "Knightly", "Tempered", "Runed", "Mithral", "Dragonbone", "Obsidian", "Celestial", "Sunforged", "Worldforged"];
  const AQ = ["Tattered", "Leather", "Studded", "Iron", "Chain", "Steel", "Knightly", "Runed", "Mithral", "Dragonbone", "Obsidian", "Celestial", "Sunforged", "Worldforged"];
  const rd = n => Math.round(n);
  /* weapon lines: dmg avg ~ lo0 + L*loG ; 2H/slow hit harder */
  const WLINES = [
    { cat:"sword",  noun:"Sword",      icon:"sword",  w:1,h:3, speed:1.15, lo0:2,  loG:0.7, hi0:6,  hiG:1.7 },
    { cat:"sword",  noun:"Greatsword", icon:"sword",  w:2,h:3, speed:0.85, lo0:5,  loG:1.1, hi0:12, hiG:2.6, twoHand:true },
    { cat:"axe",    noun:"Axe",        icon:"axe",    w:1,h:3, speed:1.0,  lo0:3,  loG:0.8, hi0:8,  hiG:1.9 },
    { cat:"axe",    noun:"Greataxe",   icon:"axe",    w:2,h:3, speed:0.8,  lo0:6,  loG:1.2, hi0:14, hiG:2.8, twoHand:true },
    { cat:"mace",   noun:"Mace",       icon:"mace",   w:1,h:3, speed:1.0,  lo0:3,  loG:0.85,hi0:7,  hiG:2.0 },
    { cat:"mace",   noun:"Maul",       icon:"mace",   w:2,h:4, speed:0.7,  lo0:7,  loG:1.3, hi0:15, hiG:3.0, twoHand:true },
    { cat:"dagger", noun:"Dagger",     icon:"dagger", w:1,h:2, speed:1.4,  lo0:1,  loG:0.5, hi0:5,  hiG:1.3 },
    { cat:"spear",  noun:"Spear",      icon:"spear",  w:1,h:4, speed:0.95, lo0:4,  loG:0.95,hi0:11, hiG:2.3, twoHand:true, reach:0.5 },
    { cat:"bow",    noun:"Bow",        icon:"bow",    w:2,h:3, speed:1.1,  lo0:2,  loG:0.7, hi0:8,  hiG:1.9, twoHand:true, ranged:true },
    { cat:"crossbow",noun:"Crossbow",  icon:"crossbow",w:2,h:3, speed:0.85, lo0:5,  loG:1.0, hi0:13, hiG:2.5, twoHand:true, ranged:true },
    { cat:"wand",   noun:"Wand",       icon:"wand",   w:1,h:2, speed:1.2,  lo0:1,  loG:0.5, hi0:4,  hiG:1.2 },
    { cat:"staff",  noun:"Staff",      icon:"staff",  w:1,h:4, speed:0.95, lo0:3,  loG:0.8, hi0:10, hiG:2.1, twoHand:true },
  ];
  for (const L of WLINES) {
    TI.forEach((ilvl, t) => {
      const id = `${L.cat}${L.twoHand ? "2h" : ""}_t${t}`;
      if (DATA.BASES[id]) return;
      const lo = rd(L.lo0 + ilvl * L.loG), hi = rd(L.hi0 + ilvl * L.hiG);
      DATA.BASES[id] = { id, name: `${WQ[t]} ${L.noun}`, slot: "main", cat: L.cat, w: L.w, h: L.h,
        dmg: [Math.max(1, lo), Math.max(lo + 1, hi)], speed: L.speed, ilvl, icon: L.icon,
        twoHand: !!L.twoHand, ranged: !!L.ranged, reach: L.reach,
        maxSockets: (L.w * L.h >= 6 ? 3 : (L.h >= 3 ? 2 : 1)) };
    });
  }
  /* armor lines */
  const ALINES = [
    { slot:"head",  cat:"helm",   noun:"Helm",      icon:"helm",   w:2,h:2, a0:2, aG:0.55, sock:2 },
    { slot:"chest", cat:"chest",  noun:"Cuirass",   icon:"chest",  w:2,h:3, a0:5, aG:1.1,  sock:3 },
    { slot:"gloves",cat:"gloves", noun:"Gauntlets", icon:"gloves", w:2,h:2, a0:1, aG:0.4,  sock:0 },
    { slot:"boots", cat:"boots",  noun:"Greaves",   icon:"boots",  w:2,h:2, a0:1, aG:0.42, sock:0 },
    { slot:"belt",  cat:"belt",   noun:"Belt",      icon:"belt",   w:2,h:1, a0:1, aG:0.35, sock:0 },
    { slot:"off",   cat:"shield", noun:"Shield",    icon:"shield", w:2,h:3, a0:3, aG:0.7,  sock:2, block:true },
  ];
  for (const L of ALINES) {
    TI.forEach((ilvl, t) => {
      const id = `${L.cat}_t${t}`;
      if (DATA.BASES[id]) return;
      const b = { id, name: `${AQ[t]} ${L.noun}`, slot: L.slot, cat: L.cat, w: L.w, h: L.h,
        armor: rd(L.a0 + ilvl * L.aG), ilvl, icon: L.icon, maxSockets: L.sock };
      if (L.block) b.block = Math.min(40, 12 + t * 2);
      DATA.BASES[id] = b;
    });
  }
  /* jewelry tiers (roll affixes; ilvl just gates better affix tiers) */
  ["ring", "amulet"].forEach(slot => {
    TI.forEach((ilvl, t) => {
      if (t === 0) return;
      const id = `${slot}_t${t}`;
      if (DATA.BASES[id]) return;
      DATA.BASES[id] = { id, name: slot === "ring" ? "Ring" : "Amulet", slot, cat: slot, w: 1, h: 1, ilvl, icon: slot, noCommon: true };
    });
  });

  /* deepen the affix ladder: every affix gains higher tiers scaling to ilvl ~95,
     so items at level 50–100 roll meaningfully bigger numbers */
  for (const af of DATA.AFFIXES) {
    if (af.proc || af.perLevel) continue;         // procs/per-level affixes aren't tier-deepened
    const top = af.tiers[af.tiers.length - 1];
    if (top.ilvl >= 60) continue;                 // already deep
    const addAt = [ Math.min(95, top.ilvl + 12), Math.min(99, top.ilvl + 26) ];
    let prev = top;
    for (const ilvl of addAt) {
      if (ilvl <= prev.ilvl) continue;
      const grow = ilvl / Math.max(1, prev.ilvl), k = 1 + grow * 0.55;
      const nt = prev.mods
        ? { ilvl, name: top.name, mods: prev.mods.map(m => ({ stat: m.stat, min: Math.round(m.min * k), max: Math.round(m.max * k) })) }
        : { ilvl, min: Math.round(prev.min * k), max: Math.round(prev.max * k), name: top.name };
      af.tiers.push(nt); prev = nt;
    }
  }
})();

/* Player-equipment art is resolved from explicit base metadata.  This remains
   separate from inventory icons: the actor compositor only accepts authored,
   class-aligned rig families.  Tier numbers are stable save-independent data
   (0..13), while armor silhouettes deliberately span four readable families. */
(function annotatePlayerEquipmentVisuals() {
  const TI = [1, 4, 8, 13, 19, 26, 34, 43, 52, 61, 70, 80, 90, 99];
  const tierFor = b => {
    const namedTier = /_t(\d+)$/.exec(b.id || "");
    if (namedTier) return Math.max(0, Math.min(13, Number(namedTier[1])));
    let tier = 0;
    for (let i = 0; i < TI.length; i++) if ((b.ilvl || 1) >= TI[i]) tier = i;
    return tier;
  };
  const armorFamily = tier => tier <= 2 ? "light" : tier <= 5 ? "mail" : tier <= 9 ? "plate" : "mythic";
  const oneOrTwoHand = new Set(["sword", "axe", "mace"]);
  const fixedWeaponFamilies = new Set(["dagger", "spear", "bow", "crossbow", "wand", "staff"]);

  for (const b of Object.values(DATA.BASES)) {
    if (!["main", "off", "head", "chest"].includes(b.slot)) continue;
    b.materialTier = tierFor(b);
    if (b.slot === "main") {
      if (oneOrTwoHand.has(b.cat)) b.playerVisualFamily = `${b.cat}_${b.twoHand ? "2h" : "1h"}`;
      else if (fixedWeaponFamilies.has(b.cat)) b.playerVisualFamily = `${b.cat}_${b.twoHand ? "2h" : "1h"}`;
    } else if (b.slot === "off" && b.cat === "shield") b.playerVisualFamily = "shield";
    else if (b.slot === "head" || b.slot === "chest") b.playerVisualFamily = armorFamily(b.materialTier);
  }

  /* These named early-game pieces predate the tier ladder.  Their names and
     established silhouettes are authoritative over their numerical ilvl. */
  for (const id of ["cap", "quiltvest"]) if (DATA.BASES[id]) DATA.BASES[id].playerVisualFamily = "light";
  for (const id of ["warhelm", "hauberk"]) if (DATA.BASES[id]) DATA.BASES[id].playerVisualFamily = "mail";
})();

/* rare-name generator word lists */
DATA.RARE_PRE = ["Doom","Grim","Ash","Blood","Storm","Bone","Dread","Shadow","Iron","Wraith","Ember","Sorrow","Gloom","Raven","Pale","Hollow","Frost","Cinder","Venom","Thorn","Gilded","Sunken","Vile","Wretched","Howling"];
DATA.RARE_SUF = ["Bite","Mark","Song","Veil","Brand","Grasp","Howl","Ward","Edge","Shroud","Coil","Oath","Hunger","Spire","Knell","Fang","Roar","Sigh","Wail","Ruin","Gale","Thirst","Vow","Scourge","Lament"];

/* =====================  UNIQUE ITEMS  ===================== */
DATA.UNIQUES = [
  { id:"u_gravebite", base:"handaxe", name:"Gravebite", ilvl:3,
    stats:{ dmgPct:60, lifeSteal:4, dmgUndead:80 }, flavor:"It has tasted more coffins than trees." },
  { id:"u_widow", base:"dirk", name:"Widow's Lament", ilvl:3,
    stats:{ poisonDmg:12, dex:6, ias:15 }, flavor:"Quiet as the grief that follows." },
  { id:"u_cinder", base:"quiltvest", name:"Cindershroud", ilvl:4,
    stats:{ armorPct:50, resFire:30, thorns:4 }, flavor:"Woven from the hems of burned banners." },
  { id:"u_oath", base:"kiteshield", name:"Oathkeeper's Wall", ilvl:6,
    stats:{ block:15, resAll:12, hp:25 }, flavor:"The oath outlived the keeper." },
  { id:"u_crown", base:"cap", name:"Hollow Crown", ilvl:5,
    stats:{ skillAll:1, mana:20, mf:20 }, flavor:"Whoever wore it first is still missing." },
  { id:"u_marrow", base:"ring", name:"Marrow Band", ilvl:4,
    stats:{ hp:30, lifeSteal:3 }, flavor:"Warm to the touch. Always." },
  { id:"u_stormknot", base:"amulet", name:"Stormcaller's Knot", ilvl:5,
    stats:{ lightDmg:18, fcr:10, resLight:25 }, flavor:"Tied during a thunderclap, or so the peddler swore." },
  { id:"u_stride", base:"warboots", name:"Stridewraith", ilvl:5,
    stats:{ frw:25, dex:8, resCold:20 }, flavor:"The footprints arrive a moment late." },
  { id:"u_kingsplit", base:"waraxe", name:"Kingsplitter", ilvl:8,
    stats:{ dmgPct:90, critChance:8, str:10 }, flavor:"Crowns are softer than they look." },
];

/* =====================  ENEMIES  ===================== */
DATA.ENEMIES = {
  /* ===== signature beasts: dragons, giant serpents, gargoyles, axe-demons ===== */
  /* -- Dragons: big, armored, breathe their element from range -- */
  frost_wyrm: { id:"frost_wyrm", name:"Frost Wyrm", family:"dragon", lvl:8, hp:160, dmg:[10,18], armor:10, def:30, xp:240,
    speed:2.0, atkRate:0.7, range:1.6, sight:16, big:2.0, sprite:"dragon",
    projectile:{ speed:8, kind:"frostshard", elem:"cold" }, keepDist:6, chillOnHit:2, slam:{ cd:8, radius:2.6, mult:1.3 },
    pal:{ body:"#5a86a8", belly:"#cfe6f4", wing:"#3a5a74", horn:"#dfeefc", eye:"#bfe8ff" }, sounds:"beast", title:"of the White Reach" },
  ash_drake: { id:"ash_drake", name:"Ash Drake", family:"dragon", lvl:14, hp:210, dmg:[14,24], armor:12, def:40, xp:360,
    speed:2.2, atkRate:0.8, range:1.7, sight:18, big:2.1, sprite:"dragon",
    projectile:{ speed:9, kind:"firebolt", elem:"fire" }, keepDist:6, charge:{ cd:9, range:9, mult:1.7, speed:10 },
    pal:{ body:"#7a2e26", belly:"#e89a52", wing:"#4a1a18", horn:"#f0c060", eye:"#ff8020" }, sounds:"beast", title:"cinderwinged" },
  bone_dragon: { id:"bone_dragon", name:"Bone Dragon", family:"dragon", lvl:18, hp:320, dmg:[18,30], armor:14, def:45, xp:640,
    speed:2.0, atkRate:0.75, range:1.8, sight:20, big:2.3, sprite:"dragon", boss:"mini",
    projectile:{ speed:9, kind:"soulbolt", elem:"shadow" }, keepDist:7, slam:{ cd:7, radius:3, mult:1.5 }, deathBurst:{ radius:3, dmg:30, elem:"shadow" },
    pal:{ body:"#cfd2c2", belly:"#eef0e2", wing:"#6a6a5a", horn:"#8a8a72", eye:"#7fff9f" }, sounds:"bone", title:"the Undying Wyrm" },
  /* -- Giant serpents: fast, venomous, lunging -- */
  cave_python: { id:"cave_python", name:"Cave Constrictor", family:"serpent", lvl:7, hp:64, dmg:[7,13], armor:4, def:40, xp:70,
    speed:3.4, atkRate:1.1, range:1.1, sight:11, poison:5, big:1.3, sprite:"serpent", pack:[1,2], charge:{ cd:6, range:7, mult:1.5, speed:11 },
    pal:{ body:"#5a5238", belly:"#b0a878", eye:"#ffd040" }, sounds:"beast" },
  marsh_serpent: { id:"marsh_serpent", name:"Marsh Serpent", family:"serpent", lvl:12, hp:92, dmg:[9,16], armor:5, def:46, xp:120,
    speed:3.6, atkRate:1.1, range:1.1, sight:12, poison:8, big:1.45, sprite:"serpent", charge:{ cd:6, range:8, mult:1.6, speed:12 },
    pal:{ body:"#2e5a3a", belly:"#9fd07a", eye:"#b0ff50" }, sounds:"beast", title:"of the drowned fen" },
  dune_serpent: { id:"dune_serpent", name:"Dune Serpent", family:"serpent", lvl:15, hp:124, dmg:[12,20], armor:7, def:50, xp:175,
    speed:3.8, atkRate:1.2, range:1.2, sight:13, poison:10, big:1.6, sprite:"serpent", charge:{ cd:5, range:9, mult:1.8, speed:13 },
    pal:{ body:"#b08a4a", belly:"#e8d8a0", eye:"#ff9020" }, sounds:"beast", title:"the Sand-Swimmer" },
  /* -- Gargoyles: stone-armored, dive-bombing -- */
  stone_gargoyle: { id:"stone_gargoyle", name:"Stone Gargoyle", family:"gargoyle", lvl:11, hp:84, dmg:[9,16], armor:16, def:40, xp:110,
    speed:2.4, atkRate:0.9, range:1.0, sight:13, big:1.35, sprite:"gargoyle", leap:{ cd:6, range:8, radius:2.2, mult:1.6 },
    pal:{ stone:"#7e8088", wing:"#5a5c64", horn:"#9aa0a8", eye:"#ff6030" }, sounds:"brute" },
  chapel_grotesque: { id:"chapel_grotesque", name:"Chapel Grotesque", family:"gargoyle", lvl:14, hp:124, dmg:[11,19], armor:18, def:46, xp:165,
    speed:2.5, atkRate:0.9, range:1.1, sight:14, big:1.45, sprite:"gargoyle", leap:{ cd:5, range:9, radius:2.4, mult:1.8 }, thorns:6,
    pal:{ stone:"#6a6660", wing:"#48443e", horn:"#8a847a", eye:"#ffd040" }, sounds:"brute", title:"perched and patient" },
  void_gargoyle: { id:"void_gargoyle", name:"Void Gargoyle", family:"gargoyle", lvl:18, hp:172, dmg:[15,25], armor:20, def:52, xp:285,
    speed:2.6, atkRate:1.0, range:1.1, sight:16, big:1.55, sprite:"gargoyle", leap:{ cd:5, range:10, radius:2.6, mult:2.0 }, deathBurst:{ radius:2.6, dmg:24, elem:"shadow" },
    pal:{ stone:"#3a3848", wing:"#262430", horn:"#6a5a8a", eye:"#c060ff" }, sounds:"brute", title:"chiselled from nothing" },
  /* -- Spectral wraiths: floating undead, blink + spectral bolts -- */
  grave_wraith: { id:"grave_wraith", name:"Grave Wraith", family:"undead", lvl:5, hp:46, dmg:[5,10], armor:6, def:26, xp:64,
    speed:2.5, atkRate:0.8, range:0.95, sight:11, big:1.0, sprite:"wraith", teleports:{ cd:5, minDist:4 },
    pal:{ cloak:"#2c2834", wisp:"#9fb0c8", eye:"#bfe0ff" }, sounds:"bone", title:"unquiet" },
  frost_wraith: { id:"frost_wraith", name:"Frost Wraith", family:"undead", lvl:12, hp:96, dmg:[9,16], armor:9, def:40, xp:150,
    speed:2.4, atkRate:0.7, range:9, sight:13, big:1.15, sprite:"wraith",
    projectile:{ speed:9, kind:"frostshard", elem:"cold" }, keepDist:6, chillOnHit:2, teleports:{ cd:6, minDist:4 },
    pal:{ cloak:"#28323a", wisp:"#bfe6f4", eye:"#cfeeff" }, sounds:"bone", title:"of the long winter" },
  void_wraith: { id:"void_wraith", name:"Void Wraith", family:"undead", lvl:20, hp:182, dmg:[16,26], armor:14, def:52, xp:300,
    speed:2.7, atkRate:0.8, range:9, sight:16, big:1.3, sprite:"wraith",
    projectile:{ speed:10, kind:"soulbolt", elem:"shadow" }, keepDist:6, teleports:{ cd:4, minDist:5 }, deathBurst:{ radius:2.6, dmg:26, elem:"shadow" },
    pal:{ cloak:"#241f30", wisp:"#9a7ad0", eye:"#c060ff" }, sounds:"bone", title:"the hollow between" },
  /* -- Acid oozes: slow, split when killed, leave caustic muck -- */
  caustic_ooze: { id:"caustic_ooze", name:"Caustic Ooze", family:"beast", lvl:4, hp:50, dmg:[4,9], armor:3, def:18, xp:60,
    speed:1.4, atkRate:0.7, range:0.9, sight:8, big:1.1, sprite:"ooze", splitOnDeath:{ count:2 }, poison:5,
    pal:{ goo:"#7abf4a", glow:"#cfff80", eye:"#163008" }, sounds:"beast", title:"it was a man once" },
  sludge_horror: { id:"sludge_horror", name:"Sludge Horror", family:"beast", lvl:15, hp:150, dmg:[12,20], armor:8, def:44, xp:180,
    speed:1.5, atkRate:0.7, range:1.0, sight:9, big:1.5, sprite:"ooze", splitOnDeath:{ count:2 }, deathBurst:{ radius:2.4, dmg:18, elem:"poison" }, poison:8,
    pal:{ goo:"#5a7a3a", glow:"#a0d060", eye:"#101c08" }, sounds:"beast", title:"the bog's appetite" },
  /* -- Winged imps: small, fast, fling bolts and blink away -- */
  cinder_imp: { id:"cinder_imp", name:"Cinder Imp", family:"demon", lvl:7, hp:48, dmg:[5,10], armor:4, def:26, xp:72,
    speed:2.6, atkRate:0.8, range:8, sight:11, big:0.85, sprite:"imp",
    projectile:{ speed:9, kind:"shardbolt", elem:"fire" }, keepDist:5, teleports:{ cd:5, minDist:4 },
    pal:{ skin:"#b8402a", wing:"#5a1c14", horn:"#2a1208", eye:"#ffd24a" }, sounds:"brute", title:"spat from the breach" },
  hex_imp: { id:"hex_imp", name:"Hex Imp", family:"demon", lvl:14, hp:96, dmg:[9,16], armor:7, def:42, xp:150,
    speed:2.8, atkRate:0.8, range:9, sight:13, big:0.95, sprite:"imp",
    projectile:{ speed:10, kind:"soulbolt", elem:"shadow" }, keepDist:6, teleports:{ cd:4, minDist:5 },
    pal:{ skin:"#7a3a8a", wing:"#341444", horn:"#1c0a24", eye:"#d080ff" }, sounds:"brute", title:"a little curse with wings" },
  /* -- Treants: slow, tanky walking trees that slam and bristle with thorns -- */
  gnarl_treant: { id:"gnarl_treant", name:"Gnarl Treant", family:"beast", lvl:9, hp:170, dmg:[10,18], armor:14, def:30, xp:130,
    speed:1.3, atkRate:0.6, range:1.4, sight:9, big:1.7, sprite:"treant", slam:{ cd:7, radius:2.6, mult:1.4 }, thorns:6,
    pal:{ bark:"#5a4632", wood:"#74604a", leaf:"#3a5a2c", eye:"#d0ff80" }, sounds:"brute", title:"older than the road" },
  blight_treant: { id:"blight_treant", name:"Blight Treant", family:"beast", lvl:17, hp:260, dmg:[15,25], armor:18, def:48, xp:240,
    speed:1.3, atkRate:0.6, range:1.5, sight:10, big:2.0, sprite:"treant", slam:{ cd:6, radius:3.0, mult:1.6 }, thorns:9, deathBurst:{ radius:2.8, dmg:22, elem:"poison" }, poison:6,
    pal:{ bark:"#42402a", wood:"#5a5a38", leaf:"#6a7a30", eye:"#b0ff60" }, sounds:"brute", title:"rotten to the root" },
  /* -- Large axe-wielding demons: heavy melee, charge + smash -- */
  brimstone_brute: { id:"brimstone_brute", name:"Brimstone Brute", family:"axedemon", lvl:13, hp:150, dmg:[12,22], armor:9, def:34, xp:150,
    speed:2.0, atkRate:0.7, range:1.6, sight:14, big:1.9, sprite:"demon", slam:{ cd:7, radius:2.6, mult:1.5 }, charge:{ cd:9, range:8, mult:1.6, speed:9 },
    pal:{ skin:"#9a3a2a", horn:"#3a2a1c", metal:"#8a8e96", eye:"#ff7020" }, sounds:"brute", title:"axe of the pit" },
  ashfiend_reaver: { id:"ashfiend_reaver", name:"Ashfiend Reaver", family:"axedemon", lvl:16, hp:215, dmg:[15,26], armor:11, def:40, xp:245,
    speed:2.1, atkRate:0.75, range:1.7, sight:16, big:2.05, sprite:"demon", slam:{ cd:6, radius:2.8, mult:1.6 }, charge:{ cd:8, range:9, mult:1.8, speed:10 },
    pal:{ skin:"#7a2a22", horn:"#241612", metal:"#9aa0a8", eye:"#ff5020" }, sounds:"brute", title:"the Cleaver" },
  /* -- Flesh Engine: a corpse-machine that hurls undead at the hero -- */
  flesh_engine: { id:"flesh_engine", name:"Flesh Engine Abomination", family:"abomination", lvl:17, hp:360, dmg:[14,24], armor:12, def:30, xp:460,
    speed:1.5, atkRate:0.55, range:1.8, sight:18, big:2.2, sprite:"abom", boss:"mini",
    throwUndead:{ cd:6, range:13, count:1, mult:1.3, radius:2.0, pool:["risen","tomb_husk","drowned_dead","frost_risen"] },
    slam:{ cd:8, radius:2.8, mult:1.4 },
    pal:{ flesh:"#8b6b62", raw:"#7b2524", metal:"#3b332a", bone:"#cdbf95", eye:"#ff6a00" }, sounds:"brute", title:"the Corpse-Hurler" },
  infernal_warlord: { id:"infernal_warlord", name:"Infernal Warlord", family:"axedemon", lvl:20, hp:330, dmg:[20,34], armor:14, def:46, xp:520,
    speed:2.1, atkRate:0.8, range:1.9, sight:20, big:2.3, sprite:"demon", boss:"mini", slam:{ cd:5, radius:3.2, mult:1.8 }, charge:{ cd:7, range:10, mult:2.0, speed:10 }, enrage:0.35,
    pal:{ skin:"#5a1e18", horn:"#1a0e0a", metal:"#b0b4bc", eye:"#ff3010" }, sounds:"boss", title:"Hewer of the Throne" },
  risen: { id:"risen", name:"Risen", family:"undead", lvl:1, hp:16, dmg:[2,5], armor:2, def:20, xp:14,
    speed:1.7, atkRate:0.8, range:0.9, sight:8, sprite:"skeleton",
    pal:{ bone:"#cfc6ad", trim:"#5a4a33", eye:"#7fd0ff" },
    sounds:"bone", flavor:"shambling dead" },
  bone_archer: { id:"bone_archer", name:"Bone Archer", family:"undead", lvl:2, hp:13, dmg:[3,7], armor:1, def:30, xp:18,
    speed:1.6, atkRate:0.7, range:7, sight:10, projectile:{ speed:9, kind:"arrow" }, keepDist:5, sprite:"skeleton",
    pal:{ bone:"#c6bd9e", trim:"#3a4a5a", eye:"#9fe0ff" }, bow:true, sounds:"bone" },
  grave_hound: { id:"grave_hound", name:"Grave Hound", family:"beast", lvl:2, hp:12, dmg:[2,6], armor:1, def:35, xp:16,
    speed:3.4, atkRate:1.4, range:0.9, sight:11, pack:[3,5], sprite:"hound",
    pal:{ fur:"#4a4038", trim:"#2a2018", eye:"#ff6040" }, sounds:"beast" },
  cult_acolyte: { id:"cult_acolyte", name:"Cult Acolyte", family:"cultist", lvl:3, hp:18, dmg:[4,9], armor:2, def:25, xp:24,
    speed:1.9, atkRate:0.6, range:8, sight:11, projectile:{ speed:7, kind:"firebolt", elem:"fire" }, keepDist:6,
    sprite:"robed", pal:{ robe:"#3a2030", trim:"#8a4a20", skin:"#b09078", eye:"#ffaa40" }, sounds:"human" },
  crypt_widow: { id:"crypt_widow", name:"Crypt Widow", family:"insect", lvl:4, hp:15, dmg:[3,7], armor:2, def:40, xp:22,
    speed:3.0, atkRate:1.2, range:0.9, sight:9, pack:[2,4], poison:4, sprite:"spider",
    pal:{ fur:"#2a3024", trim:"#506040", eye:"#b0ff40" }, sounds:"insect" },
  tomb_husk: { id:"tomb_husk", name:"Tomb Husk", family:"undead", lvl:5, hp:46, dmg:[6,13], armor:8, def:15, xp:40,
    speed:1.2, atkRate:0.55, range:1.1, sight:7, big:1.25, sprite:"brute",
    pal:{ skin:"#7a8068", trim:"#3a3528", eye:"#d0ff70" }, sounds:"brute" },
  fallen_blade: { id:"fallen_blade", name:"Fallen Blade", family:"knight", lvl:6, hp:34, dmg:[6,12], armor:6, def:45, xp:42,
    speed:2.3, atkRate:1.0, range:1.0, sight:9, shield:true, block:20, sprite:"knight",
    pal:{ armor:"#4a4e58", trim:"#6a3a28", eye:"#ff5040", skin:"#202024" }, sounds:"metal" },
  /* named elite for quest 2 */
  gravecaller: { id:"gravecaller", name:"Gravecaller Hesh", family:"cultist", lvl:5, hp:120, dmg:[5,11], armor:4, def:30, xp:220,
    speed:2.0, atkRate:0.6, range:8, sight:13, projectile:{ speed:7, kind:"firebolt", elem:"fire" }, keepDist:5,
    summons:{ id:"risen", count:2, cd:9 }, boss:"mini", big:1.2, sprite:"robed",
    pal:{ robe:"#202a3a", trim:"#b08a30", skin:"#9a8068", eye:"#70c0ff" }, sounds:"human",
    title:"Voice of the Hollow Choir" },
  /* region boss */
  morthul: { id:"morthul", name:"Morthul, the Grave-Warden", family:"undead", lvl:8, hp:520, dmg:[10,20], armor:10, def:50, xp:1200,
    speed:2.0, atkRate:0.8, range:1.4, sight:20, boss:"act", big:1.7, sprite:"boss",
    pal:{ bone:"#d8cdb0", trim:"#7a2828", eye:"#ff4030", armor:"#3a3e48" },
    slam:{ cd:7, radius:3, mult:1.4 }, summons:{ id:"risen", count:3, cd:14 }, enrage:0.3,
    sounds:"boss", title:"Keeper of the Sunken Vigil" },
  /* ---- Act expansion: chapel, Blackbough, Greymonastery ---- */
  cult_zealot: { id:"cult_zealot", name:"Cult Zealot", family:"cultist", lvl:5, hp:20, dmg:[4,9], armor:2, def:45, xp:30,
    speed:3.6, atkRate:1.5, range:0.9, sight:11, pack:[2,4], sprite:"robed",
    pal:{ robe:"#4a2030", trim:"#c05030", skin:"#b09078", eye:"#ff6040" }, sounds:"human",
    flavor:"believes hard, runs harder" },
  blight_wasp: { id:"blight_wasp", name:"Blight Wasp", family:"insect", lvl:6, hp:16, dmg:[3,8], armor:1, def:55, xp:28,
    speed:3.8, atkRate:1.4, range:0.9, sight:10, pack:[3,6], poison:5, sprite:"spider",
    pal:{ fur:"#5a5224", trim:"#c0b040", eye:"#ffe040" }, sounds:"insect" },
  fen_stalker: { id:"fen_stalker", name:"Fen Stalker", family:"swamp", lvl:6, hp:42, dmg:[6,12], armor:5, def:30, xp:44,
    speed:2.4, atkRate:0.8, range:1.0, sight:9, poison:6, big:1.15, sprite:"brute",
    pal:{ skin:"#4a6048", trim:"#2a3a28", eye:"#a0ff80" }, sounds:"brute" },
  thorn_shambler: { id:"thorn_shambler", name:"Thorn Shambler", family:"elemental", lvl:7, hp:60, dmg:[7,13], armor:9, def:20, xp:52,
    speed:1.1, atkRate:0.5, range:1.1, sight:7, big:1.25, thorns:5, sprite:"brute",
    pal:{ skin:"#3a4a2a", trim:"#6a8a3a", eye:"#d0ff60" }, sounds:"brute",
    flavor:"hurts to hit" },
  gloom_shade: { id:"gloom_shade", name:"Gloom Shade", family:"demon", lvl:7, hp:30, dmg:[7,14], armor:3, def:60, xp:50,
    speed:2.6, atkRate:1.1, range:0.9, sight:12, teleports:{ cd:5, minDist:4 }, sprite:"robed",
    pal:{ robe:"#26222e", trim:"#56506a", skin:"#16141c", eye:"#c080ff" }, sounds:"metal",
    flavor:"is rarely where it was" },
  /* chapel mini-boss: a healer who keeps his flock standing */
  vicar: { id:"vicar", name:"Vicar Thessaly", family:"cultist", lvl:6, hp:170, dmg:[6,12], armor:5, def:35, xp:340,
    speed:2.0, atkRate:0.6, range:8, sight:14, projectile:{ speed:7, kind:"firebolt", elem:"fire" }, keepDist:5,
    summons:{ id:"cult_zealot", count:2, cd:11 }, heals:{ cd:6, amount:18, radius:7 },
    boss:"mini", big:1.25, sprite:"robed",
    pal:{ robe:"#3a2a44", trim:"#caa84c", skin:"#b09078", eye:"#ffd060" }, sounds:"human",
    title:"Voice of the Hollow Choir" },
  /* act finale: the fallen head of the Greymonastery */
  vellath: { id:"vellath", name:"Vellath, the Unshepherd", family:"demon", lvl:10, hp:760, dmg:[12,24], armor:12, def:60, xp:2600,
    speed:2.2, atkRate:0.85, range:1.5, sight:22, boss:"act", big:1.8, sprite:"boss",
    pal:{ bone:"#d8c8a8", trim:"#3a2a44", eye:"#c080ff", armor:"#4a4452" },
    slam:{ cd:8, radius:3.2, mult:1.5 }, summons:{ id:"gloom_shade", count:2, cd:16 },
    volley:{ cd:6, count:5, spread:0.9 }, enrage:0.3,
    sounds:"boss", title:"Who Closed the Gates from Inside" },

  /* ===================================================================
     THE SUNDERSTONE SAGA — Acts II–VI
     =================================================================== */

  /* ---- ACT I: The Fallen North (frozen, lvl 1–8 — the game's opening) ---- */
  frost_risen: { id:"frost_risen", name:"Frostbound Risen", family:"undead", lvl:1, hp:18, dmg:[2,5], armor:2, def:22, xp:15,
    speed:1.8, atkRate:0.8, range:0.9, sight:9, sprite:"skeleton",
    pal:{ bone:"#cfe0e8", trim:"#4a6878", eye:"#9fe0ff" }, sounds:"bone",
    flavor:"a soldier who still hears the call beneath the mountain" },
  frost_watch_captain: { id:"frost_watch_captain", name:"The Rimebound Captain", title:"Keeper of the Closed Gate",
    family:"undead", lvl:2, hp:500, dmg:[2,4], armor:3, def:24, xp:90,
    speed:1.9, atkRate:.55, range:1.3, sight:24, boss:"mini", big:1.65, sprite:"knight", weapon:"sword", shield:true,
    pal:{ armor:"#486271", steel:"#a7c4cc", trim:"#668798", bone:"#d1dee1", eye:"#a4eaff" }, sounds:"bone",
    slam:{ cd:7, radius:2.5, mult:1.2, windup:1.1, recovery:1.25, color:"#a8e5ff", elem:"cold" },
    flavor:"he closed the gate to save them; the shard made him keep it closed" },
  frost_archer: { id:"frost_archer", name:"Rimebone Archer", family:"undead", lvl:2, hp:14, dmg:[3,7], armor:1, def:30, xp:19,
    speed:1.6, atkRate:0.7, range:7, sight:10, projectile:{ speed:9, kind:"arrow" }, keepDist:5, bow:true, sprite:"skeleton",
    pal:{ bone:"#c0d4dc", trim:"#3a5868", eye:"#bfeaff" }, sounds:"bone" },
  ice_lurker: { id:"ice_lurker", name:"Ice Lurker", family:"beast", lvl:2, hp:13, dmg:[2,6], armor:1, def:35, xp:17,
    speed:3.5, atkRate:1.4, range:0.9, sight:11, pack:[3,5], chillOnHit:1.5, sprite:"hound",
    pal:{ fur:"#8aa0b0", trim:"#3a5060", eye:"#a0f0ff" }, sounds:"beast" },
  shard_thrall: { id:"shard_thrall", name:"Shardtouched Thrall", family:"human", lvl:3, hp:20, dmg:[4,9], armor:2, def:26, xp:26,
    speed:1.9, atkRate:0.6, range:8, sight:11, projectile:{ speed:7, kind:"shardbolt", elem:"fire" }, keepDist:6, sprite:"robed",
    pal:{ robe:"#3a2a30", trim:"#c03828", skin:"#9a8478", eye:"#ff4030" }, sounds:"human",
    flavor:"a shard grows where the heart was" },
  barb_guard: { id:"barb_guard", name:"Reanimated Guardian", family:"barbarian", lvl:5, hp:50, dmg:[7,14], armor:8, def:18, xp:44,
    speed:1.6, atkRate:0.55, range:1.2, sight:8, big:1.35, sprite:"brute",
    pal:{ skin:"#9ab0bc", trim:"#5a3a2a", eye:"#9fe0ff" }, sounds:"brute",
    flavor:"sworn to a mountain that no longer stands" },
  korvath: { id:"korvath", name:"Korvath, the Oathbreaker", family:"barbarian", lvl:8, hp:5200, dmg:[10,19], armor:10, def:40, xp:1300,
    speed:2.0, atkRate:0.8, range:1.8, sight:22, boss:"act", big:1.9, sprite:"ironlord", weapon:"none",
    pal:{ bone:"#c8c1ad", steel:"#8a8a90", iron:"#16161c", eye:"#ff8a24", fur:"#070707", armor:"#16161c", trim:"#34343e" },
    slam:{ cd:7, radius:3.0, mult:1.4 }, voice:{ pitch:80, formant:560, rate:6 },
    cutscene:"assets/cine_korvath.mp4",
    aggroLines:["You wear the shape of a demon. They all do.","Mount Karrhal still stands. I still hold the line.","Come, then. I have killed your kind a thousand times."],
    phases:[ { at:0.5, msg:["KORVATH BREAKS HIS OATH","the dead remember rage"], set:{ speedMul:1.3, atkMul:1.3, dmgMul:1.3, tint:"#ff5040", summons:{ id:"barb_guard", count:2, cd:13 } } } ],
    sounds:"boss", title:"He Still Defends the Mountain" },
  /* ---- the beacons that seal Korvath's temple (quest q8b) ---- */
  beacon: { id:"beacon", name:"Oathsworn Beacon", family:"construct", lvl:9, hp:170, dmg:[0,0], armor:8, def:0, xp:140,
    speed:0, atkRate:0, range:0, sight:0, big:1, stationary:true, sprite:"beacon",
    beaconSpawn:{ cd:4.5, pool:["frost_risen","frost_archer","ice_lurker"], count:1, max:4 },
    pal:{ stone:"#3a4448", rune:"#9fe0ff", eye:"#9fe0ff" }, sounds:"metal",
    flavor:"a rune-stone drinking the dead awake" },
  /* ---- the Oathsworn Three: Korvath's undead honor-guard (mini-bosses) ---- */
  barb_axe: { id:"barb_axe", name:"Brokkar, the Hurler", family:"barbarian", lvl:11, hp:180, dmg:[11,19], armor:8, def:48, xp:420,
    speed:2.2, atkRate:0.8, range:9, sight:18, projectile:{ speed:11, kind:"axe" }, keepDist:5,
    volley:{ cd:6, count:3, spread:0.45 }, boss:"mini", big:1.5, sprite:"brute", weapon:"axe",
    pal:{ skin:"#8a948c", armor:"#474b46", trim:"#5a3a2a", eye:"#9fe0ff" }, sounds:"brute",
    voice:{ pitch:84, formant:580, rate:6 }, aggroLines:["Catch."],
    title:"First of the Oathsworn" },
  barb_pole: { id:"barb_pole", name:"Vandil, the Skyfallen", family:"barbarian", lvl:11, hp:200, dmg:[12,21], armor:9, def:48, xp:420,
    speed:2.4, atkRate:0.85, range:1.7, sight:18, leap:{ cd:6, range:8, radius:2.4, mult:1.7 }, boss:"mini", big:1.55, sprite:"brute", weapon:"spear",
    pal:{ skin:"#88908a", armor:"#4c4842", trim:"#3a4a3a", eye:"#9fe0ff" }, sounds:"brute",
    voice:{ pitch:90, formant:610, rate:6 }, aggroLines:["Look up."],
    title:"Second of the Oathsworn" },
  barb_sword: { id:"barb_sword", name:"Sigrun, the Stormcleaver", family:"barbarian", lvl:11, hp:235, dmg:[13,23], armor:10, def:48, xp:460,
    speed:2.1, atkRate:0.8, range:1.8, sight:18, whirl:{ cd:7, dur:2.4, tick:0.3, mult:0.7, radius:2.3 }, boss:"mini", big:1.65, sprite:"brute", weapon:"sword",
    pal:{ skin:"#8a8f88", armor:"#52504a", trim:"#5a3a2a", eye:"#9fe0ff" }, sounds:"brute",
    voice:{ pitch:78, formant:540, rate:5.5 }, aggroLines:["Stand still. It's faster that way."],
    title:"Third of the Oathsworn" },

  /* ---- ACT II: The Weeping Marsh (swamp, lvl 11–14) ---- */
  drowned_dead: { id:"drowned_dead", name:"The Drowned", family:"undead", lvl:11, hp:52, dmg:[9,17], armor:6, def:35, xp:78,
    speed:1.6, atkRate:0.8, range:1.0, sight:9, sprite:"skeleton",
    pal:{ bone:"#8aa088", trim:"#2a4038", eye:"#a0ffd0" }, sounds:"bone",
    flavor:"walked calmly into the swamp, and calmly back out" },
  bog_bloat: { id:"bog_bloat", name:"Bog Bloat", family:"swampdemon", lvl:12, hp:70, dmg:[8,14], armor:5, def:20, xp:96,
    speed:1.3, atkRate:0.5, range:1.1, sight:8, big:1.35, poison:6, sprite:"brute",
    pal:{ skin:"#5a6a42", trim:"#3a4828", eye:"#c0ff60" }, sounds:"brute",
    deathBurst:{ radius:2.6, dmg:30, elem:"poison" }, flavor:"do not be standing near it when it bursts" },
  silent_cultist: { id:"silent_cultist", name:"Silent Choirman", family:"cultist", lvl:12, hp:44, dmg:[8,14], armor:5, def:45, xp:88,
    speed:2.0, atkRate:0.6, range:8, sight:12, projectile:{ speed:8, kind:"shardbolt", elem:"cold" }, keepDist:6, sprite:"robed",
    pal:{ robe:"#26303a", trim:"#7088a0", skin:"#7a8a88", eye:"#a0d8ff" }, sounds:"human", pack:[2,3],
    flavor:"its mouth is sewn, yet you hear it singing" },
  marsh_wretch: { id:"marsh_wretch", name:"Marsh Wretch", family:"beast", lvl:12, hp:34, dmg:[8,15], armor:3, def:55, xp:70,
    speed:4.2, atkRate:1.6, range:0.9, sight:12, pack:[3,6], poison:3, sprite:"spider",
    pal:{ fur:"#3a4a2e", trim:"#6a8040", eye:"#c0ff60" }, sounds:"insect" },
  lure_child: { id:"lure_child", name:"Hollow Child", family:"demon", lvl:13, hp:24, dmg:[10,18], armor:2, def:65, xp:80,
    speed:3.4, atkRate:1.1, range:0.9, sight:13, teleports:{ cd:4, minDist:3 }, summons:{ id:"marsh_wretch", count:2, cd:9 },
    big:0.8, sprite:"robed", pal:{ robe:"#2a2a34", trim:"#506078", skin:"#aab0bc", eye:"#d0e8ff" }, sounds:"human",
    flavor:"it asks you to follow. do not." },
  /* ---- the Choir's ritual sites (quests q10/q11): stationary, beacon-like; vomit the Quieted until torn down ---- */
  quieting_ritual: { id:"quieting_ritual", name:"Quieting Ritual Site", family:"construct", lvl:12, hp:560, dmg:[0,0], armor:8, def:0, xp:560,
    speed:0, atkRate:0, range:0, sight:0, big:1.2, stationary:true, sprite:"beacon",
    beaconSpawn:{ cd:5, pool:["drowned_dead","silent_cultist","bog_bloat"], count:1, max:4 },
    pal:{ stone:"#33403a", rune:"#a0ffd0", eye:"#a0ffd0" }, sounds:"metal",
    flavor:"a circle of sewn-shut mouths, singing the marsh to sleep" },
  drowned_ritual: { id:"drowned_ritual", name:"Drowned Ritual Heart", family:"construct", lvl:13, hp:680, dmg:[0,0], armor:10, def:0, xp:680,
    speed:0, atkRate:0, range:0, sight:0, big:1.25, stationary:true, sprite:"beacon",
    beaconSpawn:{ cd:4.5, pool:["drowned_dead","silent_cultist"], count:1, max:5 },
    pal:{ stone:"#2a3640", rune:"#9fe0ff", eye:"#9fe0ff" }, sounds:"metal",
    flavor:"a knot of the drowned, knitting a door out of the dead" },
  /* ---- High Choirmaster: rises when the drowned ritual is shattered (quest q11) ---- */
  choirmaster: { id:"choirmaster", name:"Vorthel, the High Choirmaster", family:"cultist", lvl:13, hp:1150, dmg:[16,27], armor:12, def:50, xp:3000,
    speed:1.9, atkRate:0.8, range:9, sight:24, projectile:{ speed:9, kind:"soulbolt", elem:"shadow" }, keepDist:7,
    boss:"mini", big:1.7, sprite:"robed",
    pal:{ robe:"#241f2e", trim:"#8a5ad0", skin:"#9a94a8", eye:"#c080ff" },
    summons:{ id:["drowned_dead","silent_cultist"], count:3, cd:8 },
    detonateAllies:{ cd:9, range:11, radius:2.6, mult:1.5 },
    meteorRain:{ cd:12, count:5, radius:2.2, mult:1.4, warn:1.35, spread:5.5, range:20 },
    enrage:0.3, sounds:"human", voice:{ pitch:96, formant:640, rate:5 },
    aggroLines:["You broke the song. Now learn a louder one.","Every voice the marsh kept, I keep now.","Kneel. Be quiet. It is the only mercy left."],
    title:"Voice of the Silent Choir" },
  /* ===== OPTIONAL SIDE-QUEST ENEMIES (Acts I–III) ===== */
  /* Act I — Shardpeak / Deepfreeze */
  shard_sentinel: { id:"shard_sentinel", name:"Shard Sentinel", family:"undead", lvl:3, hp:28, dmg:[4,9], armor:3, def:32, xp:35,
    speed:2.0, atkRate:0.8, range:1.0, sight:10, sprite:"skeleton", pal:{ bone:"#d0dfe8", trim:"#5a7a88", eye:"#7fd8ff" }, sounds:"bone" },
  rimebound_guardian: { id:"rimebound_guardian", name:"Rimebound Guardian", family:"undead", lvl:4, hp:52, dmg:[6,13], armor:6, def:28, xp:65,
    speed:1.8, atkRate:0.65, range:1.3, sight:10, big:1.2, sprite:"brute", pal:{ skin:"#a0bcc8", armor:"#4a6878", trim:"#4a6878", eye:"#a0f0ff" }, sounds:"brute", chillOnHit:1 },
  shatter_wasp: { id:"shatter_wasp", name:"Shatter Wasp", family:"insect", lvl:3, hp:18, dmg:[4,8], armor:1, def:48, xp:32,
    speed:3.6, atkRate:1.3, range:0.9, sight:10, pack:[3,5], sprite:"spider", pal:{ fur:"#6a8aa8", trim:"#3a5a80", eye:"#9fe8ff" }, sounds:"insect" },
  glacial_crawler: { id:"glacial_crawler", name:"Glacial Crawler", family:"beast", lvl:4, hp:60, dmg:[7,14], armor:7, def:25, xp:72,
    speed:2.8, atkRate:0.9, range:1.1, sight:10, big:1.15, sprite:"brute", pal:{ skin:"#8aa8c0", armor:"#4a6080", trim:"#4a6080", eye:"#bfeeff" }, sounds:"brute" },
  hoarfang: { id:"hoarfang", name:"Hoarfang, the Spring's Keeper", family:"beast", lvl:6, hp:460, dmg:[11,19], armor:10, def:34, xp:760,
    speed:1.5, atkRate:0.7, range:1.5, sight:16, big:2.0, sprite:"grizzly", boss:"mini", chillOnHit:1,
    slam:{ cd:6, radius:3.0, mult:1.5 }, summons:{ id:"frost_risen", count:2, cd:11 }, deathBurst:{ radius:3.2, dmg:24, elem:"cold" },
    pal:{ fur:"#bfe0ef", skin:"#bfe0ef", armor:"#3f6378", trim:"#7fc8e8", eye:"#dffaff" }, sounds:"beast",
    aggroLines:["The warmth was a lie. There is only the deep cold now.","Be still. Be ice."],
    title:"the cold that swallowed the spring" },
  /* Act II — Hollow Reeds / Spawn Pools */
  song_thrall: { id:"song_thrall", name:"Song Thrall", family:"cultist", lvl:11, hp:38, dmg:[7,13], armor:4, def:50, xp:82,
    speed:2.2, atkRate:0.6, range:8, sight:11, projectile:{ speed:8, kind:"shardbolt", elem:"cold" }, keepDist:6, sprite:"robed", pal:{ robe:"#2a3a3e", trim:"#5a7a88", skin:"#8a9a9a", eye:"#8ac8ff" }, sounds:"human", pack:[2,3] },
  choir_herald: { id:"choir_herald", name:"Choir Herald", family:"cultist", lvl:12, hp:240, dmg:[10,18], armor:7, def:48, xp:400,
    speed:1.9, atkRate:0.7, range:9, sight:14, projectile:{ speed:9, kind:"soulbolt", elem:"shadow" }, keepDist:6, big:1.35, sprite:"robed", boss:"mini",
    summons:{ id:"song_thrall", count:2, cd:11 }, pal:{ robe:"#1a1a28", trim:"#9080c8", skin:"#9a94a8", eye:"#b89dff" }, sounds:"human", title:"a high singer of the Choir" },
  marsh_larvae: { id:"marsh_larvae", name:"Marsh Larvae", family:"insect", lvl:11, hp:28, dmg:[6,12], armor:3, def:60, xp:68,
    speed:3.6, atkRate:1.5, range:0.9, sight:10, pack:[3,5], poison:3, sprite:"spider", pal:{ fur:"#4a5a3a", trim:"#8aa060", eye:"#d0ff70" }, sounds:"insect" },
  brood_mother: { id:"brood_mother", name:"The Brood Mother", family:"swampdemon", lvl:13, hp:560, dmg:[12,22], armor:8, def:42, xp:1200,
    speed:1.6, atkRate:0.75, range:1.4, sight:16, big:2.0, sprite:"boss", boss:"mini", poison:6,
    summons:{ id:"marsh_larvae", count:3, cd:9 }, slam:{ cd:7, radius:2.8, mult:1.4 },
    pal:{ bone:"#6a7a5a", trim:"#3a4828", eye:"#c0ff60", armor:"#4a5a38" }, sounds:"beast",
    aggroLines:["My children are legion.","You cannot kill what the marsh keeps making."], title:"the Choir's garden" },
  /* Act III — Shard Flats / Tomb of the Chained */
  shard_construct: { id:"shard_construct", name:"Shard Construct", family:"construct", lvl:15, hp:108, dmg:[13,21], armor:16, def:48, xp:140,
    speed:1.6, atkRate:0.65, range:1.2, sight:10, big:1.2, sprite:"golem", pal:{ bone:"#a89a4a", boneDark:"#6a5420", eye:"#ff4030" }, sounds:"metal" },
  crystal_marauder: { id:"crystal_marauder", name:"Crystal Marauder", family:"construct", lvl:16, hp:92, dmg:[15,23], armor:12, def:52, xp:165,
    speed:2.4, atkRate:1.0, range:1.0, sight:11, sprite:"brute", pal:{ skin:"#c0a050", armor:"#7a5a20", trim:"#7a5a20", eye:"#ffd040" }, sounds:"metal" },
  gilded_thrall: { id:"gilded_thrall", name:"Gilded Thrall", family:"undead", lvl:15, hp:78, dmg:[12,19], armor:14, def:42, xp:120,
    speed:1.8, atkRate:0.75, range:1.1, sight:8, sprite:"knight", pal:{ armor:"#d0a850", trim:"#8a6a20", eye:"#ff6030", skin:"#4a3820" }, sounds:"bone" },
  prisoned_shade: { id:"prisoned_shade", name:"Prisoned Shade", family:"demon", lvl:16, hp:64, dmg:[14,24], armor:6, def:58, xp:145,
    speed:2.6, atkRate:1.1, range:8, sight:13, projectile:{ speed:9, kind:"soulbolt", elem:"shadow" }, keepDist:6, teleports:{ cd:5, minDist:4 }, sprite:"robed", pal:{ robe:"#2a1a10", trim:"#c0a050", skin:"#3a2820", eye:"#ffd040" }, sounds:"human" },
  chained_sovereign: { id:"chained_sovereign", name:"The Chained Sovereign", family:"undead", lvl:17, hp:1150, dmg:[18,30], armor:16, def:54, xp:3000,
    speed:1.7, atkRate:0.8, range:1.5, sight:22, big:2.0, sprite:"boss", boss:"mini",
    summons:{ id:["soul_chained","gilded_thrall"], count:2, cd:10 }, slam:{ cd:6, radius:3.0, mult:1.5 }, enrage:0.3,
    pal:{ bone:"#e8d880", trim:"#8a6a20", eye:"#ff9040", armor:"#c0a850" }, sounds:"bone",
    aggroLines:["I remember being worshipped.","This tomb was meant to hold a god."], title:"who remembers being a god" },

  mire_mother: { id:"mire_mother", name:"The Mire Mother", family:"swampdemon", lvl:14, hp:7000, dmg:[18,30], armor:14, def:40, xp:5200,
    speed:1.3, atkRate:0.7, range:1.8, sight:24, boss:"act", big:2.4, sprite:"boss",
    pal:{ bone:"#6a7a52", trim:"#2a3820", eye:"#c0ff60", armor:"#3a4a30" },
    slam:{ cd:6, radius:3.6, mult:1.4 }, summons:{ id:["drowned_dead","bog_bloat"], count:3, cd:12 }, poison:8,
    voice:{ pitch:70, formant:480, rate:4.5 },
    aggroLines:["All my children came home to me.","You are loud. The swamp will quiet you.","I am made of everyone the marsh has kept."],
    phases:[ { at:0.55, msg:["THE MIRE MOTHER SPLITS","the shard in her breast blazes"], set:{ atkMul:1.25, dmgMul:1.2, tint:"#ff5040", summons:{ id:["drowned_dead","bog_bloat","marsh_wretch"], count:4, cd:10 } } },
             { at:0.25, msg:["SHE WILL NOT LET GO","the marsh rises with her"], set:{ speedMul:1.3, atkMul:1.3, slam:{ cd:4, radius:4, mult:1.6 } } } ],
    deathBurst:{ radius:3.5, dmg:60, elem:"poison" },
    sounds:"boss", title:"She Holds a Shard Behind Her Ribs" },

  /* ---- ACT III: The City Beneath the Sand (desert, lvl 14–17) ---- */
  tomb_guard: { id:"tomb_guard", name:"Tomb Sentinel", family:"undead", lvl:14, hp:64, dmg:[11,20], armor:10, def:40, xp:108,
    speed:1.7, atkRate:0.7, range:1.1, sight:9, shield:true, block:25, sprite:"knight",
    pal:{ armor:"#8a7440", trim:"#caa84c", eye:"#ffd060", skin:"#3a2e1a" }, sounds:"metal",
    flavor:"guards a king who should have stayed buried" },
  sand_raider: { id:"sand_raider", name:"Dune Raider", family:"desert", lvl:14, hp:42, dmg:[10,18], armor:5, def:55, xp:92,
    speed:3.6, atkRate:1.4, range:0.9, sight:11, pack:[3,5], sprite:"robed",
    pal:{ robe:"#9a7c4a", trim:"#5a3a22", skin:"#a8825a", eye:"#ffce70" }, sounds:"human" },
  soul_chained: { id:"soul_chained", name:"Chained Soul", family:"undead", lvl:15, hp:46, dmg:[10,16], armor:4, def:50, xp:104,
    speed:1.9, atkRate:0.6, range:9, sight:13, projectile:{ speed:8, kind:"shardbolt", elem:"light" }, keepDist:6, sprite:"robed",
    pal:{ robe:"#3a2e1a", trim:"#caa84c", skin:"#d8c89a", eye:"#fff080" }, sounds:"human",
    flavor:"a soul welded into the city's machinery" },
  gilt_construct: { id:"gilt_construct", name:"Gilded Construct", family:"construct", lvl:16, hp:130, dmg:[14,24], armor:18, def:25, xp:150,
    speed:1.4, atkRate:0.5, range:1.3, sight:9, big:1.45, resAll:25, sprite:"brute",
    pal:{ skin:"#b89a4a", trim:"#6a5420", eye:"#ff4030" }, sounds:"metal",
    flavor:"Sunderstone light hums in its joints" },
  dune_shade: { id:"dune_shade", name:"Dune Shade", family:"demon", lvl:16, hp:48, dmg:[12,22], armor:4, def:65, xp:130,
    speed:2.8, atkRate:1.1, range:0.9, sight:13, teleports:{ cd:4, minDist:4 }, sprite:"robed",
    pal:{ robe:"#2e2820", trim:"#8a7040", skin:"#1a160e", eye:"#ffce70" }, sounds:"metal" },
  azram: { id:"azram", name:"Azram the Gilded", family:"undead", lvl:17, hp:7500, dmg:[20,34], armor:18, def:55, xp:7600,
    speed:1.9, atkRate:0.8, range:1.6, sight:26, boss:"act", big:2.0, sprite:"boss",
    pal:{ bone:"#e0c870", trim:"#8a6a20", eye:"#ff4030", armor:"#b89a4a" },
    slam:{ cd:7, radius:3.2, mult:1.4 }, summons:{ id:["sand_raider","tomb_guard"], count:3, cd:12 },
    voice:{ pitch:100, formant:680, rate:6 },
    aggroLines:["You walk in MY city. Uninvited.","I spoke to the Hells and they gilded my bones.","Every soul I chained still screams. Add yours."],
    phases:[ { at:0.6, msg:["AZRAM TEARS OPEN THE PAST","portals to older battlefields gape"], set:{ atkMul:1.2, dmgMul:1.2, tint:"#ffce70", summons:{ id:["frost_risen","drowned_dead","sand_raider"], count:4, cd:9 } } },
             { at:0.3, msg:["THE GILDED KING WILL NOT FALL","gold runs molten"], set:{ speedMul:1.25, atkMul:1.3, slam:{ cd:5, radius:3.6, mult:1.6 } } } ],
    sounds:"boss", title:"The Undying King of Khal-Zahir" },

  /* ---- ACT IV: The Shattered Cathedral (gothic, lvl 17–20) ---- */
  hollow_knight: { id:"hollow_knight", name:"Hollow Knight", family:"knight", lvl:17, hp:90, dmg:[15,26], armor:14, def:55, xp:150,
    speed:2.2, atkRate:1.0, range:1.1, sight:10, shield:true, block:30, sprite:"knight",
    pal:{ armor:"#4a4658", trim:"#7060a0", eye:"#c080ff", skin:"#1a1820" }, sounds:"metal" },
  choir_priest: { id:"choir_priest", name:"Choir Priest", family:"cultist", lvl:18, hp:70, dmg:[12,20], armor:6, def:50, xp:170,
    speed:1.9, atkRate:0.6, range:9, sight:13, projectile:{ speed:8, kind:"shardbolt", elem:"fire" }, keepDist:6,
    heals:{ cd:7, amount:30, radius:8 }, sprite:"robed",
    pal:{ robe:"#2a2436", trim:"#a060d0", skin:"#9a8aa0", eye:"#d0a0ff" }, sounds:"human",
    flavor:"a Silent Choirman who found his terrible voice" },
  soul_eater: { id:"soul_eater", name:"Soul Eater", family:"demon", lvl:18, hp:56, dmg:[14,24], armor:5, def:70, xp:160,
    speed:3.6, atkRate:1.5, range:0.9, sight:13, pack:[2,4], lifeOnHit:true, sprite:"hound",
    pal:{ fur:"#3a2e44", trim:"#6040a0", eye:"#d080ff" }, sounds:"beast" },
  memory_wraith: { id:"memory_wraith", name:"Memory Wraith", family:"demon", lvl:19, hp:62, dmg:[15,25], armor:4, def:75, xp:175,
    speed:2.6, atkRate:1.0, range:0.9, sight:14, teleports:{ cd:4, minDist:4 }, sprite:"robed",
    pal:{ robe:"#26222e", trim:"#7868a0", skin:"#16141c", eye:"#d0c0ff" }, sounds:"metal",
    flavor:"wears a face you almost recognize" },
  empty_archangel: { id:"empty_archangel", name:"The Empty Archangel", family:"demon", lvl:18, hp:8500, dmg:[18,30], armor:14, def:60, xp:5400,
    speed:2.4, atkRate:0.9, range:1.6, sight:24, boss:"mini", big:2.0, sprite:"boss",
    pal:{ bone:"#e8e4d0", trim:"#9088b0", eye:"#c080ff", armor:"#c8c4b8" },
    volley:{ cd:5, count:5, spread:0.8 }, slam:{ cd:8, radius:3, mult:1.4 },
    voice:{ pitch:150, formant:1000, rate:7 },
    aggroLines:["I remember being trusted.","This armor is all that is left of her.","I have her voice. I do not have her mercy."],
    phases:[ { at:0.5, msg:["THE FALSE ANGEL UNFOLDS","Sunderstone light pours from the seams"], set:{ atkMul:1.3, dmgMul:1.2, tint:"#c080ff", volley:{ cd:3.5, count:7, spread:1.1 } } } ],
    sounds:"boss", title:"The Warden's Voice, and Nothing Else" },
  malthoron: { id:"malthoron", name:"Malthoron, the Hollow King", family:"demon", lvl:20, hp:11500, dmg:[24,40], armor:20, def:60, xp:11000,
    speed:2.0, atkRate:0.85, range:1.7, sight:26, boss:"act", big:2.1, sprite:"boss",
    pal:{ bone:"#3a3440", trim:"#8a7440", eye:"#c080ff", armor:"#5a5260" },
    slam:{ cd:7, radius:3.4, mult:1.5 }, voice:{ pitch:88, formant:600, rate:5.5 },
    aggroLines:["Free will is the wound. I am the cure.","I gave my soul once. I will not miss yours.","The Quieting comes for all. Be still."],
    phases:[ { at:0.66, msg:["MALTHORON SHEDS HIS PLATE","beneath the armor — nothing"], set:{ speedMul:1.2, atkMul:1.2, tint:"#7050a0", pal:{ armor:"#2a2230" }, summons:{ id:["hollow_knight"], count:2, cd:13 } } },
             { at:0.33, msg:["THE HOLLOW KING UNMADE","only swirling dark and screaming souls"], set:{ speedMul:1.3, atkMul:1.35, dmgMul:1.25, scale:1.1, weapon:"none", sprite:"wraith", pal:{ bone:"#1a1620", armor:"#1a1620" }, slam:{ cd:5, radius:4, mult:1.7 }, volley:{ cd:5, count:6, spread:1.0 } } } ],
    sounds:"boss", title:"A Warlord Who Surrendered His Soul" },

  /* ---- ACT V: The Throne of Cinders (hell, lvl 20–25) ---- */
  ash_fiend: { id:"ash_fiend", faction:"ash_legion", name:"Ash Fiend", family:"hellspawn", lvl:21, hp:84, dmg:[18,30], armor:10, def:50, xp:200,
    speed:2.4, atkRate:1.0, range:1.0, sight:10, sprite:"brute",
    pal:{ skin:"#5a2a22", trim:"#8a3020", eye:"#ff6030" }, sounds:"brute" },
  cinder_hound: { id:"cinder_hound", faction:"cinder_brood", name:"Cinder Hound", family:"hellspawn", lvl:21, hp:54, dmg:[16,26], armor:6, def:65, xp:180,
    speed:4.4, atkRate:1.6, range:0.9, sight:13, pack:[3,5], sprite:"hound",
    pal:{ fur:"#4a221c", trim:"#a03820", eye:"#ff8030" }, sounds:"beast" },
  impaler: { id:"impaler", faction:"ash_legion", name:"Cinder Impaler", family:"hellspawn", lvl:22, hp:66, dmg:[18,28], armor:7, def:55, xp:200,
    speed:1.9, atkRate:0.6, range:10, sight:14, projectile:{ speed:11, kind:"shardbolt", elem:"fire" }, keepDist:7, sprite:"robed",
    pal:{ robe:"#3a1a16", trim:"#c04020", skin:"#6a2a20", eye:"#ff6030" }, sounds:"metal" },
  pit_brute: { id:"pit_brute", faction:"cinder_brood", name:"Pit Brute", family:"hellspawn", lvl:23, hp:200, dmg:[24,38], armor:20, def:30, xp:300,
    speed:1.5, atkRate:0.5, range:1.4, sight:9, big:1.7, sprite:"brute",
    pal:{ skin:"#6a2820", trim:"#3a1410", eye:"#ff5020" }, sounds:"brute",
    slam:{ cd:9, radius:2.8, mult:1.3 } },
  wretch_lord: { id:"wretch_lord", faction:"cinder_brood", name:"Wretch Lord", family:"hellspawn", lvl:23, hp:120, dmg:[16,26], armor:10, def:55, xp:300,
    speed:1.9, atkRate:0.6, range:9, sight:14, projectile:{ speed:9, kind:"shardbolt", elem:"fire" }, keepDist:6,
    summons:{ id:["ash_fiend","cinder_hound"], count:2, cd:11 }, big:1.3, sprite:"robed",
    pal:{ robe:"#3a1812", trim:"#c06020", skin:"#5a2418", eye:"#ffa030" }, sounds:"human" },
  /* the mastermind — three phases */
  vethriss: { id:"vethriss", name:"Vethriss, the Veiled Lord", family:"hellspawn", lvl:25, hp:16000, dmg:[28,46], armor:22, def:70, xp:20000,
    speed:2.2, atkRate:0.9, range:1.6, sight:30, boss:"act", big:2.0, sprite:"boss",
    pal:{ bone:"#e8e4d0", trim:"#9088b0", eye:"#80e0ff", armor:"#c8c4b8" },
    voice:{ pitch:120, formant:820, rate:6 },
    aggroLines:["Wait — it is me. Seraneth. I am wounded. Surrender the shards; let me carry their burden.","...you were always going to be difficult.","Malthoron was never meant to win. He gathered. The Choir carried. You delivered.","A core that obeys me. Kings who whisper my words. Why invade a world that will rule itself for me?"],
    /* phase 1: false Seraneth (low aggression). 2: serpent + illusions. 3: shadow copying act bosses */
    phases:[ { at:0.7, msg:["THE LIE FALLS AWAY","Vethriss coils into something serpentine"], set:{ speedMul:1.6, atkMul:1.5, tint:"#80ffd0", scale:1.05, weapon:"none", sprite:"serpent", name:"Vethriss, the Veiled Lord", pal:{ bone:"#2a6a5a", armor:"#1e4a40" }, summons:{ id:["dune_shade","memory_wraith"], count:3, cd:9 } } },
             { at:0.35, msg:["THE VEILED LORD UNVEILED","it wears the shape of everything you killed"], set:{ speedMul:1.2, atkMul:1.3, dmgMul:1.3, scale:1.65, tint:"#c080ff", sprite:"wraith", copyBosses:true, pal:{ bone:"#1a1620", armor:"#1a1620" }, slam:{ cd:5, radius:4, mult:1.7 }, volley:{ cd:5, count:7, spread:1.1 }, summons:{ id:["malthoron_echo","korvath_echo","azram_echo"], count:2, cd:16 } } } ],
    sounds:"boss", title:"Lord of Lies, Who Used Them All" },
  /* a weakened echo summoned in Vethriss's final phase */
  malthoron_echo: { id:"malthoron_echo", name:"Echo of the Hollow King", family:"demon", lvl:22, hp:300, dmg:[18,30], armor:12, def:55, xp:0,
    speed:2.1, atkRate:0.85, range:1.5, sight:18, big:1.4, sprite:"boss",
    pal:{ bone:"#2a2230", trim:"#7050a0", eye:"#c080ff", armor:"#3a3240" }, sounds:"boss",
    flavor:"a memory of a king who is already dead" },
  korvath_echo: { id:"korvath_echo", name:"Echo of the Oathbreaker", family:"undead", lvl:22, hp:300, dmg:[18,30], armor:14, def:55, xp:0,
    speed:2.3, atkRate:0.9, range:1.6, sight:18, big:1.4, sprite:"boss",
    pal:{ bone:"#241c18", trim:"#7a4a20", eye:"#ff8a24", armor:"#2e241c" }, sounds:"boss",
    flavor:"a memory of the oath he broke" },
  azram_echo: { id:"azram_echo", name:"Echo of the Gilded King", family:"demon", lvl:22, hp:300, dmg:[18,30], armor:12, def:55, xp:0,
    speed:2.0, atkRate:0.85, range:1.6, sight:18, big:1.4, sprite:"boss",
    pal:{ bone:"#2a2418", trim:"#d8b040", eye:"#ffd070", armor:"#3a3018" }, sounds:"boss",
    flavor:"a memory of gold and chained souls" },
};

/* =====================  ENEMY TYPES  =====================
   Every enemy resolves to one of four broad types (shown on its HP bar and
   used by "+damage vs undead" etc.). Derived from each enemy's `family`. */
DATA.ENEMY_TYPES = {
  humanoid: { name: "Humanoid", color: "#d8c8a0" },
  undead:   { name: "Undead",   color: "#a6e6c4" },
  beast:    { name: "Beast",    color: "#e6b482" },
  demon:    { name: "Demon",    color: "#d894e4" },
};
DATA.FAMILY_TYPE = {
  undead: "undead", barbarian: "undead", knight: "undead",   // bone, reanimated, fallen
  beast: "beast", insect: "beast",
  cultist: "humanoid", human: "humanoid", desert: "humanoid",
  demon: "demon", swampdemon: "demon", hellspawn: "demon", construct: "demon",
  dragon: "beast", serpent: "beast", gargoyle: "demon", axedemon: "demon", abomination: "demon",
};
DATA.enemyType = def => def.type || DATA.FAMILY_TYPE[def.family] || "humanoid";

/* per-element resistances every monster carries, keyed by enemy type (negative = vulnerable).
   A monster def may override any element with def.resFire/resCold/resLight/resPoison; def.resAll
   adds to all four. These make elemental damage choice matter (fire melts undead, cold melts demons…). */
DATA.RES_BY_TYPE = {
  humanoid: { fire: 0,   cold: 0,   light: 0,  poison: 0 },
  undead:   { fire: -25, cold: 50,  light: 0,  poison: 80 },
  beast:    { fire: 0,   cold: 0,   light: 0,  poison: 15 },
  demon:    { fire: 55,  cold: -20, light: 10, poison: 30 },
  default:  { fire: 0,   cold: 0,   light: 0,  poison: 0 },
};

/* (the 100-enemy roster is built at the END of this file, after DATA.ZONES exists) */
DATA._buildRoster = (function () { return function buildRoster() {
  function hsl(h, s, l) {
    h /= 360; const a = s * Math.min(l, 1 - l);
    const f = n => { const k = (n + h * 12) % 12; const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); return Math.round(255 * c); };
    return "#" + [f(0), f(8), f(4)].map(v => v.toString(16).padStart(2, "0")).join("");
  }
  /* shape kinds + which family/sounds/weapon they read as */
  const KINDS = [
    { k: "skeleton", fam: "undead",   snd: "bone",   wpn: "sword" },
    { k: "robed",    fam: "cultist",  snd: "human",  wpn: "wand" },
    { k: "hound",    fam: "beast",    snd: "beast" },
    { k: "spider",   fam: "insect",   snd: "insect" },
    { k: "brute",    fam: "demon",    snd: "brute" },
    { k: "knight",   fam: "knight",   snd: "metal",  wpn: "sword" },
    { k: "warlord",  fam: "undead",   snd: "boss",   wpn: "axe" },
    { k: "human",    fam: "human",    snd: "human",  wpn: "mace" },
    { k: "wraith",   fam: "undead",   snd: "bone" },
    { k: "ooze",     fam: "beast",    snd: "beast" },
    { k: "imp",      fam: "demon",    snd: "brute" },
    { k: "treant",   fam: "beast",    snd: "brute" },
  ];
  /* palette builders per shape, tinted by a unique hue */
  function pal(kind, hue) {
    const eye = hsl((hue + 180) % 360, 0.9, 0.6);
    switch (kind) {
      case "skeleton": case "warlord": return { bone: hsl(hue, 0.18, 0.78), trim: hsl(hue, 0.4, 0.3), armor: hsl(hue, 0.25, 0.28), eye, fur: hsl(hue, 0.2, 0.08) };
      case "robed": return { robe: hsl(hue, 0.45, 0.3), trim: hsl((hue + 40) % 360, 0.6, 0.55), skin: hsl(hue, 0.3, 0.6), eye };
      case "hound": case "spider": return { fur: hsl(hue, 0.4, 0.4), trim: hsl(hue, 0.55, 0.55), eye };
      case "brute": return { skin: hsl(hue, 0.45, 0.42), trim: hsl(hue, 0.5, 0.25), eye };
      case "knight": return { armor: hsl(hue, 0.3, 0.45), trim: hsl((hue + 30) % 360, 0.6, 0.5), skin: hsl(hue, 0.2, 0.15), eye };
      case "wraith": return { cloak: hsl(hue, 0.25, 0.24), wisp: hsl((hue + 20) % 360, 0.5, 0.62), eye };
      case "ooze": return { goo: hsl(hue, 0.5, 0.42), glow: hsl(hue, 0.7, 0.62), eye: hsl(hue, 0.6, 0.12) };
      case "imp": return { skin: hsl(hue, 0.55, 0.45), wing: hsl(hue, 0.45, 0.28), horn: hsl(hue, 0.3, 0.16), eye };
      case "treant": return { bark: hsl(hue, 0.3, 0.3), wood: hsl(hue, 0.28, 0.44), leaf: hsl((100 + hue * 0.15) % 360, 0.4, 0.4), eye: hsl(90, 0.6, 0.65) };
      default: return { skin: hsl(hue, 0.4, 0.62), trim: hsl((hue + 25) % 360, 0.5, 0.4), cloth: hsl(hue, 0.4, 0.3), hair: hsl(hue, 0.3, 0.2), eye };
    }
  }
  /* ability bundles — index rotated so all 100 vary; each is "special" */
  const ABIL = [
    (d, L) => { d.projectile = { speed: 8 + L * 0.05, kind: "shardbolt", elem: "fire" }; d.keepDist = 5; d.range = 8; d.atkRate = 0.6; },
    (d, L) => { d.projectile = { speed: 9, kind: "shardbolt", elem: "cold" }; d.keepDist = 6; d.range = 9; d.atkRate = 0.6; d.chillOnHit = 2; },
    (d, L) => { d.projectile = { speed: 11, kind: "shardbolt", elem: "light" }; d.keepDist = 5; d.range = 10; d.atkRate = 0.7; },
    (d, L) => { d.leap = { cd: 6, range: 8, radius: 2.4, mult: 1.6 }; },
    (d, L) => { d.whirl = { cd: 7, dur: 2.2, tick: 0.3, mult: 0.7, radius: 2.2 }; },
    (d, L) => { d.charge = { cd: 6, range: 9, speed: 10, mult: 1.7 }; d.speed += 0.4; },
    (d, L) => { d.volley = { cd: 6, count: 3, spread: 0.5 }; d.projectile = { speed: 9, kind: "shardbolt", elem: "fire" }; d.keepDist = 5; d.range = 9; },
    (d, L) => { d.summons = { id: "risen", count: 2, cd: 11 }; },
    (d, L) => { d.teleports = { cd: 5, minDist: 4 }; },
    (d, L) => { d.heals = { cd: 7, amount: 12 + L, radius: 7 }; d.keepDist = 5; d.range = 8; d.projectile = { speed: 8, kind: "shardbolt", elem: "fire" }; },
    (d, L) => { d.deathBurst = { radius: 2.6, dmg: 16 + L * 1.4, elem: "poison" }; d.poison = 4 + Math.floor(L / 4); },
    (d, L) => { d.slam = { cd: 7, radius: 2.8, mult: 1.4 }; },
    (d, L) => { d.splitOnDeath = { count: 2 }; },
    (d, L) => { d.regen = 0.03; d.lifeOnHit = true; },
    (d, L) => { d.thorns = 4 + Math.floor(L / 3); d.armor += 6; },
    (d, L) => { d.elemDmg = { light: 5 + L }; d.speed += 0.5; d.atkRate += 0.3; },
    (d, L) => { d.shield = true; d.block = 25; d.armor += 8; },
    (d, L) => { d.poison = 6 + Math.floor(L / 3); d.pack = [2, 4]; d.speed += 0.6; },
  ];
  const ABIL_NAME = ["Caster", "Frostcaster", "Stormcaster", "Pouncer", "Whirler", "Charger", "Volleyer", "Caller", "Blinker", "Mender", "Bloater", "Smasher", "Splitter", "Leech", "Thornback", "Galvanic", "Warden", "Brood"];
  /* nouns that FIT each sprite model (so names match the body the player sees) */
  const NOUNS = {
    skeleton: ["Revenant", "Husk", "Bonecaller", "Marrowknight", "Ossuary", "Rattler", "Deadwalker", "Boneguard"],
    robed:    ["Acolyte", "Zealot", "Cultist", "Adept", "Choirman", "Initiate", "Hierophant", "Whisperer"],
    hound:    ["Hound", "Stalker", "Gnasher", "Prowler", "Ripper", "Mauler", "Snapper", "Houndbeast"],
    spider:   ["Crawler", "Broodling", "Spinner", "Skitterer", "Weaver", "Lurker", "Biter", "Widow"],
    brute:    ["Fiend", "Devil", "Horror", "Brute", "Render", "Mauler", "Tormentor", "Maw"],
    knight:   ["Sentinel", "Knight", "Warden", "Vanguard", "Templar", "Defiler", "Marshal", "Reaver"],
    warlord:  ["Warlord", "Champion", "Deathlord", "Conqueror", "Slaughterer", "Tyrant", "Overlord", "Dreadguard"],
    human:    ["Marauder", "Cutthroat", "Reaver", "Brigand", "Raider", "Outlaw", "Slaver", "Renegade"],
    wraith:   ["Wraith", "Shade", "Phantom", "Spectre", "Apparition", "Haunt", "Banshee", "Mourner"],
    ooze:     ["Ooze", "Slime", "Gel", "Sludge", "Glob", "Mass", "Pudding", "Quagmire"],
    imp:      ["Imp", "Gremlin", "Fiendling", "Spite", "Needler", "Scamp", "Stinger", "Pyreling"],
    treant:   ["Treant", "Thornback", "Bramble", "Oldwood", "Greenmaw", "Barkfiend", "Rootmaw", "Witherwood"],
  };
  /* adjective biased by the enemy's elemental ability, so casters read on-theme */
  const ELEM_ADJ = {
    fire:   ["Ashen", "Cinder", "Ember", "Smouldering", "Charred"],
    cold:   ["Frost", "Pale", "Frozen", "Hoarfrost", "Rime"],
    light:  ["Storm", "Gilded", "Galvanic", "Arcing", "Radiant"],
    poison: ["Venom", "Rotting", "Vile", "Putrid", "Blighted"],
    phys:   ["Gloom", "Hollow", "Dread", "Grave", "Wretched", "Bone", "Howling", "Sunken"],
  };
  /* element each ABIL bundle reads as (parallel to ABIL, index by i % ABIL.length) */
  const ABIL_ELEM = ["fire", "cold", "light", "phys", "phys", "phys", "fire", "phys", "phys", "light", "poison", "phys", "phys", "phys", "phys", "light", "phys", "poison"];
  /* ---- COMPLEXITY RAMP: basic enemies early, complex enemies late ----
     each enemy's tier 0..3 comes from its progress (i/99); its sprite KIND and
     ABILITY are drawn from that tier's pool, so the opening hours are simple
     fodder (plain melee, hounds, spiders) and the late game is casters,
     summoners, and elite bodies (warlords, treants, wraiths). */
  const KIND_MAP = {}; for (const k of KINDS) KIND_MAP[k.k] = k;
  const KIND_BY_TIER = [
    ["hound", "spider", "human", "skeleton", "ooze"],     // tier0 — fodder
    ["skeleton", "ooze", "robed", "brute", "imp"],        // tier1
    ["robed", "brute", "knight", "imp", "wraith"],        // tier2
    ["knight", "warlord", "treant", "wraith", "brute"],   // tier3 — elite-feel
  ];
  const ABIL_BY_TIER = [
    [-1, 3, 5, 11, 14, 17],                  // tier0 — plain melee + leap/charge/slam/thorns/poison-pack
    [3, 5, 11, 17, 0, 1, 2, 12, 13],         // tier1 — + basic bolts / split / regen
    [0, 1, 2, 4, 10, 15, 16, 6, 8],          // tier2 — casters / whirl / death-burst / shield + volley / blink
    [4, 10, 16, 6, 8, 7, 9],                 // tier3 — + summoners & healers (the most complex)
  ];
  const PLAIN_TITLE = ["Feral", "Lesser", "Ragged", "Wild"];
  const used = new Set();
  const roster = [];
  for (let i = 0; i < 100; i++) {
    const tier = Math.max(0, Math.min(3, Math.floor((i / 99) * 4)));   // 0..3 complexity tier by progress
    const kindPool = KIND_BY_TIER[tier], abilPool = ABIL_BY_TIER[tier];
    const K = KIND_MAP[kindPool[(i * 2 + tier) % kindPool.length]];     // sprite kind drawn from this tier (stride 2 coprime w/ pool size 5)
    const fam = K.fam;
    const abilIdx = abilPool[(i * 5 + tier) % abilPool.length];         // ability from this tier (stride 5 coprime w/ 6/9/7); -1 = plain melee
    const L = 1 + Math.round((i / 99) * 33) + (i % 3);     // levels spread ~1..36
    const hue = (i * 137.508) % 360;
    const scale = +(0.70 + i * 0.02).toFixed(2);           // unique size per enemy (0.70..2.68)
    const adjPool = ELEM_ADJ[(abilIdx >= 0 ? ABIL_ELEM[abilIdx] : "phys")] || ELEM_ADJ.phys;
    const nounPool = NOUNS[K.k] || NOUNS.human;
    let name; let g = 0;
    do { name = `${adjPool[(i + g) % adjPool.length]} ${nounPool[(i * 3 + g) % nounPool.length]}`; g++; } while (used.has(name) && g < 400);
    used.add(name);
    const id = `r${i}_${K.k}`;
    const d = {
      id, name, family: fam, lvl: L,
      hp: Math.round(10 + L * (7 + scale * 5)), dmg: [Math.round(2 + L * 0.9), Math.round(5 + L * 1.8)],
      armor: Math.round(2 + L * 0.6), def: 20 + L * 3, xp: Math.round(12 + L * 9 * scale),
      speed: +(1.6 + Math.random() * 1.8).toFixed(2), atkRate: +(0.6 + Math.random() * 0.7).toFixed(2),
      range: 0.9, sight: 9 + (i % 5), big: scale, sprite: K.k, pal: pal(K.k, hue), sounds: K.snd,
    };
    if (K.wpn) d.weapon = K.wpn;
    if (abilIdx >= 0) { ABIL[abilIdx](d, L); d.title = ABIL_NAME[abilIdx]; }
    else d.title = PLAIN_TITLE[i % PLAIN_TITLE.length];     // plain melee fodder
    DATA.ENEMIES[id] = d;
    roster.push(d);
  }
  /* drop them into level-appropriate zone spawn pools */
  for (const z of Object.values(DATA.ZONES)) {
    if (!z.spawns || z.kind === "town" || z.kind === "camp") continue;
    for (const d of roster) if (Math.abs((z.lvl || 1) - d.lvl) <= 4) z.spawns.push(d.id);
  }
  /* sprinkle the hand-authored signature beasts (dragons / serpents / gargoyles / axe-demons) by level */
  const SIG = ["frost_wyrm", "cave_python", "ash_drake", "bone_dragon", "marsh_serpent", "dune_serpent", "stone_gargoyle", "chapel_grotesque", "void_gargoyle", "brimstone_brute", "ashfiend_reaver", "infernal_warlord", "flesh_engine", "grave_wraith", "frost_wraith", "void_wraith", "caustic_ooze", "sludge_horror", "cinder_imp", "hex_imp", "gnarl_treant", "blight_treant"];
  for (const z of Object.values(DATA.ZONES)) {
    if (!z.spawns || z.kind === "town" || z.kind === "camp") continue;
    for (const id of SIG) { const e = DATA.ENEMIES[id]; if (e && Math.abs((z.lvl || 1) - e.lvl) <= 4) z.spawns.push(id); }
  }
  DATA.ROSTER_IDS = roster.map(d => d.id);
}; })();

/* elite pack modifiers */
DATA.ELITE_MODS = [
  { id:"swift", name:"Swift", apply:m => { m.speed *= 1.5; m.atkRate *= 1.25; }, tint:"#d0d0ff" },
  { id:"brutal", name:"Brutal", apply:m => { m.dmgMult = (m.dmgMult||1) * 1.6; }, tint:"#ff9090" },
  { id:"flamewreathed", name:"Flamewreathed", apply:m => { m.elemDmg = { fire: 4 + m.lvl }; }, tint:"#ff8040" },
  { id:"frostbound", name:"Frostbound", apply:m => { m.elemDmg = { cold: 3 + m.lvl }; m.chillOnHit = 2; }, tint:"#80c0ff" },
  { id:"stormtouched", name:"Stormtouched", apply:m => { m.elemDmg = { light: 6 + m.lvl }; }, tint:"#ffff90" },
  { id:"venomous", name:"Venomous", apply:m => { m.poison = (m.poison||0) + 4 + m.lvl; }, tint:"#90ff70" },
  { id:"warded", name:"Warded", apply:m => { m.armor = m.armor * 2 + 6; m.resAll = 40; }, tint:"#c0a0ff" },
  { id:"vampiric", name:"Vampiric", apply:m => { m.regen = 0.04; }, tint:"#ff70b0" },
];

/* Loot tier weighting per source. Set/unique base chances reduced by 30%;
   the released weight goes to rare gear, keeping each source at 100. */
DATA.RARITY_WEIGHTS = { normal:[["common",61],["enhanced",26],["rare",10.9],["set",0.7],["unique",1.4]],
  elite:[["common",27],["enhanced",39],["rare",27],["set",2.8],["unique",4.2]],
  boss:[["common",8],["enhanced",32],["rare",44.6],["set",5.6],["unique",9.8]] };

/* =====================  SET ITEMS  =====================
   Wear several pieces of a set for stacking bonuses. */
DATA.SETS = {
  ashwatch: {
    id: "ashwatch", name: "Vigil of the Ashen Watch",
    bonuses: {
      2: { arPct: 20, hp: 15 },
      3: { dmgPct: 25, resAll: 10, thorns: 5 },
    },
    flavor: "Issued to the wall-guard of Cinderwatch, back when there was a wall worth guarding.",
  },
  firstwitch: {
    id: "firstwitch", name: "Regalia of the First Witch",
    bonuses: {
      2: { spellPct: 10, mana: 20 },
      3: { skillAll: 1, spellPct: 15, manaRegen: 25 },
    },
    flavor: "She walked into the Marches with nothing else, and walked out of history.",
  },
};
DATA.SET_ITEMS = [
  { id: "s_aw_helm",  set: "ashwatch", base: "warhelm",   name: "Watchman's Casque", ilvl: 5, stats: { armor: 8, hp: 20, ccReduce: 15 } },
  { id: "s_aw_wall",  set: "ashwatch", base: "kiteshield",name: "Watchman's Wall",   ilvl: 5, stats: { block: 10, armor: 8, resFire: 15 } },
  { id: "s_aw_tread", set: "ashwatch", base: "warboots",  name: "Watchman's Tread",  ilvl: 4, stats: { frw: 15, vit: 5 } },
  { id: "s_fw_hood",  set: "firstwitch", base: "cap",       name: "First Witch's Hood",   ilvl: 4, stats: { mana: 18, fcr: 10 } },
  { id: "s_fw_shroud",set: "firstwitch", base: "quiltvest", name: "First Witch's Shroud", ilvl: 5, stats: { armorPct: 35, mana: 15, resCold: 15 } },
  { id: "s_fw_band",  set: "firstwitch", base: "ring",      name: "First Witch's Band",   ilvl: 4, stats: { wil: 6, manaRegen: 15 } },
];

/* =====================  UNIQUE & SET LADDER (lv5–95)  =====================
   Curated-feeling uniques and sets across the whole range so high-level unique
   drops are level-appropriate, not just the early act-I relics. */
(function expandUniques() {
  const rd = n => Math.round(n);
  /* a tier index helper: nearest weapon/armor base id for an ilvl */
  const TI = [1, 4, 8, 13, 19, 26, 34, 43, 52, 61, 70, 80, 90, 99];
  const tierFor = ilvl => { let t = 0; for (let i = 0; i < TI.length; i++) if (TI[i] <= ilvl) t = i; return t; };
  /* unique archetypes: each defines a base line + a stat recipe scaling with ilvl */
  const fl = Math.floor;
  /* Each archetype now carries 4 distinct BUILDS (paired 1:1 with its 4 names) instead of one
     shared recipe, so every named unique has its own stat identity — never a recolored clone.
     A global de-dup pass (below) then guarantees no two uniques anywhere share a stat key-set. */
  const ARCH = [
    /* ai 0–11 : the original lines (each carries hand-tuned `art` for inventory + on-body look) */
    { base: ilvl => `sword2h_t${tierFor(ilvl)}`, name: ["Dawnbreaker","Sunder","Kingsbane","Worldcleaver"], flavor: "Forged to end something larger than a man.",
      art: { glow: "#ffd98a", metal: "#f1ebd2", wood: "#6a4a2a", trim: "#e6c868" },
      builds: [ L=>({dmgPct:40+L*1.4, critChance:6+L*0.1, critDmg:20+L*0.3, str:8+L*0.2}), L=>({dmgPct:55+L*1.6, str:12+L*0.3, arPct:30}), L=>({dmgPct:45+L*1.4, lifeSteal:5, hp:20+L*0.8, dmgUndead:50}), L=>({dmgPct:60+L*1.8, ias:14, skillAll:1+fl(L/40)}) ] },
    { base: ilvl => `axe2h_t${tierFor(ilvl)}`, name: ["Gorewake","Reaver's End","Skullsplit","Ruin"], flavor: "It drinks first and asks never.",
      art: { glow: "#ff6a5a", metal: "#dcc4b2", wood: "#4a2e1e", trim: "#b08040" },
      builds: [ L=>({dmgPct:55+L*1.6, dmgUndead:60, str:10+L*0.25}), L=>({dmgPct:50+L*1.5, lifeSteal:6, vit:8+L*0.2}), L=>({dmgPct:58+L*1.6, critChance:7+L*0.1, frw:10}), L=>({dmgPct:52+L*1.5, thorns:8+L*0.4, hp:25+L*0.9}) ] },
    { base: ilvl => `dagger_t${tierFor(ilvl)}`, name: ["Whisperfang","Nightkiss","Quietus","Severance"], flavor: "The last thing many never heard.",
      art: { glow: "#8ef060", metal: "#cfe6c0", wood: "#2a2a2a", trim: "#88c060" },
      builds: [ L=>({poisonDmg:8+L*0.6, ias:18, dex:8+L*0.25}), L=>({critChance:9+L*0.12, critDmg:25+L*0.4, dex:8+L*0.2}), L=>({dmgPct:35+L*1.2, ias:20, lifeSteal:4}), L=>({poisonDmg:10+L*0.7, frw:12, dodge:8+L*0.2}) ] },
    { base: ilvl => `bow2h_t${tierFor(ilvl)}`, name: ["Wintershot","Stormstring","Farsong","Hawkeye"], flavor: "Looses true across impossible distance.",
      art: { glow: "#9fe0ff", metal: "#d8ecf6", wood: "#5a6a72", trim: "#bcd0dc" },
      builds: [ L=>({dmgPct:35+L*1.3, coldDmg:6+L*0.5, dex:10+L*0.3}), L=>({dmgPct:38+L*1.4, lightDmg:10+L*0.6, ias:15}), L=>({dmgPct:34+L*1.3, critChance:8+L*0.12, frw:14}), L=>({dmgPct:36+L*1.3, fireDmg:8+L*0.5, dex:8+L*0.2, arPct:35}) ] },
    { base: ilvl => `staff2h_t${tierFor(ilvl)}`, name: ["Tempest","Emberheart","Frostward Rod","Stormcrown"], flavor: "Hums with a weather of its own.",
      art: { glow: "#fff070", metal: "#e8e0b0", wood: "#6a5230", trim: "#f2e26a" },
      builds: [ L=>({spellPct:30+L*1.5, fcr:15, lightDmg:8+L*0.6}), L=>({spellPct:32+L*1.5, fireDmg:10+L*0.7, mana:20+L*0.6}), L=>({spellPct:28+L*1.4, coldDmg:8+L*0.6, skillAll:1+fl(L/40)}), L=>({spellPct:30+L*1.5, fcr:18, manaRegen:25, wil:8+L*0.2}) ] },
    { base: ilvl => `wand_t${tierFor(ilvl)}`, name: ["Hexfinger","Soulwhisper","Gravewand","Rotcaller"], flavor: "It points where the dead should rise.",
      art: { glow: "#c89cff", metal: "#cabcd8", wood: "#3a2e3a", trim: "#9a70c0" },
      builds: [ L=>({spellPct:25+L*1.3, mana:20+L*0.6, manaRegen:25}), L=>({spellPct:28+L*1.4, fcr:14, skillAll:1+fl(L/35)}), L=>({spellPct:24+L*1.3, poisonDmg:8+L*0.6, wil:8+L*0.2}), L=>({spellPct:26+L*1.3, lightDmg:10+L*0.6, mana:18+L*0.5, fcr:10}) ] },
    { base: ilvl => `chest_t${tierFor(ilvl)}`, name: ["Aegis of Ash","Dragonscale","Bulwark","Cindermail"], flavor: "Soaks more than it shows.",
      art: { glow: "#ff8a4a", metal: "#d8b89a", wood: "#5a3a24", trim: "#c08040" },
      builds: [ L=>({armorPct:50+L*1.2, hp:25+L*1.0, resAll:8+fl(L/12)}), L=>({armorPct:55+L*1.3, resFire:30, vit:10+L*0.25}), L=>({armorPct:48+L*1.1, hpPct:8+fl(L/20), thorns:10+L*0.4}), L=>({armorPct:52+L*1.2, hp:30+L*1.1, dmgPct:15+L*0.4}) ] },
    { base: ilvl => `helm_t${tierFor(ilvl)}`, name: ["Crown of Cinders","Skullhelm","Visage","Doomcap"], flavor: "Heavy is the head it keeps.",
      art: { glow: "#ffcf70", metal: "#e0d2a8", wood: "#5a432a", trim: "#e6c868" },
      builds: [ L=>({skillAll:1+fl(L/35), mana:18+L*0.5, mf:20}), L=>({armorPct:30+L*0.8, resAll:6+fl(L/14), hp:20+L*0.8}), L=>({skillAll:1+fl(L/40), fcr:12, spellPct:12+L*0.4}), L=>({dex:8+L*0.2, critChance:6+L*0.1, mf:25, goldFind:25}) ] },
    { base: ilvl => `boots_t${tierFor(ilvl)}`, name: ["Stridewraith","Windsole","Ghoststep","Swiftmarch"], flavor: "The footprints arrive a moment late.",
      art: { glow: "#bfe8ff", metal: "#cfe0ea", wood: "#4a4640", trim: "#9ab8c8" },
      builds: [ L=>({frw:25+fl(L/6), dex:8+L*0.2, resAll:6+fl(L/14)}), L=>({frw:28+fl(L/5), vit:8+L*0.2, hp:20+L*0.8}), L=>({frw:24+fl(L/6), dodge:8+L*0.2, resCold:25}), L=>({frw:26+fl(L/6), ias:10, str:6+L*0.15}) ] },
    { base: ilvl => `amulet_t${tierFor(ilvl)}`, name: ["Stormknot","Heart of the Marsh","Soulglass","Eye of the Vigil"], flavor: "Warm, and not from your skin.",
      art: { glow: "#9fe8d8", metal: "#cfe6e0", wood: "#3a4a46", trim: "#7fd8c0" },
      builds: [ L=>({skillAll:1+fl(L/30), resAll:8+fl(L/14), spellPct:12+L*0.4}), L=>({hp:25+L*1.0, mana:25+L*0.8, resAll:6+fl(L/16)}), L=>({dmgPct:18+L*0.5, critChance:6+L*0.1, str:8+L*0.2}), L=>({spellPct:18+L*0.5, fcr:12, manaRegen:25, wil:8+L*0.2}) ] },
    { base: ilvl => `ring_t${tierFor(ilvl)}`, name: ["Sanguine Coil","Bloodloop","Ring of Ruin","Coilfire"], flavor: "It tightens, very slightly, when prey is near.",
      art: { glow: "#ff9a5a", metal: "#e0c0a0", wood: "#4a3326", trim: "#d4a050" },
      builds: [ L=>({lifeSteal:3, critChance:5+L*0.08, str:6+L*0.15}), L=>({hp:25+L*1.0, vit:6+L*0.15, resAll:5+fl(L/16)}), L=>({dmgPct:15+L*0.4, fireDmg:6+L*0.4, ias:8}), L=>({mana:18+L*0.6, fcr:10, spellPct:10+L*0.3}) ] },
    { base: ilvl => `mace2h_t${tierFor(ilvl)}`, name: ["Earthshaker","Worldhammer","Tollbringer","Cataclysm"], flavor: "The ground forgives nothing it strikes.",
      art: { glow: "#e6b86a", metal: "#d0c2a0", wood: "#5a4226", trim: "#c6a45a" },
      builds: [ L=>({dmgPct:60+L*1.7, str:12+L*0.3, ccReduce:20}), L=>({dmgPct:55+L*1.6, hp:25+L*1.0, thorns:10+L*0.4}), L=>({dmgPct:58+L*1.7, armorPct:25+L*0.6, vit:8+L*0.2}), L=>({dmgPct:62+L*1.8, critDmg:25+L*0.4, str:10+L*0.25}) ] },
    /* ai 12–19 : the categories that previously had no unique — every weapon type & armor slot now covered */
    { base: ilvl => `sword_t${tierFor(ilvl)}`, name: ["Edge of Vows","Lightbrand","Kingsblade","Vowkeeper"], flavor: "Sworn before it was sharpened.",
      art: { glow: "#cfe0ff", metal: "#e8f0fa", wood: "#5a4226", trim: "#c0a050" },
      builds: [ L=>({dmgPct:35+L*1.3, critChance:6+L*0.1, dex:6+L*0.18, ias:12}), L=>({dmgPct:38+L*1.4, lightDmg:8+L*0.5, str:6+L*0.15}), L=>({dmgPct:34+L*1.3, lifeSteal:4, hp:18+L*0.7}), L=>({dmgPct:36+L*1.3, critDmg:22+L*0.35, dex:8+L*0.2}) ] },
    { base: ilvl => `axe_t${tierFor(ilvl)}`, name: ["Tusk","Cleaver's Joy","Bonereaver","Wolfsplit"], flavor: "Light enough to swing all day. It rarely needs to.",
      art: { glow: "#ffc46a", metal: "#d8caac", wood: "#4a3320", trim: "#b89050" },
      builds: [ L=>({dmgPct:42+L*1.4, lifeSteal:4, str:8+L*0.2}), L=>({dmgPct:44+L*1.5, dmgUndead:50, critChance:6+L*0.1}), L=>({dmgPct:40+L*1.4, ias:14, frw:8}), L=>({dmgPct:43+L*1.4, thorns:8+L*0.4, vit:8+L*0.2}) ] },
    { base: ilvl => `mace_t${tierFor(ilvl)}`, name: ["Vesper","Bellringer","Knell","Sanctus"], flavor: "Every toll is a verdict.",
      art: { glow: "#ffe39a", metal: "#e2d6b2", wood: "#5a4630", trim: "#ffcf5a" },
      builds: [ L=>({dmgPct:40+L*1.35, ccReduce:15, str:8+L*0.2}), L=>({dmgPct:38+L*1.3, dmgUndead:60, hp:18+L*0.7}), L=>({dmgPct:42+L*1.4, armorPct:20+L*0.5, vit:6+L*0.15}), L=>({dmgPct:39+L*1.35, critChance:6+L*0.1, resAll:5+fl(L/16)}) ] },
    { base: ilvl => `spear2h_t${tierFor(ilvl)}`, name: ["Skyfall Pike","Stormlance","Heaven's Reach","Thunderpike"], flavor: "It comes down like weather.",
      art: { glow: "#aee0ff", metal: "#dcecf6", wood: "#6a5238", trim: "#bcd0dc" },
      builds: [ L=>({dmgPct:45+L*1.4, dex:8+L*0.2, frw:10, critChance:5}), L=>({dmgPct:48+L*1.5, lightDmg:10+L*0.6, str:8+L*0.2}), L=>({dmgPct:44+L*1.4, ias:14, arPct:30}), L=>({dmgPct:46+L*1.4, coldDmg:8+L*0.5, dex:8+L*0.2, frw:8}) ] },
    { base: ilvl => `crossbow2h_t${tierFor(ilvl)}`, name: ["Heartseeker","Repeater","Boltwidow","Killshot"], flavor: "It does not miss the second time.",
      art: { glow: "#ff7a6a", metal: "#c8ccd2", wood: "#4a3526", trim: "#9a7a4a" },
      builds: [ L=>({dmgPct:50+L*1.5, fireDmg:8+L*0.5, dex:8+L*0.2}), L=>({dmgPct:48+L*1.5, critChance:8+L*0.12, critDmg:25+L*0.4}), L=>({dmgPct:52+L*1.5, ias:14, frw:8}), L=>({dmgPct:49+L*1.5, poisonDmg:8+L*0.5, dex:8+L*0.2, ccReduce:15}) ] },
    { base: ilvl => `shield_t${tierFor(ilvl)}`, name: ["Wardlight","Bastion","Sanctuary","Aegis Eternal"], flavor: "Behind it, you are briefly immortal.",
      art: { glow: "#ffe09a", metal: "#d6cba6", wood: "#4a3a26", trim: "#e6c868" },
      builds: [ L=>({armorPct:45+L*1.1, resAll:8+fl(L/12), hp:20+L*0.8}), L=>({block:15, armorPct:40+L*1.0, vit:10+L*0.25}), L=>({armorPct:48+L*1.2, thorns:12+L*0.5, resFire:25}), L=>({armorPct:42+L*1.0, hpPct:8+fl(L/20), resAll:6+fl(L/16)}) ] },
    { base: ilvl => `gloves_t${tierFor(ilvl)}`, name: ["Gravewrought Grips","Throttle","Vise","Deadhand"], flavor: "Grip first. Mercy never.",
      art: { glow: "#c8a0ff", metal: "#cabcc8", wood: "#3a2e3a", trim: "#9a70c0" },
      builds: [ L=>({ias:15, critChance:6+L*0.1, str:6+L*0.18, dmgPct:12+L*0.4}), L=>({ias:18, dex:8+L*0.2, lifeSteal:3}), L=>({dmgPct:15+L*0.5, critDmg:22+L*0.35, str:6+L*0.15}), L=>({ias:14, frw:8, hp:18+L*0.7, thorns:6+L*0.3}) ] },
    { base: ilvl => `belt_t${tierFor(ilvl)}`, name: ["Serpentcoil","Girdle of Spite","Venomwind","Coilbind"], flavor: "It tightens when you bleed, and tightens more when they do.",
      art: { glow: "#9ee06a", metal: "#cfe0b8", wood: "#3a3326", trim: "#88c060" },
      builds: [ L=>({hp:25+L*1.0, resAll:5+fl(L/14), str:6+L*0.15}), L=>({hp:28+L*1.1, poisonDmg:8+L*0.5, vit:8+L*0.2}), L=>({hpPct:8+fl(L/18), resFire:25, resCold:25}), L=>({hp:24+L*1.0, frw:10, dodge:6+L*0.2}) ] },
  ];
  const ILVLS = [5, 9, 13, 18, 24, 31, 39, 47, 56, 65, 74, 84, 93];
  /* signature stat(s) per archetype (index-aligned with ARCH) — preserves each
     unique's thematic identity; the REST of its stats are now sampled from the
     LIVE affix pool, so regenerated uniques use the current, modern stat
     vocabulary (leech, vs-demon/undead, flat DR, etc.) at present-day scales.
     (ARCH[].builds above are legacy/unused — kept only for their names+art.) */
  const SIG = [
    ["dmgPct"], ["dmgPct", "lifeSteal"], ["ias", "critChance"], ["dmgPct", "dex"],
    ["spellPct", "fcr"], ["spellPct"], ["armorPct", "hp"], ["skillAll"],
    ["frw"], ["skillAll"], ["lifeSteal"], ["dmgPct"],
    ["dmgPct"], ["dmgPct"], ["dmgPct"], ["dmgPct"],
    ["dmgPct", "critChance"], ["armorPct", "resAll"], ["ias"], ["hp"],
  ];
  /* a thematic +class / +tree skill bonus per archetype (index-aligned). Each unique
     of that line carries this skill stat — only the matching class benefits (D2-style).
     null = no skill (armor slots that don't traditionally carry skills). */
  const USKILL = [
    "skillTree_vanguard_2",   // 0  2H sword  → Assault
    "skillClass_vanguard",    // 1  2H axe
    "skillTree_veilranger_2", // 2  dagger    → Veil
    "skillTree_veilranger_0", // 3  bow       → Precision
    "skillClass_emberwitch",  // 4  staff
    "skillClass_gravebinder", // 5  wand
    null,                     // 6  chest
    "skillClass_emberwitch",  // 7  helm
    null,                     // 8  boots
    "skillTree_emberwitch_2", // 9  amulet    → Tempest
    "skillClass_wildkeeper",  // 10 ring? no — 11 below; index 10 is ring
    "skillClass_wildkeeper",  // 11 2H mace   → (note: idx 10 ring gets the first of these; see remap)
    "skillTree_vanguard_0",   // 12 1H sword  → Arms
    "skillTree_wildkeeper_2", // 13 1H axe    → Wildshape
    "skillTree_vanguard_1",   // 14 1H mace   → Warcries
    "skillTree_wildkeeper_1", // 15 spear     → Stormcall
    "skillClass_veilranger",  // 16 crossbow
    null,                     // 17 shield
    "skillTree_gravebinder_0",// 18 gloves    → Bonecraft
    "skillTree_gravebinder_2",// 19 belt      → Rot
  ];
  USKILL[10] = null;          // ring: no class skill (keep rings stat-only)
  /* 7 distinct, themed names per archetype (authored via the unique-name-forge workflow) —
     enough for every emitted ilvl so no two uniques share a name. */
  const NAMES = [
    ["Dawnbreaker", "Sunder", "Kingsbane", "Worldcleaver", "Mornsplitter", "Heaven's Edge", "Aurora's Reckoning"],
    ["Gorewake", "Reaver's End", "Skullsplit", "Ruin", "Marrowhunger", "The Crimson Tithe", "Butcher's Verdict"],
    ["Whisperfang", "Nightkiss", "Quietus", "Severance", "Venomwhisper", "The Silent Thorn", "Last Breath"],
    ["Wintershot", "Stormstring", "Farsong", "Hawkeye", "Frostpierce", "The Distant Tempest", "Skyreacher"],
    ["Tempest", "Emberheart", "Frostward Rod", "Stormcrown", "Cinderveil", "The Glacial Maelstrom", "Thunderspire"],
    ["Hexfinger", "Soulwhisper", "Gravewand", "Rotcaller", "Tombquill", "Wraithsplinter", "The Pale Conductor"],
    ["Aegis of Ash", "Dragonscale", "Bulwark", "Cindermail", "Emberweave Carapace", "Scaleforge Vest", "Ashen Bastion"],
    ["Crown of Cinders", "Skullhelm", "Visage", "Doomcap", "Diadem of the Drowned King", "Boneward Casque", "The Final Verdict"],
    ["Hauntpace", "Windsole", "Ghoststep", "Swiftmarch", "Galeheel", "Pallor Treads", "Breath of the Hollow Road"],
    ["Stormknot", "Heart of the Marsh", "Soulglass", "Eye of the Vigil", "Tempestbinder's Charm", "Mirelight Pendant", "The Sleepless Lantern"],
    ["Sanguine Coil", "Bloodloop", "Ring of Ruin", "Coilfire", "Emberveins", "Wound of Cinders", "Serpent's Pyre"],
    ["Earthshaker", "Worldhammer", "Tollbringer", "Cataclysm", "Doomtoll", "The Sunken Peal", "Mountainfall"],
    ["Edge of Vows", "Lightbrand", "Kingsblade", "Vowkeeper", "Dawnsworn", "The Gilded Promise", "Throneward"],
    ["Tusk", "Cleaver's Joy", "Bonereaver", "Wolfsplit", "Huntsmaw", "Antlershear", "The Quarry's End"],
    ["Vesper", "Bellringer", "Knell", "Sanctus", "Matins", "Final Tithe", "Choir of Ash"],
    ["Skyfall Pike", "Stormlance", "Heaven's Reach", "Thunderpike", "Tempest's Descent", "Cloudpiercer", "Wrath of the Gale"],
    ["Heartseeker", "Repeater", "Boltwidow", "Killshot", "Pulsebreaker", "The Quickening Quarrel", "Last Heartbeat"],
    ["Wardlight", "Bastion", "Sanctuary", "Aegis Eternal", "The Unbroken Vow", "Refuge of Ash", "Wallward"],
    ["Gravewrought Grips", "Throttle", "Vise", "Deadhand", "Sepulcher's Clutch", "Stranglemourn", "Palms of the Pit"],
    ["Serpentcoil", "Girdle of Spite", "Venomwind", "Coilbind", "The Tightening Hiss", "Fangknot", "Spitebound Coil"],
  ];
  const SKILL_RE = /^skill(Class|Tree)_/;
  const STAT_CAP = s => {
    if (/^res/.test(s)) return 45;
    if (s === "skillAll") return 2;
    if (/^skillTree_/.test(s)) return 3;
    if (/^skillClass_/.test(s)) return 2;
    if (s === "critDmg") return 120;
    if (["dmgPct", "armorPct", "spellPct", "arPct", "dmgUndead", "dmgDemon"].includes(s)) return 220;
    if (["ar", "arUndead", "arDemon"].includes(s)) return 320;
    if (["str", "dex", "vit", "wil"].includes(s)) return 35;
    if (["ias", "fcr", "frw", "critChance", "dodge", "ccReduce", "block", "lifeSteal", "manaSteal", "mf", "goldFind", "monsterFlee"].includes(s)) return 50;
    if (["hp", "mana"].includes(s)) return 160;
    if (["fireDmg", "coldDmg", "lightDmg", "poisonDmg"].includes(s)) return 95;
    if (["minDmg", "maxDmg"].includes(s)) return 42;
    if (["knockback", "preventHeal"].includes(s)) return 1;
    return 60;   // dmgReduceFlat, magicReduceFlat, lifeRegen, manaAfterKill, dmgToMana, thorns, manaRegen, hpPct…
  };
  const SIG_DEFAULT = (s, L) => {
    const d = { dmgPct: 45 + L * 1.4, spellPct: 32 + L * 1.3, armorPct: 48 + L * 1.1, frw: 25 + fl(L / 6),
      skillAll: 1 + fl(L / 40), lifeSteal: 4 + fl(L / 25), ias: 12 + fl(L / 8), critChance: 6 + fl(L / 12),
      hp: 25 + L * 0.9, resAll: 8 + fl(L / 12), dex: 8 + L * 0.25 }[s];
    return d != null ? d : 20;
  };
  /* {stat:maxValue} eligible for a base's slot/cat at an ilvl, from the LIVE pool */
  const poolMapFor = (slot, cat, ilvl) => {
    const m = {};
    const add = (st, mx) => { if (!st || SKILL_RE.test(st) || mx == null || !DATA.STAT_TEXT[st]) return; if (m[st] == null || mx > m[st]) m[st] = mx; };
    for (const a of DATA.AFFIXES) {
      if (a.proc || a.perLevel) continue;
      const elig = a.slots && (a.slots.includes("any") || a.slots.includes(slot)) && (!a.cats || a.cats.includes(cat));
      if (!elig) continue;
      const tiers = a.tiers.filter(t => t.ilvl <= ilvl);
      if (!tiers.length) continue;
      const top = tiers[tiers.length - 1];
      if (top.mods) for (const md of top.mods) add(md.stat, md.max);
      else add(a.stat, top.max);
    }
    return m;
  };
  const UNIQUE_MULT = 1.25;
  ARCH.forEach((A, ai) => {
    let emitted = 0;
    ILVLS.forEach((ilvl, k) => {
      if ((ai + k) % 2 !== 0) return;                 // spread ~half across levels (curated, not bloated)
      const base = A.base(ilvl), bdef = DATA.BASES[base];
      if (!bdef) return;
      const id = `u_gen_${ai}_${k}`;
      const rng = U.rng(U.hash(id));                  // deterministic per-unique → stable across loads
      const pm = poolMapFor(bdef.slot, bdef.cat, ilvl);
      const stats = {};
      for (const sg of (SIG[ai] || ["hp"])) {         // signature: thematic, guaranteed, a touch stronger
        const v = pm[sg] != null ? pm[sg] * 1.4 : SIG_DEFAULT(sg, ilvl);
        stats[sg] = Math.max(1, Math.min(rd(v), STAT_CAP(sg)));
      }
      const usk = USKILL[ai];                          // thematic +class / +tree skills, scaling with ilvl
      if (usk) {
        const v = /^skillTree_/.test(usk) ? (1 + (ilvl >= 35 ? 1 : 0) + (ilvl >= 60 ? 1 : 0)) : (1 + (ilvl >= 55 ? 1 : 0));
        stats[usk] = Math.min(v, STAT_CAP(usk));
      }
      const cand = Object.keys(pm).filter(s => stats[s] == null);
      for (let i = cand.length - 1; i > 0; i--) { const j = fl(rng() * (i + 1)), t = cand[i]; cand[i] = cand[j]; cand[j] = t; }
      const nExtra = Math.min(cand.length, 2 + fl(tierFor(ilvl) / 4));   // 2..~5 pool-sampled stats
      for (let i = 0; i < nExtra; i++) { const s = cand[i]; stats[s] = Math.max(1, Math.min(rd(pm[s] * UNIQUE_MULT), STAT_CAP(s))); }
      const nameRow = NAMES[ai] || A.name;
      DATA.UNIQUES.push({ id, base, name: nameRow[emitted % nameRow.length], ilvl, stats, flavor: A.flavor, art: A.art });
      emitted++;
    });
  });

  /* ---- GUARANTEE: every unique has a DISTINCT name (safety net for cross-archetype
     or hand-authored collisions; appends a rare epithet only if truly needed) ---- */
  (function dedupeUniqueNames() {
    const EPI = ["the Elder", "the Lost", "Reborn", "Ascendant", "Unbroken", "the Pale", "Eternal", "the Forgotten", "Resurgent", "the Hollow"];
    const seen = new Set(); let ep = 0;
    for (const u of DATA.UNIQUES) {
      if (!u.name) continue;
      let nm = u.name, key = nm.toLowerCase();
      while (seen.has(key)) { nm = u.name + " " + EPI[ep % EPI.length]; ep++; key = nm.toLowerCase(); }
      u.name = nm; seen.add(key);
    }
  })();

  /* ---- GUARANTEE: no two uniques anywhere share the same stat key-set ----
     Hand-authored uniques (listed first) keep their curated stats; any later unique whose
     stat combination already exists gains slot-useful filler stats until its set is novel. */
  (function dedupeUniqueStats() {
    const FILLERS = ["resAll","hp","mana","vit","str","dex","frw","mf","goldFind","dodge","critChance","ias","lifeSteal","thorns","manaRegen","critDmg","resFire","resCold","resLight","armor","arPct"];
    const keyset = s => Object.keys(s).sort().join(",");
    const seen = new Set();
    let fp = 0;   // rotating start so colliding items pick DIFFERENT fillers and diverge in one step (low bloat)
    for (const u of DATA.UNIQUES) {
      if (!u.stats) continue;
      let ks = keyset(u.stats);
      /* Each pass adds a slot-useful stat the item lacks (scanning from the rotating pointer) — so
         the key-set STRICTLY grows and is guaranteed to become novel (uniques have ≤5 stats; FILLERS
         has 21, so a free filler always exists). The f==null break is a theoretical backstop only. */
      while (seen.has(ks)) {
        let f = null;
        for (let j = 0; j < FILLERS.length; j++) { const cand = FILLERS[(fp + j) % FILLERS.length]; if (u.stats[cand] == null) { f = cand; fp = (fp + j + 1) % FILLERS.length; break; } }
        if (f == null) break;
        u.stats[f] = Math.max(1, rd((u.ilvl || 10) * 0.14) + (f === "resAll" ? 3 : /^res/.test(f) ? 8 : (f === "critChance" || f === "dodge") ? 3 : 6));
        ks = keyset(u.stats);
      }
      seen.add(ks);
    }
  })();

  /* a few more sets spanning the range */
  const SETS2 = [
    { id: "dragobane", name: "Dragonbane Panoply", b: { 2: { dmgPct: 30, resFire: 20 }, 4: { dmgPct: 60, str: 20, lifeSteal: 5 } },
      pieces: [["head", 60, { armor: 40, resFire: 20 }], ["chest", 60, { armorPct: 60, hp: 60 }], ["main", 60, { dmgPct: 50, str: 15 }], ["boots", 55, { frw: 25, dex: 10 }]] },
    { id: "stormcaller", name: "Raiment of the Stormcaller", b: { 2: { spellPct: 20, fcr: 15 }, 3: { skillAll: 2, lightDmg: 20, spellPct: 25 } },
      pieces: [["head", 55, { mana: 50, fcr: 12 }], ["chest", 55, { armorPct: 40, mana: 40 }], ["main", 55, { spellPct: 50, lightDmg: 20 }]] },
  ];
  for (const S of SETS2) {
    DATA.SETS[S.id] = { id: S.id, name: S.name, bonuses: S.b, flavor: "Worn whole, it remembers what it was." };
    S.pieces.forEach((p, i) => {
      const [slot, ilvl, stats] = p;
      const bid = slot === "main" ? `sword_t${tierFor(ilvl)}` : `${slot === "head" ? "helm" : slot}_t${tierFor(ilvl)}`;
      if (!DATA.BASES[bid]) return;
      DATA.SET_ITEMS.push({ id: `s_${S.id}_${i}`, set: S.id, base: bid, name: `${S.name.split(" ")[0]} ${slot}`, ilvl, stats });
    });
  }
})();

/* =====================  QUESTS  ===================== */
DATA.QUESTS = [
  { id:"q1", name:"Ash on the Wind", giver:"vessa",
    brief:"Thin the dead that wander the Ashen Fields. Slay 10 creatures beyond the gate.",
    type:"kills", target:10, zone:"fields",
    done:"The fields breathe a little easier. Take this — pulled it off a deserter who won't miss it.",
    reward:{ gold:200, item:{ rarity:"enhanced", ilvl:3 } } },
  { id:"q2", name:"Bells Below", giver:"vessa",
    brief:"A voice has been singing the dead out of their graves. Find the Sunken Crypt beneath the burial ground and silence Gravecaller Hesh.",
    type:"killBoss", target:"gravecaller", zone:"crypt1",
    done:"The bells have stopped. Maesa says the silence is worth more than gold — but learn this instead.",
    reward:{ gold:150, skillPts:1 } },
  { id:"q3", name:"The Grave-Warden", giver:"vessa",
    brief:"Hesh answered to something older. Descend to the Sunken Vigil and destroy Morthul, the Grave-Warden.",
    type:"killBoss", target:"morthul", zone:"crypt2",
    done:"It's over — for this stretch of the Marches, at least. Cinderwatch owes you a debt it can't pay. Here's what it can.",
    reward:{ gold:600, item:{ rarity:"unique", ilvl:6 }, consumable:"respec" } },
  { id:"q4", name:"The Hollow Choir", giver:"maesa",
    brief:"Maesa hears singing from the Ruined Chapel south of the fields — the kind that empties graves. Silence Vicar Thessaly.",
    type:"killBoss", target:"vicar", zone:"chapel",
    done:"The nights are quieter. My ears thank you, dear, and so does whatever's still buried out there.",
    reward:{ gold:350, glyph:true } },
  { id:"q5", name:"Roots That Remember", giver:"board",
    brief:"A parchment in a shaking hand: 'To any blade for hire — the Blackbough took my brother on the monastery road. Cut down 12 of whatever hunts beneath those trees and the reward pinned here is yours. —H.'",
    type:"kills", target:12, zone:"forest",
    done:"Beneath the notice, a heavy purse and a wrapped bundle have been nailed to the board, with one word added: 'PAID.'",
    reward:{ gold:400, item:{ rarity:"rare", ilvl:7 } } },
  { id:"q6", name:"The Unshepherd", giver:"vessa",
    brief:"Every road of rot leads up the hill to the Greymonastery. Its abbot, Vellath, closed the gates from inside years ago. Open them. End him.",
    type:"killBoss", target:"vellath", zone:"monastery2",
    done:"The Marches are free of it. Whatever you are now, Cinderwatch will tell stories about you — but the rot you fought here was only an echo of what's loose in the wider world. Watch the north.",
    reward:{ gold:900, item:{ rarity:"unique", ilvl:9 }, skillPts:1 } },

  /* ===== ACT I — The Fallen North (opening) ===== */
  { id:"q7", name:"The Light That Lied", giver:"sera",
    brief:"You came through the shattering light alive. Seraneth says it was no victory — it was an unlocking. Step beyond Frosthaven's wall into the Fallen North and learn what walks it now. Slay 8 of the risen.",
    type:"kills", target:8, zone:"north_wild",
    done:"You feel it too, then. This is not the peace we were promised. Something is harvesting the shards — and carrying them south.",
    reward:{ gold:120, item:{ rarity:"enhanced", ilvl:3 } } },
  { id:"q8", name:"Those Who Hid", giver:"bryn",
    brief:"When the town fell, folk fled down into the Abandoned Mines — and the dark followed them. They're still down there, cowering in the deep cuts. Go below and bring them out alive. Rescue 3 trapped survivors.",
    type:"rescue", target:3, zone:"mines",
    done:"You brought them home. After everything that's crawled out of that mountain — you brought them HOME. I'll not forget it. Take my brother's blade; it should be carried by someone who saves people, not just kills them.",
    reward:{ gold:200, item:{ rarity:"rare", ilvl:4 }, glyph:true } },
  { id:"q8b", name:"The Oathsworn Beacons", giver:"freed",
    brief:"One of the folk you pulled from the mines won't stop shaking: Korvath, the Oathbreaker, has risen in the Shattered Temple — and sealed it behind a barrier of light. Three corrupted beacons in the Fallen North feed that barrier. Shatter all three. Each will vomit out the dead until it falls. When the last goes dark, the Oathsworn that guard him will come for you — end the three of them and the temple will open.",
    type:"beacons", zone:"north_wild",
    done:"The barrier's down. The Oathsworn are scattered bone. Whatever's left of Korvath is yours to face now — the gods keep you, because nothing else up here will.",
    reward:{ gold:250, item:{ rarity:"rare", ilvl:5 }, glyph:true } },
  { id:"q9", name:"The Oathbreaker", giver:"sera",
    brief:"A shard has raised Korvath — once the North's finest commander, now certain every living soul is a demon in disguise. The barrier is down; his Shattered Temple stands open. End his vigil.",
    type:"killBoss", target:"korvath", zone:"shattered_temple",
    done:"Korvath's transport ledger confirms it: someone is harvesting Embershards from the shattered Sunderstone and carrying them south into the Weeping Marsh. The folk there have begun to fall silent. A ferryman's waystone has woken. Follow the quiet.",
    reward:{ gold:400, item:{ rarity:"unique", ilvl:5 }, skillPts:1 } },

  /* ===== ACT II — The Weeping Marsh ===== */
  { id:"q10", name:"The Quiet Ones", giver:"oris",
    brief:"The Embershards have awakened ancient spirits buried beneath the marsh. We call what follows the Quieting: people lose their voices, their dreams, and even their fear. Then they calmly walk into the swamp and disappear. Before you follow them, investigate here in Greywater Landing. Ask Sella about her lost voice, Olli about his dreams, and Ysra about the people walking into the water. Bring their accounts back to me.",
    type:"story", zone:"marshcamp",
    done:"Their accounts agree: the silence began when the shard arrived. Sella's voice, Olli's dreams, Ysra's fear — the buried spirits are taking something from each of them. The Silent Choir carries the shard through the flooded crypts beneath the abandoned monastery. Follow their trail and break the ritual before the next procession disappears.",
    objectives:[
      { kind:"talk", target:"voice", zone:"marshcamp", label:"Ask Sella about her lost voice" },
      { kind:"talk", target:"dreams", zone:"marshcamp", label:"Ask Olli about his dreams" },
      { kind:"talk", target:"fear", zone:"marshcamp", label:"Ask Ysra about the disappearances" }
    ],
    reward:{ gold:650, item:{ rarity:"rare", ilvl:12 } } },
  { id:"q11", name:"Below the Black Water", giver:"oris",
    brief:"Enter the flooded crypts beneath the abandoned monastery. Hunt the Silent Choir to the ritual heart and shatter it; their High Choirmaster, Vorthel, will rise to defend it. They are moving a stolen Embershard toward a demonic ritual site beyond the crypts. Stop their procession before the shard can be carried through the gateway they are building.",
    type:"ritual", target:"drowned_ritual", zone:"drowned_crypt", boss:"choirmaster",
    done:"Vorthel is dead, and the flooded ritual lies broken. His orders name the next courier: the Mire Mother, a demon formed from everyone the marsh consumed. She guards the Embershard embedded in her chest at the Choir's ritual site. Recover it before the cult can carry it any farther.",
    reward:{ gold:700, item:{ rarity:"rare", ilvl:13 }, glyph:true } },
  { id:"q12", name:"The Mire Mother", giver:"oris",
    brief:"The Mire Mother is a mass of the bodies consumed by the marsh, grown around the stolen Embershard embedded in her chest. Hunt her at the Choir's ritual site, then take the exposed shard from her remains before it can be carried into the demonic gateway.",
    type:"killBoss", target:"mire_mother", zone:"ritual_site",
    done:"You recovered the shard from her chest. Bound around it were the Choir's plans: they are building a gateway beneath Khal-Zahir, an ancient city buried in the southern desert. This marsh was only the first gathering point. A scholar's waystone calls from the dig. Follow the plans south.",
    objectives:[{ kind:"quest", target:"q11", label:"Complete Below the Black Water for Oris" }, { kind:"interact", target:"mire_shard", zone:"ritual_site", label:"Recover the shard from the Mire Mother’s remains" }],
    reward:{ gold:1000, item:{ rarity:"unique", ilvl:13 }, skillPts:1 } },

  /* ===== ACT III — The City Beneath the Sand ===== */
  { id:"q13", name:"What the Quakes Uncovered", giver:"edran",
    brief:"Violent earthquakes have uncovered Khal-Zahir, a desert metropolis erased from history after its rulers tried to contact the Burning Hells. Embershards have reactivated its ancient machines and opened impossible passages. Enter the underground market below the Shifting Wastes. Disable three shard relays and destroy six Gilded Constructs before the machines wake the rest of the city. I will assist you from the Dig Camp.",
    type:"story", zone:"underground_market",
    done:"The relays are dark. These symbols connect the Embershards to the Render's forgotten experiments with the Sunderstone. He was shaping a key, and someone has resumed his work. An Archivist of my order is imprisoned beyond the market, in tombs whose passages shift around him. Find him alive.",
    objectives:[
      { kind:"enter", target:"underground_market", zone:"underground_market", label:"Explore the underground market" },
      { kind:"kill", target:"gilt_construct", zone:"underground_market", count:6, label:"Destroy shard-powered Gilded Constructs" },
      ...[0,1,2].map(i => ({ kind:"interact", target:"market_relay_"+i, zone:"underground_market", label:"Disable shard relay "+(i+1) }))
    ],
    reward:{ gold:800, item:{ rarity:"rare", ilvl:15 } } },
  { id:"q14", name:"The Shifting Tombs", giver:"edran",
    brief:"An imprisoned Archivist, Scholar Ilyan, is chained inside the Shifting Tombs. The reawakened machines open passages that should not exist, and the tombs rearrange themselves each time you descend. Find Ilyan and break his bindings. Killing the guards alone will not free him.",
    type:"story", zone:"sand_tombs",
    done:"Ilyan is free. He recognized the palace inscriptions and confirmed my fear: these are the Render's forgotten experiments. Azram, Khal-Zahir's undead ruler, has fused himself to a fragment. His gold plates bind chained souls to his body. The palace is open; take back what he guards.",
    objectives:[{ kind:"interact", target:"imprisoned_scholar", zone:"sand_tombs", label:"Find and free Scholar Ilyan" }],
    reward:{ gold:900, item:{ rarity:"rare", ilvl:16 }, glyph:true } },
  { id:"q15", name:"The Gilded King", giver:"edran",
    brief:"Enter the palace of Azram the Gilded. Khal-Zahir's undead king is fused with an Embershard, his body encased in gold plates and chained souls. During the battle he can tear portals into earlier battlefields and summon the enemies you left behind. Defeat him and recover the fortress map from his throne.",
    type:"killBoss", target:"azram", zone:"khal_palace",
    done:"The map marks Malthoron's fortress: a ruined cathedral suspended between the Waking World and Hell, assembled from memories stolen by the shards. You carry Azram's fragment and the route to the Hollow King. Follow the map into the breach between worlds.",
    objectives:[{ kind:"quest", target:"q14", label:"Complete The Shifting Tombs for Edran" }, { kind:"interact", target:"fortress_map", zone:"khal_palace", label:"Recover the map to Malthoron’s fortress" }],
    reward:{ gold:1200, item:{ rarity:"unique", ilvl:16 }, skillPts:1 } },

  /* ===== ACT IV — The Shattered Cathedral ===== */
  { id:"q16", name:"The Empty Archangel", giver:"edran",
    brief:"The drifting cathedral rebuilds each level from the memories of everyone touched by the shards. Some halls remember Cinderwatch, others the Last Bastion or the depths beneath Mount Karrhal. Rescue three trapped souls before the walls absorb them. Then destroy the Empty Archangel: a soulless false angel made from Seraneth's discarded armor and corrupted Sunderstone energy, speaking with her voice.",
    type:"killBoss", target:"empty_archangel", zone:"cathedral1",
    done:"The three souls are free and the Empty Archangel is silent. It had Seraneth's voice and armor, but no soul. The Silent Choir's demonic priests maintain the Quieting deeper inside. Break their seals, recover Seraneth's shattered sword, and confront the Hollow King.",
    objectives:[...[0,1,2].map(i => ({ kind:"interact", target:"trapped_soul_"+i, zone:"cathedral1", label:"Rescue trapped soul "+(i+1) }))],
    reward:{ gold:1300, item:{ rarity:"rare", ilvl:18 }, glyph:true } },
  { id:"q17", name:"The Hollow King", giver:"edran",
    brief:"Break the three seals maintaining the Quieting ritual in the Cathedral Heart and confront the Silent Choir's demonic priests. Recover all three pieces of Seraneth's shattered sword. Then face Malthoron, who begins as an armored human warlord and sheds his plate to reveal swirling darkness and fragments of screaming souls.",
    type:"killBoss", target:"malthoron", zone:"cathedral2",
    done:"Malthoron is destroyed. His collected shards collapse into a portal leading directly into the Burning Hells. Someone else guided him: he was only gathering them for a hidden master. The Quieting seals are broken, and Seraneth's sword is yours. Follow the collapsing shards through the portal at the heart of his ruined fortress.",
    objectives:[
      { kind:"quest", target:"q16", label:"Complete The Empty Archangel for Edran" },
      ...[0,1,2].map(i => ({ kind:"interact", target:"quieting_seal_"+i, zone:"cathedral2", label:"Break Quieting seal "+(i+1) })),
      ...[0,1,2].map(i => ({ kind:"interact", target:"sword_piece_"+i, zone:"cathedral2", label:"Recover Seraneth’s sword piece "+(i+1) })),
      { kind:"kill", target:"choir_priest", zone:"cathedral2", count:3, label:"Defeat the Silent Choir’s demonic priests" }
    ],
    reward:{ gold:1600, item:{ rarity:"unique", ilvl:19 }, skillPts:2 } },

  /* ===== ACT V — The Throne of Cinders ===== */
  { id:"q18", name:"The Veiled Lord", giver:"vael",
    brief:"Enter a region of Hell built from the ruins of defeated demon kingdoms. Cross rivers of ash, fields of impaled demons, and ruined fortresses where rival broods fight each other. Prevent the gathered shards from becoming a permanent bridge into the Waking World. Vethriss, Lord of Lies, is the mastermind: it never intended Malthoron to succeed, only to gather every fragment. It wants a Sunderstone core it can control, then to manipulate our kingdoms from within. At the throne it wears a wounded Seraneth's face and asks you to surrender the shards. The lie will become a swift serpent surrounded by illusions, then a towering shadow copying the earlier act bosses.",
    type:"killBoss", target:"vethriss", zone:"throne",
    done:"It is over. The shards are one core now — the Cinder-Core — and what becomes of it is yours to decide alone. Destroy it and gamble that nothing worse is holding the next lock. Seal it away and pray no patient hand ever digs it up. Or set it in Seraneth's keeping, and trust that what came back from the light is still her. The whole of the Waking World will turn on what you choose.",
    reward:{ gold:3000, item:{ rarity:"unique", ilvl:22 }, skillPts:2, finale:true } },

  /* ===== OPTIONAL SIDE QUESTS (Acts I–III) — offered once their act is underway; never block the main chain ===== */
  { id:"opt_north_1", name:"The Shardpeak Vigil", giver:"bryn", optional:true, pre:"q7",
    brief:"A waystone's gone dark on the mountain pass — and Bryn's heard the dead that guard it sing in unison, like a choir of ice. Climb to the Shardpeak's frozen shrine and silence 15 of the corrupted sentries before the frost takes the last of the living beacons.",
    type:"kills", target:15, zone:"shardpeak_shrine",
    done:"The singing stops. The waystone glows again, warmer than before. Bryn slides a wrapped bundle across the counter — his grandmother's ring. 'Someone with a spine should carry it. Thank you.'",
    reward:{ gold:280, item:{ rarity:"rare", ilvl:4 }, glyph:true } },
  { id:"opt_north_2", name:"The Deepfreeze Caverns", giver:"bryn", optional:true, pre:"q8",
    brief:"There's an old hot spring sealed beneath the Abandoned Mines — a place the living could once warm their bones. Something's taken it over now, something that burns cold instead of hot. Descend into the ice caverns, find the great frozen spring, and kill the beast hunched over it — Hoarfang, they're calling it. Free the spring and it may run warm again.",
    type:"killBoss", target:"hoarfang", zone:"deepfreeze_cavern",
    done:"With Hoarfang dead, the ice over the spring groans and splits — and warmth, real warmth, wells up from the deep. Steam rises like old sighs. 'That was Frosthaven's gift to itself, once,' Bryn says. 'You gave it back. Here — better than coin.'",
    reward:{ gold:300, item:{ rarity:"rare", ilvl:4 }, skillPts:1 } },
  { id:"opt_marsh_1", name:"The Songless", giver:"oris", optional:true, pre:"q10",
    brief:"North of the landing, the marshfolk who fled the Quieting have gone silent — not asleep like the Choir's victims, but worse. They stand in the reeds, mouths cut, becoming something else. Find what's turning them, in the Hollow Reeds, and put it down before it finishes the work. Cut down 15 of the half-changed.",
    type:"kills", target:15, zone:"hollow_reeds",
    done:"You found the source — a Choir Herald conducting the half-changed from a submerged shrine. With it dead, the afflicted seem to wake; they weep, they remember their names. Oris says the Choir's reach is smaller now.",
    reward:{ gold:500, item:{ rarity:"rare", ilvl:12 } } },
  { id:"opt_marsh_2", name:"The Choir's Hatchery", giver:"oris", optional:true, pre:"q11",
    brief:"Where the deep marsh meets the drowned stones, something breeds in the black water — the Quieted who wade in come back multiplied. Find the Spawn Pools and destroy whatever nests inside. End the Brood Mother.",
    type:"killBoss", target:"brood_mother", zone:"spawn_pools",
    done:"The breeding pit is silenced — the spawn-pools drained, the pale things burned away, the Brood Mother dissolved with her countless young. 'The Choir's strength was always numbers,' Oris says. 'Now those numbers dwindle.'",
    reward:{ gold:600, item:{ rarity:"rare", ilvl:13 }, glyph:true } },
  { id:"opt_desert_1", name:"The Shattered Sentries", giver:"edran", optional:true, pre:"q13",
    brief:"Scouts report crystalline constructs moving in formation across the deep wastes — patterns too deliberate to be random. Edran fears the city wakes with intention. Cross to the Shard Flats and destroy 15 of these shard-touched guardians before they can march on the dig.",
    type:"kills", target:15, zone:"shard_flats",
    done:"The patterns scattered; whatever ordered them has gone dormant — for now. 'The city learns,' Edran says, turning a resonance-carved fragment in his hand. 'We're running out of time before it remembers how to run.'",
    reward:{ gold:650, item:{ rarity:"rare", ilvl:15 } } },
  { id:"opt_desert_2", name:"Tomb of the Chained", giver:"edran", optional:true, pre:"q14",
    brief:"In the deep tombs, sealed gates still bear the King's sigil — and behind them, Edran heard singing older than the Choir, voices bound in stone and shard-light. Clear the Chained Sanctum, and face what sings in the dark: a Chained Sovereign that remembers being a god.",
    type:"killBoss", target:"chained_sovereign", zone:"tomb_sanctum",
    done:"The singing stopped. In the silence the Archivist found ledgers — proof Khal-Zahir was built as a prison, not for the shards but for what they were meant to keep sealed. 'Azram didn't resurrect the city,' Edran whispers. 'He unsealed it.'",
    reward:{ gold:750, item:{ rarity:"rare", ilvl:16 }, glyph:true } },
];

/* quest log grouping — the 5-act spine, then the optional Ashen Marches side region */
DATA.QUEST_ACTS = [
  { rn:"I",   name:"The Fallen North",          quests:["q7","q8","q8b","q9","opt_north_1","opt_north_2"] },
  { rn:"II",  name:"The Weeping Marsh",          quests:["q10","q11","q12","opt_marsh_1","opt_marsh_2"] },
  { rn:"III", name:"The City Beneath the Sand",  quests:["q13","q14","q15","opt_desert_1","opt_desert_2"] },
  { rn:"IV",  name:"The Shattered Cathedral",    quests:["q16","q17"] },
  { rn:"V",   name:"The Throne of Cinders",      quests:["q18"] },
  { rn:"✦",   name:"The Ashen Marches",          quests:["q1","q2","q3","q4","q5","q6"], optional:true },
];

/* =====================  NPCS  =====================
   voice: { pitch, formant, rate } drives each character's babble-speech.
   talk: conversation topics — the player can ask, they answer. */
DATA.NPCS = {
  vessa: { id:"vessa", name:"Captain Vessa Marn", role:"quest",
    pal:{ armor:"#5a5040", trim:"#8a6a30", skin:"#c0987a", cloth:"#4a3028", hair:"#6a5848" },
    voice:{ pitch: 185, formant: 1050, rate: 9 },
    greet:["The gate holds. Barely.","Another sword still standing. Good.","Make it quick — the watch changes at dusk."],
    talk:[
      { q:"What happened to the Marches?", a:"Ten years back the graves stopped staying shut. We pulled everyone behind the palisade and called it a town. Before that, Cinderwatch was just a toll gate with ambitions." },
      { q:"Who's left to fight?", a:"Me, Brom, and whoever the road washes up. You, apparently. The legions went south the year the bells started — none came back to say why." },
      { q:"Any advice?", a:"Attune every travel shrine you pass, drink before you think you need to, and never trust a quiet graveyard." },
    ] },
  korrin: { id:"korrin", name:"Korrin the Smith", role:"vendor", stock:"arms",
    pal:{ armor:"#6a5a48", trim:"#3a3a3a", skin:"#a8826a", cloth:"#3a3430", hair:"#1a1410" },
    voice:{ pitch: 92, formant: 620, rate: 6.5 },
    greet:["Steel doesn't lie. People do.","Buying, selling, or wasting my coal?","Forge is hot. Talk fast."],
    talk:[
      { q:"Tell me about the Forge Altar.", a:"Older than the town, older than me, and I apprenticed under a glacier. Lay your materials on it and strike — glyphs answer to it. Three of a kind makes something new. There are reckonings written on it I still can't read." },
      { q:"What about glyphs?", a:"Little carved promises. Seat one in a socketed blade and it burns or bites or bleeds for you. Seat the right ones in the right ORDER, and the whole piece wakes up with a name of its own." },
      { q:"Where did you learn the trade?", a:"North, where the iron comes out of the ground angry. Down here the ore's lazy but the customers are motivated." },
    ] },
  maesa: { id:"maesa", name:"Old Maesa", role:"vendor", stock:"herbs",
    pal:{ armor:"#4a4438", trim:"#6a8a5a", skin:"#b89a80", cloth:"#3a4438", hair:"#cccccc" },
    voice:{ pitch: 235, formant: 1300, rate: 7 },
    greet:["Drink slowly. Or don't, the way things are going.","I can smell the crypt on you, dear.","Potions, scrolls, and unwanted advice."],
    talk:[
      { q:"What do you hear at night?", a:"Singing, dear. From the south, where the old chapel fell. The dead don't sing, you understand — something sings TO them. That's worse." },
      { q:"How do your draughts work?", a:"Honestly? Half herbcraft, half stubbornness. The red ones knit flesh, the blue ones feed whatever it is you casters burn. The Cinder Tonic does both, and asks no questions." },
      { q:"Were you born here?", a:"Born? No. Stranded, married, widowed, and rooted — in that order. The Marches keep whoever stops walking." },
    ] },
  /* ---- townsfolk ---- */
  brom: { id:"brom", name:"Guardsman Brom", role:"villager",
    pal:{ armor:"#4e4a42", trim:"#6a5a30", skin:"#b08a6a", cloth:"#3a342c", hair:"#4a3a28" },
    voice:{ pitch: 112, formant: 700, rate: 6 },
    greet:["Gate's behind me. Stays that way.","You hear something out there? ...Never mind.","Captain says watch the road. I watch the road."],
    talk:[
      { q:"Long shift?", a:"Eleven years, give or take a nap. The trick is to count the gravestones you can see. If the number changes, ring the bell." },
      { q:"Scared?", a:"Of the dead? No. They're slow and they don't take wages. It's the singing ones that put a stone in my boot." },
    ] },
  lysa: { id:"lysa", name:"Widow Lysa", role:"villager", wander:true,
    pal:{ armor:"#4a3e44", trim:"#7a6a78", skin:"#c8a088", cloth:"#3a3038", hair:"#2a2024" },
    voice:{ pitch: 205, formant: 1150, rate: 7.5 },
    greet:["Mind the well after dark.","You walk like my Tomas did. Heavy on the left.","The bread's better on market days. We don't have market days."],
    talk:[
      { q:"Who was Tomas?", a:"Wall-guard, third watch. He's in the burial ground now — and thanks to people like you, he's STAYED there all winter. That's the kindest thing anyone's done for me." },
      { q:"Why stay in Cinderwatch?", a:"And go where? The roads belong to the dead and the fields belong to the crows. At least here the walls are honest about what they're for." },
    ] },
  pip: { id:"pip", name:"Pip", role:"villager", wander:true,
    pal:{ armor:"#5a4a34", trim:"#8a6a3a", skin:"#caa183", cloth:"#46382a", hair:"#7a4a22" },
    voice:{ pitch: 330, formant: 1600, rate: 11 },
    greet:["Are you the one who fights things?! Can I see the sword?!","I found a coin in the well. Then I put it back. It looked at me.","Maesa says I'm not allowed near your potions anymore."],
    talk:[
      { q:"Shouldn't you be indoors?", a:"Indoors is BORING. Anyway I'm the lookout. Brom said if I see anything with too many arms I should scream. I have a really good scream." },
      { q:"What did the coin look like?", a:"Old. Green. It had a face on it, and the face was the wrong way up no matter how you turned it. Brom threw it over the wall and now he won't talk about it." },
    ] },
  hask: { id:"hask", name:"Drover Hask", role:"villager",
    pal:{ armor:"#56503e", trim:"#4a3a2a", skin:"#a8886a", cloth:"#3c362c", hair:"#5a5248" },
    voice:{ pitch: 135, formant: 800, rate: 6.5 },
    greet:["Cart's not for hire. Cart's not moving. Cart stays.","Roads used to go somewhere, you know.","If you're headed north, take a second pair of boots."],
    talk:[
      { q:"What happened to your ox?", a:"Ate something in the Blackbough that didn't agree with him. Then he didn't agree with ME, and now there's a cart and no ox and we don't talk about Henrik." },
      { q:"Where did the roads go?", a:"South to the river ports, east to the abbey towns. Now? The fields road ends at a crypt and the north road ends at a monastery that locked its own doors. Make of that what you will." },
    ] },
  /* the notice board "speaks" in pinned parchment */
  board: { id:"board", name:"the notice board", role:"board", voice:{ pitch: 60, formant: 400, rate: 4 }, greet:[] },

  /* ---- generic wandering villagers (placed per-hub via cfg.style.villagers; reusable, drift about) ---- */
  villager_fisher: { id:"villager_fisher", name:"a fisher", role:"villager", wander:true,
    pal:{ armor:"#46504a", trim:"#6a7a5a", skin:"#bfa088", cloth:"#3a4a3e", hair:"#4a4238" },
    voice:{ pitch: 150, formant: 880, rate: 6.5 },
    greet:["Nets come up empty. Water's too still.","Caught nothing but a boot and a bad feeling.","Mind the reeds — some nights they grab back."],
    talk:[{ q:"How's the fishing?", a:"Used to be eels thick as my arm. Now the lines come up cut clean, like something down there's tidy about it." }] },
  villager_smith: { id:"villager_smith", name:"a smith's hand", role:"villager", wander:true,
    pal:{ armor:"#5a4a3a", trim:"#3a3a3a", skin:"#a8826a", cloth:"#33302c", hair:"#2a1f18" },
    voice:{ pitch: 105, formant: 680, rate: 6 },
    greet:["Bellows won't pump themselves.","Hot work. Honest work.","Watch the sparks, friend."],
    talk:[{ q:"Busy at the forge?", a:"Always. Folk break more steel running than fighting these days. I just keep the coals fed." }] },
  villager_refugee: { id:"villager_refugee", name:"a refugee", role:"villager", wander:true,
    pal:{ armor:"#4a4038", trim:"#6a5a48", skin:"#c0a088", cloth:"#3c342c", hair:"#3a3028" },
    voice:{ pitch: 195, formant: 1080, rate: 7 },
    greet:["We walked here from somewhere worse.","Spare nothing? That's alright. Most don't.","The walls hold. That's enough for today."],
    talk:[{ q:"Where are you from?", a:"A village with no name left worth saying. We followed the road till it found walls. Now we wait, and we're good at it." }] },
  villager_digger: { id:"villager_digger", name:"a digger", role:"villager", wander:true,
    pal:{ armor:"#6a5a3e", trim:"#8a6a3a", skin:"#b8906a", cloth:"#4a3c28", hair:"#5a4630" },
    voice:{ pitch: 128, formant: 760, rate: 6.5 },
    greet:["Sand gets everywhere. EVERYWHERE.","We dig down. Things dig up. We meet in the middle.","Found a door yesterday. Wish we hadn't."],
    talk:[{ q:"What are you digging for?", a:"Whatever the diggers before us were digging for. Nobody asks anymore. The pay's in water, and water's enough." }] },
  villager_soldier: { id:"villager_soldier", name:"an off-duty soldier", role:"villager", wander:true,
    pal:{ armor:"#4e4a42", trim:"#7a3a30", skin:"#b08a6a", cloth:"#33302a", hair:"#3a2e22" },
    voice:{ pitch: 118, formant: 720, rate: 6 },
    greet:["At ease. I'm off the wall till dawn.","You fight? Good. We're short.","Sharpen it twice. You'll forget the second time when it counts."],
    talk:[{ q:"How's the watch?", a:"Quiet, which is the worst kind. Quiet means they're deciding something. I'd rather they just came." }] },
  villager_child: { id:"villager_child", name:"a camp child", role:"villager", wander:true,
    pal:{ armor:"#5a4a34", trim:"#8a6a3a", skin:"#caa183", cloth:"#46382a", hair:"#7a4a22" },
    voice:{ pitch: 320, formant: 1580, rate: 11 },
    greet:["Are you a HERO? You LOOK like one. Mostly.","I'm not s'posed to go past the well.","I saw a ghost. Maybe. It was a goat. But MAYBE."],
    talk:[{ q:"Shouldn't you be inside?", a:"Inside is where the boring is. Out here I'm the lookout. I've got a really loud whistle and everything." }] },

  /* ---- ACT II: Frosthaven ---- */
  sera: { id:"sera", name:"Warden-Aspect Seraneth", role:"quest",
    pal:{ armor:"#c8c4b8", trim:"#80a0c0", skin:"#d0c0b0", cloth:"#5a6878", hair:"#e8e4d0" },
    voice:{ pitch: 165, formant: 980, rate: 8 },
    greet:["You came through the light and lived. Few did.","I am... less than I was. The Sunderstone took something.","Keep moving. The North is not done with you."],
    talk:[
      { q:"What happened beneath the mountain?", a:"The Render fell beneath Mount Karrhal. Then the Sunderstone broke. We thought the war was over. You have seen what followed." },
      { q:"What was the Sunderstone?", a:"A lock, not a wall — and we mistook it for a wall. When it shattered, we did not free the Waking World. We unsealed everything it had been holding down. Including me, it seems. Including worse." },
      { q:"What are the Embershards?", a:"Splinters of the stone, raining down still. Where they land, the dead dream of their old lives and the living forget theirs. Someone is gathering the largest of them and carrying them south." },
      { q:"What happened to you?", a:"I hurled the blade. The light unmade the corruption — and frayed me with it. I am here, and I am not. Do not rely on me to be whole. Or to be only myself." },
      { q:"Your blade?", a:"I hurled it to break the lock, and it broke with the lock. Its shards fell where the largest Embershards fell. If you ever find pieces of it — bring them to me. A Warden without her blade is only half a warning." },
    ] },
  bryn: { id:"bryn", name:"Bryn the Survivor", role:"quest",
    pal:{ armor:"#5a5246", trim:"#7a5a30", skin:"#c0987a", cloth:"#3a342a", hair:"#3a2a1a" },
    voice:{ pitch: 130, formant: 760, rate: 7 },
    greet:["They came back. Our own dead — begging us to end them.","The mines took half of Frosthaven.","Don't listen to what hums beneath the mountain. I did. Once."],
    talk:[
      { q:"What happened here?", a:"The Render's invasion killed our warriors. Then the stone broke, and they... got up. But they're not mindless. My brother knew my name. Asked me to let him go. So I did." },
      { q:"What's in the mines?", a:"Survivors, if any are left. They went down to hide and the shards followed them. Bring back who you can. Don't bring back what isn't them." },
    ] },
  opening_mara: { id:"opening_mara", name:"Mara", role:"resident", pal:{cloth:"#657780",skin:"#c0987a"},
    greet:["We would still be out there without you."], talk:[{q:"Are you both all right?",a:"Iven can feel his hands again. That is enough for tonight."}] },
  opening_iven: { id:"opening_iven", name:"Iven", role:"resident", pal:{cloth:"#725c4b",skin:"#b58c70"},
    greet:["A roof. A fire. I had forgotten what hope looked like."], talk:[{q:"What happened to your caravan?",a:"The watch captain ordered us toward the wall. By the time we reached him, he no longer knew us."}] },
  hewn: { id:"hewn", name:"Hewn the Frostsmith", role:"vendor", stock:"arms",
    pal:{ armor:"#5a5a5e", trim:"#3a3a3e", skin:"#a88468", cloth:"#2e2e30", hair:"#1a1410" },
    voice:{ pitch: 96, formant: 640, rate: 6 },
    greet:["Steel's the only thing the cold doesn't ruin.","Buying? My forge runs whether you do or not.","Frosthaven's got two exports left: me, and trouble."],
    talk:[
      { q:"Can you mend my gear?", a:"I sell, I socket, I don't do charity. Bring coin and a broken edge and we'll talk. The altar behind me does the strange work — glyphs, reforging. I just keep it lit." },
      { q:"How bad is it out there?", a:"Worse weekly. The dead used to stay buried under Karrhal. Now they get up remembering their own names. A man shouldn't have to kill his own sergeant twice." },
    ] },
  wenna: { id:"wenna", name:"Quartermaster Wenna", role:"vendor", stock:"herbs",
    pal:{ armor:"#4a4a40", trim:"#7a6a40", skin:"#c0a080", cloth:"#3a3830", hair:"#8a8276" },
    voice:{ pitch: 210, formant: 1180, rate: 8 },
    greet:["Draughts, scrolls, and what's left of the larder.","Drink before the fight, not after. After is for the lucky.","Take a scroll of passage. Frosthaven's worth coming back to. Barely."],
    talk:[
      { q:"What do you have?", a:"Healing and aether draughts, scrolls of passage and insight. Ration tonics when the hunters bring something down. It's not much, but it's kept this camp breathing." },
      { q:"Who's the pale one by the fire?", a:"Calls herself Seraneth. Walked out of the light the day the mountain broke and hasn't been quite solid since. Listen to her anyway. She knows things none of us should." },
    ] },
  /* ---- ACT II: Greywater Landing ---- */
  oris: { id:"oris", name:"Ferryman Oris", role:"quest",
    pal:{ armor:"#46504a", trim:"#5a7a68", skin:"#a8927a", cloth:"#2e3a32", hair:"#4a4438" },
    voice:{ pitch: 108, formant: 700, rate: 6 },
    greet:["Keep your voice. Out here, that's wealth.","They walk into the water smiling. I've stopped counting.","The marsh is older than the shards. They just woke it up."],
    talk:[
      { q:"What is the Quieting?", a:"First words fail you. Then dreams. Then even fear. Then one morning you walk into the marsh and you don't come back, and you're smiling the whole way. The Silent Choir calls it a mercy." },
      { q:"Who are the Silent Choir?", a:"A cult, if you can call something a cult when it doesn't speak. They sew their own mouths shut and they're building something under the old monastery. Carrying a shard toward it." },
    ] },
  /* ---- ACT III: The Dig Camp ---- */
  edran: { id:"edran", name:"Archivist Edran Vael", role:"quest",
    pal:{ armor:"#4a4438", trim:"#8a7444", skin:"#c8b09a", cloth:"#3a352c", hair:"#d8d4cc" },
    voice:{ pitch: 122, formant: 820, rate: 6 },
    greet:["Fascinating and horrifying, in equal measure. Stay a moment.","These symbols — I have seen them, in books that should have burned.","The dead city is awake. That is not a metaphor."],
    talk:[
      { q:"What is this place?", a:"Khal-Zahir. Struck from every history I know — and I know nearly all of them. Its rulers tried to speak with the Burning Hells. The Hells answered. The city was buried so the rest of us could pretend it hadn't happened." },
      { q:"What do the symbols mean?", a:"They tie the Embershards to the Render's forgotten experiments. He was not building a weapon — he was forging a KEY, and the Sunderstone was the lock it was cut for. I fear we have handed that key to someone very patient." },
      { q:"Who is gathering the shards?", a:"A dead man with a borrowed crown calls himself the Hollow King. But Malthoron is a tool, Archivist's instinct tells me. Tools have hands. I should very much like to know whose." },
    ] },
  /* ---- ACT V: The Breach ---- */
  vael: { id:"vael", name:"The Last Watchman", role:"quest",
    pal:{ armor:"#5a3a34", trim:"#a05030", skin:"#b08a72", cloth:"#3a221c", hair:"#2a1a14" },
    voice:{ pitch: 116, formant: 740, rate: 6 },
    greet:["No one comes back through the Breach. You will be the first, or the last.","The demons here fight each other as often as us. Small mercies.","Whatever's on the throne — it was never Malthoron giving the orders."],
    talk:[
      { q:"Where are we?", a:"Past the edge of the Waking World, where Hell built a kingdom from its own ruins. The shards were dragged here to forge one thing out of many — a core something means to carry home. We stand on the wrong side of that door." },
      { q:"Who's really behind this?", a:"Not the Hollow King — he only ever gathered. Whatever sits the throne let Malthoron pile the shards in one place, then took them. It wears faces. Down here the thing wearing a friend's face is never the friend. It will sound like someone you trust. It will not be." },
    ] },
  /* ---- the war-caravan: travelling vendors who follow the front into every camp ---- */
  sutler_smith: { id:"sutler_smith", name:"Sutler Vannick", role:"vendor", stock:"arms",
    pal:{ armor:"#5a5046", trim:"#7a5a30", skin:"#a8826a", cloth:"#34302a", hair:"#2a2018" },
    voice:{ pitch: 100, formant: 660, rate: 6 },
    greet:["The caravan goes where the dying do. Good for business, bad for sleep.","Steel, sockets, and no questions. What'll it be?","Bought this stock off three dead armies. They won't mind."],
    talk:[
      { q:"You follow the fighting?", a:"Where else? A smith needs broken men and full purses, and your war provides both. The altar travels with me — glyphs, reforging, the strange work. Lay your goods on it and strike." },
      { q:"How's trade?", a:"Grim as the weather and twice as steady. Every camp you light, I set up shop. Keep clearing the road and we'll both get rich or dead." },
    ] },
  sutler_quarter: { id:"sutler_quarter", name:"Sutler Maud", role:"vendor", stock:"herbs",
    pal:{ armor:"#4a4a40", trim:"#7a6a40", skin:"#c0a080", cloth:"#3a3830", hair:"#9a9286" },
    voice:{ pitch: 206, formant: 1160, rate: 8 },
    greet:["Draughts and scrolls, love. Drink before, not after.","I've buried more customers than I've kept. Don't be one.","Passage scrolls in stock — always keep a way home.","Stock's thin this far out, but it's real."],
    talk:[
      { q:"What have you got?", a:"Healing and aether by the bottle, scrolls of passage and insight, a tonic if the hunters brought one down. Same wares, every camp — I just charge more the deeper we go. Hazard pay." },
      { q:"You're not afraid out here?", a:"Terrified, dear. That's why I sell the potions instead of needing them. Now — buying, or just keeping an old woman company?" },
    ] },
  /* ---- rescuable survivors (the Abandoned Mines) — click to free them ---- */
  surv_miner: { id:"surv_miner", name:"Trapped Miner", role:"survivor",
    pal:{ armor:"#5a4a38", trim:"#3a2e22", skin:"#b89070", cloth:"#4a3c2c", hair:"#3a2c1c" },
    voice:{ pitch: 128, formant: 760, rate: 7 },
    rescue:["You came — gods, someone actually came. I'll run for the surface; don't let them follow!","I thought I'd die in the dark down here. Bless you, stranger.","The light — you brought the light. I can make the gate from here. Go, go!"] },
  surv_woman: { id:"surv_woman", name:"Frightened Townswoman", role:"survivor",
    pal:{ armor:"#4a3e44", trim:"#7a6a78", skin:"#c8a088", cloth:"#3a3038", hair:"#2a2024" },
    voice:{ pitch: 218, formant: 1180, rate: 8 },
    rescue:["Is it — are you real? Not one of them?  ...Then take me up, please, please.","My children made it to the camp. I stayed to hold the door. Now I can finally let go of it.","I won't look back at the dark. I won't. Lead and I'll follow."] },
  surv_watch: { id:"surv_watch", name:"Wounded Watchman", role:"survivor",
    pal:{ armor:"#4e4a42", trim:"#6a5a30", skin:"#a8826a", cloth:"#33302a", hair:"#4a3a28" },
    voice:{ pitch: 110, formant: 700, rate: 6 },
    rescue:["Took an axe to the leg holding this tunnel. Worth it, if you're getting the others out too.","Don't waste tears on me — just get me where I can hold a spear again.","Frosthaven still stands? Then I've something left to guard. Up we go."] },
  surv_elder: { id:"surv_elder", name:"Old Delver", role:"survivor",
    pal:{ armor:"#48443a", trim:"#5a4a30", skin:"#bca890", cloth:"#34302a", hair:"#cccccc" },
    voice:{ pitch: 150, formant: 880, rate: 5.5 },
    rescue:["Forty years in these cuts and they nearly became my grave. Thank you, child.","I heard it singing under the rock. Don't listen, whatever you do. Now — out.","Old bones, but they'll carry me to the gate. After you."] },
  /* a survivor you pulled from the mines — now back in Frosthaven, and terrified ---- */
  freed: { id:"freed", name:"Halvar, Freed from the Mines", role:"quest",
    pal:{ armor:"#5a4a38", trim:"#7a5a30", skin:"#b89070", cloth:"#3a342c", hair:"#4a3a26" },
    voice:{ pitch: 134, formant: 770, rate: 7 },
    greet:["You got me out. So listen — please, listen.","I saw him. Down where the rock glows. Korvath. He's UP.","Don't go to the temple yet. You'll die at the light."],
    talk:[
      { q:"What did you see down there?", a:"Korvath, the Oathbreaker — our own war-commander, dead these ten years. A shard's got him, and he thinks every living soul's a demon wearing skin. He's sealed himself in the Shattered Temple behind a wall of light. No blade touches it." },
      { q:"How do I lower the barrier?", a:"Three beacons. Out in the North, pulsing that same sick green. They feed the wall. Smash all three — but they'll keep spitting up the dead the whole time. And when the last one dies... his Oathsworn will come. Three of them. Champions, in life. Worse, now." },
      { q:"The Oathsworn?", a:"His honor-guard. One hurls axes faster than you can flinch. One drops from the sky with a polearm. One swings a sword the length of a man and spins through whole shield-walls. Kill all three and the temple opens. Don't kill all three and... well. Don't lose." },
    ] },
};
DATA.SURVIVOR_IDS = ["surv_miner", "surv_woman", "surv_watch", "surv_elder"];

/* =====================  ZONES  ===================== */
// fixedMusic preserves the first outdoor area's theme outside each town.
// Towns/camps keep their own music; other zones use the exploration pool.
DATA.ZONES = {
  town:   { id:"town",   name:"Cinderwatch",        kind:"town",   theme:"town",   dark:0.42, lvl:0, music:"town" },
  fields: { id:"fields", fixedMusic:true, name:"The Ashen Fields",   kind:"wild",   theme:"fields", dark:0.55, lvl:2, music:"wild",
            spawns:["risen","bone_archer","grave_hound","cult_acolyte"], density:0.012 },
  crypt1: { id:"crypt1", name:"Sunken Crypt — Hollows", kind:"dungeon", theme:"crypt", dark:0.74, lvl:4, music:"dungeon",
            spawns:["risen","bone_archer","crypt_widow","cult_acolyte","tomb_husk"], boss:"gravecaller" },
  crypt2: { id:"crypt2", name:"Sunken Crypt — The Vigil", kind:"dungeon", theme:"vigil", dark:0.78, lvl:6, music:"dungeon",
            spawns:["risen","tomb_husk","fallen_blade","crypt_widow","bone_archer"], boss:"morthul" },
  chapel: { id:"chapel", name:"The Ruined Chapel", kind:"dungeon", theme:"chapel", dark:0.72, lvl:5, music:"dungeon",
            spawns:["cult_acolyte","cult_zealot","risen","fallen_blade"], boss:"vicar" },
  forest: { id:"forest", name:"The Blackbough", kind:"wild", theme:"forest", dark:0.64, lvl:6, music:"wild",
            spawns:["grave_hound","blight_wasp","fen_stalker","thorn_shambler","cult_zealot"], density:0.014 },
  monastery1: { id:"monastery1", name:"Greymonastery — Cloister", kind:"dungeon", theme:"monastery", dark:0.72, lvl:8, music:"dungeon",
            spawns:["fallen_blade","cult_zealot","cult_acolyte","gloom_shade","tomb_husk"] },
  monastery2: { id:"monastery2", name:"Greymonastery — Sanctum", kind:"dungeon", theme:"monastery", dark:0.76, lvl:9, music:"dungeon",
            spawns:["fallen_blade","gloom_shade","cult_zealot","blight_wasp","tomb_husk"], boss:"vellath" },

  /* ===== ACT I — The Fallen North (the game begins here) ===== */
  frosthaven_approach: { id:"frosthaven_approach", artZone:"north_wild", name:"The Road to Frosthaven", kind:"wild", theme:"snowwild", dark:0.53, lvl:1,
    fixedMusic:true, musicTrack:"fallenNorth", music:"wild", opening:true, spawns:[] },
  frosthaven: { id:"frosthaven", musicTrack:"frosthaven", name:"Frosthaven", kind:"camp", theme:"snowwild", dark:0.40, lvl:1, music:"town", home:true },
  north_wild: { id:"north_wild", fixedMusic:true, musicTrack:"fallenNorth", name:"The Fallen North", kind:"wild", theme:"snowwild", dark:0.48, lvl:2, music:"wild",
            spawns:["frost_risen","frost_archer","ice_lurker","shard_thrall"] },
  mines: { id:"mines", musicTrack:"fallenNorth", name:"The Abandoned Mines", kind:"dungeon", theme:"mine", dark:0.80, lvl:3, music:"dungeon",
            spawns:["frost_risen","ice_lurker","shard_thrall","barb_guard"] },
  shattered_temple: { id:"shattered_temple", musicTrack:"fallenNorth", name:"The Shattered Temple", kind:"dungeon", theme:"temple", dark:0.74, lvl:5, music:"dungeon",
            spawns:["frost_risen","frost_archer","barb_guard","shard_thrall"], boss:"korvath" },

  /* ===== ACT II — The Weeping Marsh ===== */
  marshcamp: { id:"marshcamp", musicTrack:"marshTown", name:"Greywater Landing", kind:"camp", theme:"marsh", dark:0.46, lvl:11, music:"town" },
  weeping_marsh: { id:"weeping_marsh", fixedMusic:true, musicTrack:"marsh", name:"The Weeping Marsh", kind:"wild", theme:"marsh", dark:0.56, lvl:12, music:"wild",
            spawns:["drowned_dead","bog_bloat","marsh_wretch","silent_cultist"] },
  drowned_crypt: { id:"drowned_crypt", musicTrack:"marsh", name:"Abandoned Monastery — Flooded Crypts", kind:"dungeon", theme:"drowned", dark:0.82, lvl:12, music:"dungeon",
            spawns:["drowned_dead","bog_bloat","marsh_wretch","lure_child"] },
  ritual_site: { id:"ritual_site", musicTrack:"marsh", name:"The Choir's Ritual", kind:"dungeon", theme:"drowned", dark:0.78, lvl:14, music:"dungeon",
            spawns:["silent_cultist","drowned_dead","lure_child","bog_bloat"], boss:"mire_mother" },
  /* ---- optional side-quest sub-zones (Acts I–III) ---- */
  shardpeak_shrine: { id:"shardpeak_shrine", musicTrack:"fallenNorth", name:"The Shardpeak Shrine", kind:"dungeon", theme:"snowwild", dark:0.52, lvl:3, music:"dungeon",
            spawns:["frost_risen","frost_archer","ice_lurker","shard_sentinel","rimebound_guardian"] },
  deepfreeze_cavern: { id:"deepfreeze_cavern", musicTrack:"fallenNorth", name:"The Deepfreeze Caverns", kind:"dungeon", theme:"icecave", dark:0.58, lvl:4, music:"dungeon",
            spawns:["frost_risen","ice_lurker","shard_thrall","shatter_wasp","glacial_crawler"], boss:"hoarfang" },
  hollow_reeds: { id:"hollow_reeds", musicTrack:"marsh", name:"The Hollow Reeds", kind:"dungeon", theme:"marsh", dark:0.62, lvl:12, music:"dungeon",
            spawns:["drowned_dead","bog_bloat","song_thrall","choir_herald"] },
  spawn_pools: { id:"spawn_pools", musicTrack:"marsh", name:"The Spawn Pools", kind:"dungeon", theme:"drowned", dark:0.85, lvl:13, music:"dungeon",
            spawns:["drowned_dead","silent_cultist","marsh_larvae","brood_mother"], boss:"brood_mother" },
  shard_flats: { id:"shard_flats", musicTrack:"desert", name:"The Shard Flats", kind:"dungeon", theme:"desert", dark:0.44, lvl:15, music:"dungeon",
            spawns:["sand_raider","dune_shade","gilt_construct","shard_construct","crystal_marauder"] },
  tomb_sanctum: { id:"tomb_sanctum", musicTrack:"desert", name:"Tomb of the Chained Sovereign", kind:"dungeon", theme:"tombs", dark:0.8, lvl:16, music:"dungeon",
            spawns:["tomb_guard","soul_chained","gilt_construct","gilded_thrall","prisoned_shade"], boss:"chained_sovereign" },

  /* ===== ACT III — The City Beneath the Sand ===== */
  khalcamp: { id:"khalcamp", musicTrack:"desertTown", name:"The Dig Camp", kind:"camp", theme:"desert", dark:0.42, lvl:14, music:"town" },
  desert_wastes: { id:"desert_wastes", fixedMusic:true, musicTrack:"desert", name:"The Shifting Wastes", kind:"wild", theme:"desert", dark:0.46, lvl:15, music:"wild",
            spawns:["sand_raider","tomb_guard","dune_shade","soul_chained"] },
  sand_tombs: { id:"sand_tombs", musicTrack:"desert", name:"The Shifting Tombs", shifting:true, kind:"dungeon", theme:"tombs", dark:0.78, lvl:15, music:"dungeon",
            spawns:["tomb_guard","soul_chained","sand_raider","gilt_construct"] },
  underground_market: { id:"underground_market", artZone:"khal_palace", name:"Khal-Zahir — Underground Market", kind:"dungeon", theme:"palace", dark:0.68, lvl:15, music:"dungeon", spawns:["gilt_construct","sand_raider","soul_chained"] },
  khal_palace: { id:"khal_palace", musicTrack:"desert", name:"Palace of Khal-Zahir", kind:"dungeon", theme:"palace", dark:0.74, lvl:17, music:"dungeon",
            spawns:["tomb_guard","gilt_construct","dune_shade","soul_chained"], boss:"azram" },

  /* ===== ACT IV — The Shattered Cathedral ===== */
  cathedral1: { id:"cathedral1", musicTrack:"cathedral", name:"The Shattered Cathedral", kind:"dungeon", theme:"cathedral", dark:0.78, lvl:18, music:"dungeon",
            spawns:["hollow_knight","choir_priest","soul_eater","memory_wraith"], boss:"empty_archangel", shifting:true },
  cathedral2: { id:"cathedral2", musicTrack:"cathedral", name:"The Cathedral Heart", kind:"dungeon", theme:"cathedral", dark:0.80, lvl:20, music:"dungeon",
            spawns:["hollow_knight","choir_priest","memory_wraith","soul_eater"], boss:"malthoron", shifting:true },

  /* ===== ACT V — The Throne of Cinders ===== */
  hellgate: { id:"hellgate", musicTrack:"breach", name:"The Breach", kind:"camp", theme:"hellwild", dark:0.50, lvl:20, music:"town" },
  ash_wastes: { id:"ash_wastes", fixedMusic:true, musicTrack:"cinders", name:"The Cinderfields", kind:"wild", theme:"hellwild", dark:0.58, lvl:21, music:"wild",
            spawns:["ash_fiend","cinder_hound","impaler","pit_brute"], infight:true },
  cinder_bastion: { id:"cinder_bastion", musicTrack:"cinders", name:"The Cinder Bastion", kind:"dungeon", theme:"bastion", dark:0.76, lvl:22, music:"dungeon",
            spawns:["ash_fiend","impaler","pit_brute","wretch_lord"], infight:true },
  throne: { id:"throne", musicTrack:"cinders", name:"The Throne of Cinders", kind:"dungeon", theme:"throne", dark:0.74, lvl:25, music:"dungeon",
            spawns:["wretch_lord","pit_brute","impaler","cinder_hound"], boss:"vethriss" },
};

/* =====================  ACTS (saga progression)  =====================
   Each act unlocks the next on boss kill; camps are reachable from the
   previous act's boss room and via any attuned travel shrine. */
DATA.ACTS = [
  { id:1, rn:"I",  name:"The Fallen North",  camp:"frosthaven",  boss:"korvath",        next:"marshcamp",  intro:["THE FALLEN NORTH","Frosthaven — Act I"],
    zones:["frosthaven","north_wild","mines","shattered_temple"] },
  { id:2, rn:"II", name:"The Weeping Marsh", camp:"marshcamp",   boss:"mire_mother",    next:"khalcamp",   intro:["THE WEEPING MARSH","Greywater Landing — Act II"],
    zones:["marshcamp","weeping_marsh","drowned_crypt","ritual_site"] },
  { id:3, rn:"III",name:"The City Beneath the Sand", camp:"khalcamp", boss:"azram",     next:"cathedral1", intro:["THE CITY BENEATH THE SAND","Khal-Zahir — Act III"],
    zones:["khalcamp","desert_wastes","underground_market","sand_tombs","khal_palace"] },
  { id:4, rn:"IV", name:"The Shattered Cathedral", camp:"cathedral1", boss:"malthoron", next:"hellgate",   intro:["THE SHATTERED CATHEDRAL","The Drifting Cathedral — Act IV"],
    zones:["cathedral1","cathedral2"] },
  { id:5, rn:"V",  name:"The Throne of Cinders", camp:"hellgate",  boss:"vethriss",     next:null,         intro:["THE THRONE OF CINDERS","The Burning Hells — Act V"],
    zones:["hellgate","ash_wastes","cinder_bastion","throne"] },
];
/* the Ashen Marches (Cinderwatch) is an optional lower region reached by waystone */
DATA.OPTIONAL_ACT = { rn:"✦", name:"The Ashen Marches (optional)", zones:["town","fields","crypt1","crypt2","chapel","forest","monastery1","monastery2"] };

/* =====================  TERRAIN HAZARDS  =====================
   Walkable-but-dangerous tiles painted into a per-tile m.hazard channel by the
   generators. Code 0 = none. Players and grounded companions read the tile
   underfoot each frame (Entity.tileHazardTick). Monsters ignore
   map hazards; player combat fields and traps still affect them. Colors echo the
   GF_COL groundfield palette so hazards read like effects players already know. */
DATA.HAZARDS = {
  1: { id:"ice",       name:"Frozen Ice", slow:45, dps:0,  elem:null,     col:"#9fd8ff", fx:"#cfe6ff" },
  2: { id:"bog",       name:"Bog Pit",    slow:35, dps:7,  elem:"poison", col:"#5a7a3a", fx:"#90ff70" },
  3: { id:"lava",      name:"Lava",       slow:25, dps:26, elem:"fire",   col:"#ff7a20", fx:"#ffb050" },
  4: { id:"quicksand", name:"Quicksand",  slow:70, dps:4,  elem:null,     col:"#9a824e", fx:"#c8a060" },
  5: { id:"spore",     name:"Spore Bed",  slow:20, dps:5,  elem:"poison", col:"#b8d870", fx:"#b8ff90" },
  6: { id:"scorch",    name:"Scorched",   slow:0,  dps:9,  elem:"fire",   col:"#c0502a", fx:"#ff9040" },
  7: { id:"blood",     name:"Blood Mire", slow:30, dps:6,  elem:"poison", col:"#7a1a1a", fx:"#c04040" },
  8: { id:"static",    name:"Charged",    slow:0,  dps:11, elem:"light",  col:"#fff080", fx:"#ffffa0" },
  9: { id:"spring",    name:"Frozen Spring", slow:0, dps:0, elem:null,    col:"#7fe0e8", fx:"#bff4f8" },
};
DATA.HAZARD_BY_ID = {}; for (const _k in DATA.HAZARDS) DATA.HAZARD_BY_ID[DATA.HAZARDS[_k].id] = +_k;

/* =====================  BIOME GENERATION CONFIG  =====================
   Per-theme generation flavour: which terrain hazard to clump in, and which
   macro-layout silhouettes a wild may roll (so biomes/visits stop feeling same).
   Only procedural generators read this; town & camps have no entry -> unchanged. */
/* elev: v2 terraced landforms — style shelves (broad stepped terraces), mesa (sheer
   flat-tops rising from open flats), hummock (mostly-flat wetland with raised islands).
   cell = noise feature size in tiles (bigger = broader landmasses). */
DATA.BIOMES = {
  fields:    { hazard:{ id:"bog",       blobs:3, rad:[2,4] }, macro:["plain","basin","cluster"], elev:{ maxH:1, style:"shelves", cell:14 } },
  forest:    { hazard:{ id:"spore",     blobs:5, rad:[2,4] }, macro:["plain","cluster"], elev:{ maxH:1, style:"hummock", cell:12 } },
  snowwild:  { hazard:{ id:"ice",       blobs:4, rad:[3,6] }, macro:["plain","basin","ravine"], elev:{ maxH:3, style:"shelves", cell:11 } },
  marsh:     { hazard:{ id:"bog",       blobs:6, rad:[2,5] }, macro:["basin","plain","cluster"], elev:{ maxH:1, style:"hummock", cell:9 } },
  desert:    { hazard:{ id:"quicksand", blobs:4, rad:[2,4] }, macro:["plain","ravine","cluster"], elev:{ maxH:2, style:"mesa", cell:13 } },
  hellwild:  { hazard:{ id:"lava",      blobs:5, rad:[2,5], scorchRing:true }, macro:["ravine","plain","basin"], elev:{ maxH:2, style:"shelves", cell:9 } },
  crypt:     { hazard:{ id:"blood",     blobs:3, rad:[2,3] } },
  vigil:     { hazard:{ id:"blood",     blobs:3, rad:[2,3] } },
  chapel:    { hazard:{ id:"blood",     blobs:2, rad:[2,3] } },
  monastery: { hazard:{ id:"spore",     blobs:3, rad:[2,3] } },
  mine:      { hazard:{ id:"ice",       blobs:3, rad:[2,4] } },
  temple:    { hazard:{ id:"ice",       blobs:3, rad:[2,3] } },
  drowned:   { hazard:{ id:"bog",       blobs:4, rad:[2,4] } },
  tombs:     { hazard:{ id:"quicksand", blobs:3, rad:[2,4] } },
  palace:    { hazard:{ id:"scorch",    blobs:2, rad:[2,3] } },
  cathedral: { hazard:{ id:"static",    blobs:2, rad:[2,3] } },
  bastion:   { hazard:{ id:"lava",      blobs:4, rad:[2,4], scorchRing:true } },
  throne:    { hazard:{ id:"lava",      blobs:3, rad:[2,4], scorchRing:true } },
};

/* =====================  DIFFICULTY TIERS  ===================== */
DATA.DIFFICULTIES = [
  { id: 0, name: "Normal",    hpMul: 1,   dmgMul: 1,   lvlAdd: 0,  xpMul: 1,   resAdd: 0,  eliteBoost: 0 },
  { id: 1, name: "Nightmare", hpMul: 2.4, dmgMul: 1.6, lvlAdd: 7,  xpMul: 2.6, resAdd: 20, eliteBoost: 0.08 },
  { id: 2, name: "Torment",   hpMul: 4.8, dmgMul: 2.4, lvlAdd: 13, xpMul: 5.5, resAdd: 40, eliteBoost: 0.16 },
];

/* =====================  NAMED GLYPH COMBINATIONS  =====================
   Fill an item's sockets with these glyphs IN THIS ORDER and the item
   becomes a named work with bonus powers on top of the glyphs. */
DATA.GLYPH_COMBOS = [
  { id: "cinderoath", name: "Cinderoath", glyphs: ["g_ember", "g_blood"], side: "wpn",
    stats: { dmgPct: 15, fireDmg: 8 }, flavor: "An oath sworn over a forge, kept in ash." },
  { id: "stormwall", name: "Stormwall", glyphs: ["g_storm", "g_stone"], side: "arm",
    stats: { armorPct: 20, resLight: 15, thorns: 6 }, flavor: "The sky breaks against it." },
  { id: "wolfheart", name: "Wolfheart", glyphs: ["g_blood", "g_fortune", "g_ember"], side: "wpn",
    stats: { lifeSteal: 4, dmgPct: 20, mf: 15 }, flavor: "Hunts well, eats better." },
];

/* =====================  BUILD-TIME SPRITE SOURCE CATALOG  =====================
   These declarations are compiler inputs, not runtime extension points. The
   browser resolves only checked-in entries from DATA.SPRITE_MANIFEST. Run
   tools/build_sprite_assets.py after changing an authored source. */

/* Player-owned summon actors use true eight-direction painted atlases.
   Columns are E, SE, S, SW, W, NW, N, NE. Rows are idle, walk A,
   walk B, attack wind-up, attack impact, death transition, dead. */
DATA.SUMMON_SPRITE_SOURCES = {
  skel_warrior: { src: "assets/summons/skel_warrior.webp", height: 74, tintKey: "bone" },
  skel_mage:    { src: "assets/summons/skel_mage.webp",    height: 76, tintKey: "bone" },
  bone_golem:   { src: "assets/summons/bone_golem.webp",   height: 86 },
  wolf:         { src: "assets/summons/wolf.webp",         height: 58 },
  boar:         { src: "assets/summons/boar.webp",         height: 64 },
  hawk:         { src: "assets/summons/hawk.webp",         height: 60, float: true },
  bear:         { src: "assets/summons/bear.webp",         height: 67 },
  decoy:        { src: "assets/summons/decoy.webp",        height: 72, tauntLoop: true },
};

/* World raster sources are alpha-cleaned, normalized, sliced, and packed into
   committed WebP atlases by the development compiler. */
DATA.WORLD_SPRITE_SOURCES = {
  /* Painted Frosthaven architecture. The development sprite compiler trims
     and normalizes this source into the strict runtime manifest. */
  prop_longhouse: { src: "assets/act1/longhouse.png", fit: 156 },
  prop_beacon: { src: "assets/monsters/beacon.webp", fit: 72 },

  /* Complete hand-painted prop library. Each sprite was generated against the
     longhouse reference, alpha-keyed, tightly trimmed, and is scaled here to
     preserve its intended gameplay footprint. */
  prop_tree:          { src: "assets/world/props/tree.webp", fit: 78 },
  prop_deadtree:      { src: "assets/world/props/deadtree.webp", fit: 70 },
  prop_rock:          { src: "assets/world/props/rock.webp", fit: 52 },
  prop_grave:         { src: "assets/world/props/grave.webp", fit: 32 },
  prop_barrel:        { src: "assets/world/props/barrel.webp", fit: 36 },
  prop_crate:         { src: "assets/world/props/crate.webp", fit: 38 },
  prop_urn:           { src: "assets/world/props/urn.webp", fit: 28 },
  prop_chest:         { src: "assets/world/props/chest.webp", fit: 44 },
  prop_chest_open:    { src: "assets/world/props/chest_open.png", fit: 44 },
  prop_strongbox:     { src: "assets/world/props/strongbox.webp", fit: 50 },
  prop_shrine:        { src: "assets/world/props/shrine.webp", fit: 52 },
  prop_brazier:       { src: "assets/world/props/brazier.webp", fit: 38 },
  prop_pillar:        { src: "assets/world/props/pillar.webp", fit: 38 },
  prop_cryptdoor:     { src: "assets/world/props/cryptdoor.webp", fit: 82 },
  prop_chapelruin:    { src: "assets/world/props/chapelruin.webp", fit: 96 },
  prop_monasterygate: { src: "assets/world/props/monasterygate.webp", fit: 100 },
  prop_stairs:        { src: "assets/world/props/stairs.webp", fit: 66 },
  prop_forge:         { src: "assets/world/props/forge.webp", fit: 56 },
  prop_well:          { src: "assets/world/props/well.webp", fit: 60 },
  prop_stall:         { src: "assets/world/props/stall.webp", fit: 68 },
  prop_cart:          { src: "assets/world/props/cart.webp", fit: 78 },
  prop_board:         { src: "assets/world/props/board.webp", fit: 56 },
  prop_tent:          { src: "assets/world/props/tent.webp", fit: 68 },
  prop_fence:         { src: "assets/world/props/fence.webp", fit: 44 },
  prop_hay:           { src: "assets/world/props/hay.webp", fit: 44 },
  prop_lamppost:      { src: "assets/world/props/lamppost.webp", fit: 34 },
  prop_lantern:       { src: "assets/world/props/lantern.webp", fit: 24 },
  prop_banner:        { src: "assets/world/props/banner.webp", fit: 42 },
  prop_signpost:      { src: "assets/world/props/signpost.webp", fit: 44 },
  prop_woodpile:      { src: "assets/world/props/woodpile.webp", fit: 52 },
  prop_marketgoods:   { src: "assets/world/props/marketgoods.webp", fit: 58 },
  prop_fishnet:       { src: "assets/world/props/fishnet.webp", fit: 50 },
  prop_scaffold:      { src: "assets/world/props/scaffold.webp", fit: 60 },
  prop_stash:         { src: "assets/world/props/stash.webp", fit: 54 },
  prop_embershard:    { src: "assets/world/props/embershard.webp", fit: 48 },
  prop_watchtower:    { src: "assets/world/props/watchtower.webp", fit: 84 },
  prop_cottage:       { src: "assets/world/props/marshcamp_cottage.webp", fit: 132 },
  prop_adobehouse:    { src: "assets/world/settlements/khalcamp_adobehouse.webp", fit: 132 },
  prop_roundhut:      { src: "assets/world/settlements/khalcamp_roundhut.webp", fit: 110 },
  prop_stilthut:      { src: "assets/world/settlements/marshcamp_stilthut.webp", fit: 132 },
  prop_wartent:       { src: "assets/world/settlements/hellgate_wartent.webp", fit: 136 },

  /* Connected wall kit for every non-massif theme. Long paintings provide the
     material/detail layer for grid-aligned faces; square cells are reserved
     for corners and bends so straight runs never repeat tower silhouettes. */
  wall_town:       { src: "assets/world/walls/town.webp", fit: 128 },
  wall_crypt:      { src: "assets/world/walls/crypt.webp", fit: 128 },
  wall_vigil:      { src: "assets/world/walls/vigil.webp", fit: 128 },
  wall_chapel:     { src: "assets/world/walls/chapel.webp", fit: 128 },
  wall_monastery:  { src: "assets/world/walls/monastery.webp", fit: 128 },
  wall_snowwild:   { src: "assets/world/walls/snowwild.webp", fit: 128 },
  wall_icecave:    { src: "assets/world/walls/icecave.webp", fit: 128 },
  wall_mine:       { src: "assets/world/walls/mine.webp", fit: 128 },
  wall_temple:     { src: "assets/world/walls/temple.webp", fit: 128 },
  wall_marsh:      { src: "assets/world/walls/marsh.webp", fit: 128 },
  wall_drowned:    { src: "assets/world/walls/drowned.webp", fit: 128 },
  wall_desert:     { src: "assets/world/walls/desert.webp", fit: 128 },
  wall_tombs:      { src: "assets/world/walls/tombs.webp", fit: 128 },
  wall_palace:     { src: "assets/world/walls/palace.webp", fit: 128 },
  wall_cathedral:  { src: "assets/world/walls/cathedral.webp", fit: 128 },
  wall_hellwild:   { src: "assets/world/walls/hellwild.webp", fit: 128 },
  wall_bastion:    { src: "assets/world/walls/bastion.webp", fit: 128 },
  wall_throne:     { src: "assets/world/walls/throne.webp", fit: 128 },

  wallcorner_town:       { src: "assets/world/walls/town-cell.webp", fit: 80 },
  wallcorner_crypt:      { src: "assets/world/walls/crypt-cell.webp", fit: 80 },
  wallcorner_vigil:      { src: "assets/world/walls/vigil-cell.webp", fit: 80 },
  wallcorner_chapel:     { src: "assets/world/walls/chapel-cell.webp", fit: 80 },
  wallcorner_monastery:  { src: "assets/world/walls/monastery-cell.webp", fit: 80 },
  wallcorner_snowwild:   { src: "assets/world/walls/snowwild-cell.webp", fit: 80 },
  wallcorner_icecave:    { src: "assets/world/walls/icecave-cell.webp", fit: 80 },
  wallcorner_mine:       { src: "assets/world/walls/mine-cell.webp", fit: 80 },
  wallcorner_temple:     { src: "assets/world/walls/temple-cell.webp", fit: 80 },
  wallcorner_marsh:      { src: "assets/world/walls/marsh-cell.webp", fit: 80 },
  wallcorner_drowned:    { src: "assets/world/walls/drowned-cell.webp", fit: 80 },
  wallcorner_desert:     { src: "assets/world/walls/desert-cell.webp", fit: 80 },
  wallcorner_tombs:      { src: "assets/world/walls/tombs-cell.webp", fit: 80 },
  wallcorner_palace:     { src: "assets/world/walls/palace-cell.webp", fit: 80 },
  wallcorner_cathedral:  { src: "assets/world/walls/cathedral-cell.webp", fit: 80 },
  wallcorner_hellwild:   { src: "assets/world/walls/hellwild-cell.webp", fit: 80 },
  wallcorner_bastion:    { src: "assets/world/walls/bastion-cell.webp", fit: 80 },
  wallcorner_throne:     { src: "assets/world/walls/throne-cell.webp", fit: 80 },

  /* Painted outdoor massifs. All six deterministic renderer variants are
     supplied for every outdoor theme, so no visible mountain/barrier needs
     every massif resolves through the runtime manifest during normal play. */
  massif_snowwild_0: { src: "assets/world/massifs/snowwild_0.webp", fit: 86 },
  massif_snowwild_1: { src: "assets/world/massifs/snowwild_1.webp", fit: 86 },
  massif_snowwild_2: { src: "assets/world/massifs/snowwild_2.webp", fit: 86 },
  massif_snowwild_3: { src: "assets/world/massifs/snowwild_3.webp", fit: 86 },
  massif_snowwild_4: { src: "assets/world/massifs/snowwild_4.webp", fit: 86 },
  massif_snowwild_5: { src: "assets/world/massifs/snowwild_5.webp", fit: 86 },
  massif_fields_0:   { src: "assets/world/massifs/fields_0.webp", fit: 80 },
  massif_fields_1:   { src: "assets/world/massifs/fields_1.webp", fit: 80 },
  massif_fields_2:   { src: "assets/world/massifs/fields_2.webp", fit: 80 },
  massif_fields_3:   { src: "assets/world/massifs/fields_3.webp", fit: 80 },
  massif_fields_4:   { src: "assets/world/massifs/fields_4.webp", fit: 80 },
  massif_fields_5:   { src: "assets/world/massifs/fields_5.webp", fit: 80 },
  massif_forest_0:   { src: "assets/world/massifs/forest_0.webp", fit: 84 },
  massif_forest_1:   { src: "assets/world/massifs/forest_1.webp", fit: 84 },
  massif_forest_2:   { src: "assets/world/massifs/forest_2.webp", fit: 84 },
  massif_forest_3:   { src: "assets/world/massifs/forest_3.webp", fit: 84 },
  massif_forest_4:   { src: "assets/world/massifs/forest_4.webp", fit: 84 },
  massif_forest_5:   { src: "assets/world/massifs/forest_5.webp", fit: 84 },
  massif_marsh_0:    { src: "assets/world/massifs/marsh_0.webp", fit: 80 },
  massif_marsh_1:    { src: "assets/world/massifs/marsh_1.webp", fit: 80 },
  massif_marsh_2:    { src: "assets/world/massifs/marsh_2.webp", fit: 80 },
  massif_marsh_3:    { src: "assets/world/massifs/marsh_3.webp", fit: 80 },
  massif_marsh_4:    { src: "assets/world/massifs/marsh_4.webp", fit: 80 },
  massif_marsh_5:    { src: "assets/world/massifs/marsh_5.webp", fit: 80 },
  massif_desert_0:   { src: "assets/world/massifs/desert_0.webp", fit: 82 },
  massif_desert_1:   { src: "assets/world/massifs/desert_1.webp", fit: 82 },
  massif_desert_2:   { src: "assets/world/massifs/desert_2.webp", fit: 82 },
  massif_desert_3:   { src: "assets/world/massifs/desert_3.webp", fit: 82 },
  massif_desert_4:   { src: "assets/world/massifs/desert_4.webp", fit: 82 },
  massif_desert_5:   { src: "assets/world/massifs/desert_5.webp", fit: 82 },
  massif_hellwild_0: { src: "assets/world/massifs/hellwild_0.webp", fit: 80 },
  massif_hellwild_1: { src: "assets/world/massifs/hellwild_1.webp", fit: 80 },
  massif_hellwild_2: { src: "assets/world/massifs/hellwild_2.webp", fit: 80 },
  massif_hellwild_3: { src: "assets/world/massifs/hellwild_3.webp", fit: 80 },
  massif_hellwild_4: { src: "assets/world/massifs/hellwild_4.webp", fit: 80 },
  massif_hellwild_5: { src: "assets/world/massifs/hellwild_5.webp", fit: 80 },

  /* Full-resolution authored materials are compiled into four checked-in
     isometric hazard frames per type. */
  hazard_ice:       { src: "assets/world/hazards/ice.webp", raw: true },
  hazard_bog:       { src: "assets/world/hazards/bog.webp", raw: true },
  hazard_lava:      { src: "assets/world/hazards/lava.webp", raw: true },
  hazard_quicksand: { src: "assets/world/hazards/quicksand.webp", raw: true },
  hazard_spore:     { src: "assets/world/hazards/spore.webp", raw: true },
  hazard_scorch:    { src: "assets/world/hazards/scorch.webp", raw: true },
  hazard_blood:     { src: "assets/world/hazards/blood.webp", raw: true },
  hazard_static:    { src: "assets/world/hazards/static.webp", raw: true },
  hazard_spring:    { src: "assets/world/hazards/spring.webp", raw: true },

  /* Every playable zone has its own full-resolution painted ground material.
     `raw` keeps the seamless source intact for varied isometric sampling. */
  ground_town:               { src: "assets/world/grounds/town.webp", raw: true },
  ground_fields:             { src: "assets/world/grounds/fields.webp", raw: true },
  ground_crypt1:             { src: "assets/world/grounds/crypt1.webp", raw: true },
  ground_crypt2:             { src: "assets/world/grounds/crypt2.webp", raw: true },
  ground_chapel:             { src: "assets/world/grounds/chapel.webp", raw: true },
  ground_forest:             { src: "assets/world/grounds/forest.webp", raw: true },
  ground_monastery1:         { src: "assets/world/grounds/monastery1.webp", raw: true },
  ground_monastery2:         { src: "assets/world/grounds/monastery2.webp", raw: true },
  ground_frosthaven:         { src: "assets/world/grounds/frosthaven.webp", raw: true },
  ground_north_wild:         { src: "assets/world/grounds/north_wild.webp", raw: true },
  ground_mines:              { src: "assets/world/grounds/mines.webp", raw: true },
  ground_shattered_temple:   { src: "assets/world/grounds/shattered_temple.webp", raw: true },
  ground_marshcamp:          { src: "assets/world/grounds/marshcamp.webp", raw: true },
  ground_weeping_marsh:      { src: "assets/world/grounds/weeping_marsh.webp", raw: true },
  ground_drowned_crypt:      { src: "assets/world/grounds/drowned_crypt.webp", raw: true },
  ground_ritual_site:        { src: "assets/world/grounds/ritual_site.webp", raw: true },
  ground_shardpeak_shrine:   { src: "assets/world/grounds/shardpeak_shrine.webp", raw: true },
  ground_deepfreeze_cavern:  { src: "assets/world/grounds/deepfreeze_cavern.webp", raw: true },
  ground_hollow_reeds:       { src: "assets/world/grounds/hollow_reeds.webp", raw: true },
  ground_spawn_pools:        { src: "assets/world/grounds/spawn_pools.webp", raw: true },
  ground_shard_flats:        { src: "assets/world/grounds/shard_flats.webp", raw: true },
  ground_tomb_sanctum:       { src: "assets/world/grounds/tomb_sanctum.webp", raw: true },
  ground_khalcamp:           { src: "assets/world/grounds/khalcamp.webp", raw: true },
  ground_desert_wastes:      { src: "assets/world/grounds/desert_wastes.webp", raw: true },
  ground_sand_tombs:         { src: "assets/world/grounds/sand_tombs.webp", raw: true },
  ground_khal_palace:        { src: "assets/world/grounds/khal_palace.webp", raw: true },
  ground_cathedral1:         { src: "assets/world/grounds/cathedral1.webp", raw: true },
  ground_cathedral2:         { src: "assets/world/grounds/cathedral2.webp", raw: true },
  ground_hellgate:           { src: "assets/world/grounds/hellgate.webp", raw: true },
  ground_ash_wastes:         { src: "assets/world/grounds/ash_wastes.webp", raw: true },
  ground_cinder_bastion:     { src: "assets/world/grounds/cinder_bastion.webp", raw: true },
  ground_throne:             { src: "assets/world/grounds/throne.webp", raw: true },

  /* Continuous level materials. */
  prop_level_ground_ash_wastes: { src: "assets/sprites_src/gameplay_art/world/props/level_ground_ash_wastes.png", raw: true },
  prop_level_ground_cathedral1: { src: "assets/sprites_src/gameplay_art/world/props/level_ground_cathedral1.png", raw: true },
  prop_level_ground_cathedral2: { src: "assets/sprites_src/gameplay_art/world/props/level_ground_cathedral2.png", raw: true },
  prop_level_ground_chapel: { src: "assets/sprites_src/gameplay_art/world/props/level_ground_chapel.png", raw: true },
  prop_level_ground_cinder_bastion: { src: "assets/sprites_src/gameplay_art/world/props/level_ground_cinder_bastion.png", raw: true },
  prop_level_ground_crypt1: { src: "assets/sprites_src/gameplay_art/world/props/level_ground_crypt1.png", raw: true },
  prop_level_ground_crypt2: { src: "assets/sprites_src/gameplay_art/world/props/level_ground_crypt2.png", raw: true },
  prop_level_ground_deepfreeze_cavern: { src: "assets/sprites_src/gameplay_art/world/props/level_ground_deepfreeze_cavern.png", raw: true },
  prop_level_ground_desert_wastes: { src: "assets/sprites_src/gameplay_art/world/props/level_ground_desert_wastes.png", raw: true },
  prop_level_ground_drowned_crypt: { src: "assets/sprites_src/gameplay_art/world/props/level_ground_drowned_crypt.png", raw: true },
  prop_level_ground_fields: { src: "assets/sprites_src/gameplay_art/world/props/level_ground_fields.png", raw: true },
  prop_level_ground_forest: { src: "assets/sprites_src/gameplay_art/world/props/level_ground_forest.png", raw: true },
  prop_level_ground_hollow_reeds: { src: "assets/sprites_src/gameplay_art/world/props/level_ground_hollow_reeds.png", raw: true },
  prop_level_ground_khal_palace: { src: "assets/sprites_src/gameplay_art/world/props/level_ground_khal_palace.png", raw: true },
  prop_level_ground_mines: { src: "assets/sprites_src/gameplay_art/world/props/level_ground_mines.png", raw: true },
  prop_level_ground_monastery1: { src: "assets/sprites_src/gameplay_art/world/props/level_ground_monastery1.png", raw: true },
  prop_level_ground_monastery2: { src: "assets/sprites_src/gameplay_art/world/props/level_ground_monastery2.png", raw: true },
  prop_level_ground_north_wild: { src: "assets/sprites_src/gameplay_art/world/props/level_ground_north_wild.png", raw: true },
  prop_level_ground_ritual_site: { src: "assets/sprites_src/gameplay_art/world/props/level_ground_ritual_site.png", raw: true },
  prop_level_ground_sand_tombs: { src: "assets/sprites_src/gameplay_art/world/props/level_ground_sand_tombs.png", raw: true },
  prop_level_ground_shard_flats: { src: "assets/sprites_src/gameplay_art/world/props/level_ground_shard_flats.png", raw: true },
  prop_level_ground_shardpeak_shrine: { src: "assets/sprites_src/gameplay_art/world/props/level_ground_shardpeak_shrine.png", raw: true },
  prop_level_ground_shattered_temple: { src: "assets/sprites_src/gameplay_art/world/props/level_ground_shattered_temple.png", raw: true },
  prop_level_ground_spawn_pools: { src: "assets/sprites_src/gameplay_art/world/props/level_ground_spawn_pools.png", raw: true },
  prop_level_ground_throne: { src: "assets/sprites_src/gameplay_art/world/props/level_ground_throne.png", raw: true },
  prop_level_ground_tomb_sanctum: { src: "assets/sprites_src/gameplay_art/world/props/level_ground_tomb_sanctum.png", raw: true },
  prop_level_ground_weeping_marsh: { src: "assets/sprites_src/gameplay_art/world/props/level_ground_weeping_marsh.png", raw: true },
  prop_level_hazard_blood: { src: "assets/sprites_src/gameplay_art/world/props/level_hazard_blood.png", raw: true },
  prop_level_hazard_bog: { src: "assets/sprites_src/gameplay_art/world/props/level_hazard_bog.png", raw: true },
  prop_level_hazard_ice: { src: "assets/sprites_src/gameplay_art/world/props/level_hazard_ice.png", raw: true },
  prop_level_hazard_lava: { src: "assets/sprites_src/gameplay_art/world/props/level_hazard_lava.png", raw: true },
  prop_level_hazard_quicksand: { src: "assets/sprites_src/gameplay_art/world/props/level_hazard_quicksand.png", raw: true },
  prop_level_hazard_scorch: { src: "assets/sprites_src/gameplay_art/world/props/level_hazard_scorch.png", raw: true },
  prop_level_hazard_spore: { src: "assets/sprites_src/gameplay_art/world/props/level_hazard_spore.png", raw: true },
  prop_level_hazard_spring: { src: "assets/sprites_src/gameplay_art/world/props/level_hazard_spring.png", raw: true },
  prop_level_hazard_static: { src: "assets/sprites_src/gameplay_art/world/props/level_hazard_static.png", raw: true },
  /* End continuous level materials. */
  /* Town architecture library v2. */
  prop_frosthaven_dwelling: { src: "assets/sprites_src/gameplay_art/world/props/frosthaven_dwelling.png", raw: true },
  prop_frosthaven_firebowl: { src: "assets/sprites_src/gameplay_art/world/props/frosthaven_firebowl.png", raw: true },
  prop_frosthaven_hall: { src: "assets/sprites_src/gameplay_art/world/props/frosthaven_hall.png", raw: true },
  prop_frosthaven_market: { src: "assets/sprites_src/gameplay_art/world/props/frosthaven_market.png", raw: true },
  prop_frosthaven_paving: { src: "assets/sprites_src/gameplay_art/world/props/frosthaven_paving.png", raw: true },
  prop_frosthaven_shrine: { src: "assets/sprites_src/gameplay_art/world/props/frosthaven_shrine.png", raw: true },
  prop_frosthaven_soil: { src: "assets/sprites_src/gameplay_art/world/props/frosthaven_soil.png", raw: true },
  prop_frosthaven_street: { src: "assets/sprites_src/gameplay_art/world/props/frosthaven_street.png", raw: true },
  prop_frosthaven_tower: { src: "assets/sprites_src/gameplay_art/world/props/frosthaven_tower.png", raw: true },
  prop_frosthaven_verge: { src: "assets/sprites_src/gameplay_art/world/props/frosthaven_verge.png", raw: true },
  prop_frosthaven_workshop: { src: "assets/sprites_src/gameplay_art/world/props/frosthaven_workshop.png", raw: true },
  prop_hellgate_dwelling: { src: "assets/sprites_src/gameplay_art/world/props/hellgate_dwelling.png", raw: true },
  prop_hellgate_firebowl: { src: "assets/sprites_src/gameplay_art/world/props/hellgate_firebowl.png", raw: true },
  prop_hellgate_hall: { src: "assets/sprites_src/gameplay_art/world/props/hellgate_hall.png", raw: true },
  prop_hellgate_market: { src: "assets/sprites_src/gameplay_art/world/props/hellgate_market.png", raw: true },
  prop_hellgate_paving: { src: "assets/sprites_src/gameplay_art/world/props/hellgate_paving.png", raw: true },
  prop_hellgate_shrine: { src: "assets/sprites_src/gameplay_art/world/props/hellgate_shrine.png", raw: true },
  prop_hellgate_soil: { src: "assets/sprites_src/gameplay_art/world/props/hellgate_soil.png", raw: true },
  prop_hellgate_street: { src: "assets/sprites_src/gameplay_art/world/props/hellgate_street.png", raw: true },
  prop_hellgate_tower: { src: "assets/sprites_src/gameplay_art/world/props/hellgate_tower.png", raw: true },
  prop_hellgate_verge: { src: "assets/sprites_src/gameplay_art/world/props/hellgate_verge.png", raw: true },
  prop_hellgate_workshop: { src: "assets/sprites_src/gameplay_art/world/props/hellgate_workshop.png", raw: true },
  prop_khalcamp_dwelling: { src: "assets/sprites_src/gameplay_art/world/props/khalcamp_dwelling.png", raw: true },
  prop_khalcamp_firebowl: { src: "assets/sprites_src/gameplay_art/world/props/khalcamp_firebowl.png", raw: true },
  prop_khalcamp_hall: { src: "assets/sprites_src/gameplay_art/world/props/khalcamp_hall.png", raw: true },
  prop_khalcamp_market: { src: "assets/sprites_src/gameplay_art/world/props/khalcamp_market.png", raw: true },
  prop_khalcamp_paving: { src: "assets/sprites_src/gameplay_art/world/props/khalcamp_paving.png", raw: true },
  prop_khalcamp_shrine: { src: "assets/sprites_src/gameplay_art/world/props/khalcamp_shrine.png", raw: true },
  prop_khalcamp_soil: { src: "assets/sprites_src/gameplay_art/world/props/khalcamp_soil.png", raw: true },
  prop_khalcamp_street: { src: "assets/sprites_src/gameplay_art/world/props/khalcamp_street.png", raw: true },
  prop_khalcamp_tower: { src: "assets/sprites_src/gameplay_art/world/props/khalcamp_tower.png", raw: true },
  prop_khalcamp_verge: { src: "assets/sprites_src/gameplay_art/world/props/khalcamp_verge.png", raw: true },
  prop_khalcamp_workshop: { src: "assets/sprites_src/gameplay_art/world/props/khalcamp_workshop.png", raw: true },
  prop_marshcamp_dwelling: { src: "assets/sprites_src/gameplay_art/world/props/marshcamp_dwelling.png", raw: true },
  prop_marshcamp_firebowl: { src: "assets/sprites_src/gameplay_art/world/props/marshcamp_firebowl.png", raw: true },
  prop_marshcamp_hall: { src: "assets/sprites_src/gameplay_art/world/props/marshcamp_hall.png", raw: true },
  prop_marshcamp_market: { src: "assets/sprites_src/gameplay_art/world/props/marshcamp_market.png", raw: true },
  prop_marshcamp_paving: { src: "assets/sprites_src/gameplay_art/world/props/marshcamp_paving.png", raw: true },
  prop_marshcamp_shrine: { src: "assets/sprites_src/gameplay_art/world/props/marshcamp_shrine.png", raw: true },
  prop_marshcamp_soil: { src: "assets/sprites_src/gameplay_art/world/props/marshcamp_soil.png", raw: true },
  prop_marshcamp_street: { src: "assets/sprites_src/gameplay_art/world/props/marshcamp_street.png", raw: true },
  prop_marshcamp_tower: { src: "assets/sprites_src/gameplay_art/world/props/marshcamp_tower.png", raw: true },
  prop_marshcamp_verge: { src: "assets/sprites_src/gameplay_art/world/props/marshcamp_verge.png", raw: true },
  prop_marshcamp_workshop: { src: "assets/sprites_src/gameplay_art/world/props/marshcamp_workshop.png", raw: true },
  prop_town_dwelling: { src: "assets/sprites_src/gameplay_art/world/props/town_dwelling.png", raw: true },
  prop_town_firebowl: { src: "assets/sprites_src/gameplay_art/world/props/town_firebowl.png", raw: true },
  prop_town_hall: { src: "assets/sprites_src/gameplay_art/world/props/town_hall.png", raw: true },
  prop_town_market: { src: "assets/sprites_src/gameplay_art/world/props/town_market.png", raw: true },
  prop_town_marshwater: { src: "assets/sprites_src/gameplay_art/world/props/town_marshwater.png", raw: true },
  prop_town_paving: { src: "assets/sprites_src/gameplay_art/world/props/town_paving.png", raw: true },
  prop_town_shrine: { src: "assets/sprites_src/gameplay_art/world/props/town_shrine.png", raw: true },
  prop_town_soil: { src: "assets/sprites_src/gameplay_art/world/props/town_soil.png", raw: true },
  prop_town_street: { src: "assets/sprites_src/gameplay_art/world/props/town_street.png", raw: true },
  prop_town_tower: { src: "assets/sprites_src/gameplay_art/world/props/town_tower.png", raw: true },
  prop_town_verge: { src: "assets/sprites_src/gameplay_art/world/props/town_verge.png", raw: true },
  prop_town_workshop: { src: "assets/sprites_src/gameplay_art/world/props/town_workshop.png", raw: true },
  /* End town architecture library v2. */
  /* Settlement-specific architecture uses the same painted visual language as
     the Frosthaven longhouse while preserving each hub's local materials. */
  prop_town_cottage:                 { src: "assets/world/settlements/town_cottage.webp", fit: 132 },
  prop_town_watchtower:              { src: "assets/world/settlements/town_watchtower.webp", fit: 92 },
  prop_frosthaven_cottage:           { src: "assets/world/settlements/frosthaven_cottage.webp", fit: 132 },
  prop_frosthaven_watchtower:        { src: "assets/world/settlements/frosthaven_watchtower.webp", fit: 92 },
  prop_marshcamp_cottage:             { src: "assets/world/props/marshcamp_cottage.webp", fit: 132 },
  prop_marshcamp_stilthut:           { src: "assets/world/settlements/marshcamp_stilthut.webp", fit: 132 },
  prop_khalcamp_adobehouse:          { src: "assets/world/settlements/khalcamp_adobehouse.webp", fit: 132 },
  prop_khalcamp_roundhut:            { src: "assets/world/settlements/khalcamp_roundhut.webp", fit: 110 },
  prop_hellgate_wartent:             { src: "assets/world/settlements/hellgate_wartent.webp", fit: 136 },
};

/* Painted monster silhouettes. Each entry names the transparent source, its
   on-screen base height, and the palette field used for roster colour variants.
   Aliases deliberately share a silhouette while keeping their own palette. */
DATA.MONSTER_SPRITE_SOURCES = {
  human:       { src: "assets/monsters/marauder.webp",    height: 66, tintKey: "armor" },
  skeleton:    { src: "assets/monsters/skeleton.webp",    height: 66, tintKey: "bone" },
  robed:       { src: "assets/monsters/occultist.webp",   height: 70, tintKey: "robe" },
  hound:       { src: "assets/monsters/hound.webp",       height: 52, tintKey: "fur" },
  wolf:        { alias: "hound" },
  spider:      { src: "assets/monsters/spider.webp",      height: 43, tintKey: "fur" },
  brute:       { src: "assets/monsters/brute.webp",       height: 72, tintKey: "skin" },
  knight:      { src: "assets/monsters/knight.webp",      height: 69, tintKey: "armor" },
  boss:        { src: "assets/monsters/undead_lord.webp", height: 76, tintKey: "armor" },
  warlord:     { alias: "boss" },
  ironlord:    { alias: "boss" },
  dragon:      { src: "assets/monsters/dragon.webp",      height: 74, tintKey: "body" },
  serpent:     { src: "assets/monsters/serpent.webp",     height: 72, tintKey: "body" },
  gargoyle:    { src: "assets/monsters/gargoyle.webp",    height: 65, tintKey: "stone" },
  demon:       { src: "assets/monsters/demon.webp",       height: 73, tintKey: "skin" },
  golem:       { src: "assets/monsters/golem.webp",       height: 73, tintKey: "bone" },
  abom:        { src: "assets/monsters/abom.webp",        height: 74, tintKey: "flesh" },
  wraith:      { src: "assets/monsters/wraith.webp",      height: 72, tintKey: "cloak", float: true },
  ooze:        { src: "assets/monsters/ooze.webp",        height: 47, tintKey: "goo", squash: true },
  imp:         { src: "assets/monsters/imp.webp",         height: 52, tintKey: "skin" },
  treant:      { src: "assets/monsters/treant.webp",      height: 78, tintKey: "bark" },
  grizzly:     { src: "assets/monsters/grizzly.webp",     height: 54, tintKey: "fur" },
};

/* Unique town residents. */
DATA.TOWN_RESIDENTS = {
  "town": [
    {
      "id": "vessa",
      "art": "resident_town_0",
      "name": "Captain Vessa Marn"
    },
    {
      "id": "korrin",
      "art": "resident_town_1",
      "name": "Korrin the Smith"
    },
    {
      "id": "maesa",
      "art": "resident_town_2",
      "name": "Old Maesa"
    },
    {
      "id": "brom",
      "art": "resident_town_3",
      "name": "Guardsman Brom"
    },
    {
      "id": "lysa",
      "art": "resident_town_4",
      "name": "Widow Lysa"
    },
    {
      "id": "pip",
      "art": "resident_town_5",
      "name": "Pip"
    },
    {
      "id": "hask",
      "art": "resident_town_6",
      "name": "Drover Hask"
    },
    {
      "id": "villager_refugee",
      "art": "resident_town_7",
      "name": "Iona"
    },
    {
      "id": "villager_child",
      "art": "resident_town_8",
      "name": "Tamsin"
    },
    {
      "id": "villager_smith",
      "art": "resident_town_9",
      "name": "Jory"
    },
    {
      "id": "villager_soldier",
      "art": "resident_town_10",
      "name": "Rafe"
    },
    {
      "id": "villager_fisher",
      "art": "resident_town_11",
      "name": "Merrit"
    }
  ],
  "frosthaven": [
    {
      "id": "sera",
      "art": "resident_frosthaven_0",
      "name": "Warden-Aspect Seraneth"
    },
    {
      "id": "bryn",
      "art": "resident_frosthaven_1",
      "name": "Bryn the Survivor"
    },
    {
      "id": "hewn",
      "art": "resident_frosthaven_2",
      "name": "Hewn the Frostsmith"
    },
    {
      "id": "wenna",
      "art": "resident_frosthaven_3",
      "name": "Wenna"
    },
    {
      "id": "villager_refugee",
      "art": "resident_frosthaven_4",
      "name": "Elin"
    },
    {
      "id": "villager_refugee",
      "art": "resident_frosthaven_5",
      "name": "Nils"
    },
    {
      "id": "villager_child",
      "art": "resident_frosthaven_6",
      "name": "Mira"
    },
    {
      "id": "villager_soldier",
      "art": "resident_frosthaven_7",
      "name": "Torvald"
    },
    {
      "id": "villager_smith",
      "art": "resident_frosthaven_8",
      "name": "Asta"
    },
    {
      "id": "freed",
      "art": "resident_frosthaven_9",
      "name": "Halvar"
    }
  ],
  "marshcamp": [
    {
      "id": "oris",
      "art": "resident_marshcamp_0",
      "name": "Oris"
    },
    {
      "id": "sutler_smith",
      "art": "resident_marshcamp_1",
      "name": "Greywater Smith"
    },
    {
      "id": "sutler_quarter",
      "art": "resident_marshcamp_2",
      "name": "Greywater Quartermaster"
    },
    {
      "id": "villager_fisher",
      "art": "resident_marshcamp_3",
      "name": "Sella"
    },
    {
      "id": "villager_fisher",
      "art": "resident_marshcamp_4",
      "name": "Brann"
    },
    {
      "id": "villager_child",
      "art": "resident_marshcamp_5",
      "name": "Olli"
    },
    {
      "id": "villager_refugee",
      "art": "resident_marshcamp_6",
      "name": "Ysra"
    },
    {
      "id": "villager_refugee",
      "art": "resident_marshcamp_7",
      "name": "Tovan"
    }
  ],
  "khalcamp": [
    {
      "id": "edran",
      "art": "resident_khalcamp_0",
      "name": "Archivist Edran Vael"
    },
    {
      "id": "sutler_smith",
      "art": "resident_khalcamp_1",
      "name": "Expedition Smith"
    },
    {
      "id": "sutler_quarter",
      "art": "resident_khalcamp_2",
      "name": "Expedition Quartermaster"
    },
    {
      "id": "villager_digger",
      "art": "resident_khalcamp_3",
      "name": "Hadi"
    },
    {
      "id": "villager_digger",
      "art": "resident_khalcamp_4",
      "name": "Zara"
    },
    {
      "id": "villager_smith",
      "art": "resident_khalcamp_5",
      "name": "Imren"
    },
    {
      "id": "villager_soldier",
      "art": "resident_khalcamp_6",
      "name": "Samir"
    },
    {
      "id": "villager_child",
      "art": "resident_khalcamp_7",
      "name": "Laleh"
    }
  ],
  "hellgate": [
    {
      "id": "vael",
      "art": "resident_hellgate_0",
      "name": "Marshal Vael"
    },
    {
      "id": "sutler_smith",
      "art": "resident_hellgate_1",
      "name": "Breach Smith"
    },
    {
      "id": "sutler_quarter",
      "art": "resident_hellgate_2",
      "name": "Breach Quartermaster"
    },
    {
      "id": "villager_soldier",
      "art": "resident_hellgate_3",
      "name": "Garran"
    },
    {
      "id": "villager_soldier",
      "art": "resident_hellgate_4",
      "name": "Siv"
    },
    {
      "id": "villager_refugee",
      "art": "resident_hellgate_5",
      "name": "Mara"
    },
    {
      "id": "villager_smith",
      "art": "resident_hellgate_6",
      "name": "Dain"
    },
    {
      "id": "villager_refugee",
      "art": "resident_hellgate_7",
      "name": "Oren"
    }
  ]
};
/* End unique town residents. */
/* Unique settlement portraits plus occupation defaults for world encounters. */
DATA.NPC_SPRITE_SOURCES = {
  /* Resident portraits. */
  resident_town_0: { src: "assets/sprites_src/gameplay_art/actors/npcs/resident_town_0.png", height: 68 },
  resident_town_1: { src: "assets/sprites_src/gameplay_art/actors/npcs/resident_town_1.png", height: 68 },
  resident_town_2: { src: "assets/sprites_src/gameplay_art/actors/npcs/resident_town_2.png", height: 68 },
  resident_town_3: { src: "assets/sprites_src/gameplay_art/actors/npcs/resident_town_3.png", height: 68 },
  resident_town_4: { src: "assets/sprites_src/gameplay_art/actors/npcs/resident_town_4.png", height: 68 },
  resident_town_5: { src: "assets/sprites_src/gameplay_art/actors/npcs/resident_town_5.png", height: 47 },
  resident_town_6: { src: "assets/sprites_src/gameplay_art/actors/npcs/resident_town_6.png", height: 68 },
  resident_town_7: { src: "assets/sprites_src/gameplay_art/actors/npcs/resident_town_7.png", height: 68 },
  resident_town_8: { src: "assets/sprites_src/gameplay_art/actors/npcs/resident_town_8.png", height: 47 },
  resident_town_9: { src: "assets/sprites_src/gameplay_art/actors/npcs/resident_town_9.png", height: 68 },
  resident_town_10: { src: "assets/sprites_src/gameplay_art/actors/npcs/resident_town_10.png", height: 68 },
  resident_town_11: { src: "assets/sprites_src/gameplay_art/actors/npcs/resident_town_11.png", height: 68 },
  resident_frosthaven_0: { src: "assets/sprites_src/gameplay_art/actors/npcs/resident_frosthaven_0.png", height: 68 },
  resident_frosthaven_1: { src: "assets/sprites_src/gameplay_art/actors/npcs/resident_frosthaven_1.png", height: 68 },
  resident_frosthaven_2: { src: "assets/sprites_src/gameplay_art/actors/npcs/resident_frosthaven_2.png", height: 68 },
  resident_frosthaven_3: { src: "assets/sprites_src/gameplay_art/actors/npcs/resident_frosthaven_3.png", height: 68 },
  resident_frosthaven_4: { src: "assets/sprites_src/gameplay_art/actors/npcs/resident_frosthaven_4.png", height: 68 },
  resident_frosthaven_5: { src: "assets/sprites_src/gameplay_art/actors/npcs/resident_frosthaven_5.png", height: 68 },
  resident_frosthaven_6: { src: "assets/sprites_src/gameplay_art/actors/npcs/resident_frosthaven_6.png", height: 47 },
  resident_frosthaven_7: { src: "assets/sprites_src/gameplay_art/actors/npcs/resident_frosthaven_7.png", height: 68 },
  resident_frosthaven_8: { src: "assets/sprites_src/gameplay_art/actors/npcs/resident_frosthaven_8.png", height: 68 },
  resident_frosthaven_9: { src: "assets/sprites_src/gameplay_art/actors/npcs/resident_frosthaven_9.png", height: 68 },
  resident_marshcamp_0: { src: "assets/sprites_src/gameplay_art/actors/npcs/resident_marshcamp_0.png", height: 68 },
  resident_marshcamp_1: { src: "assets/sprites_src/gameplay_art/actors/npcs/resident_marshcamp_1.png", height: 68 },
  resident_marshcamp_2: { src: "assets/sprites_src/gameplay_art/actors/npcs/resident_marshcamp_2.png", height: 68 },
  resident_marshcamp_3: { src: "assets/sprites_src/gameplay_art/actors/npcs/resident_marshcamp_3.png", height: 68 },
  resident_marshcamp_4: { src: "assets/sprites_src/gameplay_art/actors/npcs/resident_marshcamp_4.png", height: 68 },
  resident_marshcamp_5: { src: "assets/sprites_src/gameplay_art/actors/npcs/resident_marshcamp_5.png", height: 47 },
  resident_marshcamp_6: { src: "assets/sprites_src/gameplay_art/actors/npcs/resident_marshcamp_6.png", height: 68 },
  resident_marshcamp_7: { src: "assets/sprites_src/gameplay_art/actors/npcs/resident_marshcamp_7.png", height: 68 },
  resident_khalcamp_0: { src: "assets/sprites_src/gameplay_art/actors/npcs/resident_khalcamp_0.png", height: 68 },
  resident_khalcamp_1: { src: "assets/sprites_src/gameplay_art/actors/npcs/resident_khalcamp_1.png", height: 68 },
  resident_khalcamp_2: { src: "assets/sprites_src/gameplay_art/actors/npcs/resident_khalcamp_2.png", height: 68 },
  resident_khalcamp_3: { src: "assets/sprites_src/gameplay_art/actors/npcs/resident_khalcamp_3.png", height: 68 },
  resident_khalcamp_4: { src: "assets/sprites_src/gameplay_art/actors/npcs/resident_khalcamp_4.png", height: 68 },
  resident_khalcamp_5: { src: "assets/sprites_src/gameplay_art/actors/npcs/resident_khalcamp_5.png", height: 68 },
  resident_khalcamp_6: { src: "assets/sprites_src/gameplay_art/actors/npcs/resident_khalcamp_6.png", height: 68 },
  resident_khalcamp_7: { src: "assets/sprites_src/gameplay_art/actors/npcs/resident_khalcamp_7.png", height: 47 },
  resident_hellgate_0: { src: "assets/sprites_src/gameplay_art/actors/npcs/resident_hellgate_0.png", height: 68 },
  resident_hellgate_1: { src: "assets/sprites_src/gameplay_art/actors/npcs/resident_hellgate_1.png", height: 68 },
  resident_hellgate_2: { src: "assets/sprites_src/gameplay_art/actors/npcs/resident_hellgate_2.png", height: 68 },
  resident_hellgate_3: { src: "assets/sprites_src/gameplay_art/actors/npcs/resident_hellgate_3.png", height: 68 },
  resident_hellgate_4: { src: "assets/sprites_src/gameplay_art/actors/npcs/resident_hellgate_4.png", height: 68 },
  resident_hellgate_5: { src: "assets/sprites_src/gameplay_art/actors/npcs/resident_hellgate_5.png", height: 68 },
  resident_hellgate_6: { src: "assets/sprites_src/gameplay_art/actors/npcs/resident_hellgate_6.png", height: 68 },
  resident_hellgate_7: { src: "assets/sprites_src/gameplay_art/actors/npcs/resident_hellgate_7.png", height: 68 },
  /* End resident portraits. */
  captain:  { src: "assets/world/npcs/captain.webp",  height: 70, tintKey: "armor" },
  smith:    { src: "assets/world/npcs/smith.webp",    height: 67, tintKey: "armor" },
  healer:   { src: "assets/world/npcs/healer.webp",   height: 68, tintKey: "cloth" },
  guard:    { src: "assets/world/npcs/guard.webp",    height: 68, tintKey: "armor" },
  commoner: { src: "assets/world/npcs/commoner.webp", height: 65, tintKey: "cloth" },
  child:    { src: "assets/world/npcs/child.webp",    height: 52, tintKey: "cloth" },
  fisher:   { src: "assets/world/npcs/fisher.webp",   height: 66, tintKey: "cloth" },
  scholar:  { src: "assets/world/npcs/scholar.webp",  height: 69, tintKey: "cloth" },
  survivor: { src: "assets/world/npcs/survivor.webp", height: 66, tintKey: "armor" },

  vessa:              { alias: "captain" },
  korrin:             { alias: "smith" },
  maesa:              { alias: "healer" },
  brom:               { alias: "guard" },
  lysa:               { alias: "commoner" },
  pip:                { alias: "child" },
  hask:               { alias: "commoner" },
  villager_fisher:    { alias: "fisher" },
  villager_smith:     { alias: "smith" },
  villager_refugee:   { alias: "commoner" },
  villager_digger:    { alias: "survivor" },
  villager_soldier:   { alias: "guard" },
  villager_child:     { alias: "child" },
  sera:               { alias: "scholar" },
  bryn:               { alias: "survivor" },
  hewn:               { alias: "smith" },
  wenna:              { alias: "healer" },
  oris:               { alias: "fisher" },
  edran:              { alias: "scholar" },
  vael:               { alias: "captain" },
  sutler_smith:       { alias: "smith" },
  sutler_quarter:     { alias: "healer" },
  surv_miner:         { alias: "survivor" },
  surv_woman:         { alias: "commoner" },
  surv_watch:         { alias: "guard" },
  surv_elder:         { alias: "survivor" },
  freed:              { alias: "survivor" },
};

/* =====================  RANDOM WORLD EVENTS (~50)  =====================
   Rolled into wilderness & dungeon zones on entry. Most are interactable shrines/
   caches/altars; some are ambushes or fleeing treasure-beasts. Each has a kind the
   event handler in game.js knows how to resolve. visual = prop sprite to show. */
DATA.EVENTS = (function () {
  const E = [];
  /* ---- 20 blessing shrines: a temporary buff each ---- */
  const BLESS = [
    ["Shrine of Fury", "⚔", { dmgPct: 45 }, "#ff6040"],
    ["Shrine of Haste", "💨", { ias: 30, frw: 18 }, "#cfe0ff"],
    ["Shrine of the Adept", "✦", { fcr: 30, spellPct: 25 }, "#b080ff"],
    ["Shrine of the Bulwark", "🛡", { armorPct: 60, resAll: 15 }, "#b0a890"],
    ["Shrine of the Leech", "🩸", { lifeSteal: 8 }, "#d04040"],
    ["Shrine of Fortune", "🍀", { mf: 60, goldFind: 80 }, "#7fd8c0"],
    ["Shrine of Ruin", "💥", { critChance: 18, critDmg: 60 }, "#ffb030"],
    ["Shrine of the Ox", "🐂", { str: 25, hpPct: 15 }, "#c08040"],
    ["Shrine of the Hawk", "🦅", { dex: 25, ar: 200 }, "#80c0a0"],
    ["Shrine of the Deep Well", "💧", { mana: 60, manaRegen: 80 }, "#4080ff"],
    ["Shrine of Embers", "🔥", { fireDmg: 25, resFire: 30 }, "#ff8030"],
    ["Shrine of Rime", "❄", { coldDmg: 22, resCold: 30 }, "#9fd8ff"],
    ["Shrine of Storms", "⚡", { lightDmg: 30, resLight: 30 }, "#f0e080"],
    ["Shrine of the Vigil", "👁", { wil: 25, fcr: 15 }, "#c0c0ff"],
    ["Shrine of Resolve", "🪨", { ccReduce: 40, armor: 60 }, "#a0a0a0" ],
    ["Shrine of the Road", "👣", { frw: 45 }, "#d0c080"],
    ["Shrine of Thorns", "🌵", { thorns: 30, armorPct: 30 }, "#90b060"],
    ["Shrine of the Colossus", "💪", { hp: 120, hpPct: 10 }, "#d06060"],
    ["Shrine of Warding", "🔱", { resAll: 35 }, "#80d0d0"],
    ["Shrine of the Whirlwind", "🌀", { ias: 45 }, "#d0d0ff"],
    ["Shrine of Plunder", "💰", { goldFind: 150, mf: 30 }, "#ffe070"],
    ["Shrine of the Marrow", "🦴", { vit: 25, hp: 80 }, "#d0c0a0"],
    ["Shrine of Quickening", "⏩", { fcr: 25, ias: 25, frw: 15 }, "#cfe0ff"],
    ["Shrine of the Kiln", "🌋", { fireDmg: 35, resFire: 25 }, "#ff7020"],
    ["Shrine of the Hearth", "🧊", { coldDmg: 30, resCold: 25 }, "#a0e0ff"],
    ["Shrine of Grounding", "🔌", { lightDmg: 40, resLight: 25 }, "#fff080"],
    ["Shrine of Cleansing", "🧪", { resPoison: 40, hp: 40 }, "#90ff70"],
    ["Shrine of the Duelist", "🤺", { critChance: 12, ias: 20 }, "#ffb0a0"],
    ["Shrine of the Sentinel", "🗼", { armor: 120, block: 15 }, "#b0b0c0"],
    ["Shrine of Avarice", "🪙", { goldFind: 120, mf: 50 }, "#ffd840"],
  ];
  BLESS.forEach((b, i) => E.push({ id: "ev_bless" + i, name: b[0], kind: "buff", visual: "shrine", color: b[3], minLvl: 1, weight: 3,
    buff: { id: "ev_bless" + i, label: b[0].replace("Shrine of ", ""), emoji: b[1], stats: b[2], dur: 60 } }));
  /* ---- caches (rich loot) ---- */
  E.push({ id: "ev_cache1", name: "Forgotten Cache", kind: "cache", visual: "chest", color: "#d8b860", minLvl: 1, weight: 4, drops: 2, mf: 30 });
  E.push({ id: "ev_cache2", name: "Buried Hoard", kind: "cache", visual: "chest", color: "#d8b860", minLvl: 8, weight: 3, drops: 3, mf: 60 });
  E.push({ id: "ev_cache3", name: "Warlord's Stash", kind: "cache", visual: "strongbox", color: "#ffd070", minLvl: 18, weight: 2, drops: 4, mf: 100 });
  E.push({ id: "ev_cache4", name: "Glittering Pile", kind: "gold", visual: "chest", color: "#ffe070", minLvl: 1, weight: 3, gold: 1 });
  E.push({ id: "ev_cache5", name: "Dragon's Tithe", kind: "gold", visual: "strongbox", color: "#ffe070", minLvl: 20, weight: 2, gold: 3 });
  /* ---- fountains (restore) ---- */
  E.push({ id: "ev_well1", name: "Clearwater Spring", kind: "heal", visual: "well", color: "#80d0ff", minLvl: 1, weight: 3, frac: 0.6 });
  E.push({ id: "ev_well2", name: "Aetheric Pool", kind: "heal", visual: "well", color: "#80a0ff", minLvl: 1, weight: 3, frac: 1.0, mana: true });
  /* ---- obelisks (instant xp) ---- */
  E.push({ id: "ev_obel1", name: "Stone of Memory", kind: "xp", visual: "shrine", color: "#c0a0ff", minLvl: 1, weight: 2, xpFrac: 0.25 });
  E.push({ id: "ev_obel2", name: "Pillar of Ages", kind: "xp", visual: "pillar", color: "#c0a0ff", minLvl: 10, weight: 2, xpFrac: 0.4 });
  /* ---- ambush altars: free a foe-pack, gain a guaranteed cache on clearing ---- */
  const AMB = [
    ["Disturbed Barrow", "undead", "#a6e6c4"], ["Wolf Den", "beast", "#e6b482"],
    ["Cultist Circle", "cultist", "#d8c8a0"], ["Demon Sigil", "demon", "#d894e4"],
    ["Spider Nest", "insect", "#c0ff60"], ["War Camp", "barbarian", "#9fe0ff"],
  ];
  AMB.forEach((a, i) => E.push({ id: "ev_amb" + i, name: a[0], kind: "ambush", visual: "grave", color: a[2], minLvl: 2, weight: 3, fam: a[1], count: 5, cache: true }));
  /* ---- cursed altars: risk/reward — spawns an elite pack, but guarantees a rare+ ---- */
  E.push({ id: "ev_curse1", name: "Bloodstained Altar", kind: "curse", visual: "shrine", color: "#ff4040", minLvl: 3, weight: 2, count: 4 });
  E.push({ id: "ev_curse2", name: "Hollow Reliquary", kind: "curse", visual: "embershard", color: "#ff5040", minLvl: 14, weight: 2, count: 5, rarity: "unique" });
  /* ---- fleeing treasure-beasts: catch & kill for a cache ---- */
  E.push({ id: "ev_gob1", name: "Gilded Scuttler", kind: "goblin", mon: "spider", color: "#ffd070", minLvl: 1, weight: 2, drops: 4 });
  E.push({ id: "ev_gob2", name: "Hoarder Fiend", kind: "goblin", mon: "brute", color: "#ffd070", minLvl: 12, weight: 2, drops: 5 });
  /* ---- glyph cache + crafting boons ---- */
  E.push({ id: "ev_glyph", name: "Runed Stone", kind: "glyph", visual: "pillar", color: "#7fd8c0", minLvl: 4, weight: 2, count: 2 });
  return E;
})();

/* XP curve */
DATA.xpForLevel = lvl => Math.floor(80 * Math.pow(lvl, 1.62));
DATA.MAX_LEVEL = 100;

/* build the 100-enemy roster now that ENEMIES and ZONES both exist */
DATA._buildRoster();

/* =====================  DEV-TOOL DATA OVERRIDES  =====================
   Applied by js/data_overrides.js (written by editor.html) AFTER all base
   generation, so it can patch generated bases/uniques too. Deep-merges patch
   values into the live DATA; arrays are replaced wholesale. Non-destructive —
   delete data_overrides.js (or its body) to revert to pristine data.js. */
DATA.applyOverrides = function (ov) {
  if (!ov) return;
  const merge = (target, patch) => {
    if (!target || typeof target !== "object") return;
    for (const k in patch) {
      const v = patch[k];
      if (v && typeof v === "object" && !Array.isArray(v) &&
          target[k] && typeof target[k] === "object" && !Array.isArray(target[k])) merge(target[k], v);
      else target[k] = v;                        // scalars + arrays replace wholesale
    }
  };
  /* keyed-object collections */
  for (const coll of ["ENEMIES", "BASES", "GLYPHS", "CHARM_BASES", "CLASSES", "ZONES"]) {
    const byId = ov[coll]; if (!byId || !DATA[coll]) continue;
    for (const id in byId) if (DATA[coll][id]) merge(DATA[coll][id], byId[id]);
  }
  /* array-by-id collections */
  for (const coll of ["UNIQUES", "SET_ITEMS"]) {
    const byId = ov[coll]; if (!byId || !DATA[coll]) continue;
    for (const id in byId) { const e = DATA[coll].find(x => x.id === id); if (e) merge(e, byId[id]); }
  }
  /* affixes are an unkeyed array — patched by index (order is deterministic per load) */
  if (ov.AFFIXES && DATA.AFFIXES) for (const idx in ov.AFFIXES) { const e = DATA.AFFIXES[+idx]; if (e) merge(e, ov.AFFIXES[idx]); }
};

/* Campaign interactions reuse the installed actor/prop art. Stable identifiers,
   rather than coordinates, keep discoveries intact when a level shifts. */
DATA.STORY_TOPICS = {
  resident_marshcamp_3: [{ id:"voice", q:"What happened to your voice?", a:"Sella tries to answer, but no sound comes. She writes on a scrap of sail: ‘The shard woke the people under the mud. Each night another word disappears. The others went calmly into the swamp. I tied myself to the dock.’", silent:true }],
  resident_marshcamp_5: [{ id:"dreams", q:"Do you still dream, Olli?", a:"No. I close my eyes and there is nothing until morning. Before the shining stone came, I dreamed of boats. Now I hear old people calling from beneath the monastery. They know my name." }],
  resident_marshcamp_6: [{ id:"fear", q:"Why are people walking into the water?", a:"My husband walked into the deep water without a cry. I should have been afraid. I felt nothing. None of us did. The Choir carried their shard beneath the abandoned monastery, and the buried spirits woke. Please find our fear before we follow him." }],
};
DATA.STORY_OBJECTS = {
  ritual_site: [{ id:"mire_shard", type:"embershard", label:"Recover the Mire Mother’s shard", requireKill:"mire_mother", text:"You pull the Embershard from the Mire Mother’s chest. The Choir’s plans wrapped around its setting describe a gateway beneath the buried city of Khal-Zahir." }],
  underground_market: [0,1,2].map(i => ({ id:"market_relay_"+i, type:"embershard", label:"Disable shard relay "+(i+1), guards:["gilt_construct","gilt_construct"], text:"The relay cracks. Sunderstone energy drains from the ancient market machines." })),
  sand_tombs: [{ id:"imprisoned_scholar", npc:"edran", art:"resident_khalcamp_0", label:"Scholar Ilyan — break the bindings", text:"Ilyan staggers free. ‘Tell Edran: the palace symbols are the Render’s forgotten experiments. Azram has fused himself to a fragment. The city’s impossible passages lead to his throne.’" }],
  khal_palace: [{ id:"fortress_map", type:"board", label:"Recover the fortress map", requireKill:"azram", text:"Azram’s map marks a ruined cathedral suspended between the Waking World and Hell: the fortress of Malthoron, the Hollow King. You take the map and his shard." }],
  cathedral1: [0,1,2].map(i => ({ id:"trapped_soul_"+i, npc:"surv_elder", art:"surv_elder", label:"Trapped soul "+(i+1)+" — release from the wall", text:["The soul pulls free of a memory of Cinderwatch. ‘It was taking my name. You remembered me.’", "A soul escapes the Last Bastion’s remembered walls. ‘The Choir’s priests keep the Quieting alive below.’", "The last soul slips from stone that remembers the depths beneath Mount Karrhal. ‘Find the Warden’s broken sword. Do not trust her empty armor.’"][i] })),
  cathedral2: [
    ...[0,1,2].map(i => ({ id:"quieting_seal_"+i, type:"shrine", label:"Break Quieting seal "+(i+1), guards:["choir_priest"], text:"The seal breaks. A voice returns to the world as the Quieting ritual loses its hold." })),
    ...[0,1,2].map(i => ({ id:"sword_piece_"+i, type:"chest", label:"Recover Seraneth’s sword: "+["hilt","broken edge","point"][i], text:"You recover the "+["hilt","broken edge","point"][i]+" of Seraneth’s shattered sword. Its light survives the cathedral’s lies." })),
    { id:"hell_portal", type:"embershard", label:"Enter the Burning Hells", requireKill:"malthoron", travel:"hellgate", text:"The hoarded shards collapse into a portal directly into the Burning Hells. Malthoron was gathering them for someone else." }
  ],
};

/* Pure campaign progress rules, shared by the game and regression checks.
   Completed legacy quests stay completed; newly required actions are only
   enforced for unfinished quests. One-time discoveries can precede acceptance. */
DATA.CAMPAIGN = (() => {
  const objectives = q => [...(q.objectives || []), ...(q.type === "killBoss" ? [{kind:"kill", target:q.target, zone:q.zone, label:"Defeat "+DATA.ENEMIES[q.target].name}] : [])];
  const key = o => [o.kind,o.zone,o.target].join(":");
  const ledger = state => (state.flags.campaign ||= {});
  function count(state, o) {
    if (o.kind === "quest") return state.quests[o.target]?.state === "done" ? 1 : 0;
    if (o.kind === "kill" && (state.flags["dead_"+o.target+"@"+state.difficulty] || (state.difficulty === 0 && state.flags["dead_"+o.target]))) return o.count || 1;
    return Math.min(o.count || 1, ledger(state)[key(o)] || 0);
  }
  function sync(state) {
    const ready = [];
    for (const q of DATA.QUESTS) {
      const st = state.quests[q.id];
      if (!q.objectives || st?.state !== "active") continue;
      if (objectives(q).every(o => count(state,o) >= (o.count || 1))) { st.state = "reward"; ready.push(q); }
    }
    return ready;
  }
  function record(state, event) {
    const book = ledger(state);
    // Count only declared targets, with bounded storage. Unique discoveries
    // cannot be farmed by talking, clicking, saving or regenerating a map.
    for (const q of DATA.QUESTS) for (const o of objectives(q)) {
      if (o.kind !== event.kind || o.zone !== event.zone || o.target !== event.target) continue;
      const k = key(o); book[k] = Math.min(o.count || 1, (book[k] || 0) + 1);
    }
    return sync(state);
  }
  function found(state, zone, id) { return !!ledger(state)[key({kind:"interact",zone,target:id})]; }
  function bossDead(state, id) { return !!(state.flags["dead_"+id+"@"+state.difficulty] || (state.difficulty === 0 && state.flags["dead_"+id])); }
  function remaining(state, q) { return objectives(q).filter(o => count(state,o) < (o.count || 1)); }
  return { objectives, count, sync, record, found, bossDead, remaining };
})();
