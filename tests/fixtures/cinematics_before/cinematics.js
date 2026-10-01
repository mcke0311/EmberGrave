/* Live, render-only scene staging. Simulation time and campaign commits belong
   to Game. Replays have their own map and actors and never become the saved world. */
"use strict";
const Cinematics = (() => {
  let session=null, library=null, generation=0;
  const clamp=t=>Math.max(0,Math.min(1,t)), smooth=t=>{t=clamp(t);return t*t*(3-2*t);};
  const solo=()=>!globalThis.COOP_WORKER&&!(typeof Coop!=='undefined'&&Coop.active);
  const reduced=()=>!!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const point=o=>({x:o.x,y:o.y,surfaceId:o.surfaceId||0});
  function initialize(s, legacy=false) {
    s.characterFlags ||= {};
    const old=s.characterFlags.cinematics;
    if(old?.v===1){
      old.seen||={};old.unlocked||={};
      // Act I co-op still writes the legacy video flags after this book exists.
      for(const d of CinematicScenes.all)if(s.characterFlags['sawCine_'+d.id]||(d.legacyFlag&&s.characterFlags[d.legacyFlag]))old.seen[d.id]=old.unlocked[d.id]=true;
      return old;
    }
    const book=s.characterFlags.cinematics={v:1,seen:{},unlocked:{}};
    if(!legacy)return book;
    const campaigns=[s,...Object.values(s.campaignsByDifficulty||{})];
    const completed=(c,id)=>c.quests?.[id]?.state==='done';
    for(const d of CinematicScenes.all){
      const known=(d.legacyFlag&&s.characterFlags[d.legacyFlag])||s.characterFlags['sawCine_'+d.id]||campaigns.some(c=>{
        const f=c.flags||{},q=c.quests||{},ledger=f.campaign||{};
        if(d.ending)return f.ending===d.ending;
        if(d.boss||d.bossDead){const id=d.boss||d.bossDead;return !!(f['dead_'+id]||Object.keys(f).some(k=>k.startsWith('dead_'+id+'@')&&f[k]));}
        if(d.quest)return completed(c,d.quest);
        if(d.id==='oathsworn')return !!q.q8b?.trioSpawned||completed(c,'q8b');
        if(d.object)return Object.keys(ledger).some(k=>k.endsWith(':'+d.object)&&ledger[k])||completed(c,({mire_shard:'q12',imprisoned_scholar:'q14',fortress_map:'q15',hell_portal:'q17'})[d.object]);
        if(d.arrival)return (c.shrines||[]).includes(d.arrival)||!!f['seen_act'+d.act];
        if(d.id==='quieting')return completed(c,'q10')||!!q.q11;
        return false;
      });
      if(known)book.seen[d.id]=book.unlocked[d.id]=true;
    }
    return book;
  }
  function eligible(id,s=Game.state){return solo()&&!!s&&!s.player.dead&&!s.map?.zone.echo&&!!CinematicScenes.get(id)&&!initialize(s).seen[id];}
  function node(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text)e.textContent=text;return e;}
  function button(text,fn){const b=node('button','cine-button',text);b.type='button';b.onclick=fn;return b;}
  function key(e){
    const root=session?.root||library;if(!root)return;
    if(e.type==='keyup'){e.stopImmediatePropagation();return;}
    if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();session?finish('skipped'):closeLibrary();return;}
    if(e.key==='Tab'){
      const controls=[...root.querySelectorAll('button:not(:disabled),summary')];
      if(controls.length){const i=controls.indexOf(document.activeElement),next=i<0?(e.shiftKey?controls.length-1:0):(i+(e.shiftKey?-1:1)+controls.length)%controls.length;e.preventDefault();controls[next].focus();}
    }
    if(!['Tab','Shift','Control','Alt','Meta'].includes(e.key))e.stopImmediatePropagation();
  }
  function bindKeys(){document.addEventListener('keydown',key,true);document.addEventListener('keyup',key,true);}
  function unbindKeys(){if(!session&&!library){document.removeEventListener('keydown',key,true);document.removeEventListener('keyup',key,true);}}
  function unlock(s,id,seen){const b=initialize(s);b.unlocked[id]=true;if(seen)b.seen[id]=true;}
  function request(id,context={}) {
    const d=CinematicScenes.get(id),origin=Game.state;
    if(!d||!origin||!solo())return Promise.resolve('skipped');
    const replay=context.replay===true;
    if(session)return Promise.resolve('cancelled');
    if(!replay&&(!eligible(id,origin)||(d.ending&&origin.flags.ending!==d.ending)))return Promise.resolve('skipped');
    if(!replay){unlock(origin,id,false);if(Game.options.cinematics===false){unlock(origin,id,true);Game.saveGame();return Promise.resolve('skipped');}Game.saveGame();}
    const token=++generation;
    let resolve;const promise=new Promise(r=>resolve=r);
    session={token,d,origin,originMap:origin.map,context,replay,resolve,time:0,ready:false,fallback:false,views:new Map(),extras:[],props:[],soundIndex:0,focus:null,vista:null,
      returnFocus:document.activeElement,root:null,world:origin,reduced:context.reducedMotion??reduced()};
    Game.cancelMenuInput();UI.closeAll();UI.closeEsc();UI.hideTooltip?.();
    const root=node('section','cine-scene');root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-labelledby','cineTitle');
    const heading=node('header','cine-heading');heading.append(node('span','cine-act',d.ending?'THE SUNDERSTONE SAGA':'ACT '+d.act),node('h2','',d.title));heading.lastChild.id='cineTitle';
    const caption=node('div','cine-caption');caption.setAttribute('role','status');caption.setAttribute('aria-live','polite');caption.setAttribute('aria-atomic','true');
    const speaker=node('span','cine-speaker'),line=node('p','cine-line','Preparing scene…');caption.append(speaker,line);
    const skip=button('Skip scene',()=>finish('skipped'));skip.classList.add('cine-skip');skip.setAttribute('aria-keyshortcuts','Escape');
    root.append(heading,caption,skip);document.getElementById('game').append(root);root.style.setProperty('--cine-color',d.color);
    Object.assign(session,{root,caption,speaker,line,skip});document.body.classList.add('cine-playing');if(library)library.hidden=true;bindKeys();skip.focus();
    prepare(session).catch(err=>fallback(err,token));return promise;
  }
  async function prepare(s){
    if(s.replay)s.world=await Game.cinematicWorld(s.d);
    if(session!==s)return;
    const bundles=new Set([s.world.map.id,s.world.map.zone.artZone||s.world.map.id,...s.d.bundles].map(z=>'zone:'+z));
    const arena=s.world.map.zone.arena||s.world.map.zone.arenaEntrance;
    if(arena)bundles.add('arena:'+arena);
    if(s.d.boss)bundles.add('boss:'+s.d.boss);
    const actorBundle='actors:act'+s.d.act;
    if(Object.values(DATA.SPRITE_MANIFEST.entries).some(e=>e.bundle===actorBundle))bundles.add(actorBundle);
    let timer;
    try{
      await Promise.race([Promise.all([...bundles].map(z=>SpriteAssets.loadBundle(z))),
        new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Scene assets took too long to load')),6000);})]);
    }finally{clearTimeout(timer);}
    if(session!==s)return;
    if(s.context.missingAsset)throw Error('Review: missing scene asset');
    UI.closeAll();
    stage(s);
    Game.resetCinematicCamera?.(); // Fixed framing takes effect immediately for reduced motion.
    for(const pr of s.props)SpriteAssets.getFrame(SpriteAssets.maps.props[pr.type],0);
    s.ready=true;s.releaseMusic=Sfx.cinematicMix?.(s.d.music||s.world.zoneMusic||DATA.ZONES[s.d.zone].music);
    updatePresentation(s);updateCaption(s);
  }
  function view(s,actor){
    if(s.views.has(actor))return s.views.get(actor);
    const v=Object.create(actor);Object.assign(v,{x:actor.x,y:actor.y,action:null,command:null,path:null,moving:false,flashT:0,cinematicView:true,cinematicAlpha:1});
    if(actor.spriteOpts)v.spriteOpts={...actor.spriteOpts};
    v.pose=()=>{
      const raw=actor.pose(),state=v.cinematicState||'idle';
      const ex={...raw.ex};delete ex.animation;delete ex.wildshape;
      ex.walkPh=v.moving?s.time*5:undefined;
      if(actor===s.world.player){ex.interaction={};delete ex.act1Animation;}
      if(ex.act1Animation)ex.act1Animation={...ex.act1Animation,clock:s.time,walkPhase:v.moving?s.time*5:null};
      return {...raw,state,t:['idle','walk'].includes(state)?s.time:clamp((s.time-(v.poseFrom||0))/Math.max(.01,(v.poseTo||2)-(v.poseFrom||0))),ang:v.visAng??raw.ang,ex};
    };
    s.views.set(actor,v);return v;
  }
  function npc(s,art,x,y,name){
    const a={x,y,surfaceId:0,dir:5,visAng:Math.PI*.75,animT:0,cinematicAlpha:1,spriteOpts:{kind:'human',npcArt:art},pose:()=>({state:'idle',t:0,ang:Math.PI*.75,ex:{}}),name};
    s.extras.push(a);return view(s,a);
  }
  function nearest(map,x,y){
    for(let r=0;r<10;r++)for(let oy=-r;oy<=r;oy++)for(let ox=-r;ox<=r;ox++){
      if(Math.max(Math.abs(ox),Math.abs(oy))!==r)continue;
      if(MapGen.walkable(map,x+ox,y+oy))return {x:Math.floor(x+ox)+.5,y:Math.floor(y+oy)+.5,surfaceId:0};
    }
    return point(Game.state.player);
  }
  function stage(s){
    const w=s.world,m=w.map,p=w.player,d=s.d;
    const hero=view(s,p);hero.visAng=Math.PI*1.25;s.hero=hero;
    let focus=s.context.subject||w.monsters.find(a=>a.defId===d.boss)||m.props.find(a=>a.storyId===d.object)||w.npcs.find(a=>a.storyId===d.object);
    if(d.visual==='ledger')focus=w.npcs.find(a=>a.id==='sera')||focus;
    if(d.visual==='rise')focus=s.context.anchor||w.quests.q8b?.trioAnchor||m.frontier?.anchors.beacons?.[0];
    if(!focus)focus={x:p.x+2,y:p.y-2,surfaceId:p.surfaceId};
    s.focus=point(focus);s.vista={x:s.focus.x+3,y:s.focus.y-3,surfaceId:s.focus.surfaceId};
    if(focus.pose){s.focusActor=view(s,focus);if(!w.monsters.includes(focus)&&!w.npcs.includes(focus))s.extras.push(focus);}
    if(['excavation','breach'].includes(d.visual)){
      const landmark=m.props.filter(a=>!a.hidden&&Math.hypot(a.x-p.x,a.y-p.y)<20).find(a=>/crane|gate|colossus|tower|fort|mechanism/.test(a.visual||a.type));
      if(landmark){s.focus=point(landmark);s.vista={x:(p.x+landmark.x)/2,y:(p.y+landmark.y)/2,surfaceId:0};}
    }
    if(d.visual==='assembly'){
      const rooms=m.cathedral?.rooms||[];const r=rooms.find(r=>/arrival|entry|nave/.test(r.id))||rooms[0];
      if(r)s.focus={x:r.x??r.cx??p.x+3,y:r.y??r.cy??p.y-3,surfaceId:0};
      s.vista={x:s.focus.x+3,y:s.focus.y-3,surfaceId:0};
    }
    if(d.visual==='quieting'){
      const water=m.act2?.water;let best=null,dist=Infinity;
      if(water)for(let i=0;i<water.length;i++)if(water[i]){const x=i%m.w+.5,y=Math.floor(i/m.w)+.5,dd=Math.hypot(x-p.x,y-p.y);if(dd<dist){best={x,y,surfaceId:0};dist=dd;}}
      s.focus=best||s.focus;s.vista=point(s.focus);s.walkers=[];
      for(let i=0;i<3;i++){const start=nearest(m,s.focus.x-3+i,s.focus.y+3),a=npc(s,'resident_marshcamp_'+i,start.x,start.y,'The Quieted');a.start=start;a.end={x:s.focus.x+i*.5,y:s.focus.y-i*.5};s.walkers.push(a);}
    }
    if(d.visual==='rise')for(const [i,id]of ['barb_axe','barb_pole','barb_sword'].entries()){
      const pos=nearest(m,s.focus.x+Math.cos(i*2.1)*4,s.focus.y+Math.sin(i*2.1)*4),a=Game.cinematicActor(id,pos,s.world),v=view(s,a);
      s.extras.push(a);v.riseIndex=i;
    }
    if(d.visual==='give')s.warden=npc(s,'resident_frosthaven_0',s.focus.x+2,s.focus.y-1,'Seraneth');
    if(d.visual==='breach'){
      s.rivals=[];
      for(const [i,id]of ['ash_fiend','cinder_hound'].entries()){
        const pos=nearest(m,s.vista.x+2+i*2,s.vista.y+1),a=Game.cinematicActor(id,pos,w);s.extras.push(a);s.rivals.push(view(s,a));
      }
      for(const [i,a]of s.rivals.entries())a.visAng=Math.atan2(s.rivals[1-i].y-a.y,s.rivals[1-i].x-a.x);
    }
    if(['ledger','map'].includes(d.visual))s.props.push({type:'board',x:s.focus.x,y:s.focus.y,z:34,scale:.55});
    if(['shard','portal','core','destroy','seal','give'].includes(d.visual))s.props.push({type:'embershard',x:s.focus.x,y:s.focus.y,z:26,scale:.8});
    if(d.ending){const pos=nearest(m,s.focus.x-1,s.focus.y+1);Object.assign(hero,pos);}
    hero.visAng=Math.atan2(s.focus.y-hero.y,s.focus.x-hero.x);
  }
  function updatePresentation(s){
    const t=s.time,d=s.d;
    for(const v of s.views.values()){v.cinematicState='idle';v.animT=t;if(v.spriteOpts?.bossArt)v.spriteOpts.bossPose='idle';}
    for(const track of d.actors)if(t>=track.from&&t<track.to){const a=track.target==='hero'?s.hero:s.focusActor;if(a){a.cinematicState=track.state;a.poseFrom=track.from;a.poseTo=track.to;if(a.spriteOpts?.bossArt)a.spriteOpts.bossPose=track.state;}}
    for(const [i,a]of (s.walkers||[]).entries()){const progress=smooth((t-3-i*2)/11),k=s.reduced?0:progress;a.x=a.start.x+(a.end.x-a.start.x)*k;a.y=a.start.y+(a.end.y-a.start.y)*k;a.moving=k>0&&k<1;a.cinematicState=a.moving?'walk':'idle';a.cinematicAlpha=1-smooth((progress-.6)/.4);a.cinematicZ=-k*14;}
    for(const [i,a]of (s.rivals||[]).entries()){a.cinematicState=s.reduced?'idle':'attack';a.poseFrom=Math.floor((t+i)/2.5)*2.5-i;a.poseTo=a.poseFrom+2.5;}
    for(const v of s.views.values())if(v.riseIndex!==undefined){const k=smooth((t-1-v.riseIndex)/3);v.cinematicAlpha=k;v.cinematicZ=s.reduced?0:-25*(1-k);v.cinematicState=k<1?'kneel':'idle';}
    if(s.warden)s.warden.cinematicAlpha=smooth((t-4)/5)*(1-smooth((t-25)/6));
    for(const pr of s.props){pr.alpha=1;pr.z=26+(s.reduced?0:Math.sin(t*1.7)*3);
      if(d.visual==='shard'){const k=smooth((t-4)/7);pr.x=s.focus.x+(s.hero.x-s.focus.x)*k;pr.y=s.focus.y+(s.hero.y-s.focus.y)*k;}
      if(d.visual==='destroy')pr.alpha=1-smooth((t-9)/2);
      if(d.visual==='seal')pr.alpha=1-smooth((t-12)/8);
      if(d.visual==='give'){const k=smooth((t-10)/8);pr.x=s.focus.x+2*k;pr.y=s.focus.y-k;pr.alpha=1-smooth((t-25)/6);}
    }
  }
  function updateCaption(s){const c=[...s.d.captions].reverse().find(c=>c.at<=s.time);if(c&&s.currentCaption!==c){s.currentCaption=c;s.speaker.textContent=c.speaker;s.line.textContent=c.text;}}
  function fallback(error,token=session?.token){
    const s=session;if(!s||s.token!==token)return;
    s.ready=true;s.fallback=true;s.views.clear();s.extras=[];s.props=[];s.releaseMusic?.();s.releaseMusic=null;
    s.root.classList.add('cine-fallback');s.speaker.textContent='';s.line.textContent='';s.caption.removeAttribute('role');
    s.caption.replaceChildren(node('p','cine-fallback-note','Scene artwork is unavailable. The story continues below.'));
    for(const c of s.d.captions)s.caption.append(node('p','cine-line',(c.speaker?c.speaker+': ':'')+c.text));
    s.skip.textContent='Continue';s.error=String(error?.message||error);
  }
  function finish(result='completed'){
    const s=session;if(!s)return;session=null;generation++;
    s.root.remove();s.releaseMusic?.();Game.cancelMenuInput();Game.resetCinematicCamera?.();document.body.classList.remove('cine-playing');
    if(!s.replay&&Game.state===s.origin){if(result!=='cancelled'){unlock(s.origin,s.d.id,true);if(s.d.legacyFlag)s.origin.characterFlags[s.d.legacyFlag]=true;}Game.saveGame();}
    if(library){library.hidden=false;library.querySelector('[data-scene="'+s.d.id+'"]')?.focus();}
    else if(s.returnFocus?.isConnected&&!s.returnFocus.closest?.('.hidden,[hidden],[inert]'))s.returnFocus.focus();
    else document.getElementById('view')?.focus();
    unbindKeys();s.resolve(result);
  }
  function cancel(reason='cancelled'){if(session)finish('cancelled');if(library)closeLibrary(false);}
  function tick(dt){
    const s=session;if(!s)return;
    if(Game.state!==s.origin||Game.state.map!==s.originMap||Game.state.player.dead){cancel('world changed');return;}
    if(!s.ready||s.paused||document.hidden||(typeof MobileShell!=='undefined'&&MobileShell.blocked))return;
    s.time=Math.min(s.d.duration,s.time+Math.max(0,dt));
    if(!s.fallback){updatePresentation(s);updateCaption(s);while(s.soundIndex<s.d.sounds.length&&s.d.sounds[s.soundIndex].at<=s.time){Sfx.play(s.d.sounds[s.soundIndex++].id);}}
    if(s.time>=s.d.duration)finish('completed');
  }
  function cameraTarget(){
    const s=session;if(!s?.ready||s.fallback)return null;
    if(s.reduced)return {x:(s.hero.x+s.focus.x)/2,y:(s.hero.y+s.focus.y)/2,surfaceId:s.hero.surfaceId};
    const tracks=s.d.camera;let i=0;while(i+1<tracks.length&&tracks[i+1].at<=s.time)i++;
    const position=c=>{const a=c.target==='hero'?s.hero:c.target==='vista'?s.vista:s.focus;return {x:a.x+(c.dx||0),y:a.y+(c.dy||0),surfaceId:a.surfaceId||0};};
    const a=position(tracks[i]),b=position(tracks[Math.min(i+1,tracks.length-1)]),k=smooth((s.time-tracks[i].at)/Math.max(.01,tracks[Math.min(i+1,tracks.length-1)].at-tracks[i].at));
    return {x:a.x+(b.x-a.x)*k,y:a.y+(b.y-a.y)*k,surfaceId:a.surfaceId};
  }
  function actorView(a){return session?.ready&&!session.fallback?session.views.get(a)||a:a;}
  function effect(s){return s.d.effects.find(e=>s.time>=e.from&&s.time<e.to)?.kind;}
  function append(draws,cam){
    const s=session;if(!s?.ready||s.fallback)return;
    for(const actor of s.extras){const a=actorView(actor);draws.push({kind:'cinematicActor',d:a.x+a.y,sx:U.isoX(a.x,a.y)-cam.x,sy:U.isoY(a.x,a.y)-cam.y,actor:a});}
    for(const pr of s.props)draws.push({kind:'cinematicProp',d:pr.x+pr.y+.1,sx:U.isoX(pr.x,pr.y)-cam.x,sy:U.isoY(pr.x,pr.y)-cam.y,pr});
  }
  function drawProp(ctx,d){try{const pr=d.pr;SpriteAssets.drawFrame(ctx,SpriteAssets.getFrame(SpriteAssets.maps.props[pr.type],0),d.sx,d.sy-pr.z,{scale:pr.scale,alpha:pr.alpha});}catch(e){fallback(e);}}
  function ground(ctx,cam){
    const s=session;if(!s?.ready||s.fallback)return;
    const d=s.d,t=s.time,q=s.focus,x=U.isoX(q.x,q.y)-cam.x,y=U.isoY(q.x,q.y)-cam.y,color=d.color,visual=effect(s);
    ctx.save();
    if(visual==='rescue'){
      const k=1-smooth((t-2)/3);ctx.strokeStyle=color;ctx.globalAlpha=.8*k;ctx.lineWidth=2;
      for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(x+side*30,y+4);ctx.lineTo(x+side*12,y-12-(s.reduced?0:(1-k)*18));ctx.lineTo(x+side*4,y-20);ctx.stroke();}
    }
    if(['rise','rescue','portal','core','destroy','seal','give','shard','boss'].includes(visual)){
      const k=smooth(t/3);ctx.strokeStyle=color;ctx.lineWidth=1.3;ctx.globalAlpha=.32*k;
      for(let i=0;i<3;i++){ctx.beginPath();ctx.ellipse(x,y,24+i*17,12+i*8.5,0,0,Math.PI*2);ctx.stroke();}
      if(d.visual==='seal')for(let i=0;i<8;i++){const a=i*Math.PI/4,rr=70;ctx.beginPath();ctx.moveTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr*.5);ctx.lineTo(x+Math.cos(a+.2)*(rr-12),y+Math.sin(a+.2)*(rr-12)*.5);ctx.stroke();}
    }
    if(visual==='seal'){
      ctx.fillStyle='#08030e';ctx.globalAlpha=.65*smooth((t-12)/12);ctx.beginPath();ctx.ellipse(x+18,y-6,38,12,-.15,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+48,y-12,x+65,y-3);ctx.quadraticCurveTo(x+27,y+13,x,y);ctx.fill();
    }
    if(d.id==='vethriss'||d.visual==='give'){
      const a=d.visual==='give'?s.warden:s.focusActor;
      if(a){ctx.translate(U.isoX(a.x,a.y)-cam.x,U.isoY(a.x,a.y)-cam.y);ctx.transform(1,0,-.9-(s.reduced?0:Math.sin(t*.5)*.3),.25,0,0);ctx.globalAlpha=.55;ctx.filter='brightness(0)';SpriteAssets.drawActor(ctx,a.spriteOpts,a.pose());}
    }
    ctx.restore();
  }
  function atmosphere(ctx,cam,W,H){
    const s=session;if(!s?.ready||s.fallback)return;
    const {d,time:t}=s,q=s.focus,x=U.isoX(q.x,q.y)-cam.x,y=U.isoY(q.x,q.y)-cam.y,visual=effect(s);
    ctx.save();
    if(visual==='quieting'){
      const g=ctx.createRadialGradient(x,y,20,x,y,250);g.addColorStop(0,'#254846bb');g.addColorStop(1,'#25484600');ctx.fillStyle=g;ctx.globalAlpha=.7;ctx.fillRect(x-250,y-250,500,500);
    }
    if(visual==='breach'&&!s.reduced&&s.rivals?.length===2){
      const [a,b]=s.rivals,px=U.isoX((a.x+b.x)/2,(a.y+b.y)/2)-cam.x,py=U.isoY((a.x+b.x)/2,(a.y+b.y)/2)-cam.y-25;
      ctx.strokeStyle=d.color;ctx.globalAlpha=.45*Math.max(0,Math.sin(t*2.5));
      for(let i=0;i<5;i++){const angle=i*1.256;ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px+Math.cos(angle)*12,py+Math.sin(angle)*8);ctx.stroke();}
    }
    if(['portal','core','destroy','give','shard','rescue','excavation','boss'].includes(visual)){
      const k=d.visual==='destroy'?smooth((t-8)/4):smooth(t/4),r=d.visual==='portal'?70:40;
      const g=ctx.createRadialGradient(x,y-30,2,x,y-30,r*2);g.addColorStop(0,d.color+'55');g.addColorStop(1,d.color+'00');ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.7*k;ctx.fillStyle=g;ctx.fillRect(x-r*2,y-30-r*2,r*4,r*4);
      ctx.strokeStyle=d.color;ctx.lineWidth=1.5;
      const n=d.visual==='destroy'?7:12;
      for(let i=0;i<n;i++){const angle=i*2.399+(s.reduced?0:t*.17),distance=d.visual==='destroy'?40+smooth((t-8)/6)*140:25+i*4;
        const px=x+Math.cos(angle)*distance,py=y+Math.sin(angle)*distance*.5-(s.reduced?16:10+(t*12+i*13)%65);
        if(d.visual==='portal'){ctx.beginPath();ctx.ellipse(x,y-38,24+k*18,40+k*30,0,0,Math.PI*2);ctx.stroke();break;}
        if(d.visual==='destroy'){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(px,py+30);ctx.lineTo(px+12,py+25);ctx.stroke();}
        else {ctx.globalAlpha=.15+k*.35;ctx.fillStyle=d.color;ctx.fillRect(px,py,2,3);}
      }
    }
    if(['ledger','map'].includes(visual)){
      ctx.strokeStyle=d.color;ctx.globalAlpha=smooth(t/4)*.6;ctx.setLineDash([3,4]);ctx.beginPath();ctx.moveTo(x-20,y-30);ctx.lineTo(x-3,y-45);ctx.lineTo(x+15,y-34);ctx.lineTo(x+22,y-55);ctx.stroke();
    }
    ctx.restore();
    if(!s.reduced){const fade=Math.max(1-smooth(t/.8),smooth((t-d.duration+.7)/.7));if(fade>0){ctx.save();ctx.globalAlpha=fade;ctx.fillStyle='#05080c';ctx.fillRect(0,0,W,H);ctx.restore();}}
  }
  function terrainAlpha(){return session?.ready&&!session.fallback&&effect(session)==='assembly'&&!session.reduced? .25+.75*smooth(session.time/8):1;}
  function architectureAlpha(d){return session?.ready&&effect(session)==='assembly'&&!session.fallback&&!session.reduced&&!['mon','minion','npc','player','cinematicActor','cinematicProp'].includes(d.kind)?smooth((session.time-1)/7):1;}
  function closeLibrary(returnToPause=true){if(!library)return;library.remove();library=null;unbindKeys();Game.cancelMenuInput();if(returnToPause&&Game.state)UI.openEsc();}
  function openLibrary(){
    if(!solo()||!Game.state||session)return;
    UI.closeAll();UI.closeEsc();Game.cancelMenuInput();if(library)library.remove();
    const root=library=node('section','cine-library');root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-labelledby','cineLibraryTitle');
    const box=node('div','cine-library-box'),title=node('h2','','Cinematics');title.id='cineLibraryTitle';box.append(title,node('p','cine-library-intro','Replay the moments your hero has discovered. Replays never change your journey.'));
    const book=initialize(Game.state),list=node('div','cine-library-list');
    for(const d of CinematicScenes.all){
      const row=node('article','cine-library-row');
      if(!book.unlocked[d.id]){row.append(node('p','cine-locked',d.ending?'Undiscovered ending':'Undiscovered moment · Act '+d.act));}
      else {
        row.append(node('h3','',d.title),node('p','cine-duration',d.duration+' seconds'));
        const play=button('Replay',()=>request(d.id,{replay:true}));play.dataset.scene=d.id;play.setAttribute('aria-label','Replay '+d.title);row.append(play);
        const transcript=node('details','cine-transcript');transcript.append(node('summary','','Read transcript'));
        for(const c of d.captions)transcript.append(node('p','',(c.speaker?c.speaker+': ':'')+c.text));row.append(transcript);
      }
      list.append(row);
    }
    box.append(list,button('Back',()=>closeLibrary()));root.append(box);document.getElementById('game').append(root);bindKeys();box.querySelector('button')?.focus();
  }
  return {request,tick,cancel,initialize,eligible,openLibrary,closeLibrary,actorView,append,drawProp,ground,atmosphere,terrainAlpha,architectureAlpha,cameraTarget,fallback,setPaused:value=>{if(session)session.paused=!!value;},
    get active(){return !!session||!!library;},get playing(){return !!session;},get presentationWorld(){return session?.ready&&session.replay&&!session.fallback?session.world:null;},
    get state(){return session?{id:session.d.id,time:session.time,duration:session.d.duration,ready:session.ready,replay:session.replay,fallback:session.fallback,error:session.error}:null;}};
})();
