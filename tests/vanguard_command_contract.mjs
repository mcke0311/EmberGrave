import assert from 'node:assert/strict';
import test from 'node:test';
import {D, G, I, M, Monster, Player, U, ctx, fresh} from './unique_fixture.mjs';

const guard = 'recruit_shieldguard', bow = 'recruit_bowman', banner = 'recruit_standard_bearer';
function arena() {
  const {p,state} = fresh();
  p.skills = {}; p.skillPerks = {}; p.lvl = 1; p.computeStats(); p.mana = p.stats.maxMana;
  state.monsters = [];
  return {p,state};
}
function recruit(p,id) {
  assert.ok(p.performSkill(id,null,p));
  G.__uniqueTest.flush(G.state.time+1);
  return p.companySoldiers().filter(m=>m.sourceSkill===id).at(-1);
}
function foe(state,x,y,surfaceId=0) {
  const m=new Monster('frost_risen',x,y);m.surfaceId=surfaceId;m.hp=m.maxHp=1000;
  state.monsters.push(m);return m;
}
function pick(p,id,tier,index) {
  assert.ok(p.chooseSkillPerk(id,tier,D.SKILL_PERKS[id][tier][index].id));
}
const near = (a,b) => assert.ok(Math.abs(a-b)<1e-8,`${a} differs from ${b}`);

test('old combat paths, skill IDs, and both types of Arms gear survive the merge',()=>{
  const {p}=arena(), skills=Object.values(D.SKILLS).filter(s=>s.cls==='vanguard');
  assert.deepEqual(Array.from(D.CLASSES.vanguard.trees),['Arms','Warcries','Command']);
  assert.deepEqual([0,1,2].map(i=>skills.filter(s=>s.tree===i).length),[14,6,7]);
  assert.deepEqual(skills.filter(s=>s.tree===0&&s.reqLvl===1).map(s=>s.id),['vanguard_0_0','vanguard_2_0']);
  assert.equal(D.SKILLS.ground_slam.prereq,'vanguard_2_2');
  p.skills={vanguard_0_0:1,vanguard_2_0:1,[guard]:1};
  p.equip.head={affixes:[{stat:'skillTree_vanguard_2',val:2},{stat:'skillTree_vanguard_command',val:1}]};
  p.computeStats();
  assert.equal(p.effRank('vanguard_0_0'),3);assert.equal(p.effRank('vanguard_2_0'),3);assert.equal(p.effRank(guard),2);
  assert.equal(D.STAT_TEXT.skillTree_vanguard_2(2),'+2 to Arms Talents');
  assert.equal(D.AFFIXES.some(a=>a.stat==='skillTree_vanguard_2'),false);
  const doctrine=I.makeUnique(D.UNIQUES.find(u=>u.id==='u_gen_0_2'));
  doctrine.identified=true;
  p.equip={ [doctrine.slot]:doctrine };p.computeStats();
  assert.equal(p.effRank('vanguard_2_0'),2);assert.equal(p.effRank(guard),1);
});

test('a starting guard sustains itself, cleaves a pack and follows focus or recall',()=>{
  const {p,state}=arena();
  assert.equal(p.canBindSkill('field_orders'),false);p.skills[guard]=1;
  assert.equal(p.canBindSkill('field_orders'),true);
  const start=p.mana, g=recruit(p,guard);
  near(p.mana,start-4);near(p.companionUpkeep(),1);near(p.stats.manaRegen,1.46);
  g.x=p.x;g.y=p.y;
  const front=foe(state,p.x+1,p.y), side=foe(state,p.x+1,p.y+.5), rear=foe(state,p.x-.6,p.y);
  const upper=foe(state,p.x+.4,p.y,1);
  assert.ok(p.performSkill('field_orders',front));assert.equal(p.companyFocus,front);
  g.update(.05,p,state.map);G.__uniqueTest.flush(state.time+1);
  assert.ok(front.hp<1000 && side.hp<1000);assert.equal(rear.hp,1000);assert.equal(upper.hp,1000);
  assert.equal(p.performSkill('field_orders',upper),false);assert.equal(p.companyFocus,front);
  const mana=p.mana;assert.ok(p.performSkill('field_orders',null,p));assert.equal(p.companyFocus,null);near(mana,p.mana);
  state.time+=6;p.update(.01);assert.equal(p.companyOrderUntil,0);
});

test('Shieldwall Drill improves the chance to block a frontal hit',()=>{
  const {p}=arena();p.skills={[guard]:1};
  const unit=recruit(p,guard),[dx,dy]=U.screenVecToWorld(unit.visAng);
  const front={x:unit.x+dx,y:unit.y+dy},behind={x:unit.x-dx,y:unit.y-dy};
  const originalRandom=ctx.Math.random;
  try {
    ctx.Math.random=()=>.21;
    assert.equal(unit.tryBlock(front),false);
    p.skills.shieldwall_drill=1;p.computeStats();
    assert.equal(unit.tryBlock(front),true);assert.equal(unit.tryBlock(behind),false);
    unit.stunT=.5;assert.equal(unit.tryBlock(front),false);
  } finally {ctx.Math.random=originalRandom;}
});

test('caps, per-role upkeep, volleys, banner pulse and partial-company assaults',()=>{
  const {p,state}=arena();p.lvl=24;
  p.skills={[guard]:1,[bow]:1,[banner]:1,coordinated_assault:1};p.computeStats();p.mana=p.stats.maxMana;
  recruit(p,guard);recruit(p,guard);assert.equal(p.companySoldiers().length,1);
  p.skills.shieldwall_drill=1;p.skills.volley_drill=1;p.skills.field_logistics=15;p.computeStats();
  recruit(p,guard);recruit(p,bow);recruit(p,bow);recruit(p,banner);recruit(p,banner);
  const soldiers=p.companySoldiers();assert.equal(soldiers.length,5);near(p.companionUpkeep(),2.5);
  const target=foe(state,p.x+1,p.y);
  for(const m of soldiers){m.x=p.x;m.y=p.y;}
  assert.ok(p.performSkill('coordinated_assault',target));near(p.skillCd.coordinated_assault,state.time+12);
  assert.equal(p.performSkill('coordinated_assault',target),false);
  for(const m of soldiers)m.update(.02,p,state.map);
  assert.equal(state.projectiles.filter(a=>a.kind==='arrow').length,6);assert.ok(target.hp<1000);
  const carrier=soldiers.find(m=>m.kindId==='standard_bearer');
  near(carrier.auraPulseUntil,state.time+3);
  for(const m of soldiers)if(m!==carrier)m.die();
  state.time+=13;assert.ok(p.performSkill('coordinated_assault',target));near(carrier.auraPulseUntil,state.time+3);
  p.spendAether(p.mana);assert.equal(p.companySoldiers().length,0);near(p.companionUpkeep(),0);
  state.time+=13;p.mana=50;assert.equal(p.performSkill('coordinated_assault',target),false);near(p.mana,50);
});

test('a living standard updates allies and pets immediately with strongest-per-stat stacking',()=>{
  const {p,state}=arena(), ally=new Player('Ally','vanguard');
  state.players.push(ally);ally.x=p.x;ally.y=p.y;
  for(const hero of [p,ally]){hero.lvl=50;hero.skills={[guard]:1,[banner]:10};hero.computeStats();hero.mana=hero.stats.maxMana;}
  const g=recruit(ally,guard), a=recruit(p,banner), b=recruit(ally,banner);
  for(const m of [a,b,g]){m.x=p.x;m.y=p.y;}
  pick(p,banner,5,0);pick(ally,banner,5,0);pick(p,banner,10,1);pick(ally,banner,10,2);
  for(const actor of [p,ally,g,b]) {
    const aura=ally.summonAuraStatsFor(actor);
    assert.deepEqual({...aura},{dmgReducePct:5,dmgPct:10,spellPct:10,thorns:15,companyResolve:20});
  }
  g.stunT=g.slowT=1;g.update(.4,ally,state.map);near(g.stunT,.5);near(g.slowT,.5);
  const other=foe(state,p.x+1,p.y);const hp=other.hp;g.takeDamage(4,other);assert.ok(other.hp<hp);
  ally.x=p.x+7;ally.syncSummonAuras();near(ally.stats.dmgReducePct,0);
  a.auraPulseUntil=state.time+3;ally.syncSummonAuras();near(ally.stats.dmgReducePct,5);
  ally.surfaceId=1;ally.syncSummonAuras();near(ally.stats.dmgReducePct,0);
  ally.surfaceId=0;ally.x=p.x;b.die();a.die();near(ally.stats.dmgReducePct,0);assert.deepEqual({...ally.summonAuraStatsFor(g)},{});
});

test('a bowman holds fire through walls and a bearer follows without attacking',()=>{
  const {p,state}=arena();p.skills={[guard]:1,[bow]:1,[banner]:1};
  const archer=recruit(p,bow), bearer=recruit(p,banner), target=foe(state,p.x+4,p.y);
  archer.x=bearer.x=p.x;archer.y=bearer.y=p.y;
  const walk=M.walkable;
  try {M.walkable=(map,x)=>Math.floor(x)!==Math.floor(p.x+2);archer.update(.05,p,state.map);}
  finally {M.walkable=walk;}
  G.__uniqueTest.flush(state.time+1);assert.equal(state.projectiles.length,0);
  assert.ok(p.issueFieldOrders(target));archer.update(.05,p,state.map);bearer.update(.05,p,state.map);
  G.__uniqueTest.flush(state.time+1);assert.equal(state.projectiles.length,1);
  assert.equal(state.projectiles[0].minionSource,archer);assert.notEqual(bearer.action?.state,'attack');
  archer.action=null;archer.attackCd=0;archer.update(.02,p,state.map);
  assert.ok(p.issueFieldOrders(null));G.__uniqueTest.flush(state.time+1);
  assert.equal(state.projectiles.length,1,'recall cancels the arrow still being drawn');
});

test('Mending, March and Fervor affect nearby party members and their soldiers',()=>{
  const {p,state}=arena(), ally=new Player('Ally','vanguard');
  state.players.push(ally);ally.x=p.x;ally.y=p.y;
  for(const hero of [p,ally]){
    hero.lvl=24;hero.skills={[guard]:1,[banner]:10};hero.computeStats();hero.mana=hero.stats.maxMana;
    const bearer=recruit(hero,banner);bearer.x=p.x;bearer.y=p.y;
  }
  const g=recruit(p,guard);g.x=p.x;g.y=p.y;
  pick(p,banner,5,1);pick(p,banner,10,0);pick(ally,banner,5,2);
  assert.equal(ally.stats.lifeRegen,2);assert.equal(p.stats.frw,12);assert.equal(p.stats.ias,12);
  const target=foe(state,p.x+1,p.y);p.issueFieldOrders(target);
  g.hp-=12;const before=g.hp;g.update(.5,p,state.map);
  near(g.hp,before+1);near(g.attackCd,1/(g.atkRate*1.12));
});
