# Sites deployment

Current website (updated 2026-10-03): https://embergravegame.com
The original address https://embergravegame.mcke0311.chatgpt.site also remains live.
The existing Site is now public. Preserve its current audience and project ID
when updating; the private access and earlier URL recorded below are historical.

The deployment prepared on 2026-09-11 uses the existing private Sites project
`appgprj_6aa420e20bfc8191b59e30227bca8a09`, slug `embergrave-sunderstone-saga`.
Reuse this project for updates; do not register another Site.

The isolated release checkout is `tmp/embergrave-site/`. Its hosting manifest is
`tmp/embergrave-site/.openai/hosting.json`, with static output in `dist/`.
The source game remains in the repository root. The release includes the game,
the loot reference page, referenced artwork, music, and sound effects. It excludes
the local data editor and its Python write endpoint. Browser-local saves retain
their existing behavior and are specific to the deployed origin.

The release copy of `assets/cine_oathsworn.mp4` was compressed to H.264/AAC with
fast-start metadata to fit the host's per-file limit. The original is unchanged.
The deployed loot page omits its link to the local editor.

Validation covered 54 JavaScript files, 1,135 runtime file references, a successful HTTP
entrypoint response, and 228 existing navigation checks. Browser interaction
testing was not performed during deployment.

Large Git uploads were interrupted by connection resets. The release source was
successfully uploaded in smaller commits using `tmp/upload_site.py`; this helper
accepts a short-lived credential through the process environment and never writes
the credential to disk. Obtain a fresh credential for this same Sites project
when updating. Never enable automatic publication while uploading partial batches.

Build-time sprite source catalogs in `js/data.js` remain intact, but their input
images are excluded unless also referenced by the runtime manifest. This brings
the packaged release to 195.14 MiB, below Sites' 256 MiB input archive limit.

Direct archive uploads failed at the file-transfer service. The saved source is
therefore packaged by Sites during deployment.

Release source commit: `ef2e7ceddb990d80e969735c47ad6385b2e222e3`.
Packaged release: `tmp/embergrave-site.tar.gz`.
Publication status: **succeeded**, confirmed by Sites on 2026-09-11 at 16:22 UTC.

Live URL: https://embergrave-sunderstone-saga.mcke0311.chatgpt.site
Access: private, owner-only.

Saved version: `appgprj_6aa420e20bfc8191b59e30227bca8a09~appgver_2febe34c7a6c8191a4c6d43c6d3ebab6` (version 3).
Latest deployment: `appgdep_6aa42a033c6481919514a4b777df83f1`.

Earlier attempts failed during the hosting service's Git checkout with
`fetch-pack: unexpected disconnect`, `fatal: early EOF`, and
`fatal: fetch-pack: invalid index-pack output`. Retrying the saved release produced
the same failure. An earlier attempt successfully checked out the larger first
version but rejected its archive size; the current version resolves that size issue.

The user subsequently explicitly authorized replacing the new deployment
repository's history with the compact release. That replacement succeeded using
`tmp/upload_compact_site.py`, an initial force-with-lease push guarded by the old
remote head, and small follow-up transfers. The active local release branch is
`codex/sites-compact-upload`. Its final tree was verified identical to the approved
`codex/sites-compact` release. Discarded artwork is no longer reachable through
the remote default branch. The original game's Git history has not been changed.

## Support page update — 2026-09-11

Version 4 adds `support.html`, its stylesheet and donation-link configuration,
and a main-menu link. Publication succeeded at 16:54 UTC. The site remains
private and owner-only. Ko-fi is the selected provider, but the creator is still
setting up the account; `js/support-config.js` has an empty donation URL, so the
page says donations are not open and hides the payment link.

Support page: https://embergrave-sunderstone-saga.mcke0311.chatgpt.site/support.html
Source commit: `351623a56212d2d715dd7cc3cc8f54244c63e6a9`.
Saved version: `appgprj_6aa420e20bfc8191b59e30227bca8a09~appgver_3decbeccc6ec8191b1751c227fc6acf9`.
Deployment: `appgdep_6aa431b4df9c8191a08e873b5d3dbf4a`.

Validation: local HTTP 200, JavaScript syntax, six donation-destination state
checks, local page asset references, and release/source equality for all seven
changed release files. Browser interaction testing was not requested. The local
packaging helper could not start its Bash runtime, so Sites packaged the pushed
static source during deployment.

To enable donations, add the creator-provided Ko-fi URL in both the root game
and release configuration, bump its cache version in support.html, and publish
the updated release. Public access must also be enabled before sharing the
support page with players.

## Ko-fi connected — 2026-09-11

Version 5 connects the creator-provided https://ko-fi.com/embergrave URL and
bumps the support configuration cache version. Publication succeeded at
17:04 UTC. The Support on Ko-fi button is now enabled; site access remains
private and owner-only. Supporters can use the Ko-fi URL directly.

Source commit: `ef41074596bdfb785379024d85555274b531b3f7`.
Saved version: `appgprj_6aa420e20bfc8191b59e30227bca8a09~appgver_d0bfdf1b538881918424d69707996c1d`.
Deployment: `appgdep_6aa433f00de481918ea11f8a4d708780`.

Validated the actual configuration with the donation script: button visible,
exact destination preserved, provider hostname shown, and cache version updated.
Ko-fi checkout itself was not tested and no payment was made.

## Mobile controls and settings update — 2026-09-11

Version 6 publishes the latest GitHub `main` code, verified at
`699be51cfbb452e72b06f769991da79d9383ec83`. Publication succeeded at
19:01 UTC. The existing URL, private owner-only access, Ko-fi destination,
compressed cinematic, and editor exclusion are preserved.

The release updates the entrypoint, game input, title screen, and settings UI,
and adds the mobile-controls script and mobile/settings stylesheets.

Release source commit: `a184f0fa475feaed1b2082619507c91d3844ae2a`.
Saved version: `appgprj_6aa420e20bfc8191b59e30227bca8a09~appgver_2041fc3a8eb08191970ee2982603efde`.
Deployment: `appgdep_6aa44f99f7c88191b6bfd029db67d619`.

Validation passed: 57 JavaScript syntax checks, 1,138 runtime references with
none missing, 43 mobile gameplay checks, 62 successful local HTTP page/asset
requests, and exact source/release equality for all seven updated files.
Browser interaction testing was not performed. The local packaging helper
could not start its Bash runtime; Sites packaged the exact pushed static source.

## Contained phone experience published — 2026-09-12

Version 7 publishes the tested landscape phone experience from source commit
`f6ff1f4992c7517e02bb7fd494163467774ee715`. Publication succeeded at 16:53 UTC.
The current public website is https://embergravegame.mcke0311.chatgpt.site.
Existing sharing settings were preserved. The historical private deployment path
reported that the audience had changed; current public access was then verified
before using the standard publication path.

The release includes the shared viewport/rotation controller, bounded paged phone
screens, compact menus and HUD, fullscreen controls, Home Screen help and manifest,
app icons, and the current multiplayer client dependencies. It does not deploy a
multiplayer relay server. The Items & Affixes and Support pages, donation
configuration, and compressed cinematic are unchanged.

Release source commit: `9b657e26f173976b5a2ab8f7e890d49e2d49f6f5`.
Saved version: `appgprj_6aa420e20bfc8191b59e30227bca8a09~appgver_a472a551fa888191b9c923ade4b2ba48`.
Deployment: `appgdep_6aa5830d99c881919ba5f9ce1635aeff`.

Validation: all 30 updated runtime files match the committed game source exactly;
70 JavaScript syntax checks and 1,155 runtime references passed with no missing
assets. Manifest entrypoint and icons are present. The 202.36 MiB release remains
within hosting limits. The implementation's phone, touch, settings, title,
inventory transaction, and multiplayer browser suites passed before publication;
physical Safari/iPhone and Chrome/Android installation checks remain manual.
The local packaging helper could not start Bash, so Sites packaged the exact
pushed static source. Successful publication was confirmed by deployment status.

## Public multiplayer connected — 2026-09-12

Version 9 connects the hosted game to the activated Render relay at
`wss://embergrave-multiplayer.onrender.com/ws`. Publication succeeded at
17:56 UTC at https://embergravegame.mcke0311.chatgpt.site, with existing public
access preserved. The relay's health endpoint reports build `embergrave-coop-2`.

Release source: `f18e180aa114a63163b17a22aae73bd75c454c93`.
Saved version: `appgprj_6aa420e20bfc8191b59e30227bca8a09~appgver_5573d6c2a6f4819184b108c0da8d19d3`.
Deployment: `appgdep_6aa591c8f75c8191a08325850ec4b94c`.

Twelve configuration and public relay checks passed, including four-player room
admission using the real game's Origin, guest commands, large snapshot transfers
to every guest, reconnection with the same player identity, and clean room exit.
After publication, the live index and versioned configuration both returned HTTP
200 and selected the verified public relay. This release changes only the relay
configuration and its cache version; the previous connection recovery fixes are
included. HTTP development/LAN pages retain their local relay defaults.

The local archive helper could not start Bash. Sites built the exact pushed
static source, and successful deployment was confirmed before the live-file check.
Render's Free instance can take about a minute to wake after inactivity; the
hosted client allows 90 seconds for the initial connection.

## Phone combat and scrolling menus published — 2026-09-12

Version 12 publishes the mobile redesign at
https://embergravegame.mcke0311.chatgpt.site. Sites confirmed publication succeeded
at 22:52 UTC; public access is preserved. This release adds the floating stick,
four direct-cast skill slots, compact HUD, scrolling inventory cards and menu
navigation, and removes the old mobile pager. Existing runtime assets, compressed
cinematic, multiplayer endpoint and donation configuration are preserved.

Release source: `3e1eab82b7726755e8fe4acf1ccbc9d138b7315c`.
Saved version: `appgprj_6aa420e20bfc8191b59e30227bca8a09~appgver_dc2da72e4bb08191b1447c9ee74ea77d`.
Deployment: `appgdep_6aa5d7203de88191aa1b6d13f12f3b86`.

All 10 updated runtime files match the tested source exactly. Release validation
passed 70 JavaScript syntax checks and 1,155 runtime references with no missing
files. The source was pushed and its complete remote SHA verified before saving.
The updated official packaging helper could not start Bash on Windows, so Sites
packaged the exact pushed static source. Phone, touch, settings and co-op test
results are recorded in the phone implementation notes.

## Custom domain connected — 2026-09-12

The user added the missing ownership TXT record in Namecheap. Both authoritative
nameservers now return the expected value, and refreshing the existing Sites
domain record `appgdom_6aa43856e7dc819195bd98e47312c9eb` completed activation at
23:15 UTC. Domain, provider and SSL statuses are all active. The two A records
remain `162.159.143.30` and `172.66.3.26`; the TXT host is
`_openai-site-verification.embergravegame.com` with this value:

```text
openai-site-verification=5vg9gjI2wtNthJTUrwQpXWcMuPHHseK6vg-lEbpiIkU
```

The new HTTPS address returns HTTP 200 and the published mobile redesign.
The existing Render relay initially rejected its Origin with HTTP 403 while
accepting the old address. Its `ALLOWED_ORIGINS` environment variable now includes
both exact origins, matching `render.yaml`. Save and deploy reused the existing
server image; Render reports deployment `dep-daitrfh5efls73etjga0` Live. There were
zero active rooms or connections before applying the setting. Both origins now
complete a WebSocket upgrade with HTTP 101.

Browser-local saves remain scoped to their website origin. Existing saves at the
original Sites address are not automatically copied to the custom domain.

## Latest game and coordinated multiplayer release — 2026-09-13

Version 13 publishes GitHub `main` at
`1bd90490069ba5dd14919f247a6fba95ab3bc9a0`, including the phone fixes,
updated app icons, gameplay changes, and worker-hosted multiplayer protocol 2
(`embergrave-coop-3`). Sites confirmed publication succeeded at 13:41:43 UTC,
returning https://embergravegame.mcke0311.chatgpt.site. The existing custom domain
https://embergravegame.com and public audience are preserved.

Release source: `2a20584040627224b6fb3639ac24889370fe2563`.
Saved version: `appgprj_6aa420e20bfc8191b59e30227bca8a09~appgver_e25f9c207dc48191a13fd5e84a6b4a19`.
Deployment: `appgdep_6aa6a7984aac81918a5e7bf327c41ad8`.

The Render relay was deployed from the same GitHub commit. Deployment
`dep-dajaf395efls738605c0` reports **Deploy succeeded | Live**; `/healthz`
reports `ok: true` and build `embergrave-coop-3`. There were no active rooms or
connections before rollout. Existing service configuration and allowed origins
were retained.

Validation passed: 73 JavaScript syntax checks, 1,159 runtime references with no
missing files, 45 multiplayer unit tests, 85 co-op and 25 inventory contract
checks, 58 multiplayer UI checks, 18 network checks, the phone screen audit,
29 touch-control checks, 57 mobile redesign checks, and 88 settings checks.
Independent browser sessions passed with two players at 150 ms simulated RTT
and four players at 300 ms, including separate travel, combat, reconnect, and
saved-campaign recovery. Both multiplayer performance suites passed, and the
frontend/worker/relay release manifest verified 72 files.

Live relay smoke checks passed for both website origins, public discovery,
hidden password rooms, wrong-password rejection, four-player admission,
full-room rejection, command forwarding, large snapshot delivery, and reconnect.
The temporary test rooms were closed afterward. The smoke harness was corrected
to acknowledge hero admission and wait for the server's disconnected roster
before requesting resume; no application change was needed. Physical Pixel 7a
acceptance remains unperformed, as documented in `MULTIPLAYER_VALIDATION.md`.

The compact static release contains 1,287 files (202.48 MiB). The compressed
cinematic, donation destination, and editor exclusion are preserved. The local
packaging helper could not start Bash on Windows, so Sites built the exact
pushed static source using the existing remote-build fallback.

## Latest menus, typography, and support link — 2026-09-13

Version 14 publishes GitHub `main` at
`06989f7095eab09ab671e9fd979dce7c014e444c`. Sites confirmed publication
**succeeded** at 14:40:38 UTC, returning
https://embergravegame.mcke0311.chatgpt.site. The existing custom domain
https://embergravegame.com and public audience are preserved.

The update includes the simplified Single Player/Multiplayer menu, required
character names, shared Exocet typography, and the direct Ko-fi support link.
The compact release now includes the new OpenType font and shared stylesheet.

Release source: `ef72601553af710de15b539c4e0a7a6a6443f31f`.
Saved version: `appgprj_6aa420e20bfc8191b59e30227bca8a09~appgver_736f33d19ddc8191ba21253556529a7e`.
Deployment: `appgdep_6aa6b55f492081918fc0ff5355824c95`.

Validation passed: 73 JavaScript syntax checks, 1,161 runtime references with
no missing files, all three page entrypoints, and manifest icons. All 24 changed
files match the source and committed release exactly, with the established editor
link removal on the loot page. The release contains 1,289 files (202.81 MiB),
preserving the compressed cinematic and editor exclusion. Browser interaction
testing was not repeated for this publication. The multiplayer relay is unchanged.

The pushed remote SHA was verified. The local packaging helper could not start
Bash on Windows, so Sites packaged the exact pushed source using the existing
remote-build fallback.

## Dedicated story arenas and campaign artwork — 2026-09-29

Version 16 publishes the six dedicated story arenas, required device counters,
entrance retries, and campaign environment refresh from game commit
`a55f3b260cf7b9e1400238548128c4a64580f0bf`. The GitHub release, including the
generated-archive ignore rule, was pushed to `main` at
`293a5121d4eb467e02629d7c9ec5c7b3d8a7ff3b`.

Sites confirmed **succeeded** at 13:18:07 UTC and returned
https://embergravegame.mcke0311.chatgpt.site. Existing public access and the
custom domain https://embergravegame.com are preserved.

Release source: `b9a8e9366dc58bc721bb45b1ff16fdfd11d8417f`.
Saved version: `appgprj_6aa420e20bfc8191b59e30227bca8a09~appgver_792284c86d848191bf1f6950deda7723`.
Deployment: `appgdep_6abbba003a508191b08d3cccff90452c`.

The compact website contains 1,368 runtime files (209.63 MiB), including all
36 new arena sprites and the read-only world reference page. The compressed
cinematic, donation destination, and local editor exclusion remain in place.
All 75 JavaScript syntax checks and 1,243 runtime reference checks passed with
no missing files. Encounter, progression, co-op and performance evidence is
recorded in [arena validation](../tests/boss_arenas_results.md).

An archive built from the exact committed release passed local validation
(201.08 MiB; 1,369 files including the hosting manifest). The native archive
transfer failed, so Sites built the same verified, pushed source through its
existing remote-build fallback. The release source push and publication were
both confirmed.

**Render was explicitly skipped at the user's request.** The frontend and
worker identify as `embergrave-coop-4`; the live relay remains
`embergrave-coop-3`. Multiplayer requires the matching relay deployment before
new clients can connect. The server was not restarted or reconfigured.

GitHub initially rejected three generated launch ZIPs from earlier unpublished
commits because each exceeded its 100 MiB limit. Only those ZIPs were removed
from the five unpublished commits, and a scoped ignore rule prevents recurrence.
All three archives remain on disk. The original local history is retained on
`codex/before-arena-release-publish-20260929`; published history was preserved
and the corrected push was a normal fast-forward. Unrelated Emberwitch source
art remains uncommitted.

## Live cinematics and distinct boss combat — 2026-09-30

Version 17 publishes GitHub `main` at
`9d7228324530f2f2e755fabffd8c5ea3ac2a96e1`, including the adventure upgrades,
20 live campaign cinematics, distinct boss counters, distant-pressure attacks,
and six painted wall entrances. Publication **succeeded** at 23:13:40 Toronto
time on September 30 (2026-10-01 03:13:40 UTC).

Live website: https://embergravegame.com. Site access is public; the original
https://embergravegame.mcke0311.chatgpt.site address also serves this release.

Release source: `cd3b41b3da13189b7e28ea845e3dde095f07ae45`.
Saved version: `appgprj_6aa420e20bfc8191b59e30227bca8a09~appgver_044c57833c148191a888f5eb4cb7249d`.
Deployment: `appgdep_6abdcf5f1a808191962c8b7da2918c00`.

The compact release contains 1,388 runtime files (215.58 MiB). Its validated
local archive contains 1,389 files including the hosting manifest (206.91 MiB
compressed). Native archive transfer failed; Sites built the exact verified,
pushed source. The compressed legacy cinematic and editor exclusions are retained.
`tmp/sync_site_release.py` selects runtime dependencies without recursively
importing the source artwork referenced by provenance catalogs.

Validation passed: 82 JavaScript syntax checks, 1,263 runtime references with
no missing files, and Chrome checks against both the prepared release and live
custom domain. New-game startup, all six arena bundles, 20 registered scenes,
and cinematic asset preparation passed without runtime or HTTP errors. Hashes
of 24 live scripts, stylesheets and new artwork files match the published commit.

The frontend and worker identify as `embergrave-coop-8`. The Render relay was
not deployed and still reports `embergrave-coop-3`; multiplayer requires a
matching relay update. The preceding publication had also left the relay on
that older build.

## Unique equipment and full-body armor — 2026-10-01

Version 18 publishes game commit
`0aeb677bb3b4c88422de49bbe726565bc2797a30` on GitHub `main`. It includes
the 163 unique inventory icons, 118 refined bespoke equipment models, and
coordinated torso, arm and leg appearances for all 27 body armors on five classes.
Sites confirmed publication **succeeded** at 21:30:56 UTC (17:30:56 Toronto).
The live custom domain is https://embergravegame.com; public access is preserved.

Release source: `aad13bee9a6380b68cf04ba1f582711ee2cee797`.
Saved version: `appgprj_6aa420e20bfc8191b59e30227bca8a09~appgver_4cdc6025078c8191adc9b17e002ee27c`.
Deployment: `appgdep_6abed0a5b14081919ae67c45fe7fd6aa`.

The compact release contains 1,394 runtime files (216.47 MiB). All 87 script
syntax checks and 1,269 runtime reference checks passed with no missing files;
112 runtime code, style and entrypoint files match the pushed game source, with
the established editor-link exclusions. The inventory renderer uses the packed
unique icon atlas; 118 high-resolution art references retained by the model
recipes are authoring provenance and are excluded from the website package.

The local archive contains 1,395 files including its hosting manifest
(207.44 MiB compressed) and passed source/manifest validation. Native archive
transfer failed, so Sites built the exact verified, pushed release source through
the existing fallback. The Windows packaging workflow succeeds with Git Bash
and `TAR_OPTIONS=--force-local`; its release checkout also needs an explicitly
scoped `safe.directory` setting when running as the desktop user.

Equipment verification and captures are recorded in
[body armor results](../tests/body_armor3d_results.md) and
[unique refinement results](../tests/unique_models3d_refinement_results.md).
Publication metadata and the archive hash are retained in
[the release record](qa/body_armor_site_publication.json). Publication was
confirmed through Sites deployment status; the earlier equipment browser review
was reused. The multiplayer relay was not part of this static equipment update.

## Mobile XP, survivor progress, and combat rendering — 2026-10-03

Version 19 publishes GitHub `main` at
`8c0de64b319f90af530e30c0f2c020659bed5bdb`, including implementation commit
`cfde527cfaf886697e137912fa934a83c84a8700`. The phone HUD now displays the XP bar;
survivors rescued before accepting their quest retain credit across saves and
co-op sessions. Ground loot reuses bounded cached artwork, avoiding repeated
canvas allocation during combat as dropped items accumulate.

Sites confirmed publication **succeeded** at 23:05:33 UTC (19:05:33 Toronto)
and returned https://embergravegame.mcke0311.chatgpt.site. The existing custom
domain https://embergravegame.com and public audience are preserved.

Release source: `07a24fa02948fba110d37446bfc09e6fa54390ed`.
Saved version: `appgprj_6aa420e20bfc8191b59e30227bca8a09~appgver_6e39eae1c0708191b514bfc81d7010f8`.
Deployment: `appgdep_6ac189c2bf2c8191b91cd4613d03ea6f`.

The compact release contains 1,394 runtime files (216.49 MiB). All 87 script
syntax checks and 1,269 runtime reference checks passed with no missing files.
Its validated archive is 217,524,541 bytes (207.45 MiB compressed). The native
archive transfer failed, so Sites built the exact verified, pushed source through
the established remote-build fallback. The source and archive are retained.

The new mobile progression suite passed 43 checks in Chrome and 43 in WebKit,
including XP placement, early rescue save/reload and quest completion, rendering
identity, bounded cache eviction, and 100 kills with temporary effects expiring.
Warm rendering of 100 ground items allocates zero canvases per frame in both
loot paths. Frontier regression checks (230), item identity checks (4,094),
and the full co-op suite (46 tests, 85 ownership and 25 inventory checks) passed.
The existing phone, touch, menu, opening, boss activation, merchant, and icon
checks also passed. These are desktop browser checks; a physical phone was not
attached. Implementation notes are in [PHONE_EXPERIENCE.md](PHONE_EXPERIENCE.md).

Frontend, worker, and committed relay source use `embergrave-coop-9`. The live
Render relay still reports `embergrave-coop-3`. Updating the existing service is
pending owner sign-in to Render; new co-op clients require the matching relay.
This mismatch was already present before this publication.

Publication IDs, archive hash, and validation counts are recorded in
[the release record](qa/mobile_progress_site_publication.json).
