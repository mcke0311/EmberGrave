/* EMBERGRAVE — authored campaign encounters. All timing is simulation time.
   No attack callback survives its encounter; warning geometry is damage geometry. */
"use strict";

const BossEncounters = (() => {
  const TAU = Math.PI * 2;
  const definitions = DATA.BOSS_ENCOUNTERS = {
    korvath: { zone:"shattered_temple", cap:2, color:"#ffb65a", phases:["The Last Defender","Oathfire"], rotations:[["cleave","fissure"],["cleave","fissure","fissure"]] },
    mire_mother: { zone:"ritual_site", cap:4, color:"#b9e76f", phases:["The Marsh's Embrace","The Shard Exposed","She Will Not Let Go"], rotations:[["bile","grasp"],["bile","grasp"],["bile","grasp","bile"]] },
    azram: { zone:"khal_palace", cap:4, color:"#ffd979", phases:["The Gilded Throne","Portals to the Past","Molten Crown"], rotations:[["chains","cleave"],["chains","portals","chains"],["gold","portals","chains"]] },
    empty_archangel: { zone:"cathedral1", cap:0, color:"#e6d6ff", phases:["The Borrowed Voice","Broken Wings"], rotations:[["wings","descent"],["cross","wings","descent"]] },
    malthoron: { zone:"cathedral2", cap:2, color:"#c6a5ff", phases:["The Hollow Plate","Souls Unbound","The King Unmade"], rotations:[["cleave","chains"],["souls","cleave"],["beam","souls"]] },
    vethriss: { zone:"throne", cap:3, color:"#95ffe0", phases:["Seraneth, Wounded","The Serpent's Lie","The Shadow Remembers"], rotations:[["light","cleave"],["lunge","decoys","lunge"],["memory"]] },
  };
  // The source enemy catalog is also used by editors and legacy test fixtures.
  // Resolve the actual zone IDs from its authoritative boss mapping.
  for (const [id, d] of Object.entries(definitions)) {
    const zone = Object.values(DATA.ZONES).find(z => z.boss === id);
    if (zone) d.zone = zone.id;
  }
  DATA.ENEMIES.boss_portal = { id:"boss_portal",name:"Portal to the Past",family:"construct",lvl:17,hp:95,dmg:[0,0],armor:0,def:0,xp:0,speed:0,atkRate:0,range:0,sight:0,sprite:"beacon",big:1.3,pal:{stone:"#826536",rune:"#ffd979",eye:"#ffd979"},sounds:"metal" };
  DATA.ENEMIES.boss_decoy = { id:"boss_decoy",name:"The Serpent's Lie",family:"demon",lvl:25,hp:1,dmg:[0,0],armor:0,def:0,xp:0,speed:0,atkRate:0,range:0,sight:0,sprite:"serpent",big:2.1,pal:{body:"#417d76"},sounds:"metal" };

  const insideArena = (a,x,y,margin=0) => x >= a.x0+margin && x <= a.x1-margin && y >= a.y0+margin && y <= a.y1-margin;
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
      this.pose="idle"; this.label=""; this.elapsed=0; this.resetCount=0; this.setArt();
      if(mon.defId==="mire_mother")delete mon.def.deathBurst;
    }
    setArt() {
      this.mon.spriteOpts.bossArt=this.mon.defId;
      this.mon.spriteOpts.bossPhase=this.phase;
      this.mon.spriteOpts.bossPose=this.pose;
    }
    targets(fn) {
      const p=this.world.player;
      if(!p.dead)fn(p);
      for(const m of this.world.minions)if(!m.dead)fn(m);
    }
    clearAttacks() {
      this.attack=null; this.pools.length=0;
      const owner=this.mon,owned=this.owned;
      this.world.projectiles=this.world.projectiles.filter(p=>p.bossOwner!==owner&&p.mon!==owner&&!owned.includes(p.mon));
      this.mon.action=null;this.mon.path=null;this.mon.moving=false;
    }
    clearOwned() {
      for(const m of this.owned){m.dead=true;m.hp=0;m.corpseT=0;m.action=null;m.aggro=false;}
      this.owned.length=0;
    }
    reset() {
      this.clearAttacks();this.clearOwned();this.debris.length=0;
      const m=this.mon;
      m.def=JSON.parse(JSON.stringify(this.base));m.spriteOpts=JSON.parse(JSON.stringify(this.baseOpts));
      m.hp=m.maxHp;m.x=this.home.x;m.y=this.home.y;m.scale=this.baseScale;m.radius=this.baseRadius;m.name=this.baseName;
      m.phaseIdx=0;m.aggro=false;m.enraged=false;m.tint=undefined;m.action=null;m.path=null;
      for(const k of ["poisonDot","scorch","plague","doom","killMark","rabies","curseFrailty","curseWither","pulled","beckon","frozen","feared","sunder","fleeUntil","blindUntil"])m[k]=null;
      m.stunT=0;m.slowT=0;m.slowPct=0;m.noHeal=false;m.healthBarUntil=0;
      this.active=false;this.phase=0;this.stage="idle";this.timer=.8;this.rotation=0;this.memoryIndex=0;this.pose="idle";this.label="";this.elapsed=0;this.resetCount++;
      this.portalPhases.clear();
      if(m.defId==="mire_mother")delete m.def.deathBurst;
      this.setArt();
    }
    finish() {
      this.clearAttacks();this.clearOwned();this.active=false;this.stage="dead";this.pose="death";this.setArt();
    }
    prepare(player,map) {
      if(map!==this.map||Game.state!==this.world||player.dead||!insideArena(this.arena,player.x,player.y)) {
        if(this.active||this.mon.hp<this.mon.maxHp)this.reset();
        return false;
      }
      return true;
    }
    canDamage() { return Game.state===this.world && this.prepare(this.world.player,Game.state.map); }
    phaseChange(index) {
      this.clearAttacks();this.phase=index;this.mon.phaseIdx=index;this.rotation=0;
      const m=this.mon,s=m.def.phases[index-1]?.set||{};
      // Preserve canonical form metadata while avoiding compounded stat multipliers.
      if(s.sprite){m.spriteOpts.kind=s.sprite;delete m.spriteOpts.npcArt;}
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
        for(let i=0;i<5;i++)this.debris.push({x:m.x,y:m.y,part:i,angle:i*TAU/5,ttl:2,maxTtl:2,phase:index-1});
        if(index===1)this.wave(["hollow_knight","hollow_knight"]);
      }
      if(m.defId==="vethriss")this.clearOwned();
    }
    safePoint(x,y,r=.8) {
      const a=this.arena;
      x=U.clamp(x,a.x0+1.5,a.x1-1.5);y=U.clamp(y,a.y0+1.5,a.y1-1.5);
      if(footprint(this.map,x,y,r))return {x,y};
      for(let k=1;k<=4;k++)for(let i=0;i<8;i++) {
        const px=x+Math.cos(i*TAU/8)*k,py=y+Math.sin(i*TAU/8)*k;
        if(insideArena(a,px,py,1.5)&&footprint(this.map,px,py,r))return {x:px,y:py};
      }
      return null;
    }
    spawn(id,x,y,kind="add") {
      this.owned=this.owned.filter(m=>!m.dead);
      const living=this.owned.filter(m=>m.encounterKind!=="portal").length;
      if(kind!=="portal"&&living>=this.config.cap)return null;
      const point=this.safePoint(x,y);if(!point)return null;
      const m=new Monster(id,point.x,point.y);
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
        if(m.dead)continue;
        if(m.encounterKind==="portal") {
          m.portalTimer-=dt;
          if(m.portalTimer<=0&&m.portalSpawns>0) {
            m.portalTimer=2.5;
            const ids=["frost_risen","drowned_dead","sand_raider"],id=ids[(this.rotation+m.portalSpawns)%ids.length];
            if(this.spawn(id,m.x+1,m.y+1))m.portalSpawns--;
          }
        }
        if(!insideArena(this.arena,m.x,m.y,.5)){const p=this.safePoint(m.x,m.y);if(p){m.x=p.x;m.y=p.y;}m.path=null;}
      }
    }
    damage(shape,mult,elem) {
      this.targets(t=>{if(t.groundImmune)return;if(contains(shape,t.x,t.y))t.takeDamage(U.rf(...this.mon.def.dmg)*2.2*(this.mon.def.dmgMult||1)*this.mon.witherMult()*mult*(t===this.world.player?1:.45),this.mon,elem);});
    }
    start(id,player) {
      const m=this.mon;let remembered=null;
      if(id==="portals"&&this.portalPhases.has(this.phase))id=this.phase===2?"gold":"chains";
      if(id==="memory") {
        remembered=["korvath","mire_mother","azram","malthoron"][this.memoryIndex++%4];
        id={korvath:"fissure",mire_mother:"bile",azram:"chains",malthoron:"beam"}[remembered];
      }
      const angle=Math.atan2(player.y-m.y,player.x-m.x),base={x:m.x,y:m.y,angle};
      const a={id,remembered,shapes:[],windup:1,recovery:1.25,mult:1.05,elem:"phys",duration:.22,age:0,tick:0,color:this.config.color};
      const line=(ang,width=1.4,length=9)=>({...base,kind:"line",angle:ang,width,length});
      switch(id) {
        case "cleave":a.label="Committed Cleave";a.shapes=[{...base,kind:"cone",radius:4,arc:Math.PI*.7}];break;
        case "fissure":a.label="Oathbreak Fissure";a.shapes=[line(angle)];a.mult=1.2;a.elem="fire";a.followup=m.defId==="korvath"&&this.phase>0;break;
        case "bile": {
          a.label="Bilefall";a.elem="poison";a.mult=.55;a.recovery=2.25;
          const p=this.safePoint(player.x,player.y);if(p)a.shapes.push({...p,kind:"circle",radius:1.6});
          if(m.defId==="mire_mother"&&this.phase===2){const q=this.safePoint(player.x+Math.cos(angle+Math.PI/2)*3.8,player.y+Math.sin(angle+Math.PI/2)*3.8);if(q)a.shapes.push({...q,kind:"circle",radius:1.6});}
          break;
        }
        case "grasp":a.label="The Marsh Reaches";a.shapes=[{...base,kind:"ring",inner:2.7,radius:5}];a.elem="poison";a.mult=1.15;break;
        case "chains":a.label="Chains of Khal-Zahir";a.shapes=[line(angle,1.25,10),{...line(angle,1.25,10),x:m.x+Math.cos(angle+Math.PI/2)*3,y:m.y+Math.sin(angle+Math.PI/2)*3}];a.elem="light";break;
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
        case "beam":a.label="The Hollow Choir";a.shapes=[line(angle-.45,1.35,10)];a.startAngle=angle-.45;a.duration=3;a.windup=1.2;a.mult=.32;a.elem="shadow";break;
        case "light":a.label="Borrowed Light";a.shapes=[line(angle,1.1,9)];a.elem="light";a.mult=.55;break;
        case "lunge":a.label="Serpent's Fang";a.shapes=[line(angle,1.6,Math.min(8,Math.hypot(player.x-m.x,player.y-m.y)+1.5))];a.mult=1.1;a.duration=.45;break;
        case "decoys":a.label="Three Beautiful Lies";a.shapes=[];a.mult=0;a.recovery=1.5;break;
      }
      if(remembered)a.label=DATA.ENEMIES[remembered].name.split(",")[0]+" · "+a.label;
      this.attack=a;this.stage="windup";this.timer=a.windup;this.pose="windup";this.label=a.label;
      m.path=null;m.moving=false;m.face(player.x,player.y);this.setArt();Sfx.play("shrine");
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
        for(const s of a.shapes){Game.spawnProjectile({x:s.x,y:s.y,tx:s.x+Math.cos(s.angle)*s.length,ty:s.y+Math.sin(s.angle)*s.length,speed:5,ttl:s.length/5,kind:"soulbolt",elem:a.elem,fromPlayer:false,mon:m,bossOwner:m,bossLane:s,bossMult:a.mult});}
      } else if(a.id!=="beam"&&a.id!=="lunge")for(const s of a.shapes)this.damage(s,a.mult,a.elem);
      if(!this.active)return; // A lethal impact may synchronously reset the entire fight.
      if(a.id==="bile")for(const s of a.shapes){if(this.pools.length>=3)this.pools.shift();this.pools.push({...s,ttl:6,tick:.75});}
      if(a.id==="descent"&&a.shapes[0]){m.x=a.shapes[0].x;m.y=a.shapes[0].y;}
      if(a.id==="lunge"){a.start={x:m.x,y:m.y};a.hit=new Set();}
      Sfx.play(a.id==="bile"?"blast":"slam");
    }
    update(dt,player,map) {
      const m=this.mon;
      if(!this.prepare(player,map))return;
      if(!this.active) {
        if(!m.aggro&&m.hp===m.maxHp&&U.dist(m.x,m.y,player.x,player.y)>10)return;
        this.active=true;m.aggro=true;
        if(m.def.cutscene)Game.firstSightCutscene(m.defId,m.def.cutscene);
        if(!m.spoke){m.spoke=true;Game.msg(m.name+": “"+m.def.aggroLines[0]+"”",this.config.color);}
      }
      this.elapsed+=dt;
      const next=m.def.phases?.[this.phase];
      if(next&&m.hp<=m.maxHp*next.at){this.phaseChange(this.phase+1);return;}
      this.updateOwned(dt);
      for(let i=this.debris.length-1;i>=0;i--){this.debris[i].ttl-=dt;if(this.debris[i].ttl<=0)this.debris.splice(i,1);}
      for(let i=this.pools.length-1;i>=0;i--){const p=this.pools[i];p.ttl-=dt;p.tick-=dt;if(p.ttl<=0){this.pools.splice(i,1);continue;}if(p.tick<=0){p.tick=.75;this.damage(p,.13,"poison");if(!this.active)return;}}
      this.timer-=dt;
      if(this.stage==="execute") {
        const a=this.attack;a.age+=dt;
        if(a.id==="beam") {
          a.shapes[0].angle=a.startAngle+Math.min(1,a.age/a.duration)*.9;
          a.tick-=dt;if(a.tick<=0){a.tick=.45;this.damage(a.shapes[0],a.mult,a.elem);}
        }
        if(a.id==="lunge") {
          const s=a.shapes[0],k=Math.min(1,a.age/a.duration),x=a.start.x+Math.cos(s.angle)*s.length*k,y=a.start.y+Math.sin(s.angle)*s.length*k;
          const swept={...s,x:m.x,y:m.y,length:Math.hypot(x-m.x,y-m.y)};
          if(insideArena(this.arena,x,y,m.radius)&&footprint(map,x,y,m.radius)){m.x=x;m.y=y;}
          else swept.length=0;
          this.targets(t=>{if(!t.groundImmune&&!a.hit.has(t)&&contains(s,t.x,t.y)&&contains(swept,t.x,t.y)){a.hit.add(t);t.takeDamage(U.rf(...m.def.dmg)*2.2*(m.def.dmgMult||1)*a.mult*m.witherMult()*(t===player?1:.45),m);}});
        }
      }
      if(this.timer>0)return;
      if(this.stage==="windup"){this.execute();return;}
      if(this.stage==="execute") {
        if(this.attack.followup){this.attack.followup=false;this.start("fissure",player);this.attack.followup=false;return;}
        this.stage="recovery";this.timer=this.attack.recovery;this.pose="recovery";this.setArt();return;
      }
      if(this.stage==="recovery"||this.stage==="transition"){this.attack=null;this.stage="idle";this.timer=.45;this.pose="idle";this.setArt();return;}
      if(m.stunT>0||(m.frozen&&this.world.time<m.frozen)){this.timer=.1;return;}
      const rotation=this.config.rotations[this.phase],id=rotation[this.rotation%rotation.length];
      // Melee attacks close the distance before committing; other patterns prevent endless kiting.
      if(id==="cleave"&&U.dist(m.x,m.y,player.x,player.y)>4.2) {
        const beforeX=m.x,beforeY=m.y;
        m.chase(dt,player,map,(x,y)=>MapGen.walkable(map,x,y));
        if(!insideArena(this.arena,m.x,m.y,m.radius)){m.x=beforeX;m.y=beforeY;m.path=null;}
        this.pose="movement";this.setArt();return;
      }
      this.rotation++;this.start(id,player);
    }
    onOwnedDeath(mon) {
      if(mon.encounterKind==="portal"&&this.active){this.clearAttacks();this.stage="recovery";this.timer=1.5;this.pose="recovery";this.label="Chains Broken";this.setArt();}
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
    if(a) {
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
      for(const p of e.pools){trace(ctx,p,cam);ctx.globalAlpha=.22;ctx.fill();ctx.globalAlpha=.85;ctx.stroke();}
      const attack=e.attack;
      if(attack&&(e.stage==="windup"||e.stage==="execute"))for(const s of attack.shapes) {
        trace(ctx,s,cam);ctx.globalAlpha=e.stage==="windup"?.14+.18*(1-e.timer/attack.windup):.52;ctx.fill();ctx.globalAlpha=.95;ctx.stroke();
        if(attack.id==="beam"&&e.stage==="execute"){trace(ctx,{...s,angle:s.angle+.22},cam);ctx.setLineDash([6,5]);ctx.globalAlpha=.65;ctx.stroke();ctx.setLineDash([]);}
      }
      ctx.restore();
    }
  }
  return {definitions,create,contains,insideArena,footprint,cancelAll,draw};
})();
