import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

const root=new URL('../',import.meta.url),read=p=>fs.readFileSync(new URL(p,root),'utf8');
let checks=0;const ok=(pass,label)=>{checks++;assert.ok(pass,label);};
const ledger=JSON.parse(read('assets/sound-effects/skills/sources.json'));
for(const [name,meta] of Object.entries(ledger.clips)){
  const bytes=fs.readFileSync(new URL('assets/sound-effects/skills/'+name,root));
  ok(bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WAVE',name+': not a WAV');
  ok(createHash('sha256').update(bytes).digest('hex')===meta.sha256,name+': provenance hash changed');
  ok(meta.peakDb<=-4.4&&meta.rmsDb>-40,name+': silence or missing headroom');
  ok(meta.duration>0&&meta.duration<2,name+': invalid duration');
  ok(meta.sources.length>0&&meta.sources.every(s=>ledger.archives[s.archive]),name+': no source provenance');
}

function harness({fail=false,defer=false}={}){
  let rng=0,fetches=0,decodes=0,starts=[],errors=[],resolveLoad;
  const math=Object.create(Math);math.random=()=>{rng++;return .5;};
  class Param {
    _value=1;
    set value(v){assert.ok(Number.isFinite(v),'non-finite audio parameter');this._value=v;}
    get value(){return this._value;}
    setValueAtTime(v){this.value=v;}
    linearRampToValueAtTime(v){this.value=v;}
    exponentialRampToValueAtTime(v){this.value=v;}
    cancelAndHoldAtTime(){}
  }
  const nodes=[];
  class Node {
    constructor(){nodes.push(this);}
    gain=new Param();pan=new Param();playbackRate=new Param();
    connect(dest){this.dest=dest;return dest;}
    disconnect(){this.disconnected=true;}
    start(t){this.startedAt=t;starts.push(this);}
    stop(t){this.endAt=t??ac.currentTime;}
  }
  const ac={currentTime:0,state:'running',createBufferSource:()=>new Node(),createGain:()=>new Node(),createStereoPanner:()=>new Node(),
    createDynamicsCompressor:()=>Object.assign(new Node(),Object.fromEntries(['threshold','knee','ratio','attack','release'].map(k=>[k,new Param()]))),
    decodeAudioData:async()=>{decodes++;return {duration:.7,length:30870};}};
  const gate=defer?new Promise(r=>resolveLoad=r):Promise.resolve();
  const destination=new Node(),vol={master:.8,sfx:.9,music:0};
  const ctx=vm.createContext({console:{warn:(...x)=>errors.push(x.join(' '))},Math:math,URL,Map,Set,WeakMap,Object,Promise,
    document:{baseURI:'http://localhost:8741/index.html'},fetch:async url=>{fetches++;await gate;return {ok:!fail,status:fail?404:200,arrayBuffer:async()=>new ArrayBuffer(16)};}});
  for(const file of ['skill_audio_catalog','skill_audio'])vm.runInContext(read('js/'+file+'.js'),ctx);
  const audio=vm.runInContext('SkillAudio',ctx),catalog=vm.runInContext('SkillAudioCatalog',ctx);
  function advance(seconds){ac.currentTime+=seconds;for(const node of [...nodes])if(node.endAt!==undefined&&node.endAt<=ac.currentTime&&!node.ended){node.ended=true;node.onended?.();}}
  return {audio,catalog,ac,vol,nodes,starts,errors,advance,unlock:()=>resolveLoad?.(),init:()=>audio.init(ac,destination,vol),counts:()=>({rng,fetches,decodes})};
}

const h=harness(),{audio:a,ac,vol}=h;
const owner={x:5,y:5,skills:{},stats:{ranged:false},form:null,dead:false};
const ids=Object.keys(a.recipes);
ok(ids.length===108,'all 107 skills and basic must be explicit');
ok(ids.filter(id=>a.recipes[id].passive).length===18,'passive coverage includes Master of the Hunt and Exploit Weakness');
ok(a.play('basic','release',{owner})===null,'played before audio init');
await h.init();await h.init();
ok(h.counts().fetches===78&&h.counts().decodes===78,'textures not loaded once');
for(const id of ids){
  const r=a.recipes[id];
  for(const phase of ['activate','release','impact','end']){
    h.advance(2);const old=h.starts.length,handle=a.play(id,phase,{owner,trigger:r.trigger});
    ok(r.passive&&!r.trigger?handle===null:!!handle,`${id}/${phase}: coverage missing`);
    ok(r.passive&&!r.trigger?h.starts.length===old:h.starts.length>old,`${id}/${phase}: wrong playback`);
  }
}
ok(h.counts().rng===0,'audio consumed gameplay randomness');
const start=h.starts.length;
for(const key of ['master','sfx']){const prev=vol[key];vol[key]=0;a.play('basic','release',{owner});vol[key]=prev;}
ac.state='suspended';a.play('basic','release',{owner});ac.state='running';
ok(h.starts.length===start,'mute/suspend queued or started a sound');
h.advance(2);ok(h.starts.length===start,'old sound replayed after resume');

a.reset();h.advance(2);
const before=a.snapshot().played;
for(let i=0;i<50;i++)a.play('emberwitch_0_4','impact',{owner,target:{x:i,y:0}});
ok(a.snapshot().played===before+1,'AoE emitted one impact per enemy');
a.reset();h.advance(2);
for(let i=0;i<20;i++){h.advance(.03);a.play('basic','release',{owner});}
ok(a.snapshot().voices<=4,'same-cue tails exceeded four');
for(const id of ids.filter(id=>!a.recipes[id].passive))a.play(id,'release',{owner});
ok(a.snapshot().voices<=24&&a.snapshot().peak<=24,'global voice bound exceeded');
a.reset();h.advance(3);ok(a.snapshot().voices===0,'reset leaked voices');
ok(h.nodes.filter(n=>n.startedAt!==undefined).every(n=>n.disconnected),'ended source nodes leaked');

const emitter={sourceSkill:'emberwitch_0_3',type:'firewall',ttl:5};
const state={map:{},player:owner,fx:[emitter]};
a.update(state);ok(a.snapshot().sustains===1,'field did not sustain');
a.update(state);ok(a.snapshot().sustains===1,'field sustain duplicated');
const loop=a.play('emberwitch_0_3','sustain',{owner,emitter});
ok(loop?.active,'sustain did not return its existing stoppable handle');
loop.stop();ok(!loop.active,'manual stop failed');
a.update(state);emitter.ttl=0;a.update(state);ok(a.snapshot().sustains===0,'expired field kept playing');
owner.siphon={sourceSkill:'gravebinder_1_5'};a.update(state);ok(a.snapshot().sustains===1,'channel did not sustain');
owner.siphon=null;a.update(state);ok(a.snapshot().sustains===0,'cancelled channel kept playing');
owner.drawing={sourceSkill:'veilranger_0_2'};a.update(state);a.setPaused(true);ok(a.snapshot().voices===0,'pause kept sounds alive');
a.setPaused(false);a.update(state);ok(a.snapshot().sustains===1,'live draw did not resume');
owner.dead=true;a.update(state);ok(a.snapshot().voices===0,'death leaked sounds');owner.dead=false;owner.drawing=null;

let called=0;
a.cast(owner,'basic',()=>{called++;a.legacy('swing');return false;});
ok(called===1&&a.snapshot().voices===0,'rejected cast played feedback or skipped gameplay');
a.cast(owner,'basic',()=>{a.markRelease(owner);a.legacy('swing');return true;});
ok(a.snapshot().events.at(-1).phase==='activate','wind-up played release early');
h.advance(.3);a.release(owner,'basic');ok(a.snapshot().events.at(-1).phase==='release','release marker missing');
a.scope('emberwitch_0_0',{owner},()=>{
  ok(a.current.id==='emberwitch_0_0','outer source missing');
  a.scope('gravebinder_1_2',{owner},()=>ok(a.current.id==='gravebinder_1_2','nested source missing'));
  ok(a.current.id==='emberwitch_0_0','nested source did not restore');
});
ok(a.current===null,'source leaked outside callback');
assert.throws(()=>a.scope('basic',{owner},()=>{throw Error('test');}));ok(a.current===null,'throw leaked source');

const delayed=harness({defer:true});const loading=delayed.init();
delayed.audio.play('basic','release',{owner});delayed.unlock();await loading;
ok(delayed.starts.length===0,'loading replayed an old event');
const failed=harness({fail:true});await failed.init();
ok(failed.audio.snapshot().failed.length===78&&failed.errors.length===78,'missing files not diagnosed');
ok(failed.audio.play('basic','release',{owner})===null,'missing asset used old synth fallback');
ok(h.counts().rng===0,'variation changed gameplay randomness');
console.log(`PASS ${checks} skill-audio checks: source hashes, 108 assignments, decode caching, phases, volume, lifetime, rejection, failure, source nesting, RNG and voice bounds.`);
