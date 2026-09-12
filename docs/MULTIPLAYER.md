# Embergrave co-op beta

Private player-hosted co-op supports four heroes, all five classes, Normal difficulty, shared drops, shared Act I objectives, and teammate revival. The host's browser runs the game; the relay only routes room messages. Existing solo saves remain in their original localStorage namespace. Nothing in this delivery publishes or modifies the hosted game.

See [personal inventories and mobile menus](MULTIPLAYER_UI.md) for the updated character screens, item ownership, save recovery, and UI validation.

## Run locally

Requirements: Node.js 22 or later, Python 3, and a current browser with WebSocket and IndexedDB support. From the repository root, start the game in one terminal:

```powershell
python serve.py
```

Start the relay in a second terminal:

```powershell
cd server
npm ci
npm start
```

Open [the local game](http://localhost:8741). Choose **Multiplayer**, create a co-op hero, and choose **Host a party**. Friends choose **Join party** and enter the room code. Use separate browser profiles or private windows to test independent saves on one computer. Ready indicators are informational; every journey has its own confirmation.

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

Serve the buildless frontend over HTTPS and put the relay behind an HTTPS reverse proxy that supports WebSocket upgrades. Use a valid TLS certificate and route `/ws` to the relay without changing the path; route `/healthz` for readiness checks. Set the browser relay address to `wss://.../ws`. An HTTPS game refuses insecure `ws://` relays.

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
- Every hero sees the same drops. The first valid host-processed pickup gets the item or gold. Partial potion transfers leave the remainder on the ground. Each connected hero receives kill XP with the existing level adjustment.
- The host accepts and turns in quests. Rescue and combat objectives advance collectively. A campaign reward ledger records participating heroes; each receives a quest reward once, including a participating disconnected hero retained by the host.
- Only the host requests travel. All connected players confirm and preflight destination assets before the party enters. A decline, disconnect, load failure, or 45-second timeout cancels the request. New players enter in Frosthaven; automatic reconnects can restore an existing player in any beta area.
- Interact with a fallen teammate within two tiles to revive them after three uninterrupted seconds. Movement or damage interrupts the attempt. Revival restores 35% health. Death takes 10% of current gold once per fall. A full party wipe returns everyone to Frosthaven.
- Enemy health increases by 60% for each extra player. Each campaign area keeps the party size recorded at its first creation. Damage and drop quantities are unchanged.

## Saves and connection behavior

The separate `embergrave-coop` IndexedDB database stores co-op heroes and host campaigns. The host's campaign contains authoritative copies of participating heroes. Guests store host-confirmed hero updates on their own device. Returning to a campaign restores its host-owned record, rather than accepting an older guest copy.

Economy changes execute serially and commit before acknowledgment. A failed economy commit restores the transaction's state and pauses the party with **Save failed**. The host can choose **Retry saving**. Periodic checkpoints occur every five seconds and after critical progression, travel, and orderly exit. Abrupt browser/process loss can still lose progress since the last successful checkpoint. Resume a saved campaign in Frosthaven; objectives, inventories, reward ledgers, defeated enemies, opened props, and persistent terrain changes remain, while transient combat resets.

Menus block only the local player's input. Travel and cinematics pause the party explicitly. Hiding the host page pauses simulation. Browsers throttle background execution, so guests also detect missing application heartbeats independently. [Page Visibility API behavior](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API)

A guest who loses its socket remains vulnerable for 60 seconds. Automatic reconnect uses a private connection token and restores that same actor. A guest can also reload the same tab and rejoin the same room with the same hero during that window; the token is retained in tab-local sessionStorage. Keep the host's page open while it reconnects: reloading the host requires starting its saved campaign in a new room. Host socket loss pauses the session; expiration ends the room without host migration. Co-op heroes and campaigns are browser/profile/device-local; clearing site data removes them. There are no accounts, cloud saves, matchmaking, chat, or direct trading UI.

## Protocol and operational limits

`js/coop_protocol.js` defines protocol version 1 and the shared build identifier. Change the build identifier whenever incompatible simulation or serialization changes ship, and update client and relay together. The relay rejects mismatched builds, binds sender identity to the socket, allows guests to route only to the host, and permits only the host to broadcast world state. The browser uses its native WebSocket API; the Node relay uses [`ws`](https://github.com/websockets/ws/blob/master/README.md).

The host runs fixed 30 Hz simulation and publishes changes at 15 Hz, with full snapshots on join, reconnect, travel, and committed checkpoints. Host actor positions, camera tracking, and 3D hero animation interpolate between simulation ticks at the display frame rate. These display samples never move authoritative actors or advance combat timers. Records contain stable actor/item IDs, map epochs, command sequences, and delta baseline sequences. Guests predict movement and interpolate presentation; enemies, hits, loot, and rewards run on the host. Snapshots exclude executable callbacks, object references, navigation caches, and GPU resources. Owner references are reconstructed from IDs.

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
| Browser output queue | 400 frames; resynchronize on overflow |
| Host command queue | 128 commands |
| Relay outgoing socket backlog | 2 MiB; slow connections close |
| Transport heartbeat | Ping every 10 seconds, terminate after a missed pong |
| Guest application stall detection | 3.5 seconds |
| Reconnection grace | 60 seconds |

This is a private, trusted-friends beta. Origin checks protect browser admission; they are not user accounts or anti-cheat authentication. A player-hosted game necessarily trusts its host, and browser-local heroes can be modified by their owner. Gameplay commands still cannot submit arbitrary damage, gold, items, or world snapshots to peers.

## Diagnostics and validation

If connection fails, check `/healthz`, the lobby relay URL, exact allowed origin, and the browser's Network → WS close code. `403` during upgrade usually means a wrong origin or path; `1013` indicates an outgoing backlog. An incompatible-build error requires matching client and relay versions. If a room cannot admit a new hero, return the host to Frosthaven and check the four-player limit. Keep the host page visible during combat.

Install browser test dependencies from the repository root:

```powershell
npm ci
npm run test:coop
npm run test:coop:browser
node tests/coop_network_browser.cjs
npm run test:coop:performance
```

The browser tests require installed Google Chrome and the two local servers above. `COOP_TEST_URL` can override the game URL. The campaign run uses four isolated browser contexts by default; set `COOP_TEST_PLAYERS=2` for the two-player run. Accelerated host combat fixtures exercise Act I objectives and rewards. The network run injects 150 ms round-trip delay with jitter, duplicate/stale commands, visibility changes, disconnections, and asset-load failure. Screenshots and measured queue data are written under ignored `tmp/coop-qa/`.

The performance check defaults to two players and measures frame timing, simulation/display movement steps, traffic, and snapshot costs. Set `COOP_TEST_PLAYERS=4` for four players. `COOP_PROFILE_HOST_ONLY=1` measures the host while the other clients synchronize and animate without drawing extra game windows on the same GPU. Reports identify this mode explicitly. Save and leave an existing party, then refresh the game to load presentation updates.

See `docs/MULTIPLAYER_VALIDATION.md` for the executed checks and device limitations. Physical two-device LAN, mobile hardware, Docker runtime, and public HTTPS/WSS deployment require environments beyond the local browser test setup; they must be verified before inviting an external beta group.
