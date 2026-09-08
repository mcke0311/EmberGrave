import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
import {fixture} from './boss_fixture.mjs';

execFileSync('python',['-c',`import zipfile,json,hashlib,pathlib
root=pathlib.Path('tmp/act3_animation/before')
with zipfile.ZipFile('tests/fixtures/act3_animation_before.zip') as z:
 for name,digest in json.loads(z.read('hashes.json')).items():
  data=z.read(name);assert hashlib.sha256(data).hexdigest()==digest
  p=root/name
  if p.exists():assert p.read_bytes()==data
  else:p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(data)
`]);
const f=fixture({dataSeed:101}),base=fixture({dataSeed:101,sourceDirectory:'tmp/act3_animation/before/js'});
const A=vm.runInContext('Act3EnemyAnimation',f.ctx),ids=Object.keys(A.sequences);
let checks=0,samples=0;const ok=(v,s)=>{assert.ok(v,s);checks++;};
function scene(f,id,special=false){
 const {s,p,m:b}=f.fresh('azram',123);s.monsters=[];
 const m=new f.Monster(id,b.x-3,b.y);s.monsters=[m];m.aggro=true;m.visAng=m.angT=0;
 const sp=m.imperialCombat?.profile.special,d=special&&sp?(sp.kind==='blink'?(sp.mode==='retreat'?2:6):['charge','leap','fan'].includes(sp.kind)?5:1):m.def.projectile?6:1;
 p.x=m.x+d;p.y=m.y;p.stats.dodge=0;p.stats.block=0;p.tryBlock=()=>false;
 if(special)m.imperialCombat.trySpecial(true);
 return {s,p,m,c:m.imperialCombat};
}
const serial=v=>JSON.stringify(v);
function state(s){return serial({time:s.time,player:[s.player.x,s.player.y,s.player.hp,s.player.xp,s.player.gold],
 monsters:s.monsters.map(m=>[m.defId,m.x,m.y,m.hp,m.dead,m.corpseT,m.jumpZ,m.imperialCombat?.cooldown,m.imperialCombat?.active?.stage,m.imperialCombat?.active?.remaining]),
 projectiles:s.projectiles.map(p=>[p.x,p.y,p.dead,p.ttl]),ground:s.ground.map(g=>[g.x,g.y,g.gold,g.item?.baseId,g.item?.name,g.item?.rarity]),quests:s.quests});}
for(const dt of [1/120,1/30,1/20])for(const id of ids)for(const special of [false,true]){
 const x=scene(f,id,special),y=scene(base,id,special);
 for(let i=0;i<Math.round(4/dt);i++){
  if(i===Math.round(2/dt)){x.m.die(x.p);y.m.die(y.p);}
  f.tick(x.s,dt,dt);base.tick(y.s,dt,dt);assert.equal(state(x.s),state(y.s),id+' simulation divergence');samples++;
  const rng=f.ctx.Math.random;f.ctx.Math.random=()=>{throw Error('Presentation used gameplay randomness');};
  const pose=serial(x.m.pose().ex.act3Animation);ok(serial(x.m.pose().ex.act3Animation)===pose,id+' pause stability');f.ctx.Math.random=rng;
 }
 ok(x.m.pose().ex.act3Animation.frame===5,id+' final remains');
}
for(const id of ids){
 const {s,p,m,c}=scene(f,id);
 for(const kind of A.sequences[id].filter(k=>k!=='death')){
  c.begin(kind,{windup:.6,recovery:.6},p);const a=c.active,frames=[];
  for(const progress of [.01,.35,.7]){a.remaining=.6*(1-progress);frames.push(m.pose().ex.act3Animation.frame);}
  if(kind==='leap'){a.stage='travel';frames.push(m.pose().ex.act3Animation.frame);a.stage='recovery';for(const progress of [.01,.6]){a.remaining=.6*(1-progress);frames.push(m.pose().ex.act3Animation.frame);}}
  else{a.stage='recovery';for(const progress of [.01,.35,.7]){a.remaining=.6*(1-progress);frames.push(m.pose().ex.act3Animation.frame);}}
  assert.deepEqual(frames,[0,1,2,3,4,5],id+' '+kind+' stages');checks++;
  if(kind==='charge'){a.stage='travel';ok(m.pose().ex.act3Animation.frame===3,'charge travel pose');}
  m.startAction('hit',.18);ok(!m.pose().ex.act3Animation,'hit reaction does not show stale attack');c.cancel();
 }
 for(const reason of ['stun','freeze','fear','map','world']){
  const {s,p,m,c}=scene(f,id);c.begin('melee',{windup:.6,recovery:.6},p);
  if(reason==='stun')m.stunT=1;if(reason==='freeze')m.frozen=s.time+1;if(reason==='fear')m.feared=s.time+1;
  if(reason==='map')s.map=f.MapGen.generate('sand_tombs',123);if(reason==='world')f.Game.__bossTest.setState({...s});
  ok(!m.pose().ex.act3Animation,id+' '+reason+' clears presentation');
 }
 const again=scene(f,id);again.m.die(again.p);again.m.exploded=true;ok(!again.m.pose().ex.act3Animation,'consumed corpse has no frame');
 again.m.exploded=false;again.m.corpseT=0;ok(!again.m.pose().ex.act3Animation,'expired corpse has no frame');
 const summon=scene(f,id);summon.m.bossOwner={dead:false,encounter:{active:true}};summon.c.begin('melee',{windup:.6,recovery:.6},summon.p);
 ok(A.eligible(summon.m),'summoned copy eligible');
}
// Normal gameplay omits warning geometry; debug and the Sovereign retain it.
for(const id of [...ids,'chained_sovereign']){
 const {m,c,p}=scene(f,id);c.begin('pulse',{windup:.6,recovery:.6,elem:'light'},p,{kind:'circle',x:m.x,y:m.y,radius:2});
 let calls=0;const ctx=new Proxy({},{get:()=>()=>{calls++;},set:()=>true});
 c.draw(ctx,{x:0,y:0},false);ok(id==='chained_sovereign'?calls>0:calls===0,id+' indicators');
 calls=0;c.draw(ctx,{x:0,y:0},true);ok(calls>0,id+' diagnostic overlay');
 if(id==='chained_sovereign')ok(!A.eligible(m),'Sovereign excluded');
}
for(const boss of ['azram','chained_sovereign'])ok(!A.eligible(scene(f,boss).m),boss+' art excluded');
for(const id of ids){const {s}=f.fresh('azram');s.map=f.MapGen.generate('weeping_marsh',123);const m=new f.Monster(id,10,10);ok(!A.eligible(m),id+' other-act art unchanged');}
const report={status:'PASS',samples,checks,identities:ids.length,sequences:Object.values(A.sequences).reduce((s,a)=>s+a.length,0)};
fs.mkdirSync('tests/qa/act3_animation',{recursive:true});fs.writeFileSync('tests/qa/act3_animation/contract.json',JSON.stringify(report,null,2));console.log(report);
