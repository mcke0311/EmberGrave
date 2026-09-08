import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fixture} from './boss_fixture.mjs';
execFileSync('python',['tests/cathedral_enemy_baseline.py'],{stdio:'pipe'});
const zones=['cathedral1','cathedral2','cathedral_cinderwatch','cathedral_bastion'],rows=[],historical=process.argv.includes('--historical');
const authored=fixture({dataSeed:7331}).MapGen;
for(const version of ['before','after']){
 const F=fixture({dataSeed:7331,sourceDirectory:version==='before'?'tmp/cathedral_skills/before/js':undefined}),{Game:G,Player,Monster,MapGen:M,TerrainNavigation:N,U}=F;
 for(const zone of zones)for(let seed=1;seed<=20;seed++){
  const p=new Player('Matched melee probe','vanguard'),s=G.__bossTest.freshState(p,seed*7331);s.map=M.generate(zone,seed*7331);G.__bossTest.setState(s);G.debugFlags.god=false;F.ctx.Math.random=U.rng(seed*9173);
  p.lvl=20;p.attr={str:50,dex:45,vit:80,wil:20};p.equip.main={cat:'sword',dmg:[16,24],affixes:[],speed:1};p.computeStats();p.stats.armor=65;p.stats.block=15;p.stats.dodge=5;p.hp=p.stats.maxHp=1e7;
  const side=zone.includes('cathedral_'),room=s.map.cathedral.rooms.find(n=>n.id===(side?'sanctuary':zone==='cathedral1'?'nave':'bastion'));
  const spawnMap=historical?s.map:authored.generate(zone,seed*7331);
  const spawns=spawnMap.monsterSpawns.filter(a=>side?a.cathedralEncounter==='memory_guard':Math.abs(a.x-room.x)<=2&&a.y>=room.y&&a.y<=room.y+2);
  assert.equal(spawns.length,5);s.monsters=spawns.map(a=>new Monster(a.id,a.x,a.y,a));s.monsters.forEach(m=>m.aggro=true);p.x=room.x;p.y=room.y+6;
  let cd=0,time=0,pressure=0,attacks=0,target=null;const hpStart=s.monsters.reduce((n,m)=>n+m.maxHp,0);
  for(;time<120&&s.monsters.some(m=>!m.dead);time+=.05){
   if(!target||target.dead)target=s.monsters.filter(m=>!m.dead).sort((a,b)=>U.dist2(p.x,p.y,a.x,a.y)-U.dist2(p.x,p.y,b.x,b.y))[0];
   const d=U.dist(p.x,p.y,target.x,target.y),reach=p.stats.range+target.radius+.3;
   if(d>reach){const step=Math.min(d-reach+.05,4.6*.05*(p.slowT>0?1-p.slowPct/100:1)),x=p.x+(target.x-p.x)/d*step,y=p.y+(target.y-p.y)/d*step;
    if(N.segment(s.map,p.x,p.y,x,y,p.radius)){p.x=x;p.y=y;}else{if(!p.path?.length)p.path=N.findPath(s.map,p,target,{radius:p.radius,speed:4.6});p.moveAlong(.05,4.6,s.map,s.monsters);}
   }
   cd-=.05;if(d<=reach&&cd<=0){p.strike(target,1);cd=1/p.stats.attackRate;attacks++;}
   p.updateAnim(.05);const before=p.hp;F.tick(s,.05,.05);pressure+=Math.max(0,before-p.hp);
  }
  rows.push({version,zone,seed,seconds:+time.toFixed(2),pressure:+pressure.toFixed(2),attacks,initialEnemyHP:hpStart,won:!s.monsters.some(m=>!m.dead)});
 }
}
const results=zones.map(zone=>{const mean=(v,key)=>{const a=rows.filter(r=>r.zone===zone&&r.version===v);return a.reduce((n,r)=>n+r[key],0)/a.length;};const before={seconds:mean('before','seconds'),pressure:mean('before','pressure')},after={seconds:mean('after','seconds'),pressure:mean('after','pressure')};return{zone,before,after,timeChangePct:100*(after.seconds/before.seconds-1),pressureChangePct:100*(after.pressure/before.pressure-1)};});
const sum=(v,k)=>rows.filter(r=>r.version===v).reduce((n,r)=>n+r[k],0),aggregate={timeChangePct:100*(sum('after','seconds')/sum('before','seconds')-1),pressureChangePct:100*(sum('after','pressure')/sum('before','pressure')-1)};
const passed=rows.every(r=>r.won)&&Math.abs(aggregate.timeChangePct)<=15&&Math.abs(aggregate.pressureChangePct)<=15;
fs.writeFileSync('tests/qa/cathedral/enemy_balance'+(historical?'_historical':'')+'.json',JSON.stringify({status:passed?'PASS':'FAIL',method:`80 encounters per version, 20 seeds per zone; ${historical?'historical procedural/homogeneous rosters versus authored mixtures':'same new authored mixtures on old AI versus new skills, retaining old random elite modifiers in baseline'}. Same level-20 melee build, committed-target pursuit, normal accuracy/armor/block and 50 ms production monster/projectile simulation. Large player HP pool measures pressure without truncating encounters. No automatic warning dodging; this is a reproducible pressure probe, not a human playtest. Procedural catalog RNG fixed at 7331.`,results,aggregate,rows},null,2)+'\n');console.table(results);console.log(aggregate);if(!historical)assert.ok(passed,'aggregate balance exceeds approximately 15%');
