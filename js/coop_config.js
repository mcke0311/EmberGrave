/* HTTPS releases use the public relay; HTTP development/LAN keeps its local relay. */
window.COOP_CONFIG=Object.assign({relayUrl:location.protocol==='http:'?'ws://'+(location.hostname||'localhost')+':8742/ws':'wss://embergrave-multiplayer.onrender.com/ws',connectTimeoutMs:90000},window.COOP_CONFIG||{});
