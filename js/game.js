/* =========================================================================
   EMBERGRAVE — game.js
   Orchestrator: game state, main loop, isometric renderer, dynamic lighting,
   input handling, picking, portals/shrines/exits, quests, drops, save/load.
   ========================================================================= */
"use strict";

const Game = (() => {
  const playerAssets = Player3D.assets;
  /* ---------------- module state ---------------- */
  let canvas, ctx, lightCv, lightCtx, mmSmall, mmCtx;
  let running = false, lastT = 0;
  const fx = { shake: 0, hitPause: 0 };
  const EH = 14;   // screen px per terrain-elevation step
  const ACTOR_BODY_SCALE = 1.1;
  function elevLift(x, y, surfaceId) { const m = state.map; return m ? TerrainNavigation.height(m,x,y,surfaceId)*EH : 0; }
  // Existing zones retain their historical FX anchors while the new surface
  // model seats all world overlays on the same geometry as the actors.
  function surfaceLift(x,y,surfaceId) { return state.map.surfaceVersion ? elevLift(x,y,surfaceId) : 0; }
  /* per-biome weather, keyed by zone theme (camps inherit their act's theme).
     ONLY outdoor themes — indoor genCrypt dungeons (mine/temple/drowned/tombs/palace/
     crypt/vigil/chapel/monastery/cathedral/bastion/throne) get no weather. */
  const WEATHER = {
    snowwild: "snow",
    marsh: "rain", fields: "rain",
    desert: "sand",
    hellwild: "ash",
    forest: "fog",
  };
  /* outdoor wild themes whose walls render as thematic massifs (mountains/rock/
     boulders/spires/hills/thickets) instead of masonry. Gated by m.outdoor so
     hub camps that reuse a wild theme keep their man-made palisade walls. */
  const MASSIF_THEMES = new Set(["snowwild", "marsh", "desert", "hellwild", "fields", "forest"]);
  function drawWeather(kind, W, H) {
    const t = state.time;
    if (kind === "snow") {
      ctx.fillStyle = "#eef6ff";
      for (let i = 0; i < 90; i++) {
        const sx = (((i * 97 + Math.sin(t * 0.6 + i) * 26) % (W + 40)) + W + 40) % (W + 40) - 20;
        const sy = ((i * 53 + t * (34 + (i % 3) * 22)) % (H + 40)) - 20;
        ctx.globalAlpha = 0.45 + (i % 3) * 0.18;
        ctx.beginPath(); ctx.arc(sx, sy, 1 + (i % 3) * 0.7, 0, 6.283); ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else if (kind === "rain") {
      ctx.strokeStyle = "rgba(160,180,210,.28)"; ctx.lineWidth = 1; ctx.beginPath();
      const tt = t * 900;
      for (let i = 0; i < 80; i++) { const rx = ((i * 379 + tt) % (W + 100)) - 50, ry = ((i * 211 + tt * 1.4) % (H + 80)) - 40; ctx.moveTo(rx, ry); ctx.lineTo(rx - 4, ry + 13); }
      ctx.stroke();
    } else if (kind === "sand") {
      ctx.strokeStyle = "rgba(206,184,128,.16)"; ctx.lineWidth = 1.5; ctx.beginPath();
      const tt = t * 620;
      for (let i = 0; i < 60; i++) { const sx = ((i * 167 + tt) % (W + 200)) - 100, sy = 60 + (i * 89) % (H - 80); ctx.moveTo(sx, sy); ctx.lineTo(sx + 46, sy - 5); }
      ctx.stroke();
    } else if (kind === "ash") {
      for (let i = 0; i < 70; i++) {
        const ex = (((i * 131 + Math.sin(t * 0.7 + i) * 20) % (W + 40)) + W + 40) % (W + 40) - 20;
        const ey = (H + 40 - ((i * 67 + t * (26 + (i % 4) * 10)) % (H + 60))) - 20;   // embers drift upward
        ctx.globalAlpha = 0.35 + (i % 3) * 0.12;
        ctx.fillStyle = (i % 4 === 0) ? "#ff8a3c" : "#5a5048";
        ctx.fillRect(ex, ey, 2, 2);
      }
      ctx.globalAlpha = 1;
    } else if (kind === "fog") {
      ctx.globalAlpha = 0.06; ctx.fillStyle = "#aeb8c6";
      for (let i = 0; i < 4; i++) { const fx = ((i * 380 + t * 14) % (W + 600)) - 300; ctx.beginPath(); ctx.ellipse(fx, H * (0.38 + i * 0.16), 360, 90, 0, 0, 6.283); ctx.fill(); }
      ctx.globalAlpha = 0.4; ctx.fillStyle = "#c8d2de";
      for (let i = 0; i < 28; i++) { const mx = ((i * 113 + t * 18) % (W + 40)) - 20, my = ((i * 71 + t * 8) % (H + 40)) - 20; ctx.fillRect(mx, my, 1.5, 1.5); }
      ctx.globalAlpha = 1;
    }
  }
  /* Final screen-space grade: it binds the sprite tiles and actors into the
     same scene without hiding important combat/UI information. Labels and beacons
     are deliberately drawn after this pass so readability stays crisp. */
  function renderScreenGrade(theme, W, H) {
    const wash = theme === "desert" ? "rgba(88,52,24,.055)" :
      (theme === "hellwild" || theme === "throne" || theme === "bastion") ? "rgba(90,18,8,.06)" :
      (theme === "marsh" || theme === "forest") ? "rgba(10,42,30,.05)" : "rgba(18,34,55,.05)";
    ctx.save();
    ctx.fillStyle = wash; ctx.fillRect(0, 0, W, H);
    const vignette = ctx.createRadialGradient(W * .5, H * .44, Math.min(W,H) * .2, W * .5, H * .47, Math.max(W,H) * .72);
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(.62, "rgba(0,0,0,.045)");
    vignette.addColorStop(1, "rgba(0,0,0,.38)");
    ctx.fillStyle = vignette; ctx.fillRect(0, 0, W, H);
    const topShade = ctx.createLinearGradient(0, 0, 0, H);
    topShade.addColorStop(0, "rgba(0,0,0,.18)"); topShade.addColorStop(.13, "rgba(0,0,0,0)");
    topShade.addColorStop(.72, "rgba(0,0,0,0)"); topShade.addColorStop(1, "rgba(0,0,0,.22)");
    ctx.fillStyle = topShade; ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  const options = { alwaysLabels: false, lootFilter: 0, dmgNumbers: true, screenShake: true, minionBars: "hit", leftClickMove: false, minionDamage: false, monResist: false };
  /* options persist across sessions, separately from saves */
  try {
    const o = JSON.parse(localStorage.getItem("embergrave_options") || "{}");
    if (o.vol) for (const k of ["master", "sfx", "music"]) if (o.vol[k] !== undefined) Sfx.setVol(k, o.vol[k]);
    delete o.vol;
    Object.assign(options, o);
  } catch (e) {}
  function saveOptions() {
    try { localStorage.setItem("embergrave_options", JSON.stringify(Object.assign({}, options, { vol: Sfx.vol }))); } catch (e) {}
  }
  const debugFlags = { god: false };
  let state = null;
  let mouse = { x: 0, y: 0, l: false, r: false, shift: false, alt: false };
  let heldTarget = null;
  let groundHold = null;     // one ground-started LMB gesture; never saved
  const touch = { x: 0, y: 0, side: null, nextCast: 0, castOnce: false };
  let hoverMon = null, hoverLabel = null, hoverProp = null, hoverNpc = null, hoverPortal = null, hoverExit = null;
  let labelRects = [];        // ground-loot label hitboxes (rebuilt per frame)
  let lootFilterVersion = 0;  // last LootFilter version applied to ground items (re-eval on change)
  let delayed = [];           // {t, fn} on game clock
  let exitGrace = 0;
  let barrierMsgT = 0;
  let mapOverlay = false;
  let mmRebuildT = 0;
  let floats = [], particles = [], novas = [], bolts = [];
  let saveSlotKey = null;
  let playerLoadoutSeq = 0;
  let mapTransitionSeq = 0;
  let runtimeFailure = false;

  function fatalRuntime(err, stage) {
    if (runtimeFailure) return;
    runtimeFailure = true;
    running = false;
    Sfx.stopSkills?.();
    console.error(err);
    if (window.AppBootstrap && typeof window.AppBootstrap.fatal === "function") {
      window.AppBootstrap.fatal(err, stage);
    } else if (typeof SpriteAssets !== "undefined" && SpriteAssets.fatal) {
      SpriteAssets.fatal(err);
    }
  }

  function playerLoadoutSignature(p) {
    const itemKey = it => it ? [it.baseId || "", it.uniqueId || "", it.setItemId || "",
      it.playerVisualFamily || "", it.materialTier == null ? "" : it.materialTier,
      it.playerSpriteOverride || "", it.rarity || ""].join("/") : "-";
    return [p.classId,...["main","off","head","chest","gloves","boots","belt","ring1","ring2","amulet"].map(slot=>itemKey(p.equip[slot]))].join("|");
  }

  const SAVE_PREFIX = "embergrave_save_";
  const CAMPAIGN_BACKUP_PREFIX = "embergrave_campaign_backup_";

  async function requireSpriteBundle(bundleId, label, { recoverable = false } = {}) {
    const loading = document.createElement("div");
    loading.id = "spriteLoading";
    loading.style.cssText = "position:fixed;inset:0;z-index:99999;display:grid;place-items:center;background:#120d0b;color:#d8c79a;font:15px monospace;letter-spacing:.08em";
    loading.textContent = `${label} 0%`;
    document.body.appendChild(loading);
    try {
      await SpriteAssets.loadBundle(bundleId, (done, total) => {
        loading.textContent = `${label} ${Math.round(done / total * 100)}%`;
      });
      loading.remove();
      return true;
    } catch (err) {
      loading.remove();
      if (recoverable) console.warn("Could not load town sprites:", err);
      else SpriteAssets.fatal(err);
      return false;
    }
  }

  /* Equipment changes prepare their complete 3D loadout before
     UI code mutates the live equipment object.  A sequence token makes rapid
     clicks deterministic: only the newest prepared change may be committed. */
  async function preparePlayerEquipment(nextEquip) {
    if (!state || !state.player) throw new Error("Cannot prepare player equipment without an active hero");
    const p = state.player, seq = ++playerLoadoutSeq;
    /* Prepare the humanoid loadout even while transformed, so ending a form
       restores the current weapon and armor models. */
    const visual = playerAssets.resolvePlayerVisual(p.classId, nextEquip || {}, []);
    try { await playerAssets.loadPlayerLoadout(visual); }
    catch (err) {
      playerAssets.discardPlayerLoadout(visual);
      if (seq !== playerLoadoutSeq || !state || state.player !== p) return null;
      throw err;
    }
    if (seq !== playerLoadoutSeq || !state || state.player !== p) {
      playerAssets.discardPlayerLoadout(visual);
      return null;
    }
    return { seq, visual };
  }

  function commitPlayerEquipment(prepared) {
    if (!prepared || prepared.seq !== playerLoadoutSeq || !state || !state.player) {
      if (prepared && prepared.visual) playerAssets.discardPlayerLoadout(prepared.visual);
      return false;
    }
    playerAssets.activatePlayerLoadout(prepared.visual);
    state.player._playerVisual = prepared.visual;
    state.player._playerVisualSignature = playerLoadoutSignature(state.player);
    return true;
  }

  function discardPlayerEquipment(prepared) {
    if (prepared && prepared.visual) playerAssets.discardPlayerLoadout(prepared.visual);
    return false;
  }

  /* =====================================================================
     BOOT
     ===================================================================== */
  async function init() {
    try {
      LootFilter.init();                         // load saved loot-filter config
      canvas = document.getElementById("view");
      ctx = canvas.getContext("2d");
      mmSmall = document.getElementById("minimap");
      mmCtx = mmSmall.getContext("2d");
      window.addEventListener("resize", resize);
      window.addEventListener("phoneviewportchange", resize);
      resize();
      await Player3D.init();
      if (!await requireSpriteBundle("core", "LOADING CORE SPRITES")) return;
      UI.init();
      bindInput();
      if (typeof MobileControls !== "undefined") MobileControls.init(canvas);
      if (typeof MobileWorkspace !== "undefined") MobileWorkspace.init();
      UI.showTitle();
      requestAnimationFrame(tick);
    } catch (err) {
      fatalRuntime(err, "Game startup");
    }
  }
  function resize() {
    if(!canvas)return;
    const viewport=typeof MobileShell!=='undefined'&&MobileShell.enabled?MobileShell.viewport:{width:innerWidth,height:innerHeight};
    if(canvas.width===viewport.width&&canvas.height===viewport.height&&lightCv)return;
    canvas.width = viewport.width; canvas.height = viewport.height;
    lightCv = document.createElement("canvas");
    lightCv.width = viewport.width; lightCv.height = viewport.height;
    lightCtx = lightCv.getContext("2d");
  }

  /* =====================================================================
     GAME LIFECYCLE
     ===================================================================== */
  function freshCampaign() {
    return {
      /* You begin already tasked; later tiers start in town without the tutorial. */
      quests: { q7: { state: "active", count: 0 }, q1: { state: "offered" } },
      shrines: ["frosthaven", "town"], home: "frosthaven", flags: {},
    };
  }
  function campaignSnapshot(s = state) {
    return JSON.parse(JSON.stringify({quests:s.quests, shrines:s.shrines, home:s.home, flags:s.flags}));
  }
  function restoreCampaign(s, campaign) {
    const progress = { ...freshCampaign(), ...JSON.parse(JSON.stringify(campaign)) };
    progress.home ||= progress.shrines.includes("frosthaven") ? "frosthaven" :
      (progress.shrines.find(id => DATA.ZONES[id]?.kind === "camp" || id === "town") || "frosthaven");
    if (!DATA.ZONES[progress.home]) progress.home = "frosthaven";
    Object.assign(s, progress);
  }
  function freshState(player, seed) {
    return {
      player, players: [player], seed,
      time: 0,
      map: null, mapsCache: {}, monstersByMap: {}, groundByMap: {},
      monsters: [], npcs: [], ground: [], projectiles: [], minions: [], traps: [],
      fx: [],   // transient world effects: fields, walls, banners, totems, weather (never saved)
      ...freshCampaign(),
      campaignsByDifficulty: {}, characterFlags: {}, difficultyTransition: null,
      difficulty: 0, unlockedDiff: 0,
      vendorStock: {},
      portal: null,
      actGate: null,
      bossBar: null,
      zoneMusic: null, musicTheme: null,
    };
  }

  /* The opening owns staging, not combat rules. Its small saved ledger is also
     the source of truth when a hero resumes before reaching the town. */
  const opening = (() => {
    const zone = "frosthaven_approach", travelers = ["opening_mara","opening_iven"];
    const fights = ["guard","rescue","combat","bossIntro","boss"];
    const lines = {
      arrival:["Bryn","You’re breathing. Good. Stay with me. The wall is still standing."],
      awakening:["Bryn","We buried him yesterday. Captain’s orders. Look at the shard…"],
      guard:["Bryn","That’s no longer one of ours. Keep him back!"],
      road:["Bryn","Someone’s calling from the old caravan. They’re still alive."],
      rescue:["Mara","Here! Behind the wagon! Don’t let them through!"],
      rescueTalk:["Mara","Is it over? Please—my brother can barely stand."],
      escort:["Bryn","Keep behind us. We’re getting both of you to the hearth."],
      combat:["Bryn","Risen at the gate. I’ll keep the travelers under cover."],
      provision:["Bryn","The watch left draughts by the fire. Take them. There’s something inside the courtyard."],
      bossIntro:["Bryn","Captain? We brought them home. Open the gate!"],
      boss:["The Rimebound Captain","None shall pass. Not while I keep the watch."],
      gate:["Bryn","His watch is over. Come on—all of us. Seraneth is by the hearth."],
      hearth:["Seraneth","Come closer. Let me see what the light left behind."]
    };
    let runtime = null, skipping = null;
    const record = () => state?.flags.opening;
    const active = () => !!record() && record().stage !== "done";
    const onRoad = () => active() && state.map?.id === zone;
    const captain = () => state.monsters.find(m=>m.openingId==="captain" && !m.dead);
    const allDead = ids => ids.every(id=>record().defeated.includes(id));
    function migrate() {
      const o=record(); if(!o)return;
      if(o.v!==2) {
        o.rescueBypassed=["combat","gate","hearth","done"].includes(o.stage);
        o.legacyGate=["gate","hearth","done"].includes(o.stage);
        o.v=2;
      }
      o.defeated ||= [];o.hints ||= {};o.barks ||= {};o.waves ||= [];
    }
    function clearWarnings() {
      if(state)state.fx=state.fx.filter(f=>!f.owner?.openingId);
      if(runtime)for(const m of state.monsters)if(m.openingId)m.slamWarning=null;
    }
    function reset() { clearWarnings();runtime=null;skipping=null;UI.hideOpening?.(); }
    function begin() {
      reset();state.flags.opening={v:2,stage:"arrival",defeated:[],hints:{},barks:{},waves:[],rescued:false,supply:false};
    }
    function caption(speaker,text,seconds=7) {
      UI.openingCaption(speaker,text,seconds);if(runtime)runtime.caption=seconds;
    }
    function stage(next) {
      record().stage=next;if(runtime)runtime.stageTime=0;
      if(lines[next])caption(...lines[next]);
      if(state.map?.id===zone)state.map.exits[0].label=next==="gate"?"Enter Frosthaven":"Frosthaven — finish the last watch";
      saveGame();
    }
    function complete() {
      if(!active())return;
      clearWarnings();record().stage="done";delete record().loot;delete record().encounter;
      state.flags.seenIntro=true;
      if(state.portal?.mapId===zone)state.portal=null;
      runtime=null;UI.hideOpening();
    }
    function checkpoint() {
      migrate();const s=record()?.stage;
      return s==="hearth"?["frosthaven","from_wild"]:[zone,({awakening:"awakening",guard:"awakening",road:"awakening",
        rescue:"rescue",rescueTalk:"escort",escort:"escort",combat:"combat",provision:"provision",bossIntro:"boss",boss:"boss",gate:"gate"})[s]||"default"];
    }
    function phaseBoss(m,phase) {
      m.phaseIdx=phase;
      const base=DATA.ENEMIES.frost_watch_captain;
      m.def.speed=base.speed*(phase?1.15:1);
      m.def.slam.cd=phase?4.5:base.slam.cd;
      if(phase)m.tint="#a6ddff";
    }
    function spawn(id,pos,def="frost_risen") {
      if(record().defeated.includes(id))return null;
      let m=state.monsters.find(m=>m.openingId===id);if(m)return m;
      m=new Monster(def,pos.x,pos.y);m.openingId=id;m.aggro=true;
      const saved=record().encounter?.[id];
      if(saved) {
        m.hp=U.clamp(saved.hp,1,m.maxHp);
        if(MapGen.walkable(state.map,saved.x,saved.y)){m.x=saved.x;m.y=saved.y;}
      }
      if(id==="captain") {
        phaseBoss(m,record().bossPhase||0);m.attackCd=1.8;m.slamCd=3.5;
      }
      state.monsters.push(m);return m;
    }
    function townTravelers() {
      if(state.map?.id!=="frosthaven" || !record()?.rescued)return;
      const sera=state.npcs.find(n=>n.id==="sera");if(!sera)return;
      travelers.forEach((id,i)=>{
        if(state.npcs.some(n=>n.id===id))return;
        const p=nearWalkable(state.map,sera.x+3+i*2,sera.y+2);
        state.npcs.push(new Npc(id,p.x,p.y,{npcArt:"resident_frosthaven_"+(4+i)}));
      });
    }
    function attach() {
      migrate();runtime={hero:state.player,map:state.map,rise:0,pulse:0,stageTime:0,caption:0,nav:0,trail:[]};
      UI.showOpening(record().stage==="arrival");
      if(state.map.id==="frosthaven"){caption(...lines.hearth);return;}
      const sc=state.map.opening,o=record(),s=o.stage;
      if(o.rescueBypassed)state.npcs=state.npcs.filter(n=>!travelers.includes(n.id));
      for(const n of state.npcs){n.scriptedMovement=true;n.openingTraveler=travelers.includes(n.id);}
      if(["arrival","awakening"].includes(s)) {
        const g=new Monster("frost_risen",sc.guard.x,sc.guard.y);
        g.dead=true;g.corpseT=999;g.action={state:"death",dur:.6,t:.6};g.face(sc.cover.x,sc.cover.y);g.visAng=g.angT;runtime.guard=g;
      }
      if(s==="guard")spawn("guard",sc.guard);
      if(s==="rescue")sc.rescueEnemies.forEach((p,i)=>{if(i<2||allDead(["rescue0","rescue1"]))spawn("rescue"+i,p);});
      if(s==="combat")sc.pair.forEach((p,i)=>spawn("gate"+i,p));
      if(["bossIntro","boss"].includes(s)) {
        spawn("captain",sc.captain,"frost_watch_captain");
        o.waves.forEach(w=>sc.reinforcements.forEach((p,i)=>spawn("retinue"+w+"_"+i,p)));
      }
      const b=state.npcs.find(n=>n.id==="bryn");
      const held=["combat","provision","bossIntro","boss"].includes(s);
      if(b&&s!=="arrival")Object.assign(b,s==="gate"?sc.brynGate:held?sc.shelter[0]:["rescue","rescueTalk","escort"].includes(s)?sc.rescueCover:sc.cover);
      state.npcs.filter(n=>n.openingTraveler).forEach((n,i)=>{
        if(held)Object.assign(n,sc.shelter[i+1]);
        else if(s==="gate")Object.assign(n,{x:sc.brynGate.x-i-1,y:sc.brynGate.y+1});
      });
      const cache=state.map.props.find(p=>p.interact==="opening_supply");
      if(cache){cache.opened=!!o.supply;cache.label=o.supply?"Watch supplies — empty":"Watch supplies — two healing draughts";}
      state.map.exits[0].label=s==="gate"?"Enter Frosthaven":"Frosthaven — finish the last watch";
      if(lines[s])caption(...lines[s]);
    }
    function arrived(mode) {
      migrate();townTravelers();
      if(!active())return;
      if(mode==="skip"){complete();return;}
      if(state.map.id===zone){attach();return;}
      if(state.map.id==="frosthaven"&&(record().stage==="hearth"||(mode==="gate"&&record().stage==="gate"))) {
        const first=record().stage!=="hearth";
        record().stage="hearth";delete record().loot;delete record().encounter;state.flags.seen_act1=true;
        if(state.portal?.mapId===zone)state.portal=null;
        attach();if(first)UI.openingArrival();
      } else complete();
    }
    function kill(mon) {
      if(!onRoad()||!mon.openingId||record().defeated.includes(mon.openingId))return;
      const o=record();o.defeated.push(mon.openingId);
      if(mon.openingId==="guard")stage("road");
      else if(mon.openingId.startsWith("rescue")&&allDead(["rescue0","rescue1","rescue2"]))stage("rescueTalk");
      else if(mon.openingId.startsWith("gate")&&allDead(["gate0","gate1"]))stage("provision");
      else if(mon.openingId==="captain") {
        for(const m of state.monsters)if(m.openingId?.startsWith("retinue")&&!m.dead){m.dead=true;m.hp=0;m.corpseT=8;m.path=null;m.startAction("death",.6);}
        clearWarnings();stage("gate");
      } else saveGame();
    }
    function outsideView(n) {
      if(!canvas||!camPos)return false;
      const cam=camera(),x=U.isoX(n.x,n.y)-cam.x,y=U.isoY(n.x,n.y)-cam.y;
      return x < -100 || y < -150 || x > canvas.width+100 || y > canvas.height+150;
    }
    function companions(dt) {
      const o=record(),sc=state.map.opening,p=state.player;
      const held=["combat","provision","bossIntro","boss"].includes(o.stage);
      const trail=runtime.trail;
      if(!trail.length||U.dist(p.x,p.y,trail[trail.length-1].x,trail[trail.length-1].y)>1.1)trail.push({x:p.x,y:p.y});
      if(trail.length>80)trail.shift();
      runtime.nav-=dt;const navigate=runtime.nav<=0;if(navigate)runtime.nav=.65;
      state.npcs.forEach(n=>{
        const i=travelers.indexOf(n.id),isBryn=n.id==="bryn";
        if(!isBryn&&i<0)return;
        let target;
        if(held)target=sc.shelter[isBryn?0:i+1];
        else if(o.stage==="gate")target={x:sc.brynGate.x-(isBryn?0:i+1),y:sc.brynGate.y+(isBryn?0:1)};
        else if(["awakening","guard"].includes(o.stage)&&isBryn)target=sc.cover;
        else if(["rescue","rescueTalk"].includes(o.stage)&&isBryn)target=sc.rescueCover;
        else if(isBryn||o.rescued)target=trail[Math.max(0,trail.length-(isBryn?4:7+i*3))];
        if(!target){n.moving=false;return;}
        const distance=U.dist(n.x,n.y,target.x,target.y);
        // Catch up only when both endpoints are hidden; the visible traveler always walks.
        const catchup=distance>18&&outsideView(n)?(held?target:[...trail].reverse().find(t=>outsideView(t)&&MapGen.walkable(state.map,t.x,t.y)&&U.dist(t.x,t.y,p.x,p.y)<U.dist(n.x,n.y,p.x,p.y)-4)):null;
        if(catchup&&outsideView(catchup)&&MapGen.walkable(state.map,catchup.x,catchup.y)){
          n.x=catchup.x;n.y=catchup.y;n.path=null;
        } else if(navigate&&distance>1.5)repath(n,target.x,target.y);
        else if(distance<1.2)n.path=null;
        if(n.path?.length)n.moveAlong(dt,held?3.6:4.2,state.map,null);else n.moving=false;
      });
    }
    function bossProgress() {
      const m=captain(),o=record(),sc=state.map.opening;if(!m)return;
      const ratio=m.hp/m.maxHp;
      if(ratio<=.5&&!o.bossPhase) {
        o.bossPhase=1;phaseBoss(m,1);
        caption("The Rimebound Captain","To the wall! The watch does not end in death.",8);
        Sfx.play("vox_boss");addNova(m.x,m.y,2.5,"#a8e5ff");saveGame();
      }
      const living=state.monsters.filter(n=>!n.dead&&n.openingId?.startsWith("retinue"));
      if(living.length)return;
      const wave=[.5,.25].findIndex((at,i)=>ratio<=at&&!o.waves.includes(i));
      if(wave<0)return;
      o.waves.push(wave);
      sc.reinforcements.forEach((p,i)=>{spawn("retinue"+wave+"_"+i,p);addNova(p.x,p.y,1,"#a8e5ff");});
      saveGame();
    }
    function ambientLines() {
      if(runtime.caption>0)return;
      const o=record(),p=state.player;
      const cues=[
        ["carts","arrival",{x:32,y:71},"Bryn","We sent six wagons down this road. Yours was the last."],
        ["captain","arrival",{x:59,y:73},"Bryn","The captain promised to hold the gate until everyone was inside."],
        ["graves","road",{x:50,y:48},"Bryn","They can still remember their names. That’s the worst of it."],
        ["thanks","escort",{x:11,y:32},"Iven","He told us to run to the wall. Then he turned his sword on us."],
        ["hearth","escort",{x:25,y:18},"Mara","Tell me the hearth is still burning."],
        ["answer","escort",{x:49,y:22},"Bryn","It is. You’ll see it with your own eyes."]
      ];
      for(const [id,s,pos,speaker,line] of cues)if(o.stage===s&&!o.barks[id]&&U.dist(p.x,p.y,pos.x,pos.y)<9){o.barks[id]=true;caption(speaker,line);break;}
    }
    function update(dt) {
      if(!active()||!runtime||state.player.dead)return;
      const p=state.player,o=record(),sc=state.map.opening;
      UI.tickOpening(dt);runtime.caption=Math.max(0,runtime.caption-dt);runtime.stageTime+=dt;
      if(p.moving)o.hints.move=true;
      if(p.action&&["attack","cast"].includes(p.action.state))o.hints.attack=true;
      if(onRoad()) {
        companions(dt);
        if(o.stage==="arrival"&&U.dist(p.x,p.y,sc.guard.x,sc.guard.y)<8){stage("awakening");Sfx.play("shrine");addNova(sc.shard.x,sc.shard.y,2.3,"#f3ab87");}
        if(o.stage==="awakening") {
          runtime.rise+=dt;
          if(runtime.guard)runtime.guard.action.t=.6*(1-U.clamp(runtime.rise/2.8,0,1));
          if(runtime.rise>=2.8){runtime.guard=null;spawn("guard",sc.guard);stage("guard");}
        }
        if(o.stage==="road"&&!o.rescueBypassed&&U.dist(p.x,p.y,sc.rescue.x,sc.rescue.y)<11){sc.rescueEnemies.slice(0,2).forEach((pos,i)=>spawn("rescue"+i,pos));stage("rescue");}
        if(o.stage==="rescue"&&allDead(["rescue0","rescue1"]))spawn("rescue2",sc.rescueEnemies[2]);
        if((o.stage==="escort"||(o.stage==="road"&&o.rescueBypassed))&&U.dist(p.x,p.y,sc.pair[0].x,sc.pair[0].y)<11){sc.pair.forEach((pos,i)=>spawn("gate"+i,pos));stage("combat");}
        if(o.stage==="provision"&&U.dist(p.x,p.y,sc.bossTrigger.x,sc.bossTrigger.y)<3){spawn("captain",sc.captain,"frost_watch_captain");stage("bossIntro");}
        if(o.stage==="bossIntro"&&runtime.stageTime>=3)stage("boss");
        if(["bossIntro","boss"].includes(o.stage))bossProgress();
        runtime.pulse+=dt;
        const light=state.map.lights.find(l=>l.x===sc.shard.x&&l.y===sc.shard.y);
        if(light)light.r=2.6+Math.sin(runtime.pulse*(o.stage==="awakening"?7:1.6))*.55;
        ambientLines();
      }
      const objectives={arrival:"Follow Bryn toward Frosthaven",awakening:"Something is moving beside the shard",guard:"Put the fallen guard to rest",
        road:"Find the voices at the wrecked caravan",rescue:"Protect the stranded travelers",rescueTalk:"Speak to the travelers",escort:"Lead the travelers toward Frosthaven",
        combat:"Clear the risen from the gate",provision:"Prepare, then enter the courtyard",bossIntro:"The captain still keeps his watch",boss:"Defeat the Rimebound Captain",gate:"Bring everyone inside Frosthaven",hearth:"Speak with Seraneth by the hearth"};
      let hint="";const potion=p.belt.findIndex(b=>b?.count>0&&DATA.CONSUMABLES[b.id]?.healPct);
      if(onRoad()&&p.hp<p.stats.maxHp*.55&&potion>=0)hint=`Press ${potion+1} to drink a healing draught`;
      else if(["bossIntro","boss"].includes(o.stage))hint="Leave the frost circle before it fills · strike while he recovers";
      else if(o.stage==="rescueTalk")hint="Left-click Mara or Iven to bring them with you";
      else if(o.stage==="provision")hint=o.supply?"The captain waits beyond the watch post":"Left-click the watch supplies for two healing draughts";
      else if(o.stage==="hearth")hint="Left-click Seraneth to speak";
      else if(o.stage==="gate")hint="Click the gate to enter";
      else if(!o.hints.move)hint="Left-click the road to move · hold to keep walking";
      else if(fights.includes(o.stage)&&!o.hints.attack)hint=options.leftClickMove?"Shift + left-click an enemy to attack":"Left-click an enemy to attack · hold to keep fighting";
      if (typeof MobileControls !== "undefined" && MobileControls.enabled) {
        hint=hint.replace(/Left-click|Click/g,"Tap");
        if(onRoad()&&p.hp<p.stats.maxHp*.55&&potion>=0)hint=`Tap draught ${potion+1} to heal`;
        else if(!o.hints.move)hint="Drag the thumbstick to move · tap people and objects to interact";
        else if(fights.includes(o.stage)&&!o.hints.attack)hint="Hold Attack near an enemy to fight · Skill uses your assigned ability";
      }
      UI.openingObjective(o.rescueBypassed&&o.stage==="road"?"Follow the old road to the gate":objectives[o.stage]||"Reach Frosthaven",hint,o.stage);
    }
    function interact(npc) {
      if(!active())return false;
      const o=record();
      if(onRoad()&&npc.interact==="opening_supply") {
        if(!o.supply) {
          o.supply=true;npc.opened=true;npc.label="Watch supplies — empty";
          scatterDrops([{item:Items.makeConsumable("hp1",2)}],npc.x,npc.y+.8);
          Sfx.play("chest");caption("Bryn","Two draughts. Keep them close. Watch his blade, and move when the frost gathers.");saveGame();
        } else caption("Bryn","The supplies are spent. The way forward is through the courtyard.");
        return true;
      }
      if(onRoad()&&travelers.includes(npc.id)) {
        if(o.stage==="rescueTalk"){o.rescued=true;stage("escort");Sfx.play("questProgress");}
        else caption(npc.name,o.rescued?"We’re right behind you.":"Please, clear them away from the wagon!");
        return true;
      }
      if(onRoad()&&npc.id==="bryn"){caption(...(lines[o.stage]||lines.escort));return true;}
      if(o.stage==="hearth"&&npc.id==="sera"){complete();saveGame();UI.openOpeningDialog(npc);return true;}
      return false;
    }
    function captureLoot() {
      if(!onRoad())return;
      record().loot=state.ground.map(g=>({x:g.x,y:g.y,...(g.gold?{gold:g.gold}:{item:serializeItem(g.item)})}));
      record().encounter=Object.fromEntries(state.monsters.filter(m=>m.openingId&&!m.dead).map(m=>[m.openingId,{hp:m.hp,x:m.x,y:m.y}]));
    }
    function restoreLoot() {
      if(!onRoad()||!record().loot)return;
      state.ground=record().loot.map(g=>({...g,toss:0,...(g.item?{item:reviveItem(g.item)}:{})}));
      for(const g of state.ground)g.filt=LootFilter.evaluate(g,state.player);
    }
    function skip() {
      if(!active()||!state||state.player.dead)return Promise.resolve(false);
      if(skipping?.hero===state.player)return skipping.promise;
      const hero=state.player;
      const promise=(async()=>{
        try {if(state.map?.id==="frosthaven"){complete();saveGame();return true;}return await enterMap("frosthaven","default",{openingMode:"skip"});}
        finally {if(skipping?.hero===hero)skipping=null;}
      })();skipping={hero,promise};return promise;
    }
    function cameraTarget() {
      if(!onRoad()||record().stage!=="awakening"||!runtime?.guard||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return null;
      const p=state.player,g=runtime.guard;return {x:p.x+(g.x-p.x)*.25,y:p.y+(g.y-p.y)*.25};
    }
    return {begin,reset,active,onRoad,checkpoint,arrived,kill,update,interact,captureLoot,restoreLoot,skip,cameraTarget,
      get actor(){return onRoad()?runtime?.guard:null;},get ready(){return record()?.stage==="gate";}};
  })();

  function skipOpening() { return opening.skip(); }

  async function newGame(name, classId, hardcore) {
    const lifecycleSeq = ++playerLoadoutSeq;
    const player = new Player(name, classId);
    player.hardcore = hardcore;
    /* starter kit (per class) */
    const caster = classId === "emberwitch" || classId === "gravebinder" || classId === "wildkeeper";
    const starter = DATA.PLAYER_STARTER_LOADOUTS[classId];
    if (!starter) throw new Error(`No starter loadout for player class ${classId}`);
    player.equip.main = Items.fromBase(starter.main);
    player.equip.chest = Items.fromBase(starter.chest);
    Items.autoPlace(player.inv, Items.makeConsumable("hp1", 2));
    if (caster) Items.autoPlace(player.inv, Items.makeConsumable("mp1", 2));
    Items.autoPlace(player.inv, Items.makeConsumable("tp", 1));
    player.belt[0] = { id: "hp1", count: 2 };
    if (caster) player.belt[1] = { id: "mp1", count: 2 };
    player.computeStats();
    player.hp = player.stats.maxHp; player.mana = player.stats.maxMana;
    try {
      player._playerVisual = playerAssets.resolvePlayerVisual(player.classId, player.equip, player.buffs);
      await playerAssets.loadPlayerLoadout(player._playerVisual);
      if (lifecycleSeq !== playerLoadoutSeq) {
        playerAssets.discardPlayerLoadout(player._playerVisual);
        return;
      }
      playerAssets.activatePlayerLoadout(player._playerVisual);
      player._playerVisualSignature = playerLoadoutSignature(player);
    } catch (err) {
      if (player._playerVisual) playerAssets.discardPlayerLoadout(player._playerVisual);
      if (lifecycleSeq === playerLoadoutSeq) fatalRuntime(err, "3D player loading");
      return;
    }
    state = freshState(player, (Math.random() * 0xffffffff) >>> 0);
    saveSlotKey = SAVE_PREFIX + Date.now();
    opening.begin();
    UI.hideTitle();
    running = true;
    saveGame();
    if (!await enterMap("frosthaven_approach", "default")) {
      if(state?.player===player){running=false;opening.reset();UI.showTitle();}
      return;
    }
    if(state?.player!==player)return;
    saveGame();
  }

  /* ---------------- map transitions ---------------- */
  async function enterMap(zoneId, spawnKey, { revive = false, openingMode = null, arrivalPosition = null, reuseCachedMap = false, recoverable: recoverableTravel = false, quietQuestAudio = false, difficultyChange = null } = {}) {
    if(typeof Coop!=="undefined"&&Coop.active&&!Coop.loading)return Coop.requestTravel(zoneId,spawnKey,arguments[2]||{});
    if (!state || (state.difficultyTransition && state.difficultyTransition !== difficultyChange)) return false;
    if(typeof PropInteractions!=='undefined')PropInteractions.cancel(state);
    if(openingMode === "gate" && !opening.ready) {
      const s=state.flags.opening?.stage;
      UI.openingCaption("Bryn",["provision","bossIntro","boss"].includes(s)?"The captain still holds the gate. We have to end his watch.":["rescue","rescueTalk","road"].includes(s)?"There are people stranded on the road. We can’t leave them here.":"The risen are still on the road. Clear them first."); return false;
    }
    const enteringState=state, transition=++mapTransitionSeq;
    resetTouch();
    cancelGroundHold();
    Sfx.stopDeath(); Sfx.stopSkills?.(); // A death cry must not carry into the respawned hero's town.
    const resumeRunning = running;
    running = false;
    const zoneName = DATA.ZONES[zoneId] ? DATA.ZONES[zoneId].name.toUpperCase() : zoneId.toUpperCase();
    const recoverable = recoverableTravel || revive || opening.active();
    if (zoneId === "frosthaven_approach" && !await requireSpriteBundle("zone:frosthaven", "PREPARING FROSTHAVEN", {recoverable})) {
      if(state===enteringState && transition===mapTransitionSeq)running=resumeRunning;
      return false;
    }
    if (!await requireSpriteBundle(`zone:${DATA.ZONES[zoneId]?.artZone || zoneId}`, `LOADING ${zoneName} SPRITES`, { recoverable })) {
      if (state===enteringState && transition===mapTransitionSeq && recoverable) {
        running = resumeRunning;
        if (!recoverableTravel) UI.openingCaption?.("", "The road could not be loaded. Try the gate or Skip opening again.");
      }
      return false;
    }
    if(state!==enteringState || transition!==mapTransitionSeq)return false;
    if(typeof Act1EnemyAnimation!=='undefined'&&Act1EnemyAnimation.hasZone(zoneId)&&!await requireSpriteBundle('actors:act1',`PREPARING ${zoneName} ENEMIES`,{recoverable})) {
      if(state===enteringState&&transition===mapTransitionSeq&&recoverable)running=resumeRunning;
      return false;
    }
    if(DATA.ACT2_COMBAT?.pools[zoneId]&&!await requireSpriteBundle('actors:act2',`PREPARING ${zoneName} ENEMIES`,{recoverable})) {
      if(state===enteringState&&transition===mapTransitionSeq&&recoverable)running=resumeRunning;
      return false;
    }
    if(state!==enteringState || transition!==mapTransitionSeq)return false;
    if(typeof Act4EnemyAnimation!=='undefined'&&Act4EnemyAnimation.hasZone(zoneId)&&!await requireSpriteBundle('actors:act4',`PREPARING ${zoneName} ENEMIES`,{recoverable})) {
      if(state===enteringState&&transition===mapTransitionSeq&&recoverable)running=resumeRunning;
      return false;
    }
    if(state!==enteringState || transition!==mapTransitionSeq)return false;
    if(typeof Act5EnemyAnimation!=='undefined'&&Act5EnemyAnimation.hasZone(zoneId)&&Act5EnemyAnimation.hasAssets()&&!await requireSpriteBundle('actors:act5',`PREPARING ${zoneName} ENEMIES`,{recoverable})) {
      if(state===enteringState&&transition===mapTransitionSeq&&recoverable)running=resumeRunning;
      return false;
    }
    if(state!==enteringState || transition!==mapTransitionSeq)return false;
    const encounterBoss=DATA.ZONES[zoneId]?.boss;
    if(DATA.ACT3_ROSTERS[zoneId]&&!await requireSpriteBundle('actors:act3',`PREPARING ${zoneName} ENEMIES`,{recoverable})) {
      if(state===enteringState&&transition===mapTransitionSeq&&recoverable)running=resumeRunning;
      return false;
    }
    if(state!==enteringState || transition!==mapTransitionSeq)return false;
    if(typeof BossEncounters!=="undefined"&&BossEncounters.definitions[encounterBoss]) {
      if(!await requireSpriteBundle(`boss:${encounterBoss}`,`PREPARING ${zoneName} ENCOUNTER`,{recoverable})) {
        if(state===enteringState&&transition===mapTransitionSeq&&recoverable)running=resumeRunning;
        return false;
      }
      if(state!==enteringState||transition!==mapTransitionSeq)return false;
    }
    if(state!==enteringState || transition!==mapTransitionSeq)return false;
    if(difficultyChange && difficultyChange.lifecycleSeq !== playerLoadoutSeq) {
      running = resumeRunning;
      return false;
    }
    /* All destination assets are ready. Only now commit a difficulty change. */
    for(const mon of state.monsters||[])mon.cancelAttacks?.();
    if(typeof BossEncounters!=="undefined")BossEncounters.cancelAll();
    if(typeof EnemySkills!=="undefined")EnemySkills.cancelAll();
    if(typeof Act2EnemyCombat!=="undefined")Act2EnemyCombat.cancelAll();
    if (difficultyChange) {
      opening.reset();
      state.campaignsByDifficulty[state.difficulty] = campaignSnapshot();
      state.difficulty = difficultyChange.difficulty;
      restoreCampaign(state, difficultyChange.campaign);
      state.mapsCache = {}; state.monstersByMap = {}; state.groundByMap = {};
      state.portal = null; state.actGate = null; state.vendorStock = {};
      state.cathedralVisits = 0;
    } else if (state.map) {
      /* Ordinary travel remembers the departing area's entities for this session. */
      state.monstersByMap[state.map.id] = state.monsters;
      state.groundByMap[state.map.id] = state.ground;
      if (state.portal?.instance?.map === state.map) Object.assign(state.portal.instance,{monsters:state.monsters,ground:state.ground});
    }
    // A portal owns its original session instance, even if another entrance has
    // since generated a different cathedral with the same zone ID.
    const remembered = typeof reuseCachedMap === "object" ? reuseCachedMap : null;
    if (remembered?.map?.id === zoneId) {
      state.mapsCache[zoneId] = remembered.map;
      state.monstersByMap[zoneId] = remembered.monsters;
      state.groundByMap[zoneId] = remembered.ground;
    }
    let map = state.mapsCache[zoneId];
    const shifting = DATA.ZONES[zoneId] && DATA.ZONES[zoneId].shifting && !reuseCachedMap;
    if (!map || shifting) {
      /* the cathedral reassembles itself from memory every time you enter */
      const parentSeed=state.mapsCache[DATA.ZONES[zoneId]?.memoryParent]?.cathedral?.seed;
      const seed = shifting ? ((state.seed ^ (state.cathedralVisits = (state.cathedralVisits || 0) + 1) * 0x9e3779b1) >>> 0) : (parentSeed ?? state.seed);
      map = MapGen.generate(zoneId, seed);
      if (map.cathedral && !map.zone.memoryParent) {
        for (const child of Object.values(DATA.ZONES).filter(z=>z.memoryParent===zoneId)) {
          delete state.mapsCache[child.id]; delete state.monstersByMap[child.id]; delete state.groundByMap[child.id];
        }
      }
      state.mapsCache[zoneId] = map;
      if (shifting) { state.monstersByMap[zoneId] = null; state.groundByMap[zoneId] = null; }
    }
    for(const mon of state.monsters)mon.imperialCombat?.cancel();
    state.player.clearVeilState();
    state.map = map;
    /* monsters: restore session set or spawn fresh */
    if (state.monstersByMap[zoneId]) {
      state.monsters = state.monstersByMap[zoneId].filter(m => !m.dead || m.corpseT > 0);
    } else {
      state.monsters = [];
      const diff = DATA.DIFFICULTIES[state.difficulty];
      /* pull any spawn that landed in a wall or on cliff-isolated ground onto a tile the
         player can actually foot-reach from their arrival point — fixes "enemies I can't reach" */
      const arrival = safeArrival(map, arrivalPosition || map.spawns[spawnKey] || map.spawns.default);
      const reach = computeReach(map, arrival.x, arrival.y);
      for (const sp of map.monsterSpawns) {
        /* bosses stay dead per difficulty tier (legacy flags count as Normal) */
        const deadKey = "dead_" + sp.id + "@" + state.difficulty;
        if (sp.boss && (state.flags[deadKey] || (state.difficulty === 0 && state.flags["dead_" + sp.id]))) continue;
        const extraElite = !sp.boss && !sp.elite && !sp.minion && Math.random() < diff.eliteBoost;
        const pos = sp.boss ? { x: sp.x, y: sp.y } : nearestReach(map, reach, sp.x, sp.y);   // keep hand-placed bosses put
        const mon = new Monster(sp.id, pos.x, pos.y, { elite: sp.elite || extraElite, minion: sp.minion, skillProfile:sp.skillProfile,
          packId:sp.packId,monsterFamily:sp.monsterFamily,familyHome:sp.familyHome&&{...sp.familyHome,x:pos.x,y:pos.y} });
        if(typeof Coop!=="undefined"&&Coop.active)mon._coopId='spawn_'+zoneId+'_'+map.monsterSpawns.indexOf(sp);
        if (sp.cathedralEncounter) mon.cathedralEncounter=sp.cathedralEncounter;
        state.monsters.push(mon);
      }
    }
    for(const mon of state.monsters)mon.veilExposedUntil=0;
    state.ground = state.groundByMap[zoneId] || [];
    state.projectiles = [];
    state.traps = [];              // planted devices stay behind
    state.fx = [];                 // fields/banners/totems/weather are per-map
    state.npcs = map.npcs
      .filter(n => !(n.survivor && rescuedSurvivors().includes(n.sid)))   // already saved -> gone
      .map(n => new Npc(n.id, n.x, n.y, { survivor: n.survivor, sid: n.sid, npcArt: n.npcArt, displayName: n.displayName, storyId: n.storyId }));
    campaignEvent({kind:"enter",zone:zoneId,target:zoneId}, {silent:quietQuestAudio});
    syncStoryObjects();
    syncConditionalNpcs();   // story NPCs that come and go with quest state (Halvar, etc.)
    setupBeaconQuest(map);   // beacons / Oathsworn trio for the Fallen North
    setupRitualQuest(map);   // Choir ritual sites (q10/q11) + the Choirmaster boss
    syncOptionalQuests();    // offer act-appropriate optional side quests
    placeEvents(map);        // random world events
    state.bossBar = null;
    particles = []; floats = []; novas = []; bolts = []; delayed = [];
    if(typeof SkillVFX!=='undefined')SkillVFX.reset();
    if(typeof SkillAudio!=='undefined')SkillAudio.reset();
    heldTarget = null; cancelGroundHold();
    /* place player */
    const sp = safeArrival(map, arrivalPosition || map.spawns[spawnKey] || map.spawns.default);
    const p = state.player;
    if (revive) {
      p.dead = false; p.action = null;
      p.hp = p.stats.maxHp; p.mana = p.stats.maxMana;
    }
    p.x = sp.x; p.y = sp.y; p.surfaceId=sp.surfaceId??0;
    p._animationController?.reset();
    camPos = null;                 // snap camera to the new map
    /* raised servants follow their master between maps */
    for (const mi of state.minions) {
      mi.surfaceId=p.surfaceId;
      mi.x = p.x + U.rf(-1.2, 1.2); mi.y = p.y + U.rf(-1.2, 1.2);
      if (!MapGen.walkable(map, mi.x, mi.y)||(map.surfaceVersion&&!TerrainSurface.supported(map,mi.x,mi.y,mi.radius))) { mi.x = p.x; mi.y = p.y; }
      mi.path = null; clearTraversal(mi);
    }
    clearTraversal(p);
    p.path = null; p.command = null; p.dashing = null; p.leaping = null; p.spinning = null; p.jumping = null; p.lastTarget = null;
    exitGrace = 0.8;
    explore();
    state.zoneMusic = Sfx.chooseZoneMusic(map.zone, state.zoneMusic);
    state.musicTheme = null;
    updateBossEncounter();
    const wasOpening=opening.active();
    opening.arrived(openingMode);
    if(zoneId === "frosthaven_approach")opening.restoreLoot();
    if (!wasOpening) centerZone(map.zone.name);
    UI.refreshBelt(); UI.refreshBuffs();
    /* any safe hub (the town or an act camp) stocks vendors, attunes, autosaves */
    if (zoneId === "town" || map.zone.kind === "camp") {
      state.home = zoneId;                  // town-portal & respawn destination
      for (const n of map.npcs) {
        const def = DATA.NPCS[n.id];
        if (def && def.role === "vendor") state.vendorStock[n.id] = Items.vendorStock(def.stock, p.lvl);
      }
      if (!state.shrines.includes(zoneId)) state.shrines.push(zoneId);
      saveGame();
      if(!wasOpening&&!(typeof Coop!=="undefined"&&Coop.active))msg("Autosaved.", "#6a7a5a");
    }
    /* act intro flourish, once per act */
    const act = DATA.ACTS.find(a => a.camp === zoneId);
    if (act && !state.flags["seen_act" + act.id]) {
      state.flags["seen_act" + act.id] = true;
      if(!wasOpening)centerMsg(act.intro[0], act.intro[1]);
    }
    mmRebuildT = 0;
    running = resumeRunning;
    return true;
  }
  let zoneLabelT = null;
  function centerZone(name) {
    const el = document.getElementById("zonelabel");
    el.textContent = name;
    el.style.opacity = 1;
    clearTimeout(zoneLabelT);
    zoneLabelT = setTimeout(() => { el.style.transition = "opacity 2s"; el.style.opacity = 0; }, 2600);
    el.style.transition = "none";
  }

  /* =====================================================================
     SAVE / LOAD
     ===================================================================== */
  function serializeItem(it) {
    if (!it) return null;
    return {
      k: it.kind, b: it.baseId, r: it.rarity, il: it.ilvl, n: it.name,
      af: it.affixes, u: it.uniqueId, id: it.identified, c: it.count,
      so: it.sockets, cb: it.combo, se: it.setItemId, cs: it.charmSize, jc: it.jcol, pc: it.procs, gx: it.gx, gy: it.gy,
      uv: it.uniqueVersion,
    };
  }
  function reviveItem(s) {
    if (!s) return null;
    let it;
    if (s.k === "consumable") it = Items.makeConsumable(s.b, s.c || 1);
    else if (s.k === "glyph") it = Items.makeGlyph(s.b);
    else if (s.k === "charm") it = Items.makeCharm(s.cs || (s.b || "charm_small").replace("charm_", ""), s.il || 1, { affixes: s.af || [], name: s.n, rarity: s.r, identified: s.id, uniqueId: s.u, flavor: s.u && DATA.UNIQUE_CHARMS ? (DATA.UNIQUE_CHARMS.find(x => x.id === s.u) || {}).flavor : undefined });
    else if (s.k === "jewel") it = Items.makeJewel(s.il || 1, { affixes: s.af || [], name: s.n, jcol: s.jc, rarity: s.r, uniqueId: s.u, flavor: s.u && DATA.UNIQUE_JEWELS ? (DATA.UNIQUE_JEWELS.find(x => x.id === s.u) || {}).flavor : undefined });
    else {
      it = Items.fromBase(s.b);
      it.rarity = s.r; it.ilvl = s.il; it.name = s.n;
      it.affixes = s.af || []; it.identified = s.id;
      if (s.u) { it.uniqueId = s.u; const u = DATA.UNIQUES.find(x => x.id === s.u); if (u) it.flavor = u.flavor; }
      if (s.se) { it.setItemId = s.se; const sd = DATA.SET_ITEMS.find(x => x.id === s.se); if (sd) it.setId = sd.set; }
      it.reqLvl = Math.max(it.reqLvl, s.r === "common" ? it.reqLvl : Math.floor(s.il * 0.8));
      if (s.so) it.sockets = s.so;
      if (s.cb) it.combo = s.cb;
      if (s.pc) it.procs = s.pc;
    }
    it.gx = s.gx; it.gy = s.gy;
    if (typeof UniquePowers !== "undefined") UniquePowers.migrate(it);
    return it;
  }
  function saveGame() {
    if (typeof Coop!=="undefined" && Coop.active) { Coop.save(); return; }
    if (!state) return;
    if (state.player.dead && state.player.hardcore) return;
    opening.captureLoot();
    state.campaignsByDifficulty[state.difficulty] = campaignSnapshot();
    const p = state.player;
    const data = {
      v: 2, name: p.name, classId: p.classId, hardcore: p.hardcore,
      playerRenderer: "three",
      lvl: p.lvl, xp: p.xp, attr: p.attr, attrPts: p.attrPts, skillPts: p.skillPts,
      skills: p.skills, skillPerks: p.skillPerks, gold: p.gold, skillL: p.skillL, skillR: p.skillR, quickSlots: p.quickSlots, deaths: p.deaths,
      belt: p.belt,
      inv: p.inv.items.map(serializeItem),
      stash: p.stash.items.map(serializeItem),
      equip: Object.fromEntries(Object.entries(p.equip).map(([k, v]) => [k, serializeItem(v)])),
      seed: state.seed, campaignsByDifficulty: state.campaignsByDifficulty, characterFlags: state.characterFlags,
      difficulty: state.difficulty, unlockedDiff: state.unlockedDiff,
      savedAt: Date.now(),
    };
    try { localStorage.setItem(saveSlotKey, JSON.stringify(data)); } catch (e) { msg("Save failed: " + e.message, "#c05050"); }
  }
  function listSaves() {
    const out = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k.startsWith(SAVE_PREFIX)) continue;
      try {
        const d = JSON.parse(localStorage.getItem(k));
        // Appearance metadata for the saved-hero preview; no item revival or save mutation.
        const equipment = Object.fromEntries(Object.entries(d.equip || {}).map(([slot, item]) => [slot, item ? {
          baseId: item.b, name: item.n, rarity: item.r, uniqueId: item.u, setItemId: item.se
        } : null]));
        out.push({ slot: k, name: d.name, lvl: d.lvl, classId: d.classId, hardcore: d.hardcore, savedAt: d.savedAt, equipment });
      } catch (e) {}
    }
    out.sort((a, b) => b.savedAt - a.savedAt);
    return out;
  }
  function deleteSave(slot) { localStorage.removeItem(slot); }
  async function loadGame(slot) {
    const lifecycleSeq = ++playerLoadoutSeq;
    const raw = localStorage.getItem(slot);
    if (!raw) return;
    const d = JSON.parse(raw);
    const legacy = !d.campaignsByDifficulty;
    if (legacy) {
      try {
        const backup = CAMPAIGN_BACKUP_PREFIX + slot;
        if (localStorage.getItem(backup) === null) localStorage.setItem(backup, raw);
      } catch (err) {
        msg("Could not back up this hero before updating campaign saves: " + err.message, "#c05050");
        return false;
      }
    }
    const p = new Player(d.name, d.classId);
    p.hardcore = d.hardcore; p.lvl = d.lvl; p.xp = d.xp;
    p.attr = d.attr; p.attrPts = d.attrPts; p.skillPts = d.skillPts;
    p.skills = d.skills || {}; p.gold = d.gold; p.deaths = d.deaths || 0;
    /* migration: Raise Marksman became Raise Plague Mage */
    if (p.skills.raise_marksman) {
      p.skills.raise_plaguemage = (p.skills.raise_plaguemage || 0) + p.skills.raise_marksman;
      delete p.skills.raise_marksman;
    }
    /* migration: the skill trees were reworked — refund points spent on retired skills */
    let refund = 0;
    for (const id of Object.keys(p.skills)) {
      if (!DATA.SKILLS[id]) { refund += p.skills[id] || 0; delete p.skills[id]; }
    }
    if (refund > 0) p.skillPts = (p.skillPts || 0) + refund;
    p.skillPerks = typeof SkillPerks!=="undefined" ? SkillPerks.normalize(p,d.skillPerks) : {};
    p.skillL = d.skillL || "basic"; p.skillR = d.skillR || "basic";
    p.quickSlots = (d.quickSlots && d.quickSlots.slice(0, 4)) || [null, null, null, null];
    while (p.quickSlots.length < 4) p.quickSlots.push(null);
    p.quickSlots = p.quickSlots.map(s => (s && DATA.SKILLS[s] && DATA.SKILLS[s].type !== "passive") ? s : null);
    if ((!DATA.SKILLS[p.skillL] && p.skillL !== "basic") || DATA.SKILLS[p.skillL]?.type === "passive") p.skillL = "basic";
    if ((!DATA.SKILLS[p.skillR] && p.skillR !== "basic") || DATA.SKILLS[p.skillR]?.type === "passive") p.skillR = "basic";
    p.belt = d.belt || [null, null, null, null];
    for (const s of d.inv || []) { const it = reviveItem(s); Items.place(p.inv, it, s.gx, s.gy); }
    for (const s of d.stash || []) { const it = reviveItem(s); Items.place(p.stash, it, s.gx, s.gy); }
    for (const [k, s] of Object.entries(d.equip || {})) { const it = reviveItem(s); if (it) p.equip[k] = it; }
    p.computeStats();
    p.hp = p.stats.maxHp; p.mana = p.stats.maxMana;
    try {
      p._playerVisual = playerAssets.resolvePlayerVisual(p.classId, p.equip, p.buffs);
      await playerAssets.loadPlayerLoadout(p._playerVisual);
      if (lifecycleSeq !== playerLoadoutSeq) {
        playerAssets.discardPlayerLoadout(p._playerVisual);
        return;
      }
      playerAssets.activatePlayerLoadout(p._playerVisual);
      p._playerVisualSignature = playerLoadoutSignature(p);
    } catch (err) {
      if (p._playerVisual) playerAssets.discardPlayerLoadout(p._playerVisual);
      if (lifecycleSeq === playerLoadoutSeq) fatalRuntime(err, "3D player loading");
      return;
    }
    state = freshState(p, d.seed);
    const validTier = value => Number.isInteger(value) && !!DATA.DIFFICULTIES[value];
    state.unlockedDiff = validTier(d.unlockedDiff) ? d.unlockedDiff : 0;
    state.difficulty = validTier(d.difficulty) ? Math.min(d.difficulty, state.unlockedDiff) : 0;
    state.characterFlags = d.characterFlags || {};
    if (legacy) {
      const flags = { ...d.flags };
      for (const key of Object.keys(flags)) {
        if (key.startsWith("sawCine_")) { state.characterFlags[key] = flags[key]; delete flags[key]; }
        // Shared legacy records cannot establish progress in a higher-tier campaign.
        if (/^dead_.*@(?!0$)/.test(key)) delete flags[key];
      }
      const normal = freshCampaign();
      normal.quests = d.quests || normal.quests;
      normal.shrines = d.shrines || normal.shrines;
      normal.home = d.home || (normal.shrines.includes("frosthaven") ? "frosthaven" :
        (normal.shrines.find(id => DATA.ZONES[id]?.kind === "camp" || id === "town") || "frosthaven"));
      normal.flags = flags;
      state.campaignsByDifficulty[0] = normal;
    } else state.campaignsByDifficulty = d.campaignsByDifficulty;
    restoreCampaign(state, state.campaignsByDifficulty[state.difficulty] || freshCampaign());
    opening.reset();
    saveSlotKey = slot;
    UI.hideTitle();
    running = true;
    const start = DATA.ZONES[state.home] ? state.home : "frosthaven";
    const arrival=opening.active()?opening.checkpoint():[start,"default"];
    if(!await enterMap(arrival[0],arrival[1],{...arrival[2],quietQuestAudio:true})) {
      if(state?.player===p){running=false;opening.reset();UI.showTitle();}
      return;
    }
    if(state?.player!==p)return;
    saveGame(); // Also persist migrations when the opening checkpoint is outside town.
    if (state && DATA.CAMPAIGN.bossDead(state,"vethriss") && !state.flags.ending) UI.openFinalChoice();
  }
  function saveAndQuit() {
    if(typeof Coop!=="undefined"&&Coop.active)return Coop.leave();
    resetTouch();
    cancelGroundHold();
    Sfx.stopDeath(); Sfx.stopSkills?.();
    playerLoadoutSeq++;
    saveGame();
    mapTransitionSeq++;
    opening.reset();
    running = false;
    state = null;
    playerAssets.deactivatePlayerLoadout();
    Sfx.stopMusic();
    UI.closeAll();
    UI.showTitle();
  }

  /* =====================================================================
     QUESTS
     ===================================================================== */
  function acceptQuest(qid) {
    if(typeof Coop!=="undefined"&&Coop.active&&!Coop.committing)return Coop.submit({type:'acceptQuest',questId:qid});
    const q = DATA.QUESTS.find(x => x.id === qid);
    if (!q || state.quests[qid]?.state !== "offered") return;
    state.quests[qid] = { ...state.quests[qid], state: "active", count: 0 };
    msg("Quest accepted: " + q.name, "#d8c79a");
    Sfx.play("questAccepted");
    syncConditionalNpcs();
    campaignEvent();
    if (q.type === "ritual") setupRitualQuest(state.map);
    saveGame();
  }
  function campaignEvent(event, {silent=false}={}) {
    if(typeof Coop!=="undefined"&&Coop.active)Coop.trackParticipants?.();
    const ready = event ? DATA.CAMPAIGN.record(state,event) : DATA.CAMPAIGN.sync(state);
    for (const q of ready) {
      msg(`${q.name}: objectives complete. Return to ${DATA.NPCS[q.giver].name}.`, "#7fd87f");
      if(!silent) Sfx.play("questReady");
    }
    UI.renderIfOpen("quest");
  }
  function storyTopic(npc, topic) {
    const allowed = DATA.STORY_TOPICS[npc.spriteOpts.npcArt] || [];
    if (!allowed.some(t=>t.id===topic.id)) return;
    campaignEvent({kind:"talk",zone:state.map.id,target:topic.id});
    saveGame();
  }
  function syncStoryObjects() {
    const zone = state.map.id;
    state.npcs = state.npcs.filter(n=>!n.storyId || !DATA.CAMPAIGN.found(state,zone,n.storyId));
    for (const prop of state.map.props) {
      if (prop.soulBinding) prop.completed=DATA.CAMPAIGN.found(state,zone,prop.soulBinding);
      if (!prop.storyId) continue;
      const obj = DATA.STORY_OBJECTS[zone].find(o=>o.id===prop.storyId);
      prop.interact = !obj.travel && DATA.CAMPAIGN.found(state,zone,obj.id) ? null : "story";
      prop.completed = !obj.travel && DATA.CAMPAIGN.found(state,zone,obj.id);
      if (prop.type === "chest") prop.opened = !prop.interact;
      if (state.map.cathedral) {
        if (obj.travel) prop.hidden=!DATA.CAMPAIGN.bossDead(state,obj.requireKill);
      }
      if(state.map.act3 && zone==='underground_market')prop.visualType=prop.interact?'relay_active':'relay_disabled';
      // Keep the reward marker visible; interaction explains any unmet condition.
    }
  }
  function interactStory(prop) {
    const zone=state.map.id, obj=DATA.STORY_OBJECTS[zone]?.find(o=>o.id===prop.storyId);
    if (!obj || (!obj.travel && DATA.CAMPAIGN.found(state,zone,obj.id))) return false;
    if (obj.requireKill && !DATA.CAMPAIGN.bossDead(state,obj.requireKill)) {
      msg(`Defeat ${DATA.ENEMIES[obj.requireKill].name} first.`,"#d8b880"); return false;
    }
    if (obj.guards && state.monsters.some(m=>!m.dead && obj.guards.includes(m.defId) && U.dist(m.x,m.y,prop.x,prop.y)<5)) {
      msg("The guardians still hold this place. Defeat them first.","#d8b880"); return false;
    }
    if (obj.travel) {
      const q=DATA.QUESTS.find(q=>q.id==="q17");
      if (DATA.CAMPAIGN.remaining(state,q).length && state.quests.q17?.state!=="done") {
        msg("Break the Quieting seals, recover the sword, and defeat the priests before entering the portal.","#d8b880"); return false;
      }
      if (state.quests.q17?.state === "reward") completeQuest("q17");
      msg(obj.text,"#d8c79a"); enterMap(obj.travel,"default"); return;
    }
    campaignEvent({kind:"interact",zone,target:obj.id});
    msg(obj.text,"#d8c79a"); centerMsg(obj.label,"Recovered in your quest journal");
    Sfx.play("questProgress"); PropInteractions.effect(prop,state,'quest');
    prop.completed=true;syncStoryObjects(); saveGame();
  }
  function bossWard(mon) {
    const qid = mon.defId === "empty_archangel" ? "q16" : mon.defId === "malthoron" ? "q17" : null;
    if (!qid || state.quests[qid]?.state === "done") return null;
    const q=DATA.QUESTS.find(q=>q.id===qid);
    const remaining=DATA.CAMPAIGN.remaining(state,q).filter(o=>o.target!==mon.defId);
    return remaining.length ? remaining[0].label : null;
  }
  /* survivors rescued so far (any active/finished rescue quest) */
  function rescuedSurvivors() {
    const all = [];
    for (const q of DATA.QUESTS) {
      if (q.type !== "rescue") continue;
      const st = state.quests[q.id];
      if (st && st.rescued) all.push(...st.rescued);
    }
    return all;
  }
  function rescueSurvivor(npc) {
    const line = U.pick(npc.def.rescue || ["Thank you!"]);
    msg(`${npc.name}: “${line}”`, "#cfe0a0");
    if (npc.def.voice) Sfx.voice(npc.def.voice, line);
    Sfx.play("questProgress");
    addNova(npc.x, npc.y, 1.4, "#ffe0a0");
    for (let i = 0; i < 10; i++) addParticle(npc.x, npc.y, "#ffe6b0");
    /* they flee up and out of the world */
    const i = state.npcs.indexOf(npc);
    if (i >= 0) state.npcs.splice(i, 1);
    /* credit any active rescue quest for this zone */
    for (const q of DATA.QUESTS) {
      if (q.type !== "rescue" || q.zone !== state.map.id) continue;
      const st = state.quests[q.id];
      if (!st || st.state !== "active") continue;
      st.rescued = st.rescued || [];
      if (npc.sid && !st.rescued.includes(npc.sid)) st.rescued.push(npc.sid);
      st.count = st.rescued.length;
      if (st.count >= q.target) {
        st.state = "reward";
        msg(`${q.name}: everyone's out. Return to ${DATA.NPCS[q.giver].name}.`, "#7fd87f");
      } else {
        msg(`${q.name}: ${st.count}/${q.target} rescued`, "#9b8a60");
      }
      UI.renderIfOpen("quest");
    }
  }
  function questKillEvent(mon) {
    for (const q of DATA.QUESTS) {
      let st = state.quests[q.id];
      /* an act boss never respawns, so credit its kill even if the quest was never offered/accepted —
         otherwise killing it early permanently locks that quest's turn-in (and the next act). */
      if (q.type === "killBoss" && mon.defId === q.target) {
        if (!st) st = state.quests[q.id] = { state: "offered" };
        if (q.objectives) {
          if (st.state === "offered") st.state = "active";
          continue;
        }
        if (st.state !== "done" && st.state !== "reward") {
          st.state = "reward";
            msg(`${q.name}: done. Return to ${DATA.NPCS[q.giver].name}.`, "#7fd87f");
            Sfx.play("questReady");
          UI.renderIfOpen("quest");
        }
        continue;
      }
      if (!st) continue;
      if (q.type === "kills" && st.state === "active" && state.map.id === q.zone) {
        st.count = (st.count || 0) + 1;
        if (st.count === q.target) {
          st.state = "reward";
            msg(`${q.name}: done. Return to ${DATA.NPCS[q.giver].name}.`, "#7fd87f");
            Sfx.play("questReady");
        } else if (st.count % 3 === 0 || st.count === 1) {
          msg(`${q.name}: ${st.count}/${q.target}`, "#9b8a60");
        }
      }
    }
    campaignEvent({kind:"kill",zone:state.map.id,target:mon.defId});
  }
  /* optional side quests are offered (appear at their giver) once their act is underway —
     i.e. their prerequisite main quest has been started/finished. They never block the main chain. */
  function syncOptionalQuests() {
    for (const q of DATA.QUESTS) {
      if (!q.optional || state.quests[q.id]) continue;
      const pre = q.pre ? state.quests[q.pre] : null;
      if (!q.pre || (pre && ["active", "reward", "done"].includes(pre.state)))
        state.quests[q.id] = { state: "offered" };
    }
  }
  function completeQuest(qid) {
    if(typeof Coop!=="undefined"&&Coop.active&&!Coop.committing)return Coop.submit({type:'completeQuest',questId:qid});
    const q = DATA.QUESTS.find(x => x.id === qid);
    const st = state.quests[qid];
    if (!st || st.state !== "reward") return;
    if(typeof Coop!=="undefined"&&Coop.active)Coop.rewardParticipants(q);
    st.state = "done";
    const p = state.player;
    msg(`“${q.done}”`, "#d8c79a");
    /* every quest grants experience — explicit reward.xp, else a level-scaled share (more for boss hunts) */
    if(!(typeof Coop!=="undefined"&&Coop.active)){
    const xp = (q.reward && q.reward.xp) || Math.floor(DATA.xpForLevel(p.lvl) * (q.type === "killBoss" ? 0.7 : q.type === "ritual" ? 0.6 : q.type === "beacons" ? 0.55 : 0.4));
    if (xp > 0) { msg(`+${xp} experience.`, "#a9c8ff"); p.gainXp(xp); }
    if (q.reward.gold) { p.gold += q.reward.gold; msg(`Received ${q.reward.gold} gold.`, "#d8b860"); }
    if (q.reward.skillPts) { p.skillPts += q.reward.skillPts; msg(`Gained ${q.reward.skillPts} talent point.`, "#7fd87f"); }
    if (q.reward.item) {
      const it = Items.rollGear(DATA.effectiveLevel(q.reward.item.ilvl, state.difficulty), q.reward.item.rarity);
      it.identified = true;
      if (!Items.autoPlace(p.inv, it)) dropAtFeet(it);
      msg(`Received: ${it.name}`, Items.RARITY_COLOR[it.rarity]);
    }
    if (q.reward.consumable) {
      const it = Items.makeConsumable(q.reward.consumable);
      if (!Items.autoPlace(p.inv, it)) dropAtFeet(it);
      msg(`Received: ${it.name}`, "#9fdf9f");
    }
    if (q.reward.glyph) {
      const zone = DATA.ZONES[q.zone];
      const it = Items.rollGlyph(zone ? DATA.effectiveLevel(zone.lvl, state.difficulty) : p.lvl, p.stats.mf);
      if (!Items.autoPlace(p.inv, it)) dropAtFeet(it);
      msg(`Received: ${it.name}`, "#7fd8c0");
    }
    }
    Sfx.play("questCompleted");
    /* turning in an act-boss quest opens the caravan road to the next act's camp */
    if (q.type === "killBoss") {
      const act = DATA.ACTS.find(a => a.boss === q.target);
      if (act && act.next && !state.shrines.includes(act.next) && !(typeof Coop!=="undefined"&&Coop.active)) {
        state.shrines.push(act.next);
        const dest = DATA.ZONES[act.next] ? DATA.ZONES[act.next].name : "the road south";
        centerMsg("THE CARAVAN ROAD OPENS", `Speak to the caravan or any travel shrine to journey to ${dest}`);
        msg(`The caravan can now carry you to ${dest}.`, "#8fd8ff");
      }
    }
    /* chain next quest (skipping optional side quests — those are offered separately) */
    const i = DATA.QUESTS.indexOf(q);
    let ni = i + 1; while (DATA.QUESTS[ni] && DATA.QUESTS[ni].optional) ni++;
    if (DATA.QUESTS[ni] && !state.quests[DATA.QUESTS[ni].id]) state.quests[DATA.QUESTS[ni].id] = { state: "offered" };
    syncOptionalQuests();
    if(typeof Coop!=="undefined"&&Coop.active)for(const id of Object.keys(state.quests))if(!CoopProtocol.ZONES.includes(DATA.QUESTS.find(q=>q.id===id)?.zone))delete state.quests[id];
    if (qid === "q3") centerMsg("THE VIGIL IS BROKEN", "but Maesa hears singing from a ruined chapel in the south…");
    /* finishing the whole saga unlocks the next difficulty tier */
    if (q.reward && q.reward.finale) {
      const next = Math.min(2, state.difficulty + 1);
      if ((state.unlockedDiff || 0) < next) {
        state.unlockedDiff = next;
        centerMsg("THE SAGA IS COMPLETE", DATA.DIFFICULTIES[next].name + " difficulty unlocked — switch from the Esc menu");
      } else {
        centerMsg("THE SAGA IS COMPLETE", "The Waking World endures on " + DATA.DIFFICULTIES[state.difficulty].name);
      }
    }
    syncConditionalNpcs();   // e.g. Halvar appears the moment the rescue is turned in
    campaignEvent(); // A prerequisite turn-in may finish an already discovered boss quest.
    UI.renderIfOpen("quest");
    saveGame();
  }
  /* switch difficulty tier: the whole world re-knits itself */
  async function setDifficulty(d) {
    if(typeof Coop!=="undefined"&&Coop.active)return false;
    if (!state || state.player.dead || state.difficultyTransition || !Number.isInteger(d) ||
        !DATA.DIFFICULTIES[d] || d === state.difficulty || d > (state.unlockedDiff || 0)) return false;
    const switchingState = state;
    const change = {difficulty:d, campaign:state.campaignsByDifficulty[d] || freshCampaign(), lifecycleSeq:playerLoadoutSeq};
    state.difficultyTransition = change;
    try {
      const destination = DATA.ZONES[change.campaign.home] ? change.campaign.home : "frosthaven";
      if (!await enterMap(destination, "default", {recoverable:true, difficultyChange:change}) || state !== switchingState) {
        if(state === switchingState)msg("Difficulty unchanged. The destination could not be loaded; please try again.", "#c05050");
        return false;
      }
      centerMsg(DATA.DIFFICULTIES[d].name.toUpperCase(), "the world twists to meet you");
      Sfx.play("vox_boss");
      saveGame();
      if (DATA.CAMPAIGN.bossDead(state,"vethriss") && !state.flags.ending) UI.openFinalChoice();
      return true;
    } finally {
      switchingState.difficultyTransition = null;
    }
  }

  function doRespec(p = state.player) {
    let refund = 0;
    for (const rk of Object.values(p.skills)) refund += rk;
    if (!refund) { msg("You have nothing to unlearn.", "#9b8a60"); return; }
    p.skills = {};
    p.clearSkillState();
    const companions=state.minions.filter(m=>m.owner===p&&m.sourceSkill);
    for(const m of companions)m.dead=true; // dismiss quietly; no death-triggered explosions
    state.minions=state.minions.filter(m=>!companions.includes(m));
    state.projectiles=state.projectiles.filter(o=>o.visualOwner!==p && o.minionSource?.owner!==p && (state.players.length>1 || (!o.fromPlayer&&o.minionDmg===undefined)));
    state.traps=state.traps.filter(o=>o.owner!==p);
    state.fx=state.fx.filter(o=>o.owner!==p);
    // Status payloads on monsters are player skill effects. Clear cached zones too.
    const groups=[state.monsters,...Object.values(state.monstersByMap||{})];
    for(const monsters of groups)for(const m of monsters||[]) {
      for(const key of ["poisonDot","scorch","plague","doom","killMark","quarry","curseFrailty","curseWither","sunder","rabies","pulled","beckon"])if(state.players.length===1||m[key]?.owner===p)m[key]=null;
      if(state.players.length===1){m.frozen=0;m.feared=0;m.blindUntil=0;m.slowT=0;m.slowPct=0;m.stunT=0;m.glacierT=0;}
    }
    p.skillPts += refund;
    p.skillL = "basic"; p.skillR = "basic";
    p.quickSlots=[null,null,null,null];
    p.computeStats();
    Sfx.play("shrine");
    centerMsg("MIND SCOURED CLEAN", `${refund} talent points returned`);
    UI.refreshHUD(); UI.renderIfOpen("skills");
    UI.refreshBuffs(); saveGame();
  }

  /* =====================================================================
     COMBAT SUPPORT / EFFECTS
     ===================================================================== */
  function afterDelay(sec, fn) { const m=state.map,surfaceId=TerrainLayers.current(m);delayed.push({ t: state.time + sec, fn:()=>TerrainLayers.scope(m,surfaceId,fn) }); }
  function addFloat(x, y, text, color, big) {
    if(typeof Coop!=="undefined"&&Coop.active)Coop.visual?.('float',{surfaceId:TerrainLayers.current(state.map),x,y,text,color,big});
    if (!options.dmgNumbers && typeof text === "number") return;
    floats.push({ surfaceId:TerrainLayers.current(state.map), x, y, text: "" + text, color, big, t: 0 });
  }
  /* minion-dealt damage — its own toggle, independent of the player dmg-numbers gate */
  function minionFloat(x, y, dmg) {
    if(typeof Coop!=="undefined"&&Coop.active)Coop.visual?.('float',{surfaceId:TerrainLayers.current(state.map),x,y,text:Math.floor(dmg),color:'#9fd0ff',minion:true});
    if (!options.minionDamage) return;
    floats.push({ surfaceId:TerrainLayers.current(state.map), x, y, text: "" + Math.floor(dmg), color: "#9fd0ff", big: false, t: 0 });
  }
  /* damage the PLAYER takes, colored by element (always shown — vital combat feedback).
     P grey · F orange · C blue · L yellow · Ps green (matches the monster-resist palette). */
  const HURT_COL = { phys: "#cfcfcf", fire: "#ff8a3c", cold: "#6fa8ff", light: "#ffe24c", poison: "#7ee06a", shadow: "#c080e0" };
  function playerHurtFloat(x, y, dmg, elem) {
    if(typeof Coop!=="undefined"&&Coop.active)Coop.visual?.('float',{surfaceId:TerrainLayers.current(state.map),x,y,text:Math.max(1,Math.round(dmg)),color:HURT_COL[elem||'phys'],hurt:true});
    floats.push({ surfaceId:TerrainLayers.current(state.map), x, y, text: "" + Math.max(1, Math.round(dmg)), color: HURT_COL[elem || "phys"] || HURT_COL.phys, big: false, t: 0 });
  }
  const MAX_PARTICLES = 700;   // hard cap: cosmetic only — keeps spell-spam / many emitters from flooding the array
  function addParticle(x, y, color) {
    if (particles.length >= MAX_PARTICLES) return;
    particles.push({ surfaceId:TerrainLayers.current(state.map), x, y, vx: U.rf(-1.4, 1.4), vy: U.rf(-2.4, -0.4), z: U.rf(8, 22), color, t: U.rf(0.3, 0.7), grav: 26 });
  }
  function bloodBurst(x, y, n) {
    for (let i = 0; i < n; i++)
      particles.push({ surfaceId:TerrainLayers.current(state.map), x, y, vx: U.rf(-2.4, 2.4), vy: U.rf(-2.4, 2.4), z: U.rf(6, 20), color: Math.random() < 0.8 ? "#8a1414" : "#5a0c0c", t: U.rf(0.25, 0.6), grav: 60 });
  }
  function dustPuff(x, y) {
    if (Math.random() < 0.5) particles.push({ surfaceId:TerrainLayers.current(state.map), x, y, vx: U.rf(-0.6, 0.6), vy: U.rf(-0.6, 0.6), z: 4, color: "#6a6055", t: 0.4, grav: -4 });
  }
  function addNova(x, y, radius, color, presentation) {
    if(typeof Coop!=="undefined"&&Coop.active)Coop.visual?.('nova',{surfaceId:TerrainLayers.current(state.map),x,y,radius,color,hideRadius:!!presentation?.hideRadius});
    novas.push({ surfaceId:TerrainLayers.current(state.map), x, y, radius, color, t: 0, dur: 0.35, hideRadius:!!presentation?.hideRadius,
      styled:typeof SkillVFX!=='undefined'&&SkillVFX.area(x,y,radius,state.player,presentation) });
    // Radius visibility is cosmetic; retain prop destruction and its rewards.
    if (radius >= 1.2) breakPropsNear(x, y, radius * 0.9);
  }
  /* a jagged lightning arc between two world points (Arc Lattice, Thunderstorm) */
  function lightningBolt(x0, y0, x1, y1, color) {
    if(typeof Coop!=="undefined"&&Coop.active)Coop.visual?.('bolt',{surfaceId:TerrainLayers.current(state.map),x0,y0,x1,y1,color});
    bolts.push({ surfaceId:TerrainLayers.current(state.map), x0, y0, x1, y1, color: color || "#fff080", t: 0, dur: 0.22, seed: (Math.random() * 1000) | 0, styled:typeof SkillVFX!=='undefined'&&SkillVFX.beam(x0,y0,x1,y1) });
  }
  /* a straight glowing beam between two world points (beam-type skills) */
  function beamFx(x0, y0, x1, y1, color) {
    if(typeof Coop!=="undefined"&&Coop.active)Coop.visual?.('bolt',{surfaceId:TerrainLayers.current(state.map),x0,y0,x1,y1,color,straight:true,width:6.5});
    bolts.push({ surfaceId:TerrainLayers.current(state.map), x0, y0, x1, y1, color: color || "#fff080", t: 0, dur: 0.2, seed: 0, straight: true, width: 6.5, styled:typeof SkillVFX!=='undefined'&&SkillVFX.beam(x0,y0,x1,y1) });
  }
  function spawnProjectile(o) {
    if(o.mon&&typeof Act1EnemyAnimation!=='undefined'&&Act1EnemyAnimation.eligible(o.mon)&&o.lift===undefined){
      const art=DATA.SPRITE_MANIFEST.entries[DATA.SPRITE_MANIFEST.maps.monsters[o.mon.def.artId||o.mon.def.sprite]],bounds=art?.hitShapes?.[0]?.bounds;
      o={...o,lift:((bounds?bounds[3]-bounds[1]:art?.cell?.[1])||110)*(o.mon.scale||1)*.5*ACTOR_BODY_SCALE*.55};
    }
    if(o.fromPlayer||o.minionDmg!==undefined){
      o={...o,sourceSkill:o.sourceSkill||o.minionSource?.sourceSkill||(o.visualOwner||state.player)._castingSkillId||'basic',visualOwner:o.visualOwner||state.player};
    }
    if(o.fromPlayer&&o.kind==='arrow'){
      const p=o.visualOwner||state.player,origin=Player3D.projectileOrigin?.(p,ACTOR_BODY_SCALE);
      if(origin)o={...o,x:p.x+origin.x,y:p.y+origin.y,lift:origin.lift+(p.jumpZ||0)+elevLift(p.x,p.y,p.surfaceId)};
    }
    o.surfaceId ??= TerrainLayers.current(state.map);
    const projectile=new Projectile(o);
    if(typeof SkillVFX!=='undefined')SkillVFX.registerProjectile(projectile,o.visualOwner||state.player);
    state.projectiles.push(projectile);
  }
  function clearTraversal(ent) {
    ent.jumping = null; ent.jumpZ = 0; ent.jumpCdUntil = 0;
    ent._pendingClick = null; ent._navPendingGoal = null; ent._navGoal = null;
    ent._navCache = null; ent._navStall = 0; ent._navRetryAt = 0;
  }
  function repath(ent, tx, ty, surfaceId = ent.command?.point?.surfaceId ?? ent.command?.target?.surfaceId ?? ent.command?.obj?.surfaceId ?? ent.command?.gi?.surfaceId ?? ent._navGoal?.surfaceId ?? ent.surfaceId ?? 0) {
    if (ent.jumping) { ent._navPendingGoal = {x: tx, y: ty, surfaceId}; return; }
    const m = state.map, now = state.time, cache = ent._navCache;
    ent._navGoal = {x: tx, y: ty, surfaceId};
    if (cache && cache.map === m && cache.surfaceId===surfaceId) {
      const drift = Math.hypot(tx-cache.x,ty-cache.y), age = now-cache.time;
      if ((drift < .15 && (ent.path?.length || age < .4)) || (ent.path?.length && drift < 2 && age < .2)) return;
    }
    ent._navCache = {map: m, x: tx, y: ty, time: now,surfaceId};
    ent.path = TerrainNavigation.findPath(m, ent, {x: tx, y: ty, surfaceId}, {hop: !!ent.autoHop, radius: ent.radius, speed: ent.stats?.moveSpeed || ent.speed || ent.def?.speed || 4.5});
  }
  function finishTraversal(ent) {
    if (ent === state.player && groundHold) {
      ent._pendingClick = null; ent._navPendingGoal = null;
      if (groundHold.active) return;
    }
    if (ent._pendingClick && ent === state.player) {
      const input = ent._pendingClick; ent._pendingClick = null; ent._navPendingGoal = null;
      const previous = {...mouse}; Object.assign(mouse, input.mouse);
      if (input.world) { const cam = camera(); mouse.x = U.isoX(input.world.x,input.world.y)-cam.x; mouse.y = U.isoY(input.world.x,input.world.y)-cam.y-elevLift(input.world.x,input.world.y); }
      handleClick(input.rightBtn); Object.assign(mouse, previous);
    } else if (ent._navPendingGoal) {
      const goal = ent._navPendingGoal; ent._navPendingGoal = null; ent._navCache = null;
      repath(ent, goal.x, goal.y);
    }
  }

  /* traversal jump: arc toward the cursor (clamped), clearing gaps/cliffs, landing on walkable ground */
  function tryJump(point = null) {
    if(typeof Coop!=="undefined"&&Coop.active&&!Coop.authority)return Coop.submit({type:"jump",point:point||steeringPoint()});
    const p = state.player;
    if (!p || p.dead || p.jumping || p.leaping || p.dashing || p.charging || p.spinning) return;
    if (state.time < (p.jumpCdUntil || 0)) return;
    if (UI.anyOpen && UI.anyOpen()) return;
    const w = point || screenToWorld(mouse.x, mouse.y);
    if(!w||(w.surfaceId??0)!==(p.surfaceId??0))return;
    const d = U.dist(p.x, p.y, w.x, w.y) || 0.001, maxR = 4.2;
    let tx = w.x, ty = w.y;
    if (d > maxR) { tx = p.x + (w.x - p.x) / d * maxR; ty = p.y + (w.y - p.y) / d * maxR; }
    const footing=(x,y)=>state.map.surfaceVersion ? TerrainSurface.supported(state.map,x,y,p.radius) : MapGen.walkable(state.map,x,y);
    if(!footing(p.x,p.y))return;
    if (!footing(tx, ty)) {   // pull the landing back to the furthest supported point on the ray
      let ok = false;
      for (let s = Math.min(d, maxR); s >= 1; s -= 0.5) { const cx = p.x + (w.x - p.x) / d * s, cy = p.y + (w.y - p.y) / d * s; if (footing(cx, cy)) { tx = cx; ty = cy; ok = true; break; } }
      if (!ok) { msg("No footing there.", "#9a9a9a"); return; }
    }
    p.command = null; p.path = null; p.face(tx, ty);
    p.jumping = { fx: p.x, fy: p.y, tx, ty, t: 0, dur: 0.42 };
    p.jumpCdUntil = state.time + 0.65;
  }

  /* records the chosen ending, marks the saga complete, then saves */
  function recordEnding(key) {
    if (!state || !["destroy","seal","give"].includes(key) || state.flags.ending || !DATA.CAMPAIGN.bossDead(state,"vethriss")) return;
    if (state.quests.q18?.state === "reward") completeQuest("q18");
    state.flags.ending = key;
    state.flags.sagaComplete = true;
    saveGame();
  }

  /* ---------------- deaths & drops ---------------- */
  function onMonsterDeath(mon, source) {
    const p = playerOwner(source) || closestPlayer(mon) || state.player;
    if(typeof Coop!=="undefined"&&Coop.active)Coop.monsterDied(mon);
    if(mon.bossOwner)return; // Encounter-owned adds are never a reward or quest farm.
    if(mon.openingId && state.flags.opening?.defeated.includes(mon.openingId))return;
    for(const hero of (typeof Coop!=="undefined"&&Coop.active ? state.players.filter(p=>p.connected!==false) : [p])) hero.gainXp(Math.max(0,Math.floor(mon.def.xp * (1 + Math.max(0, (hero.lvl - mon.lvl)) * -0.08))));
    /* carrion feast: drink life from nearby deaths */
    if (p.stats.lifeOnDeath > 0 && U.dist(p.x, p.y, mon.x, mon.y) < 9) {
      p.healLife(p.stats.lifeOnDeath);
      addParticle(p.x, p.y, "#90ff70");
    }
    /* +Aether after each kill */
    if (p.stats.manaAfterKill > 0) {
      p.mana = Math.min(p.stats.maxMana, p.mana + p.stats.manaAfterKill);
      addParticle(p.x, p.y, "#80b0ff");
    }
    const sourceKind = mon.isBoss ? "boss" : (mon.elite ? "elite" : "normal");
    const drops = Items.rollDrops(mon.lvl, sourceKind, p.stats.mf, p.stats.goldFind);
    scatterDrops(drops, mon.x, mon.y);
    questKillEvent(mon);
    beaconQuestKill(mon);
    ritualQuestKill(mon);
    opening.kill(mon);
    /* fleeing treasure-beast spills a hoard when finally caught */
    if (mon.eventDrops) {
      for (let k = 0; k < mon.eventDrops; k++) scatterDrops(Items.rollDrops(mon.lvl + 3, k === 0 ? "boss" : "elite", p.stats.mf + 40, p.stats.goldFind), mon.x, mon.y);
      Sfx.play("dropUnique");
    }
    if (mon.isBoss) {
      state.flags["dead_" + mon.defId + "@" + state.difficulty] = true;
      if (state.map.cathedral) syncStoryObjects();
      const bossMsgs = {
        morthul: ["MORTHUL HAS FALLEN", "the Sunken Vigil is silent"],
        gravecaller: ["GRAVECALLER HESH IS SILENCED", ""],
        vicar: ["THE CHOIR IS SILENCED", "Vicar Thessaly sings no more"],
        vellath: ["VELLATH IS UNMADE", "the Greymonastery gates stand open"],
        korvath: ["KORVATH FALLS", "the Oathbreaker's vigil ends"],
        mire_mother: ["THE MIRE MOTHER DROWNS", "the marsh exhales"],
        azram: ["AZRAM IS UNCROWNED", "Khal-Zahir goes dark again"],
        empty_archangel: ["THE EMPTY ARCHANGEL FALLS", "the borrowed voice is silent"],
        malthoron: ["MALTHORON IS UNMADE", "there was nothing beneath the armor after all"],
        vethriss: ["VETHRISS, UNVEILED, IS SLAIN", "the lie ends here"],
      };
      const bm = bossMsgs[mon.defId];
      if (bm) { centerMsg(bm[0], bm[1]); Sfx.play("vox_boss"); }
      /* No forward portal: the next act opens only after you carry word back to
         camp and turn the quest in (handled in completeQuest). Just nudge the player home. */
      const act = DATA.ACTS.find(a => a.boss === mon.defId);
      if (act && act.next) {
        const campName = DATA.ZONES[act.camp] ? DATA.ZONES[act.camp].name : "camp";
        afterDelay(3.0, () => msg(`Carry word back to ${campName} — there's a quest to finish before the road south opens.`, "#8fd8ff"));
      }
      /* the final boss triggers the ending choice */
      if (mon.defId === "vethriss") afterDelay(3.5, () => UI.openFinalChoice());
      saveGame();
    }
    updateBossEncounter();
  }
  /* ---------------- Fallen North: beacons & the Oathsworn trio ---------------- */
  const TRIO = ["barb_axe", "barb_pole", "barb_sword"];
  function nearWalkable(map, x, y) {
    x |= 0; y |= 0;
    for (let r = 0; r < 9; r++)
      for (let oy = -r; oy <= r; oy++) for (let ox = -r; ox <= r; ox++)
        if (MapGen.walkable(map, x + ox, y + oy)) return { x: x + ox + 0.5, y: y + oy + 0.5 };
    return { x: x + 0.5, y: y + 0.5 };
  }
  /* BFS the tiles the player can foot-reach from (sx,sy): walkable AND no cliff (|Δelev|>1) between steps */
  function computeReach(map, sx, sy) {
    const W = map.w, H = map.h, reach = new Uint8Array(W * H);
    const ex = sx | 0, ey = sy | 0;
    if (ex < 0 || ey < 0 || ex >= W || ey >= H || !MapGen.walkable(map, ex, ey)) return reach;
    const elev = map.elev, eAt = (x, y) => elev ? elev[x + y * W] : 0;
    const q = [ex + ey * W]; reach[ex + ey * W] = 1;
    const DX = [1, -1, 0, 0], DY = [0, 0, 1, -1];
    for (let qi = 0; qi < q.length; qi++) {
      const i = q[qi], x = i % W, y = (i / W) | 0;
      for (let k = 0; k < 4; k++) {
        const nx = x + DX[k], ny = y + DY[k];
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const ni = nx + ny * W;
        if (reach[ni] || !MapGen.walkable(map, nx, ny)) continue;
        if (map.surfaceVersion ? !TerrainNavigation.segment(map,x+.5,y+.5,nx+.5,ny+.5,.36) : Math.abs(eAt(x,y)-eAt(nx,ny))>1) continue;
        reach[ni] = 1; q.push(ni);
      }
    }
    return reach;
  }
  /* nearest player-reachable tile to (x,y); returns the original point if the reach set is empty */
  function nearestReach(map, reach, x, y) {
    const W = map.w, H = map.h, ix = x | 0, iy = y | 0;
    if (ix >= 0 && iy >= 0 && ix < W && iy < H && reach[ix + iy * W]) return map.surfaceVersion&&!TerrainSurface.supported(map,x,y,.36) ? {x:ix+.5,y:iy+.5} : { x, y };
    for (let r = 1; r < 16; r++)
      for (let oy = -r; oy <= r; oy++) for (let ox = -r; ox <= r; ox++) {
        if (Math.max(Math.abs(ox), Math.abs(oy)) !== r) continue;
        const nx = ix + ox, ny = iy + oy;
        if (nx >= 0 && ny >= 0 && nx < W && ny < H && reach[nx + ny * W]) return { x: nx + 0.5, y: ny + 0.5 };
      }
    return { x, y };
  }
  function beaconAnchors(map) {
    if(map.frontier)return map.frontier.anchors.beacons;
    return [{ x: map.w * 0.30, y: map.h * 0.30 }, { x: map.w * 0.70, y: map.h * 0.42 }, { x: map.w * 0.45, y: map.h * 0.72 }]
      .map((p,i) => ({id:['watch_beacon','burial_beacon','quarry_beacon'][i],...nearWalkable(map, p.x, p.y)}));
  }
  function beaconProgress(q,map) {
    const ids=beaconAnchors(map).map(p=>p.id);
    if(!Array.isArray(q.destroyedBeaconIds))q.destroyedBeaconIds=ids.slice(0,U.clamp(Math.floor(q.beacons||0),0,3));
    q.destroyedBeaconIds=[...new Set(q.destroyedBeaconIds.filter(id=>ids.includes(id)))];
    q.beacons=q.destroyedBeaconIds.length;
  }
  function trioAnchor(q,map) {
    const anchors=beaconAnchors(map),named=anchors.find(a=>a.id===q.trioLandmarkId);
    if(named){q.trioAnchor={x:named.x,y:named.y};return q.trioAnchor;}
    const c=q.trioAnchor,sp=map.spawns.default,reach=computeReach(map,sp.x,sp.y);
    if(c&&Number.isFinite(c.x+c.y)&&TerrainNavigation.clear(map,c.x,c.y,.4)&&reach[(c.x|0)+(c.y|0)*map.w]&&
      (!map.surfaceVersion||TerrainSurface.supported(map,c.x,c.y,.4)))return c;
    const target=anchors.slice().sort((a,b)=>c&&Number.isFinite(c.x+c.y)?U.dist2(a.x,a.y,c.x,c.y)-U.dist2(b.x,b.y,c.x,c.y):0)[0]||sp;
    q.trioLandmarkId=target.id;q.trioAnchor={x:target.x,y:target.y};return q.trioAnchor;
  }
  /* story NPCs that appear/leave based on quest state, in the current map —
     called on map entry AND whenever quest state changes (so they pop in live) */
  function syncConditionalNpcs() {
    if (!state || !state.map) return;
    const here = state.map.id;
    const ensure = (id, cond, x, y) => {
      const present = state.npcs.some(n => n.id === id);
      if (cond && !present) {
        const resident = DATA.TOWN_RESIDENTS[here]?.find(n => n.id === id);
        const spot = nearWalkable(state.map, x, y);
        state.npcs.push(new Npc(id, spot.x, spot.y, { npcArt: resident?.art }));
      }
      else if (!cond && present) state.npcs = state.npcs.filter(n => n.id !== id);
    };
    /* Halvar (a freed miner) waits in Frosthaven once the rescue is turned in,
       until you finish his beacon quest */
    const q8 = state.quests.q8, q8b = state.quests.q8b;
    ensure("freed", here === "frosthaven" && q8 && q8.state === "done"
      && (!q8b || ["offered", "active", "reward"].includes(q8b.state)), 15, 11);
  }
  function setupBeaconQuest(map) {
    if (map.id !== "north_wild") return;
    /* always rebuild the beacon/trio set to match quest progress */
    state.monsters = state.monsters.filter(m => !(m.beacon || TRIO.includes(m.defId)));
    const q = state.quests.q8b;
    if (!q || (q.state !== "active" && q.state !== "reward") || state.flags.fn_temple_open) return;
    beaconProgress(q,map);
    if(q.beacons===3)q.trioSpawned=true; // count-only legacy records can omit the encounter flag
    if (!q.trioSpawned) {
      const anchors = beaconAnchors(map);
      for (const a of anchors)if(!q.destroyedBeaconIds.includes(a.id)){
        const mon=new Monster('beacon',a.x,a.y,{});mon.beaconId=a.id;state.monsters.push(mon);
      }
    } else {
      const killed = q.trioKilled || [];
      /* the Oathsworn hold the ground where they first rose — not the entrance */
      const c = trioAnchor(q,map),reach=computeReach(map,c.x,c.y);
      let n = 0;
      for (const id of TRIO) {
        if (killed.includes(id)) continue;
        const a = (n++) * 2.1, pos = nearestReach(map,reach,c.x + Math.cos(a) * 4, c.y + Math.sin(a) * 4);
        const m = new Monster(id, pos.x, pos.y, {}); state.monsters.push(m);
        /* they wait, un-aggroed, until you come back into their sight */
      }
    }
  }
  function spawnTrio() {
    const q = state.quests.q8b, killed = q.trioKilled || [];
    const c = trioAnchor(q,state.map),reach=computeReach(state.map,c.x,c.y);
    centerMsg("THE OATHSWORN COME", "Korvath's honor-guard rise to the dark");
    Sfx.play("vox_boss"); fx.shake = 6;
    let n = 0;
    for (const id of TRIO) {
      if (killed.includes(id)) continue;
      const a = (n++) * 2.1, pos = nearestReach(state.map,reach,c.x + Math.cos(a) * 5, c.y + Math.sin(a) * 5);
      const m = new Monster(id, pos.x, pos.y, {}); m.aggro = true;
      state.monsters.push(m); addNova(pos.x, pos.y, 1.6, "#9fe0ff");
    }
  }
  /* called from onMonsterDeath for beacon / trio kills */
  function beaconQuestKill(mon) {
    const q = state.quests.q8b;
    if (!q || q.state !== "active") return;
    if (mon.defId === "beacon") {
      beaconProgress(q,state.map);
      const anchor=beaconAnchors(state.map).find(a=>a.id===mon.beaconId)||beaconAnchors(state.map).slice().sort((a,b)=>U.dist2(a.x,a.y,mon.x,mon.y)-U.dist2(b.x,b.y,mon.x,mon.y))[0];
      if(!anchor||q.destroyedBeaconIds.includes(anchor.id))return;
      q.destroyedBeaconIds.push(anchor.id);q.beacons=q.destroyedBeaconIds.length;
      Sfx.play("shrine");
      addNova(mon.x, mon.y, 2.2, "#7fffe0");
      if (q.beacons >= 3 && !q.trioSpawned) {
        q.trioSpawned = true;
        q.trioLandmarkId=anchor.id;q.trioAnchor = { x: anchor.x, y: anchor.y };
        msg("The last beacon shatters — the sky tears open.", "#9fe0ff");
        /* beat for the beacon's death-burst to read, then roll the cinematic;
           the trio rises when it ends (or immediately if the video can't load) */
        afterDelay(0.6, () => UI.playVideo("assets/cine_oathsworn.mp4", spawnTrio));
      } else msg(`A beacon goes dark. (${q.beacons}/3)`, "#7fffe0");
      UI.renderIfOpen("quest");
    } else if (TRIO.includes(mon.defId)) {
      q.trioKilled = q.trioKilled || [];
      if (!q.trioKilled.includes(mon.defId)) q.trioKilled.push(mon.defId);
      if (q.trioKilled.length >= 3) {
        q.state = "reward";
        state.flags.fn_temple_open = true;
        centerMsg("THE OATHSWORN ARE BROKEN", "the barrier over the Shattered Temple falls");
        msg("The temple stands open. Return to Halvar — then end Korvath.", "#7fd87f");
        saveGame();
      } else msg(`One of the Oathsworn falls. (${q.trioKilled.length}/3)`, "#cfe0a0");
      UI.renderIfOpen("quest");
    }
  }
  /* ---------------- Choir ritual sites (q10 destroy site; q11 destroy site → boss) ---------------- */
  function ritualAnchor(map) { return map.act2?.anchors.ritual || nearWalkable(map, map.w * 0.5, map.h * 0.42); }
  function setupRitualQuest(map) {
    /* one source of truth on map entry: rebuild the active quest's site/boss to match state */
    state.monsters = state.monsters.filter(m => !/^(quieting_ritual|drowned_ritual|choirmaster)$/.test(m.defId));
    for (const q of DATA.QUESTS) {
      if (q.type !== "ritual" || q.zone !== map.id) continue;
      const st = state.quests[q.id];
      if (!st || (st.state !== "active" && st.state !== "reward")) continue;
      if (!st.siteDestroyed) {
        const a = ritualAnchor(map);
        state.monsters.push(new Monster(q.target, a.x, a.y, {}));
      } else if (q.boss && !st.bossDead) {
        // Legacy saves store coordinates from the old crypt generator. The
        // authored nave is the stable location for every Act 2 quest state.
        const a = map.act2 ? ritualAnchor(map) : st.bossAnchor || ritualAnchor(map);
        if(map.act2)st.bossAnchor={x:a.x,y:a.y};
        const b = new Monster(q.boss, a.x, a.y, {}); state.monsters.push(b);
      }
    }
  }
  function ritualQuestKill(mon) {
    for (const q of DATA.QUESTS) {
      if (q.type !== "ritual") continue;
      const st = state.quests[q.id];
      if (!st || st.state !== "active") continue;
      if (mon.defId === q.target && !st.siteDestroyed) {
        st.siteDestroyed = true;
        addNova(mon.x, mon.y, 2.8, "#c89ae0"); fx.shake = Math.max(fx.shake, 6);
        Sfx.play("shrine");
        if (q.boss) {
          const a = nearWalkable(state.map, mon.x, mon.y);
          st.bossAnchor = { x: a.x, y: a.y };
          centerMsg("THE RITUAL SHATTERS", "…and something rises to answer for it");
          msg("The ritual heart collapses — the High Choirmaster steps from the dark.", "#c89ae0");
          afterDelay(0.8, () => {
            const b = new Monster(q.boss, a.x, a.y, {}); b.aggro = true;
            state.monsters.push(b);
            addNova(a.x, a.y, 2.2, "#c89ae0"); Sfx.play("vox_boss"); fx.shake = Math.max(fx.shake, 6);
          });
        } else {
          st.state = "reward";
          centerMsg("THE QUIETING IS BROKEN", "the ritual site lies in ruin");
          msg(`${q.name}: done. Return to ${DATA.NPCS[q.giver].name}.`, "#7fd87f");
        }
        UI.renderIfOpen("quest");
      } else if (q.boss && mon.defId === q.boss && st.siteDestroyed && !st.bossDead) {
        st.bossDead = true; st.state = "reward";
          msg(`${q.name}: done. Return to ${DATA.NPCS[q.giver].name}.`, "#7fd87f");
          Sfx.play("questReady");
        UI.renderIfOpen("quest");
      }
    }
  }
  /* ---------------- random world events ---------------- */
  function enemiesByFamily(fam, lvl, at=state.player) {
    const map=state.map,pools=DATA.familyPools(map.id),territories=map.ecology?.territories||[];
    const home=territories.slice().sort((a,b)=>U.dist2(a.x,a.y,at.x,at.y)-U.dist2(b.x,b.y,at.x,at.y))[0];
    if(home&&pools[home.family])return pools[home.family].slice();
    const families=Object.keys(pools),preferred=families.filter(f=>pools[f].some(id=>DATA.ENEMIES[id].family===fam));
    const family=U.pick(preferred.length?preferred:families);
    return (pools[family]||map.zone.spawns||[]).filter(id=>!DATA.ENEMIES[id].boss);
  }
  function placeEvents(map) {
    if (map.cathedral) return; // encounters and rewards have reserved places in these compositions
    if (map.eventsPlaced) return;                   // events are one-time per map instance — don't re-roll (or re-spawn used shrines) on re-entry
    map.eventsPlaced = true;
    map.props = map.props.filter(p => !p.event);
    const z = map.zone;
    if (z.kind === "town" || z.kind === "camp" || z.opening) return;
    const lvl = DATA.effectiveLevel(z.lvl, state.difficulty);
    const pool = DATA.EVENTS.filter(e => (e.minLvl || 1) <= lvl + 2);
    if (!pool.length) return;
    const composition=map.composition||map.act2||map.frontier;
    const random=composition?U.rng(state.seed^U.hash(map.id)^0x77e17):Math.random;
    const anchors=(composition?.anchors.events||[]).slice();
    for(let i=anchors.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[anchors[i],anchors[j]]=[anchors[j],anchors[i]];}
    const count = 1 + (random() < 0.6 ? 1 : 0) + (random() < 0.3 ? 1 : 0);
    const sp = map.spawns.default || { x: 0, y: 0 };
    for (let n = 0; n < count; n++) {
      const ev = U.wpick(pool.map(e => [e, e.weight || 1]),random);
      let x = 0, y = 0, ok = false;
      if(composition){const a=anchors[n];if(!a)continue;x=a.x;y=a.y;ok=TerrainNavigation.clear(map,x,y,.4);}
      for (let tries = 0; !composition && tries < 70 && !ok; tries++) {
        x = 3 + Math.random() * (map.w - 6); y = 3 + Math.random() * (map.h - 6);
        if (MapGen.walkable(map, x, y) && U.dist(x, y, sp.x, sp.y) > 9 &&
            (!map.bossArena || !BossEncounters.insideArena(map.bossArena,x,y,-3))) ok = true;
      }
      if (!ok) continue;
      if (ev.kind === "goblin") {
        const ids = enemiesByFamily("beast", lvl,{x,y});
        const m = map.act2?Act2EnemyCombat.eventSpawn(ids,x,y,{},[],random):new Monster(U.pickR(random,ids), x, y, {});
        if(!m)continue;
        m.flee = true; m.eventDrops = ev.drops || 4; m.name = ev.name; m.tint = ev.color;
        m.def.speed = Math.max(m.def.speed, 3.6) + 1; m.scale *= 0.9; m.spriteOpts.scale = m.scale;
        state.monsters.push(m);
      } else {
        map.props.push({ type: ev.visual || "shrine", x, y, seed: (x * 31 + y * 17) | 0, blocks: false, interact: "event", event: true, ev, label: ev.name });
      }
    }
  }
  function triggerEvent(prop, actor = state.player) {
    if (prop.interact !== "event" || !state.map.props.includes(prop)) return;
    const ev = prop.ev, p = actor;
    prop.spent=true;prop.interact=null;prop.event=false;prop.lootable=false;
    if (prop.type === "chest" || prop.type === "strongbox") prop.opened=true;
    const lvl = DATA.effectiveLevel(state.map.zone.lvl, state.difficulty);
    Sfx.play("shrine"); centerMsg(ev.name, "");
    // Activation is cosmetic; it must not smash neighboring loot containers.
    PropInteractions.effect(prop,state,'activate');
    switch (ev.kind) {
      case "buff": {
        const b = ev.buff;
        p.buffs = p.buffs.filter(x => x.id !== b.id);
        p.buffs.push({ id: b.id, label: b.label, emoji: b.emoji, stats: b.stats, until: state.time + b.dur });
        p.computeStats(); UI.refreshBuffs();
        msg(`${ev.name} — blessing granted.`, ev.color || "#cfe0ff");
        break;
      }
      case "heal":
        p.healLife(p.stats.maxHp * (ev.frac || 0.5));
        if (ev.mana) p.mana = p.stats.maxMana;
        msg("Restored.", "#80d0ff"); Sfx.play("potion");
        break;
      case "gold": {
        const g = Math.floor((40 + lvl * lvl * 0.6) * (ev.gold || 1) * (1 + p.stats.goldFind / 100));
        p.gold += g; msg(`+${g} gold`, "#d8b860"); Sfx.play("coin");
        break;
      }
      case "xp": p.gainXp(Math.floor(DATA.xpForLevel(p.lvl) * (ev.xpFrac || 0.25))); break;
      case "glyph":
        for (let k = 0; k < (ev.count || 2); k++) {
          const it = Items.rollGlyph(lvl, p.stats.mf);
          const a = Math.random() * Math.PI * 2;
          state.ground.push({ surfaceId:TerrainLayers.current(state.map), x: prop.x + Math.cos(a), y: prop.y + Math.sin(a), item: it, toss: 0.3 });
        }
        Sfx.play("dropRare"); msg("Glyphs spill from the stone.", "#7fd8c0");
        break;
      case "cache": {
        const n = ev.drops || 2;
        for (let k = 0; k < n; k++) scatterDrops(Items.rollDrops(lvl + 2, k === 0 ? "chest" : "elite", p.stats.mf + (ev.mf || 0), p.stats.goldFind), prop.x, prop.y + 0.5);
        Sfx.play("chest");
        break;
      }
      case "ambush": case "curse": {
        const ids = enemiesByFamily(ev.fam || U.pick(["undead", "demon", "beast"]), lvl,prop);
        const group=[];
        for (let k = 0; k < (ev.count || 4); k++) {
          const a = Math.random() * Math.PI * 2, r = 1.5 + Math.random() * 2.5;
          const x = prop.x + Math.cos(a) * r, y = prop.y + Math.sin(a) * r;
          if (!state.map.act2 && !MapGen.walkable(state.map, x, y)) continue;
          const options={elite:ev.kind==='curse'&&k===0,monsterFamily:DATA.monsterFamily(ids[0]),packId:state.map.id+':event:'+prop.x+':'+prop.y};
          const m = state.map.act2?Act2EnemyCombat.eventSpawn(ids,prop.x,prop.y,options,group):new Monster(U.pick(ids),x,y,options);
          if(!m)continue;group.push(m);
          m.aggro = true; state.monsters.push(m);
        }
        Sfx.play("vox_boss"); fx.shake = 4;
        msg(ev.kind === "curse" ? "Something stirs — and it left an offering." : "An ambush! Cut them down.", "#ff9060");
        /* the dare pays out immediately */
        scatterDrops(Items.rollDrops(lvl + 3, "boss", p.stats.mf + 30, p.stats.goldFind), prop.x, prop.y + 0.5);
        if (ev.rarity) { const it = Items.rollGear(lvl + 2, ev.rarity); it.identified = false; dropAtFeet(it); }
        break;
      }
    }
    if (typeof UI !== "undefined" && UI.renderIfOpen) UI.renderIfOpen("char");   // reflect buff/heal on an open character sheet
    saveGame();
  }
  function scatterDrops(drops, x, y) {
    for (const d of drops) {
      const a = Math.random() * Math.PI * 2, r = U.rf(0.3, 1.1);
      let tx = x + Math.cos(a) * r, ty = y + Math.sin(a) * r;
      if (!MapGen.walkable(state.map, tx, ty)) { tx = x; ty = y; }
      const gi = {surfaceId:TerrainLayers.current(state.map), x: tx, y: ty, toss: 0.35 };
      if (d.gold) gi.gold = d.gold;
      else gi.item = d.item;
      state.ground.push(gi);
      gi.filt = LootFilter.evaluate(gi, state.player);            // decide presentation once, at drop time
      if (d.item) {
        /* the filter chooses the drop sound; hidden junk is silent to cut clutter */
        if (gi.filt.sound) Sfx.play(gi.filt.sound);
        else if (!gi.filt.hide) Sfx.play(d.item.rarity === "rare" ? "dropRare" : "drop");
        if (d.item.rarity === "unique") msg(`Unique: ${d.item.baseName}!`, Items.RARITY_COLOR.unique);
        else if (d.item.rarity === "set") msg(`Set piece: ${d.item.baseName}!`, Items.RARITY_COLOR.set);
      }
    }
  }
  /* Smash once, retaining nonblocking, visibly broken remains for this expedition. */
  function breakProp(prop, actor = state.player) {
    if (!prop || !prop.breakable || prop.broken) return false;
    const m = state.map, p = actor;
    if (!m.props.includes(prop)||!TerrainLayers.affects(m,prop,p)) return false;
    prop.broken = true;
    prop.breakable=false;
    PropInteractions.freeTile(m,prop);PropInteractions.effect(prop,state,'break');
    Sfx.play(PropInteractions.sound(prop));
    scatterDrops(Items.rollDrops(DATA.effectiveLevel(m.zone.lvl, state.difficulty), "barrel", p.stats.mf, p.stats.goldFind), prop.x, prop.y);
    return true;
  }
  /* skills/AoE: shatter every breakable prop within a radius (called from addNova) */
  function breakPropsNear(x, y, radius) {
    if (!state || !state.map || !state.player || !state.map.props) return;
    const r2 = radius * radius;
    for (const pr of state.map.props) {   // Broken props retain a nonblocking terminal state.
      if (pr.breakable && !pr.broken && U.dist2(x, y, pr.x, pr.y) <= r2) breakProp(pr);
    }
  }
  /* line-shaped AoE (Wall of Fire etc.): shatter breakables within `width` of the segment */
  function breakPropsSeg(x0, y0, x1, y1, width) {
    if (!state || !state.map || !state.player || !state.map.props) return;
    for (const pr of state.map.props.slice()) {
      if (pr.breakable && !pr.broken && distToSeg(pr.x, pr.y, x0, y0, x1, y1) <= width) breakProp(pr);
    }
  }
  function dropAtFeet(item, p = state.player) {
    state.ground.push({ surfaceId:p.surfaceId??0, x: p.x + U.rf(-0.4, 0.4), y: p.y + U.rf(-0.4, 0.4), item, toss: 0.3 });
  }
  function pickupGround(gi, p = state.player) {
    if(typeof Coop!=="undefined"&&Coop.active&&!Coop.committing){Coop.enqueuePickup(gi,p);return;}
    if(!TerrainLayers.same(p,gi))return;
    const i = state.ground.indexOf(gi);
    if (i < 0) return;
    if (gi.gold) {
      p.gold += gi.gold;
      state.ground.splice(i, 1);
      Sfx.play("coin");
      msg(`${gi.gold} gold`, "#d8b860");
      UI.refreshGrids();
      return;
    }
    const it = gi.item;
    /* potions try belt first */
    if (it.kind === "consumable" && it.belt) {
      for (let s = 0; s < 4 && it.count > 0; s++) {
        const slot = p.belt[s];
        if (slot && slot.id === it.baseId && slot.count < 5) { const take = Math.min(5 - slot.count, it.count); slot.count += take; it.count -= take; }
        else if (!slot) { const take = Math.min(5, it.count); p.belt[s] = { id: it.baseId, count: take }; it.count -= take; }
      }
      if (it.count <= 0) {
        state.ground.splice(i, 1);
        Sfx.play("pickup"); UI.refreshBelt();
        return;
      }
    }
    if (Items.autoPlace(p.inv, it)) {
      state.ground.splice(i, 1);
      Sfx.play("pickup");
      msg(`Picked up: ${it.identified ? it.name : it.baseName}`, Items.RARITY_COLOR[it.rarity]);
      UI.refreshGrids(); UI.refreshBelt();
    } else {
      msg("No room in your pack.", "#c08080");
      Sfx.play("error");
    }
  }

  /* play a boss's first-sight cutscene exactly once per character */
  function firstSightCutscene(id, src) {
    if (!state || !state.player || state.player.dead) return;
    const key = "sawCine_" + id;
    if (state.characterFlags[key]) return;
    state.characterFlags[key] = true;
    saveGame();
    UI.playVideo(src, () => {});   // pauses the game; resumes when the clip ends/skips
  }
  function onPlayerDeath(source, hero = state.player) {
    if(typeof Coop!=="undefined"&&Coop.active)return Coop.died(hero);
    resetTouch();
    if(typeof EnemySkills!=="undefined")EnemySkills.cancelAll();
    if(typeof Act2EnemyCombat!=="undefined")Act2EnemyCombat.cancelAll();
    if(typeof SkillVFX!=='undefined')SkillVFX.reset();
    if(typeof SkillAudio!=='undefined')SkillAudio.reset();
    const p = state.player;
    if (p.dead) return;
    p.dead = true;
    p.clearVeilState();
    if(typeof BossEncounters!=="undefined")BossEncounters.cancelAll();
    p.deaths++;
    /* sever every intent the corpse might still be carrying */
    p.command = null; p.path = null; heldTarget = null; cancelGroundHold();
    p.dashing = null; p.leaping = null; p.spinning = null; clearTraversal(p);
    /* drop all bespoke transient states so death is a clean slate */
    p.charging = null; p.drawing = null; p.siphon = null; p.boneWard = null; p.coat = null;
    p.stance = null; p.tempo = 0; p.tempoUntil = 0; p.rootT = 0; p.parryReadyUntil = 0; p.skillCd = {}; p.staticChg = 0;
    p.buffs = p.buffs.filter(b => !b.id.startsWith("stance_") && b.id !== "serrated" && b.id !== "banner_aura" && b.id !== "smoke_evasion");
    p.healPool = 0; p.manaPool = 0;
    p.startAction("death", 0.8);
    Sfx.stopMusic();
    Sfx.play("death");
    fx.shake = 6;
    /* the dead are no threat — every enemy disengages and drifts back to idle */
    for (const mon of state.monsters) {
      mon.cancelAttacks?.();
      if (mon.dead) continue;
      mon.aggro = false; mon.path = null;
      mon.leaping = null; mon.whirling = null; mon.dashing = null;
      if (mon.action && mon.action.state === "attack") mon.action = null;
      mon.repathT = 0.6 + Math.random();
    }
    // Preserve their collapse animations without stacking an entire army's
    // synthetic death noises over the player's recorded voice.
    for (const mi of state.minions) mi.die({ silent: true });
    if (p.hardcore) {
      centerMsg("YOU HAVE FALLEN", `${p.name} is gone forever — hardcore knows no mercy`);
      deleteSave(saveSlotKey);
      afterDelay(3.5, () => { running = false; state = null; Sfx.stopDeath(); Sfx.stopSkills?.(); Sfx.stopMusic(); UI.closeAll(); UI.showTitle(); });
    } else {
      const lost = Math.floor(p.gold * 0.1);
      p.gold -= lost;
      const homeName = DATA.ZONES[state.home] ? DATA.ZONES[state.home].name : "safety";
      UI.showDeath(lost, homeName);
    }
  }

  let returningToTown = false;
  async function returnToTown() {
    if (returningToTown || !state?.player.dead || state.player.hardcore) return false;
    returningToTown = true;
    try {
      // Revive only after town assets load, before town autosave and music.
      const entered = await enterMap(state.home || "frosthaven", "default", { revive: true, openingMode:"skip" });
      if (entered) UI.hideDeath();
      return entered;
    } finally { returningToTown = false; }
  }

  /* =====================================================================
     INTERACTION (props, portals, shrines)
     ===================================================================== */
  function interact(prop, p = state.player) {
    if(typeof Coop!=="undefined"&&Coop.active&&!Coop.committing){Coop.enqueueInteraction(prop,p);return;}
    if(!TerrainLayers.same(p,prop))return;
    return TerrainLayers.scope(state.map,p,()=>interactOnSurface(prop,false,p));
  }
  function interactOnSurface(prop, committed=false, p=state.player) {
    if(!committed&&PropInteractions.profile(prop))return PropInteractions.begin(state,prop,()=>{if(typeof Coop!=="undefined"&&Coop.active)Coop.finishInteraction(prop,p);else interactOnSurface(prop,true,p);},p);
    if(typeof Coop!=="undefined"&&Coop.active&&Coop.openInteraction(prop,p))return;
    if(opening.interact(prop))return;
    if (prop.storyId) return interactStory(prop);
    /* people get a conversation (the board is a special "NPC") */
    if (prop.isNpc || (prop.def && DATA.NPCS[prop.id])) {
      if (prop.survivor) { rescueSurvivor(prop); return; }   // free the trapped, don't chat
      Sfx.play("click");
      if (prop.def && prop.def.role === "board") UI.openBoard();
      else UI.openDialog(prop);
      return;
    }
    if (prop.interact === "storage") { Sfx.play("chest"); UI.openStorage(); return; }
    if (prop.interact === "forge") { Sfx.play("forge"); UI.openForge(); return; }
    if (prop.interact === "board") { Sfx.play("click"); UI.openBoard(); return; }
    if (prop.interact === "caravan") { Sfx.play("click"); UI.openShrine(true); return; }   // the war-caravan: fast travel between attuned places
    if (prop.interact === "event") { triggerEvent(prop,p); return; }   // random world event
    if (prop.interact === "memory_lore") { msg(prop.lore,"#d8c79a"); centerMsg(prop.label,"A fragment the cathedral could not erase"); return; }
    if (prop.interact === "shrine") {
      const zid = state.map.id;
      if (!state.shrines.includes(zid)) {
        state.shrines.push(zid);
        Sfx.play("shrine");
        centerMsg("SHRINE ATTUNED", state.map.zone.name);
        saveGame();
        msg("Autosaved.", "#6a7a5a");
      }
      UI.openShrine();
      return;
    }
    if(prop.searchable){
      if(prop.searched)return false;
      prop.searched=true;prop.interact=null;
      Sfx.play(PropInteractions.sound(prop));
      scatterDrops(Items.rollDrops(DATA.effectiveLevel(state.map.zone.lvl,state.difficulty),'barrel',p.stats.mf,p.stats.goldFind),prop.x,prop.y+.5);
      return true;
    }
    if (prop.breakable) return breakProp(prop,p);
    if (prop.lootable) {
      if (prop.encounterLock && state.monsters.some(mon=>!mon.dead && mon.cathedralEncounter===prop.encounterLock)) {
        msg("Defeat the guardians of this memory to open its cache.","#d8b880"); return false;
      }
      prop.lootable = false;
      prop.opened = true;
      Sfx.play("chest");
      scatterDrops(Items.rollDrops(DATA.effectiveLevel((state.map.zone.lvl || 1) + 1, state.difficulty), "chest", p.stats.mf + (prop.rich ? 40 : 0), p.stats.goldFind), prop.x, prop.y + 0.6);
      return;
    }
  }
  function isHub(id) { return id === "town" || (DATA.ZONES[id] && DATA.ZONES[id].kind === "camp"); }
  function safeArrival(map, point) {
    const p=point || map.spawns.default || {x:map.w/2,y:map.h/2};
    const supported=(x,y)=>MapGen.walkable(map,x,y,p.surfaceId??0) && (!map.surfaceVersion || TerrainSurface.supported(map,x,y,state.player.radius,p.surfaceId??0));
    if (Number.isFinite(p.x) && Number.isFinite(p.y) && supported(p.x,p.y)) return p;
    let best=null, distance=Infinity;
    for(let y=0;y<map.h;y++)for(let x=0;x<map.w;x++) {
      const d=(x+.5-p.x)**2+(y+.5-p.y)**2;
      if(d<distance && supported(x+.5,y+.5)){distance=d;best={x:x+.5,y:y+.5,surfaceId:p.surfaceId??0};}
    }
    return best || map.spawns.default;
  }
  function canTradeWith(npc) { return !npc.survivor && (npc.def || DATA.NPCS[npc.id])?.role === "vendor"; }
  let travelPending=false;
  function castPortal() {
    if(typeof Coop!=="undefined"&&Coop.active&&!Coop.committing)return Coop.submit({type:"portal"});
    if (isHub(state.map.id)) { msg("You are already home.", "#9b8a60"); return false; }
    state.portal = { surfaceId:state.player.surfaceId, mapId: state.map.id, x: state.player.x, y: state.player.y + 0.4, returnPosition:{x:state.player.x,y:state.player.y,surfaceId:state.player.surfaceId}, home: state.home || "frosthaven",
      instance:{map:state.map,monsters:state.monsters,ground:state.ground} };
    Sfx.play("portalOpen");
    msg("A doorway home tears open.", "#8fd8ff");
    return true;
  }
  async function usePortal() {
    const t=state.portal, origin=state;
    if (!t || travelPending || ![t.home,t.mapId].includes(state.map.id) || (state.map.id!==t.home && t.instance && state.map!==t.instance.map)) return false;
    travelPending=true;
    try {
      const returning=state.map.id===t.home;
      const ok=await enterMap(returning?t.mapId:t.home,returning?"default":"portal",{
        arrivalPosition:returning?(t.returnPosition || {x:t.x,y:t.y}):null,reuseCachedMap:returning?(t.instance||true):false,recoverable:true});
      if(ok && state===origin) Sfx.play("teleportTravel");
      else if(state===origin) msg("The portal could not open the road. Try again.","#d8b880");
      return !!ok && state===origin;
    } finally {travelPending=false;}
  }
  async function travelToShrine(zid) {
    if(travelPending || zid===state.map.id || !state.shrines.includes(zid) || !DATA.ZONES[zid])return false;
    const origin=state;travelPending=true;
    try {
      const ok=await enterMap(zid,"shrine",{recoverable:true});
      if(ok && state===origin)Sfx.play("teleportTravel");
      return !!ok && state===origin;
    } finally {travelPending=false;}
  }

  /* =====================================================================
     INPUT
     ===================================================================== */
  function bindInput() {
    const updateMouse = e => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = (e.clientX - rect.left) * canvas.width / rect.width;
      mouse.y = (e.clientY - rect.top) * canvas.height / rect.height;
    };
    canvas.addEventListener("contextmenu", e => e.preventDefault());
    canvas.addEventListener("mousedown", e => {
      if (e.sourceCapabilities?.firesTouchEvents) return;
      if (!running || !state) return;
      if (UI.escOpen() || UI.cinematicActive()) return;
      Sfx.init();
      updateMouse(e);
      if (e.button === 0) { cancelGroundHold(); mouse.l = true; heldTarget = null; }
      if (e.button === 2) { cancelGroundHold(); mouse.r = true; }
      mouse.shift = e.shiftKey;
      handleClick(e.button === 2);
    });
    window.addEventListener("mouseup", e => {
      if(typeof Coop!=="undefined"&&Coop.active){CoopInput.release(e.button);if(e.button===0)mouse.l=false;if(e.button===2)mouse.r=false;return;}
      if (e.button === 0) { mouse.l = false; heldTarget = null; cancelGroundHold(); }
      if (e.button === 2) mouse.r = false;
      /* loosing a held bow: release the Drawn Shot on button-up and clear the hold command so it doesn't re-nock */
      if (state && state.player && state.player.drawing) { state.player.releaseDraw(); state.player.command = null; }
    });
    canvas.addEventListener("mousemove", updateMouse);
    window.addEventListener("keydown", e => {
      const k = e.key.toLowerCase();
      if (k === "escape" && e.repeat) { e.preventDefault(); return; }
      if (UI.escOpen()) return;
      if (!running || !state || state.player.dead) return;
      if (e.key === "Shift") { cancelGroundHold(); mouse.shift = true; }
      if (e.key === "Alt") { mouse.alt = true; e.preventDefault(); }
      if (document.activeElement && ["INPUT","TEXTAREA","SELECT"].includes(document.activeElement.tagName)) { if (k === "escape" && UI.anyOpen()) { UI.closeAll(); e.preventDefault(); } return; }
      if (k === LootFilter.config.revealKey) LootFilter.setReveal(true);   // hold to reveal hidden loot (faded)
      if(['f1','f2','f3','f4',' ','spacebar','escape'].includes(k))PropInteractions.cancel(state);
      switch (k) {
        case "1": case "2": case "3": case "4": state.player.quaff(+k - 1); break;
        case "i": UI.togglePanel("inv"); break;
        case "c": UI.togglePanel("char"); break;
        case "t": case "s": UI.togglePanel("skills"); break;
        case "q": UI.togglePanel("quest"); break;
        case "m": mapOverlay = !mapOverlay; break;
        case "l": LootFilter.setEnabled(!LootFilter.config.enabled); msg("Loot filter " + (LootFilter.config.enabled ? "on." : "off."), "#9b8a60"); break;
        case "f1": case "f2": case "f3": case "f4": UI.quickCast(+k[1] - 1); e.preventDefault(); break;
        case " ": case "spacebar": tryJump(); e.preventDefault(); break;   // hop toward the cursor
        case "escape":
          if (UI.anyOpen()) UI.closeAll();
          else UI.openEsc();
          break;
        case "`": case "~": UI.toggleDebug(); break;
      }
    });
    window.addEventListener("keyup", e => {
      if (e.key === "Shift") mouse.shift = false;
      if (e.key === "Alt") mouse.alt = false;
      if (e.key.toLowerCase() === LootFilter.config.revealKey) LootFilter.setReveal(false);
    });
    window.addEventListener("blur", () => { cancelGroundHold(); heldTarget = null; mouse.l = mouse.r = mouse.shift = mouse.alt = false; LootFilter.setReveal(false); });
  }

  let camPos = null, shakeOx = 0, shakeOy = 0;
  function renderPosition(actor) {
    return typeof CoopMotion!=="undefined"&&typeof Coop!=="undefined"&&Coop.active&&Coop.host ? CoopMotion.sample(actor,Coop.renderAlpha) : actor;
  }
  function updateCamera(dt) {
    if (!state) return;
    const p = renderPosition(opening.cameraTarget() || state.player);
    const tx = U.isoX(p.x, p.y) - canvas.width / 2;
    const ty = U.isoY(p.x, p.y) - canvas.height / 2 - 20 - surfaceLift(p.x,p.y,p.surfaceId);
    if (!camPos) camPos = { x: tx, y: ty };
    const k = 1 - Math.exp(-dt * 8);            // gentle ease toward the player
    camPos.x += (tx - camPos.x) * k;
    camPos.y += (ty - camPos.y) * k;
    if (fx.shake > 0 && options.screenShake) {
      shakeOx = U.rf(-fx.shake, fx.shake); shakeOy = U.rf(-fx.shake, fx.shake);
    } else { shakeOx = 0; shakeOy = 0; }
  }
  function camera() {
    if (!camPos) updateCamera(0.016);
    return { x: camPos.x + shakeOx, y: camPos.y + shakeOy };
  }
  function screenToWorld(sx, sy) {
    const cam = camera();
    return TerrainNavigation.groundPoint(state.map, sx + cam.x, sy + cam.y, EH,state.player.surfaceId);
  }
  function steeringPoint() {
    const picked = screenToWorld(mouse.x, mouse.y);
    if (picked) return picked;
    const cam = camera(), p = state.player;
    const sx = mouse.x + cam.x, sy = mouse.y + cam.y + elevLift(p.x,p.y,p.surfaceId);
    return {x: U.unisoX(sx, sy), y: U.unisoY(sx, sy)};
  }
  function cancelGroundHold() {
    if (!groundHold) return;
    const p = state?.player;
    if (p) {
      if (groundHold.active) {
        if (p.command?.type === "steer") p.command = null;
        p.path = null; p._navGoal = null; p._navCache = null; p._navStall = 0;
        if (!p.jumping) { p.moving = false; p.curSpeed = 0; }
      }
      p._navPendingGoal = null;
      if (!p._pendingClick?.rightBtn) p._pendingClick = null;
    }
    groundHold = null;
  }

  // Dismissing a menu must not replay a held gesture or release a charged shot.
  function cancelMenuInput() {
    if(typeof Coop!=="undefined"&&Coop.active&&!Coop.loading)Coop.submit({type:"stop"});
    resetTouch(); cancelGroundHold();
    heldTarget = null; mouse.l = mouse.r = mouse.shift = mouse.alt = false;
    LootFilter.setReveal(false);
    const p = state?.player;
    if (!p) return;
    PropInteractions.cancel(state);
    p.command = null; p.path = null; p.drawing = null;p._coopMotion=null;p._predictPath=null;
    p._navGoal = null; p._navCache = null; p._navPendingGoal = null; p._pendingClick = null;
    if (!p.jumping) { p.moving = false; p.curSpeed = 0; }
  }

  /* attacks repeat while you hold the button on a target; summons, transforms,
     buffs, totems and toggles must fire ONCE per click (never auto-repeat). */
  const NO_REPEAT_SKILL = new Set(["summon", "summon_golem", "form", "minionbuff", "buff", "totem", "ward",
    "banner", "banner_ultimate", "sacrifice", "fireclaw", "combat_stance", "parry_stance", "warshout_debuff",
    /* deploy-once skills: holding the cast on a target must NOT re-deploy every frame (drains all aether) */
    "roamaoe", "groundfield", "firewall", "trap", "dragnet", "decoy", "tripwire", "rain"]);
  function repeatSkill(skillId) {
    const sk = skillId === "basic" ? DATA.BASIC_ATTACK : DATA.SKILLS[skillId];
    return !(sk && NO_REPEAT_SKILL.has(sk.type));
  }

  // Touch input is separate from the mouse so a second finger cannot steal
  // the movement gesture or move the aim underneath a held skill.
  function touchReady() {
    return !!(!(typeof MobileShell!=='undefined'&&MobileShell.blocked) && running && state && !state.player.dead && !UI.escOpen() &&
      !UI.cinematicActive() && !UI.anyOpen() && !UI.cursorItem);
  }
  function stopTouchMovement() {
    const p = state?.player;
    if (!p?.command?.touch) return;
    p.command = null; p.path = null; p._navGoal = null; p._navCache = null;
    p._navPendingGoal = null; p._pendingClick = null;
    if (!p.jumping) { p.moving = false; p.curSpeed = 0; }
  }
  function resetTouch() {
    if(typeof CoopInput!=="undefined")CoopInput.resetTouch();
    touch.x = touch.y = 0; touch.side = null; touch.castOnce = false;
    stopTouchMovement();
    // Cancellation must not fire a charged shot into a menu or a new map.
    if (state?.player?.drawing?.touch) state.player.drawing = null;
    if (typeof MobileControls !== 'undefined') MobileControls.releasePointers();
  }
  function touchMove(x, y) {
    if(typeof Coop!=="undefined"&&Coop.active)return CoopInput.touchMove(x,y);
    if (!touchReady() || !Number.isFinite(x) || !Number.isFinite(y)) return;
    cancelGroundHold(); mouse.l = mouse.r = false; heldTarget = null;
    const wx = U.unisoX(x, y), wy = U.unisoY(x, y), length = Math.hypot(wx, wy);
    touch.x = length ? wx / length : 0; touch.y = length ? wy / length : 0;
    if (!length) {
      const p = state.player;
      if (p.command) p.command.touch = true;
      stopTouchMovement();
    }
    else { PropInteractions.cancel(state); touchUpdate(); }
  }
  function touchAim() {
    const p = state.player, moving = touch.x || touch.y;
    const [x,y] = moving ? [touch.x,touch.y] : U.screenVecToWorld(p.visAng);
    return {x:p.x + x * 4.2, y:p.y + y * 4.2, surfaceId:p.surfaceId};
  }
  function castTouchSkill() {
    const p = state.player, id = p['skill' + touch.side], sk = p.resolveSkill(id);
    if (!sk || p.action || p.jumping || p.drawing || p.stunT > 0 || p.leaping || p.dashing || p.charging || p.spinning) return;
    if (touch.castOnce && !repeatSkill(id)) return;
    if (state.time < touch.nextCast || state.time < (p.skillCd[id] || 0)) return;
    touch.nextCast = state.time + .2;
    if (id !== 'basic' && p.effRank(id) <= 0) return;
    // Avoid repeating error sounds every frame while a button is held.
    const turningOff = sk.type === 'form' ? p.buffs.some(b=>b.id === 'form_'+sk.form)
      : ['combat_stance','parry_stance'].includes(sk.type) && p.stance === sk.stanceId;
    if (!p.canUseSkillWeapon(id) || (id !== 'basic' && !turningOff && !p.canPay(sk,p.effRank(id)))) return;
    TerrainLayers.scope(state.map, p, () => {
      const cam = camera(), walk = (x,y) => MapGen.walkable(state.map,x,y);
      let target = null, nearest = Infinity;
      for (const mon of state.monsters) {
        if (mon.dead || mon.husk || !TerrainLayers.same(mon,p)) continue;
        const distance = U.dist(p.x,p.y,mon.x,mon.y);
        const reach = p.skillTargetRange(id,mon) ?? (sk.type === 'melee'
          ? (p.stats.ranged ? 9 : p.stats.range + mon.radius + .25)
          : sk.type === 'spellnova' ? Math.max(1.2,sk.radius(Math.max(1,p.effRank(id))) - .3) : 8.5);
        if (distance > reach || distance >= nearest) continue;
        const sx=U.isoX(mon.x,mon.y)-cam.x, sy=U.isoY(mon.x,mon.y)-cam.y-elevLift(mon.x,mon.y,mon.surfaceId);
        if (sx < 0 || sy < 0 || sx > canvas.width || sy > canvas.height || !U.los(walk,p.x,p.y,mon.x,mon.y)) continue;
        target=mon; nearest=distance;
      }
      if (sk.type === 'melee' && !target) return;
      PropInteractions.cancel(state);
      p.command = null; p.path = null; p._pendingClick = null; p._navPendingGoal = null;
      if (p.performSkill(id,target,touchAim())) touch.castOnce = true;
      if (p.drawing) p.drawing.touch = true;
    });
  }
  function touchSkill(side, down) {
    if(typeof Coop!=="undefined"&&Coop.active)return CoopInput.touchSkill(side,down);
    if (!['L','R'].includes(side)) return;
    if (!down) {
      if (touch.side !== side) return;
      touch.side = null;
      if (state?.player?.drawing?.touch) state.player.releaseDraw();
      return;
    }
    if (!touchReady()) return;
    cancelGroundHold(); mouse.l = mouse.r = false; heldTarget = null;
    state.player.command = null; state.player.path = null;
    state.player._pendingClick = null; state.player._navPendingGoal = null;
    touch.side = side; touch.castOnce = false; touch.nextCast = 0;
    castTouchSkill();
  }
  function touchUpdate() {
    if (!touch.x && !touch.y && !touch.side) return false;
    if (!touchReady()) { resetTouch(); return false; }
    const p = state.player;
    if (touch.x || touch.y) {
      p.path = null; p._navGoal = null; p._navCache = null; p._navStall = 0;
      p._pendingClick = null; p._navPendingGoal = null;
      p.command = {type:'steer', point:touchAim(), touch:true};
    }
    if (touch.side) castTouchSkill();
    return true;
  }
  function touchTap(clientX, clientY) {
    if (!touchReady()) return;
    resetTouch(); cancelGroundHold();
    const rect = canvas.getBoundingClientRect();
    mouse.x = (clientX-rect.left)*canvas.width/rect.width;
    mouse.y = (clientY-rect.top)*canvas.height/rect.height;
    mouse.l = mouse.r = mouse.shift = false; heldTarget = null;
    handleClick(false);
    if (state.player.command?.type === 'attack') state.player.command.hold = false;
  }
  function touchAction(action) {
    if (!running || !state || state.player.dead || UI.cinematicActive()) return;
    if (action === 'menu') {
      resetTouch();
      if (UI.escOpen()) UI.closeEsc();
      else if (UI.anyOpen()) UI.closeAll();
      else UI.openEsc();
    } else if (touchReady()) {
      if (action === 'jump') { PropInteractions.cancel(state); tryJump(touchAim()); }
      if (action === 'map') mapOverlay = !mapOverlay;
      if (action === 'loot') { options.alwaysLabels = !options.alwaysLabels; saveOptions(); }
    }
  }
  function handleClick(rightBtn) {
    return TerrainLayers.scope(state.map,state.player,()=>handleSurfaceClick(rightBtn));
  }
  function handleSurfaceClick(rightBtn) {
    if(typeof Coop!=="undefined"&&Coop.active){updateHover();return CoopInput.click(rightBtn,coopPointer());}
    const p = state.player;
    if (p.dead) return;
    if (p.jumping && (rightBtn || mouse.shift)) { const world=screenToWorld(mouse.x,mouse.y);if(world)p._pendingClick = {rightBtn, mouse: {...mouse}, world}; return; }
    p._navCache = null; // Explicit clicks take effect immediately; held steering is throttled.
    /* a held item + a click on the game world (not a panel — those capture their
       own clicks) drops it on the ground at your feet */
    if (UI.cursorItem && !rightBtn) {
      dropAtFeet(UI.cursorItem);
      Sfx.play("drop");
      UI.setCursorItem(null);
      return;
    }
    updateHover();
    const w = screenToWorld(mouse.x, mouse.y);
    if(p.action?.propInteraction){
      if(!rightBtn&&!mouse.shift&&hoverProp===p.action.propInteraction.prop)return;
      PropInteractions.cancel(state);
    }
    const skill = rightBtn ? p.skillR : p.skillL;

    // A ground press owns its hold even if picking a cliff supplies no route.
    // During jumps, only ground steering is immediate; targeted clicks queue.
    const groundPress = !rightBtn && !mouse.shift && !hoverPortal && !hoverExit && !hoverNpc && !hoverLabel && !hoverProp &&
      (!hoverMon || options.leftClickMove);
    if (groundPress && mouse.l) groundHold = {startedAt: performance.now(), active: false};
    if (p.jumping) { if (w) p._pendingClick = {rightBtn, mouse: {...mouse}, world: w}; return; }

    if (!rightBtn) {
      if (hoverPortal) {
        const useIt = hoverPortal.gate ? () => enterMap(hoverPortal.target, "default") : usePortal;
        if (U.dist(p.x, p.y, hoverPortal.x, hoverPortal.y) < 1.8) { p.command = null; useIt(); }
        else { p.command = { type: "interact", obj: hoverPortal, portal: true, run: useIt }; repath(p, hoverPortal.x, hoverPortal.y); }
        return;
      }
      if (hoverExit) {
        const ex = hoverExit, approach=state.map.thresholds?.find(t=>t.id===ex.thresholdId)?.approach,
          cx = approach?.x??(ex.x0 + ex.x1) / 2, cy = approach?.y??(ex.y0 + ex.y1) / 2;
        const go = () => {
          /* Korvath's barrier seals the Shattered Temple until the beacons fall */
          if (ex.target === "shattered_temple" && !state.flags.fn_temple_open) {
            const q = state.quests.q8b;
            msg(q && (q.state === "active" || q.state === "reward")
              ? "A barrier of light seals the temple — shatter the three beacons feeding it."
              : "A barrier of light seals the temple. The survivors of the mines may know how to lower it.", "#9fe0ff");
            return;
          }
          enterMap(ex.target, ex.spawnKey, ex.openingGate?{openingMode:"gate"}:{reuseCachedMap:!!ex.reuseCachedMap});
        };
        const inside = p.x >= ex.x0 && p.x <= ex.x1 && p.y >= ex.y0 && p.y <= ex.y1;
        if (inside || U.dist(p.x, p.y, cx, cy) < 1.8) { p.command = null; go(); }
        else { p.command = { type: "interact", obj: { x: cx, y: cy }, run: go }; repath(p, cx, cy); }
        return;
      }
      if (hoverNpc) {
        p.command = { type: "interact", obj: hoverNpc };
        hoverNpc.isNpc = true;
        repath(p, hoverNpc.x, hoverNpc.y);
        return;
      }
      if (hoverLabel) { p.command = { type: "pickup", gi: hoverLabel.gi }; repath(p, hoverLabel.gi.x, hoverLabel.gi.y); return; }
      if (hoverProp) { p.command = { type: "interact", obj: hoverProp }; repath(p, hoverProp.x, hoverProp.y); return; }
    }
    /* left-click-move-only: a plain left-click never auto-attacks (right-click / shift still do) */
    const forceMove = options.leftClickMove && !rightBtn && !mouse.shift;
    if (hoverMon && !hoverMon.dead && !forceMove) {
      if(p.rejectSkillWeapon(skill))return;
      heldTarget = hoverMon;
      p.command = { type: "attack", target: hoverMon, skill, hold: repeatSkill(skill) };
      return;
    }
    /* no target */
    if(!w)return; // An exposed cliff face is not a destination behind that cliff.
    const sk = p.resolveSkill(skill);
    if (mouse.shift || rightBtn) {
      if(!TerrainLayers.same(p,w))return;
      if(p.rejectSkillWeapon(skill))return;
      /* stand and use skill toward point */
      if (sk.type === "melee") {
        if (p.action) return;                                  // still mid-swing — respect attack speed (no spam-firing)
        const rk2 = skill === "basic" ? 1 : p.effRank(skill);
        if (skill !== "basic" && (rk2 <= 0 || !p.canPay(sk, rk2))) { Sfx.play("error"); return; }
        p.face(w.x, w.y);
        if (skill !== "basic") p.pay(sk, rk2);
        if (skill !== "basic") p.applySkillPerkBuff(sk,rk2);
        p.startAction("attack", 1 / p.stats.attackRate);
        if (p.stats.ranged) {
          Sfx.playSkill?.(skill,'release',{owner:p});
          const mult = skill === "basic" ? 1 : sk.dmgMult(rk2) * p.synergyMult(sk);
          spawnProjectile({ x: p.x, y: p.y, tx: w.x, ty: w.y, speed: 11, kind: "arrow", fromPlayer: true, sourceSkill:skill, mult, quarryOnHit: sk.quarryOnHit, quarryStacks:sk.quarryStacks?.(rk2), pierce:!!sk.perkPierce });
        } else Sfx.playSkill?.(skill,'release',{owner:p});
      } else {
        p.command = { type: "skillPoint", skill, point: w };
      }
      return;
    }
    /* plain move */
    {
      p.command = { type: "move", point:w };
      repath(p, w.x, w.y,w.surfaceId);
      if (!p.path) { p.command = null; }
    }
  }

  /* continuous hold behaviour */
  function heldUpdate() {
    if(typeof Coop!=="undefined"&&Coop.active)return CoopInput.hold(coopPointer());
    const p = state.player;
    if (touchUpdate()) return;
    if (p.dead || UI.cursorItem) { cancelGroundHold(); return; }
    if (groundHold) {
      if (!mouse.l || mouse.r || mouse.shift) cancelGroundHold();
      else {
        if (performance.now() - groundHold.startedAt >= 150) {
          groundHold.active = true;
          const aim=steeringPoint();
          if(state.map.layers&&(aim.surfaceId??p.surfaceId)!==p.surfaceId){p.command={type:'move',point:aim};repath(p,aim.x,aim.y,aim.surfaceId);return;}
          p.path = null; p._navGoal = null; p._navCache = null; p._navStall = 0;
          p._navPendingGoal = null; p._pendingClick = null; heldTarget = null;
          p.command = {type: "steer", point: steeringPoint()};
        }
        return;
      }
    }
    if (p.jumping) { if (mouse.l || mouse.r) {const world=screenToWorld(mouse.x,mouse.y);if(world)p._pendingClick = {rightBtn: !!mouse.r, mouse: {...mouse}, world};} return; }
    if (mouse.l && !mouse.r) {
      if (heldTarget && !heldTarget.dead && repeatSkill(p.skillL)) {
        p.command = { type: "attack", target: heldTarget, skill: p.skillL, hold: true };
      } else if ((heldTarget || mouse.shift) && hoverMon && !hoverMon.dead) {
        heldTarget = hoverMon;
      }
    }
    if (mouse.r && state.player.skillR) {
      /* re-trigger right skill on hold for melee-type targets */
      if (hoverMon && !hoverMon.dead && !p.command && repeatSkill(p.skillR)) {
        p.command = { type: "attack", target: hoverMon, skill: p.skillR, hold: false };
      }
    }
  }

  function monsterGeometry(mon, cam) {
    const point=renderPosition(mon);
    const x = U.isoX(point.x, point.y) - cam.x;
    const y = U.isoY(point.x, point.y) - cam.y - elevLift(point.x, point.y,point.surfaceId);
    if ((mon.beacon || mon.defId==="boss_portal")&&!mon.pose().ex?.act1Animation) return SpriteAssets.frameGeometry(SpriteAssets.getFrame(SpriteAssets.maps.props.beacon, 0), x, y);
    return SpriteAssets.actorGeometry(mon.spriteOpts, mon.pose(), x, y - (point.jumpZ || 0), ACTOR_BODY_SCALE);
  }

  /* hover detection (screen-space) */
  function updateHover() {
    hoverMon = null; hoverLabel = null; hoverProp = null; hoverNpc = null; hoverPortal = null; hoverExit = null;
    const cam = camera();
    const terrainHit=state.map.surfaceVersion ? TerrainSurface.pick(state.map,mouse.x+cam.x,mouse.y+cam.y,state.player.surfaceId) : null;
    const hidden=(x,y)=>terrainHit&&terrainHit.depth>x+y+1e-7&&terrainHit.z>TerrainNavigation.height(state.map,x,y,state.player.surfaceId)+1e-7&&
      !(terrainHit.kind==='ground'&&terrainHit.tx===Math.floor(x)&&terrainHit.ty===Math.floor(y));
    /* loot labels first (they float) */
    for (const lr of labelRects) {
      if (TerrainLayers.same(lr.gi,state.player)&&mouse.x >= lr.x && mouse.x <= lr.x + lr.w && mouse.y >= lr.y && mouse.y <= lr.y + lr.h) { hoverLabel = lr; return; }
    }
    const test = (ex, ey, h, rpx) => {
      const sx = U.isoX(ex, ey) - cam.x, sy = U.isoY(ex, ey) - cam.y - surfaceLift(ex,ey,state.player.surfaceId);
      return !hidden(ex,ey)&&Math.abs(mouse.x - sx) < rpx && mouse.y > sy - h && mouse.y < sy + 10;
    };
    /* Prefer painted pixels over nearby padding, then the last/frontmost
       monster in the renderer's stable x+y depth order. */
    const candidates = state.monsters.filter(mon => !mon.dead && !mon.husk && TerrainLayers.same(mon,state.player))
      .map(mon => ({ mon, geometry: monsterGeometry(mon, cam) }));
    for (const padding of [0, 3]) {
      let depth = -Infinity;
      for (const { mon, geometry } of candidates) {
        if (!hidden(mon.x,mon.y)&&mon.x + mon.y >= depth && SpriteAssets.hitTestGeometry(geometry, mouse.x, mouse.y, padding)) {
          hoverMon = mon; depth = mon.x + mon.y;
        }
      }
      if (hoverMon) return;
    }
    /* ground loot: clicking the item itself works, not just its label */
    for (let i = state.ground.length - 1; i >= 0; i--) {
      const gi = state.ground[i];
      if(!TerrainLayers.same(gi,state.player))continue;
      const sx = U.isoX(gi.x, gi.y) - cam.x, sy = U.isoY(gi.x, gi.y) - cam.y - surfaceLift(gi.x,gi.y,gi.surfaceId);
      if (!hidden(gi.x,gi.y)&&Math.abs(mouse.x - sx) < 20 && mouse.y > sy - 28 && mouse.y < sy + 12) { hoverLabel = { gi }; return; }
    }
    for (const n of state.npcs) if (TerrainLayers.same(n,state.player) && test(n.x, n.y, 52, 22)) { hoverNpc = n; return; }
    /* portals */
    const portalSpots = portalPositions();
    for (const ps of portalSpots) if (TerrainLayers.same(ps,state.player)&&test(ps.x, ps.y, 70, 30)) { hoverPortal = ps; return; }
    /* Authored passages share their opening and label hit geometry with drawing. */
    for(const ex of state.map.exits){
      const th=state.map.thresholds?.find(t=>t.id===ex.thresholdId);
      if(!th||th.act!==3)continue;
      const g=thresholdGeometry(th,ex,cam);
      if((Math.abs(mouse.x-g.x)<g.width&&mouse.y>g.y-g.height&&mouse.y<g.y+18)||
        (g.showLabel&&Math.abs(mouse.x-g.x)<g.labelWidth/2&&mouse.y>g.labelY-16&&mouse.y<g.labelY+7)){
        hoverExit=ex;return;
      }
    }
    for (const pr of state.map.props) {
      if (!TerrainLayers.same(pr,state.player) || pr.hidden || !(pr.interact || pr.breakable || pr.lootable)) continue;
      /* tall interactables (shrines, forge, strongbox, board) need a generous box so
         clicking the VISIBLE sprite — not just its base — registers */
      if (pr.building) {
        const frame = propSpriteFrame(pr);
        const anchorX=pr.flipX?frame.sw-frame.anchorX:frame.anchorX;
        const sx=U.isoX(pr.x,pr.y)-cam.x,sy=U.isoY(pr.x,pr.y)-cam.y-elevLift(pr.x,pr.y,pr.surfaceId);
        if (mouse.x>=sx-anchorX && mouse.x<=sx-anchorX+frame.sw && mouse.y>=sy-frame.anchorY && mouse.y<=sy-frame.anchorY+frame.sh) { hoverProp=pr;return; }
        continue;
      }
      if(PropInteractions.themed(pr)){
        const frame=propSpriteFrame(pr),sx=U.isoX(pr.x,pr.y)-cam.x,sy=U.isoY(pr.x,pr.y)-cam.y-elevLift(pr.x,pr.y,pr.surfaceId);
        const b=PropInteractions.bounds(frame,sx,sy,!!pr.flipX);
        if(!hidden(pr.x,pr.y)&&mouse.x>=b.x-5&&mouse.x<=b.x+b.w+5&&mouse.y>=b.y-5&&mouse.y<=b.y+b.h+5){hoverProp=pr;return;}
        continue;
      }
      const tall = pr.interact === "shrine" ? 76 : (pr.interact ? 62 : 46);
      const wide = pr.interact === "shrine" ? 30 : 26;
      if (test(pr.x, pr.y, tall, wide)) { hoverProp = pr; return; }
    }
    /* Authored passages share their opening and label hit geometry with drawing. */
    for(const ex of state.map.exits){
      const th=state.map.thresholds?.find(t=>t.id===ex.thresholdId);
      if(!th||th.act===3)continue;
      const g=thresholdGeometry(th,ex,cam);
      if((Math.abs(mouse.x-g.x)<g.width&&mouse.y>g.y-g.height&&mouse.y<g.y+18)||
        (g.showLabel&&Math.abs(mouse.x-g.x)<g.labelWidth/2&&mouse.y>g.labelY-16&&mouse.y<g.labelY+7)){
        hoverExit=ex;return;
      }
    }
    /* map exits — click to travel (a generous world-space AABB hover) */
    const wm = screenToWorld(mouse.x, mouse.y);
    if(!wm)return;
    for (const ex of state.map.exits) {
      if(ex.thresholdId&&state.map.thresholds?.some(t=>t.id===ex.thresholdId))continue;
      if (TerrainLayers.same(wm,ex)&&wm.x >= ex.x0 - 0.7 && wm.x <= ex.x1 + 0.7 && wm.y >= ex.y0 - 0.7 && wm.y <= ex.y1 + 0.7) { hoverExit = ex; return; }
    }
  }
  function portalPositions() {
    const out = [];
    if (state.portal) {
      if (state.map.id === state.portal.home) {
        const sp = state.map.spawns.portal;
        if (sp) out.push({ x: sp.x, y: sp.y });
      } else if (state.map.id === state.portal.mapId && (!state.portal.instance || state.map === state.portal.instance.map)) {
        out.push({ x: state.portal.x, y: state.portal.y,surfaceId:state.portal.surfaceId??0 });
      }
    }
    /* the waygate opened by an act boss — leads forward to the next act's camp */
    if (state.actGate && state.actGate.mapId === state.map.id) {
      out.push({ x: state.actGate.x, y: state.actGate.y, gate: true, target: state.actGate.target });
    }
    return out;
  }
  function thresholdGeometry(th,ex,cam){
    const o=th.opening,x=U.isoX(o.x,o.y)-cam.x,y=U.isoY(o.x,o.y)-cam.y-((th.act===1||th.act===3||th.act===5)?surfaceLift(o.x,o.y,th.surfaceId??0):0);
    const showLabel=ex===hoverExit||U.dist(state.player.x,state.player.y,th.approach.x,th.approach.y)<7;
    return{x,y,width:o.halfWidth*32+6,height:o.height,labelY:y-o.height-14,
      labelWidth:Math.max(120,(ex.label||'Travel').length*8+30),showLabel};
  }

  /* =====================================================================
     UPDATE
     ===================================================================== */
  function explore() {
    const m = state.map, p = state.player;
    const R = 9;
    for (let oy = -R; oy <= R; oy++) for (let ox = -R; ox <= R; ox++) {
      if (ox * ox + oy * oy > R * R) continue;
      const x = (p.x + ox) | 0, y = (p.y + oy) | 0;
      if (x >= 0 && y >= 0 && x < m.w && y < m.h) m.explored[x + y * m.w] = 1;
    }
  }
  let exploreT = 0;

  function updateBossEncounter() {
    // The large health bar and soundtrack share the same encounter condition,
    // including minibosses and fights involving multiple bosses.
    let bossSeen = null;
    if (!state.player.dead) for (const mon of state.monsters) {
      if (mon.isBoss && mon.aggro && !mon.dead) bossSeen = mon;
    }
    state.bossBar = bossSeen;
    if (state.player.dead) return; // Death music stays stopped until revival.
    const theme = bossSeen ? 'boss' : state.zoneMusic;
    if (theme && state.musicTheme !== theme) {
      state.musicTheme = theme;
      Sfx.music(theme);
    }
  }

  function update(dt) {
    state.time += dt;
    const p = state.player;
    for(const hero of state.players||[p])PropInteractions.update(state,hero);
    opening.update(dt);
    if (LootFilter.version !== lootFilterVersion) refreshLoot();   // re-apply the filter only when it changed
    /* delayed callbacks */
    for (let i = delayed.length - 1; i >= 0; i--) {
      if (state.time >= delayed[i].t) { const fn = delayed[i].fn; delayed.splice(i, 1); fn(); }
    }
    updateHover();
    if(!(typeof Coop!=="undefined"&&Coop.active))heldUpdate();
    for(const hero of state.players||[p])hero.update(dt);

    /* exits are CLICK-ONLY (hover to highlight, click to travel) — see handleClick/updateHover.
       Walking across an exit no longer transitions, so you can cross map edges freely. */
    /* monsters */
    for (const mon of state.monsters) {
      mon.update(dt, closestPlayer(mon)||p, state.map);
    }
    for (let i = state.monsters.length - 1; i >= 0; i--) {
      const mon = state.monsters[i];
      if (mon.dead && mon.corpseT <= 0) state.monsters.splice(i, 1);
    }
    /* minions */
    for (const mi of state.minions) mi.update(dt, mi.owner||p, state.map);
    state.minions = state.minions.filter(mi => !mi.dead || mi.deathT > 0);
    updateLayerEffects("traps",updateTraps,dt);
    updateLayerEffects("fx",updateFx,dt);
    /* npcs / projectiles / ground toss */
    for (const n of state.npcs) n.update(dt);
    for (const pr of state.projectiles) pr.update(dt, state.map, p, state.monsters);
    state.projectiles = state.projectiles.filter(pr => !pr.dead);
    // Sample after movement and incoming hits, once per simulation tick.
    if(!(typeof CoopMotion!=="undefined"&&typeof Coop!=="undefined"&&Coop.active&&Coop.host))for(const hero of state.players||[p])Player3D.update?.(hero,dt);
    updateBossEncounter();
    for (const gi of state.ground) if (gi.toss > 0) gi.toss -= dt;
    /* gold is collected automatically when you walk over it */
    for(const p of state.players||[state.player])if (!p.dead) {
      for (let i = state.ground.length - 1; i >= 0; i--) {
        const gi = state.ground[i];
        if (TerrainLayers.same(p,gi) && gi.gold && gi.toss <= 0 && U.dist(p.x, p.y, gi.x, gi.y) < 1.4) pickupGround(gi,p);
      }
    }
    /* particles, floats, novas */
    for (let i = particles.length - 1; i >= 0; i--) {
      const pa = particles[i];
      pa.t -= dt;
      if (pa.t <= 0) { particles.splice(i, 1); continue; }
      pa.x += pa.vx * dt; pa.y += pa.vy * dt; pa.z -= pa.grav * dt * pa.t;
      if (pa.z < 0) pa.z = 0;
    }
    for (let i = floats.length - 1; i >= 0; i--) {
      floats[i].t += dt;
      if (floats[i].t > 1.0) floats.splice(i, 1);
    }
    for (let i = novas.length - 1; i >= 0; i--) {
      novas[i].t += dt;
      if (novas[i].t > novas[i].dur) novas.splice(i, 1);
    }
    for (let i = bolts.length - 1; i >= 0; i--) {
      bolts[i].t += dt;
      if (bolts[i].t > bolts[i].dur) bolts.splice(i, 1);
    }
    /* explore fog */
    exploreT -= dt;
    if (exploreT <= 0) { exploreT = 0.25; explore(); }
    /* ambient particles */
    ambientFx(dt);
    if(typeof SkillVFX!=='undefined')SkillVFX.update(dt,state,particles.length);
    if(typeof SkillAudio!=='undefined')SkillAudio.update(state);
    if (fx.shake > 0) fx.shake = Math.max(0, fx.shake - dt * 18);
  }

  /* ---------------- ranger traps ---------------- */
  function updateLayerEffects(key,run,dt){
    if(!state.map.layers){run(dt);return;}
    const all=state[key],out=[];
    for(const surfaceId of [0,1]){state[key]=all.filter(f=>(f.surfaceId??0)===surfaceId);TerrainLayers.scope(state.map,surfaceId,()=>run(dt));out.push(...state[key]);}
    state[key]=out;
  }
  function updateTraps(dt) {
    for (let i = state.traps.length - 1; i >= 0; i--) {
      const tr = state.traps[i], p = tr.owner || state.player;
      if (tr.armT > 0) { tr.armT -= dt; continue; }
      tr.ttl -= dt;
      if (tr.ttl <= 0) { state.traps.splice(i, 1); continue; }
      let sprung = false;
      for (const mon of TerrainLayers.targets(state.monsters)) {
        if (mon.dead) continue;
        if (U.dist(tr.x, tr.y, mon.x, mon.y) < tr.trigger + mon.radius) { sprung = true; break; }
      }
      if (!sprung) continue;
      state.traps.splice(i, 1);
      const col = tr.kind === "powder" ? "#ff9040" : tr.kind === "frost" ? "#9fd8ff" : "#c8c8c8";
      Sfx.playSkill?.(tr.skillId,'impact',{owner:p,emitter:tr,elem:tr.elem});
      if(typeof SkillAudio!=='undefined')SkillAudio.passive(p,'trap',{emitter:tr});
      if(typeof SkillVFX!=='undefined')SkillVFX.scope(p,tr.skillId,()=>{addNova(tr.x,tr.y,tr.radius,col);SkillVFX.passive(p,'trap',{x:tr.x,y:tr.y});});
      else addNova(tr.x, tr.y, tr.radius, col);
      if (tr.kind === "powder") fx.shake = Math.max(fx.shake, 4);
      for (let j = 0; j < 12; j++) addParticle(tr.x + U.rf(-0.5, 0.5), tr.y + U.rf(-0.5, 0.5), col);
      for (const mon of TerrainLayers.targets(state.monsters)) {
        if (mon.dead || U.dist(tr.x, tr.y, mon.x, mon.y) > tr.radius + mon.radius) continue;
        let dmg = U.rf(tr.dmgLo, tr.dmgHi) * tr.mult;
        let crit = false;
        if (Math.random() * 100 < p.stats.critChance) { dmg *= p.stats.critDmg / 100; crit = true; }
        const actual = p.withSkillSource(tr.skillId, () => p.snareHit(mon, dmg));
        if(typeof SkillVFX!=='undefined')SkillVFX.scope(p,tr.skillId,()=>SkillVFX.hit(p,mon,tr.elem,crit));
        addFloat(mon.x, mon.y, Math.floor(actual), crit ? "#ffb030" : col, crit);
        if (tr.slowPct) mon.applySlow(tr.slowDur, tr.slowPct);
        if (tr.burn) p.withSkillSource(tr.skillId, () => p.applyPoison(mon, tr.burn, 2, { fire: true }));
        bloodBurst(mon.x, mon.y, 4);
      }
    }
  }

  /* ===================================================================
     TRANSIENT WORLD FX — persistent fields, banners, totems, weather.
     One state.fx array, one update + one render. Never serialized.
     =================================================================== */
  const GF_COL = { inferno:"#ff9040", glacier:"#9fd8ff", static:"#fff080", caltrop:"#c8c8c8",
    smoke:"#9aa0a8", miasma:"#90ff70", snare:"#6aa84a", spore:"#b8d870", quake:"#c0a060", regrowth:"#80ff90" };
  function distToSeg(px, py, x0, y0, x1, y1) {
    const dx = x1 - x0, dy = y1 - y0, l2 = dx * dx + dy * dy;
    if (l2 === 0) return Math.hypot(px - x0, py - y0);
    let t = ((px - x0) * dx + (py - y0) * dy) / l2; t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x0 + t * dx), py - (y0 + t * dy));
  }
  function fieldDmgRoll(f) { const o = f.owner || state.player; const sp = (o && o.stats && o.stats.spellPct) || 0; return U.rf(f.lo, f.hi) * (1 + sp / 100); }
  function refreshBuff(ent, id, stats, dur) {
    const ex = ent.buffs.find(b => b.id === id);
    if (ex) ex.until = state.time + dur;
    else { ent.buffs.push({ id, label: "", emoji: "", stats, until: state.time + dur }); ent.computeStats(); }
  }
  function knockMonster(mon, fromX, fromY, dist) {
    if (!mon || mon.dead || mon.isBoss) return;
    mon.imperialCombat?.cancel();
    const dx = mon.x - fromX, dy = mon.y - fromY, dd = Math.hypot(dx, dy) || 1;
    const nx = mon.x + dx / dd * dist, ny = mon.y + dy / dd * dist;
    if (MapGen.walkable(state.map, nx, mon.y)) mon.x = nx;
    if (MapGen.walkable(state.map, mon.x, ny)) mon.y = ny;
  }
  function detonateMark(mon) {
    return (mon.killMark?.owner||state.player).withSkillSource("veilranger_2_4", () => detonateMarkEffect(mon), mon);
  }
  function detonateMarkEffect(mon) {
    if (!mon.killMark || mon._detonatingMark) return;
    const mark=mon.killMark,o=mon.killMark.owner||state.player,det=mark.det??10,amp=mark.amp??25;
    mon._detonatingMark=true;
    try {
    Sfx.playSkill?.('veilranger_2_4','impact',{owner:o,emitter:mon,elem:'shadow'});
    addNova(mon.x, mon.y, 2.5, "#c080e0");
    for (const m of TerrainLayers.targets(state.monsters)) {
      if (m.dead || !TerrainLayers.same(mon,m) || U.dist(mon.x, mon.y, m.x, m.y) > 2.5 + m.radius) continue;
      o.spellHit(m, det, "shadow", {});
      if (m !== mon && !m.dead && !m._detonatingMark && !m.killMark) m.killMark = { owner:o, until: state.time + 3, amp: amp / 2, det: det / 2 };
    }
    } finally {if(mon.killMark===mark)mon.killMark=null;mon._detonatingMark=false;}
  }
  function detonateDoom(mon) {
    return (mon.doom?.owner||state.player).withSkillSource("gravebinder_1_2", () => detonateDoomEffect(mon), mon);
  }
  function detonateDoomEffect(mon) {
    if (!mon.doom) return; const o = mon.doom.owner||state.player, d = mon.doom, k = 0.5 + 0.5 * (d.charge / d.maxCharge);
    Sfx.playSkill?.('gravebinder_1_2','impact',{owner:o,emitter:mon,elem:'shadow'});
    addNova(mon.x, mon.y, d.radius, "#9a40c0"); fx.shake = Math.max(fx.shake, 4);
    for (const m of TerrainLayers.targets(state.monsters)) {
      if (m.dead || U.dist(mon.x, mon.y, m.x, m.y) > d.radius + m.radius) continue;
      o.spellHit(m, U.rf(d.dmgLo, d.dmgHi) * k, "shadow", {});
    }
    mon.doom = null;
  }
  function spawnCorpse(x, y, ttl) {
    /* a lightweight husk the corpse-finders accept; not rendered as a monster */
    state.monsters.push({ surfaceId:TerrainLayers.current(state.map), husk: true, dead: true, exploded: false, corpseT: ttl || 12, x, y, radius: 0.3,
      lvl: state.player.lvl, type: "undead", hp: 0, maxHp: 1, def: {},
      pose() { return { state: "idle", t: 0, ang: 0, ex: {} }; },   // defensive: never drawn, but safe if asked
      takeDamage() {}, applySlow() {}, update(dt) { this.corpseT -= dt; } });
    addParticle(x, y, "#7a1414");
  }
  /* Gravebinder corpse-skills may crack open a gravestone for a fresh corpse when no body
     is at hand. Finds the nearest "grave" prop within `range` of the caster (closest to aim),
     removes it, and spawns a corpse husk there — returns that husk, or null. */
  function corpseFromGrave(self, aim, range) {
    const m = state.map; if (!m || !Array.isArray(m.props)) return null;
    const ax = aim ? aim.x : self.x, ay = aim ? aim.y : self.y, r2 = range * range;
    let best = null, bd = Infinity;
    for (let i = 0; i < m.props.length; i++) {
      const p = m.props[i];
      if (!p || p.type !== "grave" || p.corpseConsumed || p.storyId || p.event || p.ev || !TerrainLayers.same(self,p)) continue;
      if (U.dist2(self.x, self.y, p.x, p.y) > r2) continue;     // must be within reach of the caster
      const dd = U.dist2(ax, ay, p.x, p.y);
      if (dd < bd) { bd = dd; best = p; }
    }
    if (!best) return null;
    best.corpseConsumed=true;
    PropInteractions.freeTile(m,best);PropInteractions.effect(best,state,'corpse');
    Sfx.play('propStone');
    spawnCorpse(best.x, best.y, 12);
    const husk = state.monsters[state.monsters.length - 1];
    husk.surfaceId=best.surfaceId??self.surfaceId??0;
    husk.fromGrave = true;                                       // marks summons raised here as Empowered
    return husk;
  }
  /* a thrown undead body crashes down: impact AoE, then it rises as fresh monsters */
  function throwUndeadLand(x, y, info) {
    const r = info.radius || 1.9;
    Sfx.play("slam"); addNova(x, y, r, "#90ff70"); fx.shake = Math.max(fx.shake, 3);
    bloodBurst(x, y, 8); for (let i = 0; i < 8; i++) addParticle(x + U.rf(-0.6, 0.6), y + U.rf(-0.6, 0.6), "#7a8a4a");
    const p = state.player;
    if(info.owner)info.owner.areaAttack({kind:'circle',x,y,radius:r},info.dmg,'phys');
    else {
      if (!p.dead && U.dist(x, y, p.x, p.y) <= r + p.radius) p.takeDamage(info.dmg, null, "phys");
      for (const mi of TerrainLayers.targets(state.minions)) if (!mi.dead && U.dist(x, y, mi.x, mi.y) <= r + mi.radius) mi.takeDamage(info.dmg, null);
    }
    for (let i = 0; i < (info.count || 1); i++) {
      if(info.owner&&!info.owner.isBoss&&info.owner.livingChildren()>=6)break;
      const a = Math.random() * Math.PI * 2, sx = x + Math.cos(a) * 1.0, sy = y + Math.sin(a) * 1.0;
      if (!MapGen.walkable(state.map, sx, sy)) continue;
      const m = new Monster(U.pick(info.pool || ["risen"]), sx, sy, {}); m.aggro = true;
      if(info.owner){if(!info.owner.supportedPoint(sx,sy,m.radius))continue;info.owner.ownSummon(m);}
      state.monsters.push(m); addNova(sx, sy, 0.7, "#9fe0ff");
    }
  }
  function applyGroundField(f, o) {
    const inR = m => U.dist(f.x, f.y, m.x, m.y) <= f.radius + m.radius;
    if (f.rabies) {   // contagious rabies cloud left by a dead rabid foe — poisons + infects all inside
      for (const m of TerrainLayers.targets(state.monsters)) {
        if (m.dead || !inR(m)) continue;
        o.applyPoison(m, f.rdps || 6, 3, { strongest: true, scaled: !!f.elementScaled });
        if (!m.rabies || m.rabies.until < state.time) { m.rabies = { until: state.time + (f.rdur || 8), dps: f.elementScaled ? f.rdps : DATA.scaleElement(o, f.rdps || 6, "poison"), cloudRad: f.rcloud || 2.4, owner: o, elementScaled: true }; for (let i = 0; i < 2; i++) addParticle(m.x, m.y, "#90ff70"); }
      }
      return;
    }
    switch (f.fieldKind) {
      case "inferno": for (const m of TerrainLayers.targets(state.monsters)) { if (!m.dead && inR(m)) o.spellHit(m, fieldDmgRoll(f), "fire", { burn: 2 }); } break;
      case "glacier": for (const m of TerrainLayers.targets(state.monsters)) { if (m.dead || !inR(m)) continue; o.spellHit(m, fieldDmgRoll(f), "cold", {}); m.applySlow(0.9, f.slowPct || 60); m.glacierT = (m.glacierT || 0) + (f.tickEvery || 0.5); if (m.glacierT > 1.2) { m.freezeOwner=o; m.frozen = Math.max(m.frozen || 0, state.time + 1.0); m.stunT = Math.max(m.stunT, 1.0); } } break;
      case "static": { let t = null, bd = 1e9; for (const m of TerrainLayers.targets(state.monsters)) { if (m.dead || !inR(m)) continue; const dd = U.dist2(f.x, f.y, m.x, m.y); if (dd < bd) { bd = dd; t = m; } } if (t) { const sc = 1 + ((o.staticChg || 0) / 40); o.spellHit(t, fieldDmgRoll(f) * sc, "light", {}); lightningBolt(f.x, f.y, t.x, t.y); } break; }
      case "caltrop": for (const m of TerrainLayers.targets(state.monsters)) {
        if (m.dead || !inR(m)) continue;
        if(f.snareMult!==undefined){const actual=o.snareHit(m,U.rf(f.lo,f.hi)*f.snareMult);addFloat(m.x,m.y,Math.floor(actual),"#d8c79a");if(typeof SkillVFX!=="undefined")SkillVFX.hit(o,m,"phys",false);}
        else o.spellHit(m,fieldDmgRoll(f),"phys",{});
        m.applySlow(0.6, f.slowPct || 40);
      } break;
      case "smoke": { for (const m of TerrainLayers.targets(state.monsters)) { if (!m.dead && inR(m)) m.blindUntil = state.time + 0.6; } if (TerrainLayers.same(f,o) && U.dist(o.x, o.y, f.x, f.y) < f.radius) refreshBuff(o, "smoke_evasion", { dodge: f.selfDodge || 30 }, 0.6); break; }
      case "miasma": for (const m of TerrainLayers.targets(state.monsters)) { if (m.dead || !inR(m)) continue; o.spellHit(m, fieldDmgRoll(f), "poison", {}); m.applySlow(0.7, f.slowPct || 20); } break;
      case "snare": for (const m of TerrainLayers.targets(state.monsters)) { if (m.dead || !inR(m)) continue; m.applySlow(0.8, 95); o.spellHit(m, fieldDmgRoll(f), "poison", {}); } break;
      case "spore": for (const m of TerrainLayers.targets(state.monsters)) { if (m.dead || !inR(m)) continue; o.applyPoison(m, f.lo || 3, 3, { strongest: true }); m.curseWither = { owner:o, until: state.time + 1.5, pct: f.weakenPct || 12 }; } break;
      case "quake": if (Math.random() < 0.7) { const a = Math.random() * 6.283, r = Math.random() * f.radius, qx = f.x + Math.cos(a) * r, qy = f.y + Math.sin(a) * r; addNova(qx, qy, 1.2, "#c0a060"); fx.shake = Math.max(fx.shake, 2); for (const m of TerrainLayers.targets(state.monsters)) { if (m.dead) continue; if (U.dist(qx, qy, m.x, m.y) < 1.4 + m.radius) { o.spellHit(m, fieldDmgRoll(f), "earth", {}); m.applySlow(0.6, f.slowPct || 25); } } } break;
      case "regrowth": { for(const pl of state.players||[state.player]) if (TerrainLayers.same(f,pl) && U.dist(pl.x, pl.y, f.x, f.y) < f.radius) pl.healLife(pl.stats.maxHp * (f.heal || 3) / 100 * (f.tickEvery || 0.5)); for (const mi of TerrainLayers.targets(state.minions)) { if (!mi.dead && U.dist(mi.x, mi.y, f.x, f.y) < f.radius) mi.hp = Math.min(mi.maxHp, mi.hp + mi.maxHp * (f.heal || 3) / 100 * (f.tickEvery || 0.5)); } break; }
    }
  }
  function applyBanner(f, p) {
    for(const hero of state.players||[p]){
    const p=hero, inAura = !p.dead && TerrainLayers.same(f,p) && U.dist(p.x, p.y, f.x, f.y) < f.radius;
    if (inAura) { refreshBuff(p, "banner_aura", { dmgPct: f.allyDmg, ias: f.allyIas }, 0.6); if (f.heal) p.healLife(p.stats.maxHp * f.heal / 100 * (f.tickEvery || 0.3)); }}
    for (const mi of TerrainLayers.targets(state.minions)) { if (!mi.dead && U.dist(mi.x, mi.y, f.x, f.y) < f.radius) { mi.buffUntil = Math.max(mi.buffUntil, state.time + 0.6); mi.buffDmg = Math.max(mi.buffDmg, f.allyDmg); if (f.heal) mi.hp = Math.min(mi.maxHp, mi.hp + mi.maxHp * f.heal / 100 * (f.tickEvery || 0.3)); } }
    for (const m of TerrainLayers.targets(state.monsters)) { if (!m.dead && U.dist(m.x, m.y, f.x, f.y) < f.radius) m.bannerWeak = { until: state.time + 0.6, pct: f.enemyDmg }; }
  }
  function updateTripwire(f, o) {
    if (f.sprung) return;
    for (const m of TerrainLayers.targets(state.monsters)) {
      if (m.dead) continue;
      if (distToSeg(m.x, m.y, f.x0, f.y0, f.x1, f.y1) < 0.55 + m.radius) {
        f.sprung = true;
        for (const mm of TerrainLayers.targets(state.monsters)) { if (mm.dead) continue; if (distToSeg(mm.x, mm.y, f.x0, f.y0, f.x1, f.y1) < 0.75 + mm.radius) { o.spellHit(mm, U.rf(f.lo, f.hi), "phys", {}); o.applyPoison(mm, f.bleed, 3); mm.applySlow(f.root || 0.8, 95); } }
        addNova((f.x0 + f.x1) / 2, (f.y0 + f.y1) / 2, 1, "#d8c79a"); Sfx.play("hit"); f.ttl = Math.min(f.ttl, 0.3); break;
      }
    }
  }
  function updateOutbreak(f, o, dt) {
    const prevR = f.r; f.r += (f.maxR / f.dur) * dt;
    for (const m of TerrainLayers.targets(state.monsters)) { if (m.dead || f.hitMon.has(m)) continue; const dm = U.dist(f.x, f.y, m.x, m.y); if (dm >= prevR && dm <= f.r) { f.hitMon.add(m); o.applyPlague(m, { until: state.time + 5, tick: f.tick, tickT: 0, spreadCd: 1.5, spreadRange: 3.5, burstRange: 2.5 }); o.spellHit(m, f.tick, "poison", {}); } }
    for (const c of TerrainLayers.targets(state.monsters)) { if (!c.dead || !c.corpseT || c.exploded || f.hitMon.has(c)) continue; const dm = U.dist(f.x, f.y, c.x, c.y); if (dm >= prevR && dm <= f.r) { f.hitMon.add(c); c.exploded = true; c.corpseT = 0; addNova(c.x, c.y, 2.2, "#90ff70"); for (const m of TerrainLayers.targets(state.monsters)) { if (m.dead || U.dist(c.x, c.y, m.x, m.y) > 2.2 + m.radius) continue; o.spellHit(m, f.corpseDmg, "poison", {}); } } }
    if (f.r >= f.maxR) f.ttl = 0;
  }
  function updateTotem(f, o, dt) {
    if (f.totemKind === "tempest") {
      f.pulseT = (f.pulseT || 0) - dt;
      if (f.pulseT <= 0) { f.pulseT = f.pulseCd || 1.4; f.ringR = 0; f.ringHit = new Set(); }
      f.ringR = (f.ringR || 0) + (f.radius / (f.pulseCd || 1.4)) * dt;
      if (!f.ringHit) f.ringHit = new Set();
      for (const m of TerrainLayers.targets(state.monsters)) { if (m.dead) continue; if (Math.abs(U.dist(f.x, f.y, m.x, m.y) - f.ringR) < 0.8 && !f.ringHit.has(m)) { f.ringHit.add(m); o.spellHit(m, U.rf(f.lo, f.hi), "light", {}); } }
      f.wispT = (f.wispT || 0) - dt;
      if (f.wispT <= 0) { f.wispT = f.wispCd || 3; let t = null, bd = 1e9; for (const m of TerrainLayers.targets(state.monsters)) { if (m.dead) continue; const dd = U.dist2(f.x, f.y, m.x, m.y); if (dd < bd) { bd = dd; t = m; } } if (t) state.fx.push({ surfaceId:TerrainLayers.current(state.map), type: "wisp", x: f.x, y: f.y, target: t, ttl: 3, lo: f.lo, hi: f.hi, owner: o, sourceSkill:f.sourceSkill }); }
    } else {
      const rate = (f.zapCd || 1.1) * Math.max(.1,1 - ((o.stats && o.stats.totemRate) || 0) / 100);
      f.zapT = (f.zapT || 0) - dt;
      if (f.zapT <= 0) { let t = null, bd = f.radius * f.radius; for (const m of TerrainLayers.targets(state.monsters)) { if (m.dead) continue; const dd = U.dist2(f.x, f.y, m.x, m.y); if (dd < bd) { bd = dd; t = m; } } if (t) { f.zapT = rate; o.spellHit(t, U.rf(f.lo, f.hi), "light", {}); lightningBolt(f.x, f.y, t.x, t.y); Sfx.play("zap"); } else f.zapT = 0.25; }
    }
  }
  function updateCyclone(f, o, dt) {
    if (f.orb) { const nx = f.x + f.vx * dt, ny = f.y + f.vy * dt; if (MapGen.walkable(state.map, nx, f.y)) f.x = nx; else f.vx = 0; if (MapGen.walkable(state.map, f.x, ny)) f.y = ny; else f.vy = 0; }
    else { let t = null, bd = 1e9; for (const m of TerrainLayers.targets(state.monsters)) { if (m.dead) continue; const dd = U.dist2(f.x, f.y, m.x, m.y); if (dd < bd) { bd = dd; t = m; } } if (t) { const d = Math.sqrt(bd) || 1, sp = f.drift * dt, nx = f.x + (t.x - f.x) / d * sp, ny = f.y + (t.y - f.y) / d * sp; if (MapGen.walkable(state.map, nx, f.y)) f.x = nx; if (MapGen.walkable(state.map, f.x, ny)) f.y = ny; } }
    f.tickT = (f.tickT || 0) - dt;
    if (f.tickT <= 0) { f.tickT = f.tickEvery || 0.4; for (const m of TerrainLayers.targets(state.monsters)) { if (m.dead || U.dist(f.x, f.y, m.x, m.y) > f.radius + m.radius) continue; o.spellHit(m, U.rf(f.lo, f.hi), "light", {}); if (f.orb) lightningBolt(f.x, f.y, m.x, m.y); else if (f.pull) { const d2 = U.dist(f.x, f.y, m.x, m.y) || 1, pull = Math.min(d2, f.pull * (f.tickEvery || 0.4)), px = m.x + (f.x - m.x) / d2 * pull, py = m.y + (f.y - m.y) / d2 * pull; if (MapGen.walkable(state.map, px, m.y)) m.x = px; if (MapGen.walkable(state.map, m.x, py)) m.y = py; } } }
    if (Math.random() < 0.8) { const a = Math.random() * 6.283, r = Math.random() * f.radius; addParticle(f.x + Math.cos(a) * r, f.y + Math.sin(a) * r, f.orb ? "#fff080" : "#cfe0ff"); }
  }
  function updateWisp(f, o, dt) {
    if (f.target && !f.target.dead) { const d = U.dist(f.x, f.y, f.target.x, f.target.y) || 1; f.x += (f.target.x - f.x) / d * 6 * dt; f.y += (f.target.y - f.y) / d * 6 * dt; if (d < 0.6) { o.spellHit(f.target, U.rf(f.lo, f.hi), "light", {}); lightningBolt(f.x, f.y, f.target.x, f.target.y); f.ttl = 0; } }
    else f.ttl = 0;
  }
  function updateFx(dt) {
    const p = state.player; if (!p) return;
    for (let i = state.fx.length - 1; i >= 0; i--) {
      const f = state.fx[i]; if(f.type!=='act2warning')f.ttl -= dt;
      if(f.type==="slamwarning"&&(f.owner.dead||(state.players||[p]).every(h=>h.dead)||f.owner.slamWarning!==f))f.ttl=0;
      if(f.type==='enemywarning'&&((state.players||[p]).every(h=>h.dead)||(f.projectile?f.projectile.dead:!f.death&&(f.owner.dead||f.owner.attackWarning!==f))))f.ttl=0;
      if (f.ttl <= 0) { state.fx.splice(i, 1); continue; }
      const o = f.owner || p;
      const tick = () => { f.tickT = (f.tickT || 0) - dt; if (f.tickT <= 0) { f.tickT = f.tickEvery || 0.4; return true; } return false; };
      const runEffect=()=>{switch (f.type) {
        case "firewall": if (tick()) for (const m of TerrainLayers.targets(state.monsters)) { if (!m.dead && distToSeg(m.x, m.y, f.x0, f.y0, f.x1, f.y1) < f.width + m.radius) o.spellHit(m, fieldDmgRoll(f), "fire", {}); } break;   /* flat per-tick fire — no stacking burn DoT */
        case "groundfield": if (f.fieldKind === "spore") { f.x += (f.vx || 0) * dt; f.y += (f.vy || 0) * dt; } if (tick()) applyGroundField(f, o); break;
        case "banner": if (tick()) applyBanner(f, p); break;
        case "rain": if (tick()) for (const m of TerrainLayers.targets(state.monsters)) { if (m.dead || U.dist(f.x, f.y, m.x, m.y) > f.radius + m.radius) continue; o.strike(m, f.mult * ((m.quarry && state.time < m.quarry.until) ? 1.25 : 1), { auto: true }); } if (Math.random() < 0.7) { const a = Math.random() * 6.283, r = Math.random() * f.radius; addParticle(f.x + Math.cos(a) * r, f.y + Math.sin(a) * r, "#d8c79a"); } break;
        case "tripwire": updateTripwire(f, o); break;
        case "outbreak": updateOutbreak(f, o, dt); break;
        case "totem": updateTotem(f, o, dt); break;
        case "cyclone": updateCyclone(f, o, dt); break;
        case "wisp": updateWisp(f, o, dt); break;
      }};
      const present=()=>typeof SkillVFX!=='undefined'?SkillVFX.scope(o,f.sourceSkill,runEffect):runEffect();
      if (o.withSkillSource) o.withSkillSource(f.sourceSkill || "basic", runEffect, f);
      else if(typeof SkillAudio!=='undefined')SkillAudio.scope(f.sourceSkill,{owner:o,emitter:f},present);else present();
    }
  }
  /* one flickering flame tongue rising from (px,py); layered calls build a fire */
  function flameTongue(px, py, h, sway, col, w) {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(px - w, py);
    ctx.quadraticCurveTo(px - w * 0.5, py - h * 0.55, px + sway, py - h);   // up the left edge to the tip
    ctx.quadraticCurveTo(px + w * 0.5, py - h * 0.55, px + w, py);          // down the right edge
    ctx.quadraticCurveTo(px, py + 3, px - w, py);                           // round the base
    ctx.closePath(); ctx.fill();
  }
  /* a fiery meteor falling toward (sx,sy); k=0 high in the sky → k=1 at the ground */
  function drawMeteorBall(sx, sy, radius, k, col) {
    const FALL = 250, LEAN = 46;
    const bx = sx - LEAN * (1 - k), by = sy - FALL * (1 - k);
    const r = 7 + (radius || 2) * 1.5;
    const dl = Math.hypot(LEAN, FALL) || 1, dirx = LEAN / dl, diry = FALL / dl;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.shadowColor = col || "#ff6a18"; ctx.shadowBlur = 16;
    for (let t = 7; t >= 1; t--) {   // streaking tail trailing back up the flight path
      const off = t * 8, tr = Math.max(1.5, r * (1 - t * 0.11));
      ctx.globalAlpha = 0.06 + (1 - t / 8) * 0.24;
      ctx.fillStyle = t > 3 ? "#ff6a18" : "#ffb24a";
      ctx.beginPath(); ctx.arc(bx - dirx * off, by - diry * off, tr, 0, 6.283); ctx.fill();
    }
    ctx.globalAlpha = 0.9; ctx.fillStyle = "#ff8a20";
    ctx.beginPath(); ctx.arc(bx, by, r, 0, 6.283); ctx.fill();
    ctx.globalAlpha = 1; ctx.fillStyle = "#ffe6a0";
    ctx.beginPath(); ctx.arc(bx - dirx * 1.5, by - diry * 1.5, r * 0.62, 0, 6.283); ctx.fill();
    ctx.shadowBlur = 0; ctx.restore();
  }
  function drawFx(f, cam) {
    const sx = U.isoX(f.x, f.y) - cam.x, sy = U.isoY(f.x, f.y) - cam.y - surfaceLift(f.x,f.y,f.surfaceId);
    ctx.save();
    if (f.type === "groundfield") {
      const col = GF_COL[f.fieldKind] || "#ffffff", rr = f.radius * 32, ry = rr * 0.5;
      const k = f.maxTtl ? U.clamp(f.ttl / f.maxTtl, 0.25, 1) : 1;
      /* a soft disc that's brighter toward the centre (the bright rim is drawn post-lighting) */
      const g = ctx.createRadialGradient(sx, sy, 2, sx, sy, rr);
      g.addColorStop(0, col); g.addColorStop(0.55, col); g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.globalAlpha = 0.36 * k; ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(sx, sy, rr, ry, 0, 0, 6.283); ctx.fill();
      if (f.fieldKind === "inferno") {   // a roiling bed of flames rising from the disc, not just a glow
        ctx.save(); ctx.globalCompositeOperation = "lighter";
        const n = Math.max(6, Math.round(f.radius * 5));
        for (let i = 0; i < n; i++) {
          const a = i * 2.39996, rad = Math.sqrt((i + 0.5) / n) * rr * 0.92;   // golden-angle fill across the disc
          const px = sx + Math.cos(a) * rad, py = sy + Math.sin(a) * rad * 0.5;
          const h = (16 + Math.sin(state.time * 12 + i * 1.7) * 7) * k, sway = Math.sin(state.time * 7 + i) * 3;
          if (h < 3) continue;
          ctx.globalAlpha = 0.42 * k; flameTongue(px, py, h * 1.1, sway, "#d22a08", 6);
          ctx.globalAlpha = 0.55 * k; flameTongue(px, py, h, sway * 0.8, "#ff8a1e", 4);
          ctx.globalAlpha = 0.75 * k; flameTongue(px, py, h * 0.55, sway * 0.6, "#ffe27a", 2.2);
        }
        ctx.restore();
      }
    } else if (f.type === "firewall") {
      /* a row of flickering flame tongues along the line — a real wall of fire, not a glowing streak */
      const x0 = U.isoX(f.x0, f.y0) - cam.x, y0 = U.isoY(f.x0, f.y0) - cam.y - surfaceLift(f.x0,f.y0,f.surfaceId), x1 = U.isoX(f.x1, f.y1) - cam.x, y1 = U.isoY(f.x1, f.y1) - cam.y - surfaceLift(f.x1,f.y1,f.surfaceId);
      const dxw = x1 - x0, dyw = y1 - y0, len = Math.hypot(dxw, dyw) || 1, n = Math.max(2, Math.round(len / 9));
      const life = U.clamp(f.ttl / 0.6, 0, 1) * U.clamp((f.maxTtl - f.ttl) / 0.25, 0, 1);   // fade in at birth, out at death
      const seed0 = (f.x0 * 7 + f.y0 * 13);
      ctx.save();
      /* smoldering base glow along the ground line */
      ctx.globalAlpha = 0.4 * life; ctx.strokeStyle = "#ff6a18"; ctx.shadowColor = "#ff5a10"; ctx.shadowBlur = 10; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.shadowBlur = 0;
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i <= n; i++) {
        const u = i / n, px = x0 + dxw * u, py = y0 + dyw * u, seed = seed0 + i * 1.7;
        const fl = Math.sin(state.time * 9 + seed) * 0.5 + Math.sin(state.time * 17 + seed * 1.3) * 0.3;
        const h = (26 + fl * 9) * life, sway = Math.sin(state.time * 6 + seed) * 4;
        if (h < 3) continue;
        ctx.globalAlpha = 0.5 * life; flameTongue(px, py, h * 1.15, sway, "#d22a08", 9);        // outer body
        ctx.globalAlpha = 0.6 * life; flameTongue(px, py, h, sway * 0.8, "#ff8a1e", 6);          // mid
        ctx.globalAlpha = 0.85 * life; flameTongue(px, py, h * 0.58, sway * 0.6, "#ffe27a", 3.2); // hot core
      }
      ctx.restore();
    } else if (f.type === "banner") {
      ctx.strokeStyle = "#ffe6b0"; ctx.globalAlpha = 0.3; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(sx, sy, f.radius * 32, f.radius * 16, 0, 0, 6.283); ctx.stroke();
      ctx.globalAlpha = 1; ctx.fillStyle = "#caa44a"; ctx.fillRect(sx - 2, sy - 36, 4, 36);
      ctx.fillStyle = f.kindCol || "#d8b84a"; ctx.beginPath(); ctx.moveTo(sx + 2, sy - 36); ctx.lineTo(sx + 18, sy - 31); ctx.lineTo(sx + 2, sy - 24); ctx.fill();
    } else if (f.type === "rain") {
      ctx.globalAlpha = 0.28; ctx.strokeStyle = "#d8c79a"; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(sx, sy, f.radius * 32, f.radius * 16, 0, 0, 6.283); ctx.stroke();
    } else if (f.type === "dragnet") {
      const r=f.radius*32*(.2+.8*f.ttl/f.maxTtl);ctx.strokeStyle="#e4d6ac";ctx.globalAlpha=f.ttl/f.maxTtl;ctx.lineWidth=2;
      ctx.beginPath();ctx.ellipse(sx,sy,r,r*.5,0,0,Math.PI*2);ctx.stroke();
      for(let i=-2;i<=2;i++){ctx.beginPath();ctx.moveTo(sx-r*.7,sy+i*r*.14-r*.25);ctx.lineTo(sx+r*.7,sy+i*r*.14+r*.25);ctx.stroke();ctx.beginPath();ctx.moveTo(sx-r*.7,sy+i*r*.14+r*.25);ctx.lineTo(sx+r*.7,sy+i*r*.14-r*.25);ctx.stroke();}
    } else if (f.type === "tripwire") {
      const x0 = U.isoX(f.x0, f.y0) - cam.x, y0 = U.isoY(f.x0, f.y0) - cam.y - surfaceLift(f.x0,f.y0,f.surfaceId), x1 = U.isoX(f.x1, f.y1) - cam.x, y1 = U.isoY(f.x1, f.y1) - cam.y - surfaceLift(f.x1,f.y1,f.surfaceId);
      ctx.strokeStyle = f.sprung ? "#7a2a2a" : "#b8b0a0"; ctx.globalAlpha = 0.85; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    } else if (f.type === "outbreak") {
      ctx.strokeStyle = "#90ff70"; ctx.shadowColor = "#52c020"; ctx.shadowBlur = 10; ctx.globalAlpha = 0.6; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(sx, sy, f.r * 32, f.r * 16, 0, 0, 6.283); ctx.stroke(); ctx.shadowBlur = 0;
    } else if (f.type === "totem") {
      const col = f.totemKind === "tempest" ? "#fff080" : "#cfe0ff";
      ctx.fillStyle = "#5a4a32"; ctx.fillRect(sx - 3, sy - 30, 6, 30);
      ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 10; ctx.beginPath(); ctx.arc(sx, sy - 34, 5, 0, 6.283); ctx.fill(); ctx.shadowBlur = 0;
      if (f.totemKind === "tempest" && f.ringR > 0) { ctx.strokeStyle = col; ctx.globalAlpha = 0.5; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(sx, sy, f.ringR * 32, f.ringR * 16, 0, 0, 6.283); ctx.stroke(); }
    } else if (f.type === "cyclone") {
      if (f.orb) { ctx.fillStyle = "#fff080"; ctx.shadowColor = "#fff080"; ctx.shadowBlur = 16; ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.arc(sx, sy - 14, 8 + Math.sin(state.time * 14) * 2, 0, 6.283); ctx.fill(); ctx.shadowBlur = 0; }
      else {
        /* a real tornado: a narrow-footed funnel that widens upward, swirling debris bands + spiral lines + a dust skirt */
        const baseR = f.radius * 16, H = 70 + f.radius * 12, bands = 9;
        ctx.save();
        ctx.globalAlpha = 0.3; ctx.fillStyle = "#b6c2d2";   // kicked-up dust at the base
        ctx.beginPath(); ctx.ellipse(sx, sy, baseR * 1.5, baseR * 0.6, 0, 0, 6.283); ctx.fill();
        ctx.globalCompositeOperation = "lighter";
        for (let i = 0; i < bands; i++) {                    // stacked rotating bands, narrow at the ground
          const t = i / (bands - 1), yy = sy - t * H, w = baseR * (0.3 + t * 1.25);
          const sway = Math.sin(state.time * 9 - t * 4 + f.x) * (3 + t * 9);
          ctx.globalAlpha = 0.16 + (1 - t) * 0.14; ctx.fillStyle = t > 0.6 ? "#e2ecf8" : "#a8b4c6";
          ctx.beginPath(); ctx.ellipse(sx + sway, yy, w, w * 0.4, 0, 0, 6.283); ctx.fill();
        }
        ctx.globalAlpha = 0.5; ctx.strokeStyle = "#eef4ff"; ctx.lineWidth = 1.4;   // two debris spirals winding up
        for (let s2 = 0; s2 < 2; s2++) {
          ctx.beginPath();
          for (let i = 0; i <= bands * 2; i++) {
            const t = i / (bands * 2), yy = sy - t * H, w = baseR * (0.3 + t * 1.25);
            const a = state.time * 10 - t * 11 + s2 * Math.PI + f.x;
            const px = sx + Math.cos(a) * w * 0.92, py = yy + Math.sin(a) * w * 0.22;
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
          }
          ctx.stroke();
        }
        ctx.restore();
      }
    } else if (f.type === "wisp") {
      ctx.fillStyle = "#fff080"; ctx.shadowColor = "#fff080"; ctx.shadowBlur = 8; ctx.beginPath(); ctx.arc(sx, sy - 10, 3, 0, 6.283); ctx.fill(); ctx.shadowBlur = 0;
    } else if (f.type === "fissure") {
      /* a jagged crack tearing open along the line, with molten earth-glow seeping up it */
      const prog = 1 - U.clamp(f.ttl / f.maxTtl, 0, 1), grow = Math.min(1, prog / 0.35), fade = U.clamp(f.ttl / f.maxTtl / 0.5, 0, 1);
      const n = Math.max(2, Math.round(f.len)), lim = Math.max(1, Math.floor(n * grow)), pxw = -Math.sin(f.ang), pyw = Math.cos(f.ang);
      const proj = i => { const t = (i / n) * f.len, j = (i > 0 && i < n) ? Math.sin(i * 1.9 + f.seed) * 0.22 : 0; const wx = f.x0 + Math.cos(f.ang) * t + pxw * j, wy = f.y0 + Math.sin(f.ang) * t + pyw * j; return [U.isoX(wx, wy) - cam.x, U.isoY(wx, wy) - cam.y - surfaceLift(wx,wy)]; };
      const stroke = (col, w) => { let p = proj(0); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(p[0], p[1]); for (let i = 1; i <= lim; i++) { p = proj(i); ctx.lineTo(p[0], p[1]); } ctx.stroke(); };
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.globalAlpha = 0.85 * fade; stroke("#160f06", 8);                         // dark crack body
      ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.7 * fade;
      ctx.shadowColor = "#ff5a10"; ctx.shadowBlur = 10; stroke("#ff7a20", 3.2);    // molten glow
      ctx.shadowBlur = 0;
    } else if (f.type === 'enemywarning') {
      if(typeof Act1EnemyAnimation!=='undefined'&&!Act1EnemyAnimation.showsAttackRadius(f.owner||f.projectile?.lob?.owner)){ctx.restore();return;}
      if(f.ttl<=0||state.player.dead||((typeof Act2EnemyAnimation!=='undefined'&&!Act2EnemyAnimation.showsAttackRadius(f.owner))||(typeof Act5EnemyAnimation!=='undefined'&&!Act5EnemyAnimation.showsAttackRadius(f.owner||f.projectile?.lob?.owner)))){ctx.restore();return;}
      const s=f.shape,count=s.kind==='line'?4:48;
      // Static warnings reuse their projected vertices. Camera motion changes
      // only the draw offset; moving whirlwinds refresh the same small buffer.
      if(!f.vertices||f.vertexX!==s.x||f.vertexY!==s.y){
        const points=f.vertices||(f.vertices=new Float32Array(count*2));f.vertexX=s.x;f.vertexY=s.y;
        const c=Math.cos(s.angle||0),n=Math.sin(s.angle||0),w=(s.width||0)/2;
        for(let i=0;i<count;i++){
          let x,y;
          if(s.kind==='line'){const along=i===1||i===2?s.length:0,side=i<2?1:-1;x=s.x+c*along-n*w*side;y=s.y+n*along+c*w*side;}
          else {const a=i*Math.PI/24;x=s.x+Math.cos(a)*s.radius;y=s.y+Math.sin(a)*s.radius;}
          points[i*2]=U.isoX(x,y);points[i*2+1]=U.isoY(x,y)-surfaceLift(x,y);
        }
      }
      ctx.beginPath();for(let i=0;i<f.vertices.length;i+=2){const x=f.vertices[i]-cam.x,y=f.vertices[i+1]-cam.y;if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);}ctx.closePath();
      ctx.globalAlpha=.20;ctx.fillStyle=f.col;ctx.fill();
      ctx.globalAlpha=.96;ctx.lineWidth=3;ctx.strokeStyle=f.col;ctx.stroke();
    } else if (f.type === "slamwarning") {
      if(typeof Act1EnemyAnimation!=='undefined'&&!Act1EnemyAnimation.showsAttackRadius(f.owner)){ctx.restore();return;}
      if(f.owner.dead||state.player.dead||f.owner.slamWarning!==f||((typeof Act2EnemyAnimation!=='undefined'&&!Act2EnemyAnimation.showsAttackRadius(f.owner))||(typeof Act5EnemyAnimation!=='undefined'&&!Act5EnemyAnimation.showsAttackRadius(f.owner||f.projectile?.lob?.owner)))){ctx.restore();return;}
      // A world-space circle projects to radii sqrt(2)*32 and sqrt(2)*16.
      const rr=f.radius*32*Math.SQRT2,ry=rr*.5,k=1-U.clamp(f.ttl/f.maxTtl,0,1);
      ctx.globalAlpha=.22;ctx.fillStyle="#142939";
      ctx.beginPath();ctx.ellipse(sx,sy,rr,ry,0,0,Math.PI*2);ctx.fill();
      ctx.globalAlpha=.95;ctx.strokeStyle=f.col;ctx.lineWidth=3;
      ctx.beginPath();ctx.ellipse(sx,sy,rr,ry,0,0,Math.PI*2);ctx.stroke();
      ctx.globalAlpha=.16+k*.25;ctx.fillStyle=f.col;
      ctx.beginPath();ctx.ellipse(sx,sy,rr*k,ry*k,0,0,Math.PI*2);ctx.fill();
    } else if (f.type === "meteorfall") {
      if(typeof Act1EnemyAnimation!=='undefined'&&!Act1EnemyAnimation.showsAttackRadius(f.owner||f.projectile?.lob?.owner)){ctx.restore();return;}
      if((typeof Act2EnemyAnimation!=='undefined'&&!Act2EnemyAnimation.showsAttackRadius(f.owner))||(typeof Act5EnemyAnimation!=='undefined'&&!Act5EnemyAnimation.showsAttackRadius(f.owner||f.projectile?.lob?.owner))){ctx.restore();return;}
      /* GROUND CUE only (the impact zone); the falling rock is drawn over the actors below */
      const rr = f.radius * 32, ry = rr * 0.5, k = 1 - U.clamp(f.ttl / f.maxTtl, 0, 1);   // 0 → 1 at impact
      ctx.globalAlpha = 0.5 + Math.sin(state.time * 18) * 0.2;
      ctx.strokeStyle = "#ff6a30"; ctx.lineWidth = 2 + k * 2.5;
      ctx.beginPath(); ctx.ellipse(sx, sy, rr, ry, 0, 0, 6.283); ctx.stroke();
      ctx.globalAlpha = 0.14 + k * 0.34; ctx.fillStyle = "#ff7a30";
      ctx.beginPath(); ctx.ellipse(sx, sy, rr * k, ry * k, 0, 0, 6.283); ctx.fill();
      ctx.globalAlpha = 0.7; ctx.strokeStyle = "#ffd0a0"; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(sx - rr, sy); ctx.lineTo(sx + rr, sy); ctx.moveTo(sx, sy - ry); ctx.lineTo(sx, sy + ry); ctx.stroke();
    }
    ctx.restore();
  }

  function ambientFx(dt) {
    const m = state.map, p = state.player;
    /* embers near braziers, fog motes in dungeons, rain in fields */
    if (Math.random() < dt * 8) {
      for (const l of m.lights) {
        if (l.color !== "#ff9c50") continue;
        if (U.dist(l.x, l.y, p.x, p.y) > 14) continue;
        if (Math.random() < 0.5) particles.push({ surfaceId:TerrainLayers.current(state.map), x: l.x + U.rf(-0.2, 0.2), y: l.y + U.rf(-0.2, 0.2), vx: U.rf(-0.2, 0.2), vy: U.rf(-0.3, 0.1), z: U.rf(20, 30), color: "#ffb050", t: U.rf(0.5, 1.2), grav: -14 });
      }
    }
    /* chimney smoke — slow grey plumes lolling up off rooftops near the player */
    if (m.chimneys && m.chimneys.length && Math.random() < dt * 5) {
      for (const ch of m.chimneys) {
        if (U.dist(ch.x, ch.y, p.x, p.y) > 16) continue;
        if (Math.random() < 0.6) particles.push({ surfaceId:TerrainLayers.current(state.map), x: ch.x + U.rf(-0.1, 0.1), y: ch.y + U.rf(-0.1, 0.1), vx: U.rf(-0.05, 0.18), vy: U.rf(-0.12, 0.02), z: U.rf(34, 42), color: "#9aa0a8", t: U.rf(1.6, 3.0), grav: -7 });
      }
    }
  }

  /* =====================================================================
     RENDER
     ===================================================================== */
  /* Persistent screen-space scenery is checked-in sprite art. Dynamic
     lighting and weather are composited in their existing later passes. */
  const BACKDROP_ALIAS = { mine: "dungeon", icecave: "dungeon", temple: "snowwild", drowned: "marsh", tombs: "desert",
    palace: "desert", crypt: "dungeon", vigil: "dungeon", chapel: "dungeon", monastery: "dungeon",
    cathedral: "dungeon", bastion: "hellwild", throne: "hellwild", town: "fields" };

  function drawBackdrop(theme, m, W, H, cam) {
    if(m.cathedral?.environment){CathedralEnvironment.drawBackdrop(ctx,m,cam,W,H);return;}
    if(m.act5Environment||m.act2Visual||m.act3?.environment){LevelTerrain.drawEnvironmentBackdrop(ctx,m,cam,W,H);return;}
    const direct = SpriteAssets.maps.backdrops && SpriteAssets.maps.backdrops[theme];
    const key = direct ? theme : (BACKDROP_ALIAS[theme] || "default");
    const assetId = m.act3?.environment?.outdoor ? SpriteAssets.maps.props.act3_ground_sand : m.cathedral ? SpriteAssets.maps.props.cathedral_void_backdrop : SpriteAssets.maps.backdrops && (
      SpriteAssets.maps.backdrops[key] || SpriteAssets.maps.backdrops.default
    );
    if (!assetId) throw new Error(`Missing required authored backdrop mapping: ${key}`);
    const frame = SpriteAssets.getFrame(assetId);
    const sourceRatio = frame.sw / frame.sh, targetRatio = W / H;
    let sx = frame.sx, sy = frame.sy, sw = frame.sw, sh = frame.sh;
    if (sourceRatio < targetRatio) { sh = sw / targetRatio; sy += (frame.sh - sh) / 2; }
    else { sw = sh * targetRatio; sx += (frame.sw - sw) / 2; }
    ctx.drawImage(frame.image, sx, sy, sw, sh, 0, 0, W, H);
  }

  /* re-evaluate every ground item's filter display (cheap; only on drop / filter change /
     map load, never per frame). Driven by LootFilter.version (see update()). */
  function refreshLoot() {
    if (!state) return;
    for (const gi of state.ground) gi.filt = LootFilter.evaluate(gi, state.player);
    lootFilterVersion = LootFilter.version;
  }
  /* ground-item name labels, drawn AFTER all geometry + lighting so walls/props never
     obscure them. Presentation comes from gi.filt (LootFilter). Also rebuilds labelRects. */
  function drawLootLabels(cam) {
    labelRects = [];
    const W = ctx.canvas.width, H = ctx.canvas.height, M = 80 + SpriteAssets.WALL_VIEW_H;   // self-contained viewport test
    const vis = (sx, sy) => sx > -M && sx < W + M && sy > -M && sy < H + M;
    const reveal = mouse.alt || LootFilter.revealing;            // hold to reveal hidden (faded)
    const plate = (gi, f, sx, sy, tossZ, faded, hover) => {
      if(!TerrainLayers.same(gi,state.player))return;
      const text = gi.gold ? `${gi.gold} gold` : ((gi.item.identified ? gi.item.name : gi.item.baseName) + (gi.item.count > 1 ? ` (${gi.item.count})` : ""));
      const sz = Math.max(10, Math.round(12 * (f.size || 1)));
      ctx.font = `${sz}px 'Palatino Linotype', serif`;
      const tw = ctx.measureText(text).width + 10, bh = sz + 4;
      const lx = sx - tw / 2, ly = sy - 30 - (tossZ || 0) - (sz - 12);
      ctx.globalAlpha = faded ? 0.38 : 1;
      if (f.glow) { ctx.shadowColor = f.glow; ctx.shadowBlur = 9; }    // glow halo
      ctx.fillStyle = hover ? "rgba(5,4,3,.92)" : "rgba(5,4,3,.82)";
      ctx.fillRect(lx, ly, tw, bh);
      ctx.shadowBlur = 0;
      if (f.glow || hover) { ctx.strokeStyle = (f.glow || f.color) + "90"; ctx.strokeRect(lx + 0.5, ly + 0.5, tw - 1, bh - 1); }   // border
      ctx.fillStyle = f.color; ctx.fillText(text, lx + 5, ly + bh - 4);
      ctx.globalAlpha = 1;
      labelRects.push({ x: lx, y: ly, w: tw, h: bh, gi });
    };
    for (const gi of state.ground) {
      const f = gi.filt || (gi.filt = LootFilter.evaluate(gi, state.player));
      const sx = U.isoX(gi.x, gi.y) - cam.x, sy = U.isoY(gi.x, gi.y) - cam.y - surfaceLift(gi.x,gi.y,gi.surfaceId);
      if (!vis(sx, sy)) continue;
      if (f.hide && !reveal) continue;                            // filtered out
      if (f.beam && !f.hide) {                                    // vertical loot beam beneath the label
        const bg = ctx.createLinearGradient(0, sy - 72, 0, sy);
        bg.addColorStop(0, "rgba(0,0,0,0)"); bg.addColorStop(1, f.beam + "b0");
        ctx.fillStyle = bg; ctx.fillRect(sx - 3, sy - 72, 6, 72);
      }
      const tossZ = gi.toss > 0 ? Math.sin(gi.toss / 0.35 * Math.PI) * 18 : 0;
      plate(gi, f, sx, sy, tossZ, f.hide, false);                 // f.hide here = revealed-hidden → faded
    }
    /* hovered item always reveals its name, even if the filter hid it */
    if (hoverLabel && hoverLabel.gi && state.ground.includes(hoverLabel.gi) && !labelRects.some(r => r.gi === hoverLabel.gi)) {
      const gi = hoverLabel.gi, f = gi.filt || LootFilter.evaluate(gi, state.player);
      const sx = U.isoX(gi.x, gi.y) - cam.x, sy = U.isoY(gi.x, gi.y) - cam.y - surfaceLift(gi.x,gi.y,gi.surfaceId);
      plate(gi, f, sx, sy, 0, false, true);
      ctx.fillStyle = f.color + "28"; ctx.beginPath(); ctx.ellipse(sx, sy, 15, 7.5, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.font = "12px 'Palatino Linotype', serif";
  }

  function render() {
    const m = state.map, p = state.player;
    const cam = camera();
    const W = canvas.width, H = canvas.height;
    LevelTerrain.beginFrame(m);
    try {
    drawBackdrop(m.zone.theme, m, W, H, cam);

    /* visible tile bounds */
    const margin = 96;
    const inView = (sx, sy) => sx > -margin && sx < W + margin && sy > -margin - SpriteAssets.WALL_VIEW_H && sy < H + margin;
    /* Cull tile iteration to the bounding box of the on-screen iso diamond so we don't walk
       every tile of a 100×100 map each frame. Invert isoX=(x-y)*32, isoY=(x+y)*16:
       u=x-y, v=x+y → x=(u+v)/2, y=(v-u)/2. Generous vertical pad covers tall walls + elevation lift.
       The precise per-tile inView() check below still runs; this only skips far-offscreen tiles. */
    const vPad = margin + SpriteAssets.WALL_VIEW_H + EH * 6;
    const uLo = (cam.x - margin) / 32, uHi = (cam.x + W + margin) / 32;
    const vLo = (cam.y - vPad) / 16, vHi = (cam.y + H + vPad) / 16;
    const tx0 = Math.max(0, Math.floor((uLo + vLo) / 2) - 2), tx1 = Math.min(m.w - 1, Math.ceil((uHi + vHi) / 2) + 2);
    const ty0 = Math.max(0, Math.floor((vLo - uHi) / 2) - 2), ty1 = Math.min(m.h - 1, Math.ceil((vHi - uLo) / 2) + 2);

    /* ---- floors ---- */
    const theme = m.zone.theme;
    const massifTerrain = m.outdoor && MASSIF_THEMES.has(theme);
    const ev = m.elev;
    if (m.settlement) TownTerrain.draw(ctx,m,cam);
    if(m.surfaceVersion&&!m.settlement)LevelTerrain.drawSurface(ctx,m,cam,tx0,tx1,ty0,ty1,inView,true);
    if(!m.settlement&&!m.surfaceVersion)LevelTerrain.drawFloor(ctx,m,cam,tx0,tx1,ty0,ty1,inView,true);

    /* ---- ground items: ICONS ONLY (flat). Their name labels are drawn later, on top of
       walls/props/actors, in drawLootLabels() so geometry never obscures them. ---- */
    for (const gi of state.ground) {
      if(m.layers&&gi.surfaceId)continue;
      const sx = U.isoX(gi.x, gi.y) - cam.x, sy = U.isoY(gi.x, gi.y) - cam.y - surfaceLift(gi.x,gi.y,gi.surfaceId);
      if (!inView(sx, sy)) continue;
      ctx.save();LevelTerrain.clipBehind(ctx,m,cam,gi.x,gi.y,gi.surfaceId);
      const tossZ = gi.toss > 0 ? Math.sin(gi.toss / 0.35 * Math.PI) * 18 : 0;
      if (gi.gold) {
        SpriteAssets.drawFrame(ctx, SpriteAssets.goldFrame(), sx, sy - 5 - tossZ, { scale: .46 });
      } else {
        const icon = SpriteAssets.itemIcon(gi.item), s = 0.62;
        ctx.save(); ctx.translate(sx, sy - 6 - tossZ); ctx.scale(s, s);
        ctx.drawImage(icon, -icon.width / 2, -icon.height / 2); ctx.restore();
        if (gi.item.rarity !== "common") {   /* rarity gleam stays on the ground */
          ctx.fillStyle = Items.RARITY_COLOR[gi.item.rarity] + "30";
          ctx.beginPath(); ctx.ellipse(sx, sy, 14, 7, 0, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.restore();
    }

    /* ---- depth-sorted drawables: walls, props, entities, projectiles ---- */
    const draws = [];
    if(m.cathedral?.environment)CathedralEnvironment.append(draws,m,cam,p,W,H);
    if(m.boundaries)Act2Boundaries.append(draws,m,cam,p,W,H);
    if(m.act1Environment)Act1Environment.append(draws,m,cam,p,W,H);
    if(m.act3?.architecture)ImperialArchitecture.append(draws,m,cam,p,W,H);
    if(m.act3?.environment)ImperialEnvironment.append(draws,m,cam,p,W,H);
    /* walls: only facades (wall tiles with a floor neighbor) — culled to the visible box */
    if(!m.act5Environment&&!m.act1Environment&&!m.boundaries&&!m.act3?.architecture&&!(m.composition||m.frontier)?.terrainWalls)for (let y = ty0; y <= ty1; y++) for (let x = tx0; x <= tx1; x++) {
      const i = x + y * m.w;
      if (!m.walls[i] || m.void?.[i]) continue;
      if ((m.composition||m.frontier)?.terrainWalls) continue; // cached surface cliffs define these solid landforms
      /* Outdoor massifs are facades on cardinal collision boundaries. A tile
         touching floor only at a corner is still interior terrain and must not
         grow another full mountain. Masonry keeps its historical corner reveal. */
      let vis = false;
      if (massifTerrain) {
        for (const [ox, oy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
          const nx = x + ox, ny = y + oy;
          if (nx >= 0 && ny >= 0 && nx < m.w && ny < m.h && !m.walls[nx + ny * m.w]) { vis = true; break; }
        }
      } else {
        for (let oy = -1; oy <= 1 && !vis; oy++) for (let ox = -1; ox <= 1; ox++) {
          const nx = x + ox, ny = y + oy;
          if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h) continue;
          if (!m.walls[nx + ny * m.w]) { vis = true; break; }
        }
      }
      let wallMask = 0;
      if (y > 0 && m.walls[i - m.w]) wallMask |= 1;
      if (x + 1 < m.w && m.walls[i + 1]) wallMask |= 2;
      if (y + 1 < m.h && m.walls[i + m.w]) wallMask |= 4;
      if (x > 0 && m.walls[i - 1]) wallMask |= 8;
      const sx = U.isoX(x + 0.5, y + 0.5) - cam.x, sy = U.isoY(x + 0.5, y + 0.5) - cam.y;
      if (!inView(sx, sy)) continue;
      draws.push({ d: x + y, kind: vis ? "wall" : "wallcap", sx, sy, x, y, wallMask });
    }
    for(const sc of (m.composition||m.frontier)?.scenery||[]){
      const sx=U.isoX(sc.x,sc.y)-cam.x,sy=U.isoY(sc.x,sc.y)-cam.y-elevLift(sc.x,sc.y);
      if(sx>-400&&sx<W+400&&sy>-100&&sy<H+500)draws.push({d:sc.x+sc.y,kind:'scenery',sx,sy,sc});
    }
    for (const pr of state.map.props) {
      if (pr.hidden) continue;
      const sx = U.isoX(pr.x, pr.y) - cam.x, sy = U.isoY(pr.x, pr.y) - cam.y;
      if (pr.building || PropInteractions.themed(pr)) {
        const f=propSpriteFrame(pr);
        const anchorX=pr.flipX?f.sw-f.anchorX:f.anchorX;
        const seated=sy-elevLift(pr.x,pr.y,pr.surfaceId);
        if(sx-anchorX>W || sx-anchorX+f.sw<0 || seated-f.anchorY>H || seated-f.anchorY+f.sh<0)continue;
      } else if (!inView(sx, sy)) continue;
      draws.push({ d: pr.x + pr.y, kind: "prop", sx, sy, pr });
    }
    for (const mon of opening.actor ? [...state.monsters,opening.actor] : state.monsters) {
      if (mon.husk) continue;                 // corpse husks (spawnCorpse) are logical-only, never drawn
      const point=renderPosition(mon);
      const sx = U.isoX(point.x, point.y) - cam.x, sy = U.isoY(point.x, point.y) - cam.y;
      const geometry = monsterGeometry(mon, cam);
      if (geometry.right < 0 || geometry.left > W || geometry.bottom < 0 || geometry.top > H + 100) continue;
      draws.push({ d: point.x + point.y, kind: "mon", sx, sy, mon, geometry });
    }
    for (const mi of state.minions) {
      const point=renderPosition(mi);
      const sx = U.isoX(point.x, point.y) - cam.x, sy = U.isoY(point.x, point.y) - cam.y;
      if (!inView(sx, sy)) continue;
      draws.push({ d: point.x + point.y, kind: "minion", sx, sy, mi });
    }
    for (const tr of state.traps) {
      const sx = U.isoX(tr.x, tr.y) - cam.x, sy = U.isoY(tr.x, tr.y) - cam.y - surfaceLift(tr.x,tr.y,tr.surfaceId);
      if (!inView(sx, sy)) continue;
      draws.push({ d: tr.x + tr.y - 0.4, kind: "trap", sx, sy, tr });
    }
    for (const n of state.npcs) {
      const sx = U.isoX(n.x, n.y) - cam.x, sy = U.isoY(n.x, n.y) - cam.y;
      draws.push({ d: n.x + n.y, kind: "npc", sx, sy, n });
    }
    for(const hero of state.players||[p]){
      const point=renderPosition(hero),sx=U.isoX(point.x,point.y)-cam.x,sy=U.isoY(point.x,point.y)-cam.y;
      draws.push({d:point.x+point.y,kind:"player",sx,sy,hero});
    }
    for (const pr of state.projectiles) {
      const point=renderPosition(pr),sx = U.isoX(point.x, point.y) - cam.x, sy = U.isoY(point.x, point.y) - cam.y;
      draws.push({ d: point.x + point.y, kind: "proj", sx, sy, pr });
    }
    for (const ps of portalPositions()) {
      const sx = U.isoX(ps.x, ps.y) - cam.x, sy = U.isoY(ps.x, ps.y) - cam.y - surfaceLift(ps.x,ps.y,ps.surfaceId);
      draws.push({ d: ps.x + ps.y, kind: "portal", sx, sy, ps });
    }
    /* transient fields/banners/totems/weather, beneath the actors */
    for (const f of state.fx) if(!f.surfaceId&&f.type!=="slamwarning"&&f.type!=='enemywarning'&&!(typeof SkillVFX!=='undefined'&&SkillVFX.isStyled(f)))drawFx(f, cam);
    if(typeof SkillVFX!=='undefined'){
      SkillVFX.drawGround(ctx,state,cam);
      SkillVFX.appendDraws(draws,state,cam,W,H);
    }

    if(typeof BossVFX!=='undefined'){BossVFX.drawGround(ctx,state,cam);BossVFX.appendDraws(draws,state,cam,W,H);}
    if(typeof Act2EnemyAnimation!=='undefined')Act2EnemyAnimation.drawGround(ctx,state,cam);
    if(typeof Act5EnemyAnimation!=='undefined')Act5EnemyAnimation.drawGround(ctx,state,cam);
    if(typeof Act1EnemyAnimation!=='undefined')Act1EnemyAnimation.drawGround(ctx,state,cam);
    if(m.layers){
      draws.push({kind:'imperialGroundFx',d:-Infinity});
      for(const gi of state.ground)if(gi.surfaceId)draws.push({kind:'imperialLoot',d:gi.x+gi.y,gi});
      for(const d of draws){
        d.surfaceId=TerrainLayers.id(d.mon||d.mi||d.tr||d.n||d.pr||d.ps||d.payload?.field||d.payload?.event||d.payload?.particles?.[0]||d.payload?.ghost||(d.kind==='player'?p:null));
        d.floorOrder=d.kind==='imperialPlane'?1:d.kind==='imperialGroundFx'?1.5:d.kind==='imperialRail'||d.kind==='imperialLoot'||d.surfaceId?2:0;
      }
    }
    if(m.act5Environment)CindersBoundaries.append(draws,m,cam,p,W,H);
    draws.sort((a, b) => (a.floorOrder||0)-(b.floorOrder||0)||a.d-b.d);
    if(m.act5Environment)CindersBoundaries.merge(draws,m,cam,p);

    const beneathGallery=m.layers&&!p.surfaceId&&m.act3.architecture.bridges.some(b=>p.x>=b.lo&&p.x<b.hi&&p.y>b.y0-2&&p.y<b.y1+2);
    for (const d of draws) {
      const fadeUpper=beneathGallery&&d.floorOrder>=1.5&&d.kind!=='imperialRail';
      if(fadeUpper){ctx.save();ctx.globalAlpha=.18;}
      switch (d.kind) {
        case 'imperialGroundFx':
          for(const f of state.fx)if(f.surfaceId&&f.type!=='slamwarning'&&f.type!=='enemywarning'&&!(typeof SkillVFX!=='undefined'&&SkillVFX.isStyled(f)))drawFx(f,cam);
          if(typeof SkillVFX!=='undefined')SkillVFX.drawGround(ctx,state,cam,1);
          break;
        case 'imperialLoot': {
          const gi=d.gi,sx=U.isoX(gi.x,gi.y)-cam.x,sy=U.isoY(gi.x,gi.y)-cam.y-surfaceLift(gi.x,gi.y,1);
          if(gi.gold)SpriteAssets.drawFrame(ctx,SpriteAssets.goldFrame(),sx,sy-5,{scale:.46});
          else{const icon=SpriteAssets.itemIcon(gi.item);ctx.drawImage(icon,sx-icon.width*.31,sy-icon.height*.31-6,icon.width*.62,icon.height*.62);}break;
        }
        case 'imperialWall': case 'imperialCap': case 'imperialPlane': case 'imperialSupport': case 'imperialRail':
          ImperialArchitecture.draw(ctx,d,m,cam,p);break;
        case 'scenery': {
          const id=SpriteAssets.maps.massifs[`${theme}_${d.sc.variant}`];
          if(id){const f=SpriteAssets.getFrame(id,0),s=d.sc.scale;ctx.save();
            ctx.translate(d.sx,d.sy);ctx.scale(s,s);SpriteAssets.drawFrame(ctx,f,0,0);ctx.restore();}
          break;
        }
        case "bossvfx":
          ctx.save();LevelTerrain.clipBehind(ctx,m,cam,d.x,d.y);BossVFX.drawItem(ctx,d,cam);ctx.restore();break;
        case "skillvfx":
          ctx.save();LevelTerrain.clipBehind(ctx,m,cam,d.x,d.y,d.surfaceId);SkillVFX.drawItem(ctx,d,cam);ctx.restore();break;
        case "act5Boundary": CindersBoundaries.draw(ctx,d,p);break;
        case "act2Boundary": Act2Boundaries.draw(ctx,d,p);break;
        case "cathedralWall": CathedralEnvironment.draw(ctx,d,p);break;
        case "imperialEnvironment": ImperialEnvironment.draw(ctx,d,p);break;
        case "act1Boundary": Act1Environment.draw(ctx,d,p);break;
        case "wall":
        case "wallcap": {
          if (m.outdoor && MASSIF_THEMES.has(theme)) {   /* thematic impassable terrain: mountains/rock/boulders/spires/hills/thickets */
            /* A massif is a tall boundary facade, not a tile cap. Drawing one for
               every hidden wall cell makes dense terrain blobs explode into a
               carpet of overlapping mountains (their centers are only 32x16px
               apart). Interior wallcaps stay logically blocked but draw nothing. */
            if (d.kind === "wall") {
              const variant = (((d.x * 73856093) ^ (d.y * 19349663)) >>> 0) % 6;
              const massifId = SpriteAssets.maps.massifs[`${theme}_${variant}`];
              /* Massif art uses a bottom-center prop anchor, so seat that bottom
                 on the south vertex of the blocked 64x32 tile. */
              if (massifId) SpriteAssets.drawFrame(ctx, SpriteAssets.getFrame(massifId, 0), d.sx, d.sy + 16);
            }
          } else if (d.kind === "wall") {
            const wallId = SpriteAssets.maps.walls[theme];
            /* Authored 128px wall cells use anchor [64,112]; their 64x32 base is
               already registered to the tile center. The old +16 belonged to the
               procedural wall origin and shifted the new sprites half a tile. */
            if (wallId) SpriteAssets.drawFrame(ctx, SpriteAssets.getFrame(wallId, d.wallMask), d.sx, d.sy);
          } else { /* interior wall mass: just the raised roof tile */
            if(m.settlement)SpriteAssets.drawFrame(ctx,SpriteAssets.getFrame(SpriteAssets.maps.grounds[m.id],2),d.sx,d.sy-SpriteAssets.WALL_H);
            else LevelTerrain.drawTile(ctx,m,d.x,d.y,d.sx,d.sy-SpriteAssets.WALL_H);
          }
          break;
        }
        case "prop": drawProp(d); break;
        case "mon": {
          drawEntity(d.mon, d.sx, d.sy);
          d.sy-=surfaceLift(d.mon.x,d.mon.y,d.mon.surfaceId);
          /* hex rune above cursed monsters */
          const m2 = d.mon;
          const cursed = (m2.curseFrailty && state.time < m2.curseFrailty.until) || (m2.curseWither && state.time < m2.curseWither.until);
          if (cursed && !m2.dead) {
            const bob2 = Math.sin(state.time * 3 + m2.x) * 2;
            ctx.fillStyle = "#b070d0";
            ctx.shadowColor = "#b070d0"; ctx.shadowBlur = 6;
            ctx.font = "12px serif"; ctx.textAlign = "center";
            ctx.fillText("✦", d.sx, d.sy - 56 * m2.scale + bob2);
            ctx.textAlign = "left"; ctx.shadowBlur = 0;
          }
          /* ---- hunter's marks & bleeds, shown over the foe ---- */
          if (!m2.dead) {
            const iy = d.sy - 62 * m2.scale;
            /* Killing Mark: a pulsing red death-crosshair (target takes bonus damage; detonates on death) */
            if (m2.killMark && state.time < m2.killMark.until) {
              const r = 5 + Math.sin(state.time * 6) * 1.2;
              ctx.strokeStyle = "#ff3b3b"; ctx.lineWidth = 1.6; ctx.shadowColor = "#ff2020"; ctx.shadowBlur = 6;
              ctx.beginPath(); ctx.arc(d.sx, iy, r, 0, 6.283); ctx.stroke();
              ctx.beginPath();
              ctx.moveTo(d.sx - r - 3, iy); ctx.lineTo(d.sx - r + 1, iy);
              ctx.moveTo(d.sx + r - 1, iy); ctx.lineTo(d.sx + r + 3, iy);
              ctx.moveTo(d.sx, iy - r - 3); ctx.lineTo(d.sx, iy - r + 1);
              ctx.moveTo(d.sx, iy + r - 1); ctx.lineTo(d.sx, iy + r + 3);
              ctx.stroke(); ctx.shadowBlur = 0;
            }
            /* Quarry: one yellow pip per hunter's-mark stack, just under the head */
            if (m2.quarry && state.time < m2.quarry.until) {
              const n = Math.min(5, m2.quarry.stacks || 1);
              ctx.fillStyle = "#ffd24c"; ctx.shadowColor = "#caa030"; ctx.shadowBlur = 3;
              for (let i = 0; i < n; i++) { ctx.beginPath(); ctx.arc(d.sx - (n - 1) * 3 + i * 6, iy + 12, 1.9, 0, 6.283); ctx.fill(); }
              ctx.shadowBlur = 0;
            }
            /* Scorch: one flickering flame pip per stack, over the head (Cinder's stacking burn) */
            if (m2.scorch && state.time < m2.scorch.until && m2.scorch.stacks > 0) {
              const n = Math.min(5, m2.scorch.stacks), flick = 0.6 + Math.sin(state.time * 14 + m2.x) * 0.3;
              ctx.save(); ctx.shadowColor = "#ff5a10"; ctx.shadowBlur = 5; ctx.globalAlpha = flick;
              for (let i = 0; i < n; i++) {
                const px = d.sx - (n - 1) * 4 + i * 8, py = iy - 7 - Math.sin(state.time * 10 + i) * 1.2;
                ctx.fillStyle = "#ff7a20";
                ctx.beginPath(); ctx.moveTo(px, py - 5); ctx.quadraticCurveTo(px + 2.7, py - 1, px, py + 3); ctx.quadraticCurveTo(px - 2.7, py - 1, px, py - 5); ctx.fill();
                ctx.fillStyle = "#ffe27a";
                ctx.beginPath(); ctx.moveTo(px, py - 2.4); ctx.quadraticCurveTo(px + 1.3, py - 0.3, px, py + 1.6); ctx.quadraticCurveTo(px - 1.3, py - 0.3, px, py - 2.4); ctx.fill();
              }
              ctx.restore();
            }
            /* Bleed / DoT: dripping blood (orange when burning) on the body */
            if (m2.poisonDot && m2.poisonDot.t > 0) {
              ctx.fillStyle = m2.poisonDot.fire ? "#ff7a20" : "#c81818";
              for (let i = 0; i < 3; i++) { const dy = (state.time * 16 + i * 6) % 11; ctx.beginPath(); ctx.ellipse(d.sx + 8 + (i - 1) * 3, d.sy - 16 + dy, 1.3, 2.3, 0, 0, 6.283); ctx.fill(); }
            }
          }
          break;
        }
        case "minion": {
          const mi = d.mi;
          drawEntity(mi, d.sx, d.sy);
          d.sy-=surfaceLift(mi.x,mi.y,mi.surfaceId);
          /* minion life bars: always / when hurt (recent hit or missing life) / never */
          const mode = options.minionBars;
          if (!mi.dead && mode !== "never" && (mode === "always" || state.time - mi.lastHitT < 3)) {
            const bw = 26, frac = U.clamp(mi.hp / mi.maxHp, 0, 1);
            const bx = d.sx - bw / 2, by = d.sy - 52 * (mi.spriteOpts.scale || 1) - 8;
            ctx.fillStyle = "rgba(5,4,3,.75)";
            ctx.fillRect(bx - 1, by - 1, bw + 2, 5);
            ctx.fillStyle = "#243a24";
            ctx.fillRect(bx, by, bw, 3);
            ctx.fillStyle = frac > 0.4 ? "#58c868" : "#c8a838";
            ctx.fillRect(bx, by, bw * frac, 3);
          }
          /* Bone Golem: float its stitched-corpse count over its skull */
          if (mi.kindId === "bone_golem" && !mi.dead) {
            const ny = d.sy - 52 * (mi.spriteOpts.scale || 1) - 18, label = "✚ " + (mi.stitches || 1) + "/" + (mi.maxStitch || mi.stitches || 1);
            ctx.font = "bold 13px 'Palatino Linotype', serif"; ctx.textAlign = "center";
            ctx.fillStyle = "#0a0805"; ctx.fillText(label, d.sx + 1, ny + 1);
            ctx.fillStyle = "#e6d6a6"; ctx.shadowColor = "#7a0000"; ctx.shadowBlur = 6; ctx.fillText(label, d.sx, ny); ctx.shadowBlur = 0;
            ctx.textAlign = "left";
          }
          break;
        }
        case "trap": {
          const tr = d.tr;
          const col = tr.kind === "powder" ? "#ff9040" : tr.kind === "frost" ? "#9fd8ff" : "#c8c8c8";
          const trapAssetId = SpriteAssets.maps.traps && SpriteAssets.maps.traps[tr.kind];
          if (!trapAssetId) throw new Error(`Missing required trap sprite mapping: ${tr.kind}`);
          ctx.save();
          ctx.globalAlpha = tr.armT > 0 ? 0.45 + Math.sin(state.time * 12) * 0.2 : 0.95;
          SpriteAssets.drawFrame(ctx, SpriteAssets.getFrame(trapAssetId, 0), d.sx, d.sy);
          /* The device is authored art; this animated lamp is transient combat feedback. */
          if (tr.armT <= 0) {
            ctx.translate(d.sx, d.sy);
            ctx.fillStyle = col;
            ctx.shadowColor = col; ctx.shadowBlur = 5;
            ctx.beginPath(); ctx.arc(0, -1.5, 1.8 + Math.sin(state.time * 5) * 0.4, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
          }
          ctx.restore();
          ctx.globalAlpha = 1;
          if(typeof SkillVFX!=='undefined'){ctx.save();LevelTerrain.clipBehind(ctx,m,cam,tr.x,tr.y,tr.surfaceId);SkillVFX.drawTrap(ctx,tr,cam);ctx.restore();}
          break;
        }
        case "npc": {
          // Soul bindings supply their own figure; retain the NPC's interaction and marker.
          if (!(m.cathedral && d.n.storyId?.startsWith('trapped_soul_'))) drawEntity(d.n, d.sx, d.sy);
          d.sy-=surfaceLift(d.n.x,d.n.y);
          const trade=canTradeWith(d.n);
          if (d.n === hoverNpc) nameplate(d.n.name + (d.n.survivor ? " — click to rescue" : trade ? " — Trade available" : ""), d.sx, d.sy - 58, d.n.survivor ? "#ffe6a0" : "#9fdf9f");
          if (d.n.survivor || (d.n.openingTraveler && state.flags.opening?.stage==="rescueTalk")) drawQuestMarker(d.sx, d.sy - 66, "save");
          else {
            const qm = state.flags.opening?.stage==="hearth" && d.n.id==="sera" ? "!" : d.n.storyId ? "save" : questMarkerFor(d.n.id,d.n.spriteOpts.npcArt);
            if (qm) drawQuestMarker(d.sx+(trade?12:0), d.sy - 76, qm);
            if (trade) drawTradeMarker(d.sx-(qm?12:0),d.sy-82);
          }
          break;
        }
        case "player": {
          const p=d.hero||state.player;
          const point=renderPosition(p);
          if(typeof Coop!=="undefined"&&Coop.active)nameplate(p.name+(p.dead?" — fallen":""),d.sx,d.sy-88,p===state.player?"#e4ce91":"#97cbd4");
          drawLiveActor(playerModelOpts(p), p.pose(), d.sx, d.sy - (point.jumpZ || 0) - elevLift(point.x,point.y,point.surfaceId), p.flashT > 0, 1, null, point);
          if(typeof SkillVFX!=='undefined'){ctx.save();LevelTerrain.clipBehind(ctx,m,cam,p.x,p.y,p.surfaceId);SkillVFX.drawActor(ctx,p,cam);ctx.restore();}
          break;
        }
        case "proj": {
          const pr = d.pr;
          if(pr.imperialVisual){
            const col=pr.imperialVisual.color||'#a5cce0',a=Math.atan2(U.isoY(pr.vx,pr.vy),U.isoX(pr.vx,pr.vy));
            ctx.save();LevelTerrain.clipBehind(ctx,m,cam,pr.x,pr.y,pr.surfaceId);ctx.translate(d.sx,d.sy-(pr.imperialVisual.lift||34));ctx.rotate(a);ctx.strokeStyle=col;ctx.fillStyle=col;ctx.lineWidth=1.8;
            if(pr.imperialVisual.kind==='chain'){
              for(let i=0;i<4;i++){ctx.globalAlpha=1-i*.18;ctx.beginPath();ctx.ellipse(-i*6,0,4,i%2?1.6:3,0,0,Math.PI*2);ctx.stroke();}
              ctx.globalAlpha=1;ctx.beginPath();ctx.arc(3,0,3,0,Math.PI*2);ctx.fill();
            }else{ctx.beginPath();ctx.moveTo(10,0);ctx.lineTo(-5,4);ctx.lineTo(-2,0);ctx.lineTo(-5,-4);ctx.closePath();ctx.fill();ctx.stroke();}
            ctx.restore();break;
          }
          if(typeof BossVFX!=='undefined'&&BossVFX.enabled&&pr.bossVisual){ctx.save();LevelTerrain.clipBehind(ctx,m,cam,pr.x,pr.y,pr.surfaceId);BossVFX.drawProjectile(ctx,pr,cam);ctx.restore();break;}
          if(typeof SkillVFX!=='undefined'&&SkillVFX.enabled&&SkillVFX.recipes[pr.sourceSkill]){ctx.save();LevelTerrain.clipBehind(ctx,m,cam,pr.x,pr.y,pr.surfaceId);SkillVFX.drawProjectile(ctx,pr,cam);ctx.restore();break;}
          const northernLift=typeof Act1EnemyAnimation!=='undefined'&&Act1EnemyAnimation.eligible(pr.mon)?pr.lift:14;
          const a = pr.kind==='arrow'?Math.atan2(U.isoY(pr.vx,pr.vy),U.isoX(pr.vx,pr.vy)):Math.atan2(pr.vy * 0.5, pr.vx);
          if (pr.kind === "firebolt") {
            ctx.fillStyle = "#ff9040";
            ctx.shadowColor = "#ff7020"; ctx.shadowBlur = 12;
            ctx.beginPath(); ctx.arc(d.sx, d.sy - northernLift, 5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "#ffe0a0";
            ctx.beginPath(); ctx.arc(d.sx - Math.cos(a) * 1.5, d.sy - northernLift - .5, 2.2, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
          } else if (pr.kind === "frostshard" || pr.kind === "lance") {
            const L = pr.kind === "lance" ? 16 : 8;
            ctx.save();
            ctx.translate(d.sx, d.sy - northernLift); ctx.rotate(a);
            ctx.shadowColor = "#9fd8ff"; ctx.shadowBlur = 10;
            ctx.fillStyle = pr.kind === "lance" ? "#cfeaff" : "#9fd8ff";
            ctx.beginPath(); ctx.moveTo(L, 0); ctx.lineTo(-L * 0.6, 3); ctx.lineTo(-L * 0.3, 0); ctx.lineTo(-L * 0.6, -3); ctx.closePath(); ctx.fill();
            ctx.shadowBlur = 0;
            ctx.restore();
          } else if (pr.kind === "soulbolt" || pr.kind === "venom") {
            const col = pr.kind === "soulbolt" ? "#c080e0" : "#90ff70";
            ctx.fillStyle = col;
            ctx.shadowColor = col; ctx.shadowBlur = 10;
            ctx.beginPath(); ctx.arc(d.sx, d.sy - northernLift, 4.2, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "rgba(255,255,255,.5)";
            ctx.beginPath(); ctx.arc(d.sx - 1, d.sy - northernLift - 1, 1.6, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
          } else if (pr.kind === "spark") {
            ctx.strokeStyle = "#fff080"; ctx.lineWidth = 2;
            ctx.shadowColor = "#fff080"; ctx.shadowBlur = 8;
            ctx.beginPath();
            let jx = d.sx - Math.cos(a) * 9, jy = d.sy - northernLift - Math.sin(a) * 9;
            ctx.moveTo(jx, jy);
            for (let i = 1; i <= 3; i++) {
              jx = d.sx + Math.cos(a) * (i * 6 - 9) + Math.sin(state.time*31+i*8+pr.x)*2.5;
              jy = d.sy - northernLift + Math.sin(a) * (i * 6 - 9) + Math.cos(state.time*29+i*7+pr.y)*2.5;
              ctx.lineTo(jx, jy);
            }
            ctx.stroke();
            ctx.shadowBlur = 0;
          } else if (pr.kind === "shardbolt") {
            const col = { fire: "#ff5040", cold: "#9fd8ff", light: "#fff080" }[pr.elem] || "#ff5040";
            ctx.save();
            ctx.translate(d.sx, d.sy - northernLift); ctx.rotate(a);
            ctx.shadowColor = col; ctx.shadowBlur = 10;
            ctx.fillStyle = col;
            ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(0, 3); ctx.lineTo(-4, 0); ctx.lineTo(0, -3); ctx.closePath(); ctx.fill();
            ctx.shadowBlur = 0;
            ctx.restore();
          } else if (pr.kind === "axe") {
            ctx.save();
            ctx.translate(d.sx, d.sy - northernLift);
            ctx.rotate((pr.ttl || 0) * 22);   // tumbling through the air
            ctx.strokeStyle = "#6a4a2a"; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(0, 7); ctx.lineTo(0, -7); ctx.stroke();
            ctx.fillStyle = "#b9bec8";
            ctx.beginPath(); ctx.moveTo(0, -7); ctx.quadraticCurveTo(9, -8, 7, -1); ctx.quadraticCurveTo(3, -3, 0, -3); ctx.closePath(); ctx.fill();
            ctx.strokeStyle = "#6a707c"; ctx.lineWidth = 1; ctx.stroke();
            ctx.restore();
          } else if (pr.kind === "thrownaxe") {
            ctx.save(); ctx.translate(d.sx, d.sy - northernLift); ctx.rotate((pr.ttl || 0) * 26);
            ctx.strokeStyle = "#6a4a2a"; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(0, 9); ctx.lineTo(0, -9); ctx.stroke();
            ctx.fillStyle = "#cfd6e0";
            ctx.beginPath(); ctx.moveTo(0, -9); ctx.quadraticCurveTo(11, -10, 9, -1); ctx.quadraticCurveTo(4, -4, 0, -4); ctx.closePath(); ctx.fill();
            ctx.beginPath(); ctx.moveTo(0, 9); ctx.quadraticCurveTo(-11, 10, -9, 1); ctx.quadraticCurveTo(-4, 4, 0, 4); ctx.closePath(); ctx.fill();
            ctx.restore();
          } else if (pr.kind === "cadaver") {
            ctx.save(); ctx.translate(d.sx, d.sy - northernLift); ctx.rotate((pr.ttl || 0) * 14);
            ctx.strokeStyle = "#cfd8c0"; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(0, 8); ctx.stroke();
            for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.arc(0, i * 3.5, 5, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke(); }
            ctx.restore();
          } else if (pr.kind === "undeadbody") {
            /* a tumbling flung corpse, lifted by its arc; faint shadow marks where it lands */
            ctx.globalAlpha = 0.35; ctx.fillStyle = "#000"; ctx.beginPath(); ctx.ellipse(d.sx, d.sy, 7, 3.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
            ctx.save(); ctx.translate(d.sx, d.sy - northernLift - (pr.jumpZ || 0)); ctx.rotate((pr.lobT || 0) * 7);
            ctx.fillStyle = "#cfd8c0"; ctx.strokeStyle = "#5a5045"; ctx.lineWidth = 1.4;
            ctx.beginPath(); ctx.arc(0, -4, 3, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.moveTo(0, -1); ctx.lineTo(0, 6); ctx.moveTo(-5, 1); ctx.lineTo(5, 3); ctx.moveTo(-4, 8); ctx.lineTo(0, 5); ctx.lineTo(5, 9); ctx.stroke();
            ctx.restore();
          } else {
            ctx.strokeStyle = pr.kind==='arrow'&&typeof Act1EnemyAnimation!=='undefined'&&Act1EnemyAnimation.eligible(pr.mon)
              ?pr.mon.combatColor(pr.elem||'phys'):"#cabd9a"; ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(d.sx - Math.cos(a) * 8, d.sy - pr.lift - Math.sin(a) * 8);
            ctx.lineTo(d.sx + Math.cos(a) * 8, d.sy - pr.lift + Math.sin(a) * 8);
            ctx.stroke();
          }
          break;
        }
        case "portal": {
          const t = state.time;
          const isGate = d.ps.gate;
          const rim = isGate ? [216, 176, 96] : [110, 170, 255];   // gold waygate vs blue home portal
          ctx.save();
          for (let i = 0; i < 3; i++) {
            ctx.strokeStyle = `rgba(${rim[0]},${rim[1]},${rim[2]},${0.5 - i * 0.13})`;
            ctx.lineWidth = 3 - i;
            ctx.beginPath();
            ctx.ellipse(d.sx, d.sy - 26, 14 + i * 4 + Math.sin(t * 3 + i) * 2, 26 + i * 5, 0, 0, Math.PI * 2);
            ctx.stroke();
          }
          ctx.fillStyle = isGate ? "rgba(200,150,60,.25)" : "rgba(70,120,220,.25)";
          ctx.beginPath(); ctx.ellipse(d.sx, d.sy - 26, 13, 25, 0, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
          if (hoverPortal && hoverPortal.x === d.ps.x) {
            let destId;
            if (isGate) destId = d.ps.target;
            else destId = isHub(state.map.id) ? state.portal.mapId : (state.portal.home || state.home || "frosthaven");
            nameplate((isGate ? "Waygate to " : "Portal to ") + (DATA.ZONES[destId] ? DATA.ZONES[destId].name : "home"), d.sx, d.sy - 64, isGate ? "#e8c870" : "#8fd8ff");
          }
          break;
        }
      }
      if(fadeUpper)ctx.restore();
    }

    /* ---- particles (world space, after entities) ---- */
    for (const pa of particles) {
      const sx = U.isoX(pa.x, pa.y) - cam.x, sy = U.isoY(pa.x, pa.y) - cam.y - surfaceLift(pa.x,pa.y,pa.surfaceId) - pa.z;
      ctx.fillStyle = pa.color;
      ctx.globalAlpha = U.clamp(pa.t * 2.5, 0, 1);
      ctx.fillRect(sx - 1.5, sy - 1.5, 3, 3);
    }
    ctx.globalAlpha = 1;
    /* novas */
    for (const nv of novas) {
      if(nv.hideRadius||(nv.styled&&typeof SkillVFX!=='undefined'&&SkillVFX.enabled))continue;
      const sx = U.isoX(nv.x, nv.y) - cam.x, sy = U.isoY(nv.x, nv.y) - cam.y - surfaceLift(nv.x,nv.y,nv.surfaceId);
      const k = nv.t / nv.dur;
      ctx.strokeStyle = nv.color;
      ctx.globalAlpha = 1 - k;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(sx, sy, nv.radius * 32 * k + 6, nv.radius * 16 * k + 3, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    /* lightning arcs (Arc Lattice stream, Thunderstorm strikes) — jagged bright bolts */
    for (const b of bolts) {
      if(b.styled&&typeof SkillVFX!=='undefined'&&SkillVFX.enabled)continue;
      const x0 = U.isoX(b.x0, b.y0) - cam.x, y0 = U.isoY(b.x0, b.y0) - cam.y - surfaceLift(b.x0,b.y0,b.surfaceId) - 12;
      const x1 = U.isoX(b.x1, b.y1) - cam.x, y1 = U.isoY(b.x1, b.y1) - cam.y - surfaceLift(b.x1,b.y1,b.surfaceId) - 12;
      if (b.straight) {
        ctx.globalAlpha = U.clamp(1 - b.t / b.dur, 0, 1);
        ctx.lineCap = "round"; ctx.strokeStyle = b.color; ctx.shadowColor = b.color; ctx.shadowBlur = 12;
        ctx.lineWidth = b.width || 6; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
        ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
        ctx.shadowBlur = 0; ctx.globalAlpha = 1;
        continue;
      }
      const segs = 7, nx = -(y1 - y0), ny = (x1 - x0), nl = Math.hypot(nx, ny) || 1;
      const rng = (n) => { const v = Math.sin((b.seed + n * 73.1) * 12.9898) * 43758.5; return (v - Math.floor(v)) - 0.5; };
      const pts = [];
      for (let s = 0; s <= segs; s++) {
        const u = s / segs, off = (s === 0 || s === segs) ? 0 : rng(s) * 16;
        pts.push([x0 + (x1 - x0) * u + nx / nl * off, y0 + (y1 - y0) * u + ny / nl * off]);
      }
      ctx.globalAlpha = U.clamp(1 - b.t / b.dur, 0, 1);
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.strokeStyle = b.color; ctx.shadowColor = b.color; ctx.shadowBlur = 8;
      ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let s = 1; s < pts.length; s++) ctx.lineTo(pts[s][0], pts[s][1]); ctx.stroke();
      ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let s = 1; s < pts.length; s++) ctx.lineTo(pts[s][0], pts[s][1]); ctx.stroke();
      ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    }
    /* floating combat text */
    ctx.textAlign = "center";
    for (const f of floats) {
      const sx = U.isoX(f.x, f.y) - cam.x, sy = U.isoY(f.x, f.y) - cam.y - surfaceLift(f.x,f.y,f.surfaceId) - 46 - f.t * 30;
      ctx.font = (f.big ? "bold 17px" : "13px") + " 'Palatino Linotype', serif";
      ctx.globalAlpha = U.clamp(1.4 - f.t, 0, 1);
      ctx.fillStyle = "#000";
      ctx.fillText(f.text, sx + 1, sy + 1);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, sx, sy);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = "left";

    /* ---- per-biome weather (snow / rain / sand / ash / fog by zone theme) ---- */
    const wk = WEATHER[m.zone.theme];
    if (wk) drawWeather(wk, W, H);

    /* ---- lighting overlay ---- */
    renderLighting(cam);
    if(m.cathedral?.environment)CathedralEnvironment.atmosphere(ctx,m,cam,W,H,state.time);
    if(m.act2Visual)Act2Boundaries.atmosphere(ctx,m,cam,W,H,state.time);
    if(typeof SkillVFX!=='undefined')SkillVFX.drawLights(ctx,state,cam);

    /* ---- restrained color grade + lens vignette ---- */
    renderScreenGrade(m.zone.theme, W, H);

    /* ---- loot name labels: on top of geometry + lighting so they're always legible ---- */
    drawLootLabels(cam);

    /* ---- falling meteors + pyre eruptions: drawn over the darkness so the fire reads brightly ---- */
    for (const f of state.fx) {
      if (f.type === "meteorfall") {
        if(typeof SkillVFX!=='undefined'&&SkillVFX.isStyled(f))continue;
        const msx = U.isoX(f.x, f.y) - cam.x, msy = U.isoY(f.x, f.y) - cam.y - surfaceLift(f.x,f.y,f.surfaceId);
        drawMeteorBall(msx, msy, f.radius, 1 - U.clamp(f.ttl / f.maxTtl, 0, 1), f.col);
      } else if (f.type === "pyre") {
        if(typeof SkillVFX!=='undefined'&&SkillVFX.isStyled(f))continue;
        const psx = U.isoX(f.x, f.y) - cam.x, psy = U.isoY(f.x, f.y) - cam.y - surfaceLift(f.x,f.y,f.surfaceId);
        const k = 1 - U.clamp(f.ttl / f.maxTtl, 0, 1), rise = Math.sin(U.clamp(k, 0, 1) * Math.PI), rr = f.radius * 32;
        ctx.save(); ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = 0.5 * (1 - k); ctx.strokeStyle = "#ffb24a"; ctx.lineWidth = 3 + (1 - k) * 4;   // expanding ground ring
        ctx.beginPath(); ctx.ellipse(psx, psy, rr * (0.4 + k * 0.85), rr * 0.5 * (0.4 + k * 0.85), 0, 0, 6.283); ctx.stroke();
        const n = Math.max(6, Math.round(f.radius * 4));
        for (let i = 0; i < n; i++) {   // a ring of erupting flame tongues
          const a = (i / n) * Math.PI * 2, rad = (i % 2 ? rr * 0.5 : rr * 0.26);
          const px = psx + Math.cos(a) * rad, py = psy + Math.sin(a) * rad * 0.5;
          const h = (30 + Math.sin(state.time * 20 + i) * 8) * rise, sway = Math.sin(state.time * 8 + i) * 4;
          if (h < 3) continue;
          ctx.globalAlpha = 0.5 * rise; flameTongue(px, py, h * 1.15, sway, "#d22a08", 8);
          ctx.globalAlpha = 0.65 * rise; flameTongue(px, py, h, sway * 0.8, "#ff8a1e", 5.5);
          ctx.globalAlpha = 0.85 * rise; flameTongue(px, py, h * 0.55, sway * 0.6, "#ffe27a", 3);
        }
        ctx.globalAlpha = 0.8 * rise; flameTongue(psx, psy, 64 * rise, Math.sin(state.time * 10) * 5, "#ff8a1e", 10);   // central column
        ctx.globalAlpha = 0.95 * rise; flameTongue(psx, psy, 42 * rise, 0, "#ffe27a", 5);
        ctx.restore();
      }
    }

    /* ---- waypoint & event beacons (drawn OVER the darkness so they're always findable) ---- */
    const hex2rgb = h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
    for (const pr of state.map.props) {
      const isShrine = pr.interact === "shrine", isEvent = pr.interact === "event";
      if (!isShrine && !isEvent) continue;
      const sx = U.isoX(pr.x, pr.y) - cam.x, sy = U.isoY(pr.x, pr.y) - cam.y - surfaceLift(pr.x,pr.y,pr.surfaceId);
      if (sx < -60 || sx > W + 60 || sy < -180 || sy > H + 60) continue;
      const [r, gg, b] = hex2rgb(isShrine ? "#96d7ff" : ((pr.ev && pr.ev.color) || "#ffd070"));
      const k = 0.6 + Math.sin(state.time * 3 + pr.x) * 0.4;
      const beamH = isShrine ? 150 : 110;
      const g = ctx.createLinearGradient(0, sy - beamH, 0, sy);
      g.addColorStop(0, `rgba(${r},${gg},${b},0)`);
      g.addColorStop(1, `rgba(${r},${gg},${b},${(0.28 * k).toFixed(3)})`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(sx - 11, sy); ctx.lineTo(sx - 4, sy - beamH); ctx.lineTo(sx + 4, sy - beamH); ctx.lineTo(sx + 11, sy);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = `rgba(${r},${gg},${b},${(0.5 * k).toFixed(3)})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(sx, sy, 28, 13, 0, 0, Math.PI * 2); ctx.stroke();
      const hl = (pr === hoverProp);
      /* on hover, the beacon nameplate carries a one-line description so the player knows what it does */
      const desc = isShrine
        ? { label: state.shrines.includes(state.map.id)?"Attuned · Click to travel":"Click to attune this waypoint", color: "#8fb8d0" }
        : (pr.ev ? { label: eventDesc(pr.ev), color: "#c8b890" } : null);
      const labelY=PropInteractions.themed(pr)?PropInteractions.bounds(propSpriteFrame(pr),sx,sy).y-9:sy-74;
      nameplate(isShrine ? "✦ Waypoint" : "✦ " + (pr.label || "Event"), sx, labelY,
        hl ? "#ffffff" : (isShrine ? "#9fd8ff" : (pr.ev && pr.ev.color) || "#ffd070"),
        undefined, hl ? desc : null);
    }

    /* ---- map exits: click-to-travel markers (ground ring + rising chevrons; brighter + labelled on hover) ---- */
    for (const ex of state.map.exits) {
      const th=state.map.thresholds?.find(t=>t.id===ex.thresholdId);
      if(th){
        const g=thresholdGeometry(th,ex,cam),hl=ex===hoverExit;
        if(g.x+g.width<0||g.x-g.width>W||g.y+24<0||g.y-g.height-40>H)continue;
        if(hl){
          ctx.save();ctx.strokeStyle='rgba(220,214,177,.8)';ctx.lineWidth=1.5;
          const slope=th.opening.axis?-.5:.5;
          ctx.beginPath();ctx.moveTo(g.x-g.width,g.y-g.width*slope);ctx.lineTo(g.x+g.width,g.y+g.width*slope);ctx.stroke();ctx.restore();
        }
        if(g.showLabel)nameplate('→ '+(ex.label||'Travel'),g.x,g.labelY,hl?'#fff0c5':'#d5d2ba');
        continue;
      }
      const cx = (ex.x0 + ex.x1) / 2, cy = (ex.y0 + ex.y1) / 2;
      const sx = U.isoX(cx, cy) - cam.x, sy = U.isoY(cx, cy) - cam.y - surfaceLift(cx,cy);
      if (sx < -60 || sx > W + 60 || sy < -120 || sy > H + 60) continue;
      const sealed = ex.target === "shattered_temple" && !state.flags.fn_temple_open;
      const hl = (ex === hoverExit);
      const [r, gg, b] = hex2rgb(sealed ? "#ff6a5a" : "#e8c060");
      const k = 0.55 + Math.sin(state.time * 3 + cx) * 0.35;
      ctx.strokeStyle = `rgba(${r},${gg},${b},${((hl ? 0.95 : 0.4) * k).toFixed(3)})`; ctx.lineWidth = hl ? 2.5 : 1.5;
      ctx.beginPath(); ctx.moveTo(sx, sy - 15); ctx.lineTo(sx + 28, sy); ctx.lineTo(sx, sy + 15); ctx.lineTo(sx - 28, sy); ctx.closePath(); ctx.stroke();
      const chevs = hl ? 3 : 1, lift = hl ? (state.time * 26) % 14 : 0;
      ctx.fillStyle = `rgba(${r},${gg},${b},${((hl ? 0.9 : 0.45) * k).toFixed(3)})`;
      for (let i = 0; i < chevs; i++) {
        const ay = sy - 8 - i * 10 - lift;
        ctx.beginPath(); ctx.moveTo(sx, ay - 6); ctx.lineTo(sx + 7, ay + 1); ctx.lineTo(sx + 3, ay + 1); ctx.lineTo(sx, ay - 3); ctx.lineTo(sx - 3, ay + 1); ctx.lineTo(sx - 7, ay + 1); ctx.closePath(); ctx.fill();
      }
      if (hl) nameplate((sealed ? "✦ " : "→ ") + (ex.label || "Travel") + (sealed ? " (sealed)" : ""), sx, sy - 46, sealed ? "#ff9a8a" : "#ffe6a0");
    }

    /* ---- cast ground effects: bright pulsing rim drawn OVER the darkness so they're easy to spot ---- */
    if(typeof BossEncounters!=="undefined")BossEncounters.draw(ctx,cam);
    if(typeof EnemySkills!=="undefined")EnemySkills.draw(ctx,cam);
    if(typeof Act2EnemyCombat!=="undefined")Act2EnemyCombat.draw(ctx,cam);
    for(const mon of state.monsters)if(mon.imperialCombat)mon.imperialCombat.draw(ctx,cam,!!Game.debugFlags.act3Combat);
    for (const f of state.fx) {
      if(f.type==="slamwarning"||f.type==='enemywarning'){drawFx(f,cam);continue;}
      if(typeof SkillVFX!=='undefined'&&SkillVFX.isStyled(f))continue;
      if (f.type !== "groundfield") continue;
      const col = GF_COL[f.fieldKind] || "#ffffff";
      const fx2 = U.isoX(f.x, f.y) - cam.x, fy2 = U.isoY(f.x, f.y) - cam.y;
      if (fx2 < -90 || fx2 > W + 90 || fy2 < -90 || fy2 > H + 90) continue;
      const rr = f.radius * 32, ry = rr * 0.5, k = f.maxTtl ? U.clamp(f.ttl / f.maxTtl, 0.3, 1) : 1;
      const pulse = 0.5 + Math.sin(state.time * 4 + f.x * 3) * 0.5;
      const [r2, g2, b2] = hex2rgb(col);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";           // additive glow pops over dark ground
      ctx.globalAlpha = (0.10 + pulse * 0.07) * k; ctx.fillStyle = col;
      ctx.beginPath(); ctx.ellipse(fx2, fy2, rr, ry, 0, 0, 6.283); ctx.fill();
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = `rgba(${r2},${g2},${b2},1)`;
      ctx.globalAlpha = (0.7 + pulse * 0.3) * k; ctx.lineWidth = 2.5;
      ctx.setLineDash([8, 6]); ctx.lineDashOffset = -state.time * 20;
      ctx.beginPath(); ctx.ellipse(fx2, fy2, rr, ry, 0, 0, 6.283); ctx.stroke();
      ctx.setLineDash([]); ctx.globalAlpha = 0.4 * k; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.ellipse(fx2, fy2, rr * 0.66, ry * 0.66, 0, 0, 6.283); ctx.stroke();
      ctx.restore();
    }

    /* Overhead bars are an overlay, so neighboring bodies and world lighting
       cannot cover them. Anchor the entire plate above the transformed art. */
    for (const d of draws) {
      if (d.kind !== "mon" || d.mon.dead || d.mon === hoverMon || !(d.mon.healthBarUntil > state.time)) continue;
      const g = d.geometry, mon = d.mon, x = (g.left + g.right) / 2, bottom = g.top - 8;
      if (mon.beacon) {
        nameplate(mon.name || "Corrupted Beacon", x, bottom, "#bfeaff", mon.hp / mon.maxHp, null, null, true);
        continue;
      }
      const bw = U.clamp((g.right - g.left) * .65, 30, 72), by = bottom - 5;
      ctx.fillStyle = "rgba(5,4,3,.9)"; ctx.fillRect(x - bw / 2 - 1, by - 1, bw + 2, 7);
      ctx.fillStyle = "#3a1010"; ctx.fillRect(x - bw / 2, by, bw, 5);
      ctx.fillStyle = mon.isBoss ? "#e05c38" : mon.elite ? "#b575de" : "#c23d35";
      ctx.fillRect(x - bw / 2, by, bw * U.clamp(mon.hp / mon.maxHp, 0, 1), 5);
    }

    /* ---- hovered monster nameplate + hp ---- */
    if (hoverMon && !hoverMon.dead) {
      const g = monsterGeometry(hoverMon, cam), sx = (g.left + g.right) / 2;
      const col = hoverMon.elite ? "#c0a0ff" : hoverMon.isBoss ? "#ff9050" : "#d0c0a0";
      const resSub = options.monResist ? monResistLine(hoverMon) : null;
      nameplate(hoverMon.name + "  ·  Lv " + hoverMon.lvl, sx, g.top - 8, col, hoverMon.hp / hoverMon.maxHp, typeInfoFor(hoverMon), resSub, true);
    }
    /* ---- boss bar ---- */
    if (state.bossBar) {
      const b = state.bossBar;
      const bw = Math.min(520, W * 0.5);
      const bossCenter=opening.onRoad()&&W<1150?(W-250)/2:W/2;
      const bx = bossCenter - bw / 2, by = b.encounter ? 74 : 46;
      ctx.fillStyle = "rgba(5,4,3,.8)"; ctx.fillRect(bx - 2, by - 2, bw + 4, 18);
      ctx.fillStyle = "#3a1010"; ctx.fillRect(bx, by, bw, 14);
      ctx.fillStyle = "#a02020"; ctx.fillRect(bx, by, bw * U.clamp(b.hp / b.maxHp, 0, 1), 14);
      ctx.strokeStyle = "#6a5530"; ctx.strokeRect(bx - 2, by - 2, bw + 4, 18);
      if(b.encounter)for(const phase of b.def.phases||[]) {
        const marker=bx+bw*phase.at;
        ctx.fillStyle=b.hp/b.maxHp>phase.at?"#efcf92":"#6a5530";ctx.fillRect(marker-1,by,2,14);
      }
      ctx.font = "13px 'Palatino Linotype', serif"; ctx.textAlign = "center";
      ctx.fillStyle = "#e8d8a8";
      const disguised=b.defId==="vethriss"&&b.encounter?.phase===0;
      ctx.fillText(b.name + (!disguised&&b.def.title ? " — " + b.def.title : ""), bossCenter, by - 8);
      const bt = DATA.ENEMY_TYPES[b.type] || DATA.ENEMY_TYPES.humanoid;
      ctx.font = "10px 'Palatino Linotype', serif"; ctx.fillStyle = bt.color;
      ctx.fillText(bt.name.toUpperCase(), bossCenter, by + 25);
      if(b.encounter){
        ctx.fillStyle=b.encounter.config.color;ctx.font="12px 'Palatino Linotype', serif";
        const e=b.encounter;
        const phase=e.config.phases[e.phase],status=typeof e.statusText==='function'?e.statusText():e.statusLabel||phase;
        ctx.fillText(status.startsWith(phase)?status:phase+" · "+status,bossCenter,by+43,Math.min(W-40,bw+180));
        if(e.stage==="windup"||e.stage==="recovery") {
          const progress=e.stage==="windup"?1-e.timer/e.attack.windup:e.timer/e.recoveryDuration;
          ctx.fillStyle="rgba(5,4,3,.85)";ctx.fillRect(bx,by+49,bw,4);
          ctx.fillStyle=e.stage==="recovery"?"#b9dfae":e.config.color;ctx.fillRect(bx,by+49,bw*U.clamp(progress,0,1),4);
        }
      }
      ctx.textAlign = "left";
    }

    renderMinimap(cam);
    if (mapOverlay) renderMapOverlay();
    UI.refreshHUD();
    } finally {
      LevelTerrain.endFrame();
    }
  }

  function playerModelOpts(p) {
    const signature = playerLoadoutSignature(p);
    if (!p._playerVisual || p._playerVisual.classId !== p.classId || p._playerVisual.kind !== 'player3d' ||
        p._playerVisualSignature !== signature) {
      p._playerVisual = playerAssets.resolvePlayerVisual(p.classId, p.equip, []);
      p._playerVisualSignature = signature;
    }
    return Player3D.drawOptions(p);
  }

  /* Depth-ordered actors: live 3D players and authored world sprites. */
  const actorCv = document.createElement("canvas");
  actorCv.width = 320; actorCv.height = 320;
  const actorCtx = actorCv.getContext("2d");
  const ACTOR_CENTER = 160;
  const ACTOR_ANCHOR = 252;       // feet line inside the actor scratch canvas
  function drawActorVisual(target, opts, pose) {
    if (opts.threePlayer) Player3D.draw(target, opts.threePlayer, pose);
    else {if(opts.playerVisual)throw new Error('Player drawing requires the 3D renderer.');SpriteAssets.drawActor(target, opts, pose);}
  }
  function drawLiveActor(opts, pose, sx, sy, flash, alpha, tint, ground) {
    ctx.save();
    if(ground)LevelTerrain.clipBehind(ctx,state.map,camera(),ground.x,ground.y,ground.surfaceId);
    const bodyScale = ACTOR_BODY_SCALE;
    const footprint = opts.scale == null ? 1 : opts.scale;
    /* Contact shadows share the same ground anchor for models and sprites. */
    ctx.save(); ctx.globalAlpha = 0.3 * alpha; ctx.fillStyle = "#000";
    ctx.beginPath(); ctx.ellipse(sx + 2, sy + 3 + (state.map.surfaceVersion?(ground?.jumpZ||0):0), 16 * footprint, 6.5 * footprint, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    /* fast path (the common case): no flash/tint composite needed, so draw the actor
       straight onto the screen — skips a scratch-canvas clear and blit per actor.
       SpriteAssets draw calls save/restore their own state, so this is isolated. */
    const animation=pose.ex?.act1Animation||pose.ex?.act5Animation||pose.ex?.act4Animation||pose.ex?.act3Animation||pose.ex?.act2Animation;
    const animated=animation&&DATA.SPRITE_MANIFEST.entries[animation.asset];
    if (opts.bossArt || animated || (!flash && !tint)) {
      ctx.save();
      if (alpha < 1) ctx.globalAlpha = alpha;
      ctx.translate(sx, sy);
      ctx.scale(bodyScale, bodyScale);
      // Prewarmed atlas-sized hit flashes preserve tall bosses beyond the
      // ordinary 320px actor scratch and avoid a per-hit compositing pass.
      drawActorVisual(ctx, (opts.bossArt||animated)&&flash?{...opts,bossFlash:true}:animated&&tint?{...opts,act2Tint:tint}:opts, pose);
      ctx.restore();
      ctx.restore();
      return;
    }
    actorCtx.clearRect(0, 0, actorCv.width, actorCv.height);
    actorCtx.save();
    actorCtx.translate(ACTOR_CENTER, ACTOR_ANCHOR);
    actorCtx.scale(bodyScale, bodyScale);
    drawActorVisual(actorCtx, opts, pose);
    actorCtx.restore();
    if (flash || tint) {
      actorCtx.globalCompositeOperation = "source-atop";
      actorCtx.globalAlpha = flash ? 0.62 : 0.3;
      actorCtx.fillStyle = flash ? "#ffffff" : tint;
      actorCtx.fillRect(0, 0, actorCv.width, actorCv.height);
      actorCtx.globalAlpha = 1;
      actorCtx.globalCompositeOperation = "source-over";
    }
    if (alpha < 1) ctx.globalAlpha = alpha;
    ctx.drawImage(actorCv, sx - ACTOR_CENTER, sy - ACTOR_ANCHOR);
    ctx.globalAlpha = 1;
    ctx.restore();
  }
  function drawEntity(e, sx, sy) {
    if (e.husk) return;         // bodiless corpse husk: a logical corpse source, not a drawable figure
    const point=renderPosition(e);
    sy -= elevLift(point.x, point.y,point.surfaceId);   // stand on top of raised terrain
    let alpha = 1;
    if (e.dead && e.corpseT !== undefined && e.corpseT < 3) alpha = Math.max(0, e.corpseT / 3);
    /* beacons are obelisks, not figures — draw the rune-stone with a barrier glow */
    if ((e.beacon || e.defId==="boss_portal")&&!e.pose().ex?.act1Animation) {
      if(typeof Act2EnemyAnimation!=='undefined'&&Act2EnemyAnimation.drawRitualRemains(ctx,e,sx,sy,alpha))return;
      const frame = SpriteAssets.getFrame(SpriteAssets.maps.props.beacon, 0);
      const pulse = 0.5 + Math.sin(state.time * 4 + e.x) * 0.5;
      ctx.fillStyle = `rgba(127,255,224,${0.10 + 0.10 * pulse})`;
      ctx.beginPath(); ctx.ellipse(sx, sy, 26, 12, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = alpha;
      SpriteAssets.drawFrame(ctx, frame, sx, sy);
      ctx.globalAlpha = 1;
      if (e.flashT > 0) { ctx.save(); ctx.globalAlpha = 0.5; ctx.globalCompositeOperation = "lighter"; SpriteAssets.drawFrame(ctx, frame, sx, sy); ctx.restore(); }
      if(typeof Act2EnemyAnimation!=='undefined')Act2EnemyAnimation.drawRitual(ctx,e,sx,sy);
      return;
    }
    /* elite ground glow */
    if (e.tint && !e.dead) {
      ctx.fillStyle = e.tint + "38";
      ctx.beginPath(); ctx.ellipse(sx, sy, 20 * e.scale, 9 * e.scale, 0, 0, Math.PI * 2); ctx.fill();
    }
    const opts = e.playerEcho ? { threePlayer: e.playerEcho, scale: 1 } : e.spriteOpts;
    drawLiveActor(opts, e.pose(), sx, sy - (point.jumpZ || 0), e.flashT > 0, alpha * (e.playerEcho ? .55 : 1), e.playerEcho ? '#9185c2' : !e.dead && e.tint ? e.tint : null, point);
    if(typeof SkillVFX!=='undefined'&&SkillVFX.hasStatus(e)){ctx.save();LevelTerrain.clipBehind(ctx,state.map,camera(),e.x,e.y,e.surfaceId);SkillVFX.drawStatus(ctx,e,camera());ctx.restore();}
  }
  /* "!" over quest givers, "?" when a reward waits */
  function questMarkerFor(giverId, art) {
    let marker = null;
    if (state.quests.q10?.state === "active" && (DATA.STORY_TOPICS[art]||[]).some(t=>!DATA.CAMPAIGN.count(state,{kind:"talk",zone:"marshcamp",target:t.id}))) marker="!";
    for (const q of DATA.QUESTS) {
      if (q.giver !== giverId) continue;
      const st = state.quests[q.id];
      if (st && st.state === "reward") return "?";
      if (st && st.state === "offered") marker = "!";
    }
    return marker;
  }
  function drawQuestMarker(sx, sy, kind) {
    const bob = Math.sin(state.time * 2.6) * 2.5;
    const glyph = kind === "save" ? "✚" : kind;
    const col = kind === "?" ? "#7fd87f" : kind === "save" ? "#ffe6a0" : "#ffd860";
    ctx.font = "bold 18px 'Palatino Linotype', serif";
    ctx.textAlign = "center";
    ctx.shadowColor = col; ctx.shadowBlur = 8;
    ctx.fillStyle = "#000";
    ctx.fillText(glyph, sx + 1, sy + bob + 1);
    ctx.fillStyle = col;
    ctx.fillText(glyph, sx, sy + bob);
    ctx.shadowBlur = 0;
    ctx.textAlign = "left";
  }
  function drawTradeMarker(x,y) {
    y+=Math.sin(state.time*2.6)*2.5;
    ctx.save();ctx.translate(x,y);ctx.lineWidth=1.5;
    ctx.fillStyle="#1b140d";ctx.strokeStyle="#d9b96d";ctx.shadowColor="#000";ctx.shadowBlur=5;
    ctx.beginPath();ctx.moveTo(-4,-5);ctx.lineTo(-6,-10);ctx.lineTo(6,-10);ctx.lineTo(4,-5);
    ctx.bezierCurveTo(13,4,9,10,0,10);ctx.bezierCurveTo(-9,10,-13,4,-4,-5);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.shadowBlur=0;ctx.beginPath();ctx.moveTo(-5,-5);ctx.lineTo(5,-5);ctx.stroke();
    ctx.fillStyle="#dfbd70";ctx.beginPath();ctx.ellipse(0,2,3.2,4,0,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle="#73502a";ctx.beginPath();ctx.moveTo(0,-.5);ctx.lineTo(0,4.5);ctx.stroke();ctx.restore();
  }

  function nameplate(text, sx, sy, color, hpFrac, typeInfo, subLine, above = false) {
    ctx.textAlign = "center";
    ctx.font = "13px 'Palatino Linotype', serif";
    let tw = ctx.measureText(text).width;
    ctx.font = "10px 'Palatino Linotype', serif";
    let subW = 0;
    if (subLine) {
      subW = subLine.segments
        ? subLine.segments.reduce((w, s) => w + ctx.measureText(s.t).width, 0) + 6 * (subLine.segments.length - 1)
        : ctx.measureText(subLine.label).width;
      tw = Math.max(tw, subW);
    }
    if (typeInfo) tw = Math.max(tw, ctx.measureText(typeInfo.label).width);
    tw += 14;
    const boxH = 18 + (subLine ? 11 : 0) + (hpFrac !== undefined ? 6 : 0) + (typeInfo ? 11 : 0);
    if (above) sy -= boxH - 14;
    ctx.fillStyle = "rgba(5,4,3,.8)";
    ctx.fillRect(sx - tw / 2, sy - 14, tw, boxH);
    ctx.font = "13px 'Palatino Linotype', serif";
    ctx.fillStyle = color;
    ctx.fillText(text, sx, sy);
    let yy = sy + 4;
    if (subLine) {   /* small line above the bar (e.g. monster resistances) */
      ctx.font = "10px 'Palatino Linotype', serif";
      if (subLine.segments) {   /* per-stat colored segments, drawn left-to-right, centered as a group */
        ctx.textAlign = "left";
        let x = sx - subW / 2;
        for (const s of subLine.segments) { ctx.fillStyle = s.c; ctx.fillText(s.t, x, yy + 7); x += ctx.measureText(s.t).width + 6; }
        ctx.textAlign = "center";
      } else {
        ctx.fillStyle = subLine.color; ctx.fillText(subLine.label, sx, yy + 7);
      }
      yy += 11;
    }
    if (hpFrac !== undefined) {
      ctx.fillStyle = "#3a1010"; ctx.fillRect(sx - tw / 2 + 3, yy, tw - 6, 4);
      ctx.fillStyle = "#a02020"; ctx.fillRect(sx - tw / 2 + 3, yy, (tw - 6) * U.clamp(hpFrac, 0, 1), 4);
      yy += 6;
    }
    if (typeInfo) {
      ctx.font = "10px 'Palatino Linotype', serif"; ctx.fillStyle = typeInfo.color;
      ctx.fillText(typeInfo.label, sx, yy + 9);
    }
    ctx.textAlign = "left";
  }
  function typeInfoFor(mon) {
    const t = DATA.ENEMY_TYPES[mon.type] || DATA.ENEMY_TYPES.humanoid;
    const family=DATA.MONSTER_FAMILIES[mon.monsterFamily];
    return { label: (family?family.name+' · ':'')+(mon.elite ? "Elite " + t.name : t.name), color: t.color };
  }
  /* monster defensive profile for the hover bar: physical reduction + each element resist (− = vulnerable).
     Each stat is abbreviated and color-coded: P grey, F orange, C blue, L yellow, Ps green. */
  function monResistLine(mon) {
    const r = mon.resists ? mon.resists() : null;
    if (!r) return { segments: [], color: "#9fd0c0" };
    return { color: "#9fd0c0", segments: [
      { t: "P " + r.physDR + "%", c: "#cfcfcf" },
      { t: "F " + r.fire, c: "#ff8a3c" },
      { t: "C " + r.cold, c: "#6fa8ff" },
      { t: "L " + r.light, c: "#ffe24c" },
      { t: "Ps " + r.poison, c: "#7ee06a" },
    ] };
  }
  /* readable one-line description for a world-event shrine/altar (shown on hover) */
  const STAT_LABEL = {
    dmgPct: v => `+${v}% Damage`, ias: v => `+${v}% Attack Speed`, frw: v => `+${v}% Move Speed`,
    fcr: v => `+${v}% Cast Speed`, spellPct: v => `+${v}% Spell Power`, armorPct: v => `+${v}% Armor`,
    armor: v => `+${v} Armor`, resAll: v => `+${v}% All Resist`, lifeSteal: v => `${v}% Life Steal`,
    mf: v => `+${v}% Magic Find`, goldFind: v => `+${v}% Gold Find`, critChance: v => `+${v}% Crit Chance`,
    critDmg: v => `+${v}% Crit Damage`, str: v => `+${v} Strength`, dex: v => `+${v} Dexterity`,
    vit: v => `+${v} Vitality`, wil: v => `+${v} Willpower`, hpPct: v => `+${v}% Life`, hp: v => `+${v} Life`,
    mana: v => `+${v} Aether`, manaRegen: v => `+${v}% Aether Regen`, fireDmg: v => `+${v}% Fire Damage`,
    resFire: v => `+${v}% Fire Resist`, coldDmg: v => `+${v}% Cold Damage`, resCold: v => `+${v}% Cold Resist`,
    lightDmg: v => `+${v}% Lightning Damage`, resLight: v => `+${v}% Lightning Resist`,
    resPoison: v => `+${v}% Poison Resist`, thorns: v => `+${v} Thorns`, ccReduce: v => `-${v}% CC Duration`,
    block: v => `+${v}% Block`, ar: v => `+${v} Attack Rating`,
  };
  function statSummary(stats) {
    if (!stats) return "a boon";
    return Object.keys(stats).map(k => STAT_LABEL[k] ? STAT_LABEL[k](stats[k]) : `+${stats[k]} ${k}`).join(", ");
  }
  function famLabel(fam) { return ({ undead: "undead", beast: "beast", cultist: "cultist", demon: "demon", insect: "vermin", barbarian: "raider" })[fam] || (fam || "foe"); }
  function eventDesc(ev) {
    if (!ev) return "";
    switch (ev.kind) {
      case "buff": return `Touch for a ${(ev.buff && ev.buff.dur) || 60}s blessing — ${statSummary(ev.buff && ev.buff.stats)}.`;
      case "heal": return ev.mana ? "Drink to fully restore Life and Aether." : `Drink to restore ${Math.round((ev.frac || 0.5) * 100)}% Life.`;
      case "gold": return "A glittering hoard — claim its gold.";
      case "xp": return `Ancient knowledge — instantly grants ${Math.round((ev.xpFrac || 0.25) * 100)}% of a level.`;
      case "glyph": return `A runed stone — yields ${ev.count || 2} crafting glyphs.`;
      case "cache": return `A cache — open for ${ev.drops || 2} bundles of loot${ev.mf ? " (bonus magic find)" : ""}.`;
      case "ambush": return `Disturb it to fight a ${famLabel(ev.fam)} pack — clear them for guaranteed loot.`;
      case "curse": return `Cursed altar — unleashes an elite pack, but guarantees ${ev.rarity ? "a " + ev.rarity + " item" : "rich loot"}.`;
      case "goblin": return "A treasure-thief — catch and kill it before it flees.";
      default: return ev.name || "";
    }
  }

  const architectureMasks = new Map();
  function architectureCovers(frame,x,y) {
    let alpha=architectureMasks.get(frame.id);
    if(!alpha){
      const c=document.createElement('canvas');c.width=frame.sw;c.height=frame.sh;
      const g=c.getContext('2d',{willReadFrequently:true});
      g.drawImage(frame.image,frame.sx,frame.sy,frame.sw,frame.sh,0,0,frame.sw,frame.sh);
      alpha=g.getImageData(0,0,c.width,c.height).data;architectureMasks.set(frame.id,alpha);
    }
    // A gate's open passage must stay visible. Fade only painted pixels over
    // the hero's head and shoulders; the sprite bounds include empty air.
    return [[0,0],[-9,12],[9,12],[0,22]].some(([dx,dy])=>{
      const px=Math.floor(x+dx+frame.anchorX),py=Math.floor(y+dy+frame.anchorY);
      return px>=0&&py>=0&&px<frame.sw&&py<frame.sh&&alpha[(px+py*frame.sw)*4+3]>64;
    });
  }
  function propVisualType(pr) {
    return ((pr.completed||pr.opened)&&pr.visualDone) || pr.visual || pr.visualType || (pr.type==='chest'&&pr.opened?'chest_open':pr.type);
  }
  function propSpriteFrame(pr) {
    const animated=PropInteractions.frame(pr,state);if(animated)return animated;
    const type=propVisualType(pr);
    const id=SpriteAssets.maps.props[(pr.artZone||state.map.id)+'_'+type]||SpriteAssets.maps.props[type];
    if(!id)throw Error('Missing prop frame: '+JSON.stringify({zone:state.map.id,type,prop:pr,loading:typeof Coop!=='undefined'&&Coop.loading}));
    return SpriteAssets.getFrame(id,0);
  }
  function drawProp(d) {
    const pr = d.pr;
    d.sy -= elevLift(pr.x,pr.y,pr.surfaceId);   // props sit on raised terrain (d is a per-frame entry)
    const visualType = propVisualType(pr);
    const propId = SpriteAssets.maps.props[`${pr.artZone || state.map.id}_${visualType}`] || SpriteAssets.maps.props[visualType];
    if (!propId&&!PropInteractions.themed(pr)) throw new Error(`Missing required prop sprite: ${state.map.id}/${pr.type}`);
    const propFrame = propSpriteFrame(pr);
    const mirror = !!pr.flipX || pr.type === "longhouse" && (((pr.seed || (pr.x * 17 + pr.y * 31)) | 0) & 1);
    // Fade tall architecture only while it covers the hero behind it.
    const p=state.player, dx=U.isoX(p.x,p.y)-U.isoX(pr.x,pr.y), dy=U.isoY(p.x,p.y)-U.isoY(pr.x,pr.y)-24;
    const coversHero=pr.building && !pr.interact && p.x+p.y<pr.x+pr.y && Math.abs(dx)<propFrame.sw*.42 && dy>-propFrame.anchorY && dy<0 && (pr.artZone!=='act3'||architectureCovers(propFrame,dx,dy-24-elevLift(p.x,p.y,p.surfaceId)+elevLift(pr.x,pr.y,pr.surfaceId)));
    ctx.save();LevelTerrain.clipBehind(ctx,state.map,camera(),pr.x,pr.y,pr.surfaceId);
    const marshScale=state.map.act2Visual&&pr.artZone==='act2'?(pr.type==='reed_clump'?.32:pr.type==='votives'?.64:1):1;
    const propOptions={scale:marshScale,flip:mirror,alpha:coversHero?.4:pr.spent&&!PropInteractions.themed(pr)?.6:1};
    if(!PropInteractions.draw(ctx,pr,state,d.sx,d.sy,propOptions))SpriteAssets.drawFrame(ctx, propFrame, d.sx, d.sy, propOptions);
    PropInteractions.drawEffects(ctx,pr,state,d.sx,d.sy,propFrame,pr===hoverProp);
    ctx.restore();
    const drawH = PropInteractions.themed(pr)?d.sy-PropInteractions.bounds(propFrame,d.sx,d.sy,mirror).y:propFrame.anchorY;
    /* Ambient fire and shrine glows are transient effects layered over sprite art. */
    if (pr.type === "brazier" && !pr.extinguished) {
      const t = state.time * 7 + pr.x;
      ctx.save();
      ctx.translate(d.sx, d.sy - drawH + 32);
      if(pr.cathedralLamp||pr.imperialLamp){
        const sway=Math.sin(t*1.7)*1.5;
        ctx.shadowColor='#ff9f42';ctx.shadowBlur=12;
        for(let i=0;i<3;i++){
          const w=4.2-i,tip=-19-i*2+Math.sin(t+i)*3;
          ctx.fillStyle=['rgba(234,110,34,.65)','rgba(255,173,66,.8)','rgba(255,227,151,.9)'][i];
          ctx.beginPath();ctx.moveTo(-w,-5);ctx.bezierCurveTo(-w-2,-10,sway-3,tip+8,sway,tip);
          ctx.bezierCurveTo(sway+1,tip+8,w+3,-10,w,-5);ctx.quadraticCurveTo(0,0,-w,-5);ctx.fill();
        }
        ctx.restore();
      }else{
      for (let i = 0; i < 3; i++) {
        const fy = -6 - i * 5 - Math.sin(t + i * 2) * 2;
        const fr2 = 6 - i * 1.6 + Math.sin(t * 1.3 + i) * 1.2;
        ctx.fillStyle = ["rgba(255,150,50,.8)", "rgba(255,200,80,.7)", "rgba(255,240,160,.6)"][i];
        ctx.beginPath(); ctx.ellipse(Math.sin(t + i) * 1.5, fy, fr2, fr2 * 1.5, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
      }
    }
    if (pr.type === "shrine") {
      const k = 0.5 + Math.sin(state.time * 2) * 0.3;
      ctx.fillStyle = `rgba(140,210,255,${0.12 * k})`;
      ctx.beginPath(); ctx.ellipse(d.sx, d.sy, 26, 12, 0, 0, Math.PI * 2); ctx.fill();
    }
    /* shrines & event beacons draw their own label/description above — don't double up here */
    if (pr === hoverProp && pr.interact !== "shrine" && pr.interact !== "event") {
      const label = pr.label || (pr.lootable ? "Chest" : pr.breakable ? ({ urn: "Urn", barrel: "Barrel", crate: "Crate", grave: "Grave" }[pr.type] || "Breakable") : "");
      if (label) nameplate(label, d.sx, d.sy - drawH + 2, pr.breakable && !pr.lootable ? "#c0a878" : "#8fd8ff");
    }
    if (pr.interact === "board") {
      const qm = questMarkerFor("board");
      if (qm) drawQuestMarker(d.sx, d.sy - drawH + 2, qm);
    }
  }

  /* baked light masks (built once): a unit radial sprite blitted+scaled per light each frame,
     instead of allocating a fresh createRadialGradient for every light every frame. */
  let lightMask = null, warmMask = null;
  const cathedralLightMasks=new Map();
  function cathedralLightMask(color){
    if(cathedralLightMasks.has(color))return cathedralLightMasks.get(color);
    const image=document.createElement('canvas');image.width=image.height=128;
    const g=image.getContext('2d'),glow=g.createRadialGradient(64,64,0,64,64,64);
    glow.addColorStop(0,color+'42');glow.addColorStop(.4,color+'20');glow.addColorStop(1,color+'00');
    g.fillStyle=glow;g.fillRect(0,0,128,128);cathedralLightMasks.set(color,image);return image;
  }
  function buildLightMasks() {
    lightMask = document.createElement("canvas"); lightMask.width = lightMask.height = 128;
    let g2 = lightMask.getContext("2d"), gr = g2.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, "rgba(0,0,0,1)"); gr.addColorStop(0.55, "rgba(0,0,0,0.6)"); gr.addColorStop(1, "rgba(0,0,0,0)");
    g2.fillStyle = gr; g2.fillRect(0, 0, 128, 128);
    warmMask = document.createElement("canvas"); warmMask.width = warmMask.height = 128;
    g2 = warmMask.getContext("2d"); gr = g2.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, "rgba(255,150,60,.35)"); gr.addColorStop(1, "rgba(255,150,60,0)");
    g2.fillStyle = gr; g2.fillRect(0, 0, 128, 128);
  }
  function renderLighting(cam) {
    if (!lightMask) buildLightMasks();
    const m = state.map;
    const W = canvas.width, H = canvas.height;
    lightCtx.clearRect(0, 0, W, H);
    lightCtx.fillStyle = m.act3?.environment ? `rgba(8,17,24,${m.zone.dark})` : `rgba(0,0,0,${m.zone.dark})`;
    lightCtx.fillRect(0, 0, W, H);
    lightCtx.globalCompositeOperation = "destination-out";
    const punch = (wx, wy, r, intensity, flicker, height=10, surfaceId=0) => {
      const sx = U.isoX(wx, wy) - cam.x, sy = U.isoY(wx, wy) - cam.y - surfaceLift(wx,wy,surfaceId);
      if (sx < -300 || sx > W + 300 || sy < -300 || sy > H + 300) return;
      let rr = r * 32;
      if (flicker) rr *= 1 + Math.sin(state.time * 9 + wx * 7) * 0.05 + Math.sin(state.time * 23 + wy * 3) * 0.03;
      lightCtx.globalAlpha = intensity;
      lightCtx.drawImage(lightMask, sx - rr, sy - height - rr, rr * 2, rr * 2);
      lightCtx.globalAlpha = 1;
    };
    const p = state.player;
    punch(p.x, p.y, 7.5 + (p.stats.lightRadius || 0), 1, false,10,p.surfaceId);
    // Keep the authored face and attack pose readable in the darkest boss rooms.
    for(const mon of state.monsters)if(mon.encounter?.active&&!mon.dead)punch(mon.x,mon.y,6.5,.9,false,55*mon.scale);
    for (const l of m.lights) punch(l.x, l.y, l.r, 0.95, l.flicker);
    for (const ps of portalPositions()) punch(ps.x, ps.y, 4, 0.9, true,10,ps.surfaceId);
    lightCtx.globalCompositeOperation = "source-over";
    /* warm glow pass over fires */
    ctx.drawImage(lightCv, 0, 0);
    ctx.save();
    ctx.globalCompositeOperation = "overlay";
    for (const l of m.lights) {
      if (l.color !== "#ff9c50"&&!m.cathedral&&!m.act1Environment&&!m.act2Visual&&!m.act3?.environment) continue;
      const sx = U.isoX(l.x, l.y) - cam.x, sy = U.isoY(l.x, l.y) - cam.y - surfaceLift(l.x,l.y);
      if (sx < -200 || sx > W + 200 || sy < -200 || sy > H + 200) continue;
      const rr = l.r * 26;
      ctx.drawImage(m.cathedral||m.act1Environment||m.act2Visual||m.act3?.environment?cathedralLightMask(l.color):warmMask, sx - rr, sy - 20 - rr, rr * 2, rr * 2);
    }
    ctx.restore();
  }

  /* ---------------- minimap ---------------- */
  let mmCanvas = null;
  let mmMask = null, mmMaskPixels = null, mmMap = null, mmBase = null, mmExplored = null;
  function rebuildMm() {
    const m = state.map;
    if (!mmCanvas || mmCanvas.width !== m.w || mmCanvas.height !== m.h) {
      if (mmCanvas) mmCanvas.width = mmCanvas.height = 0;
      if (mmMask) mmMask.width = mmMask.height = 0;
      mmCanvas = document.createElement("canvas");
      mmCanvas.width = m.w; mmCanvas.height = m.h;
      mmMask = document.createElement("canvas");
      mmMask.width = m.w; mmMask.height = m.h;
      mmMaskPixels = mmMask.getContext("2d").createImageData(m.w, m.h);
      mmExplored = null;
    }
    if (mmMap === m && mmBase === m.minimapBase && mmExplored?.length === m.explored.length &&
        mmExplored.every((v,i) => v === m.explored[i])) return;
    mmMap = m; mmBase = m.minimapBase; mmExplored = m.explored.slice();
    // The map colors already live in minimapBase. Mask with CPU-authored alpha
    // instead of forcing a GPU canvas readback on every periodic refresh.
    for (let i = 0; i < m.explored.length; i++) mmMaskPixels.data[i * 4 + 3] = m.explored[i] ? 255 : 0;
    mmMask.getContext("2d").putImageData(mmMaskPixels, 0, 0);
    const c = mmCanvas.getContext("2d");
    c.clearRect(0, 0, m.w, m.h);
    c.drawImage(m.minimapBase, 0, 0);
    c.globalCompositeOperation = "destination-in";
    c.drawImage(mmMask, 0, 0);
    c.globalCompositeOperation = "source-over";
  }
  function renderMinimap(cam) {
    mmRebuildT -= 1;
    if (mmRebuildT <= 0) { mmRebuildT = 20; rebuildMm(); }
    const m = state.map, p = state.player;
    mmCtx.clearRect(0, 0, 220, 160);
    mmCtx.fillStyle = "rgba(5,4,3,.6)";
    mmCtx.fillRect(0, 0, 220, 160);
    const sc = 3;
    mmCtx.imageSmoothingEnabled = false;
    if(m.layers&&p.surfaceId)mmCtx.globalAlpha=.35;
    mmCtx.drawImage(mmCanvas, p.x - 220 / sc / 2, p.y - 160 / sc / 2, 220 / sc, 160 / sc, 0, 0, 220, 160);
    mmCtx.globalAlpha=1;
    const dot = (wx, wy, col, s) => {
      const dx = (wx - p.x) * sc + 110, dy = (wy - p.y) * sc + 80;
      if (dx < 0 || dx > 220 || dy < 0 || dy > 160) return;
      mmCtx.fillStyle = col;
      mmCtx.fillRect(dx - (s || 2) / 2, dy - (s || 2) / 2, s || 2, s || 2);
    };
    if(m.layers){
      for(const b of m.act3.architecture.bridges)for(let x=b.lo;x<b.hi;x++)for(let y=b.y0;y<b.y1;y++)if(m.explored[x+y*m.w])dot(x+.5,y+.5,p.surfaceId?'#dac894':'#554f43',Math.max(1,sc));
      for(const link of m.surfaceLinks)dot(link.x,link.y,'#ead5a0',4);
    }
    for (const mon of state.monsters) if (!mon.dead && m.explored[(mon.x | 0) + (mon.y | 0) * m.w]) dot(mon.x, mon.y, !TerrainLayers.same(p,mon)?'#564747':mon.isBoss ? "#ff5030" : mon.elite ? "#c0a0ff" : "#c03030");
    for (const n of state.npcs) dot(n.x, n.y, "#50c050", 3);
    for (const ex of m.exits) dot((ex.x0 + ex.x1) / 2, (ex.y0 + ex.y1) / 2, "#d8b860", 4);
    if (m.shrine) { const pulse = 5 + Math.round(Math.sin(state.time * 3) + 1); dot(m.shrine.x, m.shrine.y, "#bfeaff", pulse); }
    for (const ps of portalPositions()) dot(ps.x, ps.y, "#6eaaff", 4);
    /* notable loot the filter flagged for the minimap */
    for (const gi of state.ground) { const f = gi.filt; if (f && f.minimap && !f.hide) dot(gi.x, gi.y, f.minimap, 3); }
    if(m.layers){
      mmCtx.fillStyle='#0b0b0b';mmCtx.fillRect(4,3,111,18);mmCtx.font='12px sans-serif';mmCtx.fillStyle='#ead5a0';mmCtx.fillText(p.surfaceId?'Upper gallery':'Lower passage',8,16);
    }
    dot(p.x, p.y, "#ffffff", 3);
  }
  function renderMapOverlay() {
    const m = state.map, p = state.player;
    const W = canvas.width, H = canvas.height;
    const sc = Math.min(8, Math.min(W / m.w, H / m.h) * 0.85);
    const ox = W / 2 - p.x * sc, oy = H / 2 - p.y * sc;
    ctx.save();
    ctx.globalAlpha = 0.78;
    ctx.fillStyle = "#060504";
    ctx.fillRect(0, 0, W, H);
    ctx.imageSmoothingEnabled = false;
    if(m.layers&&p.surfaceId)ctx.globalAlpha=.3;
    ctx.drawImage(mmCanvas, ox, oy, m.w * sc, m.h * sc);
    ctx.globalAlpha=.78;
    ctx.imageSmoothingEnabled = true;
    const dot = (wx, wy, col, s) => { ctx.fillStyle = col; ctx.fillRect(ox + wx * sc - s / 2, oy + wy * sc - s / 2, s, s); };
    if(m.layers){
      for(const b of m.act3.architecture.bridges)for(let x=b.lo;x<b.hi;x++)for(let y=b.y0;y<b.y1;y++)if(m.explored[x+y*m.w])dot(x+.5,y+.5,p.surfaceId?'#dac894':'#554f43',sc);
      for(const link of m.surfaceLinks)dot(link.x,link.y,'#ead5a0',6);
    }
    for (const ex of m.exits) {
      dot((ex.x0 + ex.x1) / 2, (ex.y0 + ex.y1) / 2, "#d8b860", 8);
      ctx.font = "12px 'Palatino Linotype', serif"; ctx.fillStyle = "#d8b860";
      ctx.fillText(ex.label, ox + (ex.x0 + ex.x1) / 2 * sc + 8, oy + (ex.y0 + ex.y1) / 2 * sc + 4);
    }
    if (m.shrine) dot(m.shrine.x, m.shrine.y, "#8fd8ff", 6);
    for (const mon of state.monsters) if (!mon.dead && m.explored[(mon.x | 0) + (mon.y | 0) * m.w]) dot(mon.x, mon.y, !TerrainLayers.same(p,mon)?'#564747':mon.isBoss ? "#ff5030" : "#c03030", 3);
    for (const n of state.npcs) dot(n.x, n.y, "#50c050", 5);
    dot(p.x, p.y, "#ffffff", 6);
    ctx.font = "16px 'Palatino Linotype', serif";
    ctx.fillStyle = "#d8c79a"; ctx.textAlign = "center";
    ctx.fillText(m.zone.name + (m.layers?(p.surfaceId?' · Upper gallery':' · Lower passage'):'') + "  —  press M to close", W / 2, 30);
    ctx.textAlign = "left";
    ctx.restore();
  }

  /* =====================================================================
     DEBUG HELPERS
     ===================================================================== */
  function debugDrop(rarity) {
    const p = state.player;
    const it = Items.rollGear(p.lvl + 1, rarity);
    it.identified = true;
    dropAtFeet(it);
    Sfx.play(rarity === "unique" ? "dropUnique" : "dropRare");
  }
  function debugSpawnElites() {
    const p = state.player, z = state.map.zone;
    const pool = z.spawns || ["risen", "grave_hound"];
    for (let i = 0; i < 4; i++) {
      const a = Math.random() * Math.PI * 2;
      const x = p.x + Math.cos(a) * 4, y = p.y + Math.sin(a) * 4;
      if (MapGen.walkable(state.map, x, y)) {
        const mon = new Monster(U.pick(pool), x, y, { elite: i === 0, minion: i > 0 });
        mon.aggro = true;
        state.monsters.push(mon);
      }
    }
  }
  function debugGotoBoss() {
    const boss = state.monsters.find(mn => mn.isBoss && !mn.dead);
    if (!boss) { msg("No living boss on this map.", "#c08080"); return; }
    const p = state.player;
    for (let r = 2; r < 6; r++) {
      const x = boss.x - r, y = boss.y;
      if (MapGen.walkable(state.map, x, y)) { p.x = x; p.y = y; p._animationController?.reset(); p.path = null; p.command = null; explore(); return; }
    }
  }

  /* =====================================================================
     MAIN LOOP
     ===================================================================== */
  function tick(t) {
    requestAnimationFrame(tick);
    const dtRaw = Math.min(0.05, (t - lastT) / 1000 || 0.016);
    lastT = t;
    if (typeof MobileControls !== "undefined") MobileControls.sync();
    if (!running || !state) return;
    if(typeof Coop!=="undefined"&&Coop.active&&Coop.loading)return;
    const phoneBlocked=typeof MobileShell!=='undefined'&&MobileShell.blocked;
    if(typeof SkillAudio!=='undefined')SkillAudio.setPaused(UI.escOpen()||UI.cinematicActive()||phoneBlocked);
    let dt = dtRaw;
    if (fx.hitPause > 0) { fx.hitPause -= dtRaw; dt *= 0.12; }
    try {
      if(typeof Coop!=="undefined"&&Coop.active){updateHover();if(!phoneBlocked&&!UI.escOpen()&&!UI.cinematicActive()&&!UI.anyOpen())heldUpdate();Coop.frame(dtRaw);}
      else if (!phoneBlocked && !UI.escOpen() && !UI.cinematicActive()) update(dt);
      else cancelGroundHold();
      updateCamera(dtRaw);           // camera eases on real time, even during hit-pause
      render();
    } catch (err) {
      fatalRuntime(err, "Gameplay update/render");
    }
  }

  /* messages passthrough */
  function msg(text, color) { UI.msg(text, color); }
  function centerMsg(a, b) { UI.centerMsg(a, b); }

  /* chance-to-cast proc: a self-contained elemental nova at (x,y) */
  function fireProc(proc, x, y, src) {
    if (typeof UniquePowers !== "undefined") return UniquePowers.guarded(src || state.player, () => fireProcEffect(proc,x,y,src));
    return fireProcEffect(proc,x,y,src);
  }
  function fireProcEffect(proc, x, y, src) {
    const col = { fire: "#ff7a30", cold: "#9fd8ff", light: "#fff080", poison: "#90ff70", shadow: "#c080e0" }[proc.elem] || "#ffffff";
    addNova(x, y, proc.radius, col);
    Sfx.play(proc.elem === "cold" ? "frost" : proc.elem === "light" ? "zap" : "blast");
    const dmg = U.rf(proc.dmg[0], proc.dmg[1]);
    for (const m of state.monsters) {
      if (m.dead || U.dist(x, y, m.x, m.y) > proc.radius + m.radius) continue;
      m.takeDamage(dmg, src || state.player, null, proc.elem);
      if (proc.elem === "cold") m.applySlow(2, 40);
    }
  }

  function submitCommand(command){
    if(typeof Coop!=="undefined"&&Coop.active)return Coop.submit(command);
    if(command.type==='travel')return enterMap(command.zone,command.spawn||'default');
    if(typeof Coop!=="undefined"&&typeof CoopCommands!=="undefined")return Coop.runLocal(command);
    const p=state?.player;if(!p)return;
    if(command.type==='quaff')return p.quaff(command.slot);
    if(command.type==='move'){p.command={type:'move',point:command.point};return repath(p,command.point.x,command.point.y);}
    if(command.type==='cast')return p.performSkill(command.skill,null,command.point);
  }
  function playerOwner(source){return source instanceof Player?source:source?.owner instanceof Player?source.owner:null;}
  function closestPlayer(actor){return (state.players||[state.player]).filter(p=>!p.dead&&TerrainLayers.same(p,actor)).sort((a,b)=>U.dist2(a.x,a.y,actor.x,actor.y)-U.dist2(b.x,b.y,actor.x,actor.y))[0]||null;}
  function makeCoopHero(name,classId){
    if(!DATA.CLASSES[classId])throw Error('Unknown class');
    const p=new Player(String(name||'Hero').slice(0,24),classId),kit=DATA.PLAYER_STARTER_LOADOUTS[classId];
    p.equip.main=Items.fromBase(kit.main);p.equip.chest=Items.fromBase(kit.chest);
    Items.autoPlace(p.inv,Items.makeConsumable('hp1',2));Items.autoPlace(p.inv,Items.makeConsumable('mp1',2));Items.autoPlace(p.inv,Items.makeConsumable('tp',1));
    p.belt[0]={id:'hp1',count:2};p.belt[1]={id:'mp1',count:2};p.computeStats();p.hp=p.stats.maxHp;p.mana=p.stats.maxMana;return p;
  }
  async function prepareCoopHero(p){
    const signature=playerLoadoutSignature(p);if(p._playerVisualSignature===signature&&p._playerVisual)return;
    p._playerVisual=playerAssets.resolvePlayerVisual(p.classId,p.equip,[]);
    await playerAssets.loadPlayerLoadout(p._playerVisual);p._playerVisualSignature=signature;
  }
  async function preloadCoop(zone){
    if(!CoopProtocol.ZONES.includes(zone))throw Error('Unsupported co-op area');
    await SpriteAssets.loadBundle('zone:'+(DATA.ZONES[zone].artZone||zone));
    await SpriteAssets.loadBundle('actors:act1');
    const boss=DATA.ZONES[zone]?.boss;
    if(boss&&DATA.BOSS_ENCOUNTERS[boss])await SpriteAssets.loadBundle('boss:'+boss);
  }
  async function startCoop(p,seed,record=null,zone='frosthaven'){
    running=false;opening.reset();state=freshState(p,seed);state.players=[p];saveSlotKey=null;
    if(record?.quests)state.quests=structuredClone(record.quests);
    if(record?.flags)state.flags=structuredClone(record.flags);
    state.flags.opening={v:2,stage:'complete',rescued:true,defeated:[]};
    state.shrines=(record?.shrines||['frosthaven']).filter(z=>CoopProtocol.ZONES.includes(z));state.home='frosthaven';delete state.quests.q1;
    await prepareCoopHero(p);UI.hideTitle();running=true;
    if(!await enterMap(zone,'default',{recoverable:true}))throw Error('Could not enter '+zone);
    UI.closeAll();return state;
  }
  function stopCoop(){running=false;state=null;opening.reset();Sfx.stopMusic();Sfx.stopSkills?.();UI.closeAll();UI.showTitle();}
  function safeCoopArrival(point){return safeArrival(state.map,point);}
  function coopPointer(){return {mouse,point:steeringPoint(),mon:hoverMon,prop:hoverProp,npc:hoverNpc,label:hoverLabel,portal:hoverPortal,exit:hoverExit};}
  function coopRefresh(){refreshLoot();UI.refreshHUD();UI.refreshBelt();UI.refreshBuffs();UI.refreshManagement?.();updateBossEncounter();}
  function hostPresentation(dt,alpha){
    const clock=state.time-(1-alpha)/30;
    for(const p of state.players)Player3D.update?.(p,dt,{sample:CoopMotion.sample(p,alpha),clock});
  }
  function coopPresentation(dt){
    for(const actor of [...state.players,...state.monsters,...state.minions,...state.projectiles])if(actor._netTo){
      actor._netT+=dt;const k=1-Math.exp(-dt/(actor===state.player ? .1 : .055));
      actor.x=U.lerp(actor.x,actor._netTo.x,k);actor.y=U.lerp(actor.y,actor._netTo.y,k);
    }
    CoopInput.predict(dt);
    for(const p of state.players){p.updateAnim(dt);Player3D.update?.(p,dt);}
    for(const m of [...state.monsters,...state.minions])m.updateAnim(dt);
    if(typeof SkillVFX!=='undefined')SkillVFX.update(dt,state,particles.length);
    for(let i=floats.length-1;i>=0;i--){floats[i].t+=dt;if(floats[i].t>1)floats.splice(i,1);}
    for(let i=novas.length-1;i>=0;i--){novas[i].t+=dt;if(novas[i].t>novas[i].dur)novas.splice(i,1);}
    for(let i=bolts.length-1;i>=0;i--){bolts[i].t+=dt;if(bolts[i].t>bolts[i].dur)bolts.splice(i,1);}
    exploreT-=dt;if(exploreT<=0){exploreT=.25;explore();}updateBossEncounter();
  }
  function coopJump(p,point){
    if(p.jumping||p.action||p.stunT>0||state.time<(p.jumpCdUntil||0)||!point)return;
    const d=U.dist(p.x,p.y,point.x,point.y)||.001;
    let distance=Math.min(4.2,d),dst=null;
    for(;distance>=.5;distance-=.5){const x=p.x+(point.x-p.x)/d*distance,y=p.y+(point.y-p.y)/d*distance;if(state.map.surfaceVersion?TerrainSurface.supported(state.map,x,y,p.radius):MapGen.walkable(state.map,x,y)){dst={x,y};break;}}
    if(!dst)return;
    p.jumping={fx:p.x,fy:p.y,tx:dst.x,ty:dst.y,t:0,dur:.42};p.jumpCdUntil=state.time+.65;p.command=null;p.path=null;
  }
  function coopAirAttack(p,skill,w){
    if(!w||p.dead||p.action||p.stunT>0||p.jumping||!p.canUseSkillWeapon(skill))return;
    const sk=p.resolveSkill(skill),rank=skill==='basic'?1:p.effRank(skill);
    if(skill!=='basic'&&(rank<=0||!p.canPay(sk,rank)))return;
    p.withSkillSource(skill,()=>{
      p.face(w.x,w.y);if(skill!=='basic'){p.pay(sk,rank);p.applySkillPerkBuff(sk,rank);}
      p.command=null;p.path=null;p.startAction('attack',1/p.stats.attackRate);
      if(p.stats.ranged)spawnProjectile({x:p.x,y:p.y,tx:w.x,ty:w.y,speed:11,kind:'arrow',fromPlayer:true,visualOwner:p,sourceSkill:skill,mult:skill==='basic'?1:sk.dmgMult(rank)*p.synergyMult(sk),quarryOnHit:sk.quarryOnHit,quarryStacks:sk.quarryStacks?.(rank),pierce:!!sk.perkPierce});
      Sfx.playSkill?.(skill,'release',{owner:p});
    });
  }
  function openCoopInteraction(o){
    if(o.isNpc||o.def&&DATA.NPCS[o.id]){if(o.def?.role==='board')UI.openBoard();else UI.openDialog(o);}
    else if(o.interact==='storage')UI.openStorage();else if(o.interact==='forge')UI.openForge();else if(o.interact==='board')UI.openBoard();else if(['shrine','caravan'].includes(o.interact))UI.openShrine(o.interact==='caravan');
  }
  function rewardCoopQuest(q,p){
    const reward=q.reward||{};p.gainXp(reward.xp||Math.floor(DATA.xpForLevel(p.lvl)*(q.type==='killBoss'?.7:q.type==='beacons'?.55:.4)));
    p.gold+=reward.gold||0;p.skillPts+=reward.skillPts||0;p.attrPts+=reward.attrPts||0;
    const items=[];if(reward.item){const it=Items.rollGear(reward.item.ilvl,reward.item.rarity);it.identified=true;items.push(it);}
    if(reward.consumable)items.push(Items.makeConsumable(reward.consumable));if(reward.glyph)items.push(Items.rollGlyph(DATA.ZONES[q.zone]?.lvl||p.lvl,p.stats.mf));
    for(const it of items)if(!Items.autoPlace(p.inv,it))dropAtFeet(it,p);
  }
  function coopVisual(e){
    if(e.effect==='float'&&(e.hurt||(e.minion?options.minionDamage:options.dmgNumbers||typeof e.text!=='number')))floats.push({...e,text:String(e.text),t:0});
    if(e.effect==='nova')novas.push({...e,t:0,dur:.35});
    if(e.effect==='bolt')bolts.push({...e,t:0,dur:.22,seed:(Math.random()*1000)|0});
    if(e.effect==='skill'){const owner=state.players.find(p=>p._coopId===e.ownerId);if(owner)Sfx.playSkill?.(e.skill,e.phase,{owner});}
  }

  return {
    coop: {makeHero:makeCoopHero,prepareHero:prepareCoopHero,start:startCoop,stop:stopCoop,preload:preloadCoop,update,presentation:coopPresentation,hostPresentation,refresh:coopRefresh,repeatSkill,arrival:safeCoopArrival,pickup:pickupGround,interact:(o,p)=>interactOnSurface(o,false,p),interactCommitted:(o,p)=>interactOnSurface(o,true,p),openInteraction:openCoopInteraction,drop:dropAtFeet,respec:doRespec,castPortal,acceptQuest,completeQuest,rewardQuest:rewardCoopQuest,jump:coopJump,airAttack:coopAirAttack,visual:coopVisual},
    submitCommand,playerOwner,closestPlayer,renderPosition,
    init, newGame, loadGame, saveGame, listSaves, deleteSave, saveAndQuit,
    skipOpening,
    preparePlayerEquipment, commitPlayerEquipment, discardPlayerEquipment,
    enterMap, interact, castPortal, usePortal, travelToShrine, canTradeWith, setDifficulty,
    acceptQuest, completeQuest, doRespec, storyTopic, bossWard,
    afterDelay, addFloat, minionFloat, playerHurtFloat, addParticle, bloodBurst, dustPuff, addNova, lightningBolt, beamFx,
    knockMonster, detonateMark, detonateDoom, spawnCorpse, corpseFromGrave, throwUndeadLand,
    breakProp, breakPropsNear, breakPropsSeg,
    spawnProjectile, repath, finishTraversal, onMonsterDeath, onPlayerDeath, returnToTown, firstSightCutscene,
    fireProc, serializeItem, reviveItem,
    pickupGround, dropAtFeet,
    debugDrop, debugSpawnElites, debugGotoBoss,
    recordEnding,
    msg, centerMsg, saveOptions,
    touchReady, touchMove, touchSkill, touchTap, touchAction, resetTouch, cancelMenuInput,
    fx, options, debugFlags,
    get state() { return state; },
  };
})();

window.addEventListener("DOMContentLoaded", () => {
  Game.init().catch(err => {
    if (window.AppBootstrap && typeof window.AppBootstrap.fatal === "function") {
      window.AppBootstrap.fatal(err, "Game startup");
    }
  });
});
