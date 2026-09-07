import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
let checks=0,now=0;const noop=()=>{},ok=(v,m)=>{checks++;assert.ok(v,m);};
const events={},buttons={},canvas={width:1920,height:1080,addEventListener:(n,f)=>buttons[n]=f,getBoundingClientRect:()=>({left:0,top:0,width:1920,height:1080})};
const scope=vm.createContext({console,Math,Date,performance:{now:()=>now},Uint8Array,Uint16Array,Uint32Array,Float32Array,Uint8ClampedArray,Set,Map,JSON,setTimeout,clearTimeout,
 document:{createElement:()=>({getContext:()=>({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData:noop})})},
 window:{addEventListener:(n,f)=>events[n]=f,matchMedia:()=>({matches:false})},localStorage:{getItem:()=>null,setItem:noop},
 Sfx:new Proxy({vol:{}},{get:(o,k)=>o[k]||noop}),Player3D:{assets:{},update:noop},UI:new Proxy({cursorItem:null},{get:(o,k)=>k in o?o[k]:noop}),
 SpriteAssets:{maps:{props:{}},actorGeometry:(o,p,x,y)=>({left:x-15,right:x+15,top:y-40,bottom:y}),hitTestGeometry:(g,x,y,pad)=>x>=g.left-pad&&x<=g.right+pad&&y>=g.top-pad&&y<=g.bottom+pad}});
for(const f of ['utils','data','data_overrides','sprite_manifest','mapgen','navigation','items','lootfilter','entities'])vm.runInContext(fs.readFileSync(new URL('../js/'+f+'.js',import.meta.url),'utf8'),scope);
const source=fs.readFileSync(new URL('../js/game.js',import.meta.url),'utf8').replace('    init, newGame, loadGame,',
 `    __test:{freshState,heldUpdate,updateHover,tryJump,updateFx,updateTraps,cancelGroundHold,setup(s,c){state=s;canvas=c;running=true;camPos={x:0,y:0};groundHold=null;heldTarget=null;mouse={x:0,y:0,l:false,r:false,shift:false,alt:false};bindInput();},get hold(){return groundHold;}},\n    init, newGame, loadGame,`);
vm.runInContext(source,scope);
const {Game:G,Player,Monster,Minion,TerrainNavigation:N,TerrainSurface:S,U,DATA}=vm.runInContext('({Game,Player,Monster,Minion,TerrainNavigation,TerrainSurface,U,DATA})',scope),api=G.__test;
function fresh(){now=0;const p=new Player('Input contract','vanguard'),s=api.freshState(p,12345),w=40,n=w*w;
 s.map={id:'fields',zone:DATA.ZONES.fields,w,h:w,blocked:new Uint8Array(n),walls:new Uint8Array(n),floor:new Uint8Array(n),elev:new Uint8Array(n),hazard:new Uint8Array(n),props:[],exits:[],spawns:{},explored:new Uint8Array(n)};
 s.time=0;p.x=p.y=20.5;p.command=p.path=p.action=null;api.setup(s,canvas);return s;
}
function pointer(x,y){buttons.mousemove({clientX:U.isoX(x,y),clientY:U.isoY(x,y)});api.updateHover();}
function press(x,y,button=0,shiftKey=false){buttons.mousedown({clientX:U.isoX(x,y),clientY:U.isoY(x,y),button,shiftKey});}
function release(){events.mouseup({button:0});}
function frame(s,ms=1000/60){now+=ms;s.time+=ms/1000;api.updateHover();api.heldUpdate();s.player.update(ms/1000);}
for(const moveOnly of [false,true]){
 let s=fresh(),p=s.player;G.options.leftClickMove=moveOnly;
 press(26.5,20.5);ok(p.command?.type==='move'&&p.path?.length,'quick press did not route');now=149;api.heldUpdate();ok(!api.hold.active,'hold began before 150 ms');release();ok(p.command?.type==='move'&&p.path?.length,'quick release discarded the path');
 s=fresh();p=s.player;press(26.5,20.5);now=150;api.heldUpdate();ok(p.command.type==='steer'&&!p.path&&!p._navGoal,'150 ms hold did not clear the route');
 const find=N.findPath;let searches=0;N.findPath=(...a)=>{searches++;return find(...a);};
 try{
   for(let i=0;i<30;i++)frame(s);ok(p.x>22&&p.y===20.5,'hold did not move toward cursor');
   pointer(p.x,p.y+7);const y=p.y;for(let i=0;i<20;i++)frame(s);ok(p.y>y+1,'hold did not turn');
   const mon=new Monster('risen',p.x+4,p.y);s.monsters=[mon];pointer(mon.x,mon.y-.15);frame(s);ok(p.command.type==='steer','ground gesture became an attack');
   s.monsters=[];s.map.props=[{x:p.x+4,y:p.y,interact:'storage'}];pointer(p.x+4,p.y);frame(s);ok(p.command.type==='steer','ground gesture became an interaction');
   s.ground=[{x:p.x+4,y:p.y,item:{}}];frame(s);ok(p.command.type==='steer','ground gesture became a pickup');
   ok(searches===0,'steering invoked pathfinding');
 }finally{N.findPath=find;}
 release();const stopped={x:p.x,y:p.y};for(let i=0;i<10;i++)frame(s);ok(!p.command&&!p.path&&p.x===stopped.x&&p.y===stopped.y,'release did not stop steering');
 s=fresh();p=s.player;for(let y=0;y<40;y++)s.map.blocked[23+y*40]=s.map.walls[23+y*40]=1;
 press(30.5,26.5);now=150;api.heldUpdate();const find2=N.findPath;N.findPath=()=>{throw Error('blocked steering tried to repath');};
 try{for(let i=0;i<150;i++)frame(s);}finally{N.findPath=find2;}
 ok(p.x<=23-p.radius+.0001&&p.y>23,'wall collision or sliding failed');ok(!p.jumping,'steering automatically hopped');release();
 for(const cancel of [()=>events.blur(),()=>events.keydown({key:'Shift'}),()=>press(27,20.5,2),()=>G.onPlayerDeath(),()=>api.cancelGroundHold()]){
   s=fresh();press(28,20.5);now=150;api.heldUpdate();cancel();ok(!api.hold&&s.player.command?.type!=='steer','input interruption retained steering');
 }
 s=fresh();p=s.player;const mon=new Monster('risen',24.5,20.5);s.monsters=[mon];press(mon.x,mon.y);
 ok(p.command?.type===(moveOnly?'move':'attack'),'enemy press violated move-only setting');release();
 s=fresh();s.map.props=[{x:25.5,y:20.5,interact:'storage'}];press(25.5,20.5);now=500;api.heldUpdate();ok(!api.hold&&s.player.command.type==='interact','object-started hold lost its interaction');release();
 s=fresh();p=s.player;press(28,20.5);now=150;api.heldUpdate();api.tryJump();ok(!!p.jumping,'manual jump did not start');release();
 for(let i=0;i<35;i++)frame(s);ok(!p.jumping&&!p.command&&!p.path&&!p._pendingClick,'released hold replayed after landing');
 s=fresh();p=s.player;press(28,20.5);now=150;api.heldUpdate();api.tryJump();for(let i=0;i<35;i++)frame(s);ok(!p.jumping&&p.command?.type==='steer','held steering did not resume after manual jump');release();
}
// Slows and raised-surface collision use the same local step as path movement.
let s=fresh(),p=s.player;p.slowT=2;p.slowPct=50;const start=p.x;
p.moveToward(.1,4,30.5,20.5,s.map,[]);ok(Math.abs(p.x-start-.2)<1e-8,'direct movement ignored slow');
s=fresh();p=s.player;s.map.surfaceVersion=1;s.map.ramps=[];for(let y=0;y<40;y++)for(let x=23;x<40;x++)s.map.elev[x+y*40]=2;S.rebuild(s.map);
press(30.5,20.5);now=150;api.heldUpdate();for(let i=0;i<120;i++)frame(s);ok(p.x<23&&p.command?.type==='steer'&&!p.jumping,'direct movement crossed a cliff');release();
// Straight steering can use a real ramp in either direction without asking for a route.
for(const reverse of [false,true]){
 s=fresh();p=s.player;s.map.surfaceVersion=1;s.map.ramps=[{x:20,y:20,dx:1,dy:0,width:3,length:4,low:0,high:2}];
 for(let y=0;y<40;y++)for(let x=24;x<40;x++)s.map.elev[x+y*40]=2;S.rebuild(s.map);
 p.x=reverse?25.5:18.5;p.y=20.5;const tx=reverse?18.5:25.5;
 for(let i=0;i<120;i++)p.moveToward(1/60,4,tx,20.5,s.map,[]);
 ok(Math.abs(p.x-tx)<.001&&S.supported(s.map,p.x,p.y,p.radius),'direct steering failed on ramp');
}
// All map hazards leave regular monsters, elites and bosses untouched.
for(const code of Object.keys(DATA.HAZARDS))for(const kind of ['normal','elite','boss']){
 s=fresh();p=s.player;p.x=p.y=35.5;const mon=new Monster('risen',20.5,20.5,{elite:kind==='elite',boss:kind==='boss'});s.monsters=[mon];
 mon.def.speed=0;mon.def.sight=0;mon.wanderT=100;mon.hp=mon.maxHp=10000;s.map.hazard.fill(+code);const xp=p.xp;
 for(let i=0;i<120;i++){s.time+=1/60;mon.update(1/60,p,s.map);}
 ok(mon.hp===10000&&!mon.dead&&!mon.slowT&&!mon.aggro&&!mon.healthBarUntil,'terrain affected '+kind+' on '+code);ok(p.xp===xp&&!s.ground.length,'terrain awarded passive XP or loot');
 mon.applySlow(2,40);mon.takeDamage(20,p,null,'fire');ok(mon.hp<10000&&mon.slowT>0&&mon.healthBarUntil>s.time,'combat damage or slows lost to terrain immunity');
}
// Player and grounded minions still receive terrain effects.
s=fresh();p=s.player;s.map.hazard.fill(DATA.HAZARD_BY_ID.lava);p.hp=p.stats.maxHp;const hp=p.hp;p.tileHazardTick(.1,s.map,true);ok(p.hp<hp,'player became hazard-immune');
const mi=new Minion('wolf',{hp:100,dmg:[1,2],speed:3,atkRate:1,range:1,sprite:'wolf'},p);mi.x=mi.y=20.5;const mhp=mi.hp;mi.tileHazardTick(.1,s.map,false);ok(mi.hp<mhp,'companion became hazard-immune');
// Exercise actual combat-field and trap targeting on hazardous terrain.
for(const kind of ['inferno','glacier','caltrop','miasma']){
 s=fresh();p=s.player;const mon=new Monster('risen',22.5,20.5);s.monsters=[mon];mon.hp=mon.maxHp=10000;s.map.hazard.fill(DATA.HAZARD_BY_ID.bog);
 s.fx=[{type:'groundfield',fieldKind:kind,x:mon.x,y:mon.y,radius:3,lo:10,hi:10,ttl:5,tickT:0,tickEvery:.5,owner:p}];api.updateFx(.1);
 ok(mon.hp<10000&&mon.healthBarUntil>s.time,'player ground spell stopped damaging enemies: '+kind);
 if(kind!=='inferno')ok(mon.slowT>0,'combat ground slow stopped working: '+kind);
}
s=fresh();p=s.player;const trapped=new Monster('risen',22.5,20.5);s.monsters=[trapped];trapped.hp=trapped.maxHp=10000;
s.traps=[{x:22.5,y:20.5,kind:'frost',radius:2,trigger:2,ttl:5,armT:0,dmgLo:10,dmgHi:10,mult:1,slowPct:50,slowDur:2}];api.updateTraps(.1);
ok(trapped.hp<10000&&trapped.slowT>0&&trapped.healthBarUntil>s.time,'player trap stopped damaging/slowing enemies');
for(const effect of ['poisonDot','scorch','plague']){
 s=fresh();p=s.player;p.x=p.y=35.5;const mon=new Monster('risen',20.5,20.5);s.monsters=[mon];mon.hp=mon.maxHp=10000;mon.def.speed=mon.def.sight=0;mon.wanderT=100;
 mon[effect]=effect==='poisonDot'?{dps:10,t:10}:effect==='scorch'?{dps:10,until:10}:{tick:10,tickT:0,until:10,spreadCd:10};
 s.time=1;mon.update(.1,p,s.map);ok(mon.healthBarUntil===4,'DoT failed to reveal health bar: '+effect);
 s.time=2;if(effect==='plague')mon.plague.tickT=0;mon.update(.1,p,s.map);ok(mon.healthBarUntil===5,'DoT failed to refresh health bar');
 mon[effect]=null;s.time=6;mon.update(.1,p,s.map);ok(mon.healthBarUntil<s.time&&mon.hp<mon.maxHp,'injured enemy extended health timer without damage');
 mon.loseHealth(0);ok(mon.healthBarUntil===5,'zero damage extended visibility');
}
console.log(`PASS ${checks} gameplay checks: tap/hold input, gesture ownership, collision, interruption, jumping, hazards and damage visibility timers.`);
