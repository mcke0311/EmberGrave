/* Explicit phone views over production controls; no pagination or DOM flattening. */
'use strict';
const MobileViews=(()=>{
  const memory=new Map();
  const enabled=()=>typeof MobileShell!=='undefined'&&MobileShell.enabled;
  const key=root=>(Game.state?.player?.heroId||Game.state?.player?.name||'')+':'+root.dataset.kind+(root.dataset.kind==='vendor'?':'+(root.dataset.vendorId||''):'');
  const state=root=>{const k=key(root);if(!memory.has(k))memory.set(k,{tab:root.dataset.kind==='skills'?'loadout':'pack',detail:false,scrolls:{}});return memory.get(k);};
  const view=root=>(root.dataset.mobileTab||'main')+':'+(root.dataset.mobileDetail||'false');
  function remember(root){if(enabled()&&root.dataset.mobileMounted===key(root))state(root).scrolls[view(root)]=root.scrollTop;}
  function restoreScroll(root){if(enabled())root.scrollTop=state(root).scrolls[view(root)]||0;}
  function isDetail(root){return enabled()&&state(root).detail;}
  function detail(root){if(!enabled())return;remember(root);state(root).detail=true;root.dataset.mobileDetail='true';root.scrollTop=0;MobileWorkspace.sync();}
  function back(root){if(!isDetail(root))return false;remember(root);state(root).detail=false;root.dataset.mobileDetail='false';restoreScroll(root);root.querySelector('.talent-node[aria-pressed=true],.qrow[aria-pressed=true],.shop-entry.selected')?.focus({preventScroll:true});return true;}
  function choose(root,id){remember(root);state(root).tab=id;state(root).detail=false;mount(root);restoreScroll(root);}
  function button(label,fn){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=fn;return b;}
  function tabs(root,items){const nav=document.createElement('nav');nav.className='phone-subtabs';nav.setAttribute('aria-label',root.dataset.kind==='inv'?'Inventory sections':'Forge sections');
    for(const [id,label] of items){const b=button(label,()=>choose(root,id));b.dataset.mobileTab=id;b.setAttribute('aria-pressed',String(state(root).tab===id));nav.append(b);}root.prepend(nav);}
  function vendorContext(root,npcId,filter,reset=false){
    if(!enabled())return;
    const changed=root.dataset.vendorId!==npcId||root.dataset.mobileTab!==filter;
    root.dataset.vendorId=npcId;
    const s=state(root);if(changed||reset)s.detail=false;
    if(reset)s.scrolls={};
    s.tab=filter;root.dataset.mobileTab=filter;root.dataset.mobileDetail=String(s.detail);
  }
  function mount(root){
    if(!enabled()||root.classList.contains('hidden'))return;
    const s=state(root);root.dataset.mobileMounted=key(root);root.dataset.mobileTab=s.tab;root.dataset.mobileDetail=String(s.detail);
    root.querySelectorAll(':scope > .phone-subtabs,:scope > .phone-loadout,:scope > .phone-belt-page').forEach(n=>n.remove());
    if(root.dataset.kind==='inv'){
      tabs(root,[['pack','Pack'],['equipment','Equipment'],['belt','Belt']]);
      const belt=document.createElement('section');belt.className='phone-belt-page';
      const hint=document.createElement('p');hint.textContent='Your four ready draughts. Move bottles from the pack to restock your belt.';belt.append(hint);
      for(let i=0;i<4;i++){
        const slot=Game.state.player.belt[i],row=document.createElement('div');row.className='phone-belt-card';
        const label=document.createElement('span');label.textContent='Slot '+(i+1)+' · '+(slot?DATA.CONSUMABLES[slot.id].name+' ×'+slot.count:'Empty');row.append(label);
        if(slot){const unbelt=button('Move to pack',()=>{document.querySelectorAll('#beltBar button')[i].dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true}));UI.renderIfOpen('inv');});row.append(unbelt);}belt.append(row);
      }root.append(belt);
      root.querySelectorAll('#equipwrap > .eqslot').forEach(slot=>{
        slot.querySelector('.phone-equip-name')?.remove();const label=document.createElement('span');label.className='phone-equip-name';label.textContent=slot.querySelector('.invitem')?.getAttribute('aria-label')||slot.getAttribute('aria-label')+' · Empty';(slot.querySelector('.invitem')||slot).append(label);
      });
    }
    if(root.dataset.kind==='skills'){
      const treeTabs=root.querySelector('#treeTabs');treeTabs.querySelector('.phone-loadout-tab')?.remove();
      const loadoutTab=button('Loadout',()=>choose(root,'loadout'));loadoutTab.className='phone-loadout-tab';loadoutTab.setAttribute('role','tab');loadoutTab.setAttribute('aria-selected',String(s.tab==='loadout'));treeTabs.prepend(loadoutTab);
      for(const b of treeTabs.querySelectorAll('.treetab')){b.setAttribute('aria-selected',String(s.tab!=='loadout'&&b.classList.contains('on')));if(!b.dataset.phoneBound){b.dataset.phoneBound='';b.addEventListener('click',()=>{s.tab='discipline';s.detail=false;root.dataset.mobileTab='discipline';},true);}}
      const loadout=document.createElement('section');loadout.className='phone-loadout';
      const hint=document.createElement('p');hint.textContent='Tap a slot to assign a learned skill. These four skills cast directly in combat.';loadout.append(hint);
      for(const [slot,label,id] of [['L','Attack',Game.state.player.skillL],...Array.from({length:4},(_,i)=>['Q'+i,'Skill '+(i+1),Game.state.player.quickSlots[i]])]){
        const def=id==='basic'?DATA.BASIC_ATTACK:DATA.SKILLS[id],b=button('',e=>{e.stopPropagation();MobileWorkspace.pickSkill(slot);});b.dataset.loadout=slot;
        if(def)b.append(SkillIcons.create(def,44));const text=document.createElement('span');text.textContent=label+' · '+(def?.name||'Assign skill');b.append(text);loadout.append(b);
      }root.append(loadout);
    }
    if(root.dataset.kind==='forge'){
      if(!['recipes','materials'].includes(s.tab)){s.tab='recipes';root.dataset.mobileTab=s.tab;}
      tabs(root,[['recipes','Recipes'],['materials','Materials']]);
    }
    if(root.dataset.kind==='char')for(const row of root.querySelectorAll('.character-stat'))if(!row.dataset.phoneHelp){row.dataset.phoneHelp='';row.addEventListener('click',e=>{if(!e.target.closest('button'))MobileShell.showHelp(row.dataset.help,row.dataset.label);});}
    restoreScroll(root);MobileWorkspace.sync();
  }
  function release(root){remember(root);delete root.dataset.mobileMounted;}
  window.addEventListener('phoneviewportchange',()=>{
    for(const root of document.querySelectorAll('#panelWorkspace > .panel:not(.hidden)')){if(enabled()){remember(root);mount(root);}}
  });
  return {mount,vendorContext,release,remember,restoreScroll,detail,back,isDetail,enabled};
})();
