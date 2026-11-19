import assert from 'node:assert/strict';
import {fixture} from './boss_fixture.mjs';

const {Game:G,DATA:D,MapGen:M,Player,TerrainNavigation:N}=fixture({
  gameExports:['interactOnSurface','syncJourneyWorld','syncStoryObjects','pinTargets']
});
const T=G.__bossTest;
const quest=id=>D.QUESTS.find(q=>q.id===id);
function start(id,seed=12345,old=null){
  const q=quest(id),hero=new Player('Pilgrim','vanguard'),s=T.freshState(hero,seed);
  s.map=M.generate(q.zone,seed);s.quests={[id]:old||{state:'offered'}};s.npcs=[];s.monsters=[];
  Object.assign(hero,s.map.spawns.default);T.setState(s);
  if(!old)G.acceptQuest(id);
  return s;
}
const prop=(s,id)=>s.map.props.find(p=>p.journeySite===id);
const touch=(s,id)=>T.interactOnSurface(prop(s,id),true);
const kill=(s,id)=>{const m=s.monsters.find(m=>m.journeyActor===id&&!m.dead);assert.ok(m,id);m.die(s.player);return m;};
for(const [id,def] of Object.entries(D.QUEST_JOURNEYS)){
  const q=quest(id),s=start(id,77,{state:'active',count:q.target-1});
  assert.match(D.questGuide(s,q).next,new RegExp((q.target-1)+'/'+q.target));
  T.questKillEvent({defId:'risen'});assert.equal(s.quests[id].state,'reward',id+' legacy credit');
  G.completeQuest(id);const gold=s.player.gold;G.completeQuest(id);assert.equal(s.player.gold,gold);
  assert.ok(s.quests[id].receipt.length>=3,id+' actual receipt');
  assert.equal(D.CAMPAIGN.site(s,def.finish),false,id+' legacy does not invent a story action');
}
let s=start('q1');assert.equal(touch(s,'watch_bell'),true);assert.equal(touch(s,'watch_bell'),false);
kill(s,'bell_risen_0');kill(s,'bell_risen_1');
const save=JSON.parse(JSON.stringify({flags:s.flags,quests:s.quests}));
s=start('q1',4521);Object.assign(s,save);T.syncJourneyWorld();
assert.deepEqual(Array.from(s.monsters,m=>m.journeyActor),['bell_risen_2']);
for(let i=2;i<6;i++)kill(s,'bell_risen_'+i);
assert.equal(s.quests.q1.state,'reward');assert.equal(prop(s,'watch_bell').completed,true);
s=start('q5');assert.equal(s.map.props.filter(p=>p.journeyClue==='cloth').length,3);
assert.equal(touch(s,'heart_roots'),true);assert.equal(touch(s,'heart_roots'),false);
assert.equal(s.quests.q5.state,'reward');
s=start('opt_north_1');assert.equal(touch(s,'summit'),false);assert.equal(touch(s,'shelter'),true);
for(const seed of [1,2,64,65,1774,4919]){
  s.map=M.generate('shardpeak_shrine',seed);T.syncJourneyWorld();
  const shelter=prop(s,'shelter'),summit=prop(s,'summit');
  const signs=s.map.props.filter(p=>p.journeyClue==='ascent');
  assert.equal(signs.length,2);assert.ok(Math.hypot(signs[0].x-signs[1].x,signs[0].y-signs[1].y)>4,'signs mark separate trails');
  function distance(from,to){
    const path=N.findPath(s.map,from,to,{radius:.36});assert.ok(path,'connected ascent');
    let length=0,previous=from;
    for(const n of path){const point={x:n.cx,y:n.cy};length+=Math.hypot(point.x-previous.x,point.y-previous.y);previous=point;}
    return length;
  }
  const lengths={};
  for(const branch of ['lee','windward']){
    const node=s.map.frontier.landmarks.find(n=>n.id===branch);
    lengths[branch]=distance(shelter,node)+distance(node,summit);
  }
  const guards=id=>s.map.monsterSpawns.filter(m=>m.landmarkId===id).length;
  assert.ok(lengths.windward<lengths.lee*.9&&guards('windward')>guards('lee'),'the guarded route is a real shortcut');
}
touch(s,'summit');assert.equal(s.quests.opt_north_1.state,'reward');
assert.equal(s.map.lights.filter(l=>l.questLamp).length,1);T.syncJourneyWorld();assert.equal(s.map.lights.filter(l=>l.questLamp).length,1);
for(const flank of [false,true]){
  s=start('opt_desert_1',42);
  const captain=s.monsters.find(m=>m.journeyActor==='quarry_captain'),initial=captain.hp;
  assert.ok(s.monsters.every(m=>m.packId===captain.packId&&m.familyHome.routine==='patrol'));
  captain.takeDamage(12,s.player);const guarded=initial-captain.hp;
  if(flank){kill(s,'quarry_left');const hp=captain.hp;captain.takeDamage(12,s.player);assert.ok(hp-captain.hp>guarded);}
  kill(s,'quarry_captain');assert.equal(s.quests.opt_desert_1.state,'reward');
  assert.ok(s.monsters.find(m=>m.journeyActor==='quarry_right').questDormant);
  s.map=M.generate('shard_flats',84);s.monsters=[];T.syncJourneyWorld();
  assert.equal(s.monsters.filter(m=>!m.dead).length,0);assert.equal(s.monsters.filter(m=>m.questDormant).length,flank?1:2);
}
s=start('opt_marsh_1');delete s.quests.opt_marsh_1;
T.questKillEvent({defId:'choir_herald'});assert.equal(D.CAMPAIGN.site(s,'shrine_herald'),false);
T.questKillEvent({defId:'choir_herald',journeyActor:'shrine_herald'});s.quests.opt_marsh_1={state:'offered'};G.acceptQuest('opt_marsh_1');
assert.equal(s.quests.opt_marsh_1.state,'reward','early designated kill survives acceptance');
assert.equal(s.npcs.find(n=>n.reedCutter).name,'Anwen, Reed-cutter');
for(const id of ['opt_marsh_2','opt_desert_2']){
  s=start(id);const q=quest(id),place=s.map.props.find(p=>p.aftermath===q.target);
  assert.ok(place&&!place.completed);
  s.flags['dead_'+q.target+'@0']=true;T.syncStoryObjects();assert.equal(place.interact,'hunt_lore');
  assert.equal(place.completed,true);assert.equal(T.interactOnSurface(place,true),true);
}
s=start('q5');G.pinQuest('q5');s.map.explored.fill(0);
assert.equal(T.pinTargets().length,0);const roots=prop(s,'heart_roots');s.map.explored[(roots.x|0)+(roots.y|0)*s.map.w]=1;
assert.equal(T.pinTargets()[0],roots);G.pinQuest(null);assert.equal(G.pinnedQuest(),null);
for(const q of D.QUESTS){s.quests[q.id]={state:'offered'};assert.ok(D.questGuide(s,q).next.length>10,q.name);}
s.quests.q11.state='done';s.quests.q12.state='active';s.flags['dead_mire_mother@0']=true;
assert.equal(D.questGuide(s,quest('q12')).zone,'arena_mire_mother','the exposed shard is inside the arena');
s.quests.q17.state='reward';assert.equal(D.questGuide(s,quest('q17')).target,'story:hell_portal');
s.quests.q18={state:'reward'};assert.match(D.questGuide(s,quest('q18')).next,/Cinder-Core/);
G.completeQuest('q18');assert.equal(s.quests.q18.state,'reward','the ending decision precedes the final reward');
s.quests.q18.state='active';
s.monsters=[{defId:'vethriss',encounter:{active:false,phase:0}}];
assert.doesNotMatch(D.questGuide(s,quest('q18')).next,/serpent|shadow|wounded/);
s.monsters[0].encounter.active=true;
for(const [i,word] of ['wounded','serpent','shadow'].entries()){
  s.monsters[0].encounter.phase=i;assert.match(D.questGuide(s,quest('q18')).next,new RegExp(word));
}
s.quests.q8b={state:'active'};assert.match(D.questGuide(s,quest('q8b')).next,/Shatter/);
console.log('PASS five field encounters, legacy saves and rewards, shuffled routes, early credit, map fog and all 25 quest guides');
