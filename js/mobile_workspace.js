/* One visible mobile panel; related services keep their state behind tabs. */
const MobileWorkspace=(()=>{
  let host,header,tabs,title,active=null,blocked=false,returnFocus=null;
  const labels={inv:'Equipment & pack',char:'Character',skills:'Talents',quest:'Quests',vendor:'Trade',storage:'Strongbox',forge:'Forge Altar',shrine:'Travel',dialog:'Conversation'};
  function init(){
    host=document.getElementById('panelWorkspace');
    header=document.createElement('header');header.id='workspaceHeader';
    title=document.createElement('h2');title.id='workspaceTitle';
    const close=document.createElement('button');close.type='button';close.textContent='Close';close.setAttribute('aria-label','Close menu');
    close.onclick=()=>{UI.closeAll();sync();returnFocus?.focus({preventScroll:true});};
    tabs=document.createElement('nav');tabs.id='workspaceTabs';tabs.setAttribute('aria-label','Related panels');
    header.append(title,close,tabs);host.prepend(header);
    const observer=new MutationObserver(sync);
    for(const id of ['panelLeft','panelRight','panelCenter','skillPick','escmenu','title','cinematic','deathScreen'])observer.observe(document.getElementById(id),{attributes:true,attributeFilter:['class','open']});
    observer.observe(document.body,{childList:true});
    window.addEventListener('resize',sync);
    window.addEventListener('phoneviewportchange',sync);sync();
  }
  function select(side){active=side;UI.hideTooltip();sync();}
  function sync(){
    if(!host)return;
    const touch=typeof MobileControls!=='undefined'&&MobileControls.enabled;
    const panels=['left','right','center'].map(side=>({side,el:document.getElementById('panel'+side[0].toUpperCase()+side.slice(1))})).filter(p=>!p.el.classList.contains('hidden'));
    if(!panels.some(p=>p.side===active))active=panels.find(p=>p.side!=='right')?.side||panels[0]?.side||null;
    for(const p of panels){p.el.classList.toggle('workspace-inactive',touch&&p.side!==active);p.el.inert=touch&&p.side!==active;}
    header.hidden=!touch||!panels.length;
    if(touch&&panels.length){
      const current=panels.find(p=>p.side===active);title.textContent=labels[current.el.dataset.kind]||current.el.querySelector('.ptitle')?.textContent||'Menu';
      const key=panels.map(p=>p.side+':'+p.el.dataset.kind).join('|');
      if(tabs.dataset.key!==key){tabs.dataset.key=key;tabs.replaceChildren();for(const p of panels){const b=document.createElement('button');b.type='button';b.dataset.side=p.side;b.textContent=p.side==='right'?'Pack':labels[p.el.dataset.kind]||'Details';b.onclick=()=>select(p.side);tabs.append(b);}}
      tabs.hidden=panels.length<2;for(const b of tabs.children)b.setAttribute('aria-pressed',String(b.dataset.side===active));
    }
    const extra=!!document.querySelector('dialog[open],#skillPick:not(.hidden),#escmenu:not(.hidden),#cinematic:not(.hidden)');
    const next=touch&&(panels.length>0||extra);
    const before=document.body.classList.contains('mobile-menu-open');
    if(before!==!!next)document.body.classList.toggle('mobile-menu-open',!!next);
    if(next&&!blocked){returnFocus=document.activeElement;Game.cancelMenuInput();}
    blocked=!!next;
    const critical=!!document.querySelector('#deathScreen[open],#cinematic:not(.hidden)');
    document.body.classList.toggle('critical-overlay',critical);
    host.inert=critical||!document.getElementById('title').classList.contains('hidden')||!!document.querySelector('#escmenu:not(.hidden),#skillPick:not(.hidden),.coop-dialog[open]');
  }
  return {init,sync,select};
})();
