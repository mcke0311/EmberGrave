'use strict';
const http=require('node:http');
const crypto=require('node:crypto');
const {WebSocketServer,WebSocket}=require('ws');
const P=require('../js/coop_protocol.js');
const {promisify}=require('node:util');
const derive=promisify(crypto.scrypt);

function createRelay(options={}){
  const rooms=new Map(), peers=new Set();
  const grace=options.graceMs??60000, maxRooms=options.maxRooms??100;
  const origins=new Set(options.origins??['http://localhost:8741','http://127.0.0.1:8741']);
  const token=()=>crypto.randomBytes(24).toString('base64url');
  const attempts=new Map();
  const clean=(v,n)=>String(v||'').replace(/[\x00-\x1f\x7f]/g,'').trim().slice(0,n);
  const password=v=>{if(v===undefined||v==='')return '';if(typeof v!=='string'||v.length>128)throw Error('Password must be at most 128 characters.');return v;};
  const server=http.createServer((req,res)=>{
    if(req.method==='GET'&&req.url==='/rooms'){
      const origin=req.headers.origin;
      if(origin&&!origins.has(origin)){res.writeHead(403);res.end();return;}
      res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin',...(origin?{'Access-Control-Allow-Origin':origin}:{})});
      res.end(JSON.stringify({build:P.BUILD,rooms:[...rooms.values()].filter(r=>!r.passwordHash).map(r=>({code:r.code,name:r.name,hostName:r.hostName,players:r.members.size,maxPlayers:P.MAX_PLAYERS,available:r.open&&!!r.members.get(r.hostId)?.ws&&r.members.size<P.MAX_PLAYERS}))}));return;
    }
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
    if(ws.readyState!==WebSocket.OPEN)peers.delete(ws);const room=ws.room,m=ws.member;
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
    wss.handleUpgrade(req,socket,head,ws=>{ws.remoteAddress=socket.remoteAddress;wss.emit('connection',ws,req);});
  });
  const reqAddress=ws=>ws.remoteAddress||'local';
  wss.on('connection',ws=>{
    peers.add(ws);ws.admitting=false;ws.address=reqAddress(ws);ws.alive=true;ws.connectedAt=Date.now();ws.windowAt=Date.now();ws.count=0;ws.bytes=0;
    ws.on('pong',()=>ws.alive=true);
    ws.on('error',()=>{});
    ws.on('close',()=>detach(ws));
    ws.on('message',async(raw,binary)=>{
      let admissionRequest=false;
      try{
        if(binary)throw Error('Text messages required');
        const now=Date.now();
        if(now-ws.windowAt>=1000){ws.windowAt=now;ws.count=ws.bytes=0;}
        if(++ws.count>240||(ws.bytes+=raw.length)>3*1024*1024)throw Error('Message rate exceeded');
        const msg=P.parse(raw.toString());
        if(msg.type==='ping'){send(ws,'pong',{at:msg.at});return;}
        if(msg.type==='leave'){ws.admissionEpoch=(ws.admissionEpoch||0)+1;detach(ws,true);send(ws,'left');return;}
        if(msg.type==='create'||msg.type==='join'||msg.type==='resume'){
          if(ws.room||ws.admitting)throw Error('Already joining a room');
          ws.admitting=true;admissionRequest=true;const admissionEpoch=ws.admissionEpoch||0;
          if(msg.type==='create'){
            if(rooms.size>=maxRooms)throw Error('Relay is full. Try again later.');
            const secret=password(msg.password);let passwordSalt=null,passwordHash=null;
            if(secret){passwordSalt=crypto.randomBytes(16);passwordHash=await derive(secret,passwordSalt,32);}
            if(ws.readyState!==WebSocket.OPEN||(ws.admissionEpoch||0)!==admissionEpoch)return;
            if(rooms.size>=maxRooms)throw Error('Relay is full. Try again later.');
            let code;do{code=crypto.randomBytes(5).toString('hex').toUpperCase();}while(rooms.has(code));
            const m={id:token(),token:token(),ws,ready:false};
            const room={code,name:clean(msg.name,40)||'Adventuring party',hostName:clean(msg.hostName,24)||'Host',passwordSalt,passwordHash,hostId:m.id,open:false,members:new Map([[m.id,m]])};rooms.set(code,room);ws.room=room;ws.member=m;
          }else{
            const room=rooms.get(String(msg.room||'').toUpperCase());if(!room)throw Error('Room not found.');
            let m;
            if(msg.type==='resume'){
              m=[...room.members.values()].find(m=>m.token===msg.token);
              if(!m||m.ws||now-m.lostAt>grace)throw Error('Session cannot be resumed.');
              m.ws=ws;m.lostAt=null;
            }else{
              if(room.passwordHash){
                const key=ws.address+':'+room.code,record=attempts.get(key)||{at:now,count:0};
                if(now-record.at>60000){record.at=now;record.count=0;}
                if(++record.count>10)throw Error('Too many password attempts. Try again in a minute.');
                attempts.set(key,record);
                const value=await derive(password(msg.password),room.passwordSalt,32);
                if(!crypto.timingSafeEqual(value,room.passwordHash))throw Error('Incorrect room code or password.');
              }
              if(ws.readyState!==WebSocket.OPEN||(ws.admissionEpoch||0)!==admissionEpoch)return;
              if(rooms.get(room.code)!==room||!room.open||!room.members.get(room.hostId)?.ws)throw Error('The host is not available. Try again shortly.');
              if(room.members.size>=P.MAX_PLAYERS)throw Error('Room is full.');
              m={id:token(),token:token(),ws,ready:false,admitted:false,joinedAt:now};room.members.set(m.id,m);
            }
            ws.room=room;ws.member=m;
          }
          send(ws,'welcome',{room:ws.room.code,playerId:ws.member.id,hostId:ws.room.hostId,token:ws.member.token,resumed:msg.type==='resume'});roster(ws.room);return;
        }
        const room=ws.room,m=ws.member;if(!room||!m)throw Error('Join a room first.');
        if(msg.type==='ready'){m.ready=!!msg.ready;roster(room);return;}
        if(msg.type==='admittedMember'){if(m.id!==room.hostId)throw Error('Only the host controls admission');const member=room.members.get(msg.playerId);if(member)member.admitted=true;return;}
        if(msg.type==='rejectMember'){
          if(m.id!==room.hostId)throw Error('Only the host controls admission');
          const rejected=room.members.get(msg.playerId);
          if(rejected&&rejected.id!==room.hostId){send(rejected.ws,'ended',{reason:clean(msg.reason,180)||'Unable to admit this hero.'});if(rejected.ws){rejected.ws.room=null;rejected.ws.member=null;}room.members.delete(rejected.id);roster(room);}return;
        }
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
      }catch(e){send(ws,'error',{message:e.message});}finally{if(admissionRequest)ws.admitting=false;}
    });
  });
  const sweep=setInterval(()=>{
    const now=Date.now();
    for(const [key,record]of attempts)if(now-record.at>60000)attempts.delete(key);
    for(const ws of peers)if(!ws.room&&now-ws.connectedAt>15000)ws.close(1008,'Join timeout');
    for(const room of rooms.values()){
      const host=room.members.get(room.hostId);
      if(!host.ws&&now-host.lostAt>grace){end(room,'Host reconnection timed out. Resume the saved campaign in a new room.');continue;}
      for(const [id,m]of room.members)if(id!==room.hostId&&((!m.ws&&now-m.lostAt>grace)||(!m.admitted&&now-m.joinedAt>30000))){if(m.ws){send(m.ws,'ended',{reason:'Hero admission timed out. Join again.'});m.ws.room=m.ws.member=null;}room.members.delete(id);broadcast(room,'departed',{playerId:id});roster(room);}
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
