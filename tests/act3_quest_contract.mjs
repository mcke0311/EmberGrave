import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {fixture} from './boss_fixture.mjs';
const f=fixture({gameExports:['syncStoryObjects','campaignEvent','propVisualType']}),{Game:G,MapGen:M,DATA:D,Player,Monster}=f;
const Npc=vm.runInContext('Npc',f.ctx),C=D.CAMPAIGN;let checks=0;
const ok=(v,msg)=>{checks++;assert.ok(v,msg);};
function world(zone,seed=12345){const p=new Player('Act III QA','vanguard'),s=G.__bossTest.freshState(p,seed);s.map=M.generate(zone,seed);s.npcs=[];s.monsters=[];s.quests={};G.__bossTest.setState(s);return s;}
function start(s,id){s.quests[id]={state:'offered'};G.acceptQuest(id);}
let s=world('underground_market');start(s,'q13');G.__bossTest.campaignEvent({kind:'enter',zone:s.map.id,target:s.map.id});
const relay=s.map.props.find(p=>p.storyId==='market_relay_0');
ok(G.__bossTest.propVisualType(relay)==='relay_active','active relay artwork');
s.monsters=[new Monster('gilt_construct',relay.x+2,relay.y)];G.interact(relay);ok(!C.found(s,s.map.id,relay.storyId),'guarded relay disabled early');
s.monsters=[];G.interact(relay);G.interact(relay);ok(!relay.interact&&G.__bossTest.propVisualType(relay)==='relay_disabled','relay did not become inert');
const partial=JSON.parse(JSON.stringify({quests:s.quests,flags:s.flags}));
s=world('underground_market',999);Object.assign(s,partial);G.__bossTest.syncStoryObjects();
ok(s.map.props.find(p=>p.storyId==='market_relay_0').visualType==='relay_disabled','partial relay save lost');
ok(s.map.props.filter(p=>p.storyId&&p.interact).length===2,'partial relay save completed neighbors');
for(let i=0;i<6;i++)G.__bossTest.questKillEvent({defId:'gilt_construct'});
for(const p of s.map.props.filter(p=>p.storyId&&p.interact))G.interact(p);
ok(s.quests.q13.state==='reward','market quest not completable');
s=world('sand_tombs');start(s,'q14');const scholar=s.map.npcs.find(n=>n.storyId);s.npcs=[new Npc(scholar.id,scholar.x,scholar.y,scholar)];
G.interact(s.npcs[0]);ok(C.found(s,'sand_tombs','imprisoned_scholar'),'scholar rescue absent');
const walls=s.map.walls.join(',');s.map=M.generate('sand_tombs',567);ok(s.map.walls.join(',')!==walls,'tomb layout did not vary');
s.npcs=s.map.npcs.map(n=>new Npc(n.id,n.x,n.y,n));G.__bossTest.syncStoryObjects();ok(!s.npcs.some(n=>n.storyId),'rescued scholar returned on shifted map');
const rescued=JSON.parse(JSON.stringify({quests:s.quests,flags:s.flags}));s=world('khal_palace');Object.assign(s,rescued);s.quests.q14={state:'done'};start(s,'q15');
const map=s.map.props.find(p=>p.storyId==='fortress_map');G.interact(map);ok(!C.found(s,'khal_palace','fortress_map'),'fortress map bypassed living boss');
s.flags['dead_azram@0']=true;G.__bossTest.questKillEvent({defId:'azram'});G.interact(map);ok(s.quests.q15.state==='reward','palace quest cannot complete');
ok(C.found(s,'khal_palace','fortress_map'),'map recovery not recorded');
const saved=JSON.parse(JSON.stringify({quests:s.quests,flags:s.flags}));s=world('khal_palace',987);Object.assign(s,saved);G.__bossTest.syncStoryObjects();
ok(!s.map.props.find(p=>p.storyId==='fortress_map').interact,'map recovery repeatable after load');
ok(s.flags['dead_azram@0'],'boss death lost');
s=world('shard_flats');s.quests.q13={state:'done'};start(s,'opt_desert_1');
for(const spawn of s.map.monsterSpawns.slice(0,15))G.__bossTest.questKillEvent({defId:spawn.id});
ok(s.quests.opt_desert_1.state==='reward','fifteen-kill Shard Flats objective cannot complete');
s=world('tomb_sanctum');s.quests.q14={state:'done'};start(s,'opt_desert_2');
G.__bossTest.questKillEvent({defId:'chained_sovereign'});
ok(s.quests.opt_desert_2.state==='reward','Sovereign objective cannot complete');
// Exercise the production travel path, including return keys, shrine arrivals,
// cached maps and the shifting tomb exception with isolated in-memory saves.
s=world('khalcamp');
for(const zone of ['desert_wastes','underground_market','sand_tombs','khal_palace','shard_flats','tomb_sanctum']){
 const key=zone==='desert_wastes'?'from_camp':'from_wild';
 ok(await G.enterMap(zone,key),'entry failed '+zone);ok(G.state.map.id===zone,'wrong destination');
 const current=G.state.map,back=current.exits[0];ok(await G.enterMap(back.target,back.spawnKey),'return failed '+zone);
 ok(await G.enterMap(zone,'shrine'),'shrine failed '+zone);
 ok(await G.enterMap('khalcamp','portal'),'portal arrival failed');
}
ok(await G.enterMap('sand_tombs','from_wild'),'tomb first visit');const first=G.state.map;
ok(await G.enterMap('desert_wastes','from_tombs'),'leave tomb');ok(await G.enterMap('sand_tombs','from_wild'),'tomb second visit');
ok(first!==G.state.map,'shifting tomb reused its map');
ok(D.ACTS.find(a=>a.id===3).next==='cathedral1','Act IV progression changed');
const report={status:'PASS',checks,coverage:'Relays and guards, partial saves, scholar rescue and regeneration, boss/map prerequisite, saved recovery, production travel and shrine/portal arrivals.'};
fs.mkdirSync('tests/qa/act3',{recursive:true});fs.writeFileSync('tests/qa/act3/quests.json',JSON.stringify(report,null,2)+'\n');console.log(report);
