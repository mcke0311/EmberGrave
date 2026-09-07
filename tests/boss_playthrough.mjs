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
const god=process.argv.includes('--durability');
const selected=process.argv.find(a=>a.startsWith('--boss='))?.split('=')[1];
const chosenClass=process.argv.find(a=>a.startsWith('--class='))?.split('=')[1];
const results=[];
for(const id of selected?[selected]:Object.keys(D.BOSS_ENCOUNTERS))for(const classId of chosenClass?[chosenClass]:Object.keys(D.PLAYER_STARTER_LOADOUTS)){
 const {s,p,m,e}=f.fresh(id,123,classId),spec=loadouts.apply(p,D.ENEMIES[id].lvl);
 G.debugFlags.god=god;loadouts.prepareSummons(p,spec.summon,G.__bossTest.flush);p.mana=p.stats.maxMana;loadouts.prepareSummons(p,spec.secondarySummon,G.__bossTest.flush);p.mana=p.stats.maxMana;
 let t=0,nextDecision=0,damage=0,hits=0,prevHp=p.hp,lastPhase=0,phaseStart=0;const phases=[],attacks=new Set();
 const go=point=>{p.command={type:'move'};G.repath(p,point.x,point.y);};
 for(;t<480&&!m.dead&&!p.dead;t+=.05){
  const a=e.attack;
  if(a)attacks.add(a.id);
  if(e.phase!==lastPhase){phases.push({phase:lastPhase,seconds:+(t-phaseStart).toFixed(1)});phaseStart=t;lastPhase=e.phase;}
  if(p.hp<p.stats.maxHp*.55&&p.healPool<p.stats.maxHp*.15&&p.belt[0])p.quaff(0);
  if(p.mana<p.stats.maxMana*.25&&p.manaPool<p.stats.maxMana*.1&&p.belt[1])p.quaff(1);
  if(t>=nextDecision){
   nextDecision=t+.15;
   const danger=[...e.pools];
   if(a&&['windup','execute'].includes(e.stage)&&!['portals','decoys'].includes(a.id))danger.push(...a.shapes);
   const threatened=danger.some(sh=>B.contains(sh,p.x,p.y));
   if(threatened){
    let escape=null,best=Infinity;
    for(const dist of [.8,1.4,2,2.8,3.6,4.2]){
     for(let k=0;k<32;k++){
      const angle=k*Math.PI/16,x=p.x+Math.cos(angle)*dist,y=p.y+Math.sin(angle)*dist;
      if(B.insideArena(e.arena,x,y,1)&&B.footprint(s.map,x,y,p.radius)&&!danger.some(sh=>B.contains(sh,x,y))&&!s.monsters.some(o=>!o.dead&&U.dist(x,y,o.x,o.y)<p.radius+o.radius+.15)){
        // Keep usable attack range after a dodge; otherwise ranged heroes walk
        // outward every cast, then repeatedly attack-path back through a pool.
        const score=dist+Math.max(0,U.dist(x,y,m.x,m.y)-(classId==='vanguard'?2:6))*(classId==='vanguard'?1.4:.6);
        if(score<best){escape={x,y};best=score;}
      }
     }
    }
    if(escape)go(escape);
   }else{
    const owned=e.owned.filter(o=>!o.dead&&o.encounterKind!=='decoy');
    const target=owned.find(o=>o.encounterKind==='portal')||owned.sort((a,b)=>U.dist2(p.x,p.y,a.x,a.y)-U.dist2(p.x,p.y,b.x,b.y))[0]||m;
    if(classId==='gravebinder'&&(!m.curseFrailty||m.curseFrailty.until<s.time)&&!p.action)p.performSkill('mark_of_frailty',m,null);
    // Maintain a summon build; use real corpses for replacement skeletons.
    if(spec.summon&&s.minions.filter(o=>!o.dead).length===0&&p.mana>p.stats.maxMana*.3)p.performSkill(spec.summon,null,{x:p.x,y:p.y});
    const skill=p.resolveSkill(spec.main),rank=p.effRank(spec.main);
    const canCast=!skill.mana||p.mana>=skill.mana(rank);
    // Totems persist; staff attacks fill their cooldown instead of recasting in place.
    const useMain=canCast&&!(classId==='wildkeeper'&&s.fx.some(x=>x.type==='totem'&&x.ttl>0));
    let detour=null;
    if(classId==='vanguard'&&target===m&&e.pools.length&&U.dist(p.x,p.y,m.x,m.y)>2){
      let nearest=Infinity;
      for(let k=0;k<32;k++){
        const x=m.x+Math.cos(k*Math.PI/16)*1.6,y=m.y+Math.sin(k*Math.PI/16)*1.6;
        if(e.pools.some(sh=>B.contains(sh,x,y)))continue;
        const d=U.dist(p.x,p.y,x,y);if(d<nearest){nearest=d;detour={x,y};}
      }
    }
    if(detour)go(detour);else p.command={type:'attack',target,skill:useMain?spec.main:'basic',hold:true};
   }
  }
  s.time+=.05;p.update(.05);
  for(const mon of [...s.monsters])mon.update(.05,p,s.map);
  for(const mi of [...s.minions])mi.update(.05,p,s.map);
  for(const projectile of [...s.projectiles])projectile.update(.05,s.map,p,s.monsters);
  s.projectiles=s.projectiles.filter(o=>!o.dead);s.monsters=s.monsters.filter(o=>!o.dead||o.corpseT>0);s.minions=s.minions.filter(o=>!o.dead||o.deathT>0);
  G.__bossTest.updateFx(.05);G.__bossTest.flush(0);
  if(p.hp<prevHp){damage+=prevHp-p.hp;hits++;}prevHp=p.hp;
 }
 phases.push({phase:lastPhase,seconds:+(t-phaseStart).toFixed(1)});
 const result={boss:id,class:classId,mode:god?'durability diagnostic':'ordinary playthrough',won:m.dead,dead:p.dead,seconds:+t.toFixed(1),bossRemaining:Math.round(m.hp/m.maxHp*100),playerHp:Math.round(p.hp),maxHp:p.stats.maxHp,damage:Math.round(damage),hits,healingLeft:p.belt[0]?.count||0,manaLeft:p.belt[1]?.count||0,phases,attacks:[...attacks],loadout:spec};
 results.push(result);console.log(JSON.stringify(result));
}
fs.mkdirSync('tests/qa/bosses',{recursive:true});
const name=baseline?'playthrough_baseline_refinement':god?'durability':'playthrough';
fs.writeFileSync(output||`tests/qa/bosses/${name}${selected?'_'+selected:''}${chosenClass?'_'+chosenClass:''}.json`,JSON.stringify({seed:123,step:.05,baseline:baseline||sourceDirectory||null,results},null,2)+'\n');
if(!god&&results.some(r=>!r.won))process.exitCode=1;
