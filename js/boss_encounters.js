/* EMBERGRAVE — authored campaign encounters. All timing is simulation time.
   No attack callback survives its encounter; warning geometry is damage geometry. */
"use strict";

const BossEncounters = (() => {
  const TAU = Math.PI * 2;
  const definitions = DATA.BOSS_ENCOUNTERS = {
    korvath: { zone:"shattered_temple", cap:2, color:"#ffb65a", phases:["The Last Defender","Oathfire"], rotations:[["cleave","charge","fissure"],["charge","fissure","cleave"]] },
    mire_mother: { zone:"ritual_site", cap:4, color:"#b9e76f", phases:["The Marsh's Embrace","The Shard Exposed","She Will Not Let Go"], rotations:[["bile","grasp"],["flood","bile","grasp"],["flood","bile","grasp","flood"]] },
    azram: { zone:"khal_palace", cap:4, color:"#ffd979", phases:["The Gilded Throne","Portals to the Past","Molten Crown"], rotations:[["chains","cleave"],["portals","chains","chains"],["portals","gold","chains"]] },
    empty_archangel: { zone:"cathedral1", cap:0, color:"#e6d6ff", phases:["The Borrowed Voice","Broken Wings"], rotations:[["wings","descent"],["wings","descent"]] },
    malthoron: { zone:"cathedral2", cap:2, color:"#c6a5ff", phases:["The Hollow Plate","Souls Unbound","The King Unmade"], rotations:[["cleave","chains"],["souls","cleave"],["beam","souls"]] },
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

  DATA.assignEnemyArt(DATA.ENEMIES.boss_portal);
  DATA.assignEnemyArt(DATA.ENEMIES.boss_decoy);

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
      for(const d of this.arena.devices||[])Object.assign(d,{required:false,completed:false,cooldown:0});
    }
    beginMechanic() {
      if(!this.arena.dedicated)return;
      const devices=this.arena.devices;
      const first=(this.phase-1)%devices.length;
      const required=this.mon.defId==='malthoron'?[devices[first].deviceId,devices[(first+1)%devices.length].deviceId]:[devices[first].deviceId];
      this.mechanic={phase:this.phase,required,remaining:required.slice(),armed:false};this.ward=null;
      for(const d of devices)Object.assign(d,{required:required.includes(d.deviceId),completed:false,cooldown:0});
      if(this.mon.defId==='malthoron')this.mon.def.armor=this.base.armor*(this.phase===1?1:.7);
    }
    completeMechanic(label='Defense broken') {
      const hadMechanic=!!this.mechanic;
      this.clearAttacks();this.mechanic=null;this.ward=null;
      for(const d of this.arena.devices||[]){d.required=false;d.cooldown=Math.max(d.cooldown,8);}
      if(hadMechanic&&this.mon.defId==='malthoron'){
        this.mon.def.armor=this.base.armor*(this.phase===1?.7:.4);
        for(let i=0;i<5;i++)this.debris.push({x:this.mon.x,y:this.mon.y,part:i,angle:i*TAU/5,ttl:2,maxTtl:2,phase:this.phase-1});
      }
      this.recover(3,label);Game.addNova(this.mon.x,this.mon.y,3,this.config.color);Sfx.play('shrine');
    }
    interactDevice(device,player) {
      if(!this.active||player.dead||player.connected===false||!this.arena.devices?.includes(device)||
        U.dist(player.x,player.y,device.x,device.y)>device.interactionRange+.05||device.cooldown>0)return false;
      if(this.mechanic&&!device.required)return false;
      if(this.mechanic?.armed)return false;
      device.completed=true;device.cooldown=this.mechanic?0:12;
      const id=this.mon.defId;
      if(id==='korvath'||id==='azram'){
        this.clearAttacks();
        const dx=this.arena.cx-device.x,dy=this.arena.cy-device.y,len=Math.hypot(dx,dy)||1;
        this.ward={deviceId:device.deviceId,x:device.x+dx/len*2.5,y:device.y+dy/len*2.5,radius:2.2,ttl:12,kind:id==='korvath'?'charge':'sunbeam'};
        if(this.mechanic)this.mechanic.armed=true;
        this.stage='idle';this.timer=.5;this.pose='windup';this.setArt();
      }else if(this.mechanic){
        this.mechanic.remaining=this.mechanic.remaining.filter(v=>v!==device.deviceId);device.required=false;device.cooldown=12;
        if(!this.mechanic.remaining.length)this.completeMechanic(id==='mire_mother'?'Heart exposed':id==='empty_archangel'?'Choir silenced':id==='malthoron'?'Soul chains severed':'Veil unraveled');
        else{this.clearAttacks();this.recover(1,'One soul chain remains');}
      }else this.completeMechanic(id==='mire_mother'?'Basin drained':id==='empty_archangel'?'Bell interruption':id==='malthoron'?'Soulfire extinguished':'Memory purged');
      Sfx.play('shrine');return true;
    }
    limitDamage(damage) {
      if(this.mechanic)return 0;
      const next=this.mon.def.phases?.[this.phase];
      return next?Math.min(damage,Math.max(0,this.mon.hp-this.mon.maxHp*next.at)):damage;
    }
    mechanicText() {
      if(!this.mechanic)return '';
      const id=this.mon.defId;
      if(this.mechanic.armed)return id==='korvath'?'Bait the charge through the blue ward':'The mirror is aligned — evade the sun beam';
      return {korvath:'Light the marked brazier to break Oathfire',mire_mother:'Turn the marked sluice to expose her heart',azram:'Turn the marked mirror to break the throne ward',empty_archangel:'Ring the marked bell to end the choir',malthoron:'Extinguish the marked braziers · '+this.mechanic.remaining.length+' remaining',vethriss:'Activate the marked shard to unravel the veil'}[id];
    }
    targets(fn) {
      for(const p of this.world.players||[this.world.player])if(!p.dead&&p.connected!==false)fn(p);
      for(const m of this.world.minions)if(this.active&&!m.dead)fn(m);
    }
    clearAttacks() {
      if(typeof BossVFX!=='undefined')BossVFX.cancel(this);
      this.attack=null;this.sequence=null;this.pursuit=0;this.pools.length=0;
      // Illusion channels belong to the canceled sequence, not an independent AI.
      for(const m of this.owned)if(m.encounterKind==="decoy"){m.dead=true;m.hp=0;m.corpseT=0;}
      const owner=this.mon,owned=this.owned;
      this.world.projectiles=this.world.projectiles.filter(p=>p.bossOwner!==owner&&p.mon!==owner&&!owned.includes(p.mon));
      this.world.fx=this.world.fx.filter(f=>f.owner!==owner&&!owned.includes(f.owner));
      this.mon.action=null;this.mon.path=null;this.mon.moving=false;
    }
    clearOwned() {
      for(const m of this.owned){m.cancelAttacks?.();m.enemySkills?.cancel();m.dead=true;m.hp=0;m.corpseT=0;m.action=null;m.aggro=false;}
      this.owned.length=0;
    }
    reset() {
      this.clearAttacks();this.clearOwned();this.debris.length=0;
      this.resetDevices();this.seal(false);this.sector=0;this.lifecycle='ready';
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
      if(m.defId==="malthoron") {
        m.def.armor=this.base.armor*(index===1?.7:.4);
        if(index===1)this.wave(["hollow_knight","hollow_knight"]);
      }
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
    damage(shape,mult,elem,hit=null) {
      this.targets(t=>{if(t.groundImmune||hit?.has(t))return;if(contains(shape,t.x,t.y)){hit?.add(t);t.takeDamage(U.rf(...this.mon.def.dmg)*2.2*(this.mon.def.dmgMult||1)*this.mon.witherMult()*mult*(t instanceof Player?1:.14),this.mon,elem);}});
    }
    start(id,player) {
      const m=this.mon;
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
        recovery=2.25;
      } else if(id==="fissure"&&m.defId==="korvath"&&this.phase>0) {
        steps.push({id:"fissure",angle:Math.atan2(player.y-m.y,player.x-m.x)+Math.PI/2});recovery=2;
      } else if(id==="descent"&&m.defId==="empty_archangel"&&this.phase>0) {
        steps.push({id:"cross"});recovery=2;
      } else if(id==="decoys") {
        steps.push({id:"echoes"});recovery=2;
      }
      this.sequence={steps,index:0,recovery};this.pursuit=0;
      this.startStep(player);
    }
    startStep(player) {
      const m=this.mon,sequence=this.sequence,{id,remembered=null,angle:lockedAngle}=sequence.steps[sequence.index];
      const angle=lockedAngle??Math.atan2(player.y-m.y,player.x-m.x),base={x:m.x,y:m.y,angle};
      const a={id,remembered,stepIndex:sequence.index,stepCount:sequence.steps.length,shapes:[],windup:1,recovery:1.25,mult:1.05,elem:"phys",duration:.22,age:0,tick:0,color:this.config.color,hit:new Set()};
      const line=(ang,width=1.4,length=9)=>({...base,kind:"line",angle:ang,width,length});
      switch(id) {
        case "cleave":a.label="Committed Cleave";a.shapes=[{...base,kind:"cone",radius:4,arc:Math.PI*.7}];break;
        case "fissure":a.label="Oathbreak Fissure";a.shapes=[line(angle)];a.mult=1.2;a.elem="fire";break;
        case "charge": {
          a.label='Oathbreaker Charge';a.windup=1.35;a.duration=.7;a.recovery=2;a.mult=1.1;
          let length=Math.min(14,Math.hypot(player.x-m.x,player.y-m.y)+2);
          while(length>.5&&(!insideArena(this.arena,m.x+Math.cos(angle)*length,m.y+Math.sin(angle)*length,m.radius)||
            !footprint(this.map,m.x+Math.cos(angle)*length,m.y+Math.sin(angle)*length,m.radius)))length-=.25;
          a.shapes=[line(angle,1.7,length)];break;
        }
        case "sunbeam": {
          const device=this.ward&&this.arena.devices?.find(d=>d.deviceId===this.ward.deviceId);
          const beamAngle=device?Math.atan2(device.y-m.y,device.x-m.x):angle;
          a.label=device?'Reflected Sun':'The Undying Sun';a.windup=1.4;a.elem='fire';a.mult=1.05;
          a.shapes=[line(beamAngle,1.45,device?U.dist(m.x,m.y,device.x,device.y):15)];
          a.mirrorId=device?.deviceId;break;
        }
        case "flood":
          a.label='The Basin Rises';a.windup=2.5;a.elem='poison';a.mult=.25;a.recovery=2.25;
          a.shapes=[{kind:'cone',x:this.arena.cx,y:this.arena.cy,angle:(this.sector++%3)*TAU/3,radius:17,arc:Math.PI/2}];break;
        case "bile": {
          a.label="Bilefall";a.elem="poison";a.mult=.55;a.recovery=2.25;
          const p=this.safePoint(player.x,player.y);if(p)a.shapes.push({...p,kind:"circle",radius:1.6});
          if(m.defId==="mire_mother"&&this.phase===2){const q=this.safePoint(player.x+Math.cos(angle+Math.PI/2)*3.8,player.y+Math.sin(angle+Math.PI/2)*3.8);if(q)a.shapes.push({...q,kind:"circle",radius:1.6});}
          break;
        }
        case "grasp":
          a.label="The Marsh Reaches";a.shapes=[{...base,kind:"ring",inner:2.7,radius:5}];a.elem="poison";a.mult=1.15;a.recovery=2.25;
          this.pools=this.pools.filter(p=>U.dist(m.x,m.y,p.x,p.y)>2.7+p.radius);break;
        case "chains":a.label=m.defId==='malthoron'?'Quieting Chains':'Chains of Khal-Zahir';a.quieting=m.defId==='malthoron';a.shapes=[line(angle,1.25,10),{...line(angle,1.25,10),x:m.x+Math.cos(angle+Math.PI/2)*3,y:m.y+Math.sin(angle+Math.PI/2)*3}];a.elem="light";break;
        case "portals":a.label="Portals to the Past";a.shapes=[{x:m.x-3,y:m.y+2,kind:"circle",radius:1},{x:m.x+3,y:m.y-2,kind:"circle",radius:1}];a.mult=0;a.recovery=2;break;
        case "gold":a.label="Molten Crown";a.shapes=[{...base,kind:"cone",radius:6,arc:Math.PI*.65}];a.elem="fire";a.mult=1.2;break;
        case "wings":case "souls": {
          a.label=id==="wings"?"Broken-Wing Fan":"Souls Unbound";a.elem=id==="wings"?"light":"shadow";a.projectiles=true;
          // Wide intentional gaps: five individually marked paths, never a solid wall.
          for(const off of [-.9,-.45,0,.45,.9])a.shapes.push(line(angle+off,1.1,10));
          a.mult=.55;break;
        }
        case "descent": {
          a.label="Empty Benediction";const p=this.safePoint(player.x,player.y,this.mon.radius);if(p)a.shapes=[{...p,kind:"circle",radius:2.3}];a.elem="light";a.mult=1.2;a.recovery=1.6;break;
        }
        case "cross":a.label="Fractured Sanctum";a.shapes=[{x:m.x-6,y:m.y,kind:"line",angle:0,width:1.5,length:12},{x:m.x,y:m.y-6,kind:"line",angle:Math.PI/2,width:1.5,length:12}];a.elem="light";break;
        case "beam":
          a.label="The Hollow Choir";a.sweepDirection=this.beamCount++%2===0?1:-1;a.startAngle=angle-.45*a.sweepDirection;
          a.shapes=[line(a.startAngle,1.35,10)];a.duration=3;a.windup=1.2;a.mult=.32;a.elem="shadow";a.recovery=2;break;
        case "light":a.label="Borrowed Light";a.shapes=[line(angle,1.1,9)];a.elem="light";a.mult=.55;break;
        case "lunge":a.label="Serpent's Fang";a.shapes=[line(angle,1.6,Math.min(8,Math.hypot(player.x-m.x,player.y-m.y)+1.5))];a.mult=1.1;a.duration=.45;break;
        case "decoys":a.label="Three Beautiful Lies";a.shapes=[];a.mult=0;a.recovery=1.5;break;
        case "echoes":
          a.label="Shatter the Lies";a.windup=1.25;a.mult=.25;a.elem="shadow";
          for(const decoy of this.owned)if(!decoy.dead&&decoy.encounterKind==="decoy") {
            decoy.echoLane={kind:"line",x:decoy.x,y:decoy.y,angle:Math.atan2(player.y-decoy.y,player.x-decoy.x),width:1,length:6};
            decoy.spriteOpts.bossPose="windup";a.shapes.push(decoy.echoLane);
          }
          if(!a.shapes.length){this.recover(2,"Lies Shattered");return;}
          break;
      }
      if(sequence.recovery!==null)a.recovery=sequence.recovery;
      if(remembered)a.label=DATA.ENEMIES[remembered].name.split(",")[0]+" · "+a.label;
      this.attack=a;this.stage="windup";this.timer=a.windup;this.pose="windup";this.label=a.label;
      if(typeof EnemySkills!=='undefined')EnemySkills.reserveBossWarning(this);
      if(typeof BossVFX!=='undefined')BossVFX.begin(this);
      m.path=null;m.moving=false;m.face(m.x+Math.cos(angle),m.y+Math.sin(angle));this.setArt();Sfx.play("shrine");
    }
    recover(seconds,label="Opening") {
      this.sequence=null;this.stage="recovery";this.timer=seconds;this.recoveryDuration=seconds;
      this.pose="recovery";this.label=label;this.setArt();
    }
    statusText() {
      if(this.mechanic)return this.mechanicText();
      const time=" · "+Math.max(0,this.timer).toFixed(1)+"s";
      if(this.stage==="transition")return "Changing form";
      if(this.stage==="recovery")return (this.mon.defId==="mire_mother"&&this.phase>0?(this.phase===1?this.config.phases[1]:"Shard exposed")+" · +25% damage":this.label)+time;
      if(this.stage==="idle")return this.pose==="movement"?"Closing distance":"Stand ready";
      const a=this.attack;
      return a?a.label+(a.stepCount>1?" · "+(a.stepIndex+1)+"/"+a.stepCount:"")+(this.stage==="windup"?time:a.id==="portals"?" · Portals open":a.id==="decoys"?" · Illusions forming":" · Strike"):"";
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
        for(let i=0;i<3;i++)this.spawn("boss_decoy",m.x+Math.cos(i*TAU/3)*3.5,m.y+Math.sin(i*TAU/3)*3.5,"decoy");
      } else if(a.projectiles) {
        for(const s of a.shapes){Game.spawnProjectile({x:s.x,y:s.y,tx:s.x+Math.cos(s.angle)*s.length,ty:s.y+Math.sin(s.angle)*s.length,speed:5,ttl:s.length/5,kind:"soulbolt",elem:a.elem,fromPlayer:false,mon:m,bossOwner:m,bossLane:s,bossMult:a.mult,bossVisual:{id:a.id,remembered:a.remembered}});}
      } else if(a.id==='sunbeam'&&a.mirrorId&&this.ward?.deviceId===a.mirrorId){
        const device=this.arena.devices.find(d=>d.deviceId===a.mirrorId);
        Game.beamFx(m.x,m.y,device.x,device.y,'#ffd979');Game.beamFx(device.x,device.y,m.x,m.y,'#fff6ce');
        this.completeMechanic('Throne ward shattered');return;
      } else if(!['beam','lunge','charge'].includes(a.id))for(const s of a.shapes){this.damage(s,a.mult,a.elem,a.hit);if(!this.active||this.attack!==a)return;}
      if(!this.active)return; // A lethal impact may synchronously reset the entire fight.
      if(a.id==="echoes")this.clearOwned();
      if(a.id==="bile")for(const s of a.shapes){if(this.pools.length>=3)this.pools.shift();this.pools.push({...s,ttl:6,tick:.75});}
      if(a.id==='flood'||a.id==='fissure'&&m.defId==='korvath'&&this.phase>0)for(const s of a.shapes){
        if(this.pools.length>=3)this.pools.shift();this.pools.push({...s,ttl:4.5,tick:.75,elem:a.elem,mult:.08});
      }
      if(a.id==="descent"&&a.shapes[0]){m.x=a.shapes[0].x;m.y=a.shapes[0].y;}
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
      for(const d of this.arena.devices||[]){const was=d.cooldown;d.cooldown=Math.max(0,d.cooldown-dt);if(was>0&&!d.cooldown&&!this.mechanic)d.completed=false;}
      if(this.ward){this.ward.ttl-=dt;if(this.ward.ttl<=0){
        const d=this.arena.devices.find(d=>d.deviceId===this.ward.deviceId);if(d){d.completed=false;if(this.mechanic)d.cooldown=0;}
        this.ward=null;if(this.mechanic)this.mechanic.armed=false;
      }}
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
          if(a.id==='charge'&&this.ward?.kind==='charge'){
            const w=this.ward,projection=U.clamp((w.x-swept.x)*Math.cos(s.angle)+(w.y-swept.y)*Math.sin(s.angle),0,swept.length);
            if(swept.length>0&&U.dist(w.x,w.y,swept.x+Math.cos(s.angle)*projection,swept.y+Math.sin(s.angle)*projection)<=w.radius){this.completeMechanic('Oathfire broken');return;}
          }
          this.targets(t=>{if(!t.groundImmune&&!a.hit.has(t)&&contains(s,t.x,t.y)&&contains(swept,t.x,t.y)){a.hit.add(t);t.takeDamage(U.rf(...m.def.dmg)*2.2*(m.def.dmgMult||1)*a.mult*m.witherMult()*(t instanceof Player?1:.14),m);}});
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
      if(this.ward){this.start(this.ward.kind,player);return;}
      if(this.mechanic){
        const id={korvath:'charge',mire_mother:'grasp',azram:'sunbeam',empty_archangel:'wings',malthoron:'souls',vethriss:'light'}[m.defId];
        this.start(id,player);this.attack.windup=this.timer=Math.max(1.5,this.attack.windup);return;
      }
      const rotation=this.config.rotations[this.phase];let id=rotation[this.rotation%rotation.length];
      // Melee attacks close the distance before committing; other patterns prevent endless kiting.
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
      this.rotation++;this.start(id,player);
    }
    onOwnedDeath(mon) {
      if(!this.active)return;
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
        const bright=d.required?'#fff1b0':DATA.BOSS_ARENAS[a.bossId].color;
        trace(ctx,{kind:'circle',x:d.x,y:d.y,radius:d.required?1.65:1.2},cam);
        ctx.globalAlpha=d.required?.9:.35;ctx.strokeStyle=bright;ctx.lineWidth=d.required?3:1.5;ctx.stroke();
        if(d.required&&a.bossId==='malthoron'&&e?.mon){
          ctx.beginPath();ctx.moveTo(U.isoX(d.x,d.y)-cam.x,U.isoY(d.x,d.y)-cam.y-30);
          ctx.lineTo(U.isoX(e.mon.x,e.mon.y)-cam.x,U.isoY(e.mon.x,e.mon.y)-cam.y-65);
          ctx.setLineDash([7,5]);ctx.stroke();ctx.setLineDash([]);
        }
        if(d.required||e?.active&&U.dist(world.player.x,world.player.y,d.x,d.y)<4){
          const rawX=U.isoX(d.x,d.y)-cam.x,rawY=U.isoY(d.x,d.y)-cam.y-100;
          const sx=d.required?U.clamp(rawX,100,ctx.canvas.width-100):rawX,sy=d.required?U.clamp(rawY,150,ctx.canvas.height-175):rawY;
          const arrow=rawX<sx-10?'← ':rawX>sx+10?'→ ':rawY<sy-10?'↑ ':rawY>sy+10?'↓ ':'';
          const label=d.required?arrow+'USE · '+d.label:d.cooldown>0?d.label+' · '+Math.ceil(d.cooldown)+'s':d.label;
          ctx.font='14px Georgia, serif';ctx.textAlign='center';const width=Math.min(240,ctx.measureText(label).width+18);
          ctx.globalAlpha=.92;ctx.fillStyle='#0b1018';ctx.fillRect(sx-width/2,sy-14,width,23);
          ctx.globalAlpha=1;ctx.fillStyle=bright;ctx.fillText(label,sx,sy+2,width-10);
        }
      }
      if(e?.ward){trace(ctx,{kind:'circle',...e.ward},cam);ctx.globalAlpha=.22;ctx.fillStyle='#8bdeff';ctx.fill();ctx.globalAlpha=.95;ctx.strokeStyle='#c9f5ff';ctx.lineWidth=3;ctx.stroke();}
      if(e?.mechanic){trace(ctx,{kind:'circle',x:e.mon?.x??a.cx,y:e.mon?.y??a.cy,radius:2.2},cam);ctx.globalAlpha=.7;ctx.strokeStyle=e.config.color;ctx.setLineDash([7,5]);ctx.lineWidth=3;ctx.stroke();}
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
      for(const portal of e.owned)if(!portal.dead&&portal.encounterKind==="portal") {
        const x=U.isoX(portal.x,portal.y)-cam.x,y=U.isoY(portal.x,portal.y)-cam.y+40;
        const full=e.owned.filter(m=>!m.dead&&m.encounterKind!=="portal").length>=e.config.cap;
        const label=portal.portalSpawns>0?(portal.portalTimer===0&&full?"Waiting":portal.portalTimer.toFixed(1)+"s")+" · "+portal.portalSpawns+" left":"Spent portal";
        ctx.globalAlpha=1;ctx.fillStyle="rgba(8,7,5,.9)";ctx.fillRect(x-63,y-12,126,19);
        ctx.fillStyle=e.config.color;ctx.font="12px Exocet, Georgia, serif";ctx.textAlign="center";ctx.fillText(label,x,y+2);ctx.textAlign="left";
      }
      const attack=e.attack;
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
