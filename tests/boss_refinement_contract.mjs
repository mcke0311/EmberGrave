import assert from 'node:assert/strict';
import {fixture} from './boss_fixture.mjs';
const {fresh,tick,Game:G,BossEncounters:B,DATA:D}=fixture();
let checks=0;
const ok=(v,label)=>{checks++;assert.ok(v,label);};
const close=(a,b,label)=>ok(Math.abs(a-b)<1e-7,label);
function setup(id,phase=0){const f=fresh(id);f.e.active=true;for(let i=1;i<=phase;i++){f.m.hp=f.m.maxHp*f.m.def.phases[i-1].at;f.e.phaseChange(i);}return f;}

// Pursuit is bounded even if navigation makes no progress; the queue advances.
for(const [id,phase,fallback] of [['korvath',0,'fissure'],['azram',0,'chains'],['malthoron',0,'chains'],['malthoron',1,'souls'],['vethriss',0,'light']]){
 const {s,p,m,e}=setup(id,phase);e.stage='idle';e.timer=0;e.rotation=e.config.rotations[phase].indexOf('cleave');
 p.x=m.x+8;m.chase=()=>{};tick(s,1.45);ok(!e.attack,id+' attacked too early');tick(s,.075);
 ok(e.attack?.id===fallback&&e.stage==='windup',id+' pursuit stalled');
 close(e.pursuit,0,'pursuit not reset');
}

for(const dt of [1/120,1/60,1/30,.05]){
 const {s,p,m,e}=setup('korvath',1);p.x=m.x+2;p.y=m.y;e.start('fissure',p);
 const first=e.attack,angle=first.shapes[0].angle;
 ok(first.stepCount===2&&first.stepIndex===0,'missing sequence indicator');
 e.execute();p.x=m.x-5;p.y=m.y-5;tick(s,.22+dt,dt);
 ok(e.stage==='windup'&&e.attack.stepIndex===1,'missing warned second fissure');
 close(e.attack.shapes[0].angle,angle+Math.PI/2,'second fissure retargeted');
 const shapes=JSON.stringify(e.attack.shapes);p.y+=3;tick(s,.5,dt);
 ok(e.stage==='windup'&&JSON.stringify(e.attack.shapes)===shapes,'follow-up warning moved or shortened');
 e.execute();tick(s,.22+dt,dt);ok(e.stage==='recovery'&&e.timer>=2-dt,'no final recovery');
}

{
 const {s,p,m,e}=setup('empty_archangel',1);e.start('descent',p);const landing={...e.attack.shapes[0]};
 p.x+=4;e.execute();tick(s,.25);
 ok(e.attack.id==='cross'&&e.stage==='windup','descent did not chain cross');
 close(m.x,landing.x,'landing drifted');close(e.attack.shapes[0].x,m.x-6,'cross not based on landing');
 p.x=m.x;p.y=m.y;let hits=0;p.takeDamage=()=>hits++;e.execute();
 ok(hits===1,'cross intersection applied multiple hits');
 e.execute();ok(hits===1,'same instantaneous strike repeated damage');
}

{
 const {p,m,e}=setup('mire_mother',1);
 e.pools=[{x:m.x+4,y:m.y,radius:1.6},{x:m.x+7,y:m.y,radius:1.6}];e.start('grasp',p);
 ok(e.pools.length===1&&e.pools[0].x===m.x+7,'Grasp did not clear entire overlapping pool');
 close(e.attack.recovery,2.25,'Grasp recovery');e.recover(2.25);
 ok(e.statusText().includes('+25%'),'exposed shard not communicated');
 const hp=m.hp;m.takeDamage(100,p,null,'shadow');close(hp-m.hp,125,'shard bonus changed');
}

for(const phase of [1,2]){
 const {s,p,e}=setup('azram',phase);tick(s,2.05);
 ok(e.attack.id==='portals','phase did not open with portals');e.execute();
 let portals=e.owned.filter(m=>!m.dead&&m.encounterKind==='portal');ok(portals.length===2,'portal pair absent');
 portals[0].takeDamage(1e9,p);close(e.timer,1.5,'first portal interruption');
 portals[1].takeDamage(1e9,p);close(e.timer,2.5,'pair did not grant longer opening');
 ok(!e.sequence&&!e.attack&&e.statusText().includes('Past Sealed'),'portal interruption left queued attack');
 e.start('portals',p);ok(e.attack.id!=='portals','pair regenerated');
}

for(const difficulty of [0,1,2]){
 const {s,p,m,e}=fresh('malthoron',123,'vanguard',difficulty);e.active=true;const base=e.base.armor;
 e.phaseChange(1);close(m.def.armor,base*.7,'first armor loss');e.phaseChange(1);close(m.def.armor,base*.7,'armor compounded');
 e.phaseChange(2);close(m.def.armor,base*.4,'second armor loss');
 for(const direction of [1,-1]){
  e.start('beam',p);const a=e.attack,start=a.startAngle;
  ok(a.sweepDirection===direction,'beam direction did not alternate');e.execute();tick(s,1);
  ok(Math.sign(a.shapes[0].angle-start)===direction,'beam traveled opposite cue');
 }
 e.reset();close(m.def.armor,base,'armor did not reset');e.start('beam',p);ok(e.attack.sweepDirection===1,'beam direction did not reset');
}

function echoes(){const f=setup('vethriss',1);f.e.start('decoys',f.p);f.e.execute();tick(f.s,.25);return f;}
{
 const {s,p,e}=echoes();ok(e.attack.id==='echoes'&&e.attack.windup===1.25,'illusion channel warning absent');
 const decoys=e.owned.filter(m=>!m.dead),removed=decoys[0].echoLane;
 decoys[0].takeDamage(1e9,p);ok(e.attack.shapes.length===2&&!e.attack.shapes.includes(removed),'dead illusion retained lane');
 for(const d of decoys.slice(1))d.takeDamage(1e9,p);
 ok(!e.sequence&&!e.attack&&e.stage==='recovery'&&e.timer===2,'clearing illusions did not cancel channel');
 tick(s,.025);ok(!s.monsters.some(m=>m.encounterKind==='decoy'),'shattered illusions left lingering bodies');
}
{
 const {p,e}=echoes();let hits=0;p.takeDamage=()=>hits++;
 // The three independently locked lanes meet at their original target.
 ok(e.attack.shapes.every(s=>B.contains(s,p.x,p.y)),'echo lanes did not lock target');
 e.execute();ok(hits===1&&e.owned.length===0,'echo pulse stacked hits or retained illusions');
}
for(const reason of ['phase','retreat','death','travel','interrupt']){
 const {s,p,m,e}=echoes();
 if(reason==='phase')e.phaseChange(2);
 if(reason==='retreat'){p.x=e.arena.x1+1;tick(s,.025);}
 if(reason==='death'){p.hp=1;G.onPlayerDeath(m);}
 if(reason==='travel')B.cancelAll();
 if(reason==='interrupt')e.clearAttacks();
 ok(!e.sequence&&!e.attack&&!e.owned.some(m=>!m.dead&&m.encounterKind==='decoy'),reason+' retained illusion channel');
}
for(const kind of ['beam','lunge','echoes']){
 const f=kind==='echoes'?echoes():setup('vethriss',2),{s,p,m,e}=f;
 if(kind!=='echoes')e.start(kind,p);
 if(kind==='beam'){const lane=e.attack.shapes[0];p.x=m.x+Math.cos(lane.angle)*2;p.y=m.y+Math.sin(lane.angle)*2;}
 p.hp=1;e.execute();tick(s,.5);
 ok(p.dead&&!e.active&&!e.attack&&!e.sequence&&!e.pools.length,kind+' lethal strike leaked state');
}

// Replay actual movement (including body separation) for each complete sequence.
// Candidate paths are only accepted if the hero can reach safety during the
// remaining warning, after a 150 ms reaction delay; mobility skills are unused.
let routes=0,steps=0;
function dodge(f){
 const {s,p,e}=f,a=e.attack,origin={x:p.x,y:p.y};
 const danger=[...e.pools,...(a.id==='portals'||a.id==='decoys'?[]:a.shapes)];
 if(!danger.some(sh=>B.contains(sh,p.x,p.y)))return;
 let escape=null;
 const duration=Math.max(0,e.timer-.15);
 for(const distance of [1,1.8,2.6,3.4,4.2]){
  for(let k=0;k<48&&!escape;k++){
   const x=origin.x+Math.cos(k*Math.PI/24)*distance,y=origin.y+Math.sin(k*Math.PI/24)*distance;
   if(!B.insideArena(e.arena,x,y,p.radius)||!B.footprint(s.map,x,y,p.radius))continue;
   p.x=origin.x;p.y=origin.y;
   let crossedPool=false;
   for(let t=0;t<duration;t+=.025){
    p.moveToward(Math.min(.025,duration-t),p.stats.moveSpeed,x,y,s.map,s.monsters);
    if(e.pools.some(sh=>!B.contains(sh,origin.x,origin.y)&&B.contains(sh,p.x,p.y)))crossedPool=true;
   }
   if(!crossedPool&&!danger.some(sh=>B.contains(sh,p.x,p.y))&&B.insideArena(e.arena,p.x,p.y,p.radius))escape={x:p.x,y:p.y};
  }
  if(escape)break;
 }
 ok(escape,`${f.m.defId} phase ${e.phase} ${a.id} step ${a.stepIndex} has no walking escape at ${origin.x},${origin.y}`);
 p.x=escape.x;p.y=escape.y;routes++;
}
for(const id of Object.keys(D.BOSS_ENCOUNTERS))for(let phase=0;phase<D.BOSS_ENCOUNTERS[id].phases.length;phase++){
 for(const attack of [...new Set(D.BOSS_ENCOUNTERS[id].rotations[phase])].flatMap(id=>id==='memory'?['memory','memory_choir']:[id]))for(const position of ['near','edge','corner'])for(const populated of [false,true]){
  const f=setup(id,phase),{s,p,m,e}=f;
  if(position!=='near'){
   m.x=e.arena.x1-4;m.y=position==='corner'?e.arena.y1-4:e.arena.cy;
   p.x=e.arena.x1-1;p.y=position==='corner'?e.arena.y1-1:m.y;
  }
  if(populated){e.clearOwned();for(let i=0;i<e.config.cap;i++)e.spawn('drowned_dead',m.x-2-i,m.y+2);}
  if(attack==='memory_choir')e.memoryIndex=1;
  e.start(attack==='memory_choir'?'memory':attack,p);
  for(let step=0;step<2&&e.stage==='windup';step++){
   dodge(f);steps++;e.execute();
   // Advance only to the next warning, preserving the dodged ground position.
   for(let t=0;t<4&&e.stage==='execute';t+=.025)tick(s,.025);
  }
 }
}
console.log(`PASS ${checks} refinement checks, ${steps} sequence steps and ${routes} collision-aware walking escapes.`);
