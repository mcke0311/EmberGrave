// Run against python serve.py. Isolated saves; production animation loop and
// trusted keyboard events. Diagnostic switches exist only in the intercepted JS.
const {chromium} = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const arg = (name, fallback) => process.argv.find(v => v.startsWith(`--${name}=`))?.split('=').slice(1).join('=') || fallback;
const zone = arg('zone', 'north_wild'), key = arg('key', 'Shift');
const width = +arg('width', '1920'), height = Math.round(width * 9 / 16), seconds = +arg('seconds', '8');
const modes = arg('modes', 'normal,no-ai,no-enemy-draw,no-enemies').split(',');
const output = arg('output', `tests/qa/input_latency/latest_${zone}_${width}_${key}.json`);
const terrainVersion = arg('terrain', 'current');
const boss = arg('boss','');
const sourceRef=arg('source-ref','');
const sourceFor=file=>sourceRef?execFileSync('git',['show',sourceRef+':js/'+file],{encoding:'utf8'}):fs.readFileSync(path.join(__dirname,'../js',file),'utf8');
const warmupMs = +arg('warmup','1200');
const summary = a => {
  if (!a.length) return null;
  a.sort((a, b) => a - b);
  const at = p => +a[Math.min(a.length - 1, Math.floor(a.length * p))].toFixed(2);
  return {median: at(.5), p95: at(.95), max: at(1)};
};

(async () => {
  const browser = await chromium.launch({channel: 'chrome', headless: true,
    args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding']});
  const report = {environment: {browser: browser.version(), platform: process.platform}, zone, key, width, height, seconds, warmupMs, terrainVersion, sourceRef:sourceRef||null, results: []};
  try {
    const context = await browser.newContext({viewport: {width, height}}), page = await context.newPage();
    const errors = [], messages = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => {if (['error', 'warning'].includes(m.type())) messages.push(m.text());});
    await page.addInitScript(() => {
      const store = new Map();
      Object.defineProperty(window, 'localStorage', {value: {
        get length() {return store.size;}, key: i => [...store.keys()][i] ?? null,
        getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(String(k), String(v)),
        removeItem: k => store.delete(k), clear: () => store.clear(),
      }});
      const p = window.__latency = {frames: [], events: [], loafs: [], mode: 'setup', collecting: false};
      p.wrap = (name, fn) => function (...args) {
        if ((name === 'enemyAI' && p.mode === 'no-ai') ||
            (name === 'bossDraw' && p.mode === 'no-boss-draw') ||
            (name === 'clipBehind' && p.mode === 'no-occlusion') ||
            (name === 'HUD' && p.mode === 'no-hud') ||
            (name === 'player3d' && p.mode === 'no-player') ||
            (['drawSurface', 'drawFloor'].includes(name) && p.mode === 'no-terrain')) return;
        const start = performance.now();
        try {return fn.apply(this, args);} finally {
          if (p.parts) p.parts[name] = (p.parts[name] || 0) + performance.now() - start;
        }
      };
      p.begin = t => {p.start = performance.now(); p.interval = p.last ? t - p.last : 0; p.last = t; p.parts = {};};
      p.end = () => {if (p.collecting) {
        const terrain=p.terrain.getDiagnostics();
        p.frames.push({start:p.start,duration:performance.now()-p.start,interval:p.interval,parts:p.parts,
          terrain:{viewBuilds:terrain.surfaceViewBuilds,chunkBuilds:terrain.chunkBuilds}});
      }};
      for (const type of ['event', 'long-animation-frame']) {
        if (!PerformanceObserver.supportedEntryTypes.includes(type)) continue;
        new PerformanceObserver(list => {
          if (!p.collecting) return;
          for (const entry of list.getEntries()) {
            if (type === 'event') p.events.push({name: entry.name, start: entry.startTime, duration: entry.duration,
              interactionId: entry.interactionId, inputDelay: entry.processingStart - entry.startTime,
              processing: entry.processingEnd - entry.processingStart,
              presentation: entry.startTime + entry.duration - entry.processingEnd});
            else p.loafs.push(entry.toJSON());
          }
        }).observe({type, buffered: false, ...(type === 'event' ? {durationThreshold: 16} : {})});
      }
    });
    await page.route('**/js/game.js*', async route => {
      let source = sourceFor('game.js').replace(/\r\n/g, '\n');
      const replace = (before, after) => {
        if (!source.includes(before)) throw Error('Missing diagnostic hook: ' + before);
        source = source.replace(before, after);
      };
      replace('  function tick(t) {', '  function tick(t) {\n    window.__latency.begin(t);');
      replace('      render();\n    } catch (err) {', '      render();\n      window.__latency.end();\n    } catch (err) {');
      replace('      if (mon.husk) continue;', '      if (window.__latency.mode === "no-enemy-draw" || mon.husk) continue;');
      replace('    if (state.bossBar) {','    if (state.bossBar && window.__latency.mode !== "no-boss-hud") {');
      const names = ['update', 'render', 'updateHover', 'drawEntity', 'repath', 'renderLighting', 'renderMinimap', 'drawBackdrop', 'drawProp', 'renderMapOverlay'];
      replace('  /* messages passthrough */', names.map(n => `${n}=window.__latency.wrap('${n}',${n});`).join('\n') + '\n  /* messages passthrough */');
      replace('    init, newGame, loadGame,', `    __latency: {get running(){return running;},settle(seconds){state.time+=seconds;for(let i=delayed.length-1;i>=0;i--)if(state.time>=delayed[i].t){const fn=delayed[i].fn;delayed.splice(i,1);fn();}},place(x,y) {state.player.x=x;state.player.y=y;state.player.path=null;state.player.command=null;camPos=null;fx.shake=0;}},\n    init, newGame, loadGame,`);
      // Frozen public APIs are wrapped in this fixture copy, not mutated.
      source = source.replaceAll('LevelTerrain.', 'window.__latency.terrain.').replace('Player3D.draw(target,', 'window.__latency.drawPlayer(target,');
      replace('"use strict";', `"use strict";
window.__latency.terrain=Object.fromEntries(Object.entries(LevelTerrain).map(([name,fn])=>[name,
  typeof fn==='function'&&['beginFrame','drawSurface','drawFloor','clipBehind'].includes(name)?window.__latency.wrap(name,fn):fn]));
window.__latency.drawPlayer=window.__latency.wrap('player3d',Player3D.draw);`);
      await route.fulfill({contentType: 'text/javascript', body: source});
    });
    await page.route('**/js/boss_encounters.js*',route=>route.fulfill({contentType:'text/javascript',body:sourceFor('boss_encounters.js').replace('      for(const portal of e.owned)','      if(window.__latency.mode!=="no-portal-labels") for(const portal of e.owned)')}));
    if (terrainVersion === 'before') await page.route('**/js/level_terrain.js*', route => route.fulfill({contentType:'text/javascript',
      body:fs.readFileSync(path.join(__dirname,'fixtures/level_terrain_before_input_latency.js'),'utf8')}));
    await page.goto('http://localhost:8741/index.html', {waitUntil: 'load', timeout: 90000});
    await page.waitForFunction(() => document.querySelector('#titleMenu button') || document.querySelector('#appFatal'), null, {timeout: 90000});
    if(boss)await page.addScriptTag({path:path.join(__dirname,'boss_loadouts.js')});
    await page.evaluate(() => {
      BossEncounters.draw=window.__latency.wrap('bossDraw',BossEncounters.draw);
      const updateMonster=Monster.prototype.update;
      Monster.prototype.update = window.__latency.wrap('enemyAI', function(...args){
        const encounter=this.encounter;
        if(window.__latency.mode==='legacy'&&encounter){
          this.encounter=null;
          try{return updateMonster.apply(this,args);}finally{this.encounter=encounter;}
        }
        return updateMonster.apply(this,args);
      });
      UI.refreshHUD = window.__latency.wrap('HUD', UI.refreshHUD);
    });
    for (const mode of modes) {
      console.log('Preparing', mode, zone, width);
      const scene = await page.evaluate(async ({zone, mode, boss}) => {
        const diag = window.__latency; diag.collecting = false; diag.mode = 'setup';
        Sfx.setVol('master', 0);
        await Game.newGame('Latency test', boss?'gravebinder':'vanguard', false); await (await import('/tests/completed_hero_fixture.mjs')).loadCompletedHero(Game);
        Game.debugFlags.god = true; Game.options.screenShake = false; Game.state.seed = 12345;
        Math.random = U.rng(7331);
        if(boss)zone=DATA.BOSS_ENCOUNTERS[boss].zone;
        if (!await Game.enterMap(zone, 'from_camp')) throw Error('Map failed to load');
        UI.hideTitle(); UI.closeAll();
        if(boss){
          Game.firstSightCutscene=()=>{};
          const s=Game.state,p=s.player,a=s.map.bossArena;
          s.quests.q16={state:'done'};s.quests.q17={state:'done'};s.monsters=[];s.map.explored.fill(1);
          const spec=BossLoadouts.apply(p,DATA.ENEMIES[boss].lvl);
          Game.commitPlayerEquipment(await Game.preparePlayerEquipment(p.equip));
          Game.__latency.place(a.cx+3,a.cy+2);
          const m=new Monster(boss,a.cx,a.cy);m.aggro=true;s.monsters=[m];
          const e=m.encounter;e.active=true;
          if(e.statusText){const status=e.statusText;e.statusText=function(){const text=status.call(this);return window.__latency.mode==='static-boss-hud'?text.replace(/ · [\d.]+s$/,''):text;};}
          for(let i=1;i<e.config.phases.length;i++)e.phaseChange(i);
          e.clearOwned();e.debris=[];
          // Exercise the final boss's longest sustained signature during this sample.
          if(boss==='vethriss')e.start('beam',p);
          for(let i=0;i<e.config.cap;i++)e.spawn('drowned_dead',a.cx-3+i*1.5,a.cy+3);
          if(boss==='azram'){e.spawn('boss_portal',a.cx-3,a.cy-2,'portal');e.spawn('boss_portal',a.cx+3,a.cy-2,'portal');}
          BossLoadouts.prepareSummons(p,spec.summon,Game.__latency.settle);p.mana=p.stats.maxMana;
          BossLoadouts.prepareSummons(p,spec.secondarySummon,Game.__latency.settle);p.mana=p.stats.maxMana;
          const monsters=s.monsters.filter(m=>!m.dead).length,army=s.minions.filter(m=>!m.dead).length;
          p.command={type:'attack',target:m,skill:spec.main,hold:true};
          diag.mode=mode;Math.random=U.rng(7331);
          return {boss,phase:e.phase,monsters,army,baseline:mode==='legacy'?'Existing generic boss AI; same new arena, art, gear and initial entities':'Authored controller'};
        }
        const state = Game.state, map = state.map, entry = {...state.player}, candidates = [];
        for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) {
          if (TerrainNavigation.clear(map, x + .5, y + .5, .36) && (!map.surfaceVersion || TerrainSurface.supported(map, x + .5, y + .5, .36))) candidates.push({x: x + .5, y: y + .5});
        }
        candidates.sort((a,b) => Math.hypot(a.x-map.w/2,a.y-map.h/2)-Math.hypot(b.x-map.w/2,b.y-map.h/2));
        const center = candidates.find(c => TerrainNavigation.findPath(map, entry, c, {radius:.36,hop:false})) || entry;
        const target = Object.values(map.spawns).filter(c => Math.hypot(c.x-center.x,c.y-center.y)>5)
          .sort((a,b)=>Math.hypot(b.x-center.x,b.y-center.y)-Math.hypot(a.x-center.x,a.y-center.y))
          .find(c=>TerrainNavigation.findPath(map,center,c,{radius:.36,hop:false})) || entry;
        Game.__latency.place(center.x, center.y);
        for (const mon of state.monsters) if (Math.hypot(mon.x-center.x,mon.y-center.y)<20) mon.aggro=true;
        const monsters = state.monsters.length;
        if (mode === 'no-enemies') state.monsters = [];
        diag.mode = mode; Math.random = U.rng(7331);
        Game.repath(state.player, target.x, target.y); state.player.command = {type:'move'};
        return {center, target, monsters};
      }, {zone, mode, boss});
      await page.waitForTimeout(warmupMs);
      let traceSession;
      if (arg('trace', '0') === '1') {
        traceSession = await context.newCDPSession(page);
        await traceSession.send('Tracing.start', {categories:'-*,toplevel,devtools.timeline,disabled-by-default-devtools.timeline,disabled-by-default-devtools.timeline.frame,blink,cc,gpu,viz,v8',transferMode:'ReturnAsStream'});
      }
      await page.evaluate(() => {const p=window.__latency; p.frames=[];p.events=[];p.loafs=[];p.collecting=true;});
      const end = Date.now() + seconds * 1000;
      while (Date.now() < end) {await page.keyboard.press(key); await page.waitForTimeout(300);}
      await page.waitForTimeout(100);
      const raw = await page.evaluate(() => {
        const p=window.__latency;p.collecting=false;
        return {frames:p.frames,events:p.events,loafs:p.loafs, endPosition:{x:Game.state.player.x,y:Game.state.player.y},
          running:Game.__latency.running,visibility:document.visibilityState,lastFrame:p.last,now:performance.now(),
          titleHidden:getComputedStyle(document.getElementById('title')).display==='none',fatal:document.getElementById('appFatal')?.textContent};
      });
      if (traceSession) {
        const complete = new Promise(resolve=>traceSession.once('Tracing.tracingComplete',resolve));
        await traceSession.send('Tracing.end');
        const {stream} = await complete;
        const chunks=[];
        for (;;) {const chunk=await traceSession.send('IO.read',{handle:stream});chunks.push(chunk.data);if(chunk.eof)break;}
        await traceSession.send('IO.close',{handle:stream});
        const trace=chunks.join(''),filename=path.join('tmp/input_latency',path.basename(output).replace(/\.json$/,`_${mode}_trace.json`));
        fs.mkdirSync(path.dirname(filename),{recursive:true});fs.writeFileSync(filename,trace);
        const entries=JSON.parse(trace).traceEvents,threads=new Map();
        for(const e of entries)if(e.ph==='M'&&e.name==='thread_name')threads.set(e.pid+':'+e.tid,e.args.name);
        raw.traceSummary=entries.filter(e=>e.ph==='X'&&e.dur>20000).sort((a,b)=>b.dur-a.dur).slice(0,60)
          .map(e=>({name:e.name,thread:threads.get(e.pid+':'+e.tid),duration:e.dur/1000,start:e.ts/1000,args:e.args}));
        await traceSession.detach();
      }
      if (raw.fatal || errors.length || !raw.titleHidden || !raw.frames.length) {
        fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify({...report,failed:true,raw,errors,messages},null,2)+'\n');
        throw Error(raw.fatal || errors.join(';') || 'Scene did not render: '+JSON.stringify({frames:raw.frames.length,running:raw.running,visibility:raw.visibility,lastFrame:raw.lastFrame,now:raw.now,titleHidden:raw.titleHidden,messages,scene}));
      }
      const parts = [...new Set(raw.frames.flatMap(f=>Object.keys(f.parts)))];
      const result = {mode, scene, frames:raw.frames.length, cpuMs:summary(raw.frames.map(f=>f.duration)),
        frameIntervals:summary(raw.frames.map(f=>f.interval)),
        parts:Object.fromEntries(parts.map(n=>[n,summary(raw.frames.map(f=>f.parts[n]||0))])),
        inputEvents:raw.events, longAnimationFrames:raw.loafs,
        slowFrames:raw.frames.filter(f=>f.duration>30||f.interval>50),endPosition:raw.endPosition,traceSummary:raw.traceSummary};
      report.results.push(result);
      console.log(JSON.stringify({mode,cpu:result.cpuMs,interval:result.frameIntervals,AI:result.parts.enemyAI,
        events:raw.events.length,slowEvents:raw.events.filter(e=>e.duration>=200).length,loafs:raw.loafs.length}));
      fs.mkdirSync(path.dirname(output),{recursive:true}); fs.writeFileSync(output,JSON.stringify({...report,messages},null,2)+'\n');
    }
    console.log('PASS', output);
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
