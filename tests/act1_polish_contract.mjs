import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const context=vm.createContext({console,Math,performance,Uint8Array,Int32Array,Uint8ClampedArray,
 document:{createElement:()=>({getContext:()=>({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){}})})}});
for(const n of ['utils','data','data_overrides','boss_encounters','sprite_manifest','mapgen','navigation'])
 vm.runInContext(fs.readFileSync('js/'+n+'.js','utf8'),context);
const {MapGen:M,DATA}=vm.runInContext('({MapGen,DATA})',context);
const zones=['frosthaven_approach','frosthaven','north_wild','mines','shattered_temple','shardpeak_shrine','deepfreeze_cavern'];
const originalDark=Object.fromEntries(Object.entries(DATA.ZONES).map(([id,z])=>[id,z.dark]));
let checks=0;const ok=(value,message)=>{checks++;assert.ok(value,message);};
for(const seed of [0,1,123,12345,4294967295])for(const zone of zones){
 const m=M.generate(zone,seed),env=m.act1Environment,tag=zone+'/'+seed;
 const solid=(x,y)=>x<0||y<0||x>=m.w||y>=m.h||!!m.walls[(x|0)+(y|0)*m.w];
 ok(env.revision===2,tag+' missing new environment');
 ok(m.zone.dark<=.48,tag+' floor unreadable');
 for(const p of env.natural){
  ok(solid(p.x,p.y),tag+' scenery base occupies a walking tile');
  ok(DATA.SPRITE_MANIFEST.maps.props['a1polish_'+p.part],tag+' missing nature asset');
  ok(p.scale>=.65&&p.scale<=1.5,tag+' inappropriate scenery scale');
 }
 for(const p of env.dressing.filter(p=>p.part!=='inner'))ok(solid(p.x,p.y),tag+' sconce occupies a walking tile');
 for(const f of env.facades)for(let t=.5;t<f.length;t++)ok(solid(f.x+(f.axis?0:t),f.y+(f.axis?t:0)),tag+' facade crosses walking space');
 if(['north_wild','frosthaven_approach','frosthaven'].includes(zone))ok(new Set(env.natural.map(p=>p.part)).size>=4,tag+' repetitive forest silhouettes');
 if(['mines','shattered_temple','deepfreeze_cavern'].includes(zone))ok(env.dressing.some(p=>p.part!=='inner'),tag+' missing dungeon light sources');
}
for(const [id,z] of Object.entries(DATA.ZONES))ok(z.dark===originalDark[id],'shared zone lighting mutated: '+id);
const report={status:'PASS',checks,zones,seeds:5,scope:'Scenery and facade bases preserve walking space; assets exist; regional lighting stays local.'};
fs.writeFileSync('tests/qa/act1_polish/contract.json',JSON.stringify(report,null,2)+'\n');console.log(report);
