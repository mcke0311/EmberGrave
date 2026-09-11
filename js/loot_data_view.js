'use strict';
(() => {
  const $=id=>document.getElementById(id), D=LootData;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pct=p=>p===0?'0%':p<.000001?(p*100).toExponential(2)+'%':(p*100).toLocaleString('en-US',{maximumFractionDigits:4,minimumFractionDigits:2})+'%';
  const num=(id,max)=>Math.min(max,Math.max(id==='mf'?0:1,Math.round(Number($(id).value)||0)));
  let page=0,selected='u_gravebite',view='items',filtered=[],affixRows=[],difficulty=0;
  const size=20;
  const options=(id,entries)=>{for(const [value,name] of entries){const o=document.createElement('option');o.value=value;o.textContent=name;$(id).append(o);}};
  options('kind',Object.entries(D.kinds));options('slot',[...new Set(D.rows.map(r=>r.slot))].sort().map(x=>[x,x]));
  options('source',Object.entries(D.sources));$('source').value='boss';
  options('difficulty',DATA.DIFFICULTIES.map((d,i)=>[i,d.name]));
  options('affixBase',[['charm','Charm (all sizes)'],['jewel','Jewel'],...Object.values(DATA.BASES).map(b=>[b.id,b.name])]);$('affixBase').value='shortsword';
  $('summary').innerHTML=[[D.rows.length,'item definitions'],[DATA.AFFIXES.length,'affix families'],[DATA.AFFIXES.reduce((s,a)=>s+a.tiers.length,0),'affix tiers'],[D.rows.filter(r=>r.powers.length).length,'brown-power items']].map(([v,l])=>`<div class="metric"><strong>${v}</strong><span>${l}</span></div>`).join('');
  const params=new URLSearchParams(location.search);
  if(D.byId.has(params.get('item')))selected=params.get('item');
  for(const id of ['level','mf','source','kind','slot','difficulty'])if(params.has(id)){$(id).value=params.get(id);if(!$(id).value)$(id).selectedIndex=0;}
  function scenario(){difficulty=Number($('difficulty').value);const normalLevel=num('level',150);return {normalLevel,level:normalLevel+DATA.DIFFICULTIES[difficulty].lvlAdd,mf:num('mf',10000),source:$('source').value};}
  function renderItems(){
    const {normalLevel,level,mf,source}=scenario(),query=$('search').value.toLowerCase().trim();
    filtered=D.rows.map(row=>{const chances=D.difficultyChances(row,normalLevel,source,mf);return {...row,chances,p:chances[difficulty].p};}).filter(r=>
      ($('kind').value==='all'||($('kind').value==='uniqueAll'?r.kind.startsWith('unique'):r.kind===$('kind').value))&&
      ($('slot').value==='all'||r.slot===$('slot').value)&&(!$('eligible').checked||r.p>0)&&
      [r.name,r.id,r.base,...r.stats,...r.powers].join(' ').toLowerCase().includes(query));
    filtered.sort($('sort').value==='chance'?(a,b)=>b.p-a.p||a.level-b.level:$('sort').value==='name'?(a,b)=>a.name.localeCompare(b.name):(a,b)=>a.level-b.level||a.name.localeCompare(b.name));
    const pages=Math.max(1,Math.ceil(filtered.length/size));page=Math.min(page,pages-1);
    if(filtered.length&&!filtered.some(r=>r.id===selected))selected=filtered[0].id;
    $('count').textContent=`${filtered.length} items · ${filtered.filter(r=>r.p>0).length} can drop on ${DATA.DIFFICULTIES[difficulty].name}`;
    $('scenario').textContent=`Comparing the same ${D.sources[source].toLowerCase()}: ${DATA.DIFFICULTIES.map(d=>`${d.name} Lv ${normalLevel+d.lvlAdd}`).join(' / ')} · ${mf}% Magic Find · Chance of at least one copy per ${source==='chest'?'opening':source==='barrel'?'break':'kill'}. Sorting and eligibility use ${DATA.DIFFICULTIES[difficulty].name}. Difficulty raises source level (+0 / +7 / +13), changing the eligible loot pool; it does not directly multiply drop rates. Higher difficulty can make an early item stop dropping.`;
    $('itemHeaders').innerHTML='<th scope="col">Item / base</th><th scope="col">Level / slot</th>'+DATA.DIFFICULTIES.map((d,i)=>`<th scope="col" class="${i===difficulty?'active-difficulty':''}">${esc(d.name)}<small>Lv ${normalLevel+d.lvlAdd}</small></th>`).join('')+'<th scope="col">Brown power</th>';
    $('items').innerHTML=filtered.slice(page*size,(page+1)*size).map(r=>`<tr class="${r.id===selected?'selected':''}"><td><button class="item-link" data-item="${esc(r.id)}" aria-pressed="${r.id===selected}">${esc(r.name)}</button><small>${esc(r.base||D.kinds[r.kind])}</small></td><td>${r.level}<small>${esc(r.slot)}</small></td>${r.chances.map((c,i)=>`<td data-difficulty="${i}" class="${c.p?'odds':'zero'} ${i===difficulty?'active-difficulty':''}">${pct(c.p)}<small>${c.p?'≈ 1 in '+Math.round(1/c.p).toLocaleString():'Not in this pool'}</small></td>`).join('')}<td>${r.powers.length?r.powers.map(p=>`<div class="power-title">${esc(p.split(' — ')[0])}</div>`).join(''):'<span class="zero">—</span>'}</td></tr>`).join('')||'<tr><td colspan="6" class="empty">No matching items. Try another search or clear the filters.</td></tr>';
    $('page').textContent=`Page ${page+1} of ${pages}`;$('prev').disabled=page===0;$('next').disabled=page>=pages-1;
    if(filtered.length)renderDetail();else $('detail').innerHTML='<h2>No item selected</h2><p>Change the filters to explore more items.</p>';
  }
  function renderDetail(){
    const row=D.byId.get(selected),{level,mf}=scenario(),b=DATA.BASES[row.def.base]||(row.kind==='base'?row.def:null);
    const baseStats=b?[b.dmg&&`Damage ${b.dmg.join('–')}`,b.armor&&`Armor ${b.armor}`,b.block&&`Block ${b.block}%`,b.speed&&`Attack speed ${b.speed}`,b.maxSockets&&`Socket capacity ${b.maxSockets}`].filter(Boolean):[];
    const set=DATA.SETS[row.def.set];
    const quests=DATA.QUESTS.filter(q=>q.reward?.item?.rarity==='unique'&&D.gearPools(q.reward.item.ilvl).uniques.some(u=>u.id===row.id));
    $('detail').innerHTML=`<span class="eyebrow">${esc(D.kinds[row.kind])}</span><h2>${esc(row.name)}</h2><div class="id">${esc(row.id)}</div><p>${esc(row.base||row.slot)} · Item level ${row.level}</p>
      <div class="power-box"><span class="eyebrow">BROWN POWER</span>${row.powers.length?row.powers.map(p=>`<p>${esc(p)}</p>`).join(''):'<p>No authored brown power on this item.</p>'}</div>
      <h3>Stats & properties</h3><ul class="stats">${[...baseStats,...row.stats].map(s=>`<li>${esc(s)}</li>`).join('')||'<li>Random affixes; inspect the Affixes tab for ranges.</li>'}</ul>
      ${row.def.flavor?`<p class="muted"><em>${esc(row.def.flavor)}</em></p>`:''}
      ${set?`<h3>${esc(set.name)} bonuses</h3><ul class="stats">${Object.entries(set.bonuses).map(([n,stats])=>`<li>${n} pieces: ${esc(Object.entries(stats).map(([k,v])=>D.stat(k,v)).join(', '))}</li>`).join('')}</ul>`:''}
      <h3>${esc(DATA.DIFFICULTIES[difficulty].name)} · Source level ${level}</h3><div class="source-grid">${Object.entries(D.sources).map(([s,name])=>`<div class="source-card"><span>${name}</span><strong>${pct(D.chance(row,level,s,mf))}</strong></div>`).join('')}</div>
      <h3>Where to find · by difficulty</h3><p class="muted">${mf}% Magic Find. Same location and source across all difficulties, using actual source levels. Sorted by ${esc(DATA.DIFFICULTIES[difficulty].name)} odds. 0% means this item cannot drop from that source on that difficulty.</p><div id="locations" class="locations difficulty-locations"></div>
      ${quests.length?`<h3>One-time quest rewards</h3>${quests.map(q=>`<p class="muted">${esc(q.name)}: ${pct(1/D.gearPools(q.reward.item.ilvl).uniques.length)} for this item from the guaranteed unique reward.</p>`).join('')}` : ''}
      <p class="muted" style="margin-top:16px">Shared loot pools: this item has no exclusive monster assignment. See methodology below for special sources.</p>`;
    renderLocations();
  }
  function renderLocations(){
    const list=D.compareLocations(D.byId.get(selected),scenario().mf).sort((a,b)=>b.chances[difficulty].p-a.chances[difficulty].p||a.zone.localeCompare(b.zone));
    $('locations').innerHTML=list.map(l=>`<div class="location"><strong>${esc(l.zone)}</strong><small>${esc(l.name)} · ${D.sources[l.source]}</small><div class="difficulty-grid">${l.chances.map((c,i)=>`<div class="${i===difficulty?'active-difficulty':''}"><span>${esc(DATA.DIFFICULTIES[i].name)}</span><strong class="${c.p?'odds':'zero'}">${pct(c.p)}</strong><small>Lv ${c.level}</small></div>`).join('')}</div></div>`).join('')||'<p class="empty">No standard sources on any difficulty.</p>';
  }
  function renderAffixes(){
    const level=num('affixLevel',150),base=$('affixBase').value,query=$('affixSearch').value.toLowerCase().trim();
    affixRows=D.affixes(level,base).filter(r=>($('affixKind').value==='all'||r.kind===$('affixKind').value)&&(!$('affixEligible').checked||r.p>0)&&[r.t.name,r.a.group,r.a.stat,r.values].join(' ').toLowerCase().includes(query));
    $('affixCount').textContent=`${affixRows.length} tiers · ${affixRows.filter(r=>r.p>0).length} eligible for this item`;
    $('affixRules').textContent=base==='charm'?'Charm values below are unscaled. Small / large / grand charms multiply rolls by 0.55 / 0.70 / 0.85, round and clamp to at least 1; they roll up to 1 / 2 / 3 affix families.':base==='jewel'?'Jewel values below are unscaled. Jewels multiply rolls by 0.70, round and clamp to at least 1; they target 1–2 stat entries.':'Enhanced gear targets 1–2 affix families; rare gear targets 3–5. Socket prefixes use a separate roll: 45% when the base has capacity, minimum item levels 10 / 33 / 55 for 1–2 / 3 / 4 sockets, capped by base capacity.';
    $('affixes').innerHTML=affixRows.map(r=>`<tr><td><strong>${esc(r.t.name)}</strong><small>${esc(r.a.group||r.a.stat)}</small></td><td>${r.kind}</td><td>${r.t.ilvl}</td><td>${esc(r.values)}</td><td>${esc(r.a.slots.join(', '))}${r.a.cats?'<small>'+esc(r.a.cats.join(', '))+'</small>':''}<small>Weight ${r.a.weight||1}</small></td><td class="${r.p?'odds':'zero'}">${pct(r.p)}<small>Family: ${pct(r.family)}</small></td></tr>`).join('')||'<tr><td colspan="6" class="empty">No matching affixes.</td></tr>';
  }
  function tab(next){view=next;for(const v of ['items','affixes']){$(v+'View').hidden=v!==view;$(v+'Tab').setAttribute('aria-selected',v===view);$(v+'Tab').tabIndex=v===view?0:-1;}if(view==='affixes')renderAffixes();}
  for(const v of ['items','affixes']){$(v+'Tab').onclick=()=>tab(v);$(v+'Tab').onkeydown=e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();tab(e.key==='Home'?'items':e.key==='End'?'affixes':view==='items'?'affixes':'items');$(view+'Tab').focus();}};}
  for(const id of ['search','kind','slot','source','level','mf','sort','eligible','difficulty'])$(id).addEventListener('input',()=>{page=0;renderItems();});
  for(const id of ['affixSearch','affixBase','affixLevel','affixKind','affixEligible'])$(id).addEventListener('input',renderAffixes);
  $('prev').onclick=()=>{page--;renderItems();};$('next').onclick=()=>{page++;renderItems();};
  $('items').onclick=e=>{const b=e.target.closest('[data-item]');if(b){selected=b.dataset.item;renderItems();$('items').querySelector(`[data-item="${selected}"]`)?.focus({preventScroll:true});}};
  $('export').onclick=()=>{
    const s=scenario();
    const records=view==='items'?[['ID','Name','Type','Slot','Item level','Source','Difficulty','Source level on Normal','Effective source level','Magic Find %','Chance % per source',...DATA.DIFFICULTIES.flatMap(d=>[d.name+' source level',d.name+' chance %']),'Stats','Brown powers','Where to find ('+DATA.DIFFICULTIES[difficulty].name+')'],...filtered.map(r=>[r.id,r.name,D.kinds[r.kind],r.slot,r.level,s.source,DATA.DIFFICULTIES[difficulty].name,s.normalLevel,s.level,s.mf,r.p*100,...r.chances.flatMap(c=>[c.level,c.p*100]),r.stats.join('; '),r.powers.join('\n'),D.locations(r,difficulty,s.mf).map(l=>`${l.zone}: ${l.name} (${l.source}, Lv ${l.level}) ${pct(l.p)}`).join('\n')])]:[['Name','Kind','Group','Minimum level','Stat range','Slots','Categories','Weight','First draw chance %','Roll base','Item level'],...affixRows.map(r=>[r.t.name,r.kind,r.a.group||r.a.stat,r.t.ilvl,r.values,r.a.slots.join(';'),r.a.cats?.join(';')||'',r.a.weight||1,r.p*100,$('affixBase').value,num('affixLevel',150)])];
    const csv=records.map(row=>row.map(v=>{let text=String(v??'');if(/^[=+@-]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"';}).join(',')).join('\r\n');
    const url=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=`embergrave-${view}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  renderItems();if(params.get('view')==='affixes')tab('affixes');
})();
