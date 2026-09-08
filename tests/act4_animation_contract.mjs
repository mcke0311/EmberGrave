import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
import {fixture} from './boss_fixture.mjs';
execFileSync('python',['tools/act4_animation_baseline.py','--restore']);
const F=fixture(),B=fixture({sourceDirectory:'tmp/act4_animation/before/js'});
const A=vm.runInContext('Act4EnemyAnimation',F.ctx);
let checks=0,samples=0;
const ok=(x,label)=>{checks++;assert.ok(x,label);};
function scene(f,id='hollow_knight',skill='cleave',zone='cathedral_cinderwatch'){
 f.ctx.Math.random=f.U.rng(7331);
 const p=new f.Player('Animation QA','vanguard'),s=f.Game.__bossTest.freshState(p,123);
 s.map=f.MapGen.generate(zone,123);f.Game.__bossTest.setState(s);f.Game.debugFlags.god=false;
 const n=s.map.cathedral.rooms.find(n=>n.id==='memory'||n.id==='nave')||s.map.cathedral.rooms[1];
 p.x=n.x+(['rush','blink','bolt'].includes(skill)?5:1.1);p.y=n.y;p.hp=p.stats.maxHp=1e6;p.lvl=20;
 Object.assign(p.stats,{dodge:0,block:0,thorns:0,dmgToMana:0,pShare:0});
 const profile=f.EnemySkills.profiles[id],m=new f.Monster(profile.enemy,n.x,n.y,{elite:!!profile.elite,skillProfile:id});
 s.monsters=[m];m.aggro=true;const c=m.enemySkills;
 for(const k in c.cooldowns)c.cooldowns[k]=99;
 if(skill==='heal'){const ally=new f.Monster('hollow_knight',n.x+2,n.y+2);ally.hp=ally.maxHp/2;ally.stunT=99;s.monsters.push(ally);}
 if(['basic','bolt'].includes(skill))c.fight(p,s.map);else if(skill!=='death'){c.cooldowns[skill]=0;assert.ok(c.start(skill,p),id+' '+skill+' starts');}
 if(skill==='death')m.die(p);
 return {s,p,m,c};
}
const state=x=>JSON.stringify({time:x.s.time,player:[x.p.x,x.p.y,x.p.hp,x.p.slowT,x.p.slowPct,x.p.xp,x.p.gold],
 monsters:x.s.monsters.map(m=>[m.defId,m.x,m.y,m.hp,m.dead,m.corpseT,m.enemySkills?.cooldowns,m.enemySkills?.stats,
 m.enemySkills?.active&&[m.enemySkills.active.id,m.enemySkills.active.stage,m.enemySkills.active.step,m.enemySkills.active.remaining,m.enemySkills.active.progress]]),
 projectiles:x.s.projectiles.map(p=>[p.x,p.y,p.dead,p.ttl]),ground:x.s.ground.map(g=>[g.x,g.y,g.gold,g.item?.baseId,g.item?.rarity]),quests:x.s.quests});
const seen=new Set();
for(const [id,profile]of Object.entries(F.EnemySkills.profiles))for(const skill of [profile.enemy==='choir_priest'?'bolt':'basic',...Object.keys(profile.skills),'death'])for(const dt of [1/120,1/60,1/30]){
 const x=scene(F,id,skill),y=scene(B,id,skill);
 for(let i=0;i<Math.round(5/dt);i++){
  if(i===Math.round(3/dt)){x.m.die(x.p);y.m.die(y.p);}
  F.tick(x.s,dt,dt);B.tick(y.s,dt,dt);
  assert.equal(state(x),state(y),`${id}/${skill} combat diverged at ${i} dt ${dt}`);samples++;
  const random=F.ctx.Math.random;F.ctx.Math.random=()=>{throw Error('Presentation consumed gameplay RNG');};
  const pose=x.m.pose(),a=pose.ex.act4Animation;
  if(a){seen.add(x.m.defId+':'+a.id+':'+a.frame);ok(a.frame>=0&&a.frame<6,'frame range');}
  const first=JSON.stringify(a);ok(JSON.stringify(x.m.pose().ex.act4Animation)===first,'render sampling is idempotent');F.ctx.Math.random=random;
 }
}
// Phase boundaries, especially first release while the second windup has started.
{
 const x=scene(F,'cathedral_knight_guardian');F.tick(x.s,.8,.025);
 assert.equal(x.m.pose().ex.act4Animation.id,'cleave');assert.equal(x.m.pose().ex.act4Animation.frame,3);
 F.tick(x.s,.2,.025);assert.equal(x.m.pose().ex.act4Animation.id,'return_sweep');
 F.tick(x.s,.5,.025);assert.equal(x.m.pose().ex.act4Animation.frame,3);checks+=3;
}
{
 const x=scene(F,'memory_wraith','blink');F.tick(x.s,.8,.025);
 assert.equal(x.m.pose().ex.act4Animation.id,'blink');assert.equal(x.m.pose().ex.act4Animation.frame,4);
 F.tick(x.s,.15,.025);assert.equal(x.m.pose().ex.act4Animation.id,'strike');
 F.tick(x.s,.25,.025);assert.equal(x.m.pose().ex.act4Animation.frame,3);checks+=3;
}
for(const condition of ['stun','freeze','fear','pull','beckon','flee','playerDeath','mapDeparture']){
 const x=scene(F);x.m.pose();
 if(condition==='stun')x.m.stunT=1;if(condition==='freeze')x.m.frozen=1;if(condition==='fear')x.m.feared=1;
 if(condition==='pull')x.m.pulled={};if(condition==='beckon')x.m.beckon={until:1};if(condition==='flee')x.m.fleeUntil=1;
 if(condition==='playerDeath')x.p.dead=true;if(condition==='mapDeparture')F.Game.state.map=F.MapGen.generate('fields',123);
 ok(!x.m.pose().ex.act4Animation,condition+' clears stale pose');x.c.tick(.01,x.p,F.Game.state.map);ok(!x.c.active,condition+' cancels action');
}
for(const skill of ['heal','rush','blink','cleave']){
 const id={heal:'choir_priest',rush:'soul_eater',blink:'memory_wraith',cleave:'hollow_knight'}[skill],x=scene(F,id,skill);
 x.m.die(x.p);assert.equal(x.m.pose().ex.act4Animation.id,'death');F.tick(x.s,.65,.025);
 assert.equal(x.m.pose().ex.act4Animation.frame,5);F.tick(x.s,2,.025);assert.equal(x.m.pose().ex.act4Animation.frame,5);
 x.m.exploded=true;ok(!x.m.pose().ex.act4Animation,'destroyed corpse hidden');x.m.exploded=false;x.m.corpseT=0;ok(!x.m.pose().ex.act4Animation,'expired corpse hidden');
}
for(const zone of ['cathedral1','cathedral2','cathedral_cinderwatch','cathedral_bastion'])ok(A.eligible(scene(F,'hollow_knight','basic',zone).m),'zone '+zone);
{
 const x=scene(F);x.m.bossOwner={encounter:{active:true}};ok(A.eligible(x.m),'summoned Knight eligible');
 F.Game.state.map=F.MapGen.generate('fields',123);const other=new F.Monster('hollow_knight',10,10);ok(!A.eligible(other),'same archetype outside Act IV unchanged');
 for(const id of ['malthoron','empty_archangel']){const {m}=F.fresh(id);ok(!A.eligible(m),'boss excluded '+id);}
}
{
 const x=scene(F,'memory_wraith','blink');F.tick(x.s,.5,.025);F.motionMedia.matches=true;assert.equal(x.m.pose().ex.act4Animation.alpha,1);F.motionMedia.matches=false;checks++;
}
F.EnemySkills.draw(new Proxy({},{get(){throw Error('Enemy warning UI was painted');}}),{});checks++;
for(const [id,sequences]of Object.entries(A.sequences))for(const sequence of sequences)for(let frame=0;frame<6;frame++)ok(seen.has(id+':'+sequence+':'+frame),'missing live frame '+id+'/'+sequence+'/'+frame);
const actorCoverage={};for(const id of Object.keys(A.sequences))actorCoverage[id]=A.sequences[id].map(sequence=>({sequence,frames:[...seen].filter(k=>k.startsWith(id+':'+sequence+':')).map(k=>+k.split(':')[2]).sort()}));
fs.mkdirSync('tests/qa/act4_animation',{recursive:true});
const report={status:'PASS',checks,matchedSimulationSamples:samples,actorCoverage};fs.writeFileSync('tests/qa/act4_animation/contract.json',JSON.stringify(report,null,2)+'\n');console.log(report);
