/* EMBERGRAVE — authored Unique identities and their shared combat runtime.
   IDs are save identities. Each row authors a trigger, condition and payoff;
   shared helpers implement mechanics, never choose a power at random. */
"use strict";
const UniquePowers = (() => {
  const VERSION = 1, catalog = Object.create(null);
  const clone = x => JSON.parse(JSON.stringify(x));
  const defs = [...DATA.UNIQUES, ...DATA.UNIQUE_CHARMS, ...DATA.UNIQUE_JEWELS];
  const byId = Object.fromEntries(defs.map(d => [d.id, d]));
  const legacyJewels = DATA.UNIQUE_JEWELS.map(d => clone(d));
  const B = (stats, dur = 4) => ({ kind: "buff", stats, dur });
  const N = (elem, pct = 40, radius = 2.5) => ({ kind: "nova", elem, pct, radius });
  const C = (elem, count = 3, pct = 35) => ({ kind: "chain", elem, count, pct, radius: 5 });
  const W = (pct = 8, dur = 5) => ({ kind: "barrier", pct, dur });
  const H = (pct = 4) => ({ kind: "heal", pct });
  const M = (pct = 5) => ({ kind: "mana", pct });
  const E = (attack = "strike", pct = 35) => ({ kind: "empower", attack, pct, dur: 6 });
  const V = (pct = 12, dur = 4) => ({ kind: "expose", pct, dur });
  const S = (pct = 35, dur = 3) => ({ kind: "slow", pct, dur, radius: 3 });
  const D = (elem = "poison", pct = 60, dur = 3) => ({ kind: "dot", elem, pct, dur });
  const K = (skill, path, op, value, dur = 6) => ({ kind: "skill", skill, path, op, value, dur });
  const P = (title, event, when, effects, options = {}) => ({ title, event, when, effects: Array.isArray(effects) ? effects : [effects], cd: 5, ...options });
  function add(id, power, support) {
    if (catalog[id]) throw new Error("Duplicate Unique: " + id);
    const def = byId[id] || DATA.GLYPHS[id];
    if (!def) throw new Error("Unknown Unique: " + id);
    catalog[id] = { id, name: def.name, level: def.ilvl || def.dropLevel || 1, powers: [power] };
    if (support) {
      const L = def.ilvl, values = {
        dmgPct: 35 + L * 1.2, armorPct: 35 + L, hp: 15 + L * .8, mana: 15 + L * .7,
        str: 5 + L * .2, dex: 5 + L * .2, vit: 5 + L * .2, wil: 5 + L * .2,
        ias: 10 + L * .1, fcr: 10 + L * .1, frw: 15 + L * .15, critChance: 4 + L * .06,
        critDmg: 15 + L * .25, lifeSteal: 3 + L * .025, manaSteal: 2 + L * .025,
        resAll: 5 + L * .1, resFire: 12 + L * .2, resCold: 12 + L * .2,
        resLight: 12 + L * .2, resPoison: 12 + L * .2, ar: 30 + L * 2,
        spellPct: 20 + L * .65, fireDmg: 4 + L * .45, coldDmg: 4 + L * .45,
        lightDmg: 6 + L * .5, poisonDmg: 6 + L * .5, mf: 10 + L * .15,
        goldFind: 15 + L * .2, thorns: 4 + L * .3, block: 8 + L * .06,
        lifeRegen: 2 + L * .03, manaRegen: 15 + L * .2, ccReduce: 10 + L * .1,
        dmgReduceFlat: 2 + L * .07, skillAll: 1, dmgUndead: 30 + L, dmgDemon: 30 + L,
      };
      def.stats = Object.fromEntries(support.split(" ").map(s => {
        if (!Number.isFinite(values[s])) throw new Error("Unknown supporting stat: " + s);
        return [s, Math.round(values[s])];
      }));
    }
  }
  // The nine original relics retain their established themes.
  add("u_gravebite", P("Coffin Ward", "kill", "undead", W(8), { cd: 3 }), "dmgPct lifeSteal dmgUndead");
  add("u_widow", P("The Third Mourning", "strike", "any", N("poison", 55), { every: 3, sameTarget: true, cd: 3 }), "poisonDmg dex ias");
  add("u_cinder", P("Banked Wrath", "hurt", "any", N("fire", 50, 3), { every: 3, cd: 6 }), "armorPct resFire thorns");
  add("u_oath", P("Kept Promise", "block", "any", E("strike", 45)), "block resAll hp");
  add("u_crown", P("Empty Throne", "spend", "any", E("spell", 45), { every: 30, cd: 5 }), "skillAll mana mf");
  add("u_marrow", P("Living Marrow", "overheal", "any", W(5, 6), { every: 5, cd: 3 }), "hp lifeSteal vit");
  add("u_stormknot", P("Braided Thunder", "hit", "any", C("light", 3, 40), { alternate: true, cd: 4 }), "lightDmg fcr resLight");
  add("u_stride", P("The Late Footfall", "move", "any", B({ dodge: 18 }, 3), { every: 6, cd: 6 }), "frw dex resCold");
  add("u_kingsplit", P("Crowncrack", "strike", "critical", V(18, 5), { every: 2, sameTarget: true, cd: 5 }), "dmgPct critChance str");

  // Each row corresponds to a named entry in the existing level ladder.
  // Support is deliberately authored alongside the power, not sampled from affixes.
  function line(family, rows) {
    rows.forEach(([support, power], i) => add(`u_gen_${family}_${i * 2 + family % 2}`, power, support));
  }
  line(0, [
    ["dmgPct str resFire", P("First Light", "strike", "healthyTarget", N("fire"))],
    ["dmgPct ar critDmg", P("Fault Line", "strike", "elite", V())],
    ["dmgPct str lifeSteal", P("Royal Tithe", "strike", "boss", H(3))],
    ["dmgPct critChance hp", P("Cleaving Horizon", "kill", "critical", N("phys", 70, 3))],
    ["dmgPct ias resCold", P("Morning Pursuit", "strike", "slowed", B({ ias: 20 }))],
    ["dmgPct dex resLight", P("Heaven's Answer", "strike", "far", C("light"))],
    ["dmgPct critDmg resAll", P("Aurora Verdict", "strike", "critical", [N("cold"), W(6)], { every: 3 })],
  ]);
  line(1, [
    ["dmgPct lifeSteal hp", P("Red Wake", "kill", "near", B({ frw: 25 }))],
    ["dmgPct str resAll", P("Reaver's Shelter", "strike", "lowLife", W(10))],
    ["dmgPct critChance ar", P("Skull Fracture", "strike", "undead", [V(), M(4)])],
    ["dmgPct fireDmg str", P("Ruin's Echo", "kill", "burning", C("fire", 4))],
    ["dmgPct lifeSteal vit", P("Marrow Feast", "strike", "exposed", H(5))],
    ["dmgPct hp critDmg", P("Paid in Crimson", "hurt", "melee", E("strike", 60), { cd: 7 })],
  ]);
  line(2, [
    ["dmgPct dex ias", P("Whispered Opening", "strike", "healthyTarget", D())],
    ["dmgPct poisonDmg lifeSteal", P("Night's Kiss", "strike", "poisoned", M(6))],
    ["dmgPct critChance frw", P("Quiet Passing", "kill", "poisoned", B({ dodge: 20 }))],
    ["dmgPct ias dex", P("Severed Rhythm", "strike", "any", E("spell", 40), { every: 4 })],
    ["dmgPct poisonDmg ar", P("Whispering Venom", "strike", "critical", [D("poison", 80), S(20)])],
    ["dmgPct dex critDmg", P("Silent Thorn", "strike", "cursed", V(16))],
    ["dmgPct lifeSteal hp", P("Borrowed Breath", "kill", "lowLife", [H(8), B({ frw: 20 })], { cd: 8 })],
  ]);
  line(3, [
    ["dmgPct dex coldDmg", P("Winter's Distance", "strike", "far", S(45))],
    ["dmgPct lightDmg ias", P("Strung Thunder", "strike", "slowed", C("light", 4))],
    ["dmgPct ar mana", P("Returning Song", "kill", "far", [M(7), E("strike", 25)])],
    ["dmgPct critChance dex", P("Unblinking Hunt", "strike", "still", V(15))],
    ["dmgPct coldDmg critDmg", P("Pierced Winter", "strike", "frozen", N("phys", 65))],
    ["dmgPct ias resLight", P("Distant Weather", "strike", "any", [C("light"), B({ frw: 18 })], { every: 4, sameTarget: true })],
  ]);
  line(4, [
    ["spellPct fcr lightDmg mana", P("Gathering Tempest", "spell", "light", C("light", 3, 35), { every: 3 })],
    ["spellPct fireDmg manaRegen", P("Heart of the Pyre", "spell", "burning", H(4))],
    ["spellPct coldDmg resCold", P("Winter Refuge", "spell", "cold", W(8), { every: 3 })],
    ["spellPct fcr resLight", P("Crowned in Thunder", "cast", "light", K("emberwitch_2_2", "jumps", "add", 1))],
    ["spellPct fireDmg hp", P("Cinder Curtain", "hurt", "fire", E("spell", 50))],
    ["spellPct coldDmg mana", P("Glacial Confluence", "kill", "frozen", [M(8), N("cold", 55)])],
    ["spellPct fcr wil", P("Spire's Reach", "spell", "far", [V(10), C("light", 2)])],
  ]);
  line(5, [
    ["spellPct mana wil", P("Hexed Touch", "spell", "cursed", [H(3), M(4)])],
    ["spellPct manaRegen hp", P("Whispered Succor", "kill", "companionKill", W(9))],
    ["spellPct wil resAll", P("Grave Instruction", "cast", "summon", B({ minionDmgPct: 25 }, 6))],
    ["spellPct poisonDmg mana", P("Rot's Inheritance", "kill", "poisoned", N("poison", 80))],
    ["spellPct fcr vit", P("Tomb Inscription", "cast", "curse", [E("spell", 35), W(5)])],
    ["spellPct wil manaRegen", P("Splintered Soul", "spell", "shadow", C("shadow", 3), { every: 3, sameTarget: true })],
  ]);
  line(6, [
    ["armorPct hp resFire", P("Ashen Refuge", "hurt", "lowLife", [W(12), N("fire", 35)], { cd: 10 })],
    ["armorPct resFire vit", P("Shed the Flame", "hurt", "fire", [H(5), B({ resFire: 15 })])],
    ["armorPct hp thorns", P("Holding Ground", "hurt", "still", B({ dmgReducePct: 15 }))],
    ["armorPct hp fireDmg", P("Mail of Embers", "block", "any", N("fire", 55, 3))],
    ["armorPct resFire mana", P("Woven Cinders", "cast", "fire", B({ armorPct: 30 }, 5))],
    ["armorPct vit resAll", P("Tempered Scales", "hurt", "eliteSource", [W(8), M(4)])],
    ["armorPct hp dmgReduceFlat", P("Bastion's Reprisal", "hurt", "any", [V(14), B({ thorns: 25 })], { every: 4 })],
  ]);
  line(7, [
    ["skillAll mana resFire", P("Cinder Coronation", "kill", "burning", B({ fcr: 20 }))],
    ["armorPct hp resAll", P("Bone Audience", "kill", "undead", [M(6), B({ armorPct: 25 })])],
    ["skillAll fcr mana", P("Borrowed Face", "cast", "curse", B({ dodge: 16 }))],
    ["spellPct critChance mana", P("Doom's Toll", "spell", "lowTarget", V(18))],
    ["skillAll mana resCold", P("Drowned Decree", "hurt", "cold", C("cold", 4))],
    ["armorPct hp vit", P("Boneward Memory", "kill", "companionKill", [H(4), B({ dmgReducePct: 10 })])],
  ]);
  line(8, [
    ["frw dex resCold", P("Haunted Road", "move", "nearEnemy", S(35), { every: 5, cd: 5 })],
    ["frw vit hp", P("Wind at Your Back", "kill", "moving", B({ frw: 30 }, 3))],
    ["frw dex resAll", P("Ghost's Reprieve", "move", "lowLife", W(10), { every: 4, cd: 7 })],
    ["frw ias str", P("Marching Edge", "move", "any", E("strike", 35), { every: 8 })],
    ["frw dex mana", P("Gale's Return", "move", "lowMana", M(8), { every: 6 })],
    ["frw resCold hp", P("Pallid Trail", "move", "nearEnemy", N("cold", 35), { every: 9 })],
    ["frw vit resAll", P("Road's Last Breath", "move", "any", [H(3), E("spell", 25)], { every: 12, cd: 8 })],
  ]);
  line(9, [
    ["spellPct resLight mana", P("Knotted Current", "spell", "critical", M(8))],
    ["hp mana resPoison", P("Marsh Pulse", "hurt", "poison", W(12))],
    ["spellPct wil resAll", P("Soul Reflection", "spell", "shadow", E("strike", 40))],
    ["critChance ar resAll", P("Vigil's Eye", "strike", "elite", B({ dodge: 18 }))],
    ["spellPct fcr resLight", P("Bound Tempest", "cast", "light", B({ lightDmg: 25 }, 5))],
    ["hp manaRegen resPoison", P("Mirelight Rescue", "kill", "cursed", [H(5), W(5)])],
  ]);
  line(10, [
    ["lifeSteal critChance str", P("Sanguine Promise", "strike", "lowTarget", W(6))],
    ["hp vit resAll", P("Closing the Loop", "overheal", "any", E("strike", 30), { every: 8 })],
    ["dmgPct fireDmg ias", P("Ruinous Spark", "kill", "elite", N("fire", 90, 3))],
    ["spellPct mana fcr", P("Coiled Ember", "spend", "any", N("fire", 45), { every: 40 })],
    ["hp fireDmg lifeSteal", P("Burning Veins", "hurt", "melee", [D("fire", 60), H(3)])],
    ["hp resFire critDmg", P("Cinder Wound", "strike", "burning", V(14))],
    ["poisonDmg fireDmg dex", P("Serpent's Kindling", "spell", "poisoned", [N("fire", 45), M(3)])],
  ]);
  line(11, [
    ["dmgPct str ccReduce", P("Seismic Beat", "strike", "any", S(45), { every: 3, sameTarget: true })],
    ["dmgPct hp thorns", P("World's Rebound", "hurt", "melee", N("earth", 65))],
    ["dmgPct vit armorPct", P("Toll of Stone", "kill", "near", W(10))],
    ["dmgPct critDmg str", P("Cataclysmic Fault", "strike", "exposed", N("earth", 65, 3))],
    ["dmgPct ar mana", P("Doom's Resonance", "strike", "cursed", C("shadow", 4))],
    ["dmgPct hp resCold", P("Sunken Thunder", "strike", "slowed", [V(12), W(5)])],
  ]);
  line(12, [
    ["dmgPct ias dex", P("Vow of Return", "block", "any", [M(5), B({ ias: 18 })])],
    ["dmgPct lightDmg str", P("Brand of Dawn", "strike", "undead", N("light", 60))],
    ["dmgPct lifeSteal hp", P("King's Mercy", "kill", "elite", [H(6), B({ resAll: 10 })])],
    ["dmgPct critDmg dex", P("Unbroken Vow", "strike", "highLife", W(5), { every: 4 })],
    ["dmgPct resFire ias", P("Dawnsworn Rhythm", "hit", "any", [E("strike", 25), M(4)], { alternate: true })],
    ["dmgPct ar resAll", P("Gilded Reversal", "block", "eliteSource", V(20))],
    ["dmgPct vit hp", P("Guard the Throne", "strike", "boss", B({ dmgReducePct: 12 }))],
  ]);
  line(13, [
    ["dmgPct lifeSteal str", P("Tusk's Hunger", "strike", "lowLife", D("phys", 80))],
    ["dmgPct dmgUndead critChance", P("Cleaver's Revel", "kill", "undead", B({ ias: 25 }))],
    ["dmgPct ias frw", P("Bone Reaping", "kill", "near", C("phys", 3, 45))],
    ["dmgPct thorns vit", P("Split the Pack", "strike", "companion", V(14))],
    ["dmgPct lifeSteal dex", P("Hunting Maw", "strike", "beast", [H(5), E("strike", 25)])],
    ["dmgPct critChance ar", P("Antlered Pursuit", "cast", "form", B({ ias: 25, frw: 15 }, 5))],
  ]);
  line(14, [
    ["dmgPct str ccReduce", P("Evening Bell", "strike", "lowTarget", [S(30), M(4)])],
    ["dmgPct dmgUndead hp", P("Bell of Deliverance", "kill", "undead", C("light", 3))],
    ["dmgPct armorPct vit", P("Iron Knell", "block", "any", B({ thorns: 30 }, 5))],
    ["dmgPct critChance resAll", P("Sanctified Blow", "strike", "demon", W(9))],
    ["dmgPct manaRegen wil", P("Morning Prayer", "cast", "shout", [M(6), W(8)])],
    ["dmgPct lifeSteal str", P("Final Offering", "kill", "lowLife", E("strike", 65))],
    ["dmgPct resFire hp", P("Choir's Ashes", "strike", "burning", [C("fire", 2), B({ resAll: 8 })])],
  ]);
  line(15, [
    ["dmgPct dex frw", P("Skyfall Wake", "cast", "mobility", N("light", 60, 3))],
    ["dmgPct lightDmg str", P("Lance of Storms", "strike", "far", V(16))],
    ["dmgPct ias ar", P("Heaven's Rhythm", "strike", "any", [C("light", 2), M(4)], { every: 3 })],
    ["dmgPct coldDmg dex", P("Thunder in Winter", "strike", "slowed", E("spell", 50))],
    ["dmgPct critChance resLight", P("Tempest's Descent", "cast", "mobility", [W(8), B({ critChance: 12 })])],
    ["dmgPct ar mana", P("Pierce the Cloud", "strike", "boss", C("light", 4, 45))],
  ]);
  line(16, [
    ["dmgPct dex fireDmg", P("Heart's Beacon", "strike", "healthyTarget", V(14))],
    ["dmgPct critChance critDmg", P("Repeating Verdict", "strike", "any", E("strike", 45), { every: 3, sameTarget: true })],
    ["dmgPct ias frw", P("Widow's Escape", "kill", "far", W(9))],
    ["dmgPct dex poisonDmg", P("One Last Shot", "strike", "lowTarget", D("poison", 100))],
    ["dmgPct critChance ar", P("Broken Pulse", "strike", "critical", [V(10), M(5)], { every: 2 })],
    ["dmgPct ias mana", P("Quickened Quarrel", "cast", "trap", E("strike", 55))],
    ["dmgPct critDmg hp", P("Last Heartbeat", "strike", "lowLife", [C("phys", 2), H(4)])],
  ]);
  line(17, [
    ["armorPct resAll hp", P("Light Behind the Wall", "block", "undeadSource", H(6))],
    ["block armorPct vit", P("Bastion's Rhythm", "block", "any", W(12), { every: 3 })],
    ["armorPct thorns resFire", P("Sanctuary Flame", "hurt", "demonSource", N("fire", 75))],
    ["armorPct hp resAll", P("Eternal Reprieve", "hurt", "lowLife", B({ dmgReducePct: 20 }, 3), { cd: 12 })],
    ["block hp vit", P("Vow Unbroken", "block", "any", E("spell", 45))],
    ["armorPct resFire mana", P("Refuge in Ash", "block", "burningSource", [H(5), M(5)])],
  ]);
  line(18, [
    ["ias critChance str", P("Gravewrought Command", "strike", "critical", B({ minionDmgPct: 25 }, 5))],
    ["ias dex lifeSteal", P("Throttle the Hex", "strike", "cursed", [S(40), H(3)])],
    ["dmgPct critDmg str", P("Unrelenting Vise", "strike", "any", V(15), { every: 4, sameTarget: true })],
    ["ias frw hp", P("Deadhand's Gift", "kill", "companionKill", E("strike", 50))],
    ["spellPct fcr mana", P("Sepulcher's Clutch", "cast", "summon", W(10))],
    ["ias poisonDmg dex", P("Strangling Sorrow", "strike", "poisoned", [V(10), B({ frw: 20 })])],
    ["dmgPct str resFire", P("Palms of Ruin", "strike", "demon", [N("phys", 60), M(4)])],
  ]);
  line(19, [
    ["hp resAll str", P("Coiled Defense", "hurt", "melee", S(45))],
    ["hp poisonDmg vit", P("Spite's Reply", "hurt", "any", D("poison", 90), { every: 2 })],
    ["hp resFire resCold", P("Venomwind", "move", "nearEnemy", [N("poison", 35), B({ resPoison: 20 })], { every: 8 })],
    ["hp frw dex", P("Binding Coil", "strike", "poisoned", W(7))],
    ["hp mana resPoison", P("Tightening Hiss", "cast", "curse", K("gravebinder_2_1", "spreadRange", "multiply", 1.3))],
    ["hp vit poisonDmg", P("Fang's Knot", "kill", "poisoned", [M(6), E("spell", 35)])],
  ]);

  add("uc_thief", P("Quick Fingers", "kill", "elite", B({ mf: 30, goldFind: 40 }, 8)));
  add("uc_ember", P("Unfading Coal", "spell", "fire", B({ resFire: 20 }, 5), { every: 2 }));
  add("uc_quick", P("Hare's Start", "hurt", "any", B({ frw: 35 }, 3), { cd: 8 }));
  add("uc_mystic", P("Unspoken Syllable", "spend", "any", [M(10), B({ fcr: 15 })], { every: 60, cd: 8 }));
  add("uc_grave", P("Keep Your Distance", "kill", "undead", [S(40), H(4)]));
  add("uc_vampire", P("Sanguine Reserve", "strike", "critical", [H(3), M(3)], { cd: 4 }));
  add("uc_hunt", P("Huntress's Patience", "strike", "still", E("strike", 40), { every: 3 }));
  add("uc_warlord", P("Last One Standing", "kill", "alone", [W(8), B({ ias: 15 })]));
  add("uc_wyrm", P("Ancient Molt", "hurt", "elemental", [W(10), B({ ccReduce: 25 })], { cd: 8 }));
  add("uj_rainbow", P("Prismatic Turn", "spell", "any", B({ resAll: 12 }), { alternateElement: true }));
  add("uj_rage", P("Rising Rage", "strike", "any", B({ ias: 20, critDmg: 20 }), { every: 5 }));
  add("uj_frost", P("Heart of Winter", "hit", "slowed", W(6)));
  add("uj_ward", P("Stubborn Stone", "hurt", "eliteSource", B({ dmgReducePct: 15 }, 3)));
  add("uj_leech", P("Drink Deep", "strike", "exposed", [H(4), M(4)]));
  add("uj_storm", P("Remembered Thunder", "spell", "light", [C("light", 2), W(4)], { every: 4 }));
  add("uj_titan", P("Heavy Intent", "strike", "critical", [S(45), B({ armorPct: 20 })]));
  add("uj_seer", P("Looking Back", "cast", "any", E("spell", 40), { every: 4 }));
  const glyphRows = [
    ["g_doom", 20, P("Doombrand", "strike", "demon", D("fire", 100)), P("Doomguard", "hurt", "lowLife", [N("fire", 50), M(6)], { cd: 10 })],
    ["g_void", 28, P("Void Draw", "spell", "lowMana", [M(7), V(10)]), P("Void Shelter", "spend", "any", W(8), { every: 35 })],
    ["g_titan", 36, P("Titan's Aftershock", "strike", "elite", N("earth", 60)), P("Titan's Resolve", "block", "any", B({ str: 20, dmgReducePct: 10 }))],
    ["g_wraith", 24, P("Wraith's Passing", "kill", "any", E("spell", 35)), P("Wraithwalk", "move", "any", [M(4), B({ dodge: 12 })], { every: 10 })],
    ["g_aegis", 16, P("Aegis Judgment", "strike", "undead", [E("spell", 40), W(4)]), P("Aegis Vigil", "hurt", "undeadSource", [W(8), B({ resAll: 10 })])],
    ["g_venom", 12, P("Venom's Ripening", "strike", "poisoned", N("poison", 55), { every: 3 }), P("Venom's Antidote", "hurt", "poison", [H(5), B({ frw: 20 })])],
  ];
  for (const [id, level, wpn, arm] of glyphRows) {
    DATA.GLYPHS[id].dropLevel = level;
    add(id, wpn); catalog[id].powers = [wpn, arm]; catalog[id].level = level;
  }

  const now = () => typeof Game !== "undefined" ? Game.state?.time || 0 : 0;
  const world = () => typeof Game !== "undefined" ? Game.state : null;
  const stateFor = p => p._unique ||= { active: [], states: new Map(), depth: 0 };
  const color = elem => ({ fire: "#ff9040", cold: "#9fd8ff", light: "#fff080", poison: "#90ff70", shadow: "#c080e0", earth: "#c8ac80", phys: "#dfd1b5" }[elem] || "#d8924a");
  const living = p => (world()?.minions || []).filter(m => !m.dead && m.owner === p && !m.noAttack);
  const isCursed = t => ["curseFrailty", "curseWither", "killMark", "doom"].some(k => t?.[k] && (!t[k].until || t[k].until > now()));
  const burning = t => !!(t?.poisonDot?.fire && t.poisonDot.t > 0 || t?.scorch?.until > now());
  const conditions = {
    any: () => true,
    undead: (p,e) => e.target?.type === "undead", demon: (p,e) => e.target?.type === "demon", beast: (p,e) => e.target?.type === "beast",
    healthyTarget: (p,e) => e.targetHpBefore >= e.target?.maxHp * .8,
    lowTarget: (p,e) => (e.targetHpBefore ?? e.target?.hp) <= e.target?.maxHp * .35,
    lowLife: p => p.hp <= p.stats.maxHp * .4, highLife: p => p.hp >= p.stats.maxHp * .8,
    lowMana: p => p.mana <= p.stats.maxMana * .35, highMana: p => p.mana >= p.stats.maxMana * .8,
    critical: (p,e) => !!e.crit, elite: (p,e) => !!(e.target?.elite || e.target?.isBoss), boss: (p,e) => !!e.target?.isBoss,
    near: (p,e) => !!e.target && U.dist(p.x,p.y,e.target.x,e.target.y) <= 3,
    far: (p,e) => !!e.target && U.dist(p.x,p.y,e.target.x,e.target.y) >= 5,
    poisoned: (p,e) => !!(e.target?.poisonDot?.t > 0 && !e.target.poisonDot.fire || e.target?.uniqueDots?.some(d => d.elem === "poison" && d.until > now())),
    burning: (p,e) => burning(e.target), slowed: (p,e) => !!(e.target?.slowT > 0 || e.target?.frozen > now()),
    frozen: (p,e) => e.target?.frozen > now(), cursed: (p,e) => isCursed(e.target),
    exposed: (p,e) => !!e.target?.uniqueExposes?.some(x => x.until > now()),
    moving: p => now() - (stateFor(p).lastMoved ?? -Infinity) < .5,
    still: p => now() - (stateFor(p).lastMoved ?? -Infinity) >= 1,
    companion: p => living(p).length > 0, alone: p => living(p).length === 0,
    companionKill: (p,e) => e.source !== p && e.source?.owner === p,
    nearEnemy: p => (world()?.monsters || []).some(m => !m.dead && U.dist(p.x,p.y,m.x,m.y) <= 4),
    melee: (p,e) => !!e.source && U.dist(p.x,p.y,e.source.x,e.source.y) < 2 && (!e.elem || e.elem === "phys"),
    elemental: (p,e) => !!e.elem && e.elem !== "phys",
    eliteSource: (p,e) => !!(e.source?.elite || e.source?.isBoss),
    undeadSource: (p,e) => e.source?.type === "undead", demonSource: (p,e) => e.source?.type === "demon",
    burningSource: (p,e) => burning(e.source),
    summon: (p,e) => ["summon", "summon_golem"].includes(e.skill?.type),
    curse: (p,e) => ["curse", "plague_seed", "doom", "killmark"].includes(e.skill?.type),
    form: (p,e) => e.skill?.type === "form",
    shout: (p,e) => ["shout", "fear", "warshout_debuff", "banner", "banner_ultimate"].includes(e.skill?.type),
    mobility: (p,e) => ["charge", "leap", "grapple", "arcblink", "blink", "shadowstep", "dash"].includes(e.skill?.type),
    trap: (p,e) => /trap/.test(e.skill?.type || ""),
  };
  for (const elem of ["fire", "cold", "light", "poison", "shadow", "earth"]) conditions[elem] = (p,e) => (e.elem || e.skill?.elem) === elem;
  function itemId(item) { return item?.uniqueId || (item?.kind === "glyph" || typeof item === "string" ? item.glyph || item : null); }
  function forItem(item, side) {
    const entry = catalog[itemId(item)];
    if (!entry || item?.identified === false) return [];
    if (entry.powers.length === 2) return side ? [{ entry, power: entry.powers[side === "wpn" ? 0 : 1], key: entry.id + ":" + side }] : [];
    return [{ entry, power: entry.powers[0], key: entry.id }];
  }
  function collect(p) {
    const found = new Map();
    const add = (item, side) => { for (const a of forItem(item, side)) if (!found.has(a.key)) found.set(a.key, a); };
    for (const slot of Items.EQUIP_SLOTS) {
      const it = p.equip[slot]; if (!it || it.identified === false) continue;
      add(it); for (const socket of it.sockets || []) if (socket) add(socket, slot === "main" ? "wpn" : "arm");
    }
    for (const it of p.inv?.items || []) if (it.kind === "charm") add(it);
    return [...found.values()];
  }
  function sync(p) {
    const s = stateFor(p), active = collect(p), keys = new Set(active.map(a => a.key));
    for (const a of s.active) if (!keys.has(a.key)) {
      const old = s.states.get(a.key); if (old) { old.count = 0; old.target = null; old.lastKind = null; old.lastElement = null; }
    }
    s.active = active;
    p.buffs = p.buffs.filter(b => !b.uniqueKey || keys.has(b.uniqueKey));
  }
  function guarded(p, fn) {
    if (!p) return fn();
    const s = stateFor(p); s.depth++;
    try { return fn(); } finally { s.depth--; }
  }
  function buff(p, a, suffix, extra, dur) {
    const id = "unique_" + a.key + "_" + suffix;
    p.buffs = p.buffs.filter(b => b.id !== id);
    p.buffs.push({ id, uniqueKey: a.key, label: a.power.title, emoji: "◆", stats: {}, until: now() + dur, ...extra });
    p.computeStats();
    if (typeof UI !== "undefined") UI.refreshBuffs?.();
  }
  function damageFor(a, effect, e) {
    // Direct hit payoffs use actual dealt damage; other triggers use item level.
    return (e.damage > 0 ? e.damage : 12 + a.entry.level * 2) * effect.pct / 100;
  }
  function apply(p, a, effect, e) {
    const target = e.target || (e.source?.takeDamage ? e.source : null);
    switch (effect.kind) {
      case "buff": buff(p,a,"stats",{ stats: clone(effect.stats) },effect.dur); break;
      case "barrier": {
        const cap = p.stats.maxHp * effect.pct / 100;
        buff(p,a,"ward",{ uniqueBarrier: cap },effect.dur); break;
      }
      case "heal": p.healLife(p.stats.maxHp * effect.pct / 100); break;
      case "mana": p.mana = Math.min(p.stats.maxMana,p.mana + p.stats.maxMana * effect.pct / 100); break;
      case "empower": buff(p,a,"empower",{ uniqueEmpower: { attack: effect.attack, pct: effect.pct } },effect.dur); break;
      case "skill": buff(p,a,"skill",{ uniqueSkill: clone(effect) },effect.dur); break;
      case "expose":
        if (target && !target.dead) {
          target.uniqueExposes = (target.uniqueExposes || []).filter(x => x.key !== a.key && x.until > now());
          target.uniqueExposes.push({ key: a.key, pct: effect.pct, until: now() + effect.dur });
          Game.addParticle(target.x,target.y,"#d8924a");
        } break;
      case "dot":
        if (target && !target.dead) {
          target.uniqueDots = (target.uniqueDots || []).filter(x => x.key !== a.key && x.until > now());
          target.uniqueDots.push({ key: a.key, owner: p, elem: effect.elem, dps: damageFor(a,effect,e) / effect.dur, until: now() + effect.dur });
          Game.addParticle(target.x,target.y,color(effect.elem));
        } break;
      case "slow": case "nova": case "chain": {
        const center = target || p, candidates = (world()?.monsters || []).filter(m => !m.dead && U.dist(center.x,center.y,m.x,m.y) <= effect.radius + (m.radius || 0));
        if (effect.kind === "chain") candidates.sort((a,b) => U.dist2(center.x,center.y,a.x,a.y)-U.dist2(center.x,center.y,b.x,b.y));
        const hits = effect.kind === "chain" ? candidates.filter(m => m !== target).slice(0,effect.count) : candidates;
        if (effect.kind !== "chain") Game.addNova(center.x,center.y,effect.radius,color(effect.elem));
        let last = center;
        for (const m of hits) {
          if (effect.kind === "slow") { if (!m.isBoss && !Game.bossWard?.(m) && (!m.encounter || m.encounter.canDamage())) m.applySlow(effect.dur,effect.pct); continue; }
          if (effect.kind === "chain") { Game.lightningBolt(last.x,last.y,m.x,m.y,color(effect.elem)); last = m; }
          m.takeDamage(damageFor(a,effect,e),p,null,effect.elem);
        }
        if (hits.length && typeof Sfx !== "undefined") Sfx.play(effect.elem === "cold" ? "frost" : effect.elem === "light" ? "zap" : "blast");
        break;
      }
    }
  }
  function emit(p, event, e = {}) {
    if (!p || p.dead || p.hp <= 0) return;
    const s = stateFor(p); if (s.depth) return;
    for (const a of s.active) {
      const power = a.power;
      if (power.event !== event || !conditions[power.when](p,e)) continue;
      const st = s.states.get(a.key) || { count: 0, ready: 0 };
      s.states.set(a.key,st);
      if (now() < st.ready) continue;
      if (power.sameTarget && st.target !== e.target) { st.target = e.target; st.count = 0; }
      if (power.alternate) { const previous = st.lastKind; st.lastKind = e.kind; if (!previous || previous === e.kind) continue; }
      if (power.alternateElement) { const previous = st.lastElement; st.lastElement = e.elem; if (!previous || previous === e.elem) continue; }
      if (power.every) {
        st.count += ["spend","overheal","move"].includes(event) ? e.amount || 0 : 1;
        if (st.count + 1e-8 < power.every) continue;
        st.count = 0;
      }
      st.ready = now() + power.cd; // reserve before effects: no multi-target double fires
      guarded(p,() => { for (const effect of power.effects) apply(p,a,effect,e); });
    }
  }
  function hit(p, target, damage, meta, before) {
    if (!damage || !meta?.uniqueEvent) return;
    const e = { target, damage, targetHpBefore: before, crit: !!meta.crit, kind: meta.uniqueEvent, elem: meta.elem || "phys", source: p };
    emit(p,meta.uniqueEvent,e); emit(p,"hit",e);
  }
  function killed(target, source, meta) {
    const p = world()?.player;
    if (!p || source !== p && source?.owner !== p) return;
    emit(p,"kill",{ target, source, crit: !!meta?.crit, kind: meta?.uniqueEvent || "other", elem: meta?.elem, damage: meta?.damage || 0 });
  }
  function empower(p, kind, amount, target) {
    if (stateFor(p).depth) return amount;
    if (target && (target.dead || target.encounter && !target.encounter.canDamage() || target.bossOwner && !target.bossOwner.encounter?.canDamage() || Game.bossWard?.(target))) return amount;
    let pct = 0;
    for (const b of p.buffs) if (b.uniqueEmpower?.attack === kind && b.until > now()) { pct += b.uniqueEmpower.pct; b.until = now(); }
    return amount * (1 + pct / 100);
  }
  function absorb(p, amount) {
    for (const b of p.buffs) if (b.uniqueBarrier > 0 && b.until > now()) {
      const take = Math.min(amount,b.uniqueBarrier); b.uniqueBarrier -= take; amount -= take;
      if (b.uniqueBarrier <= 0) b.until = now();
      if (amount <= 0) break;
    }
    return amount;
  }
  function exposed(target) { return Math.max(0,...(target.uniqueExposes || []).filter(x => x.until > now()).map(x => x.pct)); }
  function tickDots(target, dt) {
    for (const dot of target.uniqueDots || []) {
      const elapsed = Math.max(0,Math.min(dt,dot.until - now() + dt));
      if (elapsed && !target.dead) guarded(dot.owner,() => target.takeDamage(dot.dps * elapsed,dot.owner,{ uniqueDot:true },dot.elem));
    }
    if (target.uniqueDots) target.uniqueDots = target.uniqueDots.filter(d => d.until > now());
  }
  function tick(p) {
    const s = stateFor(p), map = world()?.map;
    if (p.dead || p.hp <= 0) { p.buffs = p.buffs.filter(b => !b.uniqueKey); s.position = null; return; }
    if (s.position && s.position.map === map) {
      const dist = U.dist(p.x,p.y,s.position.x,s.position.y);
      // Teleports/map transitions do not charge walking powers.
      if (dist > .0001 && dist < 2) { s.lastMoved = now(); emit(p,"move",{ amount: dist }); }
    }
    s.position = { x: p.x, y: p.y, map };
  }
  const copySkill = x => Array.isArray(x) ? x.map(copySkill) : x && typeof x === "object" ? Object.fromEntries(Object.entries(x).map(([k,v]) => [k,copySkill(v)])) : x;
  function modifySkill(p, skill) {
    if (!skill) return skill;
    const effects = p.buffs.filter(b => b.uniqueSkill?.skill === skill.id && b.until > now()).map(b => b.uniqueSkill);
    if (!effects.length) return skill;
    const result = copySkill(skill);
    for (const e of effects) {
      const old = result[e.path];
      if (typeof old === "function") result[e.path] = rank => e.op === "add" ? old(rank) + e.value : old(rank) * e.value;
      else if (typeof old === "number") result[e.path] = e.op === "add" ? old + e.value : old * e.value;
    }
    if (typeof SkillPerks !== "undefined") result.desc = rank => SkillPerks.describe(result,rank);
    return result;
  }
  const signature = affixes => JSON.stringify((affixes || []).map(a => [a.stat,a.val]).sort((a,b) => a[0].localeCompare(b[0])));
  function migrateSocket(socket) {
    if (!socket || typeof socket !== "object" || !socket.jewel) return socket;
    if (!socket.uniqueId) {
      const original = legacyJewels.find(d => d.name === socket.name && d.jcol === socket.jcol && signature(d.affixes) === signature(socket.affixes));
      if (original) socket.uniqueId = original.id;
    }
    const def = DATA.UNIQUE_JEWELS.find(d => d.id === socket.uniqueId);
    if (def) { socket.affixes = clone(def.affixes); socket.name = def.name; socket.jcol = def.jcol; socket.rarity = "unique"; socket.uniqueVersion = VERSION; }
    return socket;
  }
  function migrate(item) {
    if (!item) return item;
    if (item.sockets) item.sockets = item.sockets.map(migrateSocket);
    const def = byId[item.uniqueId];
    if (item.rarity === "unique" && def) {
      item.affixes = def.affixes ? clone(def.affixes) : Object.entries(def.stats).map(([stat,val]) => ({ stat,val }));
      item.procs = []; item.flavor = def.flavor; item.uniqueVersion = VERSION;
      if (item.kind === "gear") item.reqLvl = Math.max(1,def.ilvl - 1);
    }
    return item;
  }
  const conditionText = {
    any: "", undead: " against undead", demon: " against demons", beast: " against beasts", healthyTarget: " against enemies at or above 80% Life",
    lowTarget: " against enemies at or below 35% Life", lowLife: " while at or below 40% Life", highLife: " while at or above 80% Life",
    lowMana: " while at or below 35% Aether", highMana: " while at or above 80% Aether", critical: " that critically strike",
    elite: " against elites or bosses", boss: " against bosses", near: " within 3 yards", far: " at least 5 yards away",
    poisoned: " against poisoned enemies", burning: " against burning enemies", slowed: " against slowed enemies", frozen: " against frozen enemies",
    cursed: " against cursed or marked enemies", exposed: " against enemies exposed by a Unique power", moving: " while moving", still: " after standing still for 1s",
    companion: " while a fighting companion lives", alone: " without fighting companions", companionKill: " by your companions",
    nearEnemy: " within 4 yards of an enemy", melee: " from melee attacks", elemental: " from elemental damage",
    eliteSource: " from elites or bosses", undeadSource: " from undead", demonSource: " from demons", burningSource: " from burning enemies",
    summon: " using a summon skill", curse: " using a curse or Contagion", form: " when changing form", shout: " using a shout or banner",
    mobility: " using a movement skill", trap: " using a trap skill",
  };
  for (const el of ["fire","cold","light","poison","shadow","earth"]) conditionText[el] = " with " + (el === "light" ? "lightning" : el);
  const eventText = { strike: "Weapon hits", spell: "Spell hits", hit: "Weapon or spell hits", kill: "Kills", block: "Blocks", hurt: "Damage received", cast: "Skill uses", spend: "Aether spent", overheal: "Healing beyond full Life", move: "Walking" };
  function effectText(e, level, event) {
    const flat = Math.round((12 + level * 2) * (e.pct || 0) / 100);
    const damage = ["strike","spell","hit"].includes(event) ? `${e.pct}% of hit damage` : event === "hurt" ? `${e.pct}% of damage taken` : event === "kill" ? `${e.pct}% of killing-hit damage (${flat} for kills over time)` : `${flat} damage`;
    switch (e.kind) {
      case "buff": return Object.entries(e.stats).map(([k,v]) => DATA.STAT_TEXT[k]?.(v) || `+${v}% Minion Damage`).join(", ") + ` for ${e.dur}s`;
      case "barrier": return `gain a barrier worth ${e.pct}% of maximum Life for ${e.dur}s; refreshes, never accumulates`;
      case "heal": return `restore ${e.pct}% of maximum Life`;
      case "mana": return `restore ${e.pct}% of maximum Aether`;
      case "empower": return `your next ${e.attack === "strike" ? "weapon" : "spell"} hit within ${e.dur}s deals ${e.pct}% more damage`;
      case "expose": return `the target takes ${e.pct}% more damage for ${e.dur}s; strongest exposure applies`;
      case "dot": return `inflict ${damage} as ${e.elem} damage over ${e.dur}s`;
      case "nova": return `erupt within ${e.radius} yards for ${damage} as ${e.elem} damage`;
      case "chain": return `arc to ${e.count} other enemies within ${e.radius} yards for ${damage} as ${e.elem} damage`;
      case "slow": return `slow non-boss enemies within ${e.radius} yards by ${e.pct}% for ${e.dur}s`;
      case "skill": return `for ${e.dur}s, ${DATA.SKILLS[e.skill]?.name} gains ${e.op === "add" ? "+" + e.value : "+" + Math.round((e.value - 1) * 100) + "%"} ${e.path === "jumps" ? "chain targets" : "spread range"}`;
      default: throw new Error("Unknown Unique effect " + e.kind);
    }
  }
  function describe(entry, power) {
    let trigger = eventText[power.event] + conditionText[power.when];
    if (power.every) trigger += ` (${power.every} ${power.event === "move" ? "yards" : power.event === "spend" ? "Aether" : power.event === "overheal" ? "Life overhealed" : "qualifying events"}${power.sameTarget ? " on the same target" : ""})`;
    if (power.alternate) trigger += "; alternate weapon and spell hits";
    if (power.alternateElement) trigger += "; alternate spell elements";
    return `${power.title} — ${trigger}: ${power.effects.map(e => effectText(e,entry.level,power.event)).join("; ")}. ${power.cd}s cooldown. Duplicates do not stack.`;
  }
  function lines(item, side) {
    if (item?.identified === false) return [];
    const entry = catalog[itemId(item)]; if (!entry) return [];
    const powers = side && entry.powers.length === 2 ? [entry.powers[side === "wpn" ? 0 : 1]] : entry.powers;
    return powers.map((p,i) => ({ t: (entry.powers.length === 2 && !side ? (i ? "In armor: " : "In weapons: ") : "") + describe(entry,p), c: "unique" }));
  }
  for (const entry of Object.values(catalog)) for (const p of entry.powers) {
    if (!conditions[p.when] || !eventText[p.event]) throw new Error("Invalid Unique trigger: " + entry.id);
    for (const e of p.effects) if (e.kind === "skill" && !DATA.SKILLS[e.skill]?.[e.path]) throw new Error("Invalid Unique skill: " + entry.id);
  }
  return Object.freeze({ VERSION, catalog, collect, sync, emit, guarded, hit, killed, empower, absorb, exposed, tick, tickDots, modifySkill, migrate, migrateSocket, describe, lines });
})();
