# Embergrave co-op beta

Public and password-protected player-hosted co-op supports four heroes, all five classes, Normal difficulty, shared drops, shared Act I objectives, and teammate revival. A dedicated Web Worker on the host's device runs all occupied areas; the relay provides the lobby directory and routes messages. Existing solo saves remain in their original localStorage namespace. Nothing in this delivery publishes or modifies the hosted game.

See [personal inventories and mobile menus](MULTIPLAYER_UI.md) for the updated character screens, item ownership, save recovery, and UI validation.

## Run locally

Requirements: Node.js 22 or later, Python 3, and a current browser with WebSocket, IndexedDB, and Web Worker support (Chrome on Android is the mobile target). From the repository root, start the game in one terminal:

```powershell
python serve.py
```

Start the relay in a second terminal:

```powershell
cd server
npm ci
npm start
```

Open [the local game](http://localhost:8741). Choose **Multiplayer**, create a co-op hero, and choose **Host party**. The default party name uses your hero's name. Leave the password empty to appear in **Browse parties**, or set a password and share the invitation/code privately. Friends can browse public parties or use **Join by code** with the password when required. Use separate browser profiles or private windows to test independent saves on one computer. Ready indicators are informational. Travel is individual. New arrivals always start in Frosthaven with **Your party** open, wherever the host is exploring. The public list refreshes every five seconds and has a manual refresh; full rooms remain visible with joining disabled.

The default relay listens only on `127.0.0.1:8742`. [Relay health](http://localhost:8742/healthz) should return JSON with `ok: true` and the game build. The browser defaults to `ws://<game-hostname>:8742/ws`; the lobby also accepts a relay address. For a permanent deployment, configure `js/coop_config.js` or define `window.COOP_CONFIG = {relayUrl: 'wss://relay.example.com/ws'}` before that script loads.

## Play on a LAN

Find the serving computer's private LAN address, for example `192.168.1.25`. Copy `server/.env.example` to `server/.env` and configure:

```dotenv
BIND_ADDRESS=0.0.0.0
PORT=8742
ALLOWED_ORIGINS=http://192.168.1.25:8741,http://localhost:8741
MAX_ROOMS=100
```

Run the relay from `server` with:

```powershell
node --env-file=.env relay.cjs
```

Both devices open `http://192.168.1.25:8741` and use `ws://192.168.1.25:8742/ws`. Allow TCP ports 8741 and 8742 through the serving computer's firewall on its private network. Each exact game origin, including protocol and port, must appear in `ALLOWED_ORIGINS`. `localhost` on a phone refers to the phone itself. The existing Python server is a development server with an editor endpoint; use static hosting for Internet access.

## Online hosting

Invited friends need access to both the static game files and an accessible relay. Hosting the relay alone does not make a private game site accessible. This implementation leaves the existing hosted site unchanged; online deployment is a separate operation.

Serve the buildless frontend over HTTPS and put the relay behind an HTTPS reverse proxy that supports WebSocket upgrades. Use a valid TLS certificate and route `/ws` to the relay without changing the path; route `/healthz` for readiness checks and `GET /rooms` for public discovery. Set the browser relay address to `wss://.../ws`. An HTTPS game refuses insecure `ws://` relays.

For an Nginx proxy on the same server, add these locations inside your existing TLS `server` block. The upgrade headers follow [Nginx's WebSocket proxy documentation](https://nginx.org/en/docs/http/websocket.html).

```nginx
location = /ws {
    proxy_pass http://127.0.0.1:8742;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_read_timeout 90s;
}
location = /rooms {
    proxy_pass http://127.0.0.1:8742;
}
location = /healthz {
    proxy_pass http://127.0.0.1:8742;
}
```

Configure `ALLOWED_ORIGINS=https://game.example.com` for the game origin, rather than the relay's origin. Keep the relay's HTTP port private behind the TLS proxy. Rooms live in process memory: use a single relay instance, or route every connection for a session to the same instance. A relay restart disconnects active parties; the host can resume the saved campaign in a new room.

Docker packaging, run from the repository root:

```powershell
docker build -f server/Dockerfile -t embergrave-relay .
docker run --rm --name embergrave-relay -p 127.0.0.1:8742:8742 -e ALLOWED_ORIGINS=https://game.example.com embergrave-relay
```

The container runs as the unprivileged `node` user and includes a `/healthz` check. Its build context includes only the relay, lockfile, and wire protocol. No game assets or saves are stored in the relay.

## Campaign rules

- Start in Frosthaven. Explore Fallen North, Abandoned Mines, Shattered Temple, Shardpeak Shrine, and Deepfreeze Caverns. Korvath's quest turn-in completes the beta. The opening, Ashen Marches, later acts, hardcore, and friendly fire are excluded.
- Every hero sees the same drops. The first valid host-processed pickup gets the item or gold. Partial potion transfers leave the remainder on the ground. Each connected hero in that area receives kill XP with the existing level adjustment. Heroes elsewhere remain in the party roster and do not appear as actors in your world.
- The host accepts and turns in quests. Rescue and combat objectives advance collectively. A campaign reward ledger records participating heroes; each receives a quest reward once, including a participating disconnected hero retained by the host.
- Every hero can use nearby valid exits, unlocked waystones, and their own town portal. The host validates access and range again after loading. Failed loading or a 45-second timeout leaves that hero in the source area. Other areas keep running. Living companions, resources, items, and remaining buff/cooldown durations move with their owner; source-area casts and projectiles are cancelled.
- Open **Party** (on a phone: **Menu → Party**) to see every teammate’s area, connection and health. **Teleport to player** is free: channel for three seconds, then wait ten seconds after a successful arrival before using it again. Both heroes must be connected, alive, outside active boss encounters and combat-free for five seconds. Movement, damage, offensive actions, disconnection or destination changes interrupt it. The host rechecks eligibility after loading and finds walkable, hazard-free footing near the teammate.
- Interact with a fallen teammate in the same area within two tiles to revive them after three uninterrupted seconds. Movement or damage interrupts the attempt. Revival restores 35% health. Death takes 10% of current gold once per fall. A fallen hero can choose **Return to Frosthaven** individually from the party menu; the penalty is not charged a second time.
- Enemy health increases by 60% for each extra player. Each campaign area keeps the party size recorded at its first occupation. Damage and drop quantities are unchanged.

## Saves and connection behavior

The separate `embergrave-coop` IndexedDB database stores co-op heroes and host campaigns. The host's campaign contains authoritative copies of participating heroes. Guests store host-confirmed hero updates on their own device. Returning to a campaign restores its host-owned record, rather than accepting an older guest copy.

Economy changes execute serially and commit before acknowledgment. The affected area waits while its transaction saves; unrelated areas continue. Shared quest changes and remote rewards are staged against a separate campaign view, then merged after persistence; other areas continue combat without rollback. Routine checkpoints are asynchronous and do not pause live combat. A failed economy commit restores the transaction's state and pauses the party with **Save failed**. The host can choose **Retry saving**. Periodic checkpoints occur every five seconds and after critical progression, travel, and orderly exit. Abrupt browser/process loss can still lose progress since the last successful checkpoint. Resume a saved campaign in Frosthaven; objectives, inventories, reward ledgers, defeated enemies, opened props, and persistent terrain changes remain, while transient combat resets.

Menus block only the local player's input. Destination assets load without pausing other areas. A cinematic holds only its own area until its connected viewers finish or its timeout expires. Hiding the host page pauses simulation. Browsers throttle background execution, so guests also detect missing application heartbeats independently. [Page Visibility API behavior](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API)

A guest who loses its socket remains vulnerable for 60 seconds. Automatic reconnect uses a private connection token and restores that same actor. A guest can also reload the same tab and rejoin the same room with the same hero during that window; the token is retained in tab-local sessionStorage. Keep the host's page open while it reconnects: reloading the host requires starting its saved campaign in a new room. Host socket loss pauses the session; expiration ends the room without host migration. Co-op heroes and campaigns are browser/profile/device-local; clearing site data removes them. There are no accounts, cloud saves, ranked matchmaking, chat, or direct trading UI.

## Protocol and operational limits

`js/coop_protocol.js` defines protocol version 2 (`embergrave-coop-3`) and the shared build identifier. Change the build identifier whenever incompatible simulation or serialization changes ship, and update client and relay together. The relay rejects mismatched builds, binds sender identity to the socket, allows guests to route only to the host, and permits only the host to broadcast world state. The browser uses its native WebSocket API; the Node relay uses [`ws`](https://github.com/websockets/ws/blob/master/README.md).

The host worker runs fixed 30 Hz simulation for occupied worlds, including disconnected heroes during their reservation. Empty worlds keep their state and stop their clocks. All six maps prepare before live play to keep map generation out of transfers. Rendering, asset loading, audio and DOM work stay on the main thread, which displays only its local area.

Movement/combat snapshots publish at 15 Hz to each recipient's area and nearby actors, with lightweight shared campaign and party state. Each recipient has its own baseline and a four-update acknowledgment window. Recipients in the same area reuse immutable encoded records within one publication, while retaining their own visibility and portal projection. Full snapshots are targeted on admission, reconnect, travel and resync; ordinary saves do not force full broadcasts. Broken-prop collision changes use compact per-cell terrain patches. Inventory/equipment records are cached by revision, combat records use explicit fields and nested patches, and unchanged menus and hero assets are reused. Local heroes predict steering and reconcile against acknowledged command sequences; remote actors interpolate timestamped samples. World IDs and per-player travel generations reject stale commands and snapshots.

Under congestion, unsent steering is coalesced and state sampling waits for that recipient's acknowledgment window. Ordered actions and save acknowledgments retain their order. Automatic mobile quality changes decorative particle budgets and character rendering resolution; collision, simulation and combat warning geometry remain unchanged. A worker failure ends the active room clearly and directs the host to resume the saved campaign in a new room.

| Limit | Default |
| --- | --- |
| Players per room | 4, including disconnected seats during grace |
| Rooms | 100, configurable with `MAX_ROOMS` |
| Open connections | `MAX_ROOMS × 4 + 32` |
| Unjoined connection timeout | 15 seconds |
| Frame payload | 64 KiB |
| Traffic per connection | 240 messages and 3 MiB per second |
| Complete snapshot | 8 MiB of JSON string data |
| Chunk data | 12,000 UTF-16 code units; at most 4 pending transfers per sender |
| Chunk expiry | 15 seconds |
| Browser output queue | 1,024 frames; reject further sends at the bound |
| State window | 4 unacknowledged updates per recipient |
| Hero admission timeout | 30 seconds after relay seat reservation |
| Host command queue | 128 commands |
| Relay outgoing socket backlog | 2 MiB; slow connections close |
| Transport heartbeat | Ping every 10 seconds, terminate after a missed pong |
| Guest application stall detection | 3.5 seconds |
| Reconnection grace | 60 seconds |

This remains a beta with browser-local heroes. Origin checks protect browser admission; they are not user accounts or anti-cheat authentication. A player-hosted game necessarily trusts its host, and browser-local heroes can be modified by their owner. Gameplay commands still cannot submit arbitrary damage, gold, items, or world snapshots to peers.

## Diagnostics and validation

If connection fails, check `/healthz`, the lobby relay URL, exact allowed origin, and the browser's Network → WS close code. `403` during upgrade usually means a wrong origin or path; `1013` indicates an outgoing backlog. An incompatible-build error requires matching client and relay versions. If a room cannot admit a new hero, check the four-player limit, password and reconnect reservations. Admission does not require the host to return to town. Keep the host page visible during combat.

Install browser test dependencies from the repository root:

```powershell
npm ci
npm run test:coop
npm run test:coop:browser
node tests/coop_network_browser.cjs
npm run test:coop:performance
```

The browser tests require installed Google Chrome and the local frontend server (`python serve.py`, port 8741). Each test starts and closes its own relay on an unused port. `COOP_TEST_URL` overrides the game URL. The campaign command checks all Act I objectives in the actual worker runtime, then runs two isolated Chrome contexts. Set `COOP_TEST_PLAYERS=4` and `COOP_TEST_LAG_MS=300` for four-player integration at 300 ms RTT. Both browser sizes use touch emulation; screenshots and diagnostics are written under ignored `tmp/coop-qa/`.

The network suite injects nominal 150 ms RTT with jitter and a 256 kbit/s delivery limit, duplicate/stale commands, visibility changes, disconnections, and asset-load failure. The independent browser suite measures twenty instrumented movement starts, renders boss warning geometry, and verifies worker failure followed by saved-campaign recovery.

`npm run test:coop:performance` runs fixed-seed two- and four-player authority/replication measurements after two seconds of warm-up. A retained protocol-1 encoder processes the same movement states for the traffic comparison. Six separate scenarios cover town, movement, dense combat, summons, joining and concurrent areas. VM persistence is a mock, so save-capture cost is reported separately and these numbers do not measure physical-device frame rates or IndexedDB latency.

See `docs/MULTIPLAYER_VALIDATION.md` for the executed checks and device limitations. Physical two-device LAN, mobile hardware, Docker runtime, and public HTTPS/WSS deployment require environments beyond the local browser test setup; they must be verified before inviting an external beta group.

## Release and device acceptance

See [the release/rollback procedure](MULTIPLAYER_RELEASE.md) and [the current validation results](MULTIPLAYER_VALIDATION.md). Campaign records use schema 2; existing Act I records migrate on resume and still start in Frosthaven. The solo save namespace and database are unchanged.

`await Coop.diagnostics()` returns recent frame times, local movement response samples, traffic/apply costs and (on the host) worker simulation, snapshot and save timings. These are diagnostics, not a physical-device certification. Ten-minute Pixel 7a host/guest sessions with two and four players remain required; desktop touch emulation does not satisfy that gate.

## Client API

```js
await Coop.listRooms();
await Coop.connect('host', heroId, { name: "Mira's party", password: '', campaignId });
await Coop.connect('join', heroId, roomCode, { password });
await Coop.teleportToPlayer(playerId);
```

The existing positional `connect(mode, heroId, code, campaignId, options)` form remains supported. Invitations carry only the room code; send a private party's password separately.
