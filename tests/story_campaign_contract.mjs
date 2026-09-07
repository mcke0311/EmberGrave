import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const store=new Map(), messages=[];
const ctx=vm.createContext({console,Math,Date,performance,Uint8Array,Uint16Array,Uint32Array,Float32Array,Uint8ClampedArray,Set,Map,JSON,setTimeout,clearTimeout,
  window:{addEventListener(){}},
  document:{createElement:()=>({getContext:()=>({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){}})})},
  localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},
  Sfx:new Proxy({vol:{}},{get:(t,k)=>t[k]||(()=>{})}), Player3D:{assets:{}},
  UI:new Proxy({msg:t=>messages.push(t)},{get:(t,k)=>t[k]||(()=>{})}),
});
for(const f of ['utils','data','data_overrides','boss_encounters','skill_perks','sprite_manifest','mapgen','navigation','items','entities'])vm.runInContext(fs.readFileSync(new URL('../js/'+f+'.js',import.meta.url),'utf8'),ctx);
let gameSource=fs.readFileSync(new URL('../js/game.js',import.meta.url),'utf8');
gameSource=gameSource.replace('    init, newGame, loadGame,','    __test:{freshState,setState:s=>state=s,questKillEvent,campaignEvent,syncStoryObjects,setupRitualQuest},\n    init, newGame, loadGame,');
vm.runInContext(gameSource,ctx);
const {DATA:D,Game:G,MapGen:M,Monster,Npc,Player,TerrainNavigation:N}=vm.runInContext('({DATA,Game,MapGen,Monster,Npc,Player,TerrainNavigation})',ctx);
const C=D.CAMPAIGN,q=id=>D.QUESTS.find(q=>q.id===id);
let checks=0;const ok=(v,msg)=>{checks++;assert.ok(v,msg)};
function fresh(zone='marshcamp') {
  const p=new Player('Story QA','vanguard'),s=G.__test.freshState(p,123);
  s.map=M.generate(zone,123);s.npcs=[];s.monsters=[];s.minions=[];s.quests={};
  p.x=s.map.bossArena?s.map.bossArena.cx+2:s.map.spawns.default.x;p.y=s.map.bossArena?s.map.bossArena.cy:s.map.spawns.default.y;
  G.__test.setState(s);return s;
}
function activate(s,id){s.quests[id]={state:'offered'};G.acceptQuest(id)}
function event(s,kind,zone,target){C.record(s,{kind,zone,target})}
let s=fresh();activate(s,'q10');
const sella=new Npc('villager_fisher',1,1,{npcArt:'resident_marshcamp_3',displayName:'Sella'});
ok(sella.def.talk[0].silent,'lost voice must use written testimony');
G.storyTopic(sella,sella.def.talk[0]);G.storyTopic(sella,sella.def.talk[0]);
ok(C.count(s,C.objectives(q('q10'))[0])===1,'duplicate testimony counted twice');
G.storyTopic(sella,{id:'dreams'});ok(s.quests.q10.state==='active','forged/unrelated topic counted');
event(s,'talk','frosthaven','dreams');event(s,'kill','marshcamp','quieting_ritual');
ok(s.quests.q10.state==='active','wrong zone or ritual kill completed investigation');
event(s,'talk','marshcamp','dreams');event(s,'talk','marshcamp','fear');
ok(s.quests.q10.state==='reward','three distinct interviews did not finish investigation');
const old=s.quests.q10;G.acceptQuest('q10');ok(s.quests.q10===old,'accept reset completed progress');

s=fresh('underground_market');activate(s,'q13');
event(s,'enter','underground_market','underground_market');
for(let i=0;i<20;i++)G.__test.questKillEvent({defId:'sand_raider'});
ok(C.count(s,C.objectives(q('q13'))[1])===0,'generic kills substituted for constructs');
for(let i=0;i<6;i++)G.__test.questKillEvent({defId:'gilt_construct'});
for(const prop of s.map.props.filter(p=>p.storyId))G.interact(prop);
ok(s.quests.q13.state==='reward','market objectives failed');
ok(s.map.props.filter(p=>p.storyId).every(p=>!p.interact),'relays remain repeatable');

s=fresh('sand_tombs');activate(s,'q14');
for(let i=0;i<16;i++)G.__test.questKillEvent({defId:'tomb_guard'});
ok(s.quests.q14.state==='active','kills still rescue the scholar');
const scholar=s.map.npcs.find(n=>n.storyId);
s.npcs=[new Npc(scholar.id,scholar.x,scholar.y,{...scholar})];G.interact(s.npcs[0]);
ok(s.quests.q14.state==='reward'&&s.npcs.length===0,'scholar rescue not recorded/removed');
const loaded=JSON.parse(JSON.stringify({quests:s.quests,flags:s.flags,difficulty:s.difficulty}));
ok(C.found(loaded,'sand_tombs','imprisoned_scholar'),'scholar rescue lost in serialization');
activate(s,'q16');s.map=M.generate('cathedral1',456);
const angel=new Monster('empty_archangel',s.player.x+2,s.player.y);
angel.takeDamage(1e8,s.player);ok(!angel.dead&&angel.hp===angel.maxHp,'false angel skipped soul rescue');
angel.scorch={until:100,dps:1e8};angel.update(1,s.player,s.map);angel.die(s.player);
ok(!angel.dead,'damage over time/execute bypassed soul rescue');angel.scorch=null;
for(const n of s.map.npcs.filter(n=>n.storyId))G.interact(new Npc(n.id,n.x,n.y,n));
ok(!G.bossWard(angel),'souls failed to release false angel ward');
G.__test.questKillEvent(angel);ok(s.quests.q16.state==='reward','souls plus boss did not complete q16');

s=fresh('cathedral2');activate(s,'q17');
s.quests.q16={state:'done'};
const king=new Monster('malthoron',s.player.x+2,s.player.y);
ok(!!G.bossWard(king),'Hollow King bypasses seals/sword');
for(const p of s.map.props.filter(p=>p.storyId&&p.storyId!=='hell_portal'))G.interact(p);
for(let i=0;i<3;i++)G.__test.questKillEvent({defId:'choir_priest'});
ok(!G.bossWard(king),'all cathedral objectives failed to remove ward');
G.__test.questKillEvent(king);ok(s.quests.q17.state==='reward','cathedral objectives did not complete q17');

// Boss kills before acceptance must leave a collectible, never an unwinnable quest.
s=fresh('ritual_site');G.__test.questKillEvent({defId:'mire_mother'});
ok(s.quests.q12.state==='active','early boss kill skipped shard recovery');
const shard=s.map.props.find(p=>p.storyId==='mire_shard');G.interact(shard);
ok(s.quests.q12.state==='active','live boss did not guard shard');
s.flags['dead_mire_mother@0']=true;G.interact(shard);
ok(s.quests.q12.state==='active','early boss bypassed Oris’s investigation/Choir chain');
s.quests.q11={state:'done'};C.sync(s);
ok(s.quests.q12.state==='reward','early Mire Mother kill left quest stuck');
G.interact(shard);ok(C.count(s,q('q12').objectives[1])===1,'shard duplicated');
s=fresh();s.quests.q14={state:'done',count:16};C.sync(s);ok(s.quests.q14.state==='done','legacy completed quest regressed');

// All generated objectives resolve installed art and are reachable across seeds.
for(const seed of [0,1,123,4294967295])for(const zone of Object.keys(D.STORY_OBJECTS)){
  const m=M.generate(zone,seed),objects=[...m.npcs,...m.props].filter(o=>o.storyId);
  ok(objects.length===D.STORY_OBJECTS[zone].length,zone+' missing story objects');
  for(const obj of objects){
    const path=N.findPath(m,m.spawns.default,obj,{hop:true,radius:.36,speed:4.5});
    ok(path!==null,zone+'/'+obj.storyId+' unreachable for seed '+seed);
    const art=obj.npcArt?D.SPRITE_MANIFEST.maps.npcs[obj.npcArt]:D.SPRITE_MANIFEST.maps.props[obj.type];
    ok(!!D.SPRITE_MANIFEST.entries[art],zone+'/'+obj.storyId+' missing installed art');
  }
  if(zone==='underground_market')ok(m.monsterSpawns.filter(m=>m.id==='gilt_construct').length>=6,'not enough constructs to finish');
  if(zone==='cathedral2')ok(m.monsterSpawns.filter(m=>m.id==='choir_priest').length>=3,'not enough priests to finish');
}
for(const zone of ['sand_tombs','cathedral1','cathedral2']){
  ok(D.ZONES[zone].shifting,zone+' does not regenerate');
  ok(String(M.generate(zone,1).walls)!==String(M.generate(zone,2).walls),zone+' layout never changes');
}
const waste=M.generate('desert_wastes',123),market=M.generate('underground_market',123);
const toMarket=waste.exits.find(e=>e.target==='underground_market');
ok(toMarket&&market.spawns[toMarket.spawnKey],'market entrance does not resolve');
const back=market.exits.find(e=>e.target==='desert_wastes');ok(back&&waste.spawns[back.spawnKey],'market return does not resolve');

// Exercise production target selection and phase changes.
s=fresh('ash_wastes');const a=new Monster('ash_fiend',10,10),b=new Monster('pit_brute',11,10),ally=new Monster('impaler',10.5,10);
s.player.x=18;s.player.y=10;s.monsters=[a,b,ally];
ok(a.pickTarget(s.player)===b,'Hell rivals never fight each other');
ok(b.pickTarget(s.player)===ally,'rival brood chooses wrong faction');
s=fresh('throne');const boss=new Monster('vethriss',s.player.x+1,s.player.y);s.monsters=[boss];
ok(boss.name==='Seraneth, Wounded'&&boss.spriteOpts.npcArt==='resident_frosthaven_0','first phase is not wounded Seraneth');
boss.takeDamage(1e9,s.player);ok(!boss.dead&&Math.abs(boss.hp/boss.maxHp-.7)<1e-9,'one hit skipped the first form');
boss.hp=boss.maxHp*.69;boss.update(.01,s.player,s.map);
ok(boss.spriteOpts.kind==='serpent'&&!boss.spriteOpts.npcArt&&boss.def.summons,'serpent phase does not transform/summon illusions');
boss.takeDamage(1e9,s.player);ok(!boss.dead&&Math.abs(boss.hp/boss.maxHp-.35)<1e-9,'one hit skipped the serpent form');
boss.hp=boss.maxHp*.34;boss.update(.01,s.player,s.map);
ok(boss.spriteOpts.kind==='wraith'&&boss.def.copyBosses,'final phase is not a shadow copying bosses');
boss.aggro=true;
boss.encounter.memoryIndex=0;
s.player.hp=s.player.stats.maxHp=1e6; // Inspect both real sequence steps without ending the story fixture.
for(const pair of [['korvath','mire_mother'],['azram','malthoron']]){
  boss.encounter.start('memory',s.player);
  for(const [i,id] of pair.entries()){
    ok(boss.encounter.attack.remembered===id&&boss.encounter.attack.id===({korvath:'fissure',mire_mother:'bile',azram:'chains',malthoron:'beam'})[id],'missing copied signature: '+id);
    if(i===0){boss.encounter.execute();boss.update(.25,s.player,s.map);}
  }
}
for(const ending of ['destroy','seal','give']){
  s=fresh('throne');s.flags['dead_vethriss@0']=true;s.quests.q18={state:'reward'};
  G.recordEnding(ending);ok(s.flags.ending===ending&&s.flags.sagaComplete&&s.unlockedDiff===1,'ending failed to save/unlock difficulty: '+ending);
  G.recordEnding('destroy');ok(s.flags.ending===ending,'ending rewritten after choice');
}
// Quest chests show an opened lid from the saved discovery ledger, including
// when the shifting cathedral regenerates its prop objects.
s=fresh('cathedral2');G.__test.syncStoryObjects();
let questChest=s.map.props.find(p=>p.storyId==='sword_piece_0');
ok(questChest&&!questChest.opened&&questChest.interact==='story','unclaimed quest chest is already open');
G.interact(questChest);ok(questChest.opened&&!questChest.interact,'claimed quest chest still looks closed');
s.map=M.generate('cathedral2',456);G.__test.syncStoryObjects();
questChest=s.map.props.find(p=>p.storyId==='sword_piece_0');
ok(questChest.opened&&!questChest.interact,'regenerated quest chest lost its open state');
ok(!s.map.props.find(p=>p.storyId==='sword_piece_1').opened,'claiming one quest chest opened its neighbors');
console.log(`PASS ${checks} story checks: dialogue, objectives, old saves, boss wards, seeded routes, factions, phases, quest chest states and all endings.`);
