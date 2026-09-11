import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {fixture} from './boss_fixture.mjs';

const f=fixture({gameExports:['triggerEvent','interactOnSurface','firstSightCutscene','isRunning:()=>running'],dataSeed:123});
const {Game:G,DATA:D,MapGen:M,Monster,Items:I,ctx,store}=f;
const plain=value=>JSON.parse(JSON.stringify(value));
let checks=0;
const ok=(condition,message)=>{checks++;assert.ok(condition,message);};
const equal=(actual,expected,message)=>{checks++;assert.deepEqual(plain(actual),plain(expected),message);};
const fail={bundle:null,wait:null};
ctx.SpriteAssets.loadBundle=async id=>{
  if(id===fail.bundle)throw Error('Expected difficulty asset failure');
  if(id===fail.wait?.bundle)await fail.wait.promise;
};
Object.assign(ctx.Player3D.assets,{resolvePlayerVisual:()=>({}),loadPlayerLoadout:async()=>{},activatePlayerLoadout(){},discardPlayerLoadout(){},deactivatePlayerLoadout(){}});
Object.defineProperty(ctx.localStorage,'length',{get:()=>store.size});
ctx.localStorage.key=i=>[...store.keys()][i];
for(const file of ['unique_powers','loot_data'])vm.runInContext(fs.readFileSync(new URL('../js/'+file+'.js',import.meta.url),'utf8'),ctx);
const loot=vm.runInContext('LootData',ctx);

// All authored areas, bosses, ordinary monsters, elites and summoned minions.
let {s}=f.fresh();
const originalDefs=JSON.stringify(D.ENEMIES);
const maps=new Map();
for(const zone of Object.values(D.ZONES)) {
  s.map=M.generate(zone.id,123);
  maps.set(zone.id,s.map);
  for(const id of new Set([...(zone.spawns||[]),zone.boss].filter(Boolean))) {
    const def=D.resolveEnemy(id,zone.id),area=zone.lvl||def.lvl;
    const normal=def.boss?def.lvl:Math.max(Math.max(1,area-2),Math.min(area+1,def.lvl));
    for(const difficulty of [0,1,2]) {
      s.difficulty=difficulty;
      for(const opts of def.boss?[{}]:[{}, {elite:true}, {minion:true,summonOwner:{monsterFamily:'test'}}]) {
        const mon=new Monster(id,10,10,opts);
        equal(mon.lvl,normal+[0,30,60][difficulty],`${zone.id}/${id}/${difficulty}: runtime level`);
      }
    }
  }
}
equal(JSON.stringify(D.ENEMIES),originalDefs,'scaling never mutates authored definitions');
for(const difficulty of [0,1,2])for(const source of loot.locations(loot.rows[0],difficulty,0,true)) {
  const [zoneId,id,kind]=source.key.split('/'),zone=D.ZONES[zoneId];
  if(kind) {
    s.map=maps.get(zoneId);s.difficulty=difficulty;
    equal(source.level,new Monster(id,10,10).lvl,'loot reference matches live monster');
  } else equal(source.level,(zone.lvl||1)+(id==='chest'?1:0)+[0,30,60][difficulty],'container source level');
}

await G.newGame('Difficulty QA','vanguard',false);
await G.skipOpening();
s=G.state;s.unlockedDiff=1;
const slot=G.listSaves().find(row=>row.name==='Difficulty QA').slot;
const initialHero=()=>plain({lvl:s.player.lvl,xp:s.player.xp,attr:s.player.attr,skills:s.player.skills,gold:s.player.gold,
  inv:s.player.inv.items.map(G.serializeItem),stash:s.player.stash.items.map(G.serializeItem),equip:Object.values(s.player.equip).map(G.serializeItem)});
I.autoPlace(s.player.stash,I.makeConsumable('hp1',3));
const hero=initialHero();
const rewardQuest=D.QUESTS.find(q=>q.reward.skillPts&&!q.reward.finale);
s.quests[rewardQuest.id]={state:'done'};
s.quests.q7={state:'done'};s.quests.q18={state:'done'};
s.flags.fn_temple_open=true;s.flags.ending='seal';s.flags.sagaComplete=true;
s.flags['dead_vethriss@0']=true;
D.CAMPAIGN.record(s,{kind:'interact',zone:'sand_tombs',target:'imprisoned_scholar'});
s.shrines.push('hellgate');s.home='hellgate';
G.firstSightCutscene('korvath','test.mp4');
await G.enterMap('hellgate','default');
await G.enterMap('shattered_temple','default');
const oldMap=s.map,oldMonsters=s.monsters;
s.ground.push({x:10,y:10,gold:23});s.portal={mapId:oldMap.id,x:10,y:10};
G.saveGame();
const normalProgress=plain({quests:s.quests,flags:s.flags,shrines:s.shrines,home:s.home});
ok(await G.setDifficulty(1),'enter Nightmare');
equal(initialHero(),hero,'character and assets survive switching');
equal(s.map.id,'frosthaven','new campaign begins in Frosthaven');
equal(s.quests.q7,{state:'active',count:0},'Act I starts fresh');
equal(s.quests.q1,{state:'offered'},'Cinderwatch questline starts fresh');
ok(!s.flags.opening&&!s.flags.ending&&!s.flags.sagaComplete&&!s.flags.fn_temple_open,'no inherited tutorial, ending or gates');
ok(!D.CAMPAIGN.found(s,'sand_tombs','imprisoned_scholar'),'discovery ledger isolated');
ok(!D.CAMPAIGN.bossDead(s,'vethriss'),'boss deaths isolated');
equal(s.shrines,['frosthaven','town'],'higher-tier travel must be earned');
ok(!s.portal&&!s.monstersByMap[oldMap.id]&&!s.groundByMap[oldMap.id],'outgoing cache cannot leak into Nightmare');
ok(s.characterFlags.sawCine_korvath,'cinematic history is shared');
await G.enterMap('shattered_temple','default');
ok(!s.monsters.some(mon=>oldMonsters.includes(mon)),'regenerated monsters use fresh instances');
equal(s.monsters.find(mon=>mon.defId==='korvath').lvl,38,'Korvath is level 38 on Nightmare');
await G.enterMap('north_wild','default');await G.enterMap('shattered_temple','default');
equal(s.monsters.find(mon=>mon.defId==='korvath').lvl,38,'repeat travel preserves the correct tier');
equal(s.ground,[],'old ground loot does not return');

const points=s.player.skillPts;
s.quests[rewardQuest.id]={state:'reward'};G.completeQuest(rewardQuest.id);
equal(s.player.skillPts,points+rewardQuest.reward.skillPts,'quest talent reward earned on new tier');
G.completeQuest(rewardQuest.id);
equal(s.player.skillPts,points+rewardQuest.reward.skillPts,'reward cannot be claimed twice');
s.quests.q7={state:'active',count:3};s.flags.fn_temple_open=true;
D.CAMPAIGN.record(s,{kind:'interact',zone:'sand_tombs',target:'imprisoned_scholar'});
s.flags['dead_korvath@1']=true;s.shrines.push('marshcamp');s.home='marshcamp';
ok(await G.setDifficulty(0),'return to Normal');
equal(s.quests,normalProgress.quests,'Normal quests restored');
equal(s.flags,normalProgress.flags,'Normal story flags restored');
equal(s.shrines,normalProgress.shrines,'Normal shrines restored');
equal(s.home,'hellgate','Normal home restored');
ok(await G.setDifficulty(1),'resume Nightmare');
equal(s.map.id,'marshcamp','resume destination is tier home');
equal(s.quests.q7.count,3,'Nightmare partial quest retained');
ok(D.CAMPAIGN.found(s,'sand_tombs','imprisoned_scholar'),'Nightmare discovery retained');
await G.enterMap('shattered_temple','default');
ok(!s.monsters.some(mon=>mon.defId==='korvath'),'Nightmare boss remains dead');
equal(s.quests[rewardQuest.id].state,'done','reward remains claimed after round trip');
G.saveGame();await G.loadGame(slot);s=G.state;
equal(s.difficulty,1,'save/reload retains difficulty');
equal(s.quests.q7.count,3,'save/reload retains partial quest');
equal(s.map.id,'marshcamp','save/reload retains per-tier home');
equal(s.campaignsByDifficulty[0].quests,normalProgress.quests,'inactive campaign survives reload');
ok(s.characterFlags.sawCine_korvath,'movie history survives reload');

// Unlock the final tier by completing this tier's finale, with its own ending.
ok(!await G.setDifficulty(2),'Torment locked until Nightmare finale');
s.flags['dead_vethriss@1']=true;s.quests.q18={state:'reward'};G.recordEnding('destroy');
equal(s.unlockedDiff,2,'Nightmare finale unlocks Torment');
equal(s.flags.ending,'destroy','Nightmare has its own ending');
ok(await G.setDifficulty(2),'enter Torment');
equal(s.quests.q7.count,0,'Torment starts fresh');
ok(!s.flags.ending&&!D.CAMPAIGN.bossDead(s,'vethriss'),'Torment finale is uncompleted');
await G.enterMap('shattered_temple','default');
equal(s.monsters.find(mon=>mon.defId==='korvath').lvl,68,'Korvath is level 68 on Torment');
s.flags['dead_vethriss@2']=true;s.quests.q18={state:'reward'};G.recordEnding('give');
equal(s.unlockedDiff,2,'Torment does not unlock an invalid tier');

// Failure and concurrency must not write a partially changed campaign.
G.saveGame();
const before=store.get(slot),liveMap=s.map,liveMonsters=s.monsters;
for(const invalid of [-1,3,1.5,NaN,Infinity,'0',null,undefined,2])ok(!await G.setDifficulty(invalid),'reject invalid/unchanged tier');
equal(store.get(slot),before,'invalid switches do not save');
fail.bundle='zone:hellgate';
ok(!await G.setDifficulty(0),'asset failure reports false');
equal(s.difficulty,2,'failure keeps difficulty');
ok(s.map===liveMap&&s.monsters===liveMonsters,'failure keeps playable world');
ok(G.__bossTest.isRunning(),'failure resumes gameplay');
equal(store.get(slot),before,'failure leaves persisted save untouched');
fail.bundle=null;
let release;
fail.wait={bundle:'zone:hellgate',promise:new Promise(resolve=>release=resolve)};
const switching=G.setDifficulty(0);
ok(!await G.setDifficulty(1),'overlapping switch rejected');
ok(!await G.enterMap('frosthaven','default'),'ordinary travel cannot supersede a difficulty switch');
equal(s.difficulty,2,'pending load has not committed difficulty');
release();ok(await switching,'retry commits after assets load');fail.wait=null;

// Authored quest gear/glyph levels get one offset; player-level fallback gets none.
const oldGear=I.rollGear,oldGlyph=I.rollGlyph,gearLevels=[],glyphLevels=[];
I.rollGear=(level,...args)=>{gearLevels.push(level);return oldGear(level,...args);};
I.rollGlyph=(level,...args)=>{glyphLevels.push(level);return oldGlyph(level,...args);};
for(const tier of [1,2]) {
  await G.setDifficulty(tier);
  const gearQuest=D.QUESTS.find(q=>q.reward.item),glyphQuest=D.QUESTS.find(q=>q.reward.glyph&&D.ZONES[q.zone]);
  s.quests[gearQuest.id]={state:'reward'};G.completeQuest(gearQuest.id);
  equal(gearLevels.at(-1),gearQuest.reward.item.ilvl+[0,30,60][tier],'quest gear follows difficulty');
  s.quests[glyphQuest.id]={state:'reward'};G.completeQuest(glyphQuest.id);
  equal(glyphLevels.at(-1),(D.ZONES[glyphQuest.zone].lvl||1)+[0,30,60][tier],'glyph follows area and difficulty');
  const zone=glyphQuest.zone;delete glyphQuest.zone;
  s.quests[glyphQuest.id]={state:'reward'};G.completeQuest(glyphQuest.id);
  equal(glyphLevels.at(-1),s.player.lvl,'player-level glyph fallback is not scaled twice');
  glyphQuest.zone=zone;
}
I.rollGear=oldGear;I.rollGlyph=oldGlyph;

// Exercise the runtime loot paths rather than only their data-view predictions.
const oldDrops=I.rollDrops,drops=[];
I.rollDrops=(level,kind)=>{drops.push({level,kind});return [];};
for(const tier of [0,1,2]) {
  await G.setDifficulty(tier);await G.enterMap('north_wild','default');
  const prop={x:s.player.x,y:s.player.y,type:'chest',lootable:true};s.map.props.push(prop);
  G.__bossTest.interactOnSurface(prop,true);
  equal(drops.at(-1),{level:3+tier*30,kind:'chest'},'live chest source follows difficulty');
  const searchable={x:prop.x,y:prop.y,type:'barrel',searchable:true};s.map.props.push(searchable);
  G.__bossTest.interactOnSurface(searchable,true);
  equal(drops.at(-1),{level:2+tier*30,kind:'barrel'},'live searchable source follows difficulty');
  const event={x:prop.x,y:prop.y,type:'chest',interact:'event',ev:{name:'QA cache',kind:'cache',drops:1}};
  s.map.props.push(event);G.__bossTest.triggerEvent(event);
  equal(drops.at(-1),{level:4+tier*30,kind:'chest'},'live event source follows difficulty');
  const monster=new Monster('frost_risen',prop.x,prop.y);
  G.onMonsterDeath(monster,s.player);
  equal(drops.at(-1),{level:monster.lvl,kind:'normal'},'live monster drops use scaled monster level');
}
I.rollDrops=oldDrops;

// Legacy histories belong to Normal regardless of the selected legacy difficulty.
// Normalize existing unique-item metadata before comparing campaign migration fields.
G.saveGame();await G.loadGame(slot);s=G.state;
const template=JSON.parse(store.get(slot));
for(const tier of [0,1,2]) {
  const oldSlot='embergrave_save_legacy_'+tier;
  const legacy={...template,v:1,name:'Legacy '+tier,difficulty:tier,unlockedDiff:2,
    ...normalProgress,flags:{...normalProgress.flags,dead_korvath:true,'dead_korvath@0':true,'dead_korvath@1':true,'dead_vethriss@2':true,sawCine_korvath:true}};
  delete legacy.campaignsByDifficulty;delete legacy.characterFlags;
  const raw=JSON.stringify(legacy);store.set(oldSlot,raw);
  await G.loadGame(oldSlot);s=G.state;
  equal(store.get('embergrave_campaign_backup_'+oldSlot),raw,'backup is byte-for-byte legacy save');
  const upgraded=JSON.parse(store.get(oldSlot));
  equal(upgraded.v,2,'migration persisted once');
  equal(s.difficulty,tier,'migration retains selected difficulty');
  equal(s.unlockedDiff,2,'migration preserves unlocked difficulties');
  equal(s.campaignsByDifficulty[0].quests,normalProgress.quests,'legacy shared history assigned to Normal');
  ok(s.campaignsByDifficulty[0].flags.dead_korvath&&s.campaignsByDifficulty[0].flags['dead_korvath@0'],'Normal legacy boss deaths preserved');
  ok(!s.campaignsByDifficulty[0].flags['dead_korvath@1']&&!s.campaignsByDifficulty[0].flags['dead_vethriss@2'],'higher-tier legacy deaths removed');
  ok(s.characterFlags.sawCine_korvath,'legacy cinematic history preserved');
  for(const key of ['lvl','xp','attr','attrPts','skillPts','skills','gold','inv','stash','equip','belt','quickSlots'])equal(upgraded[key],legacy[key],'legacy character field '+key);
  if(tier) {
    equal(s.map.id,'frosthaven','legacy higher tier restarts in town');
    equal(s.quests.q7,{state:'active',count:0},'legacy higher tier starts Act I');
    ok(!s.flags.ending&&!s.flags.fn_temple_open,'legacy higher tier has fresh gates and ending');
    s.quests.q7.count=2;G.saveGame();await G.loadGame(oldSlot);s=G.state;
    equal(s.quests.q7.count,2,'second load does not migrate/reset again');
  }
  equal(store.get('embergrave_campaign_backup_'+oldSlot),raw,'backup remains unchanged');
  ok(!G.listSaves().some(row=>row.slot.startsWith('embergrave_campaign_backup_')),'backup is not an extra hero');
}
const oldSlot='embergrave_save_backup_failure',raw=JSON.stringify({...template,v:1,campaignsByDifficulty:undefined});
store.set(oldSlot,raw);
const previousState=G.state,write=ctx.localStorage.setItem;
ctx.localStorage.setItem=(key,value)=>{if(key.startsWith('embergrave_campaign_backup_'))throw Error('quota');write(key,value);};
ok(await G.loadGame(oldSlot)===false,'backup failure aborts migration');
ok(G.state===previousState,'backup failure preserves current hero');
equal(store.get(oldSlot),raw,'backup failure preserves original save');
ctx.localStorage.setItem=write;

// A pending switch cannot restore a world after Save and Quit.
const quitSlot=G.listSaves().find(row=>row.name==='Legacy 2').slot;
fail.wait={bundle:'zone:hellgate',promise:new Promise(resolve=>release=resolve)};
const cancelled=G.setDifficulty(0);G.saveAndQuit();
const afterQuit=store.get(quitSlot);release();
ok(!await cancelled,'quit cancels the pending difficulty switch');
equal(G.state,null,'late assets cannot resurrect a quit hero');
equal(store.get(quitSlot),afterQuit,'late assets cannot overwrite the saved campaign');
equal(JSON.parse(afterQuit).difficulty,2,'quit saves the original difficulty');
fail.wait=null;

console.log(`PASS ${checks} difficulty checks: levels, source parity, campaigns, travel, rewards, endings, migration, backups and failed loads.`);
