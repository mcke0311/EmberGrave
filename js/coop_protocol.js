/* Shared, dependency-free wire contract. Also loaded by the Node relay. */
(function(root){
  'use strict';
  const VERSION=2, BUILD='embergrave-coop-3', MAX_PLAYERS=4;
  const ZONES=['frosthaven','north_wild','mines','shattered_temple','shardpeak_shrine','deepfreeze_cavern'];
  const MAX_FRAME=64*1024, MAX_TRANSFER=8*1024*1024, CHUNK=12000;
  const safeId=v=>typeof v==='string'&&/^[a-zA-Z0-9_-]{1,80}$/.test(v);
  // getRandomValues also works on HTTP LAN origins, unlike randomUUID.
  const randomId=()=>Array.from(root.crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('');
  const envelope=(type,data={})=>({v:VERSION,build:BUILD,type,...data});
  function parse(raw){
    if(typeof raw!=='string'||raw.length>MAX_FRAME)throw Error('Message too large');
    const m=JSON.parse(raw);
    if(!m||Array.isArray(m)||m.v!==VERSION||m.build!==BUILD)throw Error('Incompatible game version. Reload the game.');
    if(typeof m.type!=='string')throw Error('Invalid message');
    return m;
  }
  function frames(payload,id){
    const data=JSON.stringify(payload);
    if(data.length>MAX_TRANSFER)throw Error('World exceeds synchronization limit');
    if(data.length<CHUNK)return [payload];
    const count=Math.ceil(data.length/CHUNK);
    return Array.from({length:count},(_,index)=>({kind:'chunk',id,index,count,data:data.slice(index*CHUNK,(index+1)*CHUNK)}));
  }
  class Assembler{
    constructor(){this.pending=new Map();}
    accept(m,now=Date.now()){
      for(const [k,v] of this.pending)if(now-v.at>15000)this.pending.delete(k);
      if(m?.kind!=='chunk')return m;
      if(!safeId(m.id)||!Number.isInteger(m.count)||m.count<1||m.count>Math.ceil(MAX_TRANSFER/CHUNK)||!Number.isInteger(m.index)||m.index<0||m.index>=m.count||typeof m.data!=='string'||m.data.length>CHUNK)throw Error('Invalid snapshot chunk');
      let p=this.pending.get(m.id);
      if(!p){if(this.pending.size>=4)throw Error('Too many snapshot transfers');this.pending.set(m.id,p={at:now,parts:new Array(m.count),size:0});}
      if(p.parts.length!==m.count)throw Error('Conflicting snapshot chunks');
      if(p.parts[m.index]===undefined){p.parts[m.index]=m.data;p.size+=m.data.length;}
      if(p.size>MAX_TRANSFER)throw Error('Snapshot too large');
      if(p.parts.filter(x=>x!==undefined).length!==m.count)return null;
      this.pending.delete(m.id);return JSON.parse(p.parts.join(''));
    }
  }
  const api={VERSION,BUILD,MAX_PLAYERS,ZONES,MAX_FRAME,MAX_TRANSFER,CHUNK,safeId,randomId,envelope,parse,frames,Assembler};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CoopProtocol=api;
})(typeof globalThis!=='undefined'?globalThis:this);
