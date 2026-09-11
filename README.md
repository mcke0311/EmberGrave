# EMBERGRAVE — The Sunderstone Saga

An original dark-fantasy, isometric, loot-driven action RPG in the spirit of classic
late-90s dungeon crawlers. Names, lore, art, and UI are created for this project.
Skill audio combines custom mixes of credited CC0 source effects with the supplied
recorded soundtrack and UI/death sounds. See [skill audio](docs/SKILL_AUDIO.md). The game uses HTML5/Canvas + vanilla
JavaScript with **no build step**. Characters use the locally vendored,
MIT-licensed Three.js renderer by default when the game is served over HTTP.

World props feature five act-themed art sets, timed hero gestures and lasting
used states, including eight searchable frozen bodies in Act I. See
[animated props and validation](docs/PROP_INTERACTIONS.md).

Monsters now occupy family territories with related pack members, patrols,
dens, nests and ritual sites. Alerts stay within a pack, and cleared sites
become deserted. See [monster families](docs/MONSTER_FAMILIES.md).

Browse **[Items & Affixes](loot.html)** to compare item stats, full brown powers,
drop locations and percentage chances with adjustable level, difficulty and Magic
Find. The read-only view includes affix tiers and CSV export; see the
[loot data guide](docs/LOOT_DATA_VIEW.md) for probability definitions and validation.

## Support development
Players can visit **[Support the game](support.html)** from the main menu.
To enable donations, set `donationUrl` in `js/support-config.js` to the creator's
public HTTPS payment or crowdfunding page. Until a real URL is configured, the
page clearly says donations are not open and does not display a payment button.
Payment takes place on the linked provider's site; this game collects no payment
details. Include `support.html`, `css/support.css`, `js/support.js`, and
`js/support-config.js` when updating the hosted release.

## The saga (five acts)
The playable opening, **The Last Warm Wall**, begins on the snowy road to
**Frosthaven**. Follow Bryn, witness a fallen guard awaken beside an Embershard,
rescue Mara and Iven from a wrecked caravan, and lead them toward the wall.
Beyond the gate skirmish, **the Rimebound Captain** keeps his last watch: a
two-phase boss with marked frost slams and two finite reinforcement waves.
Gather the watch's healing supplies, defeat the captain, and bring the travelers
to Seraneth's hearth. The intended first-play pace is 6–7 minutes; practiced
players can finish sooner, and nothing forces the player to wait.
Brief contextual prompts teach movement, attack and healing while you play;
**Skip opening** goes directly to town. Rescue progress, supplies, boss health,
phase, reinforcement defeats and uncollected loot survive checkpoints, and
established heroes never replay the opening. The **Render**, **Mount Karrhal**,
and the shattered **Sunderstone** remain history to discover in conversation.
The campaign's first hub is **Frosthaven, in the Fallen North** (a full starting town:
vendors, a Forge Altar, storage and quest-givers), and runs across **five acts**,
each with its own biome, camp hub, NPCs, quests and boss:

1. **The Fallen North** *(start)* — frozen Frosthaven, mines, shattered temple → *Korvath, the Oathbreaker*
2. **The Weeping Marsh** — drowned crypts, the Silent Choir's ritual → *the Mire Mother*
3. **The City Beneath the Sand** — buried Khal-Zahir, shifting tombs → *Azram the Gilded* (with Archivist Edran Vael)
4. **The Shattered Cathedral** — a drifting fortress that **reassembles itself from memory each visit** → *the Empty Archangel*, then *Malthoron, the Hollow King*
5. **The Throne of Cinders** — Hell, where demons **fight each other** as well as you → *Vethriss, the Veiled Lord* (three-phase final fight)

> **The Ashen Marches** (Cinderwatch — the original starting region) is now an
> optional lower-level area, reachable from the start via its travel-shrine waystone,
> with its own self-contained six-quest line and bosses.

Completing the saga (defeating Vethriss) unlocks the next **difficulty tier**.

Each act boss lights a **waystone** to the next act's camp. The finale ends in a
**three-way choice** over the last Sunderstone core, each with its own ending.

Quests are handed out by the people and postings of each camp (look for the
bobbing **!** / **?**). Bosses fight in **phases** — shedding armor, changing shape,
gaining new attacks at health thresholds. The six main encounters have 96 authored
poses, clear attack warnings, recovery openings and flat arenas. Stepping outside
the arena resets a living boss and its summons. Read the
[boss encounter guide](docs/BOSS_ENCOUNTERS.md), or play each fight with an
isolated hero at `tests/boss_encounters.html`.

The [campaign story contract](docs/STORY_BRIEF.md) tracks the supplied story
brief using the game's original names. Marsh interviews, the underground market,
scholar and soul rescues, Quieting seals, sword pieces, and the boss-room shard
and map are tracked actions. It also lists the remaining bespoke art and staging
work, so narrative text is not mistaken for finished visuals. Review the campaign
with `tests/story_campaign.html`; run `node tests/story_campaign_contract.mjs`
for progression and save-compatibility checks.

Act IV now uses authored gothic islands above a void: memory chapels, a broken
arrival bridge, a procession ring and two reserved boss platforms. Optional
**Cinderwatch Remembered** and **The Last Bastion’s Echo** add looped detours,
elite encounters and guarded caches. Returning from a memory preserves the
parent map; normal cathedral visits reshuffle it. Thirty dedicated raster assets
cover gateways, architecture, materials and completed story-object states. A further
72 painted modules now connect the walls, deepen the floating foundations, blend
outdoor ash into rock, and integrate entrances with their approach paths. Inspect
the [environment overhaul](docs/ACT4_ENVIRONMENT.md) and its paired visual review at
`tests/act4_environment_review.html`.
See the [Cathedral of Memories design and validation guide](docs/CATHEDRAL_DESIGN.md)
and the isolated review at `tests/cathedral_review.html`.

The [latest Act IV visual pass](docs/ACT4_VISUAL_PASS.md) adds four original stone
inlays, procession paving, colored lighting, architectural shadows and deeper
floating foundations. Compare the current scenes with the starting version at
`tests/act4_visual_review.html`.

## Raised terrain

Act II now has continuous marsh water, mossy banks, cypress groves, candlelit
Gothic ruins and a carved Mire Mother arena. Compare all six areas in the
[before/after gallery](tests/qa/act2_visual/gallery.html), or read the
[visual overhaul and validation notes](docs/ACT2_VISUAL_OVERHAUL.md).

Act I has a new visual pass across the opening road, Frosthaven and all five
adventure areas: continuous snow, layered fir woods and alpine rock, connected
city defenses, clearer dungeon floors and colored local lighting. Inspect the
[matched before/after gallery](tests/qa/act1_polish/gallery.html) and the
[implementation and validation notes](docs/ACT1_VISUAL_POLISH.md).

Act V now uses painted basalt/ash boundaries outdoors, continuous fortress and
ceremonial walls indoors, and six connected level passages. The Breach retains
short gate defenses within a natural perimeter. See the
[Act V environment guide](docs/ACT5_ENVIRONMENT.md) for the playable before/after
review, source artwork, and validation commands.

Outside Frosthaven, terraces connect through visible, three-tile-wide ramps.
Ground height, walking connections, pointer picking and foreground occlusion
share the same surface geometry. Cliff faces block walking; the hero and
companions can still hop suitable ledges. Existing saves need no conversion.

Use `tests/terrain_live_review.html` to walk a temporary hero and sprite companion
up and down a generated ramp, or inspect them behind a terrace. Run
`node tests/terrain_surface_contract.mjs` for movement, picking and seeded route
checks; `tests/terrain_render_contract.html` also checks foreground occlusion.

The Fallen North's static ground and cliffs share a projected canvas with a
192-pixel margin. Camera movement reuses that image and repaints only exposed
edges when it scrolls; resizing, terrain changes, and travel invalidate it.
Enemy routes use the shared terrain connections and reject disconnected goals
before searching. Destroying a blocking prop updates reachability automatically.
Use `tests/game_performance.html` for an isolated center/movement/combat profile
(`?wide=1` for 4K, `?uncached=1` to compare full terrain repainting).
Run `node tests/terrain_view_cache_contract.mjs` and
`node tests/navigation_edge_contract.mjs` for cache and collision regressions;
`tests/terrain_view_pixels.html` verifies the scrolling image against fresh terrain.
Measured results and limits are recorded in
[the map-center performance review](tests/map_center_performance_results.md).

Pathfinding also reduces per-tile bookkeeping and temporary allocations in
collision sweeps. Exact route comparisons and before/after CPU measurements are
recorded in [the pathfinding optimization review](tests/pathfinding_optimization_results.md).
Run `node tests/pathfinding_optimization_contract.mjs` for regression checks and
`node tests/pathfinding_optimization_benchmark.mjs` to repeat the measurements.

Scrolling terrain updates paint exposed strips on a small reusable canvas before
copying them into the projected view. This reduces GPU stalls associated with
keyboard presentation delay at 4K. The [input latency review](tests/input_latency_results.md)
records the enemy/rendering isolation, before/after results and remaining hitches.
Use `tests/terrain_strip_pixels.html` for pixel comparisons or run
`node tests/input_latency.cjs --width=3840 --modes=normal` with Playwright and Chrome
for the isolated keyboard test.

Act 2 and the other legacy terrain maps now reuse projected floor pixels too,
including their existing stepped cliffs. The minimap caches its exploration
mask without reading pixels back from the rendered canvas. Profile a specific
area with `tests/game_performance.html?zone=weeping_marsh` (`&uncached=1` for
the uncached floor, `&wide=1` for 4K). Measurements and regression checks are in
[the Act 2 performance review](tests/act2_performance_results.md).

Act 2's five adventure areas now have authored routes, distinct paired entrance
assets, drowned monastery courts, reed boardwalks, and organic ritual basins.
Twenty-four new environment assets match Greywater Landing's painted style.
Seeds vary the connecting routes and encounters; existing quests and travel
links remain compatible. See [the Act 2 design](docs/ACT2_DESIGN.md) and play the
isolated comparison at `tests/act2_review.html` using `python tests/act2_server.py`.

Enemy overhead health bars appear on hover or for three seconds after damage;
the large encounter boss bar stays visible. Map hazards affect heroes and
grounded companions, while enemies remain vulnerable to player spells and traps.
A quick ground click follows a route. Holding it for 150 ms switches to direct
steering, retains movement when crossing enemies or objects, and stops on release.
Run `node tests/gameplay_input_contract.mjs` for input and combat regressions.

On phones and tablets, touch controls appear automatically. Drag the left
thumbstick to move and release it to stop. Hold **Attack** or **Skill** with a
second finger to use the assigned ability against the nearest visible enemy in
range; melee requires moving close. Buffs, summons and other single-use abilities
activate once per press. **Jump** follows the stick direction or the hero's facing.
Tap the world to walk, talk, collect loot or use a gate. Tap numbered draughts to
drink, a ready skill to select it, and **Assign** to change the secondary skill.
Talents also lets you bind the primary attack (L) and secondary skill (R).
The bottom buttons open character, inventory, talents and quests; **Menu**, **Map**
and **Loot** provide the remaining common controls. Tap an inventory item for
details and actions such as Equip, Move to belt, Use or Carry. Both orientations support
safe-area insets. Use `?touch=1` to preview the layout with a mouse or `?touch=0`
to hide the overlay. Run `node tests/mobile_controls_contract.mjs` for touch
movement, targeting, multitouch ownership and interruption regressions.
With the local server, Playwright and Chrome available, run
`node tests/mobile_controls_browser.cjs` for trusted multitouch, combat, potion,
inventory and layout checks. Screenshots are written to `tmp/mobile-controls/`.

## Towns
Town art and layouts were rebuilt for Cinderwatch, Frosthaven, Greywater Landing,
the Dig Camp and the Breach. Each has its own architecture, paving, market,
workshop and shrine. Continuous curved streets and worn plazas blend into the
surrounding soil or snow. Low fire bowls and themed roadside plants replace the
hanging lanterns; marsh pools have irregular, soft banks. Terrain is composited
from authored material textures once and cached, independently of the navigation
grid. Building footprints stay solid, and roofs fade when they cover the hero.

Review all five in `tests/town_redesign.html` (temporary heroes and isolated saves).
Run `node tests/town_layout_contract.mjs` for routing and travel-link checks.
Original built-in ImageGen sheets and prompts are kept in
`assets/sprites_src/gameplay_art_authored/towns/`. The mechanical importer is
`tools/import_town_art.py`; the normal sprite compiler can rebuild its outputs.
`js/town_terrain.js` composites the surface materials along the route geometry.
The additional artwork prompts are recorded in `towns/polish_sources.json`.

## Five playable classes

Every class skill offers **three free perk choices at invested rank 5** and
**three new choices at rank 10**. Choose one from each tier; both picks stack.
The Talents panel previews the effects and marks pending choices with a diamond.
Picks survive save/load, and established heroes receive their earned choices.
The existing talent reset clears ranks, picks, and ongoing skill effects.
See the [complete catalog of 642 perks](docs/SKILL_PERKS.md).

Chosen from a D2-style animated **campfire select screen** —
- **Vanguard** (Arms / Warcries / Assault): melee weapon arts, war-shouts, charges and slams
- **Ember Witch** (Cinder / Rime / Tempest): bolts, fans, piercing lances, chain lightning, frost novas, ground bursts
- **Gravebinder** (Bonecraft / Hex / Rot): skeletal warriors and plague mages **raised from enemy corpses** (the corpse is consumed), Poison Mastery that envenoms every skeleton's strike — and visibly blackens their bones green — plus area curses, soul drain, and corpse detonation
- **Veil Ranger** (Precision / Snares / Veil): aimed shots, arrow fans, Master of the Hunt's passive bleed on all attacks, a single Arrowfall zone, placeable barbed/frost/powder traps, Dragnet grouping and roots, Exploit Weakness bonuses for layered slows/roots/bleeds, Shadowstep-empowered Umbral Knife, Dusk Cleave, Shadow Flurry, and Deathblow attacks that exploit Exposed and detonate Killing Mark
- **Wildkeeper** (Wildkin / Stormcall / Wildshape): wolf and boar companions, sky-bolts, earth-spike stuns, called thunder — and true **beast transformations** (Fangform, Stoneform, Apexform) that reshape your body on screen

…plus randomized loot up to Unique rarity, **socketed gear and six glyph types**
(effects differ in weapons vs armor), a **Forge Altar** in town with four transmute
recipes, elites, vendors, storage, quests, travel shrines, town portals, hardcore
mode, and save/load.

Weapon and spell builds can use **162 named Unique items**, each with a signature power. Brown
random rewards occur in about one in five boss encounters before Magic Find;
Runed Stones and glyph reforging follow the revised rarity rules too. Owned
Uniques receive their revised stats and powers when loaded. See the
[complete Unique catalogue](docs/UNIQUE_ITEMS.md), inspect `tests/unique_review.html`,
or run `node tests/unique_validation.mjs --browser` for combat, drops, saves,
regressions and visual checks.

Players use live 3D animation with planted-foot IK, stride matched to actual
movement, weight transfer, braking, and smooth transitions. All five classes
and four Wildkeeper forms have distinct movement and combat motion. Weapon
release markers follow the existing skill timings; charged shots, channels,
charges, spins, hops, and landings have dedicated presentation. Hurt and block
reactions layer over ongoing actions without interrupting them.

Wildkeeper shapes have distinct fur, facial anatomy, paws, layered stone and
root-bound armour. Shifting, reverting and changing directly between beasts
play a short gathering pose, silhouette dissolve and settling motion, with
form-coloured leaves or stone fragments. Open `tests/character_forms3d.html`
to replay and scrub the transitions. See [the Wildshape notes](docs/WILDSHAPE.md)
for implementation and gameplay checks.

Open `tests/class_animation_styles.html` for the before/after comparison,
frame stepping, contact markers, eight facings, equipment choices, and a
12-second gameplay sequence. The gallery can export comparison PNGs.
See [player animation implementation and verification](docs/PLAYER_ANIMATION.md)
for the pose interface, timing rules, regression checks, and CPU measurements.

Starter equipment uses separate body, armor, and weapon layers when all of
those families are installed. The Ember Witch's Quilted Vest therefore keeps
her opaque neutral body instead of switching to the older flattened starter
sprite. `tests/emberwitch_quilted_vest.html` checks that equipping the vest
preserves body opacity across all 72 authored poses and the continuous walk.

---

## Sprite asset workflow

Persistent gameplay art is loaded exclusively from the checked-in manifest and
WebP atlases. There is no procedural-art fallback: a missing, malformed, or
undecodable required sprite stops startup with the exact asset id and path.

Authored source images live in `assets/sprites_src/` and the existing painted
libraries under `assets/`. The one-time authoring/import tools freeze RGBA PNGs
and source hashes; `build_sprite_assets.py` is deliberately pack-only and
rejects drawing, resizing, rotation, texture sampling, or geometry synthesis.

To audit source coverage before packing:

```text
python tools/build_sprite_assets.py --audit-gameplay-art --write-audit-report
python tools/build_sprite_assets.py --audit-ui-scenes --write-audit-report
```

A nonzero gameplay-art audit is intentional while required authored categories
are absent; `assets/sprites/gameplay_art_coverage.json` lists every exact gap.
Only after both audits pass should runtime atlases and the manifest be rebuilt:

The development tools require Python 3 and Pillow; the shipped browser runtime
has no dependency or build step.

```text
python tools/build_sprite_assets.py
python tools/validate_sprite_assets.py
```

Commit the emitted `assets/sprites/`, `assets/sprites/coverage.json`, and
`js/sprite_manifest.js` files. The browser remains a no-build-step runtime.

## How to run

### Item artwork and dialogue

Item artwork resolves from the canonical base or consumable identity, so saved
jewels no longer fall back to a chest and item-level rolls cannot change a
base's material tier. The supplemental atlas adds 30 silhouettes for jewels,
tonics, scrolls, charm sizes, starter clothing, mail and plate armor, shields,
clubs, and two-handed weapons. Jewel and glyph colors follow their item data.
Inventory icons preserve their aspect ratio. Tooltips and shop details include
the matching preview, item type, potion recovery amounts, and contextual actions.
Dialogue offers keyboard-accessible choices, readable text, and quest summaries.

Review every item at `tests/item_catalog.html`, or use the **Jewels & supplies**
and **Dialogue** controls in `tests/management_ui.html`. These pages use isolated
data and do not alter saved heroes. Run `node tests/item_identity_contract.mjs`
for catalogue-wide mapping and save-compatibility checks. The generated
`tests/item_identity_audit.json` records all 498 entries.

The built-in ImageGen source and prompts live in
`assets/sprites_src/gameplay_art_authored/items/`. Import with
`python tools/import_item_variants.py`, then pack with
`python tools/build_sprite_assets.py`. The importer keys the source background,
preserves object proportions, and updates the existing authorship ledger.

### Try the five-class Three.js armory

The ordinary game at `http://localhost:8741/index.html` now enables 3D characters
automatically, including heroes saved with the old sprite renderer. The title
screen identifies the current renderer. Use `?player3d=0` or its **Use sprites**
link to select sprites explicitly. Direct file launches retain sprites and show
an **Open the 3D game** link to the local server.

Run `python serve.py` and open
`http://localhost:8741/tests/three_character.html`. The armory includes Vanguard,
Ember Witch, Gravebinder, Wildkeeper and Veil Ranger with distinct proportions,
clothing, hair and class details. Select exact base, unique or set items, search
by name, equip a complete material tier, and inspect all seven animation states
and eight directional references. The game itself retains continuous facing.

Coverage includes all **300 base items, 139 unique items and 13 set items**:
12 weapon families, 14 material tiers, light/mail/plate/mythic chest and head
armor, shields, gloves, boots, belts, both rings and amulets. Equipment uses
family models with tier materials and the named items' existing art colors;
these are original models authored in code, not individual production sculpts
for every affix roll. Weapons have distinct silhouettes. Two-handed grips use
arm IK, bows animate their string and arrow, and melee weapons use swing poses.

Equipment now uses a grounded dark-fantasy art treatment: fitted breastplates,
overlapping shoulder defenses, hanging thigh plates, visor helmets, articulated
gauntlets and greaves, riveted shields, wrapped grips and tapered steel blades.
Deterministic surface maps add metal wear, leather grain, cloth weave and chain
mail. Tier palettes use aged steel and muted brass; magical accents stay small.
Static detail meshes are combined by material within each bone attachment.

Armor appearance is class-specific at every tier. Vanguard keeps legion plate;
Ember Witch uses split robes, flame embroidery and bronze circlets; Gravebinder
uses cowls, burial cloth, rib bones and skull charms; Wildkeeper uses fur, hides,
bark and antlers; Veil Ranger uses a shadow hood, fitted leather and utility
gear. The treatment covers chest, head, gloves, boots, belt, shield and jewelry.
Item names, stats and equip requirements stay unchanged, and named-item colors
remain accents within the class palette. Compare twenty outfits at
`tests/class_armor_styles.html`, or use the comparison link in the armory.

The four other classes now have pronounced silhouette and palette progression:
the Witch gains flame fans and phoenix regalia, the Gravebinder gains bone
crowns and skull pauldrons, the Wildkeeper gains branching antlers and broad
fur-and-bark defenses, and the Ranger gains crested cowls, layered leather and
long split tails. Head, chest, gloves, boots and belts follow the equipped tier;
field, reinforced, veteran and mythic outfits have individual style names in
the previews. Vanguard's approved armor geometry and materials are unchanged.

Every class has its own eight-state animation set: Vanguard's planted guard,
the Witch's fluid gestures, the Gravebinder's stooped rituals, the Wildkeeper's
heavy strides and the Ranger's low, precise footwork. Weapon-specific movement
preserves both grips; release markers follow each skill's actual timing. Shoulder
defenses hinge over the sleeves, split cloth clears the stride, and feet settle
onto the ground. Death poses relax the arms, flatten held equipment and cloth,
and match the persistent dead pose. Casting focuses have class-specific shapes
and honor the skill's element color. Gameplay durations and damage are unchanged.

Open `tests/class_animation_styles.html` to compare live animations and their
key moments for all five classes, change the weapon or armor tier, view from
the front/side/back, and scrub the timeline. The armory's eight-direction strip
also animates during playback.

Use **Play this class** to open `index.html?player3d=1&class=<class-id>` with that
class selected in the new-hero screen. Preview equipment does not modify saves
or grant items. Normal inventory requirements still apply in the game. All
supported 3D equipment prepares and commits independently of sprite coverage,
so missing authored sprite families no longer prevent equipping items in 3D.
Failed and superseded transactions retain the previous appearance. Saves record
the renderer preference and automatically restore 3D mode when loaded.

**Compare sprites** loads the exact original sprite appearance when it exists.
If its sprite art is incomplete, the game explains this and keeps 3D active.
Changing equipment returns the comparison to 3D. Wildkeeper beast transformations
keep their existing authored form sprites and return to the equipped 3D body.
Maps, combat, effects and item statistics are preserved; the sprite renderer
remains available through the explicit sprite option.

The player is rendered into a transparent WebGL canvas and composited at the
existing depth-sorted position, including elevation, shadows, hit flashes and
screen lighting. Three.js 0.185.1 is vendored in `js/vendor/three/`; no CDN or
package install is required. 3D mode requires HTTP and WebGL2. Opening the
ordinary game from disk still uses sprites; 3D saves should be opened over HTTP.

Implementation: `js/character_catalog3d.mjs` resolves the item catalog;
`js/character_equipment3d.mjs` builds equipment; `js/character_materials3d.mjs`
builds surface materials and disposes their textures; `js/character3d.mjs` contains
class models, skinning, animations, IK and rendering; `js/player3d.js` provides
the game asset facade and sprite comparison; `tests/character_armory.mjs`
controls the armory. The original Ember Witch study remains a reference fixture.

`js/character_armor3d.mjs` owns the four non-Vanguard armor themes;
`js/character_animation3d.mjs` authors the class poses and weapon motion;
`js/character_mesh3d.mjs` holds shared geometry and batching helpers. The catalog
contract verifies distinct geometry for each class in every armor slot at all
four family levels; the render contract also checks GPU cleanup for all classes.

Checks:

```text
node tests/character_catalog3d_contract.mjs
node tests/character_animation3d_contract.mjs
http://localhost:8741/tests/character_armory_render_contract.html
http://localhost:8741/tests/character_game_integration.html
```

The catalog test covers every class/item combination and both hands across
weapon animations. The WebGL suite checks visibility and canvas clipping for
all classes, families, states and directions at six points along each clip.
The animation contract checks 35 distinct clips, loop and recovery seams,
history-independent scrubbing, ground contact, bow timing and grip continuity.
The integration test exercises
the actual game equipment transaction, new heroes, stale/invalid changes, saved
3D loadouts, default 3D startup, legacy/sprite save upgrades, explicit sprite
selection, sprite comparison and Wildkeeper transformations using an isolated
in-memory save store. Existing sprite contracts remain under `tests/`.

### Launching the game

**Local server (recommended, includes 3D characters):**
```
cd Claudediablo
python serve.py
```
then open http://localhost:8741

**Direct file launch (sprite characters):** double-click `index.html` to use the
original sprite renderer. The title includes a link to the local-server 3D game.

Click once on the title screen first — browsers require a user gesture before audio starts.

For terrain-rendering regression checks, open
`http://localhost:8741/tests/terrain_render_contract.html`. It checks cliff joins
and height fitting at whole- and fractional-pixel camera positions, then renders
a seeded Fallen North area and synthetic terraces through the production floor
renderer. It does not create a character or change saves. The broader authored
world-art contract is at `tests/persistent_sprite_art_contract.html`.

`tests/cliff_no_readback_contract.html` checks all 160 cliff frames with canvas
pixel reads forbidden, reproducing the restriction on disk-loaded sprites.
Cliff alignment is measured during asset packing and stored in the manifest so
terrain rendering also works when `index.html` is opened directly from disk.

## How to play

| Input | Action |
|---|---|
| **Left-click** | Move, attack, talk, pick up loot, open chests, smash barrels |
| **Right-click** | Use your secondary skill |
| **Hold a button** | Keep moving / keep attacking |
| **Hold LMB on ground** | After 150 ms, steer directly toward the cursor; release to stop. Walls and cliffs still block movement. |
| **Shift + click** | Attack in place without moving |
| **1–4** | Drink belt potions |
| **F1–F4** | Select an assigned right-click skill; empty slots open the skill picker |
| **Space** | Jump toward the cursor |
| **Alt** (hold) | Temporarily reveal loot hidden by the filter; the filter workshop also lets you configure a reveal key |
| **L** | Toggle the loot filter on or off |
| **I / C / T or S / Q** | Inventory · Character · Talents · Quest log |
| **M** | Full-map overlay |
| **Esc** | Close panels / open the pause menu; go back within Settings & Controls |
| **`** (backtick) | Debug console (spawn elites, drop rares, level up, reveal map…) |

In the inventory: **right-click** equips gear, drinks/belts potions, reads scrolls, and
**sells items while a vendor is open**. Rare and Unique items drop **unidentified** —
right-click them with a Scroll of Insight in your pack, or pay Old Maesa to identify everything.

Open **Settings & Controls** from the title screen, or **Settings** / **Controls**
from the pause menu. Audio, Gameplay, Display, and Controls share one window;
the controls guide has separate Keyboard & Mouse and Touch views. Changes apply
immediately and persist on this device, independently of hero saves. Left-click
move-only preserves talking, collecting, and interacting; hold **Shift** to attack.
**Back** / **Esc** returns to the menu you came from, and **Close** returns directly
to the game or title. Arrow keys, Home, and End navigate the settings tabs.
Run `node tests/settings_menu_browser.cjs` with `python serve.py` running for
isolated navigation, persistence, input, and responsive-layout checks. Review
screenshots are written to `tmp/settings-menu/`.

### Class disciplines and combat HUD

Press **T** to open the class's three disciplines. Select a named skill to inspect
its effects, next rank, and prerequisites, then use **Learn / Upgrade** to spend
one point. Learned active skills can be assigned directly to **LMB, RMB, or
F1–F4**; passives work automatically. Equipment rank bonuses are shown separately.
The HUD groups draughts, combat skills, and quick assignments, with cooldown
timers, experience progress, and an unspent talent-point indicator.

All 107 skill emblems have explicit semantic assignments in `js/skill_icons.js`.
These SVG UI assets distinguish attack shapes, elements, summons, traps, and
transformations; the basic attack reflects the equipped weapon. Add an emblem
assignment when adding a new skill. `tests/class_skill_ui.html` reviews all five
classes and checks the interactions with temporary heroes and isolated saves.

### The campaign (six quests)
Quests come from the people (and postings) of Cinderwatch — look for the bobbing
**!** over a giver's head, and a **?** when a reward is waiting. Most townsfolk
will also just *talk*: everyone has conversation topics, a personality, and their
own synthesized voice. Each class currently ships with a complete authored
8-direction/9-pose starter sprite containing its starter weapon and light chest
armor. The modular rig remains fail-closed: a family without reviewed aligned
sprite layers is rejected atomically and the prior appearance stays active.
Gloves, boots, belts, rings, and amulets remain inventory-only.

1. Talk to **Captain Vessa Marn** by the east gate of **Cinderwatch** and take the quest.
2. Head east into **The Ashen Fields**. Kill things. Take their belongings.
3. Attune the **travel shrines** as you find them (free fast travel + autosave).
4. Find the **Sunken Crypt** at the far end of the fields. Silence **Gravecaller Hesh**, then descend to **The Vigil** and destroy **Morthul, the Grave-Warden**.
5. Maesa hears singing from the **Ruined Chapel** in the south of the fields — end **Vicar Thessaly** and his Hollow Choir.
6. Take the north road into **The Blackbough**, a forest gone wrong, and cut your way to the **Greymonastery**.
7. Climb through the Cloister to the Sanctum and unmake **Vellath, the Unshepherd** to complete the Cinderwatch questline. Continue the saga through the remaining acts to the Throne of Cinders.

Completing the full saga unlocks **Nightmare**, then completing it on Nightmare
unlocks **Torment** (Esc menu → Difficulty). Nightmare adds **30 monster/source
levels** to Normal; Torment adds **60**. Monsters also gain life, damage,
resistances and elite frequency, and their higher levels unlock higher-level loot.
Each difficulty has its own quests, story discoveries, boss deaths, travel
shrines and home. A new tier begins in Frosthaven with the Act I quests, skipping
the opening road tutorial; returning to a tier resumes its campaign progress.
Quests award their rewards once per difficulty. Character levels, talents, gear,
inventory, stash and cinematic history carry forward.

Older saves are backed up locally before upgrading to separate campaign saves.
Their shared history becomes Normal progress; higher tiers start fresh, including
characters already playing Nightmare or Torment. Character assets and unlocked
difficulties are preserved. Backups use `embergrave_campaign_backup_` keys in
localStorage and do not appear as extra heroes in the save list.

Death (normal): respawn in town, lose 10% gold. Death (hardcore): the character is deleted. Forever.

---

## Project layout

| File | Purpose |
|---|---|
| `index.html` | Page shell, DOM containers for HUD/panels, script load order |
| `css/style.css` | All gothic UI styling (panels, tooltips, orbs, title screen) |
| `js/utils.js` | Seeded RNG, math, A* pathfinding, line-of-sight, iso transforms |
| `js/data.js` | **All content as data**: classes, 12 Vanguard skills, item bases, 27 affixes, 9 uniques, 9 enemy types, 8 elite modifiers, quests, NPCs, zones |
| `js/sprite_manifest.js` | Generated, file-compatible registry for every required sprite frame and lookup key |
| `js/sprite_assets.js` | Strict bundle loader, frame lookup, DOM icons, layered player rig, and sprite transforms |
| `js/audio.js` | Recorded soundtrack, UI/death playback, skill-audio routing and regional ambience |
| `js/mapgen.js` | Hand-laid town; seeded procedural wilderness (winding road, woods, camps) and crypt levels (rooms + corridors) |
| `js/items.js` | Loot rolls, affix tiers, rare/unique naming, grid-inventory math, valuation, vendor stock |
| `js/entities.js` | Player (stats, skills, buffs, leveling), monster AI (melee/ranged/casters/summoners/bosses), projectiles |
| `js/ui.js` | HUD orbs, belt, skill bindings, all panels, tooltips with equipped-item comparison, title screen, debug console |
| `js/game.js` | Main loop, isometric renderer, dynamic lighting, input/picking, quests, portals/shrines/exits, save/load (localStorage) |
| `tools/author_gameplay_art.py` | One-time normalizer/importer for approved painted source libraries; writes checked-in RGBA sources and provenance |
| `tools/import_authored_starter_loadouts.py` | Imports the five reviewed flattened starter sheets, alpha-cleans micro-islands, and records reproducible hashes |
| `tools/build_sprite_assets.py` | Strict pack-only atlas compiler; validates authored hashes/contracts and emits committed WebP assets and coverage metadata |
| `tools/validate_sprite_assets.py` | Coverage, dimension, alpha, decode, and deprecated-procedural-API guard |

Design notes:
- **Data-driven**: new enemies, affixes, uniques, skills, and quests are added by editing `data.js` only.
- **Deterministic worlds**: each hero gets a world seed; map layouts are reproducible per hero.
- **Rendering**: Three.js renders all five humanoid player classes and their equipment by default over HTTP. Other actors, terrain, walls, props, hazards, pickups, and icons use checked-in 2D frames. Canvas also draws dynamic effects, lighting, weather, maps, markers, and UI layout. `?player3d=0` selects the original sprite player renderer.
- **Session persistence**: cleared areas and dropped loot persist per map while the game runs; bosses stay dead across saves.

## Crafting at the Forge Altar (in town, beside the smithy)
Lay items on the altar and **Strike the Anvil**:
- 3 identical glyphs → a different random glyph
- 1 common weapon/armor + 1 glyph → tempered (enhanced) item
- 1 rare item + 3 glyphs → the rare's powers are rewoven
- 3 like potions → 1 stronger draught

Glyphs drop from elites, bosses and chests. Pick one up on your cursor and click
any socketed item (in your pack or equipped) to seat it permanently.

**Named combinations**: seat the right glyphs *in the right order* and the item
becomes a named work with bonus powers — e.g. Embers→Blood in a weapon forges
**Cinderoath**. Two more combinations are rumored.

## Set items
Green-named **set pieces** drop from elites and bosses (two sets so far: the
martial *Vigil of the Ashen Watch* and the caster *Regalia of the First Witch*).
Wear 2 pieces for the first bonus, all 3 for the full power — tooltips show which
bonuses are live and which companion pieces you're missing.

## Roadmap (Stage 3 leftovers)
- More affix tiers, cave network side-dungeon
- Endgame dungeon with randomized modifiers, rare target-farm bosses
- Stamina, co-op-ready architecture



## Soundtrack and management screens

Recorded music is kept in `assets/music/`. **Black Rune Oath** accompanies the
main menu and character selection. **Snowy Mountain Vigil** plays in Frosthaven.
**White Breath, Iron Sky** plays in The Fallen North. Act II uses **Dusk in the
Empty Town** for its town and **Ash Dune Cathedral** in The Weeping Marsh. Act III
uses **Dusk in the Demonic Jungle** for its town and **Sombras del Infierno** in
The Shifting Wastes. Act V uses **Tour de Pierre Vieille** in The Breach and
**Ancient Tower** in The Cinderfields.

Beyond towns and their first outdoor areas, each zone entry randomly selects
**Caverns of Shadow**, **Cavern's Heart**, **Cave Echoes**, or that zone's regional
recording, avoiding the previous zone's selection. Both Act IV cathedral zones
include **Infernal Silence** in this pool. **Infernal Town at Dusk** remains
registered, awaiting a town destination: Act IV has no separate town.
**Hellscape Assault** takes over whenever a boss or miniboss has the large health
bar, then returns to the selected zone music once no boss remains engaged.

Recorded tracks loop; moving between areas sharing a song preserves its playback
position. Master and Music volume apply to every track. Cinderwatch and The Ashen
Fields retain synthesized ambience; later optional areas use the three cavern
tracks. See `assets/music/README.md` for the full file-to-zone mapping and run
`node tests/zone_boss_music_contract.mjs` for zone and encounter transition checks.

**Dark Fantasy Game Mouse Click Sound** is the shared UI click sound, stored in
`assets/sound-effects/`. Buttons, inventory/equipment, dialogue, waypoint choices,
settings and supported right-click actions use it. Master and Sound Effects
control its volume independently of Music. Disabled controls and typing are silent.
Run `tests/startup_music.html` and `tests/ui_sound.html` for isolated playback checks.

Press **I** for equipment and the 10×4 pack. Search highlights matching visible item
names without moving or hiding items. **Tidy pack** attempts a deterministic
largest-first arrangement; an unsuccessful attempt leaves all items in place.
Short windows use a compact equipment layout so the whole pack stays visible.

At a vendor, select an item to inspect its properties and equipped comparison,
then choose **Buy**. Right-clicking pack items sells them while the trading banner
is visible. The Forge Altar retains its own entry point: select a recipe, place
materials in its four slots, and **Strike the anvil** when all requirements are met.
Closing the altar returns materials and results to the pack, with overflow at the
hero's feet. Crafting previews describe random results without predicting rolls.

**C** opens the full character sheet, including zero-value stats, recovery,
companion upkeep, class bonuses, and separate elemental resistances. Hover or
keyboard-focus any stat for its gameplay effects. Basic attack, LMB and RMB skills
show elemental damage per hit or pulse, immediate totals, and full-duration
damage-over-time totals. Values update while the sheet stays open. Read the
[character sheet calculation notes](docs/CHARACTER_SHEET.md) for timing and
conditional damage details. **Q** opens a
journal with act and status filters and a side-by-side quest list and details.
Turn-ins are included in Active; locked quests keep their details concealed.

### Terrain traversal

Click-to-move uses shared terrain checks for pathfinding, smoothing and collision.
Heroes and mobile companions walk one-level slopes and automatically hop clear,
adjacent two-level ledges when that route is faster. Hops use the existing 0.42 s
animation and 0.65 s cooldown. Walls, buildings, blocking props, gaps and taller
cliffs are excluded from automatic hopping. Ground enemies follow walking routes.
**Space** retains manual traversal jumping toward the cursor. Ground clicks
account for the visible terrain height; a command issued during a hop takes effect
after landing.

### Review and regression checks

All 107 skills have dedicated dark-fantasy combat presentations. Open
`tests/skill_vfx_review.html` for an isolated skill atelier with replay, slow
motion, rank/perk selection and bright/dark stages. See
[the VFX runtime and review guide](docs/SKILL_VFX.md) and
[the measured QA report](tests/qa/skill_vfx/REPORT.md).

Looted chests retain an open, empty appearance when revisiting their map during
the same expedition. Chest-shaped event caches also stay open, and recovered
quest chests show their completed state. Clicking an urn, barrel or crate starts
a short kick; it breaks at boot contact. Spell impacts retain their own timing.
Player deaths use the supplied **Player Dies In Dark Fantasy Game. Yelling Sound**
recording through the Sound Effects and Master controls.

- `tests/management_ui.html` exercises the real interfaces and player update loop
  using isolated saves, then provides populated screen previews. Use
  `?w=1920&h=1080`, `?w=1366&h=768`, or `?w=1024&h=768` for viewport checks.
- `tests/startup_music.html` checks real playback, Act I song assignments,
  transitions, looping, volume and autoplay recovery after a user gesture.
- `node tests/navigation_contract.mjs` checks terrain routes and movement.
- `node tests/management_contract.mjs` checks recipe eligibility and atomic packing.
- `tests/floor_opacity.html` checks opaque ground beneath walls and raised terrain
  with every level's materials at four camera positions. Add `?baseline=1` to
  reproduce the background leaks with the frozen old floor pass.
- `tests/prop_interactions.html` checks chest states, kick timing/interruption,
  object collision/loot and recorded player death audio, with replay controls.
- Retain `tests/town_layout_contract.mjs`, `tests/player_walk_cycle.html`,
  `tests/terrain_render_contract.html`, and `tests/character_game_integration.html`
  for town routes, legacy sprite animation, terrain drawing and live 3D equipment.

On Windows environments that restrict Node's parent-directory realpath checks,
run the Node contracts with `node --preserve-symlinks --preserve-symlinks-main`.

### Grounded skill sounds

All five classes now use recorded material layers for skill releases, impacts,
traps, companions, transformations and conditional passive effects. Audition them
in `tests/skill_audio_review.html`, including music and previous-sound comparisons.
See [skill sound design and verification](docs/SKILL_AUDIO.md) for sources,
controls and regression checks. The game still has no build step.

### Act II: Enemy attacks and skills

Act II's five adventure areas also have a curated enemy pass with warned attacks,
local encounter pools and bounded summons. See [the combat guide](docs/ACT2_ENEMIES.md)
and [validation results](tests/act2_enemy_results.md). Its isolated playable review
runs at `http://127.0.0.1:8748/tests/act2_review.html?enemyReview` after starting
`python tests/act2_enemy_server.py`.

### Act III: The Buried Imperial City

The six existing Act III adventure areas now use authored imperial ruins, distinct
entrances and seeded reconnecting routes. The Dig Camp gains an excavation
departure while retaining its services. See [the design and QA guide](docs/ACT3_DESIGN.md).
Run `python tests/act3_baseline.py` and `python tests/act3_server.py`, then open
`http://127.0.0.1:8743/tests/act3_review.html` for the isolated playable review.
