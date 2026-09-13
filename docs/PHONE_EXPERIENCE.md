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

Merchant categories show the full two-column stock list. Inspecting an item hides
the category tabs; Back restores that category and its scroll position. Opening
a merchant starts at the top of its list, with browsing state scoped to that vendor.
The shared header measures its actual height so it cannot cover the inventory.

New heroes have a class/preview step followed by name and options. The complete
rendered model fits a dedicated rectangle above the gear and rotation controls,
including saved heroes and viewport changes. Gameplay rendering is unchanged. Large
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
production installation needs HTTPS. The gold shield crest supplies 16/32px
favicons, a 16/32/48px ICO, a 180px Apple touch icon, and 192/512px app icons.
Separate maskable icons keep the crest inside the central 40%-radius safe circle.
Regenerate them with `python tools/app_icons.py`. This change does not add offline caching or
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

## Mobile fixes verified September 12, 2026

Run `npm run test:mobile-fixes` with the local server running. This adds checks
for every class, both gear previews, rotation, saved selection and resizing at
568×240, 568×320, 667×375, 740×360 and 844×390; all six vendors and all categories;
trusted swipes to the last item, inspection and Back; merchant switching;
purchases, sales, insufficient gold and a full pack. Reports and screenshots
are written to `tmp/mobile-fixes/`. The complete existing phone suite also passes.

The opening walkthrough creates a hero in the title UI and uses trusted Chrome
touch events for movement, combat, supplies, dialogue, the gate and Seraneth.
It never assigns positions or stages. The clock advances production updates at
50 ms, and invulnerability isolates progression from bot survival; this is not
a combat balance or physical-device test. A separate checkpoint fixture follows
the courtyard's east edge to the gate, missing the old point trigger entirely,
and verifies optional supplies and a single captain spawn.

Boss coverage checks reachable engagement points across five world seeds, plus
trusted touch approaches to all 18 active campaign, optional and restored scripted
encounters. Fresh Oathsworn and Choirmaster spawns also run through touch attacks,
including the missing-video fallback. Those scripted tests use an equipped
level-30 fixture. The existing boss suite retains phases, arena resets, wards and
rewards. Three legacy miniboss definitions (Bone Dragon, Flesh Engine and Infernal
Warlord) are excluded by current population/event pools and have no live trigger.
The audit also found and fixed a sparse doorway-placement failure for world seed
320040388: a denser fallback searches the same solid banks and retains every
collision, elevation and arena exclusion check. Existing doorway seats stay stable.

`npm run test:phone:webkit` covers previews, merchant states and header clearance
in Playwright WebKit. Install that browser with `npx playwright install webkit`.
This environment used `PLAYWRIGHT_BROWSERS_PATH=tmp/playwright-browsers`; set the
same variable when rerunning here. The Windows WebKit port lacks Web Audio, so
this UI-only suite replaces audio functions in its isolated test page. It passed
133 checks; it does not certify Safari on an iPhone.

Physical Android installation, launch icon appearance, standalone reopening and
saved-hero availability remain release checks. Record the device, OS/browser
version and result separately from browser emulation. No physical Android or
iPhone was connected for this change. No website deployment was performed.

### Automated results

| Coverage | Result |
|---|---|
| Chrome mobile fixes, all six merchants | 770 checks passed, plus 66 purchase/sale checks across all 22 nonempty merchant categories |
| Existing phone suite | Passed, including 29 touch, 57 redesign and 88 settings checks |
| WebKit presentation | 133 checks passed; audio stub described above |
| Desktop title and saved heroes | 410 checks passed |
| Mandatory opening and save compatibility | 1,110 checks passed |
| Complete opening through touch | 9 checks passed through 14 observed stages |
| East-edge captain route through touch | 9 checks passed |
| Other active bosses through touch | 18 engagements passed; 7 fresh scripted-spawn checks passed |
| Boss navigation and encounter behavior | 473 activation and 85,616 existing encounter checks passed |
| Act I environment and doorway regression | 239,443 checks passed across 31 seeds |
| Co-op | 23 connection/input/relay tests, 85 ownership checks and 25 inventory checks passed |
| Campaign, difficulty and character rendering | 214, 2,947 and 174 checks passed respectively |
| Icons | 39 asset checks and all 9 served icon/manifest URLs passed |
