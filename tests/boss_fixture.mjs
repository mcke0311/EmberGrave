import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {ensureSnapshot} from './boss_animation_baseline.cjs';

export function fixture({bossSource,sourceDirectory,reducedMotion=false,gameExports=[],dataSeed}={}) {
  if(sourceDirectory&&path.resolve(sourceDirectory)===path.resolve('tmp/boss_animation/before/js'))ensureSnapshot();
  const read=name=>fs.readFileSync(sourceDirectory?path.join(sourceDirectory,name+'.js'):new URL('../js/'+name+'.js',import.meta.url),'utf8');
  const motionMedia={matches:reducedMotion};
  const store=new Map(),messages=[];
  const element=()=>({style:{},classList:{add(){},remove(){}},appendChild(){},remove(){},getContext:()=>({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){}})});
  const ctx=vm.createContext({console,Math:Object.create(Math),Date,performance,Uint8Array,Uint16Array,Uint32Array,Float32Array,Uint8ClampedArray,Set,Map,JSON,setTimeout,clearTimeout,
    window:{addEventListener(){},matchMedia:()=>motionMedia},document:{createElement:element,getElementById:element,body:element()},
    localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},
    Sfx:new Proxy({vol:{}},{get:(t,k)=>t[k]||(()=>{})}),Player3D:{assets:{}},
    UI:new Proxy({msg:t=>messages.push(t),escOpen:()=>false,cinematicActive:()=>false},{get:(t,k)=>t[k]||(()=>{})}),
    SpriteAssets:{loadBundle:async()=>{}},LootFilter:{evaluate:()=>({show:true})},
  });
  const files=['utils','data','data_overrides','boss_encounters','skill_perks','sprite_manifest','mapgen','navigation','items','entities'];
  if(!sourceDirectory||fs.existsSync(path.join(sourceDirectory,'prop_interactions.js')))files.splice(files.indexOf('mapgen'),0,'prop_interactions');
  if(!sourceDirectory||fs.existsSync(path.join(sourceDirectory,'act2_enemy_combat.js')))files.splice(files.indexOf('entities'),0,'act2_enemy_combat');
  if(!sourceDirectory||fs.existsSync(path.join(sourceDirectory,'act2_enemy_animation.js')))files.splice(files.indexOf('entities'),0,'act2_enemy_animation');
  if(!sourceDirectory||fs.existsSync(path.join(sourceDirectory,'act3_enemy_animation.js')))files.splice(files.indexOf('entities'),0,'act3_enemy_animation');
  if(!sourceDirectory||fs.existsSync(path.join(sourceDirectory,'act4_enemy_animation.js')))files.splice(files.indexOf('entities'),0,'act4_enemy_animation');
  if(!sourceDirectory||fs.existsSync(path.join(sourceDirectory,'boss_vfx.js')))files.splice(3,0,'boss_vfx');
  if(!sourceDirectory||fs.existsSync(path.join(sourceDirectory,'enemy_skills.js')))files.splice(files.indexOf('entities'),0,'enemy_skills');
  if(!sourceDirectory||fs.existsSync(path.join(sourceDirectory,'act5_enemy_animation.js')))files.splice(files.indexOf('entities'),0,'act5_enemy_animation');
  if(!sourceDirectory||fs.existsSync(path.join(sourceDirectory,'act1_enemy_animation.js')))files.splice(files.indexOf('entities'),0,'act1_enemy_animation');
  if(!sourceDirectory||fs.existsSync(path.join(sourceDirectory,'act1_animation_catalog.js')))files.splice(files.indexOf('sprite_manifest')+1,0,'act1_animation_catalog');
  for(const f of files){
    if(f==='data'&&dataSeed!==undefined)vm.runInContext('Math.random=U.rng('+JSON.stringify(dataSeed)+')',ctx);
    vm.runInContext(f==='boss_encounters'&&bossSource!==undefined?bossSource:read(f),ctx);
  }
  const src=read('game').replace('    init, newGame, loadGame,','    __bossTest:{freshState,updateFx,setState:s=>{state=s;delayed=[];},questKillEvent,updateBossEncounter,flush:seconds=>{state.time+=seconds;for(let i=delayed.length-1;i>=0;i--)if(state.time>=delayed[i].t){const fn=delayed[i].fn;delayed.splice(i,1);fn();}}},\n    init, newGame, loadGame,');
  vm.runInContext(src.replace('__bossTest:{','__bossTest:{'+(gameExports.length?gameExports.join(',')+',':'')),ctx);
  const api=vm.runInContext('({DATA,Game,MapGen,Monster,Player,Minion,Projectile,BossEncounters,TerrainNavigation,Items,U,BossVFX:typeof BossVFX===\'undefined\'?null:BossVFX,EnemySkills:typeof EnemySkills===\'undefined\'?null:EnemySkills})',ctx);
  const {Game:G,MapGen:M,DATA:D,Player,Monster}=api;
  function fresh(id='korvath',seed=123,classId='vanguard',difficulty=0) {
    ctx.Math.random=api.U.rng(seed+7331);
    const p=new Player('Encounter QA',classId),s=G.__bossTest.freshState(p,seed);
    s.difficulty=difficulty;s.map=M.generate(D.BOSS_ENCOUNTERS[id].zone,seed);s.quests={q16:{state:'done'},q17:{state:'done'}};
    G.__bossTest.setState(s);
    const a=s.map.bossArena;p.x=a.cx+2;p.y=a.cy;p.stats.maxHp=1e7;p.hp=1e7;
    const m=new Monster(id,a.cx,a.cy);s.monsters=[m];m.aggro=true;
    return {s,p,m,e:m.encounter};
  }
  function tick(s,seconds,dt=.025) {
    for(let t=0;t<seconds-1e-9;t+=dt){const step=Math.min(dt,seconds-t);s.time+=step;for(const m of [...s.monsters])m.update(step,s.player,s.map);for(const p of [...s.projectiles])p.update(step,s.map,s.player,s.monsters);s.projectiles=s.projectiles.filter(p=>!p.dead);s.monsters=s.monsters.filter(m=>!m.dead||m.corpseT>0);G.__bossTest.flush(0);}
  }
  return {...api,ctx,store,messages,fresh,tick,motionMedia};
}
