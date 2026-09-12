# Activate online multiplayer

The game website is already live. Online parties also need a public connection
server (relay). The relay forwards messages; heroes and campaigns stay in the
players' browsers. The static Sites deployment does not run the Node relay.

## Render setup

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
