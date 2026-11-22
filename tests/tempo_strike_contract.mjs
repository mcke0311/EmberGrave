import assert from 'node:assert/strict';
import test from 'node:test';
import {D, G, M, Monster, fresh} from './unique_fixture.mjs';

const tempo = 'vanguard_0_0', sunder = 'vanguard_0_1';
function arena() {
  const {state} = fresh();
  const p = G.coop.makeHero('Tempo test', 'vanguard');
  state.player = p;
  state.players = [p];
  state.monsters = [];
  state.map.zone.lvl = 1;
  p.x = p.y = 10.5;
  assert.equal(p.skillPts, 1);
  assert.equal(p.effRank(tempo), 0);
  p.skills[tempo] = 1;
  p.skillPts--;
  const rolls = [], damage = new Map();
  p.tryHit = mon => { rolls.push(mon); return true; };
  function foe(dx, dy, surfaceId = 0) {
    const mon = new Monster('frost_risen', p.x + dx, p.y + dy);
    mon.surfaceId = surfaceId;
    mon.hp = mon.maxHp = 1000;
    const takeDamage = mon.takeDamage;
    mon.takeDamage = function(amount, ...args) {
      damage.set(this, amount);
      return takeDamage.call(this, amount, ...args);
    };
    state.monsters.push(mon);
    return mon;
  }
  return {p, state, foe, rolls, damage, flush: () => G.__uniqueTest.flush(state.time + 1)};
}

test('one starter swing rolls each foe in the cone once and spends two Aether', () => {
  const {p, foe, rolls, damage, flush} = arena();
  const side = foe(1, .65), primary = foe(1.6, 0), other = foe(1, -.65);
  foe(-1, 0);
  foe(1, 1.9);
  foe(3, 0);
  foe(1, 0, 1);
  const mana = p.mana;
  assert.ok(p.performSkill(tempo, primary));
  assert.equal(p.mana, mana - 2);
  assert.equal(p.tempo, 1);
  assert.deepEqual(Array.from(p.action.visual.releases), [.5]);
  assert.equal(rolls.length, 0);
  flush();
  assert.deepEqual(rolls, [primary, side, other]);
  assert.ok(damage.get(primary) > 0);
  assert.equal(damage.get(side), damage.get(primary) * .75);
  assert.equal(damage.get(other), damage.get(side));
  assert.equal(p.tempo, 1);
});

test('ground aim chooses the nearest foe and resolves the locked arc at contact', () => {
  const {p, foe, rolls, damage, flush} = arena();
  const leaves = foe(-1.6, .3), primary = foe(-1, -.3), enters = foe(1, 0);
  assert.ok(p.performSkill(tempo, null, {x:p.x - 4, y:p.y}));
  leaves.x = p.x + 1;
  enters.x = p.x - 1.4;
  p.face(p.x + 2, p.y);
  flush();
  assert.deepEqual(rolls, [primary, enters]);
  assert.equal(damage.get(enters), damage.get(primary) * .75);
});

test('a missed primary still cleaves and Double Time grants its bonus once', () => {
  const {p, foe, rolls, damage, flush} = arena();
  const primary = foe(1, 0), side = foe(1, .5);
  p.skills[tempo] = 10;
  assert.ok(p.chooseSkillPerk(tempo, 10, D.SKILL_PERKS[tempo][10][1].id));
  p.tryHit = mon => { rolls.push(mon); return mon !== primary; };
  assert.ok(p.performSkill(tempo, primary));
  flush();
  assert.deepEqual(rolls, [primary, side]);
  assert.equal(primary.hp, primary.maxHp);
  assert.ok(damage.get(side) > 0);
  assert.equal(p.tempo, 2);
});

test('empty, blocked and cross-layer swings grant no Tempo or cast effects', () => {
  const {p, foe, flush, rolls} = arena();
  const point = {x:p.x + 4, y:p.y}, mana = p.mana;
  const behind = foe(-1, 0), upper = foe(1, 0, 1);
  assert.equal(p.performSkill(tempo, null, point), false);
  assert.equal(p.performSkill(tempo, upper), false);
  const blocked = foe(2, 0), walkable = M.walkable;
  try {
    M.walkable = (_map, x) => x !== 11;
    assert.equal(p.performSkill(tempo, blocked), false);
    assert.equal(p.performSkill(tempo, null, point), false);
    assert.equal(p.action, null);
    assert.equal(p.mana, mana);
    assert.equal(p.tempo, 0);
    const close = foe(.4, 0);
    assert.ok(p.performSkill(tempo, close));
    flush();
    assert.deepEqual(rolls, [close]);
    assert.equal(behind.hp, behind.maxHp);
  } finally { M.walkable = walkable; }
});

test('a lone foe takes full damage and the level-six Sunder Combo spends the Tempo', () => {
  const {p, foe, rolls, flush} = arena();
  p.lvl = D.SKILLS[sunder].reqLvl;
  assert.equal(p.lvl, 6);
  assert.equal(D.SKILLS[sunder].prereq, tempo);
  p.skills[sunder] = 1;
  const mon = foe(1, 0), mana = p.mana;
  assert.ok(p.performSkill(tempo, mon));
  flush();
  assert.deepEqual(rolls, [mon]);
  assert.ok(p.performSkill(sunder, mon));
  flush();
  assert.equal(p.tempo, 0);
  assert.equal(p.mana, mana - 2 - 6);
  assert.equal(mon.sunder.stacks, 1);
});
