import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {animationPhase} from '../js/character_animation3d.mjs';
let checks=0;
const ok=(v,m)=>{checks++;assert.ok(v,m);};
function harness(before){
  const events=[],queue=[],math=Object.create(Math);math.random=()=>.5;
  const scope=vm.createContext({console,Math:math,Set,Map,JSON,Sfx:{play(){}},UI:new Proxy({},{get:()=>()=>{}}),MapGen:{walkable:()=>true},SpriteAssets:{},document:{},window:{}});
  for(const f of ['utils','data','data_overrides','skill_perks','items'])vm.runInContext(fs.readFileSync('js/'+f+'.js','utf8'),scope);
  vm.runInContext(fs.readFileSync(before?'tests/fixtures/animation_before/js/entities.js':'js/entities.js','utf8'),scope);
  const {Player,DATA}=vm.runInContext('({Player,DATA})',scope);
  let time=0;
  const target={x:1,y:0,radius:.36,hp:10000,maxHp:10000,dead:false,type:'humanoid',applySlow(){},takeDamage(){},curseWither:null};
  const state={time:0,monsters:[target],minions:[],corpses:[{x:1,y:0,used:false}],fx:[],traps:[],projectiles:[],map:{id:'test',w:10,h:10}};
  const game=new Proxy({state,debugFlags:{},fx:{shake:0,hitPause:0},afterDelay(seconds,callback){events.push(['schedule',time,seconds]);queue.push({at:time+seconds,callback});},
    spawnProjectile(projectile){events.push(['projectile',time,projectile.kind,projectile.mult??null]);},
    addNova(x,y,r){events.push(['nova',time,x,y,r]);},nearbyCorpses:()=>state.corpses,nearestCorpse:()=>state.corpses[0]},
    {get:(t,k)=>k in t?t[k]:()=>{}});
  scope.Game=game;
  function fresh(classId='vanguard'){
    time=0;state.time=0;events.length=queue.length=0;state.fx=[];state.traps=[];target.dead=false;
    const p=new Player('Animation timing',classId);state.player=p;p.x=p.y=0;p.mana=1e6;p.tempo=8;p.stats.attackRate=2;p.stats.castRate=1.6;p.stats.range=3;
    p.effRank=()=>3;p.synergyMult=()=>1;p.strike=()=>{events.push(['damage',time]);return 10;};p.spellHit=()=>events.push(['spell',time]);return p;
  }
  function flush(p){while(queue.length){queue.sort((a,b)=>a.at-b.at);const e=queue.shift();if(e.at>5)break;time=e.at;state.time=time;e.callback();}}
  return {fresh,flush,events,DATA,target};
}
const old=harness(true),next=harness(false);
const types=['melee','sweep','nova','projectile','pierce','fan','chain','lightning','blast','spellnova','beam','meteor','combo','combo_finish','execute','fear','shockwave','bash','firewall','pyreblast','freezenova','balllightning','overloadnuke','groundfield','taunt_curse','outbreak','ricochet','rain','thrown'];
const report=[];
for(const type of types){
  const skill=type==='melee'?{id:'basic',type}:Object.values(next.DATA.SKILLS).find(s=>s.type===type);
  if(!skill)continue;
  for(const ranged of type==='melee'?[false,true]:[false]){
    const a=old.fresh(),b=next.fresh();a.stats.ranged=b.stats.ranged=ranged;
    const ar=a.performSkill(skill.id,old.target,{x:1,y:0}),br=b.performSkill(skill.id,next.target,{x:1,y:0});
    ok(ar===br&&br===true,skill.id+' changed skill acceptance');
    ok(a.action?.dur===b.action?.dur,skill.id+' changed action duration');
    const markers=b.action?.visual?.releases||[];
    for(const release of markers)ok(Math.abs(animationPhase(b.action.state,release,ranged?'bow_2h':null,markers)-.4)<1e-8,skill.id+' release does not reach contact');
    old.flush(a);next.flush(b);
    ok(JSON.stringify(old.events)===JSON.stringify(next.events),skill.id+' changed event order or timestamps');
    report.push({skill:skill.id,ranged,markers,events:next.events.length});
  }
}
const a=old.fresh('veilranger'),b=next.fresh('veilranger');
for(const p of [a,b])p.drawing={t:.8,maxDraw:1,dmgMin:1,dmgMax:3,aim:{x:4,y:0}};
a.releaseDraw();b.releaseDraw();ok(JSON.stringify(old.events)===JSON.stringify(next.events),'charged shot gameplay changed');ok(b.action.visual.releases[0]===0,'charged shot has a second windup');
const action=b.action;b.visualReaction('hurt',next.target);ok(b.action===action,'hurt reaction interrupts an attack');b.stats.block=100;b.tryBlock(next.target);ok(b.action===action&&b._visualReaction.kind==='block','block reaction interrupts an attack');
ok(!Object.keys(b).includes('_visualReaction'),'reaction serialized as player data');
console.log(JSON.stringify({status:'PASS',checks,skills:report},null,2));
