/* Translate mouse and touch intentions into ID-only host commands. */
const CoopInput=(()=>{
  let press=null,last=0,stick=null,skillSide=null,once=false;
  function send(c){
    if(!Coop.host&&Game.state){const p=Game.state.player;if(['move','steer'].includes(c.type))p._coopMotion=c;else if(['stop','attack','cast','jump'].includes(c.type))p._coopMotion=null;}
    Game.submitCommand(c);
  }
  function targetSkill(skill,info,hold){
    if(info.mon&&!info.mon.dead)send({type:'attack',targetId:info.mon._coopId,skill,hold});
    else if(info.point)send({type:'cast',skill,point:info.point});
  }
  function click(right,info){
    if(Coop.paused||Game.state.player.dead)return;
    const p=Game.state.player,skill=right?p.skillR:p.skillL;
    if(p.management?.carried){if(!right)InventoryActions.submit({type:'drop',itemId:p.management.carried._coopId});return;}
    if(!right&&!info.mouse.shift){
      const fallen=Game.state.players.find(h=>h!==p&&h.dead&&info.point&&U.dist(h.x,h.y,info.point.x,info.point.y)<1.2);
      if(fallen){send({type:'revive',targetId:fallen._coopId});return;}
      if(info.exit){const ex=info.exit;Coop.requestTravel(ex.target,ex.spawnKey);return;}
      if(info.portal){Game.usePortal();return;}
      if(info.npc||info.prop){const o=info.npc||info.prop;send({type:'interact',targetId:o._coopId});return;}
      if(info.label){send({type:'pickup',targetId:info.label.gi._coopId});return;}
      if(!info.mon||Game.options.leftClickMove){if(info.point){send({type:'move',point:info.point});press={ground:true,at:performance.now(),active:false};}return;}
    }
    press={ground:false,right,at:performance.now(),info};targetSkill(skill,info,Game.coop.repeatSkill(skill));
  }
  function hold(info){
    if(performance.now()-last<80)return;last=performance.now();
    if(stick||skillSide){touchTick();return;}
    if(!press||Coop.paused)return;
    if(press.ground){if(info.mouse.l&&performance.now()-press.at>=150){press.active=true;send({type:'steer',point:info.point});}}
    else if((press.right?info.mouse.r:info.mouse.l)&&Game.coop.repeatSkill(Game.state.player[press.right?'skillR':'skillL']))targetSkill(Game.state.player[press.right?'skillR':'skillL'],info,true);
  }
  function release(){
    if(press?.ground&&press.active)send({type:'stop'});
    else if(press&&!press.ground)send({type:Game.state.player.drawing?'release':'stop'});
    press=null;
  }
  function touchMove(x,y){
    if(!Game.touchReady())return;const a=U.unisoX(x,y),b=U.unisoY(x,y),d=Math.hypot(a,b);stick=d?{x:a/d,y:b/d}:null;
    if(!d)send({type:'stop'});else touchTick();
  }
  function touchSkill(side,down){if(!down){skillSide=null;send({type:'release'});return;}if(!Game.touchReady())return;skillSide=side;once=false;touchTick();}
  function touchTick(){
    if(!Game.touchReady()||Coop.paused)return;
    const p=Game.state.player,[dx,dy]=stick?[stick.x,stick.y]:U.screenVecToWorld(p.visAng);
    const point={x:U.clamp(p.x+dx*4.2,0,Game.state.map.w),y:U.clamp(p.y+dy*4.2,0,Game.state.map.h),surfaceId:p.surfaceId};
    if(stick)send({type:'steer',point});
    if(skillSide){const skill=p['skill'+skillSide];if(once&&!Game.coop.repeatSkill(skill))return;
      const monsters=Game.state.monsters.filter(m=>!m.dead&&TerrainLayers.same(p,m)&&U.dist(p.x,p.y,m.x,m.y)<9).sort((a,b)=>U.dist2(p.x,p.y,a.x,a.y)-U.dist2(p.x,p.y,b.x,b.y));
      targetSkill(skill,{mon:monsters[0],point},false);once=true;
    }
  }
  function predict(dt){
    const p=Game.state.player,c=p._coopMotion;if(!c||p.dead||p.action||Coop.paused)return;
    if(c.type==='move'){
      if(!p._predictPath||p._predictPoint!==c.point){p._predictPoint=c.point;Game.repath(p,c.point.x,c.point.y,c.point.surfaceId);p._predictPath=p.path;}
      p.path=p._predictPath;p.moveAlong(dt,p.stats.moveSpeed,Game.state.map,[]);p._predictPath=p.path;
    }else p.moveToward(dt,p.stats.moveSpeed,c.point.x,c.point.y,Game.state.map,[]);
    if(U.dist(p.x,p.y,c.point.x,c.point.y)<.1)p._coopMotion=null;
  }
  return {click,hold,release,touchMove,touchSkill,predict,resetTouch(){const held=stick||skillSide||press;stick=null;skillSide=null;press=null;once=false;if(Game.state?.player){Game.state.player._coopMotion=null;Game.state.player._predictPath=null;}if(held&&Coop.active&&!Coop.loading)send({type:'stop'});}};
})();
