import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const seeds=[0,1,123,12345,4294967295,...Array.from({length:25},(_,i)=>Math.imul(i+37,2654435761)>>>0)];
const zones=['hellgate','ash_wastes','cinder_bastion','throne'];
function fixture(prefix='../',omit=false){
 const ctx=vm.createContext({console,Math,performance,Uint8Array,Uint32Array,Int32Array,Uint8ClampedArray,document:{createElement:()=>({getContext:()=>({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){}})})}});
 for(const n of ['utils','data','data_overrides','boss_encounters','sprite_manifest','mapgen','navigation']){
  let text=fs.readFileSync(new URL(prefix+'js/'+n+'.js',import.meta.url),'utf8');
  if(omit&&n==='mapgen')text=text.replace('act5Environment(act1Environment(generateImperial(zoneId,seed),seed),seed)','act1Environment(generateImperial(zoneId,seed),seed)');
  vm.runInContext(text,ctx);
 }
 return vm.runInContext('({M:MapGen,S:TerrainSurface,N:TerrainNavigation,D:DATA})',ctx);
}
const now=fixture(),before=fixture('../tmp/act5_environment/before/');
const hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
let checks=0,endpoints=0;const ok=(v,msg)=>{checks++;assert.ok(v,msg);};
for(const zone of zones)for(const seed of seeds){
 const m=now.M.generate(zone,seed),b=before.M.generate(zone,seed),label=zone+'/'+seed;
 ok(hash(m.act5Environment)===hash(now.M.generate(zone,seed).act5Environment),label+' nondeterministic modules');
 ok(hash(m.composition.routes)===hash(b.composition.routes),label+' routes changed');
 ok(hash(m.monsterSpawns)===hash(b.monsterSpawns),label+' seeded enemy roster or placement changed');
 ok(hash(m.composition.encounters)===hash(b.composition.encounters),label+' encounter budget changed');
 ok(hash(m.exits.map(e=>[e.target,e.spawnKey]))===hash(b.exits.map(e=>[e.target,e.spawnKey])),label+' travel graph changed');
 if(zone==='hellgate')for(const key of ['npcs','settlement','shrine'])ok(hash(m[key])===hash(b[key]),label+' changed camp services '+key);
 for(const t of m.thresholds){
  endpoints++;ok(m.exits.some(e=>e.thresholdId===t.id),label+' orphan opening');
  for(const p of [t.opening,t.approach,t.arrival]){
   ok(now.S.supported(m,p.x,p.y,.36),label+' unsupported passage');
   ok(!m.hazard[(p.x|0)+(p.y|0)*m.w],label+' damaging passage');
   ok(now.N.findPath(m,m.spawns.default,p,{radius:.36}),label+' unreachable passage');
  }
  ok(now.N.segment(m,t.arrival.x,t.arrival.y,t.opening.x,t.opening.y,.36),label+' blocked aperture');
  ok(!m.exits.some(e=>t.arrival.x>=e.x0&&t.arrival.x<=e.x1&&t.arrival.y>=e.y0&&t.arrival.y<=e.y1),label+' arrival retriggers travel');
  for(const a of t.footprints)for(let y=a.y0;y<a.y1;y++)for(let x=a.x0;x<a.x1;x++)ok(m.blocked[x+y*m.w],label+' hollow jamb');
 }
 for(const s of m.act5Environment.segments){
  ok(s.length>0&&s.length<=(s.kit==='biome'?4:6),label+' invalid module span');
  if(zone==='ash_wastes')ok(s.kit==='biome'||s.role==='threshold',label+' outdoor wall used away from a destination gateway');
  ok(now.D.SPRITE_MANIFEST.maps.props['a5env_'+s.kit+'_east'],label+' missing boundary art');
 }
 for(let y=0;y<m.h;y++)for(let x=0;x<m.w;x++)if(m.walls[x+y*m.w]){
  const expected=zone==='ash_wastes'&&y>=65||zone==='cinder_bastion'&&y>=58?2:0;
  ok(m.elev[x+y*m.w]===expected,label+' artificial boundary slab');
 }
}
const isolated=fixture('../',true);
for(const zone of ['frosthaven','north_wild','mines','marshcamp','weeping_marsh','drowned_crypt','khalcamp','desert_wastes','cathedral1'])
 ok(hash(now.M.generate(zone,12345))===hash(isolated.M.generate(zone,12345)),'Act V changes leak into '+zone);
const report={status:'PASS',checks,seeds:seeds.length,zones,endpoints};
fs.writeFileSync('tests/qa/act5_environment/contract.json',JSON.stringify(report,null,2)+'\n');console.log(report);
