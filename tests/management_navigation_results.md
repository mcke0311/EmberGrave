# Music, management screens, and terrain navigation — verification

All checks below passed. Browser fixtures replace localStorage with an in-memory
store before loading the game; the user's heroes are not read or changed.

| Check | Result |
| --- | --- |
| `navigation_contract.mjs` | 541 assertions, including slopes, hops, cliffs, diagonal corners, changed/occupied landings, long routes and three northern world seeds |
| `management_contract.mjs` | 897 assertions, including recipe eligibility, purchase capacity and three atomic tidy rollback cases |
| `town_layout_contract.mjs` | 54,256 assertions across five towns and four seeds |
| `management_ui.html?w=1366&h=768` | 50 interface and production movement assertions |
| `management_ui.html?w=1024&h=768` | 49 assertions; paired services stack in a scrolling workspace |
| `management_ui.html?w=1920&h=1080` | 50 assertions; paired services and pack fit without overlap |
| `startup_music.html` | 30 assertions with real MP3 decoding/playback, all Act I assignments, looping, rapid transitions, volume, mute and title recovery |
| `player_walk_cycle.html` | 388 legacy sprite rendering/movement assertions across all five classes |
| `terrain_render_contract.html` | 25,121 assertions and four production terrain-rendering scenes |
| `character_game_integration.html` | 150 assertions covering mandatory 3D, equipment transactions, old saves, five classes and transformations |
| `class_skill_ui.html` | 1,179 assertions across five classes, 15 disciplines and 107 skills |
| Modified JavaScript modules | All nine pass syntax checks |

The management browser fixture checks inspection versus purchase, selling, full
packs, carried-item purchase blocking, equipment swaps, search, tidy, attribute
spending, live Life values, quest states, all four forge recipes, unidentified
rare rejection, material return when opening dialogue, and potion overflow with a
full pack. Its game-loop scenarios cover route reuse, interaction after a hop,
queued steering, companion following, walking-only enemies, map changes and death.

Visual review led to a compact equipment layout at shorter heights, a persistent
selling notice, accessible primary actions, and a wider journal that shows the
selected quest alongside its list. The full pack is asserted visible at the two
desktop sizes; narrow paired workspaces scroll vertically.

Use `node --preserve-symlinks --preserve-symlinks-main tests/<contract>.mjs` in
Windows environments with parent-directory realpath restrictions. Serve the
browser checks through `python serve.py` on port 8741.
