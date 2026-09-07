import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const sounds=[],store=new Map();let checks=0,musicStops=0,deathDialogs=0;
const ok=(v,m)=>{assert.ok(v,m);checks++;};
const scope=vm.createContext({console,Math,Date,performance,Uint8Array,Uint16Array,Uint32Array,Float32Array,Uint8ClampedArray,Set,Map,JSON,setTimeout,clearTimeout,
 window:{addEventListener(){}},document:{createElement:()=>({getContext:()=>({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){}})})},
 localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},
 Sfx:new Proxy({vol:{},play:n=>sounds.push(n),stopMusic:()=>musicStops++},{get:(t,k)=>t[k]||(()=>{})}),Player3D:{assets:{}},UI:new Proxy({showDeath:()=>deathDialogs++},{get:(t,k)=>t[k]||(()=>{})})});
for(const name of ['utils','data','data_overrides','sprite_manifest','mapgen','navigation','items','entities'])vm.runInContext(fs.readFileSync(new URL('../js/'+name+'.js',import.meta.url),'utf8'),scope);
const source=fs.readFileSync(new URL('../js/game.js',import.meta.url),'utf8').replace('    init, newGame, loadGame,','    __deathTest:{freshState,setState:s=>state=s},\n    init, newGame, loadGame,');
vm.runInContext(source,scope);
const {Game,Player,Minion,Monster,MapGen,DATA}=vm.runInContext('({Game,Player,Minion,Monster,MapGen,DATA})',scope);
function fresh(classId='emberwitch',hardcore=false){
 const p=new Player('Death audio test',classId),s=Game.__deathTest.freshState(p,123);s.map=MapGen.generate('fields',123);s.monsters=[];s.minions=[];s.npcs=[];
 Game.__deathTest.setState(s);p.x=s.map.spawns.default.x;p.y=s.map.spawns.default.y;p.hardcore=hardcore;p.gold=100;sounds.length=0;musicStops=deathDialogs=0;return s;
}
function summon(s,beast=false){const m=new Minion(beast?'wolf':'skel_warrior',{hp:30,dmg:[2,3],speed:3,atkRate:1,range:1,sprite:beast?'wolf':'skeleton'},s.player);s.minions.push(m);return m;}
for(const hardcore of [false,true])for(const count of [0,1,12]){
 const s=fresh(count?'gravebinder':'emberwitch',hardcore),p=s.player;
 for(let i=0;i<count;i++)summon(s,i%2===0);
 p.takeDamage(1e6,null,'fire');
 ok(p.dead&&p.hp===0,'fatal hit did not kill the player');ok(p.deaths===1,'death counter incorrect');
 ok(sounds.join(',')==='death','fatal hit layered unwanted sounds: '+sounds.join(','));
 ok(musicStops===1,'death did not stop music exactly once');
 ok(deathDialogs===(hardcore?0:1),'normal death did not show the town-return dialog');
 if(hardcore)ok(await Game.returnToTown()===false,'hardcore hero can revive through the town-return action');
 ok(s.minions.every(m=>m.dead&&m.action.state==='death'&&m.deathT>0),'silent companions lost their death animations');
 const n=sounds.length;p.takeDamage(1e6,null);Game.onPlayerDeath();ok(sounds.length===n,'dead hero replayed death audio');
}
let s=fresh();s.player.takeDamage(1,null,'fire');ok(!s.player.dead&&sounds.join(',')==='playerHurt','surviving hit lost its feedback');
for(const beast of [false,true]){s=fresh();const m=summon(s,beast);m.die();ok(sounds.join(',')===(beast?'die_flesh':'die_bone'),'ordinary minion death became silent');m.die();ok(sounds.length===1,'minion death replayed its sound');}
// Keep the actual enemy AI running through the death delay. A corpse must not
// clear aggro and immediately reacquire it (and replay its voice) every frame.
for(const id of ['risen','grave_hound','cult_acolyte','tomb_husk','fallen_blade','crypt_widow','morthul']){
 s=fresh();const p=s.player,m=s.map;
 m.walls.fill(0);m.blocked.fill(0);m.elev.fill(0);m.hazard.fill(0);m.floor.fill(0);
 p.x=p.y=20.5;
 const mon=new Monster(id,22.5,20.5,{});s.monsters=[mon];
 const family=mon.def.sounds;
 // Hold each real enemy inside clear LOS, with attacks on cooldown.
 mon.def.speed=0;mon.def.sight=10;mon.wanderT=100;mon.attackCd=100;
 mon.update(1/60,p,m);ok(sounds.join(',')==='vox_'+family,family+': living hero did not trigger one alert');
 p.takeDamage(1e6,null,'fire');sounds.length=0;
 for(let i=0;i<210;i++){s.time+=1/60;mon.update(1/60,p,m);}
 ok(sounds.length===0,family+': dead hero retriggered '+sounds.length+' sounds over 210 frames: '+sounds.slice(0,5));
 ok(!mon.aggro,family+': enemy re-engaged the corpse');
 p.dead=false;p.hp=p.stats.maxHp;sounds.length=0;mon.update(1/60,p,m);
 ok(mon.aggro&&sounds.join(',')==='vox_'+family,family+': enemy did not notice the revived hero');
 sounds.length=0;for(let i=0;i<60;i++){s.time+=1/60;mon.update(1/60,p,m);}
 ok(sounds.length===0,family+': living target replayed its initial alert');
}
console.log(`PASS ${checks} player death checks: fatal-hit audio, companion collapse, enemy AI throughout death and revival, repeat guards, hardcore and ordinary damage feedback.`);
