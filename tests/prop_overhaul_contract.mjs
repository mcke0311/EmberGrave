import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const ctx=vm.createContext({console,Math,performance,Uint8Array,Uint16Array,Int32Array,Uint8ClampedArray,
 document:{createElement:()=>({getContext:()=>({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){}})})}});
for(const name of ['utils','data','data_overrides','boss_encounters','sprite_manifest','prop_interactions','mapgen','navigation'])vm.runInContext(fs.readFileSync('js/'+name+'.js','utf8'),ctx);
const {MapGen:M,PropInteractions:P,TerrainSurface:S,TerrainNavigation:N,DATA:D}=vm.runInContext('({MapGen,PropInteractions,TerrainSurface,TerrainNavigation,DATA})',ctx);
let checks=0;const ok=(v,m)=>{checks++;assert.ok(v,m);};
const rows=[];
for(const seed of [0,1,123,12345,4294967295,...Array.from({length:15},(_,i)=>Math.imul(i+37,2654435761)>>>0)]){
 let bodies=0;
 for(const zone of Object.keys(P.BODY_SITES)){
  const map=M.generate(zone,seed),props=map.props.filter(p=>p.searchable),remains=props.filter(p=>p.remainsSite);
  ok(remains.length===P.BODY_SITES[zone].length,zone+' missing frozen bodies');bodies+=remains.length;
  ok(props.filter(p=>p.type==='grave').length<=3,zone+' too many searchable graves');
  const again=M.generate(zone,seed).props.filter(p=>p.searchable);
  ok(JSON.stringify(props)===JSON.stringify(again),zone+' placement changed for same seed');
  const seen=new Set(),start=map.spawns.default,q=[[(start.x|0),(start.y|0)]];
  for(let n=0;n<q.length;n++){const [x,y]=q[n],k=x+y*map.w;if(seen.has(k))continue;seen.add(k);
   for(const [dx,dy] of S.directions){const xx=x+dx,yy=y+dy,i=xx+yy*map.w;if(xx>=0&&yy>=0&&xx<map.w&&yy<map.h&&!seen.has(i)&&!map.blocked[i]&&S.connected(map,x,y,xx,yy))q.push([xx,yy]);}
  }
  for(const p of props){
   ok(seen.has((p.x|0)+(p.y|0)*map.w),zone+' unreachable remains');
   ok(N.clear(map,p.x,p.y,.36),zone+' unsupported remains');
   ok(!p.storyId&&!p.ev&&!p.event,zone+' quest/event was made searchable');
   if(p.remainsSite){ok(!p.blocks&&!p.breakable,zone+' body blocks or can be exploded for loot');ok(!P.nearRamp(map,p.x,p.y),zone+' remains occupy ramp approach');}
  }
  rows.push({seed,zone,graves:props.length-remains.length,bodies:remains.length});
 }
 ok(bodies===8,'not exactly eight frozen remains');
}
for(const a of D.ACTS){for(const zone of a.zones){const map=M.generate(zone,123);
 ok(P.act(map)===a.id,zone+' wrong material set');ok(map.props.filter(p=>p.searchable&&p.type==='grave').length<=3,zone+' grave cap');
 if(['camp','town'].includes(map.zone.kind))ok(!map.props.some(p=>p.searchable),zone+' hub received searchable remains');
}}
const families=['undead','beast','insect','cultist','demon','barbarian'];ok(new Set(families.map(fam=>P.family({type:'grave',ev:{kind:'ambush',fam}}))).size===6,'events share gravestone art');
for(let act=1;act<=5;act++){const e=D.SPRITE_MANIFEST.entries['world.props.act'+act];ok(e?.cols*e?.rows===24,'missing act atlas '+act);ok(fs.existsSync(e.src),'missing packed pixels');}
console.log('PASS '+checks+' placement, material, event identity and asset checks');
fs.writeFileSync('tests/qa/prop_overhaul/placement.json',JSON.stringify({status:'PASS',checks,rows},null,2)+'\n');
