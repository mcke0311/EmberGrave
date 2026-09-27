"use strict";
(() => {
  const $=id=>document.getElementById(id),R=WorldReference,images=new Map();
  const colors={shrines:'#91d9ee',habitats:'#e5ac75',containers:'#e5cd87',remains:'#b8c9da',story:'#d2a4e5',buildings:'#8c9caa',entrances:'#84e4bb',scenery:'#6e9b80',decorations:'#a6a99c'};
  let inspection=null,selection=null,selectedGroup=null,category='all',search='',generation=0,terrain=null,scale=1,offsetX=0,offsetY=0,drag=null,observer=null;
  const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text!=null)e.textContent=text;if(cls)e.className=cls;return e;};
  const params=new URLSearchParams(location.search);
  let currentZone=DATA.ZONES[params.get('zone')]?params.get('zone'):'frosthaven';
  $('seed').value=params.get('seed')??'12345';$('difficulty').value=['0','1','2'].includes(params.get('difficulty'))?params.get('difficulty'):'0';
  $('objectSearch').value=params.get('q')||'';search=$('objectSearch').value.toLowerCase();category=R.categories[params.get('category')]?params.get('category'):'all';
  function syncURL(){
    if(!inspection)return;
    const p=new URLSearchParams({zone:currentZone,seed:inspection.seed,difficulty:inspection.difficulty});
    if(selection)p.set('item',selection.id);if(search)p.set('q',$('objectSearch').value);if(category!=='all')p.set('category',category);
    history.replaceState(null,'',location.pathname+'?'+p);
  }
  function imageFor(id){
    const def=DATA.SPRITE_MANIFEST.entries[id];if(!def)return Promise.reject(Error('Missing sprite definition: '+id));
    if(!images.has(def.src))images.set(def.src,new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>{images.delete(def.src);reject(Error('Cannot load '+def.src));};im.src=def.src+(def.revision?'?v='+def.revision:'');}));
    return images.get(def.src);
  }
  async function paintArt(canvas,id,index=0){
    canvas.dataset.asset=id||'';canvas.dataset.frame=String(index);delete canvas.dataset.error;delete canvas.dataset.loaded;
    const stamp=Symbol();canvas.paintStamp=stamp;
    const size=canvas.classList.contains('detail-art')?560:340;canvas.width=size;canvas.height=canvas.classList.contains('detail-art')?440:240;
    const c=canvas.getContext('2d');c.clearRect(0,0,canvas.width,canvas.height);
    try{
      const im=await imageFor(id);if(canvas.paintStamp!==stamp)return;
      const d=DATA.SPRITE_MANIFEST.entries[id];let sx=0,sy=0,sw=im.naturalWidth,sh=im.naturalHeight;
      if(d.kind!=='static'){if(index<0||index>=d.cols*d.rows)throw Error('Invalid atlas frame '+index);sw=d.cell[0];sh=d.cell[1];sx=index%d.cols*sw;sy=Math.floor(index/d.cols)*sh;}
      const b=d.hitShapes?.[index]?.bounds;if(b){sx+=b[0];sy+=b[1];sw=b[2]-b[0];sh=b[3]-b[1];}
      const s=Math.min((canvas.width-34)/sw,(canvas.height-28)/sh,2.4);
      c.drawImage(im,sx,sy,sw,sh,(canvas.width-sw*s)/2,(canvas.height-sh*s)/2,sw*s,sh*s);
      canvas.setAttribute('aria-label',id+' frame '+index);canvas.dataset.loaded='true';
    }catch(e){if(canvas.paintStamp!==stamp)return;canvas.dataset.error=e.message;c.fillStyle='#f4ad99';c.font='20px system-ui';c.textAlign='center';c.fillText('Artwork unavailable',canvas.width/2,canvas.height/2);canvas.title=e.message;}
  }
  function watchArt(canvas,id,index){canvas.dataset.asset=id||'';canvas.dataset.frame=index||0;observer.observe(canvas);}
  function renderLevels(){
    const query=$('levelSearch').value.toLowerCase(),nav=$('levels');nav.replaceChildren();
    for(const group of R.levels()){
      const ids=group.zones.filter(id=>(DATA.ZONES[id].name+' '+id+' '+group.name).toLowerCase().includes(query));if(!ids.length)continue;
      const section=el('section',null,'act-group');section.append(el('h3',group.name));
      for(const id of ids){const b=el('button',DATA.ZONES[id].name,'level-link');b.dataset.zone=id;b.setAttribute('aria-current',String(currentZone===id));b.title=id;b.onclick=()=>generate(id);section.append(b);}nav.append(section);
    }
    if(!nav.children.length)nav.append(el('p','No matching levels.','muted'));
  }
  const matches=p=>(category==='all'||p.category===category)&&(!search||[p.name,p.type,p.assetId,p.family,p.familyId,p.storyId,p.eventId].filter(Boolean).join(' ').toLowerCase().includes(search));
  function card(record,kind){
    const button=el('button',null,'object-card');button.dataset.record=record.id;button.setAttribute('aria-label',record.name+(kind==='placed'?' · '+record.count+' placed':''));
    if(kind==='placed'&&selectedGroup?.id===record.id||kind!=='placed'&&selection?.id===record.id)button.classList.add('selected');
    const art=el('canvas',null,'art');art.setAttribute('role','img');watchArt(art,record.assetId,record.index);button.append(art);
    const body=el('span',null,'card-info');body.append(el('span',record.name,'card-name'),el('code',record.eventId||record.type));
    const meta=el('span',null,'card-meta');meta.append(el('span',R.categories[record.category]));
    if(kind==='placed'){button.append(el('span','× '+record.count,'badge'));meta.append(el('span','View instances'));}
    if(kind==='eligible')meta.append(el('span',record.placed?'In this seed':'Not placed'));
    if(kind==='material')meta.append(el('span',record.coverage==null?'Surface':record.coverage+' tiles'));
    body.append(meta);button.append(body);button.onclick=()=>select(kind==='placed'?record.instances[0]:record,kind==='placed'?record:null,true);return button;
  }
  function renderGallery(){
    if(!inspection)return;observer.disconnect();
    const groups=inspection.groups.filter(matches),gallery=$('gallery');gallery.replaceChildren();
    for(const g of groups)gallery.append(card(g,'placed'));
    if(!groups.length)gallery.append(el('p','No matching objects. Try another name or category.','empty'));
    $('resultCount').textContent='· '+groups.length+' types';
    const cat=$('categories');cat.replaceChildren();
    for(const [id,name] of [['all','All objects'],...Object.entries(R.categories).filter(([id])=>id!=='materials')]){
      const count=id==='all'?inspection.instances.length:inspection.instances.filter(p=>p.category===id).length;
      const b=el('button',name+' '+count,'category');b.dataset.category=id;b.setAttribute('aria-pressed',String(id===category));b.onclick=()=>{category=id;renderGallery();drawMap();syncURL();};cat.append(b);
    }
    $('events').replaceChildren(...inspection.eligibleEvents.filter(matches).map(e=>card(e,'eligible')));
    if(!$('events').children.length)$('events').append(el('p',inspection.eligibleEvents.length?'No matching eligible events.':'Random events are not placed in this level.','empty'));
    $('eventCount').textContent=inspection.eligibleEvents.length+' eligible';
    $('materials').replaceChildren(...inspection.materials.map(m=>card(m,'material')));$('materialCount').textContent=inspection.materials.length+' surfaces';
  }
  function addIdentity(dl,key,value){if(value==null||value==='')return;dl.append(el('dt',key),el('dd',String(value)));}
  function select(record,group=null,focus=false){
    selection=record;selectedGroup=group||inspection.groups.find(g=>g.instances?.some(p=>p.id===record.id))||null;
    let preview={id:record.assetId,index:record.index,label:record.states[0].label};
    const pane=$('detail');pane.replaceChildren();
    const back=el('button','↑ Back to gallery','mobile-return');back.onclick=()=>$('catalogTitle').scrollIntoView({block:'start',behavior:'smooth'});pane.append(back);
    pane.append(el('span',R.categories[record.category]||'OBJECT REFERENCE','eyebrow'),el('h2',record.name),el('code',record.eventId||record.type));
    const art=el('canvas',null,'art detail-art');art.setAttribute('role','img');pane.append(art);
    const states=el('div',null,'state-picker');
    for(const [i,s] of record.states.entries()){
      const b=el('button',s.label);b.setAttribute('aria-pressed',String(i===0));b.onclick=()=>{preview=s;for(const e of states.children)e.setAttribute('aria-pressed',String(e===b));paintArt(art,s.id,s.index);$('currentFrame').textContent=s.id+' · frame '+s.index;renderReferences();};states.append(b);
    }
    pane.append(states);paintArt(art,record.assetId,record.index);
    const dl=el('dl',null,'identity');addIdentity(dl,'Object type',record.type);const sprite=el('dd',record.assetId+' · frame '+record.index);sprite.id='currentFrame';dl.append(el('dt','Sprite'),sprite);
    addIdentity(dl,'Collection',record.collection);addIdentity(dl,'Family',record.familyId||record.family);addIdentity(dl,'Event',record.eventId);addIdentity(dl,'Story',record.storyId);addIdentity(dl,'Territory',record.territoryId);
    if(record.x!=null){addIdentity(dl,'Position',record.x.toFixed(2)+', '+record.y.toFixed(2));addIdentity(dl,'Layer',record.surfaceId||0);addIdentity(dl,'Blocking',record.collection==='props'?(record.blocks?'Yes':'No'):'Terrain-defined');}
    if(record.coverage!=null)addIdentity(dl,'Coverage',record.coverage+' tiles');
    if(record.weight)addIdentity(dl,'Draw weight',record.weight+' / '+record.totalWeight+' (includes creature events)');
    pane.append(dl);
    if(selectedGroup){const label=el('label','Instance · '+selectedGroup.count+' placed');const choice=el('select');choice.id='instance';choice.setAttribute('aria-label','Choose an object instance');
      for(const p of selectedGroup.instances){const o=el('option',p.id+' · ('+p.x.toFixed(2)+', '+p.y.toFixed(2)+') · layer '+p.surfaceId);o.value=p.id;choice.append(o);}choice.value=record.id;choice.onchange=()=>select(selectedGroup.instances.find(p=>p.id===choice.value),selectedGroup);label.append(choice);pane.append(label);
      const focus=el('button','Center on map');focus.onclick=()=>{offsetX=$('map').clientWidth/2-record.x*scale;offsetY=$('map').clientHeight/2-record.y*scale;drawMap();$('map').scrollIntoView({block:'center',behavior:'smooth'});};pane.append(focus);
    }
    pane.append(el('p',record.behavior));if(record.error)pane.append(el('p',record.error,'error'));
    if(record.id.startsWith('eligible:'))pane.append(el('p',record.placed?'This event appears in the selected generated level.':'Eligible, but not placed in the selected seed. No coordinates are assigned.','muted'));
    const copy=el('button','Copy change reference','primary copy'),feedback=el('div',null,'copy-feedback');feedback.setAttribute('role','status');copy.onclick=async()=>{
      const text=R.referenceText({...record,assetId:preview.id,index:preview.index,references:previewReferences()},inspection)+'\nPreview state: '+preview.label;try{await navigator.clipboard.writeText(text);feedback.textContent='Reference copied.';}catch{feedback.textContent='Select and copy this reference:';const area=el('textarea',text,'copy-fallback');area.readOnly=true;area.setAttribute('aria-label','Change reference to copy');pane.querySelector('.copy-fallback')?.remove();feedback.after(area);area.select();}
    };pane.append(copy,feedback);
    const referencePanel=el('div');pane.append(referencePanel);
    function previewReferences(){return preview.id===record.assetId?record.references:{...record.references,art:R.artReferences(preview.id)};}
    function renderReferences(){
    referencePanel.replaceChildren();
    for(const [key,label] of [['placement','Placement and quantity'],['art','Artwork'],['behavior','Behavior']]){
      referencePanel.append(el('h3',label));for(const r of previewReferences()[key]){const item=el('div',null,'reference');
        if(r.path){const a=el('a',r.path);a.href=r.path;a.target='_blank';a.rel='noopener';item.append(a);}if(r.symbol)item.append(el('code',r.symbol));if(r.note)item.append(el('small',r.note));if(r.missing)item.classList.add('error');referencePanel.append(item);
      }
    }
    }renderReferences();
    for(const b of document.querySelectorAll('.object-card'))b.classList.toggle('selected',b.dataset.record===(selectedGroup?.id||record.id));
    drawMap();syncURL();if(focus&&innerWidth<=960)pane.scrollIntoView({block:'start',behavior:'smooth'});
  }
  function prepareMap(){
    const m=inspection.map;terrain=document.createElement('canvas');terrain.width=m.w;terrain.height=m.h;const c=terrain.getContext('2d'),img=c.createImageData(m.w,m.h);
    for(let i=0;i<m.w*m.h;i++){
      const elev=m.elev?.[i]||0;let color=m.void?.[i]?[14,20,24]:m.act2?.water?.[i]?[32,69,77]:m.walls[i]?[51,67,66]:m.floor[i]>=4?[108,107,83]:[57+elev*9,73+elev*9,66+elev*7];
      if(m.hazard[i])color=[87,74,72];img.data.set([...color,255],i*4);
    }c.putImageData(img,0,0);fitMap();
  }
  function fitMap(){if(!inspection)return;scale=Math.min(($('map').clientWidth-36)/inspection.map.w,($('map').clientHeight-36)/inspection.map.h);offsetX=($('map').clientWidth-inspection.map.w*scale)/2;offsetY=($('map').clientHeight-inspection.map.h*scale)/2;drawMap();}
  function drawMap(){
    if(!inspection||!terrain)return;const canvas=$('map'),w=canvas.clientWidth,h=canvas.clientHeight,dpr=devicePixelRatio||1;canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);const c=canvas.getContext('2d');c.scale(dpr,dpr);c.clearRect(0,0,w,h);c.imageSmoothingEnabled=false;c.drawImage(terrain,offsetX,offsetY,terrain.width*scale,terrain.height*scale);
    const selected=new Set(selectedGroup?.instances.map(p=>p.id)||[]);
    for(const p of inspection.instances.filter(matches)){
      const x=offsetX+p.x*scale,y=offsetY+p.y*scale;if(x<0||y<0||x>w||y>h)continue;
      c.fillStyle=colors[p.category]||'#aaa';c.globalAlpha=selected.has(p.id)?1:['scenery','buildings','decorations'].includes(p.category)?.65:.95;
      c.beginPath();c.arc(x,y,selected.has(p.id)?4:Math.min(3,Math.max(1.5,scale*.24)),0,Math.PI*2);c.fill();
      if(selected.has(p.id)){c.globalAlpha=1;c.strokeStyle='#edc986';c.lineWidth=1;c.beginPath();c.arc(x,y,7,0,Math.PI*2);c.stroke();}
    }
    c.globalAlpha=1;
    if($('landmarkToggle').checked){c.font='10px system-ui';for(const l of inspection.landmarks){const x=offsetX+l.x*scale,y=offsetY+l.y*scale;if(x<0||y<0||x>w||y>h)continue;const text=l.label||R.title(l.id);c.fillStyle='#111b1cdd';c.fillRect(x-3,y-13,c.measureText(text).width+6,16);c.fillStyle='#e5dec8';c.fillText(text,x,y-1);}}
    if($('exitToggle').checked){c.strokeStyle='#84e4bb';c.lineWidth=2;for(const e of inspection.exits){const x=offsetX+e.x*scale,y=offsetY+e.y*scale;c.beginPath();c.moveTo(x,y-5);c.lineTo(x+5,y);c.lineTo(x,y+5);c.lineTo(x-5,y);c.closePath();c.stroke();}}
    if(selection?.x!=null){const x=offsetX+selection.x*scale,y=offsetY+selection.y*scale;c.strokeStyle='#fff1c9';c.lineWidth=2;c.beginPath();c.arc(x,y,10,0,Math.PI*2);c.stroke();}
    $('mapReadout').textContent=inspection.map.w+' × '+inspection.map.h+' tiles · '+Math.round(scale*100)/100+' px/tile';
  }
  function zoom(factor,x=$('map').clientWidth/2,y=$('map').clientHeight/2){const next=Math.max(.5,Math.min(35,scale*factor));offsetX=x-(x-offsetX)*next/scale;offsetY=y-(y-offsetY)*next/scale;scale=next;drawMap();}
  const map=$('map');map.addEventListener('wheel',e=>{e.preventDefault();const b=map.getBoundingClientRect();zoom(e.deltaY<0?1.18:1/1.18,e.clientX-b.left,e.clientY-b.top);},{passive:false});
  map.onpointerdown=e=>{if(!inspection)return;drag={x:e.clientX,y:e.clientY,ox:offsetX,oy:offsetY,moved:false};map.setPointerCapture(e.pointerId);};
  map.onpointermove=e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)>4)drag.moved=true;if(drag.moved){offsetX=drag.ox+dx;offsetY=drag.oy+dy;drawMap();}};
  map.onpointerup=e=>{
    if(!drag)return;const moved=drag.moved;drag=null;if(moved)return;const b=map.getBoundingClientRect(),x=e.clientX-b.left,y=e.clientY-b.top;
    const hits=inspection.instances.filter(matches).map(p=>({p,d:Math.hypot(offsetX+p.x*scale-x,offsetY+p.y*scale-y)})).filter(h=>h.d<12).sort((a,b)=>a.d-b.d);
    if(hits.length){const same=hits.filter(h=>h.d<=hits[0].d+.75),previous=same.findIndex(h=>h.p.id===selection?.id);select(same[(previous+1)%same.length].p,null,true);}
    else if($('exitToggle').checked){const exit=inspection.exits.find(e=>Math.hypot(offsetX+e.x*scale-x,offsetY+e.y*scale-y)<12);if(exit)$('mapReadout').textContent=exit.label+' → '+exit.target+' · arrival '+exit.spawnKey;}
  };
  map.onpointercancel=()=>{drag=null;};
  async function generate(zone=currentZone,restore=null){
    if(!$('scenario').reportValidity())return;
    const ticket=++generation;currentZone=zone;const seed=Number($('seed').value),difficulty=Number($('difficulty').value);$('status').className='';$('status').textContent='Generating '+DATA.ZONES[zone].name+'…';$('scenario').querySelector('button').disabled=true;renderLevels();
    try{
      await R.load();await new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0)));if(ticket!==generation)return;
      const result=R.inspect(zone,{seed,difficulty});inspection=result;selection=null;selectedGroup=null;
      $('zoneName').textContent=result.zone.name;$('zoneId').textContent=zone;$('zoneAct').textContent=R.levels().find(a=>a.zones.includes(zone)).name;
      $('summary').replaceChildren();for(const [n,label] of [[result.instances.length,'objects'],[result.groups.length,'types']]){const stat=el('div',null,'stat');stat.append(el('strong',n.toLocaleString()),el('span',label));$('summary').append(stat);}
      $('scenarioNote').textContent='Seed '+seed+' · '+DATA.DIFFICULTIES[difficulty].name+' · '+result.map.w+' × '+result.map.h+' tiles'+(result.legacyEvents?' · Legacy events are reproducible dashboard samples.':' · Counts describe this generated layout.');
      $('diagnostics').hidden=!result.errors.length;$('issues').textContent=result.errors.join('\n');
      prepareMap();renderGallery();
      const record=restore&&(result.instances.find(p=>p.id===restore)||result.eligibleEvents.find(p=>p.id===restore)||result.materials.find(p=>p.id===restore));
      select(record||result.instances.find(p=>p.category==='shrines')||result.instances[0]);
      $('status').textContent=result.errors.length?result.errors.length+' reference issues — see details below.':'Ready · choose artwork or a map marker.';
    }catch(e){$('status').textContent=e.message;$('status').className='error';}
    finally{if(ticket===generation)$('scenario').querySelector('button').disabled=false;}
  }
  observer=new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting){observer.unobserve(e.target);paintArt(e.target,e.target.dataset.asset,Number(e.target.dataset.frame));}},{rootMargin:'200px'});
  $('levelCount').textContent=Object.keys(DATA.ZONES).length+' levels';$('levelSearch').oninput=renderLevels;$('scenario').onsubmit=e=>{e.preventDefault();generate();};
  $('objectSearch').oninput=()=>{search=$('objectSearch').value.toLowerCase();renderGallery();drawMap();syncURL();};
  $('zoomIn').onclick=()=>zoom(1.3);$('zoomOut').onclick=()=>zoom(1/1.3);$('fit').onclick=fitMap;$('landmarkToggle').onchange=drawMap;$('exitToggle').onchange=drawMap;
  new ResizeObserver(()=>fitMap()).observe($('mapWrap'));
  renderLevels();generate(currentZone,params.get('item'));
})();
