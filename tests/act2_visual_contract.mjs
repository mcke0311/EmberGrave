import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

// Compare the same current generator with only this visual pass disabled.
// Unrelated work in the shared checkout cannot change the comparison baseline.
function fixture(disabled=false){
 const ctx=vm.createContext({console,Math,performance,Uint8Array,Int32Array,Uint8ClampedArray,document:{createElement:()=>({getContext:()=>({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){}})})}});
 for(const name of ['utils','data','data_overrides','boss_encounters','mapgen','navigation']){
  let source=fs.readFileSync(new URL('../js/'+name+'.js',import.meta.url),'utf8');
  if(disabled&&name==='mapgen')source=source.replace('    act2Visuals(m,seed);','');
  vm.runInContext(source,ctx);
 }
 return vm.runInContext('({M:MapGen,S:TerrainSurface,N:TerrainNavigation})',ctx);
}
const current=fixture(),before=fixture(true),rows=[];
const hash=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const gameplay=m=>({...m,zone:{...m.zone,dark:0},lights:[],act2Visual:null,act2:m.act2?{...m.act2,decals:[]}:null});
const zones=['weeping_marsh','drowned_crypt','hollow_reeds','spawn_pools','ritual_site','marshcamp'];
let checks=0;
const ok=(value,label)=>{checks++;assert.ok(value,label);};
for(const zone of zones)for(const seed of [0,1,123,12345,4294967295]){
 const m=current.M.generate(zone,seed),b=before.M.generate(zone,seed),label=zone+'/'+seed;
 ok(hash(gameplay(m))===hash(gameplay(b)),label+' gameplay changed');
 ok(hash(m.act2Visual)===hash(current.M.generate(zone,seed).act2Visual),label+' visual nondeterminism');
 for(const d of m.act2Visual.dressing){
  ok(Number.isFinite(d.x+d.y+d.scale)&&d.scale>0,label+' invalid placement');
  if(['a2visual_cypress','a2visual_pier'].includes(d.type)){
   ok(m.blocked[Math.floor(d.x)+Math.floor(d.y)*m.w],label+' tall scenery placed on walkable ground');
   ok(!m.thresholds.some(t=>Math.hypot(d.x-t.opening.x,d.y-t.opening.y)<6),label+' doorway obscured');
  }
 }
 for(const route of m.act2?.routes||[])for(let i=1;i<route.points.length;i++){
  const a=route.points[i-1],b=route.points[i];ok(current.N.segment(m,a.x,a.y,b.x,b.y,.36),label+' blocked route');
 }
 rows.push({zone,seed,dressing:m.act2Visual.dressing.length,lights:m.act2Visual.lamps.length});
}
for(const zone of ['north_wild','mines','desert_wastes','cathedral1','ash_wastes']){
 const m=current.M.generate(zone,12345),b=before.M.generate(zone,12345);
 ok(!m.act2Visual&&hash(m)===hash(b),'visual pass leaked into '+zone);
}
const report={status:'PASS',checks,maps:rows.length,rows};
fs.writeFileSync(new URL('qa/act2_visual/contract.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log({status:report.status,checks,maps:rows.length});
