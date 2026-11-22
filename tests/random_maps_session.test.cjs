'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),crypto=require('node:crypto');
const {fixture}=require('./coop_runtime_fixture.cjs');
const hash=m=>crypto.createHash('sha256').update(Buffer.from(m.act2?.water||m.walls)).update(Buffer.from(m.elev)).digest('hex');
async function host(seed=101,campaign){const f=fixture();Object.assign(f,vm.runInContext('({MapGen,TerrainNavigation,CursedEvents,Items,U})',f.context));await f.runtime.start({hostId:'host',hero:f.hero('Host'),seed,campaign});return f;}

test('solo loading rerolls geometry, preserves progress, and keeps every session map cached',async()=>{
 const {fixture:solo}=await import('./boss_fixture.mjs');
 const f=solo({gameExports:['setSaveSlot:slot=>{saveSlotKey=slot;}']});
 const {Game:G,Player,MapGen:M}=f,slot='embergrave_save_random_qa';
 Object.assign(f.ctx.Player3D.assets,{resolvePlayerVisual:()=>({}),loadPlayerLoadout:async()=>{},activatePlayerLoadout(){},discardPlayerLoadout(){},deactivatePlayerLoadout(){}});
 const p=new Player('World QA','vanguard'),s=G.__bossTest.freshState(p,77,11);
 s.flags.opening={stage:'complete',v:2};s.flags.dead_korvath=true;s.quests.q8={state:'active',rescued:['mines_surv_0'],count:1};s.flags.brokenWards={old:true};
 s.map=M.generate('frosthaven',77);G.__bossTest.setState(s);G.__bossTest.setSaveSlot(slot);G.saveGame();
 let seed=100;f.U.newWorldSeed=()=>++seed;
 await G.loadGame(slot);const a=G.state;assert.ok(a);assert.equal(a.sessionSeed,101);assert.equal(a.seed,77);assert.ok(a.flags.dead_korvath);assert.equal(a.flags.brokenWards,undefined);
 assert.equal(a.quests.q8.rescued[0],'mines_surv_0');
 await G.enterMap('mines','from_wild');const mine=G.state.map,identity=hash(mine),enemy=G.state.monsters[0];
 assert.ok(!G.state.npcs.some(n=>n.sid==='mines_surv_0'));enemy.dead=true;enemy.corpseT=0;
 const container=mine.props.find(p=>p.lootable);container.opened=true;
 await G.enterMap('frosthaven','default');await G.enterMap('mines','from_wild');
 assert.equal(G.state.map,mine);assert.ok(container.opened);assert.ok(!G.state.monsters.includes(enemy));
 assert.ok(G.castPortal());assert.ok(await G.usePortal());assert.equal(G.state.map.id,'frosthaven');assert.ok(await G.usePortal());assert.equal(G.state.map,mine);assert.ok(container.opened);
 G.state.unlockedDiff=1;assert.ok(await G.setDifficulty(1));await G.enterMap('mines','from_wild');
 const nightmare=G.state.map;assert.notEqual(nightmare.layoutSeed,mine.layoutSeed);assert.notEqual(hash(nightmare),identity);
 const nightmareContainer=nightmare.props.find(p=>p.lootable);nightmareContainer.opened=true;
 assert.ok(await G.setDifficulty(0));await G.enterMap('mines','from_wild');assert.equal(G.state.map,mine);assert.ok(container.opened);assert.ok(!G.state.monsters.includes(enemy));
 assert.ok(await G.setDifficulty(1));await G.enterMap('mines','from_wild');assert.equal(G.state.map,nightmare);assert.ok(nightmareContainer.opened);
 assert.ok(await G.setDifficulty(0));
 await G.enterMap('deepfreeze_cavern','default');
 const cave=G.state.map,traveler=G.state.player,body=cave.props.find(p=>p.dressingSite&&p.searchable);
 const other=cave.props.find(p=>p!==body&&p.type==='grave');
 assert.ok(body&&other,'the expedition has multiple corpse sources');
 Object.assign(traveler,{x:body.x,y:body.y,surfaceId:body.surfaceId||0});
 G.interact(body);assert.ok(traveler.action?.propInteraction);
 G.state.time+=.4;vm.runInContext('PropInteractions',f.ctx).update(G.state);
 assert.ok(body.searched);assert.ok(G.corpseFromGrave(traveler,body,.75));
 await G.enterMap('north_wild','default');await G.enterMap('deepfreeze_cavern','default');
 const revisited=G.state.map.props.find(p=>p.propId===body.propId);
 assert.equal(revisited,body);assert.ok(revisited.searched&&revisited.corpseConsumed);
 assert.ok(!other.searched&&!other.corpseConsumed);
 for(const zone of ['sand_tombs','cathedral1','cathedral2']){
  await G.enterMap(zone,'default');const map=G.state.map;
  await G.enterMap('frosthaven','default');await G.enterMap(zone,'default');assert.equal(G.state.map,map,zone+' changed on re-entry');
 }
 await G.enterMap('arena_mire_mother','default');const arena=G.state.map;
 G.state.player.dead=true;assert.ok(await G.retryBossArena());assert.equal(G.state.map,arena);
 G.saveAndQuit();await G.loadGame(slot);assert.equal(G.state.sessionSeed,102);assert.equal(G.state.seed,77);
 await G.enterMap('mines','from_wild');assert.notEqual(hash(G.state.map),identity);assert.ok(G.state.flags.dead_korvath);
});

test('painted props meet their fixtures, aisles and approach tracks',()=>{
 const {context}=fixture(),{M,U}=vm.runInContext('({M:MapGen,U})',context);
 const camp=M.generate('marshcamp',12345);
 const shop=camp.props.find(p=>p.type==='workshop'),forge=camp.props.find(p=>p.interact==='forge');
 assert.ok(U.isoX(forge.x,forge.y)<U.isoX(shop.x,shop.y));
 assert.equal(shop.flipX,true,'the workshop opening faces its forge on the left');
 assert.ok(camp.lights.some(l=>l.x===shop.x+1.1&&l.y===shop.y-.4),'the window light follows the mirrored workshop');

 const church=M.generate('cathedral1',12345),pews=church.props.filter(p=>p.type==='cathedral_pews');
 assert.ok(pews.length);
 for(const pew of pews){
  const f=pew.footprint;
  assert.equal(pew.flipX,f.x1-f.x0>f.y1-f.y0,'the bench runs along its occupied row');
 }

 const mine=M.generate('mines',12345),o=mine.thresholds.find(t=>t.kit==='mine').opening;
 // End of the pair of rails painted into the entrance, measured from its anchor.
 const tipX=U.isoX(o.x,o.y)+(o.axis?125:-125),tipY=U.isoY(o.x,o.y)+105;
 assert.ok(mine.frontier.decals.some(d=>{
  if(d.type!=='frontier_tracks'||d.turn===!!o.axis)return false;
  const x=d.x-(d.turn?0:d.runLength/2),y=d.y-(d.turn?d.runLength/2:0);
  return Math.hypot(U.isoX(x,y)-tipX,U.isoY(x,y)-tipY)<2;
 }),'the working track starts at the painted rails');
});

test('expedition and Ashen Fields sites retain their seeded resources and legacy save identities',()=>{
 const f=fixture(),{M,P}=vm.runInContext('({M:MapGen,P:PropInteractions})',f.context);
 const cave=M.generate('deepfreeze_cavern',12345),graves=cave.props.filter(p=>p.type==='grave');
 assert.equal(cave.layoutVersion,3);
 assert.equal(graves.length,6);assert.equal(graves.filter(p=>p.searchable).length,3);
 assert.deepEqual(new Set(graves.map(p=>p.dressingSite)),new Set(['gallery-graves','shelf-graves','cache-graves','forward-stores']));
 const firstPack=cave.monsterSpawns.slice().sort((a,b)=>{
  const spawn=cave.spawns.default;return Math.hypot(a.x-spawn.x,a.y-spawn.y)-Math.hypot(b.x-spawn.x,b.y-spawn.y);
 })[0];
 const stores=graves.filter(p=>p.dressingSite==='forward-stores');
 assert.ok(stores.some(p=>Math.hypot(p.x-firstPack.x,p.y-firstPack.y)<=15));
 for(const p of stores)for(const step of [1,2])assert.equal(cave.walls[(p.x|0)+step+((p.y|0)+step)*cave.w],0);
 assert.ok(cave.props.some(p=>p.type==='cart'&&p.dressingSite==='forward-stores'));
 assert.deepEqual(new Set(cave.props.filter(p=>p.remainsSite&&p.searchable).map(p=>p.remainsSite)),new Set(['gallery','shelf']));
 for(const p of graves){
  const state={map:cave,time:1},fresh=P.sample(p,state),used=P.sample({...p,corpseConsumed:true},state);
  assert.match(fresh.family,/^frozen_(miner|traveler)$/);assert.notEqual(used.index,fresh.index);
  assert.match(p.propId,/^deepfreeze_cavern:grave:/);
 }
 assert.ok(!cave.props.some(p=>p.type==='deadtree'));
 assert.ok(!cave.frontier.decals.some(d=>d.type==='frontier_rubble'));
 const marsh=M.generate('weeping_marsh',12345),reeds=marsh.props.filter(p=>p.type==='reed_clump'&&p.dressingSite);
 assert.ok(reeds.length>0);
 for(const p of reeds){
  const i=(p.x|0)+(p.y|0)*marsh.w;
  assert.ok([1,-1,2,-2,marsh.w,-marsh.w,2*marsh.w,-2*marsh.w].some(d=>marsh.act2.water[i+d]));
 }
 const votives=marsh.props.filter(p=>p.type==='votives');
 assert.ok(votives.length>0);
 for(const p of votives)assert.ok(marsh.props.some(shrine=>p.dressingSite==='votives-'+shrine.propId&&Math.hypot(p.x-shrine.x,p.y-shrine.y)<8));
 const fields=M.generate('fields',12345),goods=fields.props.filter(p=>p.breakable&&!p.behavior);
 assert.equal(goods.length,95);
 for(const pattern of [/^farmstead-/,/^camp-/,/^trail-stop-/])assert.ok(goods.some(p=>pattern.test(p.dressingSite)));
 const burials=fields.props.filter(p=>p.type==='grave');
 for(const site of ['chapelruin','cryptdoor'])assert.ok(burials.some(p=>p.dressingSite===site));
 assert.ok(burials.some(p=>p.dressingSite?.startsWith('battlefield-')));
 const box=goods.find(p=>p.type==='crate'&&p.blocks&&p.dressingSite),grave=burials.find(p=>p.blocks&&p.dressingSite);
 const untouched=goods.find(p=>p!==box&&p.dressingSite===box.dressingSite);
 assert.ok(untouched);
 // Older rows without a propId carry the original v2 coordinates.
 const legacy=(p,changes)=>{const [x,y]=p.propId.split(':').slice(-2).map(Number);return {type:p.type,x,y,...changes};};
 f.CoopCodec.restoreProps(fields,[legacy(grave,{corpseConsumed:true}),legacy(box,{broken:true,breakable:false})]);
 assert.ok(grave.corpseConsumed&&box.broken);
 for(const p of [grave,box]){assert.equal(p.blocks,false);assert.equal(fields.blocked[(p.x|0)+(p.y|0)*fields.w],0);}
 assert.ok(untouched.breakable&&untouched.blocks&&!untouched.broken);
});

test('generation retries eight deterministic layouts before using the authored fallback',()=>{
 const fs=require('node:fs'),context=vm.createContext({console,Math,performance,COOP_WORKER:true});
 for(const name of ['utils','data','data_overrides','boss_encounters','sprite_manifest','prop_interactions','mapgen','navigation']){
  let source=fs.readFileSync('js/'+name+'.js','utf8');
  if(name==='mapgen')source=source.replace('if(!planningLayout)return source;','if(!planningLayout)return source;throw Error("Forced planner failure");');
  vm.runInContext(source,context);
 }
 const M=vm.runInContext('MapGen',context),a=M.generate('mines',123),b=M.generate('mines',123);
 assert.ok(a.layoutFallback);assert.equal(a.layoutAttempts,9);assert.equal(a.layoutDiagnostics.failures.length,8);assert.equal(a.layoutSeed,123);assert.equal(a.layoutVersion,M.layoutVersion);assert.equal(hash(a),hash(b));
 assert.equal(a.frontier.landmarks.find(n=>n.id==='entry').x,18.5);
});

test('partial legacy beacons and earned pending rewards survive a new hosted world',async()=>{
 const f=await host(707),w=f.runtime.worlds.get('north_wild');w._activated=true;
 w.quests.q8b={state:'active',beacons:3,trioSpawned:true,trioKilled:['barb_axe'],trioAnchor:{x:-100,y:-100}};
 w.flags.echoAwards={absentHero:{items:[],gold:85}};w.shrines.push('mines');
 await f.runtime.checkpoint();const saved=f.saves.at(-1).campaign;saved.pendingRewards={absentHero:['q7']};
 const g=await host(808,saved),wild=g.runtime.worlds.get('north_wild');
 assert.equal(wild.quests.q8b.beacons,3);assert.deepEqual(Array.from(wild.quests.q8b.trioKilled),['barb_axe']);
 const trio=wild.monsters.filter(m=>['barb_axe','barb_pole','barb_sword'].includes(m.defId));assert.equal(trio.length,2);
 for(const mon of trio)assert.ok(g.TerrainNavigation.clear(wild.map,mon.x,mon.y,mon.radius));
 assert.equal(wild.flags.echoAwards.absentHero.gold,85);assert.ok(wild.shrines.includes('mines'));
 await g.runtime.checkpoint();assert.deepEqual(Array.from(g.saves.at(-1).campaign.pendingRewards.absentHero),['q7']);
});

test('claimed ordinary caches reset on a new session while active and ready ledgers remain',async()=>{
 const f=await host(),flags={cursedEvents:{claimed:{status:'claimed'},active:{status:'active',layoutVersion:1},ready:{status:'ready',layoutVersion:1,reward:{gold:73,items:[]}}}};
 f.CursedEvents.beginSession(flags);assert.equal(flags.cursedEvents.claimed,undefined);assert.equal(flags.cursedEvents.active.status,'active');assert.equal(flags.cursedEvents.active.layoutVersion,undefined);assert.equal(flags.cursedEvents.ready.reward.gold,73);
});

test('new hosted sessions reset area state and recover saved floor loot without reusing old terrain',async()=>{
 const f=await host(),w=f.runtime.worlds.get('mines');w._activated=true;
 const original=hash(w.map),enemy=w.monsters.find(m=>!m.isBoss),prop=w.map.props.find(p=>p.lootable);
 enemy.dead=true;enemy.hp=0;prop.opened=true;prop.lootable=false;
 const item=f.Items.fromBase('shortsword');item._coopId='kept-floor-item';
 w.ground=[{x:-100,y:-100,surfaceId:99,item,_coopId:'kept-floor-drop'},{x:-100,y:-100,gold:71,_coopId:'kept-gold'}];
 w.map.blocked.fill(1);w.map.walls.fill(1);
 await f.runtime.checkpoint();const campaign=f.saves.at(-1).campaign;
 campaign.flags.dead_korvath=true;campaign.flags.brokenWards={old:true};
 const g=await host(202,campaign),newWorld=g.runtime.worlds.get('mines');
 assert.notEqual(hash(newWorld.map),original);assert.ok(newWorld.monsters.every(m=>!m.dead));assert.ok(newWorld.map.props.some(p=>p.lootable&&!p.opened));
 assert.equal(newWorld.ground.length,2);assert.equal(newWorld.ground[0].item._coopId,'kept-floor-item');assert.equal(newWorld.ground[1].gold,71);
 for(const drop of newWorld.ground){assert.equal(drop.surfaceId,0);assert.ok(g.TerrainNavigation.clear(newWorld.map,drop.x,drop.y,.36));}
 assert.equal(newWorld.flags.brokenWards,undefined);assert.ok(newWorld.flags.dead_korvath);
 const map=newWorld.map;await g.runtime.receive('host',{kind:'resync'});assert.equal(g.runtime.worlds.get('mines').map,map);
});

test('host snapshots contain the authoritative seed and guests reconstruct the same geometry',async()=>{
 const f=await host(303),w=f.runtime.worlds.get('north_wild');
 const snap=f.Game.coop.withWorld(w,()=>f.CoopCodec.snapshot(w,1,1,true));
 assert.equal(snap.sessionSeed,303);assert.equal(snap.layoutVersion,f.MapGen.layoutVersion);assert.equal(snap.layoutSeed,f.U.areaSeed(303,'north_wild'));
 const guest=fixture(),api=vm.runInContext('({MapGen,U})',guest.context),map=api.MapGen.generate(snap.zone,api.U.areaSeed(snap.sessionSeed,snap.zone));
 assert.equal(hash(map),hash(w.map));
});

test('active and ready legacy caches relocate safely and keep surviving guards and rewards',async()=>{
 const f=await host(404),w=f.runtime.worlds.get('north_wild'),p=f.runtime.players.get('host');
 f.Game.coop.withWorld(w,()=>{
  w.player=p;const point=f.MapGen.recoveryPoint(w.map,w.map.spawns.default,.4);
  const prop={...point,propId:'durable-cache',interact:'event',ev:{kind:'curse',count:3,name:'Test seal'}};w.map.props.push(prop);Object.assign(p,point);
  assert.ok(f.CursedEvents.start(w,prop,p));const r=w.flags.cursedEvents[prop.cursedKey],guards=w.monsters.filter(m=>m.cursedKey===r.key);
  guards[0].dead=true;f.CursedEvents.killed(w,guards[0],p);guards[1].hp=Math.ceil(guards[1].maxHp*.4);f.CursedEvents.capture(w);const hp=r.guards[1].hp;
  delete r.layoutSeed;delete r.layoutVersion;delete r.anchorId;r.prop.x=-500;r.prop.y=-500;for(const guard of r.guards){guard.x=-500;guard.y=-500;}
  w.map=f.MapGen.generate('north_wild',505);w.monsters=[];f.CursedEvents.restore(w);f.CursedEvents.restore(w);
  const survivors=w.monsters.filter(m=>m.cursedKey===r.key);assert.equal(survivors.length,2);assert.equal(survivors[0].hp,hp);
  for(const guard of survivors)assert.ok(f.TerrainNavigation.clear(w.map,guard.x,guard.y,guard.radius));
  for(const guard of survivors){guard.dead=true;f.CursedEvents.killed(w,guard,p);}assert.equal(r.status,'ready');
  const reward=JSON.stringify(r.reward);w.map=f.MapGen.generate('north_wild',606);w.monsters=[];f.CursedEvents.restore(w);assert.equal(JSON.stringify(r.reward),reward);
  const cache=w.map.props.find(pr=>pr.cursedKey===r.key);assert.ok(f.TerrainNavigation.clear(w.map,cache.x,cache.y,.4));Object.assign(p,{x:cache.x,y:cache.y,surfaceId:0});
  p.inv=f.Items.makeGrid(10,8);assert.ok(f.CursedEvents.claim(w,cache,p));const gold=p.gold,items=p.inv.items.length;
  f.CursedEvents.restore(w);assert.equal(f.CursedEvents.claim(w,cache,p),false);assert.equal(p.gold,gold);assert.equal(p.inv.items.length,items);
 });
});
