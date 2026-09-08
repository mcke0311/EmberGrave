import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {fixture} from './boss_fixture.mjs';
const f=fixture({gameExports:['setupBeaconQuest','beaconQuestKill','placeEvents','rescuedSurvivors','spawnTrio','syncOptionalQuests']}),
 {Game:G,MapGen:M,Player,Monster,TerrainNavigation:N,DATA:D}=f,T=G.__bossTest,Npc=vm.runInContext('Npc',f.ctx);
let checks=0;const ok=(v,m)=>{checks++;assert.ok(v,m);};
function fresh(zone='north_wild',seed=12345){
 const p=new Player('Frontier quest QA','vanguard'),s=T.freshState(p,seed);s.map=M.generate(zone,seed);s.quests={};s.npcs=[];s.monsters=[];
 Object.assign(p,s.map.spawns.default);p.stats.maxHp=p.hp=1e6;T.setState(s);return s;
}
function returnTo(s,id){s.map=M.generate(id,s.seed);s.monsters=[];T.setState(s);Object.assign(s.player,s.map.spawns.default);T.setupBeaconQuest(s.map);}
for(const order of [[0,1,2],[2,0,1],[1,2,0],[2,1,0]]){
 const s=fresh(),q=s.quests.q8b={state:'active'};T.setupBeaconQuest(s.map);
 const ids=s.map.frontier.anchors.beacons.map(a=>a.id);
 for(const index of order){
  const mon=s.monsters.find(m=>m.beaconId===ids[index]);ok(mon,'missing beacon in requested order');
  T.beaconQuestKill(mon);const count=q.beacons;T.beaconQuestKill(mon);ok(q.beacons===count,'duplicate death counted twice');
  // A reload and map regeneration must keep the actual cleared landmark empty.
  s.quests=JSON.parse(JSON.stringify(s.quests));returnTo(s,'north_wild');
  const restored=s.quests.q8b;ok(restored.beacons===count,'reload lost progress');
  ok(!s.monsters.some(m=>restored.destroyedBeaconIds.includes(m.beaconId)),'destroyed landmark respawned');
  // Continue with the serialized record, as a real re-entry does.
  Object.assign(q,restored);s.quests.q8b=q;
 }
 ok(q.beacons===3&&q.trioSpawned,'three distinct beacons failed');
 const trio=s.monsters.slice();ok(trio.length===3,'Oathsworn missing after re-entry');
 for(const mon of trio){ok(N.findPath(s.map,s.player,mon,{radius:.36}),'unreachable Oathsworn');T.beaconQuestKill(mon);}
 ok(q.state==='reward'&&s.flags.fn_temple_open,'temple did not unlock');
 returnTo(s,'north_wild');ok(!s.monsters.length,'completed beacon encounter respawned');
}
for(const count of [0,1,2,3]){
 const s=fresh();s.quests.q8b={state:'active',beacons:count,trioAnchor:{x:-1000,y:1e6}};
 T.setupBeaconQuest(s.map);const q=s.quests.q8b;
 ok(q.destroyedBeaconIds.length===count&&q.beacons===count,'legacy count migration lost credit');
 if(count===3)ok(s.monsters.every(m=>N.findPath(s.map,s.player,m,{radius:.36})),'legacy trio position was not repaired');
 else ok(s.monsters.length===3-count,'legacy beacon remainder wrong');
}
let s=fresh();s.quests.q7={state:'active',count:0};
for(let i=0;i<8;i++)T.questKillEvent({defId:'frost_risen'});
ok(s.quests.q7.state==='reward','opening wilderness quest blocked');G.completeQuest('q7');
T.syncOptionalQuests();ok(!!s.quests.opt_north_1,'Shardpeak quest not offered');
returnTo(s,'mines');s.quests.q8={state:'active',count:0};
for(const n of s.map.npcs){
 const npc=new Npc(n.id,n.x,n.y,n);s.npcs.push(npc);G.interact(npc);
 const snapshot=JSON.parse(JSON.stringify(s.quests));s.quests=snapshot;
}
ok(s.quests.q8.state==='reward'&&T.rescuedSurvivors().length===3,'survivors failed rescue');
const rescued=T.rescuedSurvivors();returnTo(s,'mines');
ok(s.map.npcs.every(n=>rescued.includes(n.sid)),'survivor IDs changed on regeneration');
G.completeQuest('q8');T.syncOptionalQuests();ok(!!s.quests.opt_north_2,'Deepfreeze quest not offered');
returnTo(s,'shardpeak_shrine');G.acceptQuest('opt_north_1');
for(const spawn of s.map.monsterSpawns.slice(0,15))T.questKillEvent({defId:spawn.id});
ok(s.quests.opt_north_1.state==='reward','15-kill shrine quest failed');
returnTo(s,'deepfreeze_cavern');G.acceptQuest('opt_north_2');T.questKillEvent({defId:'hoarfang'});
ok(s.quests.opt_north_2.state==='reward','Hoarfang quest failed');
returnTo(s,'shattered_temple');s.flags.fn_temple_open=true;s.quests.q9={state:'active'};T.questKillEvent({defId:'korvath'});
ok(s.quests.q9.state==='reward','Korvath quest failed');G.completeQuest('q9');ok(s.shrines.includes('marshcamp'),'next act travel not unlocked');
// Exercise the actual entry/death/revive flow with partially completed old saves.
for(const rescued of [[],['mines_surv_0'],['mines_surv_0','mines_surv_2']]){
 const s=fresh();s.flags.opening={v:2,stage:'done'};s.quests.q8={state:'active',count:rescued.length,rescued:[...rescued]};
 s.quests.q8b={state:'active',beacons:2};s.shrines.push('shardpeak_shrine','deepfreeze_cavern');s.flags.dead_korvath=true;
 ok(await G.enterMap('mines','from_wild'),'legacy mines entry failed');
 ok(s.npcs.filter(n=>n.survivor).length===3-rescued.length,'rescued survivors reappeared');
 for(const npc of [...s.npcs].filter(n=>n.survivor))G.interact(npc);
 ok(s.quests.q8.count===3&&s.quests.q8.state==='reward','partial rescue could not finish');
 await G.enterMap('north_wild','from_mines');ok(s.monsters.filter(m=>m.beacon).length===1,'legacy beacon count lost on entry');
 G.onPlayerDeath();ok(s.player.dead,'death flow failed');ok(await G.returnToTown(),'revive failed');
 ok(!s.player.dead&&s.map.id==='frosthaven','revive did not reach home');
 await G.enterMap('north_wild','from_camp');ok(s.monsters.filter(m=>m.beacon).length===1,'beacon progress lost on death');
 await G.enterMap('shattered_temple','from_wild');ok(!s.monsters.some(m=>m.defId==='korvath'),'completed boss respawned');
 ok(s.shrines.includes('shardpeak_shrine')&&s.shrines.includes('deepfreeze_cavern'),'shrine unlocks lost');
}
for(const zone of ['north_wild','mines','shattered_temple','shardpeak_shrine','deepfreeze_cavern']){
 const a=fresh(zone);T.placeEvents(a.map);const first=a.map.props.filter(p=>p.event).map(p=>({type:p.type,x:p.x,y:p.y}));
 T.placeEvents(a.map);ok(JSON.stringify(first)===JSON.stringify(a.map.props.filter(p=>p.event).map(p=>({type:p.type,x:p.x,y:p.y}))),'events duplicated on revisit');
 for(const p of a.map.props.filter(p=>p.event)){
  ok(a.map.frontier.anchors.events.some(t=>t.x===p.x&&t.y===p.y),'event ignored authored anchor');
  ok(N.findPath(a.map,a.player,p,{radius:.36}),'event unreachable');
 }
 const b=fresh(zone);T.placeEvents(b.map);ok(JSON.stringify(first)===JSON.stringify(b.map.props.filter(p=>p.event).map(p=>({type:p.type,x:p.x,y:p.y}))),'event placement not seeded');
}
const report={status:'PASS',checks,scenarios:['beacon orders and duplicate deaths','reload/re-entry','legacy counts and invalid trio coordinates','main quest chain','three survivor IDs','both optional quests','seeded reserved events']};
if(process.argv.includes('--record')){fs.mkdirSync('tests/qa/frontier',{recursive:true});fs.writeFileSync('tests/qa/frontier/quests.json',JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify(report,null,2));
