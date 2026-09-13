/* Translate mouse and touch intentions into ID-only host commands. */
const CoopInput=(()=>{
  let press=null,last=0,stick=null,skillSide=null,heldSkill=null,once=false,sequence=0;
  let predictionFrames=[],intentions=[],responseTimes=[],responsePending=null;
  function rememberCommand(seq,command){const p=Game.state?.player;if(p&&(!Coop.host||Coop.workerHost)){if(['move','steer'].includes(command.type)){if(!p.moving&&!responsePending)responsePending={at:performance.now(),x:p.x,y:p.y};p._coopMotion=command;}else if(['stop','attack','cast','jump'].includes(command.type)){p._coopMotion=null;responsePending=null;}}sequence=seq;intentions.push({seq,command});if(intentions.length>128)intentions.shift();}
  function reconcile(row){
    const p=Game.state.player,previous=p._coopPrevious||p,ack=row.coopInputSeq||0;
    intentions=intentions.filter(i=>i.seq>ack);predictionFrames=predictionFrames.filter(f=>f.seq>ack);
    const intent=p._coopMotion;p.x=row.x;p.y=row.y;p._netTo=null;p._predictPath=null;
    let remaining=.25;
    for(const frame of predictionFrames){if(remaining<=0)break;p._coopMotion=frame.command;const dt=Math.min(frame.dt,remaining);advance(dt);remaining-=dt;}
    p._coopMotion=intent;
    const x=previous.x-p.x,y=previous.y-p.y;p._presentationCorrection=Math.hypot(x,y)<2?{x,y}:null;
  }

  // Saving is a short command queue, not a reason to discard a player's click.
  const blocked=()=>{const reason=Coop.paused;return !!reason&&reason!=='Saving party changes…';};
  function send(c){
    if((!Coop.host||Coop.workerHost)&&Game.state){const p=Game.state.player;if(['move','steer'].includes(c.type))p._coopMotion=c;else if(['stop','attack','cast','jump'].includes(c.type))p._coopMotion=null;}
    Game.submitCommand(c);
  }
  function targetSkill(skill,info,hold){
    if(info.mon&&!info.mon.dead)send({type:'attack',targetId:info.mon._coopId,skill,hold});
    else if(info.point)send({type:'cast',skill,point:info.point});
  }
  function click(right,info){
    if(blocked()||Game.state.player.dead)return;
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
    if(!press||blocked())return;
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
    if(!d&&!skillSide)send({type:'stop'});else touchTick();
  }
  function touchSkill(side,down){
    if(!['L','R'].includes(side))return;
    holdTouchSkill(side,Game.state?.player?.['skill'+side],down);
  }
  function touchQuickSlot(index,down){
    if(!Number.isInteger(index)||index<0||index>3)return;
    holdTouchSkill('Q'+index,Game.state?.player?.quickSlots?.[index],down);
  }
  function holdTouchSkill(side,skill,down){
    if(!down){if(skillSide!==side)return;skillSide=null;heldSkill=null;send({type:'release'});if(stick)touchTick();return;}
    const p=Game.state?.player;
    if(!Game.touchReady()||blocked()||skillSide||!skill||
      (skill!=='basic'&&(!p.skills[skill]||DATA.SKILLS[skill]?.type==='passive')))return;
    skillSide=side;heldSkill=skill;once=false;touchTick();
  }
  function touchTick(){
    if(!Game.touchReady()||blocked())return;
    const p=Game.state.player,[dx,dy]=stick?[stick.x,stick.y]:U.screenVecToWorld(p.visAng);
    const point={x:U.clamp(p.x+dx*4.2,0,Game.state.map.w),y:U.clamp(p.y+dy*4.2,0,Game.state.map.h),surfaceId:p.surfaceId};
    if(stick)send({type:'steer',point});
    if(skillSide){const skill=heldSkill;if(once&&!Game.coop.repeatSkill(skill))return;
      const monsters=Game.state.monsters.filter(m=>!m.dead&&TerrainLayers.same(p,m)&&U.dist(p.x,p.y,m.x,m.y)<9).sort((a,b)=>U.dist2(p.x,p.y,a.x,a.y)-U.dist2(p.x,p.y,b.x,b.y));
      targetSkill(skill,{mon:monsters[0],point},false);once=true;
    }
  }
  function advance(dt){
    const p=Game.state.player,c=p._coopMotion;if(!c||p.dead||p.action||Coop.paused)return;
    if(c.type==='move'){
      if(!p._predictPath||p._predictPoint!==c.point){p._predictPoint=c.point;Game.repath(p,c.point.x,c.point.y,c.point.surfaceId);p._predictPath=p.path;}
      p.path=p._predictPath;p.moveAlong(dt,p.stats.moveSpeed,Game.state.map,[]);p._predictPath=p.path;
    }else p.moveToward(dt,p.stats.moveSpeed,c.point.x,c.point.y,Game.state.map,[]);
    if(U.dist(p.x,p.y,c.point.x,c.point.y)<.1)p._coopMotion=null;
  }
  function predict(dt){
    const p=Game.state.player;if(p._coopMotion){predictionFrames.push({seq:sequence,command:p._coopMotion,dt});if(predictionFrames.length>60)predictionFrames.shift();}
    advance(dt);
    if(responsePending&&Math.hypot(p.x-responsePending.x,p.y-responsePending.y)>.001){responseTimes.push(performance.now()-responsePending.at);if(responseTimes.length>600)responseTimes.shift();responsePending=null;}
  }
  return {get responseTimes(){return responseTimes;},rememberCommand,reconcile,click,hold,release,touchMove,touchSkill,touchQuickSlot,predict,resetTouch(){responsePending=null;predictionFrames=[];intentions=[];const held=stick||skillSide||press;stick=null;skillSide=null;heldSkill=null;press=null;once=false;if(Game.state?.player){Game.state.player._coopMotion=null;Game.state.player._predictPath=null;}if(held&&Coop.active&&!Coop.loading)send({type:'stop'});}};
})();
