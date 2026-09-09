import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const zones=['weeping_marsh','drowned_crypt','hollow_reeds','spawn_pools','ritual_site','marshcamp'];
const seeds=[0,1,123,12345,4294967295,...Array.from({length:25},(_,i)=>Math.imul(i+37,2654435761)>>>0)];
function fixture(prefix='../'){
 const ctx=vm.createContext({console,Math,performance,Uint8Array,Int32Array,Uint8ClampedArray,document:{createElement:()=>({getContext:()=>({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){}})})}});
 for(const n of ['utils','data','data_overrides','boss_encounters','sprite_manifest','mapgen','navigation'])vm.runInContext(fs.readFileSync(new URL(prefix+'js/'+n+'.js',import.meta.url),'utf8'),ctx);
 return vm.runInContext('({M:MapGen,S:TerrainSurface,N:TerrainNavigation})',ctx);
}
const now=fixture(),before=fixture('../tmp/act2_boundaries/before/');
const hash=m=>crypto.createHash('sha256').update(JSON.stringify(m)).digest('hex');
let checks=0;const ok=(a,msg)=>{checks++;assert.ok(a,msg);};
const results=[];
for(const zone of zones)for(const seed of seeds){
 const m=now.M.generate(zone,seed),b=before.M.generate(zone,seed),f=m.boundaries,label=zone+'/'+seed;
 ok(f&&f.revision===1&&f.segments.length>0,label+' missing boundaries');
 ok(hash(f)===hash(now.M.generate(zone,seed).boundaries),label+' nondeterministic art');
 ok(m.w===b.w&&m.h===b.h,label+' dimensions');
 ok(JSON.stringify(m.exits.map(e=>[e.target,e.spawnKey,e.label]))===JSON.stringify(b.exits.map(e=>[e.target,e.spawnKey,e.label])),label+' travel links changed');
 for(const key of Object.keys(b.spawns))ok(m.spawns[key]&&now.S.supported(m,m.spawns[key].x,m.spawns[key].y,.36),label+' unsafe named arrival '+key);
 const expected=new Set();
 for(const s of f.segments){
   ok(['masonry','root','shore'].includes(s.kit)&&s.length>0&&s.length<=3,label+' invalid segment');
   if(zone==='marshcamp'||m.outdoor)ok(s.kit==='shore',label+' outdoor masonry border');
   for(let t=0;t<s.length;t++){
     const x=s.x+(s.axis?0:t),y=s.y+(s.axis?t:0),i=x+y*m.w,j=s.axis?i-1:i-m.w;
     ok(!!m.blocked[i]!==!!m.blocked[j],label+' boundary not on collision edge');
     const k=s.axis+':'+x+':'+y;ok(!expected.has(k),label+' duplicate seam');expected.add(k);
     const solid=m.blocked[i]?i:j;
     if(s.kit==='masonry')ok(m.walls[solid]&&!m.act2.water[solid],label+' masonry in water');
   }
 }
 for(let axis=0;axis<2;axis++)for(let line=1;line<(axis?m.w:m.h);line++)for(let t=0;t<(axis?m.h:m.w);t++){
   const x=axis?line:t,y=axis?t:line,i=x+y*m.w,j=axis?i-1:i-m.w;
   if((f.materials[i]&&!m.blocked[j])||(f.materials[j]&&!m.blocked[i]))ok(expected.has(axis+':'+x+':'+y),label+' unpainted collision edge');
 }
 if(zone==='marshcamp'){
   for(const key of ['floor','walls','blocked','npcs','settlement','shrine'])ok(hash(m[key])===hash(b[key]),label+' settlement changed '+key);
   ok(hash(m.props.filter(p=>!p.thresholdId))===hash(b.props),label+' settlement services changed');
 }else{
   ok(m.monsterSpawns.length===b.monsterSpawns.length,label+' encounter budget');
   const routes=m.act2.routes;ok(JSON.stringify(routes)===JSON.stringify(b.act2.routes),label+' route graph changed');
   for(const route of routes)for(let i=1;i<route.points.length;i++)ok(now.N.segment(m,route.points[i-1].x,route.points[i-1].y,route.points[i].x,route.points[i].y,.36),label+' corridor blocked');
 }
 if(seed===12345)results.push({zone,segments:f.segments.length,shorelines:f.shorelines.length,kits:[...new Set(f.segments.map(s=>s.kit))]});
}
for(const zone of ['frosthaven','north_wild','mines','khalcamp','desert_wastes','sand_tombs','cathedral1','ash_wastes']){
 const a=now.M.generate(zone,12345),b=before.M.generate(zone,12345);
 // Other acts have independent environment work in the shared workspace.
 // The threshold contract compares an isolated Act 2 toggle against that code.
 ok(!a.boundaries,'Act 2 boundary replacement leaked into '+zone);
}
const report={status:'PASS',checks,seedCount:seeds.length,results};
fs.writeFileSync(new URL('qa/act2_boundaries/contract.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
