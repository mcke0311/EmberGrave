import assert from 'node:assert/strict';
import fs from 'node:fs';
import {D,Q,I,G,K,CS,Monster,Minion,fresh,equip,item,plain} from './unique_fixture.mjs';

const before=JSON.parse(fs.readFileSync(new URL('./fixtures/unique_balance_before.json',import.meta.url),'utf8'));
let checks=0,casts=0;
const ok=(v,m)=>{checks++;assert.ok(v,m);};
const same=(a,b,m)=>{checks++;assert.deepEqual(plain(a),plain(b),m);};
const near=(a,b,m)=>ok(Math.abs(a-b)<1e-7,`${m}: ${a} != ${b}`);
same(D.UNIQUE_CHARMS,before.charms,'brown charms unchanged');
same(D.UNIQUE_JEWELS,before.jewels,'brown jewels unchanged');
same(Object.values(D.GLYPHS).filter(g=>g.unique),before.glyphs,'brown glyphs unchanged');
for(const [id,power] of Object.entries(before.socketPowers))same(Q.catalog[id],power,id+' power unchanged');
same(D.UNIQUES.map(({id,name,base,ilvl})=>({id,name,base,ilvl})),before.equipment.map(({id,name,base,ilvl})=>({id,name,base,ilvl})),'equipment identity and level ladder unchanged');

const trees=new Set(),classes=new Set(),signatures=new Set();
function prepare(classId) {
  const f=fresh(classId),{p,state,target}=f;
  for(const id of Object.keys(p.skills))p.skills[id]=1;
  if(classId==='veilranger')p.equip.main=I.fromBase('huntbow');
  p.computeStats();p.hp=p.stats.maxHp*.5;p.mana=p.stats.maxMana;p.tempo=3;p.staticChg=12;
  target.quarry={stacks:3,until:20};target.curseFrailty={pct:10,until:20};target.scorch={stacks:3,dps:4,until:20};
  for(let i=0;i<4;i++)state.monsters.push({dead:true,hp:0,corpseT:20,x:11+i,y:11,radius:.3});
  const companion=new Minion('wolf',{hp:200,dmg:[5,10],speed:3,atkRate:1,range:1,sprite:'wolf'},p);
  companion.sourceSkill='call_wolf';companion.hp=50;state.minions.push(companion);
  return f;
}
function evaluate(skill,path,rank){return K.valueAt(skill,path,rank);}
function values(skill,rank){return Object.fromEntries(Object.entries(skill).filter(([k])=>!['desc','selectedPerks'].includes(k)).map(([k,v])=>[k,typeof v==='function'?v(rank):v]));}

for(const def of D.UNIQUES){
  const entry=Q.catalog[def.id],power=entry.powers[0],scope=power.target;
  ok(power.event==='equip'&&!!D.CLASSES[scope.classId],def.id+' has explicit class power');
  for(const effect of power.effects)if(effect.kind==='rank'){
    const thresholds=scope.skill?[1,25,50,75]:scope.tree!=null?[1,35,60]:[1,60];
    near(effect.value,thresholds.filter(level=>level<=def.ilvl).length,def.id+' authored rank breakpoint');
  }
  classes.add(scope.classId);if(scope.tree!=null)trees.add(scope.classId+'/'+scope.tree);
  const sig=JSON.stringify({scope,effects:power.effects.map(({kind,path,op})=>({kind,path,op}))});
  ok(!signatures.has(sig),def.id+' mechanically distinct target and effect');signatures.add(sig);
  ok(Object.keys(def.stats).length>=3&&Object.keys(def.stats).length<=4,def.id+' curated support count');
  const old=before.equipment.find(d=>d.id===def.id);
  for(const [stat,v] of Object.entries(def.stats)){
    ok(Number.isFinite(v)&&v>0,def.id+' valid '+stat);
    if(old.stats[stat]!=null)ok(v>=old.stats[stat],def.id+' did not lower '+stat);
    // Independent budget check, including highest compound-affix contribution.
    const b=D.BASES[def.base];
    const pool=D.AFFIXES.filter(a=>!a.proc&&!a.perLevel&&a.tiers.some(t=>t.ilvl<=def.ilvl&&(a.stat===stat||t.mods?.some(m=>m.stat===stat))));
    const local=pool.filter(a=>(a.slots.includes('any')||a.slots.includes(b.slot))&&(!a.cats||a.cats.includes(b.cat)));
    for(const a of local.length?local:pool)for(const tier of a.tiers.filter(t=>t.ilvl<=def.ilvl)){const m=tier.mods?.find(m=>m.stat===stat)||(!tier.mods?tier:null);if(m)ok(v>=Math.round(m.min+.9*(m.max-m.min)),def.id+' eligible-tier '+stat);}
  }
  ok(!/undefined|NaN|Infinity/.test(Q.describe(entry,power)),def.id+' readable power');
  const {p,state,target}=prepare(scope.classId),it=equip(p,def.id);
  p.hp=p.stats.maxHp*.5;p.mana=p.stats.maxMana;
  const skills=Object.values(D.SKILLS).filter(s=>s.cls===scope.classId&&(!scope.skill||s.id===scope.skill)&&(scope.tree==null||s.tree===scope.tree));
  ok(skills.length>0,def.id+' resolves real target');
  for(const sk of skills){
    const rank=p.effRank(sk.id),resolved=p.resolveSkill(sk.id),base=K.resolve(p,sk.id);
    for(const effect of power.effects){
      if(effect.kind==='rank')near(Q.rankBonus(p,sk.id),effect.value,def.id+' learned rank bonus');
      else{
        const a=evaluate(base,effect.path,rank),b=evaluate(resolved,effect.path,rank);
        ok(JSON.stringify(a)!==JSON.stringify(b),def.id+' changes '+effect.path);
        ok([b].flat().every(Number.isFinite),def.id+' finite resolved '+effect.path);
        ok(!/undefined|NaN|Infinity/.test(resolved.desc(rank)),def.id+' talent description');
        // Perks remain first in the composition, and snapshots survive swaps.
        p.skills[sk.id]=10;p.skillPerks[sk.id]={5:K.catalog[sk.id][5][0].id,10:K.catalog[sk.id][10][0].id};
        const withPerks=p.resolveSkill(sk.id),snapshot=values(withPerks,10);
        const held=p.equip;p.equip={};p.computeStats();same(values(withPerks,10),snapshot,def.id+' cast snapshot survives unequip');p.equip=held;p.computeStats();
        p.skills[sk.id]=1;delete p.skillPerks[sk.id];
      }
    }
  }
  // Exercise the actual skill dispatcher and release callbacks for every item.
  // Passive powers are observed through computeStats; class/tree rank powers
  // cast a learned active talent from the affected scope.
  const sk=scope.skill?D.SKILLS[scope.skill]:skills.find(s=>s.type!=='passive');
  p.computeStats();p.mana=p.stats.maxMana;p.hp=p.stats.maxHp*.5;
  if(sk.type==='passive')p.computeStats();
  else{
    if(sk.type==='fireclaw'){p.form='fang';p.buffs.push({id:'form_fang',stats:{},until:Infinity});}
    ok(p.performSkill(sk.id,target,{x:11,y:11}),def.id+' real '+sk.name+' cast');casts++;
    G.__uniqueTest.flush(3);
    const active=p.siphon||p.charging||p.leaping||p.spinning||p.dashing||p.drawing;
    if(active){ok(active.sourceSkill===sk.id,def.id+' ongoing skill identity');for(let i=0;i<35;i++){state.time+=1/60;p.update(1/60);}}
  }
  for(const f of state.fx)for(const key of ['radius','ttl','lo','hi','tickEvery'])if(key in f)ok(Number.isFinite(f[key])&&f[key]>=0,def.id+' finite field '+key);
  ok(Number.isFinite(p.hp)&&Number.isFinite(p.mana),def.id+' finite player resources');
  // In-flight projectiles/fields carry gameplay identity even with no VFX/audio.
  for(const effect of [...state.projectiles.filter(x=>x.fromPlayer),...state.fx.filter(f=>f.owner===p)])ok(!!effect.sourceSkill,def.id+' delayed skill identity');
  p.equip={};p.computeStats();ok(!Q.collect(p).some(a=>a.entry.id===def.id),def.id+' removal disables power');
  p.skills[skills[0].id]=0;equip(p,def.id);near(p.effRank(skills[0].id),0,def.id+' cannot learn from equipment');
  p.skills[skills[0].id]=4;ok(!p.chooseSkillPerk(skills[0].id,5,K.catalog[skills[0].id][5][0].id),def.id+' cannot unlock perk choice');
  const other=prepare(Object.keys(D.CLASSES).find(id=>id!==scope.classId)).p;equip(other,def.id);
  ok(!Q.collect(other).some(a=>a.entry.id===def.id),def.id+' inactive on other class');
  ok(I.statLines(it,other).some(l=>l.t.includes('Inactive for your class')),def.id+' inactive tooltip');
  const equippedStats=plain(other.stats);const held=other.equip;other.equip={};other.computeStats();
  ok(JSON.stringify(equippedStats)!==JSON.stringify(other.stats),def.id+' ordinary stats still apply');other.equip=held;
  const save=G.serializeItem(it);save.af=Object.entries(old.stats).map(([stat,val])=>({stat,val}));save.uv=1;save.gx=2;save.gy=3;save.id=false;save.so=['g_doom'];
  const once=G.reviveItem(plain(save)),twice=G.reviveItem(plain(G.serializeItem(once)));
  same(once.affixes,Object.entries(def.stats).map(([stat,val])=>({stat,val})),def.id+' migrates old stats');
  same(G.serializeItem(once),G.serializeItem(twice),def.id+' idempotent migration');
  ok(!once.identified&&once.gx===2&&once.gy===3&&once.sockets[0]==='g_doom',def.id+' save metadata retained');
}
ok(classes.size===5&&trees.size===15,'all classes and all 15 trees have powers');
{
  const {p}=prepare('wildkeeper');p.equip.ring1=item('u_gen_10_0');p.equip.ring2=item('u_gen_10_0');p.computeStats();
  near(Q.rankBonus(p,'call_wolf'),1,'duplicate class powers do not stack');
  const r=p.effRank('call_wolf');p.equip.ring2=null;p.computeStats();near(p.effRank('call_wolf'),r,'removing one duplicate retains single power');
}
console.log(`PASS ${checks} equipment checks: 139 fresh powers, ${casts} combat casts, all classes/trees, support budgets, gating and migration.`);
