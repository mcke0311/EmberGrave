/* Act III presentation only. Combat owns time, movement and damage. */
'use strict';
const Act3EnemyAnimation=(()=>{
  const clamp=v=>Math.max(0,Math.min(1,v));
  const media=window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const sequences={sand_raider:['melee','death'],tomb_guard:['melee','bash','death'],
    dune_shade:['melee','blink','death'],soul_chained:['bolt','death'],gilt_construct:['melee','pulse','death'],
    shard_construct:['bolt','fan','death'],crystal_marauder:['melee','charge','death'],
    gilded_thrall:['melee','sweep','death'],prisoned_shade:['bolt','blink','death'],
    dune_serpent:['melee','charge','death'],stone_gargoyle:['melee','leap','death']};
  let enabled=true;
  const eligible=m=>!!sequences[m?.defId]&&!!DATA.ACT3_ROSTERS[m.combatMap?.id]&&!m.isBoss;
  const valid=m=>eligible(m)&&m.combatWorld===Game.state&&m.combatMap===Game.state.map;
  function sample(m,pose){
    const ex=pose.ex;ex.act3Animation=undefined;
    if(!enabled||!valid(m))return;
    let id,frame;
    if(m.dead){
      if(m.exploded||m.corpseT<=0)return;
      id='death';frame=Math.min(5,Math.floor(clamp((12-m.corpseT)/.6)*6));
    }else{
      const a=m.imperialCombat?.active;
      if(!a||!['attack','cast'].includes(m.action?.state)||m.imperialCombat.disabled())return;
      id=a.kind;
      if(a.stage==='windup')frame=Math.min(2,Math.floor(clamp(1-a.remaining/a.windup)*3));
      else if(a.stage==='travel')frame=3;
      else if(a.stage==='recovery'){
        const start=id==='leap'?4:3;
        frame=start+Math.min(5-start,Math.floor(clamp(1-a.remaining/a.recovery)*(6-start)));
      }else return;
    }
    const row=sequences[m.defId].indexOf(id);if(row<0)return;
    const out=m._act3Animation||(m._act3Animation={});
    out.id=id;out.frame=frame;out.index=row*6+frame;out.asset='actor.act3.'+m.defId;
    out.alpha=id==='blink'&&!media?.matches?[1,.9,.65,.45,.85,1][frame]:1;
    ex.act3Animation=out;
  }
  return {sequences,eligible,sample,get enabled(){return enabled;},set enabled(value){enabled=!!value;}};
})();
