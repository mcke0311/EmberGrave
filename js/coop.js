/* Player-hosted sessions. The relay transports requests; only this host simulates. */
const Coop=(()=>{
  const P=CoopProtocol,C=CoopCodec;
  let active=false,host=false,ws=null,room='',localId='',hostId='',resumeToken='',heroRecord=null,campaign=null;
  let epoch=0,seq=0,inputSeq=0,loading=false,authority=false,committing=false,busy=false,paused='',stopped=false;
  let accumulator=0,publish=0,saveClock=0,lastHost=0,lastSnapshot=null,received=null,roster=[],outbox=[],pending=new Map(),lastCommands=new Map();
  let retry=null,pingTimer=null,serial=Promise.resolve(),incoming=Promise.resolve(),heartbeatAt=0,reconnectAt=0,travel=null,critical=false,admission=null;
  const queued=new Set();let commandCount=0;
  let localSaveError=null;
  const assemblers=new Map(),events=[],visuals=[],areas={},accepted=new Map();
  const s=()=>Game.state;
  function resumeInfo(){try{return JSON.parse(sessionStorage.getItem('embergrave-coop-connection')||'null');}catch{return null;}}
  function rememberConnection(){try{sessionStorage.setItem('embergrave-coop-connection',JSON.stringify({room,token:resumeToken,heroId:heroRecord.id,relay:window.COOP_CONFIG.relayUrl,host}));}catch{}}
  const ui=()=>typeof CoopUI!=='undefined'?CoopUI:null;
  const notify=message=>{ui()?.status(message);if(s()){Game.msg(message,'#d8b880');if(UI.anyOpen())UI.managementStatus(message);}};
  function wire(type,data){if(ws?.readyState!==WebSocket.OPEN)return false;if(ws.bufferedAmount>1024*1024)return false;ws.send(JSON.stringify(P.envelope(type,data)));return true;}
  function data(payload,to){
    const frames=P.frames(payload,'t_'+(++seq));
    if(outbox.length+frames.length>400){outbox=[];lastSnapshot=null;notify('Connection is slow; resynchronizing.');return false;}
    for(const payload of frames)outbox.push({payload,to});flush();return true;
  }
  function flush(){while(outbox.length&&ws?.readyState===WebSocket.OPEN&&ws.bufferedAmount<256*1024){const m=outbox.shift();wire('data',m);}}
  function event(type,detail={},to){const e={kind:'event',type,epoch,...detail};if(committing){events.push({e,to});return;}deliverEvent(e,to);}
  function deliverEvent(e,to){if(!to||to===localId)receiveEvent(e);if(host)data(e,to);}
  function visual(effect,detail){if(host&&active&&visuals.length<256)visuals.push({effect,...detail});}
  function receiveEvent(e){
    if(e.type==='message')notify(e.message);
    else if(e.type==='panel'){const o=s()?.npcs.find(n=>n._coopId===e.id)||s()?.map.props.find(p=>p._coopId===e.id);if(o)Game.coop.openInteraction(o);}
    else if(e.type==='complete')UI.centerMsg('ACT I COMPLETE',e.message);
    else if(e.type==='visual')Game.coop.visual(e);
    else if(e.type==='cinematic')ui()?.cinematic(e);
  }
  function openSocket(mode,code){
    return new Promise((resolve,reject)=>{
      const url=String(window.COOP_CONFIG.relayUrl||'').trim();
      if(!url){reject(Error('Online multiplayer is not connected yet. The website owner needs to activate the multiplayer server.'));return;}
      let endpoint;try{endpoint=new URL(url);}catch{reject(Error('Enter a valid multiplayer server address in Connection settings.'));return;}
      if(!['ws:','wss:'].includes(endpoint.protocol)){reject(Error('The multiplayer server address must begin with ws:// or wss://.'));return;}
      if(location.protocol==='https:'&&endpoint.protocol!=='wss:'){reject(Error('This website needs a secure multiplayer server address beginning with wss://.'));return;}
      const socket=new WebSocket(url);ws=socket;let welcomed=false;
      const configured=Number(window.COOP_CONFIG.connectTimeoutMs);
      const waitMs=mode==='resume'?10000:Number.isFinite(configured)?Math.max(10000,Math.min(120000,configured)):90000;
      const timeout=setTimeout(()=>{if(!welcomed){reject(Error('The multiplayer server did not respond. It may be waking up; try again shortly.'));socket.close();}},waitMs);
      socket.onopen=()=>{if(socket===ws)wire(mode==='host'?'create':mode==='resume'?'resume':'join',mode==='resume'?{room,token:resumeToken}:{room:code});};
      socket.onmessage=async({data:raw})=>{
        if(socket!==ws)return;
        try{
          const m=P.parse(raw);
          if(m.type==='welcome'){
            welcomed=true;clearTimeout(timeout);room=m.room;localId=m.playerId;hostId=m.hostId;resumeToken=m.token;host=localId===hostId;lastHost=performance.now();reconnectAt=0;
            rememberConnection();
            if(mode==='resume'){
              paused='';lastSnapshot=null;outbox=[];
              for(const resolve of pending.values())resolve(false);pending.clear();
              if(host){wire('roomState',{open:s()?.map.id==='frosthaven'});sendSnapshot(true);}
              else data({kind:'resync'});
            }
            resolve(m);ui()?.refresh();
          }else if(m.type==='error'){
            if(!welcomed){clearTimeout(timeout);reject(Error(m.message));socket.close();}else notify(m.message);
          }else if(m.type==='roster'){
            const previousRoster=roster;roster=m.members;
            if(s())for(const p of s().players||[]){const peer=roster.find(r=>r.id===p._coopId);p.connected=!!peer?.connected;if(!p.connected){p.command=null;p.path=null;p.drawing=null;}}
            if(host&&travel&&!travel.cinematic&&s().players.some(p=>!p.connected))cancelTravel('A player disconnected. Travel cancelled.');
            if(host&&travel?.cinematic)finishCinematic();
            if(host&&!loading){wireAdmission();for(const peer of roster)if(peer.connected&&!previousRoster.find(r=>r.id===peer.id)?.connected&&peer.id!==localId&&accepted.has(peer.id))sendSnapshot(true,peer.id);}
            if(!roster.find(r=>r.id===hostId)?.connected)paused='Waiting for the host to reconnect…';
            ui()?.refresh();
          }else if(m.type==='departed'){
            if(host&&s()){const p=s().players.find(p=>p._coopId===m.playerId);if(p)campaign.heroes[p.heroId]=C.hero(p);s().players=s().players.filter(p=>p._coopId!==m.playerId);s().minions=s().minions.filter(p=>p.owner?._coopId!==m.playerId);lastCommands.delete(m.playerId);critical=true;}
            ui()?.refresh();
          }else if(m.type==='data'){
            if(!assemblers.has(m.from))assemblers.set(m.from,new P.Assembler());
            const payload=assemblers.get(m.from).accept(m.payload);if(payload){incoming=incoming.then(()=>onData(m.from,payload)).catch(e=>{console.error('Co-op message failed',e);notify('Co-op: '+e.message);});await incoming;}
          }else if(m.type==='ended'){incoming=incoming.then(async()=>{notify(m.reason);await leave(false);});await incoming;}
        }catch(e){console.error('Co-op message failed',e);notify('Co-op: '+e.message);}
      };
      socket.onerror=()=>{if(socket===ws&&!welcomed){clearTimeout(timeout);reject(Error('Cannot reach the multiplayer server. Try again shortly, or check Connection settings.'));}};
      socket.onclose=()=>{
        clearTimeout(timeout);if(socket!==ws)return;
        if(!welcomed){reject(Error('The multiplayer server closed the connection before the party was ready. Try again shortly.'));return;}
        if(stopped||!active)return;
        paused='Reconnecting…';if(!reconnectAt)reconnectAt=Date.now();ui()?.refresh();
        retry=setTimeout(async()=>{if(Date.now()-reconnectAt>=60000){notify('Reconnection timed out. Your last checkpoint is available.');leave(false);return;}try{await openSocket('resume');}catch(e){notify(e.message);}},1500);
      };
    });
  }
  async function newHero(name,classId){
    const p=Game.coop.makeHero(name,classId);p.heroId=P.randomId();
    const h=C.hero(p);await CoopStore.commit(null,[h]);return h;
  }
  async function connect(mode,heroId,code,campaignId){
    if(active)throw Error('Leave the current session first.');
    heroRecord=await CoopStore.read('heroes',heroId);if(!heroRecord)throw Error('Choose a co-op hero.');
    stopped=false;active=true;loading=true;host=mode==='host';paused='Preparing the party…';epoch=1;inputSeq=0;admission=null;lastSnapshot=received=null;accepted.clear();lastCommands.clear();Object.keys(areas).forEach(k=>delete areas[k]);
    try{
      const remembered=resumeInfo(),canResume=mode==='join'&&remembered&&!remembered.host&&remembered.room===code&&remembered.heroId===heroId&&remembered.relay===window.COOP_CONFIG.relayUrl;
      if(canResume){room=remembered.room;resumeToken=remembered.token;await openSocket('resume');}else await openSocket(mode,code);
      if(host){
        campaign=campaignId?await CoopStore.read('campaigns',campaignId):null;
        if(campaign&&campaign.ownerHeroId!==heroId)throw Error('Select the hero that owns this campaign.');
        campaign ||= {id:P.randomId(),ownerHeroId:heroId,name:heroRecord.name+"'s Act I",seed:crypto.getRandomValues(new Uint32Array(1))[0],heroes:{},areas:{},quests:null,flags:null,shrines:['frosthaven']};
        Object.assign(areas,campaign.areas||{});
        heroRecord=campaign.heroes[heroRecord.id]||heroRecord;
        const p=C.restoreHero(heroRecord);p._coopId=localId;p.connected=true;
        await Game.coop.start(p,campaign.seed,campaign);restoreArea();await CoopCommands.settle(p);
        accepted.set(localId,p.heroId);roster=roster.map(r=>({...r,ready:false}));
        loading=false;paused='';await checkpoint();wireAdmission();sendSnapshot(true);
      }else{
        data({kind:'hero',hero:heroRecord});
      }
      pingTimer=setInterval(()=>{wire('ping',{at:Date.now()});flush();if(host)wire('data',{payload:{kind:'heartbeat',paused:pauseReason(),epoch}});},1000);
      ui()?.refresh();return room;
    }catch(e){stopped=true;active=false;loading=false;ws?.close();if(s())Game.coop.stop();throw e;}
  }
  function wireAdmission(){if(host){const open=!loading&&!busy&&!travel&&s()?.map?.id==='frosthaven';if(open!==admission){admission=open;wire('roomState',{open});}}}
  async function onData(from,m){
    if(!active||stopped)return;
    if(host){
      if(m.kind==='hero'){
        if(!roster.some(r=>r.id===from&&r.connected))return;
        if(accepted.has(from)){sendSnapshot(true,from);return;}
        if(s()?.map.id!=='frosthaven'||loading||s().players.length>=4){event('message',{message:'Join while the host is in Frosthaven.'},from);return;}
        if(s().players.some(p=>p.heroId===m.hero?.id)){event('message',{message:'That hero is already in this party.'},from);return;}
        serial=serial.then(async()=>{busy=true;
        try{
          if(s()?.map.id!=='frosthaven'||travel)throw Error('Join while the party is in Frosthaven.');
          const p=C.restoreHero(campaign.heroes[m.hero?.id]||m.hero);p._coopId=from;p.connected=true;await Game.coop.prepareHero(p);
          const sp=Game.coop.arrival({x:s().player.x+1,y:s().player.y+1});p.x=sp.x;p.y=sp.y;s().players.push(p);await CoopCommands.settle(p);accepted.set(from,p.heroId);
          await checkpoint();lastSnapshot=null;sendSnapshot(true);
        }catch(e){s().players=s().players.filter(p=>p._coopId!==from);accepted.delete(from);event('message',{message:e.message},from);}finally{busy=false;wireAdmission();}});await serial;
      }else if(m.kind==='command'){
        if(!Number.isSafeInteger(m.seq)||m.seq<1||m.seq<=(lastCommands.get(from)||0)||m.epoch!==epoch)return;
        if(!m.command||typeof m.command.type!=='string')return;delete m.command.committed;
        lastCommands.set(from,m.seq);enqueueCommand(from,m);
      }else if(m.kind==='resync')sendSnapshot(true,from);
      else if(m.kind==='travelAnswer')travelAnswer(from,m);
      else if(m.kind==='cinematicDone'){if(travel?.cinematic&&travel.id===m.id){travel.answers.set(from,true);finishCinematic();}}
    }else if(from===hostId){
      lastHost=performance.now();
      if(m.kind==='heartbeat'){paused=m.paused||'';ui()?.refresh();}
      else if(m.kind==='snapshot'||m.kind==='delta')await acceptSnapshot(m);
      else if(m.kind==='ack'){pending.get(m.seq)?.(m.ok);pending.delete(m.seq);if(!m.ok)notify(m.message);}
      else if(m.kind==='heroSaved'){if(m.hero.id===heroRecord.id){try{await CoopStore.commit(null,[m.hero]);heroRecord=m.hero;localSaveError=null;}catch(e){localSaveError=m.hero;notify('Local hero save failed: '+e.message);}}}
      else if(m.kind==='event'&&(m.epoch===undefined||m.epoch===epoch))receiveEvent(m);
      else if(m.kind==='visuals'&&m.epoch===epoch)for(const e of m.effects||[])Game.coop.visual(e);
      else if(m.kind==='travelOffer'){paused='Party travel';ui()?.travel(m);}
      else if(m.kind==='travelCancel'){paused='';ui()?.closeTravel();notify(m.message);}
      else if(m.kind==='prepareMap'){
        try{await Game.coop.preload(m.zone);data({kind:'travelAnswer',id:m.id,stage:'loaded',ok:true});}
        catch(e){data({kind:'travelAnswer',id:m.id,stage:'loaded',ok:false});notify(e.message);}
      }
    }
  }
  function economicBackup(){
    // Preserve actor identity and callbacks while copying mutable economy/combat data.
    const actors=[...C.groups.flatMap(k=>s()[k]||[]),...s().map.props],memo=new Map(actors.map(o=>[o,o]));
    function copy(v,key=''){
      if(!v||typeof v!=='object'||key.startsWith('_')||['world','map','originWorld','originMap','combatWorld','combatMap'].includes(key))return v;
      if(memo.has(v))return memo.get(v);
      if(ArrayBuffer.isView(v))return v.slice();
      if(v instanceof Set)return new Set(v);
      if(v instanceof Map)return new Map(v);
      const out=Array.isArray(v)?[]:Object.create(Object.getPrototypeOf(v));memo.set(v,out);
      for(const [k,value]of Object.entries(v))out[k]=copy(value,k);return out;
    }
    const records=actors.map(o=>[o,Object.fromEntries(Object.entries(o).map(([k,v])=>[k,copy(v,k)]))]);
    const state=Object.fromEntries([...C.groups,'quests','flags','shrines','vendorStock','portal'].map(k=>[k,copy(s()[k])]));
    return {records,state,terrain:Object.fromEntries(['blocked','walls','hazard'].filter(k=>s().map[k]).map(k=>[k,s().map[k].slice()])),campaign:structuredClone(campaign),areas:structuredClone(areas)};
  }
  function rollback(b){
    for(const [o,record]of b.records){for(const k of Object.keys(o))if(!(k in record))delete o[k];Object.assign(o,record);}
    Object.assign(s(),b.state);Object.assign(s().map,b.terrain);campaign=b.campaign;
    for(const key of Object.keys(areas))delete areas[key];Object.assign(areas,b.areas);
    lastSnapshot=null;Game.coop.refresh();
  }
  function enqueueCommand(from,m){
    if(commandCount>=128){if(m.seq)data({kind:'ack',seq:m.seq,ok:false,message:'Too many pending commands.'},from);return Promise.resolve();}
    commandCount++;
    serial=serial.then(async()=>{
      commandCount--;
      if(!active||!host||m.epoch!==epoch){
        if(from===localId){pending.get(m.seq)?.(false);pending.delete(m.seq);}
        else if(active&&host&&m.seq)data({kind:'ack',seq:m.seq,ok:false,message:'The party has changed areas. Try again.'},from);
        return;
      }
      const p=s().players.find(p=>p._coopId===from);if(!p)return;
      let backup=null;
      busy=true;authority=true;committing=CoopCommands.economic.has(m.command?.type);
      try{
        if(pauseReason(true)&&!['stop','returnManagement','cancelCarry'].includes(m.command?.type))throw Error('The party is paused.');
        if(committing)backup=economicBackup();
        await CoopCommands.execute(p,m.command);if(committing)p.computeStats();p.coopInputSeq=m.seq||p.coopInputSeq||0;
        if(committing){p.coopRevision=(p.coopRevision||0)+1;await checkpoint();}
        for(const {e,to} of events.splice(0))deliverEvent(e,to);
        if(committing){lastSnapshot=null;sendSnapshot(true);}
        if(from===localId){pending.get(m.seq)?.(true);pending.delete(m.seq);}else if(m.seq)data({kind:'ack',seq:m.seq,ok:true},from);
      }catch(e){
        events.length=0;visuals.length=0;
        if(backup)rollback(backup);
        if(e.coopSaveFailure){paused='Save failed';sendSnapshot(true);}
        if(from===localId){notify(e.message);pending.get(m.seq)?.(false);pending.delete(m.seq);}else data({kind:'ack',seq:m.seq,ok:false,message:e.message},from);
      }finally{authority=false;committing=false;busy=false;ui()?.refresh();}
    }).catch(e=>notify(e.message));return serial;
  }
  function submit(command){
    if(!active||loading||paused&&!host&&!['stop','returnManagement','cancelCarry'].includes(command.type))return Promise.resolve(false);
    if(pending.size>200)return Promise.resolve(false);
    const n=++inputSeq,m={kind:'command',seq:n,epoch,command};
    const promise=new Promise(resolve=>pending.set(n,resolve));
    if(host){lastCommands.set(localId,n);enqueueCommand(localId,m);}else data(m);
    return promise;
  }
  async function runLocal(command){
    C.register(s());const backup=CoopCommands.economic.has(command.type)?economicBackup():null;
    try{const result=await CoopCommands.execute(s().player,command);if(backup)Game.saveGame();return result===false?false:true;}
    catch(e){if(backup)rollback(backup);Game.msg(e.message,'#d8b880');return false;}
  }
  function captureArea(){
    if(!s()?.map)return;
    C.register(s());
    areas[s().map.id]={props:s().map.props.map(p=>C.encode(p,true)),terrain:C.encode(Object.fromEntries(['blocked','walls','hazard'].filter(k=>s().map[k]).map(k=>[k,s().map[k]]))),dead:[...new Set([...(areas[s().map.id]?.dead||[]),...s().monsters.filter(m=>m.dead).map(m=>m._coopId)])],
      monsters:s().monsters.filter(m=>!m.bossOwner).map(m=>({id:m._coopId,defId:m.defId,x:m.x,y:m.y,dead:m.dead,hp:m.hp,maxHp:m.maxHp,elite:m.elite,beacon:m.beacon,questTag:m.questTag})),
      ground:s().ground.map(g=>({...C.encode(g,true),item:g.item?{...Game.serializeItem(g.item),netId:g.item._coopId}:null})),partySize:s().map._coopSize||s().players.length};
  }
  function restoreArea(){
    const old=areas[s().map.id];
    if(old){
      if(old.terrain)Object.assign(s().map,C.decode(old.terrain,new Map()));
      for(let i=0;i<s().map.props.length;i++){const row=old.props[i];if(row)Object.assign(s().map.props[i],C.decode(row,new Map()));}
      for(const mon of s().monsters){
        const saved=old.monsters?.find(m=>m.id===mon._coopId);
        if(old.dead?.includes(mon._coopId)){mon.dead=true;mon.hp=0;mon.corpseT=0;}
        else if(saved&&!mon.isBoss){mon.maxHp=saved.maxHp;if(!mon._coopScaled)mon.hp=mon.maxHp;mon._coopScaled=true;}
      }
      s().ground=old.ground.map(g=>({...C.decode(g,new Map()),item:g.item?Object.assign(Game.reviveItem(g.item),{_coopId:g.item.netId}):null}));
    }
    if(!s().map._coopSize){
      s().map._coopSize=old?.partySize||s().players.length;const mul=1+.6*(s().map._coopSize-1);
      for(const m of s().monsters)if(!m._coopScaled){m.maxHp*=mul;m.hp*=mul;m._coopScaled=true;if(m.encounter)m.encounter.coopHp=m.maxHp;}
    }
    C.register(s());
  }
  async function checkpoint(){
    if(!active||!host||!s()?.map||loading)return;
    captureArea();
    const heroes=s().players.map(C.hero);
    for(const h of heroes)campaign.heroes[h.id]=h;
    Object.assign(campaign,{areas,quests:structuredClone(s().quests),flags:structuredClone(s().flags),shrines:[...s().shrines],savedAt:Date.now(),completed:!!s().flags.coopComplete});
    // One transaction commits campaign ownership and the host's own hero.
    try{await CoopStore.commit(structuredClone(campaign),heroes.filter(h=>h.id===heroRecord.id));}
    catch(e){e.coopSaveFailure=true;throw e;}
    heroRecord=heroes.find(h=>h.id===heroRecord.id)||heroRecord;
    for(const p of s().players)if(p._coopId!==localId)data({kind:'heroSaved',hero:campaign.heroes[p.heroId]},p._coopId);
    critical=false;saveClock=0;
  }
  function save(){if(!active||!host||loading)return;critical=true;}
  async function retrySave(){
    if(!host){if(localSaveError)try{await CoopStore.commit(null,[localSaveError]);heroRecord=localSaveError;localSaveError=null;}catch(e){notify('Local hero save failed: '+e.message);}ui()?.refresh();return;}
    busy=true;try{await serial;await checkpoint();paused='';lastSnapshot=null;sendSnapshot(true);}catch(e){paused='Save failed';notify('Save failed: '+e.message);}finally{busy=false;ui()?.refresh();}
  }
  function delta(before,after){
    const changes={kind:'delta',epoch:after.epoch,zone:after.zone,seq:after.seq,base:before.seq,time:after.time,groups:{}};
    for(const key of C.groups){
      const prev=new Map(before.groups[key].map(r=>[r._coopId,r])),rows=[];
      for(const row of after.groups[key]){const old=prev.get(row._coopId),fields={_coopId:row._coopId};
        for(const [k,v]of Object.entries(row))if(!old||(old[k]!==v&&(v===null||typeof v!=='object'||JSON.stringify(old[k])!==JSON.stringify(v))))fields[k]=v;
        if(old)for(const k of Object.keys(old))if(!(k in row))fields[k]=null;
        if(Object.keys(fields).length>1)rows.push(fields);prev.delete(row._coopId);
      }changes.groups[key]={rows,removed:[...prev.keys()]};
    }
    for(const key of ['props','campaign','vendorStock'])if(JSON.stringify(before[key])!==JSON.stringify(after[key]))changes[key]=after[key];
    return changes;
  }
  function sendSnapshot(full=false,to){
    if(!host||!s()?.map||loading)return;
    if(to&&busy){serial.then(()=>sendSnapshot(true));return;}
    if(lastSnapshot&&(lastSnapshot.epoch!==epoch||lastSnapshot.zone!==s().map.id))full=true;
    // A full resync establishes one common baseline for every recipient.
    if(to){full=true;to=undefined;}
    const snap=C.snapshot(s(),epoch,++seq,full||!lastSnapshot);
    // A reloaded guest resumes after every request already seen by this host.
    for(const row of snap.groups.players)row.coopInputSeq=Math.max(row.coopInputSeq||0,lastCommands.get(row._coopId)||0);
    const payload=!full&&!to&&lastSnapshot?delta(lastSnapshot,snap):snap;
    const sent=data(payload,to);
    // A targeted full sync must not advance the broadcast delta baseline.
    if(!to)lastSnapshot=sent?snap:null;
    if(visuals.length)data({kind:'visuals',epoch,effects:visuals.splice(0)});
  }
  async function acceptSnapshot(m){
    let changedMap=false;
    if(m.epoch<epoch||received&&m.epoch===epoch&&m.seq<=received.seq)return;
    if(m.kind==='delta'){
      if(!received||received.seq!==m.base||received.epoch!==m.epoch||received.zone!==m.zone){data({kind:'resync'});return;}
      const next=structuredClone(received);next.seq=m.seq;next.time=m.time;next.full=false;delete next.terrain;
      for(const key of C.groups){const rows=new Map(next.groups[key].map(r=>[r._coopId,r]));for(const id of m.groups[key].removed)rows.delete(id);for(const r of m.groups[key].rows)rows.set(r._coopId,{...rows.get(r._coopId),...r});next.groups[key]=[...rows.values()];}
      for(const key of ['props','campaign','vendorStock'])if(m[key])next[key]=m[key];m=next;
    }
    if(!s()?.map||s().map.id!==m.zone||epoch!==m.epoch){
      loading=true;changedMap=true;
      for(const resolve of pending.values())resolve(false);pending.clear();
      const p=C.restoreHero(heroRecord);p._coopId=localId;
      await Game.coop.start(p,m.seed,null,m.zone);epoch=m.epoch;
    }
    received=m;C.apply(s(),m,localId);inputSeq=Math.max(inputSeq,s().player.coopInputSeq||0);loading=false;
    if(!paused||paused==='Preparing the party…'||paused==='Party travel'||paused==='Reconnecting…')paused='';
    for(const p of s().players)Game.coop.prepareHero(p).catch(e=>notify(e.message));
    Game.coop.refresh();if(changedMap)ui()?.closeTravel();ui()?.refresh();
  }
  function pauseReason(ignoreBusy=false){
    if(loading)return 'Loading the party…';
    if(travel)return travel.cinematic?'Party cinematic':'Waiting for party travel';
    if(document.hidden&&host)return 'The host has switched tabs. Waiting…';
    if(ws?.readyState!==WebSocket.OPEN)return 'Reconnecting…';
    if(!host&&performance.now()-lastHost>3500)return 'Waiting for the host…';
    if(!ignoreBusy&&busy)return 'Saving party changes…';
    return paused==='Save failed'?paused:host?'':paused;
  }
  function frame(dt){
    if(!active||!s()?.map)return;
    flush();ui()?.tick();
    if(!host){
      if(!pauseReason())Game.coop.presentation(dt);return;
    }
    if(pauseReason()){accumulator=0;CoopMotion.capture(s());return;}
    accumulator=Math.min(accumulator+dt,.15);
    authority=true;
    try{
      while(accumulator>=1/30){
        CoopMotion.capture(s());
        scaleEnemies();Game.coop.update(1/30);scaleEnemies();reviveTick(1/30);accumulator-=1/30;publish+=1/30;saveClock+=1/30;
        if(critical)break;
      }
    }finally{authority=false;}
    Game.coop.hostPresentation(dt,accumulator*30);
    if(critical||saveClock>=5){
      busy=true;serial=serial.then(()=>checkpoint()).then(()=>{lastSnapshot=null;sendSnapshot(true);}).catch(e=>{paused='Save failed';notify('Save failed: '+e.message);}).finally(()=>busy=false);
    }else if(publish>=1/15){publish=0;sendSnapshot();}
  }
  function scaleEnemies(){const mul=1+.6*((s().map._coopSize||1)-1);for(const m of s().monsters)if(!m._coopScaled){m.hp*=mul;m.maxHp*=mul;m._coopScaled=true;}}
  function reviveTick(dt){
    for(const p of s().players){
      const r=p.reviveTarget;if(!r)continue;const t=s().players.find(t=>t._coopId===r.id);
      if(p.dead||!t?.dead||!CoopCommands.nearby(p,t,2)||U.dist(p.x,p.y,r.x,r.y)>.05||(p._coopHurt||0)!==r.hurt){p.reviveTarget=null;continue;}
      r.t+=dt;if(r.t>=3){t.dead=false;t.hp=t.stats.maxHp*.35;t.action=null;p.reviveTarget=null;critical=true;}
    }
    if(s().players.length&&s().players.every(p=>p.dead)&&!travel&&!loading){
      for(const p of s().players){p.dead=false;p.hp=p.stats.maxHp;p.mana=p.stats.maxMana;p.action=null;}
      requestTravel('frosthaven','default',{},true);
    }
  }
  function died(p){
    if(!host||p.dead)return;
    p.dead=true;p.hp=0;p.deaths++;p.gold-=Math.floor(p.gold*.1);p.command=null;p.path=null;p.clearSkillState({respec:false});p.computeStats();p.startAction('death',.8);
    for(const m of s().minions)if(m.owner===p)m.die({silent:true});p.reviveTarget=null;critical=true;
    event('message',{message:p.name+' has fallen. A teammate can revive them.'});
    enqueueCommand(p._coopId,{seq:0,epoch,command:{type:'returnManagement'}});
  }
  async function requestTravel(zone,spawn='default',options={},wipe=false){
    if(!host){notify('The host controls party travel.');return false;}
    if(busy&&!authority)await serial;
    if(!P.ZONES.includes(zone)){notify('This destination is outside the Act I co-op beta.');return false;}
    if(zone==='shattered_temple'&&!s().flags.fn_temple_open){notify('Shatter the three beacons and defeat the Oathsworn first.');return false;}
    if(travel||loading||busy&&!authority||!wipe&&s().players.some(p=>p.connected===false))return false;
    if(s().monsters.some(m=>m.encounter?.active)&&!wipe){notify('Finish the boss encounter before travelling.');return false;}
    const id=P.randomId();travel={id,zone,spawn,options,stage:'vote',answers:new Map(),wipe,at:Date.now()};paused='Party travel';wireAdmission();
    const offer={kind:'travelOffer',id,zone};data(offer);ui()?.travel(offer);
    setTimeout(()=>{if(travel?.id===id)cancelTravel('Travel timed out.');},45000);
    if(wipe){for(const p of s().players)if(p.connected!==false)travel.answers.set(p._coopId,true);await beginPreload();}
    return true;
  }
  function answerTravel(ok){if(!travel&&!host){data({kind:'travelAnswer',id:ui()?.travelId,stage:'vote',ok});return;}if(host)travelAnswer(localId,{id:travel.id,stage:'vote',ok});}
  function cancelTravel(message){travel=null;paused='';data({kind:'travelCancel',message});ui()?.closeTravel();notify(message);wireAdmission();}
  function travelAnswer(from,m){
    if(!travel||travel.id!==m.id||travel.stage!==m.stage)return;
    if(!m.ok){cancelTravel('Party travel cancelled.');return;}travel.answers.set(from,true);
    if(s().players.filter(p=>p.connected!==false).every(p=>travel.answers.get(p._coopId))){if(travel.stage==='vote')beginPreload();else finishTravel();}
  }
  async function beginPreload(){
    if(!travel)return;travel.stage='loaded';travel.answers.clear();data({kind:'prepareMap',id:travel.id,zone:travel.zone});
    try{await Game.coop.preload(travel.zone);if(travel)travelAnswer(localId,{id:travel.id,stage:'loaded',ok:true});}catch(e){cancelTravel('Destination could not load: '+e.message);}
  }
  async function finishTravel(){
    if(!travel)return;const t=travel;loading=true;
    try{
      await checkpointBeforeTravel();
      const players=s().players;
      if(!await Game.enterMap(t.zone,t.spawn,{...t.options,recoverable:true}))throw Error('Destination could not load');
      for(let i=0;i<players.length;i++){
        const p=players[i],sp=Game.coop.arrival({x:s().player.x+(i%2)*.9,y:s().player.y+Math.floor(i/2)*.9});
        p.x=sp.x;p.y=sp.y;p.command=null;p.path=null;p.drawing=null;p.action=null;p.clearVeilState();
        for(const key of ['dashing','leaping','spinning','jumping','charging','siphon','reviveTarget'])p[key]=null;
        if(t.zone==='frosthaven'&&p.dead){p.dead=false;p.hp=p.stats.maxHp;p.action=null;}
      }
      s().players=players;for(const mi of s().minions){const p=mi.owner;mi.x=p.x;mi.y=p.y;mi.path=null;}
      restoreArea();epoch++;CoopMotion.capture(s());loading=false;await checkpoint();travel=null;paused='';lastSnapshot=null;sendSnapshot(true);ui()?.closeTravel();wireAdmission();
    }catch(e){loading=false;cancelTravel(e.message);if(e.coopSaveFailure){paused='Save failed';sendSnapshot(true);}}
  }
  async function checkpointBeforeTravel(){loading=false;const backup=economicBackup();try{for(const p of s().players)await CoopCommands.settle(p);await checkpoint();}catch(e){rollback(backup);throw e;}finally{loading=true;}}
  async function leave(explicit=true){
    if(stopped)return;
    if(explicit&&s()?.player&&!loading){const ok=await submit({type:'returnManagement'});if(!ok){notify('Cannot leave safely until held items are saved.');return;}}
    if(explicit&&!host){await incoming;if(localSaveError){await retrySave();if(localSaveError){notify('Cannot leave safely until the local hero save succeeds.');return;}}}
    if(host&&explicit){try{await serial;await checkpoint();}catch(e){notify('Cannot leave safely: '+e.message);return;}}
    stopped=true;active=false;clearInterval(pingTimer);clearTimeout(retry);if(explicit)wire('leave');ws?.close();ws=null;outbox=[];
    try{sessionStorage.removeItem('embergrave-coop-connection');}catch{}
    for(const fn of pending.values())fn(false);pending.clear();travel=null;loading=false;paused='';ui()?.closeTravel();ui()?.close();Game.coop.stop();ui()?.refresh();
  }
  function cinematic(src,done){
    if(!host){done?.();return;}
    travel={id:P.randomId(),cinematic:true,answers:new Map(),done};event('cinematic',{src,id:travel.id});
  }
  function finishCinematic(){if(travel?.cinematic&&s().players.filter(p=>p.connected!==false).every(p=>travel.answers.get(p._coopId))){const done=travel.done;travel=null;done?.();}}
  function cinematicDone(id){if(host&&travel?.cinematic&&travel.id===id){travel.answers.set(localId,true);finishCinematic();}else if(!host)data({kind:'cinematicDone',id});}
  function enqueueAction(o,p,type,committed=false){
    if(!host)return;
    C.register(s());const key=p._coopId+':'+o._coopId+':'+type;
    if(queued.has(key))return;queued.add(key);
    enqueueCommand(p._coopId,{seq:0,epoch,command:{type,targetId:o._coopId,committed}}).finally(()=>queued.delete(key));
  }
  function openInteraction(o,p){
    if(o.survivor||o.storyId)return false;
    if(o.isNpc||o.def&&DATA.NPCS[o.id]||['storage','forge','board','caravan','shrine'].includes(o.interact)){
      if(o.interact==='shrine'&&!s().shrines.includes(s().map.id))s().shrines.push(s().map.id);
      event('panel',{id:o._coopId},p._coopId);return true;
    }return false;
  }
  function trackParticipants(){
    if(!host||!s())return;
    for(const q of Object.values(s().quests))if(['active','reward'].includes(q.state))q.coopParticipants=[...new Set([...(q.coopParticipants||[]),...s().players.map(p=>p.heroId)])];
  }
  function rewardParticipants(q){
    trackParticipants();const record=s().quests[q.id];record.coopRewarded||=[];
    for(const id of record.coopParticipants||[]){
      if(record.coopRewarded.includes(id))continue;
      const live=s().players.find(p=>p.heroId===id),p=live||(campaign.heroes[id]&&C.restoreHero(campaign.heroes[id]));if(!p)continue;
      if(!live){p.x=s().player.x;p.y=s().player.y;}
      Game.coop.rewardQuest(q,p);record.coopRewarded.push(id);campaign.heroes[id]=C.hero(p);
    }
  }
  return {connect,newHero,submit,runLocal,frame,event,visual,save,retrySave,died,checkpoint,requestTravel,answerTravel,leave,cinematic,cinematicDone,trackParticipants,rewardParticipants,resumeInfo,
    enqueuePickup:(g,p)=>enqueueAction(g,p,'pickup'),enqueueInteraction:(o,p)=>enqueueAction(o,p,'interact'),finishInteraction:(o,p)=>enqueueAction(o,p,'interact',true),openInteraction,
    ready:ready=>wire('ready',{ready}),notify,markCritical:()=>critical=true,register:()=>C.register(s()),
    monsterDied(mon){C.id(mon,'monster');const a=areas[s().map.id]||={};a.dead=[...new Set([...(a.dead||[]),mon._coopId])];critical=true;},
    get active(){return active;},get host(){return host;},get authority(){return authority;},get committing(){return committing;},get loading(){return loading;},
    get saveError(){return !!localSaveError;},get renderAlpha(){return Math.min(1,accumulator*30);},
    get paused(){return pauseReason();},get room(){return room;},get localId(){return localId;},get roster(){return roster;},get busy(){return busy;},get epoch(){return epoch;}
  };
})();
