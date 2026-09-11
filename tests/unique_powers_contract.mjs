import assert from 'node:assert/strict';
import {D,Q,I,G,K,Minion,Projectile,fresh,equip,item,plain} from './unique_fixture.mjs';
let checks=0,powers=0;
const ok=(v,m)=>{checks++;assert.ok(v,m);};
const approx=(a,b,m)=>ok(Math.abs(a-b)<1e-6,`${m}: ${a} != ${b}`);
const expected=[...D.UNIQUES,...D.UNIQUE_CHARMS,...D.UNIQUE_JEWELS,...Object.values(D.GLYPHS).filter(g=>g.unique)].map(d=>d.id).sort();
assert.deepEqual(Object.keys(Q.catalog).sort(),expected);ok(expected.length===163,'entire catalogue');
const signatures=new Map();
const mechanicSignature=p=>JSON.stringify({event:p.event,when:p.when,every:!!p.every,sameTarget:!!p.sameTarget,alternate:!!p.alternate,alternateElement:!!p.alternateElement,
 effects:p.effects.map(e=>({kind:e.kind,stats:e.stats?Object.keys(e.stats):null,attack:e.attack,skill:e.skill,path:e.path}))});
function prepare(p,state,target,power){
 const source=target,e={target,source,damage:80,targetHpBefore:target.hp,crit:false,kind:'strike',elem:'phys',amount:power.every||1};
 switch(power.when){
  case 'undead':case 'demon':case 'beast': target.type=power.when;break;
  case 'healthyTarget':e.targetHpBefore=target.maxHp;break;
  case 'lowTarget':e.targetHpBefore=target.maxHp*.2;break;
  case 'lowLife':p.hp=p.stats.maxHp*.3;break;
  case 'highLife':p.hp=p.stats.maxHp*.9;break;
  case 'lowMana':p.mana=p.stats.maxMana*.2;break;
  case 'highMana':p.mana=p.stats.maxMana*.9;break;
  case 'critical':e.crit=true;break;
  case 'elite':case 'eliteSource':target.elite=true;break;
  case 'boss':target.isBoss=true;break;
  case 'far':for(const m of state.monsters)m.x+=5;break;
  case 'poisoned':target.poisonDot={dps:1,t:3};break;
  case 'burning':case 'burningSource':target.scorch={dps:1,until:10};break;
  case 'slowed':target.slowT=2;break;
  case 'frozen':target.frozen=10;break;
  case 'cursed':target.curseFrailty={pct:0,until:10};break;
  case 'exposed':target.uniqueExposes=[{key:'test',pct:1,until:10}];break;
  case 'moving':p._unique.lastMoved=state.time;break;
  case 'companion':case 'companionKill':{
   const mi=new Minion('wolf',{hp:100,dmg:[2,3],speed:3,atkRate:1,range:1},p);state.minions.push(mi);if(power.when==='companionKill')e.source=mi;break;
  }
  case 'undeadSource':target.type='undead';break;
  case 'demonSource':target.type='demon';break;
  case 'elemental':e.elem='cold';break;
  case 'summon':e.skill=D.SKILLS.raise_dead;break;
  case 'curse':e.skill=D.SKILLS.gravebinder_2_1;break;
  case 'form':e.skill=D.SKILLS.fangform;break;
  case 'shout':e.skill=Object.values(D.SKILLS).find(s=>s.type==='shout');break;
  case 'mobility':e.skill=D.SKILLS.emberwitch_2_4;break;
  case 'trap':e.skill=D.SKILLS.veilranger_1_0;break;
  default:if(['fire','cold','light','poison','shadow','earth'].includes(power.when))e.elem=power.when;
 }
 return e;
}
function trigger(p,power,e){
 if(power.alternate){Q.emit(p,power.event,{...e,kind:'strike'});Q.emit(p,power.event,{...e,kind:'spell'});}
 else if(power.alternateElement){Q.emit(p,power.event,{...e,elem:'fire'});Q.emit(p,power.event,{...e,elem:'cold'});}
 else for(let n=0;n<(['spend','move','overheal'].includes(power.event)?1:power.every||1);n++)Q.emit(p,power.event,e);
}
for(const entry of Object.values(Q.catalog))for(const [mode,power]of entry.powers.entries()){
 if(power.event==='equip')continue; // Equipment is covered by unique_equipment_contract.
 powers++;
 const sig=mechanicSignature(power);ok(!signatures.has(sig),`${entry.id} repeats ${signatures.get(sig)} mechanically`);signatures.set(sig,entry.id);
 const text=Q.describe(entry,power);ok(text.length>40&&!/undefined|NaN/.test(text),`${entry.id}: readable power`);
 const {p,state,target}=fresh();equip(p,entry.id,mode?'arm':'wpn');
 if(!p.equip.chest){p.equip.chest=I.fromBase('quiltvest');p.equip.chest.armor=100;p.computeStats();}
 p.hp=p.stats.maxHp*.5;p.mana=p.stats.maxMana*.5;
 const e=prepare(p,state,target,power),before=plain(p.stats),hp=p.hp,mana=p.mana,enemyHp=state.monsters.reduce((n,m)=>n+m.hp,0);
 Q.emit(p,'unrelated-event',e);ok(!p.buffs.some(b=>b.uniqueKey),`${entry.id}: unrelated event`);
 trigger(p,power,e);
 ok(p._unique.states.get(entry.id+(entry.powers.length===2?(mode?':arm':':wpn'):''))?.ready>state.time,`${entry.id}/${mode}: trigger fired`);
 for(const effect of power.effects){
  switch(effect.kind){
   case 'buff':for(const [stat,val]of Object.entries(effect.stats)){
    const name=stat==='armorPct'?'armor':stat,el={fireDmg:'fire',coldDmg:'cold',lightDmg:'light',poisonDmg:'poison'}[stat];const afterValue=el?p.stats.elem[el]:p.stats[name]??p.stats.attr[name],beforeValue=el?before.elem[el]:before[name]??before.attr[name];
    ok(afterValue>beforeValue||(['dodge','resAll','resFire','resCold','resLight','resPoison','ccReduce'].includes(stat)&&p.buffs.some(b=>b.stats[stat]===val)),`${entry.id}: ${stat} changes live stats`);
   }break;
   case 'barrier':{const ward=p.buffs.find(b=>b.uniqueBarrier);ok(ward?.uniqueBarrier>0,`${entry.id}: barrier`);approx(Q.absorb(p,2),0,`${entry.id}: absorbs damage`);break;}
   case 'heal':ok(p.hp>hp,`${entry.id}: heals`);break;
   case 'mana':ok(p.mana>mana,`${entry.id}: restores Aether`);break;
   case 'empower':ok(Q.empower(p,effect.attack,100)>100,`${entry.id}: empowered damage`);approx(Q.empower(p,effect.attack,100),100,`${entry.id}: charge consumed`);break;
   case 'expose':ok(Q.exposed(target)>=effect.pct,`${entry.id}: exposure`);break;
   case 'dot':{const hp=target.hp;state.time+=.1;Q.tickDots(target,.1);ok(target.hp<hp,`${entry.id}: damage over time`);state.time-=.1;break;}
   case 'slow':ok(state.monsters.some(m=>m.slowT>=effect.dur),`${entry.id}: slows enemies`);break;
   case 'nova':case 'chain':ok(state.monsters.reduce((n,m)=>n+m.hp,0)<enemyHp,`${entry.id}: damages enemies`);break;
   case 'skill':{const base=K.resolve(p,effect.skill),modified=p.resolveSkill(effect.skill);ok(modified[effect.path](10)>base[effect.path](10),`${entry.id}: modifies skill`);const snapshot=modified[effect.path](10);p.buffs=p.buffs.filter(b=>!b.uniqueSkill);approx(modified[effect.path](10),snapshot,`${entry.id}: cast snapshot`);break;}
  }
 }
 const enemies=state.monsters.map(m=>m.hp);trigger(p,power,e);assert.deepEqual(state.monsters.map(m=>m.hp),enemies);checks++;
 const cooldowns=[...p._unique.states.values()].map(s=>s.ready);
 p.equip={};p.inv.items=[];p.computeStats();ok(!p._unique.active.length&&!p.buffs.some(b=>b.uniqueKey),`${entry.id}: removal clears powers`);
 equip(p,entry.id,mode?'arm':'wpn');assert.deepEqual([...p._unique.states.values()].map(s=>s.ready),cooldowns);checks++;
}
// Real combat entrypoints for the unchanged shared socketable powers.
{
 const {p,state,target}=fresh();equip(p,'uj_rage');p.tryHit=()=>false;p.strike(target,1);ok(!p._unique.states.size,'miss cannot charge power');
 p.tryHit=()=>true;for(let i=0;i<5;i++)p.strike(target,1);ok(p._unique.states.get('uj_rage').ready===5,'five real strikes trigger jewel');
}
{
 const {p}=fresh();equip(p,'uc_mystic');p.pay({mana:()=>60},1);ok(p.buffs.some(b=>b.stats.fcr===15),'real Aether spending triggers charm');
}
{
 const {p,target}=fresh();equip(p,'uj_seer');for(let i=0;i<4;i++)Q.emit(p,'cast',{skill:D.SKILLS.vanguard_0_0});
 ok(p.buffs.some(b=>b.uniqueEmpower),'cast jewel grants empowerment');p.spellHit(target,20,'fire',{});ok(!p.buffs.some(b=>b.uniqueEmpower&&b.until>0),'real spell consumes empowerment');
}
{
 const {p,target}=fresh();equip(p,'g_titan','arm');p.stats.block=100;p.tryBlock(target);ok(p.buffs.some(b=>b.stats.str===20),'real block activates armor glyph');
}
{
 const {p,target}=fresh();equip(p,'uj_oak');p.takeDamage(10,target);ok(p.buffs.some(b=>b.uniqueBarrier),'real incoming hit activates barrier');
 const hp=p.hp;p.takeDamage(1,target);approx(p.hp,hp,'barrier absorbs subsequent damage');
}
{
 const {p,state}=fresh();equip(p,'g_wraith','arm');Q.tick(p);for(let i=0;i<14;i++){state.time+=.1;p.x+=.8;Q.tick(p);}ok(p.buffs.some(b=>b.stats.dodge),'walking triggers armor glyph');
}
{
 const {p,target}=fresh();equip(p,'g_wraith');const mi=new Minion('wolf',{hp:100,dmg:[2,3],speed:3,atkRate:1,range:1},p);
 target.takeDamage(1e9,mi);ok(p.buffs.some(b=>b.uniqueEmpower),'owned companion kill attributed');
}
{
 const {p,state,target}=fresh();equip(p,'g_wraith');target.takeDamage(1e9,state.monsters[1]);ok(!p.buffs.some(b=>b.uniqueKey),'enemy infighting does not grant kill power');
}
{
 const {p,target}=fresh();equip(p,'g_wraith');Q.guarded(p,()=>target.takeDamage(1e9,p));ok(!p.buffs.some(b=>b.uniqueKey),'proc kills cannot recursively trigger powers');
}
{
 const {p,target}=fresh();target.hp=1;approx(target.takeDamage(1e9,p),1,'actual damage excludes overkill');
}
{
 const {p,target}=fresh();equip(p,'uj_rage');target.encounter={canDamage:()=>false};approx(target.takeDamage(100,p,{uniqueEvent:'strike'}),0,'protected boss damage');ok(!p._unique.states.size,'protected boss grants no hit triggers');
}
{
 const {p}=fresh('wildkeeper');equip(p,'uc_quick');equip(p,'uc_quick');ok(Q.collect(p).filter(a=>a.key==='uc_quick').length===1,'duplicate charms');
 p.equip.ring1=item('u_marrow');p.equip.ring2=item('u_marrow');p.computeStats();ok(Q.collect(p).filter(a=>a.key==='u_marrow').length===1,'duplicate class powers');
}
{
 const {p,target}=fresh();equip(p,'g_wraith');target.hp=1;
 const mi=new Minion('wolf',{hp:100,dmg:[2,3],speed:3,atkRate:1,range:1},p);mi.x=target.x;mi.y=target.y;mi.thornsFlat=10;mi.takeDamage(1,target);
 ok(target.dead&&p.buffs.some(b=>b.uniqueEmpower),'companion reflected-damage kill attributed');
}
for(const id of expected){
 const original=item(id);original.gx=2;original.gy=3;
 const once=G.reviveItem(plain(G.serializeItem(original))),twice=G.reviveItem(plain(G.serializeItem(once)));
 assert.deepEqual(plain(G.serializeItem(once)),plain(G.serializeItem(twice)));checks++;
 ok(once.uniqueId===original.uniqueId&&once.gx===2&&once.gy===3,`${id}: save identity`);
 assert.deepEqual(plain(once.affixes),plain(original.affixes));checks++;
}
{
 const {p,target}=fresh();equip(p,'uj_seer');for(let i=0;i<4;i++)Q.emit(p,'cast',{});target.encounter={canDamage:()=>false};
 p.spellHit(target,100,'fire',{});ok(p.buffs.some(b=>b.uniqueEmpower&&b.until>0),'protected boss does not consume empowered hit');
}
{
 const {p,state,target}=fresh();equip(p,'g_doom');target.type='demon';Q.emit(p,'strike',{target,damage:1});
 const dot=target.uniqueDots[0],hp=target.hp,damage=dot.dps*3*(1-target.elemRes(dot.elem)/100);
 for(let i=1;i<=180;i++){state.time=i/60;Q.tickDots(target,1/60);}approx(hp-target.hp,damage,'small DoT values are not rounded up each frame');
}
{
 const {p,state,target}=fresh();equip(p,'g_wraith');target.hp=1;
 const bolt=new Projectile({x:target.x,y:target.y,tx:target.x+1,ty:target.y,speed:1,kind:'venom',minionDmg:10,minionSource:{owner:p}});
 bolt.update(.01,state.map,p,state.monsters);ok(p.buffs.some(b=>b.uniqueEmpower),'companion projectile kill attributed');
}
{
 const old=G.serializeItem(item('u_gravebite'));old.af=[{stat:'hp',val:9999}];old.id=false;
 const migrated=G.reviveItem(plain(old));assert.deepEqual(plain(migrated.affixes),plain(item('u_gravebite').affixes));checks++;
 ok(!migrated.identified&&Q.lines(migrated).length===0,'old unidentified item upgraded without revealing power');
}
{
 const host=I.fromBase('handaxe');host.sockets=[{jewel:true,name:'Prismfire Jewel',jcol:'#c060d0',affixes:[{stat:'resAll',val:12},{stat:'hp',val:25}]}];
 const revived=G.reviveItem(plain(G.serializeItem(host)));ok(revived.sockets[0].uniqueId==='uj_rainbow','legacy jewel recovered');
 const unknown={jewel:true,name:'Unknown',jcol:'#fff',affixes:[{stat:'hp',val:7}]};assert.deepEqual(plain(Q.migrateSocket(plain(unknown))),unknown);checks++;
}
for(const cls of Object.keys(D.CLASSES)){
 const {p,target}=fresh(cls);equip(p,'uc_mystic');equip(p,'u_marrow');equip(p,'uj_rage');
 if(cls==='veilranger'){p.equip.main=I.fromBase('huntbow');p.computeStats();}
 const sk=D.SKILLS[{vanguard:'vanguard_0_0',emberwitch:'emberwitch_0_0',gravebinder:'venom_spit',wildkeeper:'call_wolf',veilranger:'veilranger_0_0'}[cls]];
 p.mana=p.stats.maxMana;ok(p.performSkill(sk.id,target,{x:11,y:10}),`${cls}: skill cast with uniques`);G.__uniqueTest.flush(2);
 ok(Number.isFinite(p.hp)&&Number.isFinite(p.mana),`${cls}: finite resources`);
}
console.log(`PASS ${checks} shared Unique checks: ${expected.length} items, ${powers} unchanged socketable powers, combat and migration.`);
