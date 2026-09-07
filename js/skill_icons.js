/* Semantic, resolution-independent skill emblems. Each assignment is reviewed
   against the skill's effect, rather than an unrelated cell in an icon atlas. */
"use strict";
const SkillIcons = (() => {
  const NS = "http://www.w3.org/2000/svg";
  const palette = { steel: "#bad5dd", gold: "#edc575", fire: "#ff9865", cold: "#8cddf4",
    storm: "#cbc2ff", bone: "#e5dbc0", hex: "#c9a2ec", poison: "#acdd76", blood: "#f18483", nature: "#9ccc91", earth: "#d7b48a" };
  const themes = {
    vanguard: [["steel", "Build Tempo. Break their guard. Finish the fight."], ["gold", "Rally your allies and shatter enemy resolve."], ["earth", "Close the distance. Control the front line."]],
    emberwitch: [["fire", "Stack Scorch and turn the battlefield to cinders."], ["cold", "Chill, freeze, and shatter your enemies."], ["storm", "Build Static. Chain the storm. Unleash it."]],
    gravebinder: [["bone", "Raise an army. Strengthen it with the fallen."], ["hex", "Weaken the living and claim their souls."], ["poison", "Spread contagion. Make every corpse a weapon."]],
    veilranger: [["gold", "Mark your quarry and make every arrow count."], ["steel", "Set the killing ground before the fight begins."], ["hex", "Slip from sight. Leave wounds that linger."]],
    wildkeeper: [["nature", "Call the pack and protect the bond between you."], ["storm", "Raise totems and command earth and sky."], ["earth", "Take another shape. Unleash the primal fury."]],
  };
  const path = d => `<path d="${d}"/>`;
  const line = d => `<path d="${d}" fill="none" stroke-width="2.4"/>`;
  const glyphs = {
    sword: path("M17 45 38 14 46 10 44 21 23 48ZM15 36 31 47 28 51 12 40Z") + line("M13 47 9 53 M39 19 23 42"),
    cleave: path("M13 40 37 16 43 13 41 23 20 47Z") + line("M13 27Q32 9 50 33 M9 33Q30 14 51 42 M14 40 24 50"),
    axe: path("M30 22Q20 8 11 15L17 33Q23 38 32 28 40 34 50 24L46 12Q38 15 34 21Z") + line("M34 14 25 52"),
    shield: path("M15 15 32 9 49 15 46 36Q42 47 32 53 21 47 18 36Z") + line("M32 15V45 M23 22H41"),
    fist: path("M19 30 15 24 16 17 22 16 23 24 24 12 30 11 31 24 33 12 39 14 38 26 41 18 46 21 44 36 37 45 37 52 23 52 23 42 17 35Z"),
    horn: path("M12 27Q30 29 45 13L51 39Q31 30 12 35Z") + line("M20 35Q19 48 31 44 M51 12 55 9 M54 26H59 M53 42 58 46"),
    banner: line("M19 10V53 M13 53H27") + path("M21 13Q33 8 48 15L43 25 49 35Q34 28 21 34Z"),
    helm: path("M16 39V27Q16 11 32 10 48 11 48 27V39L38 49V34L32 29 26 34V49Z") + line("M18 28 27 30 M46 28 37 30 M32 13V23"),
    hook: line("M12 51 20 43 16 36 26 29 23 22 34 16") + path("M30 14 46 9 45 28 39 23 36 31 29 27 36 19Z"),
    boot: path("M22 13 39 15 35 35 48 40 49 49 16 49 16 40 22 32Z") + line("M27 21 36 23 M26 28 35 30 M9 31H17 M6 39H12"),
    wand: line("M14 52 39 23") + path("M38 8 42 15 50 17 43 22 43 31 36 26 28 28 31 20 26 14 35 14Z"),
    staff: line("M24 54 33 27") + path("M30 9 40 9 46 17 42 26 32 29 25 22 25 15Z") + line("M31 17 37 14 41 20 34 24"),
    crossbow: line("M14 51 47 16 M13 20Q40 17 44 47 M13 20 34 30 44 47") + path("M39 15 52 9 49 23Z M20 38 27 44 19 53 12 48Z"),
    mace: line("M16 52 35 29") + path("M25 12 37 8 49 17 53 30 41 36 29 28Z") + line("M33 12 44 23 49 28"),
    crack: path("M34 9 22 27 31 29 21 43 29 43 24 56 44 33 34 32 43 19 34 22Z"),
    leap: line("M12 37Q17 5 38 18L43 26 M35 24 44 29 47 18 M10 48Q32 57 54 48") + path("M27 37 32 27 37 37 34 44 39 50 32 47 25 50 30 44Z"),
    flame: path("M32 8Q38 20 30 29 41 28 42 17 56 35 44 47 31 58 19 47 8 37 22 23 21 35 28 36 21 23 32 8Z"),
    firebolt: path("M10 13 32 18Q43 12 50 25 58 39 44 47 29 57 22 41Z") + line("M9 25 22 31 M22 9 30 17 M35 28 43 37"),
    firefan: path("M28 48 11 20 24 27 31 44 29 10 36 23 35 44 50 17 49 32 38 50Z"),
    firewall: path("M9 47V33L16 23 15 37 23 29 22 16 31 8 29 30 38 20 36 37 45 26 46 16 55 33 55 48Z") + line("M8 53H56"),
    meteor: path("M10 10 37 21Q50 18 52 33 55 45 42 50 27 57 22 42Z") + line("M7 25 20 35 M24 7 33 18 M13 53H54"),
    pyre: path("M24 49 23 36 15 36 25 24 24 15 32 7 40 16 38 24 49 36 40 36 40 49Z") + line("M12 52H52 M9 39 16 44 M55 38 48 44"),
    shard: path("M36 9 48 19 29 52 17 41Z") + line("M37 14 26 43 M16 15 24 24 M11 27 18 32"),
    snowflake: line("M32 9V55 M12 20 52 44 M12 44 52 20 M26 13 32 19 38 13 M26 51 32 45 38 51 M13 27 22 26 22 17 M42 47 42 38 51 37 M13 37 22 38 22 47 M42 17 42 26 51 27"),
    lance: path("M10 50 41 11 51 10 50 21 15 55Z") + line("M23 28V48 M34 17V35 M13 46 22 52"),
    glacier: path("M9 48 17 25 26 35 32 10 43 32 49 21 55 49Z") + line("M32 17 32 46 M18 31 17 46 M47 31 45 46"),
    chain: line("M14 17 25 37 43 18 50 43") + '<circle cx="14" cy="17" r="5"/><circle cx="25" cy="37" r="5"/><circle cx="43" cy="18" r="5"/><circle cx="50" cy="43" r="5"/>',
    bolt: path("M35 8 15 34 29 33 23 56 49 25 35 27 43 8Z"),
    sparks: path("M15 14 9 31 17 29 15 43 27 23 20 24Z M34 7 25 27 33 26 27 49 44 20 36 23Z M52 18 42 35 48 35 41 54 57 30 51 31Z"),
    orb: '<circle cx="32" cy="32" r="13"/>' + line("M10 12 18 19 13 25 M54 11 48 19 54 25 M10 52 18 46 12 39 M54 52 47 46 52 39 M24 30 31 22 30 33 40 30 31 42"),
    portal: '<ellipse cx="35" cy="32" rx="14" ry="23" fill="none" stroke-width="3"/>' + line("M8 32H40 M32 23 42 32 32 41 M13 17H21 M13 47H21"),
    field: '<ellipse cx="32" cy="40" rx="23" ry="12" fill="none" stroke-width="2.4"/>' + path("M34 8 23 28 32 27 27 42 45 21 36 23Z") + line("M12 31 18 23 M47 28 51 33"),
    burst: path("M32 7 36 23 49 13 41 28 58 32 42 36 51 51 37 41 32 58 27 41 12 51 22 36 6 32 23 27 14 12 28 23Z"),
    skull: path("M17 35Q10 17 25 12 44 6 49 25L47 36 41 40 41 49 23 49 23 40Z") + '<path d="M22 25 29 27 26 33 20 31Z M35 27 43 24 44 31 38 33Z M30 38 33 33 36 38Z" fill="#171319" stroke="none"/>' + line("M28 44V49 M35 44V49"),
    golem: path("M25 11 39 11 43 23 53 25 57 42 46 44 42 33 42 53 33 53 32 43 30 53 21 53 21 33 18 44 8 41 12 26 22 23Z") + line("M27 19H29 M35 19H37 M27 30H37 M27 35H37"),
    heart: path("M32 51Q5 33 12 21 22 6 32 22 43 6 52 21 58 35 32 51Z"),
    ribs: line("M32 12V51 M29 17Q12 11 15 25L29 28 M35 17Q52 11 49 25L35 28 M28 32 16 28 18 38 28 41 M36 32 48 28 46 38 36 41 M26 46 20 43 M38 46 44 43"),
    bone: path("M15 11Q23 7 24 16L43 38Q51 34 54 42 58 51 49 51 48 58 41 54 35 51 39 45L20 23Q12 27 10 21 7 15 15 11Z"),
    eye: path("M7 32Q31 8 57 32 32 56 7 32Z") + '<circle cx="32" cy="32" r="10" fill="#14131b"/><circle cx="32" cy="32" r="4" stroke="none"/>',
    hourglass: line("M17 10H47 M17 54H47") + path("M21 14H43L41 23 35 31 41 40 43 50H21L23 40 29 31 23 23Z") + line("M27 20H37 M27 45 32 39 37 45"),
    vortex: line("M52 37Q57 13 34 10 10 7 10 32 10 55 34 54 54 51 50 32 47 17 31 19 20 19 20 32 21 45 34 43 44 40 39 29 34 23 28 30 25 37 34 36"),
    scythe: line("M34 12 23 55") + path("M18 12Q43 1 56 28 38 17 31 23L33 15Z"),
    siphon: line("M10 19Q30 10 36 32T55 43 M9 44Q27 55 34 32T55 19 M8 31H53 M46 24 55 31 46 38"),
    drop: path("M32 8Q42 27 49 37 55 53 32 55 10 53 15 37Z") + line("M23 36Q18 44 26 48"),
    cloud: path("M15 45Q3 42 10 30 9 18 24 20 30 6 42 19 56 15 55 31 66 43 49 47Z") + line("M21 52V56 M33 50V57 M45 52V56"),
    leaf: path("M12 47Q8 12 51 10 58 50 12 47Z") + line("M9 54 43 20 M22 41 21 29 M31 32 43 33"),
    corpse: path("M25 14 36 14 39 23 34 28 47 39 44 45 31 36 27 44 35 51 30 55 20 47 21 36 13 42 10 37 22 25 20 20Z"),
    arrow: line("M13 51 46 15 M13 40 23 41 25 51") + path("M35 15 52 9 47 27 44 18Z"),
    volley: line("M32 52V14 M26 51 13 23 M38 51 51 23") + path("M27 19 32 9 37 19Z M10 33 8 16 22 26Z M42 26 56 16 54 33Z"),
    bow: line("M16 10Q54 32 16 54L28 32Z M12 32H55 M47 24 56 32 47 40"),
    ricochet: line("M10 48 22 19 42 45 53 14 M44 18 54 11 56 22") + '<circle cx="22" cy="19" r="4"/><circle cx="42" cy="45" r="4"/>',
    rain: line("M18 11V37 M32 17V47 M46 8V35 M13 32 18 39 23 32 M27 42 32 49 37 42 M41 30 46 37 51 30 M10 53H54"),
    trap: '<ellipse cx="32" cy="43" rx="22" ry="10" fill="none" stroke-width="2.5"/>' + path("M10 37 12 17 20 31 25 19 30 34 34 21 39 34 46 19 53 38 45 39 38 35 32 40 26 35 19 39Z"),
    gear: path("M27 9 37 9 39 17 47 16 53 24 48 31 55 38 49 47 40 45 37 54 27 54 24 46 15 47 9 39 15 32 10 25 16 17 24 18Z") + '<circle cx="32" cy="32" r="10" fill="#18171c"/>',
    tripwire: line("M12 18V51 M51 13V47 M13 34 50 29 M8 51H18 M46 47H56") + path("M27 22 34 33 28 44 24 34Z"),
    caltrops: path("M18 11 21 25 32 28 22 33 19 43 15 31 6 28 15 24Z M43 28 46 40 58 44 47 48 44 58 40 48 29 44 39 40Z"),
    bomb: '<circle cx="29" cy="38" r="17"/>' + path("M26 16 35 15 37 23 27 25Z") + line("M32 16Q29 5 41 11L47 8 M47 5V12 M43 8H51"),
    decoy: '<circle cx="32" cy="17" r="7"/>' + line("M12 27 51 30 M32 25V55") + path("M24 28 40 29 44 46 20 46Z"),
    twins: path("M15 16 24 16 29 25 25 48 12 48 9 25Z M38 11 47 11 53 23 49 49 35 49 32 24Z") + line("M9 54H52"),
    wolf: path("M12 12 26 19 38 19 51 12 47 35 38 47 32 54 26 47 17 35Z") + '<path d="M20 28 28 31 22 34Z M44 28 36 31 42 34Z M28 42H36L32 46Z" fill="#151719" stroke="none"/>',
    bear: '<circle cx="17" cy="18" r="8"/><circle cx="47" cy="18" r="8"/>' + path("M17 23Q17 13 32 15 47 13 47 23L48 42 40 51 24 51 16 42Z") + '<path d="M22 29H27 M37 29H42" stroke="#14171b" stroke-width="3"/><path d="M26 39Q32 33 38 39L36 45H28Z" fill="#17191a"/>',
    boar: path("M10 20 25 23 32 16 40 23 54 20 49 38 41 49 23 49 15 38Z") + line("M14 30Q5 48 22 45 M50 30Q59 48 42 45") + '<ellipse cx="32" cy="40" rx="9" ry="6" fill="#151719"/>',
    hawk: path("M32 20 24 12 11 8 15 22 5 19 12 34 25 39 25 49 32 55 39 49 39 39 52 34 59 19 49 22 53 8 40 12Z") + line("M25 27 30 29 M39 27 34 29"),
    paw: '<ellipse cx="32" cy="40" rx="14" ry="12"/><ellipse cx="14" cy="27" rx="5" ry="8" transform="rotate(-25 14 27)"/><ellipse cx="25" cy="17" rx="5" ry="8"/><ellipse cx="39" cy="17" rx="5" ry="8"/><ellipse cx="50" cy="28" rx="5" ry="8" transform="rotate(25 50 28)"/>',
    totem: path("M23 15 32 8 42 15 39 48 44 54 20 54 25 48Z M11 21 53 21 50 28 14 28Z") + line("M28 16H36 M29 34H35 M28 41H36"),
    tornado: line("M11 13Q32 3 54 14L19 23Q36 16 51 22L22 34 44 32 27 43 39 44 30 54"),
    claw: path("M15 12 23 16 15 45 8 52 12 33Z M30 8 37 12 28 47 21 54 26 31Z M47 12 54 18 43 45 35 52 40 29Z"),
  };
  const badges = {
    tempo: '<circle cx="15" cy="51" r="2"/><circle cx="23" cy="51" r="2"/><circle cx="31" cy="51" r="2"/>',
    ring: '<ellipse cx="32" cy="45" rx="25" ry="10" fill="none" stroke-width="2"/>',
    return: line("M10 26Q6 8 28 7 M21 3 29 7 22 13"),
    burst: line("M9 14 15 21 M5 30H13 M12 48 17 42 M51 14 46 20 M52 47 47 41"),
    speed: line("M5 24H16 M3 33H14 M7 42H16"),
    target: '<circle cx="32" cy="30" r="22" fill="none" stroke-width="1.5"/>' + line("M32 5V13 M32 47V57 M5 30H13 M51 30H59"),
    mastery: path("M43 7 46 12 52 11 49 17 52 22 46 21 42 26 41 19 36 16 42 13Z"),
    heal: path("M45 36H53V42H59V50H53V56H45V50H39V42H45Z"),
    poison: path("M49 33 42 47Q41 56 49 57 57 56 56 47Z"),
    frost: line("M49 35V57 M39 40 59 52 M39 52 59 40"),
    fire: path("M47 33Q55 40 50 45L56 41Q63 56 49 58 38 57 42 47L46 42Z"),
    summon: line("M8 53H55 M12 49 8 44 4 49 M53 49 57 44 61 49"),
    morph: line("M8 31Q5 9 26 8 M21 3 28 8 22 14 M56 31Q59 54 39 56 M44 50 37 56 43 61"),
    crack: '<path d="M30 10 35 24 28 32 37 42 32 53" fill="none" stroke="#11141a" stroke-width="4"/>',
  };
  // Glyph / element / effect. Summons use animal silhouettes; transformations
  // add a reversal arc. Passives carry a star; fields carry a ground ellipse.
  const assignments = {
    basic: "sword steel", vanguard_0_0: "sword steel tempo", vanguard_0_1: "cleave steel burst", vanguard_0_2: "sword steel return",
    vanguard_0_3: "sword gold mastery", vanguard_0_4: "fist blood burst", vanguard_0_5: "shield steel", vanguard_0_6: "axe blood target",
    vanguard_1_0: "horn gold heal", terrifying_bellow: "skull hex burst", vanguard_1_2: "banner gold ring", vanguard_1_3: "helm steel mastery",
    vanguard_1_4: "shield earth crack", vanguard_1_5: "banner gold heal", vanguard_2_0: "shield steel speed", vanguard_2_1: "hook steel",
    vanguard_2_2: "axe steel return", vanguard_2_3: "boot gold mastery", ground_slam: "crack earth burst", vanguard_2_5: "shield steel burst", vanguard_2_6: "leap earth",
    emberwitch_0_0: "firebolt fire", emberwitch_0_1: "firefan fire", emberwitch_0_2: "flame fire mastery", emberwitch_0_3: "firewall fire",
    emberwitch_0_4: "meteor fire", emberwitch_0_5: "pyre fire burst", emberwitch_0_6: "flame fire ring",
    emberwitch_1_0: "shard cold", emberwitch_1_1: "snowflake cold ring", emberwitch_1_2: "bone cold crack", emberwitch_1_3: "lance cold",
    emberwitch_1_4: "chain cold frost", rimeguard: "shield cold frost", emberwitch_1_6: "glacier cold ring",
    spark: "sparks storm", stormshell: "shield storm burst", emberwitch_2_2: "chain storm", emberwitch_2_3: "orb storm", emberwitch_2_4: "portal storm",
    emberwitch_2_5: "field storm", emberwitch_2_6: "bolt storm burst",
    raise_dead: "skull bone summon", raise_plaguemage: "skull poison summon", gravebinder_0_2: "golem bone summon", gravebinder_0_3: "heart bone mastery",
    gravebinder_0_4: "ribs bone", gravebinder_0_5: "lance bone", dread_muster: "skull bone heal", gravebinder_0_7: "skull fire burst",
    mark_of_frailty: "eye hex crack", withering_hex: "leaf hex crack", gravebinder_1_2: "hourglass hex", gravebinder_1_3: "vortex hex target",
    gravebinder_1_4: "skull hex mastery", gravebinder_1_5: "siphon blood", gravebinder_1_6: "heart blood mastery", gravebinder_1_7: "scythe hex",
    venom_spit: "drop poison speed", gravebinder_2_1: "skull poison burst", gravebinder_2_2: "cloud poison ring", gravebinder_2_3: "leaf poison mastery",
    gravebinder_2_4: "corpse poison heal", corpse_burst: "corpse poison burst", gravebinder_2_6: "corpse bone speed", gravebinder_2_7: "skull poison ring",
    veilranger_0_0: "arrow gold target", veilranger_0_1: "volley gold", veilranger_0_2: "bow gold", veilranger_0_3: "eye gold mastery",
    veilranger_0_4: "ricochet steel", veilranger_0_5: "lance gold target", veilranger_0_6: "rain gold",
    veilranger_1_0: "trap steel", veilranger_1_1: "gear steel mastery", veilranger_1_2: "trap cold frost", veilranger_1_3: "tripwire steel",
    veilranger_1_4: "caltrops steel ring", veilranger_1_5: "trap fire fire", veilranger_1_6: "decoy steel",
    veilranger_2_0: "boot hex morph", veilranger_2_1: "bomb hex ring", veilranger_2_2: "boot hex mastery", veilranger_2_3: "arrow poison poison",
    veilranger_2_4: "skull hex target", veilranger_2_5: "twins hex speed", veilranger_2_6: "drop blood burst",
    call_wolf: "wolf nature summon", thornback_boar: "boar earth summon", wildkeeper_0_2: "hawk nature summon", wildkeeper_0_3: "bear earth summon",
    kinship: "paw nature heal", feral_howl: "wolf nature burst", wildkeeper_0_6: "paw blood heal",
    wildkeeper_1_0: "totem storm", totem_mastery: "totem earth mastery", ground_fissure: "crack earth", wildkeeper_1_3: "tornado storm",
    wildkeeper_1_4: "drop storm mastery", wildkeeper_1_5: "crack earth ring", wildkeeper_1_6: "totem storm ring",
    fangform: "wolf blood morph", stoneform: "bear earth morph", wildkeeper_2_2: "golem earth morph", primal_surge: "paw fire mastery",
    rabies: "wolf poison poison", fire_claw: "claw fire fire", wildkeeper_2_6: "claw gold morph",
  };
  const roles = { passive: "Passive", summon: "Summon", summon_golem: "Summon", form: "Transformation", trap: "Trap", tripwire: "Trap",
    groundfield: "Area control", combat_stance: "Toggle stance", parry_stance: "Toggle stance", buff: "Enhancement", ward: "Protection",
    minionbuff: "Ally support", shout: "Ally support", banner: "Ally support", banner_ultimate: "Ally support", curse: "Curse", doom: "Curse",
    taunt_curse: "Curse", blink: "Movement", arcblink: "Movement", afterimage: "Movement", charge: "Movement", leap: "Movement", totem: "Totem" };
  function describe(skill, weapon) {
    const basicWeapons = { bow: "bow gold", crossbow: "crossbow steel", wand: "wand storm", staff: "staff nature", sword: "sword steel", axe: "axe steel", mace: "mace steel", dagger: "sword steel", spear: "lance steel" };
    const spec = skill.id === "basic" && basicWeapons[weapon] || assignments[skill.id];
    if (!spec) throw new Error(`Missing semantic skill icon: ${skill.id}`);
    const [glyph, element, badge] = spec.split(" ");
    return { glyph, element, badge, color: palette[element], role: roles[skill.type] || "Active skill" };
  }
  function theme(classId, tree = 0) {
    const [element, description] = themes[classId][tree];
    return { color: palette[element], description, element };
  }
  function create(skill, size = 48, weapon) {
    const info = describe(skill, weapon), svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 64 64"); svg.setAttribute("width", size); svg.setAttribute("height", size);
    svg.setAttribute("class", "skill-emblem"); svg.setAttribute("aria-hidden", "true");
    svg.dataset.skill = skill.id; svg.dataset.motif = [info.glyph, info.element, info.badge].filter(Boolean).join("/");
    svg.style.color = info.color;
    svg.innerHTML = `<path d="M9 2H55L62 9V55L55 62H9L2 55V9Z" fill="#0c1016" stroke="currentColor" stroke-opacity=".3"/>
      <path d="M10 5H54L59 10V54L54 59H10L5 54V10Z" fill="currentColor" fill-opacity=".07"/>
      <path d="M7 19V10L10 7H19 M45 7H54L57 10V19 M7 45V54L10 57H19 M45 57H54L57 54V45" fill="none" stroke="currentColor" stroke-opacity=".5"/>
      <g fill="currentColor" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" transform="translate(4 4) scale(.875)">${glyphs[info.glyph]}</g>
      ${info.badge ? `<g fill="#fae3b7" stroke="#fae3b7" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">${badges[info.badge]}</g>` : ""}`;
    return svg;
  }
  return { create, describe, theme, assignments };
})();
