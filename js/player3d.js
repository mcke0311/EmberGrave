/* Player bodies, equipment, previews and transformations use live 3D models. */
'use strict';
window.Player3D=(()=>{
  let view=null,filmView=null,catalog=null,forms=null,pending=null,rendererFactory=null,controllerFactory=null,shiftFactory=null,loadUniquePainting=null;
  const prepared=new WeakSet(),previews=new Map(),shifts=new WeakMap(),shiftFrames=new WeakMap();
  async function init(){
    if(!pending)pending=(async()=>{
      if(new URL(document.baseURI).protocol==='file:')throw new Error('3D characters need the local server. Run python serve.py, then open http://localhost:8741/index.html');
      const [module,definitions,shapes]=await Promise.all([import('./character3d.mjs?v=bow-draw-1'),import('./character_catalog3d.mjs?v=forged-1'),import('./character_forms3d.mjs?v=bow-draw-1')]);
      catalog=definitions;forms=shapes.FORM_STYLES;rendererFactory=module.createCharacterRenderer;controllerFactory=module.createAnimationController;shiftFactory=module.createWildshapeController;loadUniquePainting=module.loadUniquePainting;view=rendererFactory();
    })();
    return pending;
  }
  function require3D(visual){if(!view)throw new Error('3D player assets have not initialized.');if(visual?.kind!=='player3d')throw new Error('Player rendering requires a 3D model.');}
  const assets={
    resolvePlayerVisual(classId,equip,buffs=[]){
      if(!catalog)throw new Error('3D player assets have not initialized.');
      const visual=catalog.resolveCharacterVisual(DATA,classId,equip);
      const form=buffs.find(b=>b?.id?.startsWith('form_'))?.id;
      if(form){if(classId!=='wildkeeper'||!forms[form])throw new Error('Unknown 3D transformation: '+form);visual.form=form;visual.footprint=forms[form].footprint;visual.key+='|'+form;}
      return visual;
    },
    async loadPlayerLoadout(visual){
      require3D(visual);
      if(Object.values(visual.equipment).some(item=>item?.modelId))await loadUniquePainting();
      view.render({state:'idle',t:0,ang:0,ex:{}},visual.equipment,visual.classId,visual.form||null);
      prepared.add(visual);return visual;
    },
    activatePlayerLoadout(visual){require3D(visual);if(!prepared.has(visual))throw new Error('Cannot activate an unprepared or discarded 3D loadout.');return visual;},
    discardPlayerLoadout(visual){if(visual)prepared.delete(visual);},
    deactivatePlayerLoadout(){}
  };
  function drawOptions(player){
    const base=player._playerVisual,form=player.buffs.find(b=>b?.id?.startsWith('form_'))?.id;
    if(form){
      if(!player._formVisual||player._formVisual.form!==form||player._formVisual.baseKey!==base.key){
        player._formVisual=assets.resolvePlayerVisual(player.classId,player.equip,player.buffs);player._formVisual.baseKey=base.key;
      }
    }else player._formVisual=null;
    const visual=player._formVisual||base;require3D(visual);
    return {playerVisual:visual,threePlayer:player,scale:visual.footprint||1};
  }
  function draw(ctx,player,pose){
    if(pose.ex?.cinematic){
      const stage=cinematicRenderer();stage.setRegion(Game.state?.map?.zone);stage.setResolution(innerWidth<900?512:768);
      const visual=drawOptions(player).playerVisual;stage.draw(ctx,pose,visual.equipment,{classId:visual.classId,form:visual.form||null});return;
    }
    view.setRegion?.(Game.state?.map?.zone);
    if(typeof Coop!=='undefined'&&Coop.active)view.setResolution?.(Coop.mobileQuality==='low'?256:384);
    const visual=player._formVisual||player._playerVisual;require3D(visual);
    const shift=!player.dead&&shiftFrames.get(player);
    view.draw(ctx,shift?{...pose,ex:{...pose.ex,wildshape:shift}}:pose,visual.equipment,{classId:visual.classId,form:visual.form||null});
  }
  // Share a small set of frames per role, including across co-op companies.
  const soldierLooks=new Map(), soldierFrames=new Map();
  let soldierTheme;
  function drawSoldier(ctx,role,pose) {
    const zone=Game.state.map.zone;
    if (soldierTheme!==zone?.theme) { soldierFrames.clear(); soldierTheme=zone?.theme; }
    if (!soldierLooks.has(role)) {
      const loadout=role==="shieldguard" ? {main:"shortsword",off:"buckler",head:"warhelm",chest:"hauberk"} :
        role==="bowman" ? {main:"huntbow",head:"cap",chest:"quiltvest"} : {head:"warhelm",chest:"quiltvest"};
      const equip=Object.fromEntries(Object.entries(loadout).map(([slot,baseId])=>[slot,{baseId}]));
      soldierLooks.set(role,assets.resolvePlayerVisual("vanguard",equip).equipment);
    }
    const turn=Math.PI*2, facing=(Math.round(pose.ang/turn*8)+8)%8;
    const phase=pose.state==="walk" ? (pose.ex.walkPh/turn)%1 : pose.state==="idle" ? (pose.t%2)/2 : Math.min(.999,pose.t);
    const step=Math.floor(phase*6), key=[role,pose.state,facing,step].join("|");
    let frame=soldierFrames.get(key);
    if (!frame) {
      frame=document.createElement("canvas");frame.width=144;frame.height=144;
      const c=frame.getContext("2d"), equip=soldierLooks.get(role), scale=.84;
      const sample={state:pose.state,ang:facing*turn/8,t:step/6,ex:{walkPh:step*turn/6,speed:3.8}};
      c.translate(72,118);view.setRegion(zone);
      view.draw(c,sample,equip,{classId:"vanguard",scale});
      if (role==="standard_bearer") {
        const hand=view.effectAnchors(sample,equip,{classId:"vanguard",scale}).hand;
        c.translate(U.isoX(hand.x,hand.y),U.isoY(hand.x,hand.y)-hand.lift);
        c.rotate(pose.state==="death" ? step*.22 : -.06);
        c.fillStyle="#a9824d";c.fillRect(-1,-53,2.5,68);
        c.fillStyle="#244b67";c.strokeStyle="#deb975";c.lineWidth=1.5;
        c.beginPath();c.moveTo(1,-50);c.lineTo(20,-48);c.lineTo(19,-24);c.lineTo(10,-29);c.lineTo(1,-25);c.closePath();c.fill();c.stroke();
        c.fillStyle="#edc981";c.beginPath();c.moveTo(10,-44);c.lineTo(14,-39);c.lineTo(10,-34);c.lineTo(6,-39);c.closePath();c.fill();
      }
      soldierFrames.set(key,frame);
    }
    ctx.drawImage(frame,-72,-118);
  }
  function projectileOrigin(player,scale=1){
    if(!view||!player?._playerVisual)return null;
    const visual=drawOptions(player).playerVisual;
    if(visual.form||!['bow_2h','crossbow_2h'].includes(visual.equipment.main?.family))return null;
    const frame=player.pose(),action=player.action;
    let pose={...frame,ang:player.visAng,ex:{...frame.ex}};
    if(action){
      // Release callbacks run before this tick's motion update. Sample the live
      // action clock, including immediate held releases, without advancing it.
      const animation=frame.ex?.animation;
      const elapsed=Number.isFinite(action.visual?.startedAt)?Game.state.time-action.visual.startedAt:action.t;
      pose.state=action.state;pose.t=Math.max(0,Math.min(1,elapsed/action.dur));
      pose.ex.animation={...animation,releases:action.visual?.releases,drawCharge:action.visual?.drawCharge,actionId:action.visual?.id,
        blend:animation?.actionId===action.visual?.id?animation?.blend:null};
    }
    return view.projectileOrigin(pose,visual.equipment,{classId:visual.classId,scale});
  }
  function update(player,dt,{sample=player,clock=Game.state.time}={}){
    if(!controllerFactory)return;
    if(!player._animationController)Object.defineProperty(player,'_animationController',{value:controllerFactory(),configurable:true});
    let stepped=false;
    player._animationController.update(sample,dt,{map:Game.state.map,clock,onFootstep:()=>{if(!stepped){Sfx.play('step');stepped=true;}}});
    if(player.classId==='wildkeeper'){
      if(!shifts.has(player))shifts.set(player,shiftFactory());
      const form=player.buffs.find(b=>b?.id?.startsWith('form_'))?.id||null;
      shiftFrames.set(player,shifts.get(player).update(form,player._animationController.frame,dt,{map:Game.state.map,dead:player.dead}));
    }
  }
  function effectAnchors(player,scale=1){
    if(!view||!player?._playerVisual||!view.effectAnchors)return null;
    const visual=drawOptions(player).playerVisual,frame=player.pose(),action=player.action;
    // A shift renders blended silhouettes with different skeletons. Its own
    // controller owns their contacts; facing anchors cover that brief interval.
    if(visual.form||shiftFrames.get(player))return null;
    const pose={...frame,ang:player.visAng,ex:{...frame.ex}};
    if(action){
      const animation=frame.ex?.animation,elapsed=Number.isFinite(action.visual?.startedAt)?Game.state.time-action.visual.startedAt:action.t;
      pose.state=action.state;pose.t=Math.max(0,Math.min(1,elapsed/action.dur));
      pose.ex.animation={...animation,releases:action.visual?.releases,drawCharge:action.visual?.drawCharge,actionId:action.visual?.id,blend:animation?.actionId===action.visual?.id?animation?.blend:null};
    }
    return view.effectAnchors(pose,visual.equipment,{classId:visual.classId,form:visual.form||null,scale});
  }
  function effectImage(player){
    if(!view||!player?._playerVisual)return null;
    const visual=drawOptions(player).playerVisual;
    const rendered=view.render({...player.pose(),ang:player.visAng},visual.equipment,visual.classId,visual.form||null);
    const canvas=document.createElement('canvas');canvas.width=rendered.width;canvas.height=rendered.height;canvas.getContext('2d').drawImage(rendered,0,0);
    const factor=220/canvas.width;
    return {image:canvas,ax:view.anchor.x*factor,ay:view.anchor.y*factor,width:canvas.width*factor,height:canvas.height*factor};
  }
  function drawPreview(ctx,classId,ang,t=0){
    if(!previews.has(classId)){const equip=Object.fromEntries(Object.entries(DATA.PLAYER_STARTER_LOADOUTS[classId]).map(([slot,baseId])=>[slot,{baseId}]));previews.set(classId,assets.resolvePlayerVisual(classId,equip));}
    const visual=previews.get(classId);view.draw(ctx,{state:'idle',t,ang,ex:{}},visual.equipment,{classId});
  }
  // A separate, disposable portrait camera keeps menu gear and framing out of gameplay.
  function createShowcase(){
    if(!rendererFactory)throw new Error('3D player assets have not initialized.');
    const stage=rendererFactory({size:768,presentation:true}),looks=new Map(),fitBoxes=new Map();
    const weapons={vanguard:'sword_t7',emberwitch:'wand_t7',gravebinder:'wand_t7',wildkeeper:'staff2h_t7',veilranger:'bow2h_t7'};
    return {
      draw(ctx,classId,{t=0,ang=1.05,scale=1,regalia=true,equipment=null,bounds=null}={}){
        const key=classId+':'+regalia+':'+(equipment?JSON.stringify(equipment):'');
        if(!looks.has(key)){
          const ids=regalia?{main:weapons[classId],...(classId==='vanguard'?{off:'shield_t7'}:{}),head:'helm_t7',chest:'chest_t7',gloves:'gloves_t7',boots:'boots_t7',belt:'belt_t7',amulet:'amulet_t7'}:DATA.PLAYER_STARTER_LOADOUTS[classId];
          looks.set(key,assets.resolvePlayerVisual(classId,equipment||Object.fromEntries(Object.entries(ids).map(([slot,baseId])=>[slot,{baseId}]))));
        }
        if(bounds){
          const frame=stage.render({state:'idle',t,ang,ex:{}},looks.get(key).equipment,classId);
          const fitKey=key+':'+ang;
          if(!fitBoxes.has(fitKey))fitBoxes.set(fitKey,stage.presentationBounds());
          const crop=fitBoxes.get(fitKey),factor=Math.max(0,Math.min(bounds.width/crop.width,bounds.height/crop.height));
          const w=crop.width*factor,h=crop.height*factor;
          if(factor)ctx.drawImage(frame,crop.x,crop.y,crop.width,crop.height,bounds.x+(bounds.width-w)/2,bounds.y+(bounds.height-h)/2,w,h);
        }else stage.draw(ctx,{state:'idle',t,ang,ex:{}},looks.get(key).equipment,{classId,scale});
      },
      dispose(){stage.dispose();looks.clear();fitBoxes.clear();}
    };
  }
  function cinematicRenderer(){if(!filmView)filmView=rendererFactory({size:768,cinematic:true});return filmView;}
  function cinematicAnchors(player,pose,scale=1.1){const visual=drawOptions(player).playerVisual;return cinematicRenderer().effectAnchors(pose,visual.equipment,{classId:visual.classId,form:visual.form||null,scale});}
  return Object.freeze({init,assets,drawOptions,draw,drawSoldier,projectileOrigin,effectAnchors,effectImage,drawPreview,createShowcase,update,cinematicAnchors,only3D:true});
})();
