# Class skill perks

Generated from the playable catalog with `node tools/export_skill_perks.mjs`.

Each of the 107 class skills offers three free choices at invested rank 5 and three at rank 10. Choose one per tier; both selections stack. Choices can be postponed and are saved with the hero. Equipment bonuses do not unlock milestones. The existing talent reset clears skills, perk picks, and ongoing skill effects.

Active skill modifiers apply on the next use. Existing projectiles, fields, summons, buffs, and stances keep their cast values. Passive perks apply immediately. Temporary bonuses from using a skill last three seconds and refresh without stacking with themselves.

Implementation: `js/skill_perks.js` owns the catalog, selection validation, save normalization, immutable skill resolution and displayed values. `Player.resolveSkill()` is shared by combat, targeting and tooltips. Selections are saved as `skillPerks[skillId][5 or 10] = perkId`. Existing saves receive their earned unselected choices.

Review corrections: form descriptions now describe permanent toggles; Doom, chain counts, execution thresholds and wound multipliers show current scaling. Trap capacity and arming speed are consumed by traps. Bulwark armor updates while holding ground. Totem interval reduction has a 90% cap, so high ranks cannot create frame-dependent attacks and interval perks remain effective.

Verification: `node tests/skill_perks_contract.mjs` checks all 642 definitions, all 963 two-tier combinations, 819 active-skill casts, concrete combat outcomes, save data and reset cancellation. Open `tests/class_skill_ui.html` for all-class interaction, saved-hero migration and responsive checks. The attack-timing and campaign contract suites also cover regression behavior. On restricted Windows environments, run Node with `--preserve-symlinks --preserve-symlinks-main`.

## Vanguard

### Arms

#### Tempo Strike

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Honed Power** — +20% weapon damage. | **Measured Breath** — −25% aether cost. | **Far Reach** — +25% Tempo window. |
| 10 | **Unbound Power** — +35% weapon damage; +15% aether cost. | **Double Time** — +1 Tempo generated. | **Guarded Rhythm** — +40 Armor for 3s after using this skill. |

#### Sunder Combo

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Honed Power** — +20% weapon damage. | **Measured Breath** — −25% aether cost. | **Sweeping Arc** — +25% reach; +25% cleave angle. |
| 10 | **Unbound Power** — +35% weapon damage; +15% aether cost. | **Unbroken Rhythm** — +1 Tempo retained after the finisher. | **Lingering Presence** — +35% armor-shred duration. |

#### Riposte Stance

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Honed Power** — +20% counter weapon damage. | **Patient Guard** — −25% aether drained per second. | **Lingering Presence** — +35% stun duration. |
| 10 | **Flowing Counter** — −25% time between parries. | **Aether Reversal** — +3 aether returned per parry. | **Unbound Power** — +35% counter weapon damage; +15% aether cost. |

#### Weapon Mastery

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Sure Hand** — +25% Attack Rating. | **Heavy Steel** — +12% Damage. | **Fencer** — +8% Attack Speed. |
| 10 | **Long Rhythm** — +1 Maximum Tempo. | **Measured Fury** — +4 Damage per Tempo. | **Steel Reprisal** — Attackers take 20 Damage. |

#### Berserker Stance

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Red Hunger** — 5% Life Stolen per Hit while this stance is active. | **Tempered Fury** — −20% stance stats. | **Long Pursuit** — +12% Movement Speed while this stance is active. |
| 10 | **Bloodied Steel** — +30% Damage while this stance is active. | **Furious Rhythm** — +5 Damage per Tempo while this stance is active. | **Unyielding Heart** — +15% Maximum Life while this stance is active. |

#### Bulwark Stance

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Rooted Steel** — +50% armor gained while rooted. | **Iron Thorns** — Attackers take 15 Damage while this stance is active. | **Deep Reserve** — +10% Maximum Life while this stance is active. |
| 10 | **Living Fortress** — Replenish Life +3 while this stance is active. | **Spellbreak Plate** — Elemental Damage Reduced by 6 while this stance is active. | **Counterweight** — +25% Damage while this stance is active. |

#### Headtaker

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Honed Power** — +20% base weapon damage; +20% damage against wounded enemies. | **Measured Breath** — −25% aether cost. | **Short Reckoning** — −20% cooldown. |
| 10 | **Unbound Power** — +35% base weapon damage; +35% damage against wounded enemies; +15% aether cost. | **Sever the Weak** — +5 percentage points to execution health threshold. | **Executioner's Rush** — +25% Movement Speed for 3s after using this skill. |

### Warcries

#### Rallying Cry

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Healing Surge** — +20% healing (% of maximum life). | **Measured Breath** — −25% aether cost. | **Widening Circle** — +25% radius. |
| 10 | **Rally the Pack** — +15 companion healing (%). | **Lingering Presence** — +35% rally duration. | **Stand Together** — +60 Armor for 3s after using this skill. |

#### Terrifying Bellow

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Lingering Presence** — +35% duration. | **Measured Breath** — −25% aether cost. | **Widening Circle** — +25% radius. |
| 10 | **Crushing Dread** — +15 damage reduction on frightened enemies (%). | **Dread Without End** — +60% duration; +15% aether cost. | **Courage from Fear** — +25% Movement Speed for 3s after using this skill. |

#### War Banner

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Honed Power** — +20% allied damage bonus. | **Measured Breath** — −25% aether cost. | **Widening Circle** — +25% radius. |
| 10 | **Marching Standard** — +40% allied attack-speed bonus. | **Lingering Presence** — +35% duration. | **Merciful Standard** — +1 allied healing per second (%). |

#### Iron Will

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Steady Mind** — 10% Reduced Slow/Stun Duration. | **Stout Heart** — +8% Maximum Life. | **Resolve** — Replenish Life +1. |
| 10 | **Battle Composure** — 15% Reduced Slow/Stun Duration. | **Iron Constitution** — +15% Maximum Life. | **Spellward** — Elemental Damage Reduced by 5. |

#### Sundering Roar

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Lingering Presence** — +35% roar duration. | **Measured Breath** — −25% aether cost. | **Widening Circle** — +25% radius. |
| 10 | **Demoralize** — +15 roar damage reduction (%). | **Crippling Word** — +20 roar slow (%). | **Thunderous Advance** — +25% Movement Speed for 3s after using this skill. |

#### Standard of the Last Stand

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Honed Power** — +20% companion healing (%). | **Measured Breath** — −25% aether cost. | **Widening Circle** — +25% radius. |
| 10 | **Last Defiance** — +40% allied damage bonus. | **Lingering Presence** — +35% duration. | **Quickened Courage** — +40% allied attack-speed bonus. |

### Assault

#### Bull Charge

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Honed Power** — +20% weapon damage. | **Measured Breath** — −25% aether cost. | **Far Reach** — +25% charge reach. |
| 10 | **Unbound Power** — +35% weapon damage; +15% aether cost. | **Break the Line** — +50% charge width. | **Lingering Presence** — +35% stun duration. |

#### Harpoon Chain

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Honed Power** — +20% weapon damage. | **Measured Breath** — −25% aether cost. | **Far Reach** — +25% chain reach. |
| 10 | **Unbound Power** — +35% weapon damage; +15% aether cost. | **Lingering Presence** — +35% stun duration. | **Chain Guard** — +60 Armor for 3s after using this skill. |

#### Returning Axe

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Honed Power** — +20% weapon damage. | **Measured Breath** — −25% aether cost. | **Far Reach** — +25% throw reach. |
| 10 | **Unbound Power** — +35% weapon damage; +15% aether cost. | **Twin Return** — +1 projectile count. | **Axe Dancer** — +20% Attack Speed for 3s after using this skill. |

#### Fleet of Foot

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Long March** — +8% Movement Speed. | **Second Wind** — Replenish Life +1. | **Sure Foot** — +5% Evasion. |
| 10 | **Dancing Steel** — +15% Attack Speed. | **Unbroken Pace** — +2s Tempo Duration. | **Hardy Traveler** — +15% Maximum Life. |

#### Seismic Slam

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Honed Power** — +20% weapon damage. | **Measured Breath** — −25% aether cost. | **Far Reach** — +25% reach. |
| 10 | **Unbound Power** — +35% weapon damage; +15% aether cost. | **Widening Circle** — +25% fissure width. | **Lingering Presence** — +35% stun duration. |

#### Shield Breaker

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Honed Power** — +20% weapon damage. | **Measured Breath** — −25% aether cost. | **Sweeping Arc** — +25% reach; +25% cleave angle. |
| 10 | **Unbound Power** — +35% weapon damage; +15% aether cost. | **Wallbreaker** — +50% knockback distance. | **Shield Wall** — +60 Armor for 3s after using this skill. |

#### Skyfall Leap

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Honed Power** — +20% weapon damage. | **Measured Breath** — −25% aether cost. | **Far Reach** — +25% leap reach. |
| 10 | **Unbound Power** — +35% weapon damage; +15% aether cost. | **Widening Circle** — +25% radius. | **Skyfall Aegis** — +60 Armor for 3s after using this skill. |

## Ember Witch

### Cinder

#### Emberbolt

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Honed Power** — +20% damage. | **Measured Breath** — −25% aether cost. | **Swift Flight** — +30% projectile speed. |
| 10 | **Unbound Power** — +35% damage; +15% aether cost. | **Through the Veil** — Projectiles pierce every foe in their path; −20% damage. | **Hungry Embers** — +60% Scorch damage. |

#### Fan of Cinders

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Honed Power** — +20% damage. | **Measured Breath** — −25% aether cost. | **Gathered Sparks** — −40% volley spread. |
| 10 | **Forked Volley** — +2 projectile count; −10% damage. | **Hungry Embers** — +60% Scorch damage. | **Piercing Fan** — Projectiles pierce every foe in their path; −20% damage. |

#### Heat Haze

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Hotter Embers** — +20% Scorch Damage. | **Cinder Soul** — +10% Spell Power. | **Ash Reserve** — +25 to Aether. |
| 10 | **Furnace Heart** — +40% Scorch Damage. | **Fire Eater** — +4 Aether after each Kill. | **Flameweaver** — +15% Cast Speed. |

#### Wall of Fire

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Honed Power** — +20% damage. | **Measured Breath** — −25% aether cost. | **Far Reach** — +25% wall length. |
| 10 | **Unbound Power** — +35% damage; +15% aether cost. | **Lingering Presence** — +35% duration. | **Cinder Mantle** — +50 Armor for 3s after using this skill. |

#### Meteor

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Honed Power** — +20% damage. | **Measured Breath** — −25% aether cost. | **Widening Circle** — +25% radius. |
| 10 | **Unbound Power** — +35% damage; +15% aether cost. | **Falling Star** — −50% impact delay. | **Lingering Presence** — +35% stun duration. |

#### Pyre

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Honed Power** — +20% damage. | **Measured Breath** — −25% aether cost. | **Widening Circle** — +25% radius. |
| 10 | **Unbound Power** — +35% damage; +15% aether cost. | **Debt of Ash** — +50% damage per Scorch stack. | **Rekindle** — +15 percentage points to repeat-Pyre chance per stack. |

#### Inferno

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Honed Power** — +20% damage. | **Measured Breath** — −25% aether cost. | **Widening Circle** — +25% radius. |
| 10 | **Unbound Power** — +35% damage; +15% aether cost. | **Lingering Presence** — +35% duration. | **Relentless Pulse** — −20% pulse interval. |

### Rime

#### Frost Shard

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Honed Power** — +20% damage. | **Measured Breath** — −25% aether cost. | **Swift Flight** — +30% projectile speed. |
| 10 | **Unbound Power** — +35% damage; +15% aether cost. | **Through the Veil** — Projectiles pierce every foe in their path; −20% damage. | **Lingering Presence** — +35% chill duration. |

#### Frost Nova

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Honed Power** — +20% damage. | **Measured Breath** — −25% aether cost. | **Widening Circle** — +25% radius. |
| 10 | **Unbound Power** — +35% damage; +15% aether cost. | **Lingering Presence** — +35% freeze duration. | **Rime Refuge** — +50 Armor for 3s after using this skill. |

#### Brittle Bones

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Cold Fracture** — +15% Cold Damage against Frozen Enemies. | **Shatter** — +6 Cold damage to shatter explosions. | **Winter Well** — +25 to Aether. |
| 10 | **Frozen Ruin** — +12 Cold damage to shatter explosions. | **Stillness** — +30% Cold Damage against Frozen Enemies. | **Winter Shelter** — +15% Maximum Life. |

#### Ice Lance

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Honed Power** — +20% damage. | **Measured Breath** — −25% aether cost. | **Long Lance** — +35% projectile lifetime. |
| 10 | **Unbound Power** — +35% damage; +15% aether cost. | **Lingering Presence** — +35% chill duration. | **Fleet Lance** — +40% projectile speed. |

#### Frostbite

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Honed Power** — +20% damage. | **Measured Breath** — −25% aether cost. | **Another Link** — +1 chain jumps. |
| 10 | **Unbound Power** — +35% damage; +15% aether cost. | **Unending Links** — +2 chain jumps. | **Lingering Presence** — +35% chill duration. |

#### Rimeguard

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Frostbite Reprisal** — +30% retaliation damage. | **Measured Breath** — −25% aether cost. | **Rime Plating** — +35 Armor while the buff is active. |
| 10 | **Glacial Shelter** — +15% Maximum Life while the buff is active. | **Lingering Presence** — +35% buff duration. | **Frozen Resolve** — 10% Reduced Slow/Stun Duration while the buff is active. |

#### Glacier

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Honed Power** — +20% damage. | **Measured Breath** — −25% aether cost. | **Widening Circle** — +25% radius. |
| 10 | **Unbound Power** — +35% damage; +15% aether cost. | **Lingering Presence** — +35% duration. | **Relentless Pulse** — −20% pulse interval. |

### Tempest

#### Spark

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Honed Power** — +20% damage. | **Measured Breath** — −25% aether cost. | **Gathered Sparks** — −40% volley spread. |
| 10 | **Forked Volley** — +2 projectile count; −10% damage. | **Charged Filaments** — +1 Static per projectile hit. | **Piercing Fan** — Projectiles pierce every foe in their path; −20% damage. |

#### Stormshell

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Bright Current** — Adds 1-8 Lightning Damage while the buff is active. | **Measured Breath** — −25% aether cost. | **Storm Reserve** — +25 to Aether while the buff is active. |
| 10 | **Charged Mind** — +20% Spell Power while the buff is active. | **Lingering Presence** — +35% buff duration. | **Lightning Reflex** — +10% Evasion while the buff is active. |

#### Chain Lightning

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Honed Power** — +20% damage. | **Measured Breath** — −25% aether cost. | **Forked Arc** — +1 chain jumps. |
| 10 | **Unbound Power** — +35% damage; +15% aether cost. | **Storm Network** — +2 chain jumps. | **Stormstride** — +25% Movement Speed for 3s after using this skill. |

#### Ball Lightning

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Honed Power** — +20% damage. | **Measured Breath** — −25% aether cost. | **Lingering Presence** — +35% duration. |
| 10 | **Unbound Power** — +35% damage; +15% aether cost. | **Widening Circle** — +25% arc radius. | **Rapid Discharge** — −20% arc interval. |

#### Arc Teleport

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Honed Power** — +20% damage. | **Measured Breath** — −25% aether cost. | **Far Reach** — +25% blink reach. |
| 10 | **Unbound Power** — +35% damage; +15% aether cost. | **Widening Circle** — +25% radius. | **Storm Shelter** — +15% Evasion for 3s after using this skill. |

#### Static Field

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Honed Power** — +20% damage. | **Measured Breath** — −25% aether cost. | **Widening Circle** — +25% radius. |
| 10 | **Unbound Power** — +35% damage; +15% aether cost. | **Lingering Presence** — +35% duration. | **Relentless Pulse** — −20% pulse interval. |

#### Overload

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Honed Power** — +20% damage. | **Measured Breath** — −25% aether cost. | **Widening Circle** — +25% radius. |
| 10 | **Unbound Power** — +35% damage; +15% aether cost. | **Charged Core** — +50% damage per Static. | **Residual Static** — Retain 25% of spent Static. |

## Gravebinder

### Bonecraft

#### Raise Dead

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Savage Bond** — +20% companion damage. | **Measured Breath** — −25% aether cost. | **Stalwart Bond** — +25% companion life. |
| 10 | **Growing Host** — +1 summon limit. | **Frenzied Bond** — +25% companion attack speed. | **Hunting Bond** — +30% companion movement speed; +15% companion life. |

#### Raise Plague Mage

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Savage Bond** — +20% companion damage. | **Measured Breath** — −25% aether cost. | **Stalwart Bond** — +25% companion life. |
| 10 | **Growing Host** — +1 summon limit. | **Frenzied Bond** — +25% companion attack speed. | **Hunting Bond** — +30% companion movement speed; +15% companion life. |

#### Bone Golem

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Honed Power** — +20% golem slam damage. | **Measured Breath** — −25% aether cost. | **Dense Stitching** — +25% golem base life. |
| 10 | **One More Soul** — +1 maximum stitches. | **Bone Colossus** — +40% golem base life. | **Gather the Fallen** — +50% corpse-gathering radius; +50% damage per additional stitch. |

#### Marrow Pact

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Dense Marrow** — +20% Minion Life. | **Bone Spines** — Minion attackers take 6 Damage. | **Cruel Pact** — +12 minion dmg pct. |
| 10 | **Poisoned Bones** — +12 minion poison. | **Legion's Vigor** — +40% Minion Life. | **Death's Due** — +4 Aether after each Kill. |

#### Bone Armor

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Dense Bone** — +20% shield absorption. | **Measured Breath** — −25% aether cost. | **Goring Bone** — +20% retaliation damage. |
| 10 | **Ossuary Aegis** — +40% shield absorption. | **Lingering Presence** — +35% duration. | **Marrow Vigor** — Replenish Life +4 for 3s after using this skill. |

#### Bone Spear

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Honed Power** — +20% damage. | **Measured Breath** — −25% aether cost. | **Long Lance** — +35% projectile lifetime. |
| 10 | **Unbound Power** — +35% damage; +15% aether cost. | **Marrow Shelter** — +50 Armor for 3s after using this skill. | **Fleet Lance** — +40% projectile speed. |

#### Dread Muster

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Roused Host** — +20% companion damage bonus. | **Measured Breath** — −25% aether cost. | **Lingering Presence** — +35% duration. |
| 10 | **Blood Frenzy** — +40% companion damage bonus. | **Mend the Host** — +100% companion healing (%). | **Master's Shelter** — +60 Armor for 3s after using this skill. |

#### Sacrificial Pyre

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Honed Power** — +20% damage. | **Measured Breath** — −25% aether cost. | **Widening Circle** — +25% radius. |
| 10 | **Unbound Power** — +35% damage; +15% aether cost. | **Ossuary Shelter** — +60 Armor for 3s after using this skill. | **Soul-fed Pyre** — +25% Spell Power for 3s after using this skill. |

### Hex

#### Mark of Frailty

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Lingering Presence** — +35% duration. | **Measured Breath** — −25% aether cost. | **Widening Circle** — +25% radius. |
| 10 | **Deep Hex** — +10 curse strength. | **Ruinous Hex** — +15 curse strength; +20% aether cost. | **Whisperer's Step** — +25% Movement Speed for 3s after using this skill. |

#### Withering Hex

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Lingering Presence** — +35% duration. | **Measured Breath** — −25% aether cost. | **Widening Circle** — +25% radius. |
| 10 | **Deep Hex** — +10 curse strength. | **Withering Roots** — +10 slow strength. | **Whisperer's Step** — +25% Movement Speed for 3s after using this skill. |

#### Doom

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Honed Power** — +20% minimum detonation damage; +20% maximum detonation damage. | **Measured Breath** — −25% aether cost. | **Widening Circle** — +25% radius. |
| 10 | **Unbound Power** — +35% minimum detonation damage; +35% maximum detonation damage; +15% aether cost. | **Hastened Doom** — −40% Doom timer. | **Borrowed Life** — Replenish Life +4 for 3s after using this skill. |

#### Hex of Beckoning

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Lingering Presence** — +35% duration. | **Measured Breath** — −25% aether cost. | **Widening Circle** — +25% radius. |
| 10 | **Endless Invitation** — +60% duration. | **Gathering Souls** — +50% radius; +15% aether cost. | **Veiled Beckoner** — +15% Evasion for 3s after using this skill. |

#### Grave Whispers

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Lasting Whispers** — +15% Curse Duration. | **Far Whispers** — +12% Curse Radius. | **Black Tongue** — +10% Spell Power. |
| 10 | **Deathly Chorus** — +25% Curse Radius. | **Hex-fed Soul** — +2% Spell Power per Soul Charge stack. | **Quiet Hunger** — +4 Aether after each Kill. |

#### Soul Siphon

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Honed Power** — +20% channel damage per tick. | **Patient Siphon** — −25% aether cost; −25% aether drained per second. | **Lingering Presence** — +35% channel duration. |
| 10 | **Unbound Power** — +35% channel damage per tick; +15% aether cost. | **Thirsting Soul** — +50% life drained. | **Ravenous Tether** — −20% channel tick interval. |

#### Soul Harvest

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Soul Appetites** — +1% Spell Power per Soul Charge stack. | **Deep Vessel** — +25 to Aether. | **Harvest Rhythm** — +8% Cast Speed. |
| 10 | **Ravenous Harvest** — +2% Spell Power per Soul Charge stack. | **Grave Sustenance** — +12 Life after each Kill. | **Death's Wellspring** — +4 Aether after each Kill. |

#### Reaping

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Honed Power** — +20% damage. | **Measured Breath** — −25% aether cost. | **Widening Circle** — +25% radius; +25% cleave angle. |
| 10 | **Unbound Power** — +35% damage; +15% aether cost. | **Hex Reaper** — +50% damage bonus against cursed foes. | **Soul Feast** — +75% life reaped per cursed foe. |

### Rot

#### Venom Spit

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Honed Power** — +20% damage. | **Measured Breath** — −25% aether cost. | **Swift Flight** — +30% projectile speed. |
| 10 | **Unbound Power** — +35% damage; +15% aether cost. | **Through the Veil** — Projectiles pierce every foe in their path; −20% damage. | **Virulent Spittle** — +60% poison damage. |

#### Contagion

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Honed Power** — +20% plague damage per second. | **Measured Breath** — −25% aether cost. | **Far Reach** — +25% plague spread reach. |
| 10 | **Unbound Power** — +35% plague damage per second; +15% aether cost. | **Bursting Infection** — +25% plague burst radius. | **Lingering Presence** — +35% duration. |

#### Miasma

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Honed Power** — +20% damage. | **Measured Breath** — −25% aether cost. | **Widening Circle** — +25% radius. |
| 10 | **Unbound Power** — +35% damage; +15% aether cost. | **Lingering Presence** — +35% duration. | **Relentless Pulse** — −20% pulse interval. |

#### Carrion Bloom

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Virulence** — +15% Poison Damage over Time. | **Far Spores** — +10% Plague Spread. | **Carrion Reserve** — +25 to Aether. |
| 10 | **Black Bloom** — +30% Poison Damage over Time. | **Spore Tide** — +15% Plague Spread. | **Carrion Feast** — +12 Life after each Kill. |

#### Devour Corpse

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Healing Surge** — +20% healing (% of maximum life). | **Measured Breath** — −25% aether cost. | **Widening Circle** — +25% corpse search radius. |
| 10 | **Feast for the Host** — +15 companion healing (%). | **Soul Sustenance** — +15 aether restored (% of maximum). | **Carrion Shelter** — +60 Armor for 3s after using this skill. |

#### Corpse Burst

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Honed Power** — +20% damage. | **Measured Breath** — −25% aether cost. | **Widening Circle** — +25% radius. |
| 10 | **Unbound Power** — +35% damage; +15% aether cost. | **Far Reach** — +25% cast reach. | **Carrion Feast** — Replenish Life +4 for 3s after using this skill. |

#### Corpse Spear

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Honed Power** — +20% damage. | **Measured Breath** — −25% aether cost. | **Widening Circle** — +25% poison spray radius. |
| 10 | **Unbound Power** — +35% damage; +15% aether cost. | **Far Reach** — +25% cast reach. | **Cadaver Hammer** — +50% knockback distance. |

#### Outbreak

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Honed Power** — +20% plague damage per second. | **Measured Breath** — −25% aether cost. | **Far Reach** — +25% outbreak radius. |
| 10 | **Rupturing Dead** — +50% corpse rupture damage. | **Unbound Power** — +35% plague damage per second; +15% aether cost. | **Swift Pestilence** — −40% duration. |

## Wildkeeper

### Wildkin

#### Call of the Wolf

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Savage Bond** — +20% companion damage. | **Measured Breath** — −25% aether cost. | **Stalwart Bond** — +25% companion life. |
| 10 | **Growing Host** — +1 summon limit. | **Frenzied Bond** — +25% companion attack speed. | **Hunting Bond** — +30% companion movement speed; +15% companion life. |

#### Thornback Boar

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Savage Bond** — +20% companion damage. | **Measured Breath** — −25% aether cost. | **Stalwart Bond** — +25% companion life. |
| 10 | **Growing Host** — +1 summon limit. | **Frenzied Bond** — +25% companion attack speed. | **Hunting Bond** — +30% companion movement speed; +15% companion life. |

#### Spirit Hawk

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Savage Bond** — +20% companion damage. | **Measured Breath** — −25% aether cost. | **Stalwart Bond** — +25% companion life. |
| 10 | **Growing Host** — +1 summon limit. | **Frenzied Bond** — +25% companion attack speed. | **Hunting Bond** — +30% companion movement speed; +15% companion life. |

#### Guardian Bear

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Savage Bond** — +20% companion damage. | **Measured Breath** — −25% aether cost. | **Stalwart Bond** — +25% companion life. |
| 10 | **Growing Host** — +1 summon limit. | **Frenzied Bond** — +25% companion attack speed. | **Hunting Bond** — +30% companion movement speed; +15% companion life. |

#### Kindred Bond

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Deep Bond** — +20% Minion Life. | **Pack Breath** — +1 Aether per second per living beast. | **Shared Hunt** — +12 minion dmg pct. |
| 10 | **Pack Sustenance** — +2 Aether per second per living beast. | **Kindred Vigor** — +15% Maximum Life. | **Savage Kin** — +25 minion dmg pct. |

#### Feral Howl

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Roused Host** — +20% companion damage bonus. | **Measured Breath** — −25% aether cost. | **Lingering Presence** — +35% duration. |
| 10 | **Blood Frenzy** — +40% companion damage bonus. | **Echoing Howl** — −25% cooldown. | **Master's Shelter** — +60 Armor for 3s after using this skill. |

#### Blood of the Pack

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Healing Surge** — +20% healing (% of maximum life). | **Measured Breath** — −25% aether cost. | **Widening Circle** — +25% regrowth radius. |
| 10 | **Deep Regrowth** — +50% regrowth healing per second (%). | **Lingering Presence** — +35% regrowth duration. | **Gift of the Pack** — +30% Damage for 3s after using this skill. |

### Stormcall

#### Storm Totem

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Honed Power** — +20% damage. | **Measured Breath** — −25% aether cost. | **Widening Circle** — +25% radius. |
| 10 | **Sacred Grove** — +1 summon limit. | **Lingering Presence** — +35% lifetime. | **Rapid Thunder** — −25% totem attack interval. |

#### Totem Mastery

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Lasting Wood** — +20% Totem Lifetime. | **Storm Core** — +12% Totem Damage. | **Root Reserve** — +25 to Aether. |
| 10 | **Sacred Circle** — +1 Maximum Totems. | **Heart of Thunder** — +25% Totem Damage. | **Ancient Roots** — +40% Totem Lifetime. |

#### Fissure

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Honed Power** — +20% damage. | **Measured Breath** — −25% aether cost. | **Far Reach** — +25% reach. |
| 10 | **Unbound Power** — +35% damage; +15% aether cost. | **Widening Circle** — +25% fissure width. | **Lingering Presence** — +35% stun duration. |

#### Cyclone

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Honed Power** — +20% damage. | **Measured Breath** — −25% aether cost. | **Widening Circle** — +25% radius. |
| 10 | **Unbound Power** — +35% damage; +15% aether cost. | **Hungering Wind** — +50% cyclone pull; +25% cyclone pursuit speed. | **Lingering Presence** — +35% lifetime. |

#### Sky-Sap

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Deep Sap** — +20% Aether Regeneration. | **Living Well** — +30 to Aether. | **Green Renewal** — Replenish Life +1. |
| 10 | **Storm Sap** — +20% Spell Power. | **Bottomless Roots** — +40% Aether Regeneration. | **Sap-fed Vigor** — +15% Maximum Life. |

#### Earthquake

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Honed Power** — +20% damage. | **Measured Breath** — −25% aether cost. | **Widening Circle** — +25% radius. |
| 10 | **Unbound Power** — +35% damage; +15% aether cost. | **Lingering Presence** — +35% duration. | **Relentless Pulse** — −20% pulse interval. |

#### Tempest Totem

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Honed Power** — +20% damage. | **Measured Breath** — −25% aether cost. | **Widening Circle** — +25% radius. |
| 10 | **Sacred Grove** — +1 summon limit. | **Lingering Presence** — +35% lifetime. | **Storm Nursery** — −40% wisp interval. |

### Wildshape

#### Wolf Form

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Primal Might** — +20% Damage while in this shape. | **Living Hide** — +10% Maximum Life while in this shape. | **Hunting Shape** — +12% Movement Speed while in this shape. |
| 10 | **Predator's Rhythm** — +20% Attack Speed while in this shape. | **Wild Renewal** — Replenish Life +3 while in this shape. | **Elemental Hide** — Elemental Damage Reduced by 6 while in this shape. |

#### Bear Form

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Primal Might** — +20% Damage while in this shape. | **Living Hide** — +10% Maximum Life while in this shape. | **Hunting Shape** — +12% Movement Speed while in this shape. |
| 10 | **Predator's Rhythm** — +20% Attack Speed while in this shape. | **Wild Renewal** — Replenish Life +3 while in this shape. | **Elemental Hide** — Elemental Damage Reduced by 6 while in this shape. |

#### Stone Form

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Primal Might** — +20% Damage while in this shape. | **Living Hide** — +10% Maximum Life while in this shape. | **Hunting Shape** — +12% Movement Speed while in this shape. |
| 10 | **Predator's Rhythm** — +20% Attack Speed while in this shape. | **Wild Renewal** — Replenish Life +3 while in this shape. | **Elemental Hide** — Elemental Damage Reduced by 6 while in this shape. |

#### Primal Surge

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Wild Spark** — +2 percentage points to Primal Surge's trigger chance. | **Primal Strength** — +12% Damage. | **Restless Beast** — +8% Attack Speed. |
| 10 | **Awakening Shock** — +3 Shockwave Radius on Shifting; +0.6 Stun Duration on Shifting. | **Raging Spark** — +4 percentage points to Primal Surge's trigger chance. | **Beast's Hunger** — 5% Life Stolen per Hit. |

#### Rabies

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Honed Power** — +20% weapon damage. | **Measured Breath** — −25% aether cost. | **Far Reach** — +25% contagious cloud radius. |
| 10 | **Unbound Power** — +35% weapon damage; +15% aether cost. | **Lingering Presence** — +35% duration. | **Rabid Pursuit** — +25% Movement Speed for 3s after using this skill. |

#### Fire Claw

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Honed Power** — +20% damage; +20% claw weapon damage. | **Measured Breath** — −25% aether cost. | **Far Reach** — +25% fire-wave reach. |
| 10 | **Wildfire Wake** — +2 fire explosions. | **Widening Circle** — +25% fire explosion radius. | **Lingering Presence** — +35% duration. |

#### Wrath of the Wild

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Primal Might** — +20% Damage while in this shape. | **Living Hide** — +10% Maximum Life while in this shape. | **Hunting Shape** — +12% Movement Speed while in this shape. |
| 10 | **Predator's Rhythm** — +20% Attack Speed while in this shape. | **Wild Renewal** — Replenish Life +3 while in this shape. | **Elemental Hide** — Elemental Damage Reduced by 6 while in this shape. |

## Veil Ranger

### Precision

#### Aimed Shot

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Honed Power** — +20% weapon damage. | **Measured Breath** — −25% aether cost. | **Marked for Death** — +1 Quarry stacks per hit. |
| 10 | **Unbound Power** — +35% weapon damage; +15% aether cost. | **Skewer the Line** — Projectiles pierce every foe in their path; −15% weapon damage. | **Hunter's Poise** — +25% Critical Damage for 3s after using this skill. |

#### Split Volley

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Honed Power** — +20% weapon damage. | **Measured Breath** — −25% aether cost. | **Tight Volley** — −40% volley spread. |
| 10 | **Featherstorm** — +2 projectile count; −10% weapon damage. | **Deep Quarry** — +1 Quarry stacks per hit. | **Piercing Volley** — Projectiles pierce every foe in their path; −20% weapon damage. |

#### Drawn Shot

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Honed Power** — +20% full-draw weapon damage. | **Measured Breath** — −25% aether cost. | **Quick Draw** — −20% full-draw time. |
| 10 | **Unbound Power** — +35% full-draw weapon damage; +15% aether cost. | **Quarry's End** — +50% damage bonus per Quarry stack. | **Snap Draw** — −40% full-draw time. |

#### Eagle Eye

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Steady Sight** — +3% Critical Strike Chance. | **Cruel Aim** — +20% Critical Damage. | **Light Draw** — +8% Attack Speed. |
| 10 | **Heartseeker** — +40% Critical Damage. | **Hawk's Patience** — +5% Critical Strike Chance. | **Hunter's Reward** — +4 Aether after each Kill. |

#### Ricochet Shard

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Honed Power** — +20% weapon damage. | **Measured Breath** — −25% aether cost. | **Trick Shot** — +1 ricochets. |
| 10 | **Unbound Power** — +35% weapon damage; +15% aether cost. | **Never Miss a Turn** — +2 ricochets. | **Ricochet Rhythm** — +20% Attack Speed for 3s after using this skill. |

#### Skewering Bolt

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Honed Power** — +20% weapon damage. | **Measured Breath** — −25% aether cost. | **Long Skewer** — +35% arrow lifetime. |
| 10 | **Unbound Power** — +35% weapon damage; +15% aether cost. | **Hunter's Tempo** — +20% Attack Speed for 3s after using this skill. | **Skirmisher's Guard** — +15% Evasion for 3s after using this skill. |

#### Arrowfall

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Honed Power** — +20% weapon damage. | **Measured Breath** — −25% aether cost. | **Widening Circle** — +25% radius. |
| 10 | **Unbound Power** — +35% weapon damage; +15% aether cost. | **Lingering Presence** — +35% duration. | **Rainrunner** — +25% Movement Speed for 3s after using this skill. |

### Snares

#### Barbed Trap

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Honed Power** — +20% damage. | **Measured Breath** — −25% aether cost. | **Widening Circle** — +25% radius. |
| 10 | **Unbound Power** — +35% damage; +15% aether cost. | **Hair Trigger** — −50% arming time; +25% trigger radius. | **Patient Snare** — +50% trap lifetime. |

#### Tinker's Eye

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Sharpened Teeth** — +20% Trap Damage. | **Spare Parts** — +1 Maximum Traps. | **Light Kit** — +8% Movement Speed. |
| 10 | **Killing Springs** — +40% Trap Damage. | **Quick Assembly** — +30% Trap Arming Speed. | **Prepared Ground** — +2 Maximum Traps. |

#### Frostbite Trap

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Honed Power** — +20% damage. | **Measured Breath** — −25% aether cost. | **Widening Circle** — +25% radius. |
| 10 | **Unbound Power** — +35% damage; +15% aether cost. | **Hair Trigger** — −50% arming time; +25% trigger radius. | **Patient Snare** — +50% trap lifetime. |

#### Tripwire

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Honed Power** — +20% damage; +20% bleeding damage per second. | **Measured Breath** — −25% aether cost. | **Far Reach** — +25% wire length. |
| 10 | **Unbound Power** — +35% damage; +35% bleeding damage per second; +15% aether cost. | **Grasping Wire** — +35% root duration. | **Patient Wire** — +35% lifetime. |

#### Caltrop Field

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Honed Power** — +20% damage. | **Measured Breath** — −25% aether cost. | **Widening Circle** — +25% radius. |
| 10 | **Unbound Power** — +35% damage; +15% aether cost. | **Lingering Presence** — +35% duration. | **Relentless Pulse** — −20% pulse interval. |

#### Powder Trap

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Honed Power** — +20% damage. | **Measured Breath** — −25% aether cost. | **Widening Circle** — +25% radius. |
| 10 | **Unbound Power** — +35% damage; +15% aether cost. | **Hair Trigger** — −50% arming time; +25% trigger radius. | **Patient Snare** — +50% trap lifetime. |

#### Snare Decoy

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Sturdy Lure** — +20% lure life. | **Measured Breath** — −25% aether cost. | **Far Reach** — +25% taunt radius. |
| 10 | **Convincing Lure** — +50% lure life. | **Lingering Presence** — +35% lure lifetime. | **Hidden Hunter** — +15% Evasion for 3s after using this skill. |

### Veil

#### Shadowstep

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Far Reach** — +25% blink reach. | **Measured Breath** — −25% aether cost. | **Hidden Step** — +10% Evasion for 3s after using this skill. |
| 10 | **Far Beyond** — +50% blink reach; +15% aether cost. | **Ambush** — +30% Damage for 3s after using this skill. | **Fleet Shadow** — +30% Movement Speed for 3s after using this skill. |

#### Smoke Bomb

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Lingering Presence** — +35% duration. | **Measured Breath** — −25% aether cost. | **Widening Circle** — +25% radius. |
| 10 | **Thick Shroud** — +10 evasion inside smoke (%). | **Enveloping Night** — +50% radius; +15% aether cost. | **Ambusher's Step** — +25% Movement Speed for 3s after using this skill. |

#### Quickening

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Quick Feet** — +8% Movement Speed. | **Fast Hands** — +8% Attack Speed. | **Dancing Shadow** — +5% Evasion. |
| 10 | **Blur** — +10% Evasion. | **Killing Rhythm** — +15% Attack Speed. | **Windrunner** — +15% Movement Speed. |

#### Serrated Arrows

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Honed Power** — +20% poison damage. | **Measured Breath** — −25% aether cost. | **Lingering Presence** — +35% duration. |
| 10 | **Unbound Power** — +35% poison damage; +15% aether cost. | **Deep Wounds** — +50% wound duration. | **Serrated Rhythm** — +20% Attack Speed for 3s after using this skill. |

#### Killing Mark

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Honed Power** — +20% mark detonation damage. | **Measured Breath** — −25% aether cost. | **Lingering Presence** — +35% duration. |
| 10 | **Fatal Verdict** — +10 marked damage taken (%). | **Unbound Power** — +35% mark detonation damage; +15% aether cost. | **Marked Pursuit** — +25% Movement Speed for 3s after using this skill. |

#### After-Image

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Lingering Presence** — +35% lure lifetime. | **Measured Breath** — −25% aether cost. | **Far Reach** — +25% reach. |
| 10 | **Solid Echo** — +100% lure life. | **Irresistible Echo** — +25% taunt radius. | **Hidden in Motion** — +15% Evasion for 3s after using this skill. |

#### Hemorrhage

| Rank | Choice 1 | Choice 2 | Choice 3 |
| --- | --- | --- | --- |
| 5 | **Honed Power** — +20% remaining-wound damage multiplier. | **Measured Breath** — −25% aether cost. | **Quarry's Wound** — +20% weapon damage per Quarry (%). |
| 10 | **Unbound Power** — +35% remaining-wound damage multiplier; +15% aether cost. | **Final Verdict** — +50% weapon damage per Killing Mark (%). | **Blood Rush** — +20% Attack Speed for 3s after using this skill. |

