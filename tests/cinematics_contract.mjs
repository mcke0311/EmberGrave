import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {fixture} from './boss_fixture.mjs';
const f=fixture({gameExports:['update','interactStory','campaignScene','beaconQuestKill']}),{ctx,Game:G,DATA:D}=f;
const listeners=new Map();let mixing=0,saves=0;
function element(tag='div'){
 const e={tagName:tag.toUpperCase(),children:[],isConnected:true,style:{setProperty(){}},classList:{add(){},remove(){}},append(...children){this.children.push(...children);},appendChild(c){this.append(c);},replaceChildren(...c){this.children=c;},remove(){this.isConnected=false;},setAttribute(){},removeAttribute(){},focus(){ctx.document.activeElement=this;},querySelector(){return this.children.find(c=>c.tagName==='BUTTON')||null;},querySelectorAll(){return this.children.filter(c=>c.tagName==='BUTTON');}};
 e.getContext=()=>({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){}});
 Object.defineProperty(e,'lastChild',{get(){return this.children.at(-1);}});return e;
}
const root=element();ctx.document={createElement:element,getElementById:()=>root,body:element(),activeElement:null,hidden:false,addEventListener:(key,fn)=>listeners.set(key,fn),removeEventListener:key=>listeners.delete(key)};
ctx.SpriteAssets={loadBundle:async()=>{},maps:{props:{board:'board',embershard:'embershard'}},getFrame:()=>({})};
ctx.LootFilter.setReveal=()=>{};
ctx.Sfx.cinematicMix=()=>{mixing++;return()=>mixing--;};
for(const file of ['cinematic_scenes','cinematics'])vm.runInContext(fs.readFileSync(new URL('../js/'+file+'.js',import.meta.url),'utf8'),ctx);
const {C,S}=vm.runInContext('({C:Cinematics,S:CinematicScenes})',ctx);
const originalSave=G.saveGame;G.saveGame=()=>{saves++;};
let checks=0;const ok=(condition,message)=>{checks++;assert.ok(condition,message);};
async function ready(){for(let i=0;i<40&&!C.state?.ready;i++)await Promise.resolve();ok(C.state?.ready,'scene became ready');}
function skip(){listeners.get('keydown')({key:'Escape',preventDefault(){},stopImmediatePropagation(){}});}
ok(S.all.length===20&&new Set(S.all.map(d=>d.id)).size===20,'20 unique scenes');
for(const d of S.all){ok(D.ZONES[d.zone],'scene has a real zone');ok(d.captions.length>0&&d.captions.every(c=>c.text&&c.at<d.duration),'readable timed captions');}
let {s,m,e}=f.fresh('korvath');
e.update(.01,s.player,s.map);ok(C.state?.id==='korvath'&&!e.active,'boss introduction precedes combat');await ready();
ok(saves>0&&s.characterFlags.cinematics.unlocked.korvath,'unlock is persisted before playback finishes');
const before={time:s.time,hp:s.player.hp,mana:s.player.mana,phase:e.phase};
G.__bossTest.update(3);ok(JSON.stringify(before)===JSON.stringify({time:s.time,hp:s.player.hp,mana:s.player.mana,phase:e.phase}),'production update freezes combat and time');
ok(await C.request('azram')==='cancelled','overlapping scenes cannot steal continuations');
let done=0;const pending=C.request('mire_mother').then(()=>done++);await pending;ok(done===1,'duplicate request resolves once');
const firstTarget=C.cameraTarget();ctx.document.hidden=true;C.tick(20);ok(C.state.time===0,'hidden tab does not skip captions');ctx.document.hidden=false;
C.setPaused(true);C.tick(20);ok(C.state.time===0,'paused timeline stays still');C.setPaused(false);
skip();ok(s.characterFlags.cinematics.seen.korvath&&mixing===0,'skip persists once and restores mix');ok(!listeners.size&&!C.active,'skip cleans input handlers and active state');
e.update(.01,s.player,s.map);ok(e.active&&s.map.bossArena.sealed,'combat resumes through normal activation');
ok(await C.request('korvath')==='skipped','seen hero never repeats introduction');s.difficulty=1;ok(!C.eligible('korvath'),'view history is independent of difficulty');
({s}=f.fresh('mire_mother'));const complete=C.request('mire_mother');await ready();C.tick(100);ok(await complete==='completed'&&mixing===0,'natural completion cleans the same way');
({s}=f.fresh('azram'));const aborted=C.request('azram');await ready();C.cancel('travel');ok(await aborted==='cancelled'&&!s.characterFlags.cinematics.seen.azram,'cancelled scene remains unseen');ok(C.eligible('azram'),'aborted scene can be encountered later');
const instant=C.request('azram');skip();C.cancel('repeat');for(let i=0;i<40;i++)await Promise.resolve();ok(await instant==='skipped'&&!C.active&&mixing===0,'skip during loading cannot revive the scene or audio');
delete s.characterFlags.cinematics.seen.azram;
const replaced=C.request('azram');s.map=f.MapGen.generate('frosthaven',123);C.tick(.1);ok(await replaced==='cancelled'&&!C.active,'a replaced map cancels obsolete presentation');
G.options.cinematics=false;ok(await C.request('azram')==='skipped'&&s.characterFlags.cinematics.seen.azram,'automatic off marks a deliberate skip and unlocks replay');G.options.cinematics=true;
({s}=f.fresh('mire_mother'));const failed=C.request('mire_shard',{missingAsset:true});await ready();ok(C.state.fallback,'missing artwork produces transcript fallback');C.tick(100);ok(await failed==='completed'&&s.characterFlags.cinematics.seen.mire_shard,'fallback preserves continuation and history');
const old={player:s.player,flags:{ending:'seal',dead_vethriss:true,seen_act3:true,campaign:{'interact:khal_palace:fortress_map':1}},quests:{q9:{state:'done'},q12:{state:'done'},q14:{state:'done'}},shrines:['hellgate'],characterFlags:{sawCine_korvath:true,scene_quieting:true},campaignsByDifficulty:{}};
const book=C.initialize(old,true);for(const id of ['korvath','ledger','quieting','mire_shard','ilyan','fortress_map','dig','breach','core','ending_seal'])ok(book.seen[id],'legacy milestone '+id+' is migrated');
ok(!book.unlocked.ending_give&&!book.unlocked.ending_destroy,'unchosen legacy endings remain locked');
ok(C.initialize(old,true)===book,'migration is idempotent');
old.characterFlags.sawCine_azram=true;ok(C.initialize(old).seen.azram,'later legacy co-op/video flags merge into an existing book');
({s}=f.fresh('empty_archangel'));s.quests={q16:{state:'active'}};ok(!G.bossCinematic(s.monsters[0])&&!C.active,'soul ward prevents introduction');
s.map.zone={...s.map.zone,echo:true};ok(!C.eligible('empty_archangel'),'endgame echoes do not trigger saga scenes');
ctx.COOP_WORKER=true;ok(await C.request('korvath')==='skipped'&&!C.active,'co-op worker never owns solo cinematic staging');ctx.COOP_WORKER=false;
({s}=f.fresh('vethriss'));ok(await C.request('ending_give')==='skipped'&&!s.characterFlags.cinematics.unlocked.ending_give,'unchosen ending cannot unlock through ordinary playback');
for(const d of S.all.filter(d=>d.boss)){
 const encounter=f.fresh(d.boss);encounter.e.update(.01,encounter.s.player,encounter.s.map);
 ok(C.state?.id===d.id&&!encounter.e.active,d.id+' starts before encounter activation');await ready();
 const hp=encounter.m.hp;C.tick(d.duration);ok(!C.active&&encounter.s.characterFlags.cinematics.seen[d.id],d.id+' completes naturally');
 encounter.e.update(.01,encounter.s.player,encounter.s.map);ok(encounter.e.active&&encounter.m.hp===hp,d.id+' resumes combat without damage or changed prerequisites');
}
G.saveGame=originalSave;ok(saves>0,'view history uses the normal save path');
console.log(`PASS ${checks} cinematic contract checks: activation, freeze, once per hero, migration, input cleanup, pause, fallback, endings and co-op exclusion`);
