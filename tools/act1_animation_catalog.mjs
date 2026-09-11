// Enumerate real northern spawn/event pools at every difficulty, then recurse summons.
import fs from 'node:fs';
import vm from 'node:vm';
const ctx=vm.createContext({});
for(const name of ['utils','data','data_overrides','sprite_manifest'])vm.runInContext(fs.readFileSync('js/'+name+'.js','utf8'),ctx);
const D=vm.runInContext('DATA',ctx),ids=new Set(['frost_watch_captain','beacon','barb_axe','barb_pole','barb_sword']);
const zones={};
for(const zone of D.ACT1_ZONES){
  const z=D.ZONES[zone],local=new Set([...z.spawns,...(z.boss?[z.boss]:[])]);
  if(!z.opening)for(const difficulty of D.DIFFICULTIES){
    const lvl=z.lvl+difficulty.lvlAdd;
    const fams=new Set(['beast',...D.EVENTS.filter(e=>(e.minLvl||1)<=lvl+2&&e.kind==='ambush').map(e=>e.fam).filter(Boolean)]);
    for(const fam of fams){let pool=Object.values(D.ENEMIES).filter(e=>!e.boss&&e.family===fam&&Math.abs(e.lvl-lvl)<=7);
      if(!pool.length)pool=Object.values(D.ENEMIES).filter(e=>!e.boss&&Math.abs(e.lvl-lvl)<=7);
      for(const e of pool)local.add(e.id);
    }
  }
  zones[zone]=[...local].sort();for(const id of local)ids.add(id);
}
for(const id of ids){const d=D.resolveEnemy(id,'north_wild');
  for(const list of [d.summons?.id,d.beaconSpawn?.pool,d.splitOnDeath?.id,d.throwUndead?.pool,...(d.phases||[]).map(p=>p.set?.summons?.id)])
    for(const child of (Array.isArray(list)?list:list?[list]:[]))ids.add(child);
}
const skills={slam:'slam',charge:'charge',leap:'leap',whirl:'whirl',volley:'volley',summons:'summon',heals:'heal',teleports:'blink',throwUndead:'throw',breath:'breath'};
const sources=[];
for(const act of [2,3,4,5])for(const s of JSON.parse(fs.readFileSync('assets/act'+act+'_animations/generated.json','utf8')).enemies){
  const art=s.reference?.match(/\/([^/]+)\.webp$/)?.[1];if(!art)continue;
  sources.push({...s,act,art,asset:'actor.act'+act+'.'+s.id});
}
const groups={},roster={};
for(const id of [...ids].sort()){
  const d=D.resolveEnemy(id,'north_wild'),art=d.artId||d.sprite;
  let seq=[d.projectile?'bolt':'melee',...Object.entries(skills).filter(([k])=>d[k]).map(([,v])=>v),'death'];
  if(id==='beacon')seq=['summon','death'];
  if(id==='korvath')seq=['cleave','fissure','cleave_1','fissure_1','death','death_1'];
  const reference=id==='korvath'?D.SPRITE_MANIFEST.entries[D.SPRITE_MANIFEST.maps.bosses.korvath].src:art==='beacon'?D.SPRITE_MANIFEST.entries[D.SPRITE_MANIFEST.maps.props.beacon].src:D.SPRITE_MANIFEST.entries[D.SPRITE_MANIFEST.maps.monsters[art]]?.src;
  const g=groups[art]||(groups[art]={id:art,reference:reference||null,weapon:d.artReview?.weapon||'none',anatomy:d.artReview?.anatomy||d.sprite,sequences:[],enemies:[],clips:{}});
  g.enemies.push(id);g.sequences=[...new Set([...g.sequences,...seq])];
  const elements=Object.fromEntries(seq.map(k=>[k,k==='death'?d.deathBurst?.elem||'phys':['bolt','volley'].includes(k)?d.projectile?.elem||'phys':k==='summon'?d.projectile?.elem||(d.beaconSpawn?'cold':'shadow'):d[k]?.elem||d.meleeElem||'phys']));
  if(id==='korvath')Object.assign(elements,{cleave:'phys',cleave_1:'phys',fissure:'fire',fissure_1:'fire'});
  roster[id]={art,sequences:seq,elements,poison:d.poison||0,elementBonus:d.elemDmg||{},deathBurst:!!d.deathBurst,split:!!d.splitOnDeath};
}
for(const g of Object.values(groups)){
  for(const kind of g.sequences){
    const s=sources.find(s=>s.art===g.id&&s.sequences.includes(kind)&&D.SPRITE_MANIFEST.entries[s.asset]);
    if(s)g.clips[kind]={asset:s.asset,row:s.sequences.indexOf(kind),source:s.source};
  }
  g.missing=g.sequences.filter(k=>!g.clips[k]);
  g.reusableSources=sources.filter(s=>s.art===g.id&&s.sequences.some(k=>g.missing.includes(k))).map(s=>({source:s.source,alphaSource:s.alphaSource,sequences:s.sequences,act:s.act}));
}
fs.mkdirSync('assets/act1_animations',{recursive:true});
const result=JSON.stringify({version:1,zones,roster,groups:Object.values(groups)},null,2)+'\n';
if(process.argv.includes('--check')){
  if(fs.readFileSync('assets/act1_animations/catalog.json','utf8')!==result)throw Error('Northern spawn/ability catalog is stale; run tools/act1_animation_catalog.mjs');
}else fs.writeFileSync('assets/act1_animations/catalog.json',result);
console.log('Coverage:',ids.size,'enemies;',Object.keys(groups).length,'art identities');
for(const g of Object.values(groups))if(g.missing.length)console.log(g.id+': '+g.missing.join(', ')+(g.reusableSources.length?' (existing source)':''));
