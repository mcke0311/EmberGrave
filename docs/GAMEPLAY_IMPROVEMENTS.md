# Gameplay fixes and presentation update

Implemented in the existing working tree without a save-format change. Portals and companions remain session-only. Existing enemy names, collision radii, animation kinds, dedicated boss animations, and story disguises are retained.

## Gameplay and travel

- Portal pairs retain the exact casting position and originating map instance, including shifting cathedral instances. The visible portal offset is separate. Return placement happens after loading, before companions and the camera are placed, with a supported walkable fallback when necessary. Only the linked home hub displays the return portal; casting again replaces the pair.
- `enterMap` accepts arrival, cached-instance reuse, and recoverable-loading options. Portal and waypoint methods return `Promise<boolean>`, share a pending-travel guard, preserve the source on load failure, and emit one travel sound after success.
- Skill aether costs use the original rank-one cost multiplied by effective rank, including equipment ranks, before existing cost modifiers. Talent ranks still cost one point. Free attacks, free skills, toggle deactivation, and existing channel/stance rates retain their rules.
- Each living maintained companion costs its summoning skill's effective rank in aether per simulation second. Costs add across skeletons, plague mages, bone golems, wolves, boars, hawks, and bears, using each companion's owner and `sourceSkill`. Gear changes take effect immediately. Regeneration and potions offset drain; depletion from upkeep, casting, or channels runs the normal companion death lifecycle once. Delayed summons created at zero also die. Upkeep does not emit spend-item procs. The HUD and skill details show upkeep.
- Aimed Shot, Split Volley, Drawn Shot, Ricochet Shard, Skewering Bolt, Arrowfall, and Serrated Arrows require a bow or crossbow. Casting, tooltips, and action slots share the restriction. Incompatible weapon swaps cancel unreleased shots without refund; released arrows retain their weapon identity. Serrated Arrows applies only to bow/crossbow hits.

## Interface and sound

- Trade-capable NPCs display a gold pouch beside any quest marker, with a matching hover label. Dialogue and markers use the same capability check, independent of stock and player gold.
- Waypoints and caravans share a six-tab interface with current, attuned, and locked destinations, destination details, a dedicated Travel button, keyboard navigation, visible focus, Escape dismissal, and a stacked narrow layout. Failed travel leaves the menu open with retry feedback.
- Six local recorded-source mixes cover portal opening, successful teleportation, quest acceptance, objective readiness, reward completion, and intermediate progress. Quest cues follow state changes and are silent during save restoration. Decoding is cached; unloaded/stale events are dropped. Voices are bounded and use the existing Master and Sound Effects controls.
- Rebuild audio with `python tools/build_interaction_audio.py` (NumPy required). [Source credits](../assets/sound-effects/interactions/CREDITS.md) and [hashes and exact recipes](../assets/sound-effects/interactions/sources.json) accompany the WAV files.
- [Audio audition page](../tests/interaction_audio_review.html) includes old and new sounds. Serve the repository over HTTP before opening review pages.

## Enemy artwork

The review gallery covers 213 entries: campaign and optional enemies, generated variants, encounter helpers, boss forms, and companions. Every record includes the name, anatomy, weapon, elemental identity, region, and selected art. `artId` is separate from animation `kind`; drawing and hover geometry share the same resolver.

Forty painted transparent sprites were authored with the built-in image generation tool for mismatched anatomy, weapons, and material/elemental variants. The native-alpha originals and [prompt archive](../assets/sprites_src/gameplay_art_authored/enemies/prompts.json) are retained under `assets/sprites_src/gameplay_art_authored/enemies/`. Processing is limited to alpha-margin trimming, uniform resizing, padding, and packing; materials are painted into assets rather than processed per frame.

Reimport with `python tools/import_enemy_art.py` (Pillow required). The importer records source/output hashes, foot anchors, alpha masks, authored-source descriptors, sprite manifests, and bundle coverage. The 40 runtime WebP files total 436,768 bytes.

- [Interactive enemy gallery](../tests/enemy_art_review.html)
- [Machine-readable enemy audit](../tests/qa/gameplay_improvements/enemy-audit.json)
- [New sprite contact sheet](../tests/qa/gameplay_improvements/enemy-sources.png)
- [Desktop waypoints](../tests/qa/gameplay_improvements/waypoints-desktop.png), [narrow waypoints](../tests/qa/gameplay_improvements/waypoints-narrow.png), and [vendor markers](../tests/qa/gameplay_improvements/vendor-markers.png)
- [Companion upkeep HUD](../tests/qa/gameplay_improvements/companion-upkeep-1366.png) and [narrow HUD](../tests/qa/gameplay_improvements/companion-upkeep-640.png)

## Validation

Results from this implementation run:

| Check | Result |
| --- | --- |
| `node tests/gameplay_improvements_contract.mjs` | 763 passed |
| `node tests/gameplay_improvements_browser.cjs` | 21 passed; no browser errors or missing assets |
| `python tests/enemy_art_contract.py` | 842 passed |
| `node tests/enemy_art_browser.cjs` | 384,011 passed; all 213 records reviewed across 14 gallery pages |
| `python tests/interaction_audio_contract.py` | 57 passed; deterministic rebuild matches shipped WAVs |
| `node tests/skill_perks_contract.mjs` | 14,698 passed |
| `node tests/unique_powers_contract.mjs` | 1,991 passed |
| `node tests/skill_audio_contract.mjs` | 1,288 passed |
| `node tests/skill_vfx_contract.mjs --current-gameplay` | 5,373 passed across 963 scenarios |
| `node tests/skill_audio_gameplay_contract.mjs --current-gameplay` | 5,373 passed |
| `node tests/story_campaign_contract.mjs` | 214 passed |
| `node tests/gameplay_input_contract.mjs` | 153 passed |
| `node tests/terrain_surface_contract.mjs` | 10,734 passed |
| `node tests/weapon_projectile_origin_contract.mjs` | 15,368 passed |
| `node tests/management_contract.mjs` | 897 passed |

The new gameplay checks exercise delayed/failed loading, duplicate travel attempts, hub links, replacement portals, raised/blocked return positions, companion placement, and cathedral returns after an intervening regenerated instance. Resource cases cover ranks 1/2/5/10 and equipment ranks above ten, modifiers, all companion families and owners, gear swaps, regeneration/potions, delayed creation, cast depletion, and equivalent upkeep at 20/30/60/120 simulation updates per second. Weapon cases cover all seven skills, ten equipment categories, delayed releases, and swaps. Browser checks cover waypoint keyboard/retry flows and audio decode caching, muting, voice bounds, and stale-event suppression.

The dense drawing microbenchmark rendered 160 enemies over 60 frames: 1.50 ms/frame with previous assets and 0.84 ms/frame with selected assets in this run. This measures sprite drawing only, not whole-game frame rate. Detailed results are in `tests/qa/gameplay_improvements/`.

### Remaining legacy validation failures

The complete historical suite is **not fully green**:

- Default frozen skill VFX/combat snapshots predate the approved cost changes and other existing workspace changes, including armor-percentage and Soul Siphon behavior. The baseline was retained. `--current-gameplay` exercises current VFX-on/off simulation equivalence plus drawing and lifecycle invariants, but does not assert those old combat hashes. New gameplay contracts independently assert the approved resource and weapon behavior.
- `tests/boss_animation_contract.mjs` still expects older absolute Korvath encounter coordinates; the current frontier map places that encounter differently. Its coordinate fixture was not rewritten as part of this task.
- `tools/validate_sprite_assets.py --source-only` reports older fixed role counts/source-string expectations and unfinished source provenance in other regional artwork being edited in this working tree. The new enemy-specific contract verifies all 40 imported sprites against the production descriptor and mask formats. It does not replace the global validator.

On this Windows host, Node was run with `--preserve-symlinks --preserve-symlinks-main`. Browser scripts require Playwright and Chrome, and default to `http://127.0.0.1:8755`; set `GAME_REVIEW_URL` to use another local HTTP server. Production script URLs include an `improvements=1` cache revision alongside existing revisions.
