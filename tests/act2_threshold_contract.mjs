import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const zones=['weeping_marsh','drowned_crypt','hollow_reeds','spawn_pools','ritual_site','marshcamp'];
const seeds=[0,1,123,12345,4294967295,...Array.from({length:25},(_,i)=>Math.imul(i+37,2654435761)>>>0)];
const sourceSnapshot=new Map();
function fixture(prefix='../',disableAct2=false){
 const ctx=vm.createContext({console,Math,performance,Uint8Array,Int32Array,Uint8ClampedArray,document:{createElement:()=>({getContext:()=>({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){}})})}});
 for(const n of ['utils','data','data_overrides','boss_encounters','sprite_manifest','mapgen','navigation']){
  const path=new URL(prefix+'js/'+n+'.js',import.meta.url).href;
  if(!sourceSnapshot.has(path))sourceSnapshot.set(path,fs.readFileSync(new URL(path),'utf8'));
  let source=sourceSnapshot.get(path);
  if(disableAct2&&n==='mapgen'){
   const baseline=fs.readFileSync(new URL('../tmp/act2_thresholds/before/js/mapgen.js',import.meta.url),'utf8');
   const start='  function genAct2(',end='  /* Act III: composed imperial ruins.';
   source=source.slice(0,source.indexOf(start))+baseline.slice(baseline.indexOf(start),baseline.indexOf(end))+source.slice(source.indexOf(end));
   source=source.replace('act2Causeway(m);act2Boundaries(m,seed);','act2Boundaries(m,seed);');
  }
  vm.runInContext(source,ctx);
 }
 return vm.runInContext('({M:MapGen,S:TerrainSurface,N:TerrainNavigation})',ctx);
}
const now=fixture(),before=fixture('../tmp/act2_thresholds/before/');
const hash=m=>crypto.createHash('sha256').update(JSON.stringify(m)??'undefined').digest('hex');
let checks=0,endpoints=0;const ok=(a,msg)=>{checks++;assert.ok(a,msg);};
for(const zone of (process.argv.includes('--isolation')?[]:zones))for(const seed of (process.argv.includes('--smoke')?[12345]:seeds)){
 const m=now.M.generate(zone,seed),b=before.M.generate(zone,seed),label=zone+'/'+seed;
 ok(m.w===b.w&&m.h===b.h,label+' dimensions');
 ok(hash(m.exits.map(e=>[e.target,e.spawnKey,e.label]))===hash(b.exits.map(e=>[e.target,e.spawnKey,e.label])),label+' travel graph');
 ok(hash(m.thresholds)===hash(now.M.generate(zone,seed).thresholds),label+' determinism');
 for(const t of m.thresholds||[]){
  endpoints++;const ex=m.exits.find(e=>e.thresholdId===t.id);ok(ex,label+' unlinked threshold');
  for(const p of [t.opening,t.approach,t.arrival]){
   ok(now.S.supported(m,p.x,p.y,.36),label+' unsupported '+t.id+' '+JSON.stringify(p));
   ok(!m.hazard[Math.floor(p.x)+Math.floor(p.y)*m.w],label+' damaging entrance');
   ok(now.N.findPath(m,m.spawns.default,p,{radius:.36,speed:4.5}),label+' unreachable '+t.id);
  }
  ok(now.N.segment(m,t.approach.x,t.approach.y,t.opening.x,t.opening.y,.36),label+' aperture blocked');
  for(const a of t.footprints)for(let y=a.y0;y<a.y1;y++)for(let x=Math.ceil(a.x0-.5);x+.5<a.x1;x++)ok(m.blocked[x+y*m.w],label+' unblocked support');
 }
 if(m.act2){
  ok(m.monsterSpawns.length===b.monsterSpawns.length,label+' encounter budget');
  ok(hash(m.act2.routes)===hash(b.act2.routes),label+' routes');
  ok(hash(m.act2.anchors)===hash(b.act2.anchors),label+' quests');
  for(const ro of m.act2.routes)for(let i=1;i<ro.points.length;i++)ok(now.N.segment(m,ro.points[i-1].x,ro.points[i-1].y,ro.points[i].x,ro.points[i].y,.36),label+' blocked route');
  for(const a of m.act2.reserved.filter(a=>a.kind==='arena'||a.kind==='combat'))for(let y=Math.ceil(a.y0);y<a.y1;y++)for(let x=Math.ceil(a.x0);x<a.x1;x++)ok(!m.blocked[x+y*m.w],label+' protected court');
  for(let i=0;i<m.act2.water.length;i++)if(m.act2.water[i])ok(!m.hazard[i],label+' scenic water damage');
 }else for(const key of ['npcs','settlement','shrine'])ok(hash(m[key])===hash(b[key]),label+' changed services '+key);
}
const isolated=fixture('../',true);
for(const zone of ['frosthaven','north_wild','mines','khalcamp','desert_wastes','sand_tombs','cathedral1','ash_wastes']){
 const a=now.M.generate(zone,12345),b=isolated.M.generate(zone,12345);
 const different=Object.keys(a).filter(k=>hash(a[k])!==hash(b[k]));
 ok(different.length===0,'other-act change '+zone+' '+different.join(','));
}
const report={status:'PASS',checks,seedCount:process.argv.includes('--smoke')?1:seeds.length,endpoints,isolation:'Current shared-workspace other-act code with only Act 2 threshold generation disabled'};
fs.writeFileSync(new URL('qa/act2_thresholds/contract.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(report);
