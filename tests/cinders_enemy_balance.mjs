import fs from 'node:fs';
import vm from 'node:vm';
import {fixture} from './boss_fixture.mjs';
const out='tests/qa/cinders_enemies',fixtures={before:fixture({sourceDirectory:'tmp/cinders_enemies/before/js',dataSeed:518}),after:fixture({dataSeed:518})};
for(const f of Object.values(fixtures)){vm.runInContext(fs.readFileSync('tests/boss_loadouts.js','utf8'),f.ctx);f.loadouts=vm.runInContext('BossLoadouts',f.ctx);}
const ids=Object.keys(fixtures.after.DATA.ACT5_COMBAT_PROFILES).sort(),rows=[];
const classes=['vanguard','emberwitch'],seeds=[7,518,2301];
for(const seed of seeds)for(const classId of classes)for(const mode of ['single','pack'])for(const id of ids){
 for(const [version,f]of Object.entries(fixtures)){
  const {s,p}=f.fresh('vethriss',seed,classId),G=f.Game,d=f.DATA.ENEMIES[id];
  // Identical flat combat court isolates kit changes from incidental placement.
  s.map.surfaceVersion=0;s.map.blocked.fill(0);s.map.elev.fill(0);s.map.bossArena=null;s.map.hazards=[];s.map.zone={...s.map.zone,lvl:24,infight:true};
  const loadout=f.loadouts.apply(p,24);p.x=64.5;p.y=60.5;s.monsters=[];s.fx=[];s.projectiles=[];
  const count=mode==='single'?1:Math.round(((d.pack||[2,4])[0]+(d.pack||[2,4])[1])/2);
  for(let i=0;i<count;i++){const m=new f.Monster(id,59.5+(i%2),60.5+(i-(count-1)/2)*1.4);m.aggro=true;s.monsters.push(m);}
  const originals=s.monsters.slice();let incoming=0,hits=0,t=0;
  const take=p.takeDamage.bind(p);p.takeDamage=(...args)=>{const hp=p.hp;const result=take(...args);const actual=Math.max(0,hp-Math.max(0,p.hp));incoming+=actual;if(actual)hits++;return result;};
  for(;t<90&&!p.dead&&originals.some(m=>!m.dead);t+=.05){
   const target=s.monsters.filter(m=>!m.dead).sort((a,b)=>f.U.dist2(p.x,p.y,a.x,a.y)-f.U.dist2(p.x,p.y,b.x,b.y))[0];
   const skill=p.resolveSkill(loadout.main),rank=p.effRank(loadout.main),cast=!skill.mana||p.mana>=skill.mana(rank);
   p.command={type:'attack',target,skill:cast?loadout.main:'basic',hold:true};
   if(p.hp<p.stats.maxHp*.55&&p.healPool<p.stats.maxHp*.15&&p.belt[0])p.quaff(0);
   if(p.mana<p.stats.maxMana*.25&&p.manaPool<p.stats.maxMana*.1&&p.belt[1])p.quaff(1);
   s.time+=.05;p.update(.05);
   for(const m of [...s.monsters])m.update(.05,p,s.map);
   for(const mi of [...s.minions])mi.update(.05,p,s.map);
   for(const pr of [...s.projectiles])pr.update(.05,s.map,p,s.monsters);
   s.projectiles=s.projectiles.filter(x=>!x.dead);s.monsters=s.monsters.filter(x=>!x.dead||x.corpseT>0);
   G.__bossTest.updateFx(.05);G.__bossTest.flush(0);
  }
  rows.push({version,id,seed,classId,mode,count,seconds:+t.toFixed(2),incoming:+incoming.toFixed(2),hits,won:originals.every(m=>m.dead),dead:p.dead,heroMaxHp:p.stats.maxHp});
 }
 if(id===ids.at(-1))console.log('Measured',seed,classId,mode);
}
const median=a=>{a.sort((a,b)=>a-b);return (a[Math.floor((a.length-1)/2)]+a[Math.floor(a.length/2)])/2;};
const summary=(filter)=>Object.fromEntries(['before','after'].map(version=>{const r=rows.filter(x=>x.version===version&&filter(x));return[version,{encounters:r.length,seconds:median(r.map(x=>x.seconds)),incoming:median(r.map(x=>x.incoming)),wins:r.filter(x=>x.won).length,deaths:r.filter(x=>x.dead).length}];}));
const aggregate=summary(()=>true),change={seconds:100*(aggregate.after.seconds/aggregate.before.seconds-1),incoming:100*(aggregate.after.incoming/aggregate.before.incoming-1)};
const report={status:Object.values(change).every(x=>Math.abs(x)<=15)?'PASS':'FAIL',method:'Fresh working-tree archive; seeded catalog (518); all 50 types × three seeds × Vanguard/Emberwitch × single/native midpoint pack, both versions. Identical level-24 ordinary legal equipment and skill budgets; production movement, skills, AI, projectiles, potions, armor/resists. Identical flat court, four-tile initial approach. No warning dodge automation. 90-second cap; original pack defeat ends timing. All outcomes included, including defeats.',aggregate,changePct:change,cohorts:Object.fromEntries(classes.flatMap(c=>['single','pack'].map(m=>[c+'_'+m,summary(r=>r.classId===c&&r.mode===m)]))),rows};
fs.mkdirSync(out,{recursive:true});fs.writeFileSync(out+'/balance.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,aggregate,changePct:change}));if(report.status!=='PASS')process.exitCode=1;
