# Sites deployment

Current website (verified 2026-09-12): https://embergravegame.mcke0311.chatgpt.site
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
