'use strict';
globalThis.COOP_WORKER=true;
// Presentation ports are explicit: the simulation never creates DOM or GPU resources.
globalThis.window={matchMedia:()=>({matches:true})};
globalThis.Player3D={assets:{},update(){}};
const nothing=()=>{};
globalThis.UI=new Proxy({msg:message=>CoopRuntime.event('message',{message}),centerMsg:(title,message)=>CoopRuntime.event('message',{message:title+' '+(message||'')}),escOpen:()=>false,cinematicActive:()=>false,playVideo:(src,done)=>CoopRuntime.cinematic(src,done)},{get:(target,key)=>target[key]||nothing});
globalThis.Sfx=new Proxy({vol:{},playSkill:(skill,phase,detail={})=>{if(detail.owner)CoopRuntime.visual('skill',{skill,phase,ownerId:detail.owner._coopId});}},{get:(target,key)=>target[key]||nothing});
importScripts(...['utils.js','data.js','unique_powers.js','data_overrides.js','boss_vfx.js','boss_encounters.js','skill_perks.js','sprite_manifest.js','act1_animation_catalog.js','prop_interactions.js','mapgen.js','navigation.js','items.js','lootfilter.js','enemy_skills.js','act2_enemy_combat.js','act2_enemy_animation.js','act3_enemy_animation.js','act1_enemy_animation.js','act4_enemy_animation.js','act5_enemy_animation.js','entities.js','management.js','coop_protocol.js','coop_store.js','coop_codec.js','coop_replication.js','coop_commands.js','game.js','coop_runtime.js'].map(path=>path+'?v=embergrave-coop-3'));
if(CoopProtocol.BUILD!=='embergrave-coop-3')throw Error('Mixed co-op worker build. Reload the game.');
const Coop=CoopRuntime;
let last=performance.now(),accumulator=0,started=false;
setInterval(()=>{
  const now=performance.now();accumulator=Math.min(.15,accumulator+(now-last)/1000);last=now;
  if(!started){accumulator=0;return;}
  try{while(accumulator>=1/30){Coop.tick(1/30);accumulator-=1/30;}}
  catch(e){started=false;postMessage({type:'fatal',message:e.message,stack:e.stack});}
},8);
self.onmessage=async({data:m})=>{
  try{
    let value;
    if(m.type==='start'){value=await Coop.start(m.args);started=true;last=performance.now();}
    else if(m.type==='receive')value=await Coop.receive(m.from,m.payload);
    else if(m.type==='roster')Coop.roster(m.members);
    else if(m.type==='depart')value=await Coop.depart(m.playerId);
    else if(m.type==='status')Coop.setStatus(m);
    else if(m.type==='checkpoint')value=await Coop.checkpoint();
    else if(m.type==='retrySave')value=await Coop.retrySave();
    else if(m.type==='stop'){value=await Coop.stop();started=false;}
    else if(m.type==='metrics')value={...Coop.metrics,worlds:Coop.worlds.size,players:Coop.players.size};
    if(m.requestId)postMessage({type:'reply',requestId:m.requestId,value});
  }catch(e){if(m.requestId)postMessage({type:'reply',requestId:m.requestId,error:e.message});else postMessage({type:'fatal',message:e.message,stack:e.stack});}
};
