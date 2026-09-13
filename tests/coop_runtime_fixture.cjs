const vm=require('node:vm');
const fs=require('node:fs');
const {webcrypto}=require('node:crypto');
function fixture(){
  const messages=[],saves=[];
  const context=vm.createContext({console,performance,crypto:webcrypto,structuredClone,Uint8Array,Uint16Array,Uint32Array,Float32Array,Float64Array,Uint8ClampedArray,Int32Array,URL,setTimeout,clearTimeout,setInterval:()=>0,postMessage:m=>messages.push(m)});
  context.self=context;
  context.importScripts=(...files)=>{for(const path of files){const file=path.split('?')[0],source=file==='coop_store.js'?'const CoopStore={commit:async(c,h)=>saveRecords(c,h)};':fs.readFileSync('js/'+file,'utf8');vm.runInContext(source,context,{filename:file});}};
  context.saveRecords=(c,h)=>saves.push({campaign:c,heroes:h});
  vm.runInContext(fs.readFileSync('js/coop_worker.js','utf8'),context,{filename:'coop_worker.js'});
  const api=vm.runInContext('({runtime:CoopRuntime,Game,CoopCodec,DATA,Minion})',context);
  const hero=(name,cls='vanguard')=>{const p=api.Game.coop.makeHero(name,cls);p.heroId=name;return api.CoopCodec.hero(p);};
  return {...api,hero,messages,saves,context};
}

module.exports={fixture};
