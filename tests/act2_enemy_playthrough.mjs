import fs from 'node:fs';
import vm from 'node:vm';
import {fixture} from './boss_fixture.mjs';
const quick=process.argv.includes('--quick'),pressure=process.argv.includes('--pressure'),seeds=quick?[123]:[0,1,123,12345,7331];
const zones=['weeping_marsh','drowned_crypt','hollow_reeds','spawn_pools','ritual_site'],classes=['vanguard','emberwitch','gravebinder','veilranger','wildkeeper'];
const output='tests/qa/act2_enemies/playthrough'+(pressure?'_pressure':'')+(quick?'_quick':'')+'.json',rows=[];
for(const version of ['before','after']){
 const f=fixture({dataSeed:7331,sourceDirectory:version==='before'?'tmp/act2_enemies/before/js':undefined}),{Game:G,DATA:D,U}=f;
 vm.runInContext(fs.readFileSync('tests/boss_loadouts.js','utf8'),f.ctx);const loadouts=vm.runInContext('BossLoadouts',f.ctx),maps={};
 for(const zone of zones)for(const seed of seeds){
  const map=maps[zone+'_'+seed]||=(f.MapGen.generate(zone,seed)),center=map.act2.landmarks[1];
  for(const classId of classes){
   const p=new f.Player('Act 2 ordinary equipment',classId),s=G.__bossTest.freshState(p,seed);s.map=map;s.quests={q11:{state:'done'},q12:{state:'active'}};
   G.__bossTest.setState(s);G.debugFlags.god=false;f.ctx.Math.random=U.rng(seed+7331);
   const spec=loadouts.apply(p,D.ZONES[zone].lvl),valid=(x,y,r)=>f.TerrainNavigation.clear(map,x,y,r)&&!map.hazard[(x|0)+(y|0)*map.w];
   function seat(x,y,r){for(let ring=0;ring<8;ring++)for(let k=0;k<(ring?16:1);k++){const px=x+Math.cos(k*Math.PI/8)*ring*.5,py=y+Math.sin(k*Math.PI/8)*ring*.5;if(valid(px,py,r)&&s.monsters.every(m=>U.dist(m.x,m.y,px,py)>m.radius+r+.1))return{x:px,y:py};}throw Error('No benchmark footing');}
   Object.assign(p,seat(center.x-5,center.y,p.radius));
   const pool=map.monsterSpawns.filter(sp=>!D.ENEMIES[sp.id].boss),ids=[];
   for(let i=0;i<6;i++){const sp=pool[(Math.floor(pool.length*(i+.5)/6)+seed%pool.length)%pool.length];ids.push(sp.id);const m=new f.Monster(sp.id,center.x,center.y);Object.assign(m,seat(center.x+1+(i%3)*1.7,center.y-2+Math.floor(i/3)*3,m.radius));m.aggro=true;s.monsters.push(m);}
   p.gainXp=()=>{};loadouts.prepareSummons(p,spec.summon,G.__bossTest.flush);p.mana=p.stats.maxMana;loadouts.prepareSummons(p,spec.secondarySummon,G.__bossTest.flush);p.mana=p.stats.maxMana;
   let damage=0,t=0,nextDecision=0;const receive=p.takeDamage.bind(p);p.takeDamage=(...args)=>{const old=p.hp;if(pressure)p.hp=1e6;const measure=p.hp;receive(...args);damage+=Math.max(0,measure-p.hp);if(pressure)p.hp=old;};
   const go=point=>{p.command={type:'move'};G.repath(p,point.x,point.y);};
   for(;t<150&&!p.dead&&s.monsters.some(m=>!m.dead);t+=.05){
    if(p.hp<p.stats.maxHp*.55&&p.healPool<p.stats.maxHp*.15&&p.belt[0])p.quaff(0);
    if(p.mana<p.stats.maxMana*.25&&p.manaPool<p.stats.maxMana*.1&&p.belt[1])p.quaff(1);
    if(t>=nextDecision){
     nextDecision=t+.15;const danger=s.fx.filter(x=>x.ttl>0&&['act2warning','enemywarning','slamwarning','meteorfall'].includes(x.type)).map(x=>x.shape||{...x,kind:x.kind||'circle'});
     const threatened=danger.some(sh=>f.BossEncounters.contains(sh,p.x,p.y));
     const living=s.monsters.filter(m=>!m.dead).sort((a,b)=>U.dist2(p.x,p.y,a.x,a.y)-U.dist2(p.x,p.y,b.x,b.y)),target=living[0];
     if(threatened){
      let best=null,score=Infinity;
      for(const r of [1,2,3,4])for(let k=0;k<24;k++){const point={x:p.x+Math.cos(k*Math.PI/12)*r,y:p.y+Math.sin(k*Math.PI/12)*r};
       if(valid(point.x,point.y,p.radius)&&f.TerrainNavigation.segment(map,p.x,p.y,point.x,point.y,p.radius)&&!danger.some(sh=>f.BossEncounters.contains(sh,point.x,point.y))&&living.every(m=>U.dist(m.x,m.y,point.x,point.y)>m.radius+p.radius+.15)){
        const rank=r+Math.max(0,U.dist(point.x,point.y,target.x,target.y)-(classId==='vanguard'?2:6))*.5;if(rank<score){score=rank;best=point;}
       }
      }if(best)go(best);
     }else if(target){
      if(classId==='gravebinder'&&!target.curseFrailty&&!p.action)p.performSkill('mark_of_frailty',target,null);
      if(spec.summon&&!s.minions.some(m=>!m.dead)&&p.mana>p.stats.maxMana*.3)p.performSkill(spec.summon,null,{x:p.x,y:p.y});
      const skill=p.resolveSkill(spec.main),rank=p.effRank(spec.main),canCast=!skill.mana||p.mana>=skill.mana(rank),totem=classId==='wildkeeper'&&s.fx.some(x=>x.type==='totem'&&x.ttl>0);
      p.command={type:'attack',target,skill:canCast&&!totem?spec.main:'basic',hold:true};
     }
    }
    s.time+=.05;p.update(.05);for(const m of [...s.monsters])m.update(.05,p,map);for(const mi of [...s.minions])mi.update(.05,p,map);for(const q of [...s.projectiles])q.update(.05,map,p,s.monsters);
    s.projectiles=s.projectiles.filter(q=>!q.dead);s.monsters=s.monsters.filter(m=>!m.dead||m.corpseT>0);s.minions=s.minions.filter(m=>!m.dead||m.deathT>0);G.__bossTest.updateFx(.05);G.__bossTest.flush(0);
   }
   const row={version,zone,seed,classId,ids,won:!s.monsters.some(m=>!m.dead),dead:p.dead,seconds:+t.toFixed(2),damage:+damage.toFixed(2),hpRemaining:+p.hp.toFixed(2),potions:p.belt.map(b=>b?.count||0),equipment:spec.equipment,skills:spec.skills};rows.push(row);
   if(quick)console.log(JSON.stringify({version,zone,seed,classId,won:row.won,seconds:row.seconds,damage:row.damage}));
   fs.writeFileSync(output,JSON.stringify({method:'Six-enemy mixed court encounters, ordinary level-matched gear, five classes, six healing and six aether draughts, 150 ms decisions, real damage and movement.',rows},null,2)+'\n');
  }
 }
}
const median=a=>a.toSorted((a,b)=>a-b)[Math.floor(a.length/2)],summary=[];
for(const zone of zones){const before=rows.filter(r=>r.version==='before'&&r.zone===zone),after=rows.filter(r=>r.version==='after'&&r.zone===zone);
 summary.push({zone,beforeWins:before.filter(r=>r.won).length,afterWins:after.filter(r=>r.won).length,total:before.length,duration:{before:median(before.map(r=>r.seconds)),after:median(after.map(r=>r.seconds))},damage:{before:median(before.map(r=>r.damage)),after:median(after.map(r=>r.damage))}});
}
fs.writeFileSync(output,JSON.stringify({mode:pressure?'Durability diagnostic: ordinary defenses and abilities; health restored after measuring each hit. Not a mortal victory test.':'Ordinary equipment and consumables; real deaths.',rows,summary},null,2)+'\n');console.log(JSON.stringify(summary));
