import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const store=new Map(),calls=[],fail={bundle:null,wait:null};
const element=()=>({style:{},classList:{add(){},remove(){}},remove(){},appendChild(){},getContext:()=>({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){}})});
const ui=new Proxy({},{get:(_,k)=>(...args)=>calls.push([k,...args])});
const ctx=vm.createContext({console,Math,Date,performance,Uint8Array,Uint16Array,Uint32Array,Int32Array,Float32Array,Uint8ClampedArray,Set,Map,JSON,setTimeout,clearTimeout,
  window:{addEventListener(){},matchMedia:()=>({matches:false})},
  document:{createElement:element,getElementById:element,body:element()},
  localStorage:{get length(){return store.size},key:i=>[...store.keys()][i],getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},
  Sfx:new Proxy({vol:{}},{get:(t,k)=>t[k]||(()=>{})}),UI:ui,
  LootFilter:{evaluate:()=>({show:true})},
  SpriteAssets:{loadBundle:async id=>{if(id===fail.bundle)throw Error('Expected test load failure');if(fail.wait?.bundle===id)await fail.wait.promise;}},
  Player3D:{assets:{resolvePlayerVisual:()=>({}),loadPlayerLoadout:async()=>{},activatePlayerLoadout(){},discardPlayerLoadout(){},deactivatePlayerLoadout(){}}},
});
for(const f of ['utils','data','data_overrides','boss_encounters','sprite_manifest','act1_animation_catalog','act1_enemy_animation','prop_interactions','mapgen','navigation','items','entities'])vm.runInContext(fs.readFileSync(new URL('../js/'+f+'.js',import.meta.url),'utf8'),ctx);
const source=fs.readFileSync(new URL('../js/game.js',import.meta.url),'utf8').replace('    init, newGame, loadGame,','    __openingTest:{opening,freshState,setState:s=>state=s,updateBossEncounter,updateFx,pickupGround,flush:seconds=>{state.time+=seconds;for(let i=delayed.length-1;i>=0;i--)if(state.time>=delayed[i].t){const fn=delayed[i].fn;delayed.splice(i,1);fn();}}},\n    init, newGame, loadGame,');
vm.runInContext(source,ctx);
const {Game:G,MapGen:M,DATA:D}=vm.runInContext('({Game,MapGen,DATA})',ctx);
const manifest=D.SPRITE_MANIFEST;
let checks=0;const ok=(v,m)=>{checks++;assert.ok(v,m);};
const controller=G.__openingTest.opening;
const step=(seconds)=>{for(let t=0;t<seconds;t+=.05){G.state.time+=.05;controller.update(.05);}};
const kill=id=>{const m=G.state.monsters.find(m=>m.openingId===id);ok(m&&!m.dead,'live '+id);m.die(G.state.player);};
const stage=()=>G.state.flags.opening.stage;
async function reload(){G.saveGame();const slot=G.listSaves().find(s=>s.name===G.state.player.name).slot;await G.loadGame(slot);}

for(const seed of [0,1,123,4294967295]) {
  const m=M.generate('frosthaven_approach',seed),s=m.spawns.default,seen=new Set(),queue=[[s.x|0,s.y|0]];
  for(let i=0;i<queue.length;i++) {const [x,y]=queue[i],key=x+y*m.w;if(seen.has(key))continue;seen.add(key);for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]])if(M.walkable(m,x+dx,y+dy))queue.push([x+dx,y+dy]);}
  for(const p of [...Object.values(m.spawns),m.opening.guard,...m.opening.pair,m.opening.cover,m.opening.gate,m.opening.brynGate,
    m.opening.rescue,...m.opening.rescueEnemies,...m.opening.travelers,...m.opening.shelter,m.opening.captain,m.opening.bossTrigger,...m.opening.reinforcements,...m.npcs])ok(seen.has((p.x|0)+(p.y|0)*m.w),'reachable staging point '+JSON.stringify(p));
  ok(!m.monsterSpawns.length && !m.hazard.some(Boolean),'no random enemies or hazards');
  for(const p of m.props)ok(manifest.maps.props[(p.artZone||m.id)+'_'+p.type] || manifest.maps.props[p.type],'installed prop '+p.type);
  for(const p of m.props.filter(p=>p.blocks))ok(!M.walkable(m,p.x,p.y),'prop footprint remains solid '+p.type);
  ok(manifest.maps.monsters[D.ENEMIES.frost_watch_captain.sprite],'installed captain artwork');
  for(const n of m.npcs)ok(manifest.maps.npcs[n.npcArt],'installed companion artwork');
  ok(m.exits.length===1&&m.exits[0].target==='frosthaven','one-way town gate');
}

for(const cls of Object.keys(D.CLASSES)) {
  await G.newGame('Opening '+cls,cls,false);
  ok(stage()==='arrival'&&G.state.map.id==='frosthaven_approach',cls+' arrival');
  ok(G.state.quests.q7.state==='active'&&G.state.quests.q7.count===0,'first quest retained');
  ok(!G.state.map.props.some(p=>p.event)&&!G.state.monsters.length,'no early ambush');
  ok(controller.actor?.dead,'fallen guard is scenery before awakening');
  await reload();ok(stage()==='arrival','arrival reload');
  const p=G.state.player,sc=G.state.map.opening;
  Object.assign(p,G.state.map.spawns.awakening);step(.1);ok(stage()==='awakening','proximity awakens guard');
  await reload();ok(stage()==='awakening','awakening checkpoint');
  ctx.window.matchMedia=()=>({matches:true});ok(!controller.cameraTarget(),'reduced motion keeps camera on player');
  ctx.window.matchMedia=()=>({matches:false});
  step(3);ok(stage()==='guard'&&!controller.actor,'awakening releases real enemy');
  await reload();ok(G.state.monsters.length===1,'guard checkpoint creates one enemy');
  ok(!await G.enterMap('frosthaven','from_wild',{openingMode:'gate'}),'closed gate cannot skip fight');
  G.state.player.hp=1;step(.05);ok(calls.some(c=>c[0]==='openingObjective'&&String(c[2]).includes('Press 1')),'contextual potion hint');
  G.state.player.hp=G.state.player.stats.maxHp;
  kill('guard');ok(stage()==='road','first kill opens road');
  const xp=G.state.player.xp;
  await reload();ok(stage()==='road'&&!G.state.monsters.length&&G.state.player.xp===xp,'no duplicate kill/reward after reload');
  Object.assign(G.state.player,G.state.map.spawns.rescue);step(.1);ok(stage()==='rescue','rescue encounter');
  kill('rescue0');await reload();ok(!G.state.monsters.some(m=>m.openingId==='rescue0'),'partial rescue saved');
  kill('rescue1');step(.1);ok(G.state.monsters.some(m=>m.openingId==='rescue2'),'last rescue attacker arrives');
  kill('rescue2');ok(stage()==='rescueTalk','travelers await interaction');
  await reload();ok(stage()==='rescueTalk','rescue conversation checkpoint');
  G.interact(G.state.npcs.find(n=>n.id==='opening_mara'));ok(stage()==='escort'&&G.state.flags.opening.rescued,'rescue both travelers');
  G.interact(G.state.npcs.find(n=>n.id==='opening_iven'));ok(stage()==='escort','repeated rescue is harmless');
  await reload();ok(G.state.npcs.filter(n=>n.openingTraveler).length===2,'travelers restored');
  Object.assign(G.state.player,G.state.map.opening.secondCover);step(.1);ok(stage()==='combat'&&G.state.monsters.length===2,'gate encounter');
  kill('gate0');await reload();ok(G.state.monsters.length===1&&G.state.monsters[0].openingId==='gate1','partial encounter resumes');
  kill('gate1');ok(stage()==='provision'&&!controller.ready,'gate enemies do not unlock town');
  await reload();
  const cache=G.state.map.props.find(p=>p.interact==='opening_supply');
  G.interact(cache);const supplies=()=>G.state.ground.filter(g=>g.item?.baseId==='hp1').reduce((n,g)=>n+g.item.count,0),supplyCount=supplies();
  G.interact(cache);ok(supplies()===supplyCount&&G.state.flags.opening.supply,'cache pays once');
  await reload();ok(supplies()===supplyCount,'uncollected cache survives reload');
  Object.assign(G.state.player,G.state.map.opening.bossTrigger);step(.1);ok(stage()==='bossIntro','captain entrance');
  step(3.1);ok(stage()==='boss','boss combat');
  const boss=()=>G.state.monsters.find(m=>m.openingId==='captain'&&!m.dead);
  const retinue=()=>G.state.monsters.filter(m=>!m.dead&&m.openingId?.startsWith('retinue'));
  ok(boss().isBoss&&boss().defId==='frost_watch_captain','dedicated low-level boss');
  boss().hp=boss().maxHp*.49;step(.1);ok(boss().phaseIdx===1&&retinue().length===2,'second phase and first wave');
  const hp=boss().hp,speed=boss().def.speed,cd=boss().def.slam.cd;
  kill('retinue0_0');await reload();ok(boss().hp===hp&&boss().def.speed===speed&&boss().def.slam.cd===cd&&retinue().length===1,'health phase and partial wave restored');
  await reload();ok(boss().def.speed===speed,'phase multiplier does not stack');
  boss().hp=boss().maxHp*.24;step(.1);ok(retinue().length===1&&G.state.flags.opening.waves.length===1,'second wave waits for first');
  kill('retinue0_1');step(.1);ok(retinue().length===2&&G.state.flags.opening.waves.length===2,'second wave starts');
  step(25);ok(retinue().length===2,'reinforcements remain bounded');
  const beforeXp=G.state.player.xp;
  kill('captain');ok(stage()==='gate'&&controller.ready&&!retinue().length,'captain death clears retinue and opens gate');
  const afterXp=G.state.player.xp;ok(afterXp!==beforeXp,'boss grants experience');
  G.onMonsterDeath(G.state.monsters.find(m=>m.openingId==='captain'),G.state.player);ok(G.state.player.xp===afterXp,'boss reward cannot repeat');
  await reload();ok(!G.state.monsters.length&&stage()==='gate','gate checkpoint');
  ok(await G.enterMap('frosthaven','from_wild',{openingMode:'gate'}),'enter town');
  ok(stage()==='hearth'&&G.state.home==='frosthaven','hearth handoff');
  ok(G.state.npcs.filter(n=>n.id.startsWith('opening_')).length===2,'travelers visible at hearth');
  await reload();ok(stage()==='hearth','hearth resume');
  G.interact(G.state.npcs.find(n=>n.id==='sera'));
  ok(stage()==='done'&&G.state.flags.seenIntro,'Seraneth completes opening');
  ok(G.state.quests.q7.count===0 && calls.some(c=>c[0]==='openOpeningDialog'),'short dialogue, unchanged main quest');
  await reload();ok(stage()==='done'&&G.state.map.id==='frosthaven','completed hero does not replay');
  ok(G.state.npcs.filter(n=>n.id.startsWith('opening_')).length===2,'rescued travelers persist after completion');
}

for(const s of ['arrival','awakening','guard','road','rescue','rescueTalk','escort','combat','provision','bossIntro','boss','gate','hearth']) {
  await G.newGame('Skip '+s,'vanguard',false);
  G.state.flags.opening.stage=s;
  if(s==='hearth')await G.enterMap('frosthaven','default');
  const a=G.skipOpening(),b=G.skipOpening();
  await Promise.all([a,b]);
  ok(stage()==='done'&&G.state.map.id==='frosthaven','skip '+s);
}
await G.newGame('Failed transition','vanguard',false);
fail.bundle='zone:frosthaven';
ok(!await G.skipOpening(),'failed skip is retryable');
ok(stage()==='arrival'&&G.state.map.id==='frosthaven_approach','failure preserves checkpoint');
fail.bundle=null;ok(await G.skipOpening(),'retry succeeds');
fail.bundle='actors:act1';
ok(!await G.enterMap('north_wild','default',{recoverable:true}),'failed northern animation bundle blocks travel');
ok(G.state.map.id==='frosthaven','animation load failure preserves the current map');
fail.bundle=null;ok(await G.enterMap('north_wild','default',{recoverable:true}),'northern animation load retries successfully');

await G.newGame('Ordinary death','vanguard',false);
G.onPlayerDeath();ok(G.state.player.dead,'normal death');
ok(await G.returnToTown(),'normal return');ok(stage()==='done'&&!G.state.player.dead,'death ends opening');
await G.newGame('Early travel','vanguard',false);
G.castPortal();await G.enterMap('frosthaven','portal');
ok(stage()==='done'&&!G.state.portal,'early travel clears opening portal');
delete G.state.flags.opening;delete G.state.flags.seenIntro;
await reload();ok(!G.state.flags.opening&&G.state.map.id==='frosthaven','legacy hero without intro flags stays in town');

await G.newGame('Hardcore opening','vanguard',true);
G.onPlayerDeath();ok(G.state.player.dead&&!G.listSaves().some(s=>s.name==='Hardcore opening'),'hardcore still deletes fallen hero');
ok(!await G.returnToTown(),'hardcore cannot revive');
G.saveAndQuit();
ok(!G.listSaves().some(s=>s.name==='Hardcore opening'),'quitting cannot recreate a fallen hardcore save');

await G.newGame('Interrupted skip','vanguard',false);
let release;
fail.wait={bundle:'zone:frosthaven',promise:new Promise(resolve=>{release=resolve;})};
const pending=G.skipOpening();
G.saveAndQuit();fail.wait=null;
await G.newGame('Replacement hero','emberwitch',false);
release();ok(!await pending,'stale transition discarded');
ok(G.state.player.name==='Replacement hero'&&stage()==='arrival'&&G.state.map.id==='frosthaven_approach','late skip cannot change replacement hero');
// Migrate actual version-one checkpoints without sending established heroes backward.
for(const legacy of ['arrival','awakening','guard','road','combat','gate','hearth','done']) {
  await G.newGame('Migration '+legacy,'vanguard',false);
  G.state.flags.opening={v:1,stage:legacy,defeated:['combat','gate','hearth','done'].includes(legacy)?['guard']:[],hints:{}};
  await reload();
  ok(G.state.flags.opening.v===2&&stage()===legacy,'migrate '+legacy+' in place');
  ok(G.state.flags.opening.rescueBypassed===['combat','gate','hearth','done'].includes(legacy),'rescue migration '+legacy);
  if(legacy==='combat'){kill('gate0');kill('gate1');ok(stage()==='provision','old gate combat leads to new boss');}
  if(legacy==='gate')ok(controller.ready&&await G.enterMap('frosthaven','from_wild',{openingMode:'gate'}),'already-open old gate remains open');
}

async function bossScene() {
  await G.newGame('Slam tests','vanguard',false);
  G.state.flags.opening.stage='boss';await reload();
  return G.state.monsters.find(m=>m.openingId==='captain');
}
const flush=G.__openingTest.flush;
let captain=await bossScene(),p=G.state.player;
Object.assign(p,{x:captain.x+1,y:captain.y});
const startHp=p.hp;
captain.startTelegraphedSlam(p,G.state.map);
const warning=captain.slamWarning;
ok(warning.radius===captain.def.slam.radius&&warning.ttl===1.1,'warning matches radius and windup');
flush(1.09);ok(p.hp===startHp,'no damage before warning completes');
flush(.02);ok(p.hp<startHp&&!captain.slamWarning,'damage at impact');
ok(captain.action.dur===2.35,'explicit recovery window');
captain=await bossScene();p=G.state.player;Object.assign(p,{x:captain.x+captain.def.slam.radius+.01,y:captain.y});
captain.startTelegraphedSlam(p,G.state.map);const outsideHp=p.hp;flush(1.2);ok(p.hp===outsideHp,'outside visible circle is safe');
captain=await bossScene();p=G.state.player;Object.assign(p,{x:captain.x,y:captain.y});
captain.startTelegraphedSlam(p,G.state.map);kill('captain');const deadHp=p.hp;flush(2);ok(p.hp===deadHp&&!G.state.fx.some(f=>f.type==='slamwarning'),'death cancels warning and pending hit');
captain=await bossScene();captain.startTelegraphedSlam(G.state.player,G.state.map);await G.skipOpening();const townHp=G.state.player.hp;flush(2);ok(G.state.player.hp===townHp&&!G.state.fx.some(f=>f.type==='slamwarning'),'skip cancels attack');
captain=await bossScene();captain.startTelegraphedSlam(G.state.player,G.state.map);await G.enterMap('frosthaven','default');flush(2);ok(G.state.map.id==='frosthaven'&&!G.state.fx.some(f=>f.type==='slamwarning'),'travel cancels pending attack');
captain=await bossScene();captain.startTelegraphedSlam(G.state.player,G.state.map);G.onPlayerDeath();flush(2);ok(G.state.player.dead,'pending slam cannot affect dead hero');
captain=await bossScene();p=G.state.player;Object.assign(p,{x:captain.x,y:captain.y});
ctx.window.matchMedia=()=>({matches:true});G.fx.shake=0;captain.startTelegraphedSlam(p,G.state.map);flush(1.2);ok(G.fx.shake===0,'reduced motion disables captain shake');
console.log(`PASS ${checks} opening checks: five classes, rescue, captain phases, finite reinforcements, attack warnings, every checkpoint, migration, rewards, skip, death and failed-load retry.`);
