import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fixture} from './boss_fixture.mjs';
import {ensureSnapshot} from './boss_arenas_baseline.cjs';

const f=fixture({dataSeed:7331,gameExports:['tryJump','coopJump']}),{DATA:D,Game:G,BossEncounters:B,U}=f;
const original={korvath:[10,19],mire_mother:[18,30],azram:[20,34],empty_archangel:[18,30],malthoron:[24,40],vethriss:[28,46]};
const health={korvath:3700,mire_mother:6200,azram:5500,empty_archangel:7100,malthoron:8000,vethriss:11500};
let checks=0,routes=0,intercepts=0;
const ok=(v,message)=>{checks++;assert.ok(v,message);};
const close=(a,b,message)=>ok(Math.abs(a-b)<1e-5,message+` (${a}, ${b})`);
function setup(id,phase=0,difficulty=0){
  const v=f.fresh(id,123,'vanguard',difficulty);f.tick(v.s,.05);
  for(let i=1;i<=phase;i++){v.m.hp=v.m.maxHp*v.m.def.phases[i-1].at;v.e.phaseChange(i);}
  if(v.e.mechanic?.kind==='mirror')v.e.completeMechanic('Test reflection');
  v.e.clearOwned();v.e.clearAttacks();v.e.recover(100);v.p.command=v.p.path=null;
  v.p.stats.moveSpeed=4;return v;
}

const before=fixture({dataSeed:7331,sourceDirectory:ensureSnapshot('tmp/boss_pressure/catalog_before', 'tests/fixtures/boss_pressure_before.json.gz')});
for(const [id,enemy] of Object.entries(before.DATA.ENEMIES))if(!original[id]){
  ok(JSON.stringify(D.ENEMIES[id])===JSON.stringify(enemy),id+' unrelated enemy catalog entry preserved');
}
for(const [id,damage] of Object.entries(original)){
  const catalog=o=>JSON.stringify({...o,dmg:null});
  ok(catalog(D.ENEMIES[id])===catalog(before.DATA.ENEMIES[id]),id+' health, defenses, phases and metadata preserved');
  close(D.ENEMIES[id].hp,health[id],id+' health preserved');
  for(const [i,value] of damage.entries())close(D.ENEMIES[id].dmg[i],value*5,id+' damage increased exactly once');
  for(const difficulty of [0,1,2]){
    const {m,e}=setup(id,0,difficulty),boosted=[...m.def.dmg];
    for(let phase=1;phase<e.config.phases.length;phase++){
      e.phaseChange(phase);ok(JSON.stringify(m.def.dmg)===JSON.stringify(boosted),id+' transformation never compounds damage');
    }
    e.reset();ok(JSON.stringify(m.def.dmg)===JSON.stringify(boosted),id+' retry never compounds damage');
    for(const source of ['strike','charge','beam','projectile','pool']){
      const capture=scaled=>{
        const {s,p,m,e}=setup(id,0,difficulty);m.def.dmg=m.def.dmg.map(n=>scaled?n:n/5);
        m.def.dmgMult=(m.def.dmgMult||1)*2.3*1.2;m.witherMult=()=>.75;
        let amounts=[];p.takeDamage=n=>{amounts.push(n);p.hp-=n;};const roll=U.rf;U.rf=(lo,hi)=>(lo+hi)/2;
        try{
          if(source==='strike'){p.x=m.x+2;p.y=m.y;e.start('cleave',p);e.execute();}
          if(source==='charge'){p.x=m.x;p.y=m.y+5;e.start('charge',p);e.execute();f.tick(s,.75);}
          if(source==='beam'){e.start('beam',p);p.x=m.x+Math.cos(e.attack.startAngle+.03)*2;p.y=m.y+Math.sin(e.attack.startAngle+.03)*2;e.execute();f.tick(s,.1);}
          if(source==='projectile'){p.x=m.x+3;p.y=m.y;e.start('souls',p);e.execute();f.tick(s,.8);}
          if(source==='pool'){p.x=m.x+3;p.y=m.y+2;e.start('bile',p);e.execute();amounts=[];e.recover(10);f.tick(s,.8);}
          ok(amounts.length>0,id+' '+source+' exercised actual damage path');return amounts.reduce((a,b)=>a+b,0);
        }finally{U.rf=roll;}
      };
      close(capture(true),capture(false)*5,id+' '+source+' respects difficulty, Echo multipliers and weakening');
    }
  }
}

function prime(v,kind,direction=1,dt=.05){
  const {p,m,e,s}=v,radius=7,speed=4,now=s.time,cx=m.x,cy=m.y;
  const path=time=>kind==='straight'?{x:cx+radius+speed*time,y:cy+4}:
    {x:cx+radius*Math.cos(.4+direction*speed/radius*time),y:cy+radius*Math.sin(.4+direction*speed/radius*time)};
  Object.assign(p,path(0));
  const samples=[];for(let t=-.3;t<1e-6;t+=dt)samples.push({...path(t),time:now+t});
  e.pressureTracks.set(p,{far:3.1,samples});return path;
}
for(const dt of [1/120,1/30,.05])for(const id of Object.keys(original))for(let phase=0;phase<D.BOSS_ENCOUNTERS[id].phases.length;phase++){
  for(const [kind,direction] of [['straight',1],['circle',1],['circle',-1]]){
    const v=setup(id,phase),{s,p,e}=v,path=prime(v,kind,direction,dt);let hits=0;
    p.takeDamage=n=>{if(n>0)hits++;p.hp-=n;};e.startPressure(p);
    for(let elapsed=0;elapsed<6&&e.stage!=='recovery';elapsed+=dt){
      if(!p.bossPull){const next=path(elapsed+dt);p.moveToward(dt,p.stats.moveSpeed,next.x,next.y,s.map,s.monsters);}
      s.time+=dt;e.update(dt,p,s.map);
    }
    ok(hits>0,id+' phase '+phase+' intercepts blind '+kind+' '+direction+' at '+dt);intercepts++;
  }
  for(const position of ['near','edge','corner'])for(const slowed of [false,true]){
    const v=setup(id,phase),{s,p,m,e}=v;
    const point=e.safePoint(position==='near'?m.x+7:e.arena.x1-2,position==='corner'?e.arena.y1-2:m.y,p.radius);
    Object.assign(p,point);if(slowed){p.slowT=5;p.slowPct=50;}
    e.startPressure(p);
    if(e.attack.id==='choir')f.tick(s,3.24,dt);
    const a=e.attack,locked=JSON.stringify(a.shapes),origin={x:p.x,y:p.y};
    let escape=null;const available=e.timer-.15;
    for(const distance of [1,1.8,2.6,3.4,4.2,5.5,7])for(let i=0;i<48&&!escape;i++){
      const x=origin.x+Math.cos(i*Math.PI/24)*distance,y=origin.y+Math.sin(i*Math.PI/24)*distance;
      if(!B.insideArena(e.arena,x,y,p.radius)||!B.footprint(s.map,x,y,p.radius))continue;
      const probe=Object.assign(Object.create(Object.getPrototypeOf(p)),p);
      for(let t=0;t<available;t+=dt)probe.moveToward(Math.min(dt,available-t),p.stats.moveSpeed,x,y,s.map,s.monsters);
      if(!a.shapes.some(sh=>B.contains(sh,probe.x,probe.y)))escape={x,y};
    }
    ok(escape,id+' phase '+phase+' '+position+' slowed='+slowed+' has a walking escape');
    let hits=0;p.takeDamage=n=>{if(n>0)hits++;p.hp-=n;};f.tick(s,.15,dt);
    const attack=a;
    for(let t=0;t<4&&e.attack===attack&&['windup','execute'].includes(e.stage);t+=dt){
      p.moveToward(dt,p.stats.moveSpeed,escape.x,escape.y,s.map,s.monsters);s.time+=dt;e.update(dt,p,s.map);
    }
    ok(hits===0,id+' '+position+' escape prevents damage at '+dt);
    ok(JSON.stringify(a.shapes)===locked,id+' warning stays locked after movement');routes++;
  }
}

for(const dt of [1/120,1/30,.05]){
  const {s,p,m,e}=setup('korvath'),d=e.arena.devices[0];
  p.x=d.x-2.5;p.y=d.y;e.start('charge',p);p.y+=4;e.execute();f.tick(s,.72,dt);
  ok(d.cooldown>23&&d.cooldown<=24&&d.completed,'Oath timer starts at 24 seconds');
  const remaining=d.cooldown;e.clearAttacks();e.recover(30);f.tick(s,remaining-.05,dt);
  ok(d.cooldown>0&&d.completed,'Oath target remains unavailable just before 24 seconds');
  f.tick(s,.06,dt);ok(!d.cooldown&&!d.completed,'Oath target ready after exactly 24 seconds');
  e.reset();f.tick(s,dt,dt);p.x=m.x+7;p.y=m.y;
  e.clearAttacks();e.recover(100);f.tick(s,2.9,dt);ok(!e.pressureTarget(),'pressure waits three seconds');
  f.tick(s,.2,dt);ok(e.pressureTarget()===p,'distant player becomes eligible');
  e.stage='idle';e.timer=0;f.tick(s,dt,dt);ok(e.pressure.casts===1&&e.attack.pressure,'eligible pressure starts at idle');
  e.clearAttacks();e.recover(100);f.tick(s,10.1,dt);ok(!e.pressureTarget(),'pressure requires an ordinary attack between casts');
  e.pressure.ordinary=true;ok(e.pressureTarget()===p,'pressure becomes available after ordinary rotation');
}

for(const dt of [1/120,1/30,.05]){
  const {s,p,m,e}=setup('korvath'),targets=e.arena.devices.filter(d=>d.arenaRole==='chargeTarget');
  const walkTo=(x,y)=>{
    p.path=f.TerrainNavigation.findPath(s.map,p,{x,y},{radius:p.radius,hop:false,speed:4});
    ok(p.path?.length,'ordinary walking route reaches an alternating Oath bait position');
    for(let t=0;t<12&&U.dist(p.x,p.y,x,y)>.2;t+=dt){p.moveAlong(dt,4,s.map,s.monsters);f.tick(s,dt,dt);}
    ok(U.dist(p.x,p.y,x,y)<.3,'Oath bait reached without a movement skill');p.path=null;
  };
  for(const [index,d] of [targets[0],targets[1],targets[0]].entries()){
    e.clearAttacks();e.recover(100);
    walkTo(p.x,e.home.y+4);walkTo(d.x+Math.sign(d.x-m.x)*2.5,e.home.y+4);
    walkTo(d.x+Math.sign(d.x-m.x)*2.5,d.y);
    if(d.cooldown>0)f.tick(s,d.cooldown+dt,dt);
    if(index===1)ok(targets[0].cooldown>0,'other Oath target can be baited before the first recharges');
    const before=e.counterEvents.length,dodge={x:p.x,y:p.y+4};e.start('charge',p);
    close(e.attack.windup,1.35,'alternating charges retain their original warning');
    const lane=e.attack.shapes[0];ok(lane.length>U.dist(m.x,m.y,d.x,d.y),'committed charge reaches the opposite target');
    for(let t=0;t<2.2&&e.counterEvents.length===before;t+=dt){
      if(t>=.15)p.moveToward(dt,4,dodge.x,dodge.y,s.map,s.monsters);f.tick(s,dt,dt);
    }
    ok(e.counterEvents.length===before+1&&d.cooldown>23,'walking sidestep produces one successful collision');
    close(e.recoveryDuration,3,'alternating target grants three-second knockdown');
  }
}

{
  const {s,p,m,e}=setup('azram'),other=new f.Player('Other','veilranger'),far=new f.Player('Far','veilranger');
  Object.assign(other,{x:m.x+8,y:m.y,heroId:'b'});Object.assign(far,{x:m.x-9,y:m.y,heroId:'a'});p.heroId='c';
  s.players=[p,other,far];for(const [player,time] of [[p,5],[other,4],[far,4]])e.pressureTracks.set(player,{far:time,samples:[]});
  ok(e.pressureTarget()===p,'longest exposure wins over distance');e.pressureTracks.get(p).far=4;
  ok(e.pressureTarget()===far,'distance breaks equal exposure');other.x=m.x+9;ok(e.pressureTarget()===far,'stable ID breaks equal distance');
  far.connected=false;ok(e.pressureTarget()===other,'disconnected hero cannot be selected');other.dead=true;ok(e.pressureTarget()===p,'dead hero cannot be selected');
  e.pressureTracks.clear();s.minions=[{x:m.x+12,y:m.y,dead:false}];e.observePressure(.05);ok(!e.pressureTarget(),'companions never trigger pressure');s.minions=[];
  prime({s,p,m,e},'circle');const point=e.projectTarget(p,1.25);ok(U.dist(point.x,point.y,p.x,p.y)>1,'motion observed before projection');
  p.x+=5;s.time+=.05;e.observePressure(.05);close(e.pressureTracks.get(p).samples.length,1,'teleport discards old motion');
  e.phaseChange(1);e.pressureTracks.set(p,{far:10,samples:[]});ok(!e.pressureTarget(),'mirror puzzle owns its complete sequence');
}
{
  const {p,e}=setup('mire_mother',1);e.pressureTracks.set(p,{far:10,samples:[]});e.floodPending=true;
  ok(!e.pressureTarget(),'flood-to-grasp sequence cannot be interrupted');e.floodPending=false;e.heartExposedUntil=e.world.time+4;
  ok(!e.pressureTarget(),'heart opening cannot be interrupted');
}
for(const kind of ['slow','pull'])for(const dt of [1/120,1/30,.05]){
  const {s,p,m,e}=setup(kind==='slow'?'mire_mother':'azram');p.x=m.x+8;p.y=m.y;
  G.debugFlags.god=true;e.startPressure(p);const shape=e.attack.shapes[0];Object.assign(p,{x:shape.x,y:shape.y});e.execute();
  ok(!p.bossPull&&!p.bossSlow,'negated damage grants no '+kind);G.debugFlags.god=false;
  p.stats.ccReduce=50;e.controlHit(p,kind);
  if(kind==='slow')close(p.bossSlow.until-s.time,.75,'crowd-control reduction shortens grasp');
  else{
    const from={x:p.x,y:p.y};G.__bossTest.tryJump({x:p.x,y:p.y+2});ok(!p.jumping,'pull prevents ordinary jump');
    G.__bossTest.coopJump(p,{x:p.x,y:p.y+2});ok(!p.jumping,'pull prevents co-op jump');
    ok(!p.performSkill('basic',m,null),'pull prevents conflicting attacks');
    f.tick(s,.4,dt);ok(!p.bossPull&&U.dist(from.x,from.y,p.x,p.y)<=3.00001,'pull ends and respects reduced distance');
    ok(B.insideArena(e.arena,p.x,p.y,p.radius)&&B.footprint(s.map,p.x,p.y,p.radius),'pull remains supported');
  }
  for(const reason of ['reset','phase','victory','death','travel']){
    e.active=true;e.controlHit(p,kind);
    if(reason==='reset')e.reset();if(reason==='phase')e.phaseChange(1);if(reason==='victory')e.finish();
    if(reason==='death')G.onPlayerDeath(m);if(reason==='travel')B.cancelAll();
    ok(!p.bossPull&&!p.bossSlow,reason+' clears boss control');p.dead=false;
  }
}
{
  const {s,p,m,e}=setup('azram');p.x=m.x+8;p.y=m.y;p.stats.ccReduce=100;e.controlHit(p,'pull');ok(!p.bossPull,'full control immunity prevents pull');
  p.stats.ccReduce=0;p.stats.rootImmune=true;e.controlHit(p,'pull');ok(!p.bossPull,'root immunity prevents pull');delete p.stats.rootImmune;
  const blocker=e.spawn('drowned_dead',p.x-2,p.y);blocker.def.speed=0;blocker.aggro=false;
  const start=p.x;e.controlHit(p,'pull');f.tick(s,.4);ok(p.x>blocker.x+p.radius+blocker.radius,'pull stops before another body');
  e.clearOwned();p.x=start;const index=Math.floor(p.y)*s.map.w+Math.floor(p.x-2);s.map.blocked[index]=1;
  e.controlHit(p,'pull');f.tick(s,.4);ok(p.x>start-2&&B.footprint(s.map,p.x,p.y,p.radius),'pull stops before blocked scenery');
}
for(const [classId,type] of [['vanguard','shout'],['gravebinder','devour']]){
  const {s,p,e}=f.fresh('mire_mother',123,classId);f.tick(s,.05);
  const skill=Object.entries(D.SKILLS).find(([,sk])=>sk.type===type)[0];p.skills[skill]=1;p.mana=p.stats.maxMana;
  if(type==='devour'){
    const corpse=new f.Monster('drowned_dead',p.x+1,p.y);corpse.dead=true;corpse.hp=0;corpse.corpseT=30;s.monsters.push(corpse);
  }
  e.controlHit(p,'slow');ok(p.bossSlow,'grasp applies before '+type+' cleanse');
  ok(p.performSkill(skill,null,{x:p.x,y:p.y}),type+' cleanse executes');
  ok(!p.bossSlow,type+' preserves its existing slow cleanse');
}
fs.mkdirSync('tests/qa/boss_pressure',{recursive:true});
fs.writeFileSync('tests/qa/boss_pressure/contract.json',JSON.stringify({passed:true,checks,intercepts,routes,rates:[20,30,120]},null,2)+'\n');
console.log(`PASS ${checks} boss damage, pressure and control checks; ${intercepts} blind routes intercepted, ${routes} walking escapes`);
