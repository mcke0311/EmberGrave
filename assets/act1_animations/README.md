# Act I enemy presentation

`catalog.json` enumerates 145 reachable definitions and 54 art identities across the opening road, northern zones, side areas, every difficulty's event pools, and recursive summons. The runtime catalog maps all 361 enemy action sequences to six authored frames. Compatible later-act clips retain their original art/action mapping; new artwork is packed from native transparent PNG sources. `generated.json` records the exact generation prompts and original output paths. `import.json` records source hashes, packed entries, anchors, and picking masks.

`Act1EnemyAnimation` samples simulation-owned windup, release, motion, recovery, death-burst, and corpse clocks. It never rolls combat randomness or applies damage. Corpse poses persist for the existing twelve-second lifetime and disappear when consumed. Beacon and teleport anticipation samples their existing cooldowns; no spawn or teleport delay is introduced. Korvath uses separate clips for both phases.

The runtime catalog also supplies explicit ready poses for idle and walking, taken from each enemy's matching authored sheet (including the Yeti's idle row and both Korvath phases). Gentle breathing remains anchored at the feet; walking motion follows actual stride distance. Rest, interruptions, and completed recovery retain this artwork instead of reverting to the old static portrait. Reduced motion disables the added breathing and stride motion. The review scene includes Idle and Walk controls.

`DATA.resolveEnemy(id, zoneId)` applies northern element profiles without mutating shared enemy definitions. Individual skills retain their own elements, poison payloads, and elite bonuses. The compatibility id `frost_wyrm` resolves to the Frostmaw Yeti only in Act I. Its physical claws retain melee reach and base balance; its cold breath and slam use the specified locked aim, windup, recovery, range, damage, and cooldowns. Deferred attacks are canceled by interruption, death, or travel and validate terrain and line of sight on release.

Enemy warning geometry and radius outlines are hidden by default, including bosses. Actual projectiles, weapon trails, fissures, flames, breath, and impact debris remain. Set `Game.debugFlags.act1Combat = true` to show diagnostic areas. The `actors:act1` bundle is loaded and its isolated frames and hit flashes prepared before northern gameplay starts. Immutable bitmap caches avoid per-attack canvas uploads.

Northern terrain occlusion caches ordered spatial-cell candidates in a bounded, geometry-owned cache. Exact actor clipping still runs at each position; rebuilding terrain or replacing its projected view discards the candidates. Other acts keep their existing lookup path.

## Review

Run `python serve.py`, then open <http://127.0.0.1:8741/tests/act1_animation_review.html>. The scene uses an isolated in-memory save and includes every enemy, action, boss phase, both supported sprite facings, 1080p/4K canvases, pause, frame stepping, and actual encounter playback. It does not modify the player's save.

## Verification

On this Windows runtime, Node commands use `node --preserve-symlinks --preserve-symlinks-main`. Browser scripts require `playwright` to be resolvable, for example through the bundled runtime's `NODE_PATH`.

```text
node tools/act1_animation_catalog.mjs --check
python tools/import_act1_animations.py --check
node tests/act1_animation_contract.mjs
node tests/act1_animation_browser.cjs
node tests/act1_animation_idle_browser.cjs
node tests/act1_animation_encounters.cjs
node tests/boss_encounter_contract.mjs
node tests/opening_contract.mjs
node tests/frontier_quest_contract.mjs
node tests/story_campaign_contract.mjs
```

The importer verifies source hashes, native alpha, padding, exact compiled picking masks, six distinct frames, and complete clip coverage. The combat contract regenerates coverage from current spawn data and checks elements, mitigation, release timing, single hits, interruptions, map isolation, death bursts, splitting, corpse consumption, diagnostic visibility, and presentation/RNG independence. Browser checks exercise every clip/facing/resolution with normal and reduced motion, hit flashes, tints, and picking geometry. Review captures and machine-readable results are in `tests/qa/act1_animation`.

For paired performance measurements, run `python tests/act1_animation_server.py` and then `node tests/act1_animation_performance.cjs`. The server uses the exact pre-pass workspace JS/index snapshot in `tmp/act1_animation/before` and unchanged static assets for the baseline. The benchmark alternates three pairs at each resolution, with 24 enemies, eight tinted enemies, six deaths, 90 warmup frames, and 240 measured frames. It reports median p95 CPU update/render submission time across the pairs; it does not measure GPU display latency. The local snapshot includes the user's pre-existing uncommitted changes and is intentionally outside the delivered asset bundle.

### Recorded results

- Asset coverage and native-alpha checks: 145 enemies, all 361 action mappings, 75 manifest entries.
- Animation/combat contract: 14,048 checks passed.
- Idle/walk/attack/recovery identity: 1,168 browser cases passed across both facings, resolutions, motion preferences, and Korvath phases; breathing preserves ground anchors.
- Browser matrix: 2,888 clip/facing/resolution/motion cases passed, including compiled picking, tints, and hit flashes.
- Actual Yeti, beacon, and both Korvath phases: all six action frames observed during real combat, without browser errors.
- Boss regression: 85,616 checks passed. Opening: 893. Frontier quests: 153. Campaign: 214. Terrain cache: 4,007.
- Visual review: native transparency, packed frame bounds, body/weapon continuity, ground anchors, prone corpses, projectile origins, and indicator removal reviewed using atlas contacts and 1080p/4K captures.

The performance target is **not fully met**. On Chrome 152, median paired p95 was **3.1 → 3.8 ms at 1080p (+22.6%)** and **3.5 → 3.7 ms at 4K (+5.7%)**. The 4K result meets the 10% target; the 1080p result remains above it. All individual runs are retained in `tests/qa/act1_animation/performance.json`; the report does not hide slower initial pairs. Further performance work should compare the same baseline and report frame-time variance, rather than infer display FPS from these CPU timings.
