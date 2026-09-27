# Act I habitats and Shardpeak

The Abandoned Mines replace ten former Shardbound pack slots with crystals at
the haul, ore, and cache landmarks. Both Shardbound enemies are excluded from
the mine's normal and event pools. Each crystal breaks once, with a 10% chance
of one socketable jewel at the area's effective difficulty level.

Act I Icefang sites and Wolf Den events are destructible, enlarged to 1.75×,
and placed within two tiles of exterior-connected walls. Routes, ramps, arrivals,
architecture, and objectives remain clear. A living connected player within 12
tiles on reachable ground activates one wolf every six seconds, capped at four
living den-owned wolves. Cooldowns pause while distant or capped. Destruction
stops production; existing wolves remain and grant normal combat rewards.
Other species' habitats retain their previous behavior.

Act I Spider Nests break once: 40% one Crypt Widow, 40% one random common-quality
item from the normal monster loot table, and 20% empty. Magic Find does not raise
the nest reward's quality. If that table produces no common items, the item outcome
falls back to one level-appropriate potion from the same table's potion pool.
Spiders require a valid nearby spawn position. There is no ambush pack or cache
payout. Kicks, attacks, and skills share the same single-use resolution.

Shardpeak exclusively uses an ice-carved memorial, prayer-flag posts, ruined
mountain gatehouse, and stone windbreak shelter. Quest and landmark IDs remain
intact, and the entry keeps its passage artwork.

All six new sprites were generated with the built-in imagegen tool. Transparent
sources and exact prompts are retained in
`assets/sprites_src/gameplay_art_authored/act1_habitats/`. Its `import.json` records
hashes, crops, scales, and anchors. Rebuild with `python tools/import_act1_habitats.py`.
The normal sprite build also consumes the registered gameplay-art descriptors.
Crystal states share their ground anchor and scale.

Single-player consumption follows the existing expedition cache rules. Co-op
restores props by stable identity and preserves live habitat monsters, ownership,
health, and den cooldowns. Legacy decorative-site state cannot disable new dens.
Cooldowns are saved but omitted from presentation snapshots to avoid sending the
whole prop catalogue every tick. Revised mine monster IDs prevent legacy
array-based defeats from being applied to unrelated enemies.

Validation:

```sh
node tests/act1_habitats_contract.mjs
node --test tests/act1_habitats_coop.test.cjs
python tests/act1_habitats_sprites.py
node tests/act1_habitats_browser.cjs
```

The browser runner uses Chrome and a review server on port 8768, with an isolated
hero in memory storage. See `tests/qa/act1_habitats/gallery.html` for 1080p/4K captures.
Windows sandboxes that deny Node's ancestor realpath lookup need the flags
`--preserve-symlinks --preserve-symlinks-main` on Node commands.
