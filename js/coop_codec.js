/* Network data contains no executable callbacks, GPU objects, or navigation caches. */
const CoopCodec=(()=>{
  const inventoryCache=new WeakMap(),publicationCache=new WeakMap();
  const groups=['players','monsters','minions','projectiles','ground','traps','fx','npcs'];
  // Sub-pixel precision is enough for presentation; saves retain exact values.
  const motionFields=['x','y','jumpZ','visAng','angT','stride','curSpeed','animT'];
  const heldItems=p=>[p.management?.carried,...(p.management?.offer||[])].filter(Boolean);
  function mapManagement(m,convert){return {carried:m?.carried?convert(m.carried):null,origin:m?.origin||null,offer:(m?.offer||[null,null,null,null]).map(it=>it?convert(it):null),origins:m?.origins||[null,null,null,null]};}
  const skip=new Set(['cls','originWorld','originMap','combatWorld','combatMap','world','map','instance','baseOpts','enemySkills','imperialCombat','act2Combat','path','command','hitSet','hit','targetCache','statsCache','drawingContext','canvas','image','minimap','nav','navigation','mesh']);
  function id(o,prefix='e'){if(o&&!o._coopId)o._coopId=prefix+'_'+CoopProtocol.randomId();return o?._coopId;}
  function encode(value,root=false,seen=new Set(),depth=0){
    if(value==null||typeof value==='string'||typeof value==='boolean')return value;
    if(typeof value==='number')return Number.isFinite(value)?value:0;
    if(typeof value!=='object'||depth>14)return undefined;
    if(!root&&value._coopId)return {$ref:value._coopId};
    if(seen.has(value))return undefined;
    seen.add(value);
    let result;
    if(ArrayBuffer.isView(value))result={$typed:value.constructor.name,data:Array.from(value)};
    else if(value instanceof Set)result={$set:[...value].map(v=>encode(v,false,seen,depth+1)).filter(v=>v!==undefined)};
    else if(Array.isArray(value))result=value.map(v=>encode(v,false,seen,depth+1)??null);
    else{
      result={};
      if(value._coopId)result._coopId=value._coopId;
      for(const key of Object.keys(value)){
        if(key.startsWith('_')||skip.has(key)||['__proto__','constructor','prototype'].includes(key))continue;
        const v=encode(value[key],false,seen,depth+1);if(v!==undefined)result[key]=v;
      }
    }
    seen.delete(value);return result;
  }
  function decode(value,refs){
    if(!value||typeof value!=='object')return value;
    if(value.$ref)return refs.get(value.$ref)||null;
    if(value.$typed){const type={Uint8Array,Uint16Array,Uint32Array,Int32Array,Float32Array,Float64Array,Uint8ClampedArray}[value.$typed];return type?new type(value.data):value.data;}
    if(value.$set)return new Set(value.$set.map(v=>decode(v,refs)));
    if(Array.isArray(value))return value.map(v=>decode(v,refs));
    const out=value._coopId&&refs.get(value._coopId)||{};for(const [k,v]of Object.entries(value))if(!['__proto__','constructor','prototype'].includes(k))out[k]=decode(v,refs);return out;
  }
  function register(s){
    for(const key of groups)for(const o of s[key]||[])id(o,key);
    for(const p of s.map?.props||[])id(p,'prop');
    for(const p of s.players||[s.player])for(const item of [...p.inv.items,...p.stash.items,...Object.values(p.equip),...heldItems(p)])if(item)id(item,'item');
    for(const a of Object.values(s.vendorStock||{}))for(const it of a)id(it,'item');
    for(const g of s.ground)if(g.item)id(g.item,'item');
  }
  function hero(p){
    const fields=['name','classId','lvl','xp','attr','attrPts','skillPts','skills','skillPerks','gold','skillL','skillR','quickSlots','deaths','belt'];
    const h={id:p.heroId||p._coopId,revision:p.coopRevision||0,savedAt:Date.now()};
    for(const k of fields)h[k]=encode(p[k]);
    h.inv=p.inv.items.map(it=>({...Game.serializeItem(it),netId:id(it,'item')}));
    h.stash=p.stash.items.map(it=>({...Game.serializeItem(it),netId:id(it,'item')}));
    h.equip=Object.fromEntries(Object.entries(p.equip).map(([k,it])=>[k,it?{...Game.serializeItem(it),netId:id(it,'item')}:null]));
    h.management=mapManagement(p.management,it=>({...Game.serializeItem(it),netId:id(it,'item')}));
    return h;
  }
  function restoreHero(h){
    if(!h||!CoopProtocol.safeId(h.id)||!DATA.CLASSES[h.classId])throw Error('Invalid co-op hero');
    const p=new Player(String(h.name||'Hero').slice(0,24),h.classId);p.heroId=h.id;p.coopRevision=h.revision||0;
    for(const k of ['lvl','xp','attr','attrPts','skillPts','skills','skillPerks','gold','skillL','skillR','quickSlots','deaths','belt'])if(h[k]!==undefined)p[k]=decode(h[k],new Map());
    if(!Number.isInteger(p.lvl)||p.lvl<1||p.lvl>100||!Number.isFinite(p.gold)||p.gold<0)throw Error('Invalid hero progression');
    for(const k of ['xp','attrPts','skillPts','deaths'])if(!Number.isFinite(p[k])||p[k]<0)throw Error('Invalid hero progression');
    if(!p.attr||!['str','dex','vit','wil'].every(k=>Number.isFinite(p.attr[k])&&p.attr[k]>=0&&p.attr[k]<=100000))throw Error('Invalid hero attributes');
    if(!p.skills||typeof p.skills!=='object'||Object.entries(p.skills).some(([id,n])=>!DATA.SKILLS[id]||DATA.SKILLS[id].cls!==p.classId||!Number.isInteger(n)||n<0||n>DATA.SKILLS[id].maxRank))throw Error('Invalid hero skills');
    if(!Array.isArray(p.belt)||p.belt.length!==4||p.belt.some(b=>b&&(!DATA.CONSUMABLES[b.id]?.belt||!Number.isInteger(b.count)||b.count<1||b.count>5)))throw Error('Invalid hero belt');
    if(!Array.isArray(p.quickSlots)||p.quickSlots.length!==4)throw Error('Invalid quick slots');
    for(const k of ['inv','stash'])if(!Array.isArray(h[k])||h[k].length>(k==='inv'?40:60))throw Error('Invalid hero inventory');
    if(!h.equip||Object.keys(h.equip).some(k=>!Items.EQUIP_SLOTS.includes(k)))throw Error('Invalid equipment slot');
    if(h.management){
      const m=h.management;
      if(!Array.isArray(m.offer)||m.offer.length!==4||!Array.isArray(m.origins)||m.origins.length!==4)throw Error('Invalid held items');
      for(const o of [m.origin,...m.origins])if(o&&(!['inv','stash','equip','offer'].includes(o.name)||(o.name==='equip'&&!Items.EQUIP_SLOTS.includes(o.slot))))throw Error('Invalid item origin');
    }
    const ids=[...h.inv,...h.stash,...Object.values(h.equip).filter(Boolean),...heldItems(h)].map(it=>it.netId).filter(Boolean);
    if(new Set(ids).size!==ids.length||ids.some(id=>!CoopProtocol.safeId(id)))throw Error('Duplicate or invalid item identity');
    const revive=it=>{const v=Game.reviveItem(it);if(v)v._coopId=it.netId||('item_'+CoopProtocol.randomId());return v;};
    for(const k of ['inv','stash']){
      const pending=[];
      for(const saved of h[k]||[]){const it=revive(saved);if(!it)continue;
        if(Number.isInteger(saved.gx)&&Number.isInteger(saved.gy)&&Items.fits(p[k],it,saved.gx,saved.gy))Items.place(p[k],it,saved.gx,saved.gy);else pending.push(it);
      }
      for(const it of pending)if(!Items.autoPlace(p[k],it))throw Error('Hero inventory does not fit');
    }
    for(const [slot,it]of Object.entries(h.equip||{}))if(it)p.equip[slot]=revive(it);
    p.management=mapManagement(h.management,revive);
    p.hardcore=false;p.computeStats();p.hp=p.stats.maxHp;p.mana=p.stats.maxMana;return p;
  }
  // Replication is a presentation contract, not a dump of AI/navigation internals.
  const actorFields=('id isNpc survivor sid storyId displayName healthBarUntil tempo tempoUntil staticChg stance riposteData boneWard retalCold rootT until encounterKind portalSpawns portalTimer bossVisualBirth mon x y radius surfaceId def spriteOpts spriteKey type mods tint flashT lastHitT walkStride attackWarning act1Visual act1Events castEpoch enraged minion beast isArcher projKind tier untargetable lift lob boomerang arrowWeapon trailColor z jumpZ visAng angT stride curSpeed moving aggro dead hp maxHp mana name classId heroId defId kindId connected coopInputSeq coopRevision travelGeneration teleportUntil combatUntil buffs stats action stunT frozen feared slowT slowPct snareRootUntil jumping leaping dashing spinning charging drawing form ex weaponState attackT poisonDot scorch bleedDot doom quarry killMark curseFrailty curseWither sunder rabies veilExposedUntil corpseT deathT elite isBoss beacon questTag packId monsterFamily familyHome visualOwner owner target sourceSkill visualSkill skillEpoch kind speed ttl dx dy vx vy tx ty fromPlayer elem hitSet damage mult pierce scale col color size trail bossOwner bossVisual bossLane sourceSkillId hflip attackVariant canMove combatAnim animation familyPose skillCast encounter bossPhase phase imperialCombat act2Combat').split(' ');
  const playerFields=('lvl xp attr attrPts skillPts skills skillPerks gold skillL skillR quickSlots deaths belt inv stash equip management attackCd skillCd jumpCdUntil critFlash hurtT hitFlash shieldT invulnT').split(' ');
  function quantizePresentation(value){
    if(typeof value==='number')return Math.round(value*1000)/1000;
    if(!value||typeof value!=='object')return value;
    for(const key of Object.keys(value))value[key]=quantizePresentation(value[key]);return value;
  }
  function actorRecord(o,key){
    if(!['players','monsters','minions','projectiles','npcs'].includes(key))return encode(o,true);
    const row={_coopId:o._coopId};
    for(const field of actorFields){if(o[field]===undefined)continue;
      if(['imperialCombat','act2Combat'].includes(field))continue;
      if(field==='encounter'){
        if(o.encounter){const e=o.encounter;row.encounter=encode({active:e.active,phase:e.phase,config:e.config,stage:e.stage,timer:e.timer,attack:e.attack,recoveryDuration:e.recoveryDuration,pose:e.pose,label:e.label,arena:e.arena,pools:e.pools,owned:e.owned,debris:e.debris,visual:e.visual,statusLabel:e.statusText?.()},true);}
      }else row[field]=encode(o[field]);
    }
    if(key==='players')for(const field of playerFields)if(!['inv','stash','equip','management'].includes(field)&&o[field]!==undefined)row[field]=encode(o[field]);
    for(const field of ['action','act1Visual','encounter'])if(row[field])quantizePresentation(row[field]);
    return row;
  }
  function snapshot(s,epoch,seq,full,viewerId=null,radius=24,publication=null){
    const viewer=viewerId&&s.players.find(p=>p._coopId===viewerId);
    const relevant=(o,key)=>!viewer||key==='players'||o.owner===viewer||o.encounter?.active||o.bossOwner?.encounter?.active||Math.hypot(o.x-viewer.x,o.y-viewer.y)<=radius+(o.radius||0)+(key==='projectiles'?8:0);

    let cache=publication==null?null:publicationCache.get(s);
    if(!cache||cache.publication!==publication){register(s);cache={publication,actors:new Map()};if(publication!=null)publicationCache.set(s,cache);}
    const out={kind:'snapshot',epoch,seq,full,time:s.time,zone:s.map.id,seed:s.seed,groups:{}};
    // Items are inlined in their owner; refs are reserved for world actors.
    for(const key of groups)out.groups[key]=(s[key]||[]).filter(o=>relevant(o,key)).map(o=>{
      if(cache.actors.has(o))return cache.actors.get(o);
      const row=actorRecord(o,key);
      for(const field of motionFields)if(Number.isFinite(row[field]))row[field]=Math.round(row[field]*1000)/1000;
      // Guests animate actors but never run their wandering AI.
      delete row.wanderT;
      if(key==='players'){
        let cached=viewerId&&inventoryCache.get(o);
        if(!cached||cached.revision!==o.coopRevision||cached.inventory!==o.inv||cached.equipment!==o.equip){
          const fields={inv:{w:o.inv.w,h:o.inv.h,items:o.inv.items.map(it=>encode(it,true))},stash:{w:o.stash.w,h:o.stash.h,items:o.stash.items.map(it=>encode(it,true))},equip:Object.fromEntries(Object.entries(o.equip).map(([k,it])=>[k,it?encode(it,true):null])),management:mapManagement(o.management,it=>encode(it,true))};
          cached={revision:o.coopRevision,inventory:o.inv,equipment:o.equip,fields};if(viewerId)inventoryCache.set(o,cached);
        }
        Object.assign(row,cached.fields);
      }
      if(key==='ground'&&o.item)row.item=encode(o.item,true);
      if(key==='monsters'&&row.encounter&&typeof o.encounter?.statusText==='function')row.encounter.statusLabel=o.encounter.statusText();
      cache.actors.set(o,row);return row;
    });
    out.terrainEdits=s.map._coopTerrain||{};
    out.props=cache.props||(cache.props=s.map.props.map(p=>encode(p,true)));
    cache.campaign||=encode({quests:s.quests,flags:s.flags,shrines:s.shrines,home:s.home,bossBar:s.bossBar,portal:s.portal});
    out.campaign={...cache.campaign}; // The recipient owns its portal projection.
    out.vendorStock=cache.vendorStock||(cache.vendorStock=Object.fromEntries(Object.entries(s.vendorStock).map(([k,a])=>[k,a.map(it=>encode(it,true))])));
    if(full)out.terrain=Object.fromEntries(['blocked','walls','hazard','height','elevation','floor','explored'].filter(k=>s.map[k]).map(k=>[k,encode(s.map[k])]));
    return out;
  }
  function applyTerrain(map,edits){
    for(const [key,cell]of Object.entries(edits||{})){const [surfaceId,index]=key.split(':').map(Number),surface=TerrainLayers.view(map,surfaceId);if(!cell||!surface||!Number.isInteger(index)||index<0||index>=map.w*map.h)continue;
      surface.blocked[index]=cell[0];surface.walls[index]=cell[1];if(surface.hazard)surface.hazard[index]=cell[2];
    }
  }
  function apply(s,snap,localId,changes=null){
    const moved=!changes||s._travelGeneration!==snap.generation;s._travelGeneration=snap.generation;
    const refs=new Map();
    for(const key of groups)for(const o of s[key]||[])refs.set(o._coopId,o);
    for(const p of s.map.props)if(p._coopId)refs.set(p._coopId,p);
    const prototypes={players:Player.prototype,monsters:Monster.prototype,minions:Minion.prototype,projectiles:Projectile.prototype,npcs:Npc.prototype};
    for(const key of groups)for(const row of snap.groups[key]||[])if(!refs.has(row._coopId))refs.set(row._coopId,Object.create(prototypes[key]||Object.prototype));
    for(const row of snap.props||[])if(!refs.has(row._coopId))refs.set(row._coopId,{});
    const itemRows=[];
    for(const row of snap.groups.players||[])itemRows.push(...row.inv.items,...row.stash.items,...Object.values(row.equip).filter(Boolean),...heldItems(row));
    itemRows.push(...(snap.groups.ground||[]).map(r=>r.item).filter(Boolean),...Object.values(snap.vendorStock||{}).flat());
    for(const item of itemRows)if(item._coopId&&!refs.has(item._coopId))refs.set(item._coopId,{});
    for(const key of groups){
      const dirty=changes?new Map((changes.groups[key]?.rows||[]).map(r=>[r._coopId,r])):null;
      s[key]=(snap.groups[key]||[]).map(row=>{
        const o=refs.get(row._coopId);if(dirty&&!dirty.has(row._coopId))return o;
        const previous={x:o.x,y:o.y},wasDead=o.dead,fields=dirty?{...dirty.get(row._coopId)}:row;
        if(dirty)for(const key of Object.keys(fields))if(fields[key]?.$patch)fields[key]=row[key];
        Object.assign(o,decode(fields,refs));o.animT??=0;
        if(moved||wasDead!==o.dead){o._netSamples=[];o._netFrom=o._netTo=null;o._presentationCorrection=null;}
        if(!moved&&wasDead===o.dead&&Number.isFinite(previous.x)&&Number.isFinite(o.x)&&['players','monsters','minions','projectiles'].includes(key)){
          o._netFrom=previous;o._netTo={x:o.x,y:o.y};o._netT=0;
          (o._netSamples||=[]).push({time:snap.time,x:o.x,y:o.y});if(o._netSamples.length>8)o._netSamples.shift();
          if(row._coopId!==localId&&Math.hypot(previous.x-o.x,previous.y-o.y)<4){o.x=previous.x;o.y=previous.y;}
          else o._netFrom={...o._netTo};
        }
        if(key==='players'){o.cls=DATA.CLASSES[o.classId];o._coopPrevious=previous;}
        if(key==='monsters'){o.combatWorld=s;o.combatMap=s.map;}
        return o;
      });
    }
    s.player=s.players.find(p=>p._coopId===localId)||s.player;
    if(!changes||Object.hasOwn(changes,'props'))s.map.props=(snap.props||[]).map(row=>Object.assign(refs.get(row._coopId),decode(row,refs)));
    if(snap.terrain)for(const [k,v]of Object.entries(snap.terrain))s.map[k]=decode(v,refs);
    applyTerrain(s.map,changes?changes.terrainEdits:snap.terrainEdits);
    if(!changes||changes.campaign)Object.assign(s,decode(snap.campaign,refs));
    if(!changes||changes.vendorStock)s.vendorStock=decode(snap.vendorStock,refs);s.time=snap.time;s.partyTime=snap.partyTime??snap.time;s._snapshotAt=performance.now();
    return refs;
  }
  return {id,encode,decode,register,hero,restoreHero,snapshot,apply,applyTerrain,groups};
})();
