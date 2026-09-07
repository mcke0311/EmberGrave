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
    this.action = Object.assign({ state, t: 0, dur }, data || {});
  }
  /* generic walk along this.path with collision against walls & entities */
  moveAlong(dt, speed, map, others) {
    if (!this.path || !this.path.length) { this.moving = false; this.curSpeed = 0; return; }
    if (this.slowT > 0) speed *= (1 - this.slowPct / 100);
    const wp = this.path[0];
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
    const step = Math.min(speed * dt, d);
    const ox = this.x, oy = this.y;
    let nx = this.x + (tx - this.x) / d * step;
    let ny = this.y + (ty - this.y) / d * step;
    /* entity separation (soft) */
    if (others) for (const o of others) {
      if (o === this || o.dead) continue;
      const od = U.dist(nx, ny, o.x, o.y), min = this.radius + o.radius;
      if (od < min && od > 0.001) {
        const push = (min - od) * 0.5;
        nx += (nx - o.x) / od * push; ny += (ny - o.y) / od * push;
      }
    }
    /* wall + cliff collision: test axis separately for sliding (canStep forbids climbing >1 height) */
    if (typeof TerrainNavigation !== "undefined") {
      const legal = (x, y) => TerrainNavigation.segment(map, this.x, this.y, x, y, this.radius);
      if (legal(nx, ny)) { this.x = nx; this.y = ny; }
      else { if (legal(nx, this.y)) this.x = nx; if (legal(this.x, ny)) this.y = ny; }
    } else {
      if (MapGen.canStep(map, this.x, this.y, nx, this.y)) this.x = nx;
      if (MapGen.canStep(map, this.x, this.y, this.x, ny)) this.y = ny;
    }
    /* drive walk-cycle phase from real ground distance covered */
    this.recordMovement(ox, oy, dt);
    this.face(tx, ty);
    if (typeof TerrainNavigation !== "undefined") {
      this._navStall = this.curSpeed < .05 ? (this._navStall || 0) + dt : 0;
      if (this._navStall > .35 && this._navGoal) { this._navCache = null; this._navStall = 0; Game.repath(this, this._navGoal.x, this._navGoal.y); }
    }
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
  /* terrain hazard under this entity: slow always; DoT throttled; bosses ignore damage.
     Shared by player/monster/minion (slowT/slowPct live on Entity; takeDamage signature differs). */
  tileHazardTick(dt, map, isPlayer) {
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
        else this.takeDamage(chunk, Game.state.player, null, h.elem || "phys");   // credit kills to the player
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
    o.ang = this.visAng;
    ex.airborne = !!(this.jumping || this.leaping || this.jumpZ > 0);
    const a = this.action;
    if (a && (a.state === "death" || a.state === "attack" || a.state === "cast" || a.state === "kick" || a.state === "hit")) {
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
    this.action.visual={id:++this._visualActionSequence,style:this._visualSkill||null,startedAt:typeof Game!=='undefined'?Game.state?.time:undefined,releases:[]};
    if(state==='kick')this.action.visual.releases=[.5];
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
    this.afterSkillDelay(seconds,callback);
  }
  afterSkillDelay(seconds,callback) {
    const epoch=this._skillEpoch, source=this._castingSkillId;
    Game.afterDelay(seconds,()=>{if(epoch===this._skillEpoch)this.withSkillSource(source,callback);});
  }
  withSkillSource(source,callback) {
    const previous=this._castingSkillId, before=new Set(this.buffs);
    const world=typeof Game!=="undefined"?Game.state:null, effectsBefore=new Set(world?.fx||[]);
    this._castingSkillId=source;
    try{return callback();}finally{
      if(source)for(const b of this.buffs)if(!before.has(b)&&!b.sourceSkill)b.sourceSkill=source;
      if(source&&world)for(const f of world.fx||[])if(!effectsBefore.has(f)){f.sourceSkill ||= source;f.owner ||= this;}
      this._castingSkillId=previous;
    }
  }
  resolveSkill(id) {
    return typeof SkillPerks!=="undefined" ? SkillPerks.resolve(this,id) : id==="basic" ? DATA.BASIC_ATTACK : DATA.SKILLS[id];
  }
  skillTargetRange(id,target) {
    const sk=this.resolveSkill(id),rk=id==="basic"?1:Math.max(1,this.effRank(id));
    for(const field of ["castRange","grappleRange","blinkRange","leapRange","chargeRange","throwRange"])if(sk?.[field])return sk[field](rk);
    if(["combo_finish","bash","shockwave","afterimage"].includes(sk?.type)&&sk.range)return sk.range(rk);
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
  clearSkillState() {
    this._skillEpoch++; this._perkCache=null; this.skillPerks={};
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
    const g = this.gearStats();
    // Passive effective ranks must see the current loadout on the first recompute.
    this._computingGear=g;
    const p = this.passiveStats();
    this._computingGear=null;
    const b = {};
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
    st.armor = Math.floor(S("armor") + attr.dex * 0.25);
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
    /* bespoke per-class stat hooks, summed from passives / buffs / stances */
    for (const k of ["tempoCapBonus", "tempoWindowBonus", "dmgPerTempo", "shoutDurPct", "uninterruptible",
      "momentumDmgPct", "mobilityCdr", "scorchPct", "scorchSpread", "shatterRank", "coldVsFrozenPct",
      "minionThorns", "curseDurPct", "curseRadiusPct", "curseSpread", "poisonDotPct", "plagueSpreadPct",
      "corpseChance", "overhealCap", "soulCharge", "projRange", "trapCap", "armSpeed", "pShare",
      "pManaPerBeast", "totemRate", "totemTtl", "earthRadius", "shiftStun", "shiftRadius", "extendPerEnemy",
      "primalProc", "dmgToFire", "totemPower", "totemCapacity",
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
    mon.takeDamage(dmg, this, null, elem);
    if (opts.crit) Game.fx.hitPause = Math.max(Game.fx.hitPause, 0.05);
    if (elem === "fire") {
      Sfx.play("fireHit");
      if (opts.burn) mon.poisonDot = { dps: opts.burn, t: 2, fire: true };
      if (opts.scorch) { const sc = mon.scorch || { stacks: 0 }; sc.stacks = Math.min(5, sc.stacks + 1); sc.dps = opts.scorch * sc.stacks * (1 + (this.stats.scorchPct || 0) / 100); sc.until = Game.state.time + 3; mon.scorch = sc; }
      for (let i = 0; i < 5; i++) Game.addParticle(mon.x, mon.y, "#ff9040");
    } else if (elem === "cold") {
      Sfx.play("hit");
      mon.applySlow(opts.chill || 2, 40);
      for (let i = 0; i < 4; i++) Game.addParticle(mon.x, mon.y, "#9fd8ff");
    } else if (elem === "light") {
      Sfx.play("hit");
      for (let i = 0; i < 4; i++) Game.addParticle(mon.x, mon.y, "#fff080");
    } else if (elem === "poison") {
      Sfx.play("hit");
      if (opts.pdot) mon.poisonDot = { dps: opts.pdot / 3, t: 3 };
      for (let i = 0; i < 4; i++) Game.addParticle(mon.x, mon.y, "#90ff70");
    } else if (elem === "shadow") {
      Sfx.play("hit");
      for (let i = 0; i < 4; i++) Game.addParticle(mon.x, mon.y, "#c080e0");
    }
    if (opts.drain) this.hp = Math.min(this.stats.maxHp, this.hp + dmg * opts.drain);
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
    const d = this.rollDamage(mult, mon);
    let total = d.phys + d.fire + d.cold + d.light + (this.tempo || 0) * (this.stats.dmgPerTempo || 0);
    const fireMode = this.stats.dmgToFire > 0;                       // Fire Claw: all damage becomes fire
    let primal = false;                                              // Primal Surge: double phys + fire eruption
    if (this.stats.primalProc > 0 && Math.random() * 100 < this.stats.primalProc) { primal = true; total *= 2; }
    if (d.crit) { Game.fx.hitPause = Math.max(Game.fx.hitPause, 0.055); Sfx.play("crit"); }
    else Sfx.play(fireMode || primal ? "fireHit" : "hit");
    mon.takeDamage(total, this, d, fireMode ? "fire" : undefined);
    if (!fireMode && d.cold > 0) mon.applySlow(2, 30);
    if (!fireMode && d.poison > 0) mon.poisonDot = { dps: d.poison / 3, t: 3 };
    /* life/mana steal are strike-only (weapon/melee/ranged), not applied to spell damage */
    if (this.stats.lifeSteal > 0) {
      this.hp = Math.min(this.stats.maxHp, this.hp + total * this.stats.lifeSteal / 100);
    }
    if (this.stats.manaSteal > 0) {
      this.mana = Math.min(this.stats.maxMana, this.mana + total * this.stats.manaSteal / 100);
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
      Sfx.play("fireHit"); Game.addNova(mon.x, mon.y, 2.2, "#ff7a30");
      for (let i = 0; i < 9; i++) Game.addParticle(mon.x, mon.y, "#ff9040");
      for (const m2 of Game.state.monsters) { if (m2 === mon || m2.dead) continue; if (U.dist(mon.x, mon.y, m2.x, m2.y) < 2.2 + m2.radius) m2.takeDamage(total * 0.5, this, null, "fire"); }
    }
    Game.addFloat(mon.x, mon.y, Math.floor(total), d.crit ? "#ffb030" : primal ? "#ff7a30" : fireMode ? "#ff9040" : "#ffffff", d.crit || primal);
    Game.bloodBurst(mon.x, mon.y, d.crit ? 14 : 7);
    return total;   // the direct damage dealt (callers like Rabies derive effects from it)
  }
  takeDamage(raw, source, elemKind) {
    if (this.dead || Game.debugFlags.god) return;
    /* Riposte stance: parry the next melee blow, negate it, and counter */
    if (this.stance === "riposte" && this.riposteData && (source instanceof Monster) && (!elemKind || elemKind === "phys") && Game.state.time >= (this.parryCdUntil || 0)) {
      this.parryCdUntil = Game.state.time + (this.riposteData.window || 0.6);
      this.visualReaction("block",source);
      Game.addNova(this.x, this.y, 1.0, "#cfe0ff"); Sfx.play("crit");
      this.strike(source, this.riposteData.mult, { auto: true });
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
      this.mana -= toMana; dmg -= toMana;
    }
    /* Bone Armor absorb pool soaks before real HP, and gores melee attackers */
    if (this.boneWard && this.boneWard.hp > 0 && Game.state.time < this.boneWard.until) {
      const ab = Math.min(dmg, this.boneWard.hp); this.boneWard.hp -= ab; dmg -= ab;
      if ((source instanceof Monster) && U.dist(this.x, this.y, source.x, source.y) < 1.9) { source.takeDamage(this.boneWard.retal, this); source.applySlow(1.2, 30); }
      if (this.boneWard.hp <= 0) { this.boneWard = null; Game.addNova(this.x, this.y, 1.2, "#cfd8c0"); Sfx.play("die_bone"); }
      if (dmg <= 0) { this.flashT = 0.12; return; }
    }
    /* Rimeguard: melee attackers are chilled and bitten by frost */
    if (this.retalCold && Game.state.time < this.retalCold.until && (source instanceof Monster) && U.dist(this.x, this.y, source.x, source.y) < 1.9) { source.takeDamage(this.retalCold.dmg, this); source.applySlow(2, 40); }
    /* Kindred Bond: the pack shares the hero's wounds */
    if (this.stats.pShare > 0) { const beasts = Game.state.minions.filter(m => !m.dead); if (beasts.length) { const share = dmg * Math.min(0.5, this.stats.pShare / 100); dmg -= share; const each = share / beasts.length; for (const mi of beasts) mi.takeDamage(each, source); } }
    dmg = Math.max(1, dmg);
    this.hp -= dmg;
    this.visualReaction('hurt',source);
    Game.playerHurtFloat(this.x, this.y, dmg, elemKind);   // colored number above the player, by element
    this.flashT = 0.12;
    // The fatal hit has its own recorded voice; do not layer the hurt buzz on it.
    if (this.hp > 0) Sfx.play("playerHurt");
    Game.bloodBurst(this.x, this.y, 5);
    /* chance-to-cast when struck */
    if (this.stats.procs) for (const p of this.stats.procs) if (p.trigger === "struck" && Math.random() * 100 < p.chance) Game.fireProc(p, this.x, this.y, this);
    if (this.hp <= 0) { this.hp = 0; Game.onPlayerDeath(source); }
  }
  tryBlock(source) {
    const blocked=this.stats.block > 0 && Math.random() * 100 < this.stats.block;
    if(blocked)this.visualReaction('block',source);
    return blocked;
  }

  /* ---------------- skills ---------------- */
  canPay(sk, rk) { return this.mana >= sk.mana(rk); }
  pay(sk, rk) { this.mana -= sk.mana(rk); }

  /* execute a skill *now* (caller has verified range etc.) */
  performSkill(skillId,target,point) {
    const previous=this.action;
    this._visualSkill=skillId==='basic'?'basic':DATA.SKILLS[skillId]?.type||skillId;
    try {
      const result=this.withSkillSource(skillId,()=>{
        const sk=this.resolveSkill(skillId), result=this.performSkillAction(skillId,target,point);
        if(result)this.applySkillPerkBuff(sk,this.effRank(skillId));
        return result;
      });
      if(result&&this.action!==previous&&!this.action?.visual?.releases.length)this.markActionRelease(0);
      return result;
    } finally {this._visualSkill=null;}
  }
  performSkillAction(skillId, target, point) {
    const isBasic = skillId === "basic";
    const sk = this.resolveSkill(skillId);
    const rk = isBasic ? 1 : this.effRank(skillId);
    if (!isBasic && rk <= 0) return false;
    if (!isBasic && !this.canPay(sk, rk)) { Sfx.play("error"); Game.msg("Not enough aether.", "#8090d0"); return false; }
    const dur = 1 / this.stats.attackRate;
    const syn = isBasic ? 1 : this.synergyMult(sk);

    switch (sk.type) {
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
            Game.spawnProjectile({ x: this.x, y: this.y, tx: target.x, ty: target.y, speed: 11, kind: "arrow", fromPlayer: true, mult, quarryOnHit: sk.quarryOnHit, quarryStacks:sk.quarryStacks?.(rk), pierce:!!sk.perkPierce });
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
          for (const mon of Game.state.monsters) {
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
          for (const mon of Game.state.monsters) {
            if (mon.dead || U.dist(this.x, this.y, mon.x, mon.y) > radius + mon.radius) continue;
            if (mult > 0) this.strike(mon, mult, { auto: true });
            if (sk.stun) mon.stunT = Math.max(mon.stunT, sk.stun(rk));
            if (sk.slowPct) mon.applySlow(sk.dur(rk), sk.slowPct(rk));
            if (sk.weaken) mon.curseWither = { until: Game.state.time + sk.dur(rk), pct: sk.weaken(rk) };
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
              Game.spawnProjectile(Object.assign({}, base, { tx: this.x + Math.cos(a) * 8, ty: this.y + Math.sin(a) * 8 }));
            }
          } else {
            Game.spawnProjectile(Object.assign({}, base, { tx: aim.x, ty: aim.y, pierce: true, speed: 14 }));
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
          mult: this.synergyMult(sk) * (1 + this.stats.trapPct / 100) * (1 + this.stats.attr.dex / 140),
        };
        /* cap concurrent traps */
        if (Game.state.traps.length >= 4+(this.stats.trapCap||0)) Game.state.traps.shift();
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
              Game.spawnProjectile(Object.assign({}, base, { tx: this.x + Math.cos(a) * 8, ty: this.y + Math.sin(a) * 8, spell: sp }));
            }
          } else {
            const sp = mkSpell(); if (sk.wander) sp.wander = sk.wander;
            Game.spawnProjectile(Object.assign({}, base, { tx: aim.x, ty: aim.y, spell: sp }));
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
          for (const m of Game.state.monsters) { if (m.dead) continue; const dd = U.dist2(ap.x, ap.y, m.x, m.y); if (dd < bd) { bd = dd; first = m; } }
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
            for (const m of Game.state.monsters) { if (m.dead || hitset.has(m)) continue; const dd = U.dist2(fxp, fyp, m.x, m.y); if (dd < bd) { bd = dd; next = m; } }
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
          for (const mon of Game.state.monsters) {
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
            if (aim) for (const mon of Game.state.monsters) {
              if (!mon.dead || mon.corpseT <= 0 || mon.exploded) continue;
              const dd = U.dist2(aim.x, aim.y, mon.x, mon.y);
              if (dd < bd) { bd = dd; corpse = mon; }
            }
            if (!corpse) {
              bd = sk.castRange(rk) ** 2;
              for (const mon of Game.state.monsters) {
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
          const mine = Game.state.minions.filter(m => !m.dead && m.kindId === sk.minion);
          if (mine.length >= cap) mine.reduce((lo, m) => m.hp < lo.hp ? m : lo, mine[0]).die();   // the most wounded returns to the wild
          const mi = new Minion(sk.minion, stats, this);
          mi.sourceSkill=skillId;
          if (corpse) { mi.x = corpse.x; mi.y = corpse.y; }   // it climbs out of the body
          mi.dmgPctOwner = this.stats.minionDmgPct;
          mi.refreshPalette();
          if (empowered) {   // Empowered: doubled, larger, violet-aura'd, renamed
            mi.empowered = true; mi.tint = "#c060ff"; mi.scale = 1.25;
            if (mi.spriteOpts) mi.spriteOpts.scale = (mi.spriteOpts.scale || 1) * 1.25;
            mi.name = "Empowered " + (mi.name || "Minion");
          }
          Game.state.minions.push(mi);
          if (corpse) {
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
        if (this.stats.shiftRadius > 0) { Game.addNova(this.x, this.y, this.stats.shiftRadius, "#a8c860"); for (const mon of Game.state.monsters) { if (mon.dead || U.dist(this.x, this.y, mon.x, mon.y) > this.stats.shiftRadius + mon.radius) continue; mon.stunT = Math.max(mon.stunT, this.stats.shiftStun || 0.4); } }
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
          for (const mon of Game.state.monsters) { if (mon.dead) continue; if (U.dist(cx, cy, mon.x, mon.y) < rad + mon.radius) { const r = this.spellRoll(sk, rk); this.spellHit(mon, r.dmg, "fire", { crit: r.crit, burn: 2 }); } }
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
              target.poisonDot = { dps: Math.max((target.poisonDot && target.poisonDot.dps) || 0, tickDps), t: pdur };
              target.rabies = { until: Game.state.time + pdur, dps: tickDps, cloudRad: crad, owner: this };
              for (let i = 0; i < 4; i++) Game.addParticle(target.x, target.y, "#90ff70");
            }
          }
        });
        return true;
      }
      case "minionbuff": {
        if (!Game.state.minions.some(m => !m.dead)) { Game.msg("You have no servants to muster.", "#9a9a9a"); return false; }
        if (sk.cd && this.skillCd[skillId] && Game.state.time < this.skillCd[skillId]) { Game.msg(sk.name + " not ready.", "#c0a060"); Sfx.play("error"); return false; }
        this.pay(sk, rk);
        if (sk.cd) this.skillCd[skillId] = Game.state.time + sk.cd(rk);
        const dur = this.beginCast(sk, null);
        this.afterActionDelay(dur * 0.6, () => {
          if (this.dead) return;
          Sfx.play("roar");
          const healPct = sk.heal ? sk.heal(rk) : 100;   // dread_muster heals a %, feral_howl full
          for (const mi of Game.state.minions) {
            if (mi.dead) continue;
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
          for (const mon of Game.state.monsters) {
            if (mon.dead || U.dist(aim.x, aim.y, mon.x, mon.y) > radius + mon.radius) continue;
            if (sk.curse === "frailty") mon.curseFrailty = { until: Game.state.time + cdur, pct };
            else { mon.curseWither = { until: Game.state.time + cdur, pct }; mon.applySlow(cdur, slowPct); }
            Game.addParticle(mon.x, mon.y, "#b070d0");
          }
        });
        return true;
      }
      case "corpse": {
        const aim = target ? { x: target.x, y: target.y } : point;
        if (!aim) return false;
        let corpse = null, bd = 2.5 * 2.5;
        for (const mon of Game.state.monsters) {
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
          for (const mon of Game.state.monsters) {
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
          for (const mon of Game.state.monsters) {
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
          for (const mon of Game.state.monsters) {
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
        this.hp = Math.min(this.stats.maxHp, this.hp + amt);
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
        Game.state.fx.push({ type: "meteorfall", x: spot.x, y: spot.y, radius, col, ttl: dur * 0.5 + delay, maxTtl: dur * 0.5 + delay });
        this.afterActionDelay(dur * 0.5, () => { if (!this.dead) Sfx.play("firebolt"); });
        this.afterSkillDelay(dur * 0.5 + delay, () => {
          if (this.dead) return;
          Sfx.play(sk.sound || "blast");
          Game.addNova(spot.x, spot.y, radius, col);
          Game.fx.shake = Math.max(Game.fx.shake, 6);
          for (let i = 0; i < 22; i++) Game.addParticle(spot.x + U.rf(-radius, radius) * 0.6, spot.y + U.rf(-radius, radius) * 0.6, col);
          for (const mon of Game.state.monsters) {
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
          for (const mon of Game.state.monsters) { if (mon.dead) continue; if (U.dist(this.x, this.y, mon.x, mon.y) > range + mon.radius) continue; let da = Math.abs(Math.atan2(mon.y - this.y, mon.x - this.x) - a0); if (da > Math.PI) da = Math.PI * 2 - da; if (da <= arc / 2) { this.strike(mon, mult); mon.sunder = { until: Game.state.time + sk.shredDur(rk), stacks: Math.min(3, ((mon.sunder && mon.sunder.stacks) || 0) + t) }; } }
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
          if (t >= 2) for (const mon of Game.state.monsters) { if (mon !== target && !mon.dead && U.dist(target.x, target.y, mon.x, mon.y) < 1.8) this.strike(mon, mainMult * 0.5, { auto: true }); }
          if (target.dead) { this.tempo = Math.min(3 + (this.stats.tempoCapBonus || 0), this.tempo + 2); this.skillCd[skillId] = 0; }
        });
        return true;
      }
      case "shout": {   // Rallying Cry — heal + cleanse + run
        this.pay(sk, rk);
        const heal = Math.floor(this.stats.maxHp * sk.healPct(rk) / 100);
        this.hp = Math.min(this.stats.maxHp, this.hp + heal); this.slowT = 0; this.slowPct = 0;
        this.buffs = this.buffs.filter(b => b.id !== "rally_run");
        this.buffs.push({ id: "rally_run", label: "Rally", emoji: "📯", stats: { frw: sk.runPct(rk) }, until: Game.state.time + sk.rallyDur(rk) });
        this.computeStats();
        for (const mi of Game.state.minions) if (!mi.dead && U.dist(this.x, this.y, mi.x, mi.y) < sk.radius(rk)) mi.hp = Math.min(mi.maxHp, mi.hp + mi.maxHp * (sk.allyHealPct?.(rk)??25)/100);
        Sfx.play("roar"); Game.addNova(this.x, this.y, sk.radius(rk), "#ffe6b0"); Game.addFloat(this.x, this.y, "+" + heal, "#80ff90");
        return true;
      }
      case "fear": {   // Terrifying Bellow (load-bearing id terrifying_bellow)
        this.pay(sk, rk); this.startAction("attack", dur * 0.8); Sfx.play("roar");
        const R = sk.radius(rk);
        Game.addNova(this.x, this.y, R, "#b070d0"); Game.fx.shake = Math.max(Game.fx.shake, 3);
        for (const mon of Game.state.monsters) { if (mon.dead || U.dist(this.x, this.y, mon.x, mon.y) > R + mon.radius) continue; if (mon.isBoss) mon.applySlow(sk.dur(rk), 50); else { mon.feared = Game.state.time + sk.dur(rk); mon.aggro = true; } if(sk.fearWeaken?.(rk)>0)mon.curseWither={until:Game.state.time+sk.dur(rk),pct:sk.fearWeaken(rk)}; }
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
        for (let i = 0; i < n; i++) { const a = a0 + (i - (n - 1) / 2) * 0.13; Game.spawnProjectile({ x: this.x, y: this.y, tx: this.x + Math.cos(a) * rng, ty: this.y + Math.sin(a) * rng, speed: 11, kind: "thrownaxe", fromPlayer: true, mult, pierce: true, boomerang: { maxRange: rng, fromX: this.x, fromY: this.y, returning: false } }); }
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
        Game.state.fx.push({ type: "fissure", x0: baseX, y0: baseY, ang, len, ttl: 0.75, maxTtl: 0.75, seed: ((baseX * 13 + baseY * 7) | 0) });
        for (let i = 0; i <= N; i++) {
          const ex = baseX + Math.cos(ang) * (i * step), ey = baseY + Math.sin(ang) * (i * step);
          this.afterSkillDelay(i * 0.05, () => {
            if (this.dead) return;
            Game.addNova(ex, ey, 0.7, "#8a6a3a"); Game.fx.shake = Math.max(Game.fx.shake, 2);
            for (let d = 0; d < 4; d++) Game.addParticle(ex + U.rf(-0.45, 0.45), ey + U.rf(-0.45, 0.45), d % 2 ? "#7a6242" : "#5a4a36");   // dust + rock shards
            for (const mon of Game.state.monsters) { if (mon.dead || hitset.has(mon)) continue; if (U.dist(ex, ey, mon.x, mon.y) < stepR + mon.radius) { hitset.add(mon); if (weapon) this.strike(mon, mult, { auto: true }); else this.spellHit(mon, this.spellRoll(sk, rk).dmg, sk.elem || "earth", {}); mon.stunT = Math.max(mon.stunT, sk.stun(rk)); } }
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
          for (const mon of Game.state.monsters) { if (mon.dead) continue; if (U.dist(this.x, this.y, mon.x, mon.y) > range + mon.radius) continue; let da = Math.abs(Math.atan2(mon.y - this.y, mon.x - this.x) - a0); if (da > Math.PI) da = Math.PI * 2 - da; if (da <= arc / 2) { this.strike(mon, mult); const bx = mon.x, by = mon.y; Game.knockMonster(mon, this.x, this.y, kb); const moved = U.dist(bx, by, mon.x, mon.y); mon.stunT = Math.max(mon.stunT, moved < kb * 0.5 ? 1.4 : 0.6); } }
          Game.fx.shake = Math.max(Game.fx.shake, 3);
        });
        return true;
      }
      case "banner": case "banner_ultimate": {   // War Banner / Standard of the Last Stand
        let aim = point || (target ? { x: target.x, y: target.y } : { x: this.x, y: this.y });
        if (!MapGen.walkable(Game.state.map, aim.x, aim.y)) aim = { x: this.x, y: this.y };
        this.pay(sk, rk);
        Game.state.fx = Game.state.fx.filter(f => !(f.type === "banner" && f.tag === sk.id));
        Game.state.fx.push({ type: "banner", tag: sk.id, x: aim.x, y: aim.y, radius: sk.radius(rk), ttl: sk.dur(rk), maxTtl: sk.dur(rk), tickEvery: 0.3,
          allyDmg: sk.allyDmg ? sk.allyDmg(rk) : 10, allyIas: sk.allyIas ? sk.allyIas(rk) : 8, enemyDmg: sk.enemyDmg ? sk.enemyDmg(rk) : 12,
          heal: sk.type === "banner_ultimate" ? (sk.heal ? sk.heal(rk) : 4) : (sk.bannerHeal?.(rk)??0), kindCol: sk.type === "banner_ultimate" ? "#ffe6a0" : "#d8b84a", owner: this });
        Sfx.play("roar"); Game.addNova(aim.x, aim.y, 1.2, "#ffe6b0");
        return true;
      }
      case "warshout_debuff": {   // Sundering Roar — strip + shred + slow, no damage
        this.pay(sk, rk); this.startAction("attack", dur * 0.8); Sfx.play("roar");
        const R = sk.radius(rk);
        Game.addNova(this.x, this.y, R, "#d8b84a"); Game.fx.shake = Math.max(Game.fx.shake, 2);
        for (const mon of Game.state.monsters) { if (mon.dead || U.dist(this.x, this.y, mon.x, mon.y) > R + mon.radius) continue; const duration=sk.debuffDuration?.(rk)??6; mon.sunder = { until: Game.state.time + duration, stacks: Math.min(3, ((mon.sunder && mon.sunder.stacks) || 0) + 2) }; mon.applySlow(duration, sk.roarSlow?.(rk)??15); if(sk.roarWeaken?.(rk)>0)mon.curseWither={until:Game.state.time+duration,pct:sk.roarWeaken(rk)}; }
        return true;
      }
      /* ===================== EMBER WITCH ===================== */
      case "firewall": {   // Wall of Fire — persistent burning line perpendicular to aim
        let aim = target ? { x: target.x, y: target.y } : point; if (!aim) return false;
        const maxR = sk.castRange(rk), d = U.dist(this.x, this.y, aim.x, aim.y);
        if (d > maxR) { const k = maxR / d; aim = { x: this.x + (aim.x - this.x) * k, y: this.y + (aim.y - this.y) * k }; }
        this.pay(sk, rk); const dur0 = this.beginCast(sk, aim);
        const len = sk.len(rk), dm = sk.dmg(rk), ang = Math.atan2(aim.y - this.y, aim.x - this.x) + Math.PI / 2, ax = aim.x, ay = aim.y;
        this.afterActionDelay(dur0 * 0.4, () => { if (this.dead) return; Sfx.play("blast"); const fwx0 = ax - Math.cos(ang) * len / 2, fwy0 = ay - Math.sin(ang) * len / 2, fwx1 = ax + Math.cos(ang) * len / 2, fwy1 = ay + Math.sin(ang) * len / 2; Game.state.fx.push({ type: "firewall", x: ax, y: ay, x0: fwx0, y0: fwy0, x1: fwx1, y1: fwy1, width: 0.8, ttl: sk.dur(rk), maxTtl: sk.dur(rk), tickEvery: 0.4, lo: dm[0], hi: dm[1], owner: this }); Game.breakPropsSeg(fwx0, fwy0, fwx1, fwy1, 1.0); });
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
          Game.state.fx.push({ type: "pyre", x: at.x, y: at.y, radius, ttl: 0.6, maxTtl: 0.6 });
          for (let i = 0; i < 24; i++) Game.addParticle(at.x + U.rf(-radius, radius) * 0.5, at.y + U.rf(-radius, radius) * 0.5, i % 3 ? "#ff9040" : "#ffe27a");
          let consumed = 0;
          for (const mon of Game.state.monsters) {
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
          for (const mon of Game.state.monsters) { if (mon.dead || U.dist(this.x, this.y, mon.x, mon.y) > radius + mon.radius) continue; const r = this.spellRoll(sk, rk); this.spellHit(mon, r.dmg, "cold", { crit: r.crit }); mon.frozen = Game.state.time + fr; mon.stunT = Math.max(mon.stunT, fr); }
        });
        return true;
      }
      case "balllightning": {   // Ball Lightning — slow drifting plasma orb that discharges arcs
        let aim = target ? { x: target.x, y: target.y } : point; if (!aim) { const [wx, wy] = U.screenVecToWorld(this.visAng); aim = { x: this.x + wx * 5, y: this.y + wy * 5 }; }
        this.pay(sk, rk); const dur0 = this.beginCast(sk, aim); const dm = sk.dmg(rk), a = Math.atan2(aim.y - this.y, aim.x - this.x), bx = this.x, by = this.y;
        this.afterActionDelay(dur0 * 0.5, () => { if (this.dead) return; Sfx.play("zap"); Game.state.fx.push({ type: "cyclone", orb: true, x: bx, y: by, vx: Math.cos(a) * 2.5, vy: Math.sin(a) * 2.5, ttl: sk.dur(rk), radius: sk.orbRadius?.(rk)??3.0, tickEvery: sk.orbTick?.(rk)??0.35, drift: 0, lo: dm[0], hi: dm[1], pull: 0, owner: this }); });
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
        for (const mon of Game.state.monsters) { if (mon.dead || U.dist(this.x, this.y, mon.x, mon.y) > radius + mon.radius) continue; const r = this.spellRoll(sk, rk); this.spellHit(mon, r.dmg, "light", { crit: r.crit }); Game.lightningBolt(this.x, this.y, mon.x, mon.y); }
        return true;
      }
      case "overloadnuke": {   // Overload — dump all Static into one blast
        this.pay(sk, rk); const dur0 = this.beginCast(sk, null); const st0 = this.staticChg || 0, radius = sk.radius(rk), per = sk.perStatic ? sk.perStatic(rk) : 3 + rk;
        this.staticChg = Math.floor(st0*(sk.staticRetain?.(rk)??0));
        this.afterActionDelay(dur0 * 0.5, () => {
          if (this.dead) return; Sfx.play("blast"); Game.addNova(this.x, this.y, radius, "#fff080"); Game.fx.shake = Math.max(Game.fx.shake, 6 + Math.min(6, st0 * 0.3));
          for (let i = 0; i < 20; i++) Game.addParticle(this.x + U.rf(-radius, radius) * 0.5, this.y + U.rf(-radius, radius) * 0.5, "#fff080");
          for (const mon of Game.state.monsters) { if (mon.dead || U.dist(this.x, this.y, mon.x, mon.y) > radius + mon.radius) continue; const r = this.spellRoll(sk, rk); this.spellHit(mon, r.dmg + per * st0, "light", { crit: r.crit }); mon.stunT = Math.max(mon.stunT, Math.min(1.0, st0 * 0.05)); }
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
        if (kind === "spore") { const a = Math.atan2(aim.y - this.y, aim.x - this.x); f.vx = Math.cos(a) * 0.6; f.vy = Math.sin(a) * 0.6; }
        if (["inferno", "glacier", "static"].includes(kind)) Game.state.fx = Game.state.fx.filter(g => !(g.type === "groundfield" && g.fieldKind === kind));
        this.afterActionDelay(dur0 * 0.5, () => { if (this.dead) return; Sfx.play(kind === "glacier" ? "frost" : kind === "static" ? "zap" : "blast"); Game.addNova(aim.x, aim.y, f.radius, col); Game.state.fx.push(f); });
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
        const mode = sk.mode || "all", beasts = Game.state.minions.filter(m => !m.dead);
        if (!beasts.length) { Game.msg(mode === "one" ? "No beast to give." : "You have no servants to sacrifice.", "#9a9a9a"); return false; }
        this.pay(sk, rk); Sfx.play("blast");
        if (mode === "all") {
          const radius = sk.radius(rk), dm = sk.dmg(rk);
          for (const mi of beasts) {
            const sizeMult = mi.kindId === "bone_golem" ? 2.0 : mi.isArcher ? 0.7 : 1.0, dmg = U.rf(dm[0], dm[1]) * (mi.hp / mi.maxHp) * sizeMult;
            Game.addNova(mi.x, mi.y, radius, "#90ff70");
            for (const mon of Game.state.monsters) { if (mon.dead || U.dist(mi.x, mi.y, mon.x, mon.y) > radius + mon.radius) continue; this.spellHit(mon, dmg, "poison", {}); }
            const cx = mi.x, cy = mi.y; mi.die(); Game.spawnCorpse(cx, cy, 12);
          }
          Game.fx.shake = Math.max(Game.fx.shake, Math.min(8, 2 + beasts.length));
        } else {
          let best = null, bd = (sk.castRange ? sk.castRange(rk) : 9) ** 2;
          for (const mi of beasts) { const dd = U.dist2(this.x, this.y, mi.x, mi.y); if (dd < bd) { bd = dd; best = mi; } }
          if (!best) { Game.msg("No beast near enough.", "#9a9a9a"); return false; }
          const cx = best.x, cy = best.y, healAmt = this.stats.maxHp * sk.healPct(rk) / 100;
          best.die(); this.hp = Math.min(this.stats.maxHp, this.hp + healAmt);
          for (const mi of Game.state.minions) if (!mi.dead) mi.hp = Math.min(mi.maxHp, mi.hp + mi.maxHp * 0.2);
          Game.state.fx.push({ type: "groundfield", fieldKind: "regrowth", x: cx, y: cy, radius: sk.fieldRadius ? sk.fieldRadius(rk) : 2.6, ttl: sk.fieldTtl ? sk.fieldTtl(rk) : 6, maxTtl: sk.fieldTtl ? sk.fieldTtl(rk) : 6, tickEvery: 0.5, heal: sk.fieldHeal ? sk.fieldHeal(rk) : 3, owner: this });
          Game.addNova(cx, cy, 1.6, "#90ff70"); Game.addFloat(this.x, this.y, "+" + Math.floor(healAmt), "#80ff90");
        }
        return true;
      }
      case "siphon_beam": {   // Soul Siphon — maintained life-tether
        let first = target;
        if (!first) { let bd = 81; for (const m of Game.state.monsters) { if (m.dead) continue; const dd = U.dist2(this.x, this.y, m.x, m.y); if (dd < bd) { bd = dd; first = m; } } }
        if (!first) { Game.msg("Nothing to siphon.", "#9a9a9a"); return false; }
        this.pay(sk, rk);
        this.siphon = { target: first, ramp: 0, until: Game.state.time + sk.maxChannel(rk), tickT: 0, tickRate: sk.tickRate(rk), tickDmg: sk.tickDmg(rk), drain: sk.drain(rk), manaPerSec: sk.manaPerSec ? sk.manaPerSec(rk) : 2 };
        Sfx.play("curse");
        return true;
      }
      case "doom": {   // Doom — a charging death-timer
        if (!target) { const ap = point || { x: this.x, y: this.y }; let bd = 64; for (const m of Game.state.monsters) { if (m.dead) continue; const dd = U.dist2(ap.x, ap.y, m.x, m.y); if (dd < bd) { bd = dd; target = m; } } }
        if (!target) return false;
        this.pay(sk, rk); const dur0 = this.beginCast(sk, target), timer = sk.timer(rk) * (1 + (this.stats.curseDurPct || 0) / 100);
        target.doom = { until: Game.state.time + dur0 + timer, charge: 0, maxCharge: timer, dmgLo: sk.dmgLo(rk), dmgHi: sk.dmgHi(rk), radius: sk.radius(rk) * (1 + (this.stats.curseRadiusPct || 0) / 100) };
        Sfx.play("curse"); Game.addParticle(target.x, target.y, "#9a40c0");
        return true;
      }
      case "taunt_curse": {   // Hex of Beckoning — stampede to a mark
        let aim = point || (target ? { x: target.x, y: target.y } : null); if (!aim) return false;
        this.pay(sk, rk); const dur0 = this.beginCast(sk, aim);
        const radius = sk.radius(rk) * (1 + (this.stats.curseRadiusPct || 0) / 100), dur = sk.dur(rk) * (1 + (this.stats.curseDurPct || 0) / 100), spot = aim;
        this.afterActionDelay(dur0 * 0.5, () => { if (this.dead) return; Sfx.play("curse"); Game.addNova(spot.x, spot.y, radius, "#9a40c0"); for (const mon of Game.state.monsters) { if (mon.dead || U.dist(spot.x, spot.y, mon.x, mon.y) > radius + mon.radius) continue; mon.beckon = { until: Game.state.time + dur, x: spot.x, y: spot.y }; } });
        return true;
      }
      case "plague_seed": {   // Contagion — self-spreading plague
        if (!target) { const ap = point || { x: this.x, y: this.y }; let bd = 64; for (const m of Game.state.monsters) { if (m.dead) continue; const dd = U.dist2(ap.x, ap.y, m.x, m.y); if (dd < bd) { bd = dd; target = m; } } }
        if (!target) return false;
        this.pay(sk, rk); const dur0 = this.beginCast(sk, target);
        target.plague = { until: Game.state.time + dur0 + sk.dur(rk), tick: sk.tick(rk), tickT: 0, spreadCd: 1.5, spreadRange: sk.spreadRange(rk), burstRange: sk.burstRange(rk) };
        Sfx.play("curse"); Game.addParticle(target.x, target.y, "#90ff70");
        return true;
      }
      case "devour": {   // Devour Corpse — heal + cleanse
        const aim = target ? { x: target.x, y: target.y } : point || { x: this.x, y: this.y };
        const searchRadius=sk.devourRadius?.(rk)??9;
        let corpse = null, bd = searchRadius**2; for (const mon of Game.state.monsters) { if (!mon.dead || mon.corpseT <= 0 || mon.exploded) continue; const dd = U.dist2(aim.x, aim.y, mon.x, mon.y); if (dd < bd) { bd = dd; corpse = mon; } }
        if (!corpse) corpse = Game.corpseFromGrave(this, aim, searchRadius);
        if (!corpse) { Game.msg("No corpse or grave to devour.", "#9a9a9a"); return false; }
        this.pay(sk, rk); corpse.exploded = true; corpse.corpseT = 0;
        const heal = this.stats.maxHp * sk.healPct(rk) / 100; this.hp = Math.min(this.stats.maxHp, this.hp + heal); this.slowT = 0; this.slowPct = 0; this.poisonDot = null;
        for (const mi of Game.state.minions) if (!mi.dead && U.dist(this.x, this.y, mi.x, mi.y) < 4) mi.hp = Math.min(mi.maxHp, mi.hp + mi.maxHp * (sk.devourMinionHeal?.(rk)??10)/100);
        this.mana=Math.min(this.stats.maxMana,this.mana+this.stats.maxMana*(sk.devourMana?.(rk)??0)/100);
        Sfx.play("potion"); Game.addNova(this.x, this.y, 1.5, "#90ff70"); Game.addFloat(this.x, this.y, "+" + Math.floor(heal), "#80ff90");
        return true;
      }
      case "corpse_launch": {   // Corpse Spear — hurl a cadaver-javelin
        const aim = target ? { x: target.x, y: target.y } : point; if (!aim) return false;
        let corpse = null, bd = (sk.castRange ? sk.castRange(rk) : 9) ** 2; for (const mon of Game.state.monsters) { if (!mon.dead || mon.corpseT <= 0 || mon.exploded) continue; const dd = U.dist2(this.x, this.y, mon.x, mon.y); if (dd < bd) { bd = dd; corpse = mon; } }
        if (!corpse) corpse = Game.corpseFromGrave(this, aim, (sk.castRange ? sk.castRange(rk) : 9));
        if (!corpse) { Game.msg("No corpse or grave to hurl.", "#9a9a9a"); return false; }
        this.pay(sk, rk); corpse.exploded = true; corpse.corpseT = 0; const dm = sk.dmg(rk);
        Game.spawnProjectile({ x: corpse.x, y: corpse.y, tx: aim.x, ty: aim.y, speed: sk.projSpeed ? sk.projSpeed(rk) : 11, kind: "cadaver", fromPlayer: true, spell: { dmg: U.rf(dm[0], dm[1]) * (1 + this.stats.spellPct / 100), knockback: sk.knockback(rk), sprayRadius: sk.sprayRadius(rk) } });
        Sfx.play("swing");
        return true;
      }
      case "reap": {   // Reaping — a scythe arc that cashes in curses
        let aim = target ? { x: target.x, y: target.y } : point; if (!aim) { const [wx, wy] = U.screenVecToWorld(this.visAng); aim = { x: this.x + wx, y: this.y + wy }; }
        this.pay(sk, rk); this.face(aim.x, aim.y); const dur0 = this.beginCast(sk, aim);
        const a0 = Math.atan2(aim.y - this.y, aim.x - this.x), arc = sk.arc(rk), radius = sk.radius(rk), bonus = sk.bonusVsCursed(rk), reapHeal = sk.reapHeal(rk);
        this.afterActionDelay(dur0 * 0.5, () => {
          if (this.dead) return; Sfx.play("curse"); Game.addNova(this.x, this.y, radius, "#c080e0");
          for (const mon of Game.state.monsters) { if (mon.dead || U.dist(this.x, this.y, mon.x, mon.y) > radius + mon.radius) continue; let da = Math.abs(Math.atan2(mon.y - this.y, mon.x - this.x) - a0); if (da > Math.PI) da = Math.PI * 2 - da; if (da > arc / 2) continue;
            let dmg = this.spellRoll(sk, rk).dmg; const cursed = (mon.curseFrailty && Game.state.time < mon.curseFrailty.until) || (mon.curseWither && Game.state.time < mon.curseWither.until);
            if (cursed) { dmg *= 1 + bonus / 100; this.hp = Math.min(this.stats.maxHp, this.hp + reapHeal); mon.curseFrailty = null; mon.curseWither = null; }
            if (mon.doom) Game.detonateDoom(mon);
            this.spellHit(mon, dmg, "shadow", {}); }
        });
        return true;
      }
      case "outbreak": {   // Outbreak — expanding pestilence ring
        this.pay(sk, rk); const dur0 = this.beginCast(sk, null), bx = this.x, by = this.y;
        this.afterActionDelay(dur0 * 0.5, () => { if (this.dead) return; Sfx.play("blast"); Game.state.fx.push({ type: "outbreak", x: bx, y: by, r: 0, maxR: sk.maxR(rk), dur: sk.dur(rk), ttl: sk.dur(rk) + 0.5, tick: sk.tick(rk), corpseDmg: sk.corpseDmg(rk), hitMon: new Set(), owner: this }); });
        return true;
      }
      case "summon_golem": {   // Bone Golem — stitched from corpses; re-cast on corpses to feed & grow
        const gatherR = sk.gatherRadius(rk), maxStitch = sk.maxCorpses(rk);
        const existing = Game.state.minions.find(m => !m.dead && m.kindId === "bone_golem");
        const cur = existing ? (existing.stitches || 1) : 0, remaining = maxStitch - cur;
        if (existing && remaining <= 0) { Game.msg(`The golem is already whole (${maxStitch} bones).`, "#9a9a9a"); Sfx.play("error"); return false; }
        /* every cast — including feeding — must consume at least one nearby corpse */
        const corpses = Game.state.monsters.filter(m => m.dead && m.corpseT > 0 && !m.exploded && U.dist(this.x, this.y, m.x, m.y) < gatherR).slice(0, remaining);
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
          Game.addNova(existing.x, existing.y, 1.6, "#cfd8c0"); Game.dustPuff(existing.x, existing.y); for (let i = 0; i < 8; i++) Game.addParticle(existing.x, existing.y, "#cfd8c0"); Sfx.play("vox_bone");
        } else {
          const dm = sk.slamDmg(rk);
          const stats = { hp: 1, dmg: [dm[0], dm[1]], speed: 2.2, atkRate: 0.7, range: 1.0, sprite: "golem", name: "Bone Golem", taunt: sk.tauntRadius(rk), slamDmg: dm };
          const mi = new Minion("bone_golem", stats, this); mi.dmgPctOwner = this.stats.minionDmgPct;
          mi.sourceSkill=skillId;
          mi.stitches = used; mi.maxStitch = maxStitch; recompute(mi);
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
        this.afterActionDelay(dur * 0.4, () => { if (this.dead) return; Game.spawnProjectile({ x: this.x, y: this.y, tx: aim.x, ty: aim.y, speed: 14, kind: "arrow", fromPlayer: true, mult: sk.dmgMult(rk) * syn, ricochet: { bounces: sk.bounces(rk) } }); });
        return true;
      }
      case "rain": {   // Arrowfall — a circle that rains arrows
        let aim = target ? { x: target.x, y: target.y } : point; if (!aim) aim = { x: this.x, y: this.y };
        const maxR = sk.castRange ? sk.castRange(rk) : 9, d = U.dist(this.x, this.y, aim.x, aim.y); if (d > maxR) { const k = maxR / d; aim = { x: this.x + (aim.x - this.x) * k, y: this.y + (aim.y - this.y) * k }; }
        this.pay(sk, rk); this.startAction("attack", dur); Sfx.play("bow");
        Game.state.fx.push({ type: "rain", x: aim.x, y: aim.y, radius: sk.radius(rk), ttl: sk.dur(rk), maxTtl: sk.dur(rk), tickEvery: 0.25, mult: sk.dmgMult(rk) * syn, owner: this });
        return true;
      }
      case "tripwire": {   // Tripwire — a bleeding line snare
        let aim = target ? { x: target.x, y: target.y } : point; if (!aim) { const [wx, wy] = U.screenVecToWorld(this.visAng); aim = { x: this.x + wx * 5, y: this.y + wy * 5 }; }
        const len = sk.length(rk), d = U.dist(this.x, this.y, aim.x, aim.y) || 1, ex = this.x + (aim.x - this.x) / d * len, ey = this.y + (aim.y - this.y) / d * len;
        this.pay(sk, rk); const dm = sk.dmg(rk);
        Game.state.fx.push({ type: "tripwire", x: (this.x + ex) / 2, y: (this.y + ey) / 2, x0: this.x, y0: this.y, x1: ex, y1: ey, ttl: sk.ttl ? sk.ttl(rk) : 20, sprung: false, lo: dm[0], hi: dm[1], bleed: sk.bleed(rk), root: sk.root(rk), owner: this });
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
        if (!target) { const ap = point || { x: this.x, y: this.y }; let bd = 64; for (const m of Game.state.monsters) { if (m.dead) continue; const dd = U.dist2(ap.x, ap.y, m.x, m.y); if (dd < bd) { bd = dd; target = m; } } }
        if (!target) return false;
        this.pay(sk, rk);
        target.killMark = { until: Game.state.time + sk.dur(rk), amp: sk.amp(rk), det: sk.detDmg(rk) };
        Sfx.play("curse"); Game.addParticle(target.x, target.y, "#c080e0");
        return true;
      }
      case "detonate_dots": {   // Hemorrhage — burst every prepared wound on screen
        this.pay(sk, rk); Sfx.play("blast"); Game.fx.shake = Math.max(Game.fx.shake, 4);
        const wd = this.weaponDamage(), wavg = (wd[0] + wd[1]) / 2;
        for (const mon of Game.state.monsters) {
          if (mon.dead) continue;
          let burst = 0;
          if (mon.poisonDot) burst += mon.poisonDot.dps * mon.poisonDot.t * sk.dotMult(rk);
          if (mon.quarry && Game.state.time < mon.quarry.until) burst += mon.quarry.stacks * sk.perQuarry(rk) / 100 * wavg;
          if (mon.killMark && Game.state.time < mon.killMark.until) burst += sk.markBonus(rk) / 100 * wavg;
          if (burst <= 0) continue;
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
        const same = Game.state.fx.filter(f => f.type === "totem" && f.totemKind === kind);
        while (same.length >= cap) { const old = same.shift(); const idx = Game.state.fx.indexOf(old); if (idx >= 0) Game.state.fx.splice(idx, 1); }
        Game.state.fx.push({ type: "totem", totemKind: kind, x: aim.x, y: aim.y, ttl, maxTtl: ttl, radius: sk.radius(rk), zapCd: sk.zapCd ? sk.zapCd(rk) : 1.1, zapT: 0.3, lo: dm[0], hi: dm[1], pulseCd: sk.pulseCd ? sk.pulseCd(rk) : 1.4, pulseT: 0, wispCd: sk.wispCd ? sk.wispCd(rk) : 3, wispT: 1, ringR: 0, owner: this });
        Sfx.play("shrine"); Game.addNova(aim.x, aim.y, 1.2, kind === "tempest" ? "#fff080" : "#cfe0ff");
        return true;
      }
      case "roamaoe": {   // Cyclone — a wandering tornado
        let aim = target ? { x: target.x, y: target.y } : point; if (!aim) { const [wx, wy] = U.screenVecToWorld(this.visAng); aim = { x: this.x + wx * 4, y: this.y + wy * 4 }; }
        this.pay(sk, rk); const dm = sk.dmg(rk);
        Game.state.fx.push({ type: "cyclone", x: this.x, y: this.y, vx: 0, vy: 0, ttl: sk.ttl(rk), radius: sk.radius(rk), tickEvery: sk.tickCd ? sk.tickCd(rk) : 0.4, drift: sk.drift ? sk.drift(rk) : 2.5, lo: dm[0], hi: dm[1], pull: sk.pull ? sk.pull(rk) : 1.5, owner: this });
        Sfx.play("blast"); Game.addNova(this.x, this.y, 1.5, "#cfe0ff");
        return true;
      }
    }
    return false;
  }

  /* belt potion */
  quaff(slotIdx) {
    if (this.dead) return;
    const slot = this.belt[slotIdx];
    if (!slot || slot.count <= 0) { Sfx.play("error"); return; }
    const c = DATA.CONSUMABLES[slot.id];
    if (c.healPct) this.healPool += this.stats.maxHp * c.healPct;
    else if (c.heal) this.healPool += c.heal;
    if (c.manaPct) this.manaPool += this.stats.maxMana * c.manaPct;
    else if (c.mana) this.manaPool += c.mana;
    if (c.rejuv) { this.hp = Math.min(this.stats.maxHp, this.hp + this.stats.maxHp * c.rejuv); this.mana = Math.min(this.stats.maxMana, this.mana + this.stats.maxMana * c.rejuv); }
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
    this.updateAnim(dt);
    /* the dead do not walk, drink, or whirl — they wait to rise */
    if (this.dead) { this.moving = false; return; }
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
        for (const m of Game.state.monsters) { if (m.dead) continue; const dd = U.dist2(this.x, this.y, m.x, m.y); if (dd < bd) { bd = dd; tgt = m; } }
        if (tgt) {
          const ss = this.effRank("stormshell");
          const dmg = ss > 0 ? 4 + 2 * ss : 0;     // Stormshell's additive lightning damage
          if (dmg > 0) {
            this.spellHit(tgt, dmg, "light", {});
            Game.lightningBolt(this.x, this.y, tgt.x, tgt.y);
            Sfx.play("zap");
          }
        }
      }
    } else this.thunderT = 0;
    /* regen + potion pools */
    this.mana = Math.min(st.maxMana, this.mana + st.manaRegen * dt);
    if (st.pManaPerBeast > 0) { const beasts = Game.state.minions.filter(m => !m.dead && m.beast).length; if (beasts) this.mana = Math.min(st.maxMana, this.mana + beasts * st.pManaPerBeast * dt); }
    this.hp = Math.min(st.maxHp, this.hp + (0.25 + (st.lifeRegen || 0)) * dt);
    if (this.healPool > 0) { const t = Math.min(this.healPool, 28 * dt); this.hp = Math.min(st.maxHp, this.hp + t); this.healPool -= t; }
    if (this.manaPool > 0) { const t = Math.min(this.manaPool, 22 * dt); this.mana = Math.min(st.maxMana, this.mana + t); this.manaPool -= t; }
    this.tileHazardTick(dt, Game.state.map, true);   // ice/lava/bog under the player

    /* ---- bespoke resource & channel upkeep ---- */
    if (this.tempo > 0 && Game.state.time > this.tempoUntil) this.tempo = 0;          // Tempo decays out of combat
    if (this.stance === "bulwark") {
      const previous=this.rootT;
      this.rootT = this.moving ? 0 : Math.min(3, this.rootT + dt);
      if(this.rootT!==previous)this.computeStats();
    }
    if (this.stance === "riposte") { this.mana -= (this.riposteData ? this.riposteData.drain : 3) * dt; if (this.mana <= 0) { this.mana = 0; this.clearStance(); } }
    if (this.siphon) {
      const SI = this.siphon;
      if (SI.target && SI.target.dead && !this.moving && Game.state.time <= SI.until) {   // re-acquire on kill
        let nt = null, bd = 81; for (const m of Game.state.monsters) { if (m.dead) continue; const dd = U.dist2(this.x, this.y, m.x, m.y); if (dd < bd) { bd = dd; nt = m; } } SI.target = nt;
      }
      if (!SI.target || SI.target.dead || this.moving || Game.state.time > SI.until || U.dist(this.x, this.y, SI.target.x, SI.target.y) > 9) this.siphon = null;
      else {
        SI.tickT -= dt; this.mana -= SI.manaPerSec * dt;
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
      for (const mon of Game.state.monsters) {
        if (mon.dead || C.hit.has(mon)) continue;
        const t = U.clamp((mon.x - this.x) * Math.cos(ang) + (mon.y - this.y) * Math.sin(ang), -0.6, C.width);
        const px = this.x + Math.cos(ang) * t, py = this.y + Math.sin(ang) * t;
        if (U.dist(px, py, mon.x, mon.y) <= C.width + mon.radius) {
          C.hit.add(mon); this.strike(mon, C.mult, { auto: true });
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
        for (const mon of Game.state.monsters) {
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
        for (const mon of Game.state.monsters) {
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
    if (cmd.type === "move") {
      this.moveAlong(dt, st.moveSpeed, Game.state.map, Game.state.monsters);
      if ((!this.path || !this.path.length) && !this.jumping) this.command = null;
      this.footsteps(dt);
    } else if (cmd.type === "attack") {
      const t = cmd.target;
      if (!t || t.dead) { this.command = null; return; }
      const skDef = this.resolveSkill(cmd.skill);
      const isSpell = skDef && ["projectile", "pierce", "chain", "fan", "blast", "spellnova", "curse", "corpse", "summon", "minionbuff", "wfan", "wpierce", "trap", "blink", "form", "beam", "meteor", "heal",
        "firewall", "pyreblast", "freezenova", "balllightning", "arcblink", "overloadnuke", "groundfield",
        "ward", "sacrifice", "siphon_beam", "doom", "taunt_curse", "plague_seed", "devour", "corpse_launch", "reap", "outbreak", "summon_golem",
        "charge_shot", "ricochet", "rain", "tripwire", "decoy", "afterimage", "weapon_coat", "deathmark", "detonate_dots",
        "totem", "roamaoe", "shout", "fear", "banner", "banner_ultimate", "warshout_debuff", "thrown", "grapple", "fireclaw"].includes(skDef.type);
      let reach;
      if (isSpell) {
        reach = skDef.type === "spellnova" ? Math.max(1.2, skDef.radius(Math.max(1, this.effRank(cmd.skill))) - 0.3) : 8.5;
      } else reach = this.stats.ranged ? 9 : st.range + t.radius + 0.25;
      reach=this.skillTargetRange(cmd.skill,t)??reach;
      const d = U.dist(this.x, this.y, t.x, t.y);
      const walk = (x, y) => MapGen.walkable(Game.state.map, x, y);
      const hasLos = !(this.stats.ranged || isSpell) || U.los(walk, this.x, this.y, t.x, t.y);
      if (d <= reach && hasLos) {
        this.path = null; this.moving = false;
        this.performSkill(cmd.skill, t, null);
        if (!cmd.hold) this.command = null;
      } else {
        Game.repath(this, t.x, t.y);
        this.moveAlong(dt, st.moveSpeed, Game.state.map, Game.state.monsters);
        this.footsteps(dt);
      }
    } else if (cmd.type === "skillPoint") {
      this.path = null;
      if (this.performSkill(cmd.skill, null, cmd.point)) this.command = null;
      else this.command = null;
    } else if (cmd.type === "pickup") {
      const g = cmd.gi;
      if (!Game.state.ground.includes(g)) { this.command = null; return; }
      if (U.dist(this.x, this.y, g.x, g.y) < 1.2) {
        Game.pickupGround(g);
        this.command = null; this.path = null; this.moving = false;
      } else {
        this.moveAlong(dt, st.moveSpeed, Game.state.map, Game.state.monsters);
        this.footsteps(dt);
        if (!this.path || !this.path.length) Game.repath(this, g.x, g.y);
      }
    } else if (cmd.type === "interact") {
      const o = cmd.obj;
      const d = U.dist(this.x, this.y, o.x, o.y);
      if (d < (cmd.run ? 1.8 : (o.interactionRange || 1.6))) {
        this.path = null; this.moving = false; this.command = null;
        if (cmd.run) cmd.run(); else Game.interact(o);
      } else {
        this.moveAlong(dt, st.moveSpeed, Game.state.map, Game.state.monsters);
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
    if (!dr || this.dead) return;
    const aim = dr.aim || { x: this.x + Math.cos(this.visAng) * 5, y: this.y + Math.sin(this.visAng) * 5 };
    const chargeK = U.clamp(dr.t / dr.maxDraw, 0.15, 1);
    this.face(aim.x, aim.y);
    this.startAction("attack", 1 / this.stats.attackRate);
    this.markActionRelease(0);
    Sfx.play("bow");
    Game.spawnProjectile({ x: this.x, y: this.y, tx: aim.x, ty: aim.y, speed: 16, kind: "arrow", fromPlayer: true,
      mult: dr.dmgMin + (dr.dmgMax - dr.dmgMin) * chargeK, pierce: true,
      maxPierce: chargeK < 0.4 ? 1 : 99, knockFirst: chargeK >= 0.8, quarryBonus: dr.quarryBonus || 0 });
  }
}

/* ------------------------------------------------------------------ */
/* A raised servant: follows its master, attacks nearby monsters,
   and soaks hits that would otherwise reach the Gravebinder. */
class Minion extends Entity {
  constructor(kindId, stats, owner) {
    super(owner.x + U.rf(-1.2, 1.2), owner.y + U.rf(-1.2, 1.2));
    if (!MapGen.walkable(Game.state.map, this.x, this.y)) { this.x = owner.x; this.y = owner.y; }
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
      this.projKind = "arrow"; this.isArcher = true;
      this.spriteOpts = { kind: "hound", pal: { fur: "#9aa6b8", trim: "#5a6478", eye: "#cfe0ff" }, scale: 0.7 };
    } else if (stats.sprite === "bear") {
      this.beast = true; this.name = stats.name || "Guardian Bear";
      this.radius = 0.5; this.taunt = stats.taunt || 5; this.slamRadius = 1.8; this.slamCd = 5; this.slamStun = stats.slamStun || 0.6;
      this.spriteOpts = { kind: "grizzly", pal: { fur: "#5a4632", claw: "#e0d8c4", eye: "#ffb040" }, scale: 1.15 };
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
    this.spriteOpts.summonArt = kindId;
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
    this.hp -= amount;
    this.flashT = 0.1;
    this.lastHitT = Game.state.time;
    /* bristled hides & Marrow Pact bone-thorns bite melee attackers back */
    const thorns = (this.thornsFlat || 0) + ((!this.beast && this.owner.stats && this.owner.stats.minionThorns) || 0);
    if (thorns > 0 && source && source.takeDamage && source !== this.owner && U.dist(this.x, this.y, source.x, source.y) < 1.8) source.takeDamage(thorns, this.owner);
    if (Math.random() < 0.3) this.startAction("hit", 0.16);
    if (this.hp <= 0) this.die();
  }
  tryBlock() { return false; }
  die({ silent = false } = {}) {
    if (this.dead) return;
    this.dead = true;
    this.deathT = 0.72;
    this.startAction("death", 0.68);
    if (!silent) Sfx.play(this.beast ? "die_flesh" : "die_bone");
    for (let i = 0; i < 7; i++) Game.addParticle(this.x, this.y, this.beast ? "#8a1414" : "#cfd8c0");
  }
  dmgRoll() {
    let d = U.rf(this.dmg[0], this.dmg[1]) * (1 + this.dmgPctOwner / 100);
    if (Game.state.time < this.buffUntil) d *= 1 + this.buffDmg / 100;
    return d;
  }
  update(dt, player, map) {
    this.updateAnim(dt);
    if (this.dead) { this.jumping = null; this.jumpZ = 0; this.deathT -= dt; return; }
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
    if (U.dist(this.x, this.y, player.x, player.y) > 16) {
      this.x = player.x + U.rf(-1, 1); this.y = player.y + U.rf(-1, 1);
      this.path = null;
      Game.addNova(this.x, this.y, 0.6, "#80ff90");
    }
    if (this.stunT > 0) { this.moving = false; return; }
    if (this.action && this.action.state === "attack") { this.moving = false; return; }
    const walk = (x, y) => MapGen.walkable(map, x, y);
    /* nearest living monster within leash range */
    let target = null, bd = 8 * 8;
    for (const mon of Game.state.monsters) {
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
        const sx = this.x, sy = this.y, sdmg = this.slamDmg ? U.rf(this.slamDmg[0], this.slamDmg[1]) * (1 + this.dmgPctOwner / 100) : this.dmgRoll() * 1.5;
        Game.afterDelay(0.4, () => { if (this.dead) return; Sfx.play("slam"); Game.addNova(sx, sy, this.slamRadius, "#c0a060"); Game.fx.shake = Math.max(Game.fx.shake, 3); for (const mon of Game.state.monsters) { if (mon.dead || U.dist(sx, sy, mon.x, mon.y) > this.slamRadius + mon.radius) continue; mon.takeDamage(sdmg, this.owner); Game.minionFloat(mon.x, mon.y, sdmg); mon.stunT = Math.max(mon.stunT, this.slamStun || 0.6); Game.knockMonster(mon, sx, sy, 1.0); } });
        this.moving = false; return;
      }
      const reach = this.isArcher ? this.range : this.range + target.radius + this.radius;
      const hasLos = U.los(walk, this.x, this.y, target.x, target.y);
      if (d <= reach && (!this.isArcher || hasLos)) {
        this.path = null; this.moving = false;
        this.face(target.x, target.y);
        if (this.attackCd <= 0) {
          this.attackCd = 1 / this.atkRate;
          const dur = Math.min(0.55, 0.9 / this.atkRate);
          this.startAction("attack", dur);
          const tref = target;
          Game.afterDelay(dur * 0.55, () => {
            if (this.dead || tref.dead) return;
            const pdot = this.totalPdot();
            if (this.isArcher) {
              Sfx.play(this.projKind === "venom" ? "firebolt" : "bow");
              Game.spawnProjectile({ x: this.x, y: this.y, tx: tref.x, ty: tref.y, speed: 9, kind: this.projKind, minionDmg: this.dmgRoll(), minionPdot: pdot });
            } else if (U.dist(this.x, this.y, tref.x, tref.y) <= reach + 0.4) {
              Sfx.play("hit");
              const dmg = this.dmgRoll(); tref.takeDamage(dmg, this.owner); Game.minionFloat(tref.x, tref.y, dmg);
              if (pdot > 0) { tref.poisonDot = { dps: pdot / 3, t: 3 }; Game.addParticle(tref.x, tref.y, "#90ff70"); }
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
        this.moveAlong(dt, this.speed, map, Game.state.minions);
        if (!this.path || !this.path.length) this.moving = false;
      }
    } else if (U.dist(this.x, this.y, player.x, player.y) > 2.6) {
      /* heel */
      this.repathT -= dt;
      if (this.repathT <= 0) { this.repathT = 0.35; Game.repath(this, player.x + U.rf(-1.2, 1.2), player.y + U.rf(-1.2, 1.2)); }
      this.moveAlong(dt, this.speed * 1.2, map, Game.state.minions);
      if (!this.path || !this.path.length) this.moving = false;
    } else this.moving = false;
  }
}
Minion.PAL_BASE = { bone: "#d8d2c4", trim: "#4a463a", eye: "#9fd0ff" };
Minion.PAL_POISON = { bone: "#a8c89a", trim: "#2a4a2a", eye: "#80ff60" };

/* ------------------------------------------------------------------ */
class Monster extends Entity {
  constructor(defId, x, y, opts) {
    super(x, y);
    opts = opts || {};
    const base = DATA.ENEMIES[defId];
    /* clone def so elite modifiers can mutate */
    const def = JSON.parse(JSON.stringify(base));
    this.defId = defId; this.def = def;
    /* difficulty tier scaling (applied before elite modifiers) */
    const diff = (Game.state && DATA.DIFFICULTIES[Game.state.difficulty]) || DATA.DIFFICULTIES[0];
    if (diff.id > 0) {
      def.lvl += diff.lvlAdd;
      def.hp = Math.floor(def.hp * diff.hpMul);
      def.dmgMult = (def.dmgMult || 1) * diff.dmgMul;
      def.xp = Math.floor(def.xp * diff.xpMul);
      def.resAll = Math.min(70, (def.resAll || 0) + diff.resAdd);
    }
    /* zone level band: every non-boss creature stays within ~3 levels of the area's level
       (e.g. the Fallen North spans 1–3, the Mines 2–5) so no wildly off-level monsters appear */
    if (!def.boss && Game.state && Game.state.map && Game.state.map.zone) {
      const add = (diff.id > 0 ? diff.lvlAdd : 0);
      const zl = Game.state.map.zone.lvl || def.lvl;
      def.lvl = U.clamp(def.lvl, Math.max(1, zl + add - 2), zl + add + 1);
    }
    this.lvl = def.lvl;
    this.name = def.name;
    this.elite = !!opts.elite;
    this.minion = !!opts.minion;
    this.isBoss = !!def.boss;
    this.type = DATA.enemyType(def);    // humanoid | undead | beast | demon
    this.scale = def.big || 1;
    this.radius = 0.34 * this.scale;
    this.mods = [];
    if (this.elite) {
      const mod = U.pick(DATA.ELITE_MODS);
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
      shield: !!def.shield, scale: this.scale, monsterArt: true };
    if (defId === "vethriss") {
      this.name="Seraneth, Wounded";
      this.spriteOpts.npcArt="resident_frosthaven_0";
      this.spriteOpts.kind="human";
      this.def.atkRate=.4;
    }
  }

  applySlow(dur, pct) {
    this.slowT = Math.max(this.slowT, dur);
    this.slowPct = Math.max(this.slowPct, pct);
  }
  /* nearest hostile: the player or one of their minions —
     and in the Cinderdeep, rival broods tear at each other too */
  pickTarget(player) {
    let best = player.dead ? null : player;
    let bd = player.dead ? Infinity : U.dist2(this.x, this.y, player.x, player.y);
    for (const mi of Game.state.minions) {
      if (mi.dead || mi.untargetable) continue;   // hawks can't be picked as a direct target
      const dd = U.dist2(this.x, this.y, mi.x, mi.y);
      if (dd < bd) { bd = dd; best = mi; }
    }
    if (Game.state.map.zone.infight && !this.def.projectile && !this.isBoss) {
      for (const o of Game.state.monsters) {
        if (o === this || o.dead || o.isBoss || (o.def.faction || o.def.family) === (this.def.faction || this.def.family)) continue;
        const dd = U.dist2(this.x, this.y, o.x, o.y);
        if (dd < bd && dd < (this.def.sight * this.def.sight)) { bd = dd; best = o; }
      }
    }
    /* taunting bulwarks (boar / bear / Bone Golem / decoy) drag aggro onto themselves */
    let taunter = null, td = 1e9;
    for (const mi of Game.state.minions) { if (mi.dead || !mi.taunt) continue; const dd = U.dist2(this.x, this.y, mi.x, mi.y); if (dd < mi.taunt * mi.taunt && dd < td) { td = dd; taunter = mi; } }
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
  takeDamage(amount, source, detail, elem) {
    if (this.dead) return;
    const ward = Game.bossWard?.(this);
    if (ward) {
      if (!this.wardMessageAt || Game.state.time>=this.wardMessageAt) { Game.msg("The ritual shields this foe. "+ward+".","#d8b880"); this.wardMessageAt=Game.state.time+3; }
      return;
    }
    let dmg = amount;
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
    dmg = Math.max(1, dmg);
    const nextForm=this.defId==="vethriss" && this.def.phases?.[this.phaseIdx||0];
    if (nextForm) dmg=Math.min(dmg,Math.max(0,this.hp-this.maxHp*nextForm.at));
    this.hp -= dmg;
    this.flashT = 0.1;
    this.aggro = true;
    if (!this.action || this.action.state !== "attack") {
      if (Math.random() < 0.4) this.startAction("hit", 0.18);
    }
    if (this.hp <= 0) this.die(source);
  }

  die(source) {
    if (this.dead) return;
    if (Game.bossWard?.(this)) { this.hp=Math.max(1,this.hp); return; }
    const nextForm=this.defId==="vethriss" && this.def.phases?.[this.phaseIdx||0];
    if (nextForm) { this.hp=Math.max(this.hp,this.maxHp*nextForm.at); return; }
    this.dead = true;
    this.startAction("death", 0.6);
    this.corpseT = 12;
    Sfx.play(this.def.sounds === "bone" ? "die_bone" : "die_flesh");
    /* affliction payoffs that fire when the host dies */
    if (this.killMark) Game.detonateMark(this);
    if (this.doom) Game.detonateDoom(this);
    if (this.plague) {
      const bx = this.x, by = this.y, br = this.plague.burstRange || 2.5;
      Game.addNova(bx, by, br, "#90ff70");
      for (const m of Game.state.monsters) { if (m.dead || m === this || m.plague) continue; if (U.dist(bx, by, m.x, m.y) <= br + m.radius) m.plague = { until: Game.state.time + 5, tick: this.plague.tick, tickT: 0, spreadCd: 1.5, spreadRange: this.plague.spreadRange, burstRange: br }; }
    }
    /* Rabies: a rabid corpse erupts into a contagious poison cloud */
    if (this.rabies && Game.state.time < this.rabies.until) {
      Game.addNova(this.x, this.y, this.rabies.cloudRad, "#90ff70");
      Game.state.fx.push({ type: "groundfield", fieldKind: "miasma", rabies: true, rdps: this.rabies.dps, rdur: 8, rcloud: this.rabies.cloudRad,
        owner: this.rabies.owner || Game.state.player, x: this.x, y: this.y, radius: this.rabies.cloudRad, ttl: 4, maxTtl: 4, tickEvery: 0.5 });
    }
    /* Brittle Bones: a frozen foe SHATTERS on death, splashing cold */
    if (this.frozen && Game.state.time < this.frozen && Game.state.player && Game.state.player.stats && Game.state.player.stats.shatterRank > 0) {
      const sr = Game.state.player.stats.shatterRank, pl0 = Game.state.player;
      Game.addNova(this.x, this.y, 2.2, "#9fd8ff"); Sfx.play("frost");
      for (const m of Game.state.monsters) { if (m.dead || m === this) continue; if (U.dist(this.x, this.y, m.x, m.y) < 2.2 + m.radius) pl0.spellHit(m, 6 + 3 * sr, "cold", {}); }
    }
    /* Heat Haze: a Scorched corpse erupts, scattering its stacks to the pack */
    if (this.scorch && Game.state.player && Game.state.player.stats && Game.state.player.stats.scorchSpread > 0) {
      const give = Math.ceil(this.scorch.stacks / 2), sdps = this.scorch.dps;
      Game.addNova(this.x, this.y, 2.0, "#ff7a20");
      for (const m of Game.state.monsters) { if (m.dead || m === this) continue; if (U.dist(this.x, this.y, m.x, m.y) < 2.0 + m.radius) { const sc = m.scorch || { stacks: 0 }; sc.stacks = Math.min(5, sc.stacks + give); sc.dps = sdps; sc.until = Game.state.time + 3; m.scorch = sc; } }
    }
    /* Grave Whispers: a curse leaps off the dead to the nearest un-cursed foe */
    const pl = Game.state.player;
    if (pl && pl.stats && pl.stats.curseSpread > 0 && (this.curseFrailty || this.curseWither)) {
      let best = null, bd = 25;
      for (const m of Game.state.monsters) { if (m.dead || m === this || m.curseFrailty || m.curseWither) continue; const dd = U.dist2(this.x, this.y, m.x, m.y); if (dd < bd) { bd = dd; best = m; } }
      if (best) { if (this.curseFrailty) best.curseFrailty = { until: Game.state.time + 6, pct: this.curseFrailty.pct }; if (this.curseWither) best.curseWither = { until: Game.state.time + 6, pct: this.curseWither.pct }; Game.addParticle(best.x, best.y, "#b070d0"); }
    }
    /* Soul Harvest: each cursed/marked kill grants a stacking spell charge */
    if (pl && pl.stats && pl.stats.soulCharge > 0 && (this.curseFrailty || this.curseWither || this.killMark || this.doom)) {
      const ex = pl.buffs.find(b => b.id === "soul_charge");
      if (ex) { ex.until = Game.state.time + 5; ex.stacks = Math.min(5, (ex.stacks || 1) + 1); ex.stats = { spellPct: pl.stats.soulCharge * ex.stacks }; }
      else pl.buffs.push({ id: "soul_charge", label: "Soul Charge", emoji: "💜", stacks: 1, stats: { spellPct: pl.stats.soulCharge }, until: Game.state.time + 5 });
      pl.computeStats();
    }
    /* bloated things go out loudly */
    if (this.def.deathBurst) {
      const b = this.def.deathBurst, bx = this.x, by = this.y;
      Game.afterDelay(0.35, () => {
        const col = b.elem === "fire" ? "#ff6050" : "#90ff70";
        Sfx.play("blast");
        Game.addNova(bx, by, b.radius, col);
        for (let i = 0; i < 12; i++) Game.addParticle(bx + U.rf(-0.5, 0.5), by + U.rf(-0.5, 0.5), col);
        const p = Game.state.player;
        if (!p.dead && U.dist(bx, by, p.x, p.y) <= b.radius + p.radius) p.takeDamage(b.dmg, this, b.elem || "poison");
        for (const mi of Game.state.minions) {
          if (!mi.dead && U.dist(bx, by, mi.x, mi.y) <= b.radius + mi.radius) mi.takeDamage(b.dmg, this);
        }
      });
    }
    /* split into lesser copies on death (gated to non-minions so it can't cascade) */
    if (this.def.splitOnDeath && !this.minion) {
      const sp = this.def.splitOnDeath, bx = this.x, by = this.y, base = this;
      Game.afterDelay(0.2, () => {
        for (let i = 0; i < sp.count; i++) {
          const a = Math.random() * Math.PI * 2, sx = bx + Math.cos(a) * 1.2, sy = by + Math.sin(a) * 1.2;
          if (!MapGen.walkable(Game.state.map, sx, sy)) continue;
          const m = new Monster(sp.id || base.defId, sx, sy, { minion: true });
          m.aggro = true; m.scale *= 0.62; m.spriteOpts.scale = m.scale; m.radius *= 0.62;
          m.maxHp = Math.max(1, Math.round(m.maxHp * 0.35)); m.hp = m.maxHp;
          Game.state.monsters.push(m); Game.addNova(sx, sy, 0.6, this.tint || "#c0a0a0");
        }
      });
    }
    Game.onMonsterDeath(this, source);
  }

  startTelegraphedSlam(player, map) {
    const s=this.def.slam, hero=player, world=Game.state;
    const warning={type:"slamwarning",owner:this,x:this.x,y:this.y,radius:s.radius,
      ttl:s.windup,maxTtl:s.windup,col:s.color||"#a8e5ff"};
    this.slamWarning=warning;this.slamCd=s.cd;this.path=null;this.moving=false;
    this.startAction("attack",s.windup+(s.recovery??1));
    Game.state.fx.push(warning);Sfx.play("shrine");
    Game.afterDelay(s.windup,()=>{
      if(this.slamWarning!==warning)return;
      this.slamWarning=null;warning.ttl=0;
      if(this.dead||hero.dead||Game.state!==world||Game.state.map!==map||!world.monsters.includes(this))return;
      if(this.openingId&&!["bossIntro","boss"].includes(world.flags.opening?.stage))return;
      Game.addNova(warning.x,warning.y,s.radius,warning.col);Sfx.play("slam");
      if(!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)Game.fx.shake=Math.max(Game.fx.shake,3);
      // Match the visible boundary exactly: the actor's ground anchor must be inside.
      const targets=[hero,...world.minions];
      for(const target of targets)if(!target.dead&&U.dist(warning.x,warning.y,target.x,target.y)<=warning.radius)
        target.takeDamage(U.rf(...this.def.dmg)*s.mult*(this.def.dmgMult||1)*2.2*this.witherMult(),this,s.elem);
    });
  }

  update(dt, player, map) {
    this.updateAnim(dt);
    if (this.dead) { this.corpseT -= dt; return; }
    if (Game.bossWard?.(this)) { this.path=null; this.moving=false; return; }
    /* beacons: stationary rune-stones that vomit out the dead until destroyed */
    if (this.beacon) {
      this.moving = false;
      this.children = this.children.filter(c => !c.dead);
      this.beaconCd -= dt;
      const bs = this.def.beaconSpawn;
      if (this.beaconCd <= 0 && this.children.length < bs.max && U.dist(this.x, this.y, player.x, player.y) < 22) {
        this.beaconCd = bs.cd;
        for (let i = 0; i < bs.count; i++) {
          const a = Math.random() * Math.PI * 2, r = 1.2 + Math.random() * 1.4;
          const sx = this.x + Math.cos(a) * r, sy = this.y + Math.sin(a) * r;
          if (!MapGen.walkable(map, sx, sy)) continue;
          const mm = new Monster(U.pick(bs.pool), sx, sy, {});
          mm.aggro = true; this.children.push(mm);
          Game.state.monsters.push(mm);
          Game.addNova(sx, sy, 0.7, "#9fe0ff");
          for (let k = 0; k < 5; k++) Game.addParticle(sx, sy, "#9fe0ff");
        }
        Sfx.play("shrine");
      }
      return;
    }
    this.tileHazardTick(dt, map, false);   // terrain hazards harm/slow monsters too (boss = slow only)
    if (this.dead) return;
    if (this.poisonDot) {
      this.poisonDot.t -= dt;
      this.hp -= this.poisonDot.dps * dt * (1 + ((player.stats && player.stats.poisonDotPct) || 0) / 100) * (1 - this.elemRes(this.poisonDot.fire ? "fire" : "poison") / 100);
      if (Math.random() < dt * 6) Game.addParticle(this.x, this.y, this.poisonDot.fire ? "#ff9040" : "#90ff70");
      if (this.hp <= 0) { this.die(player); return; }
      if (this.poisonDot.t <= 0) this.poisonDot = null;
    }
    /* Scorch: Cinder's stacking burn that Pyre consumes and Heat Haze spreads */
    if (this.scorch) {
      if (Game.state.time < this.scorch.until) { this.hp -= this.scorch.dps * dt; if (Math.random() < dt * 5) Game.addParticle(this.x, this.y, "#ff7a20"); if (this.hp <= 0) { this.die(player); return; } }
      else this.scorch = null;
    }
    /* Contagion: ticking plague that leaps to the healthy and bursts on death */
    if (this.plague) {
      const pg = this.plague;
      pg.tickT -= dt;
      if (pg.tickT <= 0) { pg.tickT = 1; this.hp -= pg.tick; if (Math.random() < 0.6) Game.addParticle(this.x, this.y, "#b8ff90"); }
      pg.spreadCd -= dt;
      if (pg.spreadCd <= 0) {
        pg.spreadCd = 1.5 * (1 - ((player.stats && player.stats.plagueSpreadPct) || 0) / 100);
        const rng = (pg.spreadRange || 3.5) * (1 + ((player.stats && player.stats.plagueSpreadPct) || 0) / 100);
        let best = null, bd = rng * rng;
        for (const m of Game.state.monsters) { if (m.dead || m === this || m.plague) continue; const dd = U.dist2(this.x, this.y, m.x, m.y); if (dd < bd) { bd = dd; best = m; } }
        if (best) best.plague = { until: Game.state.time + (pg.until - Game.state.time), tick: pg.tick, tickT: 0, spreadCd: 1.5, spreadRange: pg.spreadRange, burstRange: pg.burstRange };
      }
      if (this.hp <= 0) { this.die(player); return; }
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
        if (s.sprite) { this.spriteOpts.kind=s.sprite; delete this.spriteOpts.npcArt; this.spriteKey=this.defId+"|phase"+this.phaseIdx; }
        if (s.name) this.name=s.name;
        if (s.copyBosses) { this.def.copyBosses=true; this.copyBossCd=0; this.copyBossIndex=0; }
        if (s.scale) { this.scale *= s.scale; this.spriteOpts.scale = this.scale; this.radius *= s.scale; }
        if (ph.msg) Game.centerMsg(ph.msg[0], ph.msg[1] || "");
        Sfx.play("vox_boss");
        Game.addNova(this.x, this.y, 2.4, s.tint || "#c080ff");
        Game.fx.shake = Math.max(Game.fx.shake, 5);
      }
    }
    /* yanked in by a Vanguard harpoon: slide to the destination, then stunned + struck */
    if (this.pulled) {
      const P = this.pulled; P.t += dt; const k = Math.min(1, P.t / P.dur);
      this.x = U.lerp(P.fx, P.tx, k); this.y = U.lerp(P.fy, P.ty, k); this.moving = true;
      if (k >= 1) { this.pulled = null; this.stunT = Math.max(this.stunT, P.stun); if (P.owner && !P.owner.dead) P.owner.strike(this, P.mult, { auto: true }); }
      return;
    }
    /* a flat-out charge: barrel toward a point, trampling whatever it reaches */
    if (this.charging) {
      const C = this.charging; C.t += dt;
      const dx = C.tx - this.x, dy = C.ty - this.y, dd = Math.hypot(dx, dy) || 1;
      const step = (this.def.charge.speed || 9) * dt;
      if (dd > 0.3) { const nx = this.x + dx / dd * step, ny = this.y + dy / dd * step; if (MapGen.walkable(map, nx, this.y)) this.x = nx; if (MapGen.walkable(map, this.x, ny)) this.y = ny; }
      this.face(C.tx, C.ty); this.moving = true;
      if (!C.hit && !player.dead && U.dist(this.x, this.y, player.x, player.y) < player.radius + this.radius + 0.3) {
        if (!player.tryBlock(this)) player.takeDamage(U.rf(...this.def.dmg) * (this.def.charge.mult || 1.6) * (this.def.dmgMult || 1) * 2.2 * this.witherMult(), this);
        C.hit = true; Game.fx.shake = Math.max(Game.fx.shake, 4);
      }
      if (C.t >= C.dur || dd <= 0.3) this.charging = null;
      return;
    }
    /* an in-flight leap continues regardless of stun/attack state */
    if (this.leaping) {
      const L = this.leaping; L.t += dt;
      const k = Math.min(1, L.t / L.dur);
      this.x = U.lerp(L.fx, L.tx, k); this.y = U.lerp(L.fy, L.ty, k);
      this.jumpZ = Math.sin(k * Math.PI) * 32; this.moving = true;
      if (k >= 1) {
        this.jumpZ = 0; this.leaping = null;
        Sfx.play("slam"); Game.fx.shake = Math.max(Game.fx.shake, 5);
        Game.addNova(this.x, this.y, this.def.leap.radius, "#9fe0ff");
        const dmg = U.rf(...this.def.dmg) * this.def.leap.mult * (this.def.dmgMult || 1) * 2.2 * this.witherMult();
        if (!player.dead && U.dist(this.x, this.y, player.x, player.y) <= this.def.leap.radius + player.radius) player.takeDamage(dmg, this);
        for (const mi of Game.state.minions) if (!mi.dead && U.dist(this.x, this.y, mi.x, mi.y) <= this.def.leap.radius + mi.radius) mi.takeDamage(dmg, this);
      }
      return;
    }
    /* a whirlwind drives the spinner toward its prey, carving everything it passes */
    if (this.whirling) {
      const W = this.whirling; W.t += dt; W.tick -= dt;
      const tgt = this.pickTarget(player);
      if (tgt) {
        const dd = U.dist(this.x, this.y, tgt.x, tgt.y);
        if (dd > 0.4) { const step = this.def.speed * dt; const nx = this.x + (tgt.x - this.x) / dd * step, ny = this.y + (tgt.y - this.y) / dd * step;
          if (MapGen.walkable(map, nx, this.y)) this.x = nx; if (MapGen.walkable(map, this.x, ny)) this.y = ny; }
      }
      this.visAng += dt * 16; this.angT = this.visAng; this.dir = U.dirFrom(Math.cos(this.visAng), Math.sin(this.visAng)); this.moving = false;
      if (W.tick <= 0) {
        W.tick = this.def.whirl.tick || 0.3;
        const dmg = U.rf(...this.def.dmg) * this.def.whirl.mult * (this.def.dmgMult || 1) * 2.2 * this.witherMult();
        if (!player.dead && U.dist(this.x, this.y, player.x, player.y) <= this.def.whirl.radius + player.radius) player.takeDamage(dmg, this);
        for (const mi of Game.state.minions) if (!mi.dead && U.dist(this.x, this.y, mi.x, mi.y) <= this.def.whirl.radius + mi.radius) mi.takeDamage(dmg, this);
        Game.addNova(this.x, this.y, this.def.whirl.radius, "#ccd8e0"); Sfx.play("swing");
      }
      if (W.t >= W.dur) this.whirling = null;
      return;
    }
    if (this.frozen && Game.state.time < this.frozen) { this.moving = false; return; }   // hard freeze
    if (this.stunT > 0) { this.moving = false; return; }
    if (this.action && this.action.state === "attack") { this.moving = false; return; }
    /* Hex of Beckoning: drop everything and stampede to the marked point */
    if (this.beckon && Game.state.time < this.beckon.until) {
      this.aggro = true;
      if (U.dist(this.x, this.y, this.beckon.x, this.beckon.y) > 0.7) { this.path = [{ cx: this.beckon.x, cy: this.beckon.y }]; this.moveAlong(dt, this.def.speed, map, Game.state.monsters); }
      else this.moving = false;
      return;
    }
    /* Terrifying Bellow: routed, flee away from the hero */
    if (this.feared && Game.state.time < this.feared && !this.isBoss) {
      const dd = U.dist(this.x, this.y, player.x, player.y) || 1;
      const tx = this.x + (this.x - player.x) / dd * 2.5, ty = this.y + (this.y - player.y) / dd * 2.5;
      this.path = [{ cx: U.clamp(tx, 1, map.w - 2), cy: U.clamp(ty, 1, map.h - 2) }];
      this.moveAlong(dt, this.def.speed * 1.1, map, Game.state.monsters);
      return;
    }
    if (player.dead) { this.aggro = false; }

    const d = U.dist(this.x, this.y, player.x, player.y);
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
    if (!player.dead && !this.aggro && d < this.def.sight && U.los(walk, this.x, this.y, player.x, player.y)) {
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
      /* wake the pack */
      for (const o of Game.state.monsters) if (!o.dead && !o.aggro && U.dist(o.x, o.y, this.x, this.y) < 5) o.aggro = true;
    }
    /* treasure-beasts bolt away from the hero — catch them for the hoard;
       the "cause flee" affix sets a temporary fleeUntil timer */
    if ((this.flee || (this.fleeUntil && Game.state.time < this.fleeUntil)) && !player.dead) {
      const ax = this.x + (this.x - player.x), ay = this.y + (this.y - player.y);
      const dd = U.dist(this.x, this.y, player.x, player.y) || 1;
      const tx = this.x + (this.x - player.x) / dd * 2, ty = this.y + (this.y - player.y) / dd * 2;
      this.path = [{ cx: U.clamp(tx, 1, map.w - 2), cy: U.clamp(ty, 1, map.h - 2) }];
      this.moveAlong(dt, this.def.speed, map, Game.state.monsters);
      return;
    }
    if (!this.aggro) {
      /* idle wander */
      this.wanderT -= dt;
      if (this.wanderT <= 0) {
        this.wanderT = 2 + Math.random() * 4;
        const a = Math.random() * Math.PI * 2, r = 1 + Math.random() * 2;
        const tx = this.x + Math.cos(a) * r, ty = this.y + Math.sin(a) * r;
        if (walk(tx, ty)) this.path = [{ cx: tx, cy: ty, x: tx | 0, y: ty | 0 }];
      }
      this.moveAlong(dt, this.def.speed * 0.4, map, Game.state.monsters);
      if (!this.path || !this.path.length) this.moving = false;
      return;
    }

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
      if (this.summonCd <= 0 && d < 12) {
        this.summonCd = this.def.summons.cd;
        this.startAction("attack", 0.7);
        Sfx.play("vox_" + (this.def.sounds || "human"));
        Game.afterDelay(0.5, () => {
          if (this.dead) return;
          for (let i = 0; i < this.def.summons.count; i++) {
            const a = Math.random() * Math.PI * 2;
            const sx = this.x + Math.cos(a) * 1.5, sy = this.y + Math.sin(a) * 1.5;
            if (MapGen.walkable(map, sx, sy)) {
              /* a summon pool tears open portals to earlier battlefields */
              const sid = Array.isArray(this.def.summons.id) ? U.pick(this.def.summons.id) : this.def.summons.id;
              const mm = new Monster(sid, sx, sy, { minion: true });
              mm.aggro = true;
              Game.state.monsters.push(mm);
              Game.addNova(sx, sy, 0.8, "#8060c0");
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
        const allies = Game.state.monsters.filter(m => !m.dead && m !== this && !m.isBoss
          && U.dist(this.x, this.y, m.x, m.y) < (da.range || 10)
          && (m.minion || m.fromSummon || /dead|risen|cult|drowned|husk|skeleton|wretch|choir/.test(m.defId || "")));
        if (allies.length) {
          this.detonateCd = da.cd;
          this.face(player.x, player.y); this.startAction("attack", 0.6);
          Sfx.play("vox_" + (this.def.sounds || "human"));
          for (const al of allies) Game.addNova(al.x, al.y, 0.7, "#c89ae0");   // mark the doomed
          Game.afterDelay(0.5, () => {
            if (this.dead) return;
            const pl = Game.state.player;
            for (const al of allies) {
              if (al.dead) continue;
              const ex = al.x, ey = al.y;
              al.dead = true; al.hp = 0; al.corpseT = 0;                       // consumed — no loot/xp
              Game.addNova(ex, ey, da.radius, "#ff7a30");
              for (let i = 0; i < 12; i++) Game.addParticle(ex, ey, "#ff9040");
              const dmg = U.rf(...this.def.dmg) * (da.mult || 1.5) * (this.def.dmgMult || 1) * 2.2 * this.witherMult();
              if (!pl.dead && U.dist(ex, ey, pl.x, pl.y) <= da.radius + pl.radius) pl.takeDamage(dmg, this, "fire");
              for (const mi of Game.state.minions) if (!mi.dead && U.dist(ex, ey, mi.x, mi.y) <= da.radius + mi.radius) mi.takeDamage(dmg, this);
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
          Game.afterDelay(i * 0.18, () => { if (!this.dead) Game.state.fx.push({ type: "meteorfall", x: s.x, y: s.y, radius, col: "#ff7a30", ttl: warn, maxTtl: warn }); });
          Game.afterDelay(warn + i * 0.18, () => {
            if (this.dead) return;
            const pl = Game.state.player;
            Game.addNova(s.x, s.y, radius, "#ff7a30"); Game.fx.shake = Math.max(Game.fx.shake, 4);
            for (let k = 0; k < 16; k++) Game.addParticle(s.x + U.rf(-radius, radius) * 0.6, s.y + U.rf(-radius, radius) * 0.6, "#ff9040");
            const dmg = U.rf(...this.def.dmg) * (mr.mult || 1.4) * (this.def.dmgMult || 1) * 2.2 * this.witherMult();
            if (!pl.dead && U.dist(s.x, s.y, pl.x, pl.y) <= radius + pl.radius) pl.takeDamage(dmg, this, "fire");
            for (const mi of Game.state.minions) if (!mi.dead && U.dist(s.x, s.y, mi.x, mi.y) <= radius + mi.radius) mi.takeDamage(dmg, this);
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
      if (this.throwCd <= 0 && d < (tu.range || 13) && d > 2.5 && U.los(walk, this.x, this.y, player.x, player.y)) {
        this.throwCd = tu.cd || 6;
        this.face(player.x, player.y); this.startAction("attack", 0.7);
        Sfx.play("vox_" + (this.def.sounds || "brute"));
        const tx = player.x, ty = player.y, self = this;
        Game.afterDelay(0.45, () => {
          if (self.dead) return;
          Sfx.play("swing");
          const dist = U.dist(self.x, self.y, tx, ty);
          Game.spawnProjectile({ x: self.x, y: self.y, tx, ty, speed: 9, kind: "undeadbody", fromPlayer: false, mon: self,
            lob: { sx: self.x, sy: self.y, tx, ty, dur: U.clamp(dist / 9, 0.45, 1.4), pool: tu.pool || ["risen"], count: tu.count || 1, radius: tu.radius || 1.9, dmg: U.rf(...self.def.dmg) * (tu.mult || 1.3) * (self.def.dmgMult || 1) * 2.2 * self.witherMult() } });
        });
        return;
      }
    }
    /* healers keep their flock standing */
    if (this.def.heals) {
      this.healCd -= dt;
      if (this.healCd <= 0) {
        let patient = null, mostMissing = 8;
        for (const o of Game.state.monsters) {
          if (o.dead || o === this) continue;
          if (U.dist(this.x, this.y, o.x, o.y) > this.def.heals.radius) continue;
          const missing = o.maxHp - o.hp;
          if (missing > mostMissing) { mostMissing = missing; patient = o; }
        }
        if (patient) {
          this.healCd = this.def.heals.cd;
          this.startAction("attack", 0.6);
          Game.afterDelay(0.4, () => {
            if (this.dead || patient.dead) return;
            patient.hp = Math.min(patient.maxHp, patient.hp + this.def.heals.amount);
            Game.addNova(patient.x, patient.y, 0.8, "#90ff90");
            Game.addFloat(patient.x, patient.y, "+" + this.def.heals.amount, "#90ff90");
            Sfx.play("shrine");
          });
          return;
        }
      }
    }
    /* shades step through shadow to reach their prey */
    if (this.def.teleports) {
      this.teleCd -= dt;
      if (this.teleCd <= 0) {
        const prey = this.pickTarget(player);
        if (prey && U.dist(this.x, this.y, prey.x, prey.y) > this.def.teleports.minDist) {
          this.teleCd = this.def.teleports.cd;
          const a = Math.random() * Math.PI * 2;
          const nx = prey.x + Math.cos(a) * 1.6, ny = prey.y + Math.sin(a) * 1.6;
          if (MapGen.walkable(map, nx, ny)) {
            for (let i = 0; i < 6; i++) Game.addParticle(this.x, this.y, "#c080ff");
            this.x = nx; this.y = ny; this.path = null;
            for (let i = 0; i < 6; i++) Game.addParticle(this.x, this.y, "#c080ff");
            Sfx.play("portal");
          }
        }
      }
    }
    /* bolt volleys (the Unshepherd's benediction) */
    if (this.def.volley) {
      this.volleyCd -= dt;
      if (this.volleyCd <= 0 && d < 12) {
        this.volleyCd = this.def.volley.cd;
        const aim = this.pickTarget(player);
        if (aim) {
          this.face(aim.x, aim.y);
          this.startAction("attack", 0.7);
          const pk = this.def.projectile || { kind: "soulbolt", speed: 8 };
          Game.afterDelay(0.45, () => {
            if (this.dead) return;
            Sfx.play(pk.kind === "axe" ? "swing" : "firebolt");
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
    if (this.def.slam) {
      this.slamCd -= dt;
      if (this.slamCd <= 0 && d < this.def.slam.radius + 0.4) {
        if(this.def.slam.windup){this.startTelegraphedSlam(player,map);return;}
        this.slamCd = this.def.slam.cd;
        this.startAction("attack", 0.8);
        Sfx.play("slam");
        Game.afterDelay(0.55, () => {
          if (this.dead) return;
          Game.fx.shake = 8;
          Game.addNova(this.x, this.y, this.def.slam.radius, "#c05040");
          if (U.dist(this.x, this.y, player.x, player.y) <= this.def.slam.radius + player.radius && !player.dead) {
            player.takeDamage(U.rf(...this.def.dmg) * this.def.slam.mult * (this.def.dmgMult || 1) * 2.2 * this.witherMult(), this);
          }
          for (const mi of Game.state.minions) {
            if (!mi.dead && U.dist(this.x, this.y, mi.x, mi.y) <= this.def.slam.radius + mi.radius)
              mi.takeDamage(U.rf(...this.def.dmg) * this.def.slam.mult * (this.def.dmgMult || 1) * 2.2 * this.witherMult(), this);
          }
        });
        return;
      }
    }

    /* a goring charge across open ground */
    if (this.def.charge) {
      this.chargeCd = (this.chargeCd || 0) - dt;
      const ct = this.pickTarget(player);
      if (this.chargeCd <= 0 && ct) {
        const cdd = U.dist(this.x, this.y, ct.x, ct.y);
        if (cdd > 3 && cdd < this.def.charge.range && U.los(walk, this.x, this.y, ct.x, ct.y)) {
          this.chargeCd = this.def.charge.cd;
          /* aim a bit past the target so it ploughs through */
          const ux = (ct.x - this.x) / cdd, uy = (ct.y - this.y) / cdd;
          this.charging = { tx: ct.x + ux * 2, ty: ct.y + uy * 2, t: 0, dur: 0.6, hit: false };
          this.face(ct.x, ct.y); Sfx.play("vox_" + (this.def.sounds || "beast"));
          return;
        }
      }
    }
    /* Vandil drops from the sky with his polearm */
    if (this.def.leap) {
      this.leapCd -= dt;
      const lt = this.pickTarget(player);
      if (this.leapCd <= 0 && lt) {
        const dd = U.dist(this.x, this.y, lt.x, lt.y);
        if (dd > 2.6 && dd < this.def.leap.range && U.los(walk, this.x, this.y, lt.x, lt.y)) {
          this.leapCd = this.def.leap.cd;
          this.leaping = { fx: this.x, fy: this.y, tx: lt.x, ty: lt.y, t: 0, dur: 0.55 };
          this.face(lt.x, lt.y); Sfx.play("swing");
          return;
        }
      }
    }
    /* Sigrun opens into a moving whirlwind */
    if (this.def.whirl) {
      this.whirlCd -= dt;
      const wt = this.pickTarget(player);
      if (this.whirlCd <= 0 && wt && U.dist(this.x, this.y, wt.x, wt.y) < 7) {
        this.whirlCd = this.def.whirl.cd;
        this.whirling = { t: 0, dur: this.def.whirl.dur, tick: 0 };
        Sfx.play("swing");
        return;
      }
    }

    this.attackCd -= dt;
    /* fight whichever hostile is closest: the player or a raised minion */
    const tgt = this.pickTarget(player);
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
        Game.afterDelay(0.35, () => {
          if (this.dead) return;
          if (this.blindUntil && Game.state.time < this.blindUntil && Math.random() < 0.7) { Game.addFloat(this.x, this.y, "blind", "#9aa0a8"); return; }
          Sfx.play(this.def.projectile.kind === "firebolt" ? "firebolt" : "bow");
          Game.spawnProjectile({ x: this.x, y: this.y, tx: px, ty: py, speed: this.def.projectile.speed, kind: this.def.projectile.kind, elem: this.def.projectile.elem, fromPlayer: false, mon: this });
        });
        return;
      }
      if (dT < this.def.keepDist - 1 && hasLos) {
        /* back away */
        const ax = this.x + (this.x - tgt.x) / dT * 1.5, ay = this.y + (this.y - tgt.y) / dT * 1.5;
        if (walk(ax, ay)) { this.path = [{ cx: ax, cy: ay }]; this.moveAlong(dt, this.def.speed, map, Game.state.monsters); return; }
      }
      if (!hasLos || dT > this.def.range - 1) {
        this.chase(dt, tgt, map, walk);
      } else this.moving = false;
      return;
    }

    if (inRange && !tgt.dead) {
      this.path = null; this.moving = false;
      this.face(tgt.x, tgt.y);
      if (this.attackCd <= 0) {
        this.attackCd = 1 / this.def.atkRate;
        const dur = Math.min(0.6, 0.9 / this.def.atkRate);
        this.startAction("attack", dur);
        Game.afterDelay(dur * 0.55, () => {
          if (this.dead || tgt.dead) return;
          if (this.blindUntil && Game.state.time < this.blindUntil && Math.random() < 0.7) { Game.addFloat(this.x, this.y, "blind", "#9aa0a8"); return; }
          if (U.dist(this.x, this.y, tgt.x, tgt.y) > this.def.range + tgt.radius + this.radius + 0.4) return;
          /* monster hit roll */
          const tlvl = tgt.lvl || player.lvl;
          const ch = U.clamp(0.62 + (this.lvl - tlvl) * 0.03, 0.35, 0.92);
          if (Math.random() > ch) { Game.addFloat(tgt.x, tgt.y, "miss", "#9a9a9a"); return; }
          if (tgt.stats && tgt.stats.dodge > 0 && Math.random() * 100 < tgt.stats.dodge) { Game.addFloat(tgt.x, tgt.y, "evade", "#b0a0d0"); Game.dustPuff(tgt.x, tgt.y); return; }
          if (tgt.tryBlock && tgt.tryBlock(this)) { Sfx.play("block"); Game.addFloat(tgt.x, tgt.y, "block", "#80a0ff"); return; }
          let dmg = U.rf(...this.def.dmg) * (this.def.dmgMult || 1) * 2.2 * this.witherMult();
          tgt.takeDamage(dmg, this);
          if (tgt.stats && tgt.stats.thorns > 0 && !this.dead) this.takeDamage(tgt.stats.thorns, tgt);
          if (this.def.elemDmg) {
            for (const [kind, v] of Object.entries(this.def.elemDmg)) tgt.takeDamage(v * 2, this, kind);
            if (this.def.chillOnHit) {
              const ccR = tgt.stats ? tgt.stats.ccReduce : 0;
              tgt.slowT = Math.max(tgt.slowT, this.def.chillOnHit * (1 - ccR / 100));
              tgt.slowPct = 30;
            }
          }
          if (this.def.poison) tgt.takeDamage(this.def.poison, this, "poison");
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
    this.moveAlong(dt, this.def.speed, map, Game.state.monsters);
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
    this.x = o.x; this.y = o.y;
    this.lift = o.lift ?? 14;       // fixed world height captured at weapon release
    const d = Math.max(0.001, U.dist(o.x, o.y, o.tx, o.ty));
    this.vx = (o.tx - o.x) / d * o.speed;
    this.vy = (o.ty - o.y) / d * o.speed;
    this.speed = o.speed;
    this.kind = o.kind; this.elem = o.elem || null; this.fromPlayer = o.fromPlayer;
    this.mon = o.mon; this.mult = o.mult || 1;
    this.spell = o.spell || null;       // {dmg, crit, elem, burn, chill, pdot, drain, pierce, chains, scorch, knockback, sprayRadius}
    this.minionDmg = o.minionDmg;       // bolts fired by raised skeletons
    this.minionPdot = o.minionPdot || 0;
    this.pierce = !!o.pierce;           // weapon-based piercing arrows
    this.lob = o.lob || null;               // {sx,sy,tx,ty,dur,pool,count,radius,dmg}  (thrown undead body)
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
            let mult = this.mult;
            if (this.quarryBonus && m.quarry && Game.state.time < m.quarry.until) { mult *= 1 + this.quarryBonus / 100 * m.quarry.stacks; m.quarry = null; }
            player.strike(m, mult, { auto: !!this.boomerang });
            if (this.quarryOnHit) m.quarry = { until: Game.state.time + 6, stacks: Math.min(5, ((m.quarry && m.quarry.stacks) || 0) + this.quarryStacks) };
            if (player.coat && player.buffs.some(b => b.id === "serrated")) m.poisonDot = { dps: Math.max((m.poisonDot && m.poisonDot.dps) || 0, player.coat.pdot / 3), t: player.coat.woundDuration??4 };
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
            Sfx.play("hit");
            m.takeDamage(this.minionDmg, null); Game.minionFloat(m.x, m.y, this.minionDmg);
            if (this.minionPdot > 0) { m.poisonDot = { dps: this.minionPdot / 3, t: 3 }; Game.addParticle(m.x, m.y, "#90ff70"); }
            Game.bloodBurst(m.x, m.y, 3);
            this.dead = true; return;
          }
        }
      } else {
        const mon = this.mon;
        const hitDmg = mon ? U.rf(...mon.def.dmg) * (mon.def.dmgMult || 1) * 2.2 * mon.witherMult() : 0;
        const elem = mon && mon.def.projectile && mon.def.projectile.elem;
        if (!player.dead && U.dist(this.x, this.y, player.x, player.y) < player.radius + 0.25) {
          if (player.stats.dodge > 0 && Math.random() * 100 < player.stats.dodge) { Game.addFloat(player.x, player.y, "evade", "#b0a0d0"); }
          else if (player.tryBlock(this)) { Sfx.play("block"); Game.addFloat(player.x, player.y, "block", "#80a0ff"); }
          else if (mon) {
            player.takeDamage(hitDmg, mon, elem || "phys");
            if (elem === "fire") Sfx.play("fireHit");
          }
          this.dead = true; return;
        }
        for (const mi of Game.state.minions) {
          if (mi.dead) continue;
          if (U.dist(this.x, this.y, mi.x, mi.y) < mi.radius + 0.25) {
            if (mon) mi.takeDamage(hitDmg, mon);
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
