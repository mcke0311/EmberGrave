import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
import {enemyFixture} from './act2_enemy_fixture.mjs';
import {fixture} from './boss_fixture.mjs';

// Restore only after verifying the immutable working-tree snapshot hashes.
execFileSync('python',['-c',`import zipfile,json,hashlib,pathlib
root=pathlib.Path('tmp/act2_animation/before')
with zipfile.ZipFile('tests/fixtures/act2_animation_before.zip') as z:
 for name,digest in json.loads(z.read('hashes.json')).items():
  data=z.read(name)
  assert hashlib.sha256(data).hexdigest()==digest
  p=root/name
  if p.exists(): assert p.read_bytes()==data, 'Baseline differs: '+name
  else: p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(data)
# Unchanged 3D modules are shared companions, not altered baseline JS.
for source in [*pathlib.Path('js').glob('*.mjs'),*pathlib.Path('js/vendor').rglob('*.js')]:
 p=root/source;data=source.read_bytes()
 if p.exists(): assert p.read_bytes()==data, 'Shared module changed: '+str(source)
 else: p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(data)
`]);
const f=enemyFixture(),base=enemyFixture({sourceDirectory:'tmp/act2_animation/before/js'});
const A=vm.runInContext('Act2EnemyAnimation',f.ctx);
const ids=Object.keys(A.sequences).filter(id=>id!=='mire_mother');
let samples=0,checks=0;
const check=(test,message)=>{assert.ok(test,message);checks++;};
const serial=v=>JSON.stringify(v);
function state(s){return serial({time:s.time,player:[s.player.x,s.player.y,s.player.hp,s.player.slowT,s.player.slowPct,s.player.xp,s.player.gold],
  monsters:s.monsters.map(m=>[m.defId,m.x,m.y,m.hp,m.dead,m.corpseT,m.jumpZ,m.act2Combat?.history,m.act2Combat?.cooldowns,m.act2Combat?.pending?.age,m.act2Combat?.burst?.age]),
  projectiles:s.projectiles.map(p=>[p.x,p.y,p.dead,p.ttl]),ground:s.ground.map(g=>[g.x,g.y,g.gold,g.item?.baseId,g.item?.name,g.item?.rarity]),quests:s.quests});}
for(const dt of [1/120,1/30,1/20])for(const id of ids){
  const x=f.scene(id),y=base.scene(id);
  for(let i=0;i<Math.round(5/dt);i++){
    if(i===Math.round(2/dt)){x.m.die(x.p);y.m.die(y.p);}
    f.tick(x.s,dt,dt);base.tick(y.s,dt,dt);
    assert.equal(state(x.s),state(y.s),id+' combat divergence at '+i+' dt '+dt);samples++;
    const before=f.ctx.Math.random;
    f.ctx.Math.random=()=>{throw Error('Animation consumed gameplay RNG');};
    const pose=x.m.pose(),snapshot=serial(pose.ex.act2Animation);
    check(serial(x.m.pose().ex.act2Animation)===snapshot,'Repeated render sampling advances animation');
    f.ctx.Math.random=before;
    if(pose.ex.act2Animation)check(pose.ex.act2Animation.frame>=0&&pose.ex.act2Animation.frame<6,'Frame range');
  }
  check(x.m.pose().ex.act2Animation?.frame===5,id+' must hold final corpse');
}
// Exact controller-bound frame selection for each specialist ability, without
// changing the timing needed to make six authored frames fit short attacks.
for(const id of ids){
 const {m,c,s}=f.scene(id);
 for(const skill of A.sequences[id].filter(k=>k!=='death')){
  c.start(skill,[],.6,.6,()=>{},'phys');
  const frames=[];
  for(const t of [0,.21,.41,.6,.81,1.01]){c.pending.age=t;frames.push(m.pose().ex.act2Animation.frame);}
  assert.deepEqual(frames,[0,1,2,3,4,5],id+' '+skill);checks++;
  m.startAction('hit',.18);check(!m.pose().ex.act2Animation,id+' interrupted pose');c.cancel();
 }
 A.emit(m,'summon');const events=m.act2Visual.events.length;m.pose();m.pose();check(m.act2Visual.events.length===events,'Render changes effects');
 for(let n=0;n<30;n++)A.emit(m,'summon');check(m.act2Visual.events.length===12,'Effect cap');
 s.time+=1;A.tick(m);check(m.act2Visual.events.length===0,'Expired effects retained');
}
// Boss-owned enemies receive art independently of Act2EnemyCombat.
const specialists=[];
for(const [id,skill] of [['choirmaster','requiem'],['choirmaster','sacrifice'],['brood_mother','summon'],['sludge_horror','death'],['bog_bloat','death'],['choir_herald','cleanup']])for(const dt of [1/120,1/30,1/20]){
 const x=f.scene(id),y=base.scene(id);
 for(const z of [x,y]){
  for(const k in z.c.cooldowns)z.c.cooldowns[k]=999;
  if(skill==='sacrifice'||skill==='cleanup')for(let n=0;n<3;n++)z.c.spawn('drowned_dead',z.m.x+n*.8,z.m.y+2);
  if(skill==='death')z.m.die(z.p);else if(skill==='cleanup'){z.c.summon();z.m.die(z.p);}else z.c[skill](z.p);
 }
 for(let n=0;n<Math.ceil(4/dt);n++){
  f.tick(x.s,dt,dt);base.tick(y.s,dt,dt);assert.equal(state(x.s),state(y.s),`${id}/${skill} seeded divergence`);samples++;
  const pending=x.c.pending;if(skill==='requiem'&&pending?.steps.some(s=>s.done)&&!pending.released)check(x.m.pose().ex.act2Animation.frame===3,'Requiem must release on first staggered impact');
 }
 specialists.push({id,skill,dt});
}
const boss=fixture(),oldBoss=fixture({sourceDirectory:'tmp/act2_animation/before/js'});
const bs=boss.fresh('mire_mother'),os=oldBoss.fresh('mire_mother');
for(let i=0;i<900;i++){
 boss.tick(bs.s,1/30,1/30);oldBoss.tick(os.s,1/30,1/30);
 assert.equal(state(bs.s),state(os.s),'Mire Mother divergence '+i);samples++;
 for(const m of bs.s.monsters){m.pose();if(m.bossOwner){check(!m.act2Combat,'Boss adds gained Act 2 combat profile');check(m.spriteOpts.act2Art===m.defId,'Boss add missing art eligibility');}}
}
bs.m.die(bs.p);os.m.die(os.p);assert.equal(state(bs.s),state(os.s),'Mire death/rewards/quest divergence');checks++;
const report={status:'PASS',checks,samples,specialists,roster:ids.length+1,dt:[1/120,1/30,1/20],combat:'Exact seeded state equality against pre-animation source, including loot, specialist release events and Mire Mother death'};
fs.mkdirSync('tests/qa/act2_animation',{recursive:true});fs.writeFileSync('tests/qa/act2_animation/contract.json',JSON.stringify(report,null,2)+'\n');console.log(report);
