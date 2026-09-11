/* =========================================================================
   EMBERGRAVE — strict sprite-asset runtime
   Every persistent gameplay graphic comes from DATA.SPRITE_MANIFEST.  Canvas
   is used only to blit, transform, or tint authored sprite pixels.
   ========================================================================= */
"use strict";

const SpriteAssets = (() => {
  const motionPreference=window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const manifest = DATA.SPRITE_MANIFEST;
  if (!manifest || manifest.version !== 1) throw new Error("Missing or unsupported DATA.SPRITE_MANIFEST");

  const images = new Map();       // src -> HTMLImageElement
  const pending = new Map();      // src -> Promise<HTMLImageElement>
  const loadedBundles = new Set();
  const bundleOwnedSources = new Set();
  const activePlayerSources = new Set();
  const activePlayerTintSpecs = new Set();
  const tintCache = new Map();
  const act2TintKeys=[];
  const tintCacheSources = new Map();
  const isolatedFrameCache = new Map();
  const act1AuthoredFrames = new Map();
  const bossFlashCache = new Map();
  const playerWalkParts = new Map();
  const playerLoadRequests = new Map();
  const discardedPlayerVisuals = new WeakSet();
  let preparedPlayerVisual = null;
  let preparedPlayerSources = new Set();
  let preparedPlayerTintSpecs = new Set();
  let playerLoadRequestSeq = 0;
  /* Core sprites are bundle-owned for the lifetime of the page. Only decoded
     class/equipment families loaded on demand are eligible for eviction. */
  const coreSources = new Set(Object.values(manifest.entries)
    .filter(def => def.bundle === "core").map(def => def.src));
  const evictablePlayerSources = new Set(Object.values(manifest.entries)
    .filter(def => !coreSources.has(def.src) && (def.rigClass || (def.bundle || "").startsWith("player:")))
    .map(def => def.src));
  const TAU = Math.PI * 2;
  /* Player atlases use large 192px cells for clean layered alignment. Their
     authored figures are intentionally rendered at world-character scale here,
     rather than treating one source pixel as one screen pixel. */
  const PLAYER_BASE_SCALE = 0.42;
  /* Cutout registration in the authored idle cells: thigh seam, crotch x,
     ankle divide x, and the two boot contact points. Keep weapon pixels on
     the torso cutout when a flattened starter overlaps the trousers. The
     same leg motion also works underneath every modular equipment layer. */
  const PLAYER_WALK_RIGS = {
    vanguard: [
      [122,96,95,76,178,118,162], [122,96,95,76,178,119,164],
      [122,96,96,73,178,123,168], [122,96,94,59,168,112,179],
      [122,96,94,76,177,109,161], [122,93,95,67,178,110,168],
      [122,95,95,70,177,116,177], [122,95,94,67,165,104,177],
    ],
    emberwitch: [
      [122,94,94,75,179,119,173], [122,94,94,75,179,119,173],
      [122,95,96,76,178,118,178], [122,96,95,65,172,115,180],
      [122,98,98,81,179,116,174], [122,97,98,76,179,117,177],
      [122,96,96,75,179,119,179], [122,97,99,84,177,113,179],
    ],
    gravebinder: [
      [122,98,96,79,175,121,163], [122,98,96,79,175,121,163],
      [122,96,96,70,173,115,179], [122,95,95,62,164,109,177],
      [122,96,101,86,179,115,158], [122,96,97,79,178,115,153],
      [122,96,96,79,178,115,178], [122,96,97,86,176,110,179],
    ],
    veilranger: [
      [128,93,94,75,178,115,163], [128,93,94,75,178,115,165],
      [128,95,95,75,178,119,167], [128,95,95,66,165,109,177],
      [122,93,92,77,179,109,164], [122,94,94,73,179,110,167],
      [122,95,95,76,177,115,176], [122,95,94,70,164,106,178],
    ],
    wildkeeper: [
      [122,96,96,78,182,123,168], [122,96,96,78,182,123,170],
      [122,96,96,77,182,123,171], [122,96,96,66,171,112,181],
      [122,94,94,75,181,103,166], [122,94,94,69,181,107,168],
      [122,95,95,69,181,115,181], [122,96,96,67,167,107,181],
    ],
  };
  const PLAYER_WALK_KEEPS = {
    vanguard: [
      [[62,110,110,130,108,137,62,119]], [[62,111,108,130,107,138,62,120]],
      [[62,110,99,130,99,138,63,119]], [], [], [], [[120,109,126,109,126,139,120,139]], [],
    ],
    emberwitch: [
      [[63,113,78,112,90,146,82,149]], [[64,112,78,112,87,143,79,145]],
      [], [], [], [], [], [],
    ],
    gravebinder: [[],[],[],[],[],[],[[58,115,69,112,77,135,69,138]],[[67,112,76,110,84,127,77,130]]],
    veilranger: [[],[],[],[],[],[],[],[[101,105,107,108,86,158,80,155]]],
    wildkeeper: [
      [[18,138,77,102,82,111,21,144]], [[16,140,77,103,81,112,21,146]],
      [[23,139,72,101,80,107,27,146]], [[19,121,70,91,76,99,23,128]],
      [[17,141,58,108,64,115,22,147]], [[18,135,60,105,66,112,22,142]],
      [[27,121,67,94,73,100,31,128]], [[22,130,67,101,73,108,27,137]],
    ],
  };
  const STATES = {
    idle: { n: 1, fps: 4, loop: true },
    walk: { n: 2, fps: 8, loop: true },
    attack: { n: 2, fps: 12, loop: false },
    hit: { n: 1, fps: 10, loop: false },
    death: { n: 2, fps: 7, loop: false },
  };
  const TIER_MATS = [
    { metal: "#6f5742", wood: "#43331f" }, { metal: "#7c7e84", wood: "#574026" },
    { metal: "#9aa0a8", wood: "#5e4a2e" }, { metal: "#b6bec8", wood: "#66502f" },
    { metal: "#b9a878", wood: "#5f4628" }, { metal: "#cdd6e0", wood: "#6a502e" },
    { metal: "#8f98ac", wood: "#544230" }, { metal: "#aeb8cc", wood: "#574734" },
    { metal: "#dde8f4", wood: "#6a6a76" }, { metal: "#e8dfc6", wood: "#7a5a3a" },
    { metal: "#2c2832", wood: "#1b1822" }, { metal: "#f3edd4", wood: "#c8b27a" },
    { metal: "#f6c45e", wood: "#8a5a2a" }, { metal: "#d2f0e2", wood: "#566a4c" },
  ];

  class SpriteAssetError extends Error {
    constructor(message, assetId, src) {
      super(message); this.name = "SpriteAssetError"; this.assetId = assetId; this.src = src;
    }
  }

  function selectedEntries(bundleId) {
    const out = [];
    for (const [id, def] of Object.entries(manifest.entries)) {
      // The game no longer decodes legacy player atlases, even for previews or
      // Wildkeeper shapes. Standalone archived art tools can still inspect them.
      if (window.Player3D?.only3D && (id.startsWith('player.') || id.startsWith('actor.form.'))) continue;
      if (def.bundle === bundleId ||
          (bundleId.startsWith("zone:") && (def.bundle === "world" || def.bundle === "actors")) ||
          (bundleId === "all")) out.push([id, def]);
    }
    return out;
  }

  function loadImage(assetId, def) {
    if (images.has(def.src)) return Promise.resolve(images.get(def.src));
    if (pending.has(def.src)) return pending.get(def.src);
    const promise = new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = async () => {
        /* `load` only means the response completed. decode() is the browser's
           explicit guarantee that the pixels are ready for immediate use. */
        if (typeof img.decode === "function") {
          try { await img.decode(); }
          catch (cause) {
            const why = cause && cause.message ? `: ${cause.message}` : "";
            reject(new SpriteAssetError(`Required sprite could not be decoded: ${assetId} (${def.src})${why}`, assetId, def.src));
            return;
          }
        }
        if (!img.naturalWidth || !img.naturalHeight) {
          reject(new SpriteAssetError(`Required sprite decoded without dimensions: ${assetId} (${def.src})`, assetId, def.src));
          return;
        }
        if (def.kind === "atlas") {
          const needW = def.cell[0] * def.cols, needH = def.cell[1] * def.rows;
          if (img.naturalWidth !== needW || img.naturalHeight !== needH) {
            reject(new SpriteAssetError(`Atlas ${assetId} is ${img.naturalWidth}x${img.naturalHeight}; expected exactly ${needW}x${needH}`, assetId, def.src));
            return;
          }
        }
        images.set(def.src, img); resolve(img);
      };
      img.onerror = () => reject(new SpriteAssetError(`Required sprite failed to load: ${assetId} (${def.src})`, assetId, def.src));
      // Changed artwork can keep the same catalog path. A content revision
      // refreshes browser caches without changing asset IDs or local paths.
      img.src = def.revision && location.protocol !== 'file:'
        ? def.src + (def.src.includes('?') ? '&' : '?') + 'v=' + encodeURIComponent(def.revision)
        : def.src;
    }).finally(() => pending.delete(def.src));
    pending.set(def.src, promise);
    return promise;
  }

  async function loadBundle(bundleId, onProgress) {
    if (loadedBundles.has(bundleId)) return;
    const defs = selectedEntries(bundleId);
    if (!defs.length) throw new SpriteAssetError(`Sprite bundle has no entries: ${bundleId}`, bundleId, "");
    const unique = [];
    const seen = new Set();
    for (const pair of defs) if (!seen.has(pair[1].src)) { seen.add(pair[1].src); unique.push(pair); }
    let done = 0, next = 0;
    // Large environment libraries must not exhaust Chromium's request buffers.
    // Keep parallel decoding bounded while retaining source de-duplication.
    await Promise.all(Array.from({length:Math.min(12,unique.length)},async()=>{
      while(next<unique.length){
        const [id,def]=unique[next++];await loadImage(id,def);
        done++;if(onProgress)onProgress(done,unique.length,id);
      }
    }));
    for (const [, def] of unique) bundleOwnedSources.add(def.src);
    // Boss poses are cut out before combat, never on their first strike frame.
    for(const [id,def] of defs)if(def.bossArt||def.act1Art||def.act2Art||def.act3Art||def.act5Art||def.act4Art)for(let i=0;i<def.cols*def.rows;i++){
      const frame=getFrame(id,i);isolatedFrame(frame);if(def.hitShapes)bossFlashFrame(frame);
    }
    // Northern event coverage contains many small clips. Immutable bitmaps
    // release their staging 2D contexts before combat and avoid canvas uploads.
    if(typeof createImageBitmap==='function')for(const [id,def] of defs)if(def.act1Art)for(let i=0;i<def.cols*def.rows;i++){
      const key=id+'|'+i,frame=isolatedFrameCache.get(key),flash=bossFlashCache.get(key);
      if(frame?.image?.getContext){const canvas=frame.image;frame.image=await createImageBitmap(canvas);canvas.width=canvas.height=1;}
      if(flash?.getContext){const bitmap=await createImageBitmap(flash);bitmap.frameOffsetX=flash.frameOffsetX;bitmap.frameOffsetY=flash.frameOffsetY;bossFlashCache.set(key,bitmap);flash.width=flash.height=1;}
    }
    loadedBundles.add(bundleId);
  }

  function definition(id) {
    const def = manifest.entries[id];
    if (!def) throw new SpriteAssetError(`Unknown sprite id: ${id}`, id, "");
    return def;
  }

  function getFrame(id, frameKey) {
    const def = definition(id), img = images.get(def.src);
    if (!img) throw new SpriteAssetError(`Sprite requested before its bundle loaded: ${id}`, id, def.src);
    if (def.kind === "static") {
      return { id, image: img, sx: 0, sy: 0, sw: img.naturalWidth, sh: img.naturalHeight,
        anchorX: def.anchor[0], anchorY: def.anchor[1] };
    }
    const index = frameKey;
    const frameCount = def.cols * def.rows;
    if (!Number.isInteger(index) || index < 0 || index >= frameCount) {
      throw new SpriteAssetError(`Sprite frame ${String(frameKey)} is outside ${id} (0..${frameCount - 1})`, id, def.src);
    }
    const col = index % def.cols, row = Math.floor(index / def.cols);
    return { id, image: img, sx: col * def.cell[0], sy: row * def.cell[1], sw: def.cell[0], sh: def.cell[1],
      anchorX: def.anchor[0], anchorY: def.anchor[1], index };
  }

  function drawFrame(ctx, frame, x, y, opts) {
    opts = opts || {};
    const scale = opts.scale == null ? 1 : opts.scale;
    const flip = opts.flip ? -1 : 1;
    ctx.save();
    ctx.translate(x, y); ctx.scale(flip * scale, scale);
    if (opts.alpha != null) ctx.globalAlpha *= opts.alpha;
    const source = opts.tint ? tinted(frame, opts.tint) : isolatedFrame(frame);
    if (source.image) {
      ctx.drawImage(source.image, source.sx, source.sy, source.sw, source.sh,
        -source.anchorX, -source.anchorY, source.sw, source.sh);
    } else {
      ctx.drawImage(source, -frame.anchorX+(source.frameOffsetX||0), -frame.anchorY+(source.frameOffsetY||0));
    }
    ctx.restore();
  }

  function isolatedFrame(frame) {
    /* Scaling a sub-rectangle directly from an atlas lets Canvas filtering
       sample neighboring cells. Copy the exact authored cell first so long
       weapons at a cell edge cannot pull pixels from another pose. */
    const def = definition(frame.id);
    if (!def.isolateFrameSampling || !frame.image ||
        frame.sw === frame.image.naturalWidth && frame.sh === frame.image.naturalHeight) return frame;
    const key = `${frame.id}|${frame.index}`;
    if (isolatedFrameCache.has(key)) return isolatedFrameCache.get(key);
    const c = document.createElement("canvas");
    const bounds=(def.act1Art||def.act2Art||def.act3Art||def.act5Art||def.act4Art)?def.hitShapes?.[frame.index]?.bounds:null;
    const ox=bounds?Math.max(0,bounds[0]-2):0,oy=bounds?Math.max(0,bounds[1]-2):0;
    c.width=bounds?Math.min(frame.sw,bounds[2]+2)-ox:frame.sw;c.height=bounds?Math.min(frame.sh,bounds[3]+2)-oy:frame.sh;
    c.getContext("2d").drawImage(frame.image, frame.sx+ox, frame.sy+oy, c.width, c.height, 0, 0, c.width, c.height);
    const isolated = { ...frame, image: c, sx: 0, sy: 0,sw:c.width,sh:c.height,anchorX:frame.anchorX-ox,anchorY:frame.anchorY-oy };
    isolatedFrameCache.set(key, isolated);
    return isolated;
  }

  /* Cliff sheets are painted sprites, not exact tile-sized parallelograms:
     their end columns are feathered and their four depths vary slightly.
     The packer records each opaque interior in the manifest. Affine-fit those
     existing pixels to a 32x16 tile edge and the actual height drop without
     reading a sprite canvas (which is origin-tainted when opened from disk).
     A one-pixel bleed under neighboring sprites seals the antialiased joins. */
  function cliffFit(frame) {
    if (frame.sw !== 64 || frame.sh !== 128 ||
        !Number.isInteger(frame.index) || frame.index < 0 || frame.index > 7) {
      throw new SpriteAssetError(`Invalid terrain cliff frame/height: ${frame.id}`, frame.id, "");
    }
    const def = definition(frame.id), fits = def.cliffFits;
    const fit = Array.isArray(fits) && fits.length === 8 && fits[frame.index];
    if (!fit || !Number.isInteger(fit.lo) || !Number.isInteger(fit.width) ||
        fit.lo < 0 || fit.width <= 0 || fit.lo + fit.width > frame.sw ||
        !Number.isFinite(fit.slope) || !Number.isFinite(fit.top) ||
        Math.abs(fit.top) >= frame.sh || !Number.isFinite(fit.depth) ||
        fit.depth <= 0 || fit.depth > frame.sh) {
      throw new SpriteAssetError(`Missing or invalid cliff fit for frame ${frame.index}: ${frame.id}`, frame.id, def.src);
    }
    return fit;
  }
  function drawCliff(ctx, frame, x, y, height) {
    if(!Number.isFinite(height)||height<=0)throw new SpriteAssetError(`Invalid terrain cliff frame/height: ${frame.id}`,frame.id,'');
    const fit=cliffFit(frame);
    const left = frame.index < 4, bleed = 1;
    const scaleX = (32 + 2 * bleed) / fit.width;
    const scaleY = (height + 2 * bleed) / fit.depth;
    const slope = left ? -.5 : .5;
    ctx.save();
    ctx.transform(scaleX, slope * scaleX - fit.slope * scaleY, 0, scaleY,
      x - (left ? 32 : 0) - bleed,
      y + (left ? 16 + bleed * .5 : -bleed * .5) - fit.top * scaleY - bleed);
    ctx.drawImage(frame.image, frame.sx + fit.lo, frame.sy, fit.width, frame.sh,
      0, 0, fit.width, frame.sh);
    ctx.restore();
  }

  const cliffTextures=new Map();
  function drawCliffPolygon(ctx,frame,points,cam) {
    const key=frame.id+'|'+frame.index,fit=cliffFit(frame);
    let texture=cliffTextures.get(key);
    if(!texture) {
      texture=document.createElement('canvas');texture.width=32;texture.height=64;
      const g=texture.getContext('2d'),scaleY=64/fit.depth;
      g.setTransform(32/fit.width,-fit.slope*scaleY,0,scaleY,0,-fit.top*scaleY);
      g.drawImage(frame.image,frame.sx+fit.lo,frame.sy,fit.width,frame.sh,0,0,fit.width,frame.sh);
      cliffTextures.set(key,texture);
    }
    const [a,b,c,d]=points.map(p=>({x:p.sx-cam.x,y:p.sy-cam.y}));
    for(const [p,q,r,ux,uy,vx,vy] of [[a,b,c,(b.x-a.x)/32,(b.y-a.y)/32,(c.x-b.x)/64,(c.y-b.y)/64],[a,c,d,(c.x-d.x)/32,(c.y-d.y)/32,(d.x-a.x)/64,(d.y-a.y)/64]]) {
      if(Math.abs(ux*vy-uy*vx)<1e-9)continue;
      ctx.save();ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.lineTo(r.x,r.y);ctx.closePath();ctx.clip();
      ctx.transform(ux,uy,vx,vy,a.x,a.y);ctx.drawImage(texture,0,0);ctx.restore();
    }
  }

  function tinted(frame, color) {
    const key = `${frame.id}|${frame.index || 0}|${color}`;
    if (tintCache.has(key)) return tintCache.get(key);
    const def=definition(frame.id),act2=def.act1Art||def.act2Art||def.act3Art||def.act5Art||def.act4Art,source=act2?isolatedFrame(frame):frame;
    const c = def.act1Art&&typeof OffscreenCanvas==='function'?new OffscreenCanvas(source.sw,source.sh):document.createElement("canvas"); c.width = source.sw; c.height = source.sh;
    c.frameOffsetX=frame.anchorX-source.anchorX;c.frameOffsetY=frame.anchorY-source.anchorY;
    const cx = c.getContext("2d");
    cx.drawImage(source.image, source.sx, source.sy, source.sw, source.sh, 0, 0, source.sw, source.sh);
    cx.globalCompositeOperation = act2?"source-atop":"color"; cx.globalAlpha = act2?.3:.46; cx.fillStyle = color; cx.fillRect(0, 0, c.width, c.height);
    cx.globalAlpha = 1; cx.globalCompositeOperation = "destination-in";
    cx.drawImage(source.image, source.sx, source.sy, source.sw, source.sh, 0, 0, source.sw, source.sh);
    const result=c.transferToImageBitmap?c.transferToImageBitmap():c;
    result.frameOffsetX=c.frameOffsetX;result.frameOffsetY=c.frameOffsetY;
    tintCache.set(key, result);
    tintCacheSources.set(key, { src: definition(frame.id).src, spec: `${frame.id}|${color}` });
    if(act2){act2TintKeys.push(key);if(act2TintKeys.length>96){const expired=act2TintKeys.shift();tintCache.delete(expired);tintCacheSources.delete(expired);}}
    return result;
  }

  function makeIcon(assetId, frameKey, size) {
    const frame = getFrame(assetId, frameKey);
    const c = document.createElement("canvas");
    c.width = size || frame.sw; c.height = size || frame.sh;
    const cx = c.getContext("2d"); cx.imageSmoothingEnabled = true; cx.imageSmoothingQuality = "high";
    cx.drawImage(frame.image, frame.sx, frame.sy, frame.sw, frame.sh, 0, 0, c.width, c.height);
    return c;
  }

  function tierOfBase(id) { const m = id && /_t(\d+)$/.exec(id); return m ? +m[1] : null; }
  function tierMat(t) { return TIER_MATS[Math.max(0, Math.min(TIER_MATS.length - 1, t | 0))]; }

  function itemIconInfo(item) {
    const maps = manifest.maps;
    item = item || {};
    const base = DATA.BASES[item.baseId], supply = DATA.CONSUMABLES[item.baseId];
    const glyph = DATA.GLYPHS[item.glyph || item.baseId];
    const variant = (key, tint) => {
      const index = maps.itemVariants[key];
      if (index == null) throw new SpriteAssetError(`Missing item artwork: ${key}`, "ui.items.variants");
      return { assetId: "ui.items.variants", index, ...(tint ? { tint } : {}) };
    };
    // Resolve saved items from their identity first. Stale icon fields must never
    // turn a jewel into a cache or let a rolled item level change its base art.
    const iconOnly = !base && !supply && !glyph;
    if (item.uniqueId === "uj_oak") return { assetId: "ui.items.oak", index: 0 };
    if (item.kind === "jewel" || item.baseId === "jewel" || (iconOnly && item.icon === "jewel")) return variant("jewel", item.jcol || "#b060d0");
    if (glyph || item.kind === "glyph" || (iconOnly && item.icon === "glyph")) return { assetId: "ui.items.misc", index: maps.miscIcons.glyph, tint: glyph?.color || "#7fd8c0" };
    if (item.kind === "charm" || item.charmSize || /^charm/.test(item.baseId || "")) {
      const size = item.charmSize || (item.baseId || "").replace(/^charm_/, "") || "small";
      return variant("charm_" + (DATA.CHARM_BASES[size] ? size : "small"));
    }
    const icon = base?.icon || supply?.icon || item.icon;
    if (supply) {
      if (item.baseId === "hp1" || item.baseId === "mp1") return variant(item.baseId);
      if (["potP", "potG", "scrollB"].includes(icon)) return variant(icon);
      return { assetId: "ui.items.misc", index: maps.miscIcons[icon] };
    }
    const special = {
      cap: "cap", quiltvest: "quiltvest", hauberk: "hauberk", ljgloves: "ljgloves",
      warboots: "warboots", sash: "sash", buckler: "buckler", cudgel: "cudgel", flangedmace: "flangedmace",
    }[item.baseId];
    if (special) return variant(special);
    const col = maps.itemCategories[icon];
    if (col != null) {
      let tier = tierOfBase(item.baseId);
      if (tier == null) tier = base?.materialTier;
      if (tier == null) {
        const levels = [1, 4, 8, 13, 19, 26, 34, 43, 52, 61, 70, 80, 90, 99];
        tier = Math.max(0, levels.filter(level => level <= (base?.ilvl || 1)).length - 1);
      }
      tier = Math.max(0, Math.min(13, tier));
      const twoHand = base ? base.twoHand : item.twoHand;
      if (twoHand && ["sword", "axe", "mace"].includes(icon)) return variant(icon + "2h", tierMat(tier));
      if (["helm", "chest", "gloves", "boots"].includes(icon) && tierOfBase(item.baseId) != null) {
        const family = tier <= 2 ? "leather" : tier === 4 ? "mail" : "plate";
        return variant(icon + "_" + family, tier > 2 ? tierMat(tier) : null);
      }
      return { assetId: "ui.items.equipment", index: tier * Object.keys(maps.itemCategories).length + col };
    }
    if (["potP", "potG", "scrollB"].includes(icon)) return variant(icon);
    if (maps.miscIcons[icon] != null) return { assetId: "ui.items.misc", index: maps.miscIcons[icon] };
    throw new SpriteAssetError(`No item artwork for ${item.baseId || icon || "unknown item"}`, "ui.items.variants");
  }

  function itemIcon(item, size) {
    const info = itemIconInfo(item), frame = getFrame(info.assetId, info.index);
    const c = document.createElement("canvas"); c.width = c.height = size || 64;
    const cx = c.getContext("2d"); cx.imageSmoothingEnabled = true; cx.imageSmoothingQuality = "high";
    if (info.tint) cx.drawImage(tinted(frame, info.tint), 0, 0, c.width, c.height);
    else cx.drawImage(frame.image, frame.sx, frame.sy, frame.sw, frame.sh, 0, 0, c.width, c.height);
    c.className = "item-icon"; c.setAttribute("role", "img");
    c.setAttribute("aria-label", (item.identified === false ? item.baseName : item.name) || item.baseName || DATA.CONSUMABLES[item.baseId]?.name || DATA.BASES[item.baseId]?.name || "Item");
    return c;
  }
  function skillIcon(name, size) {
    const index = manifest.maps.skillIcons[name] == null ? manifest.maps.skillIcons.basic : manifest.maps.skillIcons[name];
    return makeIcon("ui.skills", index, size || 44);
  }
  function goldFrame() { return getFrame("ui.items.misc", manifest.maps.miscIcons.gold); }

  function poseRow(pose) {
    const state = pose.state || "idle", t = Math.max(0, Math.min(1, pose.t || 0));
    if (state === "walk" || state === "run") {
      const ph = pose.ex && pose.ex.walkPh != null ? pose.ex.walkPh : (pose.t || 0) * 8;
      return (Math.floor(ph / Math.PI) & 1) ? 2 : 1;
    }
    if (state === "attack") return t < .46 ? 3 : 4;
    if (state === "cast") return 5;
    if (state === "reach" || state === "search") return t>.15&&t<.85?5:0;
    if (state === "hit") return 6;
    if (state === "death") return t < .58 ? 7 : 8;
    return 0;
  }
  function direction(ang) { return Math.round((((ang || 0) % TAU + TAU) % TAU) / (TAU / 8)) % 8; }

  const PLAYER_PLANES = ["rear", "body", "worn", "held", "grip", "front"];
  const PLAYER_SLOT_ORDER = ["chest", "head", "shield", "main", "unarmed"];
  const PLAYER_VISIBLE_SLOTS = ["main", "shield", "head", "chest"];
  const PLAYER_RIG_REVISION = "grip-rig-v1";
  const validPoint = v => Array.isArray(v) && v.length === 2 && v.every(Number.isFinite);
  const validROI = v => Array.isArray(v) && v.length === 4 && v.every(Number.isFinite);

  function requiredPlayerRig(classId) {
    const rigs = manifest.maps.playerRigs;
    if (!rigs || !rigs[classId]) throw new SpriteAssetError(`No authored player rig for class ${classId}`, classId, "");
    const rig = rigs[classId];
    if (rig.revision !== PLAYER_RIG_REVISION) {
      throw new SpriteAssetError(`Player rig ${classId} revision is ${rig.revision || "missing"}; expected ${PLAYER_RIG_REVISION}`, classId, "");
    }
    if (!rig.body) throw new SpriteAssetError(`Player rig ${classId} has no neutral body`, classId, "");
    if (!Array.isArray(rig.frames) || rig.frames.length !== 72) {
      throw new SpriteAssetError(`Player rig ${classId} must declare exactly 72 frame metadata records`, classId, "");
    }
    for (let i = 0; i < rig.frames.length; i++) {
      const meta = rig.frames[i];
      if (!meta || !validPoint(meta.mainGrip) || !validPoint(meta.offGrip) ||
          !validROI(meta.headROI) || !validROI(meta.chestROI)) {
        throw new SpriteAssetError(`Player rig ${classId} frame ${i} has malformed sockets/ROIs`, classId, "");
      }
    }
    if (rig.coverageMode !== "declared-partial-v1" && (!rig.unarmed || !(
      normalizeLayerRefs(rig.unarmed.masks && rig.unarmed.masks.grip, null).length ||
      normalizeLayerRefs(rig.unarmed.grip, null).length
    ))) throw new SpriteAssetError(`Player rig ${classId} has no authored unarmed grip plane or grip masks`, classId, "");
    return rig;
  }

  function requiredFamily(rig, classId, slot, family) {
    if (!family) return null;
    const group = rig[slot];
    const def = group && group[family];
    if (!def) {
      const unavailable = rig.unavailable && rig.unavailable[slot];
      const declaredUnavailable = Array.isArray(unavailable) && unavailable.includes(family);
      const reason = declaredUnavailable && rig.coverageMode === "declared-partial-v1"
        ? "is not included in the installed base equipment sprite set"
        : "has no authored sprite family";
      throw new SpriteAssetError(
        `Player equipment ${classId}/${slot}/${family} ${reason}; the current equipment was kept`,
        `${classId}.${slot}.${family}`, "",
      );
    }
    const hasRuntimePlane = plane => {
      const masks = def.masks && def.masks[plane];
      return normalizeLayerRefs(masks, null).length > 0 || normalizeLayerRefs(def[plane], null).length > 0;
    };
    if ((slot === "main" || slot === "shield") && (!hasRuntimePlane("held") || !hasRuntimePlane("grip"))) {
      throw new SpriteAssetError(`${classId} ${slot} family ${family} requires authored held and grip planes (or authored masks)`, `${classId}.${slot}.${family}`, "");
    }
    if ((slot === "head" || slot === "chest") && !hasRuntimePlane("worn")) {
      throw new SpriteAssetError(`${classId} ${slot} family ${family} requires an authored worn plane or worn masks`, `${classId}.${slot}.${family}`, "");
    }
    return def;
  }

  function baseForItem(item) {
    return item && item.baseId && DATA.BASES[item.baseId] || null;
  }

  function uniqueForItem(item) {
    return item && item.uniqueId && DATA.UNIQUES && DATA.UNIQUES.find(u => u.id === item.uniqueId) || null;
  }

  function setForItem(item) {
    return item && item.setItemId && DATA.SET_ITEMS && DATA.SET_ITEMS.find(s => s.id === item.setItemId) || null;
  }

  function materialForItem(item, materialTier) {
    const named = uniqueForItem(item) || setForItem(item);
    const art = named && named.art || null;
    const base = tierMat(materialTier);
    return {
      metal: art && art.metal || base.metal,
      wood: art && art.wood || base.wood,
      trim: art && art.trim || art && art.glow || base.metal,
      accent: art && art.trim || art && art.glow || base.metal,
      glow: art && art.glow || art && art.trim || base.metal,
      cloth: art && art.cloth || art && art.metal || base.metal,
      leather: art && art.leather || art && art.wood || base.wood,
    };
  }

  function visualItem(slot, item) {
    if (!item) return null;
    const base = baseForItem(item);
    if (!base) throw new SpriteAssetError(`Equipped ${slot} item has no known base: ${item.baseId || "(missing id)"}`, item.baseId || slot, "");
    if (base.slot !== (slot === "shield" ? "off" : slot)) {
      throw new SpriteAssetError(`Equipped ${slot} item ${base.id} belongs in ${base.slot}`, base.id, "");
    }
    const named = uniqueForItem(item) || setForItem(item);
    const family = item.playerVisualFamily || base.playerVisualFamily;
    const materialTier = item.materialTier == null ? base.materialTier : item.materialTier;
    const spriteOverride = item.playerSpriteOverride || named && named.playerSpriteOverride || base.playerSpriteOverride || null;
    if (!family) throw new SpriteAssetError(`Equipped item ${base.id} has no playerVisualFamily`, base.id, "");
    if (!Number.isInteger(materialTier) || materialTier < 0 || materialTier >= TIER_MATS.length) {
      throw new SpriteAssetError(`Equipped item ${base.id} has invalid materialTier ${String(materialTier)}`, base.id, "");
    }
    return { slot, family, materialTier, material: materialForItem(item, materialTier), spriteOverride };
  }

  /* Pure, strict equipment-to-art resolution.  Only the four actor-visible
     slots are inspected; transformations deliberately suppress every layer. */
  function resolvePlayerVisual(classId, equip, buffs) {
    equip = equip || {};
    const form = (buffs || []).find(b => b && b.id && b.id.startsWith("form_"));
    if (form) {
      if (classId !== "wildkeeper") throw new SpriteAssetError(`Only Wildkeeper may use authored form ${form.id}`, form.id, "");
      const formAssetId = manifest.maps.forms && manifest.maps.forms[form.id];
      if (!formAssetId) throw new SpriteAssetError(`No authored Wildkeeper form sprite: ${form.id}`, form.id, "");
      return { kind: "form", classId, form: form.id, formAssetId, equipment: {} };
    }
    const rig = requiredPlayerRig(classId);
    const equipment = {
      main: visualItem("main", equip.main),
      shield: visualItem("shield", equip.off),
      head: visualItem("head", equip.head),
      chest: visualItem("chest", equip.chest),
    };
    if (equipment.main && equip.main && equip.main.twoHand && equipment.shield) {
      throw new SpriteAssetError(`Two-handed ${equip.main.baseId} cannot be composed with a shield`, equip.main.baseId, "");
    }
    const starterIds = manifest.maps.playerEquipmentCoverage &&
      manifest.maps.playerEquipmentCoverage.starterBaseIds &&
      manifest.maps.playerEquipmentCoverage.starterBaseIds[classId];
    const starterAssetId = rig.starterLoadout || manifest.maps.playerStarterLoadouts && manifest.maps.playerStarterLoadouts[classId];
    const starterMatch = !!(starterIds && starterAssetId &&
      equip.main && equip.main.baseId === starterIds.main &&
      equip.chest && equip.chest.baseId === starterIds.chest &&
      !equip.off && !equip.head);
    // Installed equipment layers preserve the neutral body's opaque shading.
    // In particular, adding the Ember Witch's Quilted Vest must not replace
    // her clean body with the older, perforated flattened starter artwork.
    const modularAvailable = PLAYER_VISIBLE_SLOTS.every(slot => {
      const item = equipment[slot];
      if (!item) return true;
      const family = item.spriteOverride || item.family;
      const declared = rig.available && rig.available[slot];
      return Array.isArray(declared) && declared.includes(family) ||
        Object.prototype.hasOwnProperty.call(rig[slot] || {}, family);
    });
    const useFlattenedStarter = starterMatch && !modularAvailable;
    if (useFlattenedStarter) {
      const starterDef = definition(starterAssetId);
      if (!starterDef.starterBaseIds || starterDef.starterBaseIds.main !== starterIds.main ||
          starterDef.starterBaseIds.chest !== starterIds.chest ||
          starterDef.rigClass !== classId || starterDef.rigPlane !== "flattened") {
        throw new SpriteAssetError(
          `Flattened starter sprite contract is malformed for ${classId}`,
          starterAssetId, starterDef.src,
        );
      }
    } else {
      /* Validate installed families even for starter items. An incomplete or
         malformed modular family must fail atomically, not silently fall back
         to a flattened sprite. Classes with planned families keep their exact
         starter fallback above. */
      for (const slot of PLAYER_VISIBLE_SLOTS) {
        if (equipment[slot]) requiredFamily(rig, classId, slot,
          equipment[slot].spriteOverride || equipment[slot].family);
      }
    }
    return {
      kind: "player", classId, rigRevision: rig.revision,
      bodyAssetId: rig.body, unarmed: rig.unarmed || null, equipment,
      flattenedAssetId: useFlattenedStarter ? starterAssetId : null,
    };
  }

  function normalizeLayerRefs(value, tintRole) {
    if (!value) return [];
    if (Array.isArray(value)) return value.flatMap(v => normalizeLayerRefs(v, tintRole));
    if (typeof value === "string") return [{ assetId: value, tintRole: tintRole || null }];
    if (typeof value !== "object") return [];
    if (value.assetId || value.id) return [{ assetId: value.assetId || value.id, tintRole: value.tintRole || tintRole || null }];
    const out = [];
    for (const [role, ref] of Object.entries(value)) out.push(...normalizeLayerRefs(ref, tintRole || role));
    return out;
  }

  function familyLayers(def, plane) {
    if (!def) return [];
    const masks = def.masks && def.masks[plane];
    /* Material masks are full-alpha luminance copies of the authored layer,
       not additive highlights. Draw the role masks instead of the base plane
       when present; otherwise retain the authored untinted plane. */
    const maskRefs = normalizeLayerRefs(masks, null);
    return maskRefs.length ? maskRefs : normalizeLayerRefs(def[plane], null);
  }

  function layerTint(itemVisual, tintRole) {
    return tintRole && itemVisual && itemVisual.material[tintRole] || null;
  }

  function getPlayerDrawPlan(visual, pose) {
    if (!visual || visual.kind === "form" || visual.form) return { form: true, layers: [] };
    const rig = requiredPlayerRig(visual.classId);
    if (visual.rigRevision && visual.rigRevision !== rig.revision) {
      throw new SpriteAssetError(`Player visual revision ${visual.rigRevision} does not match ${visual.classId} rig ${rig.revision}`, visual.classId, "");
    }
    const row = poseRow(pose || {}), dir = direction(pose && pose.ang), index = row * 8 + dir;
    const meta = rig.frames[index];
    if (!meta || !validPoint(meta.mainGrip) || !validPoint(meta.offGrip) || !validROI(meta.headROI) || !validROI(meta.chestROI)) {
      throw new SpriteAssetError(`Player rig ${visual.classId} frame ${index} has malformed sockets/ROIs`, visual.classId, "");
    }
    if (visual.flattenedAssetId) {
      return {
        classId: visual.classId, rigRevision: rig.revision, index, row, direction: dir,
        frameMeta: meta,
        layers: [{ plane: "body", slot: "starter", assetId: visual.flattenedAssetId, tintRole: null, tint: null }],
      };
    }
    const defs = {};
    for (const slot of PLAYER_VISIBLE_SLOTS) {
      const selected = visual.equipment && visual.equipment[slot];
      if (selected) defs[slot] = requiredFamily(rig, visual.classId, slot, selected.spriteOverride || selected.family);
    }
    const layers = [];
    for (const plane of PLAYER_PLANES) {
      if (plane === "body") {
        layers.push({ plane, slot: "body", assetId: visual.bodyAssetId || rig.body, tintRole: null, tint: null });
        continue;
      }
      for (const slot of PLAYER_SLOT_ORDER) {
        const itemVisual = visual.equipment && visual.equipment[slot];
        let def = defs[slot];
        if (slot === "unarmed" && !(visual.equipment && visual.equipment.main)) def = rig.unarmed;
        for (const ref of familyLayers(def, plane)) {
          layers.push({ plane, slot, assetId: ref.assetId, tintRole: ref.tintRole,
            tint: layerTint(itemVisual, ref.tintRole) });
        }
      }
    }
    return { classId: visual.classId, rigRevision: rig.revision, index, row, direction: dir, frameMeta: meta, layers };
  }

  function playerAssetIds(visual) {
    if (!visual) return [];
    if (visual.kind === "form" || visual.form) return [visual.formAssetId || manifest.maps.forms[visual.form]].filter(Boolean);
    if (visual.flattenedAssetId) return [visual.flattenedAssetId];
    const rig = requiredPlayerRig(visual.classId), ids = new Set([visual.bodyAssetId || rig.body]);
    const addDef = def => {
      if (!def) return;
      for (const plane of ["rear", "worn", "held", "grip", "front"]) for (const ref of familyLayers(def, plane)) ids.add(ref.assetId);
    };
    if (!(visual.equipment && visual.equipment.main)) addDef(rig.unarmed);
    for (const slot of PLAYER_VISIBLE_SLOTS) {
      const v = visual.equipment && visual.equipment[slot];
      if (v) addDef(requiredFamily(rig, visual.classId, slot, v.spriteOverride || v.family));
    }
    return [...ids];
  }

  function playerSources(visual) {
    return new Set(playerAssetIds(visual).map(id => definition(id).src));
  }

  function playerTintSpecs(visual) {
    if (!visual || visual.kind === "form" || visual.form) return new Set();
    return new Set(getPlayerDrawPlan(visual, { state: "idle", t: 0, ang: 0, ex: {} }).layers
      .filter(layer => layer.tint).map(layer => `${layer.assetId}|${layer.tint}`));
  }

  function evictTintSource(src) {
    for (const [key, owner] of tintCacheSources) {
      if (owner.src !== src) continue;
      tintCache.delete(key);
      tintCacheSources.delete(key);
    }
  }

  function pruneInactivePlayerSources() {
    const keep = new Set(activePlayerSources);
    const keepTintSpecs = new Set(activePlayerTintSpecs);
    for (const src of preparedPlayerSources) keep.add(src);
    for (const spec of preparedPlayerTintSpecs) keepTintSpecs.add(spec);
    for (const request of playerLoadRequests.values())
      for (const src of request.sources) keep.add(src);
    for (const src of evictablePlayerSources) {
      if (keep.has(src) || bundleOwnedSources.has(src) || pending.has(src)) continue;
      images.delete(src);
      evictTintSource(src);
      for (const [key, frame] of isolatedFrameCache) {
        if (frame && frame.id && definition(frame.id).src === src) isolatedFrameCache.delete(key);
      }
      for(const [key,frame] of act1AuthoredFrames)if(definition(frame.id).src===src)act1AuthoredFrames.delete(key);
      for (const [key, parts] of playerWalkParts) {
        if (parts.src === src) playerWalkParts.delete(key);
      }
    }
    /* A material-only swap reuses the same authored mask source. Drop canvases
       tinted for the old tier even though that source remains active. */
    for (const [key, owner] of tintCacheSources) {
      if (!evictablePlayerSources.has(owner.src) || keepTintSpecs.has(owner.spec)) continue;
      tintCache.delete(key);
      tintCacheSources.delete(key);
    }
  }

  function schedulePlayerPrune() {
    Promise.resolve().then(pruneInactivePlayerSources);
  }

  async function loadPlayerLoadout(visual, onProgress) {
    const ids = playerAssetIds(visual);
    const sources = new Set(ids.map(id => definition(id).src));
    const requestId = ++playerLoadRequestSeq;
    discardedPlayerVisuals.delete(visual);
    if (preparedPlayerVisual && preparedPlayerVisual !== visual) {
      preparedPlayerVisual = null;
      preparedPlayerSources = new Set();
      preparedPlayerTintSpecs = new Set();
    }
    playerLoadRequests.set(requestId, { visual, sources });
    schedulePlayerPrune();
    let done = 0;
    try {
      await Promise.all(ids.map(id => {
        const def = definition(id);
        return loadImage(id, def).then(() => { done++; if (onProgress) onProgress(done, ids.length, id); });
      }));
    } catch (err) {
      playerLoadRequests.delete(requestId);
      if (preparedPlayerVisual === visual) {
        preparedPlayerVisual = null;
        preparedPlayerSources = new Set();
        preparedPlayerTintSpecs = new Set();
      }
      schedulePlayerPrune();
      throw err;
    }
    playerLoadRequests.delete(requestId);
    if (requestId === playerLoadRequestSeq && !discardedPlayerVisuals.has(visual)) {
      preparedPlayerVisual = visual;
      preparedPlayerSources = sources;
      preparedPlayerTintSpecs = playerTintSpecs(visual);
    }
    schedulePlayerPrune();
    return visual;
  }

  /* Release an uncommitted preload. Decoded family images and any tint
     canvases made from them are removed unless another request or the current
     actor still owns the same source. */
  function discardPlayerLoadout(visual) {
    if (!visual) return;
    discardedPlayerVisuals.add(visual);
    if (preparedPlayerVisual === visual) {
      preparedPlayerVisual = null;
      preparedPlayerSources = new Set();
      preparedPlayerTintSpecs = new Set();
    }
    schedulePlayerPrune();
  }

  /* Activation is separate from loading so a failed inventory transaction can
     keep drawing the prior, fully decoded loadout. */
  function activatePlayerLoadout(visual) {
    if (!visual) return visual;
    if (discardedPlayerVisuals.has(visual)) {
      throw new SpriteAssetError(`Discarded player loadout cannot be activated: ${visual.classId || visual.form || "unknown"}`, visual.classId || visual.form || "player", "");
    }
    if (visual.kind === "form" || visual.form) {
      if (preparedPlayerVisual === visual) {
        preparedPlayerVisual = null;
        preparedPlayerSources = new Set();
        preparedPlayerTintSpecs = new Set();
      }
      schedulePlayerPrune();
      return visual;
    }
    const sources = playerSources(visual);
    const alreadyActive = [...sources].every(src => activePlayerSources.has(src));
    if (preparedPlayerVisual !== visual && !alreadyActive) {
      throw new SpriteAssetError(`Player loadout was not the most recently prepared visual: ${visual.classId}`, visual.classId, "");
    }
    for (const src of sources) {
      if (!images.has(src)) {
        throw new SpriteAssetError(`Player loadout activated before decode completed: ${visual.classId} (${src})`, visual.classId, src);
      }
    }
    activePlayerSources.clear(); for (const src of sources) activePlayerSources.add(src);
    activePlayerTintSpecs.clear(); for (const spec of playerTintSpecs(visual)) activePlayerTintSpecs.add(spec);
    if (preparedPlayerVisual === visual) {
      preparedPlayerVisual = null;
      preparedPlayerSources = new Set();
      preparedPlayerTintSpecs = new Set();
    }
    discardedPlayerVisuals.delete(visual);
    pruneInactivePlayerSources();
    return visual;
  }

  function deactivatePlayerLoadout() {
    playerLoadRequestSeq++;
    for (const request of playerLoadRequests.values()) discardedPlayerVisuals.add(request.visual);
    preparedPlayerVisual = null;
    preparedPlayerSources = new Set();
    preparedPlayerTintSpecs = new Set();
    activePlayerSources.clear();
    activePlayerTintSpecs.clear();
    schedulePlayerPrune();
  }

  function drawPlayerPreview(ctx, classId, ang, opts) {
    const id = manifest.maps.playerPreviews && manifest.maps.playerPreviews[classId];
    if (!id) throw new SpriteAssetError(`No flattened title preview for player class ${classId}`, classId, "");
    const def = definition(id);
    const frameIndex = def.kind === "atlas" ? direction(ang) : 0;
    const scale = !opts || opts.scale == null ? PLAYER_BASE_SCALE : opts.scale;
    drawFrame(ctx, getFrame(id, frameIndex), 0, 0, {
      scale,
      alpha: opts && opts.alpha,
    });
    return true;
  }

  function drawPlayer(ctx, visual, pose) {
    const formAsset = visual.formAssetId || visual.form && manifest.maps.forms[visual.form];
    if (visual.kind === "form" || formAsset) return drawStaticActor(ctx, formAsset, pose, { scale: visual.scale || 1 });
    const walking = pose.state === "walk" || pose.state === "run";
    /* The old walkA/B paintings keep the same foot forward. Articulate the
       idle cutouts instead; all equipment samples that SAME idle frame so
       weapons, grips and armor remain registered to the moving torso. */
    const plan = getPlayerDrawPlan(visual, walking ? { ...pose, state: "idle" } : pose);
    const visualScale = visual.scale == null ? PLAYER_BASE_SCALE : visual.scale;
    const scale = visualScale * ((pose.ex && pose.ex.spriteScale) || 1);
    if (walking && !(pose.ex && pose.ex.airborne)) return drawWalkingPlayer(ctx, plan, pose, scale);
    for (const layer of plan.layers) drawFrame(ctx, getFrame(layer.assetId, plan.index), 0, 0, { scale, tint: layer.tint });
    return true;
  }

  function walkCutouts(frame, classId, dir, flattened) {
    const key = `${frame.id}|${dir}`;
    if (playerWalkParts.has(key)) return playerWalkParts.get(key);
    const rig = PLAYER_WALK_RIGS[classId][dir];
    const [seam, crotch, divide] = rig;
    const canvas = () => {
      const c = document.createElement("canvas"); c.width = frame.sw; c.height = frame.sh; return c;
    };
    const upper = canvas(), upperCtx = upper.getContext("2d");
    upperCtx.drawImage(frame.image, frame.sx, frame.sy, frame.sw, seam, 0, 0, frame.sw, seam);
    const legs = [canvas(), canvas()];
    const keeps = flattened && PLAYER_WALK_KEEPS[classId][dir] || [];
    const keepPath = new Path2D(), legOnly = new Path2D();
    legOnly.rect(0, 0, frame.sw, frame.sh);
    for (const polygon of keeps) {
      const p = new Path2D(); p.moveTo(polygon[0], polygon[1]);
      for (let i = 2; i < polygon.length; i += 2) p.lineTo(polygon[i], polygon[i + 1]);
      p.closePath(); keepPath.addPath(p); legOnly.addPath(p);
    }
    /* Clipping selects existing pixels only. Equipment that extends below
       the thigh seam remains in the untouched upper-body cutout. */
    if (keeps.length) {
      upperCtx.save(); upperCtx.clip(keepPath);
      upperCtx.drawImage(frame.image, frame.sx, frame.sy + seam, frame.sw, frame.sh - seam,
        0, seam, frame.sw, frame.sh - seam);
      upperCtx.restore();
    }
    for (let side = 0; side < 2; side++) {
      const path = new Path2D(), edge = side ? frame.sw : 0;
      path.moveTo(edge, seam); path.lineTo(crotch, seam);
      path.lineTo(divide, frame.sh); path.lineTo(edge, frame.sh); path.closePath();
      const lc = legs[side].getContext("2d");
      lc.clip(path); lc.clip(legOnly, "evenodd");
      lc.drawImage(frame.image, frame.sx, frame.sy, frame.sw, frame.sh, 0, 0, frame.sw, frame.sh);
    }
    const parts = { upper, legs, rig, src: definition(frame.id).src };
    playerWalkParts.set(key, parts);
    return parts;
  }

  function drawWalkingPlayer(ctx, plan, pose, scale) {
    const phase = ((pose.ex && pose.ex.walkPh != null ? pose.ex.walkPh : (pose.t || 0) * 8) % TAU + TAU) % TAU;
    const ang = plan.direction * TAU / 8;
    const fx = Math.cos(ang), fy = Math.sin(ang) * .55;
    const bob = -2.5 * (1 - Math.cos(phase * 2)) / 2;
    const feet = [phase, (phase + Math.PI) % TAU].map(ph => {
      const u = ph / TAU, swing = Math.max(0, (u - .5) * 2);
      return {
        travel: (u < .5 ? 1 - u * 4 : -Math.cos(swing * Math.PI)) * 22,
        lift: Math.sin(swing * Math.PI) * 13,
      };
    });
    ctx.save(); ctx.scale(scale, scale);
    for (const layer of plan.layers) {
      const frame = getFrame(layer.assetId, plan.index);
      if (layer.plane !== "body") {
        drawFrame(ctx, frame, 0, bob, { tint: layer.tint });
        continue;
      }
      const parts = walkCutouts(frame, plan.classId, plan.direction, layer.slot === "starter");
      const [seam, , , lx, ly, rx, ry] = parts.rig;
      const cx = (lx + rx) / 2, cy = (ly + ry) / 2;
      const contacts = [[lx, ly], [rx, ry]];
      const motion = contacts.map(([x, y], side) => {
        /* Remove the painted idle stance's forward offset, retaining its
           transverse foot spacing. Either foot can now pass the other. */
        const rest = ((x - cx) * fx + (y - cy) * fy) / (fx * fx + fy * fy);
        const foot = feet[side], travel = foot.travel - rest;
        return { travel, lift: foot.lift, y, depth: y + fy * travel };
      });
      ctx.save(); ctx.translate(-frame.anchorX, -frame.anchorY);
      const order = motion[0].depth <= motion[1].depth ? [0, 1] : [1, 0];
      for (const side of order) {
        const m = motion[side];
        const offset = y => {
          const t = Math.max(0, Math.min(1, (y - seam) / (m.y - seam - 6)));
          const weight = t * t * (3 - 2 * t);
          const knee = Math.sin(t * Math.PI) * m.lift * .3;
          return { x: fx * (m.travel * weight + knee),
            y: bob * (1 - weight) + fy * m.travel * weight - m.lift * weight };
        };
        /* Affine strips skin the original thigh/shin/boot pixels. No canvas
           readback or new painted geometry; this also works from file://. */
        for (let y = seam; y < frame.sh; y += 4) {
          const h = Math.min(4, frame.sh - y), a = offset(y), b = offset(y + h);
          const shear = (b.x - a.x) / h, stretch = (b.y - a.y) / h;
          ctx.save(); ctx.transform(1, 0, shear, 1 + stretch, a.x - shear * y, a.y - stretch * y);
          ctx.drawImage(parts.legs[side], 0, y, frame.sw, h, 0, y, frame.sw, h);
          ctx.restore();
        }
      }
      ctx.drawImage(parts.upper, 0, bob);
      ctx.restore();
    }
    ctx.restore();
    return true;
  }

  function actorMotion(pose, opts) {
    const state = pose.state || "idle", ex = pose.ex || {}, ang = pose.ang || 0;
    let bob = 0, advance = 0, rot = 0, sx = 1, sy = 1;
    if (state === "walk" || state === "run") {
      const ph = ex.walkPh == null ? (pose.t || 0) * 8 : ex.walkPh;
      bob = -Math.abs(Math.sin(ph)) * 2.2; rot = Math.sin(ph) * .025;
    } else if (state === "attack" || state === "cast") {
      const hit = Math.sin(Math.max(0, Math.min(1, pose.t || 0)) * Math.PI);
      advance = hit * (state === "cast" ? 3 : 7); bob = -hit * 2; rot = hit * .05;
    } else if(state==='reach'||state==='search'){
      const w=Math.sin(Math.max(0,Math.min(1,pose.t||0))*Math.PI);advance=w*3;bob=state==='search'?w*3:0;rot=w*.035;
    } else if (state === "hit") {
      advance = -Math.sin(Math.max(0, Math.min(1, pose.t || 0)) * Math.PI) * 4;
    } else if (state === "death") {
      const k = Math.max(0, Math.min(1, pose.t || 0)); rot = (Math.cos(ang) < 0 ? -1 : 1) * k * 1.05; sy = 1 - k * .12;
    } else bob = Math.sin((pose.t || 0) * 1.8) * .7;
    return { bob, advance, rot, sx, sy, ang, scale: (opts.scale == null ? 1 : opts.scale) * (ex.spriteScale || 1) };
  }

  function staticActorTransform(pose, opts) {
    const m = actorMotion(pose, opts), flip = Math.cos(m.ang) < -.15 ? -1 : 1;
    const cos = Math.cos(m.rot), sin = Math.sin(m.rot), scale = m.scale * .5;
    return { a: cos * m.sx * scale * flip, b: sin * m.sx * scale * flip,
      c: -sin * m.sy * scale, d: cos * m.sy * scale,
      e: Math.cos(m.ang) * m.advance, f: Math.sin(m.ang) * m.advance + m.bob };
  }

  function drawStaticActor(ctx, assetId, pose, opts) {
    const frame = getFrame(assetId, 0), m = staticActorTransform(pose, opts || {});
    ctx.save(); ctx.transform(m.a, m.b, m.c, m.d, m.e, m.f);
    drawFrame(ctx, frame, 0, 0);
    ctx.restore(); return true;
  }

  /* Drawing, overhead UI and picking share the same transform. The compiler
     records alpha bounds/masks so file:// games need no tainted pixel reads. */
  function frameGeometry(frame, x = 0, y = 0, scale = 1, m = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }) {
    const def = definition(frame.id), shape = def.hitShapes?.[frame.index] || def.hitShape;
    const rect = shape ? shape.bounds : [0, 0, frame.sw, frame.sh];
    const a = m.a * scale, b = m.b * scale, c = m.c * scale, d = m.d * scale;
    const e = x + m.e * scale - a * frame.anchorX - c * frame.anchorY;
    const f = y + m.f * scale - b * frame.anchorX - d * frame.anchorY;
    const xs = [], ys = [];
    for (const px of [rect[0], rect[2]]) for (const py of [rect[1], rect[3]]) {
      xs.push(a * px + c * py + e); ys.push(b * px + d * py + f);
    }
    return { frame, shape, a, b, c, d, e, f,
      left: Math.min(...xs), top: Math.min(...ys), right: Math.max(...xs), bottom: Math.max(...ys) };
  }

  function actorGeometry(opts, pose, x = 0, y = 0, scale = 1) {
    const animated=authoredFrame(pose);
    if(animated)return frameGeometry(animated,x,y,scale,authoredTransform(pose,opts));
    if(opts.bossArt)return frameGeometry(bossFrame(opts),x,y,scale,bossTransform(pose,opts));
    const id = actorAssetId(opts);
    return frameGeometry(getFrame(id, 0), x, y, scale, staticActorTransform(pose, opts));
  }

  function hitTestGeometry(g, x, y, padding = 0) {
    if (x < g.left - padding || x > g.right + padding || y < g.top - padding || y > g.bottom + padding) return false;
    const det = g.a * g.d - g.b * g.c;
    if (!det) return false;
    const dx = x - g.e, dy = y - g.f;
    const px = (g.d * dx - g.c * dy) / det, py = (g.a * dy - g.b * dx) / det;
    const padX = padding * Math.hypot(g.d, g.c) / Math.abs(det);
    const padY = padding * Math.hypot(g.b, g.a) / Math.abs(det), s = g.shape;
    if (!s) return px >= -padX && px < g.frame.sw + padX && py >= -padY && py < g.frame.sh + padY;
    for (let cy = Math.max(0, Math.floor((py - padY) / s.cell)); cy <= Math.min(s.rows - 1, Math.floor((py + padY) / s.cell)); cy++) {
      for (let cx = Math.max(0, Math.floor((px - padX) / s.cell)); cx <= Math.min(s.cols - 1, Math.floor((px + padX) / s.cell)); cx++) {
        const bit = cy * s.cols + cx;
        if (parseInt(s.bits.slice((bit >> 3) * 2, (bit >> 3) * 2 + 2), 16) & (1 << (bit & 7))) return true;
      }
    }
    return false;
  }

  function drawSummon(ctx, assetId, opts, pose) {
    const row = poseRow(pose);
    const sourceRow = row === 0 ? 0 : row <= 2 ? row : row <= 4 ? row : row === 8 ? 6 : row === 7 ? 5 : 0;
    const frame = getFrame(assetId, sourceRow * 8 + direction(pose.ang));
    const cfg = definition(assetId);
    const targetH = (cfg.displayHeight || 66) * (opts.scale || 1) * ((pose.ex && pose.ex.spriteScale) || 1);
    const scale = targetH / frame.sh;
    drawFrame(ctx, frame, 0, 0, { scale, tint: opts.pal && cfg.tintKey ? opts.pal[cfg.tintKey] : null });
    return true;
  }

  function drawActor(ctx, opts, pose) {
    const animated=authoredFrame(pose);
    if(animated){
      const m=authoredTransform(pose,opts);ctx.save();ctx.transform(m.a,m.b,m.c,m.d,m.e,m.f);
      ctx.globalAlpha*=(pose.ex.act1Animation||pose.ex.act4Animation||pose.ex.act5Animation||pose.ex.act3Animation||pose.ex.act2Animation).alpha;
      if(opts.bossFlash){const flash=bossFlashFrame(animated);ctx.drawImage(flash,-animated.anchorX+(flash.frameOffsetX||0),-animated.anchorY+(flash.frameOffsetY||0));}
      else if(pose.ex.act1Animation){
        // The authored transform already supplies position, facing and scale.
        // Draw the immutable cutout directly without another save/transform.
        const source=opts.act2Tint?tinted(animated,opts.act2Tint):isolatedFrame(animated);
        if(source.image)ctx.drawImage(source.image,-source.anchorX,-source.anchorY);
        else ctx.drawImage(source,-animated.anchorX+(source.frameOffsetX||0),-animated.anchorY+(source.frameOffsetY||0));
      }
      else drawFrame(ctx,animated,0,0,{tint:opts.act2Tint});
      ctx.restore();return true;
    }
    if(opts.bossArt){
      const m=bossTransform(pose,opts);ctx.save();ctx.transform(m.a,m.b,m.c,m.d,m.e,m.f);
      const frame=bossFrame(opts);ctx.globalAlpha*=(opts.bossDecoy?.38:1)*(pose.ex?.bossMotion?.alpha??1);
      if(opts.bossFlash)ctx.drawImage(bossFlashFrame(frame),-frame.anchorX,-frame.anchorY);
      else drawFrame(ctx,frame,0,0);
      ctx.restore();return true;
    }
    if (opts.playerVisual) return drawPlayer(ctx, opts.playerVisual, pose);
    if (opts.summonArt) {
      const id = manifest.maps.summons[opts.summonArt];
      if (!id) throw new SpriteAssetError(`No summon sprite: ${opts.summonArt}`, opts.summonArt, "");
      return drawSummon(ctx, id, opts, pose);
    }
    const id = actorAssetId(opts);
    if (!id) throw new SpriteAssetError(`No actor sprite: ${opts.npcArt || opts.kind}`, opts.npcArt || opts.kind, "");
    return drawStaticActor(ctx, id, pose, opts);
  }
  function actorAssetId(opts) {
    // An optional identity atlas may arrive after its data registration. Keep
    // the existing family silhouette usable until that atlas is in the manifest.
    return opts.npcArt ? manifest.maps.npcs[opts.npcArt] :
      manifest.maps.monsters[opts.monsterArtId] || manifest.maps.monsters[opts.kind];
  }

  const BOSS_POSES={idle:0,movement:1,windup:2,impact:3,recovery:4,death:5};
  function authoredFrame(pose){
    const a=pose.ex?.act1Animation||pose.ex?.act4Animation||pose.ex?.act5Animation||pose.ex?.act3Animation||pose.ex?.act2Animation;if(!a||!manifest.entries[a.asset])return null;
    if(!images.has(manifest.entries[a.asset].src))return null;
    const key=a.asset+'|'+a.index;
    if(pose.ex.act1Animation&&act1AuthoredFrames.has(key))return act1AuthoredFrames.get(key);
    const f=getFrame(a.asset,a.index),anchor=manifest.entries[a.asset].anchors?.[a.index];
    const frame=anchor?{...f,anchorX:anchor[0],anchorY:anchor[1]}:f;
    if(pose.ex.act1Animation)act1AuthoredFrames.set(key,frame);
    return frame;
  }
  function authoredTransform(pose,opts){
    // Authored limbs supply the action. Do not apply the generic whole-body
    // attack lean/death rotation a second time to an already collapsed frame.
    const scale=(opts.scale??1)*(pose.ex?.act1Animation?.scale??(opts.bossArt?.42:.5))*(pose.ex?.spriteScale||1);
    const flip=Math.cos(pose.ang||0)<-.15?-1:1;
    const rest=pose.ex?.act1Animation;
    if(rest?.rest&&!rest.still&&!motionPreference?.matches){
      const breath=Math.sin(rest.clock*2.1)*.006,walking=rest.walkPhase!==null;
      // Gentle breathing stays rooted at the feet. Travel follows actual
      // stride distance, using the same art, scale and transform for picking.
      return {a:scale*flip*(1-breath*.4),b:0,c:0,d:scale*(1+breath),e:0,f:walking?-Math.abs(Math.sin(rest.walkPhase))*1.5:0};
    }
    return {a:scale*flip,b:0,c:0,d:scale,e:0,f:0};
  }
  function bossFlashFrame(frame) {
    const key=frame.id+'|'+frame.index;
    if(bossFlashCache.has(key))return bossFlashCache.get(key);
    const def=definition(frame.id),source=(def.act1Art||def.act2Art||def.act3Art||def.act5Art||def.act4Art)?isolatedFrame(frame):frame;
    const c=document.createElement('canvas');c.width=source.sw;c.height=source.sh;
    c.frameOffsetX=frame.anchorX-source.anchorX;c.frameOffsetY=frame.anchorY-source.anchorY;
    const cx=c.getContext('2d');cx.drawImage(source.image,source.sx,source.sy,source.sw,source.sh,0,0,source.sw,source.sh);
    cx.globalCompositeOperation='source-atop';cx.globalAlpha=.62;cx.fillStyle='#fff';cx.fillRect(0,0,c.width,c.height);
    bossFlashCache.set(key,c);return c;
  }
  function bossFrame(opts) {
    const id=manifest.maps.bosses?.[opts.bossArt];
    if(!id)throw new SpriteAssetError(`No authored boss art: ${opts.bossArt}`,opts.bossArt,"");
    return getFrame(id,(opts.bossPhase||0)*6+(BOSS_POSES[opts.bossPose]??0));
  }
  function bossTransform(pose,opts) {
    const scale=(opts.scale||1)*.42,flip=Math.cos(pose.ang||0)<-.15?-1:1;
    // One affine transform drives the art, hit flash, compiled picking mask and UI.
    const moving=opts.bossPose==="movement",idle=opts.bossPose==="idle";
    const bob=motionPreference?.matches?0:moving?-Math.abs(Math.sin((pose.t||0)*8))*1.5:idle?Math.sin((pose.t||0)*1.8)*.5:0;
    const m=pose.ex?.bossMotion,rot=m?.rot||0,c=Math.cos(rot),s=Math.sin(rot),sx=m?.sx??1,sy=m?.sy??1;
    return {a:c*scale*flip*sx,b:s*scale*flip*sx,c:-s*scale*sy,d:c*scale*sy,e:m?.x||0,f:bob+(m?.y||0)};
  }

  function fatal(err) {
    console.error(err);
    if (window.AppBootstrap && typeof window.AppBootstrap.fatal === "function") {
      window.AppBootstrap.fatal(err, "Required sprite loading");
      return;
    }
    let box = document.getElementById("spriteFatal");
    if (!box) { box = document.createElement("div"); box.id = "spriteFatal"; document.body.appendChild(box); }
    box.style.cssText = "position:fixed;inset:0;z-index:100000;background:#120d0b;color:#e8d9bd;padding:8vh 10vw;font:16px/1.55 monospace;white-space:pre-wrap";
    box.textContent = `EMBERGRAVE COULD NOT LOAD REQUIRED SPRITES\n\n${err && err.message || err}\n\nNo procedural fallback was used.`;
  }

  return {
    STATES, WALL_H: manifest.wallHeight, WALL_VIEW_H: manifest.wallViewHeight,
    loadBundle, getFrame, drawFrame, drawCliff, drawCliffPolygon, makeIcon, itemIconInfo, itemIcon, skillIcon, goldFrame,
    drawActor, actorGeometry, frameGeometry, hitTestGeometry,
    drawPlayer, drawPlayerPreview, resolvePlayerVisual, loadPlayerLoadout, discardPlayerLoadout,
    activatePlayerLoadout, deactivatePlayerLoadout, getPlayerDrawPlan,
    tierMat, tierOfBase, fatal,
    maps: manifest.maps,
  };
})();
