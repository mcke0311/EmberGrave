import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {enemyFixture} from './act2_enemy_fixture.mjs';
const f=enemyFixture({gameExports:['enemiesByFamily','triggerEvent']}),{Game:G,DATA:D,C}=f;let checks=0;const ok=(v,s)=>{checks++;assert.ok(v,s);};
const rewards=[];G.onMonsterDeath=m=>rewards.push(m.defId);
const tick=(s,t)=>f.tick(s,t,.025),freezeOther=c=>{for(const k in c.cooldowns)c.cooldowns[k]=999;};
const scene=(id,zone,opts)=>{const q=f.scene(id,zone,opts);freezeOther(q.c);return q;};
const member=(s,p,dx=0)=>({x:p.x+dx,y:p.y,radius:.36,hp:1e6,maxHp:1e6,dead:false,slowT:0,slowPct:0,takeDamage(n){this.hp-=n;}});
// Every retained identity executes a real basic attack with matching equipment.
for(const id of [...new Set(Object.values(D.ACT2_COMBAT.pools).flatMap(Object.keys)), 'choir_herald','brood_mother','choirmaster']){
 const {s,p,m,c}=scene(id);m.x=p.x-(m.def.projectile?4:1);c.cooldowns.basic=0;const old=p.hp;tick(s,4);
 ok(c.history.includes(m.def.projectile?'bolt':'melee'),id+' basic release');ok(p.hp<old,id+' basic damage');
 ok(m.spriteOpts.weapon===(m.def.projectile?'wand':'none'),id+' visible weapon');
}
// Bolts carry their slow only on an unblocked hit; stale expired slows do not win.
for(const blocked of [false,true]){
 const {s,p,m,c}=scene('silent_cultist');p.slowPct=70;p.slowT=0;p.tryBlock=()=>blocked;p.stats.ccReduce=20;
 c.bolt(p);tick(s,.9);ok(blocked?p.slowT===0:p.slowT>0&&p.slowPct===20,'cold hit / block');
}
{
 const {s,p,m,c}=scene('silent_cultist');p.x+=5;const pet=member(s,m);pet.x=m.x+1;s.minions=[pet];c.bolt(p);tick(s,.7);ok(pet.slowT>0&&pet.slowPct===20,'companion cold hit');
}
// Every windup cancels before release on stun, frozen state, hit reaction and travel.
for(const interrupt of ['stun','freeze','hit','travel','death']){
 const {s,p,m,c}=scene('song_thrall');c.bolt(p,true);
 if(interrupt==='stun')m.stunT=1;
 if(interrupt==='freeze')m.frozen=s.time+1;
 if(interrupt==='hit')m.startAction('hit',1);
 if(interrupt==='travel')s.map={...s.map};
 if(interrupt==='death')m.die(p);
 tick(s,.5);ok(s.projectiles.length===0,interrupt+' cancels unreleased fan');
}
{
 const {s,p,m,c}=scene('song_thrall');c.bolt(p,true);tick(s,.46);ok(s.projectiles.length===3,'three-bolt fan');m.die(p);tick(s,.05);ok(s.projectiles.some(p=>!p.dead),'released projectiles survive caster');
}
// Owned summons cap correctly, are supported, cannot recurse, and cleanup pays nothing.
for(const [id,cap] of [['lure_child',4],['choir_herald',4],['brood_mother',6],['choirmaster',6]]){
 const {s,p,m,c}=scene(id);
 for(let i=0;i<6;i++){c.summon();tick(s,.8);}
 ok(c.owned().length===cap,id+' summon cap');
 for(const a of c.owned()){ok(!a.def.summons,id+' recursion');ok(f.TerrainNavigation.clear(s.map,a.x,a.y,a.radius),id+' supported child');}
 const child=c.owned()[0],before=rewards.length;child.die(p);ok(rewards.length===before+1,'ordinary summon kill rewards');
 const living=c.owned();m.die(p);ok(living.every(a=>a.dead&&a.corpseT===0),id+' cleanup');ok(rewards.length===before+2,id+' cleanup no extra rewards');
}
// Sacrifice only consumes two owned creatures and locks the warned positions.
{
 const {s,p,m,c}=scene('choirmaster');c.summon();tick(s,.8);const ordinary=new f.Monster('drowned_dead',m.x+1,m.y);s.monsters.push(ordinary);
 const before=rewards.length,owned=c.owned();ok(c.sacrifice(),'sacrifice starts');ok(c.pending.warnings.length===2&&c.pending.windup===.9,'sacrifice geometry');
 tick(s,.91);ok(!ordinary.dead,'ordinary enemy survives sacrifice');ok(owned.filter(a=>a.dead).length===2,'sacrifice count');ok(rewards.length===before,'sacrifice no rewards');
}
{
 const {s,p,m,c}=scene('choirmaster');c.summon();tick(s,.8);c.sacrifice();m.stunT=1;tick(s,.1);ok(c.owned().every(a=>!a.act2Held),'interrupted sacrifice releases held allies');
}
// Requiem preserves stagger timing, and all marks share one hit set.
{
 const {s,p,m,c}=scene('choirmaster');const pet=member(s,p),immune={...member(s,p),untargetable:true};s.minions=[pet,immune];c.point=()=>({x:p.x,y:p.y});c.requiem(p);const before=p.hp;tick(s,1.3);ok(p.hp===before,'requiem warning');tick(s,.1);const hit=p.hp,petHit=pet.hp;ok(hit<before&&petHit<1e6,'requiem first impact');tick(s,1.1);ok(p.hp===hit&&pet.hp===petHit,'requiem overlapping marks single hit');ok(immune.hp===1e6,'untargetable companion excluded');
 ok(c.pending?.steps?.every(x=>x.done)||!c.pending,'requiem finishes');
}
// A marked poison corpse swells, then ruptures; there is no recursive split.
for(const id of ['bog_bloat','sludge_horror']){
 const {s,p,m,c}=scene(id);p.x=m.x+1;const pet=member(s,p);s.minions=[pet];const old=p.hp;m.die(p);tick(s,.4);
 ok(c.burst&&m.spriteOpts.scale>m.scale&&p.hp===old,id+' visible swell');tick(s,.41);ok(p.hp<old&&pet.hp<1e6,id+' poison rupture');
 if(id==='sludge_horror'){const split=s.monsters.filter(a=>a!==m&&!a.dead);ok(split.length===2&&split.every(a=>!a.def.splitOnDeath),'single split generation');}
}
for(const id of ['gnarl_treant','blight_treant','brood_mother']){
 const {s,p,m,c}=scene(id);p.x=m.x+1;c.cooldowns.slam=0;const old=p.hp;tick(s,.025);ok(c.pending?.id==='slam',id+' starts slam');
 const warning=c.pending.warnings[0];p.x=warning.x+warning.radius+.02;p.y=warning.y;const pet=member(s,m);s.minions=[pet];tick(s,1.2);
 ok(p.hp===old,id+' warning boundary safe');ok(pet.hp<1e6,id+' inside slam hits companion');
}
for(const [id,skill,windup] of [['marsh_serpent','lunge',.7],['stone_gargoyle','dive',.8],['lure_child','blink',.6]]){
 const {s,p,m,c}=scene(id);c.cooldowns[skill]=0;const old={x:p.x,y:p.y};tick(s,.025);ok(c.pending?.id===skill,id+' special starts');ok(c.pending.windup===windup,id+' warning time');
 const locked=c.pending.motion?.to||c.pending.warnings[0];p.x+=4;p.y+=3;tick(s,2.5);
 ok(c.history.includes(skill),id+' special released');ok(c.supported(m.x,m.y),id+' supported finish');
 ok(f.U.dist(m.x,m.y,p.x,p.y)>1,id+' does not track moved target');
}
// Campaign reinforcements retain their original definition and controller.
// A wall appearing during a windup cancels its bolt or stops the swept lunge.
for(const id of ['silent_cultist','marsh_serpent','stone_gargoyle']){
 const {s,p,m,c}=scene(id);if(id==='silent_cultist')c.bolt(p);else{c.cooldowns[id==='marsh_serpent'?'lunge':'dive']=0;tick(s,.025);}
 const wall=Math.floor(m.x+2);s.map.blocked=s.map.blocked.slice();for(let y=0;y<s.map.h;y++)s.map.blocked[wall+y*s.map.w]=1;
 const old=p.hp;tick(s,1.5);ok(p.hp===old,id+' wall prevents damage');ok(id==='silent_cultist'||m.x+m.radius<wall,id+' motion respects collision');
}
{
 const {s,p,m,c}=scene('lure_child');s.map.blocked=new Uint8Array(s.map.w*s.map.h).fill(1);
 ok(c.point(p.x,p.y)===null,'no landing in unsupported water');ok(c.spawn('marsh_wretch',p.x,p.y)===null,'no summon in unsupported water');
}
for(const [id,skill] of [['gnarl_treant','slam'],['stone_gargoyle','dive'],['marsh_serpent','lunge'],['lure_child','blink'],['brood_mother','summon'],['choirmaster','requiem']]){
 const {s,p,m,c}=scene(id);if(skill==='slam')p.x=m.x+1;
 c.cooldowns[skill]=0;tick(s,.025);ok(c.pending?.id===skill,id+' interruption setup');m.stunT=2;const at={x:m.x,y:m.y},old=p.hp;tick(s,1.5);
 ok(!c.pending&&p.hp===old&&m.x===at.x&&m.y===at.y,id+' interrupted special does not release');
 ok(s.monsters.length===1,id+' interrupted special creates no summons');
}
{
 const {s,p,m,c}=scene('bog_bloat');m.die(p);C.cancelAll();tick(s,1);ok(!c.burst&&s.fx.every(f=>f.type!=='act2warning'||f.ttl<=0),'travel removes corpse warning');
}
// Event families use the same local identities and seat entire bodies in safe groups.
for(const zone of Object.keys(D.ACT2_COMBAT.pools)){
 const {s,p,m}=scene('drowned_dead',zone);s.monsters=[];const group=[],ids=Object.keys(D.ACT2_COMBAT.pools[zone]);p.x=m.x-5;
 for(let i=0;i<6;i++){const a=C.eventSpawn(ids,m.x,m.y,{elite:i===0},group,f.U.rng(i+77));if(a){group.push(a);s.monsters.push(a);}}
 ok(group.length>=4,zone+' event has room');ok(group.every(a=>ids.includes(a.defId)),zone+' event local roster');
 ok(group.filter(a=>D.ACT2_COMBAT.role(a.defId)==='ranged').length<=2,zone+' event shooter cap');
 ok(group.filter(a=>D.ACT2_COMBAT.role(a.defId)==='specialist').length<=1,zone+' event specialist cap');
 for(const a of group)ok(a.act2Combat.supported(a.x,a.y)&&a.act2Grace>0,zone+' event footprint and arrival grace');
 for(const family of ['undead','beast','demon','construct'])ok(G.__bossTest.enemiesByFamily(family,13).every(id=>ids.includes(id)),zone+' event family '+family);
 s.monsters=[];const event={interact:'event',type:'shrine',x:m.x,y:m.y,ev:{name:'Contract ambush',kind:'ambush',fam:'construct',count:6}};
 s.map.props=[...s.map.props,event];G.__bossTest.triggerEvent(event);
 ok(s.monsters.length>=4&&s.monsters.every(a=>a.act2Combat&&ids.includes(a.defId)),zone+' actual event integration');
}
{
 const {s,m,e}=f.fresh('mire_mother');ok(!m.act2Combat,'Mire controller unchanged');const child=e.spawn('drowned_dead',m.x+3,m.y);
 ok(child&&!child.act2Combat&&child.def.hp===D.ENEMIES.drowned_dead.hp,'Mire reinforcement exempt');
}
{
 const {s,p}=f.scene();s.map={...s.map,act2:undefined,id:'sand_tombs',zone:D.ZONES.sand_tombs};const m=new f.Monster('drowned_dead',p.x,p.y);ok(!m.act2Combat,'other acts unmodified');
 const raw=JSON.stringify(D.ENEMIES.silent_cultist);f.scene('silent_cultist');ok(JSON.stringify(D.ENEMIES.silent_cultist)===raw,'shared definition unchanged');
}
const report={status:'PASS',checks};fs.mkdirSync('tests/qa/act2_enemies',{recursive:true});fs.writeFileSync('tests/qa/act2_enemies/skills.json',JSON.stringify(report,null,2)+'\n');console.log(report);
