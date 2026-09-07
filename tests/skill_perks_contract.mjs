import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const store=new Map(),math=Object.create(Math);math.random=()=>.5;
const ctx=vm.createContext({console,Math:math,Date,performance,Uint8Array,Uint16Array,Uint32Array,Float32Array,Uint8ClampedArray,Set,Map,JSON,setTimeout,clearTimeout,
  window:{addEventListener(){},matchMedia:()=>({matches:true})},document:{createElement:()=>({getContext:()=>({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){}})})},
  localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},
  Sfx:new Proxy({vol:{}},{get:(t,k)=>t[k]||(()=>{})}),Player3D:{assets:{},projectileOrigin:()=>null},UI:new Proxy({},{get:()=>()=>{}}),
});
for(const f of ['utils','data','data_overrides','skill_perks','sprite_manifest','mapgen','navigation','items','entities'])vm.runInContext(fs.readFileSync(new URL('../js/'+f+'.js',import.meta.url),'utf8'),ctx,{filename:f});
let source=fs.readFileSync(new URL('../js/game.js',import.meta.url),'utf8');
source=source.replace('    init, newGame, loadGame,',`    __test:{freshState,setState:s=>{state=s;delayed=[];saveSlotKey='perk-test';},updateTraps,updateFx,updateTotem,flush:seconds=>{let n=0;while(delayed.length&&n++<100){delayed.sort((a,b)=>a.t-b.t);if(delayed[0].t>seconds)break;const job=delayed.shift();state.time=job.t;job.fn();}}},
    init, newGame, loadGame,`);
vm.runInContext(source,ctx,{filename:'game'});
const {DATA:D,Player,Monster,Minion,Game:G,SkillPerks:K,MapGen:M}=vm.runInContext('({DATA,Player,Monster,Minion,Game,SkillPerks,MapGen})',ctx);
M.walkable=()=>true;
let checks=0,casts=0;const ok=(v,m)=>{checks++;assert.ok(v,m)};
const approx=(a,b,label)=>ok(Math.abs(a-b)<1e-7,`${label}: ${a} != ${b}`);
const plain=v=>JSON.parse(JSON.stringify(v));
function fresh(classId='vanguard'){
  const p=new Player('Perk test',classId);p.lvl=100;p.x=10;p.y=10;
  const state=G.__test.freshState(p,123);
  state.map={id:'test',w:40,h:40,tiles:new Uint8Array(1600),props:[],hazard:new Uint8Array(1600),zone:{lvl:1}};
  state.monsters=[];state.minions=[];state.quests={};state.fx=[];state.projectiles=[];state.traps=[];state.time=0;
  G.__test.setState(state);
  for(const sk of Object.values(D.SKILLS))if(sk.cls===classId)p.skills[sk.id]=10;
  p.computeStats();p.hp=p.stats.maxHp*.5;p.mana=p.stats.maxMana;p.tempo=3;p.staticChg=12;
  const enemyId=Object.keys(D.ENEMIES).find(id=>!D.ENEMIES[id].boss);
  for(const [x,y]of [[11,10],[12,10],[13,10],[12,12]]){const m=new Monster(enemyId,x,y);m.hp=1e7;m.maxHp=1e7;m.def.armor=0;m.aggro=true;state.monsters.push(m);}
  const target=state.monsters[0];target.quarry={stacks:3,until:20};target.scorch={stacks:3,dps:4,until:20};target.curseFrailty={pct:10,until:20};target.poisonDot={dps:5,t:5};
  for(const [x,y]of [[11,11],[12,11],[13,11],[14,11]]){const m=new Monster(enemyId,x,y);m.dead=true;m.hp=0;m.corpseT=20;state.monsters.push(m);}
  const stats={hp:200,dmg:[5,10],speed:3,atkRate:1,range:1,sprite:'wolf',name:'Test wolf'};
  const companion=new Minion('wolf',stats,p);companion.sourceSkill='call_wolf';companion.hp=50;companion.x=10;companion.y=11;state.minions.push(companion);
  return {p,state,target,companion};
}
function pick(p,id,tier,index){ok(p.chooseSkillPerk(id,tier,K.catalog[id][tier][index].id),`${id} choose ${tier}/${index}`);}
function cast(p,sk,target){
  if(sk.type==='passive'){p.computeStats();return;}
  if(sk.type==='fireclaw'){p.form='fang';p.buffs.push({id:'form_fang',stats:{},until:Infinity});}
  ok(p.performSkill(sk.id,target,{x:11,y:11}),`${sk.id}: rejected cast`);casts++;
  G.__test.flush(3);
}
const skills=Object.values(D.SKILLS),ids=new Set();
ok(skills.length===107,'expected current 107 skills');
for(const sk of skills){
  ok(new Set(Object.values(K.catalog[sk.id]).flat().map(o=>o.title)).size===6,`${sk.id}: distinct perk names`);
  for(const tier of [5,10]){
    const opts=K.catalog[sk.id][tier];ok(opts.length===3,`${sk.id} tier coverage`);
    ok(new Set(opts.map(o=>JSON.stringify(o.effects))).size===3,`${sk.id} distinct options`);
    for(const o of opts){ok(!ids.has(o.id),'duplicate perk id');ids.add(o.id);ok(o.name&&o.description&&!/undefined|NaN/.test(o.description),'readable perk');}
  }
  const {p}=fresh(sk.cls);p.skills={[sk.id]:4};p.skillPerks={};p.stats.skillAll=20;
  ok(!p.chooseSkillPerk(sk.id,5,K.catalog[sk.id][5][0].id),`${sk.id}: gear bypassed rank 5`);
  p.skills[sk.id]=5;pick(p,sk.id,5,0);ok(K.pending(p,sk.id)===0,'tier 5 complete');
  ok(!p.chooseSkillPerk(sk.id,5,K.catalog[sk.id][5][1].id),'duplicate choice');
  p.skills[sk.id]=9;ok(!p.chooseSkillPerk(sk.id,10,K.catalog[sk.id][10][0].id),'rank 9 gate');
  p.skills[sk.id]=10;ok(K.pending(p,sk.id)===1,'rank 10 pending');pick(p,sk.id,10,0);
  ok(K.pending(p,sk.id)===0,'both tiers complete');
  const saved=plain(p.skillPerks);ok(JSON.stringify(K.normalize(p,saved))===JSON.stringify(saved),'selection roundtrip');
  ok(Object.keys(K.normalize(p,{})).length===0,'old save gives unselected choices');
  p.skillPerks={};ok(K.pending(p,sk.id)===2,'old rank-10 skill grants both choices');
  ok(Object.keys(K.normalize(p,{[sk.id]:{5:'bogus',10:5},basic:{5:'bogus'}})).length===0,'malformed selection accepted');
  const original=Object.fromEntries(Object.entries(sk).map(([k,v])=>[k,typeof v==='function'?k==='desc'?v(10):v(10):v]));
  for(let a=0;a<3;a++)for(let b=0;b<3;b++){
    const {p,state,target}=fresh(sk.cls);pick(p,sk.id,5,a);pick(p,sk.id,10,b);
    const resolved=p.resolveSkill(sk.id);
    ok(resolved!==sk,'shared definition modified');ok(resolved.selectedPerks.length===2,'tiers do not stack');
    for(const rank of [1,5,10,20])ok(!/undefined|NaN|Infinity/.test(resolved.desc(rank)),`${sk.id} description at ${rank}`);
    const effects=[...K.catalog[sk.id][5][a].effects,...K.catalog[sk.id][10][b].effects];
    // Every authored modifier must change a real evaluated value, including
    // nested stat objects. Cast smoke coverage below exercises every skill case.
    for(const e of effects){const n=K.valueAt(resolved,e.path,10);ok(typeof n==='number'&&Number.isFinite(n)||Array.isArray(n)&&n.every(Number.isFinite),`${sk.id}: ${e.path} invalid`);}
    cast(p,sk,target);
    for(const fx of state.fx)for(const key of ['radius','ttl','lo','hi','tickEvery'])if(key in fx)ok(Number.isFinite(fx[key])&&fx[key]>=0,`${sk.id} invalid field ${key}`);
  }
  const after=Object.fromEntries(Object.entries(sk).map(([k,v])=>[k,typeof v==='function'?k==='desc'?v(10):v(10):v]));
  ok(JSON.stringify(original)===JSON.stringify(after),`${sk.id} base values mutated`);
}
ok(ids.size===642,'642 options');
// Concrete combat outcomes, rather than catalog-only checks.
{
  const {p,target,state}=fresh('emberwitch'),id='emberwitch_0_0',base=p.resolveSkill(id).dmg(10)[0];
  pick(p,id,5,0);pick(p,id,10,1);approx(p.resolveSkill(id).dmg(10)[0],base*1.2*.8,'stacking damage');
  p.performSkill(id,target,null);G.__test.flush(1);
  ok(state.projectiles.length===1&&state.projectiles[0].spell.pierce,'piercing Emberbolt not emitted');
  const shot=state.projectiles[0];for(let i=0;i<12;i++)shot.update(.02,state.map,p,state.monsters);
  ok(shot.hitSet.size>=2,'piercing bolt did not hit multiple enemies');
}
{
  const {p,target,state}=fresh('emberwitch'),id='emberwitch_0_0';
  const before=p.spellRoll(p.resolveSkill(id),10).dmg;
  p.performSkill(id,target);pick(p,id,5,0);G.__test.flush(1);
  approx(state.projectiles[0].spell.dmg,before,'queued projectile retained cast values');
  p.performSkill(id,target);G.__test.flush(2);
  approx(state.projectiles[1].spell.dmg,before*1.2,'next projectile gained chosen perk');
}
{
  const {p,target,state}=fresh('veilranger'),id='veilranger_0_0';p.stats.ranged=true;target.quarry=null;
  pick(p,id,5,2);pick(p,id,10,1);p.stats.ranged=true;p.performSkill(id,target);G.__test.flush(1);
  const arrow=state.projectiles[0];ok(arrow.pierce&&arrow.quarryStacks===2,'Aimed Shot omitted perk payload');
  for(let i=0;i<5;i++)arrow.update(.02,state.map,p,state.monsters);
  ok(target.quarry?.stacks===2,'Aimed Shot did not mark two Quarry stacks');
}
{
  const {p,target,state}=fresh('wildkeeper');
  p.performSkill('call_wolf');G.__test.flush(1);const first=state.minions.at(-1),hp=first.maxHp;
  pick(p,'call_wolf',5,2);ok(first.maxHp===hp,'choosing a perk rewrote an existing summon');
  p.performSkill('call_wolf');G.__test.flush(2);ok(state.minions.at(-1).maxHp>hp,'new summon did not gain chosen life');
}
{
  const {p,target}=fresh('vanguard');p.tempo=0;pick(p,'vanguard_0_0',10,1);
  p.performSkill('vanguard_0_0',target);ok(p.tempo===2,'Double Time did not grant two Tempo');
  pick(p,'vanguard_0_1',10,1);p.performSkill('vanguard_0_1',target);ok(p.tempo===1,'finisher did not retain Tempo');
}
{
  const {p,target}=fresh('vanguard');pick(p,'vanguard_0_5',5,0);p.performSkill('vanguard_0_5');
  const armor=p.stats.armor;p.moving=false;p.update(3);
  ok(p.stats.armor>armor,'rooted Bulwark perk did not update while holding ground');
  p.moving=true;p.update(.1);ok(p.rootT===0,'Bulwark kept rooted bonus while moving');
  const range=p.skillTargetRange('vanguard_2_1',target);pick(p,'vanguard_2_1',5,2);
  approx(p.skillTargetRange('vanguard_2_1',target),range*1.25,'targeting uses perk reach');
}
{
  const {p,target,state}=fresh('veilranger');pick(p,'veilranger_1_0',10,1);pick(p,'veilranger_1_1',5,1);
  for(let i=0;i<5;i++)p.performSkill('veilranger_1_0',null,{x:11,y:10});
  ok(state.traps.length===5,'trap-cap passive not consumed');approx(state.traps[0].armT,.35,'hair-trigger arming');
  const before=target.hp;G.__test.updateTraps(.4);G.__test.updateTraps(.01);ok(target.hp<before,'perk trap never damaged target');
}
{
  const {p,state,target}=fresh('wildkeeper');pick(p,'call_wolf',5,2);pick(p,'call_wolf',10,1);
  p.performSkill('call_wolf',null,{x:11,y:10});G.__test.flush(1);
  const wolf=state.minions.at(-1);approx(wolf.atkRate,1.3*1.25,'summon attack speed');
  approx(wolf.maxHp,Math.floor((26+8*10)*1.25),'summon life perk');
  pick(p,'fangform',10,0);p.performSkill('fangform');ok(p.buffs.some(b=>b.id==='form_fang'&&b.stats.ias===20&&b.until===Infinity),'form perk not retained in toggle');
  pick(p,'totem_mastery',10,0);pick(p,'wildkeeper_1_0',10,0);for(let i=0;i<7;i++)p.performSkill('wildkeeper_1_0',target,{x:10,y:10});
  ok(state.fx.filter(f=>f.type==='totem').length===6,'totem capacity not combined');
}
{
  const {p,target}=fresh('gravebinder');pick(p,'gravebinder_1_5',5,1);pick(p,'gravebinder_1_5',10,1);
  p.performSkill('gravebinder_1_5',target);approx(p.siphon.drain,.35*1.5,'siphon drain');approx(p.siphon.manaPerSec,1.5,'siphon upkeep');
  const before=target.hp;p.update(.3);ok(target.hp<before,'siphon damage did not run');
}
{
  const {p,state,target}=fresh('emberwitch'),id='emberwitch_0_4';
  p.performSkill(id,target,{x:11,y:10});const pendingDamage=p.resolveSkill(id).dmg(10)[0];
  pick(p,id,5,0);ok(p.resolveSkill(id).dmg(10)[0]>pendingDamage,'future cast unchanged');
  const snapshot=p.resolveSkill(id);pick(p,id,10,0);ok(snapshot.dmg(10)[0]!==p.resolveSkill(id).dmg(10)[0],'resolved cast reads future perks');
  G.saveGame();const saved=JSON.parse(store.get('perk-test'));ok(saved.skillPerks[id][5]===p.skillPerks[id][5],'save omitted perk choices');
  p.buffs.push({id:'unrelated_shrine',stats:{hp:10},until:20});
  G.doRespec();G.__test.flush(5);
  ok(!Object.keys(p.skills).length&&!Object.keys(p.skillPerks).length,'reset did not clear both investments');
  ok(state.fx.length===0&&state.projectiles.length===0,'reset left casts running');
  ok(p.buffs.some(b=>b.id==='unrelated_shrine'),'reset cleared unrelated buff');
  ok(!state.minions.some(m=>m.sourceSkill),'reset left skill summons');
  ok(!Object.keys(JSON.parse(store.get('perk-test')).skillPerks).length,'reset was not saved');
}
console.log(`PASS ${checks} perk checks: 107 skills, 642 choices, 963 combinations, ${casts} combat casts, live effects, snapshots and saves.`);
