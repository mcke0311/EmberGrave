/* Explicit phone views over production controls; no pagination or DOM flattening. */
'use strict';
const MobileViews=(()=>{
  const memory=new Map();
  const enabled=()=>typeof MobileShell!=='undefined'&&MobileShell.enabled;
  const key=root=>(Game.state?.player?.heroId||Game.state?.player?.name||'')+':'+root.dataset.kind+(root.dataset.kind==='vendor'?':'+(root.dataset.vendorId||''):'');
  const state=root=>{const k=key(root);if(!memory.has(k))memory.set(k,{tab:root.dataset.kind==='skills'?'loadout':'pack',detail:false,scrolls:{}});return memory.get(k);};
  const view=root=>(root.dataset.mobileTab||'main')+':'+(root.dataset.mobileDetail||'false');
  const scrollKey=(root,pane)=>pane.dataset.phoneScroll==='bag'?(root.dataset.mobileTab||'pack')+':bag':pane.dataset.phoneScroll;
  function remember(root){if(enabled()&&root.dataset.mobileMounted===key(root)){
    const s=state(root);s.scrolls[view(root)]=root.scrollTop;s.panes ||= {};
    for(const pane of root.querySelectorAll('[data-phone-scroll]'))s.panes[scrollKey(root,pane)]=pane.scrollTop;
  }}
  function restoreScroll(root){if(enabled()){
    const s=state(root);root.scrollTop=s.scrolls[view(root)]||0;
    for(const pane of root.querySelectorAll('[data-phone-scroll]'))pane.scrollTop=s.panes?.[scrollKey(root,pane)]||0;
  }}
  function highlightEquipment(slot){
    const root=document.getElementById('panelRight');if(!enabled()||root.dataset.kind!=='inv'||!slot)return;
    state(root).selectedSlot=slot;
    for(const node of root.querySelectorAll('[data-slot]'))node.classList.toggle('equipment-target',node.dataset.slot===slot);
    const target=root.querySelector('[data-slot="'+slot+'"]'),pane=root.querySelector('[data-phone-scroll=gear]');
    if(target&&pane&&target.getClientRects().length){const y=target.getBoundingClientRect().top-pane.getBoundingClientRect().top+pane.scrollTop;if(y<pane.scrollTop||y+target.offsetHeight>pane.scrollTop+pane.clientHeight)pane.scrollTop=Math.max(0,y-(pane.clientHeight-target.offsetHeight)/2);}
  }
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
      if(s.tab==='equipment')s.tab='pack';root.dataset.mobileTab=s.tab;
      root.querySelector('.phone-subtabs')?.remove();root.querySelector('.phone-belt-page')?.remove();
      let layout=root.querySelector('.phone-inventory');
      if(!layout){
        layout=document.createElement('div');layout.className='phone-inventory';
        const gear=document.createElement('section');gear.className='phone-gear-pane';gear.setAttribute('aria-label','Currently equipped');
        const heading=document.createElement('h3');heading.textContent='Equipped';gear.append(heading);
        const scroll=document.createElement('div');scroll.className='phone-gear-scroll';scroll.dataset.phoneScroll='gear';scroll.append(root.querySelector('#equipwrap'));gear.append(scroll);
        const bag=document.createElement('section');bag.className='phone-bag-pane';bag.setAttribute('aria-label','Bag and belt');
        const body=document.createElement('div');body.className='phone-bag-scroll';body.dataset.phoneScroll='bag';body.append(root.querySelector('.item-grid-scroll'));
        for(const node of root.querySelectorAll(':scope > .pack-help,:scope > .phone-place-carried'))body.append(node);
        bag.append(root.querySelector('#goldrow'),root.querySelector('.pack-toolbar'),body);layout.append(gear,bag);root.append(layout);
      }
      tabs(root,[['pack','Bag'],['belt','Belt']]);
      layout.querySelector('.phone-bag-pane').prepend(root.querySelector('.phone-subtabs'));
      const belt=document.createElement('section');belt.className='phone-belt-page';
      const hint=document.createElement('p');hint.textContent='Your four ready draughts. Move bottles from the pack to restock your belt.';belt.append(hint);
      for(let i=0;i<4;i++){
        const slot=Game.state.player.belt[i],row=document.createElement('div');row.className='phone-belt-card';
        const label=document.createElement('span');label.textContent='Slot '+(i+1)+' · '+(slot?DATA.CONSUMABLES[slot.id].name+' ×'+slot.count:'Empty');row.append(label);
        if(slot){const unbelt=button('Move to pack',()=>{document.querySelectorAll('#beltBar button')[i].dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true}));UI.renderIfOpen('inv');});row.append(unbelt);}belt.append(row);
      }layout.querySelector('.phone-bag-scroll').append(belt);
      const equipped=layout.querySelector('#equipwrap');
      for(const slot of ['main','off','head','chest','gloves','belt','boots','ring1','ring2','amulet'])equipped.append(equipped.querySelector('[data-slot="'+slot+'"]'));
      root.querySelectorAll('#equipwrap > .eqslot').forEach(slot=>{
        slot.querySelector('.phone-equip-name')?.remove();
        const item=Game.state.player.equip[slot.dataset.slot],label=document.createElement('span');label.className='phone-equip-name';
        const name=document.createElement('strong');name.textContent=slot.dataset.label;
        const worn=document.createElement('span');worn.textContent=item?(item.identified?item.name:item.baseName)||item.name:'Empty';label.append(name,worn);(slot.querySelector('.invitem')||slot).append(label);
      });
      if(s.selectedSlot)highlightEquipment(s.selectedSlot);
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
  function release(root,closing=false){remember(root);if(enabled()&&closing)state(root).detail=false;delete root.dataset.mobileMounted;}
  window.addEventListener('phoneviewportchange',()=>{
    for(const root of document.querySelectorAll('#panelWorkspace > .panel:not(.hidden)')){if(enabled()){remember(root);mount(root);}}
  });
  return {mount,vendorContext,release,remember,restoreScroll,detail,back,isDetail,enabled,highlightEquipment};
})();
