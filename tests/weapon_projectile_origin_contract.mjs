// Run: node tests/weapon_projectile_origin_contract.mjs
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {createCharacter,facingYaw,weaponProjectileOrigin} from '../js/character3d.mjs';
import {resolveCharacterVisual,CLASS_STYLES} from '../js/character_catalog3d.mjs';
import {OrthographicCamera,Vector3} from '../js/vendor/three/three.module.min.js';

let checks=0,maxPixelError=0,sampledPose;
const ok=(v,m)=>{assert.ok(v,m);checks++;};
const read=name=>fs.readFileSync(new URL('../js/'+name,import.meta.url),'utf8');
const noop=()=>{},models=new Map();
const scope=vm.createContext({console,Math,Date,performance,setTimeout,clearTimeout,
  window:{addEventListener:noop},localStorage:{getItem:()=>null,setItem:noop},
  document:{createElement:()=>({getContext:()=>({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData:noop})})},
  Sfx:new Proxy({},{get:()=>noop}),UI:new Proxy({},{get:()=>noop})});
// Inject only the GPU boundary; exercise the production Player3D pose sampler,
// Game spawn path and Projectile movement/collision code unchanged.
vm.runInContext(read('player3d.js').replace('return Object.freeze({init,',
  'return Object.freeze({__setView:v=>view=v,init,'),scope);
scope.Player3D=scope.window.Player3D;
scope.Player3D.__setView({projectileOrigin(pose,equipment,{classId,scale}){
  const model=models.get(classId);sampledPose=pose;
  model.root.rotation.y=facingYaw(pose.ang);model.equip(equipment);model.animate(pose);
  return weaponProjectileOrigin(model,scale);
}});
for(const name of ['utils','data','data_overrides','sprite_manifest','mapgen','navigation','items','entities'])vm.runInContext(read(name+'.js'),scope);
vm.runInContext(read('game.js').replace('    init, newGame, loadGame,',
  '    __setState:s=>state=s,\n    init, newGame, loadGame,'),scope);
const {Game,Player,Projectile,DATA,U}=vm.runInContext('({Game,Player,Projectile,DATA,U})',scope);
const map={w:48,h:48,elev:new Uint8Array(48*48),blocked:new Uint8Array(48*48),walls:new Uint8Array(48*48)};
const camera=new OrthographicCamera(-2.5,2.5,2.5,-2.5,.01,30);
camera.position.set(0,5.83,Math.sqrt(75));camera.lookAt(0,.83,0);camera.updateMatrixWorld(true);
const anchor=new Vector3().project(camera);
function screen(point){const q=point.clone().project(camera);return {x:(q.x-anchor.x)*110,y:-(q.y-anchor.y)*110};}
const state={time:10,map,monsters:[],minions:[],projectiles:[]};Game.__setState(state);
for(const id of Object.keys(CLASS_STYLES)){
  const model=createCharacter(id);models.set(id,model);
  const p=new Player('Projectile contract',id);p.x=p.y=20.5;state.player=p;
  for(const family of ['bow','crossbow'])for(const tier of [0,13]){
    p._playerVisual=resolveCharacterVisual(DATA,id,{main:{baseId:family+'2h_t'+tier},chest:{baseId:'chest_t'+tier}});
    for(let direction=0;direction<16;direction++)for(const release of [0,.4,.73])for(const elevation of [0,3]){
      map.elev.fill(elevation);p.jumpZ=elevation?11:0;p.visAng=direction*Math.PI/8;
      p.startAction('attack',.5);p.markActionRelease(.5*release);
      state.time=p.action.visual.startedAt+.5*release;
      // Deliberately leave the render snapshot on a different state/facing.
      const stale={state:release===0?'draw':'idle',t:1,ang:p.visAng+1,ex:{animation:{actionId:-1,blend:{from:{state:'idle',t:0,ex:{}},weight:0}}}};
      p._animationController={frame:stale};const before=JSON.stringify(stale);
      const [wx,wy]=U.screenVecToWorld(p.visAng),tx=p.x+wx*8,ty=p.y+wy*8;
      const input={x:p.x,y:p.y,tx,ty,speed:12,kind:'arrow',fromPlayer:true,mult:2,pierce:true};
      state.projectiles=[];Game.spawnProjectile(input);const pr=state.projectiles[0];
      const label=[id,family,tier,direction,release,elevation].join('/');
      const muzzle=model.weapon.localToWorld(new Vector3(...(family==='bow'?[0,0,.2]:[0,.055,.36])));
      const projected=screen(muzzle);
      const error=Math.hypot(U.isoX(pr.x-p.x,pr.y-p.y)-projected.x,
        U.isoY(pr.x-p.x,pr.y-p.y)-pr.lift+elevation*14+p.jumpZ-projected.y);
      maxPixelError=Math.max(maxPixelError,error);
      ok(error<1e-8,label+': shot is detached from the rendered firing point');
      ok(Math.abs(sampledPose.t-release)<1e-8&&sampledPose.state==='attack',label+': used stale draw/idle pose');
      ok(JSON.stringify(stale)===before,label+': firing advanced or mutated animation history');
      ok(Math.abs(Math.hypot(pr.vx,pr.vy)-12)<1e-9&&pr.mult===2&&pr.pierce,label+': shot properties changed');
      ok(Math.abs((tx-pr.x)*pr.vy-(ty-pr.y)*pr.vx)<1e-8,label+': missed intended aim point');
      ok(input.x===p.x&&input.y===p.y&&!('lift' in input),label+': spawn mutated shared volley options');
      const launch={x:pr.x,y:pr.y,lift:pr.lift};p.x+=1;p.y-=.5;
      pr.update(1/120,map,p,[]);
      ok(Math.abs(pr.x-launch.x-pr.vx/120)<1e-8&&Math.abs(pr.y-launch.y-pr.vy/120)<1e-8&&pr.lift===launch.lift,label+': arrow followed the shooter after release');
      p.x-=1;p.y+=.5;
      // A preview can leave the shared rig facing somewhere else with other gear.
      model.equip({});model.root.rotation.y+=2;model.animate({state:'dead',t:1,ex:{}});
      Game.spawnProjectile(input);const again=state.projectiles.at(-1);
      ok(Math.hypot(again.x-launch.x,again.y-launch.y,again.lift-launch.lift)<1e-8,label+': previous render changed spawn position');
    }
  }
}
// Every fan arrow leaves the same socket, with distinct targets and full speed.
const p=state.player;p.jumpZ=0;map.elev.fill(0);state.projectiles=[];
for(const dy of [-2,0,2])Game.spawnProjectile({x:p.x,y:p.y,tx:p.x+8,ty:p.y+dy,speed:14,kind:'arrow',fromPlayer:true});
ok(state.projectiles.every(pr=>pr.x===state.projectiles[0].x&&pr.y===state.projectiles[0].y&&pr.lift===state.projectiles[0].lift),'fan origins diverge');
ok(new Set(state.projectiles.map(pr=>Math.atan2(pr.vy,pr.vx))).size===3,'fan spread was flattened');
const pr=state.projectiles[1];let hits=0;p.strike=()=>hits++;
const target={x:pr.x+pr.vx*.02,y:pr.y+pr.vy*.02,radius:.36,dead:false};pr.update(.02,map,p,[target]);
ok(hits===1&&pr.dead,'weapon-origin shot no longer hits its target');
for(const fromPlayer of [false,true])for(const kind of ['firebolt','arrow']){
  if(fromPlayer&&kind==='arrow')p._playerVisual=resolveCharacterVisual(DATA,p.classId,{main:{baseId:'wand_t0'}});
  Game.spawnProjectile({x:9,y:8,tx:12,ty:8,speed:10,kind,fromPlayer});const other=state.projectiles.at(-1);
  ok(other.x===9&&other.y===8&&other.lift===14,'non-bow/enemy projectile origin changed');
}
ok(new Projectile({x:0,y:0,tx:1,ty:0,speed:1,lift:0}).lift===0,'explicit zero height discarded');
models.forEach(m=>m.dispose());
console.log(JSON.stringify({status:'PASS',checks,maxPixelError},null,2));
