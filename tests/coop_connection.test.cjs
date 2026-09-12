const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const P=require('../js/coop_protocol.js');
const source=name=>fs.readFileSync(path.join(__dirname,'../js/',name+'.js'),'utf8');
function fixture(protocol='https:',config={}){
  const sockets=[],timers=new Map();let timerId=0;
  class Socket{
    static OPEN=1;
    constructor(url){this.url=url;this.readyState=0;this.bufferedAmount=0;this.sent=[];sockets.push(this);}
    send(raw){this.sent.push(JSON.parse(raw));}
    close(){this.readyState=3;this.onclose?.();}
    open(){this.readyState=1;this.onopen?.();}
    message(type,data){return this.onmessage({data:JSON.stringify(P.envelope(type,data))});}
  }
  const context=vm.createContext({URL,console,performance,location:{protocol,hostname:'game.example'},window:{COOP_CONFIG:config},
    WebSocket:Socket,CoopProtocol:P,CoopCodec:{},Game:{state:null},
    CoopStore:{read:async()=>({id:'hero'})},sessionStorage:{getItem:()=>null,setItem(){}},
    setTimeout:(fn,ms)=>{timers.set(++timerId,{fn,ms});return timerId;},clearTimeout:id=>timers.delete(id),
    setInterval:()=>++timerId,clearInterval(){}});
  vm.runInContext(source('coop_config'),context);vm.runInContext(source('coop'),context);
  return {coop:vm.runInContext('Coop',context),config:context.window.COOP_CONFIG,sockets,timers};
}
test('HTTPS uses the public relay; HTTP/LAN and explicit overrides remain supported',async()=>{
  assert.equal(fixture().config.relayUrl,'wss://embergrave-multiplayer.onrender.com/ws');
  const f=fixture('https:',{relayUrl:''});
  await assert.rejects(f.coop.connect('host','hero'),/owner needs to activate/);
  assert.equal(f.sockets.length,0);assert.equal(f.coop.active,false);
  assert.equal(fixture('http:').config.relayUrl,'ws://game.example:8742/ws');
  assert.equal(fixture('https:',{relayUrl:'wss://relay.example/ws'}).config.relayUrl,'wss://relay.example/ws');
});
test('invalid and insecure endpoints fail without creating a socket',async()=>{
  for(const [url,message] of [['invalid',/valid multiplayer/],['https://relay.example/ws',/must begin/],['ws://relay.example/ws',/secure multiplayer/]]){
    const f=fixture('https:',{relayUrl:url});await assert.rejects(f.coop.connect('host','hero'),message);
    assert.equal(f.sockets.length,0);assert.equal(f.coop.loading,false);
  }
});
test('a close before admission rejects promptly and permits a fresh attempt',async()=>{
  const f=fixture('https:',{relayUrl:'wss://relay.example/ws'});
  const first=f.coop.connect('join','hero','ROOM');await new Promise(setImmediate);
  const rejected=assert.rejects(first,/closed the connection/);f.sockets[0].close();await rejected;
  assert.equal(f.coop.active,false);assert.equal(f.timers.size,0);
  const second=f.coop.connect('join','hero','ROOM');await new Promise(setImmediate);
  f.sockets[0].close();assert.equal(f.coop.active,true,'an old socket cannot reset the new attempt');
  const socket=f.sockets[1];socket.open();await socket.message('welcome',{room:'ROOM',playerId:'guest',hostId:'host',token:'token'});
  assert.equal(await second,'ROOM');assert.equal(f.coop.active,true);
  assert.equal(socket.sent[0].type,'join');assert.equal(f.timers.size,0);
});
test('first connection allows server wake-up, then times out without a reconnect loop',async()=>{
  const f=fixture('https:',{relayUrl:'wss://relay.example/ws'});
  const attempt=f.coop.connect('host','hero');await new Promise(setImmediate);
  const timer=[...f.timers.values()][0];assert.equal(timer.ms,90000);
  const rejected=assert.rejects(attempt,/may be waking up/);timer.fn();await rejected;
  assert.equal(f.coop.active,false);assert.equal(f.sockets[0].readyState,3);assert.equal(f.timers.size,0);
});
test('relay refusal restores retry state and retains its useful error',async()=>{
  const f=fixture('https:',{relayUrl:'wss://relay.example/ws'});
  const attempt=f.coop.connect('host','hero');await new Promise(setImmediate);
  const rejected=assert.rejects(attempt,/Relay is full/);
  await f.sockets[0].message('error',{message:'Relay is full. Try again later.'});await rejected;
  assert.equal(f.coop.active,false);assert.equal(f.timers.size,0);
});
test('an established party keeps retrying after a failed resume handshake',async()=>{
  const f=fixture('https:',{relayUrl:'wss://relay.example/ws'});
  const attempt=f.coop.connect('join','hero','ROOM');await new Promise(setImmediate);
  await f.sockets[0].message('welcome',{room:'ROOM',playerId:'guest',hostId:'host',token:'token'});await attempt;
  f.sockets[0].close();
  const [id,timer]=[...f.timers].find(([,t])=>t.ms===1500);f.timers.delete(id);
  const reconnect=timer.fn();await new Promise(setImmediate);
  assert.equal([...f.timers.values()][0].ms,10000,'resume keeps the short timeout');
  f.sockets[1].onerror();await reconnect;
  assert.equal(f.coop.active,true);assert.equal(f.sockets[1].readyState,3);
  assert.equal([...f.timers.values()].filter(t=>t.ms===1500).length,1);
});
