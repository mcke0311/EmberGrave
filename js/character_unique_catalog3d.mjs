// Individually authored shapes; inventory references are retained for visual QA.
function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
export const UNIQUE_MODEL_SLOTS=Object.freeze(['main','off','head','chest','gloves','boots']);
export const UNIQUE_MODELS3D=freeze({
  "u_gen_0_0": {
    "id": "u_gen_0_0",
    "revision": 2,
    "name": "Dawnbreaker",
    "baseId": "sword2h_t1",
    "category": "sword",
    "slot": "main",
    "shape": "dawn",
    "finish": "gold",
    "length": 1.04,
    "width": 0.062,
    "motif": "sun",
    "twoHand": true,
    "material": {
      "metal": "#aeb4af",
      "wood": "#65513a",
      "leather": "#bcb7a2",
      "cloth": "#bcb7a2",
      "trim": "#a88a4e",
      "glow": "#dac991"
    },
    "refinement": {
      "solid": "metal",
      "bevel": 0.004,
      "taper": 1.05,
      "relief": 1.1,
      "wear": 0.35,
      "detail": "sunrise-fan",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "TwoHandWeaponRig"
      ],
      "primary": [
        0,
        0,
        0
      ],
      "support": [
        0,
        -0.2,
        0
      ]
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 9,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_0_0.png",
      "sha256": "2ab7904d814931a743cf8ec5853f9d218bf76471c64139d54bd3a3dc8fa94b3d"
    },
    "brief": "A very long greatsword with a sunrise fan guard, stepped pale blade, sun-disc pommel and ivory leather two-handed grip."
  },
  "u_gen_0_2": {
    "id": "u_gen_0_2",
    "revision": 2,
    "name": "Sunder",
    "baseId": "sword2h_t3",
    "category": "sword",
    "slot": "main",
    "shape": "fork",
    "finish": "steel",
    "length": 1.08,
    "width": 0.075,
    "motif": "wedge",
    "twoHand": true,
    "material": {
      "metal": "#777e82",
      "wood": "#49423a",
      "leather": "#343330",
      "cloth": "#343330",
      "trim": "#666c70",
      "glow": "#a1b6bd"
    },
    "refinement": {
      "solid": "metal",
      "bevel": 0.005,
      "taper": 0.96,
      "relief": 0.9,
      "wear": 0.7,
      "detail": "split-wedge",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "TwoHandWeaponRig"
      ],
      "primary": [
        0,
        0,
        0
      ],
      "support": [
        0,
        -0.2,
        0
      ]
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 10,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_0_2.png",
      "sha256": "f400af0a414472a5d06e1ca0e38cde99f34c82d5397aa9196dfb11673b19ea88"
    },
    "brief": "A very long greatsword with a visibly split forked blade tip, massive wedge guard and thick hammer-marked steel."
  },
  "u_gen_0_4": {
    "id": "u_gen_0_4",
    "revision": 2,
    "name": "Kingsbane",
    "baseId": "sword2h_t4",
    "category": "sword",
    "slot": "main",
    "shape": "saw",
    "finish": "black",
    "length": 1.01,
    "width": 0.065,
    "motif": "crown",
    "twoHand": true,
    "material": {
      "metal": "#34353d",
      "wood": "#322b27",
      "leather": "#514051",
      "cloth": "#514051",
      "trim": "#8b7a55",
      "glow": "#817394"
    },
    "refinement": {
      "solid": "metal",
      "bevel": 0.005,
      "taper": 0.94,
      "relief": 1.18,
      "wear": 0.78,
      "detail": "crown-cage",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "TwoHandWeaponRig"
      ],
      "primary": [
        0,
        0,
        0
      ],
      "support": [
        0,
        -0.2,
        0
      ]
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 11,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_0_4.png",
      "sha256": "73e8341177d6f4d77760c22a4c56886de06ed41d52385f4465548258e81f213b"
    },
    "brief": "A very long greatsword with a black crown trapped inside its open cage guard, brutal sawback and royal purple long grip."
  },
  "u_gen_0_6": {
    "id": "u_gen_0_6",
    "revision": 2,
    "name": "Worldcleaver",
    "baseId": "sword2h_t6",
    "category": "sword",
    "slot": "main",
    "shape": "cleaver",
    "finish": "bronze",
    "length": 0.97,
    "width": 0.095,
    "motif": "globe",
    "twoHand": true,
    "material": {
      "metal": "#8b8c7e",
      "wood": "#403a2f",
      "leather": "#494134",
      "cloth": "#494134",
      "trim": "#9c8153",
      "glow": "#a5a596"
    },
    "refinement": {
      "solid": "metal",
      "bevel": 0.006,
      "taper": 1.1,
      "relief": 0.95,
      "wear": 0.8,
      "detail": "broken-globe",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "TwoHandWeaponRig"
      ],
      "primary": [
        0,
        0,
        0
      ],
      "support": [
        0,
        -0.2,
        0
      ]
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 12,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_0_6.png",
      "sha256": "1bea2c592d34f5b1eaf0e6a19e5675293ab1339529b8ac1d3d1e91fff5a58a52"
    },
    "brief": "A very long greatsword shaped as an enormous forward-curving chopping blade with a broken globe ornament at the guard."
  },
  "u_gen_0_8": {
    "id": "u_gen_0_8",
    "revision": 2,
    "name": "Mornsplitter",
    "baseId": "sword2h_t8",
    "category": "sword",
    "slot": "main",
    "shape": "crescent",
    "finish": "gold",
    "length": 1.06,
    "width": 0.068,
    "motif": "wings",
    "twoHand": true,
    "material": {
      "metal": "#bbc0b6",
      "wood": "#65513a",
      "leather": "#263843",
      "cloth": "#263843",
      "trim": "#ae8e4e",
      "glow": "#c9c5ab"
    },
    "refinement": {
      "solid": "metal",
      "bevel": 0.004,
      "taper": 0.98,
      "relief": 1.12,
      "wear": 0.3,
      "detail": "crescent-slit",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "TwoHandWeaponRig"
      ],
      "primary": [
        0,
        0,
        0
      ],
      "support": [
        0,
        -0.2,
        0
      ]
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 13,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_0_8.png",
      "sha256": "6f94d90fa52e6f0cfc41b36cac836296734d50689076d1c9c57b58be712c5dfc"
    },
    "brief": "A very long greatsword with a pale crescent edge surrounding a central golden slit, tapered wing guard and midnight-blue long grip."
  },
  "u_gen_0_10": {
    "id": "u_gen_0_10",
    "revision": 2,
    "name": "Heaven's Edge",
    "baseId": "sword2h_t10",
    "category": "sword",
    "slot": "main",
    "shape": "obsidian",
    "finish": "black",
    "length": 1.1,
    "width": 0.061,
    "motif": "feathers",
    "twoHand": true,
    "material": {
      "metal": "#373943",
      "wood": "#322b27",
      "leather": "#343134",
      "cloth": "#343134",
      "trim": "#c4bba3",
      "glow": "#bcb6d1"
    },
    "refinement": {
      "solid": "metal",
      "bevel": 0.003,
      "taper": 0.93,
      "relief": 1.15,
      "wear": 0.25,
      "detail": "feather-arches",
      "emission": 0.14
    },
    "attachment": {
      "parents": [
        "TwoHandWeaponRig"
      ],
      "primary": [
        0,
        0,
        0
      ],
      "support": [
        0,
        -0.2,
        0
      ]
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 14,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_0_10.png",
      "sha256": "10e059ef9b0aa9b99210221bdf2cec2de9582e7a5ae52b986f3ccef842232327"
    },
    "brief": "A very long black obsidian greatsword with white featherlike guard wings, angular luminous edge and cathedral arch pommel."
  },
  "u_gen_0_12": {
    "id": "u_gen_0_12",
    "revision": 2,
    "name": "Aurora's Reckoning",
    "baseId": "sword2h_t12",
    "category": "sword",
    "slot": "main",
    "shape": "aurora",
    "finish": "gold",
    "length": 1.07,
    "width": 0.058,
    "motif": "star",
    "twoHand": true,
    "material": {
      "metal": "#899da3",
      "wood": "#65513a",
      "leather": "#34444b",
      "cloth": "#34444b",
      "trim": "#a69575",
      "glow": "#97b5bb"
    },
    "refinement": {
      "solid": "metal",
      "bevel": 0.004,
      "taper": 1.02,
      "relief": 1.08,
      "wear": 0.32,
      "detail": "enamel-ribbons",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "TwoHandWeaponRig"
      ],
      "primary": [
        0,
        0,
        0
      ],
      "support": [
        0,
        -0.2,
        0
      ]
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 15,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_0_12.png",
      "sha256": "9cf1569514799b21aa963e43026c4a043147efef89f2b749b878abedba3f3571"
    },
    "brief": "A very long greatsword with an aurora-shaped sweeping blade, overlapping enamel ribbons along the fuller and a starburst guard."
  },
  "u_gen_12_0": {
    "id": "u_gen_12_0",
    "revision": 2,
    "name": "Edge of Vows",
    "baseId": "sword_t1",
    "category": "sword",
    "slot": "main",
    "shape": "vow",
    "finish": "steel",
    "length": 0.73,
    "width": 0.043,
    "motif": "ribbons",
    "twoHand": false,
    "material": {
      "metal": "#969e9d",
      "wood": "#49423a",
      "leather": "#c1baa5",
      "cloth": "#c1baa5",
      "trim": "#998867",
      "glow": "#bfc9ca"
    },
    "refinement": {
      "solid": "metal",
      "bevel": 0.003,
      "taper": 0.96,
      "relief": 1.05,
      "wear": 0.44,
      "detail": "crossed-vows",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "WeaponSocket"
      ],
      "primary": [
        0,
        0,
        0
      ],
      "support": null
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 87,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_12_0.png",
      "sha256": "7970ddd2479d4f4ec13ed3d2dc80295353ad6314a91f1094ebbd08d9a7d84263"
    },
    "brief": "A one-handed straight sword with a crossed vow-ribbon guard, twin white enamel blade channels and a round oath-seal pommel."
  },
  "u_gen_12_2": {
    "id": "u_gen_12_2",
    "revision": 2,
    "name": "Lightbrand",
    "baseId": "sword_t3",
    "category": "sword",
    "slot": "main",
    "shape": "flame",
    "finish": "gold",
    "length": 0.76,
    "width": 0.046,
    "motif": "flame",
    "twoHand": false,
    "material": {
      "metal": "#b0b7b1",
      "wood": "#65513a",
      "leather": "#665343",
      "cloth": "#665343",
      "trim": "#ad9158",
      "glow": "#d7d0aa"
    },
    "refinement": {
      "solid": "metal",
      "bevel": 0.004,
      "taper": 1.03,
      "relief": 1.1,
      "wear": 0.25,
      "detail": "flame-fuller",
      "emission": 0.14
    },
    "attachment": {
      "parents": [
        "WeaponSocket"
      ],
      "primary": [
        0,
        0,
        0
      ],
      "support": null
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 88,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_12_2.png",
      "sha256": "c4631894dfb2a5a6ddde11d600e704015501612e09ec3c3d1b5f6b6a37d27cb3"
    },
    "brief": "A one-handed bright steel sword with a broad flame-shaped crossguard, luminous pale fuller and a polished sunstone pommel."
  },
  "u_gen_12_4": {
    "id": "u_gen_12_4",
    "revision": 2,
    "name": "Kingsblade",
    "baseId": "sword_t4",
    "category": "sword",
    "slot": "main",
    "shape": "royal",
    "finish": "steel",
    "length": 0.78,
    "width": 0.058,
    "motif": "lion",
    "twoHand": false,
    "material": {
      "metal": "#939c9c",
      "wood": "#49423a",
      "leather": "#3a414d",
      "cloth": "#3a414d",
      "trim": "#a68b59",
      "glow": "#677fa7"
    },
    "refinement": {
      "solid": "metal",
      "bevel": 0.004,
      "taper": 1.05,
      "relief": 1.08,
      "wear": 0.38,
      "detail": "lion-crown",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "WeaponSocket"
      ],
      "primary": [
        0,
        0,
        0
      ],
      "support": null
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 89,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_12_4.png",
      "sha256": "a873e613cb374e0e0f6de20dc770c882abda81654f7973be53351b4d2b4f65d1"
    },
    "brief": "A one-handed royal sword with a carved lion crown guard, broad ceremonial steel blade and a sapphire pommel."
  },
  "u_gen_12_6": {
    "id": "u_gen_12_6",
    "revision": 2,
    "name": "Vowkeeper",
    "baseId": "sword_t6",
    "category": "sword",
    "slot": "main",
    "shape": "lock",
    "finish": "steel",
    "length": 0.75,
    "width": 0.052,
    "motif": "lock",
    "twoHand": false,
    "material": {
      "metal": "#858c8b",
      "wood": "#49423a",
      "leather": "#b6b1a0",
      "cloth": "#b6b1a0",
      "trim": "#a09372",
      "glow": "#b9c6c3"
    },
    "refinement": {
      "solid": "metal",
      "bevel": 0.004,
      "taper": 0.98,
      "relief": 0.96,
      "wear": 0.47,
      "detail": "lock-plate",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "WeaponSocket"
      ],
      "primary": [
        0,
        0,
        0
      ],
      "support": null
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 90,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_12_6.png",
      "sha256": "4b79baa0cb09ac2b60f9557523fd2cbac5ae4f4654935eab3d8d1e65571a437a"
    },
    "brief": "A one-handed tempered sword with a lock-and-key crossguard, long rectangular central oath plate and a bound white grip."
  },
  "u_gen_12_8": {
    "id": "u_gen_12_8",
    "revision": 2,
    "name": "Dawnsworn",
    "baseId": "sword_t8",
    "category": "sword",
    "slot": "main",
    "shape": "sun",
    "finish": "gold",
    "length": 0.77,
    "width": 0.048,
    "motif": "sun",
    "twoHand": false,
    "material": {
      "metal": "#b2b9b2",
      "wood": "#65513a",
      "leather": "#b8b5a4",
      "cloth": "#b8b5a4",
      "trim": "#b1995d",
      "glow": "#d9cfa9"
    },
    "refinement": {
      "solid": "metal",
      "bevel": 0.003,
      "taper": 0.95,
      "relief": 1.12,
      "wear": 0.28,
      "detail": "half-sun",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "WeaponSocket"
      ],
      "primary": [
        0,
        0,
        0
      ],
      "support": null
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 91,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_12_8.png",
      "sha256": "291a7fe1a64f3694f5e0b8179f6272e94492b57ddaa9f7e5d14ac7b8605d1a6f"
    },
    "brief": "A one-handed mithral sword with a rising sun-shaped half-disc guard, gold blade shoulder and a white ray pommel."
  },
  "u_gen_12_10": {
    "id": "u_gen_12_10",
    "revision": 2,
    "name": "The Gilded Promise",
    "baseId": "sword_t10",
    "category": "sword",
    "slot": "main",
    "shape": "gilded",
    "finish": "black",
    "length": 0.8,
    "width": 0.041,
    "motif": "ring",
    "twoHand": false,
    "material": {
      "metal": "#373941",
      "wood": "#322b27",
      "leather": "#3d3032",
      "cloth": "#3d3032",
      "trim": "#a18c52",
      "glow": "#b9a06d"
    },
    "refinement": {
      "solid": "metal",
      "bevel": 0.003,
      "taper": 0.96,
      "relief": 1.0,
      "wear": 0.3,
      "detail": "promise-ring",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "WeaponSocket"
      ],
      "primary": [
        0,
        0,
        0
      ],
      "support": null
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 92,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_12_10.png",
      "sha256": "7041fa9ac36be97ed5f60d66628f3f28e8db8bcc8cdb8ec16c123ac0e33194c4"
    },
    "brief": "A one-handed black obsidian sword with a long gold promise-ring guard, delicate gilded blade veins and amber pommel."
  },
  "u_gen_12_12": {
    "id": "u_gen_12_12",
    "revision": 2,
    "name": "Throneward",
    "baseId": "sword_t12",
    "category": "sword",
    "slot": "main",
    "shape": "throne",
    "finish": "gold",
    "length": 0.81,
    "width": 0.055,
    "motif": "throne",
    "twoHand": false,
    "material": {
      "metal": "#aaa38a",
      "wood": "#65513a",
      "leather": "#652e2b",
      "cloth": "#652e2b",
      "trim": "#a88e52",
      "glow": "#a35640"
    },
    "refinement": {
      "solid": "metal",
      "bevel": 0.004,
      "taper": 1.02,
      "relief": 1.06,
      "wear": 0.43,
      "detail": "throne-seal",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "WeaponSocket"
      ],
      "primary": [
        0,
        0,
        0
      ],
      "support": null
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 93,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_12_12.png",
      "sha256": "27658ccb0fc416cd4de92417ce5e26ea4ad545e1f1c9a16e29e2d12deaf74a44"
    },
    "brief": "A one-handed sunforged sword with a throne-backed vertical guard, geometric gold blade shoulder and a red royal seal."
  },
  "u_widow": {
    "id": "u_widow",
    "revision": 2,
    "name": "Widow's Lament",
    "baseId": "dirk",
    "category": "dagger",
    "slot": "main",
    "shape": "dirk",
    "finish": "black",
    "length": 0.41,
    "width": 0.026,
    "motif": "veil",
    "twoHand": false,
    "material": {
      "metal": "#8c9394",
      "wood": "#322b27",
      "leather": "#343137",
      "cloth": "#343137",
      "trim": "#8f8267",
      "glow": "#5c526b"
    },
    "refinement": {
      "solid": "metal",
      "bevel": 0.002,
      "taper": 0.89,
      "relief": 0.95,
      "wear": 0.45,
      "detail": "broken-band",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "WeaponSocket"
      ],
      "primary": [
        0,
        0,
        0
      ],
      "support": null
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 1,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_widow.png",
      "sha256": "727bdd226b459b58080ffa4382bbf7ef794e25faf1efb757fc6b8acffc9dfcfe"
    },
    "brief": "A thin dirk with a teardrop black opal pommel, broken wedding-band guard and a curved mourning-veil tassel."
  },
  "u_gen_2_0": {
    "id": "u_gen_2_0",
    "revision": 2,
    "name": "Whisperfang",
    "baseId": "dagger_t1",
    "category": "dagger",
    "slot": "main",
    "shape": "fang",
    "finish": "bone",
    "length": 0.39,
    "width": 0.042,
    "motif": "jaw",
    "twoHand": false,
    "material": {
      "metal": "#c0baa5",
      "wood": "#685540",
      "leather": "#b9b09b",
      "cloth": "#b9b09b",
      "trim": "#887b5f",
      "glow": "#a5a99a"
    },
    "refinement": {
      "solid": "bone",
      "bevel": 0.002,
      "taper": 0.96,
      "relief": 1.02,
      "wear": 0.6,
      "detail": "jaw-fang",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "WeaponSocket"
      ],
      "primary": [
        0,
        0,
        0
      ],
      "support": null
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 22,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_2_0.png",
      "sha256": "dd1d0bf0bf0c34550e5b991873345f3788019820866f51dd8c3500c0458e5d3b"
    },
    "brief": "A slim curved dagger with a fang-shaped point, coiled wolf-jaw guard and pale leather wrap."
  },
  "u_gen_2_2": {
    "id": "u_gen_2_2",
    "revision": 2,
    "name": "Nightkiss",
    "baseId": "dagger_t3",
    "category": "dagger",
    "slot": "main",
    "shape": "moon",
    "finish": "black",
    "length": 0.36,
    "width": 0.052,
    "motif": "moons",
    "twoHand": false,
    "material": {
      "metal": "#545966",
      "wood": "#322b27",
      "leather": "#303039",
      "cloth": "#303039",
      "trim": "#8c8980",
      "glow": "#8c90aa"
    },
    "refinement": {
      "solid": "metal",
      "bevel": 0.003,
      "taper": 0.92,
      "relief": 1.0,
      "wear": 0.3,
      "detail": "kissing-moons",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "WeaponSocket"
      ],
      "primary": [
        0,
        0,
        0
      ],
      "support": null
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 23,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_2_2.png",
      "sha256": "031c64670bf0ee7af6add131096b5c0f8321943fae737a076899dc50109d57ca"
    },
    "brief": "A short crescent dagger with two kissing moon curves at the guard, a black pearl pommel and polished midnight metal."
  },
  "u_gen_2_4": {
    "id": "u_gen_2_4",
    "revision": 2,
    "name": "Quietus",
    "baseId": "dagger_t4",
    "category": "dagger",
    "slot": "main",
    "shape": "coffin",
    "finish": "steel",
    "length": 0.38,
    "width": 0.058,
    "motif": "coffin",
    "twoHand": false,
    "material": {
      "metal": "#858c8e",
      "wood": "#49423a",
      "leather": "#38363b",
      "cloth": "#38363b",
      "trim": "#9d9c90",
      "glow": "#acb5b3"
    },
    "refinement": {
      "solid": "metal",
      "bevel": 0.003,
      "taper": 1.08,
      "relief": 0.92,
      "wear": 0.55,
      "detail": "coffin-guard",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "WeaponSocket"
      ],
      "primary": [
        0,
        0,
        0
      ],
      "support": null
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 24,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_2_4.png",
      "sha256": "f0c59fa4f6eb5ce195efdaa4a52acbd5ad77ed7af7c68a4efeaac956fc12a9f4"
    },
    "brief": "A broad triangular stiletto with a blunt coffin-shaped crossguard, pewter funerary inlay and a completely still dark blade."
  },
  "u_gen_2_6": {
    "id": "u_gen_2_6",
    "revision": 2,
    "name": "Severance",
    "baseId": "dagger_t6",
    "category": "dagger",
    "slot": "main",
    "shape": "segments",
    "finish": "steel",
    "length": 0.43,
    "width": 0.043,
    "motif": "chain",
    "twoHand": false,
    "material": {
      "metal": "#889093",
      "wood": "#49423a",
      "leather": "#343436",
      "cloth": "#343436",
      "trim": "#5a5e61",
      "glow": "#bac5c7"
    },
    "refinement": {
      "solid": "metal",
      "bevel": 0.003,
      "taper": 0.96,
      "relief": 1.1,
      "wear": 0.68,
      "detail": "rivet-bridges",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "WeaponSocket"
      ],
      "primary": [
        0,
        0,
        0
      ],
      "support": null
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 25,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_2_6.png",
      "sha256": "3070e81425a07115d857934e37e5992dc50e19067fd788a662b82559d0137a6d"
    },
    "brief": "A dagger with two disconnected-looking steel blade segments joined by heavy black rivet bridges and a severed-chain guard."
  },
  "u_gen_2_8": {
    "id": "u_gen_2_8",
    "revision": 2,
    "name": "Venomwhisper",
    "baseId": "dagger_t8",
    "category": "dagger",
    "slot": "main",
    "shape": "serpent",
    "finish": "venom",
    "length": 0.42,
    "width": 0.033,
    "motif": "serpent",
    "twoHand": false,
    "material": {
      "metal": "#647364",
      "wood": "#3f442d",
      "leather": "#333e30",
      "cloth": "#333e30",
      "trim": "#8b9470",
      "glow": "#96b875"
    },
    "refinement": {
      "solid": "metal",
      "bevel": 0.002,
      "taper": 0.9,
      "relief": 1.06,
      "wear": 0.5,
      "detail": "serpent-mouth",
      "emission": 0.14
    },
    "attachment": {
      "parents": [
        "WeaponSocket"
      ],
      "primary": [
        0,
        0,
        0
      ],
      "support": null
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 26,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_2_8.png",
      "sha256": "59a9f5c089828d5ef22c2f9395e46c2606cf88d2657232ddae7ee5566693f239"
    },
    "brief": "A narrow green-black dagger with an open serpent-mouth hilt, a grooved fang point and a translucent venom bead."
  },
  "u_gen_2_10": {
    "id": "u_gen_2_10",
    "revision": 2,
    "name": "The Silent Thorn",
    "baseId": "dagger_t10",
    "category": "dagger",
    "slot": "main",
    "shape": "thorn",
    "finish": "black",
    "length": 0.44,
    "width": 0.04,
    "motif": "thorns",
    "twoHand": false,
    "material": {
      "metal": "#3d4244",
      "wood": "#322b27",
      "leather": "#302c34",
      "cloth": "#302c34",
      "trim": "#757660",
      "glow": "#8d7c9b"
    },
    "refinement": {
      "solid": "metal",
      "bevel": 0.002,
      "taper": 0.91,
      "relief": 1.1,
      "wear": 0.73,
      "detail": "thorn-twig",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "WeaponSocket"
      ],
      "primary": [
        0,
        0,
        0
      ],
      "support": null
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 27,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_2_10.png",
      "sha256": "8545b6f5b33ad354ab08c08a5d3fccee7a14f74f728e247861b08748ea20713e"
    },
    "brief": "A black thorn-shaped dagger with three long irregular barbs, a twig guard and a single muted amethyst pommel."
  },
  "u_gen_2_12": {
    "id": "u_gen_2_12",
    "revision": 2,
    "name": "Last Breath",
    "baseId": "dagger_t12",
    "category": "dagger",
    "slot": "main",
    "shape": "leaf",
    "finish": "bone",
    "length": 0.4,
    "width": 0.039,
    "motif": "ribs",
    "twoHand": false,
    "material": {
      "metal": "#c5c3ad",
      "wood": "#685540",
      "leather": "#a09b87",
      "cloth": "#a09b87",
      "trim": "#b1ac92",
      "glow": "#c7cdc0"
    },
    "refinement": {
      "solid": "bone",
      "bevel": 0.002,
      "taper": 0.88,
      "relief": 0.96,
      "wear": 0.4,
      "detail": "hollow-ribs",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "WeaponSocket"
      ],
      "primary": [
        0,
        0,
        0
      ],
      "support": null
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 28,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_2_12.png",
      "sha256": "9e510cb19cd53c8631cd593e3f7257faca1b5fc9a84aa3ac7569ebfb9fb004d8"
    },
    "brief": "A leaf-thin pale dagger with a tapering rib-bone guard, small breathlike etched channels and a hollow bone pommel."
  },
  "u_gravebite": {
    "id": "u_gravebite",
    "revision": 2,
    "name": "Gravebite",
    "baseId": "handaxe",
    "category": "axe",
    "slot": "main",
    "shape": "jaw",
    "finish": "bone",
    "length": 0.57,
    "width": 0.3,
    "motif": "nails",
    "twoHand": false,
    "material": {
      "metal": "#b5afa0",
      "wood": "#685540",
      "leather": "#29292a",
      "cloth": "#29292a",
      "trim": "#797365",
      "glow": "#8e8d7c"
    },
    "refinement": {
      "solid": "bone",
      "bevel": 0.005,
      "taper": 1.02,
      "relief": 1.06,
      "wear": 0.82,
      "detail": "coffin-nails",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "WeaponSocket"
      ],
      "primary": [
        0,
        0,
        0
      ],
      "support": null
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 0,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gravebite.png",
      "sha256": "4efaa01b4e6d9d37da86235fe9b814f3bfbfc52ec1004fbbd41a3171ee58aa23"
    },
    "brief": "Bone-jaw handaxe, broad crescent edge, three coffin nails and a burial-linen bound black handle."
  },
  "u_kingsplit": {
    "id": "u_kingsplit",
    "revision": 2,
    "name": "Kingsplitter",
    "baseId": "waraxe",
    "category": "axe",
    "slot": "main",
    "shape": "crown",
    "finish": "bronze",
    "length": 0.63,
    "width": 0.32,
    "motif": "crown",
    "twoHand": false,
    "material": {
      "metal": "#8f938e",
      "wood": "#403a2f",
      "leather": "#672f30",
      "cloth": "#672f30",
      "trim": "#a28548",
      "glow": "#bca576"
    },
    "refinement": {
      "solid": "metal",
      "bevel": 0.005,
      "taper": 1.0,
      "relief": 1.1,
      "wear": 0.64,
      "detail": "broken-coronet",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "WeaponSocket"
      ],
      "primary": [
        0,
        0,
        0
      ],
      "support": null
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 8,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_kingsplit.png",
      "sha256": "87be4769c54b7d3ad079371c1942caaca48aa573fceb126e4532acf04d146638"
    },
    "brief": "A broad royal execution axe with a crown-shaped notch in the blade, chopped brass coronet guard and oxblood grip."
  },
  "u_gen_1_1": {
    "id": "u_gen_1_1",
    "revision": 2,
    "name": "Gorewake",
    "baseId": "axe2h_t2",
    "category": "axe",
    "slot": "main",
    "shape": "hook",
    "finish": "blood",
    "length": 0.9,
    "width": 0.34,
    "motif": "pennant",
    "twoHand": true,
    "material": {
      "metal": "#707b7c",
      "wood": "#472e23",
      "leather": "#682d2a",
      "cloth": "#682d2a",
      "trim": "#8c7460",
      "glow": "#af5f43"
    },
    "refinement": {
      "solid": "metal",
      "bevel": 0.005,
      "taper": 1.05,
      "relief": 1.06,
      "wear": 0.82,
      "detail": "blood-channel",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "TwoHandWeaponRig"
      ],
      "primary": [
        0,
        0,
        0
      ],
      "support": [
        0,
        -0.2,
        0
      ]
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 16,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_1_1.png",
      "sha256": "8f2004cb1fce27de8a76ebcf7f2dc8ab366b399581a0d13c2ac568bba7801c0d"
    },
    "brief": "A huge two-handed greataxe with a hooked blood channel in its single wide blade, spined rear hook and ragged red pennant."
  },
  "u_gen_1_3": {
    "id": "u_gen_1_3",
    "revision": 2,
    "name": "Reaver's End",
    "baseId": "axe2h_t3",
    "category": "axe",
    "slot": "main",
    "shape": "double",
    "finish": "black",
    "length": 0.91,
    "width": 0.31,
    "motif": "skull",
    "twoHand": true,
    "material": {
      "metal": "#464b4d",
      "wood": "#322b27",
      "leather": "#343235",
      "cloth": "#343235",
      "trim": "#827d6e",
      "glow": "#a2a69d"
    },
    "refinement": {
      "solid": "metal",
      "bevel": 0.005,
      "taper": 0.98,
      "relief": 1.13,
      "wear": 0.85,
      "detail": "opposed-crescents",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "TwoHandWeaponRig"
      ],
      "primary": [
        0,
        0,
        0
      ],
      "support": [
        0,
        -0.2,
        0
      ]
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 17,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_1_3.png",
      "sha256": "e7b4af3ac88444f31952a9ee11cee1f7b79be0ffdac7ac958e92b0b31c7d07b5"
    },
    "brief": "A huge two-handed greataxe with two opposed broken crescent blades joined by a black iron skull cage and a wrapped long haft."
  },
  "u_gen_1_5": {
    "id": "u_gen_1_5",
    "revision": 2,
    "name": "Skullsplit",
    "baseId": "axe2h_t5",
    "category": "axe",
    "slot": "main",
    "shape": "square",
    "finish": "steel",
    "length": 0.88,
    "width": 0.33,
    "motif": "skull",
    "twoHand": true,
    "material": {
      "metal": "#8e9696",
      "wood": "#49423a",
      "leather": "#383633",
      "cloth": "#383633",
      "trim": "#8a887b",
      "glow": "#b8b8aa"
    },
    "refinement": {
      "solid": "metal",
      "bevel": 0.006,
      "taper": 1.05,
      "relief": 1.12,
      "wear": 0.78,
      "detail": "skull-socket",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "TwoHandWeaponRig"
      ],
      "primary": [
        0,
        0,
        0
      ],
      "support": [
        0,
        -0.2,
        0
      ]
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 18,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_1_5.png",
      "sha256": "f29b6d65d204f545e5ce3ea8fcb8e5b0cb5aeb5dd7783fe9555c00acc5c84e0a"
    },
    "brief": "A huge two-handed greataxe with a massive square cleaving edge, skull-shaped central steel socket and a toothed back spike."
  },
  "u_gen_1_7": {
    "id": "u_gen_1_7",
    "revision": 2,
    "name": "Ruin",
    "baseId": "axe2h_t7",
    "category": "axe",
    "slot": "main",
    "shape": "fragment",
    "finish": "ash",
    "length": 0.92,
    "width": 0.32,
    "motif": "braces",
    "twoHand": true,
    "material": {
      "metal": "#777369",
      "wood": "#3e362b",
      "leather": "#34302b",
      "cloth": "#34302b",
      "trim": "#7d7970",
      "glow": "#a4a193"
    },
    "refinement": {
      "solid": "stone",
      "bevel": 0.006,
      "taper": 1.0,
      "relief": 1.04,
      "wear": 0.9,
      "detail": "runed-braces",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "TwoHandWeaponRig"
      ],
      "primary": [
        0,
        0,
        0
      ],
      "support": [
        0,
        -0.2,
        0
      ]
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 19,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_1_7.png",
      "sha256": "3b2916cad7d8b86cb6787416d9f60f22aacab921e9e0503c10c3545f4fcab7ec"
    },
    "brief": "A huge two-handed greataxe with fragmented stone-like blades bridged by runed iron braces and a long charred haft."
  },
  "u_gen_1_9": {
    "id": "u_gen_1_9",
    "revision": 2,
    "name": "Marrowhunger",
    "baseId": "axe2h_t9",
    "category": "axe",
    "slot": "main",
    "shape": "femur",
    "finish": "bone",
    "length": 0.94,
    "width": 0.35,
    "motif": "teeth",
    "twoHand": true,
    "material": {
      "metal": "#b7b09d",
      "wood": "#685540",
      "leather": "#602d2c",
      "cloth": "#602d2c",
      "trim": "#978665",
      "glow": "#aa5848"
    },
    "refinement": {
      "solid": "bone",
      "bevel": 0.005,
      "taper": 1.07,
      "relief": 1.12,
      "wear": 0.78,
      "detail": "marrow-core",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "TwoHandWeaponRig"
      ],
      "primary": [
        0,
        0,
        0
      ],
      "support": [
        0,
        -0.2,
        0
      ]
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 20,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_1_9.png",
      "sha256": "b1090f5e6153d4171e2545e0cc5ebc847a3898e3a55f79cdc44b6efb4c30c976"
    },
    "brief": "A huge two-handed greataxe made from a dragon femur with a wide pale bone edge, fanged socket and dark red marrow core."
  },
  "u_gen_1_11": {
    "id": "u_gen_1_11",
    "revision": 2,
    "name": "The Crimson Tithe",
    "baseId": "axe2h_t11",
    "category": "axe",
    "slot": "main",
    "shape": "cathedral",
    "finish": "blood",
    "length": 0.93,
    "width": 0.32,
    "motif": "chalice",
    "twoHand": true,
    "material": {
      "metal": "#858c84",
      "wood": "#472e23",
      "leather": "#7a3333",
      "cloth": "#7a3333",
      "trim": "#a48951",
      "glow": "#b06c49"
    },
    "refinement": {
      "solid": "metal",
      "bevel": 0.005,
      "taper": 1.01,
      "relief": 1.15,
      "wear": 0.63,
      "detail": "cathedral-beads",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "TwoHandWeaponRig"
      ],
      "primary": [
        0,
        0,
        0
      ],
      "support": [
        0,
        -0.2,
        0
      ]
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 21,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_1_11.png",
      "sha256": "71fde3a5df7dd0d6de90c3eec6e7d276b17750d12470e0326b4b5e5527566bbc"
    },
    "brief": "A huge two-handed greataxe with a cathedral-window crescent blade, hanging crimson votive beads and a gold chalice socket."
  },
  "u_gen_13_1": {
    "id": "u_gen_13_1",
    "revision": 2,
    "name": "Tusk",
    "baseId": "axe_t2",
    "category": "axe",
    "slot": "main",
    "shape": "tusk",
    "finish": "bone",
    "length": 0.59,
    "width": 0.28,
    "motif": "jaw",
    "twoHand": false,
    "material": {
      "metal": "#c1bbaa",
      "wood": "#685540",
      "leather": "#33312c",
      "cloth": "#33312c",
      "trim": "#958968",
      "glow": "#b6b9a1"
    },
    "refinement": {
      "solid": "bone",
      "bevel": 0.004,
      "taper": 1.02,
      "relief": 1.09,
      "wear": 0.68,
      "detail": "tusk-hook",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "WeaponSocket"
      ],
      "primary": [
        0,
        0,
        0
      ],
      "support": null
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 94,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_13_1.png",
      "sha256": "f5134e3e27e13da3e6e1f3997406061dfdfc7d2262c5b063a964d01e4b2ef190"
    },
    "brief": "A one-handed axe with a tusk-curved hooked white blade, boar-jaw socket and dark leather short handle."
  },
  "u_gen_13_3": {
    "id": "u_gen_13_3",
    "revision": 2,
    "name": "Cleaver's Joy",
    "baseId": "axe_t3",
    "category": "axe",
    "slot": "main",
    "shape": "cleaver",
    "finish": "blood",
    "length": 0.6,
    "width": 0.29,
    "motif": "grin",
    "twoHand": false,
    "material": {
      "metal": "#969e9c",
      "wood": "#472e23",
      "leather": "#713833",
      "cloth": "#713833",
      "trim": "#99846a",
      "glow": "#ac6652"
    },
    "refinement": {
      "solid": "metal",
      "bevel": 0.004,
      "taper": 1.05,
      "relief": 1.02,
      "wear": 0.78,
      "detail": "grinning-notch",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "WeaponSocket"
      ],
      "primary": [
        0,
        0,
        0
      ],
      "support": null
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 95,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_13_3.png",
      "sha256": "7a2a3847c3ac2810e74d97514fa1dd9a2c09ea7ab3851adffeef1dd9f6a7ca28"
    },
    "brief": "A one-handed broad meat-cleaver axe with a scalloped steel blade, chunky red leather grip and a curved grinning back notch."
  },
  "u_gen_13_5": {
    "id": "u_gen_13_5",
    "revision": 2,
    "name": "Bonereaver",
    "baseId": "axe_t5",
    "category": "axe",
    "slot": "main",
    "shape": "ribs",
    "finish": "bone",
    "length": 0.61,
    "width": 0.27,
    "motif": "skull",
    "twoHand": false,
    "material": {
      "metal": "#b4b1a2",
      "wood": "#685540",
      "leather": "#9b947f",
      "cloth": "#9b947f",
      "trim": "#8d846c",
      "glow": "#c3c4b0"
    },
    "refinement": {
      "solid": "bone",
      "bevel": 0.004,
      "taper": 1.0,
      "relief": 1.12,
      "wear": 0.73,
      "detail": "rib-crescent",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "WeaponSocket"
      ],
      "primary": [
        0,
        0,
        0
      ],
      "support": null
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 96,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_13_5.png",
      "sha256": "13b2bbabc440b5e5be7347655475e6f4c8d23eca63481733497dd61f8db09d63"
    },
    "brief": "A one-handed axe with a split rib-bone crescent blade, skull-tip rear spike and a pale segmented handle."
  },
  "u_gen_13_7": {
    "id": "u_gen_13_7",
    "revision": 2,
    "name": "Wolfsplit",
    "baseId": "axe_t7",
    "category": "axe",
    "slot": "main",
    "shape": "wolf",
    "finish": "steel",
    "length": 0.58,
    "width": 0.28,
    "motif": "wolf",
    "twoHand": false,
    "material": {
      "metal": "#81888a",
      "wood": "#49423a",
      "leather": "#3a3832",
      "cloth": "#3a3832",
      "trim": "#8c8772",
      "glow": "#a4b0b1"
    },
    "refinement": {
      "solid": "metal",
      "bevel": 0.004,
      "taper": 1.03,
      "relief": 1.15,
      "wear": 0.76,
      "detail": "wolf-socket",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "WeaponSocket"
      ],
      "primary": [
        0,
        0,
        0
      ],
      "support": null
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 97,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_13_7.png",
      "sha256": "d0c8acc17d425230790c404f29de42f99019c1811c7d4d2a4cbb9e0b4f8cdc3b"
    },
    "brief": "A one-handed axe with a snarling wolf-head blade socket, single steep wedge edge and dark fur-bound short handle."
  },
  "u_gen_13_9": {
    "id": "u_gen_13_9",
    "revision": 2,
    "name": "Huntsmaw",
    "baseId": "axe_t9",
    "category": "axe",
    "slot": "main",
    "shape": "dragon",
    "finish": "bone",
    "length": 0.62,
    "width": 0.29,
    "motif": "teeth",
    "twoHand": false,
    "material": {
      "metal": "#b4ad95",
      "wood": "#685540",
      "leather": "#494332",
      "cloth": "#494332",
      "trim": "#5c625e",
      "glow": "#a6a18d"
    },
    "refinement": {
      "solid": "bone",
      "bevel": 0.005,
      "taper": 1.01,
      "relief": 1.16,
      "wear": 0.81,
      "detail": "tooth-jaw",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "WeaponSocket"
      ],
      "primary": [
        0,
        0,
        0
      ],
      "support": null
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 98,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_13_9.png",
      "sha256": "97b01e961cedcb03be1c52d3894f9adbadea3a98276bb4171f318df94d514311"
    },
    "brief": "A one-handed axe formed from a dragon jaw, tooth-lined hooking blade, dark iron edge and a carved hunter's grip."
  },
  "u_gen_13_11": {
    "id": "u_gen_13_11",
    "revision": 2,
    "name": "Antlershear",
    "baseId": "axe_t11",
    "category": "axe",
    "slot": "main",
    "shape": "antler",
    "finish": "bone",
    "length": 0.65,
    "width": 0.3,
    "motif": "antlers",
    "twoHand": false,
    "material": {
      "metal": "#bdb9a1",
      "wood": "#685540",
      "leather": "#a19b82",
      "cloth": "#a19b82",
      "trim": "#a39370",
      "glow": "#c6cab4"
    },
    "refinement": {
      "solid": "bone",
      "bevel": 0.004,
      "taper": 1.06,
      "relief": 1.13,
      "wear": 0.53,
      "detail": "forked-antler",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "WeaponSocket"
      ],
      "primary": [
        0,
        0,
        0
      ],
      "support": null
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 99,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_13_11.png",
      "sha256": "1229581119f19e10152ecf4813f86a00b3f5a1871c9c77fec35084141c3324e8"
    },
    "brief": "A one-handed axe with a long forked antler-shaped rear hook, wide crescent cutting blade and pale engraved celestial haft."
  },
  "u_gen_11_1": {
    "id": "u_gen_11_1",
    "revision": 2,
    "name": "Earthshaker",
    "baseId": "mace2h_t2",
    "category": "mace",
    "slot": "main",
    "shape": "stone",
    "finish": "ash",
    "length": 0.86,
    "width": 0.21,
    "motif": "straps",
    "twoHand": true,
    "material": {
      "metal": "#77766e",
      "wood": "#3e362b",
      "leather": "#443e33",
      "cloth": "#443e33",
      "trim": "#656a69",
      "glow": "#b1a695"
    },
    "refinement": {
      "solid": "stone",
      "bevel": 0.008,
      "taper": 1.0,
      "relief": 0.94,
      "wear": 0.9,
      "detail": "earth-strata",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "TwoHandWeaponRig"
      ],
      "primary": [
        0,
        0,
        0
      ],
      "support": [
        0,
        -0.2,
        0
      ]
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 81,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_11_1.png",
      "sha256": "9f94843ec3b06fdda8d602b6aacf0f70d97a3b7f848bc52dc4a69f00ddaf6c26"
    },
    "brief": "A full-length two-handed maul with a huge rugged stone cuboid head, earth-layer bands and broad iron shoulder straps."
  },
  "u_gen_11_3": {
    "id": "u_gen_11_3",
    "revision": 2,
    "name": "Worldhammer",
    "baseId": "mace2h_t3",
    "category": "mace",
    "slot": "main",
    "shape": "globe",
    "finish": "bronze",
    "length": 0.89,
    "width": 0.19,
    "motif": "continents",
    "twoHand": true,
    "material": {
      "metal": "#7d8079",
      "wood": "#403a2f",
      "leather": "#4c4332",
      "cloth": "#4c4332",
      "trim": "#9c8962",
      "glow": "#b6ab86"
    },
    "refinement": {
      "solid": "metal",
      "bevel": 0.006,
      "taper": 1.02,
      "relief": 1.05,
      "wear": 0.78,
      "detail": "continents",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "TwoHandWeaponRig"
      ],
      "primary": [
        0,
        0,
        0
      ],
      "support": [
        0,
        -0.2,
        0
      ]
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 82,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_11_3.png",
      "sha256": "0cdc2473120b717613060cbb6cbc8e87d05569287f0001b05f27354ec6a13a14"
    },
    "brief": "A full-length two-handed maul with a globe-shaped massive iron head surrounded by broken continent-like plates."
  },
  "u_gen_11_5": {
    "id": "u_gen_11_5",
    "revision": 2,
    "name": "Tollbringer",
    "baseId": "mace2h_t5",
    "category": "mace",
    "slot": "main",
    "shape": "bell-cage",
    "finish": "bronze",
    "length": 0.88,
    "width": 0.17,
    "motif": "cage",
    "twoHand": true,
    "material": {
      "metal": "#938165",
      "wood": "#403a2f",
      "leather": "#463c2d",
      "cloth": "#463c2d",
      "trim": "#454944",
      "glow": "#a19370"
    },
    "refinement": {
      "solid": "metal",
      "bevel": 0.006,
      "taper": 0.97,
      "relief": 1.08,
      "wear": 0.82,
      "detail": "bell-cage",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "TwoHandWeaponRig"
      ],
      "primary": [
        0,
        0,
        0
      ],
      "support": [
        0,
        -0.2,
        0
      ]
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 83,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_11_5.png",
      "sha256": "912d2ad085e20b43c495fe46ab49f27ae7929984f26c9365d084afbaba88b012"
    },
    "brief": "A full-length two-handed maul with an enormous suspended church-bell head, angular black bell cage and long oak haft."
  },
  "u_gen_11_7": {
    "id": "u_gen_11_7",
    "revision": 2,
    "name": "Cataclysm",
    "baseId": "mace2h_t7",
    "category": "mace",
    "slot": "main",
    "shape": "anvil",
    "finish": "black",
    "length": 0.91,
    "width": 0.23,
    "motif": "crack",
    "twoHand": true,
    "material": {
      "metal": "#4c5051",
      "wood": "#322b27",
      "leather": "#39322d",
      "cloth": "#39322d",
      "trim": "#9c8059",
      "glow": "#be6345"
    },
    "refinement": {
      "solid": "metal",
      "bevel": 0.007,
      "taper": 1.07,
      "relief": 1.13,
      "wear": 0.9,
      "detail": "volcanic-split",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "TwoHandWeaponRig"
      ],
      "primary": [
        0,
        0,
        0
      ],
      "support": [
        0,
        -0.2,
        0
      ]
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 84,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_11_7.png",
      "sha256": "f604e04c0c3d1a6a81fbbedeceb75bdfa449b8fa2d6feea0c2ae0989fd26cc63"
    },
    "brief": "A full-length two-handed maul with a cracked volcanic anvil head, sharp bronze braces and red-hot split seam."
  },
  "u_gen_11_9": {
    "id": "u_gen_11_9",
    "revision": 2,
    "name": "Doomtoll",
    "baseId": "mace2h_t9",
    "category": "mace",
    "slot": "main",
    "shape": "skull-bell",
    "finish": "bone",
    "length": 0.92,
    "width": 0.18,
    "motif": "skull",
    "twoHand": true,
    "material": {
      "metal": "#a7a58f",
      "wood": "#685540",
      "leather": "#464136",
      "cloth": "#464136",
      "trim": "#8c8065",
      "glow": "#9ca095"
    },
    "refinement": {
      "solid": "bone",
      "bevel": 0.006,
      "taper": 1.02,
      "relief": 1.17,
      "wear": 0.86,
      "detail": "skull-cheeks",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "TwoHandWeaponRig"
      ],
      "primary": [
        0,
        0,
        0
      ],
      "support": [
        0,
        -0.2,
        0
      ]
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 85,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_11_9.png",
      "sha256": "2ddcde5930f7f8e1d06074612e2dcc1fecb13b2c6089f03079847a5d3221e798"
    },
    "brief": "A full-length two-handed maul with a gigantic skull-faced tolling bell head, bone cheek supports and dark dragonbone haft."
  },
  "u_gen_11_11": {
    "id": "u_gen_11_11",
    "revision": 2,
    "name": "The Sunken Peal",
    "baseId": "mace2h_t11",
    "category": "mace",
    "slot": "main",
    "shape": "diving-bell",
    "finish": "bronze",
    "length": 0.9,
    "width": 0.2,
    "motif": "coral",
    "twoHand": true,
    "material": {
      "metal": "#7f846a",
      "wood": "#403a2f",
      "leather": "#473f32",
      "cloth": "#473f32",
      "trim": "#71907e",
      "glow": "#a1ae95"
    },
    "refinement": {
      "solid": "metal",
      "bevel": 0.006,
      "taper": 1.03,
      "relief": 1.09,
      "wear": 0.9,
      "detail": "coral-patina",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "TwoHandWeaponRig"
      ],
      "primary": [
        0,
        0,
        0
      ],
      "support": [
        0,
        -0.2,
        0
      ]
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 86,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_11_11.png",
      "sha256": "64fdac06a858739b88ea85600ed24d1c9cc4e3f77ddac271717e5d782700a85f"
    },
    "brief": "A full-length two-handed maul with a deep bronze diving-bell head, green patina, coral ridges and a wrapped long haft."
  },
  "u_gen_14_0": {
    "id": "u_gen_14_0",
    "revision": 2,
    "name": "Vesper",
    "baseId": "mace_t1",
    "category": "mace",
    "slot": "main",
    "shape": "moon-lantern",
    "finish": "bronze",
    "length": 0.53,
    "width": 0.11,
    "motif": "moon",
    "twoHand": false,
    "material": {
      "metal": "#7f8485",
      "wood": "#403a2f",
      "leather": "#4d3d59",
      "cloth": "#4d3d59",
      "trim": "#9b8866",
      "glow": "#a99ebc"
    },
    "refinement": {
      "solid": "metal",
      "bevel": 0.004,
      "taper": 0.98,
      "relief": 1.1,
      "wear": 0.6,
      "detail": "moon-cage",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "WeaponSocket"
      ],
      "primary": [
        0,
        0,
        0
      ],
      "support": null
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 100,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_14_0.png",
      "sha256": "5c8fae2af832e49d9680fed09b14f181b4ce6c6d9efdf87f04fe151633d17b31"
    },
    "brief": "A one-handed iron mace with a crescent-moon weighted head, closed bronze lantern cage and deep violet grip."
  },
  "u_gen_14_2": {
    "id": "u_gen_14_2",
    "revision": 2,
    "name": "Bellringer",
    "baseId": "mace_t3",
    "category": "mace",
    "slot": "main",
    "shape": "handbell",
    "finish": "bronze",
    "length": 0.54,
    "width": 0.115,
    "motif": "clapper",
    "twoHand": false,
    "material": {
      "metal": "#968872",
      "wood": "#403a2f",
      "leather": "#514638",
      "cloth": "#514638",
      "trim": "#797e7e",
      "glow": "#b9ae93"
    },
    "refinement": {
      "solid": "metal",
      "bevel": 0.004,
      "taper": 1.0,
      "relief": 1.05,
      "wear": 0.66,
      "detail": "squared-socket",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "WeaponSocket"
      ],
      "primary": [
        0,
        0,
        0
      ],
      "support": null
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 101,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_14_2.png",
      "sha256": "7c23a0095fb959527e3e48df71e7c326bdb8c9018aa0b4d8b962c03eb1839092"
    },
    "brief": "A one-handed steel mace with a flared bronze handbell head, hanging central dark clapper and squared steel socket."
  },
  "u_gen_14_4": {
    "id": "u_gen_14_4",
    "revision": 2,
    "name": "Knell",
    "baseId": "mace_t4",
    "category": "mace",
    "slot": "main",
    "shape": "coffin",
    "finish": "steel",
    "length": 0.55,
    "width": 0.12,
    "motif": "flanges",
    "twoHand": false,
    "material": {
      "metal": "#737b7d",
      "wood": "#49423a",
      "leather": "#b6ae98",
      "cloth": "#b6ae98",
      "trim": "#a49a80",
      "glow": "#a8b6b7"
    },
    "refinement": {
      "solid": "metal",
      "bevel": 0.004,
      "taper": 0.98,
      "relief": 1.12,
      "wear": 0.72,
      "detail": "coffin-flanges",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "WeaponSocket"
      ],
      "primary": [
        0,
        0,
        0
      ],
      "support": null
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 102,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_14_4.png",
      "sha256": "b9fdb2e9ed877dc68998d89a849539407e615106483d8f447d4aca013b999c29"
    },
    "brief": "A one-handed mace with a small coffin-shaped iron head, paired horizontal side flanges and pale mourning cord."
  },
  "u_gen_14_6": {
    "id": "u_gen_14_6",
    "revision": 2,
    "name": "Sanctus",
    "baseId": "mace_t6",
    "category": "mace",
    "slot": "main",
    "shape": "cross",
    "finish": "gold",
    "length": 0.56,
    "width": 0.13,
    "motif": "cross",
    "twoHand": false,
    "material": {
      "metal": "#aaa796",
      "wood": "#65513a",
      "leather": "#672d31",
      "cloth": "#672d31",
      "trim": "#a68d53",
      "glow": "#bb634e"
    },
    "refinement": {
      "solid": "metal",
      "bevel": 0.004,
      "taper": 1.03,
      "relief": 1.12,
      "wear": 0.36,
      "detail": "chapel-reliquary",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "WeaponSocket"
      ],
      "primary": [
        0,
        0,
        0
      ],
      "support": null
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 103,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_14_6.png",
      "sha256": "0e868b54a01aa00ac46a95a4ace88721dcbcf8d91e15c195b7c481b754563d6e"
    },
    "brief": "A one-handed mace with a radiant chapel-cross weighted head, gold reliquary cage and a red glass central stone."
  },
  "u_gen_14_8": {
    "id": "u_gen_14_8",
    "revision": 2,
    "name": "Matins",
    "baseId": "mace_t8",
    "category": "mace",
    "slot": "main",
    "shape": "star",
    "finish": "steel",
    "length": 0.57,
    "width": 0.14,
    "motif": "rays",
    "twoHand": false,
    "material": {
      "metal": "#a7b5b9",
      "wood": "#49423a",
      "leather": "#364f69",
      "cloth": "#364f69",
      "trim": "#af9872",
      "glow": "#b9a573"
    },
    "refinement": {
      "solid": "metal",
      "bevel": 0.003,
      "taper": 1.01,
      "relief": 1.13,
      "wear": 0.34,
      "detail": "curved-rays",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "WeaponSocket"
      ],
      "primary": [
        0,
        0,
        0
      ],
      "support": null
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 104,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_14_8.png",
      "sha256": "eae165688f6b03f70129f82fbd53870a1e338029a276c819ece3650fb9b82a13"
    },
    "brief": "A one-handed mithral mace with an open dawn-star head, seven curved pale rays around an amber pearl and blue grip."
  },
  "u_gen_14_10": {
    "id": "u_gen_14_10",
    "revision": 2,
    "name": "Final Tithe",
    "baseId": "mace_t10",
    "category": "mace",
    "slot": "main",
    "shape": "chalice",
    "finish": "black",
    "length": 0.58,
    "width": 0.12,
    "motif": "coins",
    "twoHand": false,
    "material": {
      "metal": "#42474a",
      "wood": "#322b27",
      "leather": "#332f34",
      "cloth": "#332f34",
      "trim": "#9b8759",
      "glow": "#a89163"
    },
    "refinement": {
      "solid": "metal",
      "bevel": 0.005,
      "taper": 0.98,
      "relief": 1.08,
      "wear": 0.75,
      "detail": "coin-rim",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "WeaponSocket"
      ],
      "primary": [
        0,
        0,
        0
      ],
      "support": null
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 105,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_14_10.png",
      "sha256": "35f6608721c8e9306a01c8c62b46d807ff116fc7b726650606b11d66f3ac6315"
    },
    "brief": "A one-handed obsidian mace with a chalice-shaped heavy head, tiny coinlike brass rim plates and black cloth grip."
  },
  "u_gen_14_12": {
    "id": "u_gen_14_12",
    "revision": 2,
    "name": "Choir of Ash",
    "baseId": "mace_t12",
    "category": "mace",
    "slot": "main",
    "shape": "triple-bell",
    "finish": "gold",
    "length": 0.59,
    "width": 0.13,
    "motif": "bells",
    "twoHand": false,
    "material": {
      "metal": "#b6b29e",
      "wood": "#65513a",
      "leather": "#b4ad95",
      "cloth": "#b4ad95",
      "trim": "#aa925b",
      "glow": "#cfc5a1"
    },
    "refinement": {
      "solid": "metal",
      "bevel": 0.004,
      "taper": 1.0,
      "relief": 1.02,
      "wear": 0.65,
      "detail": "enamel-bells",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "WeaponSocket"
      ],
      "primary": [
        0,
        0,
        0
      ],
      "support": null
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 106,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_14_12.png",
      "sha256": "1f0013f63ca58872dd087f59126fcf6c11cef5a59861dd5a1cba192a7bb4df08"
    },
    "brief": "A one-handed sunforged mace with three fused miniature cathedral bells as its heavy head, burnt white enamel and gold shaft."
  },
  "u_gen_15_1": {
    "id": "u_gen_15_1",
    "revision": 2,
    "name": "Skyfall Pike",
    "baseId": "spear2h_t2",
    "category": "spear",
    "slot": "main",
    "shape": "comet",
    "finish": "steel",
    "length": 1.19,
    "width": 0.071,
    "motif": "fins",
    "twoHand": true,
    "material": {
      "metal": "#a3aba9",
      "wood": "#49423a",
      "leather": "#363b38",
      "cloth": "#363b38",
      "trim": "#9f987d",
      "glow": "#bdc2b0"
    },
    "refinement": {
      "solid": "metal",
      "bevel": 0.003,
      "taper": 0.96,
      "relief": 1.08,
      "wear": 0.47,
      "detail": "comet-fins",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "TwoHandWeaponRig"
      ],
      "primary": [
        0,
        0,
        0
      ],
      "support": [
        0,
        0.26,
        0
      ]
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 107,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_15_1.png",
      "sha256": "0d66db9f887a1eb6c4f808291c2b227d7bb564019e7322e52859f99d015d00ec"
    },
    "brief": "A full-length two-handed pike with a descending comet-shaped broad point, trailing pale metal fins and long dark shaft."
  },
  "u_gen_15_3": {
    "id": "u_gen_15_3",
    "revision": 2,
    "name": "Stormlance",
    "baseId": "spear2h_t3",
    "category": "spear",
    "slot": "main",
    "shape": "zigzag",
    "finish": "storm",
    "length": 1.17,
    "width": 0.075,
    "motif": "coil",
    "twoHand": true,
    "material": {
      "metal": "#7c929e",
      "wood": "#424950",
      "leather": "#34434e",
      "cloth": "#34434e",
      "trim": "#a68a64",
      "glow": "#9abdc5"
    },
    "refinement": {
      "solid": "metal",
      "bevel": 0.004,
      "taper": 0.98,
      "relief": 1.09,
      "wear": 0.57,
      "detail": "copper-coil",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "TwoHandWeaponRig"
      ],
      "primary": [
        0,
        0,
        0
      ],
      "support": [
        0,
        0.26,
        0
      ]
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 108,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_15_3.png",
      "sha256": "8fe4f8b497d2f8925951ccb1c4bb7c52bbb6413c1595c48ff7d37a7bb1bd4fab"
    },
    "brief": "A full-length two-handed lance with a split zigzag blue-steel spear point, copper coil socket and long banded shaft."
  },
  "u_gen_15_5": {
    "id": "u_gen_15_5",
    "revision": 2,
    "name": "Heaven's Reach",
    "baseId": "spear2h_t5",
    "category": "spear",
    "slot": "main",
    "shape": "wing",
    "finish": "gold",
    "length": 1.21,
    "width": 0.072,
    "motif": "wings",
    "twoHand": true,
    "material": {
      "metal": "#b5b9ae",
      "wood": "#65513a",
      "leather": "#bab5a4",
      "cloth": "#bab5a4",
      "trim": "#b09764",
      "glow": "#d2cba3"
    },
    "refinement": {
      "solid": "metal",
      "bevel": 0.003,
      "taper": 1.02,
      "relief": 1.14,
      "wear": 0.3,
      "detail": "arched-wings",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "TwoHandWeaponRig"
      ],
      "primary": [
        0,
        0,
        0
      ],
      "support": [
        0,
        0.26,
        0
      ]
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 109,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_15_5.png",
      "sha256": "77c4a96a91af01a25b05a321cec3ae59b07e849c8d12b2edf11555d4205dfdc5"
    },
    "brief": "A full-length two-handed spear with a high arched winged spearhead, central pale sunstone and a white knightly shaft."
  },
  "u_gen_15_7": {
    "id": "u_gen_15_7",
    "revision": 2,
    "name": "Thunderpike",
    "baseId": "spear2h_t7",
    "category": "spear",
    "slot": "main",
    "shape": "trident",
    "finish": "storm",
    "length": 1.2,
    "width": 0.085,
    "motif": "prongs",
    "twoHand": true,
    "material": {
      "metal": "#8595a0",
      "wood": "#424950",
      "leather": "#3d5b6c",
      "cloth": "#3d5b6c",
      "trim": "#978d71",
      "glow": "#99bfce"
    },
    "refinement": {
      "solid": "metal",
      "bevel": 0.004,
      "taper": 1.04,
      "relief": 1.12,
      "wear": 0.56,
      "detail": "runed-fork",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "TwoHandWeaponRig"
      ],
      "primary": [
        0,
        0,
        0
      ],
      "support": [
        0,
        0.26,
        0
      ]
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 110,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_15_7.png",
      "sha256": "dcdd3804760b3975e167ad9d69cf2375c3614982cbde7575bbd17e59bd3bc334"
    },
    "brief": "A full-length two-handed pike with a three-pronged forked lightning tip, bulky runed collar and storm-blue bindings."
  },
  "u_gen_15_9": {
    "id": "u_gen_15_9",
    "revision": 2,
    "name": "Tempest's Descent",
    "baseId": "spear2h_t9",
    "category": "spear",
    "slot": "main",
    "shape": "ribbon",
    "finish": "bone",
    "length": 1.23,
    "width": 0.062,
    "motif": "spiral",
    "twoHand": true,
    "material": {
      "metal": "#bbb7a6",
      "wood": "#685540",
      "leather": "#3f413d",
      "cloth": "#3f413d",
      "trim": "#8f9c9c",
      "glow": "#aebeb6"
    },
    "refinement": {
      "solid": "bone",
      "bevel": 0.003,
      "taper": 0.98,
      "relief": 1.1,
      "wear": 0.51,
      "detail": "spiral-ribbon",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "TwoHandWeaponRig"
      ],
      "primary": [
        0,
        0,
        0
      ],
      "support": [
        0,
        0.26,
        0
      ]
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 111,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_15_9.png",
      "sha256": "17256ca0cd5113e689a2aa713ead7754b8d787d87cf02f8417fc6845c167806b"
    },
    "brief": "A full-length two-handed spear with a long dragonbone blade wrapped by a spiraling metal lightning ribbon and dark shaft."
  },
  "u_gen_15_11": {
    "id": "u_gen_15_11",
    "revision": 2,
    "name": "Cloudpiercer",
    "baseId": "spear2h_t11",
    "category": "spear",
    "slot": "main",
    "shape": "feather",
    "finish": "sky",
    "length": 1.22,
    "width": 0.055,
    "motif": "feathers",
    "twoHand": true,
    "material": {
      "metal": "#99b1bd",
      "wood": "#655d4d",
      "leather": "#b0b7ae",
      "cloth": "#b0b7ae",
      "trim": "#ab9460",
      "glow": "#b9d0d5"
    },
    "refinement": {
      "solid": "metal",
      "bevel": 0.003,
      "taper": 0.94,
      "relief": 1.09,
      "wear": 0.32,
      "detail": "feather-guards",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "TwoHandWeaponRig"
      ],
      "primary": [
        0,
        0,
        0
      ],
      "support": [
        0,
        0.26,
        0
      ]
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 112,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_15_11.png",
      "sha256": "44d63397aaa71633a99d030a3ee74df89e3df38ad92d88f4eb0c45363542d5a8"
    },
    "brief": "A full-length two-handed spear with a long narrow sky-blue point, featherlike gold side guards and pale celestial shaft."
  },
  "u_gen_4_0": {
    "id": "u_gen_4_0",
    "revision": 2,
    "name": "Tempest",
    "baseId": "staff2h_t1",
    "category": "staff",
    "slot": "main",
    "shape": "vortex",
    "finish": "storm",
    "length": 1.04,
    "width": 0.14,
    "motif": "spiral",
    "twoHand": true,
    "material": {
      "metal": "#969f9e",
      "wood": "#424950",
      "leather": "#494c45",
      "cloth": "#494c45",
      "trim": "#a39a7c",
      "glow": "#779faf"
    },
    "refinement": {
      "solid": "metal",
      "bevel": 0.004,
      "taper": 1.03,
      "relief": 1.12,
      "wear": 0.67,
      "detail": "silver-vortex",
      "emission": 0.14
    },
    "attachment": {
      "parents": [
        "TwoHandWeaponRig"
      ],
      "primary": [
        0,
        0,
        0
      ],
      "support": [
        0,
        0.3,
        0
      ]
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 35,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_4_0.png",
      "sha256": "686c31abd5f0baccecbd06365528f4fd262c12ba2118b1b79277b640c9e2bb77"
    },
    "brief": "A full-length staff topped by a spiraling open storm vortex of aged silver ribbons, central blue storm pearl and crooked wood shaft."
  },
  "u_gen_4_2": {
    "id": "u_gen_4_2",
    "revision": 2,
    "name": "Emberheart",
    "baseId": "staff2h_t3",
    "category": "staff",
    "slot": "main",
    "shape": "heart",
    "finish": "blood",
    "length": 1.02,
    "width": 0.13,
    "motif": "prongs",
    "twoHand": true,
    "material": {
      "metal": "#535955",
      "wood": "#472e23",
      "leather": "#723831",
      "cloth": "#723831",
      "trim": "#978167",
      "glow": "#c67545"
    },
    "refinement": {
      "solid": "metal",
      "bevel": 0.005,
      "taper": 1.0,
      "relief": 1.15,
      "wear": 0.81,
      "detail": "cracked-heart",
      "emission": 0.14
    },
    "attachment": {
      "parents": [
        "TwoHandWeaponRig"
      ],
      "primary": [
        0,
        0,
        0
      ],
      "support": [
        0,
        0.3,
        0
      ]
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 36,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_4_2.png",
      "sha256": "89f4337e9f2a4d99fbebf81a796c35d56613387331b4699337c079a57158eb8d"
    },
    "brief": "A full-length steel staff topped by a cracked iron heart containing an ember, three upward charcoal prongs and red wrapped shaft."
  },
  "u_gen_4_4": {
    "id": "u_gen_4_4",
    "revision": 2,
    "name": "Frostward Rod",
    "baseId": "staff2h_t4",
    "category": "staff",
    "slot": "main",
    "shape": "lantern",
    "finish": "frost",
    "length": 1.05,
    "width": 0.12,
    "motif": "shield",
    "twoHand": true,
    "material": {
      "metal": "#acbbc0",
      "wood": "#617a86",
      "leather": "#b3bbae",
      "cloth": "#b3bbae",
      "trim": "#aab6ac",
      "glow": "#a1c6d0"
    },
    "refinement": {
      "solid": "metal",
      "bevel": 0.004,
      "taper": 0.96,
      "relief": 1.03,
      "wear": 0.38,
      "detail": "frosted-lantern",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "TwoHandWeaponRig"
      ],
      "primary": [
        0,
        0,
        0
      ],
      "support": [
        0,
        0.3,
        0
      ]
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 37,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_4_4.png",
      "sha256": "ae072b31a25ebb75a4b5810f7bbd4c161dca4c54e0c26543a7ec6714a7aaa5ae"
    },
    "brief": "A full-length staff topped by a square frosted protective lantern, icy shield-shaped metal frame and pale wrapped shaft."
  },
  "u_gen_4_6": {
    "id": "u_gen_4_6",
    "revision": 2,
    "name": "Stormcrown",
    "baseId": "staff2h_t6",
    "category": "staff",
    "slot": "main",
    "shape": "crown",
    "finish": "bronze",
    "length": 1.06,
    "width": 0.14,
    "motif": "lightning",
    "twoHand": true,
    "material": {
      "metal": "#8d9291",
      "wood": "#403a2f",
      "leather": "#49404a",
      "cloth": "#49404a",
      "trim": "#a48660",
      "glow": "#8c80b4"
    },
    "refinement": {
      "solid": "metal",
      "bevel": 0.004,
      "taper": 1.03,
      "relief": 1.09,
      "wear": 0.61,
      "detail": "copper-crown",
      "emission": 0.14
    },
    "attachment": {
      "parents": [
        "TwoHandWeaponRig"
      ],
      "primary": [
        0,
        0,
        0
      ],
      "support": [
        0,
        0.3,
        0
      ]
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 38,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_4_6.png",
      "sha256": "11d59097ee850c85d4d980b646340c7b4fd3249070878ac49ca64bd7880d31a6"
    },
    "brief": "A full-length staff topped by an open crown of three lightning prongs around a purple stormstone, copper shaft bands."
  },
  "u_gen_4_8": {
    "id": "u_gen_4_8",
    "revision": 2,
    "name": "Cinderveil",
    "baseId": "staff2h_t8",
    "category": "staff",
    "slot": "main",
    "shape": "veil",
    "finish": "ash",
    "length": 1.03,
    "width": 0.13,
    "motif": "veil",
    "twoHand": true,
    "material": {
      "metal": "#635e55",
      "wood": "#3e362b",
      "leather": "#343330",
      "cloth": "#343330",
      "trim": "#998361",
      "glow": "#9e7650"
    },
    "refinement": {
      "solid": "metal",
      "bevel": 0.003,
      "taper": 0.99,
      "relief": 1.08,
      "wear": 0.9,
      "detail": "bronze-veil",
      "emission": 0.14
    },
    "attachment": {
      "parents": [
        "TwoHandWeaponRig"
      ],
      "primary": [
        0,
        0,
        0
      ],
      "support": [
        0,
        0.3,
        0
      ]
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 39,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_4_8.png",
      "sha256": "adc3d61283a84ebf936099452710042ea81374cc4252dd2364d93b109c212d21"
    },
    "brief": "A full-length staff topped by a hanging hood of ash-dark filigree over a coal, thin ragged bronze veils and black shaft."
  },
  "u_gen_4_10": {
    "id": "u_gen_4_10",
    "revision": 2,
    "name": "The Glacial Maelstrom",
    "baseId": "staff2h_t10",
    "category": "staff",
    "slot": "main",
    "shape": "ice",
    "finish": "frost",
    "length": 1.07,
    "width": 0.16,
    "motif": "shards",
    "twoHand": true,
    "material": {
      "metal": "#b0c3ca",
      "wood": "#617a86",
      "leather": "#333641",
      "cloth": "#333641",
      "trim": "#91a9b2",
      "glow": "#689aaf"
    },
    "refinement": {
      "solid": "metal",
      "bevel": 0.004,
      "taper": 1.06,
      "relief": 1.16,
      "wear": 0.29,
      "detail": "jagged-ice",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "TwoHandWeaponRig"
      ],
      "primary": [
        0,
        0,
        0
      ],
      "support": [
        0,
        0.3,
        0
      ]
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 40,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_4_10.png",
      "sha256": "4a51f42cd389d67d21870394114dfbfcacae33b80963be7d809bd58e809cadd8"
    },
    "brief": "A full-length obsidian staff topped by interlocking jagged ice spirals around a deep blue orb, sharp pale projections."
  },
  "u_gen_4_12": {
    "id": "u_gen_4_12",
    "revision": 2,
    "name": "Thunderspire",
    "baseId": "staff2h_t12",
    "category": "staff",
    "slot": "main",
    "shape": "spire",
    "finish": "gold",
    "length": 1.09,
    "width": 0.14,
    "motif": "branches",
    "twoHand": true,
    "material": {
      "metal": "#a69b7c",
      "wood": "#65513a",
      "leather": "#323433",
      "cloth": "#323433",
      "trim": "#b29656",
      "glow": "#b4aede"
    },
    "refinement": {
      "solid": "metal",
      "bevel": 0.004,
      "taper": 1.04,
      "relief": 1.1,
      "wear": 0.51,
      "detail": "tiered-spire",
      "emission": 0.14
    },
    "attachment": {
      "parents": [
        "TwoHandWeaponRig"
      ],
      "primary": [
        0,
        0,
        0
      ],
      "support": [
        0,
        0.3,
        0
      ]
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 41,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_4_12.png",
      "sha256": "f5a303d7ba5b675cbab615256fc05eb4e0265acfa992e91d237ffa3b361124b4"
    },
    "brief": "A full-length gold-and-black staff topped by a tall tiered thunder spire with four pointed branches and a bright stormstone."
  },
  "u_gen_5_1": {
    "id": "u_gen_5_1",
    "revision": 2,
    "name": "Hexfinger",
    "baseId": "wand_t2",
    "category": "wand",
    "slot": "main",
    "shape": "finger",
    "finish": "bone",
    "length": 0.42,
    "width": 0.04,
    "motif": "joints",
    "twoHand": false,
    "material": {
      "metal": "#b5b09d",
      "wood": "#685540",
      "leather": "#4a463b",
      "cloth": "#4a463b",
      "trim": "#8c8270",
      "glow": "#9282a1"
    },
    "refinement": {
      "solid": "bone",
      "bevel": 0.002,
      "taper": 0.95,
      "relief": 1.02,
      "wear": 0.73,
      "detail": "joint-rings",
      "emission": 0.14
    },
    "attachment": {
      "parents": [
        "WeaponSocket"
      ],
      "primary": [
        0,
        0,
        0
      ],
      "support": null
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 42,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_5_1.png",
      "sha256": "7170f343b7ce1a72c19e28164dd86e5956a714920053438339a856aa66f6acc5"
    },
    "brief": "A short wand resembling a crooked skeletal finger with three joint rings, a tiny purple eye setting and hooked fingertip."
  },
  "u_gen_5_3": {
    "id": "u_gen_5_3",
    "revision": 2,
    "name": "Soulwhisper",
    "baseId": "wand_t3",
    "category": "wand",
    "slot": "main",
    "shape": "mouth",
    "finish": "steel",
    "length": 0.44,
    "width": 0.047,
    "motif": "beads",
    "twoHand": false,
    "material": {
      "metal": "#929ea0",
      "wood": "#49423a",
      "leather": "#34333a",
      "cloth": "#34333a",
      "trim": "#989a88",
      "glow": "#afc4be"
    },
    "refinement": {
      "solid": "metal",
      "bevel": 0.002,
      "taper": 0.95,
      "relief": 1.03,
      "wear": 0.52,
      "detail": "soul-beads",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "WeaponSocket"
      ],
      "primary": [
        0,
        0,
        0
      ],
      "support": null
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 43,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_5_3.png",
      "sha256": "979461cc91b3f63d07bde71b7d75ee3aede21bc22c380071d4517d910d714880"
    },
    "brief": "A short wand with a hollow silver mouth-shaped head, hanging pale soul beads and a black spiral-carved stem."
  },
  "u_gen_5_5": {
    "id": "u_gen_5_5",
    "revision": 2,
    "name": "Gravewand",
    "baseId": "wand_t5",
    "category": "wand",
    "slot": "main",
    "shape": "tomb",
    "finish": "bone",
    "length": 0.45,
    "width": 0.05,
    "motif": "ribs",
    "twoHand": false,
    "material": {
      "metal": "#c0baa4",
      "wood": "#685540",
      "leather": "#aaa58e",
      "cloth": "#aaa58e",
      "trim": "#636960",
      "glow": "#afbbad"
    },
    "refinement": {
      "solid": "bone",
      "bevel": 0.003,
      "taper": 1.05,
      "relief": 1.1,
      "wear": 0.83,
      "detail": "rib-forks",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "WeaponSocket"
      ],
      "primary": [
        0,
        0,
        0
      ],
      "support": null
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 44,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_5_5.png",
      "sha256": "c230052711e184467fbd3be574e7873f2cd5d5c69aee5870c736deb53bfa43d3"
    },
    "brief": "A short bone wand topped by a miniature tombstone held between two rib forks, aged ivory shaft and cracked iron foot."
  },
  "u_gen_5_7": {
    "id": "u_gen_5_7",
    "revision": 2,
    "name": "Rotcaller",
    "baseId": "wand_t7",
    "category": "wand",
    "slot": "main",
    "shape": "pod",
    "finish": "venom",
    "length": 0.43,
    "width": 0.055,
    "motif": "fungus",
    "twoHand": false,
    "material": {
      "metal": "#787c62",
      "wood": "#3f442d",
      "leather": "#3c4131",
      "cloth": "#3c4131",
      "trim": "#789076",
      "glow": "#a1af6e"
    },
    "refinement": {
      "solid": "wood",
      "bevel": 0.003,
      "taper": 1.03,
      "relief": 1.09,
      "wear": 0.88,
      "detail": "split-pod",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "WeaponSocket"
      ],
      "primary": [
        0,
        0,
        0
      ],
      "support": null
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 45,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_5_7.png",
      "sha256": "ffcf412b6e1b3954728f06505013d34aea6af26ce66945135362431bfffe4bf5"
    },
    "brief": "A short gnarled wand topped by a rotten seed pod split into three hooked lobes, fungus inlays and green copper bands."
  },
  "u_gen_5_9": {
    "id": "u_gen_5_9",
    "revision": 2,
    "name": "Tombquill",
    "baseId": "wand_t9",
    "category": "wand",
    "slot": "main",
    "shape": "quill",
    "finish": "bone",
    "length": 0.46,
    "width": 0.044,
    "motif": "feather",
    "twoHand": false,
    "material": {
      "metal": "#c2bfaa",
      "wood": "#685540",
      "leather": "#403b36",
      "cloth": "#403b36",
      "trim": "#968c70",
      "glow": "#9caeb0"
    },
    "refinement": {
      "solid": "bone",
      "bevel": 0.002,
      "taper": 0.91,
      "relief": 1.02,
      "wear": 0.64,
      "detail": "carved-quill",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "WeaponSocket"
      ],
      "primary": [
        0,
        0,
        0
      ],
      "support": null
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 46,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_5_9.png",
      "sha256": "979149a17d0ce80da865f07ebe2fe50f6c1392c5a5602fbc0956c0f6fb22a736"
    },
    "brief": "A short dragonbone wand shaped as a funerary quill, carved feather blade head and an ink-dark marrow tip."
  },
  "u_gen_5_11": {
    "id": "u_gen_5_11",
    "revision": 2,
    "name": "Wraithsplinter",
    "baseId": "wand_t11",
    "category": "wand",
    "slot": "main",
    "shape": "splinter",
    "finish": "void",
    "length": 0.48,
    "width": 0.049,
    "motif": "prongs",
    "twoHand": false,
    "material": {
      "metal": "#bbc1c4",
      "wood": "#342d3b",
      "leather": "#484353",
      "cloth": "#484353",
      "trim": "#a3aab1",
      "glow": "#aaa5d0"
    },
    "refinement": {
      "solid": "bone",
      "bevel": 0.002,
      "taper": 0.96,
      "relief": 1.07,
      "wear": 0.3,
      "detail": "ghost-cage",
      "emission": 0.14
    },
    "attachment": {
      "parents": [
        "WeaponSocket"
      ],
      "primary": [
        0,
        0,
        0
      ],
      "support": null
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 47,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_5_11.png",
      "sha256": "2cfc0281223c58302bdb6fa56dd1d4da501ccda0c839a84b72c7c84863be63af"
    },
    "brief": "A short translucent pale wand with a long forked splinter head, trapped ghost-face silhouette and silver grip cage."
  },
  "u_gen_3_1": {
    "id": "u_gen_3_1",
    "revision": 2,
    "name": "Wintershot",
    "baseId": "bow2h_t2",
    "category": "bow",
    "slot": "main",
    "shape": "crystal",
    "finish": "frost",
    "length": 0.65,
    "width": 0.023,
    "motif": "snowflake",
    "twoHand": true,
    "material": {
      "metal": "#b2c3c7",
      "wood": "#617a86",
      "leather": "#b4b9ac",
      "cloth": "#b4b9ac",
      "trim": "#b7c5bf",
      "glow": "#a2c7d2"
    },
    "refinement": {
      "solid": "bone",
      "bevel": 0.003,
      "taper": 1.02,
      "relief": 1.08,
      "wear": 0.35,
      "detail": "crystal-tips",
      "emission": 0.14
    },
    "attachment": {
      "parents": [
        "TwoHandWeaponRig"
      ],
      "primary": [
        0,
        0,
        -0.08
      ],
      "support": [
        0,
        0,
        0.2
      ],
      "projectileSocket": [
        0,
        0,
        0.2
      ],
      "ranged": {
        "handRest": [
          0,
          0,
          -0.08
        ],
        "stringRest": -0.08,
        "drawDistance": 0.3
      }
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 29,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_3_1.png",
      "sha256": "af5f49b4960f5eedba75b134cdf7c2ff2eef707e3229da674b7621162a7e119d"
    },
    "brief": "A full recurve bow of pale frozen wood with crystalline limb tips, snowflake-shaped grip brace and a taut silver string."
  },
  "u_gen_3_3": {
    "id": "u_gen_3_3",
    "revision": 2,
    "name": "Stormstring",
    "baseId": "bow2h_t3",
    "category": "bow",
    "slot": "main",
    "shape": "zigzag",
    "finish": "storm",
    "length": 0.64,
    "width": 0.028,
    "motif": "lightning",
    "twoHand": true,
    "material": {
      "metal": "#788f99",
      "wood": "#424950",
      "leather": "#3f4b4e",
      "cloth": "#3f4b4e",
      "trim": "#a28459",
      "glow": "#86b7c2"
    },
    "refinement": {
      "solid": "metal",
      "bevel": 0.003,
      "taper": 1.0,
      "relief": 1.09,
      "wear": 0.58,
      "detail": "copper-lightning",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "TwoHandWeaponRig"
      ],
      "primary": [
        0,
        0,
        -0.08
      ],
      "support": [
        0,
        0,
        0.2
      ],
      "projectileSocket": [
        0,
        0,
        0.2
      ],
      "ranged": {
        "handRest": [
          0,
          0,
          -0.08
        ],
        "stringRest": -0.08,
        "drawDistance": 0.3
      }
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 30,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_3_3.png",
      "sha256": "4749fb89ca5cdc9f51f75587265066d5631461274f5a138b32e3ed2db143dc0e"
    },
    "brief": "A full steel-and-wood bow with forked lightning limbs, copper-wound grip and a zigzag central brace."
  },
  "u_gen_3_5": {
    "id": "u_gen_3_5",
    "revision": 2,
    "name": "Farsong",
    "baseId": "bow2h_t5",
    "category": "bow",
    "slot": "main",
    "shape": "fork",
    "finish": "steel",
    "length": 0.68,
    "width": 0.021,
    "motif": "bird",
    "twoHand": true,
    "material": {
      "metal": "#929f93",
      "wood": "#49423a",
      "leather": "#4a4936",
      "cloth": "#4a4936",
      "trim": "#9e9f85",
      "glow": "#b7bf9b"
    },
    "refinement": {
      "solid": "wood",
      "bevel": 0.002,
      "taper": 0.95,
      "relief": 1.04,
      "wear": 0.42,
      "detail": "split-songbird",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "TwoHandWeaponRig"
      ],
      "primary": [
        0,
        0,
        -0.08
      ],
      "support": [
        0,
        0,
        0.2
      ],
      "projectileSocket": [
        0,
        0,
        0.2
      ],
      "ranged": {
        "handRest": [
          0,
          0,
          -0.08
        ],
        "stringRest": -0.08,
        "drawDistance": 0.3
      }
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 31,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_3_5.png",
      "sha256": "bcfc8cd978b54fb88f89b432ab5bfeec24cd55a258fd8f9d52348bc7994bd074"
    },
    "brief": "A full elegant longbow with a tuning-fork split upper limb, carved songbird grip and fine taut string."
  },
  "u_gen_3_7": {
    "id": "u_gen_3_7",
    "revision": 2,
    "name": "Hawkeye",
    "baseId": "bow2h_t7",
    "category": "bow",
    "slot": "main",
    "shape": "feather",
    "finish": "bronze",
    "length": 0.63,
    "width": 0.025,
    "motif": "eye",
    "twoHand": true,
    "material": {
      "metal": "#8c8671",
      "wood": "#403a2f",
      "leather": "#494332",
      "cloth": "#494332",
      "trim": "#a5905c",
      "glow": "#bba365"
    },
    "refinement": {
      "solid": "wood",
      "bevel": 0.003,
      "taper": 1.02,
      "relief": 1.1,
      "wear": 0.69,
      "detail": "hooked-feathers",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "TwoHandWeaponRig"
      ],
      "primary": [
        0,
        0,
        -0.08
      ],
      "support": [
        0,
        0,
        0.2
      ],
      "projectileSocket": [
        0,
        0,
        0.2
      ],
      "ranged": {
        "handRest": [
          0,
          0,
          -0.08
        ],
        "stringRest": -0.08,
        "drawDistance": 0.3
      }
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 32,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_3_7.png",
      "sha256": "754cfb1d71ba52d1128bc4491bebba3ff4ba5468571948397dbf4a2000ee901d"
    },
    "brief": "A full hooked hunting bow with an amber hawk-eye setting in its grip, feather-shaped limb guards and taut string."
  },
  "u_gen_3_9": {
    "id": "u_gen_3_9",
    "revision": 2,
    "name": "Frostpierce",
    "baseId": "bow2h_t9",
    "category": "bow",
    "slot": "main",
    "shape": "vertebra",
    "finish": "bone",
    "length": 0.67,
    "width": 0.031,
    "motif": "teeth",
    "twoHand": true,
    "material": {
      "metal": "#b7bcae",
      "wood": "#685540",
      "leather": "#3c5c76",
      "cloth": "#3c5c76",
      "trim": "#a2b9bf",
      "glow": "#9ec5d4"
    },
    "refinement": {
      "solid": "bone",
      "bevel": 0.003,
      "taper": 1.04,
      "relief": 1.12,
      "wear": 0.47,
      "detail": "vertebral-frost",
      "emission": 0.14
    },
    "attachment": {
      "parents": [
        "TwoHandWeaponRig"
      ],
      "primary": [
        0,
        0,
        -0.08
      ],
      "support": [
        0,
        0,
        0.2
      ],
      "projectileSocket": [
        0,
        0,
        0.2
      ],
      "ranged": {
        "handRest": [
          0,
          0,
          -0.08
        ],
        "stringRest": -0.08,
        "drawDistance": 0.3
      }
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 33,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_3_9.png",
      "sha256": "1d169c555ea517a1e0ee8a0630f4231dc398c2bc3a38022326901daea3b37357"
    },
    "brief": "A full dragonbone bow with ice-tipped vertebral limbs, a deep blue crystalline grip and a toothed frost brace."
  },
  "u_gen_3_11": {
    "id": "u_gen_3_11",
    "revision": 2,
    "name": "The Distant Tempest",
    "baseId": "bow2h_t11",
    "category": "bow",
    "slot": "main",
    "shape": "scroll",
    "finish": "storm",
    "length": 0.69,
    "width": 0.03,
    "motif": "pearls",
    "twoHand": true,
    "material": {
      "metal": "#91a7b7",
      "wood": "#424950",
      "leather": "#354356",
      "cloth": "#354356",
      "trim": "#a5a28d",
      "glow": "#b8c5d2"
    },
    "refinement": {
      "solid": "metal",
      "bevel": 0.003,
      "taper": 1.06,
      "relief": 1.1,
      "wear": 0.46,
      "detail": "pearl-scrollwork",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "TwoHandWeaponRig"
      ],
      "primary": [
        0,
        0,
        -0.08
      ],
      "support": [
        0,
        0,
        0.2
      ],
      "projectileSocket": [
        0,
        0,
        0.2
      ],
      "ranged": {
        "handRest": [
          0,
          0,
          -0.08
        ],
        "stringRest": -0.08,
        "drawDistance": 0.3
      }
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 34,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_3_11.png",
      "sha256": "ad376888e6407002b1f1d9ba10882794333451f8265f7fb4a33685f4060b3a5d"
    },
    "brief": "A full wide celestial bow with storm-cloud scrollwork limbs, suspended pearl lightning nodes and a dark indigo grip."
  },
  "u_gen_16_0": {
    "id": "u_gen_16_0",
    "revision": 2,
    "name": "Heartseeker",
    "baseId": "crossbow2h_t1",
    "category": "crossbow",
    "slot": "main",
    "shape": "heart",
    "finish": "blood",
    "length": 0.34,
    "width": 0.34,
    "motif": "heart",
    "twoHand": true,
    "material": {
      "metal": "#8c625c",
      "wood": "#472e23",
      "leather": "#302c2e",
      "cloth": "#302c2e",
      "trim": "#998771",
      "glow": "#a44b4d"
    },
    "refinement": {
      "solid": "metal",
      "bevel": 0.004,
      "taper": 0.98,
      "relief": 1.1,
      "wear": 0.58,
      "detail": "hooked-heart",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "TwoHandWeaponRig"
      ],
      "primary": [
        0,
        -0.07,
        -0.065
      ],
      "support": [
        0,
        -0.045,
        0.16
      ],
      "projectileSocket": [
        0,
        0.055,
        0.36
      ],
      "ranged": {
        "handRest": [
          0,
          -0.07,
          -0.065
        ],
        "stringRest": 0.19,
        "drawDistance": 0.17,
        "reloadSide": 0.032,
        "reloadLift": 0.125,
        "reloadAdvance": 0.255
      }
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 113,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_16_0.png",
      "sha256": "56c5aa01b99f417e72be4367684fd6352ff7a819aa1cdc11381289e072267ff2"
    },
    "brief": "A full crossbow with a heart-shaped red iron central brace, sharp hooked limbs and an elegant black stock, no loaded bolt."
  },
  "u_gen_16_2": {
    "id": "u_gen_16_2",
    "revision": 2,
    "name": "Repeater",
    "baseId": "crossbow2h_t3",
    "category": "crossbow",
    "slot": "main",
    "shape": "repeater",
    "finish": "steel",
    "length": 0.31,
    "width": 0.32,
    "motif": "magazine",
    "twoHand": true,
    "material": {
      "metal": "#7f8787",
      "wood": "#49423a",
      "leather": "#484137",
      "cloth": "#484137",
      "trim": "#8c8773",
      "glow": "#a9b1a0"
    },
    "refinement": {
      "solid": "metal",
      "bevel": 0.005,
      "taper": 1.0,
      "relief": 1.02,
      "wear": 0.78,
      "detail": "magazine-crank",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "TwoHandWeaponRig"
      ],
      "primary": [
        0,
        -0.07,
        -0.065
      ],
      "support": [
        0,
        -0.045,
        0.16
      ],
      "projectileSocket": [
        0,
        0.055,
        0.36
      ],
      "ranged": {
        "handRest": [
          0,
          -0.07,
          -0.065
        ],
        "stringRest": 0.19,
        "drawDistance": 0.17,
        "reloadSide": 0.032,
        "reloadLift": 0.125,
        "reloadAdvance": 0.255
      }
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 114,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_16_2.png",
      "sha256": "e1141c73bf9d467fe6639b826008a49b62681b63761fd2484478723ce10ea2da"
    },
    "brief": "A full repeating crossbow with stacked rectangular bolt magazines, twin compact steel limbs and a rugged lever crank."
  },
  "u_gen_16_4": {
    "id": "u_gen_16_4",
    "revision": 2,
    "name": "Boltwidow",
    "baseId": "crossbow2h_t4",
    "category": "crossbow",
    "slot": "main",
    "shape": "spider",
    "finish": "black",
    "length": 0.38,
    "width": 0.35,
    "motif": "legs",
    "twoHand": true,
    "material": {
      "metal": "#3b4042",
      "wood": "#322b27",
      "leather": "#303036",
      "cloth": "#303036",
      "trim": "#6e6e69",
      "glow": "#a9524d"
    },
    "refinement": {
      "solid": "metal",
      "bevel": 0.003,
      "taper": 0.94,
      "relief": 1.08,
      "wear": 0.63,
      "detail": "spider-joints",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "TwoHandWeaponRig"
      ],
      "primary": [
        0,
        -0.07,
        -0.065
      ],
      "support": [
        0,
        -0.045,
        0.16
      ],
      "projectileSocket": [
        0,
        0.055,
        0.36
      ],
      "ranged": {
        "handRest": [
          0,
          -0.07,
          -0.065
        ],
        "stringRest": 0.19,
        "drawDistance": 0.17,
        "reloadSide": 0.032,
        "reloadLift": 0.125,
        "reloadAdvance": 0.255
      }
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 115,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_16_4.png",
      "sha256": "31bfaa1439d79f4614151b7c38fb274687c0687f4ff0ef4ac3f37a303271c966"
    },
    "brief": "A full crossbow with black widow-spider shaped limb joints, a long narrow stock, small crimson markings and a taut string."
  },
  "u_gen_16_6": {
    "id": "u_gen_16_6",
    "revision": 2,
    "name": "Killshot",
    "baseId": "crossbow2h_t6",
    "category": "crossbow",
    "slot": "main",
    "shape": "heavy",
    "finish": "steel",
    "length": 0.33,
    "width": 0.41,
    "motif": "sight",
    "twoHand": true,
    "material": {
      "metal": "#808a8e",
      "wood": "#49423a",
      "leather": "#4b5152",
      "cloth": "#4b5152",
      "trim": "#929083",
      "glow": "#b6c2c2"
    },
    "refinement": {
      "solid": "metal",
      "bevel": 0.006,
      "taper": 1.07,
      "relief": 0.97,
      "wear": 0.71,
      "detail": "sight-guard",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "TwoHandWeaponRig"
      ],
      "primary": [
        0,
        -0.07,
        -0.065
      ],
      "support": [
        0,
        -0.045,
        0.16
      ],
      "projectileSocket": [
        0,
        0.055,
        0.36
      ],
      "ranged": {
        "handRest": [
          0,
          -0.07,
          -0.065
        ],
        "stringRest": 0.19,
        "drawDistance": 0.17,
        "reloadSide": 0.032,
        "reloadLift": 0.125,
        "reloadAdvance": 0.255
      }
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 116,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_16_6.png",
      "sha256": "2953e4d6607d843036dc528f4d95a99bcf225ea2fa38d834864ade00a8d487b0"
    },
    "brief": "A full heavy crossbow with a square sight frame, oversized steel limbs, black finger guard and a thick gray stock."
  },
  "u_gen_16_8": {
    "id": "u_gen_16_8",
    "revision": 2,
    "name": "Pulsebreaker",
    "baseId": "crossbow2h_t8",
    "category": "crossbow",
    "slot": "main",
    "shape": "pulse",
    "finish": "steel",
    "length": 0.36,
    "width": 0.38,
    "motif": "ring",
    "twoHand": true,
    "material": {
      "metal": "#9aaeb7",
      "wood": "#49423a",
      "leather": "#3c4b5b",
      "cloth": "#3c4b5b",
      "trim": "#8e9d98",
      "glow": "#8fbbc9"
    },
    "refinement": {
      "solid": "metal",
      "bevel": 0.004,
      "taper": 1.02,
      "relief": 1.1,
      "wear": 0.44,
      "detail": "pulse-housing",
      "emission": 0.14
    },
    "attachment": {
      "parents": [
        "TwoHandWeaponRig"
      ],
      "primary": [
        0,
        -0.07,
        -0.065
      ],
      "support": [
        0,
        -0.045,
        0.16
      ],
      "projectileSocket": [
        0,
        0.055,
        0.36
      ],
      "ranged": {
        "handRest": [
          0,
          -0.07,
          -0.065
        ],
        "stringRest": 0.19,
        "drawDistance": 0.17,
        "reloadSide": 0.032,
        "reloadLift": 0.125,
        "reloadAdvance": 0.255
      }
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 117,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_16_8.png",
      "sha256": "eab174e05c3c539c360d393bd0368cd69b3ae7095852d38775b55759cf09891b"
    },
    "brief": "A full mithral crossbow with a broken circular pulse-ring brace, two sweeping limbs and a blue crystal recoil housing."
  },
  "u_gen_16_10": {
    "id": "u_gen_16_10",
    "revision": 2,
    "name": "The Quickening Quarrel",
    "baseId": "crossbow2h_t10",
    "category": "crossbow",
    "slot": "main",
    "shape": "quarrel",
    "finish": "black",
    "length": 0.4,
    "width": 0.37,
    "motif": "prongs",
    "twoHand": true,
    "material": {
      "metal": "#383d46",
      "wood": "#322b27",
      "leather": "#373741",
      "cloth": "#373741",
      "trim": "#adb4b7",
      "glow": "#b3bfd0"
    },
    "refinement": {
      "solid": "metal",
      "bevel": 0.003,
      "taper": 0.96,
      "relief": 1.09,
      "wear": 0.57,
      "detail": "tuning-prongs",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "TwoHandWeaponRig"
      ],
      "primary": [
        0,
        -0.07,
        -0.065
      ],
      "support": [
        0,
        -0.045,
        0.16
      ],
      "projectileSocket": [
        0,
        0.055,
        0.36
      ],
      "ranged": {
        "handRest": [
          0,
          -0.07,
          -0.065
        ],
        "stringRest": 0.19,
        "drawDistance": 0.17,
        "reloadSide": 0.032,
        "reloadLift": 0.125,
        "reloadAdvance": 0.255
      }
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 118,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_16_10.png",
      "sha256": "4172aa516a27d0c33db436c99a121df26d2ccdbbc7a689f0cdbe3fd0ff9bbe58"
    },
    "brief": "A full obsidian crossbow with an elongated quarrel-shaped spine, silver tuning prongs at the front and rapid lever housing."
  },
  "u_gen_16_12": {
    "id": "u_gen_16_12",
    "revision": 2,
    "name": "Last Heartbeat",
    "baseId": "crossbow2h_t12",
    "category": "crossbow",
    "slot": "main",
    "shape": "clock",
    "finish": "bronze",
    "length": 0.35,
    "width": 0.33,
    "motif": "clock",
    "twoHand": true,
    "material": {
      "metal": "#9d967c",
      "wood": "#403a2f",
      "leather": "#5e2c31",
      "cloth": "#5e2c31",
      "trim": "#a68e58",
      "glow": "#b17458"
    },
    "refinement": {
      "solid": "metal",
      "bevel": 0.004,
      "taper": 0.98,
      "relief": 1.12,
      "wear": 0.65,
      "detail": "heart-clock",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "TwoHandWeaponRig"
      ],
      "primary": [
        0,
        -0.07,
        -0.065
      ],
      "support": [
        0,
        -0.045,
        0.16
      ],
      "projectileSocket": [
        0,
        0.055,
        0.36
      ],
      "ranged": {
        "handRest": [
          0,
          -0.07,
          -0.065
        ],
        "stringRest": 0.19,
        "drawDistance": 0.17,
        "reloadSide": 0.032,
        "reloadLift": 0.125,
        "reloadAdvance": 0.255
      }
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 119,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_16_12.png",
      "sha256": "dcfb796b9e180a4eb8e6b99a22a0debe24067688350227c7466bf5efa9c7551b"
    },
    "brief": "A full sunforged crossbow with a heart-clock shaped central brass brace, narrow gold limbs and a dark crimson stock."
  },
  "u_oath": {
    "id": "u_oath",
    "revision": 2,
    "name": "Oathkeeper's Wall",
    "baseId": "kiteshield",
    "category": "shield",
    "slot": "off",
    "shape": "kite",
    "finish": "blood",
    "length": 0.6,
    "width": 0.22,
    "motif": "oath",
    "twoHand": false,
    "material": {
      "metal": "#717b7b",
      "wood": "#472e23",
      "leather": "#403b36",
      "cloth": "#403b36",
      "trim": "#b6ad94",
      "glow": "#a9b4ac"
    },
    "refinement": {
      "solid": "metal",
      "bevel": 0.004,
      "taper": 1.02,
      "relief": 1.11,
      "wear": 0.78,
      "detail": "ivory-seal",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "HandL"
      ],
      "position": [
        0.075,
        -0.07,
        0.03
      ],
      "rotation": [
        1.05,
        0,
        0
      ],
      "paired": false
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 3,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_oath.png",
      "sha256": "0051e67774c0cd988420ceba6ec274c214ef7a396be3283fdc963f333c26bcd3"
    },
    "brief": "A long kite shield with a chipped ivory oath seal, crossed iron vow straps and a reinforced spear-shaped lower point."
  },
  "u_gen_17_1": {
    "id": "u_gen_17_1",
    "revision": 2,
    "name": "Wardlight",
    "baseId": "shield_t2",
    "category": "shield",
    "slot": "off",
    "shape": "lantern",
    "finish": "gold",
    "length": 0.59,
    "width": 0.23,
    "motif": "lantern",
    "twoHand": false,
    "material": {
      "metal": "#acb3a8",
      "wood": "#65513a",
      "leather": "#47473f",
      "cloth": "#47473f",
      "trim": "#a08e63",
      "glow": "#8cbacb"
    },
    "refinement": {
      "solid": "metal",
      "bevel": 0.004,
      "taper": 0.98,
      "relief": 1.09,
      "wear": 0.58,
      "detail": "lantern-ribs",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "HandL"
      ],
      "position": [
        0.075,
        -0.07,
        0.03
      ],
      "rotation": [
        1.05,
        0,
        0
      ],
      "paired": false
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 120,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_17_1.png",
      "sha256": "32f8b4394b3b406aff82bf7965c1f10d8dd25a39fa2179536d1598226f9922ce"
    },
    "brief": "A pointed shield with a tall pale lantern relief, perforated side ribs and a blue glass protective flame."
  },
  "u_gen_17_3": {
    "id": "u_gen_17_3",
    "revision": 2,
    "name": "Bastion",
    "baseId": "shield_t3",
    "category": "shield",
    "slot": "off",
    "shape": "wall",
    "finish": "bronze",
    "length": 0.62,
    "width": 0.235,
    "motif": "ribs",
    "twoHand": false,
    "material": {
      "metal": "#757b77",
      "wood": "#403a2f",
      "leather": "#373b34",
      "cloth": "#373b34",
      "trim": "#918469",
      "glow": "#8e9b8b"
    },
    "refinement": {
      "solid": "metal",
      "bevel": 0.006,
      "taper": 1.06,
      "relief": 1.1,
      "wear": 0.86,
      "detail": "tower-gate",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "HandL"
      ],
      "position": [
        0.075,
        -0.07,
        0.03
      ],
      "rotation": [
        1.05,
        0,
        0
      ],
      "paired": false
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 121,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_17_3.png",
      "sha256": "1ed074ed6f9859a9e20509928f89e869474c5ed86f45ddad3b6e71b655f1effa"
    },
    "brief": "A massive rectangular iron shield with a stepped tower top, riveted buttress strips and a dark central gate relief."
  },
  "u_gen_17_5": {
    "id": "u_gen_17_5",
    "revision": 2,
    "name": "Sanctuary",
    "baseId": "shield_t5",
    "category": "shield",
    "slot": "off",
    "shape": "oval",
    "finish": "gold",
    "length": 0.57,
    "width": 0.225,
    "motif": "angel",
    "twoHand": false,
    "material": {
      "metal": "#999f96",
      "wood": "#65513a",
      "leather": "#434b39",
      "cloth": "#434b39",
      "trim": "#9b9f7f",
      "glow": "#bcc4a2"
    },
    "refinement": {
      "solid": "metal",
      "bevel": 0.004,
      "taper": 0.98,
      "relief": 1.12,
      "wear": 0.61,
      "detail": "sanctuary-arch",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "HandL"
      ],
      "position": [
        0.075,
        -0.07,
        0.03
      ],
      "rotation": [
        1.05,
        0,
        0
      ],
      "paired": false
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 122,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_17_5.png",
      "sha256": "5fa83a026978aa974fd3636750a8a68a18839ea5992893cf56c177b5c47994d7"
    },
    "brief": "A rounded steel shield with a small arched sanctuary doorway relief, ivory wing guards and a moss-green rim."
  },
  "u_gen_17_7": {
    "id": "u_gen_17_7",
    "revision": 2,
    "name": "Aegis Eternal",
    "baseId": "shield_t7",
    "category": "shield",
    "slot": "off",
    "shape": "concentric",
    "finish": "gold",
    "length": 0.53,
    "width": 0.265,
    "motif": "spokes",
    "twoHand": false,
    "material": {
      "metal": "#aeb5a9",
      "wood": "#65513a",
      "leather": "#46483c",
      "cloth": "#46483c",
      "trim": "#a49163",
      "glow": "#c5cbb7"
    },
    "refinement": {
      "solid": "metal",
      "bevel": 0.005,
      "taper": 1.03,
      "relief": 1.04,
      "wear": 0.51,
      "detail": "nested-rings",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "HandL"
      ],
      "position": [
        0.075,
        -0.07,
        0.03
      ],
      "rotation": [
        1.05,
        0,
        0
      ],
      "paired": false
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 123,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_17_7.png",
      "sha256": "cd304ee94e31dbc1c1187d16a8eb5f2a10b4cd3871a9987c1d151aed67d8e3cd"
    },
    "brief": "A circular shield composed of three nested protective rings, runed center dome and broad pale iron spokes."
  },
  "u_gen_17_9": {
    "id": "u_gen_17_9",
    "revision": 2,
    "name": "The Unbroken Vow",
    "baseId": "shield_t9",
    "category": "shield",
    "slot": "off",
    "shape": "rib",
    "finish": "bone",
    "length": 0.64,
    "width": 0.215,
    "motif": "knot",
    "twoHand": false,
    "material": {
      "metal": "#bab4a0",
      "wood": "#685540",
      "leather": "#4a4438",
      "cloth": "#4a4438",
      "trim": "#988461",
      "glow": "#b9b9a1"
    },
    "refinement": {
      "solid": "bone",
      "bevel": 0.004,
      "taper": 1.01,
      "relief": 1.14,
      "wear": 0.67,
      "detail": "interlocked-ribs",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "HandL"
      ],
      "position": [
        0.075,
        -0.07,
        0.03
      ],
      "rotation": [
        1.05,
        0,
        0
      ],
      "paired": false
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 124,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_17_9.png",
      "sha256": "09c4f3cbc83264c81da5bd42e211fee372a1413cfde31c0d1e93bb8b988fa068"
    },
    "brief": "A tall dragonbone shield made from interlocked unbroken ivory ribs around a bronze oath knot, pointed lower edge."
  },
  "u_gen_17_11": {
    "id": "u_gen_17_11",
    "revision": 2,
    "name": "Refuge of Ash",
    "baseId": "shield_t11",
    "category": "shield",
    "slot": "off",
    "shape": "hood",
    "finish": "bronze",
    "length": 0.58,
    "width": 0.25,
    "motif": "hearth",
    "twoHand": false,
    "material": {
      "metal": "#8b8e82",
      "wood": "#403a2f",
      "leather": "#373a37",
      "cloth": "#373a37",
      "trim": "#a38d55",
      "glow": "#c1b892"
    },
    "refinement": {
      "solid": "metal",
      "bevel": 0.004,
      "taper": 1.07,
      "relief": 1.11,
      "wear": 0.82,
      "detail": "hooded-hearth",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "HandL"
      ],
      "position": [
        0.075,
        -0.07,
        0.03
      ],
      "rotation": [
        1.05,
        0,
        0
      ],
      "paired": false
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 125,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_17_11.png",
      "sha256": "c6180681cf4f05899734756883fc07d9cf016c4401a1b764bd64c53dbe0e0cb3"
    },
    "brief": "A broad celestial shield with a curved ash-colored protective hood rim, gold hearth-shaped relief and cracked black center."
  },
  "u_crown": {
    "id": "u_crown",
    "revision": 2,
    "name": "Hollow Crown",
    "baseId": "cap",
    "category": "helm",
    "slot": "head",
    "shape": "hollow",
    "finish": "bone",
    "length": 0.2,
    "width": 0.145,
    "motif": "crown",
    "twoHand": false,
    "material": {
      "metal": "#b4ad96",
      "wood": "#685540",
      "leather": "#302d2b",
      "cloth": "#302d2b",
      "trim": "#918366",
      "glow": "#958b7a"
    },
    "refinement": {
      "solid": "bone",
      "bevel": 0.002,
      "taper": 1.02,
      "relief": 1.08,
      "wear": 0.83,
      "detail": "broken-circlet",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "Head"
      ],
      "position": [
        0,
        0,
        0
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "paired": false
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 4,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_crown.png",
      "sha256": "a298c289abfcd1ae40a92285e9375959f099aafe44b37be8e01a7f97e9aa0dcb"
    },
    "brief": "A soft black leather skullcap supporting an open broken bone circlet, hollow central crown prong and empty bronze eye sockets."
  },
  "u_gen_7_1": {
    "id": "u_gen_7_1",
    "revision": 2,
    "name": "Crown of Cinders",
    "baseId": "helm_t2",
    "category": "helm",
    "slot": "head",
    "shape": "flame",
    "finish": "bronze",
    "length": 0.24,
    "width": 0.147,
    "motif": "coal",
    "twoHand": false,
    "material": {
      "metal": "#65685e",
      "wood": "#403a2f",
      "leather": "#39362e",
      "cloth": "#39362e",
      "trim": "#95846b",
      "glow": "#b2683e"
    },
    "refinement": {
      "solid": "metal",
      "bevel": 0.003,
      "taper": 1.04,
      "relief": 1.11,
      "wear": 0.87,
      "detail": "charred-flames",
      "emission": 0.14
    },
    "attachment": {
      "parents": [
        "Head"
      ],
      "position": [
        0,
        0,
        0
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "paired": false
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 55,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_7_1.png",
      "sha256": "488449ce8c238ac04bc379218a516e48f12fefdad736c20b7ce79a2b30cd30ed"
    },
    "brief": "A studded war helmet crowned by charred flame-shaped metal prongs and a smoldering red central coal setting."
  },
  "u_gen_7_3": {
    "id": "u_gen_7_3",
    "revision": 2,
    "name": "Skullhelm",
    "baseId": "helm_t3",
    "category": "helm",
    "slot": "head",
    "shape": "skull",
    "finish": "bone",
    "length": 0.22,
    "width": 0.146,
    "motif": "teeth",
    "twoHand": false,
    "material": {
      "metal": "#a6aaa1",
      "wood": "#685540",
      "leather": "#353733",
      "cloth": "#353733",
      "trim": "#999985",
      "glow": "#afbaa6"
    },
    "refinement": {
      "solid": "metal",
      "bevel": 0.003,
      "taper": 1.0,
      "relief": 1.04,
      "wear": 0.71,
      "detail": "skull-ridges",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "Head"
      ],
      "position": [
        0,
        0,
        0
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "paired": false
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 56,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_7_3.png",
      "sha256": "6ae5b00fe53025602066837ac0fa99f1d52d19e1cb1895f1ba04cbfe99c1374a"
    },
    "brief": "A full iron helmet forged as an exposed skull face with deep eye slits, cheekbone ridges and a broad tooth-shaped chin."
  },
  "u_gen_7_5": {
    "id": "u_gen_7_5",
    "revision": 2,
    "name": "Visage",
    "baseId": "helm_t5",
    "category": "helm",
    "slot": "head",
    "shape": "mask",
    "finish": "steel",
    "length": 0.21,
    "width": 0.143,
    "motif": "slit",
    "twoHand": false,
    "material": {
      "metal": "#a6afb0",
      "wood": "#49423a",
      "leather": "#3e4144",
      "cloth": "#3e4144",
      "trim": "#9da797",
      "glow": "#b8c3c8"
    },
    "refinement": {
      "solid": "metal",
      "bevel": 0.002,
      "taper": 0.96,
      "relief": 0.96,
      "wear": 0.32,
      "detail": "solemn-mask",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "Head"
      ],
      "position": [
        0,
        0,
        0
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "paired": false
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 57,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_7_5.png",
      "sha256": "030911fda30fdd89cf084888e278515497f5498e4ac1075adc0aafa49a66e8c1"
    },
    "brief": "A smooth steel helmet with a solemn featureless silver face mask, one asymmetric cheek ridge and a narrow vertical brow slit."
  },
  "u_gen_7_7": {
    "id": "u_gen_7_7",
    "revision": 2,
    "name": "Doomcap",
    "baseId": "helm_t7",
    "category": "helm",
    "slot": "head",
    "shape": "hood",
    "finish": "black",
    "length": 0.19,
    "width": 0.149,
    "motif": "horns",
    "twoHand": false,
    "material": {
      "metal": "#3e4246",
      "wood": "#322b27",
      "leather": "#302e32",
      "cloth": "#302e32",
      "trim": "#8e8065",
      "glow": "#a45147"
    },
    "refinement": {
      "solid": "metal",
      "bevel": 0.003,
      "taper": 1.01,
      "relief": 1.06,
      "wear": 0.83,
      "detail": "broken-hood",
      "emission": 0.14
    },
    "attachment": {
      "parents": [
        "Head"
      ],
      "position": [
        0,
        0,
        0
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "paired": false
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 58,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_7_7.png",
      "sha256": "53e328be887d81d834c484ca00e9ef3a2788b5e90b46a1029f4442a82ea4131b"
    },
    "brief": "A low black iron skullcap with a deep hooded forehead guard, hornlike broken side tabs and a tiny red doomstone."
  },
  "u_gen_7_9": {
    "id": "u_gen_7_9",
    "revision": 2,
    "name": "Diadem of the Drowned King",
    "baseId": "helm_t9",
    "category": "helm",
    "slot": "head",
    "shape": "coral",
    "finish": "bone",
    "length": 0.25,
    "width": 0.148,
    "motif": "pearls",
    "twoHand": false,
    "material": {
      "metal": "#a1afa0",
      "wood": "#685540",
      "leather": "#b8b5a2",
      "cloth": "#b8b5a2",
      "trim": "#789d93",
      "glow": "#b7cacc"
    },
    "refinement": {
      "solid": "bone",
      "bevel": 0.002,
      "taper": 1.03,
      "relief": 1.11,
      "wear": 0.88,
      "detail": "coral-pearls",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "Head"
      ],
      "position": [
        0,
        0,
        0
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "paired": false
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 59,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_7_9.png",
      "sha256": "fb0823aabc0cb2912d2d9e2f1e1b56095a721e216c943a5bfac2dd643d348ce6"
    },
    "brief": "A dragonbone helm shaped as a drowned king's open diadem, coral-spiked crown, weathered blue-green metal and pearl tears."
  },
  "u_gen_7_11": {
    "id": "u_gen_7_11",
    "revision": 2,
    "name": "Boneward Casque",
    "baseId": "helm_t11",
    "category": "helm",
    "slot": "head",
    "shape": "rib",
    "finish": "bone",
    "length": 0.23,
    "width": 0.145,
    "motif": "arches",
    "twoHand": false,
    "material": {
      "metal": "#c0c4b2",
      "wood": "#685540",
      "leather": "#343a39",
      "cloth": "#343a39",
      "trim": "#b0b499",
      "glow": "#888d96"
    },
    "refinement": {
      "solid": "bone",
      "bevel": 0.002,
      "taper": 0.98,
      "relief": 1.09,
      "wear": 0.52,
      "detail": "arched-ribs",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "Head"
      ],
      "position": [
        0,
        0,
        0
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "paired": false
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 60,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_7_11.png",
      "sha256": "0c7a619ef87cfd6bd5ddf728d67de7e0603cd8224d5955ef6884e2d26f7fab8f"
    },
    "brief": "A pale celestial enclosed helmet with overlapping rib-bone face guards, three arched crown bones and a black forehead jewel."
  },
  "u_cinder": {
    "id": "u_cinder",
    "revision": 3,
    "name": "Cindershroud",
    "baseId": "quiltvest",
    "category": "chest",
    "slot": "chest",
    "shape": "ragged",
    "finish": "blood",
    "length": 0.56,
    "width": 0.232,
    "motif": "quilt",
    "twoHand": false,
    "material": {
      "metal": "#6c302c",
      "wood": "#472e23",
      "leather": "#722e2c",
      "cloth": "#722e2c",
      "trim": "#826854",
      "glow": "#b26338"
    },
    "refinement": {
      "solid": "cloth",
      "bevel": 0.003,
      "taper": 0.97,
      "relief": 1.05,
      "wear": 0.9,
      "detail": "quilted-banners",
      "emission": 0.14
    },
    "attachment": {
      "parents": [
        "Chest",
        "Spine",
        "Hips",
        "UpperArmL",
        "UpperArmR",
        "ForearmL",
        "ForearmR",
        "ThighL",
        "ThighR",
        "ShinL",
        "ShinR"
      ],
      "position": [
        0,
        0,
        0
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "paired": false
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 2,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_cinder.png",
      "sha256": "0450e9f511328990b1a1a36f150a0a683490e084d4fe3a18830f30e598195c40"
    },
    "brief": "A sleeveless quilted vest stitched from scorched crimson banner strips, asymmetric ragged hem and ember-red seams.",
    "limbs": {
      "style": "quilt",
      "surface": "cloth",
      "arms": 1.06,
      "legs": 1.04,
      "cuff": 0.92
    }
  },
  "u_gen_6_0": {
    "id": "u_gen_6_0",
    "revision": 3,
    "name": "Aegis of Ash",
    "baseId": "chest_t1",
    "category": "chest",
    "slot": "chest",
    "shape": "shield",
    "finish": "leather",
    "length": 0.53,
    "width": 0.236,
    "motif": "rivets",
    "twoHand": false,
    "material": {
      "metal": "#7d7c70",
      "wood": "#4c3b2b",
      "leather": "#55493b",
      "cloth": "#55493b",
      "trim": "#927a56",
      "glow": "#a29578"
    },
    "refinement": {
      "solid": "leather",
      "bevel": 0.003,
      "taper": 0.96,
      "relief": 1.04,
      "wear": 0.9,
      "detail": "ash-shield",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "Chest",
        "Spine",
        "Hips",
        "UpperArmL",
        "UpperArmR",
        "ForearmL",
        "ForearmR",
        "ThighL",
        "ThighR",
        "ShinL",
        "ShinR"
      ],
      "position": [
        0,
        0,
        0
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "paired": false
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 48,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_6_0.png",
      "sha256": "130587b9232067712c590b36edb544d91d88f681a62aecc156e90766364594df"
    },
    "brief": "A fitted leather cuirass with an overlapping ash-gray shield breast panel, bronze rivet ring and scorched asymmetric shoulder straps.",
    "limbs": {
      "style": "riveted",
      "surface": "leather",
      "arms": 1.0,
      "legs": 1.0,
      "cuff": 0.94
    }
  },
  "u_gen_6_2": {
    "id": "u_gen_6_2",
    "revision": 3,
    "name": "Dragonscale",
    "baseId": "chest_t3",
    "category": "chest",
    "slot": "chest",
    "shape": "scales",
    "finish": "bronze",
    "length": 0.57,
    "width": 0.238,
    "motif": "eye",
    "twoHand": false,
    "material": {
      "metal": "#8a8c7d",
      "wood": "#403a2f",
      "leather": "#494034",
      "cloth": "#494034",
      "trim": "#96815d",
      "glow": "#a05042"
    },
    "refinement": {
      "solid": "metal",
      "bevel": 0.004,
      "taper": 1.01,
      "relief": 1.06,
      "wear": 0.74,
      "detail": "overlapping-scales",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "Chest",
        "Spine",
        "Hips",
        "UpperArmL",
        "UpperArmR",
        "ForearmL",
        "ForearmR",
        "ThighL",
        "ThighR",
        "ShinL",
        "ShinR"
      ],
      "position": [
        0,
        0,
        0
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "paired": false
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 49,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_6_2.png",
      "sha256": "f305090776673a22d0d435023d7c3d0a589b067cc551fdbe8e6bfda6612d354f"
    },
    "brief": "A fitted iron cuirass covered in large overlapping dragon-scale plates, a red eye-like central clasp and pointed armored waist.",
    "limbs": {
      "style": "dragon",
      "surface": "mail",
      "arms": 1.04,
      "legs": 1.06,
      "cuff": 0.9
    }
  },
  "u_gen_6_4": {
    "id": "u_gen_6_4",
    "revision": 3,
    "name": "Bulwark",
    "baseId": "chest_t4",
    "category": "chest",
    "slot": "chest",
    "shape": "wall",
    "finish": "steel",
    "length": 0.58,
    "width": 0.248,
    "motif": "braces",
    "twoHand": false,
    "material": {
      "metal": "#858c86",
      "wood": "#49423a",
      "leather": "#403e35",
      "cloth": "#403e35",
      "trim": "#827e69",
      "glow": "#adb0a3"
    },
    "refinement": {
      "solid": "metal",
      "bevel": 0.004,
      "taper": 1.06,
      "relief": 1.02,
      "wear": 0.8,
      "detail": "linked-wall",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "Chest",
        "Spine",
        "Hips",
        "UpperArmL",
        "UpperArmR",
        "ForearmL",
        "ForearmR",
        "ThighL",
        "ThighR",
        "ShinL",
        "ShinR"
      ],
      "position": [
        0,
        0,
        0
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "paired": false
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 50,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_6_4.png",
      "sha256": "6f99bc6713634c1bd18d67c18894eb4e60440499c19d86bbdd6611c75c689c6e"
    },
    "brief": "A heavy linked-mail cuirass with a rectangular reinforced breast wall, wide squared shoulders and horizontal iron braces.",
    "limbs": {
      "style": "linked",
      "surface": "mail",
      "arms": 1.08,
      "legs": 1.07,
      "cuff": 0.96
    }
  },
  "u_gen_6_6": {
    "id": "u_gen_6_6",
    "revision": 3,
    "name": "Cindermail",
    "baseId": "chest_t6",
    "category": "chest",
    "slot": "chest",
    "shape": "cracked",
    "finish": "black",
    "length": 0.55,
    "width": 0.241,
    "motif": "embers",
    "twoHand": false,
    "material": {
      "metal": "#454b4b",
      "wood": "#322b27",
      "leather": "#373636",
      "cloth": "#373636",
      "trim": "#95816c",
      "glow": "#b26b3d"
    },
    "refinement": {
      "solid": "metal",
      "bevel": 0.004,
      "taper": 0.98,
      "relief": 1.08,
      "wear": 0.88,
      "detail": "slag-collar",
      "emission": 0.14
    },
    "attachment": {
      "parents": [
        "Chest",
        "Spine",
        "Hips",
        "UpperArmL",
        "UpperArmR",
        "ForearmL",
        "ForearmR",
        "ThighL",
        "ThighR",
        "ShinL",
        "ShinR"
      ],
      "position": [
        0,
        0,
        0
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "paired": false
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 51,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_6_6.png",
      "sha256": "9406c6997eaca9f858b96d7cbd41c727c89e21a77997431d83883bc672ba297e"
    },
    "brief": "A fitted dark steel cuirass with visible glowing ember cracks between segmented mail plates and a slag-black jagged collar.",
    "limbs": {
      "style": "cracked",
      "surface": "mail",
      "arms": 0.98,
      "legs": 1.03,
      "cuff": 0.92
    }
  },
  "u_gen_6_8": {
    "id": "u_gen_6_8",
    "revision": 3,
    "name": "Emberweave Carapace",
    "baseId": "chest_t8",
    "category": "chest",
    "slot": "chest",
    "shape": "lattice",
    "finish": "bronze",
    "length": 0.54,
    "width": 0.237,
    "motif": "weave",
    "twoHand": false,
    "material": {
      "metal": "#919994",
      "wood": "#403a2f",
      "leather": "#514334",
      "cloth": "#514334",
      "trim": "#a88d60",
      "glow": "#b96c43"
    },
    "refinement": {
      "solid": "metal",
      "bevel": 0.003,
      "taper": 0.97,
      "relief": 1.07,
      "wear": 0.67,
      "detail": "woven-shell",
      "emission": 0.14
    },
    "attachment": {
      "parents": [
        "Chest",
        "Spine",
        "Hips",
        "UpperArmL",
        "UpperArmR",
        "ForearmL",
        "ForearmR",
        "ThighL",
        "ThighR",
        "ShinL",
        "ShinR"
      ],
      "position": [
        0,
        0,
        0
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "paired": false
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 52,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_6_8.png",
      "sha256": "f8afa1b73ffb934831069e8c5be223d02eb1b954f26ea6d8ddace8c3bd829c7b"
    },
    "brief": "A fitted mithral cuirass with a woven latticed carapace breast panel, orange coal-shaped clasp and curved overlapping shell edges.",
    "limbs": {
      "style": "woven",
      "surface": "cloth",
      "arms": 1.02,
      "legs": 1.02,
      "cuff": 0.88
    }
  },
  "u_gen_6_10": {
    "id": "u_gen_6_10",
    "revision": 3,
    "name": "Scaleforge Vest",
    "baseId": "chest_t10",
    "category": "chest",
    "slot": "chest",
    "shape": "forge",
    "finish": "black",
    "length": 0.59,
    "width": 0.242,
    "motif": "scales",
    "twoHand": false,
    "material": {
      "metal": "#424b4c",
      "wood": "#322b27",
      "leather": "#403b31",
      "cloth": "#403b31",
      "trim": "#a08255",
      "glow": "#a68f62"
    },
    "refinement": {
      "solid": "metal",
      "bevel": 0.004,
      "taper": 1.03,
      "relief": 1.06,
      "wear": 0.86,
      "detail": "forge-scales",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "Chest",
        "Spine",
        "Hips",
        "UpperArmL",
        "UpperArmR",
        "ForearmL",
        "ForearmR",
        "ThighL",
        "ThighR",
        "ShinL",
        "ShinR"
      ],
      "position": [
        0,
        0,
        0
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "paired": false
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 53,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_6_10.png",
      "sha256": "0c9551b27b9b3a5f7c3c9b8105c392e2b09b89f8d54262dcedba7cb439bd94ad"
    },
    "brief": "A fitted obsidian cuirass with oversized forge-scale plates, a hammered copper neck frame and dark volcanic angular waist.",
    "limbs": {
      "style": "forge",
      "surface": "leather",
      "arms": 1.05,
      "legs": 1.08,
      "cuff": 0.94
    }
  },
  "u_gen_6_12": {
    "id": "u_gen_6_12",
    "revision": 3,
    "name": "Ashen Bastion",
    "baseId": "chest_t12",
    "category": "chest",
    "slot": "chest",
    "shape": "tower",
    "finish": "gold",
    "length": 0.6,
    "width": 0.246,
    "motif": "buttress",
    "twoHand": false,
    "material": {
      "metal": "#a7a590",
      "wood": "#65513a",
      "leather": "#bcb9a5",
      "cloth": "#bcb9a5",
      "trim": "#a18b56",
      "glow": "#beb696"
    },
    "refinement": {
      "solid": "metal",
      "bevel": 0.004,
      "taper": 1.02,
      "relief": 1.04,
      "wear": 0.72,
      "detail": "buttressed-tower",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "Chest",
        "Spine",
        "Hips",
        "UpperArmL",
        "UpperArmR",
        "ForearmL",
        "ForearmR",
        "ThighL",
        "ThighR",
        "ShinL",
        "ShinR"
      ],
      "position": [
        0,
        0,
        0
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "paired": false
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 54,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_6_12.png",
      "sha256": "8dd3eba592eb7c4ab7b99d4fd3f939e017b9b1660ab4d0e74c0d78481f9cb99c"
    },
    "brief": "A fitted sunforged cuirass with a tower-shaped central breast ridge, buttressed shoulder flanges and a pale ash tabard.",
    "limbs": {
      "style": "bastion",
      "surface": "cloth",
      "arms": 1.07,
      "legs": 1.06,
      "cuff": 0.96
    }
  },
  "u_gen_18_0": {
    "id": "u_gen_18_0",
    "revision": 2,
    "name": "Gravewrought Grips",
    "baseId": "gloves_t1",
    "category": "gloves",
    "slot": "gloves",
    "shape": "bone",
    "finish": "leather",
    "length": 0.16,
    "width": 0.052,
    "motif": "skull",
    "twoHand": false,
    "material": {
      "metal": "#b8b19d",
      "wood": "#4c3b2b",
      "leather": "#35322f",
      "cloth": "#35322f",
      "trim": "#897c63",
      "glow": "#a4a591"
    },
    "refinement": {
      "solid": "bone",
      "bevel": 0.002,
      "taper": 0.96,
      "relief": 1.01,
      "wear": 0.86,
      "detail": "articulated-bone",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "HandL",
        "HandR"
      ],
      "position": [
        0,
        0,
        0
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "paired": true
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 126,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_18_0.png",
      "sha256": "c65f49aae08716d93df1e9d528d090afeb2ab6f416904fff167b282f84cd3a34"
    },
    "brief": "A pair of leather gloves with articulated pale grave-bone finger caps, dark burial-linen wrists and small skull clasps."
  },
  "u_gen_18_2": {
    "id": "u_gen_18_2",
    "revision": 2,
    "name": "Throttle",
    "baseId": "gloves_t3",
    "category": "gloves",
    "slot": "gloves",
    "shape": "blocks",
    "finish": "blood",
    "length": 0.17,
    "width": 0.057,
    "motif": "hook",
    "twoHand": false,
    "material": {
      "metal": "#879089",
      "wood": "#472e23",
      "leather": "#703a32",
      "cloth": "#703a32",
      "trim": "#8b775b",
      "glow": "#a88b6a"
    },
    "refinement": {
      "solid": "metal",
      "bevel": 0.003,
      "taper": 1.05,
      "relief": 1.02,
      "wear": 0.82,
      "detail": "tension-blocks",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "HandL",
        "HandR"
      ],
      "position": [
        0,
        0,
        0
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "paired": true
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 127,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_18_2.png",
      "sha256": "eb762de319f30ca39c42d1ac33552a9f6d030a64ed9aab8a7b047088a39354bf"
    },
    "brief": "A pair of iron gauntlets with thick gripping knuckle blocks, red cord tension straps and hooked wrist guards."
  },
  "u_gen_18_4": {
    "id": "u_gen_18_4",
    "revision": 2,
    "name": "Vise",
    "baseId": "gloves_t4",
    "category": "gloves",
    "slot": "gloves",
    "shape": "vise",
    "finish": "steel",
    "length": 0.18,
    "width": 0.06,
    "motif": "bolts",
    "twoHand": false,
    "material": {
      "metal": "#949c95",
      "wood": "#49423a",
      "leather": "#41423b",
      "cloth": "#41423b",
      "trim": "#93927e",
      "glow": "#b1b6a1"
    },
    "refinement": {
      "solid": "metal",
      "bevel": 0.003,
      "taper": 1.07,
      "relief": 0.98,
      "wear": 0.74,
      "detail": "vise-jaws",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "HandL",
        "HandR"
      ],
      "position": [
        0,
        0,
        0
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "paired": true
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 128,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_18_4.png",
      "sha256": "77c1d13397c01a0490491368740256d48e335ec2765b8c560e35d3f7cf5a08d6"
    },
    "brief": "A pair of chainmail gauntlets with wide vise-jaw shaped wrist braces, squared steel fingers and heavy adjustment bolts."
  },
  "u_gen_18_6": {
    "id": "u_gen_18_6",
    "revision": 2,
    "name": "Deadhand",
    "baseId": "gloves_t6",
    "category": "gloves",
    "slot": "gloves",
    "shape": "skeletal",
    "finish": "bone",
    "length": 0.15,
    "width": 0.054,
    "motif": "ribs",
    "twoHand": false,
    "material": {
      "metal": "#b9bdac",
      "wood": "#685540",
      "leather": "#303633",
      "cloth": "#303633",
      "trim": "#8a9483",
      "glow": "#adb8a6"
    },
    "refinement": {
      "solid": "bone",
      "bevel": 0.002,
      "taper": 0.95,
      "relief": 1.03,
      "wear": 0.76,
      "detail": "empty-knuckles",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "HandL",
        "HandR"
      ],
      "position": [
        0,
        0,
        0
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "paired": true
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 129,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_18_6.png",
      "sha256": "a474d84dc29203a7a7ac7927987eece442ee4aee3697a70936c73b51bb505d6b"
    },
    "brief": "A pair of steel gauntlets shaped as dead skeletal hands, exposed pale finger-rib plates and dark empty knuckle recesses."
  },
  "u_gen_18_8": {
    "id": "u_gen_18_8",
    "revision": 2,
    "name": "Sepulcher's Clutch",
    "baseId": "gloves_t8",
    "category": "gloves",
    "slot": "gloves",
    "shape": "tomb",
    "finish": "steel",
    "length": 0.19,
    "width": 0.056,
    "motif": "arches",
    "twoHand": false,
    "material": {
      "metal": "#b0bab5",
      "wood": "#49423a",
      "leather": "#b1afa0",
      "cloth": "#b1afa0",
      "trim": "#9eaa93",
      "glow": "#c1c9b7"
    },
    "refinement": {
      "solid": "metal",
      "bevel": 0.002,
      "taper": 1.0,
      "relief": 1.06,
      "wear": 0.57,
      "detail": "funeral-arches",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "HandL",
        "HandR"
      ],
      "position": [
        0,
        0,
        0
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "paired": true
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 130,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_18_8.png",
      "sha256": "528f0152ae61d017c144b71b89d801a6933ed99305b4ca60c31caacbfea22fa3"
    },
    "brief": "A pair of mithral gauntlets with tomb-door shaped wrist plates, pale carved funeral arches and fingerlike bone studs."
  },
  "u_gen_18_10": {
    "id": "u_gen_18_10",
    "revision": 2,
    "name": "Stranglemourn",
    "baseId": "gloves_t10",
    "category": "gloves",
    "slot": "gloves",
    "shape": "hooks",
    "finish": "void",
    "length": 0.175,
    "width": 0.053,
    "motif": "knots",
    "twoHand": false,
    "material": {
      "metal": "#3e434e",
      "wood": "#342d3b",
      "leather": "#37303e",
      "cloth": "#37303e",
      "trim": "#83728a",
      "glow": "#8e80ac"
    },
    "refinement": {
      "solid": "metal",
      "bevel": 0.002,
      "taper": 0.94,
      "relief": 1.07,
      "wear": 0.66,
      "detail": "hooked-knots",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "HandL",
        "HandR"
      ],
      "position": [
        0,
        0,
        0
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "paired": true
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 131,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_18_10.png",
      "sha256": "cf523ac649790dc5b12241969e4a997df153416c4b61fe7ce44d0a320c915652"
    },
    "brief": "A pair of black obsidian gauntlets with long hooked fingers, twisted mourning-knot cuffs and thin violet enamel seams."
  },
  "u_gen_18_12": {
    "id": "u_gen_18_12",
    "revision": 2,
    "name": "Palms of the Pit",
    "baseId": "gloves_t12",
    "category": "gloves",
    "slot": "gloves",
    "shape": "eye",
    "finish": "gold",
    "length": 0.185,
    "width": 0.058,
    "motif": "cage",
    "twoHand": false,
    "material": {
      "metal": "#aaa88b",
      "wood": "#65513a",
      "leather": "#323a36",
      "cloth": "#323a36",
      "trim": "#a38d52",
      "glow": "#b49663"
    },
    "refinement": {
      "solid": "metal",
      "bevel": 0.003,
      "taper": 1.03,
      "relief": 1.08,
      "wear": 0.67,
      "detail": "palm-cages",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "HandL",
        "HandR"
      ],
      "position": [
        0,
        0,
        0
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "paired": true
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 132,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_18_12.png",
      "sha256": "9815e5d8840564d10fcdc783d4062daf14275fdf79fded12fb7cf22b5bb5ef1d"
    },
    "brief": "A pair of sunforged gauntlets with a single pit-eye cabochon on each palm, black claw-shaped fingertips and gold wrist cages."
  },
  "u_stride": {
    "id": "u_stride",
    "revision": 2,
    "name": "Stridewraith",
    "baseId": "warboots",
    "category": "boots",
    "slot": "boots",
    "shape": "spectral",
    "finish": "black",
    "length": 0.3,
    "width": 0.074,
    "motif": "ribs",
    "twoHand": false,
    "material": {
      "metal": "#4d5458",
      "wood": "#322b27",
      "leather": "#323638",
      "cloth": "#323638",
      "trim": "#91a5a6",
      "glow": "#a2bfc1"
    },
    "refinement": {
      "solid": "leather",
      "bevel": 0.002,
      "taper": 0.97,
      "relief": 1.06,
      "wear": 0.8,
      "detail": "spectral-heels",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "FootL",
        "FootR"
      ],
      "position": [
        0,
        0,
        0
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "paired": true
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 7,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_stride.png",
      "sha256": "180d20642e9b49c8a52f9ecb608e44955f24ae4fa32ed1d3eb8b632f7e19f585"
    },
    "brief": "A pair of tall dark boots with spectral rib-shaped heel guards, trailing torn linen cuffs and pale cold stitching."
  },
  "u_gen_8_0": {
    "id": "u_gen_8_0",
    "revision": 2,
    "name": "Hauntpace",
    "baseId": "boots_t1",
    "category": "boots",
    "slot": "boots",
    "shape": "bell",
    "finish": "leather",
    "length": 0.29,
    "width": 0.075,
    "motif": "bells",
    "twoHand": false,
    "material": {
      "metal": "#958570",
      "wood": "#4c3b2b",
      "leather": "#584a37",
      "cloth": "#584a37",
      "trim": "#9e8961",
      "glow": "#afa083"
    },
    "refinement": {
      "solid": "leather",
      "bevel": 0.003,
      "taper": 0.95,
      "relief": 1.02,
      "wear": 0.85,
      "detail": "bell-tassels",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "FootL",
        "FootR"
      ],
      "position": [
        0,
        0,
        0
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "paired": true
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 61,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_8_0.png",
      "sha256": "4754789979dacd44e74bafb8a55c796f683adf8fe0ae946f021ad738d762e749"
    },
    "brief": "A pair of supple leather greaves with dangling funerary bell tassels, long pointed toes and crescent bronze ankle clasps."
  },
  "u_gen_8_2": {
    "id": "u_gen_8_2",
    "revision": 2,
    "name": "Windsole",
    "baseId": "boots_t3",
    "category": "boots",
    "slot": "boots",
    "shape": "wing",
    "finish": "steel",
    "length": 0.31,
    "width": 0.076,
    "motif": "fins",
    "twoHand": false,
    "material": {
      "metal": "#a2adaa",
      "wood": "#49423a",
      "leather": "#a3a99f",
      "cloth": "#a3a99f",
      "trim": "#8b9b94",
      "glow": "#b7c6bd"
    },
    "refinement": {
      "solid": "metal",
      "bevel": 0.003,
      "taper": 0.98,
      "relief": 1.05,
      "wear": 0.61,
      "detail": "vented-wings",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "FootL",
        "FootR"
      ],
      "position": [
        0,
        0,
        0
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "paired": true
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 62,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_8_2.png",
      "sha256": "e08b099ef1b70ebf4a12d025b226308c88088b7d57be912d7ffb8820338d09dd"
    },
    "brief": "A pair of iron greaves with wing-shaped ankle fins, vented heel guards and light gray boot wraps."
  },
  "u_gen_8_4": {
    "id": "u_gen_8_4",
    "revision": 2,
    "name": "Ghoststep",
    "baseId": "boots_t4",
    "category": "boots",
    "slot": "boots",
    "shape": "mask",
    "finish": "bone",
    "length": 0.32,
    "width": 0.077,
    "motif": "cloth",
    "twoHand": false,
    "material": {
      "metal": "#a8b8ba",
      "wood": "#685540",
      "leather": "#b5bcae",
      "cloth": "#b5bcae",
      "trim": "#98a9a4",
      "glow": "#b4ccd0"
    },
    "refinement": {
      "solid": "metal",
      "bevel": 0.003,
      "taper": 0.96,
      "relief": 1.07,
      "wear": 0.52,
      "detail": "hollow-masks",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "FootL",
        "FootR"
      ],
      "position": [
        0,
        0,
        0
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "paired": true
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 63,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_8_4.png",
      "sha256": "67f9f6cdeb4bb4610a1851d051d5aa3c2cdb7f392600bc53365f375c64df48bc"
    },
    "brief": "A pair of mail greaves with hollow silver mask-shaped shin plates, trailing pale cloth cuffs and pointed spectral toes."
  },
  "u_gen_8_6": {
    "id": "u_gen_8_6",
    "revision": 2,
    "name": "Swiftmarch",
    "baseId": "boots_t6",
    "category": "boots",
    "slot": "boots",
    "shape": "banner",
    "finish": "steel",
    "length": 0.33,
    "width": 0.078,
    "motif": "pennant",
    "twoHand": false,
    "material": {
      "metal": "#969b95",
      "wood": "#49423a",
      "leather": "#673530",
      "cloth": "#673530",
      "trim": "#93886b",
      "glow": "#b4b9a2"
    },
    "refinement": {
      "solid": "metal",
      "bevel": 0.004,
      "taper": 1.06,
      "relief": 1.03,
      "wear": 0.8,
      "detail": "banner-knees",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "FootL",
        "FootR"
      ],
      "position": [
        0,
        0,
        0
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "paired": true
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 64,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_8_6.png",
      "sha256": "ed208bc3a8fa80fbf9ffa9a07e9fd8cd60437a9ab937ab59fb567ba1783ac483"
    },
    "brief": "A pair of heavy knightly greaves with angular marching-boot toes, banner-shaped knee guards and crimson strap ends."
  },
  "u_gen_8_8": {
    "id": "u_gen_8_8",
    "revision": 2,
    "name": "Galeheel",
    "baseId": "boots_t8",
    "category": "boots",
    "slot": "boots",
    "shape": "vane",
    "finish": "sky",
    "length": 0.315,
    "width": 0.075,
    "motif": "leaves",
    "twoHand": false,
    "material": {
      "metal": "#9db1b7",
      "wood": "#655d4d",
      "leather": "#364f64",
      "cloth": "#364f64",
      "trim": "#9fa786",
      "glow": "#b4c8c9"
    },
    "refinement": {
      "solid": "metal",
      "bevel": 0.003,
      "taper": 0.95,
      "relief": 1.08,
      "wear": 0.46,
      "detail": "curled-vanes",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "FootL",
        "FootR"
      ],
      "position": [
        0,
        0,
        0
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "paired": true
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 65,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_8_8.png",
      "sha256": "bba0e0c925ea3328da81819dfdcfc27ba8b4296899eb26052904efcfff4c709f"
    },
    "brief": "A pair of mithral greaves with curled wind-vane heels, sweeping leaf-shaped shin armor and deep blue fasteners."
  },
  "u_gen_8_10": {
    "id": "u_gen_8_10",
    "revision": 2,
    "name": "Pallor Treads",
    "baseId": "boots_t10",
    "category": "boots",
    "slot": "boots",
    "shape": "skeletal",
    "finish": "bone",
    "length": 0.325,
    "width": 0.076,
    "motif": "porcelain",
    "twoHand": false,
    "material": {
      "metal": "#b7bfb5",
      "wood": "#685540",
      "leather": "#333b3b",
      "cloth": "#333b3b",
      "trim": "#a1ac99",
      "glow": "#c4cdc2"
    },
    "refinement": {
      "solid": "bone",
      "bevel": 0.002,
      "taper": 0.98,
      "relief": 1.06,
      "wear": 0.63,
      "detail": "porcelain-cuffs",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "FootL",
        "FootR"
      ],
      "position": [
        0,
        0,
        0
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "paired": true
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 66,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_8_10.png",
      "sha256": "cd2f6cd055f1cb1f79376e14d9438640f54be1f36b0a8b848f457a930dd5783d"
    },
    "brief": "A pair of pale obsidian greaves with white skeletal foot inlay, long dark shin guards and cracked porcelain cuffs."
  },
  "u_gen_8_12": {
    "id": "u_gen_8_12",
    "revision": 2,
    "name": "Breath of the Hollow Road",
    "baseId": "boots_t12",
    "category": "boots",
    "slot": "boots",
    "shape": "lantern",
    "finish": "bronze",
    "length": 0.34,
    "width": 0.079,
    "motif": "straps",
    "twoHand": false,
    "material": {
      "metal": "#a5a68e",
      "wood": "#403a2f",
      "leather": "#443e30",
      "cloth": "#443e30",
      "trim": "#b39d64",
      "glow": "#c4bc95"
    },
    "refinement": {
      "solid": "metal",
      "bevel": 0.003,
      "taper": 1.02,
      "relief": 1.04,
      "wear": 0.86,
      "detail": "open-lanterns",
      "emission": 0.035
    },
    "attachment": {
      "parents": [
        "FootL",
        "FootR"
      ],
      "position": [
        0,
        0,
        0
      ],
      "rotation": [
        0,
        0,
        0
      ],
      "paired": true
    },
    "reference": {
      "assetId": "ui.items.uniques",
      "index": 67,
      "source": "assets/sprites_src/gameplay_art_authored/items/uniques/u_gen_8_12.png",
      "sha256": "2d1ccd22c00e950fe431ccd12505fba439119879601bc322d94a09bcc5a0d749"
    },
    "brief": "A pair of sunforged greaves with open lantern-like shin ribs, empty dark cores and long trailing road-worn leather straps."
  }
});

export function uniqueEquipmentModel(data,item,base,slot){
  const named=item.uniqueId&&(data.UNIQUES||[]).find(def=>def.id===item.uniqueId);
  if(!named||!UNIQUE_MODEL_SLOTS.includes(data.BASES[named.base]?.slot))return null;
  const model=UNIQUE_MODELS3D[named.id];
   if(!model||model.baseId!==base.id||model.slot!==slot||slot==='chest'&&!model.limbs)throw new Error('Missing or invalid unique 3D model: '+named.id);
  return model;
}
