import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
globalThis.document={createElement:()=>({getContext:()=>({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){}})})};
for(const f of ['utils','data','data_overrides','sprite_manifest','mapgen','navigation'])vm.runInThisContext(fs.readFileSync(new URL('../js/'+f+'.js',import.meta.url),'utf8'));
vm.runInThisContext(fs.readFileSync(new URL('fixtures/navigation_before_performance.js',import.meta.url),'utf8').replace('const TerrainNavigation =','const PreviousNavigation ='));
const {MapGen,before,after}=vm.runInThisContext('({MapGen,before:PreviousNavigation,after:TerrainNavigation})');
const map=MapGen.generate('north_wild',12345);
// Expensive queries recorded from the running map-center movement fixture.
const queries=[
 [88.36703890088715,86.493226891394,95.8,89.68,.2448],
 [100.65716303951544,105.34053531627187,101.5,93.1,.34],
 [101.5,107.20000000000005,108.9,97.54,.34],
 [99.18929833413794,76.51358845183839,109,97.6,.2992],
 [111.70565945220766,98.28090994238704,109.6,97.96,.2788],
 [90.59787327439793,82.67014915497496,113.3,100.18,.2448],
 [100.5,100.02500000000003,113.5,100.3,.34],
 [103.01666666666677,107.5,80.5,80.5,.34],
];
const results=[];
for(const [x,y,tx,ty,radius] of queries){
 const times={before:[],after:[]},paths={};
 for(let run=0;run<5;run++)for(const [name,nav] of run%2?[['after',after],['before',before]]:[['before',before],['after',after]]){
  const t=performance.now();paths[name]=nav.findPath(map,{x,y},{x:tx,y:ty},{radius,hop:false,speed:3.5});times[name].push(performance.now()-t);
 }
 assert.deepEqual(paths.after,paths.before,'optimized route differs from the previous swept search');
 const median=a=>+a.toSorted((a,b)=>a-b)[2].toFixed(2);
 results.push({from:[x,y],to:[tx,ty],radius,found:!!paths.after,beforeMedianMs:median(times.before),afterMedianMs:median(times.after)});
}
const report={method:'Five alternating Node CPU samples per query; seeded real map; exact waypoint equality; excludes rendering.',results};
fs.writeFileSync(new URL('navigation_performance.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
