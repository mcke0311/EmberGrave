# Multiplayer protocol 2 release

Frontend, worker and relay build: **embergrave-coop-3**. Wire protocol: **2**. Co-op campaign record schema: **2**. Scope: the six Act I areas, Normal difficulty, four seats. Deployment has not been performed by this implementation task.

## Prepare and verify

1. Keep the workspace's other ongoing frontend changes in the release checkout. Run `npm run test:coop`, `npm run test:coop:browser`, `npm run test:coop:ui`, `npm run test:coop:network`, `npm run test:coop:performance`, and `npm run test:phone`. Repeat the independent browser test with `COOP_TEST_PLAYERS=4` and `COOP_TEST_LAG_MS=300`.
2. Run `npm run test:coop:release`. It checks the build, worker imports, frontend assets and relay contract, and writes `tmp/coop-qa/release-manifest.json` with file hashes. Retain that manifest and the previous frontend/relay artifacts for rollback.
3. Package the static frontend using the project's existing deployment workflow. Include `js/coop_worker.js`, `js/coop_runtime.js`, `js/coop_replication.js`, every worker import, and the updated character renderer. Keep the worker and its imports on the game origin; an applicable CSP must permit `worker-src 'self'`. All frontend script cache versions and worker imports identify the same release.
4. Build the relay from the same checkout with `docker build -f server/Dockerfile -t embergrave-relay:embergrave-coop-3 .`, or install its existing locked dependencies and run `server/relay.cjs`. The relay image includes the same `js/coop_protocol.js`; it does not run game simulation or store campaign saves.
5. Before exposing the update, finish the physical Pixel 7a acceptance matrix below. The recorded desktop results are not a substitute. Retain browser-local co-op campaign exports before migration/rollback testing; do not clear site data.

## Coordinated rollout

- Let current hosts save and leave before replacing the relay. Rooms are in memory; restarting it ends active sessions.
- Deploy the matching static files and relay during the same maintenance window. Mixed builds deliberately fail with an incompatible-version message.
- Route `/rooms`, `/healthz`, and WebSocket upgrades for `/ws`. Configure the exact HTTPS game origin in `ALLOWED_ORIGINS`. Keep one relay instance unless routing explicitly keeps each room on its owning instance.
- Verify `/healthz` and `/rooms` both report `embergrave-coop-3`. Confirm public discovery, a hidden password room, wrong-password rejection, a full public room, and a late arrival while the host is outside town. Verify worker requests and imported scripts have no cache/CSP errors.
- Resume an existing Act I campaign, travel separately, complete one shared objective, reconnect a guest, and save/leave. Confirm the resumed host still starts in Frosthaven and solo saves remain available.

## Rollback

Stop admission, let hosts checkpoint, then restore **both** the previous frontend artifact and its matching relay image. Refresh clients so protocol versions agree. Never pair the old relay with the new worker frontend. Relay rooms cannot be carried across a process rollback; hosts create fresh rooms from saved campaigns.

The co-op IndexedDB database remains `embergrave-coop`, database version 1; only campaign records migrate to schema 2. Do not downgrade schema-2 records in place or clear the database. Use the pre-upgrade campaign export for a test of the old build, and preserve schema-2 records separately for returning to this release. Solo localStorage records require no migration or rollback. Keep the recorded release manifest and validation results with the artifacts.

## Physical Pixel 7a gate

Run Chrome on an actual Pixel 7a in four configurations: two players/phone host, two players/phone guest, four players/phone host, four players/phone guest. Run each for ten minutes after asset warm-up. Keep the same fixed seed and scenario route for comparisons with the retained baseline build. Separate browser profiles/devices own separate heroes and storage.

| Time | Scenario |
| --- | --- |
| Warm-up | Load hero and Act I assets; exclude loading from steady frame metrics |
| 0–2 min | Town, standstill-to-movement trials and repeated steering |
| 2–4 min | Dense combat, ranged attacks, summons and boss warnings |
| 4–6 min | Heroes in separate areas; observe the host's other-world simulation |
| 6–8 min | Late joining, repeated exits/waystones/portals and teleport interruption/safe arrival |
| 8–10 min | 150–300 ms RTT, jitter, constrained bandwidth, reconnect and individual death/respawn |

Capture `await Coop.diagnostics()` each minute on host and guest, plus Chrome Performance traces for spikes. Record device/browser version, battery/charging state, ambient conditions, quality changes, and thermal throttling (Android thermal-service diagnostics if available). Check physical touch response against visible movement, not just command timestamps. Target 60 FPS; require warm p95 frames ≤33.3 ms, local movement p95 <100 ms at 150 ms RTT, ≥70% matching-baseline movement-traffic reduction, bounded queues, no duplicated heroes/items/rewards, and no unrelated-area pause during joins/transfers. Record any failed gate explicitly before widening availability.
