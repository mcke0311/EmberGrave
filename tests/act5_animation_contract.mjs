import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {fixture} from './boss_fixture.mjs';
const catalog=JSON.parse(fs.readFileSync('assets/act5_animations/catalog.json','utf8'));
const f=fixture({dataSeed:518}),disabled=fixture({dataSeed:518,...(process.argv.includes('--baseline')?{sourceDirectory:'tmp/act5_animation/before/js'}:{})});
const A=vm.runInContext('Act5EnemyAnimation',f.ctx),off=vm.runInContext('typeof Act5EnemyAnimation===\'undefined\'?null:Act5EnemyAnimation',disabled.ctx);
if(off)off.enabled=false;
// Sequence metadata also supports running this contract while art is importing.
for(const fx of [f,disabled])for(const g of catalog.enemies)fx.DATA.SPRITE_MANIFEST.entries['actor.act5.'+g.id]||={sequences:g.sequences};
let checks=0;
const ok=(condition,label)=>{assert.ok(condition,label);checks++;};
const equal=(a,b,label)=>{assert.equal(JSON.stringify(a),JSON.stringify(b),label);checks++;};
function scene(fx,id){
  const {s,p}=fx.fresh('vethriss',518);s.map.surfaceVersion=0;s.map.blocked.fill(0);s.map.elev.fill(0);s.map.hazards=[];s.map.bossArena=null;
  s.monsters=[];const m=new fx.Monster(id,p.x-1.3,p.y);s.monsters=[m];m.aggro=true;m.maxHp=m.hp=100000;
  p.stats.dodge=0;p.stats.block=0;p.tryBlock=()=>false;
  return {s,p,m};
}
function serial(s){return {time:s.time,hp:s.player.hp,gold:s.player.gold,xp:s.player.xp,
  monsters:s.monsters.map(m=>[m.defId,m.x,m.y,m.hp,m.dead,m.corpseT,m.castEpoch,m.attackCd,m.slamCd,m.summonCd,m.charging?.t,m.leaping?.t,m.whirling?.t]),
  projectiles:s.projectiles.map(p=>[p.x,p.y,p.dead,p.ttl]),ground:s.ground.map(g=>[g.x,g.y,g.gold,g.item?.baseId]),quests:s.quests};}
equal(Object.keys(catalog.roster).length,54,'Full native and summoned roster');
for(const id of Object.keys(catalog.roster)){
  const x=scene(f,id),y=scene(disabled,id);
  ok(A.eligible(x.m),id+' eligible');ok(!A.showsAttackRadius(x.m),id+' hidden indicators');
  for(let i=0;i<120;i++){
    if(i===70){x.m.die(x.p);y.m.die(y.p);}
    f.tick(x.s,1/30,1/30);disabled.tick(y.s,1/30,1/30);
    equal(serial(x.s),serial(y.s),id+' presentation must not change combat');
    const rng=f.ctx.Math.random;f.ctx.Math.random=()=>{throw Error('Presentation consumed gameplay randomness');};
    const first=JSON.stringify(x.m.pose().ex.act5Animation);equal(first,JSON.stringify(x.m.pose().ex.act5Animation),id+' stable paused sampling');f.ctx.Math.random=rng;
  }
  equal(x.m.pose().ex.act5Animation?.frame,5,id+' stable final remains');
  const {s,p,m}=scene(f,id);
  for(const kind of catalog.roster[id].sequences.filter(k=>k!=='death')){
    m.startAction('attack',1.2,{act5Kind:kind});A.deferred(m,.6);
    const v=m.act5Visual,frames=[];
    for(const elapsed of [.01,.22,.44]){s.time=v.start+elapsed;frames.push(m.pose().ex.act5Animation.frame);}
    s.time=v.start+.6;A.release(m,v);
    for(const elapsed of [0,.22,.44]){s.time=v.start+.6+elapsed;frames.push(m.pose().ex.act5Animation.frame);}
    equal(frames,[0,1,2,3,4,5],id+' '+kind+' six phases');
    m.stunT=1;ok(!m.pose().ex.act5Animation,id+' interrupted pose');m.stunT=0;
    m.cancelAttacks();ok(!m.act5Visual&&!m.act5Events.length,id+' cancellation cleanup');
  }
  const original=s.map;s.map={...original,id:'ash_wastes'};ok(!m.pose().ex.act5Animation,id+' stale map');s.map=original;
  m.corpseT=0;m.dead=true;ok(!m.pose().ex.act5Animation,id+' consumed corpse');
}
for(const [boss,zone]of [['vethriss','throne'],['korvath','barrow']]){
  const {m}=f.fresh(boss,518);ok(!A.eligible(m),boss+' excluded');ok(A.showsAttackRadius(m),boss+' indicators preserved');
}
for(const id of ['ash_fiend','blight_treant','drowned_dead']){
  const {m,s}=scene(f,id);s.map.id='cathedral1';ok(!A.eligible(m)&&A.showsAttackRadius(m),id+' other act isolated');
}
// Movement holds the active pose until the existing controller finishes.
for(const [id,kind,field]of [['r55_knight','charge','charging'],['r53_imp','leap','leaping'],['r84_warlord','whirl','whirling']]){
  const {m,s}=scene(f,id);m.startAction('attack',.85,{act5Kind:kind});A.deferred(m,.6);s.time+=.6;A.release(m,m.act5Visual);
  m[field]={t:1,dur:2};s.time+=1;ok(m.pose().ex.act5Animation.frame>=3,id+' active movement');
  m[field]=null;A.finish(m);equal(m.pose().ex.act5Animation.frame,4,id+' recovery starts');s.time+=.3;ok(!m.pose().ex.act5Animation,id+' recovery ends');
}
// Exercise real AI entrypoints so a skill cannot silently use the basic row.
const cooldown={slam:'slam',charge:'charge',leap:'leap',whirl:'whirl',volley:'volley',summon:'summon',heal:'heal',blink:'tele',throw:'throw'};
for(const id of Object.keys(catalog.roster))for(const kind of catalog.roster[id].sequences.filter(k=>k!=='death')){
  const {m,s,p}=scene(f,id);
  for(const key of Object.values(cooldown))m[key+'Cd']=100;
  m.attackCd=100;
  let distance=['bolt','volley','charge','leap','blink','throw'].includes(kind)?5:1.3;
  if(kind==='blink')distance=m.def.teleports.minDist+1;
  p.x=m.x+distance;p.y=m.y;
  if(kind==='heal'){
    const patient=new f.Monster('ash_fiend',m.x,m.y+1);patient.def.faction=m.def.faction||m.def.family;patient.hp=1;patient.maxHp=1000;s.monsters.push(patient);
  }
  if(cooldown[kind])m[cooldown[kind]+'Cd']=0;else m.attackCd=0;
  m.update(.01,p,s.map);
  equal(m.act5Visual?.kind,kind,id+' real '+kind+' action dispatch');
  if(kind==='blink')ok(m.act5Events.some(e=>e.kind==='blink'),id+' blink departure and arrival');
  else{
    const v=m.act5Visual;
    f.Game.__bossTest.flush(v.windup+.001);
    ok(v.released,id+' real '+kind+' release');
  }
}
// Assert the production renderer suppresses warnings without deleting shapes.
const renderFixture=fixture({dataSeed:518,gameExports:['drawFx','setContext:c=>{ctx=c;}']});
let strokes=0;
const context=new Proxy({save(){},restore(){},stroke(){strokes++;},fill(){strokes++;}}, {get:(o,k)=>o[k]||(()=>{})});
renderFixture.Game.__bossTest.setContext(context);
for(const id of ['ash_fiend','bone_dragon','flesh_engine']){
 const {m}=scene(renderFixture,id);
 for(const type of ['enemywarning','slamwarning','meteorfall']){
  const shape={kind:'circle',x:m.x,y:m.y,radius:3};
  const warning={type,owner:m,x:m.x,y:m.y,ttl:.6,maxTtl:.6,radius:3,col:'#fff',shape};m.slamWarning=warning;
  strokes=0;renderFixture.Game.__bossTest.drawFx(warning,{x:0,y:0});equal(strokes,0,id+' '+type+' invisible');equal(shape.radius,3,id+' collision shape retained');
 }
 strokes=0;renderFixture.Game.__bossTest.drawFx({type:'enemywarning',projectile:{lob:{owner:m}},x:m.x,y:m.y,ttl:.6,shape:{kind:'circle',x:m.x,y:m.y,radius:2}},{x:0,y:0});equal(strokes,0,id+' thrown landing invisible');
}
const {m:boss}=renderFixture.fresh('vethriss',518);strokes=0;
renderFixture.Game.__bossTest.drawFx({type:'enemywarning',owner:boss,x:boss.x,y:boss.y,ttl:.6,shape:{kind:'circle',x:boss.x,y:boss.y,radius:2}},{x:0,y:0});ok(strokes>0,'Boss warning still rendered');
console.log('PASS',checks,'Act 5 animation checks');
