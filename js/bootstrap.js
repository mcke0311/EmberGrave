/* =========================================================================
   EMBERGRAVE startup guard
   Installed before the game modules so syntax, initialization, asset, and
   render failures always become a visible blocking screen.
   ========================================================================= */
"use strict";

(() => {
  let failed = false;

  function errorMessage(error) {
    if (error && error.message) return String(error.message);
    if (typeof error === "string" && error.trim()) return error.trim();
    return "An unknown startup error occurred.";
  }

  function renderFatal(error, stage) {
    failed = true;
    const draw = () => {
      if (!document.body) return;
      const loading = document.getElementById("spriteLoading");
      if (loading) loading.remove();

      let box = document.getElementById("appFatal");
      if (!box) {
        box = document.createElement("section");
        box.id = "appFatal";
        box.setAttribute("role", "alert");
        box.setAttribute("aria-live", "assertive");
        box.style.cssText = [
          "position:fixed", "inset:0", "z-index:2147483647", "overflow:auto",
          "display:grid", "place-items:center", "padding:8vh 8vw",
          "background:#120d0b", "color:#e8d9bd", "font:16px/1.55 monospace"
        ].join(";");
        const panel = document.createElement("div");
        panel.style.cssText = "width:min(860px,100%);padding:30px;border:1px solid #8a6035;background:#090706;box-shadow:0 18px 70px #000";
        const title = document.createElement("h1");
        title.style.cssText = "margin:0 0 18px;color:#e4b46a;font:22px/1.25 monospace;letter-spacing:.08em";
        title.textContent = "EMBERGRAVE COULD NOT CONTINUE";
        const stageEl = document.createElement("div");
        stageEl.id = "appFatalStage";
        stageEl.style.cssText = "margin-bottom:14px;color:#bca77f";
        const detail = document.createElement("pre");
        detail.id = "appFatalDetail";
        detail.style.cssText = "margin:0;white-space:pre-wrap;overflow-wrap:anywhere;color:#f0e5ce;font:15px/1.55 monospace";
        const note = document.createElement("p");
        note.style.cssText = "margin:20px 0 0;color:#9c8467";
        note.textContent = "No procedural artwork fallback was used.";
        panel.append(title, stageEl, detail, note);
        box.appendChild(panel);
        document.body.appendChild(box);
      }
      document.getElementById("appFatalStage").textContent = `Stage: ${stage || "Startup"}`;
      const asset = error && error.assetId ? `\nAsset: ${error.assetId}` : "";
      const source = error && error.src ? `\nSource: ${error.src}` : "";
      document.getElementById("appFatalDetail").textContent = `${errorMessage(error)}${asset}${source}`;
    };

    if (document.body) draw();
    else document.addEventListener("DOMContentLoaded", draw, { once: true });
  }

  window.AppBootstrap = Object.freeze({
    fatal: renderFatal,
    get failed() { return failed; },
  });

  window.addEventListener("error", event => {
    renderFatal(event.error || event.message, "Runtime initialization");
  });
  window.addEventListener("unhandledrejection", event => {
    renderFatal(event.reason, "Asynchronous startup");
  });
})();
