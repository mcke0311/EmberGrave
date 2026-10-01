"""Compile explicitly authored equipment recipes and their inventory references.

The Three.js builders interpret these shape names; no random or ID-derived
geometry is used. This tool updates only the lightweight model catalogue.
"""
import json
import argparse
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
AUTH=ROOT/'assets/sprites_src/gameplay_art_authored/items/uniques'

# id | shape | finish | principal length | breadth | sculpted ornament
RECIPES='''
u_gen_0_0 dawn gold 1.04 .062 sun
u_gen_0_2 fork steel 1.08 .075 wedge
u_gen_0_4 saw black 1.01 .065 crown
u_gen_0_6 cleaver bronze .97 .095 globe
u_gen_0_8 crescent gold 1.06 .068 wings
u_gen_0_10 obsidian black 1.10 .061 feathers
u_gen_0_12 aurora gold 1.07 .058 star
u_gen_12_0 vow steel .73 .043 ribbons
u_gen_12_2 flame gold .76 .046 flame
u_gen_12_4 royal steel .78 .058 lion
u_gen_12_6 lock steel .75 .052 lock
u_gen_12_8 sun gold .77 .048 sun
u_gen_12_10 gilded black .80 .041 ring
u_gen_12_12 throne gold .81 .055 throne
u_widow dirk black .41 .026 veil
u_gen_2_0 fang bone .39 .042 jaw
u_gen_2_2 moon black .36 .052 moons
u_gen_2_4 coffin steel .38 .058 coffin
u_gen_2_6 segments steel .43 .043 chain
u_gen_2_8 serpent venom .42 .033 serpent
u_gen_2_10 thorn black .44 .040 thorns
u_gen_2_12 leaf bone .40 .039 ribs
u_gravebite jaw bone .57 .30 nails
u_kingsplit crown bronze .63 .32 crown
u_gen_1_1 hook blood .90 .34 pennant
u_gen_1_3 double black .91 .31 skull
u_gen_1_5 square steel .88 .33 skull
u_gen_1_7 fragment ash .92 .32 braces
u_gen_1_9 femur bone .94 .35 teeth
u_gen_1_11 cathedral blood .93 .32 chalice
u_gen_13_1 tusk bone .59 .28 jaw
u_gen_13_3 cleaver blood .60 .29 grin
u_gen_13_5 ribs bone .61 .27 skull
u_gen_13_7 wolf steel .58 .28 wolf
u_gen_13_9 dragon bone .62 .29 teeth
u_gen_13_11 antler bone .65 .30 antlers
u_gen_11_1 stone ash .86 .21 straps
u_gen_11_3 globe bronze .89 .19 continents
u_gen_11_5 bell-cage bronze .88 .17 cage
u_gen_11_7 anvil black .91 .23 crack
u_gen_11_9 skull-bell bone .92 .18 skull
u_gen_11_11 diving-bell bronze .90 .20 coral
u_gen_14_0 moon-lantern bronze .53 .11 moon
u_gen_14_2 handbell bronze .54 .115 clapper
u_gen_14_4 coffin steel .55 .12 flanges
u_gen_14_6 cross gold .56 .13 cross
u_gen_14_8 star steel .57 .14 rays
u_gen_14_10 chalice black .58 .12 coins
u_gen_14_12 triple-bell gold .59 .13 bells
u_gen_15_1 comet steel 1.19 .071 fins
u_gen_15_3 zigzag storm 1.17 .075 coil
u_gen_15_5 wing gold 1.21 .072 wings
u_gen_15_7 trident storm 1.20 .085 prongs
u_gen_15_9 ribbon bone 1.23 .062 spiral
u_gen_15_11 feather sky 1.22 .055 feathers
u_gen_4_0 vortex storm 1.04 .14 spiral
u_gen_4_2 heart blood 1.02 .13 prongs
u_gen_4_4 lantern frost 1.05 .12 shield
u_gen_4_6 crown bronze 1.06 .14 lightning
u_gen_4_8 veil ash 1.03 .13 veil
u_gen_4_10 ice frost 1.07 .16 shards
u_gen_4_12 spire gold 1.09 .14 branches
u_gen_5_1 finger bone .42 .040 joints
u_gen_5_3 mouth steel .44 .047 beads
u_gen_5_5 tomb bone .45 .050 ribs
u_gen_5_7 pod venom .43 .055 fungus
u_gen_5_9 quill bone .46 .044 feather
u_gen_5_11 splinter void .48 .049 prongs
u_gen_3_1 crystal frost .65 .023 snowflake
u_gen_3_3 zigzag storm .64 .028 lightning
u_gen_3_5 fork steel .68 .021 bird
u_gen_3_7 feather bronze .63 .025 eye
u_gen_3_9 vertebra bone .67 .031 teeth
u_gen_3_11 scroll storm .69 .030 pearls
u_gen_16_0 heart blood .34 .34 heart
u_gen_16_2 repeater steel .31 .32 magazine
u_gen_16_4 spider black .38 .35 legs
u_gen_16_6 heavy steel .33 .41 sight
u_gen_16_8 pulse steel .36 .38 ring
u_gen_16_10 quarrel black .40 .37 prongs
u_gen_16_12 clock bronze .35 .33 clock
u_oath kite blood .60 .22 oath
u_gen_17_1 lantern gold .59 .23 lantern
u_gen_17_3 wall bronze .62 .235 ribs
u_gen_17_5 oval gold .57 .225 angel
u_gen_17_7 concentric gold .53 .265 spokes
u_gen_17_9 rib bone .64 .215 knot
u_gen_17_11 hood bronze .58 .25 hearth
u_crown hollow bone .20 .145 crown
u_gen_7_1 flame bronze .24 .147 coal
u_gen_7_3 skull bone .22 .146 teeth
u_gen_7_5 mask steel .21 .143 slit
u_gen_7_7 hood black .19 .149 horns
u_gen_7_9 coral bone .25 .148 pearls
u_gen_7_11 rib bone .23 .145 arches
u_cinder ragged blood .56 .232 quilt
u_gen_6_0 shield leather .53 .236 rivets
u_gen_6_2 scales bronze .57 .238 eye
u_gen_6_4 wall steel .58 .248 braces
u_gen_6_6 cracked black .55 .241 embers
u_gen_6_8 lattice bronze .54 .237 weave
u_gen_6_10 forge black .59 .242 scales
u_gen_6_12 tower gold .60 .246 buttress
u_gen_18_0 bone leather .16 .052 skull
u_gen_18_2 blocks blood .17 .057 hook
u_gen_18_4 vise steel .18 .060 bolts
u_gen_18_6 skeletal bone .15 .054 ribs
u_gen_18_8 tomb steel .19 .056 arches
u_gen_18_10 hooks void .175 .053 knots
u_gen_18_12 eye gold .185 .058 cage
u_stride spectral black .30 .074 ribs
u_gen_8_0 bell leather .29 .075 bells
u_gen_8_2 wing steel .31 .076 fins
u_gen_8_4 mask bone .32 .077 cloth
u_gen_8_6 banner steel .33 .078 pennant
u_gen_8_8 vane sky .315 .075 leaves
u_gen_8_10 skeletal bone .325 .076 porcelain
u_gen_8_12 lantern bronze .34 .079 straps
'''

PALETTES={
 'gold':['#b5a478','#65513a','#50422f','#cbc1a4','#bba063','#dcc894'],
 'steel':['#a7aeb0','#49423a','#45403b','#6c7172','#9c8b62','#b9d3db'],
 'bone':['#c4b89b','#685540','#322d27','#716957','#a28e61','#8cafbb'],
 'bronze':['#948061','#403a2f','#514236','#60523f','#b4925d','#a9a37d'],
 'storm':['#8babbc','#424950','#293741','#394451','#b49a6b','#88bdde'],
 'frost':['#b4ccd3','#617a86','#4a5e69','#99abb7','#c0c9ba','#b6e1eb'],
 'blood':['#927a69','#472e23','#662b29','#702c28','#a18a59','#e38552'],
 'black':['#494c54','#322b27','#27232a','#303039','#8b7a5c','#867baf'],
 'ash':['#77746a','#3e362b','#463e34','#625b50','#958467','#aeaa92'],
 'void':['#877b97','#342d3b','#302837','#3b324b','#9c8aaf','#a997d2'],
 'venom':['#728471','#3f442d','#303e2c','#45543b','#939164','#a8bc74'],
 'leather':['#918b76','#4c3b2b','#504033','#463934','#988465','#b9aa89'],
 'sky':['#abbec8','#655d4d','#3b4b59','#5d6f81','#ab9668','#bed3d9'],
}

# Explicit per-item refinement: metal, trim, bindings, jewel, surface, bevel,
# taper, relief scale, wear and the visible construction to refine. These are
# authored against the retained image/brief, not inferred from the item ID.
REFINEMENTS='''
u_gen_0_0 #aeb4af #a88a4e #bcb7a2 #dac991 metal .004 1.05 1.10 .35 sunrise-fan
u_gen_0_2 #777e82 #666c70 #343330 #a1b6bd metal .005 .96 .90 .70 split-wedge
u_gen_0_4 #34353d #8b7a55 #514051 #817394 metal .005 .94 1.18 .78 crown-cage
u_gen_0_6 #8b8c7e #9c8153 #494134 #a5a596 metal .006 1.10 .95 .80 broken-globe
u_gen_0_8 #bbc0b6 #ae8e4e #263843 #c9c5ab metal .004 .98 1.12 .30 crescent-slit
u_gen_0_10 #373943 #c4bba3 #343134 #bcb6d1 metal .003 .93 1.15 .25 feather-arches
u_gen_0_12 #899da3 #a69575 #34444b #97b5bb metal .004 1.02 1.08 .32 enamel-ribbons
u_gen_12_0 #969e9d #998867 #c1baa5 #bfc9ca metal .003 .96 1.05 .44 crossed-vows
u_gen_12_2 #b0b7b1 #ad9158 #665343 #d7d0aa metal .004 1.03 1.10 .25 flame-fuller
u_gen_12_4 #939c9c #a68b59 #3a414d #677fa7 metal .004 1.05 1.08 .38 lion-crown
u_gen_12_6 #858c8b #a09372 #b6b1a0 #b9c6c3 metal .004 .98 .96 .47 lock-plate
u_gen_12_8 #b2b9b2 #b1995d #b8b5a4 #d9cfa9 metal .003 .95 1.12 .28 half-sun
u_gen_12_10 #373941 #a18c52 #3d3032 #b9a06d metal .003 .96 1.00 .30 promise-ring
u_gen_12_12 #aaa38a #a88e52 #652e2b #a35640 metal .004 1.02 1.06 .43 throne-seal
u_widow #8c9394 #8f8267 #343137 #5c526b metal .002 .89 .95 .45 broken-band
u_gen_2_0 #c0baa5 #887b5f #b9b09b #a5a99a bone .002 .96 1.02 .60 jaw-fang
u_gen_2_2 #545966 #8c8980 #303039 #8c90aa metal .003 .92 1.00 .30 kissing-moons
u_gen_2_4 #858c8e #9d9c90 #38363b #acb5b3 metal .003 1.08 .92 .55 coffin-guard
u_gen_2_6 #889093 #5a5e61 #343436 #bac5c7 metal .003 .96 1.10 .68 rivet-bridges
u_gen_2_8 #647364 #8b9470 #333e30 #96b875 metal .002 .90 1.06 .50 serpent-mouth
u_gen_2_10 #3d4244 #757660 #302c34 #8d7c9b metal .002 .91 1.10 .73 thorn-twig
u_gen_2_12 #c5c3ad #b1ac92 #a09b87 #c7cdc0 bone .002 .88 .96 .40 hollow-ribs
u_gravebite #b5afa0 #797365 #29292a #8e8d7c bone .005 1.02 1.06 .82 coffin-nails
u_kingsplit #8f938e #a28548 #672f30 #bca576 metal .005 1.00 1.10 .64 broken-coronet
u_gen_1_1 #707b7c #8c7460 #682d2a #af5f43 metal .005 1.05 1.06 .82 blood-channel
u_gen_1_3 #464b4d #827d6e #343235 #a2a69d metal .005 .98 1.13 .85 opposed-crescents
u_gen_1_5 #8e9696 #8a887b #383633 #b8b8aa metal .006 1.05 1.12 .78 skull-socket
u_gen_1_7 #777369 #7d7970 #34302b #a4a193 stone .006 1.00 1.04 .90 runed-braces
u_gen_1_9 #b7b09d #978665 #602d2c #aa5848 bone .005 1.07 1.12 .78 marrow-core
u_gen_1_11 #858c84 #a48951 #7a3333 #b06c49 metal .005 1.01 1.15 .63 cathedral-beads
u_gen_13_1 #c1bbaa #958968 #33312c #b6b9a1 bone .004 1.02 1.09 .68 tusk-hook
u_gen_13_3 #969e9c #99846a #713833 #ac6652 metal .004 1.05 1.02 .78 grinning-notch
u_gen_13_5 #b4b1a2 #8d846c #9b947f #c3c4b0 bone .004 1.00 1.12 .73 rib-crescent
u_gen_13_7 #81888a #8c8772 #3a3832 #a4b0b1 metal .004 1.03 1.15 .76 wolf-socket
u_gen_13_9 #b4ad95 #5c625e #494332 #a6a18d bone .005 1.01 1.16 .81 tooth-jaw
u_gen_13_11 #bdb9a1 #a39370 #a19b82 #c6cab4 bone .004 1.06 1.13 .53 forked-antler
u_gen_11_1 #77766e #656a69 #443e33 #b1a695 stone .008 1.00 .94 .90 earth-strata
u_gen_11_3 #7d8079 #9c8962 #4c4332 #b6ab86 metal .006 1.02 1.05 .78 continents
u_gen_11_5 #938165 #454944 #463c2d #a19370 metal .006 .97 1.08 .82 bell-cage
u_gen_11_7 #4c5051 #9c8059 #39322d #be6345 metal .007 1.07 1.13 .90 volcanic-split
u_gen_11_9 #a7a58f #8c8065 #464136 #9ca095 bone .006 1.02 1.17 .86 skull-cheeks
u_gen_11_11 #7f846a #71907e #473f32 #a1ae95 metal .006 1.03 1.09 .90 coral-patina
u_gen_14_0 #7f8485 #9b8866 #4d3d59 #a99ebc metal .004 .98 1.10 .60 moon-cage
u_gen_14_2 #968872 #797e7e #514638 #b9ae93 metal .004 1.00 1.05 .66 squared-socket
u_gen_14_4 #737b7d #a49a80 #b6ae98 #a8b6b7 metal .004 .98 1.12 .72 coffin-flanges
u_gen_14_6 #aaa796 #a68d53 #672d31 #bb634e metal .004 1.03 1.12 .36 chapel-reliquary
u_gen_14_8 #a7b5b9 #af9872 #364f69 #b9a573 metal .003 1.01 1.13 .34 curved-rays
u_gen_14_10 #42474a #9b8759 #332f34 #a89163 metal .005 .98 1.08 .75 coin-rim
u_gen_14_12 #b6b29e #aa925b #b4ad95 #cfc5a1 metal .004 1.00 1.02 .65 enamel-bells
u_gen_15_1 #a3aba9 #9f987d #363b38 #bdc2b0 metal .003 .96 1.08 .47 comet-fins
u_gen_15_3 #7c929e #a68a64 #34434e #9abdc5 metal .004 .98 1.09 .57 copper-coil
u_gen_15_5 #b5b9ae #b09764 #bab5a4 #d2cba3 metal .003 1.02 1.14 .30 arched-wings
u_gen_15_7 #8595a0 #978d71 #3d5b6c #99bfce metal .004 1.04 1.12 .56 runed-fork
u_gen_15_9 #bbb7a6 #8f9c9c #3f413d #aebeb6 bone .003 .98 1.10 .51 spiral-ribbon
u_gen_15_11 #99b1bd #ab9460 #b0b7ae #b9d0d5 metal .003 .94 1.09 .32 feather-guards
u_gen_4_0 #969f9e #a39a7c #494c45 #779faf metal .004 1.03 1.12 .67 silver-vortex
u_gen_4_2 #535955 #978167 #723831 #c67545 metal .005 1.00 1.15 .81 cracked-heart
u_gen_4_4 #acbbc0 #aab6ac #b3bbae #a1c6d0 metal .004 .96 1.03 .38 frosted-lantern
u_gen_4_6 #8d9291 #a48660 #49404a #8c80b4 metal .004 1.03 1.09 .61 copper-crown
u_gen_4_8 #635e55 #998361 #343330 #9e7650 metal .003 .99 1.08 .90 bronze-veil
u_gen_4_10 #b0c3ca #91a9b2 #333641 #689aaf metal .004 1.06 1.16 .29 jagged-ice
u_gen_4_12 #a69b7c #b29656 #323433 #b4aede metal .004 1.04 1.10 .51 tiered-spire
u_gen_5_1 #b5b09d #8c8270 #4a463b #9282a1 bone .002 .95 1.02 .73 joint-rings
u_gen_5_3 #929ea0 #989a88 #34333a #afc4be metal .002 .95 1.03 .52 soul-beads
u_gen_5_5 #c0baa4 #636960 #aaa58e #afbbad bone .003 1.05 1.10 .83 rib-forks
u_gen_5_7 #787c62 #789076 #3c4131 #a1af6e wood .003 1.03 1.09 .88 split-pod
u_gen_5_9 #c2bfaa #968c70 #403b36 #9caeb0 bone .002 .91 1.02 .64 carved-quill
u_gen_5_11 #bbc1c4 #a3aab1 #484353 #aaa5d0 bone .002 .96 1.07 .30 ghost-cage
u_gen_3_1 #b2c3c7 #b7c5bf #b4b9ac #a2c7d2 bone .003 1.02 1.08 .35 crystal-tips
u_gen_3_3 #788f99 #a28459 #3f4b4e #86b7c2 metal .003 1.00 1.09 .58 copper-lightning
u_gen_3_5 #929f93 #9e9f85 #4a4936 #b7bf9b wood .002 .95 1.04 .42 split-songbird
u_gen_3_7 #8c8671 #a5905c #494332 #bba365 wood .003 1.02 1.10 .69 hooked-feathers
u_gen_3_9 #b7bcae #a2b9bf #3c5c76 #9ec5d4 bone .003 1.04 1.12 .47 vertebral-frost
u_gen_3_11 #91a7b7 #a5a28d #354356 #b8c5d2 metal .003 1.06 1.10 .46 pearl-scrollwork
u_gen_16_0 #8c625c #998771 #302c2e #a44b4d metal .004 .98 1.10 .58 hooked-heart
u_gen_16_2 #7f8787 #8c8773 #484137 #a9b1a0 metal .005 1.00 1.02 .78 magazine-crank
u_gen_16_4 #3b4042 #6e6e69 #303036 #a9524d metal .003 .94 1.08 .63 spider-joints
u_gen_16_6 #808a8e #929083 #4b5152 #b6c2c2 metal .006 1.07 .97 .71 sight-guard
u_gen_16_8 #9aaeb7 #8e9d98 #3c4b5b #8fbbc9 metal .004 1.02 1.10 .44 pulse-housing
u_gen_16_10 #383d46 #adb4b7 #373741 #b3bfd0 metal .003 .96 1.09 .57 tuning-prongs
u_gen_16_12 #9d967c #a68e58 #5e2c31 #b17458 metal .004 .98 1.12 .65 heart-clock
u_oath #717b7b #b6ad94 #403b36 #a9b4ac metal .004 1.02 1.11 .78 ivory-seal
u_gen_17_1 #acb3a8 #a08e63 #47473f #8cbacb metal .004 .98 1.09 .58 lantern-ribs
u_gen_17_3 #757b77 #918469 #373b34 #8e9b8b metal .006 1.06 1.10 .86 tower-gate
u_gen_17_5 #999f96 #9b9f7f #434b39 #bcc4a2 metal .004 .98 1.12 .61 sanctuary-arch
u_gen_17_7 #aeb5a9 #a49163 #46483c #c5cbb7 metal .005 1.03 1.04 .51 nested-rings
u_gen_17_9 #bab4a0 #988461 #4a4438 #b9b9a1 bone .004 1.01 1.14 .67 interlocked-ribs
u_gen_17_11 #8b8e82 #a38d55 #373a37 #c1b892 metal .004 1.07 1.11 .82 hooded-hearth
u_crown #b4ad96 #918366 #302d2b #958b7a bone .002 1.02 1.08 .83 broken-circlet
u_gen_7_1 #65685e #95846b #39362e #b2683e metal .003 1.04 1.11 .87 charred-flames
u_gen_7_3 #a6aaa1 #999985 #353733 #afbaa6 metal .003 1.00 1.04 .71 skull-ridges
u_gen_7_5 #a6afb0 #9da797 #3e4144 #b8c3c8 metal .002 .96 .96 .32 solemn-mask
u_gen_7_7 #3e4246 #8e8065 #302e32 #a45147 metal .003 1.01 1.06 .83 broken-hood
u_gen_7_9 #a1afa0 #789d93 #b8b5a2 #b7cacc bone .002 1.03 1.11 .88 coral-pearls
u_gen_7_11 #c0c4b2 #b0b499 #343a39 #888d96 bone .002 .98 1.09 .52 arched-ribs
u_cinder #6c302c #826854 #722e2c #b26338 cloth .003 .97 1.05 .90 quilted-banners
u_gen_6_0 #7d7c70 #927a56 #55493b #a29578 leather .003 .96 1.04 .90 ash-shield
u_gen_6_2 #8a8c7d #96815d #494034 #a05042 metal .004 1.01 1.06 .74 overlapping-scales
u_gen_6_4 #858c86 #827e69 #403e35 #adb0a3 metal .004 1.06 1.02 .80 linked-wall
u_gen_6_6 #454b4b #95816c #373636 #b26b3d metal .004 .98 1.08 .88 slag-collar
u_gen_6_8 #919994 #a88d60 #514334 #b96c43 metal .003 .97 1.07 .67 woven-shell
u_gen_6_10 #424b4c #a08255 #403b31 #a68f62 metal .004 1.03 1.06 .86 forge-scales
u_gen_6_12 #a7a590 #a18b56 #bcb9a5 #beb696 metal .004 1.02 1.04 .72 buttressed-tower
u_gen_18_0 #b8b19d #897c63 #35322f #a4a591 bone .002 .96 1.01 .86 articulated-bone
u_gen_18_2 #879089 #8b775b #703a32 #a88b6a metal .003 1.05 1.02 .82 tension-blocks
u_gen_18_4 #949c95 #93927e #41423b #b1b6a1 metal .003 1.07 .98 .74 vise-jaws
u_gen_18_6 #b9bdac #8a9483 #303633 #adb8a6 bone .002 .95 1.03 .76 empty-knuckles
u_gen_18_8 #b0bab5 #9eaa93 #b1afa0 #c1c9b7 metal .002 1.00 1.06 .57 funeral-arches
u_gen_18_10 #3e434e #83728a #37303e #8e80ac metal .002 .94 1.07 .66 hooked-knots
u_gen_18_12 #aaa88b #a38d52 #323a36 #b49663 metal .003 1.03 1.08 .67 palm-cages
u_stride #4d5458 #91a5a6 #323638 #a2bfc1 leather .002 .97 1.06 .80 spectral-heels
u_gen_8_0 #958570 #9e8961 #584a37 #afa083 leather .003 .95 1.02 .85 bell-tassels
u_gen_8_2 #a2adaa #8b9b94 #a3a99f #b7c6bd metal .003 .98 1.05 .61 vented-wings
u_gen_8_4 #a8b8ba #98a9a4 #b5bcae #b4ccd0 metal .003 .96 1.07 .52 hollow-masks
u_gen_8_6 #969b95 #93886b #673530 #b4b9a2 metal .004 1.06 1.03 .80 banner-knees
u_gen_8_8 #9db1b7 #9fa786 #364f64 #b4c8c9 metal .003 .95 1.08 .46 curled-vanes
u_gen_8_10 #b7bfb5 #a1ac99 #333b3b #c4cdc2 bone .002 .98 1.06 .63 porcelain-cuffs
u_gen_8_12 #a5a68e #b39d64 #443e30 #c4bc95 metal .003 1.02 1.04 .86 open-lanterns
'''

LIMBS = '''
u_cinder quilt cloth 1.06 1.04 .92
u_gen_6_0 riveted leather 1.00 1.00 .94
u_gen_6_2 dragon mail 1.04 1.06 .90
u_gen_6_4 linked mail 1.08 1.07 .96
u_gen_6_6 cracked mail .98 1.03 .92
u_gen_6_8 woven cloth 1.02 1.02 .88
u_gen_6_10 forge leather 1.05 1.08 .94
u_gen_6_12 bastion cloth 1.07 1.06 .96
'''

def attachment(row, slot):
    parents={'off':['HandL'],'head':['Head'],'chest':['Chest','Spine','Hips','UpperArmL','UpperArmR',
              'ForearmL','ForearmR','ThighL','ThighR','ShinL','ShinR'],
             'gloves':['HandL','HandR'],'boots':['FootL','FootR']}
    if slot!='main':
        return {'parents':parents[slot],'position':[.075,-.07,.03] if slot=='off' else [0,0,0],
                'rotation':[1.05,0,0] if slot=='off' else [0,0,0],'paired':slot in ('gloves','boots')}
    category=row['category']
    info={'parents':['TwoHandWeaponRig' if row['twoHand'] else 'WeaponSocket'],'primary':[0,0,0],
          'support':[0,.26 if category=='spear' else .30 if category=='staff' else -.2,0] if row['twoHand'] else None}
    if category=='bow':
        info.update(primary=[0,0,-.08],support=[0,0,.2],projectileSocket=[0,0,.2],
                    ranged={'handRest':[0,0,-.08],'stringRest':-.08,'drawDistance':.30})
    elif category=='crossbow':
        info.update(primary=[0,-.07,-.065],support=[0,-.045,.16],projectileSocket=[0,.055,.36],
                    ranged={'handRest':[0,-.07,-.065],'stringRest':.19,'drawDistance':.17,
                            'reloadSide':.032,'reloadLift':.125,'reloadAdvance':.255})
    return info

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check',action='store_true',help='Verify the retained recipes without rewriting the registry')
    args=parser.parse_args()
    catalog=json.loads((AUTH/'catalog_v1.json').read_text(encoding='utf-8'))
    provenance=json.loads((AUTH/'import_v1.json').read_text(encoding='utf-8'))
    refinements={}
    for line in REFINEMENTS.strip().splitlines():
        identity,metal,trim,bindings,glow,solid,bevel,taper,relief,wear,detail=line.split()
        assert identity not in refinements
        refinements[identity]={'palette':dict(metal=metal,trim=trim,cloth=bindings,leather=bindings,glow=glow),
          'solid':solid,'bevel':float(bevel),'taper':float(taper),'relief':float(relief),'wear':float(wear),'detail':detail}
    limbs={}
    for line in LIMBS.strip().splitlines():
        identity,style,surface,arms,legs,cuff=line.split()
        assert identity not in limbs
        limbs[identity]={'style':style,'surface':surface,'arms':float(arms),'legs':float(legs),'cuff':float(cuff)}
    models={}
    slots={'shield':'off','helm':'head','chest':'chest','gloves':'gloves','boots':'boots'}
    for line in RECIPES.strip().splitlines():
        identity,shape,finish,length,width,motif=line.split()
        row=catalog['items'][identity]
        slot=slots.get(row['category'],'main')
        metal,wood,leather,cloth,trim,glow=PALETTES[finish]
        ref=refinements[identity]
        material=dict(metal=metal,wood=wood,leather=leather,cloth=cloth,trim=trim,glow=glow)
        material.update(ref['palette'])
        refinement={key:value for key,value in ref.items() if key!='palette'}
        luminous=any(word in row['design'].lower() for word in ['ember','stormstone','storm pearl','ghost','luminous','venom bead','doomstone','crystal','coal','purple eye','glowing'])
        refinement['emission']=.14 if luminous else .035
        models[identity]={
          'id':identity,'revision':3 if slot=='chest' else 2,'name':row['name'],'baseId':row['baseId'],'category':row['category'],
          'slot':slot,'shape':shape,'finish':finish,
          'length':float(length),'width':float(width),'motif':motif,'twoHand':row['twoHand'],
          'material':material,'refinement':refinement,
          'attachment':attachment(row,slot),
          'reference':{**provenance['maps']['uniqueItemIcons'][identity],
                       'source':row['source'],'sha256':provenance['sources'][identity]['sourceSha256']},
          'brief':row['design'],
        }
        if slot=='chest':models[identity]['limbs']=limbs[identity]
    expected={identity for identity,row in catalog['items'].items()
              if row['group']=='equipment' and row['category'] not in ('ring','amulet','belt')}
    assert set(models)==set(refinements)==expected and len(models)==118
    assert set(limbs)=={identity for identity,model in models.items() if model['slot']=='chest'}
    source='''// Individually authored shapes; inventory references are retained for visual QA.
function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
export const UNIQUE_MODEL_SLOTS=Object.freeze(['main','off','head','chest','gloves','boots']);
export const UNIQUE_MODELS3D=freeze('''+json.dumps(models,indent=2,ensure_ascii=False)+''');

export function uniqueEquipmentModel(data,item,base,slot){
  const named=item.uniqueId&&(data.UNIQUES||[]).find(def=>def.id===item.uniqueId);
  if(!named||!UNIQUE_MODEL_SLOTS.includes(data.BASES[named.base]?.slot))return null;
  const model=UNIQUE_MODELS3D[named.id];
   if(!model||model.baseId!==base.id||model.slot!==slot||slot==='chest'&&!model.limbs)throw new Error('Missing or invalid unique 3D model: '+named.id);
  return model;
}
'''
    target=ROOT/'js/character_unique_catalog3d.mjs'
    if args.check:
        assert target.read_text(encoding='utf-8')==source,'Unique model registry needs rebuilding'
        print('PASS: 118 retained unique recipes, palettes, attachments and inventory references.')
    else:
        target.write_text(source,encoding='utf-8',newline='\n')
        print('Authored 118 unique 3D recipes with canonical art references.')

if __name__=='__main__':main()
