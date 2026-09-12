/* Multitouch controls. Gameplay stays in Game; this module owns pointer capture
   and layout, and never synthesizes keyboard or mouse events. */
"use strict";
const MobileControls = (() => {
  let root, stick, knob, moveZone, stickOrigin, world, enabled = false, lastTouch = -Infinity;
  const phone = () => typeof MobileShell !== 'undefined' && MobileShell.enabled;
  const pointers = new Map();
  let consumedTapUntil=0;
  const mode = new URLSearchParams(location.search).get('touch');
  function reset() {
    Game.resetTouch();
  }
  function releasePointers() {
    const captured = [...pointers]; pointers.clear();
    for (const [id, gesture] of captured) {
      if (gesture.el.hasPointerCapture(id)) gesture.el.releasePointerCapture(id);
      gesture.el.classList.remove('pressed');
    }
    if (knob) knob.style.transform = 'translate(0px, 0px)';
    stick?.classList.remove('engaged');stickOrigin=null;
  }
  function setEnabled(value) {
    enabled = value;
    document.body.classList.toggle('touch-controls', value);
    if (!value) reset();
    sync();
  }
  function moveStick(e) {
    const rect = stick.getBoundingClientRect(), radius = rect.width * .34;
    let x=e.clientX-(stickOrigin?.x??rect.left+rect.width/2), y=e.clientY-(stickOrigin?.y??rect.top+rect.height/2);
    const distance=Math.hypot(x,y);
    if (distance > radius) { x*=radius/distance; y*=radius/distance; }
    knob.style.transform=`translate(${x}px, ${y}px)`;
    Game.touchMove(distance < 10 ? 0 : x, distance < 10 ? 0 : y);
  }
  function skillInput(kind, down) {
    if(kind[0]==='Q')Game.touchQuickSlot(Number(kind.slice(1)),down);
    else Game.touchSkill(kind,down);
  }
  function bindHold(el, kind) {
    el.addEventListener('pointerdown', e => {
      if (!enabled || !Game.touchReady() || e.button !== 0 || [...pointers.values()].some(p => p.kind === kind ||
        (kind !== 'move' && p.kind !== 'move' && p.kind !== 'world'))) return;
      e.preventDefault();
      if (e.pointerType === 'touch') lastTouch = performance.now();
      UI.hideTooltip(); Sfx.init();
      if(kind[0]==='Q'&&!Game.state.player.quickSlots?.[Number(kind.slice(1))]) {
        reset();consumedTapUntil=performance.now()+800;MobileWorkspace.pickSkill(kind);return;
      }
      if(kind==='move'&&phone()) {
        const r=moveZone.getBoundingClientRect(),half=stick.offsetWidth/2;
        stickOrigin={x:Math.max(r.left+half,Math.min(r.right-half,e.clientX)),y:Math.max(r.top+half,Math.min(r.bottom-half,e.clientY))};
        stick.style.setProperty('--stick-x',(stickOrigin.x-r.left)+'px');
        stick.style.setProperty('--stick-y',(stickOrigin.y-r.top)+'px');
        stick.classList.add('engaged');
      }
      el.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId,{el,kind,skill:kind[0]==='Q'?Game.state.player.quickSlots?.[Number(kind.slice(1))]:Game.state.player['skill'+kind]}); el.classList.add('pressed');
      if (kind === 'move') moveStick(e); else skillInput(kind,true);
    });
    el.addEventListener('pointermove', e => {
      if (pointers.get(e.pointerId)?.kind !== 'move') return;
      e.preventDefault(); moveStick(e);
    });
    for (const event of ['pointerup','pointercancel','lostpointercapture']) el.addEventListener(event,e => {
      const gesture=pointers.get(e.pointerId); if (!gesture) return;
      pointers.delete(e.pointerId); el.classList.remove('pressed');
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
      if (kind === 'move') { Game.touchMove(0,0); knob.style.transform='translate(0px, 0px)';stick.classList.remove('engaged');stickOrigin=null; }
      else if (event === 'pointerup') skillInput(kind,false);
      else reset();
    });
    el.addEventListener('click', e => {
      // Keyboard and assistive-technology activation has no pointer gesture.
      if (e.detail === 0 && kind !== 'move' && Game.touchReady()) {
        if(kind[0]==='Q'&&!Game.state.player.quickSlots?.[Number(kind.slice(1))])MobileWorkspace.pickSkill(kind);
        else {skillInput(kind,true); skillInput(kind,false);}
      }
      e.preventDefault();
    });
  }
  // Browsers do not emit a compatibility click for every non-primary finger.
  // Activate touch taps on pointerup and ignore the later primary-finger click.
  function bindTap(el, activate) {
    let ignoreClickUntil = 0;
    el.addEventListener('pointerdown',e => {
      if (!enabled || e.pointerType !== 'touch') return;
      e.preventDefault(); ignoreClickUntil=performance.now()+800;
      el.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId,{el,kind:'tap'});
    });
    for (const event of ['pointerup','pointercancel','lostpointercapture']) el.addEventListener(event,e => {
      const p=pointers.get(e.pointerId); if (p?.el !== el || p.kind !== 'tap') return;
      pointers.delete(e.pointerId);
      if(el.hasPointerCapture(e.pointerId))el.releasePointerCapture(e.pointerId);
      ignoreClickUntil=performance.now()+800;
      const r=el.getBoundingClientRect();
      if(event === 'pointerup' && e.clientX>=r.left && e.clientX<=r.right && e.clientY>=r.top && e.clientY<=r.bottom) {
        e.preventDefault();consumedTapUntil=performance.now()+800;activate(e);
      }
    });
    el.addEventListener('click',e => {
      if (e.detail !== 0 && (performance.now()<ignoreClickUntil || (enabled && e.pointerType === 'touch'))) return;
      activate(e);
    });
  }
  function init(canvas) {
    if (root) return;
    world=canvas;
    // A tap can replace the HUD with a Close button under the same finger.
    // Consume its compatibility click even when it is retargeted to the new UI.
    document.addEventListener('pointerdown',()=>{consumedTapUntil=0;},true);
    document.addEventListener('click',e=>{if(e.detail&&performance.now()<consumedTapUntil&&(e.pointerType==='touch'||e.sourceCapabilities?.firesTouchEvents)){e.preventDefault();e.stopImmediatePropagation();}},true);
    root=document.createElement('div'); root.id='mobileControls'; root.hidden=true;
    root.innerHTML=`<div class="mobile-tools" aria-label="Game controls">
      <button type="button" data-action="party" hidden aria-label="Open party">Party</button>
      <button type="button" data-action="map" aria-label="Toggle map">Map</button>
      <button type="button" data-action="loot" aria-label="Toggle loot labels">Loot</button>
      <button type="button" data-action="menu" aria-label="Open menu or close panels">Menu</button>
    </div>
    <div class="phone-tools"><button type="button" data-action="pack" aria-label="Open pack">Pack</button><button type="button" data-action="phone-menu" aria-label="Open game menu">Menu<span class="phone-menu-badge" hidden>!</span></button></div>
    <button type="button" id="mobileMap" class="phone-only" data-action="map" aria-label="Toggle map"></button>
    <div id="mobileVitals" class="phone-only"><div class="phone-vital life"><span>Life</span><strong></strong><i></i></div><div class="phone-vital aether"><span>Aether</span><strong></strong><i></i></div></div>
    <div id="mobileMoveZone" aria-label="Movement thumbstick"><div id="mobileStick" aria-hidden="true"><span class="stick-guide">＋</span><span id="mobileKnob"></span><span class="stick-label">MOVE</span></div><span class="phone-move-hint phone-only">DRAG TO MOVE</span></div>
    <div class="mobile-actions">
      <button type="button" id="mobileAssign" aria-label="Assign secondary skill">Assign</button>
      <button type="button" data-action="jump" aria-label="Jump in movement or facing direction">Jump</button>
      <button type="button" id="mobileSkill" class="mobile-combat" aria-label="Use secondary skill"><span>Skill</span><small></small><b></b></button>
      <button type="button" id="mobileAttack" class="mobile-combat" aria-label="Attack nearby enemy"><span>Attack</span><small></small><b></b></button>
      ${Array.from({length:4},(_,i)=>`<button type="button" id="mobileQuick${i}" data-quick="${i}" class="mobile-combat phone-only" aria-label="Assign skill ${i+1}"><span class="phone-skill-icon"></span><small>Skill ${i+1}</small><b></b></button>`).join('')}
    </div>`;
    document.getElementById('game').appendChild(root);
    stick=document.getElementById('mobileStick'); knob=document.getElementById('mobileKnob');moveZone=document.getElementById('mobileMoveZone');
    bindHold(moveZone,'move'); bindHold(document.getElementById('mobileAttack'),'L'); bindHold(document.getElementById('mobileSkill'),'R');
    for(let i=0;i<4;i++)bindHold(document.getElementById('mobileQuick'+i),'Q'+i);
    for (const button of root.querySelectorAll('[data-action]')) bindTap(button,() => {
      if(button.dataset.action==='party')CoopUI.party();
      else if(button.dataset.action==='phone-menu')MobileWorkspace.open('more');
      else if(button.dataset.action==='pack')MobileWorkspace.open('inv');
      else Game.touchAction(button.dataset.action); sync();
    });
    bindTap(document.getElementById('mobileAssign'),e => {
      e.stopPropagation(); reset(); UI.openSkillPick('R'); sync();
    });
    root.addEventListener('contextmenu',e => e.preventDefault());
    // World taps retain the existing precise interaction/pickup/path behavior.
    // Dragging the world is ignored; the thumbstick owns continuous movement.
    world.addEventListener('pointerdown',e => {
      if (e.pointerType !== 'touch' || !Game.touchReady()) return;
      e.preventDefault(); lastTouch=performance.now();
      if (pointers.size) return;
      Sfx.init(); UI.hideTooltip();
      world.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId,{el:world,kind:'world',x:e.clientX,y:e.clientY,moved:false});
    });
    world.addEventListener('pointermove',e => {
      const p=pointers.get(e.pointerId);
      if (p?.kind === 'world' && Math.hypot(e.clientX-p.x,e.clientY-p.y)>14) p.moved=true;
    });
    for (const event of ['pointerup','pointercancel','lostpointercapture']) world.addEventListener(event,e => {
      const p=pointers.get(e.pointerId); if (p?.kind !== 'world') return;
      pointers.delete(e.pointerId);
      if (world.hasPointerCapture(e.pointerId)) world.releasePointerCapture(e.pointerId);
      if (event === 'pointerup' && !p.moved && !pointers.size) Game.touchTap(e.clientX,e.clientY);
    });
    world.addEventListener('mousedown',e => {
      if (performance.now()-lastTouch < 800) { e.preventDefault(); e.stopImmediatePropagation(); }
    },true);
    document.addEventListener('pointerdown',e => {
      if (e.pointerType === 'touch' && mode !== '0' && !enabled) setEnabled(true);
    },true);
    window.addEventListener('blur',reset);
    window.addEventListener('resize',reset);
    document.addEventListener('visibilitychange',() => { if (document.hidden) reset(); });
    // Panels can open between frames while a pointer is captured.
    const observer=new MutationObserver(sync);
    for (const id of ['panelLeft','panelRight','panelCenter','skillPick','escmenu','title','cinematic']) {
      const el=document.getElementById(id);
      if (el) observer.observe(el,{attributes:true,attributeFilter:['class']});
    }
    const media=window.matchMedia('(any-pointer: coarse)');
    media.addEventListener('change',() => { if (mode === null) setEnabled(media.matches || navigator.maxTouchPoints > 0); });
    setEnabled(mode === '1' || (mode !== '0' && (media.matches || navigator.maxTouchPoints > 0)));
  }
  function sync() {
    if (!root) return;
    const party=root.querySelector('[data-action=party]');party.hidden=!(typeof Coop!=='undefined'&&Coop.active);
    if(!party.hidden){const alert=!!(Coop.paused||Coop.saveError);party.textContent=alert?'Party !':'Party';party.setAttribute('aria-label',alert?'Open party: connection or save needs attention':'Open party');}
    if(typeof MobileWorkspace!=='undefined')MobileWorkspace.sync();
    const p=Game.state?.player, active=enabled && !!p && !p.dead && document.getElementById('title').classList.contains('hidden');
    const wasActive=!root.hidden;
    root.hidden=!active;
    const ready=active && Game.touchReady() && document.getElementById('skillPick').classList.contains('hidden');
    root.classList.toggle('blocked',!ready);
    document.body.classList.toggle('touch-playing',active);
    if (!ready && [...pointers.values()].some(p=>p.kind !== 'tap')) reset();
    // Cancel once when touch controls disappear. Desktop frames must not reset
    // the shared co-op mouse gesture or its local movement prediction.
    if (!active && wasActive) reset();
    if (!active) return;
    for(const gesture of pointers.values())if(gesture.kind[0]==='Q'&&gesture.skill!==p.quickSlots?.[Number(gesture.kind.slice(1))]){reset();break;}
    for (const [id,side] of [['mobileAttack','L'],['mobileSkill','R']]) {
      const el=document.getElementById(id), skill=p['skill'+side], def=skill === 'basic' ? DATA.BASIC_ATTACK : DATA.SKILLS[skill];
      const name=def?.name || 'Unassigned', cd=Math.max(0,(p.skillCd[skill] || 0)-Game.state.time);
      const small=el.querySelector('small'), label=el.querySelector('b'), value=cd ? (cd<10 ? cd.toFixed(1) : Math.ceil(cd)) : '';
      if (small.textContent !== name) { small.textContent=name; el.setAttribute('aria-label',`${side === 'L' ? 'Attack' : 'Skill'}: ${name}`); }
      if (label.textContent !== String(value)) label.textContent=value;
      el.classList.toggle('cooling',cd>0);
      el.classList.toggle('unavailable',!p.canUseSkillWeapon(skill));
    }
    root.querySelector('[data-action="loot"]').setAttribute('aria-pressed',String(Game.options.alwaysLabels));
    if(phone()){
      const alert=typeof Coop!=='undefined'&&Coop.active&&(Coop.paused||Coop.saveError);
      root.querySelector('.phone-menu-badge').hidden=!alert;
      root.querySelector('[data-action="phone-menu"]').setAttribute('aria-label',alert?'Open game menu: party needs attention':'Open game menu');
      for(const [name,value,max] of [['life',p.hp,p.stats.maxHp],['aether',p.mana,p.stats.maxMana]]){
        const bar=root.querySelector('.phone-vital.'+name),text=Math.ceil(value)+' / '+Math.ceil(max);
        if(bar.querySelector('strong').textContent!==text)bar.querySelector('strong').textContent=text;
        bar.style.setProperty('--fill',Math.max(0,Math.min(100,value/max*100))+'%');
      }
      for(let i=0;i<4;i++){
        const el=document.getElementById('mobileQuick'+i),id=p.quickSlots?.[i],def=id==='basic'?DATA.BASIC_ATTACK:DATA.SKILLS[id],sig=(id||'')+'|'+(p.equip.main?.cat||'');
        if(el.dataset.signature!==sig){
          el.dataset.signature=sig;const icon=el.querySelector('.phone-skill-icon');icon.replaceChildren();
          if(def)icon.append(SkillIcons.create(def,44,p.equip.main?.cat));else icon.textContent='+';
          el.setAttribute('aria-label',def?'Cast '+def.name:'Assign skill '+(i+1));el.title=def?.name||'Assign skill '+(i+1);
          el.classList.toggle('empty',!def);
        }
        const cd=Math.max(0,(p.skillCd[id]||0)-Game.state.time),b=el.querySelector('b'),value=cd?(cd<10?cd.toFixed(1):Math.ceil(cd)):'';
        if(b.textContent!==String(value))b.textContent=value;
        const weapon=!!def&&!p.canUseSkillWeapon(id),resource=!!def&&id!=='basic'&&!p.canPay(p.resolveSkill(id),p.effRank(id));
        el.classList.toggle('cooling',cd>0);el.classList.toggle('unavailable',weapon);el.classList.toggle('no-resource',resource);
        el.setAttribute('aria-description',weapon?'Required weapon not equipped':resource?'Not enough resources':cd?'On cooldown':'' );
      }
      const objective=document.querySelector('.opening-objective');
      if(objective&&!objective.dataset.phoneAction){objective.dataset.phoneAction='';objective.setAttribute('role','button');objective.tabIndex=0;objective.setAttribute('aria-label','Open current quest');objective.addEventListener('click',()=>MobileWorkspace.open('quest'));objective.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();MobileWorkspace.open('quest');}});}
    }
  }
  return {init,sync,reset,releasePointers,bindTap,get enabled(){return enabled;}};
})();
