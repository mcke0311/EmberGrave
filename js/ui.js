/* =========================================================================
   EMBERGRAVE — ui.js
   DOM-based interface: orbs, belt, skill buttons, panels (inventory,
   character, talents, quests, vendor, storage, dialog), tooltips,
   title screen, escape menu, debug console.
   ========================================================================= */
"use strict";

const UI = (() => {
  const $ = id => document.getElementById(id);
  let els = {};
  let cursorItem = null;            // item held on the mouse cursor
  let cursorFrom = null;            // grid it was lifted from
  let openPanels = { left: null, right: null, center: null };
  let characterTip = null, characterRefreshAt = 0;
  let vendorCtx = null;             // active vendor {npcId, items}
  let curTree = 0;
  let selectedSkill = null, skillsClass = null, hudBindingSignature = "", hudPlayer = null;
  const CELL = 34;
  let inventoryQuery = "", managementHero = null, questFilter = "all", forgeRecipe = "glyph";
  const textNode = (tag, cls, text) => { const el = document.createElement(tag); el.className = cls; if (text !== undefined) el.textContent = text; return el; };
  const itemName = it => (it.identified ? it.name : it.baseName) || it.name || "Item";
  const bindTap = (el, fn) => typeof MobileControls !== 'undefined' ? MobileControls.bindTap(el,fn) : el.addEventListener('click',fn);
  function actionButton(label, fn, cls = "manage-button") { const b = textNode("button", cls, label); b.type = "button"; b.addEventListener("click", fn); return b; }
  let managementSignature = '', managementMessage = '';
  const coopItems = () => typeof InventoryActions !== 'undefined' && InventoryActions.active;
  function managementStatus(message) {
    managementMessage=message;
    for(const panel of [els.panelLeft,els.panelRight,els.panelCenter]){
      if(!panel || panel.classList.contains('hidden'))continue;
      let status=panel.querySelector('.inventory-status');
      if(!status){status=textNode('p','inventory-status');status.setAttribute('role','status');panel.append(status);}
      status.textContent=message;
    }
  }
  function refreshManagement(force=false) {
    if(!coopItems() || !Game.state?.player)return;
    const p=Game.state.player;
    const signature=JSON.stringify([p.inv,p.stash,p.equip,p.management,p.gold,Game.state.vendorStock]);
    if(!force && signature===managementSignature)return;
    managementSignature=signature;
    const panels=[els.panelLeft,els.panelRight,els.panelCenter].filter(Boolean);
    const scrolls=panels.flatMap(panel=>[panel,...panel.querySelectorAll('.item-grid-scroll,.shop-list')].map(el=>({panel:panel.id,selector:el===panel?null:'.'+el.className.split(' ')[0],x:el.scrollLeft,y:el.scrollTop})));
    const focused=document.activeElement,focusId=focused?.id,focusItem=focused?.dataset.itemId;
    const selection=focused?.tagName==='INPUT'?[focused.selectionStart,focused.selectionEnd]:null;
    setCursorItem(p.management?.carried||null);
    forgeSlots=p.management?.offer||[null,null,null,null];
    if(vendorCtx){const selected=vendorCtx.selected?._coopId;vendorCtx.items=Game.state.vendorStock[vendorCtx.npcId]||[];vendorCtx.selected=vendorCtx.items.find(it=>it._coopId===selected)||null;}
    renderIfOpen('inv');renderIfOpen('storage');renderIfOpen('vendor');
    if(openPanels.center==='forge')renderForge();
    for(const r of scrolls){const panel=$(r.panel),node=r.selector?panel.querySelector(r.selector):panel;if(node){node.scrollLeft=r.x;node.scrollTop=r.y;}}
    const focus=focusId?$(focusId):focusItem?panels.flatMap(p=>[...p.querySelectorAll('[data-item-id]')]).find(n=>n.dataset.itemId===focusItem):null;
    if(focus && focused?.closest('#panelWorkspace')){focus.focus({preventScroll:true});if(selection&&focus.type==='search')focus.setSelectionRange(...selection);}
    managementStatus(managementMessage);syncWorkspace();
  }
  function syncWorkspace() {
    const host = document.getElementById("panelWorkspace"); if (!host) return;
    host.classList.toggle("paired", openPanels.right === "inv" && (openPanels.left === "vendor" || openPanels.left === "storage" || openPanels.center === "forge"));
    host.classList.toggle("forge-workspace", openPanels.center === "forge");
    if(typeof MobileWorkspace!=='undefined')MobileWorkspace.sync();
  }
  function resetManagementState() {
    if (coopItems()) {if(managementHero?.heroId!==Game.state.player.heroId){inventoryQuery='';forgeRecipe='glyph';}managementHero=Game.state.player;return;}
    if (managementHero === Game.state.player) return;
    managementHero = Game.state.player; inventoryQuery = ""; questFilter = "all"; questUiAct = questUiSel = null; forgeRecipe = "glyph";
  }
  function filterButtons(options, selected, choose) {
    const row = textNode("div", "manage-tabs");
    for (const [id,label] of options) { const b = actionButton(label,()=>choose(id)); b.classList.toggle("selected", id === selected); b.setAttribute("aria-pressed",String(id === selected)); row.appendChild(b); }
    return row;
  }

  function init() {
    // Capture covers dynamic controls and handlers that stop propagation. Keep
    // click feedback here so individual actions cannot play the same click twice.
    const feedback = e => {
      const selector = e.type === "contextmenu" ? ".invitem,.qslot,.beltslot" :
        e.type === "change" ? "select,input[type=range],input[type=color]" :
        'button,[role=button],.invitem,.eqslot,.invgrid,.dlgopt,.wprow:not(.wphere),.choicebtn,#cinematic:not(.hidden),input:not([type=range]):not([type=color]):not([type=hidden])';
      const control = e.target.closest?.(selector);
      if (!control || !control.closest("#game") || control.closest(':disabled,[inert],[aria-disabled="true"]')) return;
      if (e.type === "change") queueMicrotask(() => Sfx.play("click"));
      else Sfx.play("click");
    };
    document.addEventListener("click", feedback, true);
    document.addEventListener("contextmenu", feedback, true);
    // A committed slider/select change also covers keyboard interaction.
    document.addEventListener("change", feedback, true);
    els = {
      hud: $("hud"), orbHp: $("orbHp"), orbMp: $("orbMp"), hpText: $("hpText"), mpText: $("mpText"),
      xpfill: $("xpfill"), beltBar: $("beltBar"), skillL: $("skillL"), skillR: $("skillR"),
      quickbar: $("quickbar"), buffs: $("buffs"),
      panelLeft: $("panelLeft"), panelRight: $("panelRight"), panelCenter: $("panelCenter"),
      tooltip: $("tooltip"), tooltipCmp: $("tooltipCmp"), cursorItem: $("cursorItem"),
      msglog: $("msglog"), centerMsg: $("centerMsg"), skillPick: $("skillPick"),
      debug: $("debug"), escmenu: $("escmenu"), cinematic: $("cinematic"), title: $("title"), titleMenu: $("titleMenu"),
      minimap: $("minimap"), zonelabel: $("zonelabel"),
      deathScreen: $("deathScreen"), deathMessage: $("deathMessage"), deathStatus: $("deathStatus"), backToTown: $("backToTown"),
    };
    // Escape/backdrop clicks must not dismiss the only way out of death.
    els.deathScreen.addEventListener("cancel", e => e.preventDefault());
    els.backToTown.addEventListener("click", async () => {
      if (els.backToTown.disabled) return;
      els.backToTown.disabled = true;
      els.deathStatus.textContent = "Returning to town…";
      try {
        if (await Game.returnToTown()) return;
        els.deathStatus.textContent = "Town could not be loaded. Please try again.";
      } catch (error) {
        console.error("Could not return to town:", error);
        els.deathStatus.textContent = "Town could not be loaded. Please try again.";
      }
      els.backToTown.disabled = false;
      els.backToTown.focus();
    });
    for (const el of document.querySelectorAll(".hbtn"))
      bindTap(el, () => { togglePanel(el.dataset.panel); });
    els.skillL.addEventListener("click", e => { e.stopPropagation(); openSkillPick("L"); });
    els.skillR.addEventListener("click", e => { e.stopPropagation(); openSkillPick("R"); });
    els.skillL.addEventListener("contextmenu", e => e.preventDefault());
    els.skillR.addEventListener("contextmenu", e => e.preventDefault());
    for (const [el, side] of [[els.skillL, "L"], [els.skillR, "R"]]) {
      const tip = () => { if (!Game.state) return; const r = el.getBoundingClientRect(); showSkillTooltip(Game.state.player["skill" + side], r.left + r.width / 2, r.top); };
      el.addEventListener("mouseenter", tip); el.addEventListener("focus", tip);
      el.addEventListener("mouseleave", hideTooltip); el.addEventListener("blur", hideTooltip);
    }
    document.addEventListener("click", e => { if (!els.skillPick.contains(e.target)) els.skillPick.classList.add("hidden"); });
    document.addEventListener("keydown", e => {
      if (escOpen()) {
        if (!els.escmenu.contains(e.target)) menuKeydown(e);
        return;
      }
      /* Space/Enter activate a focused control; they must not also jump or
         trigger world input underneath the interface. */
      if ((e.key === " " || e.key === "Enter") && e.target.closest("button")) e.stopPropagation();
    });
    document.addEventListener("mousemove", e => {
      if (cursorItem) {
        els.cursorItem.style.left = (e.clientX - cursorItem.w * CELL / 2) + "px";
        els.cursorItem.style.top = (e.clientY - cursorItem.h * CELL / 2) + "px";
      }
    });
    buildBelt();
  }

  /* ================================================== orbs / hud */
  function drawOrb(canvas, pct, color, dark) {
    const ctx = canvas.getContext("2d");
    const w = canvas.width, h = canvas.height, cx = w / 2, cy = h / 2, r = w / 2 - 9;
    const now = performance.now() * 0.001;
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    /* heavy, hammered socket */
    ctx.shadowColor = "rgba(0,0,0,.9)"; ctx.shadowBlur = 10; ctx.shadowOffsetY = 5;
    const metal = ctx.createRadialGradient(cx - 12, cy - 17, 5, cx, cy, r + 9);
    metal.addColorStop(0, "#777266"); metal.addColorStop(.18, "#302f2b");
    metal.addColorStop(.58, "#111212"); metal.addColorStop(.82, "#665233"); metal.addColorStop(1, "#090909");
    ctx.fillStyle = metal; ctx.beginPath(); ctx.arc(cx, cy, r + 8, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    ctx.strokeStyle = "#090909"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, r + 6.5, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = "rgba(215,177,100,.55)"; ctx.lineWidth = 1.25; ctx.beginPath(); ctx.arc(cx, cy, r + 4.5, 0, Math.PI * 2); ctx.stroke();
    /* four subtle rune-clasps make the silhouette feel built, not merely circled */
    ctx.fillStyle = "#78603a";
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + i * Math.PI / 2;
      ctx.save(); ctx.translate(cx + Math.cos(a) * (r + 6), cy + Math.sin(a) * (r + 6)); ctx.rotate(a);
      ctx.fillRect(-4, -2, 8, 4); ctx.restore();
    }
    /* glass and empty interior */
    const empty = ctx.createRadialGradient(cx - 13, cy - 17, 3, cx, cy, r);
    empty.addColorStop(0, dark); empty.addColorStop(.7, dark); empty.addColorStop(1, "#020202");
    ctx.fillStyle = empty; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    /* liquid */
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
    const level = cy + r - pct * r * 2;
    const g = ctx.createLinearGradient(0, level, 0, h / 2 + r);
    g.addColorStop(0, color[0]); g.addColorStop(1, color[1]);
    ctx.fillStyle = g; ctx.beginPath();
    ctx.moveTo(cx - r - 2, level);
    for (let x = cx - r; x <= cx + r + 3; x += 4) ctx.lineTo(x, level + Math.sin(now * 2.2 + x * .09) * 1.15);
    ctx.lineTo(cx + r + 2, cy + r + 2); ctx.lineTo(cx - r - 2, cy + r + 2); ctx.closePath(); ctx.fill();
    /* liquid glow, meniscus, and a few slow bubbles */
    const glow = ctx.createRadialGradient(cx - 12, level + 10, 1, cx, level + 13, r * .95);
    glow.addColorStop(0, "rgba(255,255,255,.18)"); glow.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = glow; ctx.fillRect(0, level, w, h - level);
    ctx.strokeStyle = "rgba(255,236,205,.38)"; ctx.lineWidth = 1.4; ctx.beginPath();
    ctx.moveTo(cx - r, level); ctx.quadraticCurveTo(cx, level + Math.sin(now * 2.2) * 1.3, cx + r, level); ctx.stroke();
    ctx.fillStyle = "rgba(255,220,190,.2)";
    for (let i = 0; i < 3; i++) {
      const bx = cx - 18 + i * 17, span = Math.max(7, cy + r - level - 5);
      const by = cy + r - 5 - ((now * (5 + i * 1.7) + i * 13) % span);
      if (by > level + 4) { ctx.beginPath(); ctx.arc(bx, by, 1.2 + i * .35, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.restore();
    /* inner rim and glass highlights */
    ctx.strokeStyle = "rgba(0,0,0,.72)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, r + 1, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,.13)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx - 1, cy - 1, r - 1, Math.PI * 1.05, Math.PI * 1.72); ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,.12)"; ctx.beginPath(); ctx.ellipse(cx - r * .34,cy - r * .38,r * .27,r * .15,-.62,0,Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function refreshHUD() {
    const p = Game.state && Game.state.player;
    if (!p) return;
    drawOrb(els.orbHp, U.clamp(p.hp / p.stats.maxHp, 0, 1), ["#c03030", "#5a0c0c"], "#1a0606");
    drawOrb(els.orbMp, U.clamp(p.mana / p.stats.maxMana, 0, 1), ["#3858c0", "#101c54"], "#060a1a");
    els.hpText.textContent = `${Math.ceil(p.hp)} / ${p.stats.maxHp}`;
    els.mpText.textContent = `${Math.ceil(p.mana)} / ${p.stats.maxMana}`;
    let upkeep=document.getElementById("companionUpkeep");
    if(!upkeep){upkeep=document.createElement("span");upkeep.id="companionUpkeep";els.mpText.parentElement.appendChild(upkeep);}
    const drain=p.companionUpkeep();upkeep.hidden=!drain;upkeep.textContent=`−${drain}/s companions`;
    upkeep.title="Companion upkeep before regeneration. Companions die when aether reaches zero.";
    const need = DATA.xpForLevel(p.lvl);
    const xpPct = p.lvl >= DATA.MAX_LEVEL ? 100 : U.clamp(p.xp / need * 100, 0, 100);
    els.xpfill.style.width = xpPct + "%";
    $("xpbar").setAttribute("aria-valuenow", Math.round(xpPct));
    $("xpbar").setAttribute("aria-valuemin", "0"); $("xpbar").setAttribute("aria-valuemax", "100");
    $("xpbar").title = p.lvl >= DATA.MAX_LEVEL ? "Maximum level" : `${p.xp.toLocaleString()} / ${need.toLocaleString()} experience`;
    $("hudClass").textContent = p.cls.name; $("hudLevel").textContent = "LEVEL " + p.lvl;
    $("xpText").textContent = p.lvl >= DATA.MAX_LEVEL ? "MAX LEVEL" : Math.floor(xpPct) + "% TO NEXT LEVEL";
    const pendingPerks=SkillPerks.pending(p);
    $("talentNotice").hidden = p.skillPts <= 0 && !pendingPerks;
    $("talentNotice").textContent = p.skillPts>0 ? `${p.skillPts}${pendingPerks?" ◆":""}` : `◆ ${pendingPerks}`;
    $("talentNotice").title=`${p.skillPts} talent points · ${pendingPerks} perk choices available`;
    els.hud.style.setProperty("--class-accent", SkillIcons.theme(p.classId).color);
    $("orbHpWrap").classList.toggle("low-life", p.hp > 0 && p.hp / p.stats.maxHp < .25);
    for (const button of document.querySelectorAll(".hbtn")) {
      const active = Object.values(openPanels).includes(button.dataset.panel);
      button.classList.toggle("active", active); button.setAttribute("aria-pressed", String(active));
    }
    refreshSkillButtons();
    /* Reconcile visible sheet values at most ten times a second. Never rebuild
       focused controls or run the preview calculations while the panel is shut. */
    if (openPanels.left === "char") {
      if (performance.now() >= characterRefreshAt) renderCharacter();
      else {
        const values=CharacterSheet.liveValues(p);
        values.xp=p.lvl>=DATA.MAX_LEVEL?"Maximum level":U.fmt(p.xp)+" / "+U.fmt(DATA.xpForLevel(p.lvl));
        for(const [id,value] of Object.entries(values)){
          const row=els.panelLeft.querySelector(`[data-stat-id="${id}"]`);
          if(row&&row.dataset.value!==value){row.dataset.value=value;row.querySelector(".v").textContent=value;if(characterTip===row)showCharacterTooltip(row);}
        }
      }
    }
  }
  function skillBtnIcon(el, skillId) {
    el.innerHTML = "";
    const sk = skillId === "basic" ? DATA.BASIC_ATTACK : DATA.SKILLS[skillId];
    el.appendChild(SkillIcons.create(sk, 54, Game.state.player.equip.main?.cat));
    el.dataset.skill = skillId;
    el.setAttribute("aria-label", `${el.id === "skillL" ? "Left" : "Right"} mouse: ${sk.name}. Click to assign.`);
    const key = document.createElement("div"); key.className = "mkey";
    key.textContent = el.id === "skillL" ? "LMB" : "RMB";
    el.appendChild(key);
    const cd = document.createElement("span"); cd.className = "skill-cooldown"; el.appendChild(cd);
  }
  function refreshSkillButtons() {
    const p = Game.state.player;
    if (hudPlayer !== p) { hudPlayer = p; hudBindingSignature = ""; }
    if (!p.quickSlots) p.quickSlots = [null, null, null, null];
    for (let i = 0; i < 4; i++) if (p.quickSlots[i] && p.quickSlots[i] !== "basic" && !p.skills[p.quickSlots[i]]) p.quickSlots[i] = null;
    const signature = [p.classId, p.equip.main?.cat, p.skillL, p.skillR, ...p.quickSlots].join("|");
    if (signature === hudBindingSignature) { refreshCooldowns(p); return; }
    hudBindingSignature = signature;
    skillBtnIcon(els.skillL, p.skillL);
    skillBtnIcon(els.skillR, p.skillR);
    /* quickbar: F1-F4 = player-assigned skills. Click an assigned slot to make it
       your right-click skill; right-click a slot (or click an empty one) to assign. */
    if (!p.quickSlots) p.quickSlots = [null, null, null, null];
    els.quickbar.innerHTML = "";
    for (let i = 0; i < 4; i++) {
      const q = document.createElement("button"); q.type = "button"; q.className = "qslot";
      let id = p.quickSlots[i];
      if (id && id !== "basic" && !(p.skills[id] > 0)) { id = p.quickSlots[i] = null; }  // forgot via respec
      if (id) {
        const sk = id === "basic" ? DATA.BASIC_ATTACK : DATA.SKILLS[id];
        const c = SkillIcons.create(sk, 44, p.equip.main?.cat);
        q.appendChild(c);
        q.dataset.skill = id;
        q.setAttribute("aria-label", `F${i + 1}: ${sk.name}. Select for right mouse; right-click to reassign.`);
        q.title = `${sk.name} · F${i + 1}\nClick to select · Right-click to reassign`;
        if (p.skillR === id || p.skillL === id) q.classList.add("qbound");
        bindTap(q, e => { e.stopPropagation(); InventoryActions.run({type:"bind",slot:"R",skill:id},()=>{p.skillR=id;refreshHUD();renderIfOpen("skills");}); });
        q.addEventListener("mouseenter", e => { const r = q.getBoundingClientRect(); showSkillTooltip(id, r.left + r.width / 2, r.top); });
        q.addEventListener("mouseleave", hideTooltip);
        q.addEventListener("focus", () => { const r = q.getBoundingClientRect(); showSkillTooltip(id, r.left + r.width / 2, r.top); });
        q.addEventListener("blur", hideTooltip);
      } else {
        q.setAttribute("aria-label", `Assign a skill to F${i + 1}`);
        const plus = document.createElement("div"); plus.className = "qadd"; plus.textContent = "+";
        q.appendChild(plus);
        bindTap(q, e => { e.stopPropagation(); openSkillPick("Q" + i); });
      }
      q.addEventListener("contextmenu", e => { e.preventDefault(); openSkillPick("Q" + i); });
      const k = document.createElement("div"); k.className = "key"; k.textContent = "F" + (i + 1);
      q.appendChild(k);
      const cd = document.createElement("span"); cd.className = "skill-cooldown"; q.appendChild(cd);
      els.quickbar.appendChild(q);
    }
    refreshCooldowns(p);
  }
  function refreshCooldowns(p) {
    for (const el of [els.skillL, els.skillR, ...els.quickbar.children]) {
      const remaining = Math.max(0, (p.skillCd[el.dataset.skill] || 0) - Game.state.time);
      el.classList.toggle("cooling", remaining > 0);
      const blocked=!p.canUseSkillWeapon(el.dataset.skill);
      el.classList.toggle("weapon-blocked",blocked);
      if(blocked)el.title="Requires a bow or crossbow. Click to assign a skill.";
      else if(el.title.startsWith("Requires a bow"))el.removeAttribute("title");
      const label = el.querySelector(".skill-cooldown");
      if (label) label.textContent = remaining > 0 ? (remaining < 10 ? remaining.toFixed(1) : Math.ceil(remaining)) : "";
    }
  }
  function learnedActives(p) {
    const ids = ["basic"];
    for (const id of Object.keys(DATA.SKILLS))
      if ((p.skills[id] || 0) > 0 && DATA.SKILLS[id].type !== "passive") ids.push(id);
    return ids;
  }
  /* F1–F4: activate the assigned skill (as right-click), or open the picker if empty */
  function quickCast(i) {
    const p = Game.state.player;
    if (!p.quickSlots) p.quickSlots = [null, null, null, null];
    const id = p.quickSlots[i];
    if(typeof Coop!=="undefined"&&Coop.active){if(id)Coop.submit({type:"bind",slot:"R",skill:id});else CoopUI.skillPick("Q"+i);return;}
    if (id && (id === "basic" || p.skills[id] > 0)) { p.skillR = id; refreshHUD(); Sfx.play("click"); }
    else openSkillPick("Q" + i);
  }
  /* auto-fill the first empty F-slot when a new active skill is learned */
  function autoBindQuick(p, id) {
    if (!p.quickSlots) p.quickSlots = [null, null, null, null];
    if (p.quickSlots.includes(id)) return;
    const slot = p.quickSlots.indexOf(null);
    if (slot >= 0) p.quickSlots[slot] = id;
  }

  function buildBelt() {
    els.beltBar.innerHTML = "";
    for (let i = 0; i < 4; i++) {
      const s = document.createElement("button"); s.type = "button"; s.className = "beltslot"; s.dataset.i = i;
      const k = document.createElement("div"); k.className = "key"; k.textContent = i + 1;
      s.appendChild(k);
      bindTap(s, () => { Game.state.player.quaff(i); refreshHUD(); });
      s.addEventListener("contextmenu", e => {
        e.preventDefault();
        if(typeof Coop!=="undefined"&&Coop.active){Coop.submit({type:"unbelt",slot:i});return;}
        const p = Game.state.player, slot = p.belt[i];
        if (!slot) return;
        const it = Items.makeConsumable(slot.id, slot.count);
        if (Items.autoPlace(p.inv, it)) { p.belt[i] = null; refreshBelt(); renderIfOpen("inv"); }
        else Game.msg("No room in your pack.", "#c08080");
      });
      els.beltBar.appendChild(s);
    }
    refreshBelt();
  }
  function refreshBelt() {
    const p = Game.state && Game.state.player;
    if (!p) return;
    const slots = els.beltBar.children;
    for (let i = 0; i < 4; i++) {
      const s = slots[i];
      [...s.querySelectorAll("canvas,.cnt")].forEach(n => n.remove());
      const slot = p.belt[i];
      s.classList.toggle("empty", !slot);
      s.title = slot ? `${DATA.CONSUMABLES[slot.id].name} ×${slot.count}\n${i + 1}: drink · Right-click: move to inventory` : `${i + 1}: empty draught slot`;
      s.setAttribute("aria-label", s.title.split("\n")[0]);
      if (slot) {
        const fake = { icon: DATA.CONSUMABLES[slot.id].icon, w: 1, h: 1, name: slot.id };
        const c = SpriteAssets.itemIcon(fake);
        s.appendChild(c);
        const cnt = document.createElement("div"); cnt.className = "cnt"; cnt.textContent = slot.count;
        s.appendChild(cnt);
      }
    }
  }
  function buffEffectLines(b) {
    const lines = [];
    if (b.stats) for (const k in b.stats) {
      const v = b.stats[k];
      lines.push(DATA.STAT_TEXT[k] ? DATA.STAT_TEXT[k](v) : `+${v} ${k}`);
    }
    if (b.retal) lines.push(`Melee attackers take ${b.retal} cold + chill`);
    return lines;
  }
  function refreshBuffs() {
    const p = Game.state.player;
    els.buffs.innerHTML = "";
    for (const b of p.buffs) {
      const d = document.createElement("div"); d.className = "buffico";
      const remain = b.until === Infinity || b.infinite ? "∞" : Math.ceil(b.until - Game.state.time) + "s";
      d.innerHTML = `${b.emoji || "✦"}<span class="bt">${remain}</span>`;
      d.addEventListener("mouseenter", () => {
        hideTooltip();
        const r = d.getBoundingClientRect();
        const lines = buffEffectLines(b);
        const html = `<div class="tt-head">${b.label}${b.until === Infinity || b.infinite ? "  ·  permanent" : "  ·  " + remain}</div>`
          + (lines.length ? lines.map(l => `<div class="tt-base">${l}</div>`).join("") : `<div class="tt-base">An ongoing effect.</div>`);
        els.tooltip.innerHTML = html; els.tooltip.classList.remove("hidden");
        positionTip(els.tooltip, r.left + r.width / 2, r.bottom + 8);
      });
      d.addEventListener("mouseleave", hideTooltip);
      els.buffs.appendChild(d);
    }
    renderIfOpen("char");   // transforms/buffs reflect on the open character sheet
  }

  /* ================================================== messages */
  function msg(text, color) {
    const d = document.createElement("div");
    d.textContent = text; d.style.color = color || "#c8b78d";
    els.msglog.appendChild(d);
    while (els.msglog.children.length > 6) els.msglog.firstChild.remove();
    setTimeout(() => { d.style.transition = "opacity 1s"; d.style.opacity = "0"; setTimeout(() => d.remove(), 1000); }, 5000);
  }
  let centerT = null;
  function centerMsg(big, sub) {
    els.centerMsg.classList.remove("hidden");
    els.centerMsg.innerHTML = `${big}<div class="sub">${sub || ""}</div>`;
    clearTimeout(centerT);
    centerT = setTimeout(() => els.centerMsg.classList.add("hidden"), 3200);
  }
  function showDeath(lost, homeName) {
    closeAll(); closeEsc();
    clearTimeout(centerT); els.centerMsg.classList.add("hidden");
    els.deathMessage.textContent = (lost > 0 ? `${lost} gold lost. ` : "") + `Return to ${homeName} when you are ready.`;
    els.deathStatus.textContent = "";
    els.backToTown.disabled = false;
    if (!els.deathScreen.open) els.deathScreen.showModal();
    els.backToTown.focus();
  }
  function hideDeath() { if (els.deathScreen.open) els.deathScreen.close(); }

  /* ================================================== tooltips */
  function ttLine(l) { return `<div class="tt-${l.c || "mod"}">${l.t}</div>`; }
  function itemTypeLabel(it) {
    if (it.kind === "jewel") return "Jewel · Socketable";
    if (it.kind === "glyph") return "Glyph · Socketable";
    if (it.kind === "charm") return (DATA.CHARM_BASES[it.charmSize]?.name || "Charm") + " · Pack bonus";
    if (it.kind === "consumable") return /scroll/i.test(it.baseId) || it.baseId === "tp" ? "Scroll · Consumable" : "Potion · Consumable";
    const names = { sword:"Sword", axe:"Axe", mace:it.twoHand ? "Maul" : "Mace", dagger:"Dagger", spear:"Spear", bow:"Bow", crossbow:"Crossbow", wand:"Wand", staff:"Staff", shield:"Shield", helm:"Head armor", chest:"Body armor", gloves:"Gloves", boots:"Boots", belt:"Belt", ring:"Ring", amulet:"Amulet" };
    return (names[DATA.BASES[it.baseId]?.cat || it.cat] || "Equipment") + (it.slot === "main" ? (it.twoHand ? " · Two-handed" : " · One-handed") : "");
  }
  function itemTooltipHTML(it, ctx) {
    const col = `tt-${it.rarity}`;
    let html = `<div class="tt-name ${col}">${it.identified ? it.name : it.baseName}</div>`;
    html += `<div class="tt-type">${itemTypeLabel(it)}</div>`;
    if (it.identified && it.rarity !== "common" && it.kind === "gear") html += `<div class="tt-base">${it.baseName}</div>`;
    for (const l of Items.statLines(it)) html += ttLine(l);
    if (it.kind === "consumable") {
      const c = DATA.CONSUMABLES[it.baseId];
      if (c.healPct) html += ttLine({ t: `Restores ${Math.round(c.healPct * 100)}% of maximum Life over time`, c: "mod" });
      if (c.manaPct) html += ttLine({ t: `Restores ${Math.round(c.manaPct * 100)}% of maximum Aether over time`, c: "mod" });
      if (c.heal) html += ttLine({ t: `Restores ${c.heal} Life over time`, c: "mod" });
      if (c.mana) html += ttLine({ t: `Restores ${c.mana} Aether over time`, c: "mod" });
      if (c.rejuv) html += ttLine({ t: `Instantly restores ${c.rejuv * 100}% Life and Aether`, c: "mod" });
      if (it.count > 1) html += ttLine({ t: `Stack of ${it.count}`, c: "base" });
    }
    if (it.kind === "gear") {
      const req = Items.effReqLvl(it);
      if (req > 1) {
        const ok = Game.state.player.lvl >= req;
        html += ttLine({ t: `Requires Level ${req}`, c: ok ? "req" : "reqbad" });
      }
    }
    if (it.kind === "charm") html += ttLine({ t: "Keep in your pack — its power stays with you.", c: "set" });
    if (it.kind === "jewel") html += ttLine({ t: "Socket into any item with an open socket.", c: "set" });
    if (it.kind === "jewel" || it.kind === "glyph") html += ttLine({ t: "Pick up, then click equipment with an empty socket.", c: "base" });
    if (it.flavor && it.identified) html += ttLine({ t: `“${it.flavor}”`, c: "flavor" });
    if (ctx === "vendor") html += ttLine({ t: `Buy: ${Items.value(it)} gold`, c: "gold" });
    else if (vendorCtx) html += ttLine({ t: `Sell: ${Items.sellValue(it)} gold (right-click)`, c: "gold" });
    if (!it.identified) html += ttLine({ t: "Right-click with a Scroll of Insight in pack", c: "base" });
    else if (it.kind === "gear" && ctx !== "vendor" && !vendorCtx) html += ttLine({ t: ctx === "equip" ? "Right-click to unequip" : "Right-click to equip", c: "base" });
    else if (it.kind === "consumable" && ctx !== "vendor" && !vendorCtx) html += ttLine({ t: "Right-click to use", c: "base" });
    return html;
  }
  function addItemPreview(el, it) {
    const heading = el.querySelector(".tt-name");
    if (!heading) return;
    const identity = textNode("div", "tt-identity"), labels = textNode("div", "tt-labels");
    heading.before(identity); identity.append(SpriteAssets.itemIcon(it, 56), labels);
    labels.appendChild(heading);
    const type = el.querySelector(".tt-type"); if (type) labels.appendChild(type);
    const base = el.querySelector(".tt-base");
    if (base && it.identified && it.rarity !== "common" && it.kind === "gear") labels.appendChild(base);
  }
  function showItemTooltip(it, x, y, ctx) {
    hideTooltip();
    els.tooltip.innerHTML = itemTooltipHTML(it, ctx);
    addItemPreview(els.tooltip, it);
    els.tooltip.classList.remove("hidden");
    positionTip(els.tooltip, x, y);
    /* comparison with equipped */
    els.tooltipCmp.classList.add("hidden");
    if (it.kind === "gear" && ctx !== "equip") {
      const p = Game.state.player;
      const slots = Items.slotFor(it);
      const eq = p.equip[slots[0]] || (slots[1] && p.equip[slots[1]]);
      if (eq && eq !== it) {
        els.tooltipCmp.innerHTML = `<div class="tt-head" style="margin-bottom:2px">EQUIPPED</div>` + itemTooltipHTML(eq, "equip");
        addItemPreview(els.tooltipCmp, eq);
        els.tooltipCmp.classList.remove("hidden");
        const r = els.tooltip.getBoundingClientRect();
        positionTip(els.tooltipCmp, r.left - 10 - els.tooltipCmp.offsetWidth + (r.left > innerWidth / 2 ? 0 : r.width + els.tooltipCmp.offsetWidth + 20), r.top);
      }
    }
  }
  function positionTip(el, x, y) {
    el.style.left = "0px"; el.style.top = "0px";
    el.style.width = Math.min(310,innerWidth - 12) + "px"; el.style.maxWidth = "calc(100vw - 12px)";
    if (el.getBoundingClientRect().height > innerHeight - 12) {
      el.style.width = Math.min(520,innerWidth - 12) + "px";
      el.style.maxWidth = "calc(100vw - 12px)";
    }
    const { width:w, height:h } = el.getBoundingClientRect();
    el.style.left = U.clamp(x - w / 2, 6, innerWidth - w - 6) + "px";
    el.style.top = U.clamp(y - h - 14, 6, innerHeight - h - 6) + "px";
  }
  function showSkillTooltip(id, x, y) {
    hideTooltip();
    const p = Game.state.player;
    const sk = p.resolveSkill(id);
    const rk = id === "basic" ? 1 : (p.skills[id] || 0);
    const eff = id === "basic" ? 1 : p.effRank(id);
    let html = `<div class="tt-name tt-rare">${sk.name}</div>`;
    if (sk.tree !== undefined) {
      const trees = (DATA.CLASSES[sk.cls] && DATA.CLASSES[sk.cls].trees) || DATA.TREE_NAMES;
      html += `<div class="tt-base">${trees[sk.tree]} — Rank ${rk}/${sk.maxRank}${eff > rk ? ` <span style="color:#7fd87f">(+${eff - rk} from gear)</span>` : ""}</div>`;
    }
    html += `<div class="tt-mod">${sk.desc(Math.max(1, eff))}</div>`;
    if(sk.selectedPerks?.length) html += `<div class="tt-perks">Perks: ${sk.selectedPerks.map(perk=>perk.title).join(" · ")}</div>`;
    if (rk > 0 && rk < (sk.maxRank || 1) && id !== "basic")
      html += `<div class="tt-base">Next: ${sk.desc(eff + 1)}</div>`;
    if (sk.mana && id !== "basic") html += `<div class="tt-req">Aether cost: ${sk.mana(Math.max(1, eff))}</div>`;
    if (["summon","summon_golem"].includes(sk.type)) html += `<div class="tt-req">Upkeep: ${sk.upkeep(eff)} aether/sec per companion. All companions die at zero aether.</div>`;
    if (sk.requiredWeapons) html += `<div class="tt-${p.canUseSkillWeapon(id)?"req":"reqbad"}">Requires a bow or crossbow</div>`;
    if (sk.reqLvl > 1) html += `<div class="tt-${p.lvl >= sk.reqLvl ? "req" : "reqbad"}">Requires character level ${sk.reqLvl}</div>`;
    if (sk.prereq && DATA.SKILLS[sk.prereq]) html += `<div class="tt-${(p.skills[sk.prereq] || 0) > 0 ? "req" : "reqbad"}">Requires ${DATA.SKILLS[sk.prereq].name}</div>`;
    if (sk.synergy && Object.keys(sk.synergy).length) {
      for (const [sid, per] of Object.entries(sk.synergy))
        if (per > 0) html += `<div class="tt-base">Synergy: +${Math.round(per * 100)}% damage per rank of ${DATA.SKILLS[sid].name}</div>`;
    }
    if (sk.flavor) html += `<div class="tt-flavor">“${sk.flavor}”</div>`;
    els.tooltip.innerHTML = html;
    els.tooltip.classList.remove("hidden");
    positionTip(els.tooltip, x, y);
  }
  function hideTooltip() { characterTip = null; els.tooltip.classList.remove("character-tooltip"); els.tooltip.classList.add("hidden"); els.tooltipCmp.classList.add("hidden"); }

  /* ================================================== panels */
  function panelEl(side) { return side === "left" ? els.panelLeft : side === "right" ? els.panelRight : els.panelCenter; }
  function closePanel(side) {
    if(typeof MobileViews!=='undefined')MobileViews.release(panelEl(side));
    document.getElementById('touchItemMenu')?.remove();document.getElementById('panelWorkspace')?.classList.remove('item-detail-open');
    if(!coopItems()&&side==='right'&&openPanels.right==='inv'&&cursorItem&&Game.state?.player){
      const it=cursorItem,grid=cursorFrom?.items?cursorFrom:null;
      if(grid&&Items.fits(grid,it,it.gx,it.gy))Items.place(grid,it,it.gx,it.gy);
      else if(!Items.autoPlace(Game.state.player.inv,it)){Game.dropAtFeet(it);msg('Your pack was full — carried item placed at your feet.');}
      setCursorItem(null);Game.state.player.computeStats();
    }
    if(coopItems()&&Game.state?.player){
      const m=Game.state.player.management;
      if((side==='right'&&openPanels.right==='inv')||(side==='center'&&openPanels.center==='forge'&&m?.offer?.some(Boolean))) {
        Game.submitCommand({type:'returnManagement'}).then(()=>refreshManagement(true));
      }
    }
    if (side === "center" && openPanels.center === "forge") { returnForgeItems(); renderIfOpen("inv"); }
    const el = panelEl(side);
    el.classList.add("hidden"); el.innerHTML = "";
    el.classList.remove("talent-panel", "waypoint-panel");
    openPanels[side] = null;
    el.classList.remove("management-panel"); delete el.dataset.kind;
    if (side === "left") vendorCtx = null;
    syncWorkspace();
    if (side === "left" && openPanels.right === "inv" && Game.state?.player) renderInventory();
    hideTooltip();
  }
  function closeAll() { if(typeof CoopUI!=="undefined")CoopUI.close(); closePanel("left"); closePanel("right"); closePanel("center"); els.skillPick.classList.add("hidden"); }
  function anyOpen() { if(typeof CoopUI!=="undefined"&&CoopUI.isOpen)return true; return openPanels.left || openPanels.right || openPanels.center; }

  function togglePanel(name) {
    Game.cancelMenuInput();
    const side = name === "inv" ? "right" : "left";
    if (openPanels[side] === name) { closePanel(side); return; }
    if (typeof MobileControls !== "undefined" && MobileControls.enabled) closeAll();
    if (["skills","quest"].includes(name) && openPanels.right) closePanel("right");
    if (name === "inv" && ["skills","quest"].includes(openPanels.left)) closePanel("left");
    closePanel(side);
    openPanels[side] = name;
    if(coopItems()){setCursorItem(Game.state.player.management?.carried||null);managementSignature='';}
    renderPanel(name);
    if(typeof MobileWorkspace!=='undefined')MobileWorkspace.select(side);
  }
  function renderIfOpen(name) {
    if(!Game.state?.player)return;
    if (openPanels.left === name || openPanels.right === name) renderPanel(name);
  }
  function renderPanel(name) {
    switch (name) {
      case "inv": return renderInventory();
      case "char": return renderCharacter();
      case "skills": return renderSkills();
      case "quest": return renderQuests();
      case "vendor": return renderVendor();
      case "storage": return renderStorage();
    }
  }
  function header(el, title, side) {
    if(typeof MobileViews!=='undefined')MobileViews.release(el);
    el.classList.remove("talent-panel");
    const kind = openPanels[side]; el.dataset.kind = kind || "dialog";
    el.classList.toggle("waypoint-panel", kind === "shrine");
    el.classList.toggle("management-panel", ["inv","char","quest","vendor","forge","storage"].includes(kind));
    el.innerHTML = "";
    const head = textNode("div", "ptitle", title); el.appendChild(head);
    const close = actionButton("×", () => closePanel(side), "pclose"); close.setAttribute("aria-label", "Close " + title.toLowerCase()); el.appendChild(close);
    if(typeof MobileViews!=='undefined'&&MobileViews.enabled())queueMicrotask(()=>MobileViews.mount(el));
    syncWorkspace();
  }

  /* ---------- grid rendering ---------- */
  function renderGrid(container, grid, ctxName) {
    const g = document.createElement("div");
    g.className = "invgrid";
    g.style.width = grid.w * CELL + "px"; g.style.height = grid.h * CELL + "px";
    for (let y = 0; y < grid.h; y++) for (let x = 0; x < grid.w; x++) {
      const c = document.createElement("div"); c.className = "invcell";
      c.style.left = x * CELL + "px"; c.style.top = y * CELL + "px";
      c.style.width = CELL - 1 + "px"; c.style.height = CELL - 1 + "px";
      g.appendChild(c);
    }
    for (const it of grid.items) {
      const d = document.createElement("div");
      d.className = `invitem r-${it.rarity}`;
      d.dataset.itemId=it._coopId||it.uid||'';
      d.dataset.itemName = itemName(it).toLowerCase(); d.tabIndex = 0; d.setAttribute("aria-label", itemName(it));
      d.addEventListener("focus", () => { const r = d.getBoundingClientRect(); showItemTooltip(it,r.right,r.top,ctxName); });
      d.addEventListener("blur", hideTooltip);
      d.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); Sfx.play("click"); if(typeof MobileShell!=='undefined'&&MobileShell.enabled)d.click();else gridItemRClick(grid,it,ctxName); } });
      d.style.left = it.gx * CELL + "px"; d.style.top = it.gy * CELL + "px";
      d.style.width = it.w * CELL + "px"; d.style.height = it.h * CELL + "px";
      d.appendChild(SpriteAssets.itemIcon(it));
      if(typeof MobileShell!=='undefined'&&MobileShell.enabled){
        d.setAttribute('role','button');
        const copy=textNode('span','phone-item-copy');copy.append(textNode('strong','',itemName(it)),textNode('small','',itemTypeLabel(it)+' · '+(it.rarity||'common')+(it.kind==='gear'?' · Level '+Items.effReqLvl(it):'')));d.append(copy);
      }
      if (it.count > 1) { const s = document.createElement("div"); s.className = "stk"; s.textContent = it.count; d.appendChild(s); }
      d.addEventListener("mouseenter", e => { const r = d.getBoundingClientRect(); showItemTooltip(it, r.left + r.width / 2, r.top, ctxName); });
      d.addEventListener("mouseleave", hideTooltip);
      d.addEventListener("click", e => {
        e.stopPropagation();
        if (typeof MobileControls !== "undefined" && MobileControls.enabled && !cursorItem) openTouchItemMenu(grid,it,ctxName,e);
        else gridItemClick(grid, it, ctxName);
      });
      d.addEventListener("contextmenu", e => { e.preventDefault(); e.stopPropagation(); gridItemRClick(grid, it, ctxName); });
      g.appendChild(d);
    }
    g.addEventListener("click", e => {
      if (!cursorItem) return;
      const r = g.getBoundingClientRect();
      const gx = U.clamp(Math.round((e.clientX - r.left - cursorItem.w * CELL / 2) / CELL), 0, grid.w - cursorItem.w);
      const gy = U.clamp(Math.round((e.clientY - r.top - cursorItem.h * CELL / 2) / CELL), 0, grid.h - cursorItem.h);
      if(coopItems()){
        const old=grid.items.filter(o=>gx<o.gx+o.w&&o.gx<gx+cursorItem.w&&gy<o.gy+o.h&&o.gy<gy+cursorItem.h);
        return InventoryActions.submit({type:'place',itemId:cursorItem._coopId,to:ctxName==='storage'?'stash':'inv',x:gx,y:gy,targetId:old.length===1?old[0]._coopId:null});
      }
      if (Items.fits(grid, cursorItem, gx, gy)) {
        Items.place(grid, cursorItem, gx, gy);
        setCursorItem(null);
        Sfx.play("pickup");
        refreshGrids();
      } else {
        /* swap with single overlapping item */
        const overlapped = grid.items.filter(o => gx < o.gx + o.w && o.gx < gx + cursorItem.w && gy < o.gy + o.h && o.gy < gy + cursorItem.h);
        if (overlapped.length === 1) {
          const o = overlapped[0];
          Items.remove(grid, o);
          if (Items.fits(grid, cursorItem, gx, gy)) {
            Items.place(grid, cursorItem, gx, gy);
            setCursorItem(o);
          } else { Items.place(grid, o, o.gx, o.gy); }
          refreshGrids();
        }
      }
    });
    const scroll = textNode('div','item-grid-scroll'); scroll.appendChild(g); container.appendChild(scroll);
    if(typeof MobileShell!=='undefined'&&MobileShell.enabled&&cursorItem){
      container.appendChild(actionButton('Place carried item here',()=>{
        const it=cursorItem;
        for(let y=0;y<=grid.h-it.h;y++)for(let x=0;x<=grid.w-it.w;x++)if(Items.fits(grid,it,x,y)){
          if(coopItems())return InventoryActions.submit({type:'place',itemId:it._coopId,to:ctxName==='storage'?'stash':'inv',x,y});
          Items.place(grid,it,x,y);setCursorItem(null);refreshGrids();refreshHUD();return;
        }
        msg('No room here. Choose another container or item.');
      }));
    }
    return g;
  }
  function openTouchItemMenu(grid, it, ctxName, event) {
    const opener=document.activeElement;
    document.getElementById('touchItemMenu')?.remove();
    const dialog=textNode('section','gframe workspace-detail'); dialog.id='touchItemMenu';dialog.setAttribute('role','region');
    dialog.setAttribute('aria-label',itemName(it));
    const details=textNode('div','touch-item-details'); details.innerHTML=itemTooltipHTML(it,ctxName);
    addItemPreview(details,it);
    const touchCopy=body=>{for (const line of body.querySelectorAll('.tt-base,.tt-gold')) {
      if (/right-click/i.test(line.textContent)) {
        if (line.classList.contains('tt-gold')) line.textContent=line.textContent.replace(/ \(right-click\)/i,'');
        else line.remove();
      }
    }};
    touchCopy(details);
    hideTooltip(); dialog.appendChild(details);
    if(it.kind==='gear'&&ctxName!=='equip')for(const equipped of [...new Set(Items.slotFor(it).map(slot=>Game.state.player.equip[slot]).filter(Boolean))]){
      const compare=textNode('details','shop-compare');compare.open=typeof MobileShell!=='undefined'&&MobileShell.enabled;compare.appendChild(textNode('summary','','Equipped: '+itemName(equipped)));
      const body=textNode('div','touch-item-details');body.innerHTML=itemTooltipHTML(equipped,'equip');addItemPreview(body,equipped);touchCopy(body);compare.append(body);dialog.append(compare);
    }
    const actions=textNode('div','touch-item-actions'); dialog.appendChild(actions);
    const close=()=>{dialog.remove();hideTooltip();document.getElementById('panelWorkspace').classList.remove('item-detail-open');if(typeof MobileWorkspace!=='undefined')MobileWorkspace.sync();if(opener?.isConnected)opener.focus({preventScroll:true});};
    const p=Game.state.player,c=DATA.CONSUMABLES[it.baseId];
    const label=ctxName==='equip'?'Unequip':vendorCtx&&grid===p.inv?'Sell':it.kind==='gear'?(it.identified?'Equip':'Identify'):
      c?.belt?'Move to belt':c&&(c.respec||it.baseId==='tp')?'Use':null;
    if(label)actions.appendChild(actionButton(label,()=>{close();if(ctxName==='equip')unequipSlot(grid,it);else gridItemRClick(grid,it,ctxName);},'manage-primary'));
    actions.appendChild(actionButton('Carry',()=>{
      close();if(ctxName==='equip')carryEquipment(grid,it);else gridItemClick(grid,it,ctxName);
      els.cursorItem.style.left=(event.clientX-it.w*CELL/2)+'px';
      els.cursorItem.style.top=(event.clientY-it.h*CELL/2)+'px';
    }));
    if(ctxName!=='vendor')actions.appendChild(actionButton('Drop',async()=>{
      close();
      if(coopItems())return InventoryActions.submit({type:'drop',itemId:it._coopId});
      if(ctxName==='equip'){await carryEquipment(grid,it);if(cursorItem!==it)return;setCursorItem(null);}
      else Items.remove(grid,it);
      Game.dropAtFeet(it);refreshGrids();refreshHUD();
    }));
    const back=actionButton('Back',close);back.dataset.itemBack='';actions.appendChild(back);
    dialog.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}});
    const workspace=$('panelWorkspace');workspace.appendChild(dialog);workspace.classList.add('item-detail-open');if(typeof MobileWorkspace!=='undefined')MobileWorkspace.sync();actions.querySelector('button')?.focus();
  }
  function gridItemClick(grid, it, ctxName) {
    if(coopItems()){
      const carried=Game.state.player.management?.carried;
      if(!carried)return InventoryActions.submit({type:'carry',itemId:it._coopId});
      if(['glyph','jewel'].includes(carried.kind)&&it.kind==='gear')return InventoryActions.submit({type:'socket',itemId:it._coopId,socketId:carried._coopId});
      return InventoryActions.submit({type:'place',itemId:carried._coopId,to:ctxName==='storage'?'stash':'inv',x:it.gx,y:it.gy,targetId:it._coopId});
    }
    if (cursorItem) {
      /* glyph or jewel on cursor + socketed gear under it -> seat it */
      if ((cursorItem.kind === "glyph" || cursorItem.kind === "jewel") && it.kind === "gear") {
        if (!it.identified) { msg("Identify it before working socketables into it.", "#c08080"); return; }
        if (!it.sockets) { msg("That item has no sockets.", "#c08080"); return; }
        const glyphName = cursorItem.name;
        const seated = Items.socketGlyph(it, cursorItem);
        if (seated) {
          setCursorItem(null);
          Sfx.play("forge");
          if (seated.combo) {
            Sfx.play("dropUnique");
            msg(`The glyphs align — ${it.name}!`, "#d8924a");
            Game.centerMsg(seated.combo.name.toUpperCase(), "a named work, bound in glyphs");
          } else msg(`Seated ${glyphName} in ${it.name}.`, "#7fd8c0");
          Game.state.player.computeStats();
          refreshGrids(); refreshHUD();
        } else msg("No empty socket left.", "#c08080");
        return;
      }
      /* merge stacks of the same consumable */
      if (cursorItem.kind === "consumable" && it.kind === "consumable" && it.baseId === cursorItem.baseId && it.count < it.maxStack) {
        const take = Math.min(it.maxStack - it.count, cursorItem.count);
        it.count += take; cursorItem.count -= take;
        if (cursorItem.count <= 0) setCursorItem(null);
        Sfx.play("pickup");
        refreshGrids(); return;
      }
      /* swap in place */
      const gx = it.gx, gy = it.gy;
      Items.remove(grid, it);
      if (Items.fits(grid, cursorItem, gx, gy)) {
        Items.place(grid, cursorItem, gx, gy);
        setCursorItem(it);
        Sfx.play("pickup");
      } else {
        Items.place(grid, it, gx, gy);
        msg("It doesn't fit there.", "#c08080");
      }
      refreshGrids(); return;
    }
    Items.remove(grid, it);
    setCursorItem(it, grid);
    Sfx.play("pickup");
    refreshGrids();
  }
  function gridItemRClick(grid, it, ctxName) {
    const p = Game.state.player;
    if(coopItems()){
      const type=vendorCtx&&grid===p.inv?'sell':it.kind==='gear'?(it.identified?'equip':'identify'):it.belt?'belt':it.kind==='consumable'&&it.baseId!=='idscroll'?'use':null;
      if(type)return InventoryActions.submit({type,itemId:it._coopId,...(type==='sell'?{npcId:vendorCtx.npcId}:{})});
      msg('Carry this item to place it or socket it.');return;
    }
    if (vendorCtx && grid === p.inv) {  /* sell */
      p.gold += Items.sellValue(it);
      Items.remove(grid, it);
      Sfx.play("coin");
      msg(`Sold ${it.identified ? it.name : it.baseName} for ${Items.sellValue(it)} gold.`, "#d8b860");
      refreshGrids(); return;
    }
    if (it.kind === "consumable") {
      const c = DATA.CONSUMABLES[it.baseId];
      if (c.belt) {  /* send to belt */
        for (let i = 0; i < 4; i++) {
          const slot = p.belt[i];
          if (slot && slot.id === it.baseId) { const take = Math.min(it.count, 5 - slot.count); if (take > 0) { slot.count += take; it.count -= take; } }
        }
        for (let i = 0; i < 4 && it.count > 0; i++) {
          if (!p.belt[i]) { const take = Math.min(it.count, 5); p.belt[i] = { id: it.baseId, count: take }; it.count -= take; }
        }
        if (it.count <= 0) Items.remove(grid, it);
        else msg("Belt is full.", "#c08080");
        refreshBelt(); refreshGrids(); return;
      }
      if (c.respec) {
        Game.doRespec(); Items.remove(grid, it); refreshGrids(); return;
      }
      if (it.baseId === "tp") {
        if (Game.castPortal()) { it.count--; if (it.count <= 0) Items.remove(grid, it); refreshGrids(); }
        return;
      }
      if (it.baseId === "idscroll") { msg("Right-click an unidentified item to use this.", "#9b8a60"); return; }
    }
    if (it.kind === "glyph") {
      msg("Pick the glyph up on your cursor, then click a socketed item.", "#7fd8c0");
      return;
    }
    if (it.kind === "gear") {
      if (!it.identified) {
        const scroll = p.inv.items.find(o => o.baseId === "idscroll");
        if (scroll) {
          scroll.count--; if (scroll.count <= 0) Items.remove(p.inv, scroll);
          it.identified = true;
          Sfx.play("shrine");
          msg(`Identified: ${it.name}`, Items.RARITY_COLOR[it.rarity]);
          refreshGrids();
        } else msg("You need a Scroll of Insight.", "#c08080");
        return;
      }
      equipItem(grid, it);
    }
  }
  async function prepareEquipmentChange(nextEquip) {
    try { return await Game.preparePlayerEquipment(nextEquip); }
    catch (err) {
      console.error(err);
      Sfx.play("error");
      msg("Equipment art unavailable: " + (err && err.message || err), "#c08080");
      return null;
    }
  }

  async function equipItem(grid, it) {
    const p = Game.state.player;
    if (!Items.canEquip(p, it)) { msg("You cannot equip that yet.", "#c08080"); Sfx.play("error"); return; }
    const slots = Items.slotFor(it);
    let slot = slots.find(s => !p.equip[s]) || slots[0];
    const oldEquip = Object.assign({}, p.equip);
    const prev = p.equip[slot];
    /* two-handed handling: clear off hand */
    let displacedOff = null;
    const nextEquip = Object.assign({}, p.equip);
    if (it.twoHand && p.equip.off) { displacedOff = p.equip.off; delete nextEquip.off; }
    if (it.slot === "off" && p.equip.main && p.equip.main.twoHand) { displacedOff = p.equip.main; delete nextEquip.main; }
    nextEquip[slot] = it;
    const prepared = await prepareEquipmentChange(nextEquip);
    if (!prepared) return;
    if (p.equip[slot] !== prev || !grid.items || !grid.items.some(x => x === it)) {
      Game.discardPlayerEquipment(prepared);
      return;
    }
    const oldGX = it.gx, oldGY = it.gy;
    Items.remove(grid, it);
    if (it.twoHand && p.equip.off) delete p.equip.off;
    if (it.slot === "off" && p.equip.main && p.equip.main.twoHand) delete p.equip.main;
    p.equip[slot] = it;
    /* A replacement can always reuse the incoming item's former cells; this
       preflight keeps the visual commit and inventory transaction atomic. */
    if (prev && !Items.autoPlace(p.inv, prev)) {
      for (const key of Object.keys(p.equip)) delete p.equip[key];
      Object.assign(p.equip, oldEquip);
      Items.place(grid, it, oldGX, oldGY);
      Game.discardPlayerEquipment(prepared);
      msg("No room to swap.", "#c08080"); return;
    }
    if (displacedOff && !Items.autoPlace(p.inv, displacedOff)) {
      Game.dropAtFeet(displacedOff); msg("Your pack was full — item dropped.", "#c08080");
    }
    Game.commitPlayerEquipment(prepared);
    p.computeStats();
    Sfx.play("chest");
    refreshGrids(); refreshHUD();
  }
  function setCursorItem(it, fromGrid) {
    cursorItem = it; cursorFrom = fromGrid || null;
    const tidy = document.getElementById("inventoryTidy"); if (tidy) tidy.disabled = !!it;
    const buy = els.panelLeft?.querySelector(".shop-buy"), selected = vendorCtx?.selected;
    if (buy && selected) buy.disabled = !!it || Game.state.player.gold < Items.value(selected) || !Items.canAutoPlace(Game.state.player.inv, selected);
    els.cursorItem.innerHTML = "";
    if (it) {
      els.cursorItem.appendChild(SpriteAssets.itemIcon(it));
      els.cursorItem.classList.remove("hidden");
    } else els.cursorItem.classList.add("hidden");
  }
  function refreshGrids() {
    /* charms in the pack contribute passively — keep stats in sync on any pack change */
    if (Game.state && Game.state.player) Game.state.player.computeStats();
    renderIfOpen("inv"); renderIfOpen("storage"); renderIfOpen("vendor"); renderIfOpen("char");
    renderIfOpen("skills");   // gear may carry "+to talents" — keep the tree in sync on equip/unequip
  }

  async function carryEquipment(slot,it){
    if(coopItems())return InventoryActions.submit({type:'carry',itemId:it._coopId});
    const p=Game.state.player,next={...p.equip};delete next[slot];
    const prepared=await prepareEquipmentChange(next);if(!prepared)return;
    if(p.equip[slot]!==it||cursorItem){Game.discardPlayerEquipment(prepared);return;}
    delete p.equip[slot];Game.commitPlayerEquipment(prepared);p.computeStats();setCursorItem(it);refreshGrids();refreshHUD();
  }
  async function unequipSlot(slot,it){
    if(coopItems())return InventoryActions.submit({type:'unequip',slot,itemId:it._coopId});
    const p=Game.state.player;if(!Items.canAutoPlace(p.inv,it)){msg('No room in your pack.');return;}
    const next={...p.equip};delete next[slot];const prepared=await prepareEquipmentChange(next);if(!prepared)return;
    if(p.equip[slot]!==it||!Items.canAutoPlace(p.inv,it)){Game.discardPlayerEquipment(prepared);return;}
    delete p.equip[slot];Items.autoPlace(p.inv,it);Game.commitPlayerEquipment(prepared);p.computeStats();refreshGrids();refreshHUD();
  }
  /* ---------- inventory panel ---------- */
  const EQ_LAYOUT = {
    head: [136, 8, 2, 2], amulet: [224, 28, 1, 1], chest: [136, 99, 2, 3],
    main: [0, 42, 2, 3], off: [272, 42, 2, 3],
    ring1: [89, 155, 1, 1], ring2: [224, 155, 1, 1],
    gloves: [0, 187, 2, 2], belt: [136, 226, 2, 1], boots: [272, 187, 2, 2],
  };
  function renderInventory() {
    resetManagementState();
    const p = Game.state.player;
    const el = els.panelRight;
    el.classList.remove("hidden");
    header(el, "Equipment & pack", "right");
    el.appendChild(textNode("div", vendorCtx ? "manage-eyebrow selling-mode" : "manage-eyebrow", vendorCtx ? "Trading · Right-click pack items to sell" : p.cls.name + " · " + p.name));
    const eq = document.createElement("div"); eq.id = "equipwrap";
    for (const [slot, L] of Object.entries(EQ_LAYOUT)) {
      const s = document.createElement("div"); s.className = "eqslot";
      const slotLabel = {main:"Main hand",off:"Off hand",ring1:"Ring I",ring2:"Ring II"}[slot] || slot;
      s.dataset.label = slotLabel; s.setAttribute("aria-label",slotLabel);
      s.style.left = L[0] + "px"; s.style.top = L[1] + "px";
      s.style.width = L[2] * CELL + "px"; s.style.height = L[3] * CELL + "px";
      const it = p.equip[slot];
      if (it) {
        const d = document.createElement("div");
        d.className = `invitem r-${it.rarity}`;d.dataset.itemId=it._coopId||it.uid||'';d.tabIndex=0;d.setAttribute('aria-label',slotLabel+': '+itemName(it));
        d.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();if(typeof MobileShell!=='undefined'&&MobileShell.enabled)d.click();else unequipSlot(slot,it);}});
        d.style.left = "0"; d.style.top = "0"; d.style.width = "100%"; d.style.height = "100%";
        const icon = SpriteAssets.itemIcon(it);
        icon.style.width = "100%"; icon.style.height = "100%"; icon.style.objectFit = "contain";
        d.appendChild(icon);
        d.addEventListener("mouseenter", () => { const r = s.getBoundingClientRect(); showItemTooltip(it, r.left + r.width / 2, r.top, "equip"); });
        d.addEventListener("mouseleave", hideTooltip);
        d.addEventListener("click", async e => {
          e.stopPropagation();
          if(typeof MobileControls!=='undefined'&&MobileControls.enabled&&!cursorItem)return openTouchItemMenu(slot,it,'equip',e);
          if(coopItems()){
            if(cursorItem&&['glyph','jewel'].includes(cursorItem.kind))return InventoryActions.submit({type:'socket',itemId:it._coopId,socketId:cursorItem._coopId});
            if(cursorItem)return InventoryActions.submit({type:'equip',itemId:cursorItem._coopId,slot});
            return carryEquipment(slot,it);
          }
          if (cursorItem) {
            if ((cursorItem.kind === "glyph" || cursorItem.kind === "jewel") && it.sockets) {
              const glyphName = cursorItem.name;
              const seated = Items.socketGlyph(it, cursorItem);
              if (seated) {
                setCursorItem(null);
                Sfx.play("forge");
                if (seated.combo) {
                  Sfx.play("dropUnique");
                  msg(`The glyphs align — ${it.name}!`, "#d8924a");
                  Game.centerMsg(seated.combo.name.toUpperCase(), "a named work, bound in glyphs");
                } else msg(`Seated ${glyphName} in ${it.name}.`, "#7fd8c0");
                p.computeStats();
                refreshGrids(); refreshHUD();
              } else msg("No empty socket left.", "#c08080");
            }
            return;
          }
          const nextEquip = Object.assign({}, p.equip); delete nextEquip[slot];
          const prepared = await prepareEquipmentChange(nextEquip);
          if (!prepared) return;
          if (p.equip[slot] !== it || cursorItem) {
            Game.discardPlayerEquipment(prepared);
            return;
          }
          delete p.equip[slot];
          Game.commitPlayerEquipment(prepared);
          p.computeStats();
          setCursorItem(it);
          refreshGrids(); refreshHUD();
        });
        d.addEventListener("contextmenu", async e => {
          e.preventDefault(); e.stopPropagation();
          if(coopItems())return unequipSlot(slot,it);
          const nextEquip = Object.assign({}, p.equip); delete nextEquip[slot];
          const prepared = await prepareEquipmentChange(nextEquip);
          if (!prepared) return;
          if (p.equip[slot] !== it) {
            Game.discardPlayerEquipment(prepared);
            return;
          }
          delete p.equip[slot];
          if (!Items.autoPlace(p.inv, it)) {
            p.equip[slot] = it;
            Game.discardPlayerEquipment(prepared);
            msg("No room in your pack.", "#c08080");
          }
          else Game.commitPlayerEquipment(prepared);
          p.computeStats();
          refreshGrids(); refreshHUD();
        });
        s.appendChild(d);
      } else {
        const ph = document.createElement("div"); ph.className = "ph"; ph.textContent = slot.replace(/[0-9]/g, "");
        s.appendChild(ph);
        s.addEventListener("click", async () => {
          if (!cursorItem || cursorItem.kind !== "gear") return;
          if(coopItems())return InventoryActions.submit({type:'equip',itemId:cursorItem._coopId,slot});
          const equipping = cursorItem;
          const slots = Items.slotFor(equipping);
          if (!slots.includes(slot)) return;
          if (!Items.canEquip(p, equipping)) { msg("You cannot equip that yet.", "#c08080"); return; }
          if (equipping.twoHand && p.equip.off) { msg("Unequip your off hand first.", "#c08080"); return; }
          if (slot === "off" && p.equip.main && p.equip.main.twoHand) { msg("Your weapon needs both hands.", "#c08080"); return; }
          const nextEquip = Object.assign({}, p.equip); nextEquip[slot] = equipping;
          const prepared = await prepareEquipmentChange(nextEquip);
          if (!prepared) return;
          if (p.equip[slot] || cursorItem !== equipping) {
            Game.discardPlayerEquipment(prepared);
            return;
          }
          p.equip[slot] = equipping;
          Game.commitPlayerEquipment(prepared);
          setCursorItem(null);
          p.computeStats();
          Sfx.play("chest");
          refreshGrids(); refreshHUD();
        });
      }
      eq.appendChild(s);
    }
    el.appendChild(eq);
    const goldRow = document.createElement("div"); goldRow.id = "goldrow";
    goldRow.append(textNode("strong", "", U.fmt(p.gold) + " gold"), textNode("span", "", p.inv.items.reduce((n,i)=>n+i.w*i.h,0) + " / " + (p.inv.w*p.inv.h) + " cells"));
    el.appendChild(goldRow);
    const toolbar = textNode("div", "pack-toolbar");
    const search = document.createElement("input"); search.type = "search"; search.placeholder = "Find an item…"; search.value = inventoryQuery; search.setAttribute("aria-label","Find items in your pack");search.id="inventorySearch";
    const highlight = () => { for (const item of el.querySelectorAll('.invgrid .invitem')) { const match = !inventoryQuery || item.dataset.itemName.includes(inventoryQuery.toLowerCase()); item.classList.toggle("search-dim", !match); item.classList.toggle("search-match", !!inventoryQuery && match); } };
    search.addEventListener("input",()=>{inventoryQuery=search.value;highlight();});
    const tidy = actionButton("Tidy pack",()=>{ if (cursorItem) return; if(coopItems())return InventoryActions.submit({type:"tidy"}); if (!Items.tidy(p.inv)) msg("This arrangement cannot be tidied. Your items stayed in place.","#c08080"); else Sfx.play("pickup"); renderInventory(); }); tidy.id="inventoryTidy"; tidy.disabled=!!cursorItem;
    toolbar.append(search,tidy); el.appendChild(toolbar);
    renderGrid(el, p.inv, "inv"); highlight();
    const touchMode=typeof MobileControls !== "undefined" && MobileControls.enabled;
    el.appendChild(textNode("div", "pack-help", touchMode
      ? (vendorCtx ? "Tap a pack item to inspect it or sell it." : "Tap an item for details, equip or use. Choose Carry, then tap a slot to place it.")
      : vendorCtx ? "SELLING MODE · Right-click a pack item to sell it. Equipped items are not sold." : "Click to carry · Right-click / Enter to equip or use · Carry a jewel or glyph to a socket"));
  }

  /* ---------- character panel ---------- */
  function showCharacterTooltip(row) {
    characterTip = row;
    els.tooltip.classList.add("character-tooltip");
    els.tooltip.replaceChildren(textNode("div", "tt-name tt-rare", row.dataset.label),
      textNode("div", "tt-mod", row.dataset.value), textNode("div", "tt-base", row.dataset.help));
    els.tooltip.setAttribute("role", "tooltip");
    els.tooltipCmp.classList.add("hidden"); els.tooltip.classList.remove("hidden");
    const r = row.getBoundingClientRect();
    positionTip(els.tooltip, r.left + r.width / 2, r.top);
  }
  function characterEntries(p) {
    const entries=[], add=(id,type,label,extra={})=>entries.push({id,type,label,...extra});
    add("identity","identity",p.name);
    add("class","eyebrow",p.cls.name+" · Level "+p.lvl);
    add("level","stat","Level",{value:String(p.lvl),help:"Character level increases base Life, Aether and Attack Rating, unlocks talents and changes your chance to hit enemies of different levels."});
    add("xp","stat","Experience",{value:p.lvl>=DATA.MAX_LEVEL?"Maximum level":U.fmt(p.xp)+" / "+U.fmt(DATA.xpForLevel(p.lvl)),help:"Experience earned toward your next level. Enemy kills and quest rewards grant experience. At maximum level no further levels are gained."});
    const sections=CharacterSheet.sections(p,Game.state);
    function stats(section) {
      add("section-"+section.title,"heading",section.title,{note:section.title==="Attributes"?p.attrPts+" points available":""});
      for(const row of section.rows)add("stat-"+row.id,"stat",row.label,{...row,id:"stat-"+row.id,statId:row.id});
    }
    stats(sections[0]);
    add("section-damage","heading","Damage");
    add("damage-help","note","Non-critical damage before enemy defenses. Each total is for one hit or pulse on one enemy. Hover or focus a row for details.");
    for(const [slot,assigned,label] of [["basic","basic","Basic Attack"],["left",p.skillL,"LMB Skill"],["right",p.skillR,"RMB Skill"]]) {
      const preview=CharacterSheet.preview(p,assigned||"basic",Game.state), prefix="damage-"+slot;
      add(prefix,"attack",label+" · "+preview.name,{slot,skill:preview.id});
      for(const [i,part] of preview.parts.entries()) {
        const key=prefix+"-"+i;
        add(key+"-part","part",part.label,{note:part.basis});
        const elemKeys=[...CharacterSheet.coreElements,...Object.keys(part.hit).filter(k=>!CharacterSheet.coreElements.includes(k))];
        for(const elem of elemKeys) add(key+"-"+elem,"stat",CharacterSheet.elements[elem]+" Damage",{
          value:CharacterSheet.formatRange(part.hit[elem]),element:elem,help:"Non-critical "+CharacterSheet.elements[elem].toLowerCase()+" contribution, "+part.basis+", before enemy defenses. Zero means this hit has no immediate damage of this type. Damage over time is listed separately. "+part.notes.join(" ")});
        add(key+"-total","stat","Total Hit Damage",{value:CharacterSheet.formatRange(part.totalHit),total:true,help:"Sum of the unrounded immediate damage components, "+part.basis+". Excludes damage over time, enemy defenses, target-specific bonuses and random procs. Displayed values are rounded to two decimal places."});
        for(const [di,d] of part.dots.entries())add(key+"-dot-"+di,"stat",d.label+" · "+CharacterSheet.number(d.duration)+"s",{element:d.element,value:CharacterSheet.formatRange(d.range),help:d.help+" Total over "+CharacterSheet.number(d.duration)+"s, not damage per second."});
        if(part.dots.length||part.conditionalEffect)add(key+"-effect-total","stat","Total Including Damage over Time",{value:CharacterSheet.formatRange(part.totalEffect),total:true,help:part.conditionalEffect||"One immediate hit plus its listed effects lasting their full durations. Assumes the target survives and effects are not replaced. This is not damage per second or the sum of every pulse in a cast."});
        if(part.conditionalEffect)add(key+"-conditional","note",part.conditionalEffect);
      }
      for(const [i,n] of preview.notes.entries())add(prefix+"-note-"+i,"note",n);
    }
    for(const section of sections.slice(1))stats(section);
    if(p.buffs.length){
      add("section-effects","heading","Active Effects");
      const ids=new Map();
      for(const b of p.buffs){
        const base=b.id||b.label||"effect", n=ids.get(base)||0;ids.set(base,n+1);
        const effects=buffEffectLines(b).join(", "), time=b.until===Infinity||b.infinite?"Permanent":Math.max(0,Math.ceil(b.until-Game.state.time))+"s";
        add("effect-"+base+"-"+n,"stat",(b.emoji||"✦")+" "+(b.label||"Active effect"),{value:time,help:effects||"An ongoing skill or equipment effect. Its active stat bonuses are already included in the sheet."});
      }
    }
    return entries;
  }
  function renderCharacter() {
    const p=Game.state.player, el=els.panelLeft;
    characterRefreshAt=performance.now()+100;
    let body=el.querySelector(".character-sheet");
    if(!body){
      el.classList.remove("hidden"); header(el,"Character","left");
      body=textNode("div","character-sheet"); body.id="characterSheet"; el.appendChild(body);
      body.addEventListener("keydown",e=>{
        if([" ","Enter"].includes(e.key)&&!e.target.closest("button"))e.stopPropagation();
        if(e.key==="Escape"&&characterTip){hideTooltip();e.stopPropagation();}
      });
      // Assign instead of accumulating listeners when reopening the panel.
      el.onscroll=()=>{if(characterTip)hideTooltip();};
    }
    const rows=characterEntries(p), old=new Map([...body.children].map(n=>[n.dataset.rowKey,n]));
    const setText=(node,text)=>{if(node.textContent!==text)node.textContent=text;};
    const retained=new Set();let anchor=body.firstElementChild;
    for(const row of rows){
      let node=old.get(row.id);
      if(!node){
        const tag=row.type==="heading"?"h3":row.type==="attack"?"h4":"div";
        const cls={identity:"hero-identity",eyebrow:"manage-eyebrow",heading:"manage-section",attack:"damage-assignment",part:"damage-part",note:"character-note",stat:"statrow character-stat"}[row.type];
        node=textNode(tag,cls);node.dataset.rowKey=row.id;
        if(row.type==="stat"){
          node.tabIndex=0;
          node.append(textNode("span","stat-label"),textNode("span","v"),textNode("span","stat-help"));
          node.querySelector(".stat-help").id="help-"+row.id;
          node.setAttribute("aria-describedby","help-"+row.id);
          node.addEventListener("mouseenter",()=>showCharacterTooltip(node));
          node.addEventListener("focusin",()=>requestAnimationFrame(()=>{
            // Focusing an off-screen stat first scrolls it into view. Place its
            // help after that scroll, while later user scrolling still hides it.
            if(node.isConnected&&node.contains(document.activeElement))showCharacterTooltip(node);
          }));
          node.addEventListener("mouseleave",()=>{if(characterTip===node)hideTooltip();});
          node.addEventListener("focusout",e=>{if(!node.contains(e.relatedTarget)&&characterTip===node)hideTooltip();});
        }else if(["heading","part"].includes(row.type))node.append(textNode("span",""),textNode("small",""));
      }
      retained.add(node);
      if(row.type==="stat"){
        node.dataset.statId=row.statId||row.id;node.dataset.stat=row.label;
        const changed=node.dataset.label!==row.label||node.dataset.value!==row.value||node.dataset.help!==row.help;
        node.dataset.label=row.label;node.dataset.value=row.value;node.dataset.help=row.help;
        setText(node.querySelector(".stat-label"),row.label);setText(node.querySelector(".v"),row.value);
        setText(node.querySelector(".stat-help"),row.help);
        node.classList.toggle("damage-total",!!row.total);node.dataset.element=row.element||"";
        if(row.statId==="hitChance")node.querySelector(".v").id="statHit";
        if(row.attribute){
          let button=node.querySelector(".attrbtn");
          if(!button){
            button=actionButton("+",()=>{
              const hero=Game.state.player;if(hero.attrPts<=0)return;
              if(typeof Coop!=="undefined"&&Coop.active){Coop.submit({type:"attribute",attribute:row.attribute}).then(()=>{renderCharacter();refreshHUD();});return;}
              hero.attr[row.attribute]++;hero.attrPts--;hero.computeStats();renderCharacter();refreshHUD();
            },"attrbtn");button.setAttribute("aria-label","Increase "+row.label);node.appendChild(button);
          }
          // Keep the control in place when the last point is spent.
          button.disabled=p.attrPts<=0;
        }
        if(changed&&characterTip===node)showCharacterTooltip(node);
      }else if(["heading","part"].includes(row.type)){setText(node.firstElementChild,row.label);setText(node.lastElementChild,row.note||"");}
      else setText(node,row.label);
      if(row.slot){node.dataset.damageSlot=row.slot;node.dataset.skill=row.skill;}
      if(node===anchor)anchor=anchor.nextElementSibling;
      else body.insertBefore(node,anchor);
    }
    for(const node of old.values())if(!retained.has(node)){if(characterTip===node)hideTooltip();node.remove();}
  }

  /* ---------- skill tree panel ---------- */
  const perkPreview = new Map();
  function skillAvailability(p, sk) {
    const rank = p.skills[sk.id] || 0;
    const prerequisite = !sk.prereq || (p.skills[sk.prereq] || 0) > 0;
    return { rank, prerequisite, unlocked: p.lvl >= sk.reqLvl && prerequisite,
      learnable: rank < sk.maxRank && p.skillPts > 0 && p.lvl >= sk.reqLvl && prerequisite };
  }
  function renderSkills() {
    const p = Game.state.player, el = els.panelLeft;
    if (skillsClass !== p.classId) { skillsClass = p.classId; curTree = 0; selectedSkill = null; }
    el.classList.remove("hidden"); header(el, "TALENTS", "left"); el.classList.add("talent-panel");
    el.style.setProperty("--tree-accent", SkillIcons.theme(p.classId, curTree).color);
    el.querySelector(".ptitle").innerHTML = `<span class="talent-eyebrow">CLASS DISCIPLINES</span><span class="talent-class">${p.cls.name}</span>`;
    const wallet = document.createElement("div"); wallet.className = "talent-wallet";
    wallet.innerHTML = `<strong>${p.skillPts}</strong><span>talent point${p.skillPts === 1 ? "" : "s"}<small>Level ${p.lvl}</small></span>`; el.appendChild(wallet);
    const tabs = document.createElement("div"); tabs.id = "treeTabs"; tabs.setAttribute("role", "tablist"); tabs.setAttribute("aria-label", "Class disciplines");
    p.cls.trees.forEach((name, i) => {
      const branch = Object.values(DATA.SKILLS).filter(s => s.cls === p.classId && s.tree === i);
      const spent = branch.reduce((sum, sk) => sum + (p.skills[sk.id] || 0), 0);
      const t = document.createElement("button"); t.type = "button"; t.className = "treetab" + (i === curTree ? " on" : "");
      t.style.setProperty("--branch-accent", SkillIcons.theme(p.classId, i).color);
      t.id = "discipline-" + i; t.setAttribute("role", "tab"); t.setAttribute("aria-selected", String(i === curTree));
      t.setAttribute("aria-controls", "talentBody"); t.tabIndex = i === curTree ? 0 : -1;
      t.innerHTML = `<span>${name}</span><small>${spent} invested</small>`;
      t.addEventListener("click", () => { curTree = i; selectedSkill = null; hideTooltip(); renderSkills(); $("discipline-" + i).focus(); });
      t.addEventListener("keydown", e => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
        e.preventDefault(); const next = e.key === "Home" ? 0 : e.key === "End" ? 2 : (i + (e.key === "ArrowRight" ? 1 : 2)) % 3;
        curTree = next; selectedSkill = null; renderSkills(); $("discipline-" + next).focus();
      }); tabs.appendChild(t);
    }); el.appendChild(tabs);
    const intro = document.createElement("p"); intro.className = "discipline-intro"; intro.textContent = SkillIcons.theme(p.classId, curTree).description; el.appendChild(intro);
    const pending=SkillPerks.pending(p);
    const perkSummary=document.createElement("button"); perkSummary.type="button"; perkSummary.className="perk-pending-summary"; perkSummary.disabled=!pending;
    perkSummary.textContent=pending ? `◆ ${pending} perk choice${pending===1?"":"s"} available · Find next` : "Skill perks unlock at invested ranks 5 and 10";
    perkSummary.addEventListener("click",()=>{
      const ready=Object.values(DATA.SKILLS).filter(sk=>SkillPerks.pending(p,sk.id)>0);
      const sk=ready[(ready.findIndex(sk=>sk.id===selectedSkill)+1)%ready.length];
      if(!sk)return;selectedSkill=sk.id;curTree=sk.tree;renderSkills();
      el.querySelector('.skill-perk-tier.available .perk-option[aria-pressed="true"]')?.focus();
    });el.appendChild(perkSummary);
    const body = document.createElement("div"); body.id = "talentBody"; body.setAttribute("role", "tabpanel"); body.setAttribute("aria-labelledby", "discipline-" + curTree);
    const board = document.createElement("div"); board.className = "talent-board";
    const nodes = Object.values(DATA.SKILLS).filter(s => s.tree === curTree && s.cls === p.classId);
    if (!nodes.some(sk => sk.id === selectedSkill)) selectedSkill = nodes[0].id;
    const maxRow = Math.max(...nodes.map(s => s.pos[1])), rows = maxRow + 1;
    board.style.setProperty("--tree-rows", rows);
    const levels = document.createElement("div"); levels.className = "talent-tiers";
    for (let row = 0; row < rows; row++) {
      const req = Math.min(...nodes.filter(sk => sk.pos[1] === row).map(sk => sk.reqLvl));
      const label = document.createElement("div"); label.className = "talent-tier" + (p.lvl >= req ? " unlocked" : "");
      label.innerHTML = `<span>LV</span><strong>${req}</strong>`; levels.appendChild(label);
    } board.appendChild(levels);
    const area = document.createElement("div"); area.id = "treeArea";
    const wires = document.createElementNS("http://www.w3.org/2000/svg", "svg"); wires.classList.add("talent-wires");
    wires.setAttribute("viewBox", `0 0 300 ${rows * 100}`); wires.setAttribute("preserveAspectRatio", "none"); wires.setAttribute("aria-hidden", "true");
    for (const sk of nodes) {
      const pre = DATA.SKILLS[sk.prereq]; if (!pre || pre.tree !== curTree) continue;
      const x1 = pre.pos[0] * 100 + 50, y1 = pre.pos[1] * 100 + 50, x2 = sk.pos[0] * 100 + 50, y2 = sk.pos[1] * 100 + 50;
      const wire = document.createElementNS("http://www.w3.org/2000/svg", "path");
      wire.setAttribute("d", `M${x1} ${y1}V${(y1 + y2) / 2}H${x2}V${y2}`);
      wire.setAttribute("class", p.skills[pre.id] > 0 ? "lit" : ""); wires.appendChild(wire);
    } area.appendChild(wires);
    const details = document.createElement("section"); details.id = "skillDetail"; details.setAttribute("aria-label", "Selected skill");
    for (const sk of nodes) {
      const status = skillAvailability(p, sk), bonus = status.rank > 0 ? Math.max(0, p.effRank(sk.id) - status.rank) : 0;
      const n = document.createElement("button"); n.type = "button"; n.dataset.skill = sk.id;
      n.className = "talent-node" + (!status.unlocked && !status.rank ? " locked" : "") + (status.rank ? " learned" : "") + (status.learnable ? " available" : "") + (status.rank >= sk.maxRank ? " maxed" : "");
      n.style.gridColumn = sk.pos[0] + 1; n.style.gridRow = sk.pos[1] + 1;
      n.setAttribute("aria-pressed", String(selectedSkill === sk.id));
      n.setAttribute("aria-label", `${sk.name}, ${SkillIcons.describe(sk).role}, rank ${status.rank} of ${sk.maxRank}${status.unlocked ? "" : ", locked"}`);
      n.appendChild(SkillIcons.create(sk, 46));
      const name = document.createElement("span"); name.className = "talent-node-name"; name.textContent = sk.name; n.appendChild(name);
      if(typeof MobileShell!=='undefined'&&MobileShell.enabled){const tier=textNode('small','phone-tier-label','Tier '+(sk.pos[1]+1)+' · Level '+sk.reqLvl+(sk.prereq?' · Requires '+DATA.SKILLS[sk.prereq].name:''));name.append(tier);}
      const rank = document.createElement("span"); rank.className = "talent-node-rank";
      rank.innerHTML = `<b>${status.rank}</b><span> / ${sk.maxRank}</span>${bonus ? `<em>+${bonus}</em>` : ""}`;
      if (bonus) rank.title = `${status.rank} invested + ${bonus} from equipment`; n.appendChild(rank);
      if (sk.type === "passive") { const tag = document.createElement("span"); tag.className = "passive-dot"; tag.textContent = "P"; tag.title = "Passive skill"; n.appendChild(tag); }
      const pending=SkillPerks.pending(p,sk.id);
      if(pending){const badge=document.createElement("span");badge.className="perk-ready-badge";badge.textContent="◆";badge.title=`${pending} perk choice${pending===1?"":"s"} available`;n.appendChild(badge);n.classList.add("perk-ready");n.setAttribute("aria-label",n.getAttribute("aria-label")+`, ${pending} perk choices available`);}
      n.addEventListener("click", () => {
        selectedSkill = sk.id;
        for (const node of area.querySelectorAll(".talent-node")) node.setAttribute("aria-pressed", String(node.dataset.skill === selectedSkill));
        renderSkillDetail(details, p, sk); hideTooltip();if(typeof MobileViews!=='undefined')MobileViews.detail(el);
      }); area.appendChild(n);
    }
    board.appendChild(area);
    const legend = document.createElement("div"); legend.className = "talent-legend";
    legend.innerHTML = '<span><i class="known"></i>Learned</span><span><i class="ready"></i>Can upgrade</span><span><i></i>Locked</span><span>P · Passive</span>';
    board.appendChild(legend); body.append(board, details); el.appendChild(body);
    renderSkillDetail(details, p, DATA.SKILLS[selectedSkill]);
    const help = document.createElement("div"); help.className = "talent-footer";
    help.innerHTML = '<span>Select a skill to inspect it. Upgrading costs 1 point.</span><span><kbd>T</kbd> or <kbd>Esc</kbd> close</span>'; el.appendChild(help);
    const announcement = document.createElement("div"); announcement.id = "skillAnnouncement"; announcement.className = "sr-only"; announcement.setAttribute("role", "status"); el.appendChild(announcement);
  }
  function renderSkillDetail(el, p, sk) {
    sk=p.resolveSkill(sk.id);
    const status = skillAvailability(p, sk), info = SkillIcons.describe(sk);
    const eff = status.rank ? p.effRank(sk.id) : 1, bonus = status.rank ? Math.max(0, eff - status.rank) : 0;
    el.innerHTML = ""; el.style.setProperty("--skill-accent", info.color);
    const heading = document.createElement("div"); heading.className = "skill-detail-heading"; heading.appendChild(SkillIcons.create(sk, 64));
    const title = document.createElement("div"); title.innerHTML = `<span class="skill-role">${info.role}</span><h2>${sk.name}</h2><span class="skill-rank">Rank ${status.rank} / ${sk.maxRank}${bonus ? ` <em>+${bonus} from gear</em>` : ""}</span>`;
    heading.appendChild(title); el.appendChild(heading);
    const stats = document.createElement("div"); stats.className = "skill-facts";
    if (sk.mana) stats.innerHTML += `<span><b>${Number(sk.mana(eff)).toFixed(1).replace(/\.0$/, "")}</b> aether</span>`;
    if (["summon","summon_golem"].includes(sk.type)) stats.innerHTML += `<span><b>${sk.upkeep(eff)}/s</b> per companion · dies at zero aether</span>`;
    if (sk.requiredWeapons) stats.innerHTML += `<span class="${p.canUseSkillWeapon(sk.id)?"":"unmet"}">Bow or crossbow required</span>`;
    if (sk.cd) stats.innerHTML += `<span><b>${Number(sk.cd(eff)).toFixed(1).replace(/\.0$/, "")}s</b> cooldown</span>`;
    stats.innerHTML += `<span><b>${sk.reqLvl}</b> level required</span>`; el.appendChild(stats);
    const desc = document.createElement("div"); desc.className = "skill-description";
    desc.innerHTML = `<h3>${status.rank ? "Current effect" : "First rank"}</h3><p>${sk.desc(eff)}</p>`;
    if (status.rank > 0 && status.rank < sk.maxRank) desc.innerHTML += `<div class="skill-next"><h3>Next rank</h3><p>${sk.desc(eff + 1)}</p></div>`;
    el.appendChild(desc);
    const requirements = document.createElement("div"); requirements.className = "skill-requirements";
    if (sk.prereq) {
      const req = document.createElement("button"); req.type = "button"; req.className = status.prerequisite ? "met" : "unmet";
      req.textContent = `${status.prerequisite ? "✓" : "◇"} Requires ${DATA.SKILLS[sk.prereq].name} · Rank 1`;
      req.addEventListener("click", () => { selectedSkill = sk.prereq; curTree = DATA.SKILLS[sk.prereq].tree; renderSkills(); }); requirements.appendChild(req);
    }
    if (p.lvl < sk.reqLvl) { const req = document.createElement("p"); req.className = "unmet"; req.textContent = `Reach character level ${sk.reqLvl} to unlock.`; requirements.appendChild(req); }
    el.appendChild(requirements);
    const learn = document.createElement("button"); learn.type = "button"; learn.className = "skill-learn"; learn.dataset.learnSkill = sk.id;
    learn.disabled = !status.learnable;
    learn.textContent = status.rank >= sk.maxRank ? "Maximum rank reached" : !status.unlocked ? "Requirements not met" : p.skillPts <= 0 ? "No talent points available" : `${status.rank ? "Upgrade to rank " + (status.rank + 1) : "Learn skill"}  ·  1 point`;
    learn.addEventListener("click", () => {
      const fresh = skillAvailability(p, sk); if (!fresh.learnable) return;
      if(typeof Coop!=="undefined"&&Coop.active){Coop.submit({type:"learn",skill:sk.id}).then(()=>{renderSkills();refreshHUD();});return;}
      p.skills[sk.id] = fresh.rank + 1; p.skillPts--; p.computeStats();
      if (sk.type !== "passive" && fresh.rank === 0) { if (p.skillR === "basic") p.skillR = sk.id; autoBindQuick(p, sk.id); }
      Sfx.play("skillup"); renderSkills(); refreshHUD();
      $("skillAnnouncement").textContent = `${sk.name} upgraded to rank ${p.skills[sk.id]}. ${p.skillPts} talent points remain.`;
      if(SkillPerks.pending(p,sk.id))$("skillAnnouncement").textContent+=" A perk choice is available.";
      const button = els.panelLeft.querySelector(".skill-learn"); if (!button.disabled) button.focus();
      else els.panelLeft.querySelector(`.talent-node[data-skill="${sk.id}"]`).focus();
    }); el.appendChild(learn);
    renderSkillPerks(el,p,sk);
    if (status.rank && sk.type !== "passive") {
      const binds = document.createElement("div"); binds.className = "skill-bindings"; binds.innerHTML = '<h3>Assign to combat</h3>';
      const row = document.createElement("div"); row.className = "skill-binding-row";
      ["LMB", "RMB", "F1", "F2", "F3", "F4"].forEach((key, i) => {
        const active = i < 2 ? p[i === 0 ? "skillL" : "skillR"] === sk.id : p.quickSlots[i - 2] === sk.id;
        const b = document.createElement("button"); b.type = "button"; b.textContent = key; b.className = active ? "bound" : "";
        if(typeof MobileShell!=='undefined'&&MobileShell.enabled){b.textContent=i===0?'Attack':i===1?'Secondary':'Skill '+(i-1);b.hidden=i===1;}
        b.setAttribute("aria-label", `Assign ${sk.name} to ${key}`); b.setAttribute("aria-pressed", String(active));
        b.addEventListener("click", () => { if(typeof Coop!=="undefined"&&Coop.active){Coop.submit({type:"bind",slot:i<2?(i===0?"L":"R"):i-2,skill:sk.id}).then(()=>{refreshHUD();renderSkills();});return;} if (i < 2) p[i === 0 ? "skillL" : "skillR"] = sk.id; else p.quickSlots[i - 2] = sk.id;
           refreshHUD(); renderSkillDetail(el, p, sk); el.querySelectorAll(".skill-binding-row button")[i].focus(); }); row.appendChild(b);
      }); binds.appendChild(row); el.appendChild(binds);
    } else if (sk.type === "passive") { const note = document.createElement("p"); note.className = "skill-passive-note"; note.textContent = "Always active once learned. No hotkey needed."; el.appendChild(note); }
    if (sk.synergy) {
      const synergy = document.createElement("div"); synergy.className = "skill-synergies";
      for (const [id, per] of Object.entries(sk.synergy)) if (per > 0) { const line = document.createElement("p"); line.textContent = `+${Math.round(per * 100)}% damage per rank of ${DATA.SKILLS[id].name}`; synergy.appendChild(line); }
      el.appendChild(synergy);
    }
    if (sk.flavor) { const flavor = document.createElement("p"); flavor.className = "skill-flavor"; flavor.textContent = sk.flavor; el.appendChild(flavor); }
  }

  function renderSkillPerks(el,p,sk) {
    const section=document.createElement("section");section.className="skill-perks";section.setAttribute("aria-label",`${sk.name} perks`);
    const heading=document.createElement("h3");heading.textContent="Skill perks";section.appendChild(heading);
    const help=document.createElement("p");help.className="perk-help";help.textContent="Pick one free perk at each milestone. Both picks stack. Changing a pick requires a talent reset.";section.appendChild(help);
    for(const tier of SkillPerks.tiers){
      const options=SkillPerks.catalog[sk.id][tier], saved=p.skillPerks?.[sk.id]?.[tier];
      const chosen=options.find(o=>o.id===saved), unlocked=(p.skills[sk.id]||0)>=tier;
      const key=sk.id+":"+tier, previewId=perkPreview.get(key);
      let preview=options.find(o=>o.id===previewId)||chosen||options[0];
      const box=document.createElement("div");box.className="skill-perk-tier "+(chosen?"selected":unlocked?"available":"locked");box.dataset.perkTier=tier;
      const title=document.createElement("h4");title.id=`perk-tier-${tier}`;title.textContent=`Rank ${tier} · ${chosen?"Chosen":unlocked?"Choose one":"Locked"}`;box.appendChild(title);
      const list=document.createElement("div");list.className="perk-options";list.setAttribute("role","group");list.setAttribute("aria-labelledby",title.id);
      const detail=document.createElement("p");detail.className="perk-description";detail.id=`perk-detail-${tier}`;
      const choose=document.createElement("button");choose.type="button";choose.className="perk-choose";
      function refreshPreview(){
        for(const b of list.children)b.setAttribute("aria-pressed",String(b.dataset.perk===preview.id));
        detail.textContent=preview.description;
        choose.disabled=!unlocked||!!chosen;
        choose.textContent=chosen?`Selected: ${chosen.title}`:unlocked?`Choose perk: ${preview.title}`:`Requires invested rank ${tier}`;
        choose.setAttribute("aria-describedby",detail.id);
      }
      for(const opt of options){
        const button=document.createElement("button");button.type="button";button.className="perk-option";button.dataset.perk=opt.id;
        button.textContent=(chosen?.id===opt.id?"✓ ":"")+opt.title;
        button.setAttribute("aria-label",`Inspect ${opt.title}${chosen?.id===opt.id?", selected":""}`);
        button.setAttribute("aria-describedby",detail.id);
        button.addEventListener("click",()=>{preview=opt;perkPreview.set(key,opt.id);refreshPreview();});list.appendChild(button);
      }
      choose.addEventListener("click",()=>{
        if(typeof Coop!=="undefined"&&Coop.active){Coop.submit({type:"perk",skill:sk.id,tier,perk:preview.id}).then(()=>{renderSkills();refreshHUD();});return;}
        if(!p.chooseSkillPerk(sk.id,tier,preview.id))return;
        const scroll=el.scrollTop;Game.saveGame();Sfx.play("skillup");renderSkills();refreshHUD();
        $("skillDetail").scrollTop=scroll;
        $("skillDetail").querySelector(`[data-perk="${preview.id}"]`)?.focus({preventScroll:true});
        $("skillAnnouncement").textContent=`${preview.title} selected for ${sk.name} at rank ${tier}.`;
      });
      box.append(list,detail,choose);refreshPreview();section.appendChild(box);
    }
    el.appendChild(section);
  }


  /* ---------- quest log ---------- */
  let questUiAct = null, questUiSel = null;
  function giverName(q) {
    if (DATA.NPCS[q.giver]) return DATA.NPCS[q.giver].name;
    return q.giver === "board" ? "the notice board" : "the one who set it";
  }
  function questState(q, st) {
    if (!st) return { key: "locked", cls: "locked", glyph: "·", label: "Not yet undertaken" };
    if (st.state === "done") return { key: "done", cls: "done", glyph: "✓", label: "Completed" };
    if (st.state === "reward") return { key: "active", cls: "active", glyph: "◆", label: "Turn in — return to " + giverName(q) };
    if (st.state === "active") {
      let prog = "";
      if (q.objectives) {
        const goals=DATA.CAMPAIGN.objectives(q), done=goals.filter(o=>DATA.CAMPAIGN.count(Game.state,o)>=(o.count||1)).length;
        prog=` (${done}/${goals.length} objectives)`;
      } else if (q.type === "kills" || q.type === "rescue") prog = ` (${st.count || 0}/${q.target})`;
      else if (q.type === "beacons") prog = st.trioSpawned ? ` (Oathsworn ${(st.trioKilled || []).length}/3)` : ` (beacons ${st.beacons || 0}/3)`;
      else if (q.type === "ritual") prog = st.siteDestroyed ? (q.boss ? " (slay the Choirmaster)" : " (ritual destroyed)") : " (destroy the ritual site)";
      return { key: "active", cls: "active", glyph: "◆", label: "Active" + prog };
    }
    if (st.state === "offered") return { key: "avail", cls: "avail", glyph: "•", label: "Available — seek " + giverName(q) };
    return { key: "locked", cls: "locked", glyph: "·", label: "Not yet undertaken" };
  }
  function questObjective(q, st) {
    if (st?.state === "done") return "Completed";
    if (q.objectives) return DATA.CAMPAIGN.objectives(q).map(o=>{
      const n=DATA.CAMPAIGN.count(Game.state,o), total=o.count||1;
      return `${n>=total?"✓":"○"} ${o.label}${total>1?` (${n}/${total})`:""}`;
    }).join("\n");
    if (q.type === "kills") return `Defeat enemies: ${st?.count || 0} / ${q.target}`;
    if (q.type === "rescue") return `Rescue survivors: ${st?.count || 0} / ${q.target}`;
    if (q.type === "beacons") return st?.trioSpawned ? `Defeat the Oathsworn: ${(st.trioKilled || []).length} / 3` : `Light the beacons: ${st?.beacons || 0} / 3`;
    if (q.type === "ritual") return st?.siteDestroyed ? (q.boss ? "Defeat the Choirmaster" : "Ritual destroyed") : "Destroy the ritual site";
    if (q.type === "killBoss") return "Defeat " + (DATA.MONSTERS?.[q.target]?.name || DATA.ENEMIES?.[q.target]?.name || q.name);
    return "Follow the quest brief in " + (DATA.ZONES[q.zone]?.name || "this region") + ".";
  }
  function renderQuests() {
    resetManagementState();
    const el = els.panelLeft;
    el.classList.remove("hidden");
    header(el, "Quest journal", "left");
    const qs = Game.state.quests, acts = DATA.QUEST_ACTS;
    const qById = {}; for (const q of DATA.QUESTS) qById[q.id] = q;

    /* default the open act to whichever one you're actively pursuing */
    if (questUiAct == null || !acts.some(a => a.rn === questUiAct)) {
      let found = null, offered = null;
      for (const a of acts) for (const qid of a.quests) {
        const s = qs[qid]; if (!s) continue;
        if ((s.state === "active" || s.state === "reward") && !found) found = a.rn;
        if (s.state === "offered" && !offered) offered = a.rn;
      }
      questUiAct = found || offered || acts[0].rn;
    }
    const act = acts.find(a => a.rn === questUiAct) || acts[0];

    /* act tabs — each shows done/total and a ◆ if it holds an active quest */
    const tabs = document.createElement("div"); tabs.className = "qacts";
    for (const a of acts) {
      const total = a.quests.length;
      const done = a.quests.filter(qid => qs[qid] && qs[qid].state === "done").length;
      const hasActive = a.quests.some(qid => qs[qid] && (qs[qid].state === "active" || qs[qid].state === "reward"));
      const t = document.createElement("button"); t.type="button"; t.setAttribute("aria-pressed",String(a.rn === questUiAct));
      t.className = "qtab" + (a.rn === questUiAct ? " sel" : "");
      t.innerHTML = `${a.optional ? "✦" : a.rn}<small>${hasActive ? "◆ " : ""}${done}/${total}</small>`;
      t.title = a.name;
      t.addEventListener("click", () => { questUiAct = a.rn; questUiSel = null; renderQuests(); });
      tabs.appendChild(t);
    }
    el.appendChild(tabs);

    const ah = document.createElement("div"); ah.className = "qacthead";
    ah.textContent = (act.optional ? "" : "Act " + act.rn + " · ") + act.name;
    el.appendChild(ah);

    /* default selected quest: first active, else first seen, else first */
    el.appendChild(filterButtons([["all","All"],["active","Active"],["avail","Available"],["done","Completed"]],questFilter,id=>{questFilter=id;renderQuests();}));
    const list = act.quests.map(qid => qById[qid]).filter(Boolean).filter(q=>questFilter === "all" || questState(q,qs[q.id]).key === questFilter);
    if (!questUiSel || !list.some(q=>q.id === questUiSel)) {
      const pick = list.find(q => { const s = qs[q.id]; return s && (s.state === "active" || s.state === "reward"); })
                || list.find(q => qs[q.id]) || list[0];
      questUiSel = pick ? pick.id : null;
    }

    const questBody = textNode("div", "quest-body"); el.appendChild(questBody);
    const ul = document.createElement("div"); ul.className = "qlist";
    for (const q of list) {
      const info = questState(q, qs[q.id]);
      const locked = info.key === "locked";
      const row = document.createElement("button"); row.type="button"; row.setAttribute("aria-pressed",String(q.id === questUiSel));
      row.className = "qrow " + info.cls + (q.id === questUiSel ? " sel" : "");
      row.innerHTML = `<span class="qg">${info.glyph}</span><span class="qn">${locked ? "Sealed Trial" : q.name}</span>`;
      row.addEventListener("click", () => { if(typeof MobileViews!=='undefined')MobileViews.detail(el);questUiSel = q.id; renderQuests(); });
      ul.appendChild(row);
    }
    if (!list.length) ul.appendChild(textNode("p","manage-empty","No quests in this category."));
    questBody.appendChild(ul);

    /* detail of the selected quest */
    const sel = qById[questUiSel];
    if (sel) {
      const st = qs[sel.id], info = questState(sel, st), locked = info.key === "locked";
      const col = info.cls === "done" ? "#caa44a" : info.cls === "active" ? "#7fd87f" : info.cls === "avail" ? "#9bb6d0" : "#6a6050";
      const det = document.createElement("div"); det.className = "qdetail";
      det.innerHTML = `<h3>${locked ? "Sealed Trial" : sel.name}</h3>` +
        `<p>${locked ? "This trial has not yet begun. Press on, and its tale will reveal itself." : ((st && st.state === "done") ? sel.done : sel.brief)}</p>` +
        `<div class="qst" style="color:${col}">${info.glyph} ${info.label}</div>`;
      if (!locked) {
        const objective = st?.state === "reward" ? "Return to " + giverName(sel) : questObjective(sel, st);
        det.appendChild(textNode("h4","manage-section","Objective"));
        const objectiveText=textNode("p","quest-objective",objective); objectiveText.style.whiteSpace="pre-line"; det.appendChild(objectiveText);
        const giver = sel.giver === "board" ? "Notice board" : giverName(sel);
        det.appendChild(textNode("p","quest-location","Given by: " + giver));
        det.appendChild(textNode("p","quest-location","Quest area: " + (DATA.ZONES[sel.zone]?.name || act.name)));
        const reward=sel.reward||{}, lines=[];
        if(reward.gold)lines.push(reward.gold+" gold"); if(reward.xp)lines.push(reward.xp+" experience");
        if(reward.skillPts)lines.push(reward.skillPts+" talent point"+(reward.skillPts>1?"s":""));
        if(reward.attrPts)lines.push(reward.attrPts+" attribute points"); if(reward.item)lines.push(reward.item.rarity+" equipment"); if(reward.glyph)lines.push("a glyph");
        if(lines.length){det.appendChild(textNode("h4","manage-section","Rewards"));det.appendChild(textNode("p","quest-rewards",lines.join(" · ")));}
      }
      questBody.appendChild(det);
    }

    const lg = document.createElement("div"); lg.className = "qlegend";
    lg.innerHTML = `<span style="color:#7fd87f">◆ Active</span><span style="color:#9bb6d0">• Available</span><span style="color:#caa44a">✓ Complete</span><span style="color:#5f574a">· Locked</span>`;
    el.appendChild(lg);
  }

  /* ---------- vendor ---------- */
  function openVendor(npcId) {
    Game.cancelMenuInput();
    closePanel("center"); closePanel("left");
    vendorCtx = {npcId, items: Game.state.vendorStock[npcId] || [], filter:"all", selected:null};
    openPanels.left = "vendor"; openPanels.right = "inv";
    renderVendor(); renderInventory();if(typeof MobileWorkspace!=='undefined')MobileWorkspace.select('left');
  }
  function shopCategory(it) { return it.kind !== "gear" ? "supplies" : it.slot === "main" ? "weapons" : ["ring","amulet"].includes(it.slot) ? "jewelry" : "armor"; }
  function renderVendor() {
    const v = vendorCtx; if (!v) return;
    const p = Game.state.player, el = els.panelLeft;
    el.classList.remove("hidden"); header(el, DATA.NPCS[v.npcId].name, "left");
    el.appendChild(textNode("div","manage-eyebrow","Weapons, wares & provisions"));
    const wallet = textNode("div","shop-wallet",U.fmt(p.gold) + " gold available"); el.appendChild(wallet);
    el.appendChild(filterButtons([["all","All"],["weapons","Weapons"],["armor","Armor"],["jewelry","Jewelry"],["supplies","Supplies"]],v.filter,id=>{v.filter=id;v.selected=null;renderVendor();}));
    const items = v.items.filter(it=>v.filter === "all" || shopCategory(it) === v.filter);
    if (!items.includes(v.selected)) v.selected = items[0] || null;
    const list = textNode("div","shop-list");
    for (const it of items) {
      const row = actionButton("",()=>{if(typeof MobileViews!=='undefined')MobileViews.detail(el);v.selected=it;renderVendor();},"shop-entry"); row.classList.toggle("selected",v.selected===it); row.setAttribute("aria-pressed",String(v.selected===it));
      row.style.setProperty("--rarity",Items.RARITY_COLOR[it.rarity] || "#aaa");
      row.appendChild(SpriteAssets.itemIcon(it));
      const labels=textNode("span","shop-entry-label");labels.appendChild(textNode("strong","",itemName(it)));
      labels.appendChild(textNode("small","",itemTypeLabel(it) + (it.kind === "gear" ? " · Level " + Items.effReqLvl(it) : "")));
      row.append(labels,textNode("span",p.gold<Items.value(it)?"shop-price unaffordable":"shop-price",Items.value(it)+" g"));list.appendChild(row);
    }
    if(!items.length)list.appendChild(textNode("p","manage-empty","No items in this category."));el.appendChild(list);
    const selected=v.selected;
    if(selected){
      const detail=textNode("div","shop-detail");detail.innerHTML=itemTooltipHTML(selected,"vendor");addItemPreview(detail,selected);el.appendChild(detail);
      if(selected.kind === "gear"){
        const slots=Items.slotFor(selected), equipped=slots.map(slot=>p.equip[slot]).filter(Boolean);
        for(const item of [...new Set(equipped)]){const compare=textNode("details","shop-compare");compare.appendChild(textNode("summary","","Compare equipped: "+itemName(item)));const body=textNode("div","");body.innerHTML=itemTooltipHTML(item,"equip");addItemPreview(body,item);compare.appendChild(body);el.appendChild(compare);}
        if(!Items.canEquip(p,selected))el.appendChild(textNode("p","manage-warning","You can buy this item, but cannot equip it yet."));
      }
      const price=Items.value(selected), room=Items.canAutoPlace(p.inv,selected);
      const buy=actionButton(p.gold<price?"Not enough gold":!room?"Pack is full":"Buy for "+price+" gold",()=>{
        if(vendorCtx!==v || !v.items.includes(selected) || p.gold<price || cursorItem)return;
        if(coopItems())return InventoryActions.submit({type:'buy',itemId:selected._coopId,npcId:v.npcId});
        const incoming=selected.kind === "consumable"?Items.makeConsumable(selected.baseId,selected.count):selected;
        if(!Items.canAutoPlace(p.inv,incoming)){msg("No room in your pack.","#c08080");renderVendor();return;}
        Items.autoPlace(p.inv,incoming);p.gold-=price;if(selected.kind!=="consumable")v.items.splice(v.items.indexOf(selected),1);
        Sfx.play("buy");refreshGrids();refreshHUD();
      },"manage-primary shop-buy"); buy.disabled=p.gold<price||!room||!!cursorItem; el.appendChild(buy);
    }
    el.appendChild(textNode("p","pack-help","Select an item to inspect it. Right-click an item in your pack to sell."));
    if(v.npcId === "maesa"){
      const un=p.inv.items.filter(i=>!i.identified);
      const identify=actionButton("Identify all · 60 gold",()=>{if(coopItems())return InventoryActions.submit({type:"identifyAll",npcId:v.npcId});const items=p.inv.items.filter(i=>!i.identified);if(!items.length||p.gold<60)return;p.gold-=60;items.forEach(i=>i.identified=true);Sfx.play("shrine");refreshGrids();refreshHUD();});
      identify.disabled=!un.length||p.gold<60;el.appendChild(identify);
    }
  }

  /* ---------- storage ---------- */
  function openStorage() {
    Game.cancelMenuInput();
    closePanel("center"); closePanel("left");
    openPanels.left = "storage";
    renderStorage();
    openPanels.right = "inv";
    renderInventory();if(typeof MobileWorkspace!=='undefined')MobileWorkspace.select('left');
  }
  function renderStorage() {
    const p = Game.state.player;
    const el = els.panelLeft;
    el.classList.remove("hidden");
    header(el, "STRONGBOX", "left");
    const hint = document.createElement("div");
    hint.style.cssText = "font-size:11px;color:#8a7a55;text-align:center;margin-bottom:6px";
    hint.textContent = "Stored items persist with this hero.";
    el.appendChild(hint);
    renderGrid(el, p.stash, "storage");
  }

  /* ---------- Forge Altar (crafting) ---------- */
  let forgeSlots = [null, null, null, null];
  function returnForgeItems() {
    if(!Game.state?.player){forgeSlots=[null,null,null,null];return;}
    if(coopItems()){forgeSlots=[null,null,null,null];return;}
    const p = Game.state.player;
    for (let i = 0; i < 4; i++) {
      const it = forgeSlots[i];
      if (!it) continue;
      if (!Items.autoPlace(p.inv, it)) Game.dropAtFeet(it);
      forgeSlots[i] = null;
    }
  }
  function openForge() {
    Game.cancelMenuInput();
    closePanel("center"); closePanel("left");
    openPanels.center = "forge"; openPanels.right = "inv";
    renderForge(); renderInventory();if(typeof MobileWorkspace!=='undefined')MobileWorkspace.select('center');
  }
  function renderForge() {
    if(coopItems())forgeSlots=Game.state.player.management?.offer||[null,null,null,null];
    const el=els.panelCenter;el.classList.remove("hidden");header(el,"Forge Altar","center");
    el.appendChild(textNode("div","manage-eyebrow","Old rites · New powers"));
    const recipes=textNode("div","recipe-list");
    for(const recipe of ForgeRecipes.recipes){const b=actionButton("",()=>{forgeRecipe=recipe.id;renderForge();},"recipe-choice");b.classList.toggle("selected",forgeRecipe===recipe.id);b.setAttribute("aria-pressed",String(forgeRecipe===recipe.id));b.append(textNode("strong","",recipe.name),textNode("small","",recipe.needs));recipes.appendChild(b);}el.appendChild(recipes);
    const recipe=ForgeRecipes.recipes.find(r=>r.id===forgeRecipe),check=ForgeRecipes.evaluate(forgeSlots,forgeRecipe);
    el.appendChild(textNode("h3","manage-section","Your offering"));
    const row=textNode("div","");row.id="forgeRow";
    for(let i=0;i<4;i++){
      const it=forgeSlots[i],slot=actionButton("",()=>{
        if(coopItems())return InventoryActions.submit({type:'offer',slot:i,itemId:Game.state.player.management?.carried?._coopId||null,expectedId:forgeSlots[i]?._coopId||null});
        if(cursorItem&&!forgeSlots[i]){forgeSlots[i]=cursorItem;setCursorItem(null);}
        else if(!cursorItem&&forgeSlots[i]){setCursorItem(forgeSlots[i]);forgeSlots[i]=null;}
        const match=ForgeRecipes.recipes.find(r=>ForgeRecipes.evaluate(forgeSlots,r.id).valid);if(match)forgeRecipe=match.id;
        Sfx.play("pickup");renderForge();
      },"fslot");slot.setAttribute("aria-label",it?itemName(it):"Material slot "+(i+1));
      if(it){slot.appendChild(SpriteAssets.itemIcon(it));if(it.count>1)slot.appendChild(textNode("span","stk",it.count));slot.addEventListener("mouseenter",()=>{const r=slot.getBoundingClientRect();showItemTooltip(it,r.right,r.top);});slot.addEventListener("mouseleave",hideTooltip);}
      else slot.appendChild(textNode("span","slot-number",String(i+1)));row.appendChild(slot);
    }el.appendChild(row);
    const needs=textNode("ul","recipe-requirements");for(const [valid,label] of check.requirements)needs.appendChild(textNode("li",valid?"met":"missing",(valid?"✓ ":"○ ")+label));el.appendChild(needs);
    el.appendChild(textNode("div","recipe-outcome",recipe.outcome));
    const status=textNode("p",check.valid?"forge-status ready":"forge-status",check.valid?"Offering ready. Strike when you are ready.":"Place the required materials from your pack into the offering slots.");status.setAttribute("role","status");el.appendChild(status);
    const strike=actionButton("Strike the anvil",tryTransmute,"manage-primary");strike.id="forgeCraft";strike.disabled=!check.valid;el.appendChild(strike);
    el.appendChild(textNode("p","pack-help","Click a material to carry it. Closing the altar returns your offering to your pack; overflow is placed at your feet."));
  }
  function tryTransmute() {
    if(coopItems())return InventoryActions.submit({type:'craft',recipe:forgeRecipe,items:forgeSlots.filter(Boolean).map(it=>it._coopId)});
    const check=ForgeRecipes.evaluate(forgeSlots,forgeRecipe);if(!check.valid)return;
    const {glyphs,gear,pots,total,upgrade}=check;let result,leftovers=[];
    if(forgeRecipe === "glyph")result=Items.reforgeGlyph(glyphs[0]);
    else if(forgeRecipe === "temper" || forgeRecipe === "reweave") {result=gear[0];Items.rollAffixesOnto(result,forgeRecipe === "temper"?"enhanced":"rare");result.identified=true;}
    else {result=Items.makeConsumable(upgrade,1);let remaining=total-3;while(remaining>0){const n=Math.min(10,remaining);leftovers.push(Items.makeConsumable(pots[0].baseId,n));remaining-=n;}}
    const outputs=[result,...leftovers];forgeSlots=[null,null,null,null];outputs.slice(0,4).forEach((it,i)=>forgeSlots[i]=it);
    for(const extra of outputs.slice(4))if(!Items.autoPlace(Game.state.player.inv,extra)){Game.dropAtFeet(extra);msg("Extra draughts were placed at your feet.","#d8b860");}
    Sfx.play("forge");msg("Forged: "+itemName(result),Items.RARITY_COLOR[result.rarity]);
    Game.addNova(Game.state.player.x,Game.state.player.y,1.2,"#ff9c50");renderForge();refreshGrids();refreshHUD();
  }

  /* ---------- NPC dialog: greet → topics / quest briefs → accept ---------- */
  function dialogQuestSummary(el, q) {
    const card = textNode("div", "dlgquest");
    card.append(textNode("div", "dlgkicker", "Quest"), textNode("h3", "", q.name));
    card.appendChild(textNode("p", "dlgobjective", questObjective(q, Game.state.quests[q.id])));
    const r = q.reward || {}, rewards = [];
    if (r.xp) rewards.push(r.xp + " experience"); if (r.gold) rewards.push(r.gold + " gold");
    if (r.skillPts) rewards.push(r.skillPts + " talent point" + (r.skillPts > 1 ? "s" : ""));
    if (r.attrPts) rewards.push(r.attrPts + " attribute points");
    if (r.item) rewards.push(r.item.rarity + " equipment"); if (r.glyph) rewards.push("a glyph");
    if (rewards.length) card.appendChild(textNode("p", "dlgrewards", "Rewards: " + rewards.join(" · ")));
    el.appendChild(card);
  }
  function dialogOptions(el, opts) {
    const choices = textNode("div", "dlgchoices"); choices.setAttribute("aria-label", "Conversation choices");
    for (const o of opts) choices.appendChild(actionButton(o.label, o.fn, "dlgopt" + (o.primary ? " dlgprimary" : "")));
    el.appendChild(choices);
    choices.querySelector("button")?.focus({ preventScroll: true });
  }
  function openDialog(npc) { if (vendorCtx) closePanel("left"); renderDialog(npc, { type: "greet" }); }
  function openOpeningDialog(npc) { renderDialog(npc, { type:"opening" }); }
  function renderDialog(npc, view) {
    const el = els.panelCenter;
    if (openPanels.center === "forge") closePanel("center");
    openPanels.center = "dialog";
    el.classList.remove("hidden");
    header(el, "CONVERSATION", "center");
    const def = npc.def;
    const name = document.createElement("div"); name.className = "dlgname"; name.textContent = def.name;
    el.appendChild(name);
    const text = document.createElement("div"); text.className = "dlgtext";
    el.appendChild(text);
    const opts = [];
    const say = line => { text.textContent = line; if (def.voice && !view.topic?.silent) Sfx.voice(def.voice, line); };

    if (view.type === "opening") {
      text.textContent = "The light spared you. It did not spare them.";
      const q = DATA.QUESTS.find(q=>q.id === "q7");
      dialogQuestSummary(el,q);
      opts.push({label:"I’ll find what walks the North",primary:true,fn:()=>closePanel("center")});
      opts.push({label:"Ask about the light",fn:()=>renderDialog(npc,{type:"greet",quiet:true})});
    } else if (view.type === "topic") {
      say(view.topic.a);
      Game.storyTopic(npc,view.topic);
      opts.push({ label: "Ask about something else", fn: () => renderDialog(npc, { type: "greet", quiet: true }) });
      opts.push({ label: "Farewell", fn: () => closePanel("center") });
    } else if (view.type === "quest") {
      const q = view.quest;
      say(q.brief);
      dialogQuestSummary(el, q);
      opts.push({ label: "✦ Take the task", primary: true, fn: () => { Game.acceptQuest(q.id); closePanel("center"); } });
      opts.push({ label: "Not now", fn: () => renderDialog(npc, { type: "greet", quiet: true }) });
    } else {
      const line = U.pick(def.greet);
      if (view.quiet) text.textContent = line; else say(line);
      /* quests this person has to give or reward */
      for (const q of DATA.QUESTS) {
        if (q.giver !== npc.id) continue;
        const st = Game.state.quests[q.id];
        if (st && st.state === "reward") {
          opts.push({ label: `✦ ${q.name} — claim reward`, primary: true, fn: () => {
            if (def.voice) Sfx.voice(def.voice, q.done);
            Game.completeQuest(q.id);
            closePanel("center");
          } });
        } else if (st && st.state === "offered") {
          opts.push({ label: `✦ ${q.name}`, primary: true, fn: () => renderDialog(npc, { type: "quest", quest: q }) });
        }
      }
      /* conversation topics */
      for (const topic of def.talk || []) {
        opts.push({ label: topic.q, fn: () => renderDialog(npc, { type: "topic", topic }) });
      }
      if (Game.canTradeWith(npc)) opts.push({ label: "Trade", fn: () => { closePanel("center"); openVendor(npc.id); } });
      opts.push({ label: "Farewell", fn: () => closePanel("center") });
    }
    dialogOptions(el, opts);
  }

  /* ---------- the notice board: quests pinned in parchment ---------- */
  function openBoard() {
    const el = els.panelCenter;
    if (openPanels.center === "forge") closePanel("center");
    openPanels.center = "dialog";
    el.classList.remove("hidden");
    header(el, "NOTICE BOARD", "center");
    const text = document.createElement("div"); text.className = "dlgtext";
    el.appendChild(text);
    const opts = [];
    let headline = "Weather-stained parchments flutter against the planks. Most are too faded to read.";
    for (const q of DATA.QUESTS) {
      if (q.giver !== "board") continue;
      const st = Game.state.quests[q.id];
      if (st && st.state === "reward") {
        headline = "Something heavy has been nailed beneath your notice.";
        opts.push({ label: `✦ ${q.name} — take what's owed`, fn: () => { Game.completeQuest(q.id); closePanel("center"); } });
      } else if (st && st.state === "offered") {
        headline = q.brief;
        opts.push({ label: `✦ Pull down the notice (accept: ${q.name})`, fn: () => { Game.acceptQuest(q.id); closePanel("center"); } });
      } else if (st && st.state === "active") {
        headline = "Your accepted notice is gone from the board. The job isn't.";
      }
    }
    text.textContent = headline;
    opts.push({ label: "Step away", fn: () => closePanel("center") });
    dialogOptions(el, opts);
  }

  /* ---------- shrine travel (waypoints, grouped by act) ---------- */
  function openShrine(asCaravan) {
    const el = els.panelCenter;
    if (openPanels.center === "forge") closePanel("center");
    if (vendorCtx) closePanel("left");
    openPanels.center = "shrine";
    el.classList.remove("hidden");
    el.classList.add("waypoint-panel");
    header(el, asCaravan ? "THE CARAVAN" : "THE WAYSTONES", "center");
    const here = Game.state.map.id;
    const groups = DATA.ACTS;
    const attuned=id=>(Game.state.shrines || []).includes(id);
    const initialDestination=g=>g.zones.find(id=>id===here)||g.zones.find(attuned)||g.zones[0];
    let currentAct=Math.max(0,groups.findIndex(g=>g.zones.includes(here))), selected=initialDestination(groups[currentAct]), pending=false;
    const intro=textNode("p","wp-intro",asCaravan?"Choose an attuned waystone. The caravan will take you there.":"Across the sundered world, the stones remember your passage.");el.appendChild(intro);
    const tabs=textNode("div","wp-tabs");tabs.setAttribute("role","tablist");tabs.setAttribute("aria-label","Travel region");el.appendChild(tabs);
    const body=textNode("div","wp-body");el.appendChild(body);
    const status=textNode("p","wp-status");status.setAttribute("role","status");el.appendChild(status);
    const render=()=>{
      tabs.replaceChildren();body.replaceChildren();
      groups.forEach((g,i)=>{
        const tab=textNode("button","wp-tab","Act "+g.rn);tab.type="button";tab.id="wp-tab-"+i;
        tab.setAttribute("role","tab");tab.setAttribute("aria-selected",String(i===currentAct));tab.setAttribute("aria-controls","wp-destinations");tab.tabIndex=i===currentAct?0:-1;tab.disabled=pending;
        tab.title=g.name;tab.addEventListener("click",()=>{currentAct=i;selected=initialDestination(g);render();document.getElementById(tab.id)?.focus();});
        tab.addEventListener("keydown",e=>{const next=e.key==="ArrowRight"?(i+1)%groups.length:e.key==="ArrowLeft"?(i+groups.length-1)%groups.length:e.key==="Home"?0:e.key==="End"?groups.length-1:null;if(next!==null){e.preventDefault();tabs.children[next].click();}});
        tabs.appendChild(tab);
      });
      const group=groups[currentAct],list=textNode("div","wp-destinations");list.id="wp-destinations";list.setAttribute("role","tabpanel");list.setAttribute("aria-labelledby","wp-tab-"+currentAct);body.appendChild(list);
      list.appendChild(textNode("h3","wp-region",group.name));
      for(const id of group.zones || []){
        const z=DATA.ZONES[id];if(!z || id==='frosthaven_approach')continue;
        const state=id===here?"Current location":attuned(id)?"Attuned":"Not attuned";
        const row=textNode("button","wp-destination"+(selected===id?" selected":"")+(!attuned(id)&&id!==here?" locked":""));row.type="button";row.disabled=pending;
        row.setAttribute("aria-pressed",String(selected===id));row.setAttribute("aria-label",z.name+", "+state);
        row.appendChild(textNode("span","wp-symbol",id===here?"◆":attuned(id)?"◇":"·"));
        const label=textNode("span","wp-destination-label",z.name);label.appendChild(textNode("small","",state));row.appendChild(label);
        row.addEventListener("click",()=>{selected=id;render();body.querySelector('.wp-destination.selected')?.focus();});
        row.addEventListener("keydown",e=>{if(!["ArrowUp","ArrowDown"].includes(e.key))return;e.preventDefault();const rows=[...list.querySelectorAll("button")],i=rows.indexOf(row);rows[(i+(e.key==="ArrowDown"?1:rows.length-1))%rows.length].click();});list.appendChild(row);
      }
      const z=DATA.ZONES[selected] || DATA.ZONES[group.zones[0]],detail=textNode("section","wp-detail");body.appendChild(detail);
      detail.appendChild(textNode("div","wp-sigil","◇"));detail.appendChild(textNode("p","wp-eyebrow",group.name));detail.appendChild(textNode("h2","",z.name));
      const types={camp:"Safe haven",town:"Safe haven",wild:"Wilderness",dungeon:"Dungeon"};
      detail.appendChild(textNode("p","wp-facts",`${types[z.kind]||"Frontier"} · Recommended level ${DATA.effectiveLevel(z.lvl,Game.state.difficulty)}`));
      detail.appendChild(textNode("p","wp-description",selected===here?"You stand beside this waystone.":attuned(selected)?"This stone knows your touch. The road is open.":"Find and attune this waystone in the world to unlock travel."));
      const travel=textNode("button","wp-travel",pending?"Opening the road…":"Travel to "+z.name);travel.type="button";travel.disabled=pending||selected===here||!attuned(selected);detail.appendChild(travel);
      travel.addEventListener("click",async()=>{
        if(pending)return;const destination=selected;pending=true;status.textContent="Opening the road…";render();
        let ok=false;try{ok=await Game.travelToShrine(destination);}catch(err){console.warn("Waystone travel failed",err);}
        if(!el.contains(status))return;
        pending=false;if(ok){closePanel("center");return;}status.textContent="The road could not be opened. Your location is unchanged. Try again.";render();body.querySelector('.wp-travel')?.focus();
      });
    };
    render();tabs.children[currentAct]?.focus();
  }

  /* ---------- skill picker ---------- */
  function openSkillPick(which) {
    Game.cancelMenuInput();
    const p = Game.state.player;
    const pick = els.skillPick;
    if (!pick.classList.contains("hidden") && pick.dataset.which === which) { pick.classList.add("hidden"); return; }
    pick.dataset.which = which;
    pick.innerHTML = "";
    hideTooltip();
    const caption = document.createElement("div"); caption.className = "picker-heading";
    caption.innerHTML = `<span>ASSIGN ${typeof MobileControls!=="undefined"&&MobileControls.enabled?(which==="L"?"ATTACK":which==="R"?"SECONDARY SKILL":"QUICK SKILL "+(+which.slice(1)+1)):which === "L" ? "LEFT MOUSE" : which === "R" ? "RIGHT MOUSE" : "F" + (+which.slice(1) + 1)}</span><small>Select a learned skill</small>`; pick.appendChild(caption);
    for (const id of learnedActives(p)) {
      const sk = id === "basic" ? DATA.BASIC_ATTACK : DATA.SKILLS[id];
      const d = document.createElement("button"); d.type = "button"; d.className = "pickopt";
      const ic = SkillIcons.create(sk, 40, p.equip.main?.cat);
      d.appendChild(ic);
      const name = document.createElement("span"); name.textContent = sk.name; d.appendChild(name);
      d.setAttribute("aria-label", "Assign " + sk.name);
      d.addEventListener("mouseenter", e => { const r = d.getBoundingClientRect(); showSkillTooltip(id, r.left + r.width / 2, r.top); });
      d.addEventListener("mouseleave", hideTooltip);
      d.addEventListener("click", async () => {
        if(coopItems()){if(!await InventoryActions.submit({type:"bind",slot:which[0]==="Q"?+which.slice(1):which,skill:id}))return;}
        else if (which === "L") p.skillL = id;
        else if (which === "R") p.skillR = id;
        else if (which[0] === "Q") p.quickSlots[+which.slice(1)] = id;   // assign to F-slot
        pick.classList.add("hidden");
        
        hideTooltip(); refreshHUD(); renderIfOpen("skills");
        if(typeof MobileShell!=='undefined'&&MobileShell.enabled)MobileWorkspace.pickerClosed();else (which === "L" ? els.skillL : which === "R" ? els.skillR : els.quickbar.children[+which.slice(1)]).focus();
      });
      pick.appendChild(d);
    }
    /* a "clear" chip for emptying an F-slot */
    if (which[0] === "Q") {
      const clr = document.createElement("button"); clr.type = "button"; clr.className = "pickopt pickclear"; clr.textContent = "Clear slot";
      clr.title = "Clear slot";
      clr.addEventListener("click", async () => { if(coopItems()){if(!await InventoryActions.submit({type:"bind",slot:+which.slice(1),skill:null}))return;}else p.quickSlots[+which.slice(1)] = null; pick.classList.add("hidden"); hideTooltip(); refreshHUD(); renderIfOpen("skills");if(typeof MobileShell!=='undefined'&&MobileShell.enabled)MobileWorkspace.pickerClosed(); });
      pick.appendChild(clr);
    }
    const back=actionButton("Back",()=>{pick.classList.add("hidden");hideTooltip();if(typeof MobileWorkspace!=='undefined')MobileWorkspace.pickerClosed();});back.classList.add('phone-picker-back');pick.prepend(back);
    pick.classList.remove("hidden");
    let btn = which === "L" ? els.skillL : which === "R" ? els.skillR
            : els.quickbar.children[+which.slice(1)] || els.quickbar;
    const r = btn.getBoundingClientRect();
    const pr = pick.getBoundingClientRect();
    pick.style.left = U.clamp(r.left + r.width / 2 - pr.width / 2, 8, innerWidth - pr.width - 8) + "px";
    pick.style.top = Math.max(8, r.top - pr.height - 14) + "px";
    pick.onkeydown = e => { if (e.key === "Escape") { e.stopPropagation(); pick.classList.add("hidden"); hideTooltip(); btn.focus(); } };
    pick.querySelector("button").focus();
  }

  /* ================================================== escape menu */
  let menuSession = null, menuScreen = "pause", menuBackAction = "Settings";
  function beginMenu(origin) {
    const el = els.escmenu;
    if (!menuSession) {
      menuSession = { origin, focus: document.activeElement, inert: new Map() };
      for (const sibling of el.parentElement.children) {
        menuSession.inert.set(sibling, sibling.inert);
        sibling.inert = sibling !== el;
      }
      Game.cancelMenuInput();
      hideTooltip();
      els.skillPick.classList.add("hidden");
    }
    el.dataset.menuOrigin = menuSession.origin;
    el.classList.remove("hidden");
    el.onkeydown = menuKeydown;
    el.onkeyup = e => e.stopPropagation();
  }
  function menuKeydown(e) {
    // Stop before dismissing: the same Escape/Space must never reach world input.
    e.stopPropagation();
    if (e.key === "Escape") {
      e.preventDefault();
      if (!e.repeat) menuBack();
      return;
    }
    if (["Alt", "F1", "F2", "F3", "F4"].includes(e.key)) e.preventDefault();
    if (e.key !== "Tab") return;
    const nodes = [...els.escmenu.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')]
      .filter(n => n.tabIndex >= 0 && n.getClientRects().length);
    const first = nodes[0], last = nodes.at(-1);
    if (!els.escmenu.contains(document.activeElement) || (e.shiftKey && document.activeElement === first)) {
      e.preventDefault(); (e.shiftKey ? last : first)?.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first?.focus();
    }
  }
  function menuBack() {
    if (menuSession?.origin === "title" || menuScreen === "pause") closeEsc();
    else {
      const action = menuBackAction;
      openEsc();
      [...els.escmenu.querySelectorAll("button")].find(b => b.dataset.menuAction === action)?.focus();
    }
  }
  function menuShell(kind, title, subtitle) {
    const box = textNode("section", "box menu-shell " + kind);
    box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-labelledby", "menuHeading");
    const head = textNode("header", "menu-header"), titles = textNode("div", "menu-titles");
    const heading = textNode("h2", "", title); heading.id = "menuHeading";
    titles.append(textNode("span", "menu-eyebrow", "EMBERGRAVE / " + (kind === "pause-menu" ? "JOURNEY PAUSED" : "YOUR EXPERIENCE")), heading, textNode("p", "menu-muted", subtitle));
    const close = actionButton("×", closeEsc, "menu-close"); close.setAttribute("aria-label", "Close menu");
    head.append(titles, close); box.append(head); els.escmenu.replaceChildren(box);
    return box;
  }
  function openEsc() {
    beginMenu("pause"); menuScreen = "pause";
    const box = menuShell("pause-menu", "A moment of respite", "Your journey will be here when you return.");
    const actions = textNode("div", "pause-actions"); box.append(actions);
    const mk = (label, fn) => {
      const b = actionButton(label, fn, "menu-button"); b.dataset.menuAction = label; actions.append(b); return b;
    };
    mk("Resume", () => closeEsc());
    mk("Controls", () => openSettings({ tab: "controls", origin: "pause" }));
    mk("Settings", () => openSettings({ origin: "pause" }));
    if(typeof MobileShell!=='undefined'&&MobileShell.enabled){
      const loot=mk('Loot labels: '+(Game.options.alwaysLabels?'On':'Off'),()=>{Game.options.alwaysLabels=!Game.options.alwaysLabels;Game.saveOptions();loot.textContent='Loot labels: '+(Game.options.alwaysLabels?'On':'Off');loot.setAttribute('aria-pressed',String(Game.options.alwaysLabels));});loot.setAttribute('aria-pressed',String(Game.options.alwaysLabels));
      if(typeof Coop!=='undefined'&&Coop.active)mk('Party',()=>{closeEsc();CoopUI.party();});
    }
    if(typeof MobileShell!=='undefined')MobileShell.controls(actions);
    mk("Loot Filter", () => {
      menuScreen = "loot"; menuBackAction = "Loot Filter";
      const workshop = textNode("div", "box gframe"); els.escmenu.replaceChildren(workshop);
      LootFilterUI.open(workshop, { back: menuBack, close: closeEsc });
    });
    const st = Game.state;
    if (st && (st.unlockedDiff || 0) > 0) {
      mk(`Difficulty: ${DATA.DIFFICULTIES[st.difficulty].name}  ▸`, async () => {
        const next = (st.difficulty + 1) % ((st.unlockedDiff || 0) + 1);
        closeEsc();
        await Game.setDifficulty(next);
      });
    }
    mk("Save and Quit to Title", () => { closeEsc(); Game.saveAndQuit(); });
    const foot = textNode("footer", "menu-footer"); foot.append(textNode("span", "menu-muted", "Esc to resume your journey")); box.append(foot);
    actions.firstElementChild.focus();
  }
  function openSettings({ tab = "audio", origin = els.title.classList.contains("hidden") ? "pause" : "title" } = {}) {
    beginMenu(origin); menuScreen = "settings";
    menuBackAction = tab === "controls" ? "Controls" : "Settings";
    const box = menuShell("settings-menu", "Settings & Controls", "Make yourself at home in the dark.");
    const tabs = textNode("div", "settings-tabs"), body = textNode("div", "settings-body");
    tabs.setAttribute("role", "tablist"); tabs.setAttribute("aria-label", "Settings categories");
    body.id = "settingsPanel"; body.setAttribute("role", "tabpanel"); body.tabIndex = 0;
    const categories = [["audio", "Audio"], ["gameplay", "Gameplay"], ["display", "Display"], ["controls", "Controls"]];
    let device = typeof MobileControls !== "undefined" && MobileControls.enabled ? "touch" : "keyboard";
    function choose(id, focus = true) {
      for (const button of tabs.children) {
        const active = button.dataset.tab === id;
        button.setAttribute("aria-selected", String(active)); button.tabIndex = active ? 0 : -1;
        if (active && focus) button.focus();
      }
      body.setAttribute("aria-labelledby", "settingsTab-" + id); body.replaceChildren(); body.scrollTop = 0;
      if (id === "controls") renderControls(body, device, chooseDevice);
      else renderSettings(body, id);
    }
    // Guide switching keeps focus on the chosen device and never changes input mode.
    function chooseDevice(next) {
      device = next; renderControls(body, device, chooseDevice);
      body.querySelector('[data-device="' + device + '"]')?.focus();
    }
    for (const [id, label] of categories) {
      const button = actionButton(label, () => choose(id), "settings-tab");
      button.id = "settingsTab-" + id; button.dataset.tab = id; button.setAttribute("role", "tab");
      button.setAttribute("aria-controls", body.id);
      button.onkeydown = e => {
        const i = categories.findIndex(c => c[0] === id);
        const next = e.key === "ArrowRight" ? (i + 1) % categories.length : e.key === "ArrowLeft" ? (i + categories.length - 1) % categories.length : e.key === "Home" ? 0 : e.key === "End" ? categories.length - 1 : null;
        if (next !== null) { e.preventDefault(); tabs.children[next].click(); }
      };
      tabs.append(button);
    }
    const foot = textNode("footer", "menu-footer");
    foot.append(actionButton("Back", menuBack, "menu-button menu-back"), textNode("span", "menu-muted", "Changes apply immediately"));
    box.append(tabs, body, foot);
    const initial = categories.some(c => c[0] === tab) ? tab : "audio";
    choose(initial);
  }
  function settingRow(body, key, title, description, input) {
    const row = textNode("div", "setting-row"), copy = textNode("div", "setting-copy");
    const label = textNode("label", "setting-label", title); input.id = "setting-" + key; label.htmlFor = input.id;
    const help = textNode("p", "menu-muted", description); help.id = input.id + "-help"; input.setAttribute("aria-describedby", help.id);
    copy.append(label, help); row.append(copy, input); body.append(row); return row;
  }
  function renderSettings(body, tab) {
    const headings = { audio: ["Sound & atmosphere", "Set the balance between the world, its music, and the clash of combat."], gameplay: ["Your way through the world", "Choose how your primary mouse button behaves."], display: ["Clarity in the chaos", "Decide which combat details you see."] };
    body.append(textNode("h3", "", headings[tab][0]), textNode("p", "settings-intro menu-muted", headings[tab][1]));
    if (tab === "audio") {
      for (const [key, label, help] of [["master", "Master volume", "Overall volume for all game audio."], ["sfx", "Sound Effects", "Combat, interactions, and menu sounds."], ["music", "Music", "The soundtrack of your journey."]]) {
        const input = document.createElement("input"); input.type = "range"; input.min = 0; input.max = 100; input.step = 1; input.value = Math.round(Sfx.vol[key] * 100);
        const row = settingRow(body, key, label, help, input), control = textNode("div", "setting-volume"), value = textNode("output", "setting-value");
        value.htmlFor = input.id; value.setAttribute("aria-hidden", "true");
        const update = () => { value.textContent = input.value + "%"; input.setAttribute("aria-valuetext", value.textContent); input.style.setProperty("--level", value.textContent); };
        input.addEventListener("input", () => { update(); Sfx.setVol(key, +input.value / 100); Game.saveOptions(); });
        control.append(input, value); row.append(control); update();
      }
      return;
    }
    const toggles = tab === "gameplay" ? [["leftClickMove", "Left-click: move only", "Move and interact without attacking. Hold Shift and left-click to attack in place."]] : [
      ["dmgNumbers", "Player damage numbers", "Show floating damage numbers from your attacks."],
      ["minionDamage", "Minion damage numbers", "Show your minions’ damage independently of player damage numbers."],
      ["monResist", "Monster resistances", "Show resistances when you point at a monster."],
      ["screenShake", "Screen shake", "Let heavy impacts shake the camera."]
    ];
    for (const [key, label, help] of toggles) {
      const input = document.createElement("input"); input.type = "checkbox"; input.className = "setting-switch"; input.setAttribute("role", "switch"); input.checked = Game.options[key];
      input.addEventListener("change", () => { Game.options[key] = input.checked; Game.saveOptions(); });
      settingRow(body, key, label, help, input);
    }
    if (tab === "display") {
      const select = document.createElement("select");
      for (const [value, label] of [["always", "Always"], ["hit", "When hurt"], ["never", "Never"]]) { const option = textNode("option", "", label); option.value = value; select.append(option); }
      select.value = Game.options.minionBars;
      select.addEventListener("change", () => { Game.options.minionBars = select.value; Game.saveOptions(); });
      settingRow(body, "minionBars", "Minion life bars", "Choose when health bars appear over your minions.", select);
    }
    if (tab === "gameplay") body.append(textNode("p", "settings-note", "Looking for the full guide? Open Controls for movement, skills, and shortcuts."));
  }
  function renderControls(body, device, chooseDevice) {
    body.replaceChildren();
    const devices = textNode("div", "controls-devices"); devices.setAttribute("role", "group"); devices.setAttribute("aria-label", "Control guide device");
    for (const [id, label] of [["keyboard", "Keyboard & Mouse"], ["touch", "Touch"]]) {
      const button = actionButton(label, () => chooseDevice(id), "menu-button"); button.dataset.device = id; button.setAttribute("aria-pressed", String(device === id)); devices.append(button);
    }
    body.append(devices);
    const reveal = LootFilter.config.revealKey;
    const keyName = key => ({ alt: "Alt", shift: "Shift", control: "Ctrl", " ": "Space", spacebar: "Space" }[key] || key.toUpperCase());
    const groups = device === "touch" ? [
      ["Movement & combat", [
        [["Thumbstick"], "Drag to move; release to stop. You can use a second finger for combat or potions."],
        [["Tap the world"], "Walk to a point, talk, collect loot, or use a gate or object."],
        [["Attack", "Skill"], "Hold an assigned skill to fight a nearby visible enemy. Move close for melee. Buffs and summons fire once per press."],
        [["Jump"], "Jump in the thumbstick direction, or forward while standing still."]]],
      ["Skills & potions", [
        [["Talents → Loadout"], "Assign Attack and four skills. Each skill button casts directly; an empty slot opens assignment."],
        [["Skill 1–4"], "Hold to repeat supported attacks. Buffs and summons activate once per press. Release charged skills to fire."],
        [["Draughts"], "Tap a numbered bottle to drink a belt potion."]]],
      ["Panels & interactions", [
        [["Pack / Menu"], "Open the full-screen menu. Switch between Pack, Character, Talents, Quests and More."],
        [["Map"], "Show or hide the map overlay."],
        [["Menu"], "Close an open panel, or pause and open the game menu."],
        [["Inventory"], "Tap an item to open its actions, including equip, use, sell, or move to belt."]]]
    ] : [
      ["Movement & combat", [
        [["Left-click"], Game.options.leftClickMove ? "Move, talk, pick up loot, and interact. Move-only is on; hold Shift to attack." : "Move, attack, talk, pick up loot, and interact."],
        [["Hold left-click"], "Hold on the ground to steer toward the cursor; release to stop. " + (Game.options.leftClickMove ? "Hold Shift and left-click an enemy to keep attacking." : "Hold on an enemy to keep attacking.")],
        [["Shift", "+", "Left-click"], "Attack in place without moving."],
        [["Space"], "Jump toward the cursor."]]],
      ["Skills & potions", [
        [["Right-click"], "Use your secondary skill. Hold to repeat supported attacks."],
        [["1", "–", "4"], "Drink the potion in the matching belt slot."],
        [["F1", "–", "F4"], "Select an assigned right-click skill. Empty slots open the skill picker."],
        [["Skill icons"], "Click a skill icon on the action bar to change its assignment."]]],
      ["Panels & interactions", [
        [["I"], "Inventory"], [["C"], "Character"], [["T", "/", "S"], "Talents"], [["Q"], "Quests"], [["M"], "Show or hide the map overlay."],
        [["L"], "Toggle the loot filter on or off."],
        [[keyName(reveal), "(hold)"], "Temporarily reveal loot hidden by the filter."],
        ...(reveal !== "alt" ? [[["Alt", "(hold)"], "Also temporarily reveals hidden loot."]] : []),
        [["Esc"], "Close panels or open the pause menu. Within settings, go back."],
        [["Inventory"], "Click to lift an item, then click a slot to place it. Right-click to equip or use; while trading, right-click to sell."]]]
    ];
    for (const [title, rows] of groups) {
      const section = textNode("section", "controls-group"); section.append(textNode("h3", "", title));
      const list = textNode("dl", "controls-list");
      for (const [keys, description] of rows) {
        const row = textNode("div", "control-row"), term = textNode("dt", "control-keys");
        for (const key of keys) term.append(textNode(["+", "–", "/", "(hold)"].includes(key) ? "span" : "kbd", "", key));
        row.append(term, textNode("dd", "", description)); list.append(row);
      }
      section.append(list); body.append(section);
    }
    body.scrollTop = 0;
  }
  function closeEsc() {
    els.escmenu.classList.add("hidden");
    const session = menuSession; menuSession = null;
    if (!session) return;
    for (const [node, inert] of session.inert) node.inert = inert;
    delete els.escmenu.dataset.menuOrigin;
    els.escmenu.onkeydown = els.escmenu.onkeyup = null;
    const target = session.focus;
    if (target && target !== document.body && target.isConnected && !target.closest('[inert]') && target.getClientRects().length) target.focus({ preventScroll: true });
    else if (session.origin === "title") els.title.querySelector("button")?.focus({ preventScroll: true });
    else $("view").focus({ preventScroll: true });
  }
  function escOpen() { return !els.escmenu.classList.contains("hidden"); }

  /* ================================================== title screen */
  function clearTitleMusicGesture() {
    document.removeEventListener('pointerdown', unlockTitleMusic);
    document.removeEventListener('keydown', unlockTitleMusic);
  }
  function unlockTitleMusic() {
    if (!els.title.classList.contains('hidden')) { Sfx.init(); Sfx.music('title'); }
    clearTitleMusicGesture();
  }
  function showTitle() {
    setCursorItem(null);forgeSlots=[null,null,null,null];managementHero=null;managementSignature="";
    hideOpening();
    hideDeath();
    els.title.classList.remove("hidden");
    titleMain();
    Sfx.music('title');
    /* Retry on the first gesture if the browser blocks startup autoplay. */
    clearTitleMusicGesture();
    document.addEventListener('pointerdown', unlockTitleMusic);
    document.addEventListener('keydown', unlockTitleMusic);
  }
  function hideTitle() { hideDeath(); clearTitleMusicGesture(); Sfx.stopMusic(); TitleScreen.hide(); els.title.classList.add("hidden"); }
  function titleMain() { TitleScreen.main(); }

  /* ================================================== debug */
  function toggleDebug() {
    if(typeof Coop!=="undefined"&&Coop.active){msg("Debug commands are unavailable in co-op.");return;}
    const el = els.debug;
    if (!el.classList.contains("hidden")) { el.classList.add("hidden"); return; }
    el.classList.remove("hidden");
    el.innerHTML = `<div style="margin-bottom:6px;color:#7fdf7f">— DEBUG —</div>`;
    const mk = (label, fn) => { const b = document.createElement("button"); b.textContent = label; b.addEventListener("click", fn); el.appendChild(b); };
    mk("God mode: " + (Game.debugFlags.god ? "ON" : "OFF"), () => { Game.debugFlags.god = !Game.debugFlags.god; toggleDebug(); toggleDebug(); });
    mk("+1 level", () => { const p = Game.state.player; p.gainXp(DATA.xpForLevel(p.lvl) - p.xp); });
    mk("+5 levels", () => { const p = Game.state.player; for (let i = 0; i < 5; i++) p.gainXp(DATA.xpForLevel(p.lvl) - p.xp); });
    mk("+1000 gold", () => { Game.state.player.gold += 1000; refreshGrids(); });
    mk("Drop random rare", () => Game.debugDrop("rare"));
    mk("Drop random set piece", () => Game.debugDrop("set"));
    mk("Drop random unique", () => Game.debugDrop("unique"));
    mk("Spawn elite pack", () => Game.debugSpawnElites());
    mk("Reveal map", () => Game.state.map.explored.fill(1));
    mk("Heal full", () => { const p = Game.state.player; p.hp = p.stats.maxHp; p.mana = p.stats.maxMana; });
    mk("Go to boss", () => Game.debugGotoBoss());
    mk("Unlock all waystones", () => { for (const z of Object.values(DATA.ZONES)) if (z.kind === "camp" && !Game.state.shrines.includes(z.id)) Game.state.shrines.push(z.id); Game.msg("All act camps attuned.", "#8fd8ff"); });
  }

  /* ================================================== opening cinematic */
  let cinTimers = [];
  function clearCin() { cinTimers.forEach(t => clearTimeout(t)); cinTimers = []; }

  /* Nonmodal opening UI. Its clock follows gameplay, including the pause menu. */
  let openingEls = null, captionTime = 0, arrivalTime = 0;
  function showOpening(fade = false) {
    hideOpening();
    const root = textNode("section", "opening-ui" + (fade ? " opening-wake" : ""));
    root.id="openingUI"; root.setAttribute("aria-label","The Last Warm Wall");
    const objective = textNode("div","opening-objective");
    objective.append(textNode("span","opening-kicker","THE LAST WARM WALL"));
    const goal=textNode("p","opening-goal","Reach Frosthaven"),hint=textNode("p","opening-hint","");
    goal.setAttribute("role","status");hint.setAttribute("aria-live","polite");objective.append(goal,hint);
    const skip=actionButton("Skip opening",async()=>{
      if(skip.disabled)return;
      const hero=Game.state?.player;
      skip.disabled=true;skip.textContent="Entering Frosthaven…";
      try {
        const done=await Game.skipOpening();
        if(!done && Game.state?.player===hero)openingCaption("","Frosthaven could not be loaded. Try again.",8);
      } catch(error) {
        console.error(error);
        if(Game.state?.player===hero)openingCaption("","Frosthaven could not be loaded. Try again.",8);
      } finally { skip.disabled=false;skip.textContent="Skip opening"; }
    },"opening-skip");
    const caption=textNode("div","opening-caption");caption.setAttribute("role","status");caption.setAttribute("aria-atomic","true");
    const speaker=textNode("span","opening-speaker",""),line=textNode("span","opening-line","");caption.append(speaker,line);
    const arrival=textNode("div","opening-arrival");arrival.hidden=true;
    arrival.append(textNode("span","opening-kicker","ACT I · THE FALLEN NORTH"),textNode("div","opening-town","FROSTHAVEN"),textNode("p","","The Last Warm Wall"));
    root.append(objective,skip,caption,arrival);$("game").appendChild(root);
    openingEls={root,goal,hint,skip,caption,speaker,line,arrival};
  }
  function hideOpening() {
    openingEls?.root.remove(); openingEls=null;captionTime=arrivalTime=0;
  }
  function openingObjective(goal,hint,stage) {
    if(!openingEls)return;
    openingEls.root.classList.toggle("opening-boss",stage==="boss"||stage==="bossIntro");
    if(openingEls.goal.textContent!==goal)openingEls.goal.textContent=goal;
    if(openingEls.hint.textContent!==hint)openingEls.hint.textContent=hint;
  }
  function openingCaption(speaker,line,seconds=6) {
    if(!openingEls)return;
    openingEls.speaker.textContent=speaker;
    openingEls.line.textContent=line;
    openingEls.caption.classList.add("visible");captionTime=seconds;
  }
  function openingArrival() { if(openingEls){openingEls.arrival.hidden=false;arrivalTime=5;} }
  function tickOpening(dt) {
    if(!openingEls)return;
    if(captionTime>0 && (captionTime-=dt)<=0)openingEls.caption.classList.remove("visible");
    if(arrivalTime>0 && (arrivalTime-=dt)<=0)openingEls.arrival.hidden=true;
  }

  /* ================================================== in-game video cinematic */
  let videoOn = false;
  function cinematicActive() { return videoOn || !els.cinematic.classList.contains("hidden"); }
  /* play a full-screen video, pausing the game; fade in, then fade back and call onDone */
  function playVideo(src, onDone, coopLocal=false) {
    if(typeof Coop!=="undefined"&&Coop.active&&!coopLocal)return Coop.cinematic(src,onDone);
    closeAll();closeEsc();Game.cancelMenuInput();
    const el = els.cinematic;
    videoOn = true;
    let finished = false;
    /* duck the ambient music under the cinematic, restore after */
    const prevMusic = Sfx.vol.music;
    try { Sfx.setVol("music", 0); } catch (e) {}
    el.classList.remove("hidden");
    el.classList.add("videofade");                 // opacity 0
    el.innerHTML = `<video class="cinevid" playsinline preload="auto"></video><div class="cinskip">click to skip</div>`;
    const v = el.querySelector("video");
    const skip = el.querySelector(".cinskip");
    try { v.volume = U.clamp((Sfx.vol.master || 0.8), 0, 1); } catch (e) {}
    const finish = () => {
      if (finished) return; finished = true;
      el.classList.remove("shown");                // fade out
      setTimeout(() => {
        el.classList.add("hidden"); el.classList.remove("videofade"); el.innerHTML = "";
        try { v.pause(); v.removeAttribute("src"); v.load(); } catch (e) {}
        try { Sfx.setVol("music", prevMusic); } catch (e) {}
        videoOn = false;
        if (onDone) onDone();
      }, 560);
    };
    v.addEventListener("ended", finish);
    v.addEventListener("error", finish);           // missing/broken file: never soft-lock
    el.onclick = finish;                           // click anywhere to skip
    v.src = src;
    /* fade the overlay in on the next frame */
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("shown")));
    setTimeout(() => skip && skip.classList.add("show"), 1400);
    const tryPlay = () => { const pr = v.play(); if (pr && pr.catch) pr.catch(() => { v.muted = true; const p2 = v.play(); if (p2 && p2.catch) p2.catch(finish); }); };
    tryPlay();
    /* safety: if nothing loads within 9s, bail back to gameplay */
    setTimeout(() => { if (!finished && v.readyState === 0) finish(); }, 9000);
  }

  /* ================================================== final choice + endings */
  const ENDINGS = {
    destroy: { name: "Destroy the Core",
      sub: "The barrier between the Waking World and Hell is permanently unstable.",
      lines: ["You drive the last shard against the others until the core cracks like river ice.",
        "Light floods out — and does not stop. The wound between this world and the Hells will never fully close now.",
        "But it cannot be gathered. It cannot be used. It cannot lie to anyone, ever again.",
        "You walk home through a world that will always be a little too thin. It is free. That will have to be enough."] },
    seal: { name: "Seal It Away",
      sub: "The core is hidden — and patient.",
      lines: ["You bind the core in wards older than the Render and carry it somewhere no map remembers.",
        "It sleeps. Its guardians will not. In years or centuries, the core may corrupt those sworn to keep it.",
        "You have bought time, and only time. Someday another hero will stand where you stand, holding the same terrible question.",
        "You hope they choose better. You hope there is a they."] },
    give: { name: "Give It to Seraneth",
      sub: "The Warden returns — changed.",
      lines: ["The true Seraneth steps from the broken light, frayed at every edge by the long road outside the world.",
        "She takes the core in both hands. For a moment her eyes are not entirely her own.",
        "Then she nods, and is gone, and the sky knits shut behind her.",
        "She will guard it. You tell yourself that. You almost believe it."] },
  };
  function openFinalChoice() {
    const el = els.cinematic;
    el.classList.remove("hidden");
    el.innerHTML = `<div class="cinwrap">
      <div class="cintext"><span class="ln show em">Vethriss is dead. The gathered shards collapse into a single, humming core at your feet.</span>
      <span class="ln show">It is the last piece of the Sunderstone left whole — and the choice of what becomes of it is yours alone.</span></div>
      <div id="choiceList"></div></div>`;
    const list = el.querySelector("#choiceList");
    for (const key of ["give", "seal", "destroy"]) {
      const e = ENDINGS[key];
      const b = document.createElement(typeof MobileShell!=='undefined'&&MobileShell.enabled?'button':'div'); b.className = "choicebtn";
      if(b.tagName==='BUTTON')b.type='button';
      b.innerHTML = `<b>${e.name}</b>${e.sub}`;
      b.addEventListener("click", () => {  showEnding(key); });
      list.appendChild(b);
    }
  }
  function showEnding(key) {
    const e = ENDINGS[key];
    const el = els.cinematic;
    el.innerHTML = `<div class="cinwrap"><div class="cintext"></div><div class="cintitle">THE EMBERGRAVE SAGA</div><div class="cinskip">click to return to the title</div></div>`;
    const txt = el.querySelector(".cintext"), titleEl = el.querySelector(".cintitle"), skip = el.querySelector(".cinskip");
    txt.innerHTML = `<span class="ln em">${e.name}</span>` + e.lines.map(l => `<span class="ln">${l}</span>`).join("") +
      `<span class="ln em" style="margin-top:18px">The Waking World endures. For now.</span>`;
    const lines = [...txt.querySelectorAll(".ln")];
    clearCin();
    if(typeof MobileShell!=='undefined'&&MobileShell.enabled){
      for(const line of lines)line.classList.add('show');titleEl.classList.add('show');skip.remove();
      Game.recordEnding(key);el.onclick=null;
      el.appendChild(actionButton('Return to title',()=>{clearCin();el.classList.add('hidden');el.innerHTML='';Game.saveAndQuit();},'phone-ending-return'));
      return;
    }
    lines.forEach((ln, i) => cinTimers.push(setTimeout(() => ln.classList.add("show"), 400 + i * 2400)));
    cinTimers.push(setTimeout(() => titleEl.classList.add("show"), 600 + lines.length * 2400));
    cinTimers.push(setTimeout(() => skip.classList.add("show"), 1200 + lines.length * 2400));
    Game.recordEnding(key);
    const back = () => { clearCin(); el.classList.add("hidden"); el.innerHTML = ""; Game.saveAndQuit(); };
    el.onclick = back;
    cinTimers.push(setTimeout(back, 2200 + lines.length * 2400 + 6000));
  }

  return {
    openFinalChoice, playVideo, cinematicActive,
    showOpening, hideOpening, openingObjective, openingCaption, openingArrival, tickOpening, openOpeningDialog,
    init, refreshHUD, refreshBelt, refreshBuffs, refreshGrids, renderIfOpen,
    msg, centerMsg, togglePanel, closePanel, closeAll, anyOpen, openPanels: () => openPanels,
    refreshManagement, managementStatus,
    openVendor, openStorage, openDialog, openBoard, openShrine, openSkillPick, openForge, quickCast,
    showItemTooltip, showSkillTooltip, hideTooltip,
    openEsc, openSettings, closeEsc, escOpen, menuBack,
    showTitle, hideTitle, showDeath, hideDeath, toggleDebug,
    get cursorItem() { return coopItems()?Game.state?.player?.management?.carried||null:cursorItem; },
    setCursorItem,
  };
})();
