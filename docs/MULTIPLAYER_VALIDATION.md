# Multiplayer validation — protocol 2

Validated locally on September 12, 2026 for **embergrave-coop-3**, campaign schema **2**. The frontend and relay have not been deployed. Physical Pixel 7a acceptance is **pending**.

Machine: AMD Ryzen 7 5800X, Windows 11 (10.0.26200), Node 22.11.0, Google Chrome 152.0.7977.83. Browser sessions used independent storage and headless desktop touch emulation. [Recorded measurements and methodology](qa/coop-v3-performance.json) are retained with the guide; full diagnostics and screenshots remain under ignored `tmp/coop-qa/` and `tmp/coop-ui-qa/`.

## Executed regression checks

| Check | Result |
| --- | --- |
| `npm run test:coop` | 45 unit tests, 85 co-op contract checks, 25 inventory checks pass |
| Worker campaign contract | Four occupied areas, the complete Act I quest chain, cinematics, participant rewards, replay rejection and schema migration pass |
| Independent Chrome integration | Two players at 150 ms RTT and four at 300 ms RTT pass: separate travel, late arrivals in town, teleport, ranged combat, boss warnings, reconnect, worker failure and saved-campaign recovery |
| `npm run test:coop:network` | 18 checks pass with nominal 150 ms RTT, jitter and 256 kbit/s; peak 5 delayed delivery messages, final socket backlog 0 bytes |
| `npm run test:coop:ui` | 58 character, ownership, mobile layout, item persistence, rollback and contested-purchase checks pass |
| `npm run test:phone` | Phone screen audit plus 29 mobile controls, 57 mobile redesign and 88 settings checks pass |
| Gameplay / mobile input contracts | 157 / 57 checks pass |
| Navigation / boss / story contracts | 228 / 85,616 / 214 checks pass |
| VFX current-gameplay contract | 5,373 checks across 963 skill/rank/perk scenarios pass |
| Prop interaction contract | 1,906 checks pass |
| `npm run test:coop:release` | Matching frontend, worker and relay build; manifest with 72 file hashes |

The worker-specific tests additionally cover private/public discovery, wrong passwords, full public rooms, simultaneous seat reservations, failed admission release, joins during host loading or a boss encounter, per-recipient congestion and resync, world/generation rejection, teleport interruption and unsafe arrivals, disconnected targets, companion/status transfers and cancellation of queued companion attacks, individual portals/death/revival, dormant area clocks, and broken-prop collision patches/save recovery.

Delayed inventory and shared quest transactions explicitly keep another occupied area simulating. Tests reject persistence while combat progresses, then confirm health, kills, XP and unrelated discoveries are not rolled back. Remote quest rewards become live only after successful persistence; departed participants receive saved rewards once when they return. A resync preserves outstanding ordered command acknowledgments while resetting movement prediction.

The VFX contract uses `node tests/skill_vfx_contract.mjs --current-gameplay`. Its original frozen combat snapshot predates earlier cost/upkeep/weapon changes in the workspace; the default historical comparison fails at that old baseline. The current-gameplay mode verifies present simulation with VFX enabled and disabled, plus drawing and lifecycle invariants. The frozen snapshot was not regenerated.

## Controlled movement comparison

Fixed world seed **123**, gameplay random seed **7331**, two seconds of warm-up, then eight seconds sampled at 15 Hz. The first full snapshot is excluded, leaving 119 compared deltas. The retained protocol-1 encoder and its former whole-field delta algorithm process the **same authority states** as the new encoder. This controls the workload; it is an encoder/payload comparison, not an end-to-end old-build phone benchmark.

| Players | Baseline bytes | Current bytes | Reduction | Aggregate encoding/diff cost |
| --- | ---: | ---: | ---: | ---: |
| 2 | 857,876 | 58,716 | 93.2% | 688.2 → 73.3 ms |
| 4 | 875,651 | 73,033 | 91.7% | 729.2 → 102.1 ms |

Bytes describe one recipient's movement payloads and exclude WebSocket framing. Both runs exceed the requested 70% traffic reduction. This does not certify all-scenario physical-device bandwidth or latency. Reproduce with `npm run test:coop:performance`; the baseline source and hash are recorded in the JSON report.

## Scenario measurements

Each scenario runs six measured seconds after two seconds of warm-up. Dense combat uses 32 durable enemies; summons adds four companions per hero. Separate-area runs occupy two or four Act I worlds. Simulation p95 covers one tick across all occupied areas. Snapshot p95 is per recipient. Total bytes include every recipient, the host's worker bridge and confirmed hero save records, so these totals are not guest-only Internet traffic.

| Players | Scenario | Simulation p95, ms | Snapshot p95, ms | All-recipient bytes |
| --- | --- | ---: | ---: | ---: |
| 2 | town | 0.06 | 0.84 | 118,022 |
| 2 | movement | 2.86 | 0.78 | 104,006 |
| 2 | dense-combat | 0.62 | 3.85 | 553,148 |
| 2 | summons | 0.65 | 4.39 | 709,748 |
| 2 | joining | 0.11 | 1.32 | 148,739 |
| 2 | separate-areas | 3.73 | 0.69 | 81,670 |
| 4 | town | 0.09 | 1.08 | 258,091 |
| 4 | movement | 2.81 | 0.91 | 252,159 |
| 4 | dense-combat | 0.71 | 3.00 | 1,250,327 |
| 4 | summons | 0.70 | 3.47 | 1,575,599 |
| 4 | joining | 0.13 | 1.06 | 312,152 |
| 4 | separate-areas | 6.76 | 0.68 | 166,727 |

Reusing immutable area records within each publication reduced mean per-recipient snapshot time from 2.64 to 1.33 ms in four-player dense combat and from 3.17 to 1.54 ms with summons in consecutive matching fixtures. All transmitted payload bytes remained identical; the JSON includes this comparison.

These are desktop Node VM CPU measurements, with no rendering and mocked persistence. Save-capture sample means range from roughly 0.42 to 12.60 ms in these short fixtures; each scenario has only one or two checkpoints, insufficient for a meaningful save p95. Actual IndexedDB latency and mobile save stalls require browser/device traces. Routine persistence runs asynchronously in the worker. Queue growth is bounded by recipient state windows, command/output limits and relay backpressure; the injected-network test verifies drainage after congestion.

## Browser timing sample

All game windows render on the same desktop. Frame p95 uses the final 240 guest render frames after loading; movement response measures the first predicted displacement following twenty standstill commands. The metric starts at command submission, so it excludes physical touchscreen and display scanout latency. Joining, transfers, combat and recovery are functionally tested in the same run, but this short timing window is not an all-scenario ten-minute performance test.

| Players | Simulated RTT | Guest frame p95 | Instrumented movement p95 | Peak delayed messages |
| --- | --- | ---: | ---: | ---: |
| 2 | 150 ms | 18.1 ms | 13.5 ms | 28 |
| 4 | 300 ms | 18.1 ms | 14.9 ms | 29 |

The host worker remains authoritative in these tests. Boss attack shapes and encounter HUDs render from explicit replicated fields; lowering decorative quality does not change warning geometry or simulation. Screenshots of the party roster and compact management layouts were inspected.

## Remaining acceptance and rollout

No physical Pixel 7a or Android debugging connection was available. Four ten-minute Chrome sessions are still required: two and four players, each with the phone as host and guest, including separate areas. Thermal slowdown, physical input response, sustained frame spikes, battery/charging effects and real background throttling are **not measured**. Desktop touch emulation does not satisfy this requirement. Target 60 FPS, warm p95 ≤33.3 ms and physical local response p95 <100 ms at 150 ms RTT remain device gates.

Physical LAN/Internet sessions and public HTTPS/WSS have not been exercised in this task. Docker runtime deployment is also unverified. Use the [matching release and rollback procedure](MULTIPLAYER_RELEASE.md) to package the frontend/worker/relay together, retain campaign exports, validate physical hardware and then roll out. Existing Act I campaign records migrate to schema 2 and resume in Frosthaven; solo saves are untouched. Hosts must recover a failed worker from the last successful saved campaign in a new room; uncheckpointed progress and host migration are not recovered.
