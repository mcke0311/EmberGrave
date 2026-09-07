# Unique items

162 named brown items, with 168 signature powers including both glyph modes. Generated from the authored runtime catalogue by `node tools/export_unique_catalog.mjs`.

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

Supporting stats: +39% Damage; 3% Life Stolen per Hit; +33% Damage to Undead.

Coffin Ward — Kills against undead: gain a barrier worth 8% of maximum Life for 5s; refreshes, never accumulates. 3s cooldown. Duplicates do not stack.

### Widow's Lament

`u_widow` · Item level 3

Supporting stats: Adds 8 Poison Damage over 3s; +6 Dexterity; +10% Attack Speed.

The Third Mourning — Weapon hits (3 qualifying events on the same target): erupt within 2.5 yards for 55% of hit damage as poison damage. 3s cooldown. Duplicates do not stack.

### Cindershroud

`u_cinder` · Item level 4

Supporting stats: +39% Armor; Fire Resist +13%; Attackers take 5 Damage.

Banked Wrath — Damage received (3 qualifying events): erupt within 3 yards for 50% of damage taken as fire damage. 6s cooldown. Duplicates do not stack.

### Oathkeeper's Wall

`u_oath` · Item level 6

Supporting stats: +8% Block Chance; All Resistances +6%; +20 to Life.

Kept Promise — Blocks: your next weapon hit within 6s deals 45% more damage. 5s cooldown. Duplicates do not stack.

### Hollow Crown

`u_crown` · Item level 5

Supporting stats: +1 to All Talents; +19 to Aether; +11% Better Chance of Rare Loot.

Empty Throne — Aether spent (30 Aether): your next spell hit within 6s deals 45% more damage. 5s cooldown. Duplicates do not stack.

### Marrow Band

`u_marrow` · Item level 4

Supporting stats: +18 to Life; 3% Life Stolen per Hit; +6 Vitality.

Living Marrow — Healing beyond full Life (5 Life overhealed): gain a barrier worth 5% of maximum Life for 6s; refreshes, never accumulates. 3s cooldown. Duplicates do not stack.

### Stormcaller's Knot

`u_stormknot` · Item level 5

Supporting stats: Adds 1-9 Lightning Damage; +11% Cast Speed; Lightning Resist +13%.

Braided Thunder — Weapon or spell hits; alternate weapon and spell hits: arc to 3 other enemies within 5 yards for 40% of hit damage as light damage. 4s cooldown. Duplicates do not stack.

### Stridewraith

`u_stride` · Item level 5

Supporting stats: +16% Movement Speed; +6 Dexterity; Cold Resist +13%.

The Late Footfall — Walking (6 yards): +18% Evasion for 3s. 6s cooldown. Duplicates do not stack.

### Kingsplitter

`u_kingsplit` · Item level 8

Supporting stats: +45% Damage; +4% Critical Strike Chance; +7 Strength.

Crowncrack — Weapon hits that critically strike (2 qualifying events on the same target): the target takes 18% more damage for 5s; strongest exposure applies. 5s cooldown. Duplicates do not stack.

### Dawnbreaker

`u_gen_0_0` · Item level 5

Supporting stats: +41% Damage; +6 Strength; Fire Resist +13%.

First Light — Weapon hits against enemies at or above 80% Life: erupt within 2.5 yards for 40% of hit damage as fire damage. 5s cooldown. Duplicates do not stack.

### Sunder

`u_gen_0_2` · Item level 13

Supporting stats: +51% Damage; +56 Attack Rating; +18% Critical Damage.

Fault Line — Weapon hits against elites or bosses: the target takes 12% more damage for 4s; strongest exposure applies. 5s cooldown. Duplicates do not stack.

### Kingsbane

`u_gen_0_4` · Item level 24

Supporting stats: +64% Damage; +10 Strength; 4% Life Stolen per Hit.

Royal Tithe — Weapon hits against bosses: restore 3% of maximum Life. 5s cooldown. Duplicates do not stack.

### Worldcleaver

`u_gen_0_6` · Item level 39

Supporting stats: +82% Damage; +6% Critical Strike Chance; +46 to Life.

Cleaving Horizon — Kills that critically strike: erupt within 3 yards for 70% of killing-hit damage (63 for kills over time) as phys damage. 5s cooldown. Duplicates do not stack.

### Mornsplitter

`u_gen_0_8` · Item level 56

Supporting stats: +102% Damage; +16% Attack Speed; Cold Resist +23%.

Morning Pursuit — Weapon hits against slowed enemies: +20% Attack Speed for 4s. 5s cooldown. Duplicates do not stack.

### Heaven's Edge

`u_gen_0_10` · Item level 74

Supporting stats: +124% Damage; +20 Dexterity; Lightning Resist +27%.

Heaven's Answer — Weapon hits at least 5 yards away: arc to 3 other enemies within 5 yards for 35% of hit damage as light damage. 5s cooldown. Duplicates do not stack.

### Aurora's Reckoning

`u_gen_0_12` · Item level 93

Supporting stats: +147% Damage; +38% Critical Damage; All Resistances +14%.

Aurora Verdict — Weapon hits that critically strike (3 qualifying events): erupt within 2.5 yards for 40% of hit damage as cold damage; gain a barrier worth 6% of maximum Life for 5s; refreshes, never accumulates. 5s cooldown. Duplicates do not stack.

### Gorewake

`u_gen_1_1` · Item level 9

Supporting stats: +46% Damage; 3% Life Stolen per Hit; +22 to Life.

Red Wake — Kills within 3 yards: +25% Movement Speed for 4s. 5s cooldown. Duplicates do not stack.

### Reaver's End

`u_gen_1_3` · Item level 18

Supporting stats: +57% Damage; +9 Strength; All Resistances +7%.

Reaver's Shelter — Weapon hits while at or below 40% Life: gain a barrier worth 10% of maximum Life for 5s; refreshes, never accumulates. 5s cooldown. Duplicates do not stack.

### Skullsplit

`u_gen_1_5` · Item level 31

Supporting stats: +72% Damage; +6% Critical Strike Chance; +92 Attack Rating.

Skull Fracture — Weapon hits against undead: the target takes 12% more damage for 4s; strongest exposure applies; restore 4% of maximum Aether. 5s cooldown. Duplicates do not stack.

### Ruin

`u_gen_1_7` · Item level 47

Supporting stats: +91% Damage; Adds 15-25 Fire Damage; +14 Strength.

Ruin's Echo — Kills against burning enemies: arc to 4 other enemies within 5 yards for 35% of killing-hit damage (37 for kills over time) as fire damage. 5s cooldown. Duplicates do not stack.

### Marrowhunger

`u_gen_1_9` · Item level 65

Supporting stats: +113% Damage; 5% Life Stolen per Hit; +18 Vitality.

Marrow Feast — Weapon hits against enemies exposed by a Unique power: restore 5% of maximum Life. 5s cooldown. Duplicates do not stack.

### The Crimson Tithe

`u_gen_1_11` · Item level 84

Supporting stats: +136% Damage; +82 to Life; +36% Critical Damage.

Paid in Crimson — Damage received from melee attacks: your next weapon hit within 6s deals 60% more damage. 7s cooldown. Duplicates do not stack.

### Whisperfang

`u_gen_2_0` · Item level 5

Supporting stats: +41% Damage; +6 Dexterity; +11% Attack Speed.

Whispered Opening — Weapon hits against enemies at or above 80% Life: inflict 60% of hit damage as poison damage over 3s. 5s cooldown. Duplicates do not stack.

### Nightkiss

`u_gen_2_2` · Item level 13

Supporting stats: +51% Damage; Adds 13 Poison Damage over 3s; 3% Life Stolen per Hit.

Night's Kiss — Weapon hits against poisoned enemies: restore 6% of maximum Aether. 5s cooldown. Duplicates do not stack.

### Quietus

`u_gen_2_4` · Item level 24

Supporting stats: +64% Damage; +5% Critical Strike Chance; +19% Movement Speed.

Quiet Passing — Kills against poisoned enemies: +20% Evasion for 4s. 5s cooldown. Duplicates do not stack.

### Severance

`u_gen_2_6` · Item level 39

Supporting stats: +82% Damage; +14% Attack Speed; +13 Dexterity.

Severed Rhythm — Weapon hits (4 qualifying events): your next spell hit within 6s deals 40% more damage. 5s cooldown. Duplicates do not stack.

### Venomwhisper

`u_gen_2_8` · Item level 56

Supporting stats: +102% Damage; Adds 34 Poison Damage over 3s; +142 Attack Rating.

Whispering Venom — Weapon hits that critically strike: inflict 80% of hit damage as poison damage over 3s; slow non-boss enemies within 3 yards by 20% for 3s. 5s cooldown. Duplicates do not stack.

### The Silent Thorn

`u_gen_2_10` · Item level 74

Supporting stats: +124% Damage; +20 Dexterity; +34% Critical Damage.

Silent Thorn — Weapon hits against cursed or marked enemies: the target takes 16% more damage for 4s; strongest exposure applies. 5s cooldown. Duplicates do not stack.

### Last Breath

`u_gen_2_12` · Item level 93

Supporting stats: +147% Damage; 5% Life Stolen per Hit; +89 to Life.

Borrowed Breath — Kills while at or below 40% Life: restore 8% of maximum Life; +20% Movement Speed for 4s. 8s cooldown. Duplicates do not stack.

### Wintershot

`u_gen_3_1` · Item level 9

Supporting stats: +46% Damage; +7 Dexterity; Adds 5-8 Cold Damage.

Winter's Distance — Weapon hits at least 5 yards away: slow non-boss enemies within 3 yards by 45% for 3s. 5s cooldown. Duplicates do not stack.

### Stormstring

`u_gen_3_3` · Item level 18

Supporting stats: +57% Damage; Adds 1-15 Lightning Damage; +12% Attack Speed.

Strung Thunder — Weapon hits against slowed enemies: arc to 4 other enemies within 5 yards for 35% of hit damage as light damage. 5s cooldown. Duplicates do not stack.

### Farsong

`u_gen_3_5` · Item level 31

Supporting stats: +72% Damage; +92 Attack Rating; +37 to Aether.

Returning Song — Kills at least 5 yards away: restore 7% of maximum Aether; your next weapon hit within 6s deals 25% more damage. 5s cooldown. Duplicates do not stack.

### Hawkeye

`u_gen_3_7` · Item level 47

Supporting stats: +91% Damage; +7% Critical Strike Chance; +14 Dexterity.

Unblinking Hunt — Weapon hits after standing still for 1s: the target takes 15% more damage for 4s; strongest exposure applies. 5s cooldown. Duplicates do not stack.

### Frostpierce

`u_gen_3_9` · Item level 65

Supporting stats: +113% Damage; Adds 20-33 Cold Damage; +31% Critical Damage.

Pierced Winter — Weapon hits against frozen enemies: erupt within 2.5 yards for 65% of hit damage as phys damage. 5s cooldown. Duplicates do not stack.

### The Distant Tempest

`u_gen_3_11` · Item level 84

Supporting stats: +136% Damage; +18% Attack Speed; Lightning Resist +29%.

Distant Weather — Weapon hits (4 qualifying events on the same target): arc to 3 other enemies within 5 yards for 35% of hit damage as light damage; +18% Movement Speed for 4s. 5s cooldown. Duplicates do not stack.

### Tempest

`u_gen_4_0` · Item level 5

Supporting stats: +23% Spell Power; +11% Cast Speed; Adds 1-9 Lightning Damage; +19 to Aether.

Gathering Tempest — Spell hits with lightning (3 qualifying events): arc to 3 other enemies within 5 yards for 35% of hit damage as light damage. 5s cooldown. Duplicates do not stack.

### Emberheart

`u_gen_4_2` · Item level 13

Supporting stats: +28% Spell Power; Adds 6-10 Fire Damage; +18% Aether Regeneration.

Heart of the Pyre — Spell hits against burning enemies: restore 4% of maximum Life. 5s cooldown. Duplicates do not stack.

### Frostward Rod

`u_gen_4_4` · Item level 24

Supporting stats: +36% Spell Power; Adds 9-15 Cold Damage; Cold Resist +17%.

Winter Refuge — Spell hits with cold (3 qualifying events): gain a barrier worth 8% of maximum Life for 5s; refreshes, never accumulates. 5s cooldown. Duplicates do not stack.

### Stormcrown

`u_gen_4_6` · Item level 39

Supporting stats: +45% Spell Power; +14% Cast Speed; Lightning Resist +20%.

Crowned in Thunder — Skill uses with lightning: for 6s, Chain Lightning gains +1 chain targets. 5s cooldown. Duplicates do not stack.

### Cinderveil

`u_gen_4_8` · Item level 56

Supporting stats: +56% Spell Power; Adds 18-29 Fire Damage; +60 to Life.

Cinder Curtain — Damage received with fire: your next spell hit within 6s deals 50% more damage. 5s cooldown. Duplicates do not stack.

### The Glacial Maelstrom

`u_gen_4_10` · Item level 74

Supporting stats: +68% Spell Power; Adds 23-37 Cold Damage; +67 to Aether.

Glacial Confluence — Kills against frozen enemies: restore 8% of maximum Aether; erupt within 2.5 yards for 55% of killing-hit damage (88 for kills over time) as cold damage. 5s cooldown. Duplicates do not stack.

### Thunderspire

`u_gen_4_12` · Item level 93

Supporting stats: +80% Spell Power; +19% Cast Speed; +24 Willpower.

Spire's Reach — Spell hits at least 5 yards away: the target takes 10% more damage for 4s; strongest exposure applies; arc to 2 other enemies within 5 yards for 35% of hit damage as light damage. 5s cooldown. Duplicates do not stack.

### Hexfinger

`u_gen_5_1` · Item level 9

Supporting stats: +26% Spell Power; +21 to Aether; +7 Willpower.

Hexed Touch — Spell hits against cursed or marked enemies: restore 3% of maximum Life; restore 4% of maximum Aether. 5s cooldown. Duplicates do not stack.

### Soulwhisper

`u_gen_5_3` · Item level 18

Supporting stats: +32% Spell Power; +19% Aether Regeneration; +29 to Life.

Whispered Succor — Kills by your companions: gain a barrier worth 9% of maximum Life for 5s; refreshes, never accumulates. 5s cooldown. Duplicates do not stack.

### Gravewand

`u_gen_5_5` · Item level 31

Supporting stats: +40% Spell Power; +11 Willpower; All Resistances +8%.

Grave Instruction — Skill uses using a summon skill: +25% Minion Damage for 6s. 5s cooldown. Duplicates do not stack.

### Rotcaller

`u_gen_5_7` · Item level 47

Supporting stats: +51% Spell Power; Adds 30 Poison Damage over 3s; +48 to Aether.

Rot's Inheritance — Kills against poisoned enemies: erupt within 2.5 yards for 80% of killing-hit damage (85 for kills over time) as poison damage. 5s cooldown. Duplicates do not stack.

### Tombquill

`u_gen_5_9` · Item level 65

Supporting stats: +62% Spell Power; +17% Cast Speed; +18 Vitality.

Tomb Inscription — Skill uses using a curse or Contagion: your next spell hit within 6s deals 35% more damage; gain a barrier worth 5% of maximum Life for 5s; refreshes, never accumulates. 5s cooldown. Duplicates do not stack.

### Wraithsplinter

`u_gen_5_11` · Item level 84

Supporting stats: +75% Spell Power; +22 Willpower; +32% Aether Regeneration.

Splintered Soul — Spell hits with shadow (3 qualifying events on the same target): arc to 3 other enemies within 5 yards for 35% of hit damage as shadow damage. 5s cooldown. Duplicates do not stack.

### Aegis of Ash

`u_gen_6_0` · Item level 5

Supporting stats: +40% Armor; +19 to Life; Fire Resist +13%.

Ashen Refuge — Damage received while at or below 40% Life: gain a barrier worth 12% of maximum Life for 5s; refreshes, never accumulates; erupt within 2.5 yards for 35% of damage taken as fire damage. 10s cooldown. Duplicates do not stack.

### Dragonscale

`u_gen_6_2` · Item level 13

Supporting stats: +48% Armor; Fire Resist +15%; +8 Vitality.

Shed the Flame — Damage received with fire: restore 5% of maximum Life; Fire Resist +15% for 4s. 5s cooldown. Duplicates do not stack.

### Bulwark

`u_gen_6_4` · Item level 24

Supporting stats: +59% Armor; +34 to Life; Attackers take 11 Damage.

Holding Ground — Damage received after standing still for 1s: 15% Damage Reduction for 4s. 5s cooldown. Duplicates do not stack.

### Cindermail

`u_gen_6_6` · Item level 39

Supporting stats: +74% Armor; +46 to Life; Adds 14-22 Fire Damage.

Mail of Embers — Blocks: erupt within 3 yards for 50 damage as fire damage. 5s cooldown. Duplicates do not stack.

### Emberweave Carapace

`u_gen_6_8` · Item level 56

Supporting stats: +91% Armor; Fire Resist +23%; +54 to Aether.

Woven Cinders — Skill uses with fire: +30% Armor for 5s. 5s cooldown. Duplicates do not stack.

### Scaleforge Vest

`u_gen_6_10` · Item level 74

Supporting stats: +109% Armor; +20 Vitality; All Resistances +12%.

Tempered Scales — Damage received from elites or bosses: gain a barrier worth 8% of maximum Life for 5s; refreshes, never accumulates; restore 4% of maximum Aether. 5s cooldown. Duplicates do not stack.

### Ashen Bastion

`u_gen_6_12` · Item level 93

Supporting stats: +128% Armor; +89 to Life; Physical Damage Reduced by 9.

Bastion's Reprisal — Damage received (4 qualifying events): the target takes 14% more damage for 4s; strongest exposure applies; Attackers take 25 Damage for 4s. 5s cooldown. Duplicates do not stack.

### Crown of Cinders

`u_gen_7_1` · Item level 9

Supporting stats: +1 to All Talents; +21 to Aether; Fire Resist +14%.

Cinder Coronation — Kills against burning enemies: +20% Cast Speed for 4s. 5s cooldown. Duplicates do not stack.

### Skullhelm

`u_gen_7_3` · Item level 18

Supporting stats: +53% Armor; +29 to Life; All Resistances +7%.

Bone Audience — Kills against undead: restore 6% of maximum Aether; +25% Armor for 4s. 5s cooldown. Duplicates do not stack.

### Visage

`u_gen_7_5` · Item level 31

Supporting stats: +1 to All Talents; +13% Cast Speed; +37 to Aether.

Borrowed Face — Skill uses using a curse or Contagion: +16% Evasion for 4s. 5s cooldown. Duplicates do not stack.

### Doomcap

`u_gen_7_7` · Item level 47

Supporting stats: +51% Spell Power; +7% Critical Strike Chance; +48 to Aether.

Doom's Toll — Spell hits against enemies at or below 35% Life: the target takes 18% more damage for 4s; strongest exposure applies. 5s cooldown. Duplicates do not stack.

### Diadem of the Drowned King

`u_gen_7_9` · Item level 65

Supporting stats: +1 to All Talents; +61 to Aether; Cold Resist +25%.

Drowned Decree — Damage received with cold: arc to 4 other enemies within 5 yards for 35% of damage taken as cold damage. 5s cooldown. Duplicates do not stack.

### Boneward Casque

`u_gen_7_11` · Item level 84

Supporting stats: +119% Armor; +82 to Life; +22 Vitality.

Boneward Memory — Kills by your companions: restore 4% of maximum Life; 10% Damage Reduction for 4s. 5s cooldown. Duplicates do not stack.

### Hauntpace

`u_gen_8_0` · Item level 5

Supporting stats: +16% Movement Speed; +6 Dexterity; Cold Resist +13%.

Haunted Road — Walking within 4 yards of an enemy (5 yards): slow non-boss enemies within 3 yards by 35% for 3s. 5s cooldown. Duplicates do not stack.

### Windsole

`u_gen_8_2` · Item level 13

Supporting stats: +17% Movement Speed; +8 Vitality; +25 to Life.

Wind at Your Back — Kills while moving: +30% Movement Speed for 3s. 5s cooldown. Duplicates do not stack.

### Ghoststep

`u_gen_8_4` · Item level 24

Supporting stats: +19% Movement Speed; +10 Dexterity; All Resistances +7%.

Ghost's Reprieve — Walking while at or below 40% Life (4 yards): gain a barrier worth 10% of maximum Life for 5s; refreshes, never accumulates. 7s cooldown. Duplicates do not stack.

### Swiftmarch

`u_gen_8_6` · Item level 39

Supporting stats: +21% Movement Speed; +14% Attack Speed; +13 Strength.

Marching Edge — Walking (8 yards): your next weapon hit within 6s deals 35% more damage. 5s cooldown. Duplicates do not stack.

### Galeheel

`u_gen_8_8` · Item level 56

Supporting stats: +23% Movement Speed; +16 Dexterity; +54 to Aether.

Gale's Return — Walking while at or below 35% Aether (6 yards): restore 8% of maximum Aether. 5s cooldown. Duplicates do not stack.

### Pallor Treads

`u_gen_8_10` · Item level 74

Supporting stats: +26% Movement Speed; Cold Resist +27%; +74 to Life.

Pallid Trail — Walking within 4 yards of an enemy (9 yards): erupt within 2.5 yards for 56 damage as cold damage. 5s cooldown. Duplicates do not stack.

### Breath of the Hollow Road

`u_gen_8_12` · Item level 93

Supporting stats: +29% Movement Speed; +24 Vitality; All Resistances +14%.

Road's Last Breath — Walking (12 yards): restore 3% of maximum Life; your next spell hit within 6s deals 25% more damage. 8s cooldown. Duplicates do not stack.

### Stormknot

`u_gen_9_1` · Item level 9

Supporting stats: +26% Spell Power; Lightning Resist +14%; +21 to Aether.

Knotted Current — Spell hits that critically strike: restore 8% of maximum Aether. 5s cooldown. Duplicates do not stack.

### Heart of the Marsh

`u_gen_9_3` · Item level 18

Supporting stats: +29 to Life; +28 to Aether; Poison Resist +16%.

Marsh Pulse — Damage received with poison: gain a barrier worth 12% of maximum Life for 5s; refreshes, never accumulates. 5s cooldown. Duplicates do not stack.

### Soulglass

`u_gen_9_5` · Item level 31

Supporting stats: +40% Spell Power; +11 Willpower; All Resistances +8%.

Soul Reflection — Spell hits with shadow: your next weapon hit within 6s deals 40% more damage. 5s cooldown. Duplicates do not stack.

### Eye of the Vigil

`u_gen_9_7` · Item level 47

Supporting stats: +7% Critical Strike Chance; +124 Attack Rating; All Resistances +10%.

Vigil's Eye — Weapon hits against elites or bosses: +18% Evasion for 4s. 5s cooldown. Duplicates do not stack.

### Tempestbinder's Charm

`u_gen_9_9` · Item level 65

Supporting stats: +62% Spell Power; +17% Cast Speed; Lightning Resist +25%.

Bound Tempest — Skill uses with lightning: Adds 1-25 Lightning Damage for 5s. 5s cooldown. Duplicates do not stack.

### Mirelight Pendant

`u_gen_9_11` · Item level 84

Supporting stats: +82 to Life; +32% Aether Regeneration; Poison Resist +29%.

Mirelight Rescue — Kills against cursed or marked enemies: restore 5% of maximum Life; gain a barrier worth 5% of maximum Life for 5s; refreshes, never accumulates. 5s cooldown. Duplicates do not stack.

### Sanguine Coil

`u_gen_10_0` · Item level 5

Supporting stats: 3% Life Stolen per Hit; +4% Critical Strike Chance; +6 Strength.

Sanguine Promise — Weapon hits against enemies at or below 35% Life: gain a barrier worth 6% of maximum Life for 5s; refreshes, never accumulates. 5s cooldown. Duplicates do not stack.

### Bloodloop

`u_gen_10_2` · Item level 13

Supporting stats: +25 to Life; +8 Vitality; All Resistances +6%.

Closing the Loop — Healing beyond full Life (8 Life overhealed): your next weapon hit within 6s deals 30% more damage. 5s cooldown. Duplicates do not stack.

### Ring of Ruin

`u_gen_10_4` · Item level 24

Supporting stats: +64% Damage; Adds 9-15 Fire Damage; +12% Attack Speed.

Ruinous Spark — Kills against elites or bosses: erupt within 3 yards for 90% of killing-hit damage (54 for kills over time) as fire damage. 5s cooldown. Duplicates do not stack.

### Coilfire

`u_gen_10_6` · Item level 39

Supporting stats: +45% Spell Power; +42 to Aether; +14% Cast Speed.

Coiled Ember — Aether spent (40 Aether): erupt within 2.5 yards for 41 damage as fire damage. 5s cooldown. Duplicates do not stack.

### Emberveins

`u_gen_10_8` · Item level 56

Supporting stats: +60 to Life; Adds 18-29 Fire Damage; 4% Life Stolen per Hit.

Burning Veins — Damage received from melee attacks: inflict 60% of damage taken as fire damage over 3s; restore 3% of maximum Life. 5s cooldown. Duplicates do not stack.

### Wound of Cinders

`u_gen_10_10` · Item level 74

Supporting stats: +74 to Life; Fire Resist +27%; +34% Critical Damage.

Cinder Wound — Weapon hits against burning enemies: the target takes 14% more damage for 4s; strongest exposure applies. 5s cooldown. Duplicates do not stack.

### Serpent's Pyre

`u_gen_10_12` · Item level 93

Supporting stats: Adds 53 Poison Damage over 3s; Adds 28-46 Fire Damage; +24 Dexterity.

Serpent's Kindling — Spell hits against poisoned enemies: erupt within 2.5 yards for 45% of hit damage as fire damage; restore 3% of maximum Aether. 5s cooldown. Duplicates do not stack.

### Earthshaker

`u_gen_11_1` · Item level 9

Supporting stats: +46% Damage; +7 Strength; 11% Reduced Slow/Stun Duration.

Seismic Beat — Weapon hits (3 qualifying events on the same target): slow non-boss enemies within 3 yards by 45% for 3s. 5s cooldown. Duplicates do not stack.

### Worldhammer

`u_gen_11_3` · Item level 18

Supporting stats: +57% Damage; +29 to Life; Attackers take 9 Damage.

World's Rebound — Damage received from melee attacks: erupt within 2.5 yards for 65% of damage taken as earth damage. 5s cooldown. Duplicates do not stack.

### Tollbringer

`u_gen_11_5` · Item level 31

Supporting stats: +72% Damage; +11 Vitality; +66% Armor.

Toll of Stone — Kills within 3 yards: gain a barrier worth 10% of maximum Life for 5s; refreshes, never accumulates. 5s cooldown. Duplicates do not stack.

### Cataclysm

`u_gen_11_7` · Item level 47

Supporting stats: +91% Damage; +27% Critical Damage; +14 Strength.

Cataclysmic Fault — Weapon hits against enemies exposed by a Unique power: erupt within 3 yards for 65% of hit damage as earth damage. 5s cooldown. Duplicates do not stack.

### Doomtoll

`u_gen_11_9` · Item level 65

Supporting stats: +113% Damage; +160 Attack Rating; +61 to Aether.

Doom's Resonance — Weapon hits against cursed or marked enemies: arc to 4 other enemies within 5 yards for 35% of hit damage as shadow damage. 5s cooldown. Duplicates do not stack.

### The Sunken Peal

`u_gen_11_11` · Item level 84

Supporting stats: +136% Damage; +82 to Life; Cold Resist +29%.

Sunken Thunder — Weapon hits against slowed enemies: the target takes 12% more damage for 4s; strongest exposure applies; gain a barrier worth 5% of maximum Life for 5s; refreshes, never accumulates. 5s cooldown. Duplicates do not stack.

### Edge of Vows

`u_gen_12_0` · Item level 5

Supporting stats: +41% Damage; +11% Attack Speed; +6 Dexterity.

Vow of Return — Blocks: restore 5% of maximum Aether; +18% Attack Speed for 4s. 5s cooldown. Duplicates do not stack.

### Lightbrand

`u_gen_12_2` · Item level 13

Supporting stats: +51% Damage; Adds 1-13 Lightning Damage; +8 Strength.

Brand of Dawn — Weapon hits against undead: erupt within 2.5 yards for 60% of hit damage as light damage. 5s cooldown. Duplicates do not stack.

### Kingsblade

`u_gen_12_4` · Item level 24

Supporting stats: +64% Damage; 4% Life Stolen per Hit; +34 to Life.

King's Mercy — Kills against elites or bosses: restore 6% of maximum Life; All Resistances +10% for 4s. 5s cooldown. Duplicates do not stack.

### Vowkeeper

`u_gen_12_6` · Item level 39

Supporting stats: +82% Damage; +25% Critical Damage; +13 Dexterity.

Unbroken Vow — Weapon hits while at or above 80% Life (4 qualifying events): gain a barrier worth 5% of maximum Life for 5s; refreshes, never accumulates. 5s cooldown. Duplicates do not stack.

### Dawnsworn

`u_gen_12_8` · Item level 56

Supporting stats: +102% Damage; Fire Resist +23%; +16% Attack Speed.

Dawnsworn Rhythm — Weapon or spell hits; alternate weapon and spell hits: your next weapon hit within 6s deals 25% more damage; restore 4% of maximum Aether. 5s cooldown. Duplicates do not stack.

### The Gilded Promise

`u_gen_12_10` · Item level 74

Supporting stats: +124% Damage; +178 Attack Rating; All Resistances +12%.

Gilded Reversal — Blocks from elites or bosses: the target takes 20% more damage for 4s; strongest exposure applies. 5s cooldown. Duplicates do not stack.

### Throneward

`u_gen_12_12` · Item level 93

Supporting stats: +147% Damage; +24 Vitality; +89 to Life.

Guard the Throne — Weapon hits against bosses: 12% Damage Reduction for 4s. 5s cooldown. Duplicates do not stack.

### Tusk

`u_gen_13_1` · Item level 9

Supporting stats: +46% Damage; 3% Life Stolen per Hit; +7 Strength.

Tusk's Hunger — Weapon hits while at or below 40% Life: inflict 80% of hit damage as phys damage over 3s. 5s cooldown. Duplicates do not stack.

### Cleaver's Joy

`u_gen_13_3` · Item level 18

Supporting stats: +57% Damage; +48% Damage to Undead; +5% Critical Strike Chance.

Cleaver's Revel — Kills against undead: +25% Attack Speed for 4s. 5s cooldown. Duplicates do not stack.

### Bonereaver

`u_gen_13_5` · Item level 31

Supporting stats: +72% Damage; +13% Attack Speed; +20% Movement Speed.

Bone Reaping — Kills within 3 yards: arc to 3 other enemies within 5 yards for 45% of killing-hit damage (33 for kills over time) as phys damage. 5s cooldown. Duplicates do not stack.

### Wolfsplit

`u_gen_13_7` · Item level 47

Supporting stats: +91% Damage; Attackers take 18 Damage; +14 Vitality.

Split the Pack — Weapon hits while a fighting companion lives: the target takes 14% more damage for 4s; strongest exposure applies. 5s cooldown. Duplicates do not stack.

### Huntsmaw

`u_gen_13_9` · Item level 65

Supporting stats: +113% Damage; 5% Life Stolen per Hit; +18 Dexterity.

Hunting Maw — Weapon hits against beasts: restore 5% of maximum Life; your next weapon hit within 6s deals 25% more damage. 5s cooldown. Duplicates do not stack.

### Antlershear

`u_gen_13_11` · Item level 84

Supporting stats: +136% Damage; +9% Critical Strike Chance; +198 Attack Rating.

Antlered Pursuit — Skill uses when changing form: +25% Attack Speed, +15% Movement Speed for 5s. 5s cooldown. Duplicates do not stack.

### Vesper

`u_gen_14_0` · Item level 5

Supporting stats: +41% Damage; +6 Strength; 11% Reduced Slow/Stun Duration.

Evening Bell — Weapon hits against enemies at or below 35% Life: slow non-boss enemies within 3 yards by 30% for 3s; restore 4% of maximum Aether. 5s cooldown. Duplicates do not stack.

### Bellringer

`u_gen_14_2` · Item level 13

Supporting stats: +51% Damage; +43% Damage to Undead; +25 to Life.

Bell of Deliverance — Kills against undead: arc to 3 other enemies within 5 yards for 35% of killing-hit damage (13 for kills over time) as light damage. 5s cooldown. Duplicates do not stack.

### Knell

`u_gen_14_4` · Item level 24

Supporting stats: +64% Damage; +59% Armor; +10 Vitality.

Iron Knell — Blocks: Attackers take 30 Damage for 5s. 5s cooldown. Duplicates do not stack.

### Sanctus

`u_gen_14_6` · Item level 39

Supporting stats: +82% Damage; +6% Critical Strike Chance; All Resistances +9%.

Sanctified Blow — Weapon hits against demons: gain a barrier worth 9% of maximum Life for 5s; refreshes, never accumulates. 5s cooldown. Duplicates do not stack.

### Matins

`u_gen_14_8` · Item level 56

Supporting stats: +102% Damage; +26% Aether Regeneration; +16 Willpower.

Morning Prayer — Skill uses using a shout or banner: restore 6% of maximum Aether; gain a barrier worth 8% of maximum Life for 5s; refreshes, never accumulates. 5s cooldown. Duplicates do not stack.

### Final Tithe

`u_gen_14_10` · Item level 74

Supporting stats: +124% Damage; 5% Life Stolen per Hit; +20 Strength.

Final Offering — Kills while at or below 40% Life: your next weapon hit within 6s deals 65% more damage. 5s cooldown. Duplicates do not stack.

### Choir of Ash

`u_gen_14_12` · Item level 93

Supporting stats: +147% Damage; Fire Resist +31%; +89 to Life.

Choir's Ashes — Weapon hits against burning enemies: arc to 2 other enemies within 5 yards for 35% of hit damage as fire damage; All Resistances +8% for 4s. 5s cooldown. Duplicates do not stack.

### Skyfall Pike

`u_gen_15_1` · Item level 9

Supporting stats: +46% Damage; +7 Dexterity; +16% Movement Speed.

Skyfall Wake — Skill uses using a movement skill: erupt within 3 yards for 18 damage as light damage. 5s cooldown. Duplicates do not stack.

### Stormlance

`u_gen_15_3` · Item level 18

Supporting stats: +57% Damage; Adds 1-15 Lightning Damage; +9 Strength.

Lance of Storms — Weapon hits at least 5 yards away: the target takes 16% more damage for 4s; strongest exposure applies. 5s cooldown. Duplicates do not stack.

### Heaven's Reach

`u_gen_15_5` · Item level 31

Supporting stats: +72% Damage; +13% Attack Speed; +92 Attack Rating.

Heaven's Rhythm — Weapon hits (3 qualifying events): arc to 2 other enemies within 5 yards for 35% of hit damage as light damage; restore 4% of maximum Aether. 5s cooldown. Duplicates do not stack.

### Thunderpike

`u_gen_15_7` · Item level 47

Supporting stats: +91% Damage; Adds 15-25 Cold Damage; +14 Dexterity.

Thunder in Winter — Weapon hits against slowed enemies: your next spell hit within 6s deals 50% more damage. 5s cooldown. Duplicates do not stack.

### Tempest's Descent

`u_gen_15_9` · Item level 65

Supporting stats: +113% Damage; +8% Critical Strike Chance; Lightning Resist +25%.

Tempest's Descent — Skill uses using a movement skill: gain a barrier worth 8% of maximum Life for 5s; refreshes, never accumulates; +12% Critical Strike Chance for 4s. 5s cooldown. Duplicates do not stack.

### Cloudpiercer

`u_gen_15_11` · Item level 84

Supporting stats: +136% Damage; +198 Attack Rating; +74 to Aether.

Pierce the Cloud — Weapon hits against bosses: arc to 4 other enemies within 5 yards for 45% of hit damage as light damage. 5s cooldown. Duplicates do not stack.

### Heartseeker

`u_gen_16_0` · Item level 5

Supporting stats: +41% Damage; +6 Dexterity; Adds 4-6 Fire Damage.

Heart's Beacon — Weapon hits against enemies at or above 80% Life: the target takes 14% more damage for 4s; strongest exposure applies. 5s cooldown. Duplicates do not stack.

### Repeater

`u_gen_16_2` · Item level 13

Supporting stats: +51% Damage; +5% Critical Strike Chance; +18% Critical Damage.

Repeating Verdict — Weapon hits (3 qualifying events on the same target): your next weapon hit within 6s deals 45% more damage. 5s cooldown. Duplicates do not stack.

### Boltwidow

`u_gen_16_4` · Item level 24

Supporting stats: +64% Damage; +12% Attack Speed; +19% Movement Speed.

Widow's Escape — Kills at least 5 yards away: gain a barrier worth 9% of maximum Life for 5s; refreshes, never accumulates. 5s cooldown. Duplicates do not stack.

### Killshot

`u_gen_16_6` · Item level 39

Supporting stats: +82% Damage; +13 Dexterity; Adds 26 Poison Damage over 3s.

One Last Shot — Weapon hits against enemies at or below 35% Life: inflict 100% of hit damage as poison damage over 3s. 5s cooldown. Duplicates do not stack.

### Pulsebreaker

`u_gen_16_8` · Item level 56

Supporting stats: +102% Damage; +7% Critical Strike Chance; +142 Attack Rating.

Broken Pulse — Weapon hits that critically strike (2 qualifying events): the target takes 10% more damage for 4s; strongest exposure applies; restore 5% of maximum Aether. 5s cooldown. Duplicates do not stack.

### The Quickening Quarrel

`u_gen_16_10` · Item level 74

Supporting stats: +124% Damage; +17% Attack Speed; +67 to Aether.

Quickened Quarrel — Skill uses using a trap skill: your next weapon hit within 6s deals 55% more damage. 5s cooldown. Duplicates do not stack.

### Last Heartbeat

`u_gen_16_12` · Item level 93

Supporting stats: +147% Damage; +38% Critical Damage; +89 to Life.

Last Heartbeat — Weapon hits while at or below 40% Life: arc to 2 other enemies within 5 yards for 35% of hit damage as phys damage; restore 4% of maximum Life. 5s cooldown. Duplicates do not stack.

### Wardlight

`u_gen_17_1` · Item level 9

Supporting stats: +44% Armor; All Resistances +6%; +22 to Life.

Light Behind the Wall — Blocks from undead: restore 6% of maximum Life. 5s cooldown. Duplicates do not stack.

### Bastion

`u_gen_17_3` · Item level 18

Supporting stats: +9% Block Chance; +53% Armor; +9 Vitality.

Bastion's Rhythm — Blocks (3 qualifying events): gain a barrier worth 12% of maximum Life for 5s; refreshes, never accumulates. 5s cooldown. Duplicates do not stack.

### Sanctuary

`u_gen_17_5` · Item level 31

Supporting stats: +66% Armor; Attackers take 13 Damage; Fire Resist +18%.

Sanctuary Flame — Damage received from demons: erupt within 2.5 yards for 75% of damage taken as fire damage. 5s cooldown. Duplicates do not stack.

### Aegis Eternal

`u_gen_17_7` · Item level 47

Supporting stats: +82% Armor; +53 to Life; All Resistances +10%.

Eternal Reprieve — Damage received while at or below 40% Life: 20% Damage Reduction for 3s. 12s cooldown. Duplicates do not stack.

### The Unbroken Vow

`u_gen_17_9` · Item level 65

Supporting stats: +12% Block Chance; +67 to Life; +18 Vitality.

Vow Unbroken — Blocks: your next spell hit within 6s deals 45% more damage. 5s cooldown. Duplicates do not stack.

### Refuge of Ash

`u_gen_17_11` · Item level 84

Supporting stats: +119% Armor; Fire Resist +29%; +74 to Aether.

Refuge in Ash — Blocks from burning enemies: restore 5% of maximum Life; restore 5% of maximum Aether. 5s cooldown. Duplicates do not stack.

### Gravewrought Grips

`u_gen_18_0` · Item level 5

Supporting stats: +11% Attack Speed; +4% Critical Strike Chance; +6 Strength.

Gravewrought Command — Weapon hits that critically strike: +25% Minion Damage for 5s. 5s cooldown. Duplicates do not stack.

### Throttle

`u_gen_18_2` · Item level 13

Supporting stats: +11% Attack Speed; +8 Dexterity; 3% Life Stolen per Hit.

Throttle the Hex — Weapon hits against cursed or marked enemies: slow non-boss enemies within 3 yards by 40% for 3s; restore 3% of maximum Life. 5s cooldown. Duplicates do not stack.

### Vise

`u_gen_18_4` · Item level 24

Supporting stats: +64% Damage; +21% Critical Damage; +10 Strength.

Unrelenting Vise — Weapon hits (4 qualifying events on the same target): the target takes 15% more damage for 4s; strongest exposure applies. 5s cooldown. Duplicates do not stack.

### Deadhand

`u_gen_18_6` · Item level 39

Supporting stats: +14% Attack Speed; +21% Movement Speed; +46 to Life.

Deadhand's Gift — Kills by your companions: your next weapon hit within 6s deals 50% more damage. 5s cooldown. Duplicates do not stack.

### Sepulcher's Clutch

`u_gen_18_8` · Item level 56

Supporting stats: +56% Spell Power; +16% Cast Speed; +54 to Aether.

Sepulcher's Clutch — Skill uses using a summon skill: gain a barrier worth 10% of maximum Life for 5s; refreshes, never accumulates. 5s cooldown. Duplicates do not stack.

### Stranglemourn

`u_gen_18_10` · Item level 74

Supporting stats: +17% Attack Speed; Adds 43 Poison Damage over 3s; +20 Dexterity.

Strangling Sorrow — Weapon hits against poisoned enemies: the target takes 10% more damage for 4s; strongest exposure applies; +20% Movement Speed for 4s. 5s cooldown. Duplicates do not stack.

### Palms of the Pit

`u_gen_18_12` · Item level 93

Supporting stats: +147% Damage; +24 Strength; Fire Resist +31%.

Palms of Ruin — Weapon hits against demons: erupt within 2.5 yards for 60% of hit damage as phys damage; restore 4% of maximum Aether. 5s cooldown. Duplicates do not stack.

### Serpentcoil

`u_gen_19_1` · Item level 9

Supporting stats: +22 to Life; All Resistances +6%; +7 Strength.

Coiled Defense — Damage received from melee attacks: slow non-boss enemies within 3 yards by 45% for 3s. 5s cooldown. Duplicates do not stack.

### Girdle of Spite

`u_gen_19_3` · Item level 18

Supporting stats: +29 to Life; Adds 15 Poison Damage over 3s; +9 Vitality.

Spite's Reply — Damage received (2 qualifying events): inflict 90% of damage taken as poison damage over 3s. 5s cooldown. Duplicates do not stack.

### Venomwind

`u_gen_19_5` · Item level 31

Supporting stats: +40 to Life; Fire Resist +18%; Cold Resist +18%.

Venomwind — Walking within 4 yards of an enemy (8 yards): erupt within 2.5 yards for 26 damage as poison damage; Poison Resist +20% for 4s. 5s cooldown. Duplicates do not stack.

### Coilbind

`u_gen_19_7` · Item level 47

Supporting stats: +53 to Life; +22% Movement Speed; +14 Dexterity.

Binding Coil — Weapon hits against poisoned enemies: gain a barrier worth 7% of maximum Life for 5s; refreshes, never accumulates. 5s cooldown. Duplicates do not stack.

### The Tightening Hiss

`u_gen_19_9` · Item level 65

Supporting stats: +67 to Life; +61 to Aether; Poison Resist +25%.

Tightening Hiss — Skill uses using a curse or Contagion: for 6s, Contagion gains +30% spread range. 5s cooldown. Duplicates do not stack.

### Fangknot

`u_gen_19_11` · Item level 84

Supporting stats: +82 to Life; +22 Vitality; Adds 48 Poison Damage over 3s.

Fang's Knot — Kills against poisoned enemies: restore 6% of maximum Aether; your next spell hit within 6s deals 35% more damage. 5s cooldown. Duplicates do not stack.

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
