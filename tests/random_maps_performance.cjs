'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
// Run separately from other suites. Alternate the order of each paired sample.
function fixture(prefix=''){
 const c=vm.createContext({console,Math,performance,COOP_WORKER:true});
 for(const name of ['utils','data','data_overrides','boss_encounters','sprite_manifest','prop_interactions','mapgen','navigation'])vm.runInContext(fs.readFileSync(prefix+'js/'+name+'.js','utf8'),c);
 return vm.runInContext('({M:MapGen,D:DATA})',c);
}
if(!fs.existsSync('tmp/random_maps/before/js/mapgen.js'))throw Error('Capture the pre-change js directory in tmp/random_maps/before/js before benchmarking.');
const current=fixture(),before=fixture('tmp/random_maps/before/'),rows=[];
const zones=Object.values(current.D.ZONES).filter(z=>!z.arena&&!z.opening&&!['town','camp'].includes(z.kind)).map(z=>z.id);
const summary=a=>{a.sort((x,y)=>x-y);return{medianMs:+a[Math.floor(a.length*.5)].toFixed(2),p95Ms:+a[Math.floor(a.length*.95)].toFixed(2)};};
for(const zone of zones){
 for(const api of [before,current])for(const seed of [17,29])api.M.generate(zone,seed);
 const samples={before:[],current:[]};let fallbacks=0,attempts=0;
 for(let i=0;i<12;i++)for(const version of i%2?['current','before']:['before','current']){
  const api=version==='current'?current:before,start=performance.now(),m=api.M.generate(zone,Math.imul(i+37,2654435761)>>>0);samples[version].push(performance.now()-start);
  assert.ok(m.w>0&&m.monsterSpawns.length);if(version==='current'){attempts+=m.layoutAttempts;fallbacks+=m.layoutFallback;}
 }
 const row={zone,before:summary(samples.before),current:summary(samples.current),meanAttempts:attempts/12,fallbacks};rows.push(row);console.log(zone+' '+row.before.medianMs+' → '+row.current.medianMs+' ms');
}
fs.mkdirSync('tmp/random_maps',{recursive:true});fs.writeFileSync('tmp/random_maps/performance.json',JSON.stringify({status:'PASS',samplesPerArea:12,workerGeneration:true,rows},null,2)+'\n');
