/* Shared browser/VM playthrough driver: ordinary movement, skills and interactions. */
'use strict';
const BossDriver={
  create({Game:G,BossEncounters:B,U},s,p,m,spec){
    const e=m.encounter,classId=p.classId,go=point=>{p.command={type:'move'};G.repath(p,point.x,point.y);};
    let nextDecision=0;const counters=[];
    return {counters,step(t){
      if(p.hp<p.stats.maxHp*.55&&p.healPool<p.stats.maxHp*.15&&p.belt[0])p.quaff(0);
      if(p.mana<p.stats.maxMana*.25&&p.manaPool<p.stats.maxMana*.1&&p.belt[1])p.quaff(1);
      if(t<nextDecision)return;nextDecision=t+.15;
      if(!e.active&&e.arena.dedicated){go({x:e.arena.cx,y:e.arena.cy+6});return;}
      const a=e.attack,danger=[...e.pools];
      if(a&&['windup','execute'].includes(e.stage)&&!['portals','decoys'].includes(a.id))danger.push(...a.shapes);
      if(a?.id==='beam'&&['windup','execute'].includes(e.stage)){
        // The dashed sweep forecast is visible to a player before the beam moves.
        for(const ahead of [.15,.3,.45])danger.push({...a.shapes[0],angle:a.shapes[0].angle+ahead*a.sweepDirection});
      }
      let device=e.mechanic&&!e.mechanic.armed?e.arena.devices.find(d=>d.required&&!d.completed):null;
      if(device&&U.dist(p.x,p.y,device.x,device.y)<=device.interactionRange){
        p.command=p.path=null;
        if(G.interact(device,p))counters.push({phase:e.phase,device:device.deviceId,time:+t.toFixed(2)});
        device=null;
      }
      const threatened=danger.some(sh=>B.contains(sh,p.x,p.y));
      if(threatened){
        let escape=null,best=Infinity;
        for(const dist of [.8,1.4,2,2.8,3.6,4.2,5.5,7])for(let k=0;k<32;k++){
          const angle=k*Math.PI/16,x=p.x+Math.cos(angle)*dist,y=p.y+Math.sin(angle)*dist;
          if(!B.insideArena(e.arena,x,y,.7)||!B.footprint(s.map,x,y,p.radius)||danger.some(sh=>B.contains(sh,x,y))||s.monsters.some(o=>!o.dead&&U.dist(x,y,o.x,o.y)<p.radius+o.radius+.15))continue;
          const score=dist+(device?U.dist(x,y,device.x,device.y)*.15:Math.max(0,U.dist(x,y,m.x,m.y)-(classId==='vanguard'?2:6))*(classId==='vanguard'?1.4:.6));
          if(score<best){escape={x,y};best=score;}
        }
        if(escape){go(escape);return;}
      }
      if(device){go(device);return;}
      if(e.ward?.kind==='charge'){
        // Bait across the lit ward before the next aim lock, then dodge its warning.
        const w=e.ward,dx=w.x-m.x,dy=w.y-m.y,len=Math.hypot(dx,dy)||1;
        const bait={x:w.x+dx/len*3,y:w.y+dy/len*3};
        if(B.insideArena(e.arena,bait.x,bait.y,.7)&&B.footprint(s.map,bait.x,bait.y,p.radius))go(bait);
        return;
      }
      const owned=e.owned.filter(o=>!o.dead&&o.encounterKind!=='decoy');
      const target=owned.find(o=>o.encounterKind==='portal')||owned.sort((a,b)=>U.dist2(p.x,p.y,a.x,a.y)-U.dist2(p.x,p.y,b.x,b.y))[0]||m;
      if(e.mechanic&&target===m){p.command=p.path=null;return;}
      if(classId==='gravebinder'&&(!m.curseFrailty||m.curseFrailty.until<s.time)&&!p.action)p.performSkill('mark_of_frailty',m,null);
      if(spec.summon&&s.minions.filter(o=>!o.dead).length===0&&p.mana>p.stats.maxMana*.3)p.performSkill(spec.summon,null,{x:p.x,y:p.y});
      const skill=p.resolveSkill(spec.main),rank=p.effRank(spec.main),canCast=!skill.mana||p.mana>=skill.mana(rank);
      const useMain=canCast&&!(classId==='wildkeeper'&&s.fx.some(x=>x.type==='totem'&&x.ttl>0))&&!(classId==='gravebinder'&&s.fx.some(x=>x.type==='groundfield'&&x.fieldKind==='miasma'&&x.ttl>0&&U.dist(x.x,x.y,target.x,target.y)<x.radius));
      let detour=null;
      if(classId==='vanguard'&&target===m&&e.pools.length&&U.dist(p.x,p.y,m.x,m.y)>2){
        let nearest=Infinity;
        for(let k=0;k<32;k++){
          const x=m.x+Math.cos(k*Math.PI/16)*1.6,y=m.y+Math.sin(k*Math.PI/16)*1.6;
          if(e.pools.some(sh=>B.contains(sh,x,y))||!B.footprint(s.map,x,y,p.radius))continue;
          const d=U.dist(p.x,p.y,x,y);if(d<nearest){nearest=d;detour={x,y};}
        }
      }
      if(detour)go(detour);else p.command={type:'attack',target,skill:useMain?spec.main:'basic',hold:true};
    }};
  }
};
