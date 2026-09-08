/* Act IV presentation. EnemySkills owns simulation, targeting and damage. */
'use strict';
const Act4EnemyAnimation=(()=>{
  const clamp=v=>Math.max(0,Math.min(1,v));
  const media=window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const zones=new Set(['cathedral1','cathedral2','cathedral_cinderwatch','cathedral_bastion']);
  const sequences={hollow_knight:['basic','cleave','return_sweep','death'],
    choir_priest:['bolt','heal','chorus','death'],soul_eater:['basic','rush','death'],
    memory_wraith:['basic','blink','strike','death']};
  const eligible=m=>!!sequences[m?.defId]&&zones.has(m.combatMap?.id)&&!!m.enemySkills&&!m.isBoss;
  const valid=m=>eligible(m)&&m.combatWorld===Game.state&&m.combatMap===Game.state.map;
  function sample(m,pose){
    const ex=pose.ex;ex.act4Animation=undefined;
    if(!valid(m))return;
    let id,frame;
    if(m.dead){
      if(m.exploded||m.corpseT<=0)return;
      id='death';frame=Math.min(5,Math.floor(clamp((12-m.corpseT)/.6)*6));
    }else{
      const a=m.enemySkills.active,t=Game.state.time;
      if(!a||Game.state.player.dead||m.stunT>0||m.frozen>t||m.feared>t||m.pulled||m.beckon?.until>t||m.fleeUntil>t)return;
      id=a.id;
      const duration=a.step&&id==='cleave'?a.s.secondWindup:a.step&&id==='blink'?a.s.strikeWindup:a.s.windup;
      const elapsed=Math.max(0,(duration||.35)-a.remaining);
      if(a.stage==='recovery'){
        if(id==='cleave'&&a.step)id='return_sweep';
        if(id==='blink'&&a.step)id='strike';
        const first=id==='rush'?4:3;
        frame=first+Math.min(5-first,Math.floor(clamp(1-a.remaining/a.s.recovery)*(6-first)));
      }else if(a.stage==='rush'){frame=3;}
      else if(a.stage==='windup'){
        // The controller immediately starts the next windup at the first impact.
        // Spend its first 120 ms showing that impact, without delaying damage.
        if(id==='cleave'&&a.step){
          if(elapsed<.12){id='cleave';frame=elapsed<.06?3:4;}
          else{id='return_sweep';frame=Math.min(2,Math.floor(clamp((elapsed-.12)/(duration-.12))*3));}
        }else if(id==='blink'&&a.step){
          if(elapsed<.1){id='blink';frame=elapsed<.05?4:5;}
          else{id='strike';frame=Math.min(2,Math.floor(clamp((elapsed-.1)/(duration-.1))*3));}
        }else {const count=id==='blink'?4:3;frame=Math.min(count-1,Math.floor(clamp(elapsed/(duration||.35))*count));}
      }else return;
    }
    const row=sequences[m.defId].indexOf(id);if(row<0)return;
    const out=m._act4Animation||(m._act4Animation={});
    out.id=id;out.frame=frame;out.index=row*6+frame;out.asset='actor.act4.'+m.defId;
    out.alpha=id==='blink'&&!media?.matches?[1,.85,.45,.3,.65,1][frame]:1;
    ex.act4Animation=out;
  }
  return {sequences,eligible,sample,hasZone:id=>zones.has(id)};
})();
