/* Phone navigation owns presentation state only. Renderers and commands own data. */
'use strict';
const MobileWorkspace=(()=>{
  let host,header,tabs,title,backButton,closeButton,live,related,active=null,blocked=false,returnFocus=null,pickerFocus=null;
  let section='inv',closing=false;
  const labels={inv:'Pack',char:'Character',skills:'Talents',quest:'Quests',more:'More',vendor:'Trade',storage:'Strongbox',forge:'Forge Altar',shrine:'Travel',dialog:'Conversation'};
  const phone=()=>typeof MobileShell!=='undefined'&&MobileShell.enabled;
  const button=(label,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=fn;return b;};
  const panels=()=>['left','right','center'].map(side=>({side,el:document.getElementById('panel'+side[0].toUpperCase()+side.slice(1))})).filter(p=>!p.el.classList.contains('hidden'));
  const current=()=>panels().find(p=>p.side===active)?.el;
  function init(){
    host=document.getElementById('panelWorkspace');
    header=document.createElement('header');header.id='workspaceHeader';header.hidden=true;
    const row=document.createElement('div');row.className='workspace-heading';
    backButton=button('Back',back);backButton.id='workspaceBack';
    title=document.createElement('h2');title.id='workspaceTitle';title.tabIndex=-1;
    live=document.createElement('span');live.id='workspaceLive';live.textContent='Party is live';
    closeButton=button('Close',close);closeButton.id='workspaceClose';closeButton.setAttribute('aria-label','Close menu');
    row.append(backButton,title,live,closeButton);
    tabs=document.createElement('nav');tabs.id='workspacePrimaryTabs';tabs.setAttribute('aria-label','Game menu');tabs.setAttribute('role','tablist');
    for(const id of ['inv','char','skills','quest','more']){const b=button(labels[id],()=>open(id));b.dataset.section=id;b.setAttribute('role','tab');tabs.append(b);}
    tabs.addEventListener('keydown',e=>{
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
      e.preventDefault();const buttons=[...tabs.children],i=buttons.indexOf(e.target),next=e.key==='Home'?0:e.key==='End'?buttons.length-1:(i+(e.key==='ArrowRight'?1:buttons.length-1))%buttons.length;
      buttons[next].click();buttons[next].focus();
    });
    related=document.createElement('nav');related.id='workspaceTabs';related.setAttribute('aria-label','Related panels');related.hidden=true;
    header.append(row,tabs,related);(phone()?document.getElementById('game'):host).prepend(header);
    const observer=new MutationObserver(sync);
    for(const id of ['panelLeft','panelRight','panelCenter','skillPick','escmenu','title','cinematic','deathScreen'])observer.observe(document.getElementById(id),{attributes:true,attributeFilter:['class','open','data-kind'],childList:true});
    observer.observe(document.body,{childList:true});
    window.addEventListener('resize',sync);window.addEventListener('phoneviewportchange',sync);
    document.addEventListener('keydown',e=>{
      if(!phone()||header.hidden||document.querySelector('dialog[open]'))return;
      if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)back();return;}
      if(e.key==='Tab'){
        const roots=[header,document.getElementById('skillPick').classList.contains('hidden')?null:document.getElementById('skillPick'),UI.escOpen()?document.getElementById('escmenu'):document.getElementById('touchItemMenu')||current()].filter(Boolean);
        const nodes=roots.flatMap(r=>[...r.querySelectorAll('button:not(:disabled),input,select,textarea,[tabindex="0"]')]).filter(n=>n.getClientRects().length&&!n.closest('[inert]')&&n.tabIndex>=0);
        const first=nodes[0],last=nodes.at(-1);
        if(!nodes.includes(document.activeElement)||(e.shiftKey&&document.activeElement===first)||(!e.shiftKey&&document.activeElement===last)){e.preventDefault();(e.shiftKey?last:first)?.focus();}
        e.stopImmediatePropagation();return;
      }
      if(!e.target.closest('input,select,textarea')&&['F1','F2','F3','F4','Alt'].includes(e.key)){e.preventDefault();e.stopImmediatePropagation();}
    },true);
    sync();
  }
  function open(id){
    if(!Game.state?.player)return;
    const existing=current();
    if(phone()&&!header.hidden&&id===section&&!document.getElementById('touchItemMenu')&&document.getElementById('skillPick').classList.contains('hidden')&&(!UI.escOpen()||document.querySelector('#escmenu .pause-menu')))return;
    if(header.hidden)returnFocus=document.activeElement;
    if(existing)MobileViews.remember(existing);
    Game.cancelMenuInput();UI.closeEsc();UI.closeAll();section=id;active=null;
    if(id==='more')UI.openEsc();else UI.togglePanel(id);
    sync();title.focus({preventScroll:true});
  }
  function select(side){
    const old=current();if(phone()&&old)MobileViews.remember(old);
    active=side;UI.hideTooltip();sync();
    if(phone()){const panel=current();if(panel)MobileViews.restoreScroll(panel);}
  }
  function pickSkill(which){
    if(header.hidden)returnFocus=document.activeElement;
    pickerFocus=document.activeElement;
    Game.cancelMenuInput();UI.openSkillPick(which);sync();
  }
  function pickerClosed(){
    sync();const opener=pickerFocus,slot=document.getElementById('skillPick').dataset.which;pickerFocus=null;
    queueMicrotask(()=>{const next=opener?.isConnected&&opener.getClientRects().length?opener:document.querySelector('[data-loadout="'+slot+'"]')||document.getElementById('mobileQuick'+slot?.slice(1));next?.focus({preventScroll:true});});
  }
  function close(){
    if(closing)return;closing=true;
    const panel=current();if(phone()&&panel)MobileViews.remember(panel);
    UI.closeEsc();UI.closeAll();Game.cancelMenuInput();closing=false;sync();
    const focus=returnFocus?.isConnected&&returnFocus.getClientRects().length?returnFocus:document.getElementById('view');focus?.focus({preventScroll:true});returnFocus=null;
  }
  function back(){
    const picker=document.getElementById('skillPick');
    if(!picker.classList.contains('hidden')){picker.classList.add('hidden');UI.hideTooltip();pickerClosed();return;}
    const detail=document.getElementById('touchItemMenu');
    if(detail){detail.querySelector('[data-item-back]')?.click();sync();return;}
    if(UI.escOpen()){UI.menuBack();sync();return;}
    const panel=current();if(panel&&MobileViews.back(panel)){sync();return;}
    close();
  }
  function sync(){
    if(!host)return;
    const touch=typeof MobileControls!=='undefined'&&MobileControls.enabled,ps=panels(),isPhone=phone();
    const headerHost=isPhone?document.getElementById('game'):host;
    if(header.parentElement!==headerHost)headerHost.prepend(header);
    if(!ps.some(p=>p.side===active))active=ps.find(p=>p.side!=='right')?.side||ps[0]?.side||null;
    const panel=ps.find(p=>p.side===active)?.el;
    for(const p of ps){p.el.classList.toggle('workspace-inactive',touch&&p.side!==active);p.el.inert=touch&&p.side!==active;}
    const esc=!!document.querySelector('#escmenu:not(.hidden)'),picker=!!document.querySelector('#skillPick:not(.hidden)'),detail=!!document.getElementById('touchItemMenu');
    const critical=!!document.querySelector('#deathScreen[open],#cinematic:not(.hidden)'),dialog=!!document.querySelector('dialog[open]');
    const playing=document.getElementById('title').classList.contains('hidden');
    const next=touch&&(ps.length>0||esc||picker||dialog||critical);
    document.body.classList.toggle('mobile-menu-open',next);document.body.classList.toggle('critical-overlay',critical);
    document.body.classList.toggle('phone-game-menu',isPhone&&playing&&(ps.length>0||esc||picker)&&!critical&&!dialog);
    if(next&&!blocked){if(!returnFocus)returnFocus=document.activeElement;Game.cancelMenuInput();}
    blocked=next;
    header.hidden=!touch||(!isPhone?!ps.length:!playing||critical||dialog||!(ps.length||esc||picker));
    header.inert=header.hidden;tabs.hidden=!isPhone;live.hidden=!isPhone||!(typeof Coop!=='undefined'&&Coop.active);
    host.inert=critical||!playing||esc||picker||dialog;
    if(header.hidden)return;
    const service=ps.find(p=>['vendor','storage','forge'].includes(p.el.dataset.kind));
    if(isPhone){
      if(esc)section='more';else if(panel&&!service)section=panel.dataset.kind;else if(service)section='inv';
      let heading=esc?(document.getElementById('menuHeading')?.textContent||'Loot Filter'):service?labels[service.el.dataset.kind]:labels[panel?.dataset.kind]||'Loadout';
      if(document.querySelector('#escmenu:not(.hidden) .pause-menu'))heading='More';
      if(picker)heading='Assign '+(document.getElementById('skillPick').dataset.which==='L'?'Attack':'skill '+(Number(document.getElementById('skillPick').dataset.which?.slice(1))+1));
      if(detail)heading='Item details';
      if(panel&&MobileViews.isDetail(panel)&&!esc&&!picker&&!detail)heading=panel.dataset.kind==='skills'?'Skill details':panel.dataset.kind==='quest'?'Quest details':'Item details';
      if(title.textContent!==heading)title.textContent=heading;
      backButton.hidden=!(picker||detail||(esc&&!document.querySelector('#escmenu .pause-menu'))||(!esc&&panel&&MobileViews.isDetail(panel)));
      for(const b of tabs.children){b.setAttribute('aria-selected',String(b.dataset.section===section));b.tabIndex=b.dataset.section===section?0:-1;}
    }else {title.textContent=panel?.dataset.kind==='inv'?'Equipment & pack':labels[panel?.dataset.kind]||'Menu';backButton.hidden=true;}
    const k=ps.map(p=>p.side+':'+p.el.dataset.kind).join('|');
    if(related.dataset.key!==k){related.dataset.key=k;related.replaceChildren();for(const p of ps){
      const name=p.side==='right'?(isPhone&&service?.el.dataset.kind==='vendor'?'Sell':'Pack'):isPhone&&p.el.dataset.kind==='vendor'?'Buy':labels[p.el.dataset.kind]||'Details';
      const b=button(name,()=>select(p.side));b.dataset.side=p.side;related.append(b);
    }}
    related.hidden=ps.length<2||esc||picker||detail;
    for(const b of related.children)b.setAttribute('aria-pressed',String(b.dataset.side===active));
    const height=isPhone?Math.ceil(header.getBoundingClientRect().height)-parseFloat(getComputedStyle(header).paddingTop||0):56+(related.hidden?0:48);
    document.documentElement.style.setProperty('--phone-menu-head',height+'px');
  }
  return {init,sync,select,open,back,close,pickSkill,pickerClosed,get paused(){return phone()&&blocked;}};
})();
