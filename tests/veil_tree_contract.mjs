import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const store=new Map(),math=Object.create(Math);math.random=()=>.5;
const ctx=vm.createContext({console,Math:math,Date,performance,Uint8Array,Uint16Array,Uint32Array,Float32Array,Uint8ClampedArray,Set,Map,JSON,setTimeout,clearTimeout,
  window:{addEventListener(){},matchMedia:()=>({matches:true})},document:{createElement:()=>({getContext:()=>({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){}})})},
  localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},
  Sfx:new Proxy({vol:{}},{get:(t,k)=>t[k]||(()=>{})}),Player3D:{assets:{},projectileOrigin:()=>null},UI:new Proxy({},{get:()=>()=>{}}),
});
for(const f of ['utils','data','unique_powers','data_overrides','boss_encounters','act2_enemy_combat','enemy_skills','skill_perks','sprite_manifest','mapgen','navigation','items','entities','character_sheet','skill_icons'])vm.runInContext(fs.readFileSync(new URL('../js/'+f+'.js',import.meta.url),'utf8'),ctx,{filename:f});
let source=fs.readFileSync(new URL('../js/game.js',import.meta.url),'utf8');
source=source.replace('    init, newGame, loadGame,',`    __test:{freshState,setState:s=>{state=s;delayed=[];saveSlotKey='perk-test';},updateTraps,updateFx,updateTotem,updateLayerEffects,repeatSkill,flush:seconds=>{let n=0;while(delayed.length&&n++<100){delayed.sort((a,b)=>a.t-b.t);if(delayed[0].t>seconds)break;const job=delayed.shift();state.time=job.t;job.fn();}}},
    init, newGame, loadGame,`);
vm.runInContext(source,ctx,{filename:'game'});
const {DATA:D,Player,Monster,Minion,Game:G,SkillPerks:K,MapGen:M}=vm.runInContext('({DATA,Player,Monster,Minion,Game,SkillPerks,MapGen})',ctx);
M.walkable=()=>true;
let checks=0,casts=0;const ok=(v,m)=>{checks++;assert.ok(v,m)};
const approx=(a,b,label)=>ok(Math.abs(a-b)<1e-7,`${label}: ${a} != ${b}`);
const plain=v=>JSON.parse(JSON.stringify(v));
function fresh(classId='vanguard'){
  const p=new Player('Snare test',classId);p.lvl=100;p.x=10;p.y=10;
  if(classId==='veilranger')p.equip.main={kind:'gear',cat:'bow',dmg:[1,3],speed:1,ranged:true,twoHand:true,affixes:[]};
  const state=G.__test.freshState(p,123);
  state.map={id:'test',w:40,h:40,tiles:new Uint8Array(1600),blocked:new Uint8Array(1600),props:[],hazard:new Uint8Array(1600),zone:{lvl:1}};
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

const ids=['veilranger_2_1','veilranger_2_3','veilranger_2_5','veilranger_2_6'];
const {CharacterSheet:C,SkillIcons:I}=vm.runInContext('({CharacterSheet,SkillIcons})',ctx);
function setup(rank=1){
 const f=fresh('veilranger'),{p,state,target}=f;
 p.skills=Object.fromEntries([...ids,'veilranger_2_0','veilranger_2_2','veilranger_2_4'].map(id=>[id,rank]));p.skillPerks={};
 p.equip.main={kind:'gear',cat:'sword',dmg:[100,100],speed:1,affixes:[]};p.computeStats();p.mana=100000;p.hp=p.stats.maxHp;
 p.stats.dmgPct=0;p.stats.critChance=0;p.stats.bleedDps=0;p.stats.elem={};p.tempo=0;p.stats.attackRate=1;
 state.monsters=[target];state.minions=[];Object.assign(target,{x:12,y:10,hp:10000,maxHp:10000,poisonDot:null,bleedDot:null,scorch:null,quarry:null,curseFrailty:null,killMark:null,sunder:null,slowT:0,slowPct:0,action:null});
 target.def={...target.def,armor:0,resAll:0,regen:0};target.def.ccImmune=false;return f;
}
function advance(f,seconds,fps=120){const end=f.state.time+seconds;while(f.state.time<end-1e-8){const t=Math.min(end,f.state.time+1/fps),dt=t-f.state.time;G.__test.flush(t);f.state.time=t;for(const pr of f.state.projectiles)pr.update(dt,f.state.map,f.p,f.state.monsters);}}
function release(f,id,point=null){ok(f.p.performSkill(id,f.target,point),'accepted '+id);advance(f,2);}
function bareCast(p,id,ambush=false){const sk=p.resolveSkill(id),rk=p.effRank(id);return {sk,rk,mult:sk.dmgMult(rk)*p.synergyMult(sk),ambush};}
{
 const {p}=setup(10);
 for(const [i,name]of ['Umbral Knife','Dusk Cleave','Shadow Flurry','Deathblow'].entries()){const sk=D.SKILLS[ids[i]];ok(sk.name===name&&!sk.requiredWeapons,'replacement '+name);ok(I.describe(sk).glyph!=='question','icon '+name);}
 ok(D.SKILLS.veilranger_2_4.prereq===ids[0]&&D.SKILLS[ids[2]].prereq===ids[1]&&D.SKILLS[ids[3]].prereq==='veilranger_2_4','same prerequisite edges');
 for(const id of ids){const preview=C.preview(p,id,G.state);ok(preview.kind==='weapon'&&preview.parts.length>0,'weapon preview '+id);ok(preview.veilConditional.shadowAmbush===25,'separate conditional preview');}
}
for(const id of ids)for(const cat of ['sword','bow','crossbow','wand',null]){
 const f=setup(),{p,target,state}=f;p.equip.main=cat?{kind:'gear',cat,dmg:[100,100],speed:1,affixes:[]}:null;
 const hp=target.hp,mana=p.mana;release(f,id);ok(target.hp<hp,'independent damage '+id+'/'+cat);approx(mana-p.mana,p.resolveSkill(id).mana(1),'one cost');
 ok(!target.quarry&&!target.poisonDot,'does not generate Quarry or coating');ok(!state.fx.some(x=>x.fieldKind==='smoke')&&!state.minions.length,'no obsolete effects');
}
for(const id of ids)for(let mask=0;mask<8;mask++){
 const {p,target,state}=setup();const exposed=!!(mask&1),ambush=!!(mask&2),marked=!!(mask&4);
 target.veilExposedUntil=exposed?4:0;target.killMark=marked?{amp:20,det:10,until:5}:null;
 let hit=0;const strike=p.strike;p.strike=function(m,mult,opts){hit=mult*(opts.directMult??1);return strike.call(this,m,mult,opts)};
 p.veilHit(target,bareCast(p,id,ambush));approx(hit,p.resolveSkill(id).dmgMult(1)*(exposed&&id!==ids[0]?1.3:1)*(ambush?1.25:1),'condition combination '+id+'/'+mask);
 if(id===ids[0])approx(target.veilExposedUntil,state.time+4,'exposure after hit');
 if(id===ids[3]&&marked)ok(!target.killMark,'mark consumed by deathblow');else if(marked)ok(target.killMark,'other attacks retain mark');
}
{
 const {p,target,state}=setup();target.veilExposedUntil=1;state.time=2;p.veilHit(target,bareCast(p,ids[1]));approx(10000-target.hp,150,'expired Exposed gives no bonus');
 target.veilExposedUntil=8;target.slowT=0;target.snareRootUntil=0;p.stats.snareConditionPct=30;approx(p.snareDamageMult(target),1,'Exposed is not a snare condition');
 target.isBoss=true;p.veilHit(target,bareCast(p,ids[0]));approx(target.veilExposedUntil,6,'boss exposure refreshes without stacking');
 p.stats.bleedDps=3;target.killMark=null;target.hp=target.maxHp;p.veilHit(target,bareCast(p,ids[1],true));approx(target.bleedDot.dps,3,'Hunt bleed not multiplied');
 target.bleedDot={dps:20,t:2,owner:p};p.veilHit(target,bareCast(p,ids[3]));approx(target.bleedDot.dps,20,'Deathblow preserves stronger wounds');
}
for(const health of [1,.5,.1]){
 const {p,target}=setup();target.hp=target.maxHp*health;const hp=target.hp;p.veilHit(target,bareCast(p,ids[3]));approx(hp-target.hp,220*(1+.75*(1-health)),'missing life '+health);
}
for(const [tier,choice]of [[5,0],[5,1],[5,2],[10,0],[10,1],[10,2]])for(const id of ids){
 const {p}=setup(10),base=p.resolveSkill(id);pick(p,id,tier,choice);const sk=p.resolveSkill(id);
 if(choice===0)approx(sk.dmgMult(10),base.dmgMult(10)*(tier===5?1.2:1.35),'damage milestone');
 if(tier===5&&choice===1)approx(sk.mana(10),base.mana(10)*.75,'economy milestone');
 if(tier===5&&choice===2){const key=id===ids[1]?'range':id===ids[2]?'radius':'castRange';approx(sk[key](10),base[key](10)*1.25,'geometry milestone');}
 if(tier===10&&choice===1){const key=['exposeDuration','exposedBonus','count','missingHpBonus'][ids.indexOf(id)];approx(sk[key](10),[6,45,7,1][ids.indexOf(id)],'unique milestone');}
 if(tier===10&&choice===2){const key=id===ids[0]?'attackCycle':'cd';approx(sk[key](10),base[key](10)*(id===ids[0]?.85:.75),'timing milestone');}
}
for(const num of [1,3])for(const seven of [false,true]){
 const f=setup(10),{p,state,target}=f;if(seven)pick(p,ids[2],10,1);
 for(let i=1;i<num;i++){const m=new Monster(target.id||Object.keys(D.ENEMIES)[0],12,10+i*.6);m.hp=m.maxHp=10000;m.def={...target.def};state.monsters.push(m);}
 const hits=[];p.veilHit=(m,c)=>{hits.push({m,ambush:c.ambush});return 1};p.shadowAmbushUntil=3;
 release(f,ids[2]);approx(hits.length,seven?7:5,'blade count');ok(hits.every(h=>h.ambush),'Ambush empowers whole flurry');
 ok(new Set(hits.slice(0,num).map(h=>h.m)).size===num,'visits enemies before repeating');ok(hits[0].m===target,'selected target first');approx(p.shadowAmbushUntil,0,'Ambush consumed once');
}
{
 const f=setup(),{p,target}=f;p.shadowAmbushUntil=.34;release(f,ids[2]);approx(target.maxHp-target.hp,225,'Ambush must survive until first release');
}
for(const cancel of ['death','interruption','respec','map','floor','stun']){
 const f=setup(),{p,state,target}=f;p.shadowAmbushUntil=3;const hp=target.hp;p.performSkill(ids[2],target);
 if(cancel==='death')p.dead=true;if(cancel==='interruption')p.startAction('hit',.1);if(cancel==='respec')p.clearSkillState();if(cancel==='map')state.map={...state.map};if(cancel==='floor')p.surfaceId=1;if(cancel==='stun')p.stunT=1;
 advance(f,2);approx(target.hp,hp,'cancel before release '+cancel);if(['interruption','stun'].includes(cancel))approx(p.shadowAmbushUntil,3,'unreleased cast retains Ambush');
}
{
 const f=setup(),{p,state,target}=f;let hits=0;p.veilHit=()=>++hits;p.performSkill(ids[2],target);advance(f,.36);p.startAction('hit',.1);advance(f,2);approx(hits,1,'interruption stops remaining blades');
}
{
 const f=setup(),{p,target}=f;let hits=0;p.veilHit=m=>{hits++;m.dead=true;return 1};release(f,ids[2]);approx(hits,1,'ends when last eligible enemy dies');
}
for(const invalid of ['cooldown','mana','wall','floor','deadtarget']){
 const f=setup(),{p,state,target}=f;p.shadowAmbushUntil=3;const saved=M.walkable;
 if(invalid==='cooldown')p.skillCd[ids[3]]=10;if(invalid==='mana')p.mana=0;if(invalid==='wall')M.walkable=(map,x)=>x<11;if(invalid==='floor')target.surfaceId=1;if(invalid==='deadtarget')target.dead=true;
 const mana=p.mana;ok(!p.performSkill(ids[3],target),'reject '+invalid);approx(p.mana,mana,'no spending '+invalid);approx(p.shadowAmbushUntil,3,'rejection preserves Ambush');M.walkable=saved;
}
for(const fps of [20,60,120]){
 const f=setup(),{p,state,target}=f;target.x=13;
 const behind=new Monster(Object.keys(D.ENEMIES)[0],15,10);behind.hp=behind.maxHp=10000;behind.def={...target.def};state.monsters.unshift(behind);
 p.performSkill(ids[0],target);advance(f,2,fps);approx(10000-target.hp,120,'first collision at '+fps);approx(behind.hp,10000,'cannot pierce');
}
{
 const f=setup(),{p,state,target}=f;target.x=13;p.performSkill(ids[0],target);G.__test.flush(.45);const saved=M.walkable;M.walkable=(map,x)=>x<12;advance(f,1);approx(target.hp,10000,'projectile stops at new wall');M.walkable=saved;
}
{
 const f=setup(),{p,state,target}=f;target.x=20;p.performSkill(ids[0],null,{x:30,y:10});advance(f,2);approx(target.hp,10000,'projectile never exceeds range');
}
{
 const f=setup(),{p,target}=f;target.x=12;target.y=12;release(f,ids[1],{x:13,y:10});approx(10000-target.hp,150,'inside 140-degree cone');
 const g=setup();g.target.x=9;release(g,ids[1],{x:13,y:10});approx(g.target.hp,10000,'behind cleave is safe');
}
for(const health of [10000,50]){
 const f=setup(),{p,state,target}=f;target.hp=health;target.killMark={amp:20,det:10,until:5};
 // Count the area detonation, excluding its separately attributed victim hits.
 let detonations=0;const sound=ctx.Sfx.playSkill;ctx.Sfx.playSkill=(id,phase,context)=>{if(id==='veilranger_2_4'&&phase==='impact'&&!context?.target)detonations++};
 release(f,ids[3]);approx(detonations,1,'exactly one '+(health===50?'lethal':'nonlethal')+' mark explosion');ok(!target.killMark,'struck mark cleared');ctx.Sfx.playSkill=sound;
}
{
 const f=setup(),{p,target}=f;target.hp=50;target.killMark={amp:20,det:100,until:5};let calls=0;const sound=ctx.Sfx.playSkill;ctx.Sfx.playSkill=(id,phase,context)=>{if(id==='veilranger_2_4'&&phase==='impact'&&!context?.target)calls++};G.detonateMark(target);approx(calls,1,'mark explosion lethal to its host cannot reenter');ctx.Sfx.playSkill=sound;
}
{
 const f=setup(),{p,target}=f;p.stats.critChance=100;p.stats.critDmg=200;p.stats.lifeSteal=10;p.stats.manaSteal=10;p.hp=1;p.mana=0;const hp=target.hp;p.veilHit(target,bareCast(p,ids[0]));approx(hp-target.hp,240,'critical weapon hit');approx(p.hp,25,'life steal');approx(p.mana,24,'aether steal');
 target.imperialCombat={block:()=>true};target.veilExposedUntil=0;const life=target.hp;p.veilHit(target,bareCast(p,ids[0]));approx(target.hp,life,'guard blocks guaranteed-contact hit');approx(target.veilExposedUntil,0,'blocked knife cannot expose');
}
{
 const f=setup(),{p,state}=f;ok(p.performSkill('veilranger_2_0',null,{x:11,y:10}),'Shadowstep works');approx(p.shadowAmbushUntil,3,'Shadowstep grants Ambush');
 state.time=1;p.performSkill('veilranger_2_0',null,{x:12,y:10});approx(p.shadowAmbushUntil,4,'Ambush refresh');approx(p.buffs.filter(b=>b.id==='shadow_ambush').length,1,'one buff');
 p.clearVeilState();approx(p.shadowAmbushUntil,0,'lifecycle cleanup');ok(!p.buffs.some(b=>b.id==='shadow_ambush'),'buff removed');
}
for(const quickRank of [0,10]){
 const f=setup(),{p,target,state}=f;p.skills.veilranger_2_2=quickRank;p.computeStats();p.mana=10000;
 let releases=0;p.veilHit=()=>++releases;p.performSkill(ids[2],target);const rate=p.stats.attackRate;
 G.__test.flush(.349/rate);approx(releases,0,'no early release with Quickening '+quickRank);
 G.__test.flush(.351/rate);approx(releases,1,'release follows attack speed '+quickRank);
 G.__test.flush(2);approx(releases,5,'Quickening preserves blade count');approx(p.skillCd[ids[2]],5,'Quickening does not bypass cooldown');
}
{
 const f=setup(),{p,target}=f;p.performSkill(ids[0],target);G.__test.flush(.45);target.surfaceId=1;advance(f,1);approx(target.hp,10000,'projectile cannot hit another floor');
}
{
 const {p,target}=setup();p.stats.elem={fire:100,poison:9};target.veilExposedUntil=5;const hp=target.hp;
 p.veilHit(target,bareCast(p,ids[1],true));approx(hp-target.hp,(150+80)*1.3*1.25,'conditional bonuses multiply the entire direct weapon hit');approx(target.poisonDot.dps,3,'poison wound is not amplified');
}
{
 const f=setup(),{p,target}=f;p.performSkill(ids[0],target);G.__test.flush(.45);p.clearVeilState();advance(f,1);approx(target.hp,10000,'lifecycle token cancels released old-world projectiles');
}
{
 const f=setup(),{p,target}=f;let delayed=0,releases=0;const sound=ctx.Sfx.playSkill;
 ctx.SkillAudio={cast:(p,id,fn)=>fn(),scope:(id,c,fn)=>fn(),markRelease:()=>delayed++};ctx.Sfx.playSkill=(id,phase)=>{if(phase==='release')releases++};
 p.performSkill(ids[2],target);approx(delayed,1,'audio marks the cast as delayed');approx(releases,0,'no release audio during windup');advance(f,.36);approx(releases,1,'first blade release audio');p.startAction('hit',.1);advance(f,1);approx(releases,1,'cancelled blades are silent');
 delete ctx.SkillAudio;ctx.Sfx.playSkill=sound;
}
{
 const f=setup(),{p,target}=f;p.performSkill(ids[2],target);p.stunT=.1;p.update(.2);advance(f,2);approx(target.hp,10000,'brief stun interrupts even when it expires before release');
}
{
 const f=setup(),{p,target}=f;ok(p.performSkill(ids[2],null,{x:p.x,y:p.y}),'Flurry accepts ground at own feet');advance(f,2);ok(target.hp<10000,'self-centered area damages eligible enemies');
}
console.log('PASS '+checks+' Veil checks: weapon damage, Exposed, Ambush, flurry distribution, milestones, collisions, interruption, marks and lifecycle cleanup.');
