/* EMBERGRAVE — skill milestones. Catalog, validation and immutable resolution.
   Paths name values actually consumed by combat. Numbers are evaluated at cast
   time; a resolved definition never reads a player's later perk selections. */
"use strict";
const SkillPerks = (() => {
  const tiers = Object.freeze([5, 10]);
  const clone = value => Array.isArray(value) ? value.map(clone) : value && typeof value === "object" ? Object.fromEntries(Object.entries(value).map(([k,v]) => [k,clone(v)])) : value;
  const mul = (path, value) => ({path, op:"multiply", value});
  const add = (path, value) => ({path, op:"add", value});
  const option = (name, ...effects) => ({name,effects});
  const many = (paths, value) => paths.split(" ").map(p => mul(p,value));
  const economy = () => option("Measured Breath", mul("mana",.75));
  const summonEconomy = () => option("Measured Breath", mul("mana",.75), mul("upkeep",.75));
  const aura = (name, stats) => option(name, ...Object.entries(stats).map(([k,v]) => add("auraStats."+k,v)));
  const guard = (name="Sheltering Echo", stat="dodge", value=12) => option(name,add("castStats."+stat,value));
  const power = (paths) => option(({shield:"Dense Bone",retal:"Goring Bone",hp:"Sturdy Lure",healPct:"Healing Surge",dmgBuff:"Roused Host",perQuarry:"Quarry's Wound"})[paths]||"Honed Power",...many(paths,1.2));
  const over = (paths) => option("Unbound Power",...many(paths,1.35),mul("mana",1.15));
  const wide = paths => option(/radius|Radius|Width|width/.test(paths)?"Widening Circle":/arc/.test(paths)?"Sweeping Arc":"Far Reach",...many(paths,1.25));
  const lasting = path => option("Lingering Presence",mul(path,1.35));
  // Three rank-5 improvements, then three independent rank-10 specializations.
  const combat = (damage,reach,a,b) => [power(damage),economy(),wide(reach),over(damage),a,b];
  const area = (s) => combat("dmg","radius",lasting("dur"),option("Relentless Pulse",mul("tickEvery",.8)));
  const profiles = {
    combo: () => combat("dmgMult","tempoDuration",option("Double Time",add("tempoGain",1)),guard("Guarded Rhythm","armor",40)),
    combo_finish: () => combat("dmgMult","range arc",option("Unbroken Rhythm",add("tempoRetain",1)),lasting("shredDur")),
    melee: () => [power("dmgMult"),economy(),option("Marked for Death",add("quarryStacks",1)),over("dmgMult"),option("Skewer the Line",add("perkPierce",1),mul("dmgMult",.85)),guard("Hunter's Poise","critDmg",25)],
    parry_stance: () => [power("riposteMult"),option("Patient Guard",mul("drainPerSec",.75)),lasting("stunDur"),option("Flowing Counter",mul("parryWindow",.75)),option("Aether Reversal",add("parryRefund",3)),over("riposteMult")],
    combat_stance: s => s.stanceId === "bulwark" ? [option("Rooted Steel",mul("rootArmor",1.5)),option("Iron Thorns",add("stats.thorns",15)),option("Deep Reserve",add("stats.hpPct",10)),option("Living Fortress",add("stats.lifeRegen",3)),option("Spellbreak Plate",add("stats.magicReduceFlat",6)),option("Counterweight",add("stats.dmgPct",25))] : [option("Red Hunger",add("stats.lifeSteal",5)),option("Tempered Fury",mul("stats.dmgTakenPct",.8)),option("Long Pursuit",add("stats.frw",12)),option("Bloodied Steel",add("stats.dmgPct",30)),option("Furious Rhythm",add("stats.dmgPerTempo",5)),option("Unyielding Heart",add("stats.hpPct",15))],
    execute: () => [power("base missingHpBonus"),economy(),option("Short Reckoning",mul("cd",.8)),over("base missingHpBonus"),option("Sever the Weak",add("baseThresh",.05)),guard("Executioner's Rush","frw",25)],
    shout: () => [power("healPct"),economy(),wide("radius"),option("Rally the Pack",add("allyHealPct",15)),lasting("rallyDur"),guard("Stand Together","armor",60)],
    fear: () => [lasting("dur"),economy(),wide("radius"),option("Crushing Dread",add("fearWeaken",15)),option("Dread Without End",mul("dur",1.6),mul("mana",1.15)),guard("Courage from Fear","frw",25)],
    banner: () => [power("allyDmg"),economy(),wide("radius"),option("Marching Standard",mul("allyIas",1.4)),lasting("dur"),option("Merciful Standard",add("bannerHeal",1))],
    banner_ultimate: () => [power("heal"),economy(),wide("radius"),option("Last Defiance",mul("allyDmg",1.4)),lasting("dur"),option("Quickened Courage",mul("allyIas",1.4))],
    warshout_debuff: () => [lasting("debuffDuration"),economy(),wide("radius"),option("Demoralize",add("roarWeaken",15)),option("Crippling Word",add("roarSlow",20)),guard("Thunderous Advance","frw",25)],
    charge: () => combat("mult","chargeRange",option("Break the Line",mul("width",1.5)),lasting("stunDur")),
    grapple: () => combat("mult","grappleRange",lasting("stunDur"),guard("Chain Guard","armor",60)),
    thrown: () => combat("mult","throwRange",option("Twin Return",add("count",1)),guard("Axe Dancer","ias",20)),
    shockwave: s => combat(s.mult?"mult":"dmg","range",wide("waveWidth"),lasting("stun")),
    bash: () => combat("dmgMult","range arc",option("Wallbreaker",mul("knockback",1.5)),guard("Shield Wall","armor",60)),
    leap: () => combat("dmgMult","leapRange",wide("radius"),guard("Skyfall Aegis","armor",60)),
    projectile: s => [power("dmg"),economy(),option("Swift Flight",mul("projSpeed",1.3)),over("dmg"),option("Through the Veil",add("perkPierce",1),mul("dmg",.8)),s.scorch?option("Hungry Embers",mul("scorch",1.6)):s.chill?lasting("chill"):option("Virulent Spittle",mul("pdot",1.6))],
    fan: s => [power("dmg"),economy(),option("Gathered Sparks",mul("spread",.6)),option("Forked Volley",add("count",2),mul("dmg",.9)),s.buildStatic?option("Charged Filaments",add("staticPerHit",1)):option("Hungry Embers",mul("scorch",1.6)),option("Piercing Fan",add("perkPierce",1),mul("dmg",.8))],
    pierce: s => [power("dmg"),economy(),option("Long Lance",mul("projTtl",1.35)),over("dmg"),s.chill?lasting("chill"):guard("Marrow Shelter","armor",50),option("Fleet Lance",mul("projSpeed",1.4))],
    chain: () => [power("dmg"),economy(),option("Another Link",add("jumps",1)),over("dmg"),option("Unending Links",add("jumps",2)),lasting("chill")],
    lightning: () => [power("dmg"),economy(),option("Forked Arc",add("jumps",1)),over("dmg"),option("Storm Network",add("jumps",2)),guard("Stormstride","frw",25)],
    firewall: () => [power("dmg"),economy(),wide("len"),over("dmg"),lasting("dur"),guard("Cinder Mantle","armor",50)],
    meteor: () => combat("dmg","radius",option("Falling Star",mul("delay",.5)),lasting("stun")),
    pyreblast: () => combat("dmg","radius",option("Debt of Ash",mul("perStack",1.5)),option("Rekindle",add("pyreChance",.15))),
    groundfield: s => s.fieldKind === "smoke" ? [lasting("dur"),economy(),wide("radius"),option("Thick Shroud",add("selfDodge",10)),option("Enveloping Night",mul("radius",1.5),mul("mana",1.15)),guard("Ambusher's Step","frw",25)] : area(s),
    freezenova: () => combat("dmg","radius",lasting("freeze"),guard("Rime Refuge","armor",50)),
    buff: s => s.id === "rimeguard" ? [option("Frostbite Reprisal",mul("retal",1.3)),economy(),option("Rime Plating",add("buff.stats.armor",35)),option("Glacial Shelter",add("buff.stats.hpPct",15)),lasting("buff.dur"),option("Frozen Resolve",add("buff.stats.ccReduce",10))] : [option("Bright Current",add("buff.stats.lightDmg",8)),economy(),option("Storm Reserve",add("buff.stats.mana",25)),option("Charged Mind",add("buff.stats.spellPct",20)),lasting("buff.dur"),option("Lightning Reflex",add("buff.stats.dodge",10))],
    balllightning: () => [power("dmg"),economy(),lasting("dur"),over("dmg"),wide("orbRadius"),option("Rapid Discharge",mul("orbTick",.8))],
    arcblink: () => combat("dmg","blinkRange",wide("radius"),guard("Storm Shelter","dodge",15)),
    overloadnuke: () => combat("dmg","radius",option("Charged Core",mul("perStatic",1.5)),option("Residual Static",add("staticRetain",.25))),
    summon: s => s.minion === "ent" ? [aura("Ancient Might",{dmgPct:12,spellPct:12}),aura("Sheltering Boughs",{dmgReducePct:10}),aura("Living Sap",{lifeRegen:2}),aura("Rustling Haste",{ias:20}),aura("Bramble Ward",{thorns:20}),aura("Forest Stride",{frw:20})] : [option("Savage Bond",mul("minionStats.dmg",1.2)),summonEconomy(),option("Stalwart Bond",mul("minionStats.hp",1.25)),option("Growing Host",add("cap",1)),option("Frenzied Bond",mul("minionStats.atkRate",1.25)),option("Hunting Bond",mul("minionStats.speed",1.3),mul("minionStats.hp",1.15))],
    summon_golem: () => [power("slamDmg"),summonEconomy(),option("Dense Stitching",mul("golemHp",1.25)),option("One More Soul",add("maxCorpses",1)),option("Bone Colossus",mul("golemHp",1.4)),option("Gather the Fallen",mul("gatherRadius",1.5),mul("growDmg",1.5))],
    ward: () => [power("shield"),economy(),power("retal"),option("Ossuary Aegis",mul("shield",1.4)),lasting("dur"),guard("Marrow Vigor","lifeRegen",4)],
    minionbuff: s => [power("dmgBuff"),economy(),lasting("dur"),option("Blood Frenzy",mul("dmgBuff",1.4)),s.id === "feral_howl" ? option("Echoing Howl",mul("cd",.75)) : option("Mend the Host",mul("heal",2)),guard("Master's Shelter","armor",60)],
    sacrifice: s => s.mode === "one" ? [power("healPct"),economy(),wide("fieldRadius"),option("Deep Regrowth",mul("fieldHeal",1.5)),lasting("fieldTtl"),guard("Gift of the Pack","dmgPct",30)] : combat("dmg","radius",guard("Ossuary Shelter","armor",60),guard("Soul-fed Pyre","spellPct",25)),
    curse: s => [lasting("dur"),economy(),wide("radius"),option("Deep Hex",add("pct",10)),s.slowPct?option("Withering Roots",add("slowPct",10)):option("Ruinous Hex",add("pct",15),mul("mana",1.2)),guard("Whisperer's Step","frw",25)],
    doom: () => [power("dmgLo dmgHi"),economy(),wide("radius"),over("dmgLo dmgHi"),option("Hastened Doom",mul("timer",.6)),guard("Borrowed Life","lifeRegen",4)],
    taunt_curse: () => [lasting("dur"),economy(),wide("radius"),option("Endless Invitation",mul("dur",1.6)),option("Gathering Souls",mul("radius",1.5),mul("mana",1.15)),guard("Veiled Beckoner","dodge",15)],
    siphon_beam: () => [power("tickDmg"),option("Patient Siphon",mul("mana",.75),mul("manaPerSec",.75)),lasting("maxChannel"),over("tickDmg"),option("Thirsting Soul",mul("drain",1.5)),option("Ravenous Tether",mul("tickRate",.8))],
    reap: () => combat("dmg","radius arc",option("Hex Reaper",mul("bonusVsCursed",1.5)),option("Soul Feast",mul("reapHeal",1.75))),
    plague_seed: () => [power("tick"),economy(),wide("spreadRange"),over("tick"),option("Bursting Infection",mul("burstRange",1.25)),lasting("dur")],
    devour: () => [power("healPct"),economy(),wide("devourRadius"),option("Feast for the Host",add("devourMinionHeal",15)),option("Soul Sustenance",add("devourMana",15)),guard("Carrion Shelter","armor",60)],
    corpse: () => combat("dmg","radius",wide("castRange"),guard("Carrion Feast","lifeRegen",4)),
    corpse_launch: () => combat("dmg","sprayRadius",wide("castRange"),option("Cadaver Hammer",mul("knockback",1.5))),
    outbreak: () => [power("tick"),economy(),wide("maxR"),option("Rupturing Dead",mul("corpseDmg",1.5)),over("tick"),option("Swift Pestilence",mul("dur",.6))],
    wfan: () => [power("dmgMult"),economy(),option("Tight Volley",mul("spread",.6)),option("Featherstorm",add("count",2),mul("dmgMult",.9)),option("Deep Quarry",add("quarryStacks",1)),option("Piercing Volley",add("perkPierce",1),mul("dmgMult",.8))],
    charge_shot: () => [power("dmgMax"),economy(),option("Quick Draw",mul("maxDraw",.8)),over("dmgMax"),option("Quarry's End",mul("quarryBonus",1.5)),option("Snap Draw",mul("maxDraw",.6))],
    ricochet: () => [power("dmgMult"),economy(),option("Trick Shot",add("bounces",1)),over("dmgMult"),option("Never Miss a Turn",add("bounces",2)),guard("Ricochet Rhythm","ias",20)],
    wpierce: () => [power("dmgMult"),economy(),option("Long Skewer",mul("weaponTtl",1.35)),over("dmgMult"),guard("Hunter's Tempo","ias",20),guard("Skirmisher's Guard","dodge",15)],
    rain: () => combat("dmgMult","radius",lasting("dur"),guard("Rainrunner","frw",25)),
    trap: () => combat("dmg","radius",option("Hair Trigger",mul("trapArm",.5),mul("trapTrigger",1.25)),option("Patient Snare",mul("trapTtl",1.5))),
    dragnet: () => [wide("radius"),economy(),power("dmg"),option("Binding Mesh",mul("root",1.35)),option("Quick Retrieval",mul("cd",.75)),over("dmg")],
    umbral_knife: () => [power("dmgMult"),economy(),wide("castRange"),over("dmgMult"),option("Lasting Opening",mul("exposeDuration",1.5)),option("Fleeting Blade",mul("attackCycle",.85))],
    dusk_cleave: () => [power("dmgMult"),economy(),wide("range"),over("dmgMult"),option("Open Guard",add("exposedBonus",15)),option("Returning Dusk",mul("cd",.75))],
    shadow_flurry: () => [power("dmgMult"),economy(),wide("radius"),over("dmgMult"),option("Seven Shadows",add("count",2)),option("Relentless Flurry",mul("cd",.75))],
    deathblow: () => [power("dmgMult"),economy(),wide("castRange"),over("dmgMult"),option("Final Opening",add("missingHpBonus",.25)),option("Swift Verdict",mul("cd",.75))],
    tripwire: () => [power("dmg bleed"),economy(),wide("length"),over("dmg bleed"),option("Grasping Wire",mul("root",1.35)),option("Patient Wire",mul("ttl",1.35))],
    decoy: () => [power("hp"),economy(),wide("taunt"),option("Convincing Lure",mul("hp",1.5)),lasting("lifetime"),guard("Hidden Hunter","dodge",15)],
    blink: () => [wide("blinkRange"),economy(),guard("Hidden Step","dodge",10),option("Far Beyond",mul("blinkRange",1.5),mul("mana",1.15)),guard("Ambush","dmgPct",30),guard("Fleet Shadow","frw",30)],
    weapon_coat: () => [power("pdot"),economy(),lasting("dur"),over("pdot"),option("Deep Wounds",mul("coatDuration",1.5)),guard("Serrated Rhythm","ias",20)],
    deathmark: () => [power("detDmg"),economy(),lasting("dur"),option("Fatal Verdict",add("amp",10)),over("detDmg"),guard("Marked Pursuit","frw",25)],
    afterimage: () => [lasting("lifetime"),economy(),wide("range"),option("Solid Echo",mul("hp",2)),option("Irresistible Echo",mul("taunt",1.25)),guard("Hidden in Motion","dodge",15)],
    detonate_dots: () => [power("dotMult"),economy(),power("perQuarry"),over("dotMult"),option("Final Verdict",mul("markBonus",1.5)),guard("Blood Rush","ias",20)],
    totem: s => [power("dmg"),economy(),wide("radius"),option("Sacred Grove",add("cap",1)),lasting("ttl"),s.totemKind === "tempest" ? option("Storm Nursery",mul("wispCd",.6)) : option("Rapid Thunder",mul("zapCd",.75))],
    roamaoe: () => combat("dmg","radius",option("Hungering Wind",mul("pull",1.5),mul("drift",1.25)),lasting("ttl")),
    form: s => [option("Primal Might",add("formStats.dmgPct",20)),option("Living Hide",add("formStats.hpPct",10)),option("Hunting Shape",add("formStats.frw",12)),option("Predator's Rhythm",add("formStats.ias",20)),option("Wild Renewal",add("formStats.lifeRegen",3)),option("Elemental Hide",add("formStats.magicReduceFlat",6))],
    rabies: () => [power("dmgMult"),economy(),wide("cloudRad"),over("dmgMult"),lasting("dur"),guard("Rabid Pursuit","frw",25)],
    fireclaw: () => [power("dmg meleeMult"),economy(),wide("waveRange"),option("Wildfire Wake",add("explosions",2)),wide("boomRadius"),lasting("dur")],
  };
  // Passives use deliberate additions, not blanket multiplication of flags or
  // capped defenses. Each remains useful at both milestone ranks.
  const passiveSpecs = {
    vanguard_0_3: [["Sure Hand",{arPct:25}],["Heavy Steel",{dmgPct:12}],["Fencer",{ias:8}],["Long Rhythm",{tempoCapBonus:1}],["Measured Fury",{dmgPerTempo:4}],["Steel Reprisal",{thorns:20}]],
    vanguard_1_3: [["Steady Mind",{ccReduce:10}],["Stout Heart",{hpPct:8}],["Resolve",{lifeRegen:1}],["Battle Composure",{ccReduce:15}],["Iron Constitution",{hpPct:15}],["Spellward",{magicReduceFlat:5}]],
    vanguard_2_3: [["Long March",{frw:8}],["Second Wind",{lifeRegen:1}],["Sure Foot",{dodge:5}],["Dancing Steel",{ias:15}],["Unbroken Pace",{tempoWindowBonus:2}],["Hardy Traveler",{hpPct:15}]],
    emberwitch_0_2: [["Hotter Embers",{scorchPct:20}],["Cinder Soul",{spellPct:10}],["Ash Reserve",{mana:25}],["Furnace Heart",{scorchPct:40}],["Fire Eater",{manaAfterKill:4}],["Flameweaver",{fcr:15}]],
    emberwitch_1_2: [["Cold Fracture",{coldVsFrozenPct:15}],["Shatter",{shatterRank:2}],["Winter Well",{mana:25}],["Frozen Ruin",{shatterRank:4}],["Stillness",{coldVsFrozenPct:30}],["Winter Shelter",{hpPct:15}]],
    gravebinder_0_3: [["Dense Marrow",{minionHpPct:20}],["Bone Spines",{minionThorns:6}],["Cruel Pact",{minionDmgPct:12}],["Poisoned Bones",{minionPoison:12}],["Legion's Vigor",{minionHpPct:40}],["Death's Due",{manaAfterKill:4}]],
    gravebinder_1_4: [["Lasting Whispers",{curseDurPct:15}],["Far Whispers",{curseRadiusPct:12}],["Black Tongue",{spellPct:10}],["Deathly Chorus",{curseRadiusPct:25}],["Hex-fed Soul",{soulCharge:2}],["Quiet Hunger",{manaAfterKill:4}]],
    gravebinder_1_6: [["Soul Appetites",{soulCharge:1}],["Deep Vessel",{mana:25}],["Harvest Rhythm",{fcr:8}],["Ravenous Harvest",{soulCharge:2}],["Grave Sustenance",{lifeOnDeath:12}],["Death's Wellspring",{manaAfterKill:4}]],
    gravebinder_2_3: [["Virulence",{poisonDotPct:15}],["Far Spores",{plagueSpreadPct:10}],["Carrion Reserve",{mana:25}],["Black Bloom",{poisonDotPct:30}],["Spore Tide",{plagueSpreadPct:15}],["Carrion Feast",{lifeOnDeath:12}]],
    kinship: [["Deep Bond",{minionHpPct:20}],["Pack Breath",{pManaPerBeast:1}],["Shared Hunt",{minionDmgPct:12}],["Pack Sustenance",{pManaPerBeast:2}],["Kindred Vigor",{hpPct:15}],["Savage Kin",{minionDmgPct:25}]],
    totem_mastery: [["Lasting Wood",{totemTtl:.2}],["Storm Core",{totemPower:12}],["Root Reserve",{mana:25}],["Sacred Circle",{totemCapacity:1}],["Heart of Thunder",{totemPower:25}],["Ancient Roots",{totemTtl:.4}]],
    wildkeeper_1_4: [["Deep Sap",{manaRegen:20}],["Living Well",{mana:30}],["Green Renewal",{lifeRegen:1}],["Storm Sap",{spellPct:20}],["Bottomless Roots",{manaRegen:40}],["Sap-fed Vigor",{hpPct:15}]],
    primal_surge: [["Wild Spark",{primalProc:2}],["Primal Strength",{dmgPct:12}],["Restless Beast",{ias:8}],["Awakening Shock",{shiftRadius:3,shiftStun:.6}],["Raging Spark",{primalProc:4}],["Beast's Hunger",{lifeSteal:5}]],
    veilranger_0_3: [["Steady Sight",{critChance:3}],["Cruel Aim",{critDmg:20}],["Light Draw",{ias:8}],["Heartseeker",{critDmg:40}],["Hawk's Patience",{critChance:5}],["Hunter's Reward",{manaAfterKill:4}]],
    veilranger_0_5: [["Deep Wounds",{bleedDps:6}],["Hunter's Pace",{ias:8}],["Blood Trail",{frw:8}],["Relentless Wounds",{bleedDps:12}],["Killing Instinct",{critChance:5}],["Hunter's Reward",{manaAfterKill:4}]],
    veilranger_1_6: [["Open Wounds",{snareConditionPct:5}],["Sharpened Snares",{trapPct:10}],["Quick Hands",{ias:8}],["Merciless Setup",{snareConditionPct:10}],["Deadly Snares",{trapPct:20}],["Hunter's Pursuit",{frw:15}]],
    veilranger_1_1: [["Sharpened Teeth",{trapPct:20}],["Spare Parts",{trapCap:1}],["Light Kit",{frw:8}],["Killing Springs",{trapPct:40}],["Quick Assembly",{armSpeed:30}],["Prepared Ground",{trapCap:2}]],
    veilranger_2_2: [["Quick Feet",{frw:8}],["Fast Hands",{ias:8}],["Dancing Shadow",{dodge:5}],["Blur",{dodge:10}],["Killing Rhythm",{ias:15}],["Windrunner",{frw:15}]],
  };
  const defaults = {
    combo:{tempoGain:()=>1,tempoDuration:()=>4}, combo_finish:{tempoRetain:()=>0},
    parry_stance:{parryWindow:()=>.6,parryRefund:()=>4}, shout:{allyHealPct:()=>25},
    fear:{fearWeaken:()=>0}, banner:{bannerHeal:()=>0},
    warshout_debuff:{debuffDuration:()=>6,roarSlow:()=>15,roarWeaken:()=>0},
    pyreblast:{pyreChance:rk=>.10+.02*rk}, balllightning:{orbRadius:()=>3,orbTick:()=>.35},
    overloadnuke:{staticRetain:()=>0}, summon_golem:{golemHp:rk=>100+30*rk},
    devour:{devourRadius:()=>9,devourMinionHeal:()=>10,devourMana:()=>0},
    trap:{trapArm:()=>.7,trapTrigger:()=>1.25,trapTtl:()=>24}, weapon_coat:{coatDuration:()=>4},
  };
  function baseSkill(sk) {
    return {...{castStats:()=>({}),castBuffDuration:()=>3,perkPierce:0,quarryStacks:()=>1,staticPerHit:()=>1,weaponTtl:()=>2.2,projTtl:()=>2.2},...defaults[sk.type],...sk};
  }
  function valueAt(sk,path,rk) {
    const parts=path.split("."), root=sk[parts.shift()];
    let v=typeof root === "function" ? root(rk) : root;
    for(const p of parts) v=v?.[p];
    return v;
  }
  function modify(sk,effect) {
    const [root,...tail]=effect.path.split("."), old=sk[root];
    const transform = input => {
      const change = v => Array.isArray(v) ? v.map(change) : effect.op === "add" ? (v || 0)+effect.value : v*effect.value;
      if(!tail.length) return change(input);
      const result=clone(input || {}); let dest=result;
      tail.forEach((key,i)=>{if(i===tail.length-1)dest[key]=change(dest[key]);else dest=dest[key] ||= {};});
      return result;
    };
    sk[root] = typeof old === "function" ? rk=>transform(old(rk)) : transform(old);
  }
  const labels = {
    exposeDuration:"Exposed duration",exposedBonus:"damage against Exposed (%)",attackCycle:"attack-cycle duration",
    dmg:"damage",dmgMult:"weapon damage",mult:"weapon damage",base:"base weapon damage",missingHpBonus:"damage against wounded enemies",baseThresh:"execution health threshold",cd:"cooldown",mana:"aether cost",range:"reach",radius:"radius",arc:"cleave angle",dur:"duration",ttl:"lifetime",count:"projectile count",projSpeed:"projectile speed",projTtl:"projectile lifetime",weaponTtl:"arrow lifetime",spread:"volley spread",jumps:"chain jumps",bounces:"ricochets",burn:"burn damage",chill:"chill duration",pdot:"poison damage",scorch:"Scorch damage",freeze:"freeze duration",delay:"impact delay",len:"wall length",tickEvery:"pulse interval",tickRate:"channel tick interval",tickDmg:"channel damage per tick",drain:"life drained",manaPerSec:"aether drained per second",maxChannel:"channel duration",timer:"Doom timer",dmgLo:"minimum detonation damage",dmgHi:"maximum detonation damage",pct:"curse strength",slowPct:"slow strength",retal:"retaliation damage",shield:"shield absorption",castRange:"cast reach",cap:"summon limit",minionStats:"companion stats",pStats:"passive stats",stats:"stance stats",formStats:"shape stats",healPct:"healing (% of maximum life)",heal:"companion healing (%)",dmgBuff:"companion damage bonus",rallyDur:"rally duration",runPct:"rally movement bonus",allyDmg:"allied damage bonus",allyIas:"allied attack-speed bonus",enemyDmg:"enemy damage reduction",allyHealPct:"companion healing (%)",riposteMult:"counter weapon damage",stunDur:"stun duration",drainPerSec:"aether drained per second",rootArmor:"armor gained while rooted",chargeRange:"charge reach",grappleRange:"chain reach",throwRange:"throw reach",width:"charge width",waveWidth:"fissure width",kbForce:"knockback distance",knockback:"knockback distance",stun:"stun duration",leapRange:"leap reach",blinkRange:"blink reach",shredDur:"armor-shred duration",tempoGain:"Tempo generated",tempoDuration:"Tempo window",tempoRetain:"Tempo retained after the finisher",parryWindow:"time between parries",parryRefund:"aether returned per parry",fearWeaken:"damage reduction on frightened enemies (%)",bannerHeal:"allied healing per second (%)",debuffDuration:"roar duration",roarSlow:"roar slow (%)",roarWeaken:"roar damage reduction (%)",perStack:"damage per Scorch stack",pyreChance:"repeat-Pyre chance per stack",orbRadius:"arc radius",orbTick:"arc interval",perStatic:"damage per Static",staticRetain:"Static retained after Overload",staticPerHit:"Static per projectile hit",golemHp:"golem base life",growHp:"life per additional stitch",growDmg:"damage per additional stitch",slamDmg:"golem slam damage",maxCorpses:"maximum stitches",gatherRadius:"corpse-gathering radius",tauntRadius:"golem taunt radius",fieldRadius:"regrowth radius",fieldTtl:"regrowth duration",fieldHeal:"regrowth healing per second (%)",tick:"plague damage per second",spreadRange:"plague spread reach",burstRange:"plague burst radius",devourRadius:"corpse search radius",devourMinionHeal:"companion healing (%)",devourMana:"aether restored (% of maximum)",sprayRadius:"poison spray radius",bonusVsCursed:"damage bonus against cursed foes",reapHeal:"life reaped per cursed foe",maxR:"outbreak radius",corpseDmg:"corpse rupture damage",dmgMin:"minimum draw weapon damage",dmgMax:"full-draw weapon damage",maxDraw:"full-draw time",quarryBonus:"damage bonus per Quarry stack",quarryStacks:"Quarry stacks per hit",length:"wire length",bleed:"bleeding damage per second",root:"root duration",hp:"lure life",taunt:"taunt radius",lifetime:"lure lifetime",amp:"marked damage taken (%)",detDmg:"mark detonation damage",dotMult:"remaining-wound damage multiplier",perQuarry:"weapon damage per Quarry (%)",markBonus:"weapon damage per Killing Mark (%)",zapCd:"totem attack interval",pulseCd:"storm ring interval",wispCd:"wisp interval",tickCd:"cyclone tick interval",drift:"cyclone pursuit speed",pull:"cyclone pull",waveRange:"fire-wave reach",explosions:"fire explosions",boomRadius:"fire explosion radius",meleeMult:"claw weapon damage",dmgBoost:"Fire Claw damage bonus",cloudRad:"contagious cloud radius",trapArm:"arming time",trapTrigger:"trigger radius",trapTtl:"trap lifetime",coatDuration:"wound duration",selfDodge:"evasion inside smoke (%)"
  };
  const statLabel = key => ({totemPower:"Totem Damage",totemCapacity:"Maximum Totems",totemTtl:"Totem Lifetime",armSpeed:"Trap Arming Speed",trapCap:"Maximum Traps",pManaPerBeast:"Aether Regeneration per Beast",shiftRadius:"Shockwave Radius on Shifting",shiftStun:"Stun Duration on Shifting"})[key];
  const number = n => Number(n.toFixed(2)).toString();
  function statText(key,value) {
    if(key === "totemTtl") return `+${number(value*100)}% Totem Lifetime`;
    if(key === "totemPower")return `+${number(value)}% Totem Damage`;
    if(key === "armSpeed")return `+${number(value)}% Trap Arming Speed`;
    if(key === "pManaPerBeast")return `+${number(value)} Aether per second per living beast`;
    if(key === "dmgPerTempo")return `+${number(value)} Damage per Tempo`;
    if(key === "tempoCapBonus")return `+${number(value)} Maximum Tempo`;
    if(key === "tempoWindowBonus")return `+${number(value)}s Tempo Duration`;
    if(statLabel(key)) return `+${number(value)} ${statLabel(key)}`;
    return DATA.STAT_TEXT[key]?.(value) || `+${number(value)} ${key.replace(/([A-Z])/g," $1").toLowerCase()}`;
  }
  function effectText(e) {
    const [root,...tail]=e.path.split(".");
    if(root === "auraStats") return `Aura: ${statText(tail[0],e.value)} for you and allies within 6y of a living Ent`;
    if(root === "upkeep") return `−${number((1-e.value)*100)}% aether upkeep per companion per second`;
    if(root === "pStats"&&tail[0] === "shatterRank")return `+${number(e.value*3)} Cold damage to shatter explosions`;
    if(root === "pStats"&&tail[0] === "primalProc")return `+${number(e.value)} percentage points to Primal Surge's trigger chance`;
    if(root === "pStats"&&tail[0] === "soulCharge")return `+${number(e.value)}% Spell Power per Soul Charge stack`;
    if(["castStats","pStats","stats","formStats"].includes(root) && e.op === "add") return `${statText(tail[0],e.value)}${root === "castStats"?" for 3s after using this skill":root === "formStats"?" while in this shape":root === "stats"?" while this stance is active":""}`;
    if(["baseThresh","pyreChance","missingHpBonus"].includes(root)&&e.op === "add")return `+${number(e.value*100)} percentage points to ${labels[root]}`;
    if(root === "staticRetain")return `Retain ${number(e.value*100)}% of spent Static`;
    if(root === "perkPierce") return "Projectiles pierce every foe in their path";
    const nested={"minionStats.dmg":"companion damage","minionStats.hp":"companion life","minionStats.atkRate":"companion attack speed","minionStats.speed":"companion movement speed","buff.dur":"buff duration"};
    if(root === "buff" && tail[0] === "stats") return `${statText(tail[1],e.value)} while the buff is active`;
    const label=nested[e.path] || labels[root];
    if(!label) throw new Error("Missing perk label: "+e.path);
    return e.op === "multiply" ? `${e.value>=1?"+":"−"}${number(Math.abs(e.value-1)*100)}% ${label}` : `+${number(e.value)} ${label}`;
  }
  const catalog={};
  for(const sk of Object.values(DATA.SKILLS)) {
    const defs=sk.type === "passive" ? passiveSpecs[sk.id]?.map(([name,stats])=>option(name,...Object.entries(stats).map(([k,v])=>add("pStats."+k,v)))) : profiles[sk.type]?.(sk);
    if(!defs || defs.length!==6) throw new Error(`Missing six perk choices for ${sk.id}`);
    const base=baseSkill(sk);
    defs.forEach(d=>d.effects.forEach(e=>{
      const v=valueAt(base,e.path,5);
      if(e.op === "multiply" && !(typeof v === "number" && v!==0 || Array.isArray(v) && v.some(x=>x!==0))) throw new Error(`${sk.id}: ineffective perk ${e.path}`);
    }));
    catalog[sk.id]=Object.fromEntries(tiers.map((tier,i)=>[tier,defs.slice(i*3,i*3+3).map((d,j)=>Object.freeze({id:`${sk.id}_r${tier}_${j+1}`,name:`${sk.name}: ${d.name}`,title:d.name,description:d.effects.map(effectText).join("; ")+".",effects:d.effects}))]));
  }
  DATA.SKILL_PERKS=catalog;
  DATA.STAT_TEXT.totemPower=v=>`+${v}% Totem Damage`;
  DATA.STAT_TEXT.totemCapacity=v=>`+${v} Maximum Totems`;
  labels.slowDur="slow duration";
  labels.spread="volley half-angle";
  labels.scorch="Scorch damage per stack per second";
  function selected(player,id) {
    const sk=DATA.SKILLS[id]; if(!sk || sk.cls!==player.classId) return [];
    return tiers.flatMap(t=> (player.skills[id]||0)>=t ? (catalog[id][t].find(p=>p.id===player.skillPerks?.[id]?.[t]) || []) : []);
  }
  function normalize(player,input) {
    const result={};
    if(!input || typeof input!=="object" || Array.isArray(input)) return result;
    for(const sk of Object.values(DATA.SKILLS)) {
      if(sk.cls!==player.classId)continue;
      for(const t of tiers) if((player.skills[sk.id]||0)>=t && catalog[sk.id][t].some(p=>p.id===input[sk.id]?.[t])) (result[sk.id] ||= {})[t]=input[sk.id][t];
    }
    return result;
  }
  function pending(player,id) {
    const skills=id?[DATA.SKILLS[id]]:Object.values(DATA.SKILLS);
    return skills.reduce((n,sk)=>n+(!sk || sk.cls!==player.classId?0:tiers.filter(t=>(player.skills[sk.id]||0)>=t && !selected(player,sk.id).some(p=>catalog[sk.id][t].includes(p))).length),0);
  }
  function choose(player,id,tier,perkId) {
    if(!tiers.includes(tier)||!catalog[id]||DATA.SKILLS[id].cls!==player.classId||(player.skills[id]||0)<tier) return false;
    const clean=normalize(player,player.skillPerks);
    if(clean[id]?.[tier]||!catalog[id][tier].some(p=>p.id===perkId))return false;
    (clean[id] ||= {})[tier]=perkId; player.skillPerks=clean; player._perkCache=null; player.computeStats(); return true;
  }
  const mechanics = {
    umbral_knife:"Throw a blade that stops at the first enemy or wall. A damaging hit applies non-stacking Exposed. Works with any weapon.",dusk_cleave:"Sweep a 140° cone, striking each enemy once. Exposed increases damage without being consumed. Works with any weapon.",shadow_flurry:"Blades visit each enemy in the area before repeating; a lone enemy receives every blade. Exposed increases each hit. Works with any weapon.",deathblow:"Throw a heavy blade that stops at its first hit. Missing life and Exposed increase damage; a damaging hit detonates Killing Mark exactly once. Works with any weapon.",
    combo:"Strike and build Tempo.",combo_finish:"Spend Tempo to cleave and shred armor; each Tempo widens and strengthens the cleave.",melee:"A precise weapon attack that marks Quarry when fired as an arrow.",parry_stance:"Toggle a stance that negates a melee blow and counters. Drains aether while active.",combat_stance:"Toggle this combat stance. Only one stance can be active.",execute:"Strike harder against wounded enemies. Tempo adds 5 percentage points to the execution threshold per stack. Bosses cannot be executed; kills refund Tempo and reset the cooldown.",shout:"Heal yourself, cleanse slows and rally nearby companions.",fear:"Nearby enemies flee; bosses are slowed instead.",banner:"Plant a standard that strengthens allies and weakens enemies inside it.",banner_ultimate:"Plant a healing standard that strengthens allies and weakens enemies inside it.",warshout_debuff:"A roar that adds two armor-shred stacks (maximum three) and slows foes.",charge:"Charge through a lane, knocking foes aside and stunning the first.",grapple:"Pull a foe to you; against a boss, pull yourself toward it.",thrown:"Throw piercing axes that strike on their outward and returning paths.",shockwave:"A travelling fissure hits and stuns each foe once.",bash:"Bash a cone, knocking enemies back; a wall collision extends the stun.",leap:"Leap to a supported landing and strike nearby enemies.",projectile:"Launch an elemental bolt.",fan:"Launch a fan of elemental bolts.",pierce:"Drive a lance through every foe in line.",chain:"A bolt jumps between foes, losing 15% damage per jump.",lightning:"Instant lightning forks between foes.",firewall:"Lay a burning line that damages foes every 0.4s.",meteor:"Mark a point for a delayed impact.",pyreblast:"Consume Scorch stacks in a blast. Each consumed stack can cause a follow-up blast; follow-ups cannot repeat.",groundfield:"Place a persistent field.",freezenova:"Damage and freeze foes around you.",buff:"Apply a protective or empowering buff.",balllightning:"Release a drifting orb that arcs to nearby enemies.",arcblink:"Blink to a walkable point and discharge lightning on arrival.",overloadnuke:"Consume Static to strengthen a stunning blast.",summon:"Call a companion; raising undead consumes a corpse. At the limit, replace the most wounded of this kind.",summon_golem:"Consume corpses to stitch a golem; recast to heal and grow it.",ward:"Raise an absorbing bone shield with melee retaliation.",minionbuff:"Heal and empower your living companions.",sacrifice:"Sacrifice companions for an explosion, or a beast for healing and regrowth.",curse:"Hex enemies in an area.",doom:"Brand a foe with a charging death timer; death or expiry detonates it. An early detonation deals 50–100% of its full damage.",taunt_curse:"Lure cursed enemies to a chosen point.",siphon_beam:"Channel a tether that follows and reacquires foes, ramps its damage and restores life.",reap:"Reap a scythe arc; cursed foes take extra damage and restore life. Consumes curses and detonates Doom.",plague_seed:"Infect a foe with a plague that spreads to healthy enemies and bursts on death.",devour:"Consume a corpse to heal, cleanse poison and slows, and heal nearby companions.",corpse:"Consume a corpse in a poisonous explosion.",corpse_launch:"Hurl a corpse, spraying poison and knocking foes back; the body lands as a fresh corpse.",outbreak:"Expand a plague ring that infects enemies and ruptures corpses.",wfan:"Fire a spread of arrows that mark Quarry.",charge_shot:"Hold to draw, then release a piercing arrow. Full draw increases piercing and consumes Quarry for bonus damage.",ricochet:"An arrow ricochets between enemies and off walls, losing 12% damage per enemy bounce.",wpierce:"An arrow pierces every foe in line.",rain:"Rain arrows into an area, dealing 25% extra damage to Quarry.",trap:"Plant a trap that arms before it can trigger.",dragnet:"Throw a net after a 0.4s wind-up. Deal physical trap damage, pull enemies together over 0.3s, then root them (maximum 3s). Bosses receive a 40% slow instead. Works with any weapon.",tripwire:"String a wire; the first crossing triggers damage, bleeding and a root along its length.",decoy:"Leave a taunting lure that scatters caltrops when it expires.",blink:"Slip through shadow to a walkable destination. Shadowstep grants Shadow Ambush for 3s: your next Veil attack deals 25% extra damage for its entire cast.",weapon_coat:"Coat arrows with poison wounds. A stronger wound replaces a weaker one; they do not stack.",deathmark:"Mark one foe to amplify damage taken; death or expiry detonates and spreads a half-strength mark.",afterimage:"Roll forward and leave a taunting echo at your origin.",detonate_dots:"Consume remaining bleed and poison wounds, Quarry and Killing Marks for a burst across nearby enemies.",totem:"Plant an attacking totem; at its limit, replace the oldest of this kind.",roamaoe:"A wandering cyclone pursues and pulls enemies while damaging them.",form:"Toggle this beast shape. It lasts until you revert or switch shape.",rabies:"Bite for weapon damage, then poison for half the actual bite damage per second. Death leaves a contagious cloud.",fireclaw:"Requires a beast shape. Claw and release overlapping fire explosions; temporarily convert all your damage to Fire.",passive:"Always active once learned."
  };
  const metricPaths = {
    umbral_knife:"dmgMult castRange exposeDuration attackCycle",dusk_cleave:"dmgMult range arc exposedBonus cd",shadow_flurry:"dmgMult count radius castRange exposedBonus cd",deathblow:"dmgMult castRange missingHpBonus exposedBonus cd",
    combo:"dmgMult tempoGain tempoDuration",combo_finish:"dmgMult range arc shredDur tempoRetain",melee:"dmgMult quarryStacks",parry_stance:"riposteMult stunDur drainPerSec parryWindow parryRefund",combat_stance:"stats rootArmor",execute:"base missingHpBonus baseThresh",shout:"healPct allyHealPct runPct rallyDur radius",fear:"dur radius fearWeaken",banner:"radius dur allyDmg allyIas enemyDmg bannerHeal",banner_ultimate:"radius dur allyDmg allyIas enemyDmg heal",warshout_debuff:"radius debuffDuration roarSlow roarWeaken",charge:"mult chargeRange width stunDur",grapple:"mult grappleRange stunDur",thrown:"mult count throwRange",shockwave:"mult dmg range waveWidth stun",bash:"dmgMult range arc knockback",leap:"dmgMult radius leapRange",projectile:"dmg scorch pdot chill projSpeed",fan:"dmg count spread scorch staticPerHit",pierce:"dmg chill projSpeed projTtl",chain:"dmg jumps chill",lightning:"dmg jumps",firewall:"dmg len dur",meteor:"dmg radius delay stun",pyreblast:"dmg radius perStack pyreChance",groundfield:"dmg radius dur tickEvery slowPct selfDodge",freezenova:"dmg radius freeze",buff:"buff retal",balllightning:"dmg dur orbRadius orbTick",arcblink:"dmg blinkRange radius",overloadnuke:"dmg radius perStatic staticRetain",summon:"cap minionStats",summon_golem:"golemHp slamDmg maxCorpses growHp growDmg gatherRadius",ward:"shield retal dur",minionbuff:"heal dmgBuff dur",sacrifice:"dmg radius healPct fieldRadius fieldTtl fieldHeal",curse:"pct slowPct dur radius",doom:"dmgLo dmgHi timer radius",taunt_curse:"radius dur",siphon_beam:"tickDmg tickRate maxChannel manaPerSec drain",reap:"dmg radius bonusVsCursed reapHeal",plague_seed:"tick dur spreadRange burstRange",devour:"healPct devourRadius devourMinionHeal devourMana",corpse:"dmg radius castRange",corpse_launch:"dmg sprayRadius knockback castRange",outbreak:"tick corpseDmg maxR dur",wfan:"dmgMult count spread quarryStacks",charge_shot:"dmgMin dmgMax maxDraw quarryBonus",ricochet:"dmgMult bounces",wpierce:"dmgMult weaponTtl",rain:"dmgMult radius dur",trap:"dmg radius slowPct slowDur trapArm trapTrigger trapTtl",dragnet:"dmg radius root castRange cd",tripwire:"dmg bleed length root ttl",decoy:"hp taunt lifetime",blink:"blinkRange",weapon_coat:"pdot dur coatDuration",deathmark:"amp detDmg dur",afterimage:"range hp taunt lifetime",detonate_dots:"dotMult perQuarry markBonus",totem:"dmg cap ttl radius zapCd pulseCd wispCd",roamaoe:"dmg radius ttl pull drift tickCd",form:"formStats",rabies:"dmgMult dur cloudRad",fireclaw:"dmg meleeMult explosions boomRadius waveRange dmgBoost dur",passive:"pStats"
  };
  const percentMult=new Set(["dmgMult","mult","base","missingHpBonus","baseThresh","riposteMult","dmgMin","dmgMax","meleeMult","pyreChance","staticRetain","rootArmor","drain"]);
  function describe(sk,rk) {
    const lines=[];
    for(const key of (metricPaths[sk.type]||"").split(" ")) {
      if(key==="staticPerHit"&&!sk.buildStatic || sk.type==="totem"&&(sk.totemKind==="tempest"?key==="zapCd":["pulseCd","wispCd"].includes(key))) continue;
      if(sk.type==="sacrifice"&&(sk.mode==="one"?["dmg","radius"].includes(key):["healPct","fieldRadius","fieldTtl","fieldHeal"].includes(key)))continue;
      let v=valueAt(sk,key,rk); if(sk.type==="dragnet"&&key==="root")v=Math.min(3,v); if(v===undefined || typeof v==="number"&&v===0)continue;
      if(key==="buff") {lines.push(`For ${number(v.dur)}s: ${Object.entries(v.stats).map(([k,n])=>statText(k,n)).join(", ")}`);continue;}
      if(key==="minionStats") {lines.push(`${number(v.hp)} life, ${v.dmg.map(number).join("–")} damage, ${number(v.atkRate)} attacks/s, ${number(v.speed)} movement speed`);continue;}
      if(["pStats","formStats","stats"].includes(key)) {lines.push(Object.entries(v).filter(([,n])=>n!==0).map(([k,n])=>statText(k,k==="dmgReducePct"?Math.min(80,n):k==="ccReduce"?Math.min(80,n):n)).join(", "));continue;}
      const seconds=new Set(["exposeDuration","cd","dur","ttl","projTtl","weaponTtl","chill","freeze","delay","tickEvery","tickRate","maxChannel","timer","rallyDur","stunDur","stun","shredDur","tempoDuration","parryWindow","debuffDuration","orbTick","fieldTtl","maxDraw","root","lifetime","zapCd","pulseCd","wispCd","tickCd","trapArm","trapTtl","coatDuration","slowDur"]);
      const yards=new Set(["range","radius","len","castRange","chargeRange","grappleRange","throwRange","width","waveWidth","kbForce","knockback","leapRange","blinkRange","orbRadius","gatherRadius","tauntRadius","fieldRadius","spreadRange","burstRange","devourRadius","sprayRadius","maxR","length","taunt","waveRange","boomRadius","cloudRad","trapTrigger"]);
      const val=Array.isArray(v)?v.map(number).join("–"):["arc","spread"].includes(key)?number(v*180/Math.PI)+"°":number(percentMult.has(key)?v*100:v)+(percentMult.has(key)?"%":seconds.has(key)?"s":yards.has(key)?"y":"");
      let label=labels[key]||key;
      if(key==="pct"&&sk.type==="curse")label=sk.curse==="frailty"?"extra damage taken (%)":"enemy damage reduction (%)";
      if(key==="dmg") {
        const element=sk.elem || ({inferno:"fire",glacier:"cold",static:"light",miasma:"poison",caltrop:"phys",quake:"earth"})[sk.fieldKind];
        if(element)label=({fire:"Fire",cold:"Cold",light:"Lightning",poison:"Poison",shadow:"Shadow",earth:"Earth",phys:"Physical"})[element]+" damage";
      }
      lines.push(`${label}: ${val}`);
    }
    let result=(mechanics[sk.type]||"")+" "+lines.join("; ")+".";
    if(sk.id==="veilranger_1_6")result+=" Slow, root, and physical bleed each add a separate damage bonus to Barbed Trap, Frostbite Trap, Powder Trap, Caltrop Field, and Dragnet. Conditions are checked before each hit; damage-over-time ticks do not gain this bonus.";
    if(sk.fieldKind==="caltrop")result+=" Damage scales with Dexterity and Trap Damage, including Tinker's Eye.";
    if(sk.id==="veilranger_0_5")result+=" All damaging attacks apply physical bleed for 3s, with any weapon. Repeated hits refresh the strongest bleed; bleed does not stack and is separate from poison.";
    if(sk.type==="rain")result+=" Only one Arrowfall zone can be active per caster; recasting replaces the previous zone.";
    if(sk.minion==="hawk")result+=" Hawks fly in a 2.8y orbit around you and damage each monster they touch, at most once per attack interval. They fly over terrain and cannot be directly targeted.";
    if(sk.minion==="ent") {
      const stats=Object.entries(sk.auraStats(rk));
      result+=` Ent perks grant an aura within ${sk.auraRadius}y to you and allied companions, including the Ent. Matching auras do not stack.`;
      if(stats.length)result+=" Active aura: "+stats.map(([k,n])=>statText(k,n)).join(", ")+".";
    }
    if(sk.type==="form")result+=" Defensive bonuses respect the normal stat caps.";
    if(sk.id==="totem_mastery")result+=` Grants ${Math.floor(rk/10)} additional totem${Math.floor(rk/10)===1?"":"s"} from skill rank. Totem interval reduction caps at 90%.`;
    if(sk.scorch)result+=" Hits add Scorch, up to five stacks lasting 3s.";
    if(sk.buildStatic)result+=" Projectile hits build Static, up to 20.";
    if(sk.quarryOnHit)result+=" Arrows apply Quarry for 6s, up to five stacks.";
    if(sk.perkPierce)result+=" Projectiles pierce every foe in line.";
    const buffs=sk.castStats(rk); if(Object.keys(buffs).length)result+=` After using this skill: ${Object.entries(buffs).map(([k,n])=>statText(k,n)).join(", ")} for 3s.`;
    return result;
  }
  function resolve(player,id) {
    if(id==="basic")return DATA.BASIC_ATTACK;
    const original=DATA.SKILLS[id]; if(!original)return undefined;
    const choices=selected(player,id),key=choices.map(p=>p.id).join("|");
    const cache=player._perkCache ||= new Map();
    const cached=cache.get(id); if(cached?.key===key && cached.original===original)return cached.skill;
    const skill=baseSkill(original);
    for(const p of choices)for(const e of p.effects)modify(skill,e);
    skill.selectedPerks=choices;
    skill.desc=rk=>describe(skill,rk);
    cache.set(id,{key,original,skill}); return skill;
  }
  return Object.freeze({tiers,catalog,resolve,choose,normalize,pending,selected,valueAt,describe});
})();
