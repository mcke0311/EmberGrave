import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const allZones=JSON.parse(fs.readFileSync('tests/qa/campaign_visual/zones.json')).flat();
const selected=process.argv.find(a=>a.startsWith('--zone='))?.split('=')[1];
if(selected&&!allZones.includes(selected))throw Error('Unknown campaign area');
const zones=selected?[selected]:allZones;
const seeds=[0,1,123,12345,4294967295,...Array.from({length:25},(_,i)=>Math.imul(i+37,2654435761)>>>0)];
function fixture(prefix=''){
 const context=vm.createContext({console,Math,performance,COOP_WORKER:true,Uint8Array,Uint16Array,Uint32Array,Int32Array,Uint8ClampedArray});
 for(const name of ['utils','data','data_overrides','boss_encounters','sprite_manifest','prop_interactions','mapgen','navigation'])vm.runInContext(fs.readFileSync(prefix+'js/'+name+'.js','utf8'),context);
 return vm.runInContext('({M:MapGen,D:DATA,N:TerrainNavigation,S:TerrainSurface})',context);
}
const current=fixture(),before=fixture('tmp/campaign_visual/before/');
const hash=x=>crypto.createHash('sha256').update(JSON.stringify(x,(key,value)=>['campaignVisual','refresh','refreshAsset','lights','dark','layoutSeed','layoutVersion','layoutAttemptSeed','layoutAttempts','layoutFallback','layoutDiagnostics'].includes(key)?undefined:value)).digest('hex');
// The later arena overhaul deliberately moves six encounters and three rewards.
// Compare every other part of the campaign refresh's gameplay data.
function gameplay(m){
 const boss=current.D.ZONES[m.id]?.arenaEntrance;if(!boss)return m;
 const copy={...m,zone:{...m.zone},spawns:{...m.spawns}};
 delete copy.bossArena;delete copy.arenaEntrance;delete copy.zone.arenaEntrance;delete copy.spawns.from_arena;
 copy.monsterSpawns=m.monsterSpawns.filter(s=>s.id!==boss);
 copy.exits=m.exits.filter(e=>!e.bossEntrance);
 copy.props=m.props.filter(p=>p.type!=='arena_gate'&&!['mire_shard','fortress_map','hell_portal'].includes(p.storyId));
 return copy;
}
const visualHash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const lighting=JSON.stringify(Object.values(current.D.ZONES).map(z=>z.dark));
let checks=0;const rows=[],ok=(value,message)=>{checks++;assert.ok(value,message);};
for(const zone of zones){
 for(const seed of seeds){
  const m=current.M.generate(zone,seed),b=before.M.generate(zone,seed),v=m.campaignVisual,tag=zone+'/'+seed;
  const identity=x=>{x=gameplay(x);return {w:x.w,h:x.h,exits:x.exits.map(e=>[e.target,e.spawnKey]).sort(),spawns:Object.keys(x.spawns).sort(),story:x.props.filter(p=>p.storyId).map(p=>p.storyId).sort(),survivors:x.npcs.filter(p=>p.sid).map(p=>p.sid).sort()};};
  ok(hash(identity(m))===hash(identity(b)),tag+' progression identity changed');
  ok(visualHash(v)===visualHash(current.M.generate(zone,seed).campaignVisual),tag+' nondeterministic decoration');
  ok(v.scenery.length<=(v.act===2?8:v.act===5?10:38)&&v.ground.length<=110&&v.atmosphere.length<=9,tag+' unbounded presentation');
  for(const p of [...v.scenery,...v.ground]){
   ok(current.D.SPRITE_MANIFEST.maps.props[p.type],tag+' missing artwork '+p.type);
   ok(Number.isFinite(p.x+p.y+p.scale)&&p.scale>0,tag+' bad transform');
  }
  for(const p of v.scenery){
   const i=Math.floor(p.x)+Math.floor(p.y)*m.w;ok(m.blocked[i]&&!m.void?.[i],tag+' scenery on walking space/void');
   ok(!(m.thresholds||[]).some(t=>{const q=t.opening||t;return Math.hypot(q.x-p.x,q.y-p.y)<7;}),tag+' scenery obscures passage');
  }
  for(const p of v.ground){const i=Math.floor(p.x)+Math.floor(p.y)*m.w;ok(!m.blocked[i]&&!m.hazard[i]&&!m.void?.[i],tag+' surface accent on hazard or unsupported floor');}
  for(const t of m.thresholds||[]){
   const p=t.arrival||m.spawns.default;ok(current.S.supported(m,p.x,p.y,.36),tag+' unsupported arrival');
  }
  if(seed===12345)rows.push({zone,act:v.act,scenery:v.scenery.length,ground:v.ground.length,atmosphere:v.atmosphere.length});
 }
 console.log('PASS',zone,'30 seeds');
}
if(!selected)for(const zone of Object.keys(before.D.ZONES).filter(z=>!allZones.includes(z))){const m=current.M.generate(zone,12345),z=current.D.ZONES[zone];ok(!m.campaignVisual,'refresh leaked into '+zone);if(z.arena||z.opening||['town','camp'].includes(z.kind))ok(hash(m)===hash(before.M.generate(zone,12345)),'authored area changed '+zone);}
ok(lighting===JSON.stringify(Object.values(current.D.ZONES).map(z=>z.dark)),'global zone lighting mutated');
fs.writeFileSync('tests/qa/campaign_visual/contract'+(selected?'_'+selected:'')+'.json',JSON.stringify({status:'PASS',checks,zones:zones.length,seeds:seeds.length,rows},null,2)+'\n');
console.log('PASS',checks,'checks');
