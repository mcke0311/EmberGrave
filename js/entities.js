/* =========================================================================
   EMBERGRAVE — entities.js
   Player, monsters (AI, elites, bosses), NPCs, projectiles, ground loot.
   Combat math, buffs, status effects, XP and leveling.
   Entities talk to the running game through the global `Game` (game.js).
   ========================================================================= */
"use strict";

/* ------------------------------------------------------------------ */
class Entity {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.surfaceId = typeof Game!=="undefined"&&Game.state ? TerrainLayers.current(Game.state.map) : 0;
    this.radius = 0.36;
    this.dir = 4;                  // legacy 8-dir index (kept for baked-sprite path)
    this.visAng = Math.random() * Math.PI * 2;  // smoothed on-screen facing (radians)
    this.angT = this.visAng;                    // facing target
    this.stride = 0;               // accumulated ground distance -> walk phase (no skating)
    this.curSpeed = 0;             // tiles/sec actually moved last frame
    this.moving = false;
    this.animT = Math.random() * 10;
    this.action = null;            // {state:'attack'|'cast'|'kick'|'hit'|'death', t, dur, ...}
    this.dead = false;
    this.stunT = 0; this.slowT = 0; this.slowPct = 0;
    this.flashT = 0;               // white hit flash
    this.scale = 1;
  }
  face(tx, ty) {
    const sdx = U.isoX(tx, ty) - U.isoX(this.x, this.y);
    const sdy = U.isoY(tx, ty) - U.isoY(this.x, this.y);
    if (sdx || sdy) this.angT = Math.atan2(sdy, sdx);
    this.dir = U.dirFrom(sdx, sdy);
  }
  startAction(state, dur, data) {
    if(this.action?.dragnetPending||this.action?.veilPending)this.action.interrupted=true;
    this.action = Object.assign({ state, t: 0, dur }, data || {});
    if(typeof Act5EnemyAnimation!=='undefined')Act5EnemyAnimation.action(this);
    if(typeof Act1EnemyAnimation!=='undefined')Act1EnemyAnimation.action(this);
  }
  /* generic walk along this.path with collision against walls & entities */
  movementLocked() { return !!this.snarePull || (this.snareRootUntil || 0) > Game.state.time; }
  moveAlong(dt, speed, map, others) {
    if (this.movementLocked()) { this.moving=false; this.curSpeed=0; return; }
    if (!this.path || !this.path.length) { this.moving = false; this.curSpeed = 0; return; }
    const wp = this.path[0];
    if(wp.kind==='surface'){
      if(TerrainLayers.connectAt(map,this.x,this.y,this.surfaceId,wp.surfaceId,this.radius)){
        this.surfaceId=wp.surfaceId;this.path.shift();this._navStall=0;
      }else{this.path=null;this._navCache=null;}
      return;
    }
    const tx = wp.x + 0.5 !== wp.x ? (wp.cx !== undefined ? wp.cx : wp.x + 0.5) : wp.x;
    const ty = wp.cy !== undefined ? wp.cy : wp.y + 0.5;
    const d = U.dist(this.x, this.y, tx, ty);
    if (wp.kind === "hop" && typeof TerrainNavigation !== "undefined") {
      this.moving = false; this.curSpeed = 0;
      if (Game.state.time < Math.max(this.jumpCdUntil || 0, this._navRetryAt || 0)) return;
      const occupied = (others || []).some(o => o !== this && !o.dead && U.dist(tx, ty, o.x, o.y) < this.radius + o.radius);
      if (occupied || TerrainNavigation.transition(map, this.x, this.y, tx, ty, {hop: !!this.autoHop, radius: this.radius}) !== "hop") {
        this._navRetryAt = Game.state.time + .25;
        const goal = this._navGoal; this.path = null; this._navCache = null;
        if (goal) Game.repath(this, goal.x, goal.y);
        return;
      }
      this.face(tx, ty); this.path.shift();
      this.jumping = {fx: this.x, fy: this.y, tx, ty, t: 0, dur: TerrainNavigation.HOP_DURATION, automatic: true};
      this.jumpCdUntil = Game.state.time + TerrainNavigation.HOP_COOLDOWN;
      return;
    }
    if (d < (typeof TerrainNavigation !== "undefined" ? .001 : .18)) { this.path.shift(); return this.moveAlong(dt, speed, map, others); }
    this.moveToward(dt, speed, tx, ty, map, others);
    if (typeof TerrainNavigation !== "undefined") {
      this._navStall = this.curSpeed < .05 ? (this._navStall || 0) + dt : 0;
      if (this._navStall > .35 && this._navGoal) { this._navCache = null; this._navStall = 0; Game.repath(this, this._navGoal.x, this._navGoal.y); }
    }
  }
  // A local step shared by routes and held steering. Only moveAlong may repath.
  moveToward(dt, speed, tx, ty, map, others) {
    if (this.movementLocked()) { this.moving=false; this.curSpeed=0; return; }
    const d = U.dist(this.x, this.y, tx, ty);
    if (!Number.isFinite(d) || d < .001) { this.moving = false; this.curSpeed = 0; return; }
    if (this.slowT > 0) speed *= (1 - this.slowPct / 100);
    const step = Math.min(speed * dt, d);
    const ox = this.x, oy = this.y;
    let nx = this.x + (tx - this.x) / d * step;
    let ny = this.y + (ty - this.y) / d * step;
    /* entity separation (soft) */
    if (others) for (const o of others) {
      if (o === this || o.dead || !TerrainLayers.same(this,o)) continue;
      const od = U.dist(nx, ny, o.x, o.y), min = this.radius + o.radius;
      if (od < min && od > 0.001) {
        const push = (min - od) * 0.5;
        nx += (nx - o.x) / od * push; ny += (ny - o.y) / od * push;
      }
    }
    /* wall + cliff collision: test axis separately for sliding (canStep forbids climbing >1 height) */
    if (typeof TerrainNavigation !== "undefined") {
      const legal = (x, y) => TerrainNavigation.segment(map, this.x, this.y, x, y, this.radius,1,this.surfaceId);
      if (legal(nx, ny)) { this.x = nx; this.y = ny; }
      else { if (legal(nx, this.y)) this.x = nx; if (legal(this.x, ny)) this.y = ny; }
    } else {
      if (MapGen.canStep(map, this.x, this.y, nx, this.y)) this.x = nx;
      if (MapGen.canStep(map, this.x, this.y, this.x, ny)) this.y = ny;
    }
    /* drive walk-cycle phase from real ground distance covered */
    this.recordMovement(ox, oy, dt);
    this.face(tx, ty);
  }
  updateTraversal(dt) {
    const J = this.jumping; if (!J) return false;
    J.t += dt; const k = Math.min(1, J.t / J.dur);
    this.x = U.lerp(J.fx, J.tx, k); this.y = U.lerp(J.fy, J.ty, k);
    const map = Game.state.map;
    const lift = (x, y) => TerrainSurface.heightAt(map,x,y) * TerrainSurface.LIFT;
    this.jumpZ = Math.sin(k * Math.PI) * 42 + U.lerp(lift(J.fx, J.fy), lift(J.tx, J.ty), k) - lift(this.x, this.y);
    this.moving = true; this.curSpeed = 0;
    if (k >= 1) {
      this.jumpZ = 0; this.jumping = null; this.x = J.tx; this.y = J.ty;
      Game.dustPuff(this.x, this.y);
      if (Game.finishTraversal) Game.finishTraversal(this);
    }
    return true;
  }
  recordMovement(ox, oy, dt) {
    const moved = U.dist(ox, oy, this.x, this.y);
    this.stride += moved;
    this.curSpeed = dt > 0 ? moved / dt : 0;
    this.moving = moved > 0.00001;
  }
  /* Map hazards affect the player and grounded companions only. Combat fields
     and traps have their own targeting and still affect monsters. */
  tileHazardTick(dt, map, isPlayer) {
    if(map)map=TerrainLayers.view(map,this.surfaceId??0);
    if (this.groundImmune || !map || !map.hazard) return;   // Spirit Hawk etc. float above ground effects
    const code = map.hazard[(this.x | 0) + (this.y | 0) * map.w];
    if (!code) { this._inHaz = 0; return; }
    const h = DATA.HAZARDS[code]; if (!h) { this._inHaz = 0; return; }
    this._inHaz = code;
    if (h.slow) { this.slowT = Math.max(this.slowT, 0.28); this.slowPct = Math.max(this.slowPct, h.slow); }
    if (h.dps && !this.isBoss) {
      this.hazT = (this.hazT || 0) - dt;
      if (this.hazT <= 0) {
        this.hazT = 0.34;
        const chunk = h.dps * 0.34;
        if (isPlayer) this.takeDamage(chunk, null, h.elem || "phys");
        else this.takeDamage(chunk, Game.state.player, { environment: true }, h.elem || "phys");   // credit kills to the player
      }
    }
  }
  updateAnim(dt) {
    this.animT += dt;
    /* smooth facing toward target (shortest arc) */
    this.visAng = U.angLerp(this.visAng, this.angT, Math.min(1, dt * 11));
    if (this.flashT > 0) this.flashT -= dt;
    if (this.stunT > 0) this.stunT -= dt;
    if (this.slowT > 0) this.slowT -= dt;
    if (this.action) {
      this.action.t += dt;
      if (this.action.t >= this.action.dur) {
        if (this.action.state === "death") { this.action.t = this.action.dur; return; }
        this.action = null;
      }
    }
  }
  /* continuous-time pose for the live renderer: {state, t, ang, ex}.
     Reuses one cached object per entity (mutated in place) so the renderer doesn't
     allocate 2 objects per actor per frame — real GC-pressure relief in dense fights. */
  pose() {
    const o = this._pose || (this._pose = { state: "idle", t: 0, ang: 0, ex: {} });
    const ex = o.ex;
    if(this.spriteOpts?.bossArt&&typeof BossVFX!=='undefined'){
      ex.bossMotion=BossVFX.sampleActor(this,ex.bossMotion||(ex.bossMotion={}));
    }else ex.bossMotion=undefined;
    o.ang = this.visAng;
    ex.airborne = !!(this.jumping || this.leaping || this.jumpZ > 0);
    const a = this.action;
    if (a && (a.state === "death" || a.state === "attack" || a.state === "cast" || a.state === "kick" || a.state === "reach" || a.state === "search" || a.state === "hit")) {
      o.state = a.state; o.t = U.clamp(a.t / a.dur, 0, 1);
      ex.castColor = a.castColor; ex.walkPh = undefined; ex.speed = undefined;
    } else if (this.moving) {
      /* A full left/right cycle follows actual distance, including slows. */
      o.state = "walk"; o.t = 0;
      ex.walkPh = this.stride / (this.walkStride || 1.05) * Math.PI * 2; ex.speed = this.curSpeed; ex.castColor = undefined;
    } else {
      o.state = "idle"; o.t = this.animT;
      ex.castColor = undefined; ex.walkPh = undefined; ex.speed = undefined;
    }
    this.enemySkills?.renderPose(o);
    const imperial=this.imperialCombat?.active;
    if(imperial){
      o.state=['blink','bolt','fan'].includes(imperial.kind)?'cast':'attack';
      o.t=imperial.stage==='windup'?.5*(1-imperial.remaining/imperial.windup):imperial.stage==='travel'?.5:.5+.5*(1-imperial.remaining/imperial.recovery);
      ex.castColor=this.imperialCombat.profile.projectileColor;ex.walkPh=undefined;
    }
    if(typeof Act2EnemyAnimation!=='undefined')Act2EnemyAnimation.sample(this,o);
    if(typeof Act3EnemyAnimation!=='undefined')Act3EnemyAnimation.sample(this,o);
    if(typeof Act5EnemyAnimation!=='undefined')Act5EnemyAnimation.sample(this,o);
    if(typeof Act4EnemyAnimation!=='undefined')Act4EnemyAnimation.sample(this,o);
    if(typeof Act1EnemyAnimation!=='undefined')Act1EnemyAnimation.sample(this,o);
    return o;
  }
}

/* ------------------------------------------------------------------ */
class Player extends Entity {
  constructor(name, classId) {
    super(0, 0);
    this.autoHop = true;
    this.walkStride = 2.4;         // ~3.8 footfalls/sec at ordinary player speed
    const cls = DATA.CLASSES[classId];
    this.name = name; this.classId = classId; this.cls = cls;
    this.lvl = 1; this.xp = 0;
    this.attr = Object.assign({}, cls.baseStats);
    this.attrPts = 0; this.skillPts = 1;
    this.skills = {};                       // id -> rank
    this.skillPerks = {};                   // skill id -> invested-rank milestone -> perk id
    this._skillEpoch = 0;                   // cancels outstanding skill releases on reset
    this.gold = 50;
    this.inv = Items.makeGrid(10, 4);
    this.stash = Items.makeGrid(10, 6);
    this.equip = {};                        // slotName -> item
    this.belt = [null, null, null, null];   // {id, count}
    this.buffs = [];
    this.skillL = "basic"; this.skillR = "basic";
    this.quickSlots = [null, null, null, null];   // F1–F4 player-assigned skills
    this.healPool = 0; this.manaPool = 0;   // gradual potion restore
    this.command = null;                    // current intent
    this.attackTimer = 0;
    this.radius = 0.36;
    this.hardcore = false;
    this.deaths = 0;
    this.stepT = 0;
    /* bespoke per-class transient resources/states (never serialized) */
    this.tempo = 0; this.tempoUntil = 0;     // Vanguard combo resource
    this.staticChg = 0;                       // Ember Witch Tempest charge
    this.stance = null; this.riposteData = null; this.rootT = 0; this.parryCdUntil = 0;
    this.boneWard = null;                     // Gravebinder absorb shield
    this.coat = null;                         // Veil Ranger weapon coat
    this.drawing = null;                      // Veil Ranger charge-shot draw
    this.siphon = null;                       // Gravebinder channel
    this.charging = null;                     // Vanguard charge motion
    this.skillCd = {};                        // per-skill cooldown gate (state.time)
    this.computeStats();
    this.hp = this.stats.maxHp; this.mana = this.stats.maxMana;
  }

  pose() { return this._animationController?.frame || super.pose(); }
  startAction(state,dur,data) {
    super.startAction(state,dur,data);
    if(!Object.hasOwn(this,'_visualActionSequence'))Object.defineProperty(this,'_visualActionSequence',{value:0,writable:true});
    this.action.visual={id:++this._visualActionSequence,style:this._visualSkill||null,skillId:this._castingSkillId||null,startedAt:typeof Game!=='undefined'?Game.state?.time:undefined,releases:[]};
    if(['kick','reach','search'].includes(state))this.action.visual.releases=[.5];
  }
  markActionRelease(seconds=0) {
    const a=this.action;if(!a?.visual||!['attack','cast','kick'].includes(a.state))return;
    const phase=seconds/a.dur;if(phase<0||phase>1)return;
    if(!a.visual.releases.includes(phase))a.visual.releases.push(phase);
    a.visual.releases.sort((a,b)=>a-b);
  }
  afterActionDelay(seconds,callback) {
    // Only synchronous skill scheduling authors markers. Delayed world effects
    // must not accidentally attach themselves to a later player action.
    if(this._visualSkill)this.markActionRelease(seconds);
    if(typeof SkillAudio!=='undefined')SkillAudio.markRelease(this);
    const visualSource=this._castingSkillId;
    const weaponEpoch=this._weaponSkillEpoch || 0;
    this.afterSkillDelay(seconds,()=>{
      if (DATA.SKILLS[visualSource]?.requiredWeapons &&
          (weaponEpoch !== (this._weaponSkillEpoch || 0) || !this.canUseSkillWeapon(visualSource))) return;
      if(typeof SkillAudio!=='undefined')SkillAudio.release(this,visualSource);
      if(!this.dead&&typeof SkillVFX!=='undefined')SkillVFX.release(this,visualSource);
      const result=callback();
      if (["summon","summon_golem"].includes(DATA.SKILLS[visualSource]?.type)) this.checkAetherDepletion();
      return result;
    });
  }
  afterSkillDelay(seconds,callback) {
    const epoch=this._skillEpoch, source=this._castingSkillId||(typeof SkillAudio!=='undefined'?SkillAudio.current?.id:null);
    Game.afterDelay(seconds,()=>{if(epoch===this._skillEpoch)this.withSkillSource(source,callback);});
  }
  withSkillSource(source,callback,emitter=this) {
    const previous=this._castingSkillId, before=new Set(this.buffs);
    const world=typeof Game!=="undefined"?Game.state:null, effectsBefore=new Set(world?.fx||[]);
    const motions=["siphon","charging","leaping","spinning","dashing","drawing"], motionBefore=motions.map(k=>this[k]);
    this._castingSkillId=source;
    const run=()=>typeof SkillVFX!=='undefined'?SkillVFX.scope(this,source,callback):callback();
    try{return typeof SkillAudio!=='undefined'?SkillAudio.scope(source,{owner:this,emitter},run):run();}finally{
      if(source)for(const b of this.buffs)if(!before.has(b)&&!b.sourceSkill)b.sourceSkill=source;
      if(source&&world)for(const f of world.fx||[])if(!effectsBefore.has(f)){f.sourceSkill ||= source;f.owner ||= this;}
      if(source)motions.forEach((key,i)=>{if(this[key]&&this[key]!==motionBefore[i])this[key].sourceSkill ||= source;});
      this._castingSkillId=previous;
    }
  }
  resolveSkill(id) {
    const skill = typeof SkillPerks!=="undefined" ? SkillPerks.resolve(this,id) : id==="basic" ? DATA.BASIC_ATTACK : DATA.SKILLS[id];
    return typeof UniquePowers !== "undefined" ? UniquePowers.modifySkill(this,skill) : skill;
  }
  canUseSkillWeapon(id) {
    const required=DATA.SKILLS[id]?.requiredWeapons;
    return !required || required.includes(this.equip.main?.cat);
  }
  rejectSkillWeapon(id) {
    if (this.canUseSkillWeapon(id)) return false;
    this.command=null; this.path=null; this.moving=false;
    if ((this._weaponErrorUntil || 0) <= Game.state.time) {
      Game.msg("Requires a bow or crossbow.", "#d8b880"); Sfx.play("error");
      this._weaponErrorUntil=Game.state.time+1;
    }
    return true;
  }
  maintainedCompanions() {
    return (typeof Game !== "undefined" && Game.state?.minions || []).filter(m =>
      !m.dead && m.owner === this && ["summon", "summon_golem"].includes(DATA.SKILLS[m.sourceSkill]?.type));
  }
  companionUpkeep() {
    return this.maintainedCompanions().reduce((sum,m) => sum + this.resolveSkill(m.sourceSkill).upkeep(this.effRank(m.sourceSkill)),0);
  }
  summonAuraStatsFor(target) {
    const stats = {};
    if (this.dead || target.dead) return stats;
    for (const m of (typeof Game !== "undefined" && Game.state?.minions || [])) {
      if (m.dead || m.owner !== this || !m.auraRadius || !TerrainLayers.same(m,target) || U.dist2(m.x,m.y,target.x,target.y) > m.auraRadius ** 2) continue;
      // Multiple Ents extend coverage; the same aura never multiplies itself.
      for (const [key,value] of Object.entries(m.auraStats || {})) stats[key] = Math.max(stats[key] || 0,value);
    }
    return stats;
  }
  syncSummonAuras() {
    const key = JSON.stringify(this.summonAuraStatsFor(this));
    if (key !== this._summonAuraKey) { this._summonAuraKey = key; this.computeStats(); }
  }
  checkAetherDepletion() {
    if (this.mana > 0) return;
    this.mana=0;
    for (const m of this.maintainedCompanions()) m.die();
  }
  spendAether(amount) {
    this.mana=Math.max(0,this.mana-amount);
    this.checkAetherDepletion();
  }
  skillSound(phase,context={}) {
    const id=(typeof SkillAudio!=='undefined'?SkillAudio.current?.id:null)||this._castingSkillId||'basic';
    const emitter=(typeof SkillAudio!=='undefined'?SkillAudio.current?.emitter:null)||this;
    return Sfx.playSkill?.(id,phase,{owner:this,emitter,...context});
  }
  skillTargetRange(id,target) {
    const sk=this.resolveSkill(id),rk=id==="basic"?1:Math.max(1,this.effRank(id));
    for(const field of ["castRange","grappleRange","blinkRange","leapRange","chargeRange","throwRange"])if(sk?.[field])return sk[field](rk);
    if(["combo_finish","bash","shockwave","afterimage","dusk_cleave"].includes(sk?.type)&&sk.range)return sk.range(rk);
    if(["spellnova","freezenova","fear","shout","warshout_debuff","overloadnuke"].includes(sk?.type)&&sk.radius)return Math.max(1.2,sk.radius(rk)-.3);
    return null;
  }
  chooseSkillPerk(id,tier,perkId) {
    return typeof SkillPerks!=="undefined" && SkillPerks.choose(this,id,tier,perkId);
  }
  applySkillPerkBuff(sk,rk) {
    if(!sk?.castStats)return;
    const stats=sk.castStats(rk); if(!Object.keys(stats).length)return;
    const id="perk_"+sk.id;
    this.buffs=this.buffs.filter(b=>b.id!==id);
    this.buffs.push({id,label:sk.name,stats,until:Game.state.time+sk.castBuffDuration(rk),sourceSkill:sk.id});
    this.computeStats(); UI.refreshBuffs?.();
  }
  clearSkillState({respec=true}={}) {
    this.clearVeilState();
    if(!(typeof Coop!=='undefined'&&Coop.active)){
      if(typeof SkillAudio!=='undefined')SkillAudio.reset();
      if(typeof SkillVFX!=='undefined')SkillVFX.reset();
    }
    this._skillEpoch++; this._perkCache=null;if(respec)this.skillPerks={};
    this.buffs=this.buffs.filter(b=>!b.sourceSkill && !/^(stance_|form_|perk_)/.test(b.id||"") && !["soul_charge","banner_aura","smoke_evasion"].includes(b.id));
    this.form=null; this.stance=null; this.riposteData=null; this.rootT=0;
    this.boneWard=null; this.coat=null; this.retalCold=null;
    if(this.leaping)this.jumpZ=0;
    this.drawing=null; this.siphon=null; this.charging=null; this.leaping=null;
    this.spinning=null; this.dashing=null; this.action=null; this.command=null;
    this.tempo=0; this.tempoUntil=0; this.staticChg=0; this.skillCd={};
  }
  visualReaction(kind,source) {
    const target=source&&Number.isFinite(source.x)?Math.atan2(U.isoY(source.x,source.y)-U.isoY(this.x,this.y),U.isoX(source.x,source.y)-U.isoX(this.x,this.y)):this.visAng;
    const value={kind,direction:target-this.visAng};
    if(!Object.hasOwn(this,'_visualReaction'))Object.defineProperty(this,'_visualReaction',{value,writable:true});
    else this._visualReaction=value;
  }

  /* ---------------- stats ---------------- */
  gearStats() {
    const sum = {};
    const add = (k, v) => { sum[k] = (sum[k] || 0) + v; };
    for (const slot of Items.EQUIP_SLOTS) {
      const it = this.equip[slot];
      if (!it) continue;
      const lvl = this.lvl || 1;
      const aval = a => a.perLevel ? a.val * lvl : a.val;   /* per-character-level affixes scale */
      if (it.armor) {
        let pct = 0, flat = 0;
        for (const a of it.affixes) { if (a.stat === "armorPct") pct += aval(a); if (a.stat === "armor") flat += aval(a); }
        add("armor", Math.floor(it.armor * (1 + pct / 100)) + flat);
      }
      if (it.block) add("block", it.block);
      for (const a of it.affixes) {
        if (it.armor && (a.stat === "armorPct" || a.stat === "armor")) continue;
        if (a.stat === "dmgPct" || a.stat === "dmgFlat") {
          if (slot === "main") continue; /* folded into weaponDamage */
        }
        add(a.stat, aval(a));
      }
      /* socketed glyphs (side-dependent) and jewels (rolled affixes, either side) */
      if (it.sockets) {
        const side = slot === "main" ? "wpn" : "arm";
        for (const gid of it.sockets) {
          if (!gid) continue;
          if (typeof gid === "object" && gid.jewel) { for (const a of (gid.affixes || [])) add(a.stat, a.perLevel ? a.val * lvl : a.val); continue; }
          const g = DATA.GLYPHS[gid];
          if (g) for (const [k, v] of Object.entries(g[side])) add(k, v);
        }
        /* named combination bonus on top */
        if (it.combo) {
          const c = DATA.GLYPH_COMBOS.find(x => x.id === it.combo);
          if (c) for (const [k, v] of Object.entries(c.stats)) add(k, v);
        }
      }
    }
    /* charms carried in the pack (NOT the stash) grant their affixes passively */
    if (this.inv && this.inv.items) {
      const lvl = this.lvl || 1;
      for (const it of this.inv.items) {
        if (it.kind !== "charm" || !it.affixes) continue;
        for (const a of it.affixes) add(a.stat, a.perLevel ? a.val * lvl : a.val);
      }
    }
    /* set bonuses: thresholds met by worn piece count */
    const setCounts = {};
    for (const slot of Items.EQUIP_SLOTS) {
      const it = this.equip[slot];
      if (it && it.setId) setCounts[it.setId] = (setCounts[it.setId] || 0) + 1;
    }
    for (const [sid, n] of Object.entries(setCounts)) {
      const set = DATA.SETS[sid];
      if (!set) continue;
      for (const [thresh, bonus] of Object.entries(set.bonuses)) {
        if (n >= +thresh) for (const [k, v] of Object.entries(bonus)) add(k, v);
      }
    }
    return sum;
  }
  passiveStats() {
    const sum = {};
    const add = (k, v) => { sum[k] = (sum[k] || 0) + v; };
    for (const [id, rk] of Object.entries(this.skills)) {
      const sk = this.resolveSkill(id);
      if (sk && sk.type === "passive" && rk > 0) {
        const eff = this.effRank(id);
        for (const [k, v] of Object.entries(sk.pStats(eff))) add(k, v);
      }
    }
    return sum;
  }
  computeStats() {
    if (typeof UniquePowers !== "undefined") UniquePowers.sync(this);
    const g = this.gearStats();
    // Passive effective ranks must see the current loadout on the first recompute.
    this._computingGear=g;
    const p = this.passiveStats();
    this._computingGear=null;
    const b = this.summonAuraStatsFor(this);
    this._summonAuraKey = JSON.stringify(b);
    for (const buff of this.buffs) for (const [k, v] of Object.entries(buff.stats)) b[k] = (b[k] || 0) + v;
    const S = k => (g[k] || 0) + (p[k] || 0) + (b[k] || 0);
    const attr = {
      str: this.attr.str + S("str"), dex: this.attr.dex + S("dex"),
      vit: this.attr.vit + S("vit"), wil: this.attr.wil + S("wil"),
    };
    const st = { attr };
    st.skillAll = S("skillAll");
    /* chance-to-cast procs carried on equipped gear (read by strike/takeDamage) */
    st.procs = [];
    for (const slot of Items.EQUIP_SLOTS) { const it = this.equip[slot]; if (it && it.procs) for (const p of it.procs) st.procs.push(p); }
    /* +to class / +to tree skill bonuses (read by effRank) */
    for (const cId in DATA.CLASSES) {
      const sc = S("skillClass_" + cId); if (sc) st["skillClass_" + cId] = sc;
      (DATA.CLASSES[cId].trees || []).forEach((tn, ti) => {
        const stb = S("skillTree_" + cId + "_" + ti); if (stb) st["skillTree_" + cId + "_" + ti] = stb;
      });
    }
    st.maxHp = Math.floor((this.cls.baseHp + attr.vit * 4 + (this.lvl - 1) * 6 + S("hp")) * (1 + S("hpPct") / 100));
    st.maxMana = Math.floor(this.cls.baseMana + attr.wil * 3 + (this.lvl - 1) * 2 + S("mana"));
    st.dmgPct = attr.str + S("dmgPct");
    st.ar = Math.floor((3 * (40 + attr.dex * 5 + (this.lvl - 1) * 8) + S("ar")) * (1 + S("arPct") / 100));
    st.armor = Math.floor((S("armor") + attr.dex * 0.25) * (1 + S("armorPct") / 100));
    st.block = this.equip.off && this.equip.off.block ? Math.min(60, S("block") + Math.floor(attr.dex * 0.1)) : 0;
    st.critChance = Math.min(75, 5 + attr.dex * 0.08 + S("critChance"));
    st.critDmg = 150 + S("critDmg");
    st.ias = S("ias"); st.fcr = S("fcr"); st.frw = S("frw");
    st.moveSpeed = 4.6 * (1 + st.frw / 100);
    st.castRate = 1.5 * (1 + st.fcr / 100);
    st.spellPct = S("spellPct");
    st.minionDmgPct = S("minionDmgPct"); st.minionHpPct = S("minionHpPct");
    st.minionPoison = S("minionPoison");
    st.lifeOnDeath = S("lifeOnDeath");
    st.dodge = Math.min(60, S("dodge"));
    st.trapPct = S("trapPct");
    st.thorns = S("thorns");
    st.lifeSteal = S("lifeSteal");
    st.manaSteal = S("manaSteal");
    /* D2-style affix mechanics */
    st.lifeRegen = S("lifeRegen");
    st.manaAfterKill = S("manaAfterKill");
    st.dmgToMana = Math.min(100, S("dmgToMana"));
    st.dmgReduceFlat = S("dmgReduceFlat");
    st.magicReduceFlat = S("magicReduceFlat");
    st.dmgDemon = S("dmgDemon");
    st.arUndead = S("arUndead");
    st.arDemon = S("arDemon");
    st.knockback = S("knockback") > 0;
    st.monsterFlee = S("monsterFlee");
    st.preventHeal = S("preventHeal") > 0;
    st.manaRegen = 1.0 + st.maxMana * 0.01 * (1 + S("manaRegen") / 100);
    st.mf = S("mf"); st.goldFind = S("goldFind");
    st.lightRadius = S("lightRadius");      // Thunderstorm widens the hero's light
    st.dmgUndead = S("dmgUndead");
    st.ccReduce = Math.min(80, S("ccReduce"));
    st.resFire = Math.min(75, S("resFire") + S("resAll"));
    st.resCold = Math.min(75, S("resCold") + S("resAll"));
    st.resLight = Math.min(75, S("resLight") + S("resAll"));
    st.resPoison = Math.min(75, S("resPoison") + S("resAll"));
    st.elem = { fire: S("fireDmg"), cold: S("coldDmg"), light: S("lightDmg"), poison: S("poisonDmg") };
    st.elementPct = Object.fromEntries(Object.keys(DATA.DAMAGE_ELEMENTS).map(e => [e, S(e + "DmgPct")]));
    /* bespoke per-class stat hooks, summed from passives / buffs / stances */
    for (const k of ["tempoCapBonus", "tempoWindowBonus", "dmgPerTempo", "shoutDurPct", "uninterruptible",
      "momentumDmgPct", "mobilityCdr", "scorchPct", "scorchSpread", "shatterRank", "coldVsFrozenPct",
      "minionThorns", "curseDurPct", "curseRadiusPct", "curseSpread", "poisonDotPct", "plagueSpreadPct",
      "corpseChance", "overhealCap", "soulCharge", "projRange", "trapCap", "armSpeed", "pShare",
      "pManaPerBeast", "totemRate", "totemTtl", "earthRadius", "shiftStun", "shiftRadius", "extendPerEnemy",
      "primalProc", "dmgToFire", "totemPower", "totemCapacity", "bleedDps", "snareConditionPct",
      "dmgTakenPct", "dmgReducePct", "immovable"]) st[k] = S(k);
    /* Bulwark stance hardens the longer you hold ground */
    if (this.stance === "bulwark" && this.rootT > 0) st.armor = Math.floor(st.armor * (1 + Math.min(this.rootT, 3) / 3 * (this.bulwarkArmor || 0.3)));
    const wpn = this.equip.main;
    st.weaponSpeed = wpn && wpn.speed ? wpn.speed : 1.2;
    st.attackRate = 1.35 * st.weaponSpeed * (1 + st.ias / 100);
    st.range = 1.05 + (wpn && wpn.reach ? wpn.reach : 0);
    st.ranged = !!(wpn && wpn.ranged);
    this.stats = st;
    this.hp = Math.min(this.hp ?? st.maxHp, st.maxHp);
    this.mana = Math.min(this.mana ?? st.maxMana, st.maxMana);
    this.checkAetherDepletion();
    const weaponAllowed=["bow","crossbow"].includes(this.equip.main?.cat);
    if (!weaponAllowed && this._hadArrowWeapon) {
      this._weaponSkillEpoch=(this._weaponSkillEpoch || 0)+1;
      if (this.drawing || DATA.SKILLS[this.action?.visual?.skillId]?.requiredWeapons) this.action=null;
      this.drawing=null;
      if (this.command?.skill && !this.canUseSkillWeapon(this.command.skill)) { this.command=null; this.path=null; }
    }
    this._hadArrowWeapon=weaponAllowed;
  }
  effRank(id) {
    const rk = this.skills[id] || 0;
    if (rk <= 0) return 0;
    const st = this._computingGear || this.stats; if (!st) return rk;
    let bonus = st.skillAll || 0;
    const sk = DATA.SKILLS[id];
    if (sk) {                                   // +to class / +to tree skills (only learned skills benefit)
      bonus += st["skillClass_" + sk.cls] || 0;
      bonus += st["skillTree_" + sk.cls + "_" + sk.tree] || 0;
    }
    if (typeof UniquePowers !== "undefined") bonus += UniquePowers.rankBonus(this, id);
    return rk + bonus;
  }
  weaponDamage() {
    const wpn = this.equip.main;
    let lo = 1, hi = 3;
    if (wpn && wpn.dmg) {
      lo = wpn.dmg[0]; hi = wpn.dmg[1];
      const lvl = this.lvl || 1;
      let pct = 0, flat = 0, loFlat = 0, hiFlat = 0;
      for (const a of wpn.affixes) {
        const v = a.perLevel ? a.val * lvl : a.val;
        if (a.stat === "dmgPct") pct += v;
        else if (a.stat === "dmgFlat") flat += v;
        else if (a.stat === "minDmg") loFlat += v;
        else if (a.stat === "maxDmg") hiFlat += v;
      }
      lo = Math.floor(lo * (1 + pct / 100)) + flat + loFlat;
      hi = Math.floor(hi * (1 + pct / 100)) + flat + hiFlat;
      if (hi < lo) hi = lo;
    }
    return [lo, hi];
  }

  /* synergy bonus: +pct per rank of linked skills */
  synergyMult(sk) {
    if (!sk.synergy) return 1;
    let m = 1;
    for (const [id, per] of Object.entries(sk.synergy)) m += (this.skills[id] || 0) * per;
    return m;
  }

  applyHuntBleed(mon, actual) {
    if (!(actual > 0) || mon.dead || !(this.stats.bleedDps > 0)) return;
    mon.bleedDot = { dps: Math.max(mon.bleedDot?.dps || 0, this.stats.bleedDps), t: 3, owner: this };
  }
  snareDamageScale(sk) {
    return this.synergyMult(sk) * (1 + (this.stats.trapPct || 0) / 100) * (1 + this.stats.attr.dex / 140);
  }
  snareDamageMult(mon) {
    const count = Number(mon.slowT > 0 && mon.slowPct > 0) + Number(mon.snareRootUntil > Game.state.time) + Number(mon.bleedDot?.t > 0 && mon.bleedDot.dps > 0);
    return 1 + count * (this.stats.snareConditionPct || 0) / 100;
  }
  snareHit(mon, damage) {
    const actual = mon.takeDamage(damage * this.snareDamageMult(mon), this, { sourceSkill: this._castingSkillId || "basic" }, "phys");
    this.applyHuntBleed(mon, actual);
    return actual;
  }

  clearVeilState() {
    this._veilEpoch=(this._veilEpoch||0)+1;
    this.shadowAmbushUntil=0;
    this.buffs=this.buffs.filter(b=>b.id!=="shadow_ambush");
    if(this.action?.veilPending)this.action.interrupted=true;
    for(const mon of Game.state?.monsters||[])mon.veilExposedUntil=0;
  }
  veilHit(mon, cast) {
    if(mon.dead)return 0;
    const {sk,rk}=cast,mark=mon.killMark;
    let directMult=cast.ambush?1.25:1;
    if(mon.veilExposedUntil>Game.state.time)directMult*=1+(sk.exposedBonus?.(rk)||0)/100;
    if(sk.missingHpBonus)directMult*=1+sk.missingHpBonus(rk)*U.clamp(1-mon.hp/mon.maxHp,0,1);
    const actual=this.strike(mon,cast.mult,{auto:true,directMult});
    if(actual>0){
      if(sk.exposeDuration&&!mon.dead)mon.veilExposedUntil=Game.state.time+sk.exposeDuration(rk);
      // A lethal strike already detonates its mark through Monster.die.
      if(sk.type==="deathblow"&&mark?.until>Game.state.time&&mon.killMark===mark)Game.detonateMark(mon);
    }
    return actual;
  }
  performVeilAttack(sk,rk,target,point) {
    const world=Game.state,map=world.map,surface=this.surfaceId??0,id=sk.id;
    if(this.dead||this.stunT>0||(this.skillCd[id]||0)>world.time)return false;
    let aim=point||target;if(!aim||!Number.isFinite(aim.x)||!Number.isFinite(aim.y))return false;
    if((aim.surfaceId??surface)!==surface||target&&(target.dead||!TerrainLayers.same(this,target)))return false;
    const range=sk.castRange?.(rk)||sk.range(rk);
    let dist=U.dist(this.x,this.y,aim.x,aim.y);
    if(dist<.001&&sk.type==="dusk_cleave"){
      const [dx,dy]=U.screenVecToWorld(this.visAng);aim={x:this.x+dx*range,y:this.y+dy*range};dist=U.dist(this.x,this.y,aim.x,aim.y);
    }
    if(dist<.001&&sk.type!=="shadow_flurry")return false;
    const k=Math.min(1,range/dist);aim={x:this.x+(aim.x-this.x)*k,y:this.y+(aim.y-this.y)*k};
    const clear=(a,b)=>U.los((x,y)=>MapGen.walkable(map,x,y,surface),a.x,a.y,b.x,b.y);
    if(!MapGen.walkable(map,aim.x,aim.y,surface)||!clear(this,aim))return false;
    this.pay(sk,rk);if(sk.cd)this.skillCd[id]=world.time+sk.cd(rk);
    const cycle=(sk.attackCycle?.(rk)||1)/this.stats.attackRate,flurry=sk.type==="shadow_flurry",count=flurry?sk.count(rk):1;
    const first=flurry?.35:.45,last=first+(count-1)*.15,total=flurry?last+.2:1;
    this.face(aim.x,aim.y);this.startAction("attack",cycle*total);
    const action=this.action,epoch=this._skillEpoch,cast={sk,rk,mult:sk.dmgMult(rk)*this.synergyMult(sk),ambush:false,epoch:this._veilEpoch||0};
    action.veilPending=true;
    if(typeof SkillAudio!=="undefined")SkillAudio.markRelease(this);
    const visited=new Set();let ended=false;
    for(let i=0;i<count;i++){
      const release=(first+i*.15)*cycle;this.markActionRelease(release);
      this.afterSkillDelay(release,()=>{
        if(ended||this.dead||action.interrupted||this.stunT>0||Game.state!==world||world.map!==map||(this.surfaceId??0)!==surface||this._skillEpoch!==epoch||this.action&&this.action!==action){ended=true;return;}
        let victim=null;
        if(flurry){
          const eligible=world.monsters.filter(m=>!m.dead&&TerrainLayers.same(this,m)&&U.dist(aim.x,aim.y,m.x,m.y)<=sk.radius(rk)+m.radius&&U.dist(this.x,this.y,m.x,m.y)<=range+m.radius&&clear(this,m));
          if(!eligible.length){ended=true;action.veilPending=false;action.dur=Math.min(action.dur,(action.t||0)+cycle*.2);return;}
          if(eligible.every(m=>visited.has(m)))visited.clear();
          const available=eligible.filter(m=>!visited.has(m));
          victim=i===0&&available.includes(target)?target:available.sort((a,b)=>U.dist2(aim.x,aim.y,a.x,a.y)-U.dist2(aim.x,aim.y,b.x,b.y))[0];
          visited.add(victim);
        }
        if(i===0){cast.ambush=this.shadowAmbushUntil>world.time;if(cast.ambush){this.shadowAmbushUntil=0;this.buffs=this.buffs.filter(b=>b.id!=="shadow_ambush");}}
        this.skillSound('release');
        if(typeof SkillVFX!=="undefined")SkillVFX.release(this,id);
        if(flurry){
          if(typeof SkillVFX!=="undefined")SkillVFX.beam(this.x,this.y,victim.x,victim.y,SkillVFX.recipes[id],{dur:.18,surfaceId:surface,veilBlade:true});
          this.veilHit(victim,cast);
        }else if(sk.type==="dusk_cleave"){
          const angle=Math.atan2(aim.y-this.y,aim.x-this.x);
          for(const m of world.monsters){
            if(m.dead||!TerrainLayers.same(this,m)||U.dist(this.x,this.y,m.x,m.y)>range+m.radius||!clear(this,m))continue;
            const delta=Math.atan2(Math.sin(Math.atan2(m.y-this.y,m.x-this.x)-angle),Math.cos(Math.atan2(m.y-this.y,m.x-this.x)-angle));
            if(Math.abs(delta)<=sk.arc(rk)/2)this.veilHit(m,cast);
          }
        }else Game.spawnProjectile({x:this.x,y:this.y,tx:aim.x,ty:aim.y,surfaceId:surface,speed:16,kind:"veilblade",fromPlayer:true,sourceSkill:id,visualOwner:this,veilCast:cast,maxRange:range,skillEpoch:epoch});
        if(i===count-1)action.veilPending=false;
      });
    }
    return true;
  }

  // These snapshots store outgoing elemental amplification once. Spreads copy the
  // stored amount; companions deliberately do not use this player-only path.
  applyPoison(mon, dps, duration, opts = {}) {
    const elem = opts.fire ? "fire" : "poison";
    const scaled = opts.scaled ? dps : DATA.scaleElement(this, dps, elem);
    const old = mon.poisonDot;
    const keep = opts.strongest && old && old.dps > scaled && !!old.fire === !!opts.fire;
    mon.poisonDot = keep ? { ...old, t: duration } : {
      dps: scaled, t: duration, ...(opts.fire ? { fire: true } : {}), owner: this,
      sourceSkill: this._castingSkillId || "basic", elementScaled: true
    };
    return mon.poisonDot;
  }
  applyPlague(mon, effect, scaled = false) {
    mon.plague = { ...effect, tick: scaled ? effect.tick : DATA.scaleElement(this, effect.tick, "poison"),
      owner: this, sourceSkill: this._castingSkillId || "gravebinder_2_1", elementScaled: true };
  }

  /* ---------------- spells ---------------- */
  /* rolled spell damage: rank range scaled by Willpower, +spell%, synergies, crits */
  spellRoll(sk, rk) {
    const [lo, hi] = sk.dmg(rk);
    let dmg = U.rf(lo, hi) * (1 + this.stats.attr.wil / 110) * (1 + this.stats.spellPct / 100) * this.synergyMult(sk);
    let crit = false;
    if (Math.random() * 100 < this.stats.critChance) { dmg *= this.stats.critDmg / 100; crit = true; }
    return { dmg, crit };
  }
  spellHit(mon, dmg, elem, opts) {
    opts = opts || {};
    if (mon.dead) return;
    if (this.stats && this.stats.dmgToFire > 0 && elem !== "fire") { elem = "fire"; opts = Object.assign({ burn: opts.burn || 1 }, opts); }   // Fire Claw converts all damage
    const col = { fire: "#ff9040", cold: "#9fd8ff", light: "#fff080", poison: "#90ff70", shadow: "#c080e0", earth: "#c0a060" }[elem] || "#ffffff";
    /* Brittle Bones: cold strikes hit frozen foes harder */
    if (elem === "cold" && mon.frozen && Game.state.time < mon.frozen) dmg *= 1 + (this.stats.coldVsFrozenPct || 0) / 100;
    if (!opts.elementScaled) dmg = DATA.scaleElement(this, dmg, elem);
    if (typeof UniquePowers !== "undefined") dmg = UniquePowers.empower(this,"spell",dmg,mon);
    const elementBaseRatios = opts.elementBaseRatios || { [elem]: 1 / DATA.elementMultiplier(this, elem) };
    const actual = mon.takeDamage(dmg, this, { uniqueEvent: "spell", crit: !!opts.crit, elem, elementScaled: true, elementBaseRatios, sourceSkill: this._castingSkillId || opts.sourceSkill || "basic" }, elem);
    this.applyHuntBleed(mon, actual);
    this.skillSound('impact',{elem,target:mon,crit:!!opts.crit});
    if(typeof SkillAudio!=='undefined'&&elem==='cold'&&mon.frozen)SkillAudio.passive(this,'frozen',{target:mon,elem});
    if(typeof SkillVFX!=='undefined')SkillVFX.hit(this,mon,elem,!!opts.crit);
    if (opts.crit) Game.fx.hitPause = Math.max(Game.fx.hitPause, 0.05);
    if (elem === "fire") {
      if (opts.burn) this.applyPoison(mon, opts.burn, 2, { fire: true });
      if (opts.scorch) { const sc = mon.scorch || { stacks: 0 }; sc.stacks = Math.min(5, sc.stacks + 1); sc.dps = DATA.scaleElement(this, opts.scorch * sc.stacks * (1 + (this.stats.scorchPct || 0) / 100), "fire"); sc.owner = this; sc.sourceSkill = this._castingSkillId; sc.until = Game.state.time + 3; mon.scorch = sc; }
      for (let i = 0; i < 5; i++) Game.addParticle(mon.x, mon.y, "#ff9040");
    } else if (elem === "cold") {
      mon.applySlow(opts.chill || 2, 40);
      for (let i = 0; i < 4; i++) Game.addParticle(mon.x, mon.y, "#9fd8ff");
    } else if (elem === "light") {
      for (let i = 0; i < 4; i++) Game.addParticle(mon.x, mon.y, "#fff080");
    } else if (elem === "poison") {
      if (opts.pdot) this.applyPoison(mon, opts.pdot / 3, 3);
      for (let i = 0; i < 4; i++) Game.addParticle(mon.x, mon.y, "#90ff70");
    } else if (elem === "shadow") {
      for (let i = 0; i < 4; i++) Game.addParticle(mon.x, mon.y, "#c080e0");
    }
    if (opts.drain) this.healLife(actual * opts.drain);
    Game.addFloat(mon.x, mon.y, Math.floor(dmg), opts.crit ? "#ffb030" : col, opts.crit);
  }
  /* shared cast wind-up: returns cast duration and plays the cast pose */
  beginCast(sk, aim) {
    const dur = 1 / this.stats.castRate;
    if (aim) this.face(aim.x, aim.y);
    this.startAction("cast", dur, { castColor: { fire: "#ffb060", cold: "#9fd8ff", light: "#fff080", poison: "#90ff70", shadow: "#c080e0", earth: "#c0a060" }[sk.elem] || "#c0a0ff" });
    return dur;
  }

  /* ---------------- combat ---------------- */
  rollDamage(mult, mon) {
    const vsUndead = mon === true || (mon && mon.type === "undead");
    const vsDemon = mon && mon.type === "demon";
    const [lo, hi] = this.weaponDamage();
    let phys = U.rf(lo, hi) * (1 + this.stats.dmgPct / 100) * mult;
    if (vsUndead) phys *= 1 + this.stats.dmgUndead / 100;
    if (vsDemon) phys *= 1 + (this.stats.dmgDemon || 0) / 100;
    let crit = false;
    if (Math.random() * 100 < this.stats.critChance) { phys *= this.stats.critDmg / 100; crit = true; }
    const e = this.stats.elem;
    return {
      phys, crit,
      fire: e.fire ? U.rf(e.fire * 0.6, e.fire) : 0,
      cold: e.cold ? U.rf(e.cold * 0.6, e.cold) : 0,
      light: e.light ? U.rf(1, Math.max(1, e.light)) : 0,
      poison: e.poison || 0,
    };
  }
  hitChanceVs(mon) {
    if (!mon || !mon.def) return null;
    const def = mon.def.def + mon.lvl * 9;
    let ar = this.stats.ar;
    if (mon.type === "undead") ar += this.stats.arUndead || 0;
    else if (mon.type === "demon") ar += this.stats.arDemon || 0;
    return U.clamp(2 * ar / (ar + def) * (this.lvl / (this.lvl + mon.lvl)), 0.2, 0.95);
  }
  tryHit(mon) { return Math.random() < this.hitChanceVs(mon); }
  strike(mon, mult, opts) {
    opts = opts || {};
    if (mon.dead) return 0;
    this.lastTarget = mon;   // remembered for the character sheet's live to-hit readout
    if (!opts.auto && !this.tryHit(mon)) {
      Game.addFloat(mon.x, mon.y, "miss", "#9a9a9a");
      return 0;
    }
    const sourceSkill=this._castingSkillId||(typeof SkillAudio!=='undefined'?SkillAudio.current?.id:null);
    const groundAttack=['nova','shockwave','leap'].includes(DATA.SKILLS[sourceSkill]?.type);
    if (!opts.guardChecked && !groundAttack && mon.imperialCombat?.block(this)) return 0;
    const d = this.rollDamage(mult, mon);
    const converted = this.stats.dmgToFire > 0;
    let total = d.phys + (this.tempo || 0) * (this.stats.dmgPerTempo || 0);
    for (const elem of ["fire", "cold", "light"]) total += converted ? d[elem] : DATA.scaleElement(this, d[elem], elem);
    if (converted) total = DATA.scaleElement(this, total, "fire");
    const elementBaseRatios = converted ? { fire: 1 / DATA.elementMultiplier(this, "fire") } :
      Object.fromEntries(["fire", "cold", "light"].map(elem => [elem, total > 0 ? (total - DATA.scaleElement(this, d[elem], elem) + d[elem]) / total : 1]));
    total *= opts.directMult ?? 1; // Conditional hit bonuses never change wound DPS.
    const fireMode = this.stats.dmgToFire > 0;                       // Fire Claw: all damage becomes fire
    let primal = false;                                              // Primal Surge: double phys + fire eruption
    if (this.stats.primalProc > 0 && Math.random() * 100 < this.stats.primalProc) { primal = true; total *= 2; }
    if (d.crit) { Game.fx.hitPause = Math.max(Game.fx.hitPause, 0.055); }
    this.skillSound('impact',{target:mon,elem:fireMode||primal?'fire':'phys',crit:d.crit});
    if (typeof UniquePowers !== "undefined") total = UniquePowers.empower(this,"strike",total,mon);
    const actual = mon.takeDamage(total, this, { ...d, uniqueEvent: "strike", elem: fireMode ? "fire" : "phys", elementScaled: true, elementBaseRatios, sourceSkill: this._castingSkillId || "basic" }, fireMode ? "fire" : undefined);
    this.applyHuntBleed(mon, actual);
    if(typeof SkillVFX!=='undefined'){
      SkillVFX.hit(this,mon,fireMode?'fire':'phys',d.crit);
      if(primal)SkillVFX.passive(this,'primal',{x:mon.x,y:mon.y});
    }
    if (!fireMode && d.cold > 0) mon.applySlow(2, 30);
    if (!fireMode && d.poison > 0) this.applyPoison(mon, d.poison / 3, 3);
    /* life/mana steal are strike-only (weapon/melee/ranged), not applied to spell damage */
    if (this.stats.lifeSteal > 0) {
      this.healLife(actual * this.stats.lifeSteal / 100);
    }
    if (this.stats.manaSteal > 0) {
      this.mana = Math.min(this.stats.maxMana, this.mana + actual * this.stats.manaSteal / 100);
    }
    /* on-hit affixes: knockback, cause-flee, prevent-heal */
    if (!mon.dead && !mon.isBoss) {
      if (this.stats.knockback) Game.knockMonster(mon, this.x, this.y, 1.0);
      if (this.stats.monsterFlee > 0 && Math.random() * 100 < this.stats.monsterFlee)
        mon.fleeUntil = Math.max(mon.fleeUntil || 0, Game.state.time + 2);
    }
    if (this.stats.preventHeal && !mon.dead) mon.noHeal = true;
    /* chance-to-cast on striking */
    if (this.stats.procs) for (const p of this.stats.procs) if (p.trigger === "strike" && !mon.dead && Math.random() * 100 < p.chance) Game.fireProc(p, mon.x, mon.y, this);
    /* spiny hides bite back at melee attackers */
    if (mon.def.thorns && !this.stats.ranged && !this.dead) this.takeDamage(mon.def.thorns, mon);
    if (fireMode) for (let i = 0; i < 5; i++) Game.addParticle(mon.x, mon.y, "#ff9040");
    if (primal) {   /* fiery eruption: half the blow to every other foe in a small area */
      Sfx.playSkill?.('primal_surge','impact',{owner:this,target:mon,elem:'fire',trigger:'primal'}); Game.addNova(mon.x, mon.y, 2.2, "#ff7a30");
      for (let i = 0; i < 9; i++) Game.addParticle(mon.x, mon.y, "#ff9040");
      for (const m2 of TerrainLayers.targets(Game.state.monsters)) { if (m2 === mon || m2.dead) continue; if (U.dist(mon.x, mon.y, m2.x, m2.y) < 2.2 + m2.radius) m2.takeDamage(total * 0.5 * elementBaseRatios.fire, this, null, "fire"); }
    }
    Game.addFloat(mon.x, mon.y, Math.floor(total), d.crit ? "#ffb030" : primal ? "#ff7a30" : fireMode ? "#ff9040" : "#ffffff", d.crit || primal);
    Game.bloodBurst(mon.x, mon.y, d.crit ? 14 : 7);
    return total;   // the direct damage dealt (callers like Rabies derive effects from it)
  }
  takeDamage(raw, source, elemKind) {
    if (this.dead || Game.debugFlags.god) return;
    if(raw>0)this._coopHurt=(this._coopHurt||0)+1;
    /* Riposte stance: parry the next melee blow, negate it, and counter */
    if (this.stance === "riposte" && this.riposteData && (source instanceof Monster) && (!elemKind || elemKind === "phys") && Game.state.time >= (this.parryCdUntil || 0)) {
      this.parryCdUntil = Game.state.time + (this.riposteData.window || 0.6);
      this.visualReaction("block",source);
      if(typeof SkillVFX!=='undefined')SkillVFX.scope(this,'vanguard_0_2',()=>SkillVFX.area(this.x,this.y,1,this));
      Game.addNova(this.x, this.y, 1.0, "#cfe0ff"); Sfx.playSkill?.('vanguard_0_2','release',{owner:this});
      this.withSkillSource('vanguard_0_2',()=>this.strike(source, this.riposteData.mult, { auto: true }));
      source.stunT = Math.max(source.stunT, this.riposteData.stun);
      this.mana = Math.min(this.stats.maxMana, this.mana + (this.riposteData.refund || 0));
      return;
    }
    let dmg = raw;
    if (!elemKind || elemKind === "phys") {
      const dr = Math.min(0.75, this.stats.armor / (this.stats.armor + 45 + 9 * (source ? source.lvl : this.lvl)));
      dmg *= (1 - dr);
    } else {
      const res = { fire: this.stats.resFire, cold: this.stats.resCold, light: this.stats.resLight, poison: this.stats.resPoison }[elemKind] || 0;
      dmg *= (1 - res / 100);
    }
    /* stance damage modifiers: Bulwark soaks, Berserker exposes */
    dmg *= (1 - Math.min(80, this.stats.dmgReducePct || 0) / 100) * (1 + (this.stats.dmgTakenPct || 0) / 100);
    /* flat damage reduction by element (Damage Reduced by N / Magic Damage Reduced by N) */
    if (!elemKind || elemKind === "phys") dmg -= this.stats.dmgReduceFlat || 0;
    else dmg -= this.stats.magicReduceFlat || 0;
    if (dmg < 0) dmg = 0;
    /* a share of the blow is drained from Aether instead of Life */
    if (this.stats.dmgToMana > 0 && this.mana > 0 && dmg > 0) {
      const toMana = Math.min(this.mana, dmg * this.stats.dmgToMana / 100);
      this.spendAether(toMana); dmg -= toMana;
    }
    /* Bone Armor absorb pool soaks before real HP, and gores melee attackers */
    if (this.boneWard && this.boneWard.hp > 0 && Game.state.time < this.boneWard.until) {
      const ab = Math.min(dmg, this.boneWard.hp); this.boneWard.hp -= ab; dmg -= ab;
      if ((source instanceof Monster) && U.dist(this.x, this.y, source.x, source.y) < 1.9) { source.takeDamage(this.boneWard.retal, this); source.applySlow(1.2, 30); Sfx.playSkill?.('gravebinder_0_4','impact',{owner:this,target:source}); }
      if (this.boneWard.hp <= 0) { this.boneWard = null; Game.addNova(this.x, this.y, 1.2, "#cfd8c0"); Sfx.playSkill?.('gravebinder_0_4','end',{owner:this}); }
      if (dmg <= 0) { this.flashT = 0.12; return; }
    }
    /* Rimeguard: melee attackers are chilled and bitten by frost */
    if (this.retalCold && Game.state.time < this.retalCold.until && (source instanceof Monster) && U.dist(this.x, this.y, source.x, source.y) < 1.9) { source.takeDamage(this.retalCold.dmg, this); source.applySlow(2, 40); Sfx.playSkill?.('rimeguard','impact',{owner:this,target:source,elem:'cold'}); }
    /* Kindred Bond: the pack shares the hero's wounds */
    if (this.stats.pShare > 0) { const beasts = TerrainLayers.targets(Game.state.minions).filter(m => !m.dead && m.owner===this); if (beasts.length) { const share = dmg * Math.min(0.5, this.stats.pShare / 100); dmg -= share; const each = share / beasts.length; for (const mi of beasts) mi.takeDamage(each, source); if(typeof SkillAudio!=='undefined')Sfx.playSkill?.('kinship','impact',{owner:this,trigger:'minion',level:.5}); } }
    dmg = Math.max(1, dmg);
    if (typeof UniquePowers !== "undefined") dmg = UniquePowers.absorb(this,dmg);
    if (dmg <= 0) return;
    this.hp -= dmg;
    if (typeof UniquePowers !== "undefined") UniquePowers.emit(this,"hurt",{ source, elem: elemKind || "phys", damage: dmg });
    if(typeof SkillVFX!=='undefined')SkillVFX.passive(this,'defense',{x:this.x,y:this.y});
    this.visualReaction('hurt',source);
    Game.playerHurtFloat(this.x, this.y, dmg, elemKind);   // colored number above the player, by element
    this.flashT = 0.12;
    // The fatal hit has its own recorded voice; do not layer the hurt buzz on it.
    if (this.hp > 0) Sfx.play("playerHurt");
    Game.bloodBurst(this.x, this.y, 5);
    /* chance-to-cast when struck */
    if (this.stats.procs) for (const p of this.stats.procs) if (p.trigger === "struck" && Math.random() * 100 < p.chance) Game.fireProc(p, this.x, this.y, this);
    if (this.hp <= 0) { this.hp = 0; Game.onPlayerDeath(source,this); }
  }
  tryBlock(source) {
    const blocked=this.stats.block > 0 && Math.random() * 100 < this.stats.block;
    if(blocked)this.visualReaction('block',source);
    if(blocked && typeof UniquePowers !== "undefined") UniquePowers.emit(this,"block",{ source:source?.mon || source, target:source?.mon || source });
    return blocked;
  }

  /* ---------------- skills ---------------- */
  canPay(sk, rk) { return this.mana >= sk.mana(rk); }
  pay(sk, rk) {
    const amount = sk.mana(rk); this.spendAether(amount);
    if (typeof UniquePowers !== "undefined") UniquePowers.emit(this,"spend",{ amount, skill: sk });
  }
  healLife(amount) {
    if (!(amount > 0) || this.dead) return;
    const excess = Math.max(0,this.hp + amount - this.stats.maxHp);
    this.hp = Math.min(this.stats.maxHp,this.hp + amount);
    if (excess && typeof UniquePowers !== "undefined") UniquePowers.emit(this,"overheal",{ amount: excess });
  }

  /* execute a skill *now* (caller has verified range etc.) */
  performSkill(skillId,target,point) {
    if(typeof Coop!=="undefined"&&Coop.active&&!Coop.authority)return Coop.submit(target?{type:"attack",skill:skillId,targetId:target._coopId}:{type:"cast",skill:skillId,point});
    if (DATA.SKILLS[skillId]?.type === "passive") return false;
    if (this.rejectSkillWeapon(skillId)) return false;
    const run=()=>this.performSkillPresentation(skillId,target,point);
    return typeof SkillAudio!=='undefined'?SkillAudio.cast(this,skillId,run):run();
  }
  performSkillPresentation(skillId,target,point) {
    const previous=this.action;
    const before={x:this.x,y:this.y,action:previous,aim:target?{x:target.x,y:target.y}:point?{...point}:null};
    this._visualSkill=skillId==='basic'?'basic':DATA.SKILLS[skillId]?.type||skillId;
    try {
      const result=this.withSkillSource(skillId,()=>{
        const sk=this.resolveSkill(skillId), result=this.performSkillAction(skillId,target,point);
        if(result) {
          this.checkAetherDepletion();
          this.applySkillPerkBuff(sk,this.effRank(skillId));
          if(skillId !== "basic" && typeof UniquePowers !== "undefined") UniquePowers.emit(this,"cast",{ skill: sk, target, elem: sk?.elem });
        }
        return result;
      });
      if(result&&this.action!==previous&&!this.action?.visual?.releases.length)this.markActionRelease(0);
      if(result&&typeof SkillVFX!=='undefined')SkillVFX.activate(this,this.resolveSkill(skillId),target,point,before);
      return result;
    } finally {this._visualSkill=null;}
  }
  performSkillAction(skillId, target, point) {
    const isBasic = skillId === "basic";
    const sk = this.resolveSkill(skillId);
    const rk = isBasic ? 1 : this.effRank(skillId);
    if (!isBasic && rk <= 0) return false;
    if (this.rejectSkillWeapon(skillId)) return false;
    const turningOff = sk.type === "form" ? this.buffs.some(b=>b.id === "form_"+sk.form)
      : ["combat_stance","parry_stance"].includes(sk.type) && this.stance === sk.stanceId;
    const alreadyDrawing=sk.type === "charge_shot" && this.drawing;
    if (!isBasic && !turningOff && !alreadyDrawing && !this.canPay(sk, rk)) { Sfx.play("error"); Game.msg("Not enough aether.", "#8090d0"); return false; }
    const dur = 1 / this.stats.attackRate;
    const syn = isBasic ? 1 : this.synergyMult(sk);

    switch (sk.type) {
      case "umbral_knife": case "dusk_cleave": case "shadow_flurry": case "deathblow":
        return this.performVeilAttack(sk,rk,target,point);
      case "melee": {
        if (!target) return false;
        this.face(target.x, target.y);
        if (!isBasic) this.pay(sk, rk);
        this.startAction("attack", dur);
        const mult = sk.dmgMult(rk) * syn;
        if (this.stats.ranged) {
          this.afterActionDelay(dur * 0.45, () => {
            if (this.dead) return;
            Sfx.play("bow");
            Game.spawnProjectile({ visualOwner:this, x: this.x, y: this.y, tx: target.x, ty: target.y, speed: 11, kind: "arrow", fromPlayer: true, mult, quarryOnHit: sk.quarryOnHit, quarryStacks:sk.quarryStacks?.(rk), pierce:!!sk.perkPierce });
          });
        } else {
          Sfx.play("swing");
          this.afterActionDelay(dur * 0.5, () => {
            if (this.dead || target.dead) return;
            if (U.dist(this.x, this.y, target.x, target.y) <= this.stats.range + target.radius + 0.35) this.strike(target, mult);
          });
        }
        return true;
      }
      case "sweep": {
        this.pay(sk, rk);
        const aim = target ? Math.atan2(target.y - this.y, target.x - this.x)
                  : point ? Math.atan2(point.y - this.y, point.x - this.x) : 0;
        if (target) this.face(target.x, target.y); else if (point) this.face(point.x, point.y);
        this.startAction("attack", dur);
        Sfx.play("swing");
        const mult = sk.dmgMult(rk) * syn, arc = sk.arc(rk), range = sk.range(rk);
        this.afterActionDelay(dur * 0.5, () => {
          if (this.dead) return;
          let hits = 0;
          for (const mon of TerrainLayers.targets(Game.state.monsters)) {
            if (mon.dead) continue;
            const d = U.dist(this.x, this.y, mon.x, mon.y);
            if (d > range + mon.radius) continue;
            const a = Math.atan2(mon.y - this.y, mon.x - this.x);
            let da = Math.abs(a - aim); if (da > Math.PI) da = Math.PI * 2 - da;
            if (da <= arc / 2) { this.strike(mon, mult); hits++; }
          }
          if (hits) Game.fx.hitPause = Math.max(Game.fx.hitPause, 0.03);
        });
        return true;
      }
      case "nova": {
        this.pay(sk, rk);
        this.startAction("attack", dur * 0.9);
        const radius = sk.radius(rk), mult = sk.dmgMult(rk) * syn;
        Sfx.play(skillId === "terrifying_bellow" ? "roar" : skillId === "smothering_veil" ? "curse" : "slam");
        Game.addNova(this.x, this.y, radius, skillId === "terrifying_bellow" ? "#b070d0" : skillId === "smothering_veil" ? "#6a6480" : "#d8b860");
        Game.fx.shake = Math.max(Game.fx.shake, skillId === "ground_slam" ? 5 : 2);
        this.afterActionDelay(0.12, () => {
          for (const mon of TerrainLayers.targets(Game.state.monsters)) {
            if (mon.dead || U.dist(this.x, this.y, mon.x, mon.y) > radius + mon.radius) continue;
            if (mult > 0) this.strike(mon, mult, { auto: true });
            if (sk.stun) mon.stunT = Math.max(mon.stunT, sk.stun(rk));
            if (sk.slowPct) mon.applySlow(sk.dur(rk), sk.slowPct(rk));
            if (sk.weaken) mon.curseWither = {owner:this, until: Game.state.time + sk.dur(rk), pct: sk.weaken(rk) };
          }
        });
        return true;
      }
      case "buff": {
        this.pay(sk, rk);
        const b = sk.buff(rk);
        this.buffs = this.buffs.filter(x => x.id !== b.id);
        this.buffs.push({ id: b.id, label: b.label, emoji: b.emoji, stats: b.stats, until: Game.state.time + b.dur });
        if (sk.retal) this.retalCold = { dmg: sk.retal(rk), until: Game.state.time + b.dur };   // Rimeguard frost reprisal
        this.computeStats();
        Sfx.play("roar");
        Game.addNova(this.x, this.y, 1.6, "#d8c060");
        return true;
      }
      case "dash": {
        if (!target) return false;
        const maxR = sk.dashRange(rk);
        if (U.dist(this.x, this.y, target.x, target.y) > maxR) { Game.msg("Too far.", "#9a9a9a"); return false; }
        this.pay(sk, rk);
        this.dashing = { target, mult: sk.dmgMult(rk) * syn, speed: 16 };
        Sfx.play("swing");
        return true;
      }
      case "leap": {
        if (!point) point = target ? { x: target.x, y: target.y } : null;
        if (!point) return false;
        const maxR = sk.leapRange(rk);
        const d = U.dist(this.x, this.y, point.x, point.y);
        const px = d > maxR ? this.x + (point.x - this.x) / d * maxR : point.x;
        const py = d > maxR ? this.y + (point.y - this.y) / d * maxR : point.y;
        const terrain=Game.state.map;
        if (!MapGen.walkable(terrain,px,py)||(terrain.surfaceVersion&&(!TerrainSurface.supported(terrain,this.x,this.y,this.radius)||!TerrainSurface.supported(terrain,px,py,this.radius)))) { Game.msg("No footing there.", "#9a9a9a"); return false; }
        this.pay(sk, rk);
        this.leaping = { fx: this.x, fy: this.y, tx: px, ty: py, t: 0, dur: 0.5, mult: sk.dmgMult(rk) * syn, radius: sk.radius(rk) };
        this.face(px, py);
        return true;
      }
      case "spin": {
        this.pay(sk, rk);
        let aim = point || (target ? { x: target.x, y: target.y } : null);
        if (!aim) { const [wx, wy] = U.screenVecToWorld(this.visAng); aim = { x: this.x + wx, y: this.y + wy }; }
        this.spinning = { tx: aim.x, ty: aim.y, t: 0, dur: sk.dur(rk), tick: 0, mult: sk.dmgMult(rk) * syn, radius: sk.radius(rk) };
        Sfx.play("swing");
        return true;
      }
      /* -------- Veil Ranger skill types -------- */
      case "wfan": case "wpierce": {
        let aim = target ? { x: target.x, y: target.y } : point;
        if (!aim) { const [wx, wy] = U.screenVecToWorld(this.visAng); aim = { x: this.x + wx * 5, y: this.y + wy * 5 }; }
        this.pay(sk, rk);
        this.face(aim.x, aim.y);
        const dur = 1 / this.stats.attackRate;
        this.startAction("attack", dur);
        const mult = sk.dmgMult(rk) * syn;
        this.afterActionDelay(dur * 0.45, () => {
          if (this.dead) return;
          Sfx.play("bow");
          const base = { x: this.x, y: this.y, speed: 12, kind: "arrow", fromPlayer: true, mult, quarryOnHit: sk.quarryOnHit, quarryStacks:sk.quarryStacks?.(rk), pierce:!!sk.perkPierce, ttl:sk.weaponTtl?.(rk) };
          if (sk.type === "wfan") {
            const n = sk.count(rk), spread = sk.spread(rk);
            const a0 = Math.atan2(aim.y - this.y, aim.x - this.x);
            for (let i = 0; i < n; i++) {
              const a = a0 + (i - (n - 1) / 2) * spread / Math.max(1, n - 1) * 2;
              Game.spawnProjectile(Object.assign({visualOwner:this}, base, { tx: this.x + Math.cos(a) * 8, ty: this.y + Math.sin(a) * 8 }));
            }
          } else {
            Game.spawnProjectile(Object.assign({visualOwner:this}, base, { tx: aim.x, ty: aim.y, pierce: true, speed: 14 }));
          }
        });
        return true;
      }
      case "trap": {
        let aim = target ? { x: target.x, y: target.y } : point;
        if (!aim) return false;
        const maxR = sk.castRange(rk);
        const d = U.dist(this.x, this.y, aim.x, aim.y);
        if (d > maxR) { const k = maxR / d; aim = { x: this.x + (aim.x - this.x) * k, y: this.y + (aim.y - this.y) * k }; }
        if (!MapGen.walkable(Game.state.map, aim.x, aim.y)) { Game.msg("No footing for a trap there.", "#9a9a9a"); return false; }
        this.pay(sk, rk);
        this.face(aim.x, aim.y);
        this.startAction("attack", 0.4);
        const [lo, hi] = sk.dmg(rk);
        const trap = {
          x: aim.x, y: aim.y, owner: this, kind: sk.trapKind, skillId: sk.id,
          armT: (sk.trapArm?.(rk)??0.7) / (1+(this.stats.armSpeed||0)/100), ttl: sk.trapTtl?.(rk)??24, radius: sk.radius(rk), trigger: sk.trapTrigger?.(rk)??1.25,
          dmgLo: lo, dmgHi: hi, elem: sk.elem || null,
          slowPct: sk.slowPct ? sk.slowPct(rk) : 0, slowDur: sk.slowDur ? sk.slowDur(rk) : 0,
          burn: sk.burn ? sk.burn(rk) : 0,
          mult: this.snareDamageScale(sk),
        };
        /* cap concurrent traps */
        const ownTraps=Game.state.traps.filter(t=>t.owner===this);
        if (ownTraps.length >= 4+(this.stats.trapCap||0)) Game.state.traps.splice(Game.state.traps.indexOf(ownTraps[0]),1);
        trap.surfaceId=this.surfaceId??0;
        Game.state.traps.push(trap);
        Sfx.play("click");
        Game.dustPuff(aim.x, aim.y);
        return true;
      }
      case "blink": {
        let aim = point || (target ? { x: target.x, y: target.y } : null);
        if (!aim) return false;
        const maxR = sk.blinkRange(rk);
        const d = U.dist(this.x, this.y, aim.x, aim.y);
        if (d > maxR) { const k = maxR / d; aim = { x: this.x + (aim.x - this.x) * k, y: this.y + (aim.y - this.y) * k }; }
        if (!MapGen.walkable(Game.state.map, aim.x, aim.y)) { Game.msg("The shadows refuse.", "#9a9a9a"); return false; }
        this.pay(sk, rk);
        /* smoke where she was, smoke where she lands */
        for (let i = 0; i < 8; i++) Game.addParticle(this.x + U.rf(-0.3, 0.3), this.y + U.rf(-0.3, 0.3), "#4a4458");
        Game.addNova(this.x, this.y, 0.8, "#6a6480");
        this.x = aim.x; this.y = aim.y;
        if(skillId==="veilranger_2_0"){
          if(this.action?.veilPending)this.action.interrupted=true;
          this.shadowAmbushUntil=Game.state.time+3;
          this.buffs=this.buffs.filter(b=>b.id!=="shadow_ambush");
          this.buffs.push({id:"shadow_ambush",label:"Shadow Ambush: next Veil attack +25%",emoji:"◆",stats:{},until:this.shadowAmbushUntil,sourceSkill:skillId});
        }
        this._animationController?.reset();
        this.path = null;
        for (let i = 0; i < 8; i++) Game.addParticle(this.x + U.rf(-0.3, 0.3), this.y + U.rf(-0.3, 0.3), "#4a4458");
        Game.addNova(this.x, this.y, 0.8, "#6a6480");
        Sfx.play("portal");
        return true;
      }
      /* -------- caster skill types (Ember Witch) -------- */
      case "projectile": case "pierce": case "chain": case "fan": {
        let aim = target ? { x: target.x, y: target.y } : point;
        if (!aim) { const [wx, wy] = U.screenVecToWorld(this.visAng); aim = { x: this.x + wx * 5, y: this.y + wy * 5 }; }
        this.pay(sk, rk);
        const dur = this.beginCast(sk, aim);
        const roll = () => this.spellRoll(sk, rk);
        const burn = sk.burn ? sk.burn(rk) : 0, chill = sk.chill ? sk.chill(rk) : 0;
        this.afterActionDelay(dur * 0.55, () => {
          if (this.dead) return;
          Sfx.play(sk.sound || "firebolt");
          const base = { x: this.x, y: this.y, speed: sk.projSpeed || 10, kind: sk.proj || "firebolt", fromPlayer: true, ttl: sk.projTtl ? sk.projTtl(rk) : undefined };
          const mkSpell = () => { const r = roll(); return { dmg: r.dmg, crit: r.crit, elem: sk.elem, burn, chill, pdot: sk.pdot ? sk.pdot(rk) : 0, drain: sk.drain ? sk.drain(rk) : 0, pierce: sk.type === "pierce" || !!sk.perkPierce, chains: sk.type === "chain" ? sk.jumps(rk) : 0, scorch: sk.scorch ? sk.scorch(rk) : 0, static: sk.buildStatic ? (sk.staticPerHit?.(rk)??1) : 0 }; };
          if (sk.type === "fan") {
            const n = sk.count(rk), spread = sk.spread(rk);
            const a0 = Math.atan2(aim.y - this.y, aim.x - this.x);
            for (let i = 0; i < n; i++) {
              /* scatter = sporadic random angle within the cone; else an even fan */
              const a = sk.scatter ? a0 + (Math.random() - 0.5) * spread * 2
                                   : a0 + (i - (n - 1) / 2) * spread / Math.max(1, n - 1) * 2;
              const sp = mkSpell(); if (sk.wander) sp.wander = sk.wander;
              Game.spawnProjectile(Object.assign({visualOwner:this}, base, { tx: this.x + Math.cos(a) * 8, ty: this.y + Math.sin(a) * 8, spell: sp }));
            }
          } else {
            const sp = mkSpell(); if (sk.wander) sp.wander = sk.wander;
            Game.spawnProjectile(Object.assign({visualOwner:this}, base, { tx: aim.x, ty: aim.y, spell: sp }));
          }
        });
        return true;
      }
      case "lightning": {
        /* an instant forking STREAM of lightning (no travelling projectile) */
        let first = target;
        if (!first) {
          const ap = point || { x: this.x, y: this.y };
          let bd = 11 * 11;
          for (const m of TerrainLayers.targets(Game.state.monsters)) { if (m.dead) continue; const dd = U.dist2(ap.x, ap.y, m.x, m.y); if (dd < bd) { bd = dd; first = m; } }
        }
        if (!first) { Game.msg("Nothing for the arc to leap to.", "#9a9a9a"); return false; }
        this.pay(sk, rk);
        const dur = this.beginCast(sk, first);
        const maxJumps = sk.jumps(rk);
        this.afterActionDelay(dur * 0.5, () => {
          if (this.dead) return;
          Sfx.play(sk.sound || "zap");
          const hitset = new Set();
          let fxp = this.x, fyp = this.y, cur = first;
          for (let i = 0; i <= maxJumps && cur; i++) {
            Game.lightningBolt(fxp, fyp, cur.x, cur.y);
            const r = this.spellRoll(sk, rk);
            this.spellHit(cur, r.dmg, sk.elem, { crit: r.crit });
            hitset.add(cur); fxp = cur.x; fyp = cur.y;
            let next = null, bd = 5.5 * 5.5;
            for (const m of TerrainLayers.targets(Game.state.monsters)) { if (m.dead || hitset.has(m)) continue; const dd = U.dist2(fxp, fyp, m.x, m.y); if (dd < bd) { bd = dd; next = m; } }
            cur = next;
          }
        });
        return true;
      }
      case "blast": {
        let aim = target ? { x: target.x, y: target.y } : point;
        if (!aim) return false;
        const maxR = sk.castRange(rk);
        const d = U.dist(this.x, this.y, aim.x, aim.y);
        if (d > maxR) { const k = maxR / d; aim = { x: this.x + (aim.x - this.x) * k, y: this.y + (aim.y - this.y) * k }; }
        this.pay(sk, rk);
        const dur = this.beginCast(sk, aim);
        const radius = sk.radius(rk), burn = sk.burn ? sk.burn(rk) : 0, pdot = sk.pdot ? sk.pdot(rk) : 0;
        const spot = aim;
        const blastCols = sk.elem === "poison" ? ["#90ff70", "#5a8a40", "#3a5a28"] : ["#ff9040", "#ffd080", "#c04010"];
        this.afterActionDelay(dur * 0.6, () => {
          if (this.dead) return;
          Sfx.play(sk.sound || "blast");
          Game.addNova(spot.x, spot.y, radius, blastCols[0]);
          Game.fx.shake = Math.max(Game.fx.shake, 3);
          for (let i = 0; i < 16; i++) Game.addParticle(spot.x + U.rf(-radius, radius) * 0.5, spot.y + U.rf(-radius, radius) * 0.5, U.pick(blastCols));
          for (const mon of TerrainLayers.targets(Game.state.monsters)) {
            if (mon.dead || U.dist(spot.x, spot.y, mon.x, mon.y) > radius + mon.radius) continue;
            const r = this.spellRoll(sk, rk);
            this.spellHit(mon, r.dmg, sk.elem, { crit: r.crit, burn, pdot });
            if (sk.stun) mon.stunT = Math.max(mon.stunT, sk.stun(rk));
          }
        });
        return true;
      }
      /* -------- Gravebinder skill types -------- */
      case "summon": {
        /* Gravebinder summons must be raised FROM a corpse (which is spent);
           Wildkeeper beasts simply answer the call. */
        let corpse = null;
        if (sk.needsCorpse) {
          const aim = target ? { x: target.x, y: target.y } : point;
          corpse = Game.corpseFromGrave(this, aim, sk.castRange(rk));   // PRIORITY: raise from a gravestone (Empowered)
          if (!corpse) {                                                // else the nearest real corpse — near aim first, then near caster
            let bd = 2.5 * 2.5;
            if (aim) for (const mon of TerrainLayers.targets(Game.state.monsters)) {
              if (!mon.dead || mon.corpseT <= 0 || mon.exploded) continue;
              const dd = U.dist2(aim.x, aim.y, mon.x, mon.y);
              if (dd < bd) { bd = dd; corpse = mon; }
            }
            if (!corpse) {
              bd = sk.castRange(rk) ** 2;
              for (const mon of TerrainLayers.targets(Game.state.monsters)) {
                if (!mon.dead || mon.corpseT <= 0 || mon.exploded) continue;
                const dd = U.dist2(this.x, this.y, mon.x, mon.y);
                if (dd < bd) { bd = dd; corpse = mon; }
              }
            }
          }
          if (!corpse) { Game.msg("The dead must be raised from a corpse or grave.", "#9a9a9a"); Sfx.play("error"); return false; }
          if (U.dist(this.x, this.y, corpse.x, corpse.y) > sk.castRange(rk)) { Game.msg("Too far from the corpse.", "#9a9a9a"); return false; }
        }
        this.pay(sk, rk);
        const dur = this.beginCast(sk, corpse || point || target);
        this.afterActionDelay(dur * 0.6, () => {
          if (this.dead || (corpse && corpse.exploded)) return;
          const empowered = !!(corpse && corpse.fromGrave);            // raised from a cracked gravestone
          if (corpse) { corpse.exploded = true; corpse.corpseT = 0; }   // the body is spent
          const stats = sk.minionStats(rk);
          stats.hp = Math.floor(stats.hp * (1 + this.stats.minionHpPct / 100));
          if (empowered) { stats.hp *= 2; stats.dmg = [stats.dmg[0] * 2, stats.dmg[1] * 2]; }   // gravestone-raised: doubled stats
          const cap = sk.cap(rk);
          const mine = TerrainLayers.targets(Game.state.minions).filter(m => !m.dead && m.owner===this && m.kindId === sk.minion);
          if (mine.length >= cap) mine.reduce((lo, m) => m.hp < lo.hp ? m : lo, mine[0]).die();   // the most wounded returns to the wild
          const mi = new Minion(sk.minion, stats, this);
          mi.sourceSkill=skillId;
          mi.auraRadius=sk.auraRadius || 0;
          mi.auraStats=sk.auraStats?.(rk) || {};
          if (corpse) { mi.x = corpse.x; mi.y = corpse.y; }   // it climbs out of the body
          mi.dmgPctOwner = this.stats.minionDmgPct;
          mi.refreshPalette();
          if (empowered) {   // Empowered: doubled, larger, violet-aura'd, renamed
            mi.empowered = true; mi.tint = "#c060ff"; mi.scale = 1.25;
            if (mi.spriteOpts) mi.spriteOpts.scale = (mi.spriteOpts.scale || 1) * 1.25;
            mi.name = "Empowered " + (mi.name || "Minion");
          }
          Game.state.minions.push(mi);
          if (mi.auraRadius) this.syncSummonAuras();
          if (corpse) {
            if(typeof SkillVFX!=='undefined')SkillVFX.transfer(this,skillId,corpse,mi);
            Sfx.play("vox_bone");
            Game.bloodBurst(mi.x, mi.y, 6);
            for (let i = 0; i < 8; i++) Game.addParticle(mi.x, mi.y, "#cfd8c0");
          } else {
            Sfx.play("vox_beast");
            Game.dustPuff(mi.x, mi.y);
            for (let i = 0; i < 6; i++) Game.addParticle(mi.x, mi.y, "#7a8a4a");
          }
          Game.addNova(mi.x, mi.y, 0.9, corpse ? "#80ff90" : "#a8c860");
        });
        return true;
      }
      case "form": {
        const fid = "form_" + sk.form;
        /* toggle: re-casting the active shape reverts you */
        if (this.buffs.some(x => x.id === fid)) { this.buffs = this.buffs.filter(x => !x.id.startsWith("form_")); this.form = null; this.computeStats(); if (UI.refreshBuffs) UI.refreshBuffs(); Sfx.play("vox_beast"); return true; }
        this.pay(sk, rk);
        const b = { id: fid, label: sk.name, emoji: { fang: "🐺", stone: "🗿", apex: "🐾", hound: "🐺", brute: "🐻" }[sk.form] || "✦", stats: sk.formStats(rk) };
        this.buffs = this.buffs.filter(x => !x.id.startsWith("form_"));
        this.buffs.push({ id: b.id, label: b.label, emoji: b.emoji, stats: b.stats, until: Infinity, infinite: true });   // shapes hold until you re-cast to revert
        this.form = sk.form;
        this.computeStats();
        Sfx.play("vox_beast");
        Game.addNova(this.x, this.y, 1.6, "#a8c860");
        for (let i = 0; i < 10; i++) Game.addParticle(this.x + U.rf(-0.4, 0.4), this.y + U.rf(-0.4, 0.4), "#7a8a4a");
        Game.fx.shake = Math.max(Game.fx.shake, 2);
        /* Primal Surge: shifting releases a stagger shockwave */
        if (this.stats.shiftRadius > 0) { Game.addNova(this.x, this.y, this.stats.shiftRadius, "#a8c860"); for (const mon of TerrainLayers.targets(Game.state.monsters)) { if (mon.dead || U.dist(this.x, this.y, mon.x, mon.y) > this.stats.shiftRadius + mon.radius) continue; mon.stunT = Math.max(mon.stunT, this.stats.shiftStun || 0.4); } }
        if (UI.refreshBuffs) UI.refreshBuffs();
        return true;
      }
      case "fireclaw": {
        if (!this.form || !this.buffs.some(b => b.id && b.id.startsWith("form_"))) { this.form = null; Game.msg("Fire Claw needs a beast shape.", "#ff9040"); Sfx.play("error"); return false; }
        if (sk.cd && this.skillCd[skillId] && Game.state.time < this.skillCd[skillId]) { Sfx.play("error"); return false; }
        if (!this.canPay(sk, rk)) { Sfx.play("error"); Game.msg("Not enough aether.", "#8090d0"); return false; }
        let aim = target ? { x: target.x, y: target.y } : point;
        if (!aim) { const [wx, wy] = U.screenVecToWorld(this.visAng); aim = { x: this.x + wx * 4, y: this.y + wy * 4 }; }
        this.pay(sk, rk); if (sk.cd) this.skillCd[skillId] = Game.state.time + sk.cd(rk); this.face(aim.x, aim.y);
        this.startAction("attack", 1 / this.stats.attackRate);
        Sfx.play("fireHit");
        /* convert-to-fire + bonus damage buff while it burns */
        this.buffs = this.buffs.filter(x => x.id !== "fireclaw");
        this.buffs.push({ id: "fireclaw", label: "Fire Claw", emoji: "🔥", stats: { dmgToFire: 1, dmgPct: sk.dmgBoost(rk) }, until: Game.state.time + sk.dur(rk) });
        this.computeStats(); if (UI.refreshBuffs) UI.refreshBuffs();
        /* Fire Claw is also a melee attack: rake the target (fire-converted by the buff above) */
        if (target && !target.dead) {
          const mMult = sk.meleeMult(rk) * syn;
          this.afterActionDelay((1 / this.stats.attackRate) * 0.4, () => {
            if (this.dead || target.dead) return;
            if (U.dist(this.x, this.y, target.x, target.y) <= this.stats.range + target.radius + 0.6) this.strike(target, mMult);
          });
        }
        /* a chain of fire explosions that ripple outward — each waits for the last
           to finish before the next, so repeat casts overlap and stack */
        const dx = aim.x - this.x, dy = aim.y - this.y, dl = Math.hypot(dx, dy) || 1, fxw = dx / dl, fyw = dy / dl;
        const N = sk.explosions(rk), rad = sk.boomRadius(rk), step = sk.waveRange(rk) / N, DUR = 0.3;
        const boom = (cx, cy) => {
          if (this.dead) return;
          Game.addNova(cx, cy, rad, "#ff7a30"); Sfx.play("fireHit"); Game.fx.shake = Math.max(Game.fx.shake, 2.5);
          for (let k = 0; k < 9; k++) Game.addParticle(cx, cy, "#ff9040");
          for (const mon of TerrainLayers.targets(Game.state.monsters)) { if (mon.dead) continue; if (U.dist(cx, cy, mon.x, mon.y) < rad + mon.radius) { const r = this.spellRoll(sk, rk); this.spellHit(mon, r.dmg, "fire", { crit: r.crit, burn: 2 }); } }
        };
        for (let i = 0; i < N; i++) {
          const cx = this.x + fxw * step * (i + 1), cy = this.y + fyw * step * (i + 1);
          if (i === 0) boom(cx, cy); else this.afterSkillDelay(i * DUR, () => boom(cx, cy));
        }
        return true;
      }
      case "rabies": {   // a poison melee bite; a rabid foe that dies erupts into a contagious cloud
        if (!target) return false;
        this.face(target.x, target.y); this.pay(sk, rk);
        const dur = 1 / this.stats.attackRate;
        this.startAction("attack", dur); Sfx.play("swing");
        const pdur = sk.dur(rk), crad = sk.cloudRad(rk), mult = sk.dmgMult(rk) * syn;
        this.afterActionDelay(dur * 0.5, () => {
          if (this.dead || target.dead) return;
          if (U.dist(this.x, this.y, target.x, target.y) <= this.stats.range + target.radius + 0.4) {
            const dealt = this.strike(target, mult);              // the bite's direct damage
            if (dealt > 0 && !target.dead) {                      // only a landed bite festers
              const tickDps = dealt * 0.5;                        // poison ticks at HALF the direct damage
              this.applyPoison(target, tickDps, pdur, { strongest: true });
              target.rabies = { until: Game.state.time + pdur, dps: DATA.scaleElement(this, tickDps, "poison"), cloudRad: crad, owner: this, elementScaled: true };
              for (let i = 0; i < 4; i++) Game.addParticle(target.x, target.y, "#90ff70");
            }
          }
        });
        return true;
      }
      case "minionbuff": {
        if (!TerrainLayers.targets(Game.state.minions).some(m => !m.dead&&m.owner===this)) { Game.msg("You have no servants to muster.", "#9a9a9a"); return false; }
        if (sk.cd && this.skillCd[skillId] && Game.state.time < this.skillCd[skillId]) { Game.msg(sk.name + " not ready.", "#c0a060"); Sfx.play("error"); return false; }
        this.pay(sk, rk);
        if (sk.cd) this.skillCd[skillId] = Game.state.time + sk.cd(rk);
        const dur = this.beginCast(sk, null);
        this.afterActionDelay(dur * 0.6, () => {
          if (this.dead) return;
          Sfx.play("roar");
          const healPct = sk.heal ? sk.heal(rk) : 100;   // dread_muster heals a %, feral_howl full
          for (const mi of TerrainLayers.targets(Game.state.minions)) {
            if (mi.dead||mi.owner!==this) continue;
            mi.hp = Math.min(mi.maxHp, mi.hp + mi.maxHp * healPct / 100);
            mi.buffUntil = Game.state.time + sk.dur(rk);
            mi.buffDmg = sk.dmgBuff(rk);
            Game.addNova(mi.x, mi.y, 0.8, "#80ff90");
          }
        });
        return true;
      }
      case "curse": {
        let aim = target ? { x: target.x, y: target.y } : point;
        if (!aim) return false;
        this.pay(sk, rk);
        const dur = this.beginCast(sk, aim);
        const radius = sk.radius(rk) * (1 + (this.stats.curseRadiusPct || 0) / 100), cdur = sk.dur(rk) * (1 + (this.stats.curseDurPct || 0) / 100), pct = sk.pct(rk);
        const slowPct = sk.slowPct ? sk.slowPct(rk) : 0;
        this.afterActionDelay(dur * 0.55, () => {
          if (this.dead) return;
          Sfx.play("curse");
          Game.addNova(aim.x, aim.y, radius, "#b070d0");
          for (const mon of TerrainLayers.targets(Game.state.monsters)) {
            if (mon.dead || U.dist(aim.x, aim.y, mon.x, mon.y) > radius + mon.radius) continue;
            if (sk.curse === "frailty") mon.curseFrailty = {owner:this, until: Game.state.time + cdur, pct };
            else { mon.curseWither = {owner:this, until: Game.state.time + cdur, pct }; mon.applySlow(cdur, slowPct); }
            Game.addParticle(mon.x, mon.y, "#b070d0");
          }
        });
        return true;
      }
      case "corpse": {
        const aim = target ? { x: target.x, y: target.y } : point;
        if (!aim) return false;
        let corpse = null, bd = 2.5 * 2.5;
        for (const mon of TerrainLayers.targets(Game.state.monsters)) {
          if (!mon.dead || mon.corpseT <= 0 || mon.exploded) continue;
          const dd = U.dist2(aim.x, aim.y, mon.x, mon.y);
          if (dd < bd) { bd = dd; corpse = mon; }
        }
        if (!corpse) corpse = Game.corpseFromGrave(this, aim, sk.castRange(rk));
        if (!corpse) { Game.msg("No corpse or grave to use there.", "#9a9a9a"); return false; }
        if (U.dist(this.x, this.y, corpse.x, corpse.y) > sk.castRange(rk)) { Game.msg("Too far.", "#9a9a9a"); return false; }
        this.pay(sk, rk);
        const dur = this.beginCast(sk, corpse);
        const radius = sk.radius(rk);
        this.afterActionDelay(dur * 0.55, () => {
          if (this.dead || corpse.exploded) return;
          corpse.exploded = true; corpse.corpseT = 0;
          Sfx.play("blast");
          Game.addNova(corpse.x, corpse.y, radius, "#90ff70");
          Game.bloodBurst(corpse.x, corpse.y, 16);
          for (let i = 0; i < 8; i++) Game.addParticle(corpse.x, corpse.y, "#cfd8c0");
          Game.fx.shake = Math.max(Game.fx.shake, 3);
          for (const mon of TerrainLayers.targets(Game.state.monsters)) {
            if (mon.dead || U.dist(corpse.x, corpse.y, mon.x, mon.y) > radius + mon.radius) continue;
            const r = this.spellRoll(sk, rk);
            this.spellHit(mon, r.dmg, "poison", { crit: r.crit });
          }
        });
        return true;
      }
      case "spellnova": {
        this.pay(sk, rk);
        const dur = this.beginCast(sk, target || point);
        const radius = sk.radius(rk), slowPct = sk.slowPct ? sk.slowPct(rk) : 0, slowDur = sk.slowDur ? sk.slowDur(rk) : 0;
        this.afterActionDelay(dur * 0.6, () => {
          if (this.dead) return;
          Sfx.play(sk.sound || "frost");
          const novaCol = sk.elem === "cold" ? "#9fd8ff" : sk.elem === "earth" ? "#c0a060" : "#fff080";
          Game.addNova(this.x, this.y, radius, novaCol);
          if (sk.elem === "earth") Game.fx.shake = Math.max(Game.fx.shake, 4);
          for (let i = 0; i < 14; i++) Game.addParticle(this.x + U.rf(-1, 1), this.y + U.rf(-1, 1), novaCol);
          for (const mon of TerrainLayers.targets(Game.state.monsters)) {
            if (mon.dead || U.dist(this.x, this.y, mon.x, mon.y) > radius + mon.radius) continue;
            const r = this.spellRoll(sk, rk);
            this.spellHit(mon, r.dmg, sk.elem, { crit: r.crit, chill: slowDur });
            if (slowPct) mon.applySlow(slowDur, slowPct);
            if (sk.stun) mon.stunT = Math.max(mon.stunT, sk.stun(rk));
          }
        });
        return true;
      }
      /* -------- new shared mechanics -------- */
      case "beam": {
        /* an instant lance of force/energy striking everything along a line */
        let aim = target ? { x: target.x, y: target.y } : point;
        if (!aim) { const [wx, wy] = U.screenVecToWorld(this.visAng); aim = { x: this.x + wx * 5, y: this.y + wy * 5 }; }
        const ang = Math.atan2(aim.y - this.y, aim.x - this.x);
        const useWeapon = !!sk.dmgMult;
        this.pay(sk, rk);
        this.face(aim.x, aim.y);
        let dur;
        if (useWeapon) { dur = 1 / this.stats.attackRate; this.startAction("attack", dur); }
        else dur = this.beginCast(sk, aim);
        const range = sk.range(rk), width = sk.width ? sk.width(rk) : 1.0;
        const ex = this.x + Math.cos(ang) * range, ey = this.y + Math.sin(ang) * range;
        const wMult = useWeapon ? sk.dmgMult(rk) * syn : 0;
        this.afterActionDelay(dur * 0.45, () => {
          if (this.dead) return;
          Sfx.play(sk.sound || (useWeapon ? "swing" : "zap"));
          Game.beamFx(this.x, this.y, ex, ey, sk.beamColor || (sk.elem === "cold" ? "#9fd8ff" : sk.elem === "poison" ? "#90ff70" : sk.elem === "shadow" ? "#c89ae0" : useWeapon ? "#ffe6b0" : "#fff080"));
          Game.fx.shake = Math.max(Game.fx.shake, 2);
          for (const mon of TerrainLayers.targets(Game.state.monsters)) {
            if (mon.dead) continue;
            const t = U.clamp((mon.x - this.x) * Math.cos(ang) + (mon.y - this.y) * Math.sin(ang), 0, range);
            const px = this.x + Math.cos(ang) * t, py = this.y + Math.sin(ang) * t;
            if (U.dist(px, py, mon.x, mon.y) > width + mon.radius) continue;
            if (useWeapon) this.strike(mon, wMult, { auto: true });
            else { const r = this.spellRoll(sk, rk); this.spellHit(mon, r.dmg, sk.elem, { crit: r.crit, burn: sk.burn ? sk.burn(rk) : 0, pdot: sk.pdot ? sk.pdot(rk) : 0, drain: sk.drain ? sk.drain(rk) : 0 }); }
          }
        });
        return true;
      }
      case "heal": {
        this.pay(sk, rk);
        const amt = Math.floor(this.stats.maxHp * (sk.healPct(rk) / 100));
        this.healLife(amt);
        if (sk.buff) {
          const b = sk.buff(rk);
          this.buffs = this.buffs.filter(x => x.id !== b.id);
          this.buffs.push({ id: b.id, label: b.label, emoji: b.emoji, stats: b.stats, until: Game.state.time + b.dur });
          this.computeStats();
        }
        Sfx.play(sk.sound || "potion");
        Game.addNova(this.x, this.y, 1.5, "#80ff90");
        for (let i = 0; i < 12; i++) Game.addParticle(this.x + U.rf(-0.4, 0.4), this.y + U.rf(-0.4, 0.4), "#90ff90");
        Game.addFloat(this.x, this.y, "+" + amt, "#80ff90");
        UI.refreshBuffs();
        return true;
      }
      case "meteor": {
        /* a telegraphed strike that falls a beat after you call it */
        let aim = target ? { x: target.x, y: target.y } : point;
        if (!aim) return false;
        const maxR = sk.castRange(rk);
        const d = U.dist(this.x, this.y, aim.x, aim.y);
        if (d > maxR) { const k = maxR / d; aim = { x: this.x + (aim.x - this.x) * k, y: this.y + (aim.y - this.y) * k }; }
        this.pay(sk, rk);
        const dur = this.beginCast(sk, aim);
        const radius = sk.radius(rk), delay = sk.delay ? sk.delay(rk) : 0.7;
        const spot = aim, col = sk.elem === "cold" ? "#9fd8ff" : sk.elem === "light" ? "#fff080" : sk.elem === "poison" ? "#90ff70" : sk.elem === "shadow" ? "#c89ae0" : "#ff9040";
        /* a visible rock streaks down from the sky onto the target, landing exactly at impact */
        Game.state.fx.push({ surfaceId:TerrainLayers.current(Game.state.map), type: "meteorfall", x: spot.x, y: spot.y, radius, col, ttl: dur * 0.5 + delay, maxTtl: dur * 0.5 + delay });
        this.afterActionDelay(dur * 0.5, () => { if (!this.dead) Sfx.play("firebolt"); });
        this.afterSkillDelay(dur * 0.5 + delay, () => {
          if (this.dead) return;
          Sfx.play(sk.sound || "blast");
          Game.addNova(spot.x, spot.y, radius, col);
          Game.fx.shake = Math.max(Game.fx.shake, 6);
          for (let i = 0; i < 22; i++) Game.addParticle(spot.x + U.rf(-radius, radius) * 0.6, spot.y + U.rf(-radius, radius) * 0.6, col);
          for (const mon of TerrainLayers.targets(Game.state.monsters)) {
            if (mon.dead || U.dist(spot.x, spot.y, mon.x, mon.y) > radius + mon.radius) continue;
            const r = this.spellRoll(sk, rk);
            this.spellHit(mon, r.dmg, sk.elem, { crit: r.crit, burn: sk.burn ? sk.burn(rk) : 0 });
            if (sk.stun) mon.stunT = Math.max(mon.stunT, sk.stun(rk));
          }
        });
        return true;
      }
      /* ===================== VANGUARD ===================== */
      case "combo": {   // Tempo Strike — a weapon hit that builds Tempo
        if (!target) return false;
        this.face(target.x, target.y); this.pay(sk, rk); this.startAction("attack", dur); Sfx.play("swing");
        const mult = sk.dmgMult(rk) * syn;
        this.afterActionDelay(dur * 0.5, () => { if (this.dead || target.dead) return; if (U.dist(this.x, this.y, target.x, target.y) <= this.stats.range + target.radius + 0.4) this.strike(target, mult); });
        const cap = 3 + (this.stats.tempoCapBonus || 0);
        this.tempo = Math.min(cap, (this.tempo || 0) + (sk.tempoGain?.(rk)??1) + (this.stance === "berserk" ? 1 : 0));
        this.tempoUntil = Game.state.time + (sk.tempoDuration?.(rk)??4) + (this.stats.tempoWindowBonus || 0);
        return true;
      }
      case "combo_finish": {   // Sunder Combo — spend Tempo for a shredding fan
        const t = this.tempo || 0;
        if (t < 1) { Game.msg("Build Tempo first.", "#c0a060"); Sfx.play("error"); return false; }
        this.pay(sk, rk);
        let aim = target ? { x: target.x, y: target.y } : point || { x: this.x + Math.cos(this.visAng), y: this.y + Math.sin(this.visAng) };
        this.face(aim.x, aim.y); this.startAction("attack", dur); Sfx.play("swing");
        const a0 = Math.atan2(aim.y - this.y, aim.x - this.x), arc = sk.arc(rk) * (1 + 0.25 * t), mult = sk.dmgMult(rk) * (0.6 + 0.35 * t) * syn, range = sk.range(rk);
        this.afterActionDelay(dur * 0.5, () => {
          if (this.dead) return;
          for (const mon of TerrainLayers.targets(Game.state.monsters)) { if (mon.dead) continue; if (U.dist(this.x, this.y, mon.x, mon.y) > range + mon.radius) continue; let da = Math.abs(Math.atan2(mon.y - this.y, mon.x - this.x) - a0); if (da > Math.PI) da = Math.PI * 2 - da; if (da <= arc / 2) { const dealt=this.strike(mon, mult); if(mon.imperialCombat&&!dealt)continue; mon.sunder = { until: Game.state.time + sk.shredDur(rk), stacks: Math.min(3, ((mon.sunder && mon.sunder.stacks) || 0) + t) }; } }
          Game.addNova(this.x, this.y, range, "#e6e6e6");
        });
        this.tempo = Math.min(t,sk.tempoRetain?.(rk)??0);
        return true;
      }
      case "execute": {   // Headtaker — Tempo finisher that beheads the weak
        if (!target) return false;
        if (this.skillCd[skillId] && Game.state.time < this.skillCd[skillId]) { Game.msg("Headtaker not ready.", "#c0a060"); return false; }
        this.pay(sk, rk); this.face(target.x, target.y); this.startAction("attack", dur); Sfx.play("swing");
        const t = this.tempo || 0, thresh = sk.baseThresh(rk) + 0.05 * t, mainMult = (sk.base(rk) + sk.missingHpBonus(rk) * (1 - target.hp / target.maxHp)) * syn;
        this.skillCd[skillId] = Game.state.time + sk.cd(rk); this.tempo = 0;
        this.afterActionDelay(dur * 0.5, () => {
          if (this.dead || target.dead) return;
          if (!target.isBoss && target.hp / target.maxHp <= thresh) { Game.addNova(target.x, target.y, 1.6, "#c01818"); Game.fx.hitPause = Math.max(Game.fx.hitPause, 0.08); Game.bloodBurst(target.x, target.y, 18); target.takeDamage(1e9, this); }
          else this.strike(target, mainMult);
          if (t >= 2) for (const mon of TerrainLayers.targets(Game.state.monsters)) { if (mon !== target && !mon.dead && U.dist(target.x, target.y, mon.x, mon.y) < 1.8) this.strike(mon, mainMult * 0.5, { auto: true }); }
          if (target.dead) { this.tempo = Math.min(3 + (this.stats.tempoCapBonus || 0), this.tempo + 2); this.skillCd[skillId] = 0; }
        });
        return true;
      }
      case "shout": {   // Rallying Cry — heal + cleanse + run
        this.pay(sk, rk);
        const heal = Math.floor(this.stats.maxHp * sk.healPct(rk) / 100);
        this.healLife(heal); this.slowT = 0; this.slowPct = 0;
        this.buffs = this.buffs.filter(b => b.id !== "rally_run");
        this.buffs.push({ id: "rally_run", label: "Rally", emoji: "📯", stats: { frw: sk.runPct(rk) }, until: Game.state.time + sk.rallyDur(rk) });
        this.computeStats();
        for (const mi of TerrainLayers.targets(Game.state.minions)) if (!mi.dead && U.dist(this.x, this.y, mi.x, mi.y) < sk.radius(rk)) mi.hp = Math.min(mi.maxHp, mi.hp + mi.maxHp * (sk.allyHealPct?.(rk)??25)/100);
        Sfx.play("roar"); Game.addNova(this.x, this.y, sk.radius(rk), "#ffe6b0"); Game.addFloat(this.x, this.y, "+" + heal, "#80ff90");
        return true;
      }
      case "fear": {   // Terrifying Bellow (load-bearing id terrifying_bellow)
        this.pay(sk, rk); this.startAction("attack", dur * 0.8); Sfx.play("roar");
        const R = sk.radius(rk);
        Game.addNova(this.x, this.y, R, "#b070d0"); Game.fx.shake = Math.max(Game.fx.shake, 3);
        for (const mon of TerrainLayers.targets(Game.state.monsters)) { if (mon.dead || U.dist(this.x, this.y, mon.x, mon.y) > R + mon.radius) continue; if (mon.isBoss) mon.applySlow(sk.dur(rk), 50); else { mon.feared = Game.state.time + sk.dur(rk); mon.aggro = true; } if(sk.fearWeaken?.(rk)>0)mon.curseWither={owner:this,until:Game.state.time+sk.dur(rk),pct:sk.fearWeaken(rk)}; }
        return true;
      }
      case "combat_stance": case "parry_stance": {   // Berserker / Bulwark / Riposte (toggle)
        if (this.stance === sk.stanceId) { this.clearStance(); Sfx.play("click"); return true; }
        this.pay(sk, rk);
        this.buffs = this.buffs.filter(b => !b.id.startsWith("stance_"));
        this.stance = sk.stanceId;
        const bid = "stance_" + sk.stanceId;
        if (sk.type === "parry_stance") { this.riposteData = { mult: sk.riposteMult(rk), stun: sk.stunDur(rk), drain: sk.drainPerSec(rk), refund: sk.parryRefund?.(rk)??4, window: sk.parryWindow?.(rk)??0.6 }; this.buffs.push({ id: bid, label: sk.name, emoji: "🜛", stats: {}, until: Game.state.time + 99999 }); }
        else { if (sk.stanceId === "bulwark") this.bulwarkArmor = sk.rootArmor ? sk.rootArmor(rk) : 0.3; this.buffs.push({ id: bid, label: sk.name, emoji: "🜛", stats: sk.stats(rk), until: Game.state.time + 99999 }); }
        this.computeStats(); Sfx.play("roar"); if (UI.refreshBuffs) UI.refreshBuffs();
        Game.addNova(this.x, this.y, 1.4, sk.stanceId === "berserk" ? "#e05040" : sk.stanceId === "bulwark" ? "#8a8a90" : "#cfe0ff");
        return true;
      }
      case "charge": {   // Bull Charge — barrel through a lane
        let aim = target ? { x: target.x, y: target.y } : point; if (!aim) return false;
        const d = U.dist(this.x, this.y, aim.x, aim.y) || 1, maxR = sk.chargeRange(rk);
        const tx = d > maxR ? this.x + (aim.x - this.x) / d * maxR : aim.x, ty = d > maxR ? this.y + (aim.y - this.y) / d * maxR : aim.y;
        if (!MapGen.walkable(Game.state.map, tx, ty)) { Game.msg("No room to charge.", "#9a9a9a"); return false; }
        this.pay(sk, rk); this.face(tx, ty); Sfx.play("swing");
        this.charging = { fx: this.x, fy: this.y, tx, ty, t: 0, dur: Math.max(0.25, U.dist(this.x, this.y, tx, ty) / 16), mult: sk.mult(rk) * syn, width: sk.width(rk), kb: sk.kbForce(rk), stunDur: sk.stunDur(rk), hit: new Set(), first: true };
        return true;
      }
      case "grapple": {   // Harpoon Chain — yank a foe in (or pull self to a boss)
        if (!target) return false;
        if (U.dist(this.x, this.y, target.x, target.y) > sk.grappleRange(rk)) { Game.msg("Out of reach.", "#9a9a9a"); return false; }
        this.pay(sk, rk); Game.beamFx(this.x, this.y, target.x, target.y, "#b8c2cc"); Sfx.play("swing");
        if (target.isBoss) this.charging = { fx: this.x, fy: this.y, tx: target.x, ty: target.y, t: 0, dur: 0.3, mult: sk.mult(rk) * syn, width: 1.0, kb: 0, stunDur: 0, hit: new Set([target]), first: false };
        else { const a = Math.atan2(this.y - target.y, this.x - target.x); target.pulled = { fx: target.x, fy: target.y, tx: this.x + Math.cos(a) * 1.0, ty: this.y + Math.sin(a) * 1.0, t: 0, dur: 0.25, stun: sk.stunDur(rk), mult: sk.mult(rk) * syn, owner: this }; }
        return true;
      }
      case "thrown": {   // Returning Axe — boomerang weapon
        let aim = target ? { x: target.x, y: target.y } : point; if (!aim) { const [wx, wy] = U.screenVecToWorld(this.visAng); aim = { x: this.x + wx * 5, y: this.y + wy * 5 }; }
        this.pay(sk, rk); this.face(aim.x, aim.y); this.startAction("attack", dur); Sfx.play("swing");
        const n = sk.count(rk), a0 = Math.atan2(aim.y - this.y, aim.x - this.x), mult = sk.mult(rk) * syn, rng = sk.throwRange(rk);
        for (let i = 0; i < n; i++) { const a = a0 + (i - (n - 1) / 2) * 0.13; Game.spawnProjectile({ visualOwner:this, x: this.x, y: this.y, tx: this.x + Math.cos(a) * rng, ty: this.y + Math.sin(a) * rng, speed: 11, kind: "thrownaxe", fromPlayer: true, mult, pierce: true, boomerang: { maxRange: rng, fromX: this.x, fromY: this.y, returning: false } }); }
        return true;
      }
      case "shockwave": {   // Seismic Slam (id ground_slam) / Fissure — a travelling crack
        let aim = target ? { x: target.x, y: target.y } : point; if (!aim) { const [wx, wy] = U.screenVecToWorld(this.visAng); aim = { x: this.x + wx, y: this.y + wy }; }
        this.pay(sk, rk); this.face(aim.x, aim.y); this.startAction("attack", dur * 0.9);
        const ang = Math.atan2(aim.y - this.y, aim.x - this.x), len = sk.range(rk), step = 1.0, stepR = sk.waveWidth ? sk.waveWidth(rk) : 1.5;
        const weapon = !!sk.mult, mult = weapon ? sk.mult(rk) * syn : 0, hitset = new Set();
        Sfx.play("slam"); Game.fx.shake = Math.max(Game.fx.shake, 4);
        const baseX = this.x, baseY = this.y, N = Math.ceil(len / step);
        /* a jagged crack tears open along the line (drawn in the fx pass) */
        Game.state.fx.push({ surfaceId:TerrainLayers.current(Game.state.map), type: "fissure", x0: baseX, y0: baseY, ang, len, visualWidth:stepR, ttl: 0.75, maxTtl: 0.75, seed: ((baseX * 13 + baseY * 7) | 0) });
        for (let i = 0; i <= N; i++) {
          const ex = baseX + Math.cos(ang) * (i * step), ey = baseY + Math.sin(ang) * (i * step);
          this.afterSkillDelay(i * 0.05, () => {
            if (this.dead) return;
            Game.addNova(ex, ey, 0.7, "#8a6a3a"); Game.fx.shake = Math.max(Game.fx.shake, 2);
            for (let d = 0; d < 4; d++) Game.addParticle(ex + U.rf(-0.45, 0.45), ey + U.rf(-0.45, 0.45), d % 2 ? "#7a6242" : "#5a4a36");   // dust + rock shards
            for (const mon of TerrainLayers.targets(Game.state.monsters)) { if (mon.dead || hitset.has(mon)) continue; if (U.dist(ex, ey, mon.x, mon.y) < stepR + mon.radius) { hitset.add(mon); if (weapon) this.strike(mon, mult, { auto: true }); else this.spellHit(mon, this.spellRoll(sk, rk).dmg, sk.elem || "earth", {}); mon.stunT = Math.max(mon.stunT, sk.stun(rk)); } }
          });
        }
        return true;
      }
      case "bash": {   // Shield Breaker — frontal knockback cone
        let aim = target ? { x: target.x, y: target.y } : point; if (!aim) { const [wx, wy] = U.screenVecToWorld(this.visAng); aim = { x: this.x + wx, y: this.y + wy }; }
        this.pay(sk, rk); this.face(aim.x, aim.y); this.startAction("attack", dur); Sfx.play("swing");
        const a0 = Math.atan2(aim.y - this.y, aim.x - this.x), arc = sk.arc(rk), range = sk.range(rk), mult = sk.dmgMult(rk) * syn, kb = sk.knockback(rk);
        this.afterActionDelay(dur * 0.5, () => {
          if (this.dead) return;
          for (const mon of TerrainLayers.targets(Game.state.monsters)) { if (mon.dead) continue; if (U.dist(this.x, this.y, mon.x, mon.y) > range + mon.radius) continue; let da = Math.abs(Math.atan2(mon.y - this.y, mon.x - this.x) - a0); if (da > Math.PI) da = Math.PI * 2 - da; if (da <= arc / 2) { const dealt=this.strike(mon, mult); if(mon.imperialCombat&&!dealt)continue; const bx = mon.x, by = mon.y; Game.knockMonster(mon, this.x, this.y, kb); const moved = U.dist(bx, by, mon.x, mon.y); mon.stunT = Math.max(mon.stunT, moved < kb * 0.5 ? 1.4 : 0.6); } }
          Game.fx.shake = Math.max(Game.fx.shake, 3);
        });
        return true;
      }
      case "banner": case "banner_ultimate": {   // War Banner / Standard of the Last Stand
        let aim = point || (target ? { x: target.x, y: target.y } : { x: this.x, y: this.y });
        if (!MapGen.walkable(Game.state.map, aim.x, aim.y)) aim = { x: this.x, y: this.y };
        this.pay(sk, rk);
        Game.state.fx = Game.state.fx.filter(f => !(f.type === "banner" && f.tag === sk.id && f.owner===this));
        Game.state.fx.push({ surfaceId:TerrainLayers.current(Game.state.map), type: "banner", tag: sk.id, x: aim.x, y: aim.y, radius: sk.radius(rk), ttl: sk.dur(rk), maxTtl: sk.dur(rk), tickEvery: 0.3,
          allyDmg: sk.allyDmg ? sk.allyDmg(rk) : 10, allyIas: sk.allyIas ? sk.allyIas(rk) : 8, enemyDmg: sk.enemyDmg ? sk.enemyDmg(rk) : 12,
          heal: sk.type === "banner_ultimate" ? (sk.heal ? sk.heal(rk) : 4) : (sk.bannerHeal?.(rk)??0), kindCol: sk.type === "banner_ultimate" ? "#ffe6a0" : "#d8b84a", owner: this });
        Sfx.play("roar"); Game.addNova(aim.x, aim.y, 1.2, "#ffe6b0");
        return true;
      }
      case "warshout_debuff": {   // Sundering Roar — strip + shred + slow, no damage
        this.pay(sk, rk); this.startAction("attack", dur * 0.8); Sfx.play("roar");
        const R = sk.radius(rk);
        Game.addNova(this.x, this.y, R, "#d8b84a"); Game.fx.shake = Math.max(Game.fx.shake, 2);
        for (const mon of TerrainLayers.targets(Game.state.monsters)) { if (mon.dead || U.dist(this.x, this.y, mon.x, mon.y) > R + mon.radius) continue; const duration=sk.debuffDuration?.(rk)??6; mon.sunder = { until: Game.state.time + duration, stacks: Math.min(3, ((mon.sunder && mon.sunder.stacks) || 0) + 2) }; mon.applySlow(duration, sk.roarSlow?.(rk)??15); if(sk.roarWeaken?.(rk)>0)mon.curseWither={owner:this,until:Game.state.time+duration,pct:sk.roarWeaken(rk)}; }
        return true;
      }
      /* ===================== EMBER WITCH ===================== */
      case "firewall": {   // Wall of Fire — persistent burning line perpendicular to aim
        let aim = target ? { x: target.x, y: target.y } : point; if (!aim) return false;
        const maxR = sk.castRange(rk), d = U.dist(this.x, this.y, aim.x, aim.y);
        if (d > maxR) { const k = maxR / d; aim = { x: this.x + (aim.x - this.x) * k, y: this.y + (aim.y - this.y) * k }; }
        this.pay(sk, rk); const dur0 = this.beginCast(sk, aim);
        const len = sk.len(rk), dm = sk.dmg(rk), ang = Math.atan2(aim.y - this.y, aim.x - this.x) + Math.PI / 2, ax = aim.x, ay = aim.y;
        this.afterActionDelay(dur0 * 0.4, () => { if (this.dead) return; Sfx.play("blast"); const fwx0 = ax - Math.cos(ang) * len / 2, fwy0 = ay - Math.sin(ang) * len / 2, fwx1 = ax + Math.cos(ang) * len / 2, fwy1 = ay + Math.sin(ang) * len / 2; Game.state.fx.push({ surfaceId:TerrainLayers.current(Game.state.map), type: "firewall", x: ax, y: ay, x0: fwx0, y0: fwy0, x1: fwx1, y1: fwy1, width: 0.8, ttl: sk.dur(rk), maxTtl: sk.dur(rk), tickEvery: 0.4, lo: dm[0], hi: dm[1], owner: this }); Game.breakPropsSeg(fwx0, fwy0, fwx1, fwy1, 1.0); });
        return true;
      }
      case "pyreblast": {   // Pyre — detonation that devours Scorch stacks
        let aim = target ? { x: target.x, y: target.y } : point; if (!aim) return false;
        const maxR = sk.castRange(rk), d = U.dist(this.x, this.y, aim.x, aim.y);
        if (d > maxR) { const k = maxR / d; aim = { x: this.x + (aim.x - this.x) * k, y: this.y + (aim.y - this.y) * k }; }
        this.pay(sk, rk); const dur0 = this.beginCast(sk, aim); const radius = sk.radius(rk), spot = aim, perStack = sk.perStack ? sk.perStack(rk) : 5 + 2 * rk;
        const chainCh = sk.pyreChance?.(rk)??(0.10 + 0.02 * rk);
        const blast = (at, allowChain) => {
          if (this.dead) return;
          Sfx.play("blast"); Game.addNova(at.x, at.y, radius, "#ff9040"); Game.addNova(at.x, at.y, radius * 0.6, "#ffe27a"); Game.fx.shake = Math.max(Game.fx.shake, 4);
          /* a roaring pyre column erupts on the spot (drawn over the actors) */
          Game.state.fx.push({ surfaceId:TerrainLayers.current(Game.state.map), type: "pyre", x: at.x, y: at.y, radius, ttl: 0.6, maxTtl: 0.6 });
          for (let i = 0; i < 24; i++) Game.addParticle(at.x + U.rf(-radius, radius) * 0.5, at.y + U.rf(-radius, radius) * 0.5, i % 3 ? "#ff9040" : "#ffe27a");
          let consumed = 0;
          for (const mon of TerrainLayers.targets(Game.state.monsters)) {
            if (mon.dead || U.dist(at.x, at.y, mon.x, mon.y) > radius + mon.radius) continue;
            let dmg = this.spellRoll(sk, rk).dmg;
            if (mon.scorch) { dmg += perStack * mon.scorch.stacks; consumed += mon.scorch.stacks; mon.scorch = null; }
            this.spellHit(mon, dmg, "fire", { burn: 2 });
          }
          if (allowChain && consumed > 0) {   // roll once per devoured stack; each success re-detonates here (follow-ups don't re-chain)
            let extra = 0; for (let i = 0; i < consumed; i++) if (Math.random() < chainCh) extra++;
            for (let e = 0; e < extra; e++) this.afterActionDelay(0.18 * (e + 1), () => blast(at, false));
          }
        };
        this.afterActionDelay(dur0 * 0.55, () => blast(spot, true));
        return true;
      }
      case "freezenova": {   // Frost Nova — cold ring + true freeze
        this.pay(sk, rk); const dur0 = this.beginCast(sk, target || point); const radius = sk.radius(rk), fr = sk.freeze(rk);
        this.afterActionDelay(dur0 * 0.5, () => {
          if (this.dead) return; Sfx.play("frost"); Game.addNova(this.x, this.y, radius, "#9fd8ff");
          for (let i = 0; i < 14; i++) Game.addParticle(this.x + U.rf(-1, 1), this.y + U.rf(-1, 1), "#cfeaff");
          for (const mon of TerrainLayers.targets(Game.state.monsters)) { if (mon.dead || U.dist(this.x, this.y, mon.x, mon.y) > radius + mon.radius) continue; const r = this.spellRoll(sk, rk); this.spellHit(mon, r.dmg, "cold", { crit: r.crit }); mon.frozen = Game.state.time + fr; mon.freezeOwner=this; mon.stunT = Math.max(mon.stunT, fr); }
        });
        return true;
      }
      case "balllightning": {   // Ball Lightning — slow drifting plasma orb that discharges arcs
        let aim = target ? { x: target.x, y: target.y } : point; if (!aim) { const [wx, wy] = U.screenVecToWorld(this.visAng); aim = { x: this.x + wx * 5, y: this.y + wy * 5 }; }
        this.pay(sk, rk); const dur0 = this.beginCast(sk, aim); const dm = sk.dmg(rk), a = Math.atan2(aim.y - this.y, aim.x - this.x), bx = this.x, by = this.y;
        this.afterActionDelay(dur0 * 0.5, () => { if (this.dead) return; Sfx.play("zap"); Game.state.fx.push({ surfaceId:TerrainLayers.current(Game.state.map), type: "cyclone", orb: true, x: bx, y: by, vx: Math.cos(a) * 2.5, vy: Math.sin(a) * 2.5, ttl: sk.dur(rk), radius: sk.orbRadius?.(rk)??3.0, tickEvery: sk.orbTick?.(rk)??0.35, drift: 0, lo: dm[0], hi: dm[1], pull: 0, owner: this }); });
        return true;
      }
      case "arcblink": {   // Arc Teleport — blink then burst on arrival
        let aim = point || (target ? { x: target.x, y: target.y } : null); if (!aim) return false;
        const maxR = sk.blinkRange(rk), d = U.dist(this.x, this.y, aim.x, aim.y);
        const tx = d > maxR ? this.x + (aim.x - this.x) / d * maxR : aim.x, ty = d > maxR ? this.y + (aim.y - this.y) / d * maxR : aim.y;
        if (!MapGen.walkable(Game.state.map, tx, ty)) { Game.msg("The arc fizzles.", "#9a9a9a"); return false; }
        this.pay(sk, rk);
        for (let i = 0; i < 8; i++) Game.addParticle(this.x + U.rf(-0.3, 0.3), this.y + U.rf(-0.3, 0.3), "#fff080");
        this.x = tx; this.y = ty; this._animationController?.reset(); this.path = null; Sfx.play("zap");
        const radius = sk.radius(rk);
        Game.addNova(this.x, this.y, radius, "#fff080"); Game.fx.shake = Math.max(Game.fx.shake, 2);
        for (const mon of TerrainLayers.targets(Game.state.monsters)) { if (mon.dead || U.dist(this.x, this.y, mon.x, mon.y) > radius + mon.radius) continue; const r = this.spellRoll(sk, rk); this.spellHit(mon, r.dmg, "light", { crit: r.crit }); Game.lightningBolt(this.x, this.y, mon.x, mon.y); }
        return true;
      }
      case "overloadnuke": {   // Overload — dump all Static into one blast
        this.pay(sk, rk); const dur0 = this.beginCast(sk, null); const st0 = this.staticChg || 0, radius = sk.radius(rk), per = sk.perStatic ? sk.perStatic(rk) : 3 + rk;
        this.staticChg = Math.floor(st0*(sk.staticRetain?.(rk)??0));
        this.afterActionDelay(dur0 * 0.5, () => {
          if (this.dead) return; Sfx.play("blast"); Game.addNova(this.x, this.y, radius, "#fff080"); Game.fx.shake = Math.max(Game.fx.shake, 6 + Math.min(6, st0 * 0.3));
          for (let i = 0; i < 20; i++) Game.addParticle(this.x + U.rf(-radius, radius) * 0.5, this.y + U.rf(-radius, radius) * 0.5, "#fff080");
          for (const mon of TerrainLayers.targets(Game.state.monsters)) { if (mon.dead || U.dist(this.x, this.y, mon.x, mon.y) > radius + mon.radius) continue; const r = this.spellRoll(sk, rk); this.spellHit(mon, r.dmg + per * st0, "light", { crit: r.crit }); mon.stunT = Math.max(mon.stunT, Math.min(1.0, st0 * 0.05)); }
        });
        return true;
      }
      /* ============ SHARED GROUND FIELDS (Witch / Ranger / Gravebinder / Wildkeeper) ============ */
      case "groundfield": {
        let aim = target ? { x: target.x, y: target.y } : point; if (!aim) aim = { x: this.x, y: this.y };
        const maxR = sk.castRange ? sk.castRange(rk) : 9, d = U.dist(this.x, this.y, aim.x, aim.y);
        if (d > maxR) { const k = maxR / d; aim = { x: this.x + (aim.x - this.x) * k, y: this.y + (aim.y - this.y) * k }; }
        this.pay(sk, rk); const dur0 = this.beginCast(sk, aim); const kind = sk.fieldKind, dm = sk.dmg ? sk.dmg(rk) : [0, 0];
        const col = { inferno: "#ff9040", glacier: "#9fd8ff", static: "#fff080", miasma: "#90ff70", caltrop: "#c8c8c8", smoke: "#9aa0a8", snare: "#6aa84a", spore: "#b8d870", quake: "#c0a060", regrowth: "#80ff90" }[kind] || "#ffffff";
        const f = { type: "groundfield", fieldKind: kind, x: aim.x, y: aim.y, radius: sk.radius(rk), ttl: sk.dur(rk), maxTtl: sk.dur(rk), tickEvery: (typeof sk.tickEvery === "function" ? sk.tickEvery(rk) : (sk.tickEvery || 0.5)), lo: dm[0], hi: dm[1], owner: this,
          slowPct: sk.slowPct ? sk.slowPct(rk) : 0, selfDodge: sk.selfDodge ? sk.selfDodge(rk) : 0, weakenPct: sk.weakenPct ? sk.weakenPct(rk) : 0, heal: sk.heal ? sk.heal(rk) : 0 };
        if (kind === "caltrop") f.snareMult = this.snareDamageScale(sk);
        if (kind === "spore") { const a = Math.atan2(aim.y - this.y, aim.x - this.x); f.vx = Math.cos(a) * 0.6; f.vy = Math.sin(a) * 0.6; }
        if (["inferno", "glacier", "static"].includes(kind)) Game.state.fx = Game.state.fx.filter(g => !(g.type === "groundfield" && g.fieldKind === kind && g.owner===this));
        this.afterActionDelay(dur0 * 0.5, () => { if (this.dead) return; Sfx.play(kind === "glacier" ? "frost" : kind === "static" ? "zap" : "blast"); Game.addNova(aim.x, aim.y, f.radius, col); Game.state.fx.push(Object.assign(f,{surfaceId:TerrainLayers.current(Game.state.map)})); });
        return true;
      }
      /* ===================== GRAVEBINDER ===================== */
      case "ward": {   // Bone Armor — absorb shield + gore
        this.pay(sk, rk);
        this.boneWard = { hp: sk.shield(rk), until: Game.state.time + sk.dur(rk), retal: sk.retal(rk) };
        Sfx.play("vox_bone"); Game.addNova(this.x, this.y, 1.4, "#cfd8c0");
        for (let i = 0; i < 8; i++) Game.addParticle(this.x + U.rf(-0.4, 0.4), this.y + U.rf(-0.4, 0.4), "#cfd8c0");
        return true;
      }
      case "sacrifice": {   // Sacrificial Pyre (all) / Blood of the Pack (one)
        const mode = sk.mode || "all", beasts = TerrainLayers.targets(Game.state.minions).filter(m => !m.dead&&m.owner===this);
        if (!beasts.length) { Game.msg(mode === "one" ? "No beast to give." : "You have no servants to sacrifice.", "#9a9a9a"); return false; }
        this.pay(sk, rk); Sfx.play("blast");
        if (mode === "all") {
          const radius = sk.radius(rk), dm = sk.dmg(rk);
          for (const mi of beasts) {
            const sizeMult = mi.kindId === "bone_golem" ? 2.0 : mi.isArcher ? 0.7 : 1.0, dmg = U.rf(dm[0], dm[1]) * (mi.hp / mi.maxHp) * sizeMult;
            Game.addNova(mi.x, mi.y, radius, "#90ff70");
            for (const mon of TerrainLayers.targets(Game.state.monsters)) { if (mon.dead || U.dist(mi.x, mi.y, mon.x, mon.y) > radius + mon.radius) continue; this.spellHit(mon, dmg, "poison", {}); }
            const cx = mi.x, cy = mi.y; mi.die(); Game.spawnCorpse(cx, cy, 12);
          }
          Game.fx.shake = Math.max(Game.fx.shake, Math.min(8, 2 + beasts.length));
        } else {
          let best = null, bd = (sk.castRange ? sk.castRange(rk) : 9) ** 2;
          for (const mi of beasts) { const dd = U.dist2(this.x, this.y, mi.x, mi.y); if (dd < bd) { bd = dd; best = mi; } }
          if (!best) { Game.msg("No beast near enough.", "#9a9a9a"); return false; }
          const cx = best.x, cy = best.y, healAmt = this.stats.maxHp * sk.healPct(rk) / 100;
          best.die(); this.healLife(healAmt);
          for (const mi of TerrainLayers.targets(Game.state.minions)) if (!mi.dead) mi.hp = Math.min(mi.maxHp, mi.hp + mi.maxHp * 0.2);
          Game.state.fx.push({ surfaceId:TerrainLayers.current(Game.state.map), type: "groundfield", fieldKind: "regrowth", x: cx, y: cy, radius: sk.fieldRadius ? sk.fieldRadius(rk) : 2.6, ttl: sk.fieldTtl ? sk.fieldTtl(rk) : 6, maxTtl: sk.fieldTtl ? sk.fieldTtl(rk) : 6, tickEvery: 0.5, heal: sk.fieldHeal ? sk.fieldHeal(rk) : 3, owner: this });
          Game.addNova(cx, cy, 1.6, "#90ff70"); Game.addFloat(this.x, this.y, "+" + Math.floor(healAmt), "#80ff90");
        }
        return true;
      }
      case "siphon_beam": {   // Soul Siphon — maintained life-tether
        let first = target;
        if (!first) { let bd = 81; for (const m of TerrainLayers.targets(Game.state.monsters)) { if (m.dead) continue; const dd = U.dist2(this.x, this.y, m.x, m.y); if (dd < bd) { bd = dd; first = m; } } }
        if (!first) { Game.msg("Nothing to siphon.", "#9a9a9a"); return false; }
        this.pay(sk, rk);
        this.siphon = { target: first, ramp: 0, until: Game.state.time + sk.maxChannel(rk), tickT: 0, tickRate: sk.tickRate(rk), tickDmg: sk.tickDmg(rk), drain: sk.drain(rk), manaPerSec: sk.manaPerSec ? sk.manaPerSec(rk) : 2 };
        Sfx.play("curse");
        return true;
      }
      case "doom": {   // Doom — a charging death-timer
        if (!target) { const ap = point || { x: this.x, y: this.y }; let bd = 64; for (const m of TerrainLayers.targets(Game.state.monsters)) { if (m.dead) continue; const dd = U.dist2(ap.x, ap.y, m.x, m.y); if (dd < bd) { bd = dd; target = m; } } }
        if (!target) return false;
        this.pay(sk, rk); const dur0 = this.beginCast(sk, target), timer = sk.timer(rk) * (1 + (this.stats.curseDurPct || 0) / 100);
        target.doom = { owner:this, until: Game.state.time + dur0 + timer, charge: 0, maxCharge: timer, dmgLo: sk.dmgLo(rk), dmgHi: sk.dmgHi(rk), radius: sk.radius(rk) * (1 + (this.stats.curseRadiusPct || 0) / 100) };
        Sfx.play("curse"); Game.addParticle(target.x, target.y, "#9a40c0");
        return true;
      }
      case "taunt_curse": {   // Hex of Beckoning — stampede to a mark
        let aim = point || (target ? { x: target.x, y: target.y } : null); if (!aim) return false;
        this.pay(sk, rk); const dur0 = this.beginCast(sk, aim);
        const radius = sk.radius(rk) * (1 + (this.stats.curseRadiusPct || 0) / 100), dur = sk.dur(rk) * (1 + (this.stats.curseDurPct || 0) / 100), spot = aim;
        this.afterActionDelay(dur0 * 0.5, () => { if (this.dead) return; Sfx.play("curse"); Game.addNova(spot.x, spot.y, radius, "#9a40c0"); for (const mon of TerrainLayers.targets(Game.state.monsters)) { if (mon.dead || U.dist(spot.x, spot.y, mon.x, mon.y) > radius + mon.radius) continue; mon.beckon = { until: Game.state.time + dur, x: spot.x, y: spot.y }; } });
        return true;
      }
      case "plague_seed": {   // Contagion — self-spreading plague
        if (!target) { const ap = point || { x: this.x, y: this.y }; let bd = 64; for (const m of TerrainLayers.targets(Game.state.monsters)) { if (m.dead) continue; const dd = U.dist2(ap.x, ap.y, m.x, m.y); if (dd < bd) { bd = dd; target = m; } } }
        if (!target) return false;
        this.pay(sk, rk); const dur0 = this.beginCast(sk, target);
        this.applyPlague(target, { until: Game.state.time + dur0 + sk.dur(rk), tick: sk.tick(rk), tickT: 0, spreadCd: 1.5, spreadRange: sk.spreadRange(rk), burstRange: sk.burstRange(rk) });
        Sfx.play("curse"); Game.addParticle(target.x, target.y, "#90ff70");
        return true;
      }
      case "devour": {   // Devour Corpse — heal + cleanse
        const aim = target ? { x: target.x, y: target.y } : point || { x: this.x, y: this.y };
        const searchRadius=sk.devourRadius?.(rk)??9;
        let corpse = null, bd = searchRadius**2; for (const mon of TerrainLayers.targets(Game.state.monsters)) { if (!mon.dead || mon.corpseT <= 0 || mon.exploded) continue; const dd = U.dist2(aim.x, aim.y, mon.x, mon.y); if (dd < bd) { bd = dd; corpse = mon; } }
        if (!corpse) corpse = Game.corpseFromGrave(this, aim, searchRadius);
        if (!corpse) { Game.msg("No corpse or grave to devour.", "#9a9a9a"); return false; }
        this.pay(sk, rk); corpse.exploded = true; corpse.corpseT = 0;
        const heal = this.stats.maxHp * sk.healPct(rk) / 100; this.healLife(heal); this.slowT = 0; this.slowPct = 0; this.poisonDot = null;
        for (const mi of TerrainLayers.targets(Game.state.minions)) if (!mi.dead && U.dist(this.x, this.y, mi.x, mi.y) < 4) mi.hp = Math.min(mi.maxHp, mi.hp + mi.maxHp * (sk.devourMinionHeal?.(rk)??10)/100);
        this.mana=Math.min(this.stats.maxMana,this.mana+this.stats.maxMana*(sk.devourMana?.(rk)??0)/100);
        Sfx.play("potion"); Game.addNova(this.x, this.y, 1.5, "#90ff70"); Game.addFloat(this.x, this.y, "+" + Math.floor(heal), "#80ff90");
        return true;
      }
      case "corpse_launch": {   // Corpse Spear — hurl a cadaver-javelin
        const aim = target ? { x: target.x, y: target.y } : point; if (!aim) return false;
        let corpse = null, bd = (sk.castRange ? sk.castRange(rk) : 9) ** 2; for (const mon of TerrainLayers.targets(Game.state.monsters)) { if (!mon.dead || mon.corpseT <= 0 || mon.exploded) continue; const dd = U.dist2(this.x, this.y, mon.x, mon.y); if (dd < bd) { bd = dd; corpse = mon; } }
        if (!corpse) corpse = Game.corpseFromGrave(this, aim, (sk.castRange ? sk.castRange(rk) : 9));
        if (!corpse) { Game.msg("No corpse or grave to hurl.", "#9a9a9a"); return false; }
        this.pay(sk, rk); corpse.exploded = true; corpse.corpseT = 0; const dm = sk.dmg(rk);
        Game.spawnProjectile({ visualOwner:this, x: corpse.x, y: corpse.y, tx: aim.x, ty: aim.y, speed: sk.projSpeed ? sk.projSpeed(rk) : 11, kind: "cadaver", fromPlayer: true, spell: { dmg: U.rf(dm[0], dm[1]) * (1 + this.stats.spellPct / 100), knockback: sk.knockback(rk), sprayRadius: sk.sprayRadius(rk) } });
        Sfx.play("swing");
        return true;
      }
      case "reap": {   // Reaping — a scythe arc that cashes in curses
        let aim = target ? { x: target.x, y: target.y } : point; if (!aim) { const [wx, wy] = U.screenVecToWorld(this.visAng); aim = { x: this.x + wx, y: this.y + wy }; }
        this.pay(sk, rk); this.face(aim.x, aim.y); const dur0 = this.beginCast(sk, aim);
        const a0 = Math.atan2(aim.y - this.y, aim.x - this.x), arc = sk.arc(rk), radius = sk.radius(rk), bonus = sk.bonusVsCursed(rk), reapHeal = sk.reapHeal(rk);
        this.afterActionDelay(dur0 * 0.5, () => {
          if (this.dead) return; Sfx.play("curse"); Game.addNova(this.x, this.y, radius, "#c080e0");
          for (const mon of TerrainLayers.targets(Game.state.monsters)) { if (mon.dead || U.dist(this.x, this.y, mon.x, mon.y) > radius + mon.radius) continue; let da = Math.abs(Math.atan2(mon.y - this.y, mon.x - this.x) - a0); if (da > Math.PI) da = Math.PI * 2 - da; if (da > arc / 2) continue;
            let dmg = this.spellRoll(sk, rk).dmg; const cursed = (mon.curseFrailty && Game.state.time < mon.curseFrailty.until) || (mon.curseWither && Game.state.time < mon.curseWither.until);
            if (cursed) { dmg *= 1 + bonus / 100; this.healLife(reapHeal); mon.curseFrailty = null; mon.curseWither = null; }
            if (mon.doom) Game.detonateDoom(mon);
            this.spellHit(mon, dmg, "shadow", {}); }
        });
        return true;
      }
      case "outbreak": {   // Outbreak — expanding pestilence ring
        this.pay(sk, rk); const dur0 = this.beginCast(sk, null), bx = this.x, by = this.y;
        this.afterActionDelay(dur0 * 0.5, () => { if (this.dead) return; Sfx.play("blast"); Game.state.fx.push({ surfaceId:TerrainLayers.current(Game.state.map), type: "outbreak", x: bx, y: by, r: 0, maxR: sk.maxR(rk), dur: sk.dur(rk), ttl: sk.dur(rk) + 0.5, tick: sk.tick(rk), corpseDmg: sk.corpseDmg(rk), hitMon: new Set(), owner: this }); });
        return true;
      }
      case "summon_golem": {   // Bone Golem — stitched from corpses; re-cast on corpses to feed & grow
        const gatherR = sk.gatherRadius(rk), maxStitch = sk.maxCorpses(rk);
        const existing = TerrainLayers.targets(Game.state.minions).find(m => !m.dead && m.owner===this && m.kindId === "bone_golem");
        const cur = existing ? (existing.stitches || 1) : 0, remaining = maxStitch - cur;
        if (existing && remaining <= 0) { Game.msg(`The golem is already whole (${maxStitch} bones).`, "#9a9a9a"); Sfx.play("error"); return false; }
        /* every cast — including feeding — must consume at least one nearby corpse */
        const corpses = TerrainLayers.targets(Game.state.monsters).filter(m => m.dead && m.corpseT > 0 && !m.exploded && U.dist(this.x, this.y, m.x, m.y) < gatherR).slice(0, remaining);
        for (let need = remaining - corpses.length; need > 0; need--) { const h = Game.corpseFromGrave(this, null, gatherR); if (!h) break; corpses.push(h); }   // gravestones count too
        if (corpses.length === 0) { Game.msg("The Bone Golem needs a corpse or grave nearby.", "#9a9a9a"); Sfx.play("error"); return false; }
        this.pay(sk, rk);
        for (const c of corpses) { c.exploded = true; c.corpseT = 0; }
        const used = corpses.length;
        const recompute = mi => {
          const st = mi.stitches || 1;
          mi.maxHp = Math.floor(((sk.golemHp?.(rk)??(100 + 30 * rk)) + sk.growHp(rk) * (st - 1)) * (1 + this.stats.minionHpPct / 100)); mi.hp = mi.maxHp;
          const dm = sk.slamDmg(rk), bonus = sk.growDmg(rk) * (st - 1);
          mi.dmg = [Math.round(dm[0] + bonus), Math.round(dm[1] + bonus)]; mi.slamDmg = mi.dmg;
          mi.tier = st; mi.spriteOpts.scale = 1.0 + (st - 1) * 0.12; mi.radius = 0.5 + (st - 1) * 0.03;
        };
        if (existing) {
          existing.stitches = cur + used; existing.maxStitch = maxStitch; recompute(existing);
          if(typeof SkillVFX!=='undefined')for(const corpse of corpses)SkillVFX.transfer(this,skillId,corpse,existing);
          Game.addNova(existing.x, existing.y, 1.6, "#cfd8c0"); Game.dustPuff(existing.x, existing.y); for (let i = 0; i < 8; i++) Game.addParticle(existing.x, existing.y, "#cfd8c0"); Sfx.play("vox_bone");
        } else {
          const dm = sk.slamDmg(rk);
          const stats = { hp: 1, dmg: [dm[0], dm[1]], speed: 2.2, atkRate: 0.7, range: 1.0, sprite: "golem", name: "Bone Golem", taunt: sk.tauntRadius(rk), slamDmg: dm };
          const mi = new Minion("bone_golem", stats, this); mi.dmgPctOwner = this.stats.minionDmgPct;
          mi.sourceSkill=skillId;
          mi.stitches = used; mi.maxStitch = maxStitch; recompute(mi);
          if(typeof SkillVFX!=='undefined')for(const corpse of corpses)SkillVFX.transfer(this,skillId,corpse,mi);
          Game.state.minions.push(mi); Game.addNova(mi.x, mi.y, 1.7, "#cfd8c0"); Sfx.play("vox_bone");
        }
        return true;
      }
      /* ===================== VEIL RANGER ===================== */
      case "charge_shot": {   // Drawn Shot — hold to draw, loose on button-up or at full draw
        let aim = target ? { x: target.x, y: target.y } : point; if (!aim) { const [wx, wy] = U.screenVecToWorld(this.visAng); aim = { x: this.x + wx * 5, y: this.y + wy * 5 }; }
        /* already nocked: keep charging and re-aim — do NOT reset the draw or re-pay mana
           (the held command re-enters this every frame; resetting was the bug that drained mana and never fired) */
        if (this.drawing) { this.drawing.aim = aim; this.face(aim.x, aim.y); return true; }
        this.pay(sk, rk);
        this.drawing = { t: 0, maxDraw: sk.maxDraw(rk), dmgMin: sk.dmgMin(rk), dmgMax: sk.dmgMax(rk), quarryBonus: sk.quarryBonus(rk), aim };
        this.face(aim.x, aim.y); Sfx.play("bow");
        return true;
      }
      case "ricochet": {   // Ricochet Shard — bank-shot arrow
        let aim = target ? { x: target.x, y: target.y } : point; if (!aim) { const [wx, wy] = U.screenVecToWorld(this.visAng); aim = { x: this.x + wx * 5, y: this.y + wy * 5 }; }
        this.pay(sk, rk); this.face(aim.x, aim.y); this.startAction("attack", dur); Sfx.play("bow");
        this.afterActionDelay(dur * 0.4, () => { if (this.dead) return; Game.spawnProjectile({ visualOwner:this, x: this.x, y: this.y, tx: aim.x, ty: aim.y, speed: 14, kind: "arrow", fromPlayer: true, mult: sk.dmgMult(rk) * syn, ricochet: { bounces: sk.bounces(rk) } }); });
        return true;
      }
      case "rain": {   // Arrowfall — a circle that rains arrows
        let aim = target ? { x: target.x, y: target.y } : point; if (!aim) aim = { x: this.x, y: this.y };
        const maxR = sk.castRange ? sk.castRange(rk) : 9, d = U.dist(this.x, this.y, aim.x, aim.y); if (d > maxR) { const k = maxR / d; aim = { x: this.x + (aim.x - this.x) * k, y: this.y + (aim.y - this.y) * k }; }
        this.pay(sk, rk); this.startAction("attack", dur); Sfx.play("bow");
        // One live Arrowfall per caster, including zones on inactive surfaces.
        for (let i = Game.state.fx.length - 1; i >= 0; i--) {
          const field = Game.state.fx[i];
          if (field.type === "rain" && field.owner === this) Game.state.fx.splice(i, 1);
        }
        Game.state.fx.push({ surfaceId:TerrainLayers.current(Game.state.map), type: "rain", x: aim.x, y: aim.y, radius: sk.radius(rk), ttl: sk.dur(rk), maxTtl: sk.dur(rk), tickEvery: 0.25, mult: sk.dmgMult(rk) * syn, owner: this });
        return true;
      }
      case "dragnet": {
        if ((this.skillCd[skillId] || 0) > Game.state.time) return false;
        let aim = point || target; if (!aim) return false;
        const map=Game.state.map,world=Game.state,surface=this.surfaceId,range=sk.castRange(rk),d=U.dist(this.x,this.y,aim.x,aim.y),k=d>range?range/d:1;
        aim={x:this.x+(aim.x-this.x)*k,y:this.y+(aim.y-this.y)*k};
        if (point?.surfaceId!==undefined && point.surfaceId!==surface || !MapGen.walkable(map,aim.x,aim.y,surface) || !U.los((x,y)=>MapGen.walkable(map,x,y,surface),this.x,this.y,aim.x,aim.y)) return false;
        this.pay(sk,rk);this.skillCd[skillId]=Game.state.time+sk.cd(rk);this.face(aim.x,aim.y);this.startAction("attack",.4);
        const action=this.action,epoch=this._skillEpoch,dm=sk.dmg(rk),scale=this.snareDamageScale(sk),radius=sk.radius(rk),root=Math.min(3,sk.root(rk));action.dragnetPending=true;
        this.markActionRelease(.4);
        this.afterSkillDelay(.4,()=>{
          if(this.dead||action.interrupted||world!==Game.state||map!==world.map||surface!==this.surfaceId||epoch!==this._skillEpoch||this.stunT>0||this.action&&this.action!==action)return;
          action.dragnetPending=false;
          if(typeof SkillAudio!=="undefined")SkillAudio.release(this,skillId);
          if(typeof SkillVFX!=="undefined")SkillVFX.release(this,skillId);
          world.fx.push({type:"dragnet",sourceSkill:skillId,owner:this,surfaceId:surface,x:aim.x,y:aim.y,fromX:this.x,fromY:this.y,radius,ttl:.5,maxTtl:.5});
          Sfx.play("click");
          for(const mon of TerrainLayers.targets(world.monsters)) {
            if(mon.dead||!TerrainLayers.same(this,mon)||U.dist(aim.x,aim.y,mon.x,mon.y)>radius+mon.radius||!U.los((x,y)=>MapGen.walkable(map,x,y,surface),aim.x,aim.y,mon.x,mon.y))continue;
            const damage=U.rf(...dm)*scale,actual=this.snareHit(mon,damage);
            Game.addFloat(mon.x,mon.y,Math.floor(actual),"#d8c79a");
            if(typeof SkillVFX!=="undefined")SkillVFX.hit(this,mon,"phys",false);
            if(actual>0&&!mon.dead)mon.applyDragnet(aim,root,this);
          }
        });
        return true;
      }
      case "tripwire": {   // Legacy wire effects; no longer learnable.
        let aim = target ? { x: target.x, y: target.y } : point; if (!aim) { const [wx, wy] = U.screenVecToWorld(this.visAng); aim = { x: this.x + wx * 5, y: this.y + wy * 5 }; }
        const len = sk.length(rk), d = U.dist(this.x, this.y, aim.x, aim.y) || 1, ex = this.x + (aim.x - this.x) / d * len, ey = this.y + (aim.y - this.y) / d * len;
        this.pay(sk, rk); const dm = sk.dmg(rk);
        Game.state.fx.push({ surfaceId:TerrainLayers.current(Game.state.map), type: "tripwire", x: (this.x + ex) / 2, y: (this.y + ey) / 2, x0: this.x, y0: this.y, x1: ex, y1: ey, ttl: sk.ttl ? sk.ttl(rk) : 20, sprung: false, lo: dm[0], hi: dm[1], bleed: sk.bleed(rk), root: sk.root(rk), owner: this });
        Sfx.play("click");
        return true;
      }
      case "decoy": case "afterimage": {   // Snare Decoy / After-Image — a taunting lure
        const here = { x: this.x, y: this.y };
        this.pay(sk, rk);
        if (sk.type === "afterimage") {
          let aim = point || (target ? { x: target.x, y: target.y } : null); const [wx, wy] = U.screenVecToWorld(this.visAng);
          const dir = aim ? Math.atan2(aim.y - this.y, aim.x - this.x) : Math.atan2(wy, wx), rr = sk.range ? sk.range(rk) : 4.5;
          const nx = this.x + Math.cos(dir) * rr, ny = this.y + Math.sin(dir) * rr; if (MapGen.walkable(Game.state.map, nx, ny)) { this.x = nx; this.y = ny; this._animationController?.reset(); this.path = null; }
        }
        const stats = { hp: sk.hp ? sk.hp(rk) : 60, dmg: [0, 0], speed: 0, atkRate: 0, range: 0, sprite: "decoy", name: "Decoy", taunt: sk.taunt ? sk.taunt(rk) : 5 };
        const mi = new Minion("decoy", stats, this); mi.x = here.x; mi.y = here.y; mi.decoy = true; mi.ttl = sk.lifetime ? sk.lifetime(rk) : 10;
        mi.sourceSkill=skillId;
        if (sk.type === "afterimage") mi.playerEcho = { classId: this.classId, _playerVisual: this._playerVisual, _formVisual: this._formVisual };
        Game.state.minions.push(mi); Sfx.play("portal"); Game.addNova(here.x, here.y, 1.0, "#6a6480");
        return true;
      }
      case "weapon_coat": {   // Serrated Arrows — coat shots with bleed
        this.pay(sk, rk);
        this.buffs = this.buffs.filter(b => b.id !== "serrated");
        this.buffs.push({ id: "serrated", label: "Serrated", emoji: "🜨", stats: {}, until: Game.state.time + sk.dur(rk) });
        this.coat = { pdot: sk.pdot(rk), woundDuration:sk.coatDuration?.(rk)??4 };
        Sfx.play("click"); Game.addNova(this.x, this.y, 1.2, "#90d870");
        return true;
      }
      case "deathmark": {   // Killing Mark — single-target amp + detonate
        if (!target) { const ap = point || { x: this.x, y: this.y }; let bd = 64; for (const m of TerrainLayers.targets(Game.state.monsters)) { if (m.dead) continue; const dd = U.dist2(ap.x, ap.y, m.x, m.y); if (dd < bd) { bd = dd; target = m; } } }
        if (!target) return false;
        this.pay(sk, rk);
        target.killMark = { owner:this, until: Game.state.time + sk.dur(rk), amp: sk.amp(rk), det: sk.detDmg(rk) };
        Sfx.play("curse"); Game.addParticle(target.x, target.y, "#c080e0");
        return true;
      }
      case "detonate_dots": {   // Hemorrhage — burst every prepared wound on screen
        this.pay(sk, rk); Sfx.play("blast"); Game.fx.shake = Math.max(Game.fx.shake, 4);
        const wd = this.weaponDamage(), wavg = (wd[0] + wd[1]) / 2;
        for (const mon of TerrainLayers.targets(Game.state.monsters)) {
          if (mon.dead) continue;
          let burst = 0;
          if (mon.poisonDot) burst += mon.poisonDot.dps * mon.poisonDot.t * sk.dotMult(rk);
          if (mon.bleedDot) burst += mon.bleedDot.dps * mon.bleedDot.t * sk.dotMult(rk);
          if (mon.quarry && Game.state.time < mon.quarry.until) burst += mon.quarry.stacks * sk.perQuarry(rk) / 100 * wavg;
          if (mon.killMark && Game.state.time < mon.killMark.until) burst += sk.markBonus(rk) / 100 * wavg;
          if (burst <= 0) continue;
          mon.bleedDot = null;
          Game.addNova(mon.x, mon.y, 1.4, "#d04040");
          this.spellHit(mon, burst, "shadow", {});
          mon.poisonDot = null; mon.quarry = null;
          if (mon.killMark) Game.detonateMark(mon);
        }
        return true;
      }
      /* ===================== WILDKEEPER ===================== */
      case "totem": {   // Storm Totem / Tempest Totem
        let aim = target ? { x: target.x, y: target.y } : point; if (!aim) aim = { x: this.x, y: this.y };
        const maxR = sk.castRange ? sk.castRange(rk) : 9, d = U.dist(this.x, this.y, aim.x, aim.y); if (d > maxR) { const k = maxR / d; aim = { x: this.x + (aim.x - this.x) * k, y: this.y + (aim.y - this.y) * k }; }
        if (!MapGen.walkable(Game.state.map, aim.x, aim.y)) { Game.msg("No ground for a totem.", "#9a9a9a"); return false; }
        this.pay(sk, rk);
        const kind = sk.totemKind || "storm", ttl = sk.ttl(rk) * (1 + (this.stats.totemTtl || 0)), dm = sk.dmg(rk).map(n=>n*(1+(this.stats.totemPower||0)/100));
        const cap = sk.cap(rk) + Math.floor((this.effRank("totem_mastery") || 0) / 10) + (this.stats.totemCapacity||0);
        const same = Game.state.fx.filter(f => f.type === "totem" && f.totemKind === kind && f.owner===this);
        while (same.length >= cap) { const old = same.shift(); const idx = Game.state.fx.indexOf(old); if (idx >= 0) Game.state.fx.splice(idx, 1); }
        Game.state.fx.push({ surfaceId:TerrainLayers.current(Game.state.map), type: "totem", totemKind: kind, x: aim.x, y: aim.y, ttl, maxTtl: ttl, radius: sk.radius(rk), zapCd: sk.zapCd ? sk.zapCd(rk) : 1.1, zapT: 0.3, lo: dm[0], hi: dm[1], pulseCd: sk.pulseCd ? sk.pulseCd(rk) : 1.4, pulseT: 0, wispCd: sk.wispCd ? sk.wispCd(rk) : 3, wispT: 1, ringR: 0, owner: this });
        Sfx.play("shrine"); Game.addNova(aim.x, aim.y, 1.2, kind === "tempest" ? "#fff080" : "#cfe0ff");
        return true;
      }
      case "roamaoe": {   // Cyclone — a wandering tornado
        let aim = target ? { x: target.x, y: target.y } : point; if (!aim) { const [wx, wy] = U.screenVecToWorld(this.visAng); aim = { x: this.x + wx * 4, y: this.y + wy * 4 }; }
        this.pay(sk, rk); const dm = sk.dmg(rk);
        Game.state.fx.push({ surfaceId:TerrainLayers.current(Game.state.map), type: "cyclone", x: this.x, y: this.y, vx: 0, vy: 0, ttl: sk.ttl(rk), radius: sk.radius(rk), tickEvery: sk.tickCd ? sk.tickCd(rk) : 0.4, drift: sk.drift ? sk.drift(rk) : 2.5, lo: dm[0], hi: dm[1], pull: sk.pull ? sk.pull(rk) : 1.5, owner: this });
        Sfx.play("blast"); Game.addNova(this.x, this.y, 1.5, "#cfe0ff");
        return true;
      }
    }
    return false;
  }

  /* belt potion */
  quaff(slotIdx) {
    if(typeof Coop!=="undefined"&&Coop.active&&!Coop.authority)return Coop.submit({type:"quaff",slot:slotIdx});
    if (this.dead) return;
    const slot = this.belt[slotIdx];
    if (!slot || slot.count <= 0) { Sfx.play("error"); return; }
    const c = DATA.CONSUMABLES[slot.id];
    if (c.healPct) this.healPool += this.stats.maxHp * c.healPct;
    else if (c.heal) this.healPool += c.heal;
    if (c.manaPct) this.manaPool += this.stats.maxMana * c.manaPct;
    else if (c.mana) this.manaPool += c.mana;
    if (c.rejuv) { this.healLife(this.stats.maxHp * c.rejuv); this.mana = Math.min(this.stats.maxMana, this.mana + this.stats.maxMana * c.rejuv); }
    slot.count--;
    if (slot.count <= 0) this.belt[slotIdx] = null;
    Sfx.play("potion");
    UI.refreshBelt();
  }

  gainXp(amount) {
    if (this.lvl >= DATA.MAX_LEVEL) return;
    this.xp += amount;
    while (this.lvl < DATA.MAX_LEVEL && this.xp >= DATA.xpForLevel(this.lvl)) {
      this.xp -= DATA.xpForLevel(this.lvl);
      this.lvl++;
      this.attrPts += 5; this.skillPts += 1;
      this.computeStats();
      this.hp = this.stats.maxHp; this.mana = this.stats.maxMana;
      Game.msg(`You are now level ${this.lvl}!`, "#ffd860");
      Game.centerMsg(`LEVEL ${this.lvl}`, "+5 attribute points, +1 talent point");
      Sfx.play("levelup");
      Game.addNova(this.x, this.y, 2.2, "#ffd860");
    }
  }

  update(dt) {
    const active=this.siphon||this.charging||this.leaping||this.spinning||this.dashing||this.drawing;
    const sourceBefore=this._castingSkillId;this._castingSkillId=active?.sourceSkill||sourceBefore;
    const run=()=>typeof SkillVFX!=='undefined'?SkillVFX.scope(this,active?.sourceSkill,()=>this.updatePlayer(dt)):this.updatePlayer(dt);
    try { return typeof SkillAudio!=='undefined'?SkillAudio.scope(active?.sourceSkill,{owner:this,emitter:active||this},run):run(); }
    finally { this._castingSkillId=sourceBefore; if (typeof UniquePowers !== "undefined") UniquePowers.tick(this); }
  }
  updatePlayer(dt) {
    if(this.stunT>0&&this.action?.veilPending)this.action.interrupted=true;
    this.updateAnim(dt);
    /* the dead do not walk, drink, or whirl — they wait to rise */
    if (this.dead) { this.moving = false; return; }
    this.checkAetherDepletion();
    if (this.drawing && !this.canUseSkillWeapon('veilranger_0_2')) { this.drawing=null; this.action=null; }
    this.syncSummonAuras();
    const st = this.stats;
    /* buffs expiry */
    const n = this.buffs.length;
    this.buffs = this.buffs.filter(b => b.until > Game.state.time);
    if (this.buffs.length !== n) {
      if (this.form && !this.buffs.some(b => b.id && b.id.startsWith("form_"))) this.form = null;   // shape ended → form-gated skills lock again
      this.computeStats(); UI.refreshBuffs();
    }
    /* Thunderstorm: while active, strike a foe in your light every 3s for Stormshell's bonus */
    if (this.buffs.some(b => b.id === "thunderstorm")) {
      this.thunderT = (this.thunderT || 0) - dt;
      if (this.thunderT <= 0) {
        this.thunderT = 3;
        const R = 7.5 + (st.lightRadius || 0);
        let tgt = null, bd = R * R;
        for (const m of TerrainLayers.targets(Game.state.monsters)) { if (m.dead) continue; const dd = U.dist2(this.x, this.y, m.x, m.y); if (dd < bd) { bd = dd; tgt = m; } }
        if (tgt) {
          const ss = this.effRank("stormshell");
          const dmg = ss > 0 ? 4 + 2 * ss : 0;     // Stormshell's additive lightning damage
          if (dmg > 0) {
            this.withSkillSource('stormshell',()=>this.spellHit(tgt, dmg, "light", {}));
            Game.lightningBolt(this.x, this.y, tgt.x, tgt.y);
            Sfx.playSkill?.('stormshell','release',{owner:this,target:tgt});
          }
        }
      }
    } else this.thunderT = 0;
    /* regen + potion pools */
    const beasts=TerrainLayers.targets(Game.state.minions).filter(m=>!m.dead && m.owner===this && m.beast).length;
    const potionMana=Math.min(this.manaPool || 0,22*dt);
    const manaFlow=(st.manaRegen + beasts*(st.pManaPerBeast || 0)-this.companionUpkeep())*dt+potionMana;
    this.mana=Math.min(st.maxMana,Math.max(0,this.mana+manaFlow));
    this.manaPool=(this.manaPool || 0)-potionMana;
    this.checkAetherDepletion();
    this.healLife((0.25 + (st.lifeRegen || 0)) * dt);
    if (this.healPool > 0) { const t = Math.min(this.healPool, 28 * dt); this.healLife(t); this.healPool -= t; }
    this.tileHazardTick(dt, Game.state.map, true);   // ice/lava/bog under the player

    /* ---- bespoke resource & channel upkeep ---- */
    if (this.tempo > 0 && Game.state.time > this.tempoUntil) this.tempo = 0;          // Tempo decays out of combat
    if (this.stance === "bulwark") {
      const previous=this.rootT;
      this.rootT = this.moving ? 0 : Math.min(3, this.rootT + dt);
      if(this.rootT!==previous)this.computeStats();
    }
    if (this.stance === "riposte") { this.spendAether((this.riposteData ? this.riposteData.drain : 3) * dt); if (this.mana <= 0) this.clearStance(); }
    if (this.siphon) {
      const SI = this.siphon;
      if (SI.target && SI.target.dead && !this.moving && Game.state.time <= SI.until) {   // re-acquire on kill
        let nt = null, bd = 81; for (const m of TerrainLayers.targets(Game.state.monsters)) { if (m.dead) continue; const dd = U.dist2(this.x, this.y, m.x, m.y); if (dd < bd) { bd = dd; nt = m; } } SI.target = nt;
      }
      if (!SI.target || SI.target.dead || this.moving || Game.state.time > SI.until || U.dist(this.x, this.y, SI.target.x, SI.target.y) > 9) this.siphon = null;
      else {
        SI.tickT -= dt; this.spendAether(SI.manaPerSec * dt);
        if (this.mana <= 0) { this.mana = 0; this.siphon = null; }
        else if (SI.tickT <= 0) { SI.tickT = SI.tickRate; SI.ramp = Math.min(0.6, SI.ramp + 0.08 * SI.tickRate); Game.beamFx(this.x, this.y, SI.target.x, SI.target.y, "#c080e0"); this.spellHit(SI.target, SI.tickDmg * (1 + SI.ramp), "shadow", { drain: SI.drain }); }
      }
    }
    if (this.drawing) {
      this.drawing.t = Math.min(this.drawing.maxDraw, this.drawing.t + dt);
      if (Math.random() < 0.5) Game.addParticle(this.x + U.rf(-0.5, 0.5), this.y + U.rf(-0.5, 0.5), "#fff0c0");
      if (this.drawing.t >= this.drawing.maxDraw) this.releaseDraw();
    }

    /* charge motion: barrel along a lane trampling everything in a band */
    if (this.charging) {
      const C = this.charging; C.t += dt;
      const k = Math.min(1, C.t / C.dur);
      const ox = this.x, oy = this.y;
      this.x = U.lerp(C.fx, C.tx, k); this.y = U.lerp(C.fy, C.ty, k);
      this.recordMovement(ox, oy, dt);
      const ang = Math.atan2(C.ty - C.fy, C.tx - C.fx);
      for (const mon of TerrainLayers.targets(Game.state.monsters)) {
        if (mon.dead || C.hit.has(mon)) continue;
        const t = U.clamp((mon.x - this.x) * Math.cos(ang) + (mon.y - this.y) * Math.sin(ang), -0.6, C.width);
        const px = this.x + Math.cos(ang) * t, py = this.y + Math.sin(ang) * t;
        if (U.dist(px, py, mon.x, mon.y) <= C.width + mon.radius) {
          C.hit.add(mon); const dealt=this.strike(mon, C.mult, { auto: true });
          if(mon.imperialCombat&&!dealt)continue;
          if (C.first) { mon.stunT = Math.max(mon.stunT, C.stunDur); C.first = false; Game.fx.shake = Math.max(Game.fx.shake, 4); }
          Game.knockMonster(mon, this.x, this.y, C.kb);
        }
      }
      Game.dustPuff(this.x, this.y);
      if (k >= 1) this.charging = null;
      return;
    }

    /* leap motion */
    if (this.updateTraversal(dt)) return;
    if (this.leaping) {
      const L = this.leaping;
      L.t += dt;
      const k = Math.min(1, L.t / L.dur);
      this.x = U.lerp(L.fx, L.tx, k); this.y = U.lerp(L.fy, L.ty, k);
      this.jumpZ = Math.sin(k * Math.PI) * 34;
      if(Game.state.map.surfaceVersion) {
        const lift=(x,y)=>TerrainSurface.heightAt(Game.state.map,x,y)*TerrainSurface.LIFT;
        this.jumpZ+=U.lerp(lift(L.fx,L.fy),lift(L.tx,L.ty),k)-lift(this.x,this.y);
      }
      this.moving = true;
      if (k >= 1) {
        this.jumpZ = 0;
        Sfx.play("slam");
        Game.fx.shake = 7;
        Game.addNova(this.x, this.y, L.radius, "#d8b860");
        for (const mon of TerrainLayers.targets(Game.state.monsters)) {
          if (!mon.dead && U.dist(this.x, this.y, mon.x, mon.y) <= L.radius + mon.radius) this.strike(mon, L.mult, { auto: true });
        }
        this.leaping = null;
      }
      return;
    }
    /* dash motion */
    if (this.dashing) {
      const D = this.dashing, t = D.target;
      if (t.dead) { this.dashing = null; return; }
      const d = U.dist(this.x, this.y, t.x, t.y);
      if (d <= st.range + t.radius) {
        this.dashing = null;
        this.face(t.x, t.y);
        this.startAction("attack", 1 / st.attackRate * 0.8);
        this.markActionRelease(0.18);
        this.afterSkillDelay(0.18, () => { if (!t.dead && !this.dead) this.strike(t, D.mult); });
      } else {
        const step = D.speed * dt;
        const nx = this.x + (t.x - this.x) / d * step, ny = this.y + (t.y - this.y) / d * step;
        if (MapGen.walkable(Game.state.map, nx, ny)) {
          const ox = this.x, oy = this.y;
          this.x = nx; this.y = ny; this.face(t.x, t.y); this.recordMovement(ox, oy, dt);
        }
        else this.dashing = null;
        Game.dustPuff(this.x, this.y);
      }
      return;
    }
    /* spin motion */
    if (this.spinning) {
      const S = this.spinning;
      S.t += dt; S.tick -= dt;
      const d = U.dist(this.x, this.y, S.tx, S.ty);
      if (d > 0.3) {
        const step = st.moveSpeed * 1.15 * dt;
        const nx = this.x + (S.tx - this.x) / d * step, ny = this.y + (S.ty - this.y) / d * step;
        if (MapGen.walkable(Game.state.map, nx, ny)) { this.x = nx; this.y = ny; }
      }
      this.visAng += dt * 15; this.angT = this.visAng;   // visual whirl
      this.dir = U.dirFrom(Math.cos(this.visAng), Math.sin(this.visAng));
      this.moving = false;
      if (S.tick <= 0) {
        S.tick = 0.22;
        Sfx.play("swing");
        for (const mon of TerrainLayers.targets(Game.state.monsters)) {
          if (!mon.dead && U.dist(this.x, this.y, mon.x, mon.y) <= S.radius + mon.radius) this.strike(mon, S.mult, { auto: true });
        }
      }
      if (S.t >= S.dur) this.spinning = null;
      return;
    }

    if (this.stunT > 0 || (this.action && this.action.state !== "death")) { this.moving = false; this.curSpeed = 0; return; }

    /* execute current command */
    const cmd = this.command;
    if (!cmd) { this.moving = false; return; }
    if (cmd.skill && this.rejectSkillWeapon(cmd.skill)) return;
    if (cmd.type === "move") {
      this.moveAlong(dt, st.moveSpeed, Game.state.map, TerrainLayers.targets(Game.state.monsters));
      if ((!this.path || !this.path.length) && !this.jumping) this.command = null;
      this.footsteps(dt);
    } else if (cmd.type === "steer") {
      if(Game.state.map.layers&&(cmd.point.surfaceId??this.surfaceId)!==this.surfaceId){
        Game.repath(this,cmd.point.x,cmd.point.y,cmd.point.surfaceId);this.moveAlong(dt,st.moveSpeed,Game.state.map,TerrainLayers.targets(Game.state.monsters));return;
      }
      this.moveToward(dt, st.moveSpeed, cmd.point.x, cmd.point.y, Game.state.map, TerrainLayers.targets(Game.state.monsters));
      this.footsteps(dt);
    } else if (cmd.type === "attack") {
      const t = cmd.target;
      if (!t || t.dead) { this.command = null; return; }
      const skDef = this.resolveSkill(cmd.skill);
      const isSpell = skDef && ["projectile", "pierce", "chain", "fan", "blast", "spellnova", "curse", "corpse", "summon", "minionbuff", "wfan", "wpierce", "trap", "blink", "form", "beam", "meteor", "heal",
        "firewall", "pyreblast", "freezenova", "balllightning", "arcblink", "overloadnuke", "groundfield",
        "ward", "sacrifice", "siphon_beam", "doom", "taunt_curse", "plague_seed", "devour", "corpse_launch", "reap", "outbreak", "summon_golem",
        "charge_shot", "ricochet", "rain", "dragnet", "tripwire", "decoy", "afterimage", "weapon_coat", "deathmark", "detonate_dots", "umbral_knife", "dusk_cleave", "shadow_flurry", "deathblow",
        "totem", "roamaoe", "shout", "fear", "banner", "banner_ultimate", "warshout_debuff", "thrown", "grapple", "fireclaw"].includes(skDef.type);
      let reach;
      if (isSpell) {
        reach = skDef.type === "spellnova" ? Math.max(1.2, skDef.radius(Math.max(1, this.effRank(cmd.skill))) - 0.3) : 8.5;
      } else reach = this.stats.ranged ? 9 : st.range + t.radius + 0.25;
      reach=this.skillTargetRange(cmd.skill,t)??reach;
      const d = U.dist(this.x, this.y, t.x, t.y);
      const walk = (x, y) => MapGen.walkable(Game.state.map, x, y);
      const hasLos = !(this.stats.ranged || isSpell) || U.los(walk, this.x, this.y, t.x, t.y);
      if (TerrainLayers.same(this,t) && d <= reach && hasLos) {
        this.path = null; this.moving = false;
        this.performSkill(cmd.skill, t, null);
        if (!cmd.hold) this.command = null;
      } else {
        Game.repath(this, t.x, t.y,t.surfaceId);
        this.moveAlong(dt, st.moveSpeed, Game.state.map, TerrainLayers.targets(Game.state.monsters));
        this.footsteps(dt);
      }
    } else if (cmd.type === "skillPoint") {
      this.path = null;
      if (this.performSkill(cmd.skill, null, cmd.point)) this.command = null;
      else this.command = null;
    } else if (cmd.type === "pickup") {
      const g = cmd.gi;
      if (!Game.state.ground.includes(g)) { this.command = null; return; }
      if (TerrainLayers.same(this,g) && U.dist(this.x, this.y, g.x, g.y) < 1.2) {
        Game.pickupGround(g,this);
        this.command = null; this.path = null; this.moving = false;
      } else {
        this.moveAlong(dt, st.moveSpeed, Game.state.map, TerrainLayers.targets(Game.state.monsters));
        this.footsteps(dt);
        if (!this.path || !this.path.length) Game.repath(this, g.x, g.y);
      }
    } else if (cmd.type === "interact") {
      const o = cmd.obj;
      const d = U.dist(this.x, this.y, o.x, o.y);
      if (TerrainLayers.same(this,o) && d < (cmd.run ? 1.8 : (o.interactionRange || 1.6))) {
        this.path = null; this.moving = false; this.command = null;
        if (cmd.run) cmd.run(); else Game.interact(o,this);
      } else {
        this.moveAlong(dt, st.moveSpeed, Game.state.map, TerrainLayers.targets(Game.state.monsters));
        this.footsteps(dt);
        if (!this.path || !this.path.length) Game.repath(this, o.x, o.y);
      }
    }
  }
  footsteps(dt) {
    if(typeof Player3D!=='undefined'&&Player3D.update)return; // contact-driven by the animation controller
    this.stepT -= dt;
    if (this.moving && this.stepT <= 0) { this.stepT = 0.32; Sfx.play("step"); }
  }
  /* drop the active combat stance and its persistent buff */
  clearStance() {
    this.buffs = this.buffs.filter(b => !b.id.startsWith("stance_"));
    this.stance = null; this.riposteData = null; this.rootT = 0;
    this.computeStats(); if (UI.refreshBuffs) UI.refreshBuffs();
  }
  /* Drawn Shot: release the held bow into one piercing arrow scaled by draw */
  releaseDraw() {
    const dr = this.drawing; this.drawing = null;
    if (!dr || this.dead || !this.canUseSkillWeapon('veilranger_0_2')) return;
    const aim = dr.aim || { x: this.x + Math.cos(this.visAng) * 5, y: this.y + Math.sin(this.visAng) * 5 };
    const chargeK = U.clamp(dr.t / dr.maxDraw, 0.15, 1);
    this.face(aim.x, aim.y);
    this.startAction("attack", 1 / this.stats.attackRate);
    this.markActionRelease(0);
    Sfx.playSkill?.(dr.sourceSkill||'veilranger_0_2','release',{owner:this,charge:chargeK});
    Game.spawnProjectile({ visualOwner:this, x: this.x, y: this.y, tx: aim.x, ty: aim.y, speed: 16, kind: "arrow", fromPlayer: true,
      sourceSkill:dr.sourceSkill||'veilranger_0_2',
      mult: dr.dmgMin + (dr.dmgMax - dr.dmgMin) * chargeK, pierce: true,
      maxPierce: chargeK < 0.4 ? 1 : 99, knockFirst: chargeK >= 0.8, quarryBonus: dr.quarryBonus || 0 });
    if(typeof SkillVFX!=='undefined')SkillVFX.release(this,dr.sourceSkill||'veilranger_0_2');
  }
}

/* ------------------------------------------------------------------ */
/* A raised servant: follows its master, attacks nearby monsters,
   and soaks hits that would otherwise reach the Gravebinder. */
class Minion extends Entity {
  constructor(kindId, stats, owner) {
    super(owner.x + U.rf(-1.2, 1.2), owner.y + U.rf(-1.2, 1.2));
    this.surfaceId=owner.surfaceId??0;
    if (!MapGen.walkable(Game.state.map, this.x, this.y,this.surfaceId)) { this.x = owner.x; this.y = owner.y; }
    this.autoHop = !stats.noAttack;
    this.kindId = kindId;
    this.owner = owner;
    this.maxHp = stats.hp; this.hp = stats.hp;
    this.dmg = stats.dmg; this.speed = stats.speed; this.atkRate = stats.atkRate;
    this.range = stats.range;
    this.projKind = stats.projectile || null;   // 'venom' for plague mages
    this.isArcher = !!this.projKind;
    this.pdot = stats.pdot || 0;                // mage's own venom
    this.dmgPctOwner = 0;
    this.attackCd = 0; this.repathT = 0;
    this.buffUntil = 0; this.buffDmg = 0;
    this.lastHitT = -99;
    this.radius = 0.3;
    this.untargetable = !!stats.untargetable;   // Spirit Hawk: foes can't single-target it (AoE still hits)
    this.groundImmune = !!stats.groundImmune;    // ...and it floats above ground hazards/fields
    /* beast companions vs raised bone */
    if (stats.sprite === "wolf") {
      this.beast = true;
      this.name = stats.name || "Grey Companion";
      this.spriteOpts = { kind: "wolf", pal: { fur: "#8a8478", eye: "#ffd040" }, scale: 0.95 };
    } else if (stats.sprite === "boar") {
      this.beast = true;
      this.name = stats.name || "Thornback Boar";
      this.radius = 0.38; this.taunt = stats.taunt || 5; this.thornsFlat = stats.thorns || 0;
      this.spriteOpts = { kind: "hound", pal: { fur: "#6a4a34", trim: "#3a2a1c", eye: "#ff8040" }, scale: 1.18 };
    } else if (stats.sprite === "hawk") {
      this.beast = true; this.name = stats.name || "Spirit Hawk"; this.radius = 0.26;
      this.projKind = null; this.isArcher = false; this.autoHop = false;
      this.orbitRadius = 2.8;
      this.orbitAngle = Game.state.minions.filter(m=>!m.dead && m.owner===owner && m.kindId===kindId).length * 2.399963;
      this.orbitCenter = {x:owner.x,y:owner.y}; this.hawkHitUntil = new WeakMap();
      this.x = owner.x + Math.cos(this.orbitAngle)*this.orbitRadius;
      this.y = owner.y + Math.sin(this.orbitAngle)*this.orbitRadius; this.jumpZ = 22;
      this.spriteOpts = { kind: "hound", pal: { fur: "#9aa6b8", trim: "#5a6478", eye: "#cfe0ff" }, scale: 0.7 };
    } else if (stats.sprite === "bear") {
      this.beast = true; this.name = stats.name || "Guardian Bear";
      this.radius = 0.5; this.taunt = stats.taunt || 5; this.slamRadius = 1.8; this.slamCd = 5; this.slamStun = stats.slamStun || 0.6;
      this.spriteOpts = { kind: "grizzly", pal: { fur: "#5a4632", claw: "#e0d8c4", eye: "#ffb040" }, scale: 1.15 };
    } else if (stats.sprite === "ent") {
      this.beast = true; this.name = stats.name || "Ent Guardian";
      this.radius = 0.55; this.taunt = stats.taunt || 5; this.slamRadius = 2; this.slamCd = 4; this.slamStun = 0.6;
      this.spriteOpts = { kind: "treant", pal: { bark: "#5a4632", wood: "#74604a", leaf: "#3a5a2c", eye: "#d0ff80" }, scale: 1.15 };
    } else if (stats.sprite === "golem") {
      this.name = "Bone Golem"; this.radius = 0.55; this.taunt = stats.taunt || 4; this.slamRadius = 2.0; this.slamCd = 4; this.slamStun = 0.6; this.slamDmg = stats.slamDmg || this.dmg; this.tier = stats.tier || 1;
      this.spriteOpts = { kind: "golem", pal: { bone: "#cdbf95", boneDark: "#5c4b2b", eye: "#ff3b00" }, scale: 1.0 + (this.tier - 1) * 0.12 };
    } else if (stats.sprite === "decoy") {
      this.name = "Decoy"; this.radius = 0.3; this.taunt = stats.taunt || 5; this.noAttack = true;
      this.spriteOpts = { kind: "human", pal: { armor: "#5a5468", skin: "#9a94a8", eye: "#c0b0e0" }, scale: 0.9 };
    } else {
      this.name = this.isArcher ? "Skeletal Plague Mage" : "Skeletal Warrior";
      this.spriteOpts = { kind: "skeleton", pal: Minion.PAL_BASE,
        weapon: this.isArcher ? "wand" : "sword", scale: 0.92 };
    }
    if (stats.sprite !== "ent") this.spriteOpts.summonArt = kindId;
    if (this.noAttack) { this.visAng = owner.visAng; this.angT = owner.visAng; }
    this.deathT = 0;
  }
  /* Poison Mastery turns the whole boneyard green (skeletons only) */
  totalPdot() { return this.beast ? 0 : this.pdot + ((this.owner.stats && this.owner.stats.minionPoison) || 0); }
  refreshPalette() {
    if (this.spriteOpts.kind !== "skeleton") return;   // only raised bone recolors; golems/decoys/beasts keep theirs
    const mastered = (this.owner.skills && this.owner.skills.poison_mastery > 0);
    this.spriteOpts.pal = mastered ? Minion.PAL_POISON : Minion.PAL_BASE;
  }
  takeDamage(amount, source) {
    if (this.dead) return;
    const aura = this.owner.summonAuraStatsFor(this);
    amount *= 1 - Math.min(80,aura.dmgReducePct || 0) / 100;
    this.hp -= amount;
    this.flashT = 0.1;
    this.lastHitT = Game.state.time;
    /* bristled hides & Marrow Pact bone-thorns bite melee attackers back */
    const thorns = (this.thornsFlat || 0) + (aura.thorns || 0) + ((!this.beast && this.owner.stats && this.owner.stats.minionThorns) || 0);
    if (thorns > 0 && source && source.takeDamage && source !== this.owner && U.dist(this.x, this.y, source.x, source.y) < 1.8) { source.takeDamage(thorns, this); if(!this.beast&&typeof SkillAudio!=='undefined')SkillAudio.passive(this.owner,'minion',{emitter:this,target:source}); }
    if (Math.random() < 0.3) this.startAction("hit", 0.16);
    if (this.hp <= 0) this.die();
  }
  tryBlock() { return false; }
  die({ silent = false } = {}) {
    if (this.dead) return;
    this.dead = true;
    if (this.auraRadius) this.owner.syncSummonAuras();
    this.deathT = 0.72;
    this.startAction("death", 0.68);
    if (!silent) this.playSound('end',this.beast ? "die_flesh" : "die_bone");
    for (let i = 0; i < 7; i++) Game.addParticle(this.x, this.y, this.beast ? "#8a1414" : "#cfd8c0");
  }
  dmgRoll() {
    let d = U.rf(this.dmg[0], this.dmg[1]) * (1 + (this.owner.stats?.minionDmgPct ?? this.dmgPctOwner) / 100);
    d *= 1 + (this.owner.summonAuraStatsFor(this).dmgPct || 0) / 100;
    if (Game.state.time < this.buffUntil) d *= 1 + this.buffDmg / 100;
    return d;
  }
  playSound(phase,fallback,context={}) {
    if(this.sourceSkill&&typeof SkillAudio!=='undefined')return Sfx.playSkill(this.sourceSkill,phase,{owner:this.owner,emitter:this,...context});
    Sfx.play(fallback);
  }
  updateHawk(dt, player, aura) {
    const center = this.orbitCenter, radius = this.orbitRadius;
    const relocated = !TerrainLayers.same(this,player) || U.dist(center.x,center.y,player.x,player.y) > 8;
    this.surfaceId = player.surfaceId ?? 0;
    if (relocated) { center.x=player.x; center.y=player.y; this.x=center.x+Math.cos(this.orbitAngle)*radius; this.y=center.y+Math.sin(this.orbitAngle)*radius; }
    const speed = this.stunT > 0 ? 0 : this.speed * (1+(aura.frw||0)/100) * (this.slowT>0?1-this.slowPct/100:1);
    const turn = speed * dt / radius, angle = this.orbitAngle;
    const steps = Math.max(1,Math.ceil((Math.abs(turn)*radius+U.dist(center.x,center.y,player.x,player.y))/.2));
    const interval = 1 / (this.atkRate * (1+(aura.ias||0)/100));
    for (let i=1;i<=steps;i++) {
      const k=i/steps, a=angle+turn*k, x=U.lerp(center.x,player.x,k)+Math.cos(a)*radius, y=U.lerp(center.y,player.y,k)+Math.sin(a)*radius;
      const dx=x-this.x,dy=y-this.y,len2=dx*dx+dy*dy, hitTime=Game.state.time-dt+dt*k;
      if (speed>0) for (const mon of Game.state.monsters) {
        if (mon.dead || !TerrainLayers.same(this,mon) || (this.hawkHitUntil.get(mon) ?? -Infinity)>hitTime) continue;
        const t=len2?Math.max(0,Math.min(1,((mon.x-this.x)*dx+(mon.y-this.y)*dy)/len2)):0;
        if (U.dist2(mon.x,mon.y,this.x+t*dx,this.y+t*dy)>(this.radius+mon.radius)**2) continue;
        this.hawkHitUntil.set(mon,hitTime+interval);
        const damage=this.dmgRoll(); mon.takeDamage(damage,this); Game.minionFloat(mon.x,mon.y,damage);
        this.playSound('impact','hit',{target:mon,elem:'phys'});
        if(typeof SkillVFX!=='undefined')SkillVFX.scope(this.owner,this.sourceSkill,()=>SkillVFX.hit(this.owner,mon,'phys'));
      }
      this.face(x,y); this.x=x; this.y=y;
    }
    this.orbitAngle=(angle+turn)%(Math.PI*2); this.orbitCenter={x:player.x,y:player.y};
    this.jumpZ=22+Math.sin(this.orbitAngle*2)*4; this.path=null; this.jumping=null;
    this.moving=speed>0; this.curSpeed=speed; this.stride+=speed*dt;
  }
  update(dt, player, map) {
    this.updateAnim(dt);
    if (this.dead) { this.jumping = null; this.jumpZ = 0; this.deathT -= dt; return; }
    const aura = this.owner.summonAuraStatsFor(this);
    if (aura.lifeRegen) this.hp=Math.min(this.maxHp,this.hp+aura.lifeRegen*dt);
    if (this.orbitRadius) { this.updateHawk(dt,player,aura); return; }
    const moveSpeed=this.speed*(1+(aura.frw||0)/100), atkRate=this.atkRate*(1+(aura.ias||0)/100);
    if (this.updateTraversal(dt)) return;
    this.tileHazardTick(dt, map, false);   // minions take terrain hazards too
    if (this.dead) return;
    this.refreshPalette();
    /* decoys & timed lures just stand, taunt, then crumble */
    if (this.ttl !== undefined) { this.ttl -= dt; if (this.ttl <= 0) { this.die(); return; } }
    if (this.noAttack) { this.moving = false; return; }
    /* old bone knits itself back together */
    if (!this.beast && this.hp < this.maxHp) this.hp = Math.min(this.maxHp, this.hp + 1 * dt);
    /* lost too far behind: claw back out of the ground beside the master */
    if (!map.layers && U.dist(this.x, this.y, player.x, player.y) > 16) {
      this.x = player.x + U.rf(-1, 1); this.y = player.y + U.rf(-1, 1);
      this.path = null;
      Game.addNova(this.x, this.y, 0.6, "#80ff90");
    }
    if (this.stunT > 0) { this.moving = false; return; }
    if (this.action && this.action.state === "attack") { this.moving = false; return; }
    if(map.layers&&!TerrainLayers.same(this,player)){
      this.attackCd-=dt;
      if(this.slamRadius)this.slamCd-=dt;
      Game.repath(this,player.x,player.y,player.surfaceId);
      this.moveAlong(dt,moveSpeed*1.2,map,TerrainLayers.targets(Game.state.minions));
      return;
    }
    const walk = (x, y) => MapGen.walkable(map, x, y);
    /* nearest living monster within leash range */
    let target = null, bd = 8 * 8;
    for (const mon of TerrainLayers.targets(Game.state.monsters)) {
      if (mon.dead) continue;
      const dd = U.dist2(this.x, this.y, mon.x, mon.y);
      if (dd < bd) { bd = dd; target = mon; }
    }
    this.attackCd -= dt;
    if (this.slamRadius) this.slamCd -= dt;
    if (target) {
      const d = U.dist(this.x, this.y, target.x, target.y);
      /* bear / golem ground-slam */
      if (this.slamRadius && this.slamCd <= 0 && d < this.slamRadius + target.radius + 0.6) {
        this.slamCd = 4.5; this.startAction("attack", 0.6);
        const sx = this.x, sy = this.y, sdmg = this.slamDmg ? U.rf(this.slamDmg[0], this.slamDmg[1]) * (1 + (this.owner.stats?.minionDmgPct ?? this.dmgPctOwner) / 100) * (1+(aura.dmgPct||0)/100) : this.dmgRoll() * 1.5;
        Game.afterDelay(0.4, () => { if (this.dead) return; this.playSound('impact','slam',{elem:'earth'}); Game.addNova(sx, sy, this.slamRadius, "#c0a060"); Game.fx.shake = Math.max(Game.fx.shake, 3); for (const mon of TerrainLayers.targets(Game.state.monsters)) { if (mon.dead || U.dist(sx, sy, mon.x, mon.y) > this.slamRadius + mon.radius) continue; mon.takeDamage(sdmg, this); Game.minionFloat(mon.x, mon.y, sdmg); mon.stunT = Math.max(mon.stunT, this.slamStun || 0.6); Game.knockMonster(mon, sx, sy, 1.0); } });
        this.moving = false; return;
      }
      const reach = this.isArcher ? this.range : this.range + target.radius + this.radius;
      const hasLos = U.los(walk, this.x, this.y, target.x, target.y);
      if (d <= reach && (!this.isArcher || hasLos)) {
        this.path = null; this.moving = false;
        this.face(target.x, target.y);
        if (this.attackCd <= 0) {
          this.attackCd = 1 / atkRate;
          const dur = Math.min(0.55, 0.9 / atkRate);
          this.startAction("attack", dur);
          const tref = target;
          Game.afterDelay(dur * 0.55, () => {
            if (this.dead || tref.dead || !TerrainLayers.same(this,tref)) return;
            const pdot = this.totalPdot();
            if (this.isArcher) {
              this.playSound('release',this.projKind === 'venom' ? 'firebolt' : 'bow');
              Game.spawnProjectile({ x: this.x, y: this.y, tx: tref.x, ty: tref.y, speed: 9, kind: this.projKind, minionDmg: this.dmgRoll(), minionPdot: pdot, minionSource:this, sourceSkill:this.sourceSkill,visualOwner:this.owner });
            } else if (U.dist(this.x, this.y, tref.x, tref.y) <= reach + 0.4) {
              if(tref.imperialCombat?.block(this))return;
              this.playSound('impact','hit',{target:tref,elem:pdot?'poison':'phys'});
              const dmg = this.dmgRoll(); tref.takeDamage(dmg, this); Game.minionFloat(tref.x, tref.y, dmg);
              if(typeof SkillVFX!=='undefined')SkillVFX.scope(this.owner,this.sourceSkill,()=>{SkillVFX.hit(this.owner,tref,'phys');SkillVFX.passive(this.owner,'minion',{x:tref.x,y:tref.y});});
              if (pdot > 0) { tref.poisonDot = { dps: pdot / 3, t: 3, owner:this }; Game.addParticle(tref.x, tref.y, "#90ff70"); }
              Game.bloodBurst(tref.x, tref.y, 4);
            }
          });
        }
      } else {
        this.repathT -= dt;
        if (this.repathT <= 0) {
          this.repathT = 0.4;
          Game.repath(this, target.x, target.y);
        }
        this.moveAlong(dt, moveSpeed, map, TerrainLayers.targets(Game.state.minions));
        if (!this.path || !this.path.length) this.moving = false;
      }
    } else if (U.dist(this.x, this.y, player.x, player.y) > 2.6) {
      /* heel */
      this.repathT -= dt;
      if (this.repathT <= 0) { this.repathT = 0.35; Game.repath(this, player.x + U.rf(-1.2, 1.2), player.y + U.rf(-1.2, 1.2)); }
      this.moveAlong(dt, moveSpeed * 1.2, map, TerrainLayers.targets(Game.state.minions));
      if (!this.path || !this.path.length) this.moving = false;
    } else this.moving = false;
  }
}
Minion.PAL_BASE = { bone: "#d8d2c4", trim: "#4a463a", eye: "#9fd0ff" };
Minion.PAL_POISON = { bone: "#a8c89a", trim: "#2a4a2a", eye: "#80ff60" };

/* ------------------------------------------------------------------ */
// Authored Act III attacks share one simulation-owned lifecycle. No delayed
// callback can outlive a warning, interrupt, monster, or map instance.
class ImperialCombat {
  constructor(mon) {
    this.mon=mon;this.profile=mon.def.act3Combat;this.world=Game.state;this.map=Game.state.map;
    const phase=((Math.floor(mon.x*31+mon.y*17)+U.hash(mon.defId))>>>0)%17/17;
    this.cooldown=(this.profile.special?.cd||0)*(.35+phase*.3);this.active=null;this.lastAttack=null;this.epoch=0;
  }
  valid(){return Game.state===this.world&&Game.state.map===this.map&&!this.mon.dead&&!(this.world.players||[this.world.player]).every(p=>p.dead);}
  disabled(){const m=this.mon;return m.stunT>0||m.frozen>this.world.time||m.feared>this.world.time||m.beckon?.until>this.world.time||m.fleeUntil>this.world.time||!!m.pulled;}
  cancel(){this.epoch++;this.active=null;if(['attack','cast'].includes(this.mon.action?.state))this.mon.action=null;this.mon.jumpZ=0;}
  tick(dt){this.cooldown=Math.max(0,this.cooldown-dt);if(this.profile.role!=='boss')this.mon.attackCd=Math.max(0,this.mon.attackCd-dt);if(!this.valid()||this.disabled())this.cancel();}
  targets(){return [...(this.world.players||[this.world.player]),...this.world.minions].filter(t=>TerrainLayers.same(this.mon,t)&&!t.dead&&!t.untargetable);}
  los(t){return (t.surfaceId===undefined||TerrainLayers.same(this.mon,t))&&U.los((x,y)=>MapGen.walkable(this.map,x,y,this.mon.surfaceId),this.mon.x,this.mon.y,t.x,t.y);}
  clear(p){return TerrainSurface.supported(this.map,p.x,p.y,this.mon.radius,this.mon.surfaceId);}
  landing(p){return this.clear(p)&&this.world.monsters.every(t=>!TerrainLayers.same(this.mon,t)||t===this.mon||t.dead||Math.hypot(t.x-p.x,t.y-p.y)>t.radius+this.mon.radius+.15);}
  free(p){return this.clear(p)&&[...this.targets(),...this.world.monsters].every(t=>!TerrainLayers.same(this.mon,t)||t===this.mon||t.dead||Math.hypot(t.x-p.x,t.y-p.y)>t.radius+this.mon.radius+.15);}
  block(source){
    const m=this.mon, chance=this.profile.guard;
    if(!chance||!source||!this.valid()||this.disabled()||this.active||m.action?.state==='attack')return false;
    const angle=Math.atan2(source.y-m.y,source.x-m.x);
    if(Math.cos(angle-m.visAng)<.5||Math.random()*100>=chance)return false;
    m.aggro=true;this.blockUntil=this.world.time+.22;Sfx.play('block');Game.addFloat(m.x,m.y,'block','#e6ce82');return true;
  }
  begin(kind,spec,target,shape=null,point=null){
    const m=this.mon,windup=spec.windup??.75,recovery=spec.recovery??.85;
    this.active={kind,spec,target,shape,point,origin:{x:m.x,y:m.y},stage:'windup',remaining:windup,windup,recovery,hit:new Set()};
    this.lastAttack=kind;m.path=null;m.moving=false;m.face(target.x,target.y);
    m.startAction(['blink','bolt','fan'].includes(kind)?'cast':'attack',windup+recovery+(kind==='charge'?2:kind==='leap'?.55:0));
    if(kind!=='melee'&&kind!=='bolt')Sfx.play(kind==='blink'?'portal':'shrine');
  }
  destination(target,mode){
    const m=this.mon,base=Math.atan2(m.y-target.y,m.x-target.x),radius=mode==='retreat'?6:1.6;
    for(const offset of [0,.65,-.65,1.3,-1.3,Math.PI]){
      const p={x:target.x+Math.cos(base+offset)*radius,y:target.y+Math.sin(base+offset)*radius};
      if(this.free(p)&&U.los((x,y)=>MapGen.walkable(this.map,x,y),p.x,p.y,target.x,target.y)&&TerrainNavigation.findPath(this.map,m,p,{radius:m.radius,hop:false}))return p;
    }
    return null;
  }
  trySpecial(force=false){
    const m=this.mon,s=this.profile.special,t=m.pickTarget(this.world.player);
    if(s&&["blink","charge","leap"].includes(s.kind)&&m.movementLocked())return false;
    if(!s||this.active||(!force&&this.cooldown>0)||!t||!this.valid()||this.disabled()||!this.los(t))return false;
    const distance=U.dist(m.x,m.y,t.x,t.y),angle=Math.atan2(t.y-m.y,t.x-m.x);
    let shape,point;
    if(s.kind==='blink'){
      if(s.mode==='retreat'?distance>=s.range:distance<=4||distance>s.range)return false;
      point=this.destination(t,s.mode);if(!point)return false;
      shape={kind:'circle',...point,radius:m.radius+.4};
    }else if(s.kind==='charge'||s.kind==='leap'){
      if(distance<=2.6||distance>s.range)return false;
      const travel=s.kind==='charge'?distance+.9:Math.max(1,distance-t.radius-m.radius-.25);
      point={x:m.x+Math.cos(angle)*travel,y:m.y+Math.sin(angle)*travel};
      if(!this.clear(point)||!TerrainNavigation.segment(this.map,m.x,m.y,point.x,point.y,m.radius))return false;
      if(s.kind==='leap'&&!this.landing(point))return false;
      shape=s.kind==='charge'?{kind:'line',x:m.x,y:m.y,angle,length:travel,width:2*(m.radius+.55)}:{kind:'circle',...point,radius:s.radius};
    }else if(s.kind==='fan'){
      if(distance>=s.range)return false;
      shape={kind:'fan',x:m.x,y:m.y,angle,length:s.range,width:.65,count:s.count,spread:s.spread};
    }else{
      if(distance>s.radius)return false;
      shape={kind:s.arc?'cone':'circle',x:m.x,y:m.y,angle,radius:s.radius,arc:s.arc};
    }
    this.cooldown=s.cd;this.begin(s.kind,s,t,shape,point);return true;
  }
  damage(target,mult,elem='phys'){
    if(target.dead||!TerrainLayers.same(this.mon,target))return;
    const m=this.mon;
    target.takeDamage(U.rf(...m.def.dmg)*(m.def.dmgMult||1)*2.2*m.witherMult()*mult,m,elem);
  }
  area(a){
    for(const t of this.targets())if(!t.groundImmune&&!a.hit.has(t)&&BossEncounters.contains(a.shape,t.x,t.y)&&this.los(t)){
      a.hit.add(t);this.damage(t,a.spec.mult,a.spec.elem);
    }
  }
  fire(target,mult=1,angle=null,lane=null){
    const m=this.mon,p=m.def.projectile,d=angle??Math.atan2(target.y-m.y,target.x-m.x),reach=m.def.range;
    // A short forward origin aligns the bolt with the hands/chest, while never
    // moving its collision origin through an adjacent wall.
    const origin={x:m.x+Math.cos(d)*.28,y:m.y+Math.sin(d)*.28};
    if(!MapGen.walkable(this.map,origin.x,origin.y)){origin.x=m.x;origin.y=m.y;}
    Game.spawnProjectile({...origin,tx:origin.x+Math.cos(d)*reach,ty:origin.y+Math.sin(d)*reach,speed:p.speed,ttl:reach/p.speed,kind:p.kind,elem:p.elem,fromPlayer:false,mon:m,bossMult:mult,bossLane:lane,
      imperialOwner:this,imperialVisual:{kind:this.profile.projectileVisual,color:this.profile.projectileColor,lift:TerrainSurface.heightAt(this.map,m.x,m.y)*TerrainSurface.LIFT+(this.profile.projectileVisual==='crystal'?42:34)*m.scale}});
    Sfx.play(this.profile.sound);
  }
  release(a){
    const m=this.mon,t=a.target;
    if(a.kind==='blink'){
      if(this.free(a.point)&&TerrainNavigation.findPath(this.map,m,a.point,{radius:m.radius,hop:false})){
        Game.addNova(m.x,m.y,.6,'#b598d9');m.x=a.point.x;m.y=a.point.y;m.path=null;Game.addNova(m.x,m.y,.6,'#b598d9');
      }
    }else if(a.kind==='charge'||a.kind==='leap'){
      if(!this.clear(a.point)||!TerrainNavigation.segment(this.map,m.x,m.y,a.point.x,a.point.y,m.radius))return;
      if(a.kind==='leap'&&!this.landing(a.point))return;
      a.stage='travel';a.duration=a.kind==='leap'?.55:U.dist(m.x,m.y,a.point.x,a.point.y)/a.spec.speed;a.remaining=a.duration;return;
    }else if(a.kind==='fan'){
      for(let i=0;i<a.spec.count;i++){
        const angle=a.shape.angle+(i-(a.spec.count-1)/2)*a.spec.spread;
        this.fire(t,a.spec.mult,angle,{...a.shape,kind:'line',angle});
      }
    }else if(a.kind==='bolt'){
      if(!t.dead&&this.los(t))this.fire(a.point);
    }else if(a.kind==='melee'){
      if(t.dead||!this.los(t)||U.dist(m.x,m.y,t.x,t.y)>m.def.range+t.radius+m.radius+.4)return;
      if(Math.random()>U.clamp(.62+(m.lvl-(t.lvl||this.world.player.lvl))*.03,.35,.92)){Game.addFloat(t.x,t.y,'miss','#9a9a9a');return;}
      if(t.stats?.dodge>0&&Math.random()*100<t.stats.dodge){Game.addFloat(t.x,t.y,'evade','#b0a0d0');return;}
      if(t.tryBlock?.(m)){Sfx.play('block');return;}
      this.damage(t,1,this.profile.meleeElem||'phys');Sfx.play(this.profile.sound);
      if(t.stats?.thorns&&!m.dead)m.takeDamage(t.stats.thorns,t);
      for(const [elem,value] of Object.entries(m.def.elemDmg||{}))t.takeDamage(value*2,m,elem);
      if(m.def.poison)t.takeDamage(m.def.poison,m,'poison');
    }else{this.area(a);Sfx.play('slam');Game.addNova(m.x,m.y,a.spec.radius,a.spec.elem==='light'?'#e6ce82':'#92bed5');}
  }
  advance(dt){
    if(!this.active)return false;
    if(!this.valid()||this.disabled()){this.cancel();return true;}
    const m=this.mon;let left=dt;
    for(let i=0;i<4&&this.active&&left>1e-9;i++){
      const a=this.active,step=Math.min(left,a.remaining);a.remaining-=step;left-=step;
      if(a.stage==='travel'){
        const k=1-a.remaining/a.duration,nx=U.lerp(a.origin.x,a.point.x,k),ny=U.lerp(a.origin.y,a.point.y,k);
        if(!TerrainNavigation.segment(this.map,m.x,m.y,nx,ny,m.radius)){a.remaining=0;}
        else{m.x=nx;m.y=ny;m.moving=true;}
        if(a.kind==='leap')m.jumpZ=Math.sin(k*Math.PI)*32;
        else for(const t of this.targets())if(!t.groundImmune&&!a.hit.has(t)&&BossEncounters.contains(a.shape,t.x,t.y)&&U.dist(m.x,m.y,t.x,t.y)<=a.shape.width/2){a.hit.add(t);if(!t.tryBlock?.(m))this.damage(t,a.spec.mult,a.spec.elem);}
      }
      if(a.remaining>1e-8)break;
      if(a.stage==='windup'){
        if(m.blindUntil>this.world.time&&Math.random()<.7){a.stage='recovery';a.remaining=a.recovery;continue;}
        this.release(a);if(!this.valid()){this.cancel();break;}
        if(a.stage==='travel')continue;
      }else if(a.stage==='travel'&&a.kind==='leap'){
        m.jumpZ=0;
        // Landing damage is tied to the marked destination, never a blocked mid-flight point.
        if(U.dist(m.x,m.y,a.point.x,a.point.y)<.05){this.area(a);Sfx.play('slam');Game.addNova(m.x,m.y,a.spec.radius,'#92bed5');}
      }else if(a.stage==='recovery'){this.active=null;m.action=null;m.moving=false;break;}
      a.stage='recovery';a.remaining=a.recovery;m.jumpZ=0;m.moving=false;
    }
    return true;
  }
  update(dt){
    if(!this.valid()||this.disabled())return true;
    const m=this.mon,t=m.pickTarget(this.world.player);if(!t)return true;
    if(this.trySpecial())return true;
    if(this.profile.role==='boss')return false;
    const d=U.dist(m.x,m.y,t.x,t.y),ranged=!!m.def.projectile,los=this.los(t);
    if(ranged&&d<m.def.keepDist-1&&los&&d>.01){
      const p={x:m.x+(m.x-t.x)/d*1.5,y:m.y+(m.y-t.y)/d*1.5};
      if(TerrainNavigation.segment(this.map,m.x,m.y,p.x,p.y,m.radius)){m.path=[{cx:p.x,cy:p.y}];m.moveAlong(dt,m.def.speed,this.map,this.world.monsters);return true;}
    }
    const reach=ranged?m.def.range:m.def.range+t.radius+m.radius-.2;
    if(los&&d<reach){
      m.path=null;m.moving=false;m.face(t.x,t.y);
      if(m.attackCd<=0){const duration=ranged?.55:Math.min(.6,.9/m.def.atkRate);m.attackCd=1/m.def.atkRate;this.begin(ranged?'bolt':'melee',{windup:duration*.55,recovery:duration*.45},t,null,{x:t.x,y:t.y});}
    }else{
      let aim=t;
      if(this.profile.role==='flanker'&&d>3&&d<8){const a=Math.atan2(m.y-t.y,m.x-t.x)+(Math.floor(m.x+m.y)%2?.65:-.65),p={x:t.x+Math.cos(a)*2,y:t.y+Math.sin(a)*2};if(this.clear(p))aim=p;}
      m.chase(dt,aim,this.map,(x,y)=>MapGen.walkable(this.map,x,y));
    }
    return true;
  }
  draw(ctx,cam,debug=false){
    const a=this.active,m=this.mon;if(!this.valid())return;
    const showWarnings=debug||this.profile.role==='boss';
    if(!debug&&!(showWarnings&&a?.shape&&a.stage!=='recovery')&&!(this.blockUntil>this.world.time))return;
    const project=(x,y)=>({x:U.isoX(x,y)-cam.x,y:U.isoY(x,y)-cam.y-TerrainSurface.heightAt(this.map,x,y,m.surfaceId)*TerrainSurface.LIFT});
    const trace=s=>{
      const points=[];
      if(s.kind==='line'){const dx=Math.cos(s.angle),dy=Math.sin(s.angle),r=s.width/2;points.push([s.x-dy*r,s.y+dx*r],[s.x+dx*s.length-dy*r,s.y+dy*s.length+dx*r],[s.x+dx*s.length+dy*r,s.y+dy*s.length-dx*r],[s.x+dy*r,s.y-dx*r]);}
      else{const arc=s.kind==='cone'?s.arc:Math.PI*2,start=s.kind==='cone'?s.angle-arc/2:0;if(s.kind==='cone')points.push([s.x,s.y]);for(let i=0;i<=40;i++){const ang=start+arc*i/40;points.push([s.x+Math.cos(ang)*s.radius,s.y+Math.sin(ang)*s.radius]);}}
      ctx.beginPath();points.forEach(([x,y],i)=>{const p=project(x,y);i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y);});ctx.closePath();
    };
    ctx.save();
    if(debug){ctx.strokeStyle='#a6c6cc';ctx.globalAlpha=.5;ctx.setLineDash([5,5]);trace({kind:'circle',x:m.x,y:m.y,radius:m.def.range});ctx.stroke();if(m.def.keepDist){trace({kind:'circle',x:m.x,y:m.y,radius:m.def.keepDist});ctx.stroke();}ctx.setLineDash([]);}
    if(showWarnings&&a?.shape&&a.stage!=='recovery'){
      const col=a.kind==='blink'?'#b598d9':a.spec.elem==='light'?'#f0ce78':'#a3d1e5';ctx.fillStyle=col;ctx.strokeStyle=col;ctx.lineWidth=2;
      const shapes=a.shape.kind==='fan'?Array.from({length:a.shape.count},(_,i)=>({...a.shape,kind:'line',angle:a.shape.angle+(i-(a.shape.count-1)/2)*a.shape.spread})): [a.shape];
      if(a.kind==='blink')shapes.push({kind:'circle',x:a.origin.x,y:a.origin.y,radius:m.radius+.4});
      for(const s of shapes){trace(s);ctx.globalAlpha=.14;ctx.fill();ctx.globalAlpha=.9;ctx.stroke();}
      const names={bash:'Shield Bash',sweep:'Gilded Sweep',pulse:m.defId==='chained_sovereign'?'Sovereign’s Slam':'Sunderstone Pulse',charge:'Charge',leap:'Stonefall',blink:'Shadow Step',fan:'Crystal Fan'};
      const p=project(m.x,m.y);ctx.globalAlpha=1;ctx.font='12px sans-serif';ctx.textAlign='center';ctx.fillStyle=col;ctx.fillText(names[a.kind]+(a.stage==='windup'?' · '+a.remaining.toFixed(1):''),p.x,p.y-65*m.scale);
    }
    if(debug){const p=project(m.x,m.y);ctx.globalAlpha=1;ctx.fillStyle='#f0deaf';ctx.font='12px sans-serif';ctx.textAlign='center';ctx.fillText(this.profile.role+' · '+(a?.stage||'ready')+' · '+this.cooldown.toFixed(1)+'s',p.x,p.y+22);}
    if(this.blockUntil>this.world.time){ctx.strokeStyle='#f0ce78';ctx.lineWidth=3;ctx.globalAlpha=1;trace({kind:'cone',x:m.x,y:m.y,angle:m.visAng,arc:Math.PI*2/3,radius:1});ctx.stroke();}
    ctx.restore();
  }
}

class Monster extends Entity {
  constructor(defId, x, y, opts) {
    super(x, y);
    opts = opts || {};
    this.surfaceId=opts.surfaceId??this.surfaceId;
    const base = DATA.resolveEnemy(defId,Game.state?.map?.id);
    /* clone def so elite modifiers can mutate */
    const def = JSON.parse(JSON.stringify(base));
    const act2Profile=typeof Act2EnemyCombat!=='undefined'&&Act2EnemyCombat.profile(def,opts);
    this.defId = defId; this.def = def;
    this.combatWorld=Game.state;this.combatMap=Game.state.map;this.castEpoch=0;
    /* difficulty tier scaling (applied before elite modifiers) */
    const diff = (Game.state && DATA.DIFFICULTIES[Game.state.difficulty]) || DATA.DIFFICULTIES[0];
    def.lvl = DATA.monsterLevel(def, Game.state?.map?.zone, diff.id);
    if (diff.id > 0) {
      def.hp = Math.floor(def.hp * diff.hpMul);
      def.dmgMult = (def.dmgMult || 1) * diff.dmgMul;
      def.xp = Math.floor(def.xp * diff.xpMul);
      def.resAll = Math.min(70, (def.resAll || 0) + diff.resAdd);
    }
    this.lvl = def.lvl;
    this.name = def.name;
    this.elite = !!opts.elite;
    this.minion = !!opts.minion;
    this.summonOwner=opts.summonOwner||null;
    this.isBoss = !!def.boss;
    this.monsterFamily=opts.monsterFamily||opts.summonOwner?.monsterFamily||DATA.monsterFamily(defId);
    this.packId=opts.packId||opts.summonOwner?.packId||null;
    this.familyHome=opts.familyHome?{...opts.familyHome}:null;
    this.type = DATA.enemyType(def);    // humanoid | undead | beast | demon
    this.scale = def.big || 1;
    this.radius = 0.34 * this.scale;
    this.mods = [];
    if (this.elite) {
      const mod = (typeof EnemySkills!=='undefined'&&EnemySkills.eliteModifier(defId,opts)) || U.pick(DATA.ELITE_MODS);
      this.mods.push(mod);
      mod.apply(def);
      this.name = `${mod.name} ${def.name}`;
      def.hp = Math.floor(def.hp * 2.6); def.xp = Math.floor(def.xp * 3.5);
      this.tint = mod.tint;
      this.scale *= 1.18; this.radius *= 1.18;
    } else if (this.minion) {
      def.hp = Math.floor(def.hp * 1.4); def.xp = Math.floor(def.xp * 1.5);
    }
    this.maxHp = def.hp; this.hp = def.hp;
    this.aggro = false;
    this.wanderT = Math.random() * 3;
    this.repathT = 0;
    this.attackCd = 0;
    this.summonCd = def.summons ? def.summons.cd * 0.6 : 0;
    this.slamCd = def.slam ? def.slam.cd * 0.5 : 0;
    this.healCd = def.heals ? def.heals.cd * 0.5 : 0;
    this.teleCd = 2;
    this.volleyCd = def.volley ? def.volley.cd * 0.6 : 0;
    this.enraged = false;
    this.poisonDot = null;
    this.corpseT = 0;
    this.beacon = !!def.beaconSpawn;        // stationary spawner
    this.beaconCd = def.beaconSpawn ? 2 : 0;
    this.children = [];                      // enemies this beacon has raised
    this.leapCd = def.leap ? (def.leap.cd * 0.5) : 0;
    this.whirlCd = def.whirl ? (def.whirl.cd * 0.5) : 0;
    this.spriteKey = `${defId}|${this.elite ? this.mods[0].id : ""}`;
    this.spriteOpts = { kind: ["skeleton", "robed", "hound", "spider", "brute", "knight", "boss", "warlord", "beacon", "dragon", "serpent", "gargoyle", "demon", "golem", "ironlord", "abom", "wraith", "ooze", "imp", "treant", "grizzly", "wolf"].includes(def.sprite) ? def.sprite : "human",
      pal: def.pal, weapon: def.weapon || (def.bow ? "bow" : (def.sprite === "knight" ? "sword" : def.sprite === "boss" ? "sword" : def.sprite === "skeleton" ? "sword" : def.sprite === "robed" ? "wand" : "none")),
      shield: !!def.shield, scale: this.scale, monsterArt: true, monsterArtId: def.artId || def.sprite };
    if (defId === "vethriss") {
      this.name="Seraneth, Wounded";
      this.spriteOpts.npcArt="resident_frosthaven_0";
      this.spriteOpts.kind="human";
      this.def.atkRate=.4;
    }
    this.encounter = typeof BossEncounters !== "undefined" ? BossEncounters.create(this) : null;
    this.enemySkills = typeof EnemySkills !== 'undefined' ? EnemySkills.create(this,opts) : null;
    this.imperialCombat=def.act3Combat?new ImperialCombat(this):null;
    this.act2Combat=act2Profile?new Act2EnemyCombat(this):null;
    if(typeof Act2EnemyAnimation!=='undefined')Act2EnemyAnimation.attach(this);
  }

  applySlow(dur, pct) {
    this.slowT = Math.max(this.slowT, dur);
    this.slowPct = Math.max(this.slowPct, pct);
  }
  applyDragnet(aim, duration, owner) {
    if(this.dead||this.def.ccImmune||this.def.rootImmune||Game.bossWard?.(this))return;
    if(this.isBoss){this.applySlow(duration,40);return;}
    this.cancelAttacks();this.imperialCombat?.cancel();this.act2Combat?.cancel();this.enemySkills?.cancel();
    this.jumping=null;this.pulled=null;this.path=null;this.jumpZ=0;
    const d=U.dist(aim.x,aim.y,this.x,this.y),stop=Math.max(.55,this.radius),ratio=d>stop?stop/d:1;
    this.snarePull={fromX:this.x,fromY:this.y,x:aim.x+(this.x-aim.x)*ratio,y:aim.y+(this.y-aim.y)*ratio,t:0,dur:.3,root:Math.min(3,duration),owner,surfaceId:this.surfaceId};
  }
  updateSnarePull(dt,map) {
    const p=this.snarePull;if(!p)return false;
    if(p.surfaceId!==this.surfaceId){this.snarePull=null;return false;}
    const step=Math.min(dt,p.dur-p.t);p.t+=step;
    const k=Math.min(1,p.t/p.dur),tx=U.lerp(p.fromX,p.x,k),ty=U.lerp(p.fromY,p.y,k),d=U.dist(this.x,this.y,tx,ty),n=Math.max(1,Math.ceil(d/.08));
    const ox=this.x,oy=this.y;let blocked=false;
    for(let i=1;i<=n;i++){
      const x=U.lerp(ox,tx,i/n),y=U.lerp(oy,ty,i/n);
      if(!TerrainNavigation.segment(map,this.x,this.y,x,y,this.radius,1,this.surfaceId)){blocked=true;break;}
      this.x=x;this.y=y;
    }
    this.moving=U.dist(ox,oy,this.x,this.y)>.001;
    if(blocked||k>=1){this.snarePull=null;this.snareRootUntil=Math.max(this.snareRootUntil||0,Game.state.time-Math.max(0,dt-step)+p.root);this.moving=false;}
    return true;
  }
  /* nearest hostile: the player or one of their minions —
     and in the Cinderdeep, rival broods tear at each other too */
  pickTarget(player) {
    let best=null,bd=Infinity;
    for(const p of Game.state.players||[player])if(!p.dead&&TerrainLayers.same(this,p)){const d=U.dist2(this.x,this.y,p.x,p.y);if(d<bd){bd=d;best=p;}}
    for (const mi of TerrainLayers.targets(Game.state.minions)) {
      if (mi.dead || mi.untargetable) continue;   // hawks can't be picked as a direct target
      const dd = U.dist2(this.x, this.y, mi.x, mi.y);
      if (dd < bd) { bd = dd; best = mi; }
    }
    if (Game.state.map.zone.infight && !this.def.projectile && !this.isBoss) {
      for (const o of TerrainLayers.targets(Game.state.monsters)) {
        if (o === this || o.dead || o.isBoss || this.allied(o)) continue;
        const dd = U.dist2(this.x, this.y, o.x, o.y);
        if (dd < bd && dd < (this.def.sight * this.def.sight)) { bd = dd; best = o; }
      }
    }
    /* taunting bulwarks (boar / bear / Bone Golem / decoy) drag aggro onto themselves */
    let taunter = null, td = 1e9;
    for (const mi of TerrainLayers.targets(Game.state.minions)) { if (mi.dead || !mi.taunt) continue; const dd = U.dist2(this.x, this.y, mi.x, mi.y); if (dd < mi.taunt * mi.taunt && dd < td) { td = dd; taunter = mi; } }
    if (taunter) return taunter;
    return best;
  }
  /* this monster deals reduced damage while withered / spore-weakened / inside a war-banner */
  witherMult() {
    let m = 1;
    if (this.curseWither && Game.state.time < this.curseWither.until) m *= 1 - this.curseWither.pct / 100;
    if (this.bannerWeak && Game.state.time < this.bannerWeak.until) m *= 1 - this.bannerWeak.pct / 100;
    return Math.max(0.1, m);
  }

  /* effective resistance to an element (%, negative = vulnerable): resAll + per-type/def per-element */
  elemRes(elem) {
    let r = this.def.resAll || 0;
    const k = { fire: "resFire", cold: "resCold", light: "resLight", poison: "resPoison" }[elem];
    if (k) {
      const t = DATA.RES_BY_TYPE[DATA.enemyType(this.def)] || DATA.RES_BY_TYPE.default;
      r += (this.def[k] != null ? this.def[k] : (t[elem] || 0));
    }
    return Math.min(90, r);
  }
  resists() {
    return {
      physDR: Math.round(Math.min(0.6, (this.def.armor || 0) / ((this.def.armor || 0) + 22 + 4 * this.lvl)) * 100),
      fire: this.elemRes("fire"), cold: this.elemRes("cold"), light: this.elemRes("light"), poison: this.elemRes("poison"),
    };
  }
  loseHealth(amount) {
    this.hp -= amount;
    if (amount > 0) this.healthBarUntil = Game.state.time + 3;
  }
  takeDamage(amount, source, detail, elem) {
    if (this.dead) return 0;
    if (this.encounter && !this.encounter.canDamage()) return 0;
    if (this.bossOwner && !this.bossOwner.encounter?.canDamage()) return 0;
    const ward = Game.bossWard?.(this);
    if (ward) {
      if (!this.wardMessageAt || Game.state.time>=this.wardMessageAt) { Game.msg("The ritual shields this foe. "+ward+".","#d8b880"); this.wardMessageAt=Game.state.time+3; }
      return 0;
    }
    // Callers that already scaled mixed weapon hits, spell impacts or DoT
    // snapshots opt out. Raw player item procs use this final damage boundary.
    const elemental = (source instanceof Player) && !detail?.elementScaled && !detail?.environment ? DATA.elementMultiplier(source, elem) : 1;
    let dmg = amount * elemental * (this.enemySkills?.physicalMult(source,elem,detail) ?? 1);
    const hpBefore = this.hp;
    if (typeof UniquePowers !== "undefined") dmg *= 1 + UniquePowers.exposed(this) / 100;
    if(this.encounter && this.defId==="mire_mother" && this.encounter.phase>0 && this.encounter.stage==="recovery")dmg*=1.25;
    if (elem && elem !== "phys") {
      /* elemental hit: armor doesn't apply — use the element's resistance (resAll + per-element) */
      const er = this.elemRes(elem);
      if (er) dmg *= (1 - er / 100);
    } else {
      /* physical: armor reduces, then any flat all-resist */
      const dr = Math.min(0.6, this.def.armor / (this.def.armor + 22 + 4 * this.lvl));
      dmg *= (1 - dr);
      if (this.def.resAll) dmg *= (1 - this.def.resAll / 100);
    }
    /* mark of frailty: cursed monsters take amplified damage */
    if (this.curseFrailty && Game.state.time < this.curseFrailty.until) dmg *= 1 + this.curseFrailty.pct / 100;
    /* Vanguard Sunder shred + Veil Ranger Killing Mark both amplify */
    if (this.sunder && Game.state.time < this.sunder.until) dmg *= 1 + 0.06 * this.sunder.stacks;
    if (this.killMark && Game.state.time < this.killMark.until) dmg *= 1 + (this.killMark.amp || 0) / 100;
    dmg = Math.max(detail?.uniqueDot ? 0 : 1, dmg);
    const nextForm=this.defId==="vethriss" && this.def.phases?.[this.phaseIdx||0];
    if (nextForm) dmg=Math.min(dmg,Math.max(0,this.hp-this.maxHp*nextForm.at));
    this.loseHealth(dmg);
    if (!detail?.bleedDot) this.flashT = 0.1;
    if(!this.aggro)this.wakePack();
    this.aggro = true;
    if (!detail?.bleedDot && (!this.action || this.action.state !== "attack")) {
      if (Math.random() < 0.4) this.startAction("hit", 0.18);
    }
    const actual = Math.max(0, Math.min(hpBefore, hpBefore - this.hp));
    if (this.hp <= 0) this.die(source, { ...detail, damage: actual });
    if (typeof UniquePowers !== "undefined" && (source instanceof Player)) UniquePowers.hit(source,this,actual,detail,hpBefore);
    return actual;
  }
  attackNova(x,y,radius,color){
    Game.addNova(x,y,radius,color,(typeof Act1EnemyAnimation!=='undefined'?Act1EnemyAnimation.novaPresentation(this):undefined)||(typeof Act5EnemyAnimation!=='undefined'?Act5EnemyAnimation.novaPresentation(this):undefined)||(typeof Act2EnemyAnimation!=='undefined'?Act2EnemyAnimation.novaPresentation(this):undefined));
  }
  deferAttack(delay,fn){
    if(typeof Act2EnemyAnimation!=='undefined')Act2EnemyAnimation.deferred(this,delay);
    if(typeof Act5EnemyAnimation!=='undefined')Act5EnemyAnimation.deferred(this,delay);
    const act5Visual=this.act5Visual;
    if(typeof Act1EnemyAnimation!=='undefined')Act1EnemyAnimation.deferred(this,delay);
    const act1Visual=this.act1Visual;
    const combat=this.imperialCombat,epoch=combat?.epoch;
    const world=Game.state,map=world.map,castEpoch=this.castEpoch;
    Game.afterDelay(delay,()=>{
      if(this.dead||Game.state!==world||world.map!==map||world!==this.combatWorld||map!==this.combatMap||!world.monsters.includes(this)||this.castEpoch!==castEpoch||this.castInterrupted())return;
      if(combat&&(!combat.valid()||combat.disabled()||combat.epoch!==epoch))return;
      if(typeof Act2EnemyAnimation!=='undefined')Act2EnemyAnimation.emit(this,this.def.projectile?'bolt':'melee');
      if(typeof Act5EnemyAnimation!=='undefined')Act5EnemyAnimation.release(this,act5Visual);
      if(typeof Act1EnemyAnimation!=='undefined')Act1EnemyAnimation.release(this,act1Visual);
      fn();
    });
  }
  castInterrupted(){const t=Game.state.time;return (Game.state.players||[Game.state.player]).every(p=>p.dead)||this.stunT>0||this.frozen>t||this.feared>t||this.pulled||this.beckon?.until>t||this.fleeUntil>t;}
  cancelAttacks(){
    if(typeof Act2EnemyAnimation!=='undefined')Act2EnemyAnimation.cancel(this);
    if(typeof Act5EnemyAnimation!=='undefined')Act5EnemyAnimation.cancel(this);
    if(typeof Act1EnemyAnimation!=='undefined')Act1EnemyAnimation.cancel(this);
    this.castEpoch++;
    if(this.attackWarning)this.attackWarning.ttl=0;
    if(this.slamWarning)this.slamWarning.ttl=0;
    this.attackWarning=this.slamWarning=null;
    // A canceled leap returns to its last supported launch point.
    if(this.leaping){this.x=this.leaping.fx;this.y=this.leaping.fy;}
    this.charging=this.leaping=this.whirling=null;this.jumpZ=0;
    if(this.action?.state==='attack'||this.action?.state==='cast')this.action=null;
  }
  allied(other){return !!other&&other!==this&&(other.def.faction||other.monsterFamily||other.def.family)===(this.def.faction||this.monsterFamily||this.def.family);}
  wakePack(){
    if(this.isBoss||this.beacon)return;
    for(const other of TerrainLayers.targets(Game.state.monsters)){
      if(other===this||other.dead||other.aggro||other.isBoss||other.beacon||!this.allied(other))continue;
      // An alert ends at this pack. Woken allies do not relay it into a chain.
      if(this.packId?other.packId!==this.packId:other.packId||other.monsterFamily!==this.monsterFamily)continue;
      if(U.dist2(this.x,this.y,other.x,other.y)>81||!this.combatLos(other))continue;
      other.aggro=true;other.path=null;
    }
  }
  familyIdle(dt,map){
    const home=this.familyHome,family=DATA.MONSTER_FAMILIES[this.monsterFamily];
    if(!home||!family)return false;
    this.wanderT-=dt;
    if(this.wanderT<=0){
      const phase=U.hash(this.packId||this.defId),time=Game.state.time+phase%17;
      this.wanderT=family.routine==='guard'?5:2.5+phase%7*.2;
      const away=U.dist(this.x,this.y,home.x,home.y)>6;
      let tx=home.x,ty=home.y;
      if(!away){
        const angle=phase%628/100,patrol=family.routine==='patrol';
        const range=patrol?2.4:family.routine==='prowl'?2:family.routine==='nest'?1.1:family.routine==='ritual'?.45:.25;
        const a=patrol?angle:angle+Math.floor(time/4)*1.7,step=patrol?(Math.floor(time/8)%2?1:-1):1;
        tx+=Math.cos(a)*range*step;ty+=Math.sin(a)*range*step;
      }
      if(this.supportedPoint(tx,ty)&&!map.hazard[(tx|0)+(ty|0)*map.w]){
        if(away)Game.repath(this,tx,ty,this.surfaceId);
        else if(TerrainNavigation.segment(map,this.x,this.y,tx,ty,this.radius))this.path=[{cx:tx,cy:ty,x:tx|0,y:ty|0}];
      }
      if(family.routine==='ritual'||family.routine==='nest')this.face(home.anchorX,home.anchorY);
    }
    this.moveAlong(dt,this.def.speed*(family.routine==='prowl'?.5:.32),map,TerrainLayers.targets(Game.state.monsters));
    if(!this.path?.length)this.moving=false;
    return true;
  }
  eligibleTarget(target){
    if(!target||target.dead||target.untargetable||!TerrainLayers.same(this,target))return false;
    const world=Game.state;
    if((world.players||[world.player]).includes(target)||world.minions.includes(target))return true;
    return !!world.map.zone.infight&&!this.def.projectile&&!this.isBoss&&target!==this&&!target.isBoss&&world.monsters.includes(target)&&!this.allied(target);
  }
  hostileTargets(){
    const world=Game.state,targets=[...(world.players||[world.player]),...world.minions];
    if(world.map.zone.infight&&!this.def.projectile&&!this.isBoss)for(const other of world.monsters)if(this.eligibleTarget(other))targets.push(other);
    return targets.filter(t=>!t.dead&&!t.untargetable&&TerrainLayers.same(this,t));
  }
  combatLos(target,origin=this){return (target.surfaceId===undefined||TerrainLayers.same(this,target))&&U.los((x,y)=>MapGen.walkable(Game.state.map,x,y,this.surfaceId),origin.x,origin.y,target.x,target.y);}
  supportedPoint(x,y,radius=this.radius,map=Game.state.map){
    if(!TerrainNavigation.clear(map,x,y,radius))return false;
    if(map.surfaceVersion)return TerrainSurface.supported(map,x,y,radius);
    // Large bodies can cover a legacy tile between the four corner samples.
    if(radius>.5)for(let cy=Math.floor(y-radius);cy<=Math.floor(y+radius);cy++)for(let cx=Math.floor(x-radius);cx<=Math.floor(x+radius);cx++)if(map.blocked[cx+cy*map.w])return false;
    return true;
  }
  chargePath(map,ax,ay,bx,by){
    if(!TerrainNavigation.segment(map,ax,ay,bx,by,this.radius))return false;
    if(!map.surfaceVersion&&this.radius>.5){const n=Math.max(1,Math.ceil(Math.hypot(bx-ax,by-ay)/.12));for(let i=1;i<=n;i++)if(!this.supportedPoint(U.lerp(ax,bx,i/n),U.lerp(ay,by,i/n),this.radius,map))return false;}
    return true;
  }
  combatColor(elem){return {fire:'#ff905c',cold:'#a8e5ff',light:'#ffe58e',shadow:'#c9a3ef',poison:'#a8df79'}[elem]||'#e4d1b0';}
  combatSound(elem,kind,melee=false){
    if(typeof Act1EnemyAnimation!=='undefined'&&Act1EnemyAnimation.eligible(this)&&elem&&elem!=='phys')return this.attackSound(elem,'hit');
    if(melee)return kind==='sword'||kind==='axe'?'swing':elem==='shadow'?'curse':'hit';
    return kind==='arrow'?'bow':kind==='axe'?'swing':{fire:'firebolt',cold:'frost',light:'zap',shadow:'curse',poison:'curse'}[elem]||'hit';
  }
  attackSound(elem,fallback){
    return typeof Act1EnemyAnimation!=='undefined'&&Act1EnemyAnimation.eligible(this)
      ?({fire:'firebolt',cold:'frost',light:'zap',shadow:'curse',poison:'curse'}[elem]||fallback):fallback;
  }
  dealAttack(target,damage,elem='phys',onHit=false){
    if(!target||target.dead)return 0;
    const before=Math.max(0,target.hp);
    // Monsters take elemental damage in argument four; heroes and pets use three.
    if(target instanceof Monster)target.takeDamage(damage,this,null,elem);else target.takeDamage(damage,this,elem);
    if(onHit===true&&!target.dead){
      for(const [kind,value]of Object.entries(this.def.elemDmg||{}))this.dealAttack(target,value*2,kind);
      if(this.def.poison)this.dealAttack(target,this.def.poison,'poison');
    }
    const actual=Math.max(0,before-Math.max(0,target.hp));
    if(onHit&&actual>0){
      if(this.def.chillOnHit&&!target.dead){
        target.slowPct=Math.max(target.slowT>0?target.slowPct||0:0,30);
        target.slowT=Math.max(target.slowT||0,this.def.chillOnHit*(1-(target.stats?.ccReduce||0)/100));
      }
      if(this.def.lifeOnHit&&!this.dead&&!this.noHeal)this.hp=Math.min(this.maxHp,this.hp+actual*.1);
    }
    return actual;
  }
  areaAttack(shape,damage,elem='phys'){
    for(const target of this.hostileTargets())if(!target.groundImmune&&BossEncounters.contains(shape,target.x,target.y)&&this.combatLos(target,shape))this.dealAttack(target,damage,elem);
  }
  warnAttack(kind,shape,ability,resolve){
    const duration=Math.max(ability.windup||0,this.def.warnings?.[kind]||({slam:.8,charge:.6,leap:.6,whirl:.6}[kind]||.6));
    const warning={surfaceId:this.surfaceId,type:'enemywarning',owner:this,shape,kind,col:this.combatColor(ability.elem||this.def.meleeElem),x:shape.x,y:shape.y,ttl:duration,maxTtl:duration};
    this.attackWarning=warning;Game.state.fx.push(warning);this.path=null;this.moving=false;
    this.startAction('attack',duration+(ability.recovery??.25),{enemySkill:kind,act5Kind:kind});
    this.deferAttack(duration,()=>{if(this.attackWarning!==warning)return;warning.ttl=0;this.attackWarning=null;resolve(warning);});
    return warning;
  }
  sustainWarning(warning,duration){warning.ttl=warning.maxTtl=duration;warning.phase='active';this.attackWarning=warning;}
  finishWarning(){if(this.attackWarning)this.attackWarning.ttl=0;this.attackWarning=null;if(typeof Act5EnemyAnimation!=='undefined')Act5EnemyAnimation.finish(this);if(typeof Act1EnemyAnimation!=='undefined')Act1EnemyAnimation.finish(this);}
  ownSummon(child){
    child.summonOwner=this;child.fromSummon=true;child.def.faction=this.def.faction||this.monsterFamily||this.def.family;
    child.monsterFamily=this.monsterFamily;child.packId=this.packId;
    this.children.push(child);return child;
  }
  livingChildren(){this.children=this.children.filter(c=>!c.dead&&TerrainLayers.targets(Game.state.monsters).includes(c));return this.children.length;}

  die(source, uniqueContext) {
    const credit=Game.playerOwner?.(source)||Game.state.player;
    if (this.dead) return;
    if(Game.state!==this.combatWorld||Game.state.map!==this.combatMap){this.dead=true;this.hp=0;this.cancelAttacks();return;}
    if(this.encounter&&!this.encounter.canDamage())return;
    if (Game.bossWard?.(this)) { this.hp=Math.max(1,this.hp); return; }
    this.imperialCombat?.cancel();
    const nextForm=this.defId==="vethriss" && this.def.phases?.[this.phaseIdx||0];
    if (nextForm) { this.hp=Math.max(this.hp,this.maxHp*nextForm.at); return; }
    this.dead = true;
    if(this.packId&&Game.state.map.ecology){
      const map=Game.state.map,territory=map.ecology.territories.find(t=>t.packs.includes(this.packId));
      if(territory&&!Game.state.monsters.some(m=>!m.dead&&territory.packs.includes(m.packId))){
        const site=map.props.find(p=>p.territoryId===territory.id);
        if(site){site.spent=true;site.label=DATA.MONSTER_FAMILIES[territory.family].name+' — deserted';}
      }
    }
    this.cancelAttacks();
    this.enemySkills?.cancel();
    if (typeof UniquePowers !== "undefined") UniquePowers.killed(this,source,uniqueContext);
    if(this.encounter)this.encounter.finish();
    if(this.bossOwner?.encounter)this.bossOwner.encounter.onOwnedDeath(this);
    this.startAction("death", 0.6);
    this.act2Combat?.onDeath();
    this.corpseT = 12;
    if(typeof Act2EnemyAnimation!=='undefined')Act2EnemyAnimation.emit(this,'death');
    if(typeof Act5EnemyAnimation!=='undefined')Act5EnemyAnimation.emit(this,'death');
    if(typeof Act1EnemyAnimation!=='undefined')Act1EnemyAnimation.emit(this,'death');
    Sfx.play(this.def.sounds === "bone" ? "die_bone" : "die_flesh");
    /* affliction payoffs that fire when the host dies */
    if (this.killMark) Game.detonateMark(this);
    if (this.doom) Game.detonateDoom(this);
    if (this.plague) {
      const bx = this.x, by = this.y, br = this.plague.burstRange || 2.5;
      Sfx.playSkill?.('gravebinder_2_1','impact',{owner:credit,emitter:this,elem:'poison'});
      if(typeof SkillVFX!=='undefined')SkillVFX.scope(credit,'gravebinder_2_1',()=>Game.addNova(bx,by,br,"#90ff70"));else Game.addNova(bx, by, br, "#90ff70");
      for (const m of TerrainLayers.targets(Game.state.monsters)) { if (m.dead || m === this || m.plague) continue; if (U.dist(bx, by, m.x, m.y) <= br + m.radius) m.plague = { ...this.plague, until: Game.state.time + 5, tickT: 0, spreadCd: 1.5, burstRange: br }; }
    }
    /* Rabies: a rabid corpse erupts into a contagious poison cloud */
    if (this.rabies && Game.state.time < this.rabies.until) {
      Sfx.playSkill?.('rabies','impact',{owner:this.rabies.owner||credit,emitter:this,elem:'poison'});
      if(typeof SkillVFX!=='undefined')SkillVFX.scope(this.rabies.owner||credit,'rabies',()=>Game.addNova(this.x,this.y,this.rabies.cloudRad,"#90ff70"));else Game.addNova(this.x, this.y, this.rabies.cloudRad, "#90ff70");
      Game.state.fx.push({ surfaceId:TerrainLayers.current(Game.state.map), type: "groundfield", fieldKind: "miasma", rabies: true, rdps: this.rabies.dps, rdur: 8, rcloud: this.rabies.cloudRad,
        owner: this.rabies.owner || credit, elementScaled: this.rabies.elementScaled, sourceSkill:'rabies', x: this.x, y: this.y, radius: this.rabies.cloudRad, ttl: 4, maxTtl: 4, tickEvery: 0.5 });
    }
    /* Brittle Bones: a frozen foe SHATTERS on death, splashing cold */
    if (this.frozen && Game.state.time < this.frozen && (this.freezeOwner||credit)?.stats.shatterRank > 0) {
      const pl0=this.freezeOwner||credit, sr=pl0.stats.shatterRank;
      Game.addNova(this.x, this.y, 2.2, "#9fd8ff"); Sfx.playSkill?.('emberwitch_1_2','impact',{owner:pl0,emitter:this,elem:'cold',trigger:'frozen'});
      for (const m of TerrainLayers.targets(Game.state.monsters)) { if (m.dead || m === this) continue; if (U.dist(this.x, this.y, m.x, m.y) < 2.2 + m.radius) pl0.spellHit(m, 6 + 3 * sr, "cold", {}); }
    }
    /* Heat Haze: a Scorched corpse erupts, scattering its stacks to the pack */
    if (this.scorch && (this.scorch.owner||credit)?.stats.scorchSpread > 0) {
      if(typeof SkillAudio!=='undefined')SkillAudio.passive(credit,'fire',{emitter:this});
      const give = Math.ceil(this.scorch.stacks / 2), sdps = this.scorch.dps;
      Game.addNova(this.x, this.y, 2.0, "#ff7a20");
      for (const m of TerrainLayers.targets(Game.state.monsters)) { if (m.dead || m === this) continue; if (U.dist(this.x, this.y, m.x, m.y) < 2.0 + m.radius) { const sc = m.scorch || { stacks: 0 }; sc.stacks = Math.min(5, sc.stacks + give); sc.dps = sdps; sc.owner = this.scorch.owner || credit; sc.sourceSkill = this.scorch.sourceSkill; sc.until = Game.state.time + 3; m.scorch = sc; } }
    }
    /* Grave Whispers: a curse leaps off the dead to the nearest un-cursed foe */
    const pl = this.curseFrailty?.owner||this.curseWither?.owner||credit;
    if (pl && pl.stats && pl.stats.curseSpread > 0 && (this.curseFrailty || this.curseWither)) {
      let best = null, bd = 25;
      for (const m of TerrainLayers.targets(Game.state.monsters)) { if (m.dead || m === this || m.curseFrailty || m.curseWither) continue; const dd = U.dist2(this.x, this.y, m.x, m.y); if (dd < bd) { bd = dd; best = m; } }
      if (best) { if (this.curseFrailty) best.curseFrailty = { owner:this.curseFrailty.owner||pl, until: Game.state.time + 6, pct: this.curseFrailty.pct }; if (this.curseWither) best.curseWither = { owner:this.curseWither.owner||pl, until: Game.state.time + 6, pct: this.curseWither.pct }; Game.addParticle(best.x, best.y, "#b070d0"); if(typeof SkillAudio!=='undefined')SkillAudio.passive(pl,'curse',{target:best}); }
    }
    /* Soul Harvest: each cursed/marked kill grants a stacking spell charge */
    if (pl && pl.stats && pl.stats.soulCharge > 0 && (this.curseFrailty || this.curseWither || this.killMark || this.doom)) {
      if(typeof SkillAudio!=='undefined')SkillAudio.passive(pl,'kill',{emitter:this});
      const ex = pl.buffs.find(b => b.id === "soul_charge");
      if (ex) { ex.until = Game.state.time + 5; ex.stacks = Math.min(5, (ex.stacks || 1) + 1); ex.stats = { spellPct: pl.stats.soulCharge * ex.stacks }; }
      else pl.buffs.push({ id: "soul_charge", label: "Soul Charge", emoji: "💜", stacks: 1, stats: { spellPct: pl.stats.soulCharge }, until: Game.state.time + 5 });
      pl.computeStats();
    }
    /* bloated things go out loudly */
    if (this.def.deathBurst && !this.act2Combat) {
      const b = this.def.deathBurst, bx = this.x, by = this.y;
      const world=Game.state,map=world.map,epoch=this.castEpoch,windup=Math.max(.6,b.windup||0),col=this.combatColor(b.elem||'poison');
      const shape={kind:'circle',x:bx,y:by,radius:b.radius};
      const warning={surfaceId:this.surfaceId,type:'enemywarning',owner:this,death:true,shape,kind:'deathBurst',col,x:bx,y:by,ttl:windup,maxTtl:windup};
      world.fx.push(warning);
      Game.afterDelay(windup, () => {
        warning.ttl=0;
        if(Game.state!==world||world.map!==map||this.castEpoch!==epoch||this.combatMap!==map)return;
        Sfx.play(this.attackSound(b.elem,'blast'));
        this.attackNova(bx, by, b.radius, col);
        for (let i = 0; i < 12; i++) Game.addParticle(bx + U.rf(-0.5, 0.5), by + U.rf(-0.5, 0.5), col);
        this.areaAttack(shape,b.dmg,b.elem||'poison');
      });
    }
    /* split into lesser copies on death (gated to non-minions so it can't cascade) */
    if (this.def.splitOnDeath && !this.minion && !this.act2Combat) {
      const sp = this.def.splitOnDeath, bx = this.x, by = this.y, base = this;
      const world=Game.state,map=world.map,epoch=this.castEpoch;
      Game.afterDelay(0.2, () => {
        if(Game.state!==world||world.map!==map||this.castEpoch!==epoch||this.combatMap!==map)return;
        for (let i = 0; i < sp.count; i++) {
          const a = Math.random() * Math.PI * 2, sx = bx + Math.cos(a) * 1.2, sy = by + Math.sin(a) * 1.2;
          if (!MapGen.walkable(Game.state.map, sx, sy)) continue;
          const m = new Monster(sp.id || base.defId, sx, sy, { minion: true });
          m.aggro = true; m.scale *= 0.62; m.spriteOpts.scale = m.scale; m.radius *= 0.62;
          m.maxHp = Math.max(1, Math.round(m.maxHp * 0.35)); m.hp = m.maxHp;
          if(!this.supportedPoint(sx,sy,m.radius,map))continue;
          this.ownSummon(m);
          Game.state.monsters.push(m); this.attackNova(sx, sy, 0.6, this.tint || "#c0a0a0");
        }
      });
    }
    Game.onMonsterDeath(this, source);
  }

  startTelegraphedSlam(player, map) {
    const s=this.def.slam, hero=player, world=Game.state;
    const warning={surfaceId:this.surfaceId,type:"slamwarning",owner:this,x:this.x,y:this.y,radius:s.radius,
      ttl:s.windup,maxTtl:s.windup,col:s.color||"#a8e5ff"};
    this.slamWarning=warning;this.slamCd=s.cd;this.path=null;this.moving=false;
    this.startAction("attack",s.windup+(s.recovery??1),{act5Kind:"slam"});
    Game.state.fx.push(warning);Sfx.play("shrine");
    this.deferAttack(s.windup,()=>{
      if(this.slamWarning!==warning)return;
      this.slamWarning=null;warning.ttl=0;
      if(this.dead||hero.dead||Game.state!==world||Game.state.map!==map||!world.monsters.includes(this))return;
      if(this.openingId&&!["bossIntro","boss"].includes(world.flags.opening?.stage))return;
      this.attackNova(warning.x,warning.y,s.radius,warning.col);Sfx.play(this.attackSound(s.elem||this.def.meleeElem,'slam'));
      if(!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)Game.fx.shake=Math.max(Game.fx.shake,3);
      // Match the visible boundary exactly: the actor's ground anchor must be inside.
      this.areaAttack({kind:'circle',x:warning.x,y:warning.y,radius:s.radius},U.rf(...this.def.dmg)*s.mult*(this.def.dmgMult||1)*2.2*this.witherMult(),s.elem||this.def.meleeElem);
    });
  }

  update(dt, player, map) {
    if(Game.state!==this.combatWorld||map!==this.combatMap){this.cancelAttacks();return;}
    if(!this.dead&&this.castInterrupted())this.cancelAttacks();
    if(this.enemySkills&&(this.dead||player.dead||this.stunT>0||this.frozen>Game.state.time||this.feared>Game.state.time))this.enemySkills.cancel();
    this.imperialCombat?.tick(dt);
    this.updateAnim(dt);
    if(typeof Act2EnemyAnimation!=='undefined')Act2EnemyAnimation.tick(this);
    if(typeof Act5EnemyAnimation!=='undefined')Act5EnemyAnimation.tick(this);
    if(typeof Act1EnemyAnimation!=='undefined')Act1EnemyAnimation.tick(this);
    if (this.dead) { this.act2Combat?.updateDead(dt); this.corpseT -= dt; return; }
    if (Game.bossWard?.(this)) { this.path=null; this.moving=false; return; }
    if (this.encounter && !this.encounter.prepare(player,map)) return;
    if (this.bossOwner) {
      if(this.bossOwner.dead || !this.bossOwner.encounter?.active){this.dead=true;this.corpseT=0;return;}
      if(this.encounterGrace>0){this.encounterGrace-=dt;return;}
    }
    /* beacons: stationary rune-stones that vomit out the dead until destroyed */
    if (this.beacon) {
      this.moving = false;
      this.children = this.children.filter(c => !c.dead);
      this.beaconCd -= dt;
      const bs = this.def.beaconSpawn;
      if (this.beaconCd <= 0 && this.children.length < bs.max && U.dist(this.x, this.y, player.x, player.y) < 22) {
        this.beaconCd = bs.cd;
        if(typeof Act2EnemyAnimation!=='undefined')Act2EnemyAnimation.emit(this,'summon');
        if(typeof Act1EnemyAnimation!=='undefined')Act1EnemyAnimation.summon(this);
        for (let i = 0; i < bs.count; i++) {
          const a = Math.random() * Math.PI * 2, r = 1.2 + Math.random() * 1.4;
          const sx = this.x + Math.cos(a) * r, sy = this.y + Math.sin(a) * r;
          if (!MapGen.walkable(map, sx, sy)) continue;
          const mm = new Monster(U.pick(bs.pool), sx, sy, {});
          mm.aggro = true; this.ownSummon(mm);
          Game.state.monsters.push(mm);
          this.attackNova(sx, sy, 0.7, "#9fe0ff");
          for (let k = 0; k < 5; k++) Game.addParticle(sx, sy, "#9fe0ff");
        }
        Sfx.play("shrine");
      }
      return;
    }
    if (typeof UniquePowers !== "undefined") UniquePowers.tickDots(this,dt);
    if (this.dead) return;
    if (this.bleedDot) {
      const bleed = this.bleedDot, elapsed = Math.min(dt, bleed.t);
      bleed.t -= elapsed;
      // Use physical mitigation and boss protection without triggering on-hit effects.
      this.takeDamage(bleed.dps * elapsed, bleed.owner, { uniqueDot: true, bleedDot: true }, "phys");
      if (this.dead) return;
      if (Math.random() < elapsed * 4) Game.addParticle(this.x, this.y, "#b83040");
      if (bleed.t <= 0) this.bleedDot = null;
    }
    if (this.poisonDot) {
      this.poisonDot.t -= dt;
      this.loseHealth(this.poisonDot.dps * dt * (1 + ((player.stats && player.stats.poisonDotPct) || 0) / 100) * (1 - this.elemRes(this.poisonDot.fire ? "fire" : "poison") / 100));
      if (Math.random() < dt * 6) Game.addParticle(this.x, this.y, this.poisonDot.fire ? "#ff9040" : "#90ff70");
      if (this.hp <= 0) { this.die(this.poisonDot.owner || player, { sourceSkill: this.poisonDot.sourceSkill, elem: this.poisonDot.fire ? "fire" : "poison" }); return; }
      if (this.poisonDot.t <= 0) this.poisonDot = null;
    }
    /* Scorch: Cinder's stacking burn that Pyre consumes and Heat Haze spreads */
    if (this.scorch) {
      if (Game.state.time < this.scorch.until) { this.loseHealth(this.scorch.dps * dt); if (Math.random() < dt * 5) Game.addParticle(this.x, this.y, "#ff7a20"); if (this.hp <= 0) { this.die(this.scorch.owner || player, { sourceSkill: this.scorch.sourceSkill, elem: "fire" }); return; } }
      else this.scorch = null;
    }
    /* Contagion: ticking plague that leaps to the healthy and bursts on death */
    if (this.plague) {
      const pg = this.plague;
      pg.tickT -= dt;
      if (pg.tickT <= 0) { pg.tickT = 1; this.loseHealth(pg.tick); if (Math.random() < 0.6) Game.addParticle(this.x, this.y, "#b8ff90"); }
      pg.spreadCd -= dt;
      if (pg.spreadCd <= 0) {
        pg.spreadCd = 1.5 * (1 - ((player.stats && player.stats.plagueSpreadPct) || 0) / 100);
        const rng = (pg.spreadRange || 3.5) * (1 + ((player.stats && player.stats.plagueSpreadPct) || 0) / 100);
        let best = null, bd = rng * rng;
        for (const m of TerrainLayers.targets(Game.state.monsters)) { if (m.dead || m === this || m.plague) continue; const dd = U.dist2(this.x, this.y, m.x, m.y); if (dd < bd) { bd = dd; best = m; } }
        if (best) best.plague = { ...pg, tickT: 0, spreadCd: 1.5 };
        if(best&&typeof SkillVFX!=='undefined')SkillVFX.transfer(player,'gravebinder_2_1',this,best);
      }
      if (this.hp <= 0) { this.die(pg.owner || player, { sourceSkill: pg.sourceSkill, elem: "poison" }); return; }
      if (Game.state.time >= pg.until) this.plague = null;
    }
    /* Doom: a charging death-timer that detonates when it expires */
    if (this.doom) {
      this.doom.charge = Math.min(this.doom.maxCharge, this.doom.charge + dt);
      if (Game.state.time >= this.doom.until) { Game.detonateDoom(this); }
    }
    /* Killing Mark detonates on expiry too, not only on death */
    if (this.killMark && Game.state.time >= this.killMark.until) Game.detonateMark(this);
    if (this.def.regen && !this.noHeal) this.hp = Math.min(this.maxHp, this.hp + this.maxHp * this.def.regen * dt);
    // Keep lifecycle and existing damage ticking while the pursuit takes stairs.
    // Stationary encounters remain in their authored arenas.
    if(this.updateSnarePull(dt,map))return;
    if(map.layers&&!TerrainLayers.same(this,player)){
      if(!this.awaitingSurface){this.cancelAttacks();this.awaitingSurface=true;}
      if(this.isBoss||this.encounter||this.stunT>0||this.frozen>Game.state.time||player.dead||(!this.aggro&&U.dist(this.x,this.y,player.x,player.y)>22)){
        this.path=null;this.moving=false;return;
      }
      this.aggro=true;
      Game.repath(this,player.x,player.y,player.surfaceId);
      this.moveAlong(dt,this.def.speed,map,TerrainLayers.targets(Game.state.monsters));
      return;
    }
    this.awaitingSurface=false;
    if(this.encounter){this.encounter.update(dt,player,map);return;}
    if(this.act2Held){this.path=null;this.moving=false;return;}
    if(this.act2Grace>0){this.act2Grace-=dt;this.moving=false;return;}
    if(this.act2Combat?.update(dt))return;
    if(this.enemySkills?.tick(dt,player,map))return;
    if(this.encounterKind==="portal"||this.encounterKind==="decoy"){this.moving=false;return;}
    /* boss phase transitions: shed armor, change shape, gain new weapons */
    if (this.def.phases) {
      this.phaseIdx = this.phaseIdx || 0;
      const ph = this.def.phases[this.phaseIdx];
      if (ph && this.hp / this.maxHp <= ph.at) {
        this.phaseIdx++;
        const s = ph.set || {};
        if (s.speedMul) this.def.speed *= s.speedMul;
        if (s.atkMul) this.def.atkRate *= s.atkMul;
        if (s.dmgMul) this.def.dmgMult = (this.def.dmgMult || 1) * s.dmgMul;
        if (s.volley) { this.def.volley = s.volley; this.volleyCd = 1.5; }
        if (s.teleports) { this.def.teleports = s.teleports; this.teleCd = 1.5; }
        if (s.summons) { this.def.summons = s.summons; this.summonCd = 2; }
        if (s.slam) { this.def.slam = s.slam; this.slamCd = 2; }
        if (s.tint !== undefined) this.tint = s.tint;
        if (s.pal) Object.assign(this.spriteOpts.pal, s.pal);
        if (s.weapon !== undefined) this.spriteOpts.weapon = s.weapon;
        if (s.sprite) { this.spriteOpts.kind=s.sprite; this.spriteOpts.monsterArtId=s.artId||s.sprite; delete this.spriteOpts.npcArt; this.spriteKey=this.defId+"|phase"+this.phaseIdx; }
        if (s.name) this.name=s.name;
        if (s.copyBosses) { this.def.copyBosses=true; this.copyBossCd=0; this.copyBossIndex=0; }
        if (s.scale) { this.scale *= s.scale; this.spriteOpts.scale = this.scale; this.radius *= s.scale; }
        if (ph.msg) Game.centerMsg(ph.msg[0], ph.msg[1] || "");
        Sfx.play("vox_boss");
        this.attackNova(this.x, this.y, 2.4, s.tint || "#c080ff");
        Game.fx.shake = Math.max(Game.fx.shake, 5);
      }
    }
    /* yanked in by a Vanguard harpoon: slide to the destination, then stunned + struck */
    if (this.pulled && !this.movementLocked()) {
      const P = this.pulled; P.t += dt; const k = Math.min(1, P.t / P.dur);
      this.x = U.lerp(P.fx, P.tx, k); this.y = U.lerp(P.fy, P.ty, k); this.moving = true;
      if (k >= 1) { this.pulled = null; this.stunT = Math.max(this.stunT, P.stun); if (P.owner && !P.owner.dead) P.owner.strike(this, P.mult, { auto: true }); }
      return;
    }
    /* a flat-out charge: barrel toward a point, trampling whatever it reaches */
    if (this.charging) {
      const C = this.charging; C.t += dt;
      const dx = C.tx - this.x, dy = C.ty - this.y, dd = Math.hypot(dx, dy) || .001;
      const step = Math.min(dd,(this.def.charge.speed || 9) * dt),ox=this.x,oy=this.y;
      const nx=this.x+dx/dd*step,ny=this.y+dy/dd*step;
      if(!this.chargePath(map,ox,oy,nx,ny)){this.charging=null;this.finishWarning();return;}
      this.x=nx;this.y=ny;
      this.face(C.tx, C.ty); this.moving = true;
      const swept={kind:'line',x:ox,y:oy,angle:C.shape.angle,length:step+.01,width:C.shape.width};
      for(const target of this.hostileTargets())if(!C.hit.has(target)&&BossEncounters.contains(C.shape,target.x,target.y)&&BossEncounters.contains(swept,target.x,target.y)&&this.combatLos(target)){
        C.hit.add(target);
        if(!target.tryBlock?.(this))this.dealAttack(target,U.rf(...this.def.dmg)*(this.def.charge.mult||1.6)*(this.def.dmgMult||1)*2.2*this.witherMult(),this.def.charge.elem||this.def.meleeElem);
        Game.fx.shake=Math.max(Game.fx.shake,4);
      }
      if (C.t >= C.dur || dd <= 0.3) {this.charging = null;this.finishWarning();}
      return;
    }
    /* Land on the supported point advertised by the warning. */
    if (this.leaping) {
      const L = this.leaping; L.t += dt;
      const k = Math.min(1, L.t / L.dur);
      this.x = U.lerp(L.fx, L.tx, k); this.y = U.lerp(L.fy, L.ty, k);
      this.jumpZ = Math.sin(k * Math.PI) * 32; this.moving = true;
      if (k >= 1) {
        this.jumpZ = 0; this.leaping = null;this.finishWarning();
        Sfx.play(this.attackSound(this.def.leap.elem||this.def.meleeElem,'slam')); Game.fx.shake = Math.max(Game.fx.shake, 5);
        this.attackNova(this.x, this.y, this.def.leap.radius, this.combatColor(this.def.leap.elem||this.def.meleeElem));
        const dmg = U.rf(...this.def.dmg) * this.def.leap.mult * (this.def.dmgMult || 1) * 2.2 * this.witherMult();
        if(this.supportedPoint(this.x,this.y))this.areaAttack(L.shape,dmg,this.def.leap.elem||this.def.meleeElem);
        else {this.x=L.fx;this.y=L.fy;}
      }
      return;
    }
    /* a whirlwind drives the spinner toward its prey, carving everything it passes */
    if (this.whirling) {
      const W = this.whirling; W.t += dt; W.tick -= dt;
      const tgt = this.eligibleTarget(W.target)?W.target:null;
      if (tgt) {
        const dd = U.dist(this.x, this.y, tgt.x, tgt.y);
        if (dd > 0.4) { const step = this.def.speed * dt; const nx = this.x + (tgt.x - this.x) / dd * step, ny = this.y + (tgt.y - this.y) / dd * step;
          if (TerrainNavigation.segment(map,this.x,this.y,nx,ny,this.radius)){this.x=nx;this.y=ny;} }
      }
      this.visAng += dt * 16; this.angT = this.visAng; this.dir = U.dirFrom(Math.cos(this.visAng), Math.sin(this.visAng)); this.moving = false;
      if(this.attackWarning){this.attackWarning.x=this.attackWarning.shape.x=this.x;this.attackWarning.y=this.attackWarning.shape.y=this.y;}
      if (W.tick <= 0) {
        W.tick = this.def.whirl.tick || 0.3;
        const dmg = U.rf(...this.def.dmg) * this.def.whirl.mult * (this.def.dmgMult || 1) * 2.2 * this.witherMult();
        this.areaAttack({kind:'circle',x:this.x,y:this.y,radius:this.def.whirl.radius},dmg,this.def.whirl.elem||this.def.meleeElem);
        this.attackNova(this.x, this.y, this.def.whirl.radius, this.combatColor(this.def.whirl.elem||this.def.meleeElem)); Sfx.play(this.attackSound(this.def.whirl.elem||this.def.meleeElem,'swing'));
      }
      if (W.t >= W.dur) {this.whirling = null;this.finishWarning();}
      return;
    }
    if (this.frozen && Game.state.time < this.frozen) { this.moving = false; return; }   // hard freeze
    if (this.stunT > 0) { this.moving = false; return; }
    if(this.imperialCombat?.active&&this.imperialCombat.advance(dt))return;
    if (this.action && this.action.state === "attack") { this.moving = false; return; }
    /* Hex of Beckoning: drop everything and stampede to the marked point */
    if (this.beckon && Game.state.time < this.beckon.until) {
      this.aggro = true;
      if (U.dist(this.x, this.y, this.beckon.x, this.beckon.y) > 0.7) { this.path = [{ cx: this.beckon.x, cy: this.beckon.y }]; this.moveAlong(dt, this.def.speed, map, TerrainLayers.targets(Game.state.monsters)); }
      else this.moving = false;
      return;
    }
    /* Terrifying Bellow: routed, flee away from the hero */
    if (this.feared && Game.state.time < this.feared && !this.isBoss) {
      const dd = U.dist(this.x, this.y, player.x, player.y) || 1;
      const tx = this.x + (this.x - player.x) / dd * 2.5, ty = this.y + (this.y - player.y) / dd * 2.5;
      this.path = [{ cx: U.clamp(tx, 1, map.w - 2), cy: U.clamp(ty, 1, map.h - 2) }];
      this.moveAlong(dt, this.def.speed * 1.1, map, TerrainLayers.targets(Game.state.monsters));
      return;
    }
    if (player.dead) { this.aggro = false; }

    const heroDistance=U.dist(this.x,this.y,player.x,player.y);
    const walk = (x, y) => MapGen.walkable(map, x, y);
    // The final shadow cycles actual earlier boss attacks.
    if (this.def.copyBosses && this.aggro) {
      this.copyBossCd-=dt;
      if (this.copyBossCd<=0) {
        const ids=["korvath","mire_mother","azram","malthoron"], id=ids[this.copyBossIndex++%ids.length];
        const past=DATA.ENEMIES[id];
        this.copyBossCd=8;
        for (const ability of ["slam","volley","summons"]) {
          if (past[ability]) this.def[ability]=JSON.parse(JSON.stringify(past[ability]));
          else delete this.def[ability];
        }
        this.def.poison=past.poison||0;
        this.slamCd=this.volleyCd=this.summonCd=.8;
        Game.centerMsg("THE SHADOW REMEMBERS",past.name);
      }
    }

    /* A corpse cannot trigger an alert. Reacquiring it after the death reset
       above would replay the monster's voice on every update. */
    if (!player.dead && !this.aggro && heroDistance < this.def.sight && U.los(walk, this.x, this.y, player.x, player.y)) {
      this.aggro = true;
      Sfx.play("vox_" + (this.def.sounds || "bone"));
      /* a boss with a first-sight cutscene plays it once, ever */
      if (this.def.cutscene) Game.firstSightCutscene(this.defId, this.def.cutscene);
      /* bosses with something to say, say it */
      if (this.def.aggroLines && !this.spoke) {
        this.spoke = true;
        this.def.aggroLines.forEach((line, i) => {
          Game.afterDelay(i * 2.6, () => { if (!this.dead) Game.msg(`${this.name.split(",")[0]}: “${line}”`, "#d8a8d8"); });
        });
        if (this.def.voice) Sfx.voice(this.def.voice, this.def.aggroLines[0]);
      }
      this.wakePack();
    }
    /* treasure-beasts bolt away from the hero — catch them for the hoard;
       the "cause flee" affix sets a temporary fleeUntil timer */
    if ((this.flee || (this.fleeUntil && Game.state.time < this.fleeUntil)) && !player.dead) {
      const ax = this.x + (this.x - player.x), ay = this.y + (this.y - player.y);
      const dd = U.dist(this.x, this.y, player.x, player.y) || 1;
      const tx = this.x + (this.x - player.x) / dd * 2, ty = this.y + (this.y - player.y) / dd * 2;
      this.path = [{ cx: U.clamp(tx, 1, map.w - 2), cy: U.clamp(ty, 1, map.h - 2) }];
      this.moveAlong(dt, this.def.speed, map, TerrainLayers.targets(Game.state.monsters));
      return;
    }
    if (!this.aggro) {
      // Rival Cinderdeep packs can notice each other before the hero arrives.
      if(map.zone.infight&&this.wanderT<=0&&!player.dead){const rival=this.pickTarget(player);if(rival instanceof Monster&&this.combatLos(rival)){this.aggro=true;this.wakePack();return;}}
      if(this.familyIdle(dt,map))return;
      /* idle wander */
      this.wanderT -= dt;
      if (this.wanderT <= 0) {
        this.wanderT = 2 + Math.random() * 4;
        const a = Math.random() * Math.PI * 2, r = 1 + Math.random() * 2;
        const tx = this.x + Math.cos(a) * r, ty = this.y + Math.sin(a) * r;
        if (walk(tx, ty)) this.path = [{ cx: tx, cy: ty, x: tx | 0, y: ty | 0 }];
      }
      this.moveAlong(dt, this.def.speed * 0.4, map, TerrainLayers.targets(Game.state.monsters));
      if (!this.path || !this.path.length) this.moving = false;
      return;
    }

    if(this.imperialCombat?.update(dt))return;

    if(this.enemySkills){this.enemySkills.fight(player,map);return;}
    const selected=this.pickTarget(player);
    if(this.def.breath){
      this.breathCd=Math.max(0,(this.breathCd??3)-dt);
      const b=this.def.breath,dist=selected?U.dist(this.x,this.y,selected.x,selected.y):Infinity;
      if(this.breathCd<=0&&selected&&dist>2&&dist<=b.range&&this.combatLos(selected)){
        this.breathCd=b.cd;this.face(selected.x,selected.y);
        const shape={kind:'cone',x:this.x,y:this.y,radius:b.radius,arc:b.arc,angle:Math.atan2(selected.y-this.y,selected.x-this.x)};
        this.warnAttack('breath',shape,b,()=>{
          this.areaAttack(shape,U.rf(...this.def.dmg)*b.mult*(this.def.dmgMult||1)*2.2*this.witherMult(),b.elem);Sfx.play('frost');
        });return;
      }
    }
    const d=selected?U.dist(this.x,this.y,selected.x,selected.y):Infinity;
    if(this.act2Combat){this.act2Combat.act(dt,player,map);return;}
    /* boss specials */
    if (this.def.enrage && !this.enraged && this.hp < this.maxHp * this.def.enrage) {
      this.enraged = true;
      this.def.speed *= 1.4; this.def.atkRate *= 1.3; this.def.dmgMult = (this.def.dmgMult || 1) * 1.25;
      Sfx.play("vox_boss");
      Game.centerMsg(this.name.split(",")[0] + " RAGES", "");
      this.tint = "#ff5040";
    }
    if (this.def.summons) {
      this.summonCd -= dt;
      if (this.summonCd <= 0 && d < 12 && selected && this.combatLos(selected) && (this.isBoss||this.livingChildren()<6)) {
        this.summonCd = this.def.summons.cd;
        this.startAction("attack", 0.7, {act5Kind:"summon"});
        Sfx.play("vox_" + (this.def.sounds || "human"));
        this.deferAttack(0.5, () => {
          if (this.dead || (this.imperialCombat&&(!this.imperialCombat.valid()||this.imperialCombat.disabled()))) return;
          for (let i = 0; i < this.def.summons.count; i++) {
            if(!this.isBoss&&this.livingChildren()>=6)break;
            const a = Math.random() * Math.PI * 2;
            const sx = this.x + Math.cos(a) * 1.5, sy = this.y + Math.sin(a) * 1.5;
            if (MapGen.walkable(map, sx, sy)) {
              /* a summon pool tears open portals to earlier battlefields */
              const sid = Array.isArray(this.def.summons.id) ? U.pick(this.def.summons.id) : this.def.summons.id;
              const mm = new Monster(sid, sx, sy, { minion: true });
              if(!this.supportedPoint(sx,sy,mm.radius))continue;
              this.ownSummon(mm);
              mm.aggro = true;
              Game.state.monsters.push(mm);
              this.attackNova(sx, sy, 0.8, "#8060c0");
            }
          }
        });
        return;
      }
    }
    /* Detonate Allies: the Choirmaster sacrifices his risen dead, each bursting in fire */
    if (this.def.detonateAllies) {
      const da = this.def.detonateAllies;
      this.detonateCd = (this.detonateCd || 0) - dt;
      if (this.detonateCd <= 0 && d < (da.range || 10)) {
        const allies = TerrainLayers.targets(Game.state.monsters).filter(m => !m.dead && m !== this && !m.isBoss
          && U.dist(this.x, this.y, m.x, m.y) < (da.range || 10)
          && (m.minion || m.fromSummon || /dead|risen|cult|drowned|husk|skeleton|wretch|choir/.test(m.defId || "")));
        if (allies.length) {
          this.detonateCd = da.cd;
          this.face(player.x, player.y); this.startAction("attack", 0.6);
          Sfx.play("vox_" + (this.def.sounds || "human"));
          for (const al of allies) this.attackNova(al.x, al.y, 0.7, "#c89ae0");   // mark the doomed
          this.deferAttack(0.5, () => {
            if (this.dead) return;
            const pl = Game.state.player;
            for (const al of allies) {
              if (al.dead) continue;
              const ex = al.x, ey = al.y;
              al.dead = true; al.hp = 0; al.corpseT = 0;                       // consumed — no loot/xp
              this.attackNova(ex, ey, da.radius, "#ff7a30");
              for (let i = 0; i < 12; i++) Game.addParticle(ex, ey, "#ff9040");
              const dmg = U.rf(...this.def.dmg) * (da.mult || 1.5) * (this.def.dmgMult || 1) * 2.2 * this.witherMult();
              if (!pl.dead && U.dist(ex, ey, pl.x, pl.y) <= da.radius + pl.radius) pl.takeDamage(dmg, this, "fire");
              for (const mi of TerrainLayers.targets(Game.state.minions)) if (!mi.dead && U.dist(ex, ey, mi.x, mi.y) <= da.radius + mi.radius) mi.takeDamage(dmg, this);
            }
            Game.fx.shake = Math.max(Game.fx.shake, 5); Sfx.play("blast");
          });
          return;
        }
      }
    }
    /* Meteor Rain: telegraphed fire from the sky — warning decals fall first, then impact */
    if (this.def.meteorRain) {
      const mr = this.def.meteorRain;
      this.meteorCd = (this.meteorCd || 0) - dt;
      if (this.meteorCd <= 0 && d < (mr.range || 18) && U.los(walk, this.x, this.y, player.x, player.y)) {
        this.meteorCd = mr.cd;
        this.face(player.x, player.y); this.startAction("attack", 0.8);
        Sfx.play("vox_" + (this.def.sounds || "human"));
        Game.centerMsg("THE CHOIR CALLS THE SKY DOWN", "move from the burning marks");
        const warn = mr.warn || 1.3, radius = mr.radius || 2.2, count = mr.count || 5, spread = mr.spread || 5;
        const spots = [{ x: player.x, y: player.y }];                          // first lands on you — so standing still hurts
        for (let i = 1; i < count; i++) {
          const a = Math.random() * Math.PI * 2, rr = Math.random() * spread;
          spots.push({ x: player.x + Math.cos(a) * rr, y: player.y + Math.sin(a) * rr });
        }
        spots.forEach((s, i) => {
          this.deferAttack(i * 0.18, () => { if (!this.dead) Game.state.fx.push({ surfaceId:TerrainLayers.current(Game.state.map), type: "meteorfall", owner: this, x: s.x, y: s.y, radius, col: "#ff7a30", ttl: warn, maxTtl: warn }); });
          this.deferAttack(warn + i * 0.18, () => {
            if (this.dead) return;
            const pl = Game.state.player;
            this.attackNova(s.x, s.y, radius, "#ff7a30"); Game.fx.shake = Math.max(Game.fx.shake, 4);
            for (let k = 0; k < 16; k++) Game.addParticle(s.x + U.rf(-radius, radius) * 0.6, s.y + U.rf(-radius, radius) * 0.6, "#ff9040");
            const dmg = U.rf(...this.def.dmg) * (mr.mult || 1.4) * (this.def.dmgMult || 1) * 2.2 * this.witherMult();
            if (!pl.dead && U.dist(s.x, s.y, pl.x, pl.y) <= radius + pl.radius) pl.takeDamage(dmg, this, "fire");
            for (const mi of TerrainLayers.targets(Game.state.minions)) if (!mi.dead && U.dist(s.x, s.y, mi.x, mi.y) <= radius + mi.radius) mi.takeDamage(dmg, this);
            Sfx.play("blast");
          });
        });
        return;
      }
    }
    /* Flesh Engine: hurls a flailing undead body that crashes down beside the hero,
       dealing impact damage and rising as a fresh monster */
    if (this.def.throwUndead) {
      const tu = this.def.throwUndead;
      this.throwCd = (this.throwCd || 0) - dt;
      if (this.throwCd <= 0 && selected && d < (tu.range || 13) && d > 2.5 && this.combatLos(selected) && (this.isBoss||this.livingChildren()<6)) {
        this.throwCd = tu.cd || 6;
        this.face(player.x, player.y); this.startAction("attack", 0.7, {act5Kind:"throw"});
        Sfx.play("vox_" + (this.def.sounds || "brute"));
        const tx = selected.x, ty = selected.y, self = this;
        this.deferAttack(0.45, () => {
          if (self.dead) return;
          Sfx.play("swing");
          const dist = U.dist(self.x, self.y, tx, ty);
          Game.spawnProjectile({ x: self.x, y: self.y, tx, ty, speed: 9, kind: "undeadbody", fromPlayer: false, mon: self,
            lob: { owner:self, sx: self.x, sy: self.y, tx, ty, dur: U.clamp(dist / 9, 0.6, 1.4), pool: tu.pool || ["risen"], count: tu.count || 1, radius: tu.radius || 1.9, dmg: U.rf(...self.def.dmg) * (tu.mult || 1.3) * (self.def.dmgMult || 1) * 2.2 * self.witherMult() } });
        });
        return;
      }
    }
    /* healers keep their flock standing */
    if (this.def.heals) {
      this.healCd -= dt;
      if (this.healCd <= 0) {
        let patient = null, mostMissing = 8;
        for (const o of TerrainLayers.targets(Game.state.monsters)) {
          if (o.dead || o.noHeal || !this.allied(o) || !this.combatLos(o)) continue;
          if (U.dist(this.x, this.y, o.x, o.y) > this.def.heals.radius) continue;
          const missing = o.maxHp - o.hp;
          if (missing > mostMissing) { mostMissing = missing; patient = o; }
        }
        if (patient) {
          this.healCd = this.def.heals.cd;
          this.startAction("attack", 0.6, {act5Kind:"heal"});
          this.deferAttack(0.4, () => {
            if (this.dead || patient.dead || patient.noHeal || !this.allied(patient) || !TerrainLayers.targets(Game.state.monsters).includes(patient) || U.dist(this.x,this.y,patient.x,patient.y)>this.def.heals.radius || !this.combatLos(patient)) return;
            patient.hp = Math.min(patient.maxHp, patient.hp + this.def.heals.amount);
            this.attackNova(patient.x, patient.y, 0.8, "#90ff90");
            Game.addFloat(patient.x, patient.y, "+" + this.def.heals.amount, "#90ff90");
            Sfx.play("shrine");
          });
          return;
        }
      }
    }
    /* shades step through shadow to reach their prey */
    if (this.def.teleports && !this.movementLocked()) {
      this.teleCd -= dt;
      if (this.teleCd <= 0) {
        const prey = selected;
        if (prey && U.dist(this.x, this.y, prey.x, prey.y) > this.def.teleports.minDist && U.dist(this.x,this.y,prey.x,prey.y)<=(this.def.teleports.range||9) && this.combatLos(prey)) {
          this.teleCd = this.def.teleports.cd;
          const a = Math.random() * Math.PI * 2;
          const nx = prey.x + Math.cos(a) * 1.6, ny = prey.y + Math.sin(a) * 1.6;
          if (this.supportedPoint(nx,ny) && this.combatLos({x:nx,y:ny})) {
            for (let i = 0; i < 6; i++) Game.addParticle(this.x, this.y, "#c080ff");
            const act5Origin={x:this.x,y:this.y};
            this.x = nx; this.y = ny; this.path = null;
            if(typeof Act5EnemyAnimation!=='undefined')Act5EnemyAnimation.blink(this,act5Origin.x,act5Origin.y);
            if(typeof Act1EnemyAnimation!=='undefined')Act1EnemyAnimation.blink(this,act5Origin.x,act5Origin.y);
            for (let i = 0; i < 6; i++) Game.addParticle(this.x, this.y, "#c080ff");
            Sfx.play("portal");
          }
        }
      }
    }
    /* bolt volleys (the Unshepherd's benediction) */
    if (this.def.volley) {
      this.volleyCd -= dt;
      if (this.volleyCd <= 0 && selected && d <= (this.def.range||9) && this.combatLos(selected)) {
        this.volleyCd = this.def.volley.cd;
        const aim = selected;
        if (aim) {
          this.face(aim.x, aim.y);
          this.startAction("attack", 0.7, {act5Kind:"volley"});
          const pk = this.def.projectile || { kind: "soulbolt", speed: 8 };
          this.deferAttack(0.45, () => {
            if (!this.eligibleTarget(aim) || !this.combatLos(aim) || U.dist(this.x,this.y,aim.x,aim.y)>(this.def.range||9)) return;
            Sfx.play(this.combatSound(pk.elem,pk.kind));
            const a0 = Math.atan2(aim.y - this.y, aim.x - this.x);
            const n = this.def.volley.count;
            for (let i = 0; i < n; i++) {
              const a = a0 + (i - (n - 1) / 2) * this.def.volley.spread / Math.max(1, n - 1) * 2;
              Game.spawnProjectile({ x: this.x, y: this.y, tx: this.x + Math.cos(a) * 8, ty: this.y + Math.sin(a) * 8, speed: pk.speed || 8, kind: pk.kind, elem: pk.elem, fromPlayer: false, mon: this });
            }
          });
          return;
        }
      }
    }
    if (this.def.slam && !this.imperialCombat) {
      this.slamCd -= dt;
      if (this.slamCd <= 0 && selected && d < this.def.slam.radius + 0.4 && this.combatLos(selected) && this.supportedPoint(this.x,this.y)) {
        if(this.openingId&&this.def.slam.windup){this.startTelegraphedSlam(player,map);return;}
        this.slamCd = this.def.slam.cd;
        const s=this.def.slam,shape={kind:'circle',x:this.x,y:this.y,radius:s.radius};
        this.warnAttack('slam',shape,s,()=>{
          Game.fx.shake=Math.max(Game.fx.shake,4);Sfx.play(this.attackSound(s.elem||this.def.meleeElem,s.elem==='shadow'?'curse':'slam'));
          this.attackNova(shape.x,shape.y,s.radius,this.combatColor(s.elem||this.def.meleeElem));
          this.areaAttack(shape,U.rf(...this.def.dmg)*s.mult*(this.def.dmgMult||1)*2.2*this.witherMult(),s.elem||this.def.meleeElem);
        });
        return;
      }
    }

    /* a goring charge across open ground */
    if (this.def.charge && !this.movementLocked()) {
      this.chargeCd = (this.chargeCd || 0) - dt;
      const ct = selected;
      if (this.chargeCd <= 0 && ct) {
        const cdd = U.dist(this.x, this.y, ct.x, ct.y);
        if (cdd > 3 && cdd < this.def.charge.range && U.los(walk, this.x, this.y, ct.x, ct.y)) {
          /* aim a bit past the target so it ploughs through */
          const ux = (ct.x - this.x) / cdd, uy = (ct.y - this.y) / cdd;
          let length=0;
          for(let r=.1;r<=Math.min(cdd+2,this.def.charge.range)+.001;r+=.1){
            if(!this.chargePath(map,this.x+ux*length,this.y+uy*length,this.x+ux*r,this.y+uy*r))break;length=r;
          }
          if(length<cdd-this.radius){this.chase(dt,ct,map,walk);return;}
          this.chargeCd = this.def.charge.cd;
          const shape={kind:'line',x:this.x,y:this.y,angle:Math.atan2(uy,ux),length,width:this.radius*2+.6};
          this.warnAttack('charge',shape,this.def.charge,warning=>{
            this.charging={tx:shape.x+ux*length,ty:shape.y+uy*length,t:0,dur:length/(this.def.charge.speed||9),hit:new Set(),shape,target:ct};
            this.sustainWarning(warning,this.charging.dur);
          });
          this.face(ct.x, ct.y); Sfx.play("vox_" + (this.def.sounds || "beast"));
          return;
        }
      }
    }
    /* Vandil drops from the sky with his polearm */
    if (this.def.leap && !this.movementLocked()) {
      this.leapCd -= dt;
      const lt = selected;
      if (this.leapCd <= 0 && lt) {
        const dd = U.dist(this.x, this.y, lt.x, lt.y);
        if (dd > 2.6 && dd < this.def.leap.range && U.los(walk, this.x, this.y, lt.x, lt.y) && this.supportedPoint(lt.x,lt.y)) {
          this.leapCd = this.def.leap.cd;
          const shape={kind:'circle',x:lt.x,y:lt.y,radius:this.def.leap.radius};
          this.warnAttack('leap',shape,this.def.leap,warning=>{
            if(this.supportedPoint(shape.x,shape.y)){this.leaping={fx:this.x,fy:this.y,tx:shape.x,ty:shape.y,t:0,dur:.55,shape,target:lt};this.sustainWarning(warning,.55);}
          });
          this.face(lt.x, lt.y); Sfx.play("swing");
          return;
        }
      }
    }
    /* Sigrun opens into a moving whirlwind */
    if (this.def.whirl && !this.movementLocked()) {
      this.whirlCd -= dt;
      const wt = selected;
      if (this.whirlCd <= 0 && wt && U.dist(this.x, this.y, wt.x, wt.y) < 7 && this.combatLos(wt) && this.supportedPoint(this.x,this.y)) {
        this.whirlCd = this.def.whirl.cd;
        this.warnAttack('whirl',{kind:'circle',x:this.x,y:this.y,radius:this.def.whirl.radius},this.def.whirl,warning=>{
          this.whirling = { t: 0, dur: this.def.whirl.dur, tick: 0,target:wt };
          this.sustainWarning(warning,this.whirling.dur);
        });
        Sfx.play("swing");
        return;
      }
    }

    this.attackCd -= dt;
    /* fight whichever hostile is closest: the player or a raised minion */
    const tgt = selected;
    if (!tgt) { this.moving = false; return; }
    const dT = U.dist(this.x, this.y, tgt.x, tgt.y);
    const inRange = dT <= this.def.range + tgt.radius + this.radius - 0.2;
    const ranged = !!this.def.projectile;

    if (ranged) {
      /* keep distance, shoot when LOS */
      const hasLos = U.los(walk, this.x, this.y, tgt.x, tgt.y);
      if (hasLos && dT < this.def.range && this.attackCd <= 0 && !tgt.dead) {
        this.attackCd = 1 / this.def.atkRate;
        this.face(tgt.x, tgt.y);
        this.startAction("attack", 0.55);
        const px = tgt.x, py = tgt.y;
        this.deferAttack(0.35, () => {
          if (!this.eligibleTarget(tgt) || !this.combatLos({x:px,y:py}) || U.dist(this.x,this.y,px,py)>this.def.range) return;
          if (this.blindUntil && Game.state.time < this.blindUntil && Math.random() < 0.7) { Game.addFloat(this.x, this.y, "blind", "#9aa0a8"); return; }
          Sfx.play(this.combatSound(this.def.projectile.elem,this.def.projectile.kind));
          Game.spawnProjectile({ x: this.x, y: this.y, tx: px, ty: py, speed: this.def.projectile.speed, kind: this.def.projectile.kind, elem: this.def.projectile.elem, fromPlayer: false, mon: this });
        });
        return;
      }
      if (dT > .001 && dT < this.def.keepDist - 1 && hasLos) {
        /* back away */
        const ax = this.x + (this.x - tgt.x) / dT * 1.5, ay = this.y + (this.y - tgt.y) / dT * 1.5;
        if (walk(ax, ay)) { this.path = [{ cx: ax, cy: ay }]; this.moveAlong(dt, this.def.speed, map, TerrainLayers.targets(Game.state.monsters)); return; }
      }
      if (!hasLos || dT > this.def.range - 1) {
        this.chase(dt, tgt, map, walk);
      } else this.moving = false;
      return;
    }

    if (inRange && !tgt.dead && this.combatLos(tgt)) {
      this.path = null; this.moving = false;
      this.face(tgt.x, tgt.y);
      if (this.attackCd <= 0) {
        this.attackCd = 1 / this.def.atkRate;
        const dur = Math.min(0.6, 0.9 / this.def.atkRate);
        this.startAction("attack", dur);
        this.deferAttack(dur * 0.55, () => {
          if (!this.eligibleTarget(tgt) || !this.combatLos(tgt)) return;
          if (this.blindUntil && Game.state.time < this.blindUntil && Math.random() < 0.7) { Game.addFloat(this.x, this.y, "blind", "#9aa0a8"); return; }
          if (U.dist(this.x, this.y, tgt.x, tgt.y) > this.def.range + tgt.radius + this.radius + 0.4) return;
          /* monster hit roll */
          const tlvl = tgt.lvl || player.lvl;
          const ch = U.clamp(0.62 + (this.lvl - tlvl) * 0.03, 0.35, 0.92);
          if (Math.random() > ch) { Game.addFloat(tgt.x, tgt.y, "miss", "#9a9a9a"); return; }
          if (tgt.stats && tgt.stats.dodge > 0 && Math.random() * 100 < tgt.stats.dodge) { Game.addFloat(tgt.x, tgt.y, "evade", "#b0a0d0"); Game.dustPuff(tgt.x, tgt.y); return; }
          if (tgt.tryBlock && tgt.tryBlock(this)) { Sfx.play("block"); Game.addFloat(tgt.x, tgt.y, "block", "#80a0ff"); return; }
          let dmg = U.rf(...this.def.dmg) * (this.def.dmgMult || 1) * 2.2 * this.witherMult();
          this.dealAttack(tgt,dmg,this.def.meleeElem||'phys',true);
          Sfx.play(this.combatSound(this.def.meleeElem,this.spriteOpts.weapon,true));
          if(this.def.meleeElem&&(typeof Act1EnemyAnimation==='undefined'||!Act1EnemyAnimation.eligible(this)||DATA.ENEMIES[this.defId].meleeElem))Game.addParticle(tgt.x,tgt.y,this.combatColor(this.def.meleeElem));
          if (tgt.stats && tgt.stats.thorns > 0 && !this.dead) this.takeDamage(tgt.stats.thorns, tgt);
        });
      }
    } else {
      this.chase(dt, tgt, map, walk);
    }
  }
  chase(dt, player, map, walk) {
    this.repathT -= dt;
    if (this.repathT <= 0) {
      this.repathT = 0.4 + Math.random() * 0.3;
      Game.repath(this, player.x, player.y);
    }
    this.moveAlong(dt, this.def.speed, map, TerrainLayers.targets(Game.state.monsters));
    if (!this.path || !this.path.length) this.moving = false;
  }
}

/* ------------------------------------------------------------------ */
class Npc extends Entity {
  constructor(id, x, y, opts) {
    super(x, y);
    opts = opts || {};
    const topics=DATA.STORY_TOPICS[opts.npcArt];
    this.def = opts.displayName || topics ? { ...DATA.NPCS[id], ...(opts.displayName?{name:opts.displayName}:{}), ...(topics?{talk:[...topics,...(DATA.NPCS[id].talk||[])]}:{}) } : DATA.NPCS[id];
    if (topics?.some(t=>t.silent)) this.def={...this.def,voice:null,greet:["Sella opens her mouth without a sound, then offers you a scrap of sail and a piece of charcoal."],talk:topics};
    this.id = id; this.name = this.def.name;
    this.survivor = !!opts.survivor; this.sid = opts.sid || null;
    this.storyId=opts.storyId||null;
    this.spriteKey = "npc|" + (opts.npcArt || id);
    this.spriteOpts = { kind: "human", npcArt: opts.npcArt || id, pal: this.def.pal, weapon: id === "korrin" ? "mace" : "none" };
    this.dir = 5;
    this.turnT = 2 + Math.random() * 4;
  }
  update(dt) {
    this.updateAnim(dt);
    if(this.scriptedMovement)return;
    /* some townsfolk drift about their day */
    if (this.def.wander) {
      if (this.homeX === undefined) { this.homeX = this.x; this.homeY = this.y; this.wanderT = U.rf(1, 4); }
      this.wanderT -= dt;
      if (this.path && this.path.length) {
        this.moveAlong(dt, 1.4, Game.state.map, null);
      } else {
        this.moving = false;
        if (this.wanderT <= 0) {
          this.wanderT = 4 + Math.random() * 7;
          const a = Math.random() * Math.PI * 2, rr = 1.5 + Math.random() * 4.5;
          const tx = this.homeX + Math.cos(a) * rr, ty = this.homeY + Math.sin(a) * rr;
          if (MapGen.walkable(Game.state.map, tx, ty)) Game.repath(this, tx, ty);
        }
      }
      return;
    }
    this.turnT -= dt;
    if (this.turnT <= 0) { this.turnT = 3 + Math.random() * 5; this.dir = U.ri(3, 6); this.angT = this.dir * Math.PI / 4; }
  }
}

/* ------------------------------------------------------------------ */
class Projectile {
  constructor(o) {
    this.veilCast=o.veilCast||null;this.maxRange=o.maxRange;this.skillEpoch=o.skillEpoch;
    this.enemySlow=o.enemySlow||null;
    this.sourceSkill=o.sourceSkill||null;this.visualOwner=o.visualOwner||null;
    this.x = o.x; this.y = o.y; this.surfaceId=o.surfaceId??TerrainLayers.current(Game.state.map);
    this.lift = o.lift ?? 14;       // fixed world height captured at weapon release
    const d = Math.max(0.001, U.dist(o.x, o.y, o.tx, o.ty));
    this.vx = (o.tx - o.x) / d * o.speed;
    this.vy = (o.ty - o.y) / d * o.speed;
    this.speed = o.speed;
    this.kind = o.kind; this.elem = o.elem || null; this.fromPlayer = o.fromPlayer;
    this.arrowWeapon=!!o.fromPlayer && o.kind==="arrow" && ["bow","crossbow"].includes((o.visualOwner || Game.state.player)?.equip.main?.cat);
    this.mon = o.mon; this.mult = o.mult || 1;
    this.originWorld=Game.state;this.originMap=Game.state.map;
    this.bossOwner=o.bossOwner||null;this.bossMult=o.bossMult??1;
    this.bossLane=o.bossLane||null;
    this.bossVisual=o.bossVisual||null;
    this.imperialOwner=o.imperialOwner||null;this.imperialVisual=o.imperialVisual||null;
    this.spell = o.spell || null;       // {dmg, crit, elem, burn, chill, pdot, drain, pierce, chains, scorch, knockback, sprayRadius}
    this.minionDmg = o.minionDmg;       // bolts fired by raised skeletons
    this.minionPdot = o.minionPdot || 0;
    this.minionSource = o.minionSource || (o.visualOwner ? { owner:o.visualOwner } : null);
    this.pierce = !!o.pierce;           // weapon-based piercing arrows
    this.lob = o.lob || null;               // {sx,sy,tx,ty,dur,pool,count,radius,dmg}  (thrown undead body)
    if(this.lob?.owner){const l=this.lob;Game.state.fx.push({ surfaceId:TerrainLayers.current(Game.state.map),type:'enemywarning',projectile:this,shape:{kind:'circle',x:l.tx,y:l.ty,radius:l.radius},kind:'throw',col:'#e4d1b0',x:l.tx,y:l.ty,ttl:l.dur,maxTtl:l.dur});}
    this.boomerang = o.boomerang || null;   // {maxRange, returning}  (Returning Axe)
    this.ricochet = o.ricochet || null;     // {bounces}              (Ricochet Shard)
    this.maxPierce = o.maxPierce || 0;      // charge_shot pierce cap
    this.pierceCount = 0;
    this.knockFirst = !!o.knockFirst;
    this.quarryBonus = o.quarryBonus || 0;
    this.quarryOnHit = !!o.quarryOnHit;
    this.quarryStacks = o.quarryStacks??1;
    this.travelled = 0;
    this.hitSet = (this.spell || this.pierce || this.boomerang || this.ricochet || this.maxPierce) ? new Set() : null;
    this.ttl = o.ttl || (this.boomerang ? 4 : this.ricochet ? 1.2 : 2.2);
    this.dead = false;
  }
  update(dt, map, player, monsters) {
    if(this.veilCast){
      const owner=this.visualOwner||player;
      if(owner.dead||Game.state!==this.originWorld||map!==this.originMap||owner._skillEpoch!==this.skillEpoch||(owner._veilEpoch||0)!==this.veilCast.epoch||!TerrainLayers.same(this,owner)){this.dead=true;return;}
      return owner.withSkillSource(this.sourceSkill,()=>this.updateVeil(dt,map,owner,monsters));
    }
    if(!this.fromPlayer&&this.mon&&(Game.state!==this.originWorld||map!==this.originMap)){this.dead=true;return;}
    if(this.imperialOwner&&!this.imperialOwner.valid()){this.dead=true;return;}
    if(this.bossOwner&&(!this.bossOwner.encounter?.active||this.bossOwner.dead||this.bossOwner.encounter.map!==map)){this.dead=true;return;}
    const run=()=>typeof SkillVFX!=='undefined'&&this.sourceSkill?SkillVFX.scope(this.visualOwner||player,this.sourceSkill,()=>this.updateMotion(dt,map,player,monsters)):this.updateMotion(dt,map,player,monsters);
    if (this.fromPlayer) return (this.visualOwner || player).withSkillSource(this.sourceSkill || "basic", () => this.updateMotion(dt,map,player,monsters), this);
    return typeof SkillAudio!=='undefined'?SkillAudio.scope(this.sourceSkill,{owner:this.visualOwner||player,emitter:this},run):run();
  }
  updateVeil(dt,map,owner,monsters) {
    if(this.dead)return;
    const distance=Math.min(this.speed*dt,Math.max(0,this.maxRange-this.travelled)),steps=Math.max(1,Math.ceil(distance/.08)),step=distance/steps;
    for(let i=0;i<steps;i++){
      this.x+=this.vx/this.speed*step;this.y+=this.vy/this.speed*step;this.travelled+=step;
      if(!MapGen.walkable(map,this.x,this.y,this.surfaceId)){
        if(typeof SkillVFX!=="undefined")SkillVFX.projectileContact(this,"wall");
        this.dead=true;return;
      }
      const victim=monsters.filter(m=>!m.dead&&TerrainLayers.same(this,m)&&U.dist(this.x,this.y,m.x,m.y)<m.radius+.25).sort((a,b)=>U.dist2(this.x,this.y,a.x,a.y)-U.dist2(this.x,this.y,b.x,b.y))[0];
      if(victim){owner.veilHit(victim,this.veilCast);this.dead=true;return;}
    }
    if(this.travelled>=this.maxRange-1e-8)this.dead=true;
  }
  updateMotion(dt, map, player, monsters) {
    if(this.fromPlayer)player=this.visualOwner||player;
    if (this.dead) return;
    /* a lobbed undead body arcs to its landing point, then crashes + rises (no mid-air collision) */
    if (this.lob) {
      const L = this.lob; this.lobT = (this.lobT || 0) + dt;
      const k = Math.min(1, this.lobT / L.dur);
      this.x = U.lerp(L.sx, L.tx, k); this.y = U.lerp(L.sy, L.ty, k);
      this.jumpZ = Math.sin(k * Math.PI) * 44;
      if (k >= 1) { this.dead = true; Game.throwUndeadLand(L.tx, L.ty, L); }
      return;
    }
    this.ttl -= dt;
    if (this.ttl <= 0) { this.dead = true; return; }
    /* wandering bolts (Spark) jitter their heading so they don't fly straight */
    if (this.spell && this.spell.wander) {
      /* serpentine weave: the heading sways sinusoidally around the bolt's flight line
         (a real S-curve snake, not a jittery random walk). Each bolt has its own phase
         so a volley looks like a tangle of snakes. */
      if (this.baseAng === undefined) { this.baseAng = Math.atan2(this.vy, this.vx); this.snakePhase = Math.random() * Math.PI * 2; this.snakeT = 0; }
      this.snakeT += dt;
      const amp = this.spell.wander * 0.1;        // wander 10 -> ±1.0 rad sway = a hard snake
      const ang = this.baseAng + Math.sin(this.snakeT * 13 + this.snakePhase) * amp;
      const sp = Math.hypot(this.vx, this.vy);
      this.vx = Math.cos(ang) * sp; this.vy = Math.sin(ang) * sp;
    }
    /* a returning axe steers back toward the hero on its homeward leg */
    if (this.boomerang && this.boomerang.returning) {
      const dp = U.dist(this.x, this.y, player.x, player.y);
      if (dp < 0.6) { this.dead = true; return; }
      this.vx = (player.x - this.x) / (dp || 1) * this.speed; this.vy = (player.y - this.y) / (dp || 1) * this.speed;
    }
    const steps = 2;
    for (let s = 0; s < steps; s++) {
      this.x += this.vx * dt / steps; this.y += this.vy * dt / steps;
      this.travelled += this.speed * dt / steps;
      if (!MapGen.walkable(map, this.x, this.y)) {
        if(typeof SkillVFX!=='undefined')SkillVFX.projectileContact(this,this.ricochet||this.boomerang?'bounce':'wall');
        if (this.ricochet && this.ricochet.bounces > 0) { this.x -= this.vx * dt / steps; this.y -= this.vy * dt / steps; if (!MapGen.walkable(map, this.x + Math.sign(this.vx) * 0.1, this.y)) this.vx = -this.vx; else this.vy = -this.vy; this.ricochet.bounces--; Game.addNova(this.x, this.y, 0.4, "#e0e0e0"); continue; }
        if (this.boomerang && !this.boomerang.returning) { this.boomerang.returning = true; if (this.hitSet) this.hitSet.clear(); continue; }
        if (this.fromPlayer) Game.breakPropsNear(this.x, this.y, 0.9);   // a player shot smashes the breakable it strikes
        this.dead = true; return;
      }
      if (this.boomerang && !this.boomerang.returning && this.travelled >= this.boomerang.maxRange) { this.boomerang.returning = true; if (this.hitSet) this.hitSet.clear(); }
      if (this.fromPlayer) {
        for (const m of monsters) {
          if (m.dead) continue;
          if (this.hitSet && this.hitSet.has(m)) continue;
          if (U.dist(this.x, this.y, m.x, m.y) < m.radius + 0.25) {
            /* Corpse Spear: poison spray + knockback, then relocate the body downrange */
            if (this.kind === "cadaver" && this.spell) {
              const sp = this.spell;
              player.spellHit(m, sp.dmg, "poison", {}); Game.knockMonster(m, this.x, this.y, sp.knockback || 2);
              Game.addNova(this.x, this.y, sp.sprayRadius || 1.6, "#90ff70");
              for (const o2 of monsters) { if (o2.dead || o2 === m) continue; if (U.dist(this.x, this.y, o2.x, o2.y) < (sp.sprayRadius || 1.6) + o2.radius) player.spellHit(o2, sp.dmg * 0.6, "poison", {}); }
              Game.spawnCorpse(this.x, this.y, 12); this.dead = true; return;
            }
            if (this.spell) {
              const sp = this.spell;
              player.spellHit(m, sp.dmg, sp.elem, { crit: sp.crit, burn: sp.burn, chill: sp.chill, pdot: sp.pdot, drain: sp.drain, scorch: sp.scorch });
              if (sp.static) player.staticChg = Math.min(20, (player.staticChg || 0) + sp.static);
              this.hitSet.add(m);
              if (sp.pierce) { continue; }                       // lance keeps flying
              if (sp.chains > 0) {                               // arc to the next victim
                let next = null, bd = 5.5 * 5.5;
                for (const o2 of monsters) {
                  if (o2.dead || this.hitSet.has(o2)) continue;
                  const dd = U.dist2(this.x, this.y, o2.x, o2.y);
                  if (dd < bd) { bd = dd; next = o2; }
                }
                if (next) {
                  sp.chains--; sp.dmg *= 0.85;
                  const dn = Math.max(0.001, U.dist(this.x, this.y, next.x, next.y));
                  this.vx = (next.x - this.x) / dn * this.speed;
                  this.vy = (next.y - this.y) / dn * this.speed;
                  this.ttl = 1.2;
                  Game.addNova(this.x, this.y, 0.4, "#fff080");
                  continue;
                }
              }
              this.dead = true; return;
            }
            /* weapon-damage arrows: Quarry payoff, Serrated coat, ricochet/boomerang/charge-pierce */
            if(m.imperialCombat?.block(player)){this.dead=true;return;}
            let mult = this.mult;
            if (this.quarryBonus && m.quarry && Game.state.time < m.quarry.until) { mult *= 1 + this.quarryBonus / 100 * m.quarry.stacks; m.quarry = null; }
            player.strike(m, mult, { auto: !!this.boomerang, guardChecked:!!m.imperialCombat });
            if (this.quarryOnHit) m.quarry = { until: Game.state.time + 6, stacks: Math.min(5, ((m.quarry && m.quarry.stacks) || 0) + this.quarryStacks) };
            if (this.arrowWeapon && player.coat && player.buffs.some(b => b.id === "serrated")) player.applyPoison(m, player.coat.pdot / 3, player.coat.woundDuration??4, { strongest: true });
            if (this.hitSet) this.hitSet.add(m);
            if (this.knockFirst) { Game.knockMonster(m, this.x, this.y, 1.5); this.knockFirst = false; }
            if (this.boomerang) continue;                        // pierces all on both legs
            if (this.ricochet) {
              if (this.ricochet.bounces > 0) {
                let nx = null, bd = 36;
                for (const o2 of monsters) { if (o2.dead || this.hitSet.has(o2)) continue; const dd = U.dist2(this.x, this.y, o2.x, o2.y); if (dd < bd) { bd = dd; nx = o2; } }
                if (nx) { this.ricochet.bounces--; this.mult *= 0.88; const dn = U.dist(this.x, this.y, nx.x, nx.y) || 1; this.vx = (nx.x - this.x) / dn * this.speed; this.vy = (nx.y - this.y) / dn * this.speed; this.ttl = 1.0; Game.addNova(this.x, this.y, 0.4, "#e0e0e0"); }
                continue;
              }
              this.dead = true; return;
            }
            if (this.maxPierce) { this.pierceCount++; if (this.pierceCount < this.maxPierce) continue; this.dead = true; return; }
            if (this.pierce) { continue; }                       // skewering bolt flies on
            this.dead = true; return;
          }
        }
      } else if (this.minionDmg !== undefined) {
        /* raised-skeleton bolts strike monsters */
        for (const m of monsters) {
          if (m.dead) continue;
          if (U.dist(this.x, this.y, m.x, m.y) < m.radius + 0.25) {
            if(this.kind==='arrow'&&m.imperialCombat?.block(this.minionSource)){this.dead=true;return;}
            Sfx.playSkill?.(this.sourceSkill,'impact',{owner:this.visualOwner||player,emitter:this,target:m,elem:this.minionPdot?'poison':'phys'});
            m.takeDamage(this.minionDmg, this.minionSource); Game.minionFloat(m.x, m.y, this.minionDmg);
            if(typeof SkillVFX!=='undefined')SkillVFX.hit(this.visualOwner||player,m,this.minionPdot?'poison':'phys');
            if (this.minionPdot > 0) { m.poisonDot = { dps: this.minionPdot / 3, t: 3, owner:this.minionSource }; Game.addParticle(m.x, m.y, "#90ff70"); }
            Game.bloodBurst(m.x, m.y, 3);
            this.dead = true; return;
          }
        }
      } else {
        player=(Game.state.players||[player]).find(p=>!p.dead&&TerrainLayers.same(this,p)&&U.dist(this.x,this.y,p.x,p.y)<p.radius+.25)||player;
        const mon = this.mon;
        const hitDmg = mon ? U.rf(...mon.def.dmg) * (mon.def.dmgMult || 1) * 2.2 * mon.witherMult() * this.bossMult : 0;
        const elem = this.elem || (mon && mon.def.projectile && mon.def.projectile.elem);
        if (TerrainLayers.same(this,player) && !player.dead && U.dist(this.x, this.y, player.x, player.y) < player.radius + 0.25 &&
            (!this.bossLane||BossEncounters.contains(this.bossLane,player.x,player.y))) {
          if (player.stats.dodge > 0 && Math.random() * 100 < player.stats.dodge) { Game.addFloat(player.x, player.y, "evade", "#b0a0d0"); }
          else if (player.tryBlock(this)) { Sfx.play("block"); Game.addFloat(player.x, player.y, "block", "#80a0ff"); }
          else if (mon) {
            mon.dealAttack(player,hitDmg,elem||'phys','projectile');
            if(this.enemySlow)Act2EnemyCombat.slow(player,this.enemySlow);
            if (elem === "fire") Sfx.play("fireHit");
          }
          this.dead = true; return;
        }
        for (const mi of TerrainLayers.targets(Game.state.minions)) {
          if (mi.dead || mi.untargetable) continue;
          if (U.dist(this.x, this.y, mi.x, mi.y) < mi.radius + 0.25 &&
              (!this.bossLane||BossEncounters.contains(this.bossLane,mi.x,mi.y))) {
            if (mon) mon.dealAttack(mi,hitDmg*(this.bossOwner?.45:1),elem||'phys','projectile');
            if(this.enemySlow)Act2EnemyCombat.slow(mi,this.enemySlow);
            this.dead = true; return;
          }
        }
      }
    }
    if (this.kind === "firebolt" && Math.random() < dt * 30) Game.addParticle(this.x, this.y, "#ff9040");
    else if (this.kind === "frostshard" && Math.random() < dt * 22) Game.addParticle(this.x, this.y, "#9fd8ff");
    else if (this.kind === "lance" && Math.random() < dt * 34) Game.addParticle(this.x, this.y, "#cfeaff");
    else if (this.kind === "spark" && Math.random() < dt * 26) Game.addParticle(this.x, this.y, "#fff080");
  }
}


/* Scope legacy skill implementations to their actor's surface. All collection
   reads and terrain queries inside a release share the same floor identity. */
for(const Type of [Player,Monster,Minion,Projectile]){
  for(const name of ['update','performSkill','releaseDraw']){
    const original=Type.prototype[name];if(!original)continue;
    Type.prototype[name]=function(...args){
      const map=Game.state.map;
      if(name==='performSkill'&&((args[1]&&!TerrainLayers.same(this,args[1]))||(args[2]&&args[2].surfaceId!==undefined&&!TerrainLayers.same(this,args[2]))))return false;
      if(Type===Projectile&&name==='update')args[3]=TerrainLayers.targets(args[3],this);
      return TerrainLayers.scope(map,this,()=>original.apply(this,args));
    };
  }
  const damage=Type.prototype.takeDamage;
  if(damage)Type.prototype.takeDamage=function(amount,source,...rest){
    if(!TerrainLayers.affects(Game.state.map,this,source))return 0;
    return damage.call(this,amount,source,...rest);
  };
}
for(const name of ['strike','spellHit']){
  const original=Player.prototype[name];
  Player.prototype[name]=function(target,...args){if(!TerrainLayers.affects(Game.state.map,target,this))return 0;return original.call(this,target,...args);};
}
