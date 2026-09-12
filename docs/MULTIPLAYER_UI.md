# Personal inventories and mobile menus

Every multiplayer hero has their own pack, equipment, belt, strongbox, carried
item, and forge offerings. Opening a strongbox shows that hero's saved items.
The interface is reused from solo play; inventories are never pooled. Host
commands look up items only on the requesting player's actor. Ground drops and
vendor stock retain the existing first-valid-purchase/pickup rules.

## Screens and interactions

Multiplayer uses the solo class cards, live 3D preview, equipment preview,
rotation controls, and saved-hero roster. Choose or create a hero, then host or
join a party. Back navigation retains the selected hero, room code, campaign,
and relay address. Co-op saves remain separate from solo localStorage saves.
Co-op creation retains the 24-character name limit and Normal difficulty.
Deleting a hero confirms the names of owned campaigns that will also be deleted.

Inventory, storage, trading, and forging use the existing grids and equipment
slots. Search, tidy, comparisons, stack merging, identification, socketing,
equipment swaps, belt actions, and vendor identification run through the same
screens. Multiplayer mutations use item IDs and host-validated transactions.
Pending changes show a status message; rejected actions retain the last committed
state. Snapshot refresh preserves search, scroll position, selection, and focus.

Mobile uses one full-screen workspace with tabs for related services. Item
details and actions have a Back button. Combat controls and the party HUD are
hidden while menus are open. Opening a menu cancels the local hero's movement
and held attack on the host. The world continues simulating in multiplayer.
The Party button opens the roster, Ready control, room code, and connection/save
status. The party HUD also hides behind desktop management screens.

## Persistence and compatibility

Optional `management` data in each hero record stores the carried item, four
forge offerings, and their origins. Items are inlined in player snapshots and
included in uniqueness validation. Old saves default to empty management data.
Restoring inventory preserves valid saved coordinates, with auto-placement for
legacy or invalid positions.

Closing management, leaving, death, and travel return held items to their
original location when possible, then the pack. Overflow is placed at the
hero's feet with feedback. Save failure rolls back the transaction. Reloading a
guest restores the reserved actor and resumes command numbers after requests
already seen by the host, so recovered items remain usable.

The protocol build identifier is `embergrave-coop-2`. The frontend and relay must
run the matching build; the existing IndexedDB database requires no upgrade.
This change has not been deployed.

## Validation

- `npm run test:coop`: relay, motion, original ownership contracts, and the new
  personal-inventory carry/swap/craft/save contracts.
- `npm run test:coop:ui`: 66 browser checks for all five class previews, failed
  connection retry, ownership isolation, menu input cancellation, personal item
  persistence, host save rollback, reload while carrying, vendor contention,
  hero/campaign deletion, and mobile layouts.
- `npm run test:coop:network`: 18 latency, replay, reconnect, save-failure, and
  mobile checks, including nominal 150 ms RTT with jitter.
- `npm run test:coop:browser`: 29 campaign checks with four players; the same
  suite also passes with `COOP_TEST_PLAYERS=2`.
- Existing title (410), management browser (60), mobile browser (28), management
  contract (897), character-sheet (25,005), mobile input (43), and gameplay input
  (153) checks passed.

Screenshots are under `tmp/coop-ui-qa/` and `tmp/mobile-controls/`. Layout checks
cover 320×568, 390×844, 844×390, 1024×768, and desktop. Portrait and landscape
screenshots were inspected. Tests use isolated Chrome contexts and touch
emulation; physical iOS/Android hardware and onscreen-keyboard behavior still
require device validation.

The management fixture now checks the current character-sheet sections and
dismisses its simulated death dialog. The campaign fixture uses durable heroes
for accelerated quest steps after testing real revival interruption, avoiding
random monster deaths during scripted rescue interactions. The campaign run
also exposed and verified a fix for guest boss status: snapshots carry the
display text rather than relying on a host-only method.
