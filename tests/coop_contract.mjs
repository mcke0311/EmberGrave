import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import {fixture} from './boss_fixture.mjs';
const f=fixture(),{ctx,Game:G,Player,Monster,Items,DATA:D,MapGen:M}=f;
// HTTP LAN browsers expose getRandomValues but not the secure-context randomUUID API.
Object.assign(ctx,{crypto:{getRandomValues:webcrypto.getRandomValues.bind(webcrypto)},structuredClone,Float64Array});
ctx.Player3D.assets={resolvePlayerVisual:(classId)=>({kind:'player3d',classId}),loadPlayerLoadout:async()=>{}};
ctx.Coop={active:true,host:true,authority:true,committing:true,loading:false,save(){},markCritical(){},monsterDied(){},event(){},died:p=>p.dead=true};
for(const file of ['management','coop_protocol','coop_codec','coop_commands'])vm.runInContext(fs.readFileSync(new URL('../js/'+file+'.js',import.meta.url),'utf8'),ctx);
const {CoopCodec:C,CoopCommands:Cmd}=vm.runInContext('({CoopCodec,CoopCommands})',ctx);
let checks=0;function ok(v,m){checks++;assert.ok(v,m);}
const {s,p}=f.fresh('korvath');s.map=M.generate('frosthaven',123);s.monsters=[];
p.name='Host';p.heroId='host_hero';p._coopId='host';p.inv=Items.makeGrid(10,4);p.equip={};p.attrPts=2;p.gold=200;
const guest=G.coop.makeHero('Guest','veilranger');guest.heroId='guest_hero';guest._coopId='guest';guest.x=p.x;guest.y=p.y;s.players=[p,guest];
for(const h of s.players)h.connected=true;
C.register(s);
const gear=Items.fromBase('shortsword');G.coop.drop(gear,p);C.register(s);const g=s.ground[0];g.x=p.x;g.y=p.y;
await Cmd.execute(p,{type:'pickup',targetId:g._coopId});await Cmd.execute(guest,{type:'pickup',targetId:g._coopId});
ok(p.inv.items.includes(gear)&&!guest.inv.items.includes(gear)&&!s.ground.length,'a contested drop has one owner');
await assert.rejects(()=>Cmd.execute(guest,{type:'equip',itemId:gear._coopId}),/no longer/);checks++;
await Cmd.execute(p,{type:'attribute',attribute:'wil'});ok(p.attrPts===1,'will attribute spent exactly once');
await assert.rejects(()=>Cmd.execute(p,{type:'attribute',attribute:'__proto__'}));checks++;
await assert.rejects(()=>Cmd.execute(guest,{type:'learn',skill:'emberwitch_0_0'}),/class/);checks++;
const storedGlyph={_coopId:'stored_glyph',kind:'glyph'};p.stash.items.push(storedGlyph);gear.identified=true;
const savedProps=s.map.props;s.map.props=[];
await assert.rejects(()=>Cmd.execute(p,{type:'socket',itemId:gear._coopId,socketId:storedGlyph._coopId}),/closer/);checks++;
s.map.props=savedProps;p.stash.items.splice(p.stash.items.indexOf(storedGlyph),1);
const round=C.restoreHero(C.hero(guest));ok(round.equip.main.baseId===guest.equip.main.baseId&&round.heroId===guest.heroId,'co-op hero preserves starter equipment and identity');
const snap=C.snapshot(s,2,1,true);const text=JSON.stringify(snap);ok(!text.includes('originWorld')&&!text.includes('function('),'snapshot excludes executable and world references');
const exactX=p.x;p.x=10.123456789;p.wanderT=1.23456789;
const compact=C.snapshot(s,2,2,false).groups.players.find(row=>row._coopId===p._coopId);
ok(compact.x===10.123&&!('wanderT' in compact),'network values omit AI timers and retain sub-pixel movement precision');
ok(p.x===10.123456789&&C.encode(p,true).x===p.x,'network compaction never changes host simulation or persistence values');p.x=exactX;delete p.wanderT;
const restored={...s,players:[],monsters:[],minions:[],projectiles:[],traps:[],fx:[],npcs:[],ground:[],map:{...s.map,props:[]}};
C.apply(restored,JSON.parse(text),'guest');ok(restored.player.name==='Guest'&&restored.players.length===2,'snapshot identifies the local guest');
const enemy=new Monster('frost_risen',p.x+1,p.y);s.monsters=[enemy];guest.x=enemy.x;guest.y=enemy.y;p.x+=9;
ok(enemy.pickTarget(p)===guest&&enemy.eligibleTarget(guest),'enemy selects and accepts a guest as a combat target');
ok(enemy.hostileTargets().includes(guest),'enemy area attacks include guests');
G.spawnProjectile({x:guest.x,y:guest.y,tx:guest.x+4,ty:guest.y,speed:11,kind:'arrow',fromPlayer:true,visualOwner:guest});
ok(s.projectiles[0].visualOwner===guest,'projectile retains its guest owner');
const solo=new Player('Solo','vanguard');ok(!solo.heroId,'ordinary heroes are not implicitly converted to co-op');
// A full pack cannot consume shared loot; a partial potion transfer leaves its remainder.
p.inv=Items.makeGrid(1,1);Items.autoPlace(p.inv,Items.makeConsumable('tp',10));p.belt=Array.from({length:4},()=>({id:'hp1',count:5}));p.belt[0].count=4;
G.coop.drop(Items.makeConsumable('hp1',3),p);C.register(s);const partial=s.ground.at(-1);partial.x=p.x;partial.y=p.y;
await Cmd.execute(p,{type:'pickup',targetId:partial._coopId});ok(p.belt[0].count===5&&partial.item.count===2&&s.ground.includes(partial),'partial pickup preserves the remainder');
await Cmd.execute(p,{type:'pickup',targetId:partial._coopId});ok(partial.item.count===2,'a full pack and belt leave loot intact');
for(const [classId,skills] of Object.entries({
  vanguard:['vanguard_0_0','vanguard_1_2','vanguard_2_2'],emberwitch:['emberwitch_0_0','emberwitch_1_1','emberwitch_0_6'],
  gravebinder:['gravebinder_0_2','mark_of_frailty','gravebinder_1_2'],wildkeeper:['call_wolf','fangform','wildkeeper_1_0'],
  veilranger:['veilranger_0_0','veilranger_1_0','veilranger_2_4']
}))for(const skill of skills){
  const {s:world,p:local,m}=f.fresh('korvath',123,'vanguard');m.encounter=null;m.maxHp=m.hp=1e8;m.isBoss=false;
  const actor=G.coop.makeHero('Remote '+classId,classId);actor._coopId='remote_'+classId;actor.heroId=actor._coopId;
  actor.x=m.x+1;actor.y=m.y;actor.lvl=30;actor.skills[skill]=3;actor.computeStats();actor.stats.maxMana=10000;actor.mana=10000;
  local._coopId='local';local.heroId='local_hero';world.players=[local,actor];local.x=m.x+10;
  const main=local.equip.main,localForm=local.form,localMana=local.mana;
  if(skill==='gravebinder_0_2')G.spawnCorpse(actor.x,actor.y,12);
  const cast=actor.performSkill(skill,m,{x:m.x,y:m.y,surfaceId:0});G.__bossTest.flush(2);
  ok(cast!==false,'remote '+classId+' casts '+skill);
  ok(world.player===local&&local.equip.main===main&&local.mana===localMana&&local.form===localForm,'remote cast keeps the local hero identity, equipment and resource ownership');
  ok(world.projectiles.filter(x=>x.fromPlayer).every(x=>x.visualOwner===actor)&&world.minions.every(x=>x.owner===actor)&&world.traps.every(x=>x.owner===actor),'spawned combat entities retain their actor owner');
  for(const field of ['doom','curseFrailty','killMark'])if(m[field])ok(m[field].owner===actor,field+' retains its remote owner');
  if(skill==='fangform')ok(actor.buffs.some(b=>b.id==='form_wolf')||actor.buffs.some(b=>b.id.startsWith('form_')),'remote transformation activates independently');
  // Snapshot reconstruction preserves actor references used by projectiles and summons.
  C.register(world);const snap=C.snapshot(world,3,2,true),copy={...world,players:[],monsters:[],minions:[],projectiles:[],traps:[],fx:[],npcs:[],ground:[],map:{...world.map,props:[]}};
  C.apply(copy,JSON.parse(JSON.stringify(snap)),'remote_'+classId);
  ok(copy.player.name===actor.name&&copy.minions.every(mi=>mi.owner===copy.player),'remote snapshot restores the correct hero and summon references');
}
{
  const {s:world,p:owner}=f.fresh(),actor=G.coop.makeHero('Second summoner','gravebinder');world.players.push(actor);actor.x=owner.x;actor.y=owner.y;actor.skills.gravebinder_0_7=3;actor.mana=10000;
  const companion={owner,dead:false,kindId:'bone_golem',x:actor.x,y:actor.y,hp:100,maxHp:100,die(){this.dead=true;}};world.minions=[companion];
  ok(actor.performSkill('gravebinder_0_7')===false&&!companion.dead,'one summoner cannot sacrifice another hero’s companion');
  const perks=actor.skillPerks={test:{3:'test'}};actor.clearSkillState({respec:false});ok(actor.skillPerks===perks,'falling preserves purchased talent perks');
  world.map.props.push({interact:'forge',x:actor.x,y:actor.y});actor.inv=Items.makeGrid(10,4);const potion=Items.makeConsumable('hp1',4);Items.autoPlace(actor.inv,potion);C.register(world);
  await Cmd.execute(actor,{type:'craft',recipe:'potion',items:[potion._coopId]});
  ok(actor.inv.items.some(i=>i.baseId==='hp2'&&i.count===1)&&actor.inv.items.some(i=>i.baseId==='hp1'&&i.count===1),'crafting consumes three draughts and returns the unused quantity');
  await assert.rejects(()=>Cmd.execute(actor,{type:'craft',recipe:'potion',items:[potion._coopId]}));checks++;
}
console.log('PASS '+checks+' co-op ownership, command, snapshot and persistence contract checks');
