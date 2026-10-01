import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fixture} from './boss_fixture.mjs';
const f=fixture(),{Game:G,BossEncounters:B}=f;
let checks=0;
const ok=(v,label)=>{checks++;assert.ok(v,label);};
const close=(a,b,label)=>ok(Math.abs(a-b)<1e-6,label);
function setup(id,phase=0,difficulty=0){
  const v=f.fresh(id,123,'vanguard',difficulty);f.tick(v.s,.05);
  for(let i=1;i<=phase;i++){v.m.hp=v.m.maxHp*v.m.def.phases[i-1].at;v.e.phaseChange(i);}
  return v;
}
for(const dt of [1/120,1/30,.05]){
  for(const id of ['korvath','mire_mother','empty_archangel','malthoron','vethriss']){
    const {s,p,m,e}=setup(id);
    for(let phase=1;phase<e.config.phases.length;phase++){
      m.takeDamage(1e9,p);const hp=m.hp;m.loseHealth(1e9);m.takeDamage(1e9,{owner:p});
      close(m.hp,hp,id+' burst/DoT/companion hits wait for the transformation');
      f.tick(s,dt,dt);ok(e.phase===phase&&!e.mechanic?.blocksDamage,id+' optional counter does not protect a form');
    }
    m.takeDamage(1e9,p);ok(m.dead&&e.lifecycle==='victory',id+' win without any optional counter');
    ok(!e.mechanic&&!e.counterEvents.length&&!e.armorSouls&&!e.heartExposedUntil&&!e.dryPlatform&&e.arena.devices.every(d=>!d.cooldown&&!d.required&&!d.orientation),id+' victory clears counter progress and target state');
  }
  {
    const {s,p,m,e}=setup('korvath'),d=e.arena.devices[0];
    Object.assign(p,{x:d.x-2.5,y:d.y});e.start('charge',p);p.y+=4;e.execute();f.tick(s,.72,dt);
    ok(d.cooldown>23&&d.completed&&e.stage==='recovery','charge hits an unactivated target');
    close(e.recoveryDuration,3,'charge knockdown lasts three seconds');
    ok(e.counterEvents.some(c=>c.kind==='charge'),'charge success recorded');
    ok(!e.interactDevice(d,p),'charge target cannot be clicked');
    Object.assign(m,e.home);Object.assign(p,{x:d.x-2.5,y:d.y});e.start('charge',p);p.y+=4;e.execute();f.tick(s,.72,dt);
    ok(e.counterEvents.length===1,'cooldown prevents another charge reward');
    e.clearAttacks();e.recover(24.1,'Target recharge');f.tick(s,24.1,dt);
    ok(!d.cooldown&&!d.completed,'charge target returns to its ready state');
    Object.assign(m,e.home);Object.assign(p,{x:d.x-2.5,y:d.y});e.start('charge',p);p.y+=4;e.execute();f.tick(s,.72,dt);
    ok(e.counterEvents.filter(c=>c.kind==='charge').length===2,'the same target can reward another charge after its cooldown');
    e.reset();f.tick(s,.05);Object.assign(p,{x:m.x,y:m.y-7});e.start('charge',p);p.x+=4;e.execute();f.tick(s,.72,dt);
    ok(e.counterEvents.length===0&&e.recoveryDuration===2,'missed bait preserves ordinary recovery');
  }
  {
    const {s,p,m,e}=setup('mire_mother',1);
    e.recover(2.25);const plain=m.hp;m.takeDamage(100,p,null,'shadow');close(plain-m.hp,100,'ordinary recovery has no heart bonus');
    for(let i=0;i<3;i++){
      e.start('flood',p);ok(e.attack.shapes.length===2,'flood covers two sectors');
      const dry=e.dryPlatform;ok(!e.attack.shapes.some(sh=>B.contains(sh,dry.x,dry.y)),'marked platform stays dry');
      const path=f.TerrainNavigation.findPath(s.map,{x:e.arena.cx,y:e.arena.cy},dry,{radius:p.radius,hop:false,speed:4});
      ok(path?.length,'dry platform reachable without a movement skill');
    }
    e.execute();e.start('grasp',p);e.execute();f.tick(s,.25,dt);
    close(e.recoveryDuration,4,'flood and grasp expose heart for four seconds');
    const start=m.hp;m.takeDamage(100,p,null,'shadow');m.loseHealth(100);m.takeDamage(100,{owner:p},null,'shadow');
    close(start-m.hp,375,'direct, raw DoT and companion damage gain exactly one bonus');
    s.time=e.heartExposedUntil+.01;const after=m.hp;m.loseHealth(100);close(after-m.hp,100,'heart bonus expires');
  }
  {
    const {s,p,m,e}=setup('empty_archangel',1);e.start('descent',p);
    ok(e.attack.id==='choir'&&e.timer===3&&!e.mechanic.blocksDamage,'choir channel precedes descent without protection');
    const goal=e.mechanic.goal;close(goal,m.maxHp*.02,'choir goal scales with boss life');
    m.takeDamage(goal*.35,p,null,'shadow');m.loseHealth(goal*.35);m.takeDamage(goal*.35,{owner:p},null,'shadow');
    ok(!e.sequence&&!e.mechanic&&e.stage==='recovery','direct/DoT/companion pressure interrupts choir');
    close(e.recoveryDuration,4,'choir interruption grants four seconds');
    e.start('descent',p);f.tick(s,3.4,dt);
    ok(e.attack.id==='descent'&&e.stage==='windup','failed interruption proceeds to a warned descent');
    const landing={...e.attack.shapes[0]};p.x+=4;e.execute();f.tick(s,.35,dt);
    ok(e.attack.id==='cross'&&e.stage==='windup','later descent retains warned cross');close(m.x,landing.x,'descent landing is locked');
  }
  {
    const {s,p,m,e}=setup('azram',1),d=e.arena.devices.find(d=>d.required);
    ok(e.mechanic.kind==='mirror'&&e.mechanic.blocksDamage,'Azram alone has a puzzle ward');
    close(m.x,e.home.x,'Azram returns to throne');
    e.start('sunbeam',p);e.execute();ok(e.mechanic&&!e.mechanic.armed,'misaligned beam cannot solve ward');
    Object.assign(p,{x:d.x,y:d.y+1.5});ok(e.interactDevice(d,p),'first mirror turn');
    const timer=e.timer;ok(!e.interactDevice(d,p),'concurrent duplicate mirror turn debounced');close(e.timer,timer,'turn does not restart attack');
    f.tick(s,.3,dt);ok(e.interactDevice(d,p),'second mirror turn');ok(d.orientation===2&&e.mechanic.armed,'mirror points toward throne');
    close(Math.cos(e.mirrorAngle(d)),Math.sign(e.home.x-d.x),'aligned outgoing ray points at throne');
    let incoming=0;Object.assign(p,{x:(m.x+d.x)/2,y:d.y});p.takeDamage=()=>incoming++;
    e.start('sunbeam',p);e.execute();ok(incoming===1,'reflected beam still damages an undodged incoming lane');
    ok(!e.mechanic&&e.stage==='recovery'&&e.counterEvents.some(c=>c.kind==='mirror'),'correct reflection breaks ward');
  }
  {
    const {s,p,m,e}=setup('vethriss',1);e.start('decoys',p);e.execute();f.tick(s,.25,dt);
    ok(e.attack.id==='echoes'&&e.timer<=1.5&&e.mechanic.kind==='illusion','serpent identification tell');
    const bodies=[m,...e.owned.filter(o=>!o.dead)];ok(bodies.length===4&&new Set(bodies.map(o=>o.x+':'+o.y)).size===4,'real serpent shuffles among three distinct decoys');
    for(const body of bodies)ok(B.footprint(s.map,body.x,body.y,body.radius),'illusion body has supported footing');
    m.loseHealth(1);m.takeDamage(1,p,{sourceSkill:'basic',uniqueDot:true},'shadow');m.takeDamage(1,{owner:p},{sourceSkill:'basic'},'shadow');m.takeDamage(1,p,{sourceSkill:'basic',periodic:true},'shadow');
    ok(e.mechanic?.kind==='illusion','passive damage and autonomous companions do not identify truth');
    s.fx.push({type:'groundfield',fieldKind:'miasma',x:m.x,y:m.y,radius:2,ttl:2,maxTtl:2,tickEvery:.5,tickT:0,lo:2,hi:2,owner:p,sourceSkill:'gravebinder_2_2'});
    const before=m.hp;G.__bossTest.updateFx(.5);
    ok(m.hp<before&&e.mechanic?.kind==='illusion','production ground-field damage does not identify truth');
    ok(!p._periodicHit,'periodic hit scope restored after damage');
    const clone=e.owned.find(o=>!o.dead);Object.assign(clone,{x:m.x+.8,y:m.y,frozen:s.time+1,freezeOwner:p});p.stats.shatterRank=1;
    const beforeShatter=m.hp;clone.takeDamage(1e9,p);ok(e.attack.shapes.length===2,'destroying a decoy deletes its warning lane');
    ok(m.hp<beforeShatter&&e.mechanic?.kind==='illusion','passive corpse shattering damages the real serpent without identifying it');
    m.takeDamage(1,p,{sourceSkill:'basic'},'shadow');
    ok(!e.mechanic&&!e.sequence&&e.owned.every(o=>o.dead),'direct hit dissolves the lies');close(e.recoveryDuration,3,'truth grants three-second opening');
    e.start('decoys',p);e.execute();f.tick(s,.25,dt);const count=e.counterEvents.length;f.tick(s,1.52,dt);
    ok(e.attack.id==='echoes'&&e.stage==='execute'&&!e.mechanic&&e.owned.every(o=>o.dead)&&e.counterEvents.length===count,'a missed identification executes the announced illusion volley');
  }
}
for(const difficulty of [0,1,2]){
  const {s,p,m,e}=setup('malthoron',1,difficulty),armor=e.base.armor;
  for(const phase of [1,2]){
    if(phase===2){m.hp=m.maxHp*.33;e.phaseChange(2);}
    const souls=e.owned.filter(o=>!o.dead&&o.encounterKind==='boundSoul');ok(souls.length===2,'two soul targets replace reinforcements');
    for(const soul of souls)close(soul.maxHp,Math.round(m.maxHp*.03),'soul life scales at three percent');
    ok(!e.spawn('drowned_dead',m.x,m.y),'soul pair respects add cap');
    e.start('souls',p);ok(e.attack.shapes.length===7,'bound souls add two individually warned lanes');
    const xp=p.xp,gold=p.gold,loot=s.ground.length;
    souls[0].takeDamage(1e9,p);ok(e.attack.shapes.length===6,'severed soul removes pending lane');
    const count=e.armorSouls;souls[0].takeDamage(1e9,p);ok(e.armorSouls===count,'dead soul cannot reduce armor twice');
    souls[1].takeDamage(1e9,p);close(m.def.armor,armor*(phase===1?.7:.4),'armor loss is permanent and based on original armor');
    close(e.recoveryDuration,3,'severing pair grants opening');
    ok(p.xp===xp&&p.gold===gold&&s.ground.length===loot,'souls award no loot, XP or quest kills');
  }
  e.reset();close(m.def.armor,armor,'retry restores original armor');ok(!e.armorSouls&&!e.mechanic&&!e.owned.length,'retry clears soul state');
  f.tick(s,.05);m.hp=m.maxHp*.66;e.phaseChange(1);const ignored=e.owned.slice();m.hp=m.maxHp*.33;e.phaseChange(2);
  ok(ignored.every(o=>o.dead)&&e.owned.length===2&&e.armorSouls===0,'ignored souls replaced without free armor reduction');
  e.reset();f.tick(s,.05);m.hp=m.maxHp*.66;e.phaseChange(1);e.owned[0].takeDamage(1e9,p);
  const old=e.owned.slice();m.hp=m.maxHp*.33;e.phaseChange(2);
  ok(old.every(o=>o.dead)&&e.owned.length===2&&e.armorSouls===1,'next phase replaces a partially cleared soul pair');
  close(m.def.armor,armor*.85,'partially earned armor reduction persists across replacement');
  const victory=setup('malthoron',2,difficulty);
  for(const soul of [...victory.e.owned])soul.takeDamage(1e9,victory.p);
  victory.m.takeDamage(1e9,victory.p);close(victory.m.def.armor,victory.e.base.armor,'victory clears earned armor reductions');ok(!victory.e.armorSouls&&!victory.e.counterEvents.length,'victory clears soul counter history');
}
fs.mkdirSync('tests/qa/boss_variety',{recursive:true});
fs.writeFileSync('tests/qa/boss_variety/contract.json',JSON.stringify({passed:true,checks,frameSteps:[1/120,1/30,.05],difficultyTiers:3},null,2)+'\n');
console.log('PASS '+checks+' distinct-counter, optional-progress, damage-source and lifecycle checks');
