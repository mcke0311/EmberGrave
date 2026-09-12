# Phone presentation

Phones use landscape throughout the game. Portrait shows a rotation prompt,
preserves the current form/menu, cancels held input, and pauses solo simulation.
A multiplayer party continues while its local player is behind that prompt.
Tablets and desktop retain their existing layouts. `?touch=1` forces the phone
presentation for browser review; `?touch=0` disables automatic touch layout.

Drag in the lower-left thumb area to move; the floating stick anchors under the
finger and disappears on release. Attack uses the existing primary binding.
The four skill buttons cast their saved quick-slot skills directly without changing
the secondary mouse binding. Hold repeatable attacks, tap buffs or summons, and
release charged skills to fire. Movement, potions and combat use independent
pointers. Empty skill buttons open assignment; Talents → Loadout assigns Attack
and all four slots. Jump and the four belt slots remain directly reachable.

Pack opens inventory. Menu opens More. The shared header has Pack, Character,
Talents, Quests and More tabs. Content scrolls vertically; Back returns from details
and Close returns to play. All full-screen phone menus pause solo simulation.
Co-op continues and shows “Party is live.” The minimap toggles the map overlay;
loot labels and Party are in More, with a HUD badge for party errors.

Inventory cards represent the existing items and grid capacity: presentation does
not move, duplicate, or reorder inventory data. Pack, Equipment and Belt have
explicit subtabs. Carrying an item exposes
“Place carried item here” in the destination container; this finds a valid free
position using the existing placement rules. Item cards still support swaps,
socketing, equipping, using and selling through the production action handlers.

New heroes have a class/preview step followed by name and options. Large
descriptions scroll. Form values, selected tabs and scroll positions are retained
during resizing and production UI refreshes. Text editing
uses the visible viewport and a Done control when the keyboard reduces its height.

## Browser presentation

Full screen is available in the title's More options and pause menu when the
browser supports it. It requires a tap, requests landscape locking when possible,
and handles denial and browser-driven exit. The portrait prompt is the fallback
when orientation locking is unavailable.

Add to Home Screen uses a native install prompt when one is available. Otherwise
the help screen describes the browser menu. On iPhone: Safari → Share → Add to
Home Screen → Open as Web App → Add. Open the resulting icon to launch without the
address bar. A normal browser tab can retain its address bar. Installed mode hides
installation offers. The manifest uses relative URLs so subdirectory hosting works;
production installation needs HTTPS. This change does not add offline caching or
cross-browser save synchronization.

`MobileShell` owns the viewport, orientation and browser display state.
`MobileWorkspace` coordinates navigation, focus, related service panels and input
blocking. `MobileViews` mounts explicit inventory, equipment, belt and loadout
views from production renderers and remembers presentation state. The old generic
`MobilePages` flattening/pagination engine has been removed. Existing item controls,
callbacks and IDs remain connected. `Game.touchQuickSlot(index, down)` and the
matching co-op input method resolve the skill on press; existing host attack/cast
commands still validate gameplay. Inventory commands and save fields are unchanged.
Basic Attack in a quick slot now also survives a solo save reload.

## Verification

Start `python serve.py`, then run `npm run test:phone`. The multiplayer UI suite
also needs the local relay on port 8742: `node server/relay.cjs`, followed by
`npm run test:coop:ui`. In restricted Windows environments, invoke Node with
`--preserve-symlinks --preserve-symlinks-main` as the existing test notes describe.
Tests use isolated browser storage, never the player's saves.

The phone suite covers 568×320, 568×240, 667×375 and 844×390 viewports; every
section in inventory, storage, all five classes and disciplines, quests,
travel, vendors, dialogue, settings, loot filtering and critical overlays; long
text and many saved heroes; keyboard and rotation state; and fullscreen rejection,
entry/exit and install detection. The existing touch suite exercises trusted
multitouch movement, combat, potion use, pointer cancellation and item actions.
`tests/mobile_redesign_browser.cjs` adds populated HUD geometry, natural touch
scrolling, direct casts, assignment focus, detail Back navigation, scroll restoration,
solo pause, keyboard isolation and visual captures at all four sizes. Its report
and screenshots are written to `tmp/phone-redesign/`. Contract coverage lives in
`tests/mobile_controls_contract.mjs` and `tests/mobile_coop_input.test.cjs`.
The settings suite retains desktop navigation and persistence checks. Multiplayer
coverage retains authoritative inventory updates, failed-save rollback, reload
recovery and ownership protections.

Browser emulation cannot certify physical browser chrome or the operating system's
Home Screen flow. Before release, verify Safari/iPhone and Chrome/Android on real
devices: browser bars expanded, both landscape directions and notches, keyboard
opening/closing, fullscreen exit, installation and standalone reopening. Confirm
saved-hero availability in the actual launch context. These device checks remain
manual; no physical phone was attached to the implementation environment.
