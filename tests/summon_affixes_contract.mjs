import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {ctx,D,Q,I,G,CS,fresh,item,plain,U} from './unique_fixture.mjs';

vm.runInContext(fs.readFileSync(new URL('../js/loot_data.js',import.meta.url),'utf8'),ctx);
const L=vm.runInContext('LootData',ctx);
const stats=['minionDmgPct','minionHpPct'],slots=['main','head','gloves'];
const tiers=[[2,5,10],[15,11,20],[30,21,35],[50,36,50],[70,51,65],[90,66,80]];
let checks=0,casts=0;
const ok=(v,m)=>{checks++;assert.ok(v,m);};
const near=(a,b,m)=>ok(Math.abs(a-b)<1e-7,`${m}: ${a} != ${b}`);
const same=(a,b,m)=>{checks++;assert.deepEqual(plain(a),plain(b),m);};
for(const stat of stats){
  const family=D.AFFIXES.find(a=>a.stat===stat);
  same(family.tiers.map(t=>[t.ilvl,t.min,t.max]),tiers,stat+' explicit tiers');
  same(family.slots,slots,stat+' exact equipment slots');
  ok(family.kind==='p'&&family.group===stat&&family.weight===1&&family.fixedTiers,stat+' normal independent prefix');
  ok(!D.JEWEL_STATS.has(stat)&&!D.CHARM_STATS.has(stat),stat+' equipment only');
  for(const base of [...Object.values(D.BASES),'charm','jewel']){
    const id=typeof base==='string'?base:base.id,allowed=slots.includes(base.slot);
    for(const level of [1,2,14,15,29,30,49,50,69,70,89,90,100]){
      const rows=L.affixes(level,id).filter(r=>r.a.stat===stat);
      ok(rows.every(r=>(r.p>0)===(allowed&&r.t.ilvl<=level)),`${stat}/${id}/${level} eligibility and boundaries`);
    }
  }
  ok(D.STAT_TEXT[stat](25).includes('+25% Summon'),'readable '+stat);
}

// Generate both rarities across every weapon category and the two armor slots.
ctx.summonAffixRng=U.rng(31781);vm.runInContext('Math.random=summonAffixRng',ctx);
const bases=[...new Map(Object.values(D.BASES).filter(b=>slots.includes(b.slot)).map(b=>[b.slot+'/'+b.cat,b])).values()];
for(const base of bases)for(const rarity of ['enhanced','rare']){
  const seen=new Set();
  for(let i=0;i<300;i++){
    const it=I.fromBase(base.id);it.ilvl=95;I.rollAffixesOnto(it,rarity);
    for(const stat of stats){const rolls=it.affixes.filter(a=>a.stat===stat);ok(rolls.length<=1,'no duplicate summon stat');
      for(const a of rolls){seen.add(stat);ok(a.val>=5&&a.val<=80,'generated summon range');}}
  }
  ok(seen.size===2,`${base.cat}/${rarity} rolls both summon affixes`);
}
vm.runInContext('Math.random=()=>.5',ctx);

function gear(p){
  for(const [slot,base,value] of [['main','handaxe',20],['head','cap',15],['gloves','leathergloves',15]]){
    const b=D.BASES[base]||Object.values(D.BASES).find(b=>b.slot===slot);
    const it=I.fromBase(b.id);it.affixes=stats.map(stat=>({stat,val:value}));p.equip[slot]=it;
  }
  p.computeStats();
}
// Every companion family uses the existing summon-Life and live attack-damage
// paths, including the golem's separate creation/rebuilding branch.
for(const skill of Object.values(D.SKILLS).filter(s=>['summon','summon_golem'].includes(s.type))){
  const {p,state,target}=fresh(skill.cls);p.skills={[skill.id]:1};p.skillPerks={};p.equip={};p.computeStats();
  gear(p);near(p.stats.minionDmgPct,50,'damage affixes add across slots');near(p.stats.minionHpPct,50,'Life affixes add across slots');
  p.mana=p.stats.maxMana;state.minions=[];
  state.monsters.push({dead:true,corpseT:20,hp:0,x:11,y:11,radius:.3});
  ok(p.performSkill(skill.id,null,{x:11,y:11}),'summon cast '+skill.name);casts++;G.__uniqueTest.flush(2);
  const mi=state.minions.find(m=>m.sourceSkill===skill.id&&!m.dead);ok(!!mi,'created '+skill.name);
  const sk=p.resolveSkill(skill.id),ms=sk.minionStats?.(1);
  const baseHp=ms?.hp??sk.golemHp?.(1)??130;
  near(mi.maxHp,Math.floor(baseHp*1.5),'summon Life '+skill.name);
  const baseDamage=(mi.dmg[0]+mi.dmg[1])/2,aura=1+(p.summonAuraStatsFor(mi).dmgPct||0)/100;
  near(mi.dmgRoll(),baseDamage*1.5*aura,'live summon damage '+skill.name);
  if(!ms?.noAttack){
    const hp=target.hp,damage=mi.dmgRoll();target.def={...target.def,armor:0,resAll:0};target.takeDamage(damage,mi);
    near(hp-target.hp,damage,'summon combat damage '+skill.name);
    const preview=CS.preview(p,skill.id,state).parts[0].hit.phys;
    near((preview[0]+preview[1])/2,damage,'sheet matches summon combat '+skill.name);
  }
  mi.hp=mi.maxHp/2;const life=mi.hp,maxLife=mi.maxHp;
  p.equip={};p.computeStats();near(mi.hp,life,'unequip does not heal '+skill.name);near(mi.maxHp,maxLife,'summoned Life snapshot '+skill.name);
  near(mi.dmgRoll(),baseDamage*aura,'unequip removes attack bonus '+skill.name);
}

const changed=D.UNIQUES.filter(d=>stats.some(stat=>d.stats[stat]));
ok(changed.length===10,'ten thematic brown items updated');
for(const d of changed){
  ok(slots.includes(D.BASES[d.base].slot),'brown summon stat uses requested slot');
  ok(Object.keys(d.stats).length>=3&&Object.keys(d.stats).length<=4,'brown support budget');
  for(const stat of stats)if(d.stats[stat]){
    const tier=tiers.filter(t=>t[0]<=d.ilvl).at(-1);
    near(d.stats[stat],Math.round(tier[1]+.9*(tier[2]-tier[1])),'brown uses strong summon roll');
    ok(L.byId.get(d.id).stats.some(text=>text.includes(D.STAT_TEXT[stat](d.stats[stat]))),'catalog exports summon stat');
  }
  const it=item(d.id),save=G.serializeItem(it);save.af=save.af.filter(a=>!stats.includes(a.stat));save.uv=2;save.gx=3;save.gy=2;save.id=false;save.so=['g_doom'];
  const loaded=G.reviveItem(plain(save)),again=G.reviveItem(plain(G.serializeItem(loaded)));
  same(loaded.affixes,Object.entries(d.stats).map(([stat,val])=>({stat,val})),'version 2 item gains summon stats');
  same(G.serializeItem(loaded),G.serializeItem(again),'repeat loading is idempotent');
  ok(loaded.uniqueVersion===Q.VERSION&&!loaded.identified&&loaded.gx===3&&loaded.gy===2&&loaded.sockets[0]==='g_doom','saved identity and placement retained');
  ok(I.statLines(it).some(l=>l.t.includes('% Summon')),'brown tooltip describes summon stat');
}
console.log(`PASS ${checks} summon affix checks: exact slots/tiers, magic/rare rolls, ${casts} companion casts, combat/previews, ten brown items and migration.`);
