# Act V enemy combat profiles

The 50 shared enemy IDs used in Cinderfields, Cinder Bastion and Throne of Cinders have explicit roles in `DATA.ACT5_COMBAT_PROFILES`. The table runs after roster generation and before authored art and editor overrides. Null entries remove incompatible generated abilities. Existing fitting kits remain intact. The table does not change HP, damage rolls, armor, XP, speed, pack sizes, faction, family or artwork.

Sword and axe silhouettes use elemental weapon attacks. Unarmed hulks use punches and warned slams; spectral bodies use contact attacks, pulses or short blinks; wand bearers fire the matching element. Cinder Hounds bite with fire. Bone Dragons can shoot at nine tiles and prefer six-tile spacing. Vethriss remains under the existing three-form boss controller.

Shared combat rules in `Monster` now resolve elemental damage through the appropriate hero, pet or monster damage API. Successful basic melee and projectile hits apply configured chill and ten-percent actual-damage lifesteal. Healing prevention blocks lifesteal and rallies. Hostility follows the existing melee-only, non-boss infighting rule and faction/family identity; pack awareness still depends on the hero's original sight distance.

Delayed attacks capture their world, map and interruption epoch. Stun, freeze, fear, pulls, death and travel invalidate them. Death bursts have a separate 0.6-second warning and can resolve only in the original map. Splitting and ordinary summons retain rewards; summoned children inherit faction and owner, and ordinary callers have six living children at most. Thrown undead use the same ownership rules.

Slams warn for at least 0.8 seconds. Charges, pounces and whirlwinds warn for at least 0.6 seconds; longer existing warnings remain. Warning shapes are also the damage shapes, with line-of-sight checks. Charge corridors use swept, radius-aware ground traversal and stop at walls/cliffs. Leap and teleport destinations require supported body footprints. Active moving attacks keep their warning visible; projected warning vertices are cached between changes. Ground anchors determine membership in warning shapes.

## Review and reproduction

Run `python tests/cinders_server.py`, then open [the isolated enemy review](http://127.0.0.1:8875/tests/cinders_review.html?enemies). It restores separate layout and enemy baselines and uses temporary saves. Choose area, seed, version, landmark, enemy, single/native pack and resolution. Stage the enemy, ready its specials, and play; the overlay shows role, element, abilities and cooldowns. The normal route overview and landmark controls remain available.

Commands from the repository root:

```powershell
python tests/cinders_enemy_baseline.py
node --preserve-symlinks --preserve-symlinks-main tests/cinders_enemy_contract.mjs
node --preserve-symlinks --preserve-symlinks-main tests/cinders_enemy_balance.mjs
python tests/cinders_enemy_regressions.py
# Requires Playwright; run CPU comparisons sequentially with other test work idle.
node --preserve-symlinks --preserve-symlinks-main tests/cinders_enemy_browser.cjs
node --preserve-symlinks --preserve-symlinks-main tests/cinders_browser.cjs profile ash_wastes --enemies
node --preserve-symlinks --preserve-symlinks-main tests/cinders_browser.cjs profile cinder_bastion --enemies
node --preserve-symlinks --preserve-symlinks-main tests/cinders_browser.cjs profile throne --enemies
```

The immutable fresh baseline is `tests/fixtures/cinders_enemies_before.zip`; its sources and SHA-256 values are recorded under `tests/qa/cinders_enemies/baseline.json`. Catalog randomness is seeded before roster construction for matched tests. Enemy screenshots, a CSV/JSON roster audit, balance outcomes and regression logs are under `tests/qa/cinders_enemies/`. CPU samples use the `enemy_` prefix under `tests/qa/cinders/`, preserving the earlier level redesign measurements. The earlier artwork and its ImageGen provenance are unchanged; see [CINDERS_DESIGN.md](CINDERS_DESIGN.md).

No public map-generation arguments, save fields, campaign links, quest q18 conditions, ending rules or boss framework were changed by this attack pass.
