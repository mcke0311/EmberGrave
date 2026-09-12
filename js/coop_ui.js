const CoopUI=(()=>{
  let dialog=null,statusEl=null,hud=null,screen='',travelId=null,lastTick=0,hudKey='',selectedHero=null,draft={};
  const healthBars=new Map();
  const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;};
  const button=(label,fn,cls)=>{const b=el('button',label,cls);b.type='button';b.onclick=fn;return b;};
  function close(){const focus=dialog?._opener;if(screen==='travel'&&travelId){Coop.answerTravel(false);travelId=null;}dialog?.close();dialog?.remove();dialog=null;screen='';statusEl=null;if(typeof UI!=='undefined')UI.hideTooltip();if(typeof MobileWorkspace!=='undefined')MobileWorkspace.sync();if(focus?.isConnected)focus.focus({preventScroll:true});}
  function shell(title,kind){
    close();if(Game.state)UI.closeAll();Game.cancelMenuInput();const opener=document.activeElement;screen=kind;dialog=el('dialog',null,'coop-dialog');dialog.setAttribute('aria-label',title);dialog._opener=opener;
    const head=el('div',null,'coop-header');head.append(el('h2',title),button('Close',close));dialog.append(head);
    dialog.addEventListener('cancel',e=>{e.preventDefault();close();});document.body.append(dialog);dialog.showModal();
    statusEl=el('p',null,'coop-status');statusEl.setAttribute('role','status');dialog.append(statusEl);return dialog;
  }
  function status(text){if(statusEl)statusEl.textContent=text;else if(!Game.state){let node=document.querySelector('#titleMenu .title-status');if(!node){node=el('p',null,'title-status');node.setAttribute('role','alert');document.getElementById('titleMenu').append(node);}node.textContent=text;}}
  function field(parent,label,element){const wrap=el('label',label);wrap.append(element);parent.append(wrap);return element;}
  async function open(){
    close();
    const [heroes,campaigns]=await Promise.all([CoopStore.heroes(),CoopStore.campaigns()]);
    const create=()=>TitleScreen.newHero({coop:true,back:heroes.length?open:()=>TitleScreen.main({focus:true}),create:async(name,classId)=>{
      const h=await Coop.newHero(name,classId);selectedHero=h.id;await open();await lobby(h);
    }});
    if(!heroes.length){create();return;}
    const saves=heroes.sort((a,b)=>(b.savedAt||0)-(a.savedAt||0)).map(h=>({...h,slot:h.id,equipment:CoopCodec.restoreHero(h).equip}));
    TitleScreen.savedHeroes({coop:true,saves,selectedId:selectedHero,newHero:create,refresh:open,
      onChange:h=>selectedHero=h.id,onSelect:lobby,remove:h=>CoopStore.deleteHero(h.id),
      deleteMessage:h=>{const owned=campaigns.filter(c=>c.ownerHeroId===h.id);return 'Bury '+h.name+' forever?'+(owned.length?' This also deletes owned campaigns: '+owned.map(c=>c.name).join(', ')+'.':'');}
    });
  }
  async function lobby(hero){
    selectedHero=hero.id;
    const d=shell('Host or join a party','lobby');
    const back=button('← Back to heroes',()=>{close();open().catch(e=>UI.msg(e.message));});d.querySelector('.coop-header button').replaceWith(back);
    d.append(el('p',hero.name+' · Level '+hero.lvl+' '+DATA.CLASSES[hero.classId].name,'coop-note'));
    d.append(el('p','Up to four friends · Player-hosted · Act I','coop-note'));
    const campaigns=await CoopStore.campaigns();if(dialog!==d)return;
    const saved=el('select');saved.id='coopCampaign';const opt=el('option','New Act I campaign');opt.value='';saved.append(opt);
    for(const c of campaigns.filter(c=>c.ownerHeroId===hero.id)){const o=el('option',c.name);o.value=c.id;saved.append(o);}
    saved.value=draft[hero.id]||'';saved.onchange=()=>draft[hero.id]=saved.value;field(d,'Host campaign',saved);
    const code=field(d,'Room code',el('input'));code.id='coopRoom';code.maxLength=10;code.autocomplete='off';code.value=draft.room??new URLSearchParams(location.hash.slice(1)).get('coop')??Coop.resumeInfo()?.room??'';code.oninput=()=>draft.room=code.value;
    const advanced=el('details'),summary=el('summary','Connection settings');advanced.append(summary);d.append(advanced);
    const relay=field(advanced,'Relay address',el('input'));relay.id='coopRelay';relay.value=draft.relay||window.COOP_CONFIG.relayUrl;relay.oninput=()=>draft.relay=relay.value;
    async function start(mode){
      window.COOP_CONFIG.relayUrl=relay.value.trim();status('Connecting to the party…');d.setAttribute('aria-busy','true');
      const controls=[...d.querySelectorAll('button,input,select')];controls.forEach(b=>b.disabled=true);
      try{await Coop.connect(mode,hero.id,code.value.trim().toUpperCase(),saved.value||null);if(Coop.host)close();else status('Waiting for the host to load your hero…');}
      catch(e){status(e.message);}finally{d.removeAttribute('aria-busy');controls.forEach(b=>b.disabled=false);}
    }
    const actions=el('div',null,'coop-actions');actions.append(button('Host a party',()=>start('host'),'coop-primary'),button('Join party',()=>start('join')));d.append(actions);
    d.append(el('p','Co-op heroes are saved on this device. Solo heroes and progress stay separate.','coop-note'));
  }
  function refresh(){
    if(Game.state){UI.refreshManagement();if(screen==='party')refreshParty();}
    if(typeof MobileWorkspace!=='undefined')MobileWorkspace.sync();
    if(!Coop.active){if(hud)hud.hidden=true;hudKey='';return;}
    if(screen==='lobby'&&Game.state?.players?.some(p=>p._coopId===Coop.localId)&&!Coop.loading)close();
    if(!hud){hud=el('aside');hud.id='coopHUD';hud.setAttribute('aria-label','Co-op party');document.body.append(hud);}
    hud.hidden=false;
    const players=Game.state?.players||[],key=JSON.stringify([Coop.room,Coop.paused,Coop.host,Coop.saveError,players.map(p=>[p._coopId,p.name,p.classId,p===Game.state.player,p.dead,p.connected,Coop.roster.find(r=>r.id===p._coopId)?.ready])]);
    if(key===hudKey){for(const p of players){const bar=healthBars.get(p._coopId);if(bar){if(bar.max!==p.stats.maxHp)bar.max=p.stats.maxHp;if(bar.value!==p.hp)bar.value=p.hp;}}return;}
    hudKey=key;healthBars.clear();hud.replaceChildren();
    const top=el('div','ROOM '+Coop.room);top.style.letterSpacing='.12em';hud.append(top);
    for(const p of Game.state?.players||[]){
      const line=el('div',null,'coop-party-line');line.append(el('span',p.name+(p===Game.state.player?' (you)':'')+' · '+DATA.CLASSES[p.classId].name),el('span',p.connected===false?'Offline':p.dead?'Fallen':Coop.roster.find(r=>r.id===p._coopId)?.ready?'Ready':'Playing'));hud.append(line);
      const bar=el('progress');bar.max=p.stats.maxHp;bar.value=p.hp;bar.setAttribute('aria-label',p.name+' health');hud.append(bar);
      healthBars.set(p._coopId,bar);
    }
    const actions=el('div',null,'coop-actions');actions.append(button('Party',party),button('Ready',()=>Coop.ready(!Coop.roster.find(p=>p.id===Coop.localId)?.ready)));hud.append(actions);
    const pause=el('div',Coop.paused,'coop-pause');pause.id='coopPause';hud.append(pause);
    if(Coop.host&&Coop.paused==='Save failed')hud.append(button('Retry saving',()=>Coop.retrySave()));
    if(Coop.saveError){hud.append(el('div','Local hero save failed','coop-pause'),button('Retry local save',()=>Coop.retrySave()));}
  }
  function tick(){if(performance.now()-lastTick<250)return;lastTick=performance.now();refresh();}
  function party(){
    const d=shell('Your party','party');d.append(el('p','Room '+Coop.room));
    d.append(button('Copy invitation',async()=>{try{const url=new URL(location.href);url.hash='coop='+Coop.room;await navigator.clipboard.writeText(url.href);status('Invitation copied.');}catch{status('Room code: '+Coop.room);}}));
    const list=el('section');list.id='partyRoster';d.append(list);
    const ready=button('Ready',()=>Coop.ready(!Coop.roster.find(p=>p.id===Coop.localId)?.ready));ready.id='partyReady';d.append(ready);
    const connection=el('p',null,'coop-pause');connection.id='partyConnection';connection.setAttribute('role','status');d.append(connection);
    d.append(button('Retry saving',()=>Coop.retrySave()));
    d.append(el('p','Your host controls travel and campaign quests. Shared drops go to the first valid pickup.','coop-note'));
    d.append(button('Save and leave party',()=>Coop.leave()));refreshParty();
  }
  function refreshParty(){
    const list=document.getElementById('partyRoster');if(!list)return;
    const players=Game.state?.players||[],key=JSON.stringify(players.map(p=>[p._coopId,p.name,p.dead,p.connected]));
    if(list.dataset.key!==key){list.dataset.key=key;list.replaceChildren();for(const p of players){const row=el('div',null,'coop-row');row.append(el('strong',p.name+' · '+DATA.CLASSES[p.classId].name));
      const health=el('span');health.dataset.player=p._coopId;row.append(health);
      if(p.dead&&p!==Game.state.player)row.append(button('Revive',()=>Game.submitCommand({type:'revive',targetId:p._coopId})));list.append(row);
    }}
    for(const label of list.querySelectorAll('[data-player]')){const p=players.find(p=>p._coopId===label.dataset.player);label.textContent=p.connected===false?'Offline':p.dead?'Fallen':Math.ceil(p.hp)+' / '+Math.ceil(p.stats.maxHp)+' Life';}
    const ready=document.getElementById('partyReady'),isReady=!!Coop.roster.find(p=>p.id===Coop.localId)?.ready;ready.textContent=isReady?'Ready ✓':'Ready';ready.setAttribute('aria-pressed',String(isReady));
    document.getElementById('partyConnection').textContent=Coop.saveError?'Local hero save failed':Coop.paused||'Connected';
  }
  // Compatibility entry points route into the same screens as solo play.
  function management(type='inv',options={}){if(type==='vendor')return UI.openVendor(options.npcId);if(type==='storage')return UI.openStorage();if(type==='forge')return UI.openForge();return UI.togglePanel('inv');}
  function skillPick(which){UI.openSkillPick(which);}
  function travel(m){const d=shell('Travel together','travel');travelId=m.id;d.append(el('p','Journey to '+DATA.ZONES[m.zone].name+'?'));const row=el('div',null,'coop-actions');row.append(button('Ready to travel',()=>{Coop.answerTravel(true);status('Waiting for your party…');},'coop-primary'),button('Stay here',()=>{Coop.answerTravel(false);close();}));d.append(row);}
  function closeTravel(){travelId=null;if(screen==='travel')close();}
  function cinematic(e){UI.playVideo(e.src,()=>Coop.cinematicDone(e.id),true);}
  return {open,close,status,refresh,tick,party,management,skillPick,travel,closeTravel,cinematic,get isOpen(){return !!dialog?.open;},get travelId(){return travelId;}};
})();
