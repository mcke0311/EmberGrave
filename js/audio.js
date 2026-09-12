/* =========================================================================
   EMBERGRAVE — audio.js
   Recorded soundtrack and UI click; regional ambience and SFX with WebAudio.
   Sfx.init() must be called from a user gesture (title-screen click).
   ========================================================================= */
"use strict";

const Sfx = (() => {
  let ac = null, master = null, sfxBus = null, musBus = null;
  let noiseBuf = null;
  let musicTimer = null, curTheme = null, musicNodes = [];
  let titleTrack = null, fadeTimer = null;
  const recorded = new Map();
  const TRACKS = Object.freeze({
    title: "Black Rune Oath.mp3",
    frosthaven: "Snowy Mountain Vigil.mp3",
    fallenNorth: "White Breath, Iron Sky.mp3",
    marshTown: "Dusk in the Empty Town.mp3",
    marsh: "Ash Dune Cathedral.mp3",
    desertTown: "Dusk in the Demonic Jungle.mp3",
    desert: "Sombras del Infierno.mp3",
    infernalTown: "Infernal Town at Dusk.mp3",
    cathedral: "Infernal Silence.mp3",
    breach: "Tour de Pierre Vieille.mp3",
    cinders: "Ancient Tower.mp3",
    cavernsOfShadow: "Caverns of Shadow.mp3",
    cavernsHeart: "Cavern's Heart.mp3",
    caveEchoes: "Cave Echoes.mp3",
    boss: "Hellscape Assault.mp3",
  });
  const EXPLORATION_TRACKS = Object.freeze(['cavernsOfShadow', 'cavernsHeart', 'caveEchoes']);
  function chooseZoneMusic(zone, previousTheme) {
    const theme = zone.musicTrack || zone.music || 'dungeon';
    if (zone.kind === 'town' || zone.kind === 'camp' || zone.fixedMusic) return theme;
    // Keep the regional recording in the pool; choose once on zone entry.
    const pool = [...EXPLORATION_TRACKS];
    if (TRACKS[theme] && !pool.includes(theme)) pool.push(theme);
    const choices = pool.filter(key => key !== previousTheme);
    return choices[Math.floor(Math.random() * choices.length)];
  }
  const EFFECTS = Object.freeze({
    click: "Dark Fantasy Game Mouse Click Sound.mp3",
    death: "Player Dies In Dark Fantasy Game. Yelling Sound.mp3",
  });
  const INTERACTIONS=Object.freeze(Object.fromEntries(['portalOpen','teleportTravel','questAccepted','questReady','questCompleted','questProgress'].map(id=>[id,'interactions/'+id+'.wav'])));
  const interactionBuffers=new Map(), interactionLoads=new Map(), interactionVoices=new Set(), interactionLast=new Map();
  function loadInteractionSounds() {
    if(!ac)return Promise.resolve([]);
    return Promise.all(Object.entries(INTERACTIONS).map(([id,path])=>{
      if(!interactionLoads.has(id))interactionLoads.set(id,fetch(new URL('assets/sound-effects/'+path,document.baseURI))
        .then(r=>{if(!r.ok)throw Error('Interaction sound HTTP '+r.status);return r.arrayBuffer();})
        .then(bytes=>ac.decodeAudioData(bytes)).then(buffer=>{interactionBuffers.set(id,buffer);return buffer;})
        .catch(err=>{console.warn('Could not load '+id,err);return null;}));
      return interactionLoads.get(id);
    }));
  }
  function playInteraction(id) {
    const buffer=interactionBuffers.get(id);
    if(!buffer || !ac || ac.state!=='running' || !vol.master || !vol.sfx)return;
    const now=ac.currentTime;
    if(now-(interactionLast.get(id)??-Infinity)<.12)return;
    interactionLast.set(id,now);
    const same=[...interactionVoices].filter(v=>v.id===id);
    const oldest=same.length>=2?same[0]:interactionVoices.size>=6?interactionVoices.values().next().value:null;
    if(oldest){oldest.source.stop();oldest.source.disconnect();oldest.gain.disconnect();interactionVoices.delete(oldest);}
    const source=ac.createBufferSource(),gain=ac.createGain();source.buffer=buffer;gain.gain.value=.85;
    source.connect(gain);gain.connect(sfxBus);const voice={id,source,gain};interactionVoices.add(voice);
    source.onended=()=>{source.disconnect();gain.disconnect();interactionVoices.delete(voice);};source.start();
  }
  let deathBytes = null, deathLoading = null, deathBuffer = null, deathVoice = null, deathRequest = 0;
  const DEATH_LEVEL = .4;
  function fetchDeath() {
    if (!deathBytes) deathBytes = fetch(new URL('assets/sound-effects/' + EFFECTS.death, document.baseURI))
      .then(response => { if (!response.ok) throw Error('Death sound: HTTP ' + response.status); return response.arrayBuffer(); })
      .catch(error => { deathBytes = null; console.warn('Could not load player death sound:', error); return null; });
    return deathBytes;
  }
  function loadDeath() {
    if (deathBuffer) return Promise.resolve(deathBuffer);
    if (!deathLoading) deathLoading = fetchDeath().then(bytes => bytes && ac.decodeAudioData(bytes.slice(0)))
      .then(buffer => (deathBuffer = buffer))
      .catch(error => { console.warn('Could not decode player death sound:', error); return null; })
      .finally(() => { deathLoading = null; });
    return deathLoading;
  }
  function playDeath() {
    const request = ++deathRequest, requestedAt = performance.now();
    const start = () => {
      if (request !== deathRequest || performance.now()-requestedAt > 1500 || !deathBuffer || ac.state !== 'running' || !vol.master || !vol.sfx) return;
      fadeDeath();
      const source = ac.createBufferSource(), gain = ac.createGain(), t = ac.currentTime;
      source.buffer = deathBuffer; source.connect(gain); gain.connect(sfxBus);
      // Keep the yell below full-scale with its own level and soft edges,
      // without altering the supplied source file.
      gain.gain.setValueAtTime(0,t);
      gain.gain.linearRampToValueAtTime(DEATH_LEVEL,t+.025);
      gain.gain.setValueAtTime(DEATH_LEVEL,t+Math.max(.025,deathBuffer.duration-.12));
      gain.gain.linearRampToValueAtTime(0,t+deathBuffer.duration);
      const voice = { source, gain }; deathVoice = voice;
      source.onended = () => { source.disconnect(); gain.disconnect(); if (deathVoice === voice) deathVoice = null; };
      source.start(t);
    };
    if (deathBuffer && ac?.state === 'running') start();
    else init().then(start);
  }
  function fadeDeath() {
    if (!deathVoice) return;
    const {source,gain}=deathVoice;deathVoice=null;
    const t=ac.currentTime;
    gain.gain.cancelAndHoldAtTime(t);gain.gain.linearRampToValueAtTime(0,t+.08);
    source.stop(t+.09);
  }
  function stopDeath() { ++deathRequest; fadeDeath(); }
  let clickBytes = null, clickLoading = null, clickBuffer = null, clickRequest = 0;
  const clickSources = new Set();
  function fetchClick() {
    if (!clickBytes) clickBytes = fetch(new URL('assets/sound-effects/' + EFFECTS.click, document.baseURI))
      .then(response => { if (!response.ok) throw Error('Click sound: HTTP ' + response.status); return response.arrayBuffer(); })
      .catch(error => { clickBytes = null; console.warn('Could not load UI click:', error); return null; });
    return clickBytes;
  }
  function loadClick() {
    if (clickBuffer) return Promise.resolve(clickBuffer);
    if (!clickLoading) clickLoading = fetchClick().then(bytes => bytes && ac.decodeAudioData(bytes.slice(0)))
      .then(buffer => (clickBuffer = buffer))
      .catch(error => { console.warn('Could not decode UI click:', error); return null; })
      .finally(() => { clickLoading = null; });
    return clickLoading;
  }
  function startClick() {
    if (!clickBuffer || ac.state !== 'running' || !vol.master || !vol.sfx) return;
    // Each activation gets a fresh source. Bound long tails during rapid clicking.
    if (clickSources.size >= 4) {
      const oldest = clickSources.values().next().value;
      oldest.stop(); oldest.disconnect(); clickSources.delete(oldest);
    }
    const source = ac.createBufferSource(); source.buffer = clickBuffer;
    source.connect(sfxBus); clickSources.add(source);
    source.onended = () => { source.disconnect(); clickSources.delete(source); };
    source.start();
  }
  function playClick() {
    const request = ++clickRequest;
    if (clickBuffer && ac?.state === 'running') { startClick(); return; }
    const requestedAt = performance.now();
    // Keep only the latest activation while loading/unlocking, never a delayed burst.
    init().then(() => {
      if (request === clickRequest && performance.now() - requestedAt < 1000) startClick();
    });
  }
  function applyRecordedVolume() {
    for (const track of recorded.values()) track.volume = Math.max(0, Math.min(1, vol.master * vol.music * (track._fade ?? 1)));
  }
  const vol = { master: 0.8, sfx: 0.9, music: 0.55 };

  function init() {
    if (ac) { loadSkills(); loadInteractionSounds(); return Promise.all([ac.state === "suspended" ? ac.resume().catch(() => {}) : null, loadClick(), loadDeath()]); }
    ac = new (window.AudioContext || window.webkitAudioContext)();
    master = ac.createGain(); master.gain.value = vol.master; master.connect(ac.destination);
    sfxBus = ac.createGain(); sfxBus.gain.value = vol.sfx; sfxBus.connect(master);
    musBus = ac.createGain(); musBus.gain.value = vol.music; musBus.connect(master);
    /* shared noise buffer */
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    let noiseSeed=0x29fd841;
    for (let i = 0; i < d.length; i++) { noiseSeed^=noiseSeed<<13;noiseSeed^=noiseSeed>>>17;noiseSeed^=noiseSeed<<5;d[i]=(noiseSeed>>>0)/2147483648-1; }
    loadSkills(); // Background preparation must not delay the supplied UI/death recordings.
    loadInteractionSounds();
    return Promise.all([ac.state === "suspended" ? ac.resume().catch(() => {}) : null, loadClick(), loadDeath()]);
  }
  function loadSkills() { return typeof SkillAudio!=='undefined'?SkillAudio.init(ac,sfxBus,vol):null; }
  function playSkill(id,phase,context) {
    if(typeof Coop!=='undefined'&&Coop.active&&context?.owner?._coopId)Coop.visual?.('skill',{skill:id,phase,ownerId:context.owner._coopId});
    return typeof SkillAudio!=='undefined'?SkillAudio.play(id,phase,context):null;
  }
  function stopSkills(owner) { if(typeof SkillAudio!=='undefined')SkillAudio.stopAll(owner); }
  function setVol(k, v) {
    vol[k] = v;
    applyRecordedVolume();
    if (!ac) return;
    if (k === "master") master.gain.value = v;
    if (k === "sfx") sfxBus.gain.value = v;
    if (k === "music") musBus.gain.value = v;
  }

  /* ---------- primitive builders ---------- */
  function env(g, t0, a, peak, dec, sus) {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + a);
    g.gain.exponentialRampToValueAtTime(Math.max(sus || 0.0001, 0.0001), t0 + a + dec);
  }
  function osc(type, freq, t0, dur, peak, dest, slideTo) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(slideTo, 1), t0 + dur);
    env(g, t0, 0.005, peak, dur);
    o.connect(g); g.connect(dest || sfxBus);
    o.start(t0); o.stop(t0 + dur + 0.1);
  }
  function noise(t0, dur, peak, filterType, f0, f1, q, dest) {
    const s = ac.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const f = ac.createBiquadFilter(); f.type = filterType || "bandpass";
    f.frequency.setValueAtTime(f0, t0);
    if (f1) f.frequency.exponentialRampToValueAtTime(Math.max(f1, 10), t0 + dur);
    f.Q.value = q || 1;
    const g = ac.createGain(); env(g, t0, 0.004, peak, dur);
    s.connect(f); f.connect(g); g.connect(dest || sfxBus);
    s.start(t0); s.stop(t0 + dur + 0.1);
  }

  /* ---------- one-shot SFX ---------- */
  const S = {
    click: playClick,
    swing()      { noise(ac.currentTime, 0.16, 0.18, "bandpass", 500, 2400, 1.5); },
    hit()        { const t = ac.currentTime; noise(t, 0.1, 0.3, "lowpass", 900, 200); osc("triangle", 160, t, 0.09, 0.25, sfxBus, 60); },
    crit()       { const t = ac.currentTime; noise(t, 0.14, 0.4, "lowpass", 1400, 200); osc("triangle", 220, t, 0.12, 0.3, sfxBus, 50); osc("square", 90, t, 0.12, 0.18, sfxBus, 40); },
    block()      { const t = ac.currentTime; osc("square", 320, t, 0.06, 0.2, sfxBus, 180); noise(t, 0.06, 0.18, "highpass", 2000); },
    bow()        { const t = ac.currentTime; noise(t, 0.1, 0.14, "bandpass", 1200, 3000, 3); osc("sine", 300, t, 0.05, 0.1, sfxBus, 500); },
    arrowHit()   { S.hit(); },
    playerHurt() { const t = ac.currentTime; osc("sawtooth", 200, t, 0.16, 0.16, sfxBus, 90); noise(t, 0.1, 0.12, "lowpass", 600, 150); },
    /* monster voices by family */
    vox_bone()   { const t = ac.currentTime; noise(t, 0.22, 0.16, "bandpass", 2500, 900, 6); osc("square", 110, t, 0.1, 0.06, sfxBus, 70); },
    vox_beast()  { const t = ac.currentTime; osc("sawtooth", 240, t, 0.28, 0.22, sfxBus, 90); noise(t, 0.2, 0.1, "bandpass", 700, 300, 2); },
    vox_human()  { const t = ac.currentTime; osc("sawtooth", 170, t, 0.3, 0.18, sfxBus, 110); },
    vox_brute()  { const t = ac.currentTime; osc("sawtooth", 95, t, 0.45, 0.28, sfxBus, 45); noise(t, 0.3, 0.12, "lowpass", 400, 120); },
    vox_metal()  { const t = ac.currentTime; osc("square", 140, t, 0.2, 0.14, sfxBus, 80); noise(t, 0.12, 0.16, "highpass", 3000); },
    vox_insect() { const t = ac.currentTime; noise(t, 0.25, 0.18, "bandpass", 3800, 2200, 8); },
    vox_boss()   { const t = ac.currentTime; osc("sawtooth", 70, t, 0.8, 0.35, sfxBus, 35); osc("sawtooth", 72, t, 0.8, 0.3, sfxBus, 36); noise(t, 0.5, 0.14, "lowpass", 300, 90); },
    die_bone()   { const t = ac.currentTime; for (let i = 0; i < 4; i++) noise(t + i * 0.05, 0.07, 0.18, "bandpass", 2200 - i * 350, 800, 4); },
    die_flesh()  { const t = ac.currentTime; osc("sawtooth", 160, t, 0.4, 0.2, sfxBus, 50); noise(t, 0.3, 0.16, "lowpass", 700, 120); },
    potion()     { const t = ac.currentTime; osc("sine", 300, t, 0.12, 0.16, sfxBus, 600); osc("sine", 450, t + 0.1, 0.12, 0.14, sfxBus, 750); },
    drop()       { const t = ac.currentTime; noise(t, 0.08, 0.14, "lowpass", 800, 200); },
    dropRare()   { const t = ac.currentTime; [523, 659, 784, 1047].forEach((f, i) => osc("sine", f, t + i * 0.09, 0.35, 0.12, sfxBus)); },
    dropUnique() { const t = ac.currentTime; [392, 523, 659, 784, 1175].forEach((f, i) => osc("sine", f, t + i * 0.1, 0.5, 0.13, sfxBus)); osc("sine", 196, t, 0.9, 0.1, sfxBus); },
    coin()       { const t = ac.currentTime; osc("square", 1900, t, 0.05, 0.07); osc("square", 2400, t + 0.04, 0.07, 0.06); },
    pickup()     { osc("sine", 700, ac.currentTime, 0.06, 0.1, sfxBus, 900); },
    portal()     { const t = ac.currentTime; osc("sine", 200, t, 0.7, 0.16, sfxBus, 600); osc("sine", 305, t, 0.7, 0.1, sfxBus, 900); noise(t, 0.7, 0.05, "bandpass", 1200, 2400, 2); },
    shrine()     { const t = ac.currentTime; [330, 415, 494, 659].forEach((f, i) => osc("triangle", f, t + i * 0.12, 0.5, 0.1, sfxBus)); },
    levelup()    { const t = ac.currentTime; [262, 330, 392, 523, 659].forEach((f, i) => osc("triangle", f, t + i * 0.08, 0.4, 0.14, sfxBus)); },
    skillup()    { const t = ac.currentTime; osc("triangle", 440, t, 0.2, 0.12, sfxBus, 660); },
    barrel()     { const t = ac.currentTime; noise(t, 0.18, 0.3, "lowpass", 1000, 200); for (let i = 0; i < 3; i++) noise(t + 0.04 * i, 0.05, 0.1, "bandpass", 1500 - i * 300, 600, 3); },
    propStone()  { const t=ac.currentTime; noise(t,.22,.17,'lowpass',750,180); for(let i=0;i<4;i++)noise(t+i*.045,.045,.10,'bandpass',1800-i*240,500,3); },
    propCeramic(){ const t=ac.currentTime; for(let i=0;i<5;i++){noise(t+i*.025,.045,.10,'highpass',2300+i*200);osc('sine',1700+i*390,t+i*.023,.055,.025,sfxBus,650);} },
    propIce()    { const t=ac.currentTime; noise(t,.19,.13,'highpass',3100,5200); noise(t+.07,.2,.09,'bandpass',900,350,3);osc('sine',1450,t,.12,.035,sfxBus,620); },
    chest()      { const t = ac.currentTime; osc("square", 180, t, 0.1, 0.12, sfxBus, 120); noise(t + 0.08, 0.1, 0.08, "bandpass", 900, 1400, 3); },
    slam()       { const t = ac.currentTime; osc("sine", 90, t, 0.35, 0.5, sfxBus, 30); noise(t, 0.3, 0.3, "lowpass", 500, 80); },
    roar()       { const t = ac.currentTime; osc("sawtooth", 120, t, 0.5, 0.3, sfxBus, 60); osc("sawtooth", 123, t, 0.5, 0.25, sfxBus, 62); },
    firebolt()   { const t = ac.currentTime; noise(t, 0.25, 0.16, "bandpass", 600, 1800, 1.5); osc("sawtooth", 140, t, 0.2, 0.08, sfxBus, 240); },
    frost()      { const t = ac.currentTime; noise(t, 0.3, 0.13, "highpass", 3200, 5200, 2); osc("sine", 900, t, 0.25, 0.07, sfxBus, 300); },
    zap()        { const t = ac.currentTime; osc("square", 1200, t, 0.08, 0.09, sfxBus, 300); noise(t, 0.09, 0.1, "bandpass", 2800, 1200, 4); },
    blast()      { const t = ac.currentTime; osc("sine", 110, t, 0.4, 0.4, sfxBus, 35); noise(t, 0.35, 0.28, "lowpass", 1200, 120); noise(t, 0.15, 0.12, "highpass", 2400); },
    curse()      { const t = ac.currentTime; osc("sawtooth", 160, t, 0.5, 0.12, sfxBus, 70); osc("sine", 320, t, 0.45, 0.08, sfxBus, 110); noise(t, 0.4, 0.06, "bandpass", 500, 200, 2); },
    forge()      { const t = ac.currentTime; osc("square", 720, t, 0.12, 0.14, sfxBus, 500); noise(t, 0.1, 0.16, "highpass", 3000); osc("sine", 180, t + 0.1, 0.25, 0.1, sfxBus, 90); },
    fireHit()    { const t = ac.currentTime; noise(t, 0.2, 0.24, "lowpass", 1600, 300); },
    step(town)   { noise(ac.currentTime, 0.05, town ? 0.045 : 0.06, "lowpass", 500, 150); },
    buy()        { const t = ac.currentTime; S.coin(); osc("sine", 600, t + 0.08, 0.1, 0.08, sfxBus, 800); },
    error()      { osc("square", 140, ac.currentTime, 0.15, 0.12, sfxBus, 100); },
    quest()      { const t = ac.currentTime; [440, 554, 659].forEach((f, i) => osc("triangle", f, t + i * 0.13, 0.45, 0.12, sfxBus)); },
    death: playDeath,
  };
  function play(name) { if(INTERACTIONS[name]){playInteraction(name);return;} if(typeof SkillAudio!=='undefined'&&SkillAudio.legacy(name))return; if (name === 'click') { playClick(); return; } if (name === 'death') { playDeath(); return; } if (!ac || ac.state !== "running") return; try { (S[name] || (() => {}))(); } catch (e) {} }

  /* ---------- NPC voices: wordless per-character speech-babble ----------
     profile: { pitch (Hz), formant (Hz), rate (syl/sec), vol }            */
  let voiceNodes = [];
  function voice(profile, text) {
    if (!ac || ac.state !== "running") return;
    /* cut off whoever was talking */
    for (const n of voiceNodes) { try { n.stop(); } catch (e) {} }
    voiceNodes = [];
    profile = profile || {};
    const base = profile.pitch || 160;
    const rate = profile.rate || 8;
    const syllables = U.clamp(Math.round((text || "hm").length / 6), 2, 12);
    const t0 = ac.currentTime + 0.04;
    const questioning = /\?\s*$/.test(text || "");
    for (let i = 0; i < syllables; i++) {
      const t = t0 + i / rate + Math.random() * 0.012;
      const last = i === syllables - 1;
      let f = base * (0.9 + Math.random() * 0.28);
      if (last) f *= questioning ? 1.3 : 0.82;
      const o = ac.createOscillator();
      o.type = "sawtooth";
      o.frequency.setValueAtTime(f, t);
      o.frequency.exponentialRampToValueAtTime(f * (0.88 + Math.random() * 0.3), t + 0.09);
      const flt = ac.createBiquadFilter();
      flt.type = "bandpass";
      flt.frequency.value = (profile.formant || 900) * (0.75 + Math.random() * 0.55);
      flt.Q.value = 2.2;
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.13 * (profile.vol || 1), t + 0.028);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.105);
      o.connect(flt); flt.connect(g); g.connect(sfxBus);
      o.start(t); o.stop(t + 0.13);
      voiceNodes.push(o);
    }
  }

  /* ---------- recorded soundtrack / generative fallback ambience ---------- */
  const SCALES = { town: [220, 246.9, 261.6, 329.6, 349.2], wild: [196, 220, 233.1, 293.7, 311.1], dungeon: [110, 130.8, 146.8, 174.6, 185] };
  function startRecorded(theme) {
    let track = recorded.get(theme);
    if (!track) {
      track = new Audio(new URL('assets/music/' + TRACKS[theme], document.baseURI).href);
      track.id = theme === 'title' ? 'titleMusic' : 'music-' + theme;
      track.hidden = true; track.loop = true; track.preload = 'auto'; track._fade = 1;
      document.body.appendChild(track); recorded.set(theme, track);
      if (theme === 'title') titleTrack = track;
    }
    if (curTheme !== theme) {
      const outgoing = [...recorded.values()].filter(t => t !== track && !t.paused);
      if (fadeTimer) { clearInterval(fadeTimer); fadeTimer = null; }
      stopSynth(); curTheme = theme;
      track._fade = outgoing.length ? 0 : 1;
      const levels = outgoing.map(t => t._fade ?? 1), began = performance.now();
      if (outgoing.length) fadeTimer = setInterval(() => {
        const k = Math.min(1, (performance.now() - began) / 450);
        track._fade = k; outgoing.forEach((t, i) => t._fade = levels[i] * (1 - k));
        applyRecordedVolume();
        if (k === 1) {
          outgoing.forEach(t => { t.pause(); t.currentTime = 0; t._fade = 1; });
          clearInterval(fadeTimer); fadeTimer = null;
        }
      }, 25);
    }
    applyRecordedVolume();
    if (!track.paused) return;
    track.play().catch(error => {
      if (curTheme === theme && !['NotAllowedError', 'AbortError'].includes(error.name)) console.warn('Could not play ' + TRACKS[theme] + ':', error);
    });
  }
  // Retry only the currently selected soundtrack after browser autoplay restrictions.
  const unlockRecorded = () => { if (TRACKS[curTheme]) startRecorded(curTheme); };
  document.addEventListener('pointerdown', unlockRecorded, {capture: true});
  document.addEventListener('keydown', unlockRecorded, {capture: true});
  function stopSynth() {
    if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
    for (const n of musicNodes) { try { n.stop ? n.stop() : n.disconnect(); } catch (e) {} }
    musicNodes = [];
  }
  function stopMusic() {
    if (fadeTimer) { clearInterval(fadeTimer); fadeTimer = null; }
    for (const track of recorded.values()) { track.pause(); track.currentTime = 0; track._fade = 1; }
    stopSynth(); curTheme = null;
  }
  function music(theme) {
    if (TRACKS[theme]) { startRecorded(theme); return; }
    if (!ac) return;
    if (curTheme === theme) return;
    stopMusic();
    curTheme = theme;
    const t = ac.currentTime;
    /* drone: two detuned oscillators through a slow lowpass */
    const droneFreq = theme === "dungeon" ? 55 : theme === "wild" ? 65.4 : 82.4;
    const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 320; lp.connect(musBus);
    const dg = ac.createGain(); dg.gain.value = 0;
    dg.gain.linearRampToValueAtTime(theme === "town" ? 0.07 : 0.1, t + 4);
    dg.connect(lp);
    for (const det of [0, 1.7, -1.2]) {
      const o = ac.createOscillator(); o.type = "sawtooth";
      o.frequency.value = droneFreq + det;
      o.connect(dg); o.start(t);
      musicNodes.push(o);
    }
    musicNodes.push(dg, lp);
    /* wind bed */
    const ws = ac.createBufferSource(); ws.buffer = noiseBuf; ws.loop = true;
    const wf = ac.createBiquadFilter(); wf.type = "bandpass"; wf.frequency.value = theme === "dungeon" ? 220 : 480; wf.Q.value = 0.6;
    const wg = ac.createGain(); wg.gain.value = 0;
    wg.gain.linearRampToValueAtTime(theme === "dungeon" ? 0.045 : 0.06, t + 5);
    ws.connect(wf); wf.connect(wg); wg.connect(musBus); ws.start(t);
    /* slow wind LFO */
    const lfo = ac.createOscillator(); lfo.frequency.value = 0.07;
    const lg = ac.createGain(); lg.gain.value = 140;
    lfo.connect(lg); lg.connect(wf.frequency); lfo.start(t);
    musicNodes.push(ws, wf, wg, lfo, lg);
    /* sparse bell motif */
    const scale = SCALES[theme] || SCALES.wild;
    musicTimer = setInterval(() => {
      if (!ac || ac.state !== "running") return;
      if (Math.random() < (theme === "town" ? 0.55 : 0.4)) {
        const f = scale[Math.floor(Math.random() * scale.length)] * (Math.random() < 0.25 ? 2 : 1);
        const tt = ac.currentTime;
        const o = ac.createOscillator(); o.type = "sine"; o.frequency.value = f;
        const o2 = ac.createOscillator(); o2.type = "sine"; o2.frequency.value = f * 2.01;
        const g = ac.createGain();
        g.gain.setValueAtTime(0.0001, tt);
        g.gain.linearRampToValueAtTime(theme === "town" ? 0.05 : 0.04, tt + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, tt + 4);
        o.connect(g); o2.connect(g); g.connect(musBus);
        musicNodes.push(o,o2,g);
        o.onended = () => { musicNodes = musicNodes.filter(n => n !== o && n !== o2 && n !== g); g.disconnect(); };
        o.start(tt); o2.start(tt); o.stop(tt + 4.2); o2.stop(tt + 4.2);
      }
    }, 2600);
  }

  fetchClick(); // Fetch early; decoding and playback wait for a user gesture.
  fetchDeath();
  return { init, play, playSkill, stopSkills, voice, music, chooseZoneMusic, stopMusic, stopDeath, setVol, vol, TRACKS, EFFECTS, INTERACTIONS, loadInteractionSounds,
    get interactionStats(){return {loaded:interactionBuffers.size,voices:interactionVoices.size};}, get ctx() { return ac; } };
})();
