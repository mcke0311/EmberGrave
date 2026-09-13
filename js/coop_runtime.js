/* Host authority. One worker owns all worlds; a world scope never crosses an await. */
const CoopRuntime=(()=>{
  const inFlight=new Map(),queuedActions=new Set(),acknowledgments=new Map(),resyncAt=new Map(),resyncRequested=new Set();
  const P=CoopProtocol,C=CoopCodec,worlds=new Map(),players=new Map(),baselines=new Map(),transfers=new Map(),channels=new Map(),sequences=new Map();
  let campaign,hostId='',active=false,committing=false,hidden=false,offline=false,saveError='',clock=0,publish=0,saveClock=0,sequence=0,publication=0,saveChain=Promise.resolve(),savePending=false;
  let economyChain=Promise.resolve(),transactionActive=false,stagedEvents=[],stagingRewards=null;
  const metrics={ticks:0,simulationMs:0,snapshotMs:0,snapshots:0,bytes:0,saveMs:0,simulationSamples:[],snapshotSamples:[],saveSamples:[],saveCaptureSamples:[],maxPendingCommands:0};
  const sample=(key,value)=>{const samples=metrics[key];samples.push(value);if(samples.length>1800)samples.shift();};
  const output=m=>globalThis.postMessage(m);
  const scope=(w,fn)=>Game.coop.withWorld(w,fn);
  const worldOf=p=>worlds.get(p?.worldId);
  const fail=message=>{throw Error(message);};
  function send(payload,to){
    if(to===hostId){output({type:'local',payload});return;}
    output({type:'send',to,payload});
  }
  function event(type,detail={},to){
    const payload={kind:'event',type,...detail};
    if(committing){stagedEvents.push({type,detail,to});return;}
    for(const p of players.values())if(p.connected&&(!to||to===p._coopId))send(payload,p._coopId);
  }
  function visual(effect,detail){
    const w=Game.state;if(!w)return;
    if(w._visuals.length<128)w._visuals.push({effect,...detail});
  }
  function capture(w){return scope(w,()=>{
    C.register(w);
    return {props:w.map.props.map(p=>C.encode(p,true)),terrainEdits:structuredClone(w.map._coopTerrain||{}),terrain:C.encode(Object.fromEntries(['blocked','walls','hazard'].map(k=>[k,w.map[k]]))),
      dead:[...new Set([...(campaign.areas[w.worldId]?.dead||[]),...w.monsters.filter(m=>m.dead).map(m=>m._coopId)])],
      monsters:w.monsters.filter(m=>!m.bossOwner).map(m=>({id:m._coopId,hp:m.hp,maxHp:m.maxHp,dead:m.dead})),
      ground:w.ground.map(g=>({...C.encode(g,true),item:g.item?{...Game.serializeItem(g.item),netId:g.item._coopId}:null})),partySize:w.map._coopSize||1};
  });}
  function getWorld(zone,p){
    if(!P.ZONES.includes(zone))fail('This destination is outside Act I.');
    if(worlds.has(zone))return worlds.get(zone);
    const w=Game.coop.createWorld(p,campaign.seed,campaign,zone);w._visuals=[];w._busy=false;w._queue=Promise.resolve();
    worlds.set(zone,w);
    scope(w,()=>{
      C.register(w);const old=campaign.areas[zone];w.map._coopSize=old?.partySize||Math.max(1,players.size);
      if(old){
        if(old.terrain)Object.assign(w.map,C.decode(old.terrain,new Map()));
        if(old.terrainEdits){w.map._coopTerrain=structuredClone(old.terrainEdits);C.applyTerrain(w.map,old.terrainEdits);}
        w.map.props.forEach((p,i)=>{if(old.props?.[i])Object.assign(p,C.decode(old.props[i],new Map()));});
        for(const m of w.monsters){if(old.dead?.includes(m._coopId)){m.dead=true;m.hp=0;m.corpseT=0;}else{const row=old.monsters?.find(r=>r.id===m._coopId);if(row&&!m.isBoss){m.hp=row.hp;m.maxHp=row.maxHp;m._coopScaled=true;}}}
        w.ground=(old.ground||[]).map(g=>({...C.decode(g,new Map()),item:g.item?Object.assign(Game.reviveItem(g.item),{_coopId:g.item.netId}):null}));
      }
      w._activated=!!old;if(w._activated)scale(w);C.register(w);
    });return w;
  }
  function scale(w){const multiplier=1+.6*(w.map._coopSize-1);for(const m of w.monsters)if(!m._coopScaled){m.hp*=multiplier;m.maxHp*=multiplier;m._coopScaled=true;}}
  function activateWorld(w){if(w._activated)return;w._activated=true;w.map._coopSize=Math.max(1,players.size);scale(w);}
  function party(){return [...players.values()].map(p=>({id:p._coopId,_coopId:p._coopId,name:p.name,classId:p.classId,hp:p.hp,maxHp:p.stats.maxHp,dead:p.dead,connected:p.connected,zone:p.worldId,generation:p.travelGeneration,combatUntil:p.combatUntil||0,teleportUntil:p.teleportUntil||0}));}
  function savedRecord(){
    for(const w of worlds.values())if(w._activated)campaign.areas[w.worldId]=capture(w);
    for(const p of players.values())campaign.heroes[p.heroId]=scope(worldOf(p),()=>C.hero(p));
    return structuredClone({...campaign,schemaVersion:2,savedAt:Date.now()});
  }
  function checkpoint(transaction=false,preparedRecord=null){
    if(transactionActive&&!transaction)return economyChain.then(()=>saveError?undefined:checkpoint());
    const captureAt=performance.now(),record=preparedRecord||savedRecord(),start=performance.now();sample('saveCaptureSamples',start-captureAt);
    const operation=saveChain.catch(()=>{}).then(()=>CoopStore.commit(record,[record.heroes[players.get(hostId)?.heroId]].filter(Boolean)));
    saveChain=operation;
    return operation.then(()=>{
      metrics.saveMs+=performance.now()-start;sample('saveSamples',performance.now()-start);saveError='';output({type:'runtimeStatus',paused:''});
      for(const p of players.values())if(p.connected)send({kind:'heroSaved',hero:record.heroes[p.heroId]},p._coopId);
    }).catch(e=>{saveError=e.message;output({type:'runtimeStatus',paused:'Save failed'});event('message',{message:'Save failed: '+e.message});throw e;});
  }
  function snapshot(p,full=false,batch=null){
    const w=worldOf(p);if(!w||!p.connected||(w._busy||w._campaignBusy))return;
    if(full){inFlight.delete(p._coopId);baselines.delete(p._coopId);}
    const pending=inFlight.get(p._coopId)||[];if(pending.length>=4)return;
    const start=performance.now(),previous=baselines.get(p._coopId);
    full=full||!previous||previous.worldId!==w.worldId||previous.generation!==p.travelGeneration;
    const snap=scope(w,()=>C.snapshot(w,1,++sequence,full,p._coopId,p._viewRadius||24,batch));
    Object.assign(snap,{worldId:w.worldId,generation:p.travelGeneration,partyTime:clock,party:party()});
    snap.campaign.portal=C.encode(p._portal||null,true);
    const payload=full?snap:CoopReplication.diff(previous,snap);
    send(payload,p._coopId);baselines.set(p._coopId,snap);pending.push(snap.seq);inFlight.set(p._coopId,pending);
    metrics.snapshots++;metrics.snapshotMs+=performance.now()-start;sample('snapshotSamples',performance.now()-start);metrics.bytes+=JSON.stringify(payload).length;
  }
  async function start(args){
    hostId=args.hostId;campaign=args.campaign||{id:P.randomId(),ownerHeroId:args.hero.id,name:args.hero.name+"'s Act I",seed:args.seed??crypto.getRandomValues(new Uint32Array(1))[0],heroes:{},areas:{},quests:{},flags:{},shrines:['frosthaven']};
    if(campaign.ownerHeroId!==args.hero.id)fail('Select the hero that owns this campaign.');
    if(campaign.schemaVersion>2)fail('This campaign needs a newer game version.');
    campaign.schemaVersion=2;campaign.areas||={};campaign.heroes||={};campaign.quests||={};campaign.flags||={};campaign.shrines||=['frosthaven'];
    if(!Object.keys(campaign.quests).length)campaign.quests.q7={state:'active',count:0};
    campaign.shrines=campaign.shrines.filter(z=>P.ZONES.includes(z));
    campaign.flags.opening={v:2,stage:'complete',rescued:true,defeated:[]};delete campaign.quests.q1;
    // Prepare the six deterministic worlds before live play, so later arrivals never
    // block occupied worlds on map generation. Empty worlds still do not simulate.
    const preview=C.restoreHero(campaign.heroes[args.hero.id]||args.hero);
    for(const zone of P.ZONES)getWorld(zone,preview);
    await admit(hostId,args.hero,args.view);active=true;return true;
  }
  async function admit(id,record,view){
    if(transactionActive)await economyChain;
    if(players.has(id)){snapshot(players.get(id),true);return;}
    if(players.size>=P.MAX_PLAYERS)fail('Party is full.');
    if([...players.values()].some(p=>p.heroId===record.id))fail('That hero is already in this party.');
    const p=C.restoreHero(campaign.heroes[record.id]||record);p._coopId=id;p.connected=true;p.travelGeneration=1;p.worldId='frosthaven';p._viewRadius=viewRadius(view);
    const w=getWorld('frosthaven',p);players.set(id,p);activateWorld(w);w.players.push(p);w.player=w.players.find(h=>h._coopId===hostId)||w.players[0];
    scope(w,()=>{Game.coop.resetActor(p,Game.coop.arrival(w.map.spawns.default));C.register(w);Game.coop.enterWorld();});
    for(const qid of campaign.pendingRewards?.[p.heroId]||[])scope(w,()=>Game.coop.rewardQuest(DATA.QUESTS.find(q=>q.id===qid),p));
    if(campaign.pendingRewards)delete campaign.pendingRewards[p.heroId];
    try{await checkpoint();snapshot(p,true);send({kind:'joined'},id);}
    catch(e){players.delete(id);w.players=w.players.filter(h=>h!==p);throw e;}
  }
  function viewRadius(v){return Math.max(18,Math.min(80,(Number(v?.width)||844)/128+(Number(v?.height)||390)/64+8));}
  function combat(p){const w=worldOf(p);return !p||p.dead||!p.connected||clock<(p.combatUntil||0)||(p._coopHurt||0)!==(p._lastCombatHurt||0)||w._cinematic||w.monsters.some(m=>!m.dead&&(m.encounter?.active||m.aggro&&Math.hypot(m.x-p.x,m.y-p.y)<10));}
  function validZone(zone){if(!P.ZONES.includes(zone))fail('This destination is outside Act I.');if(zone==='shattered_temple'&&!campaign.flags.fn_temple_open)fail('Shatter the three beacons and defeat the Oathsworn first.');}
  function arrival(w,p,point,safe=false){return scope(w,()=>{
    const candidates=[];
    for(let r=0;r<=(safe?4:0);r+=.5)for(let i=0;i<(r?16:1);i++)candidates.push({x:point.x+Math.cos(i*Math.PI/8)*r,y:point.y+Math.sin(i*Math.PI/8)*r,surfaceId:point.surfaceId??0});
    for(const q of candidates){
      if(!MapGen.walkable(w.map,q.x,q.y,q.surfaceId)||w.map.hazard[(q.x|0)+(q.y|0)*w.map.w])continue;
      if(w.map.surfaceVersion&&!TerrainSurface.supported(w.map,q.x,q.y,p.radius,q.surfaceId))continue;
      if(w.players.some(h=>h!==p&&!h.dead&&Math.hypot(h.x-q.x,h.y-q.y)<.65))continue;
      return q;
    }
    if(safe)fail('There is no safe footing beside that player.');return Game.coop.arrival(point);
  });}
  function prepareTransfer(p,zone,spawn='default',options={}){
    validZone(zone);if(transfers.has(p._coopId))fail('Travel is already loading.');
    const ticket={id:P.randomId(),playerId:p._coopId,from:p.worldId,generation:p.travelGeneration,zone,spawn,options,x:p.x,y:p.y,at:clock};
    transfers.set(p._coopId,ticket);send({kind:'prepareWorld',id:ticket.id,zone},p._coopId);return true;
  }
  function requestTravel(zone,spawn='default',options={},p=Game.state.player){
    validZone(zone);const w=worldOf(p);if(p.dead)fail('Return to Frosthaven to revive.');
    if(w.monsters.some(m=>m.encounter?.active))fail('Finish the boss encounter before travelling.');
    const exit=w.map.exits.find(e=>e.target===zone&&CoopCommands.nearby(p,{x:U.clamp(p.x,e.x0,e.x1),y:U.clamp(p.y,e.y0,e.y1),surfaceId:e.surfaceId||0},3));
    if(options.via==='shrine'){
      if(!campaign.shrines.includes(zone)||!w.map.props.some(o=>['shrine','caravan'].includes(o.interact)&&CoopCommands.nearby(p,o,3)))fail('Use a nearby waystone to travel.');
    }else if(!exit)fail('Move closer to the exit.');
    return prepareTransfer(p,zone,exit?.spawnKey||spawn,{via:options.via==='shrine'?'shrine':'exit'});
  }
  function teleport(p,targetId){
    const target=players.get(targetId);if(!target||target===p)fail('Choose a connected teammate.');
    if(combat(p)||combat(target))fail('Both players must be outside combat for five seconds.');
    if(clock<(p.teleportUntil||0))fail('Teleport is still cooling down.');
    if(channels.has(p._coopId)||transfers.has(p._coopId))fail('Travel is already in progress.');
    validZone(target.worldId);p.command=p.path=null;
    channels.set(p._coopId,{targetId,zone:target.worldId,generation:target.travelGeneration,x:p.x,y:p.y,at:clock});
    send({kind:'teleportChannel',seconds:3},p._coopId);return true;
  }
  function cancelTransfer(id,message){transfers.delete(id);channels.delete(id);send({kind:'travelCancel',message},id);}
  async function finishTransfer(id,m){
    const ticket=transfers.get(id),p=players.get(id);if(!ticket||ticket.id!==m.id)return;
    if(!m.ok){cancelTransfer(id,'Destination could not load. You stayed in your area.');return;}
    if(!p?.connected||p.travelGeneration!==ticket.generation){cancelTransfer(id,'Travel was cancelled.');return;}
    const from=worldOf(p),target=players.get(ticket.options.targetId);
    try{
      if(from._busy||from._campaignBusy)fail('A party change is saving. Try again.');
      if(!ticket.options.revive&&p.dead)fail('You have fallen. Return to Frosthaven.');
      if(!ticket.options.revive&&(from._cinematic||from.monsters.some(m=>!m.dead&&m.encounter?.active)))fail('Finish the encounter before travelling.');
      if(ticket.options.via==='exit'&&!from.map.exits.some(e=>e.target===ticket.zone&&CoopCommands.nearby(p,{x:U.clamp(p.x,e.x0,e.x1),y:U.clamp(p.y,e.y0,e.y1),surfaceId:e.surfaceId||0},3)))fail('Move closer to the exit.');
      if(ticket.options.via==='shrine'&&(!campaign.shrines.includes(ticket.zone)||!from.map.props.some(o=>['shrine','caravan'].includes(o.interact)&&CoopCommands.nearby(p,o,3))))fail('Use a nearby waystone to travel.');
      if(ticket.options.via==='portal'&&(!p._portal||p.worldId!=='frosthaven'&&p._portal.mapId!==p.worldId||!CoopCommands.nearby(p,p.worldId==='frosthaven'?from.map.spawns.portal:p._portal,3)))fail('Move closer to your portal.');
      validZone(ticket.zone);
      if(ticket.options.targetId&&(Math.hypot(p.x-ticket.x,p.y-ticket.y)>.05||combat(p)||combat(target)||target.worldId!==ticket.zone||target.travelGeneration!==ticket.options.targetGeneration))fail('Your teammate moved or entered combat.');
      const to=getWorld(ticket.zone,p);if(to._busy||to._campaignBusy||to._cinematic)fail('The destination is busy. Try again.');
      const point=ticket.options.position|| (target?{x:target.x+1,y:target.y,surfaceId:target.surfaceId}:to.map.spawns[ticket.spawn]||to.map.spawns.default);
      const pos=arrival(to,p,point,!!target),minions=from.minions.filter(mi=>mi.owner===p&&!mi.dead);
      activateWorld(to);rebaseTimers(p,to.time-from.time);for(const mi of minions)rebaseTimers(mi,to.time-from.time);
      scope(from,()=>{Game.coop.resetActor(p,{x:p.x,y:p.y,surfaceId:p.surfaceId});});
      from.players=from.players.filter(h=>h!==p);from.minions=from.minions.filter(mi=>mi.owner!==p);
      for(const key of ['projectiles','traps','fx'])from[key]=from[key].filter(o=>o.owner!==p&&o.visualOwner!==p);
      p.worldId=to.worldId;p.travelGeneration++;p.coopInputSeq=sequences.get(id)||0;
      scope(to,()=>{
        Game.coop.resetActor(p,pos);to.players.push(p);to.player=to.players.find(h=>h._coopId===hostId)||to.players[0];
        for(const mi of minions){Game.coop.resetActor(mi,pos);to.minions.push(mi);}
        if(ticket.options.revive){p.dead=false;p.hp=p.stats.maxHp;p.mana=p.stats.maxMana;}
        Game.coop.enterWorld();
      });
      if(from.players.length)from.player=from.players.find(h=>h._coopId===hostId)||from.players[0];
      if(target)p.teleportUntil=clock+10;transfers.delete(id);baselines.delete(id);snapshot(p,true);
      checkpoint().catch(()=>{});
    }catch(e){cancelTransfer(id,e.message);}
  }
  function rebaseTimers(actor,offset){
    // Area clocks stop when empty; transfer deadlines with their remaining duration.
    for(const key of Object.keys(actor))if((/Until$/.test(key)||['frozen','feared'].includes(key))&&!['combatUntil','teleportUntil'].includes(key)&&Number.isFinite(actor[key])&&actor[key]>0)actor[key]+=offset;
    for(const b of actor.buffs||[])if(Number.isFinite(b.until))b.until+=offset;
    for(const key of Object.keys(actor.skillCd||{}))actor.skillCd[key]+=offset;
    for(const key of ['boneWard','retalCold','coat','form','poisonDot','bleedDot','scorch','rabies'])if(Number.isFinite(actor[key]?.until))actor[key].until+=offset;
  }
  function openPortal(p){if(p.worldId==='frosthaven')fail('You are already home.');p._portal={mapId:p.worldId,x:p.x,y:p.y+.4,surfaceId:p.surfaceId,home:'frosthaven',returnPosition:{x:p.x,y:p.y,surfaceId:p.surfaceId}};return true;}
  function backup(w){
    const contextKey=k=>['combatWorld','combatMap','world','map','originWorld','originMap'].includes(k);
    const persistentKey=k=>!contextKey(k)&&(!k.startsWith('_')||['_coopId','_portal','_skillEpoch','_veilEpoch'].includes(k));
    const actors=[...C.groups.flatMap(k=>w[k]),...w.map.props],memo=new Map(actors.map(o=>[o,o]));
    const copy=v=>{if(!v||typeof v!=='object')return v;if(memo.has(v))return memo.get(v);if(ArrayBuffer.isView(v))return v.slice();if(v instanceof Set)return new Set(v);if(v instanceof Map)return new Map(v);if(v instanceof WeakMap||v instanceof WeakSet)return v;const o=Array.isArray(v)?[]:Object.create(Object.getPrototypeOf(v));memo.set(v,o);for(const k of Object.keys(v))if(contextKey(k))o[k]=v[k];else if(persistentKey(k))o[k]=copy(v[k]);return o;};
    const records=actors.map(o=>[o,Object.fromEntries(Object.entries(o).filter(([k])=>persistentKey(k)).map(([k,v])=>[k,copy(v)]))]);
    const arrays=Object.fromEntries(C.groups.map(k=>[k,w[k].slice()])),stock=copy(w.vendorStock),terrain=Object.fromEntries(['blocked','walls','hazard'].map(k=>[k,w.map[k].slice()])),terrainEdits=w.map._coopTerrain,upper=w.map.layers?.[1],upperTerrain=upper&&Object.fromEntries(['blocked','walls','hazard'].filter(k=>upper[k]).map(k=>[k,upper[k].slice()])),delayed=w._delayed?.slice(),cinematic=w._cinematic,visuals=w._visuals.slice();
    return ()=>{for(const [o,row]of records){for(const key of Object.keys(o))if(persistentKey(key)&&!(key in row))delete o[key];Object.assign(o,row);}Object.assign(w,arrays);Object.assign(w.map,terrain);if(upperTerrain)Object.assign(upper,upperTerrain);w.map._coopTerrain=terrainEdits;w.vendorStock=stock;if(w._delayed)w._delayed.splice(0,w._delayed.length,...(delayed||[]));w._cinematic=cinematic;w._visuals.splice(0,w._visuals.length,...visuals);};
  }
  function acknowledge(id,seq,ok,message){
    const payload={kind:'ack',seq,ok,...(message?{message}:{})},history=acknowledgments.get(id)||new Map();
    history.set(seq,payload);if(history.size>128)history.delete(history.keys().next().value);acknowledgments.set(id,history);send(payload,id);
  }
  function bindCampaign(view){
    Object.assign(campaign,view);for(const w of worlds.values())for(const key of ['quests','flags','shrines'])w[key]=campaign[key];
  }
  // Merge only staged progression changes. Concurrent kills, discovery and combat
  // on the committed campaign remain intact during asynchronous persistence.
  function mergeCampaignChange(before,after,current){
    if(JSON.stringify(before)===JSON.stringify(after))return current;
    if(typeof before==='number'&&typeof after==='number'&&typeof current==='number')return current+after-before;
    if(Array.isArray(after)){
      const key=v=>JSON.stringify(v),old=Array.isArray(before)?before:[],nextKeys=new Set(after.map(key)),oldKeys=new Set(old.map(key));
      const result=(Array.isArray(current)?current:[]).filter(v=>!oldKeys.has(key(v))||nextKeys.has(key(v))),seen=new Set(result.map(key));
      for(const value of after)if(!seen.has(key(value))){result.push(structuredClone(value));seen.add(key(value));}return result;
    }
    if(after&&typeof after==='object'){
      const result=current&&typeof current==='object'?current:{};
      for(const key of new Set([...Object.keys(before||{}),...Object.keys(after)])){
        if(!(key in after)){if(JSON.stringify(result[key])===JSON.stringify(before?.[key]))delete result[key];}
        else result[key]=mergeCampaignChange(before?.[key],after[key],result[key]);
      }return result;
    }
    return after;
  }
  function command(id,m,internalCommand=false){
    const p=players.get(id),w=worldOf(p);if(!p||!p.connected||!Number.isSafeInteger(m.seq)||m.seq<1)return;
    if(m.worldId!==p.worldId||m.generation!==p.travelGeneration){if(!internalCommand)acknowledge(id,m.seq,false,'This command is no longer current.');return;}
    if(!internalCommand&&m.seq<=(sequences.get(id)||0)){const ack=acknowledgments.get(id)?.get(m.seq);if(ack)send(ack,id);return;}
    if(!internalCommand)sequences.set(id,m.seq);const c=m.command;
    if(!c||typeof c.type!=='string')return;
    if(['move','steer','attack','cast','jump'].includes(c.type)&&(channels.has(id)||transfers.get(id)?.options.targetId))cancelTransfer(id,'Teleport interrupted.');
    if(['attack','cast'].includes(c.type))p.combatUntil=clock+5;
    w._pending=(w._pending||0)+1;metrics.maxPendingCommands=Math.max(metrics.maxPendingCommands,w._pending);if(w._pending>128){w._pending--;if(!internalCommand)acknowledge(id,m.seq,false,'Too many pending commands.');return;}
    w._queue=w._queue.catch(()=>{}).then(async()=>{
      w._pending--;let restore=null,commandEvents=[];
      if(!p.connected||p.worldId!==m.worldId||p.travelGeneration!==m.generation){if(!internalCommand)acknowledge(id,m.seq,false,'Your area changed.');return;}
      const economic=CoopCommands.economic.has(c.type);let unlock=null,shared=null,detached=false,worldBackups=[],grants=[];
      if(economic){const previous=economyChain;economyChain=new Promise(resolve=>unlock=resolve);await previous;transactionActive=true;}
      const campaignChange=['acceptQuest','completeQuest','interact'].includes(c.type);
      if(campaignChange){
        const original=Object.fromEntries(['quests','flags','shrines','heroes','pendingRewards'].map(key=>[key,campaign[key]||{}]));
        shared={original,before:structuredClone(original),staged:structuredClone(original)};bindCampaign(shared.staged);
        for(const area of worlds.values())if(c.type==='completeQuest'&&area!==w&&area.players.length)worldBackups.push([area,backup(area)]);
      }
      w._busy=true;
      try{
        if(hidden||offline||saveError||w._cinematic)fail('The party is paused.');
        if(!p.connected||p.worldId!==m.worldId||p.travelGeneration!==m.generation)fail('Your area or connection changed.');
        if(economic)restore=backup(w);
        committing=economic;stagingRewards=campaignChange?grants:null;
        let operation;
        scope(w,()=>{
          if(c.type==='teleportToPlayer')operation=teleport(p,c.targetId);
          else if(c.type==='respawn'){if(!p.dead)fail('You are already alive.');operation=prepareTransfer(p,'frosthaven','default',{revive:true});}
          else if(c.type==='usePortal'){
            const portal=p._portal;if(!portal)fail('Open a town portal first.');
            const home=p.worldId==='frosthaven',near=home?w.map.spawns.portal:portal;
            if(!near||!home&&portal.mapId!==p.worldId||!CoopCommands.nearby(p,near,3))fail('Move closer to your portal.');
            operation=prepareTransfer(p,home?portal.mapId:'frosthaven',home?'default':'portal',{via:'portal',position:home?portal.returnPosition:undefined});
          }else operation=CoopCommands.execute(p,c);
        });
        commandEvents=stagedEvents;stagedEvents=[];committing=false;stagingRewards=null;await operation;if(!internalCommand)p.coopInputSeq=m.seq;
        if(economic){
          p.coopRevision=(p.coopRevision||0)+1;
          if(shared){
            const captureAt=performance.now(),record=savedRecord();sample('saveCaptureSamples',performance.now()-captureAt);
            // Rewards in other areas are previewed only for the durable record.
            // Restore them before yielding, then apply the exact grants on success.
            for(const [area,restoreWorld]of worldBackups)scope(area,restoreWorld);
            bindCampaign(shared.original);detached=true;
            await checkpoint(true,record);
            for(const key of ['quests','flags','shrines','pendingRewards'])campaign[key]=mergeCampaignChange(shared.before[key],shared.staged[key],campaign[key]);
            bindCampaign(Object.fromEntries(['quests','flags','shrines'].map(key=>[key,campaign[key]])));
            for(const grant of grants){const recipient=players.get(grant.id);if(recipient&&grant.worldId!==w.worldId)scope(worldOf(recipient),()=>{Game.coop.rewardQuest(grant.quest,recipient,grant.reward);recipient.coopRevision=(recipient.coopRevision||0)+1;});}
            for(const area of worlds.values())scope(area,()=>Game.coop.syncWorld(c.type==='acceptQuest'&&c.questId==='q8b'));
          }else await checkpoint(true);
        }
        for(const e of commandEvents)event(e.type,e.detail,e.to);
        if(!internalCommand)acknowledge(id,m.seq,true);
      }catch(e){if(restore)scope(w,restore);
        if(shared&&!detached){for(const [area,restoreWorld]of worldBackups)scope(area,restoreWorld);bindCampaign(shared.original);}
        if(!internalCommand){p.coopInputSeq=m.seq;acknowledge(id,m.seq,false,e.message);}}
      finally{stagedEvents=[];stagingRewards=null;committing=false;w._busy=false;if(unlock){transactionActive=false;unlock();}}
    });return w._queue;
  }
  function tick(dt){
    if(!active||hidden||offline||saveError)return;clock+=dt;publish+=dt;saveClock+=dt;
    const start=performance.now();
    for(const w of worlds.values())if(w.players.length&&!w._busy&&!w._campaignBusy&&!w._cinematic)scope(w,()=>{
      const health=new Map(w.players.map(p=>[p,p.hp]));scale(w);Game.coop.update(dt);scale(w);
      for(const p of w.players){if(p.hp<health.get(p)||(p._coopHurt||0)!==(p._lastCombatHurt||0))p.combatUntil=clock+5;p._lastCombatHurt=p._coopHurt||0;
        const r=p.reviveTarget,t=r&&players.get(r.id);if(!r)continue;
        if(p.dead||t?.worldId!==p.worldId||!t.dead||!CoopCommands.nearby(p,t,2)||Math.hypot(p.x-r.x,p.y-r.y)>.05||p.hp<health.get(p)||(p._coopHurt||0)!==r.hurt){p.reviveTarget=null;continue;}
        r.t+=dt;if(r.t>=3){t.dead=false;t.hp=t.stats.maxHp*.35;t.action=null;p.reviveTarget=null;}
      }
    });
    for(const [id,ch]of channels){const p=players.get(id),t=players.get(ch.targetId);
      if(combat(p)||combat(t)||Math.hypot(p.x-ch.x,p.y-ch.y)>.05||t.worldId!==ch.zone||t.travelGeneration!==ch.generation){cancelTransfer(id,'Teleport interrupted.');continue;}
      if(clock-ch.at>=3){channels.delete(id);try{prepareTransfer(p,t.worldId,'default',{targetId:t._coopId,targetGeneration:t.travelGeneration});}catch(e){cancelTransfer(id,e.message);}}
    }
    for(const [id,t]of transfers)if(clock-t.at>45)cancelTransfer(id,'Destination loading timed out.');
    for(const w of worlds.values())if(w._cinematic)finishCinematic(w);
    metrics.ticks++;metrics.simulationMs+=performance.now()-start;sample('simulationSamples',performance.now()-start);
    if(publish>=1/15){publish=0;publication++;for(const p of players.values()){const id=p._coopId,full=resyncRequested.has(id)&&clock-(resyncAt.get(id)??-Infinity)>=1;if(full){resyncRequested.delete(id);resyncAt.set(id,clock);}snapshot(p,full,publication);}for(const w of worlds.values())if(w._visuals.length&&!w._busy){for(const p of w.players)if(p.connected)send({kind:'visuals',worldId:w.worldId,effects:w._visuals},p._coopId);w._visuals=[];}}
    if(saveClock>=5&&!savePending){saveClock=0;savePending=true;checkpoint().catch(()=>{}).finally(()=>savePending=false);}
  }
  async function receive(from,m){
    if(m.kind==='hero'){try{await admit(from,m.hero,m.view);}catch(e){output({type:'reject',playerId:from,reason:e.message});}}
    else if(m.kind==='command'){if(m.command)delete m.command.committed;return command(from,m);}
    else if(m.kind==='resync'){const p=players.get(from);if(p){if(clock-(resyncAt.get(from)??-Infinity)<1)resyncRequested.add(from);else{resyncAt.set(from,clock);snapshot(p,true);}}}
    else if(m.kind==='view'){const p=players.get(from);if(p)p._viewRadius=viewRadius(m);}
    else if(m.kind==='snapshotAck'){const pending=inFlight.get(from);if(pending?.includes(m.seq))inFlight.set(from,pending.filter(n=>n>m.seq));}
    else if(m.kind==='worldReady')return finishTransfer(from,m);
    else if(m.kind==='cinematicDone'){const w=worldOf(players.get(from));if(w?._cinematic?.id===m.id){w._cinematic.pending.delete(from);finishCinematic(w);}}
  }
  function roster(members){for(const p of players.values()){p.connected=!!members.find(m=>m.id===p._coopId)?.connected;if(!p.connected){p.command=p.path=p.drawing=null;cancelTransfer(p._coopId,'Connection lost.');}}}
  function cinematic(src,done){
    const w=Game.state;if(!w||w._cinematic)return;
    const id=P.randomId(),pending=new Set(w.players.filter(p=>p.connected).map(p=>p._coopId));
    w._cinematic={id,pending,done,at:clock};for(const to of pending)event('cinematic',{src,id,worldId:w.worldId},to);finishCinematic(w);
  }
  function finishCinematic(w){
    const c=w._cinematic;if(!c||w._busy||w._campaignBusy)return;for(const id of c.pending)if(!players.get(id)?.connected)c.pending.delete(id);
    if(c.pending.size&&clock-c.at<45)return;w._cinematic=null;scope(w,()=>c.done?.());
  }
  async function depart(id){if(transactionActive)await economyChain;const p=players.get(id);if(!p)return;campaign.heroes[p.heroId]=scope(worldOf(p),()=>C.hero(p));const w=worldOf(p);w.players=w.players.filter(h=>h!==p);w.minions=w.minions.filter(h=>h.owner!==p);if(w.players.length)w.player=w.players[0];players.delete(id);acknowledgments.delete(id);sequences.delete(id);resyncAt.delete(id);resyncRequested.delete(id);baselines.delete(id);inFlight.delete(id);transfers.delete(id);channels.delete(id);await checkpoint();}
  function died(p){if(p.dead)return;p.dead=true;p.hp=0;p.deaths++;p.gold-=Math.floor(p.gold*.1);p.command=p.path=null;p.clearSkillState({respec:false});p.computeStats();p.startAction('death',.8);for(const mi of worldOf(p).minions)if(mi.owner===p)mi.die({silent:true});event('message',{message:p.name+' has fallen. Revive them or return to Frosthaven.'});}
  function trackParticipants(){for(const q of Object.values(campaign.quests))if(['active','reward'].includes(q.state))q.coopParticipants=[...new Set([...(q.coopParticipants||[]),...[...players.values()].map(p=>p.heroId)])];}
  function rewardParticipants(q){trackParticipants();const record=campaign.quests[q.id];record.coopRewarded||=[];for(const id of record.coopParticipants||[]){if(record.coopRewarded.includes(id))continue;const p=[...players.values()].find(p=>p.heroId===id);if(p)scope(worldOf(p),()=>{const reward=Game.coop.planReward(q,p);if(stagingRewards)stagingRewards.push({id:p._coopId,worldId:p.worldId,quest:q,reward});Game.coop.rewardQuest(q,p,reward);p.coopRevision=(p.coopRevision||0)+1;});else{campaign.pendingRewards||={};(campaign.pendingRewards[id]||=[]).push(q.id);}record.coopRewarded.push(id);}}
  const internal=(o,p,type,committed=false)=>{
    C.register(Game.state);const id=p._coopId,key=id+':'+o._coopId+':'+type;if(queuedActions.has(key))return;
    queuedActions.add(key);return Promise.resolve(command(id,{seq:(sequences.get(id)||0)+1,worldId:p.worldId,generation:p.travelGeneration,command:{type,targetId:o._coopId,committed}},true)).finally(()=>queuedActions.delete(key));
  };
  return {start,receive,roster,depart,tick,checkpoint,metrics,party,worlds,players,event,visual,died,trackParticipants,rewardParticipants,requestTravel,openPortal,
    get active(){return active;},get host(){return true;},get hostId(){return hostId;},get authority(){return true;},get committing(){return committing;},get loading(){return false;},
    setStatus(s){hidden=!!s.hidden;offline=!!s.offline;},async retrySave(){await checkpoint();},
    async stop(){await checkpoint();active=false;},save(){saveClock=5;},markCritical(){saveClock=5;},register(){C.register(Game.state);},
    monsterDied(mon){const a=campaign.areas[Game.state.worldId]||={};a.dead=[...new Set([...(a.dead||[]),mon._coopId])];saveClock=5;},
    enqueuePickup:(o,p)=>internal(o,p,'pickup'),enqueueInteraction:(o,p)=>internal(o,p,'interact'),finishInteraction:(o,p)=>internal(o,p,'interact',true),
    openInteraction(o,p){if(o.survivor||o.storyId)return false;if(o.isNpc||o.def&&DATA.NPCS[o.id]||['storage','forge','board','caravan','shrine'].includes(o.interact)){if(o.interact==='shrine'&&!campaign.shrines.includes(p.worldId))campaign.shrines.push(p.worldId);event('panel',{id:o._coopId},p._coopId);return true;}return false;},
    cinematic,notify:message=>event('message',{message})};
})();
