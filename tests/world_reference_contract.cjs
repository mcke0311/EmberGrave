const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const ctx=vm.createContext({console,Math:Object.create(Math),performance,Uint8Array,Uint16Array,Int32Array,Uint8ClampedArray,COOP_WORKER:true,window:{matchMedia:()=>({matches:false})}});
for(const n of ['utils','data','data_overrides','boss_encounters','sprite_manifest','prop_interactions','mapgen','navigation'])vm.runInContext(fs.readFileSync('js/'+n+'.js','utf8'),ctx);
vm.runInContext('var SpriteAssets={maps:DATA.SPRITE_MANIFEST.maps};',ctx);
for(const n of ['level_terrain','world_reference'])vm.runInContext(fs.readFileSync('js/'+n+'.js','utf8'),ctx);
const {R,D,M,P,U}=vm.runInContext('({R:WorldReference,D:DATA,M:MapGen,P:PropInteractions,U})',ctx);
R.setProvenance(JSON.parse(fs.readFileSync(R.metadataPaths.art)),JSON.parse(fs.readFileSync(R.metadataPaths.props)));
let checks=0;const ok=(v,m)=>{checks++;assert.ok(v,m);};
const signature=s=>JSON.stringify(s.instances.map(p=>[p.id,p.groupKey,p.x,p.y,p.surfaceId]));
const fileCache=new Map();const exists=p=>{if(!fileCache.has(p))fileCache.set(p,fs.existsSync(p));return fileCache.get(p);};
let sample;
for(const seed of [1,12345,4294967295]){
  for(const zone of Object.keys(D.ZONES)){
    const s=R.inspect(zone,{seed}),again=R.inspect(zone,{seed}),tag=zone+'/'+seed;
    ok(!s.errors.length,tag+' unresolved references: '+s.errors.join('; '));
    ok(signature(s)===signature(again),tag+' deterministic placements');
    ok(s.groups.reduce((n,g)=>n+g.count,0)===s.instances.length,tag+' group counts');
    ok(new Set(s.instances.map(p=>p.id)).size===s.instances.length,tag+' unique instance identities');
    ok(s.instances.filter(p=>p.collection==='props').length===s.map.props.length,tag+' all props represented');
    for(const p of [...s.instances,...s.eligibleEvents,...s.materials]){
      if(p.x!=null){ok(Number.isFinite(p.x)&&Number.isFinite(p.y),tag+' finite position '+p.id);ok(p.x>=-12&&p.y>=-12&&p.x<=s.map.w+12&&p.y<=s.map.h+12,tag+' position within authored perimeter '+p.id);}
      ok(exists(D.SPRITE_MANIFEST.entries[p.assetId]?.src),tag+' packed pixels '+p.assetId);
      for(const state of p.states){const d=D.SPRITE_MANIFEST.entries[state.id];ok(d&&Number.isInteger(state.index)&&state.index>=0&&(d.kind==='static'||state.index<d.rows*d.cols),tag+' state '+state.id);}
      for(const refs of Object.values(p.references))for(const r of refs)if(r.path)ok(exists(r.path),tag+' reference exists '+r.path);
    }
    // Inspection and art previews do not mutate a generated game's props.
    const before=JSON.stringify(s.map.props);for(const p of s.instances.filter(p=>p.collection==='props'))R.referenceText(p,s);ok(JSON.stringify(s.map.props)===before,tag+' read-only inspection');
    if(zone==='north_wild'&&seed===12345)sample=s;
  }
  console.log('PASS: 36 levels, seed '+seed);
}
ok(R.levels().flatMap(g=>g.zones).length===Object.keys(D.ZONES).length,'complete directory');
ok(sample.instances.some(p=>p.familyId&&p.category==='habitats'),'habitats included');
ok(sample.instances.some(p=>p.category==='remains'),'remains included');
ok(sample.instances.some(p=>p.collection==='act1Environment'),'environment assembly included');
ok(sample.eligibleEvents.some(p=>p.eventId==='ev_amb1'&&p.category==='habitats'),'ambush den in eligible catalogue');
ok(sample.eligibleEvents.some(p=>p.eventId==='ev_bless0'&&p.category==='shrines'),'blessing catalogue');
ok(sample.instances.some(p=>p.prop.interact==='shrine'),'travel shrine');
ok(sample.materials.length>0,'separate materials');
const used=sample.instances.find(p=>p.familyId);ok(used.states[0].index!==used.states[1].index,'deserted art');
const shrine=sample.instances.find(p=>p.prop.interact==='shrine');ok(shrine.states[0].index!==shrine.states[1].index,'attuned art');
const story=R.inspect('ritual_site').instances.find(p=>p.storyId);ok(story.references.placement.some(r=>r.symbol.includes('STORY_OBJECTS')),'story edit reference');
ok(R.inspect('town').eligibleEvents.length===0,'town has no events');ok(R.inspect('cathedral1').eligibleEvents.length===0,'cathedral reserved encounters');
assert.throws(()=>R.inspect('missing'),/Unknown level/);assert.throws(()=>R.inspect('town',{seed:-1}),/Seed/);

// Compare the original event function with the new gameplay wrapper. Callbacks
// deliberately consume RNG to prove later events preserve their draw order.
const gameSource=fs.readFileSync('js/game.js','utf8'),start=gameSource.indexOf('  function placeEvents(map) {'),end=gameSource.indexOf('  function triggerEvent(',start);
const original=fs.readFileSync('tests/fixtures/world_events_before_reference.js','utf8');
vm.runInContext(`var state; function enemiesByFamily(){Math.random();Math.random();return ['risen'];}
class Monster {constructor(id,x,y){this.id=id;this.x=x;this.y=y;this.roll=Math.random();this.def={speed:1};this.scale=1;this.spriteOpts={};}}
var Act2EnemyCombat={eventSpawn:(ids,x,y,opts,list,random)=>{random();return new Monster(ids[0],x,y);}};`,ctx);
for(const zone of ['fields','north_wild','weeping_marsh','cathedral1','frosthaven_approach','town'])for(const difficulty of [0,2])for(const seed of [1,12345,42]){
  const results=[];
  for(const source of [original,gameSource.slice(start,end)]){
    ctx.state={seed,difficulty,map:M.generate(zone,seed),monsters:[]};ctx.Math.random=U.rng(seed^0x31238);vm.runInContext(source+'\nplaceEvents(state.map);placeEvents(state.map);',ctx);
    // Stable save IDs are additive. Act I's den/nest events intentionally changed;
    // compare every unaffected event and the RNG stream against the old function.
    const props=ctx.state.map.props.filter(p=>!(D.ACT1_ZONES.includes(zone)&&['ev_amb1','ev_amb4'].includes(p.ev?.id))).map(({propId,...p})=>p);
    results.push(JSON.stringify({props,monsters:ctx.state.monsters,placed:ctx.state.map.eventsPlaced,next:ctx.Math.random()}));
  }
  ok(results[0]===results[1],zone+' original event parity '+seed+'/'+difficulty);
}
// Force a treasure roll, including failed creation, then another event.
for(const failed of [false,true]){
  const events=D.EVENTS;D.EVENTS=[events.find(e=>e.kind==='goblin')];
  const results=[];
  for(const source of [original,gameSource.slice(start,end)]){
    ctx.state={seed:8,difficulty:0,map:M.generate('weeping_marsh',8),monsters:[]};ctx.Math.random=U.rng(21);
    vm.runInContext('Act2EnemyCombat.eventSpawn='+ (failed?'()=>null':'(ids,x,y,opts,list,random)=>{random();return new Monster(ids[0],x,y);}')+';',ctx);
    vm.runInContext(source+'\nplaceEvents(state.map);',ctx);results.push(JSON.stringify({props:ctx.state.map.props,monsters:ctx.state.monsters,next:ctx.Math.random()}));
  }
  D.EVENTS=events;ok(results[0]===results[1],'treasure callback parity '+failed);
}
console.log('PASS '+checks+' world reference, asset, state, and event parity checks.');
