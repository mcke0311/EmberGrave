# Phone presentation

Phones use landscape throughout the game. Portrait shows a rotation prompt,
preserves the current form/menu, cancels held input, and pauses solo simulation.
A multiplayer party continues while its local player is behind that prompt.
Tablets and desktop retain their existing layouts. `?touch=1` forces the phone
presentation for browser review; `?touch=0` disables automatic touch layout.

Game menus use Sections, Previous and Next instead of scrolling. Inventory cards
represent the existing items and grid capacity: paging does not move, duplicate,
or reorder inventory data. Equipment has its own section. Carrying an item exposes
“Place carried item here” in the destination container; this finds a valid free
position using the existing placement rules. Item cards still support swaps,
socketing, equipping, using and selling through the production action handlers.

New heroes have a class/preview step followed by name and options. Large
descriptions are divided into text pages. Form values, selected sections and page
positions are retained during resizing and production UI refreshes. Text editing
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
`MobilePages` pages the connected production controls and temporarily flattens
layout wrappers. It restores original markup when a panel closes or leaves phone
mode. Interactive elements are not cloned; their existing callbacks, IDs and form
state remain in place. Inventory commands, multiplayer messages and save formats
are unchanged. The game canvas uses the same viewport as its overlays.

## Verification

Start `python serve.py`, then run `npm run test:phone`. The multiplayer UI suite
also needs the local relay on port 8742: `node server/relay.cjs`, followed by
`npm run test:coop:ui`. In restricted Windows environments, invoke Node with
`--preserve-symlinks --preserve-symlinks-main` as the existing test notes describe.
Tests use isolated browser storage, never the player's saves.

The phone suite covers 568×320, 568×240, 667×375 and 844×390 viewports; every
category/page in inventory, storage, all five classes and disciplines, quests,
travel, vendors, dialogue, settings, loot filtering and critical overlays; long
text and many saved heroes; keyboard and rotation state; and fullscreen rejection,
entry/exit and install detection. The existing touch suite exercises trusted
multitouch movement, combat, potion use, pointer cancellation and item actions.
The settings suite retains desktop navigation and persistence checks. Multiplayer
coverage retains authoritative inventory updates, failed-save rollback, reload
recovery and ownership protections.

Browser emulation cannot certify physical browser chrome or the operating system's
Home Screen flow. Before release, verify Safari/iPhone and Chrome/Android on real
devices: browser bars expanded, both landscape directions and notches, keyboard
opening/closing, fullscreen exit, installation and standalone reopening. Confirm
saved-hero availability in the actual launch context. These device checks remain
manual; no physical phone was attached to the implementation environment.
