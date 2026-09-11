import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

let rolls=0, random=.5, forbidRandom=false, checks=0;
const math=Object.create(Math); math.random=()=>{rolls++;if(forbidRandom)throw Error('Preview consumed randomness');return random;};
const state={time:0,minions:[],monsters:[],fx:[],traps:[],projectiles:[],map:{activeSurfaceId:0}};
const c=vm.createContext({console,Math:math,Intl,Date,performance,Set,Map,JSON,Uint8Array,Uint16Array,Uint32Array,Float32Array,Uint8ClampedArray,
  window:{addEventListener(){}},document:{},localStorage:{getItem:()=>null,setItem(){}},
  Sfx:new Proxy({},{get:()=>()=>{}}),UI:new Proxy({},{get:()=>()=>{}}),Game:{state,debugFlags:{},fx:{},addFloat(){},addParticle(){},
    addNova(){},skillCast(){},afterDelay(){throw Error('Preview scheduled an action');}},Player3D:{}});
for(const f of ['utils','data','unique_powers','data_overrides','skill_perks','sprite_manifest','mapgen','navigation','items','entities','character_sheet'])
  vm.runInContext(fs.readFileSync(new URL('../js/'+f+'.js',import.meta.url),'utf8'),c,{filename:f});
const {D,P,C,K}=vm.runInContext('({D:DATA,P:Player,C:CharacterSheet,K:SkillPerks})',c);
const ok=(v,m)=>{checks++;assert.ok(v,m);};
const near=(a,b,m)=>ok(Math.abs(a-b)<1e-8,`${m}: ${a} != ${b}`);
const pair=(a,b,m)=>{near(a[0],b[0],m+' min');near(a[1],b[1],m+' max');};
function fresh(cls='vanguard'){
  state.time=0;state.minions=[];state.monsters=[];
  const p=new P('Sheet test',cls);state.player=p;p.lvl=20;
  for(const sk of Object.values(D.SKILLS).filter(s=>s.cls===cls))p.skills[sk.id]=1;
  p.equip.main={kind:'gear',cat:cls==='veilranger'?'bow':'sword',ranged:cls==='veilranger',dmg:[10,20],speed:1,affixes:[]};
  p.computeStats();return p;
}
const skill=(p,type,filter=()=>true)=>Object.values(D.SKILLS).find(s=>s.cls===p.classId&&s.type===type&&filter(s));
function preview(p,id='basic'){
  const before=JSON.stringify({hp:p.hp,mana:p.mana,attr:p.attr,skills:p.skills,stats:p.stats,buffs:p.buffs,tempo:p.tempo,cd:p.skillCd,
    cache:p._perkCache?[...p._perkCache.keys()]:null,fx:state.fx,traps:state.traps,projectiles:state.projectiles});
  const count=rolls;forbidRandom=true;
  let result;try{result=C.preview(p,id,state);}finally{forbidRandom=false;}
  ok(rolls===count,'no random rolls');
  ok(before===JSON.stringify({hp:p.hp,mana:p.mana,attr:p.attr,skills:p.skills,stats:p.stats,buffs:p.buffs,tempo:p.tempo,cd:p.skillCd,
    cache:p._perkCache?[...p._perkCache.keys()]:null,fx:state.fx,traps:state.traps,projectiles:state.projectiles}),'preview preserves player and world');
  for(const a of result.parts){
    for(const e of C.coreElements)ok(a.hit[e]?.length===2,'core element always shown');
    for(const n of [...Object.values(a.hit),...a.dots.map(d=>d.range),a.totalHit,...a.totalEffect?[a.totalEffect]:[]].flat())ok(Number.isFinite(n),'finite preview');
    pair(a.totalHit,Object.values(a.hit).reduce((s,v)=>[s[0]+v[0],s[1]+v[1]],[0,0]),'immediate total');
    if(a.totalEffect)pair(a.totalEffect,a.dots.reduce((s,v)=>[s[0]+v.range[0],s[1]+v.range[1]],a.totalHit.slice()),'effect total');
  }
  return result;
}
{
  const p=fresh();p.stats.dmgPct=50;p.stats.elem={fire:10,cold:20,light:30,poison:12};p.stats.poisonDotPct=25;p.stats.critChance=0;
  const a=preview(p).parts[0];pair(a.hit.phys,[15,30],'physical scaling');pair(a.hit.fire,[6,10],'fire');pair(a.hit.cold,[12,20],'cold');pair(a.hit.light,[1,30],'lightning');
  pair(a.totalHit,[34,90],'all immediate elements');pair(a.dots[0].range,[15,15],'poison scaling');pair(a.totalEffect,[49,105],'hit plus full poison');
  for(const endpoint of [0,1]){random=endpoint;const r=p.rollDamage(1);near(a.totalHit[endpoint],r.phys+r.fire+r.cold+r.light,'agrees with weapon combat roll');}
  p.stats.critChance=75;p.stats.critDmg=999;pair(preview(p).parts[0].totalHit,a.totalHit,'crit excluded');
  p.stats.dmgToFire=1;const fire=preview(p).parts[0];pair(fire.hit.fire,a.totalHit,'conversion combines immediate damage');pair(fire.hit.phys,[0,0],'conversion removes physical');ok(!fire.dots.length,'conversion suppresses weapon poison');
  p.buffs.push({id:'charged',stats:{},until:10,uniqueEmpower:{attack:'strike',pct:40}});
  pair(preview(p).parts[0].totalHit,a.totalHit.map(n=>n*1.4),'active one-shot buff included without consumption');ok(p.buffs.at(-1).until===10,'empower is not consumed');
}
{
  const p=fresh('veilranger');p.stats.elem.poison=12;p.coat={pdot:30,woundDuration:4};p.buffs.push({id:'serrated',stats:{},until:100});p.stats.poisonDotPct=0;
  const a=preview(p).parts[0];ok(a.dots.filter(d=>d.element==='poison').length===1,'coating replaces poison');pair(a.dots[0].range,[40,40],'coat duration uses three-second source');
  const bleed=a.dots.find(d=>d.label==='Master of the Hunt bleed');ok(bleed?.element==='phys'&&bleed.duration===3,'bleed preview is separate physical damage');pair(bleed.range,[9,9],'rank-one bleed total');
  p.stats.elem.poison=60;pair(preview(p).parts[0].dots[0].range,[80,80],'stronger weapon poison retained for coat duration');
  const sk=skill(p,'charge_shot'),s=p.resolveSkill(sk.id),r=p.effRank(sk.id);const q=preview(p,sk.id);
  const base=p.weaponDamage()[0]*(1+p.stats.dmgPct/100);near(q.parts[0].hit.phys[0],base*(s.dmgMin(r)+(s.dmgMax(r)-s.dmgMin(r))*.15),'minimum charge clamps to 15%');
  near(q.parts[1].hit.phys[0],base*s.dmgMax(r),'full charge');
}
{
  const p=fresh('emberwitch'),sk=skill(p,'projectile',s=>s.elem==='fire');p.stats.critChance=0;p.stats.spellPct=35;
  const r=p.effRank(sk.id),resolved=p.resolveSkill(sk.id),a=preview(p,sk.id).parts[0];
  for(const endpoint of [0,1]){random=endpoint;near(a.hit.fire[endpoint],p.spellRoll(resolved,r).dmg,'spell combat roll parity');}
  ok(a.dots.some(d=>d.label.startsWith('Scorch')),'Scorch shown with duration');
  const cold=skill(p,'pierce',s=>s.elem==='cold');p.stats.dmgToFire=1;const converted=preview(p,cold.id).parts[0];ok(converted.hit.fire[0]>0&&converted.hit.cold[1]===0,'spell conversion');ok(!converted.dots.length,'projectile explicitly suppresses conversion burn');
  const nova=skill(p,'freezenova');ok(preview(p,nova.id).parts[0].dots.some(d=>d.label==='Burn'),'converted nova receives default burn');
  const wall=skill(p,'firewall');p.stats.dmgToFire=0;p.stats.attr.wil=500;const fw=preview(p,wall.id).parts[0];pair(fw.hit.fire,p.resolveSkill(wall.id).dmg(p.effRank(wall.id)).map(n=>n*1.35),'field only applies spell power');ok(!fw.dots.length,'wall has no stacking burn');
}
{
  const p=fresh('veilranger'),sk=skill(p,'trap',s=>s.trapKind==='powder');p.stats.trapPct=30;p.stats.critChance=75;p.stats.spellPct=500;
  const r=p.effRank(sk.id),s=p.resolveSkill(sk.id),a=preview(p,sk.id).parts[0];
  pair(a.hit.phys,s.dmg(r).map(n=>n*p.synergyMult(s)*1.3*(1+p.stats.attr.dex/140)),'trap follows physical impact path');pair(a.hit.fire,[0,0],'trap element is not an elemental hit');ok(a.dots.some(d=>d.element==='fire'),'powder burn separate');
}
{
  const p=fresh('wildkeeper'),sk=skill(p,'totem',s=>s.totemKind!=='tempest');p.stats.totemPower=40;p.stats.spellPct=100;p.stats.attr.wil=500;
  pair(preview(p,sk.id).parts[0].hit.light,p.resolveSkill(sk.id).dmg(p.effRank(sk.id)).map(n=>n*1.4),'totem uses own bonus');
  const summon=skill(p,'summon',s=>s.minion==='wolf'),ms=p.resolveSkill(summon.id).minionStats(p.effRank(summon.id));p.stats.minionDmgPct=25;
  pair(preview(p,summon.id).parts[0].hit.phys,ms.dmg.map(n=>n*1.25),'new companion damage');
  state.minions=[{owner:p,sourceSkill:summon.id,beast:true,dmg:[10,20],surfaceId:0,buffUntil:10,buffDmg:20}];
  pair(preview(p,summon.id).parts[0].hit.phys,[15,30],'living companion buffs');
  p.stats.pManaPerBeast=2;p.stats.manaRegen=3;const rows=C.sections(p,state).flatMap(s=>s.rows),up=p.resolveSkill(summon.id).upkeep(p.effRank(summon.id));
  ok(rows.find(r=>r.id==='companionUpkeep').value===C.number(up)+' /s','upkeep');ok(rows.find(r=>r.id==='netMana').value===C.number(5-up)+' /s','net aether flow');
  p.stance='riposte';p.riposteData={drain:3};p.siphon={manaPerSec:2};ok(C.sections(p,state).flatMap(s=>s.rows).find(r=>r.id==='netMana').value===C.number(-up)+' /s','skill drains included');
}
{
  const p=fresh('gravebinder'),sk=skill(p,'siphon_beam'),s=p.resolveSkill(sk.id),rk=p.effRank(sk.id);p.stats.spellPct=1000;
  pair(preview(p,sk.id).parts[0].hit.shadow,[1,1].map(()=>s.tickDmg(rk)*(1+.08*s.tickRate(rk))),'first channel ramp');
  p.siphon={ramp:.59};pair(preview(p,sk.id).parts[0].hit.shadow,[1,1].map(()=>s.tickDmg(rk)*Math.min(1.6,1+.59+.08*s.tickRate(rk))),'next channel ramp');
  const mark=skill(p,'doom'),q=preview(p,mark.id);pair(q.parts[0].hit.shadow,q.parts[1].hit.shadow.map(n=>n*.5),'doom early versus full');
}
{
  const p=fresh();p.buffs.push({id:'test',stats:{resAll:100,ccReduce:100,dmgReducePct:120,dodge:100,block:100},until:100});p.computeStats();
  const rows=C.sections(p,state).flatMap(g=>g.rows);
  for(const id of ['resFire','resCold','resLight','resPoison'])ok(rows.find(r=>r.id===id).value==='75%','effective resistance cap');
  ok(rows.find(r=>r.id==='block').value==='0%','block requires shield');ok(rows.find(r=>r.id==='ccReduce').value==='80%','duration cap');ok(rows.find(r=>r.id==='dmgReducePct').value==='80%','damage reduction cap');
  p.buffs=[];p.stats.resFire=-20;ok(C.sections(p,state).flatMap(s=>s.rows).find(r=>r.id==='resFire').value==='-20%','negative resistance');
  ok(rows.some(r=>r.id==='manaSteal'&&r.value==='0%'),'zero bonus visible');ok(rows.every(r=>r.help.length>35&&!r.help.includes('undefined')),'every stat has explanatory help');
}
let talents=0,variants=0;
for(const cls of Object.keys(D.CLASSES)){
  const p=fresh(cls);p.tempo=3;p.staticChg=12;
  for(const sk of Object.values(D.SKILLS).filter(s=>s.cls===cls)){
    talents++;ok(!!C.classification(sk),'explicit classification '+sk.id);
    for(const rank of [1,10]){p.skills[sk.id]=rank;p.computeStats();const q=preview(p,sk.id);ok(!['unsupported','unlearned'].includes(q.status),sk.id+' preview classification');}
    for(let a=0;a<3;a++)for(let b=0;b<3;b++){
      p.skillPerks[sk.id]={5:K.catalog[sk.id][5][a].id,10:K.catalog[sk.id][10][b].id};p._perkCache=null;p.computeStats();
      const q=preview(p,sk.id);ok(q.parts.length>0||['support','conditional'].includes(q.status),'meaningful preview '+sk.id);variants++;
    }
    delete p.skillPerks[sk.id];p._perkCache=null;
  }
}
ok(talents===107,'all current talents covered');
console.log(`PASS ${checks} character-sheet checks: ${talents} talents, ${variants} perk variants, combat ranges, totals, recovery and read-only previews.`);
