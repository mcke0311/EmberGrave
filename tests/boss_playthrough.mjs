import fs from 'node:fs';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
import {fixture} from './boss_fixture.mjs';
const baseline=process.argv.find(a=>a.startsWith('--baseline='))?.slice(11);
const sourceDirectory=process.argv.find(a=>a.startsWith('--source-directory='))?.slice(19);
const output=process.argv.find(a=>a.startsWith('--output='))?.slice(9);
const f=fixture({sourceDirectory,bossSource:baseline?execFileSync('git',['show',baseline+':js/boss_encounters.js'],{encoding:'utf8'}):undefined}),{Game:G,DATA:D,BossEncounters:B,U,ctx}=f;
vm.runInContext(fs.readFileSync(new URL('./boss_loadouts.js',import.meta.url),'utf8'),ctx);
const loadouts=vm.runInContext('BossLoadouts',ctx);
vm.runInContext(fs.readFileSync(new URL('./boss_driver.js',import.meta.url),'utf8'),ctx);
const driver=vm.runInContext('BossDriver',ctx);
const god=process.argv.includes('--durability');
const selected=process.argv.find(a=>a.startsWith('--boss='))?.split('=')[1];
const chosenClass=process.argv.find(a=>a.startsWith('--class='))?.split('=')[1];
const results=[];
if(process.argv.includes('--trace')){const take=f.Player.prototype.takeDamage;f.Player.prototype.takeDamage=function(raw,source,elem){const e=source?.encounter;console.log('HERO HIT',JSON.stringify({time:G.state.time,raw,elem,boss:source?.defId,attack:e?.attack?.id,pressure:e?.attack?.pressure,stage:e?.stage,timer:e?.timer,x:this.x,y:this.y,hp:this.hp,action:this.action&&{state:this.action.state,t:this.action.t,dur:this.action.dur},command:this.command?.type}));return take.call(this,raw,source,elem);};}
if(process.argv.includes('--trace')){const damage=f.Minion.prototype.takeDamage;f.Minion.prototype.takeDamage=function(n,o){if(G.state.time<35)console.log('PET HIT',G.state.time,n,o?.defId,this.hp);return damage.call(this,n,o);};const die=f.Minion.prototype.die;f.Minion.prototype.die=function(...args){if(G.state.time<35)console.log('PET DIED',G.state.time,this.hp,new Error().stack.split('\n').slice(1,4));return die.apply(this,args);};}
for(const id of selected?[selected]:Object.keys(D.BOSS_ENCOUNTERS))for(const classId of chosenClass?[chosenClass]:Object.keys(D.PLAYER_STARTER_LOADOUTS)){
 const {s,p,m,e}=f.fresh(id,123,classId),spec=loadouts.apply(p,D.ENEMIES[id].lvl);
 G.debugFlags.god=god;loadouts.prepareSummons(p,spec.summon,G.__bossTest.flush);p.mana=p.stats.maxMana;loadouts.prepareSummons(p,spec.secondarySummon,G.__bossTest.flush);p.mana=p.stats.maxMana;
 const pilot=driver.create(f,s,p,m,spec);
 let t=0,damage=0,hits=0,prevHp=p.hp,lastPhase=0,phaseStart=0;const phases=[],attacks=new Set();
 for(;t<480&&!m.dead&&!p.dead;t+=.05){
  const a=e.attack;
  if(a)attacks.add(a.id);
  if(e.phase!==lastPhase){phases.push({phase:lastPhase,seconds:+(t-phaseStart).toFixed(1)});phaseStart=t;lastPhase=e.phase;}
  pilot.step(t);
  s.time+=.05;p.update(.05);
  for(const mon of [...s.monsters])mon.update(.05,p,s.map);
  for(const mi of [...s.minions])mi.update(.05,p,s.map);
  for(const projectile of [...s.projectiles])projectile.update(.05,s.map,p,s.monsters);
  s.projectiles=s.projectiles.filter(o=>!o.dead);s.monsters=s.monsters.filter(o=>!o.dead||o.corpseT>0);s.minions=s.minions.filter(o=>!o.dead||o.deathT>0);
  G.__bossTest.updateFx(.05);G.__bossTest.flush(0);
  if(process.argv.includes('--trace')&&Math.abs(t/30-Math.round(t/30))<.0001)console.log('TRACE',t,Math.round(m.hp),e.stage,p.x,p.y,p.mana,s.minions.map(mi=>[mi.name,mi.dead,mi.x,mi.y,mi.attackCd,mi.hp]));
  if(p.hp<prevHp){damage+=prevHp-p.hp;hits++;}prevHp=p.hp;
 }
 phases.push({phase:lastPhase,seconds:+(t-phaseStart).toFixed(1)});
 const result={boss:id,class:classId,mode:god?'durability diagnostic':'ordinary playthrough',won:m.dead,dead:p.dead,seconds:+t.toFixed(1),bossRemaining:Math.round(m.hp/m.maxHp*100),playerHp:Math.round(p.hp),maxHp:p.stats.maxHp,damage:Math.round(damage),hits,healingLeft:p.belt[0]?.count||0,manaLeft:p.belt[1]?.count||0,phases,counters:pilot.counters,pressureCasts:pilot.pressureCasts,attacks:[...attacks],loadout:spec};
 results.push(result);console.log(JSON.stringify(result));
}
fs.mkdirSync('tests/qa/bosses',{recursive:true});
const name=baseline?'playthrough_baseline_refinement':god?'durability':'playthrough';
fs.writeFileSync(output||`tests/qa/bosses/${name}${selected?'_'+selected:''}${chosenClass?'_'+chosenClass:''}.json`,JSON.stringify({seed:123,step:.05,baseline:baseline||sourceDirectory||null,results},null,2)+'\n');
if(!god&&results.some(r=>!r.won))process.exitCode=1;
