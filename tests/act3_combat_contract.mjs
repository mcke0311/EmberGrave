import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {fixture} from './boss_fixture.mjs';
const f=fixture({gameExports:['enemiesByFamily']}),{DATA:D,Game:G,Monster,U,TerrainNavigation:N}=f;
let checks=0;const ok=(value,label)=>{checks++;assert.ok(value,label);};
const reports=[];
function setup(id,distance=5){
  const {s,p,m:b}=f.fresh('azram',123);s.monsters=[];
  const m=new Monster(id,b.x-3,b.y);s.monsters=[m];m.aggro=true;p.x=m.x+distance;p.y=m.y;
  m.visAng=m.angT=0;p.stats.dodge=0;p.stats.block=0;p.tryBlock=()=>false;
  const hits=[];p.takeDamage=(amount,source,elem)=>hits.push({amount,elem,target:'hero'});
  return {s,p,m,c:m.imperialCombat,hits};
}
function companion(s,p,x,y,hits){const t={x,y,radius:.36,lvl:17,hp:1e6,dead:false,untargetable:false,tryBlock:()=>false,takeDamage:(amount,source,elem)=>hits.push({amount,elem,target:'companion'})};s.minions=[t];return t;}
for(const [id,profile] of Object.entries(D.ACT3_ENEMY_PROFILES)){
  const a=D.resolveEnemy(id,'khal_palace'),base=D.ENEMIES[id],outside=D.resolveEnemy(id,'weeping_marsh');
  for(const field of ['hp','dmg','xp','armor','def','lvl','speed','atkRate'])ok(JSON.stringify(a[field])===JSON.stringify(base[field]),id+' preserves '+field);
  ok(JSON.stringify(outside)===JSON.stringify(base),id+' unchanged outside Act III');
  a.act3Combat.role='mutated';ok(D.resolveEnemy(id,'khal_palace').act3Combat.role===profile.act3Combat.role,id+' isolated profile');
}
ok(D.resolveEnemy('sand_raider','khal_palace').artId==='identity_marauder_mace','raider equipped art');
for(const id of Object.keys(D.ACT3_ENEMY_PROFILES)){
  const ranged=D.resolveEnemy(id,'khal_palace').projectile;
  const {s,m,hits}=setup(id,ranged?6:1);
  f.tick(s,12);
  ok(hits.length>0,id+' executes actual damage');reports.push({id,hits:hits.length,attacks:m.imperialCombat.lastAttack});
}
for(const [id,profile] of Object.entries(D.ACT3_ENEMY_PROFILES)){
 if(profile.act3Combat.role==='boss')continue;
 const {s,p,m,c,hits}=setup(id,14),ranged=!!m.def.projectile,t=companion(s,p,m.x+(ranged?6:1),m.y,hits);
 c.cooldown=100;ok(m.pickTarget(p)===t,id+' basic selects companion');f.tick(s,5);
 ok(hits.some(h=>h.target==='companion')&&!hits.some(h=>h.target==='hero'),id+' basic damages selected companion');
 const elem=ranged?m.def.projectile.elem:profile.act3Combat.meleeElem||'phys';
 ok(hits.some(h=>h.elem===elem),id+' intended basic damage element');
}
// Single roll before damage, poison, stealing or successful-hit procs.
{
 const {s,p,m,c}=setup('tomb_guard',1);c.profile.guard=100;f.ctx.Math.random=()=>0;
 const hp=m.hp;p.stats.lifeSteal=100;p.stats.manaSteal=100;p.stats.preventHeal=true;p.stats.knockback=true;
 ok(p.strike(m,1,{auto:true})===0&&m.hp===hp&&!m.noHeal,'front block prevents full weapon packet and effects');
 p.x=m.x-1;ok(p.strike(m,1,{auto:true})>0&&m.hp<hp,'rear attacks bypass guard');
 p.x=m.x+1;m.hp=m.maxHp;m.stunT=1;ok(!c.block(p),'stunned guard cannot block');m.stunT=0;
 c.begin('melee',{windup:1,recovery:1},p);ok(!c.block(p),'attacking guard cannot block');c.cancel();
 const before=m.hp;m.takeDamage(5,p,null,'light');ok(m.hp<before,'spells bypass guard');
 const groundHp=m.hp;p.withSkillSource('ground_slam',()=>p.strike(m,1,{auto:true}));ok(m.hp<groundHp,'ground shockwaves bypass guard');
 m.hp=m.maxHp;m.action=null;p.x=m.x+1;m.visAng=0;
 const arrow=new f.Projectile({x:m.x+.1,y:m.y,tx:m.x-1,ty:m.y,speed:9,kind:'arrow',fromPlayer:true,quarryOnHit:true,quarryStacks:2});
 arrow.update(.01,s.map,p,s.monsters);ok(arrow.dead&&!m.quarry&&m.hp===m.maxHp,'blocked arrow never applies Quarry');
 m.visAng=0;c.profile.guard=25;let n=0;f.ctx.Math.random=U.rng(736);for(let i=0;i<10000;i++)n+=c.block(p);ok(n>2250&&n<2750,'25 percent guard rate');
}
// Geometry, target selection, cancellation and timing for every special.
for(const [id,profile] of Object.entries(D.ACT3_ENEMY_PROFILES)){
 const sp=profile.act3Combat.special;if(!sp)continue;
 const distance=sp.kind==='blink'?(sp.mode==='retreat'?2:6):['charge','leap','fan'].includes(sp.kind)?5:1;
 for(const dt of [1/20,1/60,1/120]){
  const {s,p,m,c,hits}=setup(id,distance);ok(c.trySpecial(true),id+' starts special');
  m.attackCd=100;const a=c.active,shape=JSON.parse(JSON.stringify(a.shape));
  if(sp.kind==='leap'){p.x=a.point.x;p.y=a.point.y;}
  const start={x:m.x,y:m.y};
  f.tick(s,a.windup-.05,dt);ok(hits.length===0,id+' no damage before warning');
  f.tick(s,.1,dt);ok(c.active?.stage!=='windup',id+' warning releases');
  if(sp.kind==='blink'){ok(U.dist(start.x,start.y,m.x,m.y)>1,id+' blink moves');ok(c.active?.stage==='recovery'&&c.active.remaining>.3,id+' blink recovery');}
  f.tick(s,.55,dt);
  if(!['blink','fan'].includes(sp.kind))ok(hits.length===1,id+' hits once at '+dt);
  if(sp.kind==='fan'){f.tick(s,.6,dt);ok(hits.length>=1,id+' projectile fan hits');}
  ok(N.clear(s.map,m.x,m.y,m.radius),id+' supported actor');
  ok(shape.kind===a.shape.kind,id+' geometry locked');
 }
 for(const interrupt of ['stun','freeze','death','map','world']){
  const {s,p,m,c,hits}=setup(id,distance);ok(c.trySpecial(true),id+' cancellation start');
  if(interrupt==='stun')m.stunT=2;
  if(interrupt==='freeze')m.frozen=s.time+2;
  if(interrupt==='death')m.dead=true;
  if(interrupt==='map')s.map=f.MapGen.generate('sand_tombs',4);
  if(interrupt==='world')G.__bossTest.setState({...s});
  c.advance(3);ok(!c.active&&hits.length===0,id+' cancel '+interrupt);
 }
}
for(const id of ['crystal_marauder','dune_serpent']){
 const {s,p,m,c,hits}=setup(id,12);const t=companion(s,p,m.x+4,m.y,hits);ok(m.pickTarget(p)===t,'charge selects companion');
 ok(c.trySpecial(true),id+' companion charge starts');f.tick(s,1.5);ok(hits.filter(h=>h.target==='companion').length===1,id+' charge damages companion once');
}
for(const id of ['dune_shade','prisoned_shade']){
 const {s,p,m,c}=setup(id,id==='dune_shade'?6:2);ok(c.trySpecial(true),'blink begins');const point=c.active.point;
 f.tick(s,.8);const dist=U.dist(m.x,m.y,p.x,p.y);ok(id==='dune_shade'?dist>1&&dist<2:dist>=5&&dist<=7,id+' role-correct destination');
 ok(N.findPath(s.map,m,p,{radius:m.radius,hop:false}),'blink remains connected');
}
for(const id of ['crystal_marauder','dune_serpent','stone_gargoyle']){
 const {s,p,m,c,hits}=setup(id,5),start={x:m.x,y:m.y};ok(c.trySpecial(true),id+' structural test begins');
 const point=c.active.point,cell=Math.floor(point.x)+Math.floor(point.y)*s.map.w;s.map.blocked[cell]=s.map.walls[cell]=1;
 c.advance(2);ok(U.dist(start.x,start.y,m.x,m.y)===0&&hits.length===0,id+' rechecks blocked destination');
}
{
 const {s,p,m,c}=setup('stone_gargoyle',5);ok(c.trySpecial(true),'occupied leap warning starts');
 const point=c.active.point;s.monsters.push(new Monster('gilt_construct',point.x,point.y));const start={x:m.x,y:m.y};c.advance(1);
 ok(U.dist(start.x,start.y,m.x,m.y)===0,'leap cancels when its landing footprint becomes occupied');
}
for(const targetKind of ['hero','companion']){
 const {s,p,m,c,hits}=setup('shard_construct',5);ok(c.trySpecial(true),'fan boundary starts');
 const a=c.active;c.advance(a.windup+.01);
 ok(s.projectiles.length===3&&s.projectiles.every(pr=>pr.bossLane?.width===a.shape.width),'fan projectiles carry exact warning lanes');
 const shot=s.projectiles[1],t=targetKind==='hero'?p:companion(s,p,0,0,hits);s.projectiles=[shot];
 t.x=shot.x+shot.vx*.1;t.y=shot.y+a.shape.width/2+.01;
 if(targetKind==='companion'){p.x=m.x+14;p.y=m.y+3;}
 for(let i=0;i<15;i++)shot.update(1/60,s.map,p,s.monsters);
 ok(hits.length===0,'fan warning edge is safe for '+targetKind);
}
// Every special uses the same boundary for the hero and a targetable companion.
for(const id of ['tomb_guard','gilded_thrall','gilt_construct','stone_gargoyle','shard_construct']){
 const {s,p,m,c,hits}=setup(id,12),ranged=['stone_gargoyle','shard_construct'].includes(id),t=companion(s,p,m.x+(ranged?5:1),m.y,hits);
 ok(c.trySpecial(true),id+' starts against companion');m.attackCd=100;
 if(id==='stone_gargoyle'){t.x=c.active.point.x;t.y=c.active.point.y;}
 f.tick(s,1.5);ok(hits.some(h=>h.target==='companion'),id+' special damages companion');
}
// Ranged enemies must fire from preferred distance and must not fire through walls.
for(const id of ['soul_chained','prisoned_shade','shard_construct']){
 const {s,p,m,c,hits}=setup(id,6);ok(m.def.keepDist<m.def.range,id+' consistent firing band');
 const mid=Math.floor(m.x+3)+Math.floor(m.y)*s.map.w;s.map.blocked[mid]=s.map.walls[mid]=1;
 ok(!c.trySpecial(true),id+' no special through wall');
 c.begin('bolt',{windup:.3,recovery:.3},p,null,{x:p.x,y:p.y});c.advance(.35);ok(s.projectiles.length===0,id+' no normal bolt through wall');
}
// Attack warnings remain accurate on the edge of the actual damage boundary.
for(const id of ['tomb_guard','gilded_thrall','gilt_construct','chained_sovereign']){
 const {s,p,m,c,hits}=setup(id,1);ok(c.trySpecial(true),'area starts');const a=c.active;
 p.x=a.shape.x+a.shape.radius+.01;p.y=a.shape.y;c.advance(a.windup+.01);ok(hits.length===0,id+' outside warning safe');
}
// No asynchronous summon/strike from the Sovereign survives an interruption.
{
 const {s,m,c}=setup('chained_sovereign',1);let fired=0;m.deferAttack(.5,()=>fired++);m.stunT=1;c.tick(.1);m.stunT=0;G.__bossTest.flush(1);ok(fired===0,'Sovereign callback cancelled even when stun expires');
}
{
 const {s,p,m,c}=setup('chained_sovereign',6);f.tick(s,14);ok(s.monsters.some(o=>o!==m&&['soul_chained','gilded_thrall'].includes(o.defId)),'Sovereign preserves summons');
 m.hp=m.maxHp*.2;f.tick(s,3);ok(m.enraged&&m.def.speed>D.ENEMIES.chained_sovereign.speed,'Sovereign preserves enrage');
}
for(const [zone,pool] of Object.entries(D.ACT3_ROSTERS)){
 const seen=new Set();
 for(let i=0;i<30;i++){
  const map=f.MapGen.generate(zone,i*7331),s=G.__bossTest.freshState(new f.Player('Roster QA','vanguard'),i);s.map=map;G.__bossTest.setState(s);
  ok(JSON.stringify(map.zone.spawns)===JSON.stringify(pool),zone+' authored roster');
  for(const spawn of map.monsterSpawns){ok(pool.includes(spawn.id)||spawn.id===map.zone.boss,zone+' curated spawn '+spawn.id);seen.add(spawn.id);const d=D.resolveEnemy(spawn.id,zone);ok(N.clear(map,spawn.x,spawn.y,.34*(d.big||1)*(spawn.elite?1.18:1)),zone+' footprint');}
  const radius=o=>.34*(D.ENEMIES[o.id].big||1)*(o.elite?1.18:1);
  ok(map.monsterSpawns.every((a,j)=>map.monsterSpawns.slice(j+1).every(b=>U.dist(a.x,a.y,b.x,b.y)>=radius(a)+radius(b))),zone+' non-overlapping spawns');
  for(const n of map.act3.landmarks){const groups=map.act3.encounters.filter(e=>e.landmarkId===n.id);if(groups.length>=4)ok(new Set(groups.map(e=>e.role)).size>=2,zone+'/'+n.id+' mixed court roles');}
  for(const fam of ['undead','beast','demon','construct','unavailable'])ok(G.__bossTest.enemiesByFamily(fam,17).every(id=>pool.includes(id)),zone+' curated '+fam+' event');
  if(zone==='shard_flats')ok(map.monsterSpawns.length>=15,'fifteen eligible kills');
  if(zone==='underground_market')ok(Object.values(map.act3.anchors.guards).flat().length===6,'six anchored relay guards');
 }
 for(const id of pool)ok(seen.has(id),zone+' 30-seed coverage '+id);
}
const report={status:'PASS',checks,enemies:reports,seedCount:30};
if(process.argv.includes('--record')){fs.mkdirSync('tests/qa/act3',{recursive:true});fs.writeFileSync('tests/qa/act3/combat_contract.json',JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify(report,null,2));
