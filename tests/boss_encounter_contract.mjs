import assert from 'node:assert/strict';
import {fixture} from './boss_fixture.mjs';
const {DATA:D,Game:G,MapGen:M,BossEncounters:B,Monster,Projectile,fresh,tick}=fixture();
let checks=0;const ok=(v,m)=>{checks++;assert.ok(v,m);};
const ids=Object.keys(D.BOSS_ENCOUNTERS);

// Warning and damage use identical geometry, including gaps and the exact edge.
for(const [shape,yes,no] of [
  [{kind:'circle',x:0,y:0,radius:2},[2,0],[2.001,0]],
  [{kind:'ring',x:0,y:0,radius:5,inner:2.7},[3,0],[2,0]],
  [{kind:'line',x:0,y:0,angle:0,width:2,length:8},[4,1],[4,1.001]],
  [{kind:'cone',x:0,y:0,angle:0,radius:4,arc:Math.PI/2},[3,0],[-1,0]],
]){ok(B.contains(shape,...yes),'visible boundary missed');ok(!B.contains(shape,...no),'damage outside warning');}

for(const id of ids) {
  let {s,p,m,e}=fresh(id);e.active=true;
  e.start(id==='mire_mother'?'bile':'cleave',p);const locked=JSON.stringify(e.attack.shapes),hp=p.hp;
  tick(s,.9);ok(p.hp===hp,id+' damaged during warning');
  p.x=e.arena.cx-7;p.y=e.arena.cy-7;
  ok(JSON.stringify(e.attack.shapes)===locked,id+' warning followed player');
  tick(s,.2);ok(p.hp===hp,id+' dodging still took damage');
  tick(s,.25);ok(e.stage==='recovery',id+' has no recovery');
  tick(s,1);ok(e.stage==='recovery',id+' recovery too short');
  const defBefore=JSON.stringify(e.base);
  for(let phase=1;phase<e.config.phases.length;phase++){
    m.hp=m.maxHp*m.def.phases[phase-1].at;tick(s,.025);
    ok(e.phase===phase&&m.phaseIdx===phase,id+' phase missed');
    ok(e.stage==='transition'&&e.attack===null,id+' phase did not cancel attack');
    ok(m.spriteOpts.bossPhase===phase,id+' phase art not selected');
    const speed=m.def.speed;tick(s,.05);ok(m.def.speed===speed,id+' reapplied phase stats');
  }
  for(let i=0;i<20;i++)e.wave(['drowned_dead','drowned_dead']);
  ok(e.owned.filter(m=>!m.dead&&m.encounterKind!=='portal').length<=e.config.cap,id+' unbounded adds');
  e.start('bile',p);e.execute();
  G.spawnProjectile({x:m.x,y:m.y,tx:p.x,ty:p.y,speed:5,kind:'soulbolt',mon:m,bossOwner:m,fromPlayer:false});
  m.poisonDot={dps:50,t:10};m.scorch={until:100,dps:50};
  p.x=e.arena.x1+1;tick(s,.025);
  ok(!e.active&&e.phase===0&&m.hp===m.maxHp,id+' retreat did not reset');
  ok(e.owned.length===0&&e.pools.length===0&&!s.projectiles.some(p=>p.bossOwner===m),id+' retreat leaked threats');
  ok(!m.poisonDot&&!m.scorch,id+' retreat retained afflictions');
  ok(m.x===e.home.x&&m.y===e.home.y&&m.def.speed===e.base.speed,id+' reset changed spawn/stats');
  ok(JSON.stringify(e.base)===defBefore,id+' mutated immutable base');
  m.takeDamage(1e9,p);ok(m.hp===m.maxHp&&!m.dead,id+' damaged from outside arena');
}

// Every attack can be escaped on foot before impact from its targeted danger.
for(const id of ids){const {s,p,m,e}=fresh(id);e.active=true;
 for(const attack of new Set(e.config.rotations.flat())){
  if(['portals','decoys','memory'].includes(attack))continue;
  p.x=m.x+2;p.y=m.y;e.start(attack,p);
  const a=e.attack;
  if(!a.shapes.some(sh=>B.contains(sh,p.x,p.y)))continue;
  let escape=false;
  for(let angle=0;angle<Math.PI*2;angle+=Math.PI/24)for(const dist of [1,2,3]){
    const x=p.x+Math.cos(angle)*dist,y=p.y+Math.sin(angle)*dist;
    if(B.insideArena(e.arena,x,y,p.radius)&&B.footprint(s.map,x,y,p.radius)&&!a.shapes.some(sh=>B.contains(sh,x,y)))escape=true;
  }
  ok(escape,id+' '+attack+' requires mobility skill');
 }}

let {s,p,m,e}=fresh('azram');e.active=true;e.phaseChange(1);e.start('portals',p);e.execute();
ok(e.owned.filter(m=>m.encounterKind==='portal').length===2,'portal pair absent');
const portal=e.owned.find(m=>m.encounterKind==='portal'),xp=p.xp,gold=p.gold;
portal.takeDamage(1e9,p);ok(portal.dead&&e.stage==='recovery','destroyed portal did not expose Azram');
e.timer=20; // Isolate this portal pair from the next scheduled cast.
tick(s,8);ok(e.owned.filter(m=>!m.dead&&m.encounterKind==='add').length<=2,'destroyed portal still spawned');
ok(p.xp===xp&&p.gold===gold&&s.ground.length===0,'owned enemy awarded rewards');
e.start('portals',p);ok(e.attack.id==='chains','Azram regenerated an exhausted portal wave');
e.phaseChange(2);e.start('portals',p);ok(e.attack.id==='portals','next phase lost its portal wave');

// Swept lunge damage stays inside the locked lane, even between simulation steps.
for(const offset of [.79,.81]){
 ({s,p,m,e}=fresh('vethriss'));e.active=true;e.phaseChange(1);p.x=m.x+4;p.y=m.y;
 e.start('lunge',p);p.y+=offset;const hp=p.hp;e.execute();tick(s,.5,.05);
 ok((p.hp<hp)===(offset<.8),'lunge damage disagrees with its visible width');
}
// Ground hazards spare airborne companions and reduce unavoidable army collateral.
({s,p,m,e}=fresh('mire_mother'));e.active=true;
const damage=[];s.minions=[{x:p.x,y:p.y,dead:false,takeDamage:d=>damage.push(d)},{x:p.x,y:p.y,dead:false,groundImmune:true,takeDamage:()=>{throw Error('ground hit an airborne companion');}}];
const originalDamage=p.takeDamage;p.takeDamage=d=>damage.push(d);m.def.dmg=[10,10];
e.damage({kind:'circle',x:p.x,y:p.y,radius:2},1,'poison');
ok(damage.length===2&&Math.abs(damage[1]/damage[0]-.45)<1e-8,'army collateral multiplier');p.takeDamage=originalDamage;

// Normal, Nightmare and Hell each reset to their own already-scaled base stats.
({s,p,m,e}=fresh('empty_archangel'));e.active=true;p.x=m.x+2;p.y=m.y;e.start('wings',p);e.execute();
ok(s.projectiles.length===5&&s.projectiles.every(pr=>pr.bossLane&&pr.elem==='light'&&pr.ttl===2),'fan lost locked paths or element');
const shot=s.projectiles[2],hits=[];p.takeDamage=(amount,owner,element)=>hits.push({amount,element});p.stats.dodge=0;p.tryBlock=()=>false;
shot.x=p.x;shot.y=p.y;shot.vx=shot.vy=0;shot.update(.01,s.map,p,s.monsters);
ok(hits.length===1&&hits[0].element==='light','boss projectile ignored authored element');

for(const difficulty of [0,1,2])for(const id of ids){
 ({s,p,m,e}=fresh(id,123,'vanguard',difficulty));const hp=m.maxHp,stats=JSON.stringify(m.def.dmg);
 e.active=true;e.phaseChange(1);e.reset();ok(m.hp===hp&&JSON.stringify(m.def.dmg)===stats,id+' difficulty reset changed base');
}

// Repeated death/damage calls cannot award another copy of a boss's loot.
({s,p,m,e}=fresh('korvath'));e.active=true;m.takeDamage(1e9,p);
const rewards={xp:p.xp,ground:s.ground.length,flags:JSON.stringify(s.flags)};
m.takeDamage(1e9,p);m.die(p);tick(s,2);
ok(p.xp===rewards.xp&&s.ground.length===rewards.ground&&JSON.stringify(s.flags)===rewards.flags,'duplicate boss rewards');

({s,p,m,e}=fresh('vethriss'));m.takeDamage(1e9,p);ok(Math.abs(m.hp/m.maxHp-.7)<1e-8&&!m.dead,'first form skipped');tick(s,.025);
m.takeDamage(1e9,p);ok(Math.abs(m.hp/m.maxHp-.35)<1e-8&&!m.dead,'serpent skipped');tick(s,.025);
ok(e.phase===2&&m.spriteOpts.bossPhase===2,'shadow art absent');
for(const [id,signature] of [['korvath','fissure'],['mire_mother','bile'],['azram','chains'],['malthoron','beam']]){
 e.start('memory',p);ok(e.attack.remembered===id&&e.attack.id===signature,'wrong remembered signature');
}
m.takeDamage(1e9,p);ok(m.dead&&s.flags['dead_vethriss@0']&&!e.active,'final victory missing');

// A lethal hit during an attack cannot recreate its hazards after reset.
({s,p,m,e}=fresh('mire_mother'));e.active=true;p.hp=1;e.start('bile',p);e.execute();
ok(p.dead&&!e.active&&e.pools.length===0,'lethal impact left a live poison pool');

// No damage remains after death, travel, or state replacement.
for(const reason of ['death','travel','replace']){
 ({s,p,m,e}=fresh('korvath'));e.active=true;e.start('fissure',p);e.wave(['barb_guard']);
 if(reason==='death'){p.hp=1;G.onPlayerDeath(m);}else if(reason==='travel'){B.cancelAll();s.map=M.generate('frosthaven',1);}else{G.__bossTest.setState({...s,monsters:[]});e.prepare(p,s.map);}
 ok(!e.active&&e.owned.length===0&&!e.attack,reason+' leaked encounter');
}

// Arena generation never removes story requirements or seals a retreat path.
for(const id of ids)for(let seed=0;seed<32;seed++){
 const map=M.generate(D.BOSS_ENCOUNTERS[id].zone,seed),a=map.bossArena;
 ok(a&&a.x1-a.x0===21&&a.y1-a.y0===21,id+' arena dimensions');
 for(let y=a.y0;y<a.y1;y++)for(let x=a.x0;x<a.x1;x++){
  const i=x+y*map.w;ok(!map.blocked[i]&&!map.hazard[i]&&!map.elev[i],id+' arena obstructed at '+x+','+y);
 }
 const queue=[[map.spawns.default.x|0,map.spawns.default.y|0]],seen=new Set();
 for(let i=0;i<queue.length;i++){const [x,y]=queue[i],k=x+y*map.w;if(seen.has(k))continue;seen.add(k);for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy;if(nx>0&&ny>0&&nx<map.w-1&&ny<map.h-1&&!seen.has(nx+ny*map.w)&&M.canStep(map,x+.5,y+.5,nx+.5,ny+.5))queue.push([nx,ny]);}}
 ok(seen.has((a.cx|0)+(a.cy|0)*map.w),id+' arena disconnected');
 ok(a.approach&&seen.has((a.approach.x|0)+(a.approach.y|0)*map.w),id+' retreat disconnected');
 ok(!map.monsterSpawns.some(m=>m.id!==id&&B.insideArena(a,m.x,m.y)),id+' random monster in arena');
}
console.log(`PASS ${checks} boss checks: warning geometry, dodge routes, recovery, phases, ownership, retreat, death, signatures and 192 seeded arenas.`);
