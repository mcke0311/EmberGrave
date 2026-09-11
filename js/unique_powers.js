/* EMBERGRAVE — authored Unique identities and their shared combat runtime.
   IDs are save identities. Each row authors a trigger, condition and payoff;
   shared helpers implement mechanics, never choose a power at random. */
"use strict";
const UniquePowers = (() => {
  const VERSION = 3, catalog = Object.create(null);
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
  function add(id, power) {
    if (catalog[id]) throw new Error("Duplicate Unique: " + id);
    const def = byId[id] || DATA.GLYPHS[id];
    if (!def) throw new Error("Unknown Unique: " + id);
    catalog[id] = { id, name: def.name, level: def.ilvl || def.dropLevel || 1, powers: [power] };
  }
  // Canonical equipment identities: fixed support choices and explicit class powers.
  // Support values are historical floors; current affix tiers set the final budget.
  const equipment = [
    {"id":"u_gravebite","support":{"dmgPct":39,"lifeSteal":3,"dmgUndead":33},"power":{"title":"First Beat","event":"equip","when":"any","target":{"classId":"vanguard","skill":"vanguard_0_0"},"effects":[{"kind":"modify","path":"tempoGain","op":"add","value":1,"label":"Tempo generated"}],"cd":0}},
    {"id":"u_widow","support":{"poisonDmg":8,"dex":6,"ias":10,"dmgPct":1},"power":{"title":"Widow's Lesson","event":"equip","when":"any","target":{"classId":"veilranger","skill":"veilranger_2_1"},"effects":[{"kind":"rank","value":1}],"cd":0}},
    {"id":"u_cinder","support":{"armorPct":39,"resFire":13,"thorns":5},"power":{"title":"Walking Furnace","event":"equip","when":"any","target":{"classId":"emberwitch","skill":"emberwitch_0_2"},"effects":[{"kind":"modify","path":"pStats.scorchPct","op":"add","value":25,"label":"Scorch damage bonus (%)"}],"cd":0}},
    {"id":"u_oath","support":{"block":8,"resAll":6,"hp":20},"power":{"title":"Oath Repaid","event":"equip","when":"any","target":{"classId":"vanguard","skill":"vanguard_0_2"},"effects":[{"kind":"modify","path":"parryRefund","op":"add","value":6,"label":"Aether returned per parry"}],"cd":0}},
    {"id":"u_crown","support":{"skillAll":1,"mana":19,"mf":11,"minionDmgPct":5},"power":{"title":"Crown of Hexes","event":"equip","when":"any","target":{"classId":"gravebinder","tree":1},"effects":[{"kind":"rank","value":1}],"cd":0}},
    {"id":"u_marrow","support":{"hp":18,"lifeSteal":3,"vit":6},"power":{"title":"Blood of the Pack","event":"equip","when":"any","target":{"classId":"wildkeeper","skill":"kinship"},"effects":[{"kind":"rank","value":1}],"cd":0}},
    {"id":"u_stormknot","support":{"lightDmg":9,"fcr":11,"resLight":13},"power":{"title":"Braided Totem","event":"equip","when":"any","target":{"classId":"wildkeeper","skill":"wildkeeper_1_0"},"effects":[{"kind":"modify","path":"zapCd","op":"multiply","value":0.8,"label":"totem attack interval"}],"cd":0}},
    {"id":"u_stride","support":{"frw":16,"dex":6,"resCold":13},"power":{"title":"Late Arrival","event":"equip","when":"any","target":{"classId":"veilranger","skill":"veilranger_2_0"},"effects":[{"kind":"modify","path":"mana","op":"multiply","value":0.65,"label":"Aether cost"}],"cd":0}},
    {"id":"u_kingsplit","support":{"dmgPct":45,"critChance":4,"str":7},"power":{"title":"The Falling Crown","event":"equip","when":"any","target":{"classId":"vanguard","skill":"vanguard_0_6"},"effects":[{"kind":"modify","path":"missingHpBonus","op":"multiply","value":1.4,"label":"damage against wounded enemies"}],"cd":0}},
    {"id":"u_gen_0_0","support":{"dmgPct":41,"str":6,"resFire":13},"power":{"title":"Breaking Dawn","event":"equip","when":"any","target":{"classId":"vanguard","skill":"vanguard_2_0"},"effects":[{"kind":"modify","path":"width","op":"multiply","value":1.5,"label":"charge width"}],"cd":0}},
    {"id":"u_gen_0_2","support":{"dmgPct":51,"ar":56,"critDmg":18},"power":{"title":"Assault Doctrine","event":"equip","when":"any","target":{"classId":"vanguard","tree":2},"effects":[{"kind":"rank","value":1}],"cd":0}},
    {"id":"u_gen_0_4","support":{"dmgPct":64,"str":10,"lifeSteal":4},"power":{"title":"Returning Steel","event":"equip","when":"any","target":{"classId":"vanguard","skill":"vanguard_2_2"},"effects":[{"kind":"modify","path":"count","op":"add","value":1,"label":"returning axes"}],"cd":0}},
    {"id":"u_gen_0_6","support":{"dmgPct":82,"critChance":6,"hp":46},"power":{"title":"Worldfall","event":"equip","when":"any","target":{"classId":"vanguard","skill":"vanguard_2_6"},"effects":[{"kind":"modify","path":"radius","op":"multiply","value":1.5,"label":"landing radius"}],"cd":0}},
    {"id":"u_gen_0_8","support":{"dmgPct":102,"ias":16,"resCold":23},"power":{"title":"Marching Fissure","event":"equip","when":"any","target":{"classId":"vanguard","skill":"ground_slam"},"effects":[{"kind":"modify","path":"range","op":"multiply","value":1.5,"label":"fissure reach"}],"cd":0}},
    {"id":"u_gen_0_10","support":{"dmgPct":124,"dex":20,"resLight":27},"power":{"title":"Heaven's Lesson","event":"equip","when":"any","target":{"classId":"vanguard","skill":"vanguard_2_6"},"effects":[{"kind":"rank","value":3}],"cd":0}},
    {"id":"u_gen_0_12","support":{"dmgPct":147,"critDmg":38,"resAll":14},"power":{"title":"Chain of Command","event":"equip","when":"any","target":{"classId":"vanguard","skill":"vanguard_2_1"},"effects":[{"kind":"modify","path":"mana","op":"multiply","value":0.65,"label":"Aether cost"}],"cd":0}},
    {"id":"u_gen_1_1","support":{"dmgPct":46,"lifeSteal":3,"hp":22},"power":{"title":"Gore Tempo","event":"equip","when":"any","target":{"classId":"vanguard","skill":"vanguard_0_0"},"effects":[{"kind":"rank","value":1}],"cd":0}},
    {"id":"u_gen_1_3","support":{"dmgPct":57,"str":9,"resAll":7},"power":{"title":"Unspent Fury","event":"equip","when":"any","target":{"classId":"vanguard","skill":"vanguard_0_1"},"effects":[{"kind":"modify","path":"tempoRetain","op":"add","value":1,"label":"Tempo retained after the finisher"}],"cd":0}},
    {"id":"u_gen_1_5","support":{"dmgPct":72,"critChance":6,"ar":92},"power":{"title":"Skull Frenzy","event":"equip","when":"any","target":{"classId":"vanguard","skill":"vanguard_0_4"},"effects":[{"kind":"modify","path":"stats.ias","op":"add","value":20,"label":"stance attack speed bonus (%)"}],"cd":0}},
    {"id":"u_gen_1_7","support":{"dmgPct":91,"fireDmg":25,"str":14},"power":{"title":"Ruined Steel","event":"equip","when":"any","target":{"classId":"vanguard","skill":"vanguard_0_3"},"effects":[{"kind":"rank","value":2}],"cd":0}},
    {"id":"u_gen_1_9","support":{"dmgPct":113,"lifeSteal":5,"vit":18},"power":{"title":"Executioner's Appetite","event":"equip","when":"any","target":{"classId":"vanguard","skill":"vanguard_0_6"},"effects":[{"kind":"modify","path":"baseThresh","op":"add","value":0.04,"label":"execution Life threshold"}],"cd":0}},
    {"id":"u_gen_1_11","support":{"dmgPct":136,"hp":82,"critDmg":36},"power":{"title":"Crimson Counter","event":"equip","when":"any","target":{"classId":"vanguard","skill":"vanguard_0_2"},"effects":[{"kind":"modify","path":"parryWindow","op":"multiply","value":0.7,"label":"time between parries"}],"cd":0}},
    {"id":"u_gen_2_0","support":{"dmgPct":41,"dex":6,"ias":11},"power":{"title":"The Unseen Discipline","event":"equip","when":"any","target":{"classId":"veilranger","tree":2},"effects":[{"kind":"rank","value":1}],"cd":0}},
    {"id":"u_gen_2_2","support":{"dmgPct":51,"poisonDmg":13,"lifeSteal":3},"power":{"title":"Lingering Opening","event":"equip","when":"any","target":{"classId":"veilranger","skill":"veilranger_2_1"},"effects":[{"kind":"modify","path":"exposeDuration","op":"multiply","value":1.6,"label":"Exposed duration"}],"cd":0}},
    {"id":"u_gen_2_4","support":{"dmgPct":64,"critChance":5,"frw":19},"power":{"title":"Quiet Crescent","event":"equip","when":"any","target":{"classId":"veilranger","skill":"veilranger_2_3"},"effects":[{"kind":"modify","path":"arc","op":"multiply","value":1.3,"label":"cleave angle"}],"cd":0}},
    {"id":"u_gen_2_6","support":{"dmgPct":82,"ias":14,"dex":13},"power":{"title":"Severing Flurry","event":"equip","when":"any","target":{"classId":"veilranger","skill":"veilranger_2_5"},"effects":[{"kind":"modify","path":"count","op":"add","value":2,"label":"blades"}],"cd":0}},
    {"id":"u_gen_2_8","support":{"dmgPct":102,"poisonDmg":34,"ar":142},"power":{"title":"Whispered Step","event":"equip","when":"any","target":{"classId":"veilranger","skill":"veilranger_2_0"},"effects":[{"kind":"rank","value":3}],"cd":0}},
    {"id":"u_gen_2_10","support":{"dmgPct":124,"dex":20,"critDmg":34},"power":{"title":"Thorn in the Mark","event":"equip","when":"any","target":{"classId":"veilranger","skill":"veilranger_2_4"},"effects":[{"kind":"modify","path":"detDmg","op":"multiply","value":1.6,"label":"mark detonation damage"}],"cd":0}},
    {"id":"u_gen_2_12","support":{"dmgPct":147,"lifeSteal":5,"hp":89},"power":{"title":"Last Breath Taken","event":"equip","when":"any","target":{"classId":"veilranger","skill":"veilranger_2_6"},"effects":[{"kind":"modify","path":"missingHpBonus","op":"multiply","value":1.5,"label":"damage against wounded enemies"}],"cd":0}},
    {"id":"u_gen_3_1","support":{"dmgPct":46,"dex":7,"coldDmg":8},"power":{"title":"Winter Quarry","event":"equip","when":"any","target":{"classId":"veilranger","skill":"veilranger_0_0"},"effects":[{"kind":"modify","path":"quarryStacks","op":"add","value":1,"label":"Quarry stacks per arrow"}],"cd":0}},
    {"id":"u_gen_3_3","support":{"dmgPct":57,"lightDmg":15,"ias":12},"power":{"title":"Storm Volley","event":"equip","when":"any","target":{"classId":"veilranger","skill":"veilranger_0_1"},"effects":[{"kind":"modify","path":"count","op":"add","value":2,"label":"arrows"}],"cd":0}},
    {"id":"u_gen_3_5","support":{"dmgPct":72,"ar":92,"mana":37},"power":{"title":"A Song Already Drawn","event":"equip","when":"any","target":{"classId":"veilranger","skill":"veilranger_0_2"},"effects":[{"kind":"modify","path":"maxDraw","op":"multiply","value":0.7,"label":"full-draw time"}],"cd":0}},
    {"id":"u_gen_3_7","support":{"dmgPct":91,"critChance":7,"dex":14},"power":{"title":"Hawk's Lesson","event":"equip","when":"any","target":{"classId":"veilranger","skill":"veilranger_0_3"},"effects":[{"kind":"rank","value":2}],"cd":0}},
    {"id":"u_gen_3_9","support":{"dmgPct":113,"coldDmg":33,"critDmg":31},"power":{"title":"Winter Ricochet","event":"equip","when":"any","target":{"classId":"veilranger","skill":"veilranger_0_4"},"effects":[{"kind":"modify","path":"bounces","op":"add","value":2,"label":"ricochets"}],"cd":0}},
    {"id":"u_gen_3_11","support":{"dmgPct":136,"ias":18,"resLight":29},"power":{"title":"Distant Aim","event":"equip","when":"any","target":{"classId":"veilranger","skill":"veilranger_0_0"},"effects":[{"kind":"rank","value":4}],"cd":0}},
    {"id":"u_gen_4_0","support":{"spellPct":23,"fcr":11,"mana":19,"lightDmgPct":9},"power":{"title":"Forked Tempest","event":"equip","when":"any","target":{"classId":"emberwitch","skill":"emberwitch_2_2"},"effects":[{"kind":"modify","path":"jumps","op":"add","value":2,"label":"chain targets"}],"cd":0}},
    {"id":"u_gen_4_2","support":{"spellPct":28,"manaRegen":18,"fireDmgPct":10},"power":{"title":"Heart of Scorch","event":"equip","when":"any","target":{"classId":"emberwitch","skill":"emberwitch_0_0"},"effects":[{"kind":"modify","path":"scorch","op":"multiply","value":2,"label":"Scorch damage per stack"}],"cd":0}},
    {"id":"u_gen_4_4","support":{"spellPct":36,"resCold":17,"coldDmgPct":15},"power":{"title":"Winter Stillness","event":"equip","when":"any","target":{"classId":"emberwitch","skill":"emberwitch_1_1"},"effects":[{"kind":"modify","path":"freeze","op":"multiply","value":1.4,"label":"freeze duration"}],"cd":0}},
    {"id":"u_gen_4_6","support":{"spellPct":45,"fcr":14,"resLight":20,"lightDmgPct":5},"power":{"title":"Thunder Sovereign","event":"equip","when":"any","target":{"classId":"emberwitch","skill":"emberwitch_2_2"},"effects":[{"kind":"modify","path":"dmg","op":"multiply","value":1.35,"label":"lightning damage"}],"cd":0}},
    {"id":"u_gen_4_8","support":{"spellPct":56,"hp":60,"fireDmgPct":29},"power":{"title":"Feeding the Pyre","event":"equip","when":"any","target":{"classId":"emberwitch","skill":"emberwitch_0_5"},"effects":[{"kind":"modify","path":"perStack","op":"multiply","value":1.75,"label":"damage per consumed Scorch stack"}],"cd":0}},
    {"id":"u_gen_4_10","support":{"spellPct":68,"mana":67,"coldDmgPct":37},"power":{"title":"Glacial Horizon","event":"equip","when":"any","target":{"classId":"emberwitch","skill":"emberwitch_1_6"},"effects":[{"kind":"modify","path":"radius","op":"multiply","value":1.4,"label":"glacier radius"}],"cd":0}},
    {"id":"u_gen_4_12","support":{"spellPct":80,"fcr":19,"wil":24,"lightDmgPct":5},"power":{"title":"Threefold Witchcraft","event":"equip","when":"any","target":{"classId":"emberwitch"},"effects":[{"kind":"rank","value":2}],"cd":0}},
    {"id":"u_gen_5_1","support":{"spellPct":26,"mana":21,"wil":7,"shadowDmgPct":5},"power":{"title":"Frailty Written Deep","event":"equip","when":"any","target":{"classId":"gravebinder","skill":"mark_of_frailty"},"effects":[{"kind":"modify","path":"pct","op":"add","value":10,"label":"curse amplification (%)"}],"cd":0}},
    {"id":"u_gen_5_3","support":{"spellPct":32,"manaRegen":19,"shadowDmgPct":5,"minionDmgPct":5},"power":{"title":"Second Whisper","event":"equip","when":"any","target":{"classId":"gravebinder","skill":"raise_plaguemage"},"effects":[{"kind":"modify","path":"cap","op":"add","value":1,"label":"Plague Mages"}],"cd":0}},
    {"id":"u_gen_5_5","support":{"spellPct":40,"resAll":8,"shadowDmgPct":5,"minionHpPct":5},"power":{"title":"Bonecraft Testament","event":"equip","when":"any","target":{"classId":"gravebinder","tree":0},"effects":[{"kind":"rank","value":1}],"cd":0}},
    {"id":"u_gen_5_7","support":{"spellPct":51,"mana":48,"poisonDmgPct":30},"power":{"title":"Rot Without Borders","event":"equip","when":"any","target":{"classId":"gravebinder","skill":"gravebinder_2_1"},"effects":[{"kind":"modify","path":"spreadRange","op":"multiply","value":1.6,"label":"Contagion spread reach"}],"cd":0}},
    {"id":"u_gen_5_9","support":{"spellPct":62,"fcr":17,"vit":18,"shadowDmgPct":5},"power":{"title":"Tomb of Beckoning","event":"equip","when":"any","target":{"classId":"gravebinder","skill":"gravebinder_1_3"},"effects":[{"kind":"rank","value":3}],"cd":0}},
    {"id":"u_gen_5_11","support":{"spellPct":75,"wil":22,"manaRegen":32,"shadowDmgPct":5},"power":{"title":"A Thrifty Soul","event":"equip","when":"any","target":{"classId":"gravebinder","skill":"gravebinder_1_5"},"effects":[{"kind":"modify","path":"manaPerSec","op":"multiply","value":0.65,"label":"channel Aether drain"}],"cd":0}},
    {"id":"u_gen_6_0","support":{"armorPct":40,"hp":19,"resFire":13},"power":{"title":"Cinder Discipline","event":"equip","when":"any","target":{"classId":"emberwitch","tree":0},"effects":[{"kind":"rank","value":1}],"cd":0}},
    {"id":"u_gen_6_2","support":{"armorPct":48,"resFire":15,"vit":8},"power":{"title":"Dragonhide Bear","event":"equip","when":"any","target":{"classId":"wildkeeper","skill":"stoneform"},"effects":[{"kind":"modify","path":"dur","op":"multiply","value":1.6,"label":"Bear Form duration"}],"cd":0}},
    {"id":"u_gen_6_4","support":{"armorPct":59,"hp":34,"thorns":11},"power":{"title":"Rooted Bulwark","event":"equip","when":"any","target":{"classId":"vanguard","skill":"vanguard_0_5"},"effects":[{"kind":"modify","path":"rootArmor","op":"multiply","value":1.6,"label":"armor while rooted"}],"cd":0}},
    {"id":"u_gen_6_6","support":{"armorPct":74,"hp":46,"fireDmg":22},"power":{"title":"Packed Powder","event":"equip","when":"any","target":{"classId":"veilranger","skill":"veilranger_1_5"},"effects":[{"kind":"modify","path":"radius","op":"multiply","value":1.5,"label":"trap explosion radius"}],"cd":0}},
    {"id":"u_gen_6_8","support":{"armorPct":91,"resFire":23,"mana":54},"power":{"title":"Long Burning Weave","event":"equip","when":"any","target":{"classId":"emberwitch","skill":"emberwitch_0_3"},"effects":[{"kind":"modify","path":"dur","op":"multiply","value":1.6,"label":"firewall duration"}],"cd":0}},
    {"id":"u_gen_6_10","support":{"armorPct":109,"vit":20,"resAll":12},"power":{"title":"Stone Mantle","event":"equip","when":"any","target":{"classId":"wildkeeper","skill":"wildkeeper_2_2"},"effects":[{"kind":"modify","path":"formStats.armorPct","op":"add","value":30,"label":"Stone Form armor bonus (%)"}],"cd":0}},
    {"id":"u_gen_6_12","support":{"armorPct":128,"hp":89,"dmgReduceFlat":9},"power":{"title":"Marrow Bastion","event":"equip","when":"any","target":{"classId":"gravebinder","skill":"gravebinder_0_4"},"effects":[{"kind":"rank","value":4}],"cd":0}},
    {"id":"u_gen_7_1","support":{"skillAll":1,"mana":21,"resFire":14},"power":{"title":"Cinder Coronation","event":"equip","when":"any","target":{"classId":"emberwitch","skill":"emberwitch_0_1"},"effects":[{"kind":"modify","path":"count","op":"add","value":2,"label":"cinder bolts"}],"cd":0}},
    {"id":"u_gen_7_3","support":{"armorPct":53,"hp":29,"resAll":7,"minionHpPct":5},"power":{"title":"Audience of Whispers","event":"equip","when":"any","target":{"classId":"gravebinder","skill":"gravebinder_1_4"},"effects":[{"kind":"rank","value":1}],"cd":0}},
    {"id":"u_gen_7_5","support":{"skillAll":1,"fcr":13,"mana":37},"power":{"title":"The Beckoning Face","event":"equip","when":"any","target":{"classId":"gravebinder","skill":"gravebinder_1_3"},"effects":[{"kind":"modify","path":"dur","op":"multiply","value":1.6,"label":"beckoning duration"}],"cd":0}},
    {"id":"u_gen_7_7","support":{"spellPct":51,"critChance":7,"mana":48},"power":{"title":"Doom Comes Early","event":"equip","when":"any","target":{"classId":"gravebinder","skill":"gravebinder_1_2"},"effects":[{"kind":"modify","path":"timer","op":"multiply","value":0.65,"label":"time to full Doom charge"}],"cd":0}},
    {"id":"u_gen_7_9","support":{"skillAll":1,"mana":61,"resCold":25},"power":{"title":"Rime Doctrine","event":"equip","when":"any","target":{"classId":"emberwitch","tree":1},"effects":[{"kind":"rank","value":3}],"cd":0}},
    {"id":"u_gen_7_11","support":{"armorPct":119,"hp":82,"vit":22,"minionHpPct":5},"power":{"title":"The Gravebinder's Crown","event":"equip","when":"any","target":{"classId":"gravebinder"},"effects":[{"kind":"rank","value":2}],"cd":0}},
    {"id":"u_gen_8_0","support":{"frw":16,"dex":6,"resCold":13},"power":{"title":"Long Shadow","event":"equip","when":"any","target":{"classId":"veilranger","skill":"veilranger_2_0"},"effects":[{"kind":"modify","path":"blinkRange","op":"multiply","value":1.5,"label":"Shadowstep reach"}],"cd":0}},
    {"id":"u_gen_8_2","support":{"frw":17,"vit":8,"hp":25},"power":{"title":"Fleet March","event":"equip","when":"any","target":{"classId":"vanguard","skill":"vanguard_2_3"},"effects":[{"kind":"rank","value":1}],"cd":0}},
    {"id":"u_gen_8_4","support":{"frw":19,"dex":10,"resAll":7},"power":{"title":"Wolfwind","event":"equip","when":"any","target":{"classId":"wildkeeper","skill":"fangform"},"effects":[{"kind":"modify","path":"formStats.frw","op":"add","value":20,"label":"Wolf Form movement bonus (%)"}],"cd":0}},
    {"id":"u_gen_8_6","support":{"frw":21,"ias":14,"str":13},"power":{"title":"Unbroken Charge","event":"equip","when":"any","target":{"classId":"vanguard","skill":"vanguard_2_0"},"effects":[{"kind":"modify","path":"chargeRange","op":"multiply","value":1.5,"label":"charge reach"}],"cd":0}},
    {"id":"u_gen_8_8","support":{"frw":23,"dex":16,"mana":54},"power":{"title":"Gale Crossing","event":"equip","when":"any","target":{"classId":"emberwitch","skill":"emberwitch_2_4"},"effects":[{"kind":"modify","path":"blinkRange","op":"multiply","value":1.5,"label":"Arc Teleport reach"}],"cd":0}},
    {"id":"u_gen_8_10","support":{"frw":26,"resCold":27,"hp":74},"power":{"title":"Pallid Snare","event":"equip","when":"any","target":{"classId":"veilranger","skill":"veilranger_1_2"},"effects":[{"kind":"modify","path":"slowDur","op":"multiply","value":1.5,"label":"Frostbite Trap slow duration"}],"cd":0}},
    {"id":"u_gen_8_12","support":{"frw":29,"vit":24,"resAll":14},"power":{"title":"Quickened Road","event":"equip","when":"any","target":{"classId":"veilranger","skill":"veilranger_2_2"},"effects":[{"kind":"rank","value":4}],"cd":0}},
    {"id":"u_gen_9_1","support":{"spellPct":26,"resLight":14,"mana":21},"power":{"title":"Tempest Doctrine","event":"equip","when":"any","target":{"classId":"emberwitch","tree":2},"effects":[{"kind":"rank","value":1}],"cd":0}},
    {"id":"u_gen_9_3","support":{"hp":29,"mana":28,"resPoison":16},"power":{"title":"Marsh Siphon","event":"equip","when":"any","target":{"classId":"gravebinder","skill":"gravebinder_1_5"},"effects":[{"kind":"modify","path":"maxChannel","op":"multiply","value":1.5,"label":"maximum channel duration"}],"cd":0}},
    {"id":"u_gen_9_5","support":{"spellPct":40,"wil":11,"resAll":8},"power":{"title":"Static Reflection","event":"equip","when":"any","target":{"classId":"emberwitch","skill":"emberwitch_2_6"},"effects":[{"kind":"modify","path":"perStatic","op":"multiply","value":1.6,"label":"damage per Static charge"}],"cd":0}},
    {"id":"u_gen_9_7","support":{"critChance":7,"ar":124,"resAll":10},"power":{"title":"Vanguard's Vigil","event":"equip","when":"any","target":{"classId":"vanguard"},"effects":[{"kind":"rank","value":1}],"cd":0}},
    {"id":"u_gen_9_9","support":{"spellPct":62,"fcr":17,"resLight":25},"power":{"title":"Wildkin Covenant","event":"equip","when":"any","target":{"classId":"wildkeeper","tree":0},"effects":[{"kind":"rank","value":3}],"cd":0}},
    {"id":"u_gen_9_11","support":{"hp":82,"manaRegen":32,"resPoison":29},"power":{"title":"The Ranger's Pendant","event":"equip","when":"any","target":{"classId":"veilranger"},"effects":[{"kind":"rank","value":2}],"cd":0}},
    {"id":"u_gen_10_0","support":{"lifeSteal":3,"critChance":4,"str":6},"power":{"title":"Circle of the Wild","event":"equip","when":"any","target":{"classId":"wildkeeper"},"effects":[{"kind":"rank","value":1}],"cd":0}},
    {"id":"u_gen_10_2","support":{"hp":25,"vit":8,"resAll":6},"power":{"title":"Bearblood Lesson","event":"equip","when":"any","target":{"classId":"wildkeeper","skill":"stoneform"},"effects":[{"kind":"rank","value":1}],"cd":0}},
    {"id":"u_gen_10_4","support":{"dmgPct":64,"fireDmg":15,"ias":12},"power":{"title":"Ruin Rekindled","event":"equip","when":"any","target":{"classId":"emberwitch","skill":"emberwitch_0_5"},"effects":[{"kind":"modify","path":"pyreChance","op":"add","value":0.15,"label":"repeat-Pyre chance per stack"}],"cd":0}},
    {"id":"u_gen_10_6","support":{"spellPct":45,"mana":42,"fcr":14},"power":{"title":"Endless Inferno","event":"equip","when":"any","target":{"classId":"emberwitch","skill":"emberwitch_0_6"},"effects":[{"kind":"modify","path":"dur","op":"multiply","value":1.5,"label":"Inferno duration"}],"cd":0}},
    {"id":"u_gen_10_8","support":{"hp":60,"fireDmg":29,"lifeSteal":4},"power":{"title":"Soul-fed Veins","event":"equip","when":"any","target":{"classId":"gravebinder","skill":"gravebinder_1_5"},"effects":[{"kind":"modify","path":"drain","op":"multiply","value":1.5,"label":"Life drained"}],"cd":0}},
    {"id":"u_gen_10_10","support":{"hp":74,"resFire":27,"critDmg":34},"power":{"title":"Unhealed Mark","event":"equip","when":"any","target":{"classId":"veilranger","skill":"veilranger_2_4"},"effects":[{"kind":"modify","path":"dur","op":"multiply","value":1.5,"label":"Killing Mark duration"}],"cd":0}},
    {"id":"u_gen_10_12","support":{"poisonDmg":53,"fireDmg":46,"dex":24},"power":{"title":"Serpent's Spit","event":"equip","when":"any","target":{"classId":"gravebinder","skill":"venom_spit"},"effects":[{"kind":"modify","path":"pdot","op":"multiply","value":1.75,"label":"poison damage over time"}],"cd":0}},
    {"id":"u_gen_11_1","support":{"dmgPct":46,"str":7,"ccReduce":11},"power":{"title":"Stormcall Doctrine","event":"equip","when":"any","target":{"classId":"wildkeeper","tree":1},"effects":[{"kind":"rank","value":1}],"cd":0}},
    {"id":"u_gen_11_3","support":{"dmgPct":57,"hp":29,"thorns":9},"power":{"title":"World Fracture","event":"equip","when":"any","target":{"classId":"wildkeeper","skill":"ground_fissure"},"effects":[{"kind":"modify","path":"waveWidth","op":"multiply","value":1.6,"label":"fissure width"}],"cd":0}},
    {"id":"u_gen_11_5","support":{"dmgPct":72,"vit":11,"armorPct":66},"power":{"title":"Toll Beneath the Earth","event":"equip","when":"any","target":{"classId":"wildkeeper","skill":"wildkeeper_1_5"},"effects":[{"kind":"modify","path":"radius","op":"multiply","value":1.5,"label":"Earthquake radius"}],"cd":0}},
    {"id":"u_gen_11_7","support":{"dmgPct":91,"critDmg":27,"str":14},"power":{"title":"Cataclysmic Pull","event":"equip","when":"any","target":{"classId":"wildkeeper","skill":"wildkeeper_1_3"},"effects":[{"kind":"modify","path":"pull","op":"multiply","value":1.75,"label":"Cyclone pull"}],"cd":0}},
    {"id":"u_gen_11_9","support":{"dmgPct":113,"ar":160,"mana":61},"power":{"title":"Wildshape Covenant","event":"equip","when":"any","target":{"classId":"wildkeeper","tree":2},"effects":[{"kind":"rank","value":3}],"cd":0}},
    {"id":"u_gen_11_11","support":{"dmgPct":136,"hp":82,"resCold":29},"power":{"title":"Second Storm","event":"equip","when":"any","target":{"classId":"wildkeeper","skill":"wildkeeper_1_0"},"effects":[{"kind":"modify","path":"cap","op":"add","value":1,"label":"Storm Totems"}],"cd":0}},
    {"id":"u_gen_12_0","support":{"dmgPct":41,"ias":11,"dex":6},"power":{"title":"Arms Doctrine","event":"equip","when":"any","target":{"classId":"vanguard","tree":0},"effects":[{"kind":"rank","value":1}],"cd":0}},
    {"id":"u_gen_12_2","support":{"dmgPct":51,"lightDmg":13,"str":8},"power":{"title":"Dawn's Rhythm","event":"equip","when":"any","target":{"classId":"vanguard","skill":"vanguard_0_0"},"effects":[{"kind":"modify","path":"tempoDuration","op":"multiply","value":1.5,"label":"Tempo window"}],"cd":0}},
    {"id":"u_gen_12_4","support":{"dmgPct":64,"lifeSteal":4,"hp":34},"power":{"title":"King's Rally","event":"equip","when":"any","target":{"classId":"vanguard","skill":"vanguard_1_0"},"effects":[{"kind":"modify","path":"healPct","op":"multiply","value":1.4,"label":"rally healing"}],"cd":0}},
    {"id":"u_gen_12_6","support":{"dmgPct":82,"critDmg":25,"dex":13},"power":{"title":"Lingering Sunder","event":"equip","when":"any","target":{"classId":"vanguard","skill":"vanguard_0_1"},"effects":[{"kind":"modify","path":"shredDur","op":"multiply","value":1.75,"label":"armor-shred duration"}],"cd":0}},
    {"id":"u_gen_12_8","support":{"dmgPct":102,"resFire":23,"ias":16},"power":{"title":"Berserker's Vow","event":"equip","when":"any","target":{"classId":"vanguard","skill":"vanguard_0_4"},"effects":[{"kind":"rank","value":3}],"cd":0}},
    {"id":"u_gen_12_10","support":{"dmgPct":124,"ar":178,"resAll":12},"power":{"title":"Gilded Riposte","event":"equip","when":"any","target":{"classId":"vanguard","skill":"vanguard_0_2"},"effects":[{"kind":"modify","path":"stunDur","op":"multiply","value":1.6,"label":"counter stun duration"}],"cd":0}},
    {"id":"u_gen_12_12","support":{"dmgPct":147,"vit":24,"hp":89},"power":{"title":"Standard of Mercy","event":"equip","when":"any","target":{"classId":"vanguard","skill":"vanguard_1_5"},"effects":[{"kind":"modify","path":"heal","op":"multiply","value":1.6,"label":"standard healing"}],"cd":0}},
    {"id":"u_gen_13_1","support":{"dmgPct":46,"lifeSteal":3,"str":7},"power":{"title":"Long Rabies","event":"equip","when":"any","target":{"classId":"wildkeeper","skill":"rabies"},"effects":[{"kind":"modify","path":"dur","op":"multiply","value":1.5,"label":"Rabies duration"}],"cd":0}},
    {"id":"u_gen_13_3","support":{"dmgPct":57,"dmgUndead":48,"critChance":5},"power":{"title":"Cleaving Fire","event":"equip","when":"any","target":{"classId":"wildkeeper","skill":"fire_claw"},"effects":[{"kind":"modify","path":"explosions","op":"add","value":1,"label":"fire explosions"}],"cd":0}},
    {"id":"u_gen_13_5","support":{"dmgPct":72,"ias":13,"frw":20},"power":{"title":"Long Hunt","event":"equip","when":"any","target":{"classId":"wildkeeper","skill":"fangform"},"effects":[{"kind":"modify","path":"dur","op":"multiply","value":1.5,"label":"Wolf Form duration"}],"cd":0}},
    {"id":"u_gen_13_7","support":{"dmgPct":91,"thorns":18,"vit":14,"minionHpPct":5},"power":{"title":"The Pack Shares Pain","event":"equip","when":"any","target":{"classId":"wildkeeper","skill":"kinship"},"effects":[{"kind":"modify","path":"pStats.pShare","op":"add","value":5,"label":"damage shared with companions (%)"}],"cd":0}},
    {"id":"u_gen_13_9","support":{"dmgPct":113,"lifeSteal":5,"dex":18,"minionDmgPct":5},"power":{"title":"Twin Tusks","event":"equip","when":"any","target":{"classId":"wildkeeper","skill":"thornback_boar"},"effects":[{"kind":"modify","path":"cap","op":"add","value":1,"label":"Thornback Boars"}],"cd":0}},
    {"id":"u_gen_13_11","support":{"dmgPct":136,"critChance":9,"ar":198},"power":{"title":"Antlered Wrath","event":"equip","when":"any","target":{"classId":"wildkeeper","skill":"wildkeeper_2_6"},"effects":[{"kind":"modify","path":"formStats.dmgPct","op":"add","value":30,"label":"Wrath damage bonus (%)"}],"cd":0}},
    {"id":"u_gen_14_0","support":{"dmgPct":41,"str":6,"ccReduce":11},"power":{"title":"Warcries Doctrine","event":"equip","when":"any","target":{"classId":"vanguard","tree":1},"effects":[{"kind":"rank","value":1}],"cd":0}},
    {"id":"u_gen_14_2","support":{"dmgPct":51,"dmgUndead":43,"hp":25},"power":{"title":"Far-reaching Rally","event":"equip","when":"any","target":{"classId":"vanguard","skill":"vanguard_1_0"},"effects":[{"kind":"modify","path":"radius","op":"multiply","value":1.5,"label":"rally radius"}],"cd":0}},
    {"id":"u_gen_14_4","support":{"dmgPct":64,"armorPct":59,"vit":10},"power":{"title":"Echo of Terror","event":"equip","when":"any","target":{"classId":"vanguard","skill":"terrifying_bellow"},"effects":[{"kind":"modify","path":"dur","op":"multiply","value":1.5,"label":"fear duration"}],"cd":0}},
    {"id":"u_gen_14_6","support":{"dmgPct":82,"critChance":6,"resAll":9},"power":{"title":"Crushing Roar","event":"equip","when":"any","target":{"classId":"vanguard","skill":"vanguard_1_4"},"effects":[{"kind":"modify","path":"roarSlow","op":"add","value":20,"label":"roar slow (%)"}],"cd":0}},
    {"id":"u_gen_14_8","support":{"dmgPct":102,"manaRegen":26,"wil":16},"power":{"title":"Morning Standard","event":"equip","when":"any","target":{"classId":"vanguard","skill":"vanguard_1_2"},"effects":[{"kind":"modify","path":"dur","op":"multiply","value":1.6,"label":"banner duration"}],"cd":0}},
    {"id":"u_gen_14_10","support":{"dmgPct":124,"lifeSteal":5,"str":20},"power":{"title":"The Last Congregation","event":"equip","when":"any","target":{"classId":"vanguard","skill":"vanguard_1_5"},"effects":[{"kind":"modify","path":"radius","op":"multiply","value":1.5,"label":"standard radius"}],"cd":0}},
    {"id":"u_gen_14_12","support":{"dmgPct":147,"resFire":31,"hp":89},"power":{"title":"Will of the Choir","event":"equip","when":"any","target":{"classId":"vanguard","skill":"vanguard_1_3"},"effects":[{"kind":"rank","value":4}],"cd":0}},
    {"id":"u_gen_15_1","support":{"dmgPct":46,"dex":7,"frw":16},"power":{"title":"Skyfall Fissure","event":"equip","when":"any","target":{"classId":"wildkeeper","skill":"ground_fissure"},"effects":[{"kind":"modify","path":"range","op":"multiply","value":1.5,"label":"fissure reach"}],"cd":0}},
    {"id":"u_gen_15_3","support":{"dmgPct":57,"lightDmg":15,"str":9},"power":{"title":"Long Storm","event":"equip","when":"any","target":{"classId":"wildkeeper","skill":"wildkeeper_1_0"},"effects":[{"kind":"modify","path":"radius","op":"multiply","value":1.5,"label":"totem targeting radius"}],"cd":0}},
    {"id":"u_gen_15_5","support":{"dmgPct":72,"ias":13,"ar":92},"power":{"title":"Hurrying Wisps","event":"equip","when":"any","target":{"classId":"wildkeeper","skill":"wildkeeper_1_6"},"effects":[{"kind":"modify","path":"wispCd","op":"multiply","value":0.65,"label":"wisp interval"}],"cd":0}},
    {"id":"u_gen_15_7","support":{"dmgPct":91,"coldDmg":25,"dex":14},"power":{"title":"Winter Cyclone","event":"equip","when":"any","target":{"classId":"wildkeeper","skill":"wildkeeper_1_3"},"effects":[{"kind":"modify","path":"ttl","op":"multiply","value":1.5,"label":"Cyclone lifetime"}],"cd":0}},
    {"id":"u_gen_15_9","support":{"dmgPct":113,"critChance":8,"resLight":25},"power":{"title":"Sky-Sap Lesson","event":"equip","when":"any","target":{"classId":"wildkeeper","skill":"wildkeeper_1_4"},"effects":[{"kind":"rank","value":3}],"cd":0}},
    {"id":"u_gen_15_11","support":{"dmgPct":136,"ar":198,"mana":74},"power":{"title":"Restless Earth","event":"equip","when":"any","target":{"classId":"wildkeeper","skill":"wildkeeper_1_5"},"effects":[{"kind":"modify","path":"tickEvery","op":"multiply","value":0.75,"label":"Earthquake pulse interval"}],"cd":0}},
    {"id":"u_gen_16_0","support":{"dmgPct":41,"dex":6,"fireDmg":6},"power":{"title":"Heartseeker's Aim","event":"equip","when":"any","target":{"classId":"veilranger","skill":"veilranger_0_0"},"effects":[{"kind":"modify","path":"dmgMult","op":"multiply","value":1.35,"label":"Aimed Shot damage"}],"cd":0}},
    {"id":"u_gen_16_2","support":{"dmgPct":51,"critChance":5,"critDmg":18},"power":{"title":"Precision Doctrine","event":"equip","when":"any","target":{"classId":"veilranger","tree":0},"effects":[{"kind":"rank","value":1}],"cd":0}},
    {"id":"u_gen_16_4","support":{"dmgPct":64,"ias":12,"frw":19},"power":{"title":"Widow's Rain","event":"equip","when":"any","target":{"classId":"veilranger","skill":"veilranger_0_6"},"effects":[{"kind":"modify","path":"radius","op":"multiply","value":1.5,"label":"Arrowfall radius"}],"cd":0}},
    {"id":"u_gen_16_6","support":{"dmgPct":82,"dex":13,"poisonDmg":26},"power":{"title":"Last Quarry","event":"equip","when":"any","target":{"classId":"veilranger","skill":"veilranger_0_2"},"effects":[{"kind":"modify","path":"quarryBonus","op":"multiply","value":1.5,"label":"damage per consumed Quarry stack"}],"cd":0}},
    {"id":"u_gen_16_8","support":{"dmgPct":102,"critChance":7,"ar":142},"power":{"title":"Broken Ricochet","event":"equip","when":"any","target":{"classId":"veilranger","skill":"veilranger_0_4"},"effects":[{"kind":"modify","path":"dmgMult","op":"multiply","value":1.4,"label":"ricochet damage"}],"cd":0}},
    {"id":"u_gen_16_10","support":{"dmgPct":124,"ias":17,"mana":67},"power":{"title":"Snares Doctrine","event":"equip","when":"any","target":{"classId":"veilranger","tree":1},"effects":[{"kind":"rank","value":3}],"cd":0}},
    {"id":"u_gen_16_12","support":{"dmgPct":147,"critDmg":38,"hp":89},"power":{"title":"Flurry of Openings","event":"equip","when":"any","target":{"classId":"veilranger","skill":"veilranger_2_5"},"effects":[{"kind":"modify","path":"exposedBonus","op":"add","value":20,"label":"damage against Exposed foes (%)"}],"cd":0}},
    {"id":"u_gen_17_1","support":{"armorPct":44,"resAll":6,"hp":22},"power":{"title":"Bulwark Lesson","event":"equip","when":"any","target":{"classId":"vanguard","skill":"vanguard_0_5"},"effects":[{"kind":"rank","value":1}],"cd":0}},
    {"id":"u_gen_17_3","support":{"block":9,"armorPct":53,"vit":9},"power":{"title":"Bastion's Lesson","event":"equip","when":"any","target":{"classId":"vanguard","skill":"vanguard_0_2"},"effects":[{"kind":"rank","value":1}],"cd":0}},
    {"id":"u_gen_17_5","support":{"armorPct":66,"thorns":13,"resFire":18},"power":{"title":"Winter Sanctuary","event":"equip","when":"any","target":{"classId":"emberwitch","skill":"rimeguard"},"effects":[{"kind":"rank","value":2}],"cd":0}},
    {"id":"u_gen_17_7","support":{"armorPct":82,"hp":53,"resAll":10},"power":{"title":"Bear's Shelter","event":"equip","when":"any","target":{"classId":"wildkeeper","skill":"stoneform"},"effects":[{"kind":"modify","path":"formStats.hpPct","op":"add","value":25,"label":"Bear Form Life bonus (%)"}],"cd":0}},
    {"id":"u_gen_17_9","support":{"block":12,"hp":67,"vit":18},"power":{"title":"Unbroken Bone","event":"equip","when":"any","target":{"classId":"gravebinder","skill":"gravebinder_0_4"},"effects":[{"kind":"modify","path":"shield","op":"multiply","value":1.6,"label":"bone shield absorption"}],"cd":0}},
    {"id":"u_gen_17_11","support":{"armorPct":119,"resFire":29,"mana":74},"power":{"title":"Patient Stone","event":"equip","when":"any","target":{"classId":"wildkeeper","skill":"wildkeeper_2_2"},"effects":[{"kind":"modify","path":"dur","op":"multiply","value":1.5,"label":"Stone Form duration"}],"cd":0}},
    {"id":"u_gen_18_0","support":{"ias":11,"critChance":4,"str":6,"minionDmgPct":5},"power":{"title":"One More Grave","event":"equip","when":"any","target":{"classId":"gravebinder","skill":"raise_dead"},"effects":[{"kind":"modify","path":"cap","op":"add","value":1,"label":"raised skeletons"}],"cd":0}},
    {"id":"u_gen_18_2","support":{"ias":11,"dex":8,"lifeSteal":3},"power":{"title":"Lingering Frailty","event":"equip","when":"any","target":{"classId":"gravebinder","skill":"mark_of_frailty"},"effects":[{"kind":"modify","path":"dur","op":"multiply","value":1.6,"label":"curse duration"}],"cd":0}},
    {"id":"u_gen_18_4","support":{"dmgPct":64,"critDmg":21,"str":10},"power":{"title":"Unrelenting Dragnet","event":"equip","when":"any","target":{"classId":"veilranger","skill":"veilranger_1_3"},"effects":[{"kind":"modify","path":"radius","op":"multiply","value":1.5,"label":"Dragnet capture radius"}],"cd":0}},
    {"id":"u_gen_18_6","support":{"ias":14,"frw":21,"hp":46,"minionDmgPct":5},"power":{"title":"Rally the Deadhand","event":"equip","when":"any","target":{"classId":"wildkeeper","skill":"feral_howl"},"effects":[{"kind":"modify","path":"dmgBuff","op":"multiply","value":1.5,"label":"companion rally damage bonus"}],"cd":0}},
    {"id":"u_gen_18_8","support":{"spellPct":56,"fcr":16,"mana":54,"minionHpPct":5},"power":{"title":"Sepulcher's Offering","event":"equip","when":"any","target":{"classId":"gravebinder","skill":"gravebinder_0_7"},"effects":[{"kind":"modify","path":"dmg","op":"multiply","value":1.5,"label":"sacrifice explosion damage"}],"cd":0}},
    {"id":"u_gen_18_10","support":{"ias":17,"poisonDmg":43,"dex":20},"power":{"title":"Sorrow Spreads","event":"equip","when":"any","target":{"classId":"gravebinder","skill":"gravebinder_2_1"},"effects":[{"kind":"modify","path":"burstRange","op":"multiply","value":1.6,"label":"Contagion death-burst radius"}],"cd":0}},
    {"id":"u_gen_18_12","support":{"dmgPct":147,"str":24,"resFire":31},"power":{"title":"Bone Through Ruin","event":"equip","when":"any","target":{"classId":"gravebinder","skill":"gravebinder_0_5"},"effects":[{"kind":"modify","path":"dmg","op":"multiply","value":1.45,"label":"Bone Spear damage"}],"cd":0}},
    {"id":"u_gen_19_1","support":{"hp":22,"resAll":6,"str":7},"power":{"title":"Marrow Lesson","event":"equip","when":"any","target":{"classId":"gravebinder","skill":"gravebinder_0_3"},"effects":[{"kind":"rank","value":1}],"cd":0}},
    {"id":"u_gen_19_3","support":{"hp":29,"poisonDmg":15,"vit":9},"power":{"title":"Rot Doctrine","event":"equip","when":"any","target":{"classId":"gravebinder","tree":2},"effects":[{"kind":"rank","value":1}],"cd":0}},
    {"id":"u_gen_19_5","support":{"hp":40,"resFire":18,"resCold":18},"power":{"title":"Venom on the Wind","event":"equip","when":"any","target":{"classId":"wildkeeper","skill":"rabies"},"effects":[{"kind":"modify","path":"cloudRad","op":"multiply","value":1.6,"label":"contagious cloud radius"}],"cd":0}},
    {"id":"u_gen_19_7","support":{"hp":53,"frw":22,"dex":14},"power":{"title":"Binding Miasma","event":"equip","when":"any","target":{"classId":"gravebinder","skill":"gravebinder_2_2"},"effects":[{"kind":"modify","path":"slowPct","op":"add","value":20,"label":"Miasma slow (%)"}],"cd":0}},
    {"id":"u_gen_19_9","support":{"hp":67,"mana":61,"resPoison":25},"power":{"title":"Carrion's Embrace","event":"equip","when":"any","target":{"classId":"gravebinder","skill":"gravebinder_2_3"},"effects":[{"kind":"modify","path":"pStats.poisonDotPct","op":"add","value":25,"label":"poison damage-over-time bonus (%)"}],"cd":0}},
    {"id":"u_gen_19_11","support":{"hp":82,"vit":22,"poisonDmg":48},"power":{"title":"Unbound Outbreak","event":"equip","when":"any","target":{"classId":"gravebinder","skill":"gravebinder_2_7"},"effects":[{"kind":"modify","path":"maxR","op":"multiply","value":1.5,"label":"Outbreak radius"}],"cd":0}},
  ];
  function supportValue(def, stat, floor) {
    const base = DATA.BASES[def.base];
    const families = DATA.AFFIXES.filter(a => !a.proc && !a.perLevel && a.tiers.some(t => t.ilvl <= def.ilvl &&
      (a.stat === stat || t.mods?.some(m => m.stat === stat))));
    const local = families.filter(a => (a.slots.includes("any") || a.slots.includes(base.slot)) && (!a.cats || a.cats.includes(base.cat)));
    const values = (local.length ? local : families).flatMap(a => a.tiers.filter(t => t.ilvl <= def.ilvl).flatMap(tier => {
      const mod = tier.mods ? tier.mods.find(m => m.stat === stat) : tier;
      return mod ? [Math.round(mod.min + .9 * (mod.max - mod.min))] : [];
    }));
    return Math.max(floor, ...values);
  }
  for (const row of equipment) {
    const def = byId[row.id];
    def.stats = Object.fromEntries(Object.entries(row.support).map(([stat, floor]) => [stat, supportValue(def, stat, floor)]));
    add(row.id, row.power);
  }
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
  add("uj_oak", P("Barkskin", "hurt", "melee", W(8, 4), { cd: 8 }));
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
  const living = p => (world()?.minions || []).filter(m => TerrainLayers.same(p,m) && !m.dead && m.owner === p && !m.noAttack);
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
    nearEnemy: p => (world()?.monsters || []).some(m => TerrainLayers.same(p,m) && !m.dead && U.dist(p.x,p.y,m.x,m.y) <= 4),
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
    const add = (item, side) => { for (const a of forItem(item, side)) {
      if (a.power.target && a.power.target.classId !== p.classId) continue;
      if (!found.has(a.key)) found.set(a.key, a);
    } };
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
  function damageFor(p, a, effect, e) {
    // Direct hit payoffs use actual dealt damage; other triggers use item level.
    const amount = (e.damage > 0 ? e.damage : 12 + a.entry.level * 2) * effect.pct / 100;
    // Remove the matching bonus already present in a player hit before applying
    // the effect's element. Ratios also handle partially elemental weapon hits.
    const inherited = e.damage > 0 && e.source === p && ["strike", "spell", "hit", "kill"].includes(a.power.event);
    const ratio = inherited ? e.elementBaseRatios?.[effect.elem] ?? (e.elem === effect.elem ? 1 / DATA.elementMultiplier(p, effect.elem) : 1) : 1;
    return DATA.scaleElement(p, amount * ratio, effect.elem);
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
          target.uniqueDots.push({ key: a.key, owner: p, elem: effect.elem, dps: damageFor(p,a,effect,e) / effect.dur, until: now() + effect.dur });
          Game.addParticle(target.x,target.y,color(effect.elem));
        } break;
      case "slow": case "nova": case "chain": {
        const center = target || p, candidates = (world()?.monsters || []).filter(m => TerrainLayers.same(center,m) && !m.dead && U.dist(center.x,center.y,m.x,m.y) <= effect.radius + (m.radius || 0));
        if (effect.kind === "chain") candidates.sort((a,b) => U.dist2(center.x,center.y,a.x,a.y)-U.dist2(center.x,center.y,b.x,b.y));
        const hits = effect.kind === "chain" ? candidates.filter(m => m !== target).slice(0,effect.count) : candidates;
        if (effect.kind !== "chain") Game.addNova(center.x,center.y,effect.radius,color(effect.elem));
        let last = center;
        for (const m of hits) {
          if (effect.kind === "slow") { if (!m.isBoss && !Game.bossWard?.(m) && (!m.encounter || m.encounter.canDamage())) m.applySlow(effect.dur,effect.pct); continue; }
          if (effect.kind === "chain") { Game.lightningBolt(last.x,last.y,m.x,m.y,color(effect.elem)); last = m; }
          m.takeDamage(damageFor(p,a,effect,e),p,{ elementScaled: true },effect.elem);
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
      if (power.event !== event || power.event === "equip" || !conditions[power.when](p,e)) continue;
      if (power.target && !matches(power.target, e.skill || DATA.SKILLS[e.sourceSkill])) continue;
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
    const e = { target, damage, targetHpBefore: before, crit: !!meta.crit, kind: meta.uniqueEvent, elem: meta.elem || "phys", source: p,
      sourceSkill: meta.sourceSkill, skill: DATA.SKILLS[meta.sourceSkill], elementBaseRatios: meta.elementBaseRatios };
    emit(p,meta.uniqueEvent,e); emit(p,"hit",e);
  }
  function killed(target, source, meta) {
    const p = world()?.player;
    if (!p || source !== p && source?.owner !== p) return;
    emit(p,"kill",{ target, source, crit: !!meta?.crit, kind: meta?.uniqueEvent || "other", elem: meta?.elem, damage: meta?.damage || 0,
      sourceSkill: meta?.sourceSkill || source?.sourceSkill, skill: DATA.SKILLS[meta?.sourceSkill || source?.sourceSkill], elementBaseRatios: meta?.elementBaseRatios });
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
      if (elapsed && !target.dead) guarded(dot.owner,() => target.takeDamage(dot.dps * elapsed,dot.owner,{ uniqueDot:true, elementScaled:true },dot.elem));
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
  function matches(target, skill) {
    return !!skill && skill.cls === target.classId && (!target.skill || target.skill === skill.id) &&
      (target.tree == null || target.tree === skill.tree);
  }
  function rankBonus(p, id) {
    if (!(p.skills[id] > 0)) return 0;
    return stateFor(p).active.reduce((sum, a) => sum + (a.power.target && matches(a.power.target, DATA.SKILLS[id]) ?
      a.power.effects.reduce((n, e) => n + (e.kind === "rank" ? e.value : 0), 0) : 0), 0);
  }
  function modify(result, e) {
    const [root, ...tail] = e.path.split("."), old = result[root];
    const change = v => Array.isArray(v) ? v.map(change) : e.op === "add" ? (v || 0) + e.value : v * e.value;
    const transform = input => {
      if (!tail.length) return change(input);
      const out = copySkill(input || {}); let dest = out;
      tail.forEach((key, i) => { if (i === tail.length - 1) dest[key] = change(dest[key]); else dest = dest[key] ||= {}; });
      return out;
    };
    result[root] = typeof old === "function" ? rank => transform(old(rank)) : transform(old);
  }
  function modifySkill(p, skill) {
    if (!skill) return skill;
    const effects = p.buffs.filter(b => b.uniqueSkill?.skill === skill.id && b.until > now()).map(b => b.uniqueSkill);
    for (const a of stateFor(p).active) if (a.power.target && matches(a.power.target, skill)) {
      effects.push(...a.power.effects.filter(e => e.kind === "modify"));
    }
    if (!effects.length) return skill;
    const result = copySkill(skill);
    for (const e of effects) modify(result, e);
    if (typeof SkillPerks !== "undefined") result.desc = rank => SkillPerks.describe(result,rank) +
      " Brown power: " + effects.map(e => modifierText(e)).join("; ") + ".";
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
  const eventText = { equip: "While equipped", strike: "Weapon hits", spell: "Spell hits", hit: "Weapon or spell hits", kill: "Kills", block: "Blocks", hurt: "Damage received", cast: "Skill uses", spend: "Aether spent", overheal: "Healing beyond full Life", move: "Walking" };
  const modifierText = e => e.op === "add" ? `+${e.value} ${e.label || e.path}` :
    `${Math.round(Math.abs(e.value - 1) * 100)}% ${e.value < 1 ? "less" : "more"} ${e.label || e.path}`;
  function targetText(target) {
    const cls = DATA.CLASSES[target.classId];
    return target.skill ? `${DATA.SKILLS[target.skill].name} (${cls.name})` :
      target.tree != null ? `${cls.trees[target.tree]} tree (${cls.name})` : `${cls.name} talents`;
  }
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
    if (power.event === "equip") return `${power.title} — ${targetText(power.target)}: ` + power.effects.map(e =>
      e.kind === "rank" ? `+${e.value} to learned talent ranks; does not unlock talents or perk choices` : modifierText(e)).join("; ") +
      `. ${DATA.CLASSES[power.target.classId].name} only. Duplicates do not stack.`;
    let trigger = eventText[power.event] + conditionText[power.when];
    if (power.every) trigger += ` (${power.every} ${power.event === "move" ? "yards" : power.event === "spend" ? "Aether" : power.event === "overheal" ? "Life overhealed" : "qualifying events"}${power.sameTarget ? " on the same target" : ""})`;
    if (power.alternate) trigger += "; alternate weapon and spell hits";
    if (power.alternateElement) trigger += "; alternate spell elements";
    return `${power.title} — ${trigger}: ${power.effects.map(e => effectText(e,entry.level,power.event)).join("; ")}. ${power.cd}s cooldown. Duplicates do not stack.`;
  }
  function lines(item, side, viewer) {
    if (item?.identified === false) return [];
    const entry = catalog[itemId(item)]; if (!entry) return [];
    const powers = side && entry.powers.length === 2 ? [entry.powers[side === "wpn" ? 0 : 1]] : entry.powers;
    return powers.map((p,i) => {
      const inactive = viewer && p.target && viewer.classId !== p.target.classId;
      return { t: (entry.powers.length === 2 && !side ? (i ? "In armor: " : "In weapons: ") : "") + describe(entry,p) +
        (inactive ? " Inactive for your class; ordinary item stats still apply." : ""), c: inactive ? "reqbad" : "unique" };
    });
  }
  for (const entry of Object.values(catalog)) for (const p of entry.powers) {
    if (!conditions[p.when] || !eventText[p.event]) throw new Error("Invalid Unique trigger: " + entry.id);
    if (p.target && (!DATA.CLASSES[p.target.classId] || p.target.skill && DATA.SKILLS[p.target.skill]?.cls !== p.target.classId ||
      p.target.tree != null && !DATA.CLASSES[p.target.classId].trees[p.target.tree])) throw new Error("Invalid Unique target: " + entry.id);
    for (const e of p.effects) if (e.kind === "skill" && !DATA.SKILLS[e.skill]?.[e.path]) throw new Error("Invalid Unique skill: " + entry.id);
  }
  return Object.freeze({ VERSION, catalog, collect, sync, emit, guarded, hit, killed, empower, absorb, exposed, tick, tickDots, rankBonus, modifySkill, migrate, migrateSocket, describe, lines, supportValue });
})();
