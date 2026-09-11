"use strict";
/* Act 2's small, instance-owned attack controller. Campaign bosses keep their
   separate controller. Pending work uses simulation time, never global timers. */
class Act2EnemyCombat {
  static eventSpawn(ids,x,y,opts={},group=[],random=Math.random){
    const state=Game.state,map=state.map,combat=DATA.ACT2_COMBAT,pool=combat.pools[map.id];
    const allowed=id=>pool[id]&&(combat.role(id)!=='ranged'||group.filter(m=>combat.role(m.defId)==='ranged').length<2)&&
      (combat.role(id)!=='specialist'||!group.some(m=>combat.role(m.defId)==='specialist'));
    const preferred=ids.filter(allowed),choices=preferred.length?preferred:Object.keys(pool).filter(id=>allowed(id)&&(!opts.monsterFamily||DATA.monsterFamily(id)===opts.monsterFamily));
    if(!choices.length)return null;
    const m=new Monster(U.pickR(random,choices),x,y,opts),angle=Math.atan2(y-state.player.y,x-state.player.x),role=combat.role(m.defId);
    const depth=role==='ranged'?3:role==='melee'?-1.5:0,origin={x:x+Math.cos(angle)*depth,y:y+Math.sin(angle)*depth};
    for(let ring=0;ring<=8;ring++)for(let k=0;k<(ring?24:1);k++){
      const at={x:origin.x+Math.cos(k*Math.PI/12)*ring*.5,y:origin.y+Math.sin(k*Math.PI/12)*ring*.5};
      const d=(at.x-x)*Math.cos(angle)+(at.y-y)*Math.sin(angle);
      if(role==='ranged'&&d<1||role==='melee'&&d>0)continue;
      if(!m.act2Combat.supported(at.x,at.y)||!TerrainNavigation.segment(map,x,y,at.x,at.y,m.radius))continue;
      if(Object.values(map.spawns).some(p=>U.dist(p.x,p.y,at.x,at.y)<8+m.radius))continue;
      if([state.player,...state.monsters,...state.minions].some(a=>!a.dead&&U.dist(a.x,a.y,at.x,at.y)<a.radius+m.radius+.2))continue;
      Object.assign(m,at);m.act2Grace=.6;return m;
    }return null;
  }
  static profile(def,opts) {
    const map=Game.state?.map,c=DATA.ACT2_COMBAT;
    if(!map?.act2||opts.act2Profile===false||def.id==='mire_mother'||def.beaconSpawn)return false;
    if(!Object.values(c.pools).some(p=>p[def.id])&&!['choirmaster','choir_herald','brood_mother'].includes(def.id))return false;
    if(!def.boss){const b=c.balance[map.id];def.hp=Math.round(def.hp*b.hp);def.xp=Math.round(def.xp*b.xp);def.dmg=def.dmg.map(v=>v*b.damage);if(def.poison)def.poison*=b.damage;if(def.deathBurst)def.deathBurst.dmg*=b.damage;}
    def.weapon=def.projectile?'wand':'none';
    if(def.id==='song_thrall')def.volley={cd:6,count:3,spread:.5};
    if(def.id==='silent_cultist')def.act2Slow={duration:.75,pct:20};
    if(def.summons){def.summons.max={lure_child:4,choir_herald:4,brood_mother:6,choirmaster:6}[def.id]||4;if(opts.summonOwner)delete def.summons;}
    if(def.slam){def.slam.windup=def.id==='brood_mother'?1:.9;def.slam.recovery=1;def.slam.elem=def.id==='blight_treant'?'poison':'phys';}
    if(def.deathBurst)def.deathBurst.windup=.8;
    if(def.detonateAllies)Object.assign(def.detonateAllies,{max:2,windup:.9,elem:'shadow'});
    if(def.meteorRain)Object.assign(def.meteorRain,{elem:'shadow',label:'Dissonant Requiem'});
    return true;
  }
  constructor(mon){
    this.mon=mon;this.world=Game.state;this.map=Game.state.map;this.pending=null;this.burst=null;this.history=[];
    this.cooldowns={basic:0,summon:mon.def.summons?.cd*.6||0,slam:mon.def.slam?.cd*.5||0,
      volley:mon.def.volley?.cd*.6||0,blink:2,lunge:3,dive:3,sacrifice:4,requiem:6};
  }
  valid(){return Game.state===this.world&&Game.state.map===this.map&&this.world.monsters.includes(this.mon)&&!this.world.player.dead;}
  blocked(){const m=this.mon;return m.stunT>0||m.frozen>this.world.time||m.pulled||m.beckon?.until>this.world.time||m.feared>this.world.time;}
  color(elem){return {cold:'#a8dfff',shadow:'#c49ee8',poison:'#b3db74',phys:'#e0c7a2'}[elem]||'#e0c7a2';}
  supported(x,y,r=this.mon.radius){return TerrainSurface.supported(this.map,x,y,r)&&!this.map.hazard[(x|0)+(y|0)*this.map.w];}
  clearSegment(a,b,r=this.mon.radius){return TerrainNavigation.segment(this.map,a.x,a.y,b.x,b.y,r);}
  point(x,y,r=this.mon.radius){
    for(let ring=0;ring<=4;ring++)for(let i=0;i<(ring?12:1);i++){
      const p={x:x+Math.cos(i*Math.PI/6)*ring*.7,y:y+Math.sin(i*Math.PI/6)*ring*.7};
      if(this.supported(p.x,p.y,r)&&!this.world.monsters.some(m=>!m.dead&&m!==this.mon&&U.dist(m.x,m.y,p.x,p.y)<m.radius+r+.1))return p;
    }return null;
  }
  shapes(points,elem){return points.map(s=>{const f={...s,type:'act2warning',owner:this.mon,controller:this,col:this.color(elem),ttl:1,maxTtl:1};this.world.fx.push(f);return f;});}
  cancel(){if(this.pending){for(const f of this.pending.warnings)f.ttl=0;for(const a of this.pending.held||[])a.act2Held=false;}this.pending=null;this.mon.jumpZ=0;this.mon.path=null;if(typeof Act2EnemyAnimation!=='undefined')Act2EnemyAnimation.cancel(this.mon);}
  start(id,shapes,windup,recovery,release,elem='phys',motion=null){
    const m=this.mon;this.cancel();m.path=null;m.moving=false;
    const cast=!!m.def.projectile||['summon','blink','sacrifice','requiem'].includes(id);
    m.startAction(cast?'cast':'attack',windup+recovery+(motion?.duration||0),{castColor:this.color(elem)});
    const warnings=this.shapes(shapes,elem);for(const f of warnings)f.ttl=f.maxTtl=windup;
    this.pending={id,warnings,windup,recovery,release,elem,motion,age:0,action:m.action,released:false};
    this.lastAbility=id;Sfx.play(cast?(elem==='cold'?'frost':'curse'):'swing');
  }
  damage(shapes,mult,elem,hit=new Set(),flat){
    const m=this.mon,damage=flat??U.rf(...m.def.dmg)*mult*(m.def.dmgMult||1)*2.2*m.witherMult();
    for(const t of [this.world.player,...this.world.minions])if(!t.dead&&!t.untargetable&&!t.groundImmune&&!hit.has(t)&&shapes.some(s=>BossEncounters.contains(s,t.x,t.y)&&U.los((x,y)=>MapGen.walkable(this.map,x,y),s.x,s.y,t.x,t.y))){hit.add(t);t.takeDamage(damage,m,elem);}
    return hit;
  }
  impact(shapes,mult,elem,hit,flat){
    if(typeof Act2EnemyAnimation!=='undefined')Act2EnemyAnimation.emit(this.mon,this.pending?.id||(this.mon.dead?'rupture':'impact'),shapes,elem);
    for(const s of shapes)this.mon.attackNova(s.x,s.y,s.radius||.8,this.color(elem));
    Sfx.play(elem==='poison'?'blast':elem==='shadow'?'curse':'slam');return this.damage(shapes,mult,elem,hit,flat);
  }
  update(dt){
    const m=this.mon;if(m.aggro)for(const k of Object.keys(this.cooldowns))this.cooldowns[k]-=dt;
    if(!this.valid()||m.summonOwner?.dead){this.cancel();return false;}
    const p=this.pending;if(!p)return false;
    if(!p.released&&(this.blocked()||m.action!==p.action)){this.cancel();return false;}
    p.age+=dt;m.path=null;m.moving=false;
    for(const f of p.warnings)f.ttl=Math.max(0,p.windup-p.age);
    if(p.steps)for(const step of p.steps){
      const warning=p.warnings[step.index];warning.ttl=Math.max(0,step.at-p.age);warning.maxTtl=p.steps[0].at;
      warning.hidden=p.age<step.at-warning.maxTtl;
      if(!step.done&&p.age+1e-8>=step.at){step.done=true;warning.ttl=0;step.run();}
    }
    if(p.age+1e-8>=p.windup&&!p.released){
      p.released=true;this.history.push(p.id);if(this.history.length>32)this.history.shift();
      for(const f of p.warnings)f.ttl=0;
      if(typeof Act2EnemyAnimation!=='undefined'&&!['dive','requiem','slam','sacrifice'].includes(p.id))Act2EnemyAnimation.emit(m,p.id,[],p.elem);
      p.release();if(this.pending!==p||m.dead)return true;
    }
    const motion=p.motion;
    if(p.released&&motion){
      const k=U.clamp((p.age-p.windup)/motion.duration,0,1),next={x:U.lerp(motion.from.x,motion.to.x,k),y:U.lerp(motion.from.y,motion.to.y,k)};
      if(motion.kind==='lunge'&&!motion.stopped){
        if(this.clearSegment(m,next)){const s={kind:'line',x:m.x,y:m.y,angle:Math.atan2(next.y-m.y,next.x-m.x),length:U.dist(m.x,m.y,next.x,next.y),width:motion.width};this.damage([s],m.def.charge.mult,'poison',motion.hit);m.x=next.x;m.y=next.y;}
        else motion.stopped=true;
      }else if(motion.kind==='dive'){m.x=next.x;m.y=next.y;m.jumpZ=Math.sin(k*Math.PI)*32;}
      if(k>=1&&!motion.done){motion.done=true;m.jumpZ=0;if(motion.kind==='dive')this.impact([{kind:'circle',...motion.to,radius:m.def.leap.radius}],m.def.leap.mult,'phys');}
    }
    if(p.age>=p.windup+(motion?.duration||0)+p.recovery){this.pending=null;if(m.action===p.action)m.action=null;}
    return true;
  }
  owned(){return this.world.monsters.filter(m=>!m.dead&&m.summonOwner===this.mon);}
  spawn(id,x,y,split=false){
    const radius=DATA.ENEMIES[id].big*.34||.34,p=this.point(x,y,radius);if(!p)return null;
    const child=new Monster(id,p.x,p.y,{minion:true,summonOwner:this.mon});
    child.aggro=true;child.act2Grace=.6;delete child.def.summons;
    if(split){child.summonOwner=null;child.scale*=.62;child.radius*=.62;child.spriteOpts.scale=child.scale;child.hp=child.maxHp=Math.round(child.maxHp*.35);delete child.def.splitOnDeath;}
    this.world.monsters.push(child);this.mon.attackNova(p.x,p.y,.8,this.color(id==='marsh_larvae'?'poison':'shadow'));return child;
  }
  summon(){
    const m=this.mon,s=m.def.summons;if(!s)return false;
    const available=s.max-this.owned().length;if(available<=0)return false;
    this.cooldowns.summon=s.cd;
    this.start('summon',[],.5,.2,()=>{for(let i=0;i<Math.min(s.count,available);i++){
      if(this.owned().length>=s.max)break;const a=Math.random()*Math.PI*2,id=Array.isArray(s.id)?U.pick(s.id):s.id;
      this.spawn(id,m.x+Math.cos(a)*2,m.y+Math.sin(a)*2);
    }},m.defId==='brood_mother'?'poison':'shadow');return true;
  }
  sacrifice(){
    const m=this.mon,s=m.def.detonateAllies;
    const allies=this.owned().filter(a=>U.dist(m.x,m.y,a.x,a.y)<s.range).slice(0,s.max);if(!allies.length)return false;
    this.cooldowns.sacrifice=s.cd;
    const shapes=allies.map(a=>({kind:'circle',x:a.x,y:a.y,radius:s.radius}));
    for(const a of allies){a.act2Held=true;a.path=null;}
    this.start('sacrifice',shapes,s.windup,.6,()=>{
      const active=[];allies.forEach((a,i)=>{a.act2Held=false;if(!a.dead&&a.summonOwner===m){a.act2Combat?.cleanup();a.dead=true;a.hp=0;a.corpseT=0;active.push(shapes[i]);}});
      this.impact(active,s.mult,'shadow');
    },'shadow');this.pending.held=allies;return true;
  }
  requiem(target){
    const m=this.mon,s=m.def.meteorRain,spots=[];
    for(let i=0;i<s.count;i++){const a=Math.random()*Math.PI*2,r=i?Math.random()*s.spread:0,p=this.point(target.x+Math.cos(a)*r,target.y+Math.sin(a)*r,.36);if(p)spots.push({kind:'circle',...p,radius:s.radius});}
    if(!spots.length)return false;this.cooldowns.requiem=s.cd;
    const hit=new Set();this.start('requiem',spots,s.warn+(spots.length-1)*.18,.8,()=>{},'shadow');
    this.pending.steps=spots.map((spot,index)=>({index,at:s.warn+index*.18,done:false,run:()=>this.impact([spot],s.mult,'shadow',hit)}));
    for(const [index,f] of this.pending.warnings.entries()){f.ttl=s.warn+index*.18;f.maxTtl=s.warn;f.hidden=index>0;}
    Game.addFloat(m.x,m.y,s.label,this.color('shadow'));return true;
  }
  bolt(target,volley=false){
    const m=this.mon,s=m.def.projectile,aim={x:target.x,y:target.y};m.face(aim.x,aim.y);this.cooldowns.basic=1/m.def.atkRate;
    if(volley)this.cooldowns.volley=m.def.volley.cd;
    this.start(volley?'volley':'bolt',[],volley?.45:.35,volley?.25:.2,()=>{
      if(m.blindUntil>this.world.time&&Math.random()<.7)return;
      if(!U.los((x,y)=>MapGen.walkable(this.map,x,y),m.x,m.y,aim.x,aim.y))return;
      const count=volley?3:1,angle=Math.atan2(aim.y-m.y,aim.x-m.x);
      for(let i=0;i<count;i++){const a=angle+(i-(count-1)/2)*(volley?.5:0);Game.spawnProjectile({x:m.x,y:m.y,tx:m.x+Math.cos(a)*m.def.range,ty:m.y+Math.sin(a)*m.def.range,speed:s.speed,kind:s.kind,elem:s.elem,fromPlayer:false,mon:m,enemySlow:m.def.act2Slow});}
      Sfx.play(s.elem==='cold'?'frost':s.elem==='shadow'?'curse':'firebolt');
    },s.elem);
  }
  melee(target){
    const m=this.mon,dur=Math.min(.6,.9/m.def.atkRate);this.cooldowns.basic=1/m.def.atkRate;m.face(target.x,target.y);
    this.start('melee',[],dur*.55,dur*.45,()=>{
      if(target.dead||U.dist(m.x,m.y,target.x,target.y)>m.def.range+target.radius+m.radius+.4||!U.los((x,y)=>MapGen.walkable(this.map,x,y),m.x,m.y,target.x,target.y))return;
      if(m.blindUntil>this.world.time&&Math.random()<.7)return;
      if(Math.random()>U.clamp(.62+(m.lvl-(target.lvl||this.world.player.lvl))*.03,.35,.92))return;
      if(target.stats?.dodge>0&&Math.random()*100<target.stats.dodge||target.tryBlock?.(m))return;
      target.takeDamage(U.rf(...m.def.dmg)*(m.def.dmgMult||1)*2.2*m.witherMult(),m);
      if(m.def.poison)target.takeDamage(m.def.poison,m,'poison');
      if(target.stats?.thorns&&!m.dead)m.takeDamage(target.stats.thorns,target);
      if(m.def.elemDmg)for(const [elem,v] of Object.entries(m.def.elemDmg))target.takeDamage(v*2,m,elem);
    });
  }
  act(dt,player,map){
    if(!this.valid()||this.mon.dead)return;
    const m=this.mon,t=m.pickTarget(player);if(!t)return;m.moving=false;
    const d=U.dist(m.x,m.y,t.x,t.y),los=U.los((x,y)=>MapGen.walkable(map,x,y),m.x,m.y,t.x,t.y);
    if(m.def.enrage&&!m.enraged&&m.hp<m.maxHp*m.def.enrage){m.enraged=true;m.def.speed*=1.4;m.def.atkRate*=1.3;m.def.dmgMult=(m.def.dmgMult||1)*1.25;m.tint='#b987d9';}
    if(m.def.summons&&this.cooldowns.summon<=0&&d<12&&los&&this.summon())return;
    if(m.def.detonateAllies&&this.cooldowns.sacrifice<=0&&d<m.def.detonateAllies.range&&los&&this.sacrifice())return;
    if(m.def.meteorRain&&this.cooldowns.requiem<=0&&d<m.def.meteorRain.range&&los&&this.requiem(t))return;
    if(m.def.teleports&&!m.movementLocked()&&this.cooldowns.blink<=0&&d>m.def.teleports.minDist&&los){
      this.cooldowns.blink=m.def.teleports.cd;const a=Math.atan2(t.y-m.y,t.x-m.x)+Math.PI/2,p=this.point(t.x+Math.cos(a)*2.6,t.y+Math.sin(a)*2.6);
      if(p){this.start('blink',[{kind:'circle',...p,radius:m.radius+.3}],.6,.6,()=>{if(this.supported(p.x,p.y)){m.x=p.x;m.y=p.y;m.path=null;this.mon.attackNova(p.x,p.y,.7,this.color('shadow'));}},'shadow');return;}
    }
    if(m.def.slam&&this.cooldowns.slam<=0&&d<m.def.slam.radius+.4&&los){
      const s=m.def.slam,shapes=[{kind:'circle',x:m.x,y:m.y,radius:s.radius}];this.cooldowns.slam=s.cd;
      this.start('slam',shapes,s.windup,s.recovery,()=>this.impact(shapes,s.mult,s.elem),s.elem);return;
    }
    if(m.def.charge&&!m.movementLocked()&&this.cooldowns.lunge<=0&&d>2.6&&d<m.def.charge.range&&los){
      const from={x:m.x,y:m.y},length=Math.min(d+1,m.def.charge.range),angle=Math.atan2(t.y-m.y,t.x-m.x),to={x:m.x+Math.cos(angle)*length,y:m.y+Math.sin(angle)*length},width=m.radius*2+.6;
      if(this.supported(to.x,to.y)&&this.clearSegment(from,to)){
        this.cooldowns.lunge=m.def.charge.cd;
        this.start('lunge',[{kind:'line',...from,angle,length,width}],.7,.8,()=>{},'poison',{kind:'lunge',from,to,width,duration:length/(m.def.charge.speed||12),hit:new Set()});return;
      }
    }
    if(m.def.leap&&!m.movementLocked()&&this.cooldowns.dive<=0&&d>2.6&&d<m.def.leap.range&&los){
      const from={x:m.x,y:m.y},to=this.point(t.x,t.y);if(to&&this.clearSegment(from,to)){
        this.cooldowns.dive=m.def.leap.cd;this.start('dive',[{kind:'circle',...to,radius:m.def.leap.radius}],.8,1,()=>{if(!this.supported(to.x,to.y)||!this.clearSegment(from,to))this.cancel();},'phys',{kind:'dive',from,to,duration:.55});return;
      }
    }
    if(m.def.projectile){
      if(los&&d<m.def.range&&this.cooldowns.basic<=0){this.bolt(t,!!m.def.volley&&this.cooldowns.volley<=0);return;}
      if(los&&d<m.def.keepDist-1){const p=this.point(m.x+(m.x-t.x)/(d||1)*1.5,m.y+(m.y-t.y)/(d||1)*1.5);if(p&&this.clearSegment(m,p)){m.path=[{cx:p.x,cy:p.y}];m.moveAlong(dt,m.def.speed,map,this.world.monsters);return;}}
      if(!los||d>m.def.range-1)m.chase(dt,t,map,(x,y)=>MapGen.walkable(map,x,y));return;
    }
    if(d<=m.def.range+t.radius+m.radius-.2){m.path=null;if(this.cooldowns.basic<=0)this.melee(t);}
    else m.chase(dt,t,map,(x,y)=>MapGen.walkable(map,x,y));
  }
  cleanup(){this.cancel();for(const child of this.owned()){child.act2Combat?.cleanup();child.dead=true;child.hp=0;child.corpseT=0;}}
  onDeath(){
    const m=this.mon;this.cleanup();const b=m.def.deathBurst,split=m.minion?null:m.def.splitOnDeath;
    if(!b&&!split)return;
    const shapes=b?[{kind:'circle',x:m.x,y:m.y,radius:b.radius}]:[];
    this.burst={age:0,duration:b?.windup||.2,shapes,warnings:this.shapes(shapes,b?.elem||'poison'),b,split};
    for(const f of this.burst.warnings){f.corpse=true;f.ttl=f.maxTtl=this.burst.duration;}
  }
  updateDead(dt){
    const b=this.burst,m=this.mon;if(!b)return;
    if(!this.valid()){for(const f of b.warnings)f.ttl=0;this.burst=null;m.spriteOpts.scale=m.scale;return;}
    b.age+=dt;m.spriteOpts.scale=m.scale*(1+.16*Math.min(1,b.age/b.duration));
    for(const f of b.warnings)f.ttl=Math.max(0,b.duration-b.age);
    if(b.age+1e-8<b.duration)return;
    this.burst=null;m.spriteOpts.scale=m.scale;for(const f of b.warnings)f.ttl=0;
    if(b.b)this.impact(b.shapes,1,b.b.elem,new Set(),b.b.dmg);
    if(b.split)for(let i=0;i<b.split.count;i++)this.spawn(b.split.id||m.defId,m.x+Math.cos(i*Math.PI)*1.2,m.y+Math.sin(i*Math.PI)*1.2,true);
  }
  static cancelAll(){for(const m of Game.state.monsters){const c=m.act2Combat;if(!c)continue;c.cancel();if(c.burst)for(const f of c.burst.warnings)f.ttl=0;c.burst=null;m.spriteOpts.scale=m.scale;}}
  static slow(target,effect){
    const duration=effect.duration*(1-(target.stats?.ccReduce||0)/100);if(duration<=0||target.dead)return;
    target.slowPct=Math.max(target.slowT>0?target.slowPct:0,effect.pct);target.slowT=Math.max(target.slowT,duration);
  }
  static draw(ctx,cam){
    for(const f of Game.state.fx){
      if(f.type!=='act2warning'||(typeof Act2EnemyAnimation!=='undefined'&&!Act2EnemyAnimation.showsAttackRadius(f.owner))||f.ttl<=0||f.hidden||!f.controller.valid()||f.owner.dead&&!f.corpse)continue;
      const project=(x,y)=>[U.isoX(x,y)-cam.x,U.isoY(x,y)-cam.y],k=1-U.clamp(f.ttl/f.maxTtl,0,1);
      ctx.save();ctx.beginPath();
      if(f.kind==='line'){
        const dx=Math.cos(f.angle),dy=Math.sin(f.angle),w=f.width/2;
        [[f.x-dy*w,f.y+dx*w],[f.x+dx*f.length-dy*w,f.y+dy*f.length+dx*w],[f.x+dx*f.length+dy*w,f.y+dy*f.length-dx*w],[f.x+dy*w,f.y-dx*w]].forEach(([x,y],i)=>{const p=project(x,y);if(i)ctx.lineTo(...p);else ctx.moveTo(...p);});ctx.closePath();
      }else{const [x,y]=project(f.x,f.y);ctx.ellipse(x,y,f.radius*32*Math.SQRT2,f.radius*16*Math.SQRT2,0,0,Math.PI*2);}
      ctx.fillStyle='#101c20';ctx.globalAlpha=.38;ctx.fill();ctx.globalAlpha=.95;ctx.strokeStyle=f.col;ctx.lineWidth=3;ctx.stroke();ctx.fillStyle=f.col;ctx.globalAlpha=.08+k*.2;ctx.fill();ctx.restore();
    }
  }
}

