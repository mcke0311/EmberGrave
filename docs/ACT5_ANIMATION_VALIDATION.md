# Act V authored enemy animations

The presentation module covers the 50 Act V combat profiles plus risen,
tomb_husk, drowned_dead, and frost_risen summons. Bone Dragon, Infernal Warlord,
and Flesh Engine are included despite the catalog's legacy `boss: 'mini'` flag.
Vethriss and encounter-controlled campaign bosses are excluded.

`assets/act5_animations/catalog.json` records 26 shared artwork identities and
each creature's actual animation sequences. `generated.json` records the
built-in ImageGen prompts, references, and original output paths. Original
generations are retained separately from any prepared atlas input.

## Runtime

`Act5EnemyAnimation` reads simulation time and receives action, deferred-release,
motion-finish, teleport, cancellation, and death notifications. It does not
schedule damage, move creatures, consume gameplay randomness, or change attack
cooldowns. Six frames represent anticipation, release, and recovery; charge and
leap hold the active frame while the existing controller moves the enemy.
Death uses the existing corpse timer and holds the final remains. Death bursts
hold anticipation until the original burst time.

Ground warnings remain in combat state but are not drawn for this roster in
ash_wastes, cinder_bastion, and throne. This includes projectile-owned thrown-body
landing markers. Radius novas are hidden; projectiles, weapon trails, particles,
and attached skill accents remain visible. Other acts and Vethriss keep their
existing presentation.

Atlases use the existing isolated-frame renderer, authored targeting masks,
prewarmed hit flashes, ground anchors, and horizontal facing. The Act V bundle
loads before map entry once assets are installed. With no installed bundle,
ordinary sprites remain usable while the art import is being completed.

## Reproduction

Run commands from the repository root. On this Windows environment, Node needs
`--preserve-symlinks --preserve-symlinks-main`.

```powershell
node --preserve-symlinks --preserve-symlinks-main tests/act5_animation_contract.mjs
node --preserve-symlinks --preserve-symlinks-main tests/act5_animation_contract.mjs --baseline
python tools/import_act5_animations.py --check
python tests/cinders_server.py
# Supply the bundled node_modules directory through NODE_PATH for Playwright.
node --preserve-symlinks --preserve-symlinks-main tests/act5_animation_browser.cjs
```

The `--baseline` comparison uses the pre-change sources restored from
`tests/fixtures/act5_animation_before.zip` into `tmp/act5_animation/before`.
The contract exercises all 54 IDs, every actual AI skill entrypoint, six-frame
sampling, release timing, interruptions, consumed corpses, movement recovery,
stable paused sampling, scope isolation, and real warning-render suppression.
It compares seeded health, positions, cooldowns, summons, deaths, drops, and
quest state with animations disabled or with the saved pre-change sources.

Open `/tests/cinders_review.html?enemies` on the review server to stage native
packs or inspect a selected animation frame at 1080p and 4K. Restage the enemy
after scrubbing to return to a normal live encounter.

## Current validation

- PASS: 13,694 Act V animation checks against the pre-change snapshot.
- PASS: 966 existing Act V enemy combat checks.
- PASS: existing Cinders balance suite (1,200 matched encounters).
- PASS: Act III roster isolation, 30 spawn-list comparisons.
- PASS: Act II animation suite, 22,694 checks.
- PASS: Act III animation suite, 15,194 checks.
- PASS: browser smoke test enters Cinderfields with 97 enemies and no script errors.
- Preserved: all 26 generated sheets and source hashes; 25 have baked checkerboards.
- Pending: complete transparent atlas import and in-browser visual validation.

Most generated sheets contain a baked checkerboard. They must not be installed
as opaque atlases. The importer rejects inputs without real alpha. Separate-copy
background cleanup is awaiting the user's response to the explicit Python-editing
authorization question; the original generations are preserved.
