/* Override before coop.js loads when deploying the static client. */
window.COOP_CONFIG=Object.assign({relayUrl:'ws://'+(location.hostname||'localhost')+':8742/ws'},window.COOP_CONFIG||{});
