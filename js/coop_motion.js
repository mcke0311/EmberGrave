/* Display samples never change the positions used by the authoritative simulation. */
const CoopMotion=(()=>{
  const previous=new WeakMap(),views=new WeakMap();
  const fields=['x','y','jumpZ','visAng','animT','stride'];
  function capture(world){
    for(const key of ['players','monsters','minions','projectiles'])for(const actor of world[key]||[]){
      let row=previous.get(actor);if(!row)previous.set(actor,row={});
      for(const field of fields)row[field]=actor[field]||0;
      row.surfaceId=actor.surfaceId;row.action=actor.action;row.actionT=actor.action?.t||0;
    }
  }
  function sample(actor,alpha){
    const before=previous.get(actor);
    if(!before||before.surfaceId!==actor.surfaceId||Math.hypot(actor.x-before.x,actor.y-before.y)>4)return actor;
    let view=views.get(actor);if(!view){view=Object.create(actor);views.set(actor,view);}
    alpha=Math.max(0,Math.min(1,alpha));
    for(const field of fields){
      const now=actor[field]||0;
      view[field]=field==='visAng'?before[field]+Math.atan2(Math.sin(now-before[field]),Math.cos(now-before[field]))*alpha:before[field]+(now-before[field])*alpha;
    }
    if(actor.action&&actor.action===before.action){
      if(!Object.hasOwn(view,'action')||!view.action||Object.getPrototypeOf(view.action)!==actor.action)view.action=Object.create(actor.action);
      view.action.t=before.actionT+(actor.action.t-before.actionT)*alpha;
    }else view.action=actor.action;
    return view;
  }
  return {capture,sample};
})();
