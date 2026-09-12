const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const P=require('../js/coop_protocol');
const drain=()=>new Promise(resolve=>setImmediate(resolve));
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
async function session(){
  let socket,saveGate=null,assetGate=null,snapshots=0,updates=0,heartbeat;
  const groups=['players','monsters','minions','projectiles','ground','traps','fx','npcs'];
  const makeHero=h=>({heroId:h.id,_coopId:h.id,name:h.name||h.id,classId:'vanguard',x:10,y:10,hp:100,stats:{maxHp:100},inv:{items:[]},stash:{items:[]},equip:{},computeStats(){}});
  const world={map:{id:'frosthaven',props:[],blocked:[],walls:[],hazard:[]},seed:1,time:0,quests:{},flags:{},shrines:[],vendorStock:{},...Object.fromEntries(groups.map(k=>[k,[]]))};
  const hero={id:'hostHero',name:'Host'},sent=[];
  class Socket{
    static OPEN=1;
    constructor(){socket=this;this.readyState=1;this.bufferedAmount=0;queueMicrotask(()=>this.onopen());}
    send(raw){const m=JSON.parse(raw);sent.push(m);if(m.type==='create')queueMicrotask(()=>this.onmessage({data:JSON.stringify(P.envelope('welcome',{room:'TEST',playerId:'host',hostId:'host',token:'token'}))}));}
    close(){this.readyState=3;}
  }
  const C={groups,register(){},restoreHero:makeHero,hero:p=>({id:p.heroId,name:p.name}),encode:x=>x,decode:x=>x,
    snapshot(s,epoch,seq,full){snapshots++;return {kind:'snapshot',epoch,seq,full,zone:s.map.id,time:s.time,groups:Object.fromEntries(groups.map(k=>[k,s[k].map(p=>({_coopId:p._coopId,x:p.x,y:p.y}))])),props:[],campaign:{},vendorStock:{}};}};
  const Game={state:world,options:{},msg(){},submitCommand:c=>ctx.CoopRef.submit(c),
    coop:{async start(p){world.player=p;world.players=[p];},async prepareHero(p){if(p.heroId==='guestHero'&&assetGate)await assetGate.promise;},arrival:p=>p,update(dt){world.time+=dt;updates++;},hostPresentation(){},refresh(){},stop(){}}};
  const ctx=vm.createContext({URL,console,structuredClone,performance,Date,Math,Map,Set,JSON,Promise,Uint32Array,crypto:require('node:crypto').webcrypto,WebSocket:Socket,CoopProtocol:P,CoopCodec:C,
    Game,CoopMotion:{capture(){}},CoopCommands:{economic:new Set(['quaff']),settle:async()=>{},execute:async(p,c)=>{p.command=c;}},
    CoopStore:{read:async()=>hero,commit:async()=>{if(saveGate)await saveGate.promise;}},
    CoopUI:{refresh(){},tick(){},status(){},closeTravel(){},close(){}},UI:{anyOpen:()=>false},document:{hidden:false},window:{COOP_CONFIG:{relayUrl:'ws://test'}},location:{protocol:'http:'},sessionStorage:{getItem:()=>null,setItem(){},removeItem(){}},setTimeout,clearTimeout,setInterval:fn=>{heartbeat=fn;return 1;},clearInterval(){},U:{dist:(x,y,a,b)=>Math.hypot(x-a,y-b)}});
  vm.runInContext(fs.readFileSync('js/coop.js','utf8'),ctx);ctx.CoopRef=vm.runInContext('Coop',ctx);
  vm.runInContext(fs.readFileSync('js/coop_input.js','utf8'),ctx);const input=vm.runInContext('CoopInput',ctx),coop=ctx.CoopRef;
  await coop.connect('host',hero.id);
  const receive=(type,data)=>socket.onmessage({data:JSON.stringify(P.envelope(type,data))});
  await receive('roster',{members:[{id:'host',connected:true},{id:'guest',connected:true}]});
  return {coop,input,world,sent,receive,socket,heartbeat,get snapshots(){return snapshots;},get updates(){return updates;},slowSave(){return saveGate=deferred();},slowAssets(){return assetGate=deferred();}};
}
test('joining asset downloads do not freeze host or guest commands',async()=>{
  const s=await session(),gate=s.slowAssets();
  const admission=s.receive('data',{from:'guest',payload:{kind:'hero',hero:{id:'guestHero'}}});await drain();
  assert.equal(s.coop.busy,false,'asset download must not own the gameplay lock');
  assert.equal(await s.coop.submit({type:'move',point:{x:12,y:10}}),true);
  s.coop.frame(.05);assert.ok(s.updates>0);
  gate.resolve();await admission;await drain();await drain();
  assert.equal(s.world.players.length,2);
  assert.equal(s.world.player.command.type,'move');
});
test('a real mouse-input translation queues its click during saving',async()=>{
  const s=await session(),gate=s.slowSave();const saving=s.coop.submit({type:'quaff',slot:0});await drain();
  assert.equal(s.coop.paused,'Saving party changes…');
  s.heartbeat();assert.equal(s.sent.at(-1).payload.paused,'','a brief save must not freeze guests until the next heartbeat');
  s.input.click(false,{mouse:{shift:false},point:{x:14,y:10}});s.input.release();
  gate.resolve();await saving;await drain();
  assert.equal(s.world.player.command.type,'move');assert.equal(s.world.player.command.point.x,14);
});
test('congested sockets skip stale samples and resume from a valid baseline',async()=>{
  const s=await session();s.coop.frame(.1);const before=s.snapshots;
  s.socket.bufferedAmount=100000;
  for(let i=0;i<20;i++)s.coop.frame(.1);
  assert.equal(s.snapshots,before,'do not serialize obsolete worlds under backpressure');
  s.socket.bufferedAmount=0;s.coop.frame(.1);assert.equal(s.snapshots,before+1);
  assert.ok(s.updates>30,'host simulation keeps running');
});
test('routine autosaves do not resend the entire world',async()=>{
  const s=await session();s.coop.frame(.1);s.sent.length=0;
  for(let i=0;i<55;i++){s.coop.frame(.1);await drain();}
  const states=s.sent.filter(m=>m.type==='data'&&['snapshot','delta'].includes(m.payload?.kind));
  assert.ok(states.length>20);assert.ok(states.every(m=>m.payload.kind==='delta'));
});
