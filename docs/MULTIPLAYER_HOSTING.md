# Activate online multiplayer

The game website is already live. Online parties also need a public connection
server (relay). The relay forwards messages; heroes and campaigns stay in the
players' browsers. The static Sites deployment does not run the Node relay.

## Render setup

### Node.js security requirement

CVE-2026-111497 affects the Brotli decoder bundled with older Node.js runtimes.
Use Node.js **22.23.4**, **24.22.1**, **26.12.1**, or a later patched release in
one of those supported major lines. The repository's `.node-version` and Docker
image select 22.23.4. The relay refuses to start without the patched decoder's
`BROTLI_DECODER_ERROR_FORMAT_BLOCK_SWITCH` constant. The security backport can
still report Brotli 1.1.0, so that library version string alone is insufficient.

Rebuild the Docker image and manually deploy the security commit on the existing
Render service. Reusing the old image does not apply the runtime fix. Verify the
deployment commit and `/healthz`'s `runtime.node` after it becomes Live. The game
protocol is unchanged; this runtime-only update does not need a frontend release.
The Python development server uses the standard library and does not decode
Brotli. The relay currently does not decompress request bodies or fetch remote
responses, and WebSocket compression is disabled, so the reviewed application
has no identified attacker-controlled Brotli decoding path.

Sources: [Node.js security advisory](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases)
and [Node.js 22.23.4 release](https://nodejs.org/en/blog/release/v22.23.4/).

### Existing service configuration

[Deploy the prepared free relay](https://render.com/deploy?repo=https://github.com/mcke0311/EmberGrave/tree/codex/multiplayer-hosting).

1. Create or sign into a Render account. Connect GitHub if Render needs access to
   this repository.
2. Review the `embergrave-multiplayer` service and keep the **Free** instance.
   The blueprint configures the game's exact allowed origin, health check, and
   existing Docker server. No paid service or database is included.
3. Deploy and wait for the service to become **Live**. Copy the assigned
   `https://…onrender.com` URL; its actual hostname must come from Render.
4. Give that URL to the website maintainer so it can be checked, converted to
   `wss://…onrender.com/ws`, configured in `js/coop_config.js`, and published.

Do not guess the assigned hostname. After configuration, check `/healthz` and
verify that two independent browser sessions can host and join through the live
HTTPS game before announcing multiplayer as available.

Render's free service sleeps after 15 minutes without inbound traffic. A new
connection can take about a minute to wake it. Active WebSocket messages count as
traffic. Restarts discard open rooms; players can resume their saved campaigns
in new rooms. Free-plan quotas still apply. Keep one instance because room state
is held in that process. Automatic deploys are off to avoid restarting parties
on unrelated website changes.

Sources: [Render WebSockets](https://render.com/docs/websocket),
[free-service limits](https://render.com/docs/free), and
[deployment buttons](https://render.com/docs/deploy-to-render).

## Protocol 2 upgrade

Deploy the frontend and relay for `embergrave-coop-3` together. The relay now serves `GET /rooms`; allow that path through the HTTPS proxy as well as `/ws` and `/healthz`. Discovery responses enforce the configured game origins, disable caching, and omit password-protected rooms. Passwords use a random salt and asynchronous scrypt hashing at the relay. They are never included in directory data or invitation URLs.

Use [the coordinated release and rollback procedure](MULTIPLAYER_RELEASE.md). This workspace prepares the release; these edits do not deploy the public service.
