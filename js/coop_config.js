/* Set relayUrl to the verified public wss:// endpoint when deploying online play.
   HTTP development/LAN play keeps its local relay default. */
window.COOP_CONFIG=Object.assign({relayUrl:location.protocol==='http:'?'ws://'+(location.hostname||'localhost')+':8742/ws':'',connectTimeoutMs:90000},window.COOP_CONFIG||{});
