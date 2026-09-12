/* Phone viewport and browser presentation. No game or save state is owned here. */
'use strict';
const MobileShell = (() => {
  let enabled=false, blocked=false, width=innerWidth, height=innerHeight, top=0, left=0;
  let gate, help, installEvent=null, queued=0, editing=null, restoreInert=new Map();
  const standalone=()=>matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches || navigator.standalone===true;
  const button=(label,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=fn;return b;};
  function portrait(){
    // A keyboard changes the visual viewport, but is not a device rotation.
    if(screen.orientation?.type)return screen.orientation.type.startsWith('portrait');
    if(typeof window.orientation==='number')return Math.abs(window.orientation)!==90;
    return screen.width<screen.height;
  }
  function cancel(){if(typeof Game!=='undefined')Game.cancelMenuInput();}
  function refresh(){
    queued=0;
    const forced=new URLSearchParams(location.search).get('touch');
    const touch=forced==='1'||(forced!=='0'&&(navigator.maxTouchPoints>0||matchMedia('(any-pointer: coarse)').matches));
    enabled=touch&&(forced==='1'||Math.min(screen.width,screen.height)<=600);
    document.body.classList.toggle('phone-layout',enabled);
    const v=window.visualViewport;
    width=Math.round(v?.width||innerWidth);height=Math.round(v?.height||innerHeight);top=v?.offsetTop||0;left=v?.offsetLeft||0;
    const style=document.documentElement.style;
    for(const [key,value] of Object.entries({'visible-width':width,'visible-height':height,'visible-top':top,'visible-left':left}))style.setProperty('--'+key,value+'px');
    const next=enabled&&portrait();
    if(next!==blocked){
      blocked=next;cancel();
      if(blocked){
        for(const el of document.body.children)if(el!==gate&&el!==help&&!['SCRIPT','LINK'].includes(el.tagName)){restoreInert.set(el,el.inert);el.inert=true;}
        if(!gate.open)gate.showModal();
      }else{
        if(gate.open)gate.close();
        for(const [el,value] of restoreInert)if(el.isConnected)el.inert=value;
        restoreInert.clear();
      }
    }
    gate.querySelector('p').textContent=typeof Coop!=='undefined'&&Coop.active?'Rotate your phone to landscape. Your party is still live.':'Rotate your phone to landscape to continue.';
    document.body.classList.toggle('phone-portrait',blocked);
    const keyboard=enabled&&!!editing&&height<innerHeight*.78;
    document.body.classList.toggle('phone-keyboard',keyboard);
    editing?.classList.toggle('phone-keyboard-active',keyboard);
    if(!keyboard)document.getElementById('phoneKeyboardDone')?.remove();
    else if(!document.getElementById('phoneKeyboardDone')){
      const done=button('Done',()=>{editing?.blur();editing=null;schedule();});done.id='phoneKeyboardDone';done.classList.add('phone-ui');
      (editing.closest('dialog[open]')||document.body).append(done);
    }
    document.querySelectorAll('[data-phone-fullscreen]').forEach(b=>{if(!document.fullscreenEnabled)b.hidden=true;b.textContent=document.fullscreenElement?'Exit full screen':'Full screen';});
    document.querySelectorAll('[data-phone-install]').forEach(b=>{if(standalone())b.hidden=true;});
    window.dispatchEvent(new CustomEvent('phoneviewportchange',{detail:{width,height,top,left,enabled,blocked}}));
  }
  function schedule(){if(!queued)queued=requestAnimationFrame(refresh);}
  async function fullscreen(){
    try{
      if(document.fullscreenElement)await document.exitFullscreen();
      else{
        await document.documentElement.requestFullscreen();
        try{await screen.orientation?.lock('landscape');}catch{/* Rotation gate works without orientation lock. */}
      }
    }catch{showHelp('Full screen is unavailable here. You can keep playing in landscape or add Embergrave to your Home Screen.');}
    schedule();
  }
  function showHelp(message,title='Play from your Home Screen'){
    if(!help){help=document.createElement('dialog');help.id='phoneInstallHelp';document.body.append(help);}
    help.replaceChildren();
    const h=document.createElement('h2');h.textContent=title;help.append(h);
    const p=document.createElement('p');p.textContent=message||(/iPhone|iPad|iPod/.test(navigator.userAgent)?'In Safari, open Share, choose Add to Home Screen, turn on Open as Web App, then tap Add. Launch Embergrave from the new icon.':'Open your browser menu and choose Install app or Add to Home Screen. Launch Embergrave from the new icon.');help.append(p);
    if(installEvent&&title==='Play from your Home Screen')help.append(button('Install app',async()=>{const prompt=installEvent;installEvent=null;try{await prompt.prompt();await prompt.userChoice;}catch{}if(help.open)help.close();schedule();}));
    help.append(button('Back',()=>help.close()));
    if(!help.open)help.showModal();
  }
  function controls(host){
    if(!enabled)return;
    const full=button('Full screen',fullscreen);full.dataset.phoneFullscreen='';full.hidden=!document.fullscreenEnabled;
    const install=button('Add to Home Screen',()=>showHelp());install.dataset.phoneInstall='';install.hidden=standalone();
    host.append(full,install);
  }
  function init(){
    gate=document.createElement('dialog');gate.id='phoneRotate';
    gate.innerHTML='<span aria-hidden="true" class="phone-rotate-symbol">↻</span><h2>Turn to landscape</h2><p>Rotate your phone to landscape to continue.</p>';
    gate.append(button('Full screen',fullscreen));gate.lastChild.dataset.phoneFullscreen='';
    gate.addEventListener('cancel',e=>e.preventDefault());document.body.append(gate);
    window.addEventListener('resize',schedule);screen.orientation?.addEventListener('change',schedule);window.addEventListener('orientationchange',schedule);
    window.visualViewport?.addEventListener('resize',schedule);window.visualViewport?.addEventListener('scroll',schedule);
    document.addEventListener('fullscreenchange',()=>{cancel();schedule();});
    window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installEvent=e;schedule();});
    window.addEventListener('appinstalled',()=>{installEvent=null;if(help?.open)help.close();schedule();});
    document.addEventListener('focusin',e=>{if(e.target.matches('input:not([type=checkbox]):not([type=range]),textarea')){editing=e.target;schedule();}});
    document.addEventListener('focusout',e=>{if(e.target!==editing)return;editing.classList.remove('phone-keyboard-active');editing=null;schedule();});
    refresh();
  }
  init();
  return {refresh,schedule,controls,fullscreen,showHelp,standalone,get enabled(){return enabled;},get blocked(){return blocked;},get viewport(){return {width,height,top,left};}};
})();
