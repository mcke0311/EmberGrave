# Body armor: torso, arms and legs

All 27 chest armors now provide coordinated sleeves and trousers on all five classes. The 16 ordinary and three set armors retain their original torso, shoulder geometry and palettes, with limb details that follow each class's style. Each of the eight unique chest recipes has its own limb profile: scorched quilting, riveted leather, dragon scales, linked braces, cracked steel, woven metal, forge scales or buttressed plates.

Flexible garments blend across the existing elbow, wrist, knee and ankle joints. Rigid plates have one corresponding limb bone at full weight. Both use one skinned batch with preserved vertex shading and a 128×128 surface atlas. Pauldron adjustment applies only to shoulders. Glove and boot equipment hides chest-owned forearm and shin guards through the batch's index buffer; tapered underlayers remain beneath cuffs and shafts. Changing those slots reuses the chest attachment. Unequipping the chest restores the original eight default limb meshes and their materials.

Chest recipes are revision 3; the other 110 unique recipes remain revision 2. The derived chest visual includes `bodyArmorRevision: 1`. Saved IDs and schemas are unchanged, and unidentified equipment has the same appearance after identification. The shared character builder supplies gameplay, co-op, armory, afterimages and cinematics. Equipment preparation, rollback and superseded changes retain their existing transaction behavior.

## Verification

| Contract | Result |
| --- | --- |
| Body armor CPU | 1,785,887 checks; all 135 armor/class combinations; 6,345 armor/glove or armor/boot pairings |
| Body armor WebGL | 21,606 checks; 11,180 rendered frames; peak 70 draw calls |
| Unique model CPU | 72,136 checks; all 118 models across five classes; distinct geometry; 1,785 ordinary/set/excluded combinations |
| Unique model WebGL | 17,236 checks; 8,970 rendered frames; peak 71 draw calls |
| Ordinary animated rendering | 57,620 checks across five classes, 12 weapon families, 10 states, eight directions and six timeline samples |
| Game integration | 781 checks, including missing-model rollback, superseded transactions, transformation recovery, After-Image identity, save/reload and remote hero equipment |
| Catalogue / animation / projectiles | 12,532 / 68,720 / 40,328 checks; animated grips and projectile origins remain aligned |
| Transformations / cinematics | 2,596 / 1,331 checks |
| Unique equipment / identity / drops | 6,079 / 4,094 / 8,792 checks |
| Co-op / shared inventory / server runtime | 85 / 25 / 21 checks |
| Recipe generator | `tools/author_unique_models3d.py --check`: all 118 recipes reproduce |

The 1,690 non-chest regression combinations retain exact geometry and palette signatures. For the remaining 95 ordinary/set chest combinations, the tests compare the original torso and shoulders separately from the new limbs. All 135 chest combinations also preserve their pre-change torso and shoulder signatures. Coverage checks verify both sides, normalized skin weights, joint seams during movement, unequip restoration, stale visual fields, unchanged glove/boot geometry, guard suppression and attachment reuse.

| Rendering limit | Measured maximum | Limit |
| --- | ---: | ---: |
| Triangles per unique, including paired equipment | 8,620 | 10,904 |
| Body armor render matrix draw calls | 70 | 73 |
| Existing unique render matrix draw calls | 71 | 73 |
| Procedural map width and height | 128 | 128 |

The refined pre-change unique maximum was 5,224 triangles. The new unique maximum includes chest-owned arms and legs. The ordinary armor maximum is 17,232 triangles; the specified triangle ceiling applies to unique items. Geometry counts per armor/class combination and before/after unique counts are retained in [measurements.json](qa/body_armor3d/measurements.json).

GPU resource counts stayed identical between warmed and settled measurements after 20 repeated equipment swaps per class. These counts are cumulative across retained class previews, so increases between classes reflect additional live previews.

| Class | Body matrix geometries / textures / programs | Unique matrix geometries / textures / programs |
| --- | --- | --- |
| Vanguard | 336 / 116 / 12 | 85 / 31 / 12 |
| Ember Witch | 350 / 132 / 12 | 156 / 59 / 12 |
| Gravebinder | 362 / 144 / 12 | 233 / 87 / 12 |
| Wildkeeper | 374 / 156 / 12 | 313 / 115 / 12 |
| Veil Ranger | 378 / 167 / 12 | 390 / 143 / 12 |

## Visual evidence

Reviewed every armor/class combination from front, side and back beside its inventory art, plus gameplay-scale thumbnails: 25 gallery pages covering 135 combinations. Reviewed five complete outfits in the armory on desktop (1440×1000) and touch-enabled mobile landscape (844×390), and five complete outfits plus inventory panels in actual gameplay at both viewport sizes. Sleeves and trousers follow chest materials; knees and elbows remain articulated; cuffs and shafts meet their separate equipment models. Existing class robes and capes retain their original coverage.

- [Before captures](qa/body_armor3d/before/) retain the original 25 gallery pages and ten complete armory outfits.
- [After captures](qa/body_armor3d/after/) show the new gallery and ten armory outfits. Detail framing fits the character more closely; gameplay thumbnails retain the original camera.
- [Gameplay captures](qa/body_armor3d/unique-regression/) show desktop/mobile outfits and inventory, with render and integration reports.
- [Exact pre-change signatures](fixtures/body_armor3d_before.json) retain all 135 original chest geometry and palette hashes.
- [Measurements and hashes](qa/body_armor3d/measurements.json) record before/after counts, GPU measurements, source hashes and capture hashes.

Run `npm run test:body-armor` for the focused CPU/WebGL contract and capture review. Run `npm run test:unique-models` for the unique, body armor, catalogue, animation, projectile, cinematic, save and co-op checks. With `python serve.py`, open [the body armor review](http://localhost:8741/tests/body_armor3d_review.html) or [the animated armory](http://localhost:8741/tests/three_character.html).

The existing global sprite audit's 476 environment-art errors remain recorded separately in [global_audit.json](qa/unique_item_art/global_audit.json). That unrelated baseline was not rerun or changed; the focused equipment contracts pass independently.
