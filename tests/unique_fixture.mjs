import fs from 'node:fs';
import vm from 'node:vm';
const store=new Map(),math=Object.create(Math);math.random=()=>.5;
const noop=()=>{};
export const ctx=vm.createContext({console,Math:math,Date,performance,Uint8Array,Uint16Array,Uint32Array,Float32Array,Uint8ClampedArray,Set,Map,JSON,setTimeout,clearTimeout,
 window:{addEventListener:noop,matchMedia:()=>({matches:true})},document:{createElement:()=>({getContext:()=>({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData:noop})})},
 localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},Sfx:new Proxy({vol:{}},{get:(t,k)=>t[k]||noop}),
 Player3D:{assets:{},projectileOrigin:()=>null},UI:new Proxy({},{get:()=>noop})});
for(const f of ['utils','data','unique_powers','data_overrides','skill_perks','sprite_manifest','mapgen','navigation','prop_interactions','items','management','entities','character_sheet'])vm.runInContext(fs.readFileSync(new URL('../js/'+f+'.js',import.meta.url),'utf8'),ctx,{filename:f});
let source=fs.readFileSync(new URL('../js/game.js',import.meta.url),'utf8');
source=source.replace('    init, newGame, loadGame,',`    __uniqueTest:{freshState,triggerEvent,updateFx,updateTraps,setState:s=>{state=s;delayed=[];saveSlotKey='unique-test';},flush:seconds=>{let n=0;while(delayed.length&&n++<1000){delayed.sort((a,b)=>a.t-b.t);if(delayed[0].t>seconds)break;const job=delayed.shift();state.time=job.t;job.fn();}}},
    init, newGame, loadGame,`);
vm.runInContext(source,ctx,{filename:'game'});
export const {DATA:D,Player,Monster,Minion,Projectile,Game:G,UniquePowers:Q,Items:I,SkillPerks:K,CharacterSheet:CS,MapGen:M,U,ForgeRecipes:F}=vm.runInContext('({DATA,Player,Monster,Minion,Projectile,Game,UniquePowers,Items,SkillPerks,CharacterSheet,MapGen,U,ForgeRecipes})',ctx);
M.walkable=()=>true;
export const plain=v=>JSON.parse(JSON.stringify(v));
export function fresh(classId='vanguard') {
 const p=new Player('Unique test',classId);p.lvl=100;p.x=p.y=10;
 const state=G.__uniqueTest.freshState(p,123),w=40;
 state.map={id:'test',w,h:w,tiles:new Uint8Array(w*w),blocked:new Uint8Array(w*w),walls:new Uint8Array(w*w),floor:new Uint8Array(w*w),elev:new Uint8Array(w*w),hazard:new Uint8Array(w*w),props:[],exits:[],zone:{lvl:60}};
 state.monsters=[];state.minions=[];state.quests={};state.fx=[];state.projectiles=[];state.traps=[];state.time=0;
 G.__uniqueTest.setState(state);
 for(const sk of Object.values(D.SKILLS))if(sk.cls===classId)p.skills[sk.id]=10;
 p.computeStats();p.hp=p.stats.maxHp*.5;p.mana=p.stats.maxMana*.5;
 const enemyId=Object.keys(D.ENEMIES).find(id=>!D.ENEMIES[id].boss);
 for(const [x,y]of [[11,10],[12,10],[13,10],[12,12]]) {
  const m=new Monster(enemyId,x,y);m.hp=m.maxHp=100000;m.def={...m.def,armor:0,resAll:0};m.aggro=true;state.monsters.push(m);
 }
 return {p,state,target:state.monsters[0]};
}
export function item(id) {
 const u=D.UNIQUES.find(d=>d.id===id),c=D.UNIQUE_CHARMS.find(d=>d.id===id),j=D.UNIQUE_JEWELS.find(d=>d.id===id);
 const it=u?I.makeUnique(u):c?I.makeUniqueCharm(c):j?I.makeUniqueJewel(j):I.makeGlyph(id);it.identified=true;return it;
}
export function equip(p,id,side='wpn') {
 const it=item(id);
 if(it.kind==='charm')I.autoPlace(p.inv,it);
 else if(it.kind==='glyph'||it.kind==='jewel'){
  const host=I.fromBase(side==='wpn'?'handaxe':'quiltvest');host.sockets=[null];I.socketGlyph(host,it);p.equip[host.slot]=host;
 }else p.equip[it.slot==='ring'?'ring1':it.slot]=it;
 p.computeStats();return it;
}
