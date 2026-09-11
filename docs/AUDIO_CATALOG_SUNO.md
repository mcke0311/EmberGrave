# Embergrave — Complete Audio Catalog and Suno Prompts

Production brief • 11 September 2026 • **Dark ambient horror** • Full catalog, including existing audio and proposed improvements.

This document contains **258 unique sound-effect/ambience generation briefs** and **73 unique music briefs**. Gameplay mappings are reuse instructions, not additional generation jobs. The effects briefs request **683 retained variations** in total; audition two candidates per music brief and keep one. Suno attempts may exceed these targets. Existing recorded assets can be retained instead of regenerated.

The source audit covers **36 named areas, 107 skills (89 active and 18 passive), 193 base enemy definitions, two encounter-created objects, two additional cathedral guardian profiles, eight companion kinds, nine hazards, 50 world-event definitions, and 22 boss-flagged enemies**. The Oathsworn trio shares one encounter theme; two optional guardian themes bring the boss/miniboss music list to 22. There are also 15 menu/story music briefs.

## Contents

- [How to use this catalog](#how-to-use-this-catalog)
- [Production checklist](#production-checklist)
- [Sound effects and ambience — all prompts](#sound-effects-and-ambience)
- [All class skills and basic attacks](#all-class-skills-and-basic-attacks)
- [All enemies, companions and bosses](#all-enemies-companions-and-bosses)
- [World, hazards, events and interface mappings](#world-hazards-events-and-interface-mappings)
- [Music — all prompts](#music-all-prompts)
- [Existing assets and coverage audit](#existing-assets-and-coverage-audit)

## How to use this catalog

For effects, open Suno **Create → Sounds**, paste the complete block for one entry, and choose **One Shot** or **Loop** as indicated. Leave musical BPM/key unspecified for nonmusical sounds. Each variation is a separate take of the same event, not a montage. Suno’s current documentation describes individual effects, ambience, and one-shot/loop generation; it also recommends concise recognizable sound descriptions and iteration. [Official Suno Sounds guidance](https://help.suno.com/en/articles/10625537).

For music, use the music-creation workflow with instrumental output and paste the complete music prompt into the style/description field. Leave lyrics empty. Wordless choral texture is requested only in selected ritual tracks; if it produces lyrics, reject that take. Do not use song generation for ordinary footsteps or weapon impacts.

**Timing is a target, not a guarantee.** Trim one-shots to the intended attack marker while preserving their decay. Audition and edit loop boundaries; asking for a loop does not prove a seamless join. For music, select a stable 90–180-second looping passage from a 3–4-minute generation. Match both waveform level and musical harmony at the join. Keep stingers and endings as finite cues. A music prompt does not create game-synchronized boss phases.

**Delivery defaults:** retain lossless WAV masters when available; mono for localized effects and voices, stereo for music/ambience. Use 48 kHz PCM masters where the editing/export tools allow it; this is a postproduction specification, not a claim that prompting controls Suno’s export format. Keep effects below clipping, with no baked-in music and minimal reverb. Mix warning/contact sounds above ambient detail without making every sound loud. Preserve the originals separately; suggested names below are new production filenames, not instructions to overwrite shipped assets.

**Coverage labels:** Recorded = a shipped recording supports this purpose; Synthesized = procedural Web Audio; Shared = another asset/cue currently carries it; Missing = proposed dedicated audio, often also requiring a future hook; Intentionally silent = no separate generation is needed. Labels describe code and file coverage, not a listening verdict. A proposed sample alone will not change the game.

**Priority:** P1 core feedback; P2 signature combat, encounters and progression; P3 environmental detail and UI polish. Use the full library as a target, but generate P1 first. No full dialogue, narrator, shopkeeper script, spoken boss lines, or music on the death screen is requested. Nonverbal exertion and creature voices are included.

## Production checklist

- [ ] P1: audition existing click, player death, 26 recorded material textures and six interaction recordings; retain useful takes and replace only where needed.
- [ ] P1: create surface footsteps, player hurt, block/impact/critical feedback, draughts, errors, loot and progression cues.
- [ ] P2: create signature skills, dedicated sustain loops, creature performance families, boss warnings/phase accents and exact encounter attacks.
- [ ] P2: generate the 36 area themes, title/selection tracks, 22 boss/miniboss themes and remaining story music.
- [ ] P3: generate nonmusical ambience, environmental details, equipment movement and dedicated UI refinements.
- [ ] Audition repeated attacks and six-step sequences; remove unwanted musical backing, speech, clipped transients and excessive tails.
- [ ] Edit music/ambience loop joins and verify each finite stinger ends cleanly.
- [ ] Follow the reuse matrices; do not create another copy of the same material for each enemy, skill rank, perk, item or difficulty.

| Effects group | Unique briefs |
| --- | --- |
| [Shared combat materials](#bank-shared-combat-materials) | 26 |
| [Movement and player](#bank-movement-and-player) | 22 |
| [Interface and progression](#bank-interface-and-progression) | 20 |
| [Loot and world interactions](#bank-loot-and-world-interactions) | 30 |
| [Status and conditional effects](#bank-status-and-conditional-effects) | 10 |
| [Sustained gameplay effects](#bank-sustained-gameplay-effects) | 9 |
| [Enemy and companion voices](#bank-enemy-and-companion-voices) | 54 |
| [Enemy and companion movement](#bank-enemy-and-companion-movement) | 8 |
| [Signature abilities and encounters](#bank-signature-abilities-and-encounters) | 47 |
| [Environmental ambience](#bank-environmental-ambience) | 24 |
| [Environmental details and finale](#bank-environmental-details-and-finale) | 8 |

**Generation accounting:** 258 SFX/ambience briefs + 73 music briefs = **331 unique briefs**. The 683 requested effect variations and 146 music audition candidates are production targets, not a quoted number of Suno credits or button presses.

<a id="sound-effects-and-ambience"></a>

## Sound effects and ambience

Each block below is complete and can be pasted by itself. The usage index identifies exact consumers; family mappings farther below explain how movement, attack and voices fit together. Ambience and gameplay loops are different categories even when they share similar materials.

<a id="bank-shared-combat-materials"></a>

### Shared combat materials

<a id="mat_cloth"></a>

#### MAT_CLOTH — Clothing and weapon preparation

- [ ] **P1 · One Shot · 0.3 s · 3 variations**
- **Filename:** `mat_cloth_v01.wav` through `_v03.wav`
- **Current:** Recorded — skills/cloth_1.wav, cloth_2.wav, cloth_3.wav.

**Used by:** `Basic attack: melee`, `Enemy choir_herald`, `Enemy choir_priest`, `Enemy choirmaster`, `Enemy r28_robed`, `Enemy silent_cultist`, `Enemy song_thrall`, `Skill corpse_burst`, `Skill emberwitch_0_0`, `Skill emberwitch_0_1`, `Skill emberwitch_0_3`, `Skill emberwitch_0_4`, `Skill emberwitch_0_5`, `Skill emberwitch_0_6`, `Skill emberwitch_1_0`, `Skill emberwitch_1_1`, `Skill emberwitch_1_3`, `Skill emberwitch_1_4`, `Skill emberwitch_1_6`, `Skill emberwitch_2_2`, `Skill emberwitch_2_3`, `Skill emberwitch_2_4`, `Skill emberwitch_2_5`, `Skill emberwitch_2_6`, `Skill fire_claw`, `Skill gravebinder_0_7`, `Skill gravebinder_2_1`, `Skill gravebinder_2_2`, `Skill gravebinder_2_7`, `Skill rabies`, `Skill raise_plaguemage`, `Skill rimeguard`, `Skill spark`, `Skill stormshell`, `Skill vanguard_0_0`, `Skill vanguard_0_1`, `Skill vanguard_0_2`, `Skill vanguard_0_4`, `Skill vanguard_0_5`, `Skill vanguard_0_6`, `Skill vanguard_1_2`, `Skill vanguard_1_5`, `Skill vanguard_2_0`, `Skill vanguard_2_2`, `Skill vanguard_2_5`, `Skill veilranger_0_1`, `Skill veilranger_0_2`, `Skill veilranger_1_3`, `Skill veilranger_2_0`, `Skill veilranger_2_1`, `Skill veilranger_2_3`, `Skill veilranger_2_4`, `Skill veilranger_2_5`, `Skill veilranger_2_6`, `Skill venom_spit`, `Skill wildkeeper_0_2`, `Skill wildkeeper_1_0`, `Skill wildkeeper_1_3`, `Skill wildkeeper_1_6`, `Skill wildkeeper_2_6`, `Skill withering_hex`.

```text
One isolated 0.3-second sound effect: a short worn linen sleeve and leather wrap swish, soft fabric friction, no impact. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="mat_blade"></a>

#### MAT_BLADE — Blade release

- [ ] **P1 · One Shot · 0.3 s · 3 variations**
- **Filename:** `mat_blade_v01.wav` through `_v03.wav`
- **Current:** Recorded — skills/blade_1.wav, blade_2.wav, blade_3.wav.

**Used by:** `Act III profile gilded_thrall`, `Act IV profile cathedral_knight_guardian`, `Act IV profile hollow_knight`, `Basic attack: melee`, `Companion skel_warrior`, `Current Sfx.swing`, `Enemy azram`, `Enemy barb_axe`, `Enemy barb_sword`, `Enemy bone_archer`, `Enemy bone_dragon`, `Enemy chained_sovereign`, `Enemy cult_acolyte`, `Enemy cult_zealot`, `Enemy fallen_blade`, `Enemy frost_archer`, `Enemy frost_watch_captain`, `Enemy gilded_thrall`, `Enemy gravecaller`, `Enemy hollow_knight`, `Enemy impaler`, `Enemy korvath_echo`, `Enemy malthoron`, `Enemy morthul`, `Enemy r11_human`, `Enemy r14_skeleton`, `Enemy r16_human`, `Enemy r1_human`, `Enemy r21_human`, `Enemy r24_skeleton`, `Enemy r33_robed`, `Enemy r37_skeleton`, `Enemy r38_robed`, `Enemy r42_skeleton`, `Enemy r43_robed`, `Enemy r47_skeleton`, `Enemy r48_robed`, `Enemy r4_skeleton`, `Enemy r50_knight`, `Enemy r54_robed`, `Enemy r55_knight`, `Enemy r59_robed`, `Enemy r60_knight`, `Enemy r64_robed`, `Enemy r65_knight`, `Enemy r69_robed`, `Enemy r6_human`, `Enemy r70_knight`, `Enemy r74_robed`, `Enemy r76_knight`, `Enemy r79_warlord`, `Enemy r81_knight`, `Enemy r84_warlord`, `Enemy r86_knight`, `Enemy r89_warlord`, `Enemy r91_knight`, `Enemy r94_warlord`, `Enemy r96_knight`, `Enemy r99_warlord`, `Enemy r9_skeleton`, `Enemy rimebound_guardian`, `Enemy sand_raider`, `Enemy shard_sentinel`, `Enemy shard_thrall`, `Enemy tomb_guard`, `Enemy vicar`, `Skill fire_claw`, `Skill gravebinder_0_5`, `Skill gravebinder_1_7`, `Skill vanguard_0_0`, `Skill vanguard_0_1`, `Skill vanguard_0_4`, `Skill vanguard_0_6`, `Skill vanguard_2_2`, `Skill veilranger_2_1`, `Skill veilranger_2_3`, `Skill veilranger_2_4`, `Skill veilranger_2_5`, `Skill veilranger_2_6`.

```text
One isolated 0.3-second sound effect: one sharp steel blade cutting through air, fast dry swish ending in a faint metal edge shimmer. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="mat_steel"></a>

#### MAT_STEEL — Steel contact

- [ ] **P1 · One Shot · 0.45 s · 3 variations**
- **Filename:** `mat_steel_v01.wav` through `_v03.wav`
- **Current:** Recorded — skills/steel_1.wav, steel_2.wav, steel_3.wav.

**Used by:** `Act IV profile cathedral_knight_guardian`, `Act IV profile hollow_knight`, `Basic attack: melee`, `Current Sfx.hit`, `Enemy barb_axe`, `Enemy cult_acolyte`, `Enemy cult_zealot`, `Enemy fallen_blade`, `Enemy gravecaller`, `Enemy hollow_knight`, `Enemy impaler`, `Enemy malthoron`, `Enemy r11_human`, `Enemy r16_human`, `Enemy r1_human`, `Enemy r21_human`, `Enemy r33_robed`, `Enemy r38_robed`, `Enemy r43_robed`, `Enemy r48_robed`, `Enemy r50_knight`, `Enemy r54_robed`, `Enemy r55_knight`, `Enemy r59_robed`, `Enemy r60_knight`, `Enemy r64_robed`, `Enemy r65_knight`, `Enemy r69_robed`, `Enemy r6_human`, `Enemy r70_knight`, `Enemy r74_robed`, `Enemy r76_knight`, `Enemy r81_knight`, `Enemy r86_knight`, `Enemy r91_knight`, `Enemy r96_knight`, `Enemy sand_raider`, `Enemy shard_thrall`, `Enemy tomb_guard`, `Enemy vicar`, `Skill vanguard_0_0`, `Skill vanguard_0_1`, `Skill vanguard_2_1`, `Skill vanguard_2_2`, `Skill veilranger_0_4`, `Skill veilranger_1_0`, `Skill veilranger_1_3`, `Skill veilranger_1_4`, `Skill veilranger_2_1`, `Skill veilranger_2_3`, `Skill veilranger_2_5`, `Skill veilranger_2_6`.

```text
One isolated 0.45-second sound effect: a hard forged-steel weapon strike against iron armor, brief gritty clang with a restrained low body. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="mat_ember"></a>

#### MAT_EMBER — Fire ignition and launch

- [ ] **P1 · One Shot · 0.4 s · 3 variations**
- **Filename:** `mat_ember_v01.wav` through `_v03.wav`
- **Current:** Recorded — skills/ember_1.wav, ember_2.wav, ember_3.wav.

**Used by:** `Current Sfx.firebolt`, `Skill emberwitch_0_0`, `Skill emberwitch_0_1`, `Skill emberwitch_0_3`, `Skill emberwitch_0_4`, `Skill emberwitch_0_5`, `Skill emberwitch_0_6`, `Skill fire_claw`, `Skill gravebinder_0_7`, `Skill wildkeeper_2_6`.

```text
One isolated 0.4-second sound effect: a sudden compact ignition, dry hot whoosh and a few snapping embers. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="mat_fire"></a>

#### MAT_FIRE — Fire impact

- [ ] **P1 · One Shot · 0.65 s · 3 variations**
- **Filename:** `mat_fire_v01.wav` through `_v03.wav`
- **Current:** Recorded — skills/fire_1.wav, fire_2.wav, fire_3.wav.

**Used by:** `Current Sfx.blast`, `Current Sfx.fireHit`, `Enemy ash_drake`, `Enemy chained_sovereign`, `Enemy cinder_hound`, `Enemy cinder_imp`, `Enemy cult_acolyte`, `Enemy gravecaller`, `Enemy impaler`, `Enemy r33_robed`, `Enemy r42_skeleton`, `Enemy r50_knight`, `Enemy r55_knight`, `Enemy r59_robed`, `Enemy r64_robed`, `Enemy r68_imp`, `Enemy r73_imp`, `Enemy r77_treant`, `Enemy r84_warlord`, `Enemy r86_knight`, `Enemy r91_knight`, `Enemy r93_brute`, `Enemy r98_brute`, `Enemy shard_thrall`, `Enemy vellath`, `Enemy vicar`, `Enemy wretch_lord`, `Skill emberwitch_0_0`, `Skill emberwitch_0_1`, `Skill emberwitch_0_2`, `Skill emberwitch_0_3`, `Skill emberwitch_0_4`, `Skill emberwitch_0_5`, `Skill emberwitch_0_6`, `Skill fire_claw`, `Skill gravebinder_0_7`, `Skill primal_surge`, `Skill veilranger_1_5`, `Unique powers and glyph combinations`.

```text
One isolated 0.65-second sound effect: a dense fireball striking, short combustion thump followed by rough flame crackle. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="mat_ice"></a>

#### MAT_ICE — Ice release

- [ ] **P1 · One Shot · 0.4 s · 3 variations**
- **Filename:** `mat_ice_v01.wav` through `_v03.wav`
- **Current:** Recorded — skills/ice_1.wav, ice_2.wav, ice_3.wav.

**Used by:** `Act II profile silent_cultist`, `Act II profile song_thrall`, `Enemy shard_construct`, `Skill emberwitch_1_0`, `Skill emberwitch_1_1`, `Skill emberwitch_1_3`, `Skill emberwitch_1_4`, `Skill emberwitch_1_6`, `Skill rimeguard`.

```text
One isolated 0.4-second sound effect: a narrow icicle breaking free with crisp crystalline ticks and a cold air hiss. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="mat_frost"></a>

#### MAT_FROST — Frost contact

- [ ] **P1 · One Shot · 0.6 s · 3 variations**
- **Filename:** `mat_frost_v01.wav` through `_v03.wav`
- **Current:** Recorded — skills/frost_1.wav, frost_2.wav, frost_3.wav.

**Used by:** `Act II profile silent_cultist`, `Act II profile song_thrall`, `Current Sfx.frost`, `Enemy frost_wraith`, `Enemy frost_wyrm`, `Enemy glacial_crawler`, `Enemy hoarfang`, `Enemy ice_lurker`, `Enemy r26_brute`, `Enemy r35_ooze`, `Enemy r44_imp`, `Enemy r52_brute`, `Enemy r61_wraith`, `Enemy r70_knight`, `Enemy rimebound_guardian`, `Enemy shatter_wasp`, `Enemy silent_cultist`, `Enemy song_thrall`, `Skill emberwitch_1_0`, `Skill emberwitch_1_1`, `Skill emberwitch_1_2`, `Skill emberwitch_1_3`, `Skill emberwitch_1_4`, `Skill emberwitch_1_6`, `Skill veilranger_1_2`, `Unique powers and glyph combinations`.

```text
One isolated 0.6-second sound effect: ice rapidly freezing and shattering on contact, brittle crack followed by granular frost falling. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="mat_spark"></a>

#### MAT_SPARK — Electrical release and contact

- [ ] **P1 · One Shot · 0.25 s · 3 variations**
- **Filename:** `mat_spark_v01.wav` through `_v03.wav`
- **Current:** Recorded — skills/spark_1.wav, spark_2.wav, spark_3.wav.

**Used by:** `Act III profile gilded_thrall`, `Act III profile soul_chained`, `Companion hawk`, `Current Sfx.zap`, `Elite stormtouched`, `Enemy r28_robed`, `Enemy r37_skeleton`, `Enemy r46_brute`, `Enemy r54_robed`, `Enemy r63_imp`, `Enemy r69_robed`, `Enemy r72_brute`, `Enemy r79_warlord`, `Enemy soul_chained`, `Hazard static`, `Skill emberwitch_2_2`, `Skill emberwitch_2_3`, `Skill emberwitch_2_4`, `Skill emberwitch_2_5`, `Skill emberwitch_2_6`, `Skill spark`, `Skill stormshell`, `Skill wildkeeper_0_2`, `Skill wildkeeper_1_0`, `Skill wildkeeper_1_3`, `Skill wildkeeper_1_6`, `Unique powers and glyph combinations`.

```text
One isolated 0.25-second sound effect: a violent short electrical arc, sharp snap with ragged static breaking up immediately. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="mat_bone"></a>

#### MAT_BONE — Bone movement and contact

- [ ] **P1 · One Shot · 0.55 s · 3 variations**
- **Filename:** `mat_bone_v01.wav` through `_v03.wav`
- **Current:** Recorded — skills/bone_1.wav, bone_2.wav, bone_3.wav.

**Used by:** `Companion bone_golem`, `Companion skel_mage`, `Companion skel_warrior`, `Enemy azram`, `Enemy bone_archer`, `Enemy bone_dragon`, `Enemy chained_sovereign`, `Enemy frost_archer`, `Enemy frost_watch_captain`, `Enemy gilded_thrall`, `Enemy gravecaller`, `Enemy hoarfang`, `Enemy korvath_echo`, `Enemy morthul`, `Enemy r14_skeleton`, `Enemy r24_skeleton`, `Enemy r37_skeleton`, `Enemy r42_skeleton`, `Enemy r47_skeleton`, `Enemy r4_skeleton`, `Enemy r76_knight`, `Enemy r79_warlord`, `Enemy r83_brute`, `Enemy r84_warlord`, `Enemy r89_warlord`, `Enemy r90_wraith`, `Enemy r94_warlord`, `Enemy r97_treant`, `Enemy r99_warlord`, `Enemy r9_skeleton`, `Enemy rimebound_guardian`, `Enemy shard_sentinel`, `Opening captain reinforcement arrivals`, `Skill corpse_burst`, `Skill dread_muster`, `Skill gravebinder_0_2`, `Skill gravebinder_0_3`, `Skill gravebinder_0_4`, `Skill gravebinder_0_5`, `Skill gravebinder_2_4`, `Skill gravebinder_2_6`, `Skill raise_dead`.

```text
One isolated 0.55-second sound effect: dry human-sized bones knocking and cracking together, hollow brittle clatter without flesh. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="mat_hex"></a>

#### MAT_HEX — Curse contact

- [ ] **P1 · One Shot · 0.75 s · 3 variations**
- **Filename:** `mat_hex_v01.wav` through `_v03.wav`
- **Current:** Recorded — skills/hex_1.wav, hex_2.wav, hex_3.wav.

**Used by:** `Act III profile dune_shade`, `Act III profile prisoned_shade`, `Act IV profile choir_priest`, `Act IV profile memory_wraith`, `Companion skel_mage`, `Current Sfx.curse`, `Enemy bone_dragon`, `Enemy choir_herald`, `Enemy choir_priest`, `Enemy choirmaster`, `Enemy drowned_ritual`, `Enemy dune_shade`, `Enemy empty_archangel`, `Enemy frost_wraith`, `Enemy gloom_shade`, `Enemy grave_wraith`, `Enemy hex_imp`, `Enemy lure_child`, `Enemy memory_wraith`, `Enemy prisoned_shade`, `Enemy quieting_ritual`, `Enemy r28_robed`, `Enemy r48_robed`, `Enemy r51_wraith`, `Enemy r56_wraith`, `Enemy r61_wraith`, `Enemy r66_wraith`, `Enemy r71_wraith`, `Enemy r74_robed`, `Enemy r75_wraith`, `Enemy r80_wraith`, `Enemy r85_wraith`, `Enemy r90_wraith`, `Enemy r95_wraith`, `Enemy silent_cultist`, `Enemy song_thrall`, `Enemy soul_chained`, `Enemy void_gargoyle`, `Enemy void_wraith`, `Skill gravebinder_0_5`, `Skill gravebinder_1_2`, `Skill gravebinder_1_3`, `Skill gravebinder_1_4`, `Skill gravebinder_1_5`, `Skill gravebinder_1_6`, `Skill gravebinder_1_7`, `Skill mark_of_frailty`, `Unique powers and glyph combinations`.

```text
One isolated 0.75-second sound effect: an unnatural hollow air gulp collapsing inward with dissonant breath-like resonance, nonverbal and nonmelodic. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="mat_shadow"></a>

#### MAT_SHADOW — Shadow release

- [ ] **P1 · One Shot · 0.5 s · 3 variations**
- **Filename:** `mat_shadow_v01.wav` through `_v03.wav`
- **Current:** Recorded — skills/shadow_1.wav, shadow_2.wav, shadow_3.wav.

**Used by:** `Act II profile lure_child`, `Act III profile dune_shade`, `Act III profile prisoned_shade`, `Act IV profile memory_wraith`, `Enemy chained_sovereign`, `Enemy cinder_imp`, `Enemy dune_shade`, `Enemy empty_archangel`, `Enemy frost_wraith`, `Enemy gloom_shade`, `Enemy grave_wraith`, `Enemy hex_imp`, `Enemy lure_child`, `Enemy memory_wraith`, `Enemy prisoned_shade`, `Enemy r51_wraith`, `Enemy r56_wraith`, `Enemy r61_wraith`, `Enemy r66_wraith`, `Enemy r71_wraith`, `Enemy r75_wraith`, `Enemy r80_wraith`, `Enemy r85_wraith`, `Enemy r87_treant`, `Enemy r90_wraith`, `Enemy r94_warlord`, `Enemy r95_wraith`, `Enemy soul_chained`, `Enemy vellath`, `Enemy void_wraith`, `Enemy wretch_lord`, `Skill gravebinder_1_2`, `Skill gravebinder_1_3`, `Skill gravebinder_1_5`, `Skill gravebinder_1_7`, `Skill mark_of_frailty`, `Skill veilranger_2_0`.

```text
One isolated 0.5-second sound effect: a short rush of air sucked into a void, reversed-texture swell resolving into a dry soft thud. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="mat_breath"></a>

#### MAT_BREATH — Exertion and spectral accent

- [ ] **P1 · One Shot · 0.4 s · 3 variations**
- **Filename:** `mat_breath_v01.wav` through `_v03.wav`
- **Current:** Recorded — skills/breath_1.wav, breath_2.wav, breath_3.wav.

**Used by:** `Skill dread_muster`, `Skill feral_howl`, `Skill gravebinder_1_5`, `Skill gravebinder_2_7`, `Skill terrifying_bellow`, `Skill vanguard_1_0`, `Skill vanguard_1_4`, `Skill veilranger_2_0`, `Skill veilranger_2_1`.

```text
One isolated 0.4-second sound effect: a forceful breath exhalation through clenched teeth, close and rough, no syllables. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="mat_rot"></a>

#### MAT_ROT — Poison and decay contact

- [ ] **P1 · One Shot · 0.6 s · 3 variations**
- **Filename:** `mat_rot_v01.wav` through `_v03.wav`
- **Current:** Recorded — skills/rot_1.wav, rot_2.wav, rot_3.wav.

**Used by:** `Act II profile blight_treant`, `Act III profile dune_serpent`, `Companion skel_mage`, `Enemy blight_treant`, `Enemy blight_wasp`, `Enemy bog_bloat`, `Enemy brood_mother`, `Enemy caustic_ooze`, `Enemy cave_python`, `Enemy crypt_widow`, `Enemy dune_serpent`, `Enemy lure_child`, `Enemy marsh_larvae`, `Enemy marsh_serpent`, `Enemy marsh_wretch`, `Enemy r12_ooze`, `Enemy r13_spider`, `Enemy r17_ooze`, `Enemy r18_spider`, `Enemy r22_ooze`, `Enemy r23_spider`, `Enemy r25_ooze`, `Enemy r2_ooze`, `Enemy r30_ooze`, `Enemy r35_ooze`, `Enemy r3_spider`, `Enemy r40_ooze`, `Enemy r45_ooze`, `Enemy r58_imp`, `Enemy r67_brute`, `Enemy r78_brute`, `Enemy r7_ooze`, `Enemy r85_wraith`, `Enemy r8_spider`, `Enemy r92_treant`, `Enemy r99_warlord`, `Enemy shatter_wasp`, `Enemy sludge_horror`, `Enemy vethriss`, `Skill corpse_burst`, `Skill gravebinder_2_1`, `Skill gravebinder_2_2`, `Skill gravebinder_2_7`, `Skill rabies`, `Skill raise_plaguemage`, `Skill venom_spit`, `Skill withering_hex`, `Unique powers and glyph combinations`.

```text
One isolated 0.6-second sound effect: thick corrosive fluid splashing and sizzling, wet bubbles collapsing with a sour air hiss. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="mat_blood"></a>

#### MAT_BLOOD — Flesh contact

- [ ] **P1 · One Shot · 0.35 s · 3 variations**
- **Filename:** `mat_blood_v01.wav` through `_v03.wav`
- **Current:** Recorded — skills/blood_1.wav, blood_2.wav, blood_3.wav.

**Used by:** `Act III profile dune_serpent`, `Act III profile sand_raider`, `Act IV profile soul_eater`, `Basic attack: beast`, `Companion bear`, `Companion boar`, `Companion wolf`, `Current Sfx.hit`, `Enemy ash_drake`, `Enemy ash_fiend`, `Enemy ashfiend_reaver`, `Enemy azram_echo`, `Enemy barb_axe`, `Enemy barb_guard`, `Enemy barb_pole`, `Enemy barb_sword`, `Enemy blight_wasp`, `Enemy bog_bloat`, `Enemy brimstone_brute`, `Enemy brood_mother`, `Enemy cave_python`, `Enemy cinder_hound`, `Enemy cinder_imp`, `Enemy crypt_widow`, `Enemy drowned_dead`, `Enemy dune_serpent`, `Enemy fen_stalker`, `Enemy flesh_engine`, `Enemy frost_risen`, `Enemy frost_wyrm`, `Enemy glacial_crawler`, `Enemy grave_hound`, `Enemy hex_imp`, `Enemy hoarfang`, `Enemy ice_lurker`, `Enemy infernal_warlord`, `Enemy korvath`, `Enemy malthoron_echo`, `Enemy marsh_larvae`, `Enemy marsh_serpent`, `Enemy marsh_wretch`, `Enemy mire_mother`, `Enemy pit_brute`, `Enemy r0_hound`, `Enemy r10_hound`, `Enemy r13_spider`, `Enemy r15_hound`, `Enemy r16_human`, `Enemy r18_spider`, `Enemy r19_skeleton`, `Enemy r20_hound`, `Enemy r22_ooze`, `Enemy r23_spider`, `Enemy r26_brute`, `Enemy r27_skeleton`, `Enemy r29_imp`, `Enemy r31_brute`, `Enemy r32_skeleton`, `Enemy r34_imp`, `Enemy r36_brute`, `Enemy r39_imp`, `Enemy r3_spider`, `Enemy r41_brute`, `Enemy r44_imp`, `Enemy r45_ooze`, `Enemy r46_brute`, `Enemy r49_imp`, `Enemy r4_skeleton`, `Enemy r52_brute`, `Enemy r53_imp`, `Enemy r55_knight`, `Enemy r57_brute`, `Enemy r58_imp`, `Enemy r5_hound`, `Enemy r62_brute`, `Enemy r63_imp`, `Enemy r67_brute`, `Enemy r68_imp`, `Enemy r72_brute`, `Enemy r73_imp`, `Enemy r78_brute`, `Enemy r83_brute`, `Enemy r88_brute`, `Enemy r8_spider`, `Enemy r93_brute`, `Enemy r98_brute`, `Enemy risen`, `Enemy shatter_wasp`, `Enemy soul_eater`, `Enemy tomb_husk`, `Enemy vellath`, `Enemy vethriss`, `Enemy wretch_lord`, `Skill call_wolf`, `Skill gravebinder_0_7`, `Skill kinship`, `Skill vanguard_0_6`, `Skill veilranger_2_0`, `Skill veilranger_2_4`, `Skill veilranger_2_6`, `Skill wildkeeper_0_3`, `Skill wildkeeper_0_6`.

```text
One isolated 0.35-second sound effect: a compact wet flesh impact with a low body thud and brief tearing detail, no voice. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="mat_roots"></a>

#### MAT_ROOTS — Root movement

- [ ] **P1 · One Shot · 0.65 s · 3 variations**
- **Filename:** `mat_roots_v01.wav` through `_v03.wav`
- **Current:** Recorded — skills/roots_1.wav, roots_2.wav, roots_3.wav.

**Used by:** `Act II profile blight_treant`, `Basic attack: beast`, `Companion ent`, `Enemy blight_treant`, `Enemy brood_mother`, `Enemy gnarl_treant`, `Enemy lure_child`, `Enemy r77_treant`, `Enemy r82_treant`, `Enemy r87_treant`, `Enemy r92_treant`, `Enemy r97_treant`, `Enemy thorn_shambler`, `Skill call_wolf`, `Skill fangform`, `Skill ground_fissure`, `Skill ground_slam`, `Skill stoneform`, `Skill thornback_boar`, `Skill vanguard_2_0`, `Skill vanguard_2_6`, `Skill wildkeeper_0_3`, `Skill wildkeeper_0_6`, `Skill wildkeeper_1_0`, `Skill wildkeeper_1_5`, `Skill wildkeeper_2_2`.

```text
One isolated 0.65-second sound effect: thick roots twisting and tearing out of packed earth, woody fibers snapping and dirt falling. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="mat_stone"></a>

#### MAT_STONE — Earth impact

- [ ] **P1 · One Shot · 0.65 s · 3 variations**
- **Filename:** `mat_stone_v01.wav` through `_v03.wav`
- **Current:** Recorded — skills/stone_1.wav, stone_2.wav, stone_3.wav.

**Used by:** `Act III profile crystal_marauder`, `Act III profile sand_raider`, `Act III profile shard_construct`, `Act III profile stone_gargoyle`, `Companion bone_golem`, `Companion ent`, `Current Sfx.slam`, `Enemy ash_fiend`, `Enemy ashfiend_reaver`, `Enemy azram_echo`, `Enemy barb_axe`, `Enemy barb_guard`, `Enemy barb_pole`, `Enemy barb_sword`, `Enemy beacon`, `Enemy blight_treant`, `Enemy bog_bloat`, `Enemy bone_dragon`, `Enemy brimstone_brute`, `Enemy brood_mother`, `Enemy chained_sovereign`, `Enemy chapel_grotesque`, `Enemy crystal_marauder`, `Enemy drowned_ritual`, `Enemy fen_stalker`, `Enemy flesh_engine`, `Enemy frost_watch_captain`, `Enemy frost_wyrm`, `Enemy gilt_construct`, `Enemy glacial_crawler`, `Enemy gnarl_treant`, `Enemy hoarfang`, `Enemy infernal_warlord`, `Enemy korvath`, `Enemy malthoron_echo`, `Enemy mire_mother`, `Enemy morthul`, `Enemy pit_brute`, `Enemy quieting_ritual`, `Enemy r15_hound`, `Enemy r21_human`, `Enemy r26_brute`, `Enemy r29_imp`, `Enemy r31_brute`, `Enemy r36_brute`, `Enemy r38_robed`, `Enemy r3_spider`, `Enemy r41_brute`, `Enemy r46_brute`, `Enemy r47_skeleton`, `Enemy r52_brute`, `Enemy r56_wraith`, `Enemy r57_brute`, `Enemy r62_brute`, `Enemy r67_brute`, `Enemy r72_brute`, `Enemy r75_wraith`, `Enemy r77_treant`, `Enemy r78_brute`, `Enemy r82_treant`, `Enemy r83_brute`, `Enemy r87_treant`, `Enemy r88_brute`, `Enemy r92_treant`, `Enemy r93_brute`, `Enemy r97_treant`, `Enemy r98_brute`, `Enemy r9_skeleton`, `Enemy shard_construct`, `Enemy stone_gargoyle`, `Enemy thorn_shambler`, `Enemy vellath`, `Enemy void_gargoyle`, `Enemy wretch_lord`, `Skill emberwitch_1_6`, `Skill gravebinder_0_2`, `Skill ground_fissure`, `Skill ground_slam`, `Skill thornback_boar`, `Skill vanguard_2_0`, `Skill vanguard_2_6`, `Skill wildkeeper_1_5`, `Skill wildkeeper_2_2`, `Unique powers and glyph combinations`.

```text
One isolated 0.65-second sound effect: a heavy rock hitting stone ground, deep dry knock with short granular debris. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="mat_growl"></a>

#### MAT_GROWL — Beast attack accent

- [ ] **P1 · One Shot · 0.65 s · 3 variations**
- **Filename:** `mat_growl_v01.wav` through `_v03.wav`
- **Current:** Recorded — skills/growl_1.wav, growl_2.wav, growl_3.wav.

**Used by:** `Basic attack: beast`, `Companion bear`, `Companion boar`, `Companion wolf`, `Enemy ash_drake`, `Enemy cinder_hound`, `Enemy grave_hound`, `Enemy hoarfang`, `Enemy ice_lurker`, `Enemy r0_hound`, `Enemy r10_hound`, `Enemy r15_hound`, `Enemy r20_hound`, `Enemy r5_hound`, `Enemy soul_eater`, `Skill call_wolf`, `Skill fangform`, `Skill stoneform`, `Skill thornback_boar`, `Skill wildkeeper_0_3`, `Skill wildkeeper_0_6`, `Skill wildkeeper_2_6`.

```text
One isolated 0.65-second sound effect: a single low animal snarl and breathy chest growl, close and rough, no human words. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="mat_draw"></a>

#### MAT_DRAW — Bow tension

- [ ] **P1 · One Shot · 0.7 s · 3 variations**
- **Filename:** `mat_draw_v01.wav` through `_v03.wav`
- **Current:** Recorded — skills/draw_1.wav, draw_2.wav, draw_3.wav.

**Used by:** `Basic attack: ranged`, `Skill veilranger_0_0`, `Skill veilranger_0_1`, `Skill veilranger_0_2`, `Skill veilranger_0_4`, `Skill veilranger_0_6`.

```text
One isolated 0.7-second sound effect: a wooden bow being drawn taut, stressed wood creak and tight string fiber tension, no release. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="mat_bow"></a>

#### MAT_BOW — Bow release

- [ ] **P1 · One Shot · 0.3 s · 3 variations**
- **Filename:** `mat_bow_v01.wav` through `_v03.wav`
- **Current:** Recorded — skills/bow_1.wav, bow_2.wav, bow_3.wav.

**Used by:** `Basic attack: ranged`, `Current Sfx.bow`, `Enemy bone_archer`, `Enemy frost_archer`, `Skill veilranger_0_0`, `Skill veilranger_0_1`, `Skill veilranger_0_2`, `Skill veilranger_0_4`, `Skill veilranger_0_6`.

```text
One isolated 0.3-second sound effect: a taut bowstring snapping forward with a short wooden body resonance and arrow swish. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="mat_arrow"></a>

#### MAT_ARROW — Arrow impact

- [ ] **P1 · One Shot · 0.3 s · 3 variations**
- **Filename:** `mat_arrow_v01.wav` through `_v03.wav`
- **Current:** Recorded — skills/arrow_1.wav, arrow_2.wav, arrow_3.wav.

**Used by:** `Basic attack: ranged`, `Current Sfx.arrowHit`, `Enemy bone_archer`, `Enemy frost_archer`, `Skill veilranger_0_0`, `Skill veilranger_0_1`, `Skill veilranger_0_2`, `Skill veilranger_0_4`, `Skill veilranger_0_6`.

```text
One isolated 0.3-second sound effect: one arrow punching into a solid target with a sharp wooden shaft vibration and compact thud. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="mat_latch"></a>

#### MAT_LATCH — Trap mechanism

- [ ] **P1 · One Shot · 0.4 s · 3 variations**
- **Filename:** `mat_latch_v01.wav` through `_v03.wav`
- **Current:** Recorded — skills/latch_1.wav, latch_2.wav, latch_3.wav.

**Used by:** `Skill vanguard_2_1`, `Skill veilranger_1_0`, `Skill veilranger_1_2`, `Skill veilranger_1_3`, `Skill veilranger_1_4`, `Skill veilranger_1_5`.

```text
One isolated 0.4-second sound effect: a small rusty spring latch cocking and snapping shut, precise mechanical clicks, no electronic beep. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="mat_howl"></a>

#### MAT_HOWL — Warcry material

- [ ] **P1 · One Shot · 1 s · 3 variations**
- **Filename:** `mat_howl_v01.wav` through `_v03.wav`
- **Current:** Recorded — skills/howl_1.wav, howl_2.wav, howl_3.wav.

**Used by:** `Current Sfx.roar`, `Skill dread_muster`, `Skill feral_howl`, `Skill terrifying_bellow`, `Skill vanguard_1_0`, `Skill vanguard_1_4`.

```text
One isolated 1-second sound effect: one harsh nonverbal battle shout, ragged chest resonance and an abrupt breath ending, no language. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="mat_shield"></a>

#### MAT_SHIELD — Shield contact

- [ ] **P1 · One Shot · 0.5 s · 3 variations**
- **Filename:** `mat_shield_v01.wav` through `_v03.wav`
- **Current:** Recorded — skills/shield_1.wav, shield_2.wav, shield_3.wav.

**Used by:** `Act III profile gilded_thrall`, `Act III profile tomb_guard`, `Act IV profile cathedral_knight_guardian`, `Act IV profile hollow_knight`, `Current Sfx.block`, `Enemy fallen_blade`, `Enemy frost_watch_captain`, `Enemy gilded_thrall`, `Enemy hollow_knight`, `Enemy r81_knight`, `Enemy r88_brute`, `Enemy r95_wraith`, `Enemy tomb_guard`, `Skill vanguard_0_1`, `Skill vanguard_0_2`, `Skill vanguard_0_5`, `Skill vanguard_2_5`.

```text
One isolated 0.5-second sound effect: a heavy iron-rimmed wooden shield struck hard, low wood knock and tight metallic ring. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="mat_chain"></a>

#### MAT_CHAIN — Chain movement

- [ ] **P1 · One Shot · 0.65 s · 3 variations**
- **Filename:** `mat_chain_v01.wav` through `_v03.wav`
- **Current:** Recorded — skills/chain_1.wav, chain_2.wav, chain_3.wav.

**Used by:** `Act III profile soul_chained`, `Skill vanguard_0_2`, `Skill vanguard_1_2`, `Skill vanguard_1_5`, `Skill vanguard_2_1`, `Skill vanguard_2_5`.

```text
One isolated 0.65-second sound effect: a length of heavy iron chain whipping taut, interlocking metal clacks and a final tension snap. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="mat_wind"></a>

#### MAT_WIND — Wind burst

- [ ] **P1 · One Shot · 0.65 s · 3 variations**
- **Filename:** `mat_wind_v01.wav` through `_v03.wav`
- **Current:** Recorded — skills/wind_1.wav, wind_2.wav, wind_3.wav.

**Used by:** `Act III profile crystal_marauder`, `Act III profile dune_serpent`, `Act IV profile soul_eater`, `Companion hawk`, `Enemy ash_drake`, `Enemy ashfiend_reaver`, `Enemy barb_sword`, `Enemy brimstone_brute`, `Enemy cave_python`, `Enemy dune_serpent`, `Enemy infernal_warlord`, `Enemy marsh_serpent`, `Enemy r10_hound`, `Enemy r16_human`, `Enemy r22_ooze`, `Enemy r27_skeleton`, `Enemy r36_brute`, `Enemy r45_ooze`, `Enemy r4_skeleton`, `Enemy r55_knight`, `Enemy r57_brute`, `Enemy r65_knight`, `Enemy r84_warlord`, `Enemy r89_warlord`, `Enemy r96_knight`, `Skill emberwitch_2_3`, `Skill emberwitch_2_5`, `Skill veilranger_0_6`, `Skill wildkeeper_0_2`, `Skill wildkeeper_1_3`.

```text
One isolated 0.65-second sound effect: a fast dense gust rushing past, broad airy whoosh falling to silence without tonal whistling. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="mat_thunder"></a>

#### MAT_THUNDER — Thunder impact accent

- [ ] **P1 · One Shot · 1.2 s · 3 variations**
- **Filename:** `mat_thunder_v01.wav` through `_v03.wav`
- **Current:** Recorded — skills/thunder_1.wav, thunder_2.wav, thunder_3.wav.

**Used by:** `Skill emberwitch_0_4`, `Skill emberwitch_0_6`, `Skill emberwitch_2_6`, `Skill wildkeeper_1_6`.

```text
One isolated 1.2-second sound effect: a close low thunder crack with restrained bass and a short coarse rolling decay. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="bank-movement-and-player"></a>

### Movement and player

<a id="step_snow"></a>

#### STEP_SNOW — Human footsteps on snow

- [ ] **P1 · One Shot · 0.3 s · 6 variations**
- **Filename:** `step_snow_v01.wav` through `_v06.wav`
- **Current:** Synthesized/shared — current step(town) has no surface-specific bank.

**Used by:** `Human locomotion`.

```text
One isolated 0.3-second sound effect: one leather boot compressing deep dry snow with a soft granular crunch. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="step_ice"></a>

#### STEP_ICE — Human footsteps on ice

- [ ] **P1 · One Shot · 0.3 s · 6 variations**
- **Filename:** `step_ice_v01.wav` through `_v06.wav`
- **Current:** Synthesized/shared — current step(town) has no surface-specific bank.

**Used by:** `Hazard ice`, `Hazard spring`, `Human locomotion`.

```text
One isolated 0.3-second sound effect: one boot stepping on hard frosted ice, sharp frozen grit and a small sole slip. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="step_stone"></a>

#### STEP_STONE — Human footsteps on stone

- [ ] **P1 · One Shot · 0.3 s · 6 variations**
- **Filename:** `step_stone_v01.wav` through `_v06.wav`
- **Current:** Synthesized/shared — current step(town) has no surface-specific bank.

**Used by:** `Current Sfx.step`, `Enemy cult_acolyte`, `Enemy cult_zealot`, `Enemy gravecaller`, `Enemy r11_human`, `Enemy r16_human`, `Enemy r1_human`, `Enemy r21_human`, `Enemy r33_robed`, `Enemy r38_robed`, `Enemy r43_robed`, `Enemy r48_robed`, `Enemy r54_robed`, `Enemy r59_robed`, `Enemy r64_robed`, `Enemy r69_robed`, `Enemy r6_human`, `Enemy r74_robed`, `Enemy sand_raider`, `Enemy shard_thrall`, `Enemy vicar`, `Human locomotion`.

```text
One isolated 0.3-second sound effect: one leather boot landing on old stone paving, firm muted heel and fine grit. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="step_wood"></a>

#### STEP_WOOD — Human footsteps on wood

- [ ] **P1 · One Shot · 0.3 s · 6 variations**
- **Filename:** `step_wood_v01.wav` through `_v06.wav`
- **Current:** Synthesized/shared — current step(town) has no surface-specific bank.

**Used by:** `Human locomotion`.

```text
One isolated 0.3-second sound effect: one boot stepping on a weathered timber floor, short wood knock and slight board creak. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="step_dirt"></a>

#### STEP_DIRT — Human footsteps on dirt

- [ ] **P1 · One Shot · 0.3 s · 6 variations**
- **Filename:** `step_dirt_v01.wav` through `_v06.wav`
- **Current:** Synthesized/shared — current step(town) has no surface-specific bank.

**Used by:** `Enemy drowned_dead`, `Enemy frost_risen`, `Enemy r19_skeleton`, `Enemy r27_skeleton`, `Enemy r32_skeleton`, `Enemy risen`, `Enemy tomb_husk`, `Human locomotion`.

```text
One isolated 0.3-second sound effect: one boot stepping on packed dirt with loose dry grains. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="step_sand"></a>

#### STEP_SAND — Human footsteps on sand

- [ ] **P1 · One Shot · 0.3 s · 6 variations**
- **Filename:** `step_sand_v01.wav` through `_v06.wav`
- **Current:** Synthesized/shared — current step(town) has no surface-specific bank.

**Used by:** `Hazard quicksand`, `Human locomotion`.

```text
One isolated 0.3-second sound effect: one boot sinking into dry coarse sand with a soft scraping grain wash. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="step_mud"></a>

#### STEP_MUD — Human footsteps on mud

- [ ] **P1 · One Shot · 0.3 s · 6 variations**
- **Filename:** `step_mud_v01.wav` through `_v06.wav`
- **Current:** Synthesized/shared — current step(town) has no surface-specific bank.

**Used by:** `Hazard blood`, `Hazard bog`, `Human locomotion`.

```text
One isolated 0.3-second sound effect: one boot pulling through sticky mud, compact wet suction and squelch. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="step_water"></a>

#### STEP_WATER — Human footsteps on water

- [ ] **P1 · One Shot · 0.3 s · 6 variations**
- **Filename:** `step_water_v01.wav` through `_v06.wav`
- **Current:** Synthesized/shared — current step(town) has no surface-specific bank.

**Used by:** `Human locomotion`.

```text
One isolated 0.3-second sound effect: one boot stepping in shallow water with a low splash and brief drips. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="step_gravel"></a>

#### STEP_GRAVEL — Human footsteps on gravel

- [ ] **P1 · One Shot · 0.3 s · 6 variations**
- **Filename:** `step_gravel_v01.wav` through `_v06.wav`
- **Current:** Synthesized/shared — current step(town) has no surface-specific bank.

**Used by:** `Human locomotion`.

```text
One isolated 0.3-second sound effect: one boot crushing loose gravel and small rubble. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="step_ash"></a>

#### STEP_ASH — Human footsteps on ash

- [ ] **P1 · One Shot · 0.3 s · 6 variations**
- **Filename:** `step_ash_v01.wav` through `_v06.wav`
- **Current:** Synthesized/shared — current step(town) has no surface-specific bank.

**Used by:** `Human locomotion`.

```text
One isolated 0.3-second sound effect: one boot compressing powdery ash on brittle volcanic crust, dry crunch and dust scrape. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="player_armor"></a>

#### PLAYER_ARMOR — Heavy equipment movement

- [ ] **P1 · One Shot · 0.4 s · 3 variations**
- **Filename:** `player_armor_v01.wav` through `_v03.wav`
- **Current:** Missing — dedicated equipment movement.

**Used by:** `Enemy fallen_blade`, `Enemy hollow_knight`, `Enemy impaler`, `Enemy malthoron`, `Enemy r50_knight`, `Enemy r55_knight`, `Enemy r60_knight`, `Enemy r65_knight`, `Enemy r70_knight`, `Enemy r76_knight`, `Enemy r81_knight`, `Enemy r86_knight`, `Enemy r91_knight`, `Enemy r96_knight`, `Enemy tomb_guard`, `Human locomotion`.

```text
One isolated 0.4-second sound effect: worn plate and chainmail shifting with one walking motion, small irregular metal ticks. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="player_leather"></a>

#### PLAYER_LEATHER — Light equipment movement

- [ ] **P1 · One Shot · 0.35 s · 3 variations**
- **Filename:** `player_leather_v01.wav` through `_v03.wav`
- **Current:** Missing — dedicated equipment movement.

**Used by:** `Human locomotion`.

```text
One isolated 0.35-second sound effect: a worn leather belt and pouch shifting with a soft buckle tick. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="player_jump"></a>

#### PLAYER_JUMP — Jump takeoff

- [ ] **P1 · One Shot · 0.35 s · 3 variations**
- **Filename:** `player_jump_v01.wav` through `_v03.wav`
- **Current:** Missing — dedicated jump cue.

**Used by:** `Enemy barb_pole`, `Enemy chapel_grotesque`, `Enemy r11_human`, `Enemy r17_ooze`, `Enemy r23_spider`, `Enemy r25_ooze`, `Enemy r34_imp`, `Enemy r43_robed`, `Enemy r53_imp`, `Enemy r5_hound`, `Enemy stone_gargoyle`, `Enemy void_gargoyle`, `Human locomotion`.

```text
One isolated 0.35-second sound effect: a boot pushing off rough ground with a short clothing swish and breath. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="player_land"></a>

#### PLAYER_LAND — Human landing

- [ ] **P1 · One Shot · 0.45 s · 3 variations**
- **Filename:** `player_land_v01.wav` through `_v03.wav`
- **Current:** Missing — dedicated landing cue.

**Used by:** `Human locomotion`.

```text
One isolated 0.45-second sound effect: two weighted boots landing with one solid thud, a small gear rattle and loose grit. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="player_dodge"></a>

#### PLAYER_DODGE — Evade or avoided-hit feedback

- [ ] **P1 · One Shot · 0.25 s · 3 variations**
- **Filename:** `player_dodge_v01.wav` through `_v03.wav`
- **Current:** Missing — for successful avoidance only; no invented dodge ability.

**Used by:** `Human combat feedback`.

```text
One isolated 0.25-second sound effect: a short close air swish and leather pull, light and quick with no impact. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="player_hurt"></a>

#### PLAYER_HURT — Player nonfatal injury

- [ ] **P1 · One Shot · 0.5 s · 3 variations**
- **Filename:** `player_hurt_v01.wav` through `_v03.wav`
- **Current:** Synthesized — playerHurt.

**Used by:** `Current Sfx.playerHurt`, `Human combat feedback`.

```text
One isolated 0.5-second sound effect: one restrained adult pain grunt, sudden rough breath and clenched jaw, no scream. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="player_death"></a>

#### PLAYER_DEATH — Player death

- [ ] **P1 · One Shot · 2.2 s · 2 variations**
- **Filename:** `player_death_v01.wav` through `_v02.wav`
- **Current:** Recorded — supplied player death MP3; replacement option.

**Used by:** `Current Sfx.death`, `Human combat feedback`.

```text
One isolated 2.2-second sound effect: one adult final pain cry breaking into an exhausted exhale, grim and human, no words. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="player_heal"></a>

#### PLAYER_HEAL — Healing draught

- [ ] **P1 · One Shot · 0.8 s · 3 variations**
- **Filename:** `player_heal_v01.wav` through `_v03.wav`
- **Current:** Synthesized/shared — potion.

**Used by:** `Current Sfx.potion`, `Draughts and return to town`.

```text
One isolated 0.8-second sound effect: a bottle cork pop, one quick liquid swallow and a soft warm breath release. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="player_aether"></a>

#### PLAYER_AETHER — Aether draught

- [ ] **P1 · One Shot · 0.8 s · 3 variations**
- **Filename:** `player_aether_v01.wav` through `_v03.wav`
- **Current:** Synthesized/shared — potion.

**Used by:** `Current Sfx.potion`, `Draughts and return to town`.

```text
One isolated 0.8-second sound effect: a small glass bottle uncorked and swallowed, followed by a brief airy hollow shimmer. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="player_restore"></a>

#### PLAYER_RESTORE — Restoration and revival accent

- [ ] **P1 · One Shot · 1.2 s · 2 variations**
- **Filename:** `player_restore_v01.wav` through `_v02.wav`
- **Current:** Shared — potion/shrine feedback; dedicated revival accent missing.

**Used by:** `Draughts and return to town`, `Opening hearth arrival`.

```text
One isolated 1.2-second sound effect: a quiet inhaling rush that settles into a warm low breath, subtle rising glass resonance. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="player_crit"></a>

#### PLAYER_CRIT — Critical-hit accent

- [ ] **P1 · One Shot · 0.3 s · 3 variations**
- **Filename:** `player_crit_v01.wav` through `_v03.wav`
- **Current:** Synthesized — crit outside skill scope; skill hits use recorded layers.

**Used by:** `Current Sfx.crit`, `Human combat feedback`, `Slow, chill, burning, bleed and critical contact`.

```text
One isolated 0.3-second sound effect: a short heavy body crack with tightly controlled bass, dry sharp transient and no extra sword swing. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="player_miss"></a>

#### PLAYER_MISS — Weapon miss

- [ ] **P1 · One Shot · 0.25 s · 3 variations**
- **Filename:** `player_miss_v01.wav` through `_v03.wav`
- **Current:** Shared — swing/material blade; no distinct miss confirmation.

**Used by:** `Human combat feedback`.

```text
One isolated 0.25-second sound effect: a light fast blade swish passing close without any impact or clang. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="bank-interface-and-progression"></a>

### Interface and progression

<a id="ui_click"></a>

#### UI_CLICK — Default UI activation

- [ ] **P1 · One Shot · 0.15 s · 3 variations**
- **Filename:** `ui_click_v01.wav` through `_v03.wav`
- **Current:** Recorded — supplied UI click MP3.

**Used by:** `Current Sfx.click`, `UI panels and inventory`.

```text
One isolated 0.15-second sound effect: one quiet worn-metal button click, compact tactile tick with a low wooden body. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="ui_open"></a>

#### UI_OPEN — Open inventory, character, talents, quest or settings panel

- [ ] **P3 · One Shot · 0.3 s · 3 variations**
- **Filename:** `ui_open_v01.wav` through `_v03.wav`
- **Current:** Shared — recorded click.

**Used by:** `UI panels and inventory`.

```text
One isolated 0.3-second sound effect: a short parchment unfurl with one subdued wooden latch click. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="ui_close"></a>

#### UI_CLOSE — Close a panel or return from a submenu

- [ ] **P3 · One Shot · 0.25 s · 3 variations**
- **Filename:** `ui_close_v01.wav` through `_v03.wav`
- **Current:** Shared — recorded click.

**Used by:** `UI panels and inventory`.

```text
One isolated 0.25-second sound effect: a parchment fold settling against leather with one soft tap. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="ui_tab"></a>

#### UI_TAB — Change tabs, filters, or selected class

- [ ] **P3 · One Shot · 0.15 s · 3 variations**
- **Filename:** `ui_tab_v01.wav` through `_v03.wav`
- **Current:** Shared — recorded click.

**Used by:** `UI panels and inventory`.

```text
One isolated 0.15-second sound effect: a small dry bone token sliding into a shallow wooden notch. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="ui_equip"></a>

#### UI_EQUIP — Equip or unequip gear

- [ ] **P2 · One Shot · 0.35 s · 3 variations**
- **Filename:** `ui_equip_v01.wav` through `_v03.wav`
- **Current:** Shared — recorded click.

**Used by:** `UI panels and inventory`.

```text
One isolated 0.35-second sound effect: a leather strap tightening with a quiet metal clasp snap. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="ui_move_item"></a>

#### UI_MOVE_ITEM — Inventory drag/drop and storage transfer

- [ ] **P3 · One Shot · 0.25 s · 3 variations**
- **Filename:** `ui_move_item_v01.wav` through `_v03.wav`
- **Current:** Shared — recorded click.

**Used by:** `UI panels and inventory`.

```text
One isolated 0.25-second sound effect: a small leather pouch placed on a wooden table, soft short thump. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="ui_error"></a>

#### UI_ERROR — Rejected action, unavailable skill, full bag, missing corpse or aether

- [ ] **P1 · One Shot · 0.3 s · 3 variations**
- **Filename:** `ui_error_v01.wav` through `_v03.wav`
- **Current:** Synthesized — error.

**Used by:** `Current Sfx.error`, `UI panels and inventory`.

```text
One isolated 0.3-second sound effect: a short low wooden clack followed by a muted strained metal creak, unmistakable but gentle. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="ui_buy"></a>

#### UI_BUY — Successful purchase or sale

- [ ] **P1 · One Shot · 0.65 s · 3 variations**
- **Filename:** `ui_buy_v01.wav` through `_v03.wav`
- **Current:** Synthesized/shared — buy/coin.

**Used by:** `Current Sfx.buy`, `Town vendor purchase / sale`.

```text
One isolated 0.65-second sound effect: a few small coins counted into a leather purse with a closing clasp. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="ui_forge"></a>

#### UI_FORGE — Forge transmutation or crafting success

- [ ] **P1 · One Shot · 1.1 s · 2 variations**
- **Filename:** `ui_forge_v01.wav` through `_v02.wav`
- **Current:** Synthesized — forge.

**Used by:** `Current Sfx.forge`, `Town forge / transmutation`.

```text
One isolated 1.1-second sound effect: one weighty hammer strike on an anvil with a contained magical spark and short hot hiss. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="ui_socket"></a>

#### UI_SOCKET — Insert a glyph or jewel into a socket

- [ ] **P2 · One Shot · 0.65 s · 3 variations**
- **Filename:** `ui_socket_v01.wav` through `_v03.wav`
- **Current:** Shared — forge/click; dedicated socket cue missing.

**Used by:** `Socketed gear / glyph / jewel insertion`.

```text
One isolated 0.65-second sound effect: a small carved stone clicking into metal, followed by a brief crystalline resonance. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="ui_respec"></a>

#### UI_RESPEC — Confirm a talent reset

- [ ] **P3 · One Shot · 0.9 s · 3 variations**
- **Filename:** `ui_respec_v01.wav` through `_v03.wav`
- **Current:** Shared — click; dedicated reset cue missing.

**Used by:** `UI panels and inventory`.

```text
One isolated 0.9-second sound effect: a handful of small runic stones softly unbinding, dry stone ticks dissolving into a breath. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="ui_level"></a>

#### UI_LEVEL — Level gained

- [ ] **P1 · One Shot · 1.6 s · 2 variations**
- **Filename:** `ui_level_v01.wav` through `_v02.wav`
- **Current:** Synthesized — levelup.

**Used by:** `Current Sfx.levelup`, `Event ev_obel1`, `Event ev_obel2`.

```text
One isolated 1.6-second sound effect: a single low bronze bell struck under a rising airy glass resonance, brief solemn reward flourish. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="ui_skill"></a>

#### UI_SKILL — Invest skill rank or choose a perk

- [ ] **P1 · One Shot · 0.5 s · 3 variations**
- **Filename:** `ui_skill_v01.wav` through `_v03.wav`
- **Current:** Synthesized/shared — skillup and recorded click.

**Used by:** `Current Sfx.skillup`, `UI panels and inventory`.

```text
One isolated 0.5-second sound effect: a small carved rune touched, short clear glass ping with warm stone resonance. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="ui_difficulty"></a>

#### UI_DIFFICULTY — New difficulty unlocked

- [ ] **P2 · One Shot · 1.5 s · 2 variations**
- **Filename:** `ui_difficulty_v01.wav` through `_v02.wav`
- **Current:** Missing — dedicated unlock cue.

**Used by:** `UI panels and inventory`.

```text
One isolated 1.5-second sound effect: a heavy iron lock opening with three close mechanical shifts and a low ominous resonance. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="ui_save"></a>

#### UI_SAVE — Explicit successful save feedback

- [ ] **P3 · One Shot · 0.25 s · 3 variations**
- **Filename:** `ui_save_v01.wav` through `_v03.wav`
- **Current:** Missing — optional manual-save accent; autosave remains silent.

**Used by:** `UI panels and inventory`.

```text
One isolated 0.25-second sound effect: a soft parchment stamp and tiny metal latch, quiet and reassuring. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="ui_filter"></a>

#### UI_FILTER — Loot-filter sound preview

- [ ] **P3 · One Shot · 0.25 s · 3 variations**
- **Filename:** `ui_filter_v01.wav` through `_v03.wav`
- **Current:** Shared — existing selectable loot sounds; dedicated test accent optional.

**Used by:** `UI panels and inventory`.

```text
One isolated 0.25-second sound effect: a restrained dry crystal tap, easy to distinguish without a bright electronic tone. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="quest_accepted"></a>

#### QUEST_ACCEPTED — questAccepted

- [ ] **P1 · One Shot · 0.7 s · 2 variations**
- **Filename:** `quest_accepted_v01.wav` through `_v02.wav`
- **Current:** Recorded — interactions/questAccepted.wav.

**Used by:** `Current Sfx.questAccepted`, `Quest accepted / progress / ready / complete`.

```text
One isolated 0.7-second sound effect: a fresh parchment contract unfurling with a small decisive wax-stamp thump. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="quest_ready"></a>

#### QUEST_READY — questReady

- [ ] **P1 · One Shot · 1 s · 2 variations**
- **Filename:** `quest_ready_v01.wav` through `_v02.wav`
- **Current:** Recorded — interactions/questReady.wav.

**Used by:** `Current Sfx.questReady`, `Quest accepted / progress / ready / complete`.

```text
One isolated 1-second sound effect: a restrained clear bronze chime with a dry parchment rustle, expectant and unresolved. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="quest_completed"></a>

#### QUEST_COMPLETED — questCompleted

- [ ] **P1 · One Shot · 1.2 s · 2 variations**
- **Filename:** `quest_completed_v01.wav` through `_v02.wav`
- **Current:** Recorded — interactions/questCompleted.wav.

**Used by:** `Current Sfx.quest`, `Current Sfx.questCompleted`, `Opening hearth arrival`, `Quest accepted / progress / ready / complete`.

```text
One isolated 1.2-second sound effect: an old wax seal pressed firmly with a warm low bell resonance fading naturally. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="quest_progress"></a>

#### QUEST_PROGRESS — questProgress

- [ ] **P1 · One Shot · 0.35 s · 2 variations**
- **Filename:** `quest_progress_v01.wav` through `_v02.wav`
- **Current:** Recorded — interactions/questProgress.wav.

**Used by:** `Current Sfx.questProgress`, `Opening caravan rescue and escort secured`, `Quest accepted / progress / ready / complete`, `Story cathedral1/trapped_soul_0`, `Story cathedral1/trapped_soul_1`, `Story cathedral1/trapped_soul_2`, `Story cathedral2/hell_portal`, `Story cathedral2/quieting_seal_0`, `Story cathedral2/quieting_seal_1`, `Story cathedral2/quieting_seal_2`, `Story cathedral2/sword_piece_0`, `Story cathedral2/sword_piece_1`, `Story cathedral2/sword_piece_2`, `Story khal_palace/fortress_map`, `Story ritual_site/mire_shard`, `Story sand_tombs/imprisoned_scholar`, `Story underground_market/market_relay_0`, `Story underground_market/market_relay_1`, `Story underground_market/market_relay_2`.

```text
One isolated 0.35-second sound effect: one small carved tally token placed on wood with a short subdued glass tick. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="bank-loot-and-world-interactions"></a>

### Loot and world interactions

<a id="world_drop"></a>

#### WORLD_DROP — Ordinary item drop

- [ ] **P1 · One Shot · 0.25 s · 3 variations**
- **Filename:** `world_drop_v01.wav` through `_v03.wav`
- **Current:** Synthesized — drop.

**Used by:** `Current Sfx.drop`, `Normal / rare / Unique loot`.

```text
One isolated 0.25-second sound effect: a small wrapped object dropping onto rough earth with one low dry thud. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="world_rare"></a>

#### WORLD_RARE — Rare item drop

- [ ] **P1 · One Shot · 0.9 s · 3 variations**
- **Filename:** `world_rare_v01.wav` through `_v03.wav`
- **Current:** Synthesized — dropRare.

**Used by:** `Current Sfx.dropRare`, `Normal / rare / Unique loot`.

```text
One isolated 0.9-second sound effect: a valuable metal relic landing with a clear restrained glass resonance and soft low ring. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="world_unique"></a>

#### WORLD_UNIQUE — Unique item drop

- [ ] **P1 · One Shot · 1.5 s · 2 variations**
- **Filename:** `world_unique_v01.wav` through `_v02.wav`
- **Current:** Synthesized — dropUnique.

**Used by:** `Current Sfx.dropUnique`, `Normal / rare / Unique loot`.

```text
One isolated 1.5-second sound effect: a heavy ancient relic landing, deep bronze resonance with a delicate high crystal overtone. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="world_gold"></a>

#### WORLD_GOLD — Gold drop or pickup

- [ ] **P1 · One Shot · 0.4 s · 3 variations**
- **Filename:** `world_gold_v01.wav` through `_v03.wav`
- **Current:** Synthesized — coin.

**Used by:** `Current Sfx.coin`, `Event ev_cache4`, `Event ev_cache5`, `Gold / item pickup`.

```text
One isolated 0.4-second sound effect: a few old gold coins clinking together, small sharp irregular metal pings. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="world_pickup"></a>

#### WORLD_PICKUP — Pick up gear, consumables, glyphs or quest items

- [ ] **P1 · One Shot · 0.3 s · 3 variations**
- **Filename:** `world_pickup_v01.wav` through `_v03.wav`
- **Current:** Synthesized — pickup.

**Used by:** `Current Sfx.pickup`, `Gold / item pickup`.

```text
One isolated 0.3-second sound effect: a small object swept into a leather bag, soft cloth brush and firm little tap. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="world_wood_break"></a>

#### WORLD_WOOD_BREAK — Barrel or crate breaks

- [ ] **P2 · One Shot · 0.7 s · 3 variations**
- **Filename:** `world_wood_break_v01.wav` through `_v03.wav`
- **Current:** Synthesized — barrel.

**Used by:** `Current Sfx.barrel`, `Wood barrel / crate`.

```text
One isolated 0.7-second sound effect: one small weathered wooden barrel bursting apart, dry cracks and short falling splinters. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="world_stone_break"></a>

#### WORLD_STONE_BREAK — Break stone pillar or stone prop

- [ ] **P2 · One Shot · 1 s · 2 variations**
- **Filename:** `world_stone_break_v01.wav` through `_v02.wav`
- **Current:** Synthesized — propStone.

**Used by:** `Current Sfx.propStone`, `Stone pillar`.

```text
One isolated 1-second sound effect: a carved stone pillar breaking, heavy cracks with gravel spilling and a short grounded thud. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="world_ceramic_break"></a>

#### WORLD_CERAMIC_BREAK — Urn breaks

- [ ] **P2 · One Shot · 0.6 s · 3 variations**
- **Filename:** `world_ceramic_break_v01.wav` through `_v03.wav`
- **Current:** Synthesized — propCeramic.

**Used by:** `Ceramic urn`, `Current Sfx.propCeramic`.

```text
One isolated 0.6-second sound effect: one clay urn smashing into dry ceramic shards on a stone floor. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="world_ice_break"></a>

#### WORLD_ICE_BREAK — Ice prop breaks

- [ ] **P2 · One Shot · 0.8 s · 3 variations**
- **Filename:** `world_ice_break_v01.wav` through `_v03.wav`
- **Current:** Synthesized — propIce.

**Used by:** `Current Sfx.propIce`, `Frozen soldier / traveler / miner`, `Ice prop`.

```text
One isolated 0.8-second sound effect: a thick frozen block cracking into bright brittle fragments with a short granular slide. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="world_chest"></a>

#### WORLD_CHEST — Wood chest or storage opening

- [ ] **P2 · One Shot · 1 s · 2 variations**
- **Filename:** `world_chest_v01.wav` through `_v02.wav`
- **Current:** Synthesized — chest.

**Used by:** `Chest / storage stash`, `Current Sfx.chest`, `Event ev_cache1`, `Event ev_cache2`, `Event ev_cache3`.

```text
One isolated 1-second sound effect: a stiff iron latch lifted and a heavy wooden chest lid creaking open. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="world_strongbox"></a>

#### WORLD_STRONGBOX — Strongbox opening

- [ ] **P2 · One Shot · 0.8 s · 3 variations**
- **Filename:** `world_strongbox_v01.wav` through `_v03.wav`
- **Current:** Shared — chest.

**Used by:** `Strongbox`.

```text
One isolated 0.8-second sound effect: a small iron lock snapping open and a heavy metal lid scraping back. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="world_search"></a>

#### WORLD_SEARCH — Search a corpse or frozen body

- [ ] **P2 · One Shot · 0.65 s · 3 variations**
- **Filename:** `world_search_v01.wav` through `_v03.wav`
- **Current:** Synthesized/shared — frozen bodies currently use propIce; cloth-search layer proposed.

**Used by:** `Frozen soldier / traveler / miner`.

```text
One isolated 0.65-second sound effect: gloved hands searching stiff clothing and a leather pouch, small cloth crackles and a subdued buckle tap. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="world_grave"></a>

#### WORLD_GRAVE — Search a disturbed grave

- [ ] **P2 · One Shot · 0.65 s · 3 variations**
- **Filename:** `world_grave_v01.wav` through `_v03.wav`
- **Current:** Synthesized/shared — graves currently use propStone; soil-search layer proposed.

**Used by:** `Disturbed grave`.

```text
One isolated 0.65-second sound effect: loose soil scraped aside with dry root crackles and a dull buried-stone knock. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="world_well"></a>

#### WORLD_WELL — Use a well or healing spring

- [ ] **P2 · One Shot · 0.8 s · 3 variations**
- **Filename:** `world_well_v01.wav` through `_v03.wav`
- **Current:** Shared — potion/shrine.

**Used by:** `Event ev_well1`, `Event ev_well2`, `Well / spring`.

```text
One isolated 0.8-second sound effect: clear water scooped from a stone basin, short liquid pour and a few delicate drops. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="world_shrine"></a>

#### WORLD_SHRINE — Attune shrine or receive a blessing

- [ ] **P2 · One Shot · 1.1 s · 2 variations**
- **Filename:** `world_shrine_v01.wav` through `_v02.wav`
- **Current:** Synthesized — shrine.

**Used by:** `Current Sfx.shrine`, `Event ev_bless0`, `Event ev_bless1`, `Event ev_bless10`, `Event ev_bless11`, `Event ev_bless12`, `Event ev_bless13`, `Event ev_bless14`, `Event ev_bless15`, `Event ev_bless16`, `Event ev_bless17`, `Event ev_bless18`, `Event ev_bless19`, `Event ev_bless2`, `Event ev_bless20`, `Event ev_bless21`, `Event ev_bless22`, `Event ev_bless23`, `Event ev_bless24`, `Event ev_bless25`, `Event ev_bless26`, `Event ev_bless27`, `Event ev_bless28`, `Event ev_bless29`, `Event ev_bless3`, `Event ev_bless4`, `Event ev_bless5`, `Event ev_bless6`, `Event ev_bless7`, `Event ev_bless8`, `Event ev_bless9`, `Shrine / travel shrine`.

```text
One isolated 1.1-second sound effect: old stone resonating under a brief airy pulse, low clear glass overtones fading gently. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="world_altar"></a>

#### WORLD_ALTAR — Cursed altar or reliquary activation

- [ ] **P2 · One Shot · 1.1 s · 2 variations**
- **Filename:** `world_altar_v01.wav` through `_v02.wav`
- **Current:** Shared — shrine/curse.

**Used by:** `Altar / reliquary`, `Event ev_curse1`, `Event ev_curse2`.

```text
One isolated 1.1-second sound effect: a heavy stone cavity opening with a low suction pulse and rough inner stone scrape. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="world_portal_open"></a>

#### WORLD_PORTAL_OPEN — Open a town portal

- [ ] **P1 · One Shot · 1.2 s · 2 variations**
- **Filename:** `world_portal_open_v01.wav` through `_v02.wav`
- **Current:** Recorded — interactions/portalOpen.wav.

**Used by:** `Current Sfx.portalOpen`, `Portal open / travel / close`, `Story cathedral2/hell_portal`.

```text
One isolated 1.2-second sound effect: a circular tear of rushing air opening with a tight low pressure crack and hollow resonance. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="world_travel"></a>

#### WORLD_TRAVEL — Complete portal or waystone travel

- [ ] **P1 · One Shot · 1 s · 2 variations**
- **Filename:** `world_travel_v01.wav` through `_v02.wav`
- **Current:** Recorded — interactions/teleportTravel.wav.

**Used by:** `Current Sfx.portal`, `Current Sfx.teleportTravel`, `Portal open / travel / close`.

```text
One isolated 1-second sound effect: a quick hollow air intake, a short rushing passage, then a soft grounded arrival thump. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="world_portal_close"></a>

#### WORLD_PORTAL_CLOSE — Portal closing or collapsing

- [ ] **P2 · One Shot · 0.75 s · 3 variations**
- **Filename:** `world_portal_close_v01.wav` through `_v03.wav`
- **Current:** Missing — dedicated close cue.

**Used by:** `Portal open / travel / close`.

```text
One isolated 0.75-second sound effect: an airy circular vortex shrinking into a short dry inward snap. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="world_door"></a>

#### WORLD_DOOR — Operational gate or heavy door transition

- [ ] **P2 · One Shot · 1.3 s · 2 variations**
- **Filename:** `world_door_v01.wav` through `_v02.wav`
- **Current:** Missing — only attach where a moving gate/door is actually shown.

**Used by:** `Moving heavy gate if animated`.

```text
One isolated 1.3-second sound effect: a heavy old timber gate opening on iron hinges, creak and chain drag with a final stop. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="world_waystone"></a>

#### WORLD_WAYSTONE — Unlock an act waystone

- [ ] **P2 · One Shot · 1.5 s · 2 variations**
- **Filename:** `world_waystone_v01.wav` through `_v02.wav`
- **Current:** Shared — shrine.

**Used by:** `Act waystone unlock`.

```text
One isolated 1.5-second sound effect: a buried stone mechanism unlocking with deep rock movement and a brief bright crystal pulse. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="world_beacon"></a>

#### WORLD_BEACON — Light an Oathsworn beacon

- [ ] **P2 · One Shot · 1.2 s · 2 variations**
- **Filename:** `world_beacon_v01.wav` through `_v02.wav`
- **Current:** Shared — shrine.

**Used by:** `Enemy beacon`, `Oathsworn beacons`.

```text
One isolated 1.2-second sound effect: a large brazier abruptly igniting under a resonant stone chime, dry flame roar. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="world_relay"></a>

#### WORLD_RELAY — Disable market shard relay

- [ ] **P2 · One Shot · 1.2 s · 2 variations**
- **Filename:** `world_relay_v01.wav` through `_v02.wav`
- **Current:** Shared — questProgress.

**Used by:** `Story underground_market/market_relay_0`, `Story underground_market/market_relay_1`, `Story underground_market/market_relay_2`.

```text
One isolated 1.2-second sound effect: a charged crystal machine winding down, irregular electrical crackle ending in a stone fracture. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="world_soul_release"></a>

#### WORLD_SOUL_RELEASE — Release a trapped cathedral soul

- [ ] **P2 · One Shot · 1.4 s · 2 variations**
- **Filename:** `world_soul_release_v01.wav` through `_v02.wav`
- **Current:** Shared — questProgress.

**Used by:** `Story cathedral1/trapped_soul_0`, `Story cathedral1/trapped_soul_1`, `Story cathedral1/trapped_soul_2`.

```text
One isolated 1.4-second sound effect: air pulling gently from stone, a nonverbal breath gaining freedom and fading upward. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="world_seal_break"></a>

#### WORLD_SEAL_BREAK — Break a Quieting seal or binding

- [ ] **P2 · One Shot · 1 s · 2 variations**
- **Filename:** `world_seal_break_v01.wav` through `_v02.wav`
- **Current:** Shared — questProgress.

**Used by:** `Story cathedral2/quieting_seal_0`, `Story cathedral2/quieting_seal_1`, `Story cathedral2/quieting_seal_2`, `Story sand_tombs/imprisoned_scholar`.

```text
One isolated 1-second sound effect: a taut magical seal cracking like glass with an abrupt hollow pressure release. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="world_shard"></a>

#### WORLD_SHARD — Recover an Embershard or sword fragment

- [ ] **P2 · One Shot · 0.8 s · 3 variations**
- **Filename:** `world_shard_v01.wav` through `_v03.wav`
- **Current:** Shared — questProgress/pickup.

**Used by:** `Event ev_glyph`, `Opening fallen-guard awakening`, `Story cathedral2/sword_piece_0`, `Story cathedral2/sword_piece_1`, `Story cathedral2/sword_piece_2`, `Story ritual_site/mire_shard`.

```text
One isolated 0.8-second sound effect: a small stone relic lifted with dry grit, brief restrained crystalline resonance. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="world_map"></a>

#### WORLD_MAP — Recover a map, posting or lore document

- [ ] **P2 · One Shot · 0.65 s · 3 variations**
- **Filename:** `world_map_v01.wav` through `_v03.wav`
- **Current:** Shared — questProgress/click.

**Used by:** `Story khal_palace/fortress_map`, `Town quest board / map / document`.

```text
One isolated 0.65-second sound effect: brittle parchment lifted and unfolded, dry paper crackles without a magical tone. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="world_ritual_break"></a>

#### WORLD_RITUAL_BREAK — Destroy a ritual site

- [ ] **P2 · One Shot · 1.5 s · 2 variations**
- **Filename:** `world_ritual_break_v01.wav` through `_v02.wav`
- **Current:** Shared — shrine/vox_boss.

**Used by:** `Enemy drowned_ritual`, `Enemy quieting_ritual`, `Quieting and drowned ritual destruction`.

```text
One isolated 1.5-second sound effect: resonant ritual stones cracking in succession with a low nonverbal air implosion. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="world_ambush"></a>

#### WORLD_AMBUSH — Enemy den, nest, barrow or sigil activates

- [ ] **P2 · One Shot · 1 s · 2 variations**
- **Filename:** `world_ambush_v01.wav` through `_v02.wav`
- **Current:** Shared — shrine/vox_boss.

**Used by:** `Event ev_amb0`, `Event ev_amb1`, `Event ev_amb2`, `Event ev_amb3`, `Event ev_amb4`, `Event ev_amb5`.

```text
One isolated 1-second sound effect: earth and brittle roots suddenly breaking open with a short ominous breath burst. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="world_goblin"></a>

#### WORLD_GOBLIN — Treasure creature alert or escape

- [ ] **P2 · One Shot · 0.9 s · 3 variations**
- **Filename:** `world_goblin_v01.wav` through `_v03.wav`
- **Current:** Shared — generic enemy voice; dedicated treasure cue proposed.

**Used by:** `Event ev_gob1`, `Event ev_gob2`.

```text
One isolated 0.9-second sound effect: small frantic claw steps and excited nonverbal chattering with a coin-pouch jingle. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="bank-status-and-conditional-effects"></a>

### Status and conditional effects

<a id="status_fire"></a>

#### STATUS_FIRE — Burn applied or fiery hit

- [ ] **P2 · One Shot · 0.45 s · 3 variations**
- **Filename:** `status_fire_v01.wav` through `_v03.wav`
- **Current:** Shared — elemental/skill materials; dedicated condition accent proposed.

**Used by:** `Elite flamewreathed`, `Hazard lava`, `Hazard scorch`, `Slow, chill, burning, bleed and critical contact`.

```text
One isolated 0.45-second sound effect: a brief scorching hiss and a few dry flame snaps. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="status_frozen"></a>

#### STATUS_FROZEN — Freeze applied or brittle frozen body shatter

- [ ] **P2 · One Shot · 0.45 s · 3 variations**
- **Filename:** `status_frozen_v01.wav` through `_v03.wav`
- **Current:** Shared — elemental/skill materials; dedicated condition accent proposed.

**Used by:** `Elite frostbound`, `Enemy frost_wraith`, `Enemy hoarfang`, `Enemy ice_lurker`, `Enemy r26_brute`, `Enemy r35_ooze`, `Enemy r44_imp`, `Enemy r52_brute`, `Enemy r61_wraith`, `Enemy r70_knight`, `Enemy rimebound_guardian`, `Slow, chill, burning, bleed and critical contact`.

```text
One isolated 0.45-second sound effect: a rapid crust of ice forming with tiny fractures and a crisp final snap. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="status_poison"></a>

#### STATUS_POISON — Poison applied

- [ ] **P2 · One Shot · 0.45 s · 3 variations**
- **Filename:** `status_poison_v01.wav` through `_v03.wav`
- **Current:** Shared — elemental/skill materials; dedicated condition accent proposed.

**Used by:** `Elite venomous`, `Enemy blight_treant`, `Enemy blight_wasp`, `Enemy bog_bloat`, `Enemy brood_mother`, `Enemy caustic_ooze`, `Enemy cave_python`, `Enemy crypt_widow`, `Enemy dune_serpent`, `Enemy fen_stalker`, `Enemy marsh_larvae`, `Enemy marsh_serpent`, `Enemy marsh_wretch`, `Enemy r13_spider`, `Enemy r19_skeleton`, `Enemy r1_human`, `Enemy r31_brute`, `Enemy r40_ooze`, `Enemy r49_imp`, `Enemy r58_imp`, `Enemy r67_brute`, `Enemy r78_brute`, `Enemy r7_ooze`, `Enemy r85_wraith`, `Enemy r92_treant`, `Enemy r99_warlord`, `Enemy sludge_horror`, `Hazard spore`.

```text
One isolated 0.45-second sound effect: one wet corrosive spit contact and small fizzing bubbles. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="status_bleed"></a>

#### STATUS_BLEED — Bleed or exposed wound applied

- [ ] **P2 · One Shot · 0.45 s · 3 variations**
- **Filename:** `status_bleed_v01.wav` through `_v03.wav`
- **Current:** Shared — elemental/skill materials; dedicated condition accent proposed.

**Used by:** `Slow, chill, burning, bleed and critical contact`, `Unique powers and glyph combinations`.

```text
One isolated 0.45-second sound effect: a short close wet tear with a quiet strained breath. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="status_stun"></a>

#### STATUS_STUN — Stun applied

- [ ] **P2 · One Shot · 0.45 s · 3 variations**
- **Filename:** `status_stun_v01.wav` through `_v03.wav`
- **Current:** Shared — elemental/skill materials; dedicated condition accent proposed.

**Used by:** `Affliction onset/expiry`.

```text
One isolated 0.45-second sound effect: a compact heavy wood knock with a short muffled inner-head resonance. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="status_root"></a>

#### STATUS_ROOT — Root or dragnet catches a target

- [ ] **P2 · One Shot · 0.45 s · 3 variations**
- **Filename:** `status_root_v01.wav` through `_v03.wav`
- **Current:** Shared — elemental/skill materials; dedicated condition accent proposed.

**Used by:** `Affliction onset/expiry`, `Unique powers and glyph combinations`.

```text
One isolated 0.45-second sound effect: woody tendrils and taut rope tightening suddenly with dry fibers creaking. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="status_fear"></a>

#### STATUS_FEAR — Fear applied

- [ ] **P2 · One Shot · 0.45 s · 3 variations**
- **Filename:** `status_fear_v01.wav` through `_v03.wav`
- **Current:** Shared — elemental/skill materials; dedicated condition accent proposed.

**Used by:** `Affliction onset/expiry`.

```text
One isolated 0.45-second sound effect: a sudden short cold inward breath with a thin nonverbal tremor. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="status_curse"></a>

#### STATUS_CURSE — Doom, frailty, withering or killing mark applied

- [ ] **P2 · One Shot · 0.45 s · 3 variations**
- **Filename:** `status_curse_v01.wav` through `_v03.wav`
- **Current:** Shared — elemental/skill materials; dedicated condition accent proposed.

**Used by:** `Affliction onset/expiry`.

```text
One isolated 0.45-second sound effect: a low hollow exhale collapsing into a rough air tick. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="status_dispel"></a>

#### STATUS_DISPEL — Ward or affliction expires or is removed

- [ ] **P2 · One Shot · 0.45 s · 3 variations**
- **Filename:** `status_dispel_v01.wav` through `_v03.wav`
- **Current:** Shared — elemental/skill materials; dedicated condition accent proposed.

**Used by:** `Affliction onset/expiry`, `Elite warded`, `Skill dread_muster`, `Skill feral_howl`, `Skill gravebinder_0_4`, `Skill rimeguard`, `Skill stormshell`, `Skill vanguard_0_2`, `Skill vanguard_0_4`, `Skill vanguard_0_5`, `Skill vanguard_1_2`, `Skill vanguard_1_5`, `Unique powers and glyph combinations`.

```text
One isolated 0.45-second sound effect: a restrained thin glass shell dissolving into fine air and silence. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="status_drain"></a>

#### STATUS_DRAIN — Successful life or soul drain

- [ ] **P2 · One Shot · 0.45 s · 3 variations**
- **Filename:** `status_drain_v01.wav` through `_v03.wav`
- **Current:** Shared — elemental/skill materials; dedicated condition accent proposed.

**Used by:** `Act IV profile soul_eater`, `Elite vampiric`, `Unique powers and glyph combinations`.

```text
One isolated 0.45-second sound effect: a quick wet airy suction passing from one point to another, short hollow ending. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="bank-sustained-gameplay-effects"></a>

### Sustained gameplay effects

<a id="loop_fire"></a>

#### LOOP_FIRE — fire emitter sustain

- [ ] **P2 · Loop · 8 s · 2 variations**
- **Filename:** `loop_fire_v01.wav` through `_v02.wav`
- **Current:** Shared — current skills loop short material cuts; purpose-built loop proposed.

**Used by:** `Skill emberwitch_0_3`, `Skill emberwitch_0_6`.

```text
8-second seamless nonmusical ambience loop: close sustained flame combustion, dry crackles and a soft continuous fire rush. Steady level, natural irregular detail, matching beginning and end, no opening hit or closing fade. Dark ambient horror game sound design. No music, melody, beat, intelligible words, or added cinematic score.
```

<a id="loop_frost"></a>

#### LOOP_FROST — frost emitter sustain

- [ ] **P2 · Loop · 8 s · 2 variations**
- **Filename:** `loop_frost_v01.wav` through `_v02.wav`
- **Current:** Shared — current skills loop short material cuts; purpose-built loop proposed.

**Used by:** `Skill emberwitch_1_6`.

```text
8-second seamless nonmusical ambience loop: slow moving ice under tension, delicate frost grains and restrained cold air. Steady level, natural irregular detail, matching beginning and end, no opening hit or closing fade. Dark ambient horror game sound design. No music, melody, beat, intelligible words, or added cinematic score.
```

<a id="loop_storm"></a>

#### LOOP_STORM — storm emitter sustain

- [ ] **P2 · Loop · 8 s · 2 variations**
- **Filename:** `loop_storm_v01.wav` through `_v02.wav`
- **Current:** Shared — current skills loop short material cuts; purpose-built loop proposed.

**Used by:** `Hazard static`, `Skill emberwitch_2_3`, `Skill emberwitch_2_5`.

```text
8-second seamless nonmusical ambience loop: a contained electrical field, irregular fine crackling and a low nonpitched static bed. Steady level, natural irregular detail, matching beginning and end, no opening hit or closing fade. Dark ambient horror game sound design. No music, melody, beat, intelligible words, or added cinematic score.
```

<a id="loop_hex"></a>

#### LOOP_HEX — hex emitter sustain

- [ ] **P2 · Loop · 8 s · 2 variations**
- **Filename:** `loop_hex_v01.wav` through `_v02.wav`
- **Current:** Shared — current skills loop short material cuts; purpose-built loop proposed.

**Used by:** `Skill gravebinder_1_5`.

```text
8-second seamless nonmusical ambience loop: a hollow breath-like current being pulled through a narrow dark opening, no actual speech. Steady level, natural irregular detail, matching beginning and end, no opening hit or closing fade. Dark ambient horror game sound design. No music, melody, beat, intelligible words, or added cinematic score.
```

<a id="loop_poison"></a>

#### LOOP_POISON — poison emitter sustain

- [ ] **P2 · Loop · 8 s · 2 variations**
- **Filename:** `loop_poison_v01.wav` through `_v02.wav`
- **Current:** Shared — current skills loop short material cuts; purpose-built loop proposed.

**Used by:** `Skill gravebinder_2_2`.

```text
8-second seamless nonmusical ambience loop: a low thick bubbling toxic vapor bed with restrained wet fizz. Steady level, natural irregular detail, matching beginning and end, no opening hit or closing fade. Dark ambient horror game sound design. No music, melody, beat, intelligible words, or added cinematic score.
```

<a id="loop_wind"></a>

#### LOOP_WIND — wind emitter sustain

- [ ] **P2 · Loop · 8 s · 2 variations**
- **Filename:** `loop_wind_v01.wav` through `_v02.wav`
- **Current:** Shared — current skills loop short material cuts; purpose-built loop proposed.

**Used by:** `Skill wildkeeper_1_3`.

```text
8-second seamless nonmusical ambience loop: a compact circling wind current with steady air pressure and irregular eddies. Steady level, natural irregular detail, matching beginning and end, no opening hit or closing fade. Dark ambient horror game sound design. No music, melody, beat, intelligible words, or added cinematic score.
```

<a id="loop_draw"></a>

#### LOOP_DRAW — draw emitter sustain

- [ ] **P2 · Loop · 8 s · 2 variations**
- **Filename:** `loop_draw_v01.wav` through `_v02.wav`
- **Current:** Shared — current skills loop short material cuts; purpose-built loop proposed.

**Used by:** `Skill veilranger_0_2`.

```text
8-second seamless nonmusical ambience loop: a bow held under tension, very quiet intermittent wood strain and taut string fiber friction. Steady level, natural irregular detail, matching beginning and end, no opening hit or closing fade. Dark ambient horror game sound design. No music, melody, beat, intelligible words, or added cinematic score.
```

<a id="loop_earth"></a>

#### LOOP_EARTH — earth emitter sustain

- [ ] **P2 · Loop · 8 s · 2 variations**
- **Filename:** `loop_earth_v01.wav` through `_v02.wav`
- **Current:** Shared — current skills loop short material cuts; purpose-built loop proposed.

**Used by:** `Skill wildkeeper_1_5`.

```text
8-second seamless nonmusical ambience loop: distant low rock movement with soft gravel friction, controlled bass. Steady level, natural irregular detail, matching beginning and end, no opening hit or closing fade. Dark ambient horror game sound design. No music, melody, beat, intelligible words, or added cinematic score.
```

<a id="loop_portal"></a>

#### LOOP_PORTAL — portal emitter sustain

- [ ] **P2 · Loop · 8 s · 2 variations**
- **Filename:** `loop_portal_v01.wav` through `_v02.wav`
- **Current:** Missing — portal ambience loop.

**Used by:** `Enemy boss_portal`, `Portal open / travel / close`.

```text
8-second seamless nonmusical ambience loop: an open air vortex with a low hollow rushing interior and tiny irregular crackles. Steady level, natural irregular detail, matching beginning and end, no opening hit or closing fade. Dark ambient horror game sound design. No music, melody, beat, intelligible words, or added cinematic score.
```

<a id="bank-enemy-and-companion-voices"></a>

### Enemy and companion voices

<a id="vox_bone_alert"></a>

#### VOX_BONE_ALERT — bone family alert

- [ ] **P2 · One Shot · 0.85 s · 3 variations**
- **Filename:** `vox_bone_alert_v01.wav` through `_v03.wav`
- **Current:** Synthesized/shared — vox_* alert and die_bone/die_flesh death; dedicated family recording absent.

**Used by:** `Companion bone_golem`, `Companion skel_mage`, `Companion skel_warrior`, `Current Sfx.vox_bone`, `Enemy azram`, `Enemy bone_archer`, `Enemy bone_dragon`, `Enemy chained_sovereign`, `Enemy frost_archer`, `Enemy frost_watch_captain`, `Enemy gilded_thrall`, `Enemy korvath_echo`, `Enemy morthul`, `Enemy r14_skeleton`, `Enemy r24_skeleton`, `Enemy r37_skeleton`, `Enemy r42_skeleton`, `Enemy r47_skeleton`, `Enemy r4_skeleton`, `Enemy r79_warlord`, `Enemy r84_warlord`, `Enemy r89_warlord`, `Enemy r94_warlord`, `Enemy r99_warlord`, `Enemy r9_skeleton`, `Enemy rimebound_guardian`, `Enemy shard_sentinel`, `Opening captain reinforcement arrivals`.

```text
One isolated 0.85-second sound effect: a dry skeletal undead making hollow jaw rattles and a rasp of air. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="vox_bone_hurt"></a>

#### VOX_BONE_HURT — bone family hurt

- [ ] **P2 · One Shot · 0.4 s · 3 variations**
- **Filename:** `vox_bone_hurt_v01.wav` through `_v03.wav`
- **Current:** Missing — dedicated enemy vocal injury; current damage feedback is shared contact audio.

**Used by:** `Companion bone_golem`, `Companion skel_mage`, `Companion skel_warrior`, `Enemy azram`, `Enemy bone_archer`, `Enemy bone_dragon`, `Enemy chained_sovereign`, `Enemy frost_archer`, `Enemy frost_watch_captain`, `Enemy gilded_thrall`, `Enemy korvath_echo`, `Enemy morthul`, `Enemy r14_skeleton`, `Enemy r24_skeleton`, `Enemy r37_skeleton`, `Enemy r42_skeleton`, `Enemy r47_skeleton`, `Enemy r4_skeleton`, `Enemy r79_warlord`, `Enemy r84_warlord`, `Enemy r89_warlord`, `Enemy r94_warlord`, `Enemy r99_warlord`, `Enemy r9_skeleton`, `Enemy rimebound_guardian`, `Enemy shard_sentinel`.

```text
One isolated 0.4-second sound effect: a dry skeletal undead making a sharp jaw clack and brittle gasp. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="vox_bone_death"></a>

#### VOX_BONE_DEATH — bone family death

- [ ] **P2 · One Shot · 1.25 s · 2 variations**
- **Filename:** `vox_bone_death_v01.wav` through `_v02.wav`
- **Current:** Synthesized/shared — vox_* alert and die_bone/die_flesh death; dedicated family recording absent.

**Used by:** `Companion bone_golem`, `Companion skel_mage`, `Companion skel_warrior`, `Current Sfx.die_bone`, `Enemy azram`, `Enemy bone_archer`, `Enemy bone_dragon`, `Enemy chained_sovereign`, `Enemy frost_archer`, `Enemy frost_watch_captain`, `Enemy gilded_thrall`, `Enemy korvath_echo`, `Enemy morthul`, `Enemy r14_skeleton`, `Enemy r24_skeleton`, `Enemy r37_skeleton`, `Enemy r42_skeleton`, `Enemy r47_skeleton`, `Enemy r4_skeleton`, `Enemy r79_warlord`, `Enemy r84_warlord`, `Enemy r89_warlord`, `Enemy r94_warlord`, `Enemy r99_warlord`, `Enemy r9_skeleton`, `Enemy rimebound_guardian`, `Enemy shard_sentinel`.

```text
One isolated 1.25-second sound effect: a dry skeletal undead making bones collapsing with a dry last rasp. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="vox_husk_alert"></a>

#### VOX_HUSK_ALERT — husk family alert

- [ ] **P2 · One Shot · 0.85 s · 3 variations**
- **Filename:** `vox_husk_alert_v01.wav` through `_v03.wav`
- **Current:** Synthesized/shared — vox_* alert and die_bone/die_flesh death; dedicated family recording absent.

**Used by:** `Enemy drowned_dead`, `Enemy frost_risen`, `Enemy r19_skeleton`, `Enemy r27_skeleton`, `Enemy r32_skeleton`, `Enemy risen`, `Enemy tomb_husk`.

```text
One isolated 0.85-second sound effect: a rotten walking corpse making wet ragged throat groan with labored breath. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="vox_husk_hurt"></a>

#### VOX_HUSK_HURT — husk family hurt

- [ ] **P2 · One Shot · 0.4 s · 3 variations**
- **Filename:** `vox_husk_hurt_v01.wav` through `_v03.wav`
- **Current:** Missing — dedicated enemy vocal injury; current damage feedback is shared contact audio.

**Used by:** `Enemy drowned_dead`, `Enemy frost_risen`, `Enemy r19_skeleton`, `Enemy r27_skeleton`, `Enemy r32_skeleton`, `Enemy risen`, `Enemy tomb_husk`.

```text
One isolated 0.4-second sound effect: a rotten walking corpse making a compact wet choking grunt. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="vox_husk_death"></a>

#### VOX_HUSK_DEATH — husk family death

- [ ] **P2 · One Shot · 1.25 s · 2 variations**
- **Filename:** `vox_husk_death_v01.wav` through `_v02.wav`
- **Current:** Synthesized/shared — vox_* alert and die_bone/die_flesh death; dedicated family recording absent.

**Used by:** `Current Sfx.die_flesh`, `Enemy drowned_dead`, `Enemy frost_risen`, `Enemy r19_skeleton`, `Enemy r27_skeleton`, `Enemy r32_skeleton`, `Enemy risen`, `Enemy tomb_husk`.

```text
One isolated 1.25-second sound effect: a rotten walking corpse making a failing hollow moan and a heavy limp collapse. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="vox_human_alert"></a>

#### VOX_HUMAN_ALERT — human family alert

- [ ] **P2 · One Shot · 0.85 s · 3 variations**
- **Filename:** `vox_human_alert_v01.wav` through `_v03.wav`
- **Current:** Synthesized/shared — vox_* alert and die_bone/die_flesh death; dedicated family recording absent.

**Used by:** `Current Sfx.vox_human`, `Enemy cult_acolyte`, `Enemy cult_zealot`, `Enemy gravecaller`, `Enemy r11_human`, `Enemy r16_human`, `Enemy r1_human`, `Enemy r21_human`, `Enemy r33_robed`, `Enemy r38_robed`, `Enemy r43_robed`, `Enemy r48_robed`, `Enemy r54_robed`, `Enemy r59_robed`, `Enemy r64_robed`, `Enemy r69_robed`, `Enemy r6_human`, `Enemy r74_robed`, `Enemy sand_raider`, `Enemy shard_thrall`, `Enemy vethriss`, `Enemy vicar`.

```text
One isolated 0.85-second sound effect: an exhausted hostile adult human making a harsh nonverbal challenge exhaled through clenched teeth. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="vox_human_hurt"></a>

#### VOX_HUMAN_HURT — human family hurt

- [ ] **P2 · One Shot · 0.4 s · 3 variations**
- **Filename:** `vox_human_hurt_v01.wav` through `_v03.wav`
- **Current:** Missing — dedicated enemy vocal injury; current damage feedback is shared contact audio.

**Used by:** `Enemy cult_acolyte`, `Enemy cult_zealot`, `Enemy gravecaller`, `Enemy r11_human`, `Enemy r16_human`, `Enemy r1_human`, `Enemy r21_human`, `Enemy r33_robed`, `Enemy r38_robed`, `Enemy r43_robed`, `Enemy r48_robed`, `Enemy r54_robed`, `Enemy r59_robed`, `Enemy r64_robed`, `Enemy r69_robed`, `Enemy r6_human`, `Enemy r74_robed`, `Enemy sand_raider`, `Enemy shard_thrall`, `Enemy vethriss`, `Enemy vicar`.

```text
One isolated 0.4-second sound effect: an exhausted hostile adult human making a restrained rough pain grunt. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="vox_human_death"></a>

#### VOX_HUMAN_DEATH — human family death

- [ ] **P2 · One Shot · 1.25 s · 2 variations**
- **Filename:** `vox_human_death_v01.wav` through `_v02.wav`
- **Current:** Synthesized/shared — vox_* alert and die_bone/die_flesh death; dedicated family recording absent.

**Used by:** `Enemy cult_acolyte`, `Enemy cult_zealot`, `Enemy gravecaller`, `Enemy r11_human`, `Enemy r16_human`, `Enemy r1_human`, `Enemy r21_human`, `Enemy r33_robed`, `Enemy r38_robed`, `Enemy r43_robed`, `Enemy r48_robed`, `Enemy r54_robed`, `Enemy r59_robed`, `Enemy r64_robed`, `Enemy r69_robed`, `Enemy r6_human`, `Enemy r74_robed`, `Enemy sand_raider`, `Enemy shard_thrall`, `Enemy vicar`.

```text
One isolated 1.25-second sound effect: an exhausted hostile adult human making a short failing cry and breath leaving the chest. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="vox_brute_alert"></a>

#### VOX_BRUTE_ALERT — brute family alert

- [ ] **P2 · One Shot · 0.85 s · 3 variations**
- **Filename:** `vox_brute_alert_v01.wav` through `_v03.wav`
- **Current:** Synthesized/shared — vox_* alert and die_bone/die_flesh death; dedicated family recording absent.

**Used by:** `Act IV profile soul_eater`, `Current Sfx.vox_boss`, `Current Sfx.vox_brute`, `Enemy ash_fiend`, `Enemy ashfiend_reaver`, `Enemy azram_echo`, `Enemy barb_axe`, `Enemy barb_guard`, `Enemy barb_pole`, `Enemy barb_sword`, `Enemy bog_bloat`, `Enemy brimstone_brute`, `Enemy brood_mother`, `Enemy fen_stalker`, `Enemy flesh_engine`, `Enemy frost_wyrm`, `Enemy glacial_crawler`, `Enemy infernal_warlord`, `Enemy korvath`, `Enemy malthoron_echo`, `Enemy mire_mother`, `Enemy pit_brute`, `Enemy r26_brute`, `Enemy r31_brute`, `Enemy r36_brute`, `Enemy r41_brute`, `Enemy r46_brute`, `Enemy r52_brute`, `Enemy r57_brute`, `Enemy r62_brute`, `Enemy r67_brute`, `Enemy r72_brute`, `Enemy r78_brute`, `Enemy r83_brute`, `Enemy r88_brute`, `Enemy r93_brute`, `Enemy r98_brute`, `Enemy vellath`, `Enemy wretch_lord`.

```text
One isolated 0.85-second sound effect: a huge muscular monster making a low guttural chest bellow. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="vox_brute_hurt"></a>

#### VOX_BRUTE_HURT — brute family hurt

- [ ] **P2 · One Shot · 0.4 s · 3 variations**
- **Filename:** `vox_brute_hurt_v01.wav` through `_v03.wav`
- **Current:** Missing — dedicated enemy vocal injury; current damage feedback is shared contact audio.

**Used by:** `Enemy ash_fiend`, `Enemy ashfiend_reaver`, `Enemy azram_echo`, `Enemy barb_axe`, `Enemy barb_guard`, `Enemy barb_pole`, `Enemy barb_sword`, `Enemy bog_bloat`, `Enemy brimstone_brute`, `Enemy brood_mother`, `Enemy fen_stalker`, `Enemy flesh_engine`, `Enemy frost_wyrm`, `Enemy glacial_crawler`, `Enemy infernal_warlord`, `Enemy korvath`, `Enemy malthoron_echo`, `Enemy mire_mother`, `Enemy pit_brute`, `Enemy r26_brute`, `Enemy r31_brute`, `Enemy r36_brute`, `Enemy r41_brute`, `Enemy r46_brute`, `Enemy r52_brute`, `Enemy r57_brute`, `Enemy r62_brute`, `Enemy r67_brute`, `Enemy r72_brute`, `Enemy r78_brute`, `Enemy r83_brute`, `Enemy r88_brute`, `Enemy r93_brute`, `Enemy r98_brute`, `Enemy vellath`, `Enemy wretch_lord`.

```text
One isolated 0.4-second sound effect: a huge muscular monster making a rough deep pained bark. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="vox_brute_death"></a>

#### VOX_BRUTE_DEATH — brute family death

- [ ] **P2 · One Shot · 1.25 s · 2 variations**
- **Filename:** `vox_brute_death_v01.wav` through `_v02.wav`
- **Current:** Synthesized/shared — vox_* alert and die_bone/die_flesh death; dedicated family recording absent.

**Used by:** `Enemy ash_fiend`, `Enemy ashfiend_reaver`, `Enemy azram_echo`, `Enemy barb_axe`, `Enemy barb_guard`, `Enemy barb_pole`, `Enemy barb_sword`, `Enemy bog_bloat`, `Enemy brimstone_brute`, `Enemy brood_mother`, `Enemy fen_stalker`, `Enemy flesh_engine`, `Enemy frost_wyrm`, `Enemy glacial_crawler`, `Enemy infernal_warlord`, `Enemy korvath`, `Enemy malthoron_echo`, `Enemy mire_mother`, `Enemy pit_brute`, `Enemy r26_brute`, `Enemy r31_brute`, `Enemy r36_brute`, `Enemy r41_brute`, `Enemy r46_brute`, `Enemy r52_brute`, `Enemy r57_brute`, `Enemy r62_brute`, `Enemy r67_brute`, `Enemy r72_brute`, `Enemy r78_brute`, `Enemy r83_brute`, `Enemy r88_brute`, `Enemy r93_brute`, `Enemy r98_brute`, `Enemy vellath`, `Enemy wretch_lord`.

```text
One isolated 1.25-second sound effect: a huge muscular monster making a strained deep roar collapsing into an exhausted exhale. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="vox_hound_alert"></a>

#### VOX_HOUND_ALERT — hound family alert

- [ ] **P2 · One Shot · 0.85 s · 3 variations**
- **Filename:** `vox_hound_alert_v01.wav` through `_v03.wav`
- **Current:** Synthesized/shared — vox_* alert and die_bone/die_flesh death; dedicated family recording absent.

**Used by:** `Companion wolf`, `Current Sfx.vox_beast`, `Enemy cinder_hound`, `Enemy grave_hound`, `Enemy hoarfang`, `Enemy ice_lurker`, `Enemy r0_hound`, `Enemy r10_hound`, `Enemy r15_hound`, `Enemy r20_hound`, `Enemy r5_hound`, `Enemy soul_eater`.

```text
One isolated 0.85-second sound effect: a large feral wolf-like hound making a threatening growl and one rough bark. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="vox_hound_hurt"></a>

#### VOX_HOUND_HURT — hound family hurt

- [ ] **P2 · One Shot · 0.4 s · 3 variations**
- **Filename:** `vox_hound_hurt_v01.wav` through `_v03.wav`
- **Current:** Missing — dedicated enemy vocal injury; current damage feedback is shared contact audio.

**Used by:** `Companion wolf`, `Enemy cinder_hound`, `Enemy grave_hound`, `Enemy hoarfang`, `Enemy ice_lurker`, `Enemy r0_hound`, `Enemy r10_hound`, `Enemy r15_hound`, `Enemy r20_hound`, `Enemy r5_hound`, `Enemy soul_eater`.

```text
One isolated 0.4-second sound effect: a large feral wolf-like hound making a short animal pain yelp. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="vox_hound_death"></a>

#### VOX_HOUND_DEATH — hound family death

- [ ] **P2 · One Shot · 1.25 s · 2 variations**
- **Filename:** `vox_hound_death_v01.wav` through `_v02.wav`
- **Current:** Synthesized/shared — vox_* alert and die_bone/die_flesh death; dedicated family recording absent.

**Used by:** `Companion wolf`, `Enemy cinder_hound`, `Enemy grave_hound`, `Enemy hoarfang`, `Enemy ice_lurker`, `Enemy r0_hound`, `Enemy r10_hound`, `Enemy r15_hound`, `Enemy r20_hound`, `Enemy r5_hound`, `Enemy soul_eater`.

```text
One isolated 1.25-second sound effect: a large feral wolf-like hound making a brief weakened whine and last breath. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="vox_serpent_alert"></a>

#### VOX_SERPENT_ALERT — serpent family alert

- [ ] **P2 · One Shot · 0.85 s · 3 variations**
- **Filename:** `vox_serpent_alert_v01.wav` through `_v03.wav`
- **Current:** Synthesized/shared — vox_* alert and die_bone/die_flesh death; dedicated family recording absent.

**Used by:** `Enemy cave_python`, `Enemy dune_serpent`, `Enemy marsh_serpent`, `Enemy vethriss`.

```text
One isolated 0.85-second sound effect: a giant scaled serpent making a coarse threatening hiss with a low throat rasp. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="vox_serpent_hurt"></a>

#### VOX_SERPENT_HURT — serpent family hurt

- [ ] **P2 · One Shot · 0.4 s · 3 variations**
- **Filename:** `vox_serpent_hurt_v01.wav` through `_v03.wav`
- **Current:** Missing — dedicated enemy vocal injury; current damage feedback is shared contact audio.

**Used by:** `Enemy cave_python`, `Enemy dune_serpent`, `Enemy marsh_serpent`, `Enemy vethriss`.

```text
One isolated 0.4-second sound effect: a giant scaled serpent making a clipped sharp hiss. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="vox_serpent_death"></a>

#### VOX_SERPENT_DEATH — serpent family death

- [ ] **P2 · One Shot · 1.25 s · 2 variations**
- **Filename:** `vox_serpent_death_v01.wav` through `_v02.wav`
- **Current:** Synthesized/shared — vox_* alert and die_bone/die_flesh death; dedicated family recording absent.

**Used by:** `Enemy cave_python`, `Enemy dune_serpent`, `Enemy marsh_serpent`, `Enemy vethriss`.

```text
One isolated 1.25-second sound effect: a giant scaled serpent making a long deflating hiss with a dry scale scrape. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="vox_insect_alert"></a>

#### VOX_INSECT_ALERT — insect family alert

- [ ] **P2 · One Shot · 0.85 s · 3 variations**
- **Filename:** `vox_insect_alert_v01.wav` through `_v03.wav`
- **Current:** Synthesized/shared — vox_* alert and die_bone/die_flesh death; dedicated family recording absent.

**Used by:** `Current Sfx.vox_insect`, `Enemy blight_wasp`, `Enemy crypt_widow`, `Enemy marsh_larvae`, `Enemy marsh_wretch`, `Enemy r13_spider`, `Enemy r18_spider`, `Enemy r23_spider`, `Enemy r3_spider`, `Enemy r8_spider`, `Enemy shatter_wasp`.

```text
One isolated 0.85-second sound effect: a large chitinous insect making irregular mandible clicks and a dry rasp. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="vox_insect_hurt"></a>

#### VOX_INSECT_HURT — insect family hurt

- [ ] **P2 · One Shot · 0.4 s · 3 variations**
- **Filename:** `vox_insect_hurt_v01.wav` through `_v03.wav`
- **Current:** Missing — dedicated enemy vocal injury; current damage feedback is shared contact audio.

**Used by:** `Enemy blight_wasp`, `Enemy crypt_widow`, `Enemy marsh_larvae`, `Enemy marsh_wretch`, `Enemy r13_spider`, `Enemy r18_spider`, `Enemy r23_spider`, `Enemy r3_spider`, `Enemy r8_spider`, `Enemy shatter_wasp`.

```text
One isolated 0.4-second sound effect: a large chitinous insect making a short brittle chitter. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="vox_insect_death"></a>

#### VOX_INSECT_DEATH — insect family death

- [ ] **P2 · One Shot · 1.25 s · 2 variations**
- **Filename:** `vox_insect_death_v01.wav` through `_v02.wav`
- **Current:** Synthesized/shared — vox_* alert and die_bone/die_flesh death; dedicated family recording absent.

**Used by:** `Enemy blight_wasp`, `Enemy crypt_widow`, `Enemy marsh_larvae`, `Enemy marsh_wretch`, `Enemy r13_spider`, `Enemy r18_spider`, `Enemy r23_spider`, `Enemy r3_spider`, `Enemy r8_spider`, `Enemy shatter_wasp`.

```text
One isolated 1.25-second sound effect: a large chitinous insect making a brittle shell crunch with a fading chitter. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="vox_metal_alert"></a>

#### VOX_METAL_ALERT — metal family alert

- [ ] **P2 · One Shot · 0.85 s · 3 variations**
- **Filename:** `vox_metal_alert_v01.wav` through `_v03.wav`
- **Current:** Synthesized/shared — vox_* alert and die_bone/die_flesh death; dedicated family recording absent.

**Used by:** `Current Sfx.vox_metal`, `Enemy fallen_blade`, `Enemy hollow_knight`, `Enemy impaler`, `Enemy malthoron`, `Enemy r50_knight`, `Enemy r55_knight`, `Enemy r60_knight`, `Enemy r65_knight`, `Enemy r70_knight`, `Enemy r76_knight`, `Enemy r81_knight`, `Enemy r86_knight`, `Enemy r91_knight`, `Enemy r96_knight`, `Enemy tomb_guard`.

```text
One isolated 0.85-second sound effect: a hollow armored revenant making rusted metal scraping around a trapped breath-like resonance. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="vox_metal_hurt"></a>

#### VOX_METAL_HURT — metal family hurt

- [ ] **P2 · One Shot · 0.4 s · 3 variations**
- **Filename:** `vox_metal_hurt_v01.wav` through `_v03.wav`
- **Current:** Missing — dedicated enemy vocal injury; current damage feedback is shared contact audio.

**Used by:** `Enemy fallen_blade`, `Enemy hollow_knight`, `Enemy impaler`, `Enemy malthoron`, `Enemy r50_knight`, `Enemy r55_knight`, `Enemy r60_knight`, `Enemy r65_knight`, `Enemy r70_knight`, `Enemy r76_knight`, `Enemy r81_knight`, `Enemy r86_knight`, `Enemy r91_knight`, `Enemy r96_knight`, `Enemy tomb_guard`.

```text
One isolated 0.4-second sound effect: a hollow armored revenant making a short stressed metal squeal. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="vox_metal_death"></a>

#### VOX_METAL_DEATH — metal family death

- [ ] **P2 · One Shot · 1.25 s · 2 variations**
- **Filename:** `vox_metal_death_v01.wav` through `_v02.wav`
- **Current:** Synthesized/shared — vox_* alert and die_bone/die_flesh death; dedicated family recording absent.

**Used by:** `Enemy fallen_blade`, `Enemy hollow_knight`, `Enemy impaler`, `Enemy malthoron`, `Enemy r50_knight`, `Enemy r55_knight`, `Enemy r60_knight`, `Enemy r65_knight`, `Enemy r70_knight`, `Enemy r76_knight`, `Enemy r81_knight`, `Enemy r86_knight`, `Enemy r91_knight`, `Enemy r96_knight`, `Enemy tomb_guard`.

```text
One isolated 1.25-second sound effect: a hollow armored revenant making empty armor buckling and dropping in several heavy pieces. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="vox_spirit_alert"></a>

#### VOX_SPIRIT_ALERT — spirit family alert

- [ ] **P2 · One Shot · 0.85 s · 3 variations**
- **Filename:** `vox_spirit_alert_v01.wav` through `_v03.wav`
- **Current:** Synthesized/shared — vox_* alert and die_bone/die_flesh death; dedicated family recording absent.

**Used by:** `Act II profile lure_child`, `Enemy dune_shade`, `Enemy empty_archangel`, `Enemy frost_wraith`, `Enemy gloom_shade`, `Enemy grave_wraith`, `Enemy lure_child`, `Enemy malthoron`, `Enemy memory_wraith`, `Enemy prisoned_shade`, `Enemy r51_wraith`, `Enemy r56_wraith`, `Enemy r61_wraith`, `Enemy r66_wraith`, `Enemy r71_wraith`, `Enemy r75_wraith`, `Enemy r80_wraith`, `Enemy r85_wraith`, `Enemy r90_wraith`, `Enemy r95_wraith`, `Enemy soul_chained`, `Enemy vethriss`, `Enemy void_wraith`.

```text
One isolated 0.85-second sound effect: an incorporeal specter making an airy wavering nonverbal moan, no words or singing. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="vox_spirit_hurt"></a>

#### VOX_SPIRIT_HURT — spirit family hurt

- [ ] **P2 · One Shot · 0.4 s · 3 variations**
- **Filename:** `vox_spirit_hurt_v01.wav` through `_v03.wav`
- **Current:** Missing — dedicated enemy vocal injury; current damage feedback is shared contact audio.

**Used by:** `Enemy dune_shade`, `Enemy empty_archangel`, `Enemy frost_wraith`, `Enemy gloom_shade`, `Enemy grave_wraith`, `Enemy lure_child`, `Enemy memory_wraith`, `Enemy prisoned_shade`, `Enemy r51_wraith`, `Enemy r56_wraith`, `Enemy r61_wraith`, `Enemy r66_wraith`, `Enemy r71_wraith`, `Enemy r75_wraith`, `Enemy r80_wraith`, `Enemy r85_wraith`, `Enemy r90_wraith`, `Enemy r95_wraith`, `Enemy soul_chained`, `Enemy void_wraith`.

```text
One isolated 0.4-second sound effect: an incorporeal specter making a brief breath tearing inward. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="vox_spirit_death"></a>

#### VOX_SPIRIT_DEATH — spirit family death

- [ ] **P2 · One Shot · 1.25 s · 2 variations**
- **Filename:** `vox_spirit_death_v01.wav` through `_v02.wav`
- **Current:** Synthesized/shared — vox_* alert and die_bone/die_flesh death; dedicated family recording absent.

**Used by:** `Enemy dune_shade`, `Enemy empty_archangel`, `Enemy frost_wraith`, `Enemy gloom_shade`, `Enemy grave_wraith`, `Enemy lure_child`, `Enemy malthoron`, `Enemy memory_wraith`, `Enemy prisoned_shade`, `Enemy r51_wraith`, `Enemy r56_wraith`, `Enemy r61_wraith`, `Enemy r66_wraith`, `Enemy r71_wraith`, `Enemy r75_wraith`, `Enemy r80_wraith`, `Enemy r85_wraith`, `Enemy r90_wraith`, `Enemy r95_wraith`, `Enemy soul_chained`, `Enemy vethriss`, `Enemy void_wraith`.

```text
One isolated 1.25-second sound effect: an incorporeal specter making a wispy nonverbal cry fraying into air. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="vox_ooze_alert"></a>

#### VOX_OOZE_ALERT — ooze family alert

- [ ] **P2 · One Shot · 0.85 s · 3 variations**
- **Filename:** `vox_ooze_alert_v01.wav` through `_v03.wav`
- **Current:** Synthesized/shared — vox_* alert and die_bone/die_flesh death; dedicated family recording absent.

**Used by:** `Enemy caustic_ooze`, `Enemy r12_ooze`, `Enemy r17_ooze`, `Enemy r22_ooze`, `Enemy r25_ooze`, `Enemy r2_ooze`, `Enemy r30_ooze`, `Enemy r35_ooze`, `Enemy r40_ooze`, `Enemy r45_ooze`, `Enemy r7_ooze`, `Enemy sludge_horror`.

```text
One isolated 0.85-second sound effect: a large living slime making thick irregular wet bubbling. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="vox_ooze_hurt"></a>

#### VOX_OOZE_HURT — ooze family hurt

- [ ] **P2 · One Shot · 0.4 s · 3 variations**
- **Filename:** `vox_ooze_hurt_v01.wav` through `_v03.wav`
- **Current:** Missing — dedicated enemy vocal injury; current damage feedback is shared contact audio.

**Used by:** `Enemy caustic_ooze`, `Enemy r12_ooze`, `Enemy r17_ooze`, `Enemy r22_ooze`, `Enemy r25_ooze`, `Enemy r2_ooze`, `Enemy r30_ooze`, `Enemy r35_ooze`, `Enemy r40_ooze`, `Enemy r45_ooze`, `Enemy r7_ooze`, `Enemy sludge_horror`.

```text
One isolated 0.4-second sound effect: a large living slime making a compact wet suction squeak. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="vox_ooze_death"></a>

#### VOX_OOZE_DEATH — ooze family death

- [ ] **P2 · One Shot · 1.25 s · 2 variations**
- **Filename:** `vox_ooze_death_v01.wav` through `_v02.wav`
- **Current:** Synthesized/shared — vox_* alert and die_bone/die_flesh death; dedicated family recording absent.

**Used by:** `Enemy caustic_ooze`, `Enemy r12_ooze`, `Enemy r17_ooze`, `Enemy r22_ooze`, `Enemy r25_ooze`, `Enemy r2_ooze`, `Enemy r30_ooze`, `Enemy r35_ooze`, `Enemy r40_ooze`, `Enemy r45_ooze`, `Enemy r7_ooze`, `Enemy sludge_horror`.

```text
One isolated 1.25-second sound effect: a large living slime making viscous fluid collapsing into a puddle with bubbles popping. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="vox_wood_alert"></a>

#### VOX_WOOD_ALERT — wood family alert

- [ ] **P2 · One Shot · 0.85 s · 3 variations**
- **Filename:** `vox_wood_alert_v01.wav` through `_v03.wav`
- **Current:** Synthesized/shared — vox_* alert and die_bone/die_flesh death; dedicated family recording absent.

**Used by:** `Companion ent`, `Enemy blight_treant`, `Enemy gnarl_treant`, `Enemy r77_treant`, `Enemy r82_treant`, `Enemy r87_treant`, `Enemy r92_treant`, `Enemy r97_treant`, `Enemy thorn_shambler`.

```text
One isolated 0.85-second sound effect: a living twisted tree making deep wood under strain and roots creaking. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="vox_wood_hurt"></a>

#### VOX_WOOD_HURT — wood family hurt

- [ ] **P2 · One Shot · 0.4 s · 3 variations**
- **Filename:** `vox_wood_hurt_v01.wav` through `_v03.wav`
- **Current:** Missing — dedicated enemy vocal injury; current damage feedback is shared contact audio.

**Used by:** `Companion ent`, `Enemy blight_treant`, `Enemy gnarl_treant`, `Enemy r77_treant`, `Enemy r82_treant`, `Enemy r87_treant`, `Enemy r92_treant`, `Enemy r97_treant`, `Enemy thorn_shambler`.

```text
One isolated 0.4-second sound effect: a living twisted tree making a sharp woody crack. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="vox_wood_death"></a>

#### VOX_WOOD_DEATH — wood family death

- [ ] **P2 · One Shot · 1.25 s · 2 variations**
- **Filename:** `vox_wood_death_v01.wav` through `_v02.wav`
- **Current:** Synthesized/shared — vox_* alert and die_bone/die_flesh death; dedicated family recording absent.

**Used by:** `Companion ent`, `Enemy blight_treant`, `Enemy gnarl_treant`, `Enemy r77_treant`, `Enemy r82_treant`, `Enemy r87_treant`, `Enemy r92_treant`, `Enemy r97_treant`, `Enemy thorn_shambler`.

```text
One isolated 1.25-second sound effect: a living twisted tree making a thick trunk cracking and roots tearing loose. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="vox_stone_alert"></a>

#### VOX_STONE_ALERT — stone family alert

- [ ] **P2 · One Shot · 0.85 s · 3 variations**
- **Filename:** `vox_stone_alert_v01.wav` through `_v03.wav`
- **Current:** Synthesized/shared — vox_* alert and die_bone/die_flesh death; dedicated family recording absent.

**Used by:** `Enemy chapel_grotesque`, `Enemy crystal_marauder`, `Enemy gilt_construct`, `Enemy shard_construct`, `Enemy stone_gargoyle`, `Enemy void_gargoyle`.

```text
One isolated 0.85-second sound effect: a living stone creature making grinding rock and a low hollow stone rumble. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="vox_stone_hurt"></a>

#### VOX_STONE_HURT — stone family hurt

- [ ] **P2 · One Shot · 0.4 s · 3 variations**
- **Filename:** `vox_stone_hurt_v01.wav` through `_v03.wav`
- **Current:** Missing — dedicated enemy vocal injury; current damage feedback is shared contact audio.

**Used by:** `Enemy chapel_grotesque`, `Enemy crystal_marauder`, `Enemy gilt_construct`, `Enemy shard_construct`, `Enemy stone_gargoyle`, `Enemy void_gargoyle`.

```text
One isolated 0.4-second sound effect: a living stone creature making a sharp fractured rock knock. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="vox_stone_death"></a>

#### VOX_STONE_DEATH — stone family death

- [ ] **P2 · One Shot · 1.25 s · 2 variations**
- **Filename:** `vox_stone_death_v01.wav` through `_v02.wav`
- **Current:** Synthesized/shared — vox_* alert and die_bone/die_flesh death; dedicated family recording absent.

**Used by:** `Enemy chapel_grotesque`, `Enemy crystal_marauder`, `Enemy gilt_construct`, `Enemy shard_construct`, `Enemy stone_gargoyle`, `Enemy void_gargoyle`.

```text
One isolated 1.25-second sound effect: a living stone creature making a carved stone body breaking into heavy chunks and grit. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="vox_imp_alert"></a>

#### VOX_IMP_ALERT — imp family alert

- [ ] **P2 · One Shot · 0.85 s · 3 variations**
- **Filename:** `vox_imp_alert_v01.wav` through `_v03.wav`
- **Current:** Synthesized/shared — vox_* alert and die_bone/die_flesh death; dedicated family recording absent.

**Used by:** `Enemy cinder_imp`, `Enemy hex_imp`, `Enemy r29_imp`, `Enemy r34_imp`, `Enemy r39_imp`, `Enemy r44_imp`, `Enemy r49_imp`, `Enemy r53_imp`, `Enemy r58_imp`, `Enemy r63_imp`, `Enemy r68_imp`, `Enemy r73_imp`.

```text
One isolated 0.85-second sound effect: a small spiteful demon making a rasping nonverbal cackle with nasal chattering. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="vox_imp_hurt"></a>

#### VOX_IMP_HURT — imp family hurt

- [ ] **P2 · One Shot · 0.4 s · 3 variations**
- **Filename:** `vox_imp_hurt_v01.wav` through `_v03.wav`
- **Current:** Missing — dedicated enemy vocal injury; current damage feedback is shared contact audio.

**Used by:** `Enemy cinder_imp`, `Enemy hex_imp`, `Enemy r29_imp`, `Enemy r34_imp`, `Enemy r39_imp`, `Enemy r44_imp`, `Enemy r49_imp`, `Enemy r53_imp`, `Enemy r58_imp`, `Enemy r63_imp`, `Enemy r68_imp`, `Enemy r73_imp`.

```text
One isolated 0.4-second sound effect: a small spiteful demon making a clipped harsh squeal. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="vox_imp_death"></a>

#### VOX_IMP_DEATH — imp family death

- [ ] **P2 · One Shot · 1.25 s · 2 variations**
- **Filename:** `vox_imp_death_v01.wav` through `_v02.wav`
- **Current:** Synthesized/shared — vox_* alert and die_bone/die_flesh death; dedicated family recording absent.

**Used by:** `Enemy cinder_imp`, `Enemy hex_imp`, `Enemy r29_imp`, `Enemy r34_imp`, `Enemy r39_imp`, `Enemy r44_imp`, `Enemy r49_imp`, `Enemy r53_imp`, `Enemy r58_imp`, `Enemy r63_imp`, `Enemy r68_imp`, `Enemy r73_imp`.

```text
One isolated 1.25-second sound effect: a small spiteful demon making a short ragged squeak breaking into a breath. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="vox_choir_alert"></a>

#### VOX_CHOIR_ALERT — choir family alert

- [ ] **P2 · One Shot · 0.85 s · 3 variations**
- **Filename:** `vox_choir_alert_v01.wav` through `_v03.wav`
- **Current:** Synthesized/shared — vox_* alert and die_bone/die_flesh death; dedicated family recording absent.

**Used by:** `Enemy choir_herald`, `Enemy choir_priest`, `Enemy choirmaster`, `Enemy r28_robed`, `Enemy silent_cultist`, `Enemy song_thrall`.

```text
One isolated 0.85-second sound effect: an unnatural robed cult singer making one tense breathy nonverbal throat resonance, dissonant and very short. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="vox_choir_hurt"></a>

#### VOX_CHOIR_HURT — choir family hurt

- [ ] **P2 · One Shot · 0.4 s · 3 variations**
- **Filename:** `vox_choir_hurt_v01.wav` through `_v03.wav`
- **Current:** Missing — dedicated enemy vocal injury; current damage feedback is shared contact audio.

**Used by:** `Enemy choir_herald`, `Enemy choir_priest`, `Enemy choirmaster`, `Enemy r28_robed`, `Enemy silent_cultist`, `Enemy song_thrall`.

```text
One isolated 0.4-second sound effect: an unnatural robed cult singer making a choked brief air gasp. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="vox_choir_death"></a>

#### VOX_CHOIR_DEATH — choir family death

- [ ] **P2 · One Shot · 1.25 s · 2 variations**
- **Filename:** `vox_choir_death_v01.wav` through `_v02.wav`
- **Current:** Synthesized/shared — vox_* alert and die_bone/die_flesh death; dedicated family recording absent.

**Used by:** `Enemy choir_herald`, `Enemy choir_priest`, `Enemy choirmaster`, `Enemy r28_robed`, `Enemy silent_cultist`, `Enemy song_thrall`.

```text
One isolated 1.25-second sound effect: an unnatural robed cult singer making a strained nonverbal tone falling apart into breath. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="vox_dragon_alert"></a>

#### VOX_DRAGON_ALERT — dragon family alert

- [ ] **P2 · One Shot · 0.85 s · 3 variations**
- **Filename:** `vox_dragon_alert_v01.wav` through `_v03.wav`
- **Current:** Synthesized/shared — vox_* alert and die_bone/die_flesh death; dedicated family recording absent.

**Used by:** `Enemy ash_drake`.

```text
One isolated 0.85-second sound effect: an immense reptilian dragon making a low coarse reptilian roar with chest pressure. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="vox_dragon_hurt"></a>

#### VOX_DRAGON_HURT — dragon family hurt

- [ ] **P2 · One Shot · 0.4 s · 3 variations**
- **Filename:** `vox_dragon_hurt_v01.wav` through `_v03.wav`
- **Current:** Missing — dedicated enemy vocal injury; current damage feedback is shared contact audio.

**Used by:** `Enemy ash_drake`.

```text
One isolated 0.4-second sound effect: an immense reptilian dragon making a short pained rasping roar. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="vox_dragon_death"></a>

#### VOX_DRAGON_DEATH — dragon family death

- [ ] **P2 · One Shot · 1.25 s · 2 variations**
- **Filename:** `vox_dragon_death_v01.wav` through `_v02.wav`
- **Current:** Synthesized/shared — vox_* alert and die_bone/die_flesh death; dedicated family recording absent.

**Used by:** `Enemy ash_drake`.

```text
One isolated 1.25-second sound effect: an immense reptilian dragon making a rough descending roar breaking into a final hot exhale. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="vox_hawk_alert"></a>

#### VOX_HAWK_ALERT — hawk family alert

- [ ] **P2 · One Shot · 0.85 s · 3 variations**
- **Filename:** `vox_hawk_alert_v01.wav` through `_v03.wav`
- **Current:** Synthesized/shared — vox_* alert and die_bone/die_flesh death; dedicated family recording absent.

**Used by:** `Companion hawk`.

```text
One isolated 0.85-second sound effect: a spectral hunting hawk making one sharp raptor cry with airy wings. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="vox_hawk_hurt"></a>

#### VOX_HAWK_HURT — hawk family hurt

- [ ] **P2 · One Shot · 0.4 s · 3 variations**
- **Filename:** `vox_hawk_hurt_v01.wav` through `_v03.wav`
- **Current:** Missing — dedicated enemy vocal injury; current damage feedback is shared contact audio.

**Used by:** `Companion hawk`.

```text
One isolated 0.4-second sound effect: a spectral hunting hawk making one short startled raptor shriek. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="vox_hawk_death"></a>

#### VOX_HAWK_DEATH — hawk family death

- [ ] **P2 · One Shot · 1.25 s · 2 variations**
- **Filename:** `vox_hawk_death_v01.wav` through `_v02.wav`
- **Current:** Synthesized/shared — vox_* alert and die_bone/die_flesh death; dedicated family recording absent.

**Used by:** `Companion hawk`.

```text
One isolated 1.25-second sound effect: a spectral hunting hawk making a brief weakened bird cry dissolving into air. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="vox_boar_alert"></a>

#### VOX_BOAR_ALERT — boar family alert

- [ ] **P2 · One Shot · 0.85 s · 3 variations**
- **Filename:** `vox_boar_alert_v01.wav` through `_v03.wav`
- **Current:** Synthesized/shared — vox_* alert and die_bone/die_flesh death; dedicated family recording absent.

**Used by:** `Companion boar`.

```text
One isolated 0.85-second sound effect: a large wild boar making a threatening snort and guttural grunt. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="vox_boar_hurt"></a>

#### VOX_BOAR_HURT — boar family hurt

- [ ] **P2 · One Shot · 0.4 s · 3 variations**
- **Filename:** `vox_boar_hurt_v01.wav` through `_v03.wav`
- **Current:** Missing — dedicated enemy vocal injury; current damage feedback is shared contact audio.

**Used by:** `Companion boar`.

```text
One isolated 0.4-second sound effect: a large wild boar making a short coarse squeal. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="vox_boar_death"></a>

#### VOX_BOAR_DEATH — boar family death

- [ ] **P2 · One Shot · 1.25 s · 2 variations**
- **Filename:** `vox_boar_death_v01.wav` through `_v02.wav`
- **Current:** Synthesized/shared — vox_* alert and die_bone/die_flesh death; dedicated family recording absent.

**Used by:** `Companion boar`.

```text
One isolated 1.25-second sound effect: a large wild boar making a low failing grunt with a breathy ending. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="vox_bear_alert"></a>

#### VOX_BEAR_ALERT — bear family alert

- [ ] **P2 · One Shot · 0.85 s · 3 variations**
- **Filename:** `vox_bear_alert_v01.wav` through `_v03.wav`
- **Current:** Synthesized/shared — vox_* alert and die_bone/die_flesh death; dedicated family recording absent.

**Used by:** `Companion bear`.

```text
One isolated 0.85-second sound effect: a large bear making a forceful low rumbling growl. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="vox_bear_hurt"></a>

#### VOX_BEAR_HURT — bear family hurt

- [ ] **P2 · One Shot · 0.4 s · 3 variations**
- **Filename:** `vox_bear_hurt_v01.wav` through `_v03.wav`
- **Current:** Missing — dedicated enemy vocal injury; current damage feedback is shared contact audio.

**Used by:** `Companion bear`.

```text
One isolated 0.4-second sound effect: a large bear making a short rough chest grunt. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="vox_bear_death"></a>

#### VOX_BEAR_DEATH — bear family death

- [ ] **P2 · One Shot · 1.25 s · 2 variations**
- **Filename:** `vox_bear_death_v01.wav` through `_v02.wav`
- **Current:** Synthesized/shared — vox_* alert and die_bone/die_flesh death; dedicated family recording absent.

**Used by:** `Companion bear`.

```text
One isolated 1.25-second sound effect: a large bear making a weakened roar breaking into a low exhale. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="bank-enemy-and-companion-movement"></a>

### Enemy and companion movement

<a id="move_paws"></a>

#### MOVE_PAWS — Hounds, bears and wolf/bear forms move

- [ ] **P3 · One Shot · 0.25 s · 6 variations**
- **Filename:** `move_paws_v01.wav` through `_v06.wav`
- **Current:** Missing — dedicated enemy movement bank.

**Used by:** `Companion bear`, `Companion wolf`, `Enemy cinder_hound`, `Enemy grave_hound`, `Enemy hoarfang`, `Enemy ice_lurker`, `Enemy r0_hound`, `Enemy r10_hound`, `Enemy r15_hound`, `Enemy r20_hound`, `Enemy r5_hound`, `Enemy soul_eater`.

```text
One isolated 0.25-second sound effect: one large padded animal paw stepping onto rough ground with a faint claw click. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="move_hoof"></a>

#### MOVE_HOOF — Boar foot contact

- [ ] **P3 · One Shot · 0.2 s · 6 variations**
- **Filename:** `move_hoof_v01.wav` through `_v06.wav`
- **Current:** Missing — dedicated enemy movement bank.

**Used by:** `Companion boar`.

```text
One isolated 0.2-second sound effect: one cloven hoof striking dirt with a sharp little clack and earth grit. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="move_chitin"></a>

#### MOVE_CHITIN — Crawling insect movement

- [ ] **P3 · One Shot · 0.3 s · 3 variations**
- **Filename:** `move_chitin_v01.wav` through `_v03.wav`
- **Current:** Missing — dedicated enemy movement bank.

**Used by:** `Enemy blight_wasp`, `Enemy cinder_imp`, `Enemy crypt_widow`, `Enemy hex_imp`, `Enemy marsh_larvae`, `Enemy marsh_wretch`, `Enemy r13_spider`, `Enemy r18_spider`, `Enemy r23_spider`, `Enemy r29_imp`, `Enemy r34_imp`, `Enemy r39_imp`, `Enemy r3_spider`, `Enemy r44_imp`, `Enemy r49_imp`, `Enemy r53_imp`, `Enemy r58_imp`, `Enemy r63_imp`, `Enemy r68_imp`, `Enemy r73_imp`, `Enemy r8_spider`, `Enemy shatter_wasp`.

```text
One isolated 0.3-second sound effect: one brief scuttle of hard insect legs tapping and scraping stone. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="move_slither"></a>

#### MOVE_SLITHER — Serpent movement

- [ ] **P3 · One Shot · 0.5 s · 3 variations**
- **Filename:** `move_slither_v01.wav` through `_v03.wav`
- **Current:** Missing — dedicated enemy movement bank.

**Used by:** `Enemy cave_python`, `Enemy dune_serpent`, `Enemy marsh_serpent`, `Enemy vethriss`.

```text
One isolated 0.5-second sound effect: a heavy scaled body sliding over coarse ground with dry grit friction. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="move_slime"></a>

#### MOVE_SLIME — Ooze movement

- [ ] **P3 · One Shot · 0.5 s · 3 variations**
- **Filename:** `move_slime_v01.wav` through `_v03.wav`
- **Current:** Missing — dedicated enemy movement bank.

**Used by:** `Enemy caustic_ooze`, `Enemy r12_ooze`, `Enemy r17_ooze`, `Enemy r22_ooze`, `Enemy r25_ooze`, `Enemy r2_ooze`, `Enemy r30_ooze`, `Enemy r35_ooze`, `Enemy r40_ooze`, `Enemy r45_ooze`, `Enemy r7_ooze`, `Enemy sludge_horror`.

```text
One isolated 0.5-second sound effect: a thick glob of slime dragging and pulling free with wet suction. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="move_wings"></a>

#### MOVE_WINGS — Wingbeat for hawk, insect, gargoyle or dragon

- [ ] **P3 · One Shot · 0.45 s · 3 variations**
- **Filename:** `move_wings_v01.wav` through `_v03.wav`
- **Current:** Missing — dedicated enemy movement bank.

**Used by:** `Act III profile stone_gargoyle`, `Companion hawk`, `Enemy ash_drake`.

```text
One isolated 0.45-second sound effect: one broad leathery wing beat, dense cloth-like air displacement and membrane snap. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="move_float"></a>

#### MOVE_FLOAT — Spectral movement accent

- [ ] **P3 · One Shot · 0.5 s · 3 variations**
- **Filename:** `move_float_v01.wav` through `_v03.wav`
- **Current:** Missing — dedicated enemy movement bank.

**Used by:** `Enemy dune_shade`, `Enemy empty_archangel`, `Enemy frost_wraith`, `Enemy gloom_shade`, `Enemy grave_wraith`, `Enemy lure_child`, `Enemy memory_wraith`, `Enemy prisoned_shade`, `Enemy r51_wraith`, `Enemy r56_wraith`, `Enemy r61_wraith`, `Enemy r66_wraith`, `Enemy r71_wraith`, `Enemy r75_wraith`, `Enemy r80_wraith`, `Enemy r85_wraith`, `Enemy r90_wraith`, `Enemy r95_wraith`, `Enemy soul_chained`, `Enemy void_wraith`.

```text
One isolated 0.5-second sound effect: a very soft nonverbal airy drift passing close and fading away. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="move_heavy_step"></a>

#### MOVE_HEAVY_STEP — Brute, stone creature or giant landing/step

- [ ] **P3 · One Shot · 0.4 s · 6 variations**
- **Filename:** `move_heavy_step_v01.wav` through `_v06.wav`
- **Current:** Missing — dedicated enemy movement bank.

**Used by:** `Enemy ash_fiend`, `Enemy ashfiend_reaver`, `Enemy azram_echo`, `Enemy barb_axe`, `Enemy barb_guard`, `Enemy barb_pole`, `Enemy barb_sword`, `Enemy bog_bloat`, `Enemy brimstone_brute`, `Enemy brood_mother`, `Enemy chapel_grotesque`, `Enemy crystal_marauder`, `Enemy fen_stalker`, `Enemy flesh_engine`, `Enemy frost_wyrm`, `Enemy gilt_construct`, `Enemy glacial_crawler`, `Enemy infernal_warlord`, `Enemy korvath`, `Enemy malthoron_echo`, `Enemy mire_mother`, `Enemy pit_brute`, `Enemy r11_human`, `Enemy r17_ooze`, `Enemy r23_spider`, `Enemy r25_ooze`, `Enemy r26_brute`, `Enemy r31_brute`, `Enemy r34_imp`, `Enemy r36_brute`, `Enemy r41_brute`, `Enemy r43_robed`, `Enemy r46_brute`, `Enemy r52_brute`, `Enemy r53_imp`, `Enemy r57_brute`, `Enemy r5_hound`, `Enemy r62_brute`, `Enemy r67_brute`, `Enemy r72_brute`, `Enemy r78_brute`, `Enemy r83_brute`, `Enemy r88_brute`, `Enemy r93_brute`, `Enemy r98_brute`, `Enemy shard_construct`, `Enemy stone_gargoyle`, `Enemy vellath`, `Enemy void_gargoyle`, `Enemy wretch_lord`.

```text
One isolated 0.4-second sound effect: one very heavy foot compressing gravel, low thud and short fragments scattering. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="bank-signature-abilities-and-encounters"></a>

### Signature abilities and encounters

<a id="sig_meteor"></a>

#### SIG_METEOR — Meteor collision

- [ ] **P2 · One Shot · 1.6 s · 2 variations**
- **Filename:** `sig_meteor_v01.wav` through `_v02.wav`
- **Current:** Shared — existing material/legacy cues; bespoke recording proposed.

**Used by:** `Skill emberwitch_0_4`.

```text
One isolated 1.6-second sound effect: one dense burning rock colliding with the ground, an immediate compact stone-breaking fire impact with falling hot debris. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="sig_glacier"></a>

#### SIG_GLACIER — Glacier eruption

- [ ] **P2 · One Shot · 1.4 s · 2 variations**
- **Filename:** `sig_glacier_v01.wav` through `_v02.wav`
- **Current:** Shared — existing material/legacy cues; bespoke recording proposed.

**Used by:** `Skill emberwitch_1_6`.

```text
One isolated 1.4-second sound effect: thick ice pillars heaving upward through rock, deep cracks and bright frozen shards. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="sig_overload"></a>

#### SIG_OVERLOAD — Overload discharge

- [ ] **P2 · One Shot · 1 s · 2 variations**
- **Filename:** `sig_overload_v01.wav` through `_v02.wav`
- **Current:** Shared — existing material/legacy cues; bespoke recording proposed.

**Used by:** `Skill emberwitch_2_6`.

```text
One isolated 1-second sound effect: electrical energy compressing for an instant then cracking outward in one ragged static burst. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="sig_bone_raise"></a>

#### SIG_BONE_RAISE — Raise Dead or Bone Golem assembly

- [ ] **P2 · One Shot · 1.2 s · 2 variations**
- **Filename:** `sig_bone_raise_v01.wav` through `_v02.wav`
- **Current:** Shared — existing material/legacy cues; bespoke recording proposed.

**Used by:** `Enemy chained_sovereign`, `Enemy gravecaller`, `Enemy morthul`, `Enemy vellath`, `Opening fallen-guard awakening`, `Skill gravebinder_0_2`, `Skill raise_dead`.

```text
One isolated 1.2-second sound effect: loose bones pulling together from earth, a brief inward breath and decisive joint-locking clacks. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="sig_corpse_burst"></a>

#### SIG_CORPSE_BURST — Corpse Burst or sacrificial detonation

- [ ] **P2 · One Shot · 0.9 s · 2 variations**
- **Filename:** `sig_corpse_burst_v01.wav` through `_v02.wav`
- **Current:** Shared — existing material/legacy cues; bespoke recording proposed.

**Used by:** `Enemy choirmaster`, `Skill corpse_burst`, `Skill gravebinder_0_7`.

```text
One isolated 0.9-second sound effect: one compact wet organic rupture with brittle bone fragments and a poisonous fizz. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="sig_outbreak"></a>

#### SIG_OUTBREAK — Outbreak propagating wave

- [ ] **P2 · One Shot · 1.4 s · 2 variations**
- **Filename:** `sig_outbreak_v01.wav` through `_v02.wav`
- **Current:** Shared — existing material/legacy cues; bespoke recording proposed.

**Used by:** `Skill gravebinder_2_7`.

```text
One isolated 1.4-second sound effect: a rolling chain of wet organic pops and corrosive hiss moving outward, ending cleanly. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="sig_arrowfall"></a>

#### SIG_ARROWFALL — Arrowfall opening volley

- [ ] **P2 · One Shot · 0.9 s · 2 variations**
- **Filename:** `sig_arrowfall_v01.wav` through `_v02.wav`
- **Current:** Shared — existing material/legacy cues; bespoke recording proposed.

**Used by:** `Skill veilranger_0_6`.

```text
One isolated 0.9-second sound effect: a compact cluster of arrows descending with layered swishes and several sharp earth thuds. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="sig_powder"></a>

#### SIG_POWDER — Powder Trap detonation

- [ ] **P2 · One Shot · 0.75 s · 2 variations**
- **Filename:** `sig_powder_v01.wav` through `_v02.wav`
- **Current:** Shared — existing material/legacy cues; bespoke recording proposed.

**Used by:** `Skill veilranger_1_5`.

```text
One isolated 0.75-second sound effect: a small black-powder blast, sharp crack with a short coarse low boom and grit. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="sig_mark_break"></a>

#### SIG_MARK_BREAK — Killing Mark detonation or Deathblow payoff

- [ ] **P2 · One Shot · 0.7 s · 2 variations**
- **Filename:** `sig_mark_break_v01.wav` through `_v02.wav`
- **Current:** Shared — existing material/legacy cues; bespoke recording proposed.

**Used by:** `Skill veilranger_2_4`, `Skill veilranger_2_6`.

```text
One isolated 0.7-second sound effect: a tight shadow pressure snap followed by one deep wet impact, restrained and abrupt. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="sig_form_wolf"></a>

#### SIG_FORM_WOLF — Transform into Wolf Form

- [ ] **P2 · One Shot · 1.2 s · 2 variations**
- **Filename:** `sig_form_wolf_v01.wav` through `_v02.wav`
- **Current:** Shared — existing material/legacy cues; bespoke recording proposed.

**Used by:** `Skill fangform`.

```text
One isolated 1.2-second sound effect: joints and sinews reshaping with a root rustle and one low wolf snarl. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="sig_form_bear"></a>

#### SIG_FORM_BEAR — Transform into Bear Form

- [ ] **P2 · One Shot · 1.4 s · 2 variations**
- **Filename:** `sig_form_bear_v01.wav` through `_v02.wav`
- **Current:** Shared — existing material/legacy cues; bespoke recording proposed.

**Used by:** `Skill stoneform`.

```text
One isolated 1.4-second sound effect: heavy bones and muscles shifting with a woody crack and one deep bear exhale. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="sig_form_stone"></a>

#### SIG_FORM_STONE — Transform into Stone Form

- [ ] **P2 · One Shot · 1.4 s · 2 variations**
- **Filename:** `sig_form_stone_v01.wav` through `_v02.wav`
- **Current:** Shared — existing material/legacy cues; bespoke recording proposed.

**Used by:** `Skill wildkeeper_2_2`.

```text
One isolated 1.4-second sound effect: rock plates sliding over growing roots and locking into a heavy stone body. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="sig_form_apex"></a>

#### SIG_FORM_APEX — Wrath of the Wild transformation

- [ ] **P2 · One Shot · 1.6 s · 2 variations**
- **Filename:** `sig_form_apex_v01.wav` through `_v02.wav`
- **Current:** Shared — existing material/legacy cues; bespoke recording proposed.

**Used by:** `Skill wildkeeper_2_6`.

```text
One isolated 1.6-second sound effect: roots twisting through cracking stone as a deep animal roar meets a sudden contained flame rush. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="sig_form_end"></a>

#### SIG_FORM_END — Return from beast to human form

- [ ] **P2 · One Shot · 0.9 s · 2 variations**
- **Filename:** `sig_form_end_v01.wav` through `_v02.wav`
- **Current:** Shared — existing material/legacy cues; bespoke recording proposed.

**Used by:** `Skill fangform`, `Skill stoneform`, `Skill wildkeeper_2_2`, `Skill wildkeeper_2_6`.

```text
One isolated 0.9-second sound effect: a short outward breath as roots and stone fragments loosen and soft clothing settles. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="sig_boss_warn"></a>

#### SIG_BOSS_WARN — Shared major-attack warning

- [ ] **P2 · One Shot · 0.65 s · 2 variations**
- **Filename:** `sig_boss_warn_v01.wav` through `_v02.wav`
- **Current:** Shared — existing material/legacy cues; bespoke recording proposed.

**Used by:** `Act II profile blight_treant`, `Act III profile crystal_marauder`, `Act III profile gilt_construct`, `Act III profile shard_construct`, `Act III profile stone_gargoyle`, `Act III profile tomb_guard`, `Act IV profile cathedral_knight_guardian`, `Act IV profile cathedral_priest_guardian`, `Act IV profile hollow_knight`, `Act IV profile memory_wraith`, `Enemy ashfiend_reaver`, `Enemy attack warning, phase, defeat and recovery`, `Enemy azram`, `Enemy barb_axe`, `Enemy barb_pole`, `Enemy barb_sword`, `Enemy blight_treant`, `Enemy bog_bloat`, `Enemy bone_dragon`, `Enemy brimstone_brute`, `Enemy brood_mother`, `Enemy chained_sovereign`, `Enemy choir_herald`, `Enemy choirmaster`, `Enemy empty_archangel`, `Enemy flesh_engine`, `Enemy frost_watch_captain`, `Enemy frost_wyrm`, `Enemy gnarl_treant`, `Enemy gravecaller`, `Enemy hoarfang`, `Enemy infernal_warlord`, `Enemy korvath`, `Enemy malthoron`, `Enemy mire_mother`, `Enemy morthul`, `Enemy pit_brute`, `Enemy r15_hound`, `Enemy r21_human`, `Enemy r29_imp`, `Enemy r38_robed`, `Enemy r3_spider`, `Enemy r46_brute`, `Enemy r47_skeleton`, `Enemy r52_brute`, `Enemy r56_wraith`, `Enemy r58_imp`, `Enemy r62_brute`, `Enemy r67_brute`, `Enemy r72_brute`, `Enemy r75_wraith`, `Enemy r78_brute`, `Enemy r82_treant`, `Enemy r85_wraith`, `Enemy r92_treant`, `Enemy r99_warlord`, `Enemy r9_skeleton`, `Enemy sludge_horror`, `Enemy vellath`, `Enemy vethriss`, `Enemy vicar`, `Enemy void_gargoyle`, `Enemy void_wraith`.

```text
One isolated 0.65-second sound effect: a short dry metal tension scrape swelling into a clear clipped breath, easy to hear over combat. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="sig_boss_phase"></a>

#### SIG_BOSS_PHASE — Shared boss phase-change accent

- [ ] **P2 · One Shot · 1.2 s · 2 variations**
- **Filename:** `sig_boss_phase_v01.wav` through `_v02.wav`
- **Current:** Shared — existing material/legacy cues; bespoke recording proposed.

**Used by:** `Current Sfx.vox_boss`, `Enemy attack warning, phase, defeat and recovery`, `Enemy azram`, `Enemy barb_axe`, `Enemy barb_pole`, `Enemy barb_sword`, `Enemy bone_dragon`, `Enemy brood_mother`, `Enemy chained_sovereign`, `Enemy choir_herald`, `Enemy choirmaster`, `Enemy empty_archangel`, `Enemy flesh_engine`, `Enemy frost_watch_captain`, `Enemy gravecaller`, `Enemy hoarfang`, `Enemy infernal_warlord`, `Enemy korvath`, `Enemy malthoron`, `Enemy mire_mother`, `Enemy morthul`, `Enemy vellath`, `Enemy vethriss`, `Enemy vicar`.

```text
One isolated 1.2-second sound effect: a deep material crack followed by a short rough nonverbal pressure exhale. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="sig_boss_defeat"></a>

#### SIG_BOSS_DEFEAT — Shared boss defeat punctuation

- [ ] **P2 · One Shot · 2 s · 2 variations**
- **Filename:** `sig_boss_defeat_v01.wav` through `_v02.wav`
- **Current:** Shared — existing material/legacy cues; bespoke recording proposed.

**Used by:** `Enemy attack warning, phase, defeat and recovery`, `Enemy azram`, `Enemy barb_axe`, `Enemy barb_pole`, `Enemy barb_sword`, `Enemy bone_dragon`, `Enemy brood_mother`, `Enemy chained_sovereign`, `Enemy choir_herald`, `Enemy choirmaster`, `Enemy empty_archangel`, `Enemy flesh_engine`, `Enemy frost_watch_captain`, `Enemy gravecaller`, `Enemy hoarfang`, `Enemy infernal_warlord`, `Enemy korvath`, `Enemy malthoron`, `Enemy mire_mother`, `Enemy morthul`, `Enemy vellath`, `Enemy vethriss`, `Enemy vicar`.

```text
One isolated 2-second sound effect: a single heavy ancient body collapse with scattered stone and a long exhausted air release. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="sig_recovery"></a>

#### SIG_RECOVERY — Boss stagger, interruption or exposed weak point

- [ ] **P2 · One Shot · 0.65 s · 2 variations**
- **Filename:** `sig_recovery_v01.wav` through `_v02.wav`
- **Current:** Shared — existing material/legacy cues; bespoke recording proposed.

**Used by:** `Enemy attack warning, phase, defeat and recovery`, `Enemy azram`, `Enemy barb_axe`, `Enemy barb_pole`, `Enemy barb_sword`, `Enemy bone_dragon`, `Enemy brood_mother`, `Enemy chained_sovereign`, `Enemy choir_herald`, `Enemy choirmaster`, `Enemy empty_archangel`, `Enemy flesh_engine`, `Enemy frost_watch_captain`, `Enemy gravecaller`, `Enemy hoarfang`, `Enemy infernal_warlord`, `Enemy korvath`, `Enemy malthoron`, `Enemy mire_mother`, `Enemy morthul`, `Enemy vellath`, `Enemy vethriss`, `Enemy vicar`.

```text
One isolated 0.65-second sound effect: a taut chain snapping loose, brief airy release with a small clear metal ring. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="sig_cleave"></a>

#### SIG_CLEAVE — Boss heavy cleave release

- [ ] **P2 · One Shot · 0.55 s · 2 variations**
- **Filename:** `sig_cleave_v01.wav` through `_v02.wav`
- **Current:** Shared — existing material/legacy cues; bespoke recording proposed.

**Used by:** `Enemy azram`, `Enemy barb_axe`, `Enemy barb_sword`, `Enemy frost_watch_captain`, `Enemy infernal_warlord`, `Enemy korvath`, `Enemy malthoron`.

```text
One isolated 0.55-second sound effect: a very heavy blade cutting quickly through air, forceful low swish and short steel edge vibration, no contact impact. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="sig_fissure"></a>

#### SIG_FISSURE — Korvath or earth shockwave fracture

- [ ] **P2 · One Shot · 1 s · 2 variations**
- **Filename:** `sig_fissure_v01.wav` through `_v02.wav`
- **Current:** Shared — existing material/legacy cues; bespoke recording proposed.

**Used by:** `Enemy barb_pole`, `Enemy bone_dragon`, `Enemy chained_sovereign`, `Enemy flesh_engine`, `Enemy infernal_warlord`, `Enemy korvath`, `Enemy morthul`, `Enemy vellath`, `Enemy vethriss`, `Skill ground_fissure`, `Skill ground_slam`.

```text
One isolated 1-second sound effect: a straight crack ripping through frozen stone in several fast connected breaks. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="sig_frost_slam"></a>

#### SIG_FROST_SLAM — Rimebound Captain or Hoarfang frost slam contact

- [ ] **P2 · One Shot · 0.85 s · 2 variations**
- **Filename:** `sig_frost_slam_v01.wav` through `_v02.wav`
- **Current:** Shared — existing material/legacy cues; bespoke recording proposed.

**Used by:** `Enemy frost_watch_captain`, `Enemy hoarfang`.

```text
One isolated 0.85-second sound effect: one heavy impact on frozen ground, immediate deep thud with a short outward burst of brittle ice grains. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="sig_bile"></a>

#### SIG_BILE — Mire Mother targeted bile

- [ ] **P2 · One Shot · 1 s · 2 variations**
- **Filename:** `sig_bile_v01.wav` through `_v02.wav`
- **Current:** Shared — existing material/legacy cues; bespoke recording proposed.

**Used by:** `Enemy brood_mother`, `Enemy mire_mother`, `Enemy vethriss`.

```text
One isolated 1-second sound effect: a forceful thick caustic liquid spit hitting wet ground and bubbling briefly. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="sig_grasp"></a>

#### SIG_GRASP — Mire Mother grasping ring

- [ ] **P2 · One Shot · 1.1 s · 2 variations**
- **Filename:** `sig_grasp_v01.wav` through `_v02.wav`
- **Current:** Shared — existing material/legacy cues; bespoke recording proposed.

**Used by:** `Enemy brood_mother`, `Enemy mire_mother`.

```text
One isolated 1.1-second sound effect: large wet roots wrenching upward around a hollow space, mud suction and strained wood. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="sig_gold_chains"></a>

#### SIG_GOLD_CHAINS — Azram Chains of Khal-Zahir

- [ ] **P2 · One Shot · 1 s · 2 variations**
- **Filename:** `sig_gold_chains_v01.wav` through `_v02.wav`
- **Current:** Shared — existing material/legacy cues; bespoke recording proposed.

**Used by:** `Enemy azram`, `Enemy vethriss`.

```text
One isolated 1-second sound effect: heavy gold chains whipping outward and pulling taut with a ringing metallic snap. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="sig_gold_cone"></a>

#### SIG_GOLD_CONE — Azram molten-gold cone

- [ ] **P2 · One Shot · 1.2 s · 2 variations**
- **Filename:** `sig_gold_cone_v01.wav` through `_v02.wav`
- **Current:** Shared — existing material/legacy cues; bespoke recording proposed.

**Used by:** `Enemy azram`.

```text
One isolated 1.2-second sound effect: dense molten metal pouring in a forceful short fan, searing hiss and heavy liquid splatter. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="sig_boss_portal"></a>

#### SIG_BOSS_PORTAL — Azram Portal to the Past opens

- [ ] **P2 · One Shot · 1.2 s · 2 variations**
- **Filename:** `sig_boss_portal_v01.wav` through `_v02.wav`
- **Current:** Shared — existing material/legacy cues; bespoke recording proposed.

**Used by:** `Enemy azram`, `Enemy boss_portal`.

```text
One isolated 1.2-second sound effect: a stone-and-brass mechanism tearing open around a low pulsing air vortex. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="sig_boss_portal_break"></a>

#### SIG_BOSS_PORTAL_BREAK — Destroy an Azram portal

- [ ] **P2 · One Shot · 1.1 s · 2 variations**
- **Filename:** `sig_boss_portal_break_v01.wav` through `_v02.wav`
- **Current:** Shared — existing material/legacy cues; bespoke recording proposed.

**Used by:** `Enemy azram`, `Enemy boss_portal`.

```text
One isolated 1.1-second sound effect: a strained brass ring and crystal core breaking, air abruptly sucked inward. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="sig_wing_blades"></a>

#### SIG_WING_BLADES — Empty Archangel wing projectiles

- [ ] **P2 · One Shot · 0.8 s · 2 variations**
- **Filename:** `sig_wing_blades_v01.wav` through `_v02.wav`
- **Current:** Shared — existing material/legacy cues; bespoke recording proposed.

**Used by:** `Enemy empty_archangel`.

```text
One isolated 0.8-second sound effect: several separate sharp metallic feather slices launched with thin cold air swishes. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="sig_descent"></a>

#### SIG_DESCENT — Empty Archangel descent contact

- [ ] **P2 · One Shot · 0.8 s · 2 variations**
- **Filename:** `sig_descent_v01.wav` through `_v02.wav`
- **Current:** Shared — existing material/legacy cues; bespoke recording proposed.

**Used by:** `Enemy empty_archangel`.

```text
One isolated 0.8-second sound effect: one heavy body landing on stone with a final wing snap and a short dry ground fracture. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="sig_cross"></a>

#### SIG_CROSS — Empty Archangel separately released cross strike

- [ ] **P2 · One Shot · 0.65 s · 2 variations**
- **Filename:** `sig_cross_v01.wav` through `_v02.wav`
- **Current:** Shared — existing material/legacy cues; bespoke recording proposed.

**Used by:** `Enemy empty_archangel`.

```text
One isolated 0.65-second sound effect: two intersecting cold pressure cracks spreading across stone in one sharp crystalline burst. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="sig_quieting_chains"></a>

#### SIG_QUIETING_CHAINS — Malthoron Quieting Chains

- [ ] **P2 · One Shot · 1 s · 2 variations**
- **Filename:** `sig_quieting_chains_v01.wav` through `_v02.wav`
- **Current:** Shared — existing material/legacy cues; bespoke recording proposed.

**Used by:** `Enemy malthoron`.

```text
One isolated 1-second sound effect: hollow iron chains snapping around an airy spectral pressure pulse, cold and restrained. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="sig_armor_break"></a>

#### SIG_ARMOR_BREAK — Malthoron loses armor

- [ ] **P2 · One Shot · 1.5 s · 2 variations**
- **Filename:** `sig_armor_break_v01.wav` through `_v02.wav`
- **Current:** Shared — existing material/legacy cues; bespoke recording proposed.

**Used by:** `Enemy malthoron`.

```text
One isolated 1.5-second sound effect: several heavy hollow armor plates tearing free and striking stone independently. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="sig_soul_volley"></a>

#### SIG_SOUL_VOLLEY — Malthoron soul volley

- [ ] **P2 · One Shot · 0.85 s · 2 variations**
- **Filename:** `sig_soul_volley_v01.wav` through `_v02.wav`
- **Current:** Shared — existing material/legacy cues; bespoke recording proposed.

**Used by:** `Enemy bone_dragon`, `Enemy malthoron`.

```text
One isolated 0.85-second sound effect: three short nonverbal breath-like bolts snapping outward with hollow air tails. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="sig_beam"></a>

#### SIG_BEAM — Malthoron soul beam or Vethriss remembered beam onset

- [ ] **P2 · One Shot · 1.1 s · 2 variations**
- **Filename:** `sig_beam_v01.wav` through `_v02.wav`
- **Current:** Shared — existing material/legacy cues; bespoke recording proposed.

**Used by:** `Enemy malthoron`, `Enemy vethriss`.

```text
One isolated 1.1-second sound effect: a concentrated spectral pressure surge focusing into a harsh airy beam, no musical tone. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="sig_borrowed_light"></a>

#### SIG_BORROWED_LIGHT — Vethriss false Seraneth attack

- [ ] **P2 · One Shot · 0.7 s · 2 variations**
- **Filename:** `sig_borrowed_light_v01.wav` through `_v02.wav`
- **Current:** Shared — existing material/legacy cues; bespoke recording proposed.

**Used by:** `Enemy vethriss`.

```text
One isolated 0.7-second sound effect: a clean glass-like light flash with a rough dark air undertone beneath the impact. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="sig_serpent_lunge"></a>

#### SIG_SERPENT_LUNGE — Vethriss serpent rush

- [ ] **P2 · One Shot · 0.9 s · 2 variations**
- **Filename:** `sig_serpent_lunge_v01.wav` through `_v02.wav`
- **Current:** Shared — existing material/legacy cues; bespoke recording proposed.

**Used by:** `Enemy vethriss`.

```text
One isolated 0.9-second sound effect: an immense scaled body surging forward, violent hiss and compact heavy impact. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="sig_decoy"></a>

#### SIG_DECOY — Vethriss illusion appears or shadow lane fires

- [ ] **P2 · One Shot · 0.8 s · 2 variations**
- **Filename:** `sig_decoy_v01.wav` through `_v02.wav`
- **Current:** Shared — existing material/legacy cues; bespoke recording proposed.

**Used by:** `Enemy boss_decoy`, `Enemy vethriss`.

```text
One isolated 0.8-second sound effect: a thin hollow air body splitting away with a sharp wispy crack and a short rushing tail. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="sig_decoy_break"></a>

#### SIG_DECOY_BREAK — Vethriss illusion destroyed

- [ ] **P2 · One Shot · 0.5 s · 2 variations**
- **Filename:** `sig_decoy_break_v01.wav` through `_v02.wav`
- **Current:** Shared — existing material/legacy cues; bespoke recording proposed.

**Used by:** `Enemy boss_decoy`, `Enemy vethriss`.

```text
One isolated 0.5-second sound effect: a fragile air shell puncturing and evaporating with one dry inward pop. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="sig_choir_summon"></a>

#### SIG_CHOIR_SUMMON — Choir summon or Mending Litany

- [ ] **P2 · One Shot · 1 s · 2 variations**
- **Filename:** `sig_choir_summon_v01.wav` through `_v02.wav`
- **Current:** Shared — existing material/legacy cues; bespoke recording proposed.

**Used by:** `Act II profile lure_child`, `Act IV profile cathedral_priest_guardian`, `Act IV profile choir_priest`, `Enemy choir_herald`, `Enemy choir_priest`, `Enemy choirmaster`, `Enemy r79_warlord`, `Enemy r86_knight`, `Enemy r93_brute`, `Enemy vicar`.

```text
One isolated 1-second sound effect: a short breathy cluster of nonverbal throat resonances swelling and cutting off, no melody. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="sig_requiem"></a>

#### SIG_REQUIEM — Choirmaster Dissonant Requiem

- [ ] **P2 · One Shot · 1.5 s · 2 variations**
- **Filename:** `sig_requiem_v01.wav` through `_v02.wav`
- **Current:** Shared — existing material/legacy cues; bespoke recording proposed.

**Used by:** `Enemy choirmaster`.

```text
One isolated 1.5-second sound effect: several distant hollow pressure strikes falling into a short coarse shadow impact. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="sig_chorus"></a>

#### SIG_CHORUS — Echoing Priest Quieting Chorus

- [ ] **P2 · One Shot · 1 s · 2 variations**
- **Filename:** `sig_chorus_v01.wav` through `_v02.wav`
- **Current:** Shared — existing material/legacy cues; bespoke recording proposed.

**Used by:** `Act IV profile cathedral_priest_guardian`.

```text
One isolated 1-second sound effect: a compact dissonant nonverbal throat cluster bursting into a cold air ring. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="sig_crystal_fan"></a>

#### SIG_CRYSTAL_FAN — Shard Construct physical Crystal Fan

- [ ] **P2 · One Shot · 0.65 s · 2 variations**
- **Filename:** `sig_crystal_fan_v01.wav` through `_v02.wav`
- **Current:** Shared — existing material/legacy cues; bespoke recording proposed.

**Used by:** `Act III profile shard_construct`.

```text
One isolated 0.65-second sound effect: three separate hard crystal splinters launched with brittle ticks and dry air slices. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="sig_pulse"></a>

#### SIG_PULSE — Gilded Construct Sunderstone Pulse

- [ ] **P2 · One Shot · 0.8 s · 2 variations**
- **Filename:** `sig_pulse_v01.wav` through `_v02.wav`
- **Current:** Shared — existing material/legacy cues; bespoke recording proposed.

**Used by:** `Act III profile gilt_construct`.

```text
One isolated 0.8-second sound effect: an ancient metal-and-crystal core charging briefly then releasing one blunt electrical pressure snap. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="sig_split"></a>

#### SIG_SPLIT — Ooze or monster splits on death

- [ ] **P2 · One Shot · 0.9 s · 2 variations**
- **Filename:** `sig_split_v01.wav` through `_v02.wav`
- **Current:** Shared — existing material/legacy cues; bespoke recording proposed.

**Used by:** `Enemy caustic_ooze`, `Enemy r30_ooze`, `Enemy r39_imp`, `Enemy r48_robed`, `Enemy sludge_horror`.

```text
One isolated 0.9-second sound effect: a sticky organic body pulling into separate masses, wet elastic tears and small pops. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="sig_throw_body"></a>

#### SIG_THROW_BODY — Flesh Engine throws undead

- [ ] **P2 · One Shot · 1.1 s · 2 variations**
- **Filename:** `sig_throw_body_v01.wav` through `_v02.wav`
- **Current:** Shared — existing material/legacy cues; bespoke recording proposed.

**Used by:** `Enemy flesh_engine`.

```text
One isolated 1.1-second sound effect: a heavy limp body whipped through air with a rough heaving breath and final wet landing. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="sig_enrage"></a>

#### SIG_ENRAGE — Enemy enrage or frenzy onset

- [ ] **P2 · One Shot · 0.8 s · 2 variations**
- **Filename:** `sig_enrage_v01.wav` through `_v02.wav`
- **Current:** Shared — existing material/legacy cues; bespoke recording proposed.

**Used by:** `Enemy chained_sovereign`, `Enemy choirmaster`, `Enemy infernal_warlord`, `Enemy morthul`, `Enemy vellath`.

```text
One isolated 0.8-second sound effect: a short rough chest growl layered with strained muscle and equipment movement. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="sig_frost_breath"></a>

#### SIG_FROST_BREATH — Frostmaw Yeti cold breath

- [ ] **P2 · One Shot · 1.3 s · 2 variations**
- **Filename:** `sig_frost_breath_v01.wav` through `_v02.wav`
- **Current:** Shared — existing material/legacy cues; bespoke recording proposed.

**Used by:** `Enemy frost_wyrm`.

```text
One isolated 1.3-second sound effect: a powerful close animal exhale carrying a blizzard of icy grains, rough and nonmusical. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="bank-environmental-ambience"></a>

### Environmental ambience

<a id="amb_snow_wind"></a>

#### AMB_SNOW_WIND — North outdoor air

- [ ] **P3 · Loop · 30 s · 2 variations**
- **Filename:** `amb_snow_wind_v01.wav` through `_v02.wav`
- **Current:** Missing — dedicated nonmusical environmental bed.

**Used by:** `Area frosthaven_approach`, `Area north_wild`, `Area shardpeak_shrine`, `Area shattered_temple`.

```text
30-second seamless nonmusical ambience loop: cold wind threading through bare branches, intermittent fine snow sweeping over ground. Steady level, natural irregular detail, matching beginning and end, no opening hit or closing fade. Dark ambient horror game sound design. No music, melody, beat, intelligible words, or added cinematic score.
```

<a id="amb_hearth"></a>

#### AMB_HEARTH — Campfire, town hearth and title campfire

- [ ] **P3 · Loop · 30 s · 2 variations**
- **Filename:** `amb_hearth_v01.wav` through `_v02.wav`
- **Current:** Missing — dedicated nonmusical environmental bed.

**Used by:** `Area frosthaven`, `Area hellgate`, `Area khalcamp`, `Area marshcamp`, `Area town`.

```text
30-second seamless nonmusical ambience loop: a modest wood fire, dry close crackles and irregular soft pops. Steady level, natural irregular detail, matching beginning and end, no opening hit or closing fade. Dark ambient horror game sound design. No music, melody, beat, intelligible words, or added cinematic score.
```

<a id="amb_town_north"></a>

#### AMB_TOWN_NORTH — Frosthaven settlement

- [ ] **P3 · Loop · 30 s · 2 variations**
- **Filename:** `amb_town_north_v01.wav` through `_v02.wav`
- **Current:** Missing — dedicated nonmusical environmental bed.

**Used by:** `Area frosthaven`.

```text
30-second seamless nonmusical ambience loop: distant boots in snow, faint timber creaks and muted indistinct adult activity, no intelligible speech. Steady level, natural irregular detail, matching beginning and end, no opening hit or closing fade. Dark ambient horror game sound design. No music, melody, beat, intelligible words, or added cinematic score.
```

<a id="amb_mine"></a>

#### AMB_MINE — Abandoned Mines

- [ ] **P3 · Loop · 30 s · 2 variations**
- **Filename:** `amb_mine_v01.wav` through `_v02.wav`
- **Current:** Missing — dedicated nonmusical environmental bed.

**Used by:** `Area mines`.

```text
30-second seamless nonmusical ambience loop: low underground air, sparse drips and occasional faraway timber strain. Steady level, natural irregular detail, matching beginning and end, no opening hit or closing fade. Dark ambient horror game sound design. No music, melody, beat, intelligible words, or added cinematic score.
```

<a id="amb_ice_cave"></a>

#### AMB_ICE_CAVE — Deepfreeze Caverns

- [ ] **P3 · Loop · 30 s · 2 variations**
- **Filename:** `amb_ice_cave_v01.wav` through `_v02.wav`
- **Current:** Missing — dedicated nonmusical environmental bed.

**Used by:** `Area deepfreeze_cavern`.

```text
30-second seamless nonmusical ambience loop: cold enclosed air, distant ice stress cracks and very sparse frozen drips. Steady level, natural irregular detail, matching beginning and end, no opening hit or closing fade. Dark ambient horror game sound design. No music, melody, beat, intelligible words, or added cinematic score.
```

<a id="amb_marsh"></a>

#### AMB_MARSH — Marsh exterior

- [ ] **P3 · Loop · 30 s · 2 variations**
- **Filename:** `amb_marsh_v01.wav` through `_v02.wav`
- **Current:** Missing — dedicated nonmusical environmental bed.

**Used by:** `Area hollow_reeds`, `Area spawn_pools`, `Area weeping_marsh`.

```text
30-second seamless nonmusical ambience loop: low swamp insects, occasional water bubbles and reeds rubbing in damp wind. Steady level, natural irregular detail, matching beginning and end, no opening hit or closing fade. Dark ambient horror game sound design. No music, melody, beat, intelligible words, or added cinematic score.
```

<a id="amb_dock"></a>

#### AMB_DOCK — Greywater Landing

- [ ] **P3 · Loop · 30 s · 2 variations**
- **Filename:** `amb_dock_v01.wav` through `_v02.wav`
- **Current:** Missing — dedicated nonmusical environmental bed.

**Used by:** `Area hollow_reeds`, `Area marshcamp`.

```text
30-second seamless nonmusical ambience loop: water lapping beneath a creaking timber dock and loose rope rubbing against wood. Steady level, natural irregular detail, matching beginning and end, no opening hit or closing fade. Dark ambient horror game sound design. No music, melody, beat, intelligible words, or added cinematic score.
```

<a id="amb_flooded"></a>

#### AMB_FLOODED — Flooded monastery and crypts

- [ ] **P3 · Loop · 30 s · 2 variations**
- **Filename:** `amb_flooded_v01.wav` through `_v02.wav`
- **Current:** Missing — dedicated nonmusical environmental bed.

**Used by:** `Area drowned_crypt`, `Area ritual_site`.

```text
30-second seamless nonmusical ambience loop: isolated water drips into dark shallow pools and faint stone-room air. Steady level, natural irregular detail, matching beginning and end, no opening hit or closing fade. Dark ambient horror game sound design. No music, melody, beat, intelligible words, or added cinematic score.
```

<a id="amb_nest"></a>

#### AMB_NEST — Spawn pools and insect nests

- [ ] **P3 · Loop · 30 s · 2 variations**
- **Filename:** `amb_nest_v01.wav` through `_v02.wav`
- **Current:** Missing — dedicated nonmusical environmental bed.

**Used by:** `Area ritual_site`, `Area spawn_pools`.

```text
30-second seamless nonmusical ambience loop: soft wet organic bubbles and sporadic dry insect leg ticks. Steady level, natural irregular detail, matching beginning and end, no opening hit or closing fade. Dark ambient horror game sound design. No music, melody, beat, intelligible words, or added cinematic score.
```

<a id="amb_desert"></a>

#### AMB_DESERT — Desert exterior

- [ ] **P3 · Loop · 30 s · 2 variations**
- **Filename:** `amb_desert_v01.wav` through `_v02.wav`
- **Current:** Missing — dedicated nonmusical environmental bed.

**Used by:** `Area desert_wastes`, `Area sand_tombs`, `Area shard_flats`.

```text
30-second seamless nonmusical ambience loop: dry wind sweeping granular sand across stone, small irregular abrasive gusts. Steady level, natural irregular detail, matching beginning and end, no opening hit or closing fade. Dark ambient horror game sound design. No music, melody, beat, intelligible words, or added cinematic score.
```

<a id="amb_dig"></a>

#### AMB_DIG — Dig Camp

- [ ] **P3 · Loop · 30 s · 2 variations**
- **Filename:** `amb_dig_v01.wav` through `_v02.wav`
- **Current:** Missing — dedicated nonmusical environmental bed.

**Used by:** `Area khalcamp`.

```text
30-second seamless nonmusical ambience loop: faint hand tools tapping stone, canvas gently moving and distant sand brushing timber. Steady level, natural irregular detail, matching beginning and end, no opening hit or closing fade. Dark ambient horror game sound design. No music, melody, beat, intelligible words, or added cinematic score.
```

<a id="amb_tomb"></a>

#### AMB_TOMB — Sealed tomb air

- [ ] **P3 · Loop · 30 s · 2 variations**
- **Filename:** `amb_tomb_v01.wav` through `_v02.wav`
- **Current:** Missing — dedicated nonmusical environmental bed.

**Used by:** `Area khal_palace`, `Area sand_tombs`, `Area tomb_sanctum`, `Area underground_market`.

```text
30-second seamless nonmusical ambience loop: very quiet stale enclosed air with infrequent grains of stone falling. Steady level, natural irregular detail, matching beginning and end, no opening hit or closing fade. Dark ambient horror game sound design. No music, melody, beat, intelligible words, or added cinematic score.
```

<a id="amb_machine"></a>

#### AMB_MACHINE — Ancient market relays and palace machinery

- [ ] **P3 · Loop · 30 s · 2 variations**
- **Filename:** `amb_machine_v01.wav` through `_v02.wav`
- **Current:** Missing — dedicated nonmusical environmental bed.

**Used by:** `Area khal_palace`, `Area shard_flats`, `Area underground_market`.

```text
30-second seamless nonmusical ambience loop: slow irregular old bronze mechanisms creaking and ticking under subtle nonpitched electrical crackle. Steady level, natural irregular detail, matching beginning and end, no opening hit or closing fade. Dark ambient horror game sound design. No music, melody, beat, intelligible words, or added cinematic score.
```

<a id="amb_void"></a>

#### AMB_VOID — Cathedral islands above the void

- [ ] **P3 · Loop · 30 s · 2 variations**
- **Filename:** `amb_void_v01.wav` through `_v02.wav`
- **Current:** Missing — dedicated nonmusical environmental bed.

**Used by:** `Area cathedral1`, `Area cathedral2`, `Area cathedral_bastion`, `Area cathedral_cinderwatch`.

```text
30-second seamless nonmusical ambience loop: large empty air pressure passing beneath floating stone, remote restrained rock strain. Steady level, natural irregular detail, matching beginning and end, no opening hit or closing fade. Dark ambient horror game sound design. No music, melody, beat, intelligible words, or added cinematic score.
```

<a id="amb_memory"></a>

#### AMB_MEMORY — Memory-area distortion

- [ ] **P3 · Loop · 30 s · 2 variations**
- **Filename:** `amb_memory_v01.wav` through `_v02.wav`
- **Current:** Missing — dedicated nonmusical environmental bed.

**Used by:** `Area cathedral_bastion`, `Area cathedral_cinderwatch`.

```text
30-second seamless nonmusical ambience loop: faint dry architectural creaks and little air sounds repeating with subtle irregular displacement, no voices. Steady level, natural irregular detail, matching beginning and end, no opening hit or closing fade. Dark ambient horror game sound design. No music, melody, beat, intelligible words, or added cinematic score.
```

<a id="amb_hell"></a>

#### AMB_HELL — Cinderfields and infernal exterior

- [ ] **P3 · Loop · 30 s · 2 variations**
- **Filename:** `amb_hell_v01.wav` through `_v02.wav`
- **Current:** Missing — dedicated nonmusical environmental bed.

**Used by:** `Area ash_wastes`, `Area hellgate`, `Area throne`, `Hazard scorch`.

```text
30-second seamless nonmusical ambience loop: distant restrained lava bubbling, hot dry wind and low volcanic earth movement. Steady level, natural irregular detail, matching beginning and end, no opening hit or closing fade. Dark ambient horror game sound design. No music, melody, beat, intelligible words, or added cinematic score.
```

<a id="amb_fortress"></a>

#### AMB_FORTRESS — Cinder Bastion interior

- [ ] **P3 · Loop · 30 s · 2 variations**
- **Filename:** `amb_fortress_v01.wav` through `_v02.wav`
- **Current:** Missing — dedicated nonmusical environmental bed.

**Used by:** `Area cathedral2`, `Area cinder_bastion`, `Area throne`.

```text
30-second seamless nonmusical ambience loop: deep empty fortress air, faraway iron chain movement and faint furnace hiss. Steady level, natural irregular detail, matching beginning and end, no opening hit or closing fade. Dark ambient horror game sound design. No music, melody, beat, intelligible words, or added cinematic score.
```

<a id="amb_war"></a>

#### AMB_WAR — Distant demon infighting

- [ ] **P3 · Loop · 30 s · 2 variations**
- **Filename:** `amb_war_v01.wav` through `_v02.wav`
- **Current:** Missing — dedicated nonmusical environmental bed.

**Used by:** `Area ash_wastes`, `Area cinder_bastion`.

```text
30-second seamless nonmusical ambience loop: very distant scattered nonverbal monster calls and isolated metal impacts behind hot wind, no close combat. Steady level, natural irregular detail, matching beginning and end, no opening hit or closing fade. Dark ambient horror game sound design. No music, melody, beat, intelligible words, or added cinematic score.
```

<a id="amb_forest"></a>

#### AMB_FOREST — Blackbough woodland

- [ ] **P3 · Loop · 30 s · 2 variations**
- **Filename:** `amb_forest_v01.wav` through `_v02.wav`
- **Current:** Missing — dedicated nonmusical environmental bed.

**Used by:** `Area fields`, `Area forest`, `Area town`.

```text
30-second seamless nonmusical ambience loop: uneasy night woodland wind, dry branches rubbing and isolated small animal movement. Steady level, natural irregular detail, matching beginning and end, no opening hit or closing fade. Dark ambient horror game sound design. No music, melody, beat, intelligible words, or added cinematic score.
```

<a id="amb_crypt"></a>

#### AMB_CRYPT — Ashen Marches crypts

- [ ] **P3 · Loop · 30 s · 2 variations**
- **Filename:** `amb_crypt_v01.wav` through `_v02.wav`
- **Current:** Missing — dedicated nonmusical environmental bed.

**Used by:** `Area chapel`, `Area crypt1`, `Area crypt2`, `Area monastery1`, `Area monastery2`, `Area shattered_temple`.

```text
30-second seamless nonmusical ambience loop: stale tomb air, rare dusty stone grains dropping and faint distant wooden strain. Steady level, natural irregular detail, matching beginning and end, no opening hit or closing fade. Dark ambient horror game sound design. No music, melody, beat, intelligible words, or added cinematic score.
```

<a id="amb_lava"></a>

#### AMB_LAVA — Lava hazard and furnace proximity

- [ ] **P3 · Loop · 30 s · 2 variations**
- **Filename:** `amb_lava_v01.wav` through `_v02.wav`
- **Current:** Missing — dedicated nonmusical environmental bed.

**Used by:** `Hazard lava`.

```text
30-second seamless nonmusical ambience loop: thick molten rock bubbling with irregular crust cracks and a subdued searing hiss. Steady level, natural irregular detail, matching beginning and end, no opening hit or closing fade. Dark ambient horror game sound design. No music, melody, beat, intelligible words, or added cinematic score.
```

<a id="amb_bog"></a>

#### AMB_BOG — Bog pit, blood mire and quicksand suction

- [ ] **P3 · Loop · 30 s · 2 variations**
- **Filename:** `amb_bog_v01.wav` through `_v02.wav`
- **Current:** Missing — dedicated nonmusical environmental bed.

**Used by:** `Hazard blood`, `Hazard bog`, `Hazard quicksand`.

```text
30-second seamless nonmusical ambience loop: very soft thick ground bubbling and wet mud pulling slowly inward. Steady level, natural irregular detail, matching beginning and end, no opening hit or closing fade. Dark ambient horror game sound design. No music, melody, beat, intelligible words, or added cinematic score.
```

<a id="amb_spore"></a>

#### AMB_SPORE — Spore-bed proximity

- [ ] **P3 · Loop · 30 s · 2 variations**
- **Filename:** `amb_spore_v01.wav` through `_v02.wav`
- **Current:** Missing — dedicated nonmusical environmental bed.

**Used by:** `Hazard spore`.

```text
30-second seamless nonmusical ambience loop: soft fungal air puffs with tiny wet capsule pops, restrained and irregular. Steady level, natural irregular detail, matching beginning and end, no opening hit or closing fade. Dark ambient horror game sound design. No music, melody, beat, intelligible words, or added cinematic score.
```

<a id="amb_spring"></a>

#### AMB_SPRING — Frozen Spring proximity

- [ ] **P3 · Loop · 30 s · 2 variations**
- **Filename:** `amb_spring_v01.wav` through `_v02.wav`
- **Current:** Missing — dedicated nonmusical environmental bed.

**Used by:** `Area deepfreeze_cavern`, `Hazard spring`.

```text
30-second seamless nonmusical ambience loop: a small stream slipping beneath ice, soft water trickle and tiny ice ticks. Steady level, natural irregular detail, matching beginning and end, no opening hit or closing fade. Dark ambient horror game sound design. No music, melody, beat, intelligible words, or added cinematic score.
```

<a id="bank-environmental-details-and-finale"></a>

### Environmental details and finale

<a id="env_bell"></a>

#### ENV_BELL — Occasional chapel bell

- [ ] **P3 · One Shot · 4 s · 2 variations**
- **Filename:** `env_bell_v01.wav` through `_v02.wav`
- **Current:** Missing — dedicated environmental/story accent.

**Used by:** `Area chapel`, `Area monastery1`, `Area monastery2`.

```text
One isolated 4-second sound effect: one very distant cracked iron church bell with a thin uneven decay. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="env_rubble"></a>

#### ENV_RUBBLE — Cathedral reconstruction or unstable stone

- [ ] **P3 · One Shot · 2.5 s · 2 variations**
- **Filename:** `env_rubble_v01.wav` through `_v02.wav`
- **Current:** Missing — dedicated environmental/story accent.

**Used by:** `Area cathedral1`.

```text
One isolated 2.5-second sound effect: old architectural blocks grinding into place and small rubble falling, no explosion. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="env_ice_crack"></a>

#### ENV_ICE_CRACK — Distant glacier crack

- [ ] **P3 · One Shot · 2.5 s · 2 variations**
- **Filename:** `env_ice_crack_v01.wav` through `_v02.wav`
- **Current:** Missing — dedicated environmental/story accent.

**Used by:** `Area frosthaven_approach`, `Area north_wild`, `Area shardpeak_shrine`.

```text
One isolated 2.5-second sound effect: one faraway deep ice stress crack followed by fine brittle fractures. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="env_wood_creak"></a>

#### ENV_WOOD_CREAK — Unsettling mine, dock or forest detail

- [ ] **P3 · One Shot · 1.8 s · 2 variations**
- **Filename:** `env_wood_creak_v01.wav` through `_v02.wav`
- **Current:** Missing — dedicated environmental/story accent.

**Used by:** `Area drowned_crypt`, `Area forest`, `Area mines`.

```text
One isolated 1.8-second sound effect: one old timber beam bending and creaking, dry and slowly strained. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="env_ash_gust"></a>

#### ENV_ASH_GUST — Occasional volcanic gust

- [ ] **P3 · One Shot · 2 s · 2 variations**
- **Filename:** `env_ash_gust_v01.wav` through `_v02.wav`
- **Current:** Missing — dedicated environmental/story accent.

**Used by:** `Area ash_wastes`, `Area fields`.

```text
One isolated 2-second sound effect: a hot dry wind gust carrying ash grains across rough stone. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="env_core_break"></a>

#### ENV_CORE_BREAK — Destroy the Core ending

- [ ] **P2 · One Shot · 3 s · 2 variations**
- **Filename:** `env_core_break_v01.wav` through `_v02.wav`
- **Current:** Missing — dedicated environmental/story accent.

**Used by:** `Ending destroy`.

```text
One isolated 3-second sound effect: one ancient crystal core fracturing, an expanding rough air release and scattered glass-like shards. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="env_core_seal"></a>

#### ENV_CORE_SEAL — Seal It Away ending

- [ ] **P2 · One Shot · 3 s · 2 variations**
- **Filename:** `env_core_seal_v01.wav` through `_v02.wav`
- **Current:** Missing — dedicated environmental/story accent.

**Used by:** `Ending seal`.

```text
One isolated 3-second sound effect: heavy runic stone layers locking shut around a hollow resonance that subsides. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

<a id="env_core_give"></a>

#### ENV_CORE_GIVE — Give It to Seraneth ending

- [ ] **P2 · One Shot · 2.5 s · 2 variations**
- **Filename:** `env_core_give_v01.wav` through `_v02.wav`
- **Current:** Missing — dedicated environmental/story accent.

**Used by:** `Ending give`.

```text
One isolated 2.5-second sound effect: a fragile crystalline object transferred into gloved hands as a thin air rift softly closes. Immediate readable onset, natural decay to silence, clean close recording with minimal room tail. Dark fantasy horror game sound design. No music, rhythm track, spoken words, or unrelated background sounds.
```

## All class skills and basic attacks

These are proposed production mappings over the current 108 audio recipes. **A** = successful activation/preparation; **R** = actual release; **I** = real contact/detonation; **S** = live-emitter sustain; **E** = expiry/reversion; **T** = conditional passive trigger. A phase absent from a row needs no dedicated cue. Layer quieter material accents into the same event; do not stack all listed phases at cast start. If an attack misses, omit I. Damage conversion uses the resolved elemental contact material: fire → MAT_FIRE, cold → MAT_FROST, lightning (`light`) → MAT_SPARK, shadow → MAT_HEX, poison → MAT_ROT, earth → MAT_STONE.

Every active skill already has a recorded recipe; signature and loop assets listed here are replacement/addition briefs. Eleven passives are intentionally silent; seven have conditional recipes. No continuous audio is required for statistical bonuses. Skill sustain must end on interruption, pause, death, respec, emitter expiry, travel or leaving play. Keep held bow tension, Soul Siphon and live spell fields quiet under their impacts.

| Basic attack mode | A / R / I material sequence |
| --- | --- |
| melee | [MAT_CLOTH](#mat_cloth), [MAT_BLADE](#mat_blade), [MAT_STEEL](#mat_steel) |
| ranged | [MAT_DRAW](#mat_draw), [MAT_BOW](#mat_bow), [MAT_ARROW](#mat_arrow) |
| beast | [MAT_ROOTS](#mat_roots), [MAT_GROWL](#mat_growl), [MAT_BLOOD](#mat_blood) |

### Vanguard

| Skill / exact ID | Current family and coverage | Required cues | Timing / silence rule |
| --- | --- | --- | --- |
| Tempo Strike<br>`vanguard_0_0` | Recorded / steel | **A:** [MAT_CLOTH](#mat_cloth)<br>**R:** [MAT_BLADE](#mat_blade)<br>**I:** [MAT_STEEL](#mat_steel) |  |
| Sunder Combo<br>`vanguard_0_1` | Recorded / steel | **A:** [MAT_CLOTH](#mat_cloth)<br>**R:** [MAT_BLADE](#mat_blade), [MAT_SHIELD](#mat_shield)<br>**I:** [MAT_STEEL](#mat_steel) |  |
| Riposte Stance<br>`vanguard_0_2` | Recorded / shield | **A:** [MAT_CLOTH](#mat_cloth)<br>**R:** [MAT_SHIELD](#mat_shield), [MAT_CHAIN](#mat_chain)<br>**E:** [STATUS_DISPEL](#status_dispel) | Activation and expiry only; no continuous buff hum. |
| Weapon Mastery<br>`vanguard_0_3` | Intentionally silent / steel | Intentionally silent | Intentionally silent: passive statistics or inherited attack modifiers; ordinary hit feedback remains. |
| Berserker Stance<br>`vanguard_0_4` | Recorded / blood | **A:** [MAT_CLOTH](#mat_cloth)<br>**R:** [MAT_BLADE](#mat_blade)<br>**E:** [STATUS_DISPEL](#status_dispel) | Activation and expiry only; no continuous buff hum. |
| Bulwark Stance<br>`vanguard_0_5` | Recorded / shield | **A:** [MAT_CLOTH](#mat_cloth)<br>**R:** [MAT_SHIELD](#mat_shield)<br>**E:** [STATUS_DISPEL](#status_dispel) | Activation and expiry only; no continuous buff hum. |
| Headtaker<br>`vanguard_0_6` | Recorded / blood | **A:** [MAT_CLOTH](#mat_cloth)<br>**R:** [MAT_BLADE](#mat_blade), [MAT_BLOOD](#mat_blood)<br>**I:** [MAT_BLOOD](#mat_blood) |  |
| Rallying Cry<br>`vanguard_1_0` | Recorded / warcry | **A:** [MAT_BREATH](#mat_breath)<br>**R:** [MAT_HOWL](#mat_howl) |  |
| Terrifying Bellow<br>`terrifying_bellow` | Recorded / warcry | **A:** [MAT_BREATH](#mat_breath)<br>**R:** [MAT_HOWL](#mat_howl) |  |
| War Banner<br>`vanguard_1_2` | Recorded / banner | **A:** [MAT_CLOTH](#mat_cloth)<br>**R:** [MAT_CHAIN](#mat_chain), [MAT_CLOTH](#mat_cloth)<br>**E:** [STATUS_DISPEL](#status_dispel) | Activation and expiry only; no continuous buff hum. |
| Iron Will<br>`vanguard_1_3` | Intentionally silent / steel | Intentionally silent | Intentionally silent: passive statistics or inherited attack modifiers; ordinary hit feedback remains. |
| Sundering Roar<br>`vanguard_1_4` | Recorded / warcry | **A:** [MAT_BREATH](#mat_breath)<br>**R:** [MAT_HOWL](#mat_howl) |  |
| Standard of the Last Stand<br>`vanguard_1_5` | Recorded / banner | **A:** [MAT_CLOTH](#mat_cloth)<br>**R:** [MAT_CHAIN](#mat_chain), [MAT_CLOTH](#mat_cloth)<br>**E:** [STATUS_DISPEL](#status_dispel) | Activation and expiry only; no continuous buff hum. |
| Bull Charge<br>`vanguard_2_0` | Recorded / earth | **A:** [MAT_ROOTS](#mat_roots)<br>**R:** [MAT_STONE](#mat_stone), [MAT_CLOTH](#mat_cloth)<br>**I:** [MAT_STONE](#mat_stone) |  |
| Harpoon Chain<br>`vanguard_2_1` | Recorded / chain | **A:** [MAT_CHAIN](#mat_chain)<br>**R:** [MAT_CHAIN](#mat_chain), [MAT_LATCH](#mat_latch)<br>**I:** [MAT_STEEL](#mat_steel) |  |
| Returning Axe<br>`vanguard_2_2` | Recorded / steel | **A:** [MAT_CLOTH](#mat_cloth)<br>**R:** [MAT_BLADE](#mat_blade), [MAT_STEEL](#mat_steel)<br>**I:** [MAT_STEEL](#mat_steel) |  |
| Fleet of Foot<br>`vanguard_2_3` | Intentionally silent / earth | Intentionally silent | Intentionally silent: passive statistics or inherited attack modifiers; ordinary hit feedback remains. |
| Seismic Slam<br>`ground_slam` | Recorded / earth | **A:** [MAT_ROOTS](#mat_roots)<br>**R:** [MAT_STONE](#mat_stone), [MAT_ROOTS](#mat_roots)<br>**I:** [MAT_STONE](#mat_stone), [SIG_FISSURE](#sig_fissure) |  |
| Shield Breaker<br>`vanguard_2_5` | Recorded / shield | **A:** [MAT_CLOTH](#mat_cloth)<br>**R:** [MAT_SHIELD](#mat_shield), [MAT_CHAIN](#mat_chain)<br>**I:** [MAT_SHIELD](#mat_shield) |  |
| Skyfall Leap<br>`vanguard_2_6` | Recorded / earth | **A:** [MAT_ROOTS](#mat_roots)<br>**R:** [MAT_STONE](#mat_stone), [MAT_ROOTS](#mat_roots)<br>**I:** [MAT_STONE](#mat_stone) |  |

### Ember Witch

| Skill / exact ID | Current family and coverage | Required cues | Timing / silence rule |
| --- | --- | --- | --- |
| Emberbolt<br>`emberwitch_0_0` | Recorded / fire | **A:** [MAT_CLOTH](#mat_cloth)<br>**R:** [MAT_EMBER](#mat_ember)<br>**I:** [MAT_FIRE](#mat_fire) |  |
| Fan of Cinders<br>`emberwitch_0_1` | Recorded / fire | **A:** [MAT_CLOTH](#mat_cloth)<br>**R:** [MAT_EMBER](#mat_ember)<br>**I:** [MAT_FIRE](#mat_fire) |  |
| Heat Haze<br>`emberwitch_0_2` | Recorded conditional / fire | **T:** [MAT_FIRE](#mat_fire) | Heat Haze fire trigger; one quiet accent at the actual trigger, never a loop. |
| Wall of Fire<br>`emberwitch_0_3` | Recorded / fire | **A:** [MAT_CLOTH](#mat_cloth)<br>**R:** [MAT_EMBER](#mat_ember)<br>**I:** [MAT_FIRE](#mat_fire)<br>**S:** [LOOP_FIRE](#loop_fire)<br>**E:** [MAT_EMBER](#mat_ember) |  |
| Meteor<br>`emberwitch_0_4` | Recorded / fire | **A:** [MAT_CLOTH](#mat_cloth)<br>**R:** [MAT_EMBER](#mat_ember), [MAT_THUNDER](#mat_thunder)<br>**I:** [MAT_FIRE](#mat_fire), [SIG_METEOR](#sig_meteor) |  |
| Pyre<br>`emberwitch_0_5` | Recorded / fire | **A:** [MAT_CLOTH](#mat_cloth)<br>**R:** [MAT_EMBER](#mat_ember)<br>**I:** [MAT_FIRE](#mat_fire) |  |
| Inferno<br>`emberwitch_0_6` | Recorded / fire | **A:** [MAT_CLOTH](#mat_cloth)<br>**R:** [MAT_EMBER](#mat_ember), [MAT_THUNDER](#mat_thunder)<br>**I:** [MAT_FIRE](#mat_fire)<br>**S:** [LOOP_FIRE](#loop_fire)<br>**E:** [MAT_EMBER](#mat_ember) |  |
| Frost Shard<br>`emberwitch_1_0` | Recorded / frost | **A:** [MAT_CLOTH](#mat_cloth)<br>**R:** [MAT_ICE](#mat_ice)<br>**I:** [MAT_FROST](#mat_frost) |  |
| Frost Nova<br>`emberwitch_1_1` | Recorded / frost | **A:** [MAT_CLOTH](#mat_cloth)<br>**R:** [MAT_ICE](#mat_ice)<br>**I:** [MAT_FROST](#mat_frost) |  |
| Brittle Bones<br>`emberwitch_1_2` | Recorded conditional / frost | **T:** [MAT_FROST](#mat_frost) | Brittle Bones frozen-contact trigger; one quiet accent at the actual trigger, never a loop. |
| Ice Lance<br>`emberwitch_1_3` | Recorded / frost | **A:** [MAT_CLOTH](#mat_cloth)<br>**R:** [MAT_ICE](#mat_ice)<br>**I:** [MAT_FROST](#mat_frost) |  |
| Frostbite<br>`emberwitch_1_4` | Recorded / frost | **A:** [MAT_CLOTH](#mat_cloth)<br>**R:** [MAT_ICE](#mat_ice)<br>**I:** [MAT_FROST](#mat_frost) |  |
| Rimeguard<br>`rimeguard` | Recorded / frost | **A:** [MAT_CLOTH](#mat_cloth)<br>**R:** [MAT_ICE](#mat_ice)<br>**E:** [STATUS_DISPEL](#status_dispel) | Activation and expiry only; no continuous buff hum. Use elemental contact only when the defensive effect actually fires. |
| Glacier<br>`emberwitch_1_6` | Recorded / frost | **A:** [MAT_CLOTH](#mat_cloth)<br>**R:** [MAT_ICE](#mat_ice), [MAT_STONE](#mat_stone)<br>**I:** [MAT_FROST](#mat_frost), [SIG_GLACIER](#sig_glacier)<br>**S:** [LOOP_FROST](#loop_frost)<br>**E:** [MAT_ICE](#mat_ice) |  |
| Spark<br>`spark` | Recorded / storm | **A:** [MAT_CLOTH](#mat_cloth)<br>**R:** [MAT_SPARK](#mat_spark)<br>**I:** [MAT_SPARK](#mat_spark) |  |
| Stormshell<br>`stormshell` | Recorded / storm | **A:** [MAT_CLOTH](#mat_cloth)<br>**R:** [MAT_SPARK](#mat_spark)<br>**E:** [STATUS_DISPEL](#status_dispel) | Activation and expiry only; no continuous buff hum. Use elemental contact only when the defensive effect actually fires. |
| Chain Lightning<br>`emberwitch_2_2` | Recorded / storm | **A:** [MAT_CLOTH](#mat_cloth)<br>**R:** [MAT_SPARK](#mat_spark)<br>**I:** [MAT_SPARK](#mat_spark) |  |
| Ball Lightning<br>`emberwitch_2_3` | Recorded / storm | **A:** [MAT_CLOTH](#mat_cloth)<br>**R:** [MAT_SPARK](#mat_spark)<br>**I:** [MAT_SPARK](#mat_spark)<br>**S:** [LOOP_STORM](#loop_storm)<br>**E:** [MAT_WIND](#mat_wind) |  |
| Arc Teleport<br>`emberwitch_2_4` | Recorded / storm | **A:** [MAT_CLOTH](#mat_cloth)<br>**R:** [MAT_SPARK](#mat_spark)<br>**I:** [MAT_SPARK](#mat_spark) |  |
| Static Field<br>`emberwitch_2_5` | Recorded / storm | **A:** [MAT_CLOTH](#mat_cloth)<br>**R:** [MAT_SPARK](#mat_spark)<br>**I:** [MAT_SPARK](#mat_spark)<br>**S:** [LOOP_STORM](#loop_storm)<br>**E:** [MAT_WIND](#mat_wind) |  |
| Overload<br>`emberwitch_2_6` | Recorded / storm | **A:** [MAT_CLOTH](#mat_cloth)<br>**R:** [MAT_SPARK](#mat_spark), [MAT_THUNDER](#mat_thunder)<br>**I:** [MAT_SPARK](#mat_spark), [SIG_OVERLOAD](#sig_overload) |  |

### Gravebinder

| Skill / exact ID | Current family and coverage | Required cues | Timing / silence rule |
| --- | --- | --- | --- |
| Raise Dead<br>`raise_dead` | Recorded / bone | **A:** [MAT_BONE](#mat_bone)<br>**R:** [MAT_BONE](#mat_bone), [SIG_BONE_RAISE](#sig_bone_raise)<br>**I:** [MAT_BONE](#mat_bone) | Release on successful creation/stitch; I belongs to subsequent minion hits. Creature voices and movement use the companion table. |
| Raise Plague Mage<br>`raise_plaguemage` | Recorded / poison | **A:** [MAT_CLOTH](#mat_cloth)<br>**R:** [MAT_ROT](#mat_rot)<br>**I:** [MAT_ROT](#mat_rot) | Release on successful creation/stitch; I belongs to subsequent minion hits. Creature voices and movement use the companion table. |
| Bone Golem<br>`gravebinder_0_2` | Recorded / bone | **A:** [MAT_BONE](#mat_bone)<br>**R:** [MAT_BONE](#mat_bone), [MAT_STONE](#mat_stone), [SIG_BONE_RAISE](#sig_bone_raise)<br>**I:** [MAT_BONE](#mat_bone) | Release on successful creation/stitch; I belongs to subsequent minion hits. Creature voices and movement use the companion table. |
| Marrow Pact<br>`gravebinder_0_3` | Recorded conditional / bone | **T:** [MAT_BONE](#mat_bone) | Marrow Pact minion trigger; one quiet accent at the actual trigger, never a loop. |
| Bone Armor<br>`gravebinder_0_4` | Recorded / bone | **A:** [MAT_BONE](#mat_bone)<br>**R:** [MAT_BONE](#mat_bone)<br>**E:** [STATUS_DISPEL](#status_dispel) | Activation and expiry only; no continuous buff hum. |
| Bone Spear<br>`gravebinder_0_5` | Recorded / bone | **A:** [MAT_BONE](#mat_bone)<br>**R:** [MAT_BONE](#mat_bone), [MAT_BLADE](#mat_blade)<br>**I:** [MAT_HEX](#mat_hex) |  |
| Dread Muster<br>`dread_muster` | Recorded / warcry | **A:** [MAT_BREATH](#mat_breath)<br>**R:** [MAT_HOWL](#mat_howl), [MAT_BONE](#mat_bone)<br>**E:** [STATUS_DISPEL](#status_dispel) | Activation and expiry only; no continuous buff hum. |
| Sacrificial Pyre<br>`gravebinder_0_7` | Recorded / fire | **A:** [MAT_CLOTH](#mat_cloth)<br>**R:** [MAT_EMBER](#mat_ember), [MAT_BLOOD](#mat_blood)<br>**I:** [MAT_FIRE](#mat_fire), [SIG_CORPSE_BURST](#sig_corpse_burst) |  |
| Mark of Frailty<br>`mark_of_frailty` | Recorded / hex | **A:** [MAT_SHADOW](#mat_shadow)<br>**R:** [MAT_HEX](#mat_hex)<br>**I:** [MAT_HEX](#mat_hex) |  |
| Withering Hex<br>`withering_hex` | Recorded / poison | **A:** [MAT_CLOTH](#mat_cloth)<br>**R:** [MAT_ROT](#mat_rot)<br>**I:** [MAT_ROT](#mat_rot) |  |
| Doom<br>`gravebinder_1_2` | Recorded / hex | **A:** [MAT_SHADOW](#mat_shadow)<br>**R:** [MAT_HEX](#mat_hex)<br>**I:** [MAT_HEX](#mat_hex) |  |
| Hex of Beckoning<br>`gravebinder_1_3` | Recorded / hex | **A:** [MAT_SHADOW](#mat_shadow)<br>**R:** [MAT_HEX](#mat_hex)<br>**I:** [MAT_HEX](#mat_hex) |  |
| Grave Whispers<br>`gravebinder_1_4` | Recorded conditional / hex | **T:** [MAT_HEX](#mat_hex) | Grave Whispers curse-transfer trigger; one quiet accent at the actual trigger, never a loop. |
| Soul Siphon<br>`gravebinder_1_5` | Recorded / hex | **A:** [MAT_SHADOW](#mat_shadow)<br>**R:** [MAT_HEX](#mat_hex), [MAT_BREATH](#mat_breath)<br>**I:** [MAT_HEX](#mat_hex)<br>**S:** [LOOP_HEX](#loop_hex)<br>**E:** [MAT_BREATH](#mat_breath) |  |
| Soul Harvest<br>`gravebinder_1_6` | Recorded conditional / hex | **T:** [MAT_HEX](#mat_hex) | Soul Harvest kill trigger; one quiet accent at the actual trigger, never a loop. |
| Reaping<br>`gravebinder_1_7` | Recorded / hex | **A:** [MAT_SHADOW](#mat_shadow)<br>**R:** [MAT_HEX](#mat_hex), [MAT_BLADE](#mat_blade)<br>**I:** [MAT_HEX](#mat_hex) |  |
| Venom Spit<br>`venom_spit` | Recorded / poison | **A:** [MAT_CLOTH](#mat_cloth)<br>**R:** [MAT_ROT](#mat_rot)<br>**I:** [MAT_ROT](#mat_rot) |  |
| Contagion<br>`gravebinder_2_1` | Recorded / poison | **A:** [MAT_CLOTH](#mat_cloth)<br>**R:** [MAT_ROT](#mat_rot)<br>**I:** [MAT_ROT](#mat_rot) |  |
| Miasma<br>`gravebinder_2_2` | Recorded / poison | **A:** [MAT_CLOTH](#mat_cloth)<br>**R:** [MAT_ROT](#mat_rot)<br>**I:** [MAT_ROT](#mat_rot)<br>**S:** [LOOP_POISON](#loop_poison)<br>**E:** [MAT_ROT](#mat_rot) |  |
| Carrion Bloom<br>`gravebinder_2_3` | Intentionally silent / poison | Intentionally silent | Intentionally silent: passive statistics or inherited attack modifiers; ordinary hit feedback remains. |
| Devour Corpse<br>`gravebinder_2_4` | Recorded / bone | **A:** [MAT_BONE](#mat_bone)<br>**R:** [MAT_BONE](#mat_bone) |  |
| Corpse Burst<br>`corpse_burst` | Recorded / poison | **A:** [MAT_CLOTH](#mat_cloth)<br>**R:** [MAT_ROT](#mat_rot), [MAT_BONE](#mat_bone)<br>**I:** [MAT_ROT](#mat_rot), [SIG_CORPSE_BURST](#sig_corpse_burst) |  |
| Corpse Spear<br>`gravebinder_2_6` | Recorded / bone | **A:** [MAT_BONE](#mat_bone)<br>**R:** [MAT_BONE](#mat_bone)<br>**I:** [MAT_BONE](#mat_bone) |  |
| Outbreak<br>`gravebinder_2_7` | Recorded / poison | **A:** [MAT_CLOTH](#mat_cloth)<br>**R:** [MAT_ROT](#mat_rot), [MAT_BREATH](#mat_breath)<br>**I:** [MAT_ROT](#mat_rot), [SIG_OUTBREAK](#sig_outbreak) |  |

### Wildkeeper

| Skill / exact ID | Current family and coverage | Required cues | Timing / silence rule |
| --- | --- | --- | --- |
| Call of the Wolf<br>`call_wolf` | Recorded / nature | **A:** [MAT_ROOTS](#mat_roots)<br>**R:** [MAT_GROWL](#mat_growl), [MAT_ROOTS](#mat_roots)<br>**I:** [MAT_BLOOD](#mat_blood) | Release on successful creation/stitch; I belongs to subsequent minion hits. Creature voices and movement use the companion table. |
| Thornback Boar<br>`thornback_boar` | Recorded / earth | **A:** [MAT_ROOTS](#mat_roots)<br>**R:** [MAT_STONE](#mat_stone), [MAT_GROWL](#mat_growl)<br>**I:** [MAT_STONE](#mat_stone) | Release on successful creation/stitch; I belongs to subsequent minion hits. Creature voices and movement use the companion table. |
| Spirit Hawk<br>`wildkeeper_0_2` | Recorded / storm | **A:** [MAT_CLOTH](#mat_cloth)<br>**R:** [MAT_SPARK](#mat_spark), [MAT_WIND](#mat_wind)<br>**I:** [MAT_SPARK](#mat_spark) | Release on successful creation/stitch; I belongs to subsequent minion hits. Creature voices and movement use the companion table. |
| Guardian Bear<br>`wildkeeper_0_3` | Recorded / nature | **A:** [MAT_ROOTS](#mat_roots)<br>**R:** [MAT_GROWL](#mat_growl), [MAT_ROOTS](#mat_roots)<br>**I:** [MAT_BLOOD](#mat_blood) | Release on successful creation/stitch; I belongs to subsequent minion hits. Creature voices and movement use the companion table. |
| Kindred Bond<br>`kinship` | Recorded conditional / nature | **T:** [MAT_BLOOD](#mat_blood) | Kindred Bond minion trigger; one quiet accent at the actual trigger, never a loop. |
| Feral Howl<br>`feral_howl` | Recorded / warcry | **A:** [MAT_BREATH](#mat_breath)<br>**R:** [MAT_HOWL](#mat_howl)<br>**E:** [STATUS_DISPEL](#status_dispel) | Activation and expiry only; no continuous buff hum. |
| Call of the Ent<br>`wildkeeper_0_6` | Recorded / nature | **A:** [MAT_ROOTS](#mat_roots)<br>**R:** [MAT_GROWL](#mat_growl), [MAT_ROOTS](#mat_roots)<br>**I:** [MAT_BLOOD](#mat_blood) | Release on successful creation/stitch; I belongs to subsequent minion hits. Creature voices and movement use the companion table. |
| Storm Totem<br>`wildkeeper_1_0` | Recorded / storm | **A:** [MAT_CLOTH](#mat_cloth)<br>**R:** [MAT_SPARK](#mat_spark), [MAT_ROOTS](#mat_roots)<br>**I:** [MAT_SPARK](#mat_spark) |  |
| Totem Mastery<br>`totem_mastery` | Intentionally silent / storm | Intentionally silent | Intentionally silent: passive statistics or inherited attack modifiers; ordinary hit feedback remains. |
| Fissure<br>`ground_fissure` | Recorded / earth | **A:** [MAT_ROOTS](#mat_roots)<br>**R:** [MAT_STONE](#mat_stone), [MAT_ROOTS](#mat_roots)<br>**I:** [MAT_STONE](#mat_stone), [SIG_FISSURE](#sig_fissure) |  |
| Cyclone<br>`wildkeeper_1_3` | Recorded / storm | **A:** [MAT_CLOTH](#mat_cloth)<br>**R:** [MAT_SPARK](#mat_spark), [MAT_WIND](#mat_wind)<br>**I:** [MAT_SPARK](#mat_spark)<br>**S:** [LOOP_WIND](#loop_wind)<br>**E:** [MAT_WIND](#mat_wind) |  |
| Sky-Sap<br>`wildkeeper_1_4` | Intentionally silent / nature | Intentionally silent | Intentionally silent: passive statistics or inherited attack modifiers; ordinary hit feedback remains. |
| Earthquake<br>`wildkeeper_1_5` | Recorded / earth | **A:** [MAT_ROOTS](#mat_roots)<br>**R:** [MAT_STONE](#mat_stone), [MAT_ROOTS](#mat_roots)<br>**I:** [MAT_STONE](#mat_stone)<br>**S:** [LOOP_EARTH](#loop_earth)<br>**E:** [MAT_STONE](#mat_stone) |  |
| Tempest Totem<br>`wildkeeper_1_6` | Recorded / storm | **A:** [MAT_CLOTH](#mat_cloth)<br>**R:** [MAT_SPARK](#mat_spark), [MAT_THUNDER](#mat_thunder)<br>**I:** [MAT_SPARK](#mat_spark) |  |
| Wolf Form<br>`fangform` | Recorded / nature | **A:** [MAT_ROOTS](#mat_roots)<br>**R:** [MAT_GROWL](#mat_growl), [MAT_ROOTS](#mat_roots), [SIG_FORM_WOLF](#sig_form_wolf)<br>**E:** [SIG_FORM_END](#sig_form_end) |  |
| Bear Form<br>`stoneform` | Recorded / nature | **A:** [MAT_ROOTS](#mat_roots)<br>**R:** [MAT_GROWL](#mat_growl), [MAT_ROOTS](#mat_roots), [SIG_FORM_BEAR](#sig_form_bear)<br>**E:** [SIG_FORM_END](#sig_form_end) |  |
| Stone Form<br>`wildkeeper_2_2` | Recorded / earth | **A:** [MAT_ROOTS](#mat_roots)<br>**R:** [MAT_STONE](#mat_stone), [MAT_ROOTS](#mat_roots), [SIG_FORM_STONE](#sig_form_stone)<br>**E:** [SIG_FORM_END](#sig_form_end) |  |
| Primal Surge<br>`primal_surge` | Recorded conditional / fire | **T:** [MAT_FIRE](#mat_fire) | Primal Surge conditional trigger; one quiet accent at the actual trigger, never a loop. |
| Rabies<br>`rabies` | Recorded / poison | **A:** [MAT_CLOTH](#mat_cloth)<br>**R:** [MAT_ROT](#mat_rot)<br>**I:** [MAT_ROT](#mat_rot) |  |
| Fire Claw<br>`fire_claw` | Recorded / fire | **A:** [MAT_CLOTH](#mat_cloth)<br>**R:** [MAT_EMBER](#mat_ember), [MAT_BLADE](#mat_blade)<br>**I:** [MAT_FIRE](#mat_fire) |  |
| Wrath of the Wild<br>`wildkeeper_2_6` | Recorded / fire | **A:** [MAT_CLOTH](#mat_cloth)<br>**R:** [MAT_EMBER](#mat_ember), [MAT_GROWL](#mat_growl), [SIG_FORM_APEX](#sig_form_apex)<br>**E:** [SIG_FORM_END](#sig_form_end) |  |

### Veil Ranger

| Skill / exact ID | Current family and coverage | Required cues | Timing / silence rule |
| --- | --- | --- | --- |
| Aimed Shot<br>`veilranger_0_0` | Recorded / bow | **A:** [MAT_DRAW](#mat_draw)<br>**R:** [MAT_BOW](#mat_bow)<br>**I:** [MAT_ARROW](#mat_arrow) |  |
| Split Volley<br>`veilranger_0_1` | Recorded / bow | **A:** [MAT_DRAW](#mat_draw)<br>**R:** [MAT_BOW](#mat_bow), [MAT_CLOTH](#mat_cloth)<br>**I:** [MAT_ARROW](#mat_arrow) |  |
| Drawn Shot<br>`veilranger_0_2` | Recorded / bow | **A:** [MAT_DRAW](#mat_draw)<br>**R:** [MAT_BOW](#mat_bow), [MAT_DRAW](#mat_draw)<br>**I:** [MAT_ARROW](#mat_arrow)<br>**S:** [LOOP_DRAW](#loop_draw)<br>**E:** [MAT_CLOTH](#mat_cloth) | Quiet bow tension during held draw; release and impact remain separate. |
| Eagle Eye<br>`veilranger_0_3` | Intentionally silent / steel | Intentionally silent | Intentionally silent: passive statistics or inherited attack modifiers; ordinary hit feedback remains. |
| Ricochet Shard<br>`veilranger_0_4` | Recorded / bow | **A:** [MAT_DRAW](#mat_draw)<br>**R:** [MAT_BOW](#mat_bow), [MAT_STEEL](#mat_steel)<br>**I:** [MAT_ARROW](#mat_arrow) |  |
| Master of the Hunt<br>`veilranger_0_5` | Intentionally silent / blood | Intentionally silent | Intentionally silent: passive statistics or inherited attack modifiers; ordinary hit feedback remains. |
| Arrowfall<br>`veilranger_0_6` | Recorded / bow | **A:** [MAT_DRAW](#mat_draw)<br>**R:** [MAT_BOW](#mat_bow), [MAT_WIND](#mat_wind)<br>**I:** [MAT_ARROW](#mat_arrow), [SIG_ARROWFALL](#sig_arrowfall) | Opening volley plus individual descending-arrow/impact cues; no constant rain-loop requirement. |
| Barbed Trap<br>`veilranger_1_0` | Recorded / trap | **A:** [MAT_LATCH](#mat_latch)<br>**R:** [MAT_LATCH](#mat_latch)<br>**I:** [MAT_STEEL](#mat_steel) | A/R when placed; I only on detonation. Armed trap remains silent. |
| Tinker's Eye<br>`veilranger_1_1` | Intentionally silent / steel | Intentionally silent | Intentionally silent: passive statistics or inherited attack modifiers; ordinary hit feedback remains. |
| Frostbite Trap<br>`veilranger_1_2` | Recorded / frost | **A:** [MAT_LATCH](#mat_latch)<br>**R:** [MAT_LATCH](#mat_latch)<br>**I:** [MAT_FROST](#mat_frost) | A/R when placed; I only on detonation. Armed trap remains silent. |
| Dragnet<br>`veilranger_1_3` | Recorded / trap | **A:** [MAT_LATCH](#mat_latch)<br>**R:** [MAT_LATCH](#mat_latch), [MAT_CLOTH](#mat_cloth)<br>**I:** [MAT_STEEL](#mat_steel) | Mechanical net throw and rope catch; no explosion or magical curse. |
| Caltrop Field<br>`veilranger_1_4` | Recorded / trap | **A:** [MAT_LATCH](#mat_latch)<br>**R:** [MAT_LATCH](#mat_latch)<br>**I:** [MAT_STEEL](#mat_steel) | Scatter latches/metal once, then contact ticks; no continuous bed for stationary caltrops. |
| Powder Trap<br>`veilranger_1_5` | Recorded / fire | **A:** [MAT_LATCH](#mat_latch)<br>**R:** [MAT_LATCH](#mat_latch)<br>**I:** [MAT_FIRE](#mat_fire), [SIG_POWDER](#sig_powder) | A/R when placed; I only on detonation. Armed trap remains silent. |
| Exploit Weakness<br>`veilranger_1_6` | Intentionally silent / blood | Intentionally silent | Intentionally silent: passive statistics or inherited attack modifiers; ordinary hit feedback remains. |
| Shadowstep<br>`veilranger_2_0` | Recorded / shadow | **A:** [MAT_CLOTH](#mat_cloth)<br>**R:** [MAT_SHADOW](#mat_shadow), [MAT_BREATH](#mat_breath)<br>**I:** [MAT_BLOOD](#mat_blood) |  |
| Umbral Knife<br>`veilranger_2_1` | Recorded / steel | **A:** [MAT_CLOTH](#mat_cloth)<br>**R:** [MAT_BLADE](#mat_blade), [MAT_BREATH](#mat_breath)<br>**I:** [MAT_STEEL](#mat_steel) |  |
| Quickening<br>`veilranger_2_2` | Intentionally silent / shadow | Intentionally silent | Intentionally silent: passive statistics or inherited attack modifiers; ordinary hit feedback remains. |
| Dusk Cleave<br>`veilranger_2_3` | Recorded / steel | **A:** [MAT_CLOTH](#mat_cloth)<br>**R:** [MAT_BLADE](#mat_blade)<br>**I:** [MAT_STEEL](#mat_steel) |  |
| Killing Mark<br>`veilranger_2_4` | Recorded / blood | **A:** [MAT_CLOTH](#mat_cloth)<br>**R:** [MAT_BLADE](#mat_blade)<br>**I:** [MAT_BLOOD](#mat_blood), [SIG_MARK_BREAK](#sig_mark_break) |  |
| Shadow Flurry<br>`veilranger_2_5` | Recorded / steel | **A:** [MAT_CLOTH](#mat_cloth)<br>**R:** [MAT_BLADE](#mat_blade), [MAT_CLOTH](#mat_cloth)<br>**I:** [MAT_STEEL](#mat_steel) | Each actual released blade gets R; cancelled blades remain silent. |
| Deathblow<br>`veilranger_2_6` | Recorded / steel | **A:** [MAT_CLOTH](#mat_cloth)<br>**R:** [MAT_BLADE](#mat_blade), [MAT_BLOOD](#mat_blood)<br>**I:** [MAT_STEEL](#mat_steel), [SIG_MARK_BREAK](#sig_mark_break) |  |

Named-skill caveats: `stoneform` is **Bear Form**; **Stone Form** is `wildkeeper_2_2`; **Wrath of the Wild** is the apex transformation. **Aimed Shot** is bow audio even though its data type is `melee`. **Dragnet** is a mechanical net, and **Shadow Flurry** sounds only released blades. The actual trigger limiter can coalesce conditional accents; the mapping does not request overlapping passive pings for the same moment.

## All enemies, companions and bosses

### Performance family key

Each enemy’s row selects a voice family and lists all assigned cue IDs. **Alert**, **hurt** and **death** are separate prompts. Movement materials are proposed additions; ordinary humanoids still choose the actual ground surface. Family voices are a reusable production direction, not a claim that every monster currently has bespoke recordings. Suppress redundant death sounds when player death simultaneously removes companions.

| Family | Alert / hurt / death | Movement | Default attack materials |
| --- | --- | --- | --- |
| BONE | [VOX_BONE_ALERT](#vox_bone_alert), [VOX_BONE_HURT](#vox_bone_hurt), [VOX_BONE_DEATH](#vox_bone_death) | [MAT_BONE](#mat_bone) | [MAT_BLADE](#mat_blade), [MAT_BONE](#mat_bone) |
| HUSK | [VOX_HUSK_ALERT](#vox_husk_alert), [VOX_HUSK_HURT](#vox_husk_hurt), [VOX_HUSK_DEATH](#vox_husk_death) | [STEP_DIRT](#step_dirt) | [MAT_BLOOD](#mat_blood) |
| HUMAN | [VOX_HUMAN_ALERT](#vox_human_alert), [VOX_HUMAN_HURT](#vox_human_hurt), [VOX_HUMAN_DEATH](#vox_human_death) | [STEP_STONE](#step_stone) | [MAT_BLADE](#mat_blade), [MAT_STEEL](#mat_steel) |
| BRUTE | [VOX_BRUTE_ALERT](#vox_brute_alert), [VOX_BRUTE_HURT](#vox_brute_hurt), [VOX_BRUTE_DEATH](#vox_brute_death) | [MOVE_HEAVY_STEP](#move_heavy_step) | [MAT_BLOOD](#mat_blood), [MAT_STONE](#mat_stone) |
| HOUND | [VOX_HOUND_ALERT](#vox_hound_alert), [VOX_HOUND_HURT](#vox_hound_hurt), [VOX_HOUND_DEATH](#vox_hound_death) | [MOVE_PAWS](#move_paws) | [MAT_GROWL](#mat_growl), [MAT_BLOOD](#mat_blood) |
| SERPENT | [VOX_SERPENT_ALERT](#vox_serpent_alert), [VOX_SERPENT_HURT](#vox_serpent_hurt), [VOX_SERPENT_DEATH](#vox_serpent_death) | [MOVE_SLITHER](#move_slither) | [MAT_BLOOD](#mat_blood), [MAT_ROT](#mat_rot) |
| INSECT | [VOX_INSECT_ALERT](#vox_insect_alert), [VOX_INSECT_HURT](#vox_insect_hurt), [VOX_INSECT_DEATH](#vox_insect_death) | [MOVE_CHITIN](#move_chitin) | [MAT_BLOOD](#mat_blood), [MAT_ROT](#mat_rot) |
| METAL | [VOX_METAL_ALERT](#vox_metal_alert), [VOX_METAL_HURT](#vox_metal_hurt), [VOX_METAL_DEATH](#vox_metal_death) | [PLAYER_ARMOR](#player_armor) | [MAT_BLADE](#mat_blade), [MAT_STEEL](#mat_steel) |
| SPIRIT | [VOX_SPIRIT_ALERT](#vox_spirit_alert), [VOX_SPIRIT_HURT](#vox_spirit_hurt), [VOX_SPIRIT_DEATH](#vox_spirit_death) | [MOVE_FLOAT](#move_float) | [MAT_SHADOW](#mat_shadow), [MAT_HEX](#mat_hex) |
| OOZE | [VOX_OOZE_ALERT](#vox_ooze_alert), [VOX_OOZE_HURT](#vox_ooze_hurt), [VOX_OOZE_DEATH](#vox_ooze_death) | [MOVE_SLIME](#move_slime) | [MAT_ROT](#mat_rot) |
| WOOD | [VOX_WOOD_ALERT](#vox_wood_alert), [VOX_WOOD_HURT](#vox_wood_hurt), [VOX_WOOD_DEATH](#vox_wood_death) | [MAT_ROOTS](#mat_roots) | [MAT_ROOTS](#mat_roots), [MAT_STONE](#mat_stone) |
| STONE | [VOX_STONE_ALERT](#vox_stone_alert), [VOX_STONE_HURT](#vox_stone_hurt), [VOX_STONE_DEATH](#vox_stone_death) | [MOVE_HEAVY_STEP](#move_heavy_step) | [MAT_STONE](#mat_stone) |
| IMP | [VOX_IMP_ALERT](#vox_imp_alert), [VOX_IMP_HURT](#vox_imp_hurt), [VOX_IMP_DEATH](#vox_imp_death) | [MOVE_CHITIN](#move_chitin) | [MAT_BLOOD](#mat_blood) |
| CHOIR | [VOX_CHOIR_ALERT](#vox_choir_alert), [VOX_CHOIR_HURT](#vox_choir_hurt), [VOX_CHOIR_DEATH](#vox_choir_death) | [MAT_CLOTH](#mat_cloth) | [MAT_HEX](#mat_hex) |
| DRAGON | [VOX_DRAGON_ALERT](#vox_dragon_alert), [VOX_DRAGON_HURT](#vox_dragon_hurt), [VOX_DRAGON_DEATH](#vox_dragon_death) | [MOVE_WINGS](#move_wings) | [MAT_GROWL](#mat_growl), [MAT_BLOOD](#mat_blood) |
| HAWK | [VOX_HAWK_ALERT](#vox_hawk_alert), [VOX_HAWK_HURT](#vox_hawk_hurt), [VOX_HAWK_DEATH](#vox_hawk_death) | [MOVE_WINGS](#move_wings) | [MAT_WIND](#mat_wind), [MAT_BLOOD](#mat_blood) |
| BOAR | [VOX_BOAR_ALERT](#vox_boar_alert), [VOX_BOAR_HURT](#vox_boar_hurt), [VOX_BOAR_DEATH](#vox_boar_death) | [MOVE_HOOF](#move_hoof) | [MAT_GROWL](#mat_growl), [MAT_BLOOD](#mat_blood) |
| BEAR | [VOX_BEAR_ALERT](#vox_bear_alert), [VOX_BEAR_HURT](#vox_bear_hurt), [VOX_BEAR_DEATH](#vox_bear_death) | [MOVE_PAWS](#move_paws) | [MAT_GROWL](#mat_growl), [MAT_BLOOD](#mat_blood) |

### Complete enemy roster

All 193 base IDs plus the two encounter objects appear below. The placement column includes ordinary pools, named bosses, quest/summon/story references and explicit scripted spawns. An unestablished route is labeled as such; it is not a claim that an enemy is unused. Regional override rows below take precedence over generic/default attacks, particularly for projectile elements. Base identities are kept for traceability.

<a id="enemy-family-bone"></a>

#### BONE roster

| Enemy / ID | Placement or scripted source | Required bank cues | Special events / regional note |
| --- | --- | --- | --- |
| Bone Dragon<br>`bone_dragon` | The Throne of Cinders | [VOX_BONE_ALERT](#vox_bone_alert), [VOX_BONE_HURT](#vox_bone_hurt), [VOX_BONE_DEATH](#vox_bone_death), [MAT_BONE](#mat_bone), [MAT_BLADE](#mat_blade), [MAT_HEX](#mat_hex), [SIG_BOSS_WARN](#sig_boss_warn), [MAT_STONE](#mat_stone), [SIG_SOUL_VOLLEY](#sig_soul_volley), [SIG_FISSURE](#sig_fissure), [SIG_BOSS_PHASE](#sig_boss_phase), [SIG_BOSS_DEFEAT](#sig_boss_defeat), [SIG_RECOVERY](#sig_recovery) | projectile soulbolt/shadow: MAT_HEX; slam: SIG_BOSS_WARN,MAT_STONE; deathBurst: SIG_BOSS_WARN,MAT_HEX |
| Bone Archer<br>`bone_archer` | The Ashen Fields; Sunken Crypt — Hollows; Sunken Crypt — The Vigil | [VOX_BONE_ALERT](#vox_bone_alert), [VOX_BONE_HURT](#vox_bone_hurt), [VOX_BONE_DEATH](#vox_bone_death), [MAT_BONE](#mat_bone), [MAT_BLADE](#mat_blade), [MAT_BOW](#mat_bow), [MAT_ARROW](#mat_arrow) | projectile arrow/physical: MAT_BOW,MAT_ARROW |
| Morthul, the Grave-Warden<br>`morthul` | Sunken Crypt — The Vigil; quest q3 | [VOX_BONE_ALERT](#vox_bone_alert), [VOX_BONE_HURT](#vox_bone_hurt), [VOX_BONE_DEATH](#vox_bone_death), [MAT_BONE](#mat_bone), [MAT_BLADE](#mat_blade), [SIG_BOSS_WARN](#sig_boss_warn), [MAT_STONE](#mat_stone), [SIG_ENRAGE](#sig_enrage), [SIG_BONE_RAISE](#sig_bone_raise), [SIG_FISSURE](#sig_fissure), [SIG_BOSS_PHASE](#sig_boss_phase), [SIG_BOSS_DEFEAT](#sig_boss_defeat), [SIG_RECOVERY](#sig_recovery) | slam: SIG_BOSS_WARN,MAT_STONE; summons: MAT_BONE; enrage: SIG_ENRAGE |
| The Rimebound Captain<br>`frost_watch_captain` | opening road script | [VOX_BONE_ALERT](#vox_bone_alert), [VOX_BONE_HURT](#vox_bone_hurt), [VOX_BONE_DEATH](#vox_bone_death), [MAT_BONE](#mat_bone), [MAT_BLADE](#mat_blade), [SIG_BOSS_WARN](#sig_boss_warn), [MAT_STONE](#mat_stone), [MAT_SHIELD](#mat_shield), [SIG_FROST_SLAM](#sig_frost_slam), [SIG_CLEAVE](#sig_cleave), [SIG_BOSS_PHASE](#sig_boss_phase), [SIG_BOSS_DEFEAT](#sig_boss_defeat), [SIG_RECOVERY](#sig_recovery) | slam: SIG_BOSS_WARN,MAT_STONE; shield: MAT_SHIELD |
| Rimebone Archer<br>`frost_archer` | The Fallen North; The Abandoned Mines; The Shattered Temple; The Shardpeak Shrine | [VOX_BONE_ALERT](#vox_bone_alert), [VOX_BONE_HURT](#vox_bone_hurt), [VOX_BONE_DEATH](#vox_bone_death), [MAT_BONE](#mat_bone), [MAT_BLADE](#mat_blade), [MAT_BOW](#mat_bow), [MAT_ARROW](#mat_arrow) | projectile arrow/cold: MAT_BOW,MAT_ARROW |
| Shard Sentinel<br>`shard_sentinel` | The Fallen North; The Abandoned Mines; The Shattered Temple; The Shardpeak Shrine | [VOX_BONE_ALERT](#vox_bone_alert), [VOX_BONE_HURT](#vox_bone_hurt), [VOX_BONE_DEATH](#vox_bone_death), [MAT_BONE](#mat_bone), [MAT_BLADE](#mat_blade) |  |
| Rimebound Guardian<br>`rimebound_guardian` | The Shattered Temple; The Shardpeak Shrine | [VOX_BONE_ALERT](#vox_bone_alert), [VOX_BONE_HURT](#vox_bone_hurt), [VOX_BONE_DEATH](#vox_bone_death), [MAT_BONE](#mat_bone), [MAT_BLADE](#mat_blade), [STATUS_FROZEN](#status_frozen), [MAT_FROST](#mat_frost) | chillOnHit: STATUS_FROZEN; melee cold: MAT_FROST |
| Gilded Thrall<br>`gilded_thrall` | Tomb of the Chained Sovereign; Palace of Khal-Zahir; summoned by chained_sovereign | [VOX_BONE_ALERT](#vox_bone_alert), [VOX_BONE_HURT](#vox_bone_hurt), [VOX_BONE_DEATH](#vox_bone_death), [MAT_BONE](#mat_bone), [MAT_BLADE](#mat_blade), [MAT_SHIELD](#mat_shield) | shield: MAT_SHIELD |
| The Chained Sovereign<br>`chained_sovereign` | Tomb of the Chained Sovereign; quest opt_desert_2 | [VOX_BONE_ALERT](#vox_bone_alert), [VOX_BONE_HURT](#vox_bone_hurt), [VOX_BONE_DEATH](#vox_bone_death), [MAT_BONE](#mat_bone), [MAT_BLADE](#mat_blade), [SIG_BOSS_WARN](#sig_boss_warn), [MAT_STONE](#mat_stone), [MAT_FIRE](#mat_fire), [MAT_SHADOW](#mat_shadow), [SIG_ENRAGE](#sig_enrage), [SIG_BONE_RAISE](#sig_bone_raise), [SIG_FISSURE](#sig_fissure), [SIG_BOSS_PHASE](#sig_boss_phase), [SIG_BOSS_DEFEAT](#sig_boss_defeat), [SIG_RECOVERY](#sig_recovery) | slam: SIG_BOSS_WARN,MAT_STONE; summons: MAT_FIRE,MAT_SHADOW; enrage: SIG_ENRAGE |
| Azram the Gilded<br>`azram` | Palace of Khal-Zahir; quest q15 | [VOX_BONE_ALERT](#vox_bone_alert), [VOX_BONE_HURT](#vox_bone_hurt), [VOX_BONE_DEATH](#vox_bone_death), [MAT_BONE](#mat_bone), [MAT_BLADE](#mat_blade), [SIG_GOLD_CHAINS](#sig_gold_chains), [SIG_BOSS_PORTAL](#sig_boss_portal), [SIG_BOSS_PORTAL_BREAK](#sig_boss_portal_break), [SIG_GOLD_CONE](#sig_gold_cone), [SIG_CLEAVE](#sig_cleave), [SIG_BOSS_WARN](#sig_boss_warn), [SIG_BOSS_PHASE](#sig_boss_phase), [SIG_BOSS_DEFEAT](#sig_boss_defeat), [SIG_RECOVERY](#sig_recovery) | Active authored encounter: use boss table; generic inherited slam/summon/death-burst fields do not define the live rotation |
| Echo of the Oathbreaker<br>`korvath_echo` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_BONE_ALERT](#vox_bone_alert), [VOX_BONE_HURT](#vox_bone_hurt), [VOX_BONE_DEATH](#vox_bone_death), [MAT_BONE](#mat_bone), [MAT_BLADE](#mat_blade) |  |
| Wretched Ossuary<br>`r4_skeleton` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_BONE_ALERT](#vox_bone_alert), [VOX_BONE_HURT](#vox_bone_hurt), [VOX_BONE_DEATH](#vox_bone_death), [MAT_BONE](#mat_bone), [MAT_BLADE](#mat_blade), [MAT_WIND](#mat_wind), [MAT_BLOOD](#mat_blood) | charge: MAT_WIND,MAT_BLOOD |
| Hollow Marrowknight<br>`r9_skeleton` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_BONE_ALERT](#vox_bone_alert), [VOX_BONE_HURT](#vox_bone_hurt), [VOX_BONE_DEATH](#vox_bone_death), [MAT_BONE](#mat_bone), [MAT_BLADE](#mat_blade), [SIG_BOSS_WARN](#sig_boss_warn), [MAT_STONE](#mat_stone) | slam: SIG_BOSS_WARN,MAT_STONE |
| Howling Bonecaller<br>`r14_skeleton` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_BONE_ALERT](#vox_bone_alert), [VOX_BONE_HURT](#vox_bone_hurt), [VOX_BONE_DEATH](#vox_bone_death), [MAT_BONE](#mat_bone), [MAT_BLADE](#mat_blade) |  |
| Gloom Revenant<br>`r24_skeleton` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_BONE_ALERT](#vox_bone_alert), [VOX_BONE_HURT](#vox_bone_hurt), [VOX_BONE_DEATH](#vox_bone_death), [MAT_BONE](#mat_bone), [MAT_BLADE](#mat_blade) |  |
| Galvanic Boneguard<br>`r37_skeleton` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_BONE_ALERT](#vox_bone_alert), [VOX_BONE_HURT](#vox_bone_hurt), [VOX_BONE_DEATH](#vox_bone_death), [MAT_BONE](#mat_bone), [MAT_BLADE](#mat_blade), [MAT_SPARK](#mat_spark) | projectile shardbolt/light: MAT_SPARK |
| Ember Deadwalker<br>`r42_skeleton` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_BONE_ALERT](#vox_bone_alert), [VOX_BONE_HURT](#vox_bone_hurt), [VOX_BONE_DEATH](#vox_bone_death), [MAT_BONE](#mat_bone), [MAT_BLADE](#mat_blade), [MAT_FIRE](#mat_fire) | projectile shardbolt/fire: MAT_FIRE |
| Sunken Rattler<br>`r47_skeleton` | The Cinderfields; The Throne of Cinders | [VOX_BONE_ALERT](#vox_bone_alert), [VOX_BONE_HURT](#vox_bone_hurt), [VOX_BONE_DEATH](#vox_bone_death), [MAT_BONE](#mat_bone), [MAT_BLADE](#mat_blade), [SIG_BOSS_WARN](#sig_boss_warn), [MAT_STONE](#mat_stone) | slam: SIG_BOSS_WARN,MAT_STONE |
| Radiant Tyrant<br>`r79_warlord` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_BONE_ALERT](#vox_bone_alert), [VOX_BONE_HURT](#vox_bone_hurt), [VOX_BONE_DEATH](#vox_bone_death), [MAT_BONE](#mat_bone), [MAT_BLADE](#mat_blade), [SIG_CHOIR_SUMMON](#sig_choir_summon), [MAT_SPARK](#mat_spark) | heals: SIG_CHOIR_SUMMON; melee light: MAT_SPARK |
| Charred Slaughterer<br>`r84_warlord` | The Throne of Cinders | [VOX_BONE_ALERT](#vox_bone_alert), [VOX_BONE_HURT](#vox_bone_hurt), [VOX_BONE_DEATH](#vox_bone_death), [MAT_BONE](#mat_bone), [MAT_BLADE](#mat_blade), [MAT_WIND](#mat_wind), [MAT_FIRE](#mat_fire) | whirl: MAT_BLADE,MAT_WIND; melee fire: MAT_FIRE |
| Hollow Conqueror<br>`r89_warlord` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_BONE_ALERT](#vox_bone_alert), [VOX_BONE_HURT](#vox_bone_hurt), [VOX_BONE_DEATH](#vox_bone_death), [MAT_BONE](#mat_bone), [MAT_BLADE](#mat_blade), [MAT_WIND](#mat_wind) | whirl: MAT_BLADE,MAT_WIND |
| Howling Deathlord<br>`r94_warlord` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_BONE_ALERT](#vox_bone_alert), [VOX_BONE_HURT](#vox_bone_hurt), [VOX_BONE_DEATH](#vox_bone_death), [MAT_BONE](#mat_bone), [MAT_BLADE](#mat_blade), [MAT_SHADOW](#mat_shadow) | teleports: MAT_SHADOW |
| Blighted Champion<br>`r99_warlord` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_BONE_ALERT](#vox_bone_alert), [VOX_BONE_HURT](#vox_bone_hurt), [VOX_BONE_DEATH](#vox_bone_death), [MAT_BONE](#mat_bone), [MAT_BLADE](#mat_blade), [STATUS_POISON](#status_poison), [SIG_BOSS_WARN](#sig_boss_warn), [MAT_ROT](#mat_rot) | poison: STATUS_POISON; deathBurst: SIG_BOSS_WARN,MAT_ROT |

<a id="enemy-family-husk"></a>

#### HUSK roster

| Enemy / ID | Placement or scripted source | Required bank cues | Special events / regional note |
| --- | --- | --- | --- |
| Risen<br>`risen` | The Ashen Fields; Sunken Crypt — Hollows; Sunken Crypt — The Vigil; The Ruined Chapel; summoned by gravecaller; summoned by morthul; summoned by hoarfang; summoned by r76_knight; summoned by r83_brute; summoned by r90_wraith; summoned by r97_treant | [VOX_HUSK_ALERT](#vox_husk_alert), [VOX_HUSK_HURT](#vox_husk_hurt), [VOX_HUSK_DEATH](#vox_husk_death), [STEP_DIRT](#step_dirt), [MAT_BLOOD](#mat_blood) |  |
| Tomb Husk<br>`tomb_husk` | Sunken Crypt — Hollows; Sunken Crypt — The Vigil; Greymonastery — Cloister; Greymonastery — Sanctum | [VOX_HUSK_ALERT](#vox_husk_alert), [VOX_HUSK_HURT](#vox_husk_hurt), [VOX_HUSK_DEATH](#vox_husk_death), [STEP_DIRT](#step_dirt), [MAT_BLOOD](#mat_blood) |  |
| Frostbound Risen<br>`frost_risen` | The Fallen North; The Abandoned Mines; The Shattered Temple; The Shardpeak Shrine; The Deepfreeze Caverns; summoned by hoarfang | [VOX_HUSK_ALERT](#vox_husk_alert), [VOX_HUSK_HURT](#vox_husk_hurt), [VOX_HUSK_DEATH](#vox_husk_death), [STEP_DIRT](#step_dirt), [MAT_BLOOD](#mat_blood) |  |
| The Drowned<br>`drowned_dead` | The Weeping Marsh; Abandoned Monastery — Flooded Crypts; The Choir's Ritual; The Hollow Reeds; summoned by choirmaster; summoned by mire_mother | [VOX_HUSK_ALERT](#vox_husk_alert), [VOX_HUSK_HURT](#vox_husk_hurt), [VOX_HUSK_DEATH](#vox_husk_death), [STEP_DIRT](#step_dirt), [MAT_BLOOD](#mat_blood) |  |
| Blighted Husk<br>`r19_skeleton` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_HUSK_ALERT](#vox_husk_alert), [VOX_HUSK_HURT](#vox_husk_hurt), [VOX_HUSK_DEATH](#vox_husk_death), [STEP_DIRT](#step_dirt), [MAT_BLOOD](#mat_blood), [STATUS_POISON](#status_poison) | poison: STATUS_POISON |
| Grave Husk<br>`r27_skeleton` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_HUSK_ALERT](#vox_husk_alert), [VOX_HUSK_HURT](#vox_husk_hurt), [VOX_HUSK_DEATH](#vox_husk_death), [STEP_DIRT](#step_dirt), [MAT_BLOOD](#mat_blood), [MAT_WIND](#mat_wind) | charge: MAT_WIND,MAT_BLOOD |
| Hollow Husk<br>`r32_skeleton` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_HUSK_ALERT](#vox_husk_alert), [VOX_HUSK_HURT](#vox_husk_hurt), [VOX_HUSK_DEATH](#vox_husk_death), [STEP_DIRT](#step_dirt), [MAT_BLOOD](#mat_blood) |  |

<a id="enemy-family-human"></a>

#### HUMAN roster

| Enemy / ID | Placement or scripted source | Required bank cues | Special events / regional note |
| --- | --- | --- | --- |
| Cult Acolyte<br>`cult_acolyte` | The Ashen Fields; Sunken Crypt — Hollows; The Ruined Chapel; Greymonastery — Cloister | [VOX_HUMAN_ALERT](#vox_human_alert), [VOX_HUMAN_HURT](#vox_human_hurt), [VOX_HUMAN_DEATH](#vox_human_death), [STEP_STONE](#step_stone), [MAT_BLADE](#mat_blade), [MAT_STEEL](#mat_steel), [MAT_FIRE](#mat_fire) | projectile firebolt/fire: MAT_FIRE |
| Gravecaller Hesh<br>`gravecaller` | Sunken Crypt — Hollows; quest q2 | [VOX_HUMAN_ALERT](#vox_human_alert), [VOX_HUMAN_HURT](#vox_human_hurt), [VOX_HUMAN_DEATH](#vox_human_death), [STEP_STONE](#step_stone), [MAT_BLADE](#mat_blade), [MAT_STEEL](#mat_steel), [MAT_FIRE](#mat_fire), [MAT_BONE](#mat_bone), [SIG_BONE_RAISE](#sig_bone_raise), [SIG_BOSS_WARN](#sig_boss_warn), [SIG_BOSS_PHASE](#sig_boss_phase), [SIG_BOSS_DEFEAT](#sig_boss_defeat), [SIG_RECOVERY](#sig_recovery) | projectile firebolt/fire: MAT_FIRE; summons: MAT_BONE |
| Cult Zealot<br>`cult_zealot` | The Ruined Chapel; The Blackbough; Greymonastery — Cloister; Greymonastery — Sanctum; summoned by vicar | [VOX_HUMAN_ALERT](#vox_human_alert), [VOX_HUMAN_HURT](#vox_human_hurt), [VOX_HUMAN_DEATH](#vox_human_death), [STEP_STONE](#step_stone), [MAT_BLADE](#mat_blade), [MAT_STEEL](#mat_steel) |  |
| Vicar Thessaly<br>`vicar` | The Ruined Chapel; quest q4 | [VOX_HUMAN_ALERT](#vox_human_alert), [VOX_HUMAN_HURT](#vox_human_hurt), [VOX_HUMAN_DEATH](#vox_human_death), [STEP_STONE](#step_stone), [MAT_BLADE](#mat_blade), [MAT_STEEL](#mat_steel), [MAT_FIRE](#mat_fire), [SIG_CHOIR_SUMMON](#sig_choir_summon), [SIG_BOSS_WARN](#sig_boss_warn), [SIG_BOSS_PHASE](#sig_boss_phase), [SIG_BOSS_DEFEAT](#sig_boss_defeat), [SIG_RECOVERY](#sig_recovery) | projectile firebolt/fire: MAT_FIRE; summons: SIG_CHOIR_SUMMON; heals: SIG_CHOIR_SUMMON |
| Shardtouched Thrall<br>`shard_thrall` | The Fallen North; The Abandoned Mines; The Shattered Temple; The Shardpeak Shrine; The Deepfreeze Caverns | [VOX_HUMAN_ALERT](#vox_human_alert), [VOX_HUMAN_HURT](#vox_human_hurt), [VOX_HUMAN_DEATH](#vox_human_death), [STEP_STONE](#step_stone), [MAT_BLADE](#mat_blade), [MAT_STEEL](#mat_steel), [MAT_FIRE](#mat_fire) | projectile shardbolt/fire: MAT_FIRE |
| Dune Raider<br>`sand_raider` | The Shard Flats; The Shifting Wastes; Khal-Zahir — Underground Market; summoned by azram | [VOX_HUMAN_ALERT](#vox_human_alert), [VOX_HUMAN_HURT](#vox_human_hurt), [VOX_HUMAN_DEATH](#vox_human_death), [STEP_STONE](#step_stone), [MAT_BLADE](#mat_blade), [MAT_STEEL](#mat_steel) |  |
| Rotting Brigand<br>`r1_human` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_HUMAN_ALERT](#vox_human_alert), [VOX_HUMAN_HURT](#vox_human_hurt), [VOX_HUMAN_DEATH](#vox_human_death), [STEP_STONE](#step_stone), [MAT_BLADE](#mat_blade), [MAT_STEEL](#mat_steel), [STATUS_POISON](#status_poison) | poison: STATUS_POISON |
| Howling Reaver<br>`r6_human` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_HUMAN_ALERT](#vox_human_alert), [VOX_HUMAN_HURT](#vox_human_hurt), [VOX_HUMAN_DEATH](#vox_human_death), [STEP_STONE](#step_stone), [MAT_BLADE](#mat_blade), [MAT_STEEL](#mat_steel) |  |
| Grave Cutthroat<br>`r11_human` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_HUMAN_ALERT](#vox_human_alert), [VOX_HUMAN_HURT](#vox_human_hurt), [VOX_HUMAN_DEATH](#vox_human_death), [STEP_STONE](#step_stone), [MAT_BLADE](#mat_blade), [MAT_STEEL](#mat_steel), [PLAYER_JUMP](#player_jump), [MOVE_HEAVY_STEP](#move_heavy_step) | leap: PLAYER_JUMP,MOVE_HEAVY_STEP |
| Gloom Marauder<br>`r16_human` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_HUMAN_ALERT](#vox_human_alert), [VOX_HUMAN_HURT](#vox_human_hurt), [VOX_HUMAN_DEATH](#vox_human_death), [STEP_STONE](#step_stone), [MAT_BLADE](#mat_blade), [MAT_STEEL](#mat_steel), [MAT_WIND](#mat_wind), [MAT_BLOOD](#mat_blood) | charge: MAT_WIND,MAT_BLOOD |
| Bone Renegade<br>`r21_human` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_HUMAN_ALERT](#vox_human_alert), [VOX_HUMAN_HURT](#vox_human_hurt), [VOX_HUMAN_DEATH](#vox_human_death), [STEP_STONE](#step_stone), [MAT_BLADE](#mat_blade), [MAT_STEEL](#mat_steel), [SIG_BOSS_WARN](#sig_boss_warn), [MAT_STONE](#mat_stone) | slam: SIG_BOSS_WARN,MAT_STONE |
| Smouldering Adept<br>`r33_robed` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_HUMAN_ALERT](#vox_human_alert), [VOX_HUMAN_HURT](#vox_human_hurt), [VOX_HUMAN_DEATH](#vox_human_death), [STEP_STONE](#step_stone), [MAT_BLADE](#mat_blade), [MAT_STEEL](#mat_steel), [MAT_FIRE](#mat_fire) | projectile shardbolt/fire: MAT_FIRE |
| Howling Cultist<br>`r38_robed` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_HUMAN_ALERT](#vox_human_alert), [VOX_HUMAN_HURT](#vox_human_hurt), [VOX_HUMAN_DEATH](#vox_human_death), [STEP_STONE](#step_stone), [MAT_BLADE](#mat_blade), [MAT_STEEL](#mat_steel), [SIG_BOSS_WARN](#sig_boss_warn), [MAT_STONE](#mat_stone) | slam: SIG_BOSS_WARN,MAT_STONE |
| Grave Zealot<br>`r43_robed` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_HUMAN_ALERT](#vox_human_alert), [VOX_HUMAN_HURT](#vox_human_hurt), [VOX_HUMAN_DEATH](#vox_human_death), [STEP_STONE](#step_stone), [MAT_BLADE](#mat_blade), [MAT_STEEL](#mat_steel), [PLAYER_JUMP](#player_jump), [MOVE_HEAVY_STEP](#move_heavy_step) | leap: PLAYER_JUMP,MOVE_HEAVY_STEP |
| Gloom Acolyte<br>`r48_robed` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_HUMAN_ALERT](#vox_human_alert), [VOX_HUMAN_HURT](#vox_human_hurt), [VOX_HUMAN_DEATH](#vox_human_death), [STEP_STONE](#step_stone), [MAT_BLADE](#mat_blade), [MAT_STEEL](#mat_steel), [MAT_HEX](#mat_hex), [SIG_SPLIT](#sig_split) | projectile soulbolt/shadow: MAT_HEX; splitOnDeath: SIG_SPLIT |
| Radiant Cultist<br>`r54_robed` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_HUMAN_ALERT](#vox_human_alert), [VOX_HUMAN_HURT](#vox_human_hurt), [VOX_HUMAN_DEATH](#vox_human_death), [STEP_STONE](#step_stone), [MAT_BLADE](#mat_blade), [MAT_STEEL](#mat_steel), [MAT_SPARK](#mat_spark) | projectile shardbolt/light: MAT_SPARK |
| Charred Zealot<br>`r59_robed` | The Cinderfields | [VOX_HUMAN_ALERT](#vox_human_alert), [VOX_HUMAN_HURT](#vox_human_hurt), [VOX_HUMAN_DEATH](#vox_human_death), [STEP_STONE](#step_stone), [MAT_BLADE](#mat_blade), [MAT_STEEL](#mat_steel), [MAT_FIRE](#mat_fire) | projectile shardbolt/fire: MAT_FIRE |
| Charred Acolyte<br>`r64_robed` | The Cinder Bastion; The Throne of Cinders | [VOX_HUMAN_ALERT](#vox_human_alert), [VOX_HUMAN_HURT](#vox_human_hurt), [VOX_HUMAN_DEATH](#vox_human_death), [STEP_STONE](#step_stone), [MAT_BLADE](#mat_blade), [MAT_STEEL](#mat_steel), [MAT_FIRE](#mat_fire) | projectile shardbolt/fire: MAT_FIRE |
| Radiant Whisperer<br>`r69_robed` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_HUMAN_ALERT](#vox_human_alert), [VOX_HUMAN_HURT](#vox_human_hurt), [VOX_HUMAN_DEATH](#vox_human_death), [STEP_STONE](#step_stone), [MAT_BLADE](#mat_blade), [MAT_STEEL](#mat_steel), [MAT_SPARK](#mat_spark) | projectile shardbolt/light: MAT_SPARK |
| Dread Hierophant<br>`r74_robed` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_HUMAN_ALERT](#vox_human_alert), [VOX_HUMAN_HURT](#vox_human_hurt), [VOX_HUMAN_DEATH](#vox_human_death), [STEP_STONE](#step_stone), [MAT_BLADE](#mat_blade), [MAT_STEEL](#mat_steel), [MAT_HEX](#mat_hex) | projectile soulbolt/shadow: MAT_HEX |

<a id="enemy-family-brute"></a>

#### BRUTE roster

| Enemy / ID | Placement or scripted source | Required bank cues | Special events / regional note |
| --- | --- | --- | --- |
| Frost Wyrm<br>`frost_wyrm` | The Shardpeak Shrine; The Deepfreeze Caverns | [VOX_BRUTE_ALERT](#vox_brute_alert), [VOX_BRUTE_HURT](#vox_brute_hurt), [VOX_BRUTE_DEATH](#vox_brute_death), [MOVE_HEAVY_STEP](#move_heavy_step), [MAT_BLOOD](#mat_blood), [MAT_STONE](#mat_stone), [SIG_BOSS_WARN](#sig_boss_warn), [SIG_FROST_BREATH](#sig_frost_breath), [MAT_FROST](#mat_frost) | slam: SIG_BOSS_WARN,MAT_STONE; Act I Frostmaw Yeti: physical claws, cold breath/slam; outside Act I retain Frost Wyrm frost projectile identity / Frostmaw Yeti in The Shardpeak Shrine; Frostmaw Yeti in The Deepfreeze Caverns |
| Brimstone Brute<br>`brimstone_brute` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_BRUTE_ALERT](#vox_brute_alert), [VOX_BRUTE_HURT](#vox_brute_hurt), [VOX_BRUTE_DEATH](#vox_brute_death), [MOVE_HEAVY_STEP](#move_heavy_step), [MAT_BLOOD](#mat_blood), [MAT_STONE](#mat_stone), [MAT_WIND](#mat_wind), [SIG_BOSS_WARN](#sig_boss_warn) | charge: MAT_WIND,MAT_BLOOD; slam: SIG_BOSS_WARN,MAT_STONE |
| Ashfiend Reaver<br>`ashfiend_reaver` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_BRUTE_ALERT](#vox_brute_alert), [VOX_BRUTE_HURT](#vox_brute_hurt), [VOX_BRUTE_DEATH](#vox_brute_death), [MOVE_HEAVY_STEP](#move_heavy_step), [MAT_BLOOD](#mat_blood), [MAT_STONE](#mat_stone), [MAT_WIND](#mat_wind), [SIG_BOSS_WARN](#sig_boss_warn) | charge: MAT_WIND,MAT_BLOOD; slam: SIG_BOSS_WARN,MAT_STONE |
| Flesh Engine Abomination<br>`flesh_engine` | The Cinder Bastion | [VOX_BRUTE_ALERT](#vox_brute_alert), [VOX_BRUTE_HURT](#vox_brute_hurt), [VOX_BRUTE_DEATH](#vox_brute_death), [MOVE_HEAVY_STEP](#move_heavy_step), [MAT_BLOOD](#mat_blood), [MAT_STONE](#mat_stone), [SIG_BOSS_WARN](#sig_boss_warn), [SIG_THROW_BODY](#sig_throw_body), [SIG_FISSURE](#sig_fissure), [SIG_BOSS_PHASE](#sig_boss_phase), [SIG_BOSS_DEFEAT](#sig_boss_defeat), [SIG_RECOVERY](#sig_recovery) | slam: SIG_BOSS_WARN,MAT_STONE; throwUndead: SIG_THROW_BODY |
| Infernal Warlord<br>`infernal_warlord` | The Cinderfields; The Cinder Bastion | [VOX_BRUTE_ALERT](#vox_brute_alert), [VOX_BRUTE_HURT](#vox_brute_hurt), [VOX_BRUTE_DEATH](#vox_brute_death), [MOVE_HEAVY_STEP](#move_heavy_step), [MAT_BLOOD](#mat_blood), [MAT_STONE](#mat_stone), [MAT_WIND](#mat_wind), [SIG_BOSS_WARN](#sig_boss_warn), [SIG_ENRAGE](#sig_enrage), [SIG_CLEAVE](#sig_cleave), [SIG_FISSURE](#sig_fissure), [SIG_BOSS_PHASE](#sig_boss_phase), [SIG_BOSS_DEFEAT](#sig_boss_defeat), [SIG_RECOVERY](#sig_recovery) | charge: MAT_WIND,MAT_BLOOD; slam: SIG_BOSS_WARN,MAT_STONE; enrage: SIG_ENRAGE |
| Fen Stalker<br>`fen_stalker` | The Blackbough | [VOX_BRUTE_ALERT](#vox_brute_alert), [VOX_BRUTE_HURT](#vox_brute_hurt), [VOX_BRUTE_DEATH](#vox_brute_death), [MOVE_HEAVY_STEP](#move_heavy_step), [MAT_BLOOD](#mat_blood), [MAT_STONE](#mat_stone), [STATUS_POISON](#status_poison) | poison: STATUS_POISON |
| Vellath, the Unshepherd<br>`vellath` | Greymonastery — Sanctum; quest q6 | [VOX_BRUTE_ALERT](#vox_brute_alert), [VOX_BRUTE_HURT](#vox_brute_hurt), [VOX_BRUTE_DEATH](#vox_brute_death), [MOVE_HEAVY_STEP](#move_heavy_step), [MAT_BLOOD](#mat_blood), [MAT_STONE](#mat_stone), [SIG_BOSS_WARN](#sig_boss_warn), [MAT_FIRE](#mat_fire), [MAT_SHADOW](#mat_shadow), [SIG_ENRAGE](#sig_enrage), [SIG_BONE_RAISE](#sig_bone_raise), [SIG_FISSURE](#sig_fissure), [SIG_BOSS_PHASE](#sig_boss_phase), [SIG_BOSS_DEFEAT](#sig_boss_defeat), [SIG_RECOVERY](#sig_recovery) | slam: SIG_BOSS_WARN,MAT_STONE; summons: MAT_FIRE,MAT_SHADOW; enrage: SIG_ENRAGE |
| Reanimated Guardian<br>`barb_guard` | The Abandoned Mines; The Shattered Temple | [VOX_BRUTE_ALERT](#vox_brute_alert), [VOX_BRUTE_HURT](#vox_brute_hurt), [VOX_BRUTE_DEATH](#vox_brute_death), [MOVE_HEAVY_STEP](#move_heavy_step), [MAT_BLOOD](#mat_blood), [MAT_STONE](#mat_stone) |  |
| Korvath, the Oathbreaker<br>`korvath` | The Shattered Temple; quest q9 | [VOX_BRUTE_ALERT](#vox_brute_alert), [VOX_BRUTE_HURT](#vox_brute_hurt), [VOX_BRUTE_DEATH](#vox_brute_death), [MOVE_HEAVY_STEP](#move_heavy_step), [MAT_BLOOD](#mat_blood), [MAT_STONE](#mat_stone), [SIG_CLEAVE](#sig_cleave), [SIG_FISSURE](#sig_fissure), [SIG_BOSS_WARN](#sig_boss_warn), [SIG_BOSS_PHASE](#sig_boss_phase), [SIG_BOSS_DEFEAT](#sig_boss_defeat), [SIG_RECOVERY](#sig_recovery) | Active authored encounter: use boss table; generic inherited slam/summon/death-burst fields do not define the live rotation |
| Brokkar, the Hurler<br>`barb_axe` | Oathsworn beacon quest | [VOX_BRUTE_ALERT](#vox_brute_alert), [VOX_BRUTE_HURT](#vox_brute_hurt), [VOX_BRUTE_DEATH](#vox_brute_death), [MOVE_HEAVY_STEP](#move_heavy_step), [MAT_BLOOD](#mat_blood), [MAT_STONE](#mat_stone), [MAT_BLADE](#mat_blade), [MAT_STEEL](#mat_steel), [SIG_CLEAVE](#sig_cleave), [SIG_BOSS_WARN](#sig_boss_warn), [SIG_BOSS_PHASE](#sig_boss_phase), [SIG_BOSS_DEFEAT](#sig_boss_defeat), [SIG_RECOVERY](#sig_recovery) | projectile axe/physical: MAT_BLADE,MAT_STEEL |
| Vandil, the Skyfallen<br>`barb_pole` | Oathsworn beacon quest | [VOX_BRUTE_ALERT](#vox_brute_alert), [VOX_BRUTE_HURT](#vox_brute_hurt), [VOX_BRUTE_DEATH](#vox_brute_death), [MOVE_HEAVY_STEP](#move_heavy_step), [MAT_BLOOD](#mat_blood), [MAT_STONE](#mat_stone), [PLAYER_JUMP](#player_jump), [SIG_FISSURE](#sig_fissure), [SIG_BOSS_WARN](#sig_boss_warn), [SIG_BOSS_PHASE](#sig_boss_phase), [SIG_BOSS_DEFEAT](#sig_boss_defeat), [SIG_RECOVERY](#sig_recovery) | leap: PLAYER_JUMP,MOVE_HEAVY_STEP |
| Sigrun, the Stormcleaver<br>`barb_sword` | Oathsworn beacon quest | [VOX_BRUTE_ALERT](#vox_brute_alert), [VOX_BRUTE_HURT](#vox_brute_hurt), [VOX_BRUTE_DEATH](#vox_brute_death), [MOVE_HEAVY_STEP](#move_heavy_step), [MAT_BLOOD](#mat_blood), [MAT_STONE](#mat_stone), [MAT_BLADE](#mat_blade), [MAT_WIND](#mat_wind), [SIG_CLEAVE](#sig_cleave), [SIG_BOSS_WARN](#sig_boss_warn), [SIG_BOSS_PHASE](#sig_boss_phase), [SIG_BOSS_DEFEAT](#sig_boss_defeat), [SIG_RECOVERY](#sig_recovery) | whirl: MAT_BLADE,MAT_WIND |
| Bog Bloat<br>`bog_bloat` | The Weeping Marsh; Abandoned Monastery — Flooded Crypts; The Choir's Ritual; The Spawn Pools; summoned by mire_mother | [VOX_BRUTE_ALERT](#vox_brute_alert), [VOX_BRUTE_HURT](#vox_brute_hurt), [VOX_BRUTE_DEATH](#vox_brute_death), [MOVE_HEAVY_STEP](#move_heavy_step), [MAT_BLOOD](#mat_blood), [MAT_STONE](#mat_stone), [STATUS_POISON](#status_poison), [SIG_BOSS_WARN](#sig_boss_warn), [MAT_ROT](#mat_rot) | poison: STATUS_POISON; deathBurst: SIG_BOSS_WARN,MAT_ROT |
| Glacial Crawler<br>`glacial_crawler` | The Deepfreeze Caverns | [VOX_BRUTE_ALERT](#vox_brute_alert), [VOX_BRUTE_HURT](#vox_brute_hurt), [VOX_BRUTE_DEATH](#vox_brute_death), [MOVE_HEAVY_STEP](#move_heavy_step), [MAT_BLOOD](#mat_blood), [MAT_STONE](#mat_stone), [MAT_FROST](#mat_frost) | melee cold: MAT_FROST |
| The Brood Mother<br>`brood_mother` | The Spawn Pools; quest opt_marsh_2 | [VOX_BRUTE_ALERT](#vox_brute_alert), [VOX_BRUTE_HURT](#vox_brute_hurt), [VOX_BRUTE_DEATH](#vox_brute_death), [MOVE_HEAVY_STEP](#move_heavy_step), [MAT_BLOOD](#mat_blood), [MAT_STONE](#mat_stone), [SIG_BOSS_WARN](#sig_boss_warn), [STATUS_POISON](#status_poison), [MAT_ROOTS](#mat_roots), [MAT_ROT](#mat_rot), [SIG_BILE](#sig_bile), [SIG_GRASP](#sig_grasp), [SIG_BOSS_PHASE](#sig_boss_phase), [SIG_BOSS_DEFEAT](#sig_boss_defeat), [SIG_RECOVERY](#sig_recovery) | slam: SIG_BOSS_WARN,MAT_STONE; poison: STATUS_POISON; summons: MAT_ROOTS,MAT_ROT |
| The Mire Mother<br>`mire_mother` | The Choir's Ritual; quest q12 | [VOX_BRUTE_ALERT](#vox_brute_alert), [VOX_BRUTE_HURT](#vox_brute_hurt), [VOX_BRUTE_DEATH](#vox_brute_death), [MOVE_HEAVY_STEP](#move_heavy_step), [MAT_BLOOD](#mat_blood), [MAT_STONE](#mat_stone), [SIG_BILE](#sig_bile), [SIG_GRASP](#sig_grasp), [SIG_BOSS_WARN](#sig_boss_warn), [SIG_BOSS_PHASE](#sig_boss_phase), [SIG_BOSS_DEFEAT](#sig_boss_defeat), [SIG_RECOVERY](#sig_recovery) | Active authored encounter: use boss table; generic inherited slam/summon/death-burst fields do not define the live rotation |
| Ash Fiend<br>`ash_fiend` | The Cinderfields; The Cinder Bastion; summoned by wretch_lord | [VOX_BRUTE_ALERT](#vox_brute_alert), [VOX_BRUTE_HURT](#vox_brute_hurt), [VOX_BRUTE_DEATH](#vox_brute_death), [MOVE_HEAVY_STEP](#move_heavy_step), [MAT_BLOOD](#mat_blood), [MAT_STONE](#mat_stone) |  |
| Pit Brute<br>`pit_brute` | The Cinderfields; The Cinder Bastion; The Throne of Cinders | [VOX_BRUTE_ALERT](#vox_brute_alert), [VOX_BRUTE_HURT](#vox_brute_hurt), [VOX_BRUTE_DEATH](#vox_brute_death), [MOVE_HEAVY_STEP](#move_heavy_step), [MAT_BLOOD](#mat_blood), [MAT_STONE](#mat_stone), [SIG_BOSS_WARN](#sig_boss_warn) | slam: SIG_BOSS_WARN,MAT_STONE |
| Wretch Lord<br>`wretch_lord` | The Cinder Bastion; The Throne of Cinders | [VOX_BRUTE_ALERT](#vox_brute_alert), [VOX_BRUTE_HURT](#vox_brute_hurt), [VOX_BRUTE_DEATH](#vox_brute_death), [MOVE_HEAVY_STEP](#move_heavy_step), [MAT_BLOOD](#mat_blood), [MAT_STONE](#mat_stone), [MAT_FIRE](#mat_fire), [MAT_SHADOW](#mat_shadow) | projectile shardbolt/fire: MAT_FIRE; summons: MAT_FIRE,MAT_SHADOW |
| Echo of the Hollow King<br>`malthoron_echo` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_BRUTE_ALERT](#vox_brute_alert), [VOX_BRUTE_HURT](#vox_brute_hurt), [VOX_BRUTE_DEATH](#vox_brute_death), [MOVE_HEAVY_STEP](#move_heavy_step), [MAT_BLOOD](#mat_blood), [MAT_STONE](#mat_stone) |  |
| Echo of the Gilded King<br>`azram_echo` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_BRUTE_ALERT](#vox_brute_alert), [VOX_BRUTE_HURT](#vox_brute_hurt), [VOX_BRUTE_DEATH](#vox_brute_death), [MOVE_HEAVY_STEP](#move_heavy_step), [MAT_BLOOD](#mat_blood), [MAT_STONE](#mat_stone) |  |
| Pale Tormentor<br>`r26_brute` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_BRUTE_ALERT](#vox_brute_alert), [VOX_BRUTE_HURT](#vox_brute_hurt), [VOX_BRUTE_DEATH](#vox_brute_death), [MOVE_HEAVY_STEP](#move_heavy_step), [MAT_BLOOD](#mat_blood), [MAT_STONE](#mat_stone), [MAT_FROST](#mat_frost), [STATUS_FROZEN](#status_frozen) | projectile shardbolt/cold: MAT_FROST; chillOnHit: STATUS_FROZEN |
| Rotting Mauler<br>`r31_brute` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_BRUTE_ALERT](#vox_brute_alert), [VOX_BRUTE_HURT](#vox_brute_hurt), [VOX_BRUTE_DEATH](#vox_brute_death), [MOVE_HEAVY_STEP](#move_heavy_step), [MAT_BLOOD](#mat_blood), [MAT_STONE](#mat_stone), [STATUS_POISON](#status_poison) | poison: STATUS_POISON |
| Wretched Render<br>`r36_brute` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_BRUTE_ALERT](#vox_brute_alert), [VOX_BRUTE_HURT](#vox_brute_hurt), [VOX_BRUTE_DEATH](#vox_brute_death), [MOVE_HEAVY_STEP](#move_heavy_step), [MAT_BLOOD](#mat_blood), [MAT_STONE](#mat_stone), [MAT_WIND](#mat_wind) | charge: MAT_WIND,MAT_BLOOD |
| Hollow Brute<br>`r41_brute` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_BRUTE_ALERT](#vox_brute_alert), [VOX_BRUTE_HURT](#vox_brute_hurt), [VOX_BRUTE_DEATH](#vox_brute_death), [MOVE_HEAVY_STEP](#move_heavy_step), [MAT_BLOOD](#mat_blood), [MAT_STONE](#mat_stone) |  |
| Gilded Horror<br>`r46_brute` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_BRUTE_ALERT](#vox_brute_alert), [VOX_BRUTE_HURT](#vox_brute_hurt), [VOX_BRUTE_DEATH](#vox_brute_death), [MOVE_HEAVY_STEP](#move_heavy_step), [MAT_BLOOD](#mat_blood), [MAT_STONE](#mat_stone), [SIG_BOSS_WARN](#sig_boss_warn), [MAT_SPARK](#mat_spark) | slam: SIG_BOSS_WARN,MAT_STONE; melee light: MAT_SPARK |
| Frozen Render<br>`r52_brute` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_BRUTE_ALERT](#vox_brute_alert), [VOX_BRUTE_HURT](#vox_brute_hurt), [VOX_BRUTE_DEATH](#vox_brute_death), [MOVE_HEAVY_STEP](#move_heavy_step), [MAT_BLOOD](#mat_blood), [MAT_STONE](#mat_stone), [SIG_BOSS_WARN](#sig_boss_warn), [STATUS_FROZEN](#status_frozen), [MAT_FROST](#mat_frost) | slam: SIG_BOSS_WARN,MAT_STONE; chillOnHit: STATUS_FROZEN; melee cold: MAT_FROST |
| Dread Render<br>`r57_brute` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_BRUTE_ALERT](#vox_brute_alert), [VOX_BRUTE_HURT](#vox_brute_hurt), [VOX_BRUTE_DEATH](#vox_brute_death), [MOVE_HEAVY_STEP](#move_heavy_step), [MAT_BLOOD](#mat_blood), [MAT_STONE](#mat_stone), [MAT_WIND](#mat_wind) | charge: MAT_WIND,MAT_BLOOD |
| Howling Horror<br>`r62_brute` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_BRUTE_ALERT](#vox_brute_alert), [VOX_BRUTE_HURT](#vox_brute_hurt), [VOX_BRUTE_DEATH](#vox_brute_death), [MOVE_HEAVY_STEP](#move_heavy_step), [MAT_BLOOD](#mat_blood), [MAT_STONE](#mat_stone), [SIG_BOSS_WARN](#sig_boss_warn) | slam: SIG_BOSS_WARN,MAT_STONE |
| Vile Devil<br>`r67_brute` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_BRUTE_ALERT](#vox_brute_alert), [VOX_BRUTE_HURT](#vox_brute_hurt), [VOX_BRUTE_DEATH](#vox_brute_death), [MOVE_HEAVY_STEP](#move_heavy_step), [MAT_BLOOD](#mat_blood), [MAT_STONE](#mat_stone), [STATUS_POISON](#status_poison), [SIG_BOSS_WARN](#sig_boss_warn), [MAT_ROT](#mat_rot) | poison: STATUS_POISON; deathBurst: SIG_BOSS_WARN,MAT_ROT |
| Galvanic Fiend<br>`r72_brute` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_BRUTE_ALERT](#vox_brute_alert), [VOX_BRUTE_HURT](#vox_brute_hurt), [VOX_BRUTE_DEATH](#vox_brute_death), [MOVE_HEAVY_STEP](#move_heavy_step), [MAT_BLOOD](#mat_blood), [MAT_STONE](#mat_stone), [SIG_BOSS_WARN](#sig_boss_warn), [MAT_SPARK](#mat_spark) | slam: SIG_BOSS_WARN,MAT_STONE; melee light: MAT_SPARK |
| Putrid Horror<br>`r78_brute` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_BRUTE_ALERT](#vox_brute_alert), [VOX_BRUTE_HURT](#vox_brute_hurt), [VOX_BRUTE_DEATH](#vox_brute_death), [MOVE_HEAVY_STEP](#move_heavy_step), [MAT_BLOOD](#mat_blood), [MAT_STONE](#mat_stone), [STATUS_POISON](#status_poison), [SIG_BOSS_WARN](#sig_boss_warn), [MAT_ROT](#mat_rot) | poison: STATUS_POISON; deathBurst: SIG_BOSS_WARN,MAT_ROT |
| Grave Devil<br>`r83_brute` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_BRUTE_ALERT](#vox_brute_alert), [VOX_BRUTE_HURT](#vox_brute_hurt), [VOX_BRUTE_DEATH](#vox_brute_death), [MOVE_HEAVY_STEP](#move_heavy_step), [MAT_BLOOD](#mat_blood), [MAT_STONE](#mat_stone), [MAT_BONE](#mat_bone) | summons: MAT_BONE |
| Gloom Fiend<br>`r88_brute` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_BRUTE_ALERT](#vox_brute_alert), [VOX_BRUTE_HURT](#vox_brute_hurt), [VOX_BRUTE_DEATH](#vox_brute_death), [MOVE_HEAVY_STEP](#move_heavy_step), [MAT_BLOOD](#mat_blood), [MAT_STONE](#mat_stone), [MAT_SHIELD](#mat_shield) | shield: MAT_SHIELD |
| Arcing Maw<br>`r93_brute` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_BRUTE_ALERT](#vox_brute_alert), [VOX_BRUTE_HURT](#vox_brute_hurt), [VOX_BRUTE_DEATH](#vox_brute_death), [MOVE_HEAVY_STEP](#move_heavy_step), [MAT_BLOOD](#mat_blood), [MAT_STONE](#mat_stone), [MAT_FIRE](#mat_fire), [SIG_CHOIR_SUMMON](#sig_choir_summon) | projectile shardbolt/fire: MAT_FIRE; heals: SIG_CHOIR_SUMMON |
| Smouldering Tormentor<br>`r98_brute` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_BRUTE_ALERT](#vox_brute_alert), [VOX_BRUTE_HURT](#vox_brute_hurt), [VOX_BRUTE_DEATH](#vox_brute_death), [MOVE_HEAVY_STEP](#move_heavy_step), [MAT_BLOOD](#mat_blood), [MAT_STONE](#mat_stone), [MAT_FIRE](#mat_fire) | projectile shardbolt/fire: MAT_FIRE |

<a id="enemy-family-hound"></a>

#### HOUND roster

| Enemy / ID | Placement or scripted source | Required bank cues | Special events / regional note |
| --- | --- | --- | --- |
| Grave Hound<br>`grave_hound` | The Ashen Fields; The Blackbough | [VOX_HOUND_ALERT](#vox_hound_alert), [VOX_HOUND_HURT](#vox_hound_hurt), [VOX_HOUND_DEATH](#vox_hound_death), [MOVE_PAWS](#move_paws), [MAT_GROWL](#mat_growl), [MAT_BLOOD](#mat_blood) |  |
| Ice Lurker<br>`ice_lurker` | The Fallen North; The Abandoned Mines; The Shardpeak Shrine; The Deepfreeze Caverns | [VOX_HOUND_ALERT](#vox_hound_alert), [VOX_HOUND_HURT](#vox_hound_hurt), [VOX_HOUND_DEATH](#vox_hound_death), [MOVE_PAWS](#move_paws), [MAT_GROWL](#mat_growl), [MAT_BLOOD](#mat_blood), [STATUS_FROZEN](#status_frozen), [MAT_FROST](#mat_frost) | chillOnHit: STATUS_FROZEN; melee cold: MAT_FROST |
| Hoarfang, the Spring's Keeper<br>`hoarfang` | The Deepfreeze Caverns; quest opt_north_2 | [VOX_HOUND_ALERT](#vox_hound_alert), [VOX_HOUND_HURT](#vox_hound_hurt), [VOX_HOUND_DEATH](#vox_hound_death), [MOVE_PAWS](#move_paws), [MAT_GROWL](#mat_growl), [MAT_BLOOD](#mat_blood), [SIG_BOSS_WARN](#sig_boss_warn), [MAT_STONE](#mat_stone), [MAT_BONE](#mat_bone), [MAT_FROST](#mat_frost), [STATUS_FROZEN](#status_frozen), [SIG_FROST_SLAM](#sig_frost_slam), [SIG_BOSS_PHASE](#sig_boss_phase), [SIG_BOSS_DEFEAT](#sig_boss_defeat), [SIG_RECOVERY](#sig_recovery) | slam: SIG_BOSS_WARN,MAT_STONE; summons: MAT_BONE; deathBurst: SIG_BOSS_WARN,MAT_FROST; chillOnHit: STATUS_FROZEN |
| Soul Eater<br>`soul_eater` | The Shattered Cathedral; The Cathedral Heart; Cinderwatch Remembered | [VOX_HOUND_ALERT](#vox_hound_alert), [VOX_HOUND_HURT](#vox_hound_hurt), [VOX_HOUND_DEATH](#vox_hound_death), [MOVE_PAWS](#move_paws), [MAT_GROWL](#mat_growl), [MAT_BLOOD](#mat_blood) |  |
| Cinder Hound<br>`cinder_hound` | The Cinderfields; The Cinder Bastion; The Throne of Cinders; summoned by wretch_lord | [VOX_HOUND_ALERT](#vox_hound_alert), [VOX_HOUND_HURT](#vox_hound_hurt), [VOX_HOUND_DEATH](#vox_hound_death), [MOVE_PAWS](#move_paws), [MAT_GROWL](#mat_growl), [MAT_BLOOD](#mat_blood), [MAT_FIRE](#mat_fire) | melee fire: MAT_FIRE |
| Gloom Hound<br>`r0_hound` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_HOUND_ALERT](#vox_hound_alert), [VOX_HOUND_HURT](#vox_hound_hurt), [VOX_HOUND_DEATH](#vox_hound_death), [MOVE_PAWS](#move_paws), [MAT_GROWL](#mat_growl), [MAT_BLOOD](#mat_blood) |  |
| Bone Houndbeast<br>`r5_hound` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_HOUND_ALERT](#vox_hound_alert), [VOX_HOUND_HURT](#vox_hound_hurt), [VOX_HOUND_DEATH](#vox_hound_death), [MOVE_PAWS](#move_paws), [MAT_GROWL](#mat_growl), [MAT_BLOOD](#mat_blood), [PLAYER_JUMP](#player_jump), [MOVE_HEAVY_STEP](#move_heavy_step) | leap: PLAYER_JUMP,MOVE_HEAVY_STEP |
| Dread Snapper<br>`r10_hound` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_HOUND_ALERT](#vox_hound_alert), [VOX_HOUND_HURT](#vox_hound_hurt), [VOX_HOUND_DEATH](#vox_hound_death), [MOVE_PAWS](#move_paws), [MAT_GROWL](#mat_growl), [MAT_BLOOD](#mat_blood), [MAT_WIND](#mat_wind) | charge: MAT_WIND,MAT_BLOOD |
| Sunken Mauler<br>`r15_hound` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_HOUND_ALERT](#vox_hound_alert), [VOX_HOUND_HURT](#vox_hound_hurt), [VOX_HOUND_DEATH](#vox_hound_death), [MOVE_PAWS](#move_paws), [MAT_GROWL](#mat_growl), [MAT_BLOOD](#mat_blood), [SIG_BOSS_WARN](#sig_boss_warn), [MAT_STONE](#mat_stone) | slam: SIG_BOSS_WARN,MAT_STONE |
| Wretched Ripper<br>`r20_hound` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_HOUND_ALERT](#vox_hound_alert), [VOX_HOUND_HURT](#vox_hound_hurt), [VOX_HOUND_DEATH](#vox_hound_death), [MOVE_PAWS](#move_paws), [MAT_GROWL](#mat_growl), [MAT_BLOOD](#mat_blood) |  |

<a id="enemy-family-serpent"></a>

#### SERPENT roster

| Enemy / ID | Placement or scripted source | Required bank cues | Special events / regional note |
| --- | --- | --- | --- |
| Cave Constrictor<br>`cave_python` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_SERPENT_ALERT](#vox_serpent_alert), [VOX_SERPENT_HURT](#vox_serpent_hurt), [VOX_SERPENT_DEATH](#vox_serpent_death), [MOVE_SLITHER](#move_slither), [MAT_BLOOD](#mat_blood), [MAT_ROT](#mat_rot), [MAT_WIND](#mat_wind), [STATUS_POISON](#status_poison) | charge: MAT_WIND,MAT_BLOOD; poison: STATUS_POISON |
| Marsh Serpent<br>`marsh_serpent` | The Weeping Marsh; The Hollow Reeds; The Spawn Pools | [VOX_SERPENT_ALERT](#vox_serpent_alert), [VOX_SERPENT_HURT](#vox_serpent_hurt), [VOX_SERPENT_DEATH](#vox_serpent_death), [MOVE_SLITHER](#move_slither), [MAT_BLOOD](#mat_blood), [MAT_ROT](#mat_rot), [MAT_WIND](#mat_wind), [STATUS_POISON](#status_poison) | charge: MAT_WIND,MAT_BLOOD; poison: STATUS_POISON |
| Dune Serpent<br>`dune_serpent` | The Shard Flats; The Shifting Wastes | [VOX_SERPENT_ALERT](#vox_serpent_alert), [VOX_SERPENT_HURT](#vox_serpent_hurt), [VOX_SERPENT_DEATH](#vox_serpent_death), [MOVE_SLITHER](#move_slither), [MAT_BLOOD](#mat_blood), [MAT_ROT](#mat_rot), [MAT_WIND](#mat_wind), [STATUS_POISON](#status_poison) | charge: MAT_WIND,MAT_BLOOD; poison: STATUS_POISON |
| Vethriss, the Veiled Lord<br>`vethriss` | The Throne of Cinders; quest q18 | [VOX_SERPENT_ALERT](#vox_serpent_alert), [VOX_SERPENT_HURT](#vox_serpent_hurt), [VOX_SERPENT_DEATH](#vox_serpent_death), [MOVE_SLITHER](#move_slither), [MAT_BLOOD](#mat_blood), [MAT_ROT](#mat_rot), [SIG_BORROWED_LIGHT](#sig_borrowed_light), [SIG_SERPENT_LUNGE](#sig_serpent_lunge), [SIG_DECOY](#sig_decoy), [SIG_DECOY_BREAK](#sig_decoy_break), [SIG_FISSURE](#sig_fissure), [SIG_BILE](#sig_bile), [SIG_GOLD_CHAINS](#sig_gold_chains), [SIG_BEAM](#sig_beam), [SIG_BOSS_WARN](#sig_boss_warn), [SIG_BOSS_PHASE](#sig_boss_phase), [SIG_BOSS_DEFEAT](#sig_boss_defeat), [SIG_RECOVERY](#sig_recovery), [VOX_HUMAN_ALERT](#vox_human_alert), [VOX_HUMAN_HURT](#vox_human_hurt), [VOX_SPIRIT_ALERT](#vox_spirit_alert), [VOX_SPIRIT_DEATH](#vox_spirit_death) | Active authored encounter: use boss table; generic inherited slam/summon/death-burst fields do not define the live rotation |

<a id="enemy-family-insect"></a>

#### INSECT roster

| Enemy / ID | Placement or scripted source | Required bank cues | Special events / regional note |
| --- | --- | --- | --- |
| Crypt Widow<br>`crypt_widow` | Sunken Crypt — Hollows; Sunken Crypt — The Vigil | [VOX_INSECT_ALERT](#vox_insect_alert), [VOX_INSECT_HURT](#vox_insect_hurt), [VOX_INSECT_DEATH](#vox_insect_death), [MOVE_CHITIN](#move_chitin), [MAT_BLOOD](#mat_blood), [MAT_ROT](#mat_rot), [STATUS_POISON](#status_poison) | poison: STATUS_POISON |
| Blight Wasp<br>`blight_wasp` | The Blackbough; Greymonastery — Sanctum | [VOX_INSECT_ALERT](#vox_insect_alert), [VOX_INSECT_HURT](#vox_insect_hurt), [VOX_INSECT_DEATH](#vox_insect_death), [MOVE_CHITIN](#move_chitin), [MAT_BLOOD](#mat_blood), [MAT_ROT](#mat_rot), [STATUS_POISON](#status_poison) | poison: STATUS_POISON |
| Marsh Wretch<br>`marsh_wretch` | The Weeping Marsh; The Hollow Reeds; The Spawn Pools; summoned by lure_child | [VOX_INSECT_ALERT](#vox_insect_alert), [VOX_INSECT_HURT](#vox_insect_hurt), [VOX_INSECT_DEATH](#vox_insect_death), [MOVE_CHITIN](#move_chitin), [MAT_BLOOD](#mat_blood), [MAT_ROT](#mat_rot), [STATUS_POISON](#status_poison) | poison: STATUS_POISON |
| Shatter Wasp<br>`shatter_wasp` | The Deepfreeze Caverns | [VOX_INSECT_ALERT](#vox_insect_alert), [VOX_INSECT_HURT](#vox_insect_hurt), [VOX_INSECT_DEATH](#vox_insect_death), [MOVE_CHITIN](#move_chitin), [MAT_BLOOD](#mat_blood), [MAT_ROT](#mat_rot), [MAT_FROST](#mat_frost) | melee cold: MAT_FROST |
| Marsh Larvae<br>`marsh_larvae` | The Spawn Pools; summoned by brood_mother | [VOX_INSECT_ALERT](#vox_insect_alert), [VOX_INSECT_HURT](#vox_insect_hurt), [VOX_INSECT_DEATH](#vox_insect_death), [MOVE_CHITIN](#move_chitin), [MAT_BLOOD](#mat_blood), [MAT_ROT](#mat_rot), [STATUS_POISON](#status_poison) | poison: STATUS_POISON |
| Grave Broodling<br>`r3_spider` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_INSECT_ALERT](#vox_insect_alert), [VOX_INSECT_HURT](#vox_insect_hurt), [VOX_INSECT_DEATH](#vox_insect_death), [MOVE_CHITIN](#move_chitin), [MAT_BLOOD](#mat_blood), [MAT_ROT](#mat_rot), [SIG_BOSS_WARN](#sig_boss_warn), [MAT_STONE](#mat_stone) | slam: SIG_BOSS_WARN,MAT_STONE |
| Gloom Crawler<br>`r8_spider` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_INSECT_ALERT](#vox_insect_alert), [VOX_INSECT_HURT](#vox_insect_hurt), [VOX_INSECT_DEATH](#vox_insect_death), [MOVE_CHITIN](#move_chitin), [MAT_BLOOD](#mat_blood), [MAT_ROT](#mat_rot) |  |
| Putrid Widow<br>`r13_spider` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_INSECT_ALERT](#vox_insect_alert), [VOX_INSECT_HURT](#vox_insect_hurt), [VOX_INSECT_DEATH](#vox_insect_death), [MOVE_CHITIN](#move_chitin), [MAT_BLOOD](#mat_blood), [MAT_ROT](#mat_rot), [STATUS_POISON](#status_poison) | poison: STATUS_POISON |
| Dread Biter<br>`r18_spider` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_INSECT_ALERT](#vox_insect_alert), [VOX_INSECT_HURT](#vox_insect_hurt), [VOX_INSECT_DEATH](#vox_insect_death), [MOVE_CHITIN](#move_chitin), [MAT_BLOOD](#mat_blood), [MAT_ROT](#mat_rot) |  |
| Sunken Lurker<br>`r23_spider` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_INSECT_ALERT](#vox_insect_alert), [VOX_INSECT_HURT](#vox_insect_hurt), [VOX_INSECT_DEATH](#vox_insect_death), [MOVE_CHITIN](#move_chitin), [MAT_BLOOD](#mat_blood), [MAT_ROT](#mat_rot), [PLAYER_JUMP](#player_jump), [MOVE_HEAVY_STEP](#move_heavy_step) | leap: PLAYER_JUMP,MOVE_HEAVY_STEP |

<a id="enemy-family-metal"></a>

#### METAL roster

| Enemy / ID | Placement or scripted source | Required bank cues | Special events / regional note |
| --- | --- | --- | --- |
| Fallen Blade<br>`fallen_blade` | Sunken Crypt — The Vigil; The Ruined Chapel; Greymonastery — Cloister; Greymonastery — Sanctum | [VOX_METAL_ALERT](#vox_metal_alert), [VOX_METAL_HURT](#vox_metal_hurt), [VOX_METAL_DEATH](#vox_metal_death), [PLAYER_ARMOR](#player_armor), [MAT_BLADE](#mat_blade), [MAT_STEEL](#mat_steel), [MAT_SHIELD](#mat_shield) | shield: MAT_SHIELD |
| Tomb Sentinel<br>`tomb_guard` | Tomb of the Chained Sovereign; The Shifting Wastes; The Shifting Tombs; Palace of Khal-Zahir; summoned by azram | [VOX_METAL_ALERT](#vox_metal_alert), [VOX_METAL_HURT](#vox_metal_hurt), [VOX_METAL_DEATH](#vox_metal_death), [PLAYER_ARMOR](#player_armor), [MAT_BLADE](#mat_blade), [MAT_STEEL](#mat_steel), [MAT_SHIELD](#mat_shield) | shield: MAT_SHIELD |
| Hollow Knight<br>`hollow_knight` | The Shattered Cathedral; The Cathedral Heart; Cinderwatch Remembered; The Last Bastion’s Echo | [VOX_METAL_ALERT](#vox_metal_alert), [VOX_METAL_HURT](#vox_metal_hurt), [VOX_METAL_DEATH](#vox_metal_death), [PLAYER_ARMOR](#player_armor), [MAT_BLADE](#mat_blade), [MAT_STEEL](#mat_steel), [MAT_SHIELD](#mat_shield) | shield: MAT_SHIELD |
| Malthoron, the Hollow King<br>`malthoron` | The Cathedral Heart; quest q17 | [VOX_METAL_ALERT](#vox_metal_alert), [VOX_METAL_HURT](#vox_metal_hurt), [VOX_METAL_DEATH](#vox_metal_death), [PLAYER_ARMOR](#player_armor), [MAT_BLADE](#mat_blade), [MAT_STEEL](#mat_steel), [SIG_QUIETING_CHAINS](#sig_quieting_chains), [SIG_ARMOR_BREAK](#sig_armor_break), [SIG_SOUL_VOLLEY](#sig_soul_volley), [SIG_BEAM](#sig_beam), [SIG_CLEAVE](#sig_cleave), [SIG_BOSS_WARN](#sig_boss_warn), [SIG_BOSS_PHASE](#sig_boss_phase), [SIG_BOSS_DEFEAT](#sig_boss_defeat), [SIG_RECOVERY](#sig_recovery), [VOX_SPIRIT_ALERT](#vox_spirit_alert), [VOX_SPIRIT_DEATH](#vox_spirit_death) | Active authored encounter: use boss table; generic inherited slam/summon/death-burst fields do not define the live rotation |
| Cinder Impaler<br>`impaler` | The Cinderfields; The Cinder Bastion; The Throne of Cinders | [VOX_METAL_ALERT](#vox_metal_alert), [VOX_METAL_HURT](#vox_metal_hurt), [VOX_METAL_DEATH](#vox_metal_death), [PLAYER_ARMOR](#player_armor), [MAT_BLADE](#mat_blade), [MAT_STEEL](#mat_steel), [MAT_FIRE](#mat_fire) | projectile shardbolt/fire: MAT_FIRE |
| Ashen Marshal<br>`r50_knight` | The Cinderfields | [VOX_METAL_ALERT](#vox_metal_alert), [VOX_METAL_HURT](#vox_metal_hurt), [VOX_METAL_DEATH](#vox_metal_death), [PLAYER_ARMOR](#player_armor), [MAT_BLADE](#mat_blade), [MAT_STEEL](#mat_steel), [MAT_FIRE](#mat_fire) | melee fire: MAT_FIRE |
| Ashen Defiler<br>`r55_knight` | The Cinder Bastion; The Throne of Cinders | [VOX_METAL_ALERT](#vox_metal_alert), [VOX_METAL_HURT](#vox_metal_hurt), [VOX_METAL_DEATH](#vox_metal_death), [PLAYER_ARMOR](#player_armor), [MAT_BLADE](#mat_blade), [MAT_STEEL](#mat_steel), [MAT_WIND](#mat_wind), [MAT_BLOOD](#mat_blood), [MAT_FIRE](#mat_fire) | charge: MAT_WIND,MAT_BLOOD; melee fire: MAT_FIRE |
| Storm Templar<br>`r60_knight` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_METAL_ALERT](#vox_metal_alert), [VOX_METAL_HURT](#vox_metal_hurt), [VOX_METAL_DEATH](#vox_metal_death), [PLAYER_ARMOR](#player_armor), [MAT_BLADE](#mat_blade), [MAT_STEEL](#mat_steel) |  |
| Hollow Vanguard<br>`r65_knight` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_METAL_ALERT](#vox_metal_alert), [VOX_METAL_HURT](#vox_metal_hurt), [VOX_METAL_DEATH](#vox_metal_death), [PLAYER_ARMOR](#player_armor), [MAT_BLADE](#mat_blade), [MAT_STEEL](#mat_steel), [MAT_WIND](#mat_wind) | whirl: MAT_BLADE,MAT_WIND |
| Frost Warden<br>`r70_knight` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_METAL_ALERT](#vox_metal_alert), [VOX_METAL_HURT](#vox_metal_hurt), [VOX_METAL_DEATH](#vox_metal_death), [PLAYER_ARMOR](#player_armor), [MAT_BLADE](#mat_blade), [MAT_STEEL](#mat_steel), [STATUS_FROZEN](#status_frozen), [MAT_FROST](#mat_frost) | chillOnHit: STATUS_FROZEN; melee cold: MAT_FROST |
| Wretched Templar<br>`r76_knight` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_METAL_ALERT](#vox_metal_alert), [VOX_METAL_HURT](#vox_metal_hurt), [VOX_METAL_DEATH](#vox_metal_death), [PLAYER_ARMOR](#player_armor), [MAT_BLADE](#mat_blade), [MAT_STEEL](#mat_steel), [MAT_BONE](#mat_bone) | summons: MAT_BONE |
| Dread Templar<br>`r81_knight` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_METAL_ALERT](#vox_metal_alert), [VOX_METAL_HURT](#vox_metal_hurt), [VOX_METAL_DEATH](#vox_metal_death), [PLAYER_ARMOR](#player_armor), [MAT_BLADE](#mat_blade), [MAT_STEEL](#mat_steel), [MAT_SHIELD](#mat_shield) | shield: MAT_SHIELD |
| Gilded Warden<br>`r86_knight` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_METAL_ALERT](#vox_metal_alert), [VOX_METAL_HURT](#vox_metal_hurt), [VOX_METAL_DEATH](#vox_metal_death), [PLAYER_ARMOR](#player_armor), [MAT_BLADE](#mat_blade), [MAT_STEEL](#mat_steel), [MAT_FIRE](#mat_fire), [SIG_CHOIR_SUMMON](#sig_choir_summon) | projectile shardbolt/fire: MAT_FIRE; heals: SIG_CHOIR_SUMMON |
| Cinder Knight<br>`r91_knight` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_METAL_ALERT](#vox_metal_alert), [VOX_METAL_HURT](#vox_metal_hurt), [VOX_METAL_DEATH](#vox_metal_death), [PLAYER_ARMOR](#player_armor), [MAT_BLADE](#mat_blade), [MAT_STEEL](#mat_steel), [MAT_FIRE](#mat_fire) | projectile shardbolt/fire: MAT_FIRE |
| Gloom Sentinel<br>`r96_knight` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_METAL_ALERT](#vox_metal_alert), [VOX_METAL_HURT](#vox_metal_hurt), [VOX_METAL_DEATH](#vox_metal_death), [PLAYER_ARMOR](#player_armor), [MAT_BLADE](#mat_blade), [MAT_STEEL](#mat_steel), [MAT_WIND](#mat_wind) | whirl: MAT_BLADE,MAT_WIND |

<a id="enemy-family-spirit"></a>

#### SPIRIT roster

| Enemy / ID | Placement or scripted source | Required bank cues | Special events / regional note |
| --- | --- | --- | --- |
| Grave Wraith<br>`grave_wraith` | Sunken Crypt — Hollows; Sunken Crypt — The Vigil | [VOX_SPIRIT_ALERT](#vox_spirit_alert), [VOX_SPIRIT_HURT](#vox_spirit_hurt), [VOX_SPIRIT_DEATH](#vox_spirit_death), [MOVE_FLOAT](#move_float), [MAT_SHADOW](#mat_shadow), [MAT_HEX](#mat_hex) | teleports: MAT_SHADOW |
| Frost Wraith<br>`frost_wraith` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_SPIRIT_ALERT](#vox_spirit_alert), [VOX_SPIRIT_HURT](#vox_spirit_hurt), [VOX_SPIRIT_DEATH](#vox_spirit_death), [MOVE_FLOAT](#move_float), [MAT_SHADOW](#mat_shadow), [MAT_HEX](#mat_hex), [MAT_FROST](#mat_frost), [STATUS_FROZEN](#status_frozen) | projectile frostshard/cold: MAT_FROST; teleports: MAT_SHADOW; chillOnHit: STATUS_FROZEN |
| Void Wraith<br>`void_wraith` | The Cinderfields | [VOX_SPIRIT_ALERT](#vox_spirit_alert), [VOX_SPIRIT_HURT](#vox_spirit_hurt), [VOX_SPIRIT_DEATH](#vox_spirit_death), [MOVE_FLOAT](#move_float), [MAT_SHADOW](#mat_shadow), [MAT_HEX](#mat_hex), [SIG_BOSS_WARN](#sig_boss_warn) | projectile soulbolt/shadow: MAT_HEX; teleports: MAT_SHADOW; deathBurst: SIG_BOSS_WARN,MAT_HEX |
| Gloom Shade<br>`gloom_shade` | Greymonastery — Cloister; Greymonastery — Sanctum; summoned by vellath | [VOX_SPIRIT_ALERT](#vox_spirit_alert), [VOX_SPIRIT_HURT](#vox_spirit_hurt), [VOX_SPIRIT_DEATH](#vox_spirit_death), [MOVE_FLOAT](#move_float), [MAT_SHADOW](#mat_shadow), [MAT_HEX](#mat_hex) | teleports: MAT_SHADOW |
| Hollow Child<br>`lure_child` | Abandoned Monastery — Flooded Crypts; The Choir's Ritual; The Hollow Reeds | [VOX_SPIRIT_ALERT](#vox_spirit_alert), [VOX_SPIRIT_HURT](#vox_spirit_hurt), [VOX_SPIRIT_DEATH](#vox_spirit_death), [MOVE_FLOAT](#move_float), [MAT_SHADOW](#mat_shadow), [MAT_HEX](#mat_hex), [MAT_ROOTS](#mat_roots), [MAT_ROT](#mat_rot) | summons: MAT_ROOTS,MAT_ROT; teleports: MAT_SHADOW |
| Prisoned Shade<br>`prisoned_shade` | Tomb of the Chained Sovereign; The Shifting Tombs | [VOX_SPIRIT_ALERT](#vox_spirit_alert), [VOX_SPIRIT_HURT](#vox_spirit_hurt), [VOX_SPIRIT_DEATH](#vox_spirit_death), [MOVE_FLOAT](#move_float), [MAT_SHADOW](#mat_shadow), [MAT_HEX](#mat_hex) | projectile soulbolt/shadow: MAT_HEX; teleports: MAT_SHADOW |
| Chained Soul<br>`soul_chained` | Tomb of the Chained Sovereign; The Shifting Wastes; The Shifting Tombs; Khal-Zahir — Underground Market; Palace of Khal-Zahir; summoned by chained_sovereign | [VOX_SPIRIT_ALERT](#vox_spirit_alert), [VOX_SPIRIT_HURT](#vox_spirit_hurt), [VOX_SPIRIT_DEATH](#vox_spirit_death), [MOVE_FLOAT](#move_float), [MAT_SHADOW](#mat_shadow), [MAT_HEX](#mat_hex), [MAT_SPARK](#mat_spark) | projectile shardbolt/light: MAT_SPARK |
| Dune Shade<br>`dune_shade` | The Shard Flats; The Shifting Wastes; Palace of Khal-Zahir | [VOX_SPIRIT_ALERT](#vox_spirit_alert), [VOX_SPIRIT_HURT](#vox_spirit_hurt), [VOX_SPIRIT_DEATH](#vox_spirit_death), [MOVE_FLOAT](#move_float), [MAT_SHADOW](#mat_shadow), [MAT_HEX](#mat_hex) | teleports: MAT_SHADOW |
| Memory Wraith<br>`memory_wraith` | The Shattered Cathedral; The Cathedral Heart; Cinderwatch Remembered; The Last Bastion’s Echo | [VOX_SPIRIT_ALERT](#vox_spirit_alert), [VOX_SPIRIT_HURT](#vox_spirit_hurt), [VOX_SPIRIT_DEATH](#vox_spirit_death), [MOVE_FLOAT](#move_float), [MAT_SHADOW](#mat_shadow), [MAT_HEX](#mat_hex) | teleports: MAT_SHADOW; melee shadow: MAT_HEX |
| The Empty Archangel<br>`empty_archangel` | The Shattered Cathedral; quest q16 | [VOX_SPIRIT_ALERT](#vox_spirit_alert), [VOX_SPIRIT_HURT](#vox_spirit_hurt), [VOX_SPIRIT_DEATH](#vox_spirit_death), [MOVE_FLOAT](#move_float), [MAT_SHADOW](#mat_shadow), [MAT_HEX](#mat_hex), [SIG_WING_BLADES](#sig_wing_blades), [SIG_DESCENT](#sig_descent), [SIG_CROSS](#sig_cross), [SIG_BOSS_WARN](#sig_boss_warn), [SIG_BOSS_PHASE](#sig_boss_phase), [SIG_BOSS_DEFEAT](#sig_boss_defeat), [SIG_RECOVERY](#sig_recovery) | Active authored encounter: use boss table; generic inherited slam/summon/death-burst fields do not define the live rotation |
| Gilded Shade<br>`r51_wraith` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_SPIRIT_ALERT](#vox_spirit_alert), [VOX_SPIRIT_HURT](#vox_spirit_hurt), [VOX_SPIRIT_DEATH](#vox_spirit_death), [MOVE_FLOAT](#move_float), [MAT_SHADOW](#mat_shadow), [MAT_HEX](#mat_hex) |  |
| Gloom Wraith<br>`r56_wraith` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_SPIRIT_ALERT](#vox_spirit_alert), [VOX_SPIRIT_HURT](#vox_spirit_hurt), [VOX_SPIRIT_DEATH](#vox_spirit_death), [MOVE_FLOAT](#move_float), [MAT_SHADOW](#mat_shadow), [MAT_HEX](#mat_hex), [SIG_BOSS_WARN](#sig_boss_warn), [MAT_STONE](#mat_stone) | slam: SIG_BOSS_WARN,MAT_STONE; melee shadow: MAT_HEX |
| Pale Mourner<br>`r61_wraith` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_SPIRIT_ALERT](#vox_spirit_alert), [VOX_SPIRIT_HURT](#vox_spirit_hurt), [VOX_SPIRIT_DEATH](#vox_spirit_death), [MOVE_FLOAT](#move_float), [MAT_SHADOW](#mat_shadow), [MAT_HEX](#mat_hex), [MAT_FROST](#mat_frost), [STATUS_FROZEN](#status_frozen) | projectile shardbolt/cold: MAT_FROST; chillOnHit: STATUS_FROZEN |
| Dread Banshee<br>`r66_wraith` | The Throne of Cinders | [VOX_SPIRIT_ALERT](#vox_spirit_alert), [VOX_SPIRIT_HURT](#vox_spirit_hurt), [VOX_SPIRIT_DEATH](#vox_spirit_death), [MOVE_FLOAT](#move_float), [MAT_SHADOW](#mat_shadow), [MAT_HEX](#mat_hex) | teleports: MAT_SHADOW; melee shadow: MAT_HEX |
| Sunken Haunt<br>`r71_wraith` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_SPIRIT_ALERT](#vox_spirit_alert), [VOX_SPIRIT_HURT](#vox_spirit_hurt), [VOX_SPIRIT_DEATH](#vox_spirit_death), [MOVE_FLOAT](#move_float), [MAT_SHADOW](#mat_shadow), [MAT_HEX](#mat_hex) | teleports: MAT_SHADOW; melee shadow: MAT_HEX |
| Grave Shade<br>`r75_wraith` | The Throne of Cinders | [VOX_SPIRIT_ALERT](#vox_spirit_alert), [VOX_SPIRIT_HURT](#vox_spirit_hurt), [VOX_SPIRIT_DEATH](#vox_spirit_death), [MOVE_FLOAT](#move_float), [MAT_SHADOW](#mat_shadow), [MAT_HEX](#mat_hex), [SIG_BOSS_WARN](#sig_boss_warn), [MAT_STONE](#mat_stone) | slam: SIG_BOSS_WARN,MAT_STONE; melee shadow: MAT_HEX |
| Hollow Shade<br>`r80_wraith` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_SPIRIT_ALERT](#vox_spirit_alert), [VOX_SPIRIT_HURT](#vox_spirit_hurt), [VOX_SPIRIT_DEATH](#vox_spirit_death), [MOVE_FLOAT](#move_float), [MAT_SHADOW](#mat_shadow), [MAT_HEX](#mat_hex) | teleports: MAT_SHADOW |
| Venom Mourner<br>`r85_wraith` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_SPIRIT_ALERT](#vox_spirit_alert), [VOX_SPIRIT_HURT](#vox_spirit_hurt), [VOX_SPIRIT_DEATH](#vox_spirit_death), [MOVE_FLOAT](#move_float), [MAT_SHADOW](#mat_shadow), [MAT_HEX](#mat_hex), [STATUS_POISON](#status_poison), [SIG_BOSS_WARN](#sig_boss_warn), [MAT_ROT](#mat_rot) | poison: STATUS_POISON; deathBurst: SIG_BOSS_WARN,MAT_ROT |
| Grave Mourner<br>`r90_wraith` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_SPIRIT_ALERT](#vox_spirit_alert), [VOX_SPIRIT_HURT](#vox_spirit_hurt), [VOX_SPIRIT_DEATH](#vox_spirit_death), [MOVE_FLOAT](#move_float), [MAT_SHADOW](#mat_shadow), [MAT_HEX](#mat_hex), [MAT_BONE](#mat_bone) | summons: MAT_BONE |
| Gloom Banshee<br>`r95_wraith` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_SPIRIT_ALERT](#vox_spirit_alert), [VOX_SPIRIT_HURT](#vox_spirit_hurt), [VOX_SPIRIT_DEATH](#vox_spirit_death), [MOVE_FLOAT](#move_float), [MAT_SHADOW](#mat_shadow), [MAT_HEX](#mat_hex), [MAT_SHIELD](#mat_shield) | shield: MAT_SHIELD |

<a id="enemy-family-ooze"></a>

#### OOZE roster

| Enemy / ID | Placement or scripted source | Required bank cues | Special events / regional note |
| --- | --- | --- | --- |
| Caustic Ooze<br>`caustic_ooze` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_OOZE_ALERT](#vox_ooze_alert), [VOX_OOZE_HURT](#vox_ooze_hurt), [VOX_OOZE_DEATH](#vox_ooze_death), [MOVE_SLIME](#move_slime), [MAT_ROT](#mat_rot), [STATUS_POISON](#status_poison), [SIG_SPLIT](#sig_split) | poison: STATUS_POISON; splitOnDeath: SIG_SPLIT |
| Sludge Horror<br>`sludge_horror` | The Spawn Pools | [VOX_OOZE_ALERT](#vox_ooze_alert), [VOX_OOZE_HURT](#vox_ooze_hurt), [VOX_OOZE_DEATH](#vox_ooze_death), [MOVE_SLIME](#move_slime), [MAT_ROT](#mat_rot), [STATUS_POISON](#status_poison), [SIG_BOSS_WARN](#sig_boss_warn), [SIG_SPLIT](#sig_split) | poison: STATUS_POISON; deathBurst: SIG_BOSS_WARN,MAT_ROT; splitOnDeath: SIG_SPLIT |
| Dread Pudding<br>`r2_ooze` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_OOZE_ALERT](#vox_ooze_alert), [VOX_OOZE_HURT](#vox_ooze_hurt), [VOX_OOZE_DEATH](#vox_ooze_death), [MOVE_SLIME](#move_slime), [MAT_ROT](#mat_rot) |  |
| Vile Mass<br>`r7_ooze` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_OOZE_ALERT](#vox_ooze_alert), [VOX_OOZE_HURT](#vox_ooze_hurt), [VOX_OOZE_DEATH](#vox_ooze_death), [MOVE_SLIME](#move_slime), [MAT_ROT](#mat_rot), [STATUS_POISON](#status_poison) | poison: STATUS_POISON |
| Wretched Glob<br>`r12_ooze` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_OOZE_ALERT](#vox_ooze_alert), [VOX_OOZE_HURT](#vox_ooze_hurt), [VOX_OOZE_DEATH](#vox_ooze_death), [MOVE_SLIME](#move_slime), [MAT_ROT](#mat_rot) |  |
| Hollow Sludge<br>`r17_ooze` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_OOZE_ALERT](#vox_ooze_alert), [VOX_OOZE_HURT](#vox_ooze_hurt), [VOX_OOZE_DEATH](#vox_ooze_death), [MOVE_SLIME](#move_slime), [MAT_ROT](#mat_rot), [PLAYER_JUMP](#player_jump), [MOVE_HEAVY_STEP](#move_heavy_step) | leap: PLAYER_JUMP,MOVE_HEAVY_STEP |
| Howling Gel<br>`r22_ooze` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_OOZE_ALERT](#vox_ooze_alert), [VOX_OOZE_HURT](#vox_ooze_hurt), [VOX_OOZE_DEATH](#vox_ooze_death), [MOVE_SLIME](#move_slime), [MAT_ROT](#mat_rot), [MAT_WIND](#mat_wind), [MAT_BLOOD](#mat_blood) | charge: MAT_WIND,MAT_BLOOD |
| Dread Glob<br>`r25_ooze` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_OOZE_ALERT](#vox_ooze_alert), [VOX_OOZE_HURT](#vox_ooze_hurt), [VOX_OOZE_DEATH](#vox_ooze_death), [MOVE_SLIME](#move_slime), [MAT_ROT](#mat_rot), [PLAYER_JUMP](#player_jump), [MOVE_HEAVY_STEP](#move_heavy_step) | leap: PLAYER_JUMP,MOVE_HEAVY_STEP |
| Sunken Sludge<br>`r30_ooze` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_OOZE_ALERT](#vox_ooze_alert), [VOX_OOZE_HURT](#vox_ooze_hurt), [VOX_OOZE_DEATH](#vox_ooze_death), [MOVE_SLIME](#move_slime), [MAT_ROT](#mat_rot), [SIG_SPLIT](#sig_split) | splitOnDeath: SIG_SPLIT |
| Frost Slime<br>`r35_ooze` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_OOZE_ALERT](#vox_ooze_alert), [VOX_OOZE_HURT](#vox_ooze_hurt), [VOX_OOZE_DEATH](#vox_ooze_death), [MOVE_SLIME](#move_slime), [MAT_ROT](#mat_rot), [MAT_FROST](#mat_frost), [STATUS_FROZEN](#status_frozen) | projectile shardbolt/cold: MAT_FROST; chillOnHit: STATUS_FROZEN |
| Venom Ooze<br>`r40_ooze` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_OOZE_ALERT](#vox_ooze_alert), [VOX_OOZE_HURT](#vox_ooze_hurt), [VOX_OOZE_DEATH](#vox_ooze_death), [MOVE_SLIME](#move_slime), [MAT_ROT](#mat_rot), [STATUS_POISON](#status_poison) | poison: STATUS_POISON |
| Bone Quagmire<br>`r45_ooze` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_OOZE_ALERT](#vox_ooze_alert), [VOX_OOZE_HURT](#vox_ooze_hurt), [VOX_OOZE_DEATH](#vox_ooze_death), [MOVE_SLIME](#move_slime), [MAT_ROT](#mat_rot), [MAT_WIND](#mat_wind), [MAT_BLOOD](#mat_blood) | charge: MAT_WIND,MAT_BLOOD |

<a id="enemy-family-wood"></a>

#### WOOD roster

| Enemy / ID | Placement or scripted source | Required bank cues | Special events / regional note |
| --- | --- | --- | --- |
| Gnarl Treant<br>`gnarl_treant` | The Blackbough; The Weeping Marsh; The Hollow Reeds | [VOX_WOOD_ALERT](#vox_wood_alert), [VOX_WOOD_HURT](#vox_wood_hurt), [VOX_WOOD_DEATH](#vox_wood_death), [MAT_ROOTS](#mat_roots), [MAT_STONE](#mat_stone), [SIG_BOSS_WARN](#sig_boss_warn) | slam: SIG_BOSS_WARN,MAT_STONE |
| Blight Treant<br>`blight_treant` | The Choir's Ritual | [VOX_WOOD_ALERT](#vox_wood_alert), [VOX_WOOD_HURT](#vox_wood_hurt), [VOX_WOOD_DEATH](#vox_wood_death), [MAT_ROOTS](#mat_roots), [MAT_STONE](#mat_stone), [SIG_BOSS_WARN](#sig_boss_warn), [STATUS_POISON](#status_poison), [MAT_ROT](#mat_rot) | slam: SIG_BOSS_WARN,MAT_STONE; poison: STATUS_POISON; deathBurst: SIG_BOSS_WARN,MAT_ROT |
| Thorn Shambler<br>`thorn_shambler` | The Blackbough | [VOX_WOOD_ALERT](#vox_wood_alert), [VOX_WOOD_HURT](#vox_wood_hurt), [VOX_WOOD_DEATH](#vox_wood_death), [MAT_ROOTS](#mat_roots), [MAT_STONE](#mat_stone) |  |
| Ember Witherwood<br>`r77_treant` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_WOOD_ALERT](#vox_wood_alert), [VOX_WOOD_HURT](#vox_wood_hurt), [VOX_WOOD_DEATH](#vox_wood_death), [MAT_ROOTS](#mat_roots), [MAT_STONE](#mat_stone), [MAT_FIRE](#mat_fire) | projectile shardbolt/fire: MAT_FIRE |
| Dread Rootmaw<br>`r82_treant` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_WOOD_ALERT](#vox_wood_alert), [VOX_WOOD_HURT](#vox_wood_hurt), [VOX_WOOD_DEATH](#vox_wood_death), [MAT_ROOTS](#mat_roots), [MAT_STONE](#mat_stone), [SIG_BOSS_WARN](#sig_boss_warn) | slam: SIG_BOSS_WARN,MAT_STONE |
| Sunken Barkfiend<br>`r87_treant` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_WOOD_ALERT](#vox_wood_alert), [VOX_WOOD_HURT](#vox_wood_hurt), [VOX_WOOD_DEATH](#vox_wood_death), [MAT_ROOTS](#mat_roots), [MAT_STONE](#mat_stone), [MAT_SHADOW](#mat_shadow) | teleports: MAT_SHADOW |
| Vile Greenmaw<br>`r92_treant` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_WOOD_ALERT](#vox_wood_alert), [VOX_WOOD_HURT](#vox_wood_hurt), [VOX_WOOD_DEATH](#vox_wood_death), [MAT_ROOTS](#mat_roots), [MAT_STONE](#mat_stone), [STATUS_POISON](#status_poison), [SIG_BOSS_WARN](#sig_boss_warn), [MAT_ROT](#mat_rot) | poison: STATUS_POISON; deathBurst: SIG_BOSS_WARN,MAT_ROT |
| Hollow Oldwood<br>`r97_treant` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_WOOD_ALERT](#vox_wood_alert), [VOX_WOOD_HURT](#vox_wood_hurt), [VOX_WOOD_DEATH](#vox_wood_death), [MAT_ROOTS](#mat_roots), [MAT_STONE](#mat_stone), [MAT_BONE](#mat_bone) | summons: MAT_BONE |

<a id="enemy-family-stone"></a>

#### STONE roster

| Enemy / ID | Placement or scripted source | Required bank cues | Special events / regional note |
| --- | --- | --- | --- |
| Stone Gargoyle<br>`stone_gargoyle` | Abandoned Monastery — Flooded Crypts; The Shifting Wastes; The Shifting Tombs | [VOX_STONE_ALERT](#vox_stone_alert), [VOX_STONE_HURT](#vox_stone_hurt), [VOX_STONE_DEATH](#vox_stone_death), [MOVE_HEAVY_STEP](#move_heavy_step), [MAT_STONE](#mat_stone), [PLAYER_JUMP](#player_jump) | leap: PLAYER_JUMP,MOVE_HEAVY_STEP |
| Chapel Grotesque<br>`chapel_grotesque` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_STONE_ALERT](#vox_stone_alert), [VOX_STONE_HURT](#vox_stone_hurt), [VOX_STONE_DEATH](#vox_stone_death), [MOVE_HEAVY_STEP](#move_heavy_step), [MAT_STONE](#mat_stone), [PLAYER_JUMP](#player_jump) | leap: PLAYER_JUMP,MOVE_HEAVY_STEP |
| Void Gargoyle<br>`void_gargoyle` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_STONE_ALERT](#vox_stone_alert), [VOX_STONE_HURT](#vox_stone_hurt), [VOX_STONE_DEATH](#vox_stone_death), [MOVE_HEAVY_STEP](#move_heavy_step), [MAT_STONE](#mat_stone), [PLAYER_JUMP](#player_jump), [SIG_BOSS_WARN](#sig_boss_warn), [MAT_HEX](#mat_hex) | leap: PLAYER_JUMP,MOVE_HEAVY_STEP; deathBurst: SIG_BOSS_WARN,MAT_HEX |
| Shard Construct<br>`shard_construct` | The Shard Flats | [VOX_STONE_ALERT](#vox_stone_alert), [VOX_STONE_HURT](#vox_stone_hurt), [VOX_STONE_DEATH](#vox_stone_death), [MOVE_HEAVY_STEP](#move_heavy_step), [MAT_STONE](#mat_stone), [MAT_ICE](#mat_ice) | projectile shardbolt/phys: MAT_ICE |
| Crystal Marauder<br>`crystal_marauder` | The Shard Flats | [VOX_STONE_ALERT](#vox_stone_alert), [VOX_STONE_HURT](#vox_stone_hurt), [VOX_STONE_DEATH](#vox_stone_death), [MOVE_HEAVY_STEP](#move_heavy_step), [MAT_STONE](#mat_stone) |  |
| Gilded Construct<br>`gilt_construct` | The Shard Flats; Tomb of the Chained Sovereign; The Shifting Tombs; Khal-Zahir — Underground Market; Palace of Khal-Zahir; story guards in underground_market | [VOX_STONE_ALERT](#vox_stone_alert), [VOX_STONE_HURT](#vox_stone_hurt), [VOX_STONE_DEATH](#vox_stone_death), [MOVE_HEAVY_STEP](#move_heavy_step), [MAT_STONE](#mat_stone) |  |

<a id="enemy-family-imp"></a>

#### IMP roster

| Enemy / ID | Placement or scripted source | Required bank cues | Special events / regional note |
| --- | --- | --- | --- |
| Cinder Imp<br>`cinder_imp` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_IMP_ALERT](#vox_imp_alert), [VOX_IMP_HURT](#vox_imp_hurt), [VOX_IMP_DEATH](#vox_imp_death), [MOVE_CHITIN](#move_chitin), [MAT_BLOOD](#mat_blood), [MAT_FIRE](#mat_fire), [MAT_SHADOW](#mat_shadow) | projectile shardbolt/fire: MAT_FIRE; teleports: MAT_SHADOW |
| Hex Imp<br>`hex_imp` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_IMP_ALERT](#vox_imp_alert), [VOX_IMP_HURT](#vox_imp_hurt), [VOX_IMP_DEATH](#vox_imp_death), [MOVE_CHITIN](#move_chitin), [MAT_BLOOD](#mat_blood), [MAT_HEX](#mat_hex), [MAT_SHADOW](#mat_shadow) | projectile soulbolt/shadow: MAT_HEX; teleports: MAT_SHADOW |
| Bone Pyreling<br>`r29_imp` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_IMP_ALERT](#vox_imp_alert), [VOX_IMP_HURT](#vox_imp_hurt), [VOX_IMP_DEATH](#vox_imp_death), [MOVE_CHITIN](#move_chitin), [MAT_BLOOD](#mat_blood), [SIG_BOSS_WARN](#sig_boss_warn), [MAT_STONE](#mat_stone) | slam: SIG_BOSS_WARN,MAT_STONE |
| Dread Stinger<br>`r34_imp` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_IMP_ALERT](#vox_imp_alert), [VOX_IMP_HURT](#vox_imp_hurt), [VOX_IMP_DEATH](#vox_imp_death), [MOVE_CHITIN](#move_chitin), [MAT_BLOOD](#mat_blood), [PLAYER_JUMP](#player_jump), [MOVE_HEAVY_STEP](#move_heavy_step) | leap: PLAYER_JUMP,MOVE_HEAVY_STEP |
| Sunken Scamp<br>`r39_imp` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_IMP_ALERT](#vox_imp_alert), [VOX_IMP_HURT](#vox_imp_hurt), [VOX_IMP_DEATH](#vox_imp_death), [MOVE_CHITIN](#move_chitin), [MAT_BLOOD](#mat_blood), [SIG_SPLIT](#sig_split) | splitOnDeath: SIG_SPLIT |
| Rime Needler<br>`r44_imp` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_IMP_ALERT](#vox_imp_alert), [VOX_IMP_HURT](#vox_imp_hurt), [VOX_IMP_DEATH](#vox_imp_death), [MOVE_CHITIN](#move_chitin), [MAT_BLOOD](#mat_blood), [MAT_FROST](#mat_frost), [STATUS_FROZEN](#status_frozen) | projectile shardbolt/cold: MAT_FROST; chillOnHit: STATUS_FROZEN |
| Blighted Spite<br>`r49_imp` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_IMP_ALERT](#vox_imp_alert), [VOX_IMP_HURT](#vox_imp_hurt), [VOX_IMP_DEATH](#vox_imp_death), [MOVE_CHITIN](#move_chitin), [MAT_BLOOD](#mat_blood), [STATUS_POISON](#status_poison) | poison: STATUS_POISON |
| Howling Imp<br>`r53_imp` | The Cinderfields; The Cinder Bastion | [VOX_IMP_ALERT](#vox_imp_alert), [VOX_IMP_HURT](#vox_imp_hurt), [VOX_IMP_DEATH](#vox_imp_death), [MOVE_CHITIN](#move_chitin), [MAT_BLOOD](#mat_blood), [PLAYER_JUMP](#player_jump), [MOVE_HEAVY_STEP](#move_heavy_step) | leap: PLAYER_JUMP,MOVE_HEAVY_STEP |
| Putrid Stinger<br>`r58_imp` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_IMP_ALERT](#vox_imp_alert), [VOX_IMP_HURT](#vox_imp_hurt), [VOX_IMP_DEATH](#vox_imp_death), [MOVE_CHITIN](#move_chitin), [MAT_BLOOD](#mat_blood), [STATUS_POISON](#status_poison), [SIG_BOSS_WARN](#sig_boss_warn), [MAT_ROT](#mat_rot) | poison: STATUS_POISON; deathBurst: SIG_BOSS_WARN,MAT_ROT |
| Arcing Scamp<br>`r63_imp` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_IMP_ALERT](#vox_imp_alert), [VOX_IMP_HURT](#vox_imp_hurt), [VOX_IMP_DEATH](#vox_imp_death), [MOVE_CHITIN](#move_chitin), [MAT_BLOOD](#mat_blood), [MAT_SPARK](#mat_spark) | projectile shardbolt/light: MAT_SPARK |
| Smouldering Needler<br>`r68_imp` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_IMP_ALERT](#vox_imp_alert), [VOX_IMP_HURT](#vox_imp_hurt), [VOX_IMP_DEATH](#vox_imp_death), [MOVE_CHITIN](#move_chitin), [MAT_BLOOD](#mat_blood), [MAT_FIRE](#mat_fire) | projectile shardbolt/fire: MAT_FIRE |
| Smouldering Spite<br>`r73_imp` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_IMP_ALERT](#vox_imp_alert), [VOX_IMP_HURT](#vox_imp_hurt), [VOX_IMP_DEATH](#vox_imp_death), [MOVE_CHITIN](#move_chitin), [MAT_BLOOD](#mat_blood), [MAT_FIRE](#mat_fire) | projectile shardbolt/fire: MAT_FIRE |

<a id="enemy-family-choir"></a>

#### CHOIR roster

| Enemy / ID | Placement or scripted source | Required bank cues | Special events / regional note |
| --- | --- | --- | --- |
| Silent Choirman<br>`silent_cultist` | The Weeping Marsh; Abandoned Monastery — Flooded Crypts; The Choir's Ritual; The Spawn Pools; summoned by choirmaster | [VOX_CHOIR_ALERT](#vox_choir_alert), [VOX_CHOIR_HURT](#vox_choir_hurt), [VOX_CHOIR_DEATH](#vox_choir_death), [MAT_CLOTH](#mat_cloth), [MAT_HEX](#mat_hex), [MAT_FROST](#mat_frost) | projectile shardbolt/cold: MAT_FROST |
| Vorthel, the High Choirmaster<br>`choirmaster` | ritual quest; quest q11 | [VOX_CHOIR_ALERT](#vox_choir_alert), [VOX_CHOIR_HURT](#vox_choir_hurt), [VOX_CHOIR_DEATH](#vox_choir_death), [MAT_CLOTH](#mat_cloth), [MAT_HEX](#mat_hex), [SIG_CHOIR_SUMMON](#sig_choir_summon), [SIG_CORPSE_BURST](#sig_corpse_burst), [SIG_REQUIEM](#sig_requiem), [SIG_ENRAGE](#sig_enrage), [SIG_BOSS_WARN](#sig_boss_warn), [SIG_BOSS_PHASE](#sig_boss_phase), [SIG_BOSS_DEFEAT](#sig_boss_defeat), [SIG_RECOVERY](#sig_recovery) | projectile soulbolt/shadow: MAT_HEX; summons: SIG_CHOIR_SUMMON; detonateAllies: SIG_CORPSE_BURST; meteorRain: SIG_REQUIEM; enrage: SIG_ENRAGE |
| Song Thrall<br>`song_thrall` | Abandoned Monastery — Flooded Crypts; The Choir's Ritual; The Hollow Reeds; summoned by choir_herald | [VOX_CHOIR_ALERT](#vox_choir_alert), [VOX_CHOIR_HURT](#vox_choir_hurt), [VOX_CHOIR_DEATH](#vox_choir_death), [MAT_CLOTH](#mat_cloth), [MAT_HEX](#mat_hex), [MAT_FROST](#mat_frost) | projectile shardbolt/cold: MAT_FROST |
| Choir Herald<br>`choir_herald` | Hollow Reeds authored herald spawn | [VOX_CHOIR_ALERT](#vox_choir_alert), [VOX_CHOIR_HURT](#vox_choir_hurt), [VOX_CHOIR_DEATH](#vox_choir_death), [MAT_CLOTH](#mat_cloth), [MAT_HEX](#mat_hex), [SIG_CHOIR_SUMMON](#sig_choir_summon), [SIG_BOSS_WARN](#sig_boss_warn), [SIG_BOSS_PHASE](#sig_boss_phase), [SIG_BOSS_DEFEAT](#sig_boss_defeat), [SIG_RECOVERY](#sig_recovery) | projectile soulbolt/shadow: MAT_HEX; summons: SIG_CHOIR_SUMMON |
| Choir Priest<br>`choir_priest` | The Shattered Cathedral; The Cathedral Heart; The Last Bastion’s Echo; story guards in cathedral2 | [VOX_CHOIR_ALERT](#vox_choir_alert), [VOX_CHOIR_HURT](#vox_choir_hurt), [VOX_CHOIR_DEATH](#vox_choir_death), [MAT_CLOTH](#mat_cloth), [MAT_HEX](#mat_hex), [SIG_CHOIR_SUMMON](#sig_choir_summon) | projectile soulbolt/shadow: MAT_HEX; heals: SIG_CHOIR_SUMMON; melee shadow: MAT_HEX |
| Arcing Choirman<br>`r28_robed` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_CHOIR_ALERT](#vox_choir_alert), [VOX_CHOIR_HURT](#vox_choir_hurt), [VOX_CHOIR_DEATH](#vox_choir_death), [MAT_CLOTH](#mat_cloth), [MAT_HEX](#mat_hex), [MAT_SPARK](#mat_spark) | projectile shardbolt/light: MAT_SPARK |

<a id="enemy-family-dragon"></a>

#### DRAGON roster

| Enemy / ID | Placement or scripted source | Required bank cues | Special events / regional note |
| --- | --- | --- | --- |
| Ash Drake<br>`ash_drake` | Catalogued definition; no spawn route asserted here (not declared unused) | [VOX_DRAGON_ALERT](#vox_dragon_alert), [VOX_DRAGON_HURT](#vox_dragon_hurt), [VOX_DRAGON_DEATH](#vox_dragon_death), [MOVE_WINGS](#move_wings), [MAT_GROWL](#mat_growl), [MAT_BLOOD](#mat_blood), [MAT_FIRE](#mat_fire), [MAT_WIND](#mat_wind) | projectile firebolt/fire: MAT_FIRE; charge: MAT_WIND,MAT_BLOOD |

<a id="enemy-family-object"></a>

#### OBJECT roster

| Enemy / ID | Placement or scripted source | Required bank cues | Special events / regional note |
| --- | --- | --- | --- |
| Oathsworn Beacon<br>`beacon` | script reference: game.js, mapgen.js, entities.js, boss_encounters.js | [WORLD_BEACON](#world_beacon), [MAT_STONE](#mat_stone) | stationary objective; activation and contact only, no footsteps or biological voice |
| Quieting Ritual Site<br>`quieting_ritual` | Catalogued definition; no spawn route asserted here (not declared unused) | [WORLD_RITUAL_BREAK](#world_ritual_break), [MAT_STONE](#mat_stone), [MAT_HEX](#mat_hex) | stationary ritual objective; no footsteps or biological voice |
| Drowned Ritual Heart<br>`drowned_ritual` | quest q11 | [WORLD_RITUAL_BREAK](#world_ritual_break), [MAT_STONE](#mat_stone), [MAT_HEX](#mat_hex) | stationary ritual objective; no footsteps or biological voice |
| Portal to the Past<br>`boss_portal` | Azram encounter-owned portal | [SIG_BOSS_PORTAL](#sig_boss_portal), [LOOP_PORTAL](#loop_portal), [SIG_BOSS_PORTAL_BREAK](#sig_boss_portal_break) | stationary object; no footsteps or pain voice |
| The Serpent's Lie<br>`boss_decoy` | Vethriss encounter-owned illusion | [SIG_DECOY](#sig_decoy), [SIG_DECOY_BREAK](#sig_decoy_break) | illusion; no flesh impact or conventional death voice |

### Regional combat profiles and guardian variants

| Region | Exact enemy/profile ID | Actual behavior | Required cues |
| --- | --- | --- | --- |
| Act III | `sand_raider` | Mace physical hit | [MAT_STONE](#mat_stone), [MAT_BLOOD](#mat_blood) |
| Act III | `tomb_guard` | Shield Bash and frontal guard | [SIG_BOSS_WARN](#sig_boss_warn), [MAT_SHIELD](#mat_shield) |
| Act III | `dune_shade` | Approach blink then shadow contact | [MAT_SHADOW](#mat_shadow), [MAT_HEX](#mat_hex) |
| Act III | `soul_chained` | Light bolt with chain appearance | [MAT_CHAIN](#mat_chain), [MAT_SPARK](#mat_spark) |
| Act III | `gilt_construct` | Sunderstone Pulse | [SIG_BOSS_WARN](#sig_boss_warn), [SIG_PULSE](#sig_pulse) |
| Act III | `shard_construct` | Physical Crystal Fan; crystal timbre, not cold damage | [SIG_BOSS_WARN](#sig_boss_warn), [SIG_CRYSTAL_FAN](#sig_crystal_fan), [MAT_STONE](#mat_stone) |
| Act III | `crystal_marauder` | Committed charge | [SIG_BOSS_WARN](#sig_boss_warn), [MAT_WIND](#mat_wind), [MAT_STONE](#mat_stone) |
| Act III | `gilded_thrall` | Gilded Sweep and frontal guard | [MAT_BLADE](#mat_blade), [MAT_SPARK](#mat_spark), [MAT_SHIELD](#mat_shield) |
| Act III | `prisoned_shade` | Defensive blink and shadow bolt | [MAT_SHADOW](#mat_shadow), [MAT_HEX](#mat_hex) |
| Act III | `dune_serpent` | Poison bite and charge | [MAT_ROT](#mat_rot), [MAT_WIND](#mat_wind), [MAT_BLOOD](#mat_blood) |
| Act III | `stone_gargoyle` | Stonefall landing | [SIG_BOSS_WARN](#sig_boss_warn), [MOVE_WINGS](#move_wings), [MAT_STONE](#mat_stone) |
| Act IV | `hollow_knight` | Guarded Cleave; brace, release and contact | [SIG_BOSS_WARN](#sig_boss_warn), [MAT_SHIELD](#mat_shield), [MAT_BLADE](#mat_blade), [MAT_STEEL](#mat_steel) |
| Act IV | `choir_priest` | Soul Bolt is shadow here; Mending Litany heals | [MAT_HEX](#mat_hex), [SIG_CHOIR_SUMMON](#sig_choir_summon) |
| Act IV | `soul_eater` | Hunting Rush and successful bite drain | [VOX_BRUTE_ALERT](#vox_brute_alert), [MAT_WIND](#mat_wind), [MAT_BLOOD](#mat_blood), [STATUS_DRAIN](#status_drain) |
| Act IV | `memory_wraith` | Remembered Step then separately warned shadow cone | [MAT_SHADOW](#mat_shadow), [SIG_BOSS_WARN](#sig_boss_warn), [MAT_HEX](#mat_hex) |
| Act IV | `cathedral_knight_guardian` | Oathbound Hollow Knight; two separately warned cleaves | [SIG_BOSS_WARN](#sig_boss_warn), [MAT_SHIELD](#mat_shield), [MAT_BLADE](#mat_blade), [MAT_STEEL](#mat_steel) |
| Act IV | `cathedral_priest_guardian` | Echoing Choir Priest; Litany and Quieting Chorus | [SIG_CHOIR_SUMMON](#sig_choir_summon), [SIG_BOSS_WARN](#sig_boss_warn), [SIG_CHORUS](#sig_chorus) |
| Act II | `song_thrall` | Three-projectile cold volley | [MAT_ICE](#mat_ice), [MAT_FROST](#mat_frost) |
| Act II | `silent_cultist` | Cold bolt with short slow | [MAT_ICE](#mat_ice), [MAT_FROST](#mat_frost) |
| Act II | `blight_treant` | Poison slam and death burst warning | [SIG_BOSS_WARN](#sig_boss_warn), [MAT_ROOTS](#mat_roots), [MAT_ROT](#mat_rot) |
| Act II | `lure_child` | Apparition lure, summon and blink; no intelligible child dialogue | [VOX_SPIRIT_ALERT](#vox_spirit_alert), [SIG_CHOIR_SUMMON](#sig_choir_summon), [MAT_SHADOW](#mat_shadow) |

Act I `frost_wyrm` resolves to **Frostmaw Yeti**, with physical claws, cold breath and cold slam. Outside Act I its catalogued Frost Wyrm identity remains available. Act V melee/caster roles and elements follow `ACT5_COMBAT_PROFILES`, not the generic sprite name. In Act II, Song Thrall has a cold volley; Choirmaster sacrifice and Dissonant Requiem are shadow attacks. In Act IV, Choir Priest’s ordinary bolt is shadow, and Memory Wraith’s contact is shadow. Do not use the generic fire-projectile cue there.

### Companions

| Exact companion ID | Name | Voice family | Movement / attack |
| --- | --- | --- | --- |
| `skel_warrior` | Raised skeleton warrior | BONE | [MAT_BONE](#mat_bone), [MAT_BLADE](#mat_blade) |
| `skel_mage` | Raised plague mage | BONE | [MAT_BONE](#mat_bone), [MAT_ROT](#mat_rot), [MAT_HEX](#mat_hex) |
| `bone_golem` | Bone Golem | BONE | [MAT_BONE](#mat_bone), [MAT_STONE](#mat_stone) |
| `wolf` | Wolf | HOUND | [MOVE_PAWS](#move_paws), [MAT_GROWL](#mat_growl), [MAT_BLOOD](#mat_blood) |
| `boar` | Thornback Boar | BOAR | [MOVE_HOOF](#move_hoof), [MAT_GROWL](#mat_growl), [MAT_BLOOD](#mat_blood) |
| `hawk` | Spirit Hawk | HAWK | [MOVE_WINGS](#move_wings), [MAT_WIND](#mat_wind), [MAT_SPARK](#mat_spark) |
| `bear` | Guardian Bear | BEAR | [MOVE_PAWS](#move_paws), [MAT_GROWL](#mat_growl), [MAT_BLOOD](#mat_blood) |
| `ent` | Ent | WOOD | [MAT_ROOTS](#mat_roots), [MAT_STONE](#mat_stone) |

Companion alert sounds also serve summon-arrival accents, sparingly. Wolf and bear player forms may reuse their creature exertions; form conversion itself uses the four SIG_FORM_* cues. Storm/Tempest Totems use root placement plus electrical discharge per real attack; ordinary totems have no permanent idle hum. Glyph/perk envenoming adds MAT_ROT only on real poison contact.

### Boss attacks, phases and recovery

| Boss / exact ID | Signature cue set | Encounter timing and exceptions |
| --- | --- | --- |
| Bone Dragon<br>`bone_dragon` | [SIG_SOUL_VOLLEY](#sig_soul_volley), [SIG_FISSURE](#sig_fissure), [SIG_BOSS_WARN](#sig_boss_warn), [SIG_BOSS_PHASE](#sig_boss_phase), [SIG_BOSS_DEFEAT](#sig_boss_defeat), [SIG_RECOVERY](#sig_recovery) | Keep catalogued summons, impacts and phase/enrage changes tied to their actual events. |
| Flesh Engine Abomination<br>`flesh_engine` | [SIG_THROW_BODY](#sig_throw_body), [SIG_FISSURE](#sig_fissure), [SIG_BOSS_WARN](#sig_boss_warn), [SIG_BOSS_PHASE](#sig_boss_phase), [SIG_BOSS_DEFEAT](#sig_boss_defeat), [SIG_RECOVERY](#sig_recovery) | Keep catalogued summons, impacts and phase/enrage changes tied to their actual events. |
| Infernal Warlord<br>`infernal_warlord` | [SIG_CLEAVE](#sig_cleave), [SIG_FISSURE](#sig_fissure), [SIG_BOSS_WARN](#sig_boss_warn), [SIG_BOSS_PHASE](#sig_boss_phase), [SIG_BOSS_DEFEAT](#sig_boss_defeat), [SIG_RECOVERY](#sig_recovery) | Keep catalogued summons, impacts and phase/enrage changes tied to their actual events. |
| Gravecaller Hesh<br>`gravecaller` | [SIG_BONE_RAISE](#sig_bone_raise), [SIG_BOSS_WARN](#sig_boss_warn), [SIG_BOSS_PHASE](#sig_boss_phase), [SIG_BOSS_DEFEAT](#sig_boss_defeat), [SIG_RECOVERY](#sig_recovery) | Keep catalogued summons, impacts and phase/enrage changes tied to their actual events. |
| Morthul, the Grave-Warden<br>`morthul` | [SIG_BONE_RAISE](#sig_bone_raise), [SIG_FISSURE](#sig_fissure), [SIG_BOSS_WARN](#sig_boss_warn), [SIG_BOSS_PHASE](#sig_boss_phase), [SIG_BOSS_DEFEAT](#sig_boss_defeat), [SIG_RECOVERY](#sig_recovery) | Keep catalogued summons, impacts and phase/enrage changes tied to their actual events. |
| Vicar Thessaly<br>`vicar` | [SIG_CHOIR_SUMMON](#sig_choir_summon), [SIG_BOSS_WARN](#sig_boss_warn), [SIG_BOSS_PHASE](#sig_boss_phase), [SIG_BOSS_DEFEAT](#sig_boss_defeat), [SIG_RECOVERY](#sig_recovery) | Keep catalogued summons, impacts and phase/enrage changes tied to their actual events. |
| Vellath, the Unshepherd<br>`vellath` | [SIG_BONE_RAISE](#sig_bone_raise), [SIG_FISSURE](#sig_fissure), [SIG_BOSS_WARN](#sig_boss_warn), [SIG_BOSS_PHASE](#sig_boss_phase), [SIG_BOSS_DEFEAT](#sig_boss_defeat), [SIG_RECOVERY](#sig_recovery) | Keep catalogued summons, impacts and phase/enrage changes tied to their actual events. |
| The Rimebound Captain<br>`frost_watch_captain` | [SIG_FROST_SLAM](#sig_frost_slam), [SIG_CLEAVE](#sig_cleave), [SIG_BOSS_WARN](#sig_boss_warn), [SIG_BOSS_PHASE](#sig_boss_phase), [SIG_BOSS_DEFEAT](#sig_boss_defeat), [SIG_RECOVERY](#sig_recovery) | Two phases, frost slam and shield/cleave; two finite reinforcement waves. Warn each slam, use bone summons for arrivals. |
| Korvath, the Oathbreaker<br>`korvath` | [SIG_CLEAVE](#sig_cleave), [SIG_FISSURE](#sig_fissure), [SIG_BOSS_WARN](#sig_boss_warn), [SIG_BOSS_PHASE](#sig_boss_phase), [SIG_BOSS_DEFEAT](#sig_boss_defeat), [SIG_RECOVERY](#sig_recovery) | Phase 2 adds two guards once; fissure gains a separately warned perpendicular strike. Preserve the recovery silence. |
| Brokkar, the Hurler<br>`barb_axe` | [SIG_CLEAVE](#sig_cleave), [SIG_BOSS_WARN](#sig_boss_warn), [SIG_BOSS_PHASE](#sig_boss_phase), [SIG_BOSS_DEFEAT](#sig_boss_defeat), [SIG_RECOVERY](#sig_recovery) | Brokkar: thrown axe and return/pass movement; one shared Oathsworn music track for all three enemies. |
| Vandil, the Skyfallen<br>`barb_pole` | [SIG_FISSURE](#sig_fissure), [SIG_BOSS_WARN](#sig_boss_warn), [SIG_BOSS_PHASE](#sig_boss_phase), [SIG_BOSS_DEFEAT](#sig_boss_defeat), [SIG_RECOVERY](#sig_recovery) | Vandil: leap takeoff and stone landing; one shared Oathsworn music track. |
| Sigrun, the Stormcleaver<br>`barb_sword` | [SIG_CLEAVE](#sig_cleave), [SIG_BOSS_WARN](#sig_boss_warn), [SIG_BOSS_PHASE](#sig_boss_phase), [SIG_BOSS_DEFEAT](#sig_boss_defeat), [SIG_RECOVERY](#sig_recovery) | Sigrun: spinning blade with lightning contact in Act I; one shared Oathsworn music track. |
| Vorthel, the High Choirmaster<br>`choirmaster` | [SIG_CHOIR_SUMMON](#sig_choir_summon), [SIG_CORPSE_BURST](#sig_corpse_burst), [SIG_REQUIEM](#sig_requiem), [SIG_BOSS_WARN](#sig_boss_warn), [SIG_BOSS_PHASE](#sig_boss_phase), [SIG_BOSS_DEFEAT](#sig_boss_defeat), [SIG_RECOVERY](#sig_recovery) | Summon, ally detonation and shadow Dissonant Requiem; warn each delayed damage event. |
| Hoarfang, the Spring's Keeper<br>`hoarfang` | [SIG_FROST_SLAM](#sig_frost_slam), [SIG_BOSS_WARN](#sig_boss_warn), [SIG_BOSS_PHASE](#sig_boss_phase), [SIG_BOSS_DEFEAT](#sig_boss_defeat), [SIG_RECOVERY](#sig_recovery) | Cold slam, summon arrivals and catalogued death burst; distinguish last cry from the hazardous burst warning. |
| Choir Herald<br>`choir_herald` | [SIG_CHOIR_SUMMON](#sig_choir_summon), [SIG_BOSS_WARN](#sig_boss_warn), [SIG_BOSS_PHASE](#sig_boss_phase), [SIG_BOSS_DEFEAT](#sig_boss_defeat), [SIG_RECOVERY](#sig_recovery) | Keep catalogued summons, impacts and phase/enrage changes tied to their actual events. |
| The Brood Mother<br>`brood_mother` | [SIG_BILE](#sig_bile), [SIG_GRASP](#sig_grasp), [SIG_BOSS_WARN](#sig_boss_warn), [SIG_BOSS_PHASE](#sig_boss_phase), [SIG_BOSS_DEFEAT](#sig_boss_defeat), [SIG_RECOVERY](#sig_recovery) | Keep catalogued summons, impacts and phase/enrage changes tied to their actual events. |
| The Chained Sovereign<br>`chained_sovereign` | [SIG_BONE_RAISE](#sig_bone_raise), [SIG_FISSURE](#sig_fissure), [SIG_BOSS_WARN](#sig_boss_warn), [SIG_BOSS_PHASE](#sig_boss_phase), [SIG_BOSS_DEFEAT](#sig_boss_defeat), [SIG_RECOVERY](#sig_recovery) | Melee, summons, enrage and physical slam; chain accent is its sonic identity, not a newly invented chain attack. |
| The Mire Mother<br>`mire_mother` | [SIG_BILE](#sig_bile), [SIG_GRASP](#sig_grasp), [SIG_BOSS_WARN](#sig_boss_warn), [SIG_BOSS_PHASE](#sig_boss_phase), [SIG_BOSS_DEFEAT](#sig_boss_defeat), [SIG_RECOVERY](#sig_recovery) | Bile pools and grasping ring; exposed-shard accent at recovery from 55% health, double bile marks at 25%. NO damaging death burst in the active controller. |
| Azram the Gilded<br>`azram` | [SIG_GOLD_CHAINS](#sig_gold_chains), [SIG_BOSS_PORTAL](#sig_boss_portal), [SIG_BOSS_PORTAL_BREAK](#sig_boss_portal_break), [SIG_GOLD_CONE](#sig_gold_cone), [SIG_CLEAVE](#sig_cleave), [SIG_BOSS_WARN](#sig_boss_warn), [SIG_BOSS_PHASE](#sig_boss_phase), [SIG_BOSS_DEFEAT](#sig_boss_defeat), [SIG_RECOVERY](#sig_recovery) | Portals at 60% and 30%; distinct portal-open, portal-break and interruption feedback; molten-gold cone in last phase. |
| The Empty Archangel<br>`empty_archangel` | [SIG_WING_BLADES](#sig_wing_blades), [SIG_DESCENT](#sig_descent), [SIG_CROSS](#sig_cross), [SIG_BOSS_WARN](#sig_boss_warn), [SIG_BOSS_PHASE](#sig_boss_phase), [SIG_BOSS_DEFEAT](#sig_boss_defeat), [SIG_RECOVERY](#sig_recovery) | Separate wing lanes and descent; phase 2 descent chains into a freshly warned cross. Soul ward uses seal/recovery cues. |
| Malthoron, the Hollow King<br>`malthoron` | [SIG_QUIETING_CHAINS](#sig_quieting_chains), [SIG_ARMOR_BREAK](#sig_armor_break), [SIG_SOUL_VOLLEY](#sig_soul_volley), [SIG_BEAM](#sig_beam), [SIG_CLEAVE](#sig_cleave), [SIG_BOSS_WARN](#sig_boss_warn), [SIG_BOSS_PHASE](#sig_boss_phase), [SIG_BOSS_DEFEAT](#sig_boss_defeat), [SIG_RECOVERY](#sig_recovery), [VOX_SPIRIT_ALERT](#vox_spirit_alert), [VOX_SPIRIT_DEATH](#vox_spirit_death) | Armor breaks at 66% and 33%; soul volleys, knight arrivals, alternating beam sweep. Quieting Chains has its own colder identity. |
| Vethriss, the Veiled Lord<br>`vethriss` | [SIG_BORROWED_LIGHT](#sig_borrowed_light), [SIG_SERPENT_LUNGE](#sig_serpent_lunge), [SIG_DECOY](#sig_decoy), [SIG_DECOY_BREAK](#sig_decoy_break), [SIG_FISSURE](#sig_fissure), [SIG_BILE](#sig_bile), [SIG_GOLD_CHAINS](#sig_gold_chains), [SIG_BEAM](#sig_beam), [SIG_BOSS_WARN](#sig_boss_warn), [SIG_BOSS_PHASE](#sig_boss_phase), [SIG_BOSS_DEFEAT](#sig_boss_defeat), [SIG_RECOVERY](#sig_recovery), [VOX_HUMAN_ALERT](#vox_human_alert), [VOX_HUMAN_HURT](#vox_human_hurt), [VOX_SPIRIT_ALERT](#vox_spirit_alert), [VOX_SPIRIT_DEATH](#vox_spirit_death) | Borrowed light -> serpent/three decoys at 70% -> remembered boss-attack pairs at 35%. Each decoy break is distinct; clear-all uses recovery. Reuse the original bosses’ attack materials. |

Boss sound design has three separate jobs: warn the impending attack, render its release/contact, and expose a quieter recovery opening. Use one warning for each separately telegraphed strike. Abort pending cues when attacks cancel. Most main-boss warnings are approximately one second, but exact events use their existing controller times; never retime gameplay to fit a sample. The current active Mire Mother controller explicitly removes the legacy damaging death burst. Boss music starts on engagement and returns to the selected area theme after combat; player death stops music until revival/return.

## World, hazards, events and interface mappings

These exact event, story-object and hazard IDs resolve to the bank above. Shared UI activation currently covers many panel and inventory actions; their new dedicated samples are optional refinements. Frozen bodies currently use propIce; a cloth-search layer can add tactile detail at the search contact. Map transitions without an animated door should use travel/area transition feedback rather than an invented moving-door sound.

| Consumer / exact ID | Required cues | Use rule |
| --- | --- | --- |
| Wood barrel / crate | [WORLD_WOOD_BREAK](#world_wood_break) | Contact cue only after interaction commits; opening/cancelled gestures do not grant or sound a reward. |
| Stone pillar | [WORLD_STONE_BREAK](#world_stone_break) | Contact cue only after interaction commits; opening/cancelled gestures do not grant or sound a reward. |
| Ceramic urn | [WORLD_CERAMIC_BREAK](#world_ceramic_break) | Contact cue only after interaction commits; opening/cancelled gestures do not grant or sound a reward. |
| Ice prop | [WORLD_ICE_BREAK](#world_ice_break) | Contact cue only after interaction commits; opening/cancelled gestures do not grant or sound a reward. |
| Frozen soldier / traveler / miner | [WORLD_SEARCH](#world_search), [WORLD_ICE_BREAK](#world_ice_break) | Contact cue only after interaction commits; opening/cancelled gestures do not grant or sound a reward. |
| Disturbed grave | [WORLD_GRAVE](#world_grave) | Contact cue only after interaction commits; opening/cancelled gestures do not grant or sound a reward. |
| Chest / storage stash | [WORLD_CHEST](#world_chest) | Contact cue only after interaction commits; opening/cancelled gestures do not grant or sound a reward. |
| Strongbox | [WORLD_STRONGBOX](#world_strongbox) | Contact cue only after interaction commits; opening/cancelled gestures do not grant or sound a reward. |
| Shrine / travel shrine | [WORLD_SHRINE](#world_shrine) | Contact cue only after interaction commits; opening/cancelled gestures do not grant or sound a reward. |
| Altar / reliquary | [WORLD_ALTAR](#world_altar) | Contact cue only after interaction commits; opening/cancelled gestures do not grant or sound a reward. |
| Well / spring | [WORLD_WELL](#world_well) | Contact cue only after interaction commits; opening/cancelled gestures do not grant or sound a reward. |
| Town forge / transmutation | [UI_FORGE](#ui_forge) | Contact cue only after interaction commits; opening/cancelled gestures do not grant or sound a reward. |
| Socketed gear / glyph / jewel insertion | [UI_SOCKET](#ui_socket) | Contact cue only after interaction commits; opening/cancelled gestures do not grant or sound a reward. |
| Town quest board / map / document | [WORLD_MAP](#world_map) | Contact cue only after interaction commits; opening/cancelled gestures do not grant or sound a reward. |
| Town vendor purchase / sale | [UI_BUY](#ui_buy) | Contact cue only after interaction commits; opening/cancelled gestures do not grant or sound a reward. |
| Portal open / travel / close | [WORLD_PORTAL_OPEN](#world_portal_open), [WORLD_TRAVEL](#world_travel), [LOOP_PORTAL](#loop_portal), [WORLD_PORTAL_CLOSE](#world_portal_close) | Contact cue only after interaction commits; opening/cancelled gestures do not grant or sound a reward. |
| Act waystone unlock | [WORLD_WAYSTONE](#world_waystone) | Contact cue only after interaction commits; opening/cancelled gestures do not grant or sound a reward. |
| Oathsworn beacons | [WORLD_BEACON](#world_beacon) | Contact cue only after interaction commits; opening/cancelled gestures do not grant or sound a reward. |
| Normal / rare / Unique loot | [WORLD_DROP](#world_drop), [WORLD_RARE](#world_rare), [WORLD_UNIQUE](#world_unique) | Contact cue only after interaction commits; opening/cancelled gestures do not grant or sound a reward. |
| Gold / item pickup | [WORLD_GOLD](#world_gold), [WORLD_PICKUP](#world_pickup) | Contact cue only after interaction commits; opening/cancelled gestures do not grant or sound a reward. |
| Quest accepted / progress / ready / complete | [QUEST_ACCEPTED](#quest_accepted), [QUEST_PROGRESS](#quest_progress), [QUEST_READY](#quest_ready), [QUEST_COMPLETED](#quest_completed) | Contact cue only after interaction commits; opening/cancelled gestures do not grant or sound a reward. |
| Story ritual_site/mire_shard | [WORLD_SHARD](#world_shard), [QUEST_PROGRESS](#quest_progress) | Recover the Mire Mother’s shard |
| Story underground_market/market_relay_0 | [WORLD_RELAY](#world_relay), [QUEST_PROGRESS](#quest_progress) | Disable shard relay 1 |
| Story underground_market/market_relay_1 | [WORLD_RELAY](#world_relay), [QUEST_PROGRESS](#quest_progress) | Disable shard relay 2 |
| Story underground_market/market_relay_2 | [WORLD_RELAY](#world_relay), [QUEST_PROGRESS](#quest_progress) | Disable shard relay 3 |
| Story sand_tombs/imprisoned_scholar | [WORLD_SEAL_BREAK](#world_seal_break), [QUEST_PROGRESS](#quest_progress) | Scholar Ilyan — break the bindings |
| Story khal_palace/fortress_map | [WORLD_MAP](#world_map), [QUEST_PROGRESS](#quest_progress) | Recover the fortress map |
| Story cathedral1/trapped_soul_0 | [WORLD_SOUL_RELEASE](#world_soul_release), [QUEST_PROGRESS](#quest_progress) | Trapped soul 1 — release from the wall |
| Story cathedral1/trapped_soul_1 | [WORLD_SOUL_RELEASE](#world_soul_release), [QUEST_PROGRESS](#quest_progress) | Trapped soul 2 — release from the wall |
| Story cathedral1/trapped_soul_2 | [WORLD_SOUL_RELEASE](#world_soul_release), [QUEST_PROGRESS](#quest_progress) | Trapped soul 3 — release from the wall |
| Story cathedral2/quieting_seal_0 | [WORLD_SEAL_BREAK](#world_seal_break), [QUEST_PROGRESS](#quest_progress) | Break Quieting seal 1 |
| Story cathedral2/quieting_seal_1 | [WORLD_SEAL_BREAK](#world_seal_break), [QUEST_PROGRESS](#quest_progress) | Break Quieting seal 2 |
| Story cathedral2/quieting_seal_2 | [WORLD_SEAL_BREAK](#world_seal_break), [QUEST_PROGRESS](#quest_progress) | Break Quieting seal 3 |
| Story cathedral2/sword_piece_0 | [WORLD_SHARD](#world_shard), [QUEST_PROGRESS](#quest_progress) | Recover Seraneth’s sword: hilt |
| Story cathedral2/sword_piece_1 | [WORLD_SHARD](#world_shard), [QUEST_PROGRESS](#quest_progress) | Recover Seraneth’s sword: broken edge |
| Story cathedral2/sword_piece_2 | [WORLD_SHARD](#world_shard), [QUEST_PROGRESS](#quest_progress) | Recover Seraneth’s sword: point |
| Story cathedral2/hell_portal | [WORLD_PORTAL_OPEN](#world_portal_open), [QUEST_PROGRESS](#quest_progress) | Enter the Burning Hells |
| Event ev_bless0 | [WORLD_SHRINE](#world_shrine) | Shrine of Fury; reuse family cue rather than generate a named-event duplicate. |
| Event ev_bless1 | [WORLD_SHRINE](#world_shrine) | Shrine of Haste; reuse family cue rather than generate a named-event duplicate. |
| Event ev_bless2 | [WORLD_SHRINE](#world_shrine) | Shrine of the Adept; reuse family cue rather than generate a named-event duplicate. |
| Event ev_bless3 | [WORLD_SHRINE](#world_shrine) | Shrine of the Bulwark; reuse family cue rather than generate a named-event duplicate. |
| Event ev_bless4 | [WORLD_SHRINE](#world_shrine) | Shrine of the Leech; reuse family cue rather than generate a named-event duplicate. |
| Event ev_bless5 | [WORLD_SHRINE](#world_shrine) | Shrine of Fortune; reuse family cue rather than generate a named-event duplicate. |
| Event ev_bless6 | [WORLD_SHRINE](#world_shrine) | Shrine of Ruin; reuse family cue rather than generate a named-event duplicate. |
| Event ev_bless7 | [WORLD_SHRINE](#world_shrine) | Shrine of the Ox; reuse family cue rather than generate a named-event duplicate. |
| Event ev_bless8 | [WORLD_SHRINE](#world_shrine) | Shrine of the Hawk; reuse family cue rather than generate a named-event duplicate. |
| Event ev_bless9 | [WORLD_SHRINE](#world_shrine) | Shrine of the Deep Well; reuse family cue rather than generate a named-event duplicate. |
| Event ev_bless10 | [WORLD_SHRINE](#world_shrine) | Shrine of Embers; reuse family cue rather than generate a named-event duplicate. |
| Event ev_bless11 | [WORLD_SHRINE](#world_shrine) | Shrine of Rime; reuse family cue rather than generate a named-event duplicate. |
| Event ev_bless12 | [WORLD_SHRINE](#world_shrine) | Shrine of Storms; reuse family cue rather than generate a named-event duplicate. |
| Event ev_bless13 | [WORLD_SHRINE](#world_shrine) | Shrine of the Vigil; reuse family cue rather than generate a named-event duplicate. |
| Event ev_bless14 | [WORLD_SHRINE](#world_shrine) | Shrine of Resolve; reuse family cue rather than generate a named-event duplicate. |
| Event ev_bless15 | [WORLD_SHRINE](#world_shrine) | Shrine of the Road; reuse family cue rather than generate a named-event duplicate. |
| Event ev_bless16 | [WORLD_SHRINE](#world_shrine) | Shrine of Thorns; reuse family cue rather than generate a named-event duplicate. |
| Event ev_bless17 | [WORLD_SHRINE](#world_shrine) | Shrine of the Colossus; reuse family cue rather than generate a named-event duplicate. |
| Event ev_bless18 | [WORLD_SHRINE](#world_shrine) | Shrine of Warding; reuse family cue rather than generate a named-event duplicate. |
| Event ev_bless19 | [WORLD_SHRINE](#world_shrine) | Shrine of the Whirlwind; reuse family cue rather than generate a named-event duplicate. |
| Event ev_bless20 | [WORLD_SHRINE](#world_shrine) | Shrine of Plunder; reuse family cue rather than generate a named-event duplicate. |
| Event ev_bless21 | [WORLD_SHRINE](#world_shrine) | Shrine of the Marrow; reuse family cue rather than generate a named-event duplicate. |
| Event ev_bless22 | [WORLD_SHRINE](#world_shrine) | Shrine of Quickening; reuse family cue rather than generate a named-event duplicate. |
| Event ev_bless23 | [WORLD_SHRINE](#world_shrine) | Shrine of the Kiln; reuse family cue rather than generate a named-event duplicate. |
| Event ev_bless24 | [WORLD_SHRINE](#world_shrine) | Shrine of the Hearth; reuse family cue rather than generate a named-event duplicate. |
| Event ev_bless25 | [WORLD_SHRINE](#world_shrine) | Shrine of Grounding; reuse family cue rather than generate a named-event duplicate. |
| Event ev_bless26 | [WORLD_SHRINE](#world_shrine) | Shrine of Cleansing; reuse family cue rather than generate a named-event duplicate. |
| Event ev_bless27 | [WORLD_SHRINE](#world_shrine) | Shrine of the Duelist; reuse family cue rather than generate a named-event duplicate. |
| Event ev_bless28 | [WORLD_SHRINE](#world_shrine) | Shrine of the Sentinel; reuse family cue rather than generate a named-event duplicate. |
| Event ev_bless29 | [WORLD_SHRINE](#world_shrine) | Shrine of Avarice; reuse family cue rather than generate a named-event duplicate. |
| Event ev_cache1 | [WORLD_CHEST](#world_chest) | Forgotten Cache; reuse family cue rather than generate a named-event duplicate. |
| Event ev_cache2 | [WORLD_CHEST](#world_chest) | Buried Hoard; reuse family cue rather than generate a named-event duplicate. |
| Event ev_cache3 | [WORLD_CHEST](#world_chest) | Warlord's Stash; reuse family cue rather than generate a named-event duplicate. |
| Event ev_cache4 | [WORLD_GOLD](#world_gold) | Glittering Pile; reuse family cue rather than generate a named-event duplicate. |
| Event ev_cache5 | [WORLD_GOLD](#world_gold) | Dragon's Tithe; reuse family cue rather than generate a named-event duplicate. |
| Event ev_well1 | [WORLD_WELL](#world_well) | Clearwater Spring; reuse family cue rather than generate a named-event duplicate. |
| Event ev_well2 | [WORLD_WELL](#world_well) | Aetheric Pool; reuse family cue rather than generate a named-event duplicate. |
| Event ev_obel1 | [UI_LEVEL](#ui_level) | Stone of Memory; reuse family cue rather than generate a named-event duplicate. |
| Event ev_obel2 | [UI_LEVEL](#ui_level) | Pillar of Ages; reuse family cue rather than generate a named-event duplicate. |
| Event ev_amb0 | [WORLD_AMBUSH](#world_ambush) | Disturbed Barrow; reuse family cue rather than generate a named-event duplicate. |
| Event ev_amb1 | [WORLD_AMBUSH](#world_ambush) | Wolf Den; reuse family cue rather than generate a named-event duplicate. |
| Event ev_amb2 | [WORLD_AMBUSH](#world_ambush) | Cultist Circle; reuse family cue rather than generate a named-event duplicate. |
| Event ev_amb3 | [WORLD_AMBUSH](#world_ambush) | Demon Sigil; reuse family cue rather than generate a named-event duplicate. |
| Event ev_amb4 | [WORLD_AMBUSH](#world_ambush) | Spider Nest; reuse family cue rather than generate a named-event duplicate. |
| Event ev_amb5 | [WORLD_AMBUSH](#world_ambush) | War Camp; reuse family cue rather than generate a named-event duplicate. |
| Event ev_curse1 | [WORLD_ALTAR](#world_altar) | Bloodstained Altar; reuse family cue rather than generate a named-event duplicate. |
| Event ev_curse2 | [WORLD_ALTAR](#world_altar) | Hollow Reliquary; reuse family cue rather than generate a named-event duplicate. |
| Event ev_gob1 | [WORLD_GOBLIN](#world_goblin) | Gilded Scuttler; reuse family cue rather than generate a named-event duplicate. |
| Event ev_gob2 | [WORLD_GOBLIN](#world_goblin) | Hoarder Fiend; reuse family cue rather than generate a named-event duplicate. |
| Event ev_glyph | [WORLD_SHARD](#world_shard) | Runed Stone; reuse family cue rather than generate a named-event duplicate. |
| Hazard ice | [STEP_ICE](#step_ice) | Frozen Ice; contact accents on entry/effect onset, not every damage tick; ice alone does not imply a freeze spell. |
| Hazard bog | [AMB_BOG](#amb_bog), [STEP_MUD](#step_mud) | Bog Pit; contact accents on entry/effect onset, not every damage tick; ice alone does not imply a freeze spell. |
| Hazard lava | [AMB_LAVA](#amb_lava), [STATUS_FIRE](#status_fire) | Lava; contact accents on entry/effect onset, not every damage tick; ice alone does not imply a freeze spell. |
| Hazard quicksand | [AMB_BOG](#amb_bog), [STEP_SAND](#step_sand) | Quicksand; contact accents on entry/effect onset, not every damage tick; ice alone does not imply a freeze spell. |
| Hazard spore | [AMB_SPORE](#amb_spore), [STATUS_POISON](#status_poison) | Spore Bed; contact accents on entry/effect onset, not every damage tick; ice alone does not imply a freeze spell. |
| Hazard scorch | [AMB_HELL](#amb_hell), [STATUS_FIRE](#status_fire) | Scorched; contact accents on entry/effect onset, not every damage tick; ice alone does not imply a freeze spell. |
| Hazard blood | [AMB_BOG](#amb_bog), [STEP_MUD](#step_mud) | Blood Mire; contact accents on entry/effect onset, not every damage tick; ice alone does not imply a freeze spell. |
| Hazard static | [LOOP_STORM](#loop_storm), [MAT_SPARK](#mat_spark) | Charged; contact accents on entry/effect onset, not every damage tick; ice alone does not imply a freeze spell. |
| Hazard spring | [AMB_SPRING](#amb_spring), [STEP_ICE](#step_ice) | Frozen Spring; contact accents on entry/effect onset, not every damage tick; ice alone does not imply a freeze spell. |
| Elite swift | Silent | Swift; material accent only on the real effect, no permanent elite hum. Stat-only modifiers remain silent. |
| Elite brutal | Silent | Brutal; material accent only on the real effect, no permanent elite hum. Stat-only modifiers remain silent. |
| Elite flamewreathed | [STATUS_FIRE](#status_fire) | Flamewreathed; material accent only on the real effect, no permanent elite hum. Stat-only modifiers remain silent. |
| Elite frostbound | [STATUS_FROZEN](#status_frozen) | Frostbound; material accent only on the real effect, no permanent elite hum. Stat-only modifiers remain silent. |
| Elite stormtouched | [MAT_SPARK](#mat_spark) | Stormtouched; material accent only on the real effect, no permanent elite hum. Stat-only modifiers remain silent. |
| Elite venomous | [STATUS_POISON](#status_poison) | Venomous; material accent only on the real effect, no permanent elite hum. Stat-only modifiers remain silent. |
| Elite warded | [STATUS_DISPEL](#status_dispel) | Warded; material accent only on the real effect, no permanent elite hum. Stat-only modifiers remain silent. |
| Elite vampiric | [STATUS_DRAIN](#status_drain) | Vampiric; material accent only on the real effect, no permanent elite hum. Stat-only modifiers remain silent. |
| Unique powers and glyph combinations | [MAT_FIRE](#mat_fire), [MAT_FROST](#mat_frost), [MAT_SPARK](#mat_spark), [MAT_HEX](#mat_hex), [MAT_ROT](#mat_rot), [MAT_STONE](#mat_stone), [STATUS_BLEED](#status_bleed), [STATUS_ROOT](#status_root), [STATUS_DRAIN](#status_drain), [STATUS_DISPEL](#status_dispel) | Reuse actual triggered effect, not one sound for each named item or rank. Stat-only item/perk changes remain silent; socket UI is separate. |
| Opening fallen-guard awakening | [SIG_BONE_RAISE](#sig_bone_raise), [WORLD_SHARD](#world_shard) | Play only when the action succeeds. |
| Opening caravan rescue and escort secured | [QUEST_PROGRESS](#quest_progress) | Play only when the action succeeds. |
| Opening captain reinforcement arrivals | [VOX_BONE_ALERT](#vox_bone_alert), [MAT_BONE](#mat_bone) | Play only when the action succeeds. |
| Opening hearth arrival | [PLAYER_RESTORE](#player_restore), [QUEST_COMPLETED](#quest_completed) | Play only when the action succeeds. |
| Ending destroy | [ENV_CORE_BREAK](#env_core_break) | Play only when the action succeeds. |
| Ending seal | [ENV_CORE_SEAL](#env_core_seal) | Play only when the action succeeds. |
| Ending give | [ENV_CORE_GIVE](#env_core_give) | Play only when the action succeeds. |
| Human locomotion | [STEP_SNOW](#step_snow), [STEP_ICE](#step_ice), [STEP_STONE](#step_stone), [STEP_WOOD](#step_wood), [STEP_DIRT](#step_dirt), [STEP_SAND](#step_sand), [STEP_MUD](#step_mud), [STEP_WATER](#step_water), [STEP_GRAVEL](#step_gravel), [STEP_ASH](#step_ash), [PLAYER_ARMOR](#player_armor), [PLAYER_LEATHER](#player_leather), [PLAYER_JUMP](#player_jump), [PLAYER_LAND](#player_land) | Play only when the action succeeds. |
| Human combat feedback | [PLAYER_HURT](#player_hurt), [PLAYER_DEATH](#player_death), [PLAYER_CRIT](#player_crit), [PLAYER_MISS](#player_miss), [PLAYER_DODGE](#player_dodge) | Play only when the action succeeds. |
| Draughts and return to town | [PLAYER_HEAL](#player_heal), [PLAYER_AETHER](#player_aether), [PLAYER_RESTORE](#player_restore) | Play only when the action succeeds. |
| UI panels and inventory | [UI_CLICK](#ui_click), [UI_OPEN](#ui_open), [UI_CLOSE](#ui_close), [UI_TAB](#ui_tab), [UI_EQUIP](#ui_equip), [UI_MOVE_ITEM](#ui_move_item), [UI_ERROR](#ui_error), [UI_RESPEC](#ui_respec), [UI_SKILL](#ui_skill), [UI_DIFFICULTY](#ui_difficulty), [UI_SAVE](#ui_save), [UI_FILTER](#ui_filter) | Play only when the action succeeds. |
| Affliction onset/expiry | [STATUS_STUN](#status_stun), [STATUS_ROOT](#status_root), [STATUS_FEAR](#status_fear), [STATUS_CURSE](#status_curse), [STATUS_DISPEL](#status_dispel) | Play only when the action succeeds. |
| Moving heavy gate if animated | [WORLD_DOOR](#world_door) | Play only when the action succeeds. |
| Quieting and drowned ritual destruction | [WORLD_RITUAL_BREAK](#world_ritual_break) | Quest-controlled ritual sites; separate from an ordinary shrine blessing. |
| Slow, chill, burning, bleed and critical contact | [STATUS_FROZEN](#status_frozen), [STATUS_FIRE](#status_fire), [STATUS_BLEED](#status_bleed), [PLAYER_CRIT](#player_crit) | Use subtle onset/contact accents only; avoid adding sounds to every periodic damage tick. |
| Enemy attack warning, phase, defeat and recovery | [SIG_BOSS_WARN](#sig_boss_warn), [SIG_BOSS_PHASE](#sig_boss_phase), [SIG_BOSS_DEFEAT](#sig_boss_defeat), [SIG_RECOVERY](#sig_recovery) | One audible warning per real attack; recovery is mostly silence. Phase/defeat accents occur once. |

### Existing Sfx names → proposed library

These aliases document all legacy one-shots and six recorded interactions. Within a successful skill scope, the skill-audio layer replaces legacy cues with that skill’s recorded recipe. Outside skill scope, current procedural UI, world and enemy sounds retain the legacy path. Family-specific or elemental rows above override the generic alias.

| Current cue | Proposed bank |
| --- | --- |
| `click` | [UI_CLICK](#ui_click) |
| `swing` | [MAT_BLADE](#mat_blade) |
| `hit` | [MAT_BLOOD](#mat_blood), [MAT_STEEL](#mat_steel) |
| `crit` | [PLAYER_CRIT](#player_crit) |
| `block` | [MAT_SHIELD](#mat_shield) |
| `bow` | [MAT_BOW](#mat_bow) |
| `arrowHit` | [MAT_ARROW](#mat_arrow) |
| `playerHurt` | [PLAYER_HURT](#player_hurt) |
| `vox_bone` | [VOX_BONE_ALERT](#vox_bone_alert) |
| `vox_beast` | [VOX_HOUND_ALERT](#vox_hound_alert) |
| `vox_human` | [VOX_HUMAN_ALERT](#vox_human_alert) |
| `vox_brute` | [VOX_BRUTE_ALERT](#vox_brute_alert) |
| `vox_metal` | [VOX_METAL_ALERT](#vox_metal_alert) |
| `vox_insect` | [VOX_INSECT_ALERT](#vox_insect_alert) |
| `vox_boss` | [VOX_BRUTE_ALERT](#vox_brute_alert), [SIG_BOSS_PHASE](#sig_boss_phase) |
| `die_bone` | [VOX_BONE_DEATH](#vox_bone_death) |
| `die_flesh` | [VOX_HUSK_DEATH](#vox_husk_death) |
| `potion` | [PLAYER_HEAL](#player_heal), [PLAYER_AETHER](#player_aether) |
| `drop` | [WORLD_DROP](#world_drop) |
| `dropRare` | [WORLD_RARE](#world_rare) |
| `dropUnique` | [WORLD_UNIQUE](#world_unique) |
| `coin` | [WORLD_GOLD](#world_gold) |
| `pickup` | [WORLD_PICKUP](#world_pickup) |
| `portal` | [WORLD_TRAVEL](#world_travel) |
| `shrine` | [WORLD_SHRINE](#world_shrine) |
| `levelup` | [UI_LEVEL](#ui_level) |
| `skillup` | [UI_SKILL](#ui_skill) |
| `barrel` | [WORLD_WOOD_BREAK](#world_wood_break) |
| `propStone` | [WORLD_STONE_BREAK](#world_stone_break) |
| `propCeramic` | [WORLD_CERAMIC_BREAK](#world_ceramic_break) |
| `propIce` | [WORLD_ICE_BREAK](#world_ice_break) |
| `chest` | [WORLD_CHEST](#world_chest) |
| `slam` | [MAT_STONE](#mat_stone) |
| `roar` | [MAT_HOWL](#mat_howl) |
| `firebolt` | [MAT_EMBER](#mat_ember) |
| `frost` | [MAT_FROST](#mat_frost) |
| `zap` | [MAT_SPARK](#mat_spark) |
| `blast` | [MAT_FIRE](#mat_fire) |
| `curse` | [MAT_HEX](#mat_hex) |
| `forge` | [UI_FORGE](#ui_forge) |
| `fireHit` | [MAT_FIRE](#mat_fire) |
| `step` | [STEP_STONE](#step_stone) |
| `buy` | [UI_BUY](#ui_buy) |
| `error` | [UI_ERROR](#ui_error) |
| `quest` | [QUEST_COMPLETED](#quest_completed) |
| `death` | [PLAYER_DEATH](#player_death) |
| `portalOpen` | [WORLD_PORTAL_OPEN](#world_portal_open) |
| `teleportTravel` | [WORLD_TRAVEL](#world_travel) |
| `questAccepted` | [QUEST_ACCEPTED](#quest_accepted) |
| `questReady` | [QUEST_READY](#quest_ready) |
| `questCompleted` | [QUEST_COMPLETED](#quest_completed) |
| `questProgress` | [QUEST_PROGRESS](#quest_progress) |

<a id="music-all-prompts"></a>

## Music — all prompts

### Area assignment index

Every named zone gets a distinct proposed theme. The current player chooses a regional/cavern track once at area entry for nonfixed zones, excluding the prior selection. Camps/towns and `fixedMusic` zones keep their specified theme. Therefore “regional recording” does not mean that recording always plays. The exploration cavern pool is **Caverns of Shadow.mp3**, **Cavern's Heart.mp3**, and **Cave Echoes.mp3**. Boss music temporarily overrides exploration.

| Area / exact ID | Theme | Current coverage | Nonmusical ambience/detail |
| --- | --- | --- | --- |
| The Road to Frosthaven<br>`frosthaven_approach` | [MUS_AREA_FROSTHAVEN_APPROACH](#mus_area_frosthaven_approach) | Recorded/dedicated — White Breath, Iron Sky.mp3 | [AMB_SNOW_WIND](#amb_snow_wind), [ENV_ICE_CRACK](#env_ice_crack) |
| Frosthaven<br>`frosthaven` | [MUS_AREA_FROSTHAVEN](#mus_area_frosthaven) | Recorded/dedicated — Snowy Mountain Vigil.mp3 | [AMB_HEARTH](#amb_hearth), [AMB_TOWN_NORTH](#amb_town_north) |
| The Fallen North<br>`north_wild` | [MUS_AREA_NORTH_WILD](#mus_area_north_wild) | Recorded/dedicated — White Breath, Iron Sky.mp3 | [AMB_SNOW_WIND](#amb_snow_wind), [ENV_ICE_CRACK](#env_ice_crack) |
| The Abandoned Mines<br>`mines` | [MUS_AREA_MINES](#mus_area_mines) | Shared/random — cavern pool plus White Breath, Iron Sky.mp3 | [AMB_MINE](#amb_mine), [ENV_WOOD_CREAK](#env_wood_creak) |
| The Shardpeak Shrine<br>`shardpeak_shrine` | [MUS_AREA_SHARDPEAK_SHRINE](#mus_area_shardpeak_shrine) | Shared/random — cavern pool plus White Breath, Iron Sky.mp3 | [AMB_SNOW_WIND](#amb_snow_wind), [ENV_ICE_CRACK](#env_ice_crack) |
| The Deepfreeze Caverns<br>`deepfreeze_cavern` | [MUS_AREA_DEEPFREEZE_CAVERN](#mus_area_deepfreeze_cavern) | Shared/random — cavern pool plus White Breath, Iron Sky.mp3 | [AMB_ICE_CAVE](#amb_ice_cave), [AMB_SPRING](#amb_spring) |
| The Shattered Temple<br>`shattered_temple` | [MUS_AREA_SHATTERED_TEMPLE](#mus_area_shattered_temple) | Shared/random — cavern pool plus White Breath, Iron Sky.mp3 | [AMB_SNOW_WIND](#amb_snow_wind), [AMB_CRYPT](#amb_crypt) |
| Greywater Landing<br>`marshcamp` | [MUS_AREA_MARSHCAMP](#mus_area_marshcamp) | Recorded/dedicated — Dusk in the Empty Town.mp3 | [AMB_DOCK](#amb_dock), [AMB_HEARTH](#amb_hearth) |
| The Weeping Marsh<br>`weeping_marsh` | [MUS_AREA_WEEPING_MARSH](#mus_area_weeping_marsh) | Recorded/dedicated — Ash Dune Cathedral.mp3 | [AMB_MARSH](#amb_marsh) |
| Abandoned Monastery — Flooded Crypts<br>`drowned_crypt` | [MUS_AREA_DROWNED_CRYPT](#mus_area_drowned_crypt) | Shared/random — cavern pool plus Ash Dune Cathedral.mp3 | [AMB_FLOODED](#amb_flooded), [ENV_WOOD_CREAK](#env_wood_creak) |
| The Hollow Reeds<br>`hollow_reeds` | [MUS_AREA_HOLLOW_REEDS](#mus_area_hollow_reeds) | Shared/random — cavern pool plus Ash Dune Cathedral.mp3 | [AMB_MARSH](#amb_marsh), [AMB_DOCK](#amb_dock) |
| The Spawn Pools<br>`spawn_pools` | [MUS_AREA_SPAWN_POOLS](#mus_area_spawn_pools) | Shared/random — cavern pool plus Ash Dune Cathedral.mp3 | [AMB_NEST](#amb_nest), [AMB_MARSH](#amb_marsh) |
| The Choir's Ritual<br>`ritual_site` | [MUS_AREA_RITUAL_SITE](#mus_area_ritual_site) | Shared/random — cavern pool plus Ash Dune Cathedral.mp3 | [AMB_FLOODED](#amb_flooded), [AMB_NEST](#amb_nest) |
| The Dig Camp<br>`khalcamp` | [MUS_AREA_KHALCAMP](#mus_area_khalcamp) | Recorded/dedicated — Dusk in the Demonic Jungle.mp3 | [AMB_DIG](#amb_dig), [AMB_HEARTH](#amb_hearth) |
| The Shifting Wastes<br>`desert_wastes` | [MUS_AREA_DESERT_WASTES](#mus_area_desert_wastes) | Recorded/dedicated — Sombras del Infierno.mp3 | [AMB_DESERT](#amb_desert) |
| Khal-Zahir — Underground Market<br>`underground_market` | [MUS_AREA_UNDERGROUND_MARKET](#mus_area_underground_market) | Shared/random — cavern pool; no dedicated regional recording | [AMB_MACHINE](#amb_machine), [AMB_TOMB](#amb_tomb) |
| The Shifting Tombs<br>`sand_tombs` | [MUS_AREA_SAND_TOMBS](#mus_area_sand_tombs) | Shared/random — cavern pool plus Sombras del Infierno.mp3 | [AMB_TOMB](#amb_tomb), [AMB_DESERT](#amb_desert) |
| The Shard Flats<br>`shard_flats` | [MUS_AREA_SHARD_FLATS](#mus_area_shard_flats) | Shared/random — cavern pool plus Sombras del Infierno.mp3 | [AMB_DESERT](#amb_desert), [AMB_MACHINE](#amb_machine) |
| Tomb of the Chained Sovereign<br>`tomb_sanctum` | [MUS_AREA_TOMB_SANCTUM](#mus_area_tomb_sanctum) | Shared/random — cavern pool plus Sombras del Infierno.mp3 | [AMB_TOMB](#amb_tomb) |
| Palace of Khal-Zahir<br>`khal_palace` | [MUS_AREA_KHAL_PALACE](#mus_area_khal_palace) | Shared/random — cavern pool plus Sombras del Infierno.mp3 | [AMB_MACHINE](#amb_machine), [AMB_TOMB](#amb_tomb) |
| The Shattered Cathedral<br>`cathedral1` | [MUS_AREA_CATHEDRAL1](#mus_area_cathedral1) | Shared/random — cavern pool plus Infernal Silence.mp3 | [AMB_VOID](#amb_void), [ENV_RUBBLE](#env_rubble) |
| Cinderwatch Remembered<br>`cathedral_cinderwatch` | [MUS_AREA_CATHEDRAL_CINDERWATCH](#mus_area_cathedral_cinderwatch) | Shared/random — cavern pool plus Infernal Silence.mp3 | [AMB_MEMORY](#amb_memory), [AMB_VOID](#amb_void) |
| The Cathedral Heart<br>`cathedral2` | [MUS_AREA_CATHEDRAL2](#mus_area_cathedral2) | Shared/random — cavern pool plus Infernal Silence.mp3 | [AMB_VOID](#amb_void), [AMB_FORTRESS](#amb_fortress) |
| The Last Bastion’s Echo<br>`cathedral_bastion` | [MUS_AREA_CATHEDRAL_BASTION](#mus_area_cathedral_bastion) | Shared/random — cavern pool plus Infernal Silence.mp3 | [AMB_MEMORY](#amb_memory), [AMB_VOID](#amb_void) |
| The Breach<br>`hellgate` | [MUS_AREA_HELLGATE](#mus_area_hellgate) | Recorded/dedicated — Tour de Pierre Vieille.mp3 | [AMB_HEARTH](#amb_hearth), [AMB_HELL](#amb_hell) |
| The Cinderfields<br>`ash_wastes` | [MUS_AREA_ASH_WASTES](#mus_area_ash_wastes) | Recorded/dedicated — Ancient Tower.mp3 | [AMB_HELL](#amb_hell), [AMB_WAR](#amb_war), [ENV_ASH_GUST](#env_ash_gust) |
| The Cinder Bastion<br>`cinder_bastion` | [MUS_AREA_CINDER_BASTION](#mus_area_cinder_bastion) | Shared/random — cavern pool plus Ancient Tower.mp3 | [AMB_FORTRESS](#amb_fortress), [AMB_WAR](#amb_war) |
| The Throne of Cinders<br>`throne` | [MUS_AREA_THRONE](#mus_area_throne) | Shared/random — cavern pool plus Ancient Tower.mp3 | [AMB_FORTRESS](#amb_fortress), [AMB_HELL](#amb_hell) |
| Cinderwatch<br>`town` | [MUS_AREA_TOWN](#mus_area_town) | Synthesized — town | [AMB_HEARTH](#amb_hearth), [AMB_FOREST](#amb_forest) |
| The Ashen Fields<br>`fields` | [MUS_AREA_FIELDS](#mus_area_fields) | Synthesized — wild | [AMB_FOREST](#amb_forest), [ENV_ASH_GUST](#env_ash_gust) |
| Sunken Crypt — Hollows<br>`crypt1` | [MUS_AREA_CRYPT1](#mus_area_crypt1) | Shared/random — cavern pool; no dedicated regional recording | [AMB_CRYPT](#amb_crypt) |
| Sunken Crypt — The Vigil<br>`crypt2` | [MUS_AREA_CRYPT2](#mus_area_crypt2) | Shared/random — cavern pool; no dedicated regional recording | [AMB_CRYPT](#amb_crypt) |
| The Ruined Chapel<br>`chapel` | [MUS_AREA_CHAPEL](#mus_area_chapel) | Shared/random — cavern pool; no dedicated regional recording | [AMB_CRYPT](#amb_crypt), [ENV_BELL](#env_bell) |
| The Blackbough<br>`forest` | [MUS_AREA_FOREST](#mus_area_forest) | Shared/random — cavern pool; no dedicated regional recording | [AMB_FOREST](#amb_forest), [ENV_WOOD_CREAK](#env_wood_creak) |
| Greymonastery — Cloister<br>`monastery1` | [MUS_AREA_MONASTERY1](#mus_area_monastery1) | Shared/random — cavern pool; no dedicated regional recording | [AMB_CRYPT](#amb_crypt), [ENV_BELL](#env_bell) |
| Greymonastery — Sanctum<br>`monastery2` | [MUS_AREA_MONASTERY2](#mus_area_monastery2) | Shared/random — cavern pool; no dedicated regional recording | [AMB_CRYPT](#amb_crypt), [ENV_BELL](#env_bell) |

Do not invent an Act IV town: `cathedral1` is a combat dungeon even though the act metadata calls it a camp. `infernalTown` is registered but unassigned. The Breach belongs to Act V. The opening road has its own proposed exploration theme in addition to finite story accents; those accents should replace/duck the bed when used rather than sum at full level.

### Opening and Act I

<a id="mus_area_frosthaven_approach"></a>

#### MUS_AREA_FROSTHAVEN_APPROACH — The Road to Frosthaven

- [ ] **Use:** frosthaven_approach. **P2 · 3–4 minutes · free time, a barely perceptible 48 BPM pulse · audition 2 candidates, retain 1.**
- **Filename:** `mus_area_frosthaven_approach_v01.wav` (lossless production master; encode delivery separately).
- **Current:** Recorded/dedicated — White Breath, Iron Sky.mp3.
- **Mood and instruments:** A lonely snow-covered road toward the last defended town; uneasy survival and a distant suggestion of refuge. Thin bowed cello harmonics, low breathy reed tones, isolated dull iron-bell notes; fragile two-note minor motif.
- **Structure:** Exploration/encounter loop; edit a stable passage and verify the join. No timed phase synchronization is implied.

```text
Original dark ambient horror instrumental game score. A lonely snow-covered road toward the last defended town; uneasy survival and a distant suggestion of refuge. Thin bowed cello harmonics, low breathy reed tones, isolated dull iron-bell notes; fragile two-note minor motif. Tempo: free time, a barely perceptible 48 BPM pulse. Target length 3–4 minutes. Sparse arrangement, restrained bass, ample space for gameplay sound effects. Maintain a stable restrained intensity with slow internal variation; no dramatic intro, climax, final cadence, or fade-out. Leave a quiet stable passage suitable for editing into a seamless game loop. No lyrics, intelligible voices, lead singer, pop rhythm, trailer booms, or literal combat sound effects.
```

<a id="mus_area_frosthaven"></a>

#### MUS_AREA_FROSTHAVEN — Frosthaven

- [ ] **Use:** frosthaven. **P2 · 3–4 minutes · 56 BPM, no drum groove · audition 2 candidates, retain 1.**
- **Filename:** `mus_area_frosthaven_v01.wav` (lossless production master; encode delivery separately).
- **Current:** Recorded/dedicated — Snowy Mountain Vigil.mp3.
- **Mood and instruments:** A small defended northern town sheltering exhausted survivors; warmth surrounded by cold danger. Muted low strings, sparse felt-piano intervals and delicate plucked lyre, a restrained minor melody with occasional suspended warmth.
- **Structure:** Exploration/encounter loop; edit a stable passage and verify the join. No timed phase synchronization is implied.

```text
Original dark ambient horror instrumental game score. A small defended northern town sheltering exhausted survivors; warmth surrounded by cold danger. Muted low strings, sparse felt-piano intervals and delicate plucked lyre, a restrained minor melody with occasional suspended warmth. Tempo: 56 BPM, no drum groove. Target length 3–4 minutes. Sparse arrangement, restrained bass, ample space for gameplay sound effects. Maintain a stable restrained intensity with slow internal variation; no dramatic intro, climax, final cadence, or fade-out. Leave a quiet stable passage suitable for editing into a seamless game loop. No lyrics, intelligible voices, lead singer, pop rhythm, trailer booms, or literal combat sound effects.
```

<a id="mus_area_north_wild"></a>

#### MUS_AREA_NORTH_WILD — The Fallen North

- [ ] **Use:** north_wild. **P2 · 3–4 minutes · 50 BPM, widely spaced pulses · audition 2 candidates, retain 1.**
- **Filename:** `mus_area_north_wild_v01.wav` (lossless production master; encode delivery separately).
- **Current:** Recorded/dedicated — White Breath, Iron Sky.mp3.
- **Mood and instruments:** An immense abandoned frozen frontier; isolation and the suspicion of movement beyond sight. Airy bass flute, thin tremolo strings, bowed metal and a very distant low frame-drum pulse.
- **Structure:** Exploration/encounter loop; edit a stable passage and verify the join. No timed phase synchronization is implied.

```text
Original dark ambient horror instrumental game score. An immense abandoned frozen frontier; isolation and the suspicion of movement beyond sight. Airy bass flute, thin tremolo strings, bowed metal and a very distant low frame-drum pulse. Tempo: 50 BPM, widely spaced pulses. Target length 3–4 minutes. Sparse arrangement, restrained bass, ample space for gameplay sound effects. Maintain a stable restrained intensity with slow internal variation; no dramatic intro, climax, final cadence, or fade-out. Leave a quiet stable passage suitable for editing into a seamless game loop. No lyrics, intelligible voices, lead singer, pop rhythm, trailer booms, or literal combat sound effects.
```

<a id="mus_area_mines"></a>

#### MUS_AREA_MINES — The Abandoned Mines

- [ ] **Use:** mines. **P2 · 3–4 minutes · free time · audition 2 candidates, retain 1.**
- **Filename:** `mus_area_mines_v01.wav` (lossless production master; encode delivery separately).
- **Current:** Shared/random — cavern pool plus White Breath, Iron Sky.mp3.
- **Mood and instruments:** Collapsed northern mine tunnels descending beneath frozen rock; oppressive depth and timber under strain. Low bowed contrabass, prepared-piano knocks, distant metallic harmonics and long unresolved gaps.
- **Structure:** Exploration/encounter loop; edit a stable passage and verify the join. No timed phase synchronization is implied.

```text
Original dark ambient horror instrumental game score. Collapsed northern mine tunnels descending beneath frozen rock; oppressive depth and timber under strain. Low bowed contrabass, prepared-piano knocks, distant metallic harmonics and long unresolved gaps. Tempo: free time. Target length 3–4 minutes. Sparse arrangement, restrained bass, ample space for gameplay sound effects. Maintain a stable restrained intensity with slow internal variation; no dramatic intro, climax, final cadence, or fade-out. Leave a quiet stable passage suitable for editing into a seamless game loop. No lyrics, intelligible voices, lead singer, pop rhythm, trailer booms, or literal combat sound effects.
```

<a id="mus_area_shardpeak_shrine"></a>

#### MUS_AREA_SHARDPEAK_SHRINE — The Shardpeak Shrine

- [ ] **Use:** shardpeak_shrine. **P2 · 3–4 minutes · 44 BPM, nearly beatless · audition 2 candidates, retain 1.**
- **Filename:** `mus_area_shardpeak_shrine_v01.wav` (lossless production master; encode delivery separately).
- **Current:** Shared/random — cavern pool plus White Breath, Iron Sky.mp3.
- **Mood and instruments:** An exposed mountain ascent to an ancient shard shrine; austere spiritual dread. Thin glass harmonics, sparse low bowed strings, restrained bronze singing-bowl resonance, a rising two-note fragment never resolving.
- **Structure:** Exploration/encounter loop; edit a stable passage and verify the join. No timed phase synchronization is implied.

```text
Original dark ambient horror instrumental game score. An exposed mountain ascent to an ancient shard shrine; austere spiritual dread. Thin glass harmonics, sparse low bowed strings, restrained bronze singing-bowl resonance, a rising two-note fragment never resolving. Tempo: 44 BPM, nearly beatless. Target length 3–4 minutes. Sparse arrangement, restrained bass, ample space for gameplay sound effects. Maintain a stable restrained intensity with slow internal variation; no dramatic intro, climax, final cadence, or fade-out. Leave a quiet stable passage suitable for editing into a seamless game loop. No lyrics, intelligible voices, lead singer, pop rhythm, trailer booms, or literal combat sound effects.
```

<a id="mus_area_deepfreeze_cavern"></a>

#### MUS_AREA_DEEPFREEZE_CAVERN — The Deepfreeze Caverns

- [ ] **Use:** deepfreeze_cavern. **P2 · 3–4 minutes · free time · audition 2 candidates, retain 1.**
- **Filename:** `mus_area_deepfreeze_cavern_v01.wav` (lossless production master; encode delivery separately).
- **Current:** Shared/random — cavern pool plus White Breath, Iron Sky.mp3.
- **Mood and instruments:** Vast blue-black ice chambers around a guarded frozen spring; brittle stillness hiding immense weight. High crystalline harmonics above a dark soft contrabass drone, slow detuned intervals and long empty pauses.
- **Structure:** Exploration/encounter loop; edit a stable passage and verify the join. No timed phase synchronization is implied.

```text
Original dark ambient horror instrumental game score. Vast blue-black ice chambers around a guarded frozen spring; brittle stillness hiding immense weight. High crystalline harmonics above a dark soft contrabass drone, slow detuned intervals and long empty pauses. Tempo: free time. Target length 3–4 minutes. Sparse arrangement, restrained bass, ample space for gameplay sound effects. Maintain a stable restrained intensity with slow internal variation; no dramatic intro, climax, final cadence, or fade-out. Leave a quiet stable passage suitable for editing into a seamless game loop. No lyrics, intelligible voices, lead singer, pop rhythm, trailer booms, or literal combat sound effects.
```

<a id="mus_area_shattered_temple"></a>

#### MUS_AREA_SHATTERED_TEMPLE — The Shattered Temple

- [ ] **Use:** shattered_temple. **P2 · 3–4 minutes · 54 BPM, sparse ceremonial pulse · audition 2 candidates, retain 1.**
- **Filename:** `mus_area_shattered_temple_v01.wav` (lossless production master; encode delivery separately).
- **Current:** Shared/random — cavern pool plus White Breath, Iron Sky.mp3.
- **Mood and instruments:** A broken frozen temple occupied by oathbound dead; duty curdled into menace. Low violas, cracked-bell-like tuned metal, distant organ pedal and slow ominous bowed-string swells.
- **Structure:** Exploration/encounter loop; edit a stable passage and verify the join. No timed phase synchronization is implied.

```text
Original dark ambient horror instrumental game score. A broken frozen temple occupied by oathbound dead; duty curdled into menace. Low violas, cracked-bell-like tuned metal, distant organ pedal and slow ominous bowed-string swells. Tempo: 54 BPM, sparse ceremonial pulse. Target length 3–4 minutes. Sparse arrangement, restrained bass, ample space for gameplay sound effects. Maintain a stable restrained intensity with slow internal variation; no dramatic intro, climax, final cadence, or fade-out. Leave a quiet stable passage suitable for editing into a seamless game loop. No lyrics, intelligible voices, lead singer, pop rhythm, trailer booms, or literal combat sound effects.
```

### Act II

<a id="mus_area_marshcamp"></a>

#### MUS_AREA_MARSHCAMP — Greywater Landing

- [ ] **Use:** marshcamp. **P2 · 3–4 minutes · 54 BPM, loose and restrained · audition 2 candidates, retain 1.**
- **Filename:** `mus_area_marshcamp_v01.wav` (lossless production master; encode delivery separately).
- **Current:** Recorded/dedicated — Dusk in the Empty Town.mp3.
- **Mood and instruments:** A decaying dock settlement offering fragile refuge beside a haunted marsh. Soft harmonium, muted plucked strings, low wooden flute and sparse imperfect piano notes; tired human warmth with unresolved endings.
- **Structure:** Exploration/encounter loop; edit a stable passage and verify the join. No timed phase synchronization is implied.

```text
Original dark ambient horror instrumental game score. A decaying dock settlement offering fragile refuge beside a haunted marsh. Soft harmonium, muted plucked strings, low wooden flute and sparse imperfect piano notes; tired human warmth with unresolved endings. Tempo: 54 BPM, loose and restrained. Target length 3–4 minutes. Sparse arrangement, restrained bass, ample space for gameplay sound effects. Maintain a stable restrained intensity with slow internal variation; no dramatic intro, climax, final cadence, or fade-out. Leave a quiet stable passage suitable for editing into a seamless game loop. No lyrics, intelligible voices, lead singer, pop rhythm, trailer booms, or literal combat sound effects.
```

<a id="mus_area_weeping_marsh"></a>

#### MUS_AREA_WEEPING_MARSH — The Weeping Marsh

- [ ] **Use:** weeping_marsh. **P2 · 3–4 minutes · 46 BPM, near beatless · audition 2 candidates, retain 1.**
- **Filename:** `mus_area_weeping_marsh_v01.wav` (lossless production master; encode delivery separately).
- **Current:** Recorded/dedicated — Ash Dune Cathedral.mp3.
- **Mood and instruments:** A drowned wetland where fear and memory are disappearing; slow suffocating unease. Low bass clarinet, dampened string tremolo and a wavering organ-like drone, isolated dissonant notes floating without a tune.
- **Structure:** Exploration/encounter loop; edit a stable passage and verify the join. No timed phase synchronization is implied.

```text
Original dark ambient horror instrumental game score. A drowned wetland where fear and memory are disappearing; slow suffocating unease. Low bass clarinet, dampened string tremolo and a wavering organ-like drone, isolated dissonant notes floating without a tune. Tempo: 46 BPM, near beatless. Target length 3–4 minutes. Sparse arrangement, restrained bass, ample space for gameplay sound effects. Maintain a stable restrained intensity with slow internal variation; no dramatic intro, climax, final cadence, or fade-out. Leave a quiet stable passage suitable for editing into a seamless game loop. No lyrics, intelligible voices, lead singer, pop rhythm, trailer booms, or literal combat sound effects.
```

<a id="mus_area_drowned_crypt"></a>

#### MUS_AREA_DROWNED_CRYPT — Abandoned Monastery — Flooded Crypts

- [ ] **Use:** drowned_crypt. **P2 · 3–4 minutes · free time · audition 2 candidates, retain 1.**
- **Filename:** `mus_area_drowned_crypt_v01.wav` (lossless production master; encode delivery separately).
- **Current:** Shared/random — cavern pool plus Ash Dune Cathedral.mp3.
- **Mood and instruments:** Flooded chambers beneath an abandoned monastery; enclosed grief and submerged ritual. Long low organ pedals, prepared piano droplets as musical notes, bowed metal and dissonant viola harmonics.
- **Structure:** Exploration/encounter loop; edit a stable passage and verify the join. No timed phase synchronization is implied.

```text
Original dark ambient horror instrumental game score. Flooded chambers beneath an abandoned monastery; enclosed grief and submerged ritual. Long low organ pedals, prepared piano droplets as musical notes, bowed metal and dissonant viola harmonics. Tempo: free time. Target length 3–4 minutes. Sparse arrangement, restrained bass, ample space for gameplay sound effects. Maintain a stable restrained intensity with slow internal variation; no dramatic intro, climax, final cadence, or fade-out. Leave a quiet stable passage suitable for editing into a seamless game loop. No lyrics, intelligible voices, lead singer, pop rhythm, trailer booms, or literal combat sound effects.
```

<a id="mus_area_hollow_reeds"></a>

#### MUS_AREA_HOLLOW_REEDS — The Hollow Reeds

- [ ] **Use:** hollow_reeds. **P2 · 3–4 minutes · 48 BPM, no regular percussion · audition 2 candidates, retain 1.**
- **Filename:** `mus_area_hollow_reeds_v01.wav` (lossless production master; encode delivery separately).
- **Current:** Shared/random — cavern pool plus Ash Dune Cathedral.mp3.
- **Mood and instruments:** Narrow reed passages where a distant ritual seems to answer your thoughts. Breathy low flutes, whisper-soft string scrapes and unstable reed-organ intervals; minimal harmonic movement and long anticipation.
- **Structure:** Exploration/encounter loop; edit a stable passage and verify the join. No timed phase synchronization is implied.

```text
Original dark ambient horror instrumental game score. Narrow reed passages where a distant ritual seems to answer your thoughts. Breathy low flutes, whisper-soft string scrapes and unstable reed-organ intervals; minimal harmonic movement and long anticipation. Tempo: 48 BPM, no regular percussion. Target length 3–4 minutes. Sparse arrangement, restrained bass, ample space for gameplay sound effects. Maintain a stable restrained intensity with slow internal variation; no dramatic intro, climax, final cadence, or fade-out. Leave a quiet stable passage suitable for editing into a seamless game loop. No lyrics, intelligible voices, lead singer, pop rhythm, trailer booms, or literal combat sound effects.
```

<a id="mus_area_spawn_pools"></a>

#### MUS_AREA_SPAWN_POOLS — The Spawn Pools

- [ ] **Use:** spawn_pools. **P2 · 3–4 minutes · 50 BPM, uneven pulse · audition 2 candidates, retain 1.**
- **Filename:** `mus_area_spawn_pools_v01.wav` (lossless production master; encode delivery separately).
- **Current:** Shared/random — cavern pool plus Ash Dune Cathedral.mp3.
- **Mood and instruments:** Organic spawning basins deep within a corrupted marsh; living rot and patient hunger. Low bassoon, softly rubbed drum skins and granular bowed strings, slow uneven pulses with no melodic comfort.
- **Structure:** Exploration/encounter loop; edit a stable passage and verify the join. No timed phase synchronization is implied.

```text
Original dark ambient horror instrumental game score. Organic spawning basins deep within a corrupted marsh; living rot and patient hunger. Low bassoon, softly rubbed drum skins and granular bowed strings, slow uneven pulses with no melodic comfort. Tempo: 50 BPM, uneven pulse. Target length 3–4 minutes. Sparse arrangement, restrained bass, ample space for gameplay sound effects. Maintain a stable restrained intensity with slow internal variation; no dramatic intro, climax, final cadence, or fade-out. Leave a quiet stable passage suitable for editing into a seamless game loop. No lyrics, intelligible voices, lead singer, pop rhythm, trailer booms, or literal combat sound effects.
```

<a id="mus_area_ritual_site"></a>

#### MUS_AREA_RITUAL_SITE — The Choir's Ritual

- [ ] **Use:** ritual_site. **P2 · 3–4 minutes · 52 BPM, ritual pulse with long rests · audition 2 candidates, retain 1.**
- **Filename:** `mus_area_ritual_site_v01.wav` (lossless production master; encode delivery separately).
- **Current:** Shared/random — cavern pool plus Ash Dune Cathedral.mp3.
- **Mood and instruments:** A drowned ritual basin of the Silent Choir; sacred emptiness and a presence below the water. Detuned organ, low string clusters and very faint wordless breath-like choral texture, slow unresolved harmonic pressure.
- **Structure:** Exploration/encounter loop; edit a stable passage and verify the join. No timed phase synchronization is implied.

```text
Original dark ambient horror instrumental game score. A drowned ritual basin of the Silent Choir; sacred emptiness and a presence below the water. Detuned organ, low string clusters and very faint wordless breath-like choral texture, slow unresolved harmonic pressure. Tempo: 52 BPM, ritual pulse with long rests. Target length 3–4 minutes. Sparse arrangement, restrained bass, ample space for gameplay sound effects. Maintain a stable restrained intensity with slow internal variation; no dramatic intro, climax, final cadence, or fade-out. Leave a quiet stable passage suitable for editing into a seamless game loop. No lyrics, intelligible voices, lead singer, pop rhythm, trailer booms, or literal combat sound effects.
```

### Act III

<a id="mus_area_khalcamp"></a>

#### MUS_AREA_KHALCAMP — The Dig Camp

- [ ] **Use:** khalcamp. **P2 · 3–4 minutes · 58 BPM, loose sparse pulse · audition 2 candidates, retain 1.**
- **Filename:** `mus_area_khalcamp_v01.wav` (lossless production master; encode delivery separately).
- **Current:** Recorded/dedicated — Dusk in the Demonic Jungle.mp3.
- **Mood and instruments:** An archaeological camp at the edge of a buried city; scholarly curiosity under desert exhaustion. Sparse oud harmonics, low wooden flute, muted cello and a few soft frame-drum touches; cautious shelter.
- **Structure:** Exploration/encounter loop; edit a stable passage and verify the join. No timed phase synchronization is implied.

```text
Original dark ambient horror instrumental game score. An archaeological camp at the edge of a buried city; scholarly curiosity under desert exhaustion. Sparse oud harmonics, low wooden flute, muted cello and a few soft frame-drum touches; cautious shelter. Tempo: 58 BPM, loose sparse pulse. Target length 3–4 minutes. Sparse arrangement, restrained bass, ample space for gameplay sound effects. Maintain a stable restrained intensity with slow internal variation; no dramatic intro, climax, final cadence, or fade-out. Leave a quiet stable passage suitable for editing into a seamless game loop. No lyrics, intelligible voices, lead singer, pop rhythm, trailer booms, or literal combat sound effects.
```

<a id="mus_area_desert_wastes"></a>

#### MUS_AREA_DESERT_WASTES — The Shifting Wastes

- [ ] **Use:** desert_wastes. **P2 · 3–4 minutes · 50 BPM, nearly beatless · audition 2 candidates, retain 1.**
- **Filename:** `mus_area_desert_wastes_v01.wav` (lossless production master; encode delivery separately).
- **Current:** Recorded/dedicated — Sombras del Infierno.mp3.
- **Mood and instruments:** A vast shifting desert above a buried civilization; ancient distance and mirages. Low oud drones, breathy ney-like flute, bowed bass and scattered metallic overtones; sustained ambiguous modal harmony.
- **Structure:** Exploration/encounter loop; edit a stable passage and verify the join. No timed phase synchronization is implied.

```text
Original dark ambient horror instrumental game score. A vast shifting desert above a buried civilization; ancient distance and mirages. Low oud drones, breathy ney-like flute, bowed bass and scattered metallic overtones; sustained ambiguous modal harmony. Tempo: 50 BPM, nearly beatless. Target length 3–4 minutes. Sparse arrangement, restrained bass, ample space for gameplay sound effects. Maintain a stable restrained intensity with slow internal variation; no dramatic intro, climax, final cadence, or fade-out. Leave a quiet stable passage suitable for editing into a seamless game loop. No lyrics, intelligible voices, lead singer, pop rhythm, trailer booms, or literal combat sound effects.
```

<a id="mus_area_underground_market"></a>

#### MUS_AREA_UNDERGROUND_MARKET — Khal-Zahir — Underground Market

- [ ] **Use:** underground_market. **P2 · 3–4 minutes · 58 BPM, broken mechanical pulse · audition 2 candidates, retain 1.**
- **Filename:** `mus_area_underground_market_v01.wav` (lossless production master; encode delivery separately).
- **Current:** Shared/random — cavern pool; no dedicated regional recording.
- **Mood and instruments:** An abandoned underground market whose ancient machines are still powered by shards; uncanny suspended commerce. Muted hammered-dulcimer notes, bowed brass and bass clarinet, irregular repeating fragments interrupted by silence.
- **Structure:** Exploration/encounter loop; edit a stable passage and verify the join. No timed phase synchronization is implied.

```text
Original dark ambient horror instrumental game score. An abandoned underground market whose ancient machines are still powered by shards; uncanny suspended commerce. Muted hammered-dulcimer notes, bowed brass and bass clarinet, irregular repeating fragments interrupted by silence. Tempo: 58 BPM, broken mechanical pulse. Target length 3–4 minutes. Sparse arrangement, restrained bass, ample space for gameplay sound effects. Maintain a stable restrained intensity with slow internal variation; no dramatic intro, climax, final cadence, or fade-out. Leave a quiet stable passage suitable for editing into a seamless game loop. No lyrics, intelligible voices, lead singer, pop rhythm, trailer booms, or literal combat sound effects.
```

<a id="mus_area_sand_tombs"></a>

#### MUS_AREA_SAND_TOMBS — The Shifting Tombs

- [ ] **Use:** sand_tombs. **P2 · 3–4 minutes · 52 BPM, sparse uneven pulse · audition 2 candidates, retain 1.**
- **Filename:** `mus_area_sand_tombs_v01.wav` (lossless production master; encode delivery separately).
- **Current:** Shared/random — cavern pool plus Sombras del Infierno.mp3.
- **Mood and instruments:** Buried corridors that shift around a trapped scholar; disorientation and forgotten imperial death. Low strings, dry plucked zither, sparse frame-drum taps and a narrow descending reed motif.
- **Structure:** Exploration/encounter loop; edit a stable passage and verify the join. No timed phase synchronization is implied.

```text
Original dark ambient horror instrumental game score. Buried corridors that shift around a trapped scholar; disorientation and forgotten imperial death. Low strings, dry plucked zither, sparse frame-drum taps and a narrow descending reed motif. Tempo: 52 BPM, sparse uneven pulse. Target length 3–4 minutes. Sparse arrangement, restrained bass, ample space for gameplay sound effects. Maintain a stable restrained intensity with slow internal variation; no dramatic intro, climax, final cadence, or fade-out. Leave a quiet stable passage suitable for editing into a seamless game loop. No lyrics, intelligible voices, lead singer, pop rhythm, trailer booms, or literal combat sound effects.
```

<a id="mus_area_shard_flats"></a>

#### MUS_AREA_SHARD_FLATS — The Shard Flats

- [ ] **Use:** shard_flats. **P2 · 3–4 minutes · 56 BPM, irregular restrained pulse · audition 2 candidates, retain 1.**
- **Filename:** `mus_area_shard_flats_v01.wav` (lossless production master; encode delivery separately).
- **Current:** Shared/random — cavern pool plus Sombras del Infierno.mp3.
- **Mood and instruments:** A field of fractured crystal and ruined machinery beneath the desert; fragile brilliance with hostile precision. Glass harmonics, dry muted strings, bowed metal and a slow low drone, asymmetrical short crystal-note figures.
- **Structure:** Exploration/encounter loop; edit a stable passage and verify the join. No timed phase synchronization is implied.

```text
Original dark ambient horror instrumental game score. A field of fractured crystal and ruined machinery beneath the desert; fragile brilliance with hostile precision. Glass harmonics, dry muted strings, bowed metal and a slow low drone, asymmetrical short crystal-note figures. Tempo: 56 BPM, irregular restrained pulse. Target length 3–4 minutes. Sparse arrangement, restrained bass, ample space for gameplay sound effects. Maintain a stable restrained intensity with slow internal variation; no dramatic intro, climax, final cadence, or fade-out. Leave a quiet stable passage suitable for editing into a seamless game loop. No lyrics, intelligible voices, lead singer, pop rhythm, trailer booms, or literal combat sound effects.
```

<a id="mus_area_tomb_sanctum"></a>

#### MUS_AREA_TOMB_SANCTUM — Tomb of the Chained Sovereign

- [ ] **Use:** tomb_sanctum. **P2 · 3–4 minutes · 48 BPM, weighty isolated beats · audition 2 candidates, retain 1.**
- **Filename:** `mus_area_tomb_sanctum_v01.wav` (lossless production master; encode delivery separately).
- **Current:** Shared/random — cavern pool plus Sombras del Infierno.mp3.
- **Mood and instruments:** The sealed tomb of a chained sovereign; immense patient authority and imprisonment. Low bowed strings, metallic chain-like musical percussion and deep soft organ, slow descending intervals that never resolve.
- **Structure:** Exploration/encounter loop; edit a stable passage and verify the join. No timed phase synchronization is implied.

```text
Original dark ambient horror instrumental game score. The sealed tomb of a chained sovereign; immense patient authority and imprisonment. Low bowed strings, metallic chain-like musical percussion and deep soft organ, slow descending intervals that never resolve. Tempo: 48 BPM, weighty isolated beats. Target length 3–4 minutes. Sparse arrangement, restrained bass, ample space for gameplay sound effects. Maintain a stable restrained intensity with slow internal variation; no dramatic intro, climax, final cadence, or fade-out. Leave a quiet stable passage suitable for editing into a seamless game loop. No lyrics, intelligible voices, lead singer, pop rhythm, trailer booms, or literal combat sound effects.
```

<a id="mus_area_khal_palace"></a>

#### MUS_AREA_KHAL_PALACE — Palace of Khal-Zahir

- [ ] **Use:** khal_palace. **P2 · 3–4 minutes · 60 BPM, restrained ceremonial pulse · audition 2 candidates, retain 1.**
- **Filename:** `mus_area_khal_palace_v01.wav` (lossless production master; encode delivery separately).
- **Current:** Shared/random — cavern pool plus Sombras del Infierno.mp3.
- **Mood and instruments:** A buried gilded palace fused to an ancient shard; ruined grandeur and corrupt wealth. Low strings, muted brass, sparse oud and brittle gold-toned dulcimer, stately but hollow modal phrases.
- **Structure:** Exploration/encounter loop; edit a stable passage and verify the join. No timed phase synchronization is implied.

```text
Original dark ambient horror instrumental game score. A buried gilded palace fused to an ancient shard; ruined grandeur and corrupt wealth. Low strings, muted brass, sparse oud and brittle gold-toned dulcimer, stately but hollow modal phrases. Tempo: 60 BPM, restrained ceremonial pulse. Target length 3–4 minutes. Sparse arrangement, restrained bass, ample space for gameplay sound effects. Maintain a stable restrained intensity with slow internal variation; no dramatic intro, climax, final cadence, or fade-out. Leave a quiet stable passage suitable for editing into a seamless game loop. No lyrics, intelligible voices, lead singer, pop rhythm, trailer booms, or literal combat sound effects.
```

### Act IV

<a id="mus_area_cathedral1"></a>

#### MUS_AREA_CATHEDRAL1 — The Shattered Cathedral

- [ ] **Use:** cathedral1. **P2 · 3–4 minutes · free time, occasional 48 BPM pulse · audition 2 candidates, retain 1.**
- **Filename:** `mus_area_cathedral1_v01.wav` (lossless production master; encode delivery separately).
- **Current:** Shared/random — cavern pool plus Infernal Silence.mp3.
- **Mood and instruments:** A shattered Gothic cathedral floating above a void and rebuilding itself from memory. Broken pipe-organ chords, thin high strings, bowed metal and remote wordless choral haze; awe emptied of reassurance.
- **Structure:** Exploration/encounter loop; edit a stable passage and verify the join. No timed phase synchronization is implied.

```text
Original dark ambient horror instrumental game score. A shattered Gothic cathedral floating above a void and rebuilding itself from memory. Broken pipe-organ chords, thin high strings, bowed metal and remote wordless choral haze; awe emptied of reassurance. Tempo: free time, occasional 48 BPM pulse. Target length 3–4 minutes. Sparse arrangement, restrained bass, ample space for gameplay sound effects. Maintain a stable restrained intensity with slow internal variation; no dramatic intro, climax, final cadence, or fade-out. Leave a quiet stable passage suitable for editing into a seamless game loop. No lyrics, intelligible voices, lead singer, pop rhythm, trailer booms, or literal combat sound effects.
```

<a id="mus_area_cathedral_cinderwatch"></a>

#### MUS_AREA_CATHEDRAL_CINDERWATCH — Cinderwatch Remembered

- [ ] **Use:** cathedral_cinderwatch. **P2 · 3–4 minutes · 54 BPM, unstable spacing · audition 2 candidates, retain 1.**
- **Filename:** `mus_area_cathedral_cinderwatch_v01.wav` (lossless production master; encode delivery separately).
- **Current:** Shared/random — cavern pool plus Infernal Silence.mp3.
- **Mood and instruments:** A remembered version of a once-safe town inside an impossible cathedral; familiar warmth subtly wrong. Detuned felt piano and damaged-sounding plucked lyre over a hollow organ drone, a simple fragment returning with missing notes.
- **Structure:** Exploration/encounter loop; edit a stable passage and verify the join. No timed phase synchronization is implied.

```text
Original dark ambient horror instrumental game score. A remembered version of a once-safe town inside an impossible cathedral; familiar warmth subtly wrong. Detuned felt piano and damaged-sounding plucked lyre over a hollow organ drone, a simple fragment returning with missing notes. Tempo: 54 BPM, unstable spacing. Target length 3–4 minutes. Sparse arrangement, restrained bass, ample space for gameplay sound effects. Maintain a stable restrained intensity with slow internal variation; no dramatic intro, climax, final cadence, or fade-out. Leave a quiet stable passage suitable for editing into a seamless game loop. No lyrics, intelligible voices, lead singer, pop rhythm, trailer booms, or literal combat sound effects.
```

<a id="mus_area_cathedral2"></a>

#### MUS_AREA_CATHEDRAL2 — The Cathedral Heart

- [ ] **Use:** cathedral2. **P2 · 3–4 minutes · 50 BPM, oppressive measured pulse · audition 2 candidates, retain 1.**
- **Filename:** `mus_area_cathedral2_v01.wav` (lossless production master; encode delivery separately).
- **Current:** Shared/random — cavern pool plus Infernal Silence.mp3.
- **Mood and instruments:** The cathedral heart where stolen souls and a hollow king gather; immense absence behind ceremonial power. Deep organ pedals, slow bowed contrabass, thin dissonant viola and faint wordless throat-like texture.
- **Structure:** Exploration/encounter loop; edit a stable passage and verify the join. No timed phase synchronization is implied.

```text
Original dark ambient horror instrumental game score. The cathedral heart where stolen souls and a hollow king gather; immense absence behind ceremonial power. Deep organ pedals, slow bowed contrabass, thin dissonant viola and faint wordless throat-like texture. Tempo: 50 BPM, oppressive measured pulse. Target length 3–4 minutes. Sparse arrangement, restrained bass, ample space for gameplay sound effects. Maintain a stable restrained intensity with slow internal variation; no dramatic intro, climax, final cadence, or fade-out. Leave a quiet stable passage suitable for editing into a seamless game loop. No lyrics, intelligible voices, lead singer, pop rhythm, trailer booms, or literal combat sound effects.
```

<a id="mus_area_cathedral_bastion"></a>

#### MUS_AREA_CATHEDRAL_BASTION — The Last Bastion’s Echo

- [ ] **Use:** cathedral_bastion. **P2 · 3–4 minutes · 52 BPM, interrupted march-like pulse · audition 2 candidates, retain 1.**
- **Filename:** `mus_area_cathedral_bastion_v01.wav` (lossless production master; encode delivery separately).
- **Current:** Shared/random — cavern pool plus Infernal Silence.mp3.
- **Mood and instruments:** An echo of the last bastion caught in failing memory; endurance drained into grief. Muted low horn, broken organ harmonics and sparse bowed strings, a restrained descending watch-call motif.
- **Structure:** Exploration/encounter loop; edit a stable passage and verify the join. No timed phase synchronization is implied.

```text
Original dark ambient horror instrumental game score. An echo of the last bastion caught in failing memory; endurance drained into grief. Muted low horn, broken organ harmonics and sparse bowed strings, a restrained descending watch-call motif. Tempo: 52 BPM, interrupted march-like pulse. Target length 3–4 minutes. Sparse arrangement, restrained bass, ample space for gameplay sound effects. Maintain a stable restrained intensity with slow internal variation; no dramatic intro, climax, final cadence, or fade-out. Leave a quiet stable passage suitable for editing into a seamless game loop. No lyrics, intelligible voices, lead singer, pop rhythm, trailer booms, or literal combat sound effects.
```

### Act V

<a id="mus_area_hellgate"></a>

#### MUS_AREA_HELLGATE — The Breach

- [ ] **Use:** hellgate. **P2 · 3–4 minutes · 56 BPM, sparse heartbeat-like pulse · audition 2 candidates, retain 1.**
- **Filename:** `mus_area_hellgate_v01.wav` (lossless production master; encode delivery separately).
- **Current:** Recorded/dedicated — Tour de Pierre Vieille.mp3.
- **Mood and instruments:** A small defensible refuge at the breach into Hell; exhausted resolve beneath an infernal sky. Warm low cello, restrained harmonium and a few dull bronze notes, narrow suspended harmonies that briefly suggest safety.
- **Structure:** Exploration/encounter loop; edit a stable passage and verify the join. No timed phase synchronization is implied.

```text
Original dark ambient horror instrumental game score. A small defensible refuge at the breach into Hell; exhausted resolve beneath an infernal sky. Warm low cello, restrained harmonium and a few dull bronze notes, narrow suspended harmonies that briefly suggest safety. Tempo: 56 BPM, sparse heartbeat-like pulse. Target length 3–4 minutes. Sparse arrangement, restrained bass, ample space for gameplay sound effects. Maintain a stable restrained intensity with slow internal variation; no dramatic intro, climax, final cadence, or fade-out. Leave a quiet stable passage suitable for editing into a seamless game loop. No lyrics, intelligible voices, lead singer, pop rhythm, trailer booms, or literal combat sound effects.
```

<a id="mus_area_ash_wastes"></a>

#### MUS_AREA_ASH_WASTES — The Cinderfields

- [ ] **Use:** ash_wastes. **P2 · 3–4 minutes · 62 BPM, sparse uneven pulse · audition 2 candidates, retain 1.**
- **Filename:** `mus_area_ash_wastes_v01.wav` (lossless production master; encode delivery separately).
- **Current:** Recorded/dedicated — Ancient Tower.mp3.
- **Mood and instruments:** An open volcanic battlefield where demon factions fight across ash plains; vast hostility and constant distant threat. Low rough strings, bowed sheet metal, muted bass drum and bleak horn fragments, controlled low end.
- **Structure:** Exploration/encounter loop; edit a stable passage and verify the join. No timed phase synchronization is implied.

```text
Original dark ambient horror instrumental game score. An open volcanic battlefield where demon factions fight across ash plains; vast hostility and constant distant threat. Low rough strings, bowed sheet metal, muted bass drum and bleak horn fragments, controlled low end. Tempo: 62 BPM, sparse uneven pulse. Target length 3–4 minutes. Sparse arrangement, restrained bass, ample space for gameplay sound effects. Maintain a stable restrained intensity with slow internal variation; no dramatic intro, climax, final cadence, or fade-out. Leave a quiet stable passage suitable for editing into a seamless game loop. No lyrics, intelligible voices, lead singer, pop rhythm, trailer booms, or literal combat sound effects.
```

<a id="mus_area_cinder_bastion"></a>

#### MUS_AREA_CINDER_BASTION — The Cinder Bastion

- [ ] **Use:** cinder_bastion. **P2 · 3–4 minutes · 66 BPM, restrained martial pulse · audition 2 candidates, retain 1.**
- **Filename:** `mus_area_cinder_bastion_v01.wav` (lossless production master; encode delivery separately).
- **Current:** Shared/random — cavern pool plus Ancient Tower.mp3.
- **Mood and instruments:** An infernal fortress of black stone, furnaces and competing warlords; disciplined cruelty. Low trombone air tones, bowed bass, restrained iron percussion and short organ clusters, rigid phrases interrupted by voids.
- **Structure:** Exploration/encounter loop; edit a stable passage and verify the join. No timed phase synchronization is implied.

```text
Original dark ambient horror instrumental game score. An infernal fortress of black stone, furnaces and competing warlords; disciplined cruelty. Low trombone air tones, bowed bass, restrained iron percussion and short organ clusters, rigid phrases interrupted by voids. Tempo: 66 BPM, restrained martial pulse. Target length 3–4 minutes. Sparse arrangement, restrained bass, ample space for gameplay sound effects. Maintain a stable restrained intensity with slow internal variation; no dramatic intro, climax, final cadence, or fade-out. Leave a quiet stable passage suitable for editing into a seamless game loop. No lyrics, intelligible voices, lead singer, pop rhythm, trailer booms, or literal combat sound effects.
```

<a id="mus_area_throne"></a>

#### MUS_AREA_THRONE — The Throne of Cinders

- [ ] **Use:** throne. **P2 · 3–4 minutes · 58 BPM, measured sparse pulse · audition 2 candidates, retain 1.**
- **Filename:** `mus_area_throne_v01.wav` (lossless production master; encode delivery separately).
- **Current:** Shared/random — cavern pool plus Ancient Tower.mp3.
- **Mood and instruments:** The final throne chamber before a veiled ruler; deception, immense power and the memory of every previous wound. Deep organ, thin serpent-like string glissandi, subdued metallic resonance and a fragmented two-note motif.
- **Structure:** Exploration/encounter loop; edit a stable passage and verify the join. No timed phase synchronization is implied.

```text
Original dark ambient horror instrumental game score. The final throne chamber before a veiled ruler; deception, immense power and the memory of every previous wound. Deep organ, thin serpent-like string glissandi, subdued metallic resonance and a fragmented two-note motif. Tempo: 58 BPM, measured sparse pulse. Target length 3–4 minutes. Sparse arrangement, restrained bass, ample space for gameplay sound effects. Maintain a stable restrained intensity with slow internal variation; no dramatic intro, climax, final cadence, or fade-out. Leave a quiet stable passage suitable for editing into a seamless game loop. No lyrics, intelligible voices, lead singer, pop rhythm, trailer booms, or literal combat sound effects.
```

### Optional Ashen Marches

<a id="mus_area_town"></a>

#### MUS_AREA_TOWN — Cinderwatch

- [ ] **Use:** town. **P2 · 3–4 minutes · 54 BPM, loose and quiet · audition 2 candidates, retain 1.**
- **Filename:** `mus_area_town_v01.wav` (lossless production master; encode delivery separately).
- **Current:** Synthesized — town.
- **Mood and instruments:** An ash-covered frontier town after most inhabitants have gone; weary shelter and abandoned faith. Muted plucked lyre, felt piano and low cello, simple minor intervals with long pauses and a trace of warmth.
- **Structure:** Exploration/encounter loop; edit a stable passage and verify the join. No timed phase synchronization is implied.

```text
Original dark ambient horror instrumental game score. An ash-covered frontier town after most inhabitants have gone; weary shelter and abandoned faith. Muted plucked lyre, felt piano and low cello, simple minor intervals with long pauses and a trace of warmth. Tempo: 54 BPM, loose and quiet. Target length 3–4 minutes. Sparse arrangement, restrained bass, ample space for gameplay sound effects. Maintain a stable restrained intensity with slow internal variation; no dramatic intro, climax, final cadence, or fade-out. Leave a quiet stable passage suitable for editing into a seamless game loop. No lyrics, intelligible voices, lead singer, pop rhythm, trailer booms, or literal combat sound effects.
```

<a id="mus_area_fields"></a>

#### MUS_AREA_FIELDS — The Ashen Fields

- [ ] **Use:** fields. **P2 · 3–4 minutes · 50 BPM, widely spaced pulse · audition 2 candidates, retain 1.**
- **Filename:** `mus_area_fields_v01.wav` (lossless production master; encode delivery separately).
- **Current:** Synthesized — wild.
- **Mood and instruments:** Abandoned ashen fields around a frontier settlement; something watching beyond the ruined walls. Low wooden flute, bowed strings and occasional dull frame-drum taps, sparse open intervals turning dissonant.
- **Structure:** Exploration/encounter loop; edit a stable passage and verify the join. No timed phase synchronization is implied.

```text
Original dark ambient horror instrumental game score. Abandoned ashen fields around a frontier settlement; something watching beyond the ruined walls. Low wooden flute, bowed strings and occasional dull frame-drum taps, sparse open intervals turning dissonant. Tempo: 50 BPM, widely spaced pulse. Target length 3–4 minutes. Sparse arrangement, restrained bass, ample space for gameplay sound effects. Maintain a stable restrained intensity with slow internal variation; no dramatic intro, climax, final cadence, or fade-out. Leave a quiet stable passage suitable for editing into a seamless game loop. No lyrics, intelligible voices, lead singer, pop rhythm, trailer booms, or literal combat sound effects.
```

<a id="mus_area_crypt1"></a>

#### MUS_AREA_CRYPT1 — Sunken Crypt — Hollows

- [ ] **Use:** crypt1. **P2 · 3–4 minutes · free time · audition 2 candidates, retain 1.**
- **Filename:** `mus_area_crypt1_v01.wav` (lossless production master; encode delivery separately).
- **Current:** Shared/random — cavern pool; no dedicated regional recording.
- **Mood and instruments:** The outer hollows of a sunken burial complex; intimate claustrophobic dread. Prepared piano, low bowed bass and dry bell-like metal, narrow dissonances and long gaps.
- **Structure:** Exploration/encounter loop; edit a stable passage and verify the join. No timed phase synchronization is implied.

```text
Original dark ambient horror instrumental game score. The outer hollows of a sunken burial complex; intimate claustrophobic dread. Prepared piano, low bowed bass and dry bell-like metal, narrow dissonances and long gaps. Tempo: free time. Target length 3–4 minutes. Sparse arrangement, restrained bass, ample space for gameplay sound effects. Maintain a stable restrained intensity with slow internal variation; no dramatic intro, climax, final cadence, or fade-out. Leave a quiet stable passage suitable for editing into a seamless game loop. No lyrics, intelligible voices, lead singer, pop rhythm, trailer booms, or literal combat sound effects.
```

<a id="mus_area_crypt2"></a>

#### MUS_AREA_CRYPT2 — Sunken Crypt — The Vigil

- [ ] **Use:** crypt2. **P2 · 3–4 minutes · 46 BPM, very slow ceremonial pulse · audition 2 candidates, retain 1.**
- **Filename:** `mus_area_crypt2_v01.wav` (lossless production master; encode delivery separately).
- **Current:** Shared/random — cavern pool; no dedicated regional recording.
- **Mood and instruments:** The deeper vigil chamber of an ancient grave-warden; duty surviving as imprisonment. Deep organ, sparse low cello and muted bronze strikes, a descending two-note watch motif suspended over a dark drone.
- **Structure:** Exploration/encounter loop; edit a stable passage and verify the join. No timed phase synchronization is implied.

```text
Original dark ambient horror instrumental game score. The deeper vigil chamber of an ancient grave-warden; duty surviving as imprisonment. Deep organ, sparse low cello and muted bronze strikes, a descending two-note watch motif suspended over a dark drone. Tempo: 46 BPM, very slow ceremonial pulse. Target length 3–4 minutes. Sparse arrangement, restrained bass, ample space for gameplay sound effects. Maintain a stable restrained intensity with slow internal variation; no dramatic intro, climax, final cadence, or fade-out. Leave a quiet stable passage suitable for editing into a seamless game loop. No lyrics, intelligible voices, lead singer, pop rhythm, trailer booms, or literal combat sound effects.
```

<a id="mus_area_chapel"></a>

#### MUS_AREA_CHAPEL — The Ruined Chapel

- [ ] **Use:** chapel. **P2 · 3–4 minutes · 48 BPM, mostly beatless · audition 2 candidates, retain 1.**
- **Filename:** `mus_area_chapel_v01.wav` (lossless production master; encode delivery separately).
- **Current:** Shared/random — cavern pool; no dedicated regional recording.
- **Mood and instruments:** A ruined chapel still occupied by a corrupted vicar; devotional calm turned threatening. Thin broken organ chords, bowed metal and distant wordless choral breath, long dissonant suspensions.
- **Structure:** Exploration/encounter loop; edit a stable passage and verify the join. No timed phase synchronization is implied.

```text
Original dark ambient horror instrumental game score. A ruined chapel still occupied by a corrupted vicar; devotional calm turned threatening. Thin broken organ chords, bowed metal and distant wordless choral breath, long dissonant suspensions. Tempo: 48 BPM, mostly beatless. Target length 3–4 minutes. Sparse arrangement, restrained bass, ample space for gameplay sound effects. Maintain a stable restrained intensity with slow internal variation; no dramatic intro, climax, final cadence, or fade-out. Leave a quiet stable passage suitable for editing into a seamless game loop. No lyrics, intelligible voices, lead singer, pop rhythm, trailer booms, or literal combat sound effects.
```

<a id="mus_area_forest"></a>

#### MUS_AREA_FOREST — The Blackbough

- [ ] **Use:** forest. **P2 · 3–4 minutes · 52 BPM, irregular pulse · audition 2 candidates, retain 1.**
- **Filename:** `mus_area_forest_v01.wav` (lossless production master; encode delivery separately).
- **Current:** Shared/random — cavern pool; no dedicated regional recording.
- **Mood and instruments:** A black tangled woodland hiding predators and old corruption. Low bass clarinet, scratchy sul-ponticello strings and damped hand percussion, irregular predatory gaps and tiny drifting motifs.
- **Structure:** Exploration/encounter loop; edit a stable passage and verify the join. No timed phase synchronization is implied.

```text
Original dark ambient horror instrumental game score. A black tangled woodland hiding predators and old corruption. Low bass clarinet, scratchy sul-ponticello strings and damped hand percussion, irregular predatory gaps and tiny drifting motifs. Tempo: 52 BPM, irregular pulse. Target length 3–4 minutes. Sparse arrangement, restrained bass, ample space for gameplay sound effects. Maintain a stable restrained intensity with slow internal variation; no dramatic intro, climax, final cadence, or fade-out. Leave a quiet stable passage suitable for editing into a seamless game loop. No lyrics, intelligible voices, lead singer, pop rhythm, trailer booms, or literal combat sound effects.
```

<a id="mus_area_monastery1"></a>

#### MUS_AREA_MONASTERY1 — Greymonastery — Cloister

- [ ] **Use:** monastery1. **P2 · 3–4 minutes · 54 BPM, restrained broken pulse · audition 2 candidates, retain 1.**
- **Filename:** `mus_area_monastery1_v01.wav` (lossless production master; encode delivery separately).
- **Current:** Shared/random — cavern pool; no dedicated regional recording.
- **Mood and instruments:** The outer cloister of a deserted grey monastery; repetition, ritual and unseen movement. Muted plucked strings, cold organ harmonics and sparse low percussion, a circular phrase with one unsettling missing beat.
- **Structure:** Exploration/encounter loop; edit a stable passage and verify the join. No timed phase synchronization is implied.

```text
Original dark ambient horror instrumental game score. The outer cloister of a deserted grey monastery; repetition, ritual and unseen movement. Muted plucked strings, cold organ harmonics and sparse low percussion, a circular phrase with one unsettling missing beat. Tempo: 54 BPM, restrained broken pulse. Target length 3–4 minutes. Sparse arrangement, restrained bass, ample space for gameplay sound effects. Maintain a stable restrained intensity with slow internal variation; no dramatic intro, climax, final cadence, or fade-out. Leave a quiet stable passage suitable for editing into a seamless game loop. No lyrics, intelligible voices, lead singer, pop rhythm, trailer booms, or literal combat sound effects.
```

<a id="mus_area_monastery2"></a>

#### MUS_AREA_MONASTERY2 — Greymonastery — Sanctum

- [ ] **Use:** monastery2. **P2 · 3–4 minutes · 50 BPM, severe ritual pulse · audition 2 candidates, retain 1.**
- **Filename:** `mus_area_monastery2_v01.wav` (lossless production master; encode delivery separately).
- **Current:** Shared/random — cavern pool; no dedicated regional recording.
- **Mood and instruments:** The monastery sanctum of an unshepherd; the center of a corrupted faith. Low organ and bass strings, bowed bronze and faint wordless choral texture, slow crushing suspensions without a triumphant melody.
- **Structure:** Exploration/encounter loop; edit a stable passage and verify the join. No timed phase synchronization is implied.

```text
Original dark ambient horror instrumental game score. The monastery sanctum of an unshepherd; the center of a corrupted faith. Low organ and bass strings, bowed bronze and faint wordless choral texture, slow crushing suspensions without a triumphant melody. Tempo: 50 BPM, severe ritual pulse. Target length 3–4 minutes. Sparse arrangement, restrained bass, ample space for gameplay sound effects. Maintain a stable restrained intensity with slow internal variation; no dramatic intro, climax, final cadence, or fade-out. Leave a quiet stable passage suitable for editing into a seamless game loop. No lyrics, intelligible voices, lead singer, pop rhythm, trailer booms, or literal combat sound effects.
```

### Boss and miniboss themes

<a id="mus_boss_frost_watch_captain"></a>

#### MUS_BOSS_FROST_WATCH_CAPTAIN — The Rimebound Captain

- [ ] **Use:** frost_watch_captain. **P2 · 3–4 minutes · 76 BPM · audition 2 candidates, retain 1.**
- **Filename:** `mus_boss_frost_watch_captain_v01.wav` (lossless production master; encode delivery separately).
- **Current:** Shared — Hellscape Assault.mp3 when an engaged boss has the large health bar.
- **Mood and instruments:** A frozen watch captain still defending a ruined gate; tragic duty and close danger. Cold low strings, restrained iron percussion and a thin broken horn motif.
- **Structure:** Exploration/encounter loop; edit a stable passage and verify the join. No timed phase synchronization is implied.

```text
Original dark ambient horror instrumental game score. A frozen watch captain still defending a ruined gate; tragic duty and close danger. Cold low strings, restrained iron percussion and a thin broken horn motif. Tempo: 76 BPM. Target length 3–4 minutes. Sparse arrangement, restrained bass, ample space for gameplay sound effects. Maintain a stable restrained intensity with slow internal variation; no dramatic intro, climax, final cadence, or fade-out. Leave a quiet stable passage suitable for editing into a seamless game loop. No lyrics, intelligible voices, lead singer, pop rhythm, trailer booms, or literal combat sound effects.
```

<a id="mus_boss_korvath"></a>

#### MUS_BOSS_KORVATH — Korvath, the Oathbreaker

- [ ] **Use:** korvath. **P2 · 3–4 minutes · 82 BPM · audition 2 candidates, retain 1.**
- **Filename:** `mus_boss_korvath_v01.wav` (lossless production master; encode delivery separately).
- **Current:** Shared — Hellscape Assault.mp3 when an engaged boss has the large health bar.
- **Mood and instruments:** A fallen northern defender whose oath burns through broken armor. Grinding bowed strings, low brass breath and isolated iron blows; a stern two-note motif under mounting dissonance.
- **Structure:** Exploration/encounter loop; edit a stable passage and verify the join. No timed phase synchronization is implied.

```text
Original dark ambient horror instrumental game score. A fallen northern defender whose oath burns through broken armor. Grinding bowed strings, low brass breath and isolated iron blows; a stern two-note motif under mounting dissonance. Tempo: 82 BPM. Target length 3–4 minutes. Sparse arrangement, restrained bass, ample space for gameplay sound effects. Maintain a stable restrained intensity with slow internal variation; no dramatic intro, climax, final cadence, or fade-out. Leave a quiet stable passage suitable for editing into a seamless game loop. No lyrics, intelligible voices, lead singer, pop rhythm, trailer booms, or literal combat sound effects.
```

<a id="mus_boss_mire_mother"></a>

#### MUS_BOSS_MIRE_MOTHER — The Mire Mother

- [ ] **Use:** mire_mother. **P2 · 3–4 minutes · 72 BPM · audition 2 candidates, retain 1.**
- **Filename:** `mus_boss_mire_mother_v01.wav` (lossless production master; encode delivery separately).
- **Current:** Shared — Hellscape Assault.mp3 when an engaged boss has the large health bar.
- **Mood and instruments:** A vast maternal swamp horror clutching a stolen shard; suffocating organic dread. Bass clarinet, low string clusters, rubbed drum skins and faint wordless throat texture, breathing unevenly.
- **Structure:** Exploration/encounter loop; edit a stable passage and verify the join. No timed phase synchronization is implied.

```text
Original dark ambient horror instrumental game score. A vast maternal swamp horror clutching a stolen shard; suffocating organic dread. Bass clarinet, low string clusters, rubbed drum skins and faint wordless throat texture, breathing unevenly. Tempo: 72 BPM. Target length 3–4 minutes. Sparse arrangement, restrained bass, ample space for gameplay sound effects. Maintain a stable restrained intensity with slow internal variation; no dramatic intro, climax, final cadence, or fade-out. Leave a quiet stable passage suitable for editing into a seamless game loop. No lyrics, intelligible voices, lead singer, pop rhythm, trailer booms, or literal combat sound effects.
```

<a id="mus_boss_azram"></a>

#### MUS_BOSS_AZRAM — Azram the Gilded

- [ ] **Use:** azram. **P2 · 3–4 minutes · 84 BPM · audition 2 candidates, retain 1.**
- **Filename:** `mus_boss_azram_v01.wav` (lossless production master; encode delivery separately).
- **Current:** Shared — Hellscape Assault.mp3 when an engaged boss has the large health bar.
- **Mood and instruments:** A gilded sovereign opening portals into a ruined imperial past. Muted brass, low oud, hammered dulcimer and short dry metal percussion; oppressive ceremonial grandeur.
- **Structure:** Exploration/encounter loop; edit a stable passage and verify the join. No timed phase synchronization is implied.

```text
Original dark ambient horror instrumental game score. A gilded sovereign opening portals into a ruined imperial past. Muted brass, low oud, hammered dulcimer and short dry metal percussion; oppressive ceremonial grandeur. Tempo: 84 BPM. Target length 3–4 minutes. Sparse arrangement, restrained bass, ample space for gameplay sound effects. Maintain a stable restrained intensity with slow internal variation; no dramatic intro, climax, final cadence, or fade-out. Leave a quiet stable passage suitable for editing into a seamless game loop. No lyrics, intelligible voices, lead singer, pop rhythm, trailer booms, or literal combat sound effects.
```

<a id="mus_boss_empty_archangel"></a>

#### MUS_BOSS_EMPTY_ARCHANGEL — The Empty Archangel

- [ ] **Use:** empty_archangel. **P2 · 3–4 minutes · 80 BPM · audition 2 candidates, retain 1.**
- **Filename:** `mus_boss_empty_archangel_v01.wav` (lossless production master; encode delivery separately).
- **Current:** Shared — Hellscape Assault.mp3 when an engaged boss has the large health bar.
- **Mood and instruments:** A hollow celestial guardian descending on broken metallic wings. High glassy string harmonics over deep organ and low restrained percussion, wordless choir texture suggesting missing divinity.
- **Structure:** Exploration/encounter loop; edit a stable passage and verify the join. No timed phase synchronization is implied.

```text
Original dark ambient horror instrumental game score. A hollow celestial guardian descending on broken metallic wings. High glassy string harmonics over deep organ and low restrained percussion, wordless choir texture suggesting missing divinity. Tempo: 80 BPM. Target length 3–4 minutes. Sparse arrangement, restrained bass, ample space for gameplay sound effects. Maintain a stable restrained intensity with slow internal variation; no dramatic intro, climax, final cadence, or fade-out. Leave a quiet stable passage suitable for editing into a seamless game loop. No lyrics, intelligible voices, lead singer, pop rhythm, trailer booms, or literal combat sound effects.
```

<a id="mus_boss_malthoron"></a>

#### MUS_BOSS_MALTHORON — Malthoron, the Hollow King

- [ ] **Use:** malthoron. **P2 · 3–4 minutes · 86 BPM · audition 2 candidates, retain 1.**
- **Filename:** `mus_boss_malthoron_v01.wav` (lossless production master; encode delivery separately).
- **Current:** Shared — Hellscape Assault.mp3 when an engaged boss has the large health bar.
- **Mood and instruments:** An armored king shedding his shell until only a consuming absence remains. Deep pipe organ, grinding contrabass, thin viola glissandi and dry iron percussion; heavy but spacious.
- **Structure:** Exploration/encounter loop; edit a stable passage and verify the join. No timed phase synchronization is implied.

```text
Original dark ambient horror instrumental game score. An armored king shedding his shell until only a consuming absence remains. Deep pipe organ, grinding contrabass, thin viola glissandi and dry iron percussion; heavy but spacious. Tempo: 86 BPM. Target length 3–4 minutes. Sparse arrangement, restrained bass, ample space for gameplay sound effects. Maintain a stable restrained intensity with slow internal variation; no dramatic intro, climax, final cadence, or fade-out. Leave a quiet stable passage suitable for editing into a seamless game loop. No lyrics, intelligible voices, lead singer, pop rhythm, trailer booms, or literal combat sound effects.
```

<a id="mus_boss_vethriss"></a>

#### MUS_BOSS_VETHRISS — Vethriss, the Veiled Lord

- [ ] **Use:** vethriss. **P2 · 3–4 minutes · 90 BPM · audition 2 candidates, retain 1.**
- **Filename:** `mus_boss_vethriss_v01.wav` (lossless production master; encode delivery separately).
- **Current:** Shared — Hellscape Assault.mp3 when an engaged boss has the large health bar.
- **Mood and instruments:** A veiled deceiver revealed as an immense serpent that remembers other monsters. Fragmented low-string motifs, unstable organ intervals, bowed brass and a restrained irregular pulse; dread and deceit without victory.
- **Structure:** Exploration/encounter loop; edit a stable passage and verify the join. No timed phase synchronization is implied.

```text
Original dark ambient horror instrumental game score. A veiled deceiver revealed as an immense serpent that remembers other monsters. Fragmented low-string motifs, unstable organ intervals, bowed brass and a restrained irregular pulse; dread and deceit without victory. Tempo: 90 BPM. Target length 3–4 minutes. Sparse arrangement, restrained bass, ample space for gameplay sound effects. Maintain a stable restrained intensity with slow internal variation; no dramatic intro, climax, final cadence, or fade-out. Leave a quiet stable passage suitable for editing into a seamless game loop. No lyrics, intelligible voices, lead singer, pop rhythm, trailer booms, or literal combat sound effects.
```

<a id="mus_boss_oathsworn"></a>

#### MUS_BOSS_OATHSWORN — The Oathsworn — Brokkar, Vandil and Sigrun

- [ ] **Use:** oathsworn. **P2 · 3–4 minutes · 84 BPM · audition 2 candidates, retain 1.**
- **Filename:** `mus_boss_oathsworn_v01.wav` (lossless production master; encode delivery separately).
- **Current:** Shared — Hellscape Assault.mp3 when an engaged boss has the large health bar.
- **Mood and instruments:** Three reanimated northern champions attacking as a single encounter. Three interlocking low-string fragments, sparse iron percussion and muted horn, angular and tense with clear gaps.
- **Structure:** Exploration/encounter loop; edit a stable passage and verify the join. No timed phase synchronization is implied.

```text
Original dark ambient horror instrumental game score. Three reanimated northern champions attacking as a single encounter. Three interlocking low-string fragments, sparse iron percussion and muted horn, angular and tense with clear gaps. Tempo: 84 BPM. Target length 3–4 minutes. Sparse arrangement, restrained bass, ample space for gameplay sound effects. Maintain a stable restrained intensity with slow internal variation; no dramatic intro, climax, final cadence, or fade-out. Leave a quiet stable passage suitable for editing into a seamless game loop. No lyrics, intelligible voices, lead singer, pop rhythm, trailer booms, or literal combat sound effects.
```

<a id="mus_boss_hoarfang"></a>

#### MUS_BOSS_HOARFANG — Hoarfang, the Spring’s Keeper

- [ ] **Use:** hoarfang. **P2 · 3–4 minutes · 78 BPM · audition 2 candidates, retain 1.**
- **Filename:** `mus_boss_hoarfang_v01.wav` (lossless production master; encode delivery separately).
- **Current:** Shared — Hellscape Assault.mp3 when an engaged boss has the large health bar.
- **Mood and instruments:** A savage guardian within a frozen cavern; predatory cold and heavy breath. Low strings, thin crystalline overtones and soft uneven bass-drum pulses, quick restrained tremolo gestures.
- **Structure:** Exploration/encounter loop; edit a stable passage and verify the join. No timed phase synchronization is implied.

```text
Original dark ambient horror instrumental game score. A savage guardian within a frozen cavern; predatory cold and heavy breath. Low strings, thin crystalline overtones and soft uneven bass-drum pulses, quick restrained tremolo gestures. Tempo: 78 BPM. Target length 3–4 minutes. Sparse arrangement, restrained bass, ample space for gameplay sound effects. Maintain a stable restrained intensity with slow internal variation; no dramatic intro, climax, final cadence, or fade-out. Leave a quiet stable passage suitable for editing into a seamless game loop. No lyrics, intelligible voices, lead singer, pop rhythm, trailer booms, or literal combat sound effects.
```

<a id="mus_boss_choirmaster"></a>

#### MUS_BOSS_CHOIRMASTER — Vorthel, the High Choirmaster

- [ ] **Use:** choirmaster. **P2 · 3–4 minutes · 80 BPM · audition 2 candidates, retain 1.**
- **Filename:** `mus_boss_choirmaster_v01.wav` (lossless production master; encode delivery separately).
- **Current:** Shared — Hellscape Assault.mp3 when an engaged boss has the large health bar.
- **Mood and instruments:** A corrupted choirmaster conducting sacrifice and falling shadow magic. Detuned organ, short dissonant wordless throat clusters, low strings and sparse ritual percussion.
- **Structure:** Exploration/encounter loop; edit a stable passage and verify the join. No timed phase synchronization is implied.

```text
Original dark ambient horror instrumental game score. A corrupted choirmaster conducting sacrifice and falling shadow magic. Detuned organ, short dissonant wordless throat clusters, low strings and sparse ritual percussion. Tempo: 80 BPM. Target length 3–4 minutes. Sparse arrangement, restrained bass, ample space for gameplay sound effects. Maintain a stable restrained intensity with slow internal variation; no dramatic intro, climax, final cadence, or fade-out. Leave a quiet stable passage suitable for editing into a seamless game loop. No lyrics, intelligible voices, lead singer, pop rhythm, trailer booms, or literal combat sound effects.
```

<a id="mus_boss_choir_herald"></a>

#### MUS_BOSS_CHOIR_HERALD — Choir Herald

- [ ] **Use:** choir_herald. **P2 · 3–4 minutes · 72 BPM · audition 2 candidates, retain 1.**
- **Filename:** `mus_boss_choir_herald_v01.wav` (lossless production master; encode delivery separately).
- **Current:** Shared — Hellscape Assault.mp3 when an engaged boss has the large health bar.
- **Mood and instruments:** A lesser emissary announcing the Silent Choir through cold empty reeds. Bass flute, thin organ and small dissonant string swells with a restrained ritual pulse.
- **Structure:** Exploration/encounter loop; edit a stable passage and verify the join. No timed phase synchronization is implied.

```text
Original dark ambient horror instrumental game score. A lesser emissary announcing the Silent Choir through cold empty reeds. Bass flute, thin organ and small dissonant string swells with a restrained ritual pulse. Tempo: 72 BPM. Target length 3–4 minutes. Sparse arrangement, restrained bass, ample space for gameplay sound effects. Maintain a stable restrained intensity with slow internal variation; no dramatic intro, climax, final cadence, or fade-out. Leave a quiet stable passage suitable for editing into a seamless game loop. No lyrics, intelligible voices, lead singer, pop rhythm, trailer booms, or literal combat sound effects.
```

<a id="mus_boss_brood_mother"></a>

#### MUS_BOSS_BROOD_MOTHER — The Brood Mother

- [ ] **Use:** brood_mother. **P2 · 3–4 minutes · 78 BPM · audition 2 candidates, retain 1.**
- **Filename:** `mus_boss_brood_mother_v01.wav` (lossless production master; encode delivery separately).
- **Current:** Shared — Hellscape Assault.mp3 when an engaged boss has the large health bar.
- **Mood and instruments:** A spawning marsh predator surrounded by living pools; proliferating organic panic. Low bassoon, granular bowed strings and soft irregular skin-drum pulses, compressed tense phrases.
- **Structure:** Exploration/encounter loop; edit a stable passage and verify the join. No timed phase synchronization is implied.

```text
Original dark ambient horror instrumental game score. A spawning marsh predator surrounded by living pools; proliferating organic panic. Low bassoon, granular bowed strings and soft irregular skin-drum pulses, compressed tense phrases. Tempo: 78 BPM. Target length 3–4 minutes. Sparse arrangement, restrained bass, ample space for gameplay sound effects. Maintain a stable restrained intensity with slow internal variation; no dramatic intro, climax, final cadence, or fade-out. Leave a quiet stable passage suitable for editing into a seamless game loop. No lyrics, intelligible voices, lead singer, pop rhythm, trailer booms, or literal combat sound effects.
```

<a id="mus_boss_chained_sovereign"></a>

#### MUS_BOSS_CHAINED_SOVEREIGN — The Chained Sovereign

- [ ] **Use:** chained_sovereign. **P2 · 3–4 minutes · 74 BPM · audition 2 candidates, retain 1.**
- **Filename:** `mus_boss_chained_sovereign_v01.wav` (lossless production master; encode delivery separately).
- **Current:** Shared — Hellscape Assault.mp3 when an engaged boss has the large health bar.
- **Mood and instruments:** An imprisoned ancient ruler rising inside a sealed tomb. Deep bowed bass, mournful low horn and isolated dull metal notes, a slow stern motif pressing forward.
- **Structure:** Exploration/encounter loop; edit a stable passage and verify the join. No timed phase synchronization is implied.

```text
Original dark ambient horror instrumental game score. An imprisoned ancient ruler rising inside a sealed tomb. Deep bowed bass, mournful low horn and isolated dull metal notes, a slow stern motif pressing forward. Tempo: 74 BPM. Target length 3–4 minutes. Sparse arrangement, restrained bass, ample space for gameplay sound effects. Maintain a stable restrained intensity with slow internal variation; no dramatic intro, climax, final cadence, or fade-out. Leave a quiet stable passage suitable for editing into a seamless game loop. No lyrics, intelligible voices, lead singer, pop rhythm, trailer booms, or literal combat sound effects.
```

<a id="mus_boss_gravecaller"></a>

#### MUS_BOSS_GRAVECALLER — Gravecaller Hesh

- [ ] **Use:** gravecaller. **P2 · 3–4 minutes · 72 BPM · audition 2 candidates, retain 1.**
- **Filename:** `mus_boss_gravecaller_v01.wav` (lossless production master; encode delivery separately).
- **Current:** Shared — Hellscape Assault.mp3 when an engaged boss has the large health bar.
- **Mood and instruments:** A grave cultist raising the dead in sunken crypt hollows. Dry plucked low strings, bass clarinet and hollow organ pulses; intimate ritual malice.
- **Structure:** Exploration/encounter loop; edit a stable passage and verify the join. No timed phase synchronization is implied.

```text
Original dark ambient horror instrumental game score. A grave cultist raising the dead in sunken crypt hollows. Dry plucked low strings, bass clarinet and hollow organ pulses; intimate ritual malice. Tempo: 72 BPM. Target length 3–4 minutes. Sparse arrangement, restrained bass, ample space for gameplay sound effects. Maintain a stable restrained intensity with slow internal variation; no dramatic intro, climax, final cadence, or fade-out. Leave a quiet stable passage suitable for editing into a seamless game loop. No lyrics, intelligible voices, lead singer, pop rhythm, trailer booms, or literal combat sound effects.
```

<a id="mus_boss_morthul"></a>

#### MUS_BOSS_MORTHUL — Morthul, the Grave-Warden

- [ ] **Use:** morthul. **P2 · 3–4 minutes · 76 BPM · audition 2 candidates, retain 1.**
- **Filename:** `mus_boss_morthul_v01.wav` (lossless production master; encode delivery separately).
- **Current:** Shared — Hellscape Assault.mp3 when an engaged boss has the large health bar.
- **Mood and instruments:** An undead warden of the deepest vigil chamber. Slow low strings, heavy organ pedal and muted iron percussion, implacable narrow descending phrases.
- **Structure:** Exploration/encounter loop; edit a stable passage and verify the join. No timed phase synchronization is implied.

```text
Original dark ambient horror instrumental game score. An undead warden of the deepest vigil chamber. Slow low strings, heavy organ pedal and muted iron percussion, implacable narrow descending phrases. Tempo: 76 BPM. Target length 3–4 minutes. Sparse arrangement, restrained bass, ample space for gameplay sound effects. Maintain a stable restrained intensity with slow internal variation; no dramatic intro, climax, final cadence, or fade-out. Leave a quiet stable passage suitable for editing into a seamless game loop. No lyrics, intelligible voices, lead singer, pop rhythm, trailer booms, or literal combat sound effects.
```

<a id="mus_boss_vicar"></a>

#### MUS_BOSS_VICAR — Vicar Thessaly

- [ ] **Use:** vicar. **P2 · 3–4 minutes · 74 BPM · audition 2 candidates, retain 1.**
- **Filename:** `mus_boss_vicar_v01.wav` (lossless production master; encode delivery separately).
- **Current:** Shared — Hellscape Assault.mp3 when an engaged boss has the large health bar.
- **Mood and instruments:** A corrupted chapel vicar sustaining followers through forbidden devotion. Fragile organ chords, dissonant wordless choir haze and restrained bowed bass, devotional phrases breaking apart.
- **Structure:** Exploration/encounter loop; edit a stable passage and verify the join. No timed phase synchronization is implied.

```text
Original dark ambient horror instrumental game score. A corrupted chapel vicar sustaining followers through forbidden devotion. Fragile organ chords, dissonant wordless choir haze and restrained bowed bass, devotional phrases breaking apart. Tempo: 74 BPM. Target length 3–4 minutes. Sparse arrangement, restrained bass, ample space for gameplay sound effects. Maintain a stable restrained intensity with slow internal variation; no dramatic intro, climax, final cadence, or fade-out. Leave a quiet stable passage suitable for editing into a seamless game loop. No lyrics, intelligible voices, lead singer, pop rhythm, trailer booms, or literal combat sound effects.
```

<a id="mus_boss_vellath"></a>

#### MUS_BOSS_VELLATH — Vellath, the Unshepherd

- [ ] **Use:** vellath. **P2 · 3–4 minutes · 82 BPM · audition 2 candidates, retain 1.**
- **Filename:** `mus_boss_vellath_v01.wav` (lossless production master; encode delivery separately).
- **Current:** Shared — Hellscape Assault.mp3 when an engaged boss has the large health bar.
- **Mood and instruments:** The demonic presence at a monastery sanctum. Rough low strings, deep reed organ and irregular dark percussion, ritual authority becoming predatory.
- **Structure:** Exploration/encounter loop; edit a stable passage and verify the join. No timed phase synchronization is implied.

```text
Original dark ambient horror instrumental game score. The demonic presence at a monastery sanctum. Rough low strings, deep reed organ and irregular dark percussion, ritual authority becoming predatory. Tempo: 82 BPM. Target length 3–4 minutes. Sparse arrangement, restrained bass, ample space for gameplay sound effects. Maintain a stable restrained intensity with slow internal variation; no dramatic intro, climax, final cadence, or fade-out. Leave a quiet stable passage suitable for editing into a seamless game loop. No lyrics, intelligible voices, lead singer, pop rhythm, trailer booms, or literal combat sound effects.
```

<a id="mus_boss_bone_dragon"></a>

#### MUS_BOSS_BONE_DRAGON — Bone Dragon

- [ ] **Use:** bone_dragon. **P2 · 3–4 minutes · 82 BPM · audition 2 candidates, retain 1.**
- **Filename:** `mus_boss_bone_dragon_v01.wav` (lossless production master; encode delivery separately).
- **Current:** Shared — Hellscape Assault.mp3 when an engaged boss has the large health bar.
- **Mood and instruments:** A colossal skeletal dragon in a confined ruin. Dry bowed strings, hollow low brass and sharp sparse tuned-bone-like percussion, huge movement expressed without overwhelming bass.
- **Structure:** Exploration/encounter loop; edit a stable passage and verify the join. No timed phase synchronization is implied.

```text
Original dark ambient horror instrumental game score. A colossal skeletal dragon in a confined ruin. Dry bowed strings, hollow low brass and sharp sparse tuned-bone-like percussion, huge movement expressed without overwhelming bass. Tempo: 82 BPM. Target length 3–4 minutes. Sparse arrangement, restrained bass, ample space for gameplay sound effects. Maintain a stable restrained intensity with slow internal variation; no dramatic intro, climax, final cadence, or fade-out. Leave a quiet stable passage suitable for editing into a seamless game loop. No lyrics, intelligible voices, lead singer, pop rhythm, trailer booms, or literal combat sound effects.
```

<a id="mus_boss_flesh_engine"></a>

#### MUS_BOSS_FLESH_ENGINE — Flesh Engine Abomination

- [ ] **Use:** flesh_engine. **P2 · 3–4 minutes · 78 BPM · audition 2 candidates, retain 1.**
- **Filename:** `mus_boss_flesh_engine_v01.wav` (lossless production master; encode delivery separately).
- **Current:** Shared — Hellscape Assault.mp3 when an engaged boss has the large health bar.
- **Mood and instruments:** A huge stitched abomination throwing bodies as weapons. Low contrabass friction, detuned bassoon and uneven muted drum pulses, mechanical repetition made sickly and organic.
- **Structure:** Exploration/encounter loop; edit a stable passage and verify the join. No timed phase synchronization is implied.

```text
Original dark ambient horror instrumental game score. A huge stitched abomination throwing bodies as weapons. Low contrabass friction, detuned bassoon and uneven muted drum pulses, mechanical repetition made sickly and organic. Tempo: 78 BPM. Target length 3–4 minutes. Sparse arrangement, restrained bass, ample space for gameplay sound effects. Maintain a stable restrained intensity with slow internal variation; no dramatic intro, climax, final cadence, or fade-out. Leave a quiet stable passage suitable for editing into a seamless game loop. No lyrics, intelligible voices, lead singer, pop rhythm, trailer booms, or literal combat sound effects.
```

<a id="mus_boss_infernal_warlord"></a>

#### MUS_BOSS_INFERNAL_WARLORD — Infernal Warlord

- [ ] **Use:** infernal_warlord. **P2 · 3–4 minutes · 88 BPM · audition 2 candidates, retain 1.**
- **Filename:** `mus_boss_infernal_warlord_v01.wav` (lossless production master; encode delivery separately).
- **Current:** Shared — Hellscape Assault.mp3 when an engaged boss has the large health bar.
- **Mood and instruments:** A brutal demon commander amid infernal infighting. Low trombone, rough cello and sparse iron percussion, disciplined threatening phrases and restrained martial motion.
- **Structure:** Exploration/encounter loop; edit a stable passage and verify the join. No timed phase synchronization is implied.

```text
Original dark ambient horror instrumental game score. A brutal demon commander amid infernal infighting. Low trombone, rough cello and sparse iron percussion, disciplined threatening phrases and restrained martial motion. Tempo: 88 BPM. Target length 3–4 minutes. Sparse arrangement, restrained bass, ample space for gameplay sound effects. Maintain a stable restrained intensity with slow internal variation; no dramatic intro, climax, final cadence, or fade-out. Leave a quiet stable passage suitable for editing into a seamless game loop. No lyrics, intelligible voices, lead singer, pop rhythm, trailer booms, or literal combat sound effects.
```

<a id="mus_boss_cathedral_knight_guardian"></a>

#### MUS_BOSS_CATHEDRAL_KNIGHT_GUARDIAN — Oathbound Hollow Knight

- [ ] **Use:** cathedral_knight_guardian. **P2 · 3–4 minutes · 78 BPM · audition 2 candidates, retain 1.**
- **Filename:** `mus_boss_cathedral_knight_guardian_v01.wav` (lossless production master; encode delivery separately).
- **Current:** Shared — memory-area exploration music; guardians are elite profiles, not separate boss definitions.
- **Mood and instruments:** A remembered bastion guardian executing paired sweeps. Muted low horn, deep organ and two-note bowed-string exchanges, watchful disciplined dread.
- **Structure:** Exploration/encounter loop; edit a stable passage and verify the join. No timed phase synchronization is implied.

```text
Original dark ambient horror instrumental game score. A remembered bastion guardian executing paired sweeps. Muted low horn, deep organ and two-note bowed-string exchanges, watchful disciplined dread. Tempo: 78 BPM. Target length 3–4 minutes. Sparse arrangement, restrained bass, ample space for gameplay sound effects. Maintain a stable restrained intensity with slow internal variation; no dramatic intro, climax, final cadence, or fade-out. Leave a quiet stable passage suitable for editing into a seamless game loop. No lyrics, intelligible voices, lead singer, pop rhythm, trailer booms, or literal combat sound effects.
```

<a id="mus_boss_cathedral_priest_guardian"></a>

#### MUS_BOSS_CATHEDRAL_PRIEST_GUARDIAN — Echoing Choir Priest

- [ ] **Use:** cathedral_priest_guardian. **P2 · 3–4 minutes · 76 BPM · audition 2 candidates, retain 1.**
- **Filename:** `mus_boss_cathedral_priest_guardian_v01.wav` (lossless production master; encode delivery separately).
- **Current:** Shared — memory-area exploration music; guardians are elite profiles, not separate boss definitions.
- **Mood and instruments:** A memory guardian healing allies and unleashing a quieting chorus. Thin dissonant organ, whispered wordless choral texture and low repeating strings, ritual tension with long gaps.
- **Structure:** Exploration/encounter loop; edit a stable passage and verify the join. No timed phase synchronization is implied.

```text
Original dark ambient horror instrumental game score. A memory guardian healing allies and unleashing a quieting chorus. Thin dissonant organ, whispered wordless choral texture and low repeating strings, ritual tension with long gaps. Tempo: 76 BPM. Target length 3–4 minutes. Sparse arrangement, restrained bass, ample space for gameplay sound effects. Maintain a stable restrained intensity with slow internal variation; no dramatic intro, climax, final cadence, or fade-out. Leave a quiet stable passage suitable for editing into a seamless game loop. No lyrics, intelligible voices, lead singer, pop rhythm, trailer booms, or literal combat sound effects.
```

### Menus and story

<a id="mus_title"></a>

#### MUS_TITLE — Title screen

- [ ] **Use:** Main menu. **P2 · 3 minutes · 52 BPM · audition 2 candidates, retain 1.**
- **Filename:** `mus_title_v01.wav` (lossless production master; encode delivery separately).
- **Current:** Recorded — Black Rune Oath.mp3.
- **Mood and instruments:** An original dark-fantasy saga at the edge of extinction. Low cello, broken pipe organ, sparse felt piano and thin bowed metal; one memorable descending two-note motif with immense empty space.
- **Structure:** Exploration/encounter loop; edit a stable passage and verify the join. No timed phase synchronization is implied.

```text
Original dark ambient horror instrumental game score. An original dark-fantasy saga at the edge of extinction. Low cello, broken pipe organ, sparse felt piano and thin bowed metal; one memorable descending two-note motif with immense empty space. Tempo: 52 BPM. Target length 3 minutes. Sparse arrangement, restrained bass, ample space for gameplay sound effects. Maintain a stable restrained intensity with slow internal variation; no dramatic intro, climax, final cadence, or fade-out. Leave a quiet stable passage suitable for editing into a seamless game loop. No lyrics, intelligible voices, lead singer, pop rhythm, trailer booms, or literal combat sound effects.
```

<a id="mus_character"></a>

#### MUS_CHARACTER — Character selection

- [ ] **Use:** Five-class campfire selection. **P2 · 3 minutes · 56 BPM · audition 2 candidates, retain 1.**
- **Filename:** `mus_character_v01.wav` (lossless production master; encode delivery separately).
- **Current:** Shared — Black Rune Oath.mp3.
- **Mood and instruments:** Five weary travelers waiting beside a dying fire. Muted plucked lyre, warm low cello and quiet harmonium, small unresolved melodic fragments suggesting different lives but one dangerous road.
- **Structure:** Exploration/encounter loop; edit a stable passage and verify the join. No timed phase synchronization is implied.

```text
Original dark ambient horror instrumental game score. Five weary travelers waiting beside a dying fire. Muted plucked lyre, warm low cello and quiet harmonium, small unresolved melodic fragments suggesting different lives but one dangerous road. Tempo: 56 BPM. Target length 3 minutes. Sparse arrangement, restrained bass, ample space for gameplay sound effects. Maintain a stable restrained intensity with slow internal variation; no dramatic intro, climax, final cadence, or fade-out. Leave a quiet stable passage suitable for editing into a seamless game loop. No lyrics, intelligible voices, lead singer, pop rhythm, trailer booms, or literal combat sound effects.
```

<a id="mus_act_1"></a>

#### MUS_ACT_1 — Act 1 arrival stinger

- [ ] **Use:** Act 1 title/arrival. **P2 · 8–12 seconds · free time · audition 2 candidates, retain 1.**
- **Filename:** `mus_act_1_v01.wav` (lossless production master; encode delivery separately).
- **Current:** Missing — no dedicated act-transition recording.
- **Mood and instruments:** A first step beyond northern refuge: cold strings and one low horn fragment with a fragile warm final interval.
- **Structure:** Finite cue; preserve the ending and full decay. Do not loop.

```text
Original dark ambient horror instrumental game score. A first step beyond northern refuge: cold strings and one low horn fragment with a fragile warm final interval. Tempo: free time. Target length 8–12 seconds. Sparse arrangement, restrained bass, ample space for gameplay sound effects. One compact musical arc with a clean intentional ending and a fully decaying tail; no verse/chorus structure and no loop requirement. No lyrics, intelligible voices, lead singer, pop rhythm, trailer booms, or literal combat sound effects.
```

<a id="mus_act_2"></a>

#### MUS_ACT_2 — Act 2 arrival stinger

- [ ] **Use:** Act 2 title/arrival. **P2 · 8–12 seconds · free time · audition 2 candidates, retain 1.**
- **Filename:** `mus_act_2_v01.wav` (lossless production master; encode delivery separately).
- **Current:** Missing — no dedicated act-transition recording.
- **Mood and instruments:** Arrival at a drowned marsh: low reeds and an organ suspension replacing a fading cold-string fragment.
- **Structure:** Finite cue; preserve the ending and full decay. Do not loop.

```text
Original dark ambient horror instrumental game score. Arrival at a drowned marsh: low reeds and an organ suspension replacing a fading cold-string fragment. Tempo: free time. Target length 8–12 seconds. Sparse arrangement, restrained bass, ample space for gameplay sound effects. One compact musical arc with a clean intentional ending and a fully decaying tail; no verse/chorus structure and no loop requirement. No lyrics, intelligible voices, lead singer, pop rhythm, trailer booms, or literal combat sound effects.
```

<a id="mus_act_3"></a>

#### MUS_ACT_3 — Act 3 arrival stinger

- [ ] **Use:** Act 3 title/arrival. **P2 · 8–12 seconds · free time · audition 2 candidates, retain 1.**
- **Filename:** `mus_act_3_v01.wav` (lossless production master; encode delivery separately).
- **Current:** Missing — no dedicated act-transition recording.
- **Mood and instruments:** Discovery of a buried desert city: sparse oud and dull gold-toned dulcimer emerging from a dark low-string drone.
- **Structure:** Finite cue; preserve the ending and full decay. Do not loop.

```text
Original dark ambient horror instrumental game score. Discovery of a buried desert city: sparse oud and dull gold-toned dulcimer emerging from a dark low-string drone. Tempo: free time. Target length 8–12 seconds. Sparse arrangement, restrained bass, ample space for gameplay sound effects. One compact musical arc with a clean intentional ending and a fully decaying tail; no verse/chorus structure and no loop requirement. No lyrics, intelligible voices, lead singer, pop rhythm, trailer booms, or literal combat sound effects.
```

<a id="mus_act_4"></a>

#### MUS_ACT_4 — Act 4 arrival stinger

- [ ] **Use:** Act 4 title/arrival. **P2 · 8–12 seconds · free time · audition 2 candidates, retain 1.**
- **Filename:** `mus_act_4_v01.wav` (lossless production master; encode delivery separately).
- **Current:** Missing — no dedicated act-transition recording.
- **Mood and instruments:** Arrival at a floating cathedral: a broken organ chord and glassy high strings opening into vast silence.
- **Structure:** Finite cue; preserve the ending and full decay. Do not loop.

```text
Original dark ambient horror instrumental game score. Arrival at a floating cathedral: a broken organ chord and glassy high strings opening into vast silence. Tempo: free time. Target length 8–12 seconds. Sparse arrangement, restrained bass, ample space for gameplay sound effects. One compact musical arc with a clean intentional ending and a fully decaying tail; no verse/chorus structure and no loop requirement. No lyrics, intelligible voices, lead singer, pop rhythm, trailer booms, or literal combat sound effects.
```

<a id="mus_act_5"></a>

#### MUS_ACT_5 — Act 5 arrival stinger

- [ ] **Use:** Act 5 title/arrival. **P2 · 8–12 seconds · free time · audition 2 candidates, retain 1.**
- **Filename:** `mus_act_5_v01.wav` (lossless production master; encode delivery separately).
- **Current:** Missing — no dedicated act-transition recording.
- **Mood and instruments:** Crossing the breach into Hell: a restrained low brass swell and one dry iron accent fading into an unresolved string chord.
- **Structure:** Finite cue; preserve the ending and full decay. Do not loop.

```text
Original dark ambient horror instrumental game score. Crossing the breach into Hell: a restrained low brass swell and one dry iron accent fading into an unresolved string chord. Tempo: free time. Target length 8–12 seconds. Sparse arrangement, restrained bass, ample space for gameplay sound effects. One compact musical arc with a clean intentional ending and a fully decaying tail; no verse/chorus structure and no loop requirement. No lyrics, intelligible voices, lead singer, pop rhythm, trailer booms, or literal combat sound effects.
```

<a id="mus_opening_awakening"></a>

#### MUS_OPENING_AWAKENING — Opening: the guard awakens

- [ ] **Use:** frosthaven_approach story beat. **P2 · 10–15 seconds · free time · audition 2 candidates, retain 1.**
- **Filename:** `mus_opening_awakening_v01.wav` (lossless production master; encode delivery separately).
- **Current:** Shared — road/zone music; bespoke story accent missing.
- **Mood and instruments:** A fallen guard awakens beside a dangerous shard. One strained high string harmonic slowly bends over a low bowed-metal resonance, a small unsettling reveal.
- **Structure:** Finite cue; preserve the ending and full decay. Do not loop.

```text
Original dark ambient horror instrumental game score. A fallen guard awakens beside a dangerous shard. One strained high string harmonic slowly bends over a low bowed-metal resonance, a small unsettling reveal. Tempo: free time. Target length 10–15 seconds. Sparse arrangement, restrained bass, ample space for gameplay sound effects. One compact musical arc with a clean intentional ending and a fully decaying tail; no verse/chorus structure and no loop requirement. No lyrics, intelligible voices, lead singer, pop rhythm, trailer booms, or literal combat sound effects.
```

<a id="mus_opening_rescue"></a>

#### MUS_OPENING_RESCUE — Opening: caravan rescue

- [ ] **Use:** frosthaven_approach story beat. **P2 · 20–30 seconds · free time · audition 2 candidates, retain 1.**
- **Filename:** `mus_opening_rescue_v01.wav` (lossless production master; encode delivery separately).
- **Current:** Shared — road/zone music; bespoke story accent missing.
- **Mood and instruments:** Rescuing stranded travelers under immediate threat. Sparse low cello pulse and a hesitant woodwind fragment, fear briefly softened by human connection.
- **Structure:** Finite cue; preserve the ending and full decay. Do not loop.

```text
Original dark ambient horror instrumental game score. Rescuing stranded travelers under immediate threat. Sparse low cello pulse and a hesitant woodwind fragment, fear briefly softened by human connection. Tempo: free time. Target length 20–30 seconds. Sparse arrangement, restrained bass, ample space for gameplay sound effects. One compact musical arc with a clean intentional ending and a fully decaying tail; no verse/chorus structure and no loop requirement. No lyrics, intelligible voices, lead singer, pop rhythm, trailer booms, or literal combat sound effects.
```

<a id="mus_opening_gate"></a>

#### MUS_OPENING_GATE — Opening: gate skirmish

- [ ] **Use:** frosthaven_approach story beat. **P2 · 30–45 seconds · 76 BPM · audition 2 candidates, retain 1.**
- **Filename:** `mus_opening_gate_v01.wav` (lossless production master; encode delivery separately).
- **Current:** Shared — road/zone music; bespoke story accent missing.
- **Mood and instruments:** A last defended gate under attack before the captain encounter. Short tense low-string figures and very restrained iron percussion, urgent but small in scale.
- **Structure:** Finite cue; preserve the ending and full decay. Do not loop.

```text
Original dark ambient horror instrumental game score. A last defended gate under attack before the captain encounter. Short tense low-string figures and very restrained iron percussion, urgent but small in scale. Tempo: 76 BPM. Target length 30–45 seconds. Sparse arrangement, restrained bass, ample space for gameplay sound effects. One compact musical arc with a clean intentional ending and a fully decaying tail; no verse/chorus structure and no loop requirement. No lyrics, intelligible voices, lead singer, pop rhythm, trailer booms, or literal combat sound effects.
```

<a id="mus_opening_hearth"></a>

#### MUS_OPENING_HEARTH — Opening: arrival at Seraneth’s hearth

- [ ] **Use:** frosthaven_approach story beat. **P2 · 15–20 seconds · free time · audition 2 candidates, retain 1.**
- **Filename:** `mus_opening_hearth_v01.wav` (lossless production master; encode delivery separately).
- **Current:** Shared — road/zone music; bespoke story accent missing.
- **Mood and instruments:** Survivors finally reach a sheltered hearth. Warm low cello and three soft plucked notes resolve only partially, exhausted relief with danger still outside.
- **Structure:** Finite cue; preserve the ending and full decay. Do not loop.

```text
Original dark ambient horror instrumental game score. Survivors finally reach a sheltered hearth. Warm low cello and three soft plucked notes resolve only partially, exhausted relief with danger still outside. Tempo: free time. Target length 15–20 seconds. Sparse arrangement, restrained bass, ample space for gameplay sound effects. One compact musical arc with a clean intentional ending and a fully decaying tail; no verse/chorus structure and no loop requirement. No lyrics, intelligible voices, lead singer, pop rhythm, trailer booms, or literal combat sound effects.
```

<a id="mus_final_choice"></a>

#### MUS_FINAL_CHOICE — The final choice

- [ ] **Use:** Choice over the last Sunderstone core. **P2 · 2–3 minutes · free time · audition 2 candidates, retain 1.**
- **Filename:** `mus_final_choice_v01.wav` (lossless production master; encode delivery separately).
- **Current:** Missing — dedicated choice-screen track.
- **Mood and instruments:** A world-changing decision held in silence. One deep organ pedal, sparse high glass harmonics and a fragile unresolved cello interval; patient moral uncertainty without a pulse.
- **Structure:** Exploration/encounter loop; edit a stable passage and verify the join. No timed phase synchronization is implied.

```text
Original dark ambient horror instrumental game score. A world-changing decision held in silence. One deep organ pedal, sparse high glass harmonics and a fragile unresolved cello interval; patient moral uncertainty without a pulse. Tempo: free time. Target length 2–3 minutes. Sparse arrangement, restrained bass, ample space for gameplay sound effects. Maintain a stable restrained intensity with slow internal variation; no dramatic intro, climax, final cadence, or fade-out. Leave a quiet stable passage suitable for editing into a seamless game loop. No lyrics, intelligible voices, lead singer, pop rhythm, trailer booms, or literal combat sound effects.
```

<a id="mus_end_destroy"></a>

#### MUS_END_DESTROY — Destroy the Core

- [ ] **Use:** Ending destroy. **P2 · 60–90 seconds · 48 BPM, loose and restrained · audition 2 candidates, retain 1.**
- **Filename:** `mus_end_destroy_v01.wav` (lossless production master; encode delivery separately).
- **Current:** Missing — dedicated ending recording.
- **Mood and instruments:** Freedom bought by permanently destabilizing the barrier to Hell. Fragile plucked strings and a low cello move from a cracked dissonant chord to an open unresolved interval; release without safety.
- **Structure:** Finite cue; preserve the ending and full decay. Do not loop.

```text
Original dark ambient horror instrumental game score. Freedom bought by permanently destabilizing the barrier to Hell. Fragile plucked strings and a low cello move from a cracked dissonant chord to an open unresolved interval; release without safety. Tempo: 48 BPM, loose and restrained. Target length 60–90 seconds. Sparse arrangement, restrained bass, ample space for gameplay sound effects. One compact musical arc with a clean intentional ending and a fully decaying tail; no verse/chorus structure and no loop requirement. No lyrics, intelligible voices, lead singer, pop rhythm, trailer booms, or literal combat sound effects.
```

<a id="mus_end_seal"></a>

#### MUS_END_SEAL — Seal It Away

- [ ] **Use:** Ending seal. **P2 · 60–90 seconds · 48 BPM, loose and restrained · audition 2 candidates, retain 1.**
- **Filename:** `mus_end_seal_v01.wav` (lossless production master; encode delivery separately).
- **Current:** Missing — dedicated ending recording.
- **Mood and instruments:** A terrible power hidden while future guardians may be corrupted. Slow muted organ and repeated low piano notes suggest patient containment; end with a question that almost resolves.
- **Structure:** Finite cue; preserve the ending and full decay. Do not loop.

```text
Original dark ambient horror instrumental game score. A terrible power hidden while future guardians may be corrupted. Slow muted organ and repeated low piano notes suggest patient containment; end with a question that almost resolves. Tempo: 48 BPM, loose and restrained. Target length 60–90 seconds. Sparse arrangement, restrained bass, ample space for gameplay sound effects. One compact musical arc with a clean intentional ending and a fully decaying tail; no verse/chorus structure and no loop requirement. No lyrics, intelligible voices, lead singer, pop rhythm, trailer booms, or literal combat sound effects.
```

<a id="mus_end_give"></a>

#### MUS_END_GIVE — Give It to Seraneth

- [ ] **Use:** Ending give. **P2 · 60–90 seconds · 48 BPM, loose and restrained · audition 2 candidates, retain 1.**
- **Filename:** `mus_end_give_v01.wav` (lossless production master; encode delivery separately).
- **Current:** Missing — dedicated ending recording.
- **Mood and instruments:** The true Warden returns changed and takes the core. A warm cello motif and soft lyre are shadowed by a subtly detuned organ note; tender trust mixed with lingering suspicion.
- **Structure:** Finite cue; preserve the ending and full decay. Do not loop.

```text
Original dark ambient horror instrumental game score. The true Warden returns changed and takes the core. A warm cello motif and soft lyre are shadowed by a subtly detuned organ note; tender trust mixed with lingering suspicion. Tempo: 48 BPM, loose and restrained. Target length 60–90 seconds. Sparse arrangement, restrained bass, ample space for gameplay sound effects. One compact musical arc with a clean intentional ending and a fully decaying tail; no verse/chorus structure and no loop requirement. No lyrics, intelligible voices, lead singer, pop rhythm, trailer booms, or literal combat sound effects.
```

## Existing assets and coverage audit

### Recorded soundtrack inventory

| Runtime key | Existing filename | Coverage |
| --- | --- | --- |
| title | Black Rune Oath.mp3 | Current theme key; area index documents actual selection |
| frosthaven | Snowy Mountain Vigil.mp3 | Current theme key; area index documents actual selection |
| fallenNorth | White Breath, Iron Sky.mp3 | Current theme key; area index documents actual selection |
| marshTown | Dusk in the Empty Town.mp3 | Current theme key; area index documents actual selection |
| marsh | Ash Dune Cathedral.mp3 | Current theme key; area index documents actual selection |
| desertTown | Dusk in the Demonic Jungle.mp3 | Current theme key; area index documents actual selection |
| desert | Sombras del Infierno.mp3 | Current theme key; area index documents actual selection |
| infernalTown | Infernal Town at Dusk.mp3 | Registered, unassigned; Act IV has no town |
| cathedral | Infernal Silence.mp3 | Current theme key; area index documents actual selection |
| breach | Tour de Pierre Vieille.mp3 | Current theme key; area index documents actual selection |
| cinders | Ancient Tower.mp3 | Current theme key; area index documents actual selection |
| cavernsOfShadow | Caverns of Shadow.mp3 | Shared randomized exploration pool |
| cavernsHeart | Cavern's Heart.mp3 | Shared randomized exploration pool |
| caveEchoes | Cave Echoes.mp3 | Shared randomized exploration pool |
| boss | Hellscape Assault.mp3 | Shared engaged-boss override |

### Recorded effects inventory

- `assets/sound-effects/Dark Fantasy Game Mouse Click Sound.mp3`: current recorded UI activation.
- `assets/sound-effects/Player Dies In Dark Fantasy Game. Yelling Sound.mp3`: current recorded player death. Its approximately 6.7-second source is already gain/fade controlled; the shorter replacement brief is an optional new edit, not a description of that file.
- `assets/sound-effects/interactions/`: portalOpen, teleportTravel, questAccepted, questReady, questCompleted, questProgress, all WAV.
- `assets/sound-effects/skills/`: 26 texture names × 3 WAV takes = 78 files. Current recipes cover 107 skills plus basic attacks. These are credited CC0-derived edits; preserve their existing source records if retained.

### Validation results

| Check | Result |
| --- | --- |
| Named area prompts | 36 / 36 unique IDs; complete DATA.ZONES match |
| Skill mappings | 107 / 107, plus three basic-attack material modes |
| Active / passive split | 89 active; 18 passive; 7 conditional and 11 intentionally silent |
| Enemy coverage | 193 base entries + boss_portal + boss_decoy = 195 rows |
| Regional guardian profiles | cathedral_knight_guardian and cathedral_priest_guardian mapped separately |
| Companions | 8 kinds; four player transformations mapped in skills |
| Boss coverage | All 22 boss-flagged enemy IDs; Oathsworn grouped musically; two extra guardian themes |
| World-event definitions | 50 / 50 mapped to reusable event families |
| Hazards | 9 / 9: ice, bog, lava, quicksand, spore, scorch, blood, static, spring |
| Existing recorded music | 15 filenames accounted for; infernalTown marked unassigned |
| Existing material files | 26 textures / 78 WAV takes accounted for |
| Prompt/reference integrity | 258 effect entries and 73 music entries have prompts; all cue references resolve; every effect has at least one mapped consumer |

This is a code-and-file inventory plus an authored production brief. No audio was generated, listened to, installed, or assessed for artistic quality during this document task. Validation checks coverage and document consistency; it does not establish that a future Suno take will meet duration, timbre or loop requirements.

### Source basis

Current working-tree sources, including existing uncommitted work, were inspected read-only. No source-code, save, gameplay or runtime API changes are part of this delivery.

- [Zones, skills, base roster, regional profiles, hazards, story objects and events](../js/data.js)
- [Existing music selection, recordings, procedural one-shots and interaction sounds](../js/audio.js)
- [Exact skill/material assignments and passive policy](../js/skill_audio_catalog.js)
- [Audio phases, material variation, event lifetimes and limits](../js/skill_audio.js)
- [Player, companion and enemy playback hooks](../js/entities.js)
- [Opening, quest spawns, Oathsworn, rituals, travel, loot and death flow](../js/game.js)
- [Procedural and authored enemy placements, Choir Herald and memory guardians](../js/mapgen.js)
- [Main encounter overrides, phases, Portal to the Past and serpent decoys](../js/boss_encounters.js)
- [Cathedral enemy and guardian combat profiles](../js/enemy_skills.js)
- [Marsh-specific summons, attack elements and telegraphs](../js/act2_enemy_combat.js)
- [Interface and the three ending outcomes](../js/ui.js)
- [Existing recorded music usage notes](../assets/music/README.md)
- [Recorded bank provenance, lifecycle and audition workflow](../docs/SKILL_AUDIO.md)

Suno instructions were checked against its [Sounds documentation](https://help.suno.com/en/articles/10625537). The creative prompts, durations, take counts and mix direction in this catalog are project-specific production choices.
