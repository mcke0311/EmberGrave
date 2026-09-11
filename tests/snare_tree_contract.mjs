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

const netId='veilranger_1_3',passiveId='veilranger_1_6',caltropId='veilranger_1_4';
const {CharacterSheet:C,SkillIcons:I}=vm.runInContext('({CharacterSheet,SkillIcons})',ctx);
function setup(rank=1){
  const f=fresh('veilranger'),{p,state,target}=f;
  state.monsters=[target];state.minions=[];p.skills={[netId]:rank,[passiveId]:rank};p.skillPerks={};p.computeStats();p.mana=10000;p.hp=10000;
  Object.assign(target,{x:13,y:10,poisonDot:null,bleedDot:null,scorch:null,quarry:null,curseFrailty:null,killMark:null,sunder:null,slowT:0,slowPct:0,aggro:true,action:null});
  target.def.armor=0;target.def.resAll=0;target.def.regen=0;p.stats.critChance=0;
  return f;
}
function advance(f,seconds,fps=60){for(let i=0;i<Math.ceil(seconds*fps);i++){const {p,state}=f;state.time+=1/fps;G.__test.flush(state.time);for(const m of state.monsters)m.update(1/fps,p,state.map);G.__test.updateTraps(1/fps);G.__test.updateFx(1/fps);}}
{
 const {p}=setup(10),sk=D.SKILLS[netId];
 ok(sk.type==='dragnet'&&sk.name==='Dragnet','net replaces wire with the same ID');
 ok(!G.__test.repeatSkill(netId),'held input does not repeatedly deploy the net');
 ok(D.SKILLS[passiveId].type==='passive'&&D.SKILLS[passiveId].name==='Exploit Weakness','decoy becomes passive');
 ok(D.SKILLS.veilranger_1_5.prereq===netId,'Powder Trap prerequisite follows Dragnet');
 approx(sk.dmg(1)[0],10,'rank-one minimum');approx(sk.dmg(10)[1],70,'rank-ten maximum');approx(sk.radius(10),3.72,'radius scaling');
 pick(p,netId,5,0);pick(p,netId,10,1);approx(p.resolveSkill(netId).radius(10),3.72*1.25,'radius perk');approx(p.resolveSkill(netId).cd(10),4.5,'cooldown perk');
 pick(p,passiveId,5,0);pick(p,passiveId,10,0);p.computeStats();approx(p.stats.snareConditionPct,45,'per-condition milestone additions');
 ok(!p.performSkill(passiveId,null,{x:12,y:10}),'passive is uncastable');
 ok(I.describe(sk).glyph==='net'&&I.describe(D.SKILLS[passiveId]).role==='Passive','semantic icons');
}
for(let mask=0;mask<8;mask++){
 const {p,target}=setup(10);target.slowT=mask&1?2:0;target.slowPct=mask&1?55:0;target.snareRootUntil=mask&2?2:0;target.bleedDot=mask&4?{dps:3,t:2}:null;
 const count=Number(!!(mask&1))+Number(!!(mask&2))+Number(!!(mask&4));approx(p.snareDamageMult(target),1+.3*count,'condition mask '+mask);
 const hp=target.hp;p.snareHit(target,100);approx(hp-target.hp,100*(1+.3*count),'actual hit mask '+mask);
}
{
 const {p,target,state}=setup(10);target.slowT=-1;target.slowPct=90;target.snareRootUntil=0;target.bleedDot={dps:100,t:0};target.poisonDot={dps:100,t:3};
 approx(p.snareDamageMult(target),1,'expired statuses and poison do not qualify');
 target.applySlow(2,30);target.applySlow(3,55);approx(p.snareDamageMult(target),1.3,'multiple slows count once');
 target.bleedDot={dps:10,t:3};approx(p.snareDamageMult(target),1.6,'physical bleed adds a condition');
 state.time=5;approx(p.snareDamageMult(target),1.6,'duration-based statuses remain separate from timestamps');
}
for(const cat of ['bow','crossbow','sword','wand',null]){
 const f=setup(),{p,state,target}=f;p.equip.main=cat?{kind:'gear',cat,dmg:[1,3],speed:1,affixes:[]}:null;p.computeStats();p.mana=10000;
 p.stats.bleedDps=3;const hp=target.hp,cost=p.resolveSkill(netId).mana(1);
 ok(p.performSkill(netId,null,{x:12,y:10}),'net accepts '+cat);approx(p.mana,10000-cost,'net cost '+cat);
 G.__test.flush(.399);approx(target.hp,hp,'no early release');G.__test.flush(.4);
 ok(target.hp<hp&&target.snarePull,'one impact starts pulling '+cat);ok(target.bleedDot?.dps===3,'net applies Hunt bleed');
 ok(state.traps.length===0,'net takes no trap slot');const paid=p.mana;ok(!p.performSkill(netId,null,{x:12,y:10}),'cooldown rejects recast');approx(p.mana,paid,'cooldown spends nothing');
 for(let i=0;i<18;i++){state.time+=1/60;target.updateSnarePull(1/60,state.map);}
 ok(!target.snarePull&&target.snareRootUntil>state.time,'pull ends in root');ok(Math.abs(target.x-12)<=Math.max(.55,target.radius)+.001,'pull gathers near center');
 target.path=[{cx:16,cy:10}];const x=target.x;target.moveAlong(.5,8,state.map,[]);approx(target.x,x,'root blocks walking');
 state.time=target.snareRootUntil+.01;target.moveAlong(.1,3,state.map,[]);ok(target.x!==x,'root expires and movement resumes');
}
for(const mode of ['death','interruption','respec','map','surface']){
 const f=setup(),{p,target,state}=f,hp=target.hp;p.performSkill(netId,null,{x:12,y:10});
 if(mode==='death')p.dead=true;if(mode==='interruption')p.startAction('hit',.1);if(mode==='respec')p.clearSkillState();if(mode==='map')state.map={...state.map};if(mode==='surface')p.surfaceId=1;
 G.__test.flush(1);approx(target.hp,hp,'pending release cancelled by '+mode);ok(!target.snarePull,'no cancelled pull');
}
{
 const {p,state,target}=setup();const original=M.walkable;
 M.walkable=(_m,x)=>x<11;const mana=p.mana;
 ok(!p.performSkill(netId,null,{x:12,y:10}),'blocked ground rejected');approx(p.mana,mana,'blocked ground has no cost');ok(!p.skillCd[netId],'blocked ground has no cooldown');M.walkable=original;
 ok(!p.performSkill(netId,null,{x:12,y:10,surfaceId:1}),'cross-floor aim rejected');
 target.surfaceId=1;ok(p.performSkill(netId,null,{x:12,y:10}),'same-floor cast accepted');const hp=target.hp;G.__test.flush(1);approx(target.hp,hp,'other-floor enemy unaffected');
}
{
 const {p,state,target}=setup();p.performSkill(netId,null,{x:100,y:10});G.__test.flush(1);approx(state.fx.find(f=>f.type==='dragnet').x,17,'aim clamps to seven yards');
}
{
 const {p,state,target}=setup(50);target.isBoss=true;const x=target.x;
 p.performSkill(netId,null,{x:12,y:10});G.__test.flush(1);ok(!target.snarePull&&!target.snareRootUntil,'boss cannot be displaced or rooted');approx(target.x,x,'boss position preserved');approx(target.slowPct,40,'boss slow');approx(target.slowT,3,'boss control duration capped');
}
{
 const {p,state,target}=setup();target.encounter={canDamage:()=>false};const hp=target.hp;
 p.performSkill(netId,null,{x:12,y:10});G.__test.flush(1);approx(target.hp,hp,'invulnerable target takes no damage');ok(!target.snarePull&&!target.slowT,'invulnerable target receives no control');
}
{
 const {p,state,target}=setup();target.x=14;target.applyDragnet({x:10,y:10},2,p);
 const nav=vm.runInContext('TerrainNavigation',ctx),segment=nav.segment;
 nav.segment=(_map,_x,_y,x)=>x>=12;
 for(let i=0;i<30;i++){state.time+=.02;target.updateSnarePull(.02,state.map);}
 nav.segment=segment;ok(target.x>=12,'pull stops before wall');ok(!target.snarePull&&target.snareRootUntil>state.time,'blocked pull ends in root');
}
// Setup pulls a previously out-of-trigger enemy onto a waiting frost trap.
{
 const f=setup(),{p,state,target}=f;p.skills.veilranger_1_2=1;p.stats.bleedDps=3;target.x=14;target.def.speed=0;
 p.performSkill('veilranger_1_2',null,{x:12,y:10});state.traps[0].armT=0;
 G.__test.updateTraps(.01);ok(state.traps.length===1,'trap awaits an enemy');
 p.performSkill(netId,null,{x:12,y:10});advance(f,1);
 ok(state.traps.length===0,'gathering naturally triggers trap');ok(target.slowT>0&&target.snareRootUntil>state.time&&target.bleedDot?.t>0,'combo establishes all three conditions');
}
// All five snare hits use the same multiplier; caltrops use trap/Dex scaling.
for(const id of ['veilranger_1_0','veilranger_1_2','veilranger_1_5',caltropId,netId]){
 const f=setup(10),{p,state,target}=f;p.skills[id]=1;p.computeStats();p.mana=10000;p.stats.trapPct=50;p.stats.spellPct=900;p.stats.attr.dex=140;p.stats.critChance=0;
 Object.assign(target,{x:12,y:10,slowT:3,slowPct:55,snareRootUntil:3,bleedDot:{dps:3,t:3}});
 const sk=p.resolveSkill(id),base=(sk.dmg(1)[0]+sk.dmg(1)[1])/2*3*p.synergyMult(sk),hp=target.hp;
 p.performSkill(id,null,{x:12,y:10});G.__test.flush(.5);
 if(sk.type==='trap'){state.traps[0].armT=0;G.__test.updateTraps(.01);}if(sk.type==='groundfield')G.__test.updateFx(.01);
 approx(hp-target.hp,base*1.9,id+' trap scaling and layered bonus');
 const preview=C.preview(p,id,state),part=preview.parts[0];approx(part.hit.phys[0],sk.dmg(1)[0]*3*p.synergyMult(sk),id+' baseline excludes conditions');
 approx(preview.snareConditionBonus.max,90,'preview labels maximum conditional bonus');
}
{
 const {p,target,state}=setup(10);p.stats.bleedDps=3;const hp=target.hp;p.snareHit(target,100);approx(hp-target.hp,100,'first hit cannot benefit from its own bleed');
 const before=target.hp;p.snareHit(target,100);approx(before-target.hp,130,'subsequent hit benefits from bleed');
 target.def.armor=0;target.def.resAll=0;target.frozen=Infinity;target.poisonDot={dps:4,t:3,fire:true};const tickHp=target.hp;state.time=.1;target.update(.1,p,state.map);
 approx(tickHp-target.hp,.7,'bleed and burn ticks ignore Exploit Weakness');
}
{
 const {p,state,target}=setup();target.x=p.x+.7;target.y=p.y;target.snareRootUntil=3;target.attackCd=0;target.def.projectile=null;target.def.slam=null;target.def.charge=null;target.def.leap=null;target.def.teleports=null;
 target.update(.1,p,state.map);ok(target.action?.state==='attack','root permits stationary melee attack');
}

for(const fps of [20,60,120]){
 const {p,state,target}=setup();target.applyDragnet({x:12,y:10},1.25,p);
 for(let i=0;i<fps*.5;i++){state.time=(i+1)/fps;target.updateSnarePull(1/fps,state.map);}
 approx(target.x,12+Math.max(.55,target.radius),'pull destination at '+fps+'fps');
 approx(target.snareRootUntil,1.55,'root starts at pull completion at '+fps+'fps');
}
{
 const {p,state,target}=setup(50);pick(p,netId,10,0);p.mana=10000;p.performSkill(netId,null,{x:12,y:10});G.__test.flush(.4);
 approx(target.snarePull.root,3,'root perk cannot exceed three seconds');
 target.snareRootUntil=10;target.updateSnarePull(.3,state.map);ok(target.snareRootUntil===10,'new root never shortens existing root');
}
// Root blocks the mobility entrypoints in each enemy controller, not their attacks.
{
 const {p,state,target}=setup();target.snareRootUntil=10;target.def.act3Combat={role:'melee',special:{kind:'blink',cd:1,range:9}};
 const {ImperialCombat,Act2EnemyCombat,EnemySkills}=vm.runInContext('({ImperialCombat,Act2EnemyCombat,EnemySkills})',ctx);
 target.imperialCombat=new ImperialCombat(target);ok(!target.imperialCombat.trySpecial(true),'root blocks imperial blink');
 state.map.id='cathedral1';const wraith=new Monster('memory_wraith',16,10,{skillProfile:'memory_wraith'});state.monsters.push(wraith);wraith.snareRootUntil=10;
 ok(wraith.enemySkills&&!wraith.enemySkills.start('blink',p),'root blocks cathedral blink');
 target.imperialCombat=null;target.def.teleports={cd:1,minDist:1};target.act2Combat=new Act2EnemyCombat(target);target.act2Combat.cooldowns.blink=0;
 target.x=16;target.act2Combat.act(.1,p,state.map);ok(target.act2Combat.pending?.id!=='blink','root blocks Act II blink');
 const x=target.x;target.act2Combat=null;target.def.leap={range:10,cd:1,radius:2,mult:1};target.def.charge={range:10,cd:1,speed:8};
 target.action=null;target.leapCd=target.chargeCd=target.teleCd=0;target.update(.1,p,state.map);
 ok(!target.leaping&&!target.charging,'root blocks generic charge and leap');approx(target.x,x,'rooted generic enemy stays put');
}
{
 const {p,state,target}=setup();p.skills.veilranger_2_5=1;p.performSkill('veilranger_2_5',target,{x:11,y:10});G.__test.flush(3);
 ok(!state.minions.some(m=>m.decoy),'Shadow Flurry replaces the old After-Image decoy');
}

console.log('PASS '+checks+' snare checks: ranks, perks, all conditions, five damage paths, cast cancellation, terrain, gathering, boss immunity and rooted attacks.');

