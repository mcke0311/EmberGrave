import fs from 'node:fs';
import vm from 'node:vm';

export function fixture() {
  const store=new Map(),messages=[];
  const element=()=>({style:{},classList:{add(){},remove(){}},appendChild(){},remove(){},getContext:()=>({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){}})});
  const ctx=vm.createContext({console,Math:Object.create(Math),Date,performance,Uint8Array,Uint16Array,Uint32Array,Float32Array,Uint8ClampedArray,Set,Map,JSON,setTimeout,clearTimeout,
    window:{addEventListener(){},matchMedia:()=>({matches:false})},document:{createElement:element,getElementById:element,body:element()},
    localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},
    Sfx:new Proxy({vol:{}},{get:(t,k)=>t[k]||(()=>{})}),Player3D:{assets:{}},
    UI:new Proxy({msg:t=>messages.push(t),escOpen:()=>false,cinematicActive:()=>false},{get:(t,k)=>t[k]||(()=>{})}),
    SpriteAssets:{loadBundle:async()=>{}},LootFilter:{evaluate:()=>({show:true})},
  });
  for(const f of ['utils','data','data_overrides','boss_encounters','skill_perks','sprite_manifest','mapgen','navigation','items','entities'])vm.runInContext(fs.readFileSync(new URL('../js/'+f+'.js',import.meta.url),'utf8'),ctx);
  const src=fs.readFileSync(new URL('../js/game.js',import.meta.url),'utf8').replace('    init, newGame, loadGame,','    __bossTest:{freshState,updateFx,setState:s=>{state=s;delayed=[];},questKillEvent,updateBossEncounter,flush:seconds=>{state.time+=seconds;for(let i=delayed.length-1;i>=0;i--)if(state.time>=delayed[i].t){const fn=delayed[i].fn;delayed.splice(i,1);fn();}}},\n    init, newGame, loadGame,');
  vm.runInContext(src,ctx);
  const api=vm.runInContext('({DATA,Game,MapGen,Monster,Player,Minion,Projectile,BossEncounters,TerrainNavigation,Items,U})',ctx);
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
  return {...api,ctx,store,messages,fresh,tick};
}
