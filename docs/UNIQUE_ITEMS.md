# Unique items

163 named brown items, with 169 signature powers including both glyph modes. Generated from the authored runtime catalogue by `node tools/export_unique_catalog.mjs`.

## Equipment balance and class powers

All 139 equipment identities have fresh class, tree or talent powers. Only the named class receives the power; other classes may equip the item for its ordinary stats. Learned ranks increase without unlocking talents or perk choices. Skill modifiers compose after selected perks and are captured for each cast.

Equipment carries three to four fixed thematic support stats. Values reach the upper 90% point of the strongest eligible live affix range at the item’s authored level, retaining stronger historical values. Names, bases, art and drop levels remain stable. Brown charms, jewels and glyphs retain their stats and powers.

## Elemental damage affixes

Fire, Cold, Lightning, Poison, Shadow and Earth each have a percentage-damage prefix. They roll on weapons, off-hands, helms, gloves, rings, amulets and jewels; charms are excluded. Jewels retain their 70% stat scaling.

| Minimum item level | Bonus |
|---|---|
| 2 | 5–10% |
| 15 | 11–20% |
| 30 | 21–35% |
| 50 | 36–50% |
| 70 | 51–65% |
| 90 | 66–80% |

Matching bonuses add together and multiply player damage after conversion, alongside existing spell and weapon scaling. Player spells, added weapon elements, fields, item effects and damage over time benefit. Summons use their own bonuses. Damage over time captures the bonus when applied; spreads and same-element hit-derived effects inherit it without applying it again. Existing physical trap impacts and enemy mitigation remain unchanged; elemental trap burns benefit.

## Summon affixes

Summon Damage and Summon Life are independent, normal-weight prefixes on all weapons, gloves and helmets. They use the same six level thresholds and percentage ranges as the elemental affixes above, and do not roll on other slots, charms or jewels. Matching bonuses add across equipment. Damage increases companion attacks using their current owner bonus; Life increases maximum Life when summoned or when a golem is rebuilt, without healing existing companions on equipment swaps.

Ten brown items carry these support stats at their level-appropriate upper-90% roll: Hollow Crown, Soulwhisper, Gravewand, Skullhelm, Boneward Casque, Wolfsplit, Huntsmaw, Gravewrought Grips, Deadhand and Sepulcher’s Clutch. Their powers and identities are preserved; saved copies receive the new stats on load.

## Drop rules

At zero Magic Find, an eligible boss has a 20.15% chance to drop at least one Unique, elites 4.08%, chests 4.05%, normal enemies 0.22%, and barrels 0.13%. These are independent random rewards, with no pity counter. Seven explicit quest milestones still guarantee Unique equipment. Runed Stones and glyph quests roll 5% per glyph; glyph reforging preserves rarity.

Magic Find multiplies Unique chances by `1 + (150 × MF / (150 + MF)) / 100`, approaching 2.5×. Gear is selected near the source level. Unique socketables cannot drop above source level + 2. Glyph drop levels: Venom 12, Aegis 16, Doom 20, Wraith 24, Void 28, Titan 36.

## Power rules

Gear must be equipped and identified; charms must be in the pack; jewels and glyphs must be seated in equipped gear. Duplicate copies of a named power do not stack; ordinary stats still add. Each glyph mode can activate once. Unequipping removes temporary benefits and progress without refreshing cooldowns. Temporary combat effects reset on loading, like existing skill buffs.

Weapon hits and spell hits count only successful damage, including skill projectiles and fields. Killing-hit effects use actual damage after defenses, capped at remaining Life. Damage-over-time kills use the level-based fallback shown. Companion kills count as owned kills but do not trigger weapon or spell hit powers. Generated Unique damage, including its damage over time, cannot trigger more Unique powers. Exposures use the strongest active value; barriers refresh without accumulating. Area and chain effects center on the triggering enemy, or the hero when there is no enemy. Hard crowd control does not affect bosses.

Existing saved Uniques receive canonical stats and powers on load; identity, identification, inventory position and sockets survive. Older seated Unique jewels are recovered only when their original name, color and affixes match. Unrecognized saved data is preserved.

## Equipment

### Gravebite

`u_gravebite` · Item level 3

Supporting stats: +39% Damage; 3% Life Stolen per Hit; +70% Damage to Undead.

First Beat — Tempo Strike (Vanguard): +1 Tempo generated. Vanguard only. Duplicates do not stack.

### Widow's Lament

`u_widow` · Item level 3

Supporting stats: Adds 14 Poison Damage over 3s; +6 Dexterity; +10% Attack Speed; +19% Damage.

Widow's Lesson — Umbral Knife (Veil Ranger): +1 to learned talent ranks; does not unlock talents or perk choices. Veil Ranger only. Duplicates do not stack.

### Cindershroud

`u_cinder` · Item level 4

Supporting stats: +39% Armor; Fire Resist +17%; Attackers take 5 Damage.

Walking Furnace — Heat Haze (Ember Witch): +25 Scorch damage bonus (%). Ember Witch only. Duplicates do not stack.

### Oathkeeper's Wall

`u_oath` · Item level 6

Supporting stats: +10% Block Chance; All Resistances +9%; +29 to Life.

Oath Repaid — Riposte Stance (Vanguard): +6 Aether returned per parry. Vanguard only. Duplicates do not stack.

### Hollow Crown

`u_crown` · Item level 5

Supporting stats: +1 to All Talents; +19 to Aether; +14% Better Chance of Rare Loot; +10% Summon Damage.

Crown of Hexes — Hex tree (Gravebinder): +1 to learned talent ranks; does not unlock talents or perk choices. Gravebinder only. Duplicates do not stack.

### Marrow Band

`u_marrow` · Item level 4

Supporting stats: +18 to Life; 4% Life Stolen per Hit; +6 Vitality.

Blood of the Pack — Kindred Bond (Wildkeeper): +1 to learned talent ranks; does not unlock talents or perk choices. Wildkeeper only. Duplicates do not stack.

### Stormcaller's Knot

`u_stormknot` · Item level 5

Supporting stats: Adds 1-10 Lightning Damage; +11% Cast Speed; Lightning Resist +17%.

Braided Totem — Storm Totem (Wildkeeper): 20% less totem attack interval. Wildkeeper only. Duplicates do not stack.

### Stridewraith

`u_stride` · Item level 5

Supporting stats: +16% Movement Speed; +6 Dexterity; Cold Resist +17%.

Late Arrival — Shadowstep (Veil Ranger): 35% less Aether cost. Veil Ranger only. Duplicates do not stack.

### Kingsplitter

`u_kingsplit` · Item level 8

Supporting stats: +45% Damage; +5% Critical Strike Chance; +7 Strength.

The Falling Crown — Headtaker (Vanguard): 40% more damage against wounded enemies. Vanguard only. Duplicates do not stack.

### Dawnbreaker

`u_gen_0_0` · Item level 5

Supporting stats: +41% Damage; +6 Strength; Fire Resist +17%.

Breaking Dawn — Bull Charge (Vanguard): 50% more charge width. Vanguard only. Duplicates do not stack.

### Sunder

`u_gen_0_2` · Item level 13

Supporting stats: +51% Damage; +78 Attack Rating; +24% Critical Damage.

Assault Doctrine — Assault tree (Vanguard): +1 to learned talent ranks; does not unlock talents or perk choices. Vanguard only. Duplicates do not stack.

### Kingsbane

`u_gen_0_4` · Item level 24

Supporting stats: +64% Damage; +13 Strength; 7% Life Stolen per Hit.

Returning Steel — Returning Axe (Vanguard): +1 returning axes. Vanguard only. Duplicates do not stack.

### Worldcleaver

`u_gen_0_6` · Item level 39

Supporting stats: +98% Damage; +18% Critical Strike Chance; +107 to Life.

Worldfall — Skyfall Leap (Vanguard): 50% more landing radius. Vanguard only. Duplicates do not stack.

### Mornsplitter

`u_gen_0_8` · Item level 56

Supporting stats: +195% Damage; +67% Attack Speed; Cold Resist +125%.

Marching Fissure — Seismic Slam (Vanguard): 50% more fissure reach. Vanguard only. Duplicates do not stack.

### Heaven's Edge

`u_gen_0_10` · Item level 74

Supporting stats: +328% Damage; +70 Dexterity; Lightning Resist +125%.

Heaven's Lesson — Skyfall Leap (Vanguard): +3 to learned talent ranks; does not unlock talents or perk choices. Vanguard only. Duplicates do not stack.

### Aurora's Reckoning

`u_gen_0_12` · Item level 93

Supporting stats: +548% Damage; +152% Critical Damage; All Resistances +82%.

Chain of Command — Harpoon Chain (Vanguard): 35% less Aether cost. Vanguard only. Duplicates do not stack.

### Gorewake

`u_gen_1_1` · Item level 9

Supporting stats: +46% Damage; 4% Life Stolen per Hit; +48 to Life.

Gore Tempo — Tempo Strike (Vanguard): +1 to learned talent ranks; does not unlock talents or perk choices. Vanguard only. Duplicates do not stack.

### Reaver's End

`u_gen_1_3` · Item level 18

Supporting stats: +57% Damage; +9 Strength; All Resistances +15%.

Unspent Fury — Sunder Combo (Vanguard): +1 Tempo retained after the finisher. Vanguard only. Duplicates do not stack.

### Skullsplit

`u_gen_1_5` · Item level 31

Supporting stats: +79% Damage; +10% Critical Strike Chance; +156 Attack Rating.

Skull Frenzy — Berserker Stance (Vanguard): +20 stance attack speed bonus (%). Vanguard only. Duplicates do not stack.

### Ruin

`u_gen_1_7` · Item level 47

Supporting stats: +145% Damage; Adds 52-86 Fire Damage; +24 Strength.

Ruined Steel — Weapon Mastery (Vanguard): +2 to learned talent ranks; does not unlock talents or perk choices. Vanguard only. Duplicates do not stack.

### Marrowhunger

`u_gen_1_9` · Item level 65

Supporting stats: +328% Damage; 15% Life Stolen per Hit; +41 Vitality.

Executioner's Appetite — Headtaker (Vanguard): +0.04 execution Life threshold. Vanguard only. Duplicates do not stack.

### The Crimson Tithe

`u_gen_1_11` · Item level 84

Supporting stats: +548% Damage; +443 to Life; +152% Critical Damage.

Crimson Counter — Riposte Stance (Vanguard): 30% less time between parries. Vanguard only. Duplicates do not stack.

### Whisperfang

`u_gen_2_0` · Item level 5

Supporting stats: +41% Damage; +6 Dexterity; +11% Attack Speed.

The Unseen Discipline — Veil tree (Veil Ranger): +1 to learned talent ranks; does not unlock talents or perk choices. Veil Ranger only. Duplicates do not stack.

### Nightkiss

`u_gen_2_2` · Item level 13

Supporting stats: +51% Damage; Adds 38 Poison Damage over 3s; 4% Life Stolen per Hit.

Lingering Opening — Umbral Knife (Veil Ranger): 60% more Exposed duration. Veil Ranger only. Duplicates do not stack.

### Quietus

`u_gen_2_4` · Item level 24

Supporting stats: +64% Damage; +10% Critical Strike Chance; +19% Movement Speed.

Quiet Crescent — Dusk Cleave (Veil Ranger): 30% more cleave angle. Veil Ranger only. Duplicates do not stack.

### Severance

`u_gen_2_6` · Item level 39

Supporting stats: +98% Damage; +29% Attack Speed; +13 Dexterity.

Severing Flurry — Shadow Flurry (Veil Ranger): +2 blades. Veil Ranger only. Duplicates do not stack.

### Venomwhisper

`u_gen_2_8` · Item level 56

Supporting stats: +195% Damage; Adds 264 Poison Damage over 3s; +539 Attack Rating.

Whispered Step — Shadowstep (Veil Ranger): +3 to learned talent ranks; does not unlock talents or perk choices. Veil Ranger only. Duplicates do not stack.

### The Silent Thorn

`u_gen_2_10` · Item level 74

Supporting stats: +328% Damage; +70 Dexterity; +152% Critical Damage.

Thorn in the Mark — Killing Mark (Veil Ranger): 60% more mark detonation damage. Veil Ranger only. Duplicates do not stack.

### Last Breath

`u_gen_2_12` · Item level 93

Supporting stats: +548% Damage; 25% Life Stolen per Hit; +443 to Life.

Last Breath Taken — Deathblow (Veil Ranger): 50% more damage against wounded enemies. Veil Ranger only. Duplicates do not stack.

### Wintershot

`u_gen_3_1` · Item level 9

Supporting stats: +46% Damage; +7 Dexterity; Adds 7-11 Cold Damage.

Winter Quarry — Aimed Shot (Veil Ranger): +1 Quarry stacks per arrow. Veil Ranger only. Duplicates do not stack.

### Stormstring

`u_gen_3_3` · Item level 18

Supporting stats: +57% Damage; Adds 1-55 Lightning Damage; +19% Attack Speed.

Storm Volley — Split Volley (Veil Ranger): +2 arrows. Veil Ranger only. Duplicates do not stack.

### Farsong

`u_gen_3_5` · Item level 31

Supporting stats: +79% Damage; +156 Attack Rating; +43 to Aether.

A Song Already Drawn — Drawn Shot (Veil Ranger): 30% less full-draw time. Veil Ranger only. Duplicates do not stack.

### Hawkeye

`u_gen_3_7` · Item level 47

Supporting stats: +145% Damage; +33% Critical Strike Chance; +24 Dexterity.

Hawk's Lesson — Eagle Eye (Veil Ranger): +2 to learned talent ranks; does not unlock talents or perk choices. Veil Ranger only. Duplicates do not stack.

### Frostpierce

`u_gen_3_9` · Item level 65

Supporting stats: +328% Damage; Adds 79-131 Cold Damage; +152% Critical Damage.

Winter Ricochet — Ricochet Shard (Veil Ranger): +2 ricochets. Veil Ranger only. Duplicates do not stack.

### The Distant Tempest

`u_gen_3_11` · Item level 84

Supporting stats: +548% Damage; +114% Attack Speed; Lightning Resist +125%.

Distant Aim — Aimed Shot (Veil Ranger): +4 to learned talent ranks; does not unlock talents or perk choices. Veil Ranger only. Duplicates do not stack.

### Tempest

`u_gen_4_0` · Item level 5

Supporting stats: +23% Spell Power; +11% Cast Speed; +19 to Aether; +10% Lightning Damage.

Forked Tempest — Chain Lightning (Ember Witch): +2 chain targets. Ember Witch only. Duplicates do not stack.

### Emberheart

`u_gen_4_2` · Item level 13

Supporting stats: +28% Spell Power; +29% Aether Regeneration; +10% Fire Damage.

Heart of Scorch — Emberbolt (Ember Witch): 100% more Scorch damage per stack. Ember Witch only. Duplicates do not stack.

### Frostward Rod

`u_gen_4_4` · Item level 24

Supporting stats: +36% Spell Power; Cold Resist +29%; +19% Cold Damage.

Winter Stillness — Frost Nova (Ember Witch): 40% more freeze duration. Ember Witch only. Duplicates do not stack.

### Stormcrown

`u_gen_4_6` · Item level 39

Supporting stats: +45% Spell Power; +36% Cast Speed; Lightning Resist +71%; +34% Lightning Damage.

Thunder Sovereign — Chain Lightning (Ember Witch): 35% more lightning damage. Ember Witch only. Duplicates do not stack.

### Cinderveil

`u_gen_4_8` · Item level 56

Supporting stats: +75% Spell Power; +155 to Life; +49% Fire Damage.

Feeding the Pyre — Pyre (Ember Witch): 75% more damage per consumed Scorch stack. Ember Witch only. Duplicates do not stack.

### The Glacial Maelstrom

`u_gen_4_10` · Item level 74

Supporting stats: +75% Spell Power; +214 to Aether; +64% Cold Damage.

Glacial Horizon — Glacier (Ember Witch): 40% more glacier radius. Ember Witch only. Duplicates do not stack.

### Thunderspire

`u_gen_4_12` · Item level 93

Supporting stats: +80% Spell Power; +65% Cast Speed; +70 Willpower; +79% Lightning Damage.

Threefold Witchcraft — Ember Witch talents: +2 to learned talent ranks; does not unlock talents or perk choices. Ember Witch only. Duplicates do not stack.

### Hexfinger

`u_gen_5_1` · Item level 9

Supporting stats: +26% Spell Power; +24 to Aether; +7 Willpower; +10% Shadow Damage.

Frailty Written Deep — Mark of Frailty (Gravebinder): +10 curse amplification (%). Gravebinder only. Duplicates do not stack.

### Soulwhisper

`u_gen_5_3` · Item level 18

Supporting stats: +32% Spell Power; +29% Aether Regeneration; +19% Shadow Damage; +19% Summon Damage.

Second Whisper — Raise Plague Mage (Gravebinder): +1 Plague Mages. Gravebinder only. Duplicates do not stack.

### Gravewand

`u_gen_5_5` · Item level 31

Supporting stats: +40% Spell Power; All Resistances +15%; +34% Shadow Damage; +34% Summon Life.

Bonecraft Testament — Bonecraft tree (Gravebinder): +1 to learned talent ranks; does not unlock talents or perk choices. Gravebinder only. Duplicates do not stack.

### Rotcaller

`u_gen_5_7` · Item level 47

Supporting stats: +51% Spell Power; +72 to Aether; +34% Poison Damage.

Rot Without Borders — Contagion (Gravebinder): 60% more Contagion spread reach. Gravebinder only. Duplicates do not stack.

### Tombquill

`u_gen_5_9` · Item level 65

Supporting stats: +75% Spell Power; +65% Cast Speed; +41 Vitality; +49% Shadow Damage.

Tomb of Beckoning — Hex of Beckoning (Gravebinder): +3 to learned talent ranks; does not unlock talents or perk choices. Gravebinder only. Duplicates do not stack.

### Wraithsplinter

`u_gen_5_11` · Item level 84

Supporting stats: +75% Spell Power; +70 Willpower; +192% Aether Regeneration; +64% Shadow Damage.

A Thrifty Soul — Soul Siphon (Gravebinder): 35% less channel Aether drain. Gravebinder only. Duplicates do not stack.

### Aegis of Ash

`u_gen_6_0` · Item level 5

Supporting stats: +40% Armor; +29 to Life; Fire Resist +17%.

Cinder Discipline — Cinder tree (Ember Witch): +1 to learned talent ranks; does not unlock talents or perk choices. Ember Witch only. Duplicates do not stack.

### Dragonscale

`u_gen_6_2` · Item level 13

Supporting stats: +48% Armor; Fire Resist +29%; +8 Vitality.

Dragonhide Bear — Bear Form (Wildkeeper): 60% more Bear Form duration. Wildkeeper only. Duplicates do not stack.

### Bulwark

`u_gen_6_4` · Item level 24

Supporting stats: +59% Armor; +73 to Life; Attackers take 11 Damage.

Rooted Bulwark — Bulwark Stance (Vanguard): 60% more armor while rooted. Vanguard only. Duplicates do not stack.

### Cindermail

`u_gen_6_6` · Item level 39

Supporting stats: +98% Armor; +107 to Life; Adds 29-48 Fire Damage.

Packed Powder — Powder Trap (Veil Ranger): 50% more trap explosion radius. Veil Ranger only. Duplicates do not stack.

### Emberweave Carapace

`u_gen_6_8` · Item level 56

Supporting stats: +154% Armor; Fire Resist +125%; +125 to Aether.

Long Burning Weave — Wall of Fire (Ember Witch): 60% more firewall duration. Ember Witch only. Duplicates do not stack.

### Scaleforge Vest

`u_gen_6_10` · Item level 74

Supporting stats: +440% Armor; +70 Vitality; All Resistances +49%.

Stone Mantle — Stone Form (Wildkeeper): +30 Stone Form armor bonus (%). Wildkeeper only. Duplicates do not stack.

### Ashen Bastion

`u_gen_6_12` · Item level 93

Supporting stats: +440% Armor; +443 to Life; Physical Damage Reduced by 40.

Marrow Bastion — Bone Armor (Gravebinder): +4 to learned talent ranks; does not unlock talents or perk choices. Gravebinder only. Duplicates do not stack.

### Crown of Cinders

`u_gen_7_1` · Item level 9

Supporting stats: +1 to All Talents; +24 to Aether; Fire Resist +29%.

Cinder Coronation — Fan of Cinders (Ember Witch): +2 cinder bolts. Ember Witch only. Duplicates do not stack.

### Skullhelm

`u_gen_7_3` · Item level 18

Supporting stats: +53% Armor; +48 to Life; All Resistances +15%; +19% Summon Life.

Audience of Whispers — Grave Whispers (Gravebinder): +1 to learned talent ranks; does not unlock talents or perk choices. Gravebinder only. Duplicates do not stack.

### Visage

`u_gen_7_5` · Item level 31

Supporting stats: +1 to All Talents; +19% Cast Speed; +43 to Aether.

The Beckoning Face — Hex of Beckoning (Gravebinder): 60% more beckoning duration. Gravebinder only. Duplicates do not stack.

### Doomcap

`u_gen_7_7` · Item level 47

Supporting stats: +51% Spell Power; +33% Critical Strike Chance; +72 to Aether.

Doom Comes Early — Doom (Gravebinder): 35% less time to full Doom charge. Gravebinder only. Duplicates do not stack.

### Diadem of the Drowned King

`u_gen_7_9` · Item level 65

Supporting stats: +2 to All Talents; +214 to Aether; Cold Resist +125%.

Rime Doctrine — Rime tree (Ember Witch): +3 to learned talent ranks; does not unlock talents or perk choices. Ember Witch only. Duplicates do not stack.

### Boneward Casque

`u_gen_7_11` · Item level 84

Supporting stats: +440% Armor; +443 to Life; +70 Vitality; +64% Summon Life.

The Gravebinder's Crown — Gravebinder talents: +2 to learned talent ranks; does not unlock talents or perk choices. Gravebinder only. Duplicates do not stack.

### Hauntpace

`u_gen_8_0` · Item level 5

Supporting stats: +16% Movement Speed; +6 Dexterity; Cold Resist +17%.

Long Shadow — Shadowstep (Veil Ranger): 50% more Shadowstep reach. Veil Ranger only. Duplicates do not stack.

### Windsole

`u_gen_8_2` · Item level 13

Supporting stats: +19% Movement Speed; +8 Vitality; +48 to Life.

Fleet March — Fleet of Foot (Vanguard): +1 to learned talent ranks; does not unlock talents or perk choices. Vanguard only. Duplicates do not stack.

### Ghoststep

`u_gen_8_4` · Item level 24

Supporting stats: +19% Movement Speed; +13 Dexterity; All Resistances +15%.

Wolfwind — Wolf Form (Wildkeeper): +20 Wolf Form movement bonus (%). Wildkeeper only. Duplicates do not stack.

### Swiftmarch

`u_gen_8_6` · Item level 39

Supporting stats: +29% Movement Speed; +29% Attack Speed; +13 Strength.

Unbroken Charge — Bull Charge (Vanguard): 50% more charge reach. Vanguard only. Duplicates do not stack.

### Galeheel

`u_gen_8_8` · Item level 56

Supporting stats: +67% Movement Speed; +41 Dexterity; +125 to Aether.

Gale Crossing — Arc Teleport (Ember Witch): 50% more Arc Teleport reach. Ember Witch only. Duplicates do not stack.

### Pallor Treads

`u_gen_8_10` · Item level 74

Supporting stats: +114% Movement Speed; Cold Resist +125%; +443 to Life.

Pallid Snare — Frostbite Trap (Veil Ranger): 50% more Frostbite Trap slow duration. Veil Ranger only. Duplicates do not stack.

### Breath of the Hollow Road

`u_gen_8_12` · Item level 93

Supporting stats: +114% Movement Speed; +70 Vitality; All Resistances +82%.

Quickened Road — Quickening (Veil Ranger): +4 to learned talent ranks; does not unlock talents or perk choices. Veil Ranger only. Duplicates do not stack.

### Stormknot

`u_gen_9_1` · Item level 9

Supporting stats: +26% Spell Power; Lightning Resist +29%; +24 to Aether.

Tempest Doctrine — Tempest tree (Ember Witch): +1 to learned talent ranks; does not unlock talents or perk choices. Ember Witch only. Duplicates do not stack.

### Heart of the Marsh

`u_gen_9_3` · Item level 18

Supporting stats: +48 to Life; +28 to Aether; Poison Resist +29%.

Marsh Siphon — Soul Siphon (Gravebinder): 50% more maximum channel duration. Gravebinder only. Duplicates do not stack.

### Soulglass

`u_gen_9_5` · Item level 31

Supporting stats: +40% Spell Power; +13 Willpower; All Resistances +15%.

Static Reflection — Overload (Ember Witch): 60% more damage per Static charge. Ember Witch only. Duplicates do not stack.

### Eye of the Vigil

`u_gen_9_7` · Item level 47

Supporting stats: +33% Critical Strike Chance; +312 Attack Rating; All Resistances +20%.

Vanguard's Vigil — Vanguard talents: +1 to learned talent ranks; does not unlock talents or perk choices. Vanguard only. Duplicates do not stack.

### Tempestbinder's Charm

`u_gen_9_9` · Item level 65

Supporting stats: +75% Spell Power; +65% Cast Speed; Lightning Resist +125%.

Wildkin Covenant — Wildkin tree (Wildkeeper): +3 to learned talent ranks; does not unlock talents or perk choices. Wildkeeper only. Duplicates do not stack.

### Mirelight Pendant

`u_gen_9_11` · Item level 84

Supporting stats: +443 to Life; +192% Aether Regeneration; Poison Resist +125%.

The Ranger's Pendant — Veil Ranger talents: +2 to learned talent ranks; does not unlock talents or perk choices. Veil Ranger only. Duplicates do not stack.

### Sanguine Coil

`u_gen_10_0` · Item level 5

Supporting stats: 4% Life Stolen per Hit; +5% Critical Strike Chance; +6 Strength.

Circle of the Wild — Wildkeeper talents: +1 to learned talent ranks; does not unlock talents or perk choices. Wildkeeper only. Duplicates do not stack.

### Bloodloop

`u_gen_10_2` · Item level 13

Supporting stats: +48 to Life; +8 Vitality; All Resistances +9%.

Bearblood Lesson — Bear Form (Wildkeeper): +1 to learned talent ranks; does not unlock talents or perk choices. Wildkeeper only. Duplicates do not stack.

### Ring of Ruin

`u_gen_10_4` · Item level 24

Supporting stats: +64% Damage; Adds 17-27 Fire Damage; +29% Attack Speed.

Ruin Rekindled — Pyre (Ember Witch): +0.15 repeat-Pyre chance per stack. Ember Witch only. Duplicates do not stack.

### Coilfire

`u_gen_10_6` · Item level 39

Supporting stats: +45% Spell Power; +72 to Aether; +36% Cast Speed.

Endless Inferno — Inferno (Ember Witch): 50% more Inferno duration. Ember Witch only. Duplicates do not stack.

### Emberveins

`u_gen_10_8` · Item level 56

Supporting stats: +155 to Life; Adds 89-147 Fire Damage; 9% Life Stolen per Hit.

Soul-fed Veins — Soul Siphon (Gravebinder): 50% more Life drained. Gravebinder only. Duplicates do not stack.

### Wound of Cinders

`u_gen_10_10` · Item level 74

Supporting stats: +443 to Life; Fire Resist +125%; +152% Critical Damage.

Unhealed Mark — Killing Mark (Veil Ranger): 50% more Killing Mark duration. Veil Ranger only. Duplicates do not stack.

### Serpent's Pyre

`u_gen_10_12` · Item level 93

Supporting stats: Adds 743 Poison Damage over 3s; Adds 151-251 Fire Damage; +70 Dexterity.

Serpent's Spit — Venom Spit (Gravebinder): 75% more poison damage over time. Gravebinder only. Duplicates do not stack.

### Earthshaker

`u_gen_11_1` · Item level 9

Supporting stats: +46% Damage; +7 Strength; 24% Reduced Slow/Stun Duration.

Stormcall Doctrine — Stormcall tree (Wildkeeper): +1 to learned talent ranks; does not unlock talents or perk choices. Wildkeeper only. Duplicates do not stack.

### Worldhammer

`u_gen_11_3` · Item level 18

Supporting stats: +57% Damage; +48 to Life; Attackers take 9 Damage.

World Fracture — Fissure (Wildkeeper): 60% more fissure width. Wildkeeper only. Duplicates do not stack.

### Tollbringer

`u_gen_11_5` · Item level 31

Supporting stats: +79% Damage; +13 Vitality; +79% Armor.

Toll Beneath the Earth — Earthquake (Wildkeeper): 50% more Earthquake radius. Wildkeeper only. Duplicates do not stack.

### Cataclysm

`u_gen_11_7` · Item level 47

Supporting stats: +145% Damage; +87% Critical Damage; +24 Strength.

Cataclysmic Pull — Cyclone (Wildkeeper): 75% more Cyclone pull. Wildkeeper only. Duplicates do not stack.

### Doomtoll

`u_gen_11_9` · Item level 65

Supporting stats: +328% Damage; +921 Attack Rating; +214 to Aether.

Wildshape Covenant — Wildshape tree (Wildkeeper): +3 to learned talent ranks; does not unlock talents or perk choices. Wildkeeper only. Duplicates do not stack.

### The Sunken Peal

`u_gen_11_11` · Item level 84

Supporting stats: +548% Damage; +443 to Life; Cold Resist +125%.

Second Storm — Storm Totem (Wildkeeper): +1 Storm Totems. Wildkeeper only. Duplicates do not stack.

### Edge of Vows

`u_gen_12_0` · Item level 5

Supporting stats: +41% Damage; +11% Attack Speed; +6 Dexterity.

Arms Doctrine — Arms tree (Vanguard): +1 to learned talent ranks; does not unlock talents or perk choices. Vanguard only. Duplicates do not stack.

### Lightbrand

`u_gen_12_2` · Item level 13

Supporting stats: +51% Damage; Adds 1-25 Lightning Damage; +8 Strength.

Dawn's Rhythm — Tempo Strike (Vanguard): 50% more Tempo window. Vanguard only. Duplicates do not stack.

### Kingsblade

`u_gen_12_4` · Item level 24

Supporting stats: +64% Damage; 7% Life Stolen per Hit; +73 to Life.

King's Rally — Rallying Cry (Vanguard): 40% more rally healing. Vanguard only. Duplicates do not stack.

### Vowkeeper

`u_gen_12_6` · Item level 39

Supporting stats: +98% Damage; +87% Critical Damage; +13 Dexterity.

Lingering Sunder — Sunder Combo (Vanguard): 75% more armor-shred duration. Vanguard only. Duplicates do not stack.

### Dawnsworn

`u_gen_12_8` · Item level 56

Supporting stats: +195% Damage; Fire Resist +125%; +67% Attack Speed.

Berserker's Vow — Berserker Stance (Vanguard): +3 to learned talent ranks; does not unlock talents or perk choices. Vanguard only. Duplicates do not stack.

### The Gilded Promise

`u_gen_12_10` · Item level 74

Supporting stats: +328% Damage; +921 Attack Rating; All Resistances +49%.

Gilded Riposte — Riposte Stance (Vanguard): 60% more counter stun duration. Vanguard only. Duplicates do not stack.

### Throneward

`u_gen_12_12` · Item level 93

Supporting stats: +548% Damage; +70 Vitality; +443 to Life.

Standard of Mercy — Standard of the Last Stand (Vanguard): 60% more standard healing. Vanguard only. Duplicates do not stack.

### Tusk

`u_gen_13_1` · Item level 9

Supporting stats: +46% Damage; 4% Life Stolen per Hit; +7 Strength.

Long Rabies — Rabies (Wildkeeper): 50% more Rabies duration. Wildkeeper only. Duplicates do not stack.

### Cleaver's Joy

`u_gen_13_3` · Item level 18

Supporting stats: +57% Damage; +120% Damage to Undead; +5% Critical Strike Chance.

Cleaving Fire — Fire Claw (Wildkeeper): +1 fire explosions. Wildkeeper only. Duplicates do not stack.

### Bonereaver

`u_gen_13_5` · Item level 31

Supporting stats: +79% Damage; +29% Attack Speed; +29% Movement Speed.

Long Hunt — Wolf Form (Wildkeeper): 50% more Wolf Form duration. Wildkeeper only. Duplicates do not stack.

### Wolfsplit

`u_gen_13_7` · Item level 47

Supporting stats: +145% Damage; Attackers take 29 Damage; +24 Vitality; +34% Summon Life.

The Pack Shares Pain — Kindred Bond (Wildkeeper): +5 damage shared with companions (%). Wildkeeper only. Duplicates do not stack.

### Huntsmaw

`u_gen_13_9` · Item level 65

Supporting stats: +328% Damage; 15% Life Stolen per Hit; +41 Dexterity; +49% Summon Damage.

Twin Tusks — Thornback Boar (Wildkeeper): +1 Thornback Boars. Wildkeeper only. Duplicates do not stack.

### Antlershear

`u_gen_13_11` · Item level 84

Supporting stats: +548% Damage; +33% Critical Strike Chance; +921 Attack Rating.

Antlered Wrath — Wrath of the Wild (Wildkeeper): +30 Wrath damage bonus (%). Wildkeeper only. Duplicates do not stack.

### Vesper

`u_gen_14_0` · Item level 5

Supporting stats: +41% Damage; +6 Strength; 24% Reduced Slow/Stun Duration.

Warcries Doctrine — Warcries tree (Vanguard): +1 to learned talent ranks; does not unlock talents or perk choices. Vanguard only. Duplicates do not stack.

### Bellringer

`u_gen_14_2` · Item level 13

Supporting stats: +51% Damage; +70% Damage to Undead; +48 to Life.

Far-reaching Rally — Rallying Cry (Vanguard): 50% more rally radius. Vanguard only. Duplicates do not stack.

### Knell

`u_gen_14_4` · Item level 24

Supporting stats: +64% Damage; +59% Armor; +13 Vitality.

Echo of Terror — Terrifying Bellow (Vanguard): 50% more fear duration. Vanguard only. Duplicates do not stack.

### Sanctus

`u_gen_14_6` · Item level 39

Supporting stats: +98% Damage; +18% Critical Strike Chance; All Resistances +20%.

Crushing Roar — Sundering Roar (Vanguard): +20 roar slow (%). Vanguard only. Duplicates do not stack.

### Matins

`u_gen_14_8` · Item level 56

Supporting stats: +195% Damage; +192% Aether Regeneration; +41 Willpower.

Morning Standard — War Banner (Vanguard): 60% more banner duration. Vanguard only. Duplicates do not stack.

### Final Tithe

`u_gen_14_10` · Item level 74

Supporting stats: +328% Damage; 25% Life Stolen per Hit; +70 Strength.

The Last Congregation — Standard of the Last Stand (Vanguard): 50% more standard radius. Vanguard only. Duplicates do not stack.

### Choir of Ash

`u_gen_14_12` · Item level 93

Supporting stats: +548% Damage; Fire Resist +125%; +443 to Life.

Will of the Choir — Iron Will (Vanguard): +4 to learned talent ranks; does not unlock talents or perk choices. Vanguard only. Duplicates do not stack.

### Skyfall Pike

`u_gen_15_1` · Item level 9

Supporting stats: +46% Damage; +7 Dexterity; +16% Movement Speed.

Skyfall Fissure — Fissure (Wildkeeper): 50% more fissure reach. Wildkeeper only. Duplicates do not stack.

### Stormlance

`u_gen_15_3` · Item level 18

Supporting stats: +57% Damage; Adds 1-55 Lightning Damage; +9 Strength.

Long Storm — Storm Totem (Wildkeeper): 50% more totem targeting radius. Wildkeeper only. Duplicates do not stack.

### Heaven's Reach

`u_gen_15_5` · Item level 31

Supporting stats: +79% Damage; +29% Attack Speed; +156 Attack Rating.

Hurrying Wisps — Tempest Totem (Wildkeeper): 35% less wisp interval. Wildkeeper only. Duplicates do not stack.

### Thunderpike

`u_gen_15_7` · Item level 47

Supporting stats: +145% Damage; Adds 47-77 Cold Damage; +24 Dexterity.

Winter Cyclone — Cyclone (Wildkeeper): 50% more Cyclone lifetime. Wildkeeper only. Duplicates do not stack.

### Tempest's Descent

`u_gen_15_9` · Item level 65

Supporting stats: +328% Damage; +33% Critical Strike Chance; Lightning Resist +125%.

Sky-Sap Lesson — Sky-Sap (Wildkeeper): +3 to learned talent ranks; does not unlock talents or perk choices. Wildkeeper only. Duplicates do not stack.

### Cloudpiercer

`u_gen_15_11` · Item level 84

Supporting stats: +548% Damage; +921 Attack Rating; +214 to Aether.

Restless Earth — Earthquake (Wildkeeper): 25% less Earthquake pulse interval. Wildkeeper only. Duplicates do not stack.

### Heartseeker

`u_gen_16_0` · Item level 5

Supporting stats: +41% Damage; +6 Dexterity; Adds 4-6 Fire Damage.

Heartseeker's Aim — Aimed Shot (Veil Ranger): 35% more Aimed Shot damage. Veil Ranger only. Duplicates do not stack.

### Repeater

`u_gen_16_2` · Item level 13

Supporting stats: +51% Damage; +5% Critical Strike Chance; +24% Critical Damage.

Precision Doctrine — Precision tree (Veil Ranger): +1 to learned talent ranks; does not unlock talents or perk choices. Veil Ranger only. Duplicates do not stack.

### Boltwidow

`u_gen_16_4` · Item level 24

Supporting stats: +64% Damage; +29% Attack Speed; +19% Movement Speed.

Widow's Rain — Arrowfall (Veil Ranger): 50% more Arrowfall radius. Veil Ranger only. Duplicates do not stack.

### Killshot

`u_gen_16_6` · Item level 39

Supporting stats: +98% Damage; +13 Dexterity; Adds 153 Poison Damage over 3s.

Last Quarry — Drawn Shot (Veil Ranger): 50% more damage per consumed Quarry stack. Veil Ranger only. Duplicates do not stack.

### Pulsebreaker

`u_gen_16_8` · Item level 56

Supporting stats: +195% Damage; +33% Critical Strike Chance; +539 Attack Rating.

Broken Ricochet — Ricochet Shard (Veil Ranger): 40% more ricochet damage. Veil Ranger only. Duplicates do not stack.

### The Quickening Quarrel

`u_gen_16_10` · Item level 74

Supporting stats: +328% Damage; +114% Attack Speed; +214 to Aether.

Snares Doctrine — Snares tree (Veil Ranger): +3 to learned talent ranks; does not unlock talents or perk choices. Veil Ranger only. Duplicates do not stack.

### Last Heartbeat

`u_gen_16_12` · Item level 93

Supporting stats: +548% Damage; +152% Critical Damage; +443 to Life.

Flurry of Openings — Shadow Flurry (Veil Ranger): +20 damage against Exposed foes (%). Veil Ranger only. Duplicates do not stack.

### Wardlight

`u_gen_17_1` · Item level 9

Supporting stats: +44% Armor; All Resistances +9%; +48 to Life.

Bulwark Lesson — Bulwark Stance (Vanguard): +1 to learned talent ranks; does not unlock talents or perk choices. Vanguard only. Duplicates do not stack.

### Bastion

`u_gen_17_3` · Item level 18

Supporting stats: +19% Block Chance; +53% Armor; +9 Vitality.

Bastion's Lesson — Riposte Stance (Vanguard): +1 to learned talent ranks; does not unlock talents or perk choices. Vanguard only. Duplicates do not stack.

### Sanctuary

`u_gen_17_5` · Item level 31

Supporting stats: +79% Armor; Attackers take 15 Damage; Fire Resist +39%.

Winter Sanctuary — Rimeguard (Ember Witch): +2 to learned talent ranks; does not unlock talents or perk choices. Ember Witch only. Duplicates do not stack.

### Aegis Eternal

`u_gen_17_7` · Item level 47

Supporting stats: +154% Armor; +155 to Life; All Resistances +20%.

Bear's Shelter — Bear Form (Wildkeeper): +25 Bear Form Life bonus (%). Wildkeeper only. Duplicates do not stack.

### The Unbroken Vow

`u_gen_17_9` · Item level 65

Supporting stats: +77% Block Chance; +263 to Life; +41 Vitality.

Unbroken Bone — Bone Armor (Gravebinder): 60% more bone shield absorption. Gravebinder only. Duplicates do not stack.

### Refuge of Ash

`u_gen_17_11` · Item level 84

Supporting stats: +440% Armor; Fire Resist +125%; +214 to Aether.

Patient Stone — Stone Form (Wildkeeper): 50% more Stone Form duration. Wildkeeper only. Duplicates do not stack.

### Gravewrought Grips

`u_gen_18_0` · Item level 5

Supporting stats: +11% Attack Speed; +5% Critical Strike Chance; +6 Strength; +10% Summon Damage.

One More Grave — Raise Dead (Gravebinder): +1 raised skeletons. Gravebinder only. Duplicates do not stack.

### Throttle

`u_gen_18_2` · Item level 13

Supporting stats: +19% Attack Speed; +8 Dexterity; 4% Life Stolen per Hit.

Lingering Frailty — Mark of Frailty (Gravebinder): 60% more curse duration. Gravebinder only. Duplicates do not stack.

### Vise

`u_gen_18_4` · Item level 24

Supporting stats: +64% Damage; +24% Critical Damage; +13 Strength.

Unrelenting Dragnet — Dragnet (Veil Ranger): 50% more Dragnet capture radius. Veil Ranger only. Duplicates do not stack.

### Deadhand

`u_gen_18_6` · Item level 39

Supporting stats: +29% Attack Speed; +29% Movement Speed; +107 to Life; +34% Summon Damage.

Rally the Deadhand — Feral Howl (Wildkeeper): 50% more companion rally damage bonus. Wildkeeper only. Duplicates do not stack.

### Sepulcher's Clutch

`u_gen_18_8` · Item level 56

Supporting stats: +75% Spell Power; +65% Cast Speed; +125 to Aether; +49% Summon Life.

Sepulcher's Offering — Sacrificial Pyre (Gravebinder): 50% more sacrifice explosion damage. Gravebinder only. Duplicates do not stack.

### Stranglemourn

`u_gen_18_10` · Item level 74

Supporting stats: +114% Attack Speed; Adds 444 Poison Damage over 3s; +70 Dexterity.

Sorrow Spreads — Contagion (Gravebinder): 60% more Contagion death-burst radius. Gravebinder only. Duplicates do not stack.

### Palms of the Pit

`u_gen_18_12` · Item level 93

Supporting stats: +548% Damage; +70 Strength; Fire Resist +125%.

Bone Through Ruin — Bone Spear (Gravebinder): 45% more Bone Spear damage. Gravebinder only. Duplicates do not stack.

### Serpentcoil

`u_gen_19_1` · Item level 9

Supporting stats: +48 to Life; All Resistances +9%; +7 Strength.

Marrow Lesson — Marrow Pact (Gravebinder): +1 to learned talent ranks; does not unlock talents or perk choices. Gravebinder only. Duplicates do not stack.

### Girdle of Spite

`u_gen_19_3` · Item level 18

Supporting stats: +48 to Life; Adds 38 Poison Damage over 3s; +9 Vitality.

Rot Doctrine — Rot tree (Gravebinder): +1 to learned talent ranks; does not unlock talents or perk choices. Gravebinder only. Duplicates do not stack.

### Venomwind

`u_gen_19_5` · Item level 31

Supporting stats: +107 to Life; Fire Resist +39%; Cold Resist +39%.

Venom on the Wind — Rabies (Wildkeeper): 60% more contagious cloud radius. Wildkeeper only. Duplicates do not stack.

### Coilbind

`u_gen_19_7` · Item level 47

Supporting stats: +155 to Life; +39% Movement Speed; +24 Dexterity.

Binding Miasma — Miasma (Gravebinder): +20 Miasma slow (%). Gravebinder only. Duplicates do not stack.

### The Tightening Hiss

`u_gen_19_9` · Item level 65

Supporting stats: +263 to Life; +214 to Aether; Poison Resist +125%.

Carrion's Embrace — Carrion Bloom (Gravebinder): +25 poison damage-over-time bonus (%). Gravebinder only. Duplicates do not stack.

### Fangknot

`u_gen_19_11` · Item level 84

Supporting stats: +443 to Life; +70 Vitality; Adds 743 Poison Damage over 3s.

Unbound Outbreak — Outbreak (Gravebinder): 50% more Outbreak radius. Gravebinder only. Duplicates do not stack.

## Charms

### Cutpurse Charm

`uc_thief` · Item level 12

Supporting stats: +12% Better Chance of Rare Loot; +30% Gold Found.

Quick Fingers — Kills against elites or bosses: +30% Better Chance of Rare Loot, +40% Gold Found for 8s. 5s cooldown. Duplicates do not stack.

### Emberheart Charm

`uc_ember` · Item level 20

Supporting stats: Adds 9-14 Fire Damage; Fire Resist +14%.

Unfading Coal — Spell hits with fire (2 qualifying events): Fire Resist +20% for 5s. 5s cooldown. Duplicates do not stack.

### Hare's Charm

`uc_quick` · Item level 26

Supporting stats: +9% Movement Speed; +6 Dexterity.

Hare's Start — Damage received: +35% Movement Speed for 3s. 8s cooldown. Duplicates do not stack.

### Mystic Orbcharm

`uc_mystic` · Item level 38

Supporting stats: +16% Spell Power; +40 to Aether; +25% Aether Regeneration.

Unspoken Syllable — Aether spent (60 Aether): restore 10% of maximum Aether; +15% Cast Speed for 4s. 8s cooldown. Duplicates do not stack.

### Gravewarden Charm

`uc_grave` · Item level 40

Supporting stats: +45 to Life; All Resistances +10%; Replenish Life +4.

Keep Your Distance — Kills against undead: slow non-boss enemies within 3 yards by 40% for 3s; restore 4% of maximum Life. 5s cooldown. Duplicates do not stack.

### Sanguine Charm

`uc_vampire` · Item level 50

Supporting stats: 5% Life Stolen per Hit; 4% Aether Stolen per Hit; +35 to Life.

Sanguine Reserve — Weapon hits that critically strike: restore 3% of maximum Life; restore 3% of maximum Aether. 4s cooldown. Duplicates do not stack.

### Huntress Talisman

`uc_hunt` · Item level 45

Supporting stats: +24% Damage; +120 Attack Rating; +8% Attack Speed.

Huntress's Patience — Weapon hits after standing still for 1s (3 qualifying events): your next weapon hit within 6s deals 40% more damage. 5s cooldown. Duplicates do not stack.

### Warlord's Sigil

`uc_warlord` · Item level 55

Supporting stats: +28% Damage; +18 Strength; 20% Reduced Slow/Stun Duration.

Last One Standing — Kills without fighting companions: gain a barrier worth 8% of maximum Life for 5s; refreshes, never accumulates; +15% Attack Speed for 4s. 5s cooldown. Duplicates do not stack.

### Wyrmscale Charm

`uc_wyrm` · Item level 62

Supporting stats: All Resistances +18%; +55 to Life; Physical Damage Reduced by 6.

Ancient Molt — Damage received from elemental damage: gain a barrier worth 10% of maximum Life for 5s; refreshes, never accumulates; 25% Reduced Slow/Stun Duration for 4s. 8s cooldown. Duplicates do not stack.

## Jewels

### Old Oak's Heart

`uj_oak` · Item level 16

Supporting stats: +20 to Life; Poison Resist +15%.

Barkskin — Damage received from melee attacks: gain a barrier worth 8% of maximum Life for 4s; refreshes, never accumulates. 8s cooldown. Duplicates do not stack.

### Prismfire Jewel

`uj_rainbow` · Item level 22

Supporting stats: All Resistances +12%; +25 to Life.

Prismatic Turn — Spell hits; alternate spell elements: All Resistances +12% for 4s. 5s cooldown. Duplicates do not stack.

### Jewel of Rage

`uj_rage` · Item level 28

Supporting stats: +35% Damage; +10% Attack Speed.

Rising Rage — Weapon hits (5 qualifying events): +20% Attack Speed, +20% Critical Damage for 4s. 5s cooldown. Duplicates do not stack.

### Heartfrost Jewel

`uj_frost` · Item level 34

Supporting stats: Adds 18-30 Cold Damage; Cold Resist +20%.

Heart of Winter — Weapon or spell hits against slowed enemies: gain a barrier worth 6% of maximum Life for 5s; refreshes, never accumulates. 5s cooldown. Duplicates do not stack.

### Wardstone Jewel

`uj_ward` · Item level 40

Supporting stats: Physical Damage Reduced by 6; All Resistances +10%.

Stubborn Stone — Damage received from elites or bosses: 15% Damage Reduction for 3s. 5s cooldown. Duplicates do not stack.

### Bloodthirst Jewel

`uj_leech` · Item level 46

Supporting stats: 5% Life Stolen per Hit; +24% Damage.

Drink Deep — Weapon hits against enemies exposed by a Unique power: restore 4% of maximum Life; restore 4% of maximum Aether. 5s cooldown. Duplicates do not stack.

### Stormshard Jewel

`uj_storm` · Item level 52

Supporting stats: Adds 1-40 Lightning Damage; +8% Attack Speed.

Remembered Thunder — Spell hits with lightning (4 qualifying events): arc to 2 other enemies within 5 yards for 35% of hit damage as light damage; gain a barrier worth 4% of maximum Life for 5s; refreshes, never accumulates. 5s cooldown. Duplicates do not stack.

### Titanfall Jewel

`uj_titan` · Item level 56

Supporting stats: +18 to Maximum Damage; +15 Strength.

Heavy Intent — Weapon hits that critically strike: slow non-boss enemies within 3 yards by 45% for 3s; +20% Armor for 4s. 5s cooldown. Duplicates do not stack.

### Seer's Jewel

`uj_seer` · Item level 62

Supporting stats: +25% Spell Power; +40 to Aether.

Looking Back — Skill uses (4 qualifying events): your next spell hit within 6s deals 40% more damage. 5s cooldown. Duplicates do not stack.

## Glyphs

### Doomglyph

`g_doom` · Drop level 20

Weapons: +25% Damage; Adds 8-12 Fire Damage.

Armor: All Resistances +12%; +25 to Life.

**In weapons:** Doombrand — Weapon hits against demons: inflict 100% of hit damage as fire damage over 3s. 5s cooldown. Duplicates do not stack.

**In armor:** Doomguard — Damage received while at or below 40% Life: erupt within 2.5 yards for 50% of damage taken as fire damage; restore 6% of maximum Aether. 10s cooldown. Duplicates do not stack.

### Voidglyph

`g_void` · Drop level 28

Weapons: +20% Spell Power; 4% Aether Stolen per Hit.

Armor: +40 to Aether; +8% Cast Speed.

**In weapons:** Void Draw — Spell hits while at or below 35% Aether: restore 7% of maximum Aether; the target takes 10% more damage for 4s; strongest exposure applies. 5s cooldown. Duplicates do not stack.

**In armor:** Void Shelter — Aether spent (35 Aether): gain a barrier worth 8% of maximum Life for 5s; refreshes, never accumulates. 5s cooldown. Duplicates do not stack.

### Titanglyph

`g_titan` · Drop level 36

Weapons: +14 to Maximum Damage; +12 Strength.

Armor: +30% Armor; +10 Strength.

**In weapons:** Titan's Aftershock — Weapon hits against elites or bosses: erupt within 2.5 yards for 60% of hit damage as earth damage. 5s cooldown. Duplicates do not stack.

**In armor:** Titan's Resolve — Blocks: +20 Strength, 10% Damage Reduction for 4s. 5s cooldown. Duplicates do not stack.

### Wraithglyph

`g_wraith` · Drop level 24

Weapons: 5% Life Stolen per Hit; +5% Critical Strike Chance.

Armor: +12% Movement Speed; +8% Evasion.

**In weapons:** Wraith's Passing — Kills: your next spell hit within 6s deals 35% more damage. 5s cooldown. Duplicates do not stack.

**In armor:** Wraithwalk — Walking (10 yards): restore 4% of maximum Aether; +12% Evasion for 4s. 5s cooldown. Duplicates do not stack.

### Aegisglyph

`g_aegis` · Drop level 16

Weapons: +60% Damage to Undead; +80 Attack Rating.

Armor: All Resistances +15%; Physical Damage Reduced by 4.

**In weapons:** Aegis Judgment — Weapon hits against undead: your next spell hit within 6s deals 40% more damage; gain a barrier worth 4% of maximum Life for 5s; refreshes, never accumulates. 5s cooldown. Duplicates do not stack.

**In armor:** Aegis Vigil — Damage received from undead: gain a barrier worth 8% of maximum Life for 5s; refreshes, never accumulates; All Resistances +10% for 4s. 5s cooldown. Duplicates do not stack.

### Venomglyph

`g_venom` · Drop level 12

Weapons: Adds 30 Poison Damage over 3s; +8% Attack Speed.

Armor: Poison Resist +30%; +20 to Life.

**In weapons:** Venom's Ripening — Weapon hits against poisoned enemies (3 qualifying events): erupt within 2.5 yards for 55% of hit damage as poison damage. 5s cooldown. Duplicates do not stack.

**In armor:** Venom's Antidote — Damage received with poison: restore 5% of maximum Life; +20% Movement Speed for 4s. 5s cooldown. Duplicates do not stack.
