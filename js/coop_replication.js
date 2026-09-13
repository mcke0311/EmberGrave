/* Wire baselines belong to recipients. Canonical records never contain render state. */
const CoopReplication=(()=>{
  const groups=['players','monsters','minions','projectiles','ground','traps','fx','npcs'];
  const shared=['props','campaign','vendorStock','party','terrainEdits'];
  const equal=(a,b)=>a===b||(a!=null&&b!=null&&typeof a==='object'&&typeof b==='object'&&JSON.stringify(a)===JSON.stringify(b));
  const nested=new Set(['action','act1Visual','encounter']);
  const object=v=>v&&typeof v==='object'&&!Array.isArray(v)&&!v.$ref;
  function objectDelta(before,after){
    const patch={};for(const key of Object.keys(after))if(!equal(before[key],after[key]))patch[key]=object(before[key])&&object(after[key])?{$patch:objectDelta(before[key],after[key])}:after[key];
    for(const key of Object.keys(before))if(!(key in after))patch[key]=null;return patch;
  }
  function applyFields(before,fields){
    const row={...before};for(const [key,value]of Object.entries(fields))row[key]=value?.$patch?applyFields(before?.[key],value.$patch):value;return row;
  }
  function diff(before,after){
    const out={kind:'delta',worldId:after.worldId,generation:after.generation,epoch:after.epoch,zone:after.zone,seq:after.seq,base:before.seq,time:after.time,partyTime:after.partyTime,groups:{}};
    for(const key of groups){
      const old=new Map(before.groups[key].map(r=>[r._coopId,r])),rows=[];
      for(const row of after.groups[key]){
        const previous=old.get(row._coopId),fields={_coopId:row._coopId};
        for(const k of Object.keys(row))if(!previous||!equal(previous[k],row[k]))fields[k]=previous&&nested.has(k)&&object(previous[k])&&object(row[k])?{$patch:objectDelta(previous[k],row[k])}:row[k];
        if(previous)for(const k of Object.keys(previous))if(!(k in row))fields[k]=null;
        if(Object.keys(fields).length>1)rows.push(fields);old.delete(row._coopId);
      }
      out.groups[key]={rows,removed:[...old.keys()]};
    }
    for(const key of shared)if(!equal(before[key],after[key]))out[key]=key==='terrainEdits'?objectDelta(before[key]||{},after[key]||{}):after[key];
    return out;
  }
  function merge(base,patch){
    if(!base||base.seq!==patch.base||base.worldId!==patch.worldId||base.generation!==patch.generation||base.epoch!==patch.epoch)return null;
    // Only changed records are replaced; no whole-world structuredClone per packet.
    const next={...base,seq:patch.seq,time:patch.time,partyTime:patch.partyTime,full:false,groups:{...base.groups}};delete next.terrain;
    for(const key of groups){
      const change=patch.groups[key];if(!change)continue;
      if(!change.rows.length&&!change.removed.length)continue;
      const rows=new Map(base.groups[key].map(r=>[r._coopId,r]));
      for(const id of change.removed)rows.delete(id);
      for(const row of change.rows)rows.set(row._coopId,applyFields(rows.get(row._coopId),row));
      next.groups[key]=[...rows.values()];
    }
    for(const key of shared)if(Object.hasOwn(patch,key))next[key]=key==='terrainEdits'?{...base[key],...patch[key]}:patch[key];
    return next;
  }
  return {diff,merge,equal};
})();
