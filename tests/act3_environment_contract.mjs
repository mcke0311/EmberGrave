import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const zones=['khalcamp','desert_wastes','underground_market','sand_tombs','khal_palace','shard_flats','tomb_sanctum'];
const seeds=[0,1,123,12345,4294967295,...Array.from({length:25},(_,i)=>Math.imul(i+37,2654435761)>>>0)];
// The manifest global's name is deliberately read from its actual declaration.
const fixtureSource=fs.readFileSync(new URL('../js/sprite_manifest.js',import.meta.url),'utf8');
function world(prefix,withoutEnvironment=false){
 const ctx=vm.createContext({console,Math,performance,Uint8Array,Int32Array,Uint8ClampedArray,document:{createElement:()=>({getContext:()=>({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){}})})}});
 for(const n of ['utils','data','data_overrides','boss_encounters','mapgen','navigation']){
  let source=fs.readFileSync(new URL(prefix+'js/'+n+'.js',import.meta.url),'utf8');
  if(withoutEnvironment&&n==='mapgen')source=source.replace('if(m.act3)imperialEnvironment(m,seed);','');
  vm.runInContext(source,ctx);
 }
 return vm.runInContext('({M:MapGen,S:TerrainSurface,N:TerrainNavigation})',ctx);
}
const current=world('../'),before=world('../tmp/act3_environment/before/');
const hash=o=>crypto.createHash('sha256').update(JSON.stringify(o)).digest('hex');
const manifest=JSON.parse(fixtureSource.slice(fixtureSource.indexOf('{')).trim().replace(/;$/,''));
let checks=0,passages=0;const rows=[];const ok=(a,msg)=>{checks++;assert.ok(a,msg);};
for(const zone of zones)for(const seed of seeds){
 const m=current.M.generate(zone,seed),b=before.M.generate(zone,seed),e=m.act3.environment,label=zone+'/'+seed;
 ok(e,label+' environment missing');ok(m.w===b.w&&m.h===b.h,label+' dimensions');
 ok(hash(m.monsterSpawns)===hash(b.monsterSpawns),label+' encounter placement changed');
 ok(hash(m.act3.routes)===hash(b.act3.routes),label+' route graph changed');
 ok(hash(m.act3.anchors)===hash(b.act3.anchors),label+' story anchors changed');
 ok(hash(m.exits.map(x=>[x.target,x.spawnKey]))===hash(b.exits.map(x=>[x.target,x.spawnKey])),label+' campaign graph');
 ok(hash(e)===hash(current.M.generate(zone,seed).act3.environment),label+' deterministic');
 if(zone==='khalcamp')for(const key of ['npcs','settlement','shrine','spawns','blocked','elev'])ok(hash(m[key])===hash(b[key]),label+' camp services '+key);
 for(const t of e.passages){
  passages++;const ex=m.exits.find(x=>x.thresholdId===t.id);ok(ex,label+' unlinked passage');
  for(const part of t.parts){
   ok(manifest.maps.props[part.asset],label+' missing doorway join');
   const a=part.connections[0],i=a.x+a.y*m.w,j=part.axis?i-1:i-m.w;
   ok(part.side>0?m.walls[i]&&!m.blocked[j]:m.walls[j]&&!m.blocked[i],label+' doorway join does not follow its boundary');
  }
  for(const p of [t.opening,t.approach,t.arrival]){
   ok(current.S.supported(m,p.x,p.y,.55),label+' unsupported passage '+t.id+' '+JSON.stringify(p));
   ok(!m.hazard[Math.floor(p.x)+Math.floor(p.y)*m.w],label+' hazardous passage');
   ok(current.N.findPath(m,m.spawns.default,p,{radius:.55,speed:4.5,hop:false}),label+' unreachable passage');
  }
  ok(current.N.segment(m,t.approach.x,t.approach.y,t.opening.x,t.opening.y,.55),label+' blocked aperture');
  const asset='a3passage_'+t.family+'_'+(t.interior?'in':'out')+'_'+(t.opening.axis?'south':'east');ok(manifest.maps.props[asset],label+' missing passage art '+asset);
  ok(t.opening.x>=ex.x0&&t.opening.x<=ex.x1&&t.opening.y>=ex.y0&&t.opening.y<=ex.y1,label+' trigger/art disagreement');
 }
 const seen=new Set();
 for(const s of e.segments){
  ok(manifest.maps.props['a3env_'+s.material+'_'+s.part],label+' missing module');
  for(let k=0;k<s.length;k++){
   const x=s.x+(s.axis?0:k),y=s.y+(s.axis?k:0),i=x+y*m.w,j=s.axis?i-1:i-m.w,key=s.axis+':'+x+':'+y;
   ok(!seen.has(key),label+' duplicate boundary');seen.add(key);
   ok(s.side>0?m.walls[i]&&!m.blocked[j]:m.walls[j]&&!m.blocked[i],label+' collision side');
  }
 }
 for(let axis=0;axis<2;axis++)for(let line=1;line<(axis?m.w:m.h);line++)for(let k=0;k<(axis?m.h:m.w);k++){
  const x=axis?line:k,y=axis?k:line,i=x+y*m.w,j=axis?i-1:i-m.w;
  if(!(m.walls[i]&&!m.blocked[j]||m.walls[j]&&!m.blocked[i]))continue;
  const px=x+(axis?0:.5),py=y+(axis?.5:0);
  const aperture=e.passages.some(t=>t.wallCoverage?(px>=t.wallCoverage.x0&&px<t.wallCoverage.x1&&py>=t.wallCoverage.y0&&py<t.wallCoverage.y1):t.opening.axis===axis&&Math.abs((axis?t.opening.x:t.opening.y)-line)<.1&&Math.abs(k+.5-(axis?t.opening.y:t.opening.x))<t.opening.halfWidth+1);
  ok(aperture||seen.has(axis+':'+x+':'+y),label+' uncovered edge');
 }
 if(e.outdoor){ok(!m.act3.architecture.walls.length,label+' outdoor masonry');ok(e.natural.length>0,label+' missing natural contour');}
 if(m.outdoor)ok(m.walls.reduce((n,x)=>n+!x,0)>b.walls.reduce((n,x)=>n+!x,0),label+' outdoor basins not expanded');
 if(seed===12345)rows.push({zone,boundaries:e.segments.length,natural:e.natural?.length||0,passages:e.passages.length,enemies:m.monsterSpawns.length});
}
const isolated=world('../',true),otherZones=['frosthaven','north_wild','mines','marshcamp','weeping_marsh','drowned_crypt','cathedral1','ash_wastes'];
for(const zone of otherZones)ok(hash(current.M.generate(zone,12345))===hash(isolated.M.generate(zone,12345)),'Act III pass changed '+zone);
const report={status:'PASS',checks,seeds:seeds.length,zones:rows,passages,otherActIsolation:otherZones};
fs.mkdirSync('tests/qa/act3_environment',{recursive:true});fs.writeFileSync('tests/qa/act3_environment/contract.json',JSON.stringify(report,null,2));console.log(report);
