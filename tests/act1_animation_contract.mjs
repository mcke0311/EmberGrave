import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
import {fixture} from './boss_fixture.mjs';
execFileSync(process.execPath,['--preserve-symlinks','--preserve-symlinks-main','tools/act1_animation_catalog.mjs','--check']);
const catalog=JSON.parse(fs.readFileSync('assets/act1_animations/catalog.json','utf8'));
const f=fixture({dataSeed:518,gameExports:['drawFx','setContext:c=>{ctx=c;}']}),off=fixture({dataSeed:518});
const A=vm.runInContext('Act1EnemyAnimation',f.ctx),B=vm.runInContext('Act1EnemyAnimation',off.ctx);B.enabled=false;
let checks=0;const ok=(x,label)=>{assert.ok(x,label);checks++;};const eq=(x,y,label)=>{assert.deepEqual(JSON.parse(JSON.stringify(x)),JSON.parse(JSON.stringify(y)),label);checks++;};
function scene(fx,id,classId="vanguard"){
 const {s,p}=fx.fresh('korvath',518,classId);s.map.id='north_wild';s.map.zone=fx.DATA.ZONES.north_wild;s.map.surfaceVersion=0;s.map.blocked.fill(0);s.map.elev.fill(0);s.map.bossArena=null;s.map.hazards=[];s.monsters=[];s.minions=[];
 const m=new fx.Monster(id,p.x-1.5,p.y);s.monsters=[m];m.aggro=true;p.stats.dodge=0;p.stats.block=0;p.tryBlock=()=>false;m.maxHp=m.hp=100000;
 return {s,p,m};
}
const serial=s=>({hp:s.player.hp,time:s.time,monsters:s.monsters.map(m=>[m.defId,m.x,m.y,m.hp,m.dead,m.corpseT,m.castEpoch,m.attackCd,m.slamCd,m.summonCd,m.charging?.t,m.leaping?.t,m.whirling?.t]),projectiles:s.projectiles.map(p=>[p.x,p.y,p.dead,p.ttl]),quests:s.quests});
const allowPartial=process.argv.includes('--partial');
{
 const {s,p,m}=scene(f,'beacon');m.aggro=false;m.action=null;
 for(const [cd,frame] of [[.44,0],[.29,1],[.14,2]]){m.beaconCd=cd;eq(m.pose().ex.act1Animation?.frame,frame,'stationary beacon summon anticipation');}
 m.beaconCd=.01;m.update(.02,p,s.map);eq(m.pose().ex.act1Animation?.frame,3,'beacon pulse matches spawn');
 for(const [t,frame] of [[.2,4],[.4,5]]){s.time=m.act1Visual.release+t;eq(m.pose().ex.act1Animation?.frame,frame,'beacon summon recovery');}
}
for(const [id,spec]of Object.entries(catalog.roster)){
 const x=scene(f,id),y=scene(off,id);ok(A.eligible(x.m),id+' eligible');ok(!A.showsAttackRadius(x.m),id+' indicator hidden');
 if(!allowPartial)eq(Object.keys(f.DATA.ACT1_ANIMATIONS[id].clips).sort(),[...spec.sequences].sort(),id+' complete animation catalog');
 for(let i=0;i<36;i++){
  f.tick(x.s,1/30,1/30);off.tick(y.s,1/30,1/30);eq(serial(x.s),serial(y.s),id+' cosmetic parity');
  const rng=f.ctx.Math.random;f.ctx.Math.random=()=>{throw Error('Rendering consumed combat randomness');};
  const pose=JSON.stringify(x.m.pose().ex.act1Animation);ok(pose===JSON.stringify(x.m.pose().ex.act1Animation),id+' paused deterministic sample');f.ctx.Math.random=rng;
 }
 for(const kind of spec.sequences.filter(k=>!k.startsWith('death'))){
  if(id==='korvath'||!f.DATA.ACT1_ANIMATIONS[id].clips[kind])continue;
  const {s,m}=scene(f,id);m.startAction('attack',1.2,{enemySkill:kind});A.deferred(m,.6);const v=m.act1Visual,frames=[];
  for(const t of [.01,.22,.44]){s.time=v.start+t;frames.push(m.pose().ex.act1Animation?.frame);}
  s.time=v.start+.6;A.release(m,v);
  for(const t of [0,.22,.44]){s.time=v.release+t;frames.push(m.pose().ex.act1Animation?.frame);}
  eq(frames,[0,1,2,3,4,5],id+' '+kind+' six frames');m.stunT=1;ok(m.pose().ex.act1Animation?.rest,id+' interrupted attack returns to matching ready art');m.stunT=0;m.cancelAttacks();ok(!m.act1Visual&&!m.act1Events?.length,id+' canceled');
 }
 const {s,m}=scene(f,id);m.dead=true;m.corpseT=10;
 if(!allowPartial||f.DATA.ACT1_ANIMATIONS[id].clips.death)eq(m.pose().ex.act1Animation?.frame,5,id+' settled corpse');
 m.exploded=true;ok(!m.pose().ex.act1Animation,id+' consumed corpse');m.exploded=false;m.corpseT=0;ok(!m.pose().ex.act1Animation,id+' expired corpse');
 const old=s.map;s.map={...old};ok(!m.pose().ex.act1Animation,id+' stale world');s.map=old;
}
// Idle, travel, interruptions and expired recovery never switch to the old art.
for(const [id,spec]of Object.entries(f.DATA.ACT1_ANIMATIONS))for(const suffix of id==='korvath'?['','_1']:['']){
 const {s,m}=scene(f,id);m.encounter=null;m.aggro=false;m.spriteOpts.bossPhase=suffix?1:0;
 const expected=spec.rests['idle'+suffix];ok(expected,id+' explicit ready pose');
 for(const moving of [false,true]){m.moving=moving;m.stride=2.5;m.curSpeed=2;
  const pose=m.pose().ex.act1Animation;ok(pose.rest,id+' has matching rest art');eq(pose.asset,expected.asset,id+' idle/walk artwork');eq(pose.index,expected.row*6+expected.frame,id+' idle/walk anchor frame');eq(pose.id,(moving?'walk':'idle')+suffix,id+' rest state');
 }
 const kind=id==='korvath'?'cleave':spec.sequences[0];m.moving=false;m.startAction('attack',1.2,{enemySkill:kind});A.deferred(m,.6);s.time+=.6;A.release(m,m.act1Visual);s.time+=1;m.action=null;
 ok(m.pose().ex.act1Animation.rest,id+' expired recovery restores matching art');
 m.stunT=1;ok(m.pose().ex.act1Animation.still,id+' interruption freezes rest motion');m.stunT=0;m.startAction('hit',.15);ok(m.pose().ex.act1Animation.rest,id+' hit reaction keeps identity');
}
// Real Yeti attack: aim locks, no hit before release, exactly one cold hit.
for(const mode of ['hit','dodge','stun','death','travel','wall']){
 const {s,p,m}=scene(f,'frost_wyrm');m.slamCd=100;m.breathCd=0;p.x=m.x+3;p.y=m.y;const hits=[];p.takeDamage=(damage,owner,elem)=>hits.push({damage,elem});
 m.update(.01,p,s.map);eq(m.act1Visual?.kind,'breath','Yeti dispatch');ok(m.attackWarning.shape.kind==='cone','Yeti geometry');eq(hits.length,0,'no early breath damage');
 if(mode==='dodge')p.y+=6;if(mode==='stun')m.stunT=1;if(mode==='death'){m.dead=true;m.cancelAttacks();}if(mode==='travel')s.map={...s.map};
 if(mode==='wall')m.combatLos=()=>false;
 f.Game.__bossTest.flush(.81);eq(hits.length,mode==='hit'?1:0,mode+' breath resolution');
 if(mode==='hit'){eq(hits[0].elem,'cold','cold mitigation path');f.Game.__bossTest.flush(.5);eq(hits.length,1,'no duplicate breath');}
}
for(const [id,field,element]of [['frost_archer','projectile','cold'],['ice_lurker',null,'cold'],['grave_wraith',null,'shadow'],['caustic_ooze',null,'poison'],['barb_sword','whirl','light'],['hoarfang','slam','cold']]){
 const d=f.DATA.resolveEnemy(id,'north_wild');eq(field?d[field].elem:d.meleeElem,element,id+' element');
 eq(f.DATA.resolveEnemy(id,'barrow'),f.DATA.ENEMIES[id],id+' other act catalog untouched');
}
const yd=f.DATA.resolveEnemy('frost_wyrm','north_wild');eq(yd.name,'Frostmaw Yeti','replacement name');ok(!yd.projectile&&yd.artId==='identity_frostmaw_yeti'&&yd.family==='beast','replacement identity');
for(const k of ['hp','dmg','armor','def','xp','speed','atkRate','big'])eq(yd[k],f.DATA.ENEMIES.frost_wyrm[k],'Yeti preserves '+k);
// Exercise the real resistance and existing summon aura mitigation paths.
for(const elem of ['phys','cold','fire','light','poison','shadow']){
 const {s,p,m}=scene(f,'ice_lurker');
 Object.assign(p.stats,{armor:150,resCold:45,resFire:20,resLight:30,resPoison:55,dmgReducePct:10,dmgTakenPct:0,dmgReduceFlat:3,magicReduceFlat:5,dmgToMana:0});
 const before=p.hp,res={cold:45,fire:20,light:30,poison:55,shadow:0}[elem]||0;
 const expected=100*(elem==='phys'?1-Math.min(.75,150/(150+45+9*m.lvl)):1-res/100)*.9-(elem==='phys'?3:5);
 m.dealAttack(p,100,elem);ok(Math.abs(before-p.hp-expected)<1e-7,elem+' real player mitigation');
 p.summonAuraStatsFor=()=>({dmgReducePct:35});
 const pet=new f.Minion('skeleton',{hp:1000,dmg:5,speed:1,atkRate:1,range:1},p);s.minions=[pet];
 const receive=pet.takeDamage;let received;pet.takeDamage=function(amount,source,element){received=element;return receive.call(this,amount,source,element);};
 m.dealAttack(pet,100,elem);eq(received,elem,elem+' delivered to summon');eq(pet.hp,935,elem+' existing summon aura mitigation');
}
for(const mode of ['hit','stun','death','travel']){
 const {s,p,m}=scene(f,'frost_wyrm');m.breathCd=100;m.slamCd=0;const hits=[];p.takeDamage=(damage,source,elem)=>hits.push({damage,elem});
 m.update(.01,p,s.map);eq(m.act1Visual.kind,'slam','Yeti real slam dispatch');eq(m.action.dur,1.5,'Yeti slam recovery');
 f.Game.__bossTest.flush(.79);eq(hits.length,0,'no early slam');
 if(mode==='stun')m.stunT=1;if(mode==='death'){m.dead=true;m.cancelAttacks();}if(mode==='travel')s.map={...s.map};
 f.Game.__bossTest.flush(.02);eq(hits.length,mode==='hit'?1:0,mode+' slam release');
 if(mode==='hit'){eq(hits[0].elem,'cold','slam is cold');f.Game.__bossTest.flush(1);eq(hits.length,1,'slam single hit');}
}
// Real death callbacks retain bursts, splits, and their travel cancellation.
for(const id of Object.keys(catalog.roster).filter(id=>catalog.roster[id].deathBurst||catalog.roster[id].split))for(const travel of [false,true]){
 const {s,p,m}=scene(f,id);let hits=0;p.x=m.x+.2;p.y=m.y;p.takeDamage=()=>hits++;m.supportedPoint=()=>true;
 m.die(p);eq(m.corpseT,12,id+' corpse lifetime');
 if(travel)s.map={...s.map};f.Game.__bossTest.flush(1);
 eq(hits,travel?0:m.def.deathBurst?1:0,id+' death burst or travel cancellation');
 const children=s.monsters.filter(x=>x!==m);
 eq(children.length,travel?0:m.def.splitOnDeath?.count||0,id+' split count or travel cancellation');
 for(const child of children)ok(catalog.roster[child.defId]&&A.eligible(child),id+' split is covered');
}
// A genuine Raise Dead cast consumes the animated corpse exactly once.
{
 const {s,p,m}=scene(f,'frost_risen','gravebinder');s.map.props=[];p.skills.raise_dead=1;p.mana=100;p.stats.maxMana=100;
 m.die(p);ok(p.performSkill('raise_dead',m),'raise starts from animated corpse');f.Game.__bossTest.flush(1);
 eq(s.minions.length,1,'one raised minion');ok(m.exploded&&m.corpseT===0&&!m.pose().ex.act1Animation,'raised corpse disappears');
 p.action=null;ok(!p.performSkill('raise_dead',m),'spent corpse cannot be reused');
}
// Production warning rendering, including bosses and thrown landing markers.
{
 const {m}=scene(f,'korvath'),enc=m.encounter;enc.attack={label:'Cleave'};enc.timer=.7;
 for(const stage of ['windup','recovery']){
  enc.stage=stage;ok(!enc.statusText().includes('0.7s'),'boss '+stage+' countdown hidden');
  f.Game.debugFlags.act1Combat=true;ok(enc.statusText().includes('0.7s'),'boss '+stage+' diagnostic countdown');f.Game.debugFlags.act1Combat=false;
 }
}
let strokes=0;const context=new Proxy({save(){},restore(){},stroke(){strokes++;},fill(){strokes++;}},{get:(o,k)=>o[k]||(()=>{})});f.Game.__bossTest.setContext(context);
for(const id of ['frost_watch_captain','hoarfang','frost_wyrm','barb_pole']){
 const {m}=scene(f,id);
 for(const type of ['enemywarning','slamwarning','meteorfall']){const shape={kind:'circle',x:m.x,y:m.y,radius:3},w={type,owner:m,x:m.x,y:m.y,ttl:.6,maxTtl:.6,radius:3,col:'#fff',shape};m.slamWarning=w;strokes=0;f.Game.__bossTest.drawFx(w,{x:0,y:0});eq(strokes,0,id+' '+type+' hidden');eq(shape.radius,3,'shape retained');}
 f.Game.debugFlags.act1Combat=true;ok(A.showsAttackRadius(m),'debug opt-in');f.Game.debugFlags.act1Combat=false;
}
fs.writeFileSync('tests/qa/act1_animation/contract.json',JSON.stringify({checks,enemies:Object.keys(catalog.roster).length,partial:allowPartial},null,2)+'\n');
console.log('PASS',checks,'northern animation, combat, element, cancellation and isolation checks'+(allowPartial?' (partial art catalog)':''));
