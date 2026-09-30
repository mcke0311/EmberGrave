# Visual and mechanical upgrades

Heroes now use broader cloth shading, worn metal textures, softer reflections,
and regional light colors. Hostile windups keep their exact damage footprints,
with strong two-tone edges and a filling warning dressed in frost, roots, or
runes. Friendly ground effects are quieter, especially with multiple players.

## Controls and encounters

- **Settings → Gameplay → F1–F4: cast directly** is optional and off by default.
  Keys cast their assigned skill toward the pointer. One press during the final
  150 milliseconds of recovery queues the next skill; it never shortens the
  current attack. Menus, travel, death, respec, and lost focus cancel stale input.
  Drawn Shot automatically releases at full draw. Empty slots still open the picker.
- **Cursed and ambush events** preview their defender count and guaranteed rare
  reward before activation. The prop becomes a sealed cache. Kill every defender,
  then interact again to collect. If your pack is full, the cache keeps the entire
  reward. Active defenders and unclaimed treasure survive saving and loading.
- **Wardbearer** plants a breakable banner. Allies in that pack within five tiles
  take 35% less damage while the bearer and banner survive. **Soulbound** pairs
  take 35% less damage while within four tiles of each other. Separate the pair
  to break the protection. At most one behavior is introduced per eligible pack;
  these do not appear in the opening or boss arenas.

## Precision reforging

At a forge, choose **Precision reforge**, place one identified rare and one
ordinary glyph, then choose the property to change. All other properties remain
unchanged. The first reforge permanently selects that property's slot for future
precision reforges. Each attempt costs a glyph and
`max(100, item level × 35) × (previous attempts + 1)²` gold, capped at ten million.
The existing full-item reweave remains available for rares without a precision
lock. Once committed, only the chosen slot can be rerolled. The tooltip records it.

## Sunderstone Echoes

Complete the saga to unlock **Sunderstone Echoes** at Frosthaven's waystone.
Choose a desired equipment category and then one of two described curses before
each of three encounters: Korvath, the Mire Mother, and Malthoron. Curses persist
and stack through that expedition. Enemy life and damage scale with the hero's
entry level (the highest party level in co-op) while warning timings stay unchanged.

After each victory, claim the pending reward or choose another curse and continue.
The first two encounters bank rare items in the selected category; the final
encounter banks a unique where an eligible unique exists, otherwise a rare. Bonus
gold is 250, 1,000, or 2,250 after one, two, or three victories. Ordinary drops are
kept separately. Defeat or forfeiting removes the unclaimed expedition bonus.
An unfinished battle restarts from its entrance after loading; completed
encounters, curses, and pending rewards persist.

Co-op remains an Act I campaign with these three optional Echo arenas. A host
who has completed a solo saga unlocks them for the party. The host chooses curses
and when to claim; each participant gets their own expedition reward. Guests can
collect stored rewards at the waystone after the party claims. Commands, rewards,
save rollback, and travel are validated by the host worker. New clients and the
relay must use the matching `embergrave-coop-5` build.

## Verification

Run against an isolated local server (`python serve.py`):

```text
node --test tests/upgrades_contract.test.cjs
node tests/upgrades_browser.cjs
node tests/upgrades_coop_browser.cjs
```

The contract suite covers buffer cancellation, affix preservation and locked-slot
save round trips, failed-save rollback, defender restoration, cache claims,
protection radii, three Echo encounters, per-player rewards, and new expeditions.
The browser suite captures all five starter classes on snow, marsh, and cathedral
floors at desktop and touch-phone sizes, and exercises direct casting, Echo entry,
both skippable scenes, and reduced motion. Captures are written to `tmp/upgrades-qa`.
The co-op browser test uses four clients and a local relay to exercise all three
arenas and each participant's claim, with desktop and touch-phone combat captures.

The historical `act2_indicators_contract.mjs` fixture assumes `ritual_site` still
contains a boss arena; it fails before combat on unmodified HEAD as well. Current
arenas are separate maps. Current warning coverage is in the new browser checks;
run the existing VFX comparison with `--current-gameplay` for today's skill rules.
