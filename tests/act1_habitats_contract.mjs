import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {fixture} from './boss_fixture.mjs';

const f=fixture({dataSeed:7331,gameExports:['updatePropSpawners','spawnPropMonster','enemiesByFamily']});
const {DATA:D,MapGen:M,Game:G,Player,Monster,Items,U,TerrainNavigation:N}=f;
const P=vm.runInContext('PropInteractions',f.ctx);
vm.runInContext(fs.readFileSync('js/coop_codec.js','utf8'),f.ctx);
const C=vm.runInContext('CoopCodec',f.ctx);
let checks=0;const ok=(v,label)=>{checks++;assert.ok(v,label);};
const zones=['north_wild','mines','shattered_temple','shardpeak_shrine','deepfreeze_cavern'];
for(const seed of [0,1,123,12345,4294967295,71,91,812,1024,8675309])for(const zone of zones){
  const m=M.generate(zone,seed);M.placeEvents(m,{seed});
  const again=M.generate(zone,seed);M.placeEvents(again,{seed});
  ok(JSON.stringify(m.props)===JSON.stringify(again.props),zone+' deterministic props');
  ok(new Set(m.props.map(p=>p.propId)).size===m.props.length,zone+' unique stable identities');
  if(zone==='mines'){
    ok(!m.monsterSpawns.some(s=>D.monsterFamily(s.id)==='shardbound'),'no mine shardbound enemies');
    ok(!m.props.some(p=>p.familySite==='shardbound'),'no mine shardbound ritual sites');
    const crystals=m.props.filter(p=>p.behavior==='crystal');
    ok(crystals.length===10&&crystals.length===m.frontier.encounters.filter(e=>e.role==='crystal').length,'one crystal per former pack');
    ok(crystals.every(p=>['haul','ore','cache'].includes(p.landmarkId)),'correct crystal landmarks');
    ok(!D.ZONES.mines.spawns.some(id=>D.monsterFamily(id)==='shardbound'),'mine event pool excludes shardbound');
  }
  for(const den of m.props.filter(p=>p.behavior==='wolf_den')){
    ok(den.breakable&&den.displayScale===1.75&&den.spawnCooldown===6,'destructible enlarged den');
    ok(M.denBoundary(m).some(p=>p.x===den.x&&p.y===den.y),'outer playable boundary');
    ok(!!N.findPath(m,m.spawns.default,den,{hop:false}),'reachable den');
    ok(!P.nearRamp(m,den.x,den.y),'den clears ramps');
    ok(Object.values(m.spawns).every(p=>U.dist(p.x,p.y,den.x,den.y)>=8),'den clears arrivals');
  }
  if(zone==='shardpeak_shrine'){
    const buildings=m.props.filter(p=>p.building&&p.artZone==='shardpeak');
    ok(buildings.length===4,'four mountain landmarks (entry retains its passage)');
    ok(new Set(buildings.map(p=>p.type)).size===4,'four distinct mountain objects');
  }
  for(const id of ['ev_amb1','ev_amb4']){
    const p=M.eventProp(m,D.EVENTS.find(e=>e.id===id),20,20);
    ok(p.breakable&&!p.interact&&p.behavior,'Act I habitat events use breaking');
    ok(P.profile(p).state==='kick','nest and den use kick gesture');
  }
}
const other=M.generate('weeping_marsh',123);
ok(!M.eventProp(other,D.EVENTS.find(e=>e.id==='ev_amb1'),20,20).behavior,'other acts keep ambushes');
ok(D.ZONES.north_wild.spawns.some(id=>D.monsterFamily(id)==='shardbound'),'Shardbound retained outside mine');

function scene(){
  const player=new Player('Habitat QA','vanguard'),s=G.__bossTest.freshState(player,123);
  s.map=M.generate('north_wild',123);const m=s.map;m.walls.fill(0);m.blocked.fill(0);m.elev.fill(0);m.hazard.fill(0);m.surfaceVersion=0;
  delete m.layers;m.props=[];s.monsters=[];player.x=20.5;player.y=20.5;player.hp=player.stats.maxHp=1e6;G.__bossTest.setState(s);
  return {s,p:player,m};
}
function prop(m,behavior){const p={type:behavior==='crystal'?'mine_crystal':'grave',behavior,propId:'qa:'+behavior,x:21.7,y:20.5,blocks:false,breakable:true,seed:33,...(behavior==='wolf_den'?{propFamily:'den',spawnCooldown:6,displayScale:1.75}:behavior==='spider_nest'?{propFamily:'nest'}:{visualDone:'mine_crystal_broken'})};m.props.push(p);return p;}
function rollFirst(value,run){const random=f.ctx.Math.random;let first=true;f.ctx.Math.random=()=>{if(first){first=false;return value;}return random();};try{return run();}finally{f.ctx.Math.random=random;}}
for(const [roll,count]of [[0,1],[.09999,1],[.1,0],[.999,0]]){
  const {s,p,m}=scene(),crystal=prop(m,'crystal');
  rollFirst(roll,()=>G.breakProp(crystal,p));
  ok(s.ground.length===count,'crystal exact chance boundary '+roll);
  ok(!count||s.ground[0].item.kind==='jewel','only a jewel');
  ok(crystal.broken&&P.visualType(crystal)==='mine_crystal_broken','crystal fragments');
  ok(!G.breakProp(crystal,p)&&s.ground.length===count,'no repeat crystal reward');
}
for(const [roll,spiders,items]of [[0,1,0],[.39999,1,0],[.4,0,1],[.79999,0,1],[.8,0,0],[.999,0,0]]){
  const {s,p,m}=scene(),nest=prop(m,'spider_nest');
  rollFirst(roll,()=>G.breakProp(nest,p));
  ok(s.monsters.length===spiders&&s.ground.length===items,'nest outcome '+roll);
  ok(!items||s.ground[0].item.rarity==='common','nest item has normal quality');
  ok(!spiders||s.monsters[0].defId==='crypt_widow','actual spider, no local-family substitution');
  ok(!G.breakProp(nest,p),'nest single use');
}
{
  const rollDrops=Items.rollDrops;
  try{
    for(const drops of [[],[{gold:40}],[{item:Items.makeJewel(30)}],[{item:Items.makeConsumable('idscroll')}]] ){
      const {s,p,m}=scene(),nest=prop(m,'spider_nest');p.stats.mf=10000;
      Items.rollDrops=()=>drops;
      rollFirst(.5,()=>G.breakProp(nest,p));
      ok(s.ground.length===1&&s.ground[0].item.rarity==='common','nest guarantees one common item even with empty or higher-quality table results');
      if(drops[0]?.item?.rarity==='common')ok(s.ground[0].item.baseId==='idscroll','nest uses the eligible table item');
    }
  }finally{Items.rollDrops=rollDrops;}
}
{
  const {s,p,m}=scene(),den=prop(m,'wolf_den');
  const tick=(dt)=>{s.time+=dt;G.__bossTest.updatePropSpawners(dt);};
  tick(5.99);ok(!s.monsters.length,'no early wolf');tick(.01);ok(s.monsters.length===1,'six second wolf');
  ok(s.monsters[0].defId==='ice_lurker'&&s.monsters[0].name==='Icefang Wolf'&&s.monsters[0].denId===den.propId,'wolf identity and owner');
  for(let i=0;i<3;i++)tick(6);ok(s.monsters.length===4,'four wolves');
  tick(120);ok(s.monsters.length===4,'cap without backlog');s.monsters[0].dead=true;
  tick(5.99);ok(s.monsters.length===4,'no queued burst');tick(.01);ok(s.monsters.length===5,'replacement after interval');
  p.x=60;tick(120);ok(s.monsters.length===5&&den.spawnCooldown===6,'far pauses spawning');
  p.x=20.5;s.monsters=[];p.dead=true;tick(10);ok(!s.monsters.length,'dead heroes do not activate');p.dead=false;
  p.surfaceId=1;tick(10);ok(!s.monsters.length,'other layers do not activate');p.surfaceId=0;
  p.connected=false;tick(10);ok(!s.monsters.length,'disconnected players do not activate');p.connected=true;
  tick(600);ok(s.monsters.length===1,'long tick only emits one');
  G.breakProp(den,p);tick(60);ok(s.monsters.length===1&&s.ground.length===0,'destroying den stops spawning without killing wolves or paying cache');
}
{
  const {s,p,m}=scene(),den=prop(m,'wolf_den');
  for(let y=0;y<m.h;y++)m.blocked[21+y*m.w]=1;
  s.time+=6;G.__bossTest.updatePropSpawners(6);ok(!s.monsters.length&&den.spawnCooldown===6,'wall-separated hero cannot activate');
  m.blocked.fill(1);m.blocked[(p.x|0)+(p.y|0)*m.w]=0;ok(!G.__bossTest.spawnPropMonster(den,'ice_lurker'),'no unsupported spawn fallback');
}
{
  const {s,p,m}=scene(),crystal=prop(m,'crystal');
  G.interact(crystal);s.time+=.1;P.update(s);ok(!crystal.broken,'no reward before kick contact');
  P.cancel(s);s.time+=1;P.update(s);ok(!crystal.broken,'interrupted kick leaves crystal');
  G.interact(crystal);const action=p.action;G.interact(crystal);ok(p.action===action,'repeat click preserves gesture');
  rollFirst(.9,()=>{s.time+=.28;P.update(s);});ok(crystal.broken,'kick commits at contact');
  const nest=prop(m,'spider_nest');rollFirst(.9,()=>G.breakPropsNear(nest.x,nest.y,2));ok(nest.broken,'area attack breaks habitat');
}
{
  const {s,p,m}=scene(),crystal=prop(m,'crystal'),den=prop(m,'wolf_den');den.x=25;den.spawnCooldown=2;
  rollFirst(.9,()=>G.breakProp(crystal,p));const rows=m.props.map(p=>C.encode(p,true));
  const restored=M.generate('north_wild',123);restored.props=[{...den,spawnCooldown:6},{...crystal,broken:false,breakable:true}];
  C.restoreProps(restored,rows);ok(restored.props[1].broken&&!restored.props[1].breakable&&restored.props[0].spawnCooldown===2,'restore matches identities after reordering');
  const legacy={type:'family_site',familySite:'icefang',territoryId:'deep:icefang',spent:true,x:10,y:10};
  restored.props=[{...den,propId:M.propIdentity(restored,legacy),spent:false,x:35}];C.restoreProps(restored,[legacy]);
  ok(!restored.props[0].spent&&restored.props[0].x===35,'legacy deserted site cannot overwrite new den');
  const wolf=G.__bossTest.spawnPropMonster(den,'ice_lurker');wolf._coopId='saved_wolf';wolf.hp=7;wolf._coopScaled=true;
  const saved=C.propMonsters(s);s.monsters=[];C.restorePropMonsters(s,saved);C.restorePropMonsters(s,saved);
  ok(s.monsters.length===1&&s.monsters[0].hp===7&&s.monsters[0].denId===den.propId,'live den wolf restores once with health and owner');
}
{
  const frame={id:'unused',propCrop:true,sw:92,sh:80,anchorX:46,anchorY:76},b=P.bounds(frame,100,200,false,1.75);
  ok(b.w===161&&b.h===140&&b.x===19.5&&b.y===67,'enlarged hit bounds remain ground anchored');
}
{
  const {s,p,m}=scene(),den=prop(m,'wolf_den');den.territoryId='qa-territory';den.familySite='icefang';
  m.ecology={territories:[{id:den.territoryId,family:'icefang',packs:['resident-pack']}]};
  const resident=new Monster('ice_lurker',24,20.5,{packId:'resident-pack'});s.monsters=[resident];resident.die(p);
  ok(!den.spent&&!den.broken&&den.breakable,'killing the territory does not disable its den');
  s.time+=6;G.__bossTest.updatePropSpawners(6);ok(s.monsters.some(m=>!m.dead&&m.denId===den.propId),'cleared territory still produces wolves');
}
console.log('PASS',checks,'Act I habitat placement, probabilities, spawning, gestures, persistence and geometry checks');
