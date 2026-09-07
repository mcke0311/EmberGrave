import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url),read=p=>fs.readFileSync(new URL(p,root),'utf8');
let checks=0;const ok=(v,m)=>{checks++;assert.ok(v,m);};
const clean=v=>JSON.parse(JSON.stringify(v,(k,val)=>['owner','visualOwner','sourceSkill','_castingSkillId','action','_animationController','path','command','_navCache','_perkCache','visual','lastTarget'].includes(k)?undefined:val));
function harness({before=false,enabled=true}={}){
  let seed=42,rngCalls=0;const math=Object.create(Math);math.random=()=>{rngCalls++;seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const noop=()=>{},canvas={getContext:()=>new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),createRadialGradient:()=>({addColorStop:noop})},{get:(t,k)=>t[k]||noop})};
  const ctx=vm.createContext({console,Math:math,Date,performance,Uint8Array,Uint16Array,Uint32Array,Float32Array,Uint8ClampedArray,Set,Map,JSON,setTimeout,clearTimeout,
    document:{createElement:()=>canvas},window:{addEventListener:noop,matchMedia:()=>({matches:false})},localStorage:{getItem:()=>null,setItem:noop},
    Sfx:new Proxy({vol:{}},{get:(t,k)=>t[k]||noop}),Player3D:{assets:{},projectileOrigin:()=>null,update:noop},UI:new Proxy({},{get:()=>noop}),LevelTerrain:{clipBehind:noop}});
  for(const f of ['utils','data','data_overrides','skill_perks','sprite_manifest','mapgen','navigation','items','lootfilter','skill_vfx'])vm.runInContext(read('js/'+f+'.js'),ctx,{filename:f});
  vm.runInContext(read((before?'tests/fixtures/skill_vfx_before/':'')+'js/entities.js'),ctx,{filename:'entities'});
  let source=read((before?'tests/fixtures/skill_vfx_before/':'')+'js/game.js');
  source=source.replace('    init, newGame, loadGame,',`    __test:{freshState,setState:s=>{state=s;delayed=[];particles=[];novas=[];bolts=[];},updateTraps,updateFx,flush:()=>{let guard=0;while(guard++<100){const i=delayed.findIndex(d=>d.t<=state.time);if(i<0)break;const job=delayed.splice(i,1)[0];job.fn();}}},\n    init, newGame, loadGame,`);
  vm.runInContext(source,ctx,{filename:'game'});
  const api=vm.runInContext('({DATA,Player,Monster,Minion,Game,SkillVFX,MapGen,SkillPerks})',ctx),{Game:G,MapGen:M,SkillVFX:V}=api;
  M.walkable=()=>true;V.setEnabled(enabled&&!before);
  function fresh(sk,rank=10,perk=-1){
    seed=42;rngCalls=0;V.reset();
    const p=new api.Player('VFX contract',sk.cls);p.lvl=100;p.x=10;p.y=10;
    const s=G.__test.freshState(p,123);s.map={id:'test',w:40,h:40,tiles:new Uint8Array(1600),walls:new Uint8Array(1600),blocked:new Uint8Array(1600),props:[],hazard:new Uint8Array(1600),zone:{lvl:1}};
    G.__test.setState(s);s.monsters=[];s.minions=[];s.fx=[];s.traps=[];s.projectiles=[];s.time=0;
    for(const skill of Object.values(api.DATA.SKILLS))if(skill.cls===sk.cls)p.skills[skill.id]=rank;
    if(perk>=0)for(const tier of [5,10])if(rank>=tier)p.chooseSkillPerk(sk.id,tier,api.SkillPerks.catalog[sk.id][tier][perk].id);
    p.computeStats();p.hp=p.stats.maxHp*.5;p.mana=100000;p.tempo=3;p.staticChg=12;
    const enemyId=Object.keys(api.DATA.ENEMIES).find(id=>!api.DATA.ENEMIES[id].boss);
    for(const [x,y] of [[11,10],[12,10],[13,10],[12,12]]){const m=new api.Monster(enemyId,x,y);m.hp=m.maxHp=1e7;m.def.armor=0;s.monsters.push(m);}
    const target=s.monsters[0];target.quarry={stacks:3,until:20};target.scorch={stacks:3,dps:4,until:20};target.curseFrailty={pct:10,until:20};target.poisonDot={dps:5,t:5};
    for(const [x,y] of [[11,11],[12,11],[13,11],[14,11]]){const m=new api.Monster(enemyId,x,y);m.dead=true;m.hp=0;m.corpseT=20;s.monsters.push(m);}
    const mi=new api.Minion('wolf',{hp:200,dmg:[5,10],speed:3,atkRate:1,range:1,sprite:'wolf',name:'Review wolf'},p);mi.sourceSkill='call_wolf';mi.hp=50;mi.x=10;mi.y=11;s.minions.push(mi);
    if(sk.type==='fireclaw'){p.form='fang';p.buffs.push({id:'form_fang',stats:{},until:100});}
    V.update(0,s);return {p,s,target};
  }
  function step(s,p,seconds){for(let i=0;i<Math.round(seconds*60);i++){
    s.time+=1/60;G.__test.flush();
    if(p.charging||p.leaping||p.spinning||p.siphon||p.drawing)p.update(1/60);
    G.__test.updateTraps(1/60);G.__test.updateFx(1/60);
    for(const pr of s.projectiles)pr.update(1/60,s.map,p,s.monsters);
    s.projectiles=s.projectiles.filter(pr=>!pr.dead);V.update(1/60,s);
  }}
  function snapshot(p,s,result){return clean({result,rngCalls,time:s.time,hp:p.hp,mana:p.mana,x:p.x,y:p.y,form:p.form,tempo:p.tempo,static:p.staticChg,buffs:p.buffs,stats:p.stats,cd:p.skillCd,
    monsters:s.monsters.map(m=>({hp:m.hp,x:m.x,y:m.y,dead:m.dead,corpseT:m.corpseT,exploded:m.exploded,stun:m.stunT,slow:m.slowT,poison:m.poisonDot,scorch:m.scorch,quarry:m.quarry,doom:m.doom,mark:m.killMark,freeze:m.frozen,frailty:m.curseFrailty,wither:m.curseWither,rabies:m.rabies})),
    minions:s.minions.map(m=>({kind:m.kind,x:m.x,y:m.y,hp:m.hp,dead:m.dead,damage:m.dmg})),traps:s.traps,fx:s.fx.map(f=>({type:f.type,x:f.x,y:f.y,ttl:f.ttl,radius:f.radius,lo:f.lo,hi:f.hi})),
    projectiles:s.projectiles.map(pr=>({x:pr.x,y:pr.y,vx:pr.vx,vy:pr.vy,kind:pr.kind,ttl:pr.ttl,lift:pr.lift})),props:s.map.props});}
  function run(sk,rank,perk){const {p,s,target}=fresh(sk,rank,perk);const result=sk.type==='passive'?(p.computeStats(),true):p.performSkill(sk.id,target,{x:11,y:11});step(s,p,2);return snapshot(p,s,result);}
  function lifecycle(id,mode='expire'){
    const sk=api.DATA.SKILLS[id],{p,s,target}=fresh(sk);s.map.props.push({x:11,y:11,type:'barrel',breakable:true});
    const accepted=p.performSkill(id,target,{x:11,y:11});
    for(let frame=0;frame<720;frame++){
      s.time+=1/60;G.__test.flush();p.update(1/60);G.__test.updateTraps(1/60);G.__test.updateFx(1/60);
      for(const mi of s.minions)mi.update(1/60,p,s.map);
      for(const mon of s.monsters)if(!mon.dead)mon.update(1/60,p,s.map);
      for(const pr of s.projectiles)pr.update(1/60,s.map,p,s.monsters);
      s.projectiles=s.projectiles.filter(pr=>!pr.dead);V.update(1/60,s);
      if(frame===35&&mode==='cancel')p.clearSkillState();
      if(frame===80&&mode==='death')target.takeDamage(1e9,p);
    }
    return snapshot(p,s,accepted);
  }
  return {...api,fresh,step,run,lifecycle,snapshot,rngCalls:()=>rngCalls};
}
const active=harness(),disabled=harness({enabled:false}),skills=Object.values(active.DATA.SKILLS);
ok(skills.length===107,'skill catalog size');
for(const sk of skills){const recipe=active.SkillVFX.recipes[sk.id];ok(recipe&&active.SkillVFX.palettes[recipe.material],sk.id+' recipe');ok((recipe.motif==='passive')===(sk.type==='passive'),sk.id+' active/passive mapping');}
const capture=process.argv.includes('--capture-baseline'),baselinePath=new URL('fixtures/skill_vfx_combat_baseline.json',import.meta.url);
const baseline=capture?{}:JSON.parse(fs.readFileSync(baselinePath,'utf8')),old=capture?harness({before:true}):null;
let scenarios=0;
for(const sk of skills)for(const rank of [1,5,10])for(const perk of rank===1?[-1]:[-1,0,1,2]){
  const key=[sk.id,rank,perk].join('/'),actual=active.run(sk,rank,perk),without=disabled.run(sk,rank,perk);
  ok(actual.result,key+' cast accepted');assert.deepEqual(actual,without,key+' cosmetic toggle changed simulation');checks++;
  // Compact deterministic snapshots cover health, resources, statuses, paths, props and RNG consumption.
  const digest=await import('node:crypto').then(({createHash})=>createHash('sha256').update(JSON.stringify(actual)).digest('hex'));
  if(capture){const before=old.run(sk,rank,perk);assert.deepEqual(actual,before,key+' differs from original combat');baseline[key]=digest;}
  else ok(digest===baseline[key],key+' differs from original combat');
  scenarios++;
}
if(capture){fs.mkdirSync(new URL('fixtures/',import.meta.url),{recursive:true});fs.writeFileSync(baselinePath,JSON.stringify(baseline,null,2)+'\n');}
const sk=skills.find(s=>s.type==='projectile'),{p,s,target}=active.fresh(sk);
p.mana=0;active.SkillVFX.reset();const before=active.SkillVFX.diagnostics();ok(!p.performSkill(sk.id,target),'insufficient mana rejected');ok(active.SkillVFX.diagnostics().events===before.events,'rejected cast emitted effects');
p.mana=1000;p.performSkill(sk.id,target);p.clearSkillState();active.step(s,p,1);ok(!s.projectiles.length,'respec left delayed projectile');ok(active.SkillVFX.diagnostics().events===0,'respec left visual callbacks');
active.SkillVFX.update(0,s);active.SkillVFX.scope(p,sk.id,()=>{for(let i=0;i<2000;i++)active.SkillVFX.area(10,10,4,p);});
const pressure=active.SkillVFX.diagnostics();ok(pressure.particles<=pressure.limits.particles&&pressure.events<=pressure.limits.events,'budget overflow');
active.step(s,p,2);ok(active.SkillVFX.diagnostics().events===0&&active.SkillVFX.diagnostics().particles===0,'effects did not expire');
active.SkillVFX.scope(p,sk.id,()=>active.SkillVFX.area(10,10,2,p));active.SkillVFX.update(0,{...s,map:{...s.map}});ok(active.SkillVFX.diagnostics().events===0,'map change left effects');
// Exercise every production drawing path with finite-coordinate guards. Drawing
// must neither consume gameplay randomness nor advance an effect or an actor.
let drawCalls=0;
const draw=new Proxy({canvas:{width:1920,height:1080},globalAlpha:1},{get:(o,k)=>k in o?o[k]:(...args)=>{
  drawCalls++;for(const a of args)if(typeof a==='number')assert.ok(Number.isFinite(a),'non-finite '+String(k));
  if(String(k).includes('Gradient'))return {addColorStop(){}};
}});
for(const skill of skills){
  const {p,s,target}=active.fresh(skill);if(skill.type==='passive')active.SkillVFX.passive(p,active.SkillVFX.recipes[skill.id].trigger,{x:p.x,y:p.y,z:25});
  else p.performSkill(skill.id,target,{x:11,y:11});
  for(let frame=0;frame<90;frame++){
    active.step(s,p,1/60);if(frame%6)continue;
    const before=active.snapshot(p,s,true),cosmetics=active.SkillVFX.diagnostics(),cam={x:-500,y:-100};
    active.SkillVFX.drawGround(draw,s,cam);const draws=[];active.SkillVFX.appendDraws(draws,s,cam,1920,1080);
    for(const item of draws)active.SkillVFX.drawItem(draw,item,cam);
    for(const pr of s.projectiles)active.SkillVFX.drawProjectile(draw,pr,cam);
    for(const trap of s.traps)active.SkillVFX.drawTrap(draw,trap,cam);
    active.SkillVFX.drawActor(draw,p,cam);for(const mon of s.monsters)active.SkillVFX.drawStatus(draw,mon,cam);active.SkillVFX.drawLights(draw,s,cam);
    assert.deepEqual(active.snapshot(p,s,true),before,skill.id+' drawing changed combat or RNG');
    assert.deepEqual(active.SkillVFX.diagnostics(),cosmetics,skill.id+' drawing changed effect simulation');checks+=2;
  }
}
ok(drawCalls>10000,'drawing coverage was empty');
// Long-running live actors exercise affliction propagation, companion attacks,
// delayed payoffs and expiration beyond the short catalog snapshots.
const original=harness({before:true});
for(const [id,mode]of [['gravebinder_2_1','death'],['rabies','death'],['gravebinder_0_4','expire'],['rimeguard','expire'],['veilranger_2_4','death'],['gravebinder_1_2','expire'],['gravebinder_1_5','cancel'],['veilranger_0_2','cancel'],['raise_plaguemage','expire'],['ground_slam','expire'],['emberwitch_0_4','cancel'],['veilranger_1_2','expire']]){
  const before=original.lifecycle(id,mode),after=active.lifecycle(id,mode),off=disabled.lifecycle(id,mode);
  assert.deepEqual(after,before,id+' lifecycle changed original combat');assert.deepEqual(after,off,id+' lifecycle changed with VFX toggle');checks+=2;
}
const cosmetic=active.fresh(sk);cosmetic.s.map.props.push({x:10,y:10,type:'barrel',breakable:true});
active.SkillVFX.scope(cosmetic.p,sk.id,()=>active.SkillVFX.area(10,10,5,cosmetic.p));ok(cosmetic.s.map.props.length===1,'cosmetic area destroyed a prop');
active.Game.addNova(10,10,5,'#fff');ok(cosmetic.s.map.props.length===0,'gameplay nova stopped destroying props');
console.log(`PASS ${checks} checks, ${scenarios} skill/rank/perk scenarios: original combat preserved, VFX toggle equivalent, coverage, rejection, respec, bounds and cleanup.`);
