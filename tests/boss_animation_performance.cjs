// One active production loop at a time; warm contexts alternate exact builds.
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const arg=(name,fallback)=>process.argv.find(a=>a.startsWith(`--${name}=`))?.slice(name.length+3)||fallback;
const snapshot=arg('snapshot','tmp/boss_animation/before'),seconds=+arg('seconds','8'),warmup=+arg('warmup','3000'),pairs=+arg('pairs','3');
require('./boss_animation_baseline.cjs').ensureSnapshot(snapshot);
const selected=arg('boss',''),selectedWidth=arg('width',''),suffix=arg('tag','');
const out=`tests/qa/bosses/animation_performance${suffix?'_'+suffix:''}.json`;
const previous=process.argv.includes('--resume')&&fs.existsSync(out)?JSON.parse(fs.readFileSync(out)):null;
const summary=a=>{a.sort((x,y)=>x-y);return {median:a[Math.floor(a.length*.5)],p95:a[Math.floor(a.length*.95)],max:a.at(-1)};};
const mean=a=>a.reduce((s,n)=>s+n,0)/a.length;
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding']});
 const report={browser:browser.version(),snapshot,seconds,warmup,pairs,method:'Three alternating pairs on warmed exact-build contexts; only one production loop active. Ordinary Gravebinder gear and capped boss adds. No disabled-visual samples.',hashes:{},runs:[],results:[],errors:[]};
 try{
  const pages={};
  for(const version of ['before','after']){
   const root=version==='before'?snapshot:'.',sources={};
   for(const f of fs.readdirSync(path.join(root,'js')))if(f.endsWith('.js'))sources[f]=fs.readFileSync(path.join(root,'js',f),'utf8');
   report.hashes[version]=Object.fromEntries(Object.entries(sources).map(([file,source])=>[file,crypto.createHash('sha256').update(source).digest('hex')]));
   const context=await browser.newContext({viewport:{width:1920,height:1080},reducedMotion:'no-preference'}),page=await context.newPage();pages[version]=page;
   page.on('pageerror',e=>report.errors.push(version+': '+e.message));
   await page.addInitScript(()=>{
    window.__bossBench={active:false,collecting:false,frames:[],parts:{},partFrames:[]};const store=new Map();
    __bossBench.wrap=(name,fn)=>function(...args){const t=performance.now();try{return fn.apply(this,args);}finally{__bossBench.parts[name]=(__bossBench.parts[name]||0)+performance.now()-t;}};
    Object.defineProperty(window,'localStorage',{value:{get length(){return store.size;},key:i=>[...store.keys()][i]??null,getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)}});
   });
   await page.route('**/index.html',route=>route.fulfill({contentType:'text/html',body:fs.readFileSync(path.join(root,'index.html'),'utf8')}));
   await page.route('**/js/*.js*',route=>{
    const file=new URL(route.request().url()).pathname.split('/').at(-1);let source=sources[file];if(source===undefined)return route.continue();
    if(file==='game.js'){
     source=source.replace(/\r\n/g,'\n');
     const replace=(a,b)=>{if(!source.includes(a))throw Error('Missing benchmark hook '+a);source=source.replace(a,b);};
     replace('  function tick(t) {\n    requestAnimationFrame(tick);','  function tick(t) {\n    requestAnimationFrame(tick);\n    if(!window.__bossBench.active)return;const cpuStart=performance.now();window.__bossBench.parts={};');
     replace('      render();\n    } catch (err) {','      render();\n      if(window.__bossBench.collecting){window.__bossBench.frames.push(performance.now()-cpuStart);window.__bossBench.partFrames.push(window.__bossBench.parts);}\n    } catch (err) {');
     replace('  /* messages passthrough */',"update=__bossBench.wrap('update',update);render=__bossBench.wrap('render',render);drawEntity=__bossBench.wrap('drawEntity',drawEntity);\n  /* messages passthrough */");
     replace('    init, newGame, loadGame,','    __bossBench:{settle(seconds){state.time+=seconds;for(let i=delayed.length-1;i>=0;i--)if(state.time>=delayed[i].t){const fn=delayed[i].fn;delayed.splice(i,1);fn();}},place(x,y){state.player.x=x;state.player.y=y;state.player.path=null;state.player.command=null;camPos=null;fx.shake=0;}},\n    init, newGame, loadGame,');
    }
    return route.fulfill({contentType:'text/javascript',body:source});
   });
   await page.goto('http://localhost:8741/index.html',{timeout:90000});
   await page.waitForFunction(()=>document.querySelector('#titleMenu button'),null,{timeout:90000});
   await page.addScriptTag({path:path.join(__dirname,'boss_loadouts.js')});
   await page.evaluate(()=>{if(typeof BossVFX!=='undefined')for(const name of ['drawGround','appendDraws','drawItem','sampleActor','drawProjectile'])BossVFX[name]=__bossBench.wrap(name,BossVFX[name]);});
  }
  if(previous){
   if(previous.seconds!==seconds||previous.warmup!==warmup||previous.pairs!==pairs||JSON.stringify(previous.hashes)!==JSON.stringify(report.hashes))throw Error('Cannot resume measurements from different source or sampling settings');
   report.runs=previous.runs;report.results=previous.results;
  }
  for(const boss of selected?[selected]:['korvath','mire_mother','azram','empty_archangel','malthoron','vethriss'])for(const width of selectedWidth?[+selectedWidth]:[1920,3840]){
   if(report.results.some(r=>r.boss===boss&&r.width===width))continue;
   const runs={before:[],after:[]};
   for(let pair=0;pair<pairs;pair++)for(const version of pair%2?['after','before']:['before','after']){
    const page=pages[version];await page.bringToFront();await page.setViewportSize({width,height:width*9/16});
    const scene=await page.evaluate(async boss=>{
     const bench=window.__bossBench;bench.active=false;bench.collecting=false;Sfx.setVol('master',0);
     await Game.newGame('Boss animation benchmark','gravebinder',false);await (await import('/tests/completed_hero_fixture.mjs')).loadCompletedHero(Game);Game.firstSightCutscene=()=>{};
     Game.debugFlags.god=true;Game.options.screenShake=false;Game.state.seed=12345;Math.random=U.rng(7331);
     if(!await Game.enterMap(DATA.BOSS_ENCOUNTERS[boss].zone,'from_camp'))throw Error('Benchmark map failed');
     UI.hideTitle();UI.closeAll();const s=Game.state,p=s.player,a=s.map.bossArena;s.quests.q16={state:'done'};s.quests.q17={state:'done'};s.monsters=[];s.map.explored.fill(1);
     const loadout=BossLoadouts.apply(p,DATA.ENEMIES[boss].lvl);Game.commitPlayerEquipment(await Game.preparePlayerEquipment(p.equip));
     Game.__bossBench.place(a.cx+3,a.cy+2);const m=new Monster(boss,a.cx,a.cy);m.aggro=true;s.monsters=[m];const e=m.encounter;e.active=true;
     for(let i=1;i<e.config.phases.length;i++)e.phaseChange(i);e.clearOwned();e.debris=[];
     if(boss==='vethriss')e.start('beam',p);
     for(let i=0;i<e.config.cap;i++)e.spawn('drowned_dead',a.cx-3+i*1.5,a.cy+3);
     if(boss==='azram'){e.spawn('boss_portal',a.cx-3,a.cy-2,'portal');e.spawn('boss_portal',a.cx+3,a.cy-2,'portal');}
     BossLoadouts.prepareSummons(p,loadout.summon,Game.__bossBench.settle);p.mana=p.stats.maxMana;
     BossLoadouts.prepareSummons(p,loadout.secondarySummon,Game.__bossBench.settle);p.mana=p.stats.maxMana;
     p.command={type:'attack',target:m,skill:loadout.main,hold:true};Math.random=U.rng(7331);bench.active=true;
     return {boss,phase:e.phase,monsters:s.monsters.length,army:s.minions.filter(m=>!m.dead).length};
    },boss);
    await page.waitForTimeout(warmup);await page.evaluate(()=>{__bossBench.frames=[];__bossBench.partFrames=[];__bossBench.collecting=true;});
    const end=Date.now()+seconds*1000;while(Date.now()<end){await page.keyboard.press('Shift');await page.waitForTimeout(300);}
    const raw=await page.evaluate(()=>{__bossBench.active=__bossBench.collecting=false;return {frames:__bossBench.frames,parts:__bossBench.partFrames,fatal:document.querySelector('#appFatal')?.textContent};});
    if(raw.fatal||raw.frames.length<seconds*10||report.errors.length)throw Error(raw.fatal||report.errors.join('\n')||'Too few production frames');
    const parts=Object.fromEntries([...new Set(raw.parts.flatMap(p=>Object.keys(p)))].map(k=>[k,summary(raw.parts.map(p=>p[k]||0))]));
    const cpu=summary(raw.frames),run={boss,width,pair,version,scene,frames:raw.frames.length,cpu,parts,raw:raw.frames};runs[version].push(cpu.p95);report.runs.push(run);
    fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
   }
   const before=mean(runs.before),after=mean(runs.after),result={boss,width,beforeP95:+before.toFixed(2),afterP95:+after.toFixed(2),changePercent:+((after/before-1)*100).toFixed(2),passed:after<=before*1.1};
   report.results.push(result);console.log(JSON.stringify(result));fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
  }
  report.passed=report.results.every(r=>r.passed);if(!report.passed)process.exitCode=1;
 }finally{fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
