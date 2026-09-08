/* Act IV combat. Per-monster simulation state survives cached-map detours;
   no delayed callbacks, wall-clock timers, or mutations of the shared enemy catalog. */
'use strict';
const EnemySkills=(()=>{
  const zones=new Set(['cathedral1','cathedral2','cathedral_cinderwatch','cathedral_bastion']);
  const profiles=DATA.CATHEDRAL_ENEMY_SKILLS={
    hollow_knight:{enemy:'hollow_knight',basic:1,skills:{cleave:{cd:6,windup:.8,recovery:.9,mult:1.25,radius:2.4,arc:100*Math.PI/180,guard:.3}}},
    choir_priest:{enemy:'choir_priest',basic:.8,element:'shadow',skills:{heal:{cd:8,windup:.9,recovery:.35,amount:30,range:6}}},
    soul_eater:{enemy:'soul_eater',basic:1,drain:.15,drainCap:.05,skills:{rush:{cd:7,windup:.65,recovery:.8,mult:1,range:5,speed:10,width:1.3}}},
    memory_wraith:{enemy:'memory_wraith',basic:.8,element:'shadow',skills:{blink:{cd:7,windup:.8,strikeWindup:.4,recovery:.8,mult:.9,radius:1.8,arc:Math.PI/2,range:8,slow:20,slowTime:1.25}}},
    cathedral_knight_guardian:{enemy:'hollow_knight',basic:1,elite:{id:'oathbound',name:'Oathbound',tint:'#b9aed8'},skills:{cleave:{cd:8,windup:.8,secondWindup:.7,recovery:1.3,mult:.8,radius:2.4,arc:100*Math.PI/180,guard:.3}}},
    cathedral_priest_guardian:{enemy:'choir_priest',basic:.8,element:'shadow',elite:{id:'echoing',name:'Echoing',tint:'#b9aed8'},skills:{heal:{cd:8,windup:.9,recovery:.35,amount:30,range:6},chorus:{cd:10,windup:1,recovery:1.1,mult:.65,radius:2.2,range:9,slow:20,slowTime:1.25}}},
  };
  function profile(id,opts={},map=Game.state.map){
    if(!zones.has(map?.id))return null;
    const requested=profiles[opts.skillProfile];
    return requested?.enemy===id?requested:profiles[id]||null;
  }
  function eliteModifier(id,opts){const p=profile(id,opts);return p?.elite?{...p.elite,apply(){}}:null;}
  const contains=(s,x,y)=>BossEncounters.contains(s,x,y);
  const los=(map,a,b)=>U.los((x,y)=>MapGen.walkable(map,x,y),a.x,a.y,b.x,b.y);
  const interrupted=(m,p,t)=>p.dead||m.stunT>0||m.frozen>t||m.feared>t||m.pulled||m.beckon?.until>t||m.fleeUntil>t;
  const circle=(p,radius)=>({kind:'circle',x:p.x,y:p.y,radius});
  const cone=(p,angle,s)=>({kind:'cone',x:p.x,y:p.y,angle,radius:s.radius,arc:s.arc});
  function create(m,opts){const p=profile(m.defId,opts);return p?new Controller(m,p,opts?.skillProfile||m.defId):null;}
  class Controller {
    constructor(mon,p,id){
      this.mon=mon;this.profile=p;this.id=id;this.world=Game.state;this.map=this.world.map;
      this.cooldowns={};this.basicCd=0;this.healLock=0;this.active=null;
      const rng=U.rng(U.hash(mon.defId+':'+mon.x+':'+mon.y)^(this.map.cathedral?.seed??this.world.seed??0));
      for(const [key,s]of Object.entries(p.skills))this.cooldowns[key]=s.cd*(.35+rng()*.55);
      if(p.enemy==='choir_priest')mon.def.projectile={speed:8,kind:'soulbolt',elem:'shadow'};
      if(p.enemy==='memory_wraith')mon.spriteOpts.weapon='none';
      this.stats={started:0,hits:0,healed:0,drained:0,canceled:0};
    }
    valid(){return Game.state===this.world&&Game.state.map===this.map&&!this.mon.dead&&!this.world.player.dead&&this.world.monsters.includes(this.mon)&&(!this.mon.bossOwner||this.mon.bossOwner.encounter?.active);}
    cancel(){if(this.active){this.stats.canceled++;this.active=null;this.mon.action=null;this.mon.path=null;this.mon.moving=false;}}
    warning(){const a=this.active;return a?.signature&&a.stage!=='recovery'?a.shape:null;}
    slot(shape){
      let count=0;
      for(const other of this.world.monsters){
        if(other.dead||other===this.mon)continue;
        const s=other.enemySkills?.warning();if(s&&U.dist(s.x,s.y,shape.x,shape.y)<=10)count++;
        const e=other.encounter;if(e?.active&&e.stage==='windup'&&e.attack?.shapes.some(s=>U.dist(s.x,s.y,shape.x,shape.y)<=10))count++;
      }
      return count<2;
    }
    patientValid(target,s){return target&&!target.dead&&target!==this.mon&&!target.isBoss&&target.defId!=='choir_priest'&&!target.noHeal&&target.hp<target.maxHp&&
      this.world.monsters.includes(target)&&U.dist(this.mon.x,this.mon.y,target.x,target.y)<=s.range&&los(this.map,this.mon,target);}
    patient(s){
      return this.world.monsters.filter(m=>this.patientValid(m,s)&&!(m.enemySkills?.healLock>0)&&
        !this.world.monsters.some(o=>o.enemySkills?.active?.id==='heal'&&o.enemySkills.active.target===m))
        .sort((a,b)=>(b.maxHp-b.hp)-(a.maxHp-a.hp))[0];
    }
    allowed(x,y){const m=this.mon,a=this.map.bossArena;return !a||(m.bossOwner?BossEncounters.insideArena(a,x,y,m.radius):!BossEncounters.insideArena(a,x,y,-m.radius));}
    clearPoint(x,y){
      const m=this.mon,map=this.map;
      if(!this.allowed(x,y)||!TerrainNavigation.clear(map,x,y,m.radius)||map.void?.[Math.floor(x)+Math.floor(y)*map.w])return false;
      return ![this.world.player,...this.world.minions,...this.world.monsters].some(o=>o!==m&&!o.dead&&U.dist(x,y,o.x,o.y)<m.radius+(o.radius||.3)+.15);
    }
    blinkPoint(target){
      const angle=Math.atan2(target.y-this.mon.y,target.x-this.mon.x);
      for(const offset of [Math.PI/2,-Math.PI/2,Math.PI,0,Math.PI*.75,-Math.PI*.75]){
        const x=target.x+Math.cos(angle+offset)*1.6,y=target.y+Math.sin(angle+offset)*1.6;
        if(this.clearPoint(x,y))return {x,y};
      }
      return null;
    }
    rushShape(target,s){
      const m=this.mon,d=U.dist(m.x,m.y,target.x,target.y),angle=Math.atan2(target.y-m.y,target.x-m.x);
      let length=0,previous={x:m.x,y:m.y};
      for(let t=.1;t<=Math.min(s.range,d)+1e-8;t+=.1){
        const x=m.x+Math.cos(angle)*t,y=m.y+Math.sin(angle)*t;
        if(!this.allowed(x,y)||!TerrainNavigation.segment(this.map,previous.x,previous.y,x,y,m.radius))break;length=t;previous={x,y};
      }
      return length>=1.5?{kind:'line',x:m.x,y:m.y,angle,width:s.width,length}:null;
    }
    start(id,target){
      const m=this.mon,s=this.profile.skills[id];if(!s||!this.valid()||this.active||this.cooldowns[id]>0)return false;
      let shape,point;
      const d=target?U.dist(m.x,m.y,target.x,target.y):Infinity;
      if(id==='heal'){target=this.patient(s);if(!target)return false;shape=circle(target,.75);}
      else if(!target||target.dead||target.untargetable||!los(this.map,m,target))return false;
      else if(id==='cleave'){if(d>s.radius+.3)return false;shape=cone(m,Math.atan2(target.y-m.y,target.x-m.x),s);}
      else if(id==='rush'){if(d<=3||d>8)return false;shape=this.rushShape(target,s);}
      else if(id==='blink'){if(d<=4||d>s.range)return false;point=this.blinkPoint(target);if(point)shape=circle(point,m.radius+.3);}
      else if(id==='chorus'){if(d>s.range)return false;shape=circle(target,s.radius);}
      if(!shape||!this.slot(shape))return false;
      this.cooldowns[id]=s.cd;
      this.active={id,s,target,point,shape,stage:'windup',remaining:s.windup,signature:true,hit:new Set(),step:0,
        aim:target?{x:target.x,y:target.y}:null};
      this.stats.started++;this.pose(s.windup);Sfx.play(id==='rush'?'vox_beast':id==='cleave'?'block':'curse');return true;
    }
    pose(duration){const m=this.mon;m.path=null;m.moving=false;const a=this.active;if(a?.aim)m.face(a.aim.x,a.aim.y);m.startAction(['heal','chorus','bolt','blink'].includes(a?.id)?'cast':'attack',duration);}
    renderPose(o){
      const a=this.active;if(!a||this.mon.dead)return;
      o.state=['heal','chorus','bolt','blink'].includes(a.id)?'cast':'attack';
      const windup=a.id==='blink'&&a.step?a.s.strikeWindup:a.id==='cleave'&&a.step?a.s.secondWindup:a.s.windup||.35;
      o.t=a.stage==='recovery'?.5+.5*(1-a.remaining/a.s.recovery):a.stage==='rush'?.5:
        a.id==='cleave'&&!a.step?.12:.1+.35*(1-a.remaining/windup);
      o.ex.castColor=a.id==='heal'?'#a4d8da':'#c6b3ed';o.ex.walkPh=undefined;
    }
    recover(){const a=this.active;if(!a)return;a.stage='recovery';a.remaining=a.s.recovery;this.mon.action=null;this.mon.moving=false;}
    physicalMult(source,elem,detail){
      const a=this.active;if(!a||a.id!=='cleave'||a.stage!=='windup'||a.step!==0||!source||detail?.uniqueDot||(elem&&elem!=='phys'))return 1;
      const direction=Math.atan2(source.y-this.mon.y,source.x-this.mon.x)-a.shape.angle;
      return Math.abs(Math.atan2(Math.sin(direction),Math.cos(direction)))<=a.s.arc/2?1-a.s.guard:1;
    }
    hit(target,mult,elem='phys',{accuracy=false,drain=false,slow=0,slowTime=0,extras=false}={}){
      const m=this.mon;if(m.dead||target.dead||target.untargetable||target.groundImmune)return 0;
      if(accuracy&&Math.random()>U.clamp(.62+(m.lvl-(target.lvl||this.world.player.lvl))*.03,.35,.92)){Game.addFloat(target.x,target.y,'miss','#9a9a9a');return 0;}
      if(m.blindUntil>this.world.time&&Math.random()<.7)return 0;
      if(target.stats?.dodge>0&&Math.random()*100<target.stats.dodge){Game.addFloat(target.x,target.y,'evade','#b0a0d0');return 0;}
      if(target.tryBlock?.(m)){Sfx.play('block');return 0;}
      const before=Math.max(0,target.hp),damage=U.rf(...m.def.dmg)*(m.def.dmgMult||1)*2.2*m.witherMult()*mult;
      target.takeDamage(damage,m,elem);
      if(extras){
        for(const [kind,value]of Object.entries(m.def.elemDmg||{}))if(!target.dead)target.takeDamage(value*2,m,kind);
        if(m.def.poison&&!target.dead)target.takeDamage(m.def.poison,m,'poison');
        if(m.def.chillOnHit&&m.def.elemDmg){slow=Math.max(slow,30);slowTime=Math.max(slowTime,m.def.chillOnHit);}
      }
      const actual=Math.max(0,before-Math.max(0,target.hp));
      if(target.stats?.thorns>0&&!m.dead&&elem==='phys')m.takeDamage(target.stats.thorns,target);
      if(actual>0){
        this.stats.hits++;
        if(slow&&!target.dead){const previous=target.slowT>0?target.slowPct||0:0;target.slowT=Math.max(target.slowT||0,slowTime*(1-(target.stats?.ccReduce||0)/100));target.slowPct=Math.max(previous,slow);}
        if(drain&&!m.dead&&!m.noHeal){const amount=Math.max(0,Math.min(actual*this.profile.drain,m.maxHp*this.profile.drainCap,m.maxHp-m.hp));m.hp+=amount;this.stats.drained+=amount;if(amount>0)Game.addNova(m.x,m.y,.45,'#b6a2d1');}
      }
      return actual;
    }
    area(a,shape=a.shape){
      for(const t of [this.world.player,...this.world.minions]){
        if(this.mon.dead||!this.valid())break;
        if(t.dead||t.untargetable||a.hit.has(t)||!contains(shape,t.x,t.y)||!los(this.map,this.mon,t))continue;
        a.hit.add(t);this.hit(t,a.s.mult,a.id==='cleave'?'phys':'shadow',a.s);
      }
    }
    finishWindup(){
      const a=this.active,m=this.mon;if(!a)return;
      if(a.id==='heal'){
        if(this.patientValid(a.target,a.s)&&!(a.target.enemySkills?.healLock>0)){
          const healed=Math.min(a.s.amount,a.target.maxHp-a.target.hp);a.target.hp+=healed;if(a.target.enemySkills)a.target.enemySkills.healLock=8;
          this.stats.healed+=healed;Game.addNova(a.target.x,a.target.y,.8,'#a4d8da');Game.addFloat(a.target.x,a.target.y,'+'+Math.round(healed),'#a4d8da');Sfx.play('shrine');
        }
      }else if(a.id==='blink'&&a.step===0){
        if(!this.clearPoint(a.point.x,a.point.y)){this.recover();return;}
        Game.addNova(m.x,m.y,.6,'#b6a2d1');m.x=a.point.x;m.y=a.point.y;m.path=null;Sfx.play('portal');
        a.step=1;a.shape=cone(m,Math.atan2(a.aim.y-m.y,a.aim.x-m.x),a.s);a.remaining=a.s.strikeWindup;this.pose(a.remaining);return;
      }else if(a.id==='rush'){a.stage='rush';a.remaining=a.shape.length/a.s.speed;a.progress=0;this.pose(a.remaining);return;}
      else if(a.id==='bolt'){
        if(m.blindUntil>this.world.time&&Math.random()<.7)Game.addFloat(m.x,m.y,'blind','#9aa0a8');
        else if(!a.target.dead&&los(this.map,m,a.aim)){Game.spawnProjectile({x:m.x,y:m.y,tx:a.aim.x,ty:a.aim.y,speed:8,kind:'soulbolt',elem:'shadow',fromPlayer:false,mon:m,bossMult:this.profile.basic});Sfx.play('curse');}
      }else if(a.id==='basic'){
        if(!a.target.dead&&U.dist(m.x,m.y,a.target.x,a.target.y)<=m.def.range+a.target.radius+m.radius+.4&&los(this.map,m,a.target))
          this.hit(a.target,this.profile.basic,this.profile.element||'phys',{accuracy:true,drain:!!this.profile.drain,extras:true});
        Sfx.play(m.defId==='soul_eater'?'hit':this.profile.element==='shadow'?'curse':'swing');
      }else{
        this.area(a);Sfx.play(a.id==='cleave'?'swing':'curse');Game.addNova(a.shape.x,a.shape.y,.55,a.id==='cleave'?'#d8c9a6':'#b6a2d1');
        if(this.active!==a||m.dead)return;
        if(a.id==='cleave'&&a.s.secondWindup&&a.step===0){a.step=1;a.hit=new Set();a.remaining=a.s.secondWindup;this.pose(a.remaining);return;}
      }
      this.recover();
    }
    advanceRush(dt){
      const a=this.active,m=this.mon,old=a.progress,next=Math.min(a.shape.length,old+a.s.speed*dt);
      const x=a.shape.x+Math.cos(a.shape.angle)*next,y=a.shape.y+Math.sin(a.shape.angle)*next;
      if(!this.allowed(x,y)||!TerrainNavigation.segment(this.map,m.x,m.y,x,y,m.radius)){this.recover();return;}
      const segment={...a.shape,x:m.x-Math.cos(a.shape.angle)*.2,y:m.y-Math.sin(a.shape.angle)*.2,length:next-old+.4};
      m.x=x;m.y=y;m.moving=true;a.progress=next;
      if(!a.struck)for(const t of [this.world.player,...this.world.minions].filter(t=>!t.dead&&!t.untargetable).sort((x,y)=>U.dist(m.x,m.y,x.x,x.y)-U.dist(m.x,m.y,y.x,y.y))){
        if(contains(a.shape,t.x,t.y)&&contains(segment,t.x,t.y)){a.struck=true;this.hit(t,a.s.mult,'phys');break;}
      }
      if(next>=a.shape.length-1e-8)this.recover();
    }
    tick(dt,player,map){
      this.frameDt=dt;
      if(!this.valid()||map!==this.map){this.cancel();return false;}
      for(const key of Object.keys(this.cooldowns))this.cooldowns[key]=Math.max(0,this.cooldowns[key]-dt);
      this.basicCd=Math.max(0,this.basicCd-dt);this.healLock=Math.max(0,this.healLock-dt);
      if(interrupted(this.mon,player,this.world.time)){this.cancel();return false;}
      if(!this.active)return false;
      let left=dt;
      for(let steps=0;this.active&&left>1e-9&&steps<8;steps++){
        const a=this.active,part=Math.min(left,a.remaining);left-=part;a.remaining-=part;
        if(a.stage==='rush'){this.advanceRush(part);if(this.active!==a)break;if(a.stage==='recovery')continue;}
        if(a.remaining<=1e-8){if(a.stage==='recovery'){this.active=null;this.mon.action=null;}else this.finishWindup();}
      }
      return true;
    }
    fight(player,map){
      if(!this.valid()||interrupted(this.mon,player,this.world.time)||this.active)return;
      const m=this.mon,target=m.pickTarget(player);if(!target)return;
      for(const key of ['heal','chorus','cleave','rush','blink'])if(this.start(key,target))return;
      const d=U.dist(m.x,m.y,target.x,target.y),ranged=this.profile.enemy==='choir_priest',hasLos=los(map,m,target);
      const reach=ranged?m.def.range:m.def.range+target.radius+m.radius-.2;
      if(d<=reach&&hasLos&&this.basicCd<=0){
        const duration=ranged?.55:Math.min(.6,.9/m.def.atkRate),windup=ranged?.35:duration*.55;
        // Legacy ordinary attacks start their cooldown after the animation.
        // Include that occupied time so the new controller does not speed up basics.
        this.basicCd=1/m.def.atkRate+duration;
        this.active={id:ranged?'bolt':'basic',target,aim:{x:target.x,y:target.y},signature:false,stage:'windup',remaining:windup,s:{windup,recovery:duration-windup}};
        this.pose(duration);return;
      }
      if(ranged&&hasLos&&d<5&&d>.001){const x=m.x+(m.x-target.x)/d*1.5,y=m.y+(m.y-target.y)/d*1.5;
        if(TerrainNavigation.segment(map,m.x,m.y,x,y,m.radius)){m.path=[{cx:x,cy:y}];m.moveAlong(this.frameDt||1/60,m.def.speed,map,this.world.monsters);return;}}
      if(d>reach||!hasLos)m.chase(this.frameDt||1/60,target,map,(x,y)=>MapGen.walkable(map,x,y));else{m.moving=false;m.path=null;}
    }
  }
  function cancelAll(){for(const m of Game.state.monsters||[])m.enemySkills?.cancel();}
  function reserveBossWarning(encounter){
    if(!zones.has(Game.state.map?.id))return;
    // Boss timing takes priority. Cancel excess ordinary warnings immediately,
    // including when a boss starts after two enemies have already committed.
    let kept=0;
    for(const m of Game.state.monsters){const c=m.enemySkills,s=c?.warning();if(!s||m.dead)continue;
      if(encounter.attack.shapes.some(b=>U.dist(b.x,b.y,s.x,s.y)<=10)&&++kept>1)c.cancel();
    }
  }
  // Warning geometry still governs targeting, scheduling and boss priority.
  // Act IV communicates windups through authored poses, without warning UI.
  function draw(){}
  return {profiles,profile,eliteModifier,create,cancelAll,reserveBossWarning,draw,contains};
})();
