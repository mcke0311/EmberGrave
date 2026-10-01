/* EMBERGRAVE — authored campaign encounters. All timing is simulation time.
   No attack callback survives its encounter; warning geometry is damage geometry. */
"use strict";

const BossEncounters = (() => {
  const TAU = Math.PI * 2;
  const definitions = DATA.BOSS_ENCOUNTERS = {
    korvath: { zone:"shattered_temple", cap:2, recovery:6, color:"#ffb65a", phases:["The Last Defender","Oathfire"], rotations:[["cleave","charge","fissure"],["charge","fissure","cleave"]] },
    mire_mother: { zone:"ritual_site", cap:4, color:"#b9e76f", phases:["The Marsh's Embrace","The Shard Exposed","She Will Not Let Go"], rotations:[["bile","grasp"],["flood","bile","grasp"],["flood","bile","grasp"]] },
    azram: { zone:"khal_palace", cap:4, color:"#ffd979", phases:["The Gilded Throne","Portals to the Past","Molten Crown"], rotations:[["chains","cleave"],["portals","chains","chains"],["portals","gold","chains"]] },
    empty_archangel: { zone:"cathedral1", cap:0, color:"#e6d6ff", phases:["The Borrowed Voice","Broken Wings"], rotations:[["wings","descent"],["wings","descent"]] },
    malthoron: { zone:"cathedral2", cap:2, recovery:6, color:"#c6a5ff", phases:["The Hollow Plate","Souls Unbound","The King Unmade"], rotations:[["cleave","chains"],["souls","cleave"],["beam","souls"]] },
    vethriss: { zone:"throne", cap:3, color:"#95ffe0", phases:["Seraneth, Wounded","The Serpent's Lie","The Shadow Remembers"], rotations:[["light","cleave"],["lunge","decoys","lunge"],["memory"]] },
  };
  // The source enemy catalog is also used by editors and legacy test fixtures.
  // Resolve the actual zone IDs from its authoritative boss mapping.
  for (const [id, d] of Object.entries(definitions)) {
    const zone = Object.values(DATA.ZONES).find(z => z.boss === id);
    if (zone) d.zone = DATA.BOSS_ARENAS?.[id]?.zone || zone.id;
  }
  DATA.ENEMIES.boss_portal = { id:"boss_portal",name:"Portal to the Past",family:"construct",lvl:17,hp:95,dmg:[0,0],armor:0,def:0,xp:0,speed:0,atkRate:0,range:0,sight:0,sprite:"beacon",big:1.3,pal:{stone:"#826536",rune:"#ffd979",eye:"#ffd979"},sounds:"metal" };
  DATA.ENEMIES.boss_decoy = { id:"boss_decoy",name:"The Serpent's Lie",family:"demon",lvl:25,hp:1,dmg:[0,0],armor:0,def:0,xp:0,speed:0,atkRate:0,range:0,sight:0,sprite:"serpent",big:2.1,pal:{body:"#417d76"},sounds:"metal" };
  DATA.ENEMIES.boss_bound_soul = { id:"boss_bound_soul",name:"Bound Soul",family:"demon",lvl:20,hp:240,dmg:[0,0],armor:0,def:0,xp:0,speed:0,atkRate:0,range:0,sight:0,sprite:"wraith",artId:DATA.ENEMIES.memory_wraith.artId,big:1.2,pal:{body:"#bda1e8",eye:"#fff0ff"},sounds:"metal" };

  DATA.assignEnemyArt(DATA.ENEMIES.boss_portal);
  DATA.assignEnemyArt(DATA.ENEMIES.boss_decoy);
  DATA.assignEnemyArt(DATA.ENEMIES.boss_bound_soul);

  function insideArena(a,x,y,margin=0) {
    if(DATA.arenaContains)return DATA.arenaContains(a,x,y,margin);
    if(!(x>=a.x0+margin&&x<=a.x1-margin&&y>=a.y0+margin&&y<=a.y1-margin))return false;
    const dx=Math.abs(x-a.cx),dy=Math.abs(y-a.cy);
    if(a.shape==='circle')return Math.hypot(dx,dy)<=a.rx-margin;
    if(a.shape==='octagon')return dx+dy<=(a.rx+a.ry)*.82-margin*1.42;
    if(a.shape==='cross')return dx<=a.rx*.48-margin||dy<=a.ry*.48-margin;
    return true;
  }
  function contains(s,x,y) {
    const dx=x-s.x,dy=y-s.y,r2=dx*dx+dy*dy;
    if(s.kind==="circle")return r2<=s.radius*s.radius;
    if(s.kind==="ring")return r2<=s.radius*s.radius&&r2>=s.inner*s.inner;
    const c=Math.cos(s.angle),n=Math.sin(s.angle),along=dx*c+dy*n,across=-dx*n+dy*c;
    if(s.kind==="line")return along>=0&&along<=s.length&&Math.abs(across)<=s.width/2;
    if(s.kind==="cone")return r2<=s.radius*s.radius&&Math.abs(Math.atan2(across,along))<=s.arc/2;
    return false;
  }
  function footprint(map,x,y,r=.8) {
    return MapGen.walkable(map,x-r,y-r)&&MapGen.walkable(map,x+r,y-r)&&MapGen.walkable(map,x-r,y+r)&&MapGen.walkable(map,x+r,y+r);
  }
  function create(mon) { return definitions[mon.defId] ? new Encounter(mon) : null; }
  class Encounter {
    constructor(mon) {
      this.mon=mon; this.config=definitions[mon.defId]; this.world=Game.state; this.map=Game.state.map;
      this.base=JSON.parse(JSON.stringify(mon.def)); this.baseOpts=JSON.parse(JSON.stringify(mon.spriteOpts));
      this.baseScale=mon.scale; this.baseRadius=mon.radius; this.baseName=mon.name;
      this.arena=this.map?.bossArena?.bossId===mon.defId?this.map.bossArena:{bossId:mon.defId,cx:mon.x,cy:mon.y,x0:mon.x-10.5,x1:mon.x+10.5,y0:mon.y-10.5,y1:mon.y+10.5};
      this.home={x:mon.x,y:mon.y}; this.owned=[]; this.pools=[]; this.debris=[];
      this.active=false; this.phase=0; this.stage="idle"; this.timer=.8; this.attack=null; this.rotation=0; this.memoryIndex=0;
      this.portalPhases=new Set();
      this.sequence=null;this.pursuit=0;this.beamCount=0;
      this.mechanic=null;this.ward=null;this.sector=0;this.lifecycle='ready';this.positions=new WeakMap();
      this.armorSouls=0;this.floodPending=false;this.heartExposedUntil=0;this.dryPlatform=null;this.illusionCast=0;
      this.counterEvents=[];this.counterSerial=0;
      this.pressure={cooldown:0,ordinary:true,casts:0,targetId:null};this.pressureTracks=new Map();
      this.pose="idle"; this.label=""; this.elapsed=0; this.resetCount=0; this.setArt();
      if(mon.defId==="mire_mother")delete mon.def.deathBurst;
    }
    setArt() {
      this.mon.spriteOpts.bossArt=this.mon.defId;
      this.mon.spriteOpts.bossPhase=this.phase;
      this.mon.spriteOpts.bossPose=this.pose;
    }
    seal(value) {
      if(!this.arena.dedicated)return;
      this.arena.sealed=value;
      for(const i of this.arena.gateCells)this.map.blocked[i]=value?1:0;
      this.map._navRevision=(this.map._navRevision||0)+1;
      // Companions prepared in the vestibule join their owner before it seals.
      if(value)for(const [i,m]of this.world.minions.entries())if(!m.dead&&m.owner&&!insideArena(this.arena,m.x,m.y,m.radius||.35)){
        const dx=this.arena.cx-m.owner.x,dy=this.arena.cy-m.owner.y,len=Math.hypot(dx,dy)||1;
        const point=this.safePoint(m.owner.x+dx/len*(2+i*.3),m.owner.y+dy/len*(2+i*.3),m.radius||.35);
        if(point)Object.assign(m,point);
      }
      for(const p of [...(this.world.players||[this.world.player]),...this.world.minions]){p.path=null;p._navCache=null;}
    }
    resetDevices() {
      this.mechanic=null;this.ward=null;
      for(const d of this.arena.devices||[])Object.assign(d,{required:false,completed:false,cooldown:0,orientation:0});
    }
    beginMechanic() {
      this.mechanic=null;this.ward=null;this.floodPending=false;this.heartExposedUntil=0;this.dryPlatform=null;
      if(this.mon.defId==='azram'&&this.arena.dedicated){
        const devices=this.arena.devices.filter(d=>d.arenaRole==='mirror'),device=devices[(this.phase-1)%devices.length];
        if(!device)return;
        Object.assign(this.mon,this.home);
        for(const d of devices)Object.assign(d,{required:d===device,completed:false,cooldown:0,orientation:0});
        this.mechanic={kind:'mirror',blocksDamage:true,phase:this.phase,required:[device.deviceId],armed:false};
        this.ward={kind:'sunbeam',deviceId:device.deviceId};
      }else if(this.mon.defId==='malthoron'){
        this.clearOwned();
        this.mon.def.armor=this.base.armor*Math.max(.4,1-this.armorSouls*.15);
        this.mechanic={kind:'soulChains',blocksDamage:false,phase:this.phase,remaining:2};
        for(const dx of [-5,5])this.spawn('boss_bound_soul',this.home.x+dx,this.home.y-3,'boundSoul');
        this.mechanic.remaining=this.owned.filter(m=>!m.dead&&m.encounterKind==='boundSoul').length;
        if(!this.mechanic.remaining)this.mechanic=null;
      }
    }
    recordCounter(kind,target=null) {
      if(this.counterEvents.length>=64)this.counterEvents.shift();
      this.counterEvents.push({serial:++this.counterSerial,kind,phase:this.phase,target,time:+this.elapsed.toFixed(2)});
    }
    completeMechanic(label='Defense broken') {
      this.clearAttacks();this.mechanic=null;this.ward=null;
      for(const d of this.arena.devices||[])d.required=false;
      this.recover(3,label);Game.addNova(this.mon.x,this.mon.y,3,this.config.color);Sfx.play('shrine');
    }
    interactDevice(device,player) {
      if(this.mon.defId!=='azram'||device?.arenaRole!=='mirror'||this.mechanic?.kind!=='mirror'||
        !this.active||player.dead||player.connected===false||!this.arena.devices?.includes(device)||!device.required||
        U.dist(player.x,player.y,device.x,device.y)>device.interactionRange+.05||device.cooldown>0)return false;
      device.orientation=(device.orientation+1)%3;device.cooldown=.25;device.completed=device.orientation===2;
      this.mechanic.armed=device.completed;
      Sfx.play('shrine');return true;
    }
    mirrorAngle(device) {
      return Math.atan2(this.home.y-device.y,this.home.x-device.x)+[-Math.PI/3,Math.PI/3,0][device.orientation||0];
    }
    limitDamage(damage) {
      if(this.mechanic?.blocksDamage)return 0;
      const next=this.mon.def.phases?.[this.phase];
      return next?Math.min(damage,Math.max(0,this.mon.hp-this.mon.maxHp*next.at)):damage;
    }
    damageMultiplier() { return this.world.time<this.heartExposedUntil?1.25:1; }
    onDamage(actual,source,detail) {
      if(!this.active||actual<=0)return;
      if(this.mechanic?.kind==='choir'&&this.stage==='windup'&&this.attack?.id==='choir'){
        this.mechanic.progress+=actual;
        if(this.mechanic.progress>=this.mechanic.goal){
          this.recordCounter('choir');this.clearAttacks();this.recover(4,'Choir interrupted');
        }
      }else if(this.mechanic?.kind==='illusion'&&this.stage==='windup'&&this.attack?.id==='echoes'&&
        source instanceof Player&&detail?.sourceSkill&&!detail.uniqueDot&&!detail.periodic&&!detail.environment){
        this.recordCounter('trueSerpent');this.clearAttacks();this.recover(3,'The truth revealed');
      }
    }
    mechanicText() {
      if(!this.mechanic)return '';
      const c=this.mechanic;
      if(c.kind==='mirror')return c.armed?'Mirror aligned · evade the incoming beam':'Turn the marked mirror toward the throne';
      if(c.kind==='choir')return 'Break the choir · '+Math.min(100,Math.floor(c.progress/c.goal*100))+'% · '+Math.max(0,this.timer).toFixed(1)+'s';
      if(c.kind==='illusion')return 'Hit the serpent with the solid rune · '+Math.max(0,this.timer).toFixed(1)+'s';
      return '';
    }
    targets(fn) {
      for(const p of this.world.players||[this.world.player])if(!p.dead&&p.connected!==false)fn(p);
      for(const m of this.world.minions)if(this.active&&!m.dead)fn(m);
    }
    clearControls() {
      for(const t of [...(this.world.players||[this.world.player]),...this.world.minions]){
        if(t.bossPull?.owner===this.mon)delete t.bossPull;
        if(t.bossSlow?.owner===this.mon)delete t.bossSlow;
      }
    }
    resetPressure() {
      this.clearControls();this.pressureTracks.clear();
      Object.assign(this.pressure,{cooldown:0,ordinary:true,casts:0,targetId:null});
    }
    observePressure(dt) {
      this.pressure.cooldown=Math.max(0,this.pressure.cooldown-dt);
      const living=(this.world.players||[this.world.player]).filter(p=>!p.dead&&p.connected!==false);
      for(const p of this.pressureTracks.keys())if(!living.includes(p))this.pressureTracks.delete(p);
      for(const p of living){
        let track=this.pressureTracks.get(p);
        if(!track){track={far:0,samples:[]};this.pressureTracks.set(p,track);}
        const samples=track.samples,last=samples[samples.length-1],now=this.world.time;
        const forced=p.bossPull||p.jumping||p.leaping||p.dashing||p.charging||p.teleportUntil>now;
        const speed=p.stats?.moveSpeed||4;
        if(forced||last&&(now-last.time>.35||U.dist(last.x,last.y,p.x,p.y)>speed*Math.max(dt,now-last.time)*1.5+.15)){samples.length=0;track.far=0;}
        track.far=!forced&&U.dist(this.mon.x,this.mon.y,p.x,p.y)>4.5?track.far+dt:0;
        if(!forced){samples.push({x:p.x,y:p.y,time:now});while(samples.length>2&&samples[1].time<=now-.3)samples.shift();}
      }
    }
    pressureTarget() {
      if(this.pressure.cooldown>0||!this.pressure.ordinary||this.mechanic?.kind==='mirror'||
        this.mon.defId==='mire_mother'&&(this.floodPending||this.world.time<this.heartExposedUntil))return null;
      const id=p=>String(p.heroId||p._coopId||p.name||'player');
      return [...this.pressureTracks].filter(([p,t])=>t.far>=3&&!p.dead&&p.connected!==false)
        .sort(([a,ta],[b,tb])=>tb.far-ta.far||U.dist2(this.mon.x,this.mon.y,b.x,b.y)-U.dist2(this.mon.x,this.mon.y,a.x,a.y)||id(a).localeCompare(id(b)))[0]?.[0]||null;
    }
    projectTarget(player,seconds,r=this.mon.radius) {
      const samples=this.pressureTracks.get(player)?.samples||[],first=samples[0],last=samples[samples.length-1];
      let dx=0,dy=0;
      if(first&&last&&last.time-first.time>.04&&!player.bossPull){
        const duration=last.time-first.time,speed=Math.max(.1,player.stats?.moveSpeed||4);
        dx=(last.x-first.x)/duration*seconds;dy=(last.y-first.y)/duration*seconds;
        // Steady circling has a readable turn rate. Use the same short history
        // to intercept its arc; a straight tangent otherwise misses every lap.
        const middle=samples[Math.floor(samples.length/2)];
        if(middle&&middle!==first&&middle!==last){
          const left=middle.time-first.time,right=last.time-middle.time;
          const vx=(middle.x-first.x)/left,vy=(middle.y-first.y)/left,wx=(last.x-middle.x)/right,wy=(last.y-middle.y)/right;
          const a=Math.atan2(vy,vx),b=Math.atan2(wy,wx),turn=Math.atan2(Math.sin(b-a),Math.cos(b-a))/(duration/2);
          const before=Math.hypot(vx,vy),after=Math.hypot(wx,wy);
          if(before>.5&&after>.5&&Math.abs(before-after)<speed*.2&&Math.abs(turn)>.05&&Math.abs(turn)<2){
            const heading=b+turn*right/2,velocity=Math.min(speed,(before+after)/2);
            dx=velocity*(Math.sin(heading+turn*seconds)-Math.sin(heading))/turn;
            dy=velocity*(Math.cos(heading)-Math.cos(heading+turn*seconds))/turn;
          }
        }
        const length=Math.hypot(dx,dy),limit=Math.min(8,speed*seconds);
        if(length>limit){dx*=limit/length;dy*=limit/length;}
      }
      return this.safePoint(player.x+dx,player.y+dy,r)||this.safePoint(player.x,player.y,r);
    }
    clippedLane(point,width) {
      const m=this.mon,angle=Math.atan2(point.y-m.y,point.x-m.x),distance=U.dist(m.x,m.y,point.x,point.y);
      let length=0;
      for(let d=.2;d<=distance+.2;d+=.2){
        const next=Math.min(distance,d),x=m.x+Math.cos(angle)*next,y=m.y+Math.sin(angle)*next;
        if(!insideArena(this.arena,x,y,m.radius)||!footprint(this.map,x,y,m.radius)||
          typeof TerrainNavigation!=='undefined'&&!TerrainNavigation.segment(this.map,m.x,m.y,x,y,m.radius,1,m.surfaceId))break;
        length=next;if(next===distance)break;
      }
      return {kind:'line',x:m.x,y:m.y,angle,width,length};
    }
    startPressure(player) {
      const id=this.mon.defId,attack=id==='korvath'?'charge':id==='mire_mother'?'grasp':id==='empty_archangel'?'descent':
        id==='vethriss'?(this.phase===0?'light':this.phase===1?'lunge':'chains'):'chains';
      this.pressure.cooldown=10;this.pressure.ordinary=false;this.pressure.casts++;
      this.pressure.targetId=player.heroId||player._coopId||player.name||'player';
      this.start(attack,player,true);
    }
    controlHit(target,control) {
      if(!(target instanceof Player)||target.dead||target.groundImmune||target.def?.ccImmune||target.stats?.ccImmune)return;
      const reduction=U.clamp(1-(target.stats?.ccReduce||0)/100,0,1);
      if(reduction<=0)return;
      if(control==='slow'){
        target.bossSlow={owner:this.mon,pct:50,until:this.world.time+1.5*reduction};return;
      }
      if(target.rootImmune||target.def?.rootImmune||target.stats?.rootImmune)return;
      const distance=U.dist(target.x,target.y,this.mon.x,this.mon.y),stop=target.radius+this.mon.radius+.25;
      const length=Math.min(6*reduction,Math.max(0,distance-stop));if(length<=0)return;
      const angle=Math.atan2(this.mon.y-target.y,this.mon.x-target.x);
      target.bossPull={owner:this.mon,fromX:target.x,fromY:target.y,x:target.x+Math.cos(angle)*length,y:target.y+Math.sin(angle)*length,t:0,duration:.35};
      target.command=target.path=null;if(target.action)target.action.interrupted=true;target.action=null;
      for(const key of ['jumping','leaping','dashing','charging','spinning','drawing','siphon'])target[key]=null;
    }
    updateControls(dt) {
      for(const p of this.world.players||[this.world.player]){
        const pull=p.bossPull;if(pull?.owner!==this.mon)continue;
        if(p.dead||p.connected===false||!this.active){delete p.bossPull;continue;}
        pull.t+=dt;const k=Math.min(1,pull.t/pull.duration),x=U.lerp(pull.fromX,pull.x,k),y=U.lerp(pull.fromY,pull.y,k);
        const distance=U.dist(p.x,p.y,x,y),steps=Math.max(1,Math.ceil(distance/.15)),from={x:p.x,y:p.y};let blocked=false;
        const bodies=[...(this.world.players||[this.world.player]),...this.world.monsters,...this.world.minions];
        for(let i=1;i<=steps;i++){
          const nx=U.lerp(from.x,x,i/steps),ny=U.lerp(from.y,y,i/steps);
          if(!insideArena(this.arena,nx,ny,p.radius)||!footprint(this.map,nx,ny,p.radius)||
            typeof TerrainNavigation!=='undefined'&&!TerrainNavigation.segment(this.map,p.x,p.y,nx,ny,p.radius,1,p.surfaceId)||
            bodies.some(o=>o!==p&&!o.dead&&U.dist(nx,ny,o.x,o.y)<p.radius+o.radius+.05)){blocked=true;break;}
          p.x=nx;p.y=ny;
        }
        p.recordMovement?.(from.x,from.y,dt);p.face(this.mon.x,this.mon.y);
        if(blocked||k===1){delete p.bossPull;p.moving=false;}
      }
    }
    clearAttacks() {
      if(typeof BossVFX!=='undefined')BossVFX.cancel(this);
      this.attack=null;this.sequence=null;this.pursuit=0;this.pools.length=0;
      if(['choir','illusion'].includes(this.mechanic?.kind))this.mechanic=null;
      // Illusion channels belong to the canceled sequence, not an independent AI.
      for(const m of this.owned)if(m.encounterKind==="decoy"){m.dead=true;m.hp=0;m.corpseT=0;}
      const owner=this.mon,owned=this.owned;
      this.world.projectiles=this.world.projectiles.filter(p=>p.bossOwner!==owner&&p.mon!==owner&&!owned.includes(p.mon));
      this.world.fx=this.world.fx.filter(f=>f.owner!==owner&&!owned.includes(f.owner));
      this.mon.action=null;this.mon.path=null;this.mon.moving=false;
      this.clearControls();
    }
    clearOwned() {
      for(const m of this.owned){m.cancelAttacks?.();m.enemySkills?.cancel();m.dead=true;m.hp=0;m.corpseT=0;m.action=null;m.aggro=false;}
      this.owned.length=0;
    }
    reset() {
      this.clearAttacks();this.clearOwned();this.debris.length=0;
      this.resetDevices();this.seal(false);this.sector=0;this.lifecycle='ready';
      this.armorSouls=0;this.floodPending=false;this.heartExposedUntil=0;this.dryPlatform=null;this.illusionCast=0;
      this.counterEvents.length=0;this.counterSerial=0;
      this.resetPressure();
      if(this.mon.defId==='vethriss'&&this.map.campaignVisual){this.map.campaignVisual.ambient='#171d29';delete this.map.campaignVisual.moteColor;}
      for(const p of this.map.props)if(p.arenaRemains)p.corpseConsumed=false;
      const m=this.mon;
      m.def=JSON.parse(JSON.stringify(this.base));m.spriteOpts=JSON.parse(JSON.stringify(this.baseOpts));
      m.hp=m.maxHp;m.x=this.home.x;m.y=this.home.y;m.scale=this.baseScale;m.radius=this.baseRadius;m.name=this.baseName;
      m.phaseIdx=0;m.aggro=false;m.enraged=false;m.tint=undefined;m.action=null;m.path=null;
      for(const k of ["poisonDot","scorch","plague","doom","killMark","rabies","curseFrailty","curseWither","pulled","beckon","frozen","feared","sunder","fleeUntil","blindUntil"])m[k]=null;
      m.stunT=0;m.slowT=0;m.slowPct=0;m.noHeal=false;m.healthBarUntil=0;
      this.active=false;this.phase=0;this.stage="idle";this.timer=.8;this.rotation=0;this.memoryIndex=0;this.pose="idle";this.label="";this.elapsed=0;this.resetCount++;
      this.portalPhases.clear();
      this.beamCount=0;
      if(m.defId==="mire_mother")delete m.def.deathBurst;
      this.setArt();
    }
    finish() {
      this.clearAttacks();this.clearOwned();this.resetDevices();this.seal(false);this.lifecycle='victory';this.active=false;this.stage="dead";this.pose="death";this.setArt();
      this.floodPending=false;this.heartExposedUntil=0;this.dryPlatform=null;
      this.armorSouls=0;this.mon.def.armor=this.base.armor;this.illusionCast=0;this.sector=0;this.debris.length=0;
      this.counterEvents.length=0;this.counterSerial=0;
      this.resetPressure();
    }
    prepare(player,map) {
      if(map?.zone.echo&&typeof Coop!=='undefined'&&Coop.active&&Coop.echoReady&&!Coop.echoReady(this.world))return false;
      const players=(this.world.players||[player]).filter(p=>p.connected!==false&&!p.dead);
      if(this.active&&map===this.map&&Game.state===this.world&&!players.length&&this.world.players?.some(p=>!p.dead&&p.connected===false))return false;
      if(map!==this.map||Game.state!==this.world||!players.length||(!this.arena.dedicated&&!players.some(p=>insideArena(this.arena,p.x,p.y)))) {
        if(this.active||this.mon.hp<this.mon.maxHp)this.reset();
        return false;
      }
      if(this.arena.dedicated){
        if(!this.active&&!players.every(p=>insideArena(this.arena,p.x,p.y,p.radius||.4)))return false;
        for(const p of players){
          if(insideArena(this.arena,p.x,p.y,p.radius||.4))this.positions.set(p,{x:p.x,y:p.y});
          else if(this.active){const point=this.positions.get(p)||{x:this.arena.cx,y:this.arena.cy+5};Object.assign(p,point);p.path=null;p.command=null;p.jumping=p.leaping=p.dashing=null;}
        }
      }
      return true;
    }
    canDamage() { return Game.state===this.world && this.prepare(this.world.player,Game.state.map); }
    phaseChange(index) {
      this.clearAttacks();this.phase=index;this.mon.phaseIdx=index;this.rotation=0;
      this.pressureTracks.clear();
      const m=this.mon,s=m.def.phases[index-1]?.set||{};
      // Preserve canonical form metadata while avoiding compounded stat multipliers.
      if(s.sprite){m.spriteOpts.kind=s.sprite;m.spriteOpts.monsterArtId=s.artId||s.sprite;delete m.spriteOpts.npcArt;}
      if(s.name)m.name=s.name;
      if(s.weapon!==undefined)m.spriteOpts.weapon=s.weapon;
      if(s.pal)Object.assign(m.spriteOpts.pal,s.pal);
      if(s.copyBosses)m.def.copyBosses=true;
      if(s.summons)m.def.summons=s.summons;
      m.scale=this.baseScale*(m.defId==="vethriss"?(index===2?1.55:1.05):1);
      m.radius=this.baseRadius*(m.defId==="vethriss"&&index===2?1.3:1);m.spriteOpts.scale=m.scale;
      this.pose="recovery";this.stage="transition";this.timer=1.5;this.label=this.config.phases[index];this.setArt();
      const msg=m.def.phases[index-1]?.msg;
      if(msg)Game.msg(msg.filter(Boolean).join(" — "),this.config.color);Sfx.play("vox_boss");
      if(m.defId==="korvath"&&index===1)this.wave(["barb_guard","barb_guard"]);
      if(m.defId==="mire_mother")this.wave(["drowned_dead","drowned_dead"]);
      if(m.defId==="vethriss")this.clearOwned();
      if(m.defId==='vethriss'&&this.map.campaignVisual){this.map.campaignVisual.ambient=index===1?'#173025':'#231831';this.map.campaignVisual.moteColor=index===1?'#97d9ba':'#bf9fde';}
      this.beginMechanic();
    }
    safePoint(x,y,r=.8) {
      const a=this.arena;
      x=U.clamp(x,a.x0+1.5,a.x1-1.5);y=U.clamp(y,a.y0+1.5,a.y1-1.5);
      if(insideArena(a,x,y,r)&&footprint(this.map,x,y,r))return {x,y};
      for(let k=1;k<=4;k++)for(let i=0;i<8;i++) {
        const px=x+Math.cos(i*TAU/8)*k,py=y+Math.sin(i*TAU/8)*k;
        if(insideArena(a,px,py,1.5)&&footprint(this.map,px,py,r))return {x:px,y:py};
      }
      for(let t=.9;t>=0;t-=.1){const px=a.cx+(x-a.cx)*t,py=a.cy+(y-a.cy)*t;if(insideArena(a,px,py,1.5)&&footprint(this.map,px,py,r))return {x:px,y:py};}
      return null;
    }
    spawn(id,x,y,kind="add") {
      this.owned=this.owned.filter(m=>!m.dead);
      const living=this.owned.filter(m=>m.encounterKind!=="portal").length;
      if(kind!=="portal"&&living>=this.config.cap)return null;
      const point=this.safePoint(x,y);if(!point)return null;
      const m=new Monster(id,point.x,point.y,{act2Profile:false});
      m.bossOwner=this.mon;m.encounterKind=kind;m.aggro=true;m.minion=true;m.def.xp=0;
      // Summoned threats cannot recursively create untracked creatures or explosions.
      delete m.def.summons;delete m.def.splitOnDeath;delete m.def.deathBurst;delete m.def.throwUndead;
      m.encounterGrace=1.25;
      if(kind==="portal"){m.maxHp=m.hp=Math.round(this.mon.maxHp*.035);m.portalSpawns=2;m.portalTimer=2;m.aggro=false;}
      if(kind==='boundSoul'){m.maxHp=m.hp=Math.max(1,Math.round(this.mon.maxHp*.03));m.aggro=false;m.soulId=this.phase+':'+this.owned.length;}
      if(kind==="decoy"){m.maxHp=m.hp=1;m.spriteOpts.bossArt="vethriss";m.spriteOpts.bossPhase=1;m.spriteOpts.bossPose="idle";m.spriteOpts.bossDecoy=true;}
      this.owned.push(m);this.world.monsters.push(m);
      Game.addNova(m.x,m.y,.7,this.config.color);
      return m;
    }
    wave(ids) {
      ids.forEach((id,i)=>this.spawn(id,this.mon.x+Math.cos(i*Math.PI+.5)*3,this.mon.y+Math.sin(i*Math.PI+.5)*3));
    }
    updateOwned(dt) {
      for(const m of this.owned) {
        // Monster.die assigns its ordinary corpse lifetime after onOwnedDeath.
        if(m.dead){if(m.encounterKind==="decoy")m.corpseT=0;continue;}
        if(m.encounterKind==="portal"&&m.portalSpawns>0) {
          m.portalTimer=Math.max(0,m.portalTimer-dt);
          if(m.portalTimer<=0&&m.portalSpawns>0) {
            const ids=["frost_risen","drowned_dead","sand_raider"],id=ids[(this.rotation+m.portalSpawns)%ids.length];
            if(this.spawn(id,m.x+1,m.y+1)){m.portalSpawns--;m.portalTimer=2.5;}
          }
        }
        if(!insideArena(this.arena,m.x,m.y,.5)){const p=this.safePoint(m.x,m.y);if(p){m.x=p.x;m.y=p.y;}m.path=null;}
      }
    }
    damage(shape,mult,elem,hit=null,control=null) {
      this.targets(t=>{if(t.groundImmune||hit?.has(t))return;if(contains(shape,t.x,t.y)){
        hit?.add(t);const before=t.hp;
        this.mon.dealAttack(t,U.rf(...this.mon.def.dmg)*2.2*(this.mon.def.dmgMult||1)*this.mon.witherMult()*mult*(t instanceof Player?1:.14),elem);
        if(this.active&&control&&t.hp<before)this.controlHit(t,control);
      }});
    }
    start(id,player,pressure=false) {
      const m=this.mon;
      if(['choir','illusion'].includes(this.mechanic?.kind))this.mechanic=null;
      if(typeof BossVFX!=='undefined')BossVFX.cancel(this);
      if(this.sequence)for(const owned of this.owned)if(owned.encounterKind==="decoy"){owned.dead=true;owned.hp=0;owned.corpseT=0;}
      if(id==="portals"&&this.portalPhases.has(this.phase))id=this.phase===2?"gold":"chains";
      let steps=[{id}],recovery=null;
      if(id==="memory") {
        steps=[
          [{id:"fissure",remembered:"korvath"},{id:"bile",remembered:"mire_mother"}],
          [{id:"chains",remembered:"azram"},{id:"wings",remembered:"empty_archangel"}],
          [{id:"beam",remembered:"malthoron"}],
        ][this.memoryIndex++%3];
        recovery=6;
      } else if(id==="fissure"&&m.defId==="korvath"&&this.phase>0) {
        steps.push({id:"fissure",angle:Math.atan2(player.y-m.y,player.x-m.x)+Math.PI/2});recovery=5.5;
      } else if(id==="descent"&&m.defId==="empty_archangel") {
        steps=[{id:'choir'},{id:'descent'},...(this.phase>0?[{id:'cross'}]:[])];recovery=this.phase>0?2:1.6;
      } else if(id==="decoys") {
        steps.push({id:"echoes"});recovery=2;
      }
      if(pressure&&m.defId==='vethriss'&&this.phase===2)steps[0].remembered='malthoron';
      this.sequence={steps,index:0,recovery,pressure,target:pressure?player:null};this.pursuit=0;
      this.startStep(player);
    }
    startStep(player) {
      const m=this.mon,sequence=this.sequence,{id,remembered=null,angle:lockedAngle}=sequence.steps[sequence.index];
      if(sequence.pressure&&sequence.target&&!sequence.target.dead&&sequence.target.connected!==false)player=sequence.target;
      const angle=lockedAngle??Math.atan2(player.y-m.y,player.x-m.x),base={x:m.x,y:m.y,angle};
      const a={id,remembered,stepIndex:sequence.index,stepCount:sequence.steps.length,shapes:[],windup:1.25,recovery:this.config.recovery||3,mult:1.05,elem:"phys",duration:.22,age:0,tick:0,color:this.config.color,hit:new Set()};
      const line=(ang,width=1.4,length=9)=>({...base,kind:"line",angle:ang,width,length});
      switch(id) {
        case "cleave":a.label="Committed Cleave";a.shapes=[{...base,kind:"cone",radius:4,arc:Math.PI*.7}];break;
        case "fissure":a.label="Oathbreak Fissure";a.shapes=[line(angle)];a.mult=1.2;a.elem="fire";break;
        case "charge": {
          a.label='Oathbreaker Charge';a.windup=1.35;a.duration=.7;a.recovery=2;a.mult=1.1;
          const distance=Math.hypot(player.x-m.x,player.y-m.y)+2;
          a.shapes=[this.clippedLane({x:m.x+Math.cos(angle)*distance,y:m.y+Math.sin(angle)*distance},1.7)];break;
        }
        case "sunbeam": {
          const device=this.ward&&this.arena.devices?.find(d=>d.deviceId===this.ward.deviceId);
          const beamAngle=device?Math.atan2(device.y-m.y,device.x-m.x):angle;
          a.label=device?'Reflected Sun':'The Undying Sun';a.windup=1.4;a.elem='fire';a.mult=1.05;
          a.shapes=[line(beamAngle,1.45,device?U.dist(m.x,m.y,device.x,device.y):15)];
          a.mirrorId=device?.deviceId;break;
        }
        case "flood": {
          a.label='The Basin Rises';a.windup=2.5;a.elem='poison';a.mult=.25;a.recovery=2.25;
          const platforms=this.arena.platforms||[{x:this.arena.cx-6,y:this.arena.cy+3},{x:this.arena.cx+6,y:this.arena.cy+3},{x:this.arena.cx,y:this.arena.cy-6}];
          this.dryPlatform={...platforms[this.sector++%3]};
          const dryAngle=Math.atan2(this.dryPlatform.y-this.arena.cy,this.dryPlatform.x-this.arena.cx);
          a.shapes=[-1,1].map(k=>({kind:'cone',x:this.arena.cx,y:this.arena.cy,angle:dryAngle+k*TAU/3,radius:17,arc:TAU/3-.12}));break;
        }
        case "bile": {
          a.label="Bilefall";a.elem="poison";a.mult=.55;a.recovery=2.25;
          const p=this.safePoint(player.x,player.y);if(p)a.shapes.push({...p,kind:"circle",radius:1.6});
          if(m.defId==="mire_mother"&&this.phase===2){const q=this.safePoint(player.x+Math.cos(angle+Math.PI/2)*3.8,player.y+Math.sin(angle+Math.PI/2)*3.8);if(q)a.shapes.push({...q,kind:"circle",radius:1.6});}
          break;
        }
        case "grasp":
          a.label="The Marsh Reaches";a.shapes=[{...base,kind:"ring",inner:2.7,radius:5}];a.elem="poison";a.mult=1.15;a.recovery=2.25;
          if(m.defId==='mire_mother'&&this.phase>0&&this.floodPending){a.exposesHeart=true;a.recovery=4;}
          this.pools=this.pools.filter(p=>U.dist(m.x,m.y,p.x,p.y)>2.7+p.radius);break;
        case "chains":a.label=m.defId==='malthoron'?'Quieting Chains':'Chains of Khal-Zahir';a.quieting=m.defId==='malthoron';a.shapes=[line(angle,1.25,10),{...line(angle,1.25,10),x:m.x+Math.cos(angle+Math.PI/2)*3,y:m.y+Math.sin(angle+Math.PI/2)*3}];a.elem="light";break;
        case "portals":a.label="Portals to the Past";a.shapes=[{x:m.x-3,y:m.y+2,kind:"circle",radius:1},{x:m.x+3,y:m.y-2,kind:"circle",radius:1}];a.mult=0;a.recovery=2;break;
        case "gold":a.label="Molten Crown";a.shapes=[{...base,kind:"cone",radius:6,arc:Math.PI*.65}];a.elem="fire";a.mult=1.2;break;
        case "wings":case "souls": {
          a.label=id==="wings"?"Broken-Wing Fan":"Souls Unbound";a.elem=id==="wings"?"light":"shadow";a.projectiles=true;
          // Wide intentional gaps: five individually marked paths, never a solid wall.
          for(const off of [-.9,-.45,0,.45,.9])a.shapes.push(line(angle+off,1.1,10));
          if(id==='souls')for(const soul of this.owned)if(!soul.dead&&soul.encounterKind==='boundSoul'){
            a.shapes.push({kind:'line',x:soul.x,y:soul.y,angle:Math.atan2(player.y-soul.y,player.x-soul.x),width:1,length:10,soulId:soul.soulId});
          }
          a.mult=.55;break;
        }
        case 'choir':
          a.label='The Gathering Choir';a.windup=3;a.mult=0;
          this.mechanic={kind:'choir',blocksDamage:false,phase:this.phase,progress:0,goal:m.maxHp*.02};break;
        case "descent": {
          a.label="Empty Benediction";const p=this.safePoint(player.x,player.y,this.mon.radius);if(p)a.shapes=[{...p,kind:"circle",radius:2.3}];a.elem="light";a.mult=1.2;a.recovery=1.6;break;
        }
        case "cross":a.label="Fractured Sanctum";a.shapes=[{x:m.x-6,y:m.y,kind:"line",angle:0,width:1.5,length:12},{x:m.x,y:m.y-6,kind:"line",angle:Math.PI/2,width:1.5,length:12}];a.elem="light";break;
        case "beam":
          a.label="The Hollow Choir";a.sweepDirection=this.beamCount++%2===0?1:-1;a.startAngle=angle-.45*a.sweepDirection;
          a.shapes=[line(a.startAngle,1.35,10)];a.duration=3;a.windup=1.2;a.mult=.32;a.elem="shadow";a.recovery=m.defId==='malthoron'?4.5:2;break;
        case "light":a.label="Borrowed Light";a.shapes=[line(angle,1.1,9)];a.elem="light";a.mult=.55;break;
        case "lunge":a.label="Serpent's Fang";a.shapes=[line(angle,1.6,Math.min(8,Math.hypot(player.x-m.x,player.y-m.y)+1.5))];a.mult=1.1;a.duration=.45;break;
        case "decoys":a.label="Three Beautiful Lies";a.shapes=[];a.mult=0;a.recovery=1.5;break;
        case "echoes":
          a.label="Read the Deception";a.windup=1.5;a.mult=.25;a.elem="shadow";
          this.mechanic={kind:'illusion',blocksDamage:false,phase:this.phase};
          for(const decoy of this.owned)if(!decoy.dead&&decoy.encounterKind==="decoy") {
            decoy.echoLane={kind:"line",x:decoy.x,y:decoy.y,angle:Math.atan2(player.y-decoy.y,player.x-decoy.x),width:1,length:Math.max(6,U.dist(decoy.x,decoy.y,player.x,player.y)+.5)};
            decoy.spriteOpts.bossPose="windup";a.shapes.push(decoy.echoLane);
          }
          if(!a.shapes.length){this.recover(2,"Lies Shattered");return;}
          break;
      }
      if(sequence.recovery!==null)a.recovery=sequence.recovery;
      if(sequence.pressure&&id!=='choir'&&id!=='cross'){
        a.pressure=true;a.targetId=this.pressure.targetId;a.windup=id==='charge'?1.35:1.25;
        const slow=Math.max(player.slowT>0?player.slowPct||0:0,player.bossSlow?.until>this.world.time?player.bossSlow.pct:0);
        const speed=Math.max(.1,(player.stats?.moveSpeed||4)*(1-slow/100));
        // A slowed hero gets enough warning to leave the same visible footprint.
        if(slow>0)a.windup=Math.max(a.windup,.15+((id==='descent'?2.3:2.2)+.1)/speed);
        const point=this.projectTarget(player,a.windup+(['charge','lunge'].includes(id)?a.duration:0));
        if(point){
          if(id==='charge'||id==='lunge'){
            const lane=this.clippedLane(point,id==='charge'?1.7:1.6);
            a.shapes=[lane,{kind:'circle',x:lane.x+Math.cos(lane.angle)*lane.length,y:lane.y+Math.sin(lane.angle)*lane.length,radius:2.2}];
            a.label=id==='charge'?'Oathbreaker Pursuit':"Serpent's Pursuit";
          }else{
            a.shapes=[{...point,kind:'circle',radius:id==='descent'?2.3:2.2}];
            if(id==='grasp'){a.label='The Pursuing Grasp';a.control='slow';delete a.exposesHeart;}
            if(id==='chains'){a.label=m.defId==='azram'?'The Throne Reclaims': 'Quieting Chains · Reclaim';a.control='pull';a.recovery=2.5;}
            if(id==='light'){a.label='Borrowed Light · Veiled Step';a.recovery=1.6;a.relocates=true;}
          }
        }
      }
      if(remembered)a.label=DATA.ENEMIES[remembered].name.split(",")[0]+" · "+a.label;
      this.attack=a;this.stage="windup";this.timer=a.windup;this.pose="windup";this.label=a.label;
      if(typeof EnemySkills!=='undefined')EnemySkills.reserveBossWarning(this);
      if(typeof BossVFX!=='undefined')BossVFX.begin(this);
      m.path=null;m.moving=false;m.face(m.x+Math.cos(angle),m.y+Math.sin(angle));this.setArt();Sfx.play("shrine");
    }
    recover(seconds,label="Opening") {
      if(this.attack?.exposesHeart){
        this.floodPending=false;this.heartExposedUntil=this.world.time+4;label='Heart exposed · +25% damage';this.recordCounter('heart');
      }
      this.sequence=null;this.stage="recovery";this.timer=seconds;this.recoveryDuration=seconds;
      this.pose="recovery";this.label=label;this.setArt();
    }
    statusText() {
      const counter=this.mechanicText();if(counter)return counter;
      const time=" · "+Math.max(0,this.timer).toFixed(1)+"s";
      if(this.stage==="transition")return "Changing form";
      if(this.stage==="recovery")return this.label+time;
      if(this.stage==="idle")return this.pose==="movement"?"Closing distance":this.mon.defId==='korvath'?'Bait a charge through an oath target':this.mechanic?.kind==='soulChains'?'Sever the soul chains · '+this.mechanic.remaining+' remaining':'Stand ready';
      const a=this.attack;
      const target=a?.pressure&&this.world.players?.length>1?this.world.players.find(p=>(p.heroId||p._coopId||p.name)===a.targetId)?.name:null;
      return a?a.label+(target?' · '+target:'')+(a.stepCount>1?" · "+(a.stepIndex+1)+"/"+a.stepCount:"")+(this.stage==="windup"?time:a.id==="portals"?" · Portals open":a.id==="decoys"?" · Illusions forming":" · Strike"):"";
    }
    execute() {
      const a=this.attack,m=this.mon;
      if(!a)return;
      this.stage="execute";this.timer=a.duration;this.pose="impact";this.setArt();
      if(a.id==="portals") {
        this.portalPhases.add(this.phase);
        for(const p of this.owned)if(p.encounterKind==="portal"){p.dead=true;p.corpseT=0;}
        for(const s of a.shapes)this.spawn("boss_portal",s.x,s.y,"portal");
      } else if(a.id==="decoys") {
        this.clearOwned();
        const real=U.hash(this.world.seed+':serpent:'+this.illusionCast++)%4;
        for(let i=0;i<4;i++){
          const point=this.safePoint(this.home.x+Math.cos(i*TAU/4+.4)*5,this.home.y+Math.sin(i*TAU/4+.4)*5,m.radius);
          if(!point)continue;
          if(i===real){m.x=point.x;m.y=point.y;}else this.spawn('boss_decoy',point.x,point.y,'decoy');
        }
      } else if(a.projectiles) {
        for(const s of a.shapes){Game.spawnProjectile({x:s.x,y:s.y,tx:s.x+Math.cos(s.angle)*s.length,ty:s.y+Math.sin(s.angle)*s.length,speed:5,ttl:s.length/5,kind:"soulbolt",elem:a.elem,fromPlayer:false,mon:m,bossOwner:m,bossLane:s,bossMult:a.mult,bossVisual:{id:a.id,remembered:a.remembered}});}
      } else if(a.id==='sunbeam'&&a.mirrorId&&this.ward?.deviceId===a.mirrorId){
        const device=this.arena.devices.find(d=>d.deviceId===a.mirrorId);
        for(const s of a.shapes)this.damage(s,a.mult,a.elem,a.hit);
        if(!this.active||this.attack!==a)return;
        Game.beamFx(m.x,m.y,device.x,device.y,'#ffd979');
        if(device.orientation===2){
          Game.beamFx(device.x,device.y,m.x,m.y,'#fff6ce');this.recordCounter('mirror',device.deviceId);
          this.completeMechanic('Throne ward shattered');return;
        }
        a.recovery=2;this.label='Misaligned · turn the mirror';
      } else if(!['beam','lunge','charge'].includes(a.id))for(const s of a.shapes){this.damage(s,a.mult,a.elem,a.hit,a.control);if(!this.active||this.attack!==a)return;}
      if(!this.active)return; // A lethal impact may synchronously reset the entire fight.
      if(a.id==="echoes")this.clearOwned();
      if(['echoes','choir'].includes(a.id))this.mechanic=null;
      if(a.id==='flood'&&m.defId==='mire_mother')this.floodPending=true;
      if(a.id==="bile")for(const s of a.shapes){if(this.pools.length>=3)this.pools.shift();this.pools.push({...s,ttl:6,tick:.75});}
      if(a.id==='flood'||a.id==='fissure'&&m.defId==='korvath'&&this.phase>0)for(const s of a.shapes){
        if(this.pools.length>=3)this.pools.shift();this.pools.push({...s,ttl:4.5,tick:.75,elem:a.elem,mult:.08});
      }
      if((a.id==="descent"||a.relocates)&&a.shapes[0]){m.x=a.shapes[0].x;m.y=a.shapes[0].y;}
      if(a.id==="lunge"||a.id==='charge'){a.start={x:m.x,y:m.y};a.hit=new Set();}
      if(typeof BossVFX!=='undefined')BossVFX.impact(this);
      Sfx.play(a.id==="bile"?"blast":"slam");
    }
    update(dt,player,map) {
      const m=this.mon;
      if(!this.prepare(player,map))return;
      if(!this.active) {
        if(!this.arena.dedicated&&!m.aggro&&m.hp===m.maxHp&&U.dist(m.x,m.y,player.x,player.y)>10)return;
        if(Game.bossWard?.(m))return;
        if(Game.bossCinematic?.(m))return;
        this.active=true;m.aggro=true;this.lifecycle='combat';this.seal(true);
        if(m.def.cutscene)Game.firstSightCutscene(m.defId,m.def.cutscene);
        if(!m.spoke){m.spoke=true;Game.msg(m.name+": “"+m.def.aggroLines[0]+"”",this.config.color);}
      }
      this.elapsed+=dt;
      this.updateControls(dt);this.observePressure(dt);
      for(const d of this.arena.devices||[]){const was=d.cooldown;d.cooldown=Math.max(0,d.cooldown-dt);if(was>0&&!d.cooldown&&d.arenaRole==='chargeTarget')d.completed=false;}
      if(typeof BossVFX!=='undefined')BossVFX.update(this,dt);
      const next=m.def.phases?.[this.phase];
      if(next&&m.hp<=m.maxHp*next.at){this.phaseChange(this.phase+1);return;}
      this.updateOwned(dt);
      for(let i=this.debris.length-1;i>=0;i--){this.debris[i].ttl-=dt;if(this.debris[i].ttl<=0)this.debris.splice(i,1);}
      for(let i=this.pools.length-1;i>=0;i--){const p=this.pools[i];p.ttl-=dt;p.tick-=dt;if(p.ttl<=0){this.pools.splice(i,1);continue;}if(p.tick<=0){p.tick=.75;this.damage(p,p.mult??.13,p.elem||"poison");if(!this.active)return;}}
      this.timer-=dt;
      if(this.stage==="execute") {
        const a=this.attack;a.age+=dt;
        if(a.id==="beam") {
          a.shapes[0].angle=a.startAngle+Math.min(1,a.age/a.duration)*.9*a.sweepDirection;
          a.tick-=dt;if(a.tick<=0){a.tick=.45;this.damage(a.shapes[0],a.mult,a.elem);}
          if(!this.active||this.attack!==a)return;
        }
        if(a.id==="lunge"||a.id==='charge') {
          const s=a.shapes[0],k=Math.min(1,a.age/a.duration),x=a.start.x+Math.cos(s.angle)*s.length*k,y=a.start.y+Math.sin(s.angle)*s.length*k;
          const swept={...s,x:m.x,y:m.y,length:Math.hypot(x-m.x,y-m.y)};
          if(insideArena(this.arena,x,y,m.radius)&&footprint(map,x,y,m.radius)){m.x=x;m.y=y;}
          else swept.length=0;
          if(a.id==='charge'&&m.defId==='korvath')for(const d of this.arena.devices||[])if(d.arenaRole==='chargeTarget'&&d.cooldown===0){
            const projection=U.clamp((d.x-swept.x)*Math.cos(s.angle)+(d.y-swept.y)*Math.sin(s.angle),0,swept.length);
            if(swept.length>0&&U.dist(d.x,d.y,swept.x+Math.cos(s.angle)*projection,swept.y+Math.sin(s.angle)*projection)<=1.5){
              d.completed=true;d.cooldown=24;this.recordCounter('charge',d.deviceId);this.completeMechanic('Oathbreaker toppled');return;
            }
          }
          this.targets(t=>{if(!t.groundImmune&&!a.hit.has(t)&&contains(s,t.x,t.y)&&contains(swept,t.x,t.y)){a.hit.add(t);t.takeDamage(U.rf(...m.def.dmg)*2.2*(m.def.dmgMult||1)*a.mult*m.witherMult()*(t instanceof Player?1:.14),m);}});
          if(!this.active||this.attack!==a)return;
          if(k===1&&a.pressure&&a.shapes[1])this.damage(a.shapes[1],a.mult,a.elem,a.hit);
          if(!this.active||this.attack!==a)return;
        }
      }
      if(this.timer>0)return;
      if(this.stage==="windup"){this.execute();return;}
      if(this.stage==="execute") {
        if(this.sequence&&++this.sequence.index<this.sequence.steps.length){this.startStep(player);return;}
        this.recover(this.attack.recovery);return;
      }
      if(this.stage==="recovery"||this.stage==="transition"){this.attack=null;this.stage="idle";this.timer=.45;this.pose="idle";this.label="";this.setArt();return;}
      if(m.stunT>0||(m.frozen&&this.world.time<m.frozen)){this.timer=.1;return;}
      if(this.mechanic?.kind==='mirror'){this.start('sunbeam',player);return;}
      const distant=this.pressureTarget();if(distant){this.startPressure(distant);return;}
      const rotation=this.config.rotations[this.phase];let id=rotation[this.rotation%rotation.length];
      // Pressure intercepts sustained retreat; ordinary cleaves still close distance.
      if(id==="cleave"&&U.dist(m.x,m.y,player.x,player.y)>4.2) {
        this.pursuit+=dt;
        if(this.pursuit>=1.5)id=m.defId==="korvath"?"fissure":m.defId==="vethriss"?"light":m.defId==="malthoron"&&this.phase>0?"souls":"chains";
        else {
        const beforeX=m.x,beforeY=m.y;
        m.chase(dt,player,map,(x,y)=>MapGen.walkable(map,x,y));
        if(!insideArena(this.arena,m.x,m.y,m.radius)){m.x=beforeX;m.y=beforeY;m.path=null;}
        this.pose="movement";this.setArt();return;
        }
      }
      this.rotation++;this.pressure.ordinary=true;this.start(id,player);
    }
    onOwnedDeath(mon) {
      if(!this.active)return;
      if(mon.encounterKind==='boundSoul'){
        this.armorSouls=Math.min(4,this.armorSouls+1);this.mon.def.armor=this.base.armor*Math.max(.4,1-this.armorSouls*.15);
        this.recordCounter('soul',mon._coopId||null);
        for(let i=0;i<5;i++)this.debris.push({x:this.mon.x,y:this.mon.y,part:i,angle:i*TAU/5,ttl:2,maxTtl:2,phase:this.phase-1});
        if(this.attack?.id==='souls'&&this.stage==='windup')this.attack.shapes=this.attack.shapes.filter(s=>s.soulId!==mon.soulId);
        const remaining=this.owned.filter(m=>!m.dead&&m.encounterKind==='boundSoul').length;
        if(this.mechanic?.kind==='soulChains')this.mechanic.remaining=remaining;
        if(!remaining)this.completeMechanic('Soul chains severed');
      }
      if(mon.encounterKind==="portal") {
        const pairBroken=!this.owned.some(m=>!m.dead&&m.encounterKind==="portal");
        this.clearAttacks();this.recover(pairBroken?2.5:1.5,pairBroken?"The Past Sealed":"Chains Broken");Sfx.play("shrine");
      }
      if(mon.encounterKind==="decoy"&&this.sequence) {
        if(this.attack?.id==="echoes")this.attack.shapes=this.attack.shapes.filter(s=>s!==mon.echoLane);
        if(!this.owned.some(m=>!m.dead&&m.encounterKind==="decoy")){this.clearAttacks();this.recover(2,"Lies Shattered");Sfx.play("shrine");}
      }
      if(typeof BossVFX!=='undefined')BossVFX.ownedDeath(this,mon);
    }
  }

  function cancelAll() { if(Game.state)for(const m of Game.state.monsters)if(m.encounter&&!m.dead)m.encounter.reset(); }
  // A small bounded set of projected polygons. No per-frame canvases or pixel reads.
  function trace(ctx,s,cam) {
    const point=(x,y,first)=>{const px=U.isoX(x,y)-cam.x,py=U.isoY(x,y)-cam.y;if(first)ctx.moveTo(px,py);else ctx.lineTo(px,py);};
    ctx.beginPath();
    if(s.kind==="line") {
      const c=Math.cos(s.angle),n=Math.sin(s.angle),w=s.width/2;
      point(s.x-n*w,s.y+c*w,true);point(s.x+c*s.length-n*w,s.y+n*s.length+c*w);
      point(s.x+c*s.length+n*w,s.y+n*s.length-c*w);point(s.x+n*w,s.y-c*w);ctx.closePath();return;
    }
    const from=s.kind==="cone"?s.angle-s.arc/2:0,to=s.kind==="cone"?s.angle+s.arc/2:TAU;
    if(s.kind==="cone")point(s.x,s.y,true);
    for(let i=0;i<=48;i++){const a=from+(to-from)*i/48;point(s.x+Math.cos(a)*s.radius,s.y+Math.sin(a)*s.radius,i===0&&s.kind!=="cone");}
    ctx.closePath();
    if(s.kind==="ring"){for(let i=0;i<=48;i++){const a=TAU-i*TAU/48;point(s.x+Math.cos(a)*s.inner,s.y+Math.sin(a)*s.inner,i===0);}ctx.closePath();}
  }
  function draw(ctx,cam) {
    const world=Game.state,a=world.map.bossArena;
    if(a?.dedicated){
      const e=world.monsters.find(m=>m.encounter&&!m.dead)?.encounter;
      ctx.save();
      if(a.sealed){trace(ctx,{kind:'line',x:a.cx-3.5,y:a.y1+.6,angle:0,length:7,width:.5},cam);ctx.fillStyle='#dba574';ctx.globalAlpha=.65;ctx.fill();}
      for(const d of a.devices){
        if(d.arenaRole==='scenery')continue;
        const bright=d.required?'#fff1b0':DATA.BOSS_ARENAS[a.bossId].color;
        trace(ctx,{kind:'circle',x:d.x,y:d.y,radius:d.arenaRole==='chargeTarget'?1.5:d.required?1.65:1.2},cam);
        ctx.globalAlpha=d.required?.9:.35;ctx.strokeStyle=bright;ctx.lineWidth=d.required?3:1.5;ctx.stroke();
        if(d.required&&d.arenaRole==='mirror'){
          const angle=Math.atan2(a.cy-d.y,a.cx-d.x)+[-Math.PI/3,Math.PI/3,0][d.orientation||0];
          trace(ctx,{kind:'line',x:d.x,y:d.y,angle,width:.18,length:d.orientation===2?U.dist(a.cx,a.cy,d.x,d.y):9},cam);
          ctx.globalAlpha=.9;ctx.strokeStyle=d.orientation===2?'#fff6ce':'#ffd979';ctx.setLineDash([6,4]);ctx.stroke();ctx.setLineDash([]);
        }
        if(d.required||e?.active&&d.arenaRole==='chargeTarget'){
          const rawX=U.isoX(d.x,d.y)-cam.x,rawY=U.isoY(d.x,d.y)-cam.y-100;
          const sx=U.clamp(rawX,100,ctx.canvas.width-100),sy=U.clamp(rawY,150,ctx.canvas.height-175);
          const arrow=rawX<sx-10?'← ':rawX>sx+10?'→ ':rawY<sy-10?'↑ ':rawY>sy+10?'↓ ':'';
          const label=d.required?arrow+'TURN · '+d.label+' · '+(d.orientation===2?'aligned':((d.orientation||0)+1)+'/3'):arrow+d.label+(d.cooldown>0?' · '+Math.ceil(d.cooldown)+'s':' · bait charge');
          ctx.font='14px Georgia, serif';ctx.textAlign='center';const width=Math.min(240,ctx.measureText(label).width+18);
          ctx.globalAlpha=.92;ctx.fillStyle='#0b1018';ctx.fillRect(sx-width/2,sy-14,width,23);
          ctx.globalAlpha=1;ctx.fillStyle=bright;ctx.fillText(label,sx,sy+2,width-10);
        }
      }
      if(e?.mechanic?.blocksDamage){trace(ctx,{kind:'circle',x:e.mon?.x??a.cx,y:e.mon?.y??a.cy,radius:2.2},cam);ctx.globalAlpha=.7;ctx.strokeStyle=e.config.color;ctx.setLineDash([7,5]);ctx.lineWidth=3;ctx.stroke();}
      ctx.restore();
    }
    if(a&&!a.dedicated) {
      ctx.save();ctx.strokeStyle="#d4b783";ctx.lineWidth=1.5;ctx.globalAlpha=.55;ctx.setLineDash([8,6]);ctx.beginPath();
      for(const [i,p] of [[a.x0,a.y0],[a.x1,a.y0],[a.x1,a.y1],[a.x0,a.y1]].entries()){const x=U.isoX(...p)-cam.x,y=U.isoY(...p)-cam.y;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.closePath();ctx.stroke();ctx.restore();
    }
    for(const m of world.monsters) {
      const e=m.encounter;if(!e||m.dead||!e.active)continue;
      ctx.save();ctx.lineWidth=2.5;ctx.strokeStyle=e.config.color;ctx.fillStyle=e.config.color;
      for(const d of e.debris){
        const t=1-d.ttl/d.maxTtl,dist=3*t,x=d.x+Math.cos(d.angle)*dist,y=d.y+Math.sin(d.angle)*dist;
        ctx.save();ctx.translate(U.isoX(x,y)-cam.x,U.isoY(x,y)-cam.y-45-60*Math.sin(t*Math.PI));ctx.rotate(d.angle*t);
        SpriteAssets.drawFrame(ctx,SpriteAssets.getFrame("actor.boss.malthoron_plate",d.part),0,0,{scale:.24,alpha:Math.min(1,d.ttl*2)});ctx.restore();
      }
      for(const p of e.pools){trace(ctx,p,cam);ctx.globalAlpha=.3;ctx.fill();ctx.setLineDash([3,4]);ctx.globalAlpha=.85;ctx.stroke();ctx.setLineDash([]);}
      if(e.dryPlatform&&(e.attack?.id==='flood'||e.pools.some(p=>p.kind==='cone'))){
        trace(ctx,{kind:'circle',...e.dryPlatform,radius:2},cam);ctx.globalAlpha=.85;ctx.strokeStyle='#f5efd2';ctx.stroke();
        ctx.font='14px Georgia, serif';ctx.fillStyle='#fff6dc';ctx.textAlign='center';ctx.fillText('DRY PLATFORM',U.isoX(e.dryPlatform.x,e.dryPlatform.y)-cam.x,U.isoY(e.dryPlatform.x,e.dryPlatform.y)-cam.y-20);
      }
      for(const soul of e.owned)if(!soul.dead&&soul.encounterKind==='boundSoul'){
        ctx.globalAlpha=.85;ctx.strokeStyle='#dfbfff';ctx.setLineDash([6,4]);ctx.beginPath();
        ctx.moveTo(U.isoX(soul.x,soul.y)-cam.x,U.isoY(soul.x,soul.y)-cam.y-35);ctx.lineTo(U.isoX(m.x,m.y)-cam.x,U.isoY(m.x,m.y)-cam.y-65);ctx.stroke();ctx.setLineDash([]);
      }
      if(e.mechanic?.kind==='illusion')for(const actor of [m,...e.owned.filter(o=>!o.dead&&o.encounterKind==='decoy')]){
        const sx=U.isoX(actor.x,actor.y)-cam.x,sy=U.isoY(actor.x,actor.y)-cam.y;
        const bounds=SpriteAssets.actorGeometry(actor.spriteOpts,actor.pose(),sx,sy);
        ctx.globalAlpha=1;ctx.fillStyle='#fff6dc';ctx.strokeStyle='#fff6dc';ctx.lineWidth=3;ctx.beginPath();ctx.arc(sx,bounds.top-16,9,0,TAU);
        if(actor===m)ctx.fill();else ctx.stroke();
      }
      for(const portal of e.owned)if(!portal.dead&&portal.encounterKind==="portal") {
        const x=U.isoX(portal.x,portal.y)-cam.x,y=U.isoY(portal.x,portal.y)-cam.y+40;
        const full=e.owned.filter(m=>!m.dead&&m.encounterKind!=="portal").length>=e.config.cap;
        const label=portal.portalSpawns>0?(portal.portalTimer===0&&full?"Waiting":portal.portalTimer.toFixed(1)+"s")+" · "+portal.portalSpawns+" left":"Spent portal";
        ctx.globalAlpha=1;ctx.fillStyle="rgba(8,7,5,.9)";ctx.fillRect(x-63,y-12,126,19);
        ctx.fillStyle=e.config.color;ctx.font="12px Exocet, Georgia, serif";ctx.textAlign="center";ctx.fillText(label,x,y+2);ctx.textAlign="left";
      }
      const attack=e.attack;
      for(const p of world.players||[world.player])if(p.bossPull?.owner===m){
        ctx.globalAlpha=.9;ctx.strokeStyle=e.config.color;ctx.setLineDash([6,4]);ctx.lineWidth=3;ctx.beginPath();
        ctx.moveTo(U.isoX(m.x,m.y)-cam.x,U.isoY(m.x,m.y)-cam.y-55);ctx.lineTo(U.isoX(p.x,p.y)-cam.x,U.isoY(p.x,p.y)-cam.y-25);ctx.stroke();ctx.setLineDash([]);
      }
      if(attack?.pressure&&e.stage==='windup'){
        const point=attack.shapes[attack.shapes.length-1];
        const x=U.clamp(U.isoX(point.x,point.y)-cam.x,100,ctx.canvas.width-100),y=U.clamp(U.isoY(point.x,point.y)-cam.y-20,150,ctx.canvas.height-175);
        ctx.globalAlpha=1;ctx.font='14px Georgia, serif';ctx.textAlign='center';ctx.fillStyle='#fff6dc';
        ctx.fillText((attack.control==='pull'?'CHAIN PULL':attack.control==='slow'?'GRASP':'INTERCEPT')+' · MOVE',x,y);
      }
      if(attack&&(e.stage==="windup"||e.stage==="execute"))for(const s of attack.shapes) {
        ctx.fillStyle=e.config.color;ctx.lineWidth=e.stage==="windup"?2.5:4;
        if(typeof CombatReadability!=='undefined')CombatReadability.warning(ctx,()=>trace(ctx,s,cam),s,cam,e.stage==='windup'?1-e.timer/attack.windup:1,Game.state.map.zone,e.config.color);
        else{trace(ctx,s,cam);ctx.globalAlpha=e.stage==="windup"?.14+.18*(1-e.timer/attack.windup):(typeof BossVFX!=='undefined'&&BossVFX.enabled?.18:.52);ctx.fill();ctx.globalAlpha=.95;ctx.stroke();}
        if(attack.id==="beam") {
          const progress=e.stage==="windup"?0:attack.age/attack.duration;
          trace(ctx,{...s,angle:attack.startAngle+Math.min(1,progress+.22/.9)*.9*attack.sweepDirection},cam);
          ctx.setLineDash([6,5]);ctx.lineWidth=1.5;ctx.globalAlpha=.65;ctx.stroke();ctx.setLineDash([]);
        }
      }
      ctx.restore();
    }
  }
  return {definitions,create,contains,insideArena,footprint,cancelAll,draw};
})();
