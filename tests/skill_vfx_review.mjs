const $=id=>document.getElementById(id),status=$('status'),results=$('results'),params=new URLSearchParams(location.search);
window.skillReviewStore=new Map();let game,ui,vfx,data,win,doc,Player,Monster,Minion,frame,playing=false,busy=false,elapsed=0,current,point,target,baseMap,sim=0;
const raf=()=>new Promise(r=>requestAnimationFrame(r));
const original=params.has('before'),wide=params.has('wide');
function fail(e){playing=false;status.textContent='FAIL — '+e.message;results.textContent=e.stack;document.body.dataset.testStatus='failed';}
try{
  const [html,gameSource]=await Promise.all(['../index.html',original?'../tests/fixtures/skill_vfx_before/js/game.js':'../js/game.js'].map(p=>fetch(p,{cache:'no-store'}).then(r=>r.text())));
  const source=gameSource.replace('    init, newGame, loadGame,',`    __vfxReview:{update,render,setPlayer:p=>{state.player=p;delayed=[];particles=[];novas=[];bolts=[];},place(x,y){state.player.x=x;state.player.y=y;state.player.path=null;state.player.command=null;camPos={x:U.isoX(x,y)-canvas.width/2,y:U.isoY(x,y)-canvas.height*.47};shakeOx=shakeOy=0;}},\n    init, newGame, loadGame,`);
  const injection=`<base href="${new URL('../index.html',location.href)}"><script>
    const store=parent.skillReviewStore;Object.defineProperty(window,'localStorage',{value:{get length(){return store.size},key:i=>[...store.keys()][i]??null,getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(String(k),String(v)),removeItem:k=>store.delete(k),clear:()=>store.clear()}});
    window.requestAnimationFrame=()=>0;window.__errors=[];window.addEventListener('error',e=>window.__errors.push(e.message));
  <\/script>`;
  frame=document.createElement('iframe');frame.title='Isolated skill battlefield';
  let page=html.replace('<head>','<head>'+injection).replace(/<script src="js\/game.js[^\"]*"><\/script>/,()=>'<script>'+source+'<\/script>');
  if(original)page=page.replace(/src="js\/entities.js[^\"]*"/,'src="tests/fixtures/skill_vfx_before/js/entities.js"');
  frame.srcdoc=page;$('host').append(frame);await new Promise(r=>frame.onload=r);win=frame.contentWindow;doc=win.document;
  for(let i=0;i<600&&!doc.querySelector('#titleMenu button');i++){if(doc.querySelector('#appFatal'))throw Error(doc.querySelector('#appFatalDetail').textContent);await new Promise(r=>setTimeout(r,30));}
  ({Game:game,UI:ui,SkillVFX:vfx,DATA:data,Player,Monster,Minion}=win.eval('({Game,UI,SkillVFX,DATA,Player,Monster,Minion})'));
  win.eval('Sfx').setVol('master',0);await game.newGame('Skill atelier','vanguard',false);await (await import('/tests/completed_hero_fixture.mjs')).loadCompletedHero(game);ui.closeAll();game.debugFlags.god=true;game.options.screenShake=false;game.options.dmgNumbers=false;
  game.state.seed=12345;await game.enterMap('north_wild','from_camp');baseMap=game.state.map;const snowDark=baseMap.zone.dark;
  let best=Infinity;for(let y=10;y<baseMap.h-10;y++)for(let x=10;x<baseMap.w-10;x++){
    let clear=true;for(let dy=-5;dy<=5&&clear;dy++)for(let dx=-5;dx<=5;dx++)if(baseMap.walls[x+dx+(y+dy)*baseMap.w]||baseMap.blocked[x+dx+(y+dy)*baseMap.w]){clear=false;break;}
    const distance=Math.hypot(x-baseMap.w/2,y-baseMap.h/2);if(clear&&distance<best){point={x:x+.5,y:y+.5};best=distance;}
  }
  if(!point)point={x:baseMap.spawns.from_camp.x,y:baseMap.spawns.from_camp.y};
  // Fix a safe arena surface, retain real authored terrain and the lighting renderer.
  game.state.map.props=[];game.state.npcs=[];game.state.ground=[];baseMap.hazard.fill(0);baseMap.blocked.fill(0);baseMap.walls.fill(0);baseMap.elev?.fill(0);baseMap.surfaceVersion=0;
  const style=doc.createElement('style');style.textContent='#hud,#messages,#worldLabel,#questTracker,#minimapWrap,#centerMsg{display:none!important}';doc.head.append(style);
  const fit=()=>{const width=wide?3840:1280,height=wide?2160:720;frame.style.width=width+'px';frame.style.height=height+'px';const scale=Math.min(1,$('host').clientWidth/width);frame.style.transform=`scale(${scale})`;$('host').style.height=height*scale+'px';};fit();window.addEventListener('resize',fit);
  function skills(){const ids=Object.values(data.SKILLS).filter(s=>s.cls===$('class').value);$('skill').replaceChildren(...ids.map(sk=>{const o=document.createElement('option');o.value=sk.id;o.textContent=sk.name+(sk.type==='passive'?' · passive':'');return o;}));}
  function perks(){for(const tier of [5,10]){const select=$('perk'+tier),previous=select.value;select.replaceChildren(...[{name:'No choice'},...data.SKILL_PERKS[$('skill').value][tier]].map((p,i)=>{const o=document.createElement('option');o.value=i-1;o.textContent=p.name||p.label;return o;}));select.value=previous;select.disabled=+$('rank').value<tier;}}
  if(params.has('stage'))$('stage').value=params.get('stage');
  if(params.has('class'))$('class').value=params.get('class');
  skills();if(params.has('skill'))$('skill').value=params.get('skill');perks();$('class').onchange=()=>{skills();perks();replay().catch(fail);};
  for(const id of ['skill','rank','perk5','perk10','stage','effects'])$(id).onchange=()=>{if(id==='skill'||id==='rank')perks();replay().catch(fail);};
  $('replay').onclick=()=>replay().catch(fail);$('pause').onclick=()=>{playing=!playing;$('pause').textContent=playing?'Pause':'Play';};$('step').onclick=()=>{playing=false;tick(1/60);};
  $('audit').onclick=()=>audit().catch(fail);$('benchmark').onclick=()=>benchmark().catch(fail);
  for(const id of ['replay','pause','step','audit','benchmark'])$(id).disabled=false;
  async function setup(sk,rank=+$('rank').value,perk={5:+$('perk5').value,10:+$('perk10').value}){
    win.eval('Sfx').stopSkills?.();
    playing=false;vfx.setEnabled(!original&&$('effects').value==='1');vfx.reset();
    let randomSeed=0x493ab1;win.Math.random=()=>{randomSeed^=randomSeed<<13;randomSeed^=randomSeed>>>17;randomSeed^=randomSeed<<5;return (randomSeed>>>0)/4294967296;};
    const p=new Player('Skill atelier',sk.cls);p.lvl=100;
    for(const [slot,id] of Object.entries(data.PLAYER_STARTER_LOADOUTS[sk.cls]))p.equip[slot]=win.eval('Items').fromBase(id);
    game.__vfxReview.setPlayer(p);const s=game.state;s.time=0;s.monsters=[];s.minions=[];s.projectiles=[];s.fx=[];s.traps=[];s.ground=[];s.npcs=[];
    const theme=$('stage').value;
    if(baseMap.zone.theme!==theme)baseMap={...baseMap,theme,outdoor:theme==='snowwild',zone:{...baseMap.zone,theme,artZone:theme==='crypt'?'crypt1':'north_wild',dark:theme==='crypt'?.74:snowDark}};
    s.map=baseMap; // New map identity invalidates the existing terrain texture cache.
    for(const skill of Object.values(data.SKILLS))if(skill.cls===sk.cls)p.skills[skill.id]=rank;
    for(const tier of [5,10]){const choice=typeof perk==='number'?perk:perk[tier];if(choice>=0&&rank>=tier)p.chooseSkillPerk(sk.id,tier,data.SKILL_PERKS[sk.id][tier][choice].id);}
    p.computeStats();p.hp=p.stats.maxHp*.7;p.mana=100000;p.tempo=3;p.staticChg=12;
    game.__vfxReview.place(point.x,point.y);p.visAng=p.angT=.12;
    const assets=win.eval('Player3D.assets'),visual=assets.resolvePlayerVisual(sk.cls,p.equip,p.buffs);await assets.loadPlayerLoadout(visual);p._playerVisual=assets.activatePlayerLoadout(visual);
    const enemyId=Object.keys(data.ENEMIES).find(id=>!data.ENEMIES[id].boss&&data.ENEMIES[id].sprite==='skeleton')||'risen';
    for(const [dx,dy] of [[2,-1],[3,-1.4],[2.5,0],[4,0],[3.5,1]]){const mon=new Monster(enemyId,p.x+dx,p.y+dy);mon.hp=mon.maxHp=1e7;mon.update=()=>{};s.monsters.push(mon);}
    target=s.monsters[0];target.quarry={stacks:3,until:40};target.scorch={stacks:3,dps:4,until:40};target.curseFrailty={pct:10,until:40};target.poisonDot={dps:5,t:40};
    if(['combo','combo_finish','execute','bash','rabies','fireclaw'].includes(sk.type)){target.x=p.x+1;target.y=p.y-.4;}
    for(const [dx,dy] of [[1,1],[2,1],[3,1]]){const mon=new Monster(enemyId,p.x+dx,p.y+dy);mon.dead=true;mon.hp=0;mon.corpseT=30;mon.update=()=>{};s.monsters.push(mon);}
    const summonTypes=['summon_golem','minionbuff','sacrifice'];
    if(summonTypes.includes(sk.type)||vfx.recipes[sk.id].trigger==='minion')for(let i=0;i<2;i++){const mi=new Minion('wolf',{hp:200,dmg:[5,10],speed:3,atkRate:1,range:1,sprite:'wolf',name:'Review wolf'},p);mi.sourceSkill=sk.cls==='gravebinder'?'raise_dead':'call_wolf';mi.x=p.x-1-i;mi.y=p.y+1;mi.hp=50;s.minions.push(mi);}
    if(sk.type==='fireclaw'){p.form='fang';p.buffs.push({id:'form_fang',stats:{},until:100});}
    win.eval('Player3D').update(p,0);vfx.update(0,s);game.__vfxReview.render();current=sk;elapsed=sim=0;
    return p;
  }
  function cast(p,sk){
    if(sk.type==='passive'){
      const trigger=vfx.recipes[sk.id].trigger;
      vfx.passive(p,trigger,{x:p.x,y:p.y,z:25});
      const related=Object.values(data.SKILLS).find(s=>s.cls===sk.cls&&s.type!=='passive'&&(trigger==='fire'?s.elem==='fire':trigger==='totem'?s.type==='totem':trigger==='corpse'?s.type==='corpse':trigger==='curse'?s.type==='curse':trigger==='minion'?s.type==='minionbuff':s.tree===sk.tree));
      if(related)p.performSkill(related.id,target,{x:p.x+2,y:p.y+1});
    }else if(!p.performSkill(sk.id,target,{x:p.x+2,y:p.y+1}))throw Error(sk.name+' rejected the prepared review cast');
  }
  async function replay(){if(busy)return;const sk=data.SKILLS[$('skill').value],p=await setup(sk);cast(p,sk);playing=true;$('pause').textContent='Pause';status.textContent=sk.name+' · '+(original?'original renderer':vfx.recipes[sk.id].material+' / '+vfx.recipes[sk.id].motif);}
  function tick(dt){
    game.__vfxReview.update(dt);game.__vfxReview.render();elapsed+=dt;sim++;
    if(win.__errors.length||doc.querySelector('#appFatal'))throw Error(win.__errors.join(';')||doc.querySelector('#appFatalDetail').textContent);
  }
  async function loop(){try{if(playing&&!busy){tick((+$('speed').value)/60);if(elapsed>5){playing=false;win.eval('Sfx').stopSkills?.();}}}catch(e){fail(e);}requestAnimationFrame(loop);}
  async function publish(name,payload){try{await fetch('http://localhost:8742/'+name,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});}catch{/* The optional local QA collector is not required to use this page. */}}
  async function audit(){
    busy=true;playing=false;const records=[];$('sheets').replaceChildren();
    const representatives={vanguard:'vanguard_0_1',emberwitch:'emberwitch_0_4',gravebinder:'gravebinder_0_2',veilranger:'veilranger_0_6',wildkeeper:'wildkeeper_1_3'},sequenceFrames=[10,23,40,66];
    try{for(const cls of Object.keys(data.CLASSES)){
      const list=Object.values(data.SKILLS).filter(s=>s.cls===cls),sheet=document.createElement('canvas');sheet.width=1600;sheet.height=(Math.ceil(list.length/4)+1)*230;const c=sheet.getContext('2d');c.fillStyle='#14191d';c.fillRect(0,0,sheet.width,sheet.height);
      $('sheets').append(sheet);
      for(const [i,sk]of list.entries()){
        status.textContent=`Reviewing ${records.length+1}/107 · ${sk.name}`;const p=await setup(sk,10,-1);cast(p,sk);let peak=0,captured=false;
        for(let n=0;n<105;n++){tick(1/60);const d=vfx.diagnostics(),score=d.particles+d.events*4+game.state.projectiles.length*3+game.state.fx.length*10;
          if(sk.id===representatives[cls]&&sequenceFrames.includes(n)){
            const x=sequenceFrames.indexOf(n)*400,y=sheet.height-230,view=doc.querySelector('#view');
            c.drawImage(view,view.width/2-230,view.height*.47-140,460,245,x,y,400,205);c.fillStyle='#e5d5b5';c.font='13px system-ui';c.fillText(`${sk.name} · ${((n+1)/60).toFixed(2)} s`,x+10,y+222);
          }
          if(n>(sk.type==='form'?50:8)&&n<85&&(score>peak||!captured)){peak=score;const x=i%4*400,y=Math.floor(i/4)*230;c.drawImage(doc.querySelector('#view'),doc.querySelector('#view').width/2-230,doc.querySelector('#view').height*.47-140,460,245,x,y,400,205);captured=true;}
        }
        const x=i%4*400,y=Math.floor(i/4)*230;c.fillStyle='#14191d';c.fillRect(x,y+205,400,25);c.fillStyle='#e5d5b5';c.font='13px system-ui';c.fillText(sk.name+(sk.type==='passive'?' · passive':''),x+10,y+222);
        records.push({id:sk.id,type:sk.type,recipe:vfx.recipes[sk.id],peak,status:'passed'});await raf();
      }
      await publish((original?'before_':'after_')+cls,{image:sheet.toDataURL('image/png')});
    }
    status.textContent=`PASS — ${records.length} skills reviewed`;results.textContent=JSON.stringify(records,null,2);document.body.dataset.testStatus='passed';await publish(original?'before_coverage':'coverage',{records});
    }finally{busy=false;}
  }
  async function benchmark(){
    busy=true;playing=false;const samples=[];
    frame.style.width=(wide?3840:1920)+'px';frame.style.height=(wide?2160:1080)+'px';frame.style.transform=`scale(${$('host').clientWidth/(wide?3840:1920)})`;await raf();await raf();
    try{for(const enabled of [false,true]){
      $('effects').value=enabled?'1':'0';const sk=data.SKILLS.emberwitch_0_0,p=await setup(sk,10,-1);const times=[],frames=[];let last=performance.now();
      for(let i=0;i<420;i++){
        await raf();const t=performance.now();if(i>60)frames.push(t-last);last=t;
        if(i%24===0)p.performSkill('emberwitch_0_1',target,{x:p.x+4,y:p.y});
        if(i%100===0)p.performSkill('emberwitch_0_6',target,{x:p.x+3,y:p.y});
        if(i%120===0)p.performSkill('emberwitch_1_6',target,{x:p.x+3,y:p.y});
        if(i%70===0)p.performSkill('emberwitch_2_2',target,{x:p.x+3,y:p.y});
        tick(1/60);if(i>60)times.push(performance.now()-t);
      }
      const stat=a=>{a.sort((x,y)=>x-y);return {median:a[Math.floor(a.length*.5)],p95:a[Math.floor(a.length*.95)],max:a.at(-1)};};
      samples.push({enabled,viewport:[doc.querySelector('#view').width,doc.querySelector('#view').height],cpuMs:stat(times),frameMs:stat(frames),vfx:vfx.diagnostics()});results.textContent=JSON.stringify(samples,null,2);
    }
    const delta=samples[1].cpuMs.p95-samples[0].cpuMs.p95,withinBudget=wide||delta<=3;status.textContent=`${withinBudget?'PASS':'OVER BUDGET'} — skill spam measured; p95 CPU difference ${delta.toFixed(2)} ms`;
    document.body.dataset.testStatus=withinBudget?'passed':'failed';await publish(wide?'benchmark_4k':'benchmark_1080p',{samples,delta,withinBudget});
    }finally{busy=false;}
  }
  window.skillReview={game,win,data,setup,cast,tick,replay,get player(){return game.state.player;},get target(){return target;},pause(){playing=false;win.eval('Sfx').stopSkills?.();},resume(){playing=true;elapsed=0;},get playing(){return playing;}};
  await replay();if(params.has('at')){playing=false;for(let i=0;i<Math.min(600,+params.get('at')*60);i++)tick(1/60);$('pause').textContent='Play';}loop();if(params.has('audit'))await audit();if(params.has('benchmark'))await benchmark();
}catch(e){fail(e);}
