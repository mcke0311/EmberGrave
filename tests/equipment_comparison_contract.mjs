import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

let noRandom=false,checks=0;
const math=Object.create(Math);math.random=()=>{if(noRandom)throw Error('Inspection rolled randomness');return .5;};
const state={time:0,minions:[],monsters:[],fx:[],traps:[],projectiles:[],map:{activeSurfaceId:0}};
const ctx=vm.createContext({console,Math:math,Intl,Date,performance,Set,Map,JSON,Uint8Array,Uint16Array,Uint32Array,Float32Array,Uint8ClampedArray,
  window:{addEventListener(){}},document:{},localStorage:{getItem:()=>null,setItem(){throw Error('Inspection saved');}},
  Sfx:new Proxy({},{get:()=>()=>{}}),UI:new Proxy({},{get:()=>()=>{}}),Player3D:{},
  Game:{state,debugFlags:{},fx:{},afterDelay(){throw Error('Inspection scheduled gameplay');}}});
for(const f of ['utils','data','unique_powers','data_overrides','skill_perks','sprite_manifest','mapgen','navigation','items','entities','character_sheet'])
  vm.runInContext(fs.readFileSync(new URL('../js/'+f+'.js',import.meta.url),'utf8'),ctx,{filename:f});
const {D,P,I,C,U}=vm.runInContext('({D:DATA,P:Player,I:Items,C:CharacterSheet,U:UniquePowers})',ctx);
const ok=(v,m)=>{assert.ok(v,m);checks++;};
const near=(a,b,m)=>ok(Math.abs(a-b)<1e-8,m+': '+a+' != '+b);
const plain=v=>JSON.parse(JSON.stringify(v));
function fresh(cls='vanguard'){
  state.minions=[];const p=new P('Inspection contract',cls);state.player=p;p.lvl=70;p.inv=I.makeGrid(10,4);p.equip={};
  for(const sk of Object.values(D.SKILLS).filter(s=>s.cls===cls))p.skills[sk.id]=1;
  p.skillL='basic';p.computeStats();return p;
}
const gear=slot=>I.fromBase(Object.keys(D.BASES).find(id=>D.BASES[id].slot===slot));
function assertStats(p,item,slot){
  const before=plain(p.stats),model=C.equipmentComparison(p,item,slot,p.inv);
  ok(!model.plan.reason,'valid projection');
  p.equip=model.plan.nextEquip;p.computeStats();
  for(const row of model.rows){
    if(row.range){const hit=C.preview(p,p.skillL).parts[0].hit,total=Object.values(hit).reduce((a,b)=>a.map((v,i)=>v+b[i]),[0,0]);row.after.forEach((v,i)=>near(v,total[i],p.classId+' attack after equip'));}
    else {const key={'Armor':'armor','Maximum Life':'maxHp','Maximum Aether':'maxMana','Fire resistance':'resFire','Cold resistance':'resCold','Lightning resistance':'resLight','Poison resistance':'resPoison'}[row.label];near(row.before,before[key],p.classId+' current '+key);near(row.after,p.stats[key],p.classId+' after '+key);}
  }
  return model;
}
// Independently check projections against actual recomputation for every class,
// including caster scaling, passive ranks, equipped sockets and resistance caps.
for(const cls of Object.keys(D.CLASSES)){
  const p=fresh(cls),old=gear('chest');p.equip.chest=old;
  const item=gear('chest');item.affixes=[{stat:'vit',val:8},{stat:'wil',val:11},{stat:'armorPct',val:27},{stat:'skillAll',val:2},{stat:'spellPct',val:40},{stat:'resAll',val:100}];
  item.sockets=[{kind:'jewel',jewel:true,affixes:[{stat:'hp',val:15},{stat:'mana',val:20}]}];I.autoPlace(p.inv,item);
  p.skillL=Object.values(D.SKILLS).find(s=>s.cls===cls&&['projectile','melee','combo','shockwave'].includes(s.type)&&!s.requiredWeapons)?.id||'basic';p.computeStats();assertStats(p,item,'chest');
}
{
  const p=fresh(),old=I.fromBase('shortsword'),item=I.fromBase('shortsword');p.equip.main=old;
  item.affixes=[{stat:'dmgPct',val:3,perLevel:true},{stat:'dmgFlat',val:2},{stat:'fireDmg',val:9}];
  item.sockets=[{jewel:true,affixes:[{stat:'dmgFlat',val:4}]}];I.autoPlace(p.inv,item);p.computeStats();assertStats(p,item,'main');
}
{
  const p=fresh(),a=gear('ring'),b=gear('ring'),incoming=gear('ring');p.equip={ring1:a,ring2:b};I.autoPlace(p.inv,incoming);
  const before=JSON.stringify([p.equip,p.inv]);const plan=I.planEquip(p,incoming,'ring2',p.inv);
  ok(plan.nextEquip.ring1===a&&plan.nextEquip.ring2===incoming,'explicit Ring II keeps Ring I');ok(plan.displaced.length===1&&plan.displaced[0].item===b,'only selected ring is displaced');
  ok(JSON.stringify([p.equip,p.inv])===before,'planning does not move items');ok(!!I.planEquip(p,incoming,'chest',p.inv).reason,'incompatible target is rejected');
  p.equip={ring1:a};ok(I.planEquip(p,incoming,null,p.inv).slot==='ring2','empty ring slot defaults safely');
}
{
  const p=fresh(),old=I.fromBase('shortsword'),off=gear('off'),incoming=I.fromBase(Object.keys(D.BASES).find(id=>D.BASES[id].twoHand));
  p.equip={main:old,off};p.inv=I.makeGrid(incoming.w,incoming.h);I.place(p.inv,incoming,0,0);
  const before=JSON.stringify([p.equip,p.inv]);const blocked=I.planEquip(p,incoming,'main',p.inv);
  ok(blocked.displaced.length===2,'two-hand swap lists weapon and off hand');ok(!!blocked.reason,'both displaced pieces must fit');ok(JSON.stringify([p.equip,p.inv])===before,'blocked swap retains every item');
  p.inv=I.makeGrid(10,4);I.place(p.inv,incoming,0,0);const plan=I.planEquip(p,incoming,'main',p.inv);ok(!plan.reason&&plan.placements.length===2,'two displaced pieces fit atomically');
  I.remove(p.inv,incoming);for(const a of plan.placements){ok(I.fits(p.inv,a.item,a.x,a.y),'projected placement fits');I.place(p.inv,a.item,a.x,a.y);}
  p.equip=plan.nextEquip;ok(p.equip.main===incoming&&!p.equip.off&&p.inv.items.includes(old)&&p.inv.items.includes(off),'two-hand commit keeps both old items in bag');
  const shield=gear('off');I.autoPlace(p.inv,shield);const reverse=I.planEquip(p,shield,'off',p.inv);ok(!reverse.nextEquip.main&&reverse.displaced[0].item===incoming,'off-hand swap displaces two-hand weapon');
}
{
  const p=fresh(),old=I.fromBase('shortsword'),incoming=I.fromBase('shortsword');p.equip.main=old;p.inv=I.makeGrid(incoming.w,incoming.h);I.place(p.inv,incoming,0,0);
  ok(!I.planEquip(p,incoming,'main',p.inv).reason,'full bag swap uses incoming vacated cells');
  ok(!!I.planEquip(p,incoming,'main',I.makeGrid(10,6)).reason,'item from stash cannot reclaim bag cells');
  incoming.identified=false;const unidentified=C.equipmentComparison(p,incoming,'main',p.inv);ok(unidentified.rows.length===0&&/Identify/.test(unidentified.plan.reason),'unidentified gear never exposes hidden stats');
  incoming.identified=true;incoming.reqLvl=99;ok(/Level 99/.test(I.planEquip(p,incoming,'main',p.inv).reason),'level requirement is visible');
}
{
  const p=fresh('veilranger'),bow=I.fromBase(Object.keys(D.BASES).find(id=>D.BASES[id].cat==='bow'));p.equip.main=bow;
  const s=Object.values(D.SKILLS).find(s=>s.cls===p.classId&&s.type==='charge_shot');p.skillL=s.id;const sword=I.fromBase('shortsword');I.autoPlace(p.inv,sword);p.computeStats();
  const model=C.equipmentComparison(p,sword,'main',p.inv),actual=C.preview(p,s.id).parts[0];
  const hit=Object.values(actual.hit).reduce((a,b)=>a.map((v,i)=>v+b[i]),[0,0]);model.rows[0].before.forEach((v,i)=>near(v,hit[i],'minimum draw baseline, not sum of two charge states'));
  ok(model.notes.some(n=>/compatible weapon/.test(n)),'weapon assignment incompatibility is explained');
  ok(model.rows[0].after===null,'an unusable Attack has no misleading damage range');
}
{
  const p=fresh('wildkeeper'),unique=I.makeUnique(D.UNIQUES.find(u=>u.id==='u_marrow'));unique.identified=true;p.equip.main=unique;U.sync(p);
  const key=U.collect(p)[0].key;p._unique.states.set(key,{count:4,ready:17,target:{id:'enemy'},lastKind:'strike'});p.buffs=[{uniqueKey:key,stats:{vit:9},until:99}];
  const summon=Object.values(D.SKILLS).find(s=>s.cls===p.classId&&s.type==='summon'),m={owner:p,sourceSkill:summon.id,x:p.x,y:p.y,surfaceId:p.surfaceId,auraRadius:10,auraStats:{resAll:12},die(){throw Error('Inspection killed companion');}};
  state.minions=[m];p.computeStats();p.hp=1;p.mana=0;p.drawing={charge:.5};p.command={skill:summon.id};p._perkCache=new Map([['keep',{test:true}]]);
  const incoming=I.fromBase('shortsword');I.autoPlace(p.inv,incoming);
  const before=JSON.stringify([p.equip,p.inv,p.stats,p.buffs,[...p._unique.states],p._unique.active,p.hp,p.mana,p.drawing,p.command,[...p._perkCache],p._hadArrowWeapon,p._weaponSkillEpoch]);
  noRandom=true;const model=C.equipmentComparison(p,incoming,'main',p.inv);noRandom=false;
  ok(JSON.stringify([p.equip,p.inv,p.stats,p.buffs,[...p._unique.states],p._unique.active,p.hp,p.mana,p.drawing,p.command,[...p._perkCache],p._hadArrowWeapon,p._weaponSkillEpoch])===before,'inspection preserves resources, unique trigger state, buffs, actions, inventory and caches');
  ok(model.rows.find(r=>r.label==='Fire resistance').after===12,'preview keeps companion aura ownership');ok(model.notes.some(n=>n.startsWith('Lose ')),'lost unique power is described');
}
{
  const p=fresh(),defs=D.SET_ITEMS.filter(it=>it.set===D.SET_ITEMS[0].set),a=I.makeSetItem(defs[0]),b=I.makeSetItem(defs[1]);a.identified=b.identified=true;p.equip[a.slot]=a;p.equip[b.slot]=b;p.computeStats();
  const item=gear(a.slot);I.autoPlace(p.inv,item);const model=C.equipmentComparison(p,item,a.slot,p.inv);ok(model.notes.some(n=>/Lose .*2-piece bonus/.test(n)),'broken set threshold is visible');
}
console.log(`PASS ${checks} equipment projection, packing, damage parity and read-only checks`);
