/* =========================================================================
   EMBERGRAVE — dataedit.js   (dev tool, loaded only by editor.html)
   A GUI for editing monster stats and item data. Reads the PRISTINE DATA from
   data.js, captures any existing overrides without mutating DATA, lets you edit
   fields, and writes minimal diffs to js/data_overrides.js (via serve.py, with
   a download fallback). data.js is never modified.
   ========================================================================= */
"use strict";
(() => {
  /* ---- collections we expose, and how to enumerate them ---- */
  const COLLS = [
    { tab: "Monsters", key: "ENEMIES",     kind: "obj" },
    { tab: "Bases",    key: "BASES",       kind: "obj" },
    { tab: "Uniques",  key: "UNIQUES",     kind: "arr" },
    { tab: "Sets",     key: "SET_ITEMS",   kind: "arr" },
    { tab: "Glyphs",   key: "GLYPHS",      kind: "obj" },
    { tab: "Charms",   key: "CHARM_BASES", kind: "obj" },
    { tab: "Affixes",  key: "AFFIXES",     kind: "arridx" },
  ].filter(c => DATA[c.key]);

  let OV = {};                 // override object: OV[collKey][id] = { field: value }
  let activeColl = COLLS[0];
  let activeId = null;
  let entryCache = {};         // collKey -> [{id,label,sub,base}]

  /* ---------- small utils ---------- */
  const $ = id => document.getElementById(id);
  const clone = v => (v == null ? v : JSON.parse(JSON.stringify(v)));
  const stable = v => {        // order-independent stringify for deep compare
    if (Array.isArray(v)) return "[" + v.map(stable).join(",") + "]";
    if (v && typeof v === "object") return "{" + Object.keys(v).sort().map(k => JSON.stringify(k) + ":" + stable(v[k])).join(",") + "}";
    return JSON.stringify(v);
  };
  const deepEq = (a, b) => stable(a) === stable(b);
  const merge = (t, p) => {    // deep-merge p into t; arrays replace wholesale (mirrors data.js)
    for (const k in p) {
      const v = p[k];
      if (v && typeof v === "object" && !Array.isArray(v) && t[k] && typeof t[k] === "object" && !Array.isArray(t[k])) merge(t[k], v);
      else t[k] = clone(v);
    }
    return t;
  };

  /* ---------- enumerate a collection into a uniform list ---------- */
  function entriesFor(coll) {
    if (entryCache[coll.key]) return entryCache[coll.key];
    const D = DATA[coll.key], out = [];
    if (coll.kind === "obj") {
      for (const id of Object.keys(D)) { const b = D[id]; if (b && typeof b === "object") out.push({ id, base: b, label: b.name || id, sub: id }); }
    } else if (coll.kind === "arr") {
      D.forEach(b => { if (b && b.id) out.push({ id: b.id, base: b, label: b.name || b.id, sub: b.id }); });
    } else { // arridx — affixes keyed by array index
      D.forEach((b, i) => {
        const tier = b.tiers && b.tiers[0] ? b.tiers[0].name : "";
        out.push({ id: String(i), base: b, label: b.group || b.stat || ("#" + i), sub: (b.kind === "p" ? "prefix" : "suffix") + (tier ? " · " + tier : "") });
      });
    }
    entryCache[coll.key] = out;
    return out;
  }
  const baseOf = (coll, id) => entriesFor(coll).find(e => e.id === id);
  const dirtyFields = (key, id) => (OV[key] && OV[key][id]) ? Object.keys(OV[key][id]) : [];
  const dirtyCount = key => OV[key] ? Object.keys(OV[key]).filter(id => OV[key][id] && Object.keys(OV[key][id]).length).length : 0;

  /* ---------- write a single field into the override diff ---------- */
  function setField(key, id, field, val, baseVal) {
    if (deepEq(val, baseVal)) {                       // back to pristine → drop the override
      if (OV[key] && OV[key][id]) { delete OV[key][id][field]; if (!Object.keys(OV[key][id]).length) delete OV[key][id]; }
      if (OV[key] && !Object.keys(OV[key]).length) delete OV[key];
    } else {
      OV[key] = OV[key] || {};
      OV[key][id] = OV[key][id] || {};
      OV[key][id][field] = clone(val);
    }
  }

  /* ---------- render: tabs ---------- */
  function renderTabs() {
    $("tabs").innerHTML = "";
    COLLS.forEach(c => {
      const el = document.createElement("div");
      el.className = "tab" + (c === activeColl ? " active" : "");
      const n = dirtyCount(c.key);
      el.innerHTML = c.tab + (n ? ` <span class="badge">${n}</span>` : "");
      el.onclick = () => { activeColl = c; activeId = null; renderTabs(); renderList(); renderEditor(); };
      $("tabs").appendChild(el);
    });
  }

  /* ---------- render: list ---------- */
  function renderList() {
    const q = ($("search").value || "").toLowerCase();
    const rows = $("rows"); rows.innerHTML = "";
    entriesFor(activeColl).forEach(e => {
      if (q && !(e.label + " " + e.sub).toLowerCase().includes(q)) return;
      const d = document.createElement("div");
      const isDirty = dirtyFields(activeColl.key, e.id).length > 0;
      d.className = "row" + (e.id === activeId ? " sel" : "") + (isDirty ? " dirty" : "");
      d.innerHTML = `<span class="nm">${esc(e.label)}</span><span class="id">${esc(e.sub)}</span>`;
      d.onclick = () => { activeId = e.id; renderList(); renderEditor(); };
      rows.appendChild(d);
    });
  }

  /* ---------- render: editor form ---------- */
  function renderEditor() {
    const ed = $("editor");
    if (!activeId) { ed.innerHTML = `<div class="hint">Select an entry from <b>${activeColl.tab}</b>.</div>`; return; }
    const e = baseOf(activeColl, activeId);
    const eff = merge(clone(e.base), (OV[activeColl.key] && OV[activeColl.key][activeId]) || {});
    const dirty = new Set(dirtyFields(activeColl.key, activeId));

    ed.innerHTML = "";
    const h = document.createElement("div");
    h.innerHTML = `<h2>${esc(eff.name || e.label)}</h2><div class="sub">${activeColl.tab} · <code>${esc(activeColl.key)}[${activeColl.kind === "arr" ? "'" + esc(activeId) + "'" : activeColl.kind === "obj" ? "'" + esc(activeId) + "'" : activeId}]</code>` +
      (dirty.size ? ` · <span style="color:var(--mod)">${dirty.size} field(s) overridden</span> <button id="revertEntry">revert entry</button>` : "") + `</div>`;
    ed.appendChild(h);
    const rev = $("revertEntry"); if (rev) rev.onclick = () => { if (OV[activeColl.key]) delete OV[activeColl.key][activeId]; refresh(); };

    addPreview(ed, e.base, eff);

    const keys = Array.from(new Set([...Object.keys(e.base), ...Object.keys((OV[activeColl.key] && OV[activeColl.key][activeId]) || {})]));
    keys.forEach(k => {
      const baseVal = e.base[k];
      if (typeof baseVal === "function") return;     // never edit function-valued fields
      const val = eff[k];
      ed.appendChild(fieldRow(k, baseVal, val, dirty.has(k)));
    });
  }

  function fieldRow(key, baseVal, val, isMod) {
    const wrap = document.createElement("div");
    wrap.className = "field" + (isMod ? " mod" : "");
    const lab = document.createElement("label"); lab.textContent = key; wrap.appendChild(lab);
    const ctl = document.createElement("div"); ctl.className = "ctl"; wrap.appendChild(ctl);
    const ref = baseVal === undefined ? val : baseVal;       // type reference
    const commit = v => { setField(activeColl.key, activeId, key, v, baseVal); afterEdit(); };

    if (typeof ref === "boolean") {
      const cb = document.createElement("input"); cb.type = "checkbox"; cb.checked = !!val;
      cb.onchange = () => commit(cb.checked); ctl.appendChild(cb);
    } else if (typeof ref === "number") {
      const inp = document.createElement("input"); inp.type = "number"; inp.step = "any"; inp.value = val;
      inp.oninput = () => { if (inp.value !== "") commit(parseFloat(inp.value)); }; ctl.appendChild(inp);
    } else if (typeof ref === "string") {
      const inp = document.createElement("input"); inp.type = "text"; inp.value = val == null ? "" : val;
      inp.oninput = () => commit(inp.value); ctl.appendChild(inp);
    } else if (Array.isArray(ref) && ref.every(x => typeof x !== "object")) {
      const inp = document.createElement("input"); inp.type = "text"; inp.value = JSON.stringify(val);
      inp.oninput = () => tryJson(inp, commit); ctl.appendChild(inp);
    } else {                                                 // nested object / array-of-objects → JSON textarea
      const ta = document.createElement("textarea"); ta.value = JSON.stringify(val, null, 2);
      ta.style.minHeight = Math.min(360, 28 + JSON.stringify(val, null, 2).split("\n").length * 16) + "px";
      ta.oninput = () => tryJson(ta, commit); ctl.appendChild(ta);
    }
    if (baseVal !== undefined && typeof baseVal !== "object") {
      const b = document.createElement("div"); b.className = "base"; b.textContent = "default: " + JSON.stringify(baseVal); ctl.appendChild(b);
    }
    return wrap;
  }

  function tryJson(el, commit) {
    try { const v = JSON.parse(el.value); el.style.borderColor = ""; commit(v); }
    catch (_) { el.style.borderColor = "var(--danger)"; }
  }

  /* small visual aid: item icon for item-ish entries, colour swatches for monster palettes */
  function addPreview(ed, base, eff) {
    const box = document.createElement("div"); box.id = "preview";
    if (eff.pal && typeof eff.pal === "object") {
      for (const [k, c] of Object.entries(eff.pal)) {
        if (typeof c !== "string") continue;
        const s = document.createElement("div"); s.className = "sw"; s.style.background = c; s.title = k + ": " + c; box.appendChild(s);
      }
    }
    if (typeof SpriteAssets !== "undefined" && (eff.icon || base.icon)) {
      try {
        const it = { baseId: base.id || activeId, icon: eff.icon || base.icon, w: eff.w || base.w || 1, h: eff.h || base.h || 1, ilvl: eff.ilvl || 1, affixes: [], rarity: "common" };
        const c = SpriteAssets.itemIcon(it); if (c) { c.className = "icon"; box.appendChild(c); }
      } catch (_) { /* preview is best-effort */ }
    }
    if (box.children.length) ed.appendChild(box);
  }

  /* ---------- build + save the override file ---------- */
  function pruned() {
    const out = {};
    for (const k in OV) {
      const coll = {};
      for (const id in OV[k]) if (OV[k][id] && Object.keys(OV[k][id]).length) coll[id] = OV[k][id];
      if (Object.keys(coll).length) out[k] = coll;
    }
    return out;
  }
  function fileText() {
    const json = JSON.stringify(pruned(), null, 2);
    return `/* =====================================================================\n` +
      `   EMBERGRAVE — data overrides (auto-generated by editor.html)\n` +
      `   Patches item & monster data on top of the pristine data.js. Edit via the\n` +
      `   GUI tool (editor.html), not by hand. Delete the body below to revert.\n` +
      `   ===================================================================== */\n` +
      `if (typeof DATA !== "undefined" && DATA.applyOverrides) DATA.applyOverrides(\n${json}\n);\n`;
  }
  async function save() {
    const body = fileText();
    setStatus("saving…");
    try {
      const r = await fetch("/api/save/data_overrides", { method: "POST", headers: { "Content-Type": "application/javascript" }, body });
      const j = await r.json();
      if (j.ok) { setStatus(`saved ✓ ${j.path} (${j.bytes}b) — reload the game`, "ok"); return; }
      throw new Error(j.error || "server refused");
    } catch (err) {
      setStatus("server save failed — downloading instead (" + err.message + ")", "warn");
      download(body);
    }
  }
  function download(body) {
    const blob = new Blob([body || fileText()], { type: "application/javascript" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "data_overrides.js";
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(a.href);
  }
  function resetAll() {
    if (!confirm("Discard ALL overrides and revert to pristine data.js? This also saves an empty override file.")) return;
    OV = {}; refresh(); save();
  }

  /* ---------- glue ---------- */
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  function setStatus(t, cls) { const s = $("status"); s.textContent = t; s.style.color = cls === "ok" ? "var(--accent2)" : cls === "warn" ? "var(--mod)" : "var(--dim)"; }
  function afterEdit() { renderTabs(); renderList(); markDirtyHeader(); }
  function markDirtyHeader() {
    const e = baseOf(activeColl, activeId); if (!e) return;
    // refresh field highlight + header counter without losing input focus → only update marks
    const dirty = new Set(dirtyFields(activeColl.key, activeId));
    document.querySelectorAll("#editor .field").forEach(f => {
      const k = f.querySelector("label").textContent; f.classList.toggle("mod", dirty.has(k));
    });
    const sub = document.querySelector("#editor .sub");
    if (sub && !sub.dataset.locked) { /* cheap: re-render header text via full re-render is jarring; leave counter to tab badge */ }
  }
  function refresh() { renderTabs(); renderList(); renderEditor(); }

  /* ---------- boot: capture existing overrides WITHOUT mutating DATA, then build UI ---------- */
  async function boot() {
    try { await SpriteAssets.loadBundle("core"); }
    catch (err) { setStatus(err.message, "warn"); SpriteAssets.fatal(err); return; }
    $("search").oninput = renderList;
    $("btnSave").onclick = save;
    $("btnDownload").onclick = () => download();
    $("btnReset").onclick = resetAll;

    // hijack applyOverrides so loading data_overrides.js fills OV instead of patching DATA
    DATA.applyOverrides = obj => { OV = obj ? clone(obj) : {}; };
    const s = document.createElement("script");
    s.src = "js/data_overrides.js?ts=" + Date.now();
    s.onload = () => { finishBoot(); };
    s.onerror = () => { OV = {}; finishBoot(); };   // no override file yet — start clean
    document.head.appendChild(s);
  }
  function finishBoot() {
    const counts = COLLS.map(c => `${c.tab} ${entriesFor(c).length}`).join(" · ");
    setStatus(counts);
    refresh();
  }

  if (typeof DATA === "undefined") { document.getElementById("status").textContent = "ERROR: data.js failed to load"; return; }
  document.addEventListener("DOMContentLoaded", boot);
  if (document.readyState !== "loading") boot();
})();
