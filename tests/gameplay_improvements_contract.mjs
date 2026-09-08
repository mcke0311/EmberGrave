import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const noop=()=>{},sounds=[],store=new Map();let load=async()=>{},checks=0;
const node=()=>({style:{},appendChild:noop,remove:noop,getContext:()=>({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData:noop})});
const c=vm.createContext({console,Math,Date,performance,Uint8Array,Uint16Array,Int32Array,Uint32Array,Float32Array,Uint8ClampedArray,Set,Map,JSON,setTimeout,clearTimeout,
 document:{createElement:node,body:{appendChild:noop},getElementById:node},window:{addEventListener:noop,matchMedia:()=>({matches:true})},
 localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},Sfx:new Proxy({vol:{},play:id=>sounds.push(id)},{get:(t,k)=>t[k]||noop}),
 Player3D:{assets:{},projectileOrigin:()=>null},SpriteAssets:{loadBundle:(...a)=>load(...a)},UI:new Proxy({},{get:()=>noop})});
for(const f of ['utils','data','unique_powers','data_overrides','skill_perks','sprite_manifest','mapgen','navigation','items','lootfilter','entities'])vm.runInContext(fs.readFileSync(new URL('../js/'+f+'.js',import.meta.url),'utf8'),c,{filename:f});
let source=fs.readFileSync(new URL('../js/game.js',import.meta.url),'utf8');
source=source.replace('    init, newGame, loadGame,',`    __test:{freshState,safeArrival,portalPositions,campaignEvent,setState:s=>{state=s;running=true;delayed=[];saveSlotKey='improvements-test';},flush:()=>{let n=0;while(delayed.length&&n++<100){const jobs=delayed;delayed=[];for(const j of jobs)j.fn();}}},
    init, newGame, loadGame,`);
vm.runInContext(source,c,{filename:'game'});
const {D,P,M,G,N,Q,S}=vm.runInContext('({D:DATA,P:Player,M:MapGen,G:Game,N:Minion,Q:Projectile,S:TerrainSurface})',c);
const ok=(x,msg)=>{checks++;assert.ok(x,msg);},near=(a,b,msg)=>ok(Math.abs(a-b)<1e-7,msg+`: ${a} / ${b}`);
function fresh(cls='wildkeeper'){
 const p=new P('Improvements',cls),s=G.__test.freshState(p,12345);p.lvl=100;
 G.__test.setState(s);s.map=M.generate('frosthaven',s.seed);s.npcs=[];s.monsters=[];s.home='frosthaven';
 p.x=s.map.spawns.default.x;p.y=s.map.spawns.default.y;
 for(const sk of Object.values(D.SKILLS))if(sk.cls===cls)p.skills[sk.id]=1;
 p.computeStats();p.mana=200;p.stats.maxMana=1000;p.stats.manaRegen=0;p.stats.pManaPerBeast=0;
 return {p,s};
}
function companion(p,s,id='call_wolf',kind='wolf'){
 const m=new N(kind,{hp:100,dmg:[1,2],speed:3,atkRate:1,range:1,sprite:kind==='wolf'?'wolf':'golem'},p);m.sourceSkill=id;s.minions.push(m);return m;
}
for(const sk of Object.values(D.SKILLS).filter(s=>s.mana))for(const rank of [1,2,5,10,14])near(sk.mana(rank),sk.baseMana*rank,sk.id+' cost rank '+rank);
{
 const {p,s}=fresh();const skills=Object.values(D.SKILLS).filter(sk=>['summon','summon_golem'].includes(sk.type));
 ok(skills.length===7,'seven maintained companion families');
 for(const sk of skills){p.skills[sk.id]=2;companion(p,s,sk.id);}
 const other=new P('Other owner','gravebinder');other.skills[skills[0].id]=10;companion(other,s,skills[0].id);
 near(p.companionUpkeep(),14,'all seven families add per-owner upkeep');p.stats.skillAll=12;near(p.companionUpkeep(),98,'effective ranks above ten update live');
 p.spendAether(200);ok(s.minions.filter(m=>m.owner===p).every(m=>m.dead),'all seven families die at zero');ok(!s.minions.find(m=>m.owner===other).dead,'other owner retains companions');
}
{
 fresh();const record=D.CAMPAIGN.record;let ready=[{name:'Sound test',giver:'sera'}];D.CAMPAIGN.record=()=>ready.splice(0);
 sounds.length=0;G.__test.campaignEvent({kind:'talk'});G.__test.campaignEvent({kind:'talk'});ok(sounds.filter(x=>x==='questReady').length===1,'one ready cue per state transition');
 ready=[{name:'Loaded quest',giver:'sera'}];sounds.length=0;G.__test.campaignEvent({kind:'enter'},{silent:true});ok(!sounds.length,'save arrival is silent');D.CAMPAIGN.record=record;
}
{
 const {p,s}=fresh();p.skills.call_wolf=2;p.skills.thornback_boar=5;
 companion(p,s);companion(p,s);const boar=companion(p,s,'thornback_boar','boar');
 near(p.companionUpkeep(),9,'mixed upkeep');p.stats.skillAll=3;near(p.companionUpkeep(),18,'bonus ranks update upkeep');
 boar.die();near(p.companionUpkeep(),10,'dead companions excluded');
 const decoy=companion(p,s,'veilranger_1_3','decoy');near(p.companionUpkeep(),10,'decoy excluded');
 p.spendAether(200);ok(s.minions.filter(m=>m!==decoy).every(m=>m.dead),'zero mana collapses companions');ok(!decoy.dead,'decoy survives');
 p.checkAetherDepletion();ok(s.minions[0].deathT===.72,'death happens once');
}
for(const fps of [20,30,60,120]){
 const {p,s}=fresh();p.skills.call_wolf=3;companion(p,s);p.mana=100;p.stats.manaRegen=1;
 for(let i=0;i<fps*2;i++){s.time+=1/fps;p.update(1/fps);}
 near(p.mana,96,'continuous regen/upkeep '+fps+'fps');
}
{
 const {p,s}=fresh();p.skills.call_wolf=5;companion(p,s);p.mana=10;p.manaPool=20;p.update(.5);near(p.mana,18.5,'potion offsets upkeep');
 p.mana=0;p.stats.manaRegen=100;p.update(.01);ok(s.minions[0].dead,'regen cannot rescue a depleted companion');
}
{
 const {p,s}=fresh();const id='call_wolf';p.mana=p.resolveSkill(id).mana(p.effRank(id));
 ok(p.performSkill(id,null,{x:p.x,y:p.y}),'last-aether summon accepted');G.__test.flush();ok(s.minions.length===1&&s.minions[0].dead,'delayed summon dies at zero');
 p.mana=0;p.form='fang';p.buffs.push({id:'form_fang',stats:{},until:Infinity});
 const form=Object.values(D.SKILLS).find(sk=>sk.cls==='wildkeeper'&&sk.type==='form'&&sk.form==='fang');
 ok(p.performSkill(form.id,null,{x:p.x,y:p.y}),'free shape deactivation');ok(!p.form,'reverted at zero');
}
const arrows=Object.values(D.SKILLS).filter(sk=>sk.requiredWeapons);
ok(arrows.length===7,'seven arrow requirements');
for(const cat of ['bow','crossbow','sword','axe','mace','dagger','spear','wand','staff',null])for(const sk of arrows){
 const {p,s}=fresh('veilranger');p.equip.main=cat?{kind:'gear',cat,dmg:[1,3],speed:1,ranged:['bow','crossbow','wand','staff'].includes(cat),affixes:[]}:null;
 p.computeStats();p.mana=1000;const allowed=['bow','crossbow'].includes(cat),before=p.mana;
 ok(p.canUseSkillWeapon(sk.id)===allowed,sk.id+' '+cat+' eligibility');
 if(!allowed){ok(!p.performSkill(sk.id,null,{x:p.x+1,y:p.y}),sk.id+' invalid rejected');near(p.mana,before,'no charge for invalid weapon');ok(!p.action&&!p.command,'no invalid action');}
}
for(const id of ['veilranger_0_1','veilranger_0_2','veilranger_0_4','veilranger_0_5']){
 const {p,s}=fresh('veilranger');p.equip.main={kind:'gear',cat:'bow',dmg:[1,3],speed:1,ranged:true,affixes:[]};p.computeStats();p.mana=1000;
 ok(p.performSkill(id,null,{x:p.x+3,y:p.y}),'bow casts '+id);const paid=p.mana;
 p.equip.main={kind:'gear',cat:'sword',dmg:[1,3],speed:1,affixes:[]};p.computeStats();const afterGear=p.mana;G.__test.flush();p.releaseDraw();
 ok(s.projectiles.length===0,'swap cancels unreleased '+id);near(p.mana,afterGear,'no refund after swap');ok(paid<1000,'cast was paid');
}
{
 const {p,s}=fresh('veilranger');p.equip.main={cat:'bow'};
 const arrow=new Q({x:p.x,y:p.y,tx:p.x+1,ty:p.y,speed:1,kind:'arrow',fromPlayer:true});p.equip.main={cat:'wand'};
 ok(arrow.arrowWeapon,'released arrow keeps weapon identity');ok(!new Q({x:p.x,y:p.y,tx:p.x+1,ty:p.y,speed:1,kind:'arrow',fromPlayer:true}).arrowWeapon,'wand projectile cannot use coat');
}
{
 const {p,s}=fresh();await G.enterMap('north_wild','default');const original=s.map;
 const point=G.__test.safeArrival(s.map,{x:p.x+4,y:p.y+3});p.x=point.x;p.y=point.y;companion(p,s);
 ok(G.castPortal(),'portal created');const portal=s.portal;
 let release;load=()=>new Promise(r=>{release=r;});const going=G.usePortal();
 ok(!await G.usePortal(),'duplicate travel rejected');ok(s.map===original,'source retained while loading');release();load=async()=>{};
 ok(await going,'entered home');ok(s.map.id==='frosthaven','linked home used');
 sounds.length=0;load=async()=>{throw Error('deliberate load failure');};const homeMap=s.map,x=p.x,y=p.y;
 ok(!await G.usePortal(),'failed return reports failure');ok(s.map===homeMap&&p.x===x&&p.y===y,'failed return preserves source');ok(!sounds.includes('teleportTravel'),'failed travel silent');
 load=async()=>{};ok(await G.usePortal(),'return succeeds');ok(s.map===original,'same world instance');near(p.x,point.x,'exact return x');near(p.y,point.y,'exact return y');
 ok(s.minions.every(m=>Math.hypot(m.x-p.x,m.y-p.y)<2),'companions at arrival');ok(sounds.filter(x=>x==='teleportTravel').length===1,'one travel cue');
 await G.enterMap('marshcamp','default');ok(!G.__test.portalPositions().some(p=>!p.gate),'portal absent from unrelated hub');
 await G.enterMap('north_wild','default');p.x+=1;G.castPortal();ok(s.portal!==portal,'new portal replaces previous');
}
{
 const {p,s}=fresh();const shifting=Object.values(D.ZONES).find(z=>z.shifting);
 await G.enterMap(shifting.id,'default');const instance=s.map,visits=s.cathedralVisits;G.castPortal();await G.usePortal();await G.usePortal();
 ok(s.map===instance&&s.cathedralVisits===visits,'cathedral portal preserves layout');
 await G.enterMap('frosthaven','default');await G.enterMap(shifting.id,'default');ok(s.map!==instance,'ordinary cathedral entry regenerates');
 await G.enterMap('frosthaven','default');await G.usePortal();ok(s.map===instance,'portal retains original instance after another cathedral was generated');
 s.shrines.push('north_wild');sounds.length=0;ok(await G.travelToShrine('north_wild'),'attuned waypoint travels');
 ok(!await G.travelToShrine('north_wild'),'current waypoint rejected');ok(!await G.travelToShrine('drowned_crypt'),'locked waypoint rejected');
 ok(sounds.filter(x=>x==='teleportTravel').length===1,'waypoint has one cue');
}
{
 const {p,s}=fresh();const map={w:5,h:5,spawns:{default:{x:1.5,y:1.5}},tiles:new Uint8Array(25),blocked:new Uint8Array(25)};
 const old=M.walkable;M.walkable=(_m,x,y)=>x>=0&&y>=0&&x<5&&y<5&&!(x>=2&&x<3&&y>=2&&y<3);
 const pos=G.__test.safeArrival(map,{x:2.5,y:2.5});ok(M.walkable(map,pos.x,pos.y),'blocked return relocates');M.walkable=old;
 ok(G.canTradeWith({id:'hewn'}),'vendor offers trade');ok(!G.canTradeWith({id:'sera'}),'non-vendor has no marker');ok(!G.canTradeWith({id:'hewn',survivor:true}),'rescued character has no trade');
}
console.log('PASS '+checks+' gameplay improvements checks: costs, upkeep, weapons, portal loading, cathedral return, waypoints and trade.');
