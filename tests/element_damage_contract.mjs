import assert from 'node:assert/strict';
import vm from 'node:vm';
import {ctx,D,Q,I,G,CS,K,Minion,Projectile,fresh,equip,plain,U} from './unique_fixture.mjs';
let checks=0;
const ok=(v,m)=>{checks++;assert.ok(v,m);};
const near=(a,b,m)=>ok(Math.abs(a-b)<1e-6,`${m}: ${a} != ${b}`);
function setup(classId='emberwitch'){
  const f=fresh(classId),{p,state,target}=f;p.skills={};p.skillPerks={};p.equip={};p.buffs=[];p.computeStats();
  p.hp=p.stats.maxHp;p.mana=p.stats.maxMana;p.stats.critChance=0;p.stats.spellPct=0;p.stats.attr.wil=0;
  for(const m of state.monsters){m.def={...m.def,armor:0,resAll:0,resFire:0,resCold:0,resLight:0,resPoison:0};m.poisonDot=null;m.scorch=null;}
  return f;
}
function bonus(p,values){p.equip.ring1={kind:'gear',affixes:Object.entries(values).map(([stat,val])=>({stat,val}))};p.computeStats();p.stats.critChance=0;p.stats.spellPct=0;p.stats.attr.wil=0;}
const elements=Object.keys(D.DAMAGE_ELEMENTS),tiers=[[2,5,10],[15,11,20],[30,21,35],[50,36,50],[70,51,65],[90,66,80]];
const elementStats=new Set(elements.map(elem=>elem+'DmgPct'));
for(const elem of elements){
  const family=D.AFFIXES.find(a=>a.stat===elem+'DmgPct');
  assert.deepEqual(plain(family.tiers.map(t=>[t.ilvl,t.min,t.max])),tiers);checks++;
  ok(family.kind==='p'&&family.weight===1&&family.fixedTiers,'normal weighted prefix '+elem);
  assert.deepEqual(plain(family.slots),['main','off','head','gloves','ring','amulet']);checks++;
  ok(D.JEWEL_STATS.has(family.stat)&&!D.CHARM_STATS.has(family.stat),elem+' jewel/charm eligibility');
  for(const [level] of tiers){ok(!family.tiers.some(t=>t.ilvl===level-1),elem+' precise unlock '+level);ok(family.tiers.filter(t=>t.ilvl<=level).at(-1).ilvl===level,elem+' unlock tier');}
  const {p,target}=setup();bonus(p,{[elem+'DmgPct']:50});let hp=target.hp;
  p.spellHit(target,100,elem,{});near(hp-target.hp,150,elem+' spell damage');
  hp=target.hp;p.spellHit(target,100,elem==='fire'?'cold':'fire',{});near(hp-target.hp,100,elem+' does not boost another element');
  hp=target.hp;target.takeDamage(100,p,null,elem);near(hp-target.hp,150,elem+' raw player item damage');
  hp=target.hp;target.takeDamage(100,p,{elementScaled:true},elem);near(hp-target.hp,100,elem+' inherited damage not scaled twice');
  hp=target.hp;target.takeDamage(100,p,{environment:true},elem);near(hp-target.hp,100,elem+' environment is not player damage');
  const minion=new Minion('wolf',{hp:100,dmg:[10,10],speed:3,atkRate:1,range:1},p);
  hp=target.hp;target.takeDamage(100,minion,null,elem);near(hp-target.hp,100,elem+' summon damage unchanged');
  hp=target.hp;G.fireProc({elem,dmg:[100,100],radius:2},target.x,target.y,p);near(hp-target.hp,150,elem+' affix proc damage');
  hp=target.hp;G.fireProc({elem,dmg:[100,100],radius:2},target.x,target.y,minion);near(hp-target.hp,100,elem+' summon proc damage unchanged');
  // The shared item-DoT path accepts all six elements, including those with no
  // native poison/burn status. Drive it through an actual player spell impact.
  p._unique.active.push({key:'element-dot',entry:{id:'element-dot',level:1},power:{event:'spell',when:'any',cd:5,effects:[{kind:'dot',elem,pct:100,dur:3}]}});
  p.spellHit(target,100,elem,{});near(target.uniqueDots[0].dps,50,elem+' item DoT inherits boosted spell once');
  p.stats.elementPct[elem]=200;hp=target.hp;Q.tickDots(target,1);near(hp-target.hp,50,elem+' item DoT keeps application snapshot');
}
{
  const {p,target}=setup();bonus(p,{fireDmgPct:30});p.equip.ring2={kind:'gear',affixes:[{stat:'fireDmgPct',val:20}]};p.computeStats();
  near(p.stats.elementPct.fire,50,'matching bonuses add');let hp=target.hp;p.spellHit(target,100,'fire',{});near(hp-target.hp,150,'additive element bucket');
  p.stats.spellPct=40;p.stats.attr.wil=0;p.stats.critChance=0;
  const rolled=p.spellRoll({dmg:()=>[100,100]},1);hp=target.hp;p.spellHit(target,rolled.dmg,'fire',{});near(hp-target.hp,210,'separate spell power and elemental multipliers');
}
{
  const {p,target}=setup('wildkeeper');bonus(p,{fireDmgPct:50,coldDmgPct:200,lightDmgPct:300});p.stats.dmgToFire=1;
  let hp=target.hp;p.spellHit(target,100,'cold',{burn:0});near(hp-target.hp,150,'spell conversion uses only final element');
  p.equip.main=I.fromBase('handaxe');p.equip.main.dmg=[10,10];p.stats.elem={fire:10,cold:20,light:30,poison:40};
  const d=p.rollDamage(1,target),raw=d.phys+d.fire+d.cold+d.light;
  hp=target.hp;p.strike(target,1,{auto:true});near(hp-target.hp,raw*1.5,'mixed weapon conversion scales once');
  ok(!target.poisonDot,'conversion preserves suppression of weapon poison');
}
{
  const {p,target}=setup('vanguard');bonus(p,{fireDmgPct:50,coldDmgPct:100,lightDmgPct:200,poisonDmgPct:75});
  p.equip.main=I.fromBase('handaxe');p.equip.main.dmg=[10,10];p.stats.elem={fire:10,cold:20,light:30,poison:40};
  const d=p.rollDamage(1,target),expected=d.phys+d.fire*1.5+d.cold*2+d.light*3,hp=target.hp;
  p.strike(target,1,{auto:true});near(hp-target.hp,expected,'weapon components scaled independently');near(target.poisonDot.dps,40/3*1.75,'weapon poison snapshot');
  const preview=CS.preview(p,'basic');near((preview.parts[0].totalHit[0]+preview.parts[0].totalHit[1])/2,expected,'weapon sheet matches midpoint combat');
  near(preview.parts[0].dots.find(d=>d.element==='poison').range[0],70,'weapon poison preview matches full duration');
}
{
  const {p,state,target}=setup();bonus(p,{fireDmgPct:100,poisonDmgPct:50});
  p.applyPoison(target,10,3);near(target.poisonDot.dps,15,'poison captured on application');
  bonus(p,{fireDmgPct:0,poisonDmgPct:200});near(target.poisonDot.dps,15,'gear swap does not change existing poison');
  const hp=target.hp;target.stunT=10;target.update(.1,p,state.map);near(hp-target.hp,1.5,'poison tick does not apply current bonus again');
  p.applyPoison(target,4,3,{strongest:true});near(target.poisonDot.dps,15,'compare amplified poison before replacing');
  p.applyPoison(target,10,2,{fire:true});near(target.poisonDot.dps,10,'burn uses fire, not poison bonus');
  bonus(p,{fireDmgPct:50});p.spellHit(target,10,'fire',{scorch:4});near(target.scorch.dps,6,'Scorch snapshot');bonus(p,{fireDmgPct:200});near(target.scorch.dps,6,'Scorch survives swap without amplification');
  bonus(p,{poisonDmgPct:50});p.applyPlague(target,{until:10,tick:10,tickT:0,spreadCd:0,spreadRange:8,burstRange:3});near(target.plague.tick,15,'Contagion snapshot');
  bonus(p,{poisonDmgPct:200});target.update(.01,p,state.map);const spread=state.monsters.find(m=>m!==target&&m.plague);ok(!!spread,'Contagion spreads');near(spread.plague.tick,15,'spread inherits snapshot without double scaling');
}
{
  const {p,state,target}=setup('wildkeeper');bonus(p,{poisonDmgPct:50});
  state.fx.push({type:'groundfield',fieldKind:'miasma',rabies:true,rdps:15,elementScaled:true,owner:p,sourceSkill:'rabies',x:target.x,y:target.y,radius:2,ttl:4,rdur:5,rcloud:2});
  G.__uniqueTest.updateFx(.01);near(target.poisonDot.dps,15,'Rabies cloud inherits prior poison bonus');near(target.rabies.dps,15,'successive Rabies clouds retain same snapshot');
}
{
  const {p,state,target}=setup();bonus(p,{fireDmgPct:50});target.type='demon';equip(p,'g_doom');p.stats.elementPct.fire=50;
  Q.emit(p,'strike',{target,source:p,damage:150,elem:'fire'});near(target.uniqueDots[0].dps,50,'hit-derived unique DoT inherits fire bonus');
  p.stats.elementPct.fire=200;let hp=target.hp;state.time=.1;Q.tickDots(target,.1);near(hp-target.hp,5,'unique DoT snapshot remains unchanged');
}
for(const converted of [false,true]){
  const {p,state,target}=setup('wildkeeper');equip(p,'g_doom');bonus(p,{fireDmgPct:100,coldDmgPct:50});target.type='demon';
  p.equip.main.dmg=[10,10];p.stats.elem={fire:40,cold:20,light:0,poison:0};p.stats.dmgToFire=converted?1:0;
  const d=p.rollDamage(1,target),raw=d.phys+d.fire+d.cold,withoutFire=d.phys+d.fire+d.cold*1.5;
  p.strike(target,1,{auto:true});near(target.uniqueDots[0].dps,(converted?raw:withoutFire)*2/3,'mixed/converted weapon-derived fire applies each bonus once');
  state.time=10;p.stats.primalProc=100;const other=state.monsters[1],hp=other.hp;
  p.strike(target,1,{auto:true});near(hp-other.hp,(converted?raw:withoutFire)*2,'Primal Surge inherits mixed/converted fire without double scaling');
}
{
  const {p,state,target}=setup();bonus(p,{fireDmgPct:50});equip(p,'g_doom','arm');p.hp=p.stats.maxHp*.3;
  const hp=target.hp;Q.emit(p,'hurt',{source:target,damage:100,elem:'fire'});near(hp-target.hp,75,'incoming damage proc receives outgoing bonus once');
}
{
  const {p,state,target}=setup();bonus(p,{shadowDmgPct:50});
  // Observe the public hit event through a temporary catalog-independent power.
  p._unique.active.push({key:'source-test',entry:{id:'source-test',level:1},power:{event:'spell',when:'any',cd:1,effects:[{kind:'mana',pct:1}],target:{classId:'emberwitch',skill:'emberwitch_0_0'}}});
  const hp=target.hp;const bolt=new Projectile({x:target.x,y:target.y,tx:target.x+1,ty:target.y,speed:1,kind:'bolt',fromPlayer:true,sourceSkill:'emberwitch_0_0',spell:{dmg:100,elem:'shadow'}});
  bolt.update(.01,state.map,p,state.monsters);near(hp-target.hp,150,'real projectile scales on impact');ok(p._unique.states.has('source-test'),'projectile skill identity independent of sound and visuals');
}
for(const [elem,kind] of [['fire','inferno'],['cold','glacier'],['light','static'],['poison','miasma'],['earth','quake']]){
  const {p,state,target}=setup();bonus(p,{[elem+'DmgPct']:50});p.staticChg=0;
  state.fx.push({type:'groundfield',fieldKind:kind,owner:p,sourceSkill:'emberwitch_0_0',x:target.x,y:target.y,radius:1,ttl:4,lo:100,hi:100,tickEvery:.5});
  const hp=target.hp;G.__uniqueTest.updateFx(.01);near(hp-target.hp,150,elem+' real field pulse');
}
{
  const {p,state,target}=setup('veilranger');bonus(p,{fireDmgPct:50});p.skills.veilranger_1_5=1;
  ok(p.performSkill('veilranger_1_5',null,{x:target.x,y:target.y}),'real Powder Trap cast');G.__uniqueTest.flush(2);state.time=3;
  const sk=p.resolveSkill('veilranger_1_5'),raw=sk.burn(p.effRank(sk.id));G.__uniqueTest.updateTraps(1);G.__uniqueTest.updateTraps(.01);
  near(target.poisonDot.dps,raw*1.5,'real trap burn scaled');
  const q=CS.preview(p,sk.id);near(q.parts[0].dots.find(d=>d.element==='fire').range[0],raw*3,'trap burn preview');
}
// Per-element spell/field previews use exactly the same coefficient as combat.
for(const [classId,id,elem] of [['emberwitch','emberwitch_0_0','fire'],['emberwitch','emberwitch_1_0','cold'],['emberwitch','spark','light'],['gravebinder','venom_spit','poison'],['gravebinder','gravebinder_1_5','shadow'],['wildkeeper','ground_fissure','earth']]){
  const {p}=setup(classId);p.skills[id]=1;const a=CS.preview(p,id);bonus(p,{[elem+'DmgPct']:50});const b=CS.preview(p,id);
  const left=a.parts.flatMap(p=>p.hit[elem]||[]),right=b.parts.flatMap(p=>p.hit[elem]||[]);ok(left.some(v=>v>0),id+' elemental preview exists');left.forEach((v,i)=>near(right[i],v*1.5,id+' scaled preview'));
}
{
  const {p,state}=setup('gravebinder');p.skills.raise_plaguemage=1;const a=CS.preview(p,'raise_plaguemage',state);bonus(p,{poisonDmgPct:500});
  assert.deepEqual(plain(CS.preview(p,'raise_plaguemage',state).parts),plain(a.parts));checks++;
}
// Seeded generation reaches all six families and respects item budgets.
ctx.seededRandom=U.rng(9145);vm.runInContext('Math.random=seededRandom',ctx);
const found=new Set(),jewels=new Set();
for(let i=0;i<1600;i++){
  const gear=I.rollGear(95,'rare',{slot:'main'}),jewel=I.makeJewel(95),charm=I.makeCharm('grand',95);
  const rolls=gear.affixes.filter(a=>elementStats.has(a.stat));for(const a of rolls){found.add(a.stat);ok(a.val>=5&&a.val<=80,'gear elemental range');}
  ok(new Set(rolls.map(a=>a.stat)).size===rolls.length,'one prefix per element');
  for(const a of jewel.affixes.filter(a=>elementStats.has(a.stat))){jewels.add(a.stat);ok(a.val>=4&&a.val<=56,'jewel retains 70% scaling');}
  ok(!charm.affixes.some(a=>elementStats.has(a.stat)),'no elemental percentages on charms');
}
ok(found.size===6&&jewels.size===6,'all six families roll on equipment and jewels');
vm.runInContext('Math.random=()=>.5',ctx);
console.log(`PASS ${checks} elemental checks: six affix families, combat paths, conversion, snapshots, summons and character-sheet parity.`);
