const {test}=require('node:test');
const assert=require('node:assert/strict');
const {WebSocket}=require('../server/node_modules/ws');
const {createRelay}=require('../server/relay.cjs');
const P=require('../js/coop_protocol.js');
async function setup(t){
  const relay=createRelay({origins:['http://test.local'],graceMs:150});
  await new Promise(r=>relay.server.listen(0,'127.0.0.1',r));t.after(()=>relay.close());
  const port=relay.server.address().port;
  async function peer(){
    const ws=new WebSocket('ws://127.0.0.1:'+port+'/ws',{origin:'http://test.local'}),messages=[];
    ws.on('message',raw=>messages.push(JSON.parse(raw)));
    await new Promise((r,j)=>{ws.once('open',r);ws.once('error',j);});
    const wait=async type=>{const end=Date.now()+2500;while(Date.now()<end){const i=messages.findIndex(m=>m.type===type);if(i>=0)return messages.splice(i,1)[0];await new Promise(r=>setTimeout(r,5));}throw Error('Timeout waiting for '+type);};
    return {ws,messages,wait,send:(type,data)=>ws.send(JSON.stringify(P.envelope(type,data)))};
  }
  return {relay,port,peer};
}
test('version, chunk limits, duplicate chunks and out-of-order assembly',()=>{
  assert.throws(()=>P.parse(JSON.stringify({v:0,build:P.BUILD,type:'join'})),/Incompatible/);
  const data={kind:'snapshot',text:'🧙'.repeat(90000)},frames=P.frames(data,'transfer_1'),a=new P.Assembler();
  assert.equal(a.accept(frames[2]),null);assert.equal(a.accept(frames[2]),null);
  let result;for(const f of frames.filter((_,i)=>i!==2).reverse())result=a.accept(f)||result;
  assert.deepEqual(result,data);assert.throws(()=>a.accept({kind:'chunk',id:'x',count:999999,index:0,data:''}),/Invalid/);
});
test('private room admission, four-player capacity and sender identity',async t=>{
  const {peer,port}=await setup(t),h=await peer();h.send('create');const host=await h.wait('welcome');
  assert.equal((await fetch('http://127.0.0.1:'+port+'/healthz')).status,200);
  const guests=[];
  const locked=await peer();locked.send('join',{room:host.room});assert.match((await locked.wait('error')).message,/not available/);
  h.send('roomState',{open:true});await h.wait('roster');
  for(let i=0;i<3;i++){const g=await peer();g.send('join',{room:host.room});g.info=await g.wait('welcome');guests.push(g);}
  locked.send('join',{room:host.room});assert.match((await locked.wait('error')).message,/full/);
  guests[0].send('data',{from:host.playerId,to:guests[1].info.playerId,payload:{kind:'snapshot'}});
  assert.match((await guests[0].wait('error')).message,/only send to the host/);
  guests[0].send('data',{from:host.playerId,payload:{kind:'command',seq:1}});
  const forwarded=await h.wait('data');assert.equal(forwarded.from,guests[0].info.playerId);
  guests[0].send('roomState',{open:true});assert.match((await guests[0].wait('error')).message,/Only the host/);
  h.send('data',{to:guests[1].info.playerId,payload:{kind:'event',text:'hello'}});assert.equal((await guests[1].wait('data')).payload.text,'hello');
});
test('resume tokens restore the same member and host loss ends the room',async t=>{
  const {peer,relay}=await setup(t),h=await peer();h.send('create');const host=await h.wait('welcome');h.send('roomState',{open:true});
  const g=await peer();g.send('join',{room:host.room});const info=await g.wait('welcome');g.ws.close();await new Promise(r=>g.ws.once('close',r));
  const again=await peer();again.send('resume',{room:host.room,token:info.token});assert.equal((await again.wait('welcome')).playerId,info.playerId);
  const forged=await peer();forged.send('resume',{room:host.room,token:'wrong'});assert.match((await forged.wait('error')).message,/cannot be resumed/);
  h.ws.close();assert.match((await again.wait('ended')).reason,/Host reconnection/);assert.equal(relay.rooms.size,0);
});

test('origin restrictions, incompatible builds, and expired chunk buffers',async t=>{
  const {peer,port}=await setup(t);
  const rejected=new WebSocket('ws://127.0.0.1:'+port+'/ws',{origin:'https://not-allowed.example'});
  const error=await new Promise(resolve=>rejected.once('error',resolve));assert.match(error.message,/403/);
  const bad=await peer();bad.ws.send(JSON.stringify({...P.envelope('create'),build:'older-build'}));assert.match((await bad.wait('error')).message,/Incompatible/);
  const a=new P.Assembler();a.accept({kind:'chunk',id:'old',count:2,index:0,data:'{}'},0);
  a.accept({kind:'heartbeat'},16000);assert.equal(a.pending.size,0);
  for(let i=0;i<4;i++)a.accept({kind:'chunk',id:'x'+i,count:2,index:0,data:'{}'});
  assert.throws(()=>a.accept({kind:'chunk',id:'overflow',count:2,index:0,data:'{}'}),/Too many/);
  const text={message:'🧙'.repeat(50000)};for(const frame of P.frames(text,'unicode'))assert.ok(Buffer.byteLength(JSON.stringify(P.envelope('data',{payload:frame})))<P.MAX_FRAME);
});

test('public directory hides password rooms and passwords reserve seats atomically',async t=>{
  const {peer,relay,port}=await setup(t),publicHost=await peer(),privateHost=await peer();
  publicHost.send('create',{name:'Open adventure',hostName:'Open host'});const open=await publicHost.wait('welcome');publicHost.send('roomState',{open:true});
  privateHost.send('create',{name:'Secret adventure',hostName:'Private host',password:'Northern lights'});const hidden=await privateHost.wait('welcome');privateHost.send('roomState',{open:true});
  const directory=await (await fetch('http://127.0.0.1:'+port+'/rooms',{headers:{Origin:'http://test.local'}})).json();
  assert.equal(directory.rooms.length,1);assert.equal(directory.rooms[0].code,open.room);assert.equal(directory.rooms[0].name,'Open adventure');
  assert.ok(!JSON.stringify(directory).includes('Northern lights'));assert.ok(!JSON.stringify(directory).includes(hidden.room));
  assert.equal((await fetch('http://127.0.0.1:'+port+'/rooms',{headers:{Origin:'https://wrong.example'}})).status,403);
  const wrong=await peer();wrong.send('join',{room:hidden.room,password:'wrong'});assert.match((await wrong.wait('error')).message,/password/);
  assert.equal(relay.rooms.get(hidden.room).members.size,1);
  const guests=await Promise.all(Array.from({length:4},()=>peer()));
  for(const g of guests)g.send('join',{room:hidden.room,password:'Northern lights'});
  await new Promise(r=>setTimeout(r,250));
  assert.equal(guests.filter(g=>g.messages.some(m=>m.type==='welcome')).length,3);
  assert.equal(guests.filter(g=>g.messages.some(m=>m.type==='error'&&/full/.test(m.message))).length,1);
  assert.equal(relay.rooms.get(hidden.room).members.size,4);
  const member=[...relay.rooms.get(hidden.room).members.values()].find(m=>m.id!==hidden.playerId);
  privateHost.send('rejectMember',{playerId:member.id,reason:'Invalid hero'});await new Promise(r=>setTimeout(r,20));
  assert.equal(relay.rooms.get(hidden.room).members.size,3);
  assert.equal(relay.rooms.get(hidden.room).passwordSalt.length,16);assert.equal(relay.rooms.get(hidden.room).passwordHash.length,32);
  for(let i=0;i<3;i++){const g=await peer();g.send('join',{room:open.room});await g.wait('welcome');}
  const full=(await (await fetch('http://127.0.0.1:'+port+'/rooms')).json()).rooms.find(r=>r.code===open.room);
  assert.equal(full.players,4);assert.equal(full.maxPlayers,4);assert.equal(full.available,false);assert.equal(full.hostName,'Open host');

});
