# Co-op validation record

Local implementation validation, September 11, 2026. The hosted site was not deployed or changed.

## Automated checks executed

| Check | Result |
| --- | --- |
| `tests/coop_relay.test.cjs` | 4 passing tests: room admission/capacity, socket-bound identity, host-only routing, reconnect tokens/expiry, origins, builds, Unicode chunks and bounded transfer assembly |
| `tests/coop_contract.mjs` | 83 passing assertions: all five classes, melee/ranged skills, summons, transformations, status ownership, snapshot references, contested/partial/full-inventory pickup, crafting/replay, inventory/storage ownership and range, and talent retention |
| `tests/coop_browser.cjs` | 29 passing checks each with two and four isolated Chrome contexts through the complete Act I quest chain and optional areas |
| `tests/coop_network_browser.cjs` | 18 passing isolated browser checks with delayed/jittered traffic, replay/stale commands, rejected guest damage, loading failure, host visibility/stall, socket reconnects, guest reload, mobile inventory and bounded queues |
| `tests/gameplay_input_contract.mjs` | 153 passing desktop input, gestures, collisions, jumping, hazards and feedback checks |
| `tests/mobile_controls_contract.mjs` | 43 passing touch movement, targeting, jump and cancellation checks |
| `tests/navigation_contract.mjs` | 228 passing navigation checks |
| `tests/unique_equipment_contract.mjs` | 6,079 passing equipment checks, including 139 powers and 127 combat casts |
| `tests/summon_affixes_contract.mjs` | 22,130 passing summon stat, aura, roll and migration checks |
| `tests/wildshape_transition_contract.mjs` | 2,045 passing transformation lifecycle and pose checks |
| `tests/boss_encounter_contract.mjs` | 85,616 passing targeting, damage, warnings, phases, ownership, retreat and seeded-arena checks |
| `tests/story_campaign_contract.mjs` | 214 passing objective, dialogue, boss-ward and old-save checks |
| `tests/opening_contract.mjs` | 893 passing opening, rescue, checkpoint, death, migration, reward and failed-load retry checks |

The two- and four-player campaign tests exercise host and guest movement, contested item pickup, revival and interruption, travel voting, all six beta destinations, guest rescue interactions, three beacons and the Oathsworn, Korvath, every participating hero's reward ledger, reward replay rejection, committed guest saves, inventory rollback on an injected host disk error, full-party wipe recovery, and campaign resume in Frosthaven. Combat fixtures accelerate enemy defeat to keep the campaign run repeatable; these are automated progression smoke tests, not full-duration human playthroughs.

The network test injects 60–90 ms each way, preserving WebSocket ordering, for a nominal 150 ms round trip with jitter. It checks movement prediction/reconciliation and actual host-resolved ranged combat, then exercises interruption and recovery paths. Host page visibility is injected through the browser visibility property; missing application heartbeats are tested independently by withholding incoming traffic. Relay expiry uses an accelerated grace interval in the protocol test; production uses 60 seconds. Browser contexts have independent storage. These tests ran on one Windows machine using installed Google Chrome.

The ownership and network tests disable `crypto.randomUUID` to exercise ID generation with the API available on HTTP LAN origins. IDs use [`crypto.getRandomValues`](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues), which is available in insecure contexts. Repeated sprite loading exposed local socket pressure and duplicate development server processes. The development server now reuses HTTP/1.1 connections; a direct HTTP check verified socket reuse and complete editor error responses, followed by the successful four-player campaign run.

Screenshots and queue measurements are generated under `tmp/coop-qa/` (ignored by Git). They include the four-player host/guest views, resumed campaign, mobile gameplay, mobile inventory, and `network.json`. The last two network runs passed all 18 checks with zero browser runtime errors. The final run peaked at 10 pending simulated-delivery messages and ended with zero WebSocket buffered bytes. Ordinary missing-resource console messages are excluded from the runtime-error assertion; missing destination assets are explicitly tested with an injected preload rejection.

## Environment limits and remaining external checks

### Host movement follow-up — September 12, 2026

Profiling reproduced a presentation limit: the host rendered at approximately 60 FPS, but authoritative actor positions and hero animations advanced only at the 30 Hz simulation rate. Host rendering now interpolates actor positions and camera tracking, and samples 3D hero animation every displayed frame. Simulation positions, action clocks, owner references, and the 30 Hz combat rate stay authoritative. Party HUD nodes are reused when only health changes, and delta comparison avoids serializing unchanged primitive values.

- In the two-player movement sample, 237 authoritative position changes produced 473 display changes across 473 moving frames. Mean frame time was 16.68 ms; p95 was 16.8 ms.
- In the four-player host-focused movement sample, 237 authoritative position changes produced 473 display changes across 474 moving frames. Mean frame time was 16.68 ms; p95 was 16.8 ms. The three guests continued network synchronization and animation with their canvas drawing disabled by test instrumentation.
- Rendering all four game windows simultaneously on this one PC reached about 33 FPS in the exploratory movement sample. Area entry also produced a one-time long frame in the host-focused run; the subsequent eight-second movement sample stayed at approximately 60 FPS. These measurements are not a hardware-independent FPS guarantee.
- Three interpolation tests pass, including authoritative-state immutability, separate actor ownership, teleport/surface snapping, turning, and action transitions. Existing co-op ownership checks (83), latency/mobile browser checks (18), player motion checks (30,166), character animation checks (68,720), transformation checks (2,045), and input checks (153) pass after the change.

Raw samples are in `tmp/coop-qa/performance-before-2.json`, `performance-after-2.json`, and `performance-after-4-host-only.json`. Random campaign seeds differ between runs; simulation CPU costs should not be treated as a controlled before/after comparison. Display-step counts compare presentation and authoritative movement within the same run.

### External validation

- **Two-device LAN:** unavailable. Two/four independent browser sessions ran on one machine. The documented LAN procedure still needs a second physical device and firewall validation.
- **Mobile hardware:** touch emulation ran at an 844 × 390 viewport. No physical iOS/Android device was connected; Safari/WebKit and mobile background behavior remain unverified.
- **Docker:** Docker CLI is installed, but its Linux daemon/named pipe is unavailable. The Dockerfile, dependency lockfile and minimal build context are provided; an image build and container readiness check have not run here.
- **Public HTTPS/WSS:** configuration and reverse-proxy instructions are provided. No public relay, TLS endpoint, hosted-site deployment, NAT traversal or invited-friend access was exercised.
- **Performance/balance:** local simulated latency is covered, but a long human four-player combat/balance session and sustained Internet load test are still needed before a wider beta.
- **Intermittent travel test:** one delayed-travel rerun timed out after local server cleanup. Two subsequent runs passed; the timeout was not reproduced with added diagnostics. Include repeated travel under latency in the device beta checks.

Co-op remains a private beta with browser-local saves. Guest reload can recover a reserved actor within the reconnect window. A host page reload requires a new room from its saved campaign; host migration and crash recovery of uncheckpointed combat are not implemented.
