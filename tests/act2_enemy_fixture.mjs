import vm from 'node:vm';
import {fixture} from './boss_fixture.mjs';
export function enemyFixture(options={}){
 const f=fixture({dataSeed:7331,...options});
 const open=f.MapGen.generate('ritual_site',12345),a=open.bossArena;
 function scene(id='drowned_dead',zone='weeping_marsh',opts={}){
  const p=new f.Player('Act 2 skills','vanguard'),s=f.Game.__bossTest.freshState(p,12345);
  s.map={...open,id:zone,zone:f.DATA.ZONES[zone]};s.quests={q11:{state:'active',siteDestroyed:true},q12:{state:'active'}};
  f.Game.__bossTest.setState(s);f.ctx.Math.random=f.U.rng(7331);p.x=a.cx;p.y=a.cy;p.stats.maxHp=1e6;p.hp=1e6;p.stats.dodge=0;p.stats.block=0;
  const m=new f.Monster(id,a.cx-4,a.cy,opts);m.aggro=true;s.monsters=[m];
  return{s,p,m,c:m.act2Combat,a};
 }
 const C=vm.runInContext("typeof Act2EnemyCombat==='undefined'?null:Act2EnemyCombat",f.ctx);
 return {...f,scene,C};
}
