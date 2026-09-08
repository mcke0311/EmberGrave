import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {fixture} from './boss_fixture.mjs';
const f=fixture({gameExports:['setupRitualQuest','ritualQuestKill','ritualAnchor','placeEvents','syncOptionalQuests']}),
 {Game:G,MapGen:M,Player,Monster,TerrainNavigation:N,DATA:D}=f,T=G.__bossTest,Npc=vm.runInContext('Npc',f.ctx);
let checks=0;const ok=(v,msg)=>{checks++;assert.ok(v,msg);};
function fresh(zone='marshcamp',seed=12345){
 const p=new Player('Act 2 quest QA','vanguard'),s=T.freshState(p,seed);s.map=M.generate(zone,seed);s.quests={};s.npcs=[];s.monsters=[];
 s.home='marshcamp';s.flags.opening={v:2,stage:'done'};s.shrines=['marshcamp'];
 Object.assign(p,s.map.spawns.default);p.stats.maxHp=p.hp=1e6;T.setState(s);return s;
}
let s=fresh();s.quests.q10={state:'offered'};G.acceptQuest('q10');
for(const def of s.map.npcs){const n=new Npc(def.id,def.x,def.y,def);for(const topic of n.def.talk||[])if(['voice','dreams','fear'].includes(topic.id)){G.storyTopic(n,topic);G.storyTopic(n,topic);}}
ok(s.quests.q10.state==='reward','three interviews failed');G.completeQuest('q10');ok(s.quests.q10.state==='done','q10 turn-in');
G.acceptQuest('q11');ok(await G.enterMap('drowned_crypt','from_wild'),'crypt entry');
let heart=s.monsters.find(m=>m.defId==='drowned_ritual'),anchor=s.map.act2.anchors.ritual;
ok(heart&&heart.x===anchor.x&&heart.y===anchor.y,'ritual heart outside nave');
T.ritualQuestKill(heart);T.ritualQuestKill(heart);T.flush(1);
ok(s.quests.q11.siteDestroyed&&s.monsters.filter(m=>m.defId==='choirmaster').length===1,'heart duplicates or fails to summon Vorthel');
T.ritualQuestKill(s.monsters.find(m=>m.defId==='choirmaster'));ok(s.quests.q11.state==='reward','Vorthel quest');
G.completeQuest('q11');G.acceptQuest('q12');
ok(await G.enterMap('ritual_site','from_wild'),'ritual entry');
const boss=s.monsters.find(m=>m.defId==='mire_mother');Object.assign(s.player,{x:boss.x+2,y:boss.y});boss.encounter.active=true;boss.die(s.player);
const shard=s.map.props.find(p=>p.storyId==='mire_shard');ok(shard.x===s.map.act2.anchors.story.mire_shard.x,'shard ignores authored placement');
G.interact(shard);ok(s.quests.q12.state==='reward','boss and shard recovery '+JSON.stringify({q:s.quests.q12,dead:boss.dead,flags:s.flags}));G.completeQuest('q12');ok(s.shrines.includes('khalcamp'),'Act 3 travel unlock');
ok(await G.enterMap('hollow_reeds','from_wild'),'reeds entry');G.acceptQuest('opt_marsh_1');
for(const spawn of s.map.monsterSpawns.slice(0,15))T.questKillEvent({defId:spawn.id});
ok(s.quests.opt_marsh_1.state==='reward','15 Songless kills');
ok(await G.enterMap('spawn_pools','from_wild'),'pools entry');G.acceptQuest('opt_marsh_2');
s.monsters.find(m=>m.defId==='brood_mother').die(s.player);ok(s.quests.opt_marsh_2.state==='reward','Brood Mother optional quest');

// Restore every partial ritual state, including stale but formerly valid coordinates.
for(const saved of [{state:'active'},{state:'active',siteDestroyed:true,bossAnchor:{x:9,y:8}},
 {state:'active',siteDestroyed:true,bossAnchor:{x:-1e6,y:1e6}},{state:'reward',siteDestroyed:true,bossDead:true},{state:'done',siteDestroyed:true,bossDead:true}]){
 s=fresh();s.quests.q11=JSON.parse(JSON.stringify(saved));
 ok(await G.enterMap('drowned_crypt','from_wild'),'saved quest entry');
 const a=s.map.act2.anchors.ritual,quest=s.monsters.filter(m=>['drowned_ritual','choirmaster'].includes(m.defId));
 ok(quest.length===(saved.bossDead?0:1),'incorrect restored ritual state');
 for(const mon of quest)ok(mon.x===a.x&&mon.y===a.y&&N.findPath(s.map,s.player,mon,{radius:.36}),'saved quest actor unreachable');
 const original=JSON.stringify(s.quests.q11);G.onPlayerDeath();ok(s.player.dead,'actual death');
 ok(await G.returnToTown(),'revive');ok(!s.player.dead&&s.map.id==='marshcamp','wrong home after death');
 await G.enterMap('drowned_crypt','from_wild');ok(JSON.stringify(s.quests.q11)===original,'death reset ritual progress');
}
// Boss-first play cannot bypass Oris, and a later quest completion remains possible.
s=fresh();await G.enterMap('ritual_site','from_wild');const early=s.monsters.find(m=>m.defId==='mire_mother');Object.assign(s.player,{x:early.x+2,y:early.y});early.encounter.active=true;early.die(s.player);
G.interact(s.map.props.find(p=>p.storyId==='mire_shard'));ok(s.quests.q12.state==='active','early boss bypassed q11');
s.quests.q11={state:'done'};D.CAMPAIGN.sync(s);ok(s.quests.q12.state==='reward','early shard recovery became stuck');
await G.enterMap('marshcamp','from_wild');await G.enterMap('ritual_site','from_wild');ok(!s.monsters.some(m=>m.defId==='mire_mother'&&!m.dead),'defeated boss returned');

for(const zone of ['weeping_marsh','drowned_crypt','hollow_reeds','spawn_pools','ritual_site']){
 s=fresh();await G.enterMap(zone,'default');const original=s.map;
 // Both directions of every exit use the production map-entry path.
 for(const exit of original.exits){
  ok(await G.enterMap(exit.target,exit.spawnKey),'travel failed '+zone+'/'+exit.target);
  ok(N.clear(s.map,s.player.x,s.player.y,.36),'unsafe travel arrival');
  await G.enterMap(zone,'default');
 }
 const n=s.map.act2.landmarks[1];Object.assign(s.player,{x:n.x,y:n.y});G.castPortal();
 ok(await G.usePortal(),'outbound portal');ok(s.map.id==='marshcamp','portal wrong home');
 ok(await G.usePortal(),'return portal');ok(s.map===original&&Math.hypot(s.player.x-n.x,s.player.y-n.y)<1,'portal lost map or position');
 if(!s.shrines.includes(zone))s.shrines.push(zone);await G.enterMap('marshcamp','default');await G.travelToShrine(zone);
 ok(s.map.id===zone&&N.clear(s.map,s.player.x,s.player.y,.36),'shrine travel failed');
 for(const p of s.map.props.filter(p=>p.event))ok(s.map.act2.anchors.events.some(a=>a.x===p.x&&a.y===p.y),'random event ignored reservation');
}
const report={status:'PASS',checks,scenarios:['q10 interviews','q11 heart and Vorthel','q12 boss and shard','both optional quests','partial/legacy ritual saves','duplicate heart deaths','actual death/revive','early boss recovery','all exit destinations','portal round trips','shrine travel','reserved events']};
fs.writeFileSync(new URL('qa/act2_redesign/quests.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
