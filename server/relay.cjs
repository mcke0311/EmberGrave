'use strict';
const http=require('node:http');
const crypto=require('node:crypto');
const {WebSocketServer,WebSocket}=require('ws');
const P=require('../js/coop_protocol.js');

function createRelay(options={}){
  const rooms=new Map(), peers=new Set();
  const grace=options.graceMs??60000, maxRooms=options.maxRooms??100;
  const origins=new Set(options.origins??['http://localhost:8741','http://127.0.0.1:8741']);
  const token=()=>crypto.randomBytes(24).toString('base64url');
  const server=http.createServer((req,res)=>{
    if(req.method==='GET'&&req.url==='/healthz'){
      res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});
      res.end(JSON.stringify({ok:true,rooms:rooms.size,connections:peers.size,build:P.BUILD}));
    }else{res.writeHead(404);res.end();}
  });
  const wss=new WebSocketServer({noServer:true,maxPayload:P.MAX_FRAME,perMessageDeflate:false});
  function send(ws,type,data={}){
    if(ws?.readyState!==WebSocket.OPEN)return false;
    if(ws.bufferedAmount>2*1024*1024){ws.close(1013,'Connection is too slow');return false;}
    ws.send(JSON.stringify(P.envelope(type,data)));return true;
  }
  function broadcast(room,type,data){for(const member of room.members.values())send(member.ws,type,data);}
  function roster(room){broadcast(room,'roster',{room:room.code,hostId:room.hostId,open:room.open,members:[...room.members.values()].map(m=>({id:m.id,connected:!!m.ws,ready:m.ready}))});}
  function end(room,reason){
    if(!rooms.delete(room.code))return;
    broadcast(room,'ended',{reason});
    for(const m of room.members.values()){if(m.ws){m.ws.room=null;m.ws.member=null;}}
    room.members.clear();
  }
  function detach(ws,explicit=false){
    peers.delete(ws);const room=ws.room,m=ws.member;
    ws.room=null;ws.member=null;
    if(!room||!m||m.ws!==ws)return;
    m.ws=null;m.lostAt=Date.now();
    if(explicit&&m.id===room.hostId){end(room,'The host ended the session.');return;}
    if(explicit){room.members.delete(m.id);broadcast(room,'departed',{playerId:m.id});}
    roster(room);
  }
  server.on('upgrade',(req,socket,head)=>{
    if(req.url!=='/ws'||!origins.has(req.headers.origin)){socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');socket.destroy();return;}
    if(peers.size>=maxRooms*4+32){socket.write('HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\n\r\n');socket.destroy();return;}
    wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,req));
  });
  wss.on('connection',ws=>{
    peers.add(ws);ws.alive=true;ws.connectedAt=Date.now();ws.windowAt=Date.now();ws.count=0;ws.bytes=0;
    ws.on('pong',()=>ws.alive=true);
    ws.on('error',()=>{});
    ws.on('close',()=>detach(ws));
    ws.on('message',(raw,binary)=>{
      try{
        if(binary)throw Error('Text messages required');
        const now=Date.now();
        if(now-ws.windowAt>=1000){ws.windowAt=now;ws.count=ws.bytes=0;}
        if(++ws.count>240||(ws.bytes+=raw.length)>3*1024*1024)throw Error('Message rate exceeded');
        const msg=P.parse(raw.toString());
        if(msg.type==='ping'){send(ws,'pong',{at:msg.at});return;}
        if(msg.type==='leave'){detach(ws,true);send(ws,'left');return;}
        if(msg.type==='create'||msg.type==='join'||msg.type==='resume'){
          if(ws.room)throw Error('Already in a room');
          if(msg.type==='create'){
            if(rooms.size>=maxRooms)throw Error('Relay is full. Try again later.');
            let code;do{code=crypto.randomBytes(5).toString('hex').toUpperCase();}while(rooms.has(code));
            const m={id:token(),token:token(),ws,ready:false};
            const room={code,hostId:m.id,open:false,members:new Map([[m.id,m]])};rooms.set(code,room);ws.room=room;ws.member=m;
          }else{
            const room=rooms.get(String(msg.room||'').toUpperCase());if(!room)throw Error('Room not found.');
            let m;
            if(msg.type==='resume'){
              m=[...room.members.values()].find(m=>m.token===msg.token);
              if(!m||m.ws||now-m.lostAt>grace)throw Error('Session cannot be resumed.');
              m.ws=ws;m.lostAt=null;
            }else{
              if(!room.open||!room.members.get(room.hostId)?.ws)throw Error('The host must be in Frosthaven to admit players.');
              if(room.members.size>=P.MAX_PLAYERS)throw Error('Room is full.');
              m={id:token(),token:token(),ws,ready:false};room.members.set(m.id,m);
            }
            ws.room=room;ws.member=m;
          }
          send(ws,'welcome',{room:ws.room.code,playerId:ws.member.id,hostId:ws.room.hostId,token:ws.member.token,resumed:msg.type==='resume'});roster(ws.room);return;
        }
        const room=ws.room,m=ws.member;if(!room||!m)throw Error('Join a room first.');
        if(msg.type==='ready'){m.ready=!!msg.ready;roster(room);return;}
        if(msg.type==='roomState'){
          if(m.id!==room.hostId)throw Error('Only the host controls admission');
          room.open=msg.open===true;roster(room);return;
        }
        if(msg.type==='data'){
          if(!msg.payload||typeof msg.payload!=='object')throw Error('Missing payload');
          if(m.id===room.hostId){
            for(const peer of room.members.values())if(peer.id!==m.id&&(!msg.to||msg.to===peer.id))send(peer.ws,'data',{from:m.id,payload:msg.payload});
          }else{
            if(msg.to&&msg.to!==room.hostId)throw Error('Guests can only send to the host');
            send(room.members.get(room.hostId)?.ws,'data',{from:m.id,payload:msg.payload});
          }return;
        }
        throw Error('Unknown message');
      }catch(e){send(ws,'error',{message:e.message});}
    });
  });
  const sweep=setInterval(()=>{
    const now=Date.now();
    for(const ws of peers)if(!ws.room&&now-ws.connectedAt>15000)ws.close(1008,'Join timeout');
    for(const room of rooms.values()){
      const host=room.members.get(room.hostId);
      if(!host.ws&&now-host.lostAt>grace){end(room,'Host reconnection timed out. Resume the saved campaign in a new room.');continue;}
      for(const [id,m]of room.members)if(id!==room.hostId&&!m.ws&&now-m.lostAt>grace){room.members.delete(id);broadcast(room,'departed',{playerId:id});roster(room);}
    }
  },Math.min(1000,grace));sweep.unref();
  const heartbeat=setInterval(()=>{for(const ws of peers){if(!ws.alive){ws.terminate();continue;}ws.alive=false;ws.ping();}},10000);heartbeat.unref();
  return {server,rooms,wss,close:async()=>{clearInterval(sweep);clearInterval(heartbeat);for(const ws of peers)ws.terminate();await new Promise(resolve=>wss.close(resolve));await new Promise(resolve=>server.close(resolve));}};
}
if(require.main===module){
  const relay=createRelay({origins:(process.env.ALLOWED_ORIGINS||'http://localhost:8741,http://127.0.0.1:8741').split(',').map(s=>s.trim()),maxRooms:Number(process.env.MAX_ROOMS||100)});
  relay.server.listen(Number(process.env.PORT||8742),process.env.BIND_ADDRESS||'127.0.0.1',()=>console.log('Embergrave relay listening on '+JSON.stringify(relay.server.address())));
  for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>relay.close().then(()=>process.exit(0)));
}
module.exports={createRelay};
