import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {fixture} from './boss_fixture.mjs';
const f=fixture({gameExports:['placeEvents','safeArrival','usePortal','portalPositions']}),{Game:G,MapGen:M,Player,Monster,TerrainNavigation:N}=f,T=G.__bossTest;
let checks=0;const ok=(v,m)=>{checks++;assert.ok(v,m);};
function fresh(zone='hellgate',seed=12345){
 const p=new Player('Cinders campaign QA','vanguard'),s=T.freshState(p,seed);
 s.map=M.generate(zone,seed);s.flags.opening={v:2,stage:'done'};s.home='hellgate';s.quests={q18:{state:'active'}};s.npcs=[];s.monsters=[];
 Object.assign(p,s.map.spawns.default);p.hp=p.stats.maxHp=1e6;T.setState(s);return s;
}
for(const seed of [1,12345,8675309]){
 const s=fresh('hellgate',seed);
 for(const [from,to] of [['hellgate','ash_wastes'],['ash_wastes','cinder_bastion'],['cinder_bastion','ash_wastes'],['ash_wastes','throne'],['throne','ash_wastes'],['ash_wastes','hellgate']]){
  ok(s.map.id===from,'incorrect travel source');const e=s.map.exits.find(e=>e.target===to);
  ok(e,'missing exit '+from+'→'+to);ok(N.findPath(s.map,s.player,{x:(e.x0+e.x1)/2,y:(e.y0+e.y1)/2},{radius:.36}),'unreachable exit');
  ok(await G.enterMap(to,e.spawnKey),'travel failed '+from+'→'+to);
  ok(N.clear(s.map,s.player.x,s.player.y,.36),'arrival blocked');
  ok(!s.map.exits.some(e=>s.player.x>=e.x0&&s.player.x<=e.x1&&s.player.y>=e.y0&&s.player.y<=e.y1),'arrival retriggers exit');
 }
 for(const zone of ['ash_wastes','cinder_bastion','throne']){
  await G.enterMap(zone,'default');const shrine=s.map.props.find(p=>p.interact==='shrine');G.interact(shrine);
  ok(s.shrines.includes(zone),'shrine attunement failed');await G.enterMap('hellgate','default');
  ok(await G.travelToShrine(zone),'shrine travel failed');ok(N.clear(s.map,s.player.x,s.player.y,.36),'unsafe shrine arrival');
  const position={x:s.player.x,y:s.player.y};G.castPortal();ok(s.portal?.mapId===zone,'portal not created');
  const portals=T.portalPositions();const outbound=portals.find(p=>p.target==='hellgate'||p.home||p.kind==='field')||portals[0];
  ok(outbound,'portal not visible');
  ok(await G.usePortal(),'outbound portal travel failed');ok(s.map.id==='hellgate','portal missed home');
  ok(await G.usePortal(),'return portal travel failed');ok(s.map.id===zone,'portal missed source map');
  ok(Math.hypot(s.player.x-position.x,s.player.y-position.y)<.01,'portal return moved the hero');
  G.onPlayerDeath();ok(s.player.dead,'death failed');ok(await G.returnToTown(),'revival failed');
  ok(s.map.id==='hellgate'&&!s.player.dead,'wrong revival hub');
 }
 s.flags['dead_vethriss@0']=true;s.monstersByMap.throne=null;
 await G.enterMap('throne','from_wild');ok(!s.monsters.some(m=>m.defId==='vethriss'),'completed boss respawned');
 const record=JSON.parse(JSON.stringify({quests:s.quests,flags:s.flags,shrines:s.shrines,seed:s.seed,difficulty:s.difficulty}));
 const restored=fresh('hellgate',seed);Object.assign(restored,record);await G.enterMap('throne','from_wild');
 ok(!restored.monsters.some(m=>m.defId==='vethriss')&&restored.shrines.includes('cinder_bastion'),'serialized progression lost');
}
for(const ending of ['destroy','seal','give']){
 const s=fresh('throne');s.quests.q18={state:'reward'};s.flags['dead_vethriss@0']=true;G.recordEnding(ending);
 ok(s.flags.ending===ending&&s.flags.sagaComplete&&s.unlockedDiff===1,'finale failed '+ending);
}
for(const zone of ['ash_wastes','cinder_bastion','throne']){
 const s=fresh(zone);T.placeEvents(s.map);const signature=JSON.stringify(s.map.props.filter(p=>p.event));T.placeEvents(s.map);
 ok(JSON.stringify(s.map.props.filter(p=>p.event))===signature,'event placement changed on revisit');
 for(const p of s.map.props.filter(p=>p.event))ok(s.map.composition.anchors.events.some(a=>a.x===p.x&&a.y===p.y)&&N.findPath(s.map,s.player,p,{radius:.36}),'event escaped safe anchors');
}
const report={status:'PASS',checks,seeds:3,scenarios:['all bidirectional exits','safe arrivals outside triggers','shrine attunement and travel','town portal return coordinates','death and revival','serialized boss and shrine progress','three endings','seeded event anchors']};
if(process.argv.includes('--record')){fs.mkdirSync('tests/qa/cinders',{recursive:true});fs.writeFileSync('tests/qa/cinders/gameplay.json',JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify(report,null,2));
