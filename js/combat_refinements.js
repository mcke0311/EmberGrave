/* Shared command buffering and presentation-only threat styling. */
'use strict';
const CombatCast=(()=>{
  const WINDOW=.15;
  const busy=p=>!!(p.action||p.jumping||p.leaping||p.charging||p.spinning||p.dashing||p.drawing||p.stunT>0);
  function clear(p){if(p)delete p.bufferedCast;}
  function request(p,skill,point,target=null){
    const s=Game.state,sk=skill==='basic'?DATA.BASIC_ATTACK:DATA.SKILLS[skill];
    if(!p||p.dead||!sk||sk.type==='passive'||(skill!=='basic'&&!p.skills[skill])||!point||!TerrainLayers.same(p,point))return false;
    if(p.rejectSkillWeapon(skill))return false;
    // A single last press wins; a long windup cannot turn into a delayed surprise.
    clear(p);
    if(busy(p)){
      if(!p.action||p.action.dur-p.action.t>WINDOW||p.stunT>0||p.jumping)return false;
      p.bufferedCast={skill,point:{...point},target,until:s.time+WINDOW,map:s.map,epoch:p._skillEpoch};
      return true;
    }
    p.command=null;p.path=null;
    if(target){
      const reach=p.skillTargetRange(skill,target)??(sk.type==='melee'&&!p.stats.ranged?p.stats.range+target.radius+.25:9);
      if(target.dead||!s.monsters.includes(target)||!TerrainLayers.same(p,target)||U.dist(p.x,p.y,target.x,target.y)>reach||!U.los((x,y)=>MapGen.walkable(s.map,x,y,p.surfaceId),p.x,p.y,target.x,target.y))target=null;
    }
    if(sk.type==='melee'&&!target)return Game.coop.airAttack(p,skill,point);
    return p.performSkill(skill,target,point);
  }
  function tick(p){
    const b=p.bufferedCast;if(!b)return;
    if(p.dead||p.stunT>0||b.map!==Game.state.map||b.epoch!==p._skillEpoch||Game.state.time>b.until+.001){clear(p);return;}
    if(busy(p))return;
    clear(p);request(p,b.skill,b.point,b.target);
  }
  return {request,tick,clear,WINDOW};
})();

const CombatReadability=(()=>{
  function trace(ctx,s,cam,map,surfaceId=0){
    const point=(x,y,first)=>{const px=U.isoX(x,y)-cam.x,py=U.isoY(x,y)-cam.y-(map?TerrainSurface.heightAt(map,x,y,surfaceId)*TerrainSurface.LIFT:0);first?ctx.moveTo(px,py):ctx.lineTo(px,py);};
    ctx.beginPath();
    if(s.kind==='line'){
      const c=Math.cos(s.angle),n=Math.sin(s.angle),w=s.width/2;
      point(s.x-n*w,s.y+c*w,true);point(s.x+c*s.length-n*w,s.y+n*s.length+c*w);point(s.x+c*s.length+n*w,s.y+n*s.length-c*w);point(s.x+n*w,s.y-c*w);ctx.closePath();return;
    }
    const arc=s.kind==='cone'?s.arc:Math.PI*2,start=s.kind==='cone'?s.angle-arc/2:0;
    if(s.kind==='cone')point(s.x,s.y,true);
    for(let i=0;i<=48;i++){const a=start+arc*i/48;point(s.x+Math.cos(a)*s.radius,s.y+Math.sin(a)*s.radius,i===0&&s.kind!=='cone');}ctx.closePath();
    if(s.kind==='ring'){for(let i=0;i<=48;i++){const a=-Math.PI*2*i/48;point(s.x+Math.cos(a)*s.inner,s.y+Math.sin(a)*s.inner,i===0);}ctx.closePath();}
  }
  // The caller supplies its exact damage path, including holes in ring attacks.
  // Decoration is clipped to it; neither damage nor simulation randomness changes.
  function warning(ctx,trace,shape,cam,progress,zone,color='#dfbd91'){
    const p=Math.max(0,Math.min(1,progress)),id=(zone?.id||'')+' '+(zone?.parentZone||'');
    const frost=/north|frost|mine|shard|freeze|korvath|shattered_temple/.test(id);
    const marsh=/marsh|crypt|mire|choir|greywater/.test(id);
    const col=frost?'#b5e7f3':marsh?'#c5d896':color;
    ctx.save();trace();ctx.globalAlpha=.25;ctx.fillStyle='#17141c';ctx.fill('evenodd');
    ctx.save();ctx.clip('evenodd');
    const x=U.isoX(shape.x,shape.y)-cam.x,y=U.isoY(shape.x,shape.y)-cam.y;
    const extent=Math.max(shape.radius||0,shape.length||0,2)*48;
    ctx.globalAlpha=.10+.13*p;ctx.fillStyle=col;
    ctx.fillRect(x-extent,y+extent*(1-2*p),extent*2,extent*2*p);
    ctx.globalAlpha=.22+.30*p;ctx.strokeStyle=col;ctx.lineWidth=1.3;
    for(let i=0;i<12;i++){
      const a=i*Math.PI/6,r=extent*(.24+(i%3)*.19),dx=Math.cos(a),dy=Math.sin(a)*.5;
      ctx.beginPath();ctx.moveTo(x+dx*r*.4,y+dy*r*.4);
      if(marsh)ctx.quadraticCurveTo(x+dx*r+dy*18,y+dy*r-dx*10,x+dx*r*1.3,y+dy*r*1.3);
      else{ctx.lineTo(x+dx*r,y+dy*r);ctx.lineTo(x+dx*r-dy*10,y+dy*r+dx*6);if(frost)ctx.lineTo(x+dx*r*1.3,y+dy*r*1.3);}
      ctx.stroke();
    }
    ctx.restore();trace();ctx.globalAlpha=.9;ctx.strokeStyle='#151119';ctx.lineWidth=6;ctx.stroke();
    ctx.globalAlpha=1;ctx.strokeStyle=col;ctx.lineWidth=2.5;ctx.stroke();ctx.restore();
  }
  return {warning,trace};
})();
