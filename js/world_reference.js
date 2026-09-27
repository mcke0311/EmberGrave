/* Read-only level catalogue. No game boot, character storage, or rendering loop. */
"use strict";
const WorldReference = (() => {
  const categories={shrines:'Shrines',habitats:'Dens & habitats',containers:'Containers',remains:'Remains',story:'Story objects',buildings:'Buildings & walls',entrances:'Entrances',scenery:'Scenery',decorations:'Decorations',materials:'Terrain materials'};
  const metadataPaths={art:'assets/sprites_src/gameplay_art/gameplay_art_v1.json',props:'assets/sprites_src/gameplay_art_authored/prop_interactions/import.json'};
  let provenance=new Map(),loaded=null;
  const title=s=>String(s||'Unknown').replace(/^world\.(prop|props)\./,'').replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
  const ref=(path,symbol,note)=>({path,symbol,note});
  function setProvenance(art,props){
    provenance=new Map();
    for(const d of Object.values(art.descriptors||{}))provenance.set(d.assetId,{path:d.path,source:d.provenance?.source,size:d.size,report:d.provenance?.parameters?.importReport,command:'python tools/build_sprite_assets.py'});
    for(const [id,s] of Object.entries(props.sources||{}))provenance.set(id,{path:s.source,source:s.source,report:metadataPaths.props,command:'python tools/import_prop_interactions.py'});
  }
  function load(){
    if(!loaded)loaded=Promise.all(Object.values(metadataPaths).map(async path=>{const r=await fetch(path);if(!r.ok)throw Error('Cannot load editing references: '+path);return r.json();})).then(([art,props])=>setProvenance(art,props)).catch(e=>{loaded=null;throw e;});
    return loaded;
  }
  function frameInfo(id,index=0){
    const d=DATA.SPRITE_MANIFEST.entries[id];
    if(!d)throw Error('Missing sprite definition: '+id);
    const size=d.cell||provenance.get(id)?.size;
    if(!size)throw Error('Missing sprite dimensions in '+metadataPaths.art+': '+id);
    return {id,index,sw:size[0],sh:size[1],anchorX:d.anchor[0],anchorY:d.anchor[1]};
  }
  function levels(){
    const result=DATA.ACTS.map(a=>({name:'Act '+a.rn+' · '+a.name,zones:a.zones.slice()}));
    result[0].zones.unshift('frosthaven_approach');
    const known=new Set(result.flatMap(a=>a.zones));
    result.push({name:'Optional · The Ashen Marches',zones:Object.keys(DATA.ZONES).filter(id=>!known.has(id))});
    return result;
  }
  function generator(m){
    if(m.cathedral)return 'genCathedral';
    if(m.settlement)return 'genSettlement / SETTLEMENTS';
    if(m.zone.opening)return 'genOpening';
    if(m.frontier)return 'genFrontier / FRONTIER';
    if(m.act2)return 'genAct2 / ACT2';
    if(m.act3)return 'genAct3 / ACT3';
    if(m.composition)return 'genCinders / CINDERS';
    return m.id==='fields'?'genFields':m.id==='forest'?'genForest':'genCrypt';
  }
  function category(p){
    if(p.storyId||p.soulBinding)return 'story';
    if(['wolf_den','spider_nest'].includes(p.behavior))return 'habitats';
    if(p.familySite||p.ev?.kind==='ambush')return 'habitats';
    if(p.interact==='shrine'||['buff','curse','heal','xp','glyph'].includes(p.ev?.kind)||['shrine','altar','well'].includes(p.type))return 'shrines';
    if(p.searchable||p.remainsSite||['grave','frozen_remains'].includes(p.type))return 'remains';
    if(p.lootable||p.breakable||['chest','strongbox','barrel','crate','urn'].includes(p.type))return 'containers';
    if(p.gate||p.thresholdId||['stairs','cryptdoor','cave','portal','monasterydoor'].includes(p.type))return 'entrances';
    if(p.building)return 'buildings';
    if(/tree|rock|boulder|reed|root|fir|pine|crag/.test(p.type))return 'scenery';
    return 'decorations';
  }
  function behavior(p,m){
    if(p.behavior==='crystal')return 'Break once: 10% chance of one level-scaled socketable jewel, otherwise empty. Leaves crystal fragments.';
    if(p.behavior==='wolf_den')return 'Boundary wolf den (1.75× size). Spawns an Icefang Wolf every 6 seconds while a living player is within 12 connected tiles; maximum 4 living den-spawned wolves. Break it to stop spawning.';
    if(p.behavior==='spider_nest')return 'Kick or attack once: 40% one spider, 40% one random common-quality item, 20% empty. Leaves a broken nest.';
    if(p.familySite)return 'Decorative '+p.propFamily+' for '+DATA.MONSTER_FAMILIES[p.familySite].name+'. Becomes deserted when its territory is cleared; no interaction, loot, or respawns.';
    if(p.ev){const e=p.ev;return ({ambush:'Ambush site: triggers '+e.count+' enemies and a cache on clearing.',buff:'Blessing shrine: '+e.buff?.dur+' seconds. '+Object.entries(e.buff?.stats||{}).map(([k,v])=>k+' +'+v).join(', '),cache:'Event cache: '+e.drops+' loot rolls.',gold:'Gold cache.',heal:'Restores '+Math.round(e.frac*100)+'% health'+(e.mana?' and mana':'')+'.',xp:'Grants experience.',curse:'Cursed altar: elite encounter and reward.',glyph:'Grants glyph rewards.'})[e.kind]||title(e.kind);}
    if(p.interact==='shrine')return 'Travel shrine / waystone. Attunement unlocks travel to this level.';
    if(p.storyId){const o=DATA.STORY_OBJECTS[m.id]?.find(o=>o.id===p.storyId);return (o?.text||'Campaign story object.')+(o?.requireKill?' Requires defeating '+(DATA.ENEMIES[o.requireKill]?.name||o.requireKill)+'.':'');}
    if(p.searchable)return 'Search once for loot. Corpse consumption and searching are tracked separately.';
    if(p.breakable)return 'Destructible container; broken state persists for this expedition.';
    if(p.lootable)return 'Loot container; opened state persists for this expedition.';
    if(p.interact)return 'Interaction: '+p.interact+'.';
    return p.blocks?'Scenery with a blocking footprint.':'Nonblocking scenery or decoration.';
  }
  function references(p,m,assetId,owner){
    const placement=[ref('js/mapgen.js',owner?.includes(' / ')?owner.split(' / ').slice(1).join(' / '):owner&&owner!=='LevelTerrain.build'?owner:generator(m),'Placement and quantity for '+m.id)];
    if(owner&&/Environment|Boundaries|Architecture|LevelTerrain/.test(owner))placement.push(ref('js/level_terrain.js',owner.split(' / ')[0],'Environment assembly and artwork selection'));
    const actions=[];
    if(p.behavior)actions.push(ref('js/game.js',p.behavior==='wolf_den'?'updatePropSpawners / breakProp':'breakProp / spawnPropMonster','Single-use outcomes and authoritative habitat simulation'));
    if(p.familySite){placement.push(ref('js/mapgen.js','settleFamilies','Territory-site placement'),ref('js/data.js','DATA.MONSTER_FAMILIES.'+p.familySite,'Habitat appearance and family membership'));if(!p.behavior)actions.push(ref('js/entities.js','Monster.die','Territory clearing'));}
    else if(p.ev){placement.splice(0,placement.length,ref('js/mapgen.js','placeEvents / eventProp','Eligibility, weights, count, placement and Act I behavior'),ref('js/data.js','DATA.EVENTS → '+p.ev.id,'Event definition'));if(!p.behavior)actions.push(ref('js/game.js','triggerEvent','Event outcome'));}
    if(p.behavior)placement.push(ref('js/data.js','DATA.ACT1_PROP_RULES','Drop chances, spawn interval, range, cap and display scale'));
    else if(p.remainsSite||p.searchable){placement.push(ref('js/prop_interactions.js','prepare / BODY_SITES','Searchable remains and grave selection'));}
    if(p.storyId){placement.push(ref('js/data.js','DATA.STORY_OBJECTS.'+m.id+' → '+p.storyId,'Story definition'),ref('js/mapgen.js','generate','Story-object anchors'));actions.push(ref('js/game.js','syncStoryObjects / interactStory','Story progress and conditions'));}
    if(p.interact&&!p.ev&&!p.storyId)actions.push(ref('js/game.js','interact','Interaction entry point'));
    if(p.interact||p.lootable||p.breakable||p.familySite)actions.push(ref('js/prop_interactions.js','family / sample / profile','Art states and interaction timing'));
    if(!actions.length)actions.push(ref(owner&&owner.includes('Environment')||owner?.includes('Boundaries')?'js/level_terrain.js':'js/mapgen.js',owner||generator(m),'Rendering or placement rules; no interaction'));
    return {placement,art:artReferences(assetId),behavior:actions};
  }
  function artReferences(assetId){
    const d=DATA.SPRITE_MANIFEST.entries[assetId],a=provenance.get(assetId),art=[ref('js/sprite_manifest.js','DATA.SPRITE_MANIFEST.entries['+JSON.stringify(assetId)+']','Generated runtime mapping; rebuild after changing source art')];
    if(d)art.push(ref(d.src,assetId,'Packed runtime artwork'));
    if(a){for(const path of new Set([a.source,a.path].filter(Boolean)))art.push(ref(path,null,'Authored source artwork'));if(a.report)art.push(ref(a.report,null,'Import metadata'));art.push(ref(a.command.includes('import_prop')?'tools/import_prop_interactions.py':'tools/build_sprite_assets.py',null,a.command));}
    else art.push({note:'Source provenance missing. Check '+metadataPaths.art+' and '+metadataPaths.props+'.',missing:true});
    return art;
  }
  function variants(p,m){
    const states=[{label:'Unused',prop:{...p},shrines:[]}];
    const family=PropInteractions.family(p);
    if(PropInteractions.themed(p)){
      const used=p.behavior?'Broken':family==='shrine'?(p.ev?'Spent':'Attuned'):['barrel','crate','urn'].includes(family)?'Broken':p.familySite?'Deserted':family.startsWith('frozen_')||family==='grave'?'Searched':'Used';
      states.push({label:used,prop:{...p,broken:!!p.behavior,spent:true,opened:true,searched:true,completed:true},shrines:[m.id]});
      if(family==='grave')states.push({label:'Corpse consumed',prop:{...p,corpseConsumed:true},shrines:[]});
    }else if(p.visualDone||p.type==='chest')states.push({label:p.behavior?'Broken':'Completed / opened',prop:{...p,broken:!!p.behavior,completed:true,opened:true},shrines:[]});
    return states.map(s=>({label:s.label,...PropInteractions.resolveVisual(s.prop,{map:m,time:100,shrines:s.shrines})}));
  }
  function inspect(zoneId,{seed=12345,difficulty=0}={}){
    if(!DATA.ZONES[zoneId])throw Error('Unknown level: '+zoneId);
    if(!Number.isInteger(seed)||seed<0||seed>4294967295)throw Error('Seed must be a whole number from 0 to 4294967295.');
    if(!DATA.DIFFICULTIES[difficulty])throw Error('Unknown difficulty.');
    const map=MapGen.generate(zoneId,seed),instances=[],materials=[],errors=[];
    const composition=map.composition||map.act2||map.frontier;
    MapGen.placeEvents(map,{seed,difficulty,...(!composition?{random:U.rng(seed^U.hash(zoneId)^0x77e17)}:{})});
    const add=(p,collection,ordinal,visual=null,owner=null,cat=null)=>{
      const v=visual||PropInteractions.resolveVisual(p,{map,time:100,shrines:[]}),assetId=v.id||v.assetId;
      const row={id:collection+':'+ordinal,type:p.type||assetId?.split('.').at(-1)||'unknown',name:p.label||title(p.type||assetId),category:cat||category(p),collection,
        x:p.x,y:p.y,surfaceId:p.surfaceId||0,blocks:!!p.blocks,family:p.propFamily||PropInteractions.family(p),familyId:p.familySite||null,territoryId:p.territoryId||null,eventId:p.ev?.id||null,storyId:p.storyId||null,
        assetId,index:v.index||0,behavior:behavior(p,map),states:visual?[{label:'Artwork',id:assetId,index:v.index||0}]:variants(p,map),references:references(p,map,assetId,owner),prop:p};
      if(!DATA.SPRITE_MANIFEST.entries[assetId])row.error='Missing sprite: '+(assetId||p.type)+'. Check the sprite manifest and rebuild assets.';
      if(!provenance.has(assetId))row.error=(row.error?row.error+' ':'')+'Missing authored source reference for '+assetId+'.';
      if(row.error)errors.push(row.error);
      row.groupKey=JSON.stringify([row.category,row.type,row.family,row.familyId,row.eventId,row.storyId,row.assetId,row.index]);
      instances.push(row);return row;
    };
    map.props.forEach((p,i)=>add(p,'props',i));
    const environments=[
      [map.act1Environment,Act1Environment,'act1Environment','Act1Environment / act1Environment'],
      [map.boundaries,Act2Boundaries,'boundaries','Act2Boundaries / act2Boundaries / act2Visuals'],
      [map.act3?.architecture,ImperialArchitecture,'act3.architecture','ImperialArchitecture / imperialArchitecture'],
      [map.act3?.environment,ImperialEnvironment,'act3.environment','ImperialEnvironment / imperialEnvironment'],
      [map.act5Environment,CindersBoundaries,'act5Environment','CindersBoundaries / act5Environment'],
      [map.cathedral?.environment,CathedralEnvironment,'cathedral.environment','CathedralEnvironment / genCathedral']
    ];
    for(const [present,module,collection,owner] of environments)if(present){
      let rows;try{rows=module.describe(map,frameInfo);}catch(e){errors.push('Cannot inspect '+collection+': '+e.message);continue;}
      rows.forEach((d,i)=>{const type=d.assetId?.split('.').at(-1)||'unknown',cat=/door|passage/.test(type)?'entrances':/wall|pillar|pier|arch|masonry|cliff/.test(type)?'buildings':/ground|floor|foundation|inlay|sun|eclipse/.test(type)?'decorations':'scenery';
        const p={...d,type,blocks:false};const row=add(p,collection,i,{id:d.assetId,index:d.index},owner,cat);row.behavior='Environment artwork. Collision is defined by the level terrain, independently of this visual piece.';});
    }
    const decals=map.cathedral?.decals||map.composition?.decals||map.act2?.decals||map.frontier?.decals||[];
    const seen=new Set();
    for(const [collection,list] of [['decals',decals],['thresholdDecals',map.thresholdDecals||[]]])for(const [i,d] of list.entries()){
      if(seen.has(d)||map.act3?.environment&&d.type.startsWith('act3_'))continue;seen.add(d);
      add({...d,blocks:false},collection,i,{id:DATA.SPRITE_MANIFEST.maps.props[d.type]},'LevelTerrain / '+generator(map),'decorations');
    }
    for(const [i,sc] of ((map.composition||map.frontier)?.scenery||[]).entries()){
      const id=DATA.SPRITE_MANIFEST.maps.massifs[map.zone.theme+'_'+sc.variant];if(id)add({...sc,type:'massif_'+sc.variant},'scenery',i,{id},generator(map),'scenery');
    }
    // Exits are navigational regions, not additional copies of their gate art.
    const exits=map.exits.map((e,i)=>({id:'exit:'+i,x:(e.x0+e.x1)/2,y:(e.y0+e.y1)/2,label:e.label||DATA.ZONES[e.target]?.name,target:e.target,spawnKey:e.spawnKey}));
    const countTiles=predicate=>{let n=0;for(let i=0;i<map.w*map.h;i++)if(predicate(i))n++;return n;};
    const material=(key,label,coverage=null)=>{const id=DATA.SPRITE_MANIFEST.maps.props[key]||key;if(!id||coverage===0||materials.some(m=>m.assetId===id))return;
      const def=DATA.SPRITE_MANIFEST.entries[id];
      if(!def){errors.push('Missing terrain sprite: '+id);return;}
      const frames=def.kind==='static'?1:def.rows*def.cols;
      materials.push({id:'material:'+id,type:key,name:label,category:'materials',assetId:id,index:0,coverage,states:Array.from({length:frames},(_,index)=>({label:frames===1?'Material':'Frame '+index,id,index})),references:references({type:key},map,id,'LevelTerrain.build'),behavior:'Continuous terrain material; coverage is measured in tiles, not placed prop instances.'});};
    const ground=LevelTerrain.groundMaterialKey(map);
    if(DATA.SPRITE_MANIFEST.maps.props[ground])material(ground,'Base ground',countTiles(i=>!map.void?.[i]));
    for(const code of new Set(map.hazard))if(code&&DATA.HAZARDS[code])material('level_hazard_'+DATA.HAZARDS[code].id,title(DATA.HAZARDS[code].id)+' hazard',countTiles(i=>!map.walls[i]&&map.hazard[i]===code));
    if(map.act2)material(map.act2Visual?'a2visual_water':'act2_black_water','Marsh water',countTiles(i=>!!map.act2.water[i]));
    if(map.act1Environment&&map.outdoor)material('frosthaven_street','Road paving',countTiles(i=>map.floor[i]>=4&&!map.walls[i]));
    if(map.act3?.environment){material('a3visual_sandstone','Route paving');if(!map.outdoor)material('a3visual_slate','Slate paving');}
    if(map.cathedral)for(const mat of new Set(map.cathedralMaterials)){if(map.cathedral.materials[mat])material(map.cathedral.materials[mat],title(['pale','dark','ash','bastion'][mat])+' ground',countTiles(i=>map.cathedralMaterials[i]===mat&&!map.void[i]));}
    if(map.cathedral?.rooms.some(n=>n.material!==2))material('a4stone_paving','Cathedral stone paving');
    if(map.cathedral?.rooms.some(n=>n.material===2))material('a4v2_floor_pale','Remembered street paving');
    if(map.settlement)material(DATA.SPRITE_MANIFEST.maps.grounds[map.id],'Settlement ground',map.w*map.h);
    const legacyWalls=!map.act5Environment&&!map.act1Environment&&!map.boundaries&&!map.act3?.architecture&&!(map.composition||map.frontier)?.terrainWalls;
    if(legacyWalls&&!map.outdoor)material(DATA.SPRITE_MANIFEST.maps.walls[map.zone.theme],'Wall tiles',countTiles(i=>!!map.walls[i]&&!map.void?.[i]));
    if(!map.act3?.environment&&!map.cathedral&&!map.act1Environment&&DATA.SPRITE_MANIFEST.maps.paths[map.zone.theme])material(DATA.SPRITE_MANIFEST.maps.paths[map.zone.theme],'Path tiles',countTiles(i=>map.floor[i]>=4&&!map.walls[i]));
    const grouped=new Map();for(const p of instances){let g=grouped.get(p.groupKey);if(!g){g={...p,id:p.groupKey,instances:[],count:0};grouped.set(p.groupKey,g);}g.instances.push(p);g.count++;}
    const groups=[...grouped.values()].sort((a,b)=>a.category.localeCompare(b.category)||a.name.localeCompare(b.name));
    const eligibleEvents=[];
    if(!map.cathedral&&!['town','camp'].includes(map.zone.kind)&&!map.zone.opening){
      const pool=DATA.EVENTS.filter(e=>(e.minLvl||1)<=DATA.effectiveLevel(map.zone.lvl,difficulty)+2),weight=pool.reduce((n,e)=>n+(e.weight||1),0);
      for(const e of pool.filter(e=>e.kind!=='goblin')){
        const p=MapGen.eventProp(map,e,0,0),v=PropInteractions.resolveVisual(p,{map,time:100,shrines:[]});
        eligibleEvents.push({id:'eligible:'+e.id,name:e.name,type:p.type,category:category(p),eventId:e.id,assetId:v.id,index:v.index,states:variants(p,map),behavior:behavior(p,map),weight:e.weight||1,totalWeight:weight,placed:instances.filter(p=>p.eventId===e.id).length,references:references(p,map,v.id)});
      }
    }
    const landmarks=map.frontier?.landmarks||map.act2?.landmarks||map.composition?.landmarks||map.cathedral?.rooms||[];
    return {zone:{...DATA.ZONES[zoneId]},seed,difficulty,map,instances,groups,materials,eligibleEvents,exits,landmarks,errors:[...new Set(errors)],legacyEvents:!composition&&!map.cathedral&&!['camp','town'].includes(map.zone.kind)&&!map.zone.opening};
  }
  function referenceText(record,inspection){
    const {zone,seed,difficulty}=inspection;
    const lines=[zone.name+' ['+zone.id+'] · seed '+seed+' · '+DATA.DIFFICULTIES[difficulty].name,record.name+' · '+record.type,record.x==null?'No single placement selected':'Position '+record.x.toFixed(2)+', '+record.y.toFixed(2)+' · layer '+(record.surfaceId||0),'Sprite '+record.assetId+' · frame '+record.index];
    for(const key of ['eventId','storyId','familyId','territoryId'])if(record[key])lines.push(key+': '+record[key]);
    for(const [kind,refs] of Object.entries(record.references))lines.push('\n'+title(kind),...refs.map(r=>[r.path,r.symbol,r.note].filter(Boolean).join(' · ')));
    return lines.join('\n');
  }
  return Object.freeze({categories,metadataPaths,load,setProvenance,frameInfo,levels,inspect,referenceText,artReferences,title});
})();
