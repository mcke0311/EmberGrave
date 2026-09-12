/* Bounded pages over connected production controls. Paging never clones an
   interactive element, rewrites inventory data, or introduces game commands. */
'use strict';
const MobilePages = (() => {
  const states=new Map(),memory=new Map();
  let queued=0;
  const ui='.phone-ui,.phone-text-piece';
  const skip='script,style,svg,.sr-only,.stat-help,.ptitle,.pclose,.invcell,.menu-header,.coop-header,.talent-wires,.talent-tier,.talent-legend,.talent-footer,.hero-viewport,.saved-heading,.title-kicker,.management-status:empty,.ph,.pack-help';
  const atomic='button,a,input,select,textarea,label,summary,.invitem,.eqslot,.statrow,.character-stat,.setting-row,.control-row,.saved-row,.forge-slot,.skill-detail-heading';
  function button(label,fn){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=fn;return b;}
  function own(root,selector){return [...root.querySelectorAll(selector)].filter(n=>!n.closest(ui));}
  function key(root){return root.id+':'+(root.dataset.kind||root.className.replace(/phone-\S+/g,'').trim());}
  function visible(root){return root.isConnected&&!root.closest('.hidden,.workspace-inactive')&&(!root.matches('dialog')||root.open);}
  function observe(s){s.observer.observe(s.root,{subtree:true,childList:true,characterData:true,attributes:true,attributeOldValue:true,attributeFilter:['class','hidden','open','disabled','aria-selected','aria-pressed']});}
  function schedule(){if(!queued)queued=requestAnimationFrame(sync);}
  function release(root){
    const s=states.get(root);if(!s)return;
    s.observer.disconnect();root.removeEventListener('click',s.onClick,true);root.removeEventListener('toggle',s.onToggle,true);root.removeEventListener('input',s.onInput);
    restore(s);root.classList.remove('phone-paged');states.delete(root);
  }
  function restore(s){
    for(const {node,marker} of s.moved||[])if(marker.isConnected){marker.replaceWith(node);}
    s.moved=[];
    s.root.querySelectorAll('.phone-ui,.phone-text-piece,.phone-card-name,.phone-disclosure-body').forEach(n=>n.remove());
    s.root.querySelectorAll('.phone-unit,.phone-flow,.phone-off,.phone-skip,.phone-text-source').forEach(n=>n.classList.remove('phone-unit','phone-flow','phone-off','phone-skip','phone-text-source'));
  }
  function move(s,node,host){if(!node)return;const marker=document.createComment('phone action');node.before(marker);s.moved.push({node,marker});host.append(node);}
  function groupFor(s,node){
    const kind=s.root.dataset.kind;
    if(kind==='inv')return node.closest('#equipwrap')?'Equipment':node.closest('.invgrid')?'Pack':'Pack tools';
    if(kind==='storage')return 'Strongbox';
    if(kind==='skills'){
      if(node.closest('#skillDetail'))return 'Skill details';
      if(node.closest('#treeTabs'))return 'Disciplines';
      if(node.matches('.talent-node'))return 'Tier '+(Number(node.style.gridRow||1));
      return 'Talents';
    }
    if(kind==='quest')return node.closest('.qdetail,.quest-detail,#questDetail')?'Quest details':'Quests';
    if(kind==='vendor')return node.closest('.shop-detail')?'Item details':'Trade';
    if(kind==='forge')return node.closest('.recipe-list')?'Recipes':node.closest('#forgeRow,.forge-slots')?'Materials':'Craft';
    if(kind==='char'){
      const rows=own(s.root,'[data-row-key]');let section='Overview';
      for(const row of rows){if(row.dataset.rowKey.startsWith('section-'))section=(row.firstElementChild?.textContent||row.textContent).trim();if(row===node||row.contains(node))return section;}
    }
    if(node.closest('.settings-tabs'))return 'Categories';
    if(node.closest('.controls-group'))return node.closest('.controls-group').querySelector('h3')?.textContent||'Controls';
    if(node.closest('.lf-rule'))return 'Rules';
    return s.root.dataset.phoneSection||'Overview';
  }
  function collect(s){
    const units=[];
    function walk(node){
      if(node.nodeType===3){
        if(node.textContent.trim()){
          const span=document.createElement('span');node.replaceWith(span);span.append(node);span.dataset.phoneTextWrap='';walk(span);
        }return;
      }
      if(node.nodeType!==1||node.matches(ui))return;
      if(node.matches(skip)||node.hidden||node.classList.contains('hidden')||node.getAttribute('aria-hidden')==='true'){node.classList.add('phone-skip');return;}
      // Details retain their actual disclosure interaction; closed bodies stay closed.
      if(node.matches('details')){
        node.classList.add('phone-skip');
        // Native details creates anonymous boxes. Keep its state, and temporarily
        // present the same summary and controls alongside it, restoring on exit.
        const summary=node.querySelector('summary'),body=document.createElement('div');body.className='phone-disclosure-body phone-flow';node.after(body);
        const children=[...node.children].filter(n=>n.tagName!=='SUMMARY');
        if(!summary.dataset.phoneDisclosure){summary.dataset.phoneDisclosure='';summary.tabIndex=0;summary.setAttribute('role','button');summary.addEventListener('click',()=>{if(summary.parentElement!==node)node.open=!node.open;});summary.addEventListener('keydown',e=>{if(summary.parentElement!==node&&['Enter',' '].includes(e.key)){e.preventDefault();summary.click();}});}
        move(s,summary,body);summary.setAttribute('aria-expanded',String(node.open));walk(summary);
        if(node.open){for(const child of children){move(s,child,body);walk(child);}}
        else for(const child of children)child.classList.add('phone-skip');return;
      }
      const children=[...node.children];
      const simple=!children.some(n=>n.matches('div,section,article,nav,form,fieldset,ul,ol,li,dl,dt,dd,p,h1,h2,h3,h4,button,input,select,textarea,label,details'));
      if(node.matches(atomic)||simple){
        if(!node.textContent.trim()&&!node.matches('input,select,textarea,.eqslot,.invitem')&&!node.querySelector('img,canvas')){node.classList.add('phone-skip');return;}
        node.classList.add('phone-unit');
        if(node.matches('.invitem,.eqslot')){
          const name=document.createElement('span');name.className='phone-card-name';name.textContent=node.getAttribute('aria-label')||node.dataset.label||'Item';node.append(name);
          if(node.matches('.eqslot')&&!node.querySelector('.invitem'))node.setAttribute('role','button');
        }
        if(node.matches('.character-stat')&&!node.dataset.phoneHelp){
          node.dataset.phoneHelp='';
          node.addEventListener('click',e=>{if(!e.target.closest('button'))MobileShell.showHelp(node.dataset.help,node.dataset.label);});
          node.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target===node){e.preventDefault();MobileShell.showHelp(node.dataset.help,node.dataset.label);}});
        }
        units.push({node,group:groupFor(s,node)});
      }else{node.classList.add('phone-flow');for(const child of [...node.childNodes])walk(child);}
    }
    for(const child of [...s.root.childNodes])walk(child);
    return units;
  }
  function titleFor(root){return root.querySelector('.ptitle,h2,.lf-title')?.textContent.trim()||root.getAttribute('aria-label')||root.dataset.kind||'Menu';}
  function prepare(root){
    const s={root,moved:[],dirty:true,pages:[],section:null,page:0,contents:false};
    s.observer=new MutationObserver(records=>{
      if(records.some(r=>!(r.type==='attributes'&&r.oldValue===r.target.getAttribute(r.attributeName))&&!r.target.closest?.('.phone-ui')&&!(r.type==='childList'&&[...r.addedNodes,...r.removedNodes].every(n=>n.nodeType===1&&n.matches(ui))))) {s.dirty=true;schedule();}
    });
    s.onClick=e=>{
      if(e.target.closest('.phone-ui'))return;
      const target=e.target.closest('.talent-node,.shop-entry,.qrow');
      if(target){s.section=target.matches('.talent-node')?'Skill details':target.matches('.shop-entry')?'Item details':'Quest details';s.page=0;s.contents=false;}
      if(e.target.closest('.treetab,.settings-tab')){s.section=null;s.page=0;s.contents=false;}
      memory.set(s.key,{section:s.section,page:s.page});
      s.dirty=true;schedule();
    };
    s.onToggle=()=>{s.dirty=true;schedule();};s.onInput=()=>{s.dirty=true;schedule();};
    root.addEventListener('click',s.onClick,true);root.addEventListener('toggle',s.onToggle,true);root.addEventListener('input',s.onInput);
    states.set(root,s);return s;
  }
  function layout(s){
    if(s.root.contains(document.activeElement)&&document.activeElement.matches('input,textarea')&&s.root.querySelector('.phone-pager-foot'))return;
    s.observer.disconnect();
    try{
      restore(s);
      const oldKey=s.key;s.key=key(s.root);
      if(oldKey!==s.key){const saved=memory.get(s.key);s.section=saved?.section||null;s.page=saved?.page||0;s.contents=false;}
      const title=titleFor(s.root);s.title=title;
      s.root.classList.add('phone-paged');
      const head=document.createElement('header');head.className='phone-ui phone-pager-head';
      const name=document.createElement('strong');name.textContent=title;head.append(name);
      const close=own(s.root,'.menu-close,.pclose,.lf-close,.coop-header button,.selection-top .title-back,.touch-item-actions button,#phoneInstallHelp > button').find(n=>n.matches('.menu-close,.pclose,.lf-close,.coop-header button,.selection-top .title-back')||n.textContent==='Back');
      if(close){move(s,close,head);if(close.textContent==='×')close.textContent='Close';}
      else if(s.root.id==='skillPick')head.append(button('Back',()=>{s.root.classList.add('hidden');MobileControls.sync();}));
      s.root.append(head);
      const back=own(s.root,'.menu-back').find(n=>n!==close);if(back)move(s,back,head);
      const foot=document.createElement('footer');foot.className='phone-ui phone-pager-foot';
      const prev=button('Previous',()=>{s.page--;show(s,true);});const contents=button('Sections',()=>{s.contents=!s.contents;s.page=0;buildPages(s);show(s,true);});
      const count=document.createElement('span');count.setAttribute('role','status');
      const next=button('Next',()=>{s.page++;show(s,true);});foot.append(prev,contents,count,next);
      const primary=own(s.root,'.shop-buy,#forgeCraft,#backToTown,#inventoryTidy,.phone-ending-return,.saved-footer .title-action,.touch-item-actions .manage-primary').find(n=>!n.disabled);
      if(primary)move(s,primary,foot);
      s.root.append(foot);Object.assign(s,{head,foot,prev,contentsButton:contents,count,next,name});
      s.units=collect(s);
      // Surface the paired workspace tabs without duplicating their actions.
      if(s.root.matches('#panelLeft,#panelRight,#panelCenter')){
        const nav=document.getElementById('workspaceTabs');
        if(nav&&!nav.hidden)head.insertBefore(button('Switch panel',()=>{
          const buttons=[...nav.children];const i=buttons.findIndex(b=>b.getAttribute('aria-pressed')==='true');buttons[(i+1)%buttons.length]?.click();schedule();
        }),head.lastChild);
      }
      splitText(s);
      s.groups=[...new Set(s.units.map(u=>u.group))];
      if(!s.groups.includes(s.section))s.section=s.root.dataset.kind==='inv'&&s.groups.includes('Pack')?'Pack':s.groups.find(g=>!['Categories','Disciplines','Talents'].includes(g))||s.groups[0];
      buildPages(s);show(s);s.dirty=false;
    }finally{observe(s);}
  }
  function bodyHeight(s){const c=getComputedStyle(s.root);return Math.max(44,s.root.clientHeight-parseFloat(c.paddingTop)-parseFloat(c.paddingBottom));}
  function splitText(s){
    const limit=bodyHeight(s),out=[];
    for(const unit of s.units){
      const node=unit.node;
      if(node.getBoundingClientRect().height<=limit||node.matches(atomic)||node.querySelector('button,input,select,textarea,a,canvas,img')){out.push(unit);continue;}
      const words=node.textContent.trim().split(/\s+/);node.classList.add('phone-text-source');
      let at=0;
      while(at<words.length){
        const piece=document.createElement('p');piece.className='phone-unit phone-text-piece';node.before(piece);
        let lo=1,hi=words.length-at,best=1;
        while(lo<=hi){const n=(lo+hi)>>1;piece.textContent=words.slice(at,at+n).join(' ');if(piece.getBoundingClientRect().height<=limit){best=n;lo=n+1;}else hi=n-1;}
        piece.textContent=words.slice(at,at+best).join(' ');at+=best;out.push({node:piece,group:unit.group});
      }
    }s.units=out;
  }
  function buildPages(s){
    s.observer.disconnect();
    s.root.querySelectorAll('.phone-section-choice').forEach(n=>n.remove());
    for(const u of s.units)u.node.classList.remove('phone-off');
    let units=s.units.filter(u=>u.group===s.section);
    if(s.contents){
      units=s.groups.map(group=>{const b=button(group,()=>{s.section=group;s.page=0;s.contents=false;buildPages(s);show(s,true);});b.className='phone-ui phone-unit phone-section-choice';s.root.insertBefore(b,s.foot);return {node:b,group};});
    }
    const width=s.root.clientWidth-parseFloat(getComputedStyle(s.root).paddingLeft)-parseFloat(getComputedStyle(s.root).paddingRight),limit=bodyHeight(s);
    let pages=[[]],used=0,rowWidth=0,rowHeight=0;
    for(const u of units){
      const r=u.node.getBoundingClientRect();const w=r.width,h=r.height;
      if(rowWidth&&rowWidth+8+w>width+1){used+=rowHeight+8;rowWidth=0;rowHeight=0;}
      if(used+Math.max(rowHeight,h)>limit+1&&pages[pages.length-1].length){pages.push([]);used=0;rowWidth=0;rowHeight=0;}
      pages[pages.length-1].push(u.node);rowWidth+=(rowWidth?8:0)+w;rowHeight=Math.max(rowHeight,h);
    }
    s.pages=pages;s.choices=units.filter(u=>u.node.classList.contains('phone-section-choice')).map(u=>u.node);
    // Verify the real layout as well as the packing estimate. Native form controls
    // and source flex styles can change their height after neighboring units hide.
    const all=[...s.units.map(u=>u.node),...s.choices],bottom=s.root.getBoundingClientRect().bottom-parseFloat(getComputedStyle(s.root).paddingBottom);
    for(let i=0;i<pages.length;i++){
      const page=pages[i];
      for(const n of all)n.classList.toggle('phone-off',!page.includes(n));
      while(page.length>1&&page.some(n=>n.getBoundingClientRect().bottom>bottom+1)){
        const last=page.pop();last.classList.add('phone-off');
        if(!pages[i+1])pages.push([]);pages[i+1].unshift(last);
      }
    }
    s.page=Math.min(Math.max(0,s.page),pages.length-1);
  }
  function show(s,focus=false){
    s.observer.disconnect();
    s.page=Math.min(Math.max(0,s.page),s.pages.length-1);
    const page=s.pages[s.page]||[];
    for(const node of [...s.units.map(u=>u.node),...(s.choices||[])])node.classList.toggle('phone-off',!page.includes(node));
    s.name.textContent=s.contents?'Sections':s.groups.length<2?s.title:s.section||s.title;
    s.prev.disabled=s.page===0;s.next.disabled=s.page===s.pages.length-1;
    s.count.textContent=`${s.page+1} / ${s.pages.length}`;s.contentsButton.hidden=s.groups.length<2;
    s.root.scrollTop=0;s.root.scrollLeft=0;
    memory.set(s.key,{section:s.section,page:s.page});
    if(focus){s.name.tabIndex=-1;s.name.focus({preventScroll:true});}
    observe(s);
  }
  function sync(){
    queued=0;
    if(!MobileShell.enabled){for(const root of [...states.keys()])release(root);return;}
    const roots=[...document.querySelectorAll('#panelLeft,#panelRight,#panelCenter,#skillPick,#escmenu > .box,#touchItemMenu,dialog.coop-dialog,#deathScreen,#phoneInstallHelp,#title[data-screen=saves] #titleMenu,#cinematic:not(:has(video))')].filter(visible);
    for(const root of [...states.keys()])if(!roots.includes(root))release(root);
    for(const root of roots){const s=states.get(root)||prepare(root);if(s.dirty||!root.querySelector('.phone-pager-foot'))layout(s);}
  }
  new MutationObserver(records=>{if(records.some(r=>!r.target.closest?.('.phone-paged,.phone-ui')&&([...r.addedNodes,...r.removedNodes].some(n=>n.nodeType===1)||r.type==='attributes')))schedule();}).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','open']});
  window.addEventListener('phoneviewportchange',()=>{for(const s of states.values())s.dirty=true;schedule();});
  document.addEventListener('focusout',schedule);
  return {sync,schedule,release};
})();
