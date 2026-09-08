import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fixture} from './boss_fixture.mjs';
const F=fixture(),{Game:G,MapGen:M,TerrainNavigation:N,Monster,Player,EnemySkills:E,BossEncounters:B}=F;
let checks=0;const ok=(v,s)=>{checks++;assert.ok(v,s);},near=(a,b,s)=>ok(Math.abs(a-b)<1e-6,`${s}: ${a} / ${b}`);
const zones=['cathedral1','cathedral2','cathedral_cinderwatch','cathedral_bastion'];
const seedCount=process.argv.includes('--abilities-only')?0:100;
function setup(id='hollow_knight',profile,zone='cathedral_cinderwatch',seed=123){
 const p=new Player('Skill QA','vanguard'),s=G.__bossTest.freshState(p,seed);s.map=M.generate(zone,seed);G.__bossTest.setState(s);G.debugFlags.god=false;
 const n=s.map.cathedral.rooms.find(n=>n.id==='memory')||s.map.cathedral.rooms.find(n=>n.id==='nave')||s.map.cathedral.rooms[1];
 p.x=n.x+2;p.y=n.y;p.lvl=20;p.hp=p.stats.maxHp=1e6;
 Object.assign(p.stats,{armor:0,dodge:0,block:0,thorns:0,dmgReducePct:0,dmgReduceFlat:0,magicReduceFlat:0,dmgToMana:0,pShare:0,resFire:0});
 const m=new Monster(id,n.x,n.y,{elite:!!profile,skillProfile:profile});s.monsters=[m];m.aggro=true;m.def.dmg=[10,10];m.def.dmgMult=1;
 const c=m.enemySkills;for(const k in c.cooldowns)c.cooldowns[k]=99;
 return{s,p,m,c,map:s.map};
}
function advance(f,dt){f.s.time+=dt;f.c.tick(dt,f.p,f.map);}
function start(f,id){f.c.cooldowns[id]=0;ok(f.c.start(id,f.p),'start '+id);}
function add(f,id,x=f.m.x+3,y=f.m.y+2){const m=new Monster(id,x,y);f.s.monsters.push(m);return m;}
for(const zone of zones){const f=setup('hollow_knight',null,zone);ok(f.c,'profile active '+zone);}
{const f=setup();f.s.map=M.generate('fields',123);ok(!new Monster('hollow_knight',f.m.x,f.m.y).enemySkills,'non Act IV unchanged');}
for(const dt of [1/120,1/60,1/30,.05]){
 const f=setup();start(f,'cleave');const shape=JSON.stringify(f.c.warning()),hp=f.p.hp;
 advance(f,.8-dt);near(f.p.hp,hp,'cleave warning safe');advance(f,dt);near(hp-f.p.hp,27.5,'cleave damage');
 ok(f.c.active.stage==='recovery','cleave recovery');near(f.c.active.remaining,.9,'recovery duration');
 advance(f,.9-dt);ok(f.c.active,'recovery still committed');advance(f,dt);ok(!f.c.active,'recovery ends');
 near(f.c.cooldowns.cleave,4.3,'cooldown elapsed in simulation');
}
for(const [x,y,hit] of [[2.39,0,true],[2.41,0,false],[1,1,true],[1,1.21,false],[-1,0,false]]){
 const f=setup();start(f,'cleave');f.p.x=f.m.x+x;f.p.y=f.m.y+y;const hp=f.p.hp;advance(f,.8);near(hp-f.p.hp,hit?27.5:0,'cone boundary/locked aim');
}
{
 const f=setup();start(f,'cleave');near(f.c.physicalMult(f.p,'phys'),.7,'frontal guard');near(f.c.physicalMult(f.p,'shadow'),1,'element bypass');
 near(f.m.pose().t,.12,'brace holds sword windup');
 f.p.x=f.m.x-2;near(f.c.physicalMult(f.p,'phys'),1,'flank bypass');f.p.x=f.m.x+2;
 f.m.def.armor=0;const hp=f.m.hp;f.m.takeDamage(100,f.p);near(hp-f.m.hp,70,'production physical guard');
 advance(f,.8);near(f.c.physicalMult(f.p,'phys'),1,'recovery vulnerable');near(f.m.pose().t,.5,'sword pose strikes at release');
}
{
 const f=setup('hollow_knight','cathedral_knight_guardian');ok(f.m.mods[0].id==='oathbound','fixed guardian identity');
 start(f,'cleave');const hp=f.p.hp;advance(f,.8);near(hp-f.p.hp,17.6,'first guardian sweep');
 ok(f.c.active.step===1&&f.c.warning(),'second independent warning');advance(f,.699);near(hp-f.p.hp,17.6,'full second warning');advance(f,.001);near(hp-f.p.hp,35.2,'second guardian sweep');near(f.c.active.remaining,1.3,'elite recovery');
}
{
 const f=setup('choir_priest'),ally=add(f,'hollow_knight');ally.hp=ally.maxHp-100;start(f,'heal');advance(f,.899);near(ally.maxHp-ally.hp,100,'heal channel');advance(f,.001);near(ally.maxHp-ally.hp,70,'heal amount');
 const p2=add(f,'choir_priest');p2.enemySkills.cooldowns.heal=0;ok(!p2.enemySkills.start('heal',f.p),'duplicate heal locked');
}
for(const invalid of ['noHeal','priest','boss','self','full','range','wall','dead']){
 const f=setup('choir_priest');let ally=invalid==='self'?f.m:add(f,invalid==='priest'?'choir_priest':invalid==='boss'?'empty_archangel':'hollow_knight');ally.hp=ally.maxHp-50;
 if(invalid==='noHeal')ally.noHeal=true;if(invalid==='full')ally.hp=ally.maxHp;if(invalid==='range')ally.x=f.m.x+7;if(invalid==='dead')ally.dead=true;
 if(invalid==='wall'){for(let y=0;y<f.map.h;y++)f.map.blocked[Math.floor(f.m.x+1)+y*f.map.w]=1;}
 f.c.cooldowns.heal=0;ok(!f.c.start('heal',f.p),'invalid heal '+invalid);
}
for(const change of ['noHeal','full','dead','range','wall']){
 const f=setup('choir_priest'),a=add(f,'hollow_knight');a.hp=a.maxHp-50;start(f,'heal');
 if(change==='noHeal')a.noHeal=true;if(change==='full')a.hp=a.maxHp;if(change==='dead')a.dead=true;if(change==='range')a.x+=9;
 if(change==='wall')for(let y=0;y<f.map.h;y++)f.map.blocked[Math.floor(f.m.x+1)+y*f.map.w]=1;
 const hp=a.hp;advance(f,.9);near(a.hp,hp,'heal revalidates '+change);
}
{
 const f=setup('choir_priest'),a=add(f,'hollow_knight');a.hp-=50;const second=add(f,'choir_priest');start(f,'heal');second.enemySkills.cooldowns.heal=0;ok(!second.enemySkills.start('heal',f.p),'pending heal reserved');
 f.c.cancel();ok(second.enemySkills.start('heal',f.p),'canceled heal releases recipient');
}
for(const mode of ['normal','block','dodge','absorb','partial','overkill','noHeal','cap']){
 const f=setup('soul_eater');f.m.hp=f.m.maxHp/2;const hp=f.m.hp;f.p.hp=mode==='overkill'?3:1000;
 if(mode==='block')f.p.stats.block=100;if(mode==='dodge')f.p.stats.dodge=100;if(mode==='noHeal')f.m.noHeal=true;
 if(['absorb','partial'].includes(mode))f.p.boneWard={hp:mode==='absorb'?100:12,until:999,retal:0};if(mode==='cap')f.m.def.dmg=[1e5,1e5];
 const lost=f.c.hit(f.p,1,'phys',{drain:true});const expected=['block','dodge','absorb','noHeal'].includes(mode)?0:Math.min(lost*.15,f.m.maxHp*.05);
 near(f.m.hp-hp,expected,'actual HP drain '+mode);if(mode==='partial')near(lost,10,'absorption excluded');if(mode==='overkill')near(lost,3,'overkill excluded');
}
{
 const f=setup('soul_eater');f.p.x=f.m.x+4;start(f,'rush');const hp=f.p.hp,x=f.m.x;advance(f,.649);near(f.m.x,x,'rush warning stationary');advance(f,.001);advance(f,.4);near(f.m.x,x+4,'rush distance');near(hp-f.p.hp,22,'one rush hit');near(f.c.active.remaining,.8,'rush recovery');advance(f,.4);near(hp-f.p.hp,22,'rush no repeat hit');
}
{
 const f=setup('soul_eater');f.p.x=f.m.x+4;start(f,'rush');const x=f.m.x;
 for(let y=0;y<f.map.h;y++)f.map.blocked[Math.floor(x+2)+y*f.map.w]=1;
 advance(f,.65);advance(f,.3);ok(f.m.x<x+2&&N.clear(f.map,f.m.x,f.m.y,f.m.radius),'rush stops at new obstacle');ok(f.c.active.stage==='recovery','blocked rush recovers');
}
{
 const f=setup('memory_wraith');f.p.x=f.m.x+5;const origin={x:f.m.x,y:f.m.y};start(f,'blink');const point={...f.c.active.point};advance(f,.799);near(f.m.x,origin.x,'blink not instant');advance(f,.001);near(f.m.x,point.x,'blink marked position');const hp=f.p.hp;
 advance(f,.399);near(f.p.hp,hp,'landing cone warned');advance(f,.001);near(hp-f.p.hp,19.8,'spectral strike');near(f.p.slowPct,20,'brief slow');near(f.p.slowT,1.25,'slow duration');near(f.c.active.remaining,.8,'blink recovery');
 f.c.hit(f.p,.9,'shadow',{slow:20,slowTime:1.25});near(f.p.slowPct,20,'slow does not stack');near(f.p.slowT,1.25,'slow refreshes');
}
{
 const f=setup('memory_wraith');f.p.x=f.m.x+5;start(f,'blink');const q=f.c.active.point,x=f.m.x;add(f,'hollow_knight',q.x,q.y);advance(f,.8);near(f.m.x,x,'blink occupied landing rejected');
}
{
 const f=setup('choir_priest','cathedral_priest_guardian');start(f,'chorus');const shape=f.c.warning(),hp=f.p.hp;f.p.x+=2.21;advance(f,1);near(hp-f.p.hp,0,'chorus locked circle edge');near(f.c.active.remaining,1.1,'chorus recovery');ok(f.m.mods[0].id==='echoing','fixed priest identity');
 f.c.cancel();f.p.x=shape.x;f.p.y=shape.y;start(f,'chorus');advance(f,1);near(hp-f.p.hp,14.3,'chorus shadow damage');near(f.p.slowPct,20,'chorus slow');
}
for(const status of ['stun','freeze','fear','death','playerDeath','departure'])for(const id of ['hollow_knight','choir_priest','soul_eater','memory_wraith']){
 const f=setup(id);const skill={hollow_knight:'cleave',choir_priest:'heal',soul_eater:'rush',memory_wraith:'blink'}[id];
 if(skill==='heal')add(f,'hollow_knight').hp-=50;if(['rush','blink'].includes(skill))f.p.x=f.m.x+5;
 start(f,skill);const hp=f.p.hp;if(status==='stun')f.m.stunT=1;if(status==='freeze')f.m.frozen=f.s.time+1;if(status==='fear')f.m.feared=f.s.time+1;
 if(status==='death')f.m.die(f.p);if(status==='playerDeath')G.onPlayerDeath(f.m);if(status==='departure'){E.cancelAll();f.s.map=M.generate('cathedral_bastion',9);}
 F.tick(f.s,.2);ok(!f.c.active&&!f.c.warning(),`${id} cancels ${status}`);near(f.p.hp,hp,`${id} no delayed damage ${status}`);
}
{
 const f=setup(),b=add(f,'hollow_knight',f.m.x,f.m.y+1),c=add(f,'hollow_knight',f.m.x,f.m.y-1);start(f,'cleave');b.enemySkills.cooldowns.cleave=c.enemySkills.cooldowns.cleave=0;
 ok(b.enemySkills.start('cleave',f.p),'second warning allowed');ok(!c.enemySkills.start('cleave',f.p),'third warning deferred');b.enemySkills.cancel();
 const boss=add(f,'malthoron');boss.encounter.active=true;boss.encounter.stage='windup';boss.encounter.attack={shapes:[{x:f.p.x,y:f.p.y}]};ok(!c.enemySkills.start('cleave',f.p),'boss consumes one warning slot');
 boss.encounter.stage='idle';ok(c.enemySkills.start('cleave',f.p),'second regular warning starts before boss');boss.encounter.start('chains',f.p);ok(f.s.monsters.filter(m=>m.enemySkills?.warning()).length===1,'late boss warning takes priority without changing its timing');near(boss.encounter.timer,1,'boss warning timing preserved');
}
{
 const f=setup('choir_priest'),sounds=[];F.ctx.Sfx.play=k=>sounds.push(k);f.c.fight(f.p,f.map);ok(f.c.active.id==='bolt'&&f.m.action.state==='cast','Soul Bolt casting pose');advance(f,.35);
 const p=f.s.projectiles[0];ok(p.elem==='shadow'&&p.kind==='soulbolt'&&p.bossMult===.8,'Soul Bolt type/multiplier');ok(!sounds.includes('bow'),'no priest bow sound');
 const hp=f.p.hp;F.tick(f.s,.3);near(hp-f.p.hp,17.6,'production Soul Bolt impact multiplier');
}
{
 const f=setup('choir_priest'),random=F.ctx.Math.random;f.m.blindUntil=999;F.ctx.Math.random=()=>.1;f.c.fight(f.p,f.map);advance(f,.35);ok(!f.s.projectiles.length,'Soul Bolt respects existing blindness');F.ctx.Math.random=random;
}
{
 const f=setup('memory_wraith');f.p.x=f.m.x+1;const random=F.ctx.Math.random;F.ctx.Math.random=()=>.1;f.c.fight(f.p,f.map);const hp=f.p.hp;advance(f,.33);near(hp-f.p.hp,17.6,'ordinary Wraith shadow damage');near(f.c.basicCd,1.27,'ordinary cooldown includes occupied animation time');F.ctx.Math.random=random;
}
{
 const a=setup('hollow_knight',null,'cathedral1',12),one=new Monster('hollow_knight',a.m.x,a.m.y),two=new Monster('hollow_knight',a.m.x+1,a.m.y),three=new Monster('hollow_knight',a.m.x,a.m.y);
 near(one.enemySkills.cooldowns.cleave,three.enemySkills.cooldowns.cleave,'same seed and spawn stagger reproducible');ok(one.enemySkills.cooldowns.cleave!==two.enemySkills.cooldowns.cleave,'nearby initial cooldowns staggered');
}
for(const id of ['malthoron','azram']){const f=F.fresh(id);f.e.active=true;f.e.start('chains',f.p);ok(f.e.attack.label===(id==='malthoron'?'Quieting Chains':'Chains of Khal-Zahir'),'boss chains identity');}
// Authored spawn mixtures and collision safety at rooms, every entrance, bridges and arena edges.
let rushes=0,blinks=0;
for(const zone of zones)for(let seed=0;seed<seedCount;seed++){
 const f=setup('soul_eater',null,zone,Math.imul(seed+1,2654435761)>>>0),map=f.map;
 const finale=map.monsterSpawns.filter(m=>m.cathedralEncounter==='memory_guard');
 if(zone.includes('cathedral_')){ok(finale.length===5,'all five cache guards');ok(finale[0].skillProfile===(zone==='cathedral_bastion'?'cathedral_priest_guardian':'cathedral_knight_guardian'),'guardian profile');ok(finale.filter(s=>s.id==='choir_priest').length===(zone==='cathedral_bastion'?1:0),'mixed finale');}
 for(const room of map.cathedral.rooms){const group=map.monsterSpawns.filter(m=>Math.abs(m.x-room.x)<=2&&m.y>=room.y&&m.y<=room.y+2);if(room.id.startsWith('ritual'))ok(group.filter(m=>m.id==='choir_priest').length===0,'ritual objective priest supplies support');}
 const bridgePoints=map.cathedral.connections.flatMap(e=>e.points.slice(1).flatMap((b,i)=>{const a=e.points[i],steps=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/5);return Array.from({length:steps+1},(_,k)=>({x:a.x+(b.x-a.x)*k/steps+.5,y:a.y+(b.y-a.y)*k/steps+.5}));}));
 const points=[...map.monsterSpawns,...Object.values(map.spawns),...bridgePoints].filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y));
 if(map.bossArena)points.push({x:map.bossArena.x0-1,y:map.bossArena.cy});
 for(const point of points){f.m.x=point.x;f.m.y=point.y;if(!N.clear(map,f.m.x,f.m.y,f.m.radius))continue;
  for(const angle of [0,Math.PI/2,Math.PI,Math.PI*1.5]){
   f.p.x=point.x+Math.cos(angle)*5;f.p.y=point.y+Math.sin(angle)*5;
   const shape=f.c.rushShape(f.p,E.profiles.soul_eater.skills.rush);
   if(shape){rushes++;ok(shape.length<=5.00001,'rush maximum length');for(let d=0;d<=shape.length;d+=.2)ok(N.clear(map,shape.x+Math.cos(shape.angle)*d,shape.y+Math.sin(shape.angle)*d,f.m.radius),'rush full collision clearance');}
   const landing=f.c.blinkPoint(f.p);if(landing){blinks++;ok(N.clear(map,landing.x,landing.y,f.m.radius),'blink footprint');ok(!map.void[(landing.x|0)+(landing.y|0)*map.w],'blink never void');if(map.bossArena)ok(!B.insideArena(map.bossArena,landing.x,landing.y,-f.m.radius),'ordinary flanker excludes boss arena');}
  }
 }
}
if(seedCount)ok(rushes>10000&&blinks>10000,'meaningful multi-seed coverage');
const report={status:'PASS',checks,seedsPerZone:seedCount,zones,rushes,blinks};fs.writeFileSync('tests/qa/cathedral/enemy_'+(seedCount?'contract':'abilities')+'.json',JSON.stringify(report,null,2)+'\n');console.log(report);

