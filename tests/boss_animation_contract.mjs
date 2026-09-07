import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fixture} from './boss_fixture.mjs';
const f=fixture(),before=fixture({sourceDirectory:'tmp/boss_animation/before/js'});
let checks=0,samples=0;
const ok=(v,label)=>{checks++;assert.ok(v,label);};
const data=x=>JSON.parse(JSON.stringify(x));
function setup(api,id,phase){const q=api.fresh(id);q.e.active=true;for(let i=1;i<=phase;i++)q.e.phaseChange(i);return q;}
function state(q){const {m,e,s,p}=q;return data({boss:[m.x,m.y,m.hp,m.def.armor],player:[p.x,p.y,p.hp],stage:e.stage,timer:e.timer,rotation:e.rotation,
  attack:e.attack&&{id:e.attack.id,shapes:e.attack.shapes,age:e.attack.age,tick:e.attack.tick},
  owned:e.owned.map(m=>[m.defId,m.x,m.y,m.hp,m.dead,m.portalTimer,m.portalSpawns]),
  projectiles:s.projectiles.map(p=>[p.x,p.y,p.vx,p.vy,p.ttl,p.dead])});}
for(const id of Object.keys(f.DATA.BOSS_ENCOUNTERS))for(let phase=0;phase<f.DATA.BOSS_ENCOUNTERS[id].phases.length;phase++){
  const attacks=[...new Set(f.DATA.BOSS_ENCOUNTERS[id].rotations[phase])].flatMap(id=>id==='memory'?['memory','memory2']:[id]);
  for(const attack of attacks)for(const dt of [1/120,1/30,.05]){
    const a=setup(f,id,phase),b=setup(before,id,phase);
    if(attack==='memory2')a.e.memoryIndex=b.e.memoryIndex=1;
    a.e.start(attack==='memory2'?'memory':attack,a.p);b.e.start(attack==='memory2'?'memory':attack,b.p);
    for(let t=0;t<8;t+=dt){
      f.tick(a.s,dt,dt);before.tick(b.s,dt,dt);
      assert.deepEqual(state(a),state(b),`${id}/${phase}/${attack} altered combat at ${t}`);samples++;
      const pose=a.m.pose(),v=pose.ex.bossMotion;
      ok(a.m.pose()===pose&&a.m.pose().ex.bossMotion===v,'pose descriptor not reused');
      ok(Object.values(v).every(Number.isFinite),'nonfinite motion');
      ok(Math.abs(v.rot)<=Math.PI/36+1e-8&&v.sx>=.96&&v.sx<=1.04&&v.sy>=.96&&v.sy<=1.04,'excessive body transform');
      ok(Math.abs(v.x)<=10&&Math.abs(v.y)<=28,'excessive translation');
      if(a.e.stage==='recovery'&&(!a.e.visual?.events.length)&&t>5)break;
    }
    ok(f.ctx.Math.random()===before.ctx.Math.random(),'presentation consumed gameplay RNG');
    a.e.reset();ok(!a.e.visual.events.length&&!a.e.visual.particles.length,'reset retained effects');
  }
}
{
  const {e,m,p,s}=setup(f,'korvath',1);e.start('fissure',p);f.tick(s,.8);
  const frozen=JSON.stringify(m.pose().ex.bossMotion),timeline=JSON.stringify(e.visual);
  for(let i=0;i<50;i++)m.pose();ok(JSON.stringify(m.pose().ex.bossMotion)===frozen&&JSON.stringify(e.visual)===timeline,'sampling advanced time');
  e.execute();for(let i=0;i<150;i++)f.BossVFX.impact(e);
  const d=f.BossVFX.diagnostics(e);ok(d.events===24&&d.particles===96,'effect caps not enforced');
  const draws=[];f.BossVFX.appendDraws(draws,s,{x:f.U.isoX(m.x,m.y)-400,y:f.U.isoY(m.x,m.y)-500},1e6,1e6);
  const groups=draws.filter(d=>d.particles),points=groups.flatMap(d=>d.particles);
  ok(groups.length===1&&points.length===96&&new Set(points).size===96,'particle batching duplicated, dropped, or failed to group sparks');
  f.BossVFX.update(e,.6);ok(!e.visual.events.length&&!e.visual.particles.length,'impact tails exceeded 0.6 seconds');
  e.start('fissure',p);e.execute();e.start('cleave',p);ok(!e.visual.events.length&&!e.visual.particles.length,'replacement preview retained effects');
  ok(groups.every(g=>g.particles.length===0),'cancellation retained particles in render scratch');
  e.execute();const comparison=JSON.stringify(e.visual);
  f.BossVFX.setEnabled(false);ok(m.pose().ex.bossMotion.x===0,'disabled animation moved body');f.BossVFX.setEnabled(true);
  ok(JSON.stringify(e.visual)===comparison,'comparison toggle erased the paused instant');
  f.motionMedia.matches=true;e.start('fissure',p);f.tick(s,.8);ok(Object.values(m.pose().ex.bossMotion).join(',')==='0,0,0,1,1,1','reduced motion moved body');
  e.execute();ok(!e.visual.particles.length&&e.visual.events.length>0,'reduced motion lost impact or emitted particles');f.motionMedia.matches=false;
  e.finish();ok(!e.visual.events.length&&!e.visual.particles.length,'death retained effects');
}
for(const [id,phase,attack,kind] of [['azram',1,'portals','portal'],['vethriss',1,'decoys','decoy']]){
  const {e,p,s}=setup(f,id,phase);e.start(attack,p);e.execute();f.tick(s,.25);
  const owned=e.owned.find(m=>m.encounterKind===kind&&!m.dead);owned.takeDamage(1e9,p);
  ok(e.visual.events.some(v=>v.kind==='collapse'),'destroyed object did not animate');
  e.phaseChange(phase);ok(!e.visual.events.length&&!e.visual.particles.length,'phase retained effects');
}
const a=JSON.parse(fs.readFileSync('tests/qa/bosses/animation_playthrough.json')),b=JSON.parse(fs.readFileSync('tests/qa/bosses/animation_playthrough_before.json'));
{
  const {e,p,m,s}=setup(f,'malthoron',2);e.clearOwned();e.start('beam',p);e.execute();
  const lane=e.attack.shapes[0];p.x=m.x+Math.cos(lane.angle)*3;p.y=m.y+Math.sin(lane.angle)*3;
  let struck=false,coreAlpha=0;p.takeDamage=()=>{struck=true;};
  f.tick(s,.05,.05);
  const ctx=new Proxy({stroke(){if(this.lineWidth===4)coreAlpha=this.globalAlpha;}},{get:(t,k)=>k in t?t[k]:()=>{}});
  f.BossVFX.drawGround(ctx,s,{x:0,y:0});
  ok(struck&&Math.abs(coreAlpha-.9)<1e-8,'beam brightness did not follow its actual damage pulse');
}
assert.deepEqual(a.results,b.results,'ordinary combat outcomes changed');ok(a.results.length===30&&a.results.every(r=>r.won),'missing wins');
const report={passed:true,checks,combatSamples:samples,identicalPlaythroughs:30,limits:f.BossVFX.LIMITS};
fs.writeFileSync('tests/qa/bosses/animation_contract.json',JSON.stringify(report,null,2)+'\n');console.log('PASS',JSON.stringify(report));
