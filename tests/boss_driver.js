/* Shared browser/VM playthrough driver: ordinary movement, skills and interactions. */
'use strict';
const BossDriver={
  create({Game:G,BossEncounters:B,U},s,p,m,spec){
    const e=m.encounter,classId=p.classId,go=point=>{p.command={type:'move'};G.repath(p,point.x,point.y);};
    const attackReach=(id,target)=>p.skillTargetRange?.(id,target)??(p.stats.ranged?9:['projectile','groundfield','totem','curse'].includes(p.resolveSkill(id)?.type)?8.5:p.stats.range+target.radius+.25);
    const readySkill=target=>{
      const skill=p.resolveSkill(spec.main),rank=p.effRank(spec.main),canCast=!skill.mana||p.mana>=skill.mana(rank);
      return canCast&&!(classId==='wildkeeper'&&s.fx.some(x=>x.type==='totem'&&x.ttl>0))&&!(classId==='gravebinder'&&s.fx.some(x=>x.type==='groundfield'&&x.fieldKind==='miasma'&&x.ttl>0&&U.dist(x.x,x.y,target.x,target.y)<x.radius))?spec.main:'basic';
    };
    const attackTarget=()=>{
      const owned=e.owned.filter(o=>!o.dead&&o.encounterKind!=='decoy');
      return owned.find(o=>o.encounterKind==='portal')||owned.find(o=>o.encounterKind==='boundSoul')||owned.sort((a,b)=>U.dist2(p.x,p.y,a.x,a.y)-U.dist2(p.x,p.y,b.x,b.y))[0]||m;
    };
    let nextDecision=0,lastCounter=0,attempt=e.resetCount,dodging=null,dodgePoint=null;const counters=[];
    return {counters,pressureCasts:0,step(t){
      if(attempt!==e.resetCount){attempt=e.resetCount;lastCounter=0;counters.length=0;dodging=null;this.pressureCasts=0;}
      this.pressureCasts=Math.max(this.pressureCasts,e.pressure?.casts||0);
      for(const event of e.counterEvents||[])if(event.serial>lastCounter){counters.push({...event});lastCounter=event.serial;}
      if(p.hp<p.stats.maxHp*.55&&p.healPool<p.stats.maxHp*.15&&p.belt[0])p.quaff(0);
      if(p.mana<p.stats.maxMana*.25&&p.manaPool<p.stats.maxMana*.1&&p.belt[1])p.quaff(1);
      if(t<nextDecision)return;nextDecision=t+.15;
      if(p.bossPull)return;
      if(!e.active&&e.arena.dedicated){go({x:e.arena.cx,y:e.arena.cy+6});return;}
      const a=e.attack,danger=[...e.pools];
      if(a&&['windup','execute'].includes(e.stage)&&!['portals','decoys'].includes(a.id))danger.push(...a.shapes);
      if(a?.id==='beam'&&['windup','execute'].includes(e.stage)){
        for(let sweep=0;sweep<=.901;sweep+=.1)danger.push({...a.shapes[0],angle:a.startAngle+sweep*a.sweepDirection});
      }
      for(const shot of s.projectiles)if(!shot.dead&&shot.bossOwner===m&&shot.bossLane){
        const lane=shot.bossLane,along=(shot.x-lane.x)*Math.cos(lane.angle)+(shot.y-lane.y)*Math.sin(lane.angle);
        danger.push({...lane,x:shot.x,y:shot.y,length:Math.max(0,lane.length-along)});
      }
      for(let i=0;i<danger.length;i++){
        const shape=danger[i];danger[i]={...shape,...(shape.kind==='line'?{width:shape.width+.5}:shape.kind==='ring'?{radius:shape.radius+.25,inner:Math.max(0,shape.inner-.25)}:shape.radius?{radius:shape.radius+.25}:{})};
      }
      const shots=s.projectiles.some(o=>!o.dead&&o.bossOwner===m);
      const intended=attackTarget();
      if(dodging===a&&(['windup','execute'].includes(e.stage)||shots)&&dodgePoint){
        if(U.dist(p.x,p.y,dodgePoint.x,dodgePoint.y)>.2||danger.some(sh=>B.contains(sh,p.x,p.y))||
          U.dist(p.x,p.y,intended.x,intended.y)>attackReach(readySkill(intended),intended)){go(dodgePoint);return;}
      }else dodging=null;
      let device=e.mechanic?.kind==='mirror'&&!e.mechanic.armed?e.arena.devices.find(d=>d.required):null;
      if(device&&U.dist(p.x,p.y,device.x,device.y)<=device.interactionRange){
        p.command=p.path=null;
        if(device.cooldown===0)G.interact(device,p);
        if(e.mechanic?.armed)device=null;
      }
      // The fixed marker can be ahead of a moving hero. Follow the visible path
      // to impact time rather than waiting to step inside it before reacting.
      const wp=p.path?.[0],command=p.command,walkingAttack=command?.type==='attack'&&U.dist(p.x,p.y,command.target.x,command.target.y)>attackReach(command.skill,command.target);
      const goal=wp?{x:wp.cx??wp.x+.5,y:wp.cy??wp.y+.5}:walkingAttack?command.target:null;
      const distance=goal?U.dist(p.x,p.y,goal.x,goal.y):0;
      const travel=Math.min(distance,(p.stats.moveSpeed||4)*Math.max(.15,e.timer));
      const forecast=distance?{x:p.x+(goal.x-p.x)/distance*travel,y:p.y+(goal.y-p.y)/distance*travel}:p;
      const threatened=danger.some(sh=>B.contains(sh,p.x,p.y)||B.contains(sh,forecast.x,forecast.y));
      if(threatened){
        let escape=null;const candidates=[];
        for(const dist of [.8,1.4,2,2.8,3.6,4.2,5.5,7])for(let k=0;k<32;k++){
          const angle=k*Math.PI/16,x=p.x+Math.cos(angle)*dist,y=p.y+Math.sin(angle)*dist;
          if(!B.insideArena(e.arena,x,y,.7)||!B.footprint(s.map,x,y,p.radius)||danger.some(sh=>B.contains(sh,x,y))||s.monsters.some(o=>!o.dead&&U.dist(x,y,o.x,o.y)<p.radius+o.radius+.15))continue;
          const score=dist+(device?U.dist(x,y,device.x,device.y)*.15:Math.max(0,U.dist(x,y,m.x,m.y)-(classId==='vanguard'?2:6))*(classId==='vanguard'?1.4:.6));
          candidates.push({x,y,score});
        }
        candidates.sort((a,b)=>a.score-b.score);
        const remaining=e.stage==='windup'?Math.max(.05,e.timer-Math.max(0,(p.action?.dur||0)-(p.action?.t||0))):.75;
        for(const point of candidates.slice(0,40)){
          const probe=Object.assign(Object.create(Object.getPrototypeOf(p)),p);
          for(let elapsed=0;elapsed<remaining;elapsed+=.05)probe.moveToward(Math.min(.05,remaining-elapsed),p.stats.moveSpeed,point.x,point.y,s.map,s.monsters);
          if(!danger.some(sh=>B.contains(sh,probe.x,probe.y))){escape=point;break;}
        }
        if(!escape)escape=candidates[0];
        if(escape){dodging=a;dodgePoint=escape;go(escape);return;}
      }
      if(device){go(device);return;}
      // A held attack must not walk back into a still-announced strike.
      // Channels explicitly asking for attacks keep their counter opportunity.
      if(a&&['windup','execute'].includes(e.stage)&&!['choir','echoes','portals','decoys'].includes(a.id)){
        const upcoming=intended,distance=U.dist(p.x,p.y,upcoming.x,upcoming.y);
        const reach=attackReach(p.command?.skill||spec.main,upcoming);
        if(distance>reach||classId==='wildkeeper'&&!p.stats.ranged){p.command=p.path=null;return;}
      }
      const charges=counters.filter(c=>c.kind==='charge'),lastCharge=charges[charges.length-1]?.time??-100;
      if(m.defId==='korvath'&&(charges.length<2||t-lastCharge>40)&&['idle','recovery'].includes(e.stage)&&e.config.rotations[e.phase][e.rotation%e.config.rotations[e.phase].length]==='charge'){
        const targets=(e.arena.devices||[]).filter(d=>d.arenaRole==='chargeTarget'&&!d.cooldown);
        const choices=targets.map(d=>{
          const dx=d.x-m.x,dy=d.y-m.y,len=Math.hypot(dx,dy)||1;
          return {x:d.x+dx/len*2.5,y:d.y+dy/len*2.5};
        }).filter(b=>B.insideArena(e.arena,b.x,b.y,.7)&&B.footprint(s.map,b.x,b.y,p.radius)&&!danger.some(sh=>B.contains(sh,b.x,b.y)));
        choices.sort((a,b)=>U.dist2(p.x,p.y,a.x,a.y)-U.dist2(p.x,p.y,b.x,b.y));
        if(choices.length){go(choices[0]);return;}
      }
      const target=intended;
      if(e.mechanic?.blocksDamage&&target===m){p.command=p.path=null;return;}
      if(e.mechanic?.kind==='illusion'){p.command={type:'attack',target:m,skill:'basic',hold:true};return;}
      if(classId==='gravebinder'&&(!m.curseFrailty||m.curseFrailty.until<s.time)&&!p.action)p.performSkill('mark_of_frailty',m,null);
      if(spec.summon&&s.minions.filter(o=>!o.dead).length===0&&p.mana>p.stats.maxMana*.3)p.performSkill(spec.summon,null,{x:p.x,y:p.y});
      if(e.stage==='idle'&&e.timer<.2){p.command=p.path=null;return;}
      let detour=null;
      if(classId==='vanguard'&&target===m&&e.pools.length&&U.dist(p.x,p.y,m.x,m.y)>2){
        let nearest=Infinity;
        for(let k=0;k<32;k++){
          const x=m.x+Math.cos(k*Math.PI/16)*1.6,y=m.y+Math.sin(k*Math.PI/16)*1.6;
          if(e.pools.some(sh=>B.contains(sh,x,y))||!B.footprint(s.map,x,y,p.radius))continue;
          const d=U.dist(p.x,p.y,x,y);if(d<nearest){nearest=d;detour={x,y};}
        }
      }
      if(detour)go(detour);else p.command={type:'attack',target,skill:readySkill(target),hold:true};
    }};
  }
};
