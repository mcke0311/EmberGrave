import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
let checks=0,now=0,blocked=false;
const noop=()=>{}, ok=(v,m)=>{checks++;assert.ok(v,m);};
const canvas={width:1920,height:1080,addEventListener:noop,getBoundingClientRect:()=>({left:0,top:0,width:1920,height:1080})};
const scope=vm.createContext({console,Math,Date,performance:{now:()=>now},Uint8Array,Uint16Array,Uint32Array,Float32Array,Uint8ClampedArray,Set,Map,JSON,setTimeout,clearTimeout,
 document:{createElement:()=>({getContext:()=>({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData:noop})})},
 window:{addEventListener:noop,matchMedia:()=>({matches:false})},localStorage:{getItem:()=>null,setItem:noop},
 Sfx:new Proxy({vol:{}},{get:(o,k)=>o[k]||noop}),Player3D:{assets:{},update:noop},
 UI:new Proxy({cursorItem:null,anyOpen:()=>blocked,escOpen:()=>false,cinematicActive:()=>false},{get:(o,k)=>k in o?o[k]:noop}),
 SpriteAssets:{maps:{props:{}},actorGeometry:(o,p,x,y)=>({left:x-15,right:x+15,top:y-40,bottom:y}),hitTestGeometry:(g,x,y,pad)=>x>=g.left-pad&&x<=g.right+pad&&y>=g.top-pad&&y<=g.bottom+pad}});
for(const f of ['utils','data','data_overrides','sprite_manifest','mapgen','navigation','prop_interactions','items','lootfilter','entities'])vm.runInContext(fs.readFileSync(new URL('../js/'+f+'.js',import.meta.url),'utf8'),scope);
const source=fs.readFileSync(new URL('../js/game.js',import.meta.url),'utf8').replace('    init, newGame, loadGame,',
 `    __test:{freshState,heldUpdate,setup(s,c){resetTouch();state=s;canvas=c;running=true;camPos={x:-500,y:0};groundHold=null;heldTarget=null;mouse={x:0,y:0,l:false,r:false,shift:false,alt:false};}},\n    init, newGame, loadGame,`);
vm.runInContext(source,scope);
const {Game:G,Player,Monster,U,DATA,TerrainNavigation:N,TerrainSurface:S}=vm.runInContext('({Game,Player,Monster,U,DATA,TerrainNavigation,TerrainSurface})',scope),api=G.__test;
function fresh(){
 blocked=false;now=0;const p=new Player('Touch contract','vanguard'),s=api.freshState(p,12345),w=40,n=w*w;
 s.map={id:'fields',zone:DATA.ZONES.fields,w,h:w,blocked:new Uint8Array(n),walls:new Uint8Array(n),floor:new Uint8Array(n),elev:new Uint8Array(n),hazard:new Uint8Array(n),props:[],exits:[],spawns:{},explored:new Uint8Array(n)};
 s.time=0;p.x=p.y=20.5;p.command=p.path=p.action=null;api.setup(s,canvas);return s;
}
function frame(s,n=1){for(let i=0;i<n;i++){now+=1000/60;s.time+=1/60;api.heldUpdate();s.player.update(1/60);}}
// All eight screen directions and release; diagonal speed must not be faster.
let travel=[];
for(const [x,y] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){
 const s=fresh(),p=s.player,ox=p.x,oy=p.y;G.touchMove(x*40,y*40);frame(s,30);
 const sx=U.isoX(p.x-ox,p.y-oy),sy=U.isoY(p.x-ox,p.y-oy);
 ok(Math.abs(sx*y-sy*x)<1e-7&&sx*x+sy*y>0,'stick direction differs from screen direction');
 travel.push(U.dist(ox,oy,p.x,p.y));G.touchMove(0,0);const end=[p.x,p.y];frame(s,30);
 ok(p.x===end[0]&&p.y===end[1]&&!p.command,'released movement continued');
}
ok(Math.max(...travel)-Math.min(...travel)<1e-7,'diagonal movement gained speed');
let s=fresh(),p=s.player;
const find=N.findPath;N.findPath=()=>{throw Error('thumbstick used pathfinding');};
try{G.touchMove(40,20);frame(s,15);G.resetTouch();}finally{N.findPath=find;}
ok(p.x>20.5,'movement did not use direct collision steering');
s=fresh();p=s.player;p.slowT=10;p.slowPct=50;G.touchMove(40,20);frame(s,30);
ok(Math.abs(p.x-20.5-travel[0]/2)<1e-6,'stick bypassed slow effects');
s=fresh();p=s.player;for(let y=0;y<40;y++)s.map.blocked[23+y*40]=s.map.walls[23+y*40]=1;
G.touchMove(40,20);frame(s,150);ok(p.x<=23-p.radius+.0001,'stick crossed a wall');
s=fresh();p=s.player;s.map.surfaceVersion=1;s.map.ramps=[];for(let y=0;y<40;y++)for(let x=23;x<40;x++)s.map.elev[x+y*40]=2;S.rebuild(s.map);
G.touchMove(40,20);frame(s,150);ok(p.x<23&&!p.jumping,'stick crossed a cliff or auto-jumped');
s=fresh();p=s.player;G.touchMove(40,20);G.touchAction('jump');ok(!!p.jumping&&p.jumping.tx>p.x,'jump did not follow stick');G.touchMove(0,0);frame(s,40);
ok(!p.jumping&&!p.command&&!p._pendingClick,'jump replayed released movement');
s=fresh();p=s.player;p.visAng=0;G.touchAction('jump');
ok(p.jumping.tx>p.x&&p.jumping.ty<p.y&&Math.abs(U.isoY(p.jumping.tx-p.x,p.jumping.ty-p.y))<1e-8,'standing jump did not follow screen facing');
s=fresh();p=s.player;G.touchTap(U.isoX(25.5,20.5)+500,U.isoY(25.5,20.5));G.touchMove(0,0);
ok(!p.command&&!p.path,'thumbstick center did not take over a world-tap route');
for(const cancel of [()=>G.resetTouch(),()=>{blocked=true;api.heldUpdate();},()=>{p.dead=true;api.heldUpdate();}]){
 s=fresh();p=s.player;G.touchMove(40,20);frame(s,4);cancel();blocked=false;p.dead=false;const x=p.x;frame(s,20);
 ok(p.x===x&&!p.command,'interruption retained movement');
}
// Targeting uses actual hero skill ranges, excludes hidden layers, walls and dead enemies.
s=fresh();p=s.player;const hits=[];p.performSkill=(id,target,point)=>{hits.push({id,target,point});return true;};
const near=new Monster('risen',p.x+.8,p.y),far=new Monster('risen',p.x+4,p.y),dead=new Monster('risen',p.x+.2,p.y);dead.dead=true;
s.monsters=[far,dead,near];G.touchSkill('L',true);G.touchSkill('L',false);
ok(hits.length===1&&hits[0].target===near,'quick attack did not hit the nearest living enemy once');
frame(s,30);ok(hits.length===1,'released attack kept repeating');
G.touchMove(40,20);G.touchSkill('L',true);G.touchMove(0,0);s.time+=.3;api.heldUpdate();
ok(hits.length===3,'releasing the stick also released the other finger');
G.touchSkill('L',false);G.touchMove(40,20);G.touchSkill('R',true);G.touchSkill('R',false);frame(s,10);
ok(p.x>20.5,'releasing a skill stopped the thumbstick');G.resetTouch();
hits.length=0;s.monsters=[far];G.touchSkill('L',true);G.touchSkill('L',false);ok(hits.length===0,'melee hit outside reach');
near.surfaceId=1;s.monsters=[near];G.touchSkill('L',true);G.touchSkill('L',false);ok(hits.length===0,'targeted another terrain layer');
near.surfaceId=0;near.x=p.x+1;near.y=p.y;s.map.blocked[Math.floor(near.x)+Math.floor(near.y)*40]=1;
G.touchSkill('L',true);G.touchSkill('L',false);ok(hits.length===0,'targeted through a wall');
s.map.blocked.fill(0);s.monsters=[near];blocked=true;G.touchSkill('L',true);ok(hits.length===0,'panel allowed an attack');blocked=false;
p.skillCd.basic=s.time+5;G.touchSkill('L',true);ok(hits.length===0,'cooldown allowed an attack');p.skillCd.basic=0;
// A held buff/summon only activates once, even if it has no action animation.
const buff=Object.values(DATA.SKILLS).find(sk=>sk.type==='buff');p.skills[buff.id]=1;p.skillR=buff.id;p.mana=1e6;
G.touchSkill('R',true);const count=hits.length;for(let i=0;i<20;i++){s.time+=.3;api.heldUpdate();}
ok(count===1&&hits.length===count,'single-use skill repeated while held');
G.touchSkill('R',false);G.touchSkill('R',true);ok(hits.length===count+1,'new press could not reactivate single-use skill');G.resetTouch();
// Charge release and cancellation are deliberately different operations.
let released=0;p.releaseDraw=()=>{released++;p.drawing=null;};p.skillR='basic';G.touchSkill('R',true);p.drawing={touch:true};G.touchSkill('R',false);
ok(released===1&&!p.drawing,'charged shot failed to release');G.touchSkill('R',true);p.drawing={touch:true};G.resetTouch();
ok(released===1&&!p.drawing,'cancel fired a charged shot');
s=fresh();p=s.player;G.touchTap(U.isoX(25.5,20.5)+500,U.isoY(25.5,20.5));
ok(p.command?.type==='move'&&p.path?.length,'world tap did not create a path');frame(s,30);ok(p.x>20.5,'world tap path did not execute');
console.log(`PASS ${checks} touch gameplay checks: screen direction, speed, collision, jumping, targeting, independent input and cancellation.`);
