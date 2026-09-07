# Chest, kick and death audio verification — 2026-09-06

## Verification on the player's server

After a report that the changes were not visible, checked the user's exact
address, `http://localhost:8741`. It served the current workspace files but was
running a plain Python server without cache-control headers. Replaced that
listener with this project's threaded `serve.py` on the same port. Verified
`Cache-Control: no-store, no-cache, must-revalidate, max-age=0` on the HTML, game
code, audio code, character modules and opened-chest sprite. A request carrying
an `If-Modified-Since` header also returned current HTML with status 200.

Re-ran `prop_interactions.html` on **localhost:8741**: all **48 checks passed**,
including actual chest/object clicks, the rendered open-chest asset, kick timing,
and recorded death playback. Already-loaded game pages retain their old scripts
until reloaded; changing the server cannot replace code inside a running page.

## Feature checks

- `prop_interactions.html`: **48 checks passed** in Chromium. Real mouse events
  activate the production click handler and player update. Closed/open sprite
  selection, ordinary chest persistence on map revisits, event caches, duplicate
  loot prevention, urn/barrel/crate impact timing, collision removal and recovery
  all pass. Interrupted, removed-target and out-of-range kicks do not break a
  prop; AoE destruction does not start a kick. The supplied player death MP3
  decodes, contains audio, plays once on death, fetches once, and follows the SFX
  and Master buses with Music muted. Existing saves are isolated.
- `ui_sound.html`: **52 checks passed** after preloading the additional recorded
  effect. Existing clicks, menus, inventory, disabled controls, volume, rapid
  input and suspended audio recovery remain functional.
- `character_animation3d_contract.mjs`: **55,188 checks passed** across all five
  classes and every weapon family, including raised/extended kicking feet,
  smooth start/recovery, finite poses, attached two-hand grips and grounded death
  poses. There are now 40 clips across the five classes.
- `character_forms3d_contract.mjs`: **2,076 checks passed** across all four
  transformations, including their break-object motions and planted recovery.
- `story_campaign_contract.mjs`: **214 checks passed**, including quest chests
  retaining their opened state when the cathedral regenerates from saved quest
  discoveries.
- `navigation_contract.mjs`: **541 checks passed**.
- Modified classic game scripts passed Node syntax checks. The new chest's
  authored RGBA source, manifest lookup, dimensions and anchor were verified.

Visual review of the Vanguard and Ember Witch confirmed the chambered knee,
forward sole at contact, retraction and planted recovery; the open chest has a
raised lid and visible empty interior. The review page offers class selection,
kick/chest replay and a player-death playback button.

Ordinary map objects retain their state for the current expedition, using the
existing map cache. The change does not add full-world persistence to hero saves.
The runtime adds no test hooks; the HTML fixture injects private update/render
access only into its isolated game copy.
