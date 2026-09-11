import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fixture} from './boss_fixture.mjs';
const before=fixture({sourceDirectory:'tmp/cinders_enemies/before/js',dataSeed:518}),f=fixture({dataSeed:518});
let checks=0;const ok=(value,message)=>{assert.ok(value,message);checks++;};
const equal=(a,b,message)=>{assert.deepEqual(JSON.parse(JSON.stringify(a??null)),JSON.parse(JSON.stringify(b??null)),message);checks++;};
const campaignIds=[...new Set(['ash_wastes','cinder_bastion','throne'].flatMap(z=>f.DATA.ZONES[z].spawns))].sort();
ok(campaignIds.every(id=>f.DATA.ACT5_COMBAT_PROFILES[id]),'Every resident Act 5 enemy has an explicit profile');
// Audit the entire combat catalog, including creatures reserved for the editor.
const ids=Object.keys(f.DATA.ACT5_COMBAT_PROFILES).sort();equal(ids.length,50);
const audit=ids.map(id=>{
 const d=f.DATA.ENEMIES[id],b=before.DATA.ENEMIES[id];
 for(const key of ['hp','dmg','armor','xp','pack','speed','artId','faction','family'])equal(d[key],b[key],id+' preserves '+key);
 for(const [key,value]of Object.entries(f.DATA.ACT5_COMBAT_PROFILES[id]))equal(d[key],value,id+' '+key);
 return {id,name:d.name,artwork:d.artId,weapon:d.artReview.weapon,role:d.role,element:d.meleeElem||d.projectile?.elem||Object.keys(d.elemDmg||{})[0]||'phys',basic:d.projectile?'projectile':'melee',projectile:d.projectile,bonusElements:d.elemDmg,range:d.range,keepDist:d.keepDist,attackRate:d.atkRate,specials:Object.fromEntries(['slam','charge','leap','whirl','volley','summons','heals','teleports','deathBurst','splitOnDeath','shield','chillOnHit','lifeOnHit','throwUndead'].filter(k=>d[k]).map(k=>[k,d[k]]))};
});
function scene(id,fx=f){
 const {s,p}=fx.fresh('vethriss',518);s.map.surfaceVersion=0;s.map.blocked.fill(0);s.map.elev.fill(0);s.map.hazards=[];s.map.bossArena=null;s.map.zone={...s.map.zone,infight:true};
 p.x=66.5;p.y=60.5;p.stats.dodge=0;p.stats.block=0;p.stats.thorns=0;p.hp=1e7;p.tryBlock=()=>false;
 const m=new fx.Monster(id,60.5,60.5);m.aggro=true;s.monsters=[m];s.minions=[];s.projectiles=[];s.fx=[];
 m.slamCd=m.chargeCd=m.leapCd=m.whirlCd=m.volleyCd=m.summonCd=m.healCd=m.teleCd=m.throwCd=100;
 fx.ctx.Math.random=()=>.2;
 return {s,p,m};
}
function pet(s,x,y){const t={x,y,radius:.4,hp:100000,maxHp:100000,lvl:22,slowT:0,slowPct:0,hits:[],takeDamage(n,source,elem){this.hp-=n;this.hits.push({n,elem});}};s.minions.push(t);return t;}
function healerBug(fx){const {s,p,m}=scene('r79_warlord',fx);p.x=60.5;p.y=65.5;m.healCd=0;m.attackCd=100;const rival=new fx.Monster('ash_fiend',61.5,60.5);rival.hp=10;s.monsters.push(rival);m.update(.01,p,s.map);fx.Game.__bossTest.flush(1);return rival.hp;}
function chargeBug(fx){const {s,p,m}=scene('infernal_warlord',fx);p.x=72.5;const t=pet(s,65.5,60.5);m.chargeCd=0;m.update(.01,p,s.map);fx.Game.__bossTest.flush(.6);for(let i=0;i<9;i++){m.update(.1,p,s.map);fx.Game.__bossTest.flush(.1);}return t.hits.length;}
equal(healerBug(before),50,'Fresh baseline reproduces rival heal 10→50');equal(healerBug(f),10,'Rival cannot receive healing');
equal(chargeBug(before),0,'Fresh baseline reproduces charge missing selected pet');ok(chargeBug(f)>0,'Charge damages selected pet');
{
 const {s,p,m}=scene('r79_warlord');const ally=new f.Monster('r79_warlord',61.5,60.5);ally.hp=10;s.monsters.push(ally);m.healCd=0;m.update(.01,p,s.map);f.Game.__bossTest.flush(.4);equal(ally.hp,50,'Allied rally retained');
 ally.hp=10;ally.noHeal=true;m.action=null;m.healCd=0;m.update(.01,p,s.map);f.Game.__bossTest.flush(.4);equal(ally.hp,10,'Healing prevention respected');
}
for(const id of ids){
 const d=f.DATA.ENEMIES[id];
 for(const distance of [1,7,16]){
  const {s,p,m}=scene(id);p.x=m.x+distance;m.update(.01,p,s.map);f.Game.__bossTest.flush(.5);
  if(distance===16)equal(s.projectiles.length,0,id+' cannot shoot beyond range');
  if(d.projectile&&distance<=d.range)ok(s.projectiles.length>0,id+' uses ranged basic at '+distance);
  if(!d.projectile)equal(s.projectiles.length,0,id+' never casts a ranged basic');
 }
}
for(const id of ['r50_knight','r55_knight','r70_knight','r46_brute','r52_brute','r72_brute','r79_warlord','r84_warlord']){
 const {s,p,m}=scene(id);const t=pet(s,61.5,60.5);m.update(.01,p,s.map);f.Game.__bossTest.flush(.5);
 ok(t.hits.some(h=>h.elem===m.def.meleeElem),id+' elemental weapon hit');
 if(m.def.chillOnHit)ok(t.slowT>0,id+' melee chill independent of elemDmg');
}
for(const id of ['r44_imp','r61_wraith']){
 const {s,p,m}=scene(id),t=pet(s,63.5,60.5);m.update(.01,p,s.map);f.Game.__bossTest.flush(.4);for(let i=0;i<40;i++)for(const pr of s.projectiles)if(!pr.dead)pr.update(.02,s.map,p,s.monsters);
 ok(t.hits.length>0,id+' projectile selected pet');ok(t.slowT>0,id+' projectile chill');equal(t.hits[0].elem,'cold');
}
{
 const {s,m}=scene('r41_brute'),t=pet(s,61.5,60.5);m.hp=100;t.hp=5;m.dealAttack(t,100,'phys',true);equal(m.hp,100.5,'Lifesteal uses actual health lost, capped at remaining HP');
 m.noHeal=true;t.hp=50;m.dealAttack(t,20,'phys',true);equal(m.hp,100.5,'Lifesteal respects noHeal');
}
for(const kind of ['slam','charge','leap','whirl']){
 const id={slam:'r46_brute',charge:'r57_brute',leap:'r53_imp',whirl:'r84_warlord'}[kind];
 for(const interrupted of ['stun','freeze','fear','pull','removed','map','dead']){
  const {s,p,m}=scene(id);p.x=m.x+(kind==='slam'?2:5);m[kind+'Cd']=0;m.update(.01,p,s.map);
  ok(m.attackWarning,kind+' warning starts');ok(m.attackWarning.maxTtl>=(kind==='slam'?.8:.6),kind+' warning duration');
  if(interrupted==='stun')m.stunT=2;if(interrupted==='freeze')m.frozen=s.time+2;if(interrupted==='fear')m.feared=s.time+2;if(interrupted==='pull')m.pulled={fx:m.x,fy:m.y,tx:m.x,ty:m.y,t:0,dur:2,stun:0};
  if(interrupted==='removed')s.monsters=[];if(interrupted==='map')s.map={...s.map};if(interrupted==='dead')m.dead=true;
  const hp=p.hp;f.Game.__bossTest.flush(1);equal(p.hp,hp,kind+' canceled on '+interrupted);ok(!m.charging&&!m.leaping&&!m.whirling,kind+' cannot start after '+interrupted);
 }
}
for(const id of ['r46_brute','r57_brute','r53_imp','r84_warlord','r74_robed','r50_knight']){
 const {s,p,m}=scene(id);p.x=m.x+2;s.map.blocked[61+60*s.map.w]=1;
 m.slamCd=m.chargeCd=m.leapCd=m.whirlCd=m.volleyCd=0;m.update(.01,p,s.map);f.Game.__bossTest.flush(1);
 equal(s.projectiles.length,0,id+' no blocked shot');equal(p.hp,1e7,id+' no damage through wall');ok(!m.attackWarning,id+' no blocked special');
}
{
 const {s,p,m}=scene('r57_brute');p.x=65.5;m.chargeCd=0;m.update(.01,p,s.map);f.Game.__bossTest.flush(.6);s.map.blocked[63+60*s.map.w]=1;
 for(let i=0;i<15&&m.charging;i++)m.update(.1,p,s.map);ok(m.x<63-m.radius,'Ground charge stops at wall');
}
{
 const {s,p,m}=scene('r57_brute');p.x=65.5;for(let y=0;y<s.map.h;y++)for(let x=63;x<s.map.w;x++)s.map.elev[x+y*s.map.w]=3;
 m.chargeCd=0;m.update(.01,p,s.map);f.Game.__bossTest.flush(1);ok(!m.charging,'Ground charge cannot cross cliff');
}
{
 const {s,p,m}=scene('r46_brute');const rival=new f.Monster('r57_brute',62.5,60.5);rival.def.faction='rival';s.monsters.push(rival);const ally=new f.Monster('r46_brute',61.5,61.5);s.monsters.push(ally);
 const hp=rival.hp,allyHP=ally.hp;m.slamCd=0;m.update(.01,p,s.map);f.Game.__bossTest.flush(.79);equal(rival.hp,hp,'No damage before warning ends');f.Game.__bossTest.flush(.02);ok(rival.hp<hp,'Slam damages eligible rival');equal(ally.hp,allyHP,'Slam spares allies');
}
{
 const {s,p,m}=scene('wretch_lord');for(let i=0;i<10;i++){m.action=null;m.summonCd=0;m.update(.01,p,s.map);f.Game.__bossTest.flush(.51);}
 equal(m.livingChildren(),6,'Ordinary summoner has six living children');for(const c of m.children){equal(c.def.faction,m.def.faction,'Summons inherit faction');ok(c.summonOwner===m,'Summon ownership');ok(c.def.xp>0,'Summon rewards retained');}
 m.children[0].dead=true;m.action=null;m.summonCd=0;m.update(.01,p,s.map);f.Game.__bossTest.flush(.51);equal(m.livingChildren(),6,'Dead child releases slot');
}
for(const transition of [false,true]){
 const {s,p,m}=scene('bone_dragon');p.x=m.x+2;m.die(p);ok(s.fx.some(x=>x.kind==='deathBurst'&&x.maxTtl>=.6),'Death burst warning');const hp=p.hp;
 f.Game.__bossTest.flush(.59);equal(p.hp,hp,'Death burst waits');if(transition)s.map={...s.map};f.Game.__bossTest.flush(.02);
 ok(transition?p.hp===hp:p.hp<hp,'Death burst '+(transition?'does not follow map change':'resolves in origin'));
}
{
 const {s,p,m}=scene('r57_brute');p.x=100;m.aggro=false;const rival=new f.Monster('ash_fiend',62,60.5);rival.aggro=false;s.monsters.push(rival);m.update(.01,p,s.map);ok(!m.aggro,'Nearby rival does not wake a pack beyond hero awareness');
}
for(const [id,sound]of [['cinder_hound','hit'],['r50_knight','swing'],['r65_knight','swing'],['r79_warlord','swing'],['r56_wraith','curse']]){
 const {m}=scene(id);equal(m.combatSound(m.def.meleeElem,m.spriteOpts.weapon,true),sound,id+' matching contact sound');
}
for(const [id,kind,distance]of [['void_gargoyle','leap',5],['r84_warlord','whirl',1]]){
 const {s,p,m}=scene(id);p.x=75;const t=pet(s,m.x+distance,m.y),rival=new f.Monster('ash_fiend',t.x+.4,t.y+.4);rival.def.faction='rival';s.monsters.push(rival);const hp=rival.hp;
 m[kind+'Cd']=0;m.update(.01,p,s.map);f.Game.__bossTest.flush(.6);for(let i=0;i<6;i++)m.update(.1,p,s.map);
 ok(t.hits.length>0,kind+' hits selected pet');ok(rival.hp<hp,kind+' hits eligible rival');
}
{
 const {s,m}=scene('r46_brute'),inside=pet(s,m.x+2.79,m.y),outside=pet(s,m.x+2.81,m.y);
 m.areaAttack({kind:'circle',x:m.x,y:m.y,radius:2.8},20,'light');equal(inside.hits.length,1,'Warning includes inside ground anchor');equal(outside.hits.length,0,'Warning excludes outside ground anchor');
}
{
 const {s,p,m}=scene('void_gargoyle');m.radius=1.2;s.map.blocked[67+60*s.map.w]=1;m.leapCd=0;m.update(.01,p,s.map);ok(!m.attackWarning&&!m.leaping,'Leap landing must fit full collision radius');
}
{
 const {s,p,m}=scene('r71_wraith');m.radius=1.2;m.def.speed=0;const angle=.2*Math.PI*2,nx=p.x+Math.cos(angle)*1.6,ny=p.y+Math.sin(angle)*1.6;s.map.blocked[Math.floor(nx+m.radius)+Math.floor(ny)*s.map.w]=1;m.teleCd=0;m.attackCd=100;
 const at=[m.x,m.y];m.update(.01,p,s.map);equal([m.x,m.y],at,'Teleport landing must fit full collision radius');
}
{
 const {s,p,m}=scene('r71_wraith');m.teleCd=0;s.map={...s.map};const at=[m.x,m.y];m.update(.5,p,s.map);equal([m.x,m.y],at,'Removed enemy cannot teleport into replacement map');m.die(p);equal(s.fx.length,0,'Off-map death cannot create effects');
}
const result={status:'PASS',checks,enemies:audit,baselineBugs:{rivalHeal:{before:50,after:10},chargePetHits:{before:0,after:1}}};
fs.mkdirSync('tests/qa/cinders_enemies',{recursive:true});fs.writeFileSync('tests/qa/cinders_enemies/combat_contract.json',JSON.stringify(result,null,2)+'\n');console.log('PASS',checks,'Act 5 enemy checks');

